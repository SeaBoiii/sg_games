// Kiasu Quiz — screen flow shared by the 2D and 3D builds.
import * as E from './engine.js';
import { catIcon, esc } from './art.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';
import { confetti } from '../../../assets/lib/fx.js';

const BEST_KEY = 'kiasu.best';
const PREF_KEY = 'kiasu.setup';
const SEEN_KEY = 'kiasu.seen';
const BRAND = '#0F7C8A';
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const PC = E.PLAYER_COLORS;
const TC = ['#E0457B', '#2D6FD1', '#F2B134', '#2F9E5B'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const LINES = {
  hello: ['Welcome, welcome! Ready to be kiasu?', 'Steady, contestants?', 'Eh, no googling ah!'],
  ask: ['Think carefully…', 'Easy one, can?', 'Take your time… but not too long.', 'This one ah, quite cheem.'],
  buzzOpen: ['Buzz in, buzz in!', 'Who knows? Buzz!', 'Fastest finger wins!'],
  buzzed: ['Quick! Answer!', 'Ok, what\'s your answer?', 'Got it or not?'],
  right: ['Wah, steady!', 'Correct! Shiok!', 'Power lah!', 'You very smart leh.'],
  wrong: ['Aiyoh!', 'Wrong lah!', 'So close!', 'Alamak…'],
  steal: ['Steal it! Anyone?', 'Still open! Buzz!'],
  timeout: ['Too slow lah!', 'Time\'s up!', 'Nobody knows meh?'],
  fifty: ['Kiasu move. I like it.'], auntie: ['The aunties have voted!'], pass: ['Chope next one!'],
};

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3.5h6.5a4 4 0 0 1 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 5.5l2 2 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  one: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6" fill="currentColor"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5z" fill="currentColor"/></svg>',
  buzzer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15a8 8 0 0 1 16 0z" fill="currentColor"/><rect x="2.5" y="15" width="19" height="4" rx="1.5" fill="currentColor" opacity=".6"/><path d="M12 2v3M5 5l2 2M19 5l-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
};

const RULES_HTML = `
  <h2>How to play</h2>
  <p>Singapore trivia, game-show style: history, places, makan, Singlish and everyday SG life.</p>
  <ol class="rules-steps">
    <li><b>Solo:</b> pick A, B, C or D before the timer runs out. Faster answers score more, and a streak of right answers adds a bonus.</li>
    <li><b>Lifelines (once each):</b> <i>Kiasu 50:50</i> removes two wrong answers, <i>Ask Auntie</i> polls the kopitiam crowd (usually right…), <i>Chope next</i> swaps the question for another.</li>
    <li><b>Buzzer battle (2–4):</b> everyone races to buzz in. Whoever buzzes first answers. Right wins the points; wrong loses half and locks you out, so the others can steal.</li>
  </ol>
  <p>Questions start easy and get harder. Every answer comes with a "Did you know?" fact.</p>
  <p class="hint">Keyboard: answers 1–4 (or A–D) · buzzers Q, P, Z, M · Enter for next · P to pause.</p>`;

export function startFlow({ root, createBoard, hubHref, altHref, altLabel }) {
  let s = null;
  let paused = false;
  let lastTick = 0;

  root.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="${hubHref}" aria-label="Back to SG Games">${ICON.back}</a>
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>Kiasu<b>Quiz</b></span></div>
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
  board.onPick = (i) => choose(i);
  board.onBuzz = (p) => hitBuzzer(p);

  const soundBtn = $('#btn-sound');
  const paintSound = () => { soundBtn.innerHTML = sfx.muted ? ICON.mute : ICON.sound; soundBtn.setAttribute('aria-pressed', String(!sfx.muted)); };
  paintSound();
  soundBtn.onclick = () => { sfx.setMuted(!sfx.muted); paintSound(); sfx.tap(); };
  const live = () => s && (s.phase === 'ask' || s.phase === 'answering');
  const showRules = () => { sfx.tap(); if (live() && !paused) pause(); $('#rules').showModal(); };
  $('#btn-rules').onclick = showRules;
  const menu = $('#menu');
  $('#btn-menu').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; sfx.tap(); if (!menu.hidden && live() && !paused) pause(); };
  document.addEventListener('click', () => { menu.hidden = true; });
  menu.querySelector('[data-act="rules"]').onclick = showRules;
  menu.querySelector('[data-act="new"]').onclick = () => goSetup();
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && live() && !paused) pause(); });

  document.addEventListener('keydown', (e) => {
    if (!s || $('#rules').open || (e.target.matches && e.target.matches('input'))) return;
    const k = e.key.toLowerCase();
    if ((k === 'p' && s.mode === 'solo') || k === 'escape') { if (live()) { paused ? resume() : pause(); e.preventDefault(); } return; }
    if (paused || e.repeat) return;
    const num = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[k];
    if (s.mode === 'buzz' && s.phase === 'ask') {
      const p = E.PLAYER_KEYS.indexOf(k);
      if (p >= 0 && p < s.players.length) { hitBuzzer(p); e.preventDefault(); }
      return;
    }
    if ((s.phase === 'ask' && s.mode === 'solo') || s.phase === 'answering') {
      if (num != null) { choose(num); e.preventDefault(); }
      return;
    }
    if (s.phase === 'reveal' && k === 'enter' && !(e.target.closest && e.target.closest('button'))) { goNext(); e.preventDefault(); }
  });

  // ---------------- loop ----------------
  let lastT = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    if (s && !paused && live()) {
      const ev = E.tick(s, dt);
      const tl = Math.ceil(s.phase === 'answering' ? s.answerLeft : s.timeLeft);
      if (tl <= 5 && tl !== lastTick && tl > 0) { lastTick = tl; sfx.tick(); }
      if (ev === 'timeout') { sfx.score(0); buzz([50, 40, 50]); board.say(pick(LINES.timeout), 'cross'); paintReveal(); }
      else if (ev === 'slow') afterWrong({ who: s.result ? s.result.who : null, points: -Math.round(E.BASE[E.question(s).d] / 2), slow: true });
      paintClock();
    }
    if (s) board.sync(s);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // ---------------- helpers ----------------
  function paintStatus() {
    if (!s) { statusEl.innerHTML = ''; return; }
    if (s.phase === 'over') { statusEl.innerHTML = '<span class="station"><b>Final scores</b></span>'; return; }
    const q = E.question(s);
    const right = s.mode === 'solo'
      ? `<span class="score-pill" title="Score">${s.players[0].score}</span>`
      : s.players.map((p) => `<span class="score-pill mini" style="background:${p.color}" title="${esc(p.name)}">${p.score}</span>`).join('');
    statusEl.innerHTML = `
      <span class="line-chip" style="--line:${E.CATEGORIES[q.cat].color}">${E.CATEGORIES[q.cat].name}</span>
      <span class="station"><b>Question ${s.qi + 1}/${E.total(s)}</b><small>${s.mode === 'solo' ? 'Solo' : 'Buzzer battle'}</small></span>${right}`;
  }
  function setPanel(html, cls = '', color = BRAND) {
    panel.className = `panel ${cls}`;
    panel.style.setProperty('--team', color);
    panel.innerHTML = `<div class="panel-inner">${html}</div>`;
    const first = panel.querySelector('[autofocus]');
    if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }
  const on = (q, fn) => { const b = panel.querySelector(q); if (b) b.onclick = (e) => { sfx.tap(); fn(e); }; };
  const dot = (i) => `<i class="pdot" style="--c:${PC[i]}"></i>`;
  function paintClock() {
    const el = panel.querySelector('#clock');
    if (!el || !s) return;
    const v = Math.max(0, Math.ceil(s.phase === 'answering' ? s.answerLeft : s.timeLeft));
    if (el.textContent !== String(v)) el.textContent = String(v);
    el.classList.toggle('hurry', v <= 5);
  }
  const answersHTML = () => {
    const q = E.question(s);
    return `<div class="answers">${q.opts.map((o, i) => `<button class="ans" data-i="${i}" style="--c:${TC[i]}" ${s.hidden.has(i) || (s.tried && s.tried.has(i)) ? 'disabled' : ''}><b>${'ABCD'[i]}</b><span>${esc(o)}</span>${s.poll ? `<em>${s.poll[i]}%</em>` : ''}</button>`).join('')}</div>`;
  };
  const wireAnswers = () => panel.querySelectorAll('.ans').forEach((b) => b.addEventListener('click', () => choose(+b.dataset.i)));

  // ---------------- setup ----------------
  function goSetup() {
    s = null;
    paused = false;
    paintStatus();
    const pref = read(PREF_KEY) || {};
    let mode = pref.mode === 'buzz' ? 'buzz' : 'solo';
    let count = E.LENGTHS.includes(pref.count) ? pref.count : 10;
    let players = [2, 3, 4].includes(pref.players) ? pref.players : 2;
    const cats = new Set((pref.cats || Object.keys(E.CATEGORIES)).filter((c) => E.CATEGORIES[c]));
    if (!cats.size) Object.keys(E.CATEGORIES).forEach((c) => cats.add(c));
    const names = pref.names || ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
    const best = read(BEST_KEY) || {};
    const showDemo = () => { const d = E.newGame({ mode, names: names.slice(0, mode === 'buzz' ? players : 1).map((n, i) => (mode === 'solo' ? 'You' : n)) }); d.phase = 'idle'; board.sync(d); };
    showDemo();
    board.say(pick(LINES.hello));
    if (board.setMode) board.setMode('idle');
    const seg = (name, vals, cur, fmt = (v) => v) => `<fieldset class="seg" aria-label="${name}"><legend>${name}</legend>${vals.map((v) => `<label><input type="radio" name="${name}" value="${v}" ${v === cur ? 'checked' : ''}/><span>${fmt(v)}</span></label>`).join('')}</fieldset>`;
    setPanel(`
      <p class="kicker">The Singapore trivia show</p>
      <h1 class="title">Kiasu <span>Quiz</span></h1>
      <p class="sub">${E.QUESTIONS.length} questions on history, places, makan, Singlish and SG life. Steady or not?</p>
      <p class="rotate-hint">${ICON.phone}<span><b>Best in landscape.</b> Turn your phone sideways for the full studio.</span></p>
      <div class="mode-tabs" role="radiogroup" aria-label="Mode">
        <button type="button" role="radio" data-m="solo" aria-checked="${mode === 'solo'}">${ICON.one}<span>Solo<small>beat the clock</small></span></button>
        <button type="button" role="radio" data-m="buzz" aria-checked="${mode === 'buzz'}">${ICON.buzzer}<span>Buzzer battle<small>2–4 on one screen</small></span></button>
      </div>
      <div class="opt-buzz" ${mode === 'buzz' ? '' : 'hidden'}>${seg('Players', [2, 3, 4], players)}
        <div class="names four">${[0, 1, 2, 3].map((i) => `<label class="field" style="--team:${PC[i]}" ${i < players ? '' : 'hidden'}><span>Buzzer ${'QPZM'[i]}</span><input id="n${i}" maxlength="12" value="${esc(names[i] || `Player ${i + 1}`)}"/></label>`).join('')}</div>
      </div>
      <details class="opts" ${matchMedia('(orientation: landscape) and (max-height: 560px)').matches ? '' : 'open'}>
        <summary><span>Quiz options</span><small class="opts-sum"></small></summary>
        <div class="opts-body">
          ${seg('Questions', E.LENGTHS, count)}
          <div class="cats" role="group" aria-label="Categories">${Object.entries(E.CATEGORIES).map(([id, c]) => `<button type="button" class="cat" data-cat="${id}" aria-pressed="${cats.has(id)}" style="--c:${c.color}"><svg viewBox="-16 -16 32 32" aria-hidden="true">${catIcon(id)}</svg><span>${c.name}</span></button>`).join('')}</div>
        </div>
      </details>
      <p class="best-line opt-solo" ${mode === 'solo' ? '' : 'hidden'}>${ICON.star}<span>Best: ${E.LENGTHS.map((n) => `<b>${n}Q ${best[n] || 0}</b>`).join(' · ')}</span></p>
      <div class="row">
        <button type="button" class="btn btn-ghost" id="how">How to play</button>
        <button class="btn btn-primary grow" id="start" autofocus>Start the show</button>
      </div>`, 'setup');
    const paintSum = () => {
      const n = E.QUESTIONS.filter((q) => cats.has(q.cat)).length;
      panel.querySelector('.opts-sum').textContent = `${count} questions · ${cats.size === 5 ? 'all topics' : `${cats.size} topics`} (${n})`;
    };
    paintSum();
    const repaint = () => {
      panel.querySelectorAll('.mode-tabs button').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.m === mode)));
      panel.querySelector('.opt-buzz').hidden = mode !== 'buzz';
      panel.querySelector('.opt-solo').hidden = mode !== 'solo';
      panel.querySelectorAll('.names .field').forEach((f, i) => { f.hidden = i >= players; });
      showDemo();
    };
    panel.querySelectorAll('.mode-tabs button').forEach((b) => { b.onclick = () => { sfx.tap(); mode = b.dataset.m; repaint(); }; });
    panel.querySelectorAll('input[name="Players"]').forEach((r) => { r.onchange = () => { sfx.tap(); players = +r.value; repaint(); }; });
    panel.querySelectorAll('input[name="Questions"]').forEach((r) => { r.onchange = () => { sfx.tap(); count = +r.value; paintSum(); }; });
    panel.querySelector('.opts summary').addEventListener('click', () => sfx.tap());
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
      write(PREF_KEY, { mode, count, players, cats: [...cats], names: nm });
      start({ mode, count, cats: [...cats], names: mode === 'buzz' ? nm.slice(0, players) : ['You'] });
    });
  }

  function start(opts) {
    s = E.newGame({ ...opts, avoid: read(SEEN_KEY) || [] });
    s.opts = opts;
    paused = false;
    if (board.setMode) board.setMode('play');
    paintStatus();
    board.say(s.mode === 'buzz' ? 'Fingers on buzzers!' : 'Here we go!');
    setPanel(`
      <p class="kicker">${E.total(s)} questions · ${s.mode === 'solo' ? 'Solo' : 'Buzzer battle'}</p>
      <h2>${s.mode === 'solo' ? 'Ready, contestant?' : 'Fingers on buzzers!'}</h2>
      ${s.mode === 'buzz' ? `<ul class="keys">${s.players.map((p, i) => `<li style="--c:${p.color}"><kbd>${E.PLAYER_KEYS[i].toUpperCase()}</kbd>${esc(p.name)}</li>`).join('')}</ul><p class="hint">Tap your buzzer on screen or press your key. Wrong answers lose half the points.</p>`
        : `<p class="hint">${E.SOLO_TIME} seconds a question. Faster answers score more. You have three lifelines.</p>`}
      <button class="btn btn-primary wide big" id="go" autofocus>First question</button>`, 'intro');
    on('#go', () => beginQuestion());
  }

  function beginQuestion() {
    E.startQuestion(s);
    lastTick = 0;
    sfx.whoosh(true);
    paintStatus();
    board.say(s.mode === 'buzz' ? pick(LINES.buzzOpen) : pick(LINES.ask));
    paintAsk();
  }

  function paintAsk() {
    const q = E.question(s);
    const head = `<div class="ask-head"><p class="kicker"><svg viewBox="-16 -16 32 32" class="kcat" style="color:${E.CATEGORIES[q.cat].color}" aria-hidden="true">${catIcon(q.cat)}</svg>Q${s.qi + 1} · ${E.CATEGORIES[q.cat].name} · ${'★'.repeat(q.d)}</p><b id="clock" class="clock">${Math.ceil(s.timeLeft)}</b></div>`;
    if (s.mode === 'solo') {
      const L = s.lifelines;
      setPanel(`${head}<p class="q-text">${esc(q.q)}</p>${answersHTML()}
        <div class="lifelines">
          <button class="life" id="l-fifty" ${L.fifty ? '' : 'disabled'}><b>50:50</b><small>Kiasu</small></button>
          <button class="life" id="l-auntie" ${L.auntie ? '' : 'disabled'}><b>Ask Auntie</b><small>poll</small></button>
          <button class="life" id="l-pass" ${L.pass ? '' : 'disabled'}><b>Chope next</b><small>swap</small></button>
        </div>`, 'ask');
      wireAnswers();
      on('#l-fifty', () => { if (E.useFifty(s)) { sfx.sweep(); board.say(pick(LINES.fifty)); paintAsk(); } });
      on('#l-auntie', () => { if (E.useAuntie(s)) { sfx.drum(); board.say(pick(LINES.auntie)); paintAsk(); } });
      on('#l-pass', () => { if (E.usePass(s, read(SEEN_KEY) || [])) { sfx.whoosh(true); board.say(pick(LINES.pass)); paintStatus(); paintAsk(); } });
      return;
    }
    // buzz: show the buzzers
    setPanel(`${head}<p class="q-text">${esc(q.q)}</p>
      ${s.locked.size ? `<p class="steal">${s.locked.size === 1 ? 'Wrong! Anyone can steal it.' : 'Still open. Steal it!'}</p>` : ''}
      <div class="buzzers n${s.players.length}">${s.players.map((p, i) => `<button class="buzzer-btn" data-p="${i}" style="--c:${p.color}" ${s.locked.has(i) ? 'disabled' : ''}><b>${esc(p.name)}</b><small>${s.locked.has(i) ? 'locked out' : `buzz · ${E.PLAYER_KEYS[i].toUpperCase()}`}</small></button>`).join('')}</div>`, 'ask');
    panel.querySelectorAll('.buzzer-btn').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); hitBuzzer(+b.dataset.p); }));
  }

  function hitBuzzer(p) {
    if (!s || paused || !E.buzz(s, p)) return;
    sfx.lock(); buzz(40);
    board.react('buzz', s, { p });
    board.say(`${s.players[p].name}! ${pick(LINES.buzzed)}`);
    const q = E.question(s);
    setPanel(`<div class="ask-head"><p class="kicker">${dot(p)}<b style="color:${s.players[p].color}">${esc(s.players[p].name)}</b>&nbsp;buzzed!</p><b id="clock" class="clock">${E.BUZZ_ANSWER}</b></div>
      <p class="q-text">${esc(q.q)}</p>${answersHTML()}`, 'answering', s.players[p].color);
    wireAnswers();
    paintStatus();
  }

  function choose(i) {
    if (!s || paused) return;
    if (!(s.phase === 'answering' || (s.phase === 'ask' && s.mode === 'solo'))) return;
    const res = E.answer(s, i);
    if (!res) return;
    if (res.correct) {
      sfx.claim(true); buzz(20);
      board.react('right', s, { choice: i, points: res.points });
      board.say(pick(LINES.right), 'happy');
      paintReveal();
    } else afterWrong(res);
  }

  function afterWrong(res) {
    sfx.claim(false); buzz([40, 30, 40]);
    board.react('wrong', s, { choice: res.choice, points: res.points });
    if (s.phase === 'reveal') { board.say(pick(LINES.wrong), 'cross'); paintReveal(); return; }
    // buzz mode: others may steal
    board.say(`${pick(LINES.wrong)} ${pick(LINES.steal)}`, 'cross');
    paintStatus();
    paintAsk();
  }

  function paintReveal() {
    paintStatus();
    const q = E.question(s);
    const r = s.result || {};
    let head;
    if (r.timeout) head = `<h2 class="res bad">Time's up!</h2>`;
    else if (r.allWrong) head = `<h2 class="res bad">Nobody got it!</h2>`;
    else if (r.correct) head = `<h2 class="res good">${s.mode === 'buzz' ? `${esc(s.players[r.who].name)} got it!` : 'Correct!'} <small>+${r.points}</small></h2>`;
    else head = `<h2 class="res bad">Wrong lah!</h2>`;
    const last = s.qi >= E.total(s) - 1;
    setPanel(`
      <p class="kicker">Q${s.qi + 1} · ${E.CATEGORIES[q.cat].name}</p>
      ${head}
      <p class="answer-line"><b style="--c:${TC[q.right]}">${'ABCD'[q.right]}</b><span>${esc(q.opts[q.right])}</span></p>
      <div class="fact"><b>Did you know?</b> ${esc(q.fact)}</div>
      ${s.mode === 'buzz' ? `<ul class="standings">${E.standings(s).map((i) => `<li style="--c:${s.players[i].color}">${dot(i)}<span>${esc(s.players[i].name)}</span><b>${s.players[i].score}</b></li>`).join('')}</ul>`
        : `<p class="streak">Streak <b>${s.players[0].streak}</b> · score <b>${s.players[0].score}</b></p>`}
      <button class="btn btn-primary wide big" id="next" autofocus>${last ? 'Final scores' : 'Next question'}</button>`, 'reveal', r.correct ? '#2F9E5B' : '#D7263D');
    on('#next', () => goNext());
  }

  function goNext() {
    if (!s || s.phase !== 'reveal') return;
    if (E.next(s) === 'over') return finish();
    beginQuestion();
  }

  function pause() {
    if (!live() || paused) return;
    paused = true;
    if (board.setMode) board.setMode('paused');
    setPanel(`<p class="kicker">Paused</p><h2>Time out!</h2><p class="sub">No peeking at your phone's search bar ah.</p><button class="btn btn-primary wide big" id="resume" autofocus>Resume</button><button class="btn btn-ghost small" id="quit">Quit to setup</button>`, 'paused');
    on('#resume', () => resume());
    on('#quit', () => goSetup());
  }
  function resume() {
    paused = false;
    lastT = performance.now();
    if (board.setMode) board.setMode('play');
    if (s.phase === 'answering') {
      const p = s.buzzer;
      const q = E.question(s);
      setPanel(`<div class="ask-head"><p class="kicker">${dot(p)}<b style="color:${s.players[p].color}">${esc(s.players[p].name)}</b>&nbsp;buzzed!</p><b id="clock" class="clock">${Math.ceil(s.answerLeft)}</b></div><p class="q-text">${esc(q.q)}</p>${answersHTML()}`, 'answering', s.players[p].color);
      wireAnswers();
    } else paintAsk();
  }

  function finish() {
    s.phase = 'over';
    if (board.setMode) board.setMode('over');
    const seen = [...new Set([...E.usedIds(s), ...(read(SEEN_KEY) || [])])].slice(0, 90);
    write(SEEN_KEY, seen);
    paintStatus();
    if (s.mode === 'solo') {
      const pl = s.players[0];
      const st = E.stars(s);
      const all = read(BEST_KEY) || {};
      const nb = pl.score > (all[E.total(s)] || 0);
      if (nb) { all[E.total(s)] = pl.score; write(BEST_KEY, all); }
      const line = st === 3 ? 'Wah, walking encyclopedia!' : st === 2 ? 'Steady lah, true blue Singaporean.' : st === 1 ? 'Not bad, can study more.' : 'Aiyoh, go read up ah.';
      board.say(line, st >= 2 ? 'happy' : 'ok');
      if (st >= 2 || nb) { sfx.win(); confetti({ count: 200, colors: ['#F2B134', '#0F7C8A', '#E0457B', '#2D6FD1'] }); } else sfx.score(1);
      setPanel(`
        <p class="kicker">${E.total(s)} questions · final score</p>
        <h2 class="win">${pl.score} points</h2>
        <div class="stars big">${[1, 2, 3].map((i) => `<i class="${st >= i ? 'on' : ''}">${ICON.star}</i>`).join('')}</div>
        <p class="sub">${line}${nb ? ' <b class="newbest">New best!</b>' : ''}</p>
        <ul class="stats"><li><b>${pl.right}/${E.total(s)}</b><span>right</span></li><li><b>${pl.best}</b><span>best streak</span></li><li><b>${3 - Object.values(s.lifelines).filter(Boolean).length}</b><span>lifelines used</span></li></ul>
        <div class="row"><button class="btn btn-ghost" id="setup">Setup</button><button class="btn btn-primary grow" id="again" autofocus>Play again</button></div>`, 'over');
    } else {
      const order = E.standings(s);
      const top = s.players[order[0]].score;
      const winners = order.filter((i) => s.players[i].score === top);
      const headline = winners.length > 1 ? `Tie lah! ${winners.map((i) => esc(s.players[i].name)).join(' & ')}` : `${esc(s.players[winners[0]].name)} wins!`;
      board.say(winners.length > 1 ? 'Wah, so close!' : `Congrats ${s.players[winners[0]].name}! Champion!`, 'happy');
      sfx.win(); confetti({ count: 220, colors: winners.map((i) => s.players[i].color).concat(['#FFE59A']) });
      setPanel(`
        <p class="kicker">Buzzer battle · final scores</p>
        <h2 class="win" style="color:${s.players[winners[0]].color}">${headline}</h2>
        <ol class="podium-list">${order.map((i) => `<li style="--c:${s.players[i].color}">${dot(i)}<span>${esc(s.players[i].name)}</span><small>${s.players[i].right} right · ${s.players[i].wrong} wrong</small><b>${s.players[i].score}</b></li>`).join('')}</ol>
        <div class="row"><button class="btn btn-ghost" id="setup">Setup</button><button class="btn btn-primary grow" id="again" autofocus>Rematch</button></div>`, 'over', s.players[winners[0]].color);
    }
    on('#setup', () => goSetup());
    on('#again', () => start(s.opts));
  }

  goSetup();
  return { get state() { return s; } };
}
