// Chope Wars — screen flow shared by the 2D and 3D builds.
import * as E from './engine.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';
import { confetti, wait } from '../../../assets/lib/fx.js';

const SAVE_KEY = 'chope.state.v1';
const PREF_KEY = 'chope.setup';
const CPU_NAME = 'Uncle Lim';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  broom: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 3.5l-4 8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M7 11.5h7.5l2 8.5H4.5z" fill="currentColor"/><path d="M8 15v4M11 15v4M14 15v4" stroke="#fff" stroke-width="1.4" opacity=".6"/></svg>',
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H4V2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 7A8 8 0 1 1 4 13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  rotate: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3.5h6.5a4 4 0 0 1 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 5.5l2 2 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  two: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><circle cx="16.5" cy="8.5" r="2.7" fill="currentColor" opacity=".7"/><path d="M2.5 19c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5z" fill="currentColor"/><path d="M13 19c.2-2.9 1.8-4.8 4-4.8 2.4 0 4.2 2 4.4 4.8z" fill="currentColor" opacity=".7"/></svg>',
  cpu: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6" fill="currentColor"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5z" fill="currentColor"/><path d="M8.5 4.8h7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};

const RULES_HTML = `
  <h2>How to play Chope Wars</h2>
  <p>Lunchtime at the hawker centre. Two players fight for tables, one tissue packet at a time.</p>
  <ol class="rules-steps">
    <li><b>Chope a stool.</b> On your turn, tap any empty stool to drop your tissue packet on it.</li>
    <li><b>Stools are shared.</b> A stool between two tables counts for both of them.</li>
    <li><b>Claim tables.</b> When all 4 stools around a table are choped, whoever has more packets there claims it. On a <b>2–2 tie, whoever choped the last stool wins it</b>.</li>
    <li><b>Some tables are better.</b> Normal tables are worth 1, tables under the fan are worth 2, and tables beside the famous stall are worth 3.</li>
    <li><b>Cleaner auntie (once per game).</b> Instead of choping, call the auntie: she clears one of your opponent's packets from a table nobody has claimed yet, and yours goes there instead.</li>
  </ol>
  <p>When every stool is taken, the player with the most points wins (most tables breaks a tie).</p>
  <p><b>Tip:</b> a table with 3 stools taken (glowing ring) goes to whoever chopes the last seat, unless one player already has 3 of them. Don't give your opponent the last seat!</p>
  <p><b>Phones:</b> turn sideways for the biggest board.</p>`;

export function startFlow({ root, createBoard, hubHref, altHref, altLabel }) {
  let s = null;
  let busy = false;
  let swapMode = false;
  let history = [];
  let lastText = '';

  root.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="${hubHref}" aria-label="Back to SG Games">${ICON.back}</a>
      <div class="brand"><span class="brand-mark" aria-hidden="true"><i></i></span><span>Chope<b>Wars</b></span></div>
      <div class="scores" id="scores" aria-live="polite"></div>
      <div class="bar-actions">
        <button class="icon-btn" id="btn-rules" aria-label="How to play">${ICON.help}</button>
        <button class="icon-btn" id="btn-sound" aria-label="Toggle sound"></button>
        <button class="icon-btn" id="btn-menu" aria-label="Menu" aria-haspopup="true">${ICON.menu}</button>
      </div>
      <div class="menu" id="menu" hidden>
        <button data-act="rules">How to play</button>
        <button data-act="new">New game</button>
        ${altHref ? `<a href="${altHref}">${altLabel}</a>` : ''}
        <a href="${hubHref}">All SG Games</a>
      </div>
    </header>
    <main class="stage" id="stage"></main>
    <section class="panel" id="panel" aria-live="polite"></section>
    <dialog class="sheet" id="rules"><div class="sheet-body">${RULES_HTML}</div><form method="dialog"><button class="btn btn-primary wide">Got it</button></form></dialog>
    <dialog class="sheet small" id="confirm"><div class="sheet-body"><h2>Start a new game?</h2><p>This game will be lost.</p></div>
      <form method="dialog" class="row"><button class="btn btn-ghost" value="no">Cancel</button><button class="btn btn-primary" value="yes">New game</button></form></dialog>
    <div class="toast" id="toast" role="status"></div>`;

  const $ = (q) => root.querySelector(q);
  const panel = $('#panel');
  const scoresEl = $('#scores');
  const board = createBoard($('#stage'));
  board.onPick = (stool) => humanMove(stool);

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
  menu.querySelector('[data-act="new"]').onclick = () => {
    if (!s) return;
    const dlg = $('#confirm');
    dlg.returnValue = '';
    dlg.showModal();
    dlg.onclose = () => { if (dlg.returnValue === 'yes') { write(SAVE_KEY, null); goSetup(); } };
  };
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  const save = () => write(SAVE_KEY, s && s.phase === 'play' ? s : null);
  const isCpu = (p) => !!(s.cpu && s.cpu.seat === p);
  const pname = (p) => `<b class="tname" style="--team:${s.players[p].color}">${esc(s.players[p].name)}</b>`;

  function paintScores(bump = []) {
    if (!s) { scoresEl.innerHTML = ''; return; }
    scoresEl.innerHTML = s.players.map((p, i) => `
      <div class="score ${s.phase === 'play' && s.turn === i ? 'active' : ''} ${bump.includes(i) ? 'bump' : ''}" style="--team:${p.color}">
        <span class="score-name">${esc(p.name)}</span>
        ${p.auntie ? '<span class="score-aunt" title="Cleaner auntie available">🧹</span>' : ''}
        <span class="score-num">${p.score}</span>
      </div>`).join('<span class="vs">VS</span>');
  }

  function setPanel(html, { color = 'var(--ink)', cls = '' } = {}) {
    panel.className = `panel ${cls}`;
    panel.style.setProperty('--team', color);
    panel.innerHTML = `<div class="panel-inner">${html}</div>`;
    const first = panel.querySelector('[autofocus]');
    if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }
  const on = (q, fn) => { const b = panel.querySelector(q); if (b) b.onclick = (e) => { if (busy) return; sfx.tap(); buzz(); fn(e); }; };

  // ---------------- setup ----------------
  function goSetup() {
    s = null;
    history = [];
    swapMode = false;
    paintScores();
    const saved = read(SAVE_KEY);
    const pref = read(PREF_KEY) || {};
    let mode = pref.mode === 'cpu' ? 'cpu' : 'pvp';
    const names = pref.names || E.DEFAULT_NAMES;
    const size = pref.size || 'classic';
    const level = pref.level || 'easy';
    board.load(E.newGame({ size }));
    board.setInteractive(false);
    if (board.setMode) board.setMode('idle');
    setPanel(`
      <p class="kicker">Hawker centre showdown</p>
      <h1 class="title">Chope <span>W</span><em>ars</em></h1>
      <p class="sub">One tissue packet at a time. Claim the best tables before the lunch crowd does.</p>
      <p class="rotate-hint">${ICON.rotate}<span><b>Best in landscape.</b> Turn your phone sideways for a bigger board.</span></p>
      ${saved ? `<button class="btn btn-primary wide" id="continue">Continue · ${esc(saved.players[0].name)} ${saved.players[0].score}–${saved.players[1].score} ${esc(saved.players[1].name)}</button><div class="or"><span>or start fresh</span></div>` : ''}
      <div class="mode-tabs" role="radiogroup" aria-label="Game mode">
        <button type="button" role="radio" data-mode="pvp" aria-checked="${mode === 'pvp'}">${ICON.two}<span>2 players<small>pass &amp; play</small></span></button>
        <button type="button" role="radio" data-mode="cpu" aria-checked="${mode === 'cpu'}">${ICON.cpu}<span>vs ${CPU_NAME}<small>solo vs the CPU</small></span></button>
      </div>
      <form class="setup-form" id="setup" data-mode="${mode}" autocomplete="off">
        <div class="names">
          <label class="field" style="--team:${E.COLORS[0]}"><span>Pink packet</span><input name="p0" maxlength="16" value="${esc(names[0])}" required /></label>
          <label class="field pvp-only" style="--team:${E.COLORS[1]}"><span>Blue packet</span><input name="p1" maxlength="16" value="${esc(names[1])}" /></label>
          <fieldset class="seg cpu-only"><legend>${CPU_NAME} is</legend>
            <label><input type="radio" name="level" value="easy" ${level === 'easy' ? 'checked' : ''}/><span>Chill</span></label>
            <label><input type="radio" name="level" value="hard" ${level === 'hard' ? 'checked' : ''}/><span>Kiasu</span></label>
          </fieldset>
        </div>
        <fieldset class="seg"><legend>Board</legend>
          ${[['small', '3×3'], ['classic', '4×4'], ['big', '5×5']].map(([v, l]) => `<label><input type="radio" name="size" value="${v}" ${size === v ? 'checked' : ''}/><span>${l}</span></label>`).join('')}
        </fieldset>
        <div class="row">
          <button type="button" class="btn btn-ghost" id="how">How to play</button>
          <button class="btn btn-primary grow" ${saved ? '' : 'autofocus'}>Start game</button>
        </div>
      </form>`, { color: 'var(--ink)', cls: 'setup' });
    on('#how', showRules);
    const form = panel.querySelector('#setup');
    panel.querySelectorAll('.mode-tabs button').forEach((b) => {
      b.onclick = () => {
        sfx.tap();
        mode = b.dataset.mode;
        form.dataset.mode = mode;
        panel.querySelectorAll('.mode-tabs button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      };
    });
    form.querySelectorAll('input[name=size]').forEach((r) => r.addEventListener('change', () => board.load(E.newGame({ size: r.value }))));
    on('#continue', () => { s = saved; history = []; begin(); });
    form.onsubmit = (e) => {
      e.preventDefault();
      sfx.lock();
      const f = new FormData(form);
      const cfg = { mode, size: f.get('size'), level: f.get('level') || 'easy', names: [f.get('p0'), f.get('p1') || E.DEFAULT_NAMES[1]] };
      write(PREF_KEY, cfg);
      s = E.newGame({
        size: cfg.size,
        names: mode === 'cpu' ? [cfg.names[0], CPU_NAME] : cfg.names,
        cpu: mode === 'cpu' ? { level: cfg.level, seat: 1 } : null,
      });
      history = [];
      lastText = '';
      begin();
    };
  }

  // ---------------- play ----------------
  function begin() {
    board.load(s);
    if (board.setMode) board.setMode('play');
    save();
    paintScores();
    if (s.phase === 'over') return paintOver();
    nextTurn();
  }

  function nextTurn() {
    swapMode = false;
    paintScores();
    if (s.phase === 'over') { finish(); return; }
    if (isCpu(s.turn)) { cpuTurn(); return; }
    paintTurn();
  }

  function paintTurn() {
    const p = s.turn;
    const me = s.players[p];
    const left = s.stools.filter((x) => x == null).length;
    const canAuntie = me.auntie > 0 && s.stools.some((_, i) => E.canSwap(s, i, p));
    board.setInteractive(true, { mode: swapMode ? 'swap' : 'place', player: p, s });
    const opp = s.players[E.other(p)].name;
    setPanel(`
      <div class="turn-line"><span class="packet-chip" aria-hidden="true"></span>
        <div><p class="kicker">Move ${s.moves + 1} · ${left} stool${left === 1 ? '' : 's'} left</p><h2>${esc(me.name)}'s turn</h2></div>
      </div>
      ${swapMode
        ? `<p class="swap-note">🧹 Auntie is coming! Tap one of ${esc(opp)}'s packets on an open table to swap it for yours.</p>`
        : `<p class="sub">Tap an empty stool to chope it.</p>`}
      <p class="lastmove">${lastText}</p>
      <div class="row">
        ${swapMode
          ? '<button class="btn btn-ghost small" id="cancel">Cancel</button>'
          : `<button class="btn small ${canAuntie ? '' : 'btn-ghost'}" id="auntie" ${canAuntie ? '' : 'disabled'}>${ICON.broom} Cleaner auntie${me.auntie ? '' : ' (used)'}</button>`}
        <button class="btn btn-ghost small" id="undo" ${history.length ? '' : 'disabled'}>${ICON.undo} Undo</button>
      </div>
      <ul class="legend"><li><i>1</i>Table</li><li><i class="fan">2</i>Under the fan</li><li><i class="famous">3</i>Famous stall</li></ul>`, { color: me.color, cls: 'play' });
    on('#auntie', () => { swapMode = true; paintTurn(); });
    on('#cancel', () => { swapMode = false; paintTurn(); });
    on('#undo', () => undo());
  }

  async function humanMove(stool) {
    if (busy || !s || s.phase !== 'play' || isCpu(s.turn)) return;
    const move = { type: swapMode ? 'swap' : 'place', stool };
    history.push(E.clone(s));
    if (history.length > 40) history.shift();
    await play(move);
  }

  async function play(move) {
    busy = true;
    board.setInteractive(false);
    const p = s.turn;
    const ev = E.apply(s, move);
    save();
    await board.animateMove(ev, s);
    lastText = describe(ev);
    const bump = [...new Set(ev.claims.map((c) => c.owner))];
    paintScores(bump);
    if (ev.claims.some((c) => c.value >= 3 && c.owner === p) && !isCpu(p)) confetti({ count: 70 });
    busy = false;
    nextTurn();
  }

  function describe(ev) {
    const who = pname(ev.player);
    const g = E.geo(s);
    let txt = ev.move.type === 'swap'
      ? `🧹 Auntie cleared a tissue. ${who} choped it instead.`
      : `${who} choped a stool by ${g.stools[ev.move.stool].tables.map((t) => g.tables[t].name).join(' & ')}.`;
    for (const c of ev.claims) {
      txt += ` ${pname(c.owner)} claimed <b>${g.tables[c.table].name}</b> (+${c.value})${c.tie ? ', last chope on a 2–2' : ''}!`;
    }
    return txt;
  }

  async function cpuTurn() {
    board.setInteractive(false);
    const p = s.turn;
    setPanel(`
      <div class="turn-line"><span class="packet-chip" aria-hidden="true"></span>
        <div><p class="kicker">${CPU_NAME} · ${s.cpu.level === 'hard' ? 'Kiasu' : 'Chill'} mode</p><h2>Thinking <span class="thinking"><i></i><i></i><i></i></span></h2></div>
      </div>
      <p class="lastmove">${lastText}</p>`, { color: s.players[p].color, cls: 'play cpu' });
    busy = true;
    await wait(650 + Math.random() * 450);
    if (!s || s.turn !== p || s.phase !== 'play') { busy = false; return; }
    const move = E.cpuMove(s, s.cpu.level);
    busy = false;
    await play(move);
  }

  function undo() {
    if (!history.length) return;
    s = history.pop();
    lastText = 'Undo! Back one move.';
    board.load(s);
    save();
    nextTurn();
  }

  function finish() {
    write(SAVE_KEY, null);
    board.setInteractive(false);
    if (board.setMode) board.setMode('over');
    sfx.win();
    if (s.winner >= 0 && !isCpu(s.winner)) {
      confetti({ count: 220, colors: [s.players[s.winner].color, '#F2B134', '#FBF6EC', '#2A1A12'] });
    }
    paintOver();
  }

  function paintOver() {
    const w = s.winner;
    const [a, b] = s.players;
    const title = w === -1 ? 'Draw lah!' : `${esc(s.players[w].name)} wins!`;
    const line = w === -1 ? 'Same points, same tables. Share the table, can?'
      : isCpu(w) ? `${CPU_NAME} choped everything. Kiasu until like that.`
      : s.cpu ? `You out-choped ${CPU_NAME}. Steady!` : `${esc(s.players[1 - w].name)}, next time bring more tissue.`;
    setPanel(`
      <p class="kicker">Game over · ${a.score}–${b.score}</p>
      <h2 class="win">${title}</h2>
      <p class="sub">${line}</p>
      <ul class="stats">
        ${s.players.map((p) => `<li style="--c:${p.color}"><b>${p.score} pts</b><span>${esc(p.name)} · ${p.tables} table${p.tables === 1 ? '' : 's'}</span></li>`).join('')}
      </ul>
      <div class="row">
        <button class="btn btn-ghost" id="setup-again">Change setup</button>
        <button class="btn btn-primary grow" id="again" autofocus>Rematch</button>
      </div>`, { color: w >= 0 ? s.players[w].color : 'var(--ink)', cls: 'over' });
    on('#again', () => {
      const names = s.players.map((p) => p.name);
      s = E.newGame({ size: s.size, names, cpu: s.cpu });
      // loser goes first in a rematch
      if (w >= 0) s.turn = 1 - w;
      history = [];
      lastText = '';
      begin();
    });
    on('#setup-again', () => goSetup());
  }

  goSetup();
  return { get state() { return s; } };
}
