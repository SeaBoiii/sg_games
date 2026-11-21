// Agak Agak — screen flow shared by the 2D and 3D builds.
// The build supplies a "dial" (SVG or Three.js); everything else lives here.
import * as E from './engine.js';
import { CARDS } from './cards.js';
import { sfx, buzz } from './sfx.js';
import { confetti, wait } from './fx.js';
import { soloRank } from './solo.js';

const SAVE_KEY = 'agak.state.v1';
const P = E.PHASES;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.v === 1 ? s : null;
  } catch { return null; }
}
function save(s) {
  try {
    if (!s || s.phase === P.OVER || s.phase === P.SOLO_OVER) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {}
}

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5m6-7-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  rotate: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3.5h6.5a4 4 0 0 1 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 5.5l2 2 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  team: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><circle cx="16.5" cy="8.5" r="2.7" fill="currentColor" opacity=".7"/><path d="M2.5 19c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5z" fill="currentColor"/><path d="M13 19c.2-2.9 1.8-4.8 4-4.8 2.4 0 4.2 2 4.4 4.8z" fill="currentColor" opacity=".7"/></svg>',
  solo: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6" fill="currentColor"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5z" fill="currentColor"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-7 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const RULES_HTML = `
  <h2>How to play Agak Agak</h2>
  <p class="rules-lede">Two teams take turns. Each turn, one player is the <b>Psychic</b>: they secretly see where the target sits on a spectrum, then give one clue so their team can find it.</p>
  <ol class="rules-steps">
    <li><b>Psychic picks a card.</b> Everyone else looks away. The Psychic chooses one of two spectrums, like <i>Shiok ↔ Sian</i>.</li>
    <li><b>Spin and peek.</b> The wheel spins and lands on a hidden target. Only the Psychic sees it.</li>
    <li><b>Give one clue.</b> Say (or type) something that sits at that spot. Target near <i>Shiok</i>? Maybe "ice kachang on a hot day". No numbers, no "left" or "right".</li>
    <li><b>Team agak.</b> The Psychic's team discusses and drags the needle to where they think the target is, then locks it in.</li>
    <li><b>Other team calls it.</b> They guess whether the target is to the <b>left</b> or <b>right</b> of the needle.</li>
    <li><b>Reveal!</b> Score by where the needle lands.</li>
  </ol>
  <div class="rules-score">
    <span class="chip s4">4</span> bullseye
    <span class="chip s3">3</span> close
    <span class="chip s2">2</span> got the area
    <span class="chip s1">+1</span> other team called left/right correctly (not on a bullseye)
  </div>
  <p>The team going second starts with 1 point. First to the target score wins. A tie at the top keeps going until someone pulls ahead.</p>
  <p><b>Blank cards:</b> choose <i>Blank</i> at setup and nothing is printed on the dial. The Psychic spins, then says a question and both ends out loud, like <i>"How shiok is this hawker dish? Left is can skip, right is must queue"</i>, then gives the clue. Prefer it on screen? Tap <i>Write your own</i> on the SG Edition pick screen.</p>
  <p><b>Solo:</b> the kopitiam is your Psychic. You get 10 cards, each with a ready-made clue. Drag the needle to where you think it sits and see how close your agak is to the house's (out of 40).</p>
  <p><b>Tip:</b> on a phone, turn it sideways. Landscape gives the dial the most room.</p>
  <p><b>Catch-up rule:</b> if a team hits a bullseye and is still behind, they go again right away.</p>`;

export function startFlow({ root, createDial, hubHref, altHref, altLabel }) {
  let s = null;
  let busy = false;
  let writing = false; // Psychic chose "write your own" on the pick screen

  root.innerHTML = `
    <header class="bar">
      <a class="icon-btn" href="${hubHref}" aria-label="Back to SG Games">${ICON.back}</a>
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>Agak<b>Agak</b></span></div>
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
    <dialog class="sheet small" id="confirm"><div class="sheet-body"><h2>Start a new game?</h2><p>The current scores will be lost.</p></div>
      <form method="dialog" class="row"><button class="btn btn-ghost" value="no">Cancel</button><button class="btn btn-primary" value="yes">New game</button></form></dialog>
    <div class="toast" id="toast" role="status"></div>`;

  const $ = (sel) => root.querySelector(sel);
  const panel = $('#panel');
  const scoresEl = $('#scores');
  const dial = createDial($('#stage'));
  dial.onNeedle = (deg) => { if (s && (s.phase === P.GUESS || s.phase === P.SOLO_GUESS)) { s.needle = deg; save(s); } };

  // ---- header actions
  const soundBtn = $('#btn-sound');
  const paintSound = () => { soundBtn.innerHTML = sfx.muted ? ICON.mute : ICON.sound; soundBtn.setAttribute('aria-pressed', String(!sfx.muted)); };
  paintSound();
  soundBtn.onclick = () => { sfx.setMuted(!sfx.muted); paintSound(); sfx.tap(); };
  $('#btn-rules').onclick = () => { sfx.tap(); $('#rules').showModal(); };
  const menu = $('#menu');
  $('#btn-menu').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; sfx.tap(); };
  document.addEventListener('click', () => { menu.hidden = true; });
  menu.querySelector('[data-act="rules"]').onclick = () => { sfx.tap(); $('#rules').showModal(); };
  menu.querySelector('[data-act="new"]').onclick = () => {
    if (!s) return;
    const dlg = $('#confirm');
    dlg.returnValue = '';
    dlg.showModal();
    dlg.onclose = () => { if (dlg.returnValue === 'yes') { save(null); s = null; goSetup(); } };
  };
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---- scoreboard
  function paintScores(bump = []) {
    if (!s) { scoresEl.innerHTML = ''; return; }
    if (s.mode === 'solo') {
      scoresEl.innerHTML = `
        <div class="score active ${bump.length ? 'bump' : ''}" style="--team:var(--red)">
          <span class="score-name">Solo · card ${Math.min(s.round, s.rounds)}/${s.rounds}</span>
          <span class="score-num">${s.score}</span>
        </div>`;
      return;
    }
    scoresEl.innerHTML = s.teams
      .map((t, i) => `
        <div class="score ${s.turn === i && s.phase !== P.OVER ? 'active' : ''} ${bump.includes(i) ? 'bump' : ''}" style="--team:${t.color}">
          <span class="score-name">${esc(t.name)}</span>
          <span class="score-num">${t.score}</span>
        </div>`)
      .join(`<span class="score-to" title="First to ${s.targetScore}">to ${s.targetScore}</span>`);
  }

  function setPanel(html, { team = null, cls = '' } = {}) {
    panel.className = `panel ${cls}`;
    panel.style.setProperty('--team', typeof team === 'string' ? team : team != null ? s.teams[team].color : 'var(--ink)');
    panel.innerHTML = `<div class="panel-inner">${html}</div>`;
    const first = panel.querySelector('[autofocus]');
    if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }
  const on = (sel, fn) => { const b = panel.querySelector(sel); if (b) b.onclick = (e) => { if (busy) return; sfx.tap(); buzz(); fn(e); }; };
  const teamName = (i) => `<b class="tname" style="--team:${s.teams[i].color}">${esc(s.teams[i].name)}</b>`;

  function commit(phase) {
    if (phase) s.phase = phase;
    save(s);
    paintScores();
    render();
  }

  // ---- phases
  function goSetup() {
    s = null;
    const saved = load();
    paintScores();
    dial.setMode('idle');
    dial.setLabels(['Shiok', 'Sian']);
    dial.setTopic('');
    dial.setShutter(false, { animate: true });
    dial.setNeedleEnabled(false);
    dial.setNeedleColor('#D7263D');
    const last = (() => { try { return JSON.parse(localStorage.getItem('agak.teams') || 'null'); } catch { return null; } })();
    const names = last?.names || E.DEFAULT_NAMES;
    const target = last?.targetScore || 10;
    let mode = last?.mode === 'solo' ? 'solo' : 'teams';
    panel.className = 'panel setup';
    panel.style.setProperty('--team', 'var(--ink)');
    panel.innerHTML = `
      <div class="panel-inner">
        <p class="kicker">Singapore Edition</p>
        <h1 class="title">Agak <span>Agak</span></h1>
        <p class="sub">How close can you agak? One clue, one needle, two teams.</p>
        <p class="rotate-hint">${ICON.rotate}<span><b>Best in landscape.</b> Turn your phone sideways for a bigger dial.</span></p>
        ${saved ? `<button class="btn btn-primary wide" id="continue">${saved.mode === 'solo'
          ? `Continue solo · card ${saved.round}/${saved.rounds} · ${saved.score} pts`
          : `Continue game · ${esc(saved.teams[0].name)} ${saved.teams[0].score}–${saved.teams[1].score} ${esc(saved.teams[1].name)}`}</button><div class="or"><span>or start fresh</span></div>` : ''}
        <div class="mode-tabs" role="radiogroup" aria-label="Game mode">
          <button type="button" role="radio" data-mode="teams" aria-checked="${mode === 'teams'}">${ICON.team}<span>Teams<small>pass &amp; play, 4+ players</small></span></button>
          <button type="button" role="radio" data-mode="solo" aria-checked="${mode === 'solo'}">${ICON.solo}<span>Solo<small>you vs the kopitiam</small></span></button>
        </div>
        <form class="setup-form" id="setup" autocomplete="off" data-mode="${mode}">
          <div class="solo-only solo-blurb">
            <p>The kopitiam plays Psychic. You get <b>10 cards</b>, each with a clue like <i>"Laksa"</i> on <i>Not spicy ↔ Chilli padi</i>. Drag the needle to where you think it sits.</p>
            <p class="best-line">${bestSolo() ? `Your best: <b>${bestSolo()} / 40</b>` : 'No best score yet. Chope one!'}</p>
          </div>
          <div class="teams teams-only">
            ${[0, 1].map((i) => `
              <label class="team-field" style="--team:${E.TEAM_COLORS[i]}">
                <span>Team ${i + 1}${i === 1 ? ' <em>(starts +1)</em>' : ''}</span>
                <input name="t${i}" maxlength="18" value="${esc(names[i])}" required />
              </label>`).join('')}
          </div>
          <fieldset class="seg deck teams-only">
            <legend>Cards</legend>
            <label><input type="radio" name="deck" value="sg" ${last?.deck === 'blank' ? '' : 'checked'}/><span>SG Edition</span></label>
            <label><input type="radio" name="deck" value="blank" ${last?.deck === 'blank' ? 'checked' : ''}/><span>Blank · say it aloud</span></label>
          </fieldset>
          <fieldset class="seg teams-only">
            <legend>First to</legend>
            ${[7, 10, 15].map((n) => `<label><input type="radio" name="to" value="${n}" ${n === target ? 'checked' : ''}/><span>${n}</span></label>`).join('')}
          </fieldset>
          <label class="switch teams-only"><input type="checkbox" name="catch" ${last?.catchUp === false ? '' : 'checked'} /><span class="track"></span><span>Catch-up rule <small>bullseye while behind = go again</small></span></label>
          <div class="row">
            <button type="button" class="btn btn-ghost" id="how">How to play</button>
            <button class="btn btn-primary grow" id="startbtn" ${saved ? '' : 'autofocus'}>${mode === 'solo' ? 'Start solo' : 'Start game'}</button>
          </div>
        </form>
      </div>`;
    panel.querySelector('#how').onclick = () => { sfx.tap(); $('#rules').showModal(); };
    const formEl = panel.querySelector('#setup');
    panel.querySelectorAll('.mode-tabs button').forEach((b) => {
      b.onclick = () => {
        sfx.tap();
        mode = b.dataset.mode;
        formEl.dataset.mode = mode;
        panel.querySelectorAll('.mode-tabs button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        panel.querySelector('#startbtn').textContent = mode === 'solo' ? 'Start solo' : 'Start game';
      };
    });
    const cont = panel.querySelector('#continue');
    if (cont) cont.onclick = () => { sfx.tap(); resume(saved); };
    panel.querySelector('#setup').onsubmit = (e) => {
      e.preventDefault();
      sfx.lock();
      const f = new FormData(e.target);
      if (mode === 'solo') {
        try { localStorage.setItem('agak.teams', JSON.stringify({ ...(last || {}), mode: 'solo' })); } catch {}
        s = E.newSolo();
        commit();
        return;
      }
      const cfg = { names: [f.get('t0'), f.get('t1')], targetScore: +f.get('to'), catchUp: f.get('catch') === 'on', deck: f.get('deck') };
      try { localStorage.setItem('agak.teams', JSON.stringify({ ...cfg, mode: 'teams' })); } catch {}
      s = E.newGame(cfg);
      commit();
    };
  }

  function resume(st) {
    s = st;
    if (s.mode !== 'solo' && [P.PICK, P.SPIN, P.CLUE].includes(s.phase)) {
      // Never resume straight into secret info — go back to the hand-off.
      s.choices = null; s.card = null; s.custom = null; s.blank = false; s.target = null; s.clue = '';
      s.phase = P.HANDOFF;
    }
    if (s.mode !== 'solo' && s.target != null) dial.setTarget(s.target);
    commit();
  }

  function render() {
    if (s.mode === 'solo') { renderSolo(); return; }
    const t = s.turn;
    const o = E.other(t);
    const lab = E.labels(s);
    const q = E.questionOf(s);
    dial.setNeedleColor(s.teams[t].color);
    dial.setLabels(lab);
    dial.setTopic(q);

    switch (s.phase) {
      case P.HANDOFF: {
        dial.setMode('handoff');
        dial.setShutter(false, { animate: true });
        dial.setNeedleEnabled(false);
        dial.setNeedle(90, true);
        dial.setLabels(null);
        dial.setTopic('');
        writing = false;
        setPanel(`
          <p class="kicker">${s.bonusTurn ? 'Catch-up bonus!' : `Round ${s.round}`}</p>
          <h2>${teamName(t)}'s turn</h2>
          <p class="sub">Choose one Psychic from ${esc(s.teams[t].name)}. <b>Everyone else, eyes off the screen!</b></p>
          <button class="btn btn-primary wide big" id="go" autofocus>${ICON.eye} I'm the Psychic</button>`, { team: t, cls: 'handoff' });
        on('#go', () => {
          if (s.deckMode === 'blank') { E.chooseBlank(s); commit(); return; }
          E.drawChoices(s); commit(P.PICK);
        });
        break;
      }
      case P.PICK: {
        dial.setMode('psychic');
        if (writing) { paintWriteOwn(); break; }
        const ch = s.choices.map((i) => CARDS[i]);
        setPanel(`
          <p class="kicker psychic">${ICON.eye} Psychic only</p>
          <h2>Pick a spectrum</h2>
          <div class="choices">
            ${ch.map((c, i) => `<button class="spectrum" data-i="${i}"><span>${esc(c[0])}</span><i>↔</i><span>${esc(c[1])}</span></button>`).join('')}
          </div>
          <div class="row center">
            <button class="btn btn-ghost small" id="redraw">Draw two others</button>
            <button class="btn btn-ghost small" id="own">Write your own</button>
          </div>`, { team: t, cls: 'pick' });
        panel.querySelectorAll('.spectrum').forEach((b) => {
          b.onclick = () => { sfx.tap(); E.chooseCard(s, +b.dataset.i); commit(); };
        });
        on('#redraw', () => { E.drawChoices(s); commit(); });
        on('#own', () => { writing = true; render(); });
        break;
      }
      case P.SPIN: {
        dial.setMode('psychic');
        setPanel(`
          <p class="kicker psychic">${ICON.eye} Psychic only</p>
          <h2>Spin for a secret target</h2>
          <p class="sub">${s.blank ? '<b>Blank card.</b> You make up the question and both ends yourself. ' : ''}The shutter opens only for you. Make sure nobody else is peeking.</p>
          <button class="btn btn-primary wide big" id="spin" autofocus>Spin the wheel</button>`, { team: t, cls: 'spin' });
        on('#spin', async () => {
          busy = true;
          panel.querySelector('#spin').disabled = true;
          s.target = E.randomTarget();
          save(s);
          await dial.setShutter(true, { animate: true });
          await dial.spin(s.target);
          busy = false;
          commit(P.CLUE);
        });
        break;
      }
      case P.CLUE: {
        dial.setMode('psychic');
        dial.setShutter(true, { animate: true });
        setPanel(`
          <p class="kicker psychic">${ICON.eye} Psychic only</p>
          <h2>Now give one clue</h2>
          ${q ? `<p class="topic">${esc(q)}</p>` : ''}
          ${lab ? `<p class="sub">Something that sits right at the target between <b>${esc(lab[0])}</b> and <b>${esc(lab[1])}</b>.</p>`
            : `<ol class="say-steps"><li>Think of a question with two ends that fits this target.</li><li>Close the shutter, then <b>say the question, the left end and the right end</b> out loud.</li><li>Give your one clue.</li></ol>`}
          <form id="clueform" class="clue-form" autocomplete="off">
            ${lab ? `<input id="clue" name="clue" maxlength="60" placeholder="Type it, or just say it out loud" value="${esc(s.clue)}" />` : ''}
            <p class="hint">One idea · no numbers · no "left/right"</p>
            <button class="btn btn-primary wide big">Close shutter &amp; show team</button>
          </form>`, { team: t, cls: 'clue' });
        panel.querySelector('#clueform').onsubmit = async (e) => {
          e.preventDefault();
          if (busy) return;
          busy = true;
          sfx.lock();
          s.clue = (panel.querySelector('#clue')?.value || '').trim();
          save(s);
          await dial.setShutter(false, { animate: true });
          busy = false;
          commit(P.GUESS);
        };
        break;
      }
      case P.GUESS: {
        dial.setMode('guess');
        dial.setShutter(false, { animate: false });
        dial.setNeedle(s.needle, false);
        dial.setNeedleEnabled(true);
        setPanel(`
          <p class="kicker">${teamName(t)} · discuss &amp; agak</p>
          ${q ? `<p class="topic">${esc(q)}</p>` : ''}
          ${!lab ? `<p class="hint">Blank card: the Psychic says the question and both ends out loud.</p>` : ''}
          ${s.clue ? `<blockquote class="clue-show">“${esc(s.clue)}”</blockquote>` : `<p class="clue-show say">Psychic, say your clue!</p>`}
          <p class="sub">Drag the needle to where you think the target is.</p>
          <button class="btn btn-primary wide big" id="lock">Lock it in</button>`, { team: t, cls: 'guess' });
        on('#lock', () => { sfx.lock(); dial.setNeedleEnabled(false); commit(P.CALL); });
        break;
      }
      case P.CALL: {
        dial.setMode('call');
        dial.setNeedleEnabled(false);
        dial.setNeedle(s.needle, false);
        setPanel(`
          <p class="kicker">${teamName(o)}'s call</p>
          <h2>Is the target to the left or right of the needle?</h2>
          <div class="lr">
            <button class="btn lr-btn" data-side="left">${ICON.left}<span>Left<small>${lab ? `more ${esc(lab[0])}` : 'towards the left end'}</small></span></button>
            <button class="btn lr-btn" data-side="right"><span>Right<small>${lab ? `more ${esc(lab[1])}` : 'towards the right end'}</small></span>${ICON.right}</button>
          </div>
          <p class="hint">Get it right for +1, unless ${esc(s.teams[t].name)} hits a bullseye.</p>`, { team: o, cls: 'call' });
        panel.querySelectorAll('.lr-btn').forEach((b) => {
          b.onclick = () => { if (busy) return; sfx.tap(); buzz(); s.call = b.dataset.side; reveal(); };
        });
        break;
      }
      case P.REVEAL: {
        dial.setMode('reveal');
        dial.setShutter(true, { animate: false });
        dial.setTarget(s.target);
        dial.setNeedle(s.needle, false);
        paintReveal();
        break;
      }
      case P.OVER: {
        dial.setMode('over');
        paintOver();
        break;
      }
    }
  }

  async function reveal() {
    busy = true;
    dial.showCall(s.call);
    setPanel(`<p class="kicker">Moment of truth…</p><h2 class="drum">Opening the shutter</h2>`, { team: s.turn, cls: 'reveal pending' });
    sfx.drum();
    await wait(800);
    dial.setMode('reveal');
    await dial.setShutter(true, { animate: true, slow: true });
    const r = E.resolve(s);
    save(s);
    dial.highlight(r.points);
    sfx.score(r.points);
    buzz(r.points === 4 ? [30, 40, 30] : 18);
    if (r.points === 4) confetti({ count: 120 });
    const bump = [];
    if (r.points) bump.push(r.guessing);
    if (r.callCorrect) bump.push(r.opp);
    paintScores(bump);
    busy = false;
    paintReveal(true);
  }

  // ---------------- Solo ----------------
  function bestSolo() { try { return +localStorage.getItem('agak.solo.best') || 0; } catch { return 0; } }
  const RED = '#D7263D';

  function renderSolo() {
    dial.setNeedleColor(RED);
    dial.setTopic('');
    if (s.phase === P.SOLO_OVER) { dial.setMode('over'); paintSoloOver(); return; }
    const cur = E.soloCurrent(s);
    dial.setLabels(cur.labels);
    if (s.phase === P.SOLO_GUESS) {
      dial.setMode('guess');
      dial.showCall(null);
      dial.highlight(null);
      dial.setShutter(false, { animate: true });
      dial.setNeedle(s.needle, false);
      dial.setNeedleEnabled(true);
      setPanel(`
        <p class="kicker">Solo · card ${s.round} of ${s.rounds}</p>
        <p class="sub">The kopitiam's clue:</p>
        <blockquote class="clue-show">“${esc(cur.clue)}”</blockquote>
        <p class="sub">Where does it sit between <b>${esc(cur.labels[0])}</b> and <b>${esc(cur.labels[1])}</b>? Drag the needle.</p>
        <button class="btn btn-primary wide big" id="lock">Lock it in</button>`, { team: RED, cls: 'guess solo' });
      on('#lock', () => soloReveal());
    } else if (s.phase === P.SOLO_REVEAL) {
      dial.setMode('reveal');
      dial.setTarget(cur.target);
      dial.setShutter(true, { animate: false });
      dial.setNeedle(s.needle, false);
      dial.setNeedleEnabled(false);
      paintSoloReveal();
    }
  }

  async function soloReveal() {
    busy = true;
    sfx.lock();
    dial.setNeedleEnabled(false);
    const cur = E.soloCurrent(s);
    dial.setTarget(cur.target); // the shutter is closed, so nobody sees it move
    setPanel(`<p class="kicker">Moment of truth…</p><h2 class="drum">Opening the shutter</h2>`, { team: RED, cls: 'reveal pending' });
    sfx.drum();
    await wait(700);
    dial.setMode('reveal');
    await dial.setShutter(true, { animate: true, slow: true });
    const r = E.soloResolve(s);
    save(s);
    dial.highlight(r.points);
    sfx.score(r.points);
    buzz(r.points === 4 ? [30, 40, 30] : 18);
    if (r.points === 4) confetti({ count: 120 });
    paintScores(r.points ? [0] : []);
    busy = false;
    paintSoloReveal(true);
  }

  function describePos(pos, lab) {
    if (pos <= 15) return `right at <b>${esc(lab[0])}</b>`;
    if (pos < 42) return `towards <b>${esc(lab[0])}</b>`;
    if (pos <= 58) return 'smack in the middle';
    if (pos < 85) return `towards <b>${esc(lab[1])}</b>`;
    return `right at <b>${esc(lab[1])}</b>`;
  }

  function paintSoloReveal(fresh = false) {
    const r = s.result;
    const cur = E.soloCurrent(s);
    const words = { 4: 'Bullseye! Power lah!', 3: 'So close! Steady.', 2: 'Got the area.', 0: 'Miss! Aiyo…' };
    const last = s.round >= s.rounds;
    setPanel(`
      <div class="result ${fresh ? 'fresh' : ''}">
        <div class="pts p${r.points}" style="--team:${RED}"><span>+${r.points}</span></div>
        <div>
          <p class="kicker">Card ${s.round} of ${s.rounds} · ${s.score} pts</p>
          <h2>${words[r.points]}</h2>
          <p class="sub">The kopitiam puts “${esc(cur.clue)}” ${describePos(r.pos, cur.labels)}. You were <b>${r.off}%</b> off.</p>
        </div>
      </div>
      <button class="btn btn-primary wide big" id="next" autofocus>${last ? 'See your score' : 'Next card'}</button>`, { team: RED, cls: 'reveal' });
    on('#next', () => {
      dial.highlight(null);
      E.soloNext(s);
      if (s.phase === P.SOLO_OVER) {
        const best = bestSolo();
        s.newBest = s.score > best;
        if (s.newBest) { try { localStorage.setItem('agak.solo.best', String(s.score)); } catch {} }
        sfx.win();
        if (s.score / (s.rounds * 4) >= 0.65) confetti({ count: 200 });
      }
      commit();
    });
  }

  function paintSoloOver() {
    const max = s.rounds * 4;
    const rank = soloRank(s.score, max);
    const bulls = s.results.filter((x) => x.points === 4).length;
    const avgOff = Math.round(s.results.reduce((a, x) => a + x.off, 0) / Math.max(1, s.results.length));
    setPanel(`
      <p class="kicker">Solo · final score</p>
      <h2 class="win">${s.score}<span class="of"> / ${max}</span> · ${rank.title}</h2>
      <p class="sub">${rank.line}${s.newBest ? ' <b class="newbest">New personal best!</b>' : ''}</p>
      <ul class="stats">
        <li><b>${bulls}</b><span>bullseyes</span></li>
        <li><b>${avgOff}%</b><span>average miss</span></li>
        <li><b>${Math.max(bestSolo(), s.score)}</b><span>best score</span></li>
      </ul>
      <ol class="recap">${s.results.map((x) => `<li class="p${x.points}"><span>${esc(x.clue)}</span><b>+${x.points}</b></li>`).join('')}</ol>
      <div class="row">
        <button class="btn btn-ghost" id="menu-back">Menu</button>
        <button class="btn btn-primary grow" id="again" autofocus>Play again</button>
      </div>`, { team: RED, cls: 'over solo' });
    on('#again', () => { s = E.newSolo(); commit(); });
    on('#menu-back', () => goSetup());
  }

  function paintWriteOwn() {
    const t = s.turn;
    const L = E.CUSTOM_LIMITS;
    const blank = s.deckMode === 'blank';
    setPanel(`
      <p class="kicker psychic">${ICON.eye} Psychic only</p>
      <h2>Write your own card</h2>
      <form id="ownform" class="own-form" autocomplete="off">
        <label class="field"><span>Question <em>(optional)</em></span>
          <input name="q" maxlength="${L.q}" placeholder="e.g. How shiok is this hawker dish?" /></label>
        <div class="ends">
          <label class="field end-l"><span>← Left end</span>
            <input name="left" maxlength="${L.side}" placeholder="Can skip" required /></label>
          <label class="field end-r"><span>Right end →</span>
            <input name="right" maxlength="${L.side}" placeholder="Must queue" required /></label>
        </div>
        <button class="btn btn-primary wide big">Use this card</button>
        ${blank ? '' : '<button type="button" class="btn btn-ghost small" id="back">Back to the deck</button>'}
      </form>`, { team: t, cls: 'pick own' });
    const form = panel.querySelector('#ownform');
    const preview = () => {
      const f = new FormData(form);
      const l = String(f.get('left') || '').trim(), r = String(f.get('right') || '').trim();
      dial.setLabels([l || '…', r || '…']);
      dial.setTopic(String(f.get('q') || '').trim());
    };
    form.addEventListener('input', preview);
    preview();
    if (matchMedia('(pointer:fine)').matches) form.querySelector('input[name=q]').focus({ preventScroll: true });
    form.onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(form);
      if (!String(f.get('left')).trim() || !String(f.get('right')).trim()) { toast('Fill in both ends first'); return; }
      sfx.lock();
      writing = false;
      E.chooseCustom(s, { q: f.get('q'), left: f.get('left'), right: f.get('right') });
      commit();
    };
    on('#back', () => { writing = false; render(); });
  }

  function paintReveal(fresh = false) {
    const r = s.result;
    if (!r) { nextTurnFlow(); return; }
    const words = { 4: 'Bullseye! Power lah!', 3: 'So close! Steady.', 2: 'Got the area.', 0: 'Miss! Aiyo…' };
    const sideWord = r.actualSide === 'left' ? 'left' : 'right';
    let callLine;
    if (r.points === 4) callLine = `Bullseye, so ${teamName(r.opp)}'s call doesn't count.`;
    else if (r.callCorrect) callLine = `${teamName(r.opp)} called <b>${s.call}</b>. Correct! <b>+1</b>`;
    else callLine = `${teamName(r.opp)} called <b>${s.call}</b>, but the target was to the ${sideWord}.`;
    const w = E.winner(s);
    const nextLabel = r.bonus ? `${esc(s.teams[r.guessing].name)} goes again` : w != null ? 'See the results' : `Next: ${esc(s.teams[r.opp].name)}`;
    setPanel(`
      <div class="result ${fresh ? 'fresh' : ''}">
        <div class="pts p${r.points}" style="--team:${s.teams[r.guessing].color}"><span>+${r.points}</span></div>
        <div>
          <p class="kicker">${teamName(r.guessing)}</p>
          <h2>${words[r.points]}</h2>
          <p class="sub">${callLine}</p>
          ${r.bonus ? `<p class="bonus">Catch-up rule: bullseye while behind, so go again!</p>` : ''}
        </div>
      </div>
      <button class="btn btn-primary wide big" id="next" autofocus>${nextLabel}</button>`, { team: r.guessing, cls: 'reveal' });
    on('#next', () => { dial.showCall(null); dial.highlight(null); nextTurnFlow(); });
  }

  function nextTurnFlow() {
    const bonus = !!(s.result && s.result.bonus);
    E.nextTurn(s);
    s.bonusTurn = bonus && s.phase === P.HANDOFF;
    if (s.phase === P.OVER) { save(null); paintScores(); render(); sfx.win(); confetti({ count: 220 }); setTimeout(() => confetti({ count: 140, origin: { x: innerWidth * 0.2, y: innerHeight * 0.5 } }), 350); setTimeout(() => confetti({ count: 140, origin: { x: innerWidth * 0.8, y: innerHeight * 0.5 } }), 650); return; }
    commit();
  }

  function paintOver() {
    const w = s.winner;
    const l = E.other(w);
    const hist = s.history;
    const bulls = [0, 1].map((i) => hist.filter((h) => h.team === i && h.points === 4).length);
    const best = hist.filter((h) => h.points === 4 && h.clue && h.labels).slice(-1)[0];
    setPanel(`
      <p class="kicker">Game over · ${s.teams[w].score}–${s.teams[l].score}</p>
      <h2 class="win">${teamName(w)} wins!</h2>
      <p class="sub">Steady pom pi pi. ${esc(s.teams[l].name)}, next round confirm can one.</p>
      <ul class="stats">
        <li><b>${hist.length}</b><span>turns</span></li>
        <li><b>${bulls[0]}</b><span>${esc(s.teams[0].name)} bullseyes</span></li>
        <li><b>${bulls[1]}</b><span>${esc(s.teams[1].name)} bullseyes</span></li>
      </ul>
      ${best ? `<p class="best">Best clue: <b>“${esc(best.clue)}”</b> for ${esc(best.labels[0])} ↔ ${esc(best.labels[1])}</p>` : ''}
      <div class="row">
        <button class="btn btn-ghost" id="setup">Change teams</button>
        <button class="btn btn-primary grow" id="again" autofocus>Rematch</button>
      </div>`, { team: w, cls: 'over' });
    on('#again', () => { const cfg = { names: s.teams.map((t) => t.name), targetScore: s.targetScore, catchUp: s.catchUp, deck: s.deckMode }; s = E.newGame(cfg); commit(); toast('Rematch! Team 2 starts with 1 point.'); });
    on('#setup', () => goSetup());
  }

  goSetup();
  return { get state() { return s; } };
}
