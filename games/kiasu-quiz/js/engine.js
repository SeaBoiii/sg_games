// Kiasu Quiz — pure rules (no DOM). Shared by the 2D and 3D builds.
import { QUESTIONS, CATEGORIES } from './questions.js';
export { QUESTIONS, CATEGORIES };

export const PLAYER_COLORS = ['#E0457B', '#2D6FD1', '#F2B134', '#2F9E5B'];
export const PLAYER_KEYS = ['q', 'p', 'z', 'm'];
export const LETTERS = ['A', 'B', 'C', 'D'];
export const SOLO_TIME = 15;        // seconds per question in solo
export const BUZZ_OPEN = 15;        // seconds anyone may buzz
export const BUZZ_ANSWER = 7;       // seconds to answer after buzzing
export const BASE = { 1: 100, 2: 200, 3: 300 };
export const LENGTHS = [10, 15, 20];

function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
}
function shuffle(a, rand) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Pick `count` questions: fresh ones first, then ordered gently from easy to hard. */
function pickSet(count, cats, avoid, rand) {
  const pool = QUESTIONS.filter((q) => cats.includes(q.cat));
  const seen = new Set(avoid);
  const fresh = shuffle(pool.filter((q) => !seen.has(q.id)), rand);
  const stale = shuffle(pool.filter((q) => seen.has(q.id)), rand);
  const chosen = [...fresh, ...stale].slice(0, Math.min(count, pool.length));
  // mix categories, then sort by difficulty within thirds so it ramps up
  chosen.sort((a, b) => a.d - b.d);
  return chosen.map((q) => {
    const order = shuffle([0, 1, 2, 3], rand);
    return { ...q, opts: order.map((i) => q.answers[i]), right: order.indexOf(0) };
  });
}

/**
 * mode: 'solo' | 'buzz' · names: players (buzz: 2–4) · count: questions · cats: category ids
 */
export function newGame({ mode = 'solo', names = ['You'], count = 10, cats = Object.keys(CATEGORIES), avoid = [], seed = Date.now() } = {}) {
  const rand = rng(seed);
  const n = mode === 'buzz' ? Math.max(2, Math.min(4, names.length)) : 1;
  const set = pickSet(count, cats, avoid, rand);
  return {
    mode, rand,
    players: Array.from({ length: n }, (_, i) => ({ name: (names[i] || `Player ${i + 1}`).trim() || `Player ${i + 1}`, color: PLAYER_COLORS[i], score: 0, right: 0, wrong: 0, streak: 0, best: 0 })),
    set, qi: 0,
    phase: 'intro',      // intro → ask → (answering) → reveal → … → over
    t: 0,
    timeLeft: 0,
    answerLeft: 0,
    buzzer: null,        // buzz mode: who is answering
    locked: new Set(),   // buzz mode: who already got it wrong this question
    picked: null,        // the option chosen (or null)
    result: null,        // { correct, points, who, timeout }
    lifelines: { fifty: true, auntie: true, pass: true },
    hidden: new Set(),   // options removed by 50:50
    poll: null,          // "Ask Auntie" percentages
    log: [],             // per question: { id, correct, who }
  };
}

export const question = (s) => s.set[s.qi];
export const total = (s) => s.set.length;

export function startQuestion(s) {
  s.phase = 'ask';
  s.timeLeft = s.mode === 'solo' ? SOLO_TIME : BUZZ_OPEN;
  s.answerLeft = 0;
  s.buzzer = null;
  s.locked = new Set();
  s.picked = null;
  s.result = null;
  s.hidden = new Set();
  s.tried = new Set();
  s.poll = null;
}

/** Buzz mode: player p hits their buzzer. */
export function buzz(s, p) {
  if (s.mode !== 'buzz' || s.phase !== 'ask' || s.locked.has(p) || !s.players[p]) return false;
  s.buzzer = p;
  s.phase = 'answering';
  s.answerLeft = BUZZ_ANSWER;
  return true;
}

function points(s, q, correct) {
  const base = BASE[q.d];
  if (s.mode === 'buzz') return correct ? base : -Math.round(base / 2);
  if (!correct) return 0;
  const speed = 0.5 + 0.5 * Math.max(0, s.timeLeft) / SOLO_TIME;
  const pl = s.players[0];
  return Math.round(base * speed / 10) * 10 + Math.min(5, pl.streak) * 20;
}

/** Choose an option. Returns { correct, points, who }. */
export function answer(s, choice) {
  const q = question(s);
  const who = s.mode === 'buzz' ? s.buzzer : 0;
  if (s.mode === 'buzz' ? s.phase !== 'answering' : s.phase !== 'ask') return null;
  if (s.hidden.has(choice) || (s.tried && s.tried.has(choice))) return null;
  const correct = choice === q.right;
  const pl = s.players[who];
  if (correct) { pl.streak += 1; pl.best = Math.max(pl.best, pl.streak); } else pl.streak = 0;
  const pts = points(s, q, correct);
  pl.score += pts;
  if (correct) pl.right += 1; else pl.wrong += 1;
  s.picked = choice;
  if (correct || s.mode === 'solo') {
    s.result = { correct, points: pts, who, choice };
    s.phase = 'reveal';
    s.log.push({ id: q.id, correct, who });
    return s.result;
  }
  // buzz mode, wrong: locked out, the others can steal (and that answer is greyed out)
  s.locked.add(who);
  s.tried.add(choice);
  const res = { correct, points: pts, who, choice };
  if (s.locked.size >= s.players.length) {
    s.result = { ...res, allWrong: true };
    s.phase = 'reveal';
    s.log.push({ id: q.id, correct: false, who: null });
  } else {
    s.phase = 'ask';
    s.buzzer = null;
    s.timeLeft = Math.max(s.timeLeft, 6); // a fair window to steal
  }
  return res;
}

/** Advance the clocks. Returns 'timeout' when a question (or an answer) runs out of time. */
export function tick(s, dt) {
  s.t += dt;
  if (s.phase === 'ask') {
    s.timeLeft -= dt;
    if (s.timeLeft <= 0) {
      s.timeLeft = 0;
      if (s.mode === 'solo') { s.players[0].streak = 0; s.players[0].wrong += 1; }
      s.result = { correct: false, points: 0, who: null, timeout: true };
      s.phase = 'reveal';
      s.log.push({ id: question(s).id, correct: false, who: null });
      return 'timeout';
    }
  } else if (s.phase === 'answering') {
    s.answerLeft -= dt;
    if (s.answerLeft <= 0) {
      // ran out of time after buzzing: counts as a wrong answer
      const q = question(s);
      const wrongChoice = [0, 1, 2, 3].find((i) => i !== q.right && !s.hidden.has(i) && !s.tried.has(i));
      const res = answer(s, wrongChoice);
      if (res) { res.slow = true; s.picked = null; if (s.tried) s.tried.delete(wrongChoice); }
      return 'slow';
    }
  }
  return null;
}

// ---------------- solo lifelines ----------------
export function useFifty(s) {
  if (s.mode !== 'solo' || s.phase !== 'ask' || !s.lifelines.fifty) return false;
  const q = question(s);
  const wrong = shuffle([0, 1, 2, 3].filter((i) => i !== q.right), s.rand).slice(0, 2);
  wrong.forEach((i) => s.hidden.add(i));
  s.lifelines.fifty = false;
  return true;
}
/** "Ask Auntie": a poll of the kopitiam crowd. They're usually right… usually. */
export function useAuntie(s) {
  if (s.mode !== 'solo' || s.phase !== 'ask' || !s.lifelines.auntie) return false;
  const q = question(s);
  const live = [0, 1, 2, 3].filter((i) => !s.hidden.has(i));
  const sure = q.d === 1 ? 0.62 : q.d === 2 ? 0.5 : 0.4;
  const weights = live.map((i) => (i === q.right ? sure + s.rand() * 0.2 : s.rand() * 0.35));
  const sum = weights.reduce((a, b) => a + b, 0);
  const poll = [0, 0, 0, 0];
  live.forEach((i, k) => { poll[i] = Math.round((weights[k] / sum) * 100); });
  // make it add up to 100
  const diff = 100 - poll.reduce((a, b) => a + b, 0);
  poll[q.right] += diff;
  s.poll = poll;
  s.lifelines.auntie = false;
  return true;
}
/** "Chope next": swap this question for another one, no penalty. */
export function usePass(s, avoid = []) {
  if (s.mode !== 'solo' || s.phase !== 'ask' || !s.lifelines.pass) return false;
  const inSet = new Set(s.set.map((q) => q.id).concat(avoid));
  const cur = question(s);
  const pool = QUESTIONS.filter((q) => q.cat === cur.cat && !inSet.has(q.id));
  const alt = (pool.length ? pool : QUESTIONS.filter((q) => !inSet.has(q.id)))[Math.floor(s.rand() * Math.max(1, pool.length))];
  if (!alt) return false;
  const order = shuffle([0, 1, 2, 3], s.rand);
  s.set[s.qi] = { ...alt, opts: order.map((i) => alt.answers[i]), right: order.indexOf(0) };
  s.lifelines.pass = false;
  startQuestion(s);
  return true;
}

/** Move on. Returns 'next' or 'over'. */
export function next(s) {
  s.qi += 1;
  if (s.qi >= s.set.length) { s.phase = 'over'; s.qi = s.set.length - 1; return 'over'; }
  s.phase = 'intro';
  return 'next';
}

export const standings = (s) => s.players.map((_, i) => i).sort((a, b) => s.players[b].score - s.players[a].score);
export function stars(s) {
  const pl = s.players[0];
  const pct = pl.right / s.set.length;
  return pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
}
export const usedIds = (s) => s.set.map((q) => q.id);
