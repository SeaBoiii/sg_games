// Pasar Malam Haggle — pure rules. No DOM, shared by the 2D and 3D builds.
//
// Walk down a row of night-market stalls with a shopping list and a budget. Every stallholder has
// an asking price, a hidden lowest price and a patience meter. Make offers, take their price, or walk
// away (some will call you back with a "last price"). Lowball too hard and they'll stop talking to you.

export const ITEMS = {
  lights: { name: 'LED fairy lights', ask: 12 },
  case: { name: 'Phone case', ask: 15 },
  slippers: { name: 'Slippers', ask: 9 },
  shades: { name: 'Sunglasses', ask: 18 },
  tee: { name: 'Graphic tee', ask: 20 },
  slicer: { name: 'Magic veggie slicer', ask: 25 },
  drone: { name: 'Toy drone', ask: 38 },
  basket: { name: 'Rattan basket', ask: 22 },
  bubbles: { name: 'Bubble wand', ask: 6 },
  power: { name: 'Power bank', ask: 28 },
  scarf: { name: 'Batik scarf', ask: 24 },
  plant: { name: 'Bonsai plant', ask: 32 },
};

// how each stallholder haggles
export const SELLERS = {
  uncle: { name: 'Uncle Seng', who: 'uncle', patience: 5, floor: [0.55, 0.65], concede: 0.45, stubborn: 0.45, lowball: 0.7, callback: 0.8, markup: 1.0,
    lines: { hello: 'Come come, take a look!', counter: ['Aiyo, cannot lah. How about {p}?', 'Uncle also need to eat leh. {p} can?', 'Okay okay, {p} for you.'], insult: 'Wah, you want uncle to close shop ah?', deal: 'Okay deal! Enjoy ah.', last: 'Last price, {p}. Really cannot lower already.', angry: "Don't want sell you liao!" } },
  auntie: { name: 'Auntie Mei', who: 'aunty', patience: 3, floor: [0.7, 0.8], concede: 0.25, stubborn: 0.7, lowball: 0.8, callback: 0.45, markup: 1.05,
    lines: { hello: 'Very good quality one! Very cheap already.', counter: ['{p}. This one where got so cheap?', 'Cannot! {p} still okay.', 'You think I mad ah? {p}.'], insult: 'Walao, so cheapskate one!', deal: 'Hmph. Okay lor. Next!', last: 'Fine, {p}. Last last price!', angry: 'Go go go, next customer!' } },
  boy: { name: 'Ah Boy', who: 'student_a', patience: 4, floor: [0.6, 0.72], concede: 0.5, stubborn: 0.4, lowball: 0.65, callback: 0.6, markup: 1.0,
    lines: { hello: 'Bro, steady price one, check it out.', counter: ['Hmm, {p} can or not?', 'Bro, {p} lah, very fair.', 'Okay {p}, chill.'], insult: 'Bro... you serious?', deal: 'Shiok, deal!', last: 'Okay bro, {p}, last one.', angry: 'Nah bro, cannot already.' } },
  makcik: { name: 'Makcik Siti', who: 'expecting', patience: 4, floor: [0.62, 0.72], concede: 0.35, stubborn: 0.55, lowball: 0.72, callback: 0.65, markup: 1.0,
    lines: { hello: 'Adik, this one nice, very popular!', counter: ['Aiyo adik, {p} okay?', 'Cannot so low lah, {p}.', 'For you, {p}.'], insult: 'Adik, you joking with makcik ah?', deal: 'Okay, terima kasih!', last: 'Last price {p}, okay?', angry: 'Sorry adik, cannot already.' } },
  gadget: { name: 'Gadget Bro', who: 'worker_a', patience: 4, floor: [0.42, 0.55], concede: 0.3, stubborn: 0.6, lowball: 0.6, callback: 0.55, markup: 1.45,
    lines: { hello: 'Latest model! Tourist price… I mean, special price!', counter: ['Wah, {p} already very cheap.', 'Original price higher one, {p}.', 'Okay boss, {p}.'], insult: 'Boss, cost price also cannot!', deal: 'Okay boss, deal!', last: 'Boss, {p}, final final.', angry: 'Aiya, you go other stall lah.' } },
};

export const NIGHTS = {
  1: { id: 1, name: 'Night 1', level: 'Easy', stalls: 4, budgetK: 0.82, sellers: ['uncle', 'boy', 'makcik', 'uncle'], stars: [0.12, 0.22, 0.3], blurb: 'Friendly stallholders, roomy budget.' },
  2: { id: 2, name: 'Night 2', level: 'Medium', stalls: 5, budgetK: 0.75, sellers: ['auntie', 'boy', 'makcik', 'uncle', 'auntie'], stars: [0.12, 0.2, 0.26], blurb: 'Kiasu aunties join the market.' },
  3: { id: 3, name: 'Night 3', level: 'Hard', stalls: 6, budgetK: 0.68, sellers: ['gadget', 'auntie', 'makcik', 'gadget', 'boy', 'auntie'], stars: [0.15, 0.25, 0.32], blurb: 'Tourist prices and a tight budget.' },
};

const round50 = (n) => Math.round(n * 2) / 2;

export function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
}
const shuffle = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/** Build a night: stalls with items, sellers, asks and hidden floors. */
export function newGame(nightId = 1, { players = 1, names = ['You', 'Player 2'], seed = Date.now() } = {}) {
  const night = NIGHTS[nightId] || NIGHTS[1];
  const r = rng(seed);
  const items = shuffle(Object.keys(ITEMS), r).slice(0, night.stalls);
  const sellers = shuffle(night.sellers, r);
  const stalls = items.map((it, i) => {
    const sk = sellers[i % sellers.length];
    const S = SELLERS[sk];
    const ask = round50(ITEMS[it].ask * S.markup * (0.95 + r() * 0.15));
    const floor = Math.max(1, round50(ask * (S.floor[0] + r() * (S.floor[1] - S.floor[0]))));
    return { item: it, seller: sk, ask, floor };
  });
  const totalAsk = stalls.reduce((a, s) => a + s.ask, 0);
  const budget = round50(totalAsk * night.budgetK);
  return {
    v: 1, night: night.id, seed, players,
    names: names.slice(0, players).map((n, i) => String(n || '').trim() || ['You', 'Player 2'][i]),
    stalls, budget,
    stallIdx: 0, turn: 0,
    wallets: Array.from({ length: players }, () => ({ spent: 0, bought: [], missed: [] })),
    h: null, // the haggle in progress
    phase: 'walk', // walk → haggle → (next stall) … → over
    rseed: Math.floor(r() * 1e9),
  };
}

export const nightOf = (s) => NIGHTS[s.night];
export const stallOf = (s) => s.stalls[s.stallIdx];
export const sellerOf = (s) => SELLERS[stallOf(s).seller];
export const moneyLeft = (s, p = s.turn) => round50(s.budget - s.wallets[p].spent);

const R = new WeakMap();
const rand = (s) => { if (!R.has(s)) R.set(s, rng(s.rseed + s.stallIdx * 101 + s.turn * 13)); return R.get(s)(); };
const fill = (t, p) => t.replace('{p}', `$${p.toFixed(2)}`);

/** Start haggling at the current stall for the current player. */
export function startHaggle(s) {
  const st = stallOf(s), S = SELLERS[st.seller];
  R.delete(s);
  s.h = { cur: st.ask, patience: S.patience, max: S.patience, offers: [], mood: 'happy', line: S.lines.hello, last: null, done: false };
  s.phase = 'haggle';
  return s.h;
}

/** Make an offer. Returns { result: 'deal'|'counter'|'insult'|'angry', price? } */
export function offer(s, amount) {
  const h = s.h, st = stallOf(s), S = SELLERS[st.seller];
  amount = round50(Math.max(0.5, Math.min(amount, moneyLeft(s))));
  h.offers.push(amount);
  if (amount >= h.cur) return deal(s, h.cur);
  if (h.last != null && amount >= h.last) return deal(s, h.last);
  if (h.last != null && h.patience <= 0) return walkOff(s); // pushed past the last price
  if (amount < st.floor * S.lowball) {
    h.patience -= 2;
    h.mood = 'cross';
    h.line = S.lines.insult;
    h.cur = Math.max(st.floor, round50(h.cur - (h.cur - st.floor) * 0.05));
    if (h.patience <= 0) return walkOff(s);
    return { result: 'insult' };
  }
  // as patience runs low, they'll settle closer to their floor
  const target = st.floor + (h.cur - st.floor) * S.stubborn * (h.patience / h.max);
  if (amount >= st.floor && amount >= target) return deal(s, amount);
  h.patience -= 1;
  if (h.patience <= 0) {
    // one last chance before they give up
    h.last = Math.max(st.floor, round50(st.floor + (h.cur - st.floor) * 0.3));
    h.cur = h.last;
    h.mood = 'cross';
    h.line = fill(S.lines.last, h.last);
    return { result: 'last', price: h.last };
  }
  const next = Math.max(st.floor, round50(h.cur - (h.cur - Math.max(amount, st.floor)) * (S.concede + rand(s) * 0.15)));
  h.cur = next < h.cur ? next : Math.max(st.floor, round50(h.cur - 0.5));
  h.mood = h.patience / h.max > 0.5 ? 'ok' : 'cross';
  const lines = S.lines.counter;
  h.line = fill(lines[Math.min(lines.length - 1, h.max - h.patience - 1)] || lines[0], h.cur);
  return { result: 'counter', price: h.cur };
}

/** Take the stallholder's current price. */
export const accept = (s) => deal(s, s.h.last != null ? s.h.last : s.h.cur);

function deal(s, price) {
  const h = s.h, st = stallOf(s), S = SELLERS[st.seller];
  if (price > moneyLeft(s)) {
    h.line = `Not enough money leh! You only have $${moneyLeft(s).toFixed(2)}.`;
    return { result: 'broke' };
  }
  h.done = true;
  h.mood = 'happy';
  h.line = S.lines.deal;
  const w = s.wallets[s.turn];
  w.spent = round50(w.spent + price);
  w.bought.push({ item: st.item, paid: price, ask: st.ask, floor: st.floor, seller: st.seller });
  return { result: 'deal', price, saved: round50(st.ask - price), perfect: price <= st.floor };
}

function walkOff(s) {
  const h = s.h, st = stallOf(s), S = SELLERS[st.seller];
  h.done = true;
  h.mood = 'cross';
  h.line = S.lines.angry;
  s.wallets[s.turn].missed.push({ item: st.item, ask: st.ask, seller: st.seller });
  return { result: 'angry' };
}

/** Walk away: they might call you back with a last price (accept it with accept()). */
export function walkAway(s) {
  const h = s.h, st = stallOf(s), S = SELLERS[st.seller];
  if (h.last == null && h.patience > 0 && rand(s) < S.callback * (0.4 + 0.6 * (h.patience / h.max))) {
    h.last = Math.max(st.floor, round50(st.floor + (h.cur - st.floor) * 0.25));
    h.cur = h.last;
    h.mood = 'ok';
    h.line = fill(`Eh wait wait! ${S.lines.last}`, h.last);
    return { result: 'callback', price: h.last };
  }
  h.done = true;
  h.mood = 'ok';
  h.line = 'Okay lor, see you next time.';
  s.wallets[s.turn].missed.push({ item: st.item, ask: st.ask, seller: st.seller });
  return { result: 'left' };
}

/** After a haggle ends: next player at this stall, or the next stall, or the end of the night. */
export function next(s) {
  s.h = null;
  if (s.turn < s.players - 1) { s.turn += 1; s.phase = 'walk'; return 'player'; }
  s.turn = 0;
  s.stallIdx += 1;
  if (s.stallIdx >= s.stalls.length) { s.phase = 'over'; return 'over'; }
  s.phase = 'walk';
  return 'stall';
}

export function summary(s, p) {
  const w = s.wallets[p];
  const ask = w.bought.reduce((a, b) => a + b.ask, 0);
  const saved = round50(w.bought.reduce((a, b) => a + (b.ask - b.paid), 0));
  const pct = ask ? saved / ask : 0;
  const all = s.stalls.length;
  const got = w.bought.length;
  const [a, b, c] = nightOf(s).stars;
  let stars = 0;
  if (got >= Math.ceil(all / 2)) stars = 1;
  if (got >= all - 1 && pct >= b) stars = 2;
  if (got === all && pct >= c) stars = 3;
  if (got === all && pct >= a && stars < 2) stars = Math.max(stars, 1);
  // score: savings plus a bonus per item on the list
  const score = Math.round(saved * 10 + got * 20);
  return { saved, pct, got, all, stars, score, spent: w.spent, left: round50(s.budget - w.spent) };
}
