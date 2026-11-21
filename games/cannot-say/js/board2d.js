// Cannot Say! — 2D (SVG) game-show studio. Same adapter API as board3d.js:
//   load(s) · sync(s) · reveal(s) · react(result, s) · timeUp(s) · setMode(mode)
import * as E from './engine.js';
import { studioSVG, timerSVG, cardFrontSVG, cardBackSVG, TIMER_R, esc } from './art.js';

const NS = 'http://www.w3.org/2000/svg';
const FONT = "'Bricolage Grotesque', 'Segoe UI', system-ui, sans-serif";
const STAMP = {
  got: { text: 'SHIOK!', fill: '#2F9E5B', cls: 'fly-got' },
  skip: { text: 'SKIP', fill: '#7A6A86', cls: 'fly-skip' },
  buzz: { text: 'BZZT!', fill: '#D7263D', cls: 'fly-buzz' },
};

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
    this.svg.setAttribute('aria-label', 'Cannot Say! studio');
    this.wrap.appendChild(this.svg);
    this.svg.innerHTML = `
      ${studioSVG()}
      <g transform="translate(150 330)">${timerSVG()}</g>
      <g class="board-round" transform="translate(850 140)"></g>
      <g class="scoreboard" transform="translate(850 330)"></g>
      <g class="deck" transform="translate(500 350) rotate(-2)">
        ${[3, 2, 1].map((k) => `<rect x="${-180 + k * 5}" y="${-220 + k * 6}" width="360" height="440" rx="24" fill="#FFFCF5" stroke="#20142E" stroke-width="4" opacity="${0.5 + k * 0.1}"/>`).join('')}
      </g>
      <g class="card-slot" transform="translate(500 350) rotate(-2)"><g class="card"></g></g>
      <g class="fx"></g>`;
    this.$card = this.svg.querySelector('.card');
    this.$fx = this.svg.querySelector('.fx');
    this.$arc = this.svg.querySelector('.timer-arc');
    this.$num = this.svg.querySelector('.timer-num');
    this.$timer = this.svg.querySelector('.timer');
    this.$score = this.svg.querySelector('.scoreboard');
    this.$round = this.svg.querySelector('.board-round');
    this.cardId = null;
    this.face = 'back';
    this.showBack();
  }

  showBack() { this.$card.innerHTML = cardBackSVG(); this.face = 'back'; this.cardId = null; }
  showFront(card) { this.$card.innerHTML = cardFrontSVG(card); this.face = 'front'; this.cardId = card.id; }

  load(s) { this.showBack(); this.sync(s); }

  sync(s) {
    if (!s) return;
    // timer
    const C = 2 * Math.PI * TIMER_R;
    const frac = s.timeLeft / s.seconds;
    this.$arc.setAttribute('stroke-dashoffset', String(C * (1 - frac)));
    this.$arc.setAttribute('stroke', s.timeLeft <= 10 ? '#D7263D' : frac < 0.5 ? '#F2B134' : '#2F9E5B');
    const secs = Math.ceil(s.timeLeft);
    if (this.$num.textContent !== String(secs)) this.$num.textContent = String(secs);
    this.$timer.classList.toggle('hurry', s.phase === 'play' && s.timeLeft <= 10);
    // scoreboard
    const key = s.teams.map((t) => `${t.name}:${t.score}`).join('|') + `|${s.turn}|${s.phase}|${s.round}`;
    if (key !== this.scoreKey) {
      this.scoreKey = key;
      const n = s.teams.length, h = 66, gap = 12, top = -((n * h + (n - 1) * gap) / 2);
      this.$score.innerHTML = s.teams.map((t, i) => {
        const on = i === s.turn && s.phase !== 'over';
        return `<g transform="translate(0 ${top + i * (h + gap) + h / 2})" class="${on ? 'team-on' : ''}"><g class="row-in">
          <rect x="-126" y="${-h / 2}" width="252" height="${h}" rx="14" fill="${on ? t.color : '#FFFCF5'}" stroke="#20142E" stroke-width="4"/>
          <rect x="-126" y="${-h / 2}" width="16" height="${h}" rx="6" fill="${t.color}"/>
          <text x="-100" y="8" font-family="${FONT}" font-weight="800" font-size="${t.name.length > 13 ? 18 : 22}" fill="${on ? '#fff' : '#20142E'}">${esc(t.name)}</text>
          <rect x="54" y="-22" width="60" height="44" rx="12" fill="${on ? '#fff' : '#20142E'}"/>
          <text x="84" y="11" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="30" fill="${on ? t.color : '#fff'}">${t.score}</text>
        </g></g>`;
      }).join('');
      this.$round.innerHTML = s.phase === 'over' ? '' : `<rect x="-90" y="-20" width="180" height="40" rx="20" fill="#120B24" stroke="#FFD877" stroke-width="2.5"/>
        <text y="7" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="18" letter-spacing="2" fill="#FFD877">ROUND ${Math.min(s.round + 1, s.rounds)} / ${s.rounds}</text>`;
    }
    // card face
    if (s.phase === 'play' && s.card && s.card.id !== this.cardId && !this.busy && this.stage.dataset.mode !== 'paused') this.showFront(s.card);
    if (s.phase !== 'play' && s.phase !== 'review' && this.face === 'front') this.showBack();
  }

  /** Flip the face-down card to start a turn. */
  async reveal(s) {
    this.busy = true;
    const g = this.$card;
    g.classList.remove('flip-in'); void g.getBBox();
    g.classList.add('flip-out');
    await new Promise((r) => setTimeout(r, 180));
    this.showFront(s.card);
    g.classList.remove('flip-out'); void g.getBBox();
    g.classList.add('flip-in');
    this.busy = false;
  }

  /** The describer marked the card: fling the old one away with a stamp, deal the next. */
  react(result, s) {
    const st = STAMP[result];
    if (!st) return;
    const old = this.$card.cloneNode(true);
    old.classList.remove('flip-in', 'deal');
    old.insertAdjacentHTML('beforeend', `<g class="stamp" transform="rotate(-14) translate(0 -40)"><rect x="-120" y="-42" width="240" height="84" rx="14" fill="none" stroke="${st.fill}" stroke-width="9"/><text y="22" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="62" letter-spacing="3" fill="${st.fill}">${st.text}</text></g>`);
    const fly = document.createElementNS(NS, 'g');
    fly.setAttribute('transform', 'translate(500 350) rotate(-2)');
    const inner = document.createElementNS(NS, 'g');
    inner.setAttribute('class', `flyer ${st.cls}`);
    inner.appendChild(old);
    fly.appendChild(inner);
    this.$fx.appendChild(fly);
    setTimeout(() => fly.remove(), 900);
    if (s.card) {
      this.showFront(s.card);
      this.$card.classList.remove('deal'); void this.$card.getBBox(); this.$card.classList.add('deal');
    }
    if (result === 'got') this.bump(s.turn);
  }

  bump(i) {
    const g = this.$score.children[i] && this.$score.children[i].firstElementChild;
    if (!g) return;
    g.classList.remove('bump'); void g.getBBox(); g.classList.add('bump');
  }

  timeUp() {
    this.$timer.classList.remove('ring'); void this.$timer.getBBox(); this.$timer.classList.add('ring');
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', 500); t.setAttribute('y', 340);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', 'times-up');
    t.textContent = "TIME'S UP!";
    this.$fx.appendChild(t);
    setTimeout(() => t.remove(), 1600);
  }

  setMode(mode) { this.stage.dataset.mode = mode; }
}
