import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default function BotaoSAC() {
  
  const enviarMensagemAnonima = async () => {
    if (!supabase) {
      toast.error("Erro de configuração com o banco de dados.");
      return;
    }
    
    // Mantemos o prompt pois é uma entrada de dados nativa e segura para textos, okayyy
    const msg = window.prompt("Digite sua sugestão, denúncia ou dúvida de forma 100% anônima para a Organização:");
    if (!msg || !msg.trim()) return;

    // Cria o aviso de carregamento enquanto o Supabase processa
    const toastId = toast.loading("Enviando sua mensagem...");

    try {
      const { error } = await supabase.from('denuncias_sac').insert([{
        id: crypto.randomUUID(),
        mensagem: msg.trim(),
        data_envio: new Date().toISOString()
      }]);

      if (error) throw error;
      
      // Atualiza o aviso de carregamento para Sucesso
      toast.success("Mensagem anônima enviada à moderação!", { id: toastId });
    } catch (err) {
      console.error(err);
      // Atualiza o aviso de carregamento para Erro
      toast.error("Erro ao enviar. Tente novamente.", { id: toastId });
    }
  };

  return (
    <motion.button 
      onClick={enviarMensagemAnonima}
      whileHover={{ scale: 1.05, backgroundColor: '#F1F5F9' }} 
      whileTap={{ scale: 0.95 }} 
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        backgroundColor: '#FFFFFF',
        color: '#0F172A', 
        border: '1px solid #E2E8F0', 
        padding: '12px 24px',
        borderRadius: '12px',
        fontSize: '0.8rem',
        fontWeight: '700',
        cursor: 'pointer',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
      }}
    >
      <span style={{ fontSize: '1.1rem', fontWeight: '400' }}>✉</span>
      SUPORTE ANÔNIMO
    </motion.button>
  );
}