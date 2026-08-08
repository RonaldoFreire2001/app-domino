import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = "https://app-domino.onrender.com";

const AvatarSeguro = ({ url, nome, tamanho = '35px', corBorda = '#E2E8F0' }) => {
    const [erro, setErro] = useState(false);
    const inicial = nome ? String(nome).charAt(0).toUpperCase() : 'U';
    const hash = [...String(nome || 'A')].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const corFundo = `hsl(${hash % 360}, 30%, 40%)`; 

    if (url && !erro && String(url).length > 10) {
        return <img src={url} alt={nome} onError={() => setErro(true)} style={{ width: tamanho, height: tamanho, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${corBorda}`, flexShrink: 0, backgroundColor: '#F8FAFC' }} />;
    }
    return <div style={{ width: tamanho, height: tamanho, borderRadius: '50%', backgroundColor: corFundo, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 'bold', border: `2px solid ${corBorda}`, flexShrink: 0, fontSize: tamanho === '45px' ? '1.2rem' : '0.9rem' }}>{inicial}</div>;
};

export default function Ranking() {
  const [podio, setPodio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abaAtual, setAbaAtual] = useState('semana'); 

  const top20Anterior = useRef([]);
  const [alertas, setAlertas] = useState([]);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 20;

  const carregarDados = async () => {
    try {
      setLoading(true);
      const resRanking = await axios.get(`${API_URL}/ranking?t=${new Date().getTime()}`);
      setPodio(Array.isArray(resRanking.data) ? resRanking.data : (resRanking.data?.data || []));
    } catch (error) {
      setPodio([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  useEffect(() => {
    const listaSegura = Array.isArray(podio) ? podio : [];
    if (listaSegura.length === 0) return;

    const rankingBrasileirao = [...listaSegura].sort((a, b) => {
      const derrotasA = (a.partidas_jogadas || 0) - (a.vitorias || 0);
      const derrotasB = (b.partidas_jogadas || 0) - (b.vitorias || 0);
      const ptsA = ((a.vitorias || 0) * 3) - derrotasA;
      const ptsB = ((b.vitorias || 0) * 3) - derrotasB;
      if (ptsB !== ptsA) return ptsB - ptsA; 
      return (a.partidas_jogadas || 0) - (b.partidas_jogadas || 0);
    }).filter(j => j.vitorias > 0);

    const top20Atual = rankingBrasileirao.slice(0, 20).map(j => j.nome);

    if (top20Anterior.current.length > 0) {
      const promovidos = top20Atual.filter(nome => !top20Anterior.current.includes(nome));
      const rebaixados = top20Anterior.current.filter(nome => !top20Atual.includes(nome));

      const novasNotificacoes = [];
      promovidos.forEach(nome => novasNotificacoes.push({ tipo: 'subiu', msg: `${nome} subiu para a Série A` }));
      rebaixados.forEach(nome => novasNotificacoes.push({ tipo: 'caiu', msg: `${nome} caiu para a Série B` }));

      if (novasNotificacoes.length > 0) {
        setAlertas(novasNotificacoes);
        setTimeout(() => setAlertas([]), 8000); 
      }
    }
    top20Anterior.current = top20Atual;
  }, [podio]);

  const listaParaOrdenar = Array.isArray(podio) ? podio : [];
  
  const rankingCompleto = [...listaParaOrdenar].sort((a, b) => {
    if (abaAtual === 'semestre') {
      const derrotasA = Math.max(0, (a.partidas_jogadas || 0) - (a.vitorias || 0));
      const derrotasB = Math.max(0, (b.partidas_jogadas || 0) - (b.vitorias || 0));
      const ptsA = ((a.vitorias || 0) * 3) - derrotasA;
      const ptsB = ((b.vitorias || 0) * 3) - derrotasB;
      if (ptsB !== ptsA) return ptsB - ptsA; 
      return (a.partidas_jogadas || 0) - (b.partidas_jogadas || 0); 
    } else {
      const derrotasA = Math.max(0, (a.partidas_semana || 0) - (a.vitorias_semana || 0));
      const derrotasB = Math.max(0, (b.partidas_semana || 0) - (b.vitorias_semana || 0));
      const ptsA = ((a.vitorias_semana || 0) * 3) - derrotasA;
      const ptsB = ((b.vitorias_semana || 0) * 3) - derrotasB;
      if (ptsB !== ptsA) return ptsB - ptsA; 
      return (a.partidas_semana || 0) - (b.partidas_semana || 0); 
    }
  }).filter(j => {
    return abaAtual === 'semana' ? (j.partidas_semana || 0) > 0 : (j.partidas_jogadas || 0) > 0;
  });

  const rankingComPosicao = rankingCompleto.map((jogador, index) => ({ ...jogador, posCampeonato: index + 1 }));
  const totalPaginas = Math.ceil(rankingComPosicao.length / itensPorPagina) || 1;
  
  useEffect(() => { if (paginaAtual > totalPaginas) setPaginaAtual(totalPaginas); }, [totalPaginas, paginaAtual]);

  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const rankingPaginado = rankingComPosicao.slice(indiceInicial, indiceInicial + itensPorPagina);

  const trocarAba = (aba) => { setAbaAtual(aba); setPaginaAtual(1); };

  if (loading && listaParaOrdenar.length === 0) return <div style={{color: '#991B1B', textAlign: 'center', padding: '40px', fontWeight: 'bold', fontSize: '0.85rem'}}>Sincronizando dados da tabela...</div>;

  const abaStyle = (aba) => ({
    flex: 1, padding: '12px 8px', borderRadius: '8px', border: 'none', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: '0.2s', letterSpacing: '0.5px',
    backgroundColor: abaAtual === aba ? '#FFFFFF' : 'transparent',
    color: abaAtual === aba ? '#0F172A' : '#64748B',
    boxShadow: abaAtual === aba ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
  });

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '15px 0', fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
        <button 
          onClick={carregarDados} 
          disabled={loading}
          style={{ 
            backgroundColor: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0', padding: '8px 18px', borderRadius: '20px', 
            fontSize: '0.75rem', fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer', transition: '0.3s', opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Sincronizando...' : 'Atualizar Tabela'}
        </button>
      </div>

      {alertas.length > 0 && (
        <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 15px' }}>
          {alertas.map((alerta, index) => (
            <div key={index} style={{ padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: alerta.tipo === 'subiu' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: alerta.tipo === 'subiu' ? '#10B981' : '#EF4444', border: `1px solid ${alerta.tipo === 'subiu' ? '#10B981' : '#EF4444'}` }}>
              {alerta.msg}
            </div>
          ))}
        </div>
      )}

      {/* ABA DE GERAL ATUALIZADA PARA 2016.2 */}
      <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '10px', padding: '4px', margin: '0 15px 20px 15px', border: '1px solid #E2E8F0' }}>
        <button onClick={() => trocarAba('semana')} style={abaStyle('semana')}>SEMANA</button>
        <button onClick={() => trocarAba('semestre')} style={abaStyle('semestre')}>SEMESTRAL (2026.2)</button>
      </div>

      <div style={{ display: 'flex', padding: '0 15px 10px 15px', fontSize: '0.65rem', color: '#64748B', fontWeight: '700', borderBottom: '1px solid #E2E8F0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        <span style={{ width: '40px', textAlign: 'center' }}>POS</span>
        <span style={{ flex: 1, textAlign: 'left', paddingLeft: '5px' }}>JOGADOR</span>
        <span style={{ width: '45px', textAlign: 'center' }}>PTS</span>
        <span style={{ width: '40px', textAlign: 'center' }}>J</span>
        <span style={{ width: '40px', textAlign: 'center' }}>V</span>
        <span style={{ width: '50px', textAlign: 'right' }}>% WR</span>
      </div>

      {rankingCompleto.length === 0 ? (
        <div style={{color: '#64748B', textAlign: 'center', padding: '40px', fontSize: '0.85rem'}}>Ainda sem pontuações na tabela.</div>
      ) : (
        <>
          {rankingPaginado.map((jogador) => {
            const posCampeonato = jogador.posCampeonato; 
            const vits = abaAtual === 'semana' ? (jogador.vitorias_semana || 0) : (jogador.vitorias || 0);
            const jogos = abaAtual === 'semana' ? (jogador.partidas_semana || 0) : (jogador.partidas_jogadas || 0);
            const wr = jogos > 0 ? ((vits / jogos) * 100).toFixed(0) : 0;
            const derrotas = Math.max(0, jogos - vits);
            const pontos = (vits * 3) - derrotas;

            const isTop3 = posCampeonato <= 3;
            const isBrasileirao = abaAtual === 'semestre';
            
            let corIndicador = 'transparent'; let nomeCor = '#0F172A'; let bgLinha = 'transparent';

            if (isBrasileirao) {
              if (posCampeonato === 1) { corIndicador = '#991B1B'; bgLinha = 'rgba(153, 27, 27, 0.05)'; } 
              else if (posCampeonato === 2) { corIndicador = '#475569'; bgLinha = 'rgba(15, 23, 42, 0.02)'; } 
              else if (posCampeonato === 3) { corIndicador = '#B45309'; bgLinha = 'rgba(180, 83, 9, 0.03)'; } 
              else if (posCampeonato >= 17 && posCampeonato <= 20) { corIndicador = '#EF4444'; bgLinha = 'rgba(239, 68, 68, 0.04)'; nomeCor = '#991B1B'; } 
              else if (posCampeonato >= 21 && posCampeonato <= 36) { corIndicador = '#F97316'; bgLinha = 'rgba(249, 115, 22, 0.02)'; } 
              else if (posCampeonato >= 37 && posCampeonato <= 40) { corIndicador = '#DC2626'; bgLinha = 'rgba(220, 38, 38, 0.06)'; nomeCor = '#991B1B'; } 
            } else {
              if (posCampeonato === 1) corIndicador = '#991B1B';
              else if (posCampeonato === 2) corIndicador = '#475569';
              else if (posCampeonato === 3) corIndicador = '#B45309';
              if (isTop3) bgLinha = 'rgba(15, 23, 42, 0.02)';
            }

            return (
              <React.Fragment key={jogador.id}>
                {isBrasileirao && posCampeonato === 17 && (
                  <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', textAlign: 'center', fontSize: '0.7rem', fontWeight: '700', padding: '10px', borderTop: '1px solid #FCA5A5', borderBottom: '1px solid #FCA5A5', letterSpacing: '1px', marginTop: '5px', marginBottom: '5px' }}>Z-4 SÉRIE A</div>
                )}
                {isBrasileirao && posCampeonato === 21 && (
                  <div style={{ backgroundColor: '#FFF7ED', color: '#C2410C', textAlign: 'center', fontSize: '0.7rem', fontWeight: '700', padding: '10px', borderTop: '1px solid #FDBA74', borderBottom: '1px solid #FDBA74', letterSpacing: '1px', marginTop: '5px', marginBottom: '5px' }}>SÉRIE B</div>
                )}
                {isBrasileirao && posCampeonato === 37 && (
                  <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', textAlign: 'center', fontSize: '0.7rem', fontWeight: '700', padding: '10px', borderTop: '1px solid #FCA5A5', borderBottom: '1px solid #FCA5A5', letterSpacing: '1px', marginTop: '5px', marginBottom: '5px' }}>Z-4 SÉRIE B</div>
                )}
                {isBrasileirao && posCampeonato === 41 && (
                  <div style={{ backgroundColor: '#F1F5F9', color: '#475569', textAlign: 'center', fontSize: '0.7rem', fontWeight: '700', padding: '10px', borderTop: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1', letterSpacing: '1px', marginTop: '5px', marginBottom: '5px' }}>SÉRIE C</div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #E2E8F0', background: bgLinha }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderLeft: `3px solid ${corIndicador}` }}>
                    <span style={{ width: '42px', textAlign: 'center', fontWeight: '800', color: isTop3 ? corIndicador : '#64748B', fontSize: isTop3 ? '1rem' : '0.85rem' }}>{posCampeonato}º</span>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', paddingLeft: '5px' }}>
                      <div style={{ position: 'relative' }}>
                        <AvatarSeguro url={jogador.avatar_url} nome={jogador.nome} tamanho={isTop3 ? '38px' : '32px'} corBorda={corIndicador !== 'transparent' ? corIndicador : '#E2E8F0'} />
                      </div>
                      <span style={{ fontWeight: isTop3 ? '700' : '600', color: nomeCor, textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>{jogador.nome}</span>
                    </div>
                    <div style={{ width: '45px', textAlign: 'center', fontWeight: 'bold', color: '#991B1B', fontSize: '0.9rem' }}>{pontos}</div>
                    <div style={{ width: '40px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem', fontWeight: '600' }}>{jogos}</div>
                    <div style={{ width: '40px', textAlign: 'center', color: '#0F172A', fontWeight: 'bold', fontSize: '0.85rem' }}>{vits}</div>
                    <div style={{ width: '50px', textAlign: 'right', paddingRight: '10px', fontWeight: 'bold', fontSize: '0.85rem', color: Number(wr) > 50 ? '#10B981' : (Number(wr) === 50 ? '#D97706' : '#EF4444') }}>{wr}%</div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E5E7EB', borderRadius: '0 0 16px 16px', marginTop: '10px' }}>
            <button onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))} disabled={paginaAtual === 1} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: paginaAtual === 1 ? '#F1F5F9' : '#FFFFFF', color: paginaAtual === 1 ? '#94A3B8' : '#0F172A', fontSize: '0.75rem', fontWeight: '700', cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer', transition: '0.2s', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Anterior</button>
            <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1px' }}>PÁGINA {paginaAtual} DE {totalPaginas}</span>
            <button onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))} disabled={paginaAtual === totalPaginas} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: paginaAtual === totalPaginas ? '#F1F5F9' : '#FFFFFF', color: paginaAtual === totalPaginas ? '#94A3B8' : '#0F172A', fontSize: '0.75rem', fontWeight: '700', cursor: paginaAtual === totalPaginas ? 'not-allowed' : 'pointer', transition: '0.2s', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avançar</button>
          </div>
        </>
      )}
    </div>
  );
}