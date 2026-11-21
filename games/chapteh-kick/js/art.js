// Chapteh Kick — SVG art for the 2D board (and the hub card). Viewbox 1000 × 620.
// World metres → SVG: x' = CX + x·S, y' = GY − y·S.
export const S = 260;
export const CX = 500;
export const GY = 548;
export const px = (x) => CX + x * S;
export const py = (y) => GY - y * S;
const INK = '#2A1A12';
const FONT = "'Bricolage Grotesque', 'Segoe UI', system-ui, sans-serif";

export const ZONE_COLORS = { L: '#E0457B', C: '#F2B134', R: '#2D6FD1' };

// Kid body measurements in SVG px (front view, origin at the feet)
export const KID = { hipY: -164, hipX: 22, thigh: 86, shin: 78, shoulderY: -268, shoulderX: 40, arm: 92 };

export const OUTFITS = [
  { shirt: '#FFFFFF', shorts: '#2D4E8C', skin: '#C98E5F', hair: '#1E1410', sock: '#FFFFFF', shoe: '#20242A', trim: '#E0457B' },
  { shirt: '#FFE08A', shorts: '#2F6B4F', skin: '#E2B48C', hair: '#2A1A12', sock: '#FFFFFF', shoe: '#7A2E2E', trim: '#2D6FD1' },
  { shirt: '#BFE6FF', shorts: '#5B3A82', skin: '#8D5B3A', hair: '#140D0A', sock: '#F2B134', shoe: '#20242A', trim: '#F2B134' },
  { shirt: '#FCE4E7', shorts: '#7A4A2A', skin: '#D9A27A', hair: '#3A2418', sock: '#FFFFFF', shoe: '#2F6B4F', trim: '#2F9E5B' },
];

/** A kid (front view). The legs and arms are lines the board moves every frame. */
export function kidSVG(o, id = 'k') {
  const K = KID;
  return `
    <g class="kid" id="${id}">
      <ellipse class="kid-shadow" cx="0" cy="4" rx="58" ry="11" fill="rgba(0,0,0,.22)"/>
      ${['l', 'r'].map((sd) => `
        <g class="leg leg-${sd}">
          <line class="thigh" stroke="${o.skin}" stroke-width="22" stroke-linecap="round"/>
          <line class="shin" stroke="${o.skin}" stroke-width="19" stroke-linecap="round"/>
          <line class="sock" stroke="${o.sock}" stroke-width="20" stroke-linecap="round"/>
          <g class="shoe"><ellipse cx="0" cy="0" rx="20" ry="11" fill="${o.shoe}" stroke="${INK}" stroke-width="2.5"/><path d="M-12 -4h22" stroke="#fff" stroke-width="2" opacity=".7"/></g>
        </g>`).join('')}
      <g class="torso">
        <path d="M${-K.hipX - 14} ${K.hipY - 6} L${K.hipX + 14} ${K.hipY - 6} L${K.hipX + 20} ${K.hipY + 34} L4 ${K.hipY + 34} L0 ${K.hipY + 14} L-4 ${K.hipY + 34} L${-K.hipX - 20} ${K.hipY + 34}Z" fill="${o.shorts}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M-40 ${K.shoulderY + 4} Q-48 ${K.hipY - 30} -38 ${K.hipY} L38 ${K.hipY} Q48 ${K.hipY - 30} 40 ${K.shoulderY + 4} Q20 ${K.shoulderY - 10} 0 ${K.shoulderY - 8} Q-20 ${K.shoulderY - 10} -40 ${K.shoulderY + 4}Z" fill="${o.shirt}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M-12 ${K.shoulderY - 6} L0 ${K.shoulderY + 12} L12 ${K.shoulderY - 6}" fill="none" stroke="${o.trim}" stroke-width="4" stroke-linejoin="round"/>
        <rect x="-38" y="${K.hipY - 8}" width="76" height="9" rx="3" fill="${o.trim}" stroke="${INK}" stroke-width="2"/>
        <circle cx="22" cy="${K.shoulderY + 30}" r="7" fill="${o.trim}"/>
      </g>
      ${['l', 'r'].map((sd) => `
        <g class="arm arm-${sd}">
          <line class="upper" stroke="${o.shirt}" stroke-width="20" stroke-linecap="round"/>
          <line class="fore" stroke="${o.skin}" stroke-width="15" stroke-linecap="round"/>
          <circle class="hand" r="9" fill="${o.skin}" stroke="${INK}" stroke-width="2"/>
        </g>`).join('')}
      <g class="head" transform="translate(0 ${K.shoulderY - 44})">
        <rect x="-9" y="22" width="18" height="18" fill="${o.skin}"/>
        <circle r="36" fill="${o.skin}" stroke="${INK}" stroke-width="3"/>
        <path d="M-37 -4 Q-40 -42 0 -42 Q40 -42 37 -4 Q30 -24 10 -26 Q-6 -16 -24 -24 Q-32 -18 -37 -4Z" fill="${o.hair}"/>
        <ellipse class="eye" cx="-13" cy="2" rx="4.5" ry="5.5" fill="${INK}"/><ellipse class="eye" cx="13" cy="2" rx="4.5" ry="5.5" fill="${INK}"/>
        <circle cx="-22" cy="14" r="6" fill="#F08A8A" opacity=".45"/><circle cx="22" cy="14" r="6" fill="#F08A8A" opacity=".45"/>
        <path class="mouth" d="M-9 17 Q0 25 9 17" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      </g>
    </g>`;
}

/** The chapteh: a rubber-and-washer base with four fanned feathers. Drawn base-down at 0,0. */
export function chaptehSVG(golden = false) {
  const cols = golden ? ['#FFD877', '#F2B134', '#FFE9A8', '#E8A317'] : ['#D7263D', '#F2B134', '#2F9E5B', '#2D6FD1'];
  const feathers = [-24, -8, 8, 24].map((a, i) => `<g transform="rotate(${a})"><path d="M0 -6 C-9 -26 -9 -50 0 -62 C9 -50 9 -26 0 -6Z" fill="${cols[i]}" stroke="${INK}" stroke-width="2"/><path d="M0 -8 L0 -56" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/></g>`).join('');
  return `${golden ? '<circle class="glow" r="40" cy="-26" fill="#FFD877" opacity=".35"/>' : ''}${feathers}
    <rect x="-10" y="-10" width="20" height="10" rx="3" fill="#C9CED3" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="0" cy="2" rx="15" ry="7" fill="#7A2E2E" stroke="${INK}" stroke-width="2"/>`;
}

function hdb(x, y, w, h, tone, accent) {
  let win = '';
  for (let r = 0; r < Math.floor((h - 26) / 18); r++) for (let c = 0; c < Math.floor((w - 12) / 16); c++) win += `<rect x="${x + 8 + c * 16}" y="${y + 18 + r * 18}" width="9" height="10" fill="${(r + c) % 5 === 0 ? '#FFE9A8' : '#6C7A86'}" opacity=".75"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${tone}"/><rect x="${x}" y="${y}" width="${w}" height="10" fill="${accent}"/>${win}
    <rect x="${x + w * 0.4}" y="${y + 10}" width="10" height="${h - 10}" fill="${accent}" opacity=".55"/>`;
}

function tree(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-6 0 L-4 -60 L4 -60 L6 0Z" fill="#5A3D2A"/>
    <ellipse cx="0" cy="-74" rx="62" ry="30" fill="#2F7A3F"/><ellipse cx="-30" cy="-84" rx="34" ry="20" fill="#3C8C4A"/><ellipse cx="26" cy="-88" rx="36" ry="20" fill="#3C8C4A"/><ellipse cx="0" cy="-96" rx="30" ry="16" fill="#4FA35A"/></g>`;
}

/** The terrazzo dragon playground, a fixture of old HDB estates. */
function dragon(x, y, s = 1) {
  const ring = (cx, r) => `<path d="M${cx - r} 0 A${r} ${r} 0 0 1 ${cx + r} 0" fill="none" stroke="#E8590C" stroke-width="16"/><path d="M${cx - r} 0 A${r} ${r} 0 0 1 ${cx + r} 0" fill="none" stroke="#F2B134" stroke-width="5" stroke-dasharray="4 6"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="40" cy="4" rx="150" ry="14" fill="#E8D3A0"/>
    ${ring(-10, 30)}${ring(60, 36)}${ring(130, 28)}
    <path d="M150 -2 q20 -8 28 -30" fill="none" stroke="#E8590C" stroke-width="12" stroke-linecap="round"/>
    <g transform="translate(-70 -10)">
      <path d="M-30 10 L-30 -64 Q-30 -92 0 -92 Q34 -92 40 -62 L52 -58 L44 -46 L40 -36 L40 10Z" fill="#D7263D" stroke="${INK}" stroke-width="3"/>
      <path d="M-30 -60 h66 M-30 -36 h70 M-30 -12 h70" stroke="#F2B134" stroke-width="3" stroke-dasharray="5 5" opacity=".8"/>
      <circle cx="16" cy="-66" r="8" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="18" cy="-66" r="3.5" fill="${INK}"/>
      <path d="M-14 -92 l-10 -22 l18 14 l4 -24 l10 24 l14 -12 l-6 22" fill="#F2B134" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="-14" y="-10" width="28" height="20" rx="10" fill="#2A1A12" opacity=".7"/>
    </g></g>`;
}

/** Background for both modes. */
export function sceneSVG(P = 'ck-', mode = 'solo') {
  let grass = '';
  for (let i = 0; i < 40; i++) grass += `<path d="M${(i * 53) % 1000} ${560 + (i * 37) % 60} l3 -9 l3 9" stroke="#3E8A3A" stroke-width="2" fill="none"/>`;
  return `
    <defs>
      <linearGradient id="${P}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FC8F0"/><stop offset=".72" stop-color="#CFEAF2"/><stop offset="1" stop-color="#FFE7B8"/></linearGradient>
      <linearGradient id="${P}grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6DBA5A"/><stop offset="1" stop-color="#4E9C45"/></linearGradient>
    </defs>
    <rect width="1000" height="620" fill="url(#${P}sky)"/>
    <circle cx="840" cy="96" r="44" fill="#FFF3C4" opacity=".8"/>
    <g opacity=".55">${hdb(20, 150, 130, 330, '#E8E2D6', '#8FB8C9')}${hdb(170, 190, 110, 290, '#F2E6D0', '#E8A3A3')}${hdb(700, 170, 120, 310, '#E8E2D6', '#B5C98F')}${hdb(840, 130, 150, 350, '#F2E6D0', '#8FB8C9')}</g>
    ${hdb(300, 240, 150, 240, '#F4EEE2', '#E07A3A')}${hdb(560, 260, 120, 220, '#F4EEE2', '#4FA3A5')}
    <rect y="470" width="1000" height="20" fill="#B9B1A2"/>
    ${tree(60, 486, 1.1)}${tree(250, 488, 0.9)}${tree(930, 488, 1.15)}
    ${dragon(780, 500, 0.85)}
    <rect y="486" width="1000" height="134" fill="url(#${P}grass)"/>${grass}
    ${mode === 'rally'
      ? `<path d="M500 500 L500 612" stroke="#fff" stroke-width="5" stroke-dasharray="14 12" opacity=".8"/>
         <ellipse cx="${px(-1.5)}" cy="${GY + 4}" rx="120" ry="22" fill="none" stroke="#fff" stroke-width="4" opacity=".7"/>
         <ellipse cx="${px(1.5)}" cy="${GY + 4}" rx="120" ry="22" fill="none" stroke="#fff" stroke-width="4" opacity=".7"/>`
      : `<ellipse cx="500" cy="${GY + 4}" rx="190" ry="34" fill="none" stroke="#fff" stroke-width="5" opacity=".75"/>`}`;
}

export function heartSVG(on = true) {
  return `<g opacity="${on ? 1 : 0.25}"><g transform="scale(.42) translate(0 40)">${chaptehSVG(false)}</g></g>`;
}
export { FONT, INK };

/** A kid frozen mid-kick, for the hub card: the same leg geometry as the live board. */
export function kidKickSVG(o, kind = 'R') {
  const K = KID;
  const bend = (hip, foot, sign) => {
    const a = K.thigh, b = K.shin, dx = foot.x - hip.x, dy = foot.y - hip.y;
    const d = Math.min(Math.hypot(dx, dy), a + b - 0.5), base = Math.atan2(dy, dx);
    const ang = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
    const k1 = { x: hip.x + Math.cos(base + ang) * a, y: hip.y + Math.sin(base + ang) * a };
    const k2 = { x: hip.x + Math.cos(base - ang) * a, y: hip.y + Math.sin(base - ang) * a };
    return (k1.x - k2.x) * sign > 0 ? k1 : k2;
  };
  const feet = { l: { x: -26, y: 0 }, r: { x: 26, y: 0 } };
  if (kind === 'L') feet.l = { x: -44, y: -61 }; else feet.r = { x: 44, y: -61 };
  let svg = kidSVG(o, 'hubkid');
  for (const sd of ['l', 'r']) {
    const sign = sd === 'l' ? -1 : 1;
    const hip = { x: sign * K.hipX, y: K.hipY }, f = feet[sd], kn = bend(hip, f, sign);
    const sock = { x: f.x + (kn.x - f.x) * 0.3, y: f.y + (kn.y - f.y) * 0.3 };
    const L = (cls, a, b) => `<line class="${cls}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"`;
    const legStart = svg.indexOf(`<g class="leg leg-${sd}">`);
    let part = svg.slice(legStart, svg.indexOf('</g>\n        </g>', legStart));
    const fixed = part
      .replace('<line class="thigh"', L('thigh', hip, kn))
      .replace('<line class="shin"', L('shin', kn, f))
      .replace('<line class="sock"', L('sock', sock, f))
      .replace('<g class="shoe">', `<g class="shoe" transform="translate(${f.x + sign * 6} ${f.y + 2}) rotate(${f.y < -4 ? -sign * 28 : 0})">`);
    svg = svg.replace(part, fixed);
  }
  for (const sd of ['l', 'r']) {
    const sign = sd === 'l' ? -1 : 1;
    const sh = { x: sign * K.shoulderX, y: K.shoulderY + 14 }, el = { x: sh.x + sign * 54, y: sh.y + 22 }, hand = { x: el.x + sign * 36, y: el.y + 6 };
    const start = svg.indexOf(`<g class="arm arm-${sd}">`);
    const part = svg.slice(start, svg.indexOf('</g>', start));
    const fixed = part
      .replace('<line class="upper"', `<line class="upper" x1="${sh.x}" y1="${sh.y}" x2="${el.x}" y2="${el.y}"`)
      .replace('<line class="fore"', `<line class="fore" x1="${el.x}" y1="${el.y}" x2="${hand.x}" y2="${hand.y}"`)
      .replace('<circle class="hand"', `<circle class="hand" cx="${hand.x}" cy="${hand.y}"`);
    svg = svg.replace(part, fixed);
  }
  return svg;
}
