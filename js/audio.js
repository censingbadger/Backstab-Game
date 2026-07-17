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

  /* ---------- Music: a looping lead melody + bassline + drums per level ----------
     Notes are MIDI numbers (0 = rest); each level gets its own song + mood. */
  function nf(m) { return m > 0 ? 440 * Math.pow(2, (m - 69) / 12) : 0; }
  function schedNoise(dur, gain, type, ff, when) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = ff;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(musicGain); src.start(when);
  }
  function perc(kind, when) {
    if (!ctx) return;
    if (kind === 'k') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, when); o.frequency.exponentialRampToValueAtTime(48, when + 0.12);
      g.gain.setValueAtTime(0.5, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.15);
      o.connect(g); g.connect(musicGain); o.start(when); o.stop(when + 0.17);
    } else if (kind === 'h') schedNoise(0.035, 0.09, 'highpass', 6500, when);
    else if (kind === 's') schedNoise(0.13, 0.16, 'lowpass', 3200, when);
  }

  // lead: MIDI melody (16 steps) · bass: MIDI (low) · drum: k=kick h=hat s=snare
  const TRACKS = {
    menu:   { tempo: 230, wave: 'triangle', lead: [69,0,72,76, 74,0,72,0, 69,0,76,74, 72,0,67,0], bass: [45,41,48,43], drum: 'k-h-s-h-' },
    map:    { tempo: 250, wave: 'triangle', lead: [67,71,74,71, 72,74,76,74, 79,76,74,72, 71,69,67,0], bass: [43,40,48,50], drum: 'k-hhk-h-' },
    battle: { tempo: 190, wave: 'square', lead: [69,69,76,69, 72,72,76,72, 74,74,77,74, 76,72,69,0], bass: [45,45,45,45,41,41,48,43], drum: 'k-hkk-h-' },
    shop:   { tempo: 240, wave: 'triangle', spark: true, lead: [72,76,79,76, 77,79,81,79, 84,81,79,77, 76,74,72,0], bass: [48,53,55,50], drum: 'k-h-k-h-' },
    boss:   { tempo: 175, wave: 'sawtooth', bassWave: 'sawtooth', lead: [57,57,58,57, 60,58,57,0, 55,55,56,55, 57,58,60,63], bass: [38,38,39,38,36,36,43,41], drum: 'kk-hks-k' },

    dead_cliffs:       { tempo: 300, wave: 'sine', bassWave: 'sine', lead: [64,0,0,67, 0,64,0,62, 60,0,0,64, 0,0,59,0], bass: [40,0,45,0,43,0,40,0], drum: 'k---s---' },
    barren_grasslands: { tempo: 250, wave: 'triangle', lead: [67,69,71,72, 74,72,71,69, 67,69,67,64, 62,64,67,0], bass: [43,43,48,50], drum: 'k-h-k-hh' },
    dark_forest:       { tempo: 220, wave: 'sawtooth', bassWave: 'triangle', lead: [64,66,67,64, 62,64,60,62, 59,60,62,59, 57,0,64,0], bass: [40,40,41,43,38,38,45,40], drum: 'k--hk-s-' },
    toxic_temple:      { tempo: 280, wave: 'square', bassWave: 'sine', spark: true, lead: [62,63,66,62, 68,66,63,62, 61,63,62,0, 66,63,62,0], bass: [38,38,44,38], drum: 'k---h--s' },
    shatter_coast:     { tempo: 210, wave: 'sine', spark: true, lead: [72,76,79,84, 79,76,72,76, 77,81,84,81, 79,76,72,0], bass: [48,48,53,50], drum: 'k-h-kh-h' },
    sandcastle:        { tempo: 190, wave: 'square', spark: true, lead: [72,72,76,76, 79,79,76,0, 74,74,77,77, 79,76,74,72], bass: [48,48,55,50], drum: 'k-hkk-h-' },
    knife_mountain:    { tempo: 260, wave: 'triangle', lead: [57,64,69,64, 67,72,76,72, 69,76,81,76, 74,69,64,0], bass: [45,45,52,50,41,41,48,43], drum: 'k--sk--s' },
    desolate_dunes:    { tempo: 240, wave: 'sawtooth', lead: [64,65,64,67, 65,64,62,60, 64,65,67,65, 64,62,60,64], bass: [40,40,41,40], drum: 'k-h-k-hh' },
    secret:            { tempo: 300, wave: 'sawtooth', bassWave: 'sawtooth', lead: [57,0,58,0, 60,0,58,0, 56,0,57,0, 63,60,58,57], bass: [36,0,37,0,41,0,43,0], drum: 'k-------' },

    /* ---- ACT TWO: every era gets its own song (auto-picked when act === 2) ---- */
    // The Time Map — clockwork ticking and wide, wondering leaps through time.
    act2_map:              { tempo: 240, wave: 'triangle', spark: true, lead: [69,0,74,0, 76,0,81,0, 79,74,76,72, 69,0,64,0], bass: [45,0,52,0, 50,0,45,0], drum: 'k-h-h-h-' },
    // Resurrected wardens — a heavier, meaner boss anthem than Act 1's.
    act2_boss:             { tempo: 165, wave: 'sawtooth', bassWave: 'sawtooth', lead: [50,50,53,50, 56,55,53,0, 50,50,53,55, 56,58,60,56], bass: [38,38,38,38, 34,34,36,36], drum: 'kk-skh-k' },
    // Cretaceous Coast — primal pentatonic stomps and jungle toms.
    act2_dead_cliffs:      { tempo: 230, wave: 'square', bassWave: 'sine', lead: [57,0,60,62, 64,0,62,60, 57,0,60,57, 55,0,57,0], bass: [33,33,38,36], drum: 'k-k-s-k-' },
    // The Old West — a horseback gallop with a jaunty frontier whistle.
    act2_barren_grasslands:{ tempo: 215, wave: 'triangle', spark: true, lead: [64,0,64,66, 67,0,67,0, 69,67,66,64, 62,0,64,0], bass: [40,40,47,45], drum: 'k-hk-hk-' },
    // Present Day — driving city rock on overdriven squares.
    act2_dark_forest:      { tempo: 200, wave: 'square', lead: [69,69,0,69, 72,71,69,0, 67,67,0,67, 71,69,67,0], bass: [45,45,45,45, 43,43,47,47], drum: 'k-hks-hh' },
    // Pyramids of Egypt — a winding hijaz melody deep in the tomb.
    act2_toxic_temple:     { tempo: 260, wave: 'square', bassWave: 'sine', spark: true, lead: [62,63,66,67, 69,70,69,67, 66,63,62,63, 66,62,0,0], bass: [38,38,45,43], drum: 'k--hk--s' },
    // Atlantis — slow glassy arpeggios drifting like light through deep water.
    act2_shatter_coast:    { tempo: 320, wave: 'sine', spark: true, lead: [64,0,69,0, 71,0,76,0, 74,71,69,0, 66,0,64,0], bass: [45,0,50,0], drum: 'k---h---' },
    // Pompeii — a doom march under the volcano.
    act2_sandcastle:       { tempo: 220, wave: 'sawtooth', bassWave: 'sawtooth', lead: [57,0,57,58, 57,0,55,0, 53,0,53,55, 57,55,53,52], bass: [33,33,33,33, 36,36,34,34], drum: 'k-k-s-k-' },
    // The Ice Age — sparse, icy bell tones over slow mammoth stomps.
    act2_knife_mountain:   { tempo: 300, wave: 'sine', spark: true, lead: [76,0,0,74, 0,0,71,0, 72,0,0,69, 0,0,64,0], bass: [40,0,45,0, 43,0,38,0], drum: 'k-----s-' },
    // The Dawn of Time — a low primordial rumble crawling out of the magma.
    act2_desolate_dunes:   { tempo: 210, wave: 'sawtooth', bassWave: 'sawtooth', lead: [45,46,45,48, 50,48,46,45, 45,46,48,50, 53,50,48,46], bass: [33,33,32,32], drum: 'kk--k-s-' },
    // The End of Time — cold machine arpeggios climbing toward the finale.
    act2_secret:           { tempo: 170, wave: 'square', bassWave: 'sawtooth', lead: [57,60,64,69, 57,60,64,69, 56,59,63,68, 58,61,65,70], bass: [33,0,33,0, 31,0,35,0], drum: 'k-h-k-hk' },
  };

  function playMusic(name) {
    ensure();
    // In Act 2, any screen or region with an `act2_` variant plays that instead —
    // the whole soundtrack shifts when you travel through time.
    const key = (typeof currentAct === 'function' && currentAct() === 2 && TRACKS['act2_' + name]) ? 'act2_' + name : name;
    if (currentTrack === key) return;
    currentTrack = key;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    const tr = TRACKS[key] || TRACKS.battle;
    if (!tr || !ctx) return;
    let step = 0;
    const stepMs = tr.tempo, lead = tr.lead, bass = tr.bass, drum = tr.drum || '';
    musicTimer = setInterval(() => {
      if (!ctx || STATE.muted) return;
      const now = ctx.currentTime;
      const lm = lead[step % lead.length];
      if (lm > 0) { tone(nf(lm), stepMs / 1000 * 0.9, tr.wave || 'triangle', now, 0.11, musicGain); if (tr.spark) tone(nf(lm) * 2, 0.05, 'sine', now, 0.03, musicGain); }
      const bm = bass[step % bass.length];
      if (bm > 0) tone(nf(bm), stepMs / 1000 * 1.4, tr.bassWave || 'triangle', now, 0.22, musicGain);
      if (drum) { const dc = drum[step % drum.length]; if (dc !== '-' && dc !== ' ') perc(dc, now); }
      step++;
    }, stepMs);
  }

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    currentTrack = null;
  }

  return { resume, setMuted, sfx, playMusic, stopMusic,
           get isMuted() { return STATE.muted; },
           get track() { return currentTrack; } };
})();
