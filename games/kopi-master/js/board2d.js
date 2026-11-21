// Kopi Master — 2D stall scene (SVG). Same adapter API as Board3D.
// You stand behind the counter: customers line up across it with their orders in speech bubbles.
import { PATTERN_DEFS, customerSVG, cupSVG } from './art.js';
import { wait } from '../../../assets/lib/fx.js';

const W = 1000, H = 620;
const SLOT_X = [200, 500, 800];
const NECK_Y = 268;
const INK = '#2A1A12';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function wrap(text, max = 16) {
  const words = text.split(' ');
  const lines = [''];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if ((cur + ' ' + w).trim().length > max && cur) lines.push(w); else lines[lines.length - 1] = (cur + ' ' + w).trim();
  }
  return lines.slice(0, 3);
}

export class Board2D {
  constructor(stage) {
    stage.classList.add('stage-2d');
    stage.innerHTML = '<div class="board2d"></div>';
    this.root = stage.querySelector('.board2d');
    this.onSelect = null;
    this.els = new Map();
    this._build();
    this.root.addEventListener('click', (e) => {
      const g = e.target.closest('[data-cid]');
      if (g && this.onSelect) this.onSelect(+g.dataset.cid);
    });
  }

  _build() {
    let fans = '', tables = '', tiles = '';
    for (const x of [180, 500, 820]) fans += `<g transform="translate(${x} 30)"><rect x="-3" y="-30" width="6" height="22" fill="#C9CED1"/><g class="fan-blades">${[0, 120, 240].map((a) => `<ellipse rx="70" ry="9" transform="rotate(${a})" fill="#F4F1EA" stroke="${INK}" stroke-width="2"/>`).join('')}</g><circle r="10" fill="#E8E2D6" stroke="${INK}" stroke-width="2"/></g>`;
    for (const [x, y, s] of [[110, 330, 0.7], [380, 320, 0.6], [640, 325, 0.65], [900, 335, 0.72]]) {
      tables += `<g transform="translate(${x} ${y}) scale(${s})" opacity=".55">
        <ellipse cx="0" cy="0" rx="90" ry="22" fill="#F1EDE6" stroke="${INK}" stroke-width="3"/><rect x="-6" y="0" width="12" height="80" fill="#9AA4A8"/>
        <circle cx="-120" cy="-30" r="22" fill="#B8A898"/><rect x="-140" y="-8" width="40" height="70" rx="16" fill="#B8A898"/>
        <circle cx="120" cy="-36" r="22" fill="#A99A8A"/><rect x="100" y="-14" width="40" height="76" rx="16" fill="#A99A8A"/></g>`;
    }
    for (let x = 0; x < W; x += 40) tiles += `<rect x="${x}" y="200" width="40" height="40" fill="${(x / 40) % 2 ? '#2F6B4F' : '#E8EFE6'}"/>`;
    this.root.innerHTML = `
      <svg class="board-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="Kopitiam counter">
        <defs>${PATTERN_DEFS}
          <linearGradient id="km-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6E4"/><stop offset="1" stop-color="#F3E2C4"/></linearGradient>
          <linearGradient id="km-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDE2E4"/><stop offset="1" stop-color="#B9C0C4"/></linearGradient>
        </defs>
        <rect width="${W}" height="420" fill="url(#km-wall)"/>
        <g opacity=".5">${tiles}</g>
        <rect y="240" width="${W}" height="180" fill="#E9DCC5"/>
        ${fans}
        ${tables}
        <g class="customers"></g>
        <rect y="416" width="${W}" height="${H - 416}" fill="url(#km-top)"/>
        <rect y="410" width="${W}" height="14" fill="#9AA4A8" stroke="${INK}" stroke-width="3"/>
        <rect y="${H - 60}" width="${W}" height="60" fill="#6B3E26"/>
        <g class="tray" transform="translate(500 ${H - 40})"><ellipse rx="190" ry="26" fill="#2A1A12" opacity=".12"/></g>
        <g class="cup-slot" transform="translate(500 ${H - 46}) scale(.9)"></g>
        <g class="floaters"></g>
        <g class="bubbles"></g>
      </svg>`;
    this.svg = this.root.querySelector('svg');
    this.gCust = this.svg.querySelector('.customers');
    this.gBub = this.svg.querySelector('.bubbles');
    this.gCup = this.svg.querySelector('.cup-slot');
    this.gFloat = this.svg.querySelector('.floaters');
  }

  load(s) { this.els.forEach((e) => { e.body.remove(); e.bub.remove(); }); this.els.clear(); this.sync(s); }

  _mood(c) { const f = c.patience / c.max; return f > 0.55 ? 'happy' : f > 0.25 ? 'ok' : 'cross'; }

  sync(s) {
    this.s = s;
    const ids = new Set(s.counter.map((c) => c.id));
    for (const [id, e] of this.els) if (!ids.has(id) && !e.leaving) { e.body.remove(); e.bub.remove(); this.els.delete(id); }
    s.counter.forEach((c, i) => {
      let e = this.els.get(c.id);
      const x = SLOT_X[i] ?? SLOT_X[SLOT_X.length - 1];
      if (!e) {
        const body = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        body.setAttribute('class', 'cust entering');
        body.dataset.cid = c.id;
        body.style.transform = `translate(${x}px, ${NECK_Y}px)`;
        const bub = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        bub.setAttribute('class', 'bubble entering');
        bub.dataset.cid = c.id;
        bub.style.transform = `translate(${x}px, 0px)`;
        const lines = wrap(c.order.text);
        const bh = 40 + lines.length * 32;
        bub.innerHTML = `
          <rect class="bub-bg" x="-138" y="${150 - bh - 24}" width="276" height="${bh}" rx="18" fill="#FFFCF5" stroke="${INK}" stroke-width="4"/>
          <path d="M-14 ${150 - 26}l14 22 14 -22z" fill="#FFFCF5" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
          <rect x="-12" y="${150 - 30}" width="24" height="8" fill="#FFFCF5"/>
          ${lines.map((ln, k) => `<text x="0" y="${150 - bh - 24 + 40 + k * 32}" text-anchor="middle" class="order-text">${esc(ln)}</text>`).join('')}
          <rect x="-110" y="${150 - 46}" width="220" height="10" rx="5" fill="#E9E2D4"/>
          <rect class="pat" x="-110" y="${150 - 46}" width="220" height="10" rx="5" fill="#3F8F5B"/>
          <g class="sel-tag" transform="translate(0 ${150 - bh - 30})"><rect x="-54" y="-16" width="108" height="26" rx="13" fill="#1F8A8A" stroke="${INK}" stroke-width="3"/><text y="3" text-anchor="middle" class="sel-text">SERVING</text></g>
          <text class="price" x="118" y="${150 - bh - 4}" text-anchor="end">$${c.order.price.toFixed(2)}</text>`;
        this.gCust.appendChild(body);
        this.gBub.appendChild(bub);
        e = { body, bub, mood: null, x };
        this.els.set(c.id, e);
        requestAnimationFrame(() => requestAnimationFrame(() => { body.classList.remove('entering'); bub.classList.remove('entering'); }));
      }
      if (e.x !== x) {
        e.x = x;
        e.body.style.transform = `translate(${x}px, ${NECK_Y}px)`;
        e.bub.style.transform = `translate(${x}px, 0px)`;
      }
      const mood = this._mood(c);
      if (e.mood !== mood) { e.mood = mood; e.body.innerHTML = customerSVG(c.who, mood); }
      e.bub.classList.toggle('selected', s.selected === c.id);
      e.body.classList.toggle('selected', s.selected === c.id);
    });
    this.updatePatience(s);
    this.setCup(s.cup);
  }

  updatePatience(s) {
    for (const c of s.counter) {
      const e = this.els.get(c.id);
      if (!e) continue;
      const f = Math.max(0, c.patience / c.max);
      const bar = e.bub.querySelector('.pat');
      bar.setAttribute('width', String(220 * f));
      bar.setAttribute('fill', f > 0.55 ? '#3F8F5B' : f > 0.25 ? '#F2B134' : '#D7263D');
      const mood = this._mood(c);
      if (e.mood !== mood) { e.mood = mood; e.body.innerHTML = customerSVG(c.who, mood); }
      e.bub.classList.toggle('hurry', f < 0.25);
    }
  }

  setCup(cup) { this.gCup.innerHTML = cupSVG(cup); }

  pour() {
    this.gCup.classList.remove('pour');
    void this.gCup.getBBox();
    this.gCup.classList.add('pour');
  }

  _float(x, y, text, cls) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', `floater ${cls}`);
    t.textContent = text;
    this.gFloat.appendChild(t);
    setTimeout(() => t.remove(), 1400);
  }

  async animateServe(res, s) {
    const e = this.els.get(res.customer.id);
    if (!e) { this.sync(s); return; }
    e.leaving = true;
    e.body.innerHTML = customerSVG(res.customer.who, res.good ? 'happy' : 'cross');
    this._float(e.x, 180, res.good ? `+$${(res.price + res.tip).toFixed(2)}` : 'Aiyo!', res.good ? 'good' : 'bad');
    e.body.classList.add(res.good ? 'served' : 'angry');
    e.bub.classList.add('leaving');
    this.setCup(s.cup);
    await wait(650);
    e.body.classList.add('leaving');
    await wait(400);
    e.body.remove(); e.bub.remove();
    this.els.delete(res.customer.id);
    this.sync(s);
  }

  async animateLeave(c, s) {
    const e = this.els.get(c.id);
    if (!e) return;
    e.leaving = true;
    e.body.innerHTML = customerSVG(c.who, 'cross');
    this._float(e.x, 180, 'Too slow lah!', 'bad');
    e.body.classList.add('leaving', 'angry');
    e.bub.classList.add('leaving');
    await wait(600);
    e.body.remove(); e.bub.remove();
    this.els.delete(c.id);
    this.sync(s);
  }

  setMode() {}
}
