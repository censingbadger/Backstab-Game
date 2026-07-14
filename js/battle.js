/* ============================================================
   BACK STAB — Real-time Battle
   On-screen buttons (Attack / Block / Dodge / Special / Items).
   The crowd meter boosts your prize money AND helps you fight.
   ============================================================ */

let BATTLE = null;

function startBattle(fighterId, regionId, isBoss) {
  const f = getFighter(fighterId);
  if (!f) return;
  const region = regionById(regionId);

  BATTLE = {
    fighter: f,
    regionId,
    isBoss: !!isBoss,
    playerMaxHP: STATE.maxHearts * HP_PER_HEART,
    playerHP: STATE.maxHearts * HP_PER_HEART,
    enemyMaxHP: f.hearts * HP_PER_HEART,
    enemyHP: f.hearts * HP_PER_HEART,
    crowd: Game.crowd,
    special: 0,          // 0..100 charge
    blocking: false,
    blockUntil: 0,
    dodgeUntil: 0,
    dodgeReadyAt: 0,
    attackReadyAt: 0,
    specialReadyAt: 0,
    strengthUntil: 0,
    enemyState: 'idle',  // idle | windup | recover
    enemyNextAt: 0,
    enemyStrikeAt: 0,
    over: false,
    tickTimer: null,
    startedAt: performance.now(),
  };

  renderBattle();
  // enemy first move after a short grace period
  BATTLE.enemyNextAt = performance.now() + 1400;
  BATTLE.tickTimer = setInterval(battleTick, 60);
  Audio2.playMusic('battle');
}

function renderBattle() {
  const b = BATTLE;
  const f = b.fighter;
  const el = app();
  el.className = 'screen screen-battle';
  el.innerHTML = `
    <div class="battle-top">
      <div class="fighter-hud left">
        <div class="hud-name">YOU <span class="lvl">Lv ${STATE.level}</span></div>
        <div id="php" class="hud-hearts">${renderHearts(b.playerHP / HP_PER_HEART, STATE.maxHearts)}</div>
      </div>
      <div class="vs">VS</div>
      <div class="fighter-hud right">
        <div class="hud-name">${f.name}${b.isBoss ? ' 👑' : ''}</div>
        <div id="ehp" class="hud-hearts">${renderHearts(b.enemyHP / HP_PER_HEART, f.hearts)}</div>
      </div>
    </div>

    <div class="crowd-strip">
      <span>😀</span>
      <div class="cm-bar big"><div id="crowdfill" class="cm-fill applause" style="width:${b.crowd}%"></div></div>
      <span>😡</span>
    </div>

    <div class="arena-stage">
      <div class="crowd-row" id="crowdrow">${crowdSigns(f.name)}</div>
      <div class="stage-floor">
        <div id="hero" class="combatant hero-side">
          <div class="cb-art">${characterSVG({ art: 'hero', palette: {} }, { facing: 1 })}</div>
        </div>
        <div id="enemy" class="combatant enemy-side">
          <div id="enemy-tell" class="telegraph"></div>
          <div class="cb-art">${characterSVG(f, { facing: -1 })}</div>
        </div>
        <div id="fx-layer" class="fx-layer"></div>
      </div>
    </div>

    <div class="battle-controls">
      <button class="cbtn attack" data-act="attack"><span>🗡️</span>Attack</button>
      <button class="cbtn block" data-act="block"><span>🛡️</span>Block</button>
      <button class="cbtn dodge" data-act="dodge"><span>💨</span>Dodge</button>
      <button class="cbtn special" data-act="special"><span>⚡</span>Special
        <div class="sp-meter"><div id="spfill" class="sp-fill"></div></div>
      </button>
      <button class="cbtn item" data-act="item"><span>🎒</span>Items</button>
    </div>
    <div id="item-tray" class="item-tray hidden"></div>
    <div id="battle-msg" class="battle-msg"></div>
  `;

  el.querySelectorAll('.cbtn').forEach(btn => {
    btn.addEventListener('click', () => onAction(btn.dataset.act));
  });
}

function crowdSigns(name) {
  const signs = [`Go ${name}!`, `Yay ${name}`, `${name}!`, `We ♥ ${name}`, `Boo!`, `Fight!`];
  let html = '';
  for (let i = 0; i < 9; i++) {
    const s = signs[i % signs.length];
    html += `<div class="spectator"><div class="sign">${s}</div><div class="head"></div></div>`;
  }
  return html;
}

/* ---------------- Player actions ---------------- */
function onAction(act) {
  const b = BATTLE;
  if (!b || b.over) return;
  const now = performance.now();
  Audio2.resume();

  if (act === 'attack') {
    if (now < b.attackReadyAt) return;
    b.attackReadyAt = now + 600;
    doPlayerAttack(1);
    animate('hero', 'lunge');
  } else if (act === 'block') {
    if (now < b.blockUntil) return;
    b.blocking = true;
    b.blockUntil = now + 900;
    animate('hero', 'guard');
    Audio2.sfx.block();
    setTimeout(() => { if (BATTLE) BATTLE.blocking = false; }, 900);
  } else if (act === 'dodge') {
    if (now < b.dodgeReadyAt) return;
    b.dodgeUntil = now + 420;
    b.dodgeReadyAt = now + 1100;
    animate('hero', 'dodge');
    Audio2.sfx.dodge();
    bumpCrowd(3);
  } else if (act === 'special') {
    if (b.special < 100 || now < b.specialReadyAt) { flash('Special not ready!'); return; }
    b.special = 0;
    b.specialReadyAt = now + 400;
    updateSpecial();
    doPlayerAttack(2.4, true);
    animate('hero', 'special');
    Audio2.sfx.special();
    burst('⚡');
  } else if (act === 'item') {
    toggleItemTray();
  }
}

function doPlayerAttack(mult, isSpecial) {
  const b = BATTLE;
  const wId = STATE.equippedWeapon;
  const w = WEAPONS[wId];
  let dur = STATE.weapons[wId] || 0;
  let dmg;
  if (dur <= 0) {
    dmg = 2; // bare-handed if the weapon is broken
    flash('Weapon broken! Repair it at the shop.');
  } else {
    dmg = w.damage;
    if (!isSpecial) { // specials don't wear the weapon as fast
      STATE.weapons[wId] = dur - 1;
    }
  }
  // strength potion + crowd boost
  if (performance.now() < b.strengthUntil) dmg *= 2;
  if (b.crowd >= 70) dmg *= 1.15;
  dmg = Math.round(dmg * mult);

  b.enemyHP = Math.max(0, b.enemyHP - dmg);
  b.special = Math.min(100, b.special + (isSpecial ? 0 : 18));
  updateSpecial();
  updateHP();
  updateWeaponWarn();
  bumpCrowd(2);
  animate('enemy', 'hurt');
  popDamage('enemy', dmg);
  isSpecial ? Audio2.sfx.bighit() : Audio2.sfx.hit();

  if (b.enemyHP <= 0) return winBattle();
}

/* ---------------- Enemy AI ---------------- */
function battleTick() {
  const b = BATTLE;
  if (!b || b.over) return;
  const now = performance.now();

  if (b.enemyState === 'idle' && now >= b.enemyNextAt) {
    // begin wind-up (telegraph)
    b.enemyState = 'windup';
    const windup = Math.max(420, 780 - b.fighter.attack * 40);
    b.enemyStrikeAt = now + windup;
    const tell = document.getElementById('enemy-tell');
    if (tell) { tell.classList.add('active'); }
    animate('enemy', 'windup');
  } else if (b.enemyState === 'windup' && now >= b.enemyStrikeAt) {
    enemyStrike();
    b.enemyState = 'recover';
    const recover = Math.max(700, 1600 - b.fighter.attack * 90);
    b.enemyNextAt = now + recover;
    const tell = document.getElementById('enemy-tell');
    if (tell) tell.classList.remove('active');
    setTimeout(() => { if (BATTLE && BATTLE.enemyState === 'recover') BATTLE.enemyState = 'idle'; }, 250);
  }

  // gentle crowd decay toward 50
  if (Math.random() < 0.05) {
    b.crowd += b.crowd > 50 ? -1 : 1;
    updateCrowd();
  }
}

function enemyStrike() {
  const b = BATTLE;
  const now = performance.now();
  animate('enemy', 'lunge');

  // Dodged? full avoid.
  if (now < b.dodgeUntil) {
    flash('Dodged!');
    bumpCrowd(4);
    popDamage('hero', 0, true);
    return;
  }
  let dmg = b.fighter.attack * 7 + 3;
  if (b.crowd < 30) dmg *= 1.15; // hostile crowd hurts you
  if (b.blocking) {
    const shield = SHIELDS[STATE.equippedShield] || { block: 0 };
    dmg *= (1 - shield.block);
    Audio2.sfx.block();
    flash('Blocked!');
  } else {
    Audio2.sfx.hurt();
    animate('hero', 'hurt');
    bumpCrowd(-3);
  }
  dmg = Math.round(dmg);
  b.playerHP = Math.max(0, b.playerHP - dmg);
  popDamage('hero', dmg);
  updateHP();
  if (b.playerHP <= 0) return loseBattle();
}

/* ---------------- Items in battle ---------------- */
function toggleItemTray() {
  const tray = document.getElementById('item-tray');
  if (!tray) return;
  const owned = Object.keys(STATE.items).filter(id => STATE.items[id] > 0);
  if (owned.length === 0) { flash('No items!'); return; }
  if (!tray.classList.contains('hidden')) { tray.classList.add('hidden'); return; }
  tray.innerHTML = owned.map(id => {
    const it = ITEMS[id];
    return `<button class="tray-item" data-item="${id}">
      <div>${itemSVG(it.art)}</div><span>${it.name} ×${STATE.items[id]}</span></button>`;
  }).join('');
  tray.classList.remove('hidden');
  tray.querySelectorAll('.tray-item').forEach(btn => {
    btn.addEventListener('click', () => { useItem(btn.dataset.item); tray.classList.add('hidden'); });
  });
}

function useItem(id) {
  const b = BATTLE;
  const it = ITEMS[id];
  if (!it || (STATE.items[id] || 0) <= 0) return;

  if (it.type === 'heal') {
    b.playerHP = Math.min(b.playerMaxHP, b.playerHP + it.heal * HP_PER_HEART);
    Audio2.sfx.heal(); burst('❤️'); updateHP();
  } else if (it.type === 'buff') {
    b.strengthUntil = performance.now() + it.duration;
    Audio2.sfx.special(); burst('💪'); flash('Strength up!');
  } else if (it.type === 'capture') {
    if (b.enemyHP > b.enemyMaxHP * 0.25) { flash('Weaken it below ¼ health first!'); return; }
    STATE.items[id]--;
    if (STATE.items[id] <= 0) delete STATE.items[id];
    if (!STATE.captured.includes(b.fighter.id)) STATE.captured.push(b.fighter.id);
    Audio2.sfx.win(); burst('🎉');
    flash(`Captured ${b.fighter.name}!`);
    saveGame();
    return winBattle(true);
  }
  STATE.items[id]--;
  if (STATE.items[id] <= 0) delete STATE.items[id];
  saveGame();
}

/* ---------------- Win / Lose ---------------- */
function endCleanup() {
  if (BATTLE && BATTLE.tickTimer) clearInterval(BATTLE.tickTimer);
  if (BATTLE) BATTLE.over = true;
}

function winBattle(captured) {
  const b = BATTLE;
  if (b.over && !captured) return;
  endCleanup();
  const f = b.fighter;
  // reward scaled by crowd applause (0.6x .. 1.6x)
  const mult = 0.6 + b.crowd / 100;
  const reward = Math.max(1, Math.round(f.reward * mult));
  earn(reward);
  STATE.wins++;
  recordDefeat(f.id);
  const leveled = gainXp(b.isBoss ? 15 : 5 + Math.round(f.reward / 3));
  // Clear region when its boss is beaten
  let unlockedMsg = '';
  if (b.isBoss) {
    const region = regionById(b.regionId);
    if (region && region.boss === f.id) {
      const wasCleared = isCleared(region.id);
      clearRegion(region.id);
      if (!wasCleared) {
        const idx = REGIONS.findIndex(r => r.id === region.id);
        const next = REGIONS[idx + 1];
        unlockedMsg = next ? `New region unlocked: <b>${next.secret ? '???' : next.name}</b>!` : `You have conquered the whole world!`;
      }
    }
  }
  saveGame();
  Audio2.sfx.win(); Audio2.sfx.crowd();
  showResult(true, {
    name: f.name, reward, leveled, captured,
    unlockedMsg, crowd: b.crowd,
  });
}

function loseBattle() {
  const b = BATTLE;
  if (b.over) return;
  endCleanup();
  STATE.losses++;
  saveGame();
  Audio2.sfx.lose();
  animate('hero', 'ko');
  showResult(false, { name: b.fighter.name });
}

function showResult(won, data) {
  const overlay = document.createElement('div');
  overlay.className = 'result-overlay';
  overlay.innerHTML = `
    <div class="result-card ${won ? 'win' : 'lose'}">
      <h2>${won ? (data.captured ? 'CAPTURED!' : 'VICTORY!') : 'DEFEATED'}</h2>
      ${won ? `
        <p>You beat <b>${data.name}</b>!</p>
        <p class="reward">+${data.reward} ${coinSVG()} <span class="crowd-bonus">(crowd ${data.crowd}%)</span></p>
        ${data.leveled ? `<p class="levelup">⭐ LEVEL UP! Now level ${STATE.level} — max health +½ ❤️</p>` : ''}
        ${data.unlockedMsg ? `<p class="unlock">🗺️ ${data.unlockedMsg}</p>` : ''}
      ` : `
        <p>${data.name} got the better of you this time.</p>
        <p class="tip">Tip: block and dodge their attacks, and buy better gear in the Shop!</p>
      `}
      <div class="result-btns">
        <button class="wide-btn" id="again">⚔️ Arena</button>
        <button class="wide-btn ghost" id="tohome">⌂ Home</button>
      </div>
    </div>`;
  app().appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  overlay.querySelector('#again').addEventListener('click', () => { Audio2.sfx.click(); renderArena(BATTLE.regionId); });
  overlay.querySelector('#tohome').addEventListener('click', () => { Audio2.sfx.click(); showScreen('title'); });
}

/* ---------------- Battle UI helpers ---------------- */
function updateHP() {
  const b = BATTLE;
  const php = document.getElementById('php');
  const ehp = document.getElementById('ehp');
  if (php) php.innerHTML = renderHearts(b.playerHP / HP_PER_HEART, STATE.maxHearts);
  if (ehp) ehp.innerHTML = renderHearts(b.enemyHP / HP_PER_HEART, b.fighter.hearts);
}
function updateSpecial() {
  const fill = document.getElementById('spfill');
  if (fill) fill.style.width = BATTLE.special + '%';
  const btn = document.querySelector('.cbtn.special');
  if (btn) btn.classList.toggle('ready', BATTLE.special >= 100);
}
function updateCrowd() {
  const fill = document.getElementById('crowdfill');
  if (fill) fill.style.width = BATTLE.crowd + '%';
}
function bumpCrowd(n) {
  BATTLE.crowd = Math.max(5, Math.min(100, BATTLE.crowd + n));
  updateCrowd();
}
function updateWeaponWarn() {
  const wId = STATE.equippedWeapon;
  const dur = STATE.weapons[wId] || 0;
  const btn = document.querySelector('.cbtn.attack');
  if (btn) btn.classList.toggle('warn', dur <= 12);
}
function animate(id, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('lunge', 'hurt', 'guard', 'dodge', 'special', 'windup', 'ko');
  void el.offsetWidth; // restart animation
  el.classList.add(cls);
  if (cls !== 'ko') setTimeout(() => el && el.classList.remove(cls), 500);
}
function popDamage(who, dmg, dodged) {
  const layer = document.getElementById('fx-layer');
  if (!layer) return;
  const d = document.createElement('div');
  d.className = 'dmg-pop ' + (who === 'hero' ? 'left' : 'right') + (dodged ? ' dodge' : '');
  d.textContent = dodged ? 'MISS' : '-' + dmg;
  layer.appendChild(d);
  setTimeout(() => d.remove(), 800);
}
function flash(msg) {
  const el = document.getElementById('battle-msg');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1100);
}
function burst(emoji) {
  const layer = document.getElementById('fx-layer');
  if (!layer) return;
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = emoji;
    p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
    p.style.setProperty('--dy', (-Math.random() * 120 - 40) + 'px');
    layer.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}
