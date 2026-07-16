/* ============================================================
   BACK STAB — Screens & Navigation
   Renders every screen and handles moving between them.
   ============================================================ */

const Game = {
  currentRegion: null,   // region id currently being browsed in the Arena
  crowd: 60,             // applause % going into the next fight
  screenEl: null,
};

function app() {
  if (!Game.screenEl) Game.screenEl = document.getElementById('app');
  return Game.screenEl;
}

/* Small shared top bar showing money + a home + mute button */
function topBar(title, opts) {
  opts = opts || {};
  return `<div class="topbar">
    <div class="tb-left">
      ${opts.back ? `<button class="btn-icon" data-nav="${opts.back}" title="Back">‹</button>` : ''}
      ${opts.home ? `<button class="btn-icon" data-nav="title" title="Home">⌂</button>` : ''}
    </div>
    <div class="tb-title">${title || ''}</div>
    <div class="tb-right">
      <span class="money-pill">${coinSVG()}<b>${STATE.money}</b></span>
      <button class="btn-icon mute" data-action="mute" title="Sound">${STATE.muted ? '🔇' : '🔊'}</button>
    </div>
  </div>`;
}

/* ---------------- Router ---------------- */
function showScreen(name, param) {
  Audio2.resume();
  switch (name) {
    case 'title':   return renderTitle();
    case 'map':     return renderMap();
    case 'arena':   return renderArena(param);
    case 'stats':   return renderStats();
    case 'enemies': return renderEnemies();
    default:        return renderTitle();
  }
}

/* Wire up any element with data-nav / data-action after render */
function wireCommon(root) {
  root.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => { Audio2.sfx.click(); showScreen(el.dataset.nav); });
  });
  root.querySelectorAll('[data-action="mute"]').forEach(el => {
    el.addEventListener('click', () => {
      Audio2.setMuted(!STATE.muted);
      el.textContent = STATE.muted ? '🔇' : '🔊';
    });
  });
}

/* ================= TITLE ================= */
function renderTitle() {
  Audio2.playMusic('menu');
  const el = app();
  el.className = 'screen screen-title';
  el.innerHTML = `
    <div class="title-wrap">
      <div class="studio">By Jing &amp; Ash Games</div>
      <div class="logo">
        <svg viewBox="0 0 420 170" class="logo-svg">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#ffe08a"/><stop offset="0.5" stop-color="#ff9d3a"/><stop offset="1" stop-color="#c0392b"/>
            </linearGradient>
          </defs>
          <!-- sword-and-snake emblem, centred above the wordmark -->
          <g transform="translate(210,8)">
            <path d="M0 4 L0 58" stroke="#e2e8f0" stroke-width="7" fill="none" stroke-linecap="round"/>
            <path d="M-3 6 L3 6 M-13 20 L13 20" stroke="#c9a24a" stroke-width="6" stroke-linecap="round"/>
            <path d="M0 4 L-7 14 L0 12 L7 14 Z" fill="#e2e8f0"/>
            <path d="M2 10 C 22 6 26 26 10 32 C -6 38 -2 54 14 52" stroke="#57cc66" stroke-width="7" fill="none" stroke-linecap="round"/>
            <circle cx="3" cy="9" r="2.6" fill="#20242e"/>
          </g>
          <text x="210" y="128" text-anchor="middle" class="logo-text" fill="url(#lg)">BACK STAB</text>
        </svg>
      </div>
      <div class="menu-hex">
        <button class="hexbtn" data-nav="map"><span>🗺️</span>Map</button>
        <button class="hexbtn" data-nav="arena"><span>⚔️</span>Arena</button>
        <button class="hexbtn" data-nav="stats"><span>📊</span>Stats</button>
      </div>
      <button class="link-reset" data-action="reset">New Game</button>
      <button class="btn-icon mute title-mute" data-action="mute">${STATE.muted ? '🔇' : '🔊'}</button>
      <div class="copyright">© Asher and Ren, 2026</div>
    </div>`;
  wireCommon(el);
  el.querySelector('[data-action="reset"]').addEventListener('click', () => {
    if (confirm('Start a brand-new game? Your progress will be erased.')) {
      resetGame(); Audio2.sfx.click(); renderTitle();
    }
  });
}

/* ================= MAP ================= */
function renderMap() {
  Audio2.playMusic('map');
  const el = app();
  el.className = 'screen screen-map';
  // dotted path connecting regions in order
  let paths = '';
  for (let i = 0; i < REGIONS.length - 1; i++) {
    const a = REGIONS[i], b = REGIONS[i + 1];
    paths += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="map-path"/>`;
  }
  let nodes = '';
  REGIONS.forEach(r => {
    const unlocked = isUnlocked(r.id);
    const cleared = isCleared(r.id);
    const label = (r.secret && !unlocked) ? '???' : r.name;
    nodes += `<button class="map-node ${unlocked ? '' : 'locked'} ${cleared ? 'cleared' : ''} ${r.secret ? 'secret' : ''}"
        style="left:${r.x}%;top:${r.y}%; --rc:${r.color}"
        data-region="${r.id}" ${unlocked ? '' : 'disabled'}>
        <span class="node-hex">${cleared ? '👑' : unlocked ? '⚔️' : '🔒'}</span>
        <span class="node-label">${label}</span>
      </button>`;
  });
  el.innerHTML = `
    ${topBar('World Map', { home: true })}
    <div class="map-canvas">
      <svg class="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${paths}</svg>
      ${nodes}
    </div>
    <div class="map-hint">Tap a place to enter its Arena. Beat a region to unlock the next!</div>`;
  wireCommon(el);
  el.querySelectorAll('.map-node:not(.locked)').forEach(node => {
    node.addEventListener('click', () => {
      Audio2.sfx.click();
      Game.currentRegion = node.dataset.region;
      // Regions with a dungeon theme launch the crawl; the rest use the arena.
      if (dungeonTheme(node.dataset.region)) startDungeon(node.dataset.region);
      else renderArena();
    });
  });
}

/* ================= ARENA (choose your fight) ================= */
function rollCrowd() {
  // Crowd mood before a fight: base on record + a little randomness.
  const streak = STATE.wins - STATE.losses;
  let base = 55 + streak * 2;
  base += Math.floor((Math.sin(STATE.wins * 12.9898) * 43758.5453 % 1) * 20) - 10;
  Game.crowd = Math.max(15, Math.min(95, Math.round(base)));
  return Game.crowd;
}

function renderArena(regionId) {
  Audio2.playMusic('menu');
  if (regionId) Game.currentRegion = regionId;
  // Default to the most recently unlocked region if none chosen yet.
  if (!Game.currentRegion || !isUnlocked(Game.currentRegion)) {
    const unlocked = REGIONS.filter(r => isUnlocked(r.id));
    Game.currentRegion = unlocked[unlocked.length - 1].id;
  }
  const region = regionById(Game.currentRegion);
  rollCrowd();
  const applause = Game.crowd, booing = 100 - applause;

  const fighterIds = region.enemies.slice();
  const cards = fighterIds.map(id => fighterCard(ENEMIES[id], region.id, false)).join('');
  const bossCard = region.boss ? fighterCard(BOSSES[region.boss], region.id, true) : '';

  const el = app();
  el.className = 'screen screen-arena';
  el.innerHTML = `
    ${topBar('The Arena', { home: true })}
    <div class="arena-region" style="--rc:${region.color}">
      <span>📍 ${region.secret && !isCleared(region.id) ? region.name : region.name}</span>
      <span class="record">🏆 ${STATE.wins} won &nbsp;·&nbsp; 💀 ${STATE.losses} lost</span>
    </div>
    <h2 class="arena-q">Who do you want to fight?</h2>
    <div class="fighter-grid">${cards}${bossCard}</div>
    <div class="crowd-meter">
      <div class="cm-row"><span>😀 Applause</span><span>${applause}%</span></div>
      <div class="cm-bar"><div class="cm-fill applause" style="width:${applause}%"></div></div>
      <div class="cm-row"><span>😡 Booing</span><span>${booing}%</span></div>
      <div class="cm-bar"><div class="cm-fill booing" style="width:${booing}%"></div></div>
      <div class="cm-note">A cheering crowd gives you a boost <b>and</b> bigger prize money!</div>
    </div>
    <div class="region-switch">
      ${REGIONS.filter(r => isUnlocked(r.id)).map(r =>
        `<button class="chip ${r.id === region.id ? 'on' : ''}" data-region="${r.id}">${r.name}</button>`).join('')}
    </div>`;
  wireCommon(el);
  el.querySelectorAll('.fighter-card:not(.disabled)').forEach(card => {
    card.addEventListener('click', () => {
      Audio2.sfx.click();
      startBattle(card.dataset.fighter, region.id, card.dataset.boss === '1');
    });
  });
  el.querySelectorAll('.region-switch .chip').forEach(chip => {
    chip.addEventListener('click', () => { Audio2.sfx.click(); renderArena(chip.dataset.region); });
  });
}

function fighterCard(f, regionId, isBoss) {
  const times = STATE.defeated[f.id] || 0;
  return `<button class="fighter-card ${isBoss ? 'boss' : ''}" data-fighter="${f.id}" data-boss="${isBoss ? 1 : 0}">
    <div class="fc-art">${characterSVG(f, { facing: -1 })}</div>
    <div class="fc-name">${f.name}${isBoss ? ' <span class="boss-tag">BOSS</span>' : ''}</div>
    <div class="fc-stats">
      ${renderHearts(f.hearts, f.hearts)}
    </div>
    <div class="fc-stats2">
      <span class="stat-sword">${swordIcon()}${f.attack}</span>
      <span class="stat-coin">${coinSVG()}${f.reward}</span>
    </div>
    ${times ? `<div class="fc-beaten">beaten ×${times}</div>` : ''}
    <div class="fc-fight">FIGHT</div>
  </button>`;
}

/* ================= STATS / INVENTORY / SHOP ================= */
function renderStats() {
  Audio2.playMusic('shop');
  const el = app();
  el.className = 'screen screen-stats';
  const w = WEAPONS[STATE.equippedWeapon];
  const dur = STATE.weapons[STATE.equippedWeapon] || 0;
  el.innerHTML = `
    ${topBar('Stats', { home: true })}
    <div class="stats-cols">
      <section class="panel stats-panel">
        <h3>Stats</h3>
        <div class="stat-line">Money: <b>${STATE.money}</b> ${coinSVG()}</div>
        <div class="stat-line">Weapon: <b>${w.name}</b>${weaponUpgradeLevel(STATE.equippedWeapon) ? ` <span class="rar">⚒️Lv${weaponUpgradeLevel(STATE.equippedWeapon)}</span>` : ''}</div>
        <div class="stat-sub">${weaponDamage(STATE.equippedWeapon)} dmg → ${dur}/${w.durability} dur${w.power ? ' · ' + powerLabel(w.power) : ''}</div>
        <div class="durbar"><div class="durfill" style="width:${(dur / w.durability) * 100}%"></div></div>
        ${(() => { const sid = STATE.equippedShield, s = SHIELDS[sid]; if (!s) return ''; const sd = STATE.shields[sid] || 0;
          return `<div class="stat-line">Shield: <b>${s.name}</b></div>
        <div class="stat-sub">blocks ${Math.round(s.block * 100)}% → ${sd}/${s.durability} durability${sd <= 0 ? ' (broken!)' : ''}</div>
        <div class="durbar"><div class="durfill shield ${sd <= 0 ? 'broken' : ''}" style="width:${(sd / s.durability) * 100}%"></div></div>`; })()}
        <div class="stat-line">Level: <b>${STATE.level}</b></div>
        <div class="xpbar"><div class="xpfill" style="width:${(STATE.xp / xpForLevel(STATE.level)) * 100}%"></div></div>
        <div class="stat-line">Max health: <b>${STATE.maxHearts}</b> ❤️</div>
        <div class="stat-line">Levels passed: <b>${STATE.cleared.length}</b></div>
        <div class="stat-line big">Overall: <b>${overallScore()}</b></div>
        <div class="stat-line">Perks:</div>
        <div class="stat-sub">${perksSummary()}</div>
        <button class="wide-btn" data-nav="enemies">📖 Enemies</button>
      </section>

      <section class="panel inv-panel">
        <h3>Inventory</h3>
        <div id="inv-grid" class="inv-grid"></div>
      </section>

      <section class="panel shop-panel">
        <h3>Shop</h3>
        <div id="shop-list" class="shop-list"></div>
      </section>
    </div>
    <div class="rarity-legend">
      ${Object.values(RARITY).map(r => `<span style="color:${r.color}"><b>${r.key}</b>=${r.name}</span>`).join('')}
    </div>`;
  wireCommon(el);
  renderInventory();
  renderShop();
}

function renderInventory() {
  const grid = document.getElementById('inv-grid');
  if (!grid) return;
  let cells = '';
  // Weapons owned
  Object.keys(STATE.weapons).forEach(id => {
    const w = WEAPONS[id];
    const dur = STATE.weapons[id];
    const equipped = STATE.equippedWeapon === id;
    const broken = dur <= 0;
    cells += `<button class="inv-cell ${equipped ? 'equipped' : ''} ${broken ? 'broken' : ''}"
        data-type="weapon" data-id="${id}" style="--rc:${RARITY[w.rarity].color}">
      <div class="cell-art">${weaponSVG(w)}</div>
      <div class="cell-name">${w.name}</div>
      <div class="cell-sub">${weaponDamage(id)}→${dur}${weaponUpgradeLevel(id) ? ' ·L' + weaponUpgradeLevel(id) : ''}</div>
      ${w.power ? `<div class="cell-power">${powerLabel(w.power)}</div>` : ''}
      ${equipped ? '<div class="badge">Equipped</div>' : ''}
      ${broken ? '<div class="badge broken">Broken</div>' : ''}
    </button>`;
  });
  // Shields owned (with durability)
  Object.keys(STATE.shields).forEach(id => {
    const s = SHIELDS[id];
    const equipped = STATE.equippedShield === id;
    const sdur = STATE.shields[id] || 0;
    const broken = sdur <= 0;
    cells += `<button class="inv-cell ${equipped ? 'equipped' : ''} ${broken ? 'broken' : ''}" data-type="shield" data-id="${id}" style="--rc:${RARITY[s.rarity].color}">
      <div class="cell-art">${shieldIcon(broken ? '#666' : '#b98a3a')}</div>
      <div class="cell-name">${s.name}</div>
      <div class="cell-sub">🛡️ ${sdur}/${s.durability}</div>
      ${equipped ? '<div class="badge">Equipped</div>' : ''}
      ${broken ? '<div class="badge broken">Broken</div>' : ''}
    </button>`;
  });
  // Items
  Object.keys(STATE.items).forEach(id => {
    const qty = STATE.items[id];
    if (qty <= 0) return;
    const it = ITEMS[id];
    cells += `<div class="inv-cell item" style="--rc:${RARITY[it.rarity].color}" title="${it.blurb}">
      <div class="cell-art">${itemSVG(it.art)}</div>
      <div class="cell-name">${it.name}</div>
      <div class="cell-qty">×${qty}</div>
    </div>`;
  });
  // captured enemies
  STATE.captured.forEach(id => {
    const f = getFighter(id);
    if (!f) return;
    cells += `<div class="inv-cell captured" title="Captured ${f.name}">
      <div class="cell-art">${characterSVG(f)}</div>
      <div class="cell-name">${f.name}</div>
      <div class="cell-qty">caged</div>
    </div>`;
  });
  // pad to a full grid
  const total = Math.max(12, Math.ceil((cells.match(/inv-cell/g) || []).length / 4) * 4);
  const filled = (cells.match(/inv-cell/g) || []).length;
  for (let i = filled; i < total; i++) cells += `<div class="inv-cell empty"></div>`;
  grid.innerHTML = cells;

  grid.querySelectorAll('.inv-cell[data-type]').forEach(cell => {
    cell.addEventListener('click', () => {
      const { type, id } = cell.dataset;
      if (type === 'weapon') {
        // A broken weapon CAN be equipped again — that's how you switch back to
        // it. It can also be repaired from the Shop whether equipped or not.
        STATE.equippedWeapon = id;
      } else if (type === 'shield') {
        STATE.equippedShield = id;
      }
      Audio2.sfx.click(); saveGame(); renderStats();
    });
  });
}

function renderShop() {
  const list = document.getElementById('shop-list');
  if (!list) return;
  let html = '';

  // Repair weapons — the equipped one if worn, plus ANY owned weapon that is
  // fully broken (so a weapon you switched away from can always be repaired).
  const repairIds = [];
  const eqId = STATE.equippedWeapon;
  if ((STATE.weapons[eqId] || 0) < WEAPONS[eqId].durability) repairIds.push(eqId);
  Object.keys(STATE.weapons).forEach(id => {
    if (id !== eqId && (STATE.weapons[id] || 0) <= 0) repairIds.push(id);
  });
  repairIds.forEach(id => {
    const w = WEAPONS[id], cost = w.repairCost, broken = (STATE.weapons[id] || 0) <= 0;
    html += `<div class="shop-item repair">
      <div class="si-art">🔧</div>
      <div class="si-info"><div class="si-name">Repair ${w.name}${broken ? ' <b class="broken-tag">BROKEN</b>' : ''}</div>
        <div class="si-sub">restore to ${w.durability} durability</div></div>
      <button class="buy-btn ${canAfford(cost) ? '' : 'disabled'}" data-repair="${id}" data-cost="${cost}">
        ${cost} ${coinSVG()}</button>
    </div>`;
  });

  // Repair equipped shield if worn
  const eqSId = STATE.equippedShield;
  const eqS = SHIELDS[eqSId];
  const eqSDur = STATE.shields[eqSId] || 0;
  if (eqS && eqSDur < eqS.durability) {
    const cost = eqS.repairCost;
    html += `<div class="shop-item repair">
      <div class="si-art">🛡️</div>
      <div class="si-info"><div class="si-name">Repair ${eqS.name}</div>
        <div class="si-sub">restore to ${eqS.durability} shield durability</div></div>
      <button class="buy-btn ${canAfford(cost) ? '' : 'disabled'}" data-repair-shield="${eqSId}" data-cost="${cost}">
        ${cost} ${coinSVG()}</button>
    </div>`;
  }

  // Forge: upgrade the equipped weapon (+2 damage per level)
  const uwId = STATE.equippedWeapon, uw = WEAPONS[uwId], lvl = weaponUpgradeLevel(uwId);
  if (lvl < weaponUpgradeMax()) {
    const cost = weaponUpgradeCost(uwId);
    html += `<div class="shop-item forge">
      <div class="si-art">⚒️</div>
      <div class="si-info"><div class="si-name">Forge: upgrade ${uw.name} <span class="rar">Lv ${lvl}→${lvl + 1}</span></div>
        <div class="si-sub">damage ${weaponDamage(uwId)} → ${weaponDamage(uwId) + 2} (also repairs)</div></div>
      <button class="buy-btn ${canAfford(cost) ? '' : 'disabled'}" data-upgrade="${uwId}" data-cost="${cost}">${cost} ${coinSVG()}</button>
    </div>`;
  }

  // Buyable weapons (cheapest first), showing their special power
  const shopWeapons = Object.keys(WEAPONS).filter(id => id !== 'old_knife').sort((a, b) => WEAPONS[a].price - WEAPONS[b].price);
  shopWeapons.forEach(id => {
    const w = WEAPONS[id];
    const owned = STATE.weapons[id] !== undefined;
    const sub = `${w.damage} dmg · ${w.durability} dur${w.power ? ' · ' + powerLabel(w.power) : ''}`;
    html += shopRow('weapon', id, w.name, sub, w.rarity, w.price, owned, weaponSVG(w));
  });
  ['aluminum_shield'].forEach(id => {
    const s = SHIELDS[id];
    const owned = STATE.shields[id] !== undefined;
    html += shopRow('shield', id, s.name, `blocks ${Math.round(s.block * 100)}%`, s.rarity, s.price, owned, shieldIcon('#b98a3a'));
  });
  ['apple', 'cliff_shrooms', 'mushroom_stew', 'strength_potion', 'cage'].forEach(id => {
    const it = ITEMS[id];
    html += shopRow('item', id, it.name, it.blurb, it.rarity, it.price, false, itemSVG(it.art));
  });

  // ---- Trash (sell) your weapons for coins ----
  const ownedWeapons = Object.keys(STATE.weapons);
  if (ownedWeapons.length) {
    html += `<div class="shop-sep">🗑️ Trash a weapon for coins</div>`;
    const canSell = ownedWeapons.length > 1;   // always keep at least one weapon
    ownedWeapons.forEach(id => {
      const w = WEAPONS[id];
      const val = sellValue(w);
      const equipped = STATE.equippedWeapon === id;
      html += `<div class="shop-item sell" style="--rc:${RARITY[w.rarity].color}">
        <div class="si-art">${weaponSVG(w)}</div>
        <div class="si-info">
          <div class="si-name">${w.name}${equipped ? ' <span class="eq-tag">equipped</span>' : ''}</div>
          <div class="si-sub">${canSell ? 'trash for coins' : 'your only weapon'}</div>
        </div>
        <button class="sell-btn ${canSell ? '' : 'disabled'}" data-sell="${id}" data-val="${val}">🗑️ +${val} ${coinSVG()}</button>
      </div>`;
    });
  }

  list.innerHTML = html;

  list.querySelectorAll('.buy-btn[data-repair]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.repair, cost = +btn.dataset.cost;
      if (!spend(cost)) { Audio2.sfx.lose(); return; }
      STATE.weapons[id] = WEAPONS[id].durability;
      Audio2.sfx.buy(); saveGame(); renderStats();
    });
  });
  list.querySelectorAll('.buy-btn[data-buy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type, id = btn.dataset.buy, cost = +btn.dataset.cost;
      if (!spend(cost)) { Audio2.sfx.lose(); return; }
      if (type === 'weapon') STATE.weapons[id] = WEAPONS[id].durability;
      else if (type === 'shield') STATE.shields[id] = SHIELDS[id].durability;
      else if (type === 'item') STATE.items[id] = (STATE.items[id] || 0) + 1;
      Audio2.sfx.buy(); saveGame(); renderStats();
    });
  });
  list.querySelectorAll('.buy-btn[data-repair-shield]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.repairShield, cost = +btn.dataset.cost;
      if (!spend(cost)) { Audio2.sfx.lose(); return; }
      STATE.shields[id] = SHIELDS[id].durability;
      Audio2.sfx.buy(); saveGame(); renderStats();
    });
  });
  list.querySelectorAll('.buy-btn[data-upgrade]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.upgrade, cost = +btn.dataset.cost;
      if (!spend(cost)) { Audio2.sfx.lose(); return; }
      if (!STATE.weaponUpgrades) STATE.weaponUpgrades = {};
      STATE.weaponUpgrades[id] = (STATE.weaponUpgrades[id] || 0) + 1;
      STATE.weapons[id] = WEAPONS[id].durability;   // forging also repairs
      Audio2.sfx.buy(); saveGame(); renderStats();
    });
  });
  list.querySelectorAll('.sell-btn[data-sell]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.sell, val = +btn.dataset.val, w = WEAPONS[id];
      if (Object.keys(STATE.weapons).length <= 1) { alert('You need to keep at least one weapon!'); return; }
      if (!confirm(`Trash your ${w.name} for ${val} coins? This cannot be undone.`)) return;
      delete STATE.weapons[id];
      if (STATE.equippedWeapon === id) STATE.equippedWeapon = Object.keys(STATE.weapons)[0];
      earn(val);
      Audio2.sfx.coin(); saveGame(); renderStats();
    });
  });
}

// Resale value of a weapon (about 60% of its shop price).
function sellValue(w) { return Math.max(0, Math.round((w.price || 0) * 0.6)); }

// Short label for a weapon's special power.
function powerLabel(p) {
  return ({ reach: '➹ reach', sweep: '↺ wide sweep', double: '⚔ 2× hits', lifesteal: '❤ lifesteal', poison: '☠ poison', stun: '✷ stun' })[p] || '';
}
// One-line summary of the character's permanent perks.
function perksSummary() {
  const parts = [];
  if (STATE.dmgBonus) parts.push('+' + STATE.dmgBonus + ' dmg');
  if (STATE.armorBonus) parts.push('-' + Math.round(STATE.armorBonus * 100) + '% dmg taken');
  if (STATE.speedBonus) parts.push('faster');
  const n = (STATE.modifiers || []).length;
  return (parts.join(' · ') || 'none') + (n ? `  (${n} reward${n > 1 ? 's' : ''} claimed)` : '');
}

function shopRow(type, id, name, sub, rarity, price, owned, art) {
  const r = RARITY[rarity];
  return `<div class="shop-item" style="--rc:${r.color}">
    <div class="si-art">${art}</div>
    <div class="si-info">
      <div class="si-name">${name} <span class="rar" style="color:${r.color}">${rarity}</span></div>
      <div class="si-sub">${sub}</div>
    </div>
    ${owned && type !== 'item'
      ? `<span class="owned-tag">Owned</span>`
      : `<button class="buy-btn ${canAfford(price) ? '' : 'disabled'}" data-buy="${id}" data-type="${type}" data-cost="${price}">${price} ${coinSVG()}</button>`}
  </div>`;
}

/* ================= ENEMIES (bestiary) ================= */
function renderEnemies() {
  const el = app();
  el.className = 'screen screen-enemies';
  const all = Object.values(ENEMIES).concat(Object.values(BOSSES).filter(b => !b.secret || isCleared('secret')));
  const cards = all.map(f => {
    const beaten = STATE.defeated[f.id] || 0;
    const known = beaten > 0;
    return `<div class="bestiary-card ${f.boss ? 'boss' : ''} ${known ? '' : 'unknown'}">
      <div class="bc-art">${characterSVG(f, { facing: -1 })}</div>
      <div class="bc-name">${known ? f.name : '???'}</div>
      <div class="bc-row">${renderHearts(f.hearts, f.hearts)}</div>
      <div class="bc-row2"><span>${swordIcon()}${f.attack}</span><span>${coinSVG()}${f.reward}</span></div>
      <div class="bc-blurb">${known ? f.blurb : 'Defeat this enemy to reveal its card.'}</div>
      ${beaten ? `<div class="bc-beaten">Defeated ×${beaten}</div>` : ''}
    </div>`;
  }).join('');
  el.innerHTML = `
    ${topBar('Enemies', { back: 'stats', home: true })}
    <div class="bestiary-grid">${cards}</div>`;
  wireCommon(el);
}
