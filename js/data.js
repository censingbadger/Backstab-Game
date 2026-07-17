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
  giant_tick:    { id:'giant_tick',    name:'Giant Tick',     hearts:1,   attack:2, reward:2,  art:'tick',     palette:{ skin:'#7a4b2a', cloth:'#4a2c18' }, blurb:'A blood-swollen pest the size of a dog.' },
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
  crab:          { id:'crab',          name:'Crab',           hearts:2,   attack:2, reward:4,  art:'crab',     palette:{ skin:'#e0532f', cloth:'#a8331a' }, blurb:'A snappy shore crab with two pinching claws. Scuttles sideways.' },

  /* ===== ACT TWO — Cretaceous Coast (dinosaurs) ===== */
  raptor:        { id:'raptor',        name:'Raptor',         hearts:2.5, attack:4, reward:9,  art:'raptor',   palette:{ skin:'#7a9a44', cloth:'#4a6a26' }, blurb:'A fast, vicious pack hunter with a killing sickle-claw on each foot.' },
  stego:         { id:'stego',         name:'Stegosaurus',    hearts:4,   attack:3, reward:11, art:'dino',     palette:{ skin:'#5f8060', cloth:'#3d5340' }, blurb:'Armoured plates down its back and a spiked tail. Slow, but a wall of muscle.' },
  ptero:         { id:'ptero',         name:'Pterodactyl',    hearts:2,   attack:4, reward:12, art:'ptero',    palette:{ skin:'#9a6a44', cloth:'#5f3f28' }, blurb:'A leathery-winged terror that shrieks down out of the sky.' },

  /* ===== ACT TWO — The Old West (1885) ===== */
  outlaw:        { id:'outlaw',        name:'Outlaw',         hearts:3,   attack:4, reward:11, art:'cowboy',   palette:{ skin:'#d8a878', cloth:'#8a3a2a' }, blurb:'A quick-draw bandit with a rusty six-shooter and an even rustier temper.' },
  grandpa:       { id:'grandpa',       name:'Mustache Grandpa',hearts:2.5,attack:3, reward:9,  art:'grandpa',  palette:{ skin:'#e6bd92', cloth:'#5a6a8a' }, blurb:'A cantankerous old-timer who whacks folks with his cane. Do NOT get on his lawn.' },
  coyote:        { id:'coyote',        name:'Coyote',         hearts:2,   attack:3, reward:8,  art:'wolf',     palette:{ skin:'#b89a6a', cloth:'#7a6244' }, blurb:'A mangy desert scavenger that snaps at your heels for a nickel.' },

  /* ===== ACT TWO — Present Day ===== */
  soldier:       { id:'soldier',       name:'Soldier',        hearts:3.5, attack:4, reward:12, art:'soldier',  palette:{ skin:'#c99a6a', cloth:'#4a5a3a' }, blurb:'A camo-clad grunt with an assault rifle and zero sense of humour.' },
  drone:         { id:'drone',         name:'Combat Drone',   hearts:1.5, attack:3, reward:10, art:'drone',    palette:{ skin:'#3a3a42', cloth:'#c0392b' }, blurb:'A buzzing quadcopter with a little machine gun bolted underneath.' },
  jet:           { id:'jet',           name:'F-16',           hearts:2.5, attack:5, reward:15, art:'jet',      palette:{ skin:'#9aa4b2', cloth:'#3a4656' }, blurb:'A screaming fighter jet that strafes the street with its cannon.' },

  /* ===== ACT TWO — Pyramids of Egypt ===== */
  scarab:        { id:'scarab',        name:'Giant Scarab',   hearts:1.5, attack:3, reward:9,  art:'scarab',   palette:{ skin:'#2a7a6a', cloth:'#12463a' }, blurb:'A beetle the size of a dog, its shell gleaming like spilled oil.' },
  jackal:        { id:'jackal',        name:'Jackal Guard',   hearts:3.5, attack:4, reward:13, art:'jackal',   palette:{ skin:'#33333d', cloth:'#c9a24a' }, blurb:'A jackal-headed tomb sentinel swinging a bronze khopesh.' },

  /* ===== ACT TWO — Atlantis (the sunken city) ===== */
  merman:        { id:'merman',        name:'Atlantean',      hearts:3.5, attack:4, reward:13, art:'merman',   palette:{ skin:'#4a9a8a', cloth:'#c9a24a' }, blurb:'A trident-wielding warrior of the drowned city, scales glinting in the gloom.' },
  jellyfish:     { id:'jellyfish',     name:'Jellyfish',      hearts:1.5, attack:3, reward:8,  art:'jellyfish',palette:{ skin:'#c98ad9', cloth:'#8a4aa8' }, blurb:'A translucent stinging bell that drifts and pulses through the water.' },

  /* ===== ACT TWO — Pompeii (the doomed city of the gods) ===== */
  gladiator:     { id:'gladiator',     name:'Gladiator',      hearts:3,   attack:4, reward:12, art:'gladiator', palette:{ skin:'#c98a5a', cloth:'#8a2f2f' }, blurb:'A doomed arena champion in a plumed helm, still swinging his gladius as the ash rains down.' },
  centurion:     { id:'centurion',     name:'Centurion',      hearts:4,   attack:4, reward:15, art:'centurion', palette:{ skin:'#caa06a', cloth:'#b8342a' }, blurb:'A Roman legionnaire behind a great red shield, marching on through the burning streets.' },

  /* ===== ACT TWO — The Ice Age (mammoth country) ===== */
  caveman:       { id:'caveman',       name:'Caveman',        hearts:4,   attack:4, reward:14, art:'caveman',  palette:{ skin:'#c99a6a', cloth:'#8a5a30' }, blurb:'A fur-clad hunter with a heavy stone club and absolutely no manners.' },
  sabertooth:    { id:'sabertooth',    name:'Sabertooth',     hearts:3.5, attack:5, reward:16, art:'sabertooth', palette:{ skin:'#d9a45a', cloth:'#8a5a24' }, blurb:'A prowling cat with fangs like carving knives. It pounces before you blink.' },

  /* ===== ACT TWO — The Dawn of Time (the molten world) ===== */
  amoeba:        { id:'amoeba',        name:'Mega Amoeba',    hearts:3,   attack:4, reward:15, art:'amoeba',   palette:{ skin:'#7ad9a0', cloth:'#2a8a5a' }, blurb:'The very first life — grown huge, hungry, and wobbling straight at you.' },
  trilobite:     { id:'trilobite',     name:'Trilobite',      hearts:4.5, attack:5, reward:18, art:'trilobite',palette:{ skin:'#8a6a4a', cloth:'#4a3520' }, blurb:'An armoured sea-bug the size of a dog, skittering across the cooling rock.' },

  /* ===== ACT TWO — The End of Time (the machine future) ===== */
  robot:         { id:'robot',         name:'Sentry Bot',     hearts:5,   attack:5, reward:20, art:'robot',    palette:{ skin:'#7a8a9a', cloth:'#30ffb0' }, blurb:'A clanking security robot with one glowing eye and zero patience for heroes.' },
  mech:          { id:'mech',          name:'War Mech',       hearts:6,   attack:6, reward:24, art:'mech',     palette:{ skin:'#5a5a6a', cloth:'#ff4a6a' }, blurb:'A walking weapons platform on hydraulic legs. It was built for exactly this.' },
};

/* ---------- Named bosses (tougher, unique, bigger rewards) ---------- */
const BOSSES = {
  brute:      { id:'brute',      name:'The Brute',        hearts:10, attack:4, reward:60,  art:'zombie',    palette:{ skin:'#5f8a4e', cloth:'#3a2e22' }, boss:true, dungeon:true, blurb:'A hulking giant zombie — the Dead Cliffs mini-boss. Slow, but its slam shakes the ground.' },
  hexstraw:   { id:'hexstraw',   name:'Hexstraw',         hearts:11, attack:4, reward:80,  art:'scarecrow', palette:{ skin:'#d9b24a', cloth:'#7a4a2a' }, boss:true, dungeon:true, blurb:'A towering scarecrow come alive — the Barren Grasslands mini-boss. Flails with a scything swipe.' },
  alpha_werewolf:{ id:'alpha_werewolf', name:'Alpha Werewolf', hearts:14, attack:5, reward:120, art:'wolf', palette:{ skin:'#3f3730', cloth:'#211d18' }, boss:true, dungeon:true, blurb:'The pack leader — a massive, savage werewolf lurking deep in the Dark Forest. The hardest fight yet.' },
  venombane:  { id:'venombane',  name:'Venombane',        hearts:16, attack:5, reward:200, art:'skeleton', palette:{ skin:'#c6e88a', cloth:'#31532a' }, boss:true, dungeon:true, poison:true, blurb:'A colossal skeleton oozing green venom — the Rotking who wardens the final chamber of the Toxic Temple. Its every slam splashes poison.' },
  great_white:{ id:'great_white',name:'The Great White',  hearts:16, attack:6, reward:230, art:'shark',    palette:{ skin:'#8a99a6', cloth:'#e8eef2' }, boss:true, dungeon:true, aquatic:true, blurb:'A monstrous great white shark that rules the deep water off Shatter Coast. Swim down and face it in its own element.' },
  crab_king:  { id:'crab_king',  name:'King Crab',        hearts:12, attack:5, reward:170, art:'crab',     palette:{ skin:'#ff6a2a', cloth:'#b83a12' }, boss:true, dungeon:true, blurb:'The armoured monarch of the Sandcastle — a giant crab with crushing claws.' },
  frost_titan:{ id:'frost_titan',name:'The Frost Titan',  hearts:15, attack:5, reward:210, art:'yeti',     palette:{ skin:'#e6f4ff', cloth:'#6fa8d8' }, boss:true, dungeon:true, blurb:'A towering ice giant that rules the frozen heart of Knife Mountain. The floor is ice — keep your footing.' },
  dune_worm:  { id:'dune_worm',  name:'The Dune Devourer', hearts:20, attack:6, reward:320, art:'worm',    palette:{ skin:'#d9a441', cloth:'#a8791f' }, boss:true, dungeon:true, blurb:'A colossal sandworm with a maw of jagged teeth. It burrows and erupts from below to bite — learn its rhythm, dodge the strike, and bring a powerful weapon or it will devour you in two bites.' },
  // ACT TWO bosses — the wardens, resurrected and toxic-mutated across time
  trex:       { id:'trex',       name:'The Tyrant King',   hearts:22, attack:7, reward:340, art:'trex',     palette:{ skin:'#6a8040', cloth:'#3f4f24' }, boss:true, dungeon:true, blurb:'The Brute, dragged forward in time and mutated by toxic waste into a colossal Tyrannosaurus. Its jaws could swallow a hero whole.' },
  iron_horse: { id:'iron_horse', name:'The Iron Horse',    hearts:24, attack:7, reward:380, art:'train',    palette:{ skin:'#5a5a66', cloth:'#8a2a1a' }, boss:true, dungeon:true, blurb:'Hexstraw, dragged into the Age of Steam and fused with a runaway locomotive — a roaring iron monster that belches toxic black smoke.' },
  warhound:   { id:'warhound',   name:'The Warhound',      hearts:28, attack:8, reward:440, art:'tank',     palette:{ skin:'#5a6650', cloth:'#3a4432' }, boss:true, dungeon:true, blurb:'The Alpha Werewolf, resurrected and welded inside a giant reinforced battle tank. Its cannon flattens everything in its path — bring heavy firepower.' },
  anubis:     { id:'anubis',     name:'Anubis',            hearts:25, attack:7, reward:420, art:'anubis',   palette:{ skin:'#2a2a34', cloth:'#d4af37' }, boss:true, dungeon:true, blurb:'Venombane, reborn in the age of pharaohs as the towering jackal-god Anubis, Judge of the Dead. He weighs your heart on his scales — and finds it wanting.' },
  kraken:     { id:'kraken',     name:'The Kraken',        hearts:27, attack:8, reward:460, art:'kraken',   palette:{ skin:'#6a3a7a', cloth:'#3a1f4a' }, boss:true, dungeon:true, aquatic:true, blurb:'The Great White, reborn in the sunken city as a colossal kraken — a mountain of tentacles and beak that drags heroes down to the crushing deep.' },
  colossus:   { id:'colossus',   name:'The Molten Colossus', hearts:26, attack:8, reward:480, art:'colossus', palette:{ skin:'#4a4038', cloth:'#ff6a2a' }, boss:true, dungeon:true, blurb:'The King Crab, reborn in the shadow of Vesuvius as a towering statue of a fallen god — its stone skin split by rivers of molten lava, and every footfall cracks the earth.' },
  mammoth_king:{ id:'mammoth_king', name:'The Mammoth King', hearts:30, attack:9, reward:520, art:'mammoth', palette:{ skin:'#8a6a48', cloth:'#e8e0d0' }, boss:true, dungeon:true, blurb:'The Frost Titan, resurrected in the deep freeze as a colossal woolly mammoth with tusks of black ice. The glacier shakes with every step it takes.' },
  magma_worm: { id:'magma_worm', name:'The Magma Leviathan', hearts:32, attack:9, reward:560, art:'worm',    palette:{ skin:'#ff7a2a', cloth:'#8a2410' }, boss:true, dungeon:true, blurb:'The Dune Devourer, dragged back to the dawn of the world and reborn in liquid rock — a burrowing leviathan of magma that erupts from the molten crust to feed.' },
  backstabber_prime:{ id:'backstabber_prime', name:'The Backstabber Prime', hearts:44, attack:10, reward:1000, art:'assassin', palette:{ skin:'#1a1430', cloth:'#30ffb0' }, boss:true, dungeon:true, blurb:'At the end of time the Backstabber waits — swollen monstrous on every drop of power he stole, faster and crueller than he ever was. The last back stab in history belongs to one of you.' },
  bread_boi:  { id:'bread_boi',  name:'Bread Boy',        hearts:5,  attack:3, reward:19,  art:'bread',    palette:{ skin:'#e8b46a', cloth:'#a8781f' }, boss:true, blurb:'A living loaf. Crustier than he looks.' },
  dragok:     { id:'dragok',     name:'Dragok',           hearts:7,  attack:4, reward:43,  art:'dragon',   palette:{ skin:'#c0453a', cloth:'#7a241c' }, boss:true, blurb:'Half-dragon champion of the arena.' },
  gorton:     { id:'gorton',     name:'Gorton',           hearts:9,  attack:5, reward:100, art:'king',     palette:{ skin:'#c9a24a', cloth:'#5a3a7a' }, boss:true, blurb:'The armoured king. Sword AND shield. The big test.' },
  backstabber:{ id:'backstabber',name:'The Backstabber',  hearts:24, attack:9, reward:250, art:'assassin', palette:{ skin:'#2a2540', cloth:'#7a1030' }, boss:true, secret:true, blurb:'The hooded figure behind it all. So THIS is who runs the arena...' },
};

/* ---------- Weapons ----------
   damage      = HP removed per landed hit
   durability  = swings before it needs repair
   repairCost  = money to fully repair
   power       = optional special ability:
                 reach    - longer swing range (spears/bow)
                 sweep    - very wide arc, hits everything in front (scythes)
                 double   - strikes twice (daggers)
                 lifesteal- heals you for part of the damage dealt
                 poison   - enemies keep taking damage over time
                 stun     - briefly stuns enemies (maces)
   Weapons can be UPGRADED at the shop Forge (+2 damage per level).
*/
const WEAPONS = {
  old_knife:      { id:'old_knife',      name:'Old Knife',      damage:5,  durability:190, rarity:'C', price:0,    repairCost:18,  art:'knife'  },
  knife:          { id:'knife',          name:'Knife',          damage:7,  durability:180, rarity:'C', price:500,   repairCost:22,  art:'knife'  },
  aluminum_sword: { id:'aluminum_sword', name:'Aluminum Sword', damage:9,  durability:180, rarity:'C', price:900,   repairCost:34,  art:'sword'  },
  cracked_dagger: { id:'cracked_dagger', name:'Cracked Dagger', damage:11, durability:90,  rarity:'U', price:1300,  repairCost:40,  art:'knife',  power:'double' },
  rusty_katana:   { id:'rusty_katana',   name:'Rusty Katana',   damage:11, durability:150, rarity:'U', price:2000,  repairCost:44,  art:'katana' },
  wood_spear:     { id:'wood_spear',     name:'Spear',          damage:12, durability:130, rarity:'U', price:2000,  repairCost:44,  art:'spear',  power:'reach' },
  wooden_mace:    { id:'wooden_mace',    name:'Wooden Mace',    damage:15, durability:170, rarity:'U', price:2200,  repairCost:55,  art:'sword',  power:'stun' },
  metal_sword:    { id:'metal_sword',    name:'Metal Sword',    damage:14, durability:200, rarity:'U', price:3000,  repairCost:60,  art:'sword'  },
  reinforced_bow: { id:'reinforced_bow', name:'Reinforced Bow', damage:14, durability:145, rarity:'R', price:4500,  repairCost:80,  art:'bow',    power:'reach' },
  spiked_spear:   { id:'spiked_spear',   name:'Spiked Spear',   damage:18, durability:150, rarity:'R', price:5200,  repairCost:90,  art:'spear',  power:'reach' },
  steel_mace:     { id:'steel_mace',     name:'Steel Mace',     damage:19, durability:160, rarity:'R', price:5500,  repairCost:100, art:'sword',  power:'stun' },
  steel_katana:   { id:'steel_katana',   name:'Steel Katana',   damage:18, durability:240, rarity:'R', price:6000,  repairCost:120, art:'katana' },
  scythe:         { id:'scythe',         name:'Scythe',         damage:20, durability:160, rarity:'R', price:10000, repairCost:130, art:'spear',  power:'sweep' },
  reinforced_mace:{ id:'reinforced_mace',name:'Reinforced Mace',damage:23, durability:200, rarity:'E', price:8500,  repairCost:180, art:'sword',  power:'stun' },
  double_dagger:  { id:'double_dagger',  name:'Double Dagger',  damage:13, durability:200, rarity:'E', price:8000,  repairCost:170, art:'knife',  power:'double' },
  emerald_scythe: { id:'emerald_scythe', name:'Emerald Scythe', damage:26, durability:220, rarity:'E', price:12000, repairCost:240, art:'spear',  power:'poison' },
  pastors_blade:  { id:'pastors_blade',  name:"Master's Blade", damage:30, durability:240, rarity:'L', price:15000, repairCost:420, art:'katana', power:'lifesteal' },
  /* ===== ACT TWO — powerful new arms (guns shoot; the bazooka explodes) ===== */
  plasma_katana:  { id:'plasma_katana',  name:'Plasma Katana', damage:34, durability:260, rarity:'E', price:13000, repairCost:300, art:'katana', power:'sweep' },
  six_shooter:    { id:'six_shooter',    name:'Six-Shooter',   damage:17, durability:320, rarity:'R', price:7000,  repairCost:120, art:'gun',     power:'gun' },
  bazooka:        { id:'bazooka',        name:'Bazooka',       damage:46, durability:90,  rarity:'L', price:17000, repairCost:450, art:'bazooka', power:'bazooka' },

  /* ===== ACT TWO — the Weapons of the Ages (designed by Asher & Ren).
     One armoury per era, sold in the Act 2 shop. ===== */
  // 🦕 Cretaceous Coast
  stone_club:     { id:'stone_club',     name:'Stone Club',          damage:20, durability:240, rarity:'U', price:5500,  repairCost:90,  art:'club',      act2:true, era:'🦕' },
  spiked_rock:    { id:'spiked_rock',    name:'Spiked Rock',         damage:24, durability:180, rarity:'U', price:7200,  repairCost:110, art:'mace',      act2:true, era:'🦕', power:'stun' },
  megalodon_sword:{ id:'megalodon_sword',name:'Megalodon Tooth Sword', damage:28, durability:210, rarity:'R', price:9500, repairCost:150, art:'toothsword', act2:true, era:'🦕' },
  trex_spear:     { id:'trex_spear',     name:'T-Rex Claw Spear',    damage:26, durability:190, rarity:'R', price:9000,  repairCost:140, art:'spear',     act2:true, era:'🦕', power:'reach' },
  // 🤠 The Old West
  sneaky_knife:   { id:'sneaky_knife',   name:'Sneaky Knife',        damage:19, durability:260, rarity:'U', price:7000,  repairCost:100, art:'knife',     act2:true, era:'🤠', power:'double' },
  whip:           { id:'whip',           name:'Whip',                damage:22, durability:200, rarity:'U', price:8000,  repairCost:120, art:'whip',      act2:true, era:'🤠', power:'reach' },
  reinforced_pickaxe:{ id:'reinforced_pickaxe', name:'Reinforced Pickaxe', damage:27, durability:280, rarity:'R', price:9800, repairCost:150, art:'pickaxe', act2:true, era:'🤠', power:'stun' },
  rifle:          { id:'rifle',          name:'Rifle',               damage:26, durability:220, rarity:'R', price:10000, repairCost:170, art:'gun',       act2:true, era:'🤠', power:'gun' },
  shotgun:        { id:'shotgun',        name:'Shotgun',             damage:30, durability:140, rarity:'R', price:11000, repairCost:190, art:'gun',       act2:true, era:'🤠', power:'gun' },
  // 🏙️ Present Day
  fishing_hook:   { id:'fishing_hook',   name:'Fishing Hook',        damage:24, durability:210, rarity:'U', price:8500,  repairCost:130, art:'hook',      act2:true, era:'🏙️', power:'lifesteal' },
  soldiers_blade: { id:'soldiers_blade', name:"Soldier's Blade",     damage:32, durability:260, rarity:'R', price:12000, repairCost:200, art:'sword',     act2:true, era:'🏙️' },
  grenade:        { id:'grenade',        name:'Grenade',             damage:38, durability:80,  rarity:'E', price:13500, repairCost:300, art:'grenade',   act2:true, era:'🏙️', power:'bazooka' },
  sniper:         { id:'sniper',         name:'Sniper',              damage:40, durability:130, rarity:'E', price:14500, repairCost:320, art:'gun',       act2:true, era:'🏙️', power:'gun' },
  // 🔱 Atlantis
  coral_dagger:   { id:'coral_dagger',   name:'Coral Dagger',        damage:26, durability:190, rarity:'R', price:9800,  repairCost:150, art:'knife',     act2:true, era:'🔱', power:'double' },
  wave_bow:       { id:'wave_bow',       name:'Wave Bow',            damage:30, durability:180, rarity:'R', price:11500, repairCost:190, art:'bow',       act2:true, era:'🔱', power:'gun' },
  sword_of_the_sea:{ id:'sword_of_the_sea', name:'Sword of the Sea', damage:36, durability:240, rarity:'E', price:14000, repairCost:310, art:'sword',     act2:true, era:'🔱', power:'sweep' },
  poseidon_trident:{ id:'poseidon_trident', name:"Poseidon's Trident", damage:48, durability:280, rarity:'L', price:20000, repairCost:500, art:'trident', act2:true, era:'🔱', power:'sweep' },
  // 🏺 Pyramids of Egypt
  spiked_whip:    { id:'spiked_whip',    name:'Spiked Whip',         damage:29, durability:190, rarity:'R', price:10500, repairCost:180, art:'whip',      act2:true, era:'🏺', power:'sweep' },
  pharaoh_spear:  { id:'pharaoh_spear',  name:'Pharaoh Spear',       damage:31, durability:200, rarity:'R', price:11800, repairCost:200, art:'spear',     act2:true, era:'🏺', power:'reach' },
  mummy_sword:    { id:'mummy_sword',    name:'Mummy Sword',         damage:35, durability:230, rarity:'E', price:13800, repairCost:310, art:'sword',     act2:true, era:'🏺', power:'lifesteal' },
  sand_striker:   { id:'sand_striker',   name:'Sand Striker',        damage:50, durability:260, rarity:'L', price:21000, repairCost:520, art:'katana',    act2:true, era:'🏺', power:'sweep' },
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
  /* ===== ACT TWO — the Shields of the Ages (designed by Asher & Ren) ===== */
  stone_shield:   { id:'stone_shield',   name:'Stone Shield',            block:0.75, durability:90,  repairCost:60,  rarity:'U', price:4500,  art:'shield_stone',  act2:true, era:'🦕', color:'#8a8f96' },
  metal_blocker:  { id:'metal_blocker',  name:'Metal Blocker',           block:0.8,  durability:120, repairCost:90,  rarity:'R', price:6500,  art:'shield_metal',  act2:true, era:'🤠', color:'#9aa4b0' },
  bandaged_shield:{ id:'bandaged_shield',name:'Bandaged Shield',         block:0.82, durability:200, repairCost:100, rarity:'R', price:7500,  art:'shield_bandage', act2:true, era:'🏺', color:'#d9c48f' },
  soldier_shield: { id:'soldier_shield', name:"Spikey Soldier's Shield", block:0.85, durability:140, repairCost:130, rarity:'E', price:9000,  art:'shield_spike',  act2:true, era:'🏙️', color:'#5a6650' },
  ocean_blocker:  { id:'ocean_blocker',  name:'Drowning Ocean Blocker',  block:0.88, durability:160, repairCost:160, rarity:'E', price:11000, art:'shield_ocean',  act2:true, era:'🔱', color:'#3aa8b8' },
};

/* ---------- Map regions ----------
   Ordered along the path. Each unlocks the next when its boss is beaten.
   The secret "???" region is the finale.
*/
const REGIONS = [
  { id:'dead_cliffs',      name:'Dead Cliffs',       x:14, y:82, enemies:['zombie','skeleton','angry_peasant','mosquito','giant_tick'], boss:'bread_boi',   color:'#6b7a8f' },
  { id:'barren_grasslands',name:'Barren Grasslands', x:32, y:78, enemies:['skeleton','zombie','angry_peasant','lumberjack','giant_tick'], boss:null,          color:'#8a9a5a' },
  { id:'dark_forest',      name:'Dark Forest',       x:24, y:52, enemies:['baby_werewolf','bear','lumberjack','werewolf'],               boss:'dragok',      color:'#3a5a3a' },
  { id:'toxic_temple',     name:'Toxic Temple',      x:22, y:30, enemies:['mummy','gooster','phantom'],                                  boss:null,          color:'#6a8a4a' },
  { id:'shatter_coast',    name:'Shatter Coast',     x:48, y:30, enemies:['sandy_skeleton','pirate','colossal_squid','swordfish','crab'], boss:'great_white', color:'#4a7a9a' },
  { id:'sandcastle',       name:'Sandcastle',        x:90, y:13, enemies:['crab','sandy_skeleton','pirate'],                            boss:'crab_king',   color:'#e0c060', secret:true, passageOnly:true },
  { id:'knife_mountain',   name:'Knife Mountain',    x:52, y:62, enemies:['bear','yeti','polar_bear'],                                   boss:null,          color:'#8a8f9a' },
  { id:'desolate_dunes',   name:'Desolate Dunes',    x:78, y:40, enemies:['sandy_skeleton','sandworm','icius','mummy'],                  boss:'gorton',      color:'#d9a441' },
  { id:'secret',           name:'???',               x:62, y:12, enemies:['phantom','werewolf','icius'],                                 boss:'backstabber', color:'#7a1030', secret:true },
];

/* ============================================================
   STORY — the realm's backstory (read in full from the home screen) plus a
   short one-line reminder shown at the start of each level.
   ============================================================ */
const LORE = {
  title: 'The Tale of Back Stab',
  intro: [
    "Long ago the realm of Karrowmere was whole and green, watched over by nine guardians who kept its lands in balance.",
    "Then came the Backstabber — a hooded figure who won the great arena not by honour but by treachery, sinking a blade into the back of every champion who ever trusted him. With the arena's crown came a dark power, and he twisted the nine guardians into monstrous wardens. One by one the lands soured: cliffs went cold with the walking dead, forests drowned in endless night, a temple rotted with poison, coasts shattered, a mountain froze, and the dunes rose up in fire and storm.",
    "From a lair of pure shadow the Backstabber rules it all — and no challenger who has gone to face him has ever come back.",
    "You are the last to try. Cross every broken land and free it by felling the warden who corrupts it, then cut your way to the Backstabber's Lair. There you'll beat him at his own game — a back stab for a back stab — and give Karrowmere back its dawn.",
  ],
  goal: 'Free each land by beating its warden, then end the Backstabber and restore the realm.',
  // one short line per region — a reminder of why you're here and where it leads
  regions: {
    dead_cliffs:       "The realm's edge, where the dead have risen from cold graves. Put them to rest — your first step on the long road to the Backstabber.",
    barren_grasslands: "Golden fields gone to withered dust. Cut through the warden's thralls; every land you free brings the Backstabber closer.",
    dark_forest:       "A wood swallowed by endless night, ruled by the pack's alpha. Clear a path — the Backstabber waits far beyond the trees.",
    toxic_temple:      "A holy place drowned in the Rotking's venom. Cleanse its chambers and press on toward the one who loosed the rot.",
    shatter_coast:     "Drowned shores prowled by the Great White. Beat the tide and the shark — the road onward runs through the deep.",
    sandcastle:        "A fortress lost beneath the waves, hoarded by the King Crab. Take its key of sand; the finale draws nearer.",
    knife_mountain:    "A frozen blade of a peak where the Frost Titan reigns. Climb its caverns — mind the ice — one warden closer to your goal.",
    desolate_dunes:    "A storm-cursed waste adrift over fire, where the Dune Devourer burrows. Hold your footing against the wind; the Lair is near.",
    secret:            "The Backstabber's Lair. Every warden you've felled has led you here. End his reign — a back stab for a back stab — and free the realm.",
  },
};

/* ---- ACT TWO story: the time-travel chase ---- */
const LORE_ACT2 = {
  title: 'Act Two — Through the Ages',
  intro: [
    "Behind the Backstabber's throne you found a machine — a time machine, humming with stolen power. Its screen had already seen the future, and the future was rotten.",
    "The Backstabber is not gone. His shadow slipped through time and, in an age of toxic waste, he dug up every warden you buried and drowned them in poison until they rose again — bigger, meaner, mutated. Then he scattered them across history so no single hero could ever catch them all.",
    "So he thinks. The machine will fling you back and forth through the ages — to the age of dinosaurs, the frozen wilds, the pyramids, the sunken city, and stranger times still — to hunt down every resurrected warden.",
    "Beat them across time, and you'll finally corner the Backstabber himself, grown monstrous on the power he stole. End him for good, and time itself is safe.",
  ],
  goal: 'Chase the resurrected wardens through time, then destroy the Backstabber once and for all.',
  regions: {
    dead_cliffs:       "The age of dinosaurs. The Brute has been reborn as a toxic Tyrannosaur. Fight through the raptors and fell the Tyrant King — your first jump through time.",
    barren_grasslands: "A dusty frontier long ago. Somewhere in this era a warden hides — track it down and press on through history.",
    dark_forest:       "The present day, humming with machines. A mutated warden lurks in the noise; cut it down and keep hunting through time.",
    toxic_temple:      "Ancient Egypt, deep in a cursed pyramid. A warden waits in the dark of the tomb. End it and travel on.",
    shatter_coast:     "The sunken city beneath the waves. A drowned warden rules these depths — beat it and follow the trail through time.",
    sandcastle:        "A doomed city in the shadow of a volcano. A warden hides among fallen gods; unearth it and move on.",
    knife_mountain:    "The frozen Ice Age. A warden stalks the mammoth herds. Bring it down and chase the Backstabber onward.",
    desolate_dunes:    "The dawn of the world, when the land was molten. Even here a warden festers — survive the fire and press on.",
    secret:            "The end of time, where the Backstabber has grown monstrous on stolen power. Every warden you've hunted led here. Destroy him, and set time right.",
  },
};

/* Helper to look up any fighter (enemy or boss) by id */
function getFighter(id) {
  return ENEMIES[id] || BOSSES[id] || null;
}
