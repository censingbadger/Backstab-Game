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

    default:
      return `${shadow}
        <rect x="38" y="60" width="24" height="36" rx="10" fill="${p.cloth}"/>
        <circle cx="50" cy="40" r="18" fill="${p.skin}"/>
        <circle cx="43" cy="40" r="2.6" fill="${eye}"/>
        <circle cx="57" cy="40" r="2.6" fill="${eye}"/>`;
  }
}
