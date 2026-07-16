/* ============================================================
   BACK STAB — Game Data
   By Jing & Ash Games · © Asher and Ren, 2026

   All numbers use these conventions (confirmed with the designers):
   - Health is measured in HEARTS and supports HALF-hearts (0.5 steps).
       Internally 1 heart = 10 HP, so a half-heart = 5 HP.
   - Weapons show  DAMAGE -> DURABILITY  (first = damage, second = durability).
       Every swing costs 1 durability. At 0 the weapon is unusable until
       it is REPAIRED at the shop.
   - Enemy "swords" = attack power. Enemy "money" = reward for beating it.
   ============================================================ */

// 1 heart = this many HP (half-heart = half of it). Larger = longer fights.
// Enemy cards keep their small heart values; internally each heart is a big
// health pool so real-time battles last closer to a minute.
const HP_PER_HEART = 200;

/* ---------- Rarities ---------- */
const RARITY = {
  C: { key: 'C', name: 'Common',        color: '#b8c0cc' },
  U: { key: 'U', name: 'Uncommon',      color: '#57cc66' },
  R: { key: 'R', name: 'Rare',          color: '#3aa0ff' },
  E: { key: 'E', name: 'Epic',          color: '#b061ff' },
  L: { key: 'L', name: 'Legendary',     color: '#ffb020' },
  T: { key: 'T', name: 'Transcendent',  color: '#ff4d6d' },
};

/* ---------- Enemy roster ----------
   hearts  = max health in hearts (halves allowed)
   attack  = "swords" on the card (attack power)
   reward  = money dropped when defeated
   art     = key used by art.js to draw the character
   palette = main colours for the drawn character
*/
const ENEMIES = {
  zombie:        { id:'zombie',        name:'Zombie',         hearts:1.5, attack:1, reward:1,  art:'zombie',   palette:{ skin:'#7bb26a', cloth:'#5a4a3a' }, blurb:'A slow, shambling corpse. Every hero\'s first fight.' },
  skeleton:      { id:'skeleton',      name:'Skeleton',       hearts:1,   attack:1, reward:1,  art:'skeleton', palette:{ skin:'#e9e4d4', cloth:'#3a3a44' }, blurb:'Rattling bones held together by pure spite.' },
  giant_tick:    { id:'giant_tick',    name:'Giant Tick',     hearts:1,   attack:2, reward:2,  art:'bug',      palette:{ skin:'#7a4b2a', cloth:'#4a2c18' }, blurb:'A blood-swollen pest the size of a dog.' },
  mosquito:      { id:'mosquito',      name:'Mosquito',       hearts:0.5, attack:1, reward:0,  art:'bug',      palette:{ skin:'#556b5a', cloth:'#33443a' }, blurb:'Tiny, fast and extremely annoying.' },
  angry_peasant: { id:'angry_peasant', name:'Angry Peasant',  hearts:2,   attack:2, reward:3,  art:'peasant',  palette:{ skin:'#e2b48c', cloth:'#8a5a3a' }, blurb:'He is having a very bad day and it is your fault.' },
  baby_werewolf: { id:'baby_werewolf', name:'Baby Werewolf',  hearts:3,   attack:3, reward:5,  art:'wolf',     palette:{ skin:'#9a8f80', cloth:'#5a5148' }, blurb:'Cute until the fangs come out.' },
  lumberjack:    { id:'lumberjack',    name:'Lumberjack',     hearts:2,   attack:3, reward:4,  art:'peasant',  palette:{ skin:'#d8a074', cloth:'#a33a33' }, blurb:'Swings an axe like he swings at trees.' },
  bear:          { id:'bear',          name:'Bear',           hearts:2.5, attack:2, reward:4,  art:'bear',     palette:{ skin:'#7a5230', cloth:'#4a3018' }, blurb:'Big, grumpy, and surprisingly quick.' },
  mummy:         { id:'mummy',         name:'Mummy',          hearts:3,   attack:3, reward:5,  art:'mummy',    palette:{ skin:'#e6dcc0', cloth:'#c8b98f' }, blurb:'Wrapped up and ready to ruin your day.' },
  gooster:       { id:'gooster',       name:'Gooster',        hearts:3.5, attack:3, reward:6,  art:'goo',      palette:{ skin:'#57c98a', cloth:'#2f8a5a' }, blurb:'A wobbling goo-monster. Do not step in it.' },
  phantom:       { id:'phantom',       name:'Phantom',        hearts:4,   attack:3, reward:15, art:'phantom',  palette:{ skin:'#c9d6ff', cloth:'#8a95c9' }, blurb:'Half-here, half-gone, all trouble.' },
  colossal_squid:{ id:'colossal_squid',name:'Colossal Squid', hearts:3.5, attack:3, reward:10, art:'squid',    palette:{ skin:'#c85a8a', cloth:'#8a2f5a' }, blurb:'Tentacles from the deep, dripping on the sand.' },
  pirate:        { id:'pirate',        name:'Pirate',         hearts:3,   attack:3, reward:9,  art:'pirate',   palette:{ skin:'#d8a074', cloth:'#8a2f2f' }, blurb:'Yarr. He wants your money more than your life.' },
  swordfish:     { id:'swordfish',     name:'Swordfish',      hearts:2.5, attack:4, reward:12, art:'fish',     palette:{ skin:'#4a90d9', cloth:'#2f5a8a' }, blurb:'Nature gave it a sword. It knows how to use it.' },
  yeti:          { id:'yeti',          name:'Yeti',           hearts:4,   attack:4, reward:15, art:'yeti',     palette:{ skin:'#e6f0ff', cloth:'#b8ccdd' }, blurb:'A mountain of white fur and cold fury.' },
  polar_bear:    { id:'polar_bear',    name:'Polar Bear',     hearts:3.5, attack:4, reward:9,  art:'bear',     palette:{ skin:'#eef4fb', cloth:'#c4d2e0' }, blurb:'Like a bear, but colder and crankier.' },
  icius:         { id:'icius',         name:'Icius',          hearts:4.5, attack:4, reward:18, art:'yeti',     palette:{ skin:'#8fd6ff', cloth:'#4a90c9' }, blurb:'The Ice Monster. Its touch freezes the arena.' },
  sandworm:      { id:'sandworm',      name:'Sandworm',       hearts:5,   attack:4, reward:25, art:'worm',     palette:{ skin:'#d9a441', cloth:'#a8791f' }, blurb:'Erupts from the dunes with a gaping maw.' },
  sandy_skeleton:{ id:'sandy_skeleton',name:'Sandy Skeleton', hearts:3.5, attack:3, reward:12, art:'skeleton', palette:{ skin:'#d9c48f', cloth:'#8a6f3a' }, blurb:'A skeleton that got lost in the desert.' },
  werewolf:      { id:'werewolf',      name:'Werewolf',       hearts:4.5, attack:5, reward:29, art:'wolf',     palette:{ skin:'#6a6258', cloth:'#3a352e' }, blurb:'The full-grown beast. Sharp claws, sharper temper.' },
};

/* ---------- Named bosses (tougher, unique, bigger rewards) ---------- */
const BOSSES = {
  brute:      { id:'brute',      name:'The Brute',        hearts:10, attack:4, reward:60,  art:'zombie',    palette:{ skin:'#5f8a4e', cloth:'#3a2e22' }, boss:true, dungeon:true, blurb:'A hulking giant zombie — the Dead Cliffs mini-boss. Slow, but its slam shakes the ground.' },
  hexstraw:   { id:'hexstraw',   name:'Hexstraw',         hearts:11, attack:4, reward:80,  art:'scarecrow', palette:{ skin:'#d9b24a', cloth:'#7a4a2a' }, boss:true, dungeon:true, blurb:'A towering scarecrow come alive — the Barren Grasslands mini-boss. Flails with a scything swipe.' },
  bread_boi:  { id:'bread_boi',  name:'Bread Boy',        hearts:5,  attack:3, reward:19,  art:'bread',    palette:{ skin:'#e8b46a', cloth:'#a8781f' }, boss:true, blurb:'A living loaf. Crustier than he looks.' },
  dragok:     { id:'dragok',     name:'Dragok',           hearts:7,  attack:4, reward:43,  art:'dragon',   palette:{ skin:'#c0453a', cloth:'#7a241c' }, boss:true, blurb:'Half-dragon champion of the arena.' },
  gorton:     { id:'gorton',     name:'Gorton',           hearts:9,  attack:5, reward:100, art:'king',     palette:{ skin:'#c9a24a', cloth:'#5a3a7a' }, boss:true, blurb:'The armoured king. Sword AND shield. The big test.' },
  backstabber:{ id:'backstabber',name:'The Backstabber',  hearts:12, attack:6, reward:250, art:'assassin', palette:{ skin:'#2a2540', cloth:'#7a1030' }, boss:true, secret:true, blurb:'The hooded figure behind it all. So THIS is who runs the arena...' },
};

/* ---------- Weapons ----------
   damage      = HP removed per landed hit
   durability  = swings before it needs repair
   repairCost  = money to fully repair
*/
// durability = swings before it needs repair. Sized so a weapon lasts about
// one full (minute-long) fight before you visit the shop to repair it.
const WEAPONS = {
  old_knife:      { id:'old_knife',      name:'Old Knife',      damage:5,  durability:190, rarity:'C', price:0,   repairCost:18, art:'knife'  },
  aluminum_sword: { id:'aluminum_sword', name:'Aluminum Sword', damage:8,  durability:180, rarity:'C', price:50,  repairCost:28, art:'sword'  },
  wood_spear:     { id:'wood_spear',     name:'Spear',          damage:12, durability:110, rarity:'U', price:90,  repairCost:30, art:'spear'  },
  reinforced_bow: { id:'reinforced_bow', name:'Reinforced Bow', damage:14, durability:145, rarity:'R', price:180, repairCost:50, art:'bow'    },
  steel_katana:   { id:'steel_katana',   name:'Steel Katana',   damage:18, durability:240, rarity:'R', price:230, repairCost:70, art:'katana' },
};

/* ---------- Items (used in battle) ----------
   heal   = hearts restored (halves allowed)
   buff   = temporary effect during a fight
*/
const ITEMS = {
  apple:          { id:'apple',          name:'Apple',          type:'heal',  heal:1,   rarity:'C', price:10, art:'apple',   blurb:'Restores 1 heart.' },
  cliff_shrooms:  { id:'cliff_shrooms',  name:'Cliff Shrooms',  type:'heal',  heal:1.5, rarity:'C', price:18, art:'shroom',  blurb:'Restores 1½ hearts.' },
  mushroom_stew:  { id:'mushroom_stew',  name:'Mushroom Stew',  type:'heal',  heal:3,   rarity:'C', price:25, art:'stew',    blurb:'A hearty meal. Restores 3 hearts.' },
  strength_potion:{ id:'strength_potion',name:'Strength Potion',type:'buff',  buff:'strength', dmgMult:2, duration:8000, rarity:'U', price:85, art:'potion', blurb:'Double damage for 8 seconds!' },
  cage:           { id:'cage',           name:'Cage',           type:'capture', rarity:'E', price:120, art:'cage',   blurb:'Throw at a weakened enemy to CAPTURE it for your collection.' },
};

/* ---------- Shields (equippable, reduce damage when blocking) ---------- */
// Shields reduce damage when you get hit and lose durability each time.
// At 0 durability the shield is broken (no protection) until repaired.
const SHIELDS = {
  wood_shield:    { id:'wood_shield',    name:'Wood Shield',    block:0.5, durability:50, repairCost:12, rarity:'C', price:0,  art:'shield_wood' },
  aluminum_shield:{ id:'aluminum_shield',name:'Aluminum Shield',block:0.7, durability:75, repairCost:22, rarity:'C', price:55, art:'shield_alu'  },
};

/* ---------- Map regions ----------
   Ordered along the path. Each unlocks the next when its boss is beaten.
   The secret "???" region is the finale.
*/
const REGIONS = [
  { id:'dead_cliffs',      name:'Dead Cliffs',       x:14, y:82, enemies:['zombie','skeleton','angry_peasant','mosquito','giant_tick'], boss:'bread_boi',   color:'#6b7a8f' },
  { id:'barren_grasslands',name:'Barren Grasslands', x:32, y:78, enemies:['angry_peasant','lumberjack','giant_tick','baby_werewolf'],    boss:null,          color:'#8a9a5a' },
  { id:'dark_forest',      name:'Dark Forest',       x:24, y:52, enemies:['baby_werewolf','bear','lumberjack','werewolf'],               boss:'dragok',      color:'#3a5a3a' },
  { id:'toxic_temple',     name:'Toxic Temple',      x:22, y:30, enemies:['mummy','gooster','phantom'],                                  boss:null,          color:'#6a8a4a' },
  { id:'shatter_coast',    name:'Shatter Coast',     x:48, y:30, enemies:['pirate','swordfish','colossal_squid'],                        boss:null,          color:'#4a7a9a' },
  { id:'knife_mountain',   name:'Knife Mountain',    x:52, y:62, enemies:['bear','yeti','polar_bear'],                                   boss:null,          color:'#8a8f9a' },
  { id:'desolate_dunes',   name:'Desolate Dunes',    x:78, y:40, enemies:['sandy_skeleton','sandworm','icius','mummy'],                  boss:'gorton',      color:'#d9a441' },
  { id:'secret',           name:'???',               x:62, y:12, enemies:['phantom','werewolf','icius'],                                 boss:'backstabber', color:'#7a1030', secret:true },
];

/* Helper to look up any fighter (enemy or boss) by id */
function getFighter(id) {
  return ENEMIES[id] || BOSSES[id] || null;
}
