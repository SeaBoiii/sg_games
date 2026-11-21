// Kiasu Quiz — SVG art for the 2D studio (and the hub card). Viewbox 1000 × 620.
import { customerSVG, PATTERN_DEFS } from '../../kopi-master/js/art.js';
import { CATEGORIES } from './questions.js';

export const INK = '#13202B';
export const FONT = "'Bricolage Grotesque', 'Segoe UI', system-ui, sans-serif";
export const BODY = "'DM Sans', 'Segoe UI', system-ui, sans-serif";
export const TILE_COLORS = ['#E0457B', '#2D6FD1', '#F2B134', '#2F9E5B'];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const SCREEN = { x: 178, y: 24, w: 796, h: 214 };
export const TILE = { x0: 178, y0: 254, w: 390, h: 86, gap: 16 };
export const tileXY = (i) => ({ x: TILE.x0 + (i % 2) * (TILE.w + TILE.gap), y: TILE.y0 + Math.floor(i / 2) * (TILE.h + 14) });

/** Greedy word wrap by approximate character width. */
export function wrap(text, maxChars, maxLines) {
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.length <= maxLines ? lines : null;
}
/** Fit text into a box: returns { lines, size }. */
export function fit(text, width, maxLines, maxSize, minSize) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    const lines = wrap(text, Math.floor(width / (size * 0.53)), maxLines);
    if (lines) return { lines, size };
  }
  return { lines: wrap(text, Math.floor(width / (minSize * 0.53)), 99), size: minSize };
}

export function studioSVG(P = 'kq-') {
  let rays = '';
  for (let i = 0; i < 24; i++) rays += `<path d="M0 0 L${Math.cos((i / 24) * Math.PI * 2) * 900} ${Math.sin((i / 24) * Math.PI * 2) * 900} L${Math.cos(((i + 0.5) / 24) * Math.PI * 2) * 900} ${Math.sin(((i + 0.5) / 24) * Math.PI * 2) * 900}Z" fill="${i % 2 ? '#0F5F6B' : '#0C4E59'}"/>`;
  let bulbs = '';
  const { x, y, w, h } = SCREEN;
  const step = 26;
  for (let bx = x + 14; bx < x + w - 6; bx += step) bulbs += `<circle class="bulb" style="--d:${((bx / step) % 4) * 0.2}s" cx="${bx}" cy="${y - 1}" r="4.5"/><circle class="bulb" style="--d:${(((bx / step) + 2) % 4) * 0.2}s" cx="${bx}" cy="${y + h + 1}" r="4.5"/>`;
  for (let by = y + 16; by < y + h - 6; by += step) bulbs += `<circle class="bulb" style="--d:${((by / step) % 4) * 0.2}s" cx="${x - 1}" cy="${by}" r="4.5"/><circle class="bulb" style="--d:${(((by / step) + 1) % 4) * 0.2}s" cx="${x + w + 1}" cy="${by}" r="4.5"/>`;
  let floor = '';
  for (let i = 0; i < 14; i++) floor += `<rect x="${i * 80 - 40}" y="560" width="40" height="60" fill="#F2B134" opacity=".18"/>`;
  return `
    <defs>${PATTERN_DEFS}
      <radialGradient id="${P}glow" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#13808F"/><stop offset="1" stop-color="#0A3B44"/></radialGradient>
      <linearGradient id="${P}screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16324A"/><stop offset="1" stop-color="#0D1E2E"/></linearGradient>
      <linearGradient id="${P}floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A2F37"/><stop offset="1" stop-color="#06222A"/></linearGradient>
    </defs>
    <rect width="1000" height="620" fill="url(#${P}glow)"/>
    <g class="rays" transform="translate(560 300)">${rays}</g>
    <rect width="1000" height="620" fill="url(#${P}glow)" opacity=".55"/>
    <rect y="548" width="1000" height="72" fill="url(#${P}floor)"/>${floor}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="url(#${P}screen)" stroke="#F2B134" stroke-width="5"/>
    <g class="bulbs" fill="#FFE59A">${bulbs}</g>`;
}

export function hostSVG(mood = 'happy') {
  return `<g class="host">
    <rect x="-34" y="70" width="68" height="200" rx="10" fill="#0A2F37" opacity=".6"/>
    <g transform="scale(.86)">${customerSVG('uncle', mood)}</g>
    <g transform="translate(42 14) rotate(-20)"><rect x="-6" y="-2" width="12" height="44" rx="5" fill="#2B2F36"/><circle r="13" fill="#3A3F47" stroke="#13202B" stroke-width="3"/><circle r="7" fill="#7A818C"/></g>
  </g>`;
}

const ICONS = {
  scroll: '<path d="M-11 -12h18a4 4 0 0 1 4 4v18a4 4 0 0 1 -4 4h-18a4 4 0 0 1 -4 -4v-18a4 4 0 0 1 4 -4z" fill="currentColor"/><path d="M-7 -5h12M-7 1h12M-7 7h8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
  pin: '<path d="M0 14c-8-9-11-14-11-19a11 11 0 0 1 22 0c0 5-3 10-11 19z" fill="currentColor"/><circle cy="-5" r="4" fill="#fff"/>',
  bowl: '<path d="M-13 -2h26a13 11 0 0 1-26 0z" fill="currentColor"/><path d="M-6 -6c0-4 3-4 3-8M2 -6c0-4 3-4 3-8" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  chat: '<path d="M-13 -11h26a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-14l-7 6v-6h-5a3 3 0 0 1-3-3v-12a3 3 0 0 1 3-3z" fill="currentColor"/><circle cx="-6" cy="-2" r="2" fill="#fff"/><circle cx="0" cy="-2" r="2" fill="#fff"/><circle cx="6" cy="-2" r="2" fill="#fff"/>',
  home: '<path d="M-13 -1l13-12 13 12v13h-9v-8h-8v8h-9z" fill="currentColor"/>',
};
export const catIcon = (cat) => ICONS[CATEGORIES[cat].icon];

/** The question board contents (inside the screen). */
export function questionSVG(q, n, total) {
  const { x, y, w, h } = SCREEN;
  const cat = CATEGORIES[q.cat];
  // two lines at a big size if possible, otherwise three smaller lines sitting a little lower
  let f = fit(q.q, w - 70, 2, 38, 30);
  if (f.lines.length > 2) f = fit(q.q, w - 70, 3, 30, 22);
  const lh = f.size * 1.16;
  const cy = y + (f.lines.length > 2 ? 128 : 122) - ((f.lines.length - 1) * lh) / 2;
  return `
    <g transform="translate(${x + 26} ${y + 30})"><rect x="-6" y="-17" width="${cat.name.length * 10.5 + 52}" height="34" rx="17" fill="${cat.color}"/><g transform="translate(14 0) scale(.75)" color="#fff">${ICONS[cat.icon]}</g>
      <text x="34" y="6" font-family="${FONT}" font-weight="800" font-size="16" letter-spacing="1.5" fill="#fff">${esc(cat.name.toUpperCase())}</text></g>
    <text x="${x + w - 26}" y="${y + 37}" text-anchor="end" font-family="${FONT}" font-weight="800" font-size="18" letter-spacing="1.5" fill="#F2B134">Q ${n} / ${total} · ${'★'.repeat(q.d)}<tspan fill="#3B5468">${'★'.repeat(3 - q.d)}</tspan></text>
    ${f.lines.map((l, i) => `<text x="${x + w / 2}" y="${cy + i * lh}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${f.size}" fill="#FFFFFF">${esc(l)}</text>`).join('')}`;
}

/** One answer tile. state: '', 'hidden', 'tried', 'right', 'wrong', 'picked' */
export function tileSVG(i, text, state = '', pollPct = null) {
  const { x, y } = tileXY(i);
  const { w, h } = TILE;
  const f = fit(text, w - 100, 2, 25, 17);
  const fill = state === 'right' ? '#2F9E5B' : state === 'wrong' ? '#D7263D' : '#FFFCF5';
  const ink = state === 'right' || state === 'wrong' ? '#fff' : INK;
  const lh = f.size * 1.12;
  return `<g transform="translate(${x} ${y})"><g class="tile t-${state || 'idle'}" data-i="${i}" style="cursor:pointer">
    <rect x="4" y="6" width="${w}" height="${h}" rx="20" fill="rgba(0,0,0,.35)"/>
    <rect class="tile-bg" width="${w}" height="${h}" rx="20" fill="${fill}" stroke="${INK}" stroke-width="4"/>
    ${pollPct != null ? `<rect x="4" y="${h - 14}" width="${Math.max(0, (w - 8) * pollPct / 100)}" height="10" rx="5" fill="${TILE_COLORS[i]}" opacity=".85"/><text x="${w - 16}" y="${h - 18}" text-anchor="end" font-family="${FONT}" font-weight="800" font-size="16" fill="${TILE_COLORS[i]}">${pollPct}%</text>` : ''}
    <circle cx="44" cy="${h / 2}" r="26" fill="${TILE_COLORS[i]}" stroke="${INK}" stroke-width="3.5"/>
    <text x="44" y="${h / 2 + 10}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="28" fill="#fff">${'ABCD'[i]}</text>
    ${f.lines.map((l, k) => `<text x="86" y="${h / 2 + f.size * 0.36 - ((f.lines.length - 1) * lh) / 2 + k * lh}" font-family="${BODY}" font-weight="700" font-size="${f.size}" fill="${ink}">${esc(l)}</text>`).join('')}
    ${state === 'tried' ? `<path d="M70 ${h / 2} H${w - 20}" stroke="#D7263D" stroke-width="5" stroke-linecap="round" opacity=".8"/>` : ''}
  </g></g>`;
}

/** A contestant podium with a buzzer dome. */
export function podiumSVG(p, x, w, state = '') {
  const lit = state === 'buzzed';
  const off = state === 'locked';
  return `<g transform="translate(${x} 470)"><g class="podium ${state}" data-p="${p.idx}">
    <ellipse cx="${w / 2}" cy="10" rx="${w * 0.2}" ry="9" fill="#2B2F36"/>
    <path class="dome" d="M${w / 2 - w * 0.16} 8 a${w * 0.16} ${w * 0.16} 0 0 1 ${w * 0.32} 0z" fill="${off ? '#5B646E' : p.color}" stroke="${INK}" stroke-width="3"/>
    ${lit ? `<circle cx="${w / 2}" cy="-2" r="${w * 0.3}" fill="#FFE59A" opacity=".55" class="halo"/>` : ''}
    <path d="M0 18 H${w} L${w - 12} 142 H12Z" fill="${off ? '#3A4652' : lit ? p.color : '#163B47'}" stroke="${lit ? '#FFE59A' : INK}" stroke-width="${lit ? 6 : 4}" stroke-linejoin="round"/>
    <rect x="10" y="26" width="${w - 20}" height="12" rx="6" fill="${p.color}" opacity="${off ? 0.35 : 1}"/>
    <text x="${w / 2}" y="68" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${p.name.length > 9 ? 18 : 22}" fill="#fff">${esc(p.name)}</text>
    <rect x="${w / 2 - 54}" y="80" width="108" height="44" rx="10" fill="#0A1A24" stroke="${p.color}" stroke-width="3"/>
    <text class="podium-score" x="${w / 2}" y="112" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="30" fill="#FFE59A">${p.score}</text>
  </g></g>`;
}
