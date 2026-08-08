import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Trophy, User, Info } from 'lucide-react';
import { motion } from 'framer-motion'; 

const MotionLink = motion(Link);

export default function MenuInferior() {
  const location = useLocation();

  const getStyle = (caminho) => {
    const ativo = location.pathname === caminho;
    return {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      color: ativo ? '#991B1B' : '#94A3B8',
      textDecoration: 'none',
      transition: 'color 0.2s ease-in-out',
      cursor: 'pointer'
    };
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      // --- A MÁGICA DO GLASSMORPHISM (VIDRO FOSCO) ---
      backgroundColor: 'rgba(255, 255, 255, 0.85)', // Branco com 85% de opacidade
      backdropFilter: 'blur(20px)',                 // Desfoque de fundo (Android/Chrome)
      WebkitBackdropFilter: 'blur(20px)',           // Desfoque de fundo (iPhone/Safari)
      borderTop: '1px solid rgba(229, 231, 235, 0.6)', // Borda superior semi-transparente
      boxShadow: '0 -10px 40px rgba(0,0,0,0.03)',   // Sombra difusa e elegante
      // -----------------------------------------------
      paddingBottom: 'env(safe-area-inset-bottom)', // Respeita a barra do iPhone
      paddingTop: '8px',
      zIndex: 9999,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '60px',
        maxWidth: '500px', // Travado em 500px para alinhar perfeitamente com a moldura do App.jsx
        margin: '0 auto'
      }}>
        
        <MotionLink to="/" style={getStyle('/')} whileTap={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Users size={24} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
          <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px' }}>Fila</span>
        </MotionLink>

        <MotionLink to="/ranking" style={getStyle('/ranking')} whileTap={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Trophy size={24} strokeWidth={location.pathname === '/ranking' ? 2.5 : 2} />
          <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px' }}>Ranking</span>
        </MotionLink>

        <MotionLink to="/ajuda" style={getStyle('/ajuda')} whileTap={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Info size={24} strokeWidth={location.pathname === '/ajuda' ? 2.5 : 2} />
          <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px' }}>Ajuda</span>
        </MotionLink>

        <MotionLink to="/perfil" style={getStyle('/perfil')} whileTap={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <User size={24} strokeWidth={location.pathname === '/perfil' ? 2.5 : 2} />
          <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px' }}>Perfil</span>
        </MotionLink>

      </div>
    </div>
  );
}