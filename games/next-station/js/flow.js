// Next Station — screen flow shared by the 2D and 3D builds (setup, driving, station cards, results).
import * as E from './engine.js';
import { chime, Motor, unlockAudio } from './audio.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';
import { confetti } from '../../../assets/lib/fx.js';

const PREF_KEY = 'nextstation.setup';
const BEST_KEY = 'nextstation.best';
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(Math.abs(t) % 60)).padStart(2, '0')}`;
const PLAYER_COLORS = ['#D7263D', '#2D6FD1', '#2F9E5B', '#E8590C'];
const NOTCH_LABEL = { P3: 'Full power', P2: 'Power', P1: 'Low power', N: 'Coast', B1: 'Light brake', B2: 'Brake', B3: 'Hard brake', EB: 'Emergency' };

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3.5h6.5a4 4 0 0 1 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 5.5l2 2 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3L2.8 9.5l6.4-.9z" fill="currentColor"/></svg>',
};

const RULES_HTML = `
  <h2>How to play</h2>
  <p>You're the train captain. Drive from station to station and stop with the front of the train right on the <b>STOP</b> board, so the train doors line up with the platform screen doors.</p>
  <ol class="rules-steps">
    <li><b>The master controller</b> has eight notches: three of power (P1–P3), coast (N), three of brake (B1–B3) and the emergency brake (EB). Drag it, tap a notch, or use ↑ and ↓.</li>
    <li><b>Mind the speed limits.</b> A yellow sign warns of a limit ahead; the red-ringed sign starts it, and it ends when the whole train has passed the sign with a slash. Go too fast and the automatic train protection (ATP) brakes for you, with a penalty.</li>
    <li><b>Stopping:</b> start braking early, and ease off to B1 just before you stop. Within 0.3 m is a Perfect. Stop short and you'll have to creep forward; overshoot by more than 4 m and the stop doesn't count.</li>
    <li><b>Each station scores</b> up to 100 for the stop, 50 for keeping to the timetable and 50 for passenger comfort. Sudden flips between power and brake, the emergency brake and hard stops make standing passengers stumble.</li>
    <li><b>The lines:</b> Kaya is gentle and lights up the brake notch you need. Teh adds tunnels and more limits. Bandung runs at night in the rain: the brakes are weaker and the wheels can slip, with no guide light.</li>
  </ol>
  <p class="hint">Keyboard: ↑/W more power, ↓/S more brake, N coast, E emergency brake, P pause.</p>`;

export function startFlow({ root, createBoard, hubHref, altHref, altLabel }) {
  let s = null;            // the run being driven (or the demo)
  let mode = 'setup';
  let paused = false;
  let raf = 0, last = 0;
  let players = [];        // [{ name, color, total, results, stars }]
  let turn = 0;
  let lineId = 'kaya';
  const motor = new Motor();

  root.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="${hubHref}" aria-label="Back to SG Games">${ICON.back}</a>
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>Next<b>Station</b></span></div>
      <div class="status" id="status" aria-live="polite"></div>
      <div class="bar-actions">
        <button class="icon-btn" id="btn-pause" aria-label="Pause" hidden>${ICON.pause}</button>
        <button class="icon-btn" id="btn-rules" aria-label="How to play">${ICON.help}</button>
        <button class="icon-btn" id="btn-sound" aria-label="Toggle sound"></button>
        <button class="icon-btn" id="btn-menu" aria-label="Menu" aria-haspopup="true">${ICON.menu}</button>
      </div>
      <div class="menu" id="menu" hidden>
        <button data-act="rules">How to play</button>
        <button data-act="restart">Restart this line</button>
        <button data-act="new">Quit to setup</button>
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
  const board = createBoard($('#stage'));

  const soundBtn = $('#btn-sound');
  const paintSound = () => { soundBtn.innerHTML = sfx.muted ? ICON.mute : ICON.sound; soundBtn.setAttribute('aria-pressed', String(!sfx.muted)); };
  paintSound();
  soundBtn.onclick = () => { sfx.setMuted(!sfx.muted); paintSound(); sfx.tap(); };
  const showRules = () => { sfx.tap(); if (mode === 'drive') setPaused(true); $('#rules').showModal(); };
  $('#btn-rules').onclick = showRules;
  const menu = $('#menu');
  $('#btn-menu').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; sfx.tap(); if (!menu.hidden && mode === 'drive') setPaused(true); };
  document.addEventListener('click', () => { menu.hidden = true; });
  menu.querySelector('[data-act="rules"]').onclick = showRules;
  menu.querySelector('[data-act="restart"]').onclick = () => { if (players.length) drive(); };
  menu.querySelector('[data-act="new"]').onclick = () => goSetup();
  $('#btn-pause').onclick = () => setPaused(!paused);
  document.addEventListener('pointerdown', () => { sfx.unlock(); unlockAudio(); }, { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'drive') setPaused(true); });

  document.addEventListener('keydown', (e) => {
    if ($('#rules').open || (e.target.matches && e.target.matches('input'))) return;
    const k = e.key.toLowerCase();
    if (mode === 'drive' && !paused && s && (s.phase === 'run' || s.phase === 'depart')) {
      if (k === 'arrowup' || k === 'w') { e.preventDefault(); moveNotch(s.notch + 1); }
      else if (k === 'arrowdown' || k === 's') { e.preventDefault(); moveNotch(s.notch - 1); }
      else if (k === 'n') moveNotch(E.N_IDX);
      else if (k === 'e') moveNotch(0);
    }
    if ((k === 'p' || k === 'escape') && mode === 'drive') setPaused(!paused);
    if (k === 'enter' && !(e.target.closest && e.target.closest('button'))) { const b = panel.querySelector('#go, #next, #again, #resume'); if (b) { e.preventDefault(); b.click(); } }
  });

  // ---------------- helpers ----------------
  function setPanel(html, cls = '', color) {
    panel.className = `panel ${cls}`;
    panel.style.setProperty('--team', color || (s ? s.line.color : '#D7263D'));
    panel.innerHTML = `<div class="panel-inner">${html}</div>`;
    const first = panel.querySelector('[autofocus]');
    if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }
  const on = (q, fn) => { const b = panel.querySelector(q); if (b) b.onclick = (e) => { sfx.tap(); fn(e); }; };
  const starsHTML = (n, of = 3) => `<span class="stars" aria-label="${n} of ${of} stars">${Array.from({ length: of }, (_, i) => `<i class="${i < n ? 'on' : ''}">${ICON.star}</i>`).join('')}</span>`;
  const best = () => read(BEST_KEY) || {};

  function paintStatus() {
    if (!s || mode === 'setup' || mode === 'demo') { statusEl.innerHTML = ''; return; }
    const p = players[turn];
    statusEl.innerHTML = `<span class="line-chip" style="--line:${s.line.color}">${esc(s.line.name)}</span>
      <span class="station"><b>${players.length > 1 ? `${esc(p.name)} · ` : ''}Stop ${Math.min(s.seg + 1, s.line.segs.length)} of ${s.line.segs.length}</b><small>${s.total} pts</small></span>`;
  }

  // ---------------- the loop ----------------
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    frame(dt);
  }
  function frame(dt) {
    if (!s) return;
    if (mode === 'demo') autopilot(s);
    const run = !paused && (mode === 'drive' || mode === 'demo');
    if (run) {
      const ev = E.step(s, dt);
      if (mode === 'drive') ev.forEach(handle);
      else if (ev.some((e) => e.type === 'done')) { s = E.newRun(lineId, { seed: 4 }); board.load(s); }
    }
    board.render(s, run ? dt : 0);
    if (mode === 'drive') { motor.update(paused ? 0 : s.v, paused ? 0 : s.a); tickPanel(); }
  }
  function startLoop() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }

  // a simple driver for the attract mode behind the setup screen
  function autopilot(r) {
    if (r.phase !== 'run') return;
    const lim = E.limitAt(r, r.x) / 3.6;
    const g = E.guideNotch(r);
    let want = r.v < lim - 2 ? 7 : r.v < lim - 0.6 ? 5 : 4;
    for (const z of r.map.zones) { const dz = z.from - r.x; const vz = z.kmh / 3.6; if (dz > 0 && r.v > vz - 0.5 && (r.v ** 2 - vz ** 2) / 1.8 + r.v > dz) want = r.v > vz ? 2 : 4; }
    if (g != null) want = g;
    else if (r.notch < E.N_IDX && E.nextMark(r) - r.x < 60) want = r.notch;
    if (r.v < 1 && E.nextMark(r) - r.x > 0.8 && E.nextMark(r) - r.x < 60) want = r.v < 0.5 ? 5 : 4;
    if (r.v < 1.2 && E.nextMark(r) - r.x <= 0.8) want = 3;
    if (want !== r.notch) E.setNotch(r, want);
  }

  function setPaused(p) {
    if (mode !== 'drive') return;
    paused = p;
    if (p) {
      motor.update(0, 0);
      const pp = players[turn];
      setPanel(`<p class="kicker">${esc(s.line.name)}</p><h2>Paused</h2>
        <p class="sub">Next stop: <b>${esc(E.station(s, Math.min(s.seg + 1, s.line.stations.length - 1)))}</b>${players.length > 1 ? ` · ${esc(pp.name)} driving` : ''}</p>
        <button class="btn btn-primary wide big" id="resume" autofocus>Resume</button>
        <div class="row"><button class="btn btn-ghost grow" id="restart">Restart line</button><button class="btn btn-ghost grow" id="quit">Setup</button></div>`, 'paused');
      on('#resume', () => setPaused(false));
      on('#restart', () => drive());
      on('#quit', () => goSetup());
    } else {
      last = performance.now();
      drivePanel();
    }
  }

  // ---------------- setup ----------------
  function goSetup() {
    mode = 'setup';
    paused = false;
    motor.stop();
    $('#btn-pause').hidden = true;
    const pref = read(PREF_KEY) || {};
    lineId = E.LINES[pref.line] ? pref.line : 'kaya';
    let count = [1, 2, 3, 4].includes(pref.count) ? pref.count : 1;
    const names = pref.names || ['Captain', 'Player 2', 'Player 3', 'Player 4'];
    s = E.newRun(lineId, { seed: 4 });
    board.load(s);
    if (board.setMode) board.setMode('demo');
    board.hud.show(false);
    mode = 'demo';
    paintStatus();
    startLoop();
    const B = best();
    const lineCards = () => E.LINE_IDS.map((id) => {
      const L = E.LINES[id];
      const b = B[id];
      return `<button type="button" class="line-card" role="radio" aria-checked="${id === lineId}" data-id="${id}" style="--line:${L.color}">
        <span class="dot" aria-hidden="true"></span>
        <span><b>${L.name}</b><small>${L.level} · ${L.stations.length} stations${L.weather === 'rain' ? ' · rain, night' : L.time === 'dusk' ? ' · tunnels' : ''}</small></span>
        <span class="best">${b ? `${starsHTML(b.stars)}<small>${b.total}</small>` : '<small>New</small>'}</span>
      </button>`;
    }).join('');
    const nameRows = () => Array.from({ length: count }, (_, i) => `<label class="pname" style="--c:${PLAYER_COLORS[i]}"><span>${i + 1}</span><input id="pn${i}" maxlength="12" value="${esc(names[i])}" aria-label="Driver ${i + 1} name"/></label>`).join('');
    setPanel(`
      <p class="kicker">Be the MRT train captain</p>
      <h1 class="title">Next <span>Station</span></h1>
      <p class="sub">Keep under the limits, keep your passengers on their feet, and stop right at the doors.</p>
      <p class="rotate-hint">${ICON.phone}<span><b>Best in landscape.</b> Turn your phone sideways for the full view.</span></p>
      <div class="lines" role="radiogroup" aria-label="Line">${lineCards()}</div>
      <fieldset class="seg" aria-label="Drivers"><legend>Drivers</legend>${[1, 2, 3, 4].map((n) => `<label><input type="radio" name="np" value="${n}" ${n === count ? 'checked' : ''}/><span>${n}</span></label>`).join('')}</fieldset>
      <div class="pnames" ${count > 1 ? '' : 'hidden'}>${nameRows()}</div>
      <div class="row">
        <button type="button" class="btn btn-ghost" id="how">How to play</button>
        <button class="btn btn-primary grow" id="go" autofocus>Start driving</button>
      </div>`, 'setup', E.LINES[lineId].color);
    const readNames = () => { for (let i = 0; i < count; i++) { const v = panel.querySelector(`#pn${i}`); if (v) names[i] = v.value.trim() || `Player ${i + 1}`; } };
    panel.querySelectorAll('.line-card').forEach((b) => {
      b.onclick = () => {
        sfx.tap();
        lineId = b.dataset.id;
        panel.querySelectorAll('.line-card').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        panel.style.setProperty('--team', E.LINES[lineId].color);
        s = E.newRun(lineId, { seed: 4 }); board.load(s);
      };
    });
    panel.querySelectorAll('input[name="np"]').forEach((r) => {
      r.onchange = () => { sfx.tap(); readNames(); count = +r.value; const w = panel.querySelector('.pnames'); w.innerHTML = nameRows(); w.hidden = count < 2; };
    });
    on('#how', showRules);
    on('#go', () => {
      readNames();
      write(PREF_KEY, { line: lineId, count, names });
      players = Array.from({ length: count }, (_, i) => ({ name: count === 1 ? 'You' : names[i], color: PLAYER_COLORS[i], total: 0, results: [], stars: 0 }));
      turn = 0;
      drive();
    });
  }

  // ---------------- driving ----------------
  function drive() {
    s = E.newRun(lineId);
    mode = 'drive';
    paused = false;
    board.load(s);
    if (board.setMode) board.setMode('drive');
    board.hud.show(true);
    board.hud.clearToasts();
    $('#btn-pause').hidden = false;
    motor.start();
    paintStatus();
    drivePanel();
    board.hud.toast(`<small>${esc(s.line.name)}</small>Next station: <b>${esc(E.station(s, 1))}</b>`, 'info', 2200);
    chime.closing();
    startLoop();
  }

  function moveNotch(k) {
    if (!s || mode !== 'drive' || paused) return;
    if (s.phase !== 'run' && s.phase !== 'depart') return;
    const before = s.notch;
    const ev = E.setNotch(s, k);
    if (s.notch !== before) { chime.notch(s.notch > before); buzz(6); }
    ev.forEach(handle);
    paintLever();
  }

  function drivePanel() {
    const notches = E.NOTCHES.map((n, i) => ({ n, i })).reverse();
    setPanel(`
      <div class="drive">
        <div class="lever" id="lever" role="slider" tabindex="0" aria-label="Master controller" aria-valuemin="0" aria-valuemax="7">
          <ol class="notches">${notches.map(({ n, i }) => `<li data-k="${i}" class="${n === 'N' ? 'n' : n === 'EB' ? 'eb' : n[0] === 'P' ? 'p' : 'b'}"><span>${n}</span></li>`).join('')}</ol>
          <i class="handle" aria-hidden="true"><b></b></i>
        </div>
        <div class="info">
          <p class="kicker" id="i-k">Next station</p>
          <h2 id="i-name"></h2>
          <p class="big"><b id="i-dist">0</b><small> m</small></p>
          <dl class="readouts">
            <div><dt>Timetable</dt><dd id="i-time"></dd></div>
            <div><dt>Comfort</dt><dd><span class="meter"><i id="i-comfort"></i></span></dd></div>
          </dl>
          <p class="tip" id="i-tip"></p>
        </div>
      </div>`, 'driving');
    const lever = panel.querySelector('#lever');
    const pick = (e) => {
      const r = lever.querySelector('.notches').getBoundingClientRect();
      const f = Math.max(0, Math.min(0.999, (e.clientY - r.top) / r.height));
      moveNotch(7 - Math.floor(f * 8));
    };
    let drag = false;
    lever.addEventListener('pointerdown', (e) => { drag = true; lever.setPointerCapture(e.pointerId); pick(e); });
    lever.addEventListener('pointermove', (e) => { if (drag) pick(e); });
    lever.addEventListener('pointerup', () => { drag = false; });
    lever.addEventListener('pointercancel', () => { drag = false; });
    lever.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); moveNotch(s.notch + 1); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); moveNotch(s.notch - 1); }
    });
    paintLever();
    tickPanel(true);
  }

  function paintLever() {
    const lever = panel.querySelector('#lever');
    if (!lever || !s) return;
    const k = s.atp ? 0 : s.notch;
    lever.style.setProperty('--pos', String(7 - k));
    lever.setAttribute('aria-valuenow', String(k));
    lever.setAttribute('aria-valuetext', `${E.NOTCHES[k]}: ${NOTCH_LABEL[E.NOTCHES[k]]}`);
    lever.querySelector('.handle b').textContent = E.NOTCHES[k];
    lever.dataset.side = k > E.N_IDX ? 'p' : k < E.N_IDX ? 'b' : 'n';
    lever.classList.toggle('atp', !!s.atp);
  }

  let tipKey = '';
  function tickPanel(force = false) {
    if (!s || paused) return;
    const nameEl = panel.querySelector('#i-name');
    if (!nameEl) return;
    const i = Math.min(s.seg + 1, s.line.stations.length - 1);
    const d = E.nextMark(s) - s.x;
    if (force || nameEl.textContent !== s.line.stations[i]) nameEl.textContent = s.line.stations[i];
    panel.querySelector('#i-k').textContent = s.phase === 'doors' ? 'Doors open at' : 'Next station';
    panel.querySelector('#i-dist').textContent = s.phase === 'doors' ? '0' : d > 20 ? Math.round(d) : d.toFixed(1);
    const sched = s.sched[Math.min(s.seg, s.sched.length - 1)];
    const t = s.phase === 'run' ? s.segT : 0;
    const left = sched - t;
    const te = panel.querySelector('#i-time');
    te.textContent = s.phase === 'run' ? (left >= 0 ? `${mmss(left)} to go` : `${mmss(-left)} late`) : mmss(sched);
    te.className = s.phase === 'run' && left < -3 ? 'late' : '';
    const c = panel.querySelector('#i-comfort');
    c.style.width = `${Math.max(0, s.comfort) * 2}%`;
    c.className = s.comfort < 20 ? 'low' : s.comfort < 38 ? 'mid' : '';
    // the guide light and a short tip
    const gNotch = s.line.guide ? E.guideNotch(s) : null;
    panel.querySelectorAll('.notches li').forEach((li) => li.classList.toggle('guide', +li.dataset.k === gNotch));
    let tip = '';
    if (s.phase === 'depart') tip = 'Doors closing… get ready';
    else if (s.phase === 'doors') tip = 'Passengers boarding';
    else if (s.atp) tip = '<b class="bad">ATP braking</b>: over the limit';
    else if (s.v < 0.3 && d > 30) tip = 'Push the lever up to P to move off';
    else if (gNotch != null) tip = `Brake <b>${E.NOTCHES[gNotch]}</b> to stop on the mark`;
    else if (s.notch < E.N_IDX && d < 25 && d > 0 && s.v > 0.3) tip = 'Ease off to <b>B1</b> just before you stop';
    else if (s.line.guide && s.v > 3 && s.notch >= E.N_IDX) { const bp = E.brakePoint(s); if (bp > 0 && bp < 160) tip = `Start braking in <b>${Math.round(bp)} m</b>`; }
    if (!tip && d < 6 && d > 0.5 && s.v < 1) tip = 'Creep forward on <b>P1</b>, then brake';
    if (tip !== tipKey) { tipKey = tip; panel.querySelector('#i-tip').innerHTML = tip; }
    paintLever();
  }

  function handle(ev) {
    const hud = board.hud;
    switch (ev.type) {
      case 'go': hud.toast(`Go! Next: <b>${esc(E.station(s, s.seg + 1))}</b>`, 'info', 1400); break;
      case 'close': chime.closing(); paintStatus(); hud.toast(`Doors closing · next stop <b>${esc(E.station(s, s.seg + 1))}</b>`, 'info', 1600); break;
      case 'warn': chime.warn(); break;
      case 'atp': chime.atp(); buzz(60); hud.toast(ev.lim ? `ATP brake! Limit is ${ev.lim}` : 'ATP brake! Way past the mark', 'bad'); break;
      case 'jolt': hud.toast('Oof! Smoothly, captain', 'warn', 1200); break;
      case 'eb': hud.toast('Emergency brake!', 'bad', 1300); buzz(40); break;
      case 'jerkstop': hud.toast('Jerky stop: ease off to B1 at the end', 'warn', 1600); break;
      case 'slip': hud.toast('Wheel slip on the wet rails!', 'warn', 1200); break;
      case 'overshoot': chime.bad(); hud.toast('Overshot the mark!', 'bad'); break;
      case 'short': chime.bad(); hud.toast(`Stopped ${(-ev.err).toFixed(1)} m short. Creep forward`, 'warn', 1800); break;
      case 'arrive': arrive(ev.r); break;
      case 'done': finishRun(); break;
      default: break;
    }
    if (board.event) board.event(ev, s);
  }

  function arrive(r) {
    const great = r.grade === 'Perfect' || r.grade === 'Great';
    if (r.grade === 'Perfect') { chime.perfect(); buzz(30); } else if (great || r.grade === 'Good') chime.good(); else chime.bad();
    setTimeout(() => chime.opening(), 350);
    board.hud.toast(`<b>${r.grade}</b>${r.grade !== 'Overshot' ? ` <small>${Math.abs(r.err).toFixed(2)} m ${r.err < 0 ? 'short' : 'past'}</small>` : ''}`, `grade g-${r.grade.toLowerCase()}`, 2000);
    paintStatus();
    setPanel(`
      <p class="kicker">Arrived · ${esc(r.station)}</p>
      <h2 class="grade-h g-${r.grade.toLowerCase()}">${r.grade}!</h2>
      <ul class="scorecard">
        <li><span>Stop ${r.grade === 'Overshot' ? '' : `<small>${Math.abs(r.err).toFixed(2)} m</small>`}</span><b>${r.stopPts}</b></li>
        <li><span>Timetable <small>${mmss(r.time)} / ${mmss(r.sched)}${r.late > 3 ? ' late' : r.late < -3 ? ' early' : ' on time'}</small></span><b>${r.timePts}</b></li>
        <li><span>Comfort</span><b>${r.comfort}</b></li>
        ${r.pens.map((p) => `<li class="pen"><span>${esc(p.what)}</span><b>−${p.pts}</b></li>`).join('')}
        <li class="sum"><span>Station total</span><b>${r.total}</b></li>
      </ul>
      <p class="hint">${s.seg >= s.line.segs.length ? 'End of the line!' : 'Doors closing shortly…'}</p>`, 'arrived');
    setTimeout(() => { if (mode === 'drive' && s && s.phase !== 'done' && !paused) drivePanel(); }, (E.DOOR_TIME + 0.1) * 1000);
  }

  function finishRun() {
    motor.update(0, 0);
    const p = players[turn];
    p.total = s.total; p.results = s.results.slice(); p.stars = E.stars(s);
    const B = best();
    const prev = B[lineId];
    const isBest = !prev || s.total > prev.total;
    if (isBest) { B[lineId] = { total: s.total, stars: p.stars }; write(BEST_KEY, B); }
    if (p.stars >= 2 || isBest) confetti({ count: 160, colors: [s.line.color, '#F2B134', '#fff', '#2D6FD1'] });
    if (p.stars) sfx.win(); else sfx.score(0);
    const table = `<ol class="runlist">${s.results.map((r) => `<li><span>${esc(r.station)}</span><em class="g-${r.grade.toLowerCase()}">${r.grade}</em><b>${r.total}</b></li>`).join('')}</ol>`;
    const moreDrivers = turn < players.length - 1;
    setPanel(`
      <p class="kicker">${esc(s.line.name)} complete${players.length > 1 ? ` · ${esc(p.name)}` : ''}</p>
      <h2>${s.total} <small>points</small></h2>
      ${starsHTML(p.stars)}${isBest && players.length === 1 ? '<p class="newbest">New best for this line!</p>' : ''}
      ${table}
      ${moreDrivers ? `<button class="btn btn-primary wide big" id="next" autofocus>Next driver: ${esc(players[turn + 1].name)}</button>`
        : players.length > 1 ? `<button class="btn btn-primary wide big" id="next" autofocus>See who drives best</button>`
        : `<div class="row"><button class="btn btn-ghost" id="setup">Lines</button><button class="btn btn-primary grow" id="again" autofocus>Drive again</button></div>`}`, 'over');
    on('#next', () => { if (moreDrivers) { turn += 1; drive(); } else standings(); });
    on('#again', () => drive());
    on('#setup', () => goSetup());
  }

  function standings() {
    mode = 'over';
    motor.stop();
    const order = players.map((p, i) => i).sort((a, b) => players[b].total - players[a].total);
    const w = players[order[0]];
    confetti({ count: 220, colors: [w.color, '#F2B134', '#fff'] });
    sfx.win();
    setPanel(`
      <p class="kicker">${esc(E.LINES[lineId].name)} · ${players.length} drivers</p>
      <h2 class="win" style="color:${w.color}">${esc(w.name)} drives best!</h2>
      <ol class="podium-list">${order.map((i) => `<li style="--c:${players[i].color}"><span>${esc(players[i].name)}</span>${starsHTML(players[i].stars)}<b>${players[i].total}</b></li>`).join('')}</ol>
      <div class="row"><button class="btn btn-ghost" id="setup">Setup</button><button class="btn btn-primary grow" id="again" autofocus>Play again</button></div>`, 'over', w.color);
    on('#setup', () => goSetup());
    on('#again', () => { players.forEach((p) => { p.total = 0; p.results = []; p.stars = 0; }); turn = 0; drive(); });
  }

  goSetup();
  // frame() is exposed so the game can be stepped by hand (handy when testing in a background tab)
  return { get state() { return s; }, get mode() { return mode; }, frame, moveNotch };
}
