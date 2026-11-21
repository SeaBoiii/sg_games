import { GAMES } from './games.js';


/* ---------- Heartland skyline (HDB blocks) ---------- */
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function drawSkyline(svg) {
  const r = rng(65);
  const W = 1200, H = 360;
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

const ART = {
  dial: () => `
    <svg viewBox="0 0 400 240" aria-hidden="true">
      <rect x="18" y="20" width="364" height="210" rx="26" fill="#2A1A12"/>
      <path d="M40 200a160 160 0 0 1 320 0z" fill="#FBF6EC"/>
      <path d="${arc(200, 200, 160, 98, 128)}" fill="#1F8A8A"/>
      <path d="${arc(200, 200, 160, 104, 122)}" fill="#F2B134"/>
      <path d="${arc(200, 200, 160, 110, 116)}" fill="#D7263D"/>
      <g class="needle" style="transform-origin:200px 200px">
        <path d="M200 52 L207 200 L193 200Z" fill="#D7263D" stroke="#2A1A12" stroke-width="3" stroke-linejoin="round"/>
      </g>
      <circle cx="200" cy="200" r="18" fill="#F2B134" stroke="#2A1A12" stroke-width="4"/>
      <text x="58" y="222" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="17" fill="#FBF6EC">← SHIOK</text>
      <text x="342" y="222" text-anchor="end" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="17" fill="#FBF6EC">SIAN →</text>
    </svg>`,
  chope: () => {
    const tbl = (x, y, own) => `<circle cx="${x}" cy="${y}" r="34" fill="${own || '#FBF6EC'}" stroke="#2A1A12" stroke-width="4"/>`;
    const st = (x, y) => `<circle cx="${x}" cy="${y}" r="13" fill="#F0E6D6" stroke="#2A1A12" stroke-width="3"/>`;
    const pk = (x, y, c, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-14" y="-9" width="28" height="18" rx="4" fill="${c}" stroke="#2A1A12" stroke-width="2.5"/><rect x="-4" y="-8" width="8" height="16" fill="#fff" opacity=".8"/></g>`;
    const P = '#E0457B', B = '#2D6FD1';
    return `<svg viewBox="0 0 400 240" aria-hidden="true">
      ${tbl(130, 80, P)}${tbl(270, 80)}${tbl(130, 180)}${tbl(270, 180, B)}
      ${[[130, 30], [270, 30], [80, 80], [200, 80], [320, 80], [130, 130], [270, 130], [80, 180], [200, 180], [320, 180], [130, 230], [270, 230]].map(([x, y]) => st(x, y)).join('')}
      ${pk(130, 30, P, -10)}${pk(80, 80, P, 12)}${pk(200, 80, P, -6)}${pk(130, 130, B, 8)}${pk(270, 130, B, -12)}${pk(320, 180, B, 6)}${pk(200, 180, B, -8)}${pk(270, 230, P, 10)}${pk(320, 80, B, -4)}
      <text x="130" y="88" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="15" fill="#fff">CHOPED</text>
      <text x="270" y="188" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="15" fill="#fff">CHOPED</text>
    </svg>`;
  },
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
    card.innerHTML = `
      <div class="card-art">${ART[g.art] ? ART[g.art]() : ''}</div>
      <div class="card-body">
        <p class="card-kicker">${g.tagline}</p>
        <h3>${g.title}</h3>
        <p class="blurb">${g.blurb}</p>
        <ul class="tags">${g.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
        ${actions ? `<div class="card-actions">${actions}</div>` : ''}
      </div>`;
    grid.appendChild(card);
  }
}

drawSkyline(document.getElementById('skyline'));
renderGames(document.getElementById('game-grid'));
