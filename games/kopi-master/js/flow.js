// Kopi Master — screen flow shared by the 2D and 3D builds.
import * as E from './engine.js';
import { icon } from './art.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';
import { confetti } from '../../../assets/lib/fx.js';

const BEST_KEY = 'kopi.best';
const PREF_KEY = 'kopi.setup';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const money = (n) => `$${n.toFixed(2)}`;

const KEYS = { k: 'kopi', t: 'teh', m: 'milo', n: 'condensed', e: 'evaporated', s: 'sugar', i: 'ice', w: 'water', p: 'tarik', b: 'bag' };
const PAD = ['kopi', 'teh', 'milo', 'condensed', 'evaporated', 'sugar', 'ice', 'water', 'tarik', 'bag'];
const SHORT = { kopi: 'Kopi', teh: 'Teh', milo: 'Milo', condensed: 'Condensed', evaporated: 'Evap (C)', sugar: 'Sugar', ice: 'Ice (peng)', water: 'Water (po)', tarik: 'Tarik', bag: 'Tapau bag' };
const KEYCAP = Object.fromEntries(Object.entries(KEYS).map(([k, v]) => [v, k.toUpperCase()]));

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8h8M8 11h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3.5h6.5a4 4 0 0 1 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 5.5l2 2 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z" fill="currentColor"/></svg>',
  cup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" fill="currentColor"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};

const GLOSS_HTML = `<table class="gloss">${E.GLOSSARY.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</table>`;
const RULES_HTML = `
  <h2>How to play Kopi Master</h2>
  <p>You run the drinks stall. Customers call their orders in kopitiam lingo. Build each drink and serve it before they lose patience.</p>
  <ol class="rules-steps">
    <li><b>Pick a customer.</b> The one with the teal <i>SERVING</i> tag gets the next drink. Tap another bubble to switch.</li>
    <li><b>Build the drink.</b> Tap the ingredients into the cup, in any order. Sugar is counted in spoons.</li>
    <li><b>Serve.</b> Right drink = price + a tip for speed. Wrong drink or a customer walking off = a strike. Three strikes and Auntie sends you home.</li>
    <li><b>Mistake?</b> Tap the bin to start the cup again.</li>
  </ol>
  <h3>The lingo</h3>${GLOSS_HTML}
  <p class="hint">Keyboard: K kopi · T teh · M Milo · N condensed · E evaporated · S sugar · I ice · W water · P tarik · B bag · Backspace bin · Enter serve · 1–3 pick customer.</p>`;

export function startFlow({ root, createBoard, hubHref, altHref, altLabel }) {
  let s = null;
  let raf = 0;
  let last = 0;
  let paused = false;
  let msg = '';
  let msgKind = '';

  root.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="${hubHref}" aria-label="Back to SG Games">${ICON.back}</a>
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>Kopi<b>Master</b></span></div>
      <div class="status" id="status" aria-live="polite"></div>
      <div class="bar-actions">
        <button class="icon-btn" id="btn-gloss" aria-label="Lingo cheat sheet">${ICON.book}</button>
        <button class="icon-btn" id="btn-rules" aria-label="How to play">${ICON.help}</button>
        <button class="icon-btn" id="btn-sound" aria-label="Toggle sound"></button>
        <button class="icon-btn" id="btn-menu" aria-label="Menu" aria-haspopup="true">${ICON.menu}</button>
      </div>
      <div class="menu" id="menu" hidden>
        <button data-act="rules">How to play</button>
        <button data-act="new">Quit to shift select</button>
        ${altHref ? `<a href="${altHref}">${altLabel}</a>` : ''}
        <a href="${hubHref}">All SG Games</a>
      </div>
    </header>
    <main class="stage" id="stage"></main>
    <section class="panel" id="panel" aria-live="polite"></section>
    <dialog class="sheet" id="rules"><div class="sheet-body">${RULES_HTML}</div><form method="dialog"><button class="btn btn-primary wide">Got it</button></form></dialog>
    <dialog class="sheet small" id="gloss"><div class="sheet-body"><h2>Kopitiam lingo</h2>${GLOSS_HTML}</div><form method="dialog"><button class="btn btn-primary wide">Back to the stall</button></form></dialog>
    <div class="toasts" id="toasts" aria-live="polite"></div>`;

  const $ = (q) => root.querySelector(q);
  const panel = $('#panel');
  const statusEl = $('#status');
  const board = createBoard($('#stage'));
  board.onSelect = (id) => { if (!s || s.phase !== 'play') return; E.select(s, id); sfx.tap(); board.sync(s); paintPad(); };

  const soundBtn = $('#btn-sound');
  const paintSound = () => { soundBtn.innerHTML = sfx.muted ? ICON.mute : ICON.sound; soundBtn.setAttribute('aria-pressed', String(!sfx.muted)); };
  paintSound();
  soundBtn.onclick = () => { sfx.setMuted(!sfx.muted); paintSound(); sfx.tap(); };
  const openDlg = (id) => { sfx.tap(); paused = true; $(id).showModal(); };
  for (const id of ['#rules', '#gloss']) $(id).addEventListener('close', () => { paused = false; last = performance.now(); });
  $('#btn-rules').onclick = () => openDlg('#rules');
  $('#btn-gloss').onclick = () => openDlg('#gloss');
  const menu = $('#menu');
  $('#btn-menu').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; sfx.tap(); };
  document.addEventListener('click', () => { menu.hidden = true; });
  menu.querySelector('[data-act="rules"]').onclick = () => openDlg('#rules');
  menu.querySelector('[data-act="new"]').onclick = () => { stop(); goSetup(); };
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) paused = true; else if (!$('#rules').open && !$('#gloss').open) { paused = false; last = performance.now(); } });

  document.addEventListener('keydown', (e) => {
    if (!s || s.phase !== 'play' || paused || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (KEYS[k]) { addIng(KEYS[k]); e.preventDefault(); }
    else if (k === 'backspace' || k === 'x') { binCup(); e.preventDefault(); }
    else if (k === 'enter' || k === ' ') { serve(); e.preventDefault(); }
    else if (/^[1-3]$/.test(k)) { const c = s.counter[+k - 1]; if (c) { E.select(s, c.id); board.sync(s); paintPad(); } }
  });

  function toast(html, kind = '') {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.innerHTML = html;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 1500);
    setTimeout(() => t.remove(), 2000);
  }

  function paintStatus() {
    if (!s) { statusEl.innerHTML = ''; return; }
    const sh = E.shiftOf(s);
    const t = Number.isFinite(s.timeLeft) ? `${Math.floor(s.timeLeft / 60)}:${String(Math.floor(s.timeLeft % 60)).padStart(2, '0')}` : '∞';
    statusEl.innerHTML = `
      <span class="line-chip" style="--line:#6B3E26">${esc(sh.name)}</span>
      <span class="clock ${Number.isFinite(s.timeLeft) && s.timeLeft < 15 ? 'hurry' : ''}" title="Time left">${t}</span>
      <span class="score-pill" title="Earnings">${money(s.earnings)}</span>
      <span class="strikes" title="Strikes">${[0, 1, 2].map((i) => `<i class="${i < s.strikes ? 'on' : ''}">${ICON.cup}</i>`).join('')}</span>`;
  }

  function setPanel(html, cls = '') {
    panel.className = `panel ${cls}`;
    panel.innerHTML = `<div class="panel-inner">${html}</div>`;
    const first = panel.querySelector('[autofocus]');
    if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }
  const on = (q, fn) => { const b = panel.querySelector(q); if (b) b.onclick = (e) => { sfx.tap(); fn(e); }; };

  // ---------------- setup ----------------
  function goSetup() {
    stop();
    s = null;
    paintStatus();
    const pref = read(PREF_KEY) || {};
    let shiftId = E.SHIFTS[pref.shift] ? pref.shift : 'breakfast';
    const best = read(BEST_KEY) || {};
    const demo = E.newGame(shiftId, 42);
    for (let i = 0; i < 40; i++) E.tick(demo, 0.5);
    demo.cup = { ...demo.cup, kopi: 1, condensed: 1, sugar: 2 };
    board.load(demo);
    if (board.setMode) board.setMode('idle');
    setPanel(`
      <p class="kicker">Kopitiam drinks stall</p>
      <h1 class="title">Kopi <span>Master</span></h1>
      <p class="sub">Kopi C siew dai peng? Teh O kosong? Learn the lingo, serve fast, earn tips.</p>
      <p class="rotate-hint">${ICON.phone}<span><b>Best in landscape.</b> Turn your phone sideways for a bigger counter.</span></p>
      <div class="lines" role="radiogroup" aria-label="Choose a shift">
        ${Object.values(E.SHIFTS).map((sh) => {
          const b = best[sh.id];
          return `<button type="button" role="radio" class="line-card" data-shift="${sh.id}" aria-checked="${sh.id === shiftId}" style="--line:#6B3E26">
            <span class="dot"></span>
            <span class="meta"><b>${sh.name}</b><small>${sh.level} · ${sh.blurb}</small></span>
            <span class="best">${[1, 2, 3].map((i) => `<i class="${b && b.stars >= i ? 'on' : ''}">${ICON.star}</i>`).join('')}${b ? `<small>${money(b.earnings)}</small>` : ''}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="row">
        <button type="button" class="btn btn-ghost" id="how">How to play</button>
        <button type="button" class="btn btn-ghost" id="lingo">${ICON.book} Lingo</button>
        <button class="btn btn-primary grow" id="start" autofocus>Open the stall</button>
      </div>`, 'setup');
    panel.querySelectorAll('.line-card').forEach((b) => {
      b.onclick = () => { sfx.tap(); shiftId = b.dataset.shift; panel.querySelectorAll('.line-card').forEach((x) => x.setAttribute('aria-checked', String(x === b))); };
    });
    on('#how', () => openDlg('#rules'));
    on('#lingo', () => openDlg('#gloss'));
    on('#start', () => { write(PREF_KEY, { shift: shiftId }); start(shiftId); });
  }

  // ---------------- play ----------------
  function start(id) {
    s = E.newGame(id);
    msg = 'First customer coming…';
    msgKind = '';
    board.load(s);
    if (board.setMode) board.setMode('play');
    paintStatus();
    paintPad();
    last = performance.now();
    loop(last);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  let statusClock = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!s || paused) return;
    const ev = E.tick(s, dt);
    for (const e of ev) {
      if (e.type === 'spawn') { board.sync(s); sfx.plop(); paintPad(); }
      if (e.type === 'leave') { board.animateLeave(e.customer, s); flash(`“${e.customer.order.text}” customer walked off. Strike!`, 'bad'); sfx.claim(false); buzz(40); paintPad(); }
      if (e.type === 'over') { finish(); return; }
    }
    board.updatePatience(s);
    statusClock += dt;
    if (statusClock > 0.25) { statusClock = 0; paintStatus(); }
  }

  function flash(text, kind) { msg = text; msgKind = kind; const el = panel.querySelector('.msg'); if (el) { el.textContent = msg; el.className = `msg ${kind}`; } }

  function current() { return s && (s.counter.find((c) => c.id === s.selected) || s.counter[0]); }

  function paintPad() {
    if (!s || s.phase !== 'play') return;
    const c = current();
    setPanel(`
      <div class="order-line">
        <p class="kicker">${c ? 'Serving' : 'Waiting for customers'}</p>
        <h2 class="order">${c ? esc(c.order.text) : '…'}</h2>
      </div>
      <div class="pad">
        ${PAD.map((k) => `<button class="ing ${s.cup[k] ? 'has' : ''}" data-ing="${k}" aria-label="Add ${esc(E.ING_LABEL[k])}">
          ${icon(k)}<span>${SHORT[k]}</span>${s.cup[k] ? `<b class="count">${s.cup[k]}</b>` : ''}<kbd>${KEYCAP[k]}</kbd></button>`).join('')}
      </div>
      <div class="row">
        <button class="btn btn-ghost small" id="bin">${icon('bin')} Bin</button>
        <button class="btn btn-primary grow big" id="serve" ${E.cupEmpty(s) || !c ? 'disabled' : ''}>${icon('serve')} Serve</button>
      </div>
      <p class="msg ${msgKind}">${esc(msg)}</p>`, 'playing');
    panel.querySelectorAll('.ing').forEach((b) => { b.onclick = () => addIng(b.dataset.ing); });
    on('#bin', () => binCup());
    on('#serve', () => serve());
  }

  function addIng(k) {
    if (!s || s.phase !== 'play') return;
    if (!E.add(s, k)) { flash(`That's enough ${E.ING_LABEL[k].toLowerCase()} already.`, 'bad'); sfx.claim(false); return; }
    sfx.plop();
    buzz(8);
    board.setCup(s.cup);
    if (board.pour) board.pour(k);
    msg = ''; msgKind = '';
    paintPad();
  }

  function binCup() {
    if (!s || E.cupEmpty(s)) return;
    E.bin(s);
    sfx.sweep();
    board.setCup(s.cup);
    flash('Cup thrown. Start again.', '');
    paintPad();
  }

  async function serve() {
    if (!s || s.phase !== 'play') return;
    const res = E.serve(s);
    if (!res.ok) { flash(res.reason, 'bad'); return; }
    if (res.good) {
      sfx.claim(true);
      buzz(15);
      const t = res.tip > 0 ? ` + ${money(res.tip)} tip` : '';
      flash(`Shiok! ${money(res.price)}${t}${s.streak >= 3 ? ` · ${s.streak} in a row!` : ''}`, 'good');
      if (s.streak && s.streak % 5 === 0) toast(`${s.streak} perfect drinks in a row!`, 'good');
    } else {
      sfx.claim(false);
      buzz([30, 30, 30]);
      flash(`Aiyo! ${res.why[0] || 'Wrong drink!'}`, 'bad');
      toast(`Strike ${s.strikes}/3 · ${esc(res.why.join(' '))}`, 'bad');
    }
    paintStatus();
    paintPad();
    await board.animateServe(res, s);
    if (s && s.phase === 'over') finish();
  }

  function finish() {
    if (!s || s.ended) return;
    s.ended = true;
    stop();
    const sh = E.shiftOf(s);
    const st = E.stars(s);
    const all = read(BEST_KEY) || {};
    const prev = all[sh.id];
    const newBest = !prev || s.earnings > prev.earnings;
    all[sh.id] = { earnings: Math.max(s.earnings, prev ? prev.earnings : 0), stars: Math.max(st, prev ? prev.stars : 0) };
    write(BEST_KEY, all);
    if (st >= 2) { sfx.win(); confetti({ count: 200, colors: ['#6B3E26', '#F2B134', '#FBF6EC', '#2F6B4F'] }); } else sfx.score(st ? 2 : 0);
    if (board.setMode) board.setMode('over');
    paintStatus();
    const ids = Object.keys(E.SHIFTS);
    const next = ids[ids.indexOf(sh.id) + 1];
    setPanel(`
      <p class="kicker">${esc(sh.name)} · ${s.fired ? 'three strikes' : 'shift over'}</p>
      <h2 class="win">${s.fired && sh.id !== 'endless' ? 'Auntie says go home…' : st === 3 ? 'Kopi Master!' : st === 2 ? 'Steady lah!' : st === 1 ? 'Can lah.' : 'Aiyo…'}</h2>
      <div class="stars big">${[1, 2, 3].map((i) => `<i class="${st >= i ? 'on' : ''}">${ICON.star}</i>`).join('')}</div>
      <p class="sub">You earned <b>${money(s.earnings)}</b>.${newBest ? ' <b class="newbest">New best!</b>' : ''}</p>
      <ul class="stats">
        <li><b>${s.served}</b><span>drinks served</span></li>
        <li><b>${s.bestStreak}</b><span>best streak</span></li>
        <li><b>${s.strikes}</b><span>strikes</span></li>
      </ul>
      <div class="row">
        <button class="btn btn-ghost" id="shifts">Shifts</button>
        <button class="btn btn-ghost" id="retry">Retry</button>
        ${next && st >= 1 ? `<button class="btn btn-primary grow" id="next" autofocus>Next: ${esc(E.SHIFTS[next].name)}</button>` : `<button class="btn btn-primary grow" id="again" autofocus>Play again</button>`}
      </div>`, 'over');
    on('#shifts', () => goSetup());
    on('#retry', () => start(sh.id));
    on('#again', () => start(sh.id));
    on('#next', () => { write(PREF_KEY, { shift: next }); start(next); });
  }

  goSetup();
  return { get state() { return s; } };
}
