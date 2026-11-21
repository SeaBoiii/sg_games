// Marina Mini Golf — screen flow shared by the 2D and 3D builds.
import * as E from './engine.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';
import { confetti } from '../../../assets/lib/fx.js';

const BEST_KEY = 'golf.best';
const PREF_KEY = 'golf.setup';
const BRAND = '#1E9E62';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const PC = E.PLAYER_COLORS;
const DRAG_FULL = 24; // world units of pull-back for full power

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3.5h6.5a4 4 0 0 1 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 5.5l2 2 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7a7 7 0 1 1-1 8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M7 2.5V7h4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 7a7 7 0 1 0 1 8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M17 2.5V7h-4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M7 3.5l11 3.5-11 4z" fill="currentColor"/><ellipse cx="9" cy="20.5" rx="6" ry="1.6" fill="currentColor" opacity=".35"/></svg>',
};

const RULES_HTML = `
  <h2>How to play</h2>
  <p>Nine holes of mini golf around Singapore. Sink the ball in as few putts as you can.</p>
  <ol class="rules-steps">
    <li><b>Aim and putt.</b> Drag back from anywhere on the course, like a catapult. The arrow shows direction and power. Let go to putt. Or tap the course to aim, then use the buttons.</li>
    <li><b>Mind the hazards.</b> Water costs a penalty stroke and puts you back where you putted from. Sand slows you down. Arrows push the ball downhill. Domes are bouncy.</li>
    <li><b>Watch the moving parts.</b> The MRT train and the Flyer wheel keep moving while you aim, so time your putt.</li>
    <li><b>Too fast and it lips out.</b> The ball has to arrive at the cup gently to drop in.</li>
  </ol>
  <p>Each hole has a par. If you reach par + 4 you pick up and take that score. Fewest strokes wins.</p>
  <p><b>2–4 players:</b> pass the phone. Everyone plays the hole in turn, and the best score on the last hole tees off first.</p>
  <p class="hint">Keyboard: ←/→ aim (Shift: faster) · ↑/↓ power · Space or Enter to putt.</p>`;

export function startFlow({ root, createBoard, hubHref, altHref, altLabel }) {
  let s = null;
  let aim = { angle: 0, power: 0.4 };
  let drag = null;
  let busy = false;
  let pending = null;

  root.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="${hubHref}" aria-label="Back to SG Games">${ICON.back}</a>
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>Marina<b>Golf</b></span></div>
      <div class="status" id="status" aria-live="polite"></div>
      <div class="bar-actions">
        <button class="icon-btn" id="btn-rules" aria-label="How to play">${ICON.help}</button>
        <button class="icon-btn" id="btn-sound" aria-label="Toggle sound"></button>
        <button class="icon-btn" id="btn-menu" aria-label="Menu" aria-haspopup="true">${ICON.menu}</button>
      </div>
      <div class="menu" id="menu" hidden>
        <button data-act="rules">How to play</button>
        <button data-act="card">Scorecard</button>
        <button data-act="new">Quit to course select</button>
        ${altHref ? `<a href="${altHref}">${altLabel}</a>` : ''}
        <a href="${hubHref}">All SG Games</a>
      </div>
    </header>
    <main class="stage" id="stage"></main>
    <section class="panel" id="panel" aria-live="polite"></section>
    <dialog class="sheet" id="rules"><div class="sheet-body">${RULES_HTML}</div><form method="dialog"><button class="btn btn-primary wide">Got it</button></form></dialog>
    <dialog class="sheet" id="card"><div class="sheet-body" id="card-body"></div><form method="dialog"><button class="btn btn-primary wide">Close</button></form></dialog>`;

  const $ = (q) => root.querySelector(q);
  const panel = $('#panel');
  const statusEl = $('#status');
  const board = createBoard($('#stage'));

  const soundBtn = $('#btn-sound');
  const paintSound = () => { soundBtn.innerHTML = sfx.muted ? ICON.mute : ICON.sound; soundBtn.setAttribute('aria-pressed', String(!sfx.muted)); };
  paintSound();
  soundBtn.onclick = () => { sfx.setMuted(!sfx.muted); paintSound(); sfx.tap(); };
  const showRules = () => { sfx.tap(); $('#rules').showModal(); };
  $('#btn-rules').onclick = showRules;
  const menu = $('#menu');
  $('#btn-menu').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; sfx.tap(); };
  document.addEventListener('click', () => { menu.hidden = true; });
  menu.querySelector('[data-act="rules"]').onclick = showRules;
  menu.querySelector('[data-act="new"]').onclick = () => goSetup();
  menu.querySelector('[data-act="card"]').onclick = () => {
    if (!s) return;
    $('#card-body').innerHTML = `<h2>Scorecard</h2>${scorecard()}`;
    $('#card').showModal();
  };
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

  // ---------------- input: drag back to putt ----------------
  const surface = board.surface;
  const canAim = () => s && s.phase === 'aim' && !busy && !$('#rules').open && !$('#card').open;
  surface.addEventListener('pointerdown', (e) => {
    if (!canAim() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const p = board.toWorld(e.clientX, e.clientY);
    if (!p) return;
    drag = { id: e.pointerId, start: p, cur: p, moved: false, keep: { ...aim } };
    try { surface.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  });
  surface.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = board.toWorld(e.clientX, e.clientY);
    if (!p) return;
    drag.cur = p;
    const vx = drag.start.x - p.x, vy = drag.start.y - p.y, d = Math.hypot(vx, vy);
    if (d > 0.9) {
      drag.moved = true;
      aim.angle = Math.atan2(vy, vx);
      aim.power = Math.min(1, d / DRAG_FULL);
      paintMeter();
    }
  });
  const endDrag = (e, cancel = false) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag;
    drag = null;
    if (cancel) { aim = d.keep; paintMeter(); return; }
    if (!d.moved) {
      // a tap: aim at that spot, keep the power
      const b = s.ball;
      aim.angle = Math.atan2(d.start.y - b.y, d.start.x - b.x);
      paintMeter();
      sfx.tick();
      return;
    }
    if (aim.power < 0.05) { aim = d.keep; paintMeter(); return; }
    putt();
  };
  surface.addEventListener('pointerup', (e) => endDrag(e));
  surface.addEventListener('pointercancel', (e) => endDrag(e, true));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drag) { endDrag(null, true); return; }
    if (!canAim()) return;
    if (e.target.matches && e.target.matches('input')) return;
    const fast = e.shiftKey;
    if (e.key === 'ArrowLeft') { aim.angle -= fast ? 0.09 : 0.02; paintMeter(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { aim.angle += fast ? 0.09 : 0.02; paintMeter(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { aim.power = Math.min(1, aim.power + (fast ? 0.1 : 0.02)); paintMeter(); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { aim.power = Math.max(0.05, aim.power - (fast ? 0.1 : 0.02)); paintMeter(); e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Enter') { if (e.target.closest && e.target.closest('button') && e.key === 'Enter') return; putt(); e.preventDefault(); }
  });

  // ---------------- main loop ----------------
  let lastT = performance.now();
  let lastHitSound = 0;
  const loop = (now) => {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (s && s.phase !== 'over') {
      const evs = E.tick(s, dt);
      for (const ev of evs) handle(ev, now);
      board.frame(s, s.phase === 'aim' && (!busy || drag) ? aim : null);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  function handle(ev, now) {
    if (ev.type === 'hit') {
      if (now - lastHitSound > 70 && ev.speed > 5) { lastHitSound = now; sfx.tick(); if (ev.speed > 30) buzz(8); }
    } else if (ev.type === 'bump') { sfx.plop(); buzz(15); board.react(ev, s); }
    else if (ev.type === 'sand') { sfx.whoosh(false); board.react(ev, s); }
    else if (ev.type === 'lip') { sfx.needle(); board.react(ev, s); }
    else if (ev.type === 'water') { sfx.sweep(); buzz([20, 40, 20]); board.react(ev, s); paintPlay(); }
    else if (ev.type === 'rest') { aimAtCup(); paintPlay(); }
    else if (ev.type === 'sink') { board.react(ev, s); holed(); }
    else if (ev.type === 'capped') { setTimeout(() => result(), 500); }
  }

  // ---------------- status + helpers ----------------
  function paintStatus() {
    if (!s) { statusEl.innerHTML = ''; return; }
    const h = E.holeOf(s), p = E.turnOf(s);
    const d = E.toPar(s, p);
    statusEl.innerHTML = `
      <span class="line-chip" style="--line:${BRAND}">Hole ${s.holeIdx + 1}/${s.holeCount}</span>
      <span class="station"><b>${esc(h.name)}</b><small>Par ${h.par}${s.players > 1 ? ` · ${esc(s.names[p])}` : ''}</small></span>
      <span class="score-pill" title="To par" style="background:${s.players > 1 ? PC[p] : 'var(--ink)'}">${E.fmtPar(d)}</span>`;
  }
  function setPanel(html, cls = '', color = BRAND) {
    panel.className = `panel ${cls}`;
    panel.style.setProperty('--team', color);
    panel.innerHTML = `<div class="panel-inner">${html}</div>`;
    const first = panel.querySelector('[autofocus]');
    if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }
  const on = (q, fn) => { const b = panel.querySelector(q); if (b) b.onclick = (e) => { sfx.tap(); fn(e); }; };
  const dot = (p) => `<i class="pdot" style="--c:${PC[p]}"></i>`;
  function aimAtCup() {
    const h = E.holeOf(s), b = s.ball;
    aim.angle = Math.atan2(h.cup[1] - b.y, h.cup[0] - b.x);
  }

  function scorecard(highlight = -1) {
    const n = s.holeCount;
    const holes = E.HOLES.slice(0, n);
    return `<div class="card-wrap"><table class="scard">
      <thead><tr><th></th>${holes.map((h, i) => `<th class="${i === highlight ? 'hl' : ''}">${i + 1}</th>`).join('')}<th>Tot</th><th>±</th></tr>
      <tr class="par"><th>Par</th>${holes.map((h, i) => `<td class="${i === highlight ? 'hl' : ''}">${h.par}</td>`).join('')}<td>${E.parThrough(s, n)}</td><td></td></tr></thead>
      <tbody>${E.standings(s).map((p) => `<tr><th>${dot(p)}${esc(s.names[p])}</th>${holes.map((h, i) => {
        const v = s.scores[p][i];
        const cls = v == null ? '' : v === 1 ? 'ace' : v < h.par ? 'under' : v > h.par ? 'over' : '';
        return `<td class="${cls} ${i === highlight ? 'hl' : ''}">${v ?? ''}</td>`;
      }).join('')}<td class="tot">${E.total(s, p) || ''}</td><td class="tot">${E.holesPlayed(s, p) ? E.fmtPar(E.toPar(s, p)) : ''}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  // ---------------- setup ----------------
  function goSetup() {
    s = null;
    busy = false;
    paintStatus();
    const pref = read(PREF_KEY) || {};
    let players = [1, 2, 3, 4].includes(pref.players) ? pref.players : 1;
    let course = [3, 6, 9].includes(pref.course) ? pref.course : 3;
    const names = pref.names || ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
    const best = read(BEST_KEY) || {};
    const demo = E.newGame({ holes: 9 });
    demo.holeIdx = 1;
    E.beginTurn(demo);
    demo.ball = { x: 30, y: 31, vx: 0, vy: 0 };
    if (board.setBallColor) board.setBallColor(PC[0]);
    board.load(demo);
    board.frame(demo, { angle: 0.05, power: 0.55 });
    if (board.setMode) board.setMode('idle');
    setPanel(`
      <p class="kicker">Nine holes around the island</p>
      <h1 class="title">Marina <span>Mini Golf</span></h1>
      <p class="sub">Putt past the Merlion, under the SkyPark and through the Flyer. Fewest strokes wins.</p>
      <p class="rotate-hint">${ICON.phone}<span><b>Best in landscape.</b> Turn your phone sideways for the whole hole.</span></p>
      <fieldset class="seg" aria-label="Players"><legend>Players</legend>
        ${[1, 2, 3, 4].map((n) => `<label><input type="radio" name="np" value="${n}" ${n === players ? 'checked' : ''}/><span>${n === 1 ? 'Solo' : n}</span></label>`).join('')}
      </fieldset>
      <div class="names four" data-n="${players}">
        ${[0, 1, 2, 3].map((i) => `<label class="field" style="--team:${PC[i]}" ${i < players && players > 1 ? '' : 'hidden'}><span>Player ${i + 1}</span><input id="n${i}" maxlength="12" value="${esc(names[i] || `Player ${i + 1}`)}"/></label>`).join('')}
      </div>
      <div class="lines" role="radiogroup" aria-label="Choose a course">
        ${E.COURSES.map((c) => {
          const b = best[c.id];
          return `<button type="button" role="radio" class="line-card" data-c="${c.id}" aria-checked="${c.id === course}" style="--line:${BRAND}">
            <span class="dot"></span><span class="meta"><b>${c.name} · ${c.holes} holes</b><small>Par ${E.parThrough(null, c.holes)} · ${c.blurb}</small></span>
            <span class="best">${b ? `<small>Best</small><b>${b.strokes}</b><small>${E.fmtPar(b.toPar)}</small>` : ''}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="row">
        <button type="button" class="btn btn-ghost" id="how">How to play</button>
        <button class="btn btn-primary grow" id="start" autofocus>${ICON.flag} Tee off</button>
      </div>`, 'setup');
    panel.querySelectorAll('input[name="np"]').forEach((r) => {
      r.onchange = () => {
        sfx.tap(); players = +r.value;
        panel.querySelectorAll('.names .field').forEach((f, i) => { f.hidden = !(i < players && players > 1); });
        panel.querySelector('.names').dataset.n = players;
      };
    });
    panel.querySelectorAll('.line-card').forEach((b) => {
      b.onclick = () => { sfx.tap(); course = +b.dataset.c; panel.querySelectorAll('.line-card').forEach((x) => x.setAttribute('aria-checked', String(x === b))); };
    });
    on('#how', showRules);
    on('#start', () => {
      const nm = [0, 1, 2, 3].map((i) => panel.querySelector(`#n${i}`).value);
      write(PREF_KEY, { players, course, names: nm });
      start(players, players > 1 ? nm.slice(0, players) : ['You'], course);
    });
  }

  // ---------------- play ----------------
  function start(players, names, holes) {
    s = E.newGame({ players, names, holes });
    s.course = holes;
    if (board.setMode) board.setMode('play');
    paintReady();
  }

  function paintReady() {
    const h = E.holeOf(s), p = E.turnOf(s);
    if (board.setBallColor) board.setBallColor(PC[p]);
    board.load(s);
    paintStatus();
    const multi = s.players > 1;
    const firstOnHole = s.orderIdx === 0;
    setPanel(`
      <p class="kicker">Hole ${s.holeIdx + 1} of ${s.holeCount} · Par ${h.par}</p>
      <h2>${esc(h.name)}</h2>
      <p class="place">${esc(h.place)}</p>
      ${firstOnHole ? `<p class="sub">${esc(h.blurb)}</p>` : ''}
      ${multi ? `<p class="pass">${dot(p)}<span>${firstOnHole && s.holeIdx > 0 ? 'Honours to' : 'Pass the phone to'} <b>${esc(s.names[p])}</b></span></p>` : ''}
      ${s.holeIdx > 0 || s.orderIdx > 0 ? `<div class="mini-stand">${E.standings(s).map((q) => `<span>${dot(q)}${esc(s.names[q])} <b>${E.holesPlayed(s, q) ? E.fmtPar(E.toPar(s, q)) : '–'}</b></span>`).join('')}</div>` : ''}
      <button class="btn btn-primary wide big" id="go" autofocus>${ICON.flag} ${multi ? `${esc(s.names[p])}, tee off` : 'Tee off'}</button>`, 'ready', multi ? PC[p] : BRAND);
    on('#go', () => {
      E.beginTurn(s);
      aimAtCup();
      aim.power = 0.4;
      paintPlay();
    });
  }

  function paintPlay() {
    if (!s || (s.phase !== 'aim' && s.phase !== 'roll')) return;
    const h = E.holeOf(s), p = E.turnOf(s);
    paintStatus();
    const multi = s.players > 1;
    if (!panel.querySelector('.aim-panel')) {
      setPanel(`
        <div class="aim-panel">
          <div class="play-head">
            <div><p class="kicker">${multi ? `${dot(p)}<b>${esc(s.names[p])}</b> · ` : ''}${esc(h.name)}</p>
              <h2 class="stroke-line">Stroke <span id="stroke"></span> <small>· par ${h.par}</small></h2></div>
          </div>
          <div class="meter-row">
            <button class="step" id="aim-l" aria-label="Aim left">${ICON.left}</button>
            <div class="meter" aria-hidden="true"><i id="meter-fill"></i><span id="meter-txt"></span></div>
            <button class="step" id="aim-r" aria-label="Aim right">${ICON.right}</button>
          </div>
          <div class="pow-row">
            <button class="chip-btn" data-pw="0.25">Tap</button>
            <button class="chip-btn" data-pw="0.45">Putt</button>
            <button class="chip-btn" data-pw="0.7">Firm</button>
            <button class="chip-btn" data-pw="1">Whack</button>
          </div>
          <button class="btn btn-primary wide big" id="putt">Putt!</button>
          <p class="hint" id="hint"><span class="touch-only">Drag back on the course to aim, let go to putt. Tap to point.</span><span class="mouse-only">Drag back on the course to aim · or ←/→ ↑/↓ and Space.</span></p>
        </div>`, 'play', multi ? PC[p] : BRAND);
      const nudge = (d) => { aim.angle += d; paintMeter(); };
      hold(panel.querySelector('#aim-l'), () => nudge(-0.025));
      hold(panel.querySelector('#aim-r'), () => nudge(0.025));
      panel.querySelectorAll('[data-pw]').forEach((b) => { b.onclick = () => { sfx.tap(); aim.power = +b.dataset.pw; paintMeter(); }; });
      panel.querySelector('#putt').onclick = () => putt();
    }
    panel.querySelector('#stroke').textContent = String(s.strokes + (s.phase === 'aim' ? 1 : 0));
    const btn = panel.querySelector('#putt');
    const rolling = s.phase === 'roll';
    btn.disabled = rolling;
    btn.textContent = rolling ? 'Rolling…' : 'Putt!';
    paintMeter();
  }

  /** Press-and-hold repeat for the aim buttons. */
  function hold(el, fn) {
    let timer = null;
    const stop = () => { clearInterval(timer); timer = null; };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); sfx.tick(); timer = setInterval(fn, 60); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => el.addEventListener(t, stop));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
  }

  function paintMeter() {
    const f = panel.querySelector('#meter-fill');
    if (!f) return;
    const pw = Math.round(aim.power * 100);
    f.style.width = `${pw}%`;
    f.className = aim.power < 0.45 ? '' : aim.power < 0.75 ? 'mid' : 'hi';
    panel.querySelector('#meter-txt').textContent = `Power ${pw}%`;
    panel.querySelectorAll('[data-pw]').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.pw - aim.power) < 0.01));
  }

  function putt() {
    if (!canAim()) return;
    if (E.shoot(s, aim.angle, aim.power)) {
      sfx.thunk();
      buzz(12);
      paintPlay();
    }
  }

  function holed() {
    busy = true;
    const h = E.holeOf(s);
    const sn = E.scoreName(s.strokes, h.par);
    if (s.strokes === 1) { sfx.win(); confetti({ count: 220, colors: ['#FFD877', '#E0457B', '#2D6FD1', BRAND, '#fff'] }); }
    else { sfx.claim(true); if (s.strokes < h.par) setTimeout(() => sfx.score(h.par - s.strokes + 1), 250); }
    board.celebrate && board.celebrate(sn.name);
    pending = setTimeout(() => { pending = null; result(); }, 1100);
  }

  function result() {
    busy = true;
    const h = E.holeOf(s), p = E.turnOf(s);
    const capped = s.phase === 'capped';
    const strokes = capped ? E.capOf(h) : s.strokes;
    const sn = E.scoreName(strokes, h.par, capped);
    if (capped) sfx.score(0);
    const r = E.endTurn(s);
    busy = false;
    paintStatus();
    const multi = s.players > 1;
    const d = strokes - h.par;
    const lastOnHole = r !== 'player';
    let nextLabel;
    if (r === 'player') nextLabel = `Pass to ${esc(s.names[E.turnOf(s)])}`;
    else if (r === 'hole') nextLabel = `Next: ${esc(E.holeOf(s).name)}`;
    else nextLabel = 'Final scorecard';
    const prevHole = r === 'hole' ? s.holeIdx - 1 : s.holeIdx;
    setPanel(`
      <p class="kicker">${multi ? `${dot(p)}${esc(s.names[p])} · ` : ''}Hole ${prevHole + 1} · ${esc(h.name)}</p>
      <h2 class="res ${strokes === 1 ? 'ace' : d < 0 ? 'under' : d > 0 ? 'over' : ''}">${esc(sn.name)}</h2>
      <p class="sub"><b>${strokes}</b> stroke${strokes > 1 ? 's' : ''} on a par ${h.par}. ${esc(sn.line)}</p>
      ${lastOnHole ? scorecard(prevHole) : ''}
      <button class="btn btn-primary wide big" id="next" autofocus>${nextLabel}</button>`, 'result', multi ? PC[p] : BRAND);
    on('#next', () => {
      if (r === 'over') return finish();
      paintReady();
    });
  }

  function finish() {
    s.phase = 'over';
    if (board.setMode) board.setMode('over');
    const order = E.standings(s);
    const top = order[0];
    let headline;
    if (s.players > 1) {
      const tied = order.filter((p) => E.total(s, p) === E.total(s, top));
      headline = tied.length > 1 ? `Tie lah! ${tied.map((p) => esc(s.names[p])).join(' & ')}` : `${esc(s.names[top])} wins!`;
    } else {
      const d = E.toPar(s, 0);
      headline = d <= -3 ? 'Tiger Woods who?' : d < 0 ? 'Under par, steady!' : d === 0 ? 'Level par. Solid!' : d <= 3 ? 'Not bad lah!' : 'Practice more, can?';
    }
    let newBest = false;
    if (s.players === 1) {
      const all = read(BEST_KEY) || {};
      const prev = all[s.course];
      const tot = E.total(s, 0);
      if (!prev || tot < prev.strokes) { all[s.course] = { strokes: tot, toPar: E.toPar(s, 0) }; write(BEST_KEY, all); newBest = true; }
    }
    const good = s.players > 1 || E.toPar(s, 0) <= 0;
    if (good) { sfx.win(); confetti({ count: 200, colors: ['#FFD877', '#E0457B', '#2D6FD1', BRAND] }); } else sfx.score(1);
    setPanel(`
      <p class="kicker">${s.holeCount} holes · final card</p>
      <h2 class="win">${headline}</h2>
      ${s.players === 1 ? `<p class="sub"><b>${E.total(s, 0)}</b> strokes, ${E.fmtPar(E.toPar(s, 0))} to par.${newBest ? ' <b class="newbest">New best!</b>' : ''}</p>` : ''}
      ${scorecard()}
      <div class="row">
        <button class="btn btn-ghost" id="setup">Courses</button>
        <button class="btn btn-primary grow" id="again" autofocus>Play again</button>
      </div>`, 'over');
    statusEl.innerHTML = `<span class="station"><b>Final card</b><small>${s.holeCount} holes · par ${E.parThrough(s, s.holeCount)}</small></span>`;
    on('#setup', () => goSetup());
    on('#again', () => start(s.players, s.names, s.holeCount));
  }

  goSetup();
  return { get state() { return s; }, get aim() { return aim; }, putt: (a, p) => { aim.angle = a; aim.power = p; putt(); } };
}
