// src/som.js

// 1. Som de navegação (Pop suave)
export const tocarPop = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.warn("Áudio não suportado no navegador.");
  }
};

// 2. Som de Sucesso/Vitória (Acorde brilhante estilo Apple Pay)
export const tocarVitoria = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Função interna para tocar notas musicais precisas
    const tocarNota = (frequencia, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Tipo 'triangle' dá um brilho cristalino pro som (parece um sino digital)
      osc.type = 'triangle'; 
      osc.frequency.setValueAtTime(frequencia, startTime);
      
      // Volume entra rápido e vai sumindo macio
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const agora = ctx.currentTime;
    
    // Toca 3 notas subindo muito rápido (Dó -> Mi -> Dó Agudo)
    tocarNota(523.25, agora, 0.3);         // Primeira nota curta
    tocarNota(659.25, agora + 0.1, 0.3);   // Segunda nota curta
    tocarNota(1046.50, agora + 0.2, 0.6);  // Terceira nota aguda que dá um "eco" maior
    
  } catch (e) {
    console.warn("Áudio não suportado no navegador.");
  }
};