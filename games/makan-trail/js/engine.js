// Makan Trail — pure rules (no DOM). Shared by the 2D and 3D builds.
// A loop of 32 squares around Singapore. Collect the 4 dishes on your makan list from the
// hawker centres, then get back to your own HDB home to win.

export const PLAYER_COLORS = ['#E0457B', '#2D6FD1', '#F2B134', '#2F9E5B'];
export const START_MONEY = 12;
export const PAYDAY = 5;
export const LIST_SIZE = 4;
export const N = 32;
/** Later seats start with a little extra cash to make up for going later (balanced by simulation). */
export const SEAT_BONUS = { 2: [0, 1], 3: [0, 0, 1], 4: [0, 0, 1, 2] };

export const DISHES = {
  chickenrice: { name: 'Chicken rice', price: 3 },
  laksa: { name: 'Laksa', price: 4 },
  satay: { name: 'Satay', price: 4 },
  ckt: { name: 'Char kway teow', price: 3 },
  nasilemak: { name: 'Nasi lemak', price: 3 },
  prata: { name: 'Roti prata', price: 2 },
  hokkienmee: { name: 'Hokkien mee', price: 4 },
  carrotcake: { name: 'Carrot cake', price: 2 },
};

/** Squares, clockwise from the north-west corner. */
export const SQUARES = [
  { type: 'home', name: 'Woodlands' },
  { type: 'hawker', name: 'Chomp Chomp', menu: ['hokkienmee', 'satay', 'carrotcake'] },
  { type: 'angbao', name: 'Ang bao' },
  { type: 'mrt', name: 'Yishun MRT' },
  { type: 'card', name: 'Kopitiam talk' },
  { type: 'erp', name: 'ERP gantry' },
  { type: 'hawker', name: 'Newton', menu: ['satay', 'carrotcake', 'laksa'] },
  { type: 'rain', name: 'Heavy rain' },
  { type: 'home', name: 'Punggol' },
  { type: 'card', name: 'Kopitiam talk' },
  { type: 'hawker', name: 'Old Airport Rd', menu: ['ckt', 'hokkienmee', 'prata'] },
  { type: 'mrt', name: 'Paya Lebar MRT' },
  { type: 'rain', name: 'Heavy rain' },
  { type: 'hawker', name: 'East Coast Lagoon', menu: ['satay', 'laksa', 'chickenrice'] },
  { type: 'angbao', name: 'Ang bao' },
  { type: 'card', name: 'Kopitiam talk' },
  { type: 'home', name: 'Tampines' },
  { type: 'hawker', name: 'Lau Pa Sat', menu: ['satay', 'hokkienmee', 'nasilemak'] },
  { type: 'erp', name: 'ERP gantry' },
  { type: 'mrt', name: 'Raffles Place MRT' },
  { type: 'card', name: 'Kopitiam talk' },
  { type: 'hawker', name: 'Maxwell', menu: ['chickenrice', 'ckt', 'carrotcake'] },
  { type: 'angbao', name: 'Ang bao' },
  { type: 'rain', name: 'Heavy rain' },
  { type: 'home', name: 'Jurong' },
  { type: 'card', name: 'Kopitiam talk' },
  { type: 'hawker', name: 'Tiong Bahru', menu: ['chickenrice', 'laksa', 'nasilemak'] },
  { type: 'mrt', name: 'Buona Vista MRT' },
  { type: 'erp', name: 'ERP gantry' },
  { type: 'hawker', name: 'Tekka', menu: ['prata', 'nasilemak', 'ckt'] },
  { type: 'angbao', name: 'Ang bao' },
  { type: 'erp', name: 'ERP gantry' },
];
export const HOMES = [0, 8, 16, 24];

export const CARDS = [
  { id: 'angbao', text: 'Auntie gives you an ang bao! +$3' },
  { id: 'change', text: 'Forgot to take your change… −$2' },
  { id: 'grab', text: 'Grab ride! Move forward 3' },
  { id: 'wrongbus', text: 'Took the wrong bus. Go back 2' },
  { id: 'treat', text: 'Uncle belanja! Your next dish is free' },
  { id: 'bojio', text: 'Bojio! Everyone else pays you $1' },
  { id: 'queue', text: 'Long queue at the stall. Miss your next turn' },
  { id: 'payday', text: 'Bonus came in! +$4' },
];

function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
}
function shuffle(a, rand) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Can the list be bought somewhere? Every dish is sold at two or more hawker centres. */
export const sellers = (dish) => SQUARES.map((q, i) => (q.menu && q.menu.includes(dish) ? i : -1)).filter((i) => i >= 0);

/**
 * players: [{ name, cpu }] (2–4). Homes go to opposite corners for 2 players.
 */
export function newGame({ players = [{ name: 'You' }, { name: 'CPU', cpu: true }], seed = Date.now() } = {}) {
  const rand = rng(seed);
  const n = Math.max(2, Math.min(4, players.length));
  const homeOrder = n === 2 ? [0, 16] : n === 3 ? [0, 8, 16] : [0, 8, 16, 24];
  const dishKeys = Object.keys(DISHES);
  return {
    rand,
    players: players.slice(0, n).map((p, i) => ({
      name: (p.name || `Player ${i + 1}`).trim() || `Player ${i + 1}`,
      cpu: !!p.cpu,
      color: PLAYER_COLORS[i],
      home: homeOrder[i],
      pos: homeOrder[i],
      money: START_MONEY + SEAT_BONUS[n][i],
      list: shuffle(dishKeys, rand).slice(0, LIST_SIZE),
      got: [],
      skip: false,
      treat: false,
      laps: 0,
    })),
    turn: 0,
    phase: 'roll', // roll → (choose) → resolved → next … → over
    roll: 0,
    path: [],
    options: [],
    deck: shuffle(CARDS.map((c) => c.id), rand),
    lastCard: null,
    winner: null,
    turns: 0,
  };
}

export const current = (s) => s.players[s.turn];
export const needs = (p) => p.list.filter((d) => !p.got.includes(d));
export const complete = (p) => needs(p).length === 0;

/** Dishes a player would buy at square i right now. */
export function buyable(p, i) {
  const q = SQUARES[i];
  if (!q.menu) return [];
  let money = p.money, treat = p.treat;
  const out = [];
  for (const d of q.menu) {
    if (!needs(p).includes(d)) continue;
    if (treat) { out.push(d); treat = false; continue; }
    if (money >= DISHES[d].price) { out.push(d); money -= DISHES[d].price; }
  }
  return out;
}
/** Would stopping at square i be useful for player p? */
export const canStop = (p, i) => (i === p.home && complete(p)) || buyable(p, i).length > 0;

/** Roll the die. Returns { roll, path, options } — options are squares on the way where you may stop early. */
export function roll(s, forced = null) {
  if (s.phase !== 'roll') return null;
  const p = current(s);
  const r = forced || 1 + Math.floor(s.rand() * 6);
  s.roll = r;
  s.path = Array.from({ length: r }, (_, k) => (p.pos + k + 1) % N);
  s.options = s.path.slice(0, -1).filter((i) => canStop(p, i));
  s.phase = s.options.length ? 'choose' : 'move';
  return { roll: r, path: s.path, options: s.options };
}

function pay(p, amt) { const v = Math.min(p.money, amt); p.money -= v; return v; }

/** Step the token from its square to `target`, collecting payday when passing home. */
function walk(s, p, steps, ev) {
  for (let k = 0; k < steps; k++) {
    p.pos = (p.pos + 1) % N;
    if (p.pos === p.home && k < steps - 1) { p.money += PAYDAY; p.laps += 1; ev.push({ type: 'payday', p: s.turn, amount: PAYDAY, at: p.pos }); }
  }
}

/** Move after a roll: stopAt is a square index from options, or null to go the full distance. Returns events. */
export function move(s, stopAt = null) {
  if (s.phase !== 'choose' && s.phase !== 'move') return [];
  const p = current(s);
  const target = stopAt != null && s.options.includes(stopAt) ? stopAt : s.path[s.path.length - 1];
  const steps = (target - p.pos + N) % N || N;
  const ev = [{ type: 'move', p: s.turn, from: p.pos, to: target, steps, stopped: target !== s.path[s.path.length - 1] }];
  walk(s, p, steps, ev);
  land(s, p, ev);
  if (s.phase !== 'over') s.phase = 'resolved';
  return ev;
}

function land(s, p, ev) {
  const i = p.pos, q = SQUARES[i], who = s.turn;
  if (q.type === 'home') {
    if (i === p.home) {
      p.money += PAYDAY; p.laps += 1;
      ev.push({ type: 'payday', p: who, amount: PAYDAY, at: i, landed: true });
      if (complete(p)) { s.winner = who; s.phase = 'over'; ev.push({ type: 'win', p: who }); }
    } else ev.push({ type: 'visit', p: who, at: i });
  } else if (q.type === 'hawker') {
    const items = buyable(p, i);
    if (!items.length) {
      const wanted = q.menu.filter((d) => needs(p).includes(d));
      ev.push({ type: wanted.length ? 'broke' : 'nothing', p: who, at: i, wanted });
    }
    for (const d of items) {
      const free = p.treat;
      if (free) p.treat = false; else p.money -= DISHES[d].price;
      p.got.push(d);
      ev.push({ type: 'buy', p: who, at: i, dish: d, free, price: free ? 0 : DISHES[d].price, done: complete(p) });
    }
  } else if (q.type === 'angbao') { p.money += 3; ev.push({ type: 'angbao', p: who, at: i, amount: 3 }); }
  else if (q.type === 'erp') { const v = pay(p, 1); ev.push({ type: 'erp', p: who, at: i, amount: v }); }
  else if (q.type === 'rain') { p.skip = true; ev.push({ type: 'rain', p: who, at: i }); }
  else if (q.type === 'mrt') {
    const steps = 8;
    const from = p.pos;
    walk(s, p, steps, ev);
    ev.push({ type: 'mrt', p: who, from, to: p.pos });
    // the train might drop you at your own home… it doesn't: MRT squares are mid-side
  } else if (q.type === 'card') {
    if (!s.deck.length) s.deck = shuffle(CARDS.map((c) => c.id), s.rand);
    const id = s.deck.pop();
    s.lastCard = id;
    const card = CARDS.find((c) => c.id === id);
    ev.push({ type: 'card', p: who, at: i, card: id, text: card.text });
    if (id === 'angbao') p.money += 3;
    else if (id === 'payday') p.money += 4;
    else if (id === 'change') pay(p, 2);
    else if (id === 'treat') p.treat = true;
    else if (id === 'queue') p.skip = true;
    else if (id === 'bojio') s.players.forEach((o, k) => { if (k !== who) p.money += pay(o, 1); });
    else if (id === 'grab' || id === 'wrongbus') {
      if (id === 'grab') { walk(s, p, 3, ev); ev.push({ type: 'hop', p: who, to: p.pos, by: 3 }); }
      else { p.pos = (p.pos - 2 + N) % N; ev.push({ type: 'hop', p: who, to: p.pos, by: -2 }); }
      // landing again after the hop (but no chained cards)
      const q2 = SQUARES[p.pos];
      if (q2.type !== 'card' && q2.type !== 'mrt') land(s, p, ev);
    }
  }
}

/** Pass the turn on. Players who must miss a turn are skipped (returns their indexes). */
export function nextTurn(s) {
  if (s.phase === 'over') return [];
  const skipped = [];
  s.turns += 1;
  for (let k = 0; k < s.players.length; k++) {
    s.turn = (s.turn + 1) % s.players.length;
    const p = current(s);
    if (p.skip) { p.skip = false; skipped.push(s.turn); continue; }
    break;
  }
  s.phase = 'roll';
  s.roll = 0; s.path = []; s.options = [];
  return skipped;
}

/** CPU decision: stop where it's useful, preferring home when the list is done. */
export function cpuChoice(s) {
  const p = current(s);
  if (!s.options.length) return null;
  if (complete(p) && s.options.includes(p.home)) return p.home;
  // stop at the first useful hawker on the way (a sure thing beats a gamble)
  return s.options[0];
}

/** How far is a player from winning, roughly (for the standings). */
export function progress(p) { return p.got.length / LIST_SIZE; }
