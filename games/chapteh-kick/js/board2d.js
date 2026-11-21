// Chapteh Kick — 2D (SVG) board. Same adapter API as board3d.js:
//   load(s) · frame(s) · react(ev, s) · setMode(mode)
import * as E from './engine.js';
import { S, GY, px, py, KID, OUTFITS, ZONE_COLORS, kidSVG, chaptehSVG, sceneSVG, heartSVG, FONT, INK } from './art.js';

const NS = 'http://www.w3.org/2000/svg';
const GRADE = { perfect: ['PERFECT!', '#FFD877'], good: ['GOOD', '#B6F2A0'], ok: ['OK', '#FFFFFF'], scrappy: ['SCRAPPY', '#FFB8C8'] };
const ZONE_GLYPH = { L: '◀', C: '▲', R: '▶' };
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/** Two-bone IK: knee position for hip→foot with the knee bending towards `bendSign` (−1 left, +1 right). */
function knee(hip, foot, a, b, bendSign) {
  const dx = foot.x - hip.x, dy = foot.y - hip.y;
  let d = Math.hypot(dx, dy);
  const maxD = a + b - 0.5;
  if (d > maxD) d = maxD;
  const base = Math.atan2(dy, dx);
  const cosA = Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)));
  const ang = Math.acos(cosA);
  const k1 = { x: hip.x + Math.cos(base + ang) * a, y: hip.y + Math.sin(base + ang) * a };
  const k2 = { x: hip.x + Math.cos(base - ang) * a, y: hip.y + Math.sin(base - ang) * a };
  return (k1.x - k2.x) * bendSign > 0 ? k1 : k2;
}

/** Leg targets (local px, origin at the feet) for a pose at progress k (0..1). */
function legTargets(pose, t, kidSide) {
  const K = KID;
  const rest = { l: { x: -26, y: 0 }, r: { x: 26, y: 0 } };
  const out = { l: { ...rest.l }, r: { ...rest.r }, kneeHint: null, lift: 0 };
  if (!pose || pose.kind === 'idle') return out;
  const dt = t - pose.t;
  const dur = 0.34;
  if (dt < 0 || dt > dur) return out;
  // fast up, short hold, ease back down
  const k = dt < 0.05 ? easeOut(dt / 0.05) : dt < 0.12 ? 1 : 1 - easeOut((dt - 0.12) / (dur - 0.12));
  out.lift = k;
  const miss = pose.whiff ? 1 : 0;
  if (pose.kind === 'C') {
    // knee raise with the left leg
    const target = { x: -10 + miss * 10, y: -72 - miss * 14 };
    out.l = { x: rest.l.x + (target.x - rest.l.x) * k, y: rest.l.y + (target.y - rest.l.y) * k };
    out.kneeHint = { side: 'l', x: -6, y: -150 + miss * 8, k };
    return out;
  }
  const sd = pose.kind === 'L' ? 'l' : 'r';
  const sign = sd === 'l' ? -1 : 1;
  const target = { x: sign * 44 + (miss ? sign * -18 : 0), y: -61 + (miss ? -26 : 0) };
  out[sd] = { x: rest[sd].x + (target.x - rest[sd].x) * k, y: rest[sd].y + (target.y - rest[sd].y) * k };
  void kidSide; void K;
  return out;
}

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
    this.svg.setAttribute('aria-label', 'Chapteh Kick playground');
    this.wrap.appendChild(this.svg);
    this.key = '';
    this.angle = 0;
  }

  load(s) {
    const mode = s.mode === 'rally' ? 'rally' : 'solo';
    const outfits = mode === 'rally' ? [0, 1] : [s.turn % OUTFITS.length];
    this.kidX = mode === 'rally' ? [-E.RALLY_X, E.RALLY_X] : [0];
    this.mode = mode;
    this.key = `${mode}|${outfits.join(',')}`;
    const pads = mode === 'solo' ? Object.entries(E.ZONES).map(([z, p]) => `
      <g class="pad pad-${z}" transform="translate(${px(p.x)} ${py(p.y)})" opacity=".0">
        <circle r="22" fill="${ZONE_COLORS[z]}" opacity=".25" stroke="${ZONE_COLORS[z]}" stroke-width="3"/>
        <text y="7" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="20" fill="#fff">${ZONE_GLYPH[z]}</text></g>`).join('') : '';
    this.svg.innerHTML = `
      <g class="scene">${sceneSVG('ck-', mode)}</g>
      <ellipse class="ch-shadow" rx="18" ry="5" fill="rgba(0,0,0,.25)" cy="${GY + 6}"/>
      ${outfits.map((o, i) => `<g class="kid-wrap" data-i="${i}">${kidSVG(OUTFITS[o], `kid${i}`)}</g>`).join('')}
      <g class="pads">${pads}</g>
      <circle class="ring" r="40" fill="none" stroke-width="6" opacity="0"/>
      <g class="chapteh"><g class="ch-inner">${chaptehSVG(false)}</g></g>
      <g class="fx"></g>
      <g class="hud"></g>
      <text class="count" x="500" y="300" text-anchor="middle"></text>`;
    this.$kids = [...this.svg.querySelectorAll('.kid-wrap')].map((g) => ({
      g,
      leg: { l: g.querySelector('.leg-l'), r: g.querySelector('.leg-r') },
      arm: { l: g.querySelector('.arm-l'), r: g.querySelector('.arm-r') },
      head: g.querySelector('.head'),
      torso: g.querySelector('.torso'),
    }));
    this.$ch = this.svg.querySelector('.chapteh');
    this.$chIn = this.svg.querySelector('.ch-inner');
    this.$shadow = this.svg.querySelector('.ch-shadow');
    this.$ring = this.svg.querySelector('.ring');
    this.$fx = this.svg.querySelector('.fx');
    this.$hud = this.svg.querySelector('.hud');
    this.$count = this.svg.querySelector('.count');
    this.golden = false;
    this.hudKey = '';
    this.frame(s);
  }

  _setLine(el, a, b) { el.setAttribute('x1', a.x); el.setAttribute('y1', a.y); el.setAttribute('x2', b.x); el.setAttribute('y2', b.y); }

  _poseKid(i, s) {
    const kid = this.$kids[i];
    const K = KID;
    const pose = s.pose[i];
    const tg = legTargets(pose, s.t, i);
    const bob = Math.sin(s.t * 6 + i) * 2 * (1 - tg.lift);
    kid.g.setAttribute('transform', `translate(${px(this.kidX[i])} ${GY + bob * 0.3})`);
    for (const sd of ['l', 'r']) {
      const sign = sd === 'l' ? -1 : 1;
      const hip = { x: sign * K.hipX, y: K.hipY + bob };
      const foot = tg[sd];
      let kn;
      if (tg.kneeHint && tg.kneeHint.side === sd) {
        const rest = knee(hip, { x: sign * 26, y: 0 }, K.thigh, K.shin, sign);
        kn = { x: rest.x + (tg.kneeHint.x - rest.x) * tg.kneeHint.k, y: rest.y + (tg.kneeHint.y - rest.y) * tg.kneeHint.k };
      } else kn = knee(hip, foot, K.thigh, K.shin, sign);
      const L = kid.leg[sd];
      this._setLine(L.querySelector('.thigh'), hip, kn);
      this._setLine(L.querySelector('.shin'), kn, foot);
      const sockTop = { x: foot.x + (kn.x - foot.x) * 0.3, y: foot.y + (kn.y - foot.y) * 0.3 };
      this._setLine(L.querySelector('.sock'), sockTop, foot);
      const lifted = foot.y < -4;
      const rot = lifted ? -sign * 28 * Math.min(1, -foot.y / 50) : 0;
      L.querySelector('.shoe').setAttribute('transform', `translate(${foot.x + sign * 6} ${foot.y + 2}) rotate(${rot})`);
    }
    // arms swing out for balance while kicking
    for (const sd of ['l', 'r']) {
      const sign = sd === 'l' ? -1 : 1;
      const sh = { x: sign * K.shoulderX, y: K.shoulderY + 14 + bob };
      const up = tg.lift;
      const elbow = { x: sh.x + sign * (14 + up * 40), y: sh.y + 56 - up * 34 };
      const hand = { x: elbow.x + sign * (2 + up * 34), y: elbow.y + 52 - up * 46 };
      const A = kid.arm[sd];
      this._setLine(A.querySelector('.upper'), sh, elbow);
      this._setLine(A.querySelector('.fore'), elbow, hand);
      A.querySelector('.hand').setAttribute('cx', hand.x); A.querySelector('.hand').setAttribute('cy', hand.y);
    }
    const lean = pose && pose.kind !== 'idle' && tg.lift ? (pose.kind === 'L' ? 4 : pose.kind === 'R' ? -4 : 0) * tg.lift : 0;
    kid.torso.setAttribute('transform', `translate(0 ${bob}) rotate(${lean} 0 ${K.hipY})`);
    // the head watches the chapteh
    let look = 0;
    if (s.f) { const p = E.posAt(s.f, s.t); look = Math.max(-6, Math.min(6, (px(p.x) - px(this.kidX[i])) / 30)); }
    kid.head.setAttribute('transform', `translate(${look} ${K.shoulderY - 44 + bob}) rotate(${lean * 1.5})`);
  }

  frame(s) {
    const mode = s.mode === 'rally' ? 'rally' : 'solo';
    const key = `${mode}|${(mode === 'rally' ? [0, 1] : [s.turn % OUTFITS.length]).join(',')}`;
    if (key !== this.key) this.load(s);
    this.$kids.forEach((_, i) => this._poseKid(i, s));
    // chapteh
    const show = !!s.f && (s.phase === 'play' || s.phase === 'dropped' || s.phase === 'over' || s.phase === 'done');
    this.$ch.style.display = show ? '' : 'none';
    this.$shadow.style.display = show ? '' : 'none';
    if (show) {
      const p = E.posAt(s.f, s.t);
      const y = Math.max(0, p.y);
      if (s.golden !== this.golden) { this.golden = s.golden; this.$chIn.innerHTML = chaptehSVG(s.golden); }
      const want = Math.atan2(-p.vx, -p.vy) * (180 / Math.PI);
      let d = want - this.angle;
      d = ((d + 540) % 360) - 180;
      this.angle += d * (y <= 0.02 ? 0 : 0.25);
      const flat = y <= 0.01 ? 90 : this.angle;
      this.$ch.setAttribute('transform', `translate(${px(p.x)} ${py(y) - (y <= 0.01 ? 6 : 0)}) rotate(${flat})`);
      const hgt = Math.min(1, y / 3);
      this.$shadow.setAttribute('cx', px(p.x));
      this.$shadow.setAttribute('rx', 18 - hgt * 8);
      this.$shadow.setAttribute('opacity', 1 - hgt * 0.6);
    }
    // timing ring + zone pads
    const ttk = E.timeToKick(s);
    const tgt = s.phase === 'play' ? E.targetPoint(s) : null;
    if (tgt && ttk < 0.8 && ttk > -0.12) {
      const zone = mode === 'solo' ? s.to : null;
      const col = zone ? ZONE_COLORS[zone] : E.PLAYER_COLORS[s.to] || '#fff';
      const k = Math.max(0, Math.min(1, ttk / 0.8));
      this.$ring.setAttribute('cx', px(tgt.x)); this.$ring.setAttribute('cy', py(tgt.y));
      this.$ring.setAttribute('r', 24 + k * 120);
      this.$ring.setAttribute('stroke', col);
      this.$ring.setAttribute('opacity', String(Math.min(1, (0.8 - ttk) / 0.25) * 0.9));
    } else this.$ring.setAttribute('opacity', '0');
    if (mode === 'solo') {
      for (const z of ['L', 'C', 'R']) {
        const pad = this.svg.querySelector(`.pad-${z}`);
        const on = s.phase === 'play' && s.to === z;
        pad.setAttribute('opacity', s.phase === 'play' || s.phase === 'dropped' ? (on ? '.95' : '.3') : '0');
      }
    }
    // countdown
    const cd = s.phase === 'countdown' ? Math.ceil(s.countdown) : 0;
    const txt = s.phase === 'countdown' ? (cd > 0 ? String(cd) : '') : '';
    if (this.$count.textContent !== txt) { this.$count.textContent = txt; this.$count.classList.remove('pop'); void this.$count.getBBox(); if (txt) this.$count.classList.add('pop'); }
    this._hud(s);
  }

  _hud(s) {
    if (s.phase === 'idle') { if (this.hudKey !== 'idle') { this.hudKey = 'idle'; this.$hud.innerHTML = ''; } return; }
    const key = s.mode === 'rally'
      ? `r|${s.players.map((p) => p.points).join(',')}|${s.rallyHits}`
      : `s|${E.current(s).score}|${s.combo}|${s.lives}|${s.turn}`;
    if (key === this.hudKey) return;
    this.hudKey = key;
    if (s.mode === 'rally') {
      const side = (p, x, anchor) => `<g transform="translate(${x} 58)">
        <text text-anchor="${anchor}" font-family="${FONT}" font-weight="800" font-size="22" fill="${INK}">${s.players[p].name}</text>
        <text y="58" text-anchor="${anchor}" font-family="${FONT}" font-weight="800" font-size="64" fill="${s.players[p].color}" stroke="${INK}" stroke-width="5" paint-order="stroke">${s.players[p].points}</text></g>`;
      this.$hud.innerHTML = `${side(0, 40, 'start')}${side(1, 960, 'end')}
        <g transform="translate(500 50)"><rect x="-90" y="-24" width="180" height="40" rx="20" fill="rgba(255,255,255,.8)" stroke="${INK}" stroke-width="3"/>
        <text y="4" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="18" fill="${INK}">FIRST TO ${s.target}${s.rallyHits > 2 ? ` · RALLY ${s.rallyHits}` : ''}</text></g>`;
      return;
    }
    const pl = E.current(s);
    const mult = 1 + Math.min(4, Math.floor(s.combo / 8));
    this.$hud.innerHTML = `
      <g transform="translate(36 72)">
        <text font-family="${FONT}" font-weight="800" font-size="20" fill="${INK}" opacity=".75">${s.mode === 'turns' ? pl.name.toUpperCase() : 'SCORE'}</text>
        <text class="hud-score" y="58" font-family="${FONT}" font-weight="800" font-size="62" fill="#fff" stroke="${INK}" stroke-width="6" paint-order="stroke">${pl.score}</text>
        ${s.combo >= 3 ? `<g transform="translate(0 92)"><rect width="${mult > 1 ? 168 : 118}" height="34" rx="17" fill="${mult > 1 ? '#E8590C' : INK}"/><text x="14" y="24" font-family="${FONT}" font-weight="800" font-size="18" fill="#fff">${s.combo} COMBO${mult > 1 ? ` · ×${mult}` : ''}</text></g>` : ''}
      </g>
      <g transform="translate(900 70)">${[0, 1, 2].map((i) => `<g transform="translate(${(i - 2) * 38} 0)">${heartSVG(i < s.lives)}</g>`).join('')}</g>`;
  }

  react(ev, s) {
    const at = ev.at;
    if (ev.type === 'kick') {
      const [label, col] = GRADE[ev.grade];
      const x = px(at.x), y = py(at.y);
      this._float(x, y - 40, ev.bonus ? `GOLDEN +${ev.bonus}` : label, col, ev.grade === 'perfect' ? 34 : 26);
      if (ev.pts && ev.mult > 1) this._float(x + 60, y - 6, `+${ev.pts}`, '#fff', 22);
      this._burst(x, y, ev.grade === 'perfect' ? '#FFD877' : '#fff', ev.grade === 'perfect' ? 10 : 6);
      if (ev.smash) this._float(x, y - 80, 'SMASH!', '#FF8A3D', 30);
    } else if (ev.type === 'whiff') {
      const k = this.$kids[ev.p];
      if (k) this._float(px(this.kidX[ev.p]), GY - 300, 'whiff!', '#FFFFFF', 22);
    } else if (ev.type === 'drop' || ev.type === 'point') {
      this._dust(px(at.x), GY + 4);
      this._float(px(at.x), GY - 70, ev.type === 'drop' ? 'Aiyoh!' : `Point ${s.players[ev.winner].name}!`, '#FF9FBF', 30);
    }
  }

  _float(x, y, text, color, size = 28) {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', 'floater');
    t.setAttribute('fill', color);
    t.setAttribute('font-size', size);
    t.textContent = text;
    this.$fx.appendChild(t);
    setTimeout(() => t.remove(), 1000);
  }
  _burst(x, y, color, n) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `translate(${x} ${y})`);
    g.innerHTML = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return `<line class="spark" x1="${Math.cos(a) * 14}" y1="${Math.sin(a) * 14}" x2="${Math.cos(a) * 30}" y2="${Math.sin(a) * 30}" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`; }).join('');
    this.$fx.appendChild(g);
    setTimeout(() => g.remove(), 450);
  }
  _dust(x, y) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `translate(${x} ${y})`);
    g.innerHTML = [0, 1, 2, 3, 4].map((i) => `<circle class="puff" cx="${(i - 2) * 14}" cy="${-4 - (i % 2) * 6}" r="${9 + (i % 3) * 3}" fill="#E8D3A0"/>`).join('');
    this.$fx.appendChild(g);
    setTimeout(() => g.remove(), 700);
  }

  setMode(mode) { this.stage.dataset.mode = mode; }
}
