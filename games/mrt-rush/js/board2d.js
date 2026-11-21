// MRT Rush — 2D top-down carriage (SVG). Same adapter API as Board3D.
import * as E from './engine.js';
import { tween, ease, wait } from '../../../assets/lib/fx.js';
import { sfx } from '../../../assets/lib/sfx.js';

const CS = 64; // cell size
const GX = 60; // grid origin x
const PLAT = 86; // platform depth
const WALL = 24;
const GY = PLAT + WALL; // grid origin y
const W = GX * 2 + CS * E.COLS;
const H = GY * 2 + CS * E.ROWS;
const INK = '#2A1A12';

export const TYPE_COLORS = {
  worker: '#3E6FB0', student: '#F2F0E8', aunty: '#C2569B', ns: '#5B6B33', family: '#E3A33B', uncle: '#8A6D4B', expecting: '#E88EA6',
};
const SKIN = ['#F2C9A0', '#D9A47A', '#B07A4F', '#8D5A3B', '#E8B68F'];
const HAIR = ['#2A1A12', '#3B2A20', '#1A1512', '#6B4E3A', '#B8B2A7'];

const cx = (c) => GX + CS * c + CS / 2;
const cy = (r) => GY + CS * r + CS / 2;

/** One grid cell of a commuter, drawn top-down at (0,0). */
export function cellArt(kind, type, id = 0, { stops = null, standing = false } = {}) {
  const col = TYPE_COLORS[type] || '#3E6FB0';
  const skin = SKIN[id % SKIN.length];
  const hair = type === 'uncle' ? '#C9C3B8' : HAIR[id % HAIR.length];
  switch (kind) {
    case 'p':
    case 'kid': {
      const k = kind === 'kid' ? 0.68 : 1;
      const badge = stops == null ? '' : `
        <g transform="translate(${17 * k} ${-15 * k})">
          <circle r="11" fill="${stops <= 1 ? '#F2B134' : '#FFFCF5'}" stroke="${INK}" stroke-width="2.4"/>
          <text y="4.5" text-anchor="middle" class="stops">${stops}</text>
        </g>`;
      const need = TYPES_PRIORITY.has(type)
        ? standing
          ? `<circle r="29" fill="none" stroke="#D7263D" stroke-width="3" stroke-dasharray="5 4" class="need"/>`
          : `<circle r="29" fill="none" stroke="#3F8F5B" stroke-width="3"/>`
        : '';
      const bump = type === 'expecting' ? `<ellipse cx="0" cy="${12 * k}" rx="${9 * k}" ry="${6 * k}" fill="#F7B6C8" stroke="${INK}" stroke-width="2"/>` : '';
      const cane = type === 'uncle' ? `<line x1="14" y1="6" x2="24" y2="20" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` : '';
      return `${need}
        <ellipse cx="0" cy="${4 * k}" rx="${25 * k}" ry="${15 * k}" fill="${col}" stroke="${INK}" stroke-width="2.4"/>
        ${bump}${cane}
        <circle cx="0" cy="${-2 * k}" r="${12 * k}" fill="${skin}" stroke="${INK}" stroke-width="2.4"/>
        <path d="M${-11 * k} ${-4 * k} a${11 * k} ${11 * k} 0 0 1 ${22 * k} 0 q${-11 * k} ${-6 * k} ${-22 * k} 0z" fill="${hair}"/>
        ${badge}`;
    }
    case 'bag':
      return `<rect x="-15" y="-13" width="30" height="26" rx="8" fill="#2F3E63" stroke="${INK}" stroke-width="2.4"/><path d="M-8 -13v26M8 -13v26" stroke="#8FA1C8" stroke-width="2"/><rect x="-9" y="2" width="18" height="8" rx="3" fill="#41558A"/>`;
    case 'trolley':
      return `<rect x="-17" y="-20" width="34" height="40" rx="7" fill="#B8343D" stroke="${INK}" stroke-width="2.4"/>
        <path d="M-17 -8h34M-17 6h34M-6 -20v40M6 -20v40" stroke="#F2D6A0" stroke-width="2.2" opacity=".85"/>
        <path d="M-10 -20v-6h20v6" fill="none" stroke="${INK}" stroke-width="3"/>`;
    case 'pack':
      return `<rect x="-16" y="-19" width="32" height="38" rx="8" fill="#55652F" stroke="${INK}" stroke-width="2.4"/><rect x="-11" y="-12" width="22" height="10" rx="3" fill="#6E8040"/><path d="M-16 6h32" stroke="${INK}" stroke-width="2" opacity=".5"/>`;
    case 'stroller':
      return `<rect x="-17" y="-20" width="34" height="40" rx="10" fill="#6FB3B0" stroke="${INK}" stroke-width="2.4"/>
        <path d="M-17 -4a17 17 0 0 1 34 0z" fill="#2F7D7A" stroke="${INK}" stroke-width="2"/>
        <circle cx="-13" cy="18" r="4" fill="${INK}"/><circle cx="13" cy="18" r="4" fill="${INK}"/>`;
    default:
      return '';
  }
}
const TYPES_PRIORITY = new Set(Object.entries(E.TYPES).filter(([, t]) => t.priority).map(([k]) => k));

export class Board2D {
  constructor(stage) {
    stage.classList.add('stage-2d');
    stage.innerHTML = '<div class="board2d"></div>';
    this.root = stage.querySelector('.board2d');
    this.onCell = null;
    this.onHover = null;
    this.pick = null;
    this.drawn = {};
    this._bind();
  }

  load(s) {
    const line = E.lineOf(s);
    this.lineColor = line.color;
    let floor = '', seats = '', doors = '', windows = '', poles = '';
    for (let r = 0; r < E.ROWS; r++) for (let c = 0; c < E.COLS; c++) {
      const t = E.cellType(r, c);
      const x = GX + c * CS, y = GY + r * CS;
      if (t === 'seat' || t === 'priority') {
        const fill = t === 'priority' ? '#8E2C48' : 'var(--line)';
        seats += `<rect x="${x + 4}" y="${y + (r === 0 ? 4 : 10)}" width="${CS - 8}" height="${CS - 14}" rx="10" fill="${fill}" stroke="${INK}" stroke-width="2.4"/>
          <rect x="${x + 10}" y="${y + (r === 0 ? 4 : CS - 14)}" width="${CS - 20}" height="10" rx="4" fill="#fff" opacity=".22"/>`;
      }
      if (t === 'door') {
        floor += `<rect class="door-cell door-${r === 0 ? 'top' : 'bottom'}" x="${x}" y="${y}" width="${CS}" height="${CS}" fill="url(#hatch)"/>`;
      }
    }
    // priority labels
    for (const [c0, r] of [[0, 0], [10, 0], [0, 4], [10, 4]]) {
      seats += `<text x="${GX + c0 * CS + CS}" y="${GY + r * CS + (r === 0 ? CS - 4 : 8)}" text-anchor="middle" class="prio-label">PRIORITY</text>`;
    }
    // poles in the standing area
    for (const c of [1, 5, 7, 11]) for (const r of [2, 3]) poles += `<circle cx="${GX + c * CS}" cy="${GY + r * CS}" r="5" fill="#C9CED1" stroke="${INK}" stroke-width="2"/>`;
    // walls: windows between door gaps, door leaves in the gaps
    for (const side of ['top', 'bottom']) {
      const wy = side === 'top' ? PLAT : GY + E.ROWS * CS;
      for (const [a, b] of [[0, 2], [4, 8], [10, 12]]) {
        windows += `<rect x="${GX + a * CS + 8}" y="${wy + 6}" width="${(b - a) * CS - 16}" height="${WALL - 12}" rx="4" fill="#BFE3EC" stroke="${INK}" stroke-width="1.5"/>`;
      }
      for (const d of [2, 8]) {
        const x = GX + d * CS;
        doors += `<g class="door door-${side}" data-side="${side}">
          <rect class="leaf l" x="${x}" y="${wy}" width="${CS}" height="${WALL}" fill="#DADFE2" stroke="${INK}" stroke-width="2"/>
          <rect class="leaf r" x="${x + CS}" y="${wy}" width="${CS}" height="${WALL}" fill="#DADFE2" stroke="${INK}" stroke-width="2"/>
          <rect x="${x + 6}" y="${wy + 6}" width="${CS - 12}" height="${WALL - 12}" rx="3" fill="#BFE3EC" class="leaf l"/>
          <rect x="${x + CS + 6}" y="${wy + 6}" width="${CS - 12}" height="${WALL - 12}" rx="3" fill="#BFE3EC" class="leaf r"/>
        </g>`;
      }
    }
    const platform = (side) => {
      const y = side === 'top' ? 0 : H - PLAT;
      const edge = side === 'top' ? PLAT - 16 : H - PLAT + 6;
      let dots = '';
      for (let x = 10; x < W; x += 16) dots += `<circle cx="${x}" cy="${edge + 5}" r="2.4" fill="#C9A21C"/>`;
      return `<g class="platform platform-${side}">
        <rect x="0" y="${y}" width="${W}" height="${PLAT}" fill="url(#ptile)"/>
        <rect x="0" y="${edge}" width="${W}" height="10" fill="#F2C230"/>
        ${dots}
        <g class="crowd"></g>
      </g>`;
    };
    const tunnel = (side) => {
      const y = side === 'top' ? 0 : H - PLAT;
      return `<g class="tunnel tunnel-${side}"><rect x="0" y="${y}" width="${W}" height="${PLAT}" fill="#3A3F44"/>
        <g class="streaks">${Array.from({ length: 6 }, (_, i) => `<rect x="${i * 170}" y="${y + PLAT / 2 - 3}" width="70" height="6" rx="3" fill="#FFE9A8" opacity=".35"/>`).join('')}</g></g>`;
    };
    this.root.innerHTML = `
      <svg class="board-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="MRT carriage, ${E.ROWS} by ${E.COLS} spaces">
        <defs>
          <pattern id="hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="16" height="16" fill="#E7E2D8"/><rect width="8" height="16" fill="#F2C230" opacity=".55"/>
          </pattern>
          <pattern id="ptile" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#D9D3C7"/><rect width="39" height="39" fill="#E4DFD5"/>
          </pattern>
          <pattern id="floor" width="32" height="32" patternUnits="userSpaceOnUse">
            <rect width="32" height="32" fill="#D8D4CC"/><circle cx="8" cy="8" r="1.5" fill="#C6C1B7"/><circle cx="24" cy="24" r="1.5" fill="#C6C1B7"/>
          </pattern>
        </defs>
        ${tunnel('top')}${tunnel('bottom')}
        ${platform('top')}${platform('bottom')}
        <rect x="22" y="${PLAT - 6}" width="${W - 44}" height="${CS * E.ROWS + WALL * 2 + 12}" rx="44" fill="var(--line)" stroke="${INK}" stroke-width="4"/>
        <rect x="${GX - 14}" y="${PLAT}" width="${CS * E.COLS + 28}" height="${CS * E.ROWS + WALL * 2}" rx="26" fill="#F4F2EE" stroke="${INK}" stroke-width="3"/>
        ${windows}
        <rect x="${GX}" y="${GY}" width="${CS * E.COLS}" height="${CS * E.ROWS}" fill="url(#floor)"/>
        <g class="floor">${floor}</g>
        <g class="seats">${seats}</g>
        <g class="poles">${poles}</g>
        <g class="reach"></g>
        <g class="riders"></g>
        <g class="ghost"></g>
        <g class="doors">${doors}</g>
        <g class="walkers"></g>
      </svg>`;
    this.svg = this.root.querySelector('svg');
    this.svg.style.setProperty('--line', line.color);
    this.gRiders = this.svg.querySelector('.riders');
    this.gReach = this.svg.querySelector('.reach');
    this.gGhost = this.svg.querySelector('.ghost');
    this.gWalk = this.svg.querySelector('.walkers');
    this.drawn = {};
    this.s = s;
    this.setTravel(false);
    this.sync(s);
  }

  _riderSVG(rd) {
    const [ar, ac] = rd.cells[0];
    const parts = rd.cells.map(([r, c, k]) => {
      const standing = TYPES_PRIORITY.has(rd.type) && k === 'p' && !E.isSeat(r, c);
      return `<g transform="translate(${(c - ac) * CS} ${(r - ar) * CS})">${cellArt(k, rd.type, rd.id, { stops: k === 'p' ? rd.stops : null, standing })}</g>`;
    }).join('');
    return `<g class="rider" data-id="${rd.id}" transform="translate(${cx(ac)} ${cy(ar)})">${parts}</g>`;
  }

  sync(s) {
    this.s = s;
    if (!this.svg) return;
    const html = Object.values(s.riders).map((rd) => this._riderSVG(rd)).join('');
    this.gRiders.innerHTML = html;
    this.svg.dataset.side = s.side;
    this._crowd(s);
  }

  _crowd(s) {
    for (const side of ['top', 'bottom']) {
      const g = this.svg.querySelector(`.platform-${side} .crowd`);
      if (side !== s.side || s.phase !== 'board') { g.innerHTML = ''; continue; }
      const y = side === 'top' ? PLAT / 2 - 10 : H - PLAT / 2 + 6;
      g.innerHTML = s.queue.map((q, i) => {
        const door = i % 2 ? 8 : 2;
        const x = GX + door * CS + CS + ((Math.floor(i / 2) % 4) - 1.5) * 40;
        return `<g transform="translate(${x} ${y + (Math.floor(i / 8)) * 10}) scale(.6)">${cellArt('p', q.type, q.id)}</g>`;
      }).join('');
    }
  }

  setTravel(on) {
    if (!this.svg) return;
    this.svg.classList.toggle('travel', on);
  }

  async doors(open) {
    if (!this.svg) return;
    this.svg.classList.toggle('open', open);
    sfx.whoosh(open);
    await wait(420);
  }

  setPicking(pick, s) {
    this.pick = pick;
    this.s = s;
    this.gGhost.innerHTML = '';
    if (!pick) { this.gReach.innerHTML = ''; return; }
    const reach = E.reachable(s);
    this.reach = reach;
    let h = '';
    for (const k of reach) {
      const [r, c] = k.split(',').map(Number);
      h += `<rect x="${GX + c * CS + 3}" y="${GY + r * CS + 3}" width="${CS - 6}" height="${CS - 6}" rx="10" class="reach-cell"/>`;
    }
    this.gReach.innerHTML = h;
    if (this.hoverCell) this._ghost(...this.hoverCell);
  }

  _ghost(r, c) {
    if (!this.pick) return;
    const res = E.canPlace(this.s, this.pick.type, this.pick.rot, r, c, this.reach);
    this.gGhost.innerHTML = res.cells.map(([cr, cc, k]) =>
      `<g transform="translate(${cx(cc)} ${cy(cr)})" class="${res.ok ? 'ok' : 'bad'}"><rect x="${-CS / 2 + 3}" y="${-CS / 2 + 3}" width="${CS - 6}" height="${CS - 6}" rx="10" class="ghost-cell"/><g opacity=".7">${cellArt(k, this.pick.type, this.pick.id)}</g></g>`).join('');
    if (this.onHover) this.onHover(res);
  }

  async animateBoard(rider, s) {
    this.sync(s);
    const el = this.gRiders.querySelector(`[data-id="${rider.id}"]`);
    if (!el) return;
    const [ar, ac] = rider.cells[0];
    const door = E.DOOR_COLS.reduce((best, d) => (Math.abs(d - ac) < Math.abs(best - ac) ? d : best), E.DOOR_COLS[0]);
    const fromX = cx(door), fromY = s.side === 'top' ? GY - 50 : GY + E.ROWS * CS + 50;
    const toX = cx(ac), toY = cy(ar);
    sfx.plop();
    await tween({ from: 0, to: 1, duration: 260, easing: ease.outCubic, onUpdate: (v) => el.setAttribute('transform', `translate(${fromX + (toX - fromX) * v} ${fromY + (toY - fromY) * v})`) });
  }

  async animateExits(exits, s) {
    if (!exits.length) { this.sync(s); return; }
    // draw leavers in the walker layer, then clear them from the carriage
    this.gWalk.innerHTML = exits.map((e) => this._riderSVG(e.rider).replace('class="rider"', `class="rider leaving ${e.clean ? '' : 'squeeze'}"`)).join('');
    this.sync(s);
    const els = [...this.gWalk.querySelectorAll('.rider')];
    await Promise.all(els.map((el, i) => {
      const e = exits[i];
      const [ar, ac] = e.rider.cells[0];
      const door = E.DOOR_COLS.reduce((best, d) => (Math.abs(d - ac) < Math.abs(best - ac) ? d : best), E.DOOR_COLS[0]);
      const toX = cx(door), toY = s.side === 'top' ? GY - 70 : GY + E.ROWS * CS + 70;
      const fx = cx(ac), fy = cy(ar);
      return wait(i * 90).then(() => tween({ from: 0, to: 1, duration: 520, easing: ease.inOutCubic, onUpdate: (v) => {
        el.setAttribute('transform', `translate(${fx + (toX - fx) * v} ${fy + (toY - fy) * v})`);
        el.setAttribute('opacity', String(1 - Math.max(0, v - 0.6) / 0.4));
      } }));
    }));
    this.gWalk.innerHTML = '';
  }

  async travel(s) {
    this.setTravel(true);
    await wait(1400);
    this.setTravel(false);
  }

  _cellFromEvent(e) {
    const p = this.svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(this.svg.getScreenCTM().inverse());
    const c = Math.floor((q.x - GX) / CS), r = Math.floor((q.y - GY) / CS);
    return r >= 0 && r < E.ROWS && c >= 0 && c < E.COLS ? [r, c] : null;
  }

  _bind() {
    this.root.addEventListener('pointermove', (e) => {
      if (!this.svg || !this.pick) return;
      const cell = this._cellFromEvent(e);
      if (!cell) { this.gGhost.innerHTML = ''; this.hoverCell = null; return; }
      if (this.hoverCell && cell[0] === this.hoverCell[0] && cell[1] === this.hoverCell[1]) return;
      this.hoverCell = cell;
      this._ghost(...cell);
    });
    this.root.addEventListener('pointerleave', () => { this.hoverCell = null; if (this.gGhost) this.gGhost.innerHTML = ''; });
    this.root.addEventListener('click', (e) => {
      if (!this.svg || !this.pick || !this.onCell) return;
      const cell = this._cellFromEvent(e);
      if (cell) this.onCell(cell[0], cell[1]);
    });
    this.root.addEventListener('contextmenu', (e) => { if (this.pick) { e.preventDefault(); this.onRotate && this.onRotate(); } });
  }
}
