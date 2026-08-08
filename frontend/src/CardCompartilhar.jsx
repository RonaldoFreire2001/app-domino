import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Share2, Download, Flame, Crosshair, Users, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function CardCompartilhar({ 
  jogador, 
  posicaoRanking,
  streak = 0,
  fregues = null,
  melhorParceiro = null 
}) {
  const cardRef = useRef(null);
  const [gerando, setGerando] = useState(false);

  const compartilharCard = async () => {
    if (!cardRef.current) return;
    setGerando(true);
    const toastId = toast.loading("Gerando card oficial...");

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, 
        useCORS: true,
        backgroundColor: '#FFFFFF', 
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Erro ao gerar imagem.");
          setGerando(false);
          return;
        }

        const file = new File([blob], `paf1-status-${jogador.nome}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'Dominó do PAF1',
              text: 'Se liga no meu status oficial na temporada do PAF1!',
              files: [file],
            });
            toast.success("Pronto para o Story!", { id: toastId });
          } catch (e) { toast.dismiss(toastId); }
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `paf1-status-${jogador.nome}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("Card salvo na galeria!", { id: toastId });
        }
        setGerando(false);
      }, 'image/png');

    } catch (error) {
      toast.error("Falha ao processar o card.", { id: toastId });
      setGerando(false);
    }
  };

  const taxaVitoria = jogador.partidas_jogadas > 0 
    ? ((jogador.vitorias / jogador.partidas_jogadas) * 100).toFixed(0) 
    : 0;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <motion.button 
        whileTap={{ scale: 0.95 }}
        onClick={compartilharCard}
        disabled={gerando}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '14px 28px', borderRadius: '12px',
          backgroundColor: '#991B1B', 
          color: '#FFFFFF', 
          border: 'none', fontWeight: '800', fontSize: '0.85rem',
          cursor: gerando ? 'wait' : 'pointer',
          boxShadow: '0 4px 15px rgba(153, 27, 27, 0.3)',
          justifyContent: 'center', textTransform: 'uppercase', letterSpacing: '0.5px',
          width: '100%', maxWidth: '300px'
        }}
      >
        {navigator.canShare ? <Share2 size={16} /> : <Download size={16} />}
        {gerando ? 'CRIANDO CARD...' : 'COMPARTILHAR MEU STATUS'}
      </motion.button>

      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
        
        <div 
          ref={cardRef} 
          style={{
            width: '400px', minHeight: '720px', height: 'auto',
            backgroundColor: '#FFFFFF', 
            padding: '40px 30px', boxSizing: 'border-box', position: 'relative',
            display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden',
            border: '2px solid #E2E8F0'
          }}
        >
          {/* Faixa superior */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: 'linear-gradient(90deg, #991B1B, #EF4444)' }}></div>

          <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px', width: '100%' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', backgroundColor: '#FEF2F2', padding: '6px 16px', borderRadius: '20px', border: '1px solid #FECACA' }}>
              <Trophy size={14} color="#991B1B" />
              <span style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', color: '#991B1B' }}>
                STATUS OFICIAL
              </span>
            </div>

            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <div style={{ width: '140px', height: '140px', borderRadius: '50%', padding: '4px', backgroundColor: '#FFFFFF', border: '2px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                <img src={jogador.avatar_url || `https://ui-avatars.com/api/?name=${jogador.nome}&background=random`} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} crossOrigin="anonymous" />
              </div>
            </div>

            <h1 style={{ margin: '10px 0 2px 0', fontSize: '2.2rem', fontWeight: '900', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '-1px' }}>{jogador.nome}</h1>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.8rem', letterSpacing: '2px', fontWeight: '700' }}>TEMPORADA 2026.2</p>
          </div>

          <div style={{ zIndex: 1, width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: '900', color: '#0F172A', letterSpacing: '-1px' }}>#{posicaoRanking}</span>
              <span style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Na Tabela</span>
            </div>
            <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: '900', color: '#10B981', letterSpacing: '-1px' }}>{taxaVitoria}%</span>
              <span style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Win Rate</span>
            </div>
          </div>

          <div style={{ zIndex: 1, width: '100%', display: 'flex', justifyContent: 'space-between', background: '#F8FAFC', padding: '15px 30px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0F172A' }}>{jogador.vitorias || 0}</span>
              <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Vitórias</span>
            </div>
            <div style={{ width: '2px', backgroundColor: '#E2E8F0' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0F172A' }}>{jogador.partidas_jogadas || 0}</span>
              <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Partidas</span>
            </div>
          </div>

          <div style={{ zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {streak >= 3 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', backgroundColor: '#FEF2F2', padding: '12px', borderRadius: '12px', border: '1px solid #FECACA' }}>
                <Flame size={18} color="#DC2626" />
                <span style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Maior sequência invicta: {streak} partidas</span>
              </div>
            )}
            {fregues && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#FFFFFF', padding: '12px 15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <Crosshair size={20} color="#0F172A" />
                <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.6rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Maior Vítima</span><span style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: '900', textTransform: 'uppercase' }}>{fregues}</span></div>
              </div>
            )}
            {melhorParceiro && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#FFFFFF', padding: '12px 15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <Users size={20} color="#10B981" />
                <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.6rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Dupla Letal</span><span style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: '900', textTransform: 'uppercase' }}>{melhorParceiro}</span></div>
              </div>
            )}
          </div>

          <div style={{ zIndex: 1, marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', borderTop: '1px solid #E2E8F0', width: '100%', paddingTop: '15px' }}>
            <span style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: '900', letterSpacing: '3px' }}>DOMINÓ DO PAF1 • UFBA</span>
            <span style={{ fontSize: '0.6rem', color: '#94A3B8', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>app-domino.vercel.app</span>
          </div>
        </div>
      </div>
    </div>
  );
}