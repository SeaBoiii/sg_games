// Cannot Say! — SVG art for the 2D studio (and the hub card). Viewbox 1000 × 620.
import { CATEGORIES } from './cards.js';

const INK = '#20142E';
const FONT = "'Bricolage Grotesque', 'Segoe UI', system-ui, sans-serif";
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const ICONS = {
  bowl: '<path d="M-13 -2h26a13 11 0 0 1-26 0z" fill="currentColor"/><path d="M-6 -6c0-4 3-4 3-8M2 -6c0-4 3-4 3-8" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  pin: '<path d="M0 14c-8-9-11-14-11-19a11 11 0 0 1 22 0c0 5-3 10-11 19z" fill="currentColor"/><circle cy="-5" r="4" fill="#fff"/>',
  chat: '<path d="M-13 -11h26a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-14l-7 6v-6h-5a3 3 0 0 1-3-3v-12a3 3 0 0 1 3-3z" fill="currentColor"/><circle cx="-6" cy="-2" r="2" fill="#fff"/><circle cx="0" cy="-2" r="2" fill="#fff"/><circle cx="6" cy="-2" r="2" fill="#fff"/>',
  home: '<path d="M-13 -1l13-12 13 12v13h-9v-8h-8v8h-9z" fill="currentColor"/>',
  train: '<rect x="-10" y="-14" width="20" height="22" rx="5" fill="currentColor"/><rect x="-6" y="-10" width="12" height="7" rx="1.5" fill="#fff"/><circle cx="-5" cy="3" r="2" fill="#fff"/><circle cx="5" cy="3" r="2" fill="#fff"/><path d="M-7 9l-4 6M7 9l4 6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
};

/** Split a phrase into one or two balanced lines. */
export function wrapWord(word, max = 12) {
  if (word.length <= max || !word.includes(' ')) return [word];
  let best = [word], bestD = 1e9;
  const parts = word.split(' ');
  for (let i = 1; i < parts.length; i++) {
    const a = parts.slice(0, i).join(' '), b = parts.slice(i).join(' ');
    const d = Math.max(a.length, b.length);
    if (d < bestD) { bestD = d; best = [a, b]; }
  }
  return best;
}
export const wordSize = (lines, width = 316, max = 62) => Math.min(max, Math.floor(width / (0.56 * Math.max(...lines.map((l) => l.length)))));

/** Card face, centred on 0,0, 360 × 440. */
export function cardFrontSVG(card) {
  const cat = CATEGORIES[card.cat];
  const lines = wrapWord(card.word);
  const fs = wordSize(lines);
  const wy = lines.length === 1 ? -88 : -112;
  return `
    <rect x="-186" y="-214" width="372" height="452" rx="26" fill="rgba(0,0,0,.35)"/>
    <rect x="-180" y="-220" width="360" height="440" rx="24" fill="#FFFCF5" stroke="${INK}" stroke-width="5"/>
    <path d="M-180 -196 a24 24 0 0 1 24 -24 h312 a24 24 0 0 1 24 24 v40 h-360z" fill="${cat.color}"/>
    <path d="M-180 -156 h360" stroke="${INK}" stroke-width="4"/>
    <g transform="translate(-146 -188)" color="#fff">${ICONS[cat.icon]}</g>
    <text x="-120" y="-180" font-family="${FONT}" font-weight="800" font-size="20" letter-spacing="2" fill="#fff">${esc(cat.name.toUpperCase())}</text>
    ${lines.map((l, i) => `<text x="0" y="${wy + i * fs * 1.02}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${fs}" letter-spacing="-1" fill="${INK}">${esc(l)}</text>`).join('')}
    <g transform="translate(0 -12)">
      <rect x="-92" y="-17" width="184" height="34" rx="17" fill="#D7263D"/>
      <text y="7" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="18" letter-spacing="3" fill="#fff">CANNOT SAY</text>
    </g>
    ${card.banned.map((b, i) => `<g transform="translate(-128 ${38 + i * 38})">
      <circle r="11" fill="#FCE4E7" stroke="#D7263D" stroke-width="2.5"/><path d="M-4.5 -4.5l9 9M4.5 -4.5l-9 9" stroke="#D7263D" stroke-width="3" stroke-linecap="round"/>
      <text x="24" y="9" font-family="${FONT}" font-weight="700" font-size="${b.length > 16 ? 22 : 26}" fill="${INK}">${esc(b)}</text></g>`).join('')}`;
}

export function logoSVG(scale = 1, color = '#FFD877') {
  return `<g transform="scale(${scale})">
    <path d="M-60 -40 h120 a16 16 0 0 1 16 16 v44 a16 16 0 0 1 -16 16 h-62 l-26 22 v-22 h-32 a16 16 0 0 1 -16 -16 v-44 a16 16 0 0 1 16 -16z" fill="#fff" stroke="${INK}" stroke-width="6"/>
    <path d="M-30 -2 q30 26 60 0" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="-26" cy="-14" r="6" fill="${INK}"/><circle cx="26" cy="-14" r="6" fill="${INK}"/>
    <circle r="52" cx="0" cy="-2" fill="none" stroke="#D7263D" stroke-width="10" opacity=".95"/>
    <path d="M-36 -38 L36 34" stroke="#D7263D" stroke-width="10" stroke-linecap="round"/>
  </g>`;
}

export function cardBackSVG() {
  let stripes = '';
  for (let i = -8; i < 10; i++) stripes += `<path d="M${i * 44} -220 l-160 440" stroke="#F08A3C" stroke-width="18"/>`;
  return `
    <rect x="-186" y="-214" width="372" height="452" rx="26" fill="rgba(0,0,0,.35)"/>
    <clipPath id="cs-back-clip"><rect x="-180" y="-220" width="360" height="440" rx="24"/></clipPath>
    <g clip-path="url(#cs-back-clip)"><rect x="-180" y="-220" width="360" height="440" fill="#E8590C"/>${stripes}</g>
    <rect x="-180" y="-220" width="360" height="440" rx="24" fill="none" stroke="${INK}" stroke-width="5"/>
    <rect x="-156" y="-196" width="312" height="392" rx="16" fill="none" stroke="#FFD877" stroke-width="3" stroke-dasharray="10 8"/>
    <g transform="translate(0 -40)">${logoSVG(1.25)}</g>
    <text y="104" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="50" letter-spacing="-1" fill="#FFF8E8" stroke="${INK}" stroke-width="7" paint-order="stroke">CANNOT</text>
    <text y="154" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="50" letter-spacing="-1" fill="#FFD877" stroke="${INK}" stroke-width="7" paint-order="stroke">SAY!</text>`;
}

/** Studio backdrop: lights, marquee and crowd. */
export function studioSVG(P = 'cs-') {
  const beams = [[140, -10, 0.16], [380, -10, 0.12], [620, -10, 0.12], [860, -10, 0.16]].map(([x, y, o], i) =>
    `<path class="beam" style="--d:${i * 0.7}s" d="M${x - 14} ${y} L${x + 14} ${y} L${x + 150 - i * 90} 620 L${x - 150 - i * 30} 620Z" fill="url(#${P}beam)" opacity="${o * 4}"/>`).join('');
  let bulbs = '';
  for (let i = 0; i < 22; i++) bulbs += `<circle class="bulb" style="--d:${(i % 4) * 0.25}s" cx="${330 + i * 16}" cy="18" r="4.5" fill="#FFD877"/><circle class="bulb" style="--d:${((i + 2) % 4) * 0.25}s" cx="${330 + i * 16}" cy="82" r="4.5" fill="#FFD877"/>`;
  let crowd = '';
  for (let i = 0; i < 26; i++) {
    const x = 12 + i * 40 + (i % 2) * 8, y = 600 - (i % 3) * 8, s = 0.9 + (i % 4) * 0.08;
    crowd += `<g transform="translate(${x} ${y}) scale(${s})"><g class="fan" style="--d:${(i % 5) * 0.21}s"><circle cy="-38" r="15" fill="#120B24"/><path d="M-26 22 q0 -46 26 -46 q26 0 26 46z" fill="#120B24"/></g></g>`;
  }
  return `
    <defs>
      <linearGradient id="${P}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1650"/><stop offset=".6" stop-color="#3B1E62"/><stop offset="1" stop-color="#1A0F33"/></linearGradient>
      <linearGradient id="${P}beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".55"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></linearGradient>
      <radialGradient id="${P}floor" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#7C3AA8" stop-opacity=".75"/><stop offset="1" stop-color="#7C3AA8" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1000" height="620" fill="url(#${P}bg)"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<rect x="${i * 120 - 20}" y="110" width="70" height="380" rx="8" fill="rgba(255,255,255,.035)"/>`).join('')}
    <ellipse cx="500" cy="560" rx="460" ry="90" fill="url(#${P}floor)"/>
    ${beams}
    <g>
      <rect x="316" y="6" width="368" height="88" rx="16" fill="#120B24" stroke="#FFD877" stroke-width="3"/>${bulbs}
      <text x="500" y="66" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="40" letter-spacing="1" fill="#FF8A3D" class="neon">CANNOT SAY!</text>
    </g>
    <g class="crowd">${crowd}</g>`;
}

export const TIMER_R = 78;
export function timerSVG() {
  const C = 2 * Math.PI * TIMER_R;
  return `
    <g class="timer">
      <rect x="-12" y="-122" width="24" height="22" rx="5" fill="#C9CED3" stroke="${INK}" stroke-width="4"/>
      <rect x="-28" y="-132" width="56" height="14" rx="7" fill="#FFD877" stroke="${INK}" stroke-width="4"/>
      <circle r="102" fill="#FFFCF5" stroke="${INK}" stroke-width="6"/>
      <circle r="${TIMER_R}" fill="none" stroke="#EDE6DA" stroke-width="18"/>
      <circle class="timer-arc" r="${TIMER_R}" fill="none" stroke="#2F9E5B" stroke-width="18" stroke-linecap="round" transform="rotate(-90)" stroke-dasharray="${C} ${C}" stroke-dashoffset="0"/>
      <text class="timer-num" y="20" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="62" fill="${INK}">60</text>
      <text y="52" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="13" letter-spacing="3" fill="#7A6A86">SECONDS</text>
    </g>`;
}
