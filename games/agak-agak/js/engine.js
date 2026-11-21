// Agak Agak — pure game rules. No DOM in here so both the 2D and 3D builds share it.
import { CARDS } from './cards.js';
import { SOLO_PACK, SOLO_ROUNDS } from './solo.js';

/** Dial covers 0° (left end) to 180° (right end). */
export const DIAL_MAX = 180;
/** Width of one scoring band in degrees. Target = 2|3|4|3|2 bands. */
export const BAND = 6.5;
export const TARGET_MIN = BAND * 2.5;
export const TARGET_MAX = DIAL_MAX - BAND * 2.5;

export const TEAM_COLORS = ['#D7263D', '#1F8A8A'];
export const DEFAULT_NAMES = ['Team Kopi', 'Team Teh'];

export const PHASES = {
  SETUP: 'setup',
  HANDOFF: 'handoff', // pass device to the psychic
  PICK: 'pick', // psychic picks a card
  SPIN: 'spin', // psychic spins & peeks at the target
  CLUE: 'clue', // psychic thinks of a clue, closes the shutter
  GUESS: 'guess', // team moves the needle
  CALL: 'call', // other team calls left / right
  REVEAL: 'reveal',
  OVER: 'over',
  SOLO_GUESS: 'solo-guess',
  SOLO_REVEAL: 'solo-reveal',
  SOLO_OVER: 'solo-over',
};

export function scoreFor(target, needle) {
  const d = Math.abs(target - needle);
  if (d <= BAND * 0.5) return 4;
  if (d <= BAND * 1.5) return 3;
  if (d <= BAND * 2.5) return 2;
  return 0;
}

export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randomTarget(rand = Math.random) {
  return TARGET_MIN + rand() * (TARGET_MAX - TARGET_MIN);
}

export function newGame({ names = DEFAULT_NAMES, targetScore = 10, catchUp = true, deck = 'sg' } = {}) {
  return {
    v: 1,
    phase: PHASES.HANDOFF,
    teams: names.map((name, i) => ({ name: name.trim() || DEFAULT_NAMES[i], score: i === 1 ? 1 : 0, color: TEAM_COLORS[i] })),
    targetScore,
    catchUp,
    deckMode: deck === 'blank' ? 'blank' : 'sg', // 'sg' = SG Edition cards, 'blank' = write your own every turn
    custom: null, // { q, left, right } when the Psychic writes their own card
    turn: 0,
    round: 1,
    deck: shuffle(CARDS.map((_, i) => i)),
    choices: null,
    card: null,
    target: null,
    clue: '',
    needle: 90,
    call: null,
    result: null,
    bonusTurn: false,
    history: [],
  };
}

export const other = (t) => 1 - t;

export function drawChoices(s) {
  if (s.deck.length < 2) s.deck = shuffle(CARDS.map((_, i) => i));
  s.choices = [s.deck.pop(), s.deck.pop()];
  return s.choices.map((i) => CARDS[i]);
}

export function cardOf(s) {
  if (s.blank) return null;
  if (s.custom) return [s.custom.left, s.custom.right];
  return s.card == null ? null : CARDS[s.card];
}

/** Optional question / topic for the current card (only custom cards have one). */
export function questionOf(s) {
  return (s.custom && s.custom.q) || '';
}

export const CUSTOM_LIMITS = { q: 80, side: 28 };

/** Psychic writes their own card: an optional question plus the two ends. */
export function chooseCustom(s, { q = '', left, right }) {
  const clean = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);
  s.custom = { q: clean(q, CUSTOM_LIMITS.q), left: clean(left, CUSTOM_LIMITS.side), right: clean(right, CUSTOM_LIMITS.side) };
  s.card = null;
  s.flipped = false;
  s.target = null;
  s.phase = PHASES.SPIN;
}

/** Blank card: nothing on screen, the Psychic says the question and both ends out loud. */
export function chooseBlank(s) {
  s.blank = true;
  s.custom = null;
  s.card = null;
  s.target = null;
  s.phase = PHASES.SPIN;
}

export function chooseCard(s, which, flip = false) {
  s.blank = false;
  s.custom = null;
  s.card = s.choices[which];
  s.flipped = !!flip;
  s.target = null;
  s.phase = PHASES.SPIN;
}

/** Card with left/right swapped if the psychic flipped it. */
export function labels(s) {
  const c = cardOf(s);
  if (!c) return null;
  return s.flipped ? [c[1], c[0]] : c;
}

export function resolve(s) {
  const guessing = s.turn;
  const opp = other(guessing);
  const points = scoreFor(s.target, s.needle);
  const actualSide = s.target < s.needle ? 'left' : s.target > s.needle ? 'right' : null;
  // Opponent's call only scores if the guessers did not hit the bullseye.
  const callCorrect = points < 4 && actualSide != null && s.call === actualSide;
  s.teams[guessing].score += points;
  if (callCorrect) s.teams[opp].score += 1;

  const behind = s.teams[guessing].score < s.teams[opp].score;
  const bonus = s.catchUp && points === 4 && behind;

  s.result = { points, callCorrect, actualSide, bonus, guessing, opp };
  s.history.push({ round: s.round, team: guessing, card: s.card, labels: labels(s), q: questionOf(s), clue: s.clue, target: s.target, needle: s.needle, points, callCorrect });
  s.phase = PHASES.REVEAL;
  return s.result;
}

export function winner(s) {
  const [a, b] = s.teams.map((t) => t.score);
  const reached = a >= s.targetScore || b >= s.targetScore;
  if (!reached || a === b) return null; // tie at the top → keep playing (sudden death)
  return a > b ? 0 : 1;
}

export function nextTurn(s) {
  const w = winner(s);
  if (w != null && !(s.result && s.result.bonus)) {
    s.phase = PHASES.OVER;
    s.winner = w;
    return;
  }
  if (!(s.result && s.result.bonus)) {
    s.turn = other(s.turn);
    if (s.turn === 0) s.round += 1;
  }
  s.choices = null;
  s.card = null;
  s.custom = null;
  s.blank = false;
  s.target = null;
  s.clue = '';
  s.needle = 90;
  s.call = null;
  s.result = null;
  s.phase = PHASES.HANDOFF;
}

// ---------------- Solo mode ----------------
/** Map a 0–100 clue position onto the targetable part of the dial. */
export const posToDeg = (p) => TARGET_MIN + (p / 100) * (TARGET_MAX - TARGET_MIN);

export function newSolo({ rounds = SOLO_ROUNDS } = {}) {
  const cards = shuffle(SOLO_PACK.map((_, i) => i)).slice(0, rounds);
  const queue = cards.map((c) => [c, Math.floor(Math.random() * SOLO_PACK[c].clues.length)]);
  return { v: 1, mode: 'solo', phase: PHASES.SOLO_GUESS, rounds: queue.length, round: 1, score: 0, queue, needle: 90, results: [] };
}

export function soloCurrent(s) {
  const [c, k] = s.queue[s.round - 1];
  const entry = SOLO_PACK[c];
  const [clue, pos] = entry.clues[k];
  return { labels: entry.card, clue, pos, target: posToDeg(pos) };
}

export function soloResolve(s) {
  const cur = soloCurrent(s);
  const points = scoreFor(cur.target, s.needle);
  s.score += points;
  const off = Math.round((Math.abs(cur.target - s.needle) / (TARGET_MAX - TARGET_MIN)) * 100);
  s.result = { points, off, pos: cur.pos };
  s.results.push({ clue: cur.clue, labels: cur.labels, points, off });
  s.phase = PHASES.SOLO_REVEAL;
  return s.result;
}

export function soloNext(s) {
  s.result = null;
  s.needle = 90;
  if (s.round >= s.rounds) { s.phase = PHASES.SOLO_OVER; return; }
  s.round += 1;
  s.phase = PHASES.SOLO_GUESS;
}
