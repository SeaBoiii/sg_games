// Chope Wars — 2D SVG board. Same adapter API as Board3D.
import * as E from './engine.js';
import { wait } from '../../../assets/lib/fx.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';

const S = 210; // table spacing
const M = S / 2 + 52; // outer margin
const ST = 176; // stall strip height
const STALLS = ['CHICKEN RICE', 'KOPI · TEH', 'CHAR KWAY TEOW', 'LAKSA', 'SATAY', 'ROTI PRATA'];
const AWNINGS = ['#D7263D', '#1F8A8A', '#F2B134', '#2F6B4F', '#E0457B', '#6B3E26'];

const rotFor = (id) => ((id * 37) % 30) - 15;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function packetSVG(color, cls = '') {
  return `<g class="packet ${cls}">
    <rect x="-27" y="-18" width="54" height="36" rx="8" fill="${color}" stroke="#2A1A12" stroke-width="3"/>
    <rect x="-8" y="-17" width="16" height="34" fill="#fff" opacity=".82"/>
    <path d="M-21 -10h8M13 10h8" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

export class Board2D {
  constructor(stage) {
    stage.classList.add('stage-2d');
    stage.innerHTML = '<div class="board2d"></div>';
    this.root = stage.querySelector('.board2d');
    this.onPick = null;
    this.n = 0;
    this.owners = [];
    this.live = false;
    this.root.addEventListener('click', (e) => this._click(e));
    new ResizeObserver(() => this._fit()).observe(this.root);
    this.root.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.stool')) { e.preventDefault(); this._click(e); }
    });
  }

  pos(s, stoolId) {
    const st = E.geo(s).stools[stoolId];
    if (st.kind === 'h') return [M + S * st.c, ST + M + S * (st.r - 0.5)];
    return [M + S * (st.c - 0.5), ST + M + S * st.r];
  }
  tpos(s, t) { const tb = E.geo(s).tables[t]; return [M + S * tb.c, ST + M + S * tb.r]; }

  load(s) {
    const n = (this.n = s.n);
    const g = E.geo(s);
    const B = 2 * M + S * (n - 1);
    const H = B + ST;
    this.owners = s.stools.map(() => undefined);

    const nStalls = Math.max(2, n - 1);
    const sw = B / nStalls;
    let stalls = '';
    for (let k = 0; k < nStalls; k++) {
      const x = k * sw + 10, w = sw - 20, col = AWNINGS[k % AWNINGS.length];
      let scal = '';
      for (let i = 0; i < 8; i++) scal += `<path d="M${x + (w / 8) * i} 92 q${w / 16} 22 ${w / 8} 0" fill="${col}" stroke="#2A1A12" stroke-width="3"/>`;
      stalls += `
        <rect x="${x}" y="18" width="${w}" height="56" rx="10" fill="#2F6B4F" stroke="#2A1A12" stroke-width="4"/>
        <text x="${x + w / 2}" y="55" text-anchor="middle" class="sign-text">${STALLS[k % STALLS.length]}</text>
        <rect x="${x}" y="74" width="${w}" height="20" fill="${col}" stroke="#2A1A12" stroke-width="3"/>
        ${scal}
        <rect x="${x + 6}" y="118" width="${w - 12}" height="44" rx="6" fill="#E9DCC5" stroke="#2A1A12" stroke-width="3"/>
        <rect x="${x + 6}" y="118" width="${w - 12}" height="10" fill="#C9B79C"/>`;
    }

    let tables = '';
    g.tables.forEach((t, i) => {
      const [x, y] = this.tpos(s, i);
      const type = s.tables[i].type;
      const val = s.tables[i].value;
      let deco = '';
      if (type === 'fan') {
        deco = `<g opacity=".2"><g class="fan-blades">${[0, 120, 240].map((a) => `<ellipse cx="0" cy="-34" rx="11" ry="34" transform="rotate(${a})" fill="#2A1A12"/>`).join('')}<circle r="9" fill="#2A1A12"/></g></g>`;
      } else if (type === 'famous') {
        deco = `<path d="M0 -30 L8.8 -12 L28.5 -9.3 L14.3 4.6 L17.6 24.3 L0 15 L-17.6 24.3 L-14.3 4.6 L-28.5 -9.3 L-8.8 -12Z" fill="#F2B134" stroke="#2A1A12" stroke-width="3" stroke-linejoin="round" opacity=".9"/>`;
      }
      const badgeFill = type === 'famous' ? '#F2B134' : type === 'fan' ? '#DDF1EE' : '#fff';
      tables += `
        <g class="table" data-t="${i}" transform="translate(${x} ${y})">
          <ellipse cx="6" cy="10" rx="76" ry="72" fill="#2A1A12" opacity=".18"/>
          <circle class="warn" r="90"/>
          <circle r="72" fill="url(#marble)" stroke="#2F6B4F" stroke-width="8"/>
          <circle r="66" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>
          ${deco}
          <text class="tbl-label" y="-38" text-anchor="middle">${t.name}</text>
          <g transform="translate(46 46)"><circle r="21" fill="${badgeFill}" stroke="#2A1A12" stroke-width="3"/><text class="tbl-val" y="8" text-anchor="middle" fill="#2A1A12">${val}</text></g>
          <g class="claim">
            <circle r="72" fill="var(--owner)" stroke="#2A1A12" stroke-width="6"/>
            <circle r="60" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-dasharray="4 8"/>
            <text class="stamp-text" y="-2" text-anchor="middle">CHOPED</text>
            <text class="stamp-text" y="30" text-anchor="middle" style="font-size:24px">+${val}</text>
          </g>
        </g>`;
    });

    let stools = '';
    g.stools.forEach((st, i) => {
      const [x, y] = this.pos(s, i);
      const label = `Stool by table ${st.tables.map((t) => g.tables[t].name).join(' and ')}`;
      stools += `
        <g class="stool empty" data-s="${i}" transform="translate(${x} ${y})" tabindex="-1" role="button" aria-label="${esc(label)}">
          <circle r="52" fill="transparent"/>
          <circle class="last-ring" r="42"/>
          <circle cx="3" cy="5" r="33" fill="#2A1A12" opacity=".2"/>
          <circle class="seat" r="32" fill="#F0E6D6" stroke="#2A1A12" stroke-width="3"/>
          <circle r="24" fill="none" stroke="#2A1A12" stroke-opacity=".15" stroke-width="2"/>
          <rect x="-11" y="-4" width="22" height="8" rx="4" fill="#2A1A12" opacity=".22"/>
          <g class="ghost" transform="rotate(${rotFor(i)})">${packetSVG('var(--ghost)')}</g>
          <g class="slot" transform="rotate(${rotFor(i)})"></g>
        </g>`;
    });

    this.root.innerHTML = `
      <svg class="board-svg" viewBox="0 0 ${B} ${H}" role="group" aria-label="Hawker centre with ${g.tables.length} tables">
        <defs>
          <pattern id="floor" width="64" height="64" patternUnits="userSpaceOnUse">
            <rect width="64" height="64" fill="#EADCC3"/><rect width="32" height="32" fill="#E2CFAF"/><rect x="32" y="32" width="32" height="32" fill="#E2CFAF"/>
          </pattern>
          <radialGradient id="marble" cx="40%" cy="35%" r="75%">
            <stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#F2EEE7"/><stop offset="1" stop-color="#DCD5CA"/>
          </radialGradient>
        </defs>
        <rect width="${B}" height="${ST}" fill="#F3E6CF"/>
        ${stalls}
        <rect y="${ST - 8}" width="${B}" height="8" fill="#2A1A12"/>
        <rect y="${ST}" width="${B}" height="${B}" fill="url(#floor)"/>
        <g class="tables">${tables}</g>
        <g class="stools">${stools}</g>
      </svg>`;
    this.svg = this.root.querySelector('svg');
    this.dims = { B, H };
    this._fit();
    this.stoolEls = [...this.root.querySelectorAll('.stool')];
    this.tableEls = [...this.root.querySelectorAll('.table')];
    this.sync(s);
  }

  /** Short screens (phone landscape): crop the stall signboards so the tables get the height. */
  _fit() {
    if (!this.svg) return;
    const { B, H } = this.dims;
    const short = this.root.clientHeight > 0 && this.root.clientHeight < 420;
    this.svg.setAttribute('viewBox', short ? `0 ${ST - 10} ${B} ${H - ST + 10}` : `0 0 ${B} ${H}`);
  }

  /** Paint state without animation (or with drop on `fresh` stools). */
  sync(s, { fresh = [] } = {}) {
    if (s.n !== this.n || !this.svg) { this.load(s); return; }
    s.stools.forEach((o, i) => {
      const el = this.stoolEls[i];
      if (this.owners[i] !== o) {
        const slot = el.querySelector('.slot');
        slot.innerHTML = o == null ? '' : packetSVG(s.players[o].color, fresh.includes(i) ? 'drop' : '');
        this.owners[i] = o;
      }
      el.classList.toggle('empty', o == null);
      el.classList.toggle('last', !!(s.last && s.last.stool === i));
      el.setAttribute('aria-label', el.getAttribute('aria-label').replace(/ \(.*\)$/, '') + (o == null ? ' (empty)' : ` (${s.players[o].name})`));
    });
    s.tables.forEach((t, i) => {
      const el = this.tableEls[i];
      const was = el.classList.contains('claimed');
      el.classList.toggle('claimed', t.owner != null);
      if (t.owner != null) el.style.setProperty('--owner', s.players[t.owner].color);
      if (t.owner == null || was) el.classList.remove('fresh');
      el.classList.toggle('hot', t.owner == null && E.filledCount(s, i) === 3);
    });
  }

  setInteractive(on, { mode = 'place', player = 0, s = null } = {}) {
    this.live = on;
    this.mode = mode;
    this.root.classList.toggle('live', on && mode === 'place');
    this.root.classList.toggle('swap', on && mode === 'swap');
    if (s) this.root.style.setProperty('--ghost', s.players[player].color);
    this.stoolEls.forEach((el, i) => {
      const ok = on && s && (mode === 'place' ? s.stools[i] == null : E.canSwap(s, i, player));
      el.classList.toggle('swappable', !!(on && mode === 'swap' && ok));
      el.setAttribute('tabindex', ok ? '0' : '-1');
    });
  }

  async animateMove(ev, s) {
    const i = ev.move.stool;
    const el = this.stoolEls[i];
    if (ev.move.type === 'swap') {
      const old = el.querySelector('.slot .packet');
      if (old) { old.classList.add('swept'); sfx.sweep(); await wait(420); }
      this.owners[i] = undefined;
    }
    this.sync(s, { fresh: [i] });
    sfx.plop();
    buzz(10);
    await wait(380);
    for (const c of ev.claims) {
      const t = this.tableEls[c.table];
      t.classList.add('fresh');
      t.classList.add('claimed');
      t.style.setProperty('--owner', s.players[c.owner].color);
      sfx.claim(c.owner === ev.player);
      buzz(25);
      await wait(520);
    }
  }

  _click(e) {
    const el = e.target.closest('.stool');
    if (!el || !this.live || !this.onPick) return;
    const i = +el.dataset.s;
    if (this.mode === 'place' && !el.classList.contains('empty')) return;
    if (this.mode === 'swap' && !el.classList.contains('swappable')) return;
    this.onPick(i);
  }
}
