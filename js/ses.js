/* Misket Yarışı — sesler (Web Audio ile üretilir, ses dosyası yok) */
(function () {
  'use strict';
  const Ses = window.Ses = { on: true };
  let ctx = null, master = null, noiseBuf = null, roll = null;

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  // ilk tıklamada ses açılır (tarayıcı kuralı)
  addEventListener('pointerdown', () => { if (init() && ctx.state === 'suspended') ctx.resume(); }, { capture: true });
  addEventListener('keydown', () => { if (init() && ctx.state === 'suspended') ctx.resume(); }, { capture: true });

  const ok = () => Ses.on && ctx && ctx.state === 'running';
  function tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slide = 0) {
    if (!ok()) return;
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol = 0.2, f0 = 1000, f1 = f0, q = 1, when = 0, type = 'bandpass') {
    if (!ok()) return;
    const t = ctx.currentTime + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  // misket çarpması (cam tıkırtısı); güç 0..1, uzaklıkla azalır
  Ses.clack = function (power) {
    if (!ok() || power < 0.03) return;
    const f = 1800 + Math.random() * 1600;
    tone(f, 0.06, 'sine', 0.12 * Math.min(1, power), 0, 0.7); tone(f * 1.51, 0.04, 'triangle', 0.05 * Math.min(1, power));
  };
  Ses.thud = function (power) { if (!ok() || power < 0.05) return; noise(0.12, 0.18 * Math.min(1, power), 300, 120, 0.8, 0, 'lowpass'); };
  // sürekli yuvarlanma sesi (oyuncunun misketi)
  Ses.rolling = function (speed, onGround) {
    if (!ctx) return;
    if (!roll) {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.7; f.frequency.value = 400;
      const g = ctx.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(master); s.start();
      roll = { s, f, g };
    }
    const v = Ses.on && onGround ? Math.min(0.16, speed * 0.016) : 0;
    roll.g.gain.setTargetAtTime(v, ctx.currentTime, 0.08);
    roll.f.frequency.setTargetAtTime(250 + speed * 55, ctx.currentTime, 0.1);
  };
  Ses.stopRolling = function () { if (roll && ctx) roll.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); };

  Ses.beep = n => tone(n > 0 ? 660 : 1320, n > 0 ? 0.16 : 0.45, 'square', 0.12);
  Ses.gate = () => { noise(0.25, 0.25, 2500, 400, 0.6); tone(220, 0.25, 'sawtooth', 0.06, 0, 0.5); };
  Ses.card = () => { tone(880, 0.08, 'triangle', 0.12); tone(1320, 0.1, 'triangle', 0.1, 0.07); };
  Ses.click = () => tone(1200, 0.04, 'triangle', 0.08);
  Ses.buy = () => { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.06)); };
  Ses.fanfare = () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.6 : 0.16, 'square', 0.09, i * 0.13)); Ses.cheer(); };
  Ses.cheer = () => { noise(1.8, 0.12, 1400, 900, 0.4); noise(1.4, 0.08, 2600, 1800, 0.6, 0.2); };
  Ses.sad = () => { [392, 349, 311].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, i * 0.22)); };
  Ses.finishCross = () => { tone(1568, 0.1, 'sine', 0.12); tone(2093, 0.15, 'sine', 0.1, 0.08); };
  Ses.power = function (id, mine) {
    const v = mine ? 1 : 0.45;
    switch (id) {
      case 'turbo': noise(0.7, 0.22 * v, 300, 3000, 1.2); tone(180, 0.6, 'sawtooth', 0.05 * v, 0, 3); break;
      case 'zipla': tone(260, 0.3, 'sine', 0.2 * v, 0, 3.2); break;
      case 'kalkan': [784, 1175, 1568].forEach((f, i) => tone(f, 0.4, 'sine', 0.1 * v, i * 0.05)); break;
      case 'demir': tone(110, 0.5, 'square', 0.1 * v); noise(0.3, 0.15 * v, 800, 200, 2); break;
      case 'hayalet': tone(520, 0.8, 'sine', 0.1 * v, 0, 0.5); tone(527, 0.8, 'sine', 0.1 * v, 0, 0.52); break;
      case 'isinlan': [1047, 1397, 1760, 2349, 2794].forEach((f, i) => tone(f, 0.12, 'triangle', 0.09 * v, i * 0.04)); break;
      case 'balcik': noise(0.35, 0.2 * v, 500, 150, 3, 0, 'lowpass'); tone(140, 0.3, 'sine', 0.12 * v, 0, 0.6); break;
      case 'duvar': noise(0.35, 0.3 * v, 400, 80, 0.7, 0.15, 'lowpass'); tone(70, 0.3, 'sine', 0.25 * v, 0.15); break;
      case 'yavas': tone(400, 0.6, 'triangle', 0.12 * v, 0, 0.35); break;
      case 'kucult': tone(900, 0.4, 'square', 0.07 * v, 0, 0.3); break;
      case 'ruzgar': noise(1.6, 0.2 * v, 400, 1600, 0.8); break;
      case 'bomba': noise(0.9, 0.4 * v, 900, 60, 0.5, 0, 'lowpass'); tone(60, 0.6, 'sine', 0.3 * v, 0, 0.5); break;
    }
  };
  Ses.blocked = () => { tone(1500, 0.12, 'square', 0.08); tone(1000, 0.15, 'square', 0.06, 0.08); };
})();
