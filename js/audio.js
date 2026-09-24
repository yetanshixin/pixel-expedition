/* ===== Web Audio 合成 8-bit 音效与循环 BGM（零外部文件） ===== */

const Audio = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  let bgmTimer = null;
  let nextTime = 0;

  try { muted = localStorage.getItem('tfg_muted') === '1'; } catch (e) {}

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  }

  function note(freq, t0, dur, type, vol) {
    const c = ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  function noise(t0, dur, vol, cutoff) {
    const c = ensure();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff || 1000;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  function sfx(name) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime;
    switch (name) {
      case 'click': note(660, t, 0.08, 'square', 0.12); note(880, t + 0.05, 0.06, 'square', 0.08); break;
      case 'select': note(523, t, 0.1, 'square', 0.12); note(784, t + 0.07, 0.1, 'square', 0.1); break;
      case 'hit': noise(t, 0.12, 0.4, 1600); note(120, t, 0.12, 'square', 0.22); note(70, t + 0.01, 0.1, 'sine', 0.28); break;
      case 'skill': noise(t, 0.1, 0.3, 2400); note(160, t, 0.16, 'sawtooth', 0.2); note(320, t + 0.05, 0.16, 'sawtooth', 0.15); note(480, t + 0.1, 0.18, 'square', 0.12); break;
      case 'big': noise(t, 0.15, 0.4, 1200); note(90, t, 0.18, 'sawtooth', 0.25); note(50, t + 0.02, 0.15, 'sine', 0.3); break;
      case 'boom': noise(t, 0.3, 0.5, 900); note(60, t, 0.25, 'sine', 0.35); note(45, t + 0.02, 0.2, 'sine', 0.3); break;
      case 'heal': [523, 659, 784].forEach((f, i) => note(f, t + i * 0.08, 0.14, 'triangle', 0.15)); break;
      case 'victory': [523, 659, 784, 1047].forEach((f, i) => note(f, t + i * 0.12, 0.22, 'square', 0.14)); break;
      case 'defeat': [392, 330, 262, 196].forEach((f, i) => note(f, t + i * 0.16, 0.26, 'sawtooth', 0.14)); break;
      case 'reward': [659, 880, 1109].forEach((f, i) => note(f, t + i * 0.09, 0.16, 'triangle', 0.14)); break;
      case 'super': [659, 880, 1175].forEach((f, i) => note(f, t + i * 0.07, 0.14, 'square', 0.16)); note(1319, t + 0.21, 0.2, 'square', 0.14); break;
    }
  }

  function startBgm() {
    const c = ensure();
    if (!c || bgmTimer) return;
    nextTime = c.currentTime + 0.1;
    const steps = 8, stepDur = 0.21;
    const bass = [110, 110, 87.31, 98, 110, 110, 130.81, 82.41];
    const lead = [440, 523, 659, 784, 659, 523, 587, 659];

    function bar() {
      if (!bgmTimer) return;
      for (let i = 0; i < steps; i++) {
        const t = nextTime + i * stepDur;
        note(bass[i], t, stepDur * 0.9, 'triangle', 0.1);
        note(lead[i], t, stepDur * 0.5, 'square', 0.06);
      }
      nextTime += steps * stepDur;
      bgmTimer = setTimeout(bar, Math.max(50, (steps * stepDur - 0.15) * 1000));
    }
    bar();
  }

  function stopBgm() {
    if (bgmTimer) { clearTimeout(bgmTimer); bgmTimer = null; }
  }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('tfg_muted', muted ? '1' : '0'); } catch (e) {}
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }

  function isMuted() { return muted; }

  return { unlock, sfx, startBgm, stopBgm, toggleMute, isMuted };
})();
