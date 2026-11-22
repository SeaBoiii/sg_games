// Big Two — 2D (SVG) table. Same adapter API as board3d.js:
//   load(s) · sync(s) · deal(s) · play(events, s, sound) · say(p, text) · setMode(mode)
import * as E from './engine.js';
import { VIEW, SEAT, PILE, CW, CH, INK, FONT, GOLD, cardFace, cardBack, customerSVG, PATTERN_DEFS, SCENE_DEFS, roomSVG, tableSVG, orangeSVG, esc } from './art.js';

const NS = 'http://www.w3.org/2000/svg';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PILE_SCALE = 0.95;
const STEP = 52;
const BACK = 0.36;

const T = (x, y, r = 0, s = 1) => `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`;

export class Board2D {
  constructor(el) {
    this.el = el;
    el.classList.add('stage-2d');
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${VIEW.w} ${VIEW.h}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('class', 'board-svg');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', 'Big Two table');
    el.appendChild(this.svg);
    this.pileKey = '';
  }

  load(s) {
    this.svg.innerHTML = `
      <defs>${PATTERN_DEFS}${SCENE_DEFS}</defs>
      ${roomSVG()}
      <g class="people">${[1, 2, 3].map((p) => `
        <g class="person" data-p="${p}" transform="translate(${SEAT[p].x} ${SEAT[p].y}) scale(${SEAT[p].scale})">
          <circle class="glow" cx="0" cy="-60" r="76" fill="none" stroke="${s.players[p].color}" stroke-width="12" opacity="0"/>
          <g class="bob">${customerSVG(s.players[p].char, 'ok')}</g>
        </g>`).join('')}</g>
      ${tableSVG()}
      <g class="fans"></g>
      <g class="pile"></g>
      <g class="tags"></g>
      <g class="fx"></g>`;
    this.$people = [...this.svg.querySelectorAll('.person')];
    this.$fans = this.svg.querySelector('.fans');
    this.$pile = this.svg.querySelector('.pile');
    this.$tags = this.svg.querySelector('.tags');
    this.$fx = this.svg.querySelector('.fx');
    this.counts = s.players.map((p) => p.hand.length);
    this.pileKey = '';
    this.tagKey = '';
    this.sync(s);
  }

  setMode(mode) { this.el.dataset.mode = mode; }

  // ---------------- static bits ----------------
  _fan(p, n, faces = null) {
    if (p === 0 || !n) return '';
    if (faces) {
      // deal over: lay what was left face up
      const [fx, fy] = SEAT[p].fan;
      const k = faces.length, step = Math.min(34, 230 / Math.max(1, k));
      return `<g class="fan open" data-p="${p}">${faces.map((id, i) => `<g transform="translate(${fx + (i - (k - 1) / 2) * step - CW * 0.24} ${fy - CH * 0.48 - 6}) scale(.48)">${cardFace(id)}</g>`).join('')}</g>`;
    }
    const [fx, fy] = SEAT[p].fan;
    const base = p === 1 ? -90 : p === 3 ? 90 : 0; // cards point away from their owner
    const spread = Math.min(7, 70 / Math.max(1, n - 1));
    let out = '';
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * spread;
      out += `<g transform="translate(${fx} ${fy}) rotate(${a}) translate(${-CW * BACK / 2} ${-CH * BACK - 6}) scale(${BACK})">${cardBack()}</g>`;
    }
    return `<g class="fan" data-p="${p}">${out}</g>`;
  }

  _tag(s, p) {
    const pl = s.players[p];
    const [x, y] = SEAT[p].tag;
    const on = s.phase === 'play' && s.turn === p;
    const name = esc(pl.name);
    const w = Math.max(176, 96 + name.length * 13.5);
    const n = pl.hand.length;
    const said = s.said[p];
    const flag = n === 1 && s.phase === 'play' ? `<g transform="translate(${w / 2 - 6} -24)"><rect x="-6" y="-14" width="96" height="26" rx="13" fill="${GOLD}" stroke="${INK}" stroke-width="2.5"/><text x="42" y="5" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="15" fill="${INK}">LAST CARD</text></g>` : '';
    const passed = said === 'pass' && s.phase === 'play' ? `<g transform="translate(${-w / 2 - 10} -22) rotate(-8)"><rect x="-38" y="-14" width="76" height="26" rx="6" fill="#fff" stroke="${INK}" stroke-width="2.5"/><text y="5" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="15" fill="${INK}">PASS</text></g>` : '';
    return `<g class="tag${on ? ' on' : ''}" transform="translate(${x} ${y})">
      <rect x="${-w / 2}" y="-23" width="${w}" height="46" rx="23" fill="${on ? pl.color : '#FFFCF5'}" stroke="${INK}" stroke-width="3"/>
      <text x="${-w / 2 + 18}" y="8" font-family="${FONT}" font-weight="800" font-size="23" fill="${on ? '#fff' : INK}">${name}</text>
      <g transform="translate(${w / 2 - 66} 0)">${orangeSVG(0, 1, 12)}<text x="17" y="8" font-family="${FONT}" font-weight="800" font-size="22" fill="${on ? '#fff' : INK}">${pl.oranges}</text></g>
      ${p !== 0 && s.phase !== 'idle' ? `<g transform="translate(${-w / 2 - 4} 18)"><circle r="17" fill="${INK}"/><text y="7" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="19" fill="#fff">${n}</text></g>` : ''}
      ${passed}${flag}
    </g>`;
  }

  _comboEl(combo, slot) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'combo');
    const n = combo.cards.length;
    g.innerHTML = combo.cards.map((id, i) => `<g class="pc" transform="translate(${(i - (n - 1) / 2) * STEP - CW / 2} ${-CH / 2})">${cardFace(id)}</g>`).join('');
    g.style.transform = this._slotT(slot, combo);
    return g;
  }
  _slotT(slot, combo) {
    // slot 0 = newest (centre); older plays sit up and behind
    const jitter = ((combo.cards[0] * 37) % 9) - 4;
    if (slot === 0) return T(PILE.x, PILE.y, jitter * 0.6, PILE_SCALE);
    return T(PILE.x - 40 * slot + jitter * 4, PILE.y - 34 * slot, jitter * 2 - 6 * slot, PILE_SCALE * (1 - 0.08 * slot));
  }

  _renderPile(s) {
    const key = s.trick.map((t) => t.combo.cards.join('.')).join('|');
    if (key === this.pileKey) return;
    this.pileKey = key;
    this.$pile.innerHTML = '';
    const last = s.trick.slice(-3);
    last.forEach((t, i) => {
      const el = this._comboEl(t.combo, last.length - 1 - i);
      if (i < last.length - 1) el.classList.add('old');
      this.$pile.appendChild(el);
    });
  }

  sync(s) {
    const tkey = s.players.map((p, i) => `${p.name}|${p.oranges}|${p.hand.length}|${s.said[i]}`).join('/') + `|${s.turn}|${s.phase}`;
    if (tkey !== this.tagKey) {
      this.tagKey = tkey;
      this.$tags.innerHTML = s.players.map((_, p) => this._tag(s, p)).join('');
      const open = s.phase === 'dealover' || s.phase === 'over';
      this.$fans.innerHTML = s.players.map((p, i) => this._fan(i, p.hand.length, open ? E.sortHand(p.hand) : null)).join('');
      this.$people.forEach((el) => {
        const p = +el.dataset.p;
        el.querySelector('.glow').setAttribute('opacity', s.phase === 'play' && s.turn === p ? '1' : '0');
        el.classList.toggle('thinking', s.phase === 'play' && s.turn === p && s.players[p].cpu);
      });
    }
    this._renderPile(s);
  }

  // ---------------- animation ----------------
  async _fly(el, from, to, ms) {
    el.style.transition = 'none';
    el.style.transform = from;
    el.getBoundingClientRect();
    el.style.transition = `transform ${ms}ms cubic-bezier(.2,.8,.25,1), opacity ${ms}ms`;
    el.style.transform = to;
    await wait(ms);
  }

  _origin(p) {
    if (p === 0) return [PILE.x, VIEW.h + 80, 0];
    const [x, y] = SEAT[p].fan;
    return [x, y, p === 1 ? -90 : p === 3 ? 90 : 0];
  }

  async deal(s, sound = () => {}) {
    this.$fans.innerHTML = '';
    this.$pile.innerHTML = '';
    this.pileKey = '';
    const layer = document.createElementNS(NS, 'g');
    this.$fx.appendChild(layer);
    const flights = [];
    for (let i = 0; i < 16; i++) {
      const p = i % 4;
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = `<g transform="translate(${-CW / 2} ${-CH / 2})">${cardBack()}</g>`;
      layer.appendChild(g);
      const [x, y, r] = this._origin(p);
      flights.push(this._fly(g, T(PILE.x, PILE.y, 0, BACK * 1.2), T(x, y, r + (Math.random() - 0.5) * 20, BACK), 360).then(() => g.remove()));
      if (i % 4 === 0) sound({ type: 'deal' });
      await wait(55);
    }
    await Promise.all(flights);
    layer.remove();
    this.tagKey = '';
    this.sync(s);
  }

  async play(events, s, sound = () => {}) {
    for (const ev of events) {
      if (ev.type === 'play') {
        sound(ev);
        // older plays slide back; the new one flies in from its owner
        const olds = [...this.$pile.querySelectorAll('.combo')];
        const keep = olds.slice(-2);
        olds.slice(0, -2).forEach((o) => o.remove());
        keep.forEach((o, i) => { o.classList.add('old'); o.style.transition = 'transform .35s ease, opacity .35s'; o.style.transform = this._slotT(keep.length - i, { cards: [0] }); });
        const el = this._comboEl(ev.combo, 0);
        this.$pile.appendChild(el);
        const [x, y, r] = this._origin(ev.p);
        this.counts[ev.p] = ev.left;
        this.$fans.innerHTML = s.players.map((p, i) => this._fan(i, i === ev.p ? ev.left : p.hand.length)).join('');
        await this._fly(el, T(x, y, r, 0.45), this._slotT(0, ev.combo), 420);
        this.pileKey = s.trick.map((t) => t.combo.cards.join('.')).join('|');
        this._float(ev.p, E.comboName(ev.combo), 'plain');
        await wait(260);
      } else if (ev.type === 'pass') {
        sound(ev);
        this.tagKey = '';
        this.sync(s);
        await wait(380);
      } else if (ev.type === 'clear') {
        sound(ev);
        await wait(380);
        const [x, y, r] = this._origin(ev.p);
        const combos = [...this.$pile.querySelectorAll('.combo')];
        await Promise.all(combos.map((c) => { c.style.opacity = '0'; return this._fly(c, c.style.transform, T(x, y, r, 0.3), 420); }));
        this.$pile.innerHTML = '';
        this.pileKey = '';
      } else if (ev.type === 'last') {
        sound(ev);
        this.say(ev.p, 'Last card!');
      } else if (ev.type === 'out') {
        sound(ev);
        this._float(ev.p, 'Huat ah!', 'good');
        await wait(600);
      } else if (ev.type === 'score') {
        await this._oranges(ev.results, s, sound);
      }
      this.tagKey = '';
      this.sync(s);
    }
  }

  async _oranges(res, s, sound) {
    const w = res.winner;
    const [wx, wy] = SEAT[w].tag;
    const flights = [];
    res.rows.forEach((r, p) => {
      if (p === w || !r.paid) return;
      const [x, y] = SEAT[p].tag;
      const n = Math.min(6, r.paid);
      for (let k = 0; k < n; k++) {
        const g = document.createElementNS(NS, 'g');
        g.innerHTML = orangeSVG(0, 0, 13);
        this.$fx.appendChild(g);
        flights.push(wait(k * 90).then(() => this._fly(g, T(x, y), T(wx + (Math.random() - 0.5) * 30, wy), 620)).then(() => { g.remove(); sound({ type: 'orange' }); }));
      }
      this._float(p, `−${r.paid}`, 'bad');
    });
    await Promise.all(flights);
    if (res.rows[w].got) this._float(w, `+${res.rows[w].got}`, 'good');
    await wait(500);
  }

  _float(p, text, cls) {
    const [x, y] = p === 0 ? [PILE.x, 470] : SEAT[p].bubble;
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('class', `floater ${cls}`);
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('text-anchor', 'middle');
    t.textContent = text;
    this.$fx.appendChild(t);
    setTimeout(() => t.remove(), 1300);
  }

  /** Speech bubble next to a player. */
  say(p, text) {
    const [x, y] = SEAT[p].bubble;
    const w = Math.max(90, text.length * 10.5 + 34);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'bubble');
    const tail = p === 1 ? `M${w / 2 - 20} 20l22 16-4-16z` : p === 3 ? `M${-w / 2 + 20} 20l-22 16 4-16z` : `M-10 20l0 18 16-18z`;
    g.innerHTML = `<g transform="translate(${x} ${y})"><path d="${tail}" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="${-w / 2}" y="-20" width="${w}" height="42" rx="21" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <rect x="${-w / 2 + 12}" y="18" width="${w - 24}" height="6" fill="#fff"/>
      <text y="8" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="19" fill="${INK}">${esc(text)}</text></g>`;
    (this.bubbles ||= {})[p]?.remove();
    this.bubbles[p] = g;
    this.$fx.appendChild(g);
    setTimeout(() => { g.classList.add('out'); setTimeout(() => g.remove(), 400); }, 1500);
  }
}
