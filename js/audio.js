/* ============================================================
   BACK STAB — Audio (Web Audio API, fully procedural)
   Sound effects + simple looping music per screen. No audio files,
   so the game works offline and stays self-contained.
   A mute button toggles everything.
   ============================================================ */

const Audio2 = (function () {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let musicTimer = null;
  let currentTrack = null;

  function ensure() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = STATE.muted ? 0 : 0.9;
      masterGain.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.35;
      musicGain.connect(masterGain);
    } catch (e) { ctx = null; }
  }

  // Browsers suspend audio until a user gesture; resume on demand.
  function resume() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setMuted(m) {
    STATE.muted = m;
    saveGame();
    if (masterGain) masterGain.gain.value = m ? 0 : 0.9;
  }

  function tone(freq, dur, type, when, gain, target) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    const t0 = (when || ctx.currentTime);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.3, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(target || masterGain);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noise(dur, gain, filterFreq) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq || 1200;
    const g = ctx.createGain();
    g.gain.value = gain || 0.3;
    src.connect(f); f.connect(g); g.connect(masterGain);
    src.start();
  }

  /* ---------- Sound effects ---------- */
  const sfx = {
    click()   { resume(); tone(520, 0.08, 'square', 0, 0.18); },
    hover()   { resume(); tone(680, 0.05, 'sine', 0, 0.08); },
    hit()     { resume(); noise(0.14, 0.35, 900); tone(180, 0.12, 'sawtooth', 0, 0.25); },
    bighit()  { resume(); noise(0.22, 0.5, 700); tone(120, 0.2, 'sawtooth', 0, 0.35); },
    block()   { resume(); tone(320, 0.1, 'square', 0, 0.2); noise(0.08, 0.2, 2500); },
    dodge()   { resume(); tone(900, 0.12, 'sine', 0, 0.15); tone(1300, 0.1, 'sine', ctx ? ctx.currentTime + 0.05 : 0, 0.1); },
    special() { resume(); [440, 660, 880, 1100].forEach((f, i) => tone(f, 0.18, 'square', ctx ? ctx.currentTime + i * 0.05 : 0, 0.2)); },
    hurt()    { resume(); tone(220, 0.18, 'sawtooth', 0, 0.3); tone(160, 0.2, 'sawtooth', ctx ? ctx.currentTime + 0.06 : 0, 0.25); },
    coin()    { resume(); tone(880, 0.08, 'square', 0, 0.2); tone(1320, 0.1, 'square', ctx ? ctx.currentTime + 0.06 : 0, 0.18); },
    heal()    { resume(); [523, 659, 784].forEach((f, i) => tone(f, 0.2, 'sine', ctx ? ctx.currentTime + i * 0.08 : 0, 0.2)); },
    win()     { resume(); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', ctx ? ctx.currentTime + i * 0.12 : 0, 0.25)); },
    lose()    { resume(); [400, 340, 280, 200].forEach((f, i) => tone(f, 0.35, 'sawtooth', ctx ? ctx.currentTime + i * 0.14 : 0, 0.22)); },
    crowd()   { resume(); noise(0.5, 0.12, 1800); },
    buy()     { resume(); tone(660, 0.1, 'square', 0, 0.2); tone(990, 0.12, 'square', ctx ? ctx.currentTime + 0.08 : 0, 0.16); },
  };

  /* ---------- Music: simple looping bass + arpeggio per screen ---------- */
  const TRACKS = {
    menu:   { tempo: 500, bass: [110, 110, 146, 98], arp: [220, 277, 330, 277] },
    map:    { tempo: 560, bass: [98, 131, 110, 87],  arp: [262, 330, 392, 330] },
    battle: { tempo: 320, bass: [110, 110, 116, 98], arp: [330, 392, 440, 392] },
    shop:   { tempo: 600, bass: [131, 131, 175, 116],arp: [262, 349, 440, 349] },
  };

  function playMusic(name) {
    ensure();
    if (currentTrack === name) return;
    currentTrack = name;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    const track = TRACKS[name];
    if (!track || !ctx) return;
    let step = 0;
    const stepMs = track.tempo;
    musicTimer = setInterval(() => {
      if (!ctx || STATE.muted) { return; }
      const b = track.bass[step % track.bass.length];
      tone(b, stepMs / 1000 * 0.9, 'triangle', ctx.currentTime, 0.28, musicGain);
      const a = track.arp[step % track.arp.length];
      tone(a, stepMs / 1000 * 0.5, 'square', ctx.currentTime, 0.10, musicGain);
      if (step % 2 === 0) tone(a * 2, 0.08, 'sine', ctx.currentTime, 0.05, musicGain);
      step++;
    }, stepMs);
  }

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    currentTrack = null;
  }

  return { resume, setMuted, sfx, playMusic, stopMusic,
           get isMuted() { return STATE.muted; } };
})();
