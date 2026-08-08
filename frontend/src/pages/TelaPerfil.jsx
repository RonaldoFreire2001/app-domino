import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import toast from 'react-hot-toast';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import CardCompartilhar from '../CardCompartilhar';

const API_URL = 'https://app-domino.onrender.com';

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

const AvatarSimples = ({ url, nome, tamanho = '35px' }) => {
  const [erro, setErro] = useState(false);
  const inicial = nome ? String(nome).charAt(0).toUpperCase() : 'U';
  const hash = [...String(nome || 'A')].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const corFundo = `hsl(${hash % 360}, 30%, 40%)`; 
  if (url && !erro && String(url).length > 10) {
      return <img src={url} alt={nome} onError={() => setErro(true)} style={{ width: tamanho, height: tamanho, borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFFFFF', flexShrink: 0 }} />;
  }
  return <div style={{ width: tamanho, height: tamanho, borderRadius: '50%', backgroundColor: corFundo, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 'bold', border: '2px solid #FFFFFF', flexShrink: 0, fontSize: '0.8rem' }}>{inicial}</div>;
};

export default function TelaPerfil() {
  const [usuario, setUsuario] = useState(null);
  const [usuarioCompletoRanking, setUsuarioCompletoRanking] = useState(null);
  const [minhaPosicao, setMinhaPosicao] = useState('--'); 
  const [statsDetalhadas, setStatsDetalhadas] = useState(null);
  const [usuariosCadastrados, setUsuariosCadastrados] = useState([]);
  const [mostrarPainelProva, setMostrarPainelProva] = useState(false);
  
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [novoNome, setNovoNome] = useState('');

  const [buscaTop10, setBuscaTop10] = useState('');
  const [mostrarBuscaTop10, setMostrarBuscaTop10] = useState(false);
  const [modalTop10Aberto, setModalTop10Aberto] = useState(false);
  const [top10Selecionado, setTop10Selecionado] = useState(null); 
  const [modoEdicaoTop10, setModoEdicaoTop10] = useState(false);
  const [meuTop10Temporario, setMeuTop10Temporario] = useState([]);
  const [authTop10, setAuthTop10] = useState({ nome: '', pin: '' });
  const [termoBuscaTop10, setTermoBuscaTop10] = useState('');

  useEffect(() => {
    const salvo = localStorage.getItem('@DominoPAF:user');
    if (salvo) {
      const user = JSON.parse(salvo);
      setUsuario(user);
      setNovoNome(user.nome);
      carregarStatsDetalhadas(user.id);
      carregarUsuarios();
      carregarRankingCompleto(user);
    }
  }, []);

  const vibrarLeve = async () => { try { await Haptics.impact({ style: ImpactStyle.Light }); } catch(e){} };
  
  const fazerLogout = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e){}
    if (window.confirm("Deseja realmente sair da sua sessão do PAF1?")) {
      toast.loading("Saindo do sistema...", { duration: 1000 });
      setTimeout(() => { localStorage.removeItem('@DominoPAF:user'); window.location.href = '/'; }, 800);
    }
  };

  const carregarUsuarios = async () => {
    try { const res = await axios.get(`${API_URL}/jogadores-cadastrados`); setUsuariosCadastrados(res.data || []); } 
    catch (e) {}
  };

  const carregarRankingCompleto = async (currentUser) => {
    try {
      const resRanking = await axios.get(`${API_URL}/ranking?t=${new Date().getTime()}`);
      const listaRanking = Array.isArray(resRanking.data) ? resRanking.data : (resRanking.data?.data || []);
      
      const rankingOrdenado = [...listaRanking].map(j => {
        const vits = j.vitorias || 0;
        const jogos = j.partidas_jogadas || 0;
        const derrotas = Math.max(0, jogos - vits);
        const pts = (vits * 3) - derrotas;
        return { ...j, pts, derrotas, vitorias: vits, partidas_jogadas: jogos };
      }).filter(j => j.vitorias > 0).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        return a.partidas_jogadas - b.partidas_jogadas;
      });

      const pos = rankingOrdenado.findIndex(u => u.nome?.trim().toLowerCase() === currentUser.nome?.trim().toLowerCase());
      setMinhaPosicao(pos !== -1 ? pos + 1 : '--');
      
      const meuJogador = rankingOrdenado.find(j => j.nome?.trim().toLowerCase() === currentUser.nome?.trim().toLowerCase());
      
      if (meuJogador) {
        setUsuarioCompletoRanking(meuJogador);
      } else {
        setUsuarioCompletoRanking({ ...currentUser, vitorias: 0, partidas_jogadas: 0 });
      }

    } catch (e) {
      setUsuarioCompletoRanking({ ...currentUser, vitorias: 0, partidas_jogadas: 0 });
    }
  };

  const carregarStatsDetalhadas = async (userId) => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API_URL}/estatisticas-detalhadas/${userId}?t=${new Date().getTime()}`);
      setStatsDetalhadas(res.data);
    } catch (e) {}
  };

  const trocarFotoExistente = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast.loading("Processando imagem...", { id: 'img-upload' });
    comprimirImagem(file, 200, async (fotoLeve) => {
      try {
        await axios.post(`${API_URL}/atualizar-foto`, { nome: usuario.nome, pin: usuario.pin, foto: fotoLeve });
        const userAtualizado = { ...usuario, avatar_url: fotoLeve };
        setUsuario(userAtualizado); localStorage.setItem('@DominoPAF:user', JSON.stringify(userAtualizado));
        toast.success("Foto atualizada com sucesso!", { id: 'img-upload' });
      } catch (error) { toast.error("Erro de processamento de imagem.", { id: 'img-upload' }); }
    });
  };

  const salvarNovoNome = async () => {
    if(!novoNome.trim()) return toast.error("Nome não pode ficar vazio.");
    const toastId = toast.loading("Atualizando nome...");
    try {
      await axios.post(`${API_URL}/atualizar-perfil`, { id: usuario.id, nome: novoNome.trim(), pin: usuario.pin, foto: usuario.avatar_url });
      const userAtualizado = { ...usuario, nome: novoNome.trim() };
      setUsuario(userAtualizado); localStorage.setItem('@DominoPAF:user', JSON.stringify(userAtualizado));
      toast.success("Nome atualizado!", { id: toastId });
      setEditandoPerfil(false);
    } catch (error) { toast.error("Erro ao atualizar nome.", { id: toastId }); }
  };

  const abrirTop10De = async (idJogador, nomeJogador) => {
    vibrarLeve();
    try {
        const response = await axios.get(`${API_URL}/ver-top10/${idJogador}`);
        setTop10Selecionado({ donoNome: nomeJogador, lista: response.data });
        if (usuario && idJogador === usuario.id) {
            setMeuTop10Temporario(response.data.map(j => j.id));
            setAuthTop10({ nome: usuario.nome, pin: usuario.pin });
        } else {
            setMeuTop10Temporario([]); setAuthTop10({ nome: '', pin: '' });
        }
        setModalTop10Aberto(true);
    } catch (err) { toast.error("Erro ao buscar o Top 10."); }
  };

  const toggleJogadorTop10 = (id) => {
      vibrarLeve();
      if (meuTop10Temporario.includes(id)) { setMeuTop10Temporario(meuTop10Temporario.filter(jId => jId !== id)); } 
      else {
          if (meuTop10Temporario.length < 10) setMeuTop10Temporario([...meuTop10Temporario, id]);
          else toast.error("Você só pode escolher 10 jogadores.");
      }
  };

  const salvarMeuTop10 = async () => {
      vibrarLeve();
      if (!authTop10.nome || !authTop10.pin) return toast.error("Preencha o seu nome e PIN!");
      const toastId = toast.loading("Salvando lista...");
      try {
          await axios.post(`${API_URL}/salvar-top10`, { nome: authTop10.nome, pin: authTop10.pin, listaIds: meuTop10Temporario });
          toast.success("Top 10 salvo com sucesso!", { id: toastId });
          setModoEdicaoTop10(false); setModalTop10Aberto(false);
      } catch (err) { toast.error(err.response?.data?.error || "Erro ao salvar.", { id: toastId }); }
  };

  if (!usuario) return <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>Carregando perfil...</div>;

  const inicial = usuario.nome ? String(usuario.nome).charAt(0).toUpperCase() : 'U';
  const hash = [...String(usuario.nome || 'A')].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const corFundo = `hsl(${hash % 360}, 30%, 40%)`; 
  
  const temFotoCustomizada = usuario.avatar_url && !usuario.avatar_url.includes('ui-avatars') && !usuario.avatar_url.includes('dicebear');

  const chartData = statsDetalhadas?.auditoriaLista ? 
    statsDetalhadas.auditoriaLista.slice(0, 15).reverse().map((partida, idx) => {
      const valorBase = partida.resultado === 'VITÓRIA' ? 100 : 20; 
      return { name: `P${idx+1}`, Momento: valorBase, Status: partida.resultado };
    }) : [];

  return (
    <div style={{ backgroundColor: '#F9FAFB', minHeight: '100vh', padding: '30px 20px 100px 20px', fontFamily: 'Inter, sans-serif' }}>
      
      <header style={{ marginBottom: '25px' }}>
        <h2 style={{ color: '#0F172A', margin: '0 0 5px 0', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Visão Geral</h2>
        <p style={{ color: '#64748B', margin: 0, fontSize: '0.85rem' }}>Estatísticas e conquistas</p>
      </header>

      <div style={{ position: 'relative', backgroundColor: '#FFFFFF', padding: '35px 20px', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', marginBottom: '30px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45px', background: 'linear-gradient(135deg, #991B1B, #7F1D1D)' }}></div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: corFundo, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px', border: '4px solid #FFFFFF', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
             {usuario.avatar_url && String(usuario.avatar_url).length > 10 ? (
               <img src={usuario.avatar_url} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
             ) : (
               <span style={{ color: '#FFF', fontWeight: '700', fontSize: '2.5rem' }}>{inicial}</span>
             )}
          </div>
          {/* BOTÃO DA CÂMERA EM SVG */}
          <label htmlFor="input-foto-perfil" style={{ position: 'absolute', bottom: '15px', right: 0, backgroundColor: '#0F172A', color: '#FFF', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '2px solid #FFF', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', padding: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          </label>
          <input type="file" id="input-foto-perfil" accept="image/*" style={{ display: 'none' }} onChange={trocarFotoExistente} />
        </div>
        
        {editandoPerfil ? (
          <div style={{ display: 'flex', gap: '8px', zIndex: 2, marginTop: '5px' }}>
            <input type="text" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '1rem', fontWeight: '700', color: '#0F172A', width: '150px' }} />
            
            {/* BOTÃO DE CONFIRMAR EM SVG */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={salvarNovoNome} style={{ background: '#10B981', color: '#FFF', border: 'none', borderRadius: '8px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </motion.button>
            
            {/* BOTÃO DE CANCELAR EM SVG */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => {setEditandoPerfil(false); setNovoNome(usuario.nome);}} style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '8px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </motion.button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2, marginTop: '5px' }}>
            <h3 style={{ margin: 0, color: '#0F172A', fontSize: '1.3rem', fontWeight: '800' }}>{usuario.nome}</h3>
            
            {/* BOTÃO DE EDITAR EM SVG */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => {
                if(!temFotoCustomizada) return toast.error("Adicione uma foto real antes de alterar o nome!");
                setEditandoPerfil(true);
              }} 
              style={{ background: 'rgba(15,23,42,0.05)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </motion.button>
          </div>
        )}

        <span style={{ color: '#991B1B', fontSize: '0.75rem', fontWeight: '700', backgroundColor: '#FEF2F2', padding: '4px 12px', borderRadius: '20px', zIndex: 2, marginTop: '10px', border: '1px solid #FECACA' }}>Conta Autenticada</span>
      </div>

      {chartData.length > 0 && (
        <div style={{ backgroundColor: '#FFFFFF', padding: '25px 20px 20px 20px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', marginBottom: '30px' }}>
          <h3 style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>MOMENTUM</h3>
          <p style={{ color: '#64748B', fontSize: '0.75rem', marginBottom: '20px' }}>Desempenho nas últimas {chartData.length} partidas</p>
          <div style={{ width: '100%', height: '140px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMomento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#991B1B" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#991B1B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }} labelStyle={{ display: 'none' }} formatter={(value, name, props) => [props.payload.Status, 'Resultado']} />
                <Area type="monotone" dataKey="Momento" stroke="#991B1B" strokeWidth={3} fillOpacity={1} fill="url(#colorMomento)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {statsDetalhadas && (
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '1rem', color: '#0F172A', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#991B1B' }}>|</span> DESEMPENHO EM MESA
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            
            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <p style={{ fontSize: '0.65rem', color: '#64748B', margin: '0 0 8px 0', fontWeight: '700', textTransform: 'uppercase' }}>FASE ATUAL</p>
              <p style={{ fontSize: '1.4rem', fontWeight: '800', color: '#059669', margin: '0 0 2px 0' }}>{statsDetalhadas.maiorStreakV} <span style={{fontSize: '0.7rem', color: '#94A3B8', fontWeight: '500'}}>vits</span></p>
              <p style={{ fontSize: '0.7rem', color: '#64748B', margin: 0 }}>Jejum: {statsDetalhadas.maiorStreakD} D</p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
               <p style={{ fontSize: '0.65rem', color: '#64748B', margin: '0 0 8px 0', fontWeight: '700', textTransform: 'uppercase' }}>MESA DE CONFORTO</p>
               <p style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0F172A', margin: '0 0 2px 0' }}>Mesa {statsDetalhadas.mesaFavorita}</p>
               <p style={{ fontSize: '0.7rem', color: '#64748B', margin: 0 }}>Palco favorito</p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
               <p style={{ fontSize: '0.65rem', color: '#64748B', margin: '0 0 8px 0', fontWeight: '700', textTransform: 'uppercase' }}>MAIOR ALGOZ</p>
               <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F172A', margin: '0 0 2px 0', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuariosCadastrados.find(u => u.id === statsDetalhadas.carrascoId)?.nome || "Ninguém"}</p>
               <p style={{ fontSize: '0.7rem', color: '#DC2626', margin: 0, fontWeight: '600' }}>{statsDetalhadas.qtdCarrasco} derrotas</p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
               <p style={{ fontSize: '0.65rem', color: '#64748B', margin: '0 0 8px 0', fontWeight: '700', textTransform: 'uppercase' }}>MAIOR FREGUÊS</p>
               <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F172A', margin: '0 0 2px 0', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuariosCadastrados.find(u => u.id === statsDetalhadas.freguesId)?.nome || "Nenhum"}</p>
               <p style={{ fontSize: '0.7rem', color: '#0284C7', margin: 0, fontWeight: '600' }}>{statsDetalhadas.qtdFregues} vitórias</p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
               <p style={{ fontSize: '0.65rem', color: '#64748B', margin: '0 0 8px 0', fontWeight: '700', textTransform: 'uppercase' }}>DUPLA DE OURO</p>
               <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F172A', margin: '0 0 2px 0', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuariosCadastrados.find(u => u.id === statsDetalhadas.melhorParceiroId)?.nome || "Ninguém"}</p>
               <p style={{ fontSize: '0.7rem', color: '#059669', margin: 0, fontWeight: '600' }}>{statsDetalhadas.qtdMelhorParceiro} vits juntos</p>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
               <p style={{ fontSize: '0.65rem', color: '#64748B', margin: '0 0 8px 0', fontWeight: '700', textTransform: 'uppercase' }}>ZICA DA MESA</p>
               <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F172A', margin: '0 0 2px 0', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuariosCadastrados.find(u => u.id === statsDetalhadas.piorParceiroId)?.nome || "Ninguém"}</p>
               <p style={{ fontSize: '0.7rem', color: '#D97706', margin: 0, fontWeight: '600' }}>{statsDetalhadas.qtdPiorParceiro} derrotas</p>
            </div>

            <motion.div 
              whileTap={{ scale: 0.95 }}
              onClick={() => abrirTop10De(usuario.id, usuario.nome)}
              style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '2px solid #991B1B', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 10px rgba(153, 27, 27, 0.1)' }}
            >
               <p style={{ fontSize: '0.7rem', color: '#991B1B', margin: '0 0 4px 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>MEU TOP 10</p>
               <p style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0F172A', margin: '0 0 2px 0' }}>Montar Lista</p>
            </motion.div>

          </div>

          <div style={{ marginTop: '25px', position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Pesquisar o Top 10 de outro jogador..." 
              value={buscaTop10} 
              onChange={(e) => { setBuscaTop10(e.target.value); setMostrarBuscaTop10(true); }} 
              onFocus={() => setMostrarBuscaTop10(true)} 
              onBlur={() => setTimeout(() => setMostrarBuscaTop10(false), 200)}
              style={{ width: '100%', padding: '16px 20px', borderRadius: '12px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} 
            />
            {mostrarBuscaTop10 && buscaTop10.trim() !== '' && (
              <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight: '160px', overflowY: 'auto', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', zIndex: 10, marginTop: '5px', boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}>
                {usuariosCadastrados.filter(u => u.nome.toLowerCase().includes(buscaTop10.toLowerCase())).map(u => (
                  <div 
                    key={u.id} 
                    onClick={() => { abrirTop10De(u.id, u.nome); setBuscaTop10(''); setMostrarBuscaTop10(false); }} 
                    style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', color: '#0F172A', fontSize: '0.85rem', fontWeight: '600', textTransform: 'capitalize' }}
                  >
                    {u.nome}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button 
              onClick={() => { setMostrarPainelProva(!mostrarPainelProva); vibrarLeve(); }} 
              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', fontWeight: '600' }}
            >
              {mostrarPainelProva ? "Ocultar histórico de auditoria" : "Dúvidas nas estatísticas? Clique aqui"}
            </button>
          </div>

          {mostrarPainelProva && (
            <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '16px', marginTop: '15px', border: '1px solid #E2E8F0', maxHeight: '300px', overflowY: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <h4 style={{ color: '#0F172A', margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase' }}>Histórico Auditável</h4>
              <p style={{ color: '#64748B', fontSize: '0.7rem', margin: '0 0 15px 0', lineHeight: '1.5' }}>Exibindo apenas partidas da "Era Moderna".</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {statsDetalhadas.auditoriaLista?.map((item) => {
                  const getNomeJogador = (id) => usuariosCadastrados.find(u => u.id === id)?.nome || 'Anônimo';
                  const parceiro = item.resultado === 'VITÓRIA' 
                    ? (item.v1 === usuario.id ? getNomeJogador(item.v2) : getNomeJogador(item.v1))
                    : (item.d1 === usuario.id ? getNomeJogador(item.d2) : getNomeJogador(item.d1));
                  
                  const adversarios = item.resultado === 'VITÓRIA'
                    ? [getNomeJogador(item.d1), getNomeJogador(item.d2)].filter(Boolean).join(' & ')
                    : [getNomeJogador(item.v1), getNomeJogador(item.v2)].filter(Boolean).join(' & ');

                  return (
                    <div key={item.index} style={{ fontSize: '0.75rem', padding: '12px 15px', backgroundColor: '#F8FAFC', borderRadius: '8px', borderLeft: item.resultado === 'VITÓRIA' ? '3px solid #10B981' : '3px solid #EF4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: '#0F172A', fontWeight: '600' }}>Com: <span style={{ textTransform: 'capitalize' }}>{parceiro || 'Solo'}</span></span>
                        <span style={{ color: '#64748B' }}>{item.resultado === 'VITÓRIA' ? 'Contra: ' : 'Apanhou de: '}<span style={{ textTransform: 'capitalize' }}>{adversarios}</span></span>
                      </div>
                      <span style={{ color: item.resultado === 'VITÓRIA' ? '#10B981' : '#EF4444', fontWeight: '800', fontSize: '0.7rem', letterSpacing: '0.5px' }}>{item.resultado}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO DO CARD OFICIAL */}
      {statsDetalhadas && usuarioCompletoRanking && (
        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          <CardCompartilhar 
            jogador={usuarioCompletoRanking}
            posicaoRanking={minhaPosicao}
            streak={statsDetalhadas.maiorStreakV}
            fregues={usuariosCadastrados.find(u => u.id === statsDetalhadas.freguesId)?.nome}
            melhorParceiro={usuariosCadastrados.find(u => u.id === statsDetalhadas.melhorParceiroId)?.nome}
          />
        </div>
      )}

      <motion.button 
        whileTap={{ scale: 0.95 }}
        onClick={fazerLogout}
        style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'rgba(153, 27, 27, 0.05)', color: '#991B1B', fontWeight: '700', border: '1px solid rgba(153, 27, 27, 0.2)', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '30px' }}
      >
        Sair da Conta
      </motion.button>

      <AnimatePresence>
        {modalTop10Aberto && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', boxSizing: 'border-box' }}>
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  style={{ backgroundColor: '#FFFFFF', padding: '25px', borderRadius: '24px', width: '100%', maxWidth: '450px', border: '1px solid #E2E8F0', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, color: '#0F172A', fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {modoEdicaoTop10 ? "Montar Meu Top 10" : `Top 10 de ${top10Selecionado?.donoNome}`}
                        </h2>
                        {/* BOTÃO DE FECHAR MODAL EM SVG */}
                        <button onClick={() => { setModalTop10Aberto(false); setModoEdicaoTop10(false); vibrarLeve(); }} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0, display: 'flex' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    {!modoEdicaoTop10 && (
                        <>
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {!top10Selecionado || top10Selecionado.lista.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#64748B', marginTop: '30px', fontSize: '0.85rem' }}>Lista ainda não montada.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {top10Selecionado.lista.map((j, index) => {
                                            const isOuro = index === 0; const isPrata = index === 1; const isBronze = index === 2;
                                            return (
                                                <div key={j.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', backgroundColor: isOuro ? '#FEF3C7' : isPrata ? '#F1F5F9' : isBronze ? '#FFEDD5' : '#FFFFFF', borderRadius: '12px', border: `1px solid ${isOuro ? '#FDE68A' : isPrata ? '#E2E8F0' : isBronze ? '#FED7AA' : '#E2E8F0'}` }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                        <span style={{ fontSize: '1rem', fontWeight: '800', color: isOuro ? '#D97706' : isPrata ? '#64748B' : isBronze ? '#C2410C' : '#94A3B8', width: '25px', textAlign: 'center' }}>{index + 1}º</span>
                                                        <AvatarSimples url={j.avatar_url} nome={j.nome} tamanho="35px" />
                                                        <span style={{ color: '#0F172A', fontWeight: isOuro ? '800' : '600', textTransform: 'capitalize', fontSize: '0.85rem' }}>{j.nome}</span>
                                                    </div>
                                                    <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '700' }}>{j.vitorias} V</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            
                            {usuario && top10Selecionado?.donoNome === usuario.nome && (
                                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #E2E8F0' }}>
                                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setModoEdicaoTop10(true); vibrarLeve(); }} style={{ width: '100%', background: '#0F172A', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Editar Meu Top 10
                                    </motion.button>
                                </div>
                            )}
                        </>
                    )}

                    {modoEdicaoTop10 && (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <input type="text" placeholder="Nome" value={authTop10.nome} disabled style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#F1F5F9', color: '#64748B', fontSize: '0.85rem', outline: 'none' }} />
                                <input type="password" placeholder="PIN" maxLength="4" value={authTop10.pin} disabled style={{ width: '80px', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#F1F5F9', color: '#64748B', textAlign: 'center', fontSize: '0.85rem', outline: 'none' }} />
                            </div>

                            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {meuTop10Temporario.map((id, index) => {
                                    const j = usuariosCadastrados.find(u => u.id === id);
                                    if (!j) return null;
                                    return (
                                        <div key={j.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ color: '#94A3B8', fontSize: '0.8rem', width: '20px', fontWeight: '800' }}>{index + 1}º</span>
                                                <AvatarSimples url={j.avatar_url} nome={j.nome} tamanho="30px" />
                                                <span style={{ color: '#0F172A', fontSize: '0.85rem', fontWeight: '600' }}>{j.nome}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {index > 0 && (
                                                    // BOTÃO DE SUBIR (SETA) EM SVG
                                                    <button onClick={() => {
                                                        const novaLista = [...meuTop10Temporario];
                                                        [novaLista[index], novaLista[index - 1]] = [novaLista[index - 1], novaLista[index]];
                                                        setMeuTop10Temporario(novaLista);
                                                        vibrarLeve();
                                                    }} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A', borderRadius: '6px', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                                                    </button>
                                                )}
                                                {/* BOTÃO DE REMOVER DO TOP 10 EM SVG */}
                                                <button onClick={() => toggleJogadorTop10(j.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: '6px', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ marginTop: '15px', borderTop: '1px solid #E2E8F0', paddingTop: '15px' }}>
                                <input type="text" placeholder="Procurar jogador..." value={termoBuscaTop10} onChange={e => setTermoBuscaTop10(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', marginBottom: '10px', boxSizing: 'border-box', outline: 'none', fontSize: '0.85rem' }} />
                                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                    {usuariosCadastrados
                                        .filter(j => j.nome.toLowerCase().includes(termoBuscaTop10.toLowerCase()) && !meuTop10Temporario.includes(j.id))
                                        .map(j => (
                                            <div key={j.id} onClick={() => toggleJogadorTop10(j.id)} style={{ padding: '10px', color: '#64748B', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', fontSize: '0.85rem', fontWeight: '600' }}>
                                                + {j.nome}
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                <button onClick={() => { setModoEdicaoTop10(false); vibrarLeve(); }} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Voltar</button>
                                <button onClick={salvarMeuTop10} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#0F172A', color: '#FFFFFF', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem', textTransform: 'uppercase' }}>Salvar Ordem</button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}