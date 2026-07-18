/* ============================================================
   BACK STAB — Dead Cliffs Dungeon (Minecraft Dungeons style)
   Isometric 2.5D action crawler. Move with WASD/arrows (or the
   touch joystick), swing your equipped weapon at swarming skeletons
   and zombies. Clear 50 enemies to summon the Giant Zombie mini-boss.
   ============================================================ */

const ISO = { TW: 64, TH: 32 };          // tile width / height (screen px)
const JUMP_DUR = 520;                     // hop duration (ms)

/* Permanent reward boons — three are offered at the end of a level (Hades-style
   pick-one-of-three). Each has a rarity; rarer boons are stronger and rarer to
   see in the roll. */
const MODIFIERS = [
  { id: 'riches',    name: 'Riches',      icon: '💰', rarity: 'C', desc: '+75 coins',            apply: () => { earn(75); } },
  { id: 'power',     name: 'Power',       icon: '💪', rarity: 'U', desc: '+3 weapon damage',     apply: () => { STATE.dmgBonus = (STATE.dmgBonus || 0) + 3; } },
  { id: 'swift',     name: 'Swiftness',   icon: '🏃', rarity: 'U', desc: 'move faster',          apply: () => { STATE.speedBonus = (STATE.speedBonus || 0) + 0.7; } },
  { id: 'fortune',   name: 'Fortune',     icon: '🍀', rarity: 'U', desc: '+140 coins',           apply: () => { earn(140); } },
  { id: 'ironskin',  name: 'Iron Skin',   icon: '🛡️', rarity: 'R', desc: 'take 12% less damage',  apply: () => { STATE.armorBonus = Math.min(0.5, (STATE.armorBonus || 0) + 0.12); } },
  { id: 'berserk',   name: 'Berserker',   icon: '🔥', rarity: 'R', desc: '+5 weapon damage',     apply: () => { STATE.dmgBonus = (STATE.dmgBonus || 0) + 5; } },
  // Max-heart upgrades are the rarest, hard-won prizes — you can only grow your
  // health by claiming one of these at the end of a level.
  { id: 'vitality',  name: 'Vitality',    icon: '❤️', rarity: 'R', desc: '+1 max heart',         apply: () => { STATE.maxHearts += 1; } },
  { id: 'bulwark',   name: 'Bulwark',     icon: '🧱', rarity: 'E', desc: 'take 18% less damage',  apply: () => { STATE.armorBonus = Math.min(0.55, (STATE.armorBonus || 0) + 0.18); } },
  { id: 'giantheart',name: 'Giant Heart', icon: '💖', rarity: 'L', desc: '+2 max hearts',        apply: () => { STATE.maxHearts += 2; } },
];
function rollModifiers(n) {
  const weight = { C: 6, U: 4, R: 2.2, E: 1, L: 0.45 };
  const pool = MODIFIERS.slice(), out = [];
  while (out.length < n && pool.length) {
    let total = pool.reduce((s, m) => s + (weight[m.rarity] || 1), 0);
    let r = Math.random() * total, idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) { r -= (weight[pool[i].rarity] || 1); if (r <= 0) { idx = i; break; } }
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}
const DUN = {
  KILLS_TARGET: 50,
  MAX_ENEMIES: 9,                         // concurrent swarm size
};

/* Each region's dungeon has its own environment, enemy pool, and mini-boss. */
const DUNGEON_THEMES = {
  dead_cliffs: {
    name: 'Dead Cliffs',
    sky: ['#241a3a', '#171029', '#0c0818'],
    ground: ['#4a4a54', '#41414b'],
    speckle: 'rgba(90,120,70,0.25)',
    edge: ['#2b2b33', '#232329'],
    props: ['tomb', 'bone', 'rock', 'rock', 'tree', 'skull', 'torch'],
    trail: '255,224,120',
    enemies: ['skeleton', 'zombie', 'skeleton', 'zombie', 'giant_tick'],
    boss: 'brute',
    waypoints: [[8, 12], [8, 28], [22, 32], [22, 16], [38, 14], [40, 32], [28, 42], [42, 50], [54, 54]],
  },
  dark_forest: {
    name: 'Dark Forest',
    sky: ['#0d140d', '#080d08', '#040604'],   // near-black canopy gloom
    ground: ['#2f3a26', '#28331f'],           // dark moss
    speckle: 'rgba(30,55,25,0.45)',
    edge: ['#18220f', '#10160b'],
    props: ['pine', 'pine', 'tree', 'stump', 'rock', 'bush', 'pine'],
    trail: '150,235,150',
    enemies: ['baby_werewolf', 'bear', 'baby_werewolf', 'bear', 'werewolf', 'baby_werewolf'],
    boss: 'alpha_werewolf',
    waypoints: [[10, 10], [10, 28], [26, 34], [26, 16], [44, 14], [46, 34], [30, 46], [46, 52], [56, 54]],
    hard: true, canopy: true, traps: true, wider: true,
  },
  toxic_temple: {
    name: 'Toxic Temple',
    sky: ['#12220e', '#0a1408', '#050a04'],       // sickly green temple gloom
    ground: ['#3c4a32', '#33422b'],               // mossy temple flagstone
    speckle: 'rgba(130,210,90,0.28)',
    edge: ['#22301a', '#16220f'],
    props: ['pillar', 'toxbarrel', 'bone', 'skull', 'greentorch', 'spore', 'pillar', 'poisonbones'],
    trail: '150,240,120',
    enemies: ['skeleton', 'zombie', 'mummy', 'gooster', 'skeleton', 'giant_tick'],
    boss: 'venombane',
    chambers: true, hard: true, poison: true,      // chamber-clear progression + poison hazards
  },
  shatter_coast: {
    name: 'Shatter Coast',
    sky: ['#9fe0f5', '#5fb8e0', '#3a90c0'],        // bright sky over the sea (beach bg draws the ocean)
    ground: ['#e8d49a', '#ddc689'],                // warm sand
    speckle: 'rgba(255,246,205,0.35)',
    edge: ['#b89a5a', '#9a7f45'],                  // wet-sand shore
    props: ['palm', 'shell', 'driftwood', 'starfish', 'rock', 'coral', 'palm'],
    trail: '120,215,255',
    enemies: ['sandy_skeleton', 'pirate', 'colossal_squid', 'swordfish', 'crab'],
    boss: 'great_white',
    waypoints: [[10, 12], [24, 12], [24, 28], [10, 32], [14, 46], [34, 46], [36, 30], [50, 32], [54, 52]],
    beach: true, tide: true, hard: true, wider: true,
  },
  sandcastle: {
    name: 'Sandcastle',
    sky: ['#6a4a28', '#42301a', '#241a0e'],         // dim underground sand-cave glow
    ground: ['#e6cd8a', '#d8bd76'],                 // packed sand-cavern floor
    speckle: 'rgba(255,244,200,0.35)',
    edge: ['#9a7c46', '#6f5630'],                   // sandstone cavern walls
    props: ['dune', 'sandpillar', 'pottedpalm', 'sandtower', 'rock', 'dune', 'sandpillar', 'shell'],
    trail: '255,220,150',
    enemies: ['sandy_skeleton', 'pirate', 'crab', 'colossal_squid', 'swordfish', 'sandy_skeleton'],
    boss: 'crab_king',
    chambers: true, hard: true,                     // temple-style chamber gauntlet through the sand caves
  },
  knife_mountain: {
    name: 'Knife Mountain',
    sky: ['#a8c4de', '#7690ac', '#3a4a60'],         // thin high-altitude sky fading to the valley haze far below
    ground: ['#8b939f', '#79828e'],                 // bare grey summit rock
    speckle: 'rgba(255,255,255,0.45)',              // wind-blown snow dust
    edge: ['#565d68', '#33383f'],                   // grey mountain faces dropping away beneath the ridge
    props: ['frozenrock', 'icespike', 'pine', 'rock', 'snowpile', 'frozenrock', 'icespike'],
    trail: '220,235,250',
    enemies: ['polar_bear', 'baby_werewolf', 'yeti', 'bear', 'polar_bear', 'yeti'],
    boss: 'frost_titan',
    // a knife-thin summit ridge: switchbacks along the mountain tops, with the
    // grey rock faces falling away under the player's feet
    waypoints: [[10, 54], [22, 48], [16, 36], [26, 26], [16, 16], [30, 10], [42, 16], [36, 28], [46, 38], [38, 50], [52, 54], [56, 40], [54, 24]],
    hard: true,
  },
  barren_grasslands: {
    name: 'Barren Grasslands',
    sky: ['#4a4826', '#33341c', '#181a0e'],   // dusky field
    ground: ['#6b7a3c', '#5f7034'],           // olive grass
    speckle: 'rgba(210,200,90,0.30)',
    edge: ['#3a3320', '#2a2618'],
    props: ['grass', 'grass', 'bush', 'fence', 'hay', 'tree', 'rock'],
    trail: '255,240,150',
    enemies: ['skeleton', 'zombie', 'angry_peasant', 'giant_tick', 'lumberjack', 'mosquito'],
    boss: 'hexstraw',
    waypoints: [[10, 10], [26, 10], [26, 24], [12, 28], [14, 44], [34, 44], [36, 28], [50, 30], [54, 50]],
  },
  desolate_dunes: {
    name: 'Desolate Dunes',
    sky: ['#c98a3a', '#8a4a22', '#3a1c10'],          // choking, dust-red storm sky
    ground: ['#d9b25a', '#c79b45'],                  // wind-scoured sand
    speckle: 'rgba(255,236,180,0.4)',
    edge: ['#7a4a1a', '#4a2c0e'],                     // scorched chasm rim (lava below)
    props: ['dune', 'sandpillar', 'bone', 'skull', 'sandtower', 'dune', 'rock'],
    trail: '255,210,120',
    enemies: ['sandy_skeleton', 'mummy', 'pirate', 'swordfish', 'colossal_squid', 'sandy_skeleton'],
    boss: 'dune_worm',
    // TWICE as long as other levels — a huge, winding, storm-blasted platform
    waypoints: [[8, 8], [24, 8], [24, 20], [8, 20], [8, 32], [24, 32], [24, 44], [8, 44], [8, 54], [26, 54], [40, 50], [40, 36], [54, 34], [54, 20], [40, 18], [40, 10], [54, 10]],
    traps: true, dunes: true, hard: true, wind: true, lava: true, enemyDmgMul: 2,
  },
  secret: {
    name: "Backstabber's Lair",
    sky: ['#160c1e', '#0c0812', '#040207'],          // near-black shadow vault
    ground: ['#241a2e', '#1b1424'],                  // dark violet flagstone
    speckle: 'rgba(150,40,90,0.22)',
    edge: ['#170f22', '#0c0714'],
    props: ['torch', 'skull', 'bone', 'pillar', 'tomb', 'torch', 'skull'],
    trail: '210,40,100',
    enemies: ['phantom', 'werewolf', 'skeleton', 'mummy'],   // filler adds in the final arena
    boss: 'backstabber',
    chambers: true, hard: true, lair: true,          // boss-rush chambers + a stealth finale in the dark
  },
};

/* ============================================================
   ACT TWO themes — the SAME level structures (waypoints, chamber flags, beach
   rules…) re-skinned for a different time period: new colours, props, enemy
   roster and boss. Each region falls back to its Act 1 theme until its Act 2
   era is built. */
const ACT2_THEMES = {
  dead_cliffs: {
    name: 'Cretaceous Coast',
    color: '#5a8a3a', emoji: '🦖',                 // map pin tint + icon
    sky: ['#9ad6ea', '#8fbf6a', '#c9a95a'],        // steamy prehistoric jungle horizon
    ground: ['#6d8f47', '#5e7f3c'],                // fern-green jungle floor
    speckle: 'rgba(150,200,90,0.30)',
    edge: ['#3a4a22', '#273318'],                  // dark jungle chasm
    props: ['fern', 'bone', 'palm', 'volcano', 'rock', 'fern', 'tree'],
    trail: '210,240,150',
    enemies: ['raptor', 'stego', 'ptero', 'raptor', 'stego'],
    boss: 'trex',
    waypoints: [[8, 12], [8, 28], [22, 32], [22, 16], [38, 14], [40, 32], [28, 42], [42, 50], [54, 54]],
  },
  barren_grasslands: {
    name: 'The Old West',
    color: '#c99a4a', emoji: '🤠',
    sky: ['#f0cf8a', '#dd9a56', '#a5652f'],        // dusty sepia sunset over the frontier
    ground: ['#cdaa66', '#bb974e'],                // dry, cracked dirt plains
    speckle: 'rgba(255,232,170,0.35)',
    edge: ['#7a5a2a', '#563d18'],
    props: ['cactus', 'barrel', 'fence', 'tumbleweed', 'rock', 'cactus', 'bone'],
    trail: '255,220,140',
    enemies: ['outlaw', 'grandpa', 'coyote', 'outlaw', 'grandpa'],
    boss: 'iron_horse',
    waypoints: [[10, 10], [26, 10], [26, 24], [12, 28], [14, 44], [34, 44], [36, 28], [50, 30], [54, 50]],
  },
  dark_forest: {
    name: 'Present Day',
    color: '#6a7a8a', emoji: '🏙️',
    sky: ['#8aa0c0', '#5a6a86', '#28323f'],        // smoggy dusk city skyline
    ground: ['#565b62', '#4a4f56'],                // asphalt
    speckle: 'rgba(200,210,222,0.18)',
    edge: ['#26292f', '#181b20'],
    props: ['burgerjoint', 'streetlight', 'trafficcone', 'car', 'barrel', 'streetlight', 'trafficcone'],
    trail: '255,214,90',                           // yellow road markings
    enemies: ['soldier', 'drone', 'jet', 'soldier', 'drone'],
    boss: 'warhound',
    waypoints: [[10, 10], [10, 28], [26, 34], [26, 16], [44, 14], [46, 34], [30, 46], [46, 52], [56, 54]],
    hard: true, wider: true,                        // a wide city street (no forest canopy/traps)
  },
  toxic_temple: {
    name: 'Pyramids of Egypt',
    color: '#d9b24a', emoji: '🏺',
    sky: ['#3a2e18', '#241a0e', '#100a04'],        // torch-lit tomb gloom
    ground: ['#caa85e', '#b8974c'],                // sandstone floor
    speckle: 'rgba(255,224,150,0.22)',
    edge: ['#5a4420', '#382a10'],
    props: ['hieroglyph', 'sarcophagus', 'urn', 'torch', 'pillar', 'urn', 'hieroglyph'],
    trail: '255,214,120',
    enemies: ['mummy', 'scarab', 'jackal', 'mummy', 'scarab'],
    boss: 'anubis',
    chambers: true, hard: true, hazard: 'quicksand',   // gated tomb chambers, sinking-sand pits + spikes
  },
  sandcastle: {
    name: 'Pompeii',
    color: '#d0562a', emoji: '🌋',
    sky: ['#c24a24', '#7a2c14', '#2c0f08'],         // ash-choked, blood-red volcanic sky
    ground: ['#5a4c48', '#4a3e3a'],                 // ash-dusted stone flagstones
    speckle: 'rgba(255,140,60,0.28)',               // drifting embers
    edge: ['#3a1c12', '#20100a'],                   // scorched rim over the magma
    props: ['brokencolumn', 'statue', 'brazier', 'lavacrack', 'rock', 'brokencolumn', 'statue'],
    trail: '255,150,70',
    enemies: ['gladiator', 'centurion', 'mummy', 'gladiator', 'centurion'],
    boss: 'colossus',
    chambers: true, hard: true, hazard: 'lava', volcano: true,   // gated ruins split by lava, with Vesuvius raining lava bombs
  },
  shatter_coast: {
    name: 'Atlantis',
    color: '#3aa8b8', emoji: '🔱',
    sky: ['#2f86a4', '#1c5f80', '#0a2c46'],         // deep teal ocean gloom
    ground: ['#3a8a86', '#2f7472'],                 // algae-slick seabed stone
    speckle: 'rgba(160,240,225,0.28)',
    edge: ['#1a4a58', '#0d2c38'],
    props: ['coral', 'seaweed', 'column', 'shell', 'chest', 'coral', 'seaweed'],
    trail: '150,240,230',
    enemies: ['merman', 'jellyfish', 'colossal_squid', 'merman', 'jellyfish'],
    boss: 'kraken',
    waypoints: [[10, 12], [24, 12], [24, 28], [10, 32], [14, 46], [34, 46], [36, 30], [50, 32], [54, 52]],
    beach: true, tide: true, hard: true, wider: true,   // tidal swims + a deep-water boss arena + hidden passage
  },
  knife_mountain: {
    name: 'The Ice Age',
    color: '#9ac8e8', emoji: '🦣',
    sky: ['#dceaf4', '#b8d0e2', '#88a6c0'],         // a pale arctic sky over endless white
    ground: ['#f2f8fc', '#e2edf5'],                 // wind-packed tundra snow
    speckle: 'rgba(255,255,255,0.75)',
    edge: ['#b0c6d6', '#8ba4b8'],                   // snow-drift banks at the tundra's edge
    props: ['snowpile', 'icespike', 'pine', 'mammothskull', 'campfire', 'snowpile', 'frozenrock'],
    trail: '170,205,235',
    enemies: ['caveman', 'sabertooth', 'yeti', 'caveman', 'sabertooth'],
    boss: 'mammoth_king',
    // a wide-open white tundra trek — a long wandering trail across the snow
    waypoints: [[8, 12], [22, 10], [30, 20], [18, 28], [10, 40], [24, 46], [38, 40], [34, 26], [46, 16], [54, 26], [48, 40], [54, 52]],
    hard: true, wider: true,
  },
  desolate_dunes: {
    name: 'The Dawn of Time',
    color: '#ff6a2a', emoji: '🌍',
    sky: ['#ff8a3a', '#a83418', '#38100a'],          // a molten newborn sky, thick with ash
    ground: ['#5a4038', '#4a332c'],                  // barely-cooled crust
    speckle: 'rgba(255,150,70,0.35)',                // ember glow in every crack
    edge: ['#7a2a10', '#3a1408'],                    // white-hot chasm rim
    props: ['volcano', 'lavacrack', 'meteor', 'rock', 'volcano', 'lavacrack', 'meteor'],
    trail: '255,170,90',
    enemies: ['amoeba', 'trilobite', 'amoeba', 'trilobite', 'amoeba'],
    boss: 'magma_worm',
    // Same colossal storm-blasted platform as the Dunes — but at the dawn of the
    // world: primordial gales, fire tornadoes, and magma below instead of lava.
    waypoints: [[8, 8], [24, 8], [24, 20], [8, 20], [8, 32], [24, 32], [24, 44], [8, 44], [8, 54], [26, 54], [40, 50], [40, 36], [54, 34], [54, 20], [40, 18], [40, 10], [54, 10]],
    traps: true, dunes: true, hard: true, wind: true, lava: true, enemyDmgMul: 1.5,
  },
  secret: {
    name: 'The End of Time',
    color: '#8a4aff', emoji: '🤖',
    sky: ['#1a0a33', '#100626', '#050213'],          // the last night, lit by machine glow
    ground: ['#242438', '#1c1c2e'],                  // seamless alloy floor
    speckle: 'rgba(120,220,255,0.22)',
    edge: ['#10101f', '#080814'],
    props: ['hologram', 'powercore', 'antenna', 'hologram', 'powercore', 'antenna', 'hologram'],
    trail: '80,240,200',
    enemies: ['robot', 'mech', 'drone', 'robot'],     // filler adds in the final arena
    boss: 'backstabber_prime',
    chambers: true, hard: true, lair: true,           // boss-rush of resurrected wardens + the stealth finale
  },
};
/* ============================================================
   ACT THREE themes — the year 3026, marooned across the solar system. Each
   REGION slot becomes a planet on the long road home: Neptune → Uranus →
   Saturn → Jupiter → Mars → Earth → Venus → Mercury → Karrowmere. Same level
   structures, futuristic rosters: every foe leveled up with lasers, jetpacks
   and hovercrafts. */
const ACT3_THEMES = {
  dead_cliffs: {
    name: 'Neptune',
    color: '#3a6aff', emoji: '🔱',
    sky: ['#0a1440', '#0c2468', '#1a4aa8'],        // deep-blue storm bands over the black ocean
    ground: ['#3a5a72', '#2f4c62'],                // frozen methane-ice shelf
    speckle: 'rgba(120,200,255,0.30)',
    edge: ['#122238', '#0a1524'],
    props: ['icespike', 'coral', 'hologram', 'frozenrock', 'shell', 'icespike', 'antenna'],
    trail: '120,200,255',
    enemies: ['cyber_zombie', 'void_squid', 'laser_swordfish', 'cyber_zombie', 'void_squid'],
    boss: 'mecha_shark',
    waypoints: [[8, 12], [8, 28], [22, 32], [22, 16], [38, 14], [40, 32], [28, 42], [42, 50], [54, 54]],
  },
  barren_grasslands: {
    name: 'Uranus',
    color: '#7ae8e0', emoji: '🌀',
    sky: ['#bff4f0', '#7ad0d8', '#3a88a8'],        // pale sideways-tilted haze
    ground: ['#cfeef2', '#bcdfe6'],                // wind-polished ice plain
    speckle: 'rgba(255,255,255,0.55)',
    edge: ['#5a98a8', '#3a6a7a'],
    props: ['snowpile', 'icespike', 'frozenrock', 'powercore', 'icespike', 'snowpile', 'antenna'],
    trail: '170,235,235',
    enemies: ['cryo_yeti', 'hover_bear', 'frost_drone', 'cryo_yeti', 'hover_bear'],
    boss: 'cryo_titan',
    waypoints: [[10, 10], [26, 10], [26, 24], [12, 28], [14, 44], [34, 44], [36, 28], [50, 30], [54, 50]],
  },
  dark_forest: {
    name: 'Saturn',
    color: '#e8c97a', emoji: '🪐',
    sky: ['#f4e0b0', '#d9ae6a', '#8a5f30'],        // golden ring-light
    ground: ['#c9b080', '#b89e6c'],                // packed ring-dust
    speckle: 'rgba(255,240,200,0.35)',
    edge: ['#6a5430', '#463618'],
    props: ['meteor', 'rock', 'antenna', 'hologram', 'meteor', 'rock', 'powercore'],
    trail: '255,224,150',
    enemies: ['laser_pup', 'ring_phantom', 'jet_werewolf', 'laser_pup', 'ring_phantom'],
    boss: 'laser_alpha',
    waypoints: [[10, 10], [10, 28], [26, 34], [26, 16], [44, 14], [46, 34], [30, 46], [46, 52], [56, 54]],
    hard: true, wider: true,
  },
  toxic_temple: {
    name: 'Jupiter',
    color: '#d98a4a', emoji: '🌪️',
    sky: ['#8a3a1a', '#c06a2a', '#e8a45a'],        // the Great Red Spot, wall to wall
    ground: ['#a8703a', '#96622f'],                // storm-station deck plating
    speckle: 'rgba(255,190,120,0.28)',
    edge: ['#5a3014', '#381c0a'],
    props: ['hologram', 'powercore', 'brazier', 'antenna', 'pillar', 'powercore', 'hologram'],
    trail: '255,190,110',
    enemies: ['storm_amoeba', 'plasma_jelly', 'thunder_mech', 'storm_amoeba', 'plasma_jelly'],
    boss: 'storm_colossus',
    chambers: true, hard: true, hazard: 'quicksand',   // gravity wells suck you down between the gates
  },
  shatter_coast: {
    name: 'Mars',
    color: '#d95a3a', emoji: '🔴',
    sky: ['#f0b090', '#d97a4a', '#8a3a20'],        // butterscotch dust-storm sky
    ground: ['#c96a42', '#b85c38'],                // rust-red regolith
    speckle: 'rgba(255,180,140,0.30)',
    edge: ['#6a2c14', '#44190a'],
    props: ['rock', 'meteor', 'antenna', 'trafficcone', 'rock', 'meteor', 'powercore'],
    trail: '255,170,130',
    enemies: ['rust_raptor', 'war_drone', 'dust_soldier', 'rust_raptor', 'war_drone'],
    boss: 'war_machine',
    waypoints: [[10, 12], [24, 12], [24, 28], [10, 32], [14, 46], [34, 46], [36, 30], [50, 32], [54, 52]],
    traps: true, hard: true, wider: true,
  },
  sandcastle: {
    name: 'Earth · 3026',
    color: '#30ffb0', emoji: '🌍',
    sky: ['#1a2a3a', '#101a2e', '#080d1c'],        // dead megacity night, lit by dying neon
    ground: ['#3a4048', '#30363e'],                // cracked alloy streets
    speckle: 'rgba(48,255,176,0.18)',
    edge: ['#181c24', '#0e1118'],
    props: ['hologram', 'streetlight', 'car', 'powercore', 'trafficcone', 'antenna', 'burgerjoint'],
    trail: '80,255,190',
    enemies: ['chrome_zombie', 'hunter_mech', 'security_bot', 'chrome_zombie', 'security_bot'],
    boss: 'maglev',
    chambers: true, hard: true,                    // vault-to-vault through the ruined arcology
  },
  knife_mountain: {
    name: 'Venus',
    color: '#ffb84a', emoji: '🌋',
    sky: ['#f8d060', '#e08a2a', '#7a3410'],        // crushing acid-cloud furnace glare
    ground: ['#8a5a38', '#784c2e'],                // scorched volcanic rock
    speckle: 'rgba(255,200,90,0.35)',
    edge: ['#5a2810', '#331608'],
    props: ['volcano', 'lavacrack', 'meteor', 'brazier', 'rock', 'volcano', 'lavacrack'],
    trail: '255,200,110',
    enemies: ['acid_gooster', 'inferno_scarab', 'lava_trilobite', 'acid_gooster', 'inferno_scarab'],
    boss: 'plasma_leviathan',
    waypoints: [[10, 54], [22, 48], [16, 36], [26, 26], [16, 16], [30, 10], [42, 16], [36, 28], [46, 38], [38, 50], [52, 54], [56, 40], [54, 24]],
    hard: true, traps: true, lava: true,
  },
  desolate_dunes: {
    name: 'Mercury',
    color: '#c9c9d9', emoji: '☀️',
    sky: ['#fff4c0', '#e8ce7a', '#a8842a'],          // the sun fills half the sky
    ground: ['#b0aab8', '#9e98a8'],                  // heat-cracked silver rock
    speckle: 'rgba(255,244,200,0.45)',
    edge: ['#5a5468', '#38343f'],
    props: ['meteor', 'rock', 'lavacrack', 'powercore', 'meteor', 'rock', 'antenna'],
    trail: '255,240,180',
    enemies: ['solar_skeleton', 'mercury_crab', 'quick_wraith', 'solar_skeleton', 'mercury_crab'],
    boss: 'quicksilver',
    // the same colossal wind-blasted platform as the Dunes — solar gales now
    waypoints: [[8, 8], [24, 8], [24, 20], [8, 20], [8, 32], [24, 32], [24, 44], [8, 44], [8, 54], [26, 54], [40, 50], [40, 36], [54, 34], [54, 20], [40, 18], [40, 10], [54, 10]],
    traps: true, dunes: true, hard: true, wind: true, lava: true, enemyDmgMul: 2,
  },
  secret: {
    name: 'Karrowmere · Homecoming',
    color: '#ff2d5a', emoji: '🏰',
    sky: ['#1a0c2e', '#10061e', '#05020c'],          // home under an aurora of torn time
    ground: ['#2a1e34', '#211829'],                  // the old lair, a thousand years older
    speckle: 'rgba(255,60,110,0.22)',
    edge: ['#170f22', '#0c0714'],
    props: ['torch', 'pillar', 'tomb', 'skull', 'hologram', 'torch', 'powercore'],
    trail: '255,80,120',
    enemies: ['robot', 'mech', 'phantom', 'werewolf'],   // filler adds in the final arena
    boss: 'backstabber_omega',
    chambers: true, hard: true, lair: true,          // EVERY boss ever, then the Omega
  },
};
// Act-aware theme lookup: later acts re-skin when a theme exists, else Act 1.
function dungeonTheme(regionId) {
  if (currentAct() === 3 && ACT3_THEMES[regionId]) return ACT3_THEMES[regionId];
  if (currentAct() === 2 && ACT2_THEMES[regionId]) return ACT2_THEMES[regionId];
  return DUNGEON_THEMES[regionId];
}

/* Progressive difficulty: every region has a TIER — its position along the
   journey. Act 1 runs tiers 0-8; Act 2 picks up mid-curve (4-12); Act 3 runs
   the top of the curve (8-16) so the solar system is the hardest road yet.
   Enemies, swarms and bosses all scale off this, so the game gets steadily
   harder from first cliff to the final showdown at Karrowmere. */
function regionTier(regionId) {
  const i = Math.max(0, REGIONS.findIndex(r => r.id === regionId));
  return i + (currentAct() === 3 ? 8 : currentAct() === 2 ? 4 : 0);
}

/* Poison artifacts earned in the Toxic Temple — permanent powers for your weapon. */
const ARTIFACTS = {
  venom_fang:  { id: 'venom_fang',  name: 'Venom Fang',  icon: '🐍', desc: 'Your strikes poison enemies.' },
  toxic_vigor: { id: 'toxic_vigor', name: 'Toxic Vigor', icon: '☠️', desc: 'Your poison hits harder and lasts longer.' },
  plague_ward: { id: 'plague_ward', name: 'Plague Ward', icon: '🧪', desc: 'You are immune to poison pools.' },
  // ACT TWO artifact — flight
  wings:       { id: 'wings',       name: 'Wings of Icarus', icon: '🪽', desc: 'Hold Jump to take flight and glide over hazards.' },
};

/* The Toxic Temple layout: designed chambers linked by stair corridors with
   gates that only open once a chamber is cleared. The last chamber is the boss
   arena. (Deterministic — a hand-built temple, not a random trail.) */
const TEMPLE = {
  chambers: [
    { cx: 12, cy: 12, hw: 6, hh: 5 },
    { cx: 30, cy: 12, hw: 6, hh: 5 },
    { cx: 30, cy: 30, hw: 6, hh: 5 },
    { cx: 14, cy: 30, hw: 6, hh: 5 },
    { cx: 14, cy: 49, hw: 7, hh: 6, boss: true },
  ],
  // each corridor connects chamber `from`->`to`; its gate opens when `from` is cleared
  corridors: [
    { from: 0, to: 1, ax: 18, ay: 12, bx: 24, by: 12, gate: { x: 21, y: 12, hw: 1.4, hh: 2.2 }, stair: 'down' },
    { from: 1, to: 2, ax: 30, ay: 17, bx: 30, by: 25, gate: { x: 30, y: 21, hw: 2.2, hh: 1.4 }, stair: 'down' },
    { from: 2, to: 3, ax: 20, ay: 30, bx: 24, by: 30, gate: { x: 22, y: 30, hw: 1.4, hh: 2.2 }, stair: 'up' },
    { from: 3, to: 4, ax: 14, ay: 35, bx: 14, by: 43, gate: { x: 14, y: 39, hw: 2.2, hh: 1.4 }, stair: 'down' },
  ],
};

/* The Sandcastle Caverns: a longer, tougher chamber crawl through winding sand
   caves — six rooms, gated one at a time, ending in the King Crab's grotto. */
const SANDCASTLE_CAVES = {
  chambers: [
    { cx: 12, cy: 12, hw: 6, hh: 5 },               // entry cavern
    { cx: 30, cy: 12, hw: 6, hh: 5 },
    { cx: 30, cy: 30, hw: 7, hh: 5 },
    { cx: 48, cy: 30, hw: 6, hh: 5 },
    { cx: 48, cy: 48, hw: 6, hh: 5 },
    { cx: 28, cy: 48, hw: 8, hh: 6, boss: true },   // King Crab's grotto
  ],
  corridors: [
    { from: 0, to: 1, ax: 18, ay: 12, bx: 24, by: 12, gate: { x: 21, y: 12, hw: 1.4, hh: 2.2 }, stair: 'down' },
    { from: 1, to: 2, ax: 30, ay: 17, bx: 30, by: 25, gate: { x: 30, y: 21, hw: 2.2, hh: 1.4 }, stair: 'down' },
    { from: 2, to: 3, ax: 37, ay: 30, bx: 42, by: 30, gate: { x: 39, y: 30, hw: 1.4, hh: 2.2 }, stair: 'up' },
    { from: 3, to: 4, ax: 48, ay: 35, bx: 48, by: 43, gate: { x: 48, y: 39, hw: 2.2, hh: 1.4 }, stair: 'down' },
    { from: 4, to: 5, ax: 36, ay: 48, bx: 42, by: 48, gate: { x: 39, y: 48, hw: 1.4, hh: 2.2 }, stair: 'up' },
  ],
};
/* Knife Mountain: a glacier cave crawl — six frozen rooms on a slippery ice
   floor, ending in the Frost Titan's icy heart. */
const KNIFE_MOUNTAIN_CAVES = {
  chambers: [
    { cx: 50, cy: 14, hw: 6, hh: 5 },               // mouth of the cave
    { cx: 32, cy: 14, hw: 6, hh: 5 },
    { cx: 32, cy: 32, hw: 7, hh: 5 },
    { cx: 14, cy: 32, hw: 6, hh: 5 },
    { cx: 14, cy: 50, hw: 6, hh: 5 },
    { cx: 34, cy: 50, hw: 8, hh: 6, boss: true },   // the Frost Titan's heart
  ],
  corridors: [
    { from: 0, to: 1, ax: 38, ay: 14, bx: 44, by: 14, gate: { x: 41, y: 14, hw: 1.4, hh: 2.2 }, stair: 'down' },
    { from: 1, to: 2, ax: 32, ay: 19, bx: 32, by: 27, gate: { x: 32, y: 23, hw: 2.2, hh: 1.4 }, stair: 'down' },
    { from: 2, to: 3, ax: 20, ay: 32, bx: 25, by: 32, gate: { x: 22, y: 32, hw: 1.4, hh: 2.2 }, stair: 'up' },
    { from: 3, to: 4, ax: 14, ay: 37, bx: 14, by: 45, gate: { x: 14, y: 41, hw: 2.2, hh: 1.4 }, stair: 'down' },
    { from: 4, to: 5, ax: 20, ay: 50, bx: 26, by: 50, gate: { x: 23, y: 50, hw: 1.4, hh: 2.2 }, stair: 'up' },
  ],
};
/* The Backstabber's Lair: a BOSS-RUSH gauntlet — each chamber resurrects one of
   the realm's fallen bosses — capped by the multi-phase Backstabber himself. */
const BACKSTAB_LAIR = {
  chambers: [
    { cx: 12, cy: 12, hw: 6, hh: 5, rush: 'brute' },
    { cx: 30, cy: 12, hw: 6, hh: 5, rush: 'hexstraw' },
    { cx: 48, cy: 12, hw: 6, hh: 5, rush: 'alpha_werewolf' },
    { cx: 48, cy: 32, hw: 6, hh: 5, rush: 'frost_titan' },
    { cx: 30, cy: 32, hw: 7, hh: 5, rush: 'crab_king' },
    { cx: 14, cy: 32, hw: 6, hh: 5, rush: 'gorton' },
    { cx: 14, cy: 52, hw: 9, hh: 6, boss: true },      // the Backstabber's arena
  ],
  corridors: [
    { from: 0, to: 1, ax: 18, ay: 12, bx: 24, by: 12, gate: { x: 21, y: 12, hw: 1.4, hh: 2.2 }, stair: 'down' },
    { from: 1, to: 2, ax: 36, ay: 12, bx: 42, by: 12, gate: { x: 39, y: 12, hw: 1.4, hh: 2.2 }, stair: 'down' },
    { from: 2, to: 3, ax: 48, ay: 17, bx: 48, by: 27, gate: { x: 48, y: 22, hw: 2.2, hh: 1.4 }, stair: 'down' },
    { from: 3, to: 4, ax: 37, ay: 32, bx: 42, by: 32, gate: { x: 39, y: 32, hw: 1.4, hh: 2.2 }, stair: 'up' },
    { from: 4, to: 5, ax: 20, ay: 32, bx: 23, by: 32, gate: { x: 21, y: 32, hw: 1.4, hh: 2.2 }, stair: 'up' },
    { from: 5, to: 6, ax: 14, ay: 37, bx: 14, by: 46, gate: { x: 14, y: 41, hw: 2.2, hh: 1.4 }, stair: 'down' },
  ],
};
/* ACT THREE finale — KARROWMERE HOMECOMING: the ultimate gauntlet. Nine rush
   chambers resurrect EVERY boss from all three acts (each chamber runs its
   slot's whole lineage in sequence — Act 1 warden, Act 2 rebirth, Act 3
   machine), then the Backstabber Omega waits in the last arena. */
const KARROWMERE_GAUNTLET = {
  chambers: [
    { cx: 10, cy: 8,  hw: 6, hh: 5, rush: ['brute', 'trex', 'mecha_shark'] },
    { cx: 28, cy: 8,  hw: 6, hh: 5, rush: ['hexstraw', 'iron_horse', 'cryo_titan'] },
    { cx: 46, cy: 8,  hw: 6, hh: 5, rush: ['alpha_werewolf', 'warhound', 'laser_alpha'] },
    { cx: 46, cy: 22, hw: 6, hh: 5, rush: ['venombane', 'anubis', 'storm_colossus'] },
    { cx: 28, cy: 22, hw: 6, hh: 5, rush: ['great_white', 'kraken', 'war_machine'] },
    { cx: 10, cy: 22, hw: 6, hh: 5, rush: ['crab_king', 'colossus', 'maglev'] },
    { cx: 10, cy: 36, hw: 6, hh: 5, rush: ['frost_titan', 'mammoth_king', 'plasma_leviathan'] },
    { cx: 28, cy: 36, hw: 6, hh: 5, rush: ['dune_worm', 'magma_worm', 'quicksilver'] },
    { cx: 46, cy: 36, hw: 6, hh: 5, rush: ['bread_boi', 'dragok', 'gorton', 'backstabber', 'backstabber_prime'] },
    { cx: 46, cy: 52, hw: 8, hh: 6, boss: true },     // the Omega's arena
  ],
  corridors: [
    { from: 0, to: 1, ax: 16, ay: 8,  bx: 22, by: 8,  gate: { x: 19, y: 8,  hw: 1.4, hh: 2.2 }, stair: 'down' },
    { from: 1, to: 2, ax: 34, ay: 8,  bx: 40, by: 8,  gate: { x: 37, y: 8,  hw: 1.4, hh: 2.2 }, stair: 'down' },
    { from: 2, to: 3, ax: 46, ay: 13, bx: 46, by: 17, gate: { x: 46, y: 15, hw: 2.2, hh: 1.4 }, stair: 'down' },
    { from: 3, to: 4, ax: 34, ay: 22, bx: 40, by: 22, gate: { x: 37, y: 22, hw: 1.4, hh: 2.2 }, stair: 'up' },
    { from: 4, to: 5, ax: 16, ay: 22, bx: 22, by: 22, gate: { x: 19, y: 22, hw: 1.4, hh: 2.2 }, stair: 'up' },
    { from: 5, to: 6, ax: 10, ay: 27, bx: 10, by: 31, gate: { x: 10, y: 29, hw: 2.2, hh: 1.4 }, stair: 'down' },
    { from: 6, to: 7, ax: 16, ay: 36, bx: 22, by: 36, gate: { x: 19, y: 36, hw: 1.4, hh: 2.2 }, stair: 'down' },
    { from: 7, to: 8, ax: 34, ay: 36, bx: 40, by: 36, gate: { x: 37, y: 36, hw: 1.4, hh: 2.2 }, stair: 'down' },
    { from: 8, to: 9, ax: 46, ay: 41, bx: 46, by: 46, gate: { x: 46, y: 43, hw: 2.2, hh: 1.4 }, stair: 'down' },
  ],
};
// Which hand-built chamber layout each chamber-mode region uses.
const CHAMBER_LAYOUTS = { toxic_temple: TEMPLE, sandcastle: SANDCASTLE_CAVES, knife_mountain: KNIFE_MOUNTAIN_CAVES, secret: BACKSTAB_LAIR };
// In Act 3 the finale swaps in the Homecoming gauntlet (every boss ever).
function chamberLayoutFor(regionId) {
  if (currentAct() === 3 && regionId === 'secret') return KARROWMERE_GAUNTLET;
  return CHAMBER_LAYOUTS[regionId] || TEMPLE;
}

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
  Audio2.playMusic(regionId);   // each region has its own song

  const theme = dungeonTheme(regionId) || DUNGEON_THEMES.dead_cliffs;
  if (theme.chambers) return startTempleDungeon(regionId, theme);   // chamber-clear level

  const W = 62, H = 62;                    // map size in tiles
  const HALF = theme.wider ? 4.6 : 3.1;    // wider = a canyon valley floor

  // A winding trail: carve a corridor along a polyline; everything else is
  // void (chasm / edge), so you follow a path with drops on both sides.
  const WP = theme.waypoints;
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

  // props scattered on the trail + along its rim (theme-specific)
  const props = [];
  const kinds = theme.props;
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

  // canopy: big overhead tree-tops that shadow (and hide) the hero
  const canopy = [];
  if (theme.canopy) {
    for (let i = 0; i < 70; i++) {
      const c = 10 + rand(i * 5.7) * (path.length - 20);
      const s = sampleAtCum(path, c);
      const ox = (rand(i * 2.1) - 0.5) * 9, oy = (rand(i * 3.3) - 0.5) * 9;
      canopy.push({ x: s.x + ox, y: s.y + oy, r: 26 + rand(i) * 26, seed: i });
    }
  }

  // floor traps: quicksand pits + hidden trap doors, spaced along the trail
  const traps = [];
  if (theme.traps) {
    for (let i = 0; i < 22; i++) {
      const c = 12 + rand(i * 4.3 + 1) * (path.length - 20);
      const s = sampleAtCum(path, c);
      const off = (rand(i * 6.1) - 0.5) * (HALF * 1.4);
      const perp = rand(i) < 0.5 ? { x: off, y: 0 } : { x: 0, y: off };
      const tx = clamp(s.x + perp.x, 3, W - 3), ty = clamp(s.y + perp.y, 3, H - 3);
      if (tiles[Math.floor(ty)][Math.floor(tx)] !== 'ground') continue;
      traps.push({ x: tx, y: ty, kind: rand(i * 9.9) < 0.55 ? 'quicksand' : 'trapdoor', sprung: false, seed: i });
    }
  }

  // grabber trees: living trees that root the hero when close
  const grabbers = [];
  if (theme.traps) {
    for (let i = 0; i < 6; i++) {
      const c = 18 + rand(i * 8.7 + 3) * (path.length - 26);
      const s = sampleAtCum(path, c);
      const off = (rand(i * 3.1) < 0.5 ? -1 : 1) * (HALF - 0.6);
      const gx = clamp(s.x + off, 3, W - 3), gy = clamp(s.y, 3, H - 3);
      grabbers.push({ x: gx, y: gy, hp: 30, maxhp: 30, grabUntil: 0, cooldownUntil: 0, hurtUntil: 0, dead: false, seed: i });
    }
  }

  /* Beach levels (Shatter Coast, Sandcastle): tidal water you swim through,
     rolling wave traps, sucking quicksand, an underwater boss arena, and a
     hidden passage. */
  const water = [], waves = [];
  let secret = null, key = null, corridor = null;
  if (theme.beach) {
    // tidal pools in the middle sections (flood when the tide is high)
    [0.34, 0.5, 0.64].forEach((f, i) => {
      const s = sampleAtCum(path, f * path.length);
      water.push({ x: s.x, y: s.y, r: 3.2 + i * 0.5, deep: false });
    });
    if (theme.tide) {
      // deep water at the end = the underwater boss arena (always submerged)
      const bx = WP[WP.length - 1][0], by = WP[WP.length - 1][1];
      water.push({ x: bx, y: by, r: 8.5, deep: true });
      // a hidden portal off to the side of the deep arena
      for (const off of [[5, 3], [-5, 3], [4, -4], [-4, -4], [6, 0]]) {
        const sx = clamp(bx + off[0], 4, W - 4), sy = clamp(by + off[1], 4, H - 4);
        if (tiles[Math.floor(sy)][Math.floor(sx)] === 'ground') { secret = { x: sx, y: sy, found: false }; break; }
      }
      // touching the portal opens a submerged GAUNTLET corridor lined with
      // enemies; fight to the far end to claim the Key to the Sandcastle
      if (secret) {
        let dir = [0, 1];
        for (const dd of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ex = secret.x + dd[0] * 14, ey = secret.y + dd[1] * 14;
          if (ex >= 5 && ex <= W - 5 && ey >= 5 && ey <= H - 5) { dir = dd; break; }
        }
        const len = 14, px = -dir[1], py = dir[0], spawns = [];
        for (let s = 1; s <= len; s++) {
          for (let w = -1; w <= 1; w++) {
            const tx = Math.round(secret.x + dir[0] * s + px * w), ty = Math.round(secret.y + dir[1] * s + py * w);
            if (tx >= 2 && tx < W - 2 && ty >= 2 && ty < H - 2) tiles[ty][tx] = 'ground';
          }
          if (s >= 3 && s <= len - 2 && s % 2 === 1) spawns.push({ x: secret.x + dir[0] * s, y: secret.y + dir[1] * s });
        }
        key = { x: clamp(secret.x + dir[0] * len, 3, W - 3), y: clamp(secret.y + dir[1] * len, 3, H - 3), taken: false };
        corridor = { spawns };
        water.push({ x: secret.x + dir[0] * len / 2, y: secret.y + dir[1] * len / 2, r: len / 2 + 4, deep: true }); // underwater tunnel
      }
    }
    // rolling wave traps along the shore
    for (let i = 0; i < 9; i++) {
      const s = sampleAtCum(path, (6 + rand(i * 3.7 + 2) * (path.length - 12)));
      waves.push({ x: s.x, y: s.y, phase: rand(i) * 3.2, seed: i });
    }
    // sucking quicksand pits
    for (let i = 0; i < 6; i++) {
      const s = sampleAtCum(path, (8 + rand(i * 5.1 + 1) * (path.length - 16)));
      const off = (rand(i * 6.1) - 0.5) * (HALF * 1.2);
      const tx = clamp(s.x + off, 4, W - 4), ty = clamp(s.y, 4, H - 4);
      if (tiles[Math.floor(ty)][Math.floor(tx)] === 'ground') traps.push({ x: tx, y: ty, kind: 'quicksand', strong: true, sprung: false, seed: i });
    }
  }

  /* Desolate Dunes: a storm-blasted platform over a lava chasm — EVERY hazard at
     once (quicksand, trap doors, poison, lava rivers) plus wind, gusts, a
     sandstorm and roaming tornadoes that can hurl you clean off the edge. */
  const tornadoes = [];
  if (theme.dunes) {
    // poison pools scattered along the trail
    for (let i = 0; i < 11; i++) {
      const s = sampleAtCum(path, (10 + rand(i * 3.1 + 5) * (path.length - 20)));
      const off = (rand(i * 7.7) - 0.5) * (HALF * 1.1);
      const tx = clamp(s.x + off, 3, W - 3), ty = clamp(s.y, 3, H - 3);
      if (tiles[Math.floor(ty)][Math.floor(tx)] === 'ground') traps.push({ x: tx, y: ty, kind: 'poison_pool', seed: i * 3 });
    }
    // lava rivers cross the trail — short molten bands you must jump over
    for (let i = 0; i < 8; i++) {
      const s = sampleAtCum(path, (14 + rand(i * 5.3 + 2) * (path.length - 26)));
      for (let w = -1; w <= 1; w++) {
        const px = clamp(Math.round(s.x + w), 3, W - 3), py = clamp(Math.round(s.y), 3, H - 3);
        if (tiles[py][px] === 'ground') traps.push({ x: px, y: py, kind: 'lava', seed: i * 5 + w + 40 });
      }
    }
    // extra quicksand + trap doors (in addition to the theme.traps set) for chaos
    for (let i = 0; i < 6; i++) {
      const s = sampleAtCum(path, (9 + rand(i * 4.9 + 3) * (path.length - 18)));
      const off = (rand(i * 8.3) - 0.5) * (HALF * 1.1);
      const tx = clamp(s.x + off, 3, W - 3), ty = clamp(s.y, 3, H - 3);
      if (tiles[Math.floor(ty)][Math.floor(tx)] === 'ground') traps.push({ x: tx, y: ty, kind: rand(i * 2.7) < 0.5 ? 'quicksand' : 'trapdoor', strong: true, sprung: false, seed: i + 70 });
    }
    // roaming tornadoes patrolling the platform
    for (let i = 0; i < 5; i++) {
      const s = sampleAtCum(path, (16 + rand(i * 9.1) * (path.length - 24)));
      const ang = rand(i * 3.7) * Math.PI * 2;
      tornadoes.push({ x: s.x, y: s.y, vx: Math.cos(ang), vy: Math.sin(ang), spin: 0, seed: i });
    }
  }

  const hero = {
    fx: WP[0][0], fy: WP[0][1], r: 0.42,
    facing: 1, faceAngle: Math.PI / 2,      // faceAngle in world radians
    // The hero fights on exactly their max hearts — every heart counts, so the
    // gauntlets stay tense. Extra hearts are earned as rare end-of-level rewards.
    hp: STATE.maxHearts, maxhp: STATE.maxHearts, hurtInvulnUntil: 0,
    attackReadyAt: 0, dodgeUntil: 0, dodgeReadyAt: 0,
    hurtUntil: 0, swingUntil: 0, moving: false, animT: 0,
    jumpUntil: 0, jumpReadyAt: 0, jumpZ: 0, rootedUntil: 0, sinkUntil: 0, sinkLevel: 0, submerged: false,
  };

  DUNGEON = {
    regionId, theme, W, H, tiles, props, path, checkpoints, canopy, traps, grabbers,
    hard: !!theme.hard,
    beach: !!theme.beach, water, waves, secret, key, corridor, tide: 0,
    dunes: !!theme.dunes, tornadoes, wind: { x: 0, y: 0, gust: false },
    volcano: !!theme.volcano, eruptions: [], eruptTimer: 3.5,
    hero,
    enemies: [], drops: [], fx: [], shots: [],
    kills: 0, spawned: 0, target: DUN.KILLS_TARGET, progress: 0,
    boss: null, bossIntro: false,
    over: false, outcome: null,
    cam: { x: 0, y: 0 },
    keys: {}, mouse: { x: 0, y: 0, down: false }, joy: { active: false, dx: 0, dy: 0 },
    attackHeld: false, paused: false,
    lastT: performance.now(), raf: null,
    spawnTimer: 0,
    // grace period: no mobs spawn or attack until the level-intro banner is gone
    introUntil: performance.now() + 5200,
    pet: makeDungeonPet(hero),
  };

  buildDungeonDOM();
  bindDungeonInput();
  levelIntro(regionId);   // remind the player why they're here
  DUNGEON.raf = requestAnimationFrame(dungeonLoop);
}

/* ============================================================
   TOXIC TEMPLE — chamber-clear level with gates, stairs, poison
   ============================================================ */
function startTempleDungeon(regionId, theme) {
  const LAYOUT = chamberLayoutFor(regionId);   // per-region hand-built layout (act-aware)
  // hazard flavour per level: poison pools (Temple), sucking quicksand (sand caves), slippery ice (mountain)
  const hazardKind = theme.hazard || (theme.poison ? 'poison_pool' : 'quicksand');
  const W = 62, H = 62;
  const tiles = [];
  for (let y = 0; y < H; y++) { const row = []; for (let x = 0; x < W; x++) row.push('void'); tiles.push(row); }
  const carve = (x0, y0, x1, y1) => {
    for (let y = Math.floor(Math.min(y0, y1)); y <= Math.ceil(Math.max(y0, y1)); y++)
      for (let x = Math.floor(Math.min(x0, x1)); x <= Math.ceil(Math.max(x0, x1)); x++)
        if (y >= 0 && y < H && x >= 0 && x < W) tiles[y][x] = 'ground';
  };
  // carve each chamber room
  const chambers = LAYOUT.chambers.map((c, i) => {
    carve(c.cx - c.hw, c.cy - c.hh, c.cx + c.hw, c.cy + c.hh);
    return { cx: c.cx, cy: c.cy, hw: c.hw, hh: c.hh, boss: !!c.boss, rush: c.rush || null, index: i, active: false, cleared: false, spawned: false };
  });
  // carve corridors (3-wide) and build gates + stairs
  const doors = [], stairs = [];
  LAYOUT.corridors.forEach(cor => {
    if (cor.ax === cor.bx) carve(cor.ax - 1, cor.ay, cor.bx + 1, cor.by);   // vertical passage
    else carve(cor.ax, cor.ay - 1, cor.bx, cor.by + 1);                     // horizontal passage
    doors.push({ x: cor.gate.x, y: cor.gate.y, hw: cor.gate.hw, hh: cor.gate.hh, vertical: cor.ax === cor.bx, open: false, opensAfter: cor.from });
    stairs.push({ x: cor.gate.x, y: cor.gate.y, dir: cor.stair, vertical: cor.ax === cor.bx });
  });

  // temple props inside chambers (off-centre so they don't clog the fight)
  const props = [], kinds = theme.props; let pc = 0;
  chambers.forEach((c, ci) => {
    const n = 5 + Math.floor(rand(ci * 3.1) * 4);
    for (let k = 0; k < n; k++) {
      const ang = rand(ci * 9.7 + k * 2.3) * Math.PI * 2, rr = 0.6 + rand(ci + k) * 0.38;
      const x = c.cx + Math.cos(ang) * c.hw * rr, y = c.cy + Math.sin(ang) * c.hh * rr;
      if (isGroundTile(tiles, x, y, W, H)) props.push({ x, y, kind: kinds[(pc++) % kinds.length], seed: pc * 5 + ci });
    }
  });

  // hazard pools (poison in the Temple, sucking quicksand in the sand caves) +
  // spike traps in the combat chambers (skip the gentle first room). The
  // Backstabber's Lair has no floor hazards — its danger is the boss rush + dark.
  const traps = [];
  chambers.forEach((c, ci) => {
    if (ci === 0 || c.boss || theme.lair) return;
    const nPools = 1 + Math.floor(rand(ci * 4.2) * 2), nSpikes = 1 + Math.floor(rand(ci * 6.6 + 1) * 2);
    for (let k = 0; k < nPools; k++) {
      const x = c.cx + (rand(ci * 2.1 + k) - 0.5) * c.hw * 1.4, y = c.cy + (rand(ci * 3.3 + k) - 0.5) * c.hh * 1.4;
      if (isGroundTile(tiles, x, y, W, H)) traps.push({ x, y, kind: hazardKind, strong: hazardKind === 'quicksand', sprung: false, seed: ci * 10 + k });
    }
    for (let k = 0; k < nSpikes; k++) {
      const x = c.cx + (rand(ci * 5.5 + k + 2) - 0.5) * c.hw * 1.5, y = c.cy + (rand(ci * 7.7 + k) - 0.5) * c.hh * 1.5;
      if (isGroundTile(tiles, x, y, W, H)) traps.push({ x, y, kind: 'spikes', phase: rand(ci + k) * 1.8, seed: ci * 20 + k });
    }
  });
  // ring the boss chamber with hazard pools for atmosphere + danger
  const bc = chambers[chambers.length - 1];
  if (!theme.lair) for (let a = 0; a < 6; a++) {
    const x = bc.cx + Math.cos(a) * (bc.hw - 1.5), y = bc.cy + Math.sin(a) * (bc.hh - 1.5);
    if (isGroundTile(tiles, x, y, W, H)) traps.push({ x, y, kind: hazardKind, strong: hazardKind === 'quicksand', sprung: false, seed: 90 + a });
  }

  // one earnable poison artifact in chambers 1, 2 and 3 (Toxic Temple only)
  const artifacts = [];
  if (theme.poison) {
    const artOrder = ['venom_fang', 'toxic_vigor', 'plague_ward'];
    [1, 2, 3].forEach((ci, k) => {
      if (hasArtifact(artOrder[k])) return;
      const c = chambers[ci];
      artifacts.push({ id: artOrder[k], x: c.cx + c.hw * 0.5, y: c.cy - c.hh * 0.4, taken: false });
    });
  }

  const start = chambers[0];
  const hero = {
    fx: start.cx - start.hw * 0.5, fy: start.cy, r: 0.42,
    facing: 1, faceAngle: 0,
    hp: STATE.maxHearts, maxhp: STATE.maxHearts, hurtInvulnUntil: 0,
    attackReadyAt: 0, dodgeUntil: 0, dodgeReadyAt: 0,
    hurtUntil: 0, swingUntil: 0, moving: false, animT: 0,
    jumpUntil: 0, jumpReadyAt: 0, jumpZ: 0, rootedUntil: 0, sinkUntil: 0,
  };

  DUNGEON = {
    regionId, theme, W, H, tiles, props,
    path: buildPath(LAYOUT.chambers.map(c => [c.cx, c.cy])),   // fallback path; camera follows hero
    checkpoints: [], canopy: [], traps, grabbers: [],
    chamberMode: true, chamberList: chambers, doors, stairs, artifacts, activeIndex: -1, chambersCleared: 0,
    hard: true, poison: !!theme.poison,
    volcano: !!theme.volcano, eruptions: [], eruptTimer: 3.5,
    hero, enemies: [], drops: [], fx: [], shots: [],
    kills: 0, spawned: 0, progress: 0,
    boss: null, bossIntro: false,
    over: false, outcome: null,
    cam: { x: 0, y: 0 },
    keys: {}, mouse: { x: 0, y: 0, down: false }, joy: { active: false, dx: 0, dy: 0 },
    attackHeld: false, paused: false,
    lastT: performance.now(), raf: null, spawnTimer: 0,
    // grace period: no mobs spawn or attack until the level-intro banner is gone
    introUntil: performance.now() + 5200,
    pet: makeDungeonPet(hero),
  };
  buildDungeonDOM();
  bindDungeonInput();
  levelIntro(regionId);   // remind the player why they're here
  // shown once the intro card clears, right as the first horde appears
  setTimeout(() => { if (DUNGEON && !DUNGEON.over) banner('CHAMBER 1 — clear it to open the gate!', 1800); }, 5300);
  DUNGEON.raf = requestAnimationFrame(dungeonLoop);
}

function isGroundTile(tiles, x, y, W, H) {
  const ix = Math.floor(x), iy = Math.floor(y);
  return iy >= 0 && iy < H && ix >= 0 && ix < W && tiles[iy][ix] === 'ground';
}
function chamberContains(c, fx, fy) {
  return fx >= c.cx - c.hw && fx <= c.cx + c.hw && fy >= c.cy - c.hh && fy <= c.cy + c.hh;
}

/* Per-frame chamber logic: activate the room you enter, spawn its wave, and open
   the onward gate once it's cleared. The final chamber summons the boss. */
/* Pause the mobs while a banner is on screen: extends the freeze window the
   whole game respects (no spawns, no movement, no attacks) so the player can
   actually read what just popped up. */
function pauseMobs(ms) {
  const d = DUNGEON; if (!d) return;
  d.introUntil = Math.max(d.introUntil || 0, performance.now() + ms);
}

function updateChambers(dt, t) {
  const d = DUNGEON, h = d.hero;
  if (t < (d.introUntil || 0)) return;   // let the player read the intro before the first horde spawns
  const here = d.chamberList.find(c => chamberContains(c, h.fx, h.fy));
  if (here && !here.active && !here.cleared) activateChamber(here, t);

  d.artifacts.forEach(a => { if (!a.taken && dist(a.x, a.y, h.fx, h.fy) < 0.9) grantArtifact(a, t); });

  const act = d.chamberList[d.activeIndex];
  if (act && act.active && !act.cleared && !act.boss && act.spawned && d.enemies.filter(e => !e.dead).length === 0) {
    // a rush chamber with bosses still queued raises the next one instead of opening
    if (act.queue && act.queue.length) spawnNextRushBoss(act);
    else clearChamber(act, t);
  }
  d.progress = d.chambersCleared / (d.chamberList.length - 1);
}

function activateChamber(c, t) {
  const d = DUNGEON;
  d.activeIndex = c.index; c.active = true;
  if (c.boss) { summonBossChamber(); return; }
  if (c.rush) { spawnMiniBoss(c); c.spawned = true; return; }   // boss-rush chamber
  const count = 5 + c.index * 3;   // a denser horde guards every chamber gate
  for (let k = 0; k < count; k++) spawnInChamber(c, k);
  c.spawned = true;
  if (c.index > 0) { banner('⚔️ CHAMBER GATE ' + (c.index + 1) + ' — defeat the horde!', 1600); pauseMobs(1700); }
}

/* Boss-rush chamber: resurrect one of the realm's fallen bosses as a tough
   mini-boss (in the swarm, so the gate opens when it and its guards fall).
   In Act 2's End of Time, each chamber raises the era-warden you already beat.
   A chamber's `rush` may be a LIST — Act 3's Homecoming runs whole lineages of
   bosses back to back, one rising as the last one falls. */
const ACT2_RUSH = { brute: 'trex', hexstraw: 'iron_horse', alpha_werewolf: 'warhound', frost_titan: 'mammoth_king', crab_king: 'colossus', gorton: 'kraken' };
function spawnMiniBoss(c) {
  c.queue = (Array.isArray(c.rush) ? c.rush : [c.rush]).slice();
  spawnNextRushBoss(c, true);
}
function spawnNextRushBoss(c, first) {
  const d = DUNGEON;
  let rushId = c.queue.shift();
  if (currentAct() === 2 && ACT2_RUSH[rushId]) rushId = ACT2_RUSH[rushId];
  const bd = BOSSES[rushId];
  if (!bd) return;
  const hp = Math.round(bd.hearts * 16);   // a real wall, but below the true finale boss
  d.enemies.push({
    fighter: bd, art: bd.art, palette: bd.palette,
    fx: c.cx, fy: c.cy - c.hh * 0.4, r: 0.7, scale: 1.8,
    hp, maxhp: hp, speed: 1.6, elite: false, miniboss: true,
    attack: bd.attack, reward: bd.reward, contact: bossDmg(bd.attack >= 5 ? 1.4 : 1.1),
    facing: -1, faceFlipReadyAt: 0, attackReadyAt: 0, windUntil: 0, hurtUntil: 0, animT: 0,
  });
  d.spawned++;
  if (first) for (let k = 0; k < 3; k++) spawnInChamber(c, k + 50);   // a few guards alongside the first
  banner('☠️ BOSS RUSH — ' + bd.name.toUpperCase() + ' RISES AGAIN!' + (c.queue.length ? ' (' + c.queue.length + ' more wait...)' : ''), 2000);
  pauseMobs(2100);   // let the announcement land before the resurrected warden moves
  Audio2.sfx.lose();
}

/* A shadow clone of the Backstabber — a fast, fragile decoy that harries you. */
function spawnShadowClone(b, k) {
  const d = DUNGEON, bd = BOSSES.backstabber;
  const ang = rand(k * 5.3 + performance.now() * 0.001) * Math.PI * 2, rr = 2.6;
  d.enemies.push({
    fighter: bd, art: bd.art, palette: { skin: '#221c38', cloth: '#3a1030' },
    fx: clamp(b.fx + Math.cos(ang) * rr, 3, d.W - 3), fy: clamp(b.fy + Math.sin(ang) * rr, 3, d.H - 3),
    r: 0.4, scale: 1, hp: 16, maxhp: 16, speed: 2.5, elite: false, shadow: true,
    attack: 5, reward: 0, contact: 1.0,
    facing: -1, faceFlipReadyAt: 0, attackReadyAt: 0, windUntil: 0, hurtUntil: 0, animT: 0,
  });
  d.spawned++;
}

function spawnInChamber(c, k) {
  const d = DUNGEON;
  for (let tries = 0; tries < 20; tries++) {
    const ang = rand(c.index * 12.1 + k * 3.7 + tries) * Math.PI * 2, rr = 0.35 + rand(c.index + k + tries) * 0.6;
    const x = c.cx + Math.cos(ang) * c.hw * rr, y = c.cy + Math.sin(ang) * c.hh * rr;
    if (!isGroundTile(d.tiles, x, y, d.W, d.H) || dist(x, y, d.hero.fx, d.hero.fy) < 2.4) continue;
    const pool = d.theme.enemies, id = pool[Math.floor(rand(c.index * 9.1 + k * 2.3 + tries) * pool.length)];
    d.enemies.push(makeDungeonEnemy(id, x, y, d.spawned + k + tries));
    d.spawned++;
    return;
  }
}

function clearChamber(c, t) {
  const d = DUNGEON;
  c.cleared = true; d.chambersCleared++;
  d.doors.forEach(door => { if (door.opensAfter === c.index) door.open = true; });
  banner('CHAMBER CLEARED — the gate opens!', 1700);
  Audio2.sfx.win(); earn(15);
  d.hero.hp = Math.min(d.hero.maxhp, d.hero.hp + 1);
  updateDungeonHUD();
}

function grantArtifact(a, t) {
  a.taken = true;
  if (!STATE.artifacts) STATE.artifacts = [];
  if (!STATE.artifacts.includes(a.id)) STATE.artifacts.push(a.id);
  const info = ARTIFACTS[a.id];
  banner(info.icon + ' ' + info.name.toUpperCase() + ' — ' + info.desc, 2600);
  Audio2.sfx.win();
  spawnFloatText(a.x, a.y, info.icon + ' ' + info.name, '#8ff0a0');
  saveGame();
}

function summonBossChamber() {
  const d = DUNGEON;
  const bd = BOSSES[d.theme.boss];
  d.bossIntro = true; d.bossId = d.theme.boss;
  banner(bd.name.toUpperCase() + ' AWAKENS...', 2400);
  Audio2.playMusic('boss');
  Audio2.sfx.lose();
  setTimeout(() => {
    if (!DUNGEON) return;
    const c = d.chamberList[d.chamberList.length - 1];
    const hp = Math.round(bd.hearts * 24 * bossActMul() * (1 + regionTier(d.regionId) * 0.08));   // later-act wardens are tougher; all bosses climb the tier curve
    d.boss = {
      boss: true, fighter: bd, art: bd.art, palette: bd.palette,
      fx: c.cx, fy: c.cy - c.hh * 0.5, r: 0.9, scale: 2.3, poison: !!d.theme.poison,
      hp, maxhp: hp, attack: bd.attack, reward: bd.reward,
      speed: 1.4, facing: -1, faceFlipReadyAt: 0, attackReadyAt: 0, windUntil: 0, hurtUntil: 0, name: bd.name,
    };
    // The Backstabber fights in the dark: he vanishes and strikes from behind,
    // splits into shadow clones, and rages in three phases.
    if (bd.id === 'backstabber') { Object.assign(d.boss, { backstabber: true, state: 'chase', stateUntil: 0, vanished: false, invuln: false, phaseNum: 1, scale: 2.0, speed: 2.2 }); }
    // The Backstabber PRIME — the Act 2 finale. Same shadow game, but he's far
    // bigger, faster on every beat, hits harder, and raises more clones.
    if (bd.id === 'backstabber_prime') { Object.assign(d.boss, { backstabber: true, prime: true, state: 'chase', stateUntil: 0, vanished: false, invuln: false, phaseNum: 1, scale: 2.8, speed: 2.7 }); }
    // The Backstabber OMEGA — the saga's true finale. The full shadow game AND
    // a thousand years of stolen powers: fireballs, ice novas, lightning and
    // world-cracking stomps — every one of them a ONE-HIT KILL. Jump and dodge
    // on the telegraph, or die.
    if (bd.id === 'backstabber_omega') { Object.assign(d.boss, { backstabber: true, prime: true, omega: true, state: 'chase', stateUntil: 0, vanished: false, invuln: false, phaseNum: 1, scale: 3.3, speed: 2.9 }); }
    const bar = document.getElementById('boss-bar');
    bar.querySelector('.boss-name').textContent = bd.name.toUpperCase();
    bar.classList.remove('hidden');
    updateBossHUD();
  }, 2400);
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
        <button class="btn-icon" id="dun-gear" title="Gear (E)">⚙️</button>
        <div id="dun-hearts" class="dun-hearts"></div>
        <div id="dun-lives" class="dun-lives"></div>
        <div class="dun-obj">
          <span class="obj-label">Journey to the boss</span>
          <div class="obj-bar"><div id="obj-fill" class="obj-fill"></div></div>
          <span id="obj-count" class="obj-count">Checkpoint 0 / 4</span>
        </div>
      </div>
      <div id="boss-bar" class="boss-bar hidden">
        <div class="boss-name">THE BRUTE</div>
        <div class="boss-track"><div id="boss-fill" class="boss-fill"></div></div>
      </div>
      <div id="dun-weapon" class="dun-weapon"></div>
      <div id="dun-shield" class="dun-shield"></div>
    </div>
    <div class="dun-touch">
      <div id="joy" class="joy"><div id="joy-knob" class="joy-knob"></div></div>
      <div id="potion-tray" class="potion-tray hidden"></div>
      <div class="touch-btns">
        <button class="tbtn potion" id="t-potion">🧪</button>
        <button class="tbtn heal" id="t-heal">❤️</button>
        <button class="tbtn jump" id="t-jump">⤴️</button>
        <button class="tbtn dodge" id="t-dodge">💨</button>
        <button class="tbtn attack" id="t-attack">🗡️</button>
      </div>
    </div>
    <div id="dun-banner" class="dun-banner"></div>
  `;
  // One-time controls hint on the very first crawl, so new players aren't lost.
  if (!STATE.seenControls) {
    STATE.seenControls = true; saveGame();
    const hint = document.createElement('div');
    hint.className = 'controls-hint';
    hint.innerHTML = '🎮 <b>WASD</b> move &nbsp;·&nbsp; <b>K</b>/click attack &nbsp;·&nbsp; <b>Shift</b> dodge &nbsp;·&nbsp; <b>Space</b> jump &nbsp;·&nbsp; <b>Q</b> heal &nbsp;·&nbsp; <b>E</b> gear';
    el.appendChild(hint);
    setTimeout(() => { hint.classList.add('fade'); setTimeout(() => hint.remove(), 700); }, 9000);
  }
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
    if (e.key === ' ') heroJump();               // Space = jump
    if (e.key.toLowerCase() === 'k') heroAttack();
    if (e.key.toLowerCase() === 'shift') heroDodge();
    if (e.key.toLowerCase() === 'q') heroHeal();
    if (e.key.toLowerCase() === 'e') openGearMenu();
    if (e.key === 'Escape') closeGearMenu();
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
  document.getElementById('dun-gear').addEventListener('click', () => { Audio2.sfx.click(); openGearMenu(); });
  const atk = document.getElementById('t-attack');
  const holdOn = e => { e.preventDefault(); d.attackHeld = true; heroAttack(); };
  const holdOff = e => { d.attackHeld = false; };
  atk.addEventListener('touchstart', holdOn, { passive: false });
  atk.addEventListener('touchend', holdOff);
  atk.addEventListener('mousedown', holdOn);
  atk.addEventListener('mouseup', holdOff);
  document.getElementById('t-dodge').addEventListener('click', heroDodge);
  document.getElementById('t-heal').addEventListener('click', heroHeal);
  const potBtn = document.getElementById('t-potion');
  if (potBtn) potBtn.addEventListener('click', e => { e.preventDefault(); togglePotionTray(); });
  const jmp = document.getElementById('t-jump');
  const jumpOn = e => { e.preventDefault(); d.jumpBtnHeld = true; heroJump(); };   // hold to fly with Wings
  const jumpOff = e => { d.jumpBtnHeld = false; };
  jmp.addEventListener('touchstart', jumpOn, { passive: false });
  jmp.addEventListener('touchend', jumpOff);
  jmp.addEventListener('mousedown', jumpOn);
  jmp.addEventListener('mouseup', jumpOff);
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
  const wid = STATE.equippedWeapon;
  let durab = STATE.weapons[wid] || 0;
  const bare = durab <= 0;
  // Ranged weapons (gun / bazooka) FIRE a projectile instead of swinging — and
  // you can pull the trigger mid-jump.
  const rangedKind = (!bare && (weaponPower(wid) === 'gun' || weaponPower(wid) === 'bazooka')) ? weaponPower(wid) : null;
  if (rangedKind) {
    h.attackReadyAt = now + (rangedKind === 'bazooka' ? 950 : 300);   // fire rate
    h.swingUntil = now + 130;
    STATE.weapons[wid] = durab - 1;
    fireHeroShot(rangedKind, wid, now);
    updateWeaponHUD();
    return;
  }
  const sp = weaponSpeed(WEAPONS[wid] || {});     // per-weapon feel: light=fast, heavy=slow
  h.attackReadyAt = now + sp.cool;
  h.swingUntil = now + sp.swing;
  if (!bare) { STATE.weapons[wid] = durab - 1; }
  const power = bare ? null : weaponPower(wid);
  // BACK STAB: striking an enemy from behind its facing deals double damage.
  const behind = e => e.facing !== 0 && Math.sign(h.fx - e.fx) !== 0 && Math.sign(h.fx - e.fx) !== e.facing;
  const buff = (h.buffMs > 0) ? (h.buffMult || 2) : 1;   // Strength/Berserk potion
  const dmg = Math.round((bare ? 2 : (weaponDamage(wid) + (STATE.dmgBonus || 0))) * levelMastery() * buff * 10) / 10;   // upgrades + Power modifier + level mastery + potion buff
  const hits = power === 'double' ? 2 : 1;
  let reach = 2.4, arc = Math.PI * 1.15;
  if (power === 'reach') reach += 1.2;                 // spears/bow strike from further
  if (power === 'sweep') { arc = Math.PI * 1.9; reach += 0.5; }   // scythes clear a wide arc
  Audio2.sfx.hit();
  updateHeroFacing();

  let dealt = 0;
  // Venom Fang artifact makes EVERY weapon poison; Toxic Vigor makes it stronger.
  const doesPoison = power === 'poison' || hasArtifact('venom_fang');
  const applyPowerTo = e => { if (doesPoison) poisonEnemy(e, now, hasArtifact('toxic_vigor')); if (power === 'stun') stunEnemy(e, now); };
  const inArc = e => {
    const a = Math.atan2(e.fy - h.fy, e.fx - h.fx);
    let da = Math.abs(a - h.faceAngle); if (da > Math.PI) da = Math.PI * 2 - da;
    return dist(h.fx, h.fy, e.fx, e.fy) <= reach + (e.r || 0.4) && da <= arc / 2;
  };
  d.enemies.forEach(e => {
    if (e.dead) return;
    if (inArc(e)) {
      const back = behind(e), hitDmg = back ? dmg * 2 : dmg;
      for (let k = 0; k < hits && !e.dead; k++) { damageEnemy(e, hitDmg, back); dealt += hitDmg; }
      applyPowerTo(e);
    }
  });
  if (d.boss && !d.boss.dead) {
    const b = d.boss;
    if (dist(h.fx, h.fy, b.fx, b.fy) <= reach + b.r) {
      const back = behind(b), hitDmg = back ? dmg * 2 : dmg;
      for (let k = 0; k < hits && !b.dead; k++) { damageEnemy(b, hitDmg, back); dealt += hitDmg; }
      applyPowerTo(b);
    }
  }
  if (d.grabbers) d.grabbers.forEach(g => {
    if (g.dead) return;
    if (dist(h.fx, h.fy, g.x, g.y) <= reach + 0.6) {
      g.hp -= dmg * hits; g.hurtUntil = now + 160;
      spawnFloatText(g.x, g.y - 0.3, '-' + dmg * hits, '#8ff0a0');
      if (g.hp <= 0) { g.dead = true; Audio2.sfx.bighit(); spawnPuff(g.x, g.y); }
    }
  });
  // lifesteal heals a little for the damage dealt
  if (power === 'lifesteal' && dealt > 0) {
    h.hp = Math.min(h.maxhp, h.hp + Math.min(0.5, dealt * 0.012));
    spawnFloatText(h.fx, h.fy, '+life', '#8ff0a0'); updateDungeonHUD();
  }
  spawnSwingFx(h);
  updateWeaponHUD();
}

/* ---- ranged weapons: hero bullets & rockets ---- */
function fireHeroShot(kind, wid, now) {
  const d = DUNGEON, h = d.hero;
  updateHeroFacing();
  const ang = h.faceAngle;
  const speed = kind === 'bazooka' ? 10 : 17;
  const buff = (h.buffMs > 0) ? (h.buffMult || 2) : 1;
  const dmg = Math.round((weaponDamage(wid) + (STATE.dmgBonus || 0)) * levelMastery() * buff * 10) / 10;
  d.shots.push({ kind, x: h.fx + Math.cos(ang) * 0.5, y: h.fy + Math.sin(ang) * 0.5, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg, born: now, life: 1300 });
  Audio2.sfx[kind === 'bazooka' ? 'bighit' : 'special']();
  h.swingUntil = now + 130;
}
function updateHeroShots(dt, t) {
  const d = DUNGEON; if (!d.shots || !d.shots.length) return;
  d.shots = d.shots.filter(s => {
    s.x += s.vx * dt; s.y += s.vy * dt;
    const gone = t - s.born > s.life || s.x < 2 || s.y < 2 || s.x > d.W - 2 || s.y > d.H - 2 || !isGroundTile(d.tiles, s.x, s.y, d.W, d.H);
    if (gone) { if (s.kind === 'bazooka') explodeBazooka(s); return false; }
    let hit = null;
    for (const e of d.enemies) { if (!e.dead && dist(s.x, s.y, e.fx, e.fy) < (e.r || 0.4) + 0.45) { hit = e; break; } }
    if (!hit && d.boss && !d.boss.dead && dist(s.x, s.y, d.boss.fx, d.boss.fy) < (d.boss.r || 0.9) + 0.5) hit = d.boss;
    if (hit) {
      if (s.kind === 'bazooka') { s.x = hit.fx; s.y = hit.fy; explodeBazooka(s); }
      else { damageEnemy(hit, s.dmg, false); d.fx.push({ kind: 'text', fx: s.x, fy: s.y, text: '✦', color: '#ffd23f', born: t, life: 220 }); }
      return false;
    }
    return true;
  });
}
function explodeBazooka(s) {
  const d = DUNGEON, R = 2.3;
  d.enemies.forEach(e => { if (!e.dead && dist(s.x, s.y, e.fx, e.fy) < R + (e.r || 0.4)) damageEnemy(e, s.dmg, false); });
  if (d.boss && !d.boss.dead && dist(s.x, s.y, d.boss.fx, d.boss.fy) < R + (d.boss.r || 0.9)) damageEnemy(d.boss, s.dmg, false);
  shake(); Audio2.sfx.bighit();
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; d.fx.push({ kind: 'text', fx: s.x + Math.cos(a) * 0.7, fy: s.y + Math.sin(a) * 0.7, text: '✦', color: i % 2 ? '#ff9a3a' : '#ffd23f', born: performance.now(), life: 420 }); }
  spawnFloatText(s.x, s.y, '💥 BOOM', '#ff7a2a');
}

/* weapon power helpers */
function poisonEnemy(e, now, strong) { e.poisonUntil = now + (strong ? 5200 : 3200); e.poisonNext = now + 400; e.poisonDmg = strong ? 4 : 2; }
function stunEnemy(e, now) { e.stunUntil = now + 950; e.attackReadyAt = Math.max(e.attackReadyAt || 0, now + 1300); }
function tickPoison(e, t) {
  if (!e.poisonUntil || t >= e.poisonUntil) return;
  if (t >= (e.poisonNext || 0)) {
    e.poisonNext = t + 400;
    if (!e.dead) { damageEnemy(e, e.poisonDmg || 2); spawnFloatText(e.fx, e.fy - 0.2, '-' + (e.poisonDmg || 2), '#57cc66'); }
  }
}

function heroJump() {
  const d = DUNGEON; if (!d || d.over) return;
  const now = performance.now(), h = d.hero;
  if (now < h.jumpReadyAt) return;
  h.jumpUntil = now + JUMP_DUR;
  h.jumpReadyAt = now + JUMP_DUR + 140;
  Audio2.sfx.dodge();
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
  const h = d.hero;
  // Any owned heal item (shop food OR brewed potions), least-wasteful first: the
  // smallest heal that still tops you off, else the biggest you have.
  const owned = Object.keys(STATE.items).filter(i => (STATE.items[i] || 0) > 0 && ITEMS[i] && ITEMS[i].type === 'heal');
  if (!owned.length) { banner('No potions or food!', 700); return; }
  owned.sort((a, b) => ITEMS[a].heal - ITEMS[b].heal);
  const missing = h.maxhp - h.hp;
  const id = owned.find(i => ITEMS[i].heal >= missing) || owned[owned.length - 1];
  const it = ITEMS[id];
  h.hp = Math.min(h.maxhp, h.hp + it.heal);
  STATE.items[id]--; if (STATE.items[id] <= 0) delete STATE.items[id];
  Audio2.sfx.heal();
  spawnFloatText(h.fx, h.fy, '+' + it.heal + '❤', '#57cc66');
  updateDungeonHUD();
}

/* Use a specific consumable mid-crawl (from the potion tray or the pause menu):
   heals restore hearts; buff potions grant a timed damage boost. Returns true
   if the item was actually spent. */
function dungeonUseItem(id) {
  const d = DUNGEON; if (!d || d.over) return false;
  const h = d.hero, it = ITEMS[id];
  if (!it || (STATE.items[id] || 0) <= 0) return false;
  if (it.type === 'heal') {
    if (h.hp >= h.maxhp) { banner('Already at full hearts!', 800); return false; }
    h.hp = Math.min(h.maxhp, h.hp + it.heal);
    spawnFloatText(h.fx, h.fy, '+' + it.heal + '❤', '#57cc66'); Audio2.sfx.heal();
  } else if (it.type === 'buff') {
    h.buffMs = it.duration || 8000; h.buffMult = it.dmgMult || 2;
    spawnFloatText(h.fx, h.fy, '💪 ×' + h.buffMult, '#ffd23f'); Audio2.sfx.special();
    banner('💪 ' + it.name + ' — ' + h.buffMult + '× damage!', 1400);
  } else { banner("Can't use that here.", 800); return false; }   // cages are for the Arena
  STATE.items[id]--; if (STATE.items[id] <= 0) delete STATE.items[id];
  saveGame(); updateDungeonHUD();
  return true;
}

// The quick potion belt on the control pad: tap 🧪 to pop your potions, tap one
// to drink it without leaving the fight.
function usablePotionIds() {
  return Object.keys(STATE.items).filter(i => (STATE.items[i] || 0) > 0 && ITEMS[i] && (ITEMS[i].type === 'heal' || ITEMS[i].type === 'buff'));
}
function togglePotionTray() {
  const tray = document.getElementById('potion-tray'); if (!tray) return;
  if (!tray.classList.contains('hidden')) { tray.classList.add('hidden'); return; }
  renderPotionTray(); tray.classList.remove('hidden'); Audio2.sfx.click();
}
function renderPotionTray() {
  const tray = document.getElementById('potion-tray'); if (!tray) return;
  const ids = usablePotionIds();
  if (!ids.length) { tray.innerHTML = `<div class="pt-empty">No potions — brew some at the Brewery! 🧪</div>`; return; }
  tray.innerHTML = ids.map(id => {
    const it = ITEMS[id];
    const tag = it.type === 'heal' ? '+' + it.heal + '❤' : (it.dmgMult || 2) + '×💪';
    return `<button class="pt-item" data-use="${id}" title="${it.name}">
        <div class="pt-art">${itemSVG(it.art)}</div>
        <div class="pt-tag">${tag}</div>
        <div class="pt-qty">×${STATE.items[id]}</div>
      </button>`;
  }).join('');
  tray.querySelectorAll('.pt-item[data-use]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    dungeonUseItem(b.dataset.use);
    if (!usablePotionIds().length) tray.classList.add('hidden');
    else renderPotionTray();
  }));
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
function damageEnemy(e, dmg, back) {
  // the sandworm is armoured underground — it can only be hurt while reared up
  if (e.invuln) { spawnFloatText(e.fx, e.fy - 0.35, 'can\'t reach it!', '#9fb8d8'); return; }
  e.hp -= dmg;
  e.hurtUntil = performance.now() + 160;
  if (back) { e.backstabUntil = performance.now() + 260; spawnFloatText(e.fx, e.fy - 0.45, 'BACK STAB!', '#ffd23f'); Audio2.sfx.bighit(); }
  spawnFloatText(e.fx, e.fy - 0.2, '-' + dmg, back ? '#ffd23f' : (e.boss ? '#ffcf3f' : '#ff5c7a'));
  if (e.hp <= 0 && !e.dead) killEnemy(e);
}

function killEnemy(e) {
  const d = DUNGEON;
  e.dead = true;
  Audio2.sfx.bighit();
  if (e.boss) return winDungeon();
  d.kills++;
  earn(e.reward || 1);
  gainXp(e.elite ? 5 : 2);
  // drops: coins always (already earned); a heart is now a RARE treat, so every
  // hit really counts — elites sometimes drop one, ordinary foes almost never.
  if (e.elite) {
    spawnFloatText(e.fx, e.fy - 0.55, 'ELITE! +' + (e.reward || 1), '#ffd23f');
    Audio2.sfx.win();
    if (rand(d.kills * 3.7 + 2) < 0.35) d.drops.push({ fx: e.fx, fy: e.fy, kind: 'heart', born: performance.now() });
  } else if (rand(d.kills * 5.3) < 0.05) {
    d.drops.push({ fx: e.fx, fy: e.fy, kind: 'heart', born: performance.now() });
  }
  // brewing ingredients: elites always drop one, ordinary foes ~30% of the time
  if (e.elite || rand(d.kills * 7.1 + 3) < 0.3) {
    const pool = ['herb', 'herb', 'mushroom', 'mushroom', 'ember', 'crystal', 'essence'];
    const ing = pool[Math.floor(rand(d.kills * 2.9 + 5) * pool.length)];
    d.drops.push({ fx: e.fx + 0.35, fy: e.fy - 0.2, kind: 'ingredient', ing, born: performance.now() });
  }
  spawnPuff(e.fx, e.fy);
  updateDungeonHUD();
  // boss is triggered by reaching the end of the path (see updateDungeon), not kills
}

function summonBoss() {
  const d = DUNGEON;
  const bd = BOSSES[d.theme.boss];
  d.bossIntro = true;
  d.bossId = d.theme.boss;
  banner(bd.name.toUpperCase() + ' APPROACHES...', 2200);
  Audio2.playMusic('boss');
  Audio2.sfx.lose(); // ominous
  setTimeout(() => {
    if (!DUNGEON) return;
    // Spawn on the trail a little ahead of the hero so it looms in on-path.
    const h = d.hero;
    const pi = nearestSampleIndex(h.fx, h.fy);
    const bs = d.path.samples[Math.min(d.path.samples.length - 1, pi + 10)];
    const hp = Math.round(bd.hearts * 24 * bossActMul() * (1 + regionTier(d.regionId) * 0.08));   // later-act wardens are tougher; all bosses climb the tier curve
    d.boss = {
      boss: true, fighter: bd, art: bd.art, palette: bd.palette,
      fx: bs.x, fy: bs.y, r: 0.9, scale: 2.1,
      hp, maxhp: hp, attack: bd.attack, reward: bd.reward,
      speed: 1.5, facing: -1, faceFlipReadyAt: 0, attackReadyAt: 0, windUntil: 0, hurtUntil: 0, name: bd.name,
    };
    // The Devourer lineage are burrowing worms with a rhythmic dive-and-strike
    // pattern; they can only be hurt in their brief "reared up" exposed window.
    if (bd.id === 'dune_worm' || bd.id === 'magma_worm' || bd.id === 'plasma_leviathan') { d.boss.worm = true; d.boss.state = 'exposed'; d.boss.invuln = false; d.boss.phaseUntil = 0; d.boss.scale = bd.id === 'dune_worm' ? 2.6 : 2.9; }
    // Quicksilver is the fastest thing in the solar system — a liquid-metal
    // blur that runs the hero down. Outmaneuvering it is the whole fight.
    if (bd.id === 'quicksilver') { d.boss.scale = 1.9; d.boss.speed = 3.3; d.boss.quicksilver = true; }
    const bar = document.getElementById('boss-bar');
    bar.querySelector('.boss-name').textContent = bd.name.toUpperCase();
    bar.classList.remove('hidden');
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
    const pool = d.theme.enemies;
    const id = pool[Math.floor(rand(d.spawned * 9.1 + tries) * pool.length)];
    d.enemies.push(makeDungeonEnemy(id, fx, fy, d.spawned + tries));
    d.spawned++;
    return true;
  }
  return false;
}

/* A checkpoint GATE: dump a whole horde of enemies around the checkpoint at once
   (bypassing the normal trickle cap) so each gate is an intense stand-and-fight
   gauntlet. Later gates are bigger; hard regions pile on even more. */
function spawnGauntlet(cp) {
  const d = DUNGEON;
  const n = (d.hard ? 9 : 6) + cp.idx * 2;
  let placed = 0;
  for (let k = 0; k < n; k++) {
    for (let tries = 0; tries < 26; tries++) {
      const ang = rand(cp.idx * 13.7 + k * 2.9 + tries) * Math.PI * 2;
      const rr = 2.4 + rand(cp.idx + k + tries * 1.3) * 3.6;
      const fx = clamp(cp.x + Math.cos(ang) * rr, 3.5, d.W - 3.5);
      const fy = clamp(cp.y + Math.sin(ang) * rr, 3.5, d.H - 3.5);
      if (d.tiles[Math.floor(fy)][Math.floor(fx)] !== 'ground') continue;
      if (dist(fx, fy, d.hero.fx, d.hero.fy) < 1.7) continue;   // never spawn on top of the hero
      const pool = d.theme.enemies;
      const id = pool[Math.floor(rand(cp.idx * 7.1 + k * 3.3 + tries) * pool.length)];
      const e = makeDungeonEnemy(id, fx, fy, d.spawned + k * 2 + tries);
      e.gate = true;
      d.enemies.push(e); d.spawned++; placed++;
      break;
    }
  }
  if (placed) Audio2.sfx.crowd();
}

/* Build a swarm enemy from a roster id, scaling its card stats for melee.
   On "hard" themes enemies are tougher and keep getting tougher the further
   along you are (by kill count). */
function makeDungeonEnemy(id, fx, fy, seed) {
  const d = DUNGEON;
  const f = ENEMIES[id] || ENEMIES.zombie;
  // difficulty multiplier: base 1.0, or ramps 1.35 -> ~2.0 as you progress
  const ramp = d.hard ? 1.35 + Math.min(0.65, (d.progress || 0) * 0.65) : 1;
  const dmgMul = d.theme.enemyDmgMul || 1;                           // Desolate Dunes = double-power foes
  const actHpMul = currentAct() === 3 ? 1.7 : currentAct() === 2 ? 1.5 : 1;   // later-act foes have markedly more HP
  const actDmgMul = currentAct() === 3 ? 2.2 : currentAct() === 2 ? 2 : 1;    // ...and hit far harder
  const tier = regionTier(d.regionId);                               // the journey's difficulty curve
  const tierHp = 1 + tier * 0.12, tierDmg = 1 + tier * 0.07, tierLoot = 1 + tier * 0.10;
  let hp = Math.max(6, Math.round(f.hearts * 8.5 * ramp * (dmgMul > 1 ? 1.2 : 1) * actHpMul * tierHp));   // tougher to cut down
  let speed = (f.hearts < 2 ? 2.5 : f.hearts < 3 ? 2.0 : 1.5) * (d.hard ? 1.08 : 1);
  let attack = f.attack, reward = Math.max(1, Math.round((f.reward || 1) * tierLoot)), r = 0.4;
  let contact = (f.attack >= 3 ? 0.95 : 0.65) * (d.hard ? 1.4 : 1) * dmgMul * actDmgMul * tierDmg;  // heavier hitters do more; Dunes foes hit twice as hard
  // Elite (Minecraft-Dungeons "enchanted") — an occasional tougher, glowing
  // variant worth a lot more loot. Never on the opening spawns.
  const elite = (d.spawned > 2) && rand(seed * 3.7 + 11) < (d.hard ? 0.15 : 0.09);
  if (elite) { hp = Math.round(hp * 1.9); attack += 1; contact *= 1.25; reward = reward * 4 + 6; r = 0.5; speed *= 1.05; }
  return {
    fighter: f, art: f.art, palette: f.palette,
    fx, fy, r,
    hp, maxhp: hp, speed, elite,
    attack, reward, contact,
    facing: -1, faceFlipReadyAt: 0, attackReadyAt: 0, windUntil: 0, hurtUntil: 0, animT: rand(seed),
  };
}

/* ============================================================
   MAIN LOOP
   ============================================================ */
function dungeonLoop(t) {
  const d = DUNGEON;
  if (!d) return;
  const dt = Math.min(0.05, (t - d.lastT) / 1000);
  d.lastT = t;
  if (!d.over && !d.paused) updateDungeon(dt, t);
  renderDungeon();
  d.raf = requestAnimationFrame(dungeonLoop);
}

function updateDungeon(dt, t) {
  const d = DUNGEON, h = d.hero;

  // Potion buff timer runs on GAME time (so pausing to sip one doesn't waste it)
  if (h.buffMs > 0) { h.buffMs -= dt * 1000; if (h.buffMs <= 0) { h.buffMs = 0; banner('Strength fades…', 900); } }

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
  // FLIGHT (Wings of Icarus): hold Jump to hover, draining flight fuel; refills
  // on the ground. You stay airborne (clearing floor hazards) while you fly.
  const hasWings = hasArtifact('wings');
  const jumpHeld = !!(d.keys[' '] || d.jumpBtnHeld);
  if (h.flyFuel === undefined) h.flyFuel = 1;
  if (hasWings && jumpHeld && h.flyFuel > 0 && (t < h.jumpUntil || h.flying)) {
    h.flying = true; h.jumpUntil = t + 250;                 // keep 'airborne' for hazard skips
    h.flyFuel = Math.max(0, h.flyFuel - dt / 3.2);          // ~3.2s of continuous flight
  } else {
    h.flying = false;
    if ((h.jumpZ || 0) < 4 && t >= h.jumpUntil) h.flyFuel = Math.min(1, h.flyFuel + dt / 4.5);
  }
  // jump arc (a hop that clears floor traps); flight eases up to a hover height
  const jumping = t < h.jumpUntil;
  if (h.flying) h.jumpZ = (h.jumpZ || 0) + (52 - (h.jumpZ || 0)) * Math.min(1, 9 * dt);
  else if (jumping) h.jumpZ = Math.sin((1 - (h.jumpUntil - t) / JUMP_DUR) * Math.PI) * 46;
  else if ((h.jumpZ || 0) > 0.6) h.jumpZ = Math.max(0, h.jumpZ - dt * 150);   // glide down after flight
  else h.jumpZ = 0;
  // rooted by a grab or trap door => can't move
  const rooted = t < h.rootedUntil;

  // tide rises and falls on beach levels; you swim when submerged (a jump lifts you out)
  d.tide = d.theme.tide ? (0.5 + 0.5 * Math.sin(t / 4200)) : 0;
  const submerged = d.beach && isSubmerged(h.fx, h.fy) && h.jumpZ < 18;
  h.submerged = submerged;

  // floor hazards: quicksand, poison pools, slippery ice, lava, spikes, trap doors, waves
  let inQuick = false, inPoison = false, inIce = false, inLava = false, quickPull = null;
  if (d.traps && !jumping) {
    for (const tr of d.traps) {
      const dd = dist(tr.x, tr.y, h.fx, h.fy);
      if (tr.kind === 'quicksand' && dd < (tr.strong ? 1.4 : 1.15)) { inQuick = true; if (tr.strong) quickPull = tr; }
      if (tr.kind === 'poison_pool' && dd < 1.2) inPoison = true;
      if (tr.kind === 'ice' && dd < 1.3) inIce = true;
      if (tr.kind === 'lava' && dd < 1.0) inLava = true;
      if (tr.kind === 'spikes') {
        const extended = ((t / 1000 + tr.phase) % 1.8) < 0.7;     // spikes pop up ~0.7s each cycle
        if (extended && dd < 0.85 && t > (h.spikeHurtAt || 0)) {
          h.spikeHurtAt = t + 800; hurtHero(0.5); shake();
          spawnFloatText(h.fx, h.fy, 'SPIKES!', '#ff5c7a');
        }
      }
      if (tr.kind === 'trapdoor' && !tr.sprung && dd < 0.9) {
        tr.sprung = true; tr.sprungAt = t; h.rootedUntil = t + 650; shake();
        banner('TRAP DOOR!', 700); hurtHero(1);
      }
    }
  }
  // rolling waves shove you landward + splash (jump, or reach deep water, to avoid)
  if (d.waves && !jumping && !submerged) for (const wv of d.waves) {
    const cyc = (t / 1000 + wv.phase) % 3.2;
    if (cyc < 0.5 && dist(wv.x, wv.y, h.fx, h.fy) < 2.2 && t > (h.waveHitAt || 0)) {
      h.waveHitAt = t + 1100; knockbackHeroFrom(wv.x, wv.y, 1.1); shake();
      banner('WAVE!', 500); spawnFloatText(h.fx, h.fy, 'splash!', '#bfe9ff'); hurtHero(0.5);
      if (d.over) return;
    }
  }
  // sucking quicksand: dragged toward the pit, pulled under, hurts more the deeper
  if (quickPull && !jumping) {
    const dx = quickPull.x - h.fx, dy = quickPull.y - h.fy, m = Math.hypot(dx, dy) || 1;
    moveEntity(h, dx / m * 1.1 * dt, dy / m * 1.1 * dt);
    h.sinkLevel = Math.min(1, (h.sinkLevel || 0) + dt * 0.55);
  } else h.sinkLevel = Math.max(0, (h.sinkLevel || 0) - dt * 1.6);
  if (inQuick) {
    h.sinking = true;
    const interval = quickPull ? (720 - h.sinkLevel * 320) : 800;
    const dmg = quickPull ? (0.5 + h.sinkLevel * 0.5) : 0.5;
    if (t > (h.quickDmgAt || 0)) {
      h.quickDmgAt = t + interval; h.hurtUntil = t + 200;
      spawnFloatText(h.fx, h.fy, quickPull ? 'sinking!' : '-½ sink', '#caa15a');
      hurtHero(dmg); if (d.over) return;
    }
  } else h.sinking = false;
  // poison pools tick damage over time — unless you've earned the Plague Ward
  if (inPoison && !hasArtifact('plague_ward')) {
    if (t > (h.poisonDmgAt || 0)) {
      h.poisonDmgAt = t + 700; h.hp = Math.max(0, h.hp - 0.5); h.hurtUntil = t + 200;
      Audio2.sfx.hurt(); spawnFloatText(h.fx, h.fy, '-½ ☠', '#8ff0a0'); updateDungeonHUD();
      if (h.hp <= 0) return loseDungeon();
    }
  }
  // lava rivers: standing in molten rock sears you FAST — jump across, don't wade
  if (inLava) {
    if (t > (h.lavaDmgAt || 0)) {
      h.lavaDmgAt = t + 380; h.hurtUntil = t + 200; shake();
      spawnFloatText(h.fx, h.fy, '🔥 -1', '#ff6a2a'); Audio2.sfx.hurt();
      hurtHero(1); if (d.over) return;
    }
  }
  // secret portal: touch it and you're PULLED DOWN into an underground corridor —
  // a long, dense gauntlet you must cut through to reach the Key to the Sandcastle
  if (d.secret && !d.secret.found && submerged && dist(d.secret.x, d.secret.y, h.fx, h.fy) < 1.5) {
    d.secret.found = true;
    banner('⬇️ You are pulled into an underground corridor — cut through the gauntlet to the Key!', 3200);
    Audio2.sfx.lose();   // ominous
    h.fx = d.secret.x; h.fy = d.secret.y;                 // transported to the corridor mouth
    h.hp = Math.min(h.maxhp, h.hp + 1);                   // a breath before the onslaught
    // pack the whole corridor with a tough, layered horde (a couple per station)
    if (d.corridor) d.corridor.spawns.forEach((sp, i) => {
      const pool = d.theme.enemies;
      for (let j = 0; j < 2; j++) {
        const id = pool[Math.floor(rand(sp.x * 3.1 + i * 7.7 + j * 2.9) * pool.length)];
        const ox = (rand(i * 4.1 + j) - 0.5) * 1.1, oy = (rand(i * 2.7 + j * 1.9) - 0.5) * 1.1;
        const e = makeDungeonEnemy(id, sp.x + ox, sp.y + oy, 500 + i * 5 + j);
        e.hp = e.maxhp = Math.round(e.maxhp * 1.5);        // an underground gauntlet is brutal
        e.gate = true;
        d.enemies.push(e);
      }
    });
    updateDungeonHUD();
  }
  // reach the Key at the far end of the corridor to unlock the hidden passage
  // region (the Sandcastle in Act 1; the same secret slot — Pompeii — in Act 2)
  if (d.key && !d.key.taken && d.secret && d.secret.found && dist(d.key.x, d.key.y, h.fx, h.fy) < 1.3) {
    d.key.taken = true;
    const inAct2 = currentAct() === 2;
    const destName = inAct2 ? (typeof ACT2_THEMES !== 'undefined' && ACT2_THEMES.sandcastle ? ACT2_THEMES.sandcastle.name : 'a lost age') : 'the Sandcastle';
    const canOpen = !inAct2 || (typeof act2Built === 'function' && act2Built('sandcastle'));
    if (canOpen && typeof unlockRegion === 'function') unlockRegion('sandcastle');
    banner(canOpen ? ('🗝️ You found the hidden passage to ' + destName + '!') : '🗝️ A sealed passage... its age has not yet come.', 3000);
    Audio2.sfx.win(); spawnFloatText(h.fx, h.fy, '🗝️ Secret Key!', '#ffd23f');
  }

  const dodging = t < h.dodgeUntil;
  let spd = (dodging ? 8.5 : (4.2 + (STATE.speedBonus || 0)));   // + Swift modifier
  if (inQuick) spd *= (quickPull ? Math.max(0.12, 0.32 - h.sinkLevel * 0.2) : 0.3);
  if (submerged) spd *= 0.62;                                    // swimming is slower
  h.moving = !!(mvx || mvy) && !rooted;
  const tvx = h.moving ? mvx * spd : 0, tvy = h.moving ? mvy * spd : 0;
  if (inIce && !rooted && !jumping) {
    // slippery ice: low grip, so you keep sliding and can't stop or turn on a dime
    const grip = Math.min(1, 2.6 * dt);
    h.iceVX = (h.iceVX || 0) + (tvx - (h.iceVX || 0)) * grip;
    h.iceVY = (h.iceVY || 0) + (tvy - (h.iceVY || 0)) * grip;
    if (Math.abs(h.iceVX) > 0.02 || Math.abs(h.iceVY) > 0.02) { moveEntity(h, h.iceVX * dt, h.iceVY * dt); h.onIce = true; }
  } else {
    h.iceVX = tvx; h.iceVY = tvy; h.onIce = false;      // solid ground: fully responsive
    if (h.moving) moveEntity(h, tvx * dt, tvy * dt);
  }
  if (h.moving) {
    h.animT += dt * 10;
    // face travel direction when using keyboard/joystick and not aiming with mouse
    if (d.joy.active || d.keys['w'] || d.keys['a'] || d.keys['s'] || d.keys['d'] ||
        d.keys['arrowup'] || d.keys['arrowleft'] || d.keys['arrowdown'] || d.keys['arrowright']) {
      h.faceAngle = Math.atan2(mvy, mvx);
      h.facing = Math.cos(h.faceAngle) >= 0 ? 1 : -1;
    }
  }

  /* --- Desolate Dunes: wind, gusts, tornadoes, and being blown off the edge --- */
  if (d.dunes && t >= (d.introUntil || 0)) {   // the storm holds its breath while you read
    const t2 = t / 1000;
    const ang = t2 * 0.35 + Math.sin(t2 * 0.13) * 1.5;             // wind slowly veers
    const gusting = (t2 % 7) < 1.4;                                // a hard gust ~1.4s every 7s
    if (gusting && !d.gustOn) { d.gustOn = true; banner('🌬️ GUST INCOMING — hold your ground!', 1000); shake(); }
    if (!gusting) d.gustOn = false;
    const strength = 0.85 + (gusting ? 3.6 : 0) + Math.sin(t2 * 0.9) * 0.4;
    d.wind = { x: Math.cos(ang) * strength, y: Math.sin(ang) * strength, gust: gusting };
    if (!jumping) {
      const brace = dodging ? 0.25 : 1;                            // a dodge-roll braces against the wind
      pushHeroRaw(d.wind.x * brace * dt, d.wind.y * brace * dt);
    }
    // roaming tornadoes: they swirl you around and fling you toward the void
    d.tornadoes.forEach(tor => {
      tor.spin = (tor.spin || 0) + dt * 11;
      tor.x = clamp(tor.x + tor.vx * 1.7 * dt, 3, d.W - 3);
      tor.y = clamp(tor.y + tor.vy * 1.7 * dt, 3, d.H - 3);
      if (!isGroundTile(d.tiles, tor.x, tor.y, d.W, d.H)) {         // bounce back onto the platform
        tor.vx = -tor.vx; tor.vy = -tor.vy;
        tor.x = clamp(tor.x + tor.vx * 0.8, 3, d.W - 3); tor.y = clamp(tor.y + tor.vy * 0.8, 3, d.H - 3);
      }
      if (!jumping && dist(tor.x, tor.y, h.fx, h.fy) < 1.8) {
        const dx = h.fx - tor.x, dy = h.fy - tor.y, m = Math.hypot(dx, dy) || 1;
        pushHeroRaw((-dy / m * 3.4 + dx / m * 0.9) * dt, (dx / m * 3.4 + dy / m * 0.9) * dt);   // swirl + eject
        if (t > (h.tornadoHitAt || 0)) { h.tornadoHitAt = t + 650; spawnFloatText(h.fx, h.fy, '🌪️', '#e8d8a0'); hurtHero(0.5); if (d.over) return; }
      }
    });
    // off the platform (and not mid-jump) => you fall
    if (!jumping && !submerged && !isGroundTile(d.tiles, h.fx, h.fy, d.W, d.H)) { heroFellOff(); if (d.over) return; }
  }

  /* --- Pompeii: Vesuvius rains telegraphed lava bombs that erupt underfoot --- */
  if (d.volcano && t >= (d.introUntil || 0)) { updateVolcano(dt, t); if (d.over) return; }

  /* --- the Backstabber Omega's one-shot projectiles + telegraphed strikes --- */
  if ((d.bossShots && d.bossShots.length) || (d.strikes && d.strikes.length)) { updateOmegaHazards(dt, t); if (d.over) return; }

  // grabber trees: root the hero when close (unless jumping)
  if (d.grabbers) d.grabbers.forEach(g => {
    if (g.dead) return;
    if (!jumping && t > g.cooldownUntil && t > h.rootedUntil && dist(g.x, g.y, h.fx, h.fy) < 1.7) {
      g.grabUntil = t + 850; g.cooldownUntil = t + 2600;
      h.rootedUntil = t + 850; banner('GRABBED!', 700); hurtHero(0.5);
    }
  });

  /* --- attack while moving: holding attack keeps swinging (cooldown-gated) --- */
  if (d.attackHeld || d.mouse.down || d.keys['k']) heroAttack();

  /* --- Toxic Temple: chamber-clear progression (gates, artifacts, boss) --- */
  if (d.chamberMode) updateChambers(dt, t);

  /* --- checkpoint GATES along the trail: reaching one heals & pays a little,
     then throws a horde of enemies at you to fight through before you press on --- */
  if (!d.chamberMode) d.checkpoints.forEach(cp => {
    if (!cp.reached && dist(cp.x, cp.y, h.fx, h.fy) < 2.6) {
      cp.reached = true;
      earn(10);
      banner('⚔️ GATE ' + cp.idx + ' / ' + d.checkpoints.length + ' — fight through the horde!', 1900);
      pauseMobs(2000);   // the horde holds until the banner clears
      Audio2.sfx.coin();
      spawnFloatText(h.fx, h.fy, '+10 💰', '#ffcf3f');
      h.hp = Math.min(h.maxhp, h.hp + 1);   // small reward heal before the fight
      spawnGauntlet(cp);
      updateDungeonHUD();
    }
  });

  /* --- geographic progression: reaching the end summons the boss --- */
  if (!d.chamberMode) {
    const pi = nearestSampleIndex(h.fx, h.fy);
    d.progress = clamp(d.path.samples[pi].cum / d.path.length, 0, 1);
    if (!d.bossIntro && !d.boss && d.progress >= 0.955) summonBoss();
  }

  /* --- keep the swarm populated (path mode only; chambers spawn fixed waves) --- */
  // difficulty scales with geographic progress (harder the further you go)
  const capMax = (d.hard ? 13 : DUN.MAX_ENEMIES) + Math.floor(regionTier(d.regionId) / 3);   // later regions field bigger packs
  const swarmCap = Math.min(capMax, (d.hard ? 5 : 3) + Math.floor(regionTier(d.regionId) / 4) + Math.round((d.progress || 0) * (d.hard ? 8 : 5)));
  const spawnGap = Math.max(d.hard ? 0.34 : 0.55, (d.hard ? 0.95 : 1.15) - (d.progress || 0) * 0.6);
  if (!d.chamberMode && !d.bossIntro && t >= (d.introUntil || 0) && d.enemies.filter(e => !e.dead).length < swarmCap) {
    d.spawnTimer -= dt;
    if (d.spawnTimer <= 0) { spawnEnemy(); d.spawnTimer = spawnGap; }
  }

  /* --- enemies --- */
  d.enemies.forEach(e => {
    if (e.dead) return;
    tickPoison(e, t);
    if (e.dead) return;
    e.animT = (e.animT || 0) + dt * 8;
    if (t < (d.introUntil || 0)) return;                // mobs hold still until the intro is read
    if (e.stunUntil && t < e.stunUntil) return;         // stunned: can't move or attack
    const dd = dist(e.fx, e.fy, h.fx, h.fy);
    // Turn to face the hero, but not instantly — this brief lag is the window
    // to slip behind and BACK STAB (the game's namesake).
    const wantFace = h.fx >= e.fx ? 1 : -1;
    if (wantFace !== e.facing && t >= (e.faceFlipReadyAt || 0)) { e.facing = wantFace; e.faceFlipReadyAt = t + 320; }
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
  if (d.boss && !d.boss.dead && t >= (d.introUntil || 0)) {
    const b = d.boss;
    tickPoison(b, t);
    if (b.worm) { updateWormBoss(b, h, dt, t); if (d.over) return; }
    else if (b.backstabber) { updateBackstabberBoss(b, h, dt, t); if (d.over) return; }
    else {
      const dd = dist(b.fx, b.fy, h.fx, h.fy);
      // bosses turn slowly — circle behind them for a big BACK STAB
      const wantBFace = h.fx >= b.fx ? 1 : -1;
      if (wantBFace !== b.facing && t >= (b.faceFlipReadyAt || 0)) { b.facing = wantBFace; b.faceFlipReadyAt = t + 520; }
      if (b.stunUntil && t < b.stunUntil) { /* stunned */ }
      else if (t < b.windUntil) {}
      else if (dd > 1.5) { const ux = (h.fx - b.fx) / dd, uy = (h.fy - b.fy) / dd; moveEntity(b, ux * b.speed * dt, uy * b.speed * dt); }
      else if (t >= b.attackReadyAt) {
        b.windUntil = t + 520; b.attackReadyAt = t + 1700;
        banner('SLAM!', 500);
        setTimeout(() => bossSlam(b), 520);
      }
    }
  }

  /* --- drops (hearts) pickup --- */
  d.drops = d.drops.filter(dr => {
    if (dist(dr.fx, dr.fy, h.fx, h.fy) < 0.8) {
      if (dr.kind === 'ingredient') {
        STATE.ingredients = STATE.ingredients || {};
        STATE.ingredients[dr.ing] = (STATE.ingredients[dr.ing] || 0) + 1;
        const ing = (typeof INGREDIENTS !== 'undefined' && INGREDIENTS[dr.ing]) || null;
        Audio2.sfx.coin(); spawnFloatText(h.fx, h.fy, (ing ? ing.icon : '✨') + ' +1', ing ? ing.color : '#fff');
        saveGame();
        return false;
      }
      h.hp = Math.min(h.maxhp, h.hp + 0.5);
      Audio2.sfx.heal(); spawnFloatText(h.fx, h.fy, '+½❤', '#57cc66'); updateDungeonHUD();
      return false;
    }
    return t - dr.born < 12000;
  });

  /* --- pet companion: heels behind you and bites nearby foes --- */
  if (d.pet) { updatePet(dt, t); if (d.over) return; }

  /* --- hero bullets / rockets --- */
  updateHeroShots(dt, t);

  /* --- fx aging --- */
  d.fx = d.fx.filter(f => t - f.born < f.life);

  /* --- camera follows hero --- */
  const s = isoToScreen(h.fx, h.fy);
  d.cam.x = s.x; d.cam.y = s.y;
}

function enemyStrikeHero(e) {
  const d = DUNGEON; if (!d || d.over || d.paused || e.dead) return;
  const h = d.hero, t = performance.now();
  if (dist(e.fx, e.fy, h.fx, h.fy) > 1.15) return;         // moved away in time
  if (t < h.dodgeUntil) { spawnFloatText(h.fx, h.fy, 'dodge', '#8ff0a0'); return; }
  if (t < h.hurtInvulnUntil) return;                       // brief mercy i-frames
  hurtHero(e.contact || 0.5);
}

// Act 2 wardens are resurrected and monstrous — every hit lands for a full
// two hearts minimum (Act 1 bosses keep their tuned values).
function bossDmg(base) { return currentAct() === 3 ? Math.max(2.5, base * 1.2) : currentAct() === 2 ? Math.max(2, base) : base; }
// Boss HP multiplier per act: rebuilt wardens keep getting tougher.
function bossActMul() { return currentAct() === 3 ? 1.75 : currentAct() === 2 ? 1.4 : 1; }

function bossSlam(b) {
  const d = DUNGEON; if (!d || d.over || d.paused || b.dead) return;
  const h = d.hero, t = performance.now();
  shake();
  if (dist(b.fx, b.fy, h.fx, h.fy) > 2.2) return;
  if (t < h.dodgeUntil) { spawnFloatText(h.fx, h.fy, 'dodge!', '#8ff0a0'); return; }
  if (t < h.hurtInvulnUntil) return;
  hurtHero(bossDmg(1.5));
}

/* The Dune Devourer's rhythm: rear up EXPOSED (your only window to hurt it) →
   BURROW toward you (invulnerable) → ERUPT behind you and telegraph → STRIKE.
   The beat is fixed, so an attentive player can time a jump/dodge on the bite;
   miss it and two chomps will finish you. It only takes damage while exposed, so
   you need a hard-hitting weapon to fell it before its rhythm wears you down. */
function updateWormBoss(b, h, dt, t) {
  const d = DUNGEON;
  b.animT = (b.animT || 0) + dt * 6;
  b.facing = h.fx >= b.fx ? 1 : -1;
  if (!b.phaseUntil) { b.state = 'exposed'; b.invuln = false; b.phaseUntil = t + 1700; }
  if (t < b.phaseUntil) {
    if (b.state === 'burrow') {   // dive underground, chase the hero's position
      const dx = h.fx - b.fx, dy = h.fy - b.fy, m = Math.hypot(dx, dy) || 1, sp = 7 * dt;
      b.fx += dx / m * Math.min(m, sp); b.fy += dy / m * Math.min(m, sp);
    }
    return;
  }
  if (b.state === 'exposed') {
    b.state = 'burrow'; b.invuln = true; b.phaseUntil = t + 1900;
    banner('🕳️ The Devourer dives...', 900); Audio2.sfx.hit();
  } else if (b.state === 'burrow') {
    const a = h.faceAngle || 0;                                   // erupt right behind the hero
    b.fx = clamp(h.fx - Math.cos(a) * 1.9, 3, d.W - 3);
    b.fy = clamp(h.fy - Math.sin(a) * 1.9, 3, d.H - 3);
    b.state = 'surface'; b.phaseUntil = t + 850;
    banner('⚠️ It rises behind you — jump or dodge!', 850); shake(); Audio2.sfx.lose();
  } else if (b.state === 'surface') {
    b.state = 'strike';                                           // the bite lands on the beat
    const jumping = t < h.jumpUntil, dodging = t < h.dodgeUntil;
    if (dist(b.fx, b.fy, h.fx, h.fy) < 2.6 && !jumping && !dodging && t >= h.hurtInvulnUntil) {
      spawnFloatText(h.fx, h.fy, 'CHOMP! -2½❤', '#ff5c7a'); shake(); Audio2.sfx.bighit();
      hurtHero(bossDmg(2.5)); if (d.over) return;
    } else spawnFloatText(h.fx, h.fy, 'timed it!', '#8ff0a0');
    b.phaseUntil = t + 40;
  } else {   // strike -> exposed: your window to hit it hard
    b.state = 'exposed'; b.invuln = false; b.phaseUntil = t + 1700;
    banner('💥 It rears up — strike it NOW!', 800); Audio2.sfx.special();
  }
}

/* The Backstabber — the finale. Three phases, and his signature: he VANISHES
   into the dark, glides behind you, and strikes from your blind side. Watch for
   his glowing eyes, then turn and dodge/jump on the beat. Phase 2 splits off
   shadow clones; phase 3 he rages — faster vanishes, heavier backstabs. */
function updateBackstabberBoss(b, h, dt, t) {
  const d = DUNGEON;
  b.animT = (b.animT || 0) + dt * 6;
  const frac = b.hp / Math.max(1, b.maxhp);
  const phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
  if (phase !== b.phaseNum) { b.phaseNum = phase; onBackstabberPhase(b, h, t, phase); }
  if (b.omega) updateOmegaCasting(b, h, t);   // a thousand years of stolen one-shot powers
  const spd = 2.1 + phase * 0.45 + (b.prime ? 0.5 : 0);   // Prime is a blur
  if (!b.stateUntil) { b.state = 'chase'; b.stateUntil = t + 2400; b.vanished = false; b.invuln = false; }

  if (t < b.stateUntil) {
    if (b.state === 'chase') {
      b.facing = h.fx >= b.fx ? 1 : -1;
      const dd = dist(b.fx, b.fy, h.fx, h.fy) || 1;
      if (dd > 1.3) moveEntity(b, (h.fx - b.fx) / dd * spd * dt, (h.fy - b.fy) / dd * spd * dt);
      else if (t >= (b.slashAt || 0)) { b.slashAt = t + (b.prime ? 700 : 950); setTimeout(() => backstabberSlash(b), 200); }
    } else if (b.state === 'vanish') {                       // invisible, sliding behind the hero
      const a = h.faceAngle || 0;
      const tx = clamp(h.fx - Math.cos(a) * 1.5, 3, d.W - 3), ty = clamp(h.fy - Math.sin(a) * 1.5, 3, d.H - 3);
      b.fx += (tx - b.fx) * Math.min(1, 6 * dt); b.fy += (ty - b.fy) * Math.min(1, 6 * dt);
      b.facing = h.fx >= b.fx ? 1 : -1;
    }
    return;
  }
  if (b.state === 'chase') {
    b.state = 'vanish'; b.vanished = true; b.invuln = true; b.stateUntil = t + (1500 - phase * 260) - (b.prime ? 220 : 0);
    banner(b.prime ? '🌑 The Prime dissolves into the dark...' : '🌑 The Backstabber melts into shadow...', 850); Audio2.sfx.dodge();
  } else if (b.state === 'vanish') {
    b.state = 'reappear'; b.vanished = false; b.invuln = true; b.stateUntil = t + (620 - phase * 90) - (b.prime ? 110 : 0);
    shake(); Audio2.sfx.lose(); spawnFloatText(b.fx, b.fy - 0.7, '!!!', '#ff2d5a');
  } else if (b.state === 'reappear') {                       // the BACKSTAB lands on the beat
    const jumping = t < h.jumpUntil, dodging = t < h.dodgeUntil;
    const dmg = bossDmg(b.prime ? (phase >= 3 ? 3 : 2.5) : (phase >= 3 ? 2 : 1.5));
    if (dist(b.fx, b.fy, h.fx, h.fy) < 2.4 && !jumping && !dodging && t >= h.hurtInvulnUntil) {
      spawnFloatText(h.fx, h.fy, 'BACKSTAB! -' + dmg + '❤', '#ff2d5a'); shake(); Audio2.sfx.bighit();
      hurtHero(dmg); if (d.over) return;
    } else spawnFloatText(h.fx, h.fy, 'evaded!', '#8ff0a0');
    b.state = 'chase'; b.invuln = false; b.stateUntil = t + (2200 - phase * 450) - (b.prime ? 300 : 0);
  }
}
function onBackstabberPhase(b, h, t, phase) {
  const extra = b.prime ? 2 : 0;   // the Prime raises a bigger shadow pack
  if (phase === 2) { banner('🗡️ PHASE 2 — shadow clones!', 1800); for (let k = 0; k < 3 + extra; k++) spawnShadowClone(b, k); }
  else if (phase === 3) { banner(b.prime ? '💀 FINAL PHASE — the Prime is UNLEASHED!' : '🔥 PHASE 3 — the Backstabber is ENRAGED!', 2000); for (let k = 0; k < 2 + extra; k++) spawnShadowClone(b, k + 10); }
}
function backstabberSlash(b) {
  const d = DUNGEON; if (!d || d.over || d.paused || b.dead || b.vanished) return;
  const h = d.hero, t = performance.now();
  if (dist(b.fx, b.fy, h.fx, h.fy) > 1.9) return;
  if (t < h.dodgeUntil) { spawnFloatText(h.fx, h.fy, 'dodge!', '#8ff0a0'); return; }
  if (t < h.hurtInvulnUntil) return;
  hurtHero(bossDmg(1));
}

/* ============================================================
   THE BACKSTABBER OMEGA — stolen powers. Every ~5 seconds he unleashes one of
   four signature specials, each telegraphed and each an instant KILL if it
   lands: a fan of fireballs, an ice nova, lightning strikes from the torn sky,
   and a giant foot stomp that cracks the world. Jump or dodge on the beat.
   ============================================================ */
function updateOmegaCasting(b, h, t) {
  if (!b.nextSpecialAt) { b.nextSpecialAt = t + 4500; return; }
  if (b.vanished || t < b.nextSpecialAt) return;
  const order = ['fire', 'ice', 'lightning', 'stomp'];
  b.specialIdx = ((b.specialIdx === undefined ? -1 : b.specialIdx) + 1) % order.length;
  b.nextSpecialAt = t + 5600 - b.phaseNum * 700;    // he casts faster as he rages
  castOmegaSpecial(order[b.specialIdx], b, h, t);
}
function castOmegaSpecial(kind, b, h, t) {
  const d = DUNGEON;
  d.bossShots = d.bossShots || []; d.strikes = d.strikes || [];
  if (kind === 'fire') {
    banner('☄️ OMEGA FIREBALLS — one touch is DEATH! Jump or dodge!', 1400);
    const aim = Math.atan2(h.fy - b.fy, h.fx - b.fx);
    for (let i = 0; i < 9; i++) {
      const a = aim + (i - 4) * 0.28;
      d.bossShots.push({ x: b.fx, y: b.fy, vx: Math.cos(a) * 4.6, vy: Math.sin(a) * 4.6, kind: 'fire', born: t, life: 2600 });
    }
    Audio2.sfx.bighit(); shake();
  } else if (kind === 'ice') {
    banner('❄️ OMEGA ICE NOVA — a ring of death! Jump or dodge!', 1400);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      d.bossShots.push({ x: b.fx, y: b.fy, vx: Math.cos(a) * 3.4, vy: Math.sin(a) * 3.4, kind: 'ice', born: t, life: 3200 });
    }
    Audio2.sfx.special(); shake();
  } else if (kind === 'lightning') {
    banner('⚡ OMEGA LIGHTNING — MOVE! The marked ground is DEATH!', 1400);
    for (let i = 0; i < 4; i++) {
      const near = i < 2;   // two bolts hunt you, two scatter
      const a = rand(t * 0.003 + i * 7.7) * Math.PI * 2, rr = near ? rand(t * 0.001 + i) * 1.6 : 2.5 + rand(t * 0.002 + i) * 3.5;
      d.strikes.push({ x: clamp(h.fx + Math.cos(a) * rr, 3, d.W - 3), y: clamp(h.fy + Math.sin(a) * rr, 3, d.H - 3), at: t + 1000, r: 1.8, kind: 'bolt' });
    }
    Audio2.sfx.lose();
  } else {
    banner('🦶 OMEGA STOMP — get clear and JUMP!', 1400);
    d.strikes.push({ x: b.fx, y: b.fy, at: t + 1100, r: 3.6, kind: 'stomp' });
    Audio2.sfx.lose();
  }
}
/* Move his projectiles, land his strikes. Everything here is a ONE-HIT KILL —
   but every shot can be out-jumped, out-dodged, or simply out-run. */
function updateOmegaHazards(dt, t) {
  const d = DUNGEON, h = d.hero;
  const jumping = t < h.jumpUntil, dodging = t < h.dodgeUntil;
  if (d.bossShots && d.bossShots.length) {
    d.bossShots = d.bossShots.filter(s => {
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (t - s.born > s.life) return false;
      if (s.x < 2 || s.y < 2 || s.x > d.W - 2 || s.y > d.H - 2) return false;
      if (dist(s.x, s.y, h.fx, h.fy) < 0.62 + h.r) {
        if (jumping || dodging) { spawnFloatText(h.fx, h.fy, 'evaded!', '#8ff0a0'); return false; }
        if (t < h.hurtInvulnUntil) return false;
        spawnFloatText(h.fx, h.fy, (s.kind === 'fire' ? '☄️' : '❄️') + ' OBLITERATED!', '#ff2d5a');
        shake(); Audio2.sfx.bighit(); hurtHero(999);
        return false;
      }
      return true;
    });
  }
  if (d.strikes && d.strikes.length) {
    d.strikes = d.strikes.filter(s => {
      if (t < s.at) return true;             // still telegraphing
      if (!s.landed) {                       // the strike lands (resolve once)
        s.landed = true; s.until = t + 450;
        shake(); Audio2.sfx.bighit();
        const inside = dist(s.x, s.y, h.fx, h.fy) < s.r + h.r;
        const escaped = s.kind === 'stomp' ? jumping : (jumping || dodging);   // only a JUMP clears the ground-cracking stomp
        if (inside && !escaped && t >= h.hurtInvulnUntil) {
          spawnFloatText(h.fx, h.fy, (s.kind === 'bolt' ? '⚡' : '🦶') + ' OBLITERATED!', '#ff2d5a');
          hurtHero(999);
        } else if (inside) spawnFloatText(h.fx, h.fy, 'evaded!', '#8ff0a0');
      }
      return t < s.until;                    // keep briefly for the impact flash
    });
  }
}

function hurtHero(amount) {
  const d = DUNGEON, h = d.hero;
  amount *= (1 - (STATE.armorBonus || 0));   // Iron Skin modifier
  // The shield soaks up part of the hit and loses durability each time.
  const block = absorbWithShield();
  if (block > 0) { amount = amount * (1 - block); h.shieldFlash = performance.now() + 220; }
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
  if (d.tiles[Math.floor(fy)][Math.floor(fx)] !== 'ground') return false;
  // closed temple gates block their doorway until the chamber is cleared
  if (d.doors) for (const door of d.doors) {
    if (!door.open && Math.abs(fx - door.x) < door.hw && Math.abs(fy - door.y) < door.hh) return false;
  }
  return true;
}
// Is this point underwater right now? Deep zones are always water; tidal zones
// flood as the tide rises.
function isSubmerged(x, y) {
  const d = DUNGEON; if (!d.water || !d.water.length) return false;
  for (const w of d.water) {
    const effR = w.deep ? w.r : w.r * (0.28 + 0.72 * (d.tide || 0));
    if (dist(x, y, w.x, w.y) < effR) return true;
  }
  return false;
}
function knockbackHeroFrom(fx, fy, amt) {
  const h = DUNGEON.hero, dx = h.fx - fx, dy = h.fy - fy, m = Math.hypot(dx, dy) || 1;
  moveEntity(h, dx / m * amt, dy / m * amt);
}
// Move the hero WITHOUT the void-block — wind and tornadoes use this so they can
// shove you clean off the platform (clamped only to the map bounds).
function pushHeroRaw(dx, dy) {
  const d = DUNGEON, h = d.hero;
  h.fx = clamp(h.fx + dx, 0.5, d.W - 0.5);
  h.fy = clamp(h.fy + dy, 0.5, d.H - 0.5);
}
/* ============================================================
   PET (companion) — a captured creature that trots along and bites foes
   ============================================================ */
function makeDungeonPet(hero) {
  if (!STATE.activePet) return null;
  const f = (typeof getFighter === 'function') ? getFighter(STATE.activePet) : null;
  if (!f) return null;
  return { id: STATE.activePet, fighter: f, fx: hero.fx - 1, fy: hero.fy, facing: 1,
           attackReadyAt: 0, lungeUntil: 0, animT: 0, moving: false };
}
function updatePet(dt, t) {
  const d = DUNGEON, p = d.pet, h = d.hero; if (!p) return;
  p.animT = (p.animT || 0) + dt * 8;
  // find the nearest living foe within a short leash
  let target = null, best = 4.5;
  d.enemies.forEach(e => { if (e.dead || e.shadow) return; const dd = dist(p.fx, p.fy, e.fx, e.fy); if (dd < best) { best = dd; target = e; } });
  if (!target && d.boss && !d.boss.dead && !d.boss.invuln) { const dd = dist(p.fx, p.fy, d.boss.fx, d.boss.fy); if (dd < 4.5) target = d.boss; }
  const fighting = target && t >= (d.introUntil || 0);
  // goal: pounce the target, else heel just behind the hero
  const heelX = h.fx - Math.cos(h.faceAngle || 0) * 1.5, heelY = h.fy - Math.sin(h.faceAngle || 0) * 1.5;
  const gx = fighting ? target.fx : heelX, gy = fighting ? target.fy : heelY;
  const dx = gx - p.fx, dy = gy - p.fy, m = Math.hypot(dx, dy) || 1;
  const stop = fighting ? 0.85 : 0.25, sp = (fighting ? 4.6 : 3.6) * dt;
  if (m > stop) { p.fx += dx / m * Math.min(m, sp); p.fy += dy / m * Math.min(m, sp); p.facing = dx >= 0 ? 1 : -1; p.moving = true; }
  else p.moving = false;
  // bite on a cooldown when in range
  if (fighting && t >= p.attackReadyAt && dist(p.fx, p.fy, target.fx, target.fy) < 1.25) {
    p.attackReadyAt = t + 1150; p.lungeUntil = t + 200;
    const dmg = 3 + Math.round(p.fighter.attack || 2);
    damageEnemy(target, dmg, false);
    Audio2.sfx.hit(); spawnFloatText(p.fx, p.fy - 0.3, '🐾', '#ffd23f');
    if (d.over) return;
  }
}
function drawPet(ctx, p, ox, oy) {
  const s = isoToScreen(p.fx, p.fy), now = performance.now();
  const x = s.x + ox, y = s.y + oy;
  shadowOval(ctx, x, y, 13, 5);
  const lunge = now < (p.lungeUntil || 0) ? 5 : 0;
  const bob = (p.moving ? Math.sin(p.animT) * 2.4 : Math.sin(now / 480) * 1.2) + lunge;
  const img = getSprite(p.fighter.id, p.fighter, p.facing);
  if (img && img.complete && img.naturalWidth) ctx.drawImage(img, x - 21, y - 46 - bob, 42, 50);
  // a friendly little heart tag so pets read as allies, not foes
  ctx.fillStyle = '#57cc66'; ctx.font = '900 9px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('♥', x, y - 48 - bob); ctx.textAlign = 'left';
}

/* Where you come back after a fall or a knockout: the last checkpoint you
   crossed (path / beach levels), the current chamber (chamber levels), or the
   very start of the trail if you haven't reached a checkpoint yet. */
function respawnPoint() {
  const d = DUNGEON;
  if (d.chamberMode && d.chamberList && d.chamberList.length) {
    const c = d.chamberList[d.activeIndex >= 0 ? d.activeIndex : 0] || d.chamberList[0];
    if (c) return { x: c.cx, y: c.cy };
  }
  const reached = (d.checkpoints || []).filter(c => c.reached);
  if (reached.length) { const cp = reached[reached.length - 1]; return { x: cp.x, y: cp.y }; }
  const s = d.path.samples[0];
  return { x: s.x, y: s.y };
}

/* Put the hero back at the respawn point after a defeat. A knockout (cost 0)
   heals you to full from the checkpoint; a survivable gust passes cost 2 (the
   caller has already checked you have the hearts to take it).
   Brief invulnerability keeps the swarm from instantly re-killing you. */
function respawnHero(cost) {
  const d = DUNGEON, h = d.hero;
  const p = respawnPoint();
  h.fx = p.x; h.fy = p.y;
  h.jumpZ = 0; h.rootedUntil = 0; h.sinkUntil = 0; h.sinkLevel = 0; h.submerged = false; h.blownOff = false;
  h.hp = cost ? Math.max(0.5, h.hp - cost) : h.maxhp;
  h.hurtInvulnUntil = performance.now() + 2200;
  updateDungeonHUD();
}

// Blown off the edge (Desolate Dunes & Dawn of Time gusts): the fall costs 2
// hearts. If you have MORE than 2, you're swept back to your last checkpoint,
// still standing. With 2 or fewer, the fall is fatal — you're knocked out. An
// Extra Life instead hauls you back on the spot at full health.
function heroFellOff() {
  const d = DUNGEON, h = d.hero;
  if (d.over) return;
  if ((STATE.extraLives || 0) > 0) {
    const safe = d.path.samples[nearestSampleIndex(h.fx, h.fy)];
    STATE.extraLives = Math.max(0, STATE.extraLives - 1); saveGame();
    h.fx = safe.x; h.fy = safe.y; h.hp = h.maxhp; h.hurtInvulnUntil = performance.now() + 2000;
    banner('🌪️ Blown off — an Extra Life hauled you back!', 2800);
    Audio2.sfx.win(); updateDungeonHUD();
    return;
  }
  if (h.hp <= 2) {                 // not enough hearts to survive the fall
    h.hp = 0; updateDungeonHUD();
    banner('🌪️ BLOWN OFF THE EDGE!', 1500);
    loseDungeon();                 // knocked out → back to your last checkpoint
    return;
  }
  respawnHero(2);   // survived the fall — swept back to the checkpoint, down 2 hearts
  banner('🌪️ Blown off — lost 2 hearts! Back to your checkpoint.', 2600);
  Audio2.sfx.lose(); shake();
}

/* Pompeii's Vesuvius: on a cycle it hurls molten bombs at telegraphed spots.
   Each shows a shrinking warning ring for ~1s (jump or run clear), then erupts
   — a direct hit is deadly, and the glowing splat keeps burning for a moment. */
function updateVolcano(dt, t) {
  const d = DUNGEON, h = d.hero;
  d.eruptTimer -= dt;
  if (d.eruptTimer <= 0) {
    d.eruptTimer = 2.7 + rand(t * 0.0013) * 1.8;                // next salvo in ~2.7-4.5s
    const n = 1 + Math.floor(rand(t * 0.0021) * 3);            // 1-3 bombs
    for (let i = 0; i < n; i++) {
      const aimHero = i === 0 || rand(t + i * 7.3) < 0.6;       // most bombs chase the hero
      let tx, ty;
      if (aimHero) {
        const a = rand(t + i * 3.1) * Math.PI * 2, rr = rand(t * 0.7 + i) * 2.4;
        tx = h.fx + Math.cos(a) * rr; ty = h.fy + Math.sin(a) * rr;
      } else { tx = 4 + rand(t + i * 5.7) * (d.W - 8); ty = 4 + rand(t + i * 9.1) * (d.H - 8); }
      d.eruptions.push({ x: clamp(tx, 2, d.W - 2), y: clamp(ty, 2, d.H - 2), born: t, warn: 950, radius: 1.7, state: 'warn' });
    }
    if (!d._eruptBannerUntil || t > d._eruptBannerUntil) {
      banner('🌋 VESUVIUS ERUPTS — dodge the lava!', 1000); shake(); Audio2.sfx.lose();
      d._eruptBannerUntil = t + 2200;
    }
  }
  const jumping = t < h.jumpUntil, dodging = t < h.dodgeUntil;
  d.eruptions = d.eruptions.filter(e => {
    const age = t - e.born;
    if (e.state === 'warn' && age >= e.warn) {                  // the bomb lands
      e.state = 'blast'; e.blastAt = t; shake(); Audio2.sfx.bighit();
      if (dist(e.x, e.y, h.fx, h.fy) < e.radius + h.r && !jumping && !dodging && t >= h.hurtInvulnUntil) {
        spawnFloatText(h.fx, h.fy, '🌋 -2❤', '#ff7a2a');
        hurtHero(2); if (d.over) return false;
      }
    }
    if (e.state === 'blast') {                                  // molten splat lingers and burns
      const bage = t - e.blastAt;
      if (bage < 850 && dist(e.x, e.y, h.fx, h.fy) < e.radius && !jumping && t >= h.hurtInvulnUntil && t > (h.lavaDmgAt || 0)) {
        h.lavaDmgAt = t + 380; h.hurtUntil = t + 200;
        spawnFloatText(h.fx, h.fy, '🔥 -1', '#ff6a2a'); hurtHero(1); if (d.over) return false;
      }
      return bage < 1100;
    }
    return true;
  });
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

  // sky / background (theme-specific; beach levels paint an ocean horizon)
  const sk = d.theme.sky;
  const sky = ctx.createLinearGradient(0, 0, 0, ch);
  sky.addColorStop(0, sk[0]); sky.addColorStop(0.55, sk[1]); sky.addColorStop(1, sk[2]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, cw, ch);
  if (d.beach) drawOceanBackdrop(ctx, cw, ch);

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

  // ---- animated trail flowing forward along the path (path levels only) ----
  if (!d.chamberMode) drawTrail(ctx, ox, oy);
  // ---- temple stairs sit flat in the corridors ----
  if (d.stairs) d.stairs.forEach(st => { if (Math.abs(st.x - d.hero.fx) < RANGE && Math.abs(st.y - d.hero.fy) < RANGE) drawStairs(ctx, st, ox, oy); });

  // ---- tidal water pools (drawn over the sand, under everything else) ----
  if (d.water) d.water.forEach(w => { if (Math.abs(w.x - d.hero.fx) < RANGE + w.r && Math.abs(w.y - d.hero.fy) < RANGE + w.r) drawWaterZone(ctx, w, ox, oy); });
  // ---- the hidden underwater passage (a shimmer you have to find), and the
  //      glowing Key at the end of the gauntlet corridor once it's opened ----
  if (d.secret) drawSecret(ctx, d.secret, ox, oy);
  if (d.key && !d.key.taken && d.secret && d.secret.found && Math.abs(d.key.x - d.hero.fx) < RANGE && Math.abs(d.key.y - d.hero.fy) < RANGE) drawKey(ctx, d.key, ox, oy);

  // ---- floor traps (quicksand, poison pools, spikes, trap doors) sit on the ground ----
  if (d.traps) d.traps.forEach(tr => { if (Math.abs(tr.x - d.hero.fx) < RANGE && Math.abs(tr.y - d.hero.fy) < RANGE) drawTrap(ctx, tr, ox, oy); });
  // ---- rolling wave traps ----
  if (d.waves) d.waves.forEach(wv => { if (Math.abs(wv.x - d.hero.fx) < RANGE && Math.abs(wv.y - d.hero.fy) < RANGE) drawWave(ctx, wv, ox, oy); });
  // ---- Vesuvius lava-bomb warning rings + molten splats sit on the ground ----
  if (d.eruptions) d.eruptions.forEach(e => drawEruptGround(ctx, e, ox, oy));
  // ---- Omega strike telegraphs (lightning marks / stomp ring) on the ground ----
  if (d.strikes) d.strikes.forEach(s => drawOmegaStrike(ctx, s, ox, oy));

  // ---- collect depth-sorted sprites (props + entities + drops + checkpoints + grabbers) ----
  const draws = [];
  d.checkpoints.forEach(cp => draws.push({ z: cp.x + cp.y, kind: 'checkpoint', cp }));
  if (d.doors) d.doors.forEach(door => draws.push({ z: door.x + door.y, kind: 'door', door }));
  if (d.artifacts) d.artifacts.forEach(a => { if (!a.taken) draws.push({ z: a.x + a.y, kind: 'artifact', a }); });
  d.props.forEach(p => { if (Math.abs(p.x - d.hero.fx) < RANGE && Math.abs(p.y - d.hero.fy) < RANGE) draws.push({ z: p.x + p.y, kind: 'prop', p }); });
  if (d.grabbers) d.grabbers.forEach(g => { if (!g.dead && Math.abs(g.x - d.hero.fx) < RANGE && Math.abs(g.y - d.hero.fy) < RANGE) draws.push({ z: g.x + g.y, kind: 'grabber', g }); });
  d.drops.forEach(dr => draws.push({ z: dr.fx + dr.fy - 0.01, kind: 'drop', dr }));
  d.enemies.forEach(e => { if (!e.dead) draws.push({ z: e.fx + e.fy, kind: 'enemy', e }); });
  if (d.boss && !d.boss.dead) draws.push({ z: d.boss.fx + d.boss.fy, kind: 'enemy', e: d.boss });
  if (d.pet) draws.push({ z: d.pet.fx + d.pet.fy - 0.02, kind: 'pet', p: d.pet });
  draws.push({ z: d.hero.fx + d.hero.fy, kind: 'hero', h: d.hero });
  draws.sort((a, b) => a.z - b.z);

  draws.forEach(item => {
    if (item.kind === 'prop') drawProp(ctx, item.p, ox, oy);
    else if (item.kind === 'checkpoint') drawCheckpoint(ctx, item.cp, ox, oy);
    else if (item.kind === 'door') drawDoor(ctx, item.door, ox, oy);
    else if (item.kind === 'artifact') drawArtifact(ctx, item.a, ox, oy);
    else if (item.kind === 'grabber') drawGrabber(ctx, item.g, ox, oy);
    else if (item.kind === 'drop') drawDrop(ctx, item.dr, ox, oy);
    else if (item.kind === 'enemy') drawCombatant(ctx, item.e, ox, oy);
    else if (item.kind === 'pet') drawPet(ctx, item.p, ox, oy);
    else if (item.kind === 'hero') drawHero(ctx, item.h, ox, oy);
  });

  // ---- roaming tornadoes, drawn tall over the fighters ----
  if (d.tornadoes) d.tornadoes.forEach(tor => { if (Math.abs(tor.x - d.hero.fx) < RANGE + 3 && Math.abs(tor.y - d.hero.fy) < RANGE + 3) drawTornado(ctx, tor, ox, oy); });
  // ---- lava-bomb eruption columns, drawn tall over the fighters ----
  if (d.eruptions) d.eruptions.forEach(e => { if (e.state === 'blast') drawEruptBlast(ctx, e, ox, oy); });

  // ---- hero bullets / rockets ----
  if (d.shots) d.shots.forEach(s => drawHeroShot(ctx, s, ox, oy));
  // ---- the Omega's fireballs / ice shards ----
  if (d.bossShots) d.bossShots.forEach(s => drawOmegaShot(ctx, s, ox, oy));

  // floating texts / swing fx
  d.fx.forEach(f => drawFx(ctx, f, ox, oy));

  // ---- sandstorm haze for Desolate Dunes (thicker during a gust) ----
  if (d.dunes) drawSandstorm(ctx, cw, ch);

  // ---- underwater blue overlay while the hero is swimming ----
  if (d.hero.submerged) {
    const uw = ctx.createLinearGradient(0, 0, 0, ch);
    uw.addColorStop(0, 'rgba(20,90,140,0.34)'); uw.addColorStop(1, 'rgba(10,50,90,0.5)');
    ctx.fillStyle = uw; ctx.fillRect(0, 0, cw, ch);
    // drifting light rays + bubbles
    const t2 = performance.now() / 1000;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(150,220,255,0.05)'; ctx.beginPath(); ctx.moveTo((i * 0.27 + 0.1) * cw, 0); ctx.lineTo((i * 0.27 + 0.16) * cw, 0); ctx.lineTo((i * 0.27 + 0.02) * cw, ch); ctx.lineTo((i * 0.27 - 0.06) * cw, ch); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 8; i++) { const bx = (Math.sin(i * 12.9) * 0.5 + 0.5) * cw, by = ch - ((t2 * 40 + i * 60) % ch); ctx.fillStyle = 'rgba(200,240,255,0.25)'; ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3), 0, 7); ctx.fill(); }
  }

  // ---- drifting poison haze for the Toxic Temple ----
  if (d.poison) drawPoisonHaze(ctx, cw, ch);

  // ---- canopy: overhead tree-tops that shadow + hide the hero ----
  if (d.canopy && d.canopy.length) {
    d.canopy.forEach(c => {
      if (Math.abs(c.x - d.hero.fx) > RANGE + 4 || Math.abs(c.y - d.hero.fy) > RANGE + 4) return;
      const sc = isoToScreen(c.x, c.y); const x = sc.x + ox, y = sc.y + oy - 46;
      const sway = Math.sin(performance.now() / 1300 + c.seed) * 4;
      ctx.fillStyle = 'rgba(10,26,10,0.82)';
      ctx.beginPath(); ctx.ellipse(x + sway, y, c.r, c.r * 0.62, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(30,55,25,0.5)';
      ctx.beginPath(); ctx.ellipse(x + sway - c.r * 0.3, y - 6, c.r * 0.5, c.r * 0.33, 0, 0, 7); ctx.fill();
    });
  }

  // vignette (darker for shadowy forests / the murky temple / the pitch-black lair)
  let dark = d.theme.canopy ? 0.82 : d.poison ? 0.7 : 0.55;
  let vgInner = ch * 0.22, vgOuter = ch * 0.72;
  if (d.theme.lair) {                                        // the Backstabber's Lair is nearly pitch black
    dark = 0.87; vgInner = ch * 0.13; vgOuter = ch * 0.58;
    if (d.boss && d.boss.vanished) { dark = 0.96; vgInner = ch * 0.07; vgOuter = ch * 0.48; }   // he's stalking — the dark closes in
  }
  const vg = ctx.createRadialGradient(cw / 2, ch / 2, vgInner, cw / 2, ch / 2, vgOuter);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${dark})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);

  // ---- last-heart warning: the screen edges pulse red like a heartbeat ----
  if (d.hero.hp > 0 && d.hero.hp <= 1) {
    const beat = 0.22 + 0.16 * Math.abs(Math.sin(performance.now() / 280));
    const rv = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.3, cw / 2, ch / 2, ch * 0.75);
    rv.addColorStop(0, 'rgba(200,20,40,0)'); rv.addColorStop(1, `rgba(200,20,40,${beat})`);
    ctx.fillStyle = rv; ctx.fillRect(0, 0, cw, ch);
  }

  // ---- flight-fuel meter (only when you own the Wings) ----
  if (hasArtifact('wings')) {
    const f = d.hero.flyFuel === undefined ? 1 : d.hero.flyFuel;
    const bw = 132, bh = 9, bx = cw / 2 - bw / 2, by = ch - 104;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRectPath(ctx, bx - 4, by - 16, bw + 8, bh + 20, 6); ctx.fill();
    ctx.fillStyle = '#16283a'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = d.hero.flying ? '#7fe0ff' : (f > 0.25 ? '#8fd0a0' : '#e0a060'); ctx.fillRect(bx, by, bw * f, bh);
    ctx.font = '900 11px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#dff0ff';
    ctx.fillText('🪽 FLIGHT — hold Jump', cw / 2, by - 4);
  }
}

/* An Omega projectile: a roaring fireball or a spinning ice shard. */
function drawOmegaShot(ctx, s, ox, oy) {
  const p = isoToScreen(s.x, s.y), x = p.x + ox, y = p.y + oy - 22;
  const fire = s.kind === 'fire';
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 1, x, y, 13);
  if (fire) { g.addColorStop(0, 'rgba(255,240,180,0.95)'); g.addColorStop(0.5, 'rgba(255,130,40,0.75)'); g.addColorStop(1, 'rgba(200,40,10,0)'); }
  else { g.addColorStop(0, 'rgba(230,250,255,0.95)'); g.addColorStop(0.5, 'rgba(110,200,255,0.75)'); g.addColorStop(1, 'rgba(40,90,200,0)'); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill();
  ctx.fillStyle = fire ? '#ffd27a' : '#dff4ff';
  ctx.beginPath(); ctx.arc(x, y, 4.4, 0, 7); ctx.fill();
  ctx.restore();
}
/* An Omega strike: a pulsing death-ring telegraph, then the impact flash. */
function drawOmegaStrike(ctx, s, ox, oy) {
  const p = isoToScreen(s.x, s.y), x = p.x + ox, y = p.y + oy;
  const t = performance.now();
  const rx = s.r * (ISO.TW / 2) * 1.35, ry = s.r * (ISO.TH / 2) * 1.35;
  ctx.save();
  if (!s.landed) {                                      // shrinking warning ring
    const frac = Math.max(0, (s.at - t) / 1100);
    const pulse = 0.55 + 0.35 * Math.abs(Math.sin(t / 90));
    ctx.strokeStyle = s.kind === 'bolt' ? `rgba(255,230,90,${pulse})` : `rgba(255,90,60,${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y, rx * (0.25 + frac * 0.75), ry * (0.25 + frac * 0.75), 0, 0, 7); ctx.stroke();
    ctx.font = '900 16px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    ctx.fillText(s.kind === 'bolt' ? '⚡' : '🦶', x, y + 5);
  } else {                                              // the impact flash
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 2, x, y, rx);
    if (s.kind === 'bolt') { g.addColorStop(0, 'rgba(255,255,220,0.9)'); g.addColorStop(1, 'rgba(255,220,60,0)'); }
    else { g.addColorStop(0, 'rgba(255,200,150,0.9)'); g.addColorStop(1, 'rgba(200,60,20,0)'); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
    if (s.kind === 'bolt') {                            // the bolt itself, top of screen down
      ctx.strokeStyle = 'rgba(255,255,200,0.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); let yy = y - 320, xx = x;
      ctx.moveTo(xx, yy);
      while (yy < y) { yy += 40; xx = x + (rand(yy * 0.13) - 0.5) * 26; ctx.lineTo(xx, yy); }
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* A hero bullet (glowing tracer) or rocket (finned shell + smoke trail). */
function drawHeroShot(ctx, s, ox, oy) {
  const p = isoToScreen(s.x, s.y), x = p.x + ox, y = p.y + oy - 24;
  const svx = (s.vx - s.vy) * (ISO.TW / 2), svy = (s.vx + s.vy) * (ISO.TH / 2);
  const ang = Math.atan2(svy, svx), m = Math.hypot(svx, svy) || 1, ux = svx / m, uy = svy / m;
  ctx.save();
  if (s.kind === 'bazooka') {
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#b8b8b8';
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(x - ux * i * 8, y - uy * i * 8, 4 - i, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(-9, -3.5, 16, 7);
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(7, -3.5); ctx.lineTo(13, 0); ctx.lineTo(7, 3.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a5a64'; ctx.beginPath(); ctx.moveTo(-9, -3.5); ctx.lineTo(-13, -6); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fill();
  } else {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,190,70,0.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - ux * 12, y - uy * 12); ctx.stroke();
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 7); ctx.fill();
  }
  ctx.restore();
}

/* A roaming tornado — a swirling sand funnel that flings the hero around. */
function drawTornado(ctx, tor, ox, oy) {
  const s = isoToScreen(tor.x, tor.y), x = s.x + ox, y = s.y + oy, spin = tor.spin || 0;
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const f = i / 8, yy = y - f * 64;
    const rw = 4 + f * 20 + Math.sin(spin + i * 0.8) * 3, rh = rw * 0.34;
    const cx = x + Math.sin(spin * 1.4 + i) * 4;
    ctx.fillStyle = `rgba(220,196,140,${0.15 + f * 0.16})`;
    ctx.beginPath(); ctx.ellipse(cx, yy, rw, rh, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(170,140,85,${0.18 + f * 0.12})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(cx, yy, rw, rh, 0, spin + i, spin + i + 3.6); ctx.stroke();
  }
  for (let i = 0; i < 6; i++) { const a = spin * 2 + i; ctx.fillStyle = 'rgba(230,210,150,0.5)'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 16, y - 22 + Math.sin(a * 1.3) * 12, 1.6, 0, 7); ctx.fill(); }
  ctx.restore();
}

/* A lava-bomb's ground signature: a shrinking warning ring while it falls, then
   a glowing molten splat once it lands. */
function drawEruptGround(ctx, e, ox, oy) {
  const s = isoToScreen(e.x, e.y), x = s.x + ox, y = s.y + oy, now = performance.now();
  const rw = e.radius * 26, rh = rw * 0.5;
  if (e.state === 'warn') {
    const f = clamp((now - e.born) / e.warn, 0, 1);             // 0 -> 1 as impact nears
    const pulse = 0.4 + 0.4 * Math.abs(Math.sin(now / 90));
    ctx.save();
    ctx.strokeStyle = `rgba(255,90,30,${0.5 + 0.4 * f})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = `rgba(255,220,120,${pulse})`; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, rw * (1 - f * 0.6), rh * (1 - f * 0.6), 0, 0, 7); ctx.stroke();   // ring closes in
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255,60,20,${0.12 + 0.14 * f})`; ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, 7); ctx.fill();
    ctx.restore();
  } else if (e.state === 'blast') {
    const bage = now - e.blastAt, fade = clamp(1 - bage / 1100, 0, 1);
    const gg = ctx.createRadialGradient(x, y, 2, x, y, rw); gg.addColorStop(0, `rgba(255,180,60,${0.8 * fade})`); gg.addColorStop(0.6, `rgba(240,80,20,${0.6 * fade})`); gg.addColorStop(1, 'rgba(120,20,10,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + e.born; ctx.fillStyle = `rgba(60,30,24,${0.5 * fade})`; ctx.beginPath(); ctx.arc(x + Math.cos(a) * rw * 0.6, y + Math.sin(a) * rh * 0.6, 3, 0, 7); ctx.fill(); }
  }
}

/* The eruption itself: a brief column of molten rock and fire bursting upward. */
function drawEruptBlast(ctx, e, ox, oy) {
  const s = isoToScreen(e.x, e.y), x = s.x + ox, y = s.y + oy, now = performance.now();
  const bage = now - e.blastAt, f = clamp(bage / 500, 0, 1), fade = clamp(1 - bage / 700, 0, 1);
  if (fade <= 0) return;
  ctx.save();
  const H = 74 * Math.sin(Math.min(1, f) * Math.PI);            // rises then falls
  const gg = ctx.createLinearGradient(x, y, x, y - H);
  gg.addColorStop(0, `rgba(255,220,120,${fade})`); gg.addColorStop(0.5, `rgba(255,110,30,${fade})`); gg.addColorStop(1, `rgba(180,30,20,0)`);
  ctx.fillStyle = gg;
  ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.quadraticCurveTo(x - 8, y - H * 0.7, x, y - H); ctx.quadraticCurveTo(x + 8, y - H * 0.7, x + 14, y); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 7; i++) {                                 // flung molten globs
    const a = i * 0.9 + e.born, sp = (0.4 + (i % 3) * 0.3);
    const gx = x + Math.cos(a) * 26 * f * sp, gy = y - H * 0.7 * f - Math.sin(a) * 14 + f * 20;
    ctx.fillStyle = `rgba(255,${120 + (i % 3) * 40},50,${fade})`; ctx.beginPath(); ctx.arc(gx, gy, 3 - (i % 2), 0, 7); ctx.fill();
  }
  ctx.restore();
}

/* The blowing sandstorm overlay — streaks driven along the current wind, much
   thicker during a gust so you can SEE the danger coming. */
function drawSandstorm(ctx, cw, ch) {
  const d = DUNGEON, t = performance.now() / 1000, gust = !!(d.wind && d.wind.gust);
  ctx.fillStyle = gust ? 'rgba(200,150,80,0.34)' : 'rgba(200,160,90,0.15)';
  ctx.fillRect(0, 0, cw, ch);
  const wx = d.wind ? d.wind.x : 1, wy = d.wind ? d.wind.y : 0, wm = Math.hypot(wx, wy) || 1;
  const dx = wx / wm, dy = wy / wm, n = gust ? 70 : 34, L = gust ? 26 : 16;
  ctx.strokeStyle = gust ? 'rgba(240,220,170,0.5)' : 'rgba(235,215,165,0.3)'; ctx.lineWidth = 1.2;
  const mod = (v, m) => ((v % m) + m) % m;
  for (let i = 0; i < n; i++) {
    const seed = i * 12.9, sp = 240 * (0.5 + (i % 5) * 0.2);
    const px = mod((Math.sin(seed) * 0.5 + 0.5) * cw + t * sp * dx, cw);
    const py = mod((Math.cos(seed) * 0.5 + 0.5) * ch + t * sp * dy, ch);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - dx * L, py - dy * L); ctx.stroke();
  }
  if (gust) { ctx.fillStyle = 'rgba(160,90,40,0.12)'; ctx.fillRect(0, 0, cw, ch); }
}

/* The sandworm while burrowed — just a travelling mound of disturbed sand. */
function drawWormMound(ctx, x, y, scale, e) {
  const now = performance.now();
  shadowOval(ctx, x, y, 24 * scale, 9 * scale);
  ctx.fillStyle = '#c79b45'; ctx.beginPath(); ctx.moveTo(x - 26 * scale, y); ctx.quadraticCurveTo(x, y - 22 * scale, x + 26 * scale, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#dcb85e'; ctx.beginPath(); ctx.moveTo(x - 26 * scale, y); ctx.quadraticCurveTo(x - 4 * scale, y - 22 * scale, x + 2 * scale, y - 18 * scale); ctx.quadraticCurveTo(x - 6 * scale, y - 6 * scale, x - 26 * scale, y); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 7; i++) { const a = now / 260 + i, r = 10 + (i % 3) * 8; ctx.fillStyle = `rgba(210,180,110,${0.5 - (i % 3) * 0.12})`; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * scale, y - 4 - Math.abs(Math.sin(a)) * 10, 2.4, 0, 7); ctx.fill(); }
}

/* A floor trap: quicksand, poison pool, spike plate, lava, or trap door. */
function drawTrap(ctx, tr, ox, oy) {
  const s = isoToScreen(tr.x, tr.y), x = s.x + ox, y = s.y + oy, t = performance.now() / 1000;
  if (tr.kind === 'poison_pool') {
    // bubbling toxic sludge
    ctx.fillStyle = '#1e3a14'; ctx.beginPath(); ctx.ellipse(x, y, 28, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3f7a26'; ctx.beginPath(); ctx.ellipse(x, y, 24, 12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6fc23a'; ctx.beginPath(); ctx.ellipse(x - 4, y - 2, 16, 8, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.9 + i * 0.27) % 1;
      const bx = x + Math.sin(i * 2.1 + t) * 12, by = y - ph * 10;
      ctx.fillStyle = `rgba(180,255,120,${0.6 * (1 - ph)})`;
      ctx.beginPath(); ctx.arc(bx, by, 2 + (1 - ph) * 3, 0, 7); ctx.fill();
    }
    return;
  }
  if (tr.kind === 'spikes') {
    const extended = ((t + tr.phase) % 1.8) < 0.7;
    // base plate
    ctx.strokeStyle = 'rgba(20,30,14,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 16, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 16, y); ctx.closePath(); ctx.stroke();
    if (extended) {
      ctx.fillStyle = '#c8d2dc'; ctx.strokeStyle = '#5a6470'; ctx.lineWidth = 1.4;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const px = x + i * 8, py = y + j * 4;
        ctx.beginPath(); ctx.moveTo(px - 3, py + 2); ctx.lineTo(px, py - 12); ctx.lineTo(px + 3, py + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    } else {
      // retracted: little holes
      ctx.fillStyle = 'rgba(10,16,8,0.8)';
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.arc(x + i * 8, y + j * 4, 1.6, 0, 7); ctx.fill(); }
    }
    return;
  }
  if (tr.kind === 'lava') {
    // molten rock — a glowing, bubbling pool you must jump across
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(x, y, 2, x, y, 30); gl.addColorStop(0, 'rgba(255,140,40,0.5)'); gl.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(x, y, 30, 17, 0, 0, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#5a1a08'; ctx.beginPath(); ctx.ellipse(x, y, 27, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff5a1a'; ctx.beginPath(); ctx.ellipse(x, y, 23, 11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.ellipse(x - 3, y - 1, 14, 6, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 4; i++) {                       // molten crust cracks + bubbles
      const ph = (t * 0.8 + i * 0.29) % 1, bx = x + Math.sin(i * 2.3 + t) * 13, by = y + Math.cos(i * 1.7 + t) * 6;
      ctx.fillStyle = `rgba(60,20,10,${0.5})`; ctx.beginPath(); ctx.arc(bx, by, 3 + Math.sin(t * 3 + i) * 1.4, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(255,180,60,${0.7 * (1 - ph)})`; ctx.beginPath(); ctx.arc(x + Math.sin(i * 4.1) * 10, y - ph * 8, 1.6, 0, 7); ctx.fill();
    }
    return;
  }
  if (tr.kind === 'ice') {
    // a slick, glassy patch of ice — glossy sheen + cracks so you can read it and jump it
    ctx.fillStyle = 'rgba(178,222,252,0.55)'; ctx.beginPath(); ctx.ellipse(x, y, 28, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(232,248,255,0.55)'; ctx.beginPath(); ctx.ellipse(x - 6, y - 3, 14, 7, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(120,170,210,0.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - 14, y - 4); ctx.lineTo(x - 2, y + 1); ctx.lineTo(x + 7, y - 5); ctx.moveTo(x - 2, y + 1); ctx.lineTo(x + 2, y + 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 27, 14, 0, 0, 7); ctx.stroke();
    return;
  }
  if (tr.kind === 'quicksand') {
    ctx.fillStyle = '#5a4a2a'; ctx.beginPath(); ctx.ellipse(x, y, 26, 14, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const rr = ((t * 0.5 + i / 3) % 1);
      ctx.strokeStyle = `rgba(180,150,90,${0.5 * (1 - rr)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, 6 + rr * 20, (6 + rr * 20) * 0.55, 0, 0, 7); ctx.stroke();
    }
  } else { // trap door
    if (!tr.sprung) {
      ctx.strokeStyle = 'rgba(20,14,8,0.55)'; ctx.lineWidth = 2;
      ctx.strokeRect(x - 14, y - 8, 28, 16);
      ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
    } else {
      ctx.fillStyle = '#0a0806'; ctx.beginPath(); ctx.ellipse(x, y, 20, 11, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 18, y - 10); ctx.lineTo(x - 22, y - 22); ctx.moveTo(x + 18, y - 10); ctx.lineTo(x + 22, y - 22); ctx.stroke();
    }
  }
}

/* ---- Beach / ocean visuals (Shatter Coast, Sandcastle) ---- */
function drawOceanBackdrop(ctx, cw, ch) {
  const t = performance.now() / 1000;
  const horizon = ch * 0.30, oceanBot = ch * 0.52;
  const g = ctx.createLinearGradient(0, horizon, 0, oceanBot);
  g.addColorStop(0, '#2f9fc9'); g.addColorStop(1, '#1c6f9a');
  ctx.fillStyle = g; ctx.fillRect(0, horizon, cw, oceanBot - horizon);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, horizon - 1, cw, 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const y = horizon + 6 + i * ((oceanBot - horizon) / 6);
    ctx.beginPath();
    for (let x = 0; x <= cw; x += 14) { const yy = y + Math.sin(x * 0.05 + t * 1.5 + i) * 2; x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
    ctx.stroke();
  }
  const sg = ctx.createRadialGradient(cw * 0.72, horizon + 6, 2, cw * 0.72, horizon + 6, 60);
  sg.addColorStop(0, 'rgba(255,240,190,0.5)'); sg.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cw * 0.72, horizon + 6, 60, 0, 7); ctx.fill();
  const bh = ctx.createLinearGradient(0, oceanBot, 0, ch);
  bh.addColorStop(0, 'rgba(230,210,150,0.25)'); bh.addColorStop(1, 'rgba(230,210,150,0)');
  ctx.fillStyle = bh; ctx.fillRect(0, oceanBot, cw, ch - oceanBot);
}
function drawWaterZone(ctx, w, ox, oy) {
  const d = DUNGEON, t = performance.now() / 1000;
  const effR = w.deep ? w.r : w.r * (0.28 + 0.72 * (d.tide || 0));
  if (effR < 0.4) return;
  const s = isoToScreen(w.x, w.y), x = s.x + ox, y = s.y + oy;
  const rx = effR * ISO.TW / 2, ry = effR * ISO.TH / 2;
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7);
  const g = ctx.createRadialGradient(x, y, ry * 0.2, x, y, rx);
  g.addColorStop(0, w.deep ? 'rgba(20,80,120,0.85)' : 'rgba(40,140,180,0.6)');
  g.addColorStop(1, w.deep ? 'rgba(10,45,85,0.92)' : 'rgba(30,110,150,0.45)');
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { const rr = ((t * 0.4 + i / 3) % 1); ctx.beginPath(); ctx.ellipse(x, y, rx * rr, ry * rr, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.stroke();
}
function drawWave(ctx, wv, ox, oy) {
  const t = performance.now() / 1000, cyc = (t + wv.phase) % 3.2;
  const s = isoToScreen(wv.x, wv.y), x = s.x + ox, y = s.y + oy;
  const roll = cyc < 1.2 ? cyc / 1.2 : 1, alpha = cyc < 0.9 ? 1 : Math.max(0, 1 - (cyc - 0.9) / 1.2);
  if (alpha <= 0) return;
  const off = (1 - roll) * 40;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(40,140,190,0.4)'; ctx.beginPath(); ctx.ellipse(x, y + off, 34, 12, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(x, y + off, 32, 11, 0, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
  if (cyc < 0.5) for (let i = 0; i < 5; i++) { const a = Math.PI * (0.2 + i * 0.15); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 30, y + off - Math.sin(a) * 10 - cyc * 20, 2.5, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawSecret(ctx, secret, ox, oy) {
  const d = DUNGEON, h = d.hero, t = performance.now() / 1000;
  if (dist(secret.x, secret.y, h.fx, h.fy) > 5) return;   // only shimmers when you're close
  const s = isoToScreen(secret.x, secret.y), x = s.x + ox, y = s.y + oy;
  const pulse = 0.4 + 0.35 * Math.sin(t * 3);
  ctx.fillStyle = 'rgba(6,20,34,0.8)'; ctx.beginPath(); ctx.ellipse(x, y - 6, 16, 12, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(x, y - 6, 2, x, y - 6, 22);
  g.addColorStop(0, `rgba(120,230,255,${0.5 * pulse})`); g.addColorStop(1, 'rgba(120,230,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 6, 22, 0, 7); ctx.fill();
  for (let i = 0; i < 4; i++) { const ph = (t * 0.7 + i / 4) % 1; ctx.fillStyle = `rgba(200,245,255,${1 - ph})`; ctx.beginPath(); ctx.arc(x + Math.sin(i * 2 + t) * 12, y - 6 - ph * 16, 1.6, 0, 7); ctx.fill(); }
}
/* The glowing golden Key to the Sandcastle at the end of the gauntlet. */
function drawKey(ctx, key, ox, oy) {
  const t = performance.now() / 1000;
  const s = isoToScreen(key.x, key.y), x = s.x + ox, y = s.y + oy - 18 + Math.sin(t * 2) * 3;
  const g = ctx.createRadialGradient(x, y, 2, x, y, 24);
  g.addColorStop(0, `rgba(255,220,90,${0.55 + 0.25 * Math.sin(t * 3)})`); g.addColorStop(1, 'rgba(255,220,90,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,220,90,0.18)'; ctx.beginPath(); ctx.ellipse(x, s.y + oy, 14, 7, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y - 5, 3.4, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - 1.6); ctx.lineTo(x, y + 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 3, y + 4); ctx.moveTo(x, y + 6.5); ctx.lineTo(x + 2.4, y + 6.5); ctx.stroke();
  for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1; ctx.fillStyle = `rgba(255,245,200,${1 - ph})`; ctx.beginPath(); ctx.arc(x + Math.sin(i * 2 + t) * 11, y - ph * 16, 1.4, 0, 7); ctx.fill(); }
}

/* Temple stairs in a corridor — a stack of stone steps + an up/down arrow. */
function drawStairs(ctx, st, ox, oy) {
  const s = isoToScreen(st.x, st.y), x = s.x + ox, y = s.y + oy, steps = 4;
  for (let i = 0; i < steps; i++) {
    const yy = y + (i - steps / 2) * 5, sh = 42 + i * 12;
    ctx.fillStyle = `rgb(${sh},${sh + 16},${sh})`;
    ctx.beginPath(); ctx.moveTo(x, yy - 6); ctx.lineTo(x + 18, yy); ctx.lineTo(x, yy + 6); ctx.lineTo(x - 18, yy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.fillStyle = 'rgba(180,240,150,0.8)'; ctx.font = '900 12px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(st.dir === 'up' ? '▲' : '▼', x, y - steps * 3 - 6); ctx.textAlign = 'left';
}

/* A temple gate — a closed portcullis blocks the way until the chamber clears. */
function drawDoor(ctx, door, ox, oy) {
  const s = isoToScreen(door.x, door.y), x = s.x + ox, y = s.y + oy, t = performance.now();
  const span = 30;
  const pillar = px => {
    ctx.fillStyle = '#3a4a30'; ctx.fillRect(px - 6, y - 54, 12, 60);
    ctx.fillStyle = '#4a5c3c'; ctx.fillRect(px - 6, y - 54, 5, 60);
    ctx.fillStyle = '#2a3624'; ctx.fillRect(px - 8, y - 58, 16, 6);
    ctx.fillStyle = '#2a3624'; ctx.fillRect(px - 8, y + 2, 16, 6);
  };
  pillar(x - span); pillar(x + span);
  ctx.fillStyle = '#33422b'; ctx.fillRect(x - span - 8, y - 62, (span + 8) * 2, 10);
  if (door.open) {
    ctx.fillStyle = `rgba(120,240,120,${0.1 + 0.05 * Math.sin(t / 300)})`;
    ctx.fillRect(x - span + 6, y - 50, (span - 6) * 2, 52);
    ctx.fillStyle = '#8ff0a0'; ctx.font = '900 11px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('OPEN', x, y - 22); ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = `rgba(120,220,90,${0.12 + 0.06 * Math.sin(t / 300)})`;
    ctx.fillRect(x - span + 8, y - 50, (span - 8) * 2, 52);
    ctx.strokeStyle = '#6a7a54'; ctx.lineWidth = 3;
    for (let i = -span + 8; i <= span - 8; i += 9) { ctx.beginPath(); ctx.moveTo(x + i, y - 50); ctx.lineTo(x + i, y + 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x - span + 8, y - 34); ctx.lineTo(x + span - 8, y - 34); ctx.stroke();
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(x, y - 24, 5, 0, 7); ctx.fill();
  }
}

/* A floating, glowing poison artifact you can walk over to earn a power. */
function drawArtifact(ctx, a, ox, oy) {
  const s = isoToScreen(a.x, a.y), x = s.x + ox, t = performance.now();
  const y = s.y + oy - 22 + Math.sin(t / 300 + a.x) * 4;
  const g = ctx.createRadialGradient(x, y, 2, x, y, 26);
  g.addColorStop(0, 'rgba(140,255,120,0.55)'); g.addColorStop(1, 'rgba(80,200,80,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(120,240,120,0.18)'; ctx.beginPath(); ctx.ellipse(x, s.y + oy, 16, 8, 0, 0, 7); ctx.fill();
  ctx.font = '900 22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((ARTIFACTS[a.id] || {}).icon || '☠️', x, y);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  for (let i = 0; i < 3; i++) { const ph = (t / 600 + i / 3) % 1; ctx.fillStyle = `rgba(200,255,160,${1 - ph})`; ctx.beginPath(); ctx.arc(x + Math.sin(i * 2 + t / 300) * 14, y - ph * 18, 1.6, 0, 7); ctx.fill(); }
}

/* Drifting green poison fog over the whole temple. */
function drawPoisonHaze(ctx, cw, ch) {
  const t = performance.now() / 1000;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const px = (Math.sin(i * 2.3 + t * 0.15) * 0.5 + 0.5) * cw;
    const py = ch * (0.2 + (i / 5) * 0.7) + Math.sin(t * 0.2 + i) * 20, r = 120 + i * 30;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(70,160,50,0.05)'); g.addColorStop(1, 'rgba(70,160,50,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(40,90,30,0.07)'; ctx.fillRect(0, 0, cw, ch);
}

/* A grabber tree — a living tree with a snarling face and reaching branches. */
function drawGrabber(ctx, g, ox, oy) {
  const s = isoToScreen(g.x, g.y), x = s.x + ox, y = s.y + oy, t = performance.now();
  const grabbing = t < g.grabUntil;
  const hurt = t < g.hurtUntil;
  shadowOval(ctx, x, y, 20, 8);
  // trunk
  ctx.fillStyle = hurt ? '#6a4a2a' : '#3a2a1a';
  ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 9, y - 54); ctx.lineTo(x + 9, y - 54); ctx.lineTo(x + 14, y); ctx.closePath(); ctx.fill();
  // reaching branch-arms
  const reach = grabbing ? 20 : 8 + Math.sin(t / 500 + g.seed) * 3;
  ctx.strokeStyle = '#2e2012'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 8, y - 40); ctx.lineTo(x - 18 - reach, y - 44); ctx.lineTo(x - 26 - reach, y - 34); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 8, y - 40); ctx.lineTo(x + 18 + reach, y - 44); ctx.lineTo(x + 26 + reach, y - 34); ctx.stroke();
  // snarling face
  ctx.fillStyle = '#ffce3f'; ctx.beginPath(); ctx.ellipse(x - 5, y - 34, 3, 4, 0, 0, 7); ctx.ellipse(x + 5, y - 34, 3, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#1a1008'; ctx.beginPath(); ctx.arc(x - 5, y - 33, 1.4, 0, 7); ctx.arc(x + 5, y - 33, 1.4, 0, 7); ctx.fill();
  ctx.strokeStyle = '#1a0e06'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x - 8, y - 22); ctx.lineTo(x - 4, y - 25); ctx.lineTo(x, y - 22); ctx.lineTo(x + 4, y - 25); ctx.lineTo(x + 8, y - 22); ctx.stroke();
  // hp pip when hurt
  if (hurt || g.hp < g.maxhp) { const w = 30, pct = Math.max(0, g.hp / g.maxhp); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2, y - 62, w, 5); ctx.fillStyle = '#8ff0a0'; ctx.fillRect(x - w / 2, y - 62, w * pct, 5); }
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
    const col = d.theme.trail;
    // soft glow
    ctx.fillStyle = `rgba(255,180,40,${a * 0.35})`;
    ctx.beginPath(); ctx.ellipse(x, y, 13, 6.5, 0, 0, 7); ctx.fill();
    // bright core dot
    ctx.fillStyle = `rgba(${col},${a})`;
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
  const g = DUNGEON.theme.ground;
  const shade = (gx + gy) % 2 === 0 ? g[0] : g[1];
  ctx.beginPath();
  ctx.moveTo(x, y - hh); ctx.lineTo(x + hw, y); ctx.lineTo(x, y + hh); ctx.lineTo(x - hw, y); ctx.closePath();
  ctx.fillStyle = shade; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; ctx.stroke();
  // subtle speckle (moss / grass tufts)
  const r = rand(gx * 12.9 + gy * 4.7);
  if (r > 0.86) { ctx.fillStyle = DUNGEON.theme.speckle; ctx.beginPath(); ctx.ellipse(x + (r - 0.9) * 30, y, 7, 3.5, 0, 0, 7); ctx.fill(); }
}

function drawCliffEdge(ctx, gx, gy, ox, oy) {
  const s = isoToScreen(gx, gy);
  const x = s.x + ox, y = s.y + oy;
  const hw = ISO.TW / 2, hh = ISO.TH / 2, depth = 26;
  const ec = DUNGEON.theme.edge;
  // draw side walls dropping into the chasm
  ctx.fillStyle = ec[0];
  ctx.beginPath();
  ctx.moveTo(x - hw, y); ctx.lineTo(x, y + hh); ctx.lineTo(x, y + hh + depth); ctx.lineTo(x - hw, y + depth); ctx.closePath(); ctx.fill();
  ctx.fillStyle = ec[1];
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
    case 'grass': {
      const sway = Math.sin(performance.now() / 400 + r) * 2;
      ctx.strokeStyle = '#7a8a3a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 4, y); ctx.quadraticCurveTo(x + i * 4 + sway, y - 12, x + i * 4 + sway * 1.5, y - 18); ctx.stroke(); }
      break;
    }
    case 'bush':
      ctx.fillStyle = '#4a6a2a'; ctx.beginPath(); ctx.ellipse(x, y - 8, 15, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#5f8a34'; ctx.beginPath(); ctx.ellipse(x - 5, y - 12, 8, 6, 0, 0, 7); ctx.ellipse(x + 6, y - 10, 7, 5, 0, 0, 7); ctx.fill();
      if (r % 3 === 0) { ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(x - 3, y - 9, 2, 0, 7); ctx.arc(x + 5, y - 11, 2, 0, 7); ctx.fill(); }
      break;
    case 'fence':
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 12, y - 2); ctx.lineTo(x - 12, y - 22); ctx.moveTo(x + 12, y - 2); ctx.lineTo(x + 12, y - 22); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = '#7a5a2f';
      ctx.beginPath(); ctx.moveTo(x - 16, y - 8); ctx.lineTo(x + 16, y - 12); ctx.moveTo(x - 16, y - 16); ctx.lineTo(x + 16, y - 20); ctx.stroke();
      break;
    case 'hay':
      ctx.fillStyle = '#c9a43a'; roundRectPath(ctx, x - 15, y - 20, 30, 20, 9); ctx.fill();
      ctx.strokeStyle = '#a8811f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); for (let i = -1; i <= 1; i++) ctx.ellipse(x, y - 10, 5, 10, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#8a6a1a'; ctx.lineWidth = 2; ctx.strokeRect(x - 15, y - 15, 30, 2);
      break;
    case 'pine': {
      const sway = Math.sin(performance.now() / 700 + r) * 1.5;
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 16); ctx.stroke();
      ctx.fillStyle = '#1e3018';
      for (let k = 0; k < 3; k++) { const yy = y - 10 - k * 17, wdt = 23 - k * 5; ctx.beginPath(); ctx.moveTo(x + sway, yy - 24); ctx.lineTo(x + wdt, yy); ctx.lineTo(x - wdt, yy); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = 'rgba(70,100,50,0.45)'; ctx.beginPath(); ctx.moveTo(x + sway, y - 62); ctx.lineTo(x + 6, y - 52); ctx.lineTo(x - 6, y - 52); ctx.closePath(); ctx.fill();
      break;
    }
    case 'stump':
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 12, y - 13, 24, 9);
      ctx.fillStyle = '#4a3524'; ctx.beginPath(); ctx.ellipse(x, y - 13, 12, 6, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#5a4530'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x, y - 13, 8, 4, 0, 0, 7); ctx.stroke();
      break;

    /* ---- Toxic Temple props ---- */
    case 'pillar': {
      const crk = r % 3 === 0;
      ctx.fillStyle = '#41513a'; ctx.fillRect(x - 9, y - 60, 18, 62);
      ctx.fillStyle = '#4e6146'; ctx.fillRect(x - 9, y - 60, 7, 62);           // lit side
      ctx.fillStyle = '#2c3826'; ctx.fillRect(x - 12, y - 66, 24, 8);          // capital
      ctx.fillStyle = '#2c3826'; ctx.fillRect(x - 12, y - 2, 24, 8);           // base
      ctx.strokeStyle = 'rgba(20,30,16,0.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x - 4, y - 58); ctx.lineTo(x - 4, y - 2); ctx.moveTo(x + 4, y - 58); ctx.lineTo(x + 4, y - 2); ctx.stroke();
      if (crk) { ctx.strokeStyle = '#8fce5a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 2, y - 40); ctx.lineTo(x + 3, y - 30); ctx.lineTo(x - 1, y - 20); ctx.stroke(); }  // toxic moss crack
      break;
    }
    case 'toxbarrel':
      ctx.fillStyle = '#3f5a2a'; roundRectPath(ctx, x - 11, y - 26, 22, 26, 5); ctx.fill();
      ctx.strokeStyle = '#2a3a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 11, y - 18); ctx.lineTo(x + 11, y - 18); ctx.moveTo(x - 11, y - 8); ctx.lineTo(x + 11, y - 8); ctx.stroke();
      ctx.fillStyle = '#7fe23a'; ctx.beginPath(); ctx.ellipse(x, y - 26, 9, 4, 0, 0, 7); ctx.fill();        // glowing goo top
      { const bb = (performance.now() / 500 + r) % 1; ctx.fillStyle = `rgba(160,255,120,${0.7 * (1 - bb)})`; ctx.beginPath(); ctx.arc(x + Math.sin(r) * 4, y - 28 - bb * 8, 2, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#20301a'; ctx.font = '900 10px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('☠', x, y - 12); ctx.textAlign = 'left';
      break;
    case 'greentorch': {
      ctx.strokeStyle = '#3a4a30'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40); ctx.stroke();
      const fl = 4 + Math.sin(performance.now() / 140 + r) * 3;
      const gg = ctx.createRadialGradient(x, y - 46, 1, x, y - 46, 16);
      gg.addColorStop(0, 'rgba(180,255,120,0.9)'); gg.addColorStop(1, 'rgba(90,200,70,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y - 46, 16, 0, 7); ctx.fill();
      ctx.fillStyle = '#7fe23a'; ctx.beginPath(); ctx.ellipse(x, y - 46, 5, 8 + fl, 0, 0, 7); ctx.fill();
      break;
    }
    case 'spore':
      for (let i = 0; i < 3; i++) {
        const sx = x + (i - 1) * 7, sy = y - 6 - (i % 2) * 5;
        ctx.strokeStyle = '#5a7a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, sy); ctx.stroke();
        ctx.fillStyle = '#8fce5a'; ctx.beginPath(); ctx.ellipse(sx, sy, 5, 3.5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(200,255,150,0.6)'; ctx.beginPath(); ctx.arc(sx - 1, sy - 1, 1.4, 0, 7); ctx.fill();
      }
      break;
    case 'poisonbones':
      ctx.strokeStyle = '#c8d0a8'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 12, y - 2); ctx.lineTo(x + 8, y - 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 6, y + 2); ctx.lineTo(x + 12, y - 3); ctx.stroke();
      ctx.fillStyle = '#8fce5a'; ctx.beginPath(); ctx.ellipse(x - 2, y, 6, 3, 0, 0, 7); ctx.fill();   // sludge pooling on the bones
      break;

    /* ---- Beach / coast props ---- */
    case 'palm': {
      const sway = Math.sin(performance.now() / 900 + r) * 4;
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 4 + sway * 0.4, y - 26, x + sway, y - 50); ctx.stroke();
      ctx.fillStyle = '#3fae5a';
      for (let k = 0; k < 6; k++) { const a = Math.PI + k * (Math.PI / 5); const fx = x + sway, fy = y - 50; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + Math.cos(a) * 16, fy + Math.sin(a) * 10 - 6, fx + Math.cos(a) * 30, fy + Math.sin(a) * 16); ctx.quadraticCurveTo(fx + Math.cos(a) * 16, fy + Math.sin(a) * 10, fx, fy); ctx.fill(); }
      ctx.fillStyle = '#7a4a2a'; ctx.beginPath(); ctx.arc(x + sway - 3, y - 47, 2.5, 0, 7); ctx.arc(x + sway + 3, y - 46, 2.5, 0, 7); ctx.fill();   // coconuts
      break;
    }
    case 'shell':
      ctx.fillStyle = '#f6d3c0'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y - 8, 11, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d98f7a'; ctx.lineWidth = 1.6;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + k * 5, y - 18); ctx.stroke(); }
      break;
    case 'driftwood':
      ctx.strokeStyle = '#cbb48c'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 16, y - 2); ctx.lineTo(x + 16, y - 6); ctx.stroke();
      ctx.strokeStyle = '#a88f66'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - 12, y - 3); ctx.lineTo(x + 12, y - 6); ctx.stroke();
      break;
    case 'starfish':
      ctx.fillStyle = '#e8823a';
      ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * (Math.PI * 2 / 5); const a2 = a + Math.PI / 5; ctx.lineTo(x + Math.cos(a) * 12, y - 6 + Math.sin(a) * 8); ctx.lineTo(x + Math.cos(a2) * 5, y - 6 + Math.sin(a2) * 3); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(x, y - 6, 2, 0, 7); ctx.fill();
      break;
    case 'coral':
      ctx.strokeStyle = '#ff7a9a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 14); ctx.moveTo(x, y - 8); ctx.lineTo(x - 8, y - 18); ctx.moveTo(x, y - 10); ctx.lineTo(x + 8, y - 20); ctx.stroke();
      ctx.fillStyle = '#ff9db4'; [[0, -14], [-8, -18], [8, -20]].forEach(p => { ctx.beginPath(); ctx.arc(x + p[0], y + p[1], 3, 0, 7); ctx.fill(); });
      break;
    case 'sandtower': {
      ctx.fillStyle = '#d9c084'; roundRectPath(ctx, x - 12, y - 30, 24, 30, 3); ctx.fill();
      ctx.fillStyle = '#c9ad6a'; ctx.fillRect(x - 12, y - 30, 8, 30);   // shaded side
      ctx.fillStyle = '#e6d29a'; for (let k = -1; k <= 1; k++) ctx.fillRect(x - 12 + (k + 1) * 8, y - 34, 6, 5);   // crenellations
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 4, y - 14, 8, 14);   // door
      break;
    }
    case 'flag':
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 34); ctx.stroke();
      { const fl = Math.sin(performance.now() / 300 + r) * 3; ctx.fillStyle = '#e0453a'; ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x + 18, y - 30 + fl); ctx.lineTo(x, y - 24); ctx.closePath(); ctx.fill(); }
      break;

    /* ---- Sand-cavern props ---- */
    case 'dune': {
      ctx.fillStyle = '#cbb072'; ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.quadraticCurveTo(x - 8, y - 21, x + 8, y - 14); ctx.quadraticCurveTo(x + 22, y - 9, x + 30, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e6d095'; ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.quadraticCurveTo(x - 8, y - 21, x + 8, y - 14); ctx.quadraticCurveTo(x - 6, y - 8, x - 28, y); ctx.closePath(); ctx.fill();   // lit crest
      ctx.strokeStyle = 'rgba(150,120,60,0.45)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - 20, y - 3); ctx.quadraticCurveTo(x - 2, y - 12, x + 18, y - 4); ctx.stroke();   // wind ripple
      break;
    }
    case 'sandpillar': {
      ctx.fillStyle = '#c2a25a'; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x - 5, y - 44); ctx.quadraticCurveTo(x, y - 53, x + 5, y - 44); ctx.lineTo(x + 9, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#dcc07e'; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x - 5, y - 44); ctx.quadraticCurveTo(x, y - 53, x, y - 44); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();   // lit half
      ctx.strokeStyle = 'rgba(120,95,50,0.5)'; ctx.lineWidth = 1.3;
      for (let i = 1; i <= 4; i++) { const yy = y - i * 9; ctx.beginPath(); ctx.moveTo(x - 8 + i * 0.7, yy); ctx.lineTo(x + 8 - i * 0.7, yy); ctx.stroke(); }   // sandstone strata
      break;
    }
    case 'pottedpalm': {
      const sway = Math.sin(performance.now() / 900 + r) * 3;
      ctx.strokeStyle = '#9a7a44'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.quadraticCurveTo(x - 2 + sway * 0.4, y - 30, x + sway, y - 44); ctx.stroke();   // trunk
      ctx.fillStyle = '#3fae5a';
      for (let k = 0; k < 5; k++) { const a = Math.PI + k * (Math.PI / 4), fx = x + sway, fy = y - 44; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + Math.cos(a) * 14, fy + Math.sin(a) * 9 - 5, fx + Math.cos(a) * 24, fy + Math.sin(a) * 13); ctx.quadraticCurveTo(fx + Math.cos(a) * 13, fy + Math.sin(a) * 8, fx, fy); ctx.fill(); }
      ctx.fillStyle = '#7a4a2a'; ctx.beginPath(); ctx.arc(x + sway - 3, y - 41, 2.2, 0, 7); ctx.arc(x + sway + 3, y - 40, 2.2, 0, 7); ctx.fill();   // coconuts
      ctx.fillStyle = '#b5623a'; ctx.beginPath(); ctx.moveTo(x - 11, y - 14); ctx.lineTo(x + 11, y - 14); ctx.lineTo(x + 8, y); ctx.lineTo(x - 8, y); ctx.closePath(); ctx.fill();   // clay pot
      ctx.fillStyle = '#c9744a'; ctx.fillRect(x - 12, y - 16, 24, 3);   // pot rim
      break;
    }

    /* ---- Frozen-mountain props ---- */
    case 'icespike': {
      [[-10, 0, 26], [0, -3, 40], [9, 1, 30]].forEach(([dx, dy, hh]) => {
        const bx = x + dx, by = y + dy;
        ctx.fillStyle = 'rgba(202,235,255,0.9)'; ctx.strokeStyle = 'rgba(140,190,225,0.85)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(bx - 5, by); ctx.lineTo(bx, by - hh); ctx.lineTo(bx + 5, by); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx - 1.5, by - 3); ctx.lineTo(bx - 0.5, by - hh + 5); ctx.stroke();
      });
      break;
    }
    case 'snowpile': {
      ctx.fillStyle = '#eaf3ff'; ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.quadraticCurveTo(x - 6, y - 16, x + 6, y - 12); ctx.quadraticCurveTo(x + 18, y - 8, x + 24, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.quadraticCurveTo(x - 6, y - 16, x + 6, y - 12); ctx.quadraticCurveTo(x - 4, y - 7, x - 22, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(200,225,255,0.85)'; ctx.beginPath(); ctx.arc(x + 8, y - 4, 1.4, 0, 7); ctx.arc(x - 10, y - 2, 1.2, 0, 7); ctx.fill();
      break;
    }
    case 'frozenrock': {
      ctx.fillStyle = '#5f7284'; ctx.beginPath(); ctx.ellipse(x, y - 8, 15, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(190,225,250,0.5)'; ctx.beginPath(); ctx.ellipse(x, y - 9, 17, 13, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - 5, y - 13, 6, 4, 0, 0, 7); ctx.fill();
      break;
    }

    /* ---- Prehistoric / dinosaur props ---- */
    case 'fern': {
      const sway = Math.sin(performance.now() / 700 + r) * 2;
      ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      for (let i = -3; i <= 3; i++) {
        const a = i * 0.34, x2 = x + Math.sin(a) * 19 + sway, y2 = y - Math.cos(a) * 27;
        ctx.strokeStyle = i % 2 ? '#57a03f' : '#3c722e';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(a) * 8, y - 15, x2, y2); ctx.stroke();
      }
      break;
    }
    case 'volcano': {
      const now = performance.now();
      ctx.fillStyle = '#5a4636'; ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.lineTo(x - 8, y - 30); ctx.lineTo(x + 8, y - 30); ctx.lineTo(x + 26, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(30,22,14,0.45)'; ctx.beginPath(); ctx.moveTo(x + 26, y); ctx.lineTo(x + 8, y - 30); ctx.lineTo(x + 2, y - 30); ctx.lineTo(x + 12, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff6a1a'; ctx.beginPath(); ctx.ellipse(x, y - 30, 8, 3, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#ff7a2a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 3, y - 29); ctx.lineTo(x - 7, y - 14); ctx.stroke();
      for (let i = 0; i < 3; i++) { const ph = (now / 1500 + i / 3) % 1; ctx.fillStyle = `rgba(120,112,102,${0.4 * (1 - ph)})`; ctx.beginPath(); ctx.arc(x + Math.sin(i * 2 + now / 600) * 4, y - 34 - ph * 26, 4 + ph * 7, 0, 7); ctx.fill(); }
      break;
    }

    /* ---- Old West props ---- */
    case 'cactus': {
      ctx.fillStyle = '#4a8a3a'; ctx.strokeStyle = '#3a6f2e'; ctx.lineWidth = 1;
      roundRectPath(ctx, x - 4, y - 34, 8, 34, 4); ctx.fill();
      roundRectPath(ctx, x - 14, y - 24, 6, 14, 3); ctx.fill();       // left arm
      roundRectPath(ctx, x - 14, y - 24, 6, 4, 2); ctx.fill();
      ctx.fillRect(x - 14, y - 24, 6, 8);
      roundRectPath(ctx, x + 8, y - 30, 6, 16, 3); ctx.fill();        // right arm
      ctx.fillRect(x + 8, y - 30, 6, 10);
      ctx.strokeStyle = '#2f5a24'; ctx.lineWidth = 0.8;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x, y - 6 - i * 10); ctx.lineTo(x, y - 12 - i * 10); ctx.stroke(); }
      break;
    }
    case 'barrel': {
      ctx.fillStyle = '#7a5230'; roundRectPath(ctx, x - 10, y - 24, 20, 24, 4); ctx.fill();
      ctx.fillStyle = '#5f3f22'; ctx.fillRect(x - 10, y - 24, 6, 24);
      ctx.strokeStyle = '#3a2716'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 10, y - 18); ctx.lineTo(x + 10, y - 18); ctx.moveTo(x - 10, y - 8); ctx.lineTo(x + 10, y - 8); ctx.stroke();
      ctx.fillStyle = '#8a6238'; ctx.beginPath(); ctx.ellipse(x, y - 24, 10, 3, 0, 0, 7); ctx.fill();
      break;
    }
    case 'tumbleweed': {
      const roll = Math.sin(performance.now() / 300 + r) * 0.5;
      ctx.save(); ctx.translate(x, y - 9); ctx.rotate(roll);
      ctx.strokeStyle = '#a58a4a'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.stroke(); }
      ctx.strokeStyle = '#8a6f38'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.stroke();
      ctx.restore();
      break;
    }

    /* ---- Present Day (city) props ---- */
    case 'burgerjoint': {
      ctx.fillStyle = '#c24a44'; ctx.fillRect(x - 20, y - 26, 40, 26);
      ctx.fillStyle = '#e7dfce'; ctx.fillRect(x - 20, y - 12, 40, 12);
      ctx.fillStyle = '#7fd0ff'; ctx.fillRect(x - 15, y - 10, 9, 10); ctx.fillRect(x + 6, y - 10, 9, 10);
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 4, y - 10, 8, 10);
      ctx.strokeStyle = '#ffcf3f'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x - 4, y - 32, 5, Math.PI, 0); ctx.arc(x + 4, y - 32, 5, Math.PI, 0); ctx.stroke();
      break;
    }
    case 'streetlight': {
      ctx.strokeStyle = '#3a3e46'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40); ctx.quadraticCurveTo(x, y - 46, x + 10, y - 46); ctx.stroke();
      ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(x + 11, y - 42); ctx.lineTo(x + 1, y); ctx.lineTo(x + 22, y); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#ffe89a'; ctx.beginPath(); ctx.ellipse(x + 11, y - 44, 4, 5, 0, 0, 7); ctx.fill();
      break;
    }
    case 'trafficcone': {
      ctx.fillStyle = '#e8621a'; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 8, y); ctx.lineTo(x - 8, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.moveTo(x - 4, y - 11); ctx.lineTo(x + 4, y - 11); ctx.lineTo(x + 5, y - 6); ctx.lineTo(x - 5, y - 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c94e10'; ctx.fillRect(x - 11, y - 2, 22, 3);
      break;
    }
    case 'car': {
      const cols = ['#c0392b', '#2a6ac0', '#3a9a4a', '#d0b040']; const bc = cols[r % 4];
      ctx.fillStyle = bc; roundRectPath(ctx, x - 22, y - 12, 44, 12, 4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 12, y - 12); ctx.lineTo(x - 6, y - 22); ctx.lineTo(x + 10, y - 22); ctx.lineTo(x + 15, y - 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#bfe0f0'; ctx.beginPath(); ctx.moveTo(x - 9, y - 13); ctx.lineTo(x - 5, y - 20); ctx.lineTo(x + 3, y - 20); ctx.lineTo(x + 3, y - 13); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#17171b'; ctx.beginPath(); ctx.arc(x - 12, y, 5, 0, 7); ctx.arc(x + 12, y, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#6a6a72'; ctx.beginPath(); ctx.arc(x - 12, y, 2, 0, 7); ctx.arc(x + 12, y, 2, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffe89a'; ctx.fillRect(x + 20, y - 8, 3, 3);
      break;
    }

    /* ---- Egypt (pyramid tomb) props ---- */
    case 'hieroglyph': {
      ctx.fillStyle = '#c6a75c'; ctx.fillRect(x - 9, y - 42, 18, 42);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + 4, y - 42, 5, 42);
      ctx.fillStyle = '#e6cd82'; ctx.fillRect(x - 11, y - 46, 22, 5);
      ctx.strokeStyle = '#7a5f2a'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(x, y - 35, 3, 0, Math.PI); ctx.moveTo(x - 3, y - 35); ctx.lineTo(x - 6, y - 31); ctx.stroke();   // eye of horus
      ctx.beginPath(); ctx.arc(x, y - 23, 2.6, 0, 7); ctx.moveTo(x, y - 20); ctx.lineTo(x, y - 13); ctx.moveTo(x - 3, y - 17); ctx.lineTo(x + 3, y - 17); ctx.stroke();   // ankh
      ctx.beginPath(); ctx.moveTo(x - 5, y - 7); ctx.quadraticCurveTo(x, y - 10, x + 5, y - 7); ctx.stroke();   // water glyph
      break;
    }
    case 'sarcophagus': {
      ctx.fillStyle = '#c9a24a'; roundRectPath(ctx, x - 12, y - 40, 24, 40, 11); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; roundRectPath(ctx, x + 3, y - 40, 9, 40, 11); ctx.fill();
      ctx.fillStyle = '#2a5a8a'; ctx.beginPath(); ctx.arc(x, y - 30, 8, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#e6c060'; ctx.beginPath(); ctx.ellipse(x, y - 26, 5, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2a5a8a'; ctx.fillRect(x - 5, y - 31, 10, 2);
      ctx.fillStyle = '#1a2a3a'; ctx.fillRect(x - 3, y - 27, 2, 2); ctx.fillRect(x + 1, y - 27, 2, 2);
      ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 7, y - 14); ctx.lineTo(x + 7, y - 10); ctx.moveTo(x + 7, y - 14); ctx.lineTo(x - 7, y - 10); ctx.stroke();
      break;
    }
    case 'urn': {
      ctx.fillStyle = '#b98a4a'; ctx.beginPath(); ctx.moveTo(x - 9, y - 20); ctx.quadraticCurveTo(x - 13, y - 8, x - 7, y); ctx.lineTo(x + 7, y); ctx.quadraticCurveTo(x + 13, y - 8, x + 9, y - 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.moveTo(x + 4, y - 20); ctx.quadraticCurveTo(x + 13, y - 8, x + 7, y); ctx.lineTo(x + 3, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d0a860'; ctx.fillRect(x - 9, y - 24, 18, 5);
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x - 9, y - 12, 18, 3);
      break;
    }

    /* ---- Atlantis (sunken city) props ---- */
    case 'seaweed': {
      const sway = Math.sin(performance.now() / 600 + r) * 5;
      ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.strokeStyle = i ? '#2f8a5a' : '#3aa86a';
        ctx.beginPath(); ctx.moveTo(x + i * 6, y); ctx.quadraticCurveTo(x + i * 6 + sway, y - 16, x + i * 6 + sway * 1.4, y - 32); ctx.stroke();
      }
      break;
    }
    case 'column': {
      ctx.fillStyle = '#9ab0b0'; ctx.fillRect(x - 8, y - 34, 16, 34);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x + 3, y - 34, 5, 34);
      ctx.strokeStyle = '#7a9090'; ctx.lineWidth = 1;
      for (let i = -6; i <= 6; i += 4) { ctx.beginPath(); ctx.moveTo(x + i, y - 33); ctx.lineTo(x + i, y - 1); ctx.stroke(); }
      ctx.fillStyle = '#b0c4c4'; ctx.fillRect(x - 11, y - 38, 22, 5); ctx.fillRect(x - 11, y - 3, 22, 4);
      ctx.fillStyle = 'rgba(60,150,90,0.5)'; ctx.beginPath(); ctx.ellipse(x - 5, y - 9, 5, 3, 0, 0, 7); ctx.ellipse(x + 6, y - 26, 4, 2.4, 0, 0, 7); ctx.fill();
      break;
    }
    case 'chest': {
      ctx.fillStyle = '#7a5230'; ctx.fillRect(x - 13, y - 14, 26, 14);
      ctx.fillStyle = '#8a6238'; ctx.beginPath(); ctx.moveTo(x - 13, y - 14); ctx.quadraticCurveTo(x, y - 25, x + 13, y - 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9962f'; ctx.fillRect(x - 13, y - 11, 26, 3); ctx.fillRect(x - 2, y - 17, 4, 11);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x, y - 8, 1.7, 0, 7); ctx.fill();
      break;
    }

    /* ---- Pompeii (doomed city) props ---- */
    case 'brokencolumn': {
      const ch = 24 + (r % 3) * 7;
      ctx.fillStyle = '#b6a488'; ctx.fillRect(x - 8, y - ch, 16, ch);          // ash-stained marble shaft
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + 3, y - ch, 5, ch);
      ctx.strokeStyle = '#8a7a60'; ctx.lineWidth = 1;
      for (let i = -6; i <= 6; i += 4) { ctx.beginPath(); ctx.moveTo(x + i, y - ch + 1); ctx.lineTo(x + i, y - 1); ctx.stroke(); }   // fluting
      ctx.fillStyle = '#c8b89c'; ctx.fillRect(x - 11, y - 4, 22, 4);           // base
      ctx.fillStyle = '#9a8a6e'; ctx.beginPath(); ctx.moveTo(x - 8, y - ch); ctx.lineTo(x - 3, y - ch - 5); ctx.lineTo(x + 1, y - ch); ctx.lineTo(x + 5, y - ch - 4); ctx.lineTo(x + 8, y - ch); ctx.closePath(); ctx.fill();   // snapped-off top
      break;
    }
    case 'statue': {
      ctx.fillStyle = '#8f8574'; ctx.fillRect(x - 12, y - 6, 24, 6);           // plinth
      ctx.fillStyle = '#a89e88'; ctx.fillRect(x - 7, y - 40, 14, 34);          // robed torso
      ctx.beginPath(); ctx.arc(x, y - 45, 6, 0, 7); ctx.fill();                // head
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x + 2, y - 40, 5, 34);
      ctx.strokeStyle = '#a89e88'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 5, y - 34); ctx.lineTo(x - 12, y - 42); ctx.stroke();   // raised arm
      ctx.strokeStyle = '#5a5040'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 2, y - 40); ctx.lineTo(x + 2, y - 28); ctx.lineTo(x - 1, y - 16); ctx.stroke();   // crack
      break;
    }
    case 'brazier': {
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x - 3, y - 18); ctx.moveTo(x + 7, y); ctx.lineTo(x + 3, y - 18); ctx.moveTo(x, y); ctx.lineTo(x, y - 18); ctx.stroke();   // tripod
      ctx.fillStyle = '#4a3524'; ctx.beginPath(); ctx.moveTo(x - 11, y - 20); ctx.lineTo(x + 11, y - 20); ctx.lineTo(x + 8, y - 26); ctx.lineTo(x - 8, y - 26); ctx.closePath(); ctx.fill();   // bowl
      const fl = 4 + Math.sin(performance.now() / 130 + r) * 3;
      const gg = ctx.createRadialGradient(x, y - 30, 1, x, y - 30, 16);
      gg.addColorStop(0, 'rgba(255,200,90,0.9)'); gg.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y - 30, 16, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffca4a'; ctx.beginPath(); ctx.ellipse(x, y - 30, 5, 8 + fl, 0, 0, 7); ctx.fill();
      break;
    }
    case 'lavacrack': {
      const pulse = 0.5 + 0.35 * Math.sin(performance.now() / 300 + r);
      const gg = ctx.createRadialGradient(x, y, 1, x, y, 22); gg.addColorStop(0, `rgba(255,120,40,${0.32 * pulse})`); gg.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fill();   // ground glow
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(255,${90 + Math.floor(70 * pulse)},30,0.85)`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - 16, y + 2); ctx.lineTo(x - 4, y - 4); ctx.lineTo(x + 6, y + 3); ctx.lineTo(x + 16, y - 2); ctx.stroke();
      ctx.strokeStyle = `rgba(255,225,130,${pulse})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x - 16, y + 2); ctx.lineTo(x - 4, y - 4); ctx.lineTo(x + 6, y + 3); ctx.lineTo(x + 16, y - 2); ctx.stroke();
      break;
    }

    /* ---- Ice Age props ---- */
    case 'campfire': {
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 10, y - 2); ctx.lineTo(x + 10, y - 6); ctx.moveTo(x - 10, y - 6); ctx.lineTo(x + 10, y - 2); ctx.stroke();   // crossed logs
      const fl = 4 + Math.sin(performance.now() / 120 + r) * 3;
      const gg = ctx.createRadialGradient(x, y - 12, 1, x, y - 12, 20);
      gg.addColorStop(0, 'rgba(255,200,90,0.85)'); gg.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y - 12, 20, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffca4a'; ctx.beginPath(); ctx.ellipse(x, y - 12, 6, 9 + fl, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.ellipse(x, y - 9, 3.6, 6, 0, 0, 7); ctx.fill();
      break;
    }
    case 'mammothskull': {
      ctx.fillStyle = '#e0d8c8'; ctx.beginPath(); ctx.ellipse(x, y - 14, 13, 11, 0, 0, 7); ctx.fill();   // dome
      ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.beginPath(); ctx.ellipse(x + 4, y - 14, 8, 10, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#141821'; ctx.beginPath(); ctx.arc(x - 5, y - 14, 3, 0, 7); ctx.arc(x + 5, y - 14, 3, 0, 7); ctx.fill();   // sockets
      ctx.strokeStyle = '#d0c4ac'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 9, y - 6); ctx.quadraticCurveTo(x - 22, y - 2, x - 22, y - 16); ctx.stroke();   // curling tusks
      ctx.beginPath(); ctx.moveTo(x + 9, y - 6); ctx.quadraticCurveTo(x + 22, y - 2, x + 22, y - 16); ctx.stroke();
      break;
    }

    /* ---- Dawn of Time props ---- */
    case 'meteor': {
      const pulse = 0.5 + 0.3 * Math.sin(performance.now() / 260 + r);
      ctx.fillStyle = '#3a2c26'; ctx.beginPath(); ctx.ellipse(x, y - 8, 13, 10, 0.3, 0, 7); ctx.fill();   // half-buried space rock
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 4, y - 8, 7, 9, 0.3, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(255,140,60,${pulse})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 8, y - 12); ctx.lineTo(x - 2, y - 6); ctx.lineTo(x + 6, y - 12); ctx.stroke();   // glowing fissures
      ctx.strokeStyle = `rgba(255,120,40,${0.5 * pulse})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(x, y - 2, 17, 5, 0, 0, 7); ctx.stroke();   // impact ring
      break;
    }

    /* ---- End of Time (machine future) props ---- */
    case 'hologram': {
      const now = performance.now(), flick = 0.55 + 0.25 * Math.sin(now / 160 + r);
      ctx.fillStyle = '#30323f'; ctx.beginPath(); ctx.ellipse(x, y - 3, 10, 4, 0, 0, 7); ctx.fill();   // projector base
      ctx.fillStyle = `rgba(80,240,200,${0.16 * flick})`;
      ctx.beginPath(); ctx.moveTo(x - 3, y - 5); ctx.lineTo(x - 13, y - 44); ctx.lineTo(x + 13, y - 44); ctx.lineTo(x + 3, y - 5); ctx.closePath(); ctx.fill();   // light cone
      ctx.strokeStyle = `rgba(90,250,210,${flick})`; ctx.lineWidth = 1.6;
      const gy = y - 30 + Math.sin(now / 420 + r) * 3;
      ctx.beginPath(); ctx.arc(x, gy, 8, 0, 7); ctx.stroke();                 // spinning globe
      ctx.beginPath(); ctx.ellipse(x, gy, 8, 3, 0, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, gy, 3.2 + 3 * Math.abs(Math.sin(now / 600 + r)), 8, 0, 0, 7); ctx.stroke();
      break;
    }
    case 'powercore': {
      const now = performance.now(), pulse = 0.5 + 0.4 * Math.sin(now / 220 + r);
      ctx.fillStyle = '#2c2c3c'; ctx.fillRect(x - 8, y - 30, 16, 30);          // housing
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 2, y - 30, 6, 30);
      ctx.fillStyle = '#3c3c50'; ctx.fillRect(x - 10, y - 34, 20, 5); ctx.fillRect(x - 10, y - 3, 20, 4);
      const gg = ctx.createRadialGradient(x, y - 17, 1, x, y - 17, 13);
      gg.addColorStop(0, `rgba(120,255,220,${0.9 * pulse})`); gg.addColorStop(1, 'rgba(60,220,180,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y - 17, 13, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(190,255,240,${pulse})`; ctx.beginPath(); ctx.ellipse(x, y - 17, 3.4, 8, 0, 0, 7); ctx.fill();   // energy column
      break;
    }
    case 'antenna': {
      const now = performance.now(), blink = (now / 700 + r) % 1 < 0.5;
      ctx.strokeStyle = '#4a4a5e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x, y - 40); ctx.lineTo(x + 8, y); ctx.stroke();   // lattice mast
      ctx.beginPath(); ctx.moveTo(x - 5, y - 12); ctx.lineTo(x + 5, y - 12); ctx.moveTo(x - 3, y - 24); ctx.lineTo(x + 3, y - 24); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,220,255,0.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, y - 44, 7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();   // broadcast arcs
      ctx.beginPath(); ctx.arc(x, y - 44, 11, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
      ctx.fillStyle = blink ? '#ff4a6a' : '#5a2030'; ctx.beginPath(); ctx.arc(x, y - 42, 2.4, 0, 7); ctx.fill();   // beacon
      break;
    }
  }
}

function drawDrop(ctx, dr, ox, oy) {
  const s = isoToScreen(dr.fx, dr.fy);
  const bob = Math.sin(performance.now() / 200 + dr.fx) * 3;
  const x = s.x + ox, y = s.y + oy - 14 + bob;
  if (dr.kind === 'ingredient') {
    const ing = (typeof INGREDIENTS !== 'undefined' && INGREDIENTS[dr.ing]) || { color: '#8ad07a' };
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 1, x, y, 11); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.4, ing.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill();     // glow
    ctx.fillStyle = ing.color;                                                    // faceted gem
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y - 1); ctx.lineTo(x + 3, y + 6); ctx.lineTo(x - 3, y + 6); ctx.lineTo(x - 5, y - 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.moveTo(x - 5, y - 1); ctx.lineTo(x + 5, y - 1); ctx.stroke();
    ctx.restore();
    return;
  }
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
  const now = performance.now();
  // sandworm boss: while burrowed it's just a mound of moving sand (no sprite)
  if (e.worm && e.state === 'burrow') { drawWormMound(ctx, x, y, scale, e); return; }
  // Backstabber vanished into shadow: only a faint shimmer + glowing eyes show
  if (e.backstabber && e.vanished) { drawBackstabberShimmer(ctx, x, y, scale, now); return; }
  shadowOval(ctx, x, y, 20 * scale, 8 * scale);
  const img = getSprite(e.fighter.id, e.fighter, e.facing || -1);
  const hurt = now < (e.hurtUntil || 0);
  const bob = Math.sin((e.animT || 0)) * 2 * scale;
  const w = 66 * scale, h = 80 * scale;
  // sandworm reared up and vulnerable — a bright gold aura marks your window to strike
  if (e.worm && !e.invuln) {
    const pulse = 0.5 + 0.4 * Math.sin(now / 150);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * pulse;
    const gr = ctx.createRadialGradient(x, y - h * 0.5, 6, x, y - h * 0.5, 46 * scale);
    gr.addColorStop(0, '#ffd23f'); gr.addColorStop(1, 'rgba(255,210,60,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y - h * 0.5, 42 * scale, 50 * scale, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  // Elite aura — a pulsing enchanted glow so tougher mobs stand out
  if (e.elite) {
    const pulse = 0.5 + 0.35 * Math.sin(now / 240 + e.fx);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * pulse;
    const gr = ctx.createRadialGradient(x, y - h * 0.45, 4, x, y - h * 0.45, 34 * scale);
    gr.addColorStop(0, '#b061ff'); gr.addColorStop(1, 'rgba(176,97,255,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y - h * 0.45, 30 * scale, 40 * scale, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  // Shadow clone — a dark, smoky aura so the decoys read as shadow, not the real one
  if (e.shadow) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4 + 0.2 * Math.sin(now / 200 + e.fx);
    const gr = ctx.createRadialGradient(x, y - h * 0.45, 4, x, y - h * 0.45, 30 * scale);
    gr.addColorStop(0, 'rgba(150,40,110,0.8)'); gr.addColorStop(1, 'rgba(90,20,70,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y - h * 0.45, 26 * scale, 36 * scale, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  // Poison boss — a sickly green aura and venom dripping off its bones
  if (e.poison) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now / 260);
    const gr = ctx.createRadialGradient(x, y - h * 0.5, 6, x, y - h * 0.5, 46 * scale);
    gr.addColorStop(0, 'rgba(140,240,90,0.7)'); gr.addColorStop(1, 'rgba(90,200,70,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y - h * 0.5, 40 * scale, 48 * scale, 0, 0, 7); ctx.fill();
    ctx.restore();
    for (let i = 0; i < 5; i++) {                       // dripping venom
      const ph = (now / 900 + i / 5) % 1, dx = ((i / 5) - 0.5) * w * 0.7;
      ctx.fillStyle = `rgba(150,240,90,${0.8 * (1 - ph)})`;
      ctx.beginPath(); ctx.ellipse(x + dx, y - h * 0.5 + ph * h * 0.5, 2.2, 4, 0, 0, 7); ctx.fill();
    }
  }
  if (img.complete && img.naturalWidth) {
    ctx.globalAlpha = (hurt ? 0.6 : 1) * (e.shadow ? 0.5 : 1);   // clones are translucent shadows
    ctx.drawImage(img, x - w / 2, y - h + 10 - bob, w, h);
    ctx.globalAlpha = 1;
    // additive gold flash on a BACK STAB
    if (now < (e.backstabUntil || 0)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (e.backstabUntil - now) / 260 * 0.9;
      ctx.drawImage(img, x - w / 2, y - h + 10 - bob, w, h); ctx.restore();
    }
  }
  // elite crown marker
  if (e.elite && !e.boss) { ctx.fillStyle = '#ffd23f'; ctx.font = `${Math.round(14 * scale)}px serif`; ctx.textAlign = 'center'; ctx.fillText('✦', x, y - h - 2 - bob); }
  // floating health bar for the true boss and the boss-rush mini-bosses
  if (e.boss || e.miniboss) return drawBossFloatingBar(ctx, e, x, y - h - 4 * scale);
}

/* The Backstabber while cloaked — a barely-there heat-shimmer and two red eyes.
   Spotting him early is the difference between a dodge and a backstab. */
function drawBackstabberShimmer(ctx, x, y, scale, now) {
  const h = 80 * scale;
  ctx.save();
  ctx.globalAlpha = 0.16 + 0.06 * Math.sin(now / 120);
  ctx.fillStyle = '#4a2050';
  ctx.beginPath(); ctx.ellipse(x, y - h * 0.5, 16 * scale, h * 0.5, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  const blink = (now % 2600) < 2300 ? 1 : 0.2;               // eyes flicker so you can catch them
  ctx.fillStyle = `rgba(255,40,70,${0.85 * blink})`;
  ctx.beginPath(); ctx.arc(x - 4 * scale, y - h * 0.62, 2 * scale, 0, 7); ctx.arc(x + 4 * scale, y - h * 0.62, 2 * scale, 0, 7); ctx.fill();
  ctx.restore();
}

function drawHero(ctx, h, ox, oy) {
  const s = isoToScreen(h.fx, h.fy);
  const x = s.x + ox, y = s.y + oy;
  const jz = h.jumpZ || 0;                 // hop height
  const sink = h.sinking ? (10 + (h.sinkLevel || 0) * 26) : 0;   // dragged under by sucking quicksand
  const submerged = h.submerged && !h.sinking && jz < 18;        // swimming
  const yb = y - jz + sink;                // body base y
  // shadow stays on the ground, shrinks while airborne
  shadowOval(ctx, x, y + sink, 20 * (1 - jz / 90), 8 * (1 - jz / 90));
  // Strength/Berserk potion: a pulsing gold aura + 💪 while the buff is active
  if (h.buffMs > 0) {
    const now2 = performance.now(), pulse = 0.5 + 0.4 * Math.sin(now2 / 140);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * pulse;
    const gr = ctx.createRadialGradient(x, yb - 34, 6, x, yb - 34, 42);
    gr.addColorStop(0, (h.buffMult >= 3 ? '#ff5a3a' : '#ffd23f')); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, yb - 34, 42, 0, 7); ctx.fill(); ctx.restore();
    ctx.font = '900 13px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💪', x, yb - 78); ctx.textAlign = 'left';
  }
  const img = getSprite('hero', { art: 'hero', palette: {} }, h.facing);
  const bob = (h.moving ? Math.sin(h.animT) * 3 : 0) + (submerged ? Math.sin(performance.now() / 400) * 2 : 0);
  const dodging = performance.now() < h.dodgeUntil;
  const hurt = performance.now() < h.hurtUntil;
  const rooted = performance.now() < h.rootedUntil;
  const aimScreen = isoDirToScreenAngle(h.faceAngle);
  const behind = Math.sin(aimScreen) < -0.2;
  if (behind) drawHeroWeapon(ctx, h, x, yb - 34, aimScreen);
  ctx.save();
  if (dodging) ctx.globalAlpha = 0.5;
  if (hurt) ctx.globalAlpha = 0.6;
  // clip the lower body when sunk in quicksand OR swimming (waterline at the waist)
  if (sink) { ctx.beginPath(); ctx.rect(x - 40, y - 80, 80, 60 + sink); ctx.clip(); }
  else if (submerged) { ctx.beginPath(); ctx.rect(x - 40, yb - 80, 80, 46); ctx.clip(); }
  if (img.complete && img.naturalWidth) ctx.drawImage(img, x - 33, yb - 70 - bob, 66, 80);
  ctx.restore();
  // swimming waterline: ripple ring at the waist
  if (submerged) {
    const wl = yb - 32 - bob;
    ctx.fillStyle = 'rgba(60,160,200,0.4)'; ctx.beginPath(); ctx.ellipse(x, wl, 22, 8, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, wl, 22, 8, 0, 0, 7); ctx.stroke();
    const rp = (performance.now() / 700) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.4 * (1 - rp)})`;
    ctx.beginPath(); ctx.ellipse(x, wl, 22 + rp * 16, 8 + rp * 5, 0, 0, 7); ctx.stroke();
  }
  if (rooted) { // vines wrapping the hero
    ctx.strokeStyle = '#3a5a2a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const yy = yb - 20 - i * 14; ctx.beginPath(); ctx.moveTo(x - 16, yy); ctx.quadraticCurveTo(x, yy - 6, x + 16, yy); ctx.stroke(); }
  }
  drawHeroShield(ctx, h, x, yb - 30 - bob);
  if (!behind) drawHeroWeapon(ctx, h, x, yb - 34 - bob, aimScreen);
}

/* The equipped shield on the hero's off-hand (prominent, shows wear). */
function drawHeroShield(ctx, h, x, y) {
  const id = STATE.equippedShield, s = SHIELDS[id];
  if (!s) return;
  const broken = (STATE.shields[id] || 0) <= 0;
  const flash = performance.now() < (h.shieldFlash || 0);
  const w = 20, ht = 26, sx = x - 20, sy = y;
  ctx.save(); ctx.translate(sx, sy);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -ht / 2); ctx.lineTo(w / 2, -ht / 2); ctx.lineTo(w / 2, 3);
  ctx.quadraticCurveTo(w / 2, ht / 2, 0, ht / 2 + 4); ctx.quadraticCurveTo(-w / 2, ht / 2, -w / 2, 3); ctx.closePath();
  ctx.fillStyle = broken ? '#5a5560' : (flash ? '#ffe08a' : '#b98a3a');
  ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = broken ? '#3a3540' : '#6a4a1a'; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -ht / 2 + 2); ctx.lineTo(0, ht / 2); ctx.stroke();
  if (broken) { ctx.strokeStyle = '#20141a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(3, 1); ctx.lineTo(-2, 9); ctx.stroke(); }
  ctx.restore();
}

/* Draw (and animate) the equipped weapon swinging from the hero's hand. */
const SWING_DUR = 200;
function drawHeroWeapon(ctx, h, hx, hy, aimScreen) {
  const now = performance.now();
  const swinging = now < h.swingUntil;
  let ang;
  if (swinging) {
    const p = 1 - (h.swingUntil - now) / SWING_DUR;   // 0..1 through the swing
    ang = aimScreen - 1.6 + p * 3.2;                   // broad sweep across the aim
    // motion-blur arc (wider + a touch larger to match the hit arc)
    ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - p)})`;
    ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(hx, hy, 37, aimScreen - 1.6, ang); ctx.stroke();
  } else {
    ang = aimScreen + 0.55;                            // resting pose, held ready
  }
  const wpn = WEAPONS[STATE.equippedWeapon] || { id: 'knife', art: 'knife' };
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  drawBladeShape(ctx, wpn);
  ctx.restore();
}
/* Draw the equipped weapon as a DISTINCT in-hand silhouette (hand at origin,
   blade extends toward +x). Accepts a weapon object; each family is unique and
   the blade is tinted by rarity with a glow for upgraded / high-rarity gear. */
function drawBladeShape(ctx, w) {
  if (typeof w === 'string') w = (WEAPONS && WEAPONS[w]) || { id: w, art: w };
  w = w || { id: 'knife', art: 'knife' };
  const fam = weaponFamily(w);
  const metal = weaponMetal(w);
  const glow = weaponGlowColor(w);
  const dark = '#2a3038', wood = '#6a4a2a', grip = '#4a3016', gold = '#c9962f';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 8; }

  // outlined filled polygon from a list of [x,y] points
  function poly(pts, fill) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = dark; ctx.stroke();
  }
  function bar(x0, y0, x1, y1, wid, color) {
    ctx.strokeStyle = color; ctx.lineWidth = wid;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }

  switch (fam) {
    case 'bow': {
      ctx.shadowBlur = glow ? 8 : 0;
      bar(0, 0, 8, 0, 4, wood);
      ctx.strokeStyle = wood; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(16, 0, 14, -1.6, 1.6); ctx.stroke();
      ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(16 + 14 * Math.cos(-1.6), 14 * Math.sin(-1.6)); ctx.lineTo(16 + 14 * Math.cos(1.6), 14 * Math.sin(1.6)); ctx.stroke();
      // nocked arrow
      bar(2, 0, 40, 0, 2.4, mixHex('#8a5a2a', metal, 0.3));
      poly([[40, -3], [47, 0], [40, 3]], metal);
      break;
    }
    case 'knife':
      bar(-6, 0, 4, 0, 6, grip);
      poly([[3, -3], [7, -4], [26, -2], [31, 0], [26, 3], [7, 4]], metal);
      break;
    case 'dagger':
      bar(-8, 0, 3, 0, 6, grip);
      ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(-9, 0, 3, 0, 7); ctx.fill();
      bar(3, -6, 3, 6, 3, gold);                       // crossguard
      poly([[4, -2], [16, -7], [30, 0], [16, 7], [4, 2]], metal); // leaf blade
      break;
    case 'twindagger':
      bar(-8, 0, 3, 0, 6, grip);
      bar(3, -6, 3, 6, 3, gold);
      poly([[4, -1], [14, -10], [30, -6], [26, -2], [12, 2]], metal);  // upper blade
      poly([[4, 1], [14, 10], [30, 6], [26, 2], [12, -2]], metal);     // lower blade
      break;
    case 'sword':
      bar(-9, 0, 6, 0, 6, grip);
      ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(-10, 0, 3, 0, 7); ctx.fill();
      bar(6, -9, 6, 9, 4, gold);                       // crossguard
      poly([[7, -4], [42, -3], [50, 0], [42, 3], [7, 4]], metal);  // broad blade
      bar(9, 0, 46, 0, 1.4, mixHex(metal, '#ffffff', 0.5));        // fuller
      break;
    case 'mace':
      bar(-9, 0, 30, 0, 7, wood);                      // haft
      ctx.fillStyle = metal;                           // spikes
      [-1.6, -1.05, -0.5, 0, 0.5, 1.05, 1.6].forEach(a => {
        const cx = 36 + Math.cos(a) * 9, cy = Math.sin(a) * 9;
        poly([[36, 0], [cx + Math.cos(a) * 7, cy + Math.sin(a) * 7], [cx, cy]], metal);
      });
      ctx.beginPath(); ctx.arc(36, 0, 9, 0, 7); ctx.fillStyle = metal; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = dark; ctx.stroke();
      ctx.beginPath(); ctx.arc(33, -3, 2.6, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
      break;
    case 'katana':
      ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 6;   // wrapped grip
      ctx.beginPath(); ctx.moveTo(-10, 1); ctx.lineTo(2, 0); ctx.stroke();
      ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(3, 0, 3.4, 0, 7); ctx.fill();
      ctx.beginPath();                                  // curved single-edge blade
      ctx.moveTo(4, 2); ctx.quadraticCurveTo(30, -6, 52, -14);
      ctx.quadraticCurveTo(34, -2, 6, -1); ctx.closePath();
      ctx.fillStyle = metal; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = dark; ctx.stroke();
      break;
    case 'masterblade':
      if (glow) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 12; }
      ctx.strokeStyle = '#4a2e12'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(-11, 1); ctx.lineTo(3, 0); ctx.stroke();
      ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(4, 0, 4, 0, 7); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(5, 2); ctx.quadraticCurveTo(34, -7, 60, -17);
      ctx.quadraticCurveTo(38, -2, 7, -1); ctx.closePath();
      ctx.fillStyle = metal; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = gold; ctx.stroke();
      bar(10, -1, 50, -11, 1.6, 'rgba(255,255,255,0.8)');
      break;
    case 'spear':
      bar(-10, 0, 40, 0, 4, wood);
      bar(40, -3, 40, 3, 4, gold);                     // binding
      poly([[40, -3], [52, -4], [60, 0], [52, 4], [40, 3]], metal); // leaf head
      break;
    case 'spikespear':
      bar(-10, 0, 38, 0, 4, wood);
      poly([[38, -2], [60, 0], [38, 2]], metal);       // long spike
      poly([[42, -2], [50, -9], [52, -4]], metal);     // back-swept barbs
      poly([[42, 2], [50, 9], [52, 4]], metal);
      break;
    case 'scythe':
      bar(-10, 0, 34, 0, 5, wood);
      bar(32, -3, 32, 3, 4, gold);                     // collar
      ctx.beginPath();                                  // big forward crescent
      ctx.moveTo(34, 2); ctx.quadraticCurveTo(40, -26, 64, -32);
      ctx.quadraticCurveTo(46, -14, 40, -1); ctx.closePath();
      ctx.fillStyle = metal; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = dark; ctx.stroke();
      break;
    case 'gun':
      bar(-8, 3, 2, 3, 6, grip);                        // grip
      poly([[-4, 0], [30, -1], [30, 3], [-4, 4]], '#3a3a44');   // barrel body
      poly([[28, -3], [36, -1], [36, 3], [28, 2]], metal);     // muzzle
      ctx.fillStyle = '#ffcf3f'; ctx.beginPath(); ctx.arc(36, 0, 2, 0, 7); ctx.fill();
      break;
    case 'bazooka':
      bar(-6, 2, 6, 2, 7, grip);
      poly([[-10, -6], [34, -6], [34, 6], [-10, 6]], '#454550');   // tube
      poly([[34, -8], [46, -3], [46, 3], [34, 8]], '#7a2a1a');     // wide muzzle
      ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.arc(-10, 0, 4, 0, 7); ctx.fill();
      ctx.fillStyle = metal; ctx.fillRect(4, -11, 6, 5);          // sight
      break;
    case 'club':
      bar(-8, 0, 14, 0, 6, grip);                       // haft into a stone head
      ctx.beginPath(); ctx.moveTo(12, -5); ctx.quadraticCurveTo(26, -12, 38, -6);
      ctx.quadraticCurveTo(44, 0, 38, 6); ctx.quadraticCurveTo(26, 12, 12, 5); ctx.closePath();
      ctx.fillStyle = '#8f9298'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = dark; ctx.stroke();
      ctx.fillStyle = '#6a6e76';
      [[26, -4], [33, 1], [24, 5]].forEach(([px, py]) => { ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 7); ctx.fill(); });
      ctx.beginPath(); ctx.arc(24, -5, 2.4, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
      break;
    case 'toothsword':
      bar(-9, 0, 6, 0, 6, grip);
      bar(6, -8, 6, 8, 4, '#8a6a3a');                   // bone crossguard
      poly([[7, -4], [42, -3], [50, 0], [42, 3], [7, 4]], metal);
      ctx.fillStyle = metal; ctx.strokeStyle = dark; ctx.lineWidth = 1.2;
      for (let tx = 10; tx <= 40; tx += 6) { ctx.beginPath(); ctx.moveTo(tx, 3.5); ctx.lineTo(tx + 2.6, 8); ctx.lineTo(tx + 5.2, 3.5); ctx.closePath(); ctx.fill(); ctx.stroke(); }   // shark teeth edge
      break;
    case 'whip':
      bar(-8, 0, 6, 0, 6, grip);
      ctx.strokeStyle = '#8a5a2a'; ctx.lineCap = 'round';
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(6, 0); ctx.quadraticCurveTo(20, -10, 32, -4); ctx.stroke();
      ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(32, -4); ctx.quadraticCurveTo(44, 3, 52, -2); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(52, -2); ctx.quadraticCurveTo(58, -5, 62, -10); ctx.stroke();
      ctx.fillStyle = metal; ctx.beginPath(); ctx.arc(62, -10, 2, 0, 7); ctx.fill();   // stinger tip
      break;
    case 'pickaxe':
      bar(-9, 0, 26, 0, 5, wood);
      ctx.beginPath(); ctx.moveTo(16, -3); ctx.quadraticCurveTo(30, -14, 46, -8);   // curved head
      ctx.quadraticCurveTo(31, -8, 18, 1); ctx.closePath();
      ctx.fillStyle = metal; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = dark; ctx.stroke();
      poly([[46, -8], [54, -2], [45, -5]], metal);      // fore point
      poly([[16, -3], [6, -12], [14, -8]], metal);      // back point
      bar(20, -4, 24, 2, 3, gold);                      // binding
      break;
    case 'trident':
      bar(-10, 0, 40, 0, 4, gold);                      // golden shaft
      bar(40, -8, 40, 8, 3, metal);                     // crossbar
      poly([[40, -8], [56, -7], [40, -5]], metal);      // upper prong
      poly([[40, -1.6], [60, 0], [40, 1.6]], metal);    // centre prong
      poly([[40, 8], [56, 7], [40, 5]], metal);         // lower prong
      ctx.fillStyle = '#7fe0ff'; ctx.beginPath(); ctx.arc(40, 0, 2.6, 0, 7); ctx.fill();   // sea-gem
      break;
    case 'hook':
      bar(-8, 0, 6, 0, 6, grip);                        // rod grip
      bar(6, 0, 26, -6, 3, wood);                       // rod
      ctx.strokeStyle = '#c8ccd4'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(26, -6); ctx.quadraticCurveTo(36, -6, 40, 0); ctx.stroke();   // line
      ctx.strokeStyle = metal; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(44, 2, 7, -1.4, 2.6); ctx.stroke();                              // big hook
      poly([[38, 6], [34, 3], [39, 2]], metal);                                                 // barb
      break;
    case 'grenade':
      bar(-6, 0, 4, 0, 6, grip);                        // gripped in the fist
      ctx.beginPath(); ctx.ellipse(12, -2, 7, 8, 0, 0, 7);
      ctx.fillStyle = '#3f5a34'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = dark; ctx.stroke();
      ctx.strokeStyle = '#2c4022'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(6, -5); ctx.lineTo(18, -5); ctx.moveTo(6, 1); ctx.lineTo(18, 1); ctx.moveTo(12, -10); ctx.lineTo(12, 6); ctx.stroke();
      ctx.fillStyle = '#5a6a5a'; ctx.fillRect(9, -13, 6, 4);                                    // cap
      ctx.strokeStyle = gold; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(18, -13, 2.6, 0, 7); ctx.stroke();   // pin
      break;
    default:
      bar(-6, 0, 6, 0, 6, grip);
      poly([[7, -4], [40, -3], [48, 0], [40, 3], [7, 4]], metal);
  }
  ctx.shadowBlur = 0;
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
  const lives = document.getElementById('dun-lives');
  if (lives) lives.textContent = (STATE.extraLives || 0) > 0 ? '🌟×' + STATE.extraLives : '';
  const fill = document.getElementById('obj-fill');
  const cnt = document.getElementById('obj-count');
  if (fill) fill.style.width = clamp((d.progress || 0) * 100, 0, 100) + '%';
  if (d.chamberMode) {
    const label = document.querySelector('.obj-label');
    if (label) label.textContent = d.theme.lair && currentAct() === 3 ? 'The Final Showdown'
      : /^the /i.test(d.theme.name) ? 'Descend ' + d.theme.name : 'Descend the ' + d.theme.name;   // no "the The Ice Age"
    if (cnt) cnt.textContent = 'Chamber ' + Math.min(d.chambersCleared + 1, d.chamberList.length) + ' / ' + d.chamberList.length;
  } else {
    const reached = d.checkpoints.filter(c => c.reached).length;
    if (cnt) cnt.textContent = 'Checkpoint ' + reached + ' / ' + d.checkpoints.length;
  }
  updateWeaponHUD();
}
function updateWeaponHUD() {
  const d = DUNGEON; if (!d) return;
  const el = document.getElementById('dun-weapon');
  if (el) {
    const w = WEAPONS[STATE.equippedWeapon];
    const dur = STATE.weapons[STATE.equippedWeapon] || 0;
    el.innerHTML = `<span class="dw-name">🗡️ ${w.name}</span>
      <div class="dw-bar"><div class="dw-fill" style="width:${clamp(dur / w.durability * 100, 0, 100)}%"></div></div>`;
  }
  const sel = document.getElementById('dun-shield');
  if (sel) {
    const id = STATE.equippedShield, s = SHIELDS[id];
    if (s) {
      const sdur = STATE.shields[id] || 0;
      const broken = sdur <= 0;
      sel.innerHTML = `<span class="dw-name">🛡️ ${s.name} ${broken ? '<b class="sh-broken">BROKEN</b>' : sdur + '/' + s.durability}</span>
        <div class="dw-bar"><div class="dw-fill shield ${broken ? 'broken' : ''}" style="width:${clamp(sdur / s.durability * 100, 0, 100)}%"></div></div>`;
    } else sel.innerHTML = '';
  }
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
  const bd = BOSSES[d.bossId || d.theme.boss];
  const bonus = bd.reward + 40;
  earn(bonus);
  STATE.wins++;
  recordDefeat(bd.id);
  gainXp(25);
  clearRegion(d.regionId);              // unlock the next region
  // the reward modifier is only offered the FIRST time you clear a region
  if (!STATE.rewardedRegions) STATE.rewardedRegions = [];
  const firstClear = !STATE.rewardedRegions.includes(d.regionId);
  let mods = null;
  if (firstClear) {
    STATE.rewardedRegions.push(d.regionId);
    mods = rollModifiers(3);
    // Milestone hearts: every 3rd region you conquer for the first time grows
    // your heart bar (cap 12) — steady player growth to meet the rising tiers.
    if (STATE.rewardedRegions.length % 3 === 0 && STATE.maxHearts < 12) {
      STATE.maxHearts++;
      banner('💖 MILESTONE — your max hearts grew to ' + STATE.maxHearts + '!', 3000);
    }
  }
  const gotLife = maybeGrantExtraLife();   // transcendently-rare Legendary boss boon
  saveGame();
  Audio2.sfx.win();
  // Beating the Act 1 finale (the Backstabber) reveals his time machine → Act 2.
  if (d.regionId === 'secret' && currentAct() === 1) { showTimeMachine(); return; }
  // Beating the Act 2 finale: the Prime's dying sabotage flings you to Neptune → Act 3.
  if (d.regionId === 'secret' && currentAct() === 2) { showSabotage(); return; }
  // Beating the Act 3 finale (the Backstabber Omega) ends the saga — roll the epilogue.
  if (d.regionId === 'secret' && currentAct() === 3) { showVictoryEpilogue(); return; }
  showDungeonResult(true, bonus, mods, gotLife);
}
// Falling to 0 hearts is DEATH. An Extra Life (if you have one) cheats it and
// hauls you back on the spot. With NO lives left the run is over — there's no
// limping on from a checkpoint. You either restart the whole level from the
// very beginning, or bail out to the map.
function loseDungeon() {
  const d = DUNGEON; if (d.over) return;
  if ((STATE.extraLives || 0) > 0) return reviveDungeon();   // Extra Life revives you on the spot
  d.over = true; d.outcome = 'lose';
  STATE.losses++; saveGame();
  Audio2.sfx.lose();
  showDeathChoice();
}
// Out of lives: no checkpoint to fall back on. Restart the level or leave.
function showDeathChoice() {
  const d = DUNGEON;
  const region = d.regionId;
  const overlay = document.createElement('div');
  overlay.className = 'result-overlay';
  overlay.innerHTML = `
    <div class="result-card lose">
      <h2>💀 KNOCKED OUT</h2>
      <p>You're out of Extra Lives — no checkpoint to fall back on this time.</p>
      <p class="tip">Restart the level from the very beginning, or head back to the map.</p>
      <div class="result-btns">
        <button class="wide-btn" id="death-restart">↻ Restart level</button>
        <button class="wide-btn ghost" id="death-exit">⌂ Exit level</button>
      </div>
    </div>`;
  app().appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  overlay.querySelector('#death-restart').addEventListener('click', () => { Audio2.sfx.click(); stopDungeon(); startDungeon(region); });
  overlay.querySelector('#death-exit').addEventListener('click', () => { Audio2.sfx.click(); stopDungeon(); showScreen('map'); });
}
function reviveDungeon() {
  const d = DUNGEON, h = d.hero;
  STATE.extraLives = Math.max(0, (STATE.extraLives || 0) - 1); saveGame();
  h.hp = h.maxhp; h.hurtInvulnUntil = performance.now() + 2000;
  banner('🌟 1-UP! An Extra Life pulled you back from death!', 2800);
  Audio2.sfx.win();
  updateDungeonHUD();
}
function exitDungeon() {
  saveGame();
  stopDungeon();
  showScreen('map');
}

/* ---------- Mid-level Gear menu: switch weapons/shields, pauses the level ---------- */
function openGearMenu() {
  const d = DUNGEON; if (!d || d.over || d.paused) return;
  d.paused = true;
  const ov = document.createElement('div');
  ov.className = 'result-overlay show gear-overlay'; ov.id = 'gear-overlay';
  ov.innerHTML = `
    <div class="result-card gear-card">
      <h2>⚙️ GEAR</h2>
      <p class="tip">Swap your weapon or shield, then get back in there.</p>
      <div class="gear-sec">🧪 Potions</div>
      <div class="gear-grid" id="gear-potions"></div>
      <div class="gear-sec">Weapons</div>
      <div class="gear-grid" id="gear-weapons"></div>
      <div class="gear-sec">Shields</div>
      <div class="gear-grid" id="gear-shields"></div>
      <button class="wide-btn" id="gear-resume">▶ Resume</button>
    </div>`;
  app().appendChild(ov);
  renderGearLists();
  ov.querySelector('#gear-resume').addEventListener('click', closeGearMenu);
}
function renderGearLists() {
  const wg = document.getElementById('gear-weapons'), sg = document.getElementById('gear-shields');
  const pg = document.getElementById('gear-potions');
  if (pg) {
    const ids = usablePotionIds();
    pg.innerHTML = ids.length ? ids.map(id => {
      const it = ITEMS[id];
      const sub = it.type === 'heal' ? '+' + it.heal + '❤' : (it.dmgMult || 2) + '× damage';
      return `<button class="gear-item" data-use="${id}" style="--rc:${RARITY[it.rarity].color}">
        <div class="gi-art">${itemSVG(it.art)}</div>
        <div class="gi-name">${it.name}</div>
        <div class="gi-sub">×${STATE.items[id]} · ${sub}</div>
      </button>`;
    }).join('') : '<div class="gear-empty">No potions yet — brew some at the Brewery!</div>';
    pg.querySelectorAll('.gear-item[data-use]').forEach(btn => btn.addEventListener('click', () => {
      if (dungeonUseItem(btn.dataset.use)) { Audio2.sfx.click(); renderGearLists(); }
    }));
  }
  if (wg) {
    wg.innerHTML = Object.keys(STATE.weapons).map(id => {
      const w = WEAPONS[id], dur = STATE.weapons[id], eq = STATE.equippedWeapon === id, broken = dur <= 0;
      return `<button class="gear-item ${eq ? 'on' : ''} ${broken ? 'broken' : ''}" data-w="${id}" style="--rc:${RARITY[w.rarity].color}">
        <div class="gi-art">${weaponSVG(w)}</div>
        <div class="gi-name">${w.name}</div>
        <div class="gi-sub">${weaponDamage(id)}→${dur}${w.power ? ' · ' + powerLabel(w.power) : ''}</div>
        ${eq ? '<span class="gi-badge">Equipped</span>' : ''}${broken ? '<span class="gi-badge broken">Broken</span>' : ''}
      </button>`;
    }).join('');
    wg.querySelectorAll('.gear-item[data-w]').forEach(btn => btn.addEventListener('click', () => {
      STATE.equippedWeapon = btn.dataset.w; Audio2.sfx.click(); saveGame(); renderGearLists(); updateWeaponHUD();
    }));
  }
  if (sg) {
    sg.innerHTML = Object.keys(STATE.shields).map(id => {
      const s = SHIELDS[id], eq = STATE.equippedShield === id, dur = STATE.shields[id] || 0;
      return `<button class="gear-item ${eq ? 'on' : ''} ${dur <= 0 ? 'broken' : ''}" data-s="${id}" style="--rc:${RARITY[s.rarity].color}">
        <div class="gi-art">${shieldIcon('#b98a3a')}</div>
        <div class="gi-name">${s.name}</div>
        <div class="gi-sub">🛡️ ${dur}/${s.durability}</div>
        ${eq ? '<span class="gi-badge">Equipped</span>' : ''}
      </button>`;
    }).join('');
    sg.querySelectorAll('.gear-item[data-s]').forEach(btn => btn.addEventListener('click', () => {
      STATE.equippedShield = btn.dataset.s; Audio2.sfx.click(); saveGame(); renderGearLists(); updateWeaponHUD();
    }));
  }
}
function closeGearMenu() {
  const d = DUNGEON; const ov = document.getElementById('gear-overlay');
  if (!ov) return;
  ov.remove();
  if (d) { d.paused = false; d.lastT = performance.now(); }
  Audio2.sfx.click();
}
function showDungeonResult(won, bonus, mods, gotLife) {
  const d = DUNGEON;
  const overlay = document.createElement('div');
  overlay.className = 'result-overlay';
  overlay.innerHTML = `
    <div class="result-card ${won ? 'win' : 'lose'}">
      <h2>${won ? (d.theme.name + ' CLEARED!').toUpperCase() : 'YOU FELL'}</h2>
      ${won ? `
        <p>You reached the end of the ${d.theme.name} and felled <b>${BOSSES[d.bossId || d.theme.boss].name}</b>!</p>
        <p class="reward">+${bonus} ${coinSVG()}</p>
        <p class="unlock">🗺️ Region cleared!</p>
        ${gotLife ? `<p class="extralife">🌟 LEGENDARY BOON — <b>EXTRA LIFE!</b> (you now have ${STATE.extraLives})</p>` : ''}
        ${(mods && mods.length) ? `<div class="mod-pick">
          <div class="mod-title">✨ Choose a reward:</div>
          <div class="mod-row">${mods.map(m => `<button class="mod-btn" data-mod="${m.id}" style="--rc:${RARITY[m.rarity].color}"><span class="mod-ico">${m.icon}</span><b>${m.name}</b><small>${m.desc}</small><em class="mod-rar">${RARITY[m.rarity].name}</em></button>`).join('')}</div>
        </div>` : `<p class="tip">You've already claimed this region's reward.</p>`}
      ` : `
        <p>You didn't reach the end this time.</p>
        <p class="tip">Tip: keep moving, dodge, jump over traps, grab hearts, and bring healing food.</p>
      `}
      <div class="result-btns ${(won && mods && mods.length) ? 'hidden' : ''}" id="dun-navbtns">
        <button class="wide-btn" id="dun-retry">↻ Try again</button>
        <button class="wide-btn ghost" id="dun-home">⌂ Map</button>
      </div>
    </div>`;
  app().appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  const region = d.regionId;
  overlay.querySelector('#dun-retry').addEventListener('click', () => { Audio2.sfx.click(); stopDungeon(); startDungeon(region); });
  overlay.querySelector('#dun-home').addEventListener('click', () => { Audio2.sfx.click(); stopDungeon(); showScreen('map'); });
  if (won && mods && mods.length) {
    overlay.querySelectorAll('.mod-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = MODIFIERS.find(x => x.id === btn.dataset.mod);
        m.apply();
        if (!STATE.modifiers) STATE.modifiers = [];
        STATE.modifiers.push(m.id);
        saveGame();
        Audio2.sfx.win();
        overlay.querySelector('.mod-pick').innerHTML = `<div class="mod-gained">✨ Gained <b>${m.name}</b> — ${m.desc}!</div>`;
        overlay.querySelector('#dun-navbtns').classList.remove('hidden');
      });
    });
  }
}
