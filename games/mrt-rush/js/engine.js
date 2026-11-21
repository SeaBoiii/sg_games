// MRT Rush — pure rules. No DOM, shared by the 2D and 3D builds.
//
// A carriage is a grid: seats along both walls, priority seats at the ends, doors on both sides.
// At each station the platform is on one side. Riders whose stop it is walk out through that
// side's doors, then the doors stay open for a few seconds while you fit the waiting commuters in.
// Commuters must be able to walk in from the open door (fill from the inside out), bags and
// trolleys can't go on seats, and the doors must be clear when they close.

export const COLS = 12;
export const ROWS = 5;
export const DOOR_COLS = [2, 3, 8, 9];
export const PRIORITY_COLS = [0, 1, 10, 11];

export function cellType(r, c) {
  if (r === 0 || r === ROWS - 1) {
    if (DOOR_COLS.includes(c)) return 'door';
    return PRIORITY_COLS.includes(c) ? 'priority' : 'seat';
  }
  return 'stand';
}
export const isSeat = (r, c) => { const t = cellType(r, c); return t === 'seat' || t === 'priority'; };
export const doorRow = (side) => (side === 'top' ? 0 : ROWS - 1);
export const doorCells = (side) => DOOR_COLS.map((c) => [doorRow(side), c]);

// cells: [dr, dc, kind] — kind 'p' (person), 'kid', or an item ('bag', 'trolley', 'pack', 'stroller')
export const TYPES = {
  worker: { name: 'Office worker', short: 'Worker', cells: [[0, 0, 'p']], weight: 6 },
  student: { name: 'Student + backpack', short: 'Student', cells: [[0, 0, 'p'], [0, 1, 'bag']], weight: 4 },
  aunty: { name: 'Auntie + trolley', short: 'Auntie', cells: [[0, 0, 'p'], [0, 1, 'trolley']], weight: 3 },
  ns: { name: 'NS boy + field pack', short: 'NS boy', cells: [[0, 0, 'p'], [1, 0, 'pack']], weight: 2 },
  family: { name: 'Parent, kid + stroller', short: 'Family', cells: [[0, 0, 'p'], [0, 1, 'kid'], [1, 0, 'stroller']], weight: 1.4 },
  uncle: { name: 'Uncle (needs a seat)', short: 'Uncle', cells: [[0, 0, 'p']], priority: true, weight: 1.6 },
  expecting: { name: 'Mum-to-be (needs a seat)', short: 'Mum-to-be', cells: [[0, 0, 'p']], priority: true, weight: 1 },
};
export const PEOPLE = new Set(['p', 'kid']);

export const LINES = {
  kaya: {
    id: 'kaya', name: 'Kaya Line', color: '#7FA82E', level: 'Easy', time: 18, queue: [2, 4],
    mix: { worker: 7, student: 4, aunty: 2, ns: 1, family: 0.5, uncle: 1.5, expecting: 0.6 },
    stations: ['Kopi Hill', 'Kampong Kaya', 'Pandan Gardens', 'Chendol Park', 'Satay Bay', 'Ondeh Quay'],
  },
  teh: {
    id: 'teh', name: 'Teh Line', color: '#C7742E', level: 'Medium', time: 15, queue: [3, 6],
    mix: { worker: 6, student: 4, aunty: 3, ns: 2, family: 1.2, uncle: 1.6, expecting: 1 },
    stations: ['Teh Tarik Central', 'Prata Point', 'Rojak Junction', 'Milo Field', 'Laksa Lane', 'Kueh Town', 'Bukit Bandung', 'Durian Downs'],
  },
  bandung: {
    id: 'bandung', name: 'Bandung Line', color: '#D9578A', level: 'Rush hour', time: 12, queue: [4, 8],
    mix: { worker: 7, student: 4, aunty: 3, ns: 2.5, family: 1.6, uncle: 1.8, expecting: 1.2 },
    stations: ['Bubble Tea Boulevard', 'Chilli Crab Cove', 'Ice Kachang Isle', 'Popiah Place', 'Mee Siam Mall', 'Kaya Toast Terrace', 'Char Siew Square', 'Nasi Lemak North', 'Wanton Wharf', 'Hokkien Mee Heights'],
  },
};

export const SCORE = { board: 10, prioritySeat: 10, seat: 4, cleanExit: 2, timeBonus: 1 };
export const HAPPY = { leftBehind: 4, excuse: 5, doorBlocked: 8, standing: 3 };

// ---------- geometry ----------
export function shapeCells(type, rot) {
  let cells = TYPES[type].cells.map(([r, c, k]) => [r, c, k]);
  for (let i = 0; i < ((rot % 4) + 4) % 4; i++) cells = cells.map(([r, c, k]) => [c, -r, k]);
  return cells;
}

const key = (r, c) => `${r},${c}`;
const inside = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

/** Cells a commuter can walk to from the open doors, through empty cells. */
export function reachable(s, extraPassable = null) {
  const seen = new Set();
  const q = [];
  for (const [r, c] of doorCells(s.side)) {
    if (s.grid[r][c] == null || (extraPassable && extraPassable.has(key(r, c)))) { seen.add(key(r, c)); q.push([r, c]); }
  }
  while (q.length) {
    const [r, c] = q.shift();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc, k = key(nr, nc);
      if (!inside(nr, nc) || seen.has(k)) continue;
      if (s.grid[nr][nc] != null && !(extraPassable && extraPassable.has(k))) continue;
      seen.add(k);
      q.push([nr, nc]);
    }
  }
  return seen;
}

/** Can this commuter stand here? Anchor (r, c) is where the person goes. */
export function canPlace(s, type, rot, r, c, reach = null) {
  const cells = shapeCells(type, rot).map(([dr, dc, k]) => [r + dr, c + dc, k]);
  reach = reach || reachable(s);
  for (const [cr, cc, k] of cells) {
    if (!inside(cr, cc)) return { ok: false, cells, reason: 'Out of the carriage' };
    if (s.grid[cr][cc] != null) return { ok: false, cells, reason: 'Someone is already there' };
    if (!PEOPLE.has(k) && isSeat(cr, cc)) return { ok: false, cells, reason: 'Bags and trolleys can’t go on seats' };
    if (!reach.has(key(cr, cc))) return { ok: false, cells, reason: 'Can’t squeeze past to get there' };
  }
  return { ok: true, cells };
}

// ---------- RNG (seeded so a station's crowd doesn't change on resume) ----------
function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
}
function pickWeighted(rand, mix) {
  const entries = Object.entries(mix).filter(([, w]) => w > 0);
  let t = rand() * entries.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of entries) { if ((t -= w) <= 0) return k; }
  return entries[0][0];
}

// ---------- game ----------
export function newGame(lineId = 'kaya', seed = Date.now()) {
  const line = LINES[lineId] || LINES.kaya;
  return {
    v: 1,
    line: line.id,
    seed,
    station: 0,
    phase: 'arrive', // arrive → board → depart → arrive … → over
    side: 'bottom',
    grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    riders: {},
    queue: [],
    score: 0,
    happy: 100,
    nextId: 1,
    stats: { boarded: 0, left: 0, excuse: 0, delays: 0, prioritySeated: 0, exits: 0 },
    log: [],
  };
}

export const lineOf = (s) => LINES[s.line];
export const isLast = (s) => s.station >= lineOf(s).stations.length - 1;

/** Arrive at the current station: pick the platform side, let riders off, build the queue. */
export function arrive(s) {
  const line = lineOf(s);
  const rand = rng(s.seed + s.station * 7919);
  s.side = s.station === 0 ? 'bottom' : rand() < 0.5 ? 'top' : 'bottom';
  const events = { exits: [], queue: [] };
  // count down on arrival, so a badge reads "1" on the way to that rider's stop
  if (s.station > 0) for (const rd of Object.values(s.riders)) rd.stops -= 1;
  // who gets off? (everyone, at the terminal)
  const leaving = Object.values(s.riders).filter((rd) => rd.stops <= 0 || isLast(s));
  // riders nearest the door first, so a clear path opens for the ones behind
  const dist = (rd) => Math.min(...rd.cells.map(([r]) => Math.abs(r - doorRow(s.side))));
  leaving.sort((a, b) => dist(a) - dist(b));
  for (const rd of leaving) {
    const own = new Set(rd.cells.map(([r, c]) => key(r, c)));
    const reach = reachable(s, own);
    const clean = rd.cells.some(([r, c]) => reach.has(key(r, c)));
    for (const [r, c] of rd.cells) s.grid[r][c] = null;
    delete s.riders[rd.id];
    if (clean) { s.score += SCORE.cleanExit; s.stats.exits++; }
    else { s.happy -= HAPPY.excuse; s.stats.excuse++; }
    events.exits.push({ rider: rd, clean });
  }
  if (isLast(s)) {
    s.phase = 'over';
    s.queue = [];
    return events;
  }
  const [lo, hi] = line.queue;
  const ramp = Math.round((s.station / line.stations.length) * 1.5); // busier further down the line
  const n = Math.min(hi + 1, lo + Math.floor(rand() * (hi - lo + 1)) + ramp);
  const remaining = line.stations.length - 1 - s.station;
  s.queue = Array.from({ length: n }, () => ({
    id: s.nextId++,
    type: pickWeighted(rand, line.mix),
    stops: 1 + Math.floor(rand() * Math.min(4, remaining)),
  }));
  events.queue = s.queue.slice();
  s.phase = s.happy <= 0 ? 'over' : 'board';
  return events;
}

/** Board one commuter from the queue. */
export function board(s, queueId, rot, r, c) {
  const qi = s.queue.findIndex((q) => q.id === queueId);
  if (qi < 0) return { ok: false, reason: 'Not on the platform' };
  const q = s.queue[qi];
  const res = canPlace(s, q.type, rot, r, c);
  if (!res.ok) return res;
  const rider = { id: q.id, type: q.type, rot, stops: q.stops, cells: res.cells.map(([cr, cc, k]) => [cr, cc, k]) };
  for (const [cr, cc] of rider.cells) s.grid[cr][cc] = rider.id;
  s.riders[rider.id] = rider;
  s.queue.splice(qi, 1);
  let points = SCORE.board;
  let seat = null;
  if (TYPES[q.type].priority) {
    const [pr, pc] = rider.cells[0];
    const t = cellType(pr, pc);
    if (t === 'priority') { points += SCORE.prioritySeat; seat = 'priority'; s.stats.prioritySeated++; }
    else if (t === 'seat') { points += SCORE.seat; seat = 'seat'; }
  }
  s.score += points;
  s.stats.boarded++;
  return { ok: true, rider, points, seat };
}

/** Close the doors and leave the station. */
export function closeDoors(s, timeLeft = 0) {
  const ev = { left: s.queue.length, blocked: 0, standing: 0, bonus: 0 };
  if (ev.left) { s.happy -= ev.left * HAPPY.leftBehind; s.stats.left += ev.left; }
  ev.blocked = doorCells(s.side).filter(([r, c]) => s.grid[r][c] != null).length ? 1 : 0;
  if (ev.blocked) { s.happy -= HAPPY.doorBlocked; s.stats.delays++; }
  for (const rd of Object.values(s.riders)) {
    if (!TYPES[rd.type].priority) continue;
    const [r, c] = rd.cells[0];
    if (!isSeat(r, c)) { ev.standing++; s.happy -= HAPPY.standing; }
  }
  if (!ev.left && timeLeft > 0) { ev.bonus = Math.round(timeLeft) * SCORE.timeBonus; s.score += ev.bonus; }
  s.happy = Math.max(0, s.happy);
  s.queue = [];
  s.station += 1;
  s.phase = s.happy <= 0 ? 'over' : 'arrive';
  return ev;
}

export function stars(s) {
  if (!finished(s)) return 0;
  return s.happy >= 85 ? 3 : s.happy >= 60 ? 2 : 1;
}
export const finished = (s) => s.phase === 'over' && s.happy > 0;
