// Kiasu Quiz — 2D (SVG) studio. Same adapter API as board3d.js:
//   sync(s) · react(type, s, data) · say(text, mood) · setMode(mode) · onPick(i) · onBuzz(p)
import * as E from './engine.js';
import { studioSVG, hostSVG, questionSVG, tileSVG, podiumSVG, SCREEN, TILE, tileXY, fit, FONT, INK, esc } from './art.js';

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
    this.svg.setAttribute('aria-label', 'Kiasu Quiz studio');
    this.wrap.appendChild(this.svg);
    const { x, y, w, h } = SCREEN;
    this.svg.innerHTML = `
      ${studioSVG()}
      <g class="q"></g>
      <rect class="tbar-bg" x="${x + 26}" y="${y + h - 22}" width="${w - 52}" height="9" rx="4.5" fill="#24425C"/>
      <rect class="tbar" x="${x + 26}" y="${y + h - 22}" width="${w - 52}" height="9" rx="4.5" fill="#2F9E5B"/>
      <g class="tiles"></g>
      <g class="podiums"></g>
      <g class="host-wrap" transform="translate(86 392)">${hostSVG('happy')}</g>
      <g class="bubble" transform="translate(88 270)" opacity="0"></g>
      <g class="fx"></g>`;
    this.$q = this.svg.querySelector('.q');
    this.$tiles = this.svg.querySelector('.tiles');
    this.$pods = this.svg.querySelector('.podiums');
    this.$bar = this.svg.querySelector('.tbar');
    this.$host = this.svg.querySelector('.host-wrap');
    this.$bubble = this.svg.querySelector('.bubble');
    this.$fx = this.svg.querySelector('.fx');
    this.barW = w - 52;
    this.onPick = null;
    this.onBuzz = null;
    this.svg.addEventListener('pointerdown', (e) => {
      const tile = e.target.closest && e.target.closest('.tile');
      if (tile && this.onPick) { e.preventDefault(); this.onPick(+tile.dataset.i); return; }
      const pod = e.target.closest && e.target.closest('.podium');
      if (pod && this.onBuzz) { e.preventDefault(); this.onBuzz(+pod.dataset.p); }
    });
    this.keys = {};
  }

  /** Title card on the board before a game starts. */
  _title() {
    const { x, y, w } = SCREEN;
    return `<text x="${x + w / 2}" y="${y + 104}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="74" letter-spacing="-1" fill="#FFE59A" class="neon">KIASU QUIZ</text>
      <text x="${x + w / 2}" y="${y + 152}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="22" letter-spacing="4" fill="#9FD3E0">THE SINGAPORE TRIVIA SHOW</text>`;
  }

  sync(s) {
    if (!s) return;
    const idle = s.phase === 'idle';
    const q = idle ? null : E.question(s);
    // question board
    const qKey = idle ? 'title' : `${s.qi}|${q.id}|${s.phase === 'intro' ? 'intro' : 'q'}`;
    if (qKey !== this.keys.q) {
      this.keys.q = qKey;
      this.$q.innerHTML = idle || s.phase === 'intro' ? this._title() : questionSVG(q, s.qi + 1, E.total(s));
      if (!idle && s.phase !== 'intro') { this.$q.classList.remove('flip'); void this.$q.getBBox(); this.$q.classList.add('flip'); }
    }
    // tiles
    const reveal = s.phase === 'reveal' || s.phase === 'over';
    const states = idle || s.phase === 'intro' ? [] : [0, 1, 2, 3].map((i) => {
      if (reveal && i === q.right) return 'right';
      if (reveal && s.picked === i && i !== q.right) return 'wrong';
      if (s.hidden.has(i)) return 'hidden';
      if (s.tried && s.tried.has(i)) return 'tried';
      return '';
    });
    const tKey = idle || s.phase === 'intro' ? 'none' : `${s.qi}|${q.id}|${states.join(',')}|${s.poll ? s.poll.join(',') : ''}`;
    if (tKey !== this.keys.t) {
      this.keys.t = tKey;
      this.$tiles.innerHTML = tKey === 'none'
        ? [0, 1, 2, 3].map((i) => { const { x, y } = tileXY(i); return `<rect x="${x}" y="${y}" width="${TILE.w}" height="${TILE.h}" rx="20" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.25)" stroke-width="3" stroke-dasharray="8 8"/>`; }).join('')
        : q.opts.map((o, i) => tileSVG(i, o, states[i], s.poll ? s.poll[i] : null)).join('');
    }
    // timer bar
    let frac = 0, col = '#2F9E5B';
    if (s.phase === 'ask') { frac = s.timeLeft / (s.mode === 'solo' ? E.SOLO_TIME : E.BUZZ_OPEN); col = s.timeLeft <= 5 ? '#D7263D' : frac < 0.5 ? '#F2B134' : '#2F9E5B'; }
    else if (s.phase === 'answering') { frac = s.answerLeft / E.BUZZ_ANSWER; col = s.players[s.buzzer].color; }
    this.$bar.setAttribute('width', String(Math.max(0, this.barW * frac)));
    this.$bar.setAttribute('fill', col);
    // podiums
    const n = s.players.length;
    const pKey = s.players.map((p, i) => `${p.name}:${p.score}:${s.buzzer === i && s.phase === 'answering' ? 'b' : s.locked && s.locked.has(i) && !reveal ? 'l' : ''}`).join('|');
    if (pKey !== this.keys.p) {
      this.keys.p = pKey;
      const span = 796, gap = 16, w = Math.min(200, (span - gap * (n - 1)) / n);
      const x0 = 178 + (span - (w * n + gap * (n - 1))) / 2;
      this.$pods.innerHTML = s.players.map((p, i) => podiumSVG({ ...p, idx: i }, x0 + i * (w + gap), w,
        s.buzzer === i && s.phase === 'answering' ? 'buzzed' : s.locked && s.locked.has(i) && !reveal ? 'locked' : '')).join('');
    }
  }

  say(text, mood = 'happy') {
    this.$host.innerHTML = hostSVG(mood);
    if (!text) { this.$bubble.setAttribute('opacity', '0'); return; }
    const f = fit(text, 150, 3, 19, 14);
    const lh = f.size * 1.15;
    const h = f.lines.length * lh + 22;
    this.$bubble.innerHTML = `<rect x="-80" y="${-h}" width="160" height="${h}" rx="14" fill="#FFFCF5" stroke="${INK}" stroke-width="3"/>
      <path d="M-10 -2 l8 16 l10 -16z" fill="#FFFCF5" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><rect x="-14" y="-6" width="28" height="6" fill="#FFFCF5"/>
      ${f.lines.map((l, i) => `<text y="${-h + 16 + f.size * 0.85 + i * lh}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${f.size}" fill="${INK}">${esc(l)}</text>`).join('')}`;
    this.$bubble.setAttribute('opacity', '1');
    this.$bubble.classList.remove('pop'); void this.$bubble.getBBox(); this.$bubble.classList.add('pop');
  }

  react(type, s, data = {}) {
    if (type === 'right' || type === 'wrong') {
      const i = data.choice;
      if (i == null) return;
      const { x, y } = tileXY(i);
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('transform', `translate(${x + TILE.w / 2} ${y + TILE.h / 2})`);
      if (type === 'right') {
        g.innerHTML = Array.from({ length: 14 }, (_, k) => { const a = (k / 14) * Math.PI * 2; return `<circle class="spark" cx="${Math.cos(a) * 60}" cy="${Math.sin(a) * 30}" r="7" fill="${['#FFE59A', '#2F9E5B', '#fff'][k % 3]}"/>`; }).join('');
        if (data.points) g.innerHTML += `<text class="floater good" y="-40" text-anchor="middle">+${data.points}</text>`;
      } else if (data.points) g.innerHTML = `<text class="floater bad" y="-40" text-anchor="middle">${data.points}</text>`;
      this.$fx.appendChild(g);
      setTimeout(() => g.remove(), 1100);
      const tile = this.$tiles.querySelector(`.tile[data-i="${i}"]`);
      if (tile && type === 'wrong') { tile.classList.remove('shake'); void tile.getBBox(); tile.classList.add('shake'); }
    } else if (type === 'buzz') {
      const pod = this.$pods.querySelector(`.podium[data-p="${data.p}"]`);
      if (pod) { pod.classList.remove('jolt'); void pod.getBBox(); pod.classList.add('jolt'); }
    }
  }

  setMode(mode) { this.stage.dataset.mode = mode; }
}
