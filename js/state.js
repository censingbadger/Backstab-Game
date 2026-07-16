/* ============================================================
   BACK STAB — Game State, Save & Load
   ============================================================ */

const SAVE_KEY = 'backstab_save_v1';

/* A brand-new hero starts HUMBLE:
   ~3 hearts, a basic weapon, and a little money. */
function newGame() {
  return {
    money: 15,
    maxHearts: 3,
    level: 1,
    xp: 0,
    wins: 0,
    losses: 0,
    equippedWeapon: 'old_knife',
    equippedShield: 'wood_shield',
    // weapons the player owns -> current durability remaining
    weapons: { old_knife: WEAPONS.old_knife.durability },
    // shields the player owns -> current durability remaining
    shields: { wood_shield: SHIELDS.wood_shield.durability },
    // consumable items -> quantity
    items: { apple: 2 },
    // enemies captured with the Cage
    captured: [],
    // permanent reward modifiers earned by clearing dungeons
    dmgBonus: 0, armorBonus: 0, speedBonus: 0, modifiers: [],
    // roguelike progression: weapon upgrade levels, and which regions already
    // handed out their one-time reward modifier
    weaponUpgrades: {}, rewardedRegions: [],
    // which map regions are unlocked / cleared
    unlocked: ['dead_cliffs'],
    cleared: [],
    // per-fighter defeat count (for the bestiary + progression)
    defeated: {},
    muted: false,
  };
}

let STATE = loadGame() || newGame();

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(STATE));
  } catch (e) {
    /* storage might be disabled — the game still works this session */
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Merge with a fresh template so older saves gain any new fields.
    const merged = Object.assign(newGame(), data);
    // Migrate older saves where owned shields were stored as `true`.
    Object.keys(merged.shields || {}).forEach(id => {
      if (merged.shields[id] === true) merged.shields[id] = (SHIELDS[id] ? SHIELDS[id].durability : 0);
    });
    return merged;
  } catch (e) {
    return null;
  }
}

function resetGame() {
  STATE = newGame();
  saveGame();
}

/* ---------- XP / levelling ----------
   Each level needs a bit more XP. Levelling up grants +½ heart of max
   health and a full heal, so winning fights makes the hero feel stronger. */
function xpForLevel(level) {
  return 5 + level * 5; // lvl1->10, lvl2->15, lvl3->20 ...
}

function gainXp(amount) {
  STATE.xp += amount;
  let leveled = false;
  while (STATE.xp >= xpForLevel(STATE.level)) {
    STATE.xp -= xpForLevel(STATE.level);
    STATE.level++;
    STATE.maxHearts += 0.5;
    leveled = true;
  }
  return leveled;
}

/* ---------- Overall score (shown on the Stats screen) ---------- */
function overallScore() {
  const w = WEAPONS[STATE.equippedWeapon] || { damage: 0 };
  return Math.round(
    STATE.maxHearts * 10 +
    STATE.level * 8 +
    w.damage * 2 +
    STATE.wins * 3 +
    STATE.money
  );
}

/* ---------- Economy helpers ---------- */
function canAfford(price) { return STATE.money >= price; }

function spend(price) {
  if (!canAfford(price)) return false;
  STATE.money -= price;
  saveGame();
  return true;
}

function earn(amount) {
  STATE.money += amount;
  saveGame();
}

/* ---------- Region / progression helpers ---------- */
function regionById(id) { return REGIONS.find(r => r.id === id); }

function isUnlocked(id) { return STATE.unlocked.includes(id); }
function isCleared(id) { return STATE.cleared.includes(id); }

function clearRegion(id) {
  if (!STATE.cleared.includes(id)) STATE.cleared.push(id);
  // Unlock the next region on the path.
  const idx = REGIONS.findIndex(r => r.id === id);
  const next = REGIONS[idx + 1];
  if (next && !STATE.unlocked.includes(next.id)) {
    STATE.unlocked.push(next.id);
  }
  saveGame();
}

/* Record a defeat of a fighter (enemy or boss) */
function recordDefeat(fighterId) {
  STATE.defeated[fighterId] = (STATE.defeated[fighterId] || 0) + 1;
}

/* ---------- Shield helpers ----------
   The equipped shield reduces damage when you get hit, losing 1 durability
   each time until it breaks (0). Returns the fraction of damage blocked and
   consumes durability; returns 0 when there is no working shield. */
function shieldDurability() {
  const id = STATE.equippedShield;
  if (!id || STATE.shields[id] === undefined) return 0;
  return STATE.shields[id];
}
function absorbWithShield() {
  const id = STATE.equippedShield;
  const s = SHIELDS[id];
  if (!s || (STATE.shields[id] || 0) <= 0) return 0;
  STATE.shields[id] = Math.max(0, STATE.shields[id] - 1);
  return s.block;
}

/* ---------- Weapon upgrades (the Forge) ---------- */
function weaponUpgradeLevel(id) { return (STATE.weaponUpgrades && STATE.weaponUpgrades[id]) || 0; }
function weaponDamage(id) {
  const w = WEAPONS[id]; if (!w) return 0;
  return w.damage + weaponUpgradeLevel(id) * 2;   // +2 damage per upgrade level
}
function weaponUpgradeMax() { return 8; }
function weaponUpgradeCost(id) { return 40 + weaponUpgradeLevel(id) * 30; }
function weaponPower(id) { const w = WEAPONS[id]; return w ? w.power : null; }
