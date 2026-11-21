// Shared by every SG Games title. Tiny synthesized sound kit — no audio files needed.
const KEY = 'sg.muted';
let ctx = null;
let master = null;
let muted = false;
try { muted = (localStorage.getItem(KEY) ?? localStorage.getItem('agak.muted')) === '1'; } catch {}

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ f = 440, f2 = null, t = 0.12, type = 'sine', vol = 0.3, delay = 0, attack = 0.005 }) {
  const c = ac();
  if (!c || muted) return;
  const now = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, now);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + t);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + t);
  o.connect(g).connect(master);
  o.start(now);
  o.stop(now + t + 0.02);
}

function noise({ t = 0.4, vol = 0.25, from = 600, to = 3000, q = 0.8, delay = 0 }) {
  const c = ac();
  if (!c || muted) return;
  const now = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * t);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = q;
  bp.frequency.setValueAtTime(from, now);
  bp.frequency.exponentialRampToValueAtTime(to, now + t);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + t * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, now + t);
  src.connect(bp).connect(g).connect(master);
  src.start(now);
}

export const sfx = {
  unlock: () => ac(),
  get muted() { return muted; },
  setMuted(m) {
    muted = m;
    try { localStorage.setItem(KEY, m ? '1' : '0'); } catch {}
  },
  tap: () => tone({ f: 660, f2: 520, t: 0.06, type: 'triangle', vol: 0.18 }),
  tick: () => tone({ f: 1800, t: 0.025, type: 'square', vol: 0.06 }),
  needle: () => tone({ f: 1200, t: 0.018, type: 'triangle', vol: 0.05 }),
  whoosh: (up = true) => noise({ t: 0.55, vol: 0.22, from: up ? 400 : 2600, to: up ? 2600 : 400 }),
  thunk: () => { tone({ f: 140, f2: 60, t: 0.18, type: 'sine', vol: 0.4 }); noise({ t: 0.08, vol: 0.12, from: 800, to: 300 }); },
  lock: () => { tone({ f: 523, t: 0.09, type: 'triangle', vol: 0.2 }); tone({ f: 784, t: 0.14, type: 'triangle', vol: 0.2, delay: 0.07 }); },
  drum: () => {
    for (let i = 0; i < 10; i++) noise({ t: 0.06, vol: 0.08 + i * 0.012, from: 300, to: 200, q: 2, delay: i * 0.075 });
  },
  score(points) {
    if (points === 0) {
      tone({ f: 220, f2: 140, t: 0.35, type: 'sawtooth', vol: 0.12 });
      tone({ f: 165, f2: 110, t: 0.45, type: 'sawtooth', vol: 0.1, delay: 0.18 });
      return;
    }
    const scale = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    const n = points + 1;
    for (let i = 0; i < n; i++) tone({ f: scale[i], t: 0.22, type: 'triangle', vol: 0.22, delay: i * 0.09 });
    if (points === 4) {
      tone({ f: 1567.98, t: 0.6, type: 'sine', vol: 0.18, delay: n * 0.09 });
      noise({ t: 0.6, vol: 0.06, from: 4000, to: 8000, delay: n * 0.09 });
    }
  },
  plop: () => { noise({ t: 0.09, vol: 0.18, from: 2400, to: 900, q: 1.2 }); tone({ f: 320, f2: 180, t: 0.09, type: 'sine', vol: 0.18 }); },
  claim: (good = true) => {
    const seq = good ? [659.25, 880, 1174.66] : [392, 329.63, 261.63];
    seq.forEach((f, i) => tone({ f, t: 0.16, type: 'triangle', vol: 0.18, delay: i * 0.07 }));
  },
  sweep: () => { noise({ t: 0.35, vol: 0.18, from: 3000, to: 600, q: 0.6 }); noise({ t: 0.3, vol: 0.12, from: 2000, to: 500, q: 0.6, delay: 0.2 }); },
  win() {
    const seq = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
    seq.forEach((f, i) => tone({ f, t: 0.28, type: 'triangle', vol: 0.22, delay: i * 0.12 }));
  },
};

export function buzz(ms = 12) {
  try { if (!muted && navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(ms); } catch {}
}
