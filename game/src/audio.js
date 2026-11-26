// Ridge Runner — synthesised sound (one job: WebAudio engine, wind, chimes; no assets).
// Everything is oscillators and filtered noise, started on the first gesture.

export function createAudio() {
  let ctx = null;
  let engineOsc = null; let engineOsc2 = null; let engineGain = null;
  let windSrc = null; let windGain = null; let windFilter = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    // Engine: two detuned saws through a low-pass, gain follows throttle.
    engineGain = ctx.createGain(); engineGain.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 62;
    engineOsc2 = ctx.createOscillator(); engineOsc2.type = 'sawtooth'; engineOsc2.frequency.value = 93;
    const g2 = ctx.createGain(); g2.gain.value = 0.5;
    engineOsc.connect(lp); engineOsc2.connect(g2); g2.connect(lp);
    lp.connect(engineGain); engineGain.connect(ctx.destination);
    engineOsc.start(); engineOsc2.start();
    // Wind: looped noise buffer through a band-pass.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    windSrc = ctx.createBufferSource(); windSrc.buffer = buf; windSrc.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 700; windFilter.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    windSrc.connect(windFilter); windFilter.connect(windGain); windGain.connect(ctx.destination);
    windSrc.start();
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  return {
    start() {
      ensure();
      if (!ctx || started) return;
      started = true;
      if (ctx.state === 'suspended') ctx.resume();
    },
    setEngine(throttle, speedKnots, airborne) {
      if (!ctx || !started) return;
      const rpm = 55 + throttle * 75 + (airborne ? 8 : 0);
      engineOsc.frequency.setTargetAtTime(rpm, ctx.currentTime, 0.08);
      engineOsc2.frequency.setTargetAtTime(rpm * 1.5, ctx.currentTime, 0.08);
      const eng = muted ? 0 : 0.05 + throttle * 0.11;
      engineGain.gain.setTargetAtTime(eng, ctx.currentTime, 0.1);
      const wind = Math.min(1, speedKnots / 160);
      windGain.gain.setTargetAtTime(muted ? 0 : wind * 0.12, ctx.currentTime, 0.15);
      windFilter.frequency.setTargetAtTime(400 + wind * 900, ctx.currentTime, 0.15);
    },
    ring() { tone(880, 0.35, 'sine', 0.22); tone(1318, 0.5, 'sine', 0.16, 0.07); },
    thud() { tone(70, 0.3, 'sine', 0.4); tone(45, 0.4, 'triangle', 0.3, 0.02); },
    crash() { tone(90, 0.8, 'sawtooth', 0.25); tone(55, 1.1, 'sawtooth', 0.2, 0.1); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, 'triangle', 0.2, i * 0.12)); },
    click() { tone(1200, 0.06, 'square', 0.08); },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() { return muted; },
  };
}
