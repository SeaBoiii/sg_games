// Chapteh Kick — screen flow shared by the 2D and 3D builds.
import * as E from './engine.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';
import { confetti } from '../../../assets/lib/fx.js';

const BEST_KEY = 'chapteh.best';
const PREF_KEY = 'chapteh.setup';
const BRAND = '#D7263D';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const PC = E.PLAYER_COLORS;
const ZC = { L: '#E0457B', C: '#F2B134', R: '#2D6FD1' };
const P1_KEYS = new Set(['a', 's', 'd', 'w', 'q', 'e', 'z', 'x']);
const P2_KEYS = new Set(['j', 'k', 'l', 'i', 'o', 'm', ',', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'enter']);

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3.5h6.5a4 4 0 0 1 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 5.5l2 2 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
  one: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6" fill="currentColor"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5z" fill="currentColor"/></svg>',
  vs: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="8" r="3" fill="currentColor"/><circle cx="18" cy="8" r="3" fill="currentColor"/><path d="M1.5 19c0-3 2-5 4.5-5s4.5 2 4.5 5zM13.5 19c0-3 2-5 4.5-5s4.5 2 4.5 5z" fill="currentColor"/><path d="M10 6l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  many: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><circle cx="16.5" cy="8.5" r="2.7" fill="currentColor" opacity=".7"/><path d="M2.5 19c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5z" fill="currentColor"/><path d="M13 19c.2-2.9 1.8-4.8 4-4.8 2.4 0 4.2 2 4.4 4.8z" fill="currentColor" opacity=".7"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z" fill="currentColor"/></svg>',
};

const RULES_HTML = `
  <h2>How to play</h2>
  <p>Chapteh is the old kampung game of keeping a feathered shuttlecock in the air with your feet. Don't let it touch the ground!</p>
  <ol class="rules-steps">
    <li><b>Watch where it's falling.</b> It comes down to your <b style="color:${ZC.L}">left foot</b>, your <b style="color:${ZC.C}">knee</b> or your <b style="color:${ZC.R}">right foot</b>. That spot lights up.</li>
    <li><b>Kick in time.</b> A ring shrinks onto the spot. Kick when the ring closes for a <b>Perfect</b>.</li>
    <li><b>Use the right kick.</b> Tap the left, middle or right of the playground (or the buttons, or ← ↑ →). The wrong kick is a scrappy save and breaks your combo.</li>
    <li><b>Chain it.</b> Perfects and goods build a combo: every 8 in a row adds to your multiplier. A golden chapteh is worth +10 if you nail it.</li>
  </ol>
  <p>You get 3 chapteh. Each drop costs one. It speeds up as you go.</p>
  <p><b>Rally (2 players):</b> hold the phone between you. Player 1 taps the left half, Player 2 the right half. Kick it across; a Perfect is a fast smash, a weak kick is a slow lob. Drop it and the other side scores.</p>
  <p class="hint">Keyboard: solo ← ↑ → (or A W D). Rally: Player 1 A/S/D, Player 2 J/K/L or the arrow keys. P to pause.</p>`;

export function startFlow({ root, createBoard, hubHref, altHref, altLabel }) {
  let s = null;
  let paused = false;
  let runStats = null;

  root.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="${hubHref}" aria-label="Back to SG Games">${ICON.back}</a>
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>Chapteh<b>Kick</b></span></div>
      <div class="status" id="status" aria-live="polite"></div>
      <div class="bar-actions">
        <button class="icon-btn" id="btn-rules" aria-label="How to play">${ICON.help}</button>
        <button class="icon-btn" id="btn-sound" aria-label="Toggle sound"></button>
        <button class="icon-btn" id="btn-menu" aria-label="Menu" aria-haspopup="true">${ICON.menu}</button>
      </div>
      <div class="menu" id="menu" hidden>
        <button data-act="rules">How to play</button>
        <button data-act="new">Quit to mode select</button>
        ${altHref ? `<a href="${altHref}">${altLabel}</a>` : ''}
        <a href="${hubHref}">All SG Games</a>
      </div>
    </header>
    <main class="stage" id="stage"></main>
    <section class="panel" id="panel" aria-live="polite"></section>
    <dialog class="sheet" id="rules"><div class="sheet-body">${RULES_HTML}</div><form method="dialog"><button class="btn btn-primary wide">Got it</button></form></dialog>`;

  const $ = (q) => root.querySelector(q);
  const panel = $('#panel');
  const statusEl = $('#status');
  const stageEl = $('#stage');
  const board = createBoard(stageEl);

  const soundBtn = $('#btn-sound');
  const paintSound = () => { soundBtn.innerHTML = sfx.muted ? ICON.mute : ICON.sound; soundBtn.setAttribute('aria-pressed', String(!sfx.muted)); };
  paintSound();
  soundBtn.onclick = () => { sfx.setMuted(!sfx.muted); paintSound(); sfx.tap(); };
  const playing = () => s && (s.phase === 'play' || s.phase === 'countdown' || s.phase === 'dropped');
  const showRules = () => { sfx.tap(); if (playing() && !paused) pause(); $('#rules').showModal(); };
  $('#btn-rules').onclick = showRules;
  const menu = $('#menu');
  $('#btn-menu').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; sfx.tap(); if (!menu.hidden && playing() && !paused) pause(); };
  document.addEventListener('click', () => { menu.hidden = true; });
  menu.querySelector('[data-act="rules"]').onclick = showRules;
  menu.querySelector('[data-act="new"]').onclick = () => goSetup();
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing() && !paused) pause(); });

  // ---------------- input ----------------
  function input(who) {
    if (!s || paused || s.phase !== 'play') return;
    const evs = E.kick(s, who);
    for (const ev of evs) handle(ev);
  }
  stageEl.addEventListener('pointerdown', (e) => {
    if (!s || paused || s.phase !== 'play') return;
    if (e.target.closest && e.target.closest('button, a')) return;
    const r = stageEl.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width;
    e.preventDefault();
    if (s.mode === 'rally') input(u < 0.5 ? 0 : 1);
    else input(u < 1 / 3 ? 'L' : u < 2 / 3 ? 'C' : 'R');
  });
  document.addEventListener('keydown', (e) => {
    if (!s || $('#rules').open) return;
    if (e.target.matches && e.target.matches('input')) return;
    const k = e.key.toLowerCase();
    if (k === 'p' || k === 'escape') { if (playing()) { paused ? resume() : pause(); e.preventDefault(); } return; }
    if (paused || e.repeat) return;
    if (s.phase !== 'play') return;
    if (s.mode === 'rally') {
      if (P1_KEYS.has(k)) { input(0); e.preventDefault(); }
      else if (P2_KEYS.has(k)) { input(1); e.preventDefault(); }
    } else {
      if (k === 'arrowleft' || k === 'a') { input('L'); e.preventDefault(); }
      else if (k === 'arrowup' || k === 'w' || k === ' ' || k === 's' || k === 'arrowdown') { input('C'); e.preventDefault(); }
      else if (k === 'arrowright' || k === 'd') { input('R'); e.preventDefault(); }
    }
  });

  // ---------------- loop ----------------
  let lastT = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (s && !paused && (s.phase === 'countdown' || s.phase === 'play' || s.phase === 'dropped')) {
      for (const ev of E.tick(s, dt)) handle(ev);
    } else if (s && !paused) s.t += dt; // keep the kids breathing between runs
    if (s) board.frame(s);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  function handle(ev) {
    if (ev.type === 'count') { sfx.tick(); return; }
    if (ev.type === 'go') { sfx.lock(); buzz(15); paintPlay(); return; }
    if (ev.type === 'kick') {
      if (ev.grade === 'perfect') { sfx.claim(true); buzz(14); } else if (ev.grade === 'good') sfx.plop(); else sfx.tap();
      if (runStats) { runStats.maxCombo = Math.max(runStats.maxCombo, s.combo || 0); }
      if (ev.mult > 1 && ev.combo % 8 === 0) sfx.score(Math.min(4, ev.mult));
      if (ev.bonus) sfx.win();
      board.react(ev, s);
      paintLive();
      return;
    }
    if (ev.type === 'whiff') { sfx.whoosh(true); board.react(ev, s); paintLive(); return; }
    if (ev.type === 'drop') { sfx.score(0); buzz([40, 30, 40]); board.react(ev, s); paintLive(); return; }
    if (ev.type === 'point') { sfx.sweep(); buzz(30); board.react(ev, s); paintStatus(); paintLive(); return; }
    if (ev.type === 'runover') { setTimeout(runOver, 900); return; }
    if (ev.type === 'win') { setTimeout(() => rallyOver(ev.winner), 900); return; }
  }

  // ---------------- helpers ----------------
  function paintStatus() {
    if (!s) { statusEl.innerHTML = ''; return; }
    if (s.mode === 'rally') {
      const [a, b] = s.players;
      statusEl.innerHTML = `
        <span class="score-pill" style="background:${a.color}">${a.points}</span>
        <span class="station"><b>Rally</b><small>First to ${s.target}</small></span>
        <span class="score-pill" style="background:${b.color}">${b.points}</span>`;
      return;
    }
    const pl = E.current(s);
    statusEl.innerHTML = `
      <span class="line-chip" style="--line:${BRAND}">${E.SPEEDS[s.speed].name}</span>
      <span class="station"><b>${esc(s.mode === 'turns' ? pl.name : 'Keep it up')}</b><small>${s.mode === 'turns' ? `Player ${s.turn + 1} of ${s.players.length}` : `Best ${bestFor(s.speed)}`}</small></span>
      <span class="score-pill" style="background:${s.mode === 'turns' ? pl.color : 'var(--ink)'}">${pl.score}</span>`;
  }
  const bestFor = (speed) => (read(BEST_KEY) || {})[speed] || 0;
  function setPanel(html, cls = '', color = BRAND) {
    panel.className = `panel ${cls}`;
    panel.style.setProperty('--team', color);
    panel.innerHTML = `<div class="panel-inner">${html}</div>`;
    const first = panel.querySelector('[autofocus]');
    if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }
  const on = (q, fn) => { const b = panel.querySelector(q); if (b) b.onclick = (e) => { sfx.tap(); fn(e); }; };
  const dot = (i) => `<i class="pdot" style="--c:${PC[i]}"></i>`;

  // ---------------- setup ----------------
  function goSetup() {
    s = null;
    paused = false;
    paintStatus();
    const pref = read(PREF_KEY) || {};
    let mode = ['solo', 'rally', 'turns'].includes(pref.mode) ? pref.mode : 'solo';
    let speed = E.SPEEDS[pref.speed] ? pref.speed : 'normal';
    let target = E.RALLY_TARGETS.includes(pref.target) ? pref.target : 7;
    let count = [2, 3, 4].includes(pref.count) ? pref.count : 2;
    const names = pref.names || ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
    const best = read(BEST_KEY) || {};
    const demo = () => {
      const d = E.newGame({ mode: mode === 'rally' ? 'rally' : 'solo', names: ['A', 'B'] });
      d.phase = 'idle';
      board.load(d);
      return d;
    };
    s = null;
    let idle = demo();
    const idleLoop = () => { if (!s && idle) { idle.t += 1 / 60; board.frame(idle); requestAnimationFrame(idleLoop); } };
    requestAnimationFrame(idleLoop);
    const seg = (name, vals, cur, fmt = (v) => v) => `<fieldset class="seg" aria-label="${name}"><legend>${name}</legend>${vals.map((v) => `<label><input type="radio" name="${name}" value="${v}" ${v === cur ? 'checked' : ''}/><span>${fmt(v)}</span></label>`).join('')}</fieldset>`;
    setPanel(`
      <p class="kicker">The kampung classic</p>
      <h1 class="title">Chapteh <span>Kick</span></h1>
      <p class="sub">Keep the feathered chapteh in the air. Left foot, knee, right foot. Don't let it drop!</p>
      <p class="rotate-hint">${ICON.phone}<span><b>Best in landscape.</b> Turn your phone sideways, especially for Rally.</span></p>
      <div class="mode-tabs three" role="radiogroup" aria-label="Mode">
        <button type="button" role="radio" data-m="solo" aria-checked="${mode === 'solo'}">${ICON.one}<span>Solo<small>beat your best</small></span></button>
        <button type="button" role="radio" data-m="rally" aria-checked="${mode === 'rally'}">${ICON.vs}<span>Rally<small>2 players, 1 phone</small></span></button>
        <button type="button" role="radio" data-m="turns" aria-checked="${mode === 'turns'}">${ICON.many}<span>Turns<small>2–4, pass it on</small></span></button>
      </div>
      <div class="opt-turns" ${mode === 'turns' ? '' : 'hidden'}>${seg('Players', [2, 3, 4], count)}</div>
      <div class="names four" data-mode="${mode}">
        ${[0, 1, 2, 3].map((i) => `<label class="field" style="--team:${PC[i]}" ${(mode === 'rally' && i < 2) || (mode === 'turns' && i < count) ? '' : 'hidden'}><span>Player ${i + 1}</span><input id="n${i}" maxlength="12" value="${esc(names[i] || `Player ${i + 1}`)}"/></label>`).join('')}
      </div>
      <div class="seg-row">
        <span class="opt-speed">${seg('Speed', Object.keys(E.SPEEDS), speed, (v) => E.SPEEDS[v].name)}</span>
        <span class="opt-rally" ${mode === 'rally' ? '' : 'hidden'}>${seg('First to', E.RALLY_TARGETS, target)}</span>
      </div>
      <p class="best-line opt-solo" ${mode === 'solo' ? '' : 'hidden'}>${ICON.star}<span>Your best: ${Object.keys(E.SPEEDS).map((k) => `<b>${E.SPEEDS[k].name} ${best[k] || 0}</b>`).join(' · ')}</span></p>
      <div class="row">
        <button type="button" class="btn btn-ghost" id="how">How to play</button>
        <button class="btn btn-primary grow" id="start" autofocus>Let's kick!</button>
      </div>`, 'setup');
    const repaint = () => {
      panel.querySelectorAll('.mode-tabs button').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.m === mode)));
      panel.querySelector('.opt-turns').hidden = mode !== 'turns';
      panel.querySelector('.opt-rally').hidden = mode !== 'rally';
      panel.querySelector('.opt-solo').hidden = mode !== 'solo';
      panel.querySelectorAll('.names .field').forEach((f, i) => { f.hidden = !((mode === 'rally' && i < 2) || (mode === 'turns' && i < count)); });
    };
    panel.querySelectorAll('.mode-tabs button').forEach((b) => { b.onclick = () => { sfx.tap(); mode = b.dataset.m; repaint(); idle = demo(); }; });
    panel.querySelectorAll('input[name="Players"]').forEach((r) => { r.onchange = () => { sfx.tap(); count = +r.value; repaint(); }; });
    panel.querySelectorAll('input[name="Speed"]').forEach((r) => { r.onchange = () => { sfx.tap(); speed = r.value; }; });
    panel.querySelectorAll('input[name="First to"]').forEach((r) => { r.onchange = () => { sfx.tap(); target = +r.value; }; });
    on('#how', showRules);
    on('#start', () => {
      const nm = [0, 1, 2, 3].map((i) => panel.querySelector(`#n${i}`).value);
      write(PREF_KEY, { mode, speed, target, count, names: nm });
      idle = null;
      const list = mode === 'rally' ? nm.slice(0, 2) : mode === 'turns' ? nm.slice(0, count) : ['You'];
      s = E.newGame({ mode, names: list, speed, target });
      s.opts = { mode, names: list, speed, target };
      if (board.setMode) board.setMode('play');
      board.load(s);
      paintReady();
    });
  }

  // ---------------- runs ----------------
  function paintReady() {
    paused = false;
    paintStatus();
    const pl = E.current(s);
    let body;
    if (s.mode === 'rally') {
      body = `<p class="kicker">Rally · first to ${s.target}</p>
        <h2>${dot(0)}${esc(s.players[0].name)} <span class="vs">vs</span> ${dot(1)}${esc(s.players[1].name)}</h2>
        <p class="pass">Hold the phone between you. <b style="color:${PC[0]}">${esc(s.players[0].name)}</b> taps the left half, <b style="color:${PC[1]}">${esc(s.players[1].name)}</b> the right half.</p>`;
    } else {
      body = `<p class="kicker">${s.mode === 'turns' ? `Player ${s.turn + 1} of ${s.players.length}` : 'Keep it up'} · ${E.SPEEDS[s.speed].name}</p>
        <h2>${s.mode === 'turns' ? `${dot(s.turn)}${esc(pl.name)}, your turn!` : 'Ready, set…'}</h2>
        <div class="zone-legend"><span style="--c:${ZC.L}">◀ Left foot</span><span style="--c:${ZC.C}">▲ Knee</span><span style="--c:${ZC.R}">Right foot ▶</span></div>
        <p class="hint">Tap the matching third of the playground when the ring closes. 3 chapteh.</p>`;
    }
    setPanel(`${body}<button class="btn btn-primary wide big" id="go" autofocus>Start!</button>`, 'ready', s.mode === 'turns' ? pl.color : BRAND);
    on('#go', () => { runStats = { maxCombo: 0 }; E.startRun(s); s.pose = [{ kind: 'idle', t: 0 }, { kind: 'idle', t: 0 }]; paintCountdown(); });
  }

  function paintCountdown() {
    setPanel(`<p class="kicker">Get ready</p><h2 class="big-count">Sepak!</h2><p class="hint">Watch the ring…</p>`, 'count', s.mode === 'turns' ? E.current(s).color : BRAND);
  }

  function paintPlay() {
    paintStatus();
    if (s.mode === 'rally') {
      setPanel(`
        <div class="live" id="live"></div>
        <div class="rally-btns">
          <button class="kick-btn" data-p="0" style="--c:${PC[0]}"><b>${esc(s.players[0].name)}</b><small>kick · A</small></button>
          <button class="kick-btn" data-p="1" style="--c:${PC[1]}"><b>${esc(s.players[1].name)}</b><small>kick · L</small></button>
        </div>
        <button class="btn btn-ghost small" id="pause">${ICON.pause} Pause</button>`, 'play');
      panel.querySelectorAll('.kick-btn').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); input(+b.dataset.p); }));
    } else {
      setPanel(`
        <div class="live" id="live"></div>
        <div class="kick-btns">
          <button class="kick-btn" data-z="L" style="--c:${ZC.L}"><b>◀</b><small>Left</small></button>
          <button class="kick-btn" data-z="C" style="--c:${ZC.C}"><b>▲</b><small>Knee</small></button>
          <button class="kick-btn" data-z="R" style="--c:${ZC.R}"><b>▶</b><small>Right</small></button>
        </div>
        <button class="btn btn-ghost small" id="pause">${ICON.pause} Pause</button>`, 'play', s.mode === 'turns' ? E.current(s).color : BRAND);
      panel.querySelectorAll('.kick-btn').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); input(b.dataset.z); }));
    }
    on('#pause', () => pause());
    paintLive();
  }

  function paintLive() {
    const el = panel.querySelector('#live');
    if (!el) return;
    if (s.mode === 'rally') {
      const [a, b] = s.players;
      el.innerHTML = `<div class="rally-score"><span style="--c:${a.color}"><b>${a.points}</b>${esc(a.name)}</span><em>${s.rallyHits > 1 ? `rally ${s.rallyHits}` : 'vs'}</em><span style="--c:${b.color}"><b>${b.points}</b>${esc(b.name)}</span></div>`;
      paintStatus();
      return;
    }
    const pl = E.current(s);
    const mult = 1 + Math.min(4, Math.floor(s.combo / 8));
    el.innerHTML = `<div class="solo-live"><div><small>Score</small><b>${pl.score}</b></div><div><small>Combo</small><b>${s.combo}${mult > 1 ? `<em>×${mult}</em>` : ''}</b></div><div><small>Chapteh</small><b class="lives">${'●'.repeat(Math.max(0, s.lives))}<i>${'●'.repeat(E.LIVES - Math.max(0, s.lives))}</i></b></div></div>`;
    paintStatus();
  }

  function pause() {
    if (!playing() || paused) return;
    paused = true;
    if (board.setMode) board.setMode('paused');
    setPanel(`<p class="kicker">Paused</p><h2>Take a breather</h2><button class="btn btn-primary wide big" id="resume" autofocus>Resume</button><button class="btn btn-ghost small" id="quit">Quit to mode select</button>`, 'paused');
    on('#resume', () => resume());
    on('#quit', () => goSetup());
  }
  function resume() {
    paused = false;
    lastT = performance.now();
    if (board.setMode) board.setMode('play');
    if (s.phase === 'countdown') paintCountdown(); else paintPlay();
  }

  function runOver() {
    const pl = E.current(s);
    const multi = s.mode === 'turns';
    let newBest = false;
    if (!multi) {
      const all = read(BEST_KEY) || {};
      if (pl.score > (all[s.speed] || 0)) { all[s.speed] = pl.score; write(BEST_KEY, all); newBest = true; }
    }
    if (newBest) { sfx.win(); confetti({ count: 180, colors: ['#D7263D', '#F2B134', '#2F9E5B', '#2D6FD1'] }); }
    const r = E.nextRun(s);
    const line = pl.score >= 150 ? 'Kampung champion!' : pl.score >= 70 ? 'Steady lah!' : pl.score >= 25 ? 'Not bad, not bad.' : 'Aiyoh, again!';
    paintStatus();
    setPanel(`
      <p class="kicker">${multi ? `${dot(s.players.indexOf(pl))}${esc(pl.name)} · ` : ''}${E.SPEEDS[s.speed].name}</p>
      <h2 class="win">${pl.score} points</h2>
      <p class="sub">${line}${newBest ? ' <b class="newbest">New best!</b>' : ''}</p>
      <ul class="stats"><li><b>${pl.kicks}</b><span>kicks</span></li><li><b>${pl.perfects}</b><span>perfects</span></li><li><b>${runStats ? runStats.maxCombo : 0}</b><span>best combo</span></li></ul>
      ${r === 'next' ? `<button class="btn btn-primary wide big" id="next" autofocus>${dot(s.turn)}Pass to ${esc(E.current(s).name)}</button>`
        : multi ? `<button class="btn btn-primary wide big" id="final" autofocus>See who won</button>`
        : `<div class="row"><button class="btn btn-ghost" id="modes">Modes</button><button class="btn btn-primary grow" id="again" autofocus>Kick again</button></div>`}`, 'over', multi ? pl.color : BRAND);
    on('#next', () => { board.load(s); paintReady(); });
    on('#final', () => finalTurns());
    on('#again', () => { s = E.newGame(s.opts); s.opts = s.opts || {}; board.load(s); paintReady(); });
    on('#modes', () => goSetup());
  }

  function finalTurns() {
    const order = E.standings(s);
    const top = s.players[order[0]].score;
    const winners = order.filter((i) => s.players[i].score === top);
    sfx.win(); confetti({ count: 200, colors: winners.map((i) => s.players[i].color).concat(['#FFD877']) });
    statusEl.innerHTML = '<span class="station"><b>Final scores</b></span>';
    setPanel(`
      <p class="kicker">Turns · ${E.SPEEDS[s.speed].name}</p>
      <h2 class="win" style="color:${s.players[winners[0]].color}">${winners.length > 1 ? 'Tie lah!' : `${esc(s.players[winners[0]].name)} wins!`}</h2>
      <ol class="podium-list">${order.map((i) => `<li>${dot(i)}<span>${esc(s.players[i].name)}</span><small>${s.players[i].kicks} kicks</small><b>${s.players[i].score}</b></li>`).join('')}</ol>
      <div class="row"><button class="btn btn-ghost" id="modes">Modes</button><button class="btn btn-primary grow" id="again" autofocus>Play again</button></div>`, 'over', s.players[winners[0]].color);
    on('#modes', () => goSetup());
    on('#again', () => { const o = s.opts; s = E.newGame(o); s.opts = o; board.load(s); paintReady(); });
  }

  function rallyOver(w) {
    const W = s.players[w], L = s.players[1 - w];
    sfx.win(); confetti({ count: 200, colors: [W.color, '#FFD877', '#fff'] });
    statusEl.innerHTML = `<span class="station"><b>${esc(W.name)} wins</b><small>${W.points}–${L.points}</small></span>`;
    setPanel(`
      <p class="kicker">Rally · first to ${s.target}</p>
      <h2 class="win" style="color:${W.color}">${esc(W.name)} wins!</h2>
      <p class="sub"><b>${W.points}–${L.points}</b> against ${esc(L.name)}.</p>
      <ul class="stats"><li><b>${W.kicks}</b><span>${esc(W.name)} kicks</span></li><li><b>${L.kicks}</b><span>${esc(L.name)} kicks</span></li><li><b>${W.perfects + L.perfects}</b><span>smashes</span></li></ul>
      <div class="row"><button class="btn btn-ghost" id="modes">Modes</button><button class="btn btn-primary grow" id="again" autofocus>Rematch</button></div>`, 'over', W.color);
    on('#modes', () => goSetup());
    on('#again', () => { const o = s.opts; s = E.newGame(o); s.opts = o; board.load(s); paintReady(); });
  }

  goSetup();
  return { get state() { return s; } };
}
