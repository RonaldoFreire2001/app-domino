import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BotaoSAC from '../BotaoSAC';

const API_URL = 'https://app-domino.onrender.com';

const AvatarSeguro = ({ url, nome, tamanho = '45px' }) => {
    const [erro, setErro] = useState(false);
    const inicial = nome ? String(nome).charAt(0).toUpperCase() : 'U';
    const hash = [...String(nome || 'A')].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const corFundo = `hsl(${hash % 360}, 30%, 40%)`;

    if (url && !erro && String(url).length > 10) {
        return <img src={url} alt={nome} onError={() => setErro(true)} style={{ width: tamanho, height: tamanho, borderRadius: '50%', objectFit: 'cover', border: '2px solid #991B1B', flexShrink: 0, backgroundColor: '#F8FAFC' }} />;
    }
    return <div style={{ width: tamanho, height: tamanho, borderRadius: '50%', backgroundColor: corFundo, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 'bold', border: '2px solid #E2E8F0', flexShrink: 0, fontSize: '1rem' }}>{inicial}</div>;
};

const CardAjuda = ({ titulo, children }) => {
  const [aberto, setAberto] = useState(false);

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB', overflow: 'hidden', transition: 'all 0.3s ease' }}>
      <div onClick={() => setAberto(!aberto)} style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: aberto ? '#F8FAFC' : '#FFFFFF' }}>
        <h3 style={{ margin: 0, color: aberto ? '#991B1B' : '#0F172A', fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.5px' }}>{titulo}</h3>
        <span style={{ color: aberto ? '#991B1B' : '#64748B', fontSize: '1.2rem', fontWeight: '600', transition: 'transform 0.3s ease', transform: aberto ? 'rotate(45deg)' : 'rotate(0deg)', display: 'inline-block' }}>+</span>
      </div>
      <div style={{ maxHeight: aberto ? '1000px' : '0', opacity: aberto ? '1' : '0', overflow: 'hidden', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', backgroundColor: '#FFFFFF' }}>
        <div style={{ padding: '20px 20px 22px 20px', color: '#334155', fontSize: '0.85rem', lineHeight: '1.6', textAlign: 'left' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default function TelaAjuda() {
  const [dicaAberta, setDicaAberta] = useState(false);
  const [configApp, setConfigApp] = useState(null);
  const [listaAdms, setListaAdms] = useState([]);

  useEffect(() => {
    // Busca as dicas do banco
    axios.get(`${API_URL}/configuracoes`)
      .then(res => setConfigApp(res.data))
      .catch(e => console.error(e));

    const buscarAdms = async () => {
      try {
        const nomesAdmsEnv = import.meta.env.VITE_ADMIN_USERS ? import.meta.env.VITE_ADMIN_USERS.split(',').map(n => n.trim().toLowerCase()) : [];
        if (nomesAdmsEnv.length === 0) return;

        // Pedimos os dados para a API no Render (que tem passe livre), driblando o bloqueio do Supabase
        const resCadastrados = await axios.get(`${API_URL}/jogadores-cadastrados`);
        const resFila = await axios.get(`${API_URL}/fila`);

        const todosJogadores = resCadastrados.data || [];
        const fila = resFila.data || [];

        const admsFiltrados = todosJogadores
          .filter(j => j.nome && nomesAdmsEnv.includes(j.nome.toLowerCase()))
          .map(adm => {
            const admNaFila = fila.find(f => f.id === adm.id);
            // Se o ADM estiver na fila, pega o status. Se não, está offline.
            return admNaFila 
              ? { ...adm, status: admNaFila.status, mesa_atual: admNaFila.mesa_atual } 
              : { ...adm, status: 'offline' };
          });

        setListaAdms(admsFiltrados);
      } catch (error) {
        console.error("Erro ao buscar ADMs na API", error);
      }
    };

    // A CHAVE QUE FALTAVA: Executar a função
    buscarAdms();
  }, []);

  return (
    <div style={{ backgroundColor: '#F9FAFB', minHeight: '100vh', padding: '40px 20px 100px 20px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
      <header style={{ textAlign: 'center', marginBottom: '35px' }}>
        <h2 style={{ color: '#0F172A', fontSize: '1.5rem', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>CENTRAL DE AJUDA</h2>
        <p style={{ color: '#64748B', margin: 0, fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suporte e Regulamento Oficial</p>
      </header>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* EVENTO SEMANAL */}
        {configApp && (
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '20px', marginBottom: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AvatarSeguro url={configApp.dica_foto} nome={configApp.dica_nome} tamanho="48px" />
                <div>
                  <span style={{ display: 'block', color: '#991B1B', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Dica de Respeito da Semana</span>
                  <span style={{ display: 'block', color: '#0F172A', fontSize: '1rem', fontWeight: '800' }}>{configApp.dica_nome}</span>
                </div>
              </div>
            </div>

            <h4 style={{ color: '#0F172A', margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: '700' }}>{configApp.dica_titulo}</h4>

            <div style={{ maxHeight: dicaAberta ? '2000px' : '60px', overflow: 'hidden', position: 'relative', transition: 'max-height 0.5s ease', color: '#334155', fontSize: '0.85rem', lineHeight: '1.7' }}>
              <p style={{ marginTop: 0, whiteSpace: 'pre-line' }}>{configApp.dica_texto}</p>
              {!dicaAberta && <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40px', background: 'linear-gradient(transparent, #FFFFFF)' }}></div>}
            </div>

            <button onClick={() => setDicaAberta(!dicaAberta)} style={{ marginTop: '10px', background: 'transparent', border: 'none', color: '#991B1B', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', padding: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {dicaAberta ? 'Recolher Dica ▲' : 'Ler Completo ▼'}
            </button>
          </div>
        )}

      {/* EQUIPE DE ADMINISTRAÇÃO */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ color: '#0F172A', fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#991B1B' }}>|</span> EQUIPE DE ADMS
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.5' }}>
            Precisando de ajuda, resolver alguma treta ou alterar algo no sistema? Procure um de nossos administradores oficiais abaixo.
          </p>
         
          {listaAdms.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {listaAdms.map(adm => {
                let corStatus = '#94A3B8'; 
                let textoStatus = 'Offline';
                let animacaoPiscar = 'none';

                if (adm.status === 'mesa') {
                  corStatus = '#EF4444'; 
                  textoStatus = `Na Mesa ${adm.mesa_atual}`;
                  animacaoPiscar = 'pulse 2s infinite';
                } else if (adm.status === 'espera' || adm.status === 'congelado') {
                  corStatus = '#10B981'; 
                  textoStatus = 'Disponível';
                }

                return (
                  <div key={adm.id} style={{ backgroundColor: '#FFFFFF', padding: '20px 15px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                    <AvatarSeguro url={adm.avatar_url} nome={adm.nome} tamanho="55px" />
                    <span style={{ fontWeight: '800', color: '#0F172A', fontSize: '0.95rem', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '12px', textTransform: 'capitalize' }}>
                      {adm.nome}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', backgroundColor: '#F8FAFC', padding: '6px 12px', borderRadius: '20px', border: '1px solid #F1F5F9' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: corStatus, animation: animacaoPiscar, boxShadow: `0 0 6px ${corStatus}` }}></div>
                      <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {textoStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px dashed #CBD5E1', textAlign: 'center' }}>
              <span style={{ color: '#94A3B8', fontSize: '0.85rem', fontWeight: '600' }}>Nenhum administrador encontrado ou online no momento.</span>
            </div>
          )}
          
          <style>
            {`
              @keyframes pulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.4; transform: scale(1.3); }
                100% { opacity: 1; transform: scale(1); }
              }
            `}
          </style>
        </div>

        {/* REGULAMENTO OFICIAL (O ORIGINAL E INTACTO) */}
        <h3 style={{ color: '#0F172A', fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#991B1B' }}>|</span> REGULAMENTO OFICIAL
        </h3>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <CardAjuda titulo="1. PRIORIDADE E DURAÇÃO">
            <p style={{ marginTop: 0 }}><strong style={{ color: '#0F172A' }}>Fila de Espera:</strong><br/>Têm prioridade absoluta: jogadores disputando a sua primeira partida do dia e aqueles que estão há mais de 1 hora sem jogar.</p>
            <p style={{ margin: 0 }}><strong style={{ color: '#0F172A' }}>Duração da Partida:</strong><br/>O padrão é disputar "na peça" (melhor de 5). Se houver duas ou mais duplas aguardando, a mesa vira melhor de 3 automaticamente para a fila andar.</p>
          </CardAjuda>
          <CardAjuda titulo="2. MECÂNICA DE JOGO">
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li style={{ marginBottom: '8px' }}>A 1ª rodada do jogo sempre começa com a Bucha de Ás.</li>
              <li style={{ marginBottom: '8px' }}>Nas partidas empatadas no limite de pontos (3x3 ou 1x1), a rodada desempate também inicia com Bucha de Ás.</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#0F172A' }}>Jogo Fechado:</strong> Conta-se os pontos na mão. O jogador com a menor quantidade vence a rodada para sua dupla.</li>
              <li><strong style={{ color: '#0F172A' }}>Empate nos Pontos:</strong> A próxima rodada inicia obrigatoriamente com Bucha de Sena, sem dobrar a pontuação.</li>
            </ul>
          </CardAjuda>
          <CardAjuda titulo="3. FALTAS GRAVES (DERROTA DIRETA)">
            <p style={{ marginTop: 0, color: '#991B1B', fontWeight: '700' }}>As seguintes ações resultam na perda imediata de 1 peça:</p>
            <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong style={{ color: '#0F172A' }}>Buchada:</strong> Bater o jogo finalizando com uma bucha.</li>
              <li><strong style={{ color: '#0F172A' }}>Lasque:</strong> Bater o jogo tendo peças válidas para finalizar em ambas as pontas do tabuleiro.</li>
              <li><strong style={{ color: '#0F172A' }}>Passar com pedra:</strong> Pular a vez possuindo uma peça válida para jogar.</li>
              <li><strong style={{ color: '#0F172A' }}>Colar gato:</strong> Encaixar uma peça errada no tabuleiro.</li>
              <li><strong style={{ color: '#0F172A' }}>A Regra do "Choro":</strong> Trancar o jogo de propósito e perder na contagem de pontos resulta em Derrota Automática.</li>
            </ol>
          </CardAjuda>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <p style={{ margin: '0 0 25px 0', color: '#64748B', fontSize: '0.85rem', fontStyle: 'italic', fontWeight: '600' }}>"A resenha é livre, o respeito é obrigatório."</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}><BotaoSAC /></div>
      </div>
    </div>
  );
}