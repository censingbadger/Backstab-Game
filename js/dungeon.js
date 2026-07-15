/* ============================================================
   BACK STAB — Dead Cliffs Dungeon (Minecraft Dungeons style)
   Isometric 2.5D action crawler. Move with WASD/arrows (or the
   touch joystick), swing your equipped weapon at swarming skeletons
   and zombies. Clear 50 enemies to summon the Giant Zombie mini-boss.
   ============================================================ */

const ISO = { TW: 64, TH: 32 };          // tile width / height (screen px)
const DUN = {
  KILLS_TARGET: 50,
  MAX_ENEMIES: 9,                         // concurrent swarm size
};

let DUNGEON = null;

/* ---------- tiny helpers ---------- */
function isoToScreen(fx, fy) {
  return { x: (fx - fy) * (ISO.TW / 2), y: (fx + fy) * (ISO.TH / 2) };
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.hypot(dx, dy); }

/* ---------- sprite cache: rasterize the SVG characters to images ---------- */
const SpriteCache = {};
function getSprite(key, fighter, facing) {
  const id = key + (facing < 0 ? '_l' : '_r');
  if (SpriteCache[id]) return SpriteCache[id];
  // Standalone SVG images REQUIRE the xmlns namespace and an intrinsic size,
  // otherwise the browser won't rasterize them onto the canvas.
  let svg = characterSVG(fighter, { facing })
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120" ');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  SpriteCache[id] = img;
  return img;
}

/* ============================================================
   START / STOP
   ============================================================ */
function startDungeon(regionId) {
  Audio2.resume();
  Audio2.playMusic('battle');

  const W = 62, H = 62;                    // map size in tiles
  const HALF = 3.1;                        // half-width of the walkable trail

  // A winding cliff trail: carve a corridor along a polyline; everything
  // else is chasm (void), so you follow a path with drops on both sides.
  const WP = [
    [8, 12], [8, 28], [22, 32], [22, 16], [38, 14],
    [40, 32], [28, 42], [42, 50], [54, 54],
  ];
  const path = buildPath(WP);              // { samples:[{x,y,cum}], length, step }

  const tiles = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const dp = distToPath(x + 0.5, y + 0.5, path);
      // wider clearings at the start and the boss arena (last waypoint)
      const nearStart = dist(x + 0.5, y + 0.5, WP[0][0], WP[0][1]) < 4.5;
      const nearBoss = dist(x + 0.5, y + 0.5, WP[WP.length - 1][0], WP[WP.length - 1][1]) < 6.5;
      row.push(dp <= HALF || nearStart || nearBoss ? 'ground' : 'void');
    }
    tiles.push(row);
  }

  // props scattered on the trail + along its rim
  const props = [];
  const kinds = ['tomb', 'bone', 'rock', 'rock', 'tree', 'skull', 'torch'];
  for (let i = 0; i < 150; i++) {
    const x = 2 + Math.floor(rand(i * 7.1) * (W - 4));
    const y = 2 + Math.floor(rand(i * 3.7 + 2) * (H - 4));
    if (tiles[y][x] !== 'ground') continue;
    if (dist(x + 0.5, y + 0.5, WP[0][0], WP[0][1]) < 3) continue;
    props.push({ x: x + 0.5, y: y + 0.5, kind: kinds[i % kinds.length], seed: i });
  }

  // checkpoints spaced along the path
  const checkpoints = [0.24, 0.46, 0.68, 0.88].map((f, idx) => {
    const s = sampleAtCum(path, f * path.length);
    return { x: s.x, y: s.y, reached: false, idx: idx + 1 };
  });

  const hero = {
    fx: WP[0][0], fy: WP[0][1], r: 0.42,
    facing: 1, faceAngle: Math.PI / 2,      // faceAngle in world radians
    // A dungeon gauntlet needs a big health bar (Minecraft-Dungeons style),
    // so the hero gets a much larger pool than a 1-on-1 arena fight.
    hp: STATE.maxHearts + 5, maxhp: STATE.maxHearts + 5, hurtInvulnUntil: 0,
    attackReadyAt: 0, dodgeUntil: 0, dodgeReadyAt: 0,
    hurtUntil: 0, swingUntil: 0, moving: false, animT: 0,
  };

  DUNGEON = {
    regionId, W, H, tiles, props, path, checkpoints,
    hero,
    enemies: [], drops: [], fx: [],
    kills: 0, spawned: 0, target: DUN.KILLS_TARGET,
    boss: null, bossIntro: false,
    over: false, outcome: null,
    cam: { x: 0, y: 0 },
    keys: {}, mouse: { x: 0, y: 0, down: false }, joy: { active: false, dx: 0, dy: 0 },
    attackHeld: false,
    lastT: performance.now(), raf: null,
    spawnTimer: 0,
  };

  buildDungeonDOM();
  bindDungeonInput();
  DUNGEON.raf = requestAnimationFrame(dungeonLoop);
}

// deterministic pseudo-random (no Date/Math.random reliance for layout)
function rand(seed) { const s = Math.sin(seed * 127.1 + 11.7) * 43758.5453; return s - Math.floor(s); }

/* Sample a polyline of waypoints into dense points with cumulative distance. */
function buildPath(WP) {
  const step = 0.4; const samples = [{ x: WP[0][0], y: WP[0][1], cum: 0 }]; let cum = 0;
  for (let i = 0; i < WP.length - 1; i++) {
    const x0 = WP[i][0], y0 = WP[i][1], x1 = WP[i + 1][0], y1 = WP[i + 1][1];
    const segLen = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(segLen / step));
    for (let k = 1; k <= n; k++) {
      const tt = k / n;
      cum += segLen / n;
      samples.push({ x: x0 + (x1 - x0) * tt, y: y0 + (y1 - y0) * tt, cum });
    }
  }
  return { samples, length: cum, step };
}
function distToPath(px, py, path) {
  let m = 1e9; const s = path.samples;
  for (let i = 0; i < s.length; i++) { const dx = s[i].x - px, dy = s[i].y - py; const d2 = dx * dx + dy * dy; if (d2 < m) m = d2; }
  return Math.sqrt(m);
}
function sampleAtCum(path, c) {
  const s = path.samples; c = clamp(c, 0, path.length);
  return s[clamp(Math.round(c / path.step), 0, s.length - 1)];
}
function nearestSampleIndex(fx, fy) {
  const s = DUNGEON.path.samples; let bi = 0, m = 1e9;
  for (let i = 0; i < s.length; i++) { const dx = s[i].x - fx, dy = s[i].y - fy; const d2 = dx * dx + dy * dy; if (d2 < m) { m = d2; bi = i; } }
  return bi;
}

function stopDungeon() {
  if (!DUNGEON) return;
  if (DUNGEON.raf) cancelAnimationFrame(DUNGEON.raf);
  unbindDungeonInput();
  DUNGEON = null;
}

/* ============================================================
   DOM: canvas + HUD + touch controls
   ============================================================ */
function buildDungeonDOM() {
  const el = app();
  el.className = 'screen screen-dungeon';
  el.innerHTML = `
    <canvas id="dun-canvas"></canvas>
    <div class="dun-hud">
      <div class="dun-top">
        <button class="btn-icon" id="dun-quit" title="Leave">‹</button>
        <div id="dun-hearts" class="dun-hearts"></div>
        <div class="dun-obj">
          <span class="obj-label">Enemies defeated</span>
          <div class="obj-bar"><div id="obj-fill" class="obj-fill"></div></div>
          <span id="obj-count" class="obj-count">0 / ${DUN.KILLS_TARGET}</span>
        </div>
      </div>
      <div id="boss-bar" class="boss-bar hidden">
        <div class="boss-name">THE BRUTE</div>
        <div class="boss-track"><div id="boss-fill" class="boss-fill"></div></div>
      </div>
      <div id="dun-weapon" class="dun-weapon"></div>
    </div>
    <div class="dun-touch">
      <div id="joy" class="joy"><div id="joy-knob" class="joy-knob"></div></div>
      <div class="touch-btns">
        <button class="tbtn heal" id="t-heal">❤️</button>
        <button class="tbtn dodge" id="t-dodge">💨</button>
        <button class="tbtn attack" id="t-attack">🗡️</button>
      </div>
    </div>
    <div id="dun-banner" class="dun-banner"></div>
  `;
  const canvas = document.getElementById('dun-canvas');
  resizeDungeonCanvas();
  updateDungeonHUD();
}

function resizeDungeonCanvas() {
  const canvas = document.getElementById('dun-canvas');
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  DUNGEON.dpr = dpr;
}

/* ============================================================
   INPUT
   ============================================================ */
function bindDungeonInput() {
  const d = DUNGEON;
  d._kd = e => {
    d.keys[e.key.toLowerCase()] = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key === ' ') heroAttack();
    if (e.key.toLowerCase() === 'shift') heroDodge();
    if (e.key.toLowerCase() === 'q') heroHeal();
  };
  d._ku = e => { d.keys[e.key.toLowerCase()] = false; };
  const canvas = document.getElementById('dun-canvas');
  d._mm = e => {
    const r = canvas.getBoundingClientRect();
    d.mouse.x = e.clientX - r.left; d.mouse.y = e.clientY - r.top;
    d.mouse.movedAt = performance.now();
  };
  d._md = e => { d.mouse.down = true; heroAttack(); };
  d._mu = e => { d.mouse.down = false; };
  d._rs = () => resizeDungeonCanvas();

  window.addEventListener('keydown', d._kd);
  window.addEventListener('keyup', d._ku);
  canvas.addEventListener('mousemove', d._mm);
  canvas.addEventListener('mousedown', d._md);
  window.addEventListener('mouseup', d._mu);
  window.addEventListener('resize', d._rs);

  document.getElementById('dun-quit').addEventListener('click', () => { Audio2.sfx.click(); exitDungeon(); });
  const atk = document.getElementById('t-attack');
  const holdOn = e => { e.preventDefault(); d.attackHeld = true; heroAttack(); };
  const holdOff = e => { d.attackHeld = false; };
  atk.addEventListener('touchstart', holdOn, { passive: false });
  atk.addEventListener('touchend', holdOff);
  atk.addEventListener('mousedown', holdOn);
  atk.addEventListener('mouseup', holdOff);
  document.getElementById('t-dodge').addEventListener('click', heroDodge);
  document.getElementById('t-heal').addEventListener('click', heroHeal);
  bindJoystick();
}

function bindJoystick() {
  const d = DUNGEON;
  const joy = document.getElementById('joy'), knob = document.getElementById('joy-knob');
  const R = 46;
  function setFrom(t) {
    const r = joy.getBoundingClientRect();
    let dx = t.clientX - (r.left + r.width / 2);
    let dy = t.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    const cl = Math.min(len, R);
    dx = dx / len; dy = dy / len;
    knob.style.transform = `translate(${dx * cl}px,${dy * cl}px)`;
    d.joy.active = true; d.joy.dx = dx; d.joy.dy = dy;
  }
  function reset() { d.joy.active = false; d.joy.dx = d.joy.dy = 0; knob.style.transform = 'translate(0,0)'; }
  d._js = e => { e.preventDefault(); setFrom(e.touches ? e.touches[0] : e); };
  joy.addEventListener('touchstart', d._js, { passive: false });
  joy.addEventListener('touchmove', d._js, { passive: false });
  joy.addEventListener('touchend', reset);
  d._joyReset = reset;
}

function unbindDungeonInput() {
  const d = DUNGEON;
  window.removeEventListener('keydown', d._kd);
  window.removeEventListener('keyup', d._ku);
  window.removeEventListener('mouseup', d._mu);
  window.removeEventListener('resize', d._rs);
}

/* ============================================================
   HERO ACTIONS
   ============================================================ */
function heroAttack() {
  const d = DUNGEON; if (!d || d.over) return;
  const now = performance.now();
  const h = d.hero;
  if (now < h.attackReadyAt) return;
  const w = WEAPONS[STATE.equippedWeapon];
  let durab = STATE.weapons[STATE.equippedWeapon] || 0;
  const bare = durab <= 0;
  const speed = 480;
  h.attackReadyAt = now + speed;
  h.swingUntil = now + 200;
  if (!bare) { STATE.weapons[STATE.equippedWeapon] = durab - 1; }
  const dmg = bare ? 2 : w.damage;
  Audio2.sfx.hit();

  // Aim toward mouse (desktop) or facing (touch)
  updateHeroFacing();
  const reach = 1.7, arc = Math.PI * 0.7;
  let hitAny = false;
  d.enemies.forEach(e => {
    if (e.dead) return;
    const a = Math.atan2(e.fy - h.fy, e.fx - h.fx);
    let da = Math.abs(a - h.faceAngle);
    if (da > Math.PI) da = Math.PI * 2 - da;
    if (dist(h.fx, h.fy, e.fx, e.fy) <= reach + e.r && da <= arc / 2) {
      damageEnemy(e, dmg);
      hitAny = true;
    }
  });
  // hit boss too
  if (d.boss && !d.boss.dead) {
    const b = d.boss;
    if (dist(h.fx, h.fy, b.fx, b.fy) <= reach + b.r) { damageEnemy(b, dmg); hitAny = true; }
  }
  spawnSwingFx(h);
  updateWeaponHUD();
}

function heroDodge() {
  const d = DUNGEON; if (!d || d.over) return;
  const now = performance.now();
  if (now < d.hero.dodgeReadyAt) return;
  d.hero.dodgeUntil = now + 300;
  d.hero.dodgeReadyAt = now + 900;
  Audio2.sfx.dodge();
}

function heroHeal() {
  const d = DUNGEON; if (!d || d.over) return;
  // use the best healing item available
  const order = ['mushroom_stew', 'cliff_shrooms', 'apple'];
  const id = order.find(i => (STATE.items[i] || 0) > 0);
  if (!id) { banner('No food!', 500); return; }
  const it = ITEMS[id];
  d.hero.hp = Math.min(d.hero.maxhp, d.hero.hp + it.heal);
  STATE.items[id]--; if (STATE.items[id] <= 0) delete STATE.items[id];
  Audio2.sfx.heal();
  spawnFloatText(d.hero.fx, d.hero.fy, '+' + it.heal + '❤', '#57cc66');
  updateDungeonHUD();
}

function updateHeroFacing() {
  const d = DUNGEON, h = d.hero;
  if (d.joy.active) {
    // joystick screen dir -> world dir
    const wr = screenDirToWorld(d.joy.dx, d.joy.dy);
    h.faceAngle = Math.atan2(wr.y, wr.x);
  } else if (d.mouse.movedAt && performance.now() - d.mouse.movedAt < 1500) {
    // aim at the mouse if it moved recently (hero is centred on screen)
    const cx = (document.getElementById('dun-canvas').clientWidth) / 2;
    const cy = (document.getElementById('dun-canvas').clientHeight) / 2;
    const sdx = d.mouse.x - cx, sdy = d.mouse.y - cy;
    const wr = screenDirToWorld(sdx, sdy);
    h.faceAngle = Math.atan2(wr.y, wr.x);
  }
  // else: keep the facing set by movement (keyboard-only play)
  h.facing = Math.cos(h.faceAngle) >= 0 ? 1 : -1;
}

// convert a screen-space direction to world (tile) space direction
function screenDirToWorld(sx, sy) {
  // inverse of iso: fx = sx/TW + sy/TH ; fy = sy/TH - sx/TW
  const fx = sx / ISO.TW + sy / ISO.TH;
  const fy = sy / ISO.TH - sx / ISO.TW;
  const len = Math.hypot(fx, fy) || 1;
  return { x: fx / len, y: fy / len };
}

/* ============================================================
   DAMAGE / DROPS
   ============================================================ */
function damageEnemy(e, dmg) {
  e.hp -= dmg;
  e.hurtUntil = performance.now() + 160;
  spawnFloatText(e.fx, e.fy - 0.2, '-' + dmg, e.boss ? '#ffcf3f' : '#ff5c7a');
  if (e.hp <= 0 && !e.dead) killEnemy(e);
}

function killEnemy(e) {
  const d = DUNGEON;
  e.dead = true;
  Audio2.sfx.bighit();
  if (e.boss) return winDungeon();
  d.kills++;
  earn(e.reward || 1);
  gainXp(2);
  // drops: coins always (already earned), sometimes a heart
  if (rand(d.kills * 5.3) < 0.24) d.drops.push({ fx: e.fx, fy: e.fy, kind: 'heart', born: performance.now() });
  spawnPuff(e.fx, e.fy);
  updateDungeonHUD();
  if (d.kills >= d.target && !d.boss && !d.bossIntro) summonBoss();
}

function summonBoss() {
  const d = DUNGEON;
  d.bossIntro = true;
  banner('THE BRUTE APPROACHES...', 2200);
  Audio2.sfx.lose(); // ominous
  setTimeout(() => {
    if (!DUNGEON) return;
    const bd = BOSSES.brute;
    // Spawn on the trail a little ahead of the hero so it looms in on-path.
    const h = d.hero;
    const pi = nearestSampleIndex(h.fx, h.fy);
    const bs = d.path.samples[Math.min(d.path.samples.length - 1, pi + 10)];
    const bx = bs.x, by = bs.y;
    d.boss = {
      boss: true, fighter: bd, art: 'zombie', palette: bd.palette,
      fx: bx, fy: by, r: 0.9, scale: 2.1,
      hp: 260, maxhp: 260, attack: bd.attack, reward: bd.reward,
      speed: 1.5, attackReadyAt: 0, windUntil: 0, hurtUntil: 0, name: bd.name,
    };
    document.getElementById('boss-bar').classList.remove('hidden');
    updateBossHUD();
  }, 2200);
}

/* ============================================================
   SPAWNING
   ============================================================ */
function spawnEnemy() {
  const d = DUNGEON;
  // spawn AHEAD of the hero along the trail, so you fight your way forward
  const pi = nearestSampleIndex(d.hero.fx, d.hero.fy);
  for (let tries = 0; tries < 24; tries++) {
    const ahead = Math.min(d.path.samples.length - 1, pi + 12 + Math.floor(rand(d.spawned * 1.3 + tries) * 16));
    const s = d.path.samples[ahead];
    const ang = rand(d.spawned * 2.3 + tries * 1.7) * Math.PI * 2;
    const rad = rand(d.spawned + tries) * 2.2;
    const fx = clamp(s.x + Math.cos(ang) * rad, 3.5, d.W - 3.5);
    const fy = clamp(s.y + Math.sin(ang) * rad, 3.5, d.H - 3.5);
    if (d.tiles[Math.floor(fy)][Math.floor(fx)] !== 'ground') continue;
    const isSkel = rand(d.spawned * 9.1) < 0.5;
    const base = isSkel ? ENEMIES.skeleton : ENEMIES.zombie;
    d.enemies.push({
      fighter: base, art: base.art, palette: base.palette,
      fx, fy, r: 0.4,
      hp: isSkel ? 8 : 14, maxhp: isSkel ? 8 : 14,
      speed: isSkel ? 2.5 : 1.7,
      attack: isSkel ? 1 : 1, reward: 1,
      facing: -1, attackReadyAt: 0, windUntil: 0, hurtUntil: 0, animT: rand(tries),
    });
    d.spawned++;
    return true;
  }
  return false;
}

/* ============================================================
   MAIN LOOP
   ============================================================ */
function dungeonLoop(t) {
  const d = DUNGEON;
  if (!d) return;
  const dt = Math.min(0.05, (t - d.lastT) / 1000);
  d.lastT = t;
  if (!d.over) updateDungeon(dt, t);
  renderDungeon();
  d.raf = requestAnimationFrame(dungeonLoop);
}

function updateDungeon(dt, t) {
  const d = DUNGEON, h = d.hero;

  /* --- hero movement --- */
  let mvx = 0, mvy = 0;
  if (d.joy.active) { const wr = screenDirToWorld(d.joy.dx, d.joy.dy); mvx = wr.x; mvy = wr.y; }
  else {
    let sx = 0, sy = 0;
    if (d.keys['w'] || d.keys['arrowup']) sy -= 1;
    if (d.keys['s'] || d.keys['arrowdown']) sy += 1;
    if (d.keys['a'] || d.keys['arrowleft']) sx -= 1;
    if (d.keys['d'] || d.keys['arrowright']) sx += 1;
    if (sx || sy) { const wr = screenDirToWorld(sx, sy); mvx = wr.x; mvy = wr.y; }
  }
  const dodging = t < h.dodgeUntil;
  const spd = (dodging ? 8.5 : 4.2);
  h.moving = !!(mvx || mvy);
  if (h.moving) {
    h.animT += dt * 10;
    moveEntity(h, mvx * spd * dt, mvy * spd * dt);
    if (!d.joy.active || true) { /* facing set on attack & below */ }
    // face travel direction when using keyboard/joystick and not aiming with mouse
    if (d.joy.active || d.keys['w'] || d.keys['a'] || d.keys['s'] || d.keys['d'] ||
        d.keys['arrowup'] || d.keys['arrowleft'] || d.keys['arrowdown'] || d.keys['arrowright']) {
      h.faceAngle = Math.atan2(mvy, mvx);
      h.facing = Math.cos(h.faceAngle) >= 0 ? 1 : -1;
    }
  }

  /* --- attack while moving: holding attack keeps swinging (cooldown-gated) --- */
  if (d.attackHeld || d.mouse.down || d.keys[' ']) heroAttack();

  /* --- checkpoints along the trail --- */
  d.checkpoints.forEach(cp => {
    if (!cp.reached && dist(cp.x, cp.y, h.fx, h.fy) < 2.6) {
      cp.reached = true;
      banner('CHECKPOINT ' + cp.idx + ' / ' + d.checkpoints.length, 1300);
      Audio2.sfx.win();
      h.hp = Math.min(h.maxhp, h.hp + 1);   // small reward heal
      updateDungeonHUD();
    }
  });

  /* --- keep the swarm populated (until boss), ramping up with kills --- */
  const swarmCap = Math.min(DUN.MAX_ENEMIES, 3 + Math.floor(d.kills / 7));
  const spawnGap = Math.max(0.55, 1.1 - d.kills * 0.01);
  if (!d.bossIntro && d.enemies.filter(e => !e.dead).length < swarmCap && d.spawned < d.target + 6) {
    d.spawnTimer -= dt;
    if (d.spawnTimer <= 0) { spawnEnemy(); d.spawnTimer = spawnGap; }
  }

  /* --- enemies --- */
  d.enemies.forEach(e => {
    if (e.dead) return;
    e.animT = (e.animT || 0) + dt * 8;
    const dd = dist(e.fx, e.fy, h.fx, h.fy);
    e.facing = h.fx >= e.fx ? 1 : -1;
    if (t < e.windUntil) { /* winding up to strike, hold still */ }
    else if (dd > 0.9) {
      const ux = (h.fx - e.fx) / dd, uy = (h.fy - e.fy) / dd;
      moveEntity(e, ux * e.speed * dt, uy * e.speed * dt);
    } else if (t >= e.attackReadyAt) {
      e.windUntil = t + 240; e.attackReadyAt = t + 1400;
      setTimeout(() => enemyStrikeHero(e), 240);
    }
  });
  d.enemies = d.enemies.filter(e => !e.dead || t - (e.deadAt || (e.deadAt = t)) < 200);

  /* --- boss --- */
  if (d.boss && !d.boss.dead) {
    const b = d.boss;
    const dd = dist(b.fx, b.fy, h.fx, h.fy);
    b.facing = h.fx >= b.fx ? 1 : -1;
    if (t < b.windUntil) {}
    else if (dd > 1.5) { const ux = (h.fx - b.fx) / dd, uy = (h.fy - b.fy) / dd; moveEntity(b, ux * b.speed * dt, uy * b.speed * dt); }
    else if (t >= b.attackReadyAt) {
      b.windUntil = t + 520; b.attackReadyAt = t + 1700;
      banner('SLAM!', 500);
      setTimeout(() => bossSlam(b), 520);
    }
  }

  /* --- drops (hearts) pickup --- */
  d.drops = d.drops.filter(dr => {
    if (dist(dr.fx, dr.fy, h.fx, h.fy) < 0.8) {
      h.hp = Math.min(h.maxhp, h.hp + 0.5);
      Audio2.sfx.heal(); spawnFloatText(h.fx, h.fy, '+½❤', '#57cc66'); updateDungeonHUD();
      return false;
    }
    return t - dr.born < 12000;
  });

  /* --- fx aging --- */
  d.fx = d.fx.filter(f => t - f.born < f.life);

  /* --- camera follows hero --- */
  const s = isoToScreen(h.fx, h.fy);
  d.cam.x = s.x; d.cam.y = s.y;
}

function enemyStrikeHero(e) {
  const d = DUNGEON; if (!d || d.over || e.dead) return;
  const h = d.hero, t = performance.now();
  if (dist(e.fx, e.fy, h.fx, h.fy) > 1.15) return;         // moved away in time
  if (t < h.dodgeUntil) { spawnFloatText(h.fx, h.fy, 'dodge', '#8ff0a0'); return; }
  if (t < h.hurtInvulnUntil) return;                       // brief mercy i-frames
  hurtHero(0.5);
}

function bossSlam(b) {
  const d = DUNGEON; if (!d || d.over || b.dead) return;
  const h = d.hero, t = performance.now();
  shake();
  if (dist(b.fx, b.fy, h.fx, h.fy) > 2.2) return;
  if (t < h.dodgeUntil) { spawnFloatText(h.fx, h.fy, 'dodge!', '#8ff0a0'); return; }
  if (t < h.hurtInvulnUntil) return;
  hurtHero(1.5);
}

function hurtHero(amount) {
  const d = DUNGEON, h = d.hero;
  h.hp = Math.max(0, h.hp - amount);
  const now = performance.now();
  h.hurtUntil = now + 260;
  h.hurtInvulnUntil = now + 800;      // can't be chain-hit by the whole swarm at once
  Audio2.sfx.hurt();
  updateDungeonHUD();
  if (h.hp <= 0) loseDungeon();
}

/* collide-aware movement (block on void + map bounds) */
function moveEntity(ent, dx, dy) {
  const d = DUNGEON;
  const nx = ent.fx + dx, ny = ent.fy + dy;
  if (isWalkable(nx, ent.fy)) ent.fx = nx;
  if (isWalkable(ent.fx, ny)) ent.fy = ny;
}
function isWalkable(fx, fy) {
  const d = DUNGEON;
  if (fx < 3 || fy < 3 || fx > d.W - 3 || fy > d.H - 3) return false;
  return d.tiles[Math.floor(fy)][Math.floor(fx)] === 'ground';
}

/* ============================================================
   RENDER
   ============================================================ */
function renderDungeon() {
  const d = DUNGEON;
  const canvas = document.getElementById('dun-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = d.dpr || 1;
  const W = canvas.width, H = canvas.height;
  const cw = W / dpr, ch = H / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // sky / background
  const sky = ctx.createLinearGradient(0, 0, 0, ch);
  sky.addColorStop(0, '#241a3a'); sky.addColorStop(0.55, '#171029'); sky.addColorStop(1, '#0c0818');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, cw, ch);

  // camera transform: hero centred
  const shakeAmt = d.shakeUntil && performance.now() < d.shakeUntil ? (rand(performance.now()) - 0.5) * 6 : 0;
  const ox = cw / 2 - d.cam.x + shakeAmt;
  const oy = ch / 2 - d.cam.y - 40;

  // ---- draw floor tiles (culled to a window around the hero) ----
  const hx = Math.floor(d.hero.fx), hy = Math.floor(d.hero.fy);
  const RANGE = 15;
  for (let gy = Math.max(0, hy - RANGE); gy <= Math.min(d.H - 1, hy + RANGE); gy++) {
    for (let gx = Math.max(0, hx - RANGE); gx <= Math.min(d.W - 1, hx + RANGE); gx++) {
      const tile = d.tiles[gy][gx];
      if (tile === 'void') continue;
      drawFloorTile(ctx, gx, gy, ox, oy);
    }
  }
  // chasm edge shading: draw void rims after ground for depth
  for (let gy = Math.max(0, hy - RANGE); gy <= Math.min(d.H - 1, hy + RANGE); gy++) {
    for (let gx = Math.max(0, hx - RANGE); gx <= Math.min(d.W - 1, hx + RANGE); gx++) {
      if (d.tiles[gy][gx] === 'ground' && isEdgeTile(gx, gy)) drawCliffEdge(ctx, gx, gy, ox, oy);
    }
  }

  // ---- animated trail flowing forward along the path ----
  drawTrail(ctx, ox, oy);

  // ---- collect depth-sorted sprites (props + entities + drops + checkpoints) ----
  const draws = [];
  d.checkpoints.forEach(cp => draws.push({ z: cp.x + cp.y, kind: 'checkpoint', cp }));
  d.props.forEach(p => { if (Math.abs(p.x - d.hero.fx) < RANGE && Math.abs(p.y - d.hero.fy) < RANGE) draws.push({ z: p.x + p.y, kind: 'prop', p }); });
  d.drops.forEach(dr => draws.push({ z: dr.fx + dr.fy - 0.01, kind: 'drop', dr }));
  d.enemies.forEach(e => { if (!e.dead) draws.push({ z: e.fx + e.fy, kind: 'enemy', e }); });
  if (d.boss && !d.boss.dead) draws.push({ z: d.boss.fx + d.boss.fy, kind: 'enemy', e: d.boss });
  draws.push({ z: d.hero.fx + d.hero.fy, kind: 'hero', h: d.hero });
  draws.sort((a, b) => a.z - b.z);

  draws.forEach(item => {
    if (item.kind === 'prop') drawProp(ctx, item.p, ox, oy);
    else if (item.kind === 'checkpoint') drawCheckpoint(ctx, item.cp, ox, oy);
    else if (item.kind === 'drop') drawDrop(ctx, item.dr, ox, oy);
    else if (item.kind === 'enemy') drawCombatant(ctx, item.e, ox, oy);
    else if (item.kind === 'hero') drawHero(ctx, item.h, ox, oy);
  });

  // floating texts / swing fx
  d.fx.forEach(f => drawFx(ctx, f, ox, oy));

  // vignette
  const vg = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.3, cw / 2, ch / 2, ch * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
}

function isEdgeTile(gx, gy) {
  const d = DUNGEON;
  return d.tiles[gy + 1] && (d.tiles[gy + 1][gx] === 'void' || d.tiles[gy][gx + 1] === 'void');
}

/* Animated golden trail flowing forward along the path from the hero. */
function drawTrail(ctx, ox, oy) {
  const d = DUNGEON, t = performance.now() / 1000;
  const spacing = 1.5, flow = (t * 3) % spacing;
  const pi = nearestSampleIndex(d.hero.fx, d.hero.fy);
  const startCum = Math.max(0, d.path.samples[pi].cum - 1.5);
  for (let c = startCum + flow; c < d.path.length; c += spacing) {
    const s = sampleAtCum(d.path, c);
    if (Math.abs(s.x - d.hero.fx) > 17 || Math.abs(s.y - d.hero.fy) > 17) continue;
    const sc = isoToScreen(s.x, s.y), x = sc.x + ox, y = sc.y + oy;
    const along = c - startCum;
    const fade = clamp(1 - along / 34, 0.18, 1);
    const pulse = 0.4 + 0.35 * Math.sin(t * 5 - c * 0.6);
    const a = fade * (0.55 + pulse * 0.45);
    // soft glow
    ctx.fillStyle = `rgba(255,180,40,${a * 0.35})`;
    ctx.beginPath(); ctx.ellipse(x, y, 13, 6.5, 0, 0, 7); ctx.fill();
    // bright core dot
    ctx.fillStyle = `rgba(255,224,120,${a})`;
    ctx.beginPath(); ctx.ellipse(x, y, 6.5, 3.2, 0, 0, 7); ctx.fill();
  }
}

/* A checkpoint gate along the trail (torches + banner). */
function drawCheckpoint(ctx, cp, ox, oy) {
  const s = isoToScreen(cp.x, cp.y), x = s.x + ox, y = s.y + oy, t = performance.now() / 1000;
  const done = cp.reached;
  // glowing ground ring
  const pr = 0.4 + 0.3 * Math.sin(t * 3 + cp.idx);
  ctx.fillStyle = done ? `rgba(87,204,102,${0.12 * pr})` : `rgba(255,207,63,${0.16 * pr})`;
  ctx.beginPath(); ctx.ellipse(x, y, 26, 13, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = done ? 'rgba(87,204,102,0.8)' : 'rgba(255,207,63,0.75)';
  ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 26, 13, 0, 0, 7); ctx.stroke();
  // torch poles
  [-18, 18].forEach(dx => {
    ctx.strokeStyle = '#5a4028'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + dx, y); ctx.lineTo(x + dx, y - 42); ctx.stroke();
    const fl = 4 + Math.sin(t * 6 + dx) * 2;
    ctx.fillStyle = done ? '#8ff0a0' : '#ffb347'; ctx.beginPath(); ctx.ellipse(x + dx, y - 46, 5, 8 + fl, 0, 0, 7); ctx.fill();
  });
  // banner
  ctx.fillStyle = done ? '#57cc66' : '#c0392b';
  ctx.beginPath(); ctx.moveTo(x - 18, y - 40); ctx.lineTo(x + 18, y - 40); ctx.lineTo(x + 18, y - 27); ctx.lineTo(x, y - 31); ctx.lineTo(x - 18, y - 27); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '900 12px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(done ? '✓' : String(cp.idx), x, y - 31); ctx.textAlign = 'left';
}

function drawFloorTile(ctx, gx, gy, ox, oy) {
  const s = isoToScreen(gx, gy);
  const x = s.x + ox, y = s.y + oy;
  const hw = ISO.TW / 2, hh = ISO.TH / 2;
  // checker of two dead-grey/greenish tones
  const shade = (gx + gy) % 2 === 0 ? '#4a4a54' : '#41414b';
  ctx.beginPath();
  ctx.moveTo(x, y - hh); ctx.lineTo(x + hw, y); ctx.lineTo(x, y + hh); ctx.lineTo(x - hw, y); ctx.closePath();
  ctx.fillStyle = shade; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; ctx.stroke();
  // subtle mossy speckle
  const r = rand(gx * 12.9 + gy * 4.7);
  if (r > 0.86) { ctx.fillStyle = 'rgba(90,120,70,0.25)'; ctx.beginPath(); ctx.ellipse(x + (r - 0.9) * 30, y, 7, 3.5, 0, 0, 7); ctx.fill(); }
}

function drawCliffEdge(ctx, gx, gy, ox, oy) {
  const s = isoToScreen(gx, gy);
  const x = s.x + ox, y = s.y + oy;
  const hw = ISO.TW / 2, hh = ISO.TH / 2, depth = 26;
  // draw rocky side walls dropping into the chasm
  ctx.fillStyle = '#2b2b33';
  ctx.beginPath();
  ctx.moveTo(x - hw, y); ctx.lineTo(x, y + hh); ctx.lineTo(x, y + hh + depth); ctx.lineTo(x - hw, y + depth); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#232329';
  ctx.beginPath();
  ctx.moveTo(x, y + hh); ctx.lineTo(x + hw, y); ctx.lineTo(x + hw, y + depth); ctx.lineTo(x, y + hh + depth); ctx.closePath(); ctx.fill();
}

function drawProp(ctx, p, ox, oy) {
  const s = isoToScreen(p.x, p.y);
  const x = s.x + ox, y = s.y + oy;
  shadowOval(ctx, x, y, 16, 6);
  const r = p.seed;
  switch (p.kind) {
    case 'tomb':
      ctx.fillStyle = '#6b6b76'; roundRectPath(ctx, x - 12, y - 34, 24, 34, 8); ctx.fill();
      ctx.fillStyle = '#565660'; ctx.fillRect(x - 12, y - 6, 24, 6);
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x, y - 12); ctx.moveTo(x - 6, y - 20); ctx.lineTo(x + 6, y - 20); ctx.stroke();
      break;
    case 'rock':
      ctx.fillStyle = '#5a5a64'; ctx.beginPath(); ctx.ellipse(x, y - 8, 16, 12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#6a6a74'; ctx.beginPath(); ctx.ellipse(x - 4, y - 12, 8, 6, 0, 0, 7); ctx.fill();
      break;
    case 'bone':
      ctx.strokeStyle = '#d9d4c4'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 10, y - 2); ctx.lineTo(x + 10, y - 8); ctx.stroke();
      ctx.beginPath(); ctx.arc(x - 10, y - 2, 3, 0, 7); ctx.arc(x + 10, y - 8, 3, 0, 7); ctx.stroke();
      break;
    case 'skull':
      ctx.fillStyle = '#e6e1d2'; ctx.beginPath(); ctx.arc(x, y - 8, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#20242e'; ctx.beginPath(); ctx.arc(x - 3, y - 9, 2, 0, 7); ctx.arc(x + 3, y - 9, 2, 0, 7); ctx.fill();
      ctx.fillRect(x - 2, y - 3, 4, 4);
      break;
    case 'tree':
      ctx.strokeStyle = '#3a2e22'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40);
      ctx.moveTo(x, y - 26); ctx.lineTo(x - 12, y - 36); ctx.moveTo(x, y - 30); ctx.lineTo(x + 13, y - 44); ctx.moveTo(x, y - 18); ctx.lineTo(x + 9, y - 26); ctx.stroke();
      break;
    case 'torch':
      ctx.strokeStyle = '#5a4028'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 30); ctx.stroke();
      const fl = 4 + Math.sin(performance.now() / 90 + r) * 2;
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.ellipse(x, y - 34, 5, 8 + fl, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.ellipse(x, y - 32, 2.5, 4 + fl / 2, 0, 0, 7); ctx.fill();
      break;
  }
}

function drawDrop(ctx, dr, ox, oy) {
  const s = isoToScreen(dr.fx, dr.fy);
  const bob = Math.sin(performance.now() / 200 + dr.fx) * 3;
  const x = s.x + ox, y = s.y + oy - 14 + bob;
  ctx.save(); ctx.translate(x, y); ctx.scale(0.7, 0.7);
  ctx.fillStyle = '#ff3b5c';
  ctx.beginPath();
  ctx.moveTo(0, 8); ctx.bezierCurveTo(-12, -2, -8, -14, 0, -6); ctx.bezierCurveTo(8, -14, 12, -2, 0, 8); ctx.fill();
  ctx.restore();
}

function drawCombatant(ctx, e, ox, oy) {
  const s = isoToScreen(e.fx, e.fy);
  const x = s.x + ox, y = s.y + oy;
  const scale = e.scale || 1;
  shadowOval(ctx, x, y, 20 * scale, 8 * scale);
  const img = getSprite(e.fighter.id, e.fighter, e.facing || -1);
  const hurt = performance.now() < (e.hurtUntil || 0);
  const bob = Math.sin((e.animT || 0)) * 2 * scale;
  const w = 66 * scale, h = 80 * scale;
  if (img.complete && img.naturalWidth) {
    ctx.globalAlpha = hurt ? 0.6 : 1;
    ctx.drawImage(img, x - w / 2, y - h + 10 - bob, w, h);
    ctx.globalAlpha = 1;
  }
  // mini health bar for boss / hurt enemies
  if (e.boss) return drawBossFloatingBar(ctx, e, x, y - h - 4 * scale);
}

function drawHero(ctx, h, ox, oy) {
  const s = isoToScreen(h.fx, h.fy);
  const x = s.x + ox, y = s.y + oy;
  shadowOval(ctx, x, y, 20, 8);
  const img = getSprite('hero', { art: 'hero', palette: {} }, h.facing);
  const bob = h.moving ? Math.sin(h.animT) * 3 : 0;
  const dodging = performance.now() < h.dodgeUntil;
  const hurt = performance.now() < h.hurtUntil;
  const aimScreen = isoDirToScreenAngle(h.faceAngle);
  // weapon drawn BEHIND the body when aiming away (up), in front otherwise
  const behind = Math.sin(aimScreen) < -0.2;
  if (behind) drawHeroWeapon(ctx, h, x, y - 34, aimScreen);
  ctx.save();
  if (dodging) ctx.globalAlpha = 0.5;
  if (hurt) ctx.globalAlpha = 0.6;
  if (img.complete && img.naturalWidth) ctx.drawImage(img, x - 33, y - 70 - bob, 66, 80);
  ctx.restore();
  if (!behind) drawHeroWeapon(ctx, h, x, y - 34 - bob, aimScreen);
}

/* Draw (and animate) the equipped weapon swinging from the hero's hand. */
const SWING_DUR = 200;
function drawHeroWeapon(ctx, h, hx, hy, aimScreen) {
  const now = performance.now();
  const swinging = now < h.swingUntil;
  let ang;
  if (swinging) {
    const p = 1 - (h.swingUntil - now) / SWING_DUR;   // 0..1 through the swing
    ang = aimScreen - 1.15 + p * 2.3;                  // sweep across the aim
    // motion-blur arc
    ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - p)})`;
    ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(hx, hy, 32, aimScreen - 1.15, ang); ctx.stroke();
  } else {
    ang = aimScreen + 0.55;                            // resting pose, held ready
  }
  const art = (WEAPONS[STATE.equippedWeapon] || {}).art || 'knife';
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  drawBladeShape(ctx, art);
  ctx.restore();
}
function drawBladeShape(ctx, art) {
  ctx.lineCap = 'round';
  if (art === 'bow') {
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(14, 0, 12, -1.5, 1.5); ctx.stroke();
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(14, -12); ctx.lineTo(14, 12); ctx.stroke();
    return;
  }
  // handle
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 0); ctx.stroke();
  // cross-guard
  ctx.strokeStyle = '#b98a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(10, 5); ctx.stroke();
  // blade
  const len = art === 'spear' ? 36 : art === 'katana' ? 32 : art === 'sword' ? 27 : 20;
  ctx.strokeStyle = '#e6eef6'; ctx.lineWidth = art === 'spear' ? 4 : 6;
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(10 + len, 0); ctx.stroke();
  // tip
  ctx.fillStyle = '#eef4fb'; ctx.beginPath();
  ctx.moveTo(10 + len, -4); ctx.lineTo(10 + len + 8, 0); ctx.lineTo(10 + len, 4); ctx.closePath(); ctx.fill();
}

function isoDirToScreenAngle(worldAngle) {
  // convert world direction to screen-space angle for drawing the swing
  const wx = Math.cos(worldAngle), wy = Math.sin(worldAngle);
  const sx = (wx - wy) * (ISO.TW / 2);
  const sy = (wx + wy) * (ISO.TH / 2);
  return Math.atan2(sy, sx);
}

function drawBossFloatingBar(ctx, e, x, y) {
  const w = 70, pct = clamp(e.hp / e.maxhp, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2, y, w, 7);
  ctx.fillStyle = '#ff3b5c'; ctx.fillRect(x - w / 2, y, w * pct, 7);
  updateBossHUD();
}

/* small canvas helpers */
function shadowOval(ctx, x, y, rx, ry) { ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }
function roundRectPath(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/* ============================================================
   FX
   ============================================================ */
function spawnFloatText(fx, fy, text, color) { DUNGEON.fx.push({ kind: 'text', fx, fy, text, color, born: performance.now(), life: 700 }); }
function spawnPuff(fx, fy) { DUNGEON.fx.push({ kind: 'puff', fx, fy, born: performance.now(), life: 400 }); }
function spawnSwingFx() {}
function drawFx(ctx, f, ox, oy) {
  const s = isoToScreen(f.fx, f.fy); const age = (performance.now() - f.born) / f.life;
  const x = s.x + ox, y = s.y + oy;
  if (f.kind === 'text') {
    ctx.globalAlpha = 1 - age; ctx.fillStyle = f.color; ctx.font = '900 16px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(f.text, x, y - 44 - age * 24); ctx.globalAlpha = 1;
  } else if (f.kind === 'puff') {
    ctx.globalAlpha = Math.max(0, 1 - age); ctx.fillStyle = '#6a7a5a';
    const rad = Math.max(0, 5 * (1 - age));
    for (let i = 0; i < 6; i++) { const a = i / 6 * 7; ctx.beginPath(); ctx.arc(x + Math.cos(a) * age * 24, y - 20 + Math.sin(a) * age * 14, rad, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
function shake() { DUNGEON.shakeUntil = performance.now() + 260; }

/* ============================================================
   HUD
   ============================================================ */
function updateDungeonHUD() {
  const d = DUNGEON; if (!d) return;
  const hearts = document.getElementById('dun-hearts');
  if (hearts) hearts.innerHTML = renderHearts(d.hero.hp, d.hero.maxhp);
  const fill = document.getElementById('obj-fill');
  const cnt = document.getElementById('obj-count');
  if (fill) fill.style.width = clamp(d.kills / d.target * 100, 0, 100) + '%';
  if (cnt) cnt.textContent = Math.min(d.kills, d.target) + ' / ' + d.target;
  updateWeaponHUD();
}
function updateWeaponHUD() {
  const d = DUNGEON; if (!d) return;
  const el = document.getElementById('dun-weapon'); if (!el) return;
  const w = WEAPONS[STATE.equippedWeapon];
  const dur = STATE.weapons[STATE.equippedWeapon] || 0;
  el.innerHTML = `<span class="dw-name">${w.name}</span>
    <div class="dw-bar"><div class="dw-fill" style="width:${clamp(dur / w.durability * 100, 0, 100)}%"></div></div>`;
}
function updateBossHUD() {
  const d = DUNGEON; if (!d || !d.boss) return;
  const fill = document.getElementById('boss-fill');
  if (fill) fill.style.width = clamp(d.boss.hp / d.boss.maxhp * 100, 0, 100) + '%';
}
function banner(text, ms) {
  const el = document.getElementById('dun-banner'); if (!el) return;
  el.textContent = text; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), ms || 1200);
}

/* ============================================================
   END STATES
   ============================================================ */
function winDungeon() {
  const d = DUNGEON; if (d.over) return;
  d.over = true; d.outcome = 'win';
  const bonus = BOSSES.brute.reward + 40;
  earn(bonus);
  STATE.wins++;
  recordDefeat('brute');
  gainXp(25);
  clearRegion(d.regionId);              // unlock the next region
  saveGame();
  Audio2.sfx.win();
  showDungeonResult(true, bonus);
}
function loseDungeon() {
  const d = DUNGEON; if (d.over) return;
  d.over = true; d.outcome = 'lose';
  STATE.losses++; saveGame();
  Audio2.sfx.lose();
  showDungeonResult(false, 0);
}
function exitDungeon() {
  saveGame();
  stopDungeon();
  showScreen('map');
}
function showDungeonResult(won, bonus) {
  const d = DUNGEON;
  const overlay = document.createElement('div');
  overlay.className = 'result-overlay';
  overlay.innerHTML = `
    <div class="result-card ${won ? 'win' : 'lose'}">
      <h2>${won ? 'CLIFFS CLEARED!' : 'YOU FELL'}</h2>
      ${won ? `
        <p>You battled through the Dead Cliffs and felled <b>The Brute</b>!</p>
        <p class="reward">+${bonus} ${coinSVG()}</p>
        <p class="unlock">🗺️ New region unlocked!</p>
      ` : `
        <p>You were overwhelmed after <b>${d.kills}</b> kills.</p>
        <p class="tip">Tip: keep moving, dodge the swarm, grab hearts, and bring healing food.</p>
      `}
      <div class="result-btns">
        <button class="wide-btn" id="dun-retry">↻ Try again</button>
        <button class="wide-btn ghost" id="dun-home">⌂ Map</button>
      </div>
    </div>`;
  app().appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  const region = d.regionId;
  overlay.querySelector('#dun-retry').addEventListener('click', () => { Audio2.sfx.click(); stopDungeon(); startDungeon(region); });
  overlay.querySelector('#dun-home').addEventListener('click', () => { Audio2.sfx.click(); stopDungeon(); showScreen('map'); });
}
