import { GAMES } from './games.js';
import { PATTERN_DEFS as KM_DEFS, customerSVG, cupSVG } from '../games/kopi-master/js/art.js';
import { goodsSVG } from '../games/pasar-malam/js/art.js';
import { holeSVG, cupSVG as golfCupSVG, ballSVG } from '../games/marina-golf/js/art.js';
import { HOLES as GOLF_HOLES } from '../games/marina-golf/js/engine.js';


/* ---------- Heartland skyline (HDB blocks) ---------- */
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

// Drawn to the container's real proportions (no stretching or cropping), and redrawn when it resizes.
function drawSkyline(svg) {
  const r = rng(65);
  const H = 360;
  const box = svg.getBoundingClientRect();
  const W = Math.max(640, Math.round((H * (box.width || 1200)) / (box.height || H)));
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
  svg.dataset.w = String(W);
  const facades = ['#F3DCC0', '#F7D9DF', '#CFE7E1', '#F5E6B8', '#E4DDF0', '#FBE3CF'];
  const accents = ['#D7263D', '#1F8A8A', '#F2B134', '#E88EA6', '#6B3E26', '#4E9F3D'];
  let out = '';

  // far layer: pale silhouettes
  for (let x = -20, i = 0; x < W; i++) {
    const w = 70 + r() * 70, h = 150 + r() * 120;
    out += `<rect class="bldg" style="--i:${i}" x="${x}" y="${H - h}" width="${w}" height="${h}" fill="#E8DCCB"/>`;
    x += w + 8 + r() * 20;
  }

  // near layer: detailed HDB blocks
  let i = 0;
  for (let x = -10; x < W; i++) {
    const w = 110 + r() * 90;
    const floors = 8 + Math.floor(r() * 8);
    const fh = 15;
    const h = floors * fh + 34;
    const y = H - h;
    const facade = facades[i % facades.length];
    const acc = accents[Math.floor(r() * accents.length)];
    let g = `<g class="bldg" style="--i:${i + 10}">`;
    g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${facade}" stroke="#2A1A12" stroke-width="2"/>`;
    // roof band + accent panel
    g += `<rect x="${x}" y="${y}" width="${w}" height="10" fill="${acc}" stroke="#2A1A12" stroke-width="2"/>`;
    const panelW = w * (0.18 + r() * 0.12);
    const panelX = x + (r() > 0.5 ? 8 : w - panelW - 8);
    g += `<rect x="${panelX}" y="${y + 10}" width="${panelW}" height="${h - 34}" fill="${acc}" opacity=".28"/>`;
    // windows
    const cols = Math.max(3, Math.floor(w / 24));
    const cw = (w - 16) / cols;
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const lit = r() > 0.82;
        g += `<rect x="${x + 8 + c * cw + 3}" y="${y + 16 + f * fh}" width="${cw - 6}" height="${fh - 7}" rx="1.5" fill="${lit ? '#F2B134' : '#2A1A12'}" opacity="${lit ? 0.9 : 0.16}"/>`;
      }
    }
    // void deck with pillars
    g += `<rect x="${x}" y="${H - 22}" width="${w}" height="22" fill="#2A1A12" opacity=".14"/>`;
    for (let p = x + 12; p < x + w - 6; p += 26) g += `<rect x="${p}" y="${H - 22}" width="6" height="22" fill="${facade}" stroke="#2A1A12" stroke-width="1.5"/>`;
    g += '</g>';
    out += g;
    x += w + 26 + r() * 30;
  }

  // rain trees along the road
  for (let x = 30, t = 0; x < W; t++) {
    const s = 0.8 + r() * 0.5;
    out += `<g class="bldg" style="--i:${t + 30}" transform="translate(${x} ${H}) scale(${s})">
      <rect x="-3" y="-44" width="6" height="44" fill="#6B3E26"/>
      <ellipse cx="0" cy="-54" rx="34" ry="18" fill="#4E9F3D" stroke="#2A1A12" stroke-width="2"/>
      <ellipse cx="-12" cy="-62" rx="18" ry="10" fill="#6DB654"/>
    </g>`;
    x += 120 + r() * 160;
  }
  out += `<rect x="0" y="${H - 4}" width="${W}" height="4" fill="#2A1A12"/>`;
  svg.innerHTML = out;
}

/* ---------- card art ---------- */
function arc(cx, cy, r, a0, a1) {
  // angles: 0 = left, 90 = top, 180 = right
  const p = (a) => [cx - r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${cx} ${cy}L${x0} ${y0}A${r} ${r} 0 0 1 ${x1} ${y1}Z`;
}

// Miniatures of each game's real 2D screen, so the hub cards match what you get when you tap Play.
const FONT = 'Bricolage Grotesque, sans-serif';
const BLEED = new Set(['dial', 'chope', 'mrt', 'kopi', 'pasar', 'golf']);

function agakArt() {
  const CX = 200, CY = 176, R = 123;
  const pt = (r, a) => [CX - r * Math.cos((a * Math.PI) / 180), CY - r * Math.sin((a * Math.PI) / 180)];
  let ticks = '';
  for (let a = 6; a < 180; a += 12) {
    const [x0, y0] = pt(R - (a % 36 === 6 ? 10 : 6), a), [x1, y1] = pt(R - 2, a);
    ticks += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#6B3E26" stroke-opacity=".22" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  let dots = '';
  for (let a = 0; a <= 180; a += 22.5) { const [x, y] = pt(131, a); dots += `<circle cx="${x}" cy="${y}" r="${a % 45 === 0 ? 2.2 : 1.2}" fill="#F2B134"/>`; }
  let ribs = '';
  for (let a = 15; a < 180; a += 15) { const [x0, y0] = pt(52, a), [x1, y1] = pt(R - 12, a); ribs += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#6B3E26" stroke-opacity=".12" stroke-width="1.2"/>`; }
  const T = 122; // where the hidden target landed
  return `
    <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="agak-tile" width="44" height="44" patternUnits="userSpaceOnUse"><image href="assets/tile.svg" width="44" height="44"/></pattern>
        <radialGradient id="agak-glow" cx="80%" cy="0%" r="90%"><stop offset="0" stop-color="#F2B134" stop-opacity=".28"/><stop offset="1" stop-color="#F2B134" stop-opacity="0"/></radialGradient>
        <linearGradient id="agak-housing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A2C1B"/><stop offset="1" stop-color="#24150D"/></linearGradient>
        <linearGradient id="agak-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD877"/><stop offset=".5" stop-color="#F2B134"/><stop offset="1" stop-color="#B9791A"/></linearGradient>
        <radialGradient id="agak-face" cx="50%" cy="100%" r="100%"><stop offset="0" stop-color="#FFFDF7"/><stop offset=".75" stop-color="#FBF3E2"/><stop offset="1" stop-color="#EBDDC2"/></radialGradient>
        <radialGradient id="agak-shutter" cx="50%" cy="100%" r="100%"><stop offset="0" stop-color="#F3EAD8"/><stop offset=".7" stop-color="#EADDC4"/><stop offset="1" stop-color="#D8C6A4"/></radialGradient>
        <clipPath id="agak-top"><rect width="400" height="${CY}"/></clipPath>
      </defs>
      <rect width="400" height="250" fill="#F6EFE3"/>
      <rect width="400" height="250" fill="url(#agak-tile)" opacity=".09"/>
      <rect width="400" height="250" fill="url(#agak-glow)"/>
      <path d="M57 ${CY + 25} L57 ${CY} A143 143 0 0 1 343 ${CY} L343 ${CY + 25} Q343 ${CY + 36} 332 ${CY + 36} L68 ${CY + 36} Q57 ${CY + 36} 57 ${CY + 25}Z" fill="url(#agak-housing)" stroke="#120A06" stroke-width="1.5"/>
      <path d="M63 ${CY} A137 137 0 0 1 337 ${CY}" fill="none" stroke="url(#agak-gold)" stroke-width="2" opacity=".9"/>
      ${dots}
      <g clip-path="url(#agak-top)">
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#agak-face)"/>
        ${ticks}
        <path d="${arc(CX, CY, R - 1, T - 16, T + 16)}" fill="#1F8A8A" stroke="#2A1A12" stroke-opacity=".25"/>
        <path d="${arc(CX, CY, R - 1, T - 10, T + 10)}" fill="#F2B134" stroke="#2A1A12" stroke-opacity=".25"/>
        <path d="${arc(CX, CY, R - 1, T - 3.5, T + 3.5)}" fill="#D7263D" stroke="#2A1A12" stroke-opacity=".25"/>
        <g transform="rotate(-72 ${CX} ${CY})">
          <path d="M${CX - R - 1} ${CY} A${R + 1} ${R + 1} 0 0 1 ${CX + R + 1} ${CY}Z" fill="url(#agak-shutter)"/>
          ${ribs}
          <path d="M${CX - R + 7} ${CY} A${R - 7} ${R - 7} 0 0 1 ${CX + R - 7} ${CY}" fill="none" stroke="#B9862A" stroke-opacity=".6" stroke-width="1.2"/>
          <path d="M${CX - 45} ${CY} A45 45 0 0 1 ${CX + 45} ${CY}" fill="none" stroke="#B9862A" stroke-opacity=".35" stroke-width="1"/>
          <line x1="${CX - R - 1}" y1="${CY}" x2="${CX + R + 1}" y2="${CY}" stroke="#2A1A12" stroke-opacity=".25"/>
          <g transform="translate(${CX} ${CY - R + 14})"><rect x="-18" y="-6" width="36" height="12" rx="6" fill="#2A1A12"/><text y="2.6" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="7" letter-spacing="1.4" fill="#FBF6EC">AGAK</text></g>
        </g>
      </g>
      <path d="M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}" fill="none" stroke="#120A06" stroke-width="3"/>
      <rect x="57" y="${CY - 0.6}" width="286" height="3" fill="#120A06"/>
      <rect x="64" y="${CY + 6}" width="272" height="24" rx="5" fill="none" stroke="#F2B134" stroke-opacity=".35"/>
      <g class="needle" style="transform-origin:${CX}px ${CY}px">
        <g transform="rotate(${T - 6 - 90} ${CX} ${CY})">
          <path d="M${CX} ${CY - R + 3} L${CX + 4} ${CY - 9} L${CX - 4} ${CY - 9}Z" fill="#D7263D" stroke="#120A06" stroke-width="1.3" stroke-linejoin="round"/>
        </g>
      </g>
      <circle cx="${CX}" cy="${CY}" r="14" fill="url(#agak-gold)" stroke="#120A06" stroke-width="1.6"/>
      <circle cx="${CX}" cy="${CY}" r="6.5" fill="#2A1A12"/>
      <circle cx="${CX - 2.2}" cy="${CY - 2.2}" r="1.8" fill="#fff" opacity=".35"/>
      <g font-family="${FONT}" font-weight="800" font-size="12" fill="#2A1A12">
        <rect x="70" y="${CY + 9}" width="74" height="19" rx="5" fill="#FDE3E7" stroke="#2A1A12" stroke-width="1.3"/>
        <text x="107" y="${CY + 22.5}" text-anchor="middle">← Shiok</text>
        <rect x="262" y="${CY + 9}" width="68" height="19" rx="5" fill="#DDF1EE" stroke="#2A1A12" stroke-width="1.3"/>
        <text x="296" y="${CY + 22.5}" text-anchor="middle">Sian →</text>
      </g>
    </svg>`;
}

function chopeArt() {
  const P = '#E0457B', B = '#2D6FD1', INK = '#2A1A12';
  const packet = (x, y, c, r, extra = '') => `<g transform="translate(${x} ${y}) rotate(${r})" ${extra}><rect x="-13.5" y="-9" width="27" height="18" rx="4" fill="${c}" stroke="${INK}" stroke-width="1.6"/><rect x="-4" y="-8.5" width="8" height="17" fill="#fff" opacity=".82"/></g>`;
  const stool = (x, y, c = null, r = 0, ghost = false) => `
    <g transform="translate(${x} ${y})"><circle cx="1.5" cy="2.5" r="16.5" fill="${INK}" opacity=".2"/><circle r="16" fill="#F0E6D6" stroke="${INK}" stroke-width="1.6"/><rect x="-5.5" y="-2" width="11" height="4" rx="2" fill="${INK}" opacity=".22"/></g>
    ${c ? packet(x, y, c, r, ghost ? 'opacity=".5"' : '') : ''}`;
  const table = (x, y, { name, val, type = 'normal', owner = null, hot = false }) => {
    const badge = type === 'famous' ? '#F2B134' : type === 'fan' ? '#DDF1EE' : '#fff';
    const deco = type === 'fan'
      ? `<g opacity=".2"><g class="fan-blades" style="transform-origin:${x}px ${y}px">${[0, 120, 240].map((a) => `<ellipse cx="${x}" cy="${y - 17}" rx="5.5" ry="17" transform="rotate(${a} ${x} ${y})" fill="${INK}"/>`).join('')}</g><circle cx="${x}" cy="${y}" r="4.5" fill="${INK}"/></g>`
      : type === 'famous'
        ? `<path transform="translate(${x} ${y}) scale(.5)" d="M0 -30 L8.8 -12 L28.5 -9.3 L14.3 4.6 L17.6 24.3 L0 15 L-17.6 24.3 L-14.3 4.6 L-28.5 -9.3 L-8.8 -12Z" fill="#F2B134" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
        : '';
    return `
      <ellipse cx="${x + 3}" cy="${y + 5}" rx="38" ry="36" fill="${INK}" opacity=".18"/>
      ${hot ? `<circle class="hot" cx="${x}" cy="${y}" r="45" fill="none" stroke="#F2B134" stroke-width="3" stroke-dasharray="5 4" style="transform-origin:${x}px ${y}px"/>` : ''}
      <circle cx="${x}" cy="${y}" r="36" fill="url(#chope-marble)" stroke="#2F6B4F" stroke-width="4"/>
      ${deco}
      <text x="${x}" y="${y - 19}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="11" fill="${INK}" fill-opacity=".35">${name}</text>
      <circle cx="${x + 23}" cy="${y + 23}" r="10.5" fill="${badge}" stroke="${INK}" stroke-width="1.6"/>
      <text x="${x + 23}" y="${y + 27}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="12" fill="${INK}">${val}</text>
      ${owner ? `
        <circle cx="${x}" cy="${y}" r="36" fill="${owner}" stroke="${INK}" stroke-width="3"/>
        <circle cx="${x}" cy="${y}" r="30" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="2 4"/>
        <text x="${x}" y="${y - 1}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="13" letter-spacing="1" fill="#fff">CHOPED</text>
        <text x="${x}" y="${y + 15}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="12" fill="#fff">+${val}</text>` : ''}`;
  };
  const stall = (x, w, name, col) => {
    let scal = '';
    for (let i = 0; i < 8; i++) scal += `<path d="M${x + (w / 8) * i} 45 q${w / 16} 9 ${w / 8} 0" fill="${col}" stroke="${INK}" stroke-width="1.5"/>`;
    return `
      <rect x="${x}" y="6" width="${w}" height="28" rx="5" fill="#2F6B4F" stroke="${INK}" stroke-width="2"/>
      <text x="${x + w / 2}" y="25" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="13" letter-spacing=".8" fill="#FFF8E8">${name}</text>
      <rect x="${x}" y="34" width="${w}" height="11" fill="${col}" stroke="${INK}" stroke-width="1.5"/>
      ${scal}
      <rect x="${x + 4}" y="56" width="${w - 8}" height="13" rx="3" fill="#E9DCC5" stroke="${INK}" stroke-width="1.5"/>`;
  };
  const ROW_A = 136, ROW_B = 241;
  return `
    <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="chope-floor" width="32" height="32" patternUnits="userSpaceOnUse">
          <rect width="32" height="32" fill="#EADCC3"/><rect width="16" height="16" fill="#E2CFAF"/><rect x="16" y="16" width="16" height="16" fill="#E2CFAF"/>
        </pattern>
        <radialGradient id="chope-marble" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#F2EEE7"/><stop offset="1" stop-color="#DCD5CA"/></radialGradient>
      </defs>
      <rect width="400" height="78" fill="#F3E6CF"/>
      ${stall(8, 188, 'CHICKEN RICE', '#D7263D')}${stall(204, 188, 'KOPI · TEH', '#1F8A8A')}
      <rect y="74" width="400" height="4" fill="${INK}"/>
      <rect y="78" width="400" height="172" fill="url(#chope-floor)"/>
      ${table(95, ROW_A, { name: 'A1', val: 2, type: 'fan', owner: P })}
      ${table(200, ROW_A, { name: 'A2', val: 3, type: 'famous', hot: true })}
      ${table(305, ROW_A, { name: 'A3', val: 1, owner: B })}
      ${table(95, ROW_B, { name: 'B1', val: 1 })}
      ${table(200, ROW_B, { name: 'B2', val: 2, type: 'fan' })}
      ${table(305, ROW_B, { name: 'B3', val: 1 })}
      ${stool(95, 87, P, -8)}${stool(200, 87, B, 10)}${stool(305, 87, B, -6)}
      ${stool(42, ROW_A, P, 12)}${stool(147.5, ROW_A, P, -10)}${stool(252.5, ROW_A, P, 8, true)}${stool(358, ROW_A, B, -12)}
      ${stool(95, 188.5, B, 6)}${stool(200, 188.5, P, -14)}${stool(305, 188.5, B, 12)}
      ${stool(42, ROW_B)}${stool(147.5, ROW_B)}${stool(252.5, ROW_B, B, -4)}${stool(358, ROW_B)}
    </svg>`;
}

function mrtArt() {
  // miniature of the 2D carriage: Kaya Line, doors open on the platform side, a few riders aboard
  const INK = '#2A1A12', LINE = '#7FA82E';
  const CS = 28, X0 = 32, Y0 = 60, COLS = 12, ROWS = 5;
  const doors = [2, 3, 8, 9], prio = [0, 1, 10, 11];
  const x = (c) => X0 + c * CS, y = (r) => Y0 + r * CS;
  let seats = '', hatch = '';
  for (const r of [0, 4]) for (let c = 0; c < COLS; c++) {
    if (doors.includes(c)) { hatch += `<rect x="${x(c)}" y="${y(r)}" width="${CS}" height="${CS}" fill="url(#mrt-hatch)" opacity="${r === 4 ? 1 : 0.35}"/>`; continue; }
    seats += `<rect x="${x(c) + 2}" y="${y(r) + (r === 0 ? 2 : 5)}" width="${CS - 4}" height="${CS - 7}" rx="5" fill="${prio.includes(c) ? '#8E2C48' : LINE}" stroke="${INK}" stroke-width="1.3"/>`;
  }
  const person = (cx, cy, shirt, skin, stops, ring = '') => `
    <g transform="translate(${cx} ${cy})">
      ${ring ? `<circle r="12.5" fill="none" stroke="${ring}" stroke-width="1.6"/>` : ''}
      <ellipse cy="2" rx="11" ry="6.5" fill="${shirt}" stroke="${INK}" stroke-width="1.2"/>
      <circle cy="-1" r="5.2" fill="${skin}" stroke="${INK}" stroke-width="1.2"/>
      <path d="M-4.8 -2 a4.8 4.8 0 0 1 9.6 0 q-4.8 -2.6 -9.6 0z" fill="${INK}"/>
      ${stops ? `<g transform="translate(8 -7)"><circle r="5" fill="${stops === 1 ? '#F2B134' : '#FFFCF5'}" stroke="${INK}" stroke-width="1.1"/><text y="2.2" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="6.5" fill="${INK}">${stops}</text></g>` : ''}
    </g>`;
  const cc = (c) => x(c) + CS / 2, rr = (r) => y(r) + CS / 2;
  const trolley = (cx, cy) => `<g transform="translate(${cx} ${cy})"><rect x="-7.5" y="-9" width="15" height="18" rx="3" fill="#B8343D" stroke="${INK}" stroke-width="1.2"/><path d="M-7.5 -3h15M-7.5 3h15M-2.5 -9v18M2.5 -9v18" stroke="#F2D6A0" stroke-width="1" opacity=".85"/></g>`;
  const bag = (cx, cy) => `<g transform="translate(${cx} ${cy})"><rect x="-6.5" y="-6" width="13" height="12" rx="3.5" fill="#2F3E63" stroke="${INK}" stroke-width="1.2"/></g>`;
  const pack = (cx, cy) => `<g transform="translate(${cx} ${cy})"><rect x="-7" y="-8.5" width="14" height="17" rx="3.5" fill="#55652F" stroke="${INK}" stroke-width="1.2"/></g>`;
  let poles = '';
  for (const c of [1, 5, 7, 11]) for (const r of [2, 3]) poles += `<circle cx="${x(c)}" cy="${y(r)}" r="2.2" fill="#C9CED1" stroke="${INK}" stroke-width="1"/>`;
  let windows = '';
  for (const [a, b] of [[0, 2], [4, 8], [10, 12]]) {
    windows += `<rect x="${x(a) + 4}" y="${Y0 - 9}" width="${(b - a) * CS - 8}" height="5" rx="2" fill="#BFE3EC" stroke="${INK}" stroke-width=".8"/>`;
    windows += `<rect x="${x(a) + 4}" y="${y(ROWS) + 4}" width="${(b - a) * CS - 8}" height="5" rx="2" fill="#BFE3EC" stroke="${INK}" stroke-width=".8"/>`;
  }
  let dots = '';
  for (let dx = 6; dx < 400; dx += 8) dots += `<circle cx="${dx}" cy="221" r="1.1" fill="#C9A21C"/>`;
  return `
    <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="mrt-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#E7E2D8"/><rect width="4" height="8" fill="#F2C230" opacity=".6"/></pattern>
        <pattern id="mrt-floor" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#D8D4CC"/><circle cx="4" cy="4" r=".8" fill="#C6C1B7"/><circle cx="11" cy="11" r=".8" fill="#C6C1B7"/></pattern>
        <pattern id="mrt-plat" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#D9D3C7"/><rect width="19.4" height="19.4" fill="#E4DFD5"/></pattern>
      </defs>
      <rect width="400" height="250" fill="#3A3F44"/>
      ${[0, 1, 2].map((i) => `<rect x="${30 + i * 140}" y="20" width="44" height="3" rx="1.5" fill="#FFE9A8" opacity=".35"/>`).join('')}
      <rect y="214" width="400" height="36" fill="url(#mrt-plat)"/>
      <rect y="214" width="400" height="4" fill="#F2C230"/>
      ${dots}
      ${person(cc(5) - 8, 236, '#3E6FB0', '#D9A47A')}${person(cc(5) + 14, 240, '#E88EA6', '#F2C9A0')}${person(cc(8) + 6, 237, '#5B6B33', '#B07A4F')}
      <rect x="10" y="${Y0 - 26}" width="380" height="${ROWS * CS + 52}" rx="22" fill="${LINE}" stroke="${INK}" stroke-width="2"/>
      <rect x="${X0 - 6}" y="${Y0 - 12}" width="${COLS * CS + 12}" height="${ROWS * CS + 24}" rx="12" fill="#F4F2EE" stroke="${INK}" stroke-width="1.5"/>
      ${windows}
      <rect x="${X0}" y="${Y0}" width="${COLS * CS}" height="${ROWS * CS}" fill="url(#mrt-floor)"/>
      ${hatch}${seats}${poles}
      ${[2, 8].map((d) => `<rect x="${x(d) - 22}" y="${y(ROWS) + 1}" width="24" height="10" fill="#DADFE2" stroke="${INK}" stroke-width="1"/><rect x="${x(d + 2) - 2}" y="${y(ROWS) + 1}" width="24" height="10" fill="#DADFE2" stroke="${INK}" stroke-width="1"/>`).join('')}
      ${person(cc(0), rr(0), '#8A6D4B', '#D9A47A', 3, '#3F8F5B')}
      ${person(cc(11), rr(4), '#E88EA6', '#E8B68F', 2, '#3F8F5B')}
      ${person(cc(5), rr(0), '#3E6FB0', '#B07A4F', 1)}
      ${person(cc(6), rr(1), '#C2569B', '#F2C9A0', 4)}${trolley(cc(7), rr(1))}
      ${person(cc(4), rr(2), '#F2F0E8', '#8D5A3B', 2)}${bag(cc(4), rr(3))}
      ${person(cc(10), rr(2), '#5B6B33', '#D9A47A', 1)}${pack(cc(10), rr(3))}
      ${person(cc(1), rr(1), '#3E6FB0', '#E8B68F', 2)}
    </svg>`;
}

function kopiArt() {
  // miniature of the 2D stall: an auntie orders across the counter, an iced kopi C is being built
  const INK = '#2A1A12';
  let tiles = '';
  for (let x = 0; x < 400; x += 20) tiles += `<rect x="${x}" y="96" width="20" height="20" fill="${(x / 20) % 2 ? '#2F6B4F' : '#E8EFE6'}"/>`;
  const fan = (x) => `<g transform="translate(${x} 14)"><rect x="-1.5" y="-14" width="3" height="10" fill="#C9CED1"/><g class="fan-blades" style="transform-origin:${x}px 14px">${[0, 120, 240].map((a) => `<ellipse rx="34" ry="4.5" transform="rotate(${a})" fill="#F4F1EA" stroke="${INK}" stroke-width="1.2"/>`).join('')}</g><circle r="5" fill="#E8E2D6" stroke="${INK}" stroke-width="1.2"/></g>`;
  const cup = { kopi: 1, teh: 0, milo: 0, condensed: 0, evaporated: 1, sugar: 1, ice: 1, water: 0, tarik: 0, bag: 0 };
  return `
    <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>${KM_DEFS}
        <linearGradient id="km-hub-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6E4"/><stop offset="1" stop-color="#F3E2C4"/></linearGradient>
        <linearGradient id="km-hub-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDE2E4"/><stop offset="1" stop-color="#B9C0C4"/></linearGradient>
      </defs>
      <rect width="400" height="250" fill="url(#km-hub-wall)"/>
      <g opacity=".5">${tiles}</g>
      <rect y="116" width="400" height="80" fill="#E9DCC5"/>
      ${fan(70)}${fan(330)}
      <g opacity=".5"><ellipse cx="330" cy="150" rx="40" ry="10" fill="#F1EDE6" stroke="${INK}" stroke-width="1.5"/><rect x="327" y="150" width="6" height="36" fill="#9AA4A8"/></g>
      <g transform="translate(140 140) scale(.5)">${customerSVG('aunty', 'happy')}</g>
      <g transform="translate(140 0)">
        <rect x="-82" y="24" width="164" height="50" rx="12" fill="#FFFCF5" stroke="#1F8A8A" stroke-width="4"/>
        <path d="M-8 73l8 12 8 -12z" fill="#FFFCF5" stroke="${INK}" stroke-width="2"/>
        <text y="46" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="15" fill="${INK}">Kopi C siew dai</text>
        <text y="64" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="15" fill="${INK}">peng</text>
        <rect x="-32" y="14" width="64" height="16" rx="8" fill="#1F8A8A" stroke="${INK}" stroke-width="1.5"/>
        <text y="26" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="8.5" letter-spacing="1" fill="#fff">SERVING</text>
      </g>
      <rect y="190" width="400" height="60" fill="url(#km-hub-top)"/>
      <rect y="186" width="400" height="7" fill="#9AA4A8" stroke="${INK}" stroke-width="1.5"/>
      <rect y="236" width="400" height="14" fill="#6B3E26"/>
      <g transform="translate(290 240) scale(.42)">${cupSVG(cup)}</g>
    </svg>`;
}

function pasarArt() {
  // miniature of the 2D stall: Uncle Seng haggling over a rattan basket under string lights
  const INK = '#2A1A12';
  let bulbs = '', stars = '';
  const cols = ['#FFD877', '#FF9FBF', '#9FD3FF', '#B6F2A0'];
  for (let i = 0; i < 14; i++) { const x = 10 + i * 29, y = 18 + Math.sin(i * 0.6) * 6; bulbs += `<circle cx="${x}" cy="${y + 4}" r="7" fill="${cols[i % 4]}" opacity=".3"/><ellipse cx="${x}" cy="${y + 4}" rx="3" ry="4" fill="${cols[i % 4]}"/>`; }
  for (let i = 0; i < 20; i++) stars += `<circle cx="${(i * 97) % 400}" cy="${(i * 29) % 50}" r="1" fill="#fff" opacity=".5"/>`;
  const wire = Array.from({ length: 14 }, (_, i) => `${10 + i * 29} ${18 + Math.sin(i * 0.6) * 6}`).join(' L');
  let canopy = '';
  for (let i = 0; i < 10; i++) canopy += `<rect x="${70 + i * 26}" y="44" width="26" height="34" fill="${i % 2 ? '#FFF8E8' : '#D7263D'}"/>`;
  let scal = '';
  for (let i = 0; i < 10; i++) scal += `<path d="M${70 + i * 26} 78 q13 12 26 0" fill="${i % 2 ? '#FFF8E8' : '#D7263D'}" stroke="${INK}" stroke-width="2"/>`;
  return `
    <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>${KM_DEFS}
        <linearGradient id="pm-hub-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B1F4A"/><stop offset=".7" stop-color="#3A2A5E"/><stop offset="1" stop-color="#5C3A62"/></linearGradient>
        <pattern id="pm-hub-cloth" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#D7263D"/><rect width="8" height="8" fill="#FFF8E8" opacity=".35"/><rect x="8" y="8" width="8" height="8" fill="#FFF8E8" opacity=".35"/></pattern>
      </defs>
      <rect width="400" height="250" fill="url(#pm-hub-sky)"/>${stars}
      <rect y="190" width="400" height="60" fill="#2B2230"/>
      <path d="M${wire}" fill="none" stroke="#1A1512" stroke-width="1.5"/>${bulbs}
      <rect x="74" y="78" width="5" height="120" fill="#5B4636"/><rect x="321" y="78" width="5" height="120" fill="#5B4636"/>
      <g stroke="${INK}" stroke-width="2">${canopy}</g>${scal}
      <rect x="122" y="51" width="156" height="22" rx="5" fill="#1A1512" stroke="#FFD877" stroke-width="1.5"/>
      <text x="200" y="66" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="10" letter-spacing=".5" fill="#FFD877">UNCLE SENG'S STALL</text>
      <g transform="translate(262 146) scale(.38)">${customerSVG('uncle', 'happy')}</g>
      <g transform="translate(300 100)">
        <rect x="-52" y="-14" width="104" height="30" rx="9" fill="#FFFCF5" stroke="${INK}" stroke-width="2"/>
        <path d="M-30 15 l-10 12 18 -12z" fill="#FFFCF5" stroke="${INK}" stroke-width="2"/>
        <text y="6" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="11" fill="${INK}">Okay lah, $15.50!</text>
      </g>
      <rect x="66" y="186" width="268" height="70" fill="url(#pm-hub-cloth)" stroke="${INK}" stroke-width="2"/>
      <rect x="66" y="182" width="268" height="7" rx="2" fill="#8E6A3A" stroke="${INK}" stroke-width="1.5"/>
      <g transform="translate(148 164) scale(.5)">${goodsSVG('basket')}</g>
      <g transform="translate(262 214)">
        <rect x="-44" y="-24" width="88" height="44" rx="5" fill="#22302A" stroke="#C79A5B" stroke-width="3"/>
        <text y="-7" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="10" fill="#E8EFE6" opacity=".6" text-decoration="line-through">$21.00</text>
        <text y="14" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="18" fill="#FFD877">$15.50</text>
      </g>
    </svg>`;
}

function golfArt() {
  // miniature of the 2D Marina Bay Sands hole: ball lined up for the gap between the towers
  const h = GOLF_HOLES.find((x) => x.id === 'mbs');
  const P = 'hubg-';
  const { under, over } = holeSVG(h, P);
  const bx = 300, by = 400, ang = -0.62, len = 190;
  const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
  return `
    <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      ${under}
      ${golfCupSVG(h, P)}
      <line x1="${bx + Math.cos(ang) * 20}" y1="${by + Math.sin(ang) * 20}" x2="${ex}" y2="${ey}" stroke="#FFD877" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 16"/>
      <path d="M0 -15 L22 0 L0 15 Z" transform="translate(${ex} ${ey}) rotate(${(ang * 180) / Math.PI})" fill="#FFD877" stroke="#20302A" stroke-width="2.5"/>
      <circle cx="${bx}" cy="${by}" r="24" fill="none" stroke="#fff" stroke-width="3.5" opacity=".75"/>
      <g transform="translate(${bx} ${by}) scale(1.25)">${ballSVG('#E0457B')}</g>
      ${over}
    </svg>`;
}

const ART = {
  dial: agakArt,
  chope: chopeArt,
  mrt: mrtArt,
  kopi: kopiArt,
  pasar: pasarArt,
  golf: golfArt,
  wok: () => `
    <svg viewBox="0 0 400 240" aria-hidden="true">
      <path d="M70 120h260a130 70 0 0 1-260 0z" fill="#2A1A12"/>
      <rect x="320" y="112" width="70" height="14" rx="7" fill="#6B3E26" stroke="#2A1A12" stroke-width="3"/>
      <g fill="none" stroke="#2A1A12" stroke-width="5" stroke-linecap="round" opacity=".55">
        <path d="M150 90c-14-18 14-28 0-48"/><path d="M200 86c-14-18 14-28 0-48"/><path d="M250 90c-14-18 14-28 0-48"/>
      </g>
    </svg>`,
  tissue: () => `
    <svg viewBox="0 0 400 240" aria-hidden="true">
      <rect x="110" y="70" width="180" height="110" rx="14" fill="#FBF6EC" stroke="#2A1A12" stroke-width="4" stroke-dasharray="10 8"/>
      <path d="M170 74c10 20 50 20 60 0" fill="none" stroke="#2A1A12" stroke-width="4"/>
      <text x="200" y="140" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="26" fill="#2A1A12">CHOPED</text>
    </svg>`,
};

function el(tag, attrs = {}, html = '') {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.innerHTML = html;
  return e;
}

function renderGames(grid) {
  for (const g of GAMES) {
    const card = el('article', { class: `card ${g.status}`, style: `--accent:${g.accent}` });
    const actions = (g.links || [])
      .map(
        (l) => `<a class="btn ${l.primary ? 'btn-primary' : 'btn-ghost'}" href="${l.href}">${l.label}${
          l.badge ? ` <span class="badge">${l.badge}</span>` : ''
        }</a>`
      )
      .join('');
    // Six fixed rows (art, kicker, title, blurb, tags, actions) so every card lines up on the grid.
    card.innerHTML = `
      <div class="card-art${BLEED.has(g.art) ? ' bleed' : ''}">${ART[g.art] ? ART[g.art]() : ''}</div>
      <p class="card-kicker">${g.tagline}</p>
      <h3>${g.title}</h3>
      <p class="blurb">${g.blurb}</p>
      <ul class="tags">${g.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
      <div class="card-actions">${actions}</div>`;
    grid.appendChild(card);
  }
}

const skyline = document.getElementById('skyline');
drawSkyline(skyline);
let skyTimer = 0;
new ResizeObserver(() => {
  clearTimeout(skyTimer);
  skyTimer = setTimeout(() => {
    const box = skyline.getBoundingClientRect();
    const want = Math.max(640, Math.round((360 * box.width) / (box.height || 360)));
    if (Math.abs(want - +(skyline.dataset.w || 0)) > 24) { skyline.classList.add('no-anim'); drawSkyline(skyline); }
  }, 120);
}).observe(skyline);
renderGames(document.getElementById('game-grid'));
