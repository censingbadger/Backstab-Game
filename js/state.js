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
    shields: { wood_shield: true },
    // consumable items -> quantity
    items: { apple: 2 },
    // enemies captured with the Cage
    captured: [],
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
    return Object.assign(newGame(), data);
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
