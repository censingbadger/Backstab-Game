/* ============================================================
   BACK STAB — Vector Art (inline SVG)
   Polished cartoon characters, icons, and the half-heart health row.
   Everything is drawn in code so the game is fully self-contained
   (no image files, works offline).
   ============================================================ */

/* ---------- Health hearts (supports HALF hearts) ---------- */
function heartSVG(kind) {
  // kind: 'full' | 'half' | 'empty'
  const red = '#ff3b5c', dark = '#8a1230', empty = 'rgba(255,255,255,0.12)';
  const stroke = '#3a0a18';
  let fill;
  if (kind === 'full') fill = red;
  else if (kind === 'empty') fill = empty;
  const path = 'M16 29 C 4 20, 1 12, 6 7 C 10 3, 15 5, 16 9 C 17 5, 22 3, 26 7 C 31 12, 28 20, 16 29 Z';
  if (kind === 'half') {
    return `<svg class="heart" viewBox="0 0 32 32" aria-hidden="true">
      <defs><clipPath id="hl"><rect x="0" y="0" width="16" height="32"/></clipPath></defs>
      <path d="${path}" fill="${empty}" stroke="${stroke}" stroke-width="2"/>
      <path d="${path}" fill="${red}" stroke="none" clip-path="url(#hl)"/>
      <path d="${path}" fill="none" stroke="${stroke}" stroke-width="2"/>
    </svg>`;
  }
  return `<svg class="heart" viewBox="0 0 32 32" aria-hidden="true">
    <path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    ${kind === 'full' ? `<path d="M10 10 C 12 8, 14 9, 14 11" stroke="rgba(255,255,255,0.6)" stroke-width="2" fill="none" stroke-linecap="round"/>` : ''}
  </svg>`;
}

/* Render a full heart row for a health value out of a max (both in hearts). */
function renderHearts(current, max) {
  current = Math.max(0, current);
  let html = '<span class="hearts">';
  for (let i = 0; i < Math.ceil(max); i++) {
    const filled = current - i;
    if (filled >= 1) html += heartSVG('full');
    else if (filled >= 0.5) html += heartSVG('half');
    else html += heartSVG('empty');
  }
  html += '</span>';
  return html;
}

/* ---------- Small icons ---------- */
function coinSVG() {
  return `<svg class="icon coin" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#ffcf3f" stroke="#a86a12" stroke-width="2"/>
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="#a86a12" stroke-width="1.4"/>
    <text x="12" y="16" text-anchor="middle" font-size="9" font-weight="900" fill="#a86a12">B</text>
  </svg>`;
}
function swordIcon() {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 3 L11 11 L13 13 L21 5 Z" fill="#d7dde6" stroke="#5a6472" stroke-width="1.3"/>
    <path d="M4 20 L9 15 L11 17 L6 22 Z" fill="#8a6a3a" stroke="#5a4525" stroke-width="1.3"/>
    <rect x="8.3" y="12.7" width="4" height="2" transform="rotate(45 10 13)" fill="#b98a3a"/>
  </svg>`;
}
function shieldIcon(color) {
  color = color || '#8a5a3a';
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2 L20 5 V11 C20 17 16 20 12 22 C8 20 4 17 4 11 V5 Z" fill="${color}" stroke="#3a2a1a" stroke-width="1.5"/>
    <path d="M12 4 L12 20" stroke="rgba(255,255,255,0.25)" stroke-width="1.4"/>
  </svg>`;
}

/* ---------- Item art ---------- */
function itemSVG(art, color) {
  const c = color || '#cc5';
  switch (art) {
    case 'apple': return `<svg viewBox="0 0 40 40"><path d="M20 12 C10 6 6 16 8 24 C10 32 16 36 20 34 C24 36 30 32 32 24 C34 16 30 6 20 12Z" fill="#e0342f"/><path d="M20 12 C20 8 22 5 25 4" stroke="#6a3a1a" stroke-width="2" fill="none"/><path d="M21 10 C25 7 29 8 30 11 C26 12 22 12 21 10Z" fill="#4caf50"/></svg>`;
    case 'shroom': return `<svg viewBox="0 0 40 40"><path d="M8 20 C8 10 32 10 32 20 Z" fill="#c0392b"/><circle cx="14" cy="16" r="2" fill="#fff"/><circle cx="24" cy="15" r="2.4" fill="#fff"/><rect x="16" y="20" width="8" height="12" rx="3" fill="#efe4c8"/></svg>`;
    case 'stew': return `<svg viewBox="0 0 40 40"><path d="M6 20 H34 C34 30 28 34 20 34 C12 34 6 30 6 20Z" fill="#8a5a2a"/><ellipse cx="20" cy="20" rx="14" ry="4" fill="#c0392b"/><circle cx="15" cy="19" r="2" fill="#e08e3a"/><circle cx="24" cy="20" r="2" fill="#6aa84f"/></svg>`;
    case 'potion': return `<svg viewBox="0 0 40 40"><rect x="16" y="4" width="8" height="8" fill="#8a6a3a"/><path d="M14 12 H26 L30 24 C30 34 10 34 10 24Z" fill="#b061ff" opacity="0.85"/><ellipse cx="20" cy="26" rx="9" ry="4" fill="rgba(255,255,255,0.3)"/></svg>`;
    case 'cage': return `<svg viewBox="0 0 40 40"><rect x="8" y="10" width="24" height="24" rx="2" fill="none" stroke="#8a8f9a" stroke-width="2.4"/><path d="M14 10 V34 M20 10 V34 M26 10 V34 M8 18 H32 M8 26 H32" stroke="#8a8f9a" stroke-width="2"/><rect x="12" y="6" width="16" height="5" rx="2" fill="#6a6f7a"/></svg>`;
    default: return `<svg viewBox="0 0 40 40"><rect x="10" y="10" width="20" height="20" rx="4" fill="${c}"/></svg>`;
  }
}

/* ---------- Weapon identity helpers (shared by menu icons + in-game render) ----------
   Every weapon reads as its OWN silhouette. `art` keys are reused across many
   weapons, so classification keys off the weapon id/power/rarity instead. These
   helpers are global so the canvas renderer (drawBladeShape) and the SVG menu
   icons (weaponSVG) stay in sync. */
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = pa >> 16, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = pb >> 16, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}
// Classify a weapon (object OR art string) into a visual family.
function weaponFamily(w) {
  if (!w) return 'sword';
  if (typeof w === 'string') w = (typeof WEAPONS !== 'undefined' && WEAPONS[w]) || { id: w, art: w };
  const id = w.id || '';
  if (id === 'double_dagger') return 'twindagger';
  if (id === 'cracked_dagger') return 'dagger';
  if (id === 'old_knife' || id === 'knife') return 'knife';
  if (id === 'pastors_blade') return 'masterblade';
  if (id.indexOf('scythe') >= 0) return 'scythe';
  if (id === 'spiked_spear') return 'spikespear';
  if (id.indexOf('spear') >= 0) return 'spear';
  if (w.art === 'bow') return 'bow';
  if (w.art === 'gun' || w.power === 'gun') return 'gun';
  if (w.art === 'bazooka' || w.power === 'bazooka') return 'bazooka';
  if (w.art === 'katana') return 'katana';
  if (id.indexOf('mace') >= 0 || w.power === 'stun') return 'mace';
  return 'sword';
}
// Steel tinted toward the weapon's rarity colour (higher rarity = richer metal).
function weaponMetal(w) {
  if (typeof w === 'string') w = (typeof WEAPONS !== 'undefined' && WEAPONS[w]) || {};
  const rar = (typeof RARITY !== 'undefined' && w && RARITY[w.rarity]) || { key: 'C', color: '#b8c0cc' };
  const strength = { C: 0, U: 0.16, R: 0.26, E: 0.36, L: 0.5, T: 0.6 }[rar.key] || 0;
  return mixHex('#e4eef8', rar.color, strength);
}
// Glow colour for an upgraded / high-rarity weapon (null = no glow).
function weaponGlowColor(w) {
  if (typeof w === 'string') w = (typeof WEAPONS !== 'undefined' && WEAPONS[w]) || {};
  const lvl = (typeof weaponUpgradeLevel === 'function' && w && w.id) ? weaponUpgradeLevel(w.id) : 0;
  const rar = (typeof RARITY !== 'undefined' && w && RARITY[w.rarity]) || null;
  if (lvl >= 5) return '#ffd23f';
  if (lvl >= 3) return '#b061ff';
  if (lvl >= 1) return '#6cd8ff';
  if (rar && (rar.key === 'L' || rar.key === 'T')) return rar.color;
  if (rar && rar.key === 'E') return rar.color;
  return null;
}

// Per-family attack cadence (ms). Light blades are fast; heavy maces are slow.
// Returns { cool: swing cooldown, swing: swing-animation length }.
function weaponSpeed(w) {
  const fam = weaponFamily(w);
  const cool = {
    knife: 300, dagger: 300, twindagger: 300,
    katana: 400, masterblade: 430, sword: 470,
    spear: 520, spikespear: 540, bow: 520, scythe: 580, mace: 660,
  }[fam] || 470;
  return { cool, swing: Math.min(240, Math.round(cool * 0.5)) };
}

/* ---------- Weapon art (menu / shop / inventory icons) ----------
   Accepts a weapon OBJECT (preferred) or a bare art string. Each family gets a
   distinct silhouette; the blade is tinted by rarity. */
function weaponSVG(w) {
  const fam = weaponFamily(w);
  const blade = weaponMetal(w);
  const glow = weaponGlowColor(w);
  const st = '#3a424e', wood = '#7a5327', grip = '#5b3d1f', gold = '#c9962f';
  const filt = glow ? `<filter id="wg" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation="1.6" flood-color="${glow}" flood-opacity="0.9"/></filter>` : '';
  const g = glow ? ' filter="url(#wg)"' : '';
  function svg(inner) { return `<svg viewBox="0 0 40 40"><defs>${filt}</defs><g${g}>${inner}</g></svg>`; }
  switch (fam) {
    case 'knife':
      return svg(`<rect x="4" y="27" width="12" height="4" rx="2" transform="rotate(-42 10 29)" fill="${grip}"/>
        <path d="M12 26 L28 12 L33 12 L31 17 L17 31 Z" fill="${blade}" stroke="${st}" stroke-width="1.3"/>`);
    case 'dagger':
      return svg(`<rect x="4" y="28" width="11" height="4" rx="2" transform="rotate(-42 9 30)" fill="${grip}"/>
        <rect x="9" y="24" width="10" height="3" rx="1.5" transform="rotate(-42 14 25)" fill="${gold}"/>
        <path d="M15 25 Q23 11 32 6 Q31 16 20 30 Z" fill="${blade}" stroke="${st}" stroke-width="1.3"/>`);
    case 'twindagger':
      return svg(`<path d="M8 34 L20 22 L23 25 L11 37 Z" fill="${grip}"/>
        <path d="M18 24 Q28 12 36 8 Q33 18 24 30 Z" fill="${blade}" stroke="${st}" stroke-width="1.2"/>
        <path d="M6 8 Q14 20 18 30 Q9 27 4 16 Z" fill="${blade}" stroke="${st}" stroke-width="1.2" opacity="0.95"/>
        <rect x="3" y="30" width="10" height="3.4" rx="1.6" transform="rotate(42 8 32)" fill="${grip}"/>`);
    case 'sword':
      return svg(`<rect x="17.5" y="30" width="5" height="7" rx="1.5" fill="${grip}"/>
        <circle cx="20" cy="37" r="2.2" fill="${gold}"/>
        <rect x="11" y="27" width="18" height="3.4" rx="1.5" fill="${gold}"/>
        <path d="M20 3 L24 8 L24 27 L16 27 L16 8 Z" fill="${blade}" stroke="${st}" stroke-width="1.3"/>
        <line x1="20" y1="8" x2="20" y2="25" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>`);
    case 'mace':
      return svg(`<rect x="10" y="20" width="4" height="18" rx="2" transform="rotate(-32 12 29)" fill="${wood}"/>
        <g fill="${blade}" stroke="${st}" stroke-width="1.1">
          <path d="M27 6 L31 2 L31 8 Z"/><path d="M34 12 L40 12 L34 16 Z"/><path d="M27 6 L23 2 L21 7 Z"/>
          <path d="M20 8 L15 6 L20 12 Z"/><path d="M33 20 L38 24 L31 22 Z"/><path d="M24 20 L22 26 L28 22 Z"/></g>
        <circle cx="27" cy="13" r="8" fill="${blade}" stroke="${st}" stroke-width="1.4"/>
        <circle cx="24.5" cy="10.5" r="2.4" fill="rgba(255,255,255,0.55)"/>`);
    case 'katana':
      return svg(`<rect x="6" y="30" width="12" height="3.6" rx="1.6" transform="rotate(-42 12 32)" fill="#2b2b2b"/>
        <circle cx="17" cy="24" r="3" fill="${gold}"/>
        <path d="M18 24 Q28 12 37 5 Q39 8 36 11 Q27 19 21 27 Z" fill="${blade}" stroke="${st}" stroke-width="1.2"/>`);
    case 'masterblade':
      return svg(`<rect x="5" y="31" width="13" height="4" rx="2" transform="rotate(-42 11 33)" fill="#4a2e12"/>
        <circle cx="17" cy="24" r="3.4" fill="${gold}"/>
        <path d="M18 25 Q28 11 38 3 Q40 7 37 11 Q27 19 21 28 Z" fill="${blade}" stroke="${gold}" stroke-width="1.4"/>
        <path d="M20 24 Q28 14 35 8" stroke="rgba(255,255,255,0.7)" stroke-width="1.2" fill="none"/>
        <circle cx="34" cy="7" r="1.6" fill="#fff"/>`);
    case 'spear':
      return svg(`<rect x="18.5" y="12" width="3" height="26" rx="1.5" transform="rotate(-20 20 25)" fill="${wood}"/>
        <path d="M27 3 L31 13 L26 11 L24 15 L23 9 Z" fill="${blade}" stroke="${st}" stroke-width="1.2"/>
        <rect x="24" y="12" width="5" height="2.6" rx="1" transform="rotate(-20 26 13)" fill="${gold}"/>`);
    case 'spikespear':
      return svg(`<rect x="18.5" y="12" width="3" height="26" rx="1.5" transform="rotate(-20 20 25)" fill="${wood}"/>
        <path d="M28 2 L30 14 L26 12 Z" fill="${blade}" stroke="${st}" stroke-width="1.1"/>
        <path d="M26 12 L19 10 L25 15 Z" fill="${blade}" stroke="${st}" stroke-width="1"/>
        <path d="M28 12 L34 12 L28 16 Z" fill="${blade}" stroke="${st}" stroke-width="1"/>`);
    case 'scythe':
      return svg(`<rect x="20" y="8" width="3.2" height="30" rx="1.6" transform="rotate(-8 21 23)" fill="${wood}"/>
        <path d="M23 9 Q9 8 5 20 Q13 12 22 15 Z" fill="${blade}" stroke="${st}" stroke-width="1.3"/>
        <rect x="19" y="11" width="6" height="2.6" rx="1" fill="${gold}"/>`);
    case 'bow':
      return svg(`<path d="M12 4 C28 12 28 28 12 36" fill="none" stroke="${wood}" stroke-width="3"/>
        <line x1="12" y1="4" x2="12" y2="36" stroke="#eee" stroke-width="1"/>
        <path d="M12 20 H32 M28 17 L32 20 L28 23" stroke="${mixHex('#c0392b', blade, 0.2)}" stroke-width="1.8" fill="none"/>`);
    case 'gun':
      return svg(`<path d="M6 20 H30 L30 25 L14 25 L14 30 L9 30 L9 25 L6 25 Z" fill="${blade}" stroke="${st}" stroke-width="1.2"/>
        <rect x="26" y="16" width="8" height="5" rx="1.5" fill="#3a3a40"/>
        <circle cx="34" cy="18.5" r="1.4" fill="#ffcf3f"/>
        <rect x="9" y="25" width="6" height="8" rx="1.5" fill="${grip}"/>`);
    case 'bazooka':
      return svg(`<rect x="5" y="16" width="26" height="9" rx="4" fill="#4a4a52" stroke="${st}" stroke-width="1.2"/>
        <path d="M31 15 L37 18 L37 23 L31 26 Z" fill="#c0392b"/>
        <rect x="10" y="12" width="6" height="5" rx="1.5" fill="#2a2a30"/>
        <rect x="16" y="25" width="5" height="8" rx="1.5" fill="${grip}"/>
        <circle cx="8" cy="20.5" r="2" fill="#1a1a20"/>`);
    default:
      return weaponSVG({ id: 'aluminum_sword', art: 'sword', rarity: 'C' });
  }
}

/* ============================================================
   CHARACTERS — chunky cartoon fighters.
   characterSVG(fighter, opts) returns an <svg> string.
   fighter has .art and .palette. opts.facing = 1 (right) or -1 (left).
   ============================================================ */
function characterSVG(fighter, opts) {
  opts = opts || {};
  const facing = opts.facing || 1;
  const p = fighter.palette || { skin: '#cccccc', cloth: '#555555' };
  const inner = charBody(fighter.art, p);
  const flip = facing === -1 ? 'transform="scale(-1,1) translate(-100,0)"' : '';
  return `<svg class="char-svg" viewBox="0 0 100 120" preserveAspectRatio="xMidYMax meet">
    <g ${flip}>${inner}</g>
  </svg>`;
}

function charBody(art, p) {
  const eye = '#20242e';
  // Shared helpers as string builders
  const shadow = `<ellipse cx="50" cy="114" rx="26" ry="6" fill="rgba(0,0,0,0.25)"/>`;

  switch (art) {
    case 'hero': // the player
      return `${shadow}
        <rect x="42" y="60" width="16" height="34" rx="7" fill="#4a6ea5"/>
        <rect x="34" y="52" width="32" height="30" rx="12" fill="#5b82c0"/>
        <rect x="26" y="58" width="12" height="22" rx="6" fill="#5b82c0"/>
        <rect x="62" y="58" width="12" height="22" rx="6" fill="#5b82c0"/>
        <circle cx="50" cy="34" r="18" fill="#f0c69a"/>
        <path d="M32 30 C34 14 66 14 68 30 C60 24 40 24 32 30Z" fill="#5a3a24"/>
        <circle cx="43" cy="34" r="2.6" fill="${eye}"/>
        <circle cx="57" cy="34" r="2.6" fill="${eye}"/>
        <path d="M44 42 Q50 46 56 42" stroke="#7a4a2a" stroke-width="2" fill="none" stroke-linecap="round"/>
        <rect x="36" y="72" width="28" height="8" rx="3" fill="#b98a3a"/>`;

    case 'zombie':
      return `${shadow}
        <rect x="40" y="62" width="20" height="34" rx="6" fill="${p.cloth}"/>
        <rect x="24" y="60" width="14" height="10" rx="5" fill="${p.skin}"/>
        <rect x="62" y="60" width="14" height="10" rx="5" fill="${p.skin}"/>
        <circle cx="50" cy="40" r="19" fill="${p.skin}"/>
        <path d="M50 21 a19 19 0 0 1 0 38" fill="rgba(0,0,0,0.06)"/>
        <ellipse cx="43" cy="40" rx="3" ry="3.4" fill="#20301c"/>
        <ellipse cx="57" cy="40" rx="3" ry="3.4" fill="#20301c"/>
        <path d="M42 50 L46 47 L50 50 L54 47 L58 50" stroke="#20301c" stroke-width="2" fill="none"/>
        <path d="M34 34 l6 3" stroke="#3a4a2c" stroke-width="2"/>`;

    case 'skeleton':
      return `${shadow}
        <rect x="44" y="60" width="12" height="30" rx="4" fill="${p.skin}"/>
        <rect x="40" y="66" width="20" height="4" fill="${p.skin}"/>
        <rect x="40" y="72" width="20" height="4" fill="${p.skin}"/>
        <rect x="26" y="60" width="12" height="6" rx="3" fill="${p.skin}"/>
        <rect x="62" y="60" width="12" height="6" rx="3" fill="${p.skin}"/>
        <circle cx="50" cy="40" r="18" fill="${p.skin}"/>
        <ellipse cx="43" cy="41" rx="4" ry="5" fill="#2a2a30"/>
        <ellipse cx="57" cy="41" rx="4" ry="5" fill="#2a2a30"/>
        <path d="M47 50 l3 3 l3 -3" fill="#2a2a30"/>
        <path d="M42 55 h16 M44 55 v4 M48 55 v4 M52 55 v4 M56 55 v4" stroke="#2a2a30" stroke-width="1.6"/>`;

    case 'peasant':
      return `${shadow}
        <rect x="38" y="62" width="24" height="34" rx="8" fill="${p.cloth}"/>
        <rect x="24" y="60" width="14" height="12" rx="6" fill="${p.skin}"/>
        <rect x="62" y="60" width="14" height="12" rx="6" fill="${p.skin}"/>
        <circle cx="50" cy="38" r="17" fill="${p.skin}"/>
        <path d="M33 30 Q50 18 67 30 L64 24 Q50 16 36 24Z" fill="#7a5a3a"/>
        <path d="M40 38 l6 -2 M60 38 l-6 -2" stroke="#3a2a1a" stroke-width="2"/>
        <circle cx="44" cy="40" r="2.6" fill="${eye}"/>
        <circle cx="56" cy="40" r="2.6" fill="${eye}"/>
        <path d="M45 48 Q50 45 55 48" stroke="#5a2a1a" stroke-width="2" fill="none"/>`;

    case 'wolf':
      return `${shadow}
        <rect x="38" y="64" width="24" height="32" rx="9" fill="${p.skin}"/>
        <rect x="24" y="62" width="14" height="12" rx="6" fill="${p.skin}"/>
        <rect x="62" y="62" width="14" height="12" rx="6" fill="${p.skin}"/>
        <circle cx="50" cy="40" r="18" fill="${p.skin}"/>
        <path d="M34 28 L30 16 L44 26Z" fill="${p.skin}"/>
        <path d="M66 28 L70 16 L56 26Z" fill="${p.skin}"/>
        <path d="M50 48 L44 42 L56 42Z" fill="#2a2320"/>
        <ellipse cx="43" cy="38" rx="3" ry="3.4" fill="#ffd23f"/>
        <ellipse cx="57" cy="38" rx="3" ry="3.4" fill="#ffd23f"/>
        <path d="M44 52 l3 3 l3 -3 l3 3" stroke="#fff" stroke-width="1.6" fill="none"/>`;

    case 'bear':
      return `${shadow}
        <ellipse cx="50" cy="78" rx="22" ry="20" fill="${p.skin}"/>
        <circle cx="34" cy="34" r="8" fill="${p.skin}"/>
        <circle cx="66" cy="34" r="8" fill="${p.skin}"/>
        <circle cx="50" cy="44" r="20" fill="${p.skin}"/>
        <ellipse cx="50" cy="50" rx="9" ry="7" fill="#e8d8c0"/>
        <ellipse cx="50" cy="46" rx="3.4" ry="2.6" fill="#20140a"/>
        <circle cx="43" cy="40" r="2.6" fill="${eye}"/>
        <circle cx="57" cy="40" r="2.6" fill="${eye}"/>`;

    case 'mummy':
      return `${shadow}
        <rect x="38" y="62" width="24" height="34" rx="9" fill="${p.skin}"/>
        <rect x="24" y="60" width="14" height="12" rx="6" fill="${p.skin}"/>
        <rect x="62" y="60" width="14" height="12" rx="6" fill="${p.skin}"/>
        <circle cx="50" cy="40" r="18" fill="${p.skin}"/>
        <path d="M33 34 h34 M33 42 h34 M36 48 h28 M35 30 h30" stroke="${p.cloth}" stroke-width="3" opacity="0.7"/>
        <circle cx="44" cy="40" r="3" fill="#3a2a10"/>
        <circle cx="57" cy="41" r="3" fill="#3a2a10"/>`;

    case 'goo':
      return `${shadow}
        <path d="M22 96 C18 60 30 44 50 44 C70 44 82 60 78 96 C70 90 62 96 50 94 C38 92 30 90 22 96Z" fill="${p.skin}" opacity="0.92"/>
        <ellipse cx="42" cy="60" rx="4" ry="5" fill="#0d2a1a"/>
        <ellipse cx="60" cy="60" rx="4" ry="5" fill="#0d2a1a"/>
        <circle cx="41" cy="58" r="1.4" fill="#fff"/>
        <circle cx="59" cy="58" r="1.4" fill="#fff"/>
        <path d="M42 72 Q50 80 60 72" stroke="#0d2a1a" stroke-width="2.4" fill="none"/>
        <ellipse cx="45" cy="52" rx="10" ry="6" fill="rgba(255,255,255,0.25)"/>`;

    case 'phantom':
      return `${shadow}
        <path d="M28 96 C24 50 34 34 50 34 C66 34 76 50 72 96 L64 88 L58 96 L50 88 L42 96 L36 88Z" fill="${p.skin}" opacity="0.8"/>
        <ellipse cx="43" cy="52" rx="4" ry="6" fill="#3a4488"/>
        <ellipse cx="57" cy="52" rx="4" ry="6" fill="#3a4488"/>
        <path d="M44 66 Q50 62 56 66" stroke="#3a4488" stroke-width="2" fill="none"/>`;

    case 'squid':
      return `${shadow}
        <ellipse cx="50" cy="46" rx="20" ry="24" fill="${p.skin}"/>
        <path d="M34 66 q-4 20 -8 28 M42 70 q-2 18 -4 26 M50 72 v28 M58 70 q2 18 4 26 M66 66 q4 20 8 28" stroke="${p.skin}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <circle cx="43" cy="44" r="5" fill="#fff"/><circle cx="43" cy="44" r="2.6" fill="#20140a"/>
        <circle cx="59" cy="44" r="5" fill="#fff"/><circle cx="59" cy="44" r="2.6" fill="#20140a"/>`;

    case 'pirate':
      return `${shadow}
        <rect x="38" y="62" width="24" height="34" rx="8" fill="${p.cloth}"/>
        <rect x="24" y="60" width="14" height="12" rx="6" fill="${p.skin}"/>
        <rect x="62" y="60" width="14" height="12" rx="6" fill="${p.skin}"/>
        <circle cx="50" cy="40" r="17" fill="${p.skin}"/>
        <path d="M31 32 h38 l-4 -8 h-30Z" fill="#20242e"/>
        <circle cx="50" cy="20" r="4" fill="#20242e"/>
        <rect x="39" y="38" width="9" height="6" fill="#20242e"/>
        <circle cx="57" cy="41" r="2.6" fill="${eye}"/>
        <path d="M45 50 Q50 48 55 50" stroke="#5a2a1a" stroke-width="2" fill="none"/>`;

    case 'fish':
      return `${shadow}
        <ellipse cx="46" cy="60" rx="26" ry="16" fill="${p.skin}"/>
        <path d="M72 60 L92 48 L88 60 L92 72Z" fill="${p.skin}"/>
        <path d="M24 60 L2 54 L6 60 L2 66Z" fill="#cfe0ee" stroke="#5a6472" stroke-width="1.4"/>
        <path d="M46 44 L52 30 L56 46Z" fill="${p.skin}"/>
        <circle cx="34" cy="56" r="4" fill="#fff"/><circle cx="34" cy="56" r="2" fill="#20140a"/>`;

    case 'yeti':
      return `${shadow}
        <ellipse cx="50" cy="74" rx="26" ry="24" fill="${p.skin}"/>
        <circle cx="30" cy="46" r="9" fill="${p.skin}"/>
        <circle cx="70" cy="46" r="9" fill="${p.skin}"/>
        <ellipse cx="50" cy="42" rx="22" ry="20" fill="${p.skin}"/>
        <ellipse cx="50" cy="50" rx="12" ry="8" fill="#dfeaf5"/>
        <circle cx="43" cy="38" r="3" fill="${eye}"/>
        <circle cx="57" cy="38" r="3" fill="${eye}"/>
        <path d="M44 48 h12 M46 48 v4 M50 48 v5 M54 48 v4" stroke="${eye}" stroke-width="1.6"/>`;

    case 'worm':
      return `${shadow}
        <path d="M26 96 C20 70 30 40 50 40 C70 40 80 70 74 96" fill="${p.skin}"/>
        <path d="M30 92 q20 6 40 0" stroke="${p.cloth}" stroke-width="3" fill="none"/>
        <path d="M32 78 q18 6 36 0 M34 64 q16 6 32 0" stroke="${p.cloth}" stroke-width="3" fill="none"/>
        <ellipse cx="50" cy="40" rx="18" ry="14" fill="#7a2a2a"/>
        <path d="M36 38 L44 44 M64 38 L56 44 M42 32 L48 40 M58 32 L52 40" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`;

    /* ---- bosses ---- */
    case 'bread':
      return `${shadow}
        <path d="M24 70 C18 40 30 30 50 30 C70 30 82 40 76 70 C76 84 62 92 50 92 C38 92 24 84 24 70Z" fill="${p.skin}"/>
        <path d="M34 44 q6 -6 12 0 M54 44 q6 -6 12 0" stroke="#a8781f" stroke-width="2" fill="none"/>
        <circle cx="42" cy="58" r="3.4" fill="${eye}"/>
        <circle cx="58" cy="58" r="3.4" fill="${eye}"/>
        <path d="M42 70 Q50 78 58 70" stroke="${eye}" stroke-width="2.4" fill="none"/>`;

    case 'dragon':
      return `${shadow}
        <rect x="40" y="62" width="20" height="34" rx="8" fill="${p.cloth}"/>
        <path d="M26 70 L10 60 L24 58Z" fill="${p.skin}"/>
        <path d="M74 70 L90 60 L76 58Z" fill="${p.skin}"/>
        <circle cx="50" cy="40" r="19" fill="${p.skin}"/>
        <path d="M36 24 L32 12 L44 22Z" fill="${p.skin}"/>
        <path d="M64 24 L68 12 L56 22Z" fill="${p.skin}"/>
        <path d="M42 48 L50 54 L58 48" stroke="#2a0a08" stroke-width="2.4" fill="#3a1410"/>
        <ellipse cx="43" cy="38" rx="3.2" ry="4" fill="#ffd23f"/>
        <ellipse cx="57" cy="38" rx="3.2" ry="4" fill="#ffd23f"/>`;

    case 'king':
      return `${shadow}
        <rect x="36" y="62" width="28" height="34" rx="8" fill="${p.cloth}"/>
        <rect x="22" y="60" width="14" height="14" rx="6" fill="#b8c0cc"/>
        <rect x="64" y="60" width="14" height="14" rx="6" fill="#b8c0cc"/>
        <circle cx="50" cy="42" r="18" fill="${p.skin}"/>
        <path d="M32 28 L36 16 L42 24 L50 14 L58 24 L64 16 L68 28Z" fill="#ffcf3f" stroke="#a86a12" stroke-width="1.4"/>
        <circle cx="43" cy="42" r="2.8" fill="${eye}"/>
        <circle cx="57" cy="42" r="2.8" fill="${eye}"/>
        <path d="M40 52 q10 6 20 0" stroke="#5a3a1a" stroke-width="2.4" fill="none"/>
        <path d="M40 52 q10 12 20 0" fill="#d8d8d8"/>`;

    case 'assassin':
      return `${shadow}
        <path d="M30 96 C26 46 36 28 50 28 C64 28 74 46 70 96 L60 90 L50 96 L40 90Z" fill="${p.cloth}"/>
        <ellipse cx="50" cy="44" rx="16" ry="17" fill="${p.skin}"/>
        <path d="M34 40 q16 -14 32 0 q-4 -20 -16 -20 q-12 0 -16 20Z" fill="${p.cloth}"/>
        <path d="M42 46 l6 2 M58 46 l-6 2" stroke="#ff3b5c" stroke-width="2"/>
        <ellipse cx="44" cy="47" rx="3" ry="2.6" fill="#ff3b5c"/>
        <ellipse cx="56" cy="47" rx="3" ry="2.6" fill="#ff3b5c"/>`;

    case 'tick':
      return `${shadow}
        <g stroke="${p.cloth}" stroke-width="3.4" stroke-linecap="round" fill="none">
          <path d="M42 74 L22 64 L12 68"/>
          <path d="M40 80 L16 78 L6 84"/>
          <path d="M40 86 L18 90 L9 100"/>
          <path d="M44 92 L30 100 L26 111"/>
          <path d="M58 74 L78 64 L88 68"/>
          <path d="M60 80 L84 78 L94 84"/>
          <path d="M60 86 L82 90 L91 100"/>
          <path d="M56 92 L70 100 L74 111"/>
        </g>
        <ellipse cx="50" cy="82" rx="25" ry="21" fill="${p.skin}"/>
        <ellipse cx="50" cy="77" rx="25" ry="18" fill="rgba(255,255,255,0.10)"/>
        <path d="M50 63 Q58 82 50 102" stroke="rgba(0,0,0,0.15)" stroke-width="3" fill="none"/>
        <path d="M34 78 Q50 70 66 78" stroke="rgba(0,0,0,0.12)" stroke-width="2.5" fill="none"/>
        <circle cx="50" cy="58" r="10" fill="${p.cloth}"/>
        <path d="M45 49 l-4 -6 M55 49 l4 -6" stroke="${p.cloth}" stroke-width="2.6" stroke-linecap="round"/>
        <circle cx="46" cy="57" r="2" fill="#ffce3f"/>
        <circle cx="54" cy="57" r="2" fill="#ffce3f"/>`;

    case 'scarecrow':
      return `${shadow}
        <rect x="46" y="58" width="8" height="44" fill="#6a4a2a"/>
        <rect x="26" y="62" width="48" height="6" rx="3" fill="#6a4a2a"/>
        <path d="M28 66 l-9 5 M28 70 l-9 1 M72 66 l9 5 M72 70 l9 1" stroke="#d9b24a" stroke-width="2.4"/>
        <rect x="38" y="54" width="24" height="34" rx="8" fill="${p.cloth}"/>
        <path d="M42 88 l-4 10 M50 90 l0 10 M58 88 l4 10" stroke="#d9b24a" stroke-width="2.4"/>
        <path d="M40 60 h20 M40 66 h20" stroke="#5a3a1a" stroke-width="1.4" opacity="0.5"/>
        <circle cx="50" cy="40" r="16" fill="${p.skin}"/>
        <path d="M40 44 h20" stroke="#5a3a1a" stroke-width="1.6" stroke-dasharray="2 2"/>
        <path d="M42 38 l6 5 M48 38 l-6 5" stroke="#2a1a08" stroke-width="2.6"/>
        <path d="M58 38 l-6 5 M52 38 l6 5" stroke="#2a1a08" stroke-width="2.6"/>
        <path d="M40 30 l-6 -5 M60 30 l6 -5 M50 26 l0 -7 M45 27 l-3 -6 M55 27 l3 -6" stroke="#d9b24a" stroke-width="2.4"/>
        <path d="M32 30 q18 -12 36 0 q-4 -4 -18 -4 q-14 0 -18 4Z" fill="#5a4020"/>
        <path d="M40 30 q10 -20 20 0Z" fill="#4a3418"/>`;

    case 'crab':
      return `${shadow}
        <g stroke="${p.cloth}" stroke-width="4" stroke-linecap="round" fill="none">
          <path d="M34 74 L18 70 L12 76"/><path d="M34 82 L16 82 L10 90"/><path d="M36 90 L20 94 L16 103"/>
          <path d="M66 74 L82 70 L88 76"/><path d="M66 82 L84 82 L90 90"/><path d="M64 90 L80 94 L84 103"/>
        </g>
        <path d="M30 70 L20 56 Q16 50 24 50 Q32 50 34 60 Z" fill="${p.skin}"/>
        <path d="M20 56 Q12 52 16 46 Q22 44 24 52 Z" fill="${p.cloth}"/>
        <path d="M70 70 L80 56 Q84 50 76 50 Q68 50 66 60 Z" fill="${p.skin}"/>
        <path d="M80 56 Q88 52 84 46 Q78 44 76 52 Z" fill="${p.cloth}"/>
        <ellipse cx="50" cy="78" rx="26" ry="19" fill="${p.skin}"/>
        <ellipse cx="50" cy="73" rx="26" ry="14" fill="rgba(255,255,255,0.12)"/>
        <path d="M34 76 Q50 70 66 76" stroke="${p.cloth}" stroke-width="2.5" fill="none" opacity="0.5"/>
        <path d="M37 49 L48 55 M63 49 L52 55" stroke="${p.cloth}" stroke-width="4" stroke-linecap="round"/>
        <rect x="41" y="58" width="4" height="9" rx="2" fill="${p.skin}"/><rect x="55" y="58" width="4" height="9" rx="2" fill="${p.skin}"/>
        <circle cx="43" cy="56" r="4.2" fill="#fff"/><circle cx="44.5" cy="57.5" r="2.4" fill="${eye}"/>
        <circle cx="57" cy="56" r="4.2" fill="#fff"/><circle cx="55.5" cy="57.5" r="2.4" fill="${eye}"/>
        <path d="M40 88 Q50 82 60 88" stroke="rgba(0,0,0,0.55)" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M43 86 l2.6 3 l3 -3 l3 3 l3 -3 l2.6 3" stroke="rgba(0,0,0,0.45)" stroke-width="1.8" fill="none"/>`;

    case 'shark':
      return `${shadow}
        <path d="M6 62 Q40 40 84 58 Q94 60 90 66 Q60 74 30 72 Q14 72 6 62 Z" fill="${p.skin}"/>
        <path d="M20 70 Q45 78 78 66 Q60 74 30 74 Q22 74 20 70 Z" fill="${p.cloth}"/>
        <path d="M52 44 L60 20 L70 48 Z" fill="${p.skin}"/>
        <path d="M84 58 L100 46 L98 60 L100 72 Z" fill="${p.skin}"/>
        <path d="M34 70 L28 88 L44 74 Z" fill="${p.skin}"/>
        <path d="M8 62 Q20 66 30 64 Q22 70 12 68 Q6 66 8 62 Z" fill="#2a1010"/>
        <path d="M10 63 L14 60 L14 64 L18 61 L18 65 L22 62 L22 66 L26 63" stroke="#fff" stroke-width="1.6" fill="none"/>
        <path d="M10 66 L14 68 L14 64 L18 69 L18 65 L22 68" stroke="#fff" stroke-width="1.6" fill="none"/>
        <circle cx="30" cy="58" r="3.4" fill="#10151a"/><circle cx="29" cy="57" r="1.1" fill="#fff"/>
        <path d="M40 66 q3 3 6 0 M50 68 q3 3 6 0" stroke="rgba(0,0,0,0.25)" stroke-width="1.6" fill="none"/>`;

    /* ===== ACT TWO — dinosaurs ===== */
    case 'raptor':
      return `${shadow}
        <path d="M14 70 Q4 66 4 56 Q14 62 24 64 Z" fill="${p.skin}"/>
        <ellipse cx="44" cy="72" rx="24" ry="14" fill="${p.skin}"/>
        <path d="M34 82 L30 108 L38 108 L42 84 Z" fill="${p.cloth}"/>
        <path d="M54 82 L50 108 L58 108 L62 84 Z" fill="${p.skin}"/>
        <path d="M60 62 Q80 52 92 44 L92 54 L98 58 L90 64 Q82 68 66 68 Z" fill="${p.skin}"/>
        <path d="M70 65 l4 0 l-1 4 l-4 0 Z M78 64 l4 0 l-1 4 l-4 0 Z M85 61 l4 0 l-1 4 l-4 0 Z" fill="#fff"/>
        <circle cx="78" cy="54" r="3.2" fill="#fff"/><circle cx="79" cy="54.5" r="1.6" fill="${eye}"/>
        <path d="M42 58 L50 46 L56 58 Z" fill="${p.cloth}"/>
        <path d="M40 84 l2 10 l4 -1 l-2 -8 Z" fill="#eee"/>`;

    case 'dino': // stegosaurus
      return `${shadow}
        <path d="M12 78 Q4 74 4 66 Q12 72 20 74 Z" fill="${p.skin}"/>
        <path d="M18 78 Q40 58 72 66 Q84 68 82 80 Q60 92 34 90 Q22 88 18 78 Z" fill="${p.skin}"/>
        <path d="M78 70 Q90 66 92 60 Q86 62 80 64 Z" fill="${p.skin}"/>
        <circle cx="84" cy="63" r="1.8" fill="${eye}"/>
        <g fill="${p.cloth}"><path d="M30 66 l6 -13 l6 13 Z"/><path d="M44 62 l7 -16 l7 16 Z"/><path d="M60 64 l6 -13 l6 13 Z"/></g>
        <path d="M10 76 l-6 -4 M11 80 l-7 0 M10 84 l-6 4" stroke="${p.cloth}" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="30" y="88" width="7" height="20" rx="3" fill="${p.cloth}"/><rect x="43" y="90" width="7" height="18" rx="3" fill="${p.skin}"/>
        <rect x="58" y="88" width="7" height="20" rx="3" fill="${p.cloth}"/><rect x="70" y="90" width="7" height="18" rx="3" fill="${p.skin}"/>`;

    case 'ptero': // pterodactyl
      return `${shadow}
        <path d="M50 66 Q20 44 6 54 Q26 60 34 72 Q22 70 16 78 Q36 76 50 74 Z" fill="${p.skin}"/>
        <path d="M50 66 Q80 44 94 54 Q74 60 66 72 Q78 70 84 78 Q64 76 50 74 Z" fill="${p.cloth}"/>
        <ellipse cx="50" cy="74" rx="11" ry="15" fill="${p.skin}"/>
        <circle cx="50" cy="52" r="9" fill="${p.skin}"/>
        <path d="M56 50 L80 45 L58 57 Z" fill="${p.skin}"/>
        <path d="M45 46 L36 40 L47 44 Z" fill="${p.cloth}"/>
        <circle cx="53" cy="50" r="2.6" fill="#fff"/><circle cx="53.5" cy="50.5" r="1.4" fill="${eye}"/>
        <path d="M45 88 l-3 14 M55 88 l3 14" stroke="${p.cloth}" stroke-width="3" stroke-linecap="round"/>`;

    case 'trex': // the Tyrant King (boss)
      return `${shadow}
        <path d="M14 72 Q2 68 2 56 Q14 64 26 64 Z" fill="${p.skin}"/>
        <path d="M26 66 Q24 90 36 100 L48 100 Q42 86 46 72 Z" fill="${p.cloth}"/>
        <ellipse cx="46" cy="62" rx="30" ry="20" fill="${p.skin}"/>
        <path d="M48 74 Q44 96 58 108 L72 108 Q64 92 66 74 Z" fill="${p.skin}"/>
        <path d="M58 100 l3 4 l3 -4 l3 4 l3 -4" stroke="#eee" stroke-width="2" fill="none"/>
        <path d="M60 44 Q84 36 98 42 L96 54 L100 58 L90 64 Q80 70 64 70 Q54 60 58 48 Z" fill="${p.skin}"/>
        <path d="M64 67 l5 0 l-2 5 l-5 0 Z M73 67 l5 0 l-2 5 l-5 0 Z M82 65 l5 0 l-2 5 l-5 0 Z" fill="#fff"/>
        <circle cx="82" cy="48" r="3.8" fill="#fff"/><circle cx="83" cy="48.5" r="1.9" fill="${eye}"/>
        <path d="M62 54 L52 62 L62 62 Z" fill="${p.cloth}"/>
        <path d="M40 56 L48 44 L54 56 Z" fill="${p.cloth}"/>`;

    /* ===== ACT TWO — the Old West ===== */
    case 'cowboy':
      return `${shadow}
        <rect x="42" y="64" width="16" height="28" rx="5" fill="#3a3a44"/>
        <rect x="39" y="90" width="10" height="8" rx="2" fill="#4a2f1a"/><rect x="51" y="90" width="10" height="8" rx="2" fill="#4a2f1a"/>
        <rect x="36" y="56" width="28" height="26" rx="7" fill="${p.cloth}"/>
        <path d="M50 57 L45 78 L50 82 L55 78 Z" fill="#d8c078"/>
        <circle cx="50" cy="42" r="12" fill="${p.skin}"/>
        <circle cx="45" cy="41" r="2" fill="${eye}"/><circle cx="55" cy="41" r="2" fill="${eye}"/>
        <path d="M44 47 q6 3 12 0" stroke="#5a3a22" stroke-width="2.5" fill="none"/>
        <path d="M30 35 Q50 27 70 35 Q50 31 30 35 Z" fill="#6a4a2a"/>
        <path d="M40 35 Q42 22 50 22 Q58 22 60 35 Z" fill="#7a5636"/>
        <rect x="61" y="66" width="13" height="5" rx="2" fill="#3a3a40"/><rect x="70" y="68" width="4" height="8" rx="1" fill="#3a3a40"/>`;

    case 'grandpa':
      return `${shadow}
        <rect x="42" y="64" width="16" height="28" rx="5" fill="${p.cloth}"/>
        <rect x="39" y="90" width="10" height="8" rx="2" fill="#2a2a30"/><rect x="51" y="90" width="10" height="8" rx="2" fill="#2a2a30"/>
        <rect x="36" y="54" width="28" height="26" rx="7" fill="#d8d2c4"/>
        <path d="M44 54 v26 M56 54 v26" stroke="#5a4a2a" stroke-width="2"/>
        <circle cx="50" cy="42" r="12" fill="${p.skin}"/>
        <path d="M38 40 Q40 30 50 29 Q60 30 62 40" stroke="#e8e4da" stroke-width="3" fill="none"/>
        <circle cx="45" cy="41" r="2" fill="${eye}"/><circle cx="55" cy="41" r="2" fill="${eye}"/>
        <path d="M40 47 Q50 55 60 47 Q54 51 50 51 Q46 51 40 47 Z" fill="#eee"/>
        <path d="M64 58 L74 94" stroke="#7a5028" stroke-width="3.5" stroke-linecap="round"/><path d="M74 60 q5 0 6 4" stroke="#7a5028" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;

    case 'train': // The Iron Horse (boss locomotive)
      return `${shadow}
        <path d="M14 92 L4 92 L14 72 Z" fill="#6a2a1a"/>
        <rect x="16" y="56" width="70" height="36" rx="7" fill="${p.skin}"/>
        <rect x="16" y="56" width="70" height="10" rx="5" fill="#7c7c88"/>
        <rect x="60" y="42" width="22" height="20" rx="4" fill="#43434c"/>
        <rect x="62" y="46" width="16" height="9" fill="#8fd0ff"/>
        <rect x="30" y="38" width="11" height="22" rx="2" fill="#3a3a42"/>
        <ellipse cx="35" cy="36" rx="9" ry="4" fill="rgba(40,40,48,0.8)"/>
        <circle cx="24" cy="72" r="7" fill="#ffcf3f"/><circle cx="24" cy="72" r="3.4" fill="#c01818"/>
        <path d="M18 84 q10 -6 20 0" stroke="#15151a" stroke-width="3" fill="none"/>
        <path d="M18 87 l4 -3 l4 3 l4 -3 l4 3 l4 -3 l4 3" stroke="#fff" stroke-width="1.6" fill="none"/>
        <circle cx="30" cy="96" r="8" fill="#26262c"/><circle cx="52" cy="96" r="10" fill="#26262c"/><circle cx="74" cy="96" r="8" fill="#26262c"/>
        <circle cx="30" cy="96" r="3" fill="#6a6a74"/><circle cx="52" cy="96" r="4" fill="#6a6a74"/><circle cx="74" cy="96" r="3" fill="#6a6a74"/>
        <rect x="16" y="74" width="70" height="4" fill="${p.cloth}"/>`;

    /* ===== ACT TWO — Present Day ===== */
    case 'soldier':
      return `${shadow}
        <rect x="42" y="64" width="16" height="28" rx="4" fill="${p.cloth}"/>
        <rect x="39" y="90" width="10" height="8" rx="2" fill="#26261e"/><rect x="51" y="90" width="10" height="8" rx="2" fill="#26261e"/>
        <rect x="36" y="54" width="28" height="26" rx="6" fill="${p.cloth}"/>
        <path d="M38 60 h24 M38 68 h24" stroke="#39442e" stroke-width="2" opacity="0.6"/>
        <circle cx="50" cy="42" r="11" fill="${p.skin}"/>
        <circle cx="45" cy="43" r="2" fill="${eye}"/><circle cx="55" cy="43" r="2" fill="${eye}"/>
        <path d="M38 41 a12 10 0 0 1 24 0 Z" fill="#3f4a33"/>
        <rect x="30" y="59" width="30" height="4" rx="1.5" fill="#26262c" transform="rotate(-8 45 61)"/>
        <rect x="55" y="56" width="9" height="4" rx="1" fill="#3a3a40" transform="rotate(-8 60 58)"/>`;

    case 'drone':
      return `${shadow}
        <g stroke="#26262c" stroke-width="2.6"><line x1="40" y1="74" x2="26" y2="66"/><line x1="60" y1="74" x2="74" y2="66"/></g>
        <ellipse cx="26" cy="66" rx="11" ry="2.6" fill="rgba(190,205,225,0.55)"/>
        <ellipse cx="74" cy="66" rx="11" ry="2.6" fill="rgba(190,205,225,0.55)"/>
        <ellipse cx="50" cy="78" rx="15" ry="9" fill="${p.skin}"/>
        <ellipse cx="50" cy="74" rx="15" ry="4" fill="#54545e"/>
        <rect x="46" y="85" width="8" height="6" rx="1.5" fill="${p.cloth}"/>
        <rect x="52" y="87" width="13" height="2.6" rx="1" fill="#26262c"/>
        <circle cx="50" cy="77" r="3.4" fill="#ff3b3b"/><circle cx="51" cy="76" r="1.3" fill="#fff"/>`;

    case 'jet':
      return `${shadow}
        <path d="M6 74 L70 68 Q94 68 98 75 Q94 82 70 82 L6 79 Z" fill="${p.skin}"/>
        <path d="M28 72 L50 52 L58 55 L44 74 Z" fill="${p.cloth}"/>
        <path d="M30 79 L48 94 L57 91 L46 79 Z" fill="${p.cloth}"/>
        <path d="M8 74 L1 66 L3 78 L1 84 Z" fill="${p.cloth}"/>
        <path d="M62 70 Q70 65 79 70 L74 75 L64 75 Z" fill="#8fd0ff"/>
        <path d="M98 75 L102 73 L102 77 Z" fill="#26262c"/>
        <rect x="38" y="77" width="16" height="3" rx="1.5" fill="#3a4656"/>
        <circle cx="6" cy="76" r="3" fill="#ff9a3a"/>`;

    case 'tank': // The Warhound (boss battle tank)
      return `${shadow}
        <rect x="10" y="82" width="80" height="15" rx="7" fill="#26291f"/>
        <g fill="#4a4e42"><circle cx="20" cy="89" r="6"/><circle cx="34" cy="89" r="6"/><circle cx="50" cy="89" r="6"/><circle cx="66" cy="89" r="6"/><circle cx="80" cy="89" r="6"/></g>
        <rect x="14" y="62" width="72" height="22" rx="5" fill="${p.skin}"/>
        <rect x="14" y="62" width="72" height="6" fill="#7a866c"/>
        <path d="M20 62 l6 -8 h46 l6 8 Z" fill="${p.cloth}"/>
        <rect x="18" y="70" width="6" height="7" rx="1" fill="#39412f"/><rect x="76" y="70" width="6" height="7" rx="1" fill="#39412f"/>
        <rect x="36" y="44" width="30" height="20" rx="5" fill="${p.skin}"/>
        <rect x="60" y="50" width="40" height="7" rx="3" fill="#39412f"/>
        <rect x="94" y="47" width="6" height="13" rx="2" fill="#262c1e"/>
        <rect x="40" y="49" width="22" height="7" rx="2" fill="#12140c"/>
        <circle cx="46" cy="52.5" r="2.6" fill="#ffd23f"/><circle cx="56" cy="52.5" r="2.6" fill="#ffd23f"/>`;

    /* ===== ACT TWO — Pyramids of Egypt ===== */
    case 'scarab':
      return `${shadow}
        <g stroke="${p.cloth}" stroke-width="3" stroke-linecap="round"><line x1="30" y1="72" x2="16" y2="66"/><line x1="30" y1="80" x2="14" y2="82"/><line x1="30" y1="86" x2="18" y2="95"/><line x1="70" y1="72" x2="84" y2="66"/><line x1="70" y1="80" x2="86" y2="82"/><line x1="70" y1="86" x2="82" y2="95"/></g>
        <ellipse cx="50" cy="78" rx="24" ry="17" fill="${p.skin}"/>
        <path d="M50 62 L50 94" stroke="${p.cloth}" stroke-width="2.5"/>
        <ellipse cx="42" cy="72" rx="7" ry="10" fill="rgba(255,255,255,0.16)"/>
        <ellipse cx="50" cy="68" rx="11" ry="9" fill="${p.cloth}"/>
        <circle cx="50" cy="56" r="8" fill="${p.cloth}"/>
        <path d="M45 50 q-4 -6 -1 -11 M55 50 q4 -6 1 -11" stroke="${p.cloth}" stroke-width="2.5" fill="none"/>
        <circle cx="46" cy="55" r="2" fill="#ffcf3f"/><circle cx="54" cy="55" r="2" fill="#ffcf3f"/>`;

    case 'jackal':
      return `${shadow}
        <rect x="42" y="64" width="16" height="28" rx="4" fill="${p.cloth}"/>
        <rect x="40" y="90" width="9" height="8" rx="2" fill="${p.skin}"/><rect x="51" y="90" width="9" height="8" rx="2" fill="${p.skin}"/>
        <rect x="37" y="54" width="26" height="24" rx="6" fill="${p.skin}"/>
        <rect x="37" y="56" width="26" height="4" fill="${p.cloth}"/>
        <path d="M42 34 L38 16 L47 30 Z" fill="${p.skin}"/><path d="M58 34 L62 16 L53 30 Z" fill="${p.skin}"/>
        <ellipse cx="50" cy="40" rx="9" ry="10" fill="${p.skin}"/>
        <path d="M50 42 L50 52 L58 49 Z" fill="${p.skin}"/>
        <circle cx="46" cy="40" r="1.8" fill="#ffcf3f"/><circle cx="54" cy="40" r="1.8" fill="#ffcf3f"/>
        <path d="M62 60 Q82 52 86 40 Q80 46 70 52" stroke="#c4c4cc" stroke-width="4" fill="none" stroke-linecap="round"/>`;

    case 'anubis': // boss: the jackal-god
      return `${shadow}
        <rect x="40" y="60" width="20" height="34" rx="5" fill="${p.cloth}"/>
        <rect x="36" y="90" width="12" height="9" rx="2" fill="${p.skin}"/><rect x="52" y="90" width="12" height="9" rx="2" fill="${p.skin}"/>
        <rect x="34" y="48" width="32" height="28" rx="6" fill="${p.skin}"/>
        <rect x="34" y="50" width="32" height="6" fill="${p.cloth}"/>
        <path d="M40 24 L34 2 L47 18 Z" fill="${p.skin}"/><path d="M60 24 L66 2 L53 18 Z" fill="${p.skin}"/>
        <ellipse cx="50" cy="30" rx="12" ry="13" fill="${p.skin}"/>
        <path d="M40 22 h20" stroke="${p.cloth}" stroke-width="3"/>
        <path d="M50 33 L50 47 L61 43 Z" fill="${p.skin}"/>
        <circle cx="45" cy="30" r="2.4" fill="#ff5a3a"/><circle cx="55" cy="30" r="2.4" fill="#ff5a3a"/>
        <rect x="70" y="18" width="4" height="74" rx="2" fill="${p.cloth}"/>
        <circle cx="72" cy="15" r="6" fill="none" stroke="${p.cloth}" stroke-width="3"/>
        <path d="M72 20 v9 M67 24 h10" stroke="${p.cloth}" stroke-width="3"/>`;

    default:
      return `${shadow}
        <rect x="38" y="60" width="24" height="36" rx="10" fill="${p.cloth}"/>
        <circle cx="50" cy="40" r="18" fill="${p.skin}"/>
        <circle cx="43" cy="40" r="2.6" fill="${eye}"/>
        <circle cx="57" cy="40" r="2.6" fill="${eye}"/>`;
  }
}
