// Marina Mini Golf — SVG art for the 2D board (and the hub card). World units × 10 = SVG units.
import { W, H, BALL_R, CUP_R } from './engine.js';

export const S = 10;
const INK = '#20302A';
const pts = (poly) => poly.map(([x, y]) => `${(x * S).toFixed(1)},${(y * S).toFixed(1)}`).join(' ');
const pathOf = (poly) => `M${pts(poly).replace(/ /g, ' L')} Z`;

export const THEME = {
  voiddeck: { ground: '#DCD5C8', rim: '#C9C1B1', rimEdge: '#8C8475', turf: '#4DAE5B', turf2: '#55B862' },
  merlion: { ground: '#2F7FB5', rim: '#D8C8A8', rimEdge: '#9A8763', turf: '#4AAB58', turf2: '#53B661' },
  esplanade: { ground: '#B98A5A', rim: '#8A6038', rimEdge: '#5A3D22', turf: '#48A957', turf2: '#52B460' },
  hawker: { ground: '#E8E2D6', rim: '#2E8C8C', rimEdge: '#1D5E5E', turf: '#4BAC59', turf2: '#55B763' },
  supertree: { ground: '#21503A', rim: '#6B4A30', rimEdge: '#3F2B1B', turf: '#4FB25C', turf2: '#59BC66' },
  mrt: { ground: '#8E8A84', rim: '#C5CBD1', rimEdge: '#7C858F', turf: '#4AAA57', turf2: '#54B561' },
  mbs: { ground: '#1E4470', rim: '#C3CAD3', rimEdge: '#7D8794', turf: '#49AA57', turf2: '#53B561' },
  jewel: { ground: '#1D4A37', rim: '#CBD0D6', rimEdge: '#838B95', turf: '#4DAF5A', turf2: '#57BA64' },
  flyer: { ground: '#5D9C50', rim: '#8B5A2B', rimEdge: '#5A3A1B', turf: '#47A855', turf2: '#51B35F' },
};

function defs(h, P) {
  const T = THEME[h.id];
  return `
  <defs>
    <pattern id="${P}turf" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
      <rect width="80" height="80" fill="${T.turf}"/><rect width="40" height="80" fill="${T.turf2}"/>
    </pattern>
    <pattern id="${P}sand" width="22" height="22" patternUnits="userSpaceOnUse">
      <rect width="22" height="22" fill="#EED9A4"/><circle cx="5" cy="6" r="1.4" fill="#D6BC7F"/><circle cx="15" cy="15" r="1.2" fill="#D6BC7F"/><circle cx="17" cy="4" r=".9" fill="#FFF1C9"/>
    </pattern>
    <pattern id="${P}water" width="60" height="30" patternUnits="userSpaceOnUse">
      <rect width="60" height="30" fill="#2E8BD0"/><path d="M0 15 q15 -8 30 0 t30 0" fill="none" stroke="#7CC4F2" stroke-width="2.5" opacity=".7"/>
    </pattern>
    <pattern id="${P}tiles" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="${T.ground}"/><path d="M0 0H40V40" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="2"/>
    </pattern>
    <pattern id="${P}planks" width="200" height="24" patternUnits="userSpaceOnUse">
      <rect width="200" height="24" fill="${T.ground}"/><path d="M0 23.5H200M60 0V24M150 0V24" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
    </pattern>
    <pattern id="${P}gravel" width="24" height="24" patternUnits="userSpaceOnUse">
      <rect width="24" height="24" fill="${T.ground}"/><circle cx="4" cy="5" r="2.4" fill="#A19C95"/><circle cx="15" cy="12" r="2.8" fill="#77736E"/><circle cx="8" cy="19" r="2" fill="#B3AEA7"/><circle cx="20" cy="21" r="1.6" fill="#6C6863"/>
    </pattern>
    <pattern id="${P}bay" width="80" height="40" patternUnits="userSpaceOnUse">
      <rect width="80" height="40" fill="${T.ground}"/><path d="M0 20 q20 -7 40 0 t40 0" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="2.5"/>
    </pattern>
    <pattern id="${P}grass" width="30" height="30" patternUnits="userSpaceOnUse">
      <rect width="30" height="30" fill="${T.ground}"/><path d="M6 10l2-5 2 5M20 24l2-5 2 5" stroke="rgba(0,0,0,.14)" stroke-width="2" fill="none"/>
    </pattern>
    <pattern id="${P}chev" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M8 12l12 12 12-12" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </pattern>
    <radialGradient id="${P}cupg"><stop offset="0" stop-color="#05110C"/><stop offset=".8" stop-color="#16271F"/><stop offset="1" stop-color="#2B4A3A"/></radialGradient>
    <radialGradient id="${P}vortex"><stop offset="0" stop-color="#0B2F52"/><stop offset=".6" stop-color="#2E8BD0"/><stop offset="1" stop-color="#9AD6FF"/></radialGradient>
    <linearGradient id="${P}glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5D7FA8"/><stop offset="1" stop-color="#253D5E"/></linearGradient>
    <clipPath id="${P}clip"><path d="${pathOf(h.outline)}"/></clipPath>
  </defs>`;
}

const groundFill = { voiddeck: 'tiles', merlion: 'bay', esplanade: 'planks', hawker: 'tiles', supertree: 'grass', mrt: 'gravel', mbs: 'bay', jewel: 'grass', flyer: 'grass' };

// ---------- scenery outside the course ----------
function scenery(h, P) {
  switch (h.id) {
    case 'voiddeck': {
      let lb = '';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) lb += `<rect x="${392 + c * 28}" y="${338 + r * 22}" width="24" height="18" rx="2" fill="#B7BEC4" stroke="#7C858F" stroke-width="1.5"/><rect x="${398 + c * 28}" y="${344 + r * 22}" width="12" height="2.5" fill="#5C646C"/>`;
      let board = '';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) board += `<rect x="${172 + i * 14}" y="${392 + j * 14}" width="14" height="14" fill="${(i + j) % 2 ? '#2A2A2A' : '#EDE6D6'}"/>`;
      return `
        <g>${lb}<rect x="388" y="332" width="234" height="72" rx="4" fill="none" stroke="#7C858F" stroke-width="3"/>
          <text x="505" y="428" text-anchor="middle" class="sc-text" fill="#6C6457">BLK 123 · LETTER BOXES</text></g>
        <g><circle cx="200" cy="420" r="56" fill="#CFC8BB" stroke="#9D9584" stroke-width="4"/>${board}
          ${[[200, 342], [200, 498], [122, 420], [278, 420]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15" fill="#CFC8BB" stroke="#9D9584" stroke-width="3"/>`).join('')}</g>
        <g transform="translate(560 480)"><ellipse cx="0" cy="0" rx="40" ry="26" fill="#6FA34B"/><ellipse cx="-12" cy="-6" rx="18" ry="12" fill="#86BC5D"/><ellipse cx="14" cy="4" rx="14" ry="10" fill="#5C8F3D"/></g>
        <g transform="translate(90 470)"><rect x="-28" y="-34" width="56" height="68" rx="6" fill="#3E6CB0" stroke="#24467A" stroke-width="3"/><text y="-12" text-anchor="middle" class="sc-text" fill="#fff">NOTICE</text><rect x="-20" y="-4" width="18" height="24" fill="#FFF1C9"/><rect x="2" y="-4" width="18" height="16" fill="#FCE4E7"/></g>`;
    }
    case 'hawker': {
      const stalls = ['CHICKEN RICE', 'LAKSA', 'SATAY', 'CHAR KWAY TEOW', 'DRINKS'];
      const cols = ['#D7263D', '#F2B134', '#1F8A8A', '#6A4FB3', '#2F6B4F'];
      return `<g>${stalls.map((n, i) => `<g transform="translate(${100 + i * 200} 28)"><rect x="-88" y="-22" width="176" height="36" rx="6" fill="${cols[i]}" stroke="${INK}" stroke-width="2.5"/><text y="2" text-anchor="middle" class="sc-text" fill="#fff">${n}</text></g>`).join('')}</g>
        <g>${[1, 2, 3, 4].map((i) => `<text x="${i * 200}" y="604" text-anchor="middle" class="sc-text" fill="#9D9584">#01-${String(10 + i).padStart(2, '0')}</text>`).join('')}</g>`;
    }
    case 'mrt': {
      let sl = '';
      for (let y = -10; y < 640; y += 26) sl += `<rect x="438" y="${y}" width="124" height="12" rx="2" fill="#6E5A47"/>`;
      return `<g>${sl}<rect x="462" y="0" width="8" height="620" fill="#C9CED3"/><rect x="530" y="0" width="8" height="620" fill="#C9CED3"/></g>
        <rect x="0" y="0" width="1000" height="16" fill="#F2B134"/><rect x="0" y="604" width="1000" height="16" fill="#F2B134"/>
        <text x="220" y="70" text-anchor="middle" class="sc-text" fill="#F4F1EA">MIND THE GAP</text><text x="780" y="70" text-anchor="middle" class="sc-text" fill="#F4F1EA">PLATFORM B</text>`;
    }
    case 'supertree':
    case 'jewel': {
      let f = '';
      const spots = [[30, 30], [970, 30], [30, 590], [970, 590], [500, 18], [500, 604], [20, 310], [980, 310], [180, 20], [820, 600]];
      spots.forEach(([x, y], i) => {
        f += `<g transform="translate(${x} ${y})"><ellipse rx="46" ry="30" fill="${i % 2 ? '#2F7A4F' : '#3C8C58'}"/><ellipse cx="-14" cy="-8" rx="22" ry="14" fill="#4FA368"/>
          <circle cx="16" cy="6" r="6" fill="${h.id === 'jewel' ? '#F2B134' : '#E88EA6'}"/><circle cx="-6" cy="12" r="4" fill="#FFF1C9"/></g>`;
      });
      return `<g>${f}</g>`;
    }
    case 'esplanade':
      return `<rect x="0" y="0" width="1000" height="50" fill="#2F7FB5"/><path d="M0 50H1000" stroke="#5A3D22" stroke-width="6"/>
        <text x="500" y="604" text-anchor="middle" class="sc-text" fill="#5A3D22">ESPLANADE WATERFRONT</text>`;
    case 'flyer':
      return `<path d="M0 600 Q500 560 1000 600 L1000 620 L0 620Z" fill="#C9B79A"/>
        ${[[30, 40], [970, 40], [30, 580], [970, 580]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="26" fill="#3E7D3A"/><circle cx="-6" cy="-6" r="14" fill="#5FA052"/></g>`).join('')}`;
    case 'merlion':
    case 'mbs':
      return `<g opacity=".7">${[[120, 28], [380, 22], [640, 30], [880, 24], [220, 598], [760, 600]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#FFD877"/><circle cx="${x}" cy="${y}" r="12" fill="#FFD877" opacity=".25"/>`).join('')}</g>`;
  }
  return '';
}

// ---------- obstacle sprites (drawn at the circle's centre, radius in svg units) ----------
function sprite(c) {
  const r = c.r * S;
  const at = (inner) => `<g class="ob ob-${c.kind}" transform="translate(${c.x * S} ${c.y * S})">${inner}</g>`;
  switch (c.kind) {
    case 'pillar':
      return at(`<ellipse cx="4" cy="6" rx="${r}" ry="${r}" fill="rgba(0,0,0,.2)"/><rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" rx="5" fill="#EDE7DA" stroke="#8C8475" stroke-width="3"/>
        <rect x="${-r + 5}" y="${-r + 5}" width="${2 * r - 10}" height="${2 * r - 10}" rx="3" fill="none" stroke="#C25E3C" stroke-width="3"/><circle r="4" fill="#C25E3C"/>`);
    case 'merlion':
      return at(`<circle r="${r + 4}" fill="#C9B79A" stroke="#8D7B5C" stroke-width="3"/>
        <path d="M-6 30 C 20 34 26 10 16 -2 C 30 6 28 26 10 34 Z" fill="#E9E4DA" stroke="#8C877C" stroke-width="2"/>
        <path d="M2 24 c6 -2 10 -6 10 -12M-2 16 c6 -1 9 -4 9 -9" fill="none" stroke="#B9B3A6" stroke-width="2"/>
        <g transform="translate(-4 -6)">
          ${Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return `<circle cx="${Math.cos(a) * 16}" cy="${Math.sin(a) * 16}" r="8" fill="#DCD5C8" stroke="#8C877C" stroke-width="1.5"/>`; }).join('')}
          <circle r="15" fill="#F2EEE6" stroke="#8C877C" stroke-width="2"/>
          <circle cx="-5" cy="-3" r="2.2" fill="${INK}"/><circle cx="5" cy="-3" r="2.2" fill="${INK}"/>
          <path d="M-5 6 q5 5 10 0" fill="#3A4A44"/>
        </g>`);
    case 'dome': {
      let spikes = '';
      const n = Math.round(r / 3.2);
      for (let ring = 1; ring <= 3; ring++) {
        const rr = (r * ring) / 3.4;
        const k = Math.max(5, Math.round((n * ring) / 2));
        for (let i = 0; i < k; i++) {
          const a = (i / k) * Math.PI * 2 + ring * 0.4;
          const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
          spikes += `<path d="M${x - 4} ${y + 3} L${x} ${y - 5} L${x + 4} ${y + 3}Z" fill="#7B6A45" opacity=".75" transform="rotate(${(a * 180) / Math.PI + 90} ${x} ${y})"/>`;
        }
      }
      return at(`<circle cx="5" cy="7" r="${r}" fill="rgba(0,0,0,.22)"/><circle r="${r}" fill="#C9B27A" stroke="#6E5B33" stroke-width="3"/>${spikes}<ellipse cx="${-r * 0.35}" cy="${-r * 0.4}" rx="${r * 0.35}" ry="${r * 0.22}" fill="#fff" opacity=".35"/><circle r="${r}" class="dome-glow" fill="#FFF1C9" opacity="0"/>`);
    }
    case 'table':
      return at(`<circle cx="3" cy="5" r="${r}" fill="rgba(0,0,0,.18)"/><circle r="${r}" fill="#F4F2EE" stroke="#9AA3AD" stroke-width="3"/>
        <circle cx="-8" cy="-6" r="9" fill="#fff" stroke="#C9CED3" stroke-width="2"/><circle cx="-8" cy="-6" r="5" fill="#F2B134"/><path d="M-11 -6h6" stroke="#E07A3A" stroke-width="2"/>
        <circle cx="11" cy="8" r="6" fill="#B5652E" stroke="#fff" stroke-width="2"/><rect x="4" y="-15" width="14" height="9" rx="2" fill="#FCE4E7" stroke="#D7263D" stroke-width="1.5"/>`);
    case 'stool':
      return at(`<circle cx="2" cy="3" r="${r}" fill="rgba(0,0,0,.18)"/><circle r="${r}" fill="#E0457B" stroke="#8E1F47" stroke-width="2"/><circle cx="-3" cy="-3" r="${r * 0.35}" fill="#fff" opacity=".45"/>`);
    case 'tree': {
      let ribs = '';
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        ribs += `<path d="M${Math.cos(a) * r * 0.5} ${Math.sin(a) * r * 0.5} Q${Math.cos(a + 0.25) * r * 1.2} ${Math.sin(a + 0.25) * r * 1.2} ${Math.cos(a + 0.12) * r * 1.65} ${Math.sin(a + 0.12) * r * 1.65}" fill="none" stroke="#5A2468" stroke-width="2.5"/>`;
      }
      let dots = '';
      for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2 + 0.2, rr = r * (i % 2 ? 1.2 : 1.55); dots += `<circle cx="${Math.cos(a) * rr}" cy="${Math.sin(a) * rr}" r="2.4" fill="#FFE59A" class="tw" style="--d:${(i * 0.17).toFixed(2)}s"/>`; }
      return at(`<circle cx="8" cy="10" r="${r * 1.7}" fill="rgba(0,0,0,.16)"/>
        <circle r="${r * 1.7}" fill="#D06BC9" opacity=".42" stroke="#7A2E86" stroke-width="2.5"/>${ribs}
        <circle r="${r * 1.12}" fill="none" stroke="#E98AD9" stroke-width="3" stroke-dasharray="5 4"/>
        <circle r="${r * 0.62}" fill="#8E3E9E" stroke="#4A1F55" stroke-width="3"/>
        <circle r="${r * 0.3}" fill="#3F2A24"/>${dots}`);
    }
    case 'hub':
      return at(`<circle r="${r}" fill="#9AA3AD" stroke="#4E5761" stroke-width="3"/><circle r="${r * 0.4}" fill="#4E5761"/>`);
  }
  return at(`<circle r="${r}" fill="#999"/>`);
}

function blockArt(h, poly, i, P) {
  const xs = poly.map((p) => p[0] * S), ys = poly.map((p) => p[1] * S);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (h.id === 'mbs') {
    let win = '';
    for (let y = y0 + 16; y < y1 - 6; y += 14) win += `<path d="M${x0 + 8} ${y}H${x1 - 8}" stroke="#9EC3E8" stroke-width="2" opacity=".5"/>`;
    return `<rect x="${x0 + 6}" y="${y0 + 8}" width="${x1 - x0}" height="${y1 - y0}" fill="rgba(0,0,0,.3)"/>
      <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="url(#${P}glass)" stroke="#16263C" stroke-width="3"/>${win}
      <path d="M${x0 + (x1 - x0) / 2} ${y0}V${y1}" stroke="#16263C" stroke-width="2" opacity=".6"/>`;
  }
  if (h.id === 'hawker') {
    return `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="3" fill="#B7BEC4" stroke="#4E5761" stroke-width="3"/>
      <text x="${(x0 + x1) / 2}" y="${(y0 + y1) / 2 + 5}" text-anchor="middle" class="sc-text small" fill="#2E3A44">TRAY RETURN</text>`;
  }
  if (h.id === 'flyer') {
    return `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="6" fill="#D8D2C4" stroke="#8C8475" stroke-width="3"/>
      <rect x="${x0 + 10}" y="${y0 + 10}" width="${x1 - x0 - 20}" height="${y1 - y0 - 20}" rx="4" fill="#5FA052"/>
      ${[0.25, 0.5, 0.75].map((k) => `<circle cx="${x0 + (x1 - x0) * k}" cy="${(y0 + y1) / 2}" r="7" fill="${['#E0457B', '#F2B134', '#fff'][Math.round(k * 4) % 3]}"/>`).join('')}`;
  }
  // stone wall (merlion)
  return `<rect x="${x0 + 4}" y="${y0 + 6}" width="${x1 - x0}" height="${y1 - y0}" fill="rgba(0,0,0,.22)"/>
    <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="3" fill="#D8C8A8" stroke="#8D7B5C" stroke-width="3"/>
    ${Array.from({ length: Math.floor((y1 - y0) / 30) }, (_, k) => `<path d="M${x0} ${y0 + 30 * (k + 1)}H${x1}" stroke="#A8957A" stroke-width="2"/>`).join('')}`;
}

function zoneArt(z, P, h) {
  const shape = (fill, extra = '') => z.circle
    ? `<circle cx="${z.circle[0] * S}" cy="${z.circle[1] * S}" r="${z.circle[2] * S}" fill="${fill}" ${extra}/>`
    : `<path d="${pathOf(z.poly)}" fill="${fill}" ${extra}/>`;
  if (z.type === 'sand') return shape(`url(#${P}sand)`, 'stroke="#D6BC7F" stroke-width="4" stroke-linejoin="round"');
  if (z.type === 'water') {
    if (z.kind === 'vortex') {
      const [cx, cy, r] = z.circle;
      return `<g transform="translate(${cx * S} ${cy * S})"><circle r="${r * S + 6}" fill="#C7CCD2"/><circle r="${r * S}" fill="url(#${P}vortex)"/>
        <g class="spin">${[0, 1, 2, 3].map((i) => `<path d="M0 0 Q ${r * 6} ${-r * 4} ${r * S * 0.95} 0" transform="rotate(${i * 90})" fill="none" stroke="#fff" stroke-width="2.5" opacity=".6"/>`).join('')}</g></g>`;
    }
    return shape(`url(#${P}water)`, 'class="water" stroke="#1D5E99" stroke-width="3"');
  }
  if (z.type === 'slope') {
    const ang = (Math.atan2(z.ay, z.ax) * 180) / Math.PI - 90;
    const xs = z.poly.map((p) => p[0] * S), ys = z.poly.map((p) => p[1] * S);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const tint = z.kind === 'spray' ? 'rgba(124,196,242,.35)' : z.kind === 'spill' ? 'rgba(181,101,46,.22)' : 'rgba(0,0,0,.08)';
    const id = `${P}sl${Math.round(cx)}${Math.round(cy)}`;
    return `<clipPath id="${id}"><path d="${pathOf(z.poly)}"/></clipPath>
      <g clip-path="url(#${id})"><path d="${pathOf(z.poly)}" fill="${tint}"/>
        <g transform="translate(${cx} ${cy}) rotate(${ang})"><rect class="chev" x="-400" y="-400" width="800" height="840" fill="url(#${P}chev)" opacity=".55"/></g></g>`;
  }
  if (z.type === 'pull') {
    const [cx, cy, r] = z.circle;
    return `<g transform="translate(${cx * S} ${cy * S})"><circle r="${r * S}" fill="rgba(46,139,208,.12)" stroke="rgba(46,139,208,.45)" stroke-width="3" stroke-dasharray="10 8"/>
      <g class="spin slow">${[0.45, 0.7, 0.92].map((k, i) => `<circle r="${r * S * k}" fill="none" stroke="rgba(154,214,255,.55)" stroke-width="3" stroke-dasharray="${18 + i * 8} ${26 + i * 6}"/>`).join('')}</g></g>`;
  }
  return '';
}

function overlay(h) {
  if (h.id === 'mbs') {
    // SkyPark: the ship across the three tower tops. The ball rolls underneath.
    return `<g class="skypark"><path d="M330 108 L720 108 Q738 108 742 120 L742 132 L330 132 Q318 120 330 108Z" fill="#DDE3EA" stroke="#5D6B7C" stroke-width="3"/>
      <rect x="350" y="114" width="130" height="10" rx="5" fill="#46B4E8"/>${[520, 560, 600, 640, 680].map((x) => `<circle cx="${x}" cy="120" r="5" fill="#5FA052"/>`).join('')}</g>`;
  }
  if (h.id === 'merlion') {
    // the spray arcs from the Merlion's mouth into the bridge
    return `<g class="spray">${[0, 1, 2, 3, 4].map((i) => `<path d="M${470 + i * 15} 150 Q ${475 + i * 15} 215 ${450 + i * 25} 300" fill="none" stroke="#BFE6FF" stroke-width="3" stroke-dasharray="6 10" style="--d:${i * 0.12}s"/>`).join('')}</g>`;
  }
  if (h.id === 'flyer') {
    const [cx, cy] = [500, 310];
    return `<circle cx="${cx}" cy="${cy}" r="${10.2 * S + 6}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-dasharray="4 6"/>`;
  }
  return '';
}

/** Track bed drawn inside the MRT hole (purely visual). */
function inner(h) {
  if (h.id === 'mrt') {
    let sl = '';
    for (let y = 100; y < 520; y += 26) sl += `<rect x="440" y="${y}" width="120" height="10" rx="2" fill="rgba(110,90,71,.55)"/>`;
    return `<rect x="440" y="100" width="120" height="420" fill="rgba(0,0,0,.12)"/>${sl}<rect x="462" y="100" width="8" height="420" fill="rgba(220,224,228,.8)"/><rect x="530" y="100" width="8" height="420" fill="rgba(220,224,228,.8)"/>`;
  }
  if (h.id === 'voiddeck') {
    return `<path d="M120 80V280M260 80V280M400 80V280M540 80V280M680 80V540M800 80V540" stroke="rgba(255,255,255,.12)" stroke-width="2"/>`;
  }
  return '';
}

export function cupSVG(h, P = '', flagColor = '#D7263D') {
  const [x, y] = h.cup.map((v) => v * S);
  return `<g class="cup" transform="translate(${x} ${y})">
    <circle r="${CUP_R * S + 4}" fill="#E9F5EC" opacity=".55"/><circle r="${CUP_R * S}" fill="url(#${P}cupg)"/>
    <g class="flag"><rect x="-2" y="-78" width="4" height="78" fill="#F4F1EA" stroke="${INK}" stroke-width="1"/>
      <path class="flag-cloth" d="M2 -78 L40 -68 L2 -56Z" fill="${flagColor}" stroke="${INK}" stroke-width="1.5"/>
      <text x="14" y="-63" class="flag-num" fill="#fff">${''}</text></g>
  </g>`;
}

export function teeSVG(h) {
  const [x, y] = h.tee.map((v) => v * S);
  return `<g transform="translate(${x} ${y})"><rect x="-22" y="-22" width="44" height="44" rx="8" fill="#2F6B4F" opacity=".35"/><rect x="-22" y="-22" width="44" height="44" rx="8" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="5 5" opacity=".7"/></g>`;
}

export function ballSVG(color = '#fff') {
  const r = BALL_R * S;
  return `<ellipse class="ball-shadow" cx="3" cy="5" rx="${r}" ry="${r * 0.8}" fill="rgba(0,0,0,.32)"/>
    <circle class="ball-body" r="${r}" fill="${color}" stroke="${INK}" stroke-width="2.2"/>
    <circle cx="${-r * 0.35}" cy="${-r * 0.38}" r="${r * 0.32}" fill="#fff" opacity=".75"/>`;
}

/** Static hole art, split into what sits under the ball and what sits over it. */
export function holeSVG(h, P = 'g-', { flat = false } = {}) {
  const T = THEME[h.id];
  if (flat) {
    // floor texture for the 3D build: ground, scenery, turf and zones only (models supply the rest)
    return {
      under: `${defs(h, P)}
        <rect x="-400" y="-400" width="1800" height="1420" fill="url(#${P}${groundFill[h.id]})"/>
        ${scenery(h, P)}
        <path d="${pathOf(h.outline)}" fill="${T.rim}" stroke="${T.rim}" stroke-width="26" stroke-linejoin="round"/>
        <path d="${pathOf(h.outline)}" fill="url(#${P}turf)"/>
        <g clip-path="url(#${P}clip)">${inner(h)}${h.zones.map((z) => zoneArt(z, P, h)).join('')}</g>
        ${teeSVG(h)}`,
      over: '',
    };
  }
  const under = `
    ${defs(h, P)}
    <rect x="-20" y="-20" width="1040" height="660" fill="url(#${P}${groundFill[h.id]})"/>
    ${scenery(h, P)}
    <path d="${pathOf(h.outline)}" fill="${T.rimEdge}" stroke="${T.rimEdge}" stroke-width="30" stroke-linejoin="round" transform="translate(4 7)" opacity=".45"/>
    <path d="${pathOf(h.outline)}" fill="${T.rim}" stroke="${T.rim}" stroke-width="26" stroke-linejoin="round"/>
    <path d="${pathOf(h.outline)}" fill="none" stroke="${T.rimEdge}" stroke-width="2" stroke-linejoin="round" transform="scale(1)" opacity=".0"/>
    <path d="${pathOf(h.outline)}" fill="url(#${P}turf)" stroke="${T.rimEdge}" stroke-width="2.5" stroke-linejoin="round"/>
    <g clip-path="url(#${P}clip)">${inner(h)}${h.zones.map((z) => zoneArt(z, P, h)).join('')}</g>
    ${teeSVG(h)}
    ${h.blocks.map((b, i) => blockArt(h, b, i, P)).join('')}
    ${h.circles.map(sprite).join('')}`;
  return { under, over: overlay(h) };
}

/** Moving obstacle art at a given set of shapes (from engine.moverShapes). */
export function moverSVG(m) {
  if (m.type === 'bar') {
    const [ax, ay] = m.a.map((v) => v * S), [bx, by] = m.b.map((v) => v * S);
    return `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#F4F1EA" stroke-width="${m.rad * 2 * S}" stroke-linecap="round"/>
      <line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#9AA3AD" stroke-width="3" stroke-linecap="round"/>
      <g transform="translate(${bx} ${by}) rotate(${(m.angle * 180) / Math.PI})"><rect x="-9" y="-13" width="18" height="26" rx="8" fill="#BFE6FF" stroke="${INK}" stroke-width="2"/></g>`;
  }
  return '';
}

/** Train body for the slider (drawn once, moved with a transform). */
export function trainSVG(m) {
  const x0 = m.x0 * S, w = (m.x1 - m.x0) * S, h = m.h * S;
  return `<g class="train"><rect x="${x0 + 5}" y="8" width="${w}" height="${h}" rx="14" fill="rgba(0,0,0,.28)"/>
    <rect x="${x0}" y="0" width="${w}" height="${h}" rx="14" fill="#F4F6F8" stroke="${INK}" stroke-width="3"/>
    <rect x="${x0}" y="${h * 0.48}" width="${w}" height="8" fill="#D7263D"/>
    <rect x="${x0 + 14}" y="10" width="${w - 28}" height="${h * 0.3}" rx="6" fill="#33475C"/>
    <rect x="${x0 + 14}" y="${h * 0.62}" width="${w - 28}" height="${h * 0.28}" rx="6" fill="#33475C"/>
    <rect x="${x0 + 22}" y="${h * 0.44}" width="${w - 44}" height="${h * 0.12}" rx="3" fill="#C9CED3"/></g>`;
}
