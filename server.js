const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const crypto = require('crypto');
const cron = require('node-cron');
const webpush = require('web-push');
const compression = require('compression');

// ==========================================
// 🔔 1. CONFIGURAÇÃO DO FIREBASE (ADMIN)
// ==========================================
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const { getFirestore, FieldValue, FieldPath } = require('firebase-admin/firestore');

const serviceAccount = require("./firebase-key.json"); 
initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// ==========================================
// ⚙️ 2. CONFIGURAÇÃO DO SERVIDOR EXPRESS
// ==========================================
const app = express();
app.use(compression());
app.set('trust proxy', 1);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// ==========================================
// 🔔 3. CONFIGURAÇÃO DO WEB PUSH (NAVEGADOR)
// ==========================================
const VAPID_PUBLIC_KEY = 'BDxp0ouiBhLx8DHv685o7ccI_fz985azqaEdetcvJC49q4MBDMPigJVxtiHPR9nJ0AmM8Z8io5JKAyk0KFyGMds';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY; 

webpush.setVapidDetails(
    'mailto: ronaldopaulo21@gmail.com', 
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

// LIMITADORES DE REQUISIÇÃO
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, message: { error: "Muitas tentativas. Tente novamente em 15 minutos." }
});
const pinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 30, message: { error: "Muitas tentativas de PIN. Bloqueado." }
});

const SENHA_ADMIN = process.env.ADMIN_PASSWORD;
let mesasAtivas = { 1: true, 2: true, 3: true };

// ==========================================
// 🚨 NOTIFICAÇÕES E CRON JOBS
// ==========================================
let notificadosProximos = new Set(); 

async function avisarTodoMundo(titulo, mensagem) {
    try {
        const snapshot = await db.collection('jogadores').get();
        if (snapshot.empty) return;

        const webPayload = JSON.stringify({ title: titulo, body: mensagem });
        const firebaseTokens = [];

        snapshot.forEach(doc => {
            const j = doc.data();
            if (j.push_sub) {
                webpush.sendNotification(j.push_sub, webPayload).catch(() => {});
            }
            if (j.push_token) { 
                firebaseTokens.push(j.push_token); 
            }
        });

        if (firebaseTokens.length > 0) {
            await getMessaging().sendEachForMulticast({
                notification: { title: titulo, body: mensagem },
                tokens: firebaseTokens
            });
        }
    } catch (err) { console.error("Erro no Envio Global:", err); }
}

async function avisarJogadorProximo(jogadorId) {
    try {
        const docRef = await db.collection('jogadores').doc(String(jogadorId)).get();
        if (!docRef.exists) return;
        const jogador = docRef.data();

        const titulo = "Atenção: Prepare-se";
        const mensagem = "Você é um dos próximos da fila de espera. Vá se aproximando da área de jogo.";

        if (jogador.push_sub) {
            try { await webpush.sendNotification(jogador.push_sub, JSON.stringify({ title: titulo, body: mensagem })); } catch (e) {}
        }
        
        if (jogador.push_token) {
            try {
                await getMessaging().send({
                    token: jogador.push_token,
                    notification: { title: titulo, body: mensagem },
                    android: { priority: "high" } 
                });
            } catch (e) {}
        }
    } catch (err) { console.error("Erro ao notificar jogador próximo:", err); }
}

const realizarResetGeral = async () => {
    try {
        const snapshot = await db.collection('jogadores').get();
        let batch = db.batch();
        let contagem = 0;
        
        // Fatiamento do Batch para evitar o erro do limite de 500 do Firebase
        for (const doc of snapshot.docs) {
            if (doc.id !== '00000000-0000-0000-0000-000000000000') {
                batch.update(doc.ref, { vitorias_semana: 0, partidas_semana: 0 });
                contagem++;
                
                if (contagem >= 450) {
                    await batch.commit();
                    batch = db.batch();
                    contagem = 0;
                }
            }
        }
        if (contagem > 0) await batch.commit();
    } catch (erro) { console.error("Erro na faxina semanal:", erro); }
};

cron.schedule('0 4 * * 1', async () => { await realizarResetGeral(); }, { timezone: "America/Bahia" });

cron.schedule('30 22 * * 1-5', async () => {
    try {
        const snapshot = await db.collection('jogadores').get();
        if (snapshot.empty) return;

        const jogadores = snapshot.docs.map(doc => doc.data());
        const ranking = jogadores.map(jogador => {
            const vitorias = jogador.vitorias_semana || 0;
            const partidas = jogador.partidas_semana || 0;
            const pontos = (vitorias * 3) - (partidas - vitorias);
            return { ...jogador, pontos };
        });

        ranking.sort((a, b) => b.pontos - a.pontos);
        const top1 = ranking[0];
        if(top1) await avisarTodoMundo("Encerramento Diário", `O destaque de hoje foi ${top1.nome} com ${top1.pontos} pontos. O ranking foi atualizado.`);
    } catch (err) {}
}, { scheduled: true, timezone: "America/Bahia" });

cron.schedule('0 11 * * *', async () => {
    try {
        const doisDiasAtras = new Date(); doisDiasAtras.setDate(doisDiasAtras.getDate() - 2);
        const snapshot = await db.collection('jogadores').where('ultimo_jogo_at', '<', doisDiasAtras.toISOString()).get();
        if (snapshot.empty) return;

        snapshot.forEach(doc => {
            const j = doc.data();
            if (j.push_sub) try { webpush.sendNotification(j.push_sub, JSON.stringify({ title: "Notificação de Ausência", body: "Sentimos sua falta nas mesas. Retorne para defender sua posição no ranking." })); } catch(e){}
            if (j.push_token) try { getMessaging().send({ token: j.push_token, notification: { title: "Notificação de Ausência", body: "Sentimos sua falta nas mesas. Retorne para defender sua posição no ranking." }}); } catch(e){}
        });
    } catch (err) {}
}, { scheduled: true, timezone: "America/Bahia" });

// ==========================================
// 🧠 LÓGICA CORE: ORDENAÇÃO E ALOCAÇÃO
// ==========================================
function ordenarFila(filaBruta) {
    const UMA_HORA_EM_MS = 60 * 60 * 1000;
    return filaBruta.sort((a, b) => {
        const jogosA = a.partidas_hoje || 0;
        const jogosB = b.partidas_hoje || 0;

        if (jogosA === 0 && jogosB > 0) return -1;
        if (jogosA > 0 && jogosB === 0) return 1;

        const tempoEntradaA = new Date(a.created_at).getTime();
        const ultimoJogoA = a.ultimo_jogo_at ? new Date(a.ultimo_jogo_at).getTime() : tempoEntradaA;
        const ficouAusenteA = (tempoEntradaA - ultimoJogoA) > UMA_HORA_EM_MS;

        const tempoEntradaB = new Date(b.created_at).getTime();
        const ultimoJogoB = b.ultimo_jogo_at ? new Date(b.ultimo_jogo_at).getTime() : tempoEntradaB;
        const ficouAusenteB = (tempoEntradaB - ultimoJogoB) > UMA_HORA_EM_MS;

        if (ficouAusenteA && !ficouAusenteB) return -1;
        if (!ficouAusenteA && ficouAusenteB) return 1;

        return new Date(a.created_at) - new Date(b.created_at);
    });
}

let isAlocando = false;
let tentarNovamente = false;

async function alocarMesas() {
    if (isAlocando) { tentarNovamente = true; return; }
    isAlocando = true;
    
    do {
        tentarNovamente = false; 
        try {
            const snapshotJogadores = await db.collection('jogadores').get();
            const todosJogadores = snapshotJogadores.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            let mesa1 = todosJogadores.filter(j => j.status === 'mesa' && j.mesa_atual === 1);
            let mesa2 = todosJogadores.filter(j => j.status === 'mesa' && j.mesa_atual === 2);
            let mesa3 = todosJogadores.filter(j => j.status === 'mesa' && j.mesa_atual === 3);
            let espera = todosJogadores.filter(j => j.status === 'espera');

            if (mesa1.length < 4 && mesa2.length > 0 && mesa2.length < 4) { espera = [...espera, ...mesa2]; mesa2 = []; }
            if (mesa1.length < 4 && mesa3.length > 0 && mesa3.length < 4) { espera = [...espera, ...mesa3]; mesa3 = []; }
            if (mesa1.length === 4 && mesa2.length < 4 && mesa3.length > 0 && mesa3.length < 4) { espera = [...espera, ...mesa3]; mesa3 = []; }

            if (espera.length === 0) continue; 

            const filaOrdenada = ordenarFila(espera);

            let m1_vagas = mesasAtivas[1] ? 4 - mesa1.length : 0;
            let m2_vagas = mesasAtivas[2] ? 4 - mesa2.length : 0;
            let m3_vagas = mesasAtivas[3] ? 4 - mesa3.length : 0;

            let selecionadosM1 = []; let selecionadosM2 = []; let selecionadosM3 = [];
            let processados = new Set(); 

            for (const jogador of filaOrdenada) {
                if (processados.has(jogador.id)) continue;

                const pref = String(jogador.preferencia || '').toLowerCase().trim();
                const isDupla = jogador.dupla_id !== null && jogador.dupla_id !== undefined;

                if (isDupla) {
                    const parceiro = filaOrdenada.find(j => j.dupla_id === jogador.dupla_id && j.id !== jogador.id);
                    if (parceiro) {
                        processados.add(jogador.id); processados.add(parceiro.id);
                        if (selecionadosM1.length + 2 <= m1_vagas && (pref.includes('1') || pref.includes('qualquer'))) { selecionadosM1.push(jogador, parceiro); continue; }
                        if (selecionadosM2.length + 2 <= m2_vagas && (pref.includes('2') || pref.includes('qualquer'))) { selecionadosM2.push(jogador, parceiro); continue; }
                        if (selecionadosM3.length + 2 <= m3_vagas && (pref.includes('3') || pref.includes('qualquer'))) { selecionadosM3.push(jogador, parceiro); continue; }
                        continue;
                    }
                }

                processados.add(jogador.id);
                if (selecionadosM1.length < m1_vagas && (pref.includes('1') || pref.includes('qualquer'))) { selecionadosM1.push(jogador); continue; }
                if (selecionadosM2.length < m2_vagas && (pref.includes('2') || pref.includes('qualquer'))) { selecionadosM2.push(jogador); continue; }
                if (selecionadosM3.length < m3_vagas && (pref.includes('3') || pref.includes('qualquer'))) { selecionadosM3.push(jogador); continue; }
            }

            if (mesa1.length === 0 && selecionadosM1.length < 4) selecionadosM1 = [];
            if (mesa2.length === 0 && selecionadosM2.length < 4) selecionadosM2 = [];
            if (mesa3.length === 0 && selecionadosM3.length < 4) selecionadosM3 = [];

            const batch = db.batch();
            let updatesRealizados = 0;

            for (const jogador of todosJogadores) {
                let novoStatus = jogador.status;
                let novaMesa = jogador.mesa_atual;

                if (selecionadosM1.some(j => j.id === jogador.id)) { novoStatus = 'mesa'; novaMesa = 1; }
                else if (selecionadosM2.some(j => j.id === jogador.id)) { novoStatus = 'mesa'; novaMesa = 2; }
                else if (selecionadosM3.some(j => j.id === jogador.id)) { novoStatus = 'mesa'; novaMesa = 3; }
                else if (jogador.status === 'mesa') { novoStatus = 'espera'; novaMesa = null; }

                // BLINDAGEM DE CUSTOS: Só manda para o banco se a pessoa realmente se mexeu
                if (novoStatus !== jogador.status || novaMesa !== jogador.mesa_atual) {
                    const docRef = db.collection('jogadores').doc(String(jogador.id));
                    batch.update(docRef, { status: novoStatus, mesa_atual: novaMesa });
                    updatesRealizados++;
                }
            }
            if (updatesRealizados > 0) await batch.commit();

            const snapshotNovaEspera = await db.collection('jogadores').where('status', '==', 'espera').get();
            const novaEspera = snapshotNovaEspera.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (novaEspera.length > 0) {
                const novosEsperaOrdenados = ordenarFila(novaEspera);
                const top2Ids = novosEsperaOrdenados.slice(0, 2).map(j => j.id);

                for (const id of top2Ids) {
                    if (!notificadosProximos.has(id)) {
                        notificadosProximos.add(id);
                        avisarJogadorProximo(id); 
                    }
                }

                for (let id of notificadosProximos) {
                    if (!top2Ids.includes(id)) {
                        notificadosProximos.delete(id);
                    }
                }
            } else {
                notificadosProximos.clear();
            }

        } catch (error) { console.error("Erro no alocarMesas:", error); }
    } while (tentarNovamente); 
    isAlocando = false;
}

// ==========================================
// 🛡️ ROTAS: ADMIN E DEUS
// ==========================================
app.post('/login-admin', loginLimiter, (req, res) => {
    const { senhaDigitada } = req.body;
    if (senhaDigitada === SENHA_ADMIN) res.json({ autorizado: true });
    else res.status(401).json({ autorizado: false, error: "Senha incorreta!" });
});

app.post('/admin/deus', async (req, res) => {
    const { senhaMestra, jogadorId, acao, destino } = req.body;
    if (senhaMestra !== SENHA_ADMIN) return res.status(401).json({ error: "Acesso negado." });

    try {
        const docRef = db.collection('jogadores').doc(String(jogadorId));
        if (acao === 'expulsar') {
            await docRef.update({ status: 'ausente', mesa_atual: null });
        } else if (acao === 'mover_fila') {
            await docRef.update({ status: 'espera', mesa_atual: null, dupla_id: null, created_at: new Date().toISOString() });
        } else if (acao === 'forcar_mesa') {
            await docRef.update({ status: 'mesa', mesa_atual: destino });
        }
        res.json({ message: "Operação executada." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/forcar-entrada', async (req, res) => {
  const { senhaMestra, jogadorId, preferencia } = req.body;
  if (senhaMestra !== SENHA_ADMIN) return res.status(401).json({ error: "Acesso negado." });

  try {
    const docRef = db.collection('jogadores').doc(String(jogadorId));
    await docRef.update({
        status: 'espera', preferencia: preferencia || 'Qualquer', mesa_atual: null, created_at: new Date().toISOString()
    });
    res.json({ success: true, message: "Puxado pra fila com sucesso!" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/fechar-mesa', async (req, res) => {
    const { senhaMestra, mesaId } = req.body;
    if (senhaMestra !== SENHA_ADMIN) return res.status(401).json({ error: "Senha incorreta." });
    
    mesasAtivas[mesaId] = !mesasAtivas[mesaId]; 
    await alocarMesas(); 
    res.json({ message: `Status da Mesa ${mesaId} alterado!`, mesasAtivas });
});

app.patch('/admin/congelar-toda-fila', pinLimiter, async (req, res) => {
    const { acao } = req.body;
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== SENHA_ADMIN) return res.status(401).json({ error: "Acesso negado!" });

    try {
        const novoStatus = acao === 'congelar' ? 'congelado' : 'espera';
        const snapshot = await db.collection('jogadores').where('status', 'in', ['espera', 'congelado']).get();
        
        if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.forEach(doc => { batch.update(doc.ref, { status: novoStatus }); });
            await batch.commit();
        }
        await alocarMesas();
        res.json({ message: `Fila ${acao}da com sucesso!` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/limpar-fila', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== SENHA_ADMIN) return res.status(401).json({ error: "Acesso negado!" });

    try {
        const snapshot = await db.collection('jogadores').where('status', 'in', ['espera', 'congelado']).get();
        if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.forEach(doc => { batch.update(doc.ref, { status: 'ausente', mesa_atual: null }); });
            await batch.commit();
        }
        res.json({ message: "Fila varrida com sucesso!" });
    } catch (err) { res.status(500).json({ error: "Erro interno." }); }
});

// ==========================================
// 🎲 ROTAS: FILA E CADASTRO
// ==========================================
app.post('/login', pinLimiter, async (req, res) => {
    const { nome, pin } = req.body;
    if (!nome || !pin) return res.status(400).json({ error: "Dados incompletos." });

    try {
        const snapshot = await db.collection('jogadores').where('nome_busca', '==', nome.toLowerCase().trim()).limit(1).get();
        if (snapshot.empty) return res.status(404).json({ error: "Jogador não encontrado." });
        
        const jogador = snapshot.docs[0].data();
        if (String(jogador.pin) !== String(pin).trim()) {
            return res.status(401).json({ error: "PIN incorreto." });
        }
        
        res.json({ success: true, message: "Acesso liberado!" });
    } catch (err) { res.status(500).json({ error: "Erro no servidor." }); }
});

app.get('/fila', async (req, res) => {
    try {
        const snapshot = await db.collection('jogadores').get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (!data || data.length === 0) return res.json([]);
        
        const mesa1 = data.filter(j => j.status === 'mesa' && j.mesa_atual === 1);
        const mesa2 = data.filter(j => j.status === 'mesa' && j.mesa_atual === 2);
        const mesa3 = data.filter(j => j.status === 'mesa' && j.mesa_atual === 3); 
        const esperando = data.filter(j => j.status === 'espera' || j.status === 'congelado');

        res.json([...ordenarFila(mesa1), ...ordenarFila(mesa2), ...ordenarFila(mesa3), ...ordenarFila(esperando)]);
    } catch (err) { res.status(500).json({ error: "Erro interno no servidor" }); }
});

app.get('/mesas-status', (req, res) => res.json(mesasAtivas));

app.post('/cadastrar', async (req, res) => {
    const { nome, pin, foto } = req.body;
    if (!nome || !pin) return res.status(400).json({ error: "O nome e o PIN são obrigatórios!" });

    const nomeTratado = nome.trim();
    const nomeBusca = nomeTratado.toLowerCase(); // CHAVE DA CORREÇÃO DE CASE SENSITIVE
    const agora = new Date().toISOString();

    try {
        const snapshot = await db.collection('jogadores').where('nome_busca', '==', nomeBusca).limit(1).get();

        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            const jogadorExistente = snapshot.docs[0].data();

            if (jogadorExistente.status === 'espera' || jogadorExistente.status === 'mesa') {
                return res.status(400).json({ error: "Esse jogador já está na fila ou jogando!" });
            }
            
            await docRef.update({ status: 'espera', created_at: agora, pin: pin });
            const docAtualizado = await docRef.get();
            await alocarMesas(); 
            return res.json({ id: docAtualizado.id, ...docAtualizado.data() });
        }

        const avatar_url = foto ? foto : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nomeTratado)}`; 
        const novoDocRef = db.collection('jogadores').doc();
        const novoJogador = { 
            id: novoDocRef.id,
            nome: nomeTratado, 
            nome_busca: nomeBusca, 
            pin: pin, status: 'espera', avatar_url: avatar_url, created_at: agora, 
            partidas_hoje: 0, vitorias: 0, vitorias_semana: 0, partidas_jogadas: 0, partidas_semana: 0,
            termos_aceitos: false 
        };
        
        await novoDocRef.set(novoJogador);
        await alocarMesas();
        res.json(novoJogador);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/jogadores-cadastrados', async (req, res) => {
    try {
        const snapshot = await db.collection('jogadores').orderBy('nome', 'asc').get();
        const data = snapshot.docs.map(doc => {
            const d = doc.data();
            return { id: doc.id, nome: d.nome, avatar_url: d.avatar_url, termos_aceitos: d.termos_aceitos };
        });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/aceitar-termos', pinLimiter, async (req, res) => {
    const { id, pin } = req.body;
    try {
        const docRef = db.collection('jogadores').doc(String(id));
        const doc = await docRef.get();
        if (!doc.exists) return res.status(404).json({ error: "Jogador não encontrado!" });
        
        const jogador = doc.data();
        if (String(jogador.pin) !== String(pin)) return res.status(401).json({ error: "PIN incorreto!" });
        
        await docRef.update({ termos_aceitos: true, data_aceite_termos: new Date().toISOString() });
        res.json({ message: "Termos aceitos!" });
    } catch (err) { res.status(500).json({ error: "Erro interno." }); }
});

app.post('/entrar-fila', pinLimiter, async (req, res) => {
    const { nome, pin, preferencia } = req.body;
    try {
        const snapshot = await db.collection('jogadores').where('nome_busca', '==', String(nome).toLowerCase().trim()).limit(1).get();
        if (snapshot.empty) return res.status(404).json({ error: "Jogador não encontrado!" });
        
        const docRef = snapshot.docs[0].ref;
        const dbUser = snapshot.docs[0].data();

        if (String(dbUser.pin) !== String(pin)) return res.status(401).json({ error: "PIN incorreto!" });        
        if (dbUser.status === 'espera' || dbUser.status === 'mesa') return res.status(400).json({ error: "Você já está na fila ou na mesa!" });

        await docRef.update({ status: 'espera', preferencia: preferencia || 'qualquer', created_at: new Date().toISOString() });
        await alocarMesas();
        res.json({ message: "OK" });
    } catch (error) { res.status(500).json({ error: "Falha de conexão." }); }
});

app.post('/entrar-fila-dupla', pinLimiter, async (req, res) => {
    const { nome1, pin1, nome2, pin2, preferencia } = req.body;
    if (nome1 === nome2) return res.status(400).json({ error: "Não pode fazer dupla consigo mesmo!" });

    try {
        const snapshot1 = await db.collection('jogadores').where('nome_busca', '==', nome1.toLowerCase().trim()).limit(1).get();
        const snapshot2 = await db.collection('jogadores').where('nome_busca', '==', nome2.toLowerCase().trim()).limit(1).get();

        if (snapshot1.empty || snapshot2.empty) return res.status(404).json({ error: "Jogadores não encontrados!" });

        const j1Doc = snapshot1.docs[0];
        const j2Doc = snapshot2.docs[0];
        const j1 = { id: j1Doc.id, ...j1Doc.data() };
        const j2 = { id: j2Doc.id, ...j2Doc.data() };

        if (String(j1.pin) !== String(pin1) || String(j2.pin) !== String(pin2)) return res.status(401).json({ error: "PIN incorreto!" });
        if (['espera', 'mesa'].includes(j1.status) || ['espera', 'mesa'].includes(j2.status)) return res.status(400).json({ error: "Alguém da dupla já está na fila!" });

        const duplaId = crypto.randomUUID();
        const batch = db.batch();
        batch.update(j1Doc.ref, { status: 'espera', preferencia: preferencia || 'qualquer', created_at: new Date().toISOString(), dupla_id: duplaId });
        batch.update(j2Doc.ref, { status: 'espera', preferencia: preferencia || 'qualquer', created_at: new Date().toISOString(), dupla_id: duplaId });
        await batch.commit();

        await alocarMesas();
        res.json({ message: "Dupla inserida com sucesso!" });
    } catch (err) { res.status(500).json({ error: "Erro interno no servidor" }); }
});

app.delete('/fila/:id', pinLimiter, async (req, res) => {
    const senhaDigitada = req.headers['x-admin-key']; 
    try {
        const docRef = db.collection('jogadores').doc(String(req.params.id));
        const doc = await docRef.get();
        
        if (senhaDigitada !== SENHA_ADMIN) {
            if (!doc.exists || String(doc.data().pin) !== String(senhaDigitada)) return res.status(401).json({ error: "PIN incorreto!" });
        }
        await docRef.update({ status: 'ausente', mesa_atual: null });
        await alocarMesas();
        res.json({ message: "OK" });
    } catch (err) { res.status(500).json({ error: "Erro interno." }); }
});

app.patch('/fila/:id/congelar', pinLimiter, async (req, res) => {
    const authKey = req.headers['x-admin-key'];
    try {
        const docRef = db.collection('jogadores').doc(String(req.params.id));
        const doc = await docRef.get();
        if (!doc.exists) return res.status(404).json({ error: "Jogador não encontrado!" });
        
        const jogador = doc.data();
        if (String(authKey) !== SENHA_ADMIN && String(authKey) !== String(jogador.pin)) return res.status(401).json({ error: "PIN incorreto!" });
        if (jogador.status === 'mesa') return res.status(400).json({ error: "O jogador já está na mesa!" });

        const novoStatus = jogador.status === 'congelado' ? 'espera' : 'congelado';
        await docRef.update({ status: novoStatus });
        
        res.json({ message: `Status alterado para ${novoStatus}!` });
    } catch (err) { res.status(500).json({ error: "Erro interno." }); }
});

app.post('/formar-dupla', pinLimiter, async (req, res) => {
    const { jogador1_id, jogador2_id, pin1, pin2 } = req.body;
    try {
        const doc1Ref = db.collection('jogadores').doc(String(jogador1_id));
        const doc2Ref = db.collection('jogadores').doc(String(jogador2_id));
        const [d1, d2] = await Promise.all([doc1Ref.get(), doc2Ref.get()]);

        if (!d1.exists || !d2.exists) return res.status(400).json({ error: "Jogadores não encontrados." });

        const j1 = d1.data();
        const j2 = d2.data();

        if (String(j1.pin) !== String(pin1) || String(j2.pin) !== String(pin2)) return res.status(401).json({ error: "PIN incorreto!" });
        if (j1.status !== 'espera' || j2.status !== 'espera') return res.status(400).json({ error: "Ambos precisam estar na Fila." });
        if (j1.dupla_id || j2.dupla_id) return res.status(400).json({ error: "Um de vocês já está em uma dupla!" });

        const duplaId = crypto.randomUUID();
        const batch = db.batch();
        batch.update(doc1Ref, { dupla_id: duplaId });
        batch.update(doc2Ref, { dupla_id: duplaId });
        await batch.commit();

        res.json({ message: "Dupla formada!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/desfazer-dupla', pinLimiter, async (req, res) => {
    const { jogador_id, pin } = req.body;
    try {
        const docRef = db.collection('jogadores').doc(String(jogador_id));
        const doc = await docRef.get();
        if (!doc.exists) return res.status(400).json({ error: "Jogador não encontrado." });
        
        const jogador = doc.data();
        if ((String(jogador.pin) !== String(pin) && String(pin) !== SENHA_ADMIN)) return res.status(401).json({ error: "PIN incorreto!" });
        if (!jogador.dupla_id) return res.status(400).json({ error: "Não está em nenhuma dupla." });

        const snapshot = await db.collection('jogadores').where('dupla_id', '==', jogador.dupla_id).get();
        const batch = db.batch();
        snapshot.forEach(item => {
            batch.update(item.ref, { dupla_id: null });
        });
        await batch.commit();

        res.json({ message: "Dupla desfeita." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 🔥 ROTA DE VITÓRIA (COM FILA SEGURA)
// ==========================================
let travaVitoria = Promise.resolve();

app.post('/vitoria', (req, res) => {
    const executarVitoria = async () => {
        const { vencedores, mesaId, quemFicaId, filaReal } = req.body;
        try {
            const snapshotMesa = await db.collection('jogadores').where('status', '==', 'mesa').where('mesa_atual', '==', Number(mesaId)).get();
            const mesa = snapshotMesa.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (!mesa || mesa.length === 0) return res.status(400).json({ error: "Nenhum jogador encontrado nesta mesa." });

            const baseTime = new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/Bahia',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            });
            const partes = formatter.formatToParts(baseTime);
            const getPart = (type) => partes.find(p => p.type === type).value;
            
            const horaAtualBahia = parseInt(getPart('hour'), 10);

            if (horaAtualBahia >= 22 || horaAtualBahia < 5) {
                const ano = getPart('year');
                const mes = getPart('month');
                const dia = getPart('day');
                
                let dataLimiteBahia = new Date(`${ano}-${mes}-${dia}T22:00:00-03:00`);
                if (horaAtualBahia < 5) dataLimiteBahia.setDate(dataLimiteBahia.getDate() - 1);

                const mesaInvalida = mesa.some(j => new Date(j.created_at) >= dataLimiteBahia);
                if (mesaInvalida) return res.status(403).json({ error: "PAF fechado! Já passou das 22h e a sadeira desta mesa já foi registrada." });
            }

            let idsSair = [];
            const countFila = Number(filaReal) || 0;

            if (countFila >= 2) idsSair = mesa.filter(j => !vencedores.includes(j.id)).map(j => j.id);
            else if (countFila === 1) idsSair = mesa.filter(j => !vencedores.includes(j.id) && j.id !== quemFicaId).map(j => j.id);

            const duplasNaMesa = [...new Set(mesa.map(j => j.dupla_id).filter(id => id !== null))];
            for (const d_id of duplasNaMesa) {
                const parceiros = mesa.filter(j => j.dupla_id === d_id);
                if (parceiros.length === 2 && (idsSair.includes(parceiros[0].id) !== idsSair.includes(parceiros[1].id))) {
                    const snapDupla = await db.collection('jogadores').where('dupla_id', '==', d_id).get();
                    const batchDupla = db.batch();
                    snapDupla.forEach(item => batchDupla.update(item.ref, { dupla_id: null }));
                    await batchDupla.commit();
                }
            }

            const perdedores = mesa.filter(j => !vencedores.includes(j.id)).map(j => j.id);
            let atrasoFilaMs = 0;
            
            try {
                await db.collection('historico_partidas').doc(crypto.randomUUID()).set({
                    mesa_id: Number(mesaId),
                    vencedor1_id: vencedores[0] || null, vencedor2_id: vencedores[1] || null,
                    perdedor1_id: perdedores[0] || null, perdedor2_id: perdedores[1] || null, 
                    data_partida: baseTime.toISOString()
                });
            } catch(e) {}

            const batchJogadores = db.batch();
            for (const jogador of mesa) {
                const docRef = db.collection('jogadores').doc(String(jogador.id));
                const vaiSair = idsSair.includes(jogador.id);
                const isVencedor = vencedores.includes(jogador.id); 
                const minutosNaMesa = Math.floor((baseTime.getTime() - new Date(jogador.created_at).getTime()) / 60000);
                const isSabado = (new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bahia', weekday: 'short' }).format(new Date()) === 'Sat');

                let updateData = {
                    ultimo_jogo_at: baseTime.toISOString(),
                    tempo_sentado: (jogador.tempo_sentado || 0) + (minutosNaMesa > 0 ? minutosNaMesa : 15) 
                };

                if (!isSabado) {
                    updateData.partidas_hoje = (jogador.partidas_hoje || 0) + 1;
                    updateData.partidas_jogadas = (jogador.partidas_jogadas || 0) + 1; 
                    updateData.partidas_semana = (jogador.partidas_semana || 0) + 1; 
                    updateData.vitorias = isVencedor ? (jogador.vitorias || 0) + 1 : (jogador.vitorias || 0); 
                    updateData.vitorias_semana = isVencedor ? (jogador.vitorias_semana || 0) + 1 : (jogador.vitorias_semana || 0);
                }
                if (vaiSair) {
                    updateData.status = 'espera'; 
                    updateData.mesa_atual = null;
                    updateData.created_at = new Date(baseTime.getTime() + atrasoFilaMs).toISOString(); 
                    atrasoFilaMs += 1000; 
                } else { updateData.created_at = baseTime.toISOString(); }

                batchJogadores.update(docRef, updateData);
            }
            await batchJogadores.commit();
            
            try { await alocarMesas(); } catch (e) {}
            try {
                const snapApostas = await db.collection('apostas_ao_vivo').where('mesa_id', '==', Number(mesaId)).get();
                if(!snapApostas.empty) {
                    const batchApostas = db.batch();
                    snapApostas.forEach(item => batchApostas.delete(item.ref));
                    await batchApostas.commit();
                }
            } catch (e) {}

            res.json({ message: "Mesa processada com sucesso!" });
        } catch (err) { 
            console.error("Erro interno na rota de vitoria:", err);
            res.status(500).json({ error: "Erro interno ao processar a vitória." }); 
        }
    };

    // A fila encadeia a execução garantindo que falhas não travem o app
    travaVitoria = travaVitoria.then(executarVitoria).catch(err => {
        console.error("Fila recuperada de falha:", err);
    });
});

// ==========================================
// 🏆 ROTAS: ESTATÍSTICAS E RANKING
// ==========================================
app.get('/estatisticas-gerais', async (req, res) => {
    try {
        const snapJogadores = await db.collection('jogadores').get();
        const mapNomes = {}; let maisPartidas = { valor: 0, dono: "Ninguém" };
        
        snapJogadores.docs.forEach(doc => {
            const j = doc.data();
            mapNomes[doc.id] = j.nome;
            if ((j.partidas_jogadas || 0) > maisPartidas.valor) { maisPartidas = { valor: j.partidas_jogadas, dono: j.nome }; }
        });

        const snapHistorico = await db.collection('historico_partidas').orderBy('data_partida', 'asc').get();
        let duplaCounts = {}; let streaks = {};

        snapHistorico.docs.forEach(doc => {
            const p = doc.data();
            const v1 = p.vencedor1_id; const v2 = p.vencedor2_id;
            const d1 = p.perdedor1_id; const d2 = p.perdedor2_id;

            if (v1 && v2) {
                const duplaStr = [v1, v2].sort().join('|');
                duplaCounts[duplaStr] = (duplaCounts[duplaStr] || 0) + 1;
            }

            [v1, v2, d1, d2].forEach(id => {
                if (id && !streaks[id]) { streaks[id] = { atual_w: 0, max_w: 0, atual_l: 0, max_l: 0 }; }
            });

            [v1, v2].forEach(id => {
                if (id) {
                    streaks[id].atual_w += 1;
                    if (streaks[id].atual_w > streaks[id].max_w) streaks[id].max_w = streaks[id].atual_w;
                    streaks[id].atual_l = 0; 
                }
            });

            [d1, d2].forEach(id => {
                if (id) {
                    streaks[id].atual_l += 1;
                    if (streaks[id].atual_l > streaks[id].max_l) streaks[id].max_l = streaks[id].atual_l;
                    streaks[id].atual_w = 0; 
                }
            });
        });

        let maiorSequencia = { valor: 0, dono: "Ninguém" };
        let maiorJejum = { valor: 0, dono: "Ninguém" };

        Object.keys(streaks).forEach(id => {
            if (streaks[id].max_w > maiorSequencia.valor) { maiorSequencia = { valor: streaks[id].max_w, dono: mapNomes[id] || "Anônimo" }; }
            if (streaks[id].max_l > maiorJejum.valor) { maiorJejum = { valor: streaks[id].max_l, dono: mapNomes[id] || "Anônimo" }; }
        });

        let duplaImbativel = { valor: 0, dono: "Ninguém" };
        Object.keys(duplaCounts).forEach(duplaStr => {
            if (duplaCounts[duplaStr] > duplaImbativel.valor) {
                const ids = duplaStr.split('|');
                const nomeDupla = `${mapNomes[ids[0]] || 'Anônimo'} & ${mapNomes[ids[1]] || 'Anônimo'}`;
                duplaImbativel = { valor: duplaCounts[duplaStr], dono: nomeDupla };
            }
        });

        res.json({ maiorSequencia, duplaImbativel, maisPartidas, maiorJejum });
    } catch (error) { res.status(500).json({ error: "Erro ao calcular estatísticas gerais." }); }
});

app.get('/ranking', async (req, res) => {
    try {
        const snapshot = await db.collection('jogadores').where('vitorias', '>', 0).get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/estatisticas-detalhadas/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID não fornecido" });

    try {
        const snapPartidas = await db.collection('historico_partidas').orderBy('data_partida', 'asc').get();
        const todasPartidas = snapPartidas.docs.map(doc => doc.data());
        
        const partidas = todasPartidas.filter(p => 
            p.vencedor1_id === id || p.vencedor2_id === id || p.perdedor1_id === id || p.perdedor2_id === id
        );

        if (!partidas || partidas.length === 0) {
            return res.json({
                maiorStreakV: 0, maiorStreakD: 0, mesaFavorita: "1", carrascoId: null, qtdCarrasco: 0, freguesId: null, qtdFregues: 0,
                melhorParceiroId: null, qtdMelhorParceiro: 0, piorParceiroId: null, qtdPiorParceiro: 0, auditoriaLista: []
            });
        }

        let maiorStreakV = 0, maiorStreakD = 0, streakVAtual = 0, streakDAtual = 0;
        let rivais = {}, fregueses = {}, parceirosV = {}, parceirosD = {}, mesas = {};
        let auditoriaLista = [];

        partidas.forEach((p, index) => {
            const ganhou = (p.vencedor1_id === id || p.vencedor2_id === id);
            
            auditoriaLista.unshift({
                index: index + 1,
                v1: p.vencedor1_id, v2: p.vencedor2_id, d1: p.perdedor1_id, d2: p.perdedor2_id,
                resultado: ganhou ? 'VITÓRIA' : 'DERROTA', data: p.data_partida
            });

            if (ganhou) {
                streakVAtual++; streakDAtual = 0; 
                if (streakVAtual > maiorStreakV) maiorStreakV = streakVAtual;
                if (p.mesa_id) mesas[p.mesa_id] = (mesas[p.mesa_id] || 0) + 1;

                const parceiro = (p.vencedor1_id === id) ? p.vencedor2_id : p.vencedor1_id;
                if (parceiro) parceirosV[parceiro] = (parceirosV[parceiro] || 0) + 1;

                if (p.perdedor1_id && p.perdedor1_id !== id) fregueses[p.perdedor1_id] = (fregueses[p.perdedor1_id] || 0) + 1;
                if (p.perdedor2_id && p.perdedor2_id !== id) fregueses[p.perdedor2_id] = (fregueses[p.perdedor2_id] || 0) + 1;

            } else {
                streakDAtual++; streakVAtual = 0; 
                if (streakDAtual > maiorStreakD) maiorStreakD = streakDAtual;

                const parceiro = (p.perdedor1_id === id) ? p.perdedor2_id : p.perdedor1_id;
                if (parceiro) parceirosD[parceiro] = (parceirosD[parceiro] || 0) + 1;

                if (p.vencedor1_id && p.vencedor1_id !== id) rivais[p.vencedor1_id] = (rivais[p.vencedor1_id] || 0) + 1;
                if (p.vencedor2_id && p.vencedor2_id !== id) rivais[p.vencedor2_id] = (rivais[p.vencedor2_id] || 0) + 1;
            }
        });

        const acharMaior = (obj) => {
            let maxKey = null; let maxValue = 0;
            for (const [key, value] of Object.entries(obj)) { if (value > maxValue) { maxValue = value; maxKey = key; } }
            return { id: maxKey, qtd: maxValue };
        };

        res.json({
            maiorStreakV, maiorStreakD, mesaFavorita: String(acharMaior(mesas).id || "1"),
            carrascoId: acharMaior(rivais).id, qtdCarrasco: acharMaior(rivais).qtd,
            freguesId: acharMaior(fregueses).id, qtdFregues: acharMaior(fregueses).qtd,
            melhorParceiroId: acharMaior(parceirosV).id, qtdMelhorParceiro: acharMaior(parceirosV).qtd,
            piorParceiroId: acharMaior(parceirosD).id, qtdPiorParceiro: acharMaior(parceirosD).qtd,
            auditoriaLista, totalPartidas: partidas.length
        });
    } catch (err) { res.status(500).json({ error: "Falha estatísticas." }); }
});

app.post('/salvar-top10', pinLimiter, async (req, res) => {
    const { nome, pin, listaIds } = req.body;
    const snapshot = await db.collection('jogadores').where('nome_busca', '==', nome.toLowerCase().trim()).limit(1).get();
    if (snapshot.empty) return res.status(401).json({ error: 'Acesso não autorizado.' });

    const jogador = snapshot.docs[0].data();
    const jogadorId = snapshot.docs[0].id;

    if (String(jogador.pin) !== String(pin)) return res.status(401).json({ error: 'Acesso não autorizado.' });

    try {
        await db.collection('top10_listas').doc(String(jogadorId)).set({
            dono_id: jogadorId, lista_ids: listaIds, atualizado_em: new Date().toISOString()
        }, { merge: true });
        
        res.json({ message: 'Top 10 guardado com sucesso!' });
    } catch (err) { res.status(500).json({ error: 'Erro ao guardar o Top 10.' }); }
});

app.get('/ver-top10/:id', async (req, res) => {
    try {
        const docRef = await db.collection('top10_listas').doc(String(req.params.id)).get();
        if (!docRef.exists || !docRef.data().lista_ids) return res.json([]);

        const listaIds = docRef.data().lista_ids;
        const arrayBusca = listaIds.length > 0 ? listaIds : ['__none__'];
        const snapshot = await db.collection('jogadores').where(FieldPath.documentId(), 'in', arrayBusca).get();
        
        const jogadores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const listaOrdenada = listaIds.map(id => jogadores.find(j => j.id === id)).filter(Boolean);
        res.json(listaOrdenada);
    } catch (err) { 
        res.status(500).json({ error: 'Erro Top 10.' }); 
    }
});

app.get('/top10-global', async (req, res) => {
    try {
        const snapshot = await db.collection('top10_listas').get();
        let contagemVotos = {};
        
        snapshot.forEach(doc => {
            const l = doc.data();
            if (l.lista_ids) {
                l.lista_ids.forEach((idJogador, index) => {
                    if (!contagemVotos[idJogador]) contagemVotos[idJogador] = 0;
                    contagemVotos[idJogador] += (10 - index); 
                });
            }
        });

        const idsMaisVotados = Object.keys(contagemVotos).sort((a, b) => contagemVotos[b] - contagemVotos[a]).slice(0, 10);
        if (idsMaisVotados.length === 0) return res.json([]);

        const snapJogadores = await db.collection('jogadores').get();
        const todosJogadores = snapJogadores.docs.map(d => ({ id: d.id, ...d.data() }));

        const top10Final = idsMaisVotados.map((id, index) => {
            const j = todosJogadores.find(j => String(j.id) === String(id));
            return j ? { ...j, posicao: index + 1, votos: contagemVotos[id] } : null;
        }).filter(Boolean);

        res.json(top10Final);
    } catch (err) { res.status(500).json({ error: 'Erro Global Top 10.' }); }
});

// ==========================================
// 🛠️ OUTRAS ROTAS (EXTRAS / UTEIS)
// ==========================================
app.post('/votar', async (req, res) => {
  const { mesaId, apostadorNome, duplaEscolhida } = req.body;
  try {
    await db.collection('apostas_ao_vivo').add({ 
        mesa_id: Number(mesaId), 
        apostador_nome: apostadorNome, 
        dupla_escolhida: duplaEscolhida,
        criado_em: new Date().toISOString()
    });
    res.json({ sucesso: true, mensagem: 'Aposta cravada com sucesso!' });
  } catch (error) { res.status(500).json({ erro: 'Erro apostas.' }); }
});

app.get('/apostas', async (req, res) => {
  try {
    const snapshot = await db.collection('apostas_ao_vivo').get();
    const data = snapshot.docs.map(doc => ({ mesa_id: doc.data().mesa_id, dupla_escolhida: doc.data().dupla_escolhida }));
    res.json(data);
  } catch (error) { res.status(500).json({ erro: 'Erro apostas.' }); }
});

app.post('/atualizar-foto', pinLimiter, async (req, res) => {
    const { nome, pin, foto } = req.body;
    if (!nome || !pin || !foto) return res.status(400).json({ error: "Faltam dados!" });

    try {
        const snapshot = await db.collection('jogadores').where('nome_busca', '==', nome.toLowerCase().trim()).limit(1).get();
        if (snapshot.empty) return res.status(401).json({ error: "Senha incorreta!" });

        const docRef = snapshot.docs[0].ref;
        const jogador = snapshot.docs[0].data();
        if (String(jogador.pin) !== String(pin)) return res.status(401).json({ error: "Senha incorreta!" });

        await docRef.update({ avatar_url: foto });
        res.json({ message: "Foto atualizada!" });
    } catch (err) { res.status(500).json({ error: "Erro foto." }); }
});

app.post('/salvar-inscricao-push', async (req, res) => {
    const { jogadorId, subscription } = req.body;
    try {
        await db.collection('jogadores').doc(String(jogadorId)).update({ push_sub: subscription });
        res.status(200).json({ message: "Celular conectado via Navegador!" });
    } catch (err) { res.status(500).json({ error: "Erro push." }); }
});

app.post('/salvar-token-push', async (req, res) => {
    const { id, token } = req.body;
    try {
        await db.collection('jogadores').doc(String(id)).update({ push_token: token });
        res.status(200).json({ message: "Celular conectado ao Firebase!" });
    } catch (err) { res.status(500).json({ error: "Erro ao salvar token de push." }); }
});

app.post('/sac/denuncia', async (req, res) => {
    const { mensagem } = req.body;
    if (!mensagem || mensagem.trim() === '') return res.status(400).json({ error: "Vazio não rola." });
    try {
        await db.collection('denuncias_sac').add({ mensagem: mensagem, criado_em: new Date().toISOString() });
        res.json({ message: "Mensagem enviada! O sigilo é absoluto." });
    } catch (err) { res.status(500).json({ error: "Erro SAC." }); }
});

app.get('/historico-recente', async (req, res) => {
    try {
        const snapshot = await db.collection('historico_partidas').orderBy('data_partida', 'desc').limit(5).get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(data);
    } catch (err) { 
        try {
            const snapshot = await db.collection('historico_partidas').get();
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => new Date(b.data_partida) - new Date(a.data_partida));
            res.json(data.slice(0, 5));
        } catch(e) {
            res.status(500).json({ error: "Erro histórico" }); 
        }
    }
}); 

app.post('/atualizar-perfil', async (req, res) => {
    const { id, nome, pin, foto } = req.body;
    if (!id || !nome || !pin) return res.status(400).json({ error: "Dados incompletos para atualizar perfil." });

    try {
        const docRef = db.collection('jogadores').doc(String(id));
        const doc = await docRef.get();
        if (!doc.exists || String(doc.data().pin) !== String(pin)) {
            throw new Error("PIN incorreto ou usuário não encontrado.");
        }

        await docRef.update({ 
            nome: nome, 
            nome_busca: nome.toLowerCase().trim(),
            avatar_url: foto 
        });

        res.json({ message: "Perfil atualizado com sucesso no banco de dados!" });
    } catch (err) { res.status(500).json({ error: "Erro interno ao atualizar perfil." }); }
});

app.get('/configuracoes', async (req, res) => {
    try {
        const docRef = await db.collection('configuracoes_app').doc('1').get();
        res.json(docRef.exists ? docRef.data() : {});
    } catch (err) { res.status(500).json({ error: "Erro ao buscar as configurações." }); }
});

app.post('/admin/configuracoes', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== SENHA_ADMIN) return res.status(401).json({ error: "Acesso Master negado!" });

    const { top1_nome, top1_frase, top1_foto, top1_spotify, dica_nome, dica_foto, dica_titulo, dica_texto } = req.body;
    
    try {
        await db.collection('configuracoes_app').doc('1').set({
            top1_nome, top1_frase, top1_foto, top1_spotify, dica_nome, dica_foto, dica_titulo, dica_texto
        }, { merge: true });
        
        res.json({ message: "Aplicativo atualizado para todos os jogadores!" });
    } catch (err) { res.status(500).json({ error: "Erro ao salvar as configurações." }); }
});

app.get('/ranking-sabado', async (req, res) => {
    try {
        const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bahia' }));
        const diaSemana = hoje.getDay(); 
        const diasParaSabado = diaSemana === 6 ? 0 : (diaSemana + 1); 
        const dataUltimoSabado = new Date(hoje);
        dataUltimoSabado.setDate(hoje.getDate() - diasParaSabado);
        
        const ano = dataUltimoSabado.getFullYear();
        const mes = String(dataUltimoSabado.getMonth() + 1).padStart(2, '0');
        const dia = String(dataUltimoSabado.getDate()).padStart(2, '0');
        const dataFiltro = `${ano}-${mes}-${dia}`;
        
        const start = `${dataFiltro}T00:00:00-03:00`;
        const end = `${dataFiltro}T23:59:59-03:00`;

        const snapPartidas = await db.collection('historico_partidas')
            .where('data_partida', '>=', start)
            .where('data_partida', '<=', end)
            .get();

        const partidas = snapPartidas.docs.map(doc => doc.data());
        if (!partidas || partidas.length === 0) return res.json([]);

        const pontos = {};
        partidas.forEach(p => {
            if (p.vencedor1_id) pontos[p.vencedor1_id] = (pontos[p.vencedor1_id] || 0) + 3;
            if (p.vencedor2_id) pontos[p.vencedor2_id] = (pontos[p.vencedor2_id] || 0) + 3;
            if (p.perdedor1_id) pontos[p.perdedor1_id] = (pontos[p.perdedor1_id] || 0) - 1;
            if (p.perdedor2_id) pontos[p.perdedor2_id] = (pontos[p.perdedor2_id] || 0) - 1;
        });

        const ids = Object.keys(pontos);
        if (ids.length === 0) return res.json([]);

        const snapJogadores = await db.collection('jogadores').get();
        const todosJogadores = snapJogadores.docs.map(d => ({ id: d.id, ...d.data() }));

        const ranking = ids.map(id => {
            const j = todosJogadores.find(x => String(x.id) === String(id));
            return {
                id,
                nome: j ? j.nome : 'Anônimo',
                foto: j ? j.avatar_url : null,
                pontos: pontos[id]
            };
        }).sort((a, b) => b.pontos - a.pontos);

        res.json(ranking);
    } catch (err) {
        res.status(500).json({ error: "Erro interno ao buscar ranking." });
    }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});