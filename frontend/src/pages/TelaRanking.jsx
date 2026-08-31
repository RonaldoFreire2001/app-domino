import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Ranking from '../Ranking';

const API_URL = 'https://app-domino.onrender.com';

const AvatarJogador = ({ url, nome, tamanho = '46px', posicao }) => {
  const [erro, setErro] = useState(false);
  const inicial = nome ? String(nome).charAt(0).toUpperCase() : '';
  const hash = [...String(nome || 'A')].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const corFundo = `hsl(${hash % 360}, 30%, 40%)`; 
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '65px', flexShrink: 0 }}>
      <div style={{ position: 'relative' }}>
        <div style={{ width: tamanho, height: tamanho, borderRadius: '50%', overflow: 'hidden', backgroundColor: corFundo, display: 'flex', justifyContent: 'center', alignItems: 'center', border: posicao === 1 ? '2px solid #991B1B' : '1px solid #E2E8F0' }}>
          {url && !erro && String(url).length > 10 ? (
            <img src={url} alt={nome} onError={() => setErro(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color: '#FFF', fontWeight: '600', fontSize: '1rem' }}>{inicial}</span>
          )}
        </div>
        {posicao && (
          <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: posicao === 1 ? '#991B1B' : '#0F172A', color: '#FFF', border: '2px solid #FFF', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '700' }}>
            {posicao}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center' }}>
        <span style={{ color: '#334155', fontSize: '0.75rem', fontWeight: '600', display: 'block', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65px' }}>
          {nome}
        </span>
      </div>
    </div>
  );
};

const AvatarSeguro = ({ url, nome, tamanho = '35px', corBorda = '#E2E8F0' }) => {
    const [erro, setErro] = useState(false);
    const inicial = nome ? String(nome).charAt(0).toUpperCase() : 'U';
    const hash = [...String(nome || 'A')].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const corFundo = `hsl(${hash % 360}, 30%, 40%)`; 

    if (url && !erro && String(url).length > 10) {
        return <img src={url} alt={nome} onError={() => setErro(true)} style={{ width: tamanho, height: tamanho, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${corBorda}`, flexShrink: 0, backgroundColor: '#F8FAFC' }} />;
    }
    return <div style={{ width: tamanho, height: tamanho, borderRadius: '50%', backgroundColor: corFundo, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 'bold', border: `2px solid ${corBorda}`, flexShrink: 0, fontSize: '0.9rem' }}>{inicial}</div>;
};

// ==========================================
// NOVO COMPONENTE: MELHORES DE SÁBADO
// ==========================================
const RankingSabado = ({ API_URL }) => {
  const [ranking, setRanking] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/ranking-sabado`)
      .then(res => setRanking(res.data))
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [API_URL]);

  if (carregando || ranking.length === 0) return null; 

  return (
    <div style={{ marginBottom: '35px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Ícone Premium em SVG substituindo o emoji */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#991B1B"/>
          </svg>
          <h3 style={{ margin: 0, color: '#0F172A', fontSize: '0.95rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Melhores de Sábado
          </h3>
        </div>
        <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: '700', letterSpacing: '0.5px', background: '#F1F5F9', padding: '5px 10px', borderRadius: '6px' }}>
          ÚLTIMO FIM DE SEMANA
        </span>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '5px 15px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        {ranking.slice(0, 5).map((jog, idx) => {
          const isTop1 = idx === 0;
          const isTop3 = idx < 3;
          let corPosicao = '#64748B';
          
          if (idx === 0) corPosicao = '#991B1B'; 
          else if (idx === 1) corPosicao = '#475569';
          else if (idx === 2) corPosicao = '#B45309';

          return (
            <div key={jog.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '12px 10px', 
              borderBottom: idx === 4 || idx === ranking.length - 1 ? 'none' : '1px solid #F8FAFC',
              background: isTop1 ? 'linear-gradient(90deg, rgba(153, 27, 27, 0.04) 0%, rgba(255,255,255,0) 80%)' : 'transparent',
              borderRadius: isTop1 ? '8px' : '0',
              marginTop: isTop1 ? '5px' : '0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ width: '22px', textAlign: 'center', color: corPosicao, fontWeight: '800', fontSize: isTop3 ? '1.05rem' : '0.9rem' }}>
                  {idx + 1}º
                </span>
                <AvatarSeguro url={jog.foto} nome={jog.nome} tamanho={isTop1 ? '40px' : '34px'} />
                <span style={{ color: isTop1 ? '#991B1B' : '#1E293B', fontWeight: isTop1 ? '800' : '600', fontSize: '0.95rem', textTransform: 'capitalize' }}>
                  {jog.nome}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                 <span style={{ color: isTop1 ? '#991B1B' : '#334155', fontWeight: '800', fontSize: isTop1 ? '1.1rem' : '1rem' }}>
                   {jog.pontos} <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: '700', marginLeft: '3px' }}>PTS</span>
                 </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
// ==========================================

export default function TelaRanking() {
  const [top10Global, setTop10Global] = useState([]);
  const [estatisticasGerais, setEstatisticasGerais] = useState(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [top20Historico, setTop20Historico] = useState([]);

  useEffect(() => {
    const carregarTudo = async () => {
      try {
        const resTop10 = await axios.get(`${API_URL}/top10-global`);
        setTop10Global(resTop10.data);

        const resEstat = await axios.get(`${API_URL}/estatisticas-gerais`).catch(() => null);
        if (resEstat && resEstat.data) setEstatisticasGerais(resEstat.data);

        const urlDoArquivo = import.meta.env.VITE_URL_HISTORICO;
        const resHistorico = await axios.get(urlDoArquivo);
        
        const dadosHistorico = Array.isArray(resHistorico.data[0]) 
          ? resHistorico.data[0] 
          : resHistorico.data;
          
        setTop20Historico(dadosHistorico);
      } catch (err) {
        console.error("Erro ao carregar os dados:", err);
      }
    };
    carregarTudo();
  }, []);

  
  return (
    <div style={{ backgroundColor: '#F9FAFB', minHeight: '100vh', padding: '30px 20px 90px 20px', fontFamily: 'Inter, sans-serif' }}>
      
      <header style={{ marginBottom: '35px' }}>
        <h2 style={{ color: '#0F172A', margin: '0 0 5px 0', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Visão Geral</h2>
        <p style={{ color: '#64748B', margin: 0, fontSize: '0.85rem' }}>Estatísticas e classificações do PAF1</p>
      </header>

      {top10Global.length > 0 && (
        <div style={{ marginBottom: '35px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#0F172A', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Mais Respeitados</h3>
            <span style={{ fontSize: '0.7rem', color: '#991B1B', fontWeight: '700' }}>TOP 10</span>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px 15px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', gap: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            {top10Global.map((jogador) => (
              <div key={jogador.id} style={{ flexShrink: 0 }}>
                <AvatarJogador url={jogador.avatar_url} nome={jogador.nome} posicao={jogador.posicao} />
                <div style={{ textAlign: 'center', marginTop: '6px' }}><span style={{ color: '#991B1B', fontSize: '0.65rem', fontWeight: '800' }}>{jogador.votos} pts</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '35px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#0F172A', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Estatísticas Gerais</h3>
        {!estatisticasGerais ? (
           <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '16px', border: '1px solid #E5E7EB', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>As estatísticas da temporada estão sendo contabilizadas...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <span style={{ color: '#64748B', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.5px' }}>MAIOR SEQUÊNCIA</span>
              <span style={{ color: '#0F172A', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.5px' }}>{estatisticasGerais.maiorSequencia?.valor} Vits</span>
              <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600' }}>{estatisticasGerais.maiorSequencia?.dono}</span>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <span style={{ color: '#64748B', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.5px' }}>DUPLA IMBATÍVEL</span>
              <span style={{ color: '#0F172A', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.5px' }}>{estatisticasGerais.duplaImbativel?.valor} Vits</span>
              <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600' }}>{estatisticasGerais.duplaImbativel?.dono}</span>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <span style={{ color: '#64748B', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.5px' }}>MAIS PARTIDAS</span>
              <span style={{ color: '#0F172A', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.5px' }}>{estatisticasGerais.maisPartidas?.valor} Jogos</span>
              <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600' }}>{estatisticasGerais.maisPartidas?.dono}</span>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <span style={{ color: '#64748B', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.5px' }}>MAIOR JEJUM</span>
              <span style={{ color: '#991B1B', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.5px' }}>{estatisticasGerais.maiorJejum?.valor} Derrotas</span>
              <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '600' }}>{estatisticasGerais.maiorJejum?.dono}</span>
            </div>
          </div>
        )}
      </div>

      {/* A TAÇA DE SÁBADO APARECE AQUI, LOGO ANTES DO RANKING PRINCIPAL */}
      <RankingSabado API_URL={API_URL} />

      <h3 style={{ margin: '0 0 15px 0', color: '#0F172A', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Classificação</h3>
      <Ranking />

      <div style={{ marginTop: '40px' }}>
        <button 
          onClick={() => setMostrarHistorico(!mostrarHistorico)}
          style={{ width: '100%', padding: '16px', borderRadius: '12px', background: mostrarHistorico ? '#0F172A' : '#FFFFFF', color: mostrarHistorico ? '#FFFFFF' : '#0F172A', border: '1px solid #E5E7EB', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', transition: 'all 0.3s ease' }}
        >
          <span>🏆 Top 20 - Semestre 2026.1</span>
          <span>{mostrarHistorico ? '▲' : '▼'}</span>
        </button>

        {mostrarHistorico && (
          <div style={{ backgroundColor: '#FFFFFF', padding: '15px 0', borderRadius: '12px', border: '1px solid #E5E7EB', marginTop: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            {top20Historico.length === 0 ? (
               <p style={{ fontSize: '0.8rem', color: '#64748B', textAlign: 'center', padding: '20px' }}>Carregando histórico...</p>
            ) : (
               <>
                 <div style={{ display: 'flex', padding: '0 15px 10px 15px', fontSize: '0.65rem', color: '#64748B', fontWeight: '700', borderBottom: '1px solid #E2E8F0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <span style={{ width: '40px', textAlign: 'center' }}>POS</span>
                    <span style={{ flex: 1, textAlign: 'left', paddingLeft: '5px' }}>JOGADOR</span>
                    <span style={{ width: '45px', textAlign: 'center' }}>PTS</span>
                    <span style={{ width: '40px', textAlign: 'center' }}>J</span>
                    <span style={{ width: '40px', textAlign: 'center' }}>V</span>
                    <span style={{ width: '50px', textAlign: 'right' }}>% WR</span>
                 </div>
                 {top20Historico.map((jogador, index) => {
                    const posCampeonato = index + 1;
                    const vits = jogador.vitorias || 0;
                    const jogos = jogador.partidas_jogadas || 0;
                    const wr = jogos > 0 ? ((vits / jogos) * 100).toFixed(0) : 0;
                    const pontos = jogador.pts;
                    
                    const isTop3 = posCampeonato <= 3;
                    let corIndicador = 'transparent'; let nomeCor = '#0F172A'; let bgLinha = 'transparent';
                    
                    if (posCampeonato === 1) { corIndicador = '#991B1B'; bgLinha = 'rgba(153, 27, 27, 0.05)'; } 
                    else if (posCampeonato === 2) { corIndicador = '#475569'; bgLinha = 'rgba(15, 23, 42, 0.02)'; } 
                    else if (posCampeonato === 3) { corIndicador = '#B45309'; bgLinha = 'rgba(180, 83, 9, 0.03)'; } 
                    else if (posCampeonato >= 17 && posCampeonato <= 20) { corIndicador = '#EF4444'; bgLinha = 'rgba(239, 68, 68, 0.04)'; nomeCor = '#991B1B'; }

                    return (
                        <div key={jogador.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: index < 19 ? '1px solid #E2E8F0' : 'none', background: bgLinha }}>
                          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderLeft: `3px solid ${corIndicador}` }}>
                            <span style={{ width: '42px', textAlign: 'center', fontWeight: '800', color: isTop3 ? corIndicador : '#64748B', fontSize: isTop3 ? '1rem' : '0.85rem' }}>{posCampeonato}º</span>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', paddingLeft: '5px' }}>
                              <div style={{ position: 'relative' }}>
                                <AvatarSeguro url={jogador.avatar_url} nome={jogador.nome} tamanho={isTop3 ? '38px' : '32px'} />
                              </div>
                              <span style={{ fontWeight: isTop3 ? '700' : '600', color: nomeCor, textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>{jogador.nome}</span>
                            </div>
                            <div style={{ width: '45px', textAlign: 'center', fontWeight: 'bold', color: '#991B1B', fontSize: '0.9rem' }}>{pontos}</div>
                            <div style={{ width: '40px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem', fontWeight: '600' }}>{jogos}</div>
                            <div style={{ width: '40px', textAlign: 'center', color: '#0F172A', fontWeight: 'bold', fontSize: '0.85rem' }}>{vits}</div>
                            <div style={{ width: '50px', textAlign: 'right', paddingRight: '10px', fontWeight: 'bold', fontSize: '0.85rem', color: Number(wr) > 50 ? '#10B981' : (Number(wr) === 50 ? '#D97706' : '#EF4444') }}>{wr}%</div>
                          </div>
                        </div>
                    );
                 })}
               </>
            )}
          </div>
        )}
      </div>

    </div>
  );
}