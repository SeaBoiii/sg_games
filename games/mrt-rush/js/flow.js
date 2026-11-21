// MRT Rush — screen flow shared by the 2D and 3D builds.
import * as E from './engine.js';
import { cellArt } from './board2d.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';
import { confetti, wait } from '../../../assets/lib/fx.js';

const BEST_KEY = 'mrt.best';
const PREF_KEY = 'mrt.setup';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  rotate: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  doors: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 4v16" stroke="currentColor" stroke-width="2.2"/><path d="M8 12h2M14 12h2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3.5h6.5a4 4 0 0 1 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 5.5l2 2 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z" fill="currentColor"/></svg>',
};

const RULES_HTML = `
  <h2>How to play MRT Rush</h2>
  <p>Peak hour on a (totally fictional) MRT line. You're the one packing the carriage.</p>
  <ol class="rules-steps">
    <li><b>Doors open.</b> At each station the platform is on one side. Riders whose stop it is walk out first.</li>
    <li><b>Board the queue.</b> Tap a commuter, then tap a spot in the carriage. Turn bulky ones with <b>Rotate</b> (or <kbd>R</kbd> / right-click).</li>
    <li><b>Move in, please.</b> People can only walk to spots they can reach from the open doors, so fill from the inside out.</li>
    <li><b>No bags on seats.</b> Backpacks, trolleys, field packs and strollers stay on the floor.</li>
    <li><b>Priority seats.</b> Uncles and mums-to-be need a seat. A priority seat (maroon, at the ends) earns the most.</li>
    <li><b>Mind the doors.</b> The doors must be clear when they close. Close them early for a time bonus.</li>
    <li><b>Let them out.</b> The badge shows stops left. If someone can't get to the door when it's their stop, it's "Excuse me, excuse me!"</li>
  </ol>
  <p>Leaving people behind, blocked doors, squeezing past and standing uncles all cost happiness. Run out and the line gets shut down. Finish with 85%+ happiness for 3 stars.</p>
  <p><b>Phones:</b> turn sideways. The carriage is long!</p>`;

export function startFlow({ root, createBoard, hubHref, altHref, altLabel }) {
  let s = null;
  let busy = false;
  let sel = null; // { id, type, rot }
  let timer = null;
  let timeLeft = 0;
  let timeMax = 1;
  let paused = false;
  let tip = '';

  root.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="${hubHref}" aria-label="Back to SG Games">${ICON.back}</a>
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>MRT<b>Rush</b></span></div>
      <div class="status" id="status" aria-live="polite"></div>
      <div class="bar-actions">
        <button class="icon-btn" id="btn-rules" aria-label="How to play">${ICON.help}</button>
        <button class="icon-btn" id="btn-sound" aria-label="Toggle sound"></button>
        <button class="icon-btn" id="btn-menu" aria-label="Menu" aria-haspopup="true">${ICON.menu}</button>
      </div>
      <div class="menu" id="menu" hidden>
        <button data-act="rules">How to play</button>
        <button data-act="new">Quit to line select</button>
        ${altHref ? `<a href="${altHref}">${altLabel}</a>` : ''}
        <a href="${hubHref}">All SG Games</a>
      </div>
    </header>
    <main class="stage" id="stage"></main>
    <section class="panel" id="panel" aria-live="polite"></section>
    <dialog class="sheet" id="rules"><div class="sheet-body">${RULES_HTML}</div><form method="dialog"><button class="btn btn-primary wide">Got it</button></form></dialog>
    <div class="toasts" id="toasts" aria-live="polite"></div>`;

  const $ = (q) => root.querySelector(q);
  const panel = $('#panel');
  const statusEl = $('#status');
  const board = createBoard($('#stage'));
  board.onCell = (r, c) => tryPlace(r, c);
  board.onRotate = () => rotate();
  board.onHover = (res) => { tip = res.ok ? '' : res.reason; paintTip(); };

  const soundBtn = $('#btn-sound');
  const paintSound = () => { soundBtn.innerHTML = sfx.muted ? ICON.mute : ICON.sound; soundBtn.setAttribute('aria-pressed', String(!sfx.muted)); };
  paintSound();
  soundBtn.onclick = () => { sfx.setMuted(!sfx.muted); paintSound(); sfx.tap(); };
  const rulesDlg = $('#rules');
  const showRules = () => { sfx.tap(); paused = true; rulesDlg.showModal(); };
  rulesDlg.addEventListener('close', () => { paused = false; });
  $('#btn-rules').onclick = showRules;
  const menu = $('#menu');
  $('#btn-menu').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; sfx.tap(); };
  document.addEventListener('click', () => { menu.hidden = true; });
  menu.querySelector('[data-act="rules"]').onclick = showRules;
  menu.querySelector('[data-act="new"]').onclick = () => { stopTimer(); goSetup(); };
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  document.addEventListener('visibilitychange', () => { paused = document.hidden || rulesDlg.open; });

  document.addEventListener('keydown', (e) => {
    if (!s || s.phase !== 'board' || busy || rulesDlg.open) return;
    if (e.key === 'r' || e.key === 'R') { rotate(); e.preventDefault(); }
    else if (e.key === 'Escape') { select(null); }
    else if (e.key === ' ' || e.key === 'Enter') { if (document.activeElement && document.activeElement.closest('.panel')) return; closeDoors(); e.preventDefault(); }
    else if (/^[1-9]$/.test(e.key)) { const q = s.queue[+e.key - 1]; if (q) select(q); }
  });

  function toast(html, kind = '') {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.innerHTML = html;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 1600);
    setTimeout(() => t.remove(), 2100);
  }

  function paintStatus() {
    if (!s) { statusEl.innerHTML = ''; return; }
    const line = E.lineOf(s);
    const n = line.stations.length;
    const st = Math.min(s.station, n - 1);
    statusEl.innerHTML = `
      <span class="line-chip" style="--line:${line.color}">${esc(line.name)}</span>
      <span class="station"><b>${esc(line.stations[st])}</b><small>${st + 1}/${n}</small></span>
      <span class="score-pill" title="Score">${s.score}</span>
      <span class="happy ${s.happy < 35 ? 'low' : s.happy < 65 ? 'mid' : ''}" title="Happiness ${s.happy}%"><i style="width:${s.happy}%"></i><em>${s.happy}%</em></span>`;
  }

  function setPanel(html, cls = '') {
    panel.className = `panel ${cls}`;
    panel.innerHTML = `<div class="panel-inner">${html}</div>`;
    const first = panel.querySelector('[autofocus]');
    if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }
  const on = (q, fn) => { const b = panel.querySelector(q); if (b) b.onclick = (e) => { if (busy) return; sfx.tap(); fn(e); }; };

  // ---------------- setup ----------------
  function bestFor(id) { return (read(BEST_KEY) || {})[id] || null; }

  function goSetup() {
    stopTimer();
    s = null;
    sel = null;
    paintStatus();
    const pref = read(PREF_KEY) || {};
    let lineId = E.LINES[pref.line] ? pref.line : 'kaya';
    const preview = E.newGame(lineId);
    board.load(preview);
    board.setPicking(null, preview);
    if (board.setMode) board.setMode('idle');
    setPanel(`
      <p class="kicker">Peak hour · solo puzzle</p>
      <h1 class="title">MRT <span>Rush</span></h1>
      <p class="sub">Pack the carriage, keep the doors clear, and let the uncles sit.</p>
      <p class="rotate-hint">${ICON.phone}<span><b>Best in landscape.</b> Turn your phone sideways, the carriage is long!</span></p>
      <div class="lines" role="radiogroup" aria-label="Choose a line">
        ${Object.values(E.LINES).map((l) => {
          const b = bestFor(l.id);
          return `<button type="button" role="radio" class="line-card" data-line="${l.id}" aria-checked="${l.id === lineId}" style="--line:${l.color}">
            <span class="dot"></span>
            <span class="meta"><b>${l.name}</b><small>${l.level} · ${l.stations.length} stations · ${l.time}s doors</small></span>
            <span class="best">${[1, 2, 3].map((i) => `<i class="${b && b.stars >= i ? 'on' : ''}">${ICON.star}</i>`).join('')}${b ? `<small>${b.score}</small>` : ''}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="row">
        <button type="button" class="btn btn-ghost" id="how">How to play</button>
        <button class="btn btn-primary grow" id="start" autofocus>Start the line</button>
      </div>`, 'setup');
    panel.querySelectorAll('.line-card').forEach((b) => {
      b.onclick = () => {
        sfx.tap();
        lineId = b.dataset.line;
        panel.querySelectorAll('.line-card').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        board.load(E.newGame(lineId));
      };
    });
    on('#how', showRules);
    on('#start', () => { write(PREF_KEY, { line: lineId }); start(lineId); });
  }

  // ---------------- play ----------------
  function start(lineId) {
    s = E.newGame(lineId);
    board.load(s);
    if (board.setMode) board.setMode('play');
    paintStatus();
    arriveFlow();
  }

  async function arriveFlow() {
    busy = true;
    const line = E.lineOf(s);
    const name = line.stations[s.station];
    const ev = E.arrive(s);
    setPanel(`<p class="kicker">Now arriving</p><h2>${esc(name)}</h2><p class="sub">${s.phase === 'over' && E.finished(s) ? 'End of the line. Everybody out!' : `Doors open on the ${s.side === 'top' ? 'left' : 'right'}.`}</p>`, 'arrive');
    board.sync(s);
    paintStatus();
    await board.doors(true);
    if (ev.exits.length) {
      await board.animateExits(ev.exits, s);
      const squeezed = ev.exits.filter((x) => !x.clean).length;
      if (squeezed) { toast(`“Excuse me, excuse me!” ${squeezed} had to squeeze out · −${squeezed * E.HAPPY.excuse}%`, 'bad'); buzz(30); sfx.claim(false); }
      else toast(`${ev.exits.length} alighted smoothly · +${ev.exits.length * E.SCORE.cleanExit}`, 'good');
      paintStatus();
    }
    busy = false;
    if (s.phase === 'over') { finish(); return; }
    startBoarding();
  }

  function startBoarding() {
    const line = E.lineOf(s);
    timeMax = line.time;
    timeLeft = timeMax;
    select(s.queue[0] || null);
    paintBoard();
    stopTimer();
    let last = performance.now();
    timer = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (paused || busy) return;
      const before = Math.ceil(timeLeft);
      timeLeft = Math.max(0, timeLeft - dt);
      if (Math.ceil(timeLeft) !== before && timeLeft <= 3.5 && timeLeft > 0) sfx.tick();
      paintTimer();
      if (timeLeft <= 0) closeDoors();
    }, 100);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  function paintTimer() {
    const bar = panel.querySelector('.timer i');
    const num = panel.querySelector('.timer b');
    if (!bar) return;
    bar.style.width = `${(timeLeft / timeMax) * 100}%`;
    num.textContent = `${Math.ceil(timeLeft)}s`;
    panel.querySelector('.timer').classList.toggle('hurry', timeLeft <= 4);
  }

  function paintTip() {
    const el = panel.querySelector('.tip');
    if (el) { el.textContent = tip || defaultTip(); el.classList.toggle('warn', !!tip); }
  }
  function defaultTip() {
    if (!sel) return s.queue.length ? 'Tap a commuter on the platform.' : 'Everyone is on. Close the doors!';
    const t = E.TYPES[sel.type];
    if (t.priority) return `${t.short} needs a seat. Maroon priority seats score best.`;
    if (t.cells.length > 1) return 'Tap a spot to board. Rotate to fit. Bags stay off seats.';
    return 'Tap a highlighted spot to board.';
  }

  function miniShape(q, rot = 0) {
    const cells = E.shapeCells(q.type, rot);
    const rs = cells.map((c) => c[0]), cs = cells.map((c) => c[1]);
    const r0 = Math.min(...rs), c0 = Math.min(...cs);
    const w = Math.max(...cs) - c0 + 1, h = Math.max(...rs) - r0 + 1;
    const S = 64;
    return `<svg viewBox="0 0 ${w * S} ${h * S}" aria-hidden="true">${cells.map(([r, c, k]) =>
      `<g transform="translate(${(c - c0) * S + S / 2} ${(r - r0) * S + S / 2})">${cellArt(k, q.type, q.id, { stops: k === 'p' ? q.stops : null })}</g>`).join('')}</svg>`;
  }

  function paintBoard() {
    const line = E.lineOf(s);
    setPanel(`
      <div class="board-head">
        <div><p class="kicker">Doors open · ${s.side === 'top' ? 'left' : 'right'} side</p><h2>${esc(line.stations[s.station])}</h2></div>
        <div class="timer"><i></i><b>${Math.ceil(timeLeft)}s</b></div>
      </div>
      <div class="queue" role="listbox" aria-label="Commuters on the platform">
        ${s.queue.length ? s.queue.map((q, i) => `
          <button class="q ${sel && sel.id === q.id ? 'on' : ''} ${E.TYPES[q.type].priority ? 'prio' : ''}" role="option" aria-selected="${!!(sel && sel.id === q.id)}" data-id="${q.id}" title="${esc(E.TYPES[q.type].name)}">
            <span class="q-art">${miniShape(q, sel && sel.id === q.id ? sel.rot : 0)}</span>
            <span class="q-meta"><b>${esc(E.TYPES[q.type].short)}</b><small>${q.stops} stop${q.stops > 1 ? 's' : ''}</small></span>
            <kbd>${i + 1}</kbd>
          </button>`).join('') : '<p class="empty">Platform cleared. Steady!</p>'}
      </div>
      <p class="tip"></p>
      <div class="row">
        <button class="btn btn-ghost small" id="rot" ${sel && E.TYPES[sel.type].cells.length > 1 ? '' : 'disabled'}>${ICON.rotate} Rotate</button>
        <button class="btn btn-primary grow" id="close">${ICON.doors} Close doors${s.queue.length ? '' : ` · +${Math.round(timeLeft)}`}</button>
      </div>`, 'boarding');
    panel.style.setProperty('--team', line.color);
    paintTimer();
    paintTip();
    panel.querySelectorAll('.q').forEach((b) => {
      b.onclick = () => {
        const q = s.queue.find((x) => x.id === +b.dataset.id);
        if (sel && sel.id === q.id) rotate(); else { sfx.tap(); select(q); }
      };
    });
    on('#rot', () => rotate());
    on('#close', () => closeDoors());
  }

  function select(q) {
    sel = q ? { id: q.id, type: q.type, rot: 0, stops: q.stops } : null;
    tip = '';
    board.setPicking(sel, s);
    if (s && s.phase === 'board') paintBoard();
  }

  function rotate() {
    if (!sel || E.TYPES[sel.type].cells.length < 2) return;
    sel.rot = (sel.rot + 1) % 4;
    sfx.tap();
    board.setPicking(sel, s);
    paintBoard();
  }

  async function tryPlace(r, c) {
    if (!s || s.phase !== 'board' || busy || !sel) return;
    const res = E.board(s, sel.id, sel.rot, r, c);
    if (!res.ok) { tip = res.reason; paintTip(); sfx.claim(false); buzz(15); return; }
    busy = true;
    board.setPicking(null, s);
    await board.animateBoard(res.rider, s);
    if (res.seat === 'priority') toast(`Priority seat for ${E.TYPES[res.rider.type].short}! +${res.points}`, 'good');
    else if (res.seat === 'seat') toast(`${E.TYPES[res.rider.type].short} got a seat · +${res.points}`, 'good');
    paintStatus();
    busy = false;
    select(s.queue[0] || null);
    if (!s.queue.length) { sfx.claim(true); await wait(450); if (s && s.phase === 'board') closeDoors(); }
  }

  async function closeDoors() {
    if (!s || s.phase !== 'board' || busy) return;
    busy = true;
    stopTimer();
    select(null);
    const line = E.lineOf(s);
    const ev = E.closeDoors(s, timeLeft);
    await board.doors(false);
    const notes = [];
    if (ev.bonus) notes.push(`<li class="good">Early doors · +${ev.bonus}</li>`);
    if (ev.left) notes.push(`<li class="bad">${ev.left} left behind · −${ev.left * E.HAPPY.leftBehind}%</li>`);
    if (ev.blocked) notes.push(`<li class="bad">“Please stand clear of the doors!” · −${E.HAPPY.doorBlocked}%</li>`);
    if (ev.standing) notes.push(`<li class="bad">${ev.standing} uncle/mum-to-be standing · −${ev.standing * E.HAPPY.standing}%</li>`);
    if (!notes.length) notes.push('<li class="good">Smooth departure. Shiok!</li>');
    if (ev.left || ev.blocked || ev.standing) { sfx.claim(false); buzz(25); } else sfx.claim(true);
    paintStatus();
    const next = line.stations[Math.min(s.station, line.stations.length - 1)];
    setPanel(`
      <p class="kicker">Doors closing</p>
      <h2>Next station: ${esc(next)}</h2>
      <ul class="notes">${notes.join('')}</ul>`, 'depart');
    board.sync(s);
    if (s.phase === 'over') { busy = false; finish(); return; }
    await board.travel(s);
    busy = false;
    arriveFlow();
  }

  function finish() {
    stopTimer();
    const line = E.lineOf(s);
    const won = E.finished(s);
    const st = E.stars(s);
    const all = read(BEST_KEY) || {};
    const prev = all[line.id];
    const newBest = won && (!prev || s.score > prev.score || st > prev.stars);
    if (won) {
      all[line.id] = { score: Math.max(s.score, prev ? prev.score : 0), stars: Math.max(st, prev ? prev.stars : 0) };
      write(BEST_KEY, all);
      sfx.win();
      if (st >= 2) confetti({ count: 200, colors: [line.color, '#F2B134', '#FBF6EC', '#2A1A12'] });
    } else sfx.score(0);
    if (board.setMode) board.setMode('over');
    const ids = Object.keys(E.LINES);
    const nextLine = ids[ids.indexOf(line.id) + 1];
    setPanel(`
      <p class="kicker">${esc(line.name)} · ${won ? 'end of the line' : 'service suspended'}</p>
      <h2 class="win">${won ? 'Terminal reached!' : 'Too many complaints…'}</h2>
      <div class="stars big">${[1, 2, 3].map((i) => `<i class="${st >= i ? 'on' : ''}">${ICON.star}</i>`).join('')}</div>
      <p class="sub">${won ? (st === 3 ? 'Every uncle seated, every door clear. Model commuter!' : st === 2 ? 'Steady lah. A few grumbles only.' : 'Made it, but the carriage was not happy.') : 'Happiness hit zero. Try packing from the inside out.'}${newBest ? ' <b class="newbest">New best!</b>' : ''}</p>
      <ul class="stats">
        <li><b>${s.score}</b><span>score</span></li>
        <li><b>${s.happy}%</b><span>happiness</span></li>
        <li><b>${s.stats.boarded}</b><span>boarded</span></li>
        <li><b>${s.stats.prioritySeated}</b><span>priority seats given</span></li>
        <li><b>${s.stats.left}</b><span>left behind</span></li>
        <li><b>${s.stats.excuse}</b><span>“excuse me”s</span></li>
      </ul>
      <div class="row">
        <button class="btn btn-ghost" id="lines">Lines</button>
        <button class="btn btn-ghost" id="retry">Retry</button>
        ${won && nextLine ? `<button class="btn btn-primary grow" id="next" autofocus>Next: ${esc(E.LINES[nextLine].name)}</button>` : `<button class="btn btn-primary grow" id="again" autofocus>${won ? 'Play again' : 'Try again'}</button>`}
      </div>`, 'over');
    panel.style.setProperty('--team', line.color);
    on('#lines', () => goSetup());
    on('#retry', () => start(line.id));
    on('#again', () => start(line.id));
    on('#next', () => { write(PREF_KEY, { line: nextLine }); start(nextLine); });
  }

  goSetup();
  return { get state() { return s; } };
}
