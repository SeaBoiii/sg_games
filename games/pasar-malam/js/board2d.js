// Pasar Malam Haggle — 2D night-market scene (SVG). Same adapter API as Board3D.
import * as E from './engine.js';
import { sellerSVG, PEOPLE_DEFS, goodsSVG, CANOPY } from './art.js';
import { wait } from '../../../assets/lib/fx.js';

const W = 1000, H = 620;
const INK = '#2A1A12';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => `$${n.toFixed(2)}`;

function wrap(text, max = 26) {
  const words = String(text).split(' ');
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
    this._build();
  }

  _build() {
    // string lights across the top
    let bulbs = '';
    const cols = ['#FFD877', '#FF9FBF', '#9FD3FF', '#B6F2A0'];
    for (let i = 0; i < 26; i++) {
      const x = 20 + i * 38, y = 34 + Math.sin(i * 0.48) * 14;
      bulbs += `<g class="bulb" style="--d:${(i % 5) * 0.4}s" transform="translate(${x} ${y + 8})"><circle r="12" fill="${cols[i % 4]}" opacity=".25"/><ellipse rx="5" ry="7" fill="${cols[i % 4]}"/></g>`;
    }
    const wire = Array.from({ length: 26 }, (_, i) => `${20 + i * 38} ${34 + Math.sin(i * 0.48) * 14}`).join(' L');
    let stars = '';
    for (let i = 0; i < 40; i++) stars += `<circle cx="${(i * 97) % W}" cy="${(i * 53) % 120}" r="${(i % 3) * 0.6 + 0.8}" fill="#fff" opacity="${0.3 + (i % 4) * 0.15}"/>`;
    // neighbouring stalls, dimmed
    const side = (x, col, flip) => `<g transform="translate(${x} 0) scale(${flip ? -1 : 1} 1)" opacity=".55">
      <path d="M0 120 h170 v40 q-10 14 -21 0 q-11 14 -21 0 q-11 14 -21 0 q-11 14 -21 0 q-11 14 -21 0 q-11 14 -21 0 q-11 14 -21 0 q-11 14 -21 0z" fill="${col}" stroke="${INK}" stroke-width="3"/>
      <rect x="8" y="160" width="8" height="300" fill="#5B4636"/><rect x="150" y="160" width="8" height="300" fill="#5B4636"/>
      <rect x="0" y="360" width="170" height="100" fill="#3A2C36" stroke="${INK}" stroke-width="3"/></g>`;
    this.root.innerHTML = `
      <svg class="board-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="Night market stall">
        <defs>${PEOPLE_DEFS}
          <linearGradient id="pm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B1F4A"/><stop offset=".7" stop-color="#3A2A5E"/><stop offset="1" stop-color="#5C3A62"/></linearGradient>
          <linearGradient id="pm-glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD877" stop-opacity=".35"/><stop offset="1" stop-color="#FFD877" stop-opacity="0"/></linearGradient>
          <pattern id="pm-stripe" width="56" height="10" patternUnits="userSpaceOnUse"><rect width="56" height="10" fill="var(--canopy)"/><rect width="28" height="10" fill="#FFF8E8"/></pattern>
          <pattern id="pm-cloth" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="var(--canopy)"/><rect width="15" height="15" fill="#FFF8E8" opacity=".35"/><rect x="15" y="15" width="15" height="15" fill="#FFF8E8" opacity=".35"/></pattern>
        </defs>
        <rect width="${W}" height="${H}" fill="url(#pm-sky)"/>
        ${stars}
        <rect y="420" width="${W}" height="200" fill="#2B2230"/>
        ${side(-60, '#1F8A8A', false)}${side(1060, '#E0457B', true)}
        <path d="M${wire}" fill="none" stroke="#1A1512" stroke-width="2.5"/>
        ${bulbs}
        <g class="stall">
          <rect x="190" y="150" width="620" height="300" fill="url(#pm-glow)"/>
          <rect x="196" y="150" width="12" height="300" fill="#5B4636" stroke="${INK}" stroke-width="2"/>
          <rect x="792" y="150" width="12" height="300" fill="#5B4636" stroke="${INK}" stroke-width="2"/>
          <path class="canopy" d="M170 70 h660 v84 ${Array.from({ length: 12 }, () => 'q-27.5 22 -55 0').join(' ')}z" fill="url(#pm-stripe)" stroke="${INK}" stroke-width="4" transform="rotate(0)"/>
          <g class="sign" transform="translate(500 106)"><rect x="-150" y="-26" width="300" height="46" rx="10" fill="#1A1512" stroke="#FFD877" stroke-width="3"/><text y="7" text-anchor="middle" class="sign-text"></text></g>
          <g class="seller" transform="translate(640 300) scale(.72)"></g>
          <g class="patience" transform="translate(640 206)"></g>
          <rect x="180" y="420" width="640" height="200" fill="url(#pm-cloth)" stroke="${INK}" stroke-width="4"/>
          <rect x="180" y="410" width="640" height="18" rx="4" fill="#8E6A3A" stroke="${INK}" stroke-width="3"/>
          <g class="goods" transform="translate(370 372) scale(1.15)"></g>
          <g class="pricetag" transform="translate(640 500)">
            <rect x="-112" y="-56" width="224" height="104" rx="10" fill="#22302A" stroke="#C79A5B" stroke-width="7"/>
            <text class="tag-item" y="-26" text-anchor="middle"></text>
            <text class="tag-ask" y="0" text-anchor="middle"></text>
            <text class="tag-cur" y="36" text-anchor="middle"></text>
          </g>
        </g>
        <g class="crowd" opacity=".55">${[60, 140, 880, 950].map((x, i) => `<g transform="translate(${x} ${560 + (i % 2) * 20})"><circle cy="-70" r="26" fill="#1A1420"/><rect x="-36" y="-44" width="72" height="110" rx="30" fill="#1A1420"/></g>`).join('')}</g>
        <g class="bubble"></g>
        <g class="floaters"></g>
      </svg>`;
    this.svg = this.root.querySelector('svg');
    const q = (c) => this.svg.querySelector(c);
    this.gSeller = q('.seller'); this.gGoods = q('.goods'); this.gBubble = q('.bubble');
    this.gPat = q('.patience'); this.gFloat = q('.floaters'); this.gStall = q('.stall');
    this.tSign = q('.sign-text'); this.tItem = q('.tag-item'); this.tAsk = q('.tag-ask'); this.tCur = q('.tag-cur');
  }

  setMode() {}

  load(s) { this.key = null; this.sync(s); }

  sync(s) {
    if (!s || s.phase === 'over') return;
    const st = E.stallOf(s);
    const S = E.SELLERS[st.seller];
    const key = `${s.stallIdx}:${s.turn}`;
    if (this.key !== key) {
      this.key = key;
      this.svg.style.setProperty('--canopy', CANOPY[st.seller]);
      this.tSign.textContent = `${S.name.toUpperCase()}'S STALL`;
      this.gGoods.innerHTML = goodsSVG(st.item);
      this.tItem.textContent = E.ITEMS[st.item].name.toUpperCase();
      this.mood = null;
    }
    const h = s.h;
    const mood = h ? h.mood : 'happy';
    if (this.mood !== mood) { this.mood = mood; this.gSeller.innerHTML = sellerSVG(S.who, mood); }
    // chalkboard price
    this.tAsk.textContent = h && h.cur < st.ask ? money(st.ask) : '';
    this.tAsk.classList.toggle('struck', !!(h && h.cur < st.ask));
    this.tCur.textContent = money(h ? h.cur : st.ask);
    this.tCur.classList.toggle('last', !!(h && h.last != null));
    // patience pips
    const max = h ? h.max : S.patience, pat = h ? Math.max(0, h.patience) : S.patience;
    this.gPat.innerHTML = h ? Array.from({ length: max }, (_, i) => `<circle cx="${(i - (max - 1) / 2) * 26}" cy="0" r="9" fill="${i < pat ? (pat / max > 0.5 ? '#3F8F5B' : '#F2B134') : 'rgba(255,255,255,.15)'}" stroke="#FFF8E8" stroke-width="2"/>`).join('') : '';
    // speech bubble
    const line = h ? h.line : S.lines.hello;
    const lines = wrap(line);
    const bw = 360, bh = 28 + lines.length * 30;
    this.gBubble.innerHTML = `<g transform="translate(800 ${186 - bh})">
      <rect x="-${bw / 2}" y="0" width="${bw}" height="${bh}" rx="16" fill="#FFFCF5" stroke="${INK}" stroke-width="4"/>
      <path d="M-120 ${bh - 2} l-36 30 54 -30z" fill="#FFFCF5" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <rect x="-128" y="${bh - 8}" width="30" height="10" fill="#FFFCF5"/>
      ${lines.map((ln, k) => `<text y="${36 + k * 30}" text-anchor="middle" class="bubble-text">${esc(ln)}</text>`).join('')}
    </g>`;
  }

  _float(text, cls) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', '370'); t.setAttribute('y', '300');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', `floater ${cls}`);
    t.textContent = text;
    this.gFloat.appendChild(t);
    setTimeout(() => t.remove(), 1500);
  }

  async react(res, s) {
    this.sync(s);
    const cls = { deal: 'hop', insult: 'shake', angry: 'shake', counter: 'nod', last: 'nod', callback: 'hop' }[res.result];
    if (cls) { this.gSeller.classList.remove('hop', 'shake', 'nod'); void this.gSeller.getBBox(); this.gSeller.classList.add(cls); }
    if (res.result === 'deal') this._float(res.saved > 0 ? `Saved ${money(res.saved)}!` : 'Deal!', 'good');
    if (res.result === 'angry') this._float('No deal…', 'bad');
    await wait(res.result === 'deal' || res.result === 'angry' ? 700 : 250);
  }

  async walk(s) {
    this.gStall.classList.add('walk-out');
    await wait(380);
    this.load(s);
    this.gStall.classList.remove('walk-out');
    this.gStall.classList.add('walk-in');
    await wait(420);
    this.gStall.classList.remove('walk-in');
  }
}
