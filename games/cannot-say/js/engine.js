// Cannot Say! — pure rules (no DOM). Shared by the 2D and 3D builds.
import { CARDS, CATEGORIES } from './cards.js';
export { CARDS, CATEGORIES };

export const TEAM_COLORS = ['#E8590C', '#2D6FD1', '#2F9E5B', '#7A4FC9'];
export const TEAM_NAMES = ['Team Kiasu', 'Team Shiok', 'Team Steady', 'Team Bojio'];
export const MAX_SKIPS = 3;
export const POINTS = { got: 1, skip: 0, buzz: -1 };

function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
}
function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * teams: 2–4 · rounds: per team · seconds: per turn · cats: category ids · avoid: card ids seen recently
 */
export function newGame({ teams = 2, names = [], rounds = 3, seconds = 60, cats = Object.keys(CATEGORIES), avoid = [], seed = Date.now() } = {}) {
  const n = Math.max(2, Math.min(4, teams));
  const rand = rng(seed);
  const pool = CARDS.filter((c) => cats.includes(c.cat));
  const seen = new Set(avoid);
  // fresh cards first, then the ones played recently, each shuffled
  const deck = [...shuffle(pool.filter((c) => !seen.has(c.id)), rand), ...shuffle(pool.filter((c) => seen.has(c.id)), rand)];
  return {
    teams: Array.from({ length: n }, (_, i) => ({ name: (names[i] || TEAM_NAMES[i]).trim() || TEAM_NAMES[i], score: 0, color: TEAM_COLORS[i], history: [] })),
    rounds: Math.max(1, rounds),
    seconds,
    cats,
    deck,
    deckIdx: 0,
    round: 0, // 0-based round number
    turn: 0,  // team index
    phase: 'pass', // pass → play → review → (pass … ) → over
    timeLeft: seconds,
    card: null,
    played: [], // cards this turn: { card, result }
    skips: 0,
  };
}

export const teamOf = (s) => s.teams[s.turn];
export const turnNumber = (s) => s.round * s.teams.length + s.turn + 1;
export const totalTurns = (s) => s.rounds * s.teams.length;

function draw(s) {
  if (s.deckIdx >= s.deck.length) s.deckIdx = 0; // recycle if a very long game runs out
  s.card = s.deck[s.deckIdx++];
  return s.card;
}

export function startTurn(s) {
  if (s.phase !== 'pass') return false;
  s.phase = 'play';
  s.timeLeft = s.seconds;
  s.played = [];
  s.skips = 0;
  draw(s);
  return true;
}

/** Describer marks the current card: 'got' | 'skip' | 'buzz'. Returns the result or null if not allowed. */
export function mark(s, result) {
  if (s.phase !== 'play' || !s.card) return null;
  if (result === 'skip' && s.skips >= MAX_SKIPS) return null;
  if (result === 'skip') s.skips += 1;
  s.played.push({ card: s.card, result });
  draw(s);
  return result;
}

/** Advance the clock. Returns 'tick' on each whole second under 10, 'timeup' once at zero. */
export function tick(s, dt) {
  if (s.phase !== 'play') return null;
  const before = Math.ceil(s.timeLeft);
  s.timeLeft = Math.max(0, s.timeLeft - dt);
  const after = Math.ceil(s.timeLeft);
  if (s.timeLeft <= 0) { timeUp(s); return 'timeup'; }
  if (after < before && after <= 10) return 'tick';
  return null;
}

function timeUp(s) {
  // the card on screen when the buzzer goes is shown in the review as "missed" (no score)
  if (s.card) s.played.push({ card: s.card, result: 'time' });
  s.card = null;
  s.phase = 'review';
}

export function endTurnEarly(s) { if (s.phase === 'play') timeUp(s); }

/** In the review, tap a card to correct it: got → skip → buzz → got. The last card can also become 'got'. */
export function cycle(s, i) {
  const p = s.played[i];
  if (!p || s.phase !== 'review') return;
  const order = ['got', 'skip', 'buzz'];
  if (p.result === 'time') { p.result = 'got'; return; }
  p.result = order[(order.indexOf(p.result) + 1) % order.length];
}

export const turnScore = (s) => s.played.reduce((a, p) => a + (POINTS[p.result] || 0), 0);

/** Bank the turn. Returns 'pass' (next team) or 'over'. */
export function commit(s) {
  if (s.phase !== 'review') return null;
  const t = teamOf(s);
  const pts = turnScore(s);
  t.score += pts;
  t.history.push({ pts, got: s.played.filter((p) => p.result === 'got').length, cards: s.played.map((p) => ({ word: p.card.word, result: p.result })) });
  s.turn += 1;
  if (s.turn >= s.teams.length) { s.turn = 0; s.round += 1; }
  s.played = [];
  if (s.round >= s.rounds) { s.phase = 'over'; return 'over'; }
  s.phase = 'pass';
  s.timeLeft = s.seconds;
  return 'pass';
}

export const standings = (s) => s.teams.map((t, i) => i).sort((a, b) => s.teams[b].score - s.teams[a].score);
export function winners(s) {
  const top = Math.max(...s.teams.map((t) => t.score));
  return s.teams.map((t, i) => i).filter((i) => s.teams[i].score === top);
}
/** All card ids drawn this game (for "recently seen" across games). */
export const usedIds = (s) => s.deck.slice(0, s.deckIdx).map((c) => c.id);
