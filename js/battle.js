/* ============================================================
   BACK STAB — Arena Battle (side-view 1v1 fighter, MK-style)
   Both fighters share ONE fighting line (fixed depth): move left/right,
   jump for vertical, and always face each other. Weapons are drawn big
   in-hand, hits land with hitstop + shake + sparks, and a living crowd
   swings toward whoever is winning. Footsies, not free-roam.
   ============================================================ */

let BATTLE = null;
const JUMPB_DUR = 620;                 // arena jump duration (ms)
const FLOOR_DEPTH = 0.6;               // the single shared fighting line
const BODY_GAP = 0.2;                  // minimum x separation (bodies never overlap)
const WALLB = 0.92;                    // arena wall (hard x limit / corner)

function clampB(v, a, b) { return v < a ? a : v > b ? b : v; }
function distB(ax, ad, bx, bd) { return Math.hypot((ax - bx), (ad - bd) * 1.3); }

/* Every arena fighter has a signature ranged SPECIAL they hurl at you from a
   distance — a creative power you must DODGE. behavior:
     'shot'  — a straight projectile: JUMP over it (or block) to avoid it.
     'lob'   — arcs to a marked landing spot and bursts: STEP OFF the spot.
     'slick' — a lob that also leaves a lingering hazard puddle: don't stand in it.
   kind drives the visual; speed is world-units/sec (shots) or arc speed (lobs). */
const SPECIALS = {
  skeleton:       { name: 'Bone Toss',      kind: 'bone',    behavior: 'shot',  color: '#ece3c8', speed: 1.6 },
  sandy_skeleton: { name: 'Bone Toss',      kind: 'bone',    behavior: 'shot',  color: '#e6d29a', speed: 1.7 },
  zombie:         { name: 'Bile Spit',      kind: 'goo',     behavior: 'slick', color: '#7fc24a', speed: 1.3 },
  giant_tick:     { name: 'Blood Spit',     kind: 'blood',   behavior: 'shot',  color: '#c0392b', speed: 1.5 },
  mosquito:       { name: 'Stinger',        kind: 'stinger', behavior: 'shot',  color: '#e8e04a', speed: 2.2 },
  angry_peasant:  { name: 'Rock Throw',     kind: 'rock',    behavior: 'lob',   color: '#9a8f80', speed: 1 },
  lumberjack:     { name: 'Axe Hurl',       kind: 'axe',     behavior: 'shot',  color: '#c8ccd2', speed: 1.5 },
  baby_werewolf:  { name: 'Yip Wave',       kind: 'howl',    behavior: 'shot',  color: '#cfd6e6', speed: 1.7 },
  werewolf:       { name: 'Howl Blast',     kind: 'howl',    behavior: 'shot',  color: '#cfd6e6', speed: 1.9 },
  bear:           { name: 'Boulder',        kind: 'rock',    behavior: 'lob',   color: '#7a5230', speed: 1 },
  polar_bear:     { name: 'Snowball',       kind: 'snow',    behavior: 'shot',  color: '#eef4fb', speed: 1.6 },
  mummy:          { name: 'Cursed Skull',   kind: 'skull',   behavior: 'shot',  color: '#b7d98a', speed: 1.5 },
  gooster:        { name: 'Slime Sling',    kind: 'goo',     behavior: 'slick', color: '#57c98a', speed: 1.3 },
  phantom:        { name: 'Spectral Bolt',  kind: 'ghost',   behavior: 'shot',  color: '#c9d6ff', speed: 1.9 },
  colossal_squid: { name: 'Ink Blast',      kind: 'ink',     behavior: 'slick', color: '#7a4a8a', speed: 1.5 },
  pirate:         { name: 'Cannonball',     kind: 'cannon',  behavior: 'lob',   color: '#2a2a2a', speed: 1 },
  swordfish:      { name: 'Water Jet',      kind: 'water',   behavior: 'shot',  color: '#4a90d9', speed: 2.1 },
  crab:           { name: 'Bubble Shot',    kind: 'bubble',  behavior: 'shot',  color: '#8fe0e6', speed: 1.5 },
  yeti:           { name: 'Snowball',       kind: 'snow',    behavior: 'lob',   color: '#eef4fb', speed: 1 },
  icius:          { name: 'Ice Shard',      kind: 'ice',     behavior: 'shot',  color: '#8fd6ff', speed: 2.2 },
  sandworm:       { name: 'Sand Spit',      kind: 'sand',    behavior: 'lob',   color: '#d9a441', speed: 1 },
  // bosses — stronger and, for some, multi-shot volleys
  brute:          { name: 'Ground Pound',   kind: 'shock',   behavior: 'lob',   color: '#8a6a3a', speed: 1, dmgMul: 1.2, radius: 0.22 },
  hexstraw:       { name: 'Crow Swarm',     kind: 'crow',    behavior: 'shot',  color: '#2a2530', speed: 1.7, count: 3 },
  alpha_werewolf: { name: 'Alpha Howl',     kind: 'howl',    behavior: 'shot',  color: '#dfe6f6', speed: 2.0, count: 2 },
  venombane:      { name: 'Venom Bomb',     kind: 'venom',   behavior: 'slick', color: '#9be24a', speed: 1.2, dmgMul: 1.15, radius: 0.2 },
  great_white:    { name: 'Water Torpedo',  kind: 'water',   behavior: 'shot',  color: '#6fb0e0', speed: 2.3, dmgMul: 1.15 },
  crab_king:      { name: 'Bubble Barrage', kind: 'bubble',  behavior: 'shot',  color: '#8fe0e6', speed: 1.7, count: 2 },
  bread_boi:      { name: 'Toast Beam',     kind: 'beam',    behavior: 'shot',  color: '#f0c060', speed: 2.4 },
  dragok:         { name: 'Fireball',       kind: 'fire',    behavior: 'lob',   color: '#ff7a2a', speed: 1, dmgMul: 1.2, radius: 0.2 },
  gorton:         { name: 'Sword Beam',     kind: 'sword',   behavior: 'shot',  color: '#ffe08a', speed: 2.1, dmgMul: 1.15 },
  backstabber:    { name: 'Shadow Daggers', kind: 'shadow',  behavior: 'shot',  color: '#b03050', speed: 2.2, count: 3 },
};
function getSpecial(f) {
  return SPECIALS[f.id] || { name: 'Hurl', kind: 'rock', behavior: 'lob', color: '#9a8f80', speed: 1 };
}

function startBattle(fighterId, regionId, isBoss) {
  const f = getFighter(fighterId);
  if (!f) return;
  Audio2.resume(); Audio2.playMusic(isBoss ? 'boss' : (regionId || 'battle'));
  const pmax = STATE.maxHearts * HP_PER_HEART;
  const emax = Math.round(f.hearts * HP_PER_HEART * 1.15);   // arena foes are a little hardier now

  BATTLE = {
    fighter: f, regionId, isBoss: !!isBoss,
    hero: {
      x: -0.42, depth: FLOOR_DEPTH, z: 0, facing: 1, knockVX: 0,
      hp: pmax, maxhp: pmax,
      attackReadyAt: 0, swingUntil: 0, jumpUntil: 0, jumpReadyAt: 0,
      hurtUntil: 0, hurtInvuln: 0, hurtAt: 0, blocking: false, blockUntil: 0,
      combo: 0, comboUntil: 0, special: 0, strengthUntil: 0, animT: 0, moving: false,
    },
    enemy: {
      x: 0.42, depth: FLOOR_DEPTH, z: 0, facing: -1, knockVX: 0,
      hp: emax, maxhp: emax,
      attackReadyAt: 0, windUntil: 0, swingUntil: 0, state: 'idle',
      hurtUntil: 0, hurtAt: 0, hitstunUntil: 0, stunUntil: 0, blockUntil: 0, backoffUntil: 0, animT: 0, nextDecision: 0,
      special: getSpecial(f), specialReadyAt: 0, specialWind: false,
    },
    projectiles: [], hazards: [],
    favor: clampB(Game.crowd || 60, 20, 80),   // 0..100 = crowd favouring the player
    intensity: 0,                               // recent action -> crowd excitement
    over: false, outcome: null,
    keys: {}, mouse: { x: 0, y: 0, down: false, movedAt: 0 }, joy: { active: false, dx: 0, dy: 0 },
    attackHeld: false, blockHeld: false,
    hitstopUntil: 0, shakeUntil: 0, shakeMag: 0, shakeDur: 1, zoomUntil: 0, zoomDur: 1, flashUntil: 0, flashColor: '#fff',
    fx: [], spectators: buildSpectators(f.name),
    lastT: performance.now(), raf: null,
  };
  buildBattleDOM();
  bindBattleInput();
  BATTLE.enemy.nextDecision = performance.now() + 900;
  BATTLE.enemy.specialReadyAt = performance.now() + 1800;   // first special after a beat
  BATTLE.raf = requestAnimationFrame(battleLoop);
}

function buildSpectators(enemyName) {
  const list = [];
  for (let i = 0; i < 26; i++) list.push({ seed: i, tier: i % 2, sign: null });
  return list;
}

/* ============================================================
   DOM: canvas stage + HUD + controls
   ============================================================ */
function buildBattleDOM() {
  const b = BATTLE, el = app();
  el.className = 'screen screen-battle';
  el.innerHTML = `
    <canvas id="bat-canvas"></canvas>
    <div class="bat-hud">
      <div class="bat-top">
        <div class="fighter-hud left">
          <div class="hud-name">YOU <span class="lvl">Lv ${STATE.level}</span> <span class="lives" id="hlives">${(STATE.extraLives || 0) > 0 ? '🌟×' + STATE.extraLives : ''}</span></div>
          <div id="php" class="hud-hearts">${renderHearts(b.hero.hp / HP_PER_HEART, STATE.maxHearts)}</div>
        </div>
        <div id="combo" class="combo-text"></div>
        <div class="fighter-hud right">
          <div class="hud-name">${b.fighter.name}${b.isBoss ? ' 👑' : ''}</div>
          <div id="ehp" class="hud-hearts">${renderHearts(b.enemy.hp / HP_PER_HEART, b.fighter.hearts)}</div>
        </div>
      </div>
      <div class="crowd-strip">
        <span>😀 You</span>
        <div class="cm-bar big"><div id="favorfill" class="cm-fill applause" style="width:${b.favor}%"></div></div>
        <span>${b.fighter.name} 😀</span>
      </div>
      <button class="btn-icon bat-quit" id="bat-quit">‹</button>
    </div>
    <div class="battle-controls">
      <button class="cbtn attack" data-act="attack"><span>🗡️</span>Attack</button>
      <button class="cbtn block" data-act="block"><span>🛡️</span>Block</button>
      <button class="cbtn jump" data-act="jump"><span>⤴️</span>Jump</button>
      <button class="cbtn special" data-act="special"><span>⚡</span>Special
        <div class="sp-meter"><div id="spfill" class="sp-fill"></div></div>
      </button>
      <button class="cbtn item" data-act="item"><span>🎒</span>Items</button>
    </div>
    <div class="bat-move"><div id="bjoy" class="joy"><div id="bjoy-knob" class="joy-knob"></div></div></div>
    <div id="item-tray" class="item-tray hidden"></div>
    <div id="battle-msg" class="battle-msg"></div>
  `;
  resizeBatCanvas();
  updateBattleHUD();
}
function resizeBatCanvas() {
  const c = document.getElementById('bat-canvas'); if (!c) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.floor((c.clientWidth || window.innerWidth) * dpr);
  c.height = Math.floor((c.clientHeight || window.innerHeight) * dpr);
  BATTLE.dpr = dpr;
}

/* ============================================================
   INPUT
   ============================================================ */
function bindBattleInput() {
  const b = BATTLE;
  b._kd = e => {
    const k = e.key.toLowerCase();
    b.keys[k] = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (k === ' ') heroJumpB();
    if (k === 'j') heroAttackB();
    if (k === 'l') heroSpecialB();
  };
  b._ku = e => { b.keys[e.key.toLowerCase()] = false; };
  const c = document.getElementById('bat-canvas');
  b._mm = e => { const r = c.getBoundingClientRect(); b.mouse.x = e.clientX - r.left; b.mouse.y = e.clientY - r.top; b.mouse.movedAt = performance.now(); };
  b._md = e => { b.mouse.down = true; heroAttackB(); };
  b._mu = () => { b.mouse.down = false; };
  b._rs = () => resizeBatCanvas();
  window.addEventListener('keydown', b._kd);
  window.addEventListener('keyup', b._ku);
  c.addEventListener('mousemove', b._mm);
  c.addEventListener('mousedown', b._md);
  window.addEventListener('mouseup', b._mu);
  window.addEventListener('resize', b._rs);

  document.getElementById('bat-quit').addEventListener('click', () => { Audio2.sfx.click(); exitBattle(); });
  document.querySelectorAll('.battle-controls .cbtn').forEach(btn => {
    const act = btn.dataset.act;
    if (act === 'attack') {
      const on = e => { e && e.preventDefault(); b.attackHeld = true; heroAttackB(); };
      const off = () => { b.attackHeld = false; };
      btn.addEventListener('mousedown', on); btn.addEventListener('mouseup', off);
      btn.addEventListener('touchstart', on, { passive: false }); btn.addEventListener('touchend', off);
    } else if (act === 'block') {
      const on = e => { e && e.preventDefault(); b.blockHeld = true; };
      const off = () => { b.blockHeld = false; };
      btn.addEventListener('mousedown', on); btn.addEventListener('mouseup', off);
      btn.addEventListener('touchstart', on, { passive: false }); btn.addEventListener('touchend', off);
    } else {
      btn.addEventListener('click', () => {
        if (act === 'jump') heroJumpB();
        else if (act === 'special') heroSpecialB();
        else if (act === 'item') toggleItemTrayB();
      });
    }
  });
  bindBatJoystick();
}
function bindBatJoystick() {
  const b = BATTLE, joy = document.getElementById('bjoy'), knob = document.getElementById('bjoy-knob'), R = 44, DEAD = 7;
  function set(t) {
    const r = joy.getBoundingClientRect();
    let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len < DEAD) { b.joy.active = true; b.joy.dx = b.joy.dy = 0; knob.style.transform = 'translate(0,0)'; return; }
    const cl = Math.min(len, R), mag = cl / R;              // analog magnitude (proportional speed)
    const ux = dx / len, uy = dy / len;
    knob.style.transform = `translate(${ux * cl}px,${uy * cl}px)`;
    b.joy.active = true; b.joy.dx = ux * mag; b.joy.dy = uy * mag;
    if (uy < -0.62 && mag > 0.7) heroJumpB();               // flick UP = jump (depth no longer used)
  }
  function reset() { b.joy.active = false; b.joy.dx = b.joy.dy = 0; knob.style.transform = 'translate(0,0)'; }
  b._js = e => { e.preventDefault(); set(e.touches ? e.touches[0] : e); };
  joy.addEventListener('touchstart', b._js, { passive: false });
  joy.addEventListener('touchmove', b._js, { passive: false });
  joy.addEventListener('touchend', reset);
  joy.addEventListener('touchcancel', reset);
}
function unbindBattleInput() {
  const b = BATTLE; if (!b) return;
  window.removeEventListener('keydown', b._kd);
  window.removeEventListener('keyup', b._ku);
  window.removeEventListener('resize', b._rs);
  window.removeEventListener('mouseup', b._mu);
}

/* ============================================================
   HERO ACTIONS
   ============================================================ */
function inRange(a, b2, extra) {
  return Math.abs(a.x - b2.x) < 0.34 + (extra || 0);   // ONE readable horizontal gap
}
function heroAttackB() {
  const b = BATTLE; if (!b || b.over) return;
  const now = performance.now(), h = b.hero, e = b.enemy;
  if (now < h.attackReadyAt) return;
  if (now < b.hitstopUntil) return;                     // frozen on impact
  const wid = STATE.equippedWeapon;
  const sp = weaponSpeed(WEAPONS[wid] || {});           // per-weapon feel: light=fast, heavy=slow
  h.attackReadyAt = now + sp.cool;
  h.swingUntil = now + Math.max(150, sp.swing);
  const dur = STATE.weapons[wid] || 0; const bare = dur <= 0;
  const power = bare ? null : weaponPower(wid);
  const reachX = power === 'reach' ? 0.16 : power === 'sweep' ? 0.12 : 0;
  Audio2.sfx.hit();
  if (e.hp > 0 && inRange(h, e, reachX)) {
    if (!bare) STATE.weapons[wid] = dur - 1;            // durability only spent on a real hit
    // combo scaling
    h.combo = now < h.comboUntil ? h.combo + 1 : 1;
    h.comboUntil = now + 1100;
    let dmg = (bare ? 2 : (weaponDamage(wid) + (STATE.dmgBonus || 0)));
    if (power === 'double') dmg *= 2;
    if (now < h.strengthUntil) dmg *= 2;
    dmg *= (1 + Math.min(0.6, (h.combo - 1) * 0.12));   // combo bonus
    let crit = false;
    if (h.z > 20) { dmg *= 1.4; crit = true; }          // jump-in attack bonus
    // counter-hit: striking the enemy during its wind-up
    if (now < e.windUntil) { dmg *= 1.5; crit = true; flashB('COUNTER!'); }
    // BACK STAB: hit the enemy from behind (e.g. after a jump-in cross-up)
    const back = Math.sign(h.x - e.x) !== 0 && Math.sign(h.x - e.x) !== e.facing;
    if (back) { dmg *= 2; crit = true; flashB('BACK STAB!'); }
    // enemy block? (can't block a backstab)
    if (!back && now < e.blockUntil) { dmg *= 0.35; flashB('Enemy blocked!'); }
    dmg = Math.round(dmg);
    damageEnemyB(dmg, power, now, h.combo, crit);
    knockback(e, h, power === 'stun' ? 2.4 : 1.5 + h.combo * 0.15);
    h.special = Math.min(100, h.special + 12);
    bumpFavor(3 + Math.min(4, h.combo));                 // crowd loves a combo
    b.intensity = Math.min(1, b.intensity + 0.3);
    if (power === 'lifesteal') h.hp = Math.min(h.maxhp, h.hp + Math.round(dmg * 0.4));
    if (h.combo >= 2) showCombo(h.combo);
  }
  updateBattleHUD();
}
function heroSpecialB() {
  const b = BATTLE; if (!b || b.over) return;
  const now = performance.now(), h = b.hero, e = b.enemy;
  if (h.special < 100) { flashB('Special not ready!'); return; }
  h.special = 0; h.swingUntil = now + 320; h.attackReadyAt = now + 500;
  Audio2.sfx.special(); burstB('⚡', h);
  if (e.hp > 0 && inRange(h, e, 0.16)) {
    let dmg = Math.round((weaponDamage(STATE.equippedWeapon) + (STATE.dmgBonus || 0)) * 2.6);
    damageEnemyB(dmg, weaponPower(STATE.equippedWeapon), now, 6, true);
    knockback(e, h, 4.5); bumpFavor(6); b.intensity = 1;
    shakeB(16, 260); zoomPunch(now, 0.06, 240); flashScreen(now, 'rgba(255,240,180,0.55)', 170);
    flashB('SPECIAL!');
  }
  updateBattleHUD();
}
function heroJumpB() {
  const b = BATTLE; if (!b || b.over) return;
  const now = performance.now(), h = b.hero;
  if (now < h.jumpReadyAt || h.z > 0) return;
  h.jumpUntil = now + JUMPB_DUR; h.jumpReadyAt = now + JUMPB_DUR + 60;
  Audio2.sfx.dodge();
}
function damageEnemyB(dmg, power, now, combo, crit) {
  const b = BATTLE, e = b.enemy;
  e.hp = Math.max(0, e.hp - dmg);
  e.hurtUntil = now + 200; e.hurtAt = now;
  e.hitstunUntil = now + Math.min(340, 170 + (combo || 0) * 14);   // real stagger so combos connect
  popDamageB(e, dmg, false, crit ? '#fff2a0' : undefined);
  spawnHitFx((e.x + b.hero.x) / 2, e.depth, Math.max(e.z, 34), crit ? '#ffdf6a' : '#ffffff', crit);
  hitstopB(now, 55 + Math.min(70, (combo || 0) * 8) + (crit ? 45 : 0));
  shakeB(crit ? 9 : 5, 150);
  if (power === 'poison') { e.poisonUntil = now + 3000; e.poisonNext = now + 400; }
  if (power === 'stun') e.stunUntil = now + 900;
  Audio2.sfx.hit();
  if (e.hp <= 0) return winBattle();
}
// Impulse knockback: sets a decaying velocity (applied in the update loops) so
// hits SLIDE the target with weight instead of teleporting.
function knockback(target, from, mag) {
  const dir = target.x >= from.x ? 1 : -1;
  target.knockVX = (target.knockVX || 0) * 0.4 + dir * mag;
}
function applyKnock(fighter, dt) {
  if (!fighter.knockVX) return;
  fighter.x = clampB(fighter.x + fighter.knockVX * dt, -WALLB, WALLB);
  fighter.knockVX *= Math.pow(0.001, dt);
  if (Math.abs(fighter.knockVX) < 0.05) fighter.knockVX = 0;
}
// Keep bodies from overlapping/passing through; hand corner overflow to the other body.
function separateBodies(h, e) {
  const gap = e.x - h.x;
  if (Math.abs(gap) >= BODY_GAP) return;
  const dir = gap >= 0 ? 1 : -1;                 // +1: enemy on the right
  const push = (BODY_GAP - Math.abs(gap)) / 2;
  let hx = clampB(h.x - dir * push, -WALLB, WALLB);
  let ex = clampB(e.x + dir * push, -WALLB, WALLB);
  // if one hit a wall, transfer the remaining correction to the other
  if (Math.abs(ex - hx) < BODY_GAP) {
    if (hx <= -WALLB + 0.001) ex = clampB(hx + dir * BODY_GAP, -WALLB, WALLB);
    else if (ex >= WALLB - 0.001) hx = clampB(ex - dir * BODY_GAP, -WALLB, WALLB);
  }
  h.x = hx; e.x = ex;
}
/* ---------------- juice helpers ---------------- */
function hitstopB(now, ms) { const b = BATTLE; b.hitstopUntil = Math.max(b.hitstopUntil, now + ms); }
function shakeB(mag, dur) { const b = BATTLE; b.shakeMag = Math.max(b.shakeMag * (performance.now() < b.shakeUntil ? 1 : 0), mag); b.shakeUntil = performance.now() + dur; b.shakeDur = dur; }
function zoomPunch(now, amt, dur) { const b = BATTLE; b.zoomAmt = amt; b.zoomUntil = now + dur; b.zoomDur = dur; }
function flashScreen(now, color, dur) { const b = BATTLE; b.flashColor = color; b.flashUntil = now + dur; b.flashDur = dur; }
function spawnHitFx(x, depth, z, color, big) {
  const b = BATTLE, n = big ? 9 : 6;
  b.fx.push({ kind: 'ring', x, depth, z, color, born: performance.now(), life: big ? 320 : 240, r0: big ? 10 : 6, r1: big ? 56 : 38 });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.4, sp = 60 + Math.random() * (big ? 130 : 80);
    b.fx.push({ kind: 'spark', x, depth, z, color, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, born: performance.now(), life: big ? 420 : 300 });
  }
}

/* ---------------- Items ---------------- */
function toggleItemTrayB() {
  const tray = document.getElementById('item-tray'); if (!tray) return;
  const owned = Object.keys(STATE.items).filter(id => STATE.items[id] > 0);
  if (!owned.length) { flashB('No items!'); return; }
  if (!tray.classList.contains('hidden')) { tray.classList.add('hidden'); return; }
  tray.innerHTML = owned.map(id => { const it = ITEMS[id]; return `<button class="tray-item" data-item="${id}"><div>${itemSVG(it.art)}</div><span>${it.name} ×${STATE.items[id]}</span></button>`; }).join('');
  tray.classList.remove('hidden');
  tray.querySelectorAll('.tray-item').forEach(btn => btn.addEventListener('click', () => { useItemB(btn.dataset.item); tray.classList.add('hidden'); }));
}
function useItemB(id) {
  const b = BATTLE, it = ITEMS[id]; if (!it || (STATE.items[id] || 0) <= 0) return;
  const h = b.hero;
  if (it.type === 'heal') { h.hp = Math.min(h.maxhp, h.hp + it.heal * HP_PER_HEART); Audio2.sfx.heal(); burstB('❤️', h); }
  else if (it.type === 'buff') { h.strengthUntil = performance.now() + it.duration; Audio2.sfx.special(); burstB('💪', h); flashB('Strength up!'); }
  else if (it.type === 'capture') {
    if (b.enemy.hp > b.enemy.maxhp * 0.25) { flashB('Weaken it below ¼ health first!'); return; }
    STATE.items[id]--; if (STATE.items[id] <= 0) delete STATE.items[id];
    if (!STATE.captured.includes(b.fighter.id)) STATE.captured.push(b.fighter.id);
    Audio2.sfx.win(); burstB('🎉', h); saveGame(); return winBattle(true);
  }
  STATE.items[id]--; if (STATE.items[id] <= 0) delete STATE.items[id];
  saveGame(); updateBattleHUD();
}

/* ============================================================
   MAIN LOOP
   ============================================================ */
function battleLoop(t) {
  const b = BATTLE; if (!b) return;
  const dt = Math.min(0.05, (t - b.lastT) / 1000); b.lastT = t;
  if (!b.over && t >= b.hitstopUntil) updateBattle(dt, t);   // hitstop freezes the sim, not the render
  renderBattleCanvas();
  b.raf = requestAnimationFrame(battleLoop);
}

function updateBattle(dt, t) {
  const b = BATTLE, h = b.hero, e = b.enemy;
  const spd = 0.9 + (STATE.speedBonus || 0) * 0.1;

  // guard (hold): down on the stick, K, or the Block button — locks the stance
  h.blocking = b.blockHeld || !!b.keys['k'] || (b.joy.active && b.joy.dy > 0.62);

  /* ONE-axis movement: left/right only. Up = jump. This is the whole footsies game. */
  let mx = 0;
  if (b.joy.active) { mx = Math.abs(b.joy.dx) > 0.12 ? b.joy.dx : 0; }
  else {
    if (b.keys['a'] || b.keys['arrowleft']) mx -= 1;
    if (b.keys['d'] || b.keys['arrowright']) mx += 1;
  }
  if (b.keys['w'] || b.keys['arrowup']) heroJumpB();
  const airborne = h.z > 2;
  let moveScale = h.blocking ? 0.34 : (airborne ? 0.85 : 1);      // guard-walk / air-control
  if (h.sludgeUntil && t < h.sludgeUntil) moveScale *= 0.5;       // slowed while stuck in a hazard puddle
  h.moving = Math.abs(mx) > 0.01;
  if (h.moving) { h.x = clampB(h.x + mx * spd * moveScale * dt, -WALLB, WALLB); h.animT += dt * 10; }
  applyKnock(h, dt);
  h.facing = e.x >= h.x ? 1 : -1;

  // jump arc (z), the only vertical axis
  const jumping = t < h.jumpUntil;
  h.z = jumping ? Math.sin((1 - (h.jumpUntil - t) / JUMPB_DUR) * Math.PI) * 78 : 0;

  // continuous attack while held
  if (b.attackHeld || b.mouse.down || b.keys['j']) heroAttackB();
  if (t > h.comboUntil) h.combo = 0;

  // hero poison tick on enemy
  if (e.poisonUntil && t < e.poisonUntil && t >= (e.poisonNext || 0)) {
    e.poisonNext = t + 400; e.hp = Math.max(0, e.hp - 4); popDamageB(e, 4, false, '#57cc66');
    if (e.hp <= 0) return winBattle();
  }

  updateEnemyAI(dt, t);
  updateProjectiles(dt, t);                   // enemy specials in flight
  updateHazards(dt, t);                       // lingering ground hazards
  separateBodies(h, e);                       // bodies never overlap or pass through

  // crowd favour drifts toward the current health leader; intensity decays
  const heroPct = h.hp / h.maxhp, enemyPct = e.hp / e.maxhp;
  b.favor = clampB(b.favor + (heroPct - enemyPct) * 6 * dt, 5, 95);
  b.intensity = Math.max(0, b.intensity - dt * 0.8);
  updateFavorBar();

  // "can I hit now" glow on the Attack button
  const rdy = e.hp > 0 && inRange(h, e, weaponPower(STATE.equippedWeapon) === 'reach' ? 0.16 : 0);
  const ab = document.querySelector('.cbtn.attack'); if (ab) ab.classList.toggle('inrange', rdy);
}

function updateEnemyAI(dt, t) {
  const b = BATTLE, h = b.hero, e = b.enemy;
  applyKnock(e, dt);
  if (e.stunUntil && t < e.stunUntil) { e.blockUntil = 0; return; }   // stunned (mace)
  if (t < e.hitstunUntil) { e.blockUntil = 0; return; }               // staggered -> combo window
  // turn to face the hero, but not instantly — a jump-in cross-up briefly
  // leaves the enemy's back open for a BACK STAB
  const wantFace = h.x >= e.x ? 1 : -1;
  if (wantFace !== e.facing && t >= (e.faceFlipReadyAt || 0)) { e.facing = wantFace; e.faceFlipReadyAt = t + 300; }
  const dx = h.x - e.x, distX = Math.abs(dx);
  const heroSpd = 0.9 + (STATE.speedBonus || 0) * 0.1;
  let espd = (0.55 + b.fighter.attack * 0.05) * (b.isBoss ? 1.12 : 1);
  espd = Math.min(espd, heroSpd * 0.82);                              // player can ALWAYS create distance
  if (t < e.windUntil) { /* committed to a telegraphed strike, hold */ }
  else if (t >= e.nextDecision) {
    const r = Math.random();
    const canSpecial = t >= (e.specialReadyAt || 0);
    if (distX < 0.34) {
      if (canSpecial && r < 0.26) { specialWindup(e, t); }   // occasional point-blank special
      else if (r < 0.62) { // attack — long, reactable wind-up (telegraph)
        e.windUntil = t + Math.max(420, 720 - b.fighter.attack * 34);
        e.swingUntil = e.windUntil + 170;
        setTimeout(() => enemyStrikeB(), (e.windUntil - t));
        e.nextDecision = t + Math.max(800, 1500 - b.fighter.attack * 80);
      } else if (r < 0.82) { e.blockUntil = t + 600; e.nextDecision = t + 700; }   // block
      else { e.backoffUntil = t + 450; e.nextDecision = t + 750; }                 // space out
    } else {
      // at range: mostly close the gap, but often let a signature special fly
      if (canSpecial && r < 0.72) { specialWindup(e, t); }
      else { e.nextDecision = t + 180; }
    }
  }
  if (t < (e.backoffUntil || 0)) { e.x = clampB(e.x - Math.sign(dx || 1) * espd * dt, -WALLB, WALLB); e.animT += dt * 9; }
  else if (t >= e.windUntil && distX > 0.30) { e.x = clampB(e.x + Math.sign(dx) * espd * dt, -WALLB, WALLB); e.animT += dt * 9; }
}

/* ============================================================
   ENEMY SPECIALS — a dodgeable ranged power for every fighter
   ============================================================ */
// Begin a special: a telegraphed wind-up (aura glows the special's colour), then
// the projectile(s) fly. Long enough to be reactable.
function specialWindup(e, t) {
  const b = BATTLE;
  const tel = b.isBoss ? 480 : 580;
  e.windUntil = t + tel;
  e.specialWind = true;
  e.specialReadyAt = t + (b.isBoss ? 2100 : 3100) + Math.random() * 900;
  e.nextDecision = t + tel + 260;
  flashB(b.fighter.name + ': ' + e.special.name + '!');
  setTimeout(() => fireSpecialB(e), tel);
}

function fireSpecialB(e) {
  const b = BATTLE; if (!b || b.over || e.hp <= 0) return;
  const t = performance.now();
  e.specialWind = false;
  if ((e.stunUntil && t < e.stunUntil) || t < e.hitstunUntil) return;   // interrupted mid-charge
  const sp = e.special, dir = e.facing;
  const dmg = Math.round((b.fighter.attack * 5 + 6) * (sp.dmgMul || 1));
  Audio2.sfx.special();
  const count = sp.count || 1;
  for (let k = 0; k < count; k++) {
    if (k === 0) launchProjectile(e, sp, dmg, dir, t);
    else setTimeout(() => { if (BATTLE === b && !b.over && e.hp > 0) launchProjectile(e, sp, dmg, dir, performance.now()); }, k * 190);
  }
}

function launchProjectile(e, sp, dmg, dir, t) {
  const b = BATTLE, h = b.hero;
  if (sp.behavior === 'shot') {
    // all shots in a volley fly at the same height so ONE well-timed jump clears them
    b.projectiles.push({
      behavior: 'shot', kind: sp.kind, color: sp.color, dmg,
      x: e.x + dir * 0.14, z: 30, vx: dir * (sp.speed || 1.6), spin: 0,
      born: t, fromX: e.x,
    });
  } else { // lob / slick
    const target = clampB(h.x + (Math.random() - 0.5) * 0.05, -WALLB, WALLB);
    b.projectiles.push({
      behavior: sp.behavior, kind: sp.kind, color: sp.color, dmg,
      x0: e.x, target, cx: e.x, cz: 0, t0: t, dur: 880 + Math.random() * 120,
      peak: 130, radius: sp.radius || 0.17, leaveHazard: sp.behavior === 'slick',
      born: t, fromX: e.x,
    });
  }
}

// Move projectiles, resolve hits/dodges. Called each frame from updateBattle.
function updateProjectiles(dt, t) {
  const b = BATTLE, h = b.hero;
  b.projectiles = b.projectiles.filter(p => {
    if (p.behavior === 'shot') {
      p.x += p.vx * dt; p.spin = (p.spin || 0) + dt * 16;
      if (!p.dead && Math.abs(p.x - h.x) < 0.11) {
        if (h.z > p.z - 6) {                              // hero jumped: the shot passes under
          if (!p.grazed) { p.grazed = true; popDamageB(h, 0, true, '#8ff0a0'); Audio2.sfx.dodge(); }
        } else { applyHeroHit(p.dmg, p.fromX, p.color); p.dead = true; }
      }
      if (p.x < -1.08 || p.x > 1.08) return false;
      return !p.dead;
    }
    // lob / slick: arc to the marked spot, then burst
    const age = (t - p.t0) / p.dur;
    if (age >= 1) { detonateLob(p); return false; }
    p.cx = p.x0 + (p.target - p.x0) * age;
    p.cz = Math.sin(age * Math.PI) * p.peak;
    return true;
  });
}

function detonateLob(p) {
  const b = BATTLE, h = b.hero, now = performance.now();
  spawnHitFx(p.target, h.depth, 20, p.color, true);
  shakeB(6, 150); Audio2.sfx.bighit();
  if (Math.abs(p.target - h.x) < p.radius && h.z < 42) applyHeroHit(p.dmg, p.fromX, p.color);
  if (p.leaveHazard) b.hazards.push({ x: p.target, r: p.radius * 0.92, color: p.color, kind: p.kind, born: now, life: 2900, nextTick: now + 300, dmg: Math.max(2, Math.round(p.dmg * 0.22)) });
}

// Lingering ground hazards (slime/ink/venom): slow + chip damage while stood in.
function updateHazards(dt, t) {
  const b = BATTLE, h = b.hero;
  b.hazards = b.hazards.filter(hz => {
    if (t - hz.born > hz.life) return false;
    if (h.z < 24 && Math.abs(h.x - hz.x) < hz.r) {
      h.sludgeUntil = t + 120;                            // read by movement to slow the hero
      if (t >= hz.nextTick) { hz.nextTick = t + 460; applyHeroHit(hz.dmg, hz.x, hz.color, true); }
    }
    return true;
  });
}

// Apply a projectile/hazard hit to the hero (block + armour + i-frames aware).
// `minor` hits (hazard ticks) skip knockback/hitstop so puddles feel like chip.
function applyHeroHit(dmg, fromX, color, minor) {
  const b = BATTLE, h = b.hero, now = performance.now();
  if (b.over) return;
  if (now < h.hurtInvuln) return;                          // brief mercy i-frames
  let blocked = false;
  if (h.blocking && !minor) {
    const block = absorbWithShield();
    dmg *= (1 - (block || 0.15)); Audio2.sfx.block(); updateShieldB(); blocked = true;
  } else { Audio2.sfx.hurt(); bumpFavor(-3); b.intensity = Math.min(1, b.intensity + 0.3); h.combo = 0; }
  dmg *= (1 - (STATE.armorBonus || 0));
  dmg = Math.max(1, Math.round(dmg));
  h.hp = Math.max(0, h.hp - dmg); h.hurtUntil = now + 200; h.hurtAt = now;
  h.hurtInvuln = now + (minor ? 200 : 300);
  popDamageB(h, dmg, false, color);
  spawnHitFx(h.x, h.depth, Math.max(h.z, 34), blocked ? '#8fd0ff' : (color || '#ff6a8a'), false);
  if (!minor) { hitstopB(now, blocked ? 40 : 60); shakeB(blocked ? 4 : 7, 140); knockback(h, { x: fromX }, blocked ? 0.8 : 1.5); }
  updateBattleHUD();
  if (h.hp <= 0) return loseBattle();
}

function enemyStrikeB() {
  const b = BATTLE; if (!b || b.over) return;
  const now = performance.now(), h = b.hero, e = b.enemy;
  if (e.hp <= 0 || now < e.hitstunUntil || (e.stunUntil && now < e.stunUntil)) return;  // interrupted mid-wind
  if (!inRange(e, h, 0.02)) return;              // player spaced out of range
  if (h.z > 30) { flashB('Jumped over!'); bumpFavor(3); return; }   // jump-in dodges the strike
  if (now < h.hurtInvuln) return;
  let dmg = b.fighter.attack * 9 + 5, blocked = false;   // foes hit harder now
  if (h.blocking) {
    const block = absorbWithShield();
    dmg *= (1 - (block || 0.15));                // even a raw guard chips the damage
    Audio2.sfx.block(); flashB(shieldDurability() <= 0 && block === 0 ? 'Guard!' : 'Blocked!');
    updateShieldB(); blocked = true;
  } else { Audio2.sfx.hurt(); bumpFavor(-3); b.intensity = Math.min(1, b.intensity + 0.3); h.combo = 0; }
  dmg *= (1 - (STATE.armorBonus || 0));
  dmg = Math.round(dmg);
  h.hp = Math.max(0, h.hp - dmg); h.hurtUntil = now + 200; h.hurtAt = now; h.hurtInvuln = now + 260;
  popDamageB(h, dmg, false);
  spawnHitFx((e.x + h.x) / 2, h.depth, Math.max(h.z, 34), blocked ? '#8fd0ff' : '#ff6a8a', false);
  hitstopB(now, blocked ? 40 : 70); shakeB(blocked ? 4 : 8, 150);
  knockback(h, e, blocked ? 1.0 : 2.0);
  updateBattleHUD();
  if (h.hp <= 0) return loseBattle();
}

/* ============================================================
   RENDER
   ============================================================ */
function projB(x, depth, z, cw, ch) {
  // Side-view lane: constant scale, both fighters on ONE floor line (no depth shrink).
  const S = clampB(ch / 560, 1.05, 1.7);
  const groundY = ch * 0.80;
  return { x: cw / 2 + x * (cw * 0.42), y: groundY - z, scale: S };
}
function renderBattleCanvas() {
  const b = BATTLE, c = document.getElementById('bat-canvas'); if (!c) return;
  const ctx = c.getContext('2d'), dpr = b.dpr || 1, cw = c.width / dpr, ch = c.height / dpr;
  const t = performance.now();

  // camera: shake + zoom-punch on impact
  let ox = 0, oy = 0, zoom = 1;
  if (t < b.shakeUntil) { const k = (b.shakeUntil - t) / (b.shakeDur || 1), m = b.shakeMag * k; ox = (Math.random() * 2 - 1) * m; oy = (Math.random() * 2 - 1) * m; }
  if (t < b.zoomUntil) { zoom = 1 + (b.zoomAmt || 0) * ((b.zoomUntil - t) / (b.zoomDur || 1)); }
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, (ox - (zoom - 1) * cw / 2) * dpr, (oy - (zoom - 1) * ch / 2) * dpr);

  // arena background (over-filled so shake never reveals an edge)
  const sky = ctx.createLinearGradient(0, 0, 0, ch);
  sky.addColorStop(0, '#2a1a4a'); sky.addColorStop(0.5, '#1c1338'); sky.addColorStop(1, '#0f0a22');
  ctx.fillStyle = sky; ctx.fillRect(-30, -30, cw + 60, ch + 60);

  drawCrowd(ctx, cw, ch, t);
  drawArenaFloor(ctx, cw, ch);

  // ground hazards + lobbed-blast landing markers sit on the floor, under the fighters
  b.hazards.forEach(hz => drawHazardB(ctx, cw, ch, hz, t));
  b.projectiles.forEach(p => { if (p.behavior !== 'shot') drawLandMarkerB(ctx, cw, ch, p, t); });

  // Both fighters share the floor line — draw enemy first so the hero (and their
  // big in-hand weapon) reads on top when the two bodies are close.
  drawFighter(ctx, cw, ch, b.enemy, false, t);
  drawFighter(ctx, cw, ch, b.hero, true, t);

  // enemy specials in flight, drawn over the fighters
  b.projectiles.forEach(p => drawProjectileB(ctx, cw, ch, p, t));

  // fx
  b.fx = b.fx.filter(f => t - f.born < f.life);
  b.fx.forEach(f => drawFxB(ctx, cw, ch, f, t));

  // vignette
  const vg = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.3, cw / 2, ch / 2, ch * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg; ctx.fillRect(-30, -30, cw + 60, ch + 60);

  // full-screen impact flash (special / KO)
  if (t < b.flashUntil) { ctx.globalAlpha = (b.flashUntil - t) / (b.flashDur || 1); ctx.fillStyle = b.flashColor; ctx.fillRect(-30, -30, cw + 60, ch + 60); ctx.globalAlpha = 1; }
}

function drawArenaFloor(ctx, cw, ch) {
  const groundY = ch * 0.80, topY = ch * 0.54, botY = ch * 0.98;
  const backHalf = cw * 0.30, frontHalf = cw * 0.54;
  ctx.beginPath();
  ctx.moveTo(cw / 2 - backHalf, topY); ctx.lineTo(cw / 2 + backHalf, topY);
  ctx.lineTo(cw / 2 + frontHalf, botY); ctx.lineTo(cw / 2 - frontHalf, botY); ctx.closePath();
  const g = ctx.createLinearGradient(0, topY, 0, botY);
  g.addColorStop(0, '#6a5a34'); g.addColorStop(1, '#8a7038');
  ctx.fillStyle = g; ctx.fill();
  // the fighting-line ring at the fighters' feet
  ctx.strokeStyle = 'rgba(255,220,120,0.28)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cw / 2, groundY, cw * 0.44, (botY - topY) * 0.14, 0, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 6; ctx.stroke();
  // wall markers at the corners so the player reads the bounds
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(cw / 2 - WALLB * cw * 0.42 - 8, groundY - 40, 6, 46);
  ctx.fillRect(cw / 2 + WALLB * cw * 0.42 + 2, groundY - 40, 6, 46);
}

function drawCrowd(ctx, cw, ch, t) {
  const b = BATTLE, favor = b.favor, rows = 2;
  const baseY = ch * 0.30;
  for (let row = 0; row < rows; row++) {
    const y = baseY - row * 22;
    const count = 16 + row * 4;
    for (let i = 0; i < count; i++) {
      const fx = (i + 0.5) / count;               // 0..1 across
      const x = fx * cw;
      const seed = row * 31 + i;
      const cheerAmt = 0.4 + b.intensity * 0.9;
      const bob = Math.sin(t / (170 - b.intensity * 90) + seed) * (4 + cheerAmt * 5);
      // which side does this spectator favour?
      const favoursPlayer = (Math.sin(seed * 12.9) * 43758.5 % 1 + 1) % 1 < favor / 100;
      const tint = favoursPlayer ? '#7fd0a0' : '#e2a06a';
      ctx.fillStyle = row === 0 ? tint : shade(tint, -20);
      ctx.beginPath(); ctx.arc(x, y - bob, 7 - row, 0, 7); ctx.fill();
      // occasional raised sign
      if ((seed * 7 + Math.floor(t / 600)) % 9 === 0) {
        ctx.fillStyle = favoursPlayer ? '#8ff0a0' : '#ff9d6a';
        ctx.fillRect(x - 5, y - bob - 20, 10, 7);
      }
    }
  }
  // crowd stand base
  ctx.fillStyle = 'rgba(10,8,20,0.55)'; ctx.fillRect(0, baseY + 6, cw, ch * 0.16);
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, bl = (n & 255) + amt;
  r = clampB(r, 0, 255); g = clampB(g, 0, 255); bl = clampB(bl, 0, 255);
  return `rgb(${r},${g},${bl})`;
}

function drawFighter(ctx, cw, ch, e, isHero, t) {
  const p = projB(e.x, e.depth, e.z, cw, ch);
  const ground = projB(e.x, e.depth, 0, cw, ch);
  const scale = p.scale, w = 104 * scale, hgt = 132 * scale;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(ground.x, ground.y, 26 * scale * (1 - e.z / 240), 9 * scale, 0, 0, 7); ctx.fill();
  const fighter = isHero ? { art: 'hero', palette: {}, id: 'hero' } : BATTLE.fighter;
  const img = getSprite(fighter.id, fighter, e.facing);
  const hurt = t < e.hurtUntil;
  const blocking = isHero ? e.blocking : (t < (e.blockUntil || 0));
  const winding = !isHero && t < (e.windUntil || 0);            // enemy telegraph window

  // windback -> snap -> recover lunge along the facing direction
  let lunge = 0;
  if (t < (e.swingUntil || 0)) {
    const dur = isHero ? 190 : 170, pr = clampB(1 - (e.swingUntil - t) / dur, 0, 1);
    let curve;
    if (pr < 0.3) curve = -(pr / 0.3) * 0.5;                    // pull back
    else if (pr < 0.55) curve = -0.5 + ((pr - 0.3) / 0.25) * 1.5;  // snap forward
    else curve = 1 - (pr - 0.55) / 0.45;                        // recover
    lunge = curve * 15 * e.facing * scale;
  }
  const bx = p.x + lunge, byTop = p.y - hgt;

  // enemy wind-up telegraph — pulsing aura so every strike is reactable. A
  // special charge glows the special's own colour (with a gathering orb) so you
  // know a projectile is coming, not a melee swing.
  if (winding) {
    const charging = e.specialWind;
    const aura = charging ? (e.special && e.special.color) || '#ffd23f' : '#ff4d5e';
    const g = 0.35 + 0.35 * Math.sin(t / (charging ? 60 : 45));
    ctx.save(); ctx.globalAlpha = g; ctx.strokeStyle = aura; ctx.lineWidth = charging ? 5 : 4;
    ctx.beginPath(); ctx.ellipse(p.x, p.y - hgt * 0.5, w * 0.5, hgt * 0.52, 0, 0, 7); ctx.stroke();
    if (charging) {
      const pr = clampB(1 - (e.windUntil - t) / 560, 0, 1);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8;
      ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(p.x + e.facing * 22 * scale, p.y - hgt * 0.58, (3 + pr * 8) * scale, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // squash-stretch recoil on the first ~90ms of a hit
  let sx = 1, sy = 1;
  if (hurt) { const s = 1 - clampB((t - e.hurtAt) / 90, 0, 1); sx = 1 + 0.14 * s; sy = 1 - 0.12 * s; }
  ctx.save();
  ctx.translate(bx, p.y); ctx.scale(sx, sy); ctx.translate(-bx, -p.y);
  if (img.complete && img.naturalWidth) ctx.drawImage(img, bx - w / 2, byTop, w, hgt);
  ctx.restore();

  // additive hit-flash (bright pop instead of a fade)
  if (hurt && img.complete && img.naturalWidth) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clampB((e.hurtUntil - t) / 200, 0, 1) * 0.8;
    ctx.drawImage(img, bx - w / 2, byTop, w, hgt); ctx.restore();
  }

  // weapon — the hero's real blade (big, in-hand) and the enemy's red slash
  drawWeaponB(ctx, e, isHero, bx, p.y, hgt, scale, t);

  // guard bubble
  if (blocking) {
    ctx.fillStyle = 'rgba(120,180,255,0.32)';
    ctx.beginPath(); ctx.ellipse(p.x + e.facing * 18 * scale, p.y - hgt * 0.5, 18 * scale, 32 * scale, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(160,210,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
  }

  // range ring under the enemy whenever the hero can land a hit
  if (!isHero && BATTLE.enemy.hp > 0 && inRange(BATTLE.hero, BATTLE.enemy, weaponPower(STATE.equippedWeapon) === 'reach' ? 0.16 : 0)) {
    const pulse = 0.35 + 0.3 * Math.sin(t / 120);
    ctx.strokeStyle = `rgba(120,255,170,${pulse})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(ground.x, ground.y, 36 * scale, 11 * scale, 0, 0, 7); ctx.stroke();
  }
}

/* One weapon renderer for both fighters. Hero: the real equipped blade, big and
   anchored to the front hand, with a bright swing trail. Enemy: a red slash arc
   during its strike (the wind-up telegraph is drawn on the body). */
function drawWeaponB(ctx, fighter, isHero, x, groundY, hgt, scale, t) {
  const facing = fighter.facing;
  if (!isHero) {
    if (t < (fighter.swingUntil || 0)) {
      const pr = clampB(1 - (fighter.swingUntil - t) / 170, 0, 1);
      const y = groundY - hgt * 0.55, r = 42 * scale;
      const a0 = facing > 0 ? -1.2 : Math.PI + 1.2, a1 = a0 + facing * (0.2 + pr * 2.0);
      ctx.strokeStyle = `rgba(255,80,90,${0.7 * (1 - pr)})`; ctx.lineWidth = 7 * scale; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y, r, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
    }
    return;
  }
  const hx = x + facing * 20 * scale, y = groundY - hgt * 0.6;
  const swinging = t < fighter.swingUntil;
  const base = facing >= 0 ? 0 : Math.PI;
  let ang = base - facing * 0.5;                       // idle carry: raised up & forward
  if (swinging) { const pr = 1 - (fighter.swingUntil - t) / 190; ang = base + facing * (-1.15 + pr * 2.3); }
  const wpn = WEAPONS[STATE.equippedWeapon] || { id: 'knife', art: 'knife' };
  const wscale = scale * 1.5;
  if (swinging) {
    const pr = clampB(1 - (fighter.swingUntil - t) / 190, 0, 1);
    const glowColor = weaponGlowColor(wpn) || '#dff1ff', r = 46 * wscale;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let g = 0; g < 4; g++) {                       // motion-blur ghosts
      const gp = pr - g * 0.09; if (gp < 0) continue;
      const a = base + facing * (-1.15 + gp * 2.3);
      ctx.strokeStyle = `rgba(255,255,255,${0.3 * (1 - g / 4) * (1 - pr)})`;
      ctx.lineWidth = (8 - g) * wscale * 0.45;
      ctx.beginPath(); ctx.arc(hx, y, r, base + facing * -1.15, a); ctx.stroke();
    }
    const grad = ctx.createRadialGradient(hx, y, r * 0.5, hx, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(1, glowColor);
    ctx.strokeStyle = grad; ctx.globalAlpha = 0.5 * (1 - pr); ctx.lineWidth = 5 * wscale;
    ctx.beginPath(); ctx.arc(hx, y, r, base + facing * -1.15, ang); ctx.stroke();
    ctx.restore();
  }
  ctx.save(); ctx.translate(hx, y); ctx.rotate(ang); ctx.scale(wscale, wscale);
  if (typeof drawBladeShape === 'function') drawBladeShape(ctx, wpn);
  ctx.restore();
}

/* ---------------- fx ---------------- */
function popDamageB(e, dmg, dodged, color) { BATTLE.fx.push({ kind: 'dmg', x: e.x, depth: e.depth, z: e.z + 40, text: dodged ? 'MISS' : '-' + dmg, color: color || (e === BATTLE.hero ? '#ff5c7a' : '#ffcf3f'), born: performance.now(), life: 700 }); }
function burstB(emoji, e) { for (let i = 0; i < 6; i++) BATTLE.fx.push({ kind: 'particle', x: e.x, depth: e.depth, z: e.z + 40, emoji, dx: (Math.random() - 0.5) * 60, dy: -Math.random() * 60 - 20, born: performance.now(), life: 800 }); }
function drawFxB(ctx, cw, ch, f, t) {
  const p = projB(f.x, f.depth, f.z, cw, ch), age = (t - f.born) / f.life;
  if (f.kind === 'dmg') {
    ctx.globalAlpha = 1 - age; ctx.font = '900 22px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
    const yy = p.y - 60 - age * 34;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(f.text, p.x, yy);
    ctx.fillStyle = f.color; ctx.fillText(f.text, p.x, yy); ctx.globalAlpha = 1; return;
  }
  if (f.kind === 'particle') { ctx.globalAlpha = 1 - age; ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillText(f.emoji, p.x + f.dx * age, p.y - 20 + f.dy * age); ctx.globalAlpha = 1; return; }
  if (f.kind === 'ring') { const r = f.r0 + (f.r1 - f.r0) * age; ctx.globalAlpha = (1 - age) * 0.8; ctx.strokeStyle = f.color; ctx.lineWidth = 3 * (1 - age) + 1; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; return; }
  if (f.kind === 'spark') {
    const x = p.x + f.vx * age * 0.5, y = p.y + (f.vy * age + 70 * age * age) * 0.5;
    ctx.globalAlpha = 1 - age; ctx.strokeStyle = f.color; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - f.vx * 0.035, y - f.vy * 0.035); ctx.stroke(); ctx.globalAlpha = 1; return;
  }
}

/* ---------------- enemy special projectiles ---------------- */
// The flying projectile itself (drawn over the fighters), with a glow + trail
// and a kind-specific shape so every fighter's power reads at a glance.
function drawProjectileB(ctx, cw, ch, p, t) {
  const isShot = p.behavior === 'shot';
  const wx = isShot ? p.x : p.cx, wz = isShot ? p.z : p.cz;
  const P = projB(wx, FLOOR_DEPTH, wz, cw, ch), s = P.scale;
  const x = P.x, y = P.y, R = 11 * s, dir = isShot ? (p.vx >= 0 ? 1 : -1) : 1, spin = p.spin || t / 120, k = p.kind;
  ctx.save();
  // soft glow halo
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, R * 2.3);
  g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(x, y, R * 2.3, 0, 7); ctx.fill();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // trailing ghosts for shots (sense of speed)
  if (isShot) { for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.16 * (3 - i); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x - dir * i * 7 * s, y, R * (1 - i * 0.16), 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }

  if (k === 'bone') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin); ctx.fillStyle = p.color;
    ctx.fillRect(-R, -2.4 * s, 2 * R, 4.8 * s);
    [[-R, 0], [R, 0]].forEach(([bx]) => { ctx.beginPath(); ctx.arc(bx, -2.2 * s, 2.6 * s, 0, 7); ctx.arc(bx, 2.2 * s, 2.6 * s, 0, 7); ctx.fill(); });
    ctx.restore();
  } else if (k === 'axe' || k === 'sword') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin * (k === 'axe' ? 1 : 0.4));
    ctx.fillStyle = '#5a4632'; ctx.fillRect(-1.4 * s, -R, 2.8 * s, 2 * R);          // haft
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(R, -R * 0.4); ctx.lineTo(R * 0.5, R * 0.2); ctx.lineTo(0, -2 * s); ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (k === 'water' || k === 'beam' || k === 'stinger' || k === 'ice') {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.moveTo(-R * 1.7, 0); ctx.lineTo(R, -4.5 * s); ctx.lineTo(R * 1.5, 0); ctx.lineTo(R, 4.5 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(R * 0.2, 0, R * 0.5, 1.6 * s, 0, 0, 7); ctx.fill();
    ctx.restore();
  } else if (k === 'crow') {
    ctx.strokeStyle = p.color; ctx.lineWidth = 2.6 * s; ctx.lineCap = 'round';
    const fl = Math.sin(t / 60) * 3 * s;
    ctx.beginPath(); ctx.moveTo(x - 8 * s, y + fl); ctx.quadraticCurveTo(x - 2 * s, y - 6 * s, x, y); ctx.quadraticCurveTo(x + 2 * s, y - 6 * s, x + 8 * s, y + fl); ctx.stroke();
  } else if (k === 'shadow') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin * 0.6); ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.moveTo(-R * 1.2, 0); ctx.lineTo(0, -3.2 * s); ctx.lineTo(R * 1.2, 0); ctx.lineTo(0, 3.2 * s); ctx.closePath(); ctx.fill();
    ctx.restore();
  } else {
    // orb-type powers: fire, venom, ghost, bubble, snow, shock, blood, sand, ink, goo, skull, rock, cannon
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
    if (k === 'bubble') { ctx.globalAlpha = 0.45; ctx.fillStyle = '#eafcff'; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = p.color; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke(); }
    if (k === 'goo' || k === 'ink' || k === 'venom') { ctx.fillStyle = shade(p.color, -40); for (let i = 0; i < 3; i++) { const a = spin + i * 2.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * R * 0.7, y + Math.sin(a) * R * 0.7, 2.2 * s, 0, 7); ctx.fill(); } }
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(x - R * 0.34, y - R * 0.34, R * 0.32, 0, 7); ctx.fill();
    if (k === 'skull') { ctx.fillStyle = '#1a2410'; ctx.beginPath(); ctx.arc(x - R * 0.35, y - 1 * s, 1.7 * s, 0, 7); ctx.arc(x + R * 0.35, y - 1 * s, 1.7 * s, 0, 7); ctx.fill(); }
    if (k === 'fire') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(x, y, R * 0.5, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  }
  ctx.restore();
}

// The pulsing marker showing where a lobbed blast will land — read it and step off.
function drawLandMarkerB(ctx, cw, ch, p, t) {
  const G = projB(p.target, FLOOR_DEPTH, 0, cw, ch), s = G.scale;
  const age = clampB((t - p.t0) / p.dur, 0, 1), rx = p.radius * cw * 0.42;
  ctx.save(); ctx.strokeStyle = p.color; ctx.lineWidth = 3 * s;
  ctx.globalAlpha = 0.35 + 0.4 * age;
  ctx.beginPath(); ctx.ellipse(G.x, G.y, rx * (0.55 + 0.45 * age), rx * 0.34, 0, 0, 7); ctx.stroke();
  ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t / 60);
  ctx.beginPath(); ctx.ellipse(G.x, G.y, 6 * s, 3 * s, 0, 0, 7); ctx.stroke();
  ctx.restore();
}

// A lingering ground hazard puddle (slime / ink / venom): avoid standing in it.
function drawHazardB(ctx, cw, ch, hz, t) {
  const G = projB(hz.x, FLOOR_DEPTH, 0, cw, ch), s = G.scale;
  const age = (t - hz.born) / hz.life, fade = age > 0.8 ? (1 - age) / 0.2 : 1;
  const rx = hz.r * cw * 0.42, ry = rx * 0.34;
  ctx.save();
  ctx.globalAlpha = 0.55 * fade; ctx.fillStyle = hz.color;
  ctx.beginPath(); ctx.ellipse(G.x, G.y, rx, ry, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = 0.8 * fade; ctx.fillStyle = shade(hz.color, 40);
  for (let i = 0; i < 3; i++) { const a = t / 320 + i * 2.1; ctx.beginPath(); ctx.arc(G.x + Math.cos(a) * rx * 0.4, G.y + Math.sin(a * 1.3) * ry * 0.4, (1.5 + Math.sin(t / 200 + i)) * s, 0, 7); ctx.fill(); }
  ctx.restore();
}

/* ============================================================
   HUD
   ============================================================ */
function updateBattleHUD() {
  const b = BATTLE; if (!b) return;
  const php = document.getElementById('php'), ehp = document.getElementById('ehp');
  const hl = document.getElementById('hlives'); if (hl) hl.textContent = (STATE.extraLives || 0) > 0 ? '🌟×' + STATE.extraLives : '';
  if (php) php.innerHTML = renderHearts(b.hero.hp / HP_PER_HEART, STATE.maxHearts);
  if (ehp) ehp.innerHTML = renderHearts(b.enemy.hp / HP_PER_HEART, b.fighter.hearts);
  const sp = document.getElementById('spfill'); if (sp) sp.style.width = b.hero.special + '%';
  const sb = document.querySelector('.cbtn.special'); if (sb) sb.classList.toggle('ready', b.hero.special >= 100);
  updateFavorBar();
}
function updateFavorBar() { const f = document.getElementById('favorfill'); if (f) f.style.width = BATTLE.favor + '%'; }
function updateShieldB() { /* durability reflected on next HUD tick */ }
function bumpFavor(n) { BATTLE.favor = clampB(BATTLE.favor + n, 5, 95); updateFavorBar(); }
function showCombo(n) { const el = document.getElementById('combo'); if (!el) return; el.textContent = n + ' HIT COMBO!'; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 900); }
function flashB(msg) { const el = document.getElementById('battle-msg'); if (!el) return; el.textContent = msg; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 1000); }

/* ============================================================
   END STATES  (rewards preserved from the original arena)
   ============================================================ */
function endBattleCleanup() { if (BATTLE && BATTLE.raf) cancelAnimationFrame(BATTLE.raf); unbindBattleInput(); }
function winBattle(captured) {
  const b = BATTLE; if (b.over) return;
  b.over = true; b.outcome = 'win'; endBattleCleanup();
  const f = b.fighter;
  const mult = 0.6 + b.favor / 100;
  const reward = Math.max(1, Math.round(f.reward * mult));
  earn(reward); STATE.wins++; recordDefeat(f.id);
  const leveled = gainXp(b.isBoss ? 15 : 5 + Math.round(f.reward / 3));
  const gotLife = (b.isBoss && !captured) ? maybeGrantExtraLife() : false;   // rare Legendary boss boon
  saveGame(); Audio2.sfx.win(); Audio2.sfx.crowd();
  showBattleResult(true, { name: f.name, reward, leveled, captured, favor: Math.round(b.favor), gotLife });
}
// 0 hearts = death. An Extra Life cheats it; otherwise GAME OVER, back to start.
function loseBattle() {
  const b = BATTLE; if (b.over) return;
  if ((STATE.extraLives || 0) > 0) return reviveBattle();
  b.over = true; b.outcome = 'lose'; endBattleCleanup();
  STATE.losses++; saveGame(); Audio2.sfx.lose();
  showGameOverOverlay(() => { BATTLE = null; showScreen('title'); });
}
function reviveBattle() {
  const b = BATTLE, h = b.hero, now = performance.now();
  STATE.extraLives = Math.max(0, (STATE.extraLives || 0) - 1); saveGame();
  h.hp = h.maxhp; h.hurtInvuln = now + 2000; h.hurtUntil = now;
  flashB('🌟 1-UP! An Extra Life saved you!');
  Audio2.sfx.win(); updateBattleHUD();
}
function exitBattle() { endBattleCleanup(); BATTLE = null; showScreen('arena'); }
function showBattleResult(won, data) {
  const b = BATTLE, region = b.regionId;
  const overlay = document.createElement('div');
  overlay.className = 'result-overlay';
  overlay.innerHTML = `
    <div class="result-card ${won ? 'win' : 'lose'}">
      <h2>${won ? (data.captured ? 'CAPTURED!' : 'VICTORY!') : 'DEFEATED'}</h2>
      ${won ? `
        <p>You beat <b>${data.name}</b>!</p>
        <p class="reward">+${data.reward} ${coinSVG()} <span class="crowd-bonus">(crowd ${data.favor}%)</span></p>
        ${data.leveled ? `<p class="levelup">⭐ LEVEL UP! Now level ${STATE.level}</p>` : ''}
        ${data.gotLife ? `<p class="extralife">🌟 LEGENDARY BOON — <b>EXTRA LIFE!</b> (you now have ${STATE.extraLives})</p>` : ''}
      ` : `
        <p>${data.name} got the better of you.</p>
        <p class="tip">Tip: move, jump over strikes, block, and chain attacks into combos!</p>
      `}
      <div class="result-btns">
        <button class="wide-btn" id="again">⚔️ Arena</button>
        <button class="wide-btn ghost" id="tohome">⌂ Home</button>
      </div>
    </div>`;
  app().appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  overlay.querySelector('#again').addEventListener('click', () => { Audio2.sfx.click(); BATTLE = null; Game.currentRegion = region; renderArena(region); });
  overlay.querySelector('#tohome').addEventListener('click', () => { Audio2.sfx.click(); BATTLE = null; showScreen('title'); });
}
