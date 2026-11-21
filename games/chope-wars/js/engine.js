// Chope Wars — pure rules + CPU. No DOM, shared by the 2D and 3D builds.
//
// The board is a grid of hawker tables. Stools sit between tables, so a stool between two
// tables counts for both. Players take turns putting a tissue packet on an empty stool.
// When all 4 stools of a table are choped, the player with more packets there claims it;
// on a 2–2 tie, whoever choped the last stool wins it. Fan tables are worth more.
// Once per game each player may call the cleaner auntie: swap one opponent packet
// (on a table nobody has claimed yet) for their own. That uses their turn.

export const COLORS = ['#E0457B', '#2D6FD1'];
export const DEFAULT_NAMES = ['Pink Packet', 'Blue Packet'];
export const SIZES = { small: 3, classic: 4, big: 5 };

export const TABLE_TYPES = {
  normal: { value: 1, label: 'Table' },
  fan: { value: 2, label: 'Under the fan' },
  famous: { value: 3, label: 'Beside the famous stall' },
};

const shuffle = (a, rand = Math.random) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** Build the static geometry for an n×n board. */
export function layout(n) {
  const stools = []; // { id, kind: 'h'|'v', r, c, tables: [tableIds] }
  const idx = {};
  const add = (kind, r, c) => { idx[`${kind}${r},${c}`] = stools.length; stools.push({ id: stools.length, kind, r, c, tables: [] }); };
  // 'h' stools sit on horizontal grid lines (above/below tables), 'v' on vertical ones (left/right)
  for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) add('h', r, c);
  for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) add('v', r, c);
  const tables = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const id = tables.length;
    const st = [idx[`h${r},${c}`], idx[`v${r},${c + 1}`], idx[`h${r + 1},${c}`], idx[`v${r},${c}`]]; // N E S W
    st.forEach((s) => stools[s].tables.push(id));
    tables.push({ id, r, c, stools: st, name: `${String.fromCharCode(65 + r)}${c + 1}` });
  }
  return { n, stools, tables };
}

export function newGame({ names = DEFAULT_NAMES, size = 'classic', cpu = null } = {}) {
  const n = SIZES[size] || 4;
  const geo = layout(n);
  // ~25% fan tables, 1–2 famous ones, never all clumped together
  const ids = shuffle(geo.tables.map((t) => t.id));
  const famous = n >= 4 ? 2 : 1;
  const fans = Math.round(n * n * 0.25);
  const types = geo.tables.map(() => 'normal');
  ids.slice(0, famous).forEach((i) => (types[i] = 'famous'));
  ids.slice(famous, famous + fans).forEach((i) => (types[i] = 'fan'));
  return {
    v: 1,
    size,
    n,
    phase: 'play',
    cpu, // null | { level: 'easy' | 'hard', seat: 1 }
    players: names.map((name, i) => ({ name: String(name || '').trim() || DEFAULT_NAMES[i], color: COLORS[i], score: 0, tables: 0, auntie: 1 })),
    turn: 0,
    stools: geo.stools.map(() => null), // owner index
    tables: geo.tables.map((t, i) => ({ type: types[i], value: TABLE_TYPES[types[i]].value, owner: null })),
    moves: 0,
    last: null,
  };
}

// geometry cache
const geoCache = {};
export const geo = (s) => (geoCache[s.n] ||= layout(s.n));

export const other = (p) => 1 - p;
export const filledCount = (s, t) => geo(s).tables[t].stools.filter((x) => s.stools[x] != null).length;
export const countFor = (s, t, p) => geo(s).tables[t].stools.filter((x) => s.stools[x] === p).length;

/** Can player p use the auntie on this stool? */
export function canSwap(s, stool, p = s.turn) {
  if (s.players[p].auntie < 1) return false;
  if (s.stools[stool] == null || s.stools[stool] === p) return false;
  return geo(s).stools[stool].tables.every((t) => s.tables[t].owner == null);
}
export const canPlace = (s, stool) => s.phase === 'play' && s.stools[stool] == null;

/** Apply a move. move = { type: 'place' | 'swap', stool }. Returns events for the renderer. */
export function apply(s, move) {
  const p = s.turn;
  const ev = { player: p, move, claims: [] };
  if (move.type === 'swap') {
    if (!canSwap(s, move.stool, p)) throw new Error('bad swap');
    s.stools[move.stool] = p;
    s.players[p].auntie -= 1;
  } else {
    if (!canPlace(s, move.stool)) throw new Error('bad place');
    s.stools[move.stool] = p;
    for (const t of geo(s).stools[move.stool].tables) {
      if (filledCount(s, t) < 4 || s.tables[t].owner != null) continue;
      const mine = countFor(s, t, p);
      const theirs = 4 - mine;
      const owner = mine > theirs ? p : theirs > mine ? other(p) : p; // tie → last chope wins
      s.tables[t].owner = owner;
      s.players[owner].score += s.tables[t].value;
      s.players[owner].tables += 1;
      ev.claims.push({ table: t, owner, value: s.tables[t].value, tie: mine === theirs });
    }
  }
  s.moves += 1;
  s.last = { player: p, ...move, claims: ev.claims.map((c) => c.table) };
  if (s.stools.every((x) => x != null)) {
    s.phase = 'over';
    s.winner = winner(s);
  } else {
    s.turn = other(p);
  }
  return ev;
}

export function winner(s) {
  const [a, b] = s.players;
  if (a.score !== b.score) return a.score > b.score ? 0 : 1;
  if (a.tables !== b.tables) return a.tables > b.tables ? 0 : 1;
  return -1; // draw
}

export const clone = (s) => JSON.parse(JSON.stringify(s));

// ---------------- CPU ("Uncle Lim") ----------------
function legalMoves(s) {
  const out = [];
  s.stools.forEach((o, i) => {
    if (o == null) out.push({ type: 'place', stool: i });
    else if (canSwap(s, i)) out.push({ type: 'swap', stool: i });
  });
  return out;
}

/** Points p would gain right now by placing on stool (and points handed to the other side). */
function placeGain(s, stool, p) {
  let gain = 0;
  for (const t of geo(s).stools[stool].tables) {
    if (s.tables[t].owner != null || filledCount(s, t) !== 3) continue;
    const mine = countFor(s, t, p) + 1;
    gain += (mine >= 2 ? 1 : -1) * s.tables[t].value; // with 4 filled, mine>=2 wins (tie → me)
  }
  return gain;
}

function bestImmediate(s, p) {
  let best = -Infinity;
  s.stools.forEach((o, i) => { if (o == null) best = Math.max(best, placeGain(s, i, p)); });
  return best === -Infinity ? 0 : best;
}

/** Soft board control: how much each open table leans to p. */
function control(s, p) {
  let v = 0;
  geo(s).tables.forEach((t, i) => {
    if (s.tables[i].owner != null) return;
    const mine = countFor(s, i, p), theirs = countFor(s, i, other(p));
    v += s.tables[i].value * (mine - theirs) * 0.25;
    if (mine >= 3) v += s.tables[i].value * 0.6; // locked in
  });
  return v;
}

export function cpuMove(s, level = 'hard') {
  const p = s.turn;
  const moves = legalMoves(s);
  const open = s.stools.filter((x) => x == null).length;
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    const t = clone(s);
    const before = t.players[p].score - t.players[other(p)].score;
    apply(t, m);
    const after = t.players[p].score - t.players[other(p)].score;
    let score = after - before;
    if (t.phase === 'play') {
      score -= 0.95 * Math.max(0, bestImmediate(t, other(p)));
      score += control(t, p) - control(s, p);
    }
    if (m.type === 'swap') score -= open > 6 ? 1.2 : 0.2; // save the auntie for when it matters
    if (level === 'easy') score += (Math.random() - 0.5) * 3;
    else score += Math.random() * 0.05; // tie-break
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}
