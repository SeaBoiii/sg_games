// Makan Trail — SVG art for the 2D board (and the hub card). Viewbox 1000 × 620.
import { SQUARES, DISHES, N } from './engine.js';

export const INK = '#2A1A12';
export const FONT = "'Bricolage Grotesque', 'Segoe UI', system-ui, sans-serif";
export const BOARD = { x: 12, y: 12, size: 596 };
export const CELL = BOARD.size / 9;
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Grid cell (col, row) of square i, clockwise from the top-left corner. */
export function cellOf(i) {
  if (i <= 8) return [i, 0];
  if (i <= 16) return [8, i - 8];
  if (i <= 24) return [8 - (i - 16), 8];
  return [0, 8 - (i - 24)];
}
/** Centre point of square i in SVG units. */
export function centre(i) {
  const [c, r] = cellOf(((i % N) + N) % N);
  return { x: BOARD.x + (c + 0.5) * CELL, y: BOARD.y + (r + 0.5) * CELL };
}

// ---------- dishes (drawn in a 48 × 48 box centred on 0,0) ----------
const plate = (rx = 21, ry = 9) => `<ellipse cx="0" cy="8" rx="${rx}" ry="${ry}" fill="#FFFFFF" stroke="${INK}" stroke-width="2"/>`;
const bowl = (fill) => `<path d="M-19 -2 h38 a19 15 0 0 1 -38 0z" fill="#FFFFFF" stroke="${INK}" stroke-width="2"/><ellipse cx="0" cy="-2" rx="19" ry="6" fill="${fill}" stroke="${INK}" stroke-width="2"/>`;
export const DISH_ART = {
  chickenrice: `${plate()}<path d="M-14 6 q0 -14 12 -14 q10 0 10 14z" fill="#FBF6E8" stroke="${INK}" stroke-width="1.8"/><g transform="translate(9 2) rotate(-15)"><rect x="-6" y="-7" width="12" height="13" rx="3" fill="#F6D7A0" stroke="${INK}" stroke-width="1.6"/><rect x="-6" y="-7" width="12" height="4" rx="2" fill="#E8B46B"/></g><circle cx="-16" cy="-3" r="3" fill="#D7263D" stroke="${INK}" stroke-width="1"/>`,
  laksa: `${bowl('#F08A3C')}<path d="M-12 -3 q4 -3 8 0 t8 0 t8 0" fill="none" stroke="#FFF1C9" stroke-width="2"/><circle cx="-7" cy="-2" r="2.5" fill="#D7263D"/><path d="M5 -4 l3 -3 l3 3" fill="#3F8F5B"/>`,
  satay: `${plate(22, 8)}${[-10, -2, 6].map((x) => `<g transform="translate(${x} 2) rotate(-35)"><line x1="0" y1="-14" x2="0" y2="14" stroke="#C9A16B" stroke-width="2"/>${[-8, -2, 4].map((y) => `<rect x="-3.5" y="${y}" width="7" height="5" rx="1.5" fill="#9E5A2A" stroke="${INK}" stroke-width="1"/>`).join('')}</g>`).join('')}<ellipse cx="15" cy="6" rx="6" ry="3.5" fill="#C9873A" stroke="${INK}" stroke-width="1.2"/>`,
  ckt: `${plate()}<path d="M-15 4 q6 -12 14 -4 q6 -10 15 2 q-8 6 -15 3 q-8 4 -14 -1z" fill="#6B3E26" stroke="${INK}" stroke-width="1.8"/><circle cx="-5" cy="-1" r="2.5" fill="#E88EA6"/><circle cx="6" cy="0" r="2" fill="#F2B134"/><path d="M-9 -3 h5 M2 -4 h5" stroke="#3F8F5B" stroke-width="2"/>`,
  nasilemak: `<path d="M0 -18 L20 8 L-20 8Z" fill="#7BAF6A" stroke="${INK}" stroke-width="2"/><path d="M-12 6 q0 -14 10 -14 q10 0 10 14z" fill="#FBF6E8" stroke="${INK}" stroke-width="1.6"/><ellipse cx="9" cy="2" rx="6" ry="5" fill="#FFF" stroke="${INK}" stroke-width="1.4"/><circle cx="9" cy="2" r="2.5" fill="#F2B134"/><path d="M-15 4 q3 -4 6 0" fill="#D7263D" stroke="${INK}" stroke-width="1.2"/>`,
  prata: `${plate()}<ellipse cx="-2" cy="1" rx="15" ry="7" fill="#E8B46B" stroke="${INK}" stroke-width="1.8"/><path d="M-12 0 q10 -4 20 0" fill="none" stroke="#C9873A" stroke-width="1.6"/><path d="M8 -8 a7 6 0 0 1 12 6 h-12z" fill="#F08A3C" stroke="${INK}" stroke-width="1.6"/>`,
  hokkienmee: `${plate()}<path d="M-15 4 q6 -12 14 -4 q6 -10 15 2 q-8 6 -15 3 q-8 4 -14 -1z" fill="#F2D06B" stroke="${INK}" stroke-width="1.8"/><path d="M-6 -3 q4 -6 8 0" fill="#F08A3C" stroke="${INK}" stroke-width="1.4"/><circle cx="12" cy="-1" r="3.5" fill="#B6D96A" stroke="${INK}" stroke-width="1.2"/>`,
  carrotcake: `${plate()}${[[-11, -2, '#FFF6E0'], [-3, 2, '#6B3E26'], [5, -3, '#FFF6E0'], [10, 3, '#6B3E26'], [-7, 5, '#6B3E26'], [2, 6, '#FFF6E0']].map(([x, y, c]) => `<rect x="${x - 4}" y="${y - 3}" width="8" height="6" rx="1.5" fill="${c}" stroke="${INK}" stroke-width="1.2"/>`).join('')}<path d="M-12 -6 l3 -2 M6 -8 l2 -3" stroke="#3F8F5B" stroke-width="2"/>`,
};
export const dishSVG = (k, scale = 1) => `<g transform="scale(${scale})">${DISH_ART[k]}</g>`;

/** A tingkat (stacked tiffin carrier) as a player token, centred on its base. */
export function tingkatSVG(color, s = 1) {
  return `<g transform="scale(${s})">
    <ellipse cx="0" cy="2" rx="13" ry="4" fill="rgba(0,0,0,.28)"/>
    ${[0, 1, 2].map((k) => `<rect x="-11" y="${-9 - k * 9}" width="22" height="9" rx="3" fill="${k % 2 ? '#F4F1EA' : color}" stroke="${INK}" stroke-width="2"/>`).join('')}
    <rect x="-12" y="-31" width="24" height="5" rx="2.5" fill="${color}" stroke="${INK}" stroke-width="2"/>
    <path d="M-13 -18 V-38 Q0 -46 13 -38 V-18" fill="none" stroke="#C9CED3" stroke-width="3"/>
  </g>`;
}

function hdbIcon(color) {
  let win = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) win += `<rect x="${-11 + c * 8}" y="${-16 + r * 8}" width="5" height="5" fill="#6C7A86"/>`;
  return `<rect x="-15" y="-22" width="30" height="34" fill="#F4EEE2" stroke="${INK}" stroke-width="2"/><rect x="-15" y="-22" width="30" height="6" fill="${color}" stroke="${INK}" stroke-width="2"/>${win}<rect x="-4" y="4" width="8" height="8" fill="${INK}"/>`;
}

const ICONS = {
  angbao: `<rect x="-11" y="-15" width="22" height="30" rx="3" fill="#D7263D" stroke="${INK}" stroke-width="2"/><path d="M-11 -9 q11 9 22 0" fill="none" stroke="#9E1B2C" stroke-width="2"/><circle cy="-4" r="5" fill="#F2B134" stroke="${INK}" stroke-width="1.5"/>`,
  erp: `<rect x="-20" y="-14" width="5" height="26" fill="#9AA3AD" stroke="${INK}" stroke-width="1.5"/><rect x="15" y="-14" width="5" height="26" fill="#9AA3AD" stroke="${INK}" stroke-width="1.5"/><rect x="-20" y="-18" width="40" height="8" rx="2" fill="#2D6FD1" stroke="${INK}" stroke-width="1.5"/><text y="-11.5" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="7" fill="#fff">ERP</text><circle cx="0" cy="0" r="3" fill="#D7263D"/>`,
  rain: `<path d="M-15 0 a8 8 0 0 1 4 -13 a10 10 0 0 1 18 1 a7 7 0 0 1 8 12z" fill="#8FA3B5" stroke="${INK}" stroke-width="2"/>${[-9, -1, 7].map((x) => `<path d="M${x} 5 l-3 8" stroke="#2D6FD1" stroke-width="2.5" stroke-linecap="round"/>`).join('')}`,
  mrt: `<rect x="-16" y="-15" width="32" height="24" rx="7" fill="#F4F6F8" stroke="${INK}" stroke-width="2"/><rect x="-12" y="-11" width="24" height="8" rx="2" fill="#33475C"/><rect x="-16" y="-1" width="32" height="3" fill="#D7263D"/><circle cx="-8" cy="5" r="2" fill="#FFE59A"/><circle cx="8" cy="5" r="2" fill="#FFE59A"/><path d="M-10 9 l-4 6 M10 9 l4 6" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  card: `<rect x="-12" y="-16" width="24" height="32" rx="4" fill="#FFF1C9" stroke="${INK}" stroke-width="2"/><text y="8" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="22" fill="#E8590C">?</text>`,
};
const LABEL = { angbao: '+$3', erp: '−$1', rain: 'Skip', mrt: 'Ride', card: 'Card' };
const FILL = { home: '#FFF6E0', hawker: '#FFFCF5', angbao: '#FCE4E7', erp: '#E3ECF7', rain: '#E6EBF0', mrt: '#E3F3E8', card: '#FFF1C9' };

/** One square, drawn at its grid cell. owner: player colour for home squares. */
export function squareSVG(i, owner = null) {
  const q = SQUARES[i];
  const [c, r] = cellOf(i);
  const x = BOARD.x + c * CELL, y = BOARD.y + r * CELL, s = CELL;
  const cx = x + s / 2, cy = y + s / 2;
  let inner = '';
  if (q.type === 'home') {
    inner = `<g transform="translate(${cx} ${cy - 6})">${hdbIcon(owner || '#C9C1B1')}</g><text x="${cx}" y="${y + s - 7}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="10.5" fill="${INK}">${esc(q.name.toUpperCase())}</text>`;
  } else if (q.type === 'hawker') {
    const stripes = Array.from({ length: 6 }, (_, k) => `<rect x="${x + k * (s / 6)}" y="${y}" width="${s / 6}" height="12" fill="${k % 2 ? '#FFFFFF' : '#D7263D'}"/>`).join('');
    const words = q.name.split(' ');
    const lines = q.name.length > 11 && words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [q.name];
    inner = `${stripes}<path d="M${x} ${y + 12} ${Array.from({ length: 6 }, (_, k) => `q${s / 12} 6 ${s / 6} 0`).join(' ')}" fill="#D7263D" opacity=".85"/>
      ${lines.map((l, k) => `<text x="${cx}" y="${y + 27 + k * 10}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="9.5" fill="${INK}">${esc(l)}</text>`).join('')}
      ${q.menu.map((d, k) => `<g transform="translate(${x + s * (0.2 + k * 0.3)} ${y + s - 13}) scale(.42)">${DISH_ART[d]}</g>`).join('')}`;
  } else {
    inner = `<g transform="translate(${cx} ${cy - 5})">${ICONS[q.type]}</g><text x="${cx}" y="${y + s - 6}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="10" fill="${INK}">${LABEL[q.type]}</text>`;
  }
  return `<g class="sq sq-${q.type}" data-i="${i}">
    <rect x="${x + 1.5}" y="${y + 1.5}" width="${s - 3}" height="${s - 3}" rx="7" fill="${FILL[q.type]}" stroke="${INK}" stroke-width="2.5"/>
    <g clip-path="url(#mt-cell-${i})">${inner}</g>
    <clipPath id="mt-cell-${i}"><rect x="${x + 1.5}" y="${y + 1.5}" width="${s - 3}" height="${s - 3}" rx="7"/></clipPath>
    <rect class="sq-hl" x="${x + 3}" y="${y + 3}" width="${s - 6}" height="${s - 6}" rx="6" fill="none" stroke-width="5" opacity="0"/>
  </g>`;
}

/** The middle of the board: a stylised Singapore with the logo. */
export function centreSVG() {
  const x = BOARD.x + CELL, y = BOARD.y + CELL, w = CELL * 7;
  return `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${w - 8}" rx="18" fill="#BFE3F2"/>
    <path d="M${x + 60} ${y + 190} C ${x + 70} ${y + 120} ${x + 150} ${y + 95} ${x + 210} ${y + 110} C ${x + 250} ${y + 80} ${x + 320} ${y + 90} ${x + 370} ${y + 140} C ${x + 410} ${y + 170} ${x + 405} ${y + 230} ${x + 370} ${y + 262} C ${x + 320} ${y + 300} ${x + 250} ${y + 290} ${x + 200} ${y + 300} C ${x + 140} ${y + 310} ${x + 80} ${y + 270} ${x + 60} ${y + 190}Z" fill="#8FCB7A" stroke="#4E8F45" stroke-width="4"/>
    <path d="M${x + 300} ${y + 300} q16 10 40 6" fill="none" stroke="#4E8F45" stroke-width="5" stroke-linecap="round"/>
    <circle cx="${x + 120}" cy="${y + 150}" r="4" fill="#4E8F45"/><circle cx="${x + 335}" cy="${y + 150}" r="4" fill="#4E8F45"/><circle cx="${x + 335}" cy="${y + 240}" r="4" fill="#4E8F45"/><circle cx="${x + 105}" cy="${y + 225}" r="4" fill="#4E8F45"/>
    <text x="${x + w / 2}" y="${y + 70}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="44" letter-spacing="-1" fill="${INK}">MAKAN <tspan fill="#D7263D">TRAIL</tspan></text>
    <text x="${x + w / 2}" y="${y + w - 30}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="14" letter-spacing="3" fill="#2F6B8C">EAT YOUR WAY ROUND THE ISLAND</text>`;
}

export function dieSVG(v) {
  const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  return `<rect x="-30" y="-30" width="60" height="60" rx="13" fill="#FFFCF5" stroke="${INK}" stroke-width="4"/>${(P[v] || []).map(([a, b]) => `<circle cx="${a * 15}" cy="${b * 15}" r="6.5" fill="${v === 1 ? '#D7263D' : INK}"/>`).join('')}`;
}

export function cardSVG(text) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const wd of words) { if ((cur + ' ' + wd).trim().length > 22) { lines.push(cur); cur = wd; } else cur = (cur + ' ' + wd).trim(); }
  if (cur) lines.push(cur);
  return `<rect x="-120" y="-70" width="240" height="140" rx="16" fill="#FFF1C9" stroke="${INK}" stroke-width="4"/>
    <text y="-38" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="16" letter-spacing="2" fill="#E8590C">KOPITIAM TALK</text>
    ${lines.map((l, k) => `<text y="${-8 + k * 22}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="18" fill="${INK}">${esc(l)}</text>`).join('')}`;
}
