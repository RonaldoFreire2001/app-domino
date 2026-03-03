import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

function App() {
  // --- ESTADOS ---
  const [fila, setFila] = useState([]);
  const [usuarioLogado, setUsuarioLogado] = useState(''); 
  const [inputLogin, setInputLogin] = useState('');
  const [preferencia, setPreferencia] = useState('Qualquer');
  const [loading, setLoading] = useState(false);

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    const loginSalvo = localStorage.getItem('paf1_login');
    if (loginSalvo) setUsuarioLogado(loginSalvo);
    carregarFila();
    const intervalo = setInterval(carregarFila, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const carregarFila = async () => {
    try {
      const res = await axios.get(`${API_URL}/fila`);
      setFila(res.data);
    } catch (err) { console.error("Erro ao carregar fila:", err); }
  };

  // --- LÓGICA DE USUÁRIO ---
  const realizarLogin = () => {
    if (!inputLogin.trim()) return alert("Digite seu Login!");
    const nomeOficial = inputLogin.trim().toUpperCase();
    localStorage.setItem('paf1_login', nomeOficial);
    setUsuarioLogado(nomeOficial);
  };

  const fazerLogout = () => {
    if (window.confirm("Sair desta conta?")) {
      localStorage.removeItem('paf1_login');
      setUsuarioLogado('');
      setInputLogin('');
    }
  };

  // --- AÇÕES DO JOGO ---
  const entrarNaFila = async () => {
    if (!usuarioLogado) return alert("Faça login primeiro!");
    setLoading(true);
    try {
      await axios.post(`${API_URL}/fila`, { nome: usuarioLogado, preferencia });
      alert("Sucesso! Você está na fila.");
      carregarFila();
    } catch (err) {
      alert("❌ " + (err.response?.data?.error || "Erro ao entrar"));
    } finally { setLoading(false); }
  };

  const finalizarPartida = async (mesa) => {
    const senha = prompt(`Senha ADM - Finalizar Mesa ${mesa}:`);
    if (!senha) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/finalizar/${mesa}`, {}, { headers: { 'x-admin-key': senha } });
      carregarFila();
    } catch (err) { alert("Senha incorreta"); }
    finally { setLoading(false); }
  };

  const removerJogador = async (id, nome) => {
    const senha = prompt(`Senha ADM - Remover ${nome}:`);
    if (!senha) return;
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/fila/${id}`, { headers: { 'x-admin-key': senha } });
      carregarFila();
    } catch (err) { alert("Erro ao remover"); }
    finally { setLoading(false); }
  };

  const mudarPreferencia = async (id, nome) => {
    const nova = prompt(`Mudar ${nome} para: (1) Mesa 1, (2) Mesa 2, (Q) Qualquer`, "Q");
    if (!nova) return;
    let mesaFormatada = nova === "1" ? "Mesa 1" : nova === "2" ? "Mesa 2" : "Qualquer";
    const senha = prompt("Senha ADM para confirmar:");
    if (!senha) return;
    try {
      await axios.patch(`${API_URL}/fila/${id}`, { novaPreferencia: mesaFormatada }, { headers: { 'x-admin-key': senha } });
      carregarFila();
    } catch (err) { alert("Erro na atualização"); }
  };

  // --- FILTROS ---
  const mesa1 = fila.filter(j => j.mesa_atual === 1);
  const mesa2 = fila.filter(j => j.mesa_atual === 2);
  const espera = fila.filter(j => j.mesa_atual === 0);

  // --- VISUAL ---
  return (
    <div className="container">
      <header style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ color: 'white' }}>🀄DOMINÓ DO PAF1</h1>
        {usuarioLogado && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px 15px', borderRadius: '20px', color: 'white' }}>
            <span>👤 <strong>{usuarioLogado}</strong></span>
            <button onClick={fazerLogout} style={{ background: 'none', border: '1px solid white', color: 'white', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '5px', cursor: 'pointer' }}>Trocar</button>
          </div>
        )}
      </header>

      {!usuarioLogado ? (
        <div className="card-domino">
          <h2 style={{ marginTop: 0, color: '#212121' }}>BEM-VINDO</h2>
          <input 
            type="text" 
            placeholder="Seu Nome de Usuário" 
            value={inputLogin} 
            onChange={(e) => setInputLogin(e.target.value)}
            style={{ width: '100%', padding: '15px', boxSizing: 'border-box', marginBottom: '15px', fontSize: '1.1rem', borderRadius: '8px', border: '2px solid #ccc' }}
          />
          <button onClick={realizarLogin} style={{ width: '100%', padding: '15px', backgroundColor: '#212121', color: 'white', fontSize: '1rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            ACESSAR MESA 🔐
          </button>
        </div>
      ) : (
        <>
          <div className="card-domino" style={{ borderLeft: '8px solid #4caf50' }}>
            <h3 style={{ marginTop: 0, color: '#212121' }}>PEDIR LUGAR</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select value={preferencia} onChange={(e) => setPreferencia(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px' }}>
                <option value="Qualquer">Qualquer Mesa</option>
                <option value="Mesa 1">Mesa 1</option>
                <option value="Mesa 2">Mesa 2</option>
              </select>
              <button onClick={entrarNaFila} disabled={loading} style={{ flex: 1, padding: '10px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                {loading ? '...' : 'JOGAR'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
            {[1, 2].map(num => {
              const mesa = num === 1 ? mesa1 : mesa2;
              return (
                <div key={num} className="card-domino" style={{ padding: '10px', minHeight: '180px', color: '#212121' }}>
                  <h4 style={{ margin: '0 0 10px 0', borderBottom: '2px solid #ddd' }}>MESA {num}</h4>
                  {mesa.map(j => (
                    <div key={j.id} style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>⚪ {j.nome}</span>
                      <button onClick={() => removerJogador(j.id, j.nome)} style={{ background: 'none', border: 'none', color: '#f44336', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
                    </div>
                  ))}
                  {mesa.length === 4 && (
                    <button onClick={() => finalizarPartida(num)} style={{ width: '100%', marginTop: '10px', backgroundColor: 'black', color: 'white', fontSize: '0.7rem', padding: '8px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                      🏁 FECHAR
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="card-domino" style={{ color: '#212121' }}>
            <h3 style={{ marginTop: 0 }}>⏳ ESPERA ({espera.length})</h3>
            {espera.map((j, i) => (
              <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                <span>
                  <b style={{ color: '#2e7d32' }}>{i + 1}º</b> {j.nome}
                  {j.ja_jogou_hoje && <span title="Já jogou hoje" style={{ marginLeft: '5px' }}>⭐</span>}
                </span>
                <div>
                  <button onClick={() => mudarPreferencia(j.id, j.nome)} style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', marginRight: '10px' }}>✏️</button>
                  <button onClick={() => removerJogador(j.id, j.nome)} style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer' }}>❌</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;