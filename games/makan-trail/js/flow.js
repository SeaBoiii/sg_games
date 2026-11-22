// Makan Trail — screen flow shared by the 2D and 3D builds.
import * as E from './engine.js';
import { dishSVG, tingkatSVG, esc } from './art.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';
import { confetti } from '../../../assets/lib/fx.js';

const PREF_KEY = 'makan.setup';
const BRAND = '#D7263D';
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PC = E.PLAYER_COLORS;
const CPU_NAMES = ['Ah Huat', 'Mei Mei', 'Uncle Lim', 'Siti'];
const wins = (name) => (/^you$/i.test(name.trim()) ? 'You win!' : `${name} wins!`);
const poss = (name) => (/^you$/i.test(name.trim()) ? 'Your' : `${name}'s`);

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3.5h6.5a4 4 0 0 1 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 5.5l2 2 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  dice: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="8.5" cy="8.5" r="1.7" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/></svg>',
};

const RULES_HTML = `
  <h2>How to play</h2>
  <p>Eat your way round the island! Everyone starts at their own HDB home with a makan list of 4 dishes and $${E.START_MONEY}.</p>
  <ol class="rules-steps">
    <li><b>Roll and walk</b> clockwise round the board.</li>
    <li><b>Makan stop:</b> if you pass a hawker centre that sells something on your list, you may <i>stop there early</i> instead of using the full roll. Land on one and you buy automatically.</li>
    <li><b>Mind your wallet.</b> Dishes cost $2–$4. Passing or landing on your own home is payday: +$${E.PAYDAY}.</li>
    <li><b>Squares:</b> ang bao +$3, ERP −$1, heavy rain makes you miss a turn, MRT whisks you to the next station, and "Kopitiam talk" cards can go either way.</li>
    <li><b>Win:</b> collect all 4 dishes, then get back home. First one back wins.</li>
  </ol>
  <p class="hint">Later seats start with a dollar or two extra to make up for going later. Keyboard: Space or Enter to roll and end your turn.</p>`;

export function startFlow({ root, createBoard, hubHref, altHref, altLabel }) {
  let s = null;
  let busy = false;
  let lines = [];
  let token = 0; // cancels pending CPU timers when a new game starts

  root.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="${hubHref}" aria-label="Back to SG Games">${ICON.back}</a>
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>Makan<b>Trail</b></span></div>
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
  board.onSquare = (i) => { if (s && s.phase === 'choose' && !E.current(s).cpu && !busy) doMove(i); };

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
    if (e.key !== ' ' && e.key !== 'Enter') return;
    if (e.target.closest && e.target.closest('button')) return;
    const b = panel.querySelector('#roll, #keep, #end');
    if (b) { e.preventDefault(); b.click(); }
  });

  // ---------------- helpers ----------------
  function paintStatus() {
    if (!s) { statusEl.innerHTML = ''; return; }
    if (s.phase === 'over') { statusEl.innerHTML = `<span class="station"><b>${esc(wins(s.players[s.winner].name))}</b><small>${s.turns} turns</small></span>`; return; }
    const p = E.current(s);
    statusEl.innerHTML = `
      <span class="tok-chip" style="--c:${p.color}"><svg viewBox="-16 -42 32 46" aria-hidden="true">${tingkatSVG(p.color, 0.9)}</svg></span>
      <span class="station"><b>${esc(p.name)}</b><small>${p.got.length}/${E.LIST_SIZE} dishes · ${E.SQUARES[p.pos].name}</small></span>
      <span class="score-pill" style="background:#2F6B4F" title="Money">$${p.money}</span>`;
  }
  function setPanel(html, cls = '', color = BRAND) {
    panel.className = `panel ${cls}`;
    panel.style.setProperty('--team', color);
    panel.innerHTML = `<div class="panel-inner">${html}</div>`;
    const first = panel.querySelector('[autofocus]');
    if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }
  const on = (q, fn) => { const b = panel.querySelector(q); if (b) b.onclick = (e) => { if (busy) return; sfx.tap(); fn(e); }; };
  const listHTML = (p) => `<ul class="mlist">${p.list.map((d) => `<li class="${p.got.includes(d) ? 'got' : ''}" title="${E.DISHES[d].name}"><svg viewBox="-26 -26 52 52" aria-hidden="true">${dishSVG(d)}</svg><span>${E.DISHES[d].name}<small>$${E.DISHES[d].price}</small></span></li>`).join('')}</ul>`;
  const whereHTML = (p) => {
    const need = E.needs(p);
    if (!need.length) return `<p class="hint good">List complete! Head home to <b>${esc(E.SQUARES[p.home].name)}</b>.</p>`;
    const spots = E.SQUARES.map((q, i) => (q.menu && q.menu.some((d) => need.includes(d)) ? q.name : null)).filter(Boolean);
    return `<p class="hint">Still need ${need.map((d) => E.DISHES[d].name).join(', ')}. Try ${spots.slice(0, 3).join(', ')}${spots.length > 3 ? '…' : ''}.</p>`;
  };

  function say(ev) {
    const p = s.players[ev.p];
    const n = p ? esc(p.name) : '';
    switch (ev.type) {
      case 'move': { const you = /^you$/i.test(p.name.trim()); return `${n} ${ev.stopped ? (you ? 'stop early at' : 'stops early at') : (you ? 'walk to' : 'walks to')} <b>${esc(E.SQUARES[ev.to].name)}</b>.`; }
      case 'payday': return `Payday at home: <b class="good">+$${ev.amount}</b>.`;
      case 'buy': return `Makan! ${ev.free ? 'Free' : `Bought`} <b>${E.DISHES[ev.dish].name}</b>${ev.free ? ' (uncle belanja)' : ` for $${ev.price}`}.${ev.done ? ' <b class="good">List complete, go home!</b>' : ''}`;
      case 'broke': return `Wanted ${ev.wanted.map((d) => E.DISHES[d].name).join(', ')} but not enough money. <b class="bad">Aiyoh.</b>`;
      case 'nothing': return 'Nothing on the list here.';
      case 'angbao': return `Ang bao! <b class="good">+$${ev.amount}</b>.`;
      case 'erp': return ev.amount ? `ERP gantry: <b class="bad">−$${ev.amount}</b>.` : 'ERP gantry, but no cash to pay. Lucky.';
      case 'rain': return 'Heavy rain! Sheltering at the void deck. <b class="bad">Miss next turn.</b>';
      case 'mrt': return `Took the MRT to <b>${esc(E.SQUARES[ev.to].name)}</b>.`;
      case 'card': return `Kopitiam talk: <i>${esc(ev.text)}</i>`;
      case 'hop': return ev.by > 0 ? `Zoom to <b>${esc(E.SQUARES[ev.to].name)}</b>.` : `Back to <b>${esc(E.SQUARES[ev.to].name)}</b>.`;
      case 'visit': return `Visiting friends at ${esc(E.SQUARES[ev.at].name)}.`;
      case 'win': return `<b class="good">${n} ${/^you$/i.test(p.name.trim()) ? 'are' : 'is'} home with a full tummy!</b>`;
      default: return '';
    }
  }
  function sound(ev) {
    switch (ev.type) {
      case 'step': sfx.tick(); break;
      case 'payday': sfx.lock(); break;
      case 'buy': sfx.claim(true); buzz(15); break;
      case 'angbao': sfx.score(2); break;
      case 'erp': sfx.tap(); break;
      case 'rain': sfx.sweep(); break;
      case 'mrt': sfx.whoosh(true); break;
      case 'card': sfx.plop(); break;
      case 'broke': sfx.claim(false); break;
      default: break;
    }
  }

  // ---------------- setup ----------------
  function goSetup() {
    token += 1;
    s = null;
    busy = false;
    paintStatus();
    const pref = read(PREF_KEY) || {};
    let count = [2, 3, 4].includes(pref.count) ? pref.count : 2;
    const seats = pref.seats || [{ name: 'You', cpu: false }, { name: CPU_NAMES[1], cpu: true }, { name: CPU_NAMES[2], cpu: true }, { name: CPU_NAMES[3], cpu: true }];
    const demo = E.newGame({ players: seats.slice(0, count), seed: 3 });
    demo.phase = 'idle';
    board.load(demo);
    if (board.setMode) board.setMode('idle');
    const seatHTML = () => [0, 1, 2, 3].map((i) => `<div class="seat" style="--c:${PC[i]}" ${i < count ? '' : 'hidden'}>
        <svg viewBox="-16 -42 32 46" aria-hidden="true">${tingkatSVG(PC[i], 0.9)}</svg>
        <input id="n${i}" maxlength="12" value="${esc(seats[i].name)}" aria-label="Player ${i + 1} name"/>
        <button type="button" class="who" data-i="${i}" aria-pressed="${!!seats[i].cpu}">${seats[i].cpu ? 'CPU' : 'Human'}</button>
      </div>`).join('');
    setPanel(`
      <p class="kicker">A board game round the island</p>
      <h1 class="title">Makan <span>Trail</span></h1>
      <p class="sub">Collect your 4 dishes from the hawker centres, then race back home. Watch your wallet!</p>
      <p class="rotate-hint">${ICON.phone}<span><b>Best in landscape.</b> Turn your phone sideways to see the whole board.</span></p>
      <fieldset class="seg" aria-label="Players"><legend>Players</legend>${[2, 3, 4].map((n) => `<label><input type="radio" name="np" value="${n}" ${n === count ? 'checked' : ''}/><span>${n}</span></label>`).join('')}</fieldset>
      <div class="seats">${seatHTML()}</div>
      <div class="row">
        <button type="button" class="btn btn-ghost" id="how">How to play</button>
        <button class="btn btn-primary grow" id="start" autofocus>Let's makan!</button>
      </div>`, 'setup');
    const readSeats = () => [0, 1, 2, 3].forEach((i) => { seats[i].name = panel.querySelector(`#n${i}`).value; });
    const wire = () => {
      panel.querySelectorAll('.who').forEach((b) => {
        b.onclick = () => {
          sfx.tap(); readSeats();
          const i = +b.dataset.i;
          seats[i].cpu = !seats[i].cpu;
          if (seats[i].cpu && /^(You|Player \d)$/.test(seats[i].name)) seats[i].name = CPU_NAMES[i];
          if (!seats[i].cpu && CPU_NAMES.includes(seats[i].name)) seats[i].name = i === 0 ? 'You' : `Player ${i + 1}`;
          panel.querySelector('.seats').innerHTML = seatHTML(); wire();
        };
      });
    };
    wire();
    panel.querySelectorAll('input[name="np"]').forEach((r) => {
      r.onchange = () => {
        sfx.tap(); readSeats(); count = +r.value;
        panel.querySelector('.seats').innerHTML = seatHTML(); wire();
        const d = E.newGame({ players: seats.slice(0, count), seed: 3 }); d.phase = 'idle'; board.load(d);
      };
    });
    on('#how', showRules);
    on('#start', () => {
      readSeats();
      write(PREF_KEY, { count, seats });
      start(seats.slice(0, count).map((p) => ({ name: p.name, cpu: p.cpu })));
    });
  }

  function start(players) {
    token += 1;
    s = E.newGame({ players });
    s.opts = players;
    lines = [];
    busy = false;
    if (board.setMode) board.setMode('play');
    board.load(s);
    turnStart();
  }

  // ---------------- turns ----------------
  function turnStart(note = '') {
    const p = E.current(s);
    paintStatus();
    board.sync(s);
    const my = token;
    if (p.cpu) {
      setPanel(`${note}<p class="kicker">${esc(poss(p.name))} turn</p><h2 class="thinking-h"><span class="thinking"><i></i><i></i><i></i></span> ${esc(p.name)} is rolling…</h2>${listHTML(p)}`, 'cpu', p.color);
      wait(700).then(() => { if (my === token && s) doRoll(); });
      return;
    }
    setPanel(`
      ${note}
      <p class="kicker">${s.players.filter((x) => !x.cpu).length > 1 ? 'Pass the phone · ' : ''}${esc(poss(p.name))} turn</p>
      <h2><span class="tname" style="color:${p.color}">${esc(p.name)}</span> · $${p.money}</h2>
      ${listHTML(p)}
      ${whereHTML(p)}
      <button class="btn btn-primary wide big" id="roll" autofocus>${ICON.dice} Roll the dice</button>`, 'turn', p.color);
    on('#roll', () => doRoll());
  }

  async function doRoll() {
    if (!s || busy || s.phase !== 'roll') return;
    busy = true;
    const my = token;
    const r = E.roll(s);
    sfx.drum();
    await board.rollDie(r.roll);
    if (my !== token) return;
    busy = false;
    const p = E.current(s);
    if (s.phase === 'move') return doMove(null);
    if (p.cpu) { await wait(450); if (my === token) doMove(E.cpuChoice(s)); return; }
    // a human chooses where to stop
    board.sync(s);
    const last = s.path[s.path.length - 1];
    setPanel(`
      <p class="kicker">${esc(p.name)} rolled a <b>${r.roll}</b></p>
      <h2>Makan stop?</h2>
      <p class="hint">You can stop early at a glowing square instead of walking the full ${r.roll}.</p>
      <div class="stops">${s.options.map((i) => {
        const q = E.SQUARES[i];
        const what = i === p.home ? 'Go home and win!' : `Buy ${E.buyable(p, i).map((d) => E.DISHES[d].name).join(' + ')}`;
        return `<button class="stop" data-i="${i}"><b>Stop at ${esc(q.name)}</b><small>${what}</small></button>`;
      }).join('')}</div>
      <button class="btn btn-ghost wide" id="keep">Keep going to ${esc(E.SQUARES[last].name)}</button>`, 'choose', p.color);
    panel.querySelectorAll('.stop').forEach((b) => { b.onclick = () => { sfx.tap(); doMove(+b.dataset.i); }; });
    on('#keep', () => doMove(null));
  }

  async function doMove(stopAt) {
    if (!s || busy || (s.phase !== 'choose' && s.phase !== 'move')) return;
    busy = true;
    const my = token;
    const p = E.current(s);
    const who = s.turn;
    const evs = E.move(s, stopAt);
    board.sync(s);
    if (!p.cpu) setPanel(`<p class="kicker">${esc(p.name)}</p><h2>On the way…</h2>`, 'moving', p.color);
    await board.play(evs, s, sound);
    if (my !== token) return;
    busy = false;
    lines = evs.map(say).filter(Boolean);
    paintStatus();
    if (s.phase === 'over') return finish();
    const skipped = E.nextTurn(s);
    const skipNote = skipped.map((k) => `<p class="note">${esc(s.players[k].name)} is stuck and misses this turn.</p>`).join('');
    const summary = `<div class="recap" style="--c:${s.players[who].color}"><b>${esc(s.players[who].name)}</b><ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>${skipNote}`;
    board.sync(s);
    if (p.cpu) {
      // let people read what the CPU did, then carry on
      if (!E.current(s).cpu) return turnStart(summary);
      setPanel(`${summary}<p class="hint">Next: ${esc(E.current(s).name)}…</p>`, 'cpu', p.color);
      await wait(1500);
      if (my === token) turnStart();
      return;
    }
    setPanel(`${summary}<button class="btn btn-primary wide big" id="end" autofocus>${E.current(s).cpu ? `Let ${esc(E.current(s).name)} play` : `Pass to ${esc(E.current(s).name)}`}</button>`, 'result', p.color);
    on('#end', () => turnStart());
  }

  function finish() {
    const w = s.players[s.winner];
    if (board.setMode) board.setMode('over');
    sfx.win();
    confetti({ count: 220, colors: [w.color, '#F2B134', '#D7263D', '#fff'] });
    paintStatus();
    const order = s.players.map((p, i) => i).sort((a, b) => (b === s.winner) - (a === s.winner) || s.players[b].got.length - s.players[a].got.length || s.players[b].money - s.players[a].money);
    setPanel(`
      <p class="kicker">Makan Trail · ${Math.ceil(s.turns / s.players.length)} rounds</p>
      <h2 class="win" style="color:${w.color}">${esc(wins(w.name))}</h2>
      <p class="sub">Home first with chicken-rice-level satisfaction. Shiok!</p>
      <ol class="podium-list">${order.map((i) => { const p = s.players[i]; return `<li style="--c:${p.color}"><svg viewBox="-16 -42 32 46" aria-hidden="true">${tingkatSVG(p.color, 0.9)}</svg><span>${esc(p.name)}</span><small>${p.got.length}/${E.LIST_SIZE} dishes · $${p.money}</small></li>`; }).join('')}</ol>
      <div class="row"><button class="btn btn-ghost" id="setup">Setup</button><button class="btn btn-primary grow" id="again" autofocus>Play again</button></div>`, 'over', w.color);
    on('#setup', () => goSetup());
    on('#again', () => start(s.opts));
  }

  goSetup();
  return { get state() { return s; } };
}
