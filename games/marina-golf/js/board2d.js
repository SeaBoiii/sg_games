// Marina Mini Golf — 2D (SVG) board. Same adapter API as board3d.js:
//   load(s) · frame(s, aim) · toWorld(clientX, clientY) · react(event, s) · setMode(mode)
import * as E from './engine.js';
import { S, holeSVG, cupSVG, ballSVG, moverSVG, trainSVG } from './art.js';

const NS = 'http://www.w3.org/2000/svg';

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
    this.wrap.appendChild(this.svg);
    this.trail = [];
    this.holeId = null;
    this.color = '#fff';
  }

  get surface() { return this.svg; }

  load(s) {
    const h = E.holeOf(s);
    this.h = h;
    this.holeId = h.id;
    const P = 'g-';
    const { under, over } = holeSVG(h, P);
    const slider = h.movers.find((m) => m.type === 'slider');
    this.svg.setAttribute('aria-label', `${h.name}, par ${h.par}`);
    this.svg.innerHTML = `
      <g class="under">${under}</g>
      <g class="movers"></g>
      ${slider ? `<g class="slider">${trainSVG(slider)}</g>` : ''}
      ${cupSVG(h, P)}
      <g class="trail"></g>
      <g class="aim" opacity="0">
        <line class="aim-line" x1="0" y1="0" x2="0" y2="0" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 14"/>
        <path class="aim-head" d="M0 -12 L18 0 L0 12 Z" fill="#fff" stroke="#20302A" stroke-width="2"/>
        <circle class="aim-ring" r="20" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>
      </g>
      <g class="ball">${ballSVG(this.color)}</g>
      <g class="over">${over}</g>
      <g class="fx"></g>`;
    this.$movers = this.svg.querySelector('.movers');
    this.$slider = this.svg.querySelector('.slider');
    this.$ball = this.svg.querySelector('.ball');
    this.$aim = this.svg.querySelector('.aim');
    this.$aimLine = this.svg.querySelector('.aim-line');
    this.$aimHead = this.svg.querySelector('.aim-head');
    this.$trail = this.svg.querySelector('.trail');
    this.$fx = this.svg.querySelector('.fx');
    this.$cup = this.svg.querySelector('.cup');
    this.trail = [];
    this.frame(s, null);
  }

  setBallColor(c) {
    this.color = c;
    const body = this.svg.querySelector('.ball-body');
    if (body) body.setAttribute('fill', c);
    this.trail = [];
    if (this.$trail) this.$trail.innerHTML = '';
  }

  frame(s, aim) {
    if (!this.h || E.holeOf(s).id !== this.holeId) this.load(s);
    const h = this.h;
    // movers
    const shapes = E.moverShapes(h, s.t);
    const bars = shapes.filter((m) => m.type === 'bar');
    if (bars.length) this.$movers.innerHTML = bars.map(moverSVG).join('');
    const sl = shapes.find((m) => m.type === 'slider');
    if (sl && this.$slider) this.$slider.setAttribute('transform', `translate(0 ${sl.y0 * S})`);
    // ball + trail
    const b = s.ball;
    const x = b.x * S, y = b.y * S;
    const holed = s.phase === 'holed';
    this.$ball.setAttribute('transform', `translate(${x} ${y}) scale(${holed ? 0.01 : 1})`);
    const moving = b.vx !== 0 || b.vy !== 0;
    if (moving) {
      const last = this.trail[this.trail.length - 1];
      if (!last || Math.hypot(last[0] - x, last[1] - y) > 9) {
        this.trail.push([x, y]);
        if (this.trail.length > 22) this.trail.shift();
        this.paintTrail();
      }
    } else if (this.trail.length && !this.fading) {
      this.fading = true;
      setTimeout(() => { this.trail = []; this.paintTrail(); this.fading = false; }, 500);
    }
    // aim guide
    if (aim && s.phase === 'aim') {
      const len = 40 + aim.power * 230;
      const dx = Math.cos(aim.angle), dy = Math.sin(aim.angle);
      const ex = x + dx * len, ey = y + dy * len;
      const col = aim.power < 0.45 ? '#B6F2A0' : aim.power < 0.75 ? '#FFD877' : '#FF8A8A';
      this.$aim.setAttribute('opacity', '1');
      this.$aimLine.setAttribute('x1', x + dx * 18); this.$aimLine.setAttribute('y1', y + dy * 18);
      this.$aimLine.setAttribute('x2', ex); this.$aimLine.setAttribute('y2', ey);
      this.$aimLine.setAttribute('stroke', col);
      this.$aimHead.setAttribute('transform', `translate(${ex} ${ey}) rotate(${(aim.angle * 180) / Math.PI})`);
      this.$aimHead.setAttribute('fill', col);
      this.svg.querySelector('.aim-ring').setAttribute('transform', `translate(${x} ${y})`);
    } else this.$aim.setAttribute('opacity', '0');
  }

  paintTrail() {
    const n = this.trail.length;
    this.$trail.innerHTML = this.trail.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${3 + (i / n) * 5}" fill="#fff" opacity="${((i + 1) / n) * 0.45}"/>`).join('');
  }

  toWorld(cx, cy) {
    const m = this.svg.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return { x: p.x / S, y: p.y / S };
  }

  /** Visual reaction to an engine event. */
  react(ev, s) {
    const b = s.ball;
    const at = (x, y, html, ms = 900) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('transform', `translate(${x} ${y})`);
      g.innerHTML = html;
      this.$fx.appendChild(g);
      setTimeout(() => g.remove(), ms);
    };
    if (ev.type === 'water') {
      // splash where it went in (the engine already moved the ball back)
      const p = ev.at || { x: b.x, y: b.y };
      at(p.x * S, p.y * S, `<circle class="splash" r="10" fill="none" stroke="#BFE6FF" stroke-width="5"/><circle class="splash d2" r="10" fill="none" stroke="#fff" stroke-width="3"/>`);
      this.float(p.x * S, p.y * S - 20, '+1 splash!', 'bad');
    } else if (ev.type === 'sink') {
      this.$cup.classList.remove('sunk'); void this.$cup.getBBox(); this.$cup.classList.add('sunk');
      at(this.h.cup[0] * S, this.h.cup[1] * S, `<circle class="ring" r="20" fill="none" stroke="#FFD877" stroke-width="6"/>`, 1000);
    } else if (ev.type === 'bump') {
      const c = this.h.circles.find((k) => k.kind === ev.kind && Math.hypot(k.x - b.x, k.y - b.y) < k.r + 2);
      const el = c && [...this.svg.querySelectorAll('.ob-dome')].find((g) => g.getAttribute('transform') === `translate(${c.x * S} ${c.y * S})`);
      if (el) { el.classList.remove('boing'); void el.getBBox(); el.classList.add('boing'); }
    } else if (ev.type === 'lip') {
      this.float(this.h.cup[0] * S, this.h.cup[1] * S - 30, 'Lipped out!', 'bad');
    } else if (ev.type === 'sand') {
      at(b.x * S, b.y * S, `<g class="puff">${[0, 1, 2, 3, 4].map((i) => `<circle cx="${Math.cos(i * 1.3) * 10}" cy="${Math.sin(i * 1.3) * 10}" r="5" fill="#EED9A4"/>`).join('')}</g>`, 700);
    }
  }

  float(x, y, text, cls = 'good') {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', `floater ${cls}`);
    t.textContent = text;
    this.$fx.appendChild(t);
    setTimeout(() => t.remove(), 1400);
  }

  celebrate(text) { this.float(this.h.cup[0] * S, this.h.cup[1] * S - 50, text, 'good'); }

  setMode(mode) { this.stage.dataset.mode = mode; }
}
