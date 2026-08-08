import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; 
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar'; 
import { Capacitor } from '@capacitor/core';
import MenuInferior from './MenuInferior';

import TelaFila from './pages/TelaFila';
import TelaRanking from './pages/TelaRanking';
import TelaPerfil from './pages/TelaPerfil';
import TelaAjuda from './pages/TelaAjuda';

export default function App() {
  
  useEffect(() => {
    const configurarBarrasNativas = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setBackgroundColor({ color: '#F9FAFB' });
          await StatusBar.setStyle({ style: Style.Light });
          
          await NavigationBar.setColor({ color: '#FFFFFF', darkButtons: true });
        } catch (error) {
          console.error("Aviso: Falha ao pintar as barras nativas", error);
        }
      }
    };

    configurarBarrasNativas();
  }, []);

  return (
    <BrowserRouter>
      {/* MOLDURA GLOBAL: Fica cinza no PC e centraliza o App */}
      <div style={{ 
        backgroundColor: '#E2E8F0', 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center' 
      }}> 
        
        {/* TELA DO APLICATIVO: Rolagem livre, mas travada em 500px de largura */}
        <div style={{ 
          backgroundColor: '#F9FAFB', 
          width: '100%', 
          maxWidth: '500px', 
          minHeight: '100vh', 
          position: 'relative', 
          boxShadow: '0 0 40px rgba(0,0,0,0.1)', 
          paddingBottom: '90px' // Espaço garantido pro Menu Inferior não tampar conteúdo
        }}>
          
          {/* INJETOR DE NOTIFICAÇÕES - AGORA BLINDADO COM Z-INDEX MÁXIMO */}
          <Toaster 
            position="top-center"
            containerStyle={{
              zIndex: 2147483647,
            }}
            toastOptions={{
              duration: 3000,
              style: {
                background: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #E2E8F0',
                boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '0.9rem',
                padding: '12px 20px',
              },
              success: { iconTheme: { primary: '#991B1B', secondary: '#FFFFFF' } },
              error: { iconTheme: { primary: '#0F172A', secondary: '#FFFFFF' } },
            }}
          />

          {/* ROTAS DAS TELAS */}
          <Routes>
            <Route path="/" element={<TelaFila />} />
            <Route path="/ranking" element={<TelaRanking />} />
            <Route path="/ajuda" element={<TelaAjuda />} />
            <Route path="/perfil" element={<TelaPerfil />} />
          </Routes>
          
          {/* MENU INFERIOR FIXO: A 500px */}
          <div style={{ 
            position: 'fixed', 
            bottom: 0, 
            width: '100%', 
            maxWidth: '500px', 
            zIndex: 9999 
          }}>
            <MenuInferior />
          </div>

        </div>
      </div>
    </BrowserRouter>
  );
}