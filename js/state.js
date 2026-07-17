/* ============================================================
   BACK STAB — Game State, Save & Load
   ============================================================ */

const SAVE_KEY = 'backstab_save_v1';
// The active save key is per-player (see js/auth.js); falls back to SAVE_KEY.
function currentSaveKey() { return (typeof Auth !== 'undefined' && Auth.saveKey) ? Auth.saveKey() : SAVE_KEY; }

/* A brand-new hero starts HUMBLE:
   5 hearts, a basic weapon, and a little money. Hearts no longer grow just by
   levelling up — extra max hearts are a rare, hard-won reward for clearing a
   level, so every heart matters. */
function newGame() {
  return {
    money: 15,
    maxHearts: 5,
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
    // permanent poison artifacts earned in the Toxic Temple
    artifacts: [],
    // which map regions are unlocked / cleared
    unlocked: ['dead_cliffs'],
    cleared: [],
    // which ACT the player is in (1 = the realm of Karrowmere; 2 = through time)
    act: 1,
    // marks that this save is on the 5-heart rebalance (see loadGame migration)
    heartsRebalanced: true,
    // extra lives — rare Legendary boss-fight boons that let you cheat death once
    extraLives: 0,
    // per-fighter defeat count (for the bestiary + progression)
    defeated: {},
    muted: false,
  };
}

let STATE = loadGame() || newGame();

function saveGame() {
  try {
    localStorage.setItem(currentSaveKey(), JSON.stringify(STATE));
  } catch (e) {
    /* storage might be disabled — the game still works this session */
  }
}

// Load the logged-in player's character (called after login / register / reset).
function loadUserState() {
  STATE = loadGame() || newGame();
  saveGame();
  return STATE;
}

function loadGame() {
  try {
    const raw = localStorage.getItem(currentSaveKey());
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Merge with a fresh template so older saves gain any new fields.
    const merged = Object.assign(newGame(), data);
    // Migrate older saves where owned shields were stored as `true`.
    Object.keys(merged.shields || {}).forEach(id => {
      if (merged.shields[id] === true) merged.shields[id] = (SHIELDS[id] ? SHIELDS[id].durability : 0);
    });
    // One-time heart rebalance: old saves grew max hearts by levelling up. Bring
    // them down to the new 5-heart baseline once, then let rare end-of-level
    // rewards raise the cap normally from there.
    if (!data.heartsRebalanced) {
      merged.maxHearts = Math.min(merged.maxHearts || 5, 5);
      merged.heartsRebalanced = true;
    }
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
   Each level needs a bit more XP. Levelling up no longer grants hearts (those
   are a rare end-of-level reward now) — it still tracks progress and score. */
function xpForLevel(level) {
  return 5 + level * 5; // lvl1->10, lvl2->15, lvl3->20 ...
}

function gainXp(amount) {
  STATE.xp += amount;
  let leveled = false;
  while (STATE.xp >= xpForLevel(STATE.level)) {
    STATE.xp -= xpForLevel(STATE.level);
    STATE.level++;
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
function hasArtifact(id) { return !!(STATE.artifacts && STATE.artifacts.includes(id)); }

/* ---------- Acts ----------
   Act 1 is the realm of Karrowmere. Beating its Backstabber unlocks the time
   machine and Act 2 — the same map & engine, re-skinned across time periods. */
function currentAct() { return STATE.act || 1; }
// An Act-2 region is "built" only once it has an ACT2_THEMES entry; until then
// the time-travel path stops there ("to be continued").
function act2Built(id) { return typeof ACT2_THEMES !== 'undefined' && !!ACT2_THEMES[id]; }
function beginActTwo() {
  STATE.act = 2;
  STATE.unlocked = ['dead_cliffs'];   // Act 2 restarts the map with your Act-1 gear intact
  STATE.cleared = [];
  STATE.rewardedRegions = [];
  saveGame();
}

function clearRegion(id) {
  if (!STATE.cleared.includes(id)) STATE.cleared.push(id);
  // Unlock the next region on the path — skipping any that are reachable only
  // through a hidden passage (e.g. the Sandcastle).
  let ni = REGIONS.findIndex(r => r.id === id) + 1;
  while (REGIONS[ni] && REGIONS[ni].passageOnly) ni++;
  const next = REGIONS[ni];
  // In Act 2, only advance to eras that have actually been built yet.
  const okForAct = next && (currentAct() !== 2 || act2Built(next.id));
  if (okForAct && !STATE.unlocked.includes(next.id)) STATE.unlocked.push(next.id);
  saveGame();
}

// Unlock a region directly (used by secret passages).
function unlockRegion(id) {
  if (!STATE.unlocked.includes(id)) { STATE.unlocked.push(id); saveGame(); return true; }
  return false;
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
