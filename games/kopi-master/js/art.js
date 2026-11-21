// Kopi Master — SVG art shared by the 2D scene and the UI (customers, cup, ingredient icons).
const INK = '#2A1A12';

/** Fabric patterns used by customer shirts. Include once per <svg>. */
export const PATTERN_DEFS = `
  <pattern id="km-pin" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#F4F6FA"/><rect width="1.6" height="10" fill="#9DB8E0"/></pattern>
  <pattern id="km-floral" width="34" height="34" patternUnits="userSpaceOnUse"><rect width="34" height="34" fill="#B2437F"/>
    <g fill="#F7D06B"><circle cx="8" cy="8" r="4"/><circle cx="26" cy="22" r="4"/></g><g fill="#fff"><circle cx="22" cy="6" r="3"/><circle cx="6" cy="26" r="3"/></g>
    <g fill="#F2B134"><circle cx="8" cy="8" r="1.5"/><circle cx="26" cy="22" r="1.5"/></g><ellipse cx="16" cy="15" rx="4" ry="1.8" fill="#4E9F3D"/></pattern>
  <pattern id="km-camo" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#6B7A3A"/>
    <g fill="#4B5A2A"><rect x="0" y="0" width="8" height="4"/><rect x="12" y="8" width="8" height="8"/><rect x="4" y="16" width="4" height="8"/></g>
    <g fill="#2E3A1E"><rect x="16" y="0" width="4" height="4"/><rect x="0" y="12" width="4" height="4"/><rect x="20" y="20" width="4" height="4"/></g>
    <g fill="#8C8A5C"><rect x="8" y="4" width="4" height="4"/><rect x="16" y="16" width="4" height="4"/></g></pattern>
  <pattern id="km-gingham" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#E4E9EF"/><rect width="6" height="16" fill="#A9BAD0"/><rect width="16" height="6" fill="#A9BAD0"/><rect width="6" height="6" fill="#6F87A8"/></pattern>
  <pattern id="km-polka" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#E07A9A"/><circle cx="4.5" cy="4.5" r="2.6" fill="#fff"/><circle cx="13.5" cy="13.5" r="2.6" fill="#fff"/></pattern>
  <pattern id="km-blouse" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#F3D1DC"/><path d="M0 8L8 0" stroke="#E9B8C8" stroke-width="1.5"/></pattern>`;

const LOOKS = {
  worker_a: { skin: '#E0B48C', hair: '#1F1A17', shirt: 'url(#km-pin)', hairStyle: 'neat', extras: ['tie', 'glasses', 'collar'] },
  worker_b: { skin: '#F2C9A0', hair: '#3B2A20', shirt: 'url(#km-blouse)', hairStyle: 'bun', extras: ['earrings', 'lanyard'] },
  student_a: { skin: '#B07A4F', hair: '#1A1512', shirt: '#F7F7F2', hairStyle: 'spiky', extras: ['crest', 'collar'] },
  student_b: { skin: '#F2C9A0', hair: '#2A1A12', shirt: '#F7F7F2', hairStyle: 'pigtails', extras: ['pinafore', 'crest'] },
  aunty: { skin: '#D9A47A', hair: '#2A2420', shirt: 'url(#km-floral)', hairStyle: 'perm', extras: ['readers', 'earrings'] },
  ns: { skin: '#8D5A3B', hair: '#1A1512', shirt: 'url(#km-camo)', hairStyle: 'neat', extras: ['cap', 'nametag'] },
  parent: { skin: '#E8B68F', hair: '#4A3A30', shirt: '#F07A5A', hairStyle: 'ponytail', extras: ['sunnies'] },
  uncle: { skin: '#D9A47A', hair: '#C9C3B8', shirt: 'url(#km-gingham)', hairStyle: 'bald', extras: ['readers'] },
  expecting: { skin: '#B07A4F', hair: '#1F1A17', shirt: 'url(#km-polka)', hairStyle: 'ponytail', extras: ['badge'] },
};

/** Front-view bust, centred on the neck at (0,0). Body extends down to y≈+230. mood: 'happy' | 'ok' | 'cross' */
export function customerSVG(who, mood = 'ok') {
  const L = LOOKS[who] || LOOKS.worker_a;
  const ex = new Set(L.extras);
  const hair = L.hair;
  const face = `
    <g class="face">
      <circle cx="-15" cy="-58" r="4.5" fill="${INK}"/><circle cx="15" cy="-58" r="4.5" fill="${INK}"/>
      <path d="M-24 ${mood === 'cross' ? -70 : -68}l14 ${mood === 'cross' ? 4 : -2}M24 ${mood === 'cross' ? -70 : -68}l-14 ${mood === 'cross' ? 4 : -2}" stroke="${hair === '#C9C3B8' ? '#8E877B' : hair}" stroke-width="4" stroke-linecap="round"/>
      <path d="M-4 -48q4 6 8 0" fill="none" stroke="${INK}" stroke-opacity=".35" stroke-width="2.5" stroke-linecap="round"/>
      ${mood === 'happy' ? `<path d="M-12 -34q12 12 24 0" fill="#9E4A4A" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
        : mood === 'cross' ? `<path d="M-11 -30q11 -9 22 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
        : `<path d="M-10 -34h20" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`}
      <circle cx="-26" cy="-44" r="6" fill="#E88EA6" opacity="${mood === 'happy' ? 0.5 : 0}"/><circle cx="26" cy="-44" r="6" fill="#E88EA6" opacity="${mood === 'happy' ? 0.5 : 0}"/>
    </g>`;
  let hairBack = '', hairFront = '';
  switch (L.hairStyle) {
    case 'neat': hairFront = `<path d="M-40 -66q0 -42 40 -42t40 42q-8 -22 -40 -22t-40 22z" fill="${hair}"/>`; break;
    case 'bun': hairBack = `<circle cx="0" cy="-112" r="18" fill="${hair}" stroke="${INK}" stroke-width="3"/>`; hairFront = `<path d="M-42 -58q0 -48 42 -48t42 48q-10 -28 -42 -28t-42 28z" fill="${hair}"/>`; break;
    case 'spiky': hairFront = `<path d="M-40 -70l-4 -20 14 6 2 -20 14 12 8 -18 10 16 14 -10 0 20 14 -2 -6 18q-14 -16 -42 -16t-38 14z" fill="${hair}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`; break;
    case 'pigtails': hairBack = `<ellipse cx="-50" cy="-56" rx="14" ry="22" fill="${hair}" stroke="${INK}" stroke-width="3"/><ellipse cx="50" cy="-56" rx="14" ry="22" fill="${hair}" stroke="${INK}" stroke-width="3"/><circle cx="-44" cy="-76" r="5" fill="#D7263D"/><circle cx="44" cy="-76" r="5" fill="#D7263D"/>`; hairFront = `<path d="M-42 -60q0 -46 42 -46t42 46q-12 -24 -42 -24t-42 24z" fill="${hair}"/>`; break;
    case 'perm': hairFront = [[-36, -76], [-22, -96], [0, -104], [22, -96], [36, -76], [-44, -54], [44, -54], [-12, -90], [12, -90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15" fill="${hair}" stroke="${INK}" stroke-width="2.5"/>`).join(''); break;
    case 'ponytail': hairBack = `<path d="M24 -90q34 10 30 60q-10 -6 -18 -30z" fill="${hair}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`; hairFront = `<path d="M-42 -60q0 -46 42 -46t42 46q-12 -26 -42 -26t-42 26z" fill="${hair}"/>`; break;
    case 'bald': hairFront = `<path d="M-42 -50q-2 -24 8 -30M42 -50q2 -24 -8 -30" fill="none" stroke="${hair}" stroke-width="10" stroke-linecap="round"/>`; break;
  }
  let acc = '';
  if (ex.has('glasses') || ex.has('readers')) {
    const y = ex.has('readers') ? -52 : -58;
    acc += `<g fill="none" stroke="#2A2F36" stroke-width="3"><circle cx="-15" cy="${y}" r="11"/><circle cx="15" cy="${y}" r="11"/><path d="M-4 ${y}h8"/></g>`;
  }
  if (ex.has('earrings')) acc += `<circle cx="-41" cy="-46" r="4" fill="#E2A93B" stroke="${INK}" stroke-width="1.5"/><circle cx="41" cy="-46" r="4" fill="#E2A93B" stroke="${INK}" stroke-width="1.5"/>`;
  if (ex.has('cap')) acc += `<path d="M-44 -74q0 -40 44 -40t44 40z" fill="#3E4A26" stroke="${INK}" stroke-width="3"/><path d="M-50 -74h100q-8 12 -50 12t-50 -12z" fill="#3E4A26" stroke="${INK}" stroke-width="3"/>`;
  if (ex.has('sunnies')) acc += `<g fill="#1A1512"><ellipse cx="-16" cy="-96" rx="13" ry="7"/><ellipse cx="16" cy="-96" rx="13" ry="7"/></g>`;
  let chest = '';
  if (ex.has('collar')) chest += `<path d="M-22 4l22 22 22 -22 -8 -6 -14 14 -14 -14z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  if (ex.has('tie')) chest += `<path d="M-7 22h14l-3 10 10 70 -14 14 -14 -14 10 -70z" fill="#A81A2E" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  if (ex.has('lanyard')) chest += `<path d="M-26 6l18 74M26 6l-18 74" stroke="#1F5FAF" stroke-width="4"/><rect x="-14" y="78" width="28" height="36" rx="4" fill="#fff" stroke="${INK}" stroke-width="2.5"/>`;
  if (ex.has('crest')) chest += `<rect x="-58" y="44" width="22" height="26" rx="5" fill="#22305C" stroke="${INK}" stroke-width="2"/><circle cx="-47" cy="55" r="4" fill="#E2A93B"/>`;
  if (ex.has('pinafore')) chest += `<g fill="#22305C" stroke="${INK}" stroke-width="2.5"><rect x="-40" y="10" width="14" height="140"/><rect x="26" y="10" width="14" height="140"/><rect x="-46" y="110" width="92" height="100" rx="6"/></g>`;
  if (ex.has('nametag')) chest += `<rect x="20" y="50" width="40" height="10" rx="2" fill="#1A1512"/><path d="M-66 30h40v10h-40z" fill="#3E4A26" stroke="${INK}" stroke-width="2"/>`;
  if (ex.has('badge')) chest += `<circle cx="-44" cy="54" r="13" fill="#F7A8C0" stroke="${INK}" stroke-width="2.5"/><path d="M-50 54h12M-44 48v12" stroke="#fff" stroke-width="3"/>`;
  return `
    <g class="customer">
      ${hairBack}
      <path d="M-92 230v-150q0 -76 92 -76t92 76v150z" fill="${L.shirt}" stroke="${INK}" stroke-width="4"/>
      ${chest}
      <rect x="-13" y="-22" width="26" height="30" fill="${L.skin}" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="-44" cy="-56" rx="8" ry="11" fill="${L.skin}" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="44" cy="-56" rx="8" ry="11" fill="${L.skin}" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="0" cy="-62" rx="42" ry="48" fill="${L.skin}" stroke="${INK}" stroke-width="4"/>
      ${hairFront}
      ${face}
      ${acc}
    </g>`;
}

// ---------- drink colours ----------
const BASE_COL = { kopi: [74, 42, 24], teh: [156, 90, 42], milo: [107, 58, 34] };
const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

export function liquidColor(cup) {
  const parts = [];
  for (const b of ['kopi', 'teh', 'milo']) for (let i = 0; i < cup[b]; i++) parts.push(BASE_COL[b]);
  if (!parts.length) return null;
  let c = parts.reduce((a, p) => a.map((v, i) => v + p[i] / parts.length), [0, 0, 0]);
  if (cup.condensed) c = mixc(c, [232, 211, 176], 0.42);
  if (cup.evaporated) c = mixc(c, [240, 226, 200], 0.5);
  if (cup.water) c = mixc(c, [200, 170, 140], 0.25);
  if (cup.tarik) c = mixc(c, [214, 170, 120], 0.15);
  return hex(c);
}

/** The drink being built, bottom-centre at (0,0). */
export function cupSVG(cup) {
  const col = liquidColor(cup);
  const liquidParts = cup.kopi + cup.teh + cup.milo + cup.condensed + cup.evaporated + cup.water;
  const glass = cup.ice > 0;
  const bag = cup.bag > 0;
  let s = '';
  if (bag) {
    // tapau: plastic bag with a raffia string
    const h = 30 + Math.min(1, liquidParts / 4) * 110;
    s += `<path d="M-70 -20 q-10 -80 10 -170 h120 q20 90 10 170 q-70 30 -140 0z" fill="#FFFFFF" fill-opacity=".35" stroke="${INK}" stroke-width="4"/>`;
    if (col) s += `<path d="M-68 -24 q-6 ${-h * 0.6} 4 ${-h} h128 q10 ${h * 0.4} 4 ${h} q-68 26 -136 0z" fill="${col}" opacity=".92"/>`;
    s += `<path d="M-56 -190 q56 -50 112 0" fill="none" stroke="#E0457B" stroke-width="5"/><path d="M-60 -186 h120" stroke="${INK}" stroke-width="4"/>`;
    if (cup.ice) s += [[-30, -80], [10, -100], [30, -60]].map(([x, y]) => `<rect x="${x}" y="${y}" width="24" height="22" rx="5" fill="#E6F6FB" fill-opacity=".85" stroke="#9FD3E0" stroke-width="2"/>`).join('');
  } else if (glass) {
    const h = 20 + Math.min(1, liquidParts / 4) * 170;
    s += `<path d="M-58 -230 l8 226 q0 6 6 6 h88 q6 0 6 -6 l8 -226" fill="#FFFFFF" fill-opacity=".3" stroke="${INK}" stroke-width="4"/>`;
    if (col) s += `<path d="M${-50 - (h / 230) * 7} ${-6 - h} l${(h / 230) * 7} ${h} h100 l${(h / 230) * 7} ${-h}z" fill="${col}"/>`;
    s += [[-38, -170], [0, -150], [-14, -110], [18, -190], [-30, -70]].slice(0, 5).map(([x, y]) => `<rect x="${x}" y="${y}" width="30" height="28" rx="6" fill="#E6F6FB" fill-opacity=".8" stroke="#9FD3E0" stroke-width="2.5"/>`).join('');
    s += `<path d="M-44 -220 l6 200" stroke="#fff" stroke-opacity=".6" stroke-width="6" stroke-linecap="round"/>`;
  } else {
    // classic kopitiam cup and saucer, green rim
    s += `<ellipse cx="0" cy="-6" rx="96" ry="18" fill="#F7F3EA" stroke="${INK}" stroke-width="4"/><ellipse cx="0" cy="-10" rx="70" ry="11" fill="#2E7D5B" opacity=".25"/>`;
    s += `<path d="M62 -110 q44 4 38 34 q-4 22 -40 22" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="M62 -110 q44 4 38 34 q-4 22 -40 22" fill="none" stroke="#F7F3EA" stroke-width="8" stroke-linecap="round"/>`;
    s += `<path d="M-70 -140 q4 118 24 124 h92 q20 -6 24 -124z" fill="#F7F3EA" stroke="${INK}" stroke-width="4"/>`;
    s += `<path d="M-70 -140 q0 -8 6 -8 h128 q6 0 6 8" fill="none" stroke="#2E7D5B" stroke-width="6"/>`;
    if (col) {
      const h = 10 + Math.min(1, liquidParts / 4) * 22;
      s += `<ellipse cx="0" cy="${-140 + (32 - h)}" rx="${62 - (32 - h) * 0.2}" ry="11" fill="${col}" stroke="${INK}" stroke-opacity=".3" stroke-width="2"/>`;
      if (cup.condensed && !cup.tarik) s += `<ellipse cx="-10" cy="${-140 + (32 - h)}" rx="18" ry="4" fill="#F3E7D2" opacity=".7"/>`;
    }
    if (col) s += `<path d="M-20 -176 q-10 -16 0 -30 M10 -180 q-10 -16 0 -30" fill="none" stroke="#BBB" stroke-opacity=".6" stroke-width="4" stroke-linecap="round" class="steam"/>`;
  }
  if (cup.tarik && col) s += `<ellipse cx="0" cy="${bag ? -150 : glass ? -200 : -132}" rx="${bag ? 56 : glass ? 50 : 60}" ry="12" fill="#F1E2C9" stroke="${INK}" stroke-opacity=".3" stroke-width="2"/>`;
  if (cup.milo > 1) s += `<path d="M-40 ${glass ? -226 : -150} q40 -40 80 0z" fill="#6B3A22" stroke="${INK}" stroke-width="3"/>`;
  // sugar cubes beside the cup
  for (let i = 0; i < cup.sugar; i++) s += `<rect x="${110 + (i % 2) * 26}" y="${-30 - Math.floor(i / 2) * 26}" width="22" height="22" rx="4" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5"/>`;
  return `<g class="cup">${s}</g>`;
}

/** Small ingredient icons for the pad (viewBox 0 0 48 48). */
export const ICONS = {
  kopi: `<path d="M10 16h22v18a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8z" fill="#4A2A18" stroke="${INK}" stroke-width="2.5"/><path d="M32 20h4a5 5 0 0 1 0 10h-4" fill="none" stroke="${INK}" stroke-width="2.5"/><path d="M10 16q11 -6 22 0" fill="#7A4A2A" stroke="${INK}" stroke-width="2"/><path d="M16 10q-2 -4 0 -6M24 10q-2 -4 0 -6" stroke="#999" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  teh: `<path d="M8 22q0 -8 14 -8t14 8v10q0 8 -14 8t-14 -8z" fill="#C7742E" stroke="${INK}" stroke-width="2.5"/><path d="M36 24l7 -5" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M8 26q-6 0 -4 8" fill="none" stroke="${INK}" stroke-width="2.5"/><rect x="18" y="9" width="8" height="5" rx="2" fill="${INK}"/>`,
  milo: `<rect x="12" y="8" width="24" height="34" rx="4" fill="#2F7D3A" stroke="${INK}" stroke-width="2.5"/><rect x="12" y="8" width="24" height="6" fill="#E2A93B" stroke="${INK}" stroke-width="2"/><path d="M17 24h14M17 30h10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  condensed: `<rect x="12" y="10" width="24" height="30" rx="3" fill="#F4F2EE" stroke="${INK}" stroke-width="2.5"/><rect x="12" y="18" width="24" height="10" fill="#2D6FD1"/><ellipse cx="24" cy="10" rx="12" ry="3" fill="#C9CED1" stroke="${INK}" stroke-width="2"/><path d="M24 7v-4" stroke="#F3E7D2" stroke-width="4" stroke-linecap="round"/>`,
  evaporated: `<rect x="12" y="10" width="24" height="30" rx="3" fill="#F4F2EE" stroke="${INK}" stroke-width="2.5"/><rect x="12" y="18" width="24" height="10" fill="#D7263D"/><ellipse cx="24" cy="10" rx="12" ry="3" fill="#C9CED1" stroke="${INK}" stroke-width="2"/><text x="24" y="26" text-anchor="middle" font-size="8" font-weight="800" fill="#fff" font-family="sans-serif">C</text>`,
  sugar: `<path d="M6 34l20 -12" stroke="#9AA4A8" stroke-width="4" stroke-linecap="round"/><ellipse cx="32" cy="19" rx="10" ry="6" fill="#C9CED1" stroke="${INK}" stroke-width="2.5" transform="rotate(-30 32 19)"/><g fill="#fff" stroke="${INK}" stroke-width="1.5"><rect x="27" y="11" width="6" height="6" rx="1"/><rect x="33" y="13" width="6" height="6" rx="1"/></g>`,
  ice: `<g stroke="#4FA3BF" stroke-width="2.5" fill="#E6F6FB"><rect x="8" y="20" width="16" height="16" rx="3" transform="rotate(-12 16 28)"/><rect x="24" y="16" width="16" height="16" rx="3" transform="rotate(10 32 24)"/><rect x="16" y="6" width="14" height="14" rx="3"/></g>`,
  water: `<path d="M12 18h22l-2 22h-18z" fill="#C9CED1" stroke="${INK}" stroke-width="2.5"/><path d="M34 22l8 -6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><rect x="16" y="12" width="14" height="6" rx="2" fill="${INK}"/><path d="M38 10q-3 -4 0 -7" stroke="#9FD3E0" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  tarik: `<rect x="6" y="6" width="14" height="14" rx="3" fill="#F7F3EA" stroke="${INK}" stroke-width="2.5"/><rect x="28" y="28" width="14" height="14" rx="3" fill="#F7F3EA" stroke="${INK}" stroke-width="2.5"/><path d="M14 20q2 14 18 10" fill="none" stroke="#C7742E" stroke-width="4" stroke-linecap="round"/>`,
  bag: `<path d="M12 18q-4 12 0 24h24q4 -12 0 -24z" fill="#F4F2EE" fill-opacity=".8" stroke="${INK}" stroke-width="2.5"/><path d="M12 30q2 12 0 12h24q-2 0 0 -12z" fill="#7A4A2A"/><path d="M16 18q8 -14 16 0" fill="none" stroke="#E0457B" stroke-width="3"/>`,
  bin: `<path d="M12 14h24l-2 28h-20z" fill="#9AA4A8" stroke="${INK}" stroke-width="2.5"/><rect x="9" y="9" width="30" height="5" rx="2" fill="${INK}"/><path d="M20 20v16M28 20v16" stroke="${INK}" stroke-width="2"/>`,
  serve: `<path d="M8 34h32" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M14 32v-12h20v12" fill="#F7F3EA" stroke="${INK}" stroke-width="2.5"/><path d="M18 14l6 -8 6 8" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
};
export const icon = (k) => `<svg viewBox="0 0 48 48" aria-hidden="true">${ICONS[k]}</svg>`;
