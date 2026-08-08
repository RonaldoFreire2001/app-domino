const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const crypto = require('crypto');
const cron = require('node-cron');
const webpush = require('web-push');
const compression = require('compression');
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

const app = express();
app.use(compression());
app.set('trust proxy', 1);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// 🔔 1. CONFIGURAÇÃO DO WEB PUSH (NAVEGADOR)
const VAPID_PUBLIC_KEY = 'BOHGtXzWoRERIwsD_4K8YnWdJ6bJ8ZQ9Ua4K40zNRUQHJWnZI7csL7ZRHD_g2ycqLy5GvWBCtf9wEw6DUXxLymM';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY; 

webpush.setVapidDetails(
    'mailto: ronaldopaulo21@gmail.com', 
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

// 🔔 2. CONFIGURAÇÃO DO FIREBASE (APK NATIVO)
const serviceAccount = require("./firebase-chave.json"); 
initializeApp({
    credential: cert(serviceAccount)
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, message: { error: "Muitas tentativas. Tente novamente em 15 minutos." }
});
const pinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 30, message: { error: "Muitas tentativas de PIN. Bloqueado." }
});

const SENHA_ADMIN = process.env.ADMIN_PASSWORD;
let mesasAtivas = { 1: true, 2: true, 3: true };

// ==========================================
// 🚨 NOTIFICAÇÕES (HÍBRIDAS & PREMIUM)
// ==========================================

let notificadosProximos = new Set(); 

async function avisarTodoMundo(titulo, mensagem) {
    try {
        const { data: jogadores } = await supabase.from('jogadores').select('nome, push_sub, push_token');
        if (!jogadores || jogadores.length === 0) return;

        const webPayload = JSON.stringify({ title: titulo, body: mensagem });
        const firebaseTokens = [];

        for (const j of jogadores) {
            if (j.push_sub) {
                try { await webpush.sendNotification(j.push_sub, webPayload); } catch (err) {}
            }
            if (j.push_token) { firebaseTokens.push(j.push_token); }
        }

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
        const { data: jogador } = await supabase.from('jogadores').select('nome, push_sub, push_token').eq('id', jogadorId).single();
        if (!jogador) return;

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
        await supabase.from('jogadores').update({ vitorias_semana: 0, partidas_semana: 0 }).neq('id', '00000000-0000-0000-0000-000000000000'); 
    } catch (erro) { console.error("Erro na faxina semanal:", erro); }
};

cron.schedule('0 4 * * 1', async () => { await realizarResetGeral(); }, { timezone: "America/Bahia" });

cron.schedule('30 22 * * 1-5', async () => {
    try {
        const { data: jogadores } = await supabase.from('jogadores').select('*');
        if (!jogadores || jogadores.length === 0) return;

        const ranking = jogadores.map(jogador => {
            const vitorias = jogador.vitorias_semana || 0;
            const partidas = jogador.partidas_semana || 0;
            const pontos = (vitorias * 3) - (partidas - vitorias);
            return { ...jogador, pontos };
        });

        ranking.sort((a, b) => b.pontos - a.pontos);
        const top1 = ranking[0];
        await avisarTodoMundo("Encerramento Diário", `O destaque de hoje foi ${top1.nome} com ${top1.pontos} pontos. O ranking foi atualizado.`);
    } catch (err) {}
}, { scheduled: true, timezone: "America/Bahia" });

cron.schedule('0 11 * * *', async () => {
    try {
        const doisDiasAtras = new Date(); doisDiasAtras.setDate(doisDiasAtras.getDate() - 2);
        const { data: sumidos } = await supabase.from('jogadores').select('nome, push_sub, push_token, ultimo_jogo_at').lt('ultimo_jogo_at', doisDiasAtras.toISOString()); 
        if (!sumidos || sumidos.length === 0) return;

        for (const j of sumidos) {
            if (j.push_sub) try { await webpush.sendNotification(j.push_sub, JSON.stringify({ title: "Notificação de Ausência", body: "Sentimos sua falta nas mesas. Retorne para defender sua posição no ranking." })); } catch(e){}
            if (j.push_token) try { await getMessaging().send({ token: j.push_token, notification: { title: "Notificação de Ausência", body: "Sentimos sua falta nas mesas. Retorne para defender sua posição no ranking." }}); } catch(e){}
        }
    } catch (err) {}
}, { scheduled: true, timezone: "America/Bahia" });

setInterval(async () => {
    try { await supabase.rpc('rodar_relogio_domino'); } catch (err) {}
}, 60000);

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
            const { data: jogando } = await supabase.from('jogadores').select('*').eq('status', 'mesa');
            let mesa1 = jogando ? jogando.filter(j => j.mesa_atual === 1) : [];
            let mesa2 = jogando ? jogando.filter(j => j.mesa_atual === 2) : [];
            let mesa3 = jogando ? jogando.filter(j => j.mesa_atual === 3) : [];

            const { data: filaBruta } = await supabase.from('jogadores').select('*').eq('status', 'espera');
            let espera = filaBruta || [];

            // 🚨 CASCATA APRIMORADA: Move pessoas de mesas incompletas para as principais
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
                const isDupla = jogador.dupla_id !== null;

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

            // 🚨 A REGRA DE OURO DA FILA:
            // Uma mesa vazia (0 jogadores) SÓ pode ser aberta se tiver 4 pessoas prontas na fila.
            // Se não formar 4, eles continuam aguardando na fila.
            if (mesa1.length === 0 && selecionadosM1.length < 4) selecionadosM1 = [];
            if (mesa2.length === 0 && selecionadosM2.length < 4) selecionadosM2 = [];
            if (mesa3.length === 0 && selecionadosM3.length < 4) selecionadosM3 = [];

            for (const jogador of filaOrdenada) {
                if (selecionadosM1.includes(jogador)) {
                    await supabase.from('jogadores').update({ status: 'mesa', mesa_atual: 1 }).eq('id', jogador.id);
                }
                else if (selecionadosM2.includes(jogador)) {
                    await supabase.from('jogadores').update({ status: 'mesa', mesa_atual: 2 }).eq('id', jogador.id);
                }
                else if (selecionadosM3.includes(jogador)) {
                    await supabase.from('jogadores').update({ status: 'mesa', mesa_atual: 3 }).eq('id', jogador.id);
                }
                else if (jogador.status === 'mesa') await supabase.from('jogadores').update({ status: 'espera', mesa_atual: null }).eq('id', jogador.id);
            }

            const { data: novaEspera } = await supabase.from('jogadores').select('*').eq('status', 'espera');
            if (novaEspera && novaEspera.length > 0) {
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
        if (acao === 'expulsar') {
            await supabase.from('jogadores').update({ status: 'ausente', mesa_atual: null }).eq('id', jogadorId);
        } else if (acao === 'mover_fila') {
            // 🔥 REMOVIDA A DUPLA_ID AQUI para evitar que ele leve alguém junto
            await supabase.from('jogadores').update({ status: 'espera', mesa_atual: null, dupla_id: null, created_at: new Date().toISOString() }).eq('id', jogadorId);
        } else if (acao === 'forcar_mesa') {
            await supabase.from('jogadores').update({ status: 'mesa', mesa_atual: destino }).eq('id', jogadorId);
        }

        // Sem chamada ao alocarMesas, garantindo a soberania do ADM
        res.json({ message: "Operação executada." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/forcar-entrada', async (req, res) => {
  const { senhaMestra, jogadorId, preferencia } = req.body;
  if (senhaMestra !== SENHA_ADMIN) return res.status(401).json({ error: "Acesso negado." });

  try {
    const { error: updateErr } = await supabase.from('jogadores').update({
        status: 'espera', preferencia: preferencia || 'Qualquer', mesa_atual: null, created_at: new Date().toISOString()
    }).eq('id', jogadorId);

    if (updateErr) throw updateErr;
    
    // 🔥 LINHA DO ALOCAR MESAS REMOVIDA AQUI TAMBÉM!
    
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
        const { error } = await supabase.from('jogadores')
            .update({ status: novoStatus })
            .in('status', ['espera', 'congelado']); 
            
        if (error) throw error;
        await alocarMesas();
        res.json({ message: `Fila ${acao}da com sucesso!` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/limpar-fila', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== SENHA_ADMIN) return res.status(401).json({ error: "Acesso negado!" });

    try {
        await supabase.from('jogadores').update({ status: 'ausente', mesa_atual: null }).in('status', ['espera', 'congelado']);
        res.json({ message: "Fila varrida com sucesso!" });
    } catch (err) { res.status(500).json({ error: "Erro interno." }); }
});

app.post('/login', pinLimiter, async (req, res) => {
    const { nome, pin } = req.body;
    if (!nome || !pin) return res.status(400).json({ error: "Dados incompletos." });

    try {
        const { data: jogador } = await supabase.from('jogadores').select('pin').ilike('nome', nome.trim()).single();
        if (!jogador) return res.status(404).json({ error: "Jogador não encontrado." });
        
        if (String(jogador.pin) !== String(pin).trim()) {
            return res.status(401).json({ error: "PIN incorreto." });
        }
        
        res.json({ success: true, message: "Acesso liberado!" });
    } catch (err) { 
        res.status(500).json({ error: "Erro no servidor." }); 
    }
});

// ==========================================
// 🎲 ROTAS: FILA, CADASTRO, VITÓRIA
// ==========================================

app.get('/fila', async (req, res) => {
    try {
        const { data } = await supabase.from('jogadores').select('id, nome, avatar_url, status, mesa_atual, dupla_id, preferencia, created_at, ultimo_jogo_at, partidas_hoje');
        if (!data) return res.json([]);
        
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
    const agora = new Date().toISOString();

    try {
        const { data: jogadorExistente } = await supabase.from('jogadores').select('*').ilike('nome', nomeTratado).maybeSingle();

        if (jogadorExistente) {
            if (jogadorExistente.status === 'espera' || jogadorExistente.status === 'mesa') return res.status(400).json({ error: "Esse jogador já está na fila ou jogando!" });
            const { data } = await supabase.from('jogadores').update({ status: 'espera', created_at: agora, pin: pin }).eq('id', jogadorExistente.id).select().single();
            await alocarMesas(); 
            return res.json(data);
        }

        const avatar_url = foto ? foto : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nomeTratado)}`; 
        const { data } = await supabase.from('jogadores').insert([{ 
                nome: nomeTratado, pin: pin, status: 'espera', avatar_url: avatar_url, created_at: agora, 
                partidas_hoje: 0, vitorias: 0, vitorias_semana: 0, partidas_jogadas: 0, partidas_semana: 0,
                termos_aceitos: false // JÁ ENTRA NO BANCO COMO FALSO
        }]).select().single();
        
        await alocarMesas();
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 🔥 ATUALIZADO: AGORA TRAZ A INFORMAÇÃO SE O JOGADOR ACEITOU OS TERMOS
app.get('/jogadores-cadastrados', async (req, res) => {
    const { data } = await supabase.from('jogadores').select('id, nome, avatar_url, termos_aceitos').order('nome', { ascending: true });
    res.json(data);
});

app.post('/aceitar-termos', pinLimiter, async (req, res) => {
    const { id, pin } = req.body;
    try {
        const { data: jogador } = await supabase.from('jogadores').select('pin').eq('id', id).single();
        if (!jogador || String(jogador.pin) !== String(pin)) return res.status(401).json({ error: "PIN incorreto!" });
        
        // Bate o carimbo exato do momento do aceite
        const carimboDeTempo = new Date().toISOString(); 

        await supabase.from('jogadores').update({ 
            termos_aceitos: true,
            data_aceite_termos: carimboDeTempo // 🔥 A prova irrefutável salva no banco
        }).eq('id', id);

        res.json({ message: "Termos aceitos!" });
    } catch (err) { res.status(500).json({ error: "Erro interno." }); }
});

app.post('/entrar-fila', pinLimiter, async (req, res) => {
    const { nome, pin, preferencia } = req.body;
    try {
        const { data: db } = await supabase.from('jogadores').select('*').ilike('nome', String(nome).trim()).single();
        if (!db) return res.status(404).json({ error: "Jogador não encontrado!" });
        if (String(db.pin) !== String(pin)) return res.status(401).json({ error: "PIN incorreto!" });        
        if (db.status === 'espera' || db.status === 'mesa') return res.status(400).json({ error: "Você já está na fila ou na mesa!" });

        await supabase.from('jogadores').update({ status: 'espera', preferencia: preferencia || 'qualquer', created_at: new Date().toISOString() }).eq('id', db.id);
        await alocarMesas();
        res.json({ message: "OK" });
    } catch (error) { res.status(500).json({ error: "Falha de conexão." }); }
});

app.post('/entrar-fila-dupla', pinLimiter, async (req, res) => {
    const { nome1, pin1, nome2, pin2, preferencia } = req.body;
    if (nome1 === nome2) return res.status(400).json({ error: "Não pode fazer dupla consigo mesmo!" });

    try {
        const { data: jogadores } = await supabase.from('jogadores').select('*').in('nome', [nome1.trim(), nome2.trim()]);
        if (!jogadores || jogadores.length !== 2) return res.status(404).json({ error: "Jogadores não encontrados!" });

        const j1 = jogadores.find(j => j.nome.toLowerCase() === nome1.trim().toLowerCase());
        const j2 = jogadores.find(j => j.nome.toLowerCase() === nome2.trim().toLowerCase());

        if (String(j1.pin) !== String(pin1) || String(j2.pin) !== String(pin2)) return res.status(401).json({ error: "PIN incorreto!" });
        if (['espera', 'mesa'].includes(j1.status) || ['espera', 'mesa'].includes(j2.status)) return res.status(400).json({ error: "Alguém da dupla já está na fila!" });

        await supabase.from('jogadores').update({ status: 'espera', preferencia: preferencia || 'qualquer', created_at: new Date().toISOString(), dupla_id: crypto.randomUUID() }).in('id', [j1.id, j2.id]);
        await alocarMesas();
        res.json({ message: "Dupla inserida com sucesso!" });
    } catch (err) { res.status(500).json({ error: "Erro interno no servidor" }); }
});

app.delete('/fila/:id', pinLimiter, async (req, res) => {
    const senhaDigitada = req.headers['x-admin-key']; 
    try {
        if (senhaDigitada !== SENHA_ADMIN) {
            const { data: jogador } = await supabase.from('jogadores').select('pin').eq('id', req.params.id).single();
            if (!jogador || String(jogador.pin) !== String(senhaDigitada)) return res.status(401).json({ error: "PIN incorreto!" });
        }
        await supabase.from('jogadores').update({ status: 'ausente', mesa_atual: null }).eq('id', req.params.id);
        await alocarMesas();
        res.json({ message: "OK" });
    } catch (err) { res.status(500).json({ error: "Erro interno." }); }
});

app.patch('/fila/:id/congelar', pinLimiter, async (req, res) => {
    const authKey = req.headers['x-admin-key'];
    try {
        const { data: jogador } = await supabase.from('jogadores').select('status, pin').eq('id', req.params.id).single();
        if (!jogador) return res.status(404).json({ error: "Jogador não encontrado!" });
        if (String(authKey) !== SENHA_ADMIN && String(authKey) !== String(jogador.pin)) return res.status(401).json({ error: "PIN incorreto!" });
        if (jogador.status === 'mesa') return res.status(400).json({ error: "O jogador já está na mesa!" });

        const novoStatus = jogador.status === 'congelado' ? 'espera' : 'congelado';
        await supabase.from('jogadores').update({ status: novoStatus }).eq('id', req.params.id);
        
        res.json({ message: `Status alterado para ${novoStatus}!` });
    } catch (err) { res.status(500).json({ error: "Erro interno." }); }
});

app.post('/formar-dupla', pinLimiter, async (req, res) => {
    const { jogador1_id, jogador2_id, pin1, pin2 } = req.body;
    try {
        const { data: jogadores } = await supabase.from('jogadores').select('*').in('id', [jogador1_id, jogador2_id]);
        if (!jogadores || jogadores.length !== 2) return res.status(400).json({ error: "Jogadores não encontrados." });

        const j1 = jogadores.find(j => j.id === jogador1_id);
        const j2 = jogadores.find(j => j.id === jogador2_id);

        if (String(j1.pin) !== String(pin1) || String(j2.pin) !== String(pin2)) return res.status(401).json({ error: "PIN incorreto!" });
        if (j1.status !== 'espera' || j2.status !== 'espera') return res.status(400).json({ error: "Ambos precisam estar na Fila." });
        if (j1.dupla_id || j2.dupla_id) return res.status(400).json({ error: "Um de vocês já está em uma dupla!" });

        await supabase.from('jogadores').update({ dupla_id: crypto.randomUUID() }).in('id', [jogador1_id, jogador2_id]);
        res.json({ message: "Dupla formada!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/desfazer-dupla', pinLimiter, async (req, res) => {
    const { jogador_id, pin } = req.body;
    try {
        const { data: jogador } = await supabase.from('jogadores').select('*').eq('id', jogador_id).single();
        if (!jogador || (String(jogador.pin) !== String(pin) && String(pin) !== SENHA_ADMIN)) return res.status(401).json({ error: "PIN incorreto!" });
        if (!jogador.dupla_id) return res.status(400).json({ error: "Não está em nenhuma dupla." });

        await supabase.from('jogadores').update({ dupla_id: null }).eq('dupla_id', jogador.dupla_id);
        res.json({ message: "Dupla desfeita." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});




/// 🔥 ROTA DE VITÓRIA DEFINITIVA E BLINDADA
let travaVitoria = Promise.resolve();
app.post('/vitoria', (req, res) => {
    travaVitoria = travaVitoria.then(async () => {
        const { vencedores, mesaId, quemFicaId, filaReal } = req.body;
        try {
            const { data: mesa } = await supabase.from('jogadores').select('*').eq('status', 'mesa').eq('mesa_atual', mesaId);
            if (!mesa || mesa.length === 0) {
                return res.status(400).json({ error: "Nenhum jogador encontrado nesta mesa." });
            }

            let idsSair = [];
            const countFila = Number(filaReal) || 0;

            if (countFila >= 2) {
                idsSair = mesa.filter(j => !vencedores.includes(j.id)).map(j => j.id);
            } else if (countFila === 1) {
                idsSair = mesa.filter(j => !vencedores.includes(j.id) && j.id !== quemFicaId).map(j => j.id);
            } else {
                idsSair = [];
            }

            const duplasNaMesa = [...new Set(mesa.map(j => j.dupla_id).filter(id => id !== null))];
            for (const d_id of duplasNaMesa) {
                const parceiros = mesa.filter(j => j.dupla_id === d_id);
                if (parceiros.length === 2 && (idsSair.includes(parceiros[0].id) !== idsSair.includes(parceiros[1].id))) {
                    await supabase.from('jogadores').update({ dupla_id: null }).eq('dupla_id', d_id);
                }
            }

            const perdedores = mesa.filter(j => !vencedores.includes(j.id)).map(j => j.id);
            const baseTime = new Date();
            let atrasoFilaMs = 0;
            
            try {
                await supabase.from('historico_partidas').insert([{
                    id: crypto.randomUUID(), mesa_id: mesaId,
                    vencedor1_id: vencedores[0] || null, vencedor2_id: vencedores[1] || null,
                    perdedor1_id: perdedores[0] || null, perdedor2_id: perdedores[1] || null, 
                    data_partida: baseTime.toISOString()
                }]);
            } catch(e) {}

            for (const jogador of mesa) {
                const vaiSair = idsSair.includes(jogador.id);
                const isVencedor = vencedores.includes(jogador.id); 
                const minutosNaMesa = Math.floor((baseTime.getTime() - new Date(jogador.created_at).getTime()) / 60000);

                let updateData = {
                    ultimo_jogo_at: baseTime.toISOString(),
                    partidas_hoje: (jogador.partidas_hoje || 0) + 1,
                    partidas_jogadas: (jogador.partidas_jogadas || 0) + 1, 
                    partidas_semana: (jogador.partidas_semana || 0) + 1, 
                    vitorias: isVencedor ? (jogador.vitorias || 0) + 1 : (jogador.vitorias || 0), 
                    vitorias_semana: isVencedor ? (jogador.vitorias_semana || 0) + 1 : (jogador.vitorias_semana || 0),
                    tempo_sentado: (jogador.tempo_sentado || 0) + (minutosNaMesa > 0 ? minutosNaMesa : 15) 
                };

                if (vaiSair) {
                    updateData.status = 'espera'; // 🚨 CORRIGIDO PARA 'espera' PARA NÃO SUMIR!
                    updateData.mesa_atual = null;
                    updateData.created_at = new Date(baseTime.getTime() + atrasoFilaMs).toISOString(); 
                    atrasoFilaMs += 1000; 
                } else { 
                    updateData.created_at = baseTime.toISOString(); 
                }

                await supabase.from('jogadores').update(updateData).eq('id', jogador.id);
            }
            
            // 🚨 ESCUDO CONTRA O ERRO 500: Impede que a tela trave!
            try { await alocarMesas(); } catch (e) { console.error(e); }
            try { await supabase.from('apostas_ao_vivo').delete().eq('mesa_id', mesaId); } catch (e) {}

            res.json({ message: "Mesa processada com sucesso!" });
        } catch (err) { 
            console.error("Erro interno na rota de vitoria:", err);
            res.status(500).json({ error: "Erro interno ao processar a vitória." }); 
        }
    }).catch(err => { 
        res.status(500).json({ error: "Erro crítico na fila de execução." }); 
    });
});
app.get('/estatisticas-gerais', async (req, res) => {
    try {
        const { data: jogadores } = await supabase.from('jogadores').select('id, nome, partidas_jogadas');
        const mapNomes = {}; let maisPartidas = { valor: 0, dono: "Ninguém" };
        jogadores.forEach(j => {
            mapNomes[j.id] = j.nome;
            if ((j.partidas_jogadas || 0) > maisPartidas.valor) { maisPartidas = { valor: j.partidas_jogadas, dono: j.nome }; }
        });

        const { data: historico } = await supabase.from('historico_partidas').select('vencedor1_id, vencedor2_id, perdedor1_id, perdedor2_id').order('data_partida', { ascending: true });
        let duplaCounts = {}; let streaks = {};

        historico.forEach(p => {
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

// ==========================================
// 🏆 ROTAS: RANKING E DETALHES
// ==========================================

app.get('/ranking', async (req, res) => {
    try {
        const { data } = await supabase.from('jogadores').select('id, nome, vitorias, vitorias_semana, partidas_jogadas, partidas_semana, avatar_url, tempo_sentado, tempo_espera').gt('vitorias', 0); 
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/estatisticas-detalhadas/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID não fornecido" });

    try {
        const { data: partidas } = await supabase.from('historico_partidas').select('*')
            .or(`vencedor1_id.eq.${id},vencedor2_id.eq.${id},perdedor1_id.eq.${id},perdedor2_id.eq.${id}`).order('data_partida', { ascending: true });

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
            maiorStreakV, maiorStreakD, mesaFavorita: acharMaior(mesas).id || "1",
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
    const { data: jogador } = await supabase.from('jogadores').select('id, pin').ilike('nome', nome).single();
    if (!jogador || String(jogador.pin) !== String(pin)) return res.status(401).json({ error: 'Acesso não autorizado.' });

    try {
        const { error } = await supabase.from('top10_listas').upsert({
            dono_id: jogador.id, lista_ids: listaIds, atualizado_em: new Date()
        }, { onConflict: 'dono_id' });
        if (error) throw error;
        res.json({ message: 'Top 10 guardado com sucesso!' });
    } catch (err) { res.status(500).json({ error: 'Erro ao guardar o Top 10.' }); }
});

app.get('/ver-top10/:id', async (req, res) => {
    try {
        const { data: top10 } = await supabase.from('top10_listas').select('lista_ids').eq('dono_id', req.params.id).single();
        if (!top10 || !top10.lista_ids) return res.json([]);

        const { data: jogadores } = await supabase.from('jogadores').select('id, nome, avatar_url, vitorias').in('id', top10.lista_ids);
        const listaOrdenada = top10.lista_ids.map(id => jogadores.find(j => j.id === id)).filter(Boolean);
        res.json(listaOrdenada);
    } catch (err) { res.status(500).json({ error: 'Erro Top 10.' }); }
});

app.get('/top10-global', async (req, res) => {
    try {
        const { data: listas } = await supabase.from('top10_listas').select('lista_ids');
        let contagemVotos = {};
        if (listas) {
            listas.forEach(l => {
                l.lista_ids.forEach((idJogador, index) => {
                    if (!contagemVotos[idJogador]) contagemVotos[idJogador] = 0;
                    contagemVotos[idJogador] += (10 - index); 
                });
            });
        }
        const idsMaisVotados = Object.keys(contagemVotos).sort((a, b) => contagemVotos[b] - contagemVotos[a]).slice(0, 10);
        if (idsMaisVotados.length === 0) return res.json([]);

        const { data: jogadores } = await supabase.from('jogadores').select('id, nome, avatar_url').in('id', idsMaisVotados);
        const top10Final = idsMaisVotados.map((id, index) => {
            const j = jogadores.find(j => String(j.id) === String(id));
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
    await supabase.from('apostas_ao_vivo').insert([{ mesa_id: mesaId, apostador_nome: apostadorNome, dupla_escolhida: duplaEscolhida }]);
    res.json({ sucesso: true, mensagem: 'Aposta cravada com sucesso!' });
  } catch (error) { res.status(500).json({ erro: 'Erro apostas.' }); }
});

app.get('/apostas', async (req, res) => {
  try {
    const { data } = await supabase.from('apostas_ao_vivo').select('mesa_id, dupla_escolhida');
    res.json(data);
  } catch (error) { res.status(500).json({ erro: 'Erro apostas.' }); }
});

app.post('/atualizar-foto', pinLimiter, async (req, res) => {
    const { nome, pin, foto } = req.body;
    if (!nome || !pin || !foto) return res.status(400).json({ error: "Faltam dados!" });

    try {
        const { data: jogador } = await supabase.from('jogadores').select('*').ilike('nome', nome.trim()).single();
        if (!jogador || String(jogador.pin) !== String(pin)) return res.status(401).json({ error: "Senha incorreta!" });

        await supabase.from('jogadores').update({ avatar_url: foto }).eq('id', jogador.id);
        res.json({ message: "Foto atualizada!" });
    } catch (err) { res.status(500).json({ error: "Erro foto." }); }
});

app.post('/salvar-inscricao-push', async (req, res) => {
    const { jogadorId, subscription } = req.body;
    try {
        await supabase.from('jogadores').update({ push_sub: subscription }).eq('id', jogadorId);
        res.status(200).json({ message: "Celular conectado via Navegador!" });
    } catch (err) { res.status(500).json({ error: "Erro push." }); }
});

app.post('/salvar-token-push', async (req, res) => {
    const { id, token } = req.body;
    try {
        await supabase.from('jogadores').update({ push_token: token }).eq('id', id);
        res.status(200).json({ message: "Celular conectado ao Firebase!" });
    } catch (err) { res.status(500).json({ error: "Erro ao salvar token de push." }); }
});

app.post('/sac/denuncia', async (req, res) => {
    const { mensagem } = req.body;
    if (!mensagem || mensagem.trim() === '') return res.status(400).json({ error: "Vazio não rola." });
    try {
        await supabase.from('denuncias_sac').insert([{ mensagem: mensagem }]);
        res.json({ message: "Mensagem enviada! O sigilo é absoluto." });
    } catch (err) { res.status(500).json({ error: "Erro SAC." }); }
});

app.get('/historico-recente', async (req, res) => {
    try {
        const { data } = await supabase.from('historico_partidas').select('*').order('data_partida', { ascending: false }).limit(5); 
        res.json(data);
    } catch (err) { res.status(500).json({ error: "Erro histórico" }); }
}); 

app.post('/atualizar-perfil', async (req, res) => {
    const { id, nome, pin, foto } = req.body;

    if (!id || !nome || !pin) {
        return res.status(400).json({ error: "Dados incompletos para atualizar perfil." });
    }

    try {
        const { error } = await supabase
            .from('jogadores')
            .update({ 
                nome: nome, 
                avatar_url: foto 
            })
            .eq('id', id)
            .eq('pin', pin); 

        if (error) {
            throw new Error(error.message);
        }

        res.json({ message: "Perfil atualizado com sucesso no banco de dados!" });

    } catch (err) {
        res.status(500).json({ error: "Erro interno ao atualizar perfil." });
    }
});

app.get('/configuracoes', async (req, res) => {
    try {
        const { data } = await supabase.from('configuracoes_app').select('*').eq('id', 1).single();
        res.json(data || {});
    } catch (err) { res.status(500).json({ error: "Erro ao buscar as configurações." }); }
});

app.post('/admin/configuracoes', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== SENHA_ADMIN) return res.status(401).json({ error: "Acesso Master negado!" });

    const { top1_nome, top1_frase, top1_foto, top1_spotify, dica_nome, dica_foto, dica_titulo, dica_texto } = req.body;
    
    try {
        await supabase.from('configuracoes_app').update({
            top1_nome, top1_frase, top1_foto, top1_spotify, dica_nome, dica_foto, dica_titulo, dica_texto
        }).eq('id', 1);
        
        res.json({ message: "Aplicativo atualizado para todos os jogadores!" });
    } catch (err) { res.status(500).json({ error: "Erro ao salvar as configurações." }); }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});