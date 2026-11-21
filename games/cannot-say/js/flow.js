// Cannot Say! — screen flow shared by the 2D and 3D builds.
import * as E from './engine.js';
import { ICONS, esc } from './art.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';
import { confetti } from '../../../assets/lib/fx.js';

const PREF_KEY = 'cannot.setup';
const SEEN_KEY = 'cannot.seen';
const BRAND = '#E8590C';
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3.5h6.5a4 4 0 0 1 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 5.5l2 2 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  skip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6l7 6-7 6zM13 6l7 6-7 6z" fill="currentColor"/></svg>',
  buzz: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
  team: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><circle cx="16.5" cy="8.5" r="2.7" fill="currentColor" opacity=".7"/><path d="M2.5 19c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5z" fill="currentColor"/><path d="M13 19c.2-2.9 1.8-4.8 4-4.8 2.4 0 4.2 2 4.4 4.8z" fill="currentColor" opacity=".7"/></svg>',
};
const RES = { got: { label: 'Got it', cls: 'got' }, skip: { label: 'Skip', cls: 'skip' }, buzz: { label: 'Buzz', cls: 'buzz' }, time: { label: 'No time', cls: 'time' } };

const RULES_HTML = `
  <h2>How to play</h2>
  <p>Split into 2–4 teams. On your team's turn, one person (the describer) holds the phone and gets your teammates to say the word on the card, without saying any of the banned words.</p>
  <ol class="rules-steps">
    <li><b>Describe it.</b> No banned words, no "sounds like", no spelling it out, no acting. Just talk.</li>
    <li><b>Got it!</b> When a teammate says the exact word, tap <i>Got it</i> for +1 and a new card.</li>
    <li><b>Skip</b> a card you can't do. You get ${E.MAX_SKIPS} free skips a turn.</li>
    <li><b>Buzz!</b> Said a banned word? The other teams shout "Cannot say!" and you tap <i>Buzz</i>: −1.</li>
  </ol>
  <p>When the timer runs out you check the cards and fix any mistakes, then pass the phone to the next team. Take turns being the describer. Highest score after the last round wins.</p>
  <p class="hint">Keyboard: Enter or → Got it · ← or S Skip · B Buzz · P Pause.</p>`;

export function startFlow({ root, createBoard, hubHref, altHref, altLabel }) {
  let s = null;
  let paused = false;
  let busy = false;

  root.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="${hubHref}" aria-label="Back to SG Games">${ICON.back}</a>
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>Cannot<b>Say!</b></span></div>
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
  const showRules = () => { sfx.tap(); if (s && s.phase === 'play' && !paused) pause(); $('#rules').showModal(); };
  $('#btn-rules').onclick = showRules;
  const menu = $('#menu');
  $('#btn-menu').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; sfx.tap(); if (!menu.hidden && s && s.phase === 'play' && !paused) pause(); };
  document.addEventListener('click', () => { menu.hidden = true; });
  menu.querySelector('[data-act="rules"]').onclick = showRules;
  menu.querySelector('[data-act="new"]').onclick = () => goSetup();
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  // pause automatically if the phone gets locked or the tab is hidden mid-turn
  document.addEventListener('visibilitychange', () => { if (document.hidden && s && s.phase === 'play' && !paused) pause(); });

  document.addEventListener('keydown', (e) => {
    if (!s || $('#rules').open) return;
    if (e.target.matches && e.target.matches('input')) return;
    if (s.phase === 'play') {
      const k = e.key.toLowerCase();
      if (paused) { if (k === 'p' || k === 'enter' || k === ' ') { resume(); e.preventDefault(); } return; }
      if ((k === 'enter' && !(e.target.closest && e.target.closest('button'))) || k === 'arrowright' || k === 'g') { act('got'); e.preventDefault(); }
      else if (k === 'arrowleft' || k === 's') { act('skip'); e.preventDefault(); }
      else if (k === 'b' || k === 'backspace') { act('buzz'); e.preventDefault(); }
      else if (k === 'p' || k === 'escape') { pause(); e.preventDefault(); }
    }
  });

  // ---------------- clock ----------------
  let lastT = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    if (s && s.phase === 'play' && !paused && !busy) {
      const ev = E.tick(s, dt);
      if (ev === 'tick') { sfx.tick(); if (s.timeLeft <= 3.05) buzz(15); }
      if (ev === 'timeup') timeUp();
      paintClock();
    }
    if (s) board.sync(s);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  function paintClock() {
    const el = panel.querySelector('#clock');
    if (el) {
      el.textContent = String(Math.ceil(s.timeLeft));
      el.classList.toggle('hurry', s.timeLeft <= 10);
    }
  }

  // ---------------- helpers ----------------
  function paintStatus() {
    if (!s) { statusEl.innerHTML = ''; return; }
    if (s.phase === 'over') { statusEl.innerHTML = '<span class="station"><b>Final scores</b></span>'; return; }
    const t = E.teamOf(s);
    statusEl.innerHTML = `
      <span class="line-chip" style="--line:${BRAND}">Round ${s.round + 1}/${s.rounds}</span>
      <span class="station"><b>${esc(t.name)}</b><small>Turn ${E.turnNumber(s)} of ${E.totalTurns(s)}</small></span>
      <span class="score-pill" style="background:${t.color}" title="${esc(t.name)} score">${t.score}</span>`;
  }
  function setPanel(html, cls = '', color = BRAND) {
    panel.className = `panel ${cls}`;
    panel.style.setProperty('--team', color);
    panel.innerHTML = `<div class="panel-inner">${html}</div>`;
    const first = panel.querySelector('[autofocus]');
    if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }
  const on = (q, fn) => { const b = panel.querySelector(q); if (b) b.onclick = (e) => { sfx.tap(); fn(e); }; };
  const chip = (i) => `<i class="tdot" style="--c:${s.teams[i].color}"></i>`;
  const standingsHTML = () => `<ul class="standings">${E.standings(s).map((i) => `<li style="--c:${s.teams[i].color}" class="${i === s.turn && s.phase !== 'over' ? 'now' : ''}">${chip(i)}<span>${esc(s.teams[i].name)}</span><b>${s.teams[i].score}</b></li>`).join('')}</ul>`;

  // ---------------- setup ----------------
  function goSetup() {
    s = null;
    paused = false;
    busy = false;
    paintStatus();
    const pref = read(PREF_KEY) || {};
    let teams = [2, 3, 4].includes(pref.teams) ? pref.teams : 2;
    let seconds = [45, 60, 90].includes(pref.seconds) ? pref.seconds : 60;
    let rounds = [2, 3, 4].includes(pref.rounds) ? pref.rounds : 3;
    const cats = new Set((pref.cats || Object.keys(E.CATEGORIES)).filter((c) => E.CATEGORIES[c]));
    if (!cats.size) Object.keys(E.CATEGORIES).forEach((c) => cats.add(c));
    const names = pref.names || E.TEAM_NAMES;
    if (board.setMode) board.setMode('idle');
    board.load({ ...E.newGame({ teams }), phase: 'idle' });
    const seg = (name, vals, cur, fmt = (v) => v) => `<fieldset class="seg" aria-label="${name}"><legend>${name}</legend>${vals.map((v) => `<label><input type="radio" name="${name}" value="${v}" ${v === cur ? 'checked' : ''}/><span>${fmt(v)}</span></label>`).join('')}</fieldset>`;
    setPanel(`
      <p class="kicker">The Singapore word game</p>
      <h1 class="title">Cannot <span>Say!</span></h1>
      <p class="sub">Describe the word to your team, but cannot say the banned words. Wah, very hard one.</p>
      <p class="rotate-hint">${ICON.phone}<span><b>Best in landscape.</b> Turn your phone sideways for the big card.</span></p>
      ${seg('Teams', [2, 3, 4], teams)}
      <div class="names four" data-n="${teams}">
        ${[0, 1, 2, 3].map((i) => `<label class="field" style="--team:${E.TEAM_COLORS[i]}" ${i < teams ? '' : 'hidden'}><span>Team ${i + 1}</span><input id="n${i}" maxlength="14" value="${esc(names[i] || E.TEAM_NAMES[i])}"/></label>`).join('')}
      </div>
      <details class="opts" ${matchMedia('(orientation: landscape) and (max-height: 560px)').matches ? '' : 'open'}>
        <summary><span>Game options</span><small class="opts-sum"></small></summary>
        <div class="opts-body">
          <div class="seg-row">${seg('Timer', [45, 60, 90], seconds, (v) => `${v}s`)}${seg('Rounds', [2, 3, 4], rounds)}</div>
          <div class="cats" role="group" aria-label="Card categories">
            ${Object.entries(E.CATEGORIES).map(([id, c]) => `<button type="button" class="cat" data-cat="${id}" aria-pressed="${cats.has(id)}" style="--c:${c.color}"><svg viewBox="-16 -16 32 32" aria-hidden="true">${ICONS[c.icon]}</svg><span>${c.name}</span><small>${E.CARDS.filter((x) => x.cat === id).length}</small></button>`).join('')}
          </div>
        </div>
      </details>
      <div class="row">
        <button type="button" class="btn btn-ghost" id="how">How to play</button>
        <button class="btn btn-primary grow" id="start" autofocus>${ICON.team} Start game</button>
      </div>`, 'setup');
    panel.querySelectorAll('input[name="Teams"]').forEach((r) => {
      r.onchange = () => {
        sfx.tap(); teams = +r.value;
        panel.querySelectorAll('.names .field').forEach((f, i) => { f.hidden = i >= teams; });
        board.load({ ...E.newGame({ teams }), phase: 'idle' });
      };
    });
    const paintSum = () => {
      const n = E.CARDS.filter((c) => cats.has(c.cat)).length;
      panel.querySelector('.opts-sum').textContent = `${seconds}s · ${rounds} rounds · ${cats.size === 5 ? 'all cards' : `${cats.size} categories`} (${n})`;
    };
    paintSum();
    panel.querySelector('.opts summary').addEventListener('click', () => sfx.tap());
    panel.querySelectorAll('input[name="Timer"]').forEach((r) => { r.onchange = () => { sfx.tap(); seconds = +r.value; paintSum(); }; });
    panel.querySelectorAll('input[name="Rounds"]').forEach((r) => { r.onchange = () => { sfx.tap(); rounds = +r.value; paintSum(); }; });
    panel.querySelectorAll('.cat').forEach((b) => {
      b.onclick = () => {
        sfx.tap();
        const id = b.dataset.cat;
        if (cats.has(id) && cats.size > 1) cats.delete(id); else cats.add(id);
        panel.querySelectorAll('.cat').forEach((x) => x.setAttribute('aria-pressed', String(cats.has(x.dataset.cat))));
        paintSum();
      };
    });
    on('#how', showRules);
    on('#start', () => {
      const nm = [0, 1, 2, 3].map((i) => panel.querySelector(`#n${i}`).value);
      write(PREF_KEY, { teams, seconds, rounds, cats: [...cats], names: nm });
      start({ teams, names: nm.slice(0, teams), seconds, rounds, cats: [...cats] });
    });
  }

  function start(opts) {
    s = E.newGame({ ...opts, avoid: read(SEEN_KEY) || [] });
    s.opts = opts;
    if (board.setMode) board.setMode('play');
    board.load(s);
    paintPass();
  }

  // ---------------- a team's turn ----------------
  function paintPass() {
    const t = E.teamOf(s);
    paintStatus();
    board.sync(s);
    setPanel(`
      <p class="kicker">Round ${s.round + 1} of ${s.rounds} · turn ${E.turnNumber(s)} of ${E.totalTurns(s)}</p>
      <h2><span class="tname" style="color:${t.color}">${esc(t.name)}</span>, your turn!</h2>
      <p class="pass-note">${chip(s.turn)}<span>Pick a describer and pass them the phone. <b>Teammates, no peeking!</b> Other teams, watch for banned words.</span></p>
      ${standingsHTML()}
      <button class="btn btn-primary wide big" id="go" autofocus>Start ${s.seconds}s timer</button>`, 'pass', t.color);
    on('#go', async () => {
      E.startTurn(s);
      sfx.lock();
      buzz(20);
      busy = true;
      paintPlay();
      await board.reveal(s);
      busy = false;
    });
  }

  function paintPlay() {
    const t = E.teamOf(s);
    paintStatus();
    const pts = E.turnScore(s);
    const left = E.MAX_SKIPS - s.skips;
    setPanel(`
      <div class="play-head">
        <div><p class="kicker">${chip(s.turn)}${esc(t.name)}</p><h2 class="turn-pts">This turn <b class="${pts < 0 ? 'neg' : ''}">${pts > 0 ? '+' : ''}${pts}</b></h2></div>
        <div class="clock-wrap"><b id="clock">${Math.ceil(s.timeLeft)}</b><small>sec</small></div>
      </div>
      <button class="btn act act-got wide big" id="got">${ICON.check} Got it!</button>
      <div class="row acts">
        <button class="btn act act-skip grow" id="skip" ${left <= 0 ? 'disabled' : ''}>${ICON.skip} Skip <small>${left} left</small></button>
        <button class="btn act act-buzz grow" id="buzz">${ICON.buzz} Buzz!</button>
      </div>
      <div class="row tail">
        <button class="btn btn-ghost small" id="pause">${ICON.pause} Pause</button>
        <span class="hint mouse-only">Enter got · S skip · B buzz</span>
      </div>`, 'play', t.color);
    panel.querySelector('#got').onclick = () => act('got');
    panel.querySelector('#skip').onclick = () => act('skip');
    panel.querySelector('#buzz').onclick = () => act('buzz');
    on('#pause', () => pause());
    paintClock();
  }

  function act(kind) {
    if (!s || s.phase !== 'play' || paused || busy) return;
    const r = E.mark(s, kind);
    if (!r) { sfx.claim(false); return; }
    if (r === 'got') { sfx.claim(true); buzz(12); }
    else if (r === 'skip') sfx.whoosh(false);
    else { sfx.score(0); buzz([40, 30, 40]); }
    board.react(r, s);
    // update just the bits that change, so taps stay instant
    const pts = E.turnScore(s);
    const b = panel.querySelector('.turn-pts b');
    if (b) { b.textContent = `${pts > 0 ? '+' : ''}${pts}`; b.classList.toggle('neg', pts < 0); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    const sk = panel.querySelector('#skip');
    if (sk) { const left = E.MAX_SKIPS - s.skips; sk.disabled = left <= 0; sk.querySelector('small').textContent = `${left} left`; }
    paintStatus();
  }

  function pause() {
    if (!s || s.phase !== 'play' || paused) return;
    paused = true;
    if (board.setMode) board.setMode('paused');
    board.showBack && board.showBack();
    const t = E.teamOf(s);
    setPanel(`
      <p class="kicker">${chip(s.turn)}${esc(t.name)} · paused</p>
      <h2>Paused at ${Math.ceil(s.timeLeft)}s</h2>
      <p class="sub">The card is hidden. Carry on when the describer is ready.</p>
      <button class="btn btn-primary wide big" id="resume" autofocus>Resume</button>
      <button class="btn btn-ghost small" id="endnow">End this turn now</button>`, 'paused', t.color);
    on('#resume', () => resume());
    on('#endnow', () => { paused = false; E.endTurnEarly(s); timeUp(true); });
  }
  function resume() {
    paused = false;
    if (board.setMode) board.setMode('play');
    paintPlay();
    if (s.card && board.reveal) { busy = true; board.reveal(s).then(() => { busy = false; }); }
  }

  function timeUp(quiet = false) {
    if (!quiet) { sfx.score(0); buzz([60, 40, 60]); }
    if (board.timeUp) board.timeUp(s);
    paintReview();
  }

  function paintReview() {
    const t = E.teamOf(s);
    const pts = E.turnScore(s);
    paintStatus();
    setPanel(`
      <p class="kicker">${chip(s.turn)}${esc(t.name)} · time's up</p>
      <h2>Check the cards <b class="review-pts ${pts < 0 ? 'neg' : ''}">${pts > 0 ? '+' : ''}${pts}</b></h2>
      <p class="hint">Tap a card to fix a mistake: got → skip → buzz. Last card got it in time? Tap it.</p>
      <ol class="review-list">${s.played.map((p, i) => `<li><button type="button" class="rv ${RES[p.result].cls}" data-i="${i}"><span>${esc(p.card.word)}</span><em>${RES[p.result].label}</em></button></li>`).join('') || '<li class="empty">No cards this turn.</li>'}</ol>
      <button class="btn btn-primary wide big" id="bank" autofocus>Bank ${pts > 0 ? '+' : ''}${pts} point${Math.abs(pts) === 1 ? '' : 's'}</button>`, 'review', t.color);
    panel.querySelectorAll('.rv').forEach((b) => { b.onclick = () => { sfx.tick(); E.cycle(s, +b.dataset.i); paintReview(); }; });
    on('#bank', () => {
      const pts2 = E.turnScore(s);
      const r = E.commit(s);
      if (pts2 > 0) sfx.score(Math.min(4, pts2));
      if (r === 'over') return finish();
      paintPass();
    });
  }

  function finish() {
    if (board.setMode) board.setMode('over');
    // remember which cards were seen so the next game deals fresh ones first
    const seen = [...new Set([...E.usedIds(s), ...(read(SEEN_KEY) || [])])].slice(0, 140);
    write(SEEN_KEY, seen);
    const w = E.winners(s);
    const headline = w.length > 1 ? `Draw lah! ${w.map((i) => esc(s.teams[i].name)).join(' & ')}` : `${esc(s.teams[w[0]].name)} wins!`;
    sfx.win();
    confetti({ count: 220, colors: [...w.map((i) => s.teams[i].color), '#FFD877', '#fff'] });
    const best = s.teams.flatMap((t, i) => t.history.map((h) => ({ i, ...h }))).sort((a, b) => b.pts - a.pts)[0];
    paintStatus();
    board.sync(s);
    setPanel(`
      <p class="kicker">${s.rounds} rounds · final scores</p>
      <h2 class="win" style="color:${s.teams[w[0]].color}">${headline}</h2>
      ${standingsHTML()}
      ${best && best.pts > 0 ? `<p class="sub">Best turn: <b style="color:${s.teams[best.i].color}">${esc(s.teams[best.i].name)}</b> with ${best.got} card${best.got === 1 ? '' : 's'} (+${best.pts}).</p>` : ''}
      <div class="row">
        <button class="btn btn-ghost" id="setup">New setup</button>
        <button class="btn btn-primary grow" id="again" autofocus>Play again</button>
      </div>`, 'over', s.teams[w[0]].color);
    on('#setup', () => goSetup());
    on('#again', () => start(s.opts));
  }

  goSetup();
  return { get state() { return s; } };
}
