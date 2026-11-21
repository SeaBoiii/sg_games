// Pasar Malam Haggle — SVG art for the 2D scene, the UI and the hub card.
// Stallholders reuse the Kopi Master character art so the SG cast looks the same across games.
export { customerSVG as sellerSVG, PATTERN_DEFS as PEOPLE_DEFS } from '../../kopi-master/js/art.js';

const INK = '#2A1A12';

/** Goods on the table, drawn about 160 wide, centred on (0,0) with the base at y≈60. */
export const GOODS = {
  lights: () => {
    let b = '';
    const pts = [[-80, -20], [-50, 0], [-20, -16], [10, 4], [40, -14], [72, 2]];
    b += `<path d="M${pts.map((p) => p.join(' ')).join(' L')}" fill="none" stroke="${INK}" stroke-width="3"/>`;
    const cols = ['#F2B134', '#E0457B', '#2D6FD1', '#3F8F5B', '#F2B134', '#E0457B'];
    pts.forEach(([x, y], i) => { b += `<g transform="translate(${x} ${y + 8})"><circle r="16" fill="${cols[i]}" opacity=".35"/><ellipse rx="7" ry="10" fill="${cols[i]}" stroke="${INK}" stroke-width="2.5"/><rect x="-4" y="-14" width="8" height="6" fill="#9AA4A8" stroke="${INK}" stroke-width="2"/></g>`; });
    b += `<rect x="-60" y="28" width="120" height="34" rx="6" fill="#2F6B4F" stroke="${INK}" stroke-width="3"/><text y="51" text-anchor="middle" class="goods-label">FAIRY LIGHTS</text>`;
    return b;
  },
  case: () => `<rect x="-38" y="-70" width="76" height="132" rx="16" fill="#E0457B" stroke="${INK}" stroke-width="4"/>
    <rect x="-28" y="-60" width="26" height="30" rx="8" fill="#2A1A12"/><circle cx="-15" cy="-45" r="7" fill="#5B6B7A"/>
    <g fill="#F2B134"><circle cx="8" cy="0" r="7"/><circle cx="-12" cy="22" r="5"/><circle cx="16" cy="36" r="6"/></g>
    <path d="M-20 -6l6 6 10 -14" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  slippers: () => `<g transform="rotate(-12)"><path d="M-70 -50 q-14 50 0 104 q16 14 30 0 q14 -54 0 -104 q-15 -12 -30 0z" fill="#2D6FD1" stroke="${INK}" stroke-width="4"/><path d="M-70 -14 q15 -18 30 0" fill="none" stroke="#F4F2EE" stroke-width="7" stroke-linecap="round"/></g>
    <g transform="rotate(10)"><path d="M30 -54 q-14 50 0 104 q16 14 30 0 q14 -54 0 -104 q-15 -12 -30 0z" fill="#2D6FD1" stroke="${INK}" stroke-width="4"/><path d="M30 -18 q15 -18 30 0" fill="none" stroke="#F4F2EE" stroke-width="7" stroke-linecap="round"/></g>`,
  shades: () => `<path d="M-84 -10 h168" stroke="${INK}" stroke-width="5"/><g fill="#1A1512" stroke="${INK}" stroke-width="4"><path d="M-78 -12 h60 q2 40 -30 40 q-32 0 -30 -40z"/><path d="M18 -12 h60 q2 40 -30 40 q-32 0 -30 -40z"/></g>
    <path d="M-66 -4 l14 -2 M30 -4 l14 -2" stroke="#fff" stroke-opacity=".5" stroke-width="4" stroke-linecap="round"/><path d="M-18 -6 q18 -12 36 0" fill="none" stroke="${INK}" stroke-width="5"/>`,
  tee: () => `<path d="M-40 -70 l-46 20 14 40 22 -8 v80 h100 v-80 l22 8 14 -40 -46 -20 q-20 18 -40 0z" fill="#F7F3EA" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <g transform="translate(0 6)"><path d="M-28 22 h56 v-14 a28 28 0 0 0 -56 0z" fill="#D7263D" stroke="${INK}" stroke-width="3"/><circle cx="0" cy="-2" r="8" fill="#F2B134"/></g>
    <text y="56" text-anchor="middle" class="goods-label" fill="${INK}">SHIOK!</text>`,
  slicer: () => `<rect x="-76" y="-40" width="152" height="100" rx="8" fill="#F2B134" stroke="${INK}" stroke-width="4"/>
    <rect x="-64" y="-30" width="72" height="80" rx="4" fill="#fff" stroke="${INK}" stroke-width="3"/><g stroke="#9AA4A8" stroke-width="3"><path d="M-56 -10h56M-56 8h56M-56 26h56"/></g>
    <circle cx="40" cy="0" r="18" fill="#E06A2E" stroke="${INK}" stroke-width="3"/><path d="M40 -18 l-6 -14 M40 -18 l8 -12" stroke="#3F8F5B" stroke-width="4"/>
    <text x="40" y="44" text-anchor="middle" class="goods-label" fill="${INK}">AS SEEN</text>`,
  drone: () => `<g stroke="${INK}" stroke-width="4"><path d="M-60 -30 L60 30 M60 -30 L-60 30"/></g>
    ${[[-60, -30], [60, -30], [-60, 30], [60, 30]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="30" ry="7" fill="#C9CED1" stroke="${INK}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="5" fill="${INK}"/>`).join('')}
    <rect x="-26" y="-18" width="52" height="36" rx="12" fill="#1F8A8A" stroke="${INK}" stroke-width="4"/><circle cx="0" cy="0" r="8" fill="#1A1512"/><circle cx="2" cy="-2" r="3" fill="#9FD3E0"/>`,
  basket: () => `<path d="M-74 -20 h148 l-16 80 h-116z" fill="#C79A5B" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <g stroke="#8E6A3A" stroke-width="3">${[-8, 12, 32, 52].map((y) => `<path d="M${-70 + (y + 20) * 0.2} ${y} h${140 - (y + 20) * 0.4}"/>`).join('')}${[-50, -25, 0, 25, 50].map((x) => `<path d="M${x} -20 v80"/>`).join('')}</g>
    <path d="M-50 -20 q50 -70 100 0" fill="none" stroke="${INK}" stroke-width="7"/><path d="M-50 -20 q50 -70 100 0" fill="none" stroke="#C79A5B" stroke-width="3"/>`,
  bubbles: () => `<rect x="-12" y="-10" width="24" height="70" rx="8" fill="#E0457B" stroke="${INK}" stroke-width="3"/><path d="M0 -10 v-40" stroke="${INK}" stroke-width="4"/><circle cx="0" cy="-62" r="14" fill="none" stroke="${INK}" stroke-width="4"/>
    ${[[-50, -60, 22], [44, -80, 16], [56, -30, 12], [-60, -10, 10]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#9FD3E0" fill-opacity=".35" stroke="#4FA3BF" stroke-width="2.5"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.25}" fill="#fff" opacity=".8"/>`).join('')}`,
  power: () => `<rect x="-46" y="-66" width="92" height="128" rx="14" fill="#2A2F36" stroke="${INK}" stroke-width="4"/><rect x="-30" y="-46" width="60" height="22" rx="4" fill="#3F8F5B"/>
    <g fill="#9FE3A8">${[0, 1, 2, 3].map((i) => `<rect x="${-26 + i * 14}" y="-42" width="10" height="14" rx="2"/>`).join('')}</g><path d="M-6 0 l-10 22 h12 l-6 22 18 -28 h-12 l8 -16z" fill="#F2B134" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
  scarf: () => `<defs><pattern id="pm-batik" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#1F5FAF"/><circle cx="14" cy="14" r="8" fill="none" stroke="#F2B134" stroke-width="2.5"/><circle cx="14" cy="14" r="3" fill="#E0457B"/><path d="M0 0l6 6M28 0l-6 6M0 28l6-6M28 28l-6-6" stroke="#F4F2EE" stroke-width="2"/></pattern></defs>
    <path d="M-80 -50 q80 -30 160 0 v70 q-80 30 -160 0z" fill="url(#pm-batik)" stroke="${INK}" stroke-width="4"/>
    <g stroke="#F2B134" stroke-width="3">${[-70, -50, -30, -10, 10, 30, 50, 70].map((x) => `<path d="M${x} ${24 + Math.abs(x) * 0.1} v16"/>`).join('')}</g>`,
  plant: () => `<path d="M-50 20 h100 l-12 44 h-76z" fill="#B85A3A" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><rect x="-56" y="12" width="112" height="14" rx="4" fill="#9E4A2E" stroke="${INK}" stroke-width="3"/>
    <path d="M0 14 q-6 -30 10 -52 q14 -16 -6 -34" fill="none" stroke="#6B3E26" stroke-width="9" stroke-linecap="round"/>
    ${[[-30, -40, 30], [24, -64, 28], [-10, -86, 24], [34, -30, 20]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.62}" fill="#3F8F5B" stroke="${INK}" stroke-width="3"/>`).join('')}`,
};
export const goodsSVG = (k) => (GOODS[k] ? GOODS[k]() : '');

export const CANOPY = { uncle: '#D7263D', auntie: '#1F8A8A', boy: '#F2B134', makcik: '#3F8F5B', gadget: '#6A4FB3' };

/** Small round icon of an item for lists (viewBox -100 -100 200 200). */
export const goodsIcon = (k) => `<svg viewBox="-100 -100 200 200" aria-hidden="true"><g transform="scale(.9)">${goodsSVG(k)}</g></svg>`;
