// Pasar Malam Haggle — screen flow shared by the 2D and 3D builds.
import * as E from './engine.js';
import { goodsIcon } from './art.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';
import { confetti } from '../../../assets/lib/fx.js';

const BEST_KEY = 'pasar.best';
const PREF_KEY = 'pasar.setup';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const money = (n) => `$${n.toFixed(2)}`;
const round50 = (n) => Math.round(n * 2) / 2;
const PCOL = ['#E0457B', '#2D6FD1'];

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3.5h6.5a4 4 0 0 1 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 5.5l2 2 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z" fill="currentColor"/></svg>',
  one: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6" fill="currentColor"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5z" fill="currentColor"/></svg>',
  two: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><circle cx="16.5" cy="8.5" r="2.7" fill="currentColor" opacity=".7"/><path d="M2.5 19c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5z" fill="currentColor"/><path d="M13 19c.2-2.9 1.8-4.8 4-4.8 2.4 0 4.2 2 4.4 4.8z" fill="currentColor" opacity=".7"/></svg>',
  walk: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4.5" r="2.2" fill="currentColor"/><path d="M11 9l-3 4 3 2-1 6M13 9l2 4 4 1M11 9l2 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const RULES_HTML = `
  <h2>How to haggle</h2>
  <p>It's pasar malam night. You have a shopping list and a budget. Every stallholder has an asking price, a secret lowest price and only so much patience.</p>
  <ol class="rules-steps">
    <li><b>Make an offer.</b> Pick a price and tap <i>Offer</i>. They'll accept, counter with a lower price, or get annoyed.</li>
    <li><b>Watch their mood.</b> The green dots are their patience. Each counter-offer costs one. A silly lowball offer costs two and earns a scolding.</li>
    <li><b>Take the deal</b> any time at their current price. When patience runs out you'll hear a <b>last price</b>, so take it or lose the item.</li>
    <li><b>Walk away</b> to bluff. Some stallholders call you back with a better last price… some let you go.</li>
  </ol>
  <p>Buy everything on the list within budget and save as much as you can. Stars go up with items bought and percent saved.</p>
  <p><b>Stallholders:</b> Uncle Seng is generous, Ah Boy is chill, Makcik Siti is fair, Auntie Mei is kiasu and stubborn, and Gadget Bro starts at tourist prices, so go low.</p>
  <p><b>2 players:</b> you take turns at each stall with the same secret lowest price. Whoever saves more wins.</p>
  <p class="hint">Keyboard: ←/→ change offer by 50¢ (Shift: $1) · Enter offer · D take deal · W walk away.</p>`;

export function startFlow({ root, createBoard, hubHref, altHref, altLabel }) {
  let s = null;
  let offerAmt = 0;
  let busy = false;
  let log = [];
  let firstOfStall = 0; // in 2-player mode, who goes first alternates per stall
  let doneHere = new Set(); // players who have haggled at the current stall

  root.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="${hubHref}" aria-label="Back to SG Games">${ICON.back}</a>
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>Pasar<b>Malam</b></span></div>
      <div class="status" id="status" aria-live="polite"></div>
      <div class="bar-actions">
        <button class="icon-btn" id="btn-rules" aria-label="How to play">${ICON.help}</button>
        <button class="icon-btn" id="btn-sound" aria-label="Toggle sound"></button>
        <button class="icon-btn" id="btn-menu" aria-label="Menu" aria-haspopup="true">${ICON.menu}</button>
      </div>
      <div class="menu" id="menu" hidden>
        <button data-act="rules">How to play</button>
        <button data-act="new">Quit to night select</button>
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
  const showRules = () => { sfx.tap(); $('#rules').showModal(); };
  $('#btn-rules').onclick = showRules;
  const menu = $('#menu');
  $('#btn-menu').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; sfx.tap(); };
  document.addEventListener('click', () => { menu.hidden = true; });
  menu.querySelector('[data-act="rules"]').onclick = showRules;
  menu.querySelector('[data-act="new"]').onclick = () => goSetup();
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

  document.addEventListener('keydown', (e) => {
    if (!s || s.phase !== 'haggle' || !s.h || s.h.done || busy || $('#rules').open) return;
    if (e.target.matches && e.target.matches('input')) return;
    const step = e.shiftKey ? 1 : 0.5;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setOffer(offerAmt - step); e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setOffer(offerAmt + step); e.preventDefault(); }
    else if (e.key === 'Enter') { doOffer(); e.preventDefault(); }
    else if (e.key.toLowerCase() === 'd') { doAccept(); }
    else if (e.key.toLowerCase() === 'w') { doWalk(); }
  });

  function paintStatus() {
    if (!s) { statusEl.innerHTML = ''; return; }
    const n = E.nightOf(s);
    const p = s.turn;
    statusEl.innerHTML = `
      <span class="line-chip" style="--line:#3A2A5E">${esc(n.name)}</span>
      <span class="station"><b>Stall ${Math.min(s.stallIdx + 1, s.stalls.length)}/${s.stalls.length}</b><small>${s.players > 1 ? esc(s.names[p]) : 'Shopping list'}</small></span>
      <span class="score-pill" title="Money left" style="${s.players > 1 ? `background:${PCOL[p]}` : ''}">${money(E.moneyLeft(s, p))}</span>`;
  }

  function setPanel(html, cls = '', color = '#3A2A5E') {
    panel.className = `panel ${cls}`;
    panel.style.setProperty('--team', color);
    panel.innerHTML = `<div class="panel-inner">${html}</div>`;
    const first = panel.querySelector('[autofocus]');
    if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }
  const on = (q, fn) => { const b = panel.querySelector(q); if (b) b.onclick = (e) => { if (busy) return; sfx.tap(); fn(e); }; };

  function listChips(p) {
    const w = s.wallets[p];
    return `<ul class="shoplist">${s.stalls.map((st, i) => {
      const got = w.bought.find((b) => b.item === st.item), miss = w.missed.find((m) => m.item === st.item);
      const cls = got ? 'got' : miss ? 'miss' : i === s.stallIdx ? 'now' : '';
      return `<li class="${cls}" title="${esc(E.ITEMS[st.item].name)}">${goodsIcon(st.item)}${got ? '<b>✓</b>' : miss ? '<b>✗</b>' : ''}</li>`;
    }).join('')}</ul>`;
  }

  // ---------------- setup ----------------
  function goSetup() {
    s = null;
    paintStatus();
    const pref = read(PREF_KEY) || {};
    let nightId = E.NIGHTS[pref.night] ? pref.night : 1;
    let players = pref.players === 2 ? 2 : 1;
    const names = pref.names || ['Player 1', 'Player 2'];
    const best = read(BEST_KEY) || {};
    const demo = E.newGame(nightId, { seed: 7 });
    board.load(demo);
    if (board.setMode) board.setMode('idle');
    setPanel(`
      <p class="kicker">Night market showdown</p>
      <h1 class="title">Pasar Malam <span>Haggle</span></h1>
      <p class="sub">Every stallholder has a secret lowest price. Bargain hard, but not too hard.</p>
      <p class="rotate-hint">${ICON.phone}<span><b>Best in landscape.</b> Turn your phone sideways for the whole stall.</span></p>
      <div class="mode-tabs" role="radiogroup" aria-label="Players">
        <button type="button" role="radio" data-p="1" aria-checked="${players === 1}">${ICON.one}<span>Solo<small>beat your best savings</small></span></button>
        <button type="button" role="radio" data-p="2" aria-checked="${players === 2}">${ICON.two}<span>2 players<small>same stalls, best saver wins</small></span></button>
      </div>
      <div class="names" ${players === 2 ? '' : 'hidden'}>
        <label class="field" style="--team:${PCOL[0]}"><span>Player 1</span><input id="n0" maxlength="14" value="${esc(names[0])}"/></label>
        <label class="field" style="--team:${PCOL[1]}"><span>Player 2</span><input id="n1" maxlength="14" value="${esc(names[1])}"/></label>
      </div>
      <div class="lines" role="radiogroup" aria-label="Choose a night">
        ${Object.values(E.NIGHTS).map((n) => {
          const b = best[n.id];
          return `<button type="button" role="radio" class="line-card" data-night="${n.id}" aria-checked="${n.id === nightId}" style="--line:#6A4FB3">
            <span class="dot"></span><span class="meta"><b>${n.name} · ${n.stalls} stalls</b><small>${n.level} · ${n.blurb}</small></span>
            <span class="best">${[1, 2, 3].map((i) => `<i class="${b && b.stars >= i ? 'on' : ''}">${ICON.star}</i>`).join('')}${b ? `<small>${Math.round(b.pct * 100)}%</small>` : ''}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="row">
        <button type="button" class="btn btn-ghost" id="how">How to haggle</button>
        <button class="btn btn-primary grow" id="start" autofocus>Enter the market</button>
      </div>`, 'setup');
    panel.querySelectorAll('.mode-tabs button').forEach((b) => {
      b.onclick = () => {
        sfx.tap(); players = +b.dataset.p;
        panel.querySelectorAll('.mode-tabs button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        panel.querySelector('.names').hidden = players !== 2;
      };
    });
    panel.querySelectorAll('.line-card').forEach((b) => {
      b.onclick = () => { sfx.tap(); nightId = +b.dataset.night; panel.querySelectorAll('.line-card').forEach((x) => x.setAttribute('aria-checked', String(x === b))); };
    });
    on('#how', showRules);
    on('#start', () => {
      const nm = [panel.querySelector('#n0').value, panel.querySelector('#n1').value];
      write(PREF_KEY, { night: nightId, players, names: nm });
      start(nightId, players, nm);
    });
  }

  // ---------------- play ----------------
  function start(nightId, players, names) {
    s = E.newGame(nightId, { players, names: players > 1 ? names : ['You'] });
    firstOfStall = 0;
    doneHere = new Set();
    board.load(s);
    if (board.setMode) board.setMode('play');
    paintStatus();
    paintWalk();
  }

  function paintWalk() {
    const st = E.stallOf(s), S = E.SELLERS[st.seller];
    const p = s.turn;
    board.sync(s);
    paintStatus();
    setPanel(`
      <p class="kicker">Stall ${s.stallIdx + 1} of ${s.stalls.length}${s.players > 1 ? ` · <b style="color:${PCOL[p]}">${esc(s.names[p])}'s turn</b>` : ''}</p>
      <h2>${esc(S.name)} · ${esc(E.ITEMS[st.item].name)}</h2>
      <p class="sub">Asking <b>${money(st.ask)}</b>. You have <b>${money(E.moneyLeft(s, p))}</b> left for ${s.stalls.length - s.stallIdx} item${s.stalls.length - s.stallIdx > 1 ? 's' : ''}.</p>
      ${listChips(p)}
      <button class="btn btn-primary wide big" id="go" autofocus>Start haggling</button>`, 'walk', s.players > 1 ? PCOL[p] : '#3A2A5E');
    on('#go', () => { E.startHaggle(s); log = []; setOffer(round50(s.h.cur * 0.6)); paintHaggle(); board.sync(s); });
  }

  function setOffer(v) {
    if (!s || !s.h) return;
    const max = Math.min(s.h.cur, E.moneyLeft(s));
    offerAmt = Math.max(0.5, Math.min(max, round50(v)));
    const big = panel.querySelector('.offer-amt');
    if (big) {
      big.textContent = money(offerAmt);
      const sl = panel.querySelector('#offer-slider');
      if (sl) sl.value = String(offerAmt);
      const ob = panel.querySelector('#offer');
      if (ob) ob.innerHTML = `Offer ${money(offerAmt)}`;
      const pct = panel.querySelector('.offer-pct');
      if (pct) pct.textContent = `${Math.round((offerAmt / E.stallOf(s).ask) * 100)}% of asking`;
    }
  }

  function paintHaggle() {
    const h = s.h, st = E.stallOf(s);
    const p = s.turn;
    const max = Math.min(h.cur, E.moneyLeft(s));
    setPanel(`
      <div class="haggle-head">
        <div><p class="kicker">${s.players > 1 ? `<b style="color:${PCOL[p]}">${esc(s.names[p])}</b> · ` : ''}${esc(E.ITEMS[st.item].name)}</p>
          <h2>${h.last != null ? 'Last price' : 'They want'} <span class="cur">${money(h.cur)}</span></h2></div>
        <div class="pips" aria-label="Patience ${Math.max(0, h.patience)} of ${h.max}">${Array.from({ length: h.max }, (_, i) => `<i class="${i < h.patience ? 'on' : ''}"></i>`).join('')}</div>
      </div>
      <div class="offer-box">
        <div class="offer-row">
          <button class="step" data-d="-1" aria-label="Minus one dollar">−$1</button>
          <button class="step" data-d="-0.5" aria-label="Minus fifty cents">−50¢</button>
          <div class="offer-show"><b class="offer-amt">${money(offerAmt)}</b><small class="offer-pct"></small></div>
          <button class="step" data-d="0.5" aria-label="Plus fifty cents">+50¢</button>
          <button class="step" data-d="1" aria-label="Plus one dollar">+$1</button>
        </div>
        <input id="offer-slider" type="range" min="0.5" max="${max}" step="0.5" value="${offerAmt}" aria-label="Your offer"/>
        <div class="chips">${[0.5, 0.6, 0.7, 0.8, 0.9].map((k) => `<button class="chip-btn" data-k="${k}">${Math.round(k * 100)}%</button>`).join('')}</div>
      </div>
      <div class="row">
        <button class="btn btn-primary grow big" id="offer" ${h.last != null ? 'disabled' : ''}>Offer ${money(offerAmt)}</button>
      </div>
      ${h.last != null && h.cur > E.moneyLeft(s) ? `<p class="hint warn">You only have ${money(E.moneyLeft(s))} left. Walk away and save it for the rest of the list.</p>` : ''}
      <div class="row">
        <button class="btn btn-ghost small grow" id="take" ${h.cur > E.moneyLeft(s) ? 'disabled title="Not enough money left"' : ''}>${h.cur > E.moneyLeft(s) ? `Can't afford ${money(h.cur)}` : `Take ${money(h.cur)}`}</button>
        <button class="btn btn-ghost small grow" id="walk">${ICON.walk} Walk away</button>
      </div>
      <ol class="log">${log.slice(-3).map((l) => `<li class="${l.who}">${esc(l.text)}</li>`).join('')}</ol>`, 'haggle', s.players > 1 ? PCOL[p] : '#3A2A5E');
    setOffer(offerAmt);
    panel.querySelectorAll('.step').forEach((b) => { b.onclick = () => { sfx.tap(); setOffer(offerAmt + +b.dataset.d); }; });
    panel.querySelectorAll('.chip-btn').forEach((b) => { b.onclick = () => { sfx.tap(); setOffer(st.ask * +b.dataset.k); }; });
    panel.querySelector('#offer-slider').oninput = (e) => setOffer(+e.target.value);
    on('#offer', () => doOffer());
    on('#take', () => doAccept());
    on('#walk', () => doWalk());
  }

  async function doOffer() {
    if (!s || !s.h || s.h.done || busy || s.h.last != null) return;
    busy = true;
    log.push({ who: 'me', text: `You: ${money(offerAmt)}?` });
    const res = E.offer(s, offerAmt);
    log.push({ who: 'them', text: s.h.line });
    sound(res);
    await board.react(res, s);
    busy = false;
    after(res);
  }
  async function doAccept() {
    if (!s || !s.h || s.h.done || busy) return;
    busy = true;
    const res = E.accept(s);
    log.push({ who: 'them', text: s.h.line });
    sound(res);
    await board.react(res, s);
    busy = false;
    after(res);
  }
  async function doWalk() {
    if (!s || !s.h || s.h.done || busy) return;
    busy = true;
    log.push({ who: 'me', text: 'You walk away…' });
    const res = E.walkAway(s);
    log.push({ who: 'them', text: s.h.line });
    sound(res);
    await board.react(res, s);
    busy = false;
    after(res);
  }

  function sound(res) {
    if (res.result === 'deal') { sfx.claim(true); buzz(20); }
    else if (res.result === 'insult' || res.result === 'angry') { sfx.claim(false); buzz([30, 30, 30]); }
    else if (res.result === 'callback') { sfx.lock(); }
    else sfx.plop();
  }

  function after(res) {
    paintStatus();
    if (!s.h.done) {
      // keep the offer sensible after a counter
      if (offerAmt > s.h.cur) setOffer(s.h.cur);
      paintHaggle();
      return;
    }
    const st = E.stallOf(s), p = s.turn;
    const bought = s.wallets[p].bought.find((b) => b.item === st.item);
    const pct = bought ? Math.round(((st.ask - bought.paid) / st.ask) * 100) : 0;
    const otherWaiting = s.players > 1 && !doneHere.has(1 - s.turn) && doneHere.size === 0;
    const nextLabel = otherWaiting ? `${esc(s.names[1 - s.turn])}'s turn` : s.stallIdx >= s.stalls.length - 1 ? 'See the receipts' : 'Next stall';
    setPanel(`
      <p class="kicker">${esc(E.SELLERS[st.seller].name)} · ${esc(E.ITEMS[st.item].name)}</p>
      <h2>${bought ? (pct >= 35 ? 'Steal! Power haggling.' : pct >= 20 ? 'Good deal!' : pct > 0 ? 'Deal.' : 'Paid full price…') : 'No deal'}</h2>
      <p class="sub">${bought ? `Paid <b>${money(bought.paid)}</b> for a ${money(st.ask)} item, saved <b>${money(st.ask - bought.paid)}</b> (${pct}%).` : `You leave without the ${esc(E.ITEMS[st.item].name.toLowerCase())}.`}
      ${bought && bought.paid <= st.floor ? ' <b class="newbest">Lowest possible price!</b>' : ''}</p>
      ${listChips(p)}
      <button class="btn btn-primary wide big" id="next" autofocus>${nextLabel}</button>`, 'result', s.players > 1 ? PCOL[p] : '#3A2A5E');
    on('#next', async () => {
      const r = advance();
      if (r === 'over') return finish();
      if (r === 'stall') { busy = true; await board.walk(s); busy = false; }
      paintWalk();
    });
  }

  /** Next player at this stall, or the next stall (who goes first alternates), or the end of the night. */
  function advance() {
    s.h = null;
    doneHere.add(s.turn);
    if (s.players > 1 && doneHere.size < s.players) { s.turn = 1 - s.turn; s.phase = 'walk'; return 'player'; }
    doneHere = new Set();
    s.stallIdx += 1;
    if (s.stallIdx >= s.stalls.length) { s.phase = 'over'; return 'over'; }
    s.phase = 'walk';
    if (s.players > 1) { firstOfStall = 1 - firstOfStall; s.turn = firstOfStall; } else s.turn = 0;
    return 'stall';
  }

  function finish() {
    s.phase = 'over';
    if (board.setMode) board.setMode('over');
    const n = E.nightOf(s);
    const sums = s.wallets.map((_, p) => E.summary(s, p));
    let headline;
    if (s.players > 1) {
      const [a, b] = sums;
      const w = a.score === b.score ? -1 : a.score > b.score ? 0 : 1;
      headline = w < 0 ? 'Draw lah!' : `${esc(s.names[w])} wins!`;
    } else {
      const m = sums[0];
      headline = m.stars === 3 ? 'Haggle Master!' : m.stars === 2 ? 'Steady bargaining!' : m.stars === 1 ? 'Not bad lah.' : 'Kena chopped…';
      const all = read(BEST_KEY) || {};
      const prev = all[n.id];
      if (!prev || m.stars > prev.stars || (m.stars === prev.stars && m.pct > prev.pct)) { all[n.id] = { stars: m.stars, pct: m.pct }; write(BEST_KEY, all); }
    }
    if (sums.some((m) => m.stars >= 2)) { sfx.win(); confetti({ count: 200, colors: ['#FFD877', '#E0457B', '#2D6FD1', '#3F8F5B'] }); } else sfx.score(1);
    setPanel(`
      <p class="kicker">${esc(n.name)} · receipts</p>
      <h2 class="win">${headline}</h2>
      ${sums.map((m, p) => `
        <div class="receipt" style="--c:${s.players > 1 ? PCOL[p] : '#3A2A5E'}">
          <div class="receipt-head"><b>${esc(s.names[p])}</b><span class="stars">${[1, 2, 3].map((i) => `<i class="${m.stars >= i ? 'on' : ''}">${ICON.star}</i>`).join('')}</span></div>
          <p><b>${m.got}/${m.all}</b> items · saved <b>${money(m.saved)}</b> (${Math.round(m.pct * 100)}%) · spent ${money(m.spent)} of ${money(s.budget)}</p>
          ${listChips(p)}
        </div>`).join('')}
      <div class="row">
        <button class="btn btn-ghost" id="nights">Nights</button>
        <button class="btn btn-ghost" id="retry">Retry</button>
        ${n.id < 3 ? `<button class="btn btn-primary grow" id="next" autofocus>Next: Night ${n.id + 1}</button>` : `<button class="btn btn-primary grow" id="again" autofocus>Play again</button>`}
      </div>`, 'over');
    paintStatus();
    on('#nights', () => goSetup());
    on('#retry', () => start(n.id, s.players, s.names));
    on('#again', () => start(n.id, s.players, s.names));
    on('#next', () => { write(PREF_KEY, { ...(read(PREF_KEY) || {}), night: n.id + 1 }); start(n.id + 1, s.players, s.names); });
  }

  goSetup();
  return { get state() { return s; } };
}
