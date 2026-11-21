// Kopi Master — pure rules. No DOM, shared by the 2D and 3D builds.
//
// Customers queue at a kopitiam drinks stall and order in kopitiam lingo. You build each drink by
// tapping ingredients into the cup, then serve it. The lingo maps onto the recipe:
//   Kopi / Teh / Milo            base (Yuan Yang = kopi + teh)
//   (plain) / C / O              condensed milk / evaporated milk / no milk
//   siew dai / (normal) / ka dai / kosong   1 / 2 / 3 / 0 spoons of sugar
//   gau / po                     double shot / add hot water
//   peng                         add ice
//   tarik                        pull the teh (teh tarik)
//   tapau / da bao               takeaway bag
//   Milo Dinosaur                Milo peng with an extra scoop of Milo on top

export const INGREDIENTS = ['kopi', 'teh', 'milo', 'condensed', 'evaporated', 'sugar', 'ice', 'water', 'tarik', 'bag'];
export const ING_LABEL = {
  kopi: 'Kopi', teh: 'Teh', milo: 'Milo', condensed: 'Condensed milk', evaporated: 'Evaporated milk',
  sugar: 'Sugar', ice: 'Ice', water: 'Hot water', tarik: 'Tarik (pull)', bag: 'Tapau bag',
};
export const MAX_COUNT = { kopi: 2, teh: 2, milo: 2, condensed: 1, evaporated: 1, sugar: 4, ice: 1, water: 1, tarik: 1, bag: 1 };

export const SHIFTS = {
  breakfast: {
    id: 'breakfast', name: 'Breakfast', level: 'Easy', time: 90, patience: 24, queue: 2, gap: [5, 8],
    features: ['milk', 'sugar', 'peng'], bases: ['kopi', 'teh'], stars: [10, 18, 26],
    blurb: 'Kopi, teh, O and C, sugar and peng.',
  },
  lunch: {
    id: 'lunch', name: 'Lunch rush', level: 'Medium', time: 100, patience: 20, queue: 3, gap: [4, 7],
    features: ['milk', 'sugar', 'peng', 'gau', 'po', 'tapau'], bases: ['kopi', 'teh', 'milo'], stars: [14, 26, 38],
    blurb: 'Adds Milo, gau, po and tapau.',
  },
  supper: {
    id: 'supper', name: 'Supper crowd', level: 'Hard', time: 110, patience: 17, queue: 3, gap: [3.5, 6],
    features: ['milk', 'sugar', 'peng', 'gau', 'po', 'tapau', 'special'], bases: ['kopi', 'teh', 'milo'], stars: [18, 32, 46],
    blurb: 'Adds teh tarik, yuan yang and Milo Dinosaur.',
  },
  endless: {
    id: 'endless', name: 'Endless', level: 'Until 3 strikes', time: Infinity, patience: 22, queue: 3, gap: [4.5, 7],
    features: ['milk', 'sugar', 'peng', 'gau', 'po', 'tapau', 'special'], bases: ['kopi', 'teh', 'milo'], stars: [20, 40, 70],
    blurb: 'Everything, faster and faster.',
  },
};

export const CUSTOMERS = ['worker_a', 'worker_b', 'student_a', 'student_b', 'aunty', 'ns', 'parent', 'uncle', 'expecting'];
export const STRIKES = 3;

const PRICE = { kopi: 1.4, teh: 1.4, milo: 1.8, yuanyang: 1.6, tarik: 1.6, dinosaur: 2.8, peng: 0.3, tapau: 0.2 };

// ---------- seeded rng ----------
export function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
}
const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
const blank = () => Object.fromEntries(INGREDIENTS.map((k) => [k, 0]));

/** Make an order: lingo text + the exact recipe it needs. */
export function makeOrder(rand, shift) {
  const f = new Set(shift.features);
  const r = blank();
  let special = null;
  if (f.has('special') && rand() < 0.3) special = pick(rand, ['tarik', 'yuanyang', 'dinosaur']);
  const base = special === 'tarik' ? 'teh' : special === 'dinosaur' ? 'milo' : special === 'yuanyang' ? 'yuanyang' : pick(rand, shift.bases);

  // milk: plain = condensed, C = evaporated, O = none (specials always use condensed)
  let milk = 'plain';
  if (!special && base !== 'milo' && f.has('milk')) { const m = rand(); milk = m < 0.4 ? 'plain' : m < 0.7 ? 'C' : 'O'; }
  // strength
  let strength = '';
  if (!special && base !== 'milo' && f.has('gau') && rand() < 0.22) strength = rand() < 0.5 ? 'gau' : 'po';
  // sugar
  let sugar = 2;
  if (f.has('sugar') && special !== 'dinosaur') {
    const s = rand();
    if (s < 0.25) sugar = 1; else if (s < 0.4) sugar = 3; else if (s < 0.55 && milk !== 'plain') sugar = 0;
  }
  const peng = special === 'dinosaur' ? true : f.has('peng') && special !== 'tarik' && rand() < 0.4;
  const tapau = f.has('tapau') && rand() < 0.2;

  if (base === 'yuanyang') { r.kopi = 1; r.teh = 1; } else r[base] = strength === 'gau' ? 2 : 1;
  if (special === 'dinosaur') r.milo = 2;
  if (milk === 'plain') r.condensed = 1; else if (milk === 'C') r.evaporated = 1;
  if (strength === 'po') r.water = 1;
  r.sugar = sugar;
  if (peng) r.ice = 1;
  if (special === 'tarik') r.tarik = 1;
  if (tapau) r.bag = 1;

  const name = { kopi: 'Kopi', teh: 'Teh', milo: 'Milo', yuanyang: 'Yuan Yang' }[base];
  const words = [];
  if (special === 'tarik') words.push('Teh Tarik');
  else if (special === 'dinosaur') words.push('Milo Dinosaur');
  else words.push(name);
  if (milk !== 'plain') words.push(milk);
  if (strength) words.push(strength);
  if (special !== 'dinosaur') { if (sugar === 1) words.push('siew dai'); else if (sugar === 3) words.push('ka dai'); else if (sugar === 0) words.push('kosong'); }
  if (peng && special !== 'dinosaur') words.push('peng');
  if (tapau) words.push(rand() < 0.5 ? 'tapau' : 'da bao');

  const price = (PRICE[special || base] || 1.4) + (peng && special !== 'dinosaur' ? PRICE.peng : 0) + (tapau ? PRICE.tapau : 0);
  return { text: words.join(' '), recipe: r, base, milk, sugar, strength, peng, tapau, special, price: Math.round(price * 100) / 100 };
}

/** Explain how a drink differs from the order, in auntie-speak. */
export function diff(order, cup) {
  const r = order.recipe;
  const out = [];
  const bases = ['kopi', 'teh', 'milo'];
  if (bases.some((b) => (r[b] > 0) !== (cup[b] > 0))) out.push(`I said ${order.special === 'yuanyang' || order.base === 'yuanyang' ? 'yuan yang (kopi + teh)' : order.base === 'milo' ? 'Milo' : order.base}!`);
  else if (bases.some((b) => r[b] !== cup[b])) out.push(r.kopi === 2 || r.teh === 2 ? 'Gau means double shot leh.' : r.milo === 2 ? 'Dinosaur needs extra Milo on top!' : 'Too strong lah, just one shot.');
  if (r.condensed !== cup.condensed || r.evaporated !== cup.evaporated) {
    out.push(order.milk === 'O' ? 'O means no milk!' : order.milk === 'C' ? 'C means evaporated milk.' : 'Plain kopi/teh got condensed milk one.');
  }
  if (r.sugar !== cup.sugar) out.push(r.sugar === 0 ? 'Kosong means no sugar!' : `${{ 1: 'Siew dai (1 sugar)', 2: 'Normal (2 sugar)', 3: 'Ka dai (3 sugar)' }[r.sugar]}, you gave ${cup.sugar}.`);
  if (r.ice !== cup.ice) out.push(r.ice ? 'Peng means got ice!' : 'I want hot, not peng!');
  if (r.water !== cup.water) out.push(r.water ? 'Po means add hot water.' : 'Why so diluted?');
  if (r.tarik !== cup.tarik) out.push(r.tarik ? 'Teh tarik must pull one!' : 'No need to tarik.');
  if (r.bag !== cup.bag) out.push(r.bag ? 'Tapau leh, I take away!' : 'I drink here, no need bag.');
  return out;
}

export const matches = (order, cup) => INGREDIENTS.every((k) => order.recipe[k] === cup[k]);

// ---------- game ----------
export function newGame(shiftId = 'breakfast', seed = Date.now()) {
  const shift = SHIFTS[shiftId] || SHIFTS.breakfast;
  return {
    v: 1, shift: shift.id, seed, rand: null,
    t: 0, timeLeft: shift.time, phase: 'play',
    counter: [], // up to shift.queue customers: { id, who, order, patience, max }
    nextSpawn: 1.2, nextId: 1, selected: null,
    cup: blank(),
    earnings: 0, served: 0, strikes: 0, streak: 0, bestStreak: 0,
    log: [],
  };
}
export const shiftOf = (s) => SHIFTS[s.shift];
const R = new WeakMap();
const rngOf = (s) => { if (!R.has(s)) R.set(s, rng(s.seed)); return R.get(s); };

/** Advance time. Returns events: spawn / leave / over. */
export function tick(s, dt) {
  if (s.phase !== 'play') return [];
  const shift = shiftOf(s);
  const rand = rngOf(s);
  const ev = [];
  s.t += dt;
  if (Number.isFinite(s.timeLeft)) s.timeLeft = Math.max(0, s.timeLeft - dt);
  // endless speeds up over time
  const speed = shift.id === 'endless' ? 1 + Math.min(1.2, s.t / 150) : 1;
  for (const c of s.counter.slice()) {
    c.patience -= dt * speed;
    if (c.patience <= 0) {
      s.counter.splice(s.counter.indexOf(c), 1);
      s.strikes += 1;
      s.streak = 0;
      ev.push({ type: 'leave', customer: c });
      if (s.selected === c.id) s.selected = s.counter[0] ? s.counter[0].id : null;
    }
  }
  s.nextSpawn -= dt * speed;
  const open = s.timeLeft > 0;
  if (open && s.nextSpawn <= 0 && s.counter.length < shift.queue) {
    const order = makeOrder(rand, shift);
    const max = shift.patience + order.text.split(' ').length * 1.2;
    const c = { id: s.nextId++, who: pick(rand, CUSTOMERS), order, patience: max, max };
    s.counter.push(c);
    if (s.selected == null) s.selected = c.id;
    s.nextSpawn = shift.gap[0] + rand() * (shift.gap[1] - shift.gap[0]);
    ev.push({ type: 'spawn', customer: c });
  }
  if (s.strikes >= STRIKES) { s.phase = 'over'; s.fired = true; ev.push({ type: 'over' }); }
  else if (!open && s.counter.length === 0) { s.phase = 'over'; ev.push({ type: 'over' }); }
  return ev;
}

export function add(s, ing) {
  if (s.phase !== 'play') return false;
  if (s.cup[ing] >= MAX_COUNT[ing]) return false;
  s.cup[ing] += 1;
  return true;
}
export function bin(s) { s.cup = blank(); }
export const cupEmpty = (s) => INGREDIENTS.every((k) => !s.cup[k]);

export function select(s, id) { if (s.counter.some((c) => c.id === id)) s.selected = id; }

/** Serve the cup to the selected customer. */
export function serve(s) {
  const c = s.counter.find((x) => x.id === s.selected) || s.counter[0];
  if (!c || cupEmpty(s)) return { ok: false, reason: c ? 'The cup is empty!' : 'Nobody is waiting.' };
  const good = matches(c.order, s.cup);
  const cup = s.cup;
  s.cup = blank();
  s.counter.splice(s.counter.indexOf(c), 1);
  s.selected = s.counter[0] ? s.counter.slice().sort((a, b) => a.patience - b.patience)[0].id : null;
  if (!good) {
    s.strikes += 1;
    s.streak = 0;
    if (s.strikes >= STRIKES) { s.phase = 'over'; s.fired = true; }
    return { ok: true, good: false, customer: c, cup, why: diff(c.order, cup) };
  }
  const frac = c.patience / c.max;
  const tip = Math.round(frac * 0.5 * 10) / 10 + (s.streak >= 4 ? 0.2 : 0);
  s.streak += 1;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  s.served += 1;
  s.earnings = Math.round((s.earnings + c.order.price + tip) * 100) / 100;
  return { ok: true, good: true, customer: c, cup, price: c.order.price, tip: Math.round(tip * 100) / 100 };
}

export function stars(s) {
  const [a, b, c] = shiftOf(s).stars;
  if (s.fired && shiftOf(s).id !== 'endless') return s.earnings >= a ? 1 : 0;
  return s.earnings >= c ? 3 : s.earnings >= b ? 2 : s.earnings >= a ? 1 : 0;
}

export const GLOSSARY = [
  ['Kopi', 'Coffee, with condensed milk'],
  ['Teh', 'Tea, with condensed milk'],
  ['O', 'No milk (black)'],
  ['C', 'Evaporated milk instead'],
  ['Siew dai', 'Less sweet: 1 sugar'],
  ['(normal)', '2 sugar'],
  ['Ka dai', 'More sweet: 3 sugar'],
  ['Kosong', 'No sugar'],
  ['Peng', 'Iced: add ice'],
  ['Gau', 'Strong: double shot'],
  ['Po', 'Weak: add hot water'],
  ['Tapau / da bao', 'Takeaway: bag it'],
  ['Teh Tarik', 'Teh, then pull it'],
  ['Yuan Yang', 'Kopi + teh together'],
  ['Milo Dinosaur', 'Milo peng + extra Milo on top'],
];
