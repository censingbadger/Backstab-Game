/* ============================================================
   BACK STAB — Arena Battle (2.5D fighter, Mortal-Kombat style)
   Both fighters move on the arena floor in 3 axes (left/right,
   toward/away for depth, and jump for up), with a drawn weapon,
   combos, and a living crowd that swings to whoever is winning.
   ============================================================ */

let BATTLE = null;
const JUMPB_DUR = 620;                 // arena jump duration (ms)

function clampB(v, a, b) { return v < a ? a : v > b ? b : v; }
function distB(ax, ad, bx, bd) { return Math.hypot((ax - bx), (ad - bd) * 1.3); }

function startBattle(fighterId, regionId, isBoss) {
  const f = getFighter(fighterId);
  if (!f) return;
  Audio2.resume(); Audio2.playMusic('battle');
  const pmax = STATE.maxHearts * HP_PER_HEART;
  const emax = f.hearts * HP_PER_HEART;

  BATTLE = {
    fighter: f, regionId, isBoss: !!isBoss,
    hero: {
      x: -0.42, depth: 0.5, z: 0, facing: 1,
      hp: pmax, maxhp: pmax,
      attackReadyAt: 0, swingUntil: 0, jumpUntil: 0, jumpReadyAt: 0,
      hurtUntil: 0, hurtInvuln: 0, blocking: false, blockUntil: 0,
      combo: 0, comboUntil: 0, special: 0, strengthUntil: 0, animT: 0, moving: false,
    },
    enemy: {
      x: 0.42, depth: 0.5, z: 0, facing: -1,
      hp: emax, maxhp: emax,
      attackReadyAt: 0, windUntil: 0, swingUntil: 0, state: 'idle',
      hurtUntil: 0, blockUntil: 0, animT: 0, nextDecision: 0,
    },
    favor: clampB(Game.crowd || 60, 20, 80),   // 0..100 = crowd favouring the player
    intensity: 0,                               // recent action -> crowd excitement
    over: false, outcome: null,
    keys: {}, mouse: { x: 0, y: 0, down: false, movedAt: 0 }, joy: { active: false, dx: 0, dy: 0 },
    attackHeld: false, blockHeld: false,
    fx: [], spectators: buildSpectators(f.name),
    lastT: performance.now(), raf: null,
  };
  buildBattleDOM();
  bindBattleInput();
  BATTLE.enemy.nextDecision = performance.now() + 900;
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
          <div class="hud-name">YOU <span class="lvl">Lv ${STATE.level}</span></div>
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
  b._rs = () => resizeBatCanvas();
  window.addEventListener('keydown', b._kd);
  window.addEventListener('keyup', b._ku);
  c.addEventListener('mousemove', b._mm);
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
  const b = BATTLE, joy = document.getElementById('bjoy'), knob = document.getElementById('bjoy-knob'), R = 44;
  function set(t) {
    const r = joy.getBoundingClientRect();
    let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy) || 1, cl = Math.min(len, R);
    dx /= len; dy /= len;
    knob.style.transform = `translate(${dx * cl}px,${dy * cl}px)`;
    b.joy.active = true; b.joy.dx = dx; b.joy.dy = dy;
  }
  function reset() { b.joy.active = false; b.joy.dx = b.joy.dy = 0; knob.style.transform = 'translate(0,0)'; }
  b._js = e => { e.preventDefault(); set(e.touches ? e.touches[0] : e); };
  joy.addEventListener('touchstart', b._js, { passive: false });
  joy.addEventListener('touchmove', b._js, { passive: false });
  joy.addEventListener('touchend', reset);
}
function unbindBattleInput() {
  const b = BATTLE; if (!b) return;
  window.removeEventListener('keydown', b._kd);
  window.removeEventListener('keyup', b._ku);
  window.removeEventListener('resize', b._rs);
}

/* ============================================================
   HERO ACTIONS
   ============================================================ */
function inRange(a, b2, extra) {
  return Math.abs(a.x - b2.x) < 0.30 + (extra || 0) && Math.abs(a.depth - b2.depth) < 0.30;
}
function heroAttackB() {
  const b = BATTLE; if (!b || b.over) return;
  const now = performance.now(), h = b.hero, e = b.enemy;
  if (now < h.attackReadyAt) return;
  h.attackReadyAt = now + 430;
  h.swingUntil = now + 190;
  const wid = STATE.equippedWeapon;
  let dur = STATE.weapons[wid] || 0; const bare = dur <= 0;
  if (!bare) STATE.weapons[wid] = dur - 1;
  const power = bare ? null : weaponPower(wid);
  const reachX = power === 'reach' ? 0.16 : power === 'sweep' ? 0.12 : 0;
  Audio2.sfx.hit();
  if (e.hp > 0 && inRange(h, e, reachX)) {
    // combo scaling
    h.combo = now < h.comboUntil ? h.combo + 1 : 1;
    h.comboUntil = now + 1100;
    let dmg = (bare ? 2 : (weaponDamage(wid) + (STATE.dmgBonus || 0)));
    if (power === 'double') dmg *= 2;
    if (now < h.strengthUntil) dmg *= 2;
    dmg *= (1 + Math.min(0.6, (h.combo - 1) * 0.12));   // combo bonus
    if (h.z > 20) dmg *= 1.25;                            // jump attack bonus
    // enemy block?
    if (now < e.blockUntil) { dmg *= 0.35; flashB('Enemy blocked!'); }
    dmg = Math.round(dmg);
    damageEnemyB(dmg, power, now);
    knockback(e, h, 0.05);
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
  if (e.hp > 0 && inRange(h, e, 0.14)) {
    let dmg = Math.round((weaponDamage(STATE.equippedWeapon) + (STATE.dmgBonus || 0)) * 2.6);
    damageEnemyB(dmg, weaponPower(STATE.equippedWeapon), now);
    knockback(e, h, 0.16); bumpFavor(6); b.intensity = 1;
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
function damageEnemyB(dmg, power, now) {
  const b = BATTLE, e = b.enemy;
  e.hp = Math.max(0, e.hp - dmg);
  e.hurtUntil = now + 160;
  popDamageB(e, dmg, false);
  if (power === 'poison') { e.poisonUntil = now + 3000; e.poisonNext = now + 400; }
  if (power === 'stun') e.stunUntil = now + 900;
  Audio2.sfx.hit();
  if (e.hp <= 0) return winBattle();
}
function knockback(target, from, amt) {
  const dir = target.x >= from.x ? 1 : -1;
  target.x = clampB(target.x + dir * amt, -0.9, 0.9);
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
  if (!b.over) updateBattle(dt, t);
  renderBattleCanvas();
  b.raf = requestAnimationFrame(battleLoop);
}

function updateBattle(dt, t) {
  const b = BATTLE, h = b.hero, e = b.enemy;

  /* hero movement (joystick or keys): x = left/right, depth = toward/away */
  let mx = 0, md = 0;
  if (b.joy.active) { mx = b.joy.dx; md = b.joy.dy; }
  else {
    if (b.keys['a'] || b.keys['arrowleft']) mx -= 1;
    if (b.keys['d'] || b.keys['arrowright']) mx += 1;
    if (b.keys['w'] || b.keys['arrowup']) md -= 1;   // away (into screen)
    if (b.keys['s'] || b.keys['arrowdown']) md += 1; // toward camera
  }
  const spd = 0.9 + (STATE.speedBonus || 0) * 0.1;
  h.moving = !!(mx || md);
  if (h.moving) { h.x = clampB(h.x + mx * spd * dt, -0.9, 0.9); h.depth = clampB(h.depth + md * spd * dt, 0.16, 0.9); h.animT += dt * 10; }
  h.facing = e.x >= h.x ? 1 : -1;

  // jump arc
  const jumping = t < h.jumpUntil;
  h.z = jumping ? Math.sin((1 - (h.jumpUntil - t) / JUMPB_DUR) * Math.PI) * 72 : 0;

  // block (hold)
  h.blocking = b.blockHeld || !!b.keys['k'];
  // continuous attack while held
  if (b.attackHeld || b.mouse.down || b.keys['j']) heroAttackB();

  // combo timeout resets
  if (t > h.comboUntil) h.combo = 0;

  // hero poison tick on enemy
  if (e.poisonUntil && t < e.poisonUntil && t >= (e.poisonNext || 0)) {
    e.poisonNext = t + 400; e.hp = Math.max(0, e.hp - 4); popDamageB(e, 4, false, '#57cc66');
    if (e.hp <= 0) return winBattle();
  }

  /* enemy AI (Mortal-Kombat style: approach, space, attack, block, retreat) */
  updateEnemyAI(dt, t);

  // crowd favour drifts toward the current health leader; intensity decays
  const heroPct = h.hp / h.maxhp, enemyPct = e.hp / e.maxhp;
  b.favor = clampB(b.favor + (heroPct - enemyPct) * 6 * dt, 5, 95);
  b.intensity = Math.max(0, b.intensity - dt * 0.8);
  updateFavorBar();
}

function updateEnemyAI(dt, t) {
  const b = BATTLE, h = b.hero, e = b.enemy;
  if (e.stunUntil && t < e.stunUntil) { e.blockUntil = 0; return; }
  e.facing = h.x >= e.x ? 1 : -1;
  const dx = h.x - e.x, dd = h.depth - e.depth, distX = Math.abs(dx), distD = Math.abs(dd);
  const espd = (0.55 + b.fighter.attack * 0.05) * (b.isBoss ? 1.15 : 1);
  if (t < e.windUntil) { /* committed to a strike, hold */ }
  else if (t >= e.nextDecision) {
    // decide behaviour based on range & a little randomness
    const r = Math.random();
    if (distX < 0.3 && distD < 0.28) {
      if (r < 0.68) { // attack
        e.windUntil = t + Math.max(300, 620 - b.fighter.attack * 40);
        e.swingUntil = e.windUntil + 160;
        setTimeout(() => enemyStrikeB(), (e.windUntil - t));
        e.nextDecision = t + Math.max(700, 1500 - b.fighter.attack * 90);
      } else if (r < 0.85) { e.blockUntil = t + 600; e.nextDecision = t + 700; } // block
      else { e.backoffUntil = t + 500; e.nextDecision = t + 700; }               // retreat
    } else { e.nextDecision = t + 200; }
  }
  // movement: approach if far, back off if in "retreat" window
  if (t < (e.backoffUntil || 0)) { e.x = clampB(e.x - Math.sign(dx || 1) * espd * dt, -0.9, 0.9); }
  else if (t >= e.windUntil && (distX > 0.26 || distD > 0.24)) {
    if (distX > 0.24) e.x = clampB(e.x + Math.sign(dx) * espd * dt, -0.9, 0.9);
    if (distD > 0.22) e.depth = clampB(e.depth + Math.sign(dd) * espd * 0.8 * dt, 0.16, 0.9);
    e.animT += dt * 9;
  }
}

function enemyStrikeB() {
  const b = BATTLE; if (!b || b.over) return;
  const now = performance.now(), h = b.hero, e = b.enemy;
  if (e.hp <= 0) return;
  if (!inRange(e, h, 0)) return;                 // player moved out of range
  if (h.z > 30) { flashB('Jumped over!'); bumpFavor(3); return; }   // jumping avoids
  if (now < h.hurtInvuln) return;
  let dmg = b.fighter.attack * 7 + 3;
  if (h.blocking) {
    const block = absorbWithShield();
    dmg *= (1 - (block || 0.15));                // even a raw guard helps a bit
    Audio2.sfx.block(); flashB(shieldDurability() <= 0 && block === 0 ? 'Guard!' : 'Blocked!');
    updateShieldB();
  } else { Audio2.sfx.hurt(); bumpFavor(-3); b.intensity = Math.min(1, b.intensity + 0.3); h.combo = 0; }
  dmg *= (1 - (STATE.armorBonus || 0));
  dmg = Math.round(dmg);
  h.hp = Math.max(0, h.hp - dmg); h.hurtUntil = now + 200; h.hurtInvuln = now + 250;
  popDamageB(h, dmg, false);
  knockback(h, e, 0.04);
  updateBattleHUD();
  if (h.hp <= 0) return loseBattle();
}

/* ============================================================
   RENDER
   ============================================================ */
function projB(x, depth, z, cw, ch) {
  const persp = 1 - depth * 0.34;
  const topY = ch * 0.46, botY = ch * 0.95;
  return { x: cw / 2 + x * (cw * 0.40) * persp, y: botY - depth * (botY - topY) - z, scale: persp };
}
function renderBattleCanvas() {
  const b = BATTLE, c = document.getElementById('bat-canvas'); if (!c) return;
  const ctx = c.getContext('2d'), dpr = b.dpr || 1, cw = c.width / dpr, ch = c.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const t = performance.now();

  // arena background
  const sky = ctx.createLinearGradient(0, 0, 0, ch);
  sky.addColorStop(0, '#2a1a4a'); sky.addColorStop(0.5, '#1c1338'); sky.addColorStop(1, '#0f0a22');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, cw, ch);

  drawCrowd(ctx, cw, ch, t);
  drawArenaFloor(ctx, cw, ch);

  // depth-sorted fighters (further back first)
  const parts = [
    { e: b.enemy, hero: false, z: b.enemy.depth },
    { e: b.hero, hero: true, z: b.hero.depth },
  ].sort((a, z) => z.z - a.z);
  parts.forEach(p => drawFighter(ctx, cw, ch, p.e, p.hero, t));

  // fx
  b.fx = b.fx.filter(f => t - f.born < f.life);
  b.fx.forEach(f => drawFxB(ctx, cw, ch, f, t));

  // vignette
  const vg = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.3, cw / 2, ch / 2, ch * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
}

function drawArenaFloor(ctx, cw, ch) {
  const topY = ch * 0.46, botY = ch * 0.97;
  const backHalf = cw * 0.40 * (1 - 0.34), frontHalf = cw * 0.40;
  ctx.beginPath();
  ctx.moveTo(cw / 2 - backHalf, topY); ctx.lineTo(cw / 2 + backHalf, topY);
  ctx.lineTo(cw / 2 + frontHalf * 1.15, botY); ctx.lineTo(cw / 2 - frontHalf * 1.15, botY); ctx.closePath();
  const g = ctx.createLinearGradient(0, topY, 0, botY);
  g.addColorStop(0, '#6a5a34'); g.addColorStop(1, '#8a7038');
  ctx.fillStyle = g; ctx.fill();
  // ring markings
  ctx.strokeStyle = 'rgba(255,220,120,0.25)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cw / 2, (topY + botY) / 2, (frontHalf + backHalf) / 2, (botY - topY) * 0.32, 0, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 6; ctx.stroke();
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
  const scale = p.scale, w = 96 * scale, hgt = 116 * scale;
  // shadow on the floor
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(ground.x, ground.y, 26 * scale * (1 - e.z / 200), 9 * scale, 0, 0, 7); ctx.fill();
  const fighter = isHero ? { art: 'hero', palette: {}, id: 'hero' } : BATTLE.fighter;
  const img = getSprite(fighter.id, fighter, e.facing);
  const hurt = t < e.hurtUntil, blocking = isHero ? e.blocking : (t < (e.blockUntil || 0));
  const lunge = t < (e.swingUntil || 0) ? 10 * (isHero ? e.facing : e.facing) : 0;
  ctx.save();
  if (hurt) ctx.globalAlpha = 0.6;
  if (img.complete && img.naturalWidth) ctx.drawImage(img, p.x - w / 2 + lunge, p.y - hgt, w, hgt);
  ctx.restore();
  // weapon on the hero
  if (isHero) drawHeroWeaponB(ctx, e, p.x + lunge, p.y - hgt * 0.55, scale, t);
  // block shield
  if (blocking) {
    ctx.fillStyle = 'rgba(120,180,255,0.35)';
    ctx.beginPath(); ctx.ellipse(p.x + e.facing * 16 * scale, p.y - hgt * 0.5, 16 * scale, 30 * scale, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(160,210,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
  }
}
function drawHeroWeaponB(ctx, h, x, y, scale, t) {
  const swinging = t < h.swingUntil;
  const base = h.facing >= 0 ? 0 : Math.PI;
  let ang = base + (h.facing >= 0 ? 0.5 : -0.5);
  if (swinging) { const pr = 1 - (h.swingUntil - t) / 190; ang = base + h.facing * (-1.1 + pr * 2.2); }
  const wpn = WEAPONS[STATE.equippedWeapon] || { id: 'knife', art: 'knife' };
  if (swinging) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 6 * scale; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, 34 * scale, base + h.facing * -1.1, ang); ctx.stroke(); }
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(scale, scale);
  if (typeof drawBladeShape === 'function') drawBladeShape(ctx, wpn);
  ctx.restore();
}

/* ---------------- fx ---------------- */
function popDamageB(e, dmg, dodged, color) { BATTLE.fx.push({ kind: 'dmg', x: e.x, depth: e.depth, z: e.z, text: dodged ? 'MISS' : '-' + dmg, color: color || (e === BATTLE.hero ? '#ff5c7a' : '#ffcf3f'), born: performance.now(), life: 700 }); }
function burstB(emoji, e) { for (let i = 0; i < 6; i++) BATTLE.fx.push({ kind: 'particle', x: e.x, depth: e.depth, z: e.z, emoji, dx: (Math.random() - 0.5) * 60, dy: -Math.random() * 60 - 20, born: performance.now(), life: 800 }); }
function drawFxB(ctx, cw, ch, f, t) {
  const p = projB(f.x, f.depth, f.z, cw, ch), age = (t - f.born) / f.life;
  ctx.globalAlpha = 1 - age;
  if (f.kind === 'dmg') { ctx.fillStyle = f.color; ctx.font = '900 20px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.text, p.x, p.y - 70 - age * 30); }
  else if (f.kind === 'particle') { ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillText(f.emoji, p.x + f.dx * age, p.y - 60 + f.dy * age); }
  ctx.globalAlpha = 1;
}

/* ============================================================
   HUD
   ============================================================ */
function updateBattleHUD() {
  const b = BATTLE; if (!b) return;
  const php = document.getElementById('php'), ehp = document.getElementById('ehp');
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
  saveGame(); Audio2.sfx.win(); Audio2.sfx.crowd();
  showBattleResult(true, { name: f.name, reward, leveled, captured, favor: Math.round(b.favor) });
}
function loseBattle() {
  const b = BATTLE; if (b.over) return;
  b.over = true; b.outcome = 'lose'; endBattleCleanup();
  STATE.losses++; saveGame(); Audio2.sfx.lose();
  showBattleResult(false, { name: b.fighter.name });
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
