// Marina Mini Golf — pure rules + physics (no DOM). Shared by the 2D and 3D builds.
// World units: every hole sits inside a 100 × 62 box, y pointing "down" the screen.

export const W = 100, H = 62;
export const BALL_R = 1.1;
export const CUP_R = 1.9;
export const VMAX = 92;          // ball speed at full power (units / s)
const DT = 1 / 240;              // fixed physics step (identical in 2D and 3D)
const ROLL = 17;                 // rolling resistance (units / s²)
const SAND = 75;
const DRAG = 0.55;               // speed-proportional drag (1 / s)
const WALL_E = 0.74;             // wall bounciness
const SINK_SPEED = 44;           // faster than this and the ball lips out
export const PLAYER_COLORS = ['#E0457B', '#2D6FD1', '#F2B134', '#7A4FC9'];

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const ellipse = (cx, cy, rx, ry, n = 36) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return [+(cx + Math.cos(a) * rx).toFixed(2), +(cy + Math.sin(a) * ry).toFixed(2)];
});

/**
 * Holes, easiest first. Shapes:
 *  outline  closed polygon the ball lives inside
 *  blocks   solid polygons (walls, towers, stalls)
 *  circles  round obstacles; bounce > 1 makes a bumper
 *  zones    sand / water / slope (constant push) / pull (towards a centre)
 *  movers   bar (rotating spokes around a hub) / slider (block sliding to and fro)
 */
export const HOLES = [
  {
    id: 'voiddeck', name: 'Void Deck', place: 'Under Block 123, Toa Payoh', par: 2,
    blurb: 'Weave between the void deck pillars and round the corner.',
    tee: [14, 18], cup: [80, 45],
    outline: [[6, 8], [94, 8], [94, 54], [66, 54], [66, 28], [6, 28]],
    blocks: [],
    circles: [
      { x: 34, y: 14, r: 2.6, kind: 'pillar' },
      { x: 48, y: 22, r: 2.6, kind: 'pillar' },
      { x: 62, y: 14, r: 2.6, kind: 'pillar' },
    ],
    zones: [],
    movers: [],
  },
  {
    id: 'merlion', name: 'Merlion Park', place: 'Marina Bay', par: 3,
    blurb: 'Cross the little bridge. Mind the Merlion spray, it pushes you towards the water.',
    tee: [14, 31], cup: [86, 31],
    outline: rect(6, 6, 94, 56),
    blocks: [rect(74, 21, 78, 41)],
    circles: [{ x: 50, y: 12, r: 3.6, kind: 'merlion' }],
    zones: [
      { type: 'water', poly: rect(40, 6, 60, 21) },
      { type: 'water', poly: rect(40, 41, 60, 56) },
      { type: 'slope', poly: rect(42, 21, 58, 30), ax: 0, ay: 45, kind: 'spray' },
    ],
    movers: [],
  },
  {
    id: 'esplanade', name: 'Esplanade Domes', place: 'Theatres on the Bay', par: 2,
    blurb: 'The durian domes are bouncy. Bank off them, or bank on them.',
    tee: [14, 31], cup: [86, 31],
    outline: [[10, 8], [90, 8], [94, 12], [94, 50], [90, 54], [10, 54], [6, 50], [6, 12]],
    blocks: [],
    circles: [
      { x: 38, y: 21, r: 7.5, kind: 'dome', bounce: 1.12 },
      { x: 62, y: 41, r: 7.5, kind: 'dome', bounce: 1.12 },
      { x: 54, y: 27, r: 3.6, kind: 'dome', bounce: 1.12 },
    ],
    zones: [],
    movers: [],
  },
  {
    id: 'hawker', name: 'Hawker Centre', place: 'Lau Pa Sat', par: 3,
    blurb: 'Tables, stools and a tray return. Lunch crowd lah, aim carefully.',
    tee: [12, 12], cup: [88, 50],
    outline: rect(6, 6, 94, 56),
    blocks: [rect(40, 50, 56, 56)],
    circles: [
      ...[[28, 20], [28, 42], [47, 31], [66, 20], [66, 42]].flatMap(([x, y]) => [
        { x, y, r: 3.4, kind: 'table' },
        { x: x - 6, y, r: 1.3, kind: 'stool' },
        { x: x + 6, y, r: 1.3, kind: 'stool' },
      ]),
    ],
    zones: [{ type: 'slope', poly: rect(78, 14, 94, 40), ax: 0, ay: 22, kind: 'spill' }],
    movers: [],
  },
  {
    id: 'supertree', name: 'Supertree Grove', place: 'Gardens by the Bay', par: 3,
    blurb: 'Thread through the Supertrees. The bunker by the cup is a trap.',
    tee: [14, 48], cup: [84, 14],
    outline: [[10, 6], [90, 6], [94, 10], [94, 52], [90, 56], [10, 56], [6, 52], [6, 10]],
    blocks: [],
    circles: [
      { x: 30, y: 38, r: 3.4, kind: 'tree' },
      { x: 26, y: 18, r: 3.4, kind: 'tree' },
      { x: 44, y: 24, r: 3.4, kind: 'tree' },
      { x: 56, y: 42, r: 3.4, kind: 'tree' },
      { x: 70, y: 26, r: 3.4, kind: 'tree' },
    ],
    zones: [
      { type: 'sand', poly: [[68, 40], [80, 35], [90, 42], [84, 50], [72, 50]] },
      { type: 'sand', poly: [[72, 8], [80, 8], [78, 15], [72, 15]] },
      { type: 'slope', poly: rect(36, 30, 64, 36), ax: 0, ay: 24, kind: 'hill' },
    ],
    movers: [],
  },
  {
    id: 'mrt', name: 'MRT Crossing', place: 'Bishan Depot', par: 3,
    blurb: 'A train shuttles across the track. Time your putt through the gap.',
    tee: [14, 31], cup: [84, 31],
    outline: rect(6, 10, 94, 52),
    blocks: [],
    circles: [],
    zones: [],
    movers: [{ type: 'slider', x0: 45, x1: 55, h: 22, cy: 31, amp: 7, period: 3.6, phase: 0, kind: 'train' }],
  },
  {
    id: 'mbs', name: 'Marina Bay Sands', place: 'Bayfront', par: 3,
    blurb: 'Slip between the three towers, under the SkyPark. The bay is wet.',
    tee: [14, 46], cup: [84, 20],
    outline: rect(6, 6, 94, 56),
    blocks: [rect(36, 12, 44, 40), rect(48, 12, 56, 40), rect(60, 12, 68, 40)],
    circles: [],
    zones: [{ type: 'water', poly: [[30, 47], [76, 47], [80, 56], [26, 56]] }],
    movers: [],
  },
  {
    id: 'jewel', name: 'Jewel Rain Vortex', place: 'Changi Airport', par: 3,
    blurb: 'The vortex pulls everything into the middle. Curve around it.',
    tee: [12, 31], cup: [88, 31],
    outline: ellipse(50, 31, 44, 25, 40),
    blocks: [],
    circles: [],
    zones: [
      { type: 'pull', circle: [50, 31, 16], strength: 85 },
      { type: 'water', circle: [50, 31, 4.6], kind: 'vortex' },
    ],
    movers: [],
  },
  {
    id: 'flyer', name: 'Singapore Flyer', place: 'Raffles Avenue', par: 3,
    blurb: 'The big wheel guards the way. Wait for a gap between the spokes.',
    tee: [12, 31], cup: [84, 16],
    outline: rect(6, 8, 94, 54),
    blocks: [rect(40, 8, 60, 20), rect(40, 42, 60, 54)],
    circles: [{ x: 50, y: 31, r: 2.4, kind: 'hub' }],
    zones: [
      { type: 'sand', poly: [[74, 26], [92, 26], [92, 36], [78, 36]] },
      { type: 'slope', poly: rect(64, 36, 94, 54), ax: 0, ay: -26, kind: 'ramp' },
    ],
    movers: [{ type: 'bar', cx: 50, cy: 31, len: 10.2, w: 1.6, speed: 1.15, arms: 4, phase: 0.4, kind: 'wheel' }],
  },
];

export const COURSES = [
  { id: 3, name: 'Quick round', holes: 3, blurb: 'Void Deck to Esplanade' },
  { id: 6, name: 'Half course', holes: 6, blurb: 'Up to the MRT Crossing' },
  { id: 9, name: 'Full course', holes: 9, blurb: 'All nine, Merlion to Flyer' },
];

// ---------------- geometry ----------------
const segsOf = (poly) => poly.map((p, i) => [p, poly[(i + 1) % poly.length]]);
function inPoly(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function inZone(z, x, y) {
  if (z.circle) { const [cx, cy, r] = z.circle; return (x - cx) ** 2 + (y - cy) ** 2 < r * r; }
  return inPoly(x, y, z.poly);
}

const _static = new Map();
function staticSegs(h) {
  if (!_static.has(h.id)) _static.set(h.id, [...segsOf(h.outline), ...h.blocks.flatMap(segsOf)]);
  return _static.get(h.id);
}

/** Moving obstacles at time t: capsules {a, b, rad, va(x,y)->velocity}. Also used to draw them. */
export function moverShapes(h, t) {
  const out = [];
  for (const m of h.movers) {
    if (m.type === 'bar') {
      const ang = m.phase + m.speed * t;
      for (let k = 0; k < m.arms; k++) {
        const a = ang + (k * Math.PI * 2) / m.arms;
        out.push({
          kind: m.kind, type: 'bar', angle: a,
          a: [m.cx, m.cy], b: [m.cx + Math.cos(a) * m.len, m.cy + Math.sin(a) * m.len], rad: m.w / 2,
          vel: (x, y) => [-(y - m.cy) * m.speed, (x - m.cx) * m.speed],
        });
      }
    } else if (m.type === 'slider') {
      const w = (Math.PI * 2) / m.period;
      const off = m.amp * Math.sin(m.phase + w * t);
      const vy = m.amp * w * Math.cos(m.phase + w * t);
      const y0 = m.cy - m.h / 2 + off, y1 = m.cy + m.h / 2 + off;
      const box = rect(m.x0, y0, m.x1, y1);
      out.push({ kind: m.kind, type: 'slider', box, y0, y1, segs: segsOf(box), rad: 0, vel: () => [0, vy] });
    }
  }
  return out;
}

function collideSeg(b, a, c, rad, e, vel) {
  const abx = c[0] - a[0], aby = c[1] - a[1];
  const L = abx * abx + aby * aby || 1e-9;
  let u = ((b.x - a[0]) * abx + (b.y - a[1]) * aby) / L;
  u = Math.max(0, Math.min(1, u));
  const qx = a[0] + abx * u, qy = a[1] + aby * u;
  let dx = b.x - qx, dy = b.y - qy;
  const R = BALL_R + rad;
  const d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return 0;
  let d = Math.sqrt(d2);
  if (d < 1e-6) { dx = -aby; dy = abx; d = Math.hypot(dx, dy); }
  const nx = dx / d, ny = dy / d;
  b.x = qx + nx * R; b.y = qy + ny * R;
  const [wx, wy] = vel ? vel(qx, qy) : [0, 0];
  let rx = b.vx - wx, ry = b.vy - wy;
  const vn = rx * nx + ry * ny;
  if (vn < 0) {
    rx -= (1 + e) * vn * nx; ry -= (1 + e) * vn * ny;
    b.vx = rx * 0.985 + wx; b.vy = ry * 0.985 + wy;
    return Math.max(1e-3, -vn + Math.hypot(wx, wy) * 0.5);
  }
  return 0;
}

function collideCircle(b, c) {
  const dx = b.x - c.x, dy = b.y - c.y;
  const R = BALL_R + c.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return 0;
  const d = Math.sqrt(d2) || 1e-6;
  const nx = dx / d, ny = dy / d;
  b.x = c.x + nx * R; b.y = c.y + ny * R;
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return 0;
  const e0 = -vn;
  const e = c.bounce || WALL_E;
  b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
  if (c.bounce) { // bumpers always kick back a little
    const sp = Math.hypot(b.vx, b.vy);
    if (sp < 24) { b.vx += nx * (24 - sp); b.vy += ny * (24 - sp); }
  }
  return Math.max(1e-3, e0);
}

/** Advance one fixed step. Returns a list of events. */
function stepBall(h, b, t) {
  const ev = [];
  const moving = b.vx !== 0 || b.vy !== 0;
  // forces
  let ax = 0, ay = 0, sand = false, water = false;
  for (const z of h.zones) {
    if (!inZone(z, b.x, b.y)) continue;
    if (z.type === 'sand') sand = true;
    else if (z.type === 'water') water = true;
    else if (z.type === 'slope') { ax += z.ax; ay += z.ay; }
    else if (z.type === 'pull') {
      const [cx, cy, r] = z.circle;
      const dx = cx - b.x, dy = cy - b.y, d = Math.hypot(dx, dy) || 1;
      const k = z.strength * (0.35 + 0.65 * (1 - d / r));
      ax += (dx / d) * k; ay += (dy / d) * k;
    }
  }
  if (moving) {
    if (water) { ev.push({ type: 'water' }); return ev; }
    b.vx += ax * DT; b.vy += ay * DT;
    let sp = Math.hypot(b.vx, b.vy);
    const fr = (sand ? SAND : ROLL) * DT;
    if (sp > 0) {
      const ns = Math.max(0, sp - fr) * (1 - DRAG * DT);
      b.vx *= ns / sp; b.vy *= ns / sp; sp = ns;
    }
    b.x += b.vx * DT; b.y += b.vy * DT;
    // cup
    const cdx = h.cup[0] - b.x, cdy = h.cup[1] - b.y, cd = Math.hypot(cdx, cdy);
    if (cd < CUP_R) {
      if (sp < SINK_SPEED) { b.x = h.cup[0]; b.y = h.cup[1]; b.vx = b.vy = 0; ev.push({ type: 'sink' }); return ev; }
      // lip: curl towards the centre and lose a little pace
      const k = 900 * (1 - cd / CUP_R) * DT;
      b.vx += (cdx / (cd || 1)) * k; b.vy += (cdy / (cd || 1)) * k;
      b.vx *= 0.992; b.vy *= 0.992;
      if (!b.lipped) { b.lipped = true; ev.push({ type: 'lip' }); }
    } else b.lipped = false;
    if (sand && !b.inSand) ev.push({ type: 'sand' });
    b.inSand = sand;
  }
  // collisions: movers first, then circles, then static walls (walls always win)
  let touched = false;
  for (const m of moverShapes(h, t)) {
    if (m.type === 'bar') {
      const hit = collideSeg(b, m.a, m.b, m.rad, 0.8, m.vel);
      if (hit) touched = true;
      if (hit > 2) ev.push({ type: 'hit', kind: m.kind, speed: hit });
    } else for (const [a, c] of m.segs) {
      const hit = collideSeg(b, a, c, 0, 0.6, m.vel);
      if (hit) touched = true;
      if (hit > 2) ev.push({ type: 'hit', kind: m.kind, speed: hit });
    }
  }
  for (const c of h.circles) {
    const hit = collideCircle(b, c);
    if (hit) touched = true;
    if (hit > 2) ev.push({ type: c.bounce ? 'bump' : 'hit', kind: c.kind, speed: hit });
  }
  for (const [a, c] of staticSegs(h)) {
    const hit = collideSeg(b, a, c, 0, WALL_E, null);
    if (hit) touched = true;
    if (hit > 2) ev.push({ type: 'hit', kind: 'wall', speed: hit });
  }
  // rest
  if (b.vx !== 0 || b.vy !== 0) {
    const sp = Math.hypot(b.vx, b.vy);
    const push = Math.hypot(ax, ay);
    if (sp < 1.4 && (push < (sand ? SAND : ROLL) * 0.9 || touched)) { b.vx = b.vy = 0; ev.push({ type: 'stop' }); }
  }
  return ev;
}

// ---------------- game state ----------------
export function newGame({ players = 1, names = ['You'], holes = 9 } = {}) {
  const n = Math.max(1, Math.min(4, players));
  const s = {
    players: n,
    names: Array.from({ length: n }, (_, i) => (names[i] || `Player ${i + 1}`).trim() || `Player ${i + 1}`),
    holeCount: Math.max(1, Math.min(HOLES.length, holes)),
    holeIdx: 0,
    scores: Array.from({ length: n }, () => []),
    order: Array.from({ length: n }, (_, i) => i),
    orderIdx: 0,
    t: 0,
    acc: 0,
    ball: null,
    strokes: 0,
    phase: 'ready', // ready → aim → roll → (aim …) → holed | capped
    last: null,
    rollT: 0,
  };
  placeBall(s);
  return s;
}

export const holeOf = (s) => HOLES[s.holeIdx];
export const turnOf = (s) => s.order[s.orderIdx];
export const capOf = (h) => h.par + 4;

function placeBall(s) {
  const h = holeOf(s);
  s.ball = { x: h.tee[0], y: h.tee[1], vx: 0, vy: 0 };
  s.last = { x: h.tee[0], y: h.tee[1] };
  s.strokes = 0;
  s.rollT = 0;
  s.phase = 'ready';
}

export function beginTurn(s) { if (s.phase === 'ready') s.phase = 'aim'; }

/** Putt. angle in radians (0 = +x), power 0..1. */
export function shoot(s, angle, power) {
  if (s.phase !== 'aim') return false;
  const p = Math.max(0.04, Math.min(1, power));
  const v = p * VMAX;
  s.last = { x: s.ball.x, y: s.ball.y };
  s.ball.vx = Math.cos(angle) * v;
  s.ball.vy = Math.sin(angle) * v;
  s.strokes += 1;
  s.rollT = 0;
  s.phase = 'roll';
  return true;
}

/**
 * Advance real time dt (seconds). Physics runs in fixed steps so both builds behave identically.
 * Returns events: hit / bump / sand / lip / water / sink / stop / capped.
 */
export function tick(s, dt) {
  const out = [];
  s.acc += Math.min(dt, 0.1);
  const h = holeOf(s);
  while (s.acc >= DT) {
    s.acc -= DT;
    s.t += DT;
    if (s.phase === 'holed' || s.phase === 'capped' || s.phase === 'over') continue;
    const b = s.ball;
    const wasMoving = b.vx !== 0 || b.vy !== 0;
    const ev = stepBall(h, b, s.t);
    if (s.phase === 'roll') s.rollT += DT;
    for (const e of ev) {
      if (e.type === 'water') {
        out.push({ ...e, at: { x: b.x, y: b.y } });
        s.strokes += 1; // penalty stroke, back to where you putted from
        b.x = s.last.x; b.y = s.last.y; b.vx = b.vy = 0;
        s.phase = s.strokes >= capOf(h) ? 'capped' : 'aim';
        if (s.phase === 'capped') out.push({ type: 'capped' });
      } else if (e.type === 'sink') {
        out.push(e);
        s.phase = 'holed';
      } else out.push(e);
    }
    if (s.phase === 'holed' || s.phase === 'capped') continue;
    // a mover knocked a resting ball: let it roll (no stroke)
    if (!wasMoving && (b.vx !== 0 || b.vy !== 0) && s.phase !== 'roll') { s.phase = 'roll'; s.rollT = 0; s.nudged = true; }
    if (s.phase === 'roll' && ((b.vx === 0 && b.vy === 0) || s.rollT > 14)) {
      b.vx = b.vy = 0;
      if (s.strokes >= capOf(h)) { s.phase = 'capped'; out.push({ type: 'capped' }); }
      else { s.phase = 'aim'; s.nudged = false; out.push({ type: 'rest' }); }
    }
  }
  return out;
}

/** Record the current player's score and move on. Returns 'player' | 'hole' | 'over'. */
export function endTurn(s) {
  const h = holeOf(s);
  const p = turnOf(s);
  s.scores[p][s.holeIdx] = s.phase === 'holed' ? s.strokes : capOf(h);
  s.orderIdx += 1;
  if (s.orderIdx < s.players) { placeBall(s); return 'player'; }
  // next hole: honours, lowest score on this hole tees off first (ties keep the old order)
  const prevOrder = s.order.slice();
  s.order = prevOrder.slice().sort((a, b) => (s.scores[a][s.holeIdx] - s.scores[b][s.holeIdx]) || (prevOrder.indexOf(a) - prevOrder.indexOf(b)));
  s.orderIdx = 0;
  s.holeIdx += 1;
  if (s.holeIdx >= s.holeCount) { s.holeIdx = s.holeCount - 1; s.phase = 'over'; return 'over'; }
  placeBall(s);
  return 'hole';
}

export const total = (s, p) => s.scores[p].reduce((a, b) => a + (b || 0), 0);
export const parThrough = (s, n) => HOLES.slice(0, n).reduce((a, h) => a + h.par, 0);
export const holesPlayed = (s, p) => s.scores[p].filter((x) => x != null).length;
export function toPar(s, p) {
  return s.scores[p].reduce((a, sc, i) => (sc == null ? a : a + sc - HOLES[i].par), 0);
}
export const fmtPar = (d) => (d === 0 ? 'E' : d > 0 ? `+${d}` : `−${-d}`);

export function scoreName(strokes, par, capped = false) {
  if (capped) return { name: 'Pick up', line: 'Aiyah, next hole lah.' };
  if (strokes === 1) return { name: 'Hole in one!', line: 'Wah lau eh! Shiok max!' };
  const d = strokes - par;
  if (d <= -2) return { name: 'Eagle!', line: 'Steady pom pi pi!' };
  if (d === -1) return { name: 'Birdie!', line: 'Power lah!' };
  if (d === 0) return { name: 'Par', line: 'Can, very steady.' };
  if (d === 1) return { name: 'Bogey', line: 'Not bad, not bad.' };
  if (d === 2) return { name: 'Double bogey', line: 'Paiseh lah…' };
  return { name: `+${d}`, line: 'Jialat. Next one better.' };
}

/** Leaders: array of player indexes sorted by total (fewest strokes first). */
export const standings = (s) => Array.from({ length: s.players }, (_, i) => i).sort((a, b) => total(s, a) - total(s, b));
