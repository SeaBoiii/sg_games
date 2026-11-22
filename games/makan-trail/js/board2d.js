// Makan Trail — 2D (SVG) board. Same adapter API as board3d.js:
//   load(s) · sync(s) · rollDie(v) · play(events, s) · setMode(mode) · onSquare(i)
import * as E from './engine.js';
import { BOARD, CELL, centre, squareSVG, centreSVG, dieSVG, cardSVG, tingkatSVG, dishSVG, FONT, INK, esc } from './art.js';

const NS = 'http://www.w3.org/2000/svg';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const HUD = { x: 624, y: 12, w: 366 };

export class Board2D {
  constructor(stage) {
    this.stage = stage;
    stage.classList.add('stage-2d');
    this.wrap = document.createElement('div');
    this.wrap.className = 'board2d';
    stage.appendChild(this.wrap);
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('viewBox', '0 0 1000 620');
    this.svg.setAttribute('class', 'board-svg');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', 'Makan Trail board');
    this.wrap.appendChild(this.svg);
    this.onSquare = null;
    this.svg.addEventListener('pointerdown', (e) => {
      const sq = e.target.closest && e.target.closest('.sq.opt');
      if (sq && this.onSquare) { e.preventDefault(); this.onSquare(+sq.dataset.i); }
    });
    this.vis = [];
  }

  load(s) {
    const owner = {};
    s.players.forEach((p) => { owner[p.home] = p.color; });
    this.svg.innerHTML = `
      <rect x="${BOARD.x - 6}" y="${BOARD.y - 6}" width="${BOARD.size + 12}" height="${BOARD.size + 12}" rx="22" fill="#6B3E26" stroke="${INK}" stroke-width="4"/>
      <rect x="${BOARD.x}" y="${BOARD.y}" width="${BOARD.size}" height="${BOARD.size}" rx="16" fill="#F6EFE3"/>
      ${centreSVG()}
      <g class="squares">${E.SQUARES.map((_, i) => squareSVG(i, owner[i])).join('')}</g>
      <g transform="translate(${BOARD.x + BOARD.size / 2} ${BOARD.y + BOARD.size / 2 + 40})"><g class="die">${dieSVG(6)}</g></g>
      <g transform="translate(${BOARD.x + BOARD.size / 2} ${BOARD.y + BOARD.size / 2 + 20})"><g class="card-show" opacity="0"></g></g>
      <g class="hud"></g>
      <g class="tokens">${s.players.map((p, i) => `<g class="tok" data-p="${i}"><g class="tok-glow">${tingkatSVG('#FFFFFF', 1.32)}</g>${tingkatSVG(p.color, 1.18)}</g>`).join('')}</g>
      <g class="fx"></g>`;
    this.$die = this.svg.querySelector('.die');
    this.$card = this.svg.querySelector('.card-show');
    this.$hud = this.svg.querySelector('.hud');
    this.$toks = [...this.svg.querySelectorAll('.tok')];
    this.$fx = this.svg.querySelector('.fx');
    this.vis = s.players.map((p) => p.pos);
    this.hudKey = '';
    this.optKey = '';
    this._placeAll(s);
    this.sync(s);
  }

  /** Token offset so several tingkats can share a square. */
  _spot(p, sq, s) {
    const c = centre(sq);
    const here = this.vis.map((v, k) => (v === sq ? k : -1)).filter((k) => k >= 0);
    const n = here.length, k = Math.max(0, here.indexOf(p));
    const off = n <= 1 ? [[0, 0]] : n === 2 ? [[-12, 0], [12, 0]] : n === 3 ? [[-14, 6], [14, 6], [0, -10]] : [[-13, -8], [13, -8], [-13, 10], [13, 10]];
    const [dx, dy] = off[k] || [0, 0];
    void s;
    return { x: c.x + dx, y: c.y + dy + 22 };
  }
  _placeAll(s) {
    this.$toks.forEach((t, p) => { const q = this._spot(p, this.vis[p], s); t.setAttribute('transform', `translate(${q.x} ${q.y})`); });
  }

  sync(s) {
    if (!this.$hud) return;
    // the active token sits on top
    const tk = this.svg.querySelector('.tokens');
    const cur = this.$toks[s.turn];
    if (cur && tk.lastElementChild !== cur) tk.appendChild(cur);
    // options to stop at
    const optKey = s.phase === 'choose' && !E.current(s).cpu ? s.options.join(',') : '';
    if (optKey !== this.optKey) {
      this.optKey = optKey;
      this.svg.querySelectorAll('.sq').forEach((g) => {
        const on = optKey && s.options.includes(+g.dataset.i);
        g.classList.toggle('opt', !!on);
        const hl = g.querySelector('.sq-hl');
        hl.setAttribute('opacity', on ? '1' : '0');
        hl.setAttribute('stroke', on ? E.current(s).color : 'none');
      });
    }
    // where the current player can still find their dishes
    const p = E.current(s);
    const need = new Set(E.needs(p));
    this.svg.querySelectorAll('.sq-hawker').forEach((g) => {
      const q = E.SQUARES[+g.dataset.i];
      g.classList.toggle('wanted', s.phase !== 'over' && q.menu.some((d) => need.has(d)));
    });
    this._hud(s);
  }

  _hud(s) {
    const key = s.players.map((p) => `${p.money}|${p.got.join()}|${p.skip}|${p.treat}`).join('/') + `|${s.turn}|${s.phase}`;
    if (key === this.hudKey) return;
    this.hudKey = key;
    const n = s.players.length, gap = 10;
    const h = Math.min(146, (BOARD.size - gap * (n - 1)) / n);
    this.$hud.innerHTML = s.players.map((p, i) => {
      const y = HUD.y + i * (h + gap);
      const on = i === s.turn && s.phase !== 'over';
      const dw = Math.min(70, (HUD.w - 30) / 4);
      return `<g transform="translate(${HUD.x} ${y})" class="pcard ${on ? 'on' : ''}">
        <rect width="${HUD.w}" height="${h}" rx="16" fill="${on ? '#FFFCF5' : 'rgba(255,252,245,.72)'}" stroke="${on ? p.color : INK}" stroke-width="${on ? 5 : 2.5}"/>
        <g transform="translate(26 ${h * 0.46})">${tingkatSVG(p.color, 0.8)}</g>
        <text x="52" y="30" font-family="${FONT}" font-weight="800" font-size="22" fill="${INK}">${esc(p.name)}${p.cpu ? ' <tspan font-size="13" fill="#8C7B6E">CPU</tspan>' : ''}</text>
        <text x="${HUD.w - 16}" y="31" text-anchor="end" font-family="${FONT}" font-weight="800" font-size="24" fill="#2F6B4F">$${p.money}</text>
        ${p.skip ? `<text x="52" y="50" font-family="${FONT}" font-weight="800" font-size="12" fill="#2D6FD1">misses next turn</text>` : p.treat ? `<text x="52" y="50" font-family="${FONT}" font-weight="800" font-size="12" fill="#E8590C">next dish free!</text>` : ''}
        ${p.list.map((d, k) => {
          const got = p.got.includes(d);
          const cx = 52 + k * dw + dw / 2 - 18, cy = h - 34;
          return `<g transform="translate(${cx} ${cy})" opacity="${got ? 1 : 0.38}">${dishSVG(d, 0.82)}${got ? `<circle cx="16" cy="-14" r="9" fill="#2F9E5B" stroke="${INK}" stroke-width="2"/><path d="M12 -14 l3 3 l5 -6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>` : ''}</g>`;
        }).join('')}
      </g>`;
    }).join('');
  }

  async rollDie(v) {
    const g = this.$die;
    g.classList.remove('tumble'); void g.getBBox(); g.classList.add('tumble');
    for (let k = 0; k < 7; k++) { g.innerHTML = dieSVG(1 + Math.floor(Math.random() * 6)); await wait(55); }
    g.innerHTML = dieSVG(v);
    await wait(180);
  }

  _float(x, y, text, cls = 'good') {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', `floater ${cls}`);
    t.textContent = text;
    this.$fx.appendChild(t);
    setTimeout(() => t.remove(), 1200);
  }

  async _hop(p, to, s, stepMs = 150, onStep) {
    while (this.vis[p] !== to) {
      const from = this.vis[p];
      this.vis[p] = (from + 1) % E.N;
      const a = this._spot(p, from, s), b = this._spot(p, this.vis[p], s);
      const t = this.$toks[p];
      const t0 = performance.now();
      await new Promise((res) => {
        const f = (now) => {
          const k = Math.min(1, (now - t0) / stepMs);
          const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 18;
          t.setAttribute('transform', `translate(${x} ${y})`);
          if (k < 1) requestAnimationFrame(f); else res();
        };
        requestAnimationFrame(f);
      });
      if (onStep) onStep(this.vis[p]);
    }
    this._placeAll(s);
  }

  async _slide(p, to, s, ms = 650) {
    const a = this._spot(p, this.vis[p], s);
    this.vis[p] = to;
    const b = this._spot(p, to, s);
    const t = this.$toks[p];
    const t0 = performance.now();
    await new Promise((res) => {
      const f = (now) => {
        const k = Math.min(1, (now - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        t.setAttribute('transform', `translate(${a.x + (b.x - a.x) * e} ${a.y + (b.y - a.y) * e})`);
        if (k < 1) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
    this._placeAll(s);
  }

  /** Play one turn's events in order. sound(ev) is called as each lands. */
  async play(events, s, sound = () => {}) {
    for (const ev of events) {
      const p = ev.p;
      if (ev.type === 'move') await this._hop(p, ev.to, s, 150, () => sound({ type: 'step' }));
      else if (ev.type === 'hop') {
        if (ev.by > 0) await this._hop(p, ev.to, s, 150, () => sound({ type: 'step' }));
        else await this._slide(p, ev.to, s, 400);
      } else if (ev.type === 'mrt') { sound(ev); await this._slide(p, ev.to, s, 800); }
      else {
        sound(ev);
        const c = centre(ev.at ?? this.vis[p]);
        if (ev.type === 'payday') this._float(c.x, c.y - 30, `+$${ev.amount}`, 'good');
        else if (ev.type === 'angbao') this._float(c.x, c.y - 30, `+$${ev.amount}`, 'good');
        else if (ev.type === 'erp') this._float(c.x, c.y - 30, ev.amount ? `−$${ev.amount}` : 'No cash!', 'bad');
        else if (ev.type === 'rain') this._float(c.x, c.y - 30, 'Kena rain!', 'bad');
        else if (ev.type === 'broke') this._float(c.x, c.y - 30, 'Not enough $', 'bad');
        else if (ev.type === 'buy') await this._buy(ev, s);
        else if (ev.type === 'card') await this._card(ev.text);
        else if (ev.type === 'win') this._float(c.x, c.y - 40, 'HOME!', 'good');
        if (ev.type !== 'buy' && ev.type !== 'card') await wait(ev.type === 'nothing' || ev.type === 'visit' ? 0 : 420);
      }
      this._hud(s);
    }
  }

  async _buy(ev, s) {
    const c = centre(ev.at);
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = dishSVG(ev.dish, 1.2);
    this.$fx.appendChild(g);
    const n = s.players.length, gap = 10, h = Math.min(146, (BOARD.size - gap * (n - 1)) / n);
    const tgt = { x: HUD.x + 40 + s.players[ev.p].list.indexOf(ev.dish) * Math.min(70, (HUD.w - 30) / 4) + 30, y: HUD.y + ev.p * (h + gap) + h - 34 };
    this._float(c.x, c.y - 34, ev.free ? 'Free!' : `−$${ev.price}`, ev.free ? 'good' : 'plain');
    const t0 = performance.now();
    await new Promise((res) => {
      const f = (now) => {
        const k = Math.min(1, (now - t0) / 650), e = 1 - Math.pow(1 - k, 3);
        g.setAttribute('transform', `translate(${c.x + (tgt.x - c.x) * e} ${c.y + (tgt.y - c.y) * e - Math.sin(k * Math.PI) * 60}) scale(${1.2 - k * 0.4})`);
        if (k < 1) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
    g.remove();
  }

  async _card(text) {
    this.$card.innerHTML = cardSVG(text);
    this.$card.setAttribute('opacity', '1');
    this.$card.classList.remove('flipin'); void this.$card.getBBox(); this.$card.classList.add('flipin');
    await wait(1700);
    this.$card.setAttribute('opacity', '0');
  }

  setMode(mode) { this.stage.dataset.mode = mode; }
}
