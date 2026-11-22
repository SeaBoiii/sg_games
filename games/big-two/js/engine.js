// Big Two — rules, scoring and the CPU players (no DOM).
//
// Cards are ids 0..51: rank = id >> 2 (0 = "3" … 12 = "2"), suit = id & 3 (♦ ♣ ♥ ♠, lowest to highest),
// so a higher id is always a higher single card. The 3♦ is id 0.

export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const RANK_LONG = ['3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace', '2'];
const RANK_PL = ['3s', '4s', '5s', '6s', '7s', '8s', '9s', '10s', 'Jacks', 'Queens', 'Kings', 'Aces', '2s'];
export const SUIT_SYM = ['♦', '♣', '♥', '♠'];
export const SUIT_NAME = ['diamonds', 'clubs', 'hearts', 'spades'];
export const SEATS = 4;
export const HAND = 13;
export const THREE_D = 0;
export const START_ORANGES = 40;
export const DEAL_OPTIONS = [1, 4, 8];
export const COLORS = ['#D7263D', '#2D6FD1', '#2F9E5B', '#E8590C'];
export const CHARS = ['worker_a', 'aunty', 'uncle', 'ns'];
export const CPU_NAMES = ['You', 'Ah Ma', 'Uncle Lim', 'Cousin Wei'];
export const FIVE_NAMES = ['', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];

export const rk = (id) => id >> 2;
export const st = (id) => id & 3;
export const isRed = (id) => st(id) === 0 || st(id) === 2;
export const cardName = (id) => `${RANKS[rk(id)]}${SUIT_SYM[st(id)]}`;
export const cardLong = (id) => `${RANK_LONG[rk(id)]} of ${SUIT_NAME[st(id)]}`;
export const next = (i) => (i + 1) % SEATS;
const byId = (a, b) => a - b;

export function sortHand(ids, mode = 'rank') {
  const h = [...ids];
  if (mode === 'suit') h.sort((a, b) => st(a) - st(b) || a - b);
  else h.sort(byId);
  return h;
}

// ---------------- combinations ----------------
/** Returns { type, size, kind, key, cards } or null. kind ranks five-card hands (1 straight … 5 straight flush). */
export function classify(ids) {
  const n = ids.length;
  if (!n) return null;
  const c = [...ids].sort(byId);
  const r = c.map(rk);
  const top = c[n - 1];
  if (n === 1) return { type: 'single', size: 1, kind: 0, key: top, cards: c };
  if (n === 2) return r[0] === r[1] ? { type: 'pair', size: 2, kind: 0, key: top, cards: c } : null;
  if (n === 3) return r[0] === r[2] ? { type: 'triple', size: 3, kind: 0, key: r[0], cards: c } : null;
  if (n !== 5) return null;
  const s0 = st(c[0]);
  const flush = c.every((x) => st(x) === s0);
  const straight = r[4] <= 11 && r.every((v, i) => i === 0 || v === r[i - 1] + 1); // 2s can't sit in a straight
  const five = (kind, key) => ({ type: 'five', size: 5, kind, key, cards: c });
  if (straight && flush) return five(5, top);
  // r is sorted, so a four or a triple sits at one end
  if (r[0] === r[3] || r[1] === r[4]) return five(4, r[1]);
  if ((r[0] === r[2] && r[3] === r[4]) || (r[0] === r[1] && r[2] === r[4])) return five(3, r[2]);
  if (flush) return five(2, top);
  if (straight) return five(1, top);
  return null;
}

export function beats(a, b) {
  if (!b) return true;
  if (a.size !== b.size) return false;
  if (a.size === 5 && a.kind !== b.kind) return a.kind > b.kind;
  return a.key > b.key;
}

export function comboName(c) {
  if (!c) return '';
  switch (c.type) {
    case 'single': return cardName(c.key);
    case 'pair': return `Pair of ${RANK_PL[rk(c.key)]}`;
    case 'triple': return `Three ${RANK_PL[c.key]}`;
    default:
      if (c.kind === 1) return `Straight to ${cardName(c.key)}`;
      if (c.kind === 2) return `Flush to ${cardName(c.key)}`;
      if (c.kind === 3) return `Full house, ${RANK_PL[c.key]}`;
      if (c.kind === 4) return `Four ${RANK_PL[c.key]}`;
      return `Straight flush to ${cardName(c.key)}`;
  }
}

/** Every legal play from a hand. tableCombo: what has to be beaten (null when leading). */
export function options(hand, tableCombo = null, mustInclude = null) {
  const h = [...hand].sort(byId);
  const n = h.length;
  const out = [];
  const add = (ids) => {
    if (mustInclude != null && !ids.includes(mustInclude)) return;
    const c = classify(ids);
    if (c && (!tableCombo || beats(c, tableCombo))) out.push(c);
  };
  const want = tableCombo ? [tableCombo.size] : [1, 2, 3, 5];
  if (want.includes(1)) for (const a of h) add([a]);
  if (want.includes(2)) for (let i = 0; i < n; i++) for (let j = i + 1; j < n && rk(h[j]) === rk(h[i]); j++) add([h[i], h[j]]);
  if (want.includes(3)) for (let i = 0; i < n; i++) for (let j = i + 1; j < n && rk(h[j]) === rk(h[i]); j++) for (let k = j + 1; k < n && rk(h[k]) === rk(h[i]); k++) add([h[i], h[j], h[k]]);
  if (want.includes(5)) for (const f of fives(h)) if ((mustInclude == null || f.cards.includes(mustInclude)) && (!tableCombo || beats(f, tableCombo))) out.push(f);
  return out;
}

function fives(h) {
  const out = [];
  const n = h.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
    const x = classify([h[a], h[b], h[c], h[d], h[e]]);
    if (x) out.push(x);
  }
  return out;
}

// ---------------- game state ----------------
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function newGame({ players, deals = 4, level = 'kiasu', seed } = {}) {
  const ps = (players || CPU_NAMES.map((name, i) => ({ name, cpu: i > 0 }))).slice(0, SEATS);
  return {
    players: ps.map((p, i) => ({ name: p.name, cpu: !!p.cpu, char: CHARS[i], color: COLORS[i], hand: [], oranges: START_ORANGES, wins: 0 })),
    deals, level,
    rng: mulberry(seed ?? Math.floor(Math.random() * 2 ** 31)),
    dealNo: 0, turn: 0, first: true, phase: 'idle',
    table: null, trick: [], passes: 0, said: Array(SEATS).fill(null), played: [],
    lastWinner: null, results: null, winner: null,
  };
}

export const current = (s) => s.players[s.turn];
export const humans = (s) => s.players.filter((p) => !p.cpu).length;

export function startDeal(s) {
  const deck = [...Array(52).keys()];
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(s.rng() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  s.players.forEach((p, i) => { p.hand = sortHand(deck.slice(i * HAND, i * HAND + HAND)); });
  s.dealNo += 1;
  s.table = null; s.trick = []; s.passes = 0; s.played = []; s.said = Array(SEATS).fill(null);
  s.first = s.lastWinner == null;
  s.turn = s.first ? s.players.findIndex((p) => p.hand.includes(THREE_D)) : s.lastWinner;
  s.phase = 'play';
  s.results = null;
  return [{ type: 'deal', p: s.turn, first: s.first }];
}

/** Can the current player play these cards? { ok, combo, reason } */
export function check(s, ids) {
  if (!ids.length) return { ok: false, reason: s.table ? 'Pick cards to beat it, or pass' : 'Pick cards to play' };
  const combo = classify(ids);
  if (!combo) return { ok: false, reason: ids.length === 4 ? 'Four cards isn’t a hand. Add a fifth' : ids.length > 5 ? 'Too many cards' : 'Not a combination' };
  if (s.first && !ids.includes(THREE_D)) return { ok: false, combo, reason: 'The first play must include the 3♦' };
  if (s.table) {
    const t = s.table.combo;
    if (combo.size !== t.size) return { ok: false, combo, reason: `Play ${t.size === 1 ? 'a single' : t.size === 2 ? 'a pair' : t.size === 3 ? 'a triple' : 'five cards'} on ${t.size === 5 ? 'a five-card hand' : 'that'}` };
    if (!beats(combo, t)) return { ok: false, combo, reason: `Too small to beat ${comboName(t)}` };
  }
  return { ok: true, combo };
}

export function play(s, ids) {
  const chk = check(s, ids);
  if (s.phase !== 'play' || !chk.ok) return null;
  const p = s.turn, me = s.players[p];
  me.hand = me.hand.filter((x) => !ids.includes(x));
  s.played.push(...chk.combo.cards);
  s.table = { combo: chk.combo, by: p };
  s.trick.push({ p, combo: chk.combo });
  s.said = Array(SEATS).fill(null); // only passes since the last play are shown
  s.said[p] = chk.combo;
  s.passes = 0;
  s.first = false;
  const ev = [{ type: 'play', p, combo: chk.combo, left: me.hand.length }];
  if (me.hand.length === 1) ev.push({ type: 'last', p });
  if (!me.hand.length) return ev.concat(endDeal(s, p));
  s.turn = next(p);
  return ev;
}

export function pass(s) {
  if (s.phase !== 'play' || !s.table) return null;
  const p = s.turn;
  s.said[p] = 'pass';
  s.passes += 1;
  const ev = [{ type: 'pass', p }];
  if (s.passes >= SEATS - 1) {
    const by = s.table.by;
    ev.push({ type: 'clear', p: by, trick: s.trick });
    s.table = null; s.trick = []; s.passes = 0; s.said = Array(SEATS).fill(null);
    s.turn = by;
  } else s.turn = next(p);
  return ev;
}

export const penalty = (n) => n * (n === HAND ? 3 : n >= 10 ? 2 : 1);

function endDeal(s, w) {
  const res = s.players.map((p, i) => ({ left: p.hand.length, owe: i === w ? 0 : penalty(p.hand.length), paid: 0, got: 0 }));
  res.forEach((r, i) => { if (i === w) return; r.paid = Math.min(r.owe, s.players[i].oranges); s.players[i].oranges -= r.paid; res[w].got += r.paid; });
  s.players[w].oranges += res[w].got;
  s.players[w].wins += 1;
  s.lastWinner = w;
  s.results = { winner: w, rows: res };
  s.table = null;
  const bust = s.players.some((p) => p.oranges <= 0);
  s.phase = s.dealNo >= s.deals || bust ? 'over' : 'dealover';
  if (s.phase === 'over') s.winner = standings(s)[0];
  return [{ type: 'out', p: w }, { type: 'score', results: s.results }];
}

/** Seats ordered by oranges, then deals won, then seat. */
export const standings = (s) => s.players.map((_, i) => i).sort((a, b) => s.players[b].oranges - s.players[a].oranges || s.players[b].wins - s.players[a].wins || a - b);

// ---------------- CPU ----------------
export const TUNE = { passAt: 0.7 };
// A hand is split into the fewest, cheapest groups (five-card hands, triples, pairs, singles).
// Leading plays the weakest group; following plays a card group that already exists if it can,
// and only breaks pairs or spends 2s when it pays off or someone is about to go out.

function evaluator(hand) {
  const h = [...hand].sort(byId);
  const n = h.length;
  const R = h.map(rk);
  const idx = new Map(h.map((id, i) => [id, i]));
  const mask = (ids) => ids.reduce((m, id) => m | (1 << idx.get(id)), 0);
  const fv = fives(h).map((c) => ({ c, m: mask(c.cards) }));
  const looseMemo = new Map();
  const loose = (m) => {
    if (looseMemo.has(m)) return looseMemo.get(m);
    const cnt = new Array(13).fill(0);
    for (let i = 0; i < n; i++) if (m & (1 << i)) cnt[R[i]] += 1;
    let cost = 0;
    for (let r = 0; r < 13; r++) {
      const k = cnt[r];
      if (!k) continue;
      const low = (12 - r) / 12;
      cost += k === 1 ? 1 + 0.6 * low : k === 2 ? 1 + 0.3 * low : k === 3 ? 1 + 0.15 * low : 2 + 0.3 * low;
    }
    looseMemo.set(m, cost);
    return cost;
  };
  const planMemo = new Map();
  const best = (m) => {
    if (planMemo.has(m)) return planMemo.get(m);
    let out = { cost: loose(m), fives: [] };
    const fit = fv.filter((f) => (f.m & m) === f.m);
    for (let i = 0; i < fit.length; i++) {
      const mA = m & ~fit[i].m;
      const cA = 1 + loose(mA);
      if (cA < out.cost) out = { cost: cA, fives: [fit[i]] };
      for (let j = i + 1; j < fit.length; j++) {
        if ((fit[j].m & mA) !== fit[j].m) continue;
        const c = 2 + loose(mA & ~fit[j].m);
        if (c < out.cost) out = { cost: c, fives: [fit[i], fit[j]] };
      }
    }
    planMemo.set(m, out);
    return out;
  };
  const all = (1 << n) - 1;
  const groups = (m = all) => {
    const b = best(m);
    let rest = m;
    const gs = b.fives.map((f) => { rest &= ~f.m; return f.c; });
    const byRank = new Map();
    for (let i = 0; i < n; i++) if (rest & (1 << i)) { if (!byRank.has(R[i])) byRank.set(R[i], []); byRank.get(R[i]).push(h[i]); }
    for (const ids of byRank.values()) {
      if (ids.length === 4) gs.push(classify(ids.slice(0, 2)), classify(ids.slice(2)));
      else gs.push(classify(ids));
    }
    return gs;
  };
  return { all, mask, cost: (m = all) => best(m).cost, groups };
}

const lowRank = (c) => rk(c.cards[0]);
const unseen = (s, p) => { const mine = new Set(s.players[p].hand); const gone = new Set(s.played); return [...Array(52).keys()].filter((x) => !mine.has(x) && !gone.has(x)); };

/** Is this group unbeatable by any cards still out there? */
function isBoss(c, out) {
  if (c.type === 'single') return !out.some((x) => x > c.key);
  if (c.type === 'pair' || c.type === 'triple') {
    const cnt = new Map();
    for (const x of out) cnt.set(rk(x), (cnt.get(rk(x)) || []).concat(x));
    for (const [r, ids] of cnt) {
      if (ids.length < c.size) continue;
      if (c.type === 'triple' ? r > c.key : (r > rk(c.key) || (r === rk(c.key) && Math.max(...ids) > c.key))) return false;
    }
    return true;
  }
  return c.kind === 5 && c.key >= 44; // a straight flush to the Ace is close enough
}

/** The CPU's move for the current player: an array of card ids, or null to pass. */
export function cpuMove(s, level = s.level) {
  const p = s.turn;
  const me = s.players[p];
  const hand = me.hand;
  const ev = evaluator(hand);
  const opp = s.players.map((x, i) => (i === p ? 99 : x.hand.length));
  const danger = Math.min(...opp);
  const nextLeft = s.players[next(p)].hand.length;
  const chill = level === 'chill';
  const r = s.rng;

  // ---- leading ----
  if (!s.table) {
    let gs = ev.groups();
    if (s.first) {
      const with3 = gs.filter((g) => g.cards.includes(THREE_D));
      if (with3.length) gs = with3;
      else {
        // the 3♦ is buried in nothing useful: play the cheapest legal combination that holds it
        const opts = options(hand, null, THREE_D);
        opts.sort((a, b) => ev.cost(ev.all & ~ev.mask(a.cards)) - ev.cost(ev.all & ~ev.mask(b.cards)));
        return opts[0].cards;
      }
    }
    if (gs.length === 1) return gs[0].cards;
    const out = unseen(s, p);
    if (gs.length === 2 && !chill) {
      // try to go out: lead the group nobody can beat, then finish with the other
      const boss = gs.find((g) => isBoss(g, out));
      if (boss) return boss.cards;
    }
    const scored = gs.map((g) => {
      let sc = lowRank(g) - (g.size === 5 ? 3.5 : g.size === 3 ? 1.6 : g.size === 2 ? 1 : 0);
      if (g.size === 1 && nextLeft === 1 && !chill) sc += 30; // don't feed a last card
      if (chill) sc += r() * 4;
      return { g, sc };
    }).sort((a, b) => a.sc - b.sc);
    let pick = scored[0].g;
    if (pick.size === 1 && nextLeft === 1 && !chill) pick = gs.filter((g) => g.size === 1).sort((a, b) => b.key - a.key)[0];
    return pick.cards;
  }

  // ---- following ----
  const opts = options(hand, s.table.combo);
  if (!opts.length) return null;
  const base = ev.cost();
  const scored = opts.map((o) => {
    const rest = ev.all & ~ev.mask(o.cards);
    if (!rest) return { o, sc: -99 };
    const delta = ev.cost(rest) - base;
    let pen = 0;
    const left = hand.length / HAND;
    if (o.size <= 2 && rk(o.key) >= 11) pen += (rk(o.key) - 10) * 0.55 * left;
    if (o.size === 5 && o.kind >= 4) pen += 0.9 * left;
    return { o, sc: delta + pen + o.key * 0.002 + (chill ? r() * 0.8 : 0) };
  }).sort((a, b) => a.sc - b.sc);
  const top = scored[0];
  if (top.sc === -99) return top.o.cards;
  if (s.table.combo.size === 1 && nextLeft === 1 && s.table.by !== next(p) && !chill) {
    // the next player is on their last card: block with the biggest single we have
    return opts.sort((a, b) => b.key - a.key)[0].cards;
  }
  if (chill) {
    if (r() < 0.12) return null;
    return top.sc > 0.9 && r() < 0.6 ? null : top.o.cards;
  }
  if (danger <= 2) return top.o.cards;
  if (top.sc > TUNE.passAt) return null;
  return top.o.cards;
}

/** A suggestion for a human: the Kiasu CPU's move, or the lowest legal play if it would pass. */
export function hint(s) {
  const p = s.turn;
  const mv = cpuMove({ ...s, rng: () => 0.5 }, 'kiasu');
  if (mv) return { cards: mv, pass: false };
  const opts = options(s.players[p].hand, s.table && s.table.combo, s.first ? THREE_D : null);
  if (!opts.length) return { cards: [], pass: true, none: true };
  return { cards: [], pass: true, alt: opts.sort((a, b) => a.key - b.key)[0].cards };
}
