// Chapteh Kick — pure rules (no DOM). Shared by the 2D and 3D builds.
// World units are metres: x to the right, y up, the ground is y = 0, the kid stands at x = 0.

export const PLAYER_COLORS = ['#E0457B', '#2D6FD1', '#F2B134', '#2F9E5B'];
export const LIVES = 3;
export const RALLY_TARGETS = [5, 7, 11];
export const SPEEDS = {
  chill: { name: 'Chill', scale: 1.18, blurb: 'Slow and floaty' },
  normal: { name: 'Normal', scale: 1.0, blurb: 'Kampung standard' },
  fast: { name: 'Fast', scale: 0.84, blurb: 'Sekolah champion' },
};

/** Where each kick meets the chapteh, relative to the kid's feet. */
export const ZONES = {
  L: { x: -0.17, y: 0.235, name: 'Left foot' },
  C: { x: 0.0, y: 0.55, name: 'Knee' },
  R: { x: 0.17, y: 0.235, name: 'Right foot' },
};
export const RALLY_X = 1.5; // the two kids stand at ±1.5 m

// timing windows (seconds either side of the moment the chapteh reaches the kick height)
export const WIN = { perfect: 0.065, good: 0.13, ok: 0.21 };
const BASE = { perfect: 3, good: 2, ok: 1, scrappy: 1 };

function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
}

// ---------------- flights ----------------
/** A ballistic arc from p0 that reaches p1 after T seconds, peaking H above the higher end. */
function flight(p0, p1, T, H, t0) {
  const top = Math.max(p0.y, p1.y) + H;
  // solve y(t) = y0 + vy t - g t²/2 through p1 at T with apex at `top`
  // apex time ta: vy = g ta, top = y0 + g ta²/2 ; p1: y1 = y0 + g ta T - g T²/2
  const a = top - p0.y, b = p1.y - p0.y;
  // from the two equations: ta = T * sqrt(a) / (sqrt(a) + sqrt(a - b))
  const ta = (T * Math.sqrt(a)) / (Math.sqrt(a) + Math.sqrt(Math.max(1e-6, a - b)));
  const g = (2 * a) / (ta * ta);
  return { x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, vx: (p1.x - p0.x) / T, vy: g * ta, g, T, t0, apex: top };
}
// Feathers brake the chapteh: it leaves the foot quickly and slows into the next kick.
// Real time u maps to flight time T·w(u/T) with w(0)=0, w(1)=1, w'(0)=1.3, w'(1)=0.2.
const w = (x) => 1.3 * x + 0.2 * x * x - 0.5 * x * x * x;
const dw = (x) => 1.3 + 0.4 * x - 1.5 * x * x;
export const FALL = 0.24; // seconds from the kick height down to the ground if nobody kicks it

export function posAt(f, t) {
  const u = t - f.t0;
  if (u <= f.T) {
    const k = Math.max(0, u) / f.T;
    const p = f.T * w(k);
    const s = dw(k);
    return { x: f.x0 + f.vx * p, y: f.y0 + f.vy * p - (f.g * p * p) / 2, vx: f.vx * s, vy: (f.vy - f.g * p) * s };
  }
  const d = u - f.T;
  return { x: f.x1 + f.vx * 0.2 * d, y: f.y1 * Math.max(0, 1 - d / FALL), vx: f.vx * 0.2, vy: -f.y1 / FALL };
}

// ---------------- game ----------------
/**
 * mode: 'solo' | 'turns' | 'rally' · players: names · speed: chill|normal|fast · target: rally points to win
 */
export function newGame({ mode = 'solo', names = ['You'], speed = 'normal', target = 7, seed = Date.now() } = {}) {
  const n = mode === 'rally' ? 2 : mode === 'turns' ? Math.max(2, Math.min(4, names.length)) : 1;
  const s = {
    mode, speed, target,
    rand: null, seed,
    players: Array.from({ length: n }, (_, i) => ({ name: (names[i] || `Player ${i + 1}`).trim() || `Player ${i + 1}`, color: PLAYER_COLORS[i], score: 0, best: 0, kicks: 0, perfects: 0, points: 0 })),
    turn: 0,          // whose run it is (solo/turns) or who serves (rally)
    t: 0,
    phase: 'ready',   // ready → countdown → play → (dropped → play …) → done → over
    countdown: 0,
    f: null,          // current flight
    to: null,         // who/what the chapteh is heading to: zone key (solo) or player index (rally)
    golden: false,
    kicks: 0,         // kicks this run / rally
    combo: 0,
    lives: LIVES,
    cool: [0, 0],     // whiff cooldown per player
    pose: [{ kind: 'idle', t: 0 }, { kind: 'idle', t: 0 }],
    rallyHits: 0,
    lastGrade: null,
  };
  s.rand = rng(seed);
  return s;
}

export const current = (s) => s.players[s.turn];
const speedScale = (s) => SPEEDS[s.speed].scale;

function soloT(s) { return Math.max(0.58, 1.32 - s.kicks * 0.013) * speedScale(s); }
function rallyT(s) { return Math.max(0.6, 1.45 - s.rallyHits * 0.03) * speedScale(s); }

/** Apex height for a flight of T seconds: about 12 m/s² of gravity, times a shape factor. */
const arcH = (T, k = 1) => Math.max(0.45, Math.min(1.85, ((12 * T * T) / 8) * k));

function zonePoint(zone) { const z = ZONES[zone]; return { x: z.x, y: z.y }; }
function rallyPoint(p) { const side = p === 0 ? -1 : 1; return { x: side * (RALLY_X - 0.17), y: 0.235 }; }

function pickZone(s) {
  const r = s.rand();
  let z = r < 0.38 ? 'L' : r < 0.76 ? 'R' : 'C';
  // avoid the same zone three times running
  if (z === s.to && s.prevTo === s.to) z = z === 'C' ? (s.rand() < 0.5 ? 'L' : 'R') : 'C';
  s.prevTo = s.to;
  return z;
}

/** Start (or restart after a drop) with a gentle toss from above. */
function serve(s) {
  if (s.mode === 'rally') {
    const p = s.turn;
    const side = p === 0 ? -1 : 1;
    const from = { x: side * (RALLY_X - 0.05), y: 1.05 };
    s.to = p;
    s.f = flight(from, rallyPoint(p), 0.95 * speedScale(s), 0.55, s.t);
  } else {
    s.to = pickZone(s);
    s.f = flight({ x: 0.05, y: 1.1 }, zonePoint(s.to), 1.0 * speedScale(s), 0.7, s.t);
  }
  s.golden = false;
  s.lastGrade = null;
}

export function startRun(s) {
  s.phase = 'countdown';
  s.countdown = 2.4;
  s.kicks = 0;
  s.combo = 0;
  s.lives = LIVES;
  s.rallyHits = 0;
  s.f = null;
}

/** Kick input. who: 'L' | 'C' | 'R' in solo/turns, player index in rally. Returns events. */
export function kick(s, who) {
  const ev = [];
  if (s.phase !== 'play' || !s.f) return ev;
  const p = s.mode === 'rally' ? who : 0;
  if (s.cool[p] > s.t) return ev;
  const err = s.t - (s.f.t0 + s.f.T); // negative = early
  const late = Math.min(WIN.ok, FALL - 0.02);
  const mine = s.mode === 'rally' ? s.to === p : true;
  if (!mine || err < -WIN.ok || err > late) {
    // swing at nothing
    s.cool[p] = s.t + 0.22;
    s.pose[p] = { kind: s.mode === 'rally' ? (p === 0 ? 'R' : 'L') : who, t: s.t, whiff: true };
    s.combo = s.mode === 'rally' ? s.combo : 0;
    ev.push({ type: 'whiff', p });
    return ev;
  }
  const a = Math.abs(err);
  let grade = a <= WIN.perfect ? 'perfect' : a <= WIN.good ? 'good' : 'ok';
  const at = posAt(s.f, s.t);
  if (s.mode === 'rally') {
    s.rallyHits += 1;
    s.pose[p] = { kind: p === 0 ? 'R' : 'L', t: s.t };
    const pl = s.players[p];
    pl.kicks += 1;
    if (grade === 'perfect') pl.perfects += 1;
    const o = 1 - p;
    const k = grade === 'perfect' ? 0.8 : grade === 'good' ? 1.0 : 1.2;
    const T = rallyT(s) * k;
    s.to = o;
    s.f = flight(at, rallyPoint(o), T, arcH(T, grade === 'perfect' ? 0.55 : grade === 'good' ? 0.85 : 1.25), s.t);
    s.lastGrade = grade;
    ev.push({ type: 'kick', p, grade, at, smash: grade === 'perfect' });
    return ev;
  }
  // solo / turns
  const wrong = who !== s.to;
  if (wrong) grade = 'scrappy';
  s.pose[0] = { kind: who, t: s.t };
  s.kicks += 1;
  const pl = current(s);
  pl.kicks += 1;
  if (grade === 'perfect') pl.perfects += 1;
  if (grade === 'perfect' || grade === 'good') s.combo += 1; else s.combo = 0;
  const mult = 1 + Math.min(4, Math.floor(s.combo / 8));
  let pts = BASE[grade] * mult;
  let bonus = 0;
  if (s.golden && grade === 'perfect') { bonus = 10; pts += bonus; }
  pl.score += pts;
  s.lastGrade = grade;
  ev.push({ type: 'kick', p: 0, grade, zone: who, at, pts, mult, combo: s.combo, bonus, golden: s.golden });
  // next flight
  s.to = pickZone(s);
  s.golden = s.kicks > 0 && s.kicks % 12 === 11;
  const T = soloT(s) * (s.golden ? 1.25 : 1);
  const H = arcH(T, s.golden ? 1.3 : 0.85 + s.rand() * 0.3);
  s.f = flight(at, zonePoint(s.to), T, H, s.t);
  return ev;
}

/** Advance time. Returns events: countdown / go / drop / point / runover / win. */
export function tick(s, dt) {
  const ev = [];
  s.t += dt;
  if (s.phase === 'countdown') {
    const before = Math.ceil(s.countdown);
    s.countdown -= dt;
    if (Math.ceil(s.countdown) < before && s.countdown > 0) ev.push({ type: 'count', n: Math.ceil(s.countdown) });
    if (s.countdown <= 0) { s.phase = 'play'; serve(s); ev.push({ type: 'go' }); }
    return ev;
  }
  if (s.phase === 'dropped') {
    if (s.t >= s.resumeAt) { s.phase = 'play'; serve(s); ev.push({ type: 'serve' }); }
    return ev;
  }
  if (s.phase !== 'play' || !s.f) return ev;
  const pos = posAt(s.f, s.t);
  if (pos.y <= 0) {
    // on the ground
    const at = { x: pos.x, y: 0 };
    s.combo = 0;
    if (s.mode === 'rally') {
      const loser = s.to, winner = 1 - loser;
      s.players[winner].points += 1;
      ev.push({ type: 'point', winner, loser, at });
      if (s.players[winner].points >= s.target) {
        s.phase = 'over'; s.f = null; ev.push({ type: 'win', winner });
        return ev;
      }
      s.turn = loser; // whoever lost the point serves
      s.rallyHits = 0;
      s.phase = 'dropped'; s.resumeAt = s.t + 1.3; s.lastDrop = at;
      return ev;
    }
    s.lives -= 1;
    ev.push({ type: 'drop', at, lives: s.lives });
    s.lastDrop = at;
    if (s.lives <= 0) {
      const pl = current(s);
      pl.best = Math.max(pl.best, pl.score);
      s.phase = 'done'; s.f = null;
      ev.push({ type: 'runover', p: s.turn, score: pl.score });
      return ev;
    }
    // a little mercy: the next serve comes slower
    s.kicks = Math.max(0, s.kicks - 6);
    s.phase = 'dropped'; s.resumeAt = s.t + 1.1;
  }
  return ev;
}

/** After a run ends in 'turns' mode: next player or game over. */
export function nextRun(s) {
  if (s.mode === 'turns' && s.turn < s.players.length - 1) { s.turn += 1; s.phase = 'ready'; return 'next'; }
  s.phase = 'over';
  return 'over';
}

export function standings(s) {
  const key = s.mode === 'rally' ? (p) => p.points : (p) => p.score;
  return s.players.map((p, i) => i).sort((a, b) => key(s.players[b]) - key(s.players[a]));
}

/** Seconds until the chapteh reaches its kick point (negative once it's past). */
export const timeToKick = (s) => (s.f ? s.f.t0 + s.f.T - s.t : Infinity);
/** The point the chapteh is heading for. */
export function targetPoint(s) {
  if (!s.f) return null;
  return { x: s.f.x1, y: s.f.y1 };
}
