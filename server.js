require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- ROBÔ: ORGANIZA A MESA AUTOMATICAMENTE ---
async function preencherMesaSeVazia(numeroMesa) {
    const nomeMesa = `Mesa ${numeroMesa}`;

    const { count } = await supabase
        .from('fila')
        .select('*', { count: 'exact', head: true })
        .eq('mesa_atual', numeroMesa);

    if (count > 0) return; 

    // Busca os 4 primeiros da FILA
    const { data: candidatos } = await supabase
        .from('fila')
        .select('*')
        .eq('mesa_atual', 0) // Só quem está visível na fila
        .or(`mesa_preferida.eq.${nomeMesa},mesa_preferida.eq.Qualquer`)
        
        // --- PRIORIDADE UFBA ---
        // 1º: Quem NUNCA jogou HOJE
        .order('ja_jogou_hoje', { ascending: true }) 
        // 2º: Quem jogou há mais tempo (Veteranos)
        .order('ultima_partida_em', { ascending: true, nullsFirst: true }) 
        // 3º: Ordem de chegada
        .order('created_at', { ascending: true }) 
        .limit(4);

    if (candidatos && candidatos.length === 4) {
        const ids = candidatos.map(c => c.id);
        await supabase
            .from('fila')
            .update({ mesa_atual: numeroMesa })
            .in('id', ids);
        console.log(`🤖 AUTO: ${nomeMesa} preenchida!`);
    }
}

// ROTA 1: LOGIN COM TRAVA DE SEGURANÇA 🛡️
app.post('/fila', async (req, res) => {
    let { nome, preferencia } = req.body;
    const nomeLimpo = nome.trim().toUpperCase();

    // 1. Busca se já existe cadastro
    const { data: usuarioExistente } = await supabase
        .from('fila')
        .select('*')
        .eq('nome', nomeLimpo)
        .maybeSingle();

    if (usuarioExistente) {
        // 🚨 TRAVA DE SEGURANÇA: O cara já está na loja?
        // Se mesa_atual for 0 (Fila), 1 (Mesa 1) ou 2 (Mesa 2), ele tá online!
        if (usuarioExistente.mesa_atual >= 0) {
            return res.status(400).json({ 
                error: `O usuário ${nomeLimpo} já está na fila ou jogando! Se for você, peça para removerem o antigo primeiro.` 
            });
        }

        // --- SE PASSOU DAQUI, É VETERANO VOLTANDO (ESTAVA FORA/OFFLINE) ---
        console.log(`👤 Usuário retornando: ${nomeLimpo}`);

        // Lógica de resetar o dia (Fuso BR)
        let resetarStatus = false;
        if (usuarioExistente.ultima_partida_em) {
            const opcoes = { timeZone: 'America/Sao_Paulo', year: 'numeric', month: 'numeric', day: 'numeric' };
            const dataUltimoJogo = new Date(usuarioExistente.ultima_partida_em).toLocaleDateString('pt-BR', opcoes);
            const dataHoje = new Date().toLocaleDateString('pt-BR', opcoes);
            
            if (dataUltimoJogo !== dataHoje) {
                resetarStatus = true;
            }
        }

        await supabase.from('fila').update({ 
            mesa_atual: 0,
            mesa_preferida: preferencia || 'Qualquer',
            created_at: new Date(), 
            ja_jogou_hoje: resetarStatus ? false : usuarioExistente.ja_jogou_hoje 
        }).eq('id', usuarioExistente.id);

    } else {
        // --- USUÁRIO NOVO ---
        await supabase.from('fila').insert([{ 
            nome: nomeLimpo,
            mesa_preferida: preferencia || 'Qualquer',
            mesa_atual: 0, 
            ja_jogou_hoje: false,
            ultima_partida_em: null
        }]);
    }

    await preencherMesaSeVazia(1);
    await preencherMesaSeVazia(2);

    res.json({ message: "Login realizado!" });
});

// ROTA 2: LISTAR (Apenas presentes)
app.get('/fila', async (req, res) => {
    const { data } = await supabase
        .from('fila')
        .select('*')
        .gte('mesa_atual', 0) 
        .order('mesa_atual', { ascending: false }) 
        .order('created_at', { ascending: true });
    res.json(data);
});

// ROTA 3: FINALIZAR MESA
app.post('/finalizar/:numeroMesa', async (req, res) => {
    const { numeroMesa } = req.params;
    const senha = req.headers['x-admin-key'];

    if (senha !== process.env.ADMIN_PASS) return res.status(403).json({ erro: "Senha errada" });

    const { data: jogadores } = await supabase
        .from('fila')
        .select('id')
        .eq('mesa_atual', numeroMesa);
    
    const ids = jogadores.map(j => j.id);

    if (ids.length > 0) {
        // Volta pra fila, marca que jogou HOJE e salva a hora
        await supabase.from('fila').update({ 
            mesa_atual: 0, 
            ja_jogou_hoje: true,
            ultima_partida_em: new Date()
        }).in('id', ids);
    }

    await preencherMesaSeVazia(numeroMesa);
    res.json({ message: "Mesa finalizada!" });
});

// ROTA 4: REMOVER (Esconder e Chamar o Próximo)
app.delete('/fila/:id', async (req, res) => {
    const { id } = req.params;
    const senha = req.headers['x-admin-key'];
    if (senha !== process.env.ADMIN_PASS) return res.status(403).json({ erro: "Senha errada" });

    // 1. Descobre onde o cara tava antes de remover (pra saber qual mesa atualizar)
    const { data: jogador } = await supabase
        .from('fila')
        .select('mesa_atual')
        .eq('id', id)
        .single();

    // 2. Esconde o usuário (-1)
    await supabase.from('fila').update({ mesa_atual: -1 }).eq('id', id);

    // 3. Se ele estava numa mesa, chama o robô pra preencher o buraco!
    if (jogador && (jogador.mesa_atual === 1 || jogador.mesa_atual === 2)) {
        await preencherMesaSeVazia(jogador.mesa_atual);
        console.log(`🤖 AUTO: Vaga aberta na Mesa ${jogador.mesa_atual}. Buscando substituto...`);
    }

    res.json({ message: "Jogador removido e fila atualizada!" });


    // ROTA 5: ATUALIZAR PREFERÊNCIA (Sem perder o lugar na fila)
app.patch('/fila/:id', async (req, res) => {
    const { id } = req.params;
    const { novaPreferencia } = req.body;
    const senha = req.headers['x-admin-key'];

    if (senha !== process.env.ADMIN_PASS) return res.status(403).json({ erro: "Senha errada" });

    // Atualiza só a preferência, mantendo created_at e ultima_partida_em intactos
    await supabase.from('fila').update({ mesa_preferida: novaPreferencia }).eq('id', id);
    
    // Tenta reencaixar o cara imediatamente
    await preencherMesaSeVazia(1);
    await preencherMesaSeVazia(2);

    res.json({ message: "Preferência atualizada!" });
});
});
app.listen(3000, () => console.log("🔥 Servidor PAF1: Modo Eterno Ativado!"));