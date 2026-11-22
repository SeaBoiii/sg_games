// Next Station — lines, train physics, speed limits, stopping and scoring (no DOM).
//
// The track is one long straight measured in metres from the first station's stop mark.
// The player moves a master controller between 8 notches; step() integrates the train.

export const NOTCHES = ['EB', 'B3', 'B2', 'B1', 'N', 'P1', 'P2', 'P3'];
export const N_IDX = 4;
const ACC = [-2.3, -1.5, -1.0, -0.5, 0, 0.5, 0.9, 1.3];
export const TRAIN_LEN = 92;          // four cars
export const CAR_LEN = 23;
export const PLATFORM = 110;          // platform length; the stop mark sits 4 m before its far end
export const DOOR_TIME = 3.2;         // seconds the doors stay open
export const DEPART_TIME = 1.6;       // "doors closing" before you may move
const kmh = (v) => v * 3.6;

const seg = (len, env, limits = [], extra = {}) => ({ len, env, limits, ...extra });
export const LINES = {
  kaya: {
    id: 'kaya', name: 'Kaya Line', color: '#7FA82E', level: 'Easy', max: 70, guide: true, weather: 'clear', time: 'day',
    stations: ['Kopi Hill', 'Kampong Kaya', 'Pandan Gardens', 'Chendol Park', 'Satay Bay'],
    segs: [seg(430, 'viaduct'), seg(520, 'viaduct', [[0.3, 0.55, 50]]), seg(400, 'ground'), seg(560, 'viaduct', [[0.45, 0.7, 55]])],
  },
  teh: {
    id: 'teh', name: 'Teh Line', color: '#C7742E', level: 'Medium', max: 80, guide: true, weather: 'clear', time: 'dusk',
    stations: ['Teh Tarik Central', 'Prata Point', 'Rojak Junction', 'Milo Field', 'Laksa Lane', 'Kueh Town'],
    segs: [seg(480, 'tunnel'), seg(600, 'tunnel', [[0.25, 0.5, 55]]), seg(520, 'viaduct', [[0.55, 0.75, 60]]), seg(450, 'viaduct'), seg(640, 'tunnel', [[0.2, 0.4, 50], [0.6, 0.8, 60]])],
  },
  bandung: {
    id: 'bandung', name: 'Bandung Line', color: '#D9578A', level: 'Rush hour', max: 90, guide: false, weather: 'rain', time: 'night',
    stations: ['Bubble Tea Boulevard', 'Chilli Crab Cove', 'Ice Kachang Isle', 'Popiah Place', 'Mee Siam Mall', 'Kaya Toast Terrace', 'Char Siew Square'],
    segs: [seg(520, 'viaduct', [[0.4, 0.6, 55]]), seg(700, 'viaduct', [[0.2, 0.35, 60], [0.65, 0.85, 50]]), seg(460, 'tunnel'), seg(620, 'tunnel', [[0.3, 0.55, 45]]),
      seg(540, 'viaduct', [[0.5, 0.7, 60]]), seg(680, 'viaduct', [[0.15, 0.3, 55], [0.6, 0.8, 65]])],
  },
};
export const LINE_IDS = Object.keys(LINES);

/** Station stop marks, environments and speed-limit zones along the track. */
export function layout(line) {
  const marks = [0];
  line.segs.forEach((g) => marks.push(marks[marks.length - 1] + g.len));
  const zones = [];
  line.segs.forEach((g, i) => g.limits.forEach(([a, b, lim]) => zones.push({ from: marks[i] + g.len * a, to: marks[i] + g.len * b, kmh: lim })));
  const envs = line.segs.map((g, i) => ({ from: marks[i], to: marks[i + 1], env: g.env }));
  return { marks, zones, envs, end: marks[marks.length - 1] };
}

export function limitAt(s, x) {
  for (const z of s.map.zones) if (x >= z.from - 2 && x <= z.to + TRAIN_LEN) return z.kmh; // the whole train must clear the zone
  return s.line.max;
}
export const envAt = (s, x) => (s.map.envs.find((e) => x >= e.from && x < e.to) || s.map.envs[s.map.envs.length - 1]).env;

// ---------------- physics ----------------
function accel(s, notch, v) {
  let a = ACC[notch];
  if (a > 0) a *= Math.max(0.2, 1 - v / 30);          // traction falls off with speed
  if (a < 0 && s.line.weather === 'rain') a *= 0.82;  // wet rails
  if (v > 0) a -= 0.03 + 0.00045 * v * v;              // rolling and air resistance
  return a;
}

const brakeDecel = (s, k) => -ACC[k] * (s.line.weather === 'rain' ? 0.82 : 1) + 0.03;

/** Brake notch that stops the train on the mark from here (for the guide light), or null before the braking point. */
export function guideNotch(s) {
  if (s.phase !== 'run' || s.v < 0.5) return null;
  const d = nextMark(s) - s.x;
  if (d <= 0.3) return 1;
  const need = (s.v * s.v) / (2 * d);
  if (need < brakeDecel(s, 2) * 0.86) return null;
  return need <= brakeDecel(s, 3) * 1.05 ? 3 : need <= brakeDecel(s, 2) * 1.04 ? 2 : 1;
}

/** Metres until the comfortable (B2) braking point for the next stop. */
export function brakePoint(s) {
  const d = nextMark(s) - s.x;
  return d - (s.v * s.v) / (2 * brakeDecel(s, 2) * 0.86) - s.v * 0.6;
}

// ---------------- game state ----------------
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function newRun(lineId, { seed } = {}) {
  const line = LINES[lineId] || LINES.kaya;
  const map = layout(line);
  const s = {
    line, map, rng: mulberry(seed ?? Math.floor(Math.random() * 2 ** 31)),
    seg: 0, x: 0, v: 0, a: 0, notch: N_IDX, phase: 'depart', clock: 0, phaseT: 0,
    segT: 0, comfort: 50, pen: [], stops: 0, atp: false, atpWarn: false, over: false, wobble: 0,
    results: [], total: 0, sched: [], lastNotchT: 0, slip: 0,
  };
  s.sched = line.segs.map((_, i) => schedule(line, map, i));
  return s;
}

export const station = (s, i) => s.line.stations[i];
export const nextMark = (s) => s.map.marks[Math.min(s.seg + 1, s.map.marks.length - 1)];

export function setNotch(s, k) {
  k = Math.max(0, Math.min(NOTCHES.length - 1, k));
  if (k === s.notch) return [];
  const ev = [];
  const jump = Math.abs(k - s.notch);
  if (s.phase === 'run' && s.v > 3) {
    // flipping between power and brake in a hurry throws standing passengers about
    const side = (n) => (n > N_IDX ? 1 : n < N_IDX ? -1 : 0);
    const now = side(k);
    if (now && s.lastSide && now !== s.lastSide && s.clock - s.lastSideT < 1.2 && s.clock - (s.lastJoltT || -9) > 1.5) { s.lastJoltT = s.clock; s.comfort -= 4; s.wobble = Math.min(1, s.wobble + 0.6); ev.push({ type: 'jolt' }); }
    if (now) { s.lastSide = now; s.lastSideT = s.clock; }
    if (k === 0) { s.comfort -= 12; s.wobble = 1; ev.push({ type: 'eb' }); }
  }
  void jump;
  s.notch = k;
  s.lastNotchT = s.clock;
  return ev;
}

/** Advance the simulation by dt seconds. Returns events for sound and pictures. */
export function step(s, dt) {
  const ev = [];
  s.clock += dt;
  s.phaseT += dt;
  s.wobble = Math.max(0, s.wobble - dt * 0.8);
  if (s.phase === 'depart') {
    if (s.phaseT >= DEPART_TIME) { s.phase = 'run'; s.phaseT = 0; s.segT = 0; ev.push({ type: 'go' }); }
    return ev;
  }
  if (s.phase === 'doors') {
    if (s.phaseT >= DOOR_TIME) {
      if (s.seg >= s.line.segs.length) { s.phase = 'done'; ev.push({ type: 'done' }); }
      else { s.phase = 'depart'; s.phaseT = 0; s.notch = N_IDX; ev.push({ type: 'close' }); }
    }
    return ev;
  }
  if (s.phase !== 'run') return ev;

  s.segT += dt;
  const lim = limitAt(s, s.x);
  // automatic train protection: a warning first, then it brakes hard on its own
  const sp = kmh(s.v);
  const warn = sp > lim + 2;
  if (warn && !s.atpWarn) ev.push({ type: 'warn' });
  s.atpWarn = warn;
  if (!s.atp && sp > lim + 6) {
    s.atp = true; s.comfort -= 10; s.wobble = 1;
    s.pen.push({ what: 'ATP brake', pts: 25 });
    ev.push({ type: 'atp', lim });
  }
  if (s.atp && sp <= lim - 4) { s.atp = false; ev.push({ type: 'atpOff' }); }
  const notch = s.atp ? 0 : s.notch;
  let target = accel(s, notch, s.v);
  if (s.line.weather === 'rain' && target < -0.6 && s.v > 8 && s.rng() < dt * 0.25) { s.slip = 0.6; ev.push({ type: 'slip' }); }
  if (s.slip > 0) { s.slip -= dt; target *= 0.55; }
  if (s.v <= 0 && target < 0) target = 0;
  // real trains ease into a change of acceleration (jerk-limited)
  const J = notch === 0 ? 3.2 : 1.6;
  s.a += Math.max(-J * dt, Math.min(J * dt, target - s.a));
  const a = s.a;
  const vPrev = s.v;
  s.v = Math.max(0, s.v + a * dt);
  s.x += ((vPrev + s.v) / 2) * dt;

  const mark = nextMark(s);
  const err = s.x - mark;
  if (!s.over && err > 4) { s.over = true; s.pen.push({ what: 'Overshot the mark', pts: 40 }); ev.push({ type: 'overshoot' }); }
  if (err > 14 && !s.atp) { s.atp = true; ev.push({ type: 'atp', lim: 0 }); } // way past: the train stops itself
  if (vPrev > 0 && s.v === 0) {
    if (s.a < -0.75) { s.comfort -= 8; s.wobble = 1; ev.push({ type: 'jerkstop' }); }
    s.a = 0;
    if (s.over || Math.abs(err) <= 3.5) ev.push(...arrive(s, err));
    else if (err >= -24) { s.stops += 1; s.pen.push({ what: 'Stopped short', pts: 15 }); ev.push({ type: 'short', err }); }
    else ev.push({ type: 'halt' });
  }
  return ev;
}

export function grade(err) {
  const e = Math.abs(err);
  if (e <= 0.3) return { name: 'Perfect', pts: 100 };
  if (e <= 1) return { name: 'Great', pts: Math.round(100 - (e - 0.3) * 20) };
  if (e <= 2) return { name: 'Good', pts: Math.round(86 - (e - 1) * 26) };
  if (e <= 3.5) return { name: 'OK', pts: Math.round(60 - (e - 2) * 26) };
  return { name: 'Missed', pts: 0 };
}

function arrive(s, err) {
  const i = s.seg;
  const g = s.over ? { name: 'Overshot', pts: 0 } : grade(err);
  const late = s.segT - s.sched[i];
  const timePts = Math.abs(late) <= 3 ? 50 : Math.max(0, Math.round(50 - (Math.abs(late) - 3) * (late > 0 ? 3 : 1.5)));
  const comfort = Math.max(0, Math.round(s.comfort));
  const pens = s.pen.reduce((a, p) => a + p.pts, 0);
  const total = Math.max(0, g.pts + timePts + comfort - pens);
  const r = { station: s.line.stations[i + 1], err, grade: g.name, stopPts: g.pts, time: s.segT, sched: s.sched[i], late, timePts, comfort, pens: s.pen.slice(), total };
  s.results.push(r);
  s.total += total;
  s.seg += 1;
  s.phase = 'doors'; s.phaseT = 0; s.notch = N_IDX; s.atp = false; s.atpWarn = false; s.over = false;
  s.comfort = 50; s.pen = []; s.stops = 0; s.a = 0;
  return [{ type: 'arrive', r }];
}

// ---------------- the timetable ----------------
/** Run a careful auto-driver over one segment; the timetable gives a little slack on top. */
export function autoDrive(line, map, i, dt = 0.05) {
  const s = { line, map, x: map.marks[i], v: 0, slip: 0 };
  const mark = map.marks[i + 1];
  let t = 0;
  while (t < 400) {
    const lim = limitAt(s, s.x);
    const ahead = map.zones.filter((z) => z.from > s.x).map((z) => ({ at: z.from, v: z.kmh / 3.6 })).concat([{ at: mark, v: 0 }]);
    let notch = 7;
    const b = -ACC[2] * (line.weather === 'rain' ? 0.82 : 1);
    for (const z of ahead) {
      const d = z.at - s.x - (z.v === 0 ? 0 : 2);
      if (s.v > z.v && (s.v * s.v - z.v * z.v) / (2 * b) + s.v * 0.8 >= d - 1) notch = 2;
    }
    if (notch !== 2 && s.v * 3.6 >= lim - 2) notch = 4;
    const target = accel(s, notch, s.v);
    s.a = (s.a || 0) + Math.max(-1.6 * dt, Math.min(1.6 * dt, target - (s.a || 0)));
    s.v = Math.max(0, s.v + s.a * dt);
    s.x += s.v * dt;
    t += dt;
    if (s.x >= mark - 0.5 && s.v < 0.3) break;
    if (s.v === 0 && notch === 2 && s.x < mark - 0.5) s.v = 0.8; // creep the last bit
  }
  return t;
}
export const schedule = (line, map, i) => Math.ceil(autoDrive(line, map, i) * 1.1 + 4);

export function stars(s) {
  const per = s.total / Math.max(1, s.line.segs.length);
  return per >= 165 ? 3 : per >= 125 ? 2 : per >= 80 ? 1 : 0;
}
export const MAX_PER_STATION = 200;
