// 2D dial — SVG renderer for Agak Agak.
import { BAND } from './engine.js';
import { tween, ease } from './fx.js';
import { sfx, buzz } from './sfx.js';

const NS = 'http://www.w3.org/2000/svg';
const CX = 500, CY = 470, R = 410;

// angle θ: 0 = left end, 90 = top, 180 = right end
const pt = (r, a) => [CX - r * Math.cos((a * Math.PI) / 180), CY - r * Math.sin((a * Math.PI) / 180)];
function wedge(r, a0, a1) {
  const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
  return `M${CX} ${CY}L${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
}
const mod = (n, m) => ((n % m) + m) % m;

export class Dial2D {
  constructor(stage, { tileHref = '../../assets/tile.svg' } = {}) {
    this.onNeedle = null;
    this.wheelRot = 0;
    this.shutterRot = 0; // 0 closed, -180 open
    this.needle = 90;
    this.enabled = false;
    this.mode = 'idle';
    this._idleT = 0;

    stage.classList.add('stage-2d');
    stage.innerHTML = `
      <div class="dial2d">
        <div class="dial-topic" aria-live="polite" hidden></div>
        <div class="dial-face">
        <svg viewBox="0 0 1000 600" class="dial-svg" role="group" aria-label="Agak Agak dial">
          <defs>
            <clipPath id="clipTop"><rect x="0" y="0" width="1000" height="${CY}"/></clipPath>
            <radialGradient id="shutterFill" cx="50%" cy="100%" r="100%">
              <stop offset="0" stop-color="#F3EAD8"/><stop offset=".7" stop-color="#EADDC4"/><stop offset="1" stop-color="#D8C6A4"/>
            </radialGradient>
            <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>
            </linearGradient>
            <radialGradient id="face" cx="50%" cy="100%" r="100%">
              <stop offset="0" stop-color="#FFFDF7"/><stop offset=".75" stop-color="#FBF3E2"/><stop offset="1" stop-color="#EBDDC2"/>
            </radialGradient>
            <radialGradient id="shade" cx="50%" cy="100%" r="100%">
              <stop offset=".6" stop-color="#2A1A12" stop-opacity="0"/><stop offset="1" stop-color="#2A1A12" stop-opacity=".35"/>
            </radialGradient>
            <linearGradient id="housing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#4A2C1B"/><stop offset="1" stop-color="#24150D"/>
            </linearGradient>
            <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#FFD877"/><stop offset=".5" stop-color="#F2B134"/><stop offset="1" stop-color="#B9791A"/>
            </linearGradient>
            <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#2A1A12" flood-opacity=".45"/>
            </filter>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <path class="housing" d="M24 ${CY + 84} L24 ${CY} A476 476 0 0 1 976 ${CY} L976 ${CY + 84} Q976 ${CY + 120} 940 ${CY + 120} L60 ${CY + 120} Q24 ${CY + 120} 24 ${CY + 84}Z" fill="url(#housing)" stroke="#120A06" stroke-width="4"/>
          <rect x="46" y="${CY + 20}" width="908" height="80" rx="18" fill="none" stroke="#F2B134" stroke-opacity=".35" stroke-width="2.5"/>
          <path d="M44 ${CY} A456 456 0 0 1 956 ${CY}" fill="none" stroke="url(#gold)" stroke-width="6" opacity=".9"/>
          <g class="bezel-dots"></g>

          <g clip-path="url(#clipTop)">
            <g class="wheel">
              <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#face)"/>
              <g class="ticks"></g>
              <g class="bands"></g>
            </g>
            <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#shade)" pointer-events="none"/>
            <g class="shutter">
              <path d="M${CX - R - 2} ${CY} A${R + 2} ${R + 2} 0 0 1 ${CX + R + 2} ${CY}Z" fill="url(#shutterFill)"/>
              <g class="fan"></g>
              <path d="M${CX - R - 2} ${CY} A${R + 2} ${R + 2} 0 0 1 ${CX + R + 2} ${CY}Z" fill="url(#sheen)"/>
              <path d="M${CX - R + 24} ${CY} A${R - 24} ${R - 24} 0 0 1 ${CX + R - 24} ${CY}" fill="none" stroke="#B9862A" stroke-opacity=".6" stroke-width="3"/>
              <path d="M${CX - 150} ${CY} A150 150 0 0 1 ${CX + 150} ${CY}" fill="none" stroke="#B9862A" stroke-opacity=".35" stroke-width="2"/>
              <g transform="translate(${CX} ${CY - R + 46})">
                <rect x="-60" y="-20" width="120" height="40" rx="20" fill="#2A1A12"/>
                <text y="7" text-anchor="middle" class="shutter-label">AGAK</text>
              </g>
            </g>
          </g>

          <path d="M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}" fill="none" stroke="#120A06" stroke-width="10"/>
          <rect x="24" y="${CY - 2}" width="952" height="10" fill="#120A06"/>

          <g class="call" opacity="0"></g>

          <g class="needle" tabindex="-1" role="slider" aria-label="Needle position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
            <path class="needle-hit" d="M${CX - 40} ${CY} L${CX - 40} ${CY - R} L${CX + 40} ${CY - R} L${CX + 40} ${CY}Z" fill="transparent"/>
            <g filter="url(#drop)">
              <path class="needle-body" d="M${CX} ${CY - R + 8} L${CX + 13} ${CY - 30} L${CX - 13} ${CY - 30}Z" stroke="#120A06" stroke-width="4" stroke-linejoin="round"/>
              <path d="M${CX} ${CY - R + 26} L${CX + 3} ${CY - 60} L${CX - 3} ${CY - 60}Z" fill="#fff" opacity=".35"/>
            </g>
          </g>
          <g class="pivot" filter="url(#drop)">
            <circle cx="${CX}" cy="${CY}" r="46" fill="url(#gold)" stroke="#120A06" stroke-width="5"/>
            <circle cx="${CX}" cy="${CY}" r="22" fill="#2A1A12"/>
            <circle cx="${CX - 7}" cy="${CY - 7}" r="6" fill="#fff" opacity=".35"/>
          </g>
        </svg>
        <div class="dial-labels" aria-live="polite">
          <div class="lab lab-l"><span class="arrow">←</span><span class="txt"></span></div>
          <div class="lab lab-r"><span class="txt"></span><span class="arrow">→</span></div>
        </div>
        </div>
      </div>`;

    this.root = stage.querySelector('.dial2d');
    this.svg = stage.querySelector('svg');
    this.gWheel = this.svg.querySelector('.wheel');
    this.gShutter = this.svg.querySelector('.shutter');
    this.gNeedle = this.svg.querySelector('.needle');
    this.gBands = this.svg.querySelector('.bands');
    this.gCall = this.svg.querySelector('.call');
    this.labL = this.root.querySelector('.lab-l .txt');
    this.labR = this.root.querySelector('.lab-r .txt');
    this.topicEl = this.root.querySelector('.dial-topic');

    this._buildStatic();
    this._applyWheel();
    this._applyShutter();
    this._applyNeedle();
    this._bindDrag();
    this._idleLoop();
  }

  _buildStatic() {
    // ticks around the whole wheel so spinning reads as motion
    let t = '';
    for (let a = 0; a < 360; a += 6) {
      const long = a % 30 === 0;
      const [x0, y0] = pt(R - (long ? 26 : 14), a);
      const [x1, y1] = pt(R - 6, a);
      t += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#6B3E26" stroke-opacity="${long ? 0.3 : 0.14}" stroke-width="${long ? 3.5 : 2.5}" stroke-linecap="round"/>`;
    }
    this.svg.querySelector('.ticks').innerHTML = t;

    // faint fan ribs on the shutter: texture without noise
    let f = '';
    for (let a = 15; a < 180; a += 15) {
      const [x0, y0] = pt(170, a);
      const [x1, y1] = pt(R - 34, a);
      f += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#6B3E26" stroke-opacity=".12" stroke-width="2"/>`;
    }
    this.svg.querySelector('.fan').innerHTML = f;

    // scoring bands, centred on the top (90°)
    const bands = [
      { w: 2.5, fill: '#1F8A8A', n: '2', cls: 'b2' },
      { w: 1.5, fill: '#F2B134', n: '3', cls: 'b3' },
      { w: 0.5, fill: '#D7263D', n: '4', cls: 'b4' },
    ];
    let b = '';
    for (const band of bands) {
      b += `<path class="band ${band.cls}" d="${wedge(R - 2, 90 - BAND * band.w, 90 + BAND * band.w)}" fill="${band.fill}" stroke="#2A1A12" stroke-opacity=".25" stroke-width="2"/>`;
    }
    const num = (a, n, color) => {
      const [x, y] = pt(R - 46, a);
      return `<text x="${x}" y="${y + 12}" text-anchor="middle" class="band-num" fill="${color}">${n}</text>`;
    };
    b += num(90, '4', '#FFF8E8');
    b += num(90 - BAND, '3', '#2A1A12') + num(90 + BAND, '3', '#2A1A12');
    b += num(90 - BAND * 2, '2', '#FFF8E8') + num(90 + BAND * 2, '2', '#FFF8E8');
    this.gBands.innerHTML = b;

    // bezel dots: 0/25/50/75/100 markers
    let d = '';
    for (let a = 0; a <= 180; a += 9) {
      const [x, y] = pt(R + 26, a);
      d += `<circle cx="${x}" cy="${y}" r="${a % 45 === 0 ? 6 : 3}" fill="#F2B134" opacity="${a % 45 === 0 ? 0.95 : 0.5}"/>`;
    }
    this.svg.querySelector('.bezel-dots').innerHTML = d;
  }

  _applyWheel() { this.gWheel.setAttribute('transform', `rotate(${this.wheelRot} ${CX} ${CY})`); }
  _applyShutter() { this.gShutter.setAttribute('transform', `rotate(${this.shutterRot} ${CX} ${CY})`); }
  _applyNeedle() {
    this.gNeedle.setAttribute('transform', `rotate(${this.needle - 90} ${CX} ${CY})`);
    this.gNeedle.setAttribute('aria-valuenow', String(Math.round((this.needle / 180) * 100)));
  }

  // ---------- adapter API ----------
  setMode(mode) {
    this.mode = mode;
    this.root.dataset.mode = mode;
  }

  setLabels(lab) {
    this.root.classList.toggle('no-labels', !lab);
    if (!lab) return;
    this.labL.textContent = lab[0];
    this.labR.textContent = lab[1];
  }

  setTopic(q) {
    this.topicEl.textContent = q || '';
    this.topicEl.hidden = !q;
  }

  setTarget(deg) {
    this.wheelRot = deg - 90;
    this._applyWheel();
  }

  spin(deg) {
    const start = this.wheelRot;
    const desired = deg - 90;
    let end = start - mod(start, 360) + 360 * 4 + desired;
    if (end - start < 360 * 3) end += 360;
    let lastTick = Math.floor(start / 12);
    return tween({
      from: start, to: end, duration: 3200, easing: ease.spin,
      onUpdate: (v) => {
        this.wheelRot = v;
        this._applyWheel();
        const k = Math.floor(v / 12);
        if (k !== lastTick) { lastTick = k; sfx.tick(); }
      },
    }).then(() => { this.wheelRot = desired; this._applyWheel(); sfx.thunk(); buzz(20); });
  }

  setShutter(open, { animate = true, slow = false } = {}) {
    const to = open ? -180 : 0;
    if (this.shutterRot === to) return Promise.resolve();
    this.root.classList.toggle('open', open);
    if (!animate) { this.shutterRot = to; this._applyShutter(); return Promise.resolve(); }
    sfx.whoosh(open);
    return tween({
      from: this.shutterRot, to, duration: slow ? 1500 : 850, easing: slow ? ease.inOutCubic : ease.outCubic,
      onUpdate: (v) => { this.shutterRot = v; this._applyShutter(); },
    });
  }

  setNeedle(deg, animate = false) {
    if (!animate) { this.needle = deg; this._applyNeedle(); return; }
    tween({ from: this.needle, to: deg, duration: 500, easing: ease.outBack, onUpdate: (v) => { this.needle = v; this._applyNeedle(); } });
  }

  setNeedleColor(c) { this.root.style.setProperty('--needle', c); }

  setNeedleEnabled(on) {
    this.enabled = on;
    this.root.classList.toggle('interactive', on);
    this.gNeedle.setAttribute('tabindex', on ? '0' : '-1');
    if (on) this.gNeedle.focus({ preventScroll: true });
  }

  showCall(side) {
    if (!side) { this.gCall.setAttribute('opacity', '0'); return; }
    const a0 = this.needle, dir = side === 'left' ? -1 : 1;
    const r = R + 4;
    const span = 16;
    const a1 = Math.max(2, Math.min(178, a0 + dir * span));
    const [x0, y0] = pt(r - 70, a0 + dir * 3);
    const [x1, y1] = pt(r - 70, a1);
    const sweep = dir > 0 ? 1 : 0;
    const [tx, ty] = pt(r - 112, a0 + dir * 10);
    this.gCall.innerHTML = `
      <path d="M${x0} ${y0} A${r - 70} ${r - 70} 0 0 ${sweep} ${x1} ${y1}" fill="none" stroke="#2A1A12" stroke-width="12" stroke-linecap="round"/>
      <circle cx="${x1}" cy="${y1}" r="13" fill="#2A1A12"/>
      <text x="${tx}" y="${ty + 9}" text-anchor="middle" class="call-label">${side.toUpperCase()}</text>`;
    this.gCall.setAttribute('opacity', '1');
  }

  highlight(points) {
    this.gBands.querySelectorAll('.band').forEach((b) => b.classList.remove('hit'));
    this.root.classList.toggle('scored', points != null);
    this.root.dataset.points = points ?? '';
    if (points) {
      const b = this.gBands.querySelector(`.b${points}`);
      if (b) b.classList.add('hit');
    }
  }

  // ---------- interaction ----------
  _angleFromEvent(e) {
    const p = this.svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(this.svg.getScreenCTM().inverse());
    const dx = q.x - CX, dy = CY - q.y;
    let phi = (Math.atan2(Math.max(dy, -0.0001), dx) * 180) / Math.PI; // 0 right .. 180 left
    if (dy < 0) phi = dx > 0 ? 0 : 180;
    return Math.max(0, Math.min(180, 180 - phi));
  }

  _set(deg) {
    const prev = this.needle;
    this.needle = deg;
    this._applyNeedle();
    if (Math.floor(prev / 3) !== Math.floor(deg / 3)) sfx.needle();
    if (this.onNeedle) this.onNeedle(deg);
  }

  _bindDrag() {
    let dragging = false;
    this.svg.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      dragging = true;
      this.svg.setPointerCapture(e.pointerId);
      this.root.classList.add('dragging');
      this._set(this._angleFromEvent(e));
      e.preventDefault();
    });
    this.svg.addEventListener('pointermove', (e) => { if (dragging && this.enabled) this._set(this._angleFromEvent(e)); });
    const end = () => { dragging = false; this.root.classList.remove('dragging'); };
    this.svg.addEventListener('pointerup', end);
    this.svg.addEventListener('pointercancel', end);
    this.gNeedle.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { this._set(Math.max(0, this.needle - step)); e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { this._set(Math.min(180, this.needle + step)); e.preventDefault(); }
    });
  }

  _idleLoop() {
    const loop = (now) => {
      if (this.mode === 'idle' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.needle = 90 + Math.sin(now / 1400) * 55;
        this._applyNeedle();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
