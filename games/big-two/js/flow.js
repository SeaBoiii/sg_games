// Big Two — screen flow shared by the 2D and 3D builds (setup, the hand, turns, deals, results).
import * as E from './engine.js';
import { cardSVG, customerSVG, PATTERN_DEFS, orangeIcon, esc } from './art.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';
import { confetti } from '../../../assets/lib/fx.js';

const PREF_KEY = 'bigtwo.setup';
const BRAND = '#D7263D';
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const isYou = (name) => /^you$/i.test(String(name).trim());
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const QUIPS = {
  pass: ['Pass.', 'Pass lah', 'Cannot', 'Aiyo, pass', 'Pass first'],
  two: ['Big two!', 'Sorry ah!', 'Huat ah!', 'Wah!'],
  five: ['Five cards!', 'Ong ah!', 'Take that!', 'Steady!'],
  lead: ['My turn', 'Steady', 'Hehe'],
};

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3.5h6.5a4 4 0 0 1 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 5.5l2 2 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sort: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M3.5 16.5L7 20l3.5-3.5M17 20V4M13.5 7.5L17 4l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>',
};

const RULES_HTML = `
  <h2>How to play</h2>
  <p>Four players, 13 cards each. Be the first to get rid of all your cards.</p>
  <ol class="rules-steps">
    <li><b>Card order:</b> 3 is lowest, then 4 up to K and A, and the <b>2 is the biggest</b>. Suits break ties: ♦ &lt; ♣ &lt; ♥ &lt; ♠, so the 2♠ is the top card.</li>
    <li><b>Start:</b> whoever holds the 3♦ leads, and the first play must include it. In later deals, the last winner starts.</li>
    <li><b>Beat it or pass:</b> play the same number of cards, but higher: a single, a pair, three of a kind, or a five-card hand. Passing doesn't stop you playing when it comes round again.</li>
    <li><b>Five-card hands</b>, lowest to highest: <i>straight</i> (5 in a row, from 3-4-5-6-7 up to 10-J-Q-K-A; no 2s), <i>flush</i> (5 of one suit), <i>full house</i> (three + a pair), <i>four of a kind</i> (+ any card), <i>straight flush</i>. Two of the same type? The higher top card wins (for a full house or four of a kind, the higher three or four).</li>
    <li><b>New round:</b> when the other three all pass, whoever played last clears the table and leads anything.</li>
    <li><b>Oranges:</b> everyone starts with ${E.START_ORANGES} mandarin oranges. When someone goes out, the others each pay them 1 orange per card left (double with 10 or more, triple if you never played a card). Most oranges at the end wins.</li>
  </ol>
  <p class="hint">Tap cards, or swipe across them, to pick them. Keyboard: Enter plays, P passes, H gives a hint, S sorts.</p>`;

export function startFlow({ root, createBoard, hubHref, altHref, altLabel }) {
  let s = null;
  let busy = false;
  let token = 0;
  let viewer = null;          // seat whose cards are showing in the hand
  let sel = new Set();
  let sortMode = read('bigtwo.sort') || 'rank';
  let log = [];

  root.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="${hubHref}" aria-label="Back to SG Games">${ICON.back}</a>
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>Big<b>Two</b></span></div>
      <div class="status" id="status" aria-live="polite"></div>
      <div class="bar-actions">
        <button class="icon-btn" id="btn-rules" aria-label="How to play">${ICON.help}</button>
        <button class="icon-btn" id="btn-sound" aria-label="Toggle sound"></button>
        <button class="icon-btn" id="btn-menu" aria-label="Menu" aria-haspopup="true">${ICON.menu}</button>
      </div>
      <div class="menu" id="menu" hidden>
        <button data-act="rules">How to play</button>
        <button data-act="new">Quit to setup</button>
        ${altHref ? `<a href="${altHref}">${altLabel}</a>` : ''}
        <a href="${hubHref}">All SG Games</a>
      </div>
    </header>
    <main class="stage" id="stage">
      <div class="table" id="table"></div>
      <div class="hand" id="hand" aria-label="Your hand"></div>
    </main>
    <section class="panel" id="panel" aria-live="polite"></section>
    <dialog class="sheet" id="rules"><div class="sheet-body">${RULES_HTML}</div><form method="dialog"><button class="btn btn-primary wide">Got it</button></form></dialog>`;

  const $ = (q) => root.querySelector(q);
  const panel = $('#panel');
  const statusEl = $('#status');
  const handEl = $('#hand');
  const board = createBoard($('#table'));

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
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

  document.addEventListener('keydown', (e) => {
    if (!s || busy || $('#rules').open || (e.target.matches && e.target.matches('input'))) return;
    const k = e.key.toLowerCase();
    const click = (q) => { const b = panel.querySelector(q); if (b && !b.disabled) { e.preventDefault(); b.click(); return true; } return false; };
    if (k === 'enter' && !(e.target.closest && e.target.closest('button'))) { click('#play') || click('#show') || click('#next'); }
    else if (k === 'p') click('#pass');
    else if (k === 'h') click('#hint');
    else if (k === 's') click('#sort');
  });

  // ---------------- helpers ----------------
  const multi = () => s && E.humans(s) > 1;
  const nameOf = (p) => esc(s.players[p].name);
  const verb = (p, you, them) => (isYou(s.players[p].name) ? you : them);

  function paintStatus() {
    if (!s || s.phase === 'idle') { statusEl.innerHTML = ''; return; }
    const me = s.players[0];
    statusEl.innerHTML = `<span class="station"><b>Deal ${s.dealNo} of ${s.deals}</b><small>${s.phase === 'play' ? `${esc(E.current(s).name)}${isYou(E.current(s).name) ? "'re" : ' is'} up` : s.phase === 'over' ? 'Game over' : 'Deal over'}</small></span>
      <span class="orange-pill" title="${esc(me.name)}: oranges">${orangeIcon()}<b>${me.oranges}</b></span>`;
  }
  function setPanel(html, cls = '', color = BRAND) {
    panel.className = `panel ${cls}`;
    panel.style.setProperty('--team', color);
    panel.innerHTML = `<div class="panel-inner">${html}</div>`;
    const first = panel.querySelector('[autofocus]');
    if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }
  const on = (q, fn) => { const b = panel.querySelector(q); if (b) b.onclick = (e) => { if (busy) return; sfx.tap(); fn(e); }; };

  function say(ev) {
    switch (ev.type) {
      case 'play': return `<b style="color:${s.players[ev.p].color}">${nameOf(ev.p)}</b> ${verb(ev.p, 'play', 'plays')} ${esc(E.comboName(ev.combo))}`;
      case 'pass': return `${nameOf(ev.p)} ${verb(ev.p, 'pass', 'passes')}`;
      case 'clear': return `<i>Everyone passed. ${nameOf(ev.p)} ${verb(ev.p, 'lead', 'leads')}.</i>`;
      case 'last': return `<b class="bad">${nameOf(ev.p)}: last card!</b>`;
      default: return '';
    }
  }
  const logHTML = () => (log.length ? `<ul class="log">${log.slice(-4).map((l) => `<li>${l}</li>`).join('')}</ul>` : '');
  function sound(ev) {
    switch (ev.type) {
      case 'deal': sfx.tick(); break;
      case 'play': sfx.plop(); if (ev.combo.size === 5 || (ev.combo.size <= 2 && E.rk(ev.combo.key) === 12)) sfx.thunk(); break;
      case 'pass': sfx.needle(); break;
      case 'clear': sfx.whoosh(false); break;
      case 'last': sfx.lock(); buzz(20); break;
      case 'out': sfx.claim(true); break;
      case 'orange': sfx.tick(); break;
      default: break;
    }
  }

  // ---------------- the hand ----------------
  function renderHand() {
    if (!s || s.phase === 'idle') { handEl.innerHTML = ''; handEl.dataset.state = 'empty'; return; }
    if (viewer == null) {
      const n = s.players[0].hand.length;
      handEl.dataset.state = 'hidden';
      handEl.innerHTML = `<div class="hand-row">${Array.from({ length: n }, () => `<span class="hcard back">${cardSVG(null)}</span>`).join('')}</div>`;
    } else {
      const cards = E.sortHand(s.players[viewer].hand, sortMode);
      handEl.dataset.state = 'live';
      handEl.innerHTML = `<div class="hand-row">${cards.map((id) => `<button type="button" class="hcard${sel.has(id) ? ' sel' : ''}" data-id="${id}" aria-pressed="${sel.has(id)}" aria-label="${E.cardLong(id)}">${cardSVG(id)}</button>`).join('')}</div>`;
    }
    layoutHand();
  }
  function layoutHand() {
    const row = handEl.querySelector('.hand-row');
    if (!row) return;
    const cards = [...row.children];
    const W = row.clientWidth, H = row.clientHeight;
    const n = cards.length;
    if (!n || !W) return;
    const ch = Math.min(H * 0.82, 230), cw = ch * 100 / 140;
    const step = n > 1 ? Math.min(cw * 0.7, (W - 16 - cw) / (n - 1)) : 0;
    const x0 = (W - cw - step * (n - 1)) / 2;
    cards.forEach((c, i) => { c.style.left = `${x0 + i * step}px`; c.style.width = `${cw}px`; c.style.height = `${ch}px`; c.style.zIndex = i + 1; });
  }
  new ResizeObserver(() => layoutHand()).observe(handEl);

  const canPick = () => s && s.phase === 'play' && !busy && viewer != null && viewer === s.turn && !E.current(s).cpu;
  function toggle(btn, want) {
    const id = +btn.dataset.id;
    const on = want ?? !sel.has(id);
    if (on === sel.has(id)) return;
    if (on) sel.add(id); else sel.delete(id);
    btn.classList.toggle('sel', on);
    btn.setAttribute('aria-pressed', String(on));
    sfx.tick();
    updateSel();
  }
  let swipe = null;
  handEl.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.hcard[data-id]');
    if (!b || viewer == null) return;
    e.preventDefault();
    swipe = !sel.has(+b.dataset.id);
    toggle(b, swipe);
  });
  handEl.addEventListener('pointermove', (e) => {
    if (swipe == null) return;
    const b = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.hcard[data-id]');
    if (b && handEl.contains(b)) toggle(b, swipe);
  });
  addEventListener('pointerup', () => { swipe = null; });
  addEventListener('pointercancel', () => { swipe = null; });
  handEl.addEventListener('click', (e) => { // keyboard (Enter / Space on a focused card)
    const b = e.target.closest('.hcard[data-id]');
    if (b && e.detail === 0) toggle(b);
  });

  function updateSel(note = '') {
    const info = panel.querySelector('.selinfo');
    const playBtn = panel.querySelector('#play');
    if (!info || !playBtn) return;
    const ids = [...sel];
    const chk = E.check(s, ids);
    playBtn.disabled = !canPick() || !chk.ok;
    info.className = `selinfo ${chk.ok ? 'ok' : ids.length ? 'bad' : ''}`;
    info.innerHTML = note || (chk.ok ? `<b>${esc(E.comboName(chk.combo))}</b> ✓` : esc(chk.reason));
  }

  // ---------------- setup ----------------
  function goSetup() {
    token += 1;
    s = null;
    busy = false;
    viewer = null;
    sel.clear();
    log = [];
    paintStatus();
    renderHand();
    const pref = read(PREF_KEY) || {};
    const seats = (pref.seats || E.CPU_NAMES.map((name, i) => ({ name, cpu: i > 0 }))).slice(0, 4);
    seats[0].cpu = false;
    let level = pref.level === 'chill' ? 'chill' : 'kiasu';
    let deals = E.DEAL_OPTIONS.includes(pref.deals) ? pref.deals : 4;
    const demo = E.newGame({ players: seats, seed: 8 });
    E.startDeal(demo);
    demo.phase = 'idle';
    board.load(demo);
    if (board.setMode) board.setMode('idle');
    const face = (i) => `<svg viewBox="-60 -118 120 140" aria-hidden="true"><defs>${i === 1 ? PATTERN_DEFS : ''}</defs>${customerSVG(E.CHARS[i], 'happy')}</svg>`;
    const seatHTML = () => seats.map((p, i) => `<div class="seat" style="--c:${E.COLORS[i]}">
        <span class="seat-face">${face(i)}</span>
        <input id="n${i}" maxlength="12" value="${esc(p.name)}" aria-label="Seat ${i + 1} name"/>
        ${i === 0 ? '<span class="who fixed">Phone</span>' : `<button type="button" class="who" data-i="${i}" aria-pressed="${!!p.cpu}">${p.cpu ? 'CPU' : 'Human'}</button>`}
      </div>`).join('');
    setPanel(`
      <p class="kicker">The Chinese New Year card game</p>
      <h1 class="title">Big <span>Two</span></h1>
      <p class="sub">Get rid of all 13 cards first. Everyone else pays you mandarin oranges.</p>
      <p class="rotate-hint">${ICON.phone}<span><b>Best in landscape.</b> Turn your phone sideways to spread out your cards.</span></p>
      <div class="seats">${seatHTML()}</div>
      <div class="opts">
        <fieldset class="seg" aria-label="CPU level"><legend>CPU</legend>${[['chill', 'Chill'], ['kiasu', 'Kiasu']].map(([v, l]) => `<label><input type="radio" name="lvl" value="${v}" ${v === level ? 'checked' : ''}/><span>${l}</span></label>`).join('')}</fieldset>
        <fieldset class="seg" aria-label="Deals"><legend>Deals</legend>${E.DEAL_OPTIONS.map((n) => `<label><input type="radio" name="deals" value="${n}" ${n === deals ? 'checked' : ''}/><span>${n}</span></label>`).join('')}</fieldset>
      </div>
      <div class="row">
        <button type="button" class="btn btn-ghost" id="how">How to play</button>
        <button class="btn btn-primary grow" id="start" autofocus>Deal the cards!</button>
      </div>`, 'setup');
    const readSeats = () => seats.forEach((p, i) => { p.name = panel.querySelector(`#n${i}`).value.trim() || (i === 0 ? 'You' : E.CPU_NAMES[i]); });
    const wire = () => panel.querySelectorAll('.who[data-i]').forEach((b) => {
      b.onclick = () => {
        sfx.tap(); readSeats();
        const i = +b.dataset.i;
        seats[i].cpu = !seats[i].cpu;
        if (!seats[i].cpu && seats[i].name === E.CPU_NAMES[i]) seats[i].name = `Player ${i + 1}`;
        if (seats[i].cpu && /^Player \d$/.test(seats[i].name)) seats[i].name = E.CPU_NAMES[i];
        panel.querySelector('.seats').innerHTML = seatHTML(); wire();
      };
    });
    wire();
    panel.querySelectorAll('input[name="lvl"]').forEach((r) => { r.onchange = () => { sfx.tap(); level = r.value; }; });
    panel.querySelectorAll('input[name="deals"]').forEach((r) => { r.onchange = () => { sfx.tap(); deals = +r.value; }; });
    on('#how', showRules);
    on('#start', () => {
      readSeats();
      write(PREF_KEY, { seats, level, deals });
      start(seats.map((p) => ({ name: p.name, cpu: p.cpu })), { level, deals });
    });
  }

  function start(players, opts) {
    token += 1;
    s = E.newGame({ players, ...opts });
    s.opts = { players, ...opts };
    busy = false;
    if (board.setMode) board.setMode('play');
    board.load(s);
    newDeal();
  }

  async function newDeal() {
    const my = token;
    E.startDeal(s);
    log = [];
    sel.clear();
    viewer = multi() ? null : 0;
    busy = true;
    paintStatus();
    renderHand();
    handEl.dataset.state = 'dealing';
    setPanel(`<p class="kicker">Deal ${s.dealNo} of ${s.deals}</p><h2>Shuffling…</h2>`, 'cpu');
    sfx.drum();
    await board.deal(s, sound);
    if (my !== token) return;
    busy = false;
    renderHand();
    const lead = E.current(s);
    log.push(s.first ? `${esc(lead.name)} ${isYou(lead.name) ? 'have' : 'has'} the 3♦ and ${isYou(lead.name) ? 'start' : 'starts'}.` : `${esc(lead.name)} won the last deal and ${isYou(lead.name) ? 'start' : 'starts'}.`);
    turnStart();
  }

  // ---------------- turns ----------------
  function turnStart() {
    if (!s || s.phase !== 'play') return;
    const p = s.turn;
    const pl = s.players[p];
    paintStatus();
    board.sync(s);
    const my = token;
    if (pl.cpu) {
      if (multi()) { viewer = null; renderHand(); }
      setPanel(`<p class="kicker">Deal ${s.dealNo} of ${s.deals}</p>
        <h2 class="thinking-h"><span class="thinking"><i></i><i></i><i></i></span> ${nameOf(p)} is thinking…</h2>
        ${tableLine()}${logHTML()}`, 'cpu', pl.color);
      wait(650 + Math.random() * 550).then(() => { if (my === token && s && s.turn === p) cpuTurn(); });
      return;
    }
    if (viewer !== p) {
      // pass-the-phone screen: hide the last player's cards
      viewer = null;
      sel.clear();
      renderHand();
      setPanel(`<p class="kicker">Pass the phone</p>
        <h2>Over to <span class="tname" style="color:${pl.color}">${nameOf(p)}</span></h2>
        ${tableLine()}${logHTML()}
        <button class="btn btn-primary wide big" id="show" autofocus>${ICON.eye} I'm ${nameOf(p)}, show my cards</button>`, 'turn', pl.color);
      on('#show', () => { viewer = p; renderHand(); humanTurn(); });
      return;
    }
    humanTurn();
  }

  function tableLine() {
    if (!s.table) return '';
    return `<p class="beat">On the table: <b>${esc(E.comboName(s.table.combo))}</b> <small>from ${nameOf(s.table.by)}</small></p>`;
  }

  function humanTurn() {
    const p = s.turn;
    const pl = s.players[p];
    const head = s.first ? 'Start with the 3♦' : s.table ? `Beat ${esc(E.comboName(s.table.combo))}` : 'Your lead: play anything';
    setPanel(`
      <p class="kicker">${multi() ? `${nameOf(p)} · ` : ''}Your turn · Deal ${s.dealNo} of ${s.deals}</p>
      <h2>${head}</h2>
      ${s.table ? `<p class="beat"><small>from ${nameOf(s.table.by)}</small></p>` : ''}
      <p class="selinfo" aria-live="polite"></p>
      <div class="row play-row">
        <button class="btn btn-ghost" id="pass" ${s.table ? '' : 'disabled'}>Pass</button>
        <button class="btn btn-primary grow" id="play" disabled>${ICON.play} Play</button>
      </div>
      <div class="row tools">
        <button class="btn btn-ghost small" id="hint">${ICON.bulb} Hint</button>
        <button class="btn btn-ghost small" id="sort" aria-label="Sort by ${sortMode === 'rank' ? 'suit' : 'rank'}" title="Sort by ${sortMode === 'rank' ? 'suit' : 'rank'}">${ICON.sort} Sort</button>
        <button class="btn btn-ghost small" id="clear">Clear</button>
      </div>
      ${logHTML()}`, 'turn', pl.color);
    updateSel();
    on('#play', () => doPlay([...sel]));
    on('#pass', () => doPass());
    on('#clear', () => { sel.clear(); renderHand(); updateSel(); });
    on('#sort', () => {
      sortMode = sortMode === 'rank' ? 'suit' : 'rank';
      write('bigtwo.sort', sortMode);
      const b = panel.querySelector('#sort');
      b.setAttribute('aria-label', `Sort by ${sortMode === 'rank' ? 'suit' : 'rank'}`);
      b.title = b.getAttribute('aria-label');
      renderHand();
    });
    on('#hint', () => {
      const h = E.hint(s);
      if (h.cards.length) { sel = new Set(h.cards); renderHand(); updateSel(`Hint: <b>${esc(E.comboName(E.classify(h.cards)))}</b>`); }
      else if (h.none) updateSel('Nothing beats it. <b>Pass</b>.');
      else { sel = new Set(h.alt); renderHand(); updateSel(`Hint: <b>pass</b> and keep your big cards. (Or play ${esc(E.comboName(E.classify(h.alt)))}.)`); }
      const pb = panel.querySelector('#play'); if (pb) pb.disabled = !E.check(s, [...sel]).ok;
    });
  }

  async function doPlay(ids) {
    if (!canPick()) return;
    const chk = E.check(s, ids);
    if (!chk.ok) { sfx.claim(false); buzz(30); updateSel(); return; }
    const p = s.turn;
    const evs = E.play(s, ids);
    sel.clear();
    renderHand();
    await act(evs, p);
  }
  async function doPass() {
    if (!canPick() || !s.table) return;
    const p = s.turn;
    sel.clear();
    renderHand();
    await act(E.pass(s), p);
  }

  async function cpuTurn() {
    if (!s || busy || s.phase !== 'play') return;
    const p = s.turn;
    const mv = E.cpuMove(s);
    const evs = mv ? E.play(s, mv) : E.pass(s);
    const pe = evs.find((e) => e.type === 'play');
    if (!pe) board.say(p, pick(QUIPS.pass));
    else if (pe.combo.size === 5 && Math.random() < 0.6) board.say(p, pick(QUIPS.five));
    else if (pe.combo.size <= 2 && E.rk(pe.combo.key) === 12 && Math.random() < 0.7) board.say(p, pick(QUIPS.two));
    await act(evs, p);
  }

  async function act(evs, who) {
    busy = true;
    const my = token;
    const btns = panel.querySelectorAll('button');
    btns.forEach((b) => { b.disabled = true; });
    log.push(...evs.map(say).filter(Boolean));
    await board.play(evs, s, sound);
    if (my !== token) return;
    busy = false;
    if (evs.some((e) => e.type === 'clear') && s.players[s.turn].cpu && Math.random() < 0.35) board.say(s.turn, pick(QUIPS.lead));
    if (s.phase === 'play') return turnStart();
    dealOver();
  }

  // ---------------- results ----------------
  function dealOver() {
    const r = s.results;
    const w = s.players[r.winner];
    viewer = multi() ? null : 0;
    renderHand();
    paintStatus();
    board.sync(s);
    if (r.winner === 0 || !w.cpu) { sfx.win(); confetti({ count: 140, colors: [w.color, '#F2B134', '#F28C28', '#fff'] }); }
    else sfx.score(0);
    const rows = s.players.map((p, i) => ({ p, i, r: r.rows[i] })).sort((a, b) => (b.i === r.winner) - (a.i === r.winner) || a.r.left - b.r.left);
    const table = `<ul class="results">${rows.map(({ p, i, r: x }) => `<li style="--c:${p.color}">
        <span class="rn">${esc(p.name)}</span>
        <span class="rl">${i === r.winner ? 'Out!' : `${x.left} card${x.left === 1 ? '' : 's'}`}</span>
        <span class="rd ${i === r.winner ? 'good' : 'bad'}">${i === r.winner ? `+${x.got}` : `−${x.paid}`}</span>
        <span class="ro">${orangeIcon()}${p.oranges}</span></li>`).join('')}</ul>`;
    if (s.phase === 'over') return gameOver(table);
    setPanel(`
      <p class="kicker">Deal ${s.dealNo} of ${s.deals} done</p>
      <h2><span class="tname" style="color:${w.color}">${esc(w.name)}</span> ${isYou(w.name) ? 'go' : 'goes'} out first!</h2>
      ${table}
      <p class="hint">${esc(w.name)} ${isYou(w.name) ? 'start' : 'starts'} the next deal.</p>
      <button class="btn btn-primary wide big" id="next" autofocus>Next deal</button>`, 'result', w.color);
    on('#next', () => newDeal());
  }

  function gameOver(table) {
    const w = s.players[s.winner];
    if (board.setMode) board.setMode('over');
    sfx.win();
    confetti({ count: 220, colors: [w.color, '#F2B134', '#F28C28', '#D7263D', '#fff'] });
    const bust = s.players.find((p) => p.oranges <= 0);
    table = `<ol class="results final">${E.standings(s).map((i) => { const p = s.players[i]; return `<li style="--c:${p.color}">
        <span class="rn">${esc(p.name)}</span><span class="rl">${p.wins} deal${p.wins === 1 ? '' : 's'} won</span>
        <span class="ro">${orangeIcon()}${p.oranges}</span></li>`; }).join('')}</ol>`;
    setPanel(`
      <p class="kicker">${bust ? `${esc(bust.name)} ran out of oranges` : `${s.deals} deal${s.deals === 1 ? '' : 's'} played`}</p>
      <h2 class="win" style="color:${w.color}">${isYou(w.name) ? 'You win!' : `${esc(w.name)} wins!`}</h2>
      <p class="sub">${w.oranges} oranges. Huat ah!</p>
      ${table}
      <div class="row"><button class="btn btn-ghost" id="setup">Setup</button><button class="btn btn-primary grow" id="again" autofocus>Play again</button></div>`, 'over', w.color);
    on('#setup', () => goSetup());
    on('#again', () => start(s.opts.players, { level: s.opts.level, deals: s.opts.deals }));
  }

  goSetup();
  return { get state() { return s; } };
}
