// Next Station — 2D side view (canvas). Same adapter API as board3d.js:
//   load(s) · render(s, dt) · event(ev, s) · setMode(mode) · hud
// The camera follows the nose of the train and zooms in for the last few metres of each stop.
import * as E from './engine.js';
import { Hud } from './hud.js';

const INK = '#2A1A12';
const H_ROOF = 3.9, H_FLOOR = 1.1;
const DOORS = [4.4, 9.6, 14.8, 20.0];      // door centres, metres back from each car's front
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const SHIRTS = ['#3E6FB0', '#E88EA6', '#5B6B33', '#F2F0E8', '#C2569B', '#F2B134', '#8A6D4B', '#2F9E5B', '#D7263D', '#6A4FB3'];
const SKINS = ['#F2C9A0', '#D9A47A', '#B07A4F', '#8D5A3B', '#E8B68F'];
const SKY = {
  day: ['#8FCBE6', '#E8F5F6', '#C9D6DC', '#B5C6CE'],
  dusk: ['#5B4F8F', '#F5B27A', '#A8879A', '#8C7488'],
  night: ['#0E1430', '#2C3260', '#2A3052', '#232845'],
};

export class Board2D {
  constructor(el) {
    this.el = el;
    el.classList.add('stage-2d');
    this.cv = document.createElement('canvas');
    this.cv.className = 'world';
    this.cv.setAttribute('aria-label', 'Side view of the train and the line');
    el.appendChild(this.cv);
    this.g = this.cv.getContext('2d');
    this.hud = new Hud(el);
    this.ppm = 8;
    this.t = 0;
    this.doors = 0;      // 0 shut … 1 open
    this.rain = [];
    this._resize();
    new ResizeObserver(() => this._resize()).observe(el);
  }

  _resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.W = Math.max(1, this.el.clientWidth); this.H = Math.max(1, this.el.clientHeight);
    this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.s) this.render(this.s, 0);
  }

  load(s) {
    this.s = s;
    this.ppm = 7;
    this.doors = s.phase === 'doors' ? 1 : 0;
    // people waiting on each platform
    this.crowd = s.map.marks.map((m, i) => Array.from({ length: 9 + Math.floor(hash(i + 3) * 6) }, (_, k) => ({
      x: m - 6 - hash(i * 31 + k) * (E.PLATFORM - 14), shirt: SHIRTS[Math.floor(hash(i * 7 + k * 3) * SHIRTS.length)], skin: SKINS[Math.floor(hash(k * 11 + i) * SKINS.length)],
      h: 1.55 + hash(k * 5 + i * 2) * 0.25, ph: hash(k + i * 9) * 6, gone: 0,
    })));
    this.render(s, 0);
  }

  setMode(mode) { this.el.dataset.mode = mode; }

  event(ev) {
    if (ev.type === 'arrive') { this.boarding = this.s.seg; }
  }

  // ---------------- frame ----------------
  render(s, dt) {
    this.s = s;
    this.t += dt;
    const { g, W, H } = this;
    const d = E.nextMark(s) - s.x;
    // zoom: wide at speed, close in for the stop
    let target = 13 - Math.min(1, s.v / 22) * 7.5;
    if (s.phase === 'run' && d < 90 && d > -10) target = Math.max(target, Math.min(17, (W * 0.36) / (Math.max(0, d) + 5)));
    if (s.phase === 'doors' || s.phase === 'depart') target = 9;
    this.ppm += (target - this.ppm) * Math.min(1, dt * 2.5);
    const k = this.ppm * (H / 360);
    this.k = k;
    this.noseX = W * 0.58;
    this.railY = H * 0.7;
    const want = s.phase === 'doors' && s.phaseT > 0.3 ? 1 : 0;
    this.doors += (want - this.doors) * Math.min(1, dt * 4);
    const time = s.line.time;
    const sky = SKY[time] || SKY.day;

    // sky and far skyline
    const grad = g.createLinearGradient(0, 0, 0, H * 0.75);
    grad.addColorStop(0, sky[0]); grad.addColorStop(1, sky[1]);
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    if (time === 'night') { g.fillStyle = '#F4F1D8'; g.beginPath(); g.arc(W * 0.82, H * 0.14, H * 0.045, 0, 7); g.fill(); }
    else { g.fillStyle = time === 'dusk' ? '#FFD38A' : '#FFF3C4'; g.beginPath(); g.arc(W * 0.8, H * 0.16, H * 0.06, 0, 7); g.fill(); }
    this._skyline(s, 0.08, H / 360 * 1.4, sky[2], H * 0.62, 0);
    this._skyline(s, 0.22, H / 360 * 2.6, sky[3], H * 0.68, 1);
    g.fillStyle = time === 'night' ? '#1F2B25' : time === 'dusk' ? '#5E6F4E' : '#8DB46A';
    g.fillRect(0, H * 0.86, W, H * 0.14);
    g.fillStyle = time === 'night' ? '#2A2F36' : '#B8B2A6';
    g.fillRect(0, H * 0.93, W, H * 0.035);
    this._trees(s);

    // ground / viaduct / tunnel
    const env = (x0, x1) => s.map.envs.filter((e) => e.to > x0 && e.from < x1);
    const x0 = this.wx(0), x1 = this.wx(W);
    for (const e of env(x0 - 40, x1 + 40)) this._structure(e, s);
    this._stationsBack(s);
    this._train(s);
    this._stationsFront(s);
    this._signs(s);
    if (s.line.weather === 'rain') this._rain(dt);
    if (time === 'night' || time === 'dusk') { g.fillStyle = time === 'night' ? 'rgba(10,14,40,.28)' : 'rgba(80,40,90,.08)'; g.fillRect(0, 0, W, H); }
    this.hud.update(s);
  }

  wx(px) { return this.s.x + (px - this.noseX) / this.k; }      // screen → world x
  sx(x) { return this.noseX + (x - this.s.x) * this.k; }       // world x → screen
  sy(h) { return this.railY - h * this.k; }                    // height above rail → screen

  _skyline(s, par, scale, col, base, layer) {
    const { g, W } = this;
    const off = s.x * par * this.k;
    const cell = 46 * scale;
    const i0 = Math.floor(off / cell) - 1, i1 = i0 + Math.ceil(W / cell) + 3;
    for (let i = i0; i < i1; i++) {
      const r = hash(i * (layer ? 3.1 : 1.7) + layer * 50);
      if (r < 0.25) continue;
      const w = cell * (0.6 + r * 0.5), h = (layer ? 70 : 90) * scale * (0.5 + hash(i + 9 + layer) * 0.9);
      const x = i * cell - off;
      const PASTEL = s.line.time === 'night' ? ['#2E3456', '#343A5E', '#2A3050'] : s.line.time === 'dusk' ? ['#A48C9C', '#9A8296', '#B09AA6'] : ['#E6DCCB', '#D6E2DE', '#E4D3DA', '#D3DCE8', '#EADFC0'];
      g.fillStyle = layer ? PASTEL[Math.floor(hash(i * 2.3) * PASTEL.length)] : col;
      g.fillRect(x, base - h, w, h + 40);
      if (layer) { g.fillStyle = 'rgba(42,26,18,.12)'; g.fillRect(x + w * 0.42, base - h, w * 0.16, h + 40); }
      if (layer) {
        // HDB corridors and windows on the nearer row
        const night = s.line.time !== 'day';
        g.fillStyle = night ? 'rgba(255,214,120,.55)' : 'rgba(255,255,255,.35)';
        for (let fy = base - h + 6 * scale; fy < base - 4; fy += 7 * scale) {
          for (let fx = x + 3 * scale; fx < x + w - 4 * scale; fx += 6 * scale) if (!night || hash(fx * 0.37 + fy) > 0.55) g.fillRect(fx, fy, 3 * scale, 2.6 * scale);
        }
        g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x, base - h, w, 4 * scale);
      }
    }
  }

  _trees(s) {
    const { g, W, H } = this;
    const par = 0.5, k = this.k * par;
    const off = s.x * k;
    const cell = 26 * k;
    const base = H * 0.9;
    const i0 = Math.floor(off / cell) - 2, i1 = i0 + Math.ceil(W / cell) + 4;
    const night = s.line.time === 'night';
    for (let i = i0; i < i1; i++) {
      const r = hash(i * 5.3);
      if (r < 0.35) continue;
      const x = i * cell - off + hash(i) * cell * 0.5;
      const h = (8 + r * 6) * k;
      g.fillStyle = night ? '#1F2B25' : '#6B4A2E';
      g.fillRect(x - 0.25 * k, base - h * 0.5, 0.5 * k, h * 0.5);
      g.fillStyle = night ? '#1E3A2A' : r > 0.7 ? '#4E9F3D' : '#3F8F5B';
      g.beginPath(); g.ellipse(x, base - h * 0.62, h * 0.55, h * 0.32, 0, 0, 7); g.fill();
    }
  }

  _structure(e, s) {
    const { g, H } = this;
    const a = Math.max(this.sx(e.from), -10), b = Math.min(this.sx(e.to), this.W + 10);
    if (b < a) return;
    const k = this.k;
    if (e.env === 'tunnel') {
      // concrete box tunnel with ring joints and lamps
      g.fillStyle = '#2E3236'; g.fillRect(a, 0, b - a, H);
      g.fillStyle = '#3A3F44'; g.fillRect(a, this.sy(6.2), b - a, 6.6 * k);
      const step = 6;
      for (let x = Math.ceil(this.wx(a) / step) * step; this.sx(x) < b; x += step) {
        const px = this.sx(x);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px, this.sy(6.2), Math.max(1, 0.15 * k), 6.6 * k);
        if (x % 24 === 0) { g.fillStyle = '#FFE7A3'; g.fillRect(px - 0.4 * k, this.sy(5.2), 0.8 * k, 0.25 * k); g.fillStyle = 'rgba(255,231,163,.12)'; g.beginPath(); g.arc(px, this.sy(5.1), 2.2 * k, 0, 7); g.fill(); }
      }
      g.fillStyle = '#4B5157'; g.fillRect(a, this.sy(2.4), b - a, 0.18 * k); // cable tray
      g.fillStyle = '#25282B'; g.fillRect(a, this.sy(0.1), b - a, H - this.sy(0.1));
      // portals where the tunnel starts and ends
      for (const px of [this.sx(e.from), this.sx(e.to)]) if (px > -40 && px < this.W + 40) {
        g.fillStyle = '#C9C1B1'; g.fillRect(px - 1.2 * k, 0, 2.4 * k, this.sy(0) + 2);
        g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(px - 1.2 * k, -2, 2.4 * k, this.sy(0) + 4);
      }
    } else if (e.env === 'viaduct') {
      g.fillStyle = '#B9B2A4';
      const step = 30;
      for (let x = Math.floor(this.wx(a) / step) * step; this.sx(x) < b + 3 * k; x += step) {
        const px = this.sx(x);
        g.fillRect(px - 1.1 * k, this.sy(-1.8), 2.2 * k, H);
        g.fillStyle = '#A39C8E'; g.fillRect(px - 1.7 * k, this.sy(-1.8), 3.4 * k, 0.6 * k); g.fillStyle = '#B9B2A4';
      }
      g.fillStyle = '#D6CFC1'; g.fillRect(a, this.sy(-0.3), b - a, 1.6 * k);
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(a, this.sy(-1.6), b - a, 0.3 * k);
      g.fillStyle = '#7F9A62'; g.fillRect(a, H - 6, b - a, 6);
    } else {
      g.fillStyle = '#7FA35A'; g.fillRect(a, this.sy(-0.2), b - a, H);
      g.fillStyle = '#6E9150'; g.fillRect(a, this.sy(-0.2), b - a, 0.5 * k);
      g.strokeStyle = 'rgba(42,26,18,.35)'; g.lineWidth = 1;
      for (let x = Math.floor(this.wx(a) / 4) * 4; this.sx(x) < b; x += 4) { const px = this.sx(x); g.beginPath(); g.moveTo(px, this.sy(1.4)); g.lineTo(px, this.sy(0)); g.stroke(); }
      g.beginPath(); g.moveTo(a, this.sy(1.3)); g.lineTo(b, this.sy(1.3)); g.stroke();
    }
    // rail and sleepers
    g.fillStyle = '#5C5850'; g.fillRect(a, this.sy(0.05), b - a, 0.35 * k);
    if (k > 5) { g.fillStyle = '#7A746A'; for (let x = Math.floor(this.wx(a) / 0.7) * 0.7; this.sx(x) < b; x += 0.7) g.fillRect(this.sx(x), this.sy(-0.05), 0.25 * k, 0.18 * k); }
    g.fillStyle = '#9EA4A8'; g.fillRect(a, this.sy(0.2), b - a, 0.14 * k);
  }

  _visibleStations(s) {
    const lo = this.wx(-60), hi = this.wx(this.W + 60);
    return s.map.marks.map((m, i) => ({ m, i })).filter(({ m }) => m + 10 > lo && m - E.PLATFORM - 10 < hi);
  }

  _stationsBack(s) {
    const { g } = this;
    const k = this.k;
    for (const { m, i } of this._visibleStations(s)) {
      const a = this.sx(m - E.PLATFORM + 4), b = this.sx(m + 4);
      // back wall with tiles and adverts
      g.fillStyle = '#EDE7DA'; g.fillRect(a - 6 * k, this.sy(6.4), b - a + 12 * k, 6.4 * k);
      g.fillStyle = s.line.color; g.fillRect(a - 6 * k, this.sy(4.6), b - a + 12 * k, 0.35 * k);
      for (let x = m - E.PLATFORM + 10; x < m; x += 18) {
        const px = this.sx(x);
        g.fillStyle = hash(x) > 0.5 ? '#F2B134' : '#2D6FD1'; g.fillRect(px, this.sy(4.1), 5 * k, 2.2 * k);
        g.fillStyle = 'rgba(255,255,255,.65)'; g.fillRect(px + 0.6 * k, this.sy(3.6), 3.4 * k, 0.35 * k); g.fillRect(px + 0.6 * k, this.sy(3.0), 2.2 * k, 0.3 * k);
      }
      // station name boards
      g.font = `800 ${Math.max(9, 0.9 * k)}px 'Bricolage Grotesque', system-ui, sans-serif`;
      g.textBaseline = 'middle';
      for (const x of [m - E.PLATFORM * 0.75, m - E.PLATFORM * 0.3]) {
        const px = this.sx(x), w = 11 * k;
        g.fillStyle = '#FFFDF7'; g.fillRect(px, this.sy(6.0), w, 1.2 * k);
        g.fillStyle = s.line.color; g.fillRect(px, this.sy(6.0), 0.9 * k, 1.2 * k);
        g.fillStyle = INK; g.fillText(s.line.stations[i], px + 1.4 * k, this.sy(5.4), w - 1.8 * k);
      }
    }
  }

  _stationsFront(s) {
    const { g } = this;
    const k = this.k;
    for (const { m, i } of this._visibleStations(s)) {
      const a = this.sx(m - E.PLATFORM + 4), b = this.sx(m + 4);
      const here = this.boarding === i && (s.phase === 'doors' || s.phase === 'depart') && s.seg === i;
      // platform screen doors, lined up with the train's doors when it stops on the mark
      const open = here ? this.doors : 0;
      for (let c = 0; c < 4; c++) for (const dd of DOORS) {
        const cx = this.sx(m - c * 24 - dd), w = 1.7 * k;
        g.fillStyle = 'rgba(190,225,235,.22)';
        g.fillRect(cx - w / 2 - 1.9 * k, this.sy(3.3), 1.9 * k, 2.2 * k);
        g.fillRect(cx + w / 2, this.sy(3.3), 1.9 * k, 2.2 * k);
        const gap = open * w * 0.5;
        g.fillStyle = 'rgba(205,235,242,.32)';
        g.fillRect(cx - w / 2 - gap, this.sy(3.3), w / 2, 2.2 * k); g.fillRect(cx + gap, this.sy(3.3), w / 2, 2.2 * k);
        g.strokeStyle = '#7D8A92'; g.lineWidth = Math.max(1, 0.08 * k);
        g.strokeRect(cx - w / 2 - gap, this.sy(3.3), w / 2, 2.2 * k); g.strokeRect(cx + gap, this.sy(3.3), w / 2, 2.2 * k);
        g.fillStyle = '#4B5560'; g.fillRect(cx - w / 2 - 1.9 * k, this.sy(3.6), w + 3.8 * k, 0.35 * k);
        g.fillStyle = s.line.color; g.fillRect(cx - w * 0.3, this.sy(3.55), w * 0.6, 0.2 * k);
      }
      // the people waiting, who board once the doors open
      for (const p of this.crowd[i] || []) {
        if (here && this.doors > 0.6) p.gone = Math.min(1, p.gone + 0.012);
        if (p.gone >= 1) continue;
        const px = this.sx(p.x), base = this.sy(H_FLOOR);
        const sway = Math.sin(this.t * 1.3 + p.ph) * 0.06 * k;
        g.globalAlpha = 1 - p.gone;
        g.fillStyle = '#3A3F44'; g.fillRect(px - 0.14 * k, base - 0.85 * k, 0.12 * k, 0.85 * k); g.fillRect(px + 0.03 * k, base - 0.85 * k, 0.12 * k, 0.85 * k);
        g.fillStyle = p.shirt; g.beginPath(); g.roundRect(px - 0.27 * k + sway, base - (p.h - 0.25) * k, 0.54 * k, (p.h - 1.05) * k, 0.15 * k); g.fill();
        g.fillStyle = p.skin; g.beginPath(); g.arc(px + sway, base - (p.h - 0.08) * k, 0.18 * k, 0, 7); g.fill();
        g.fillStyle = INK; g.beginPath(); g.arc(px + sway, base - (p.h - 0.02) * k, 0.18 * k, Math.PI, 0); g.fill();
        g.globalAlpha = 1;
      }
      // platform floor and edge
      g.fillStyle = '#D9D3C7'; g.fillRect(a - 4 * k, this.sy(H_FLOOR), b - a + 8 * k, (H_FLOOR + 0.6) * k);
      g.fillStyle = '#F2C230'; g.fillRect(a - 4 * k, this.sy(H_FLOOR), b - a + 8 * k, 0.12 * k);
      g.fillStyle = '#B9B2A4'; g.fillRect(a - 4 * k, this.sy(0.3), b - a + 8 * k, 0.9 * k);
      // the stop mark: a board and a line on the platform edge
      const mx = this.sx(m);
      g.fillStyle = '#FFFDF7'; g.fillRect(mx - 0.06 * k, this.sy(H_FLOOR), 0.12 * k, (H_FLOOR + 0.3) * k);
      g.fillStyle = '#5B6670'; g.fillRect(mx - 0.05 * k, this.sy(3.0), 0.1 * k, 1.9 * k);
      g.fillStyle = '#FFFDF7'; g.strokeStyle = INK; g.lineWidth = Math.max(1, 0.06 * k);
      g.beginPath(); g.roundRect(mx - 0.55 * k, this.sy(3.6), 1.1 * k, 0.75 * k, 0.12 * k); g.fill(); g.stroke();
      g.fillStyle = '#D7263D'; g.font = `800 ${Math.max(6, 0.42 * k)}px system-ui, sans-serif`; g.textAlign = 'center';
      g.fillText('STOP', mx, this.sy(3.22)); g.textAlign = 'left';
      // roof canopy
      g.fillStyle = '#5E6A73'; g.fillRect(a - 6 * k, this.sy(7.0), b - a + 12 * k, 0.6 * k);
      g.fillStyle = '#8C98A0'; g.fillRect(a - 6 * k, this.sy(7.25), b - a + 12 * k, 0.25 * k);
    }
  }

  _train(s) {
    const { g } = this;
    const k = this.k;
    const night = s.line.time !== 'day';
    const wob = s.wobble;
    for (let c = 3; c >= 0; c--) {
      const xf = s.x - c * 24, xr = xf - 23;
      const a = this.sx(xr), b = this.sx(xf);
      if (b < -20 || a > this.W + 20) continue;
      const top = this.sy(H_ROOF), bot = this.sy(1.0);
      // bogies
      for (const bx of [xf - 3.6, xr + 3.6]) {
        const px = this.sx(bx);
        g.fillStyle = '#3A3F44'; g.fillRect(px - 1.6 * k, this.sy(0.95), 3.2 * k, 0.45 * k);
        g.fillStyle = '#23272B';
        for (const w of [-1, 1]) { g.beginPath(); g.arc(px + w * 1.05 * k, this.sy(0.43), 0.43 * k, 0, 7); g.fill(); }
        g.fillStyle = '#8B949A'; for (const w of [-1, 1]) { g.beginPath(); g.arc(px + w * 1.05 * k, this.sy(0.43), 0.14 * k, 0, 7); g.fill(); }
      }
      // body
      g.fillStyle = '#E9EDF0'; g.strokeStyle = INK; g.lineWidth = Math.max(1.2, 0.08 * k);
      g.beginPath();
      if (c === 0) {
        g.moveTo(a, bot); g.lineTo(a, top + 0.3 * k); g.quadraticCurveTo(a, top, a + 0.3 * k, top);
        g.lineTo(b - 2.6 * k, top); g.quadraticCurveTo(b - 0.6 * k, top + 0.4 * k, b, this.sy(1.9)); g.lineTo(b, bot);
      } else {
        g.moveTo(a, bot); g.lineTo(a, top + 0.3 * k); g.quadraticCurveTo(a, top, a + 0.3 * k, top);
        g.lineTo(b - 0.3 * k, top); g.quadraticCurveTo(b, top, b, top + 0.3 * k); g.lineTo(b, bot);
      }
      g.closePath(); g.fill(); g.stroke();
      // livery stripe and the dark window band
      g.fillStyle = s.line.color; g.fillRect(a, this.sy(1.65), b - a - (c === 0 ? 0.2 * k : 0), 0.32 * k);
      g.fillStyle = night ? '#E9D9A6' : '#33414A';
      g.fillRect(a + 0.6 * k, this.sy(3.15), (b - a) - (c === 0 ? 3.0 * k : 1.2 * k), 1.0 * k);
      // standing passengers sway when the driving is rough
      for (let p = 0; p < 9; p++) {
        const px = a + (1.8 + p * 2.25) * k;
        if (px > b - (c === 0 ? 3.2 : 1) * k) continue;
        const lean = Math.sin(this.t * 6 + p + c) * wob * 0.35 * k + (s.a || 0) * -0.12 * k;
        g.fillStyle = night ? 'rgba(60,45,30,.5)' : 'rgba(10,16,20,.55)';
        g.beginPath(); g.arc(px + lean, this.sy(2.75), 0.22 * k, 0, 7); g.fill();
        g.fillRect(px - 0.25 * k + lean, this.sy(2.55), 0.5 * k, 0.4 * k);
      }
      // doors
      const open = this.boarding === s.seg && s.phase === 'doors' ? this.doors : 0;
      for (const dd of DOORS) {
        const cx = this.sx(xf - dd), w = 1.35 * k, gap = open * w * 0.5;
        g.fillStyle = '#D7DCE0'; g.strokeStyle = '#6E7A82'; g.lineWidth = Math.max(1, 0.06 * k);
        if (gap > 0.5) { g.fillStyle = night ? '#F3E6BE' : '#56626B'; g.fillRect(cx - gap, this.sy(3.2), gap * 2, 2.05 * k); g.fillStyle = '#D7DCE0'; }
        g.fillRect(cx - w / 2 - gap, this.sy(3.2), w / 2, 2.05 * k); g.strokeRect(cx - w / 2 - gap, this.sy(3.2), w / 2, 2.05 * k);
        g.fillRect(cx + gap, this.sy(3.2), w / 2, 2.05 * k); g.strokeRect(cx + gap, this.sy(3.2), w / 2, 2.05 * k);
        g.fillStyle = night ? '#E9D9A6' : '#33414A';
        g.fillRect(cx - w / 2 - gap + 0.12 * k, this.sy(3.05), w / 2 - 0.24 * k, 0.7 * k); g.fillRect(cx + gap + 0.12 * k, this.sy(3.05), w / 2 - 0.24 * k, 0.7 * k);
      }
      // under-frame skirt
      g.fillStyle = '#4B5157'; g.fillRect(a + 0.4 * k, this.sy(1.0), b - a - 0.8 * k, 0.28 * k);
      if (c === 0) {
        // windscreen, destination display and headlights
        g.fillStyle = '#26323A'; g.beginPath(); g.moveTo(b - 2.4 * k, this.sy(3.6)); g.quadraticCurveTo(b - 0.9 * k, this.sy(3.5), b - 0.35 * k, this.sy(2.4)); g.lineTo(b - 2.4 * k, this.sy(2.4)); g.closePath(); g.fill();
        g.fillStyle = '#F7B733'; g.fillRect(b - 2.3 * k, this.sy(3.75), 1.2 * k, 0.2 * k);
        g.fillStyle = '#FFF6C9'; g.beginPath(); g.arc(b - 0.25 * k, this.sy(1.45), 0.16 * k, 0, 7); g.fill();
        if (night) {
          const beam = g.createLinearGradient(b, 0, b + 30 * k, 0);
          beam.addColorStop(0, 'rgba(255,246,201,.45)'); beam.addColorStop(1, 'rgba(255,246,201,0)');
          g.fillStyle = beam; g.beginPath(); g.moveTo(b, this.sy(1.6)); g.lineTo(b + 30 * k, this.sy(3.2)); g.lineTo(b + 30 * k, this.sy(-0.2)); g.lineTo(b, this.sy(1.2)); g.fill();
        }
      }
    }
  }

  _signs(s) {
    const { g } = this;
    const k = this.k;
    const lo = this.wx(-40), hi = this.wx(this.W + 40);
    const post = (x, h) => { const px = this.sx(x); g.fillStyle = '#5B6670'; g.fillRect(px - 0.06 * k, this.sy(h), 0.12 * k, h * k); return px; };
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const z of s.map.zones) {
      // advance warning, the limit itself, and the end of it once the whole train is clear
      if (z.from - 140 > lo && z.from - 140 < hi) {
        const px = post(z.from - 140, 2.6);
        g.fillStyle = '#F2C230'; g.strokeStyle = INK; g.lineWidth = Math.max(1, 0.07 * k);
        g.beginPath(); g.moveTo(px, this.sy(3.5)); g.lineTo(px + 0.6 * k, this.sy(2.9)); g.lineTo(px, this.sy(2.3)); g.lineTo(px - 0.6 * k, this.sy(2.9)); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = INK; g.font = `800 ${Math.max(6, 0.42 * k)}px system-ui, sans-serif`; g.fillText(z.kmh, px, this.sy(2.9));
      }
      if (z.from > lo && z.from < hi) {
        const px = post(z.from, 2.6);
        g.fillStyle = '#fff'; g.strokeStyle = '#D7263D'; g.lineWidth = Math.max(1.5, 0.14 * k);
        g.beginPath(); g.arc(px, this.sy(3.0), 0.6 * k, 0, 7); g.fill(); g.stroke();
        g.fillStyle = INK; g.font = `800 ${Math.max(6, 0.48 * k)}px system-ui, sans-serif`; g.fillText(z.kmh, px, this.sy(3.0));
      }
      const end = z.to + E.TRAIN_LEN;
      if (end > lo && end < hi) {
        const px = post(end, 2.6);
        g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = Math.max(1, 0.07 * k);
        g.beginPath(); g.arc(px, this.sy(3.0), 0.55 * k, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(px - 0.38 * k, this.sy(2.62)); g.lineTo(px + 0.38 * k, this.sy(3.38)); g.stroke();
      }
    }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  }

  _rain(dt) {
    const { g, W, H } = this;
    while (this.rain.length < 90) this.rain.push({ x: Math.random() * W * 1.2, y: Math.random() * H, l: 8 + Math.random() * 10 });
    g.strokeStyle = 'rgba(200,215,235,.45)'; g.lineWidth = 1;
    g.beginPath();
    const vx = -(3 + this.s.v * 0.6) * 18;
    for (const r of this.rain) {
      r.y += 520 * dt; r.x += vx * dt;
      if (r.y > H) { r.y = -10; r.x = Math.random() * W * 1.2; }
      if (r.x < -20) r.x = W + Math.random() * 40;
      g.moveTo(r.x, r.y); g.lineTo(r.x - r.l * 0.35, r.y + r.l);
    }
    g.stroke();
  }
}
