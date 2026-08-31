import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import toast from 'react-hot-toast';
import PullToRefresh from 'react-simple-pull-to-refresh';
import '../App.css';

const API_URL = 'https://app-domino.onrender.com';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// ==========================================
// COMPONENTE ONBOARDING DE REGRAS 
// ==========================================
const OnboardingRegras = () => {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const jaLeu = localStorage.getItem('onboardingRegrasLido');
    if (!jaLeu) {
      setAberto(true); 
    }
  }, []);

  const fecharModal = () => {
    localStorage.setItem('onboardingRegrasLido', 'true');
    setAberto(false);
  };

  if (!aberto) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)', 
      backdropFilter: 'blur(5px)', 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999, 
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: '#FEF2F2', padding: '8px', borderRadius: '50%', display: 'flex' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16V12" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8H12.01" stroke="#991B1B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 style={{ margin: 0, color: '#0F172A', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Novas Regras Oficiais
          </h3>
        </div>
        
        <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 20px 0' }}>
          Para melhorar a dinâmica no PAF, duas regras entraram em vigor:
        </p>

        <ul style={{ margin: '0 0 24px 0', paddingLeft: '18px', color: '#334155', fontSize: '0.85rem', lineHeight: '1.6' }}>
          <li style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#0F172A' }}>Horário Limite:</strong> O sistema fecha às <strong style={{ color: '#991B1B' }}>22h</strong>. Depois disso, só é registrada a vitória de quem já estava na mesa.
          </li>
          <li>
            <strong style={{ color: '#0F172A' }}>Elite de Sábado:</strong> Aos sábados, as partidas não valem para o semestre, mas formam um ranking exclusivo do fim de semana.
          </li>
        </ul>

        <button 
          onClick={fecharModal}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#991B1B',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(153, 27, 27, 0.25)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          Entendi, vamos jogar
        </button>
      </div>
    </div>
  );
};

// Assina as notificações (Push Nativo ou Push de Navegador)
const assinarNotificacoes = async (usuario) => {
  if (!usuario) return;

  if (Capacitor.isNativePlatform()) {
    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive === 'granted') {
        await PushNotifications.register();
        PushNotifications.addListener('registration', async (token) => {
          await axios.post(`${API_URL}/salvar-token-push`, { id: usuario.id, token: token.value });
        });
      }
    } catch (e) {}
  } 
  else if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registro = await navigator.serviceWorker.ready;
      const sub = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BOHGtXzWoRERIwsD_4K8YnWdJ6bJ8ZQ9Ua4K40zNRUQHJWnZI7csL7ZRHD_g2ycqLy5GvWBCtf9wEw6DUXxLymM"
      });
      await axios.post(`${API_URL}/salvar-inscricao-push`, { jogadorId: usuario.id, subscription: sub });
    } catch (e) {}
  }
};

const comprimirImagem = (file, maxTamanho, callback) => {
  if (!file.type.startsWith('image')) {
      const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => callback(reader.result); return;
  }
  const reader = new FileReader(); reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image(); img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement('canvas'); let width = img.width; let height = img.height;
      if (width > height) { if (width > maxTamanho) { height *= maxTamanho / width; width = maxTamanho; } }
      else { if (height > maxTamanho) { width *= maxTamanho / height; height = maxTamanho; } }
      canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height); callback(canvas.toDataURL('image/jpeg', 0.7));
    };
  };
};

const AvatarJogador = ({ url, nome, tamanho = '35px', destaque = false }) => {
  const [erro, setErro] = useState(false);
  const inicial = nome ? String(nome).charAt(0).toUpperCase() : '';
  const hash = [...String(nome || 'A')].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const corFundo = `hsl(${hash % 360}, 30%, 40%)`;
  return (
    <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <div style={{ width: tamanho, height: tamanho, borderRadius: '50%', overflow: 'hidden', backgroundColor: corFundo, display: 'flex', justifyContent: 'center', alignItems: 'center', border: destaque ? '2px solid #991B1B' : '1px solid #E5E7EB' }}>
        {url && !erro && String(url).length > 10 ? <img src={url} alt={nome} onError={() => setErro(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem' }}>{inicial}</span>}
      </div>
    </div>
  );
};

const DestaqueTop1 = ({ config }) => {
  if (!config || !config.top1_nome) return null;
  return (
    <div style={{ backgroundColor: '#FFFFFF', padding: '30px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', marginBottom: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
        <div style={{ textAlign: 'center', position: 'relative', flexShrink: 0 }}>
          <AvatarJogador url={config.top1_foto} nome={config.top1_nome} tamanho="85px" destaque={true} />
        </div>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ color: '#991B1B', margin: '0 0 6px 0', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: '800', letterSpacing: '1.5px' }}>Destaque da Semana</h4>
          <h3 style={{ margin: '0 0 8px 0', color: '#0F172A', fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.5px' }}>{config.top1_nome}</h3>
          <p style={{ color: '#64748B', margin: '0 0 15px 0', fontStyle: 'italic', fontSize: '0.85rem' }}>{config.top1_frase}</p>
        </div>
      </div>
      <div style={{ width: '100%' }}>
        <iframe style={{ borderRadius: '8px' }} src={config.top1_spotify} width="100%" height="80" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media" loading="lazy"></iframe>
      </div>
    </div>
  );
};

const BannerApp = () => {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setMostrar(true);
    }
  }, []);

  if (!mostrar) return null;

  const urlDoApk = import.meta.env.VITE_URL_APK || '#';

  return (
    <div style={{ backgroundColor: '#0F172A', color: '#FFFFFF', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>Dominó do PAF1</span>
        <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Instale o app oficial no seu Android</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <a href={urlDoApk} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', backgroundColor: '#991B1B', color: '#FFFFFF', padding: '6px 14px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700' }}>
          BAIXAR APP
        </a>
        <button onClick={() => setMostrar(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '1.1rem', cursor: 'pointer', padding: 0 }}>
          ×
        </button>
      </div>
    </div>
  );
};

export default function TelaFila() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [isNovo, setIsNovo] = useState(false);
  const [fila, setFila] = useState([]);
  const [nome, setNome] = useState('');
  const [fotoBase64, setFotoBase64] = useState(null);
  const [pin, setPin] = useState('');
  const [preferencia, setPreferencia] = useState('Qualquer');
  const [usuariosCadastrados, setUsuariosCadastrados] = useState([]);
  const [mostrarLista1, setMostrarLista1] = useState(false);
  const [modoEntrada, setModoEntrada] = useState('solo');
  const [nome2, setNome2] = useState('');
  const [pin2, setPin2] = useState('');
  const [mostrarLista2, setMostrarLista2] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [mesaVitoria, setMesaVitoria] = useState(null);
  const [vencedores, setVencedores] = useState([]);
  const [etapaVitoria, setEtapaVitoria] = useState(1);
  const [quemFicaId, setQuemFicaId] = useState(null);
  const [isGuardando, setIsGuardando] = useState(false);
  const [modoDeus, setModoDeus] = useState(false);
  const [senhaDeus, setSenhaDeus] = useState('');
  const [posicaoAdmin, setPosicaoAdmin] = useState({ x: 20, y: 500 });
  const [arrastando, setArrastando] = useState(false);
  const [relativo, setRelativo] = useState({ x: 0, y: 0 });
  const [historicoRecente, setHistoricoRecente] = useState([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [mostrarAoVivo, setMostrarAoVivo] = useState(false);
  const [modalSenha, setModalSenha] = useState({ aberto: false, titulo: '', callback: null });
  const [senhaModalInput, setSenhaModalInput] = useState('');
  const [mesasAtivas, setMesasAtivas] = useState({ 1: true, 2: true, 3: true });
  const [jogadorParaForcar, setJogadorParaForcar] = useState('');
  
  const [buscaForcar, setBuscaForcar] = useState('');
  const [modoEscuro, setModoEscuro] = useState(() => {
    return localStorage.getItem('@DominoPAF:tema') === 'escuro';
  });

  useEffect(() => {
    localStorage.setItem('@DominoPAF:tema', modoEscuro ? 'escuro' : 'claro');
    if (modoEscuro) {
      document.body.classList.add('tema-escuro');
    } else {
      document.body.classList.remove('tema-escuro');
    }
  }, [modoEscuro]);
  const [mostrarListaForcar, setMostrarListaForcar] = useState(false);
  const [configApp, setConfigApp] = useState(null);
  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const [formConfig, setFormConfig] = useState({ top1_nome: '', top1_frase: '', top1_foto: '', top1_spotify: '', dica_nome: '', dica_foto: '', dica_titulo: '', dica_texto: '' });

 
  const posicaoAnteriorRef = useRef(null);
  const usuarioRef = useRef(usuarioLogado);
  const [concordouTermos, setConcordaTermos] = useState(false);
  const [alertaPreparacao, setAlertaPreparacao] = useState(false);
  const [mostrarTutorial, setMostrarTutorial] = useState(false);
  const [passoTutorial, setPassoTutorial] = useState(0);
  

  useEffect(() => { usuarioRef.current = usuarioLogado; }, [usuarioLogado]);
  
  useEffect(() => {
    if (usuarioLogado && usuarioLogado.termos_aceitos) {
      const jaViuTutorial = localStorage.getItem(`@DominoPAF:tutorial_${usuarioLogado.id}`);
      if (!jaViuTutorial) {
        setMostrarTutorial(true);
      }
    }
  }, [usuarioLogado]);

  const listaAdmins = import.meta.env.VITE_ADMIN_USERS ? import.meta.env.VITE_ADMIN_USERS.split(',') : [];
  const adminsPresentes = (fila || []).filter(j => j.nome && listaAdmins.includes(j.nome.toLowerCase()));

  const vibrarLeve = async () => { try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (e) {} };
  const vibrarForte = async () => { try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) {} };

  useEffect(() => {
    const salvo = localStorage.getItem('@DominoPAF:user');
    if (salvo) {
      const user = JSON.parse(salvo);
      setUsuarioLogado(user);
      if (user.senhaMaster) { setModoDeus(true); setSenhaDeus(user.senhaMaster); }
      assinarNotificacoes(user);
    }
  }, []);

  const iniciarArrasto = (e) => {
    setArrastando(true);
    const clienteX = e.clientX || e.touches[0].clientX;
    const clienteY = e.clientY || e.touches[0].clientY;
    setRelativo({ x: clienteX - posicaoAdmin.x, y: clienteY - posicaoAdmin.y });
  };

  useEffect(() => {
    const moverSelo = (e) => {
      if (!arrastando) return;
      const clienteX = e.clientX ?? e.touches?.[0]?.clientX;
      const clienteY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clienteX && clienteY) setPosicaoAdmin({ x: clienteX - relativo.x, y: clienteY - relativo.y });
    };
    const pararArrasto = () => setArrastando(false);
    if (arrastando) { window.addEventListener('mousemove', moverSelo); window.addEventListener('mouseup', pararArrasto); window.addEventListener('touchmove', moverSelo, { passive: false }); window.addEventListener('touchend', pararArrasto); }
    return () => { window.removeEventListener('mousemove', moverSelo); window.removeEventListener('mouseup', pararArrasto); window.removeEventListener('touchmove', moverSelo); window.removeEventListener('touchend', pararArrasto); };
  }, [arrastando, relativo]);

  const carregarFilaETudo = async () => {
    try {
      vibrarLeve();
      const resFila = await axios.get(`${API_URL}/fila`);
      setFila(resFila.data);

      if (usuarioRef.current) {
        const filaEspera = resFila.data.filter(j => j.status === 'espera' || j.status === 'congelado');
        const meuIndex = filaEspera.findIndex(j => j.id === usuarioRef.current.id);
        
        if (meuIndex === 0 || meuIndex === 1) { 
            const posAnt = posicaoAnteriorRef.current;
            if (posAnt > 1 || posAnt === null) {
                setAlertaPreparacao(true);
                vibrarForte();
            }
        }
        posicaoAnteriorRef.current = meuIndex !== -1 ? meuIndex : null;
      }

      const resUsers = await axios.get(`${API_URL}/jogadores-cadastrados`);
      setUsuariosCadastrados(resUsers.data || []);
      const resHist = await axios.get(`${API_URL}/historico-recente?t=${new Date().getTime()}`);
      setHistoricoRecente(resHist.data || []);
      const resConfig = await axios.get(`${API_URL}/configuracoes`);
      setConfigApp(resConfig.data);
    } catch (e) {} 
    finally { setCarregandoDados(false); }
  };

  useEffect(() => {
    carregarFilaETudo();
    const intervalo = setInterval(() => { carregarFilaETudo(); }, 30000);
    return () => clearInterval(intervalo);
  }, []);

  const fecharModalSenha = () => setModalSenha({ aberto: false, titulo: '', callback: null });
  const confirmarModalSenha = () => { if (modalSenha.callback) modalSenha.callback(senhaModalInput); fecharModalSenha(); };

  const solicitarSenha = (titulo, callback) => {
    if (modoDeus && senhaDeus) { callback(senhaDeus); } 
    else { setSenhaModalInput(''); setModalSenha({ aberto: true, titulo, callback }); }
  };

  const concluirLogin = (userExists, senhaMaster = '') => {
    const userToSave = { 
        nome: userExists.nome, 
        pin: pin.trim(), 
        avatar_url: userExists.avatar_url, 
        id: userExists.id,
        termos_aceitos: userExists.termos_aceitos
    };
    if (senhaMaster) userToSave.senhaMaster = senhaMaster;
    
    setUsuarioLogado(userToSave); 
    localStorage.setItem('@DominoPAF:user', JSON.stringify(userToSave));
    setNome(''); setPin(''); 
    
    if (senhaMaster) { setSenhaDeus(senhaMaster); setModoDeus(true); vibrarForte(); toast.success("Acesso Premium Ativado."); }
    else { toast.success(`Bem-vindo(a) de volta, ${userExists.nome}!`); }
    
    assinarNotificacoes(userToSave);
  };
  
 const fazerLogin = async () => {
    vibrarLeve();
    if (!nome.trim() || !pin.trim()) return toast.error("Preencha todas as credenciais.");
    const userExists = usuariosCadastrados.find(u => u.nome.toLowerCase() === nome.toLowerCase().trim());
    if (!userExists) return toast.error("Registro não encontrado no sistema.");
    const toastId = toast.loading("Autenticando...");
    try {
      await axios.post(`${API_URL}/login`, { nome: nome.trim(), pin: pin.trim() });
      toast.dismiss(toastId); concluirLogin(userExists);
    } catch (error) { toast.dismiss(toastId); toast.error("PIN incorreto! Acesso negado."); }
  };

  const fazerCadastro = async () => {
    vibrarLeve();
    if (!nome.trim() || !pin.trim()) return toast.error("Preencha as credenciais.");
    try {
      const res = await axios.post(`${API_URL}/cadastrar`, { nome: nome.trim(), pin: pin.trim(), foto: fotoBase64 });
      const novoUser = { 
          nome: nome.trim(), 
          pin: pin.trim(), 
          avatar_url: res.data?.avatar_url, 
          id: res.data?.id,
          termos_aceitos: false 
      };
      setUsuarioLogado(novoUser); localStorage.setItem('@DominoPAF:user', JSON.stringify(novoUser));
      setNome(''); setPin(''); carregarFilaETudo(); setIsNovo(false); toast.success("Conta criada com sucesso!");
      
      assinarNotificacoes(novoUser);
    } catch (error) { toast.error(error.response?.data?.error || "Erro no registro."); }
  };

  const aceitarTermosOficiais = async () => {
    if (!concordouTermos) return toast.error("Você precisa marcar a caixa confirmando a leitura.");
    const toastId = toast.loading("Registrando aceite...");
    try {
        await axios.post(`${API_URL}/aceitar-termos`, { id: usuarioLogado.id, pin: usuarioLogado.pin });
        const updatedUser = { ...usuarioLogado, termos_aceitos: true };
        setUsuarioLogado(updatedUser);
        localStorage.setItem('@DominoPAF:user', JSON.stringify(updatedUser));
        toast.success("Termos aceitos! Bem-vindo.", { id: toastId });
    } catch (e) {
        toast.error("Erro ao aceitar termos.", { id: toastId });
    }
  };

  const trocarFotoExistente = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast.loading("Processando imagem...", { id: 'img-upload' });
    comprimirImagem(file, 200, async (fotoLeve) => {
      try {
        await axios.post(`${API_URL}/atualizar-foto`, { nome: usuarioLogado.nome, pin: usuarioLogado.pin, foto: fotoLeve });
        const userAtualizado = { ...usuarioLogado, avatar_url: fotoLeve };
        setUsuarioLogado(userAtualizado); localStorage.setItem('@DominoPAF:user', JSON.stringify(userAtualizado));
        carregarFilaETudo(); toast.success("Foto atualizada!", { id: 'img-upload' });
      } catch (error) { toast.error("Erro de processamento de imagem.", { id: 'img-upload' }); }
    });
  };

  const entrarNaFila = async () => {
    vibrarLeve();
    try {
      await axios.post(`${API_URL}/entrar-fila`, { nome: usuarioLogado.nome, pin: usuarioLogado.pin, preferencia });
      await carregarFilaETudo(); toast.success("Você entrou na fila!");
    } catch (error) {
      if (error.response?.status === 401) { toast.error("Credenciais inválidas."); setUsuarioLogado(null); localStorage.removeItem('@DominoPAF:user'); } 
      else { toast.error(error.response?.data?.error || "Você já está na fila ou em uma partida."); await carregarFilaETudo(); }
    }
  };

  const entrarNaFilaDupla = async () => {
    vibrarLeve();
    if (!nome2.trim() || !pin2.trim()) return toast.error("Preencha os dados do parceiro.");
    try {
      await axios.post(`${API_URL}/entrar-fila-dupla`, { nome1: usuarioLogado.nome, pin1: usuarioLogado.pin, nome2: nome2.trim(), pin2: pin2.trim(), preferencia });
      setNome2(''); setPin2(''); carregarFilaETudo(); toast.success("Dupla inserida na fila!");
    } catch (error) { toast.error(error.response?.data?.error || "Erro ao inserir dupla."); await carregarFilaETudo(); }
  };

  const executarRemocao = async (id, nomeJogador, senha) => {
    try { await axios.delete(`${API_URL}/fila/${id}`, { headers: { 'x-admin-key': senha } }); carregarFilaETudo(); toast.success(`${nomeJogador} saiu da fila.`); } 
    catch (error) { toast.error(`Acesso negado para remover ${nomeJogador}.`); }
  };

  const limparFilaInteira = () => {
    vibrarForte();
    solicitarSenha('Autorizar Limpeza Total', async (authKey) => {
      try { await axios.delete(`${API_URL}/limpar-fila`, { headers: { 'x-admin-key': authKey } }); carregarFilaETudo(); toast.success("Fila limpa pelo administrador."); } 
      catch (error) { toast.error("Acesso Master negado."); }
    });
  };

  const congelarFilaInteira = (acao) => {
    vibrarLeve();
    solicitarSenha('Autorizar Congelamento', async (authKey) => {
      try { await axios.patch(`${API_URL}/admin/congelar-toda-fila`, { acao }, { headers: { 'x-admin-key': authKey } }); carregarFilaETudo(); toast.success("Ação de congelamento executada."); } 
      catch (error) { toast.error("Falha ao congelar fila."); }
    });
  };

  const alternarCongelamento = (id, nomeJogador) => {
    vibrarLeve();
    solicitarSenha(`PIN para alterar status de ${nomeJogador}`, async (authKey) => {
      try { await axios.patch(`${API_URL}/fila/${id}/congelar`, {}, { headers: { 'x-admin-key': authKey } }); carregarFilaETudo(); toast.success("Status atualizado!"); } 
      catch (error) { toast.error("Senha incorreta."); }
    });
  };

  const desfazerDupla = (jogadorId) => {
    vibrarLeve();
    solicitarSenha('PIN para separar dupla', async (authKey) => {
      try { await axios.post(`${API_URL}/desfazer-dupla`, { jogador_id: jogadorId, pin: authKey }); carregarFilaETudo(); toast.success("Dupla separada."); } 
      catch (error) { toast.error("Não foi possível desfazer a dupla."); }
    });
  };

  const ativarModoDeus = async () => {
    vibrarForte();
    if (modoDeus) { 
      setModoDeus(false); setSenhaDeus(''); 
      const userUpdate = { ...usuarioLogado }; delete userUpdate.senhaMaster;
      setUsuarioLogado(userUpdate); localStorage.setItem('@DominoPAF:user', JSON.stringify(userUpdate));
      toast.success("Sessão ADM encerrada."); return; 
    }
    
    solicitarSenha('Autenticação Premium', async (senha) => {
      try {
        const response = await axios.post(`${API_URL}/login-admin`, { senhaDigitada: senha });
        if (response.data.autorizado) { 
          setSenhaDeus(senha); setModoDeus(true); 
          const userUpdate = { ...usuarioLogado, senhaMaster: senha };
          setUsuarioLogado(userUpdate); localStorage.setItem('@DominoPAF:user', JSON.stringify(userUpdate));
          vibrarForte(); toast.success("Acesso Premium concedido.");
        } else { toast.error("Acesso Negado."); }
      } catch (error) { toast.error("Erro no servidor."); }
    });
  };

  const executarPoderDivino = async (jogadorId, nomeJogador, acao, destino = null) => {
    vibrarLeve();
    try { await axios.post(`${API_URL}/admin/deus`, { senhaMestra: senhaDeus, jogadorId, acao, destino }); carregarFilaETudo(); toast.success(`Ação executada em ${nomeJogador}.`); } 
    catch (error) { toast.error("Falha na execução."); }
  };

  const carregarStatusMesas = async () => {
    try { const res = await axios.get(`${API_URL}/mesas-status`); setMesasAtivas(res.data); } catch (e) {}
  };

  const alternarMesa = async (mesaId) => {
    vibrarForte();
    try {
      const res = await axios.post(`${API_URL}/admin/fechar-mesa`, { senhaMestra: senhaDeus, mesaId });
      setMesasAtivas(res.data.mesasAtivas); carregarFilaETudo(); toast.success(res.data.message);
    } catch (error) { toast.error("Falha ao alterar status da mesa."); }
  };

  const forcarEntrada = async () => {
    vibrarLeve();
    if (!jogadorParaForcar) return toast.error("Selecione um jogador primeiro.");
    try {
      await axios.post(`${API_URL}/admin/forcar-entrada`, { senhaMestra: senhaDeus, jogadorId: jogadorParaForcar, preferencia: 'Qualquer' });
      setJogadorParaForcar(''); carregarFilaETudo(); toast.success("Jogador puxado para a fila!");
    } catch (error) { toast.error("Erro ao forçar entrada."); }
  };

  const salvarConfiguracoes = async () => {
    vibrarLeve();
    const toastId = toast.loading("Salvando configurações...");
    try {
      await axios.post(`${API_URL}/admin/configuracoes`, formConfig, { headers: { 'x-admin-key': senhaDeus } });
      toast.success("Destaque atualizado com sucesso!", { id: toastId });
      setModalConfigAberto(false); carregarFilaETudo();
    } catch (err) { toast.error("Erro ao salvar configurações.", { id: toastId }); }
  };

  useEffect(() => { carregarStatusMesas(); }, []);

  const espera = (fila || []).filter(j => String(j.status).toLowerCase() === 'espera' || String(j.status).toLowerCase() === 'congelado');  
  const jogando = fila.filter(j => j.status === 'mesa');
  const mesa1 = jogando.filter(j => j.mesa_atual === 1);
  const mesa2 = jogando.filter(j => j.mesa_atual === 2);
  const mesa3 = jogando.filter(j => j.mesa_atual === 3);
  const jogandoNaMesaAtual = mesaVitoria === 1 ? mesa1 : mesaVitoria === 2 ? mesa2 : mesa3;

  const confirmarVitoria = () => {
    vibrarForte(); 
    if (isGuardando) return;
    if (etapaVitoria === 1 && vencedores.length !== 2) return toast.error("Selecione exatamente os DOIS vencedores.");
    
    const esperandoParaEssaMesa = espera.filter(j => String(j.preferencia || j.mesa_preferencia || '').toLowerCase().includes(String(mesaVitoria)) || String(j.preferencia || j.mesa_preferencia || '').toLowerCase().includes('qualquer')).length;
    const outrasMesas = [1, 2, 3].filter(m => m !== mesaVitoria).map(m => m === 1 ? mesa1 : m === 2 ? mesa2 : mesa3);
    const isoladosNaOutraMesa = outrasMesas.reduce((acc, m) => acc + (m.length > 0 && m.length < 4 ? m.filter(j => String(j.preferencia || j.mesa_preferencia || '').toLowerCase().includes(String(mesaVitoria)) || String(j.preferencia || j.mesa_preferencia || '').toLowerCase().includes('qualquer')).length : 0), 0);
    const filaReal = esperandoParaEssaMesa + isoladosNaOutraMesa;

    if (etapaVitoria === 1 && filaReal === 1) { setEtapaVitoria(2); vibrarLeve(); toast.success("Selecione o jogador que continuará na mesa."); return; }
    if (etapaVitoria === 2 && !quemFicaId) return toast.error("Selecione o jogador remanescente.");

    solicitarSenha('Autorização para Vitória', async (authKey) => {
      if (!modoDeus) {
        try {
          const response = await axios.post(`${API_URL}/login-admin`, { senhaDigitada: authKey });
          if (!response.data.autorizado) return toast.error("Acesso negado.");
        } catch (error) { return toast.error("Erro ao validar permissões."); }
      }

      setIsGuardando(true);
      toast.loading("Processando vitória...", { id: 'vitoria' });
      try {
        await axios.post(`${API_URL}/vitoria`, { vencedores, mesaId: mesaVitoria, quemFicaId, filaReal, admin_nome: usuarioLogado.nome });
        setModalAberto(false); setVencedores([]); setQuemFicaId(null); setEtapaVitoria(1); carregarFilaETudo();
        toast.success("Vitória confirmada!"); 
      } catch (error) { 
        toast.error(error.response?.data?.error || "Erro ao registrar a partida. Horário não permitido."); 
      }
      finally { setIsGuardando(false); }
    });
  };

  const SkeletonCard = () => (
    <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} style={{ padding: '14px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '20px', height: '15px', backgroundColor: '#E2E8F0', borderRadius: '4px' }}></div>
        <div style={{ width: '32px', height: '32px', backgroundColor: '#E2E8F0', borderRadius: '50%' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ width: '120px', height: '12px', backgroundColor: '#E2E8F0', borderRadius: '4px' }}></div>
          <div style={{ width: '60px', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px' }}></div>
        </div>
      </div>
      <div style={{ width: '50px', height: '20px', backgroundColor: '#E2E8F0', borderRadius: '4px' }}></div>
    </motion.div>
  );

  // ==========================================
  // TELA DE LOGIN (DESLOGADO)
  // ==========================================
  if (!usuarioLogado) {
    return (
      <div style={{ padding: '40px 30px', fontFamily: 'Inter, sans-serif', maxWidth: '400px', margin: '10vh auto', backgroundColor: '#FFFFFF', color: '#0F172A', minHeight: '80vh', boxSizing: 'border-box', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
        {modalSenha.aberto && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 11000, backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: '#FFFFFF', padding: '25px', borderRadius: '16px', width: '300px', border: '1px solid #E2E8F0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#0F172A', fontSize: '1.1rem', fontWeight: '800' }}>{modalSenha.titulo}</h3>
              <input type="password" placeholder="Digite a Senha" value={senhaModalInput} onChange={(e) => setSenhaModalInput(e.target.value)} autoFocus style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', marginBottom: '20px', outline: 'none', textAlign: 'center', letterSpacing: '2px', fontSize: '1rem', backgroundColor: '#F8FAFC', color: '#0F172A' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={fecharModalSenha} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F1F5F9', color: '#64748B', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={confirmarModalSenha} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#991B1B', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}>Confirmar</button>
              </div>
            </motion.div>
          </div>
        )}
        <header style={{ position: 'relative', textAlign: 'center', marginBottom: '40px' }}>
          {/* BOTÃO DO MODO ESCURO NA TELA DE LOGIN */}
          <div style={{ position: 'absolute', top: 0, right: 0 }}>
            <motion.button 
              whileTap={{ scale: 0.85 }}
              onClick={() => { setModoEscuro(!modoEscuro); vibrarLeve(); }} 
              style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
            >
              {modoEscuro ? '☀️' : '🌙'}
            </motion.button>
          </div>
          
          <h1 style={{ color: '#0F172A', fontSize: '2rem', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Dominó do PAF1</h1>
          <p style={{ color: '#64748B', margin: 0, fontSize: '0.9rem' }}>Acesso ao Sistema Acadêmico</p>
        </header>
        <div style={{ display: 'flex', backgroundColor: '#F8FAFC', padding: '4px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #E2E8F0' }}>
          <button onClick={() => { setIsNovo(false); vibrarLeve(); }} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: !isNovo ? '#FFFFFF' : 'transparent', color: !isNovo ? '#0F172A' : '#64748B', fontWeight: '600', transition: '0.2s', fontSize: '0.85rem', cursor: 'pointer', boxShadow: !isNovo ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Login</button>
          <button onClick={() => { setIsNovo(true); vibrarLeve(); }} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: isNovo ? '#FFFFFF' : 'transparent', color: isNovo ? '#0F172A' : '#64748B', fontWeight: '600', transition: '0.2s', fontSize: '0.85rem', cursor: 'pointer', boxShadow: isNovo ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Registro</button>
        </div>
        <div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
          <div style={{ position: 'relative' }}>
            <input type="text" placeholder="Nome de registro" value={nome} onChange={(e) => { setNome(e.target.value); setMostrarLista1(true); }} onFocus={() => setMostrarLista1(true)} onBlur={() => setTimeout(() => setMostrarLista1(false), 200)} style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#0F172A', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
            {!isNovo && mostrarLista1 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight: '180px', overflowY: 'auto', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', zIndex: 10, marginTop: '4px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                {usuariosCadastrados.filter(u => u.nome.toLowerCase().includes(nome.toLowerCase())).map(u => (<div key={u.id} onClick={() => { setNome(u.nome); setMostrarLista1(false); vibrarLeve(); }} style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', fontSize: '0.85rem', color: '#334155' }}>{u.nome}</div>))}
              </div>
            )}
          </div>
          <input type="password" placeholder="Código de Segurança" maxLength="4" value={pin} onChange={(e) => setPin(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#0F172A', textAlign: 'center', letterSpacing: '4px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
          {isNovo ? (
            <motion.button whileTap={{ scale: 0.95 }} onClick={fazerCadastro} style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#0F172A', color: '#FFF', border: 'none', fontWeight: '600', fontSize: '0.95rem', marginTop: '20px', cursor: 'pointer' }}>Criar Conta</motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.95 }} onClick={fazerLogin} style={{ padding: '14px', borderRadius: '8px', background: '#991B1B', color: '#FFF', border: 'none', fontWeight: '600', fontSize: '0.95rem', marginTop: '20px', cursor: 'pointer' }}>Autenticar</motion.button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // BARREIRA DE TERMOS DE SERVIÇO (LOGADO)
  // ==========================================
  if (usuarioLogado && usuarioLogado.termos_aceitos !== true) {
      return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#F8FAFC', zIndex: 999999, display: 'flex', flexDirection: 'column', padding: '20px', boxSizing: 'border-box', overflowY: 'auto' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#FFFFFF', padding: '30px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <h1 style={{ color: '#0F172A', fontSize: '1.5rem', fontWeight: '800', marginBottom: '20px', borderBottom: '2px solid #E2E8F0', paddingBottom: '10px' }}>Termos Oficiais</h1>
                
                <div style={{ backgroundColor: '#F1F5F9', padding: '15px', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '20px', fontSize: '0.8rem', color: '#334155', lineHeight: '1.6' }}>
    <h2 style={{ fontSize: '1rem', color: '#0F172A', marginTop: 0, marginBottom: '10px' }}>📜 Política de Privacidade</h2>
    <p style={{ marginBottom: '10px' }}><strong>Última atualização: Agosto de 2026</strong><br/>
    O Dominó do PAF1 valoriza a privacidade dos seus usuários. Esta política descreve como coletamos, usamos e protegemos suas informações.</p>
    
    <p style={{ marginBottom: '10px' }}><strong>1. Dados que Coletamos:</strong> Para o funcionamento do sistema, coletamos: Dados de Identificação (Nome de usuário e foto); Credenciais (PIN de 4 dígitos criptografado); Dados de Dispositivo (Tokens de Push Notification); Dados de Uso (Histórico de partidas e tempo de jogo).</p>
    
    <p style={{ marginBottom: '10px' }}><strong>2. Como Usamos seus Dados:</strong> As informações são utilizadas exclusivamente para gerenciar a fila, calcular estatísticas, enviar notificações e garantir a segurança do sistema contra fraudes.</p>
    
    <p style={{ marginBottom: '10px' }}><strong>3. Compartilhamento:</strong> Seus dados não são vendidos ou compartilhados com terceiros. O nome, foto e estatísticas de jogo são públicos dentro da plataforma para todos os jogadores registrados.</p>
    
    <p style={{ marginBottom: '10px' }}><strong>4. Retenção e Exclusão:</strong> Você tem o direito de solicitar a exclusão total da sua conta e do seu histórico a qualquer momento via SAC/Denúncia.</p>
    
    <p style={{ marginBottom: '20px' }}><strong>5. Segurança:</strong> Utilizamos nuvem com criptografia padrão de mercado, mas nenhum sistema é 100% infalível.</p>

    <h2 style={{ fontSize: '1rem', color: '#0F172A', marginTop: '20px', marginBottom: '10px', borderTop: '1px solid #CBD5E1', paddingTop: '15px' }}>⚖️ Termos de Serviço e Condições de Uso</h2>
    <p style={{ marginBottom: '10px' }}>Ao criar uma conta e utilizar o app, você concorda integralmente com os termos abaixo:</p>
    
    <p style={{ marginBottom: '10px' }}><strong>1. Natureza do Serviço:</strong> O Dominó do PAF1 é uma plataforma recreativa e acadêmica. O sistema é fornecido "como está".</p>
    
    <p style={{ marginBottom: '10px' }}><strong>2. Isenção de Responsabilidade (Limitation of Liability):</strong> Os desenvolvedores não se responsabilizam por falhas de conexão, perda de posição na fila, bugs, indisponibilidade dos servidores, ou conflitos/discussões gerados presencialmente nas mesas. O app apenas organiza a fila; o respeito é dever dos jogadores.</p>
    
    <p style={{ marginBottom: '10px' }}><strong>3. Regras de Conduta:</strong> É estritamente proibido criar contas falsas para tumultuar a fila, utilizar linguagem abusiva ou tentar burlar falhas no sistema.</p>
    
    <p style={{ marginBottom: '10px' }}><strong>4. Poderes da Administração:</strong> A administração possui autoridade absoluta para remover ou congelar jogadores da fila, banir contas e reiniciar o ranking conforme necessário para o balanceamento.</p>
    
    <p style={{ margin: 0 }}><strong>5. Aceitação:</strong> O uso contínuo do aplicativo constitui a aceitação destas regras. Se você não concorda, não deve utilizar o sistema.</p>
</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '30px' }}>
                    <input type="checkbox" checked={concordouTermos} onChange={(e) => setConcordaTermos(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#0F172A' }} />
                    <span style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: '600' }}>Li e concordo com os Termos de Serviço e a Política de Privacidade do app.</span>
                </label>

                <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={aceitarTermosOficiais} style={{ padding: '14px', borderRadius: '8px', background: concordouTermos ? '#0F172A' : '#94A3B8', color: '#FFFFFF', fontWeight: '700', border: 'none', cursor: concordouTermos ? 'pointer' : 'not-allowed' }}>
                        Aceitar e Jogar
                    </motion.button>
                    <button onClick={() => { setUsuarioLogado(null); localStorage.removeItem('@DominoPAF:user'); }} style={{ padding: '14px', borderRadius: '8px', background: 'transparent', color: '#EF4444', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
                        Recusar e Sair
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // ==========================================
  // TELA PRINCIPAL (APP NORMAL)
  // ==========================================
  return (
    <>
      <OnboardingRegras />
      {/* OVERLAY DE AVISO "PREPARE-SE" */}
      <AnimatePresence>
        {alertaPreparacao && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.8 }} 
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, #F59E0B, #D97706)', zIndex: 99999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}
          >
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '50%', marginBottom: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <span style={{ fontSize: '3rem' }}>⏳</span>
            </div>

            <h1 style={{ color: '#FFFFFF', fontSize: '2.5rem', fontWeight: '900', margin: '0 0 15px 0', textAlign: 'center', lineHeight: '1', textTransform: 'uppercase', textShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>PREPARE-SE!</h1>
            
            <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '25px', borderRadius: '16px', marginBottom: '40px', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)' }}>
              <p style={{ color: '#FFFFFF', fontSize: '1.2rem', fontWeight: '700', margin: 0, textAlign: 'center', lineHeight: '1.5' }}>Você é um dos próximos da fila.<br/>Dirija-se ao local de jogo.</p>
            </div>

            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setAlertaPreparacao(false)}
              style={{ backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', padding: '16px 40px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}
            >
              Ciente
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
     {/* 🧭 OVERLAY DO TUTORIAL GUIADO PREMIUM */}
      <AnimatePresence>
        {mostrarTutorial && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 100000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
            
            <motion.div 
              key={passoTutorial}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              style={{ backgroundColor: '#FFFFFF', padding: '35px 25px', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
            >
              {/* Barra de progresso no topo */}
              <div style={{ position: 'absolute', top: 0, left: 0, height: '4px', backgroundColor: '#F1F5F9', width: '100%' }}>
                <motion.div 
                  initial={{ width: `${(passoTutorial / 6) * 100}%` }}
                  animate={{ width: `${((passoTutorial + 1) / 7) * 100}%` }}
                  style={{ height: '100%', backgroundColor: '#991B1B' }}
                />
              </div>

              {/* Ícones SVG Dinâmicos */}
              <div style={{ width: '70px', height: '70px', borderRadius: '20px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px', color: '#991B1B' }}>
                {passoTutorial === 0 && <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>}
                {passoTutorial === 1 && <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
                {passoTutorial === 2 && <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>}
                {passoTutorial === 3 && <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="2 4 5 19 19 19 22 4 17 9 12 4 7 9 2 4"></polygon></svg>}
                {passoTutorial === 4 && <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>}
                {passoTutorial === 5 && <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>}
                {passoTutorial === 6 && <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>}
              </div>

              {/* Textos Dinâmicos */}
              <h2 style={{ color: '#0F172A', margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
                {passoTutorial === 0 && "Bem-vindo ao PAF1"}
                {passoTutorial === 1 && "Entrada: Solo ou Dupla?"}
                {passoTutorial === 2 && "Pausar ou Sair da Fila"}
                {passoTutorial === 3 && "Top 10 Respeitados"}
                {passoTutorial === 4 && "Perfil e Foto"}
                {passoTutorial === 5 && "Aba Ajuda e ADMs"}
                {passoTutorial === 6 && "Fique Esperto!"}
              </h2>
              
              <p style={{ color: '#64748B', fontSize: '0.95rem', margin: '0 0 30px 0', lineHeight: '1.6' }}>
                {passoTutorial === 0 && "Tudo no digital agora. O app cuida da fila, mas o clima da mesa é com vocês. Jogue limpo e evite confusão."}
                {passoTutorial === 1 && "Escolha o modo e digite seu PIN. Se for entrar em dupla, coloque o nome e PIN do parceiro para o sistema amarrar e puxar os dois juntos para a mesa."}
                {passoTutorial === 2 && "Precisou sair por um momento? Clique em 'Congelar'. Sua vaga fica salva, mas o app te pula. Quando voltar, clique em 'Descongelar'. Para sair de vez, clique em 'Sair'."}
                {passoTutorial === 3 && "Não é só sobre ganhar! O Top 10 mostra a elite mais respeitada do PAF1. Clique no nome de qualquer jogador para abrir o perfil dele e deixar seu voto."}
                {passoTutorial === 4 && "Na tela perfil acompanhe suas estatísticas, veja seus maiores fregueses e troque sua foto para a galera te reconhecer."}
                {passoTutorial === 5 && "Deu treta ou tem dúvida? Vá na aba 'Ajuda'. Lá fica o Regulamento Oficial e os perfis dos ADMs, mostrando em tempo real se o ADM está livre ou jogando."}
                {passoTutorial === 6 && "Quando for sua vez de jogar, a tela do celular vai piscar gigante avisando 'PREPARE-SE'. Se demorar para colar na mesa, o ADM vai passar a sua vaga."}
              </p>

              {/* Controles de Navegação */}
              <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
                <button 
                  onClick={() => { localStorage.setItem(`@DominoPAF:tutorial_${usuarioLogado.id}`, 'visto'); setMostrarTutorial(false); vibrarLeve(); }}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  {passoTutorial === 6 ? "Fechar" : "Pular"}
                </button>
                
                <button 
                  onClick={() => {
                    vibrarLeve();
                    if (passoTutorial < 6) { setPassoTutorial(passoTutorial + 1); } 
                    else { localStorage.setItem(`@DominoPAF:tutorial_${usuarioLogado.id}`, 'visto'); setMostrarTutorial(false); }
                  }}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#991B1B', border: 'none', color: '#FFFFFF', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(153, 27, 27, 0.2)' }}
                >
                  {passoTutorial === 6 ? "Jogar" : "Próximo"}
                </button>
              </div>

              {/* Bolinhas de Progresso (7 passos) */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '20px' }}>
                {[0, 1, 2, 3, 4, 5, 6].map(idx => (
                  <div key={idx} style={{ width: idx === passoTutorial ? '20px' : '6px', height: '6px', borderRadius: '3px', backgroundColor: idx === passoTutorial ? '#991B1B' : '#E2E8F0', transition: '0.3s' }} />
                ))}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {modalConfigAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 12000, backdropFilter: 'blur(4px)' }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: '#FFFFFF', padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #E2E8F0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#D97706', fontSize: '1.1rem', fontWeight: '800' }}>👑 Editar Conteúdo do App</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#0F172A', fontWeight: '700' }}>Destaque da Semana</h4>
              <input type="text" placeholder="Nome do Craque" value={formConfig.top1_nome || ''} onChange={e => setFormConfig({...formConfig, top1_nome: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '0.85rem' }} />
              <input type="text" placeholder="Frase de Efeito" value={formConfig.top1_frase || ''} onChange={e => setFormConfig({...formConfig, top1_frase: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '0.85rem' }} />
              <input type="text" placeholder="Link da Foto" value={formConfig.top1_foto || ''} onChange={e => setFormConfig({...formConfig, top1_foto: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '0.85rem' }} />
              <input type="text" placeholder="Link Embutido do Spotify" value={formConfig.top1_spotify || ''} onChange={e => setFormConfig({...formConfig, top1_spotify: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '0.85rem' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalConfigAberto(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F1F5F9', color: '#64748B', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarConfiguracoes} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#991B1B', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}>Salvar Tudo</button>
            </div>
          </motion.div>
        </div>
      )}

      {modalSenha.aberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 11000, backdropFilter: 'blur(4px)' }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: '#FFFFFF', padding: '25px', borderRadius: '16px', width: '300px', border: '1px solid #E2E8F0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#0F172A', fontSize: '1.1rem', fontWeight: '800' }}>{modalSenha.titulo}</h3>
            <input type="password" placeholder="Digite a Senha" value={senhaModalInput} onChange={(e) => setSenhaModalInput(e.target.value)} autoFocus style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', marginBottom: '20px', outline: 'none', textAlign: 'center', letterSpacing: '2px', fontSize: '1rem', backgroundColor: '#F8FAFC', color: '#0F172A' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={fecharModalSenha} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F1F5F9', color: '#64748B', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmarModalSenha} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#991B1B', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}>Confirmar</button>
            </div>
          </motion.div>
        </div>
      )}

      {adminsPresentes.length > 0 && (
        <div onMouseDown={iniciarArrasto} onTouchStart={iniciarArrasto} style={{ position: 'fixed', left: `${posicaoAdmin.x}px`, top: `${posicaoAdmin.y}px`, zIndex: 10000, background: 'rgba(255, 255, 255, 0.9)', padding: '6px 12px', borderRadius: '20px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'grab', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '6px', height: '6px', backgroundColor: '#D97706', borderRadius: '50%', boxShadow: '0 0 8px #D97706' }}></div>
          <span style={{ color: '#0F172A', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sessão ADM</span>
        </div>
      )}

      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(4px)' }}>
          <AnimatePresence>
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: 100 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.2}
              onDragEnd={(event, info) => { if (info.offset.y > 100) { setModalAberto(false); setVencedores([]); setQuemFicaId(null); setEtapaVitoria(1); vibrarLeve(); } }}
              style={{ backgroundColor: '#FFFFFF', padding: '30px', borderRadius: '16px', width: '320px', border: '1px solid #E2E8F0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', position: 'relative' }}
            >
              <div style={{ width: '40px', height: '4px', backgroundColor: '#CBD5E1', borderRadius: '2px', margin: '-15px auto 20px auto' }}></div>
              <h3 style={{ color: '#0F172A', textAlign: 'center', margin: '0 0 25px 0', fontWeight: '700', fontSize: '1.1rem' }}>{etapaVitoria === 1 ? `Confirmar: Mesa ${mesaVitoria}` : "Jogador Remanescente"}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' }}>
                {(etapaVitoria === 1 ? jogandoNaMesaAtual : jogandoNaMesaAtual.filter(j => !vencedores.includes(j.id))).map(j => {
                  const isSelected = (etapaVitoria === 1 ? vencedores.includes(j.id) : quemFicaId === j.id);
                  return (
                    <motion.div whileTap={{ scale: 0.95 }} key={j.id} onClick={() => { vibrarLeve(); if (etapaVitoria === 1) { if (vencedores.includes(j.id)) setVencedores(vencedores.filter(vid => vid !== j.id)); else if (vencedores.length < 2) setVencedores([...vencedores, j.id]); } else setQuemFicaId(j.id); }} style={{ padding: '16px 10px', border: isSelected ? '2px solid #991B1B' : '1px solid #E2E8F0', borderRadius: '8px', background: isSelected ? '#FEF2F2' : '#F8FAFC', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: '0.2s' }}>
                      <AvatarJogador url={j.avatar_url} nome={j.nome} tamanho="36px" />
                      <span style={{color: isSelected ? '#991B1B' : '#334155', marginTop: '12px', fontSize: '0.8rem', fontWeight: '600'}}>{j.nome}</span>
                    </motion.div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => {setModalAberto(false); setVencedores([]); setQuemFicaId(null); setEtapaVitoria(1); vibrarLeve(); }} style={{ flex: 1, padding: '12px', background: '#F1F5F9', color: '#64748B', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}>Cancelar</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={confirmarVitoria} disabled={isGuardando} style={{ flex: 1, padding: '12px', background: '#991B1B', color: '#FFFFFF', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(153, 27, 27, 0.2)' }}>{isGuardando ? "Processando..." : "Confirmar"}</motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      <PullToRefresh 
        onRefresh={carregarFilaETudo}
        pullingContent={<div style={{ textAlign: 'center', padding: '20px', color: '#64748B', fontSize: '0.8rem', fontWeight: '600' }}>↓ Puxe para atualizar a fila</div>}
        refreshingContent={<div style={{ textAlign: 'center', padding: '20px', color: '#991B1B', fontSize: '0.8rem', fontWeight: '600' }}>Sincronizando sistema...</div>}
      >
        <div style={{ 
          padding: '20px', fontFamily: 'Inter, sans-serif', maxWidth: '800px', margin: '0 auto', 
          background: modoDeus ? 'linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 40%, #FFF5D1 100%)' : '#F9FAFB', 
          color: '#0F172A', minHeight: '100vh', boxSizing: 'border-box', transition: 'background 0.5s ease'
        }}>
          <BannerApp />
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '15px', borderBottom: '1px solid #E5E7EB' }}>
            <h1 onDoubleClick={ativarModoDeus} style={{ color: modoDeus ? '#92400E' : '#0F172A', fontSize: '1.2rem', fontWeight: '900', margin: 0, cursor: 'pointer', letterSpacing: '-0.5px', transition: 'color 0.3s' }}>
              Dominó do PAF1
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              
              {/* BOTÃO DO MODO ESCURO NA TELA PRINCIPAL */}
              <motion.button 
                whileTap={{ scale: 0.85 }}
                onClick={() => { setModoEscuro(!modoEscuro); vibrarLeve(); }} 
                style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', cursor: 'pointer' }}
              >
                {modoEscuro ? '☀️' : '🌙'}
              </motion.button>

              <div style={{ textAlign: 'right' }}>
                <h2 style={{ margin: 0, color: '#1E293B', fontSize: '0.85rem', fontWeight: '600' }}>{usuarioLogado.nome}</h2>
                <p style={{ margin: 0, fontSize: '0.65rem', color: modoDeus ? '#92400E' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: modoDeus ? '700' : 'normal' }}>
                  {modoDeus ? 'Acesso ADM' : 'Sessão Ativa'}
                </p>
              </div>
              <div style={{ position: 'relative' }}>
                <AvatarJogador url={usuarioLogado.avatar_url} nome={usuarioLogado.nome} tamanho="36px" />
                <input type="file" id="input-trocar-foto" accept="image/*" style={{ display: 'none' }} onChange={trocarFotoExistente} />
              </div>
            </div>
          </header>

          <DestaqueTop1 config={configApp} />

          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#0F172A', fontSize: '1rem', fontWeight: '700' }}>Configurar Entrada</h3>
              <div style={{ display: 'flex', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', padding: '4px', borderRadius: '8px' }}>
                <button onClick={() => { setModoEntrada('solo'); vibrarLeve(); }} style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: modoEntrada === 'solo' ? '#FFFFFF' : 'transparent', color: modoEntrada === 'solo' ? '#0F172A' : '#64748B', fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer', boxShadow: modoEntrada === 'solo' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>Individual</button>
                <button onClick={() => { setModoEntrada('dupla'); vibrarLeve(); }} style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: modoEntrada === 'dupla' ? '#FFFFFF' : 'transparent', color: modoEntrada === 'dupla' ? '#0F172A' : '#64748B', fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer', boxShadow: modoEntrada === 'dupla' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>Dupla</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              {modoEntrada === 'solo' ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select value={preferencia} onChange={(e) => setPreferencia(e.target.value)} style={{ flex: 1, padding: '14px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <option value="Qualquer">Qualquer Mesa</option><option value="1">Mesa 1</option><option value="2">Mesa 2</option><option value="3">Mesa 3</option>
                  </select>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={entrarNaFila} style={{ flex: '1 1 40%', padding: '14px', borderRadius: '8px', background: '#991B1B', color: '#FFFFFF', fontWeight: '600', border: 'none', fontSize: '0.85rem', cursor: 'pointer' }}>Entrar na Fila</motion.button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 100%', position: 'relative' }}>
                    <input type="text" placeholder="Nome do parceiro" value={nome2} onChange={(e) => { setNome2(e.target.value); setMostrarLista2(true); }} onFocus={() => setMostrarLista2(true)} onBlur={() => setTimeout(() => setMostrarLista2(false), 200)} style={{ width: '100%', padding: '14px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                    {mostrarLista2 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight: '150px', overflowY: 'auto', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', zIndex: 10, marginTop: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        {usuariosCadastrados.filter(u => u.nome.toLowerCase().includes(nome2.toLowerCase())).map(u => (<div key={u.id} onClick={() => { setNome2(u.nome); setMostrarLista2(false); vibrarLeve(); }} style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', color: '#334155', fontSize: '0.85rem' }}>{u.nome}</div>))}
                      </div>
                    )}
                  </div>
                  <input type="password" placeholder="PIN" maxLength="4" value={pin2} onChange={(e) => setPin2(e.target.value)} style={{ flex: 1, padding: '14px', borderRadius: '8px', backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', textAlign: 'center', outline: 'none', fontSize: '0.85rem' }} />
                  <select value={preferencia} onChange={(e) => setPreferencia(e.target.value)} style={{ flex: 1, padding: '14px', borderRadius: '8px', backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <option value="Qualquer">Qualquer Mesa</option><option value="1">Mesa 1</option><option value="2">Mesa 2</option><option value="3">Mesa 3</option>
                  </select>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={entrarNaFilaDupla} style={{ width: '100%', padding: '14px', borderRadius: '8px', background: '#991B1B', color: '#FFFFFF', fontWeight: '600', border: 'none', fontSize: '0.85rem', cursor: 'pointer', marginTop: '4px' }}>Confirmar Entrada</motion.button>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ color: '#0F172A', margin: '0 0 15px 0', fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase' }}>Partidas Rolando</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {[1, 2, 3].map(num => {
                  const mesa = num === 1 ? mesa1 : num === 2 ? mesa2 : mesa3;
                  if (!modoDeus && !mesasAtivas[num] && mesa.length === 0) return null;

                  return (
                    <div key={num} style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: mesasAtivas[num] ? '1px solid #E2E8F0' : '2px dashed #CBD5E1', opacity: mesasAtivas[num] ? 1 : 0.6, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0F172A' }}>Mesa {num}</span>
                          {modoDeus && (
                            <motion.button 
                              whileTap={{ scale: 0.9 }} 
                              onClick={() => alternarMesa(num)}
                              style={{ fontSize: '0.6rem', padding: '4px 8px', borderRadius: '6px', border: 'none', backgroundColor: mesasAtivas[num] ? '#10B981' : '#EF4444', color: '#FFFFFF', fontWeight: '800', cursor: 'pointer', textTransform: 'uppercase' }}
                            >
                              {mesasAtivas[num] ? 'Aberta' : 'Fechada'}
                            </motion.button>
                          )}
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748B', backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: '6px' }}>{mesa.length}/4</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {mesa.length === 0 ? (
                          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{mesasAtivas[num] ? 'Aguardando jogadores...' : 'Mesa inativa.'}</span>
                        ) : (
                          mesa.map(j => (
                            <div key={j.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AvatarJogador url={j.avatar_url} nome={j.nome} tamanho="28px" />
                                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>{j.nome}</span>
                              </div>
                              
                              {modoDeus && (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <button onClick={() => executarPoderDivino(j.id, j.nome, 'mover_fila')} style={{ background: '#F8FAFC', color: '#334155', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '6px 10px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}>Fila</button>
                                  {num !== 1 && <button onClick={() => executarPoderDivino(j.id, j.nome, 'forcar_mesa', 1)} style={{ background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '6px 10px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}>M1</button>}
                                  {num !== 2 && <button onClick={() => executarPoderDivino(j.id, j.nome, 'forcar_mesa', 2)} style={{ background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '6px 10px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}>M2</button>}
                                  {num !== 3 && <button onClick={() => executarPoderDivino(j.id, j.nome, 'forcar_mesa', 3)} style={{ background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '6px 10px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}>M3</button>}
                                  <button onClick={() => solicitarSenha(`TIRAR: ${j.nome}`, (senha) => executarRemocao(j.id, j.nome, senha))} style={{ background: '#FFFFFF', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '6px', padding: '6px 10px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}>Tirar</button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {mesa.length === 4 && modoDeus && (
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setMesaVitoria(num); setModalAberto(true); vibrarLeve(); }}
                          style={{ width: '100%', marginTop: '15px', padding: '12px', backgroundColor: '#991B1B', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(153, 27, 27, 0.2)', textTransform: 'uppercase', letterSpacing: '1px' }}
                        >
                          Declarar Vitória
                        </motion.button>
                      )}

                      {mesa.length > 0 && mesa.length < 4 && (
                        <div style={{ marginTop: '15px', textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem', fontWeight: '600' }}>
                          Aguardando completar ({mesa.length}/4)...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #E5E7EB', paddingBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ color: '#0F172A', margin: 0, fontSize: '1rem', fontWeight: '700' }}>Fila de Espera <span style={{ color: '#64748B', fontWeight: '500', fontSize: '0.9rem' }}>({espera.length})</span></h3>

              {modoDeus && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                  <div style={{ position: 'relative', flex: '1 1 130px' }}>
                    <input 
                      type="text" 
                      placeholder="Puxar jogador..." 
                      value={buscaForcar || ''} 
                      onChange={(e) => { setBuscaForcar(e.target.value); setMostrarListaForcar(true); setJogadorParaForcar(''); }} 
                      onFocus={() => setMostrarListaForcar(true)} 
                      onBlur={() => setTimeout(() => setMostrarListaForcar(false), 200)} 
                      style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', width: '100%', boxSizing: 'border-box', outline: 'none', fontSize: '0.75rem', fontWeight: '600' }} 
                    />
                    {mostrarListaForcar && buscaForcar.trim() !== '' && (
                      <div style={{ position: 'absolute', top: '100%', right: 0, width: '100%', minWidth: '200px', maxHeight: '150px', overflowY: 'auto', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', zIndex: 10, marginTop: '4px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        {usuariosCadastrados.filter(u => u.nome.toLowerCase().includes(buscaForcar.toLowerCase())).map(u => (
                          <div key={u.id} onClick={() => { setJogadorParaForcar(u.id); setBuscaForcar(u.nome); setMostrarListaForcar(false); vibrarLeve(); }} style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', fontSize: '0.8rem', color: '#334155', fontWeight: '600' }}>
                            {u.nome}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => { if(!jogadorParaForcar) return toast.error("Selecione um jogador!"); forcarEntrada(); setBuscaForcar(''); }} style={{ background: '#991B1B', color: '#FFF', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '800' }}>PUXAR</motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.9 }} 
                    onClick={() => congelarFilaInteira('congelar')} 
                    style={{ background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M2 12h20"></path><path d="m20 16-4-4 4-4"></path><path d="m4 8 4 4-4 4"></path><path d="m16 4-4 4-4-4"></path><path d="m8 20 4-4 4 4"></path></svg>
                  </motion.button>
                  
                  <motion.button 
                    whileTap={{ scale: 0.9 }} 
                    onClick={limparFilaInteira} 
                    style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </motion.button>
                </div>
              )}
            </div>
            {carregandoDados ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
           ) : (() => {
              const proc = new Set();
              let pos = 1;
              const filaFiltrada = espera;

              if (filaFiltrada.length === 0) return <p style={{ textAlign: 'center', color: '#64748B', margin: '40px 0', fontSize: '0.85rem' }}>Nenhum jogador na fila.</p>;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <AnimatePresence>
                    {filaFiltrada.map((j) => {
                      if (proc.has(j.id)) return null;
                      const isD = j.dupla_id;
                      const parceiro = isD ? filaFiltrada.find(p => p.dupla_id === j.dupla_id && p.id !== j.id) : null;
                      if (isD && parceiro) { proc.add(j.id); proc.add(parceiro.id); } else { proc.add(j.id); }
                      const isC = j.status === 'congelado' || (parceiro && parceiro.status === 'congelado');

                      const isMeuLugar = usuarioLogado && (j.id === usuarioLogado.id || (parceiro && parceiro.id === usuarioLogado.id));

                      return (
                        <motion.div 
                          key={j.id} layout initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          style={{ padding: '14px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isC ? 0.4 : 1, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <span style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: '700', minWidth: '20px' }}>{String(pos++).padStart(2, '0')}</span>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <AvatarJogador url={j.avatar_url} nome={j.nome} tamanho="32px" />
                              {parceiro && <div style={{ marginLeft: '-12px' }}><AvatarJogador url={parceiro.avatar_url} nome={parceiro.nome} tamanho="32px" /></div>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ color: '#0F172A', fontSize: '0.9rem', fontWeight: '600', textDecoration: isC ? 'line-through' : 'none' }}>{j.nome} {parceiro ? `& ${parceiro.nome}` : ''}</span>
                              <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500' }}>{j.preferencia !== 'Qualquer' ? `Mesa ${j.preferencia}` : 'Qualquer Mesa'}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {modoDeus ? (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center' }}>
                                {/* Botão de Pausar(Congelar) / Dar Play(Descongelar) via SVG Premium */}
                                <motion.button 
                                  whileTap={{ scale: 0.85 }} 
                                  onClick={() => {alternarCongelamento(j.id, j.nome); if(parceiro) alternarCongelamento(parceiro.id, parceiro.nome);}} 
                                  style={{ background: isC ? '#0F172A' : '#F1F5F9', color: isC ? '#FFFFFF' : '#64748B', border: '1px solid', borderColor: isC ? '#0F172A' : '#E2E8F0', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', boxShadow: isC ? '0 4px 10px rgba(15,23,42,0.2)' : 'none' }}
                                >
                                  {isC ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                  ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                                  )}
                                </motion.button>
                                
                                {/* Botões de M1, M2, M3 Minimalistas */}
                                <motion.button whileTap={{ scale: 0.85 }} onClick={() => {executarPoderDivino(j.id, j.nome, 'forcar_mesa', 1); if(parceiro) executarPoderDivino(parceiro.id, parceiro.nome, 'forcar_mesa', 1);}} style={{ background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', padding: 0, cursor: 'pointer' }}>M1</motion.button>
                                <motion.button whileTap={{ scale: 0.85 }} onClick={() => {executarPoderDivino(j.id, j.nome, 'forcar_mesa', 2); if(parceiro) executarPoderDivino(parceiro.id, parceiro.nome, 'forcar_mesa', 2);}} style={{ background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', padding: 0, cursor: 'pointer' }}>M2</motion.button>
                                <motion.button whileTap={{ scale: 0.85 }} onClick={() => {executarPoderDivino(j.id, j.nome, 'forcar_mesa', 3); if(parceiro) executarPoderDivino(parceiro.id, parceiro.nome, 'forcar_mesa', 3);}} style={{ background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', padding: 0, cursor: 'pointer' }}>M3</motion.button>
                                
                                {/* Botão de Tirar com SVG de X fino */}
                                <motion.button whileTap={{ scale: 0.85 }} onClick={() => { solicitarSenha(`TIRAR: ${j.nome}`, (senha) => { executarRemocao(j.id, j.nome, senha); if(parceiro) executarRemocao(parceiro.id, parceiro.nome, senha); }); }} style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </motion.button>
                              </div>
                            ) : isMeuLugar ? (
                              <>
                                {isD && <motion.button whileTap={{ scale: 0.85 }} onClick={() => desfazerDupla(j.id)} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.7rem', cursor: 'pointer', textTransform: 'uppercase', fontWeight: '600' }}>Separar</motion.button>}
                                <motion.button whileTap={{ scale: 0.85 }} onClick={() => {alternarCongelamento(j.id, j.nome); if(parceiro) alternarCongelamento(parceiro.id, parceiro.nome);}} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.7rem', cursor: 'pointer', textTransform: 'uppercase', fontWeight: '600' }}>{isC ? 'Descongelar' : 'Congelar'}</motion.button>
                                <motion.button whileTap={{ scale: 0.85 }} onClick={() => { solicitarSenha(`Senha para sair da fila`, (senha) => { executarRemocao(j.id, j.nome, senha); if(parceiro) executarRemocao(parceiro.id, parceiro.nome, senha); }); }} style={{ color: '#991B1B', border: 'none', background: 'none', fontSize: '0.7rem', cursor: 'pointer', textTransform: 'uppercase', fontWeight: '700' }}>Sair</motion.button>
                              </>
                            ) : null}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              );
            })()}
          </div>

          <div style={{ marginTop: '50px', borderTop: '1px solid #E5E7EB', paddingTop: '20px' }}>
            <button onClick={() => { setMostrarAoVivo(!mostrarAoVivo); vibrarLeve(); }} style={{ width: '100%', padding: '16px', backgroundColor: 'transparent', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', outline: 'none' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0F172A' }}>Partidas em Andamento</span>
              <span style={{ color: '#64748B', fontSize: '0.7rem', letterSpacing: '1px', fontWeight: '600' }}>{mostrarAoVivo ? 'ESCONDER' : 'VISUALIZAR'}</span>
            </button>

            {mostrarAoVivo && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!historicoRecente || historicoRecente.length === 0 ? (
                  <p style={{ color: '#64748B', padding: '20px', textAlign: 'center', fontSize: '0.85rem' }}>Nenhum registro recente.</p>
                ) : (
                  historicoRecente.map((partida, index) => {
                    const getNome = (id) => usuariosCadastrados.find(u => u.id === id)?.nome || 'Anônimo';
                    const v1 = getNome(partida.vencedor1_id);
                    const v2 = partida.vencedor2_id ? ` & ${getNome(partida.vencedor2_id)}` : '';
                    const d1 = getNome(partida.perdedor1_id);
                    const d2 = partida.perdedor2_id ? ` & ${getNome(partida.perdedor2_id)}` : '';
                    
                    const minAtras = Math.floor((new Date() - new Date(partida.data_partida)) / 60000);
                    const horasAtras = Math.floor(minAtras / 60);
                    const minsRestantes = minAtras % 60;
                    const tempoFormatado = minAtras < 1 ? 'Agora' : (horasAtras > 0 ? `${horasAtras}h ${minsRestantes}m atrás` : `${minAtras}m atrás`);
                    
                    return (
                      <div key={partida.id || index} style={{ padding: '14px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: '#94A3B8', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '1px' }}>MESA {partida.mesa_id}</span>
                          <span style={{ color: '#64748B', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: '500' }}>{tempoFormatado}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.85rem' }}>
                          <span style={{ color: '#0F172A', fontWeight: '600' }}>{v1}{v2}</span>
                          <span style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: '500' }}>venceram</span>
                          <span style={{ color: '#64748B', fontWeight: '500' }}>{d1}{d2}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          
          {modoDeus && usuarioLogado?.nome?.toLowerCase() === 'ron' && (
            <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid #E5E7EB', marginTop: '20px' }}>
              <button 
                onClick={() => { setFormConfig(configApp || {}); setModalConfigAberto(true); vibrarLeve(); }} 
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
              >
                ⚙️ Editar Destaque da Semana
              </button>
            </div>
          )}

        </div>
      </PullToRefresh>
    </>
  );
}