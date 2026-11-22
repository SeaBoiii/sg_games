// Big Two — SVG art shared by the 2D table, the hand, the 3D card textures and the hub card.
import { rk, st, RANKS } from './engine.js';
export { customerSVG, PATTERN_DEFS } from '../../kopi-master/js/art.js';

export const INK = '#2A1A12';
export const RED = '#D7263D';
export const GOLD = '#E2A93B';
export const FONT = "'Bricolage Grotesque', 'Segoe UI', system-ui, sans-serif";
export const CW = 100, CH = 140; // card size in SVG units
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
// suit shapes in a 100-unit box centred on 0,0 (♦ ♣ ♥ ♠)
export const SUIT_PATH = [
  'M0 -50Q15 -22 38 0Q15 22 0 50Q-15 22 -38 0Q-15 -22 0 -50z',
  circ(0, -23, 21) + circ(-23, 9, 21) + circ(23, 9, 21) + circ(0, 2, 13) + 'M-5 8Q-4 34 -19 49H19Q4 34 5 8z',
  'M0 44C-12 32 -48 10 -48 -14C-48 -34 -32 -46 -18 -46C-8 -46 -2 -40 0 -32C2 -40 8 -46 18 -46C32 -46 48 -34 48 -14C48 10 12 32 0 44z',
  'M0 -48C-12 -34 -48 -12 -48 10C-48 28 -34 36 -22 36C-12 36 -5 30 -3 26C-4 36 -10 44 -18 50H18C10 44 4 36 3 26C5 30 12 36 22 36C34 36 48 28 48 10C48 -12 12 -34 0 -48z',
];
export const suitColor = (s) => (s === 0 || s === 2 ? RED : INK);
export const pip = (s, x, y, size, flip = false) =>
  `<path d="${SUIT_PATH[s]}" transform="translate(${x} ${y}) scale(${size / 100})${flip ? ' rotate(180)' : ''}" fill="${suitColor(s)}"/>`;

const PIPS = {
  3: [[50, 30], [50, 70], [50, 110]],
  4: [[34, 32], [66, 32], [34, 108], [66, 108]],
  5: [[34, 32], [66, 32], [50, 70], [34, 108], [66, 108]],
  6: [[34, 32], [66, 32], [34, 70], [66, 70], [34, 108], [66, 108]],
  7: [[34, 32], [66, 32], [50, 51], [34, 70], [66, 70], [34, 108], [66, 108]],
  8: [[34, 32], [66, 32], [50, 51], [34, 70], [66, 70], [50, 89], [34, 108], [66, 108]],
  9: [[34, 30], [66, 30], [34, 56], [66, 56], [50, 70], [34, 84], [66, 84], [34, 110], [66, 110]],
  10: [[34, 30], [66, 30], [50, 44], [34, 56], [66, 56], [34, 84], [66, 84], [50, 96], [34, 110], [66, 110]],
};

// little emblems for the court cards
const CROWN = 'M-16 6L-19 -10L-9 -2L0 -14L9 -2L19 -10L16 6z';
const FLOWER = [0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-7" rx="5" ry="8" transform="rotate(${a})"/>`).join('');
const LEAF = 'M0 -14C9 -8 9 6 0 14C-9 6 -9 -8 0 -14z';

/** Card face as an SVG group in a 100×140 box. */
export function cardFace(id) {
  const r = rk(id), s = st(id), rank = RANKS[r];
  const col = suitColor(s);
  const top = id === 51;
  const idx = (flip) => `<g${flip ? ` transform="rotate(180 ${CW / 2} ${CH / 2})"` : ''}>
      <text x="13" y="31" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${rank === '10' ? 22 : 27}" letter-spacing="${rank === '10' ? -2 : 0}" fill="${col}">${rank}</text>
      ${pip(s, 13, 45, 15)}
    </g>`;
  let mid = '';
  if (PIPS[rank]) mid = PIPS[rank].map(([x, y]) => pip(s, x, y, 20, y > 72)).join('');
  else if (rank === 'A') mid = `${top ? `<circle cx="50" cy="70" r="31" fill="#FFF3D6" stroke="${GOLD}" stroke-width="4"/>` : ''}${pip(s, 50, 70, top ? 40 : 52)}`;
  else if (rank === '2') mid = `<circle cx="50" cy="70" r="26" fill="none" stroke="${GOLD}" stroke-width="3" stroke-dasharray="2 5" stroke-linecap="round"/>${pip(s, 50, 32, 20)}${pip(s, 50, 108, 20, true)}<text x="50" y="84" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="40" fill="${col}">2</text>`;
  else {
    const emblem = rank === 'K' ? `<path d="${CROWN}" fill="${GOLD}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
      : rank === 'Q' ? `<g fill="${GOLD}" stroke="${INK}" stroke-width="1.6">${FLOWER}</g><circle r="4" fill="${col}"/>`
      : `<path d="${LEAF}" fill="${GOLD}" stroke="${INK}" stroke-width="2"/><path d="M0 -10V12" stroke="${INK}" stroke-width="1.6"/>`;
    mid = `<rect x="25" y="20" width="50" height="100" rx="7" fill="#FFF3D6" stroke="${col}" stroke-width="2.5"/>
      <path d="M25 50h50M25 90h50" stroke="${GOLD}" stroke-width="2" stroke-dasharray="3 4"/>
      <g transform="translate(50 37)">${emblem}</g>
      <text x="50" y="84" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="34" fill="${col}">${rank}</text>
      ${pip(s, 50, 104, 15)}`;
  }
  return `<g class="face">
    <rect x="1.5" y="1.5" width="${CW - 3}" height="${CH - 3}" rx="10" fill="#FFFDF7" stroke="${top ? GOLD : INK}" stroke-width="${top ? 4 : 2.5}"/>
    ${r === 12 ? `<path d="M80 9l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="${GOLD}" stroke="${INK}" stroke-width="1.2"/>` : ''}
    ${mid}${idx(false)}${idx(true)}
  </g>`;
}

/** Card back: red with a gold diamond lattice and a plum-blossom medallion. */
export function cardBack() {
  let lattice = '';
  for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
    const x = 22 + col * 14 + (row % 2 ? 7 : 0), y = 24 + row * 15.5;
    if (x > 80 || Math.hypot(x - 50, y - 70) < 24) continue;
    lattice += `<path d="M${x} ${y - 4.5}l3.6 4.5-3.6 4.5-3.6-4.5z"/>`;
  }
  const petals = [0, 72, 144, 216, 288].map((a) => `<circle cx="0" cy="-8" r="6.5" transform="rotate(${a})"/>`).join('');
  return `<g class="back">
    <rect x="1.5" y="1.5" width="${CW - 3}" height="${CH - 3}" rx="10" fill="#FFFDF7" stroke="${INK}" stroke-width="2.5"/>
    <rect x="9" y="9" width="${CW - 18}" height="${CH - 18}" rx="6" fill="#9E0F27"/>
    <rect x="13" y="13" width="${CW - 26}" height="${CH - 26}" rx="4" fill="none" stroke="${GOLD}" stroke-width="2.2"/>
    <g fill="${GOLD}" opacity=".8">${lattice}</g>
    <circle cx="50" cy="70" r="19" fill="${GOLD}" stroke="#6E0A1B" stroke-width="2"/>
    <g transform="translate(50 70)" fill="#9E0F27">${petals}<circle r="5" fill="${GOLD}"/></g>
  </g>`;
}

export const cardSVG = (id, cls = '') =>
  `<svg class="card-svg ${cls}" viewBox="0 0 ${CW} ${CH}" aria-hidden="true">${id == null ? cardBack() : cardFace(id)}</svg>`;

export function orangeSVG(x = 0, y = 0, r = 10) {
  return `<g transform="translate(${x} ${y}) scale(${r / 10})">
    <circle r="10" fill="#F28C28" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="-3.4" cy="-3.6" r="2.6" fill="#FFC27A" opacity=".8"/>
    <path d="M0 -9.5c1 -3 4 -5 8 -4.6c-1.4 3.2 -4.6 4.8 -8 4.6z" fill="#3F8F3D" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
  </g>`;
}
export const orangeIcon = () => `<svg class="orange-ico" viewBox="-12 -16 24 28" aria-hidden="true">${orangeSVG(0, 0, 10)}</svg>`;

// ---------------- 2D table scene (viewBox 1000 × 560) ----------------
export const VIEW = { w: 1000, h: 560 };
export const TABLE = { cx: 500, cy: 372, rx: 446, ry: 178 };
// seat 0 is you (near edge), then anticlockwise: right, far, left
export const SEAT = [
  { x: 500, y: 640, fan: [500, 548], tag: [500, 520], bubble: [500, 470] },
  { x: 884, y: 232, fan: [768, 352], tag: [884, 156], bubble: [770, 150], scale: 0.58 },
  { x: 500, y: 132, fan: [500, 252], tag: [500, 22], bubble: [632, 70], scale: 0.52 },
  { x: 116, y: 232, fan: [232, 352], tag: [116, 156], bubble: [230, 150], scale: 0.58 },
];
export const PILE = { x: 500, y: 386 };

function lantern(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="sway" style="animation-delay:${x > 500 ? -1.7 : 0}s">
    <path d="M0 -60V-30" stroke="${INK}" stroke-width="3"/>
    <rect x="-14" y="-34" width="28" height="9" rx="2" fill="${GOLD}" stroke="${INK}" stroke-width="2.5"/>
    <ellipse cx="0" cy="0" rx="40" ry="30" fill="${RED}" stroke="${INK}" stroke-width="3"/>
    <path d="M-26 -22Q-36 0 -26 22M-10 -29Q-16 0 -10 29M10 -29Q16 0 10 29M26 -22Q36 0 26 22" fill="none" stroke="#A31027" stroke-width="2.5"/>
    <rect x="-14" y="25" width="28" height="9" rx="2" fill="${GOLD}" stroke="${INK}" stroke-width="2.5"/>
    <path d="M-8 34v26M0 34v30M8 34v26" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>
  </g></g>`;
}

function plaque(x, y, s = 1) {
  const petals = [0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-11" rx="7" ry="11" transform="rotate(${a})"/>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-38" y="-38" width="76" height="76" rx="6" transform="rotate(45)" fill="${RED}" stroke="${INK}" stroke-width="3"/>
    <rect x="-31" y="-31" width="62" height="62" rx="4" transform="rotate(45)" fill="none" stroke="${GOLD}" stroke-width="2.5"/>
    <g fill="${GOLD}" stroke="#8A5A12" stroke-width="1.5">${petals}</g><circle r="6" fill="#FFE08A" stroke="#8A5A12" stroke-width="1.5"/>
  </g>`;
}

function orangePlate(x, y) {
  const pts = [[-26, 4], [-8, 8], [10, 7], [27, 3], [-17, -8], [1, -7], [19, -9], [-6, -20], [11, -21]];
  return `<g transform="translate(${x} ${y})">
    <ellipse cx="0" cy="10" rx="50" ry="17" fill="#2A1A12" opacity=".18"/>
    <ellipse cx="0" cy="6" rx="48" ry="16" fill="#F7F1E3" stroke="${INK}" stroke-width="2.5"/>
    <ellipse cx="0" cy="5" rx="34" ry="10" fill="none" stroke="#2D6FD1" stroke-width="2"/>
    ${pts.map(([px, py]) => orangeSVG(px, py, 11)).join('')}
  </g>`;
}

function tartJar(x, y) {
  return `<g transform="translate(${x} ${y})">
    <ellipse cx="0" cy="26" rx="34" ry="9" fill="#2A1A12" opacity=".18"/>
    <rect x="-30" y="-14" width="60" height="40" rx="10" fill="#FFF8E6" fill-opacity=".55" stroke="${INK}" stroke-width="2.5"/>
    ${[[-14, 6], [6, 10], [-4, -3], [16, -2]].map(([tx, ty]) => `<g transform="translate(${tx} ${ty})"><ellipse rx="9" ry="6" fill="#E7B566" stroke="#8A5A22" stroke-width="1.5"/><ellipse cy="-1.5" rx="4.5" ry="3" fill="#C9781C"/></g>`).join('')}
    <rect x="-33" y="-24" width="66" height="13" rx="5" fill="${RED}" stroke="${INK}" stroke-width="2.5"/>
    <rect x="-12" y="-30" width="24" height="7" rx="3" fill="${GOLD}" stroke="${INK}" stroke-width="2"/>
  </g>`;
}

function angbao(x, y, rot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <rect x="-16" y="-24" width="32" height="48" rx="3" fill="${RED}" stroke="${INK}" stroke-width="2.2"/>
    <path d="M-16 -8L0 2L16 -8" fill="none" stroke="#A31027" stroke-width="2"/>
    <circle cx="0" cy="8" r="6.5" fill="${GOLD}" stroke="#8A5A12" stroke-width="1.5"/>
  </g>`;
}

/** Room, decorations and the table (everything that never moves). */
export function roomSVG() {
  const grille = [0, 1, 2, 3].map((i) => `<path d="M${36 + i * 38} 30v120" />`).join('') + '<path d="M18 90h160"/>';
  return `
    <rect x="-1000" y="-600" width="3000" height="814" fill="#F1E2C8"/>
    <rect x="-1000" y="-600" width="3000" height="814" fill="url(#bt-wall)" opacity=".5"/>
    <rect x="-1000" y="214" width="3000" height="1000" fill="#E3CDA9"/>
    <path d="M-1000 214H2000" stroke="#B9925E" stroke-width="6"/>
    <g transform="translate(250 12)">
      <rect x="0" y="0" width="196" height="170" rx="6" fill="#BFE0EA" stroke="${INK}" stroke-width="3.5"/>
      <path d="M0 110Q60 84 110 104T196 96V170H0z" fill="#9CCB9A" opacity=".6"/>
      <rect x="30" y="72" width="34" height="98" fill="#E8E1D2" opacity=".8"/><rect x="126" y="56" width="40" height="114" fill="#F3EDE1" opacity=".8"/>
      <g stroke="#E7E0D2" stroke-width="7" fill="none">${grille}</g>
      <g stroke="${INK}" stroke-width="1.5" fill="none" opacity=".35">${grille}</g>
      <rect x="-8" y="166" width="212" height="10" rx="3" fill="#D8C2A0" stroke="${INK}" stroke-width="2.5"/>
    </g>
    ${plaque(700, 90, 0.95)}
    ${lantern(62, 66, 0.9)}${lantern(938, 66, 0.9)}
    <path d="M0 6Q250 48 500 10T1000 6" fill="none" stroke="${GOLD}" stroke-width="4" stroke-dasharray="1 12" stroke-linecap="round"/>`;
}

export function tableSVG() {
  const { cx, cy, rx, ry } = TABLE;
  const trim = Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * Math.PI * 2;
    return `<circle cx="${(cx + Math.cos(a) * (rx - 16)).toFixed(1)}" cy="${(cy + Math.sin(a) * (ry - 10)).toFixed(1)}" r="3.4"/>`;
  }).join('');
  return `
    <ellipse cx="${cx}" cy="${cy + 46}" rx="${rx + 6}" ry="${ry + 8}" fill="#8F1024" stroke="${INK}" stroke-width="4"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#C8162F" stroke="${INK}" stroke-width="4"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 30}" ry="${ry - 20}" fill="url(#bt-cloth)"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 16}" ry="${ry - 10}" fill="none" stroke="${GOLD}" stroke-width="2.5"/>
    <g fill="${GOLD}">${trim}</g>
    <ellipse cx="${PILE.x}" cy="${PILE.y + 4}" rx="190" ry="88" fill="#A3112A" opacity=".45"/>
    ${orangePlate(cx - 330, cy + 54)}${tartJar(cx + 318, cy + 46)}${angbao(cx - 250, cy + 116, -14)}${angbao(cx - 226, cy + 122, 8)}`;
}

export const SCENE_DEFS = `
  <pattern id="bt-wall" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M30 0v60M0 30h60" stroke="#E2CDAA" stroke-width="2"/></pattern>
  <radialGradient id="bt-cloth" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#DE2A43"/><stop offset="1" stop-color="#C8162F"/></radialGradient>`;
