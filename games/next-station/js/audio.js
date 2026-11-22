// Next Station — train sounds: the motor's rising inverter whine, wheel noise, door chimes and the ATP alarm.
// Follows the shared mute setting from assets/lib/sfx.js.
import { sfx } from '../../../assets/lib/sfx.js';

let ctx = null, out = null;
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep(f, t, { type = 'sine', vol = 0.2, delay = 0, f2 = null } = {}) {
  const c = ac();
  if (!c || sfx.muted) return;
  const now = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, now);
  if (f2) o.frequency.linearRampToValueAtTime(f2, now + t);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + 0.01);
  g.gain.setValueAtTime(vol, now + t * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, now + t);
  o.connect(g).connect(out);
  o.start(now); o.stop(now + t + 0.05);
}

export const chime = {
  /** doors closing: a falling three-note chime, twice */
  closing() { [0, 0.75].forEach((d) => [880, 740, 587].forEach((f, i) => beep(f, 0.22, { delay: d + i * 0.2, vol: 0.16 }))); },
  /** doors opening: two soft rising notes */
  opening() { beep(659, 0.25, { vol: 0.14 }); beep(988, 0.35, { vol: 0.14, delay: 0.22 }); },
  warn() { beep(1320, 0.12, { type: 'square', vol: 0.07 }); },
  atp() { for (let i = 0; i < 4; i++) beep(i % 2 ? 900 : 1200, 0.16, { type: 'square', vol: 0.09, delay: i * 0.17 }); },
  notch(power) { beep(power ? 520 : 380, 0.04, { type: 'triangle', vol: 0.08 }); },
  perfect() { [784, 988, 1175, 1568].forEach((f, i) => beep(f, 0.22, { type: 'triangle', vol: 0.15, delay: i * 0.09 })); },
  good() { [659, 880].forEach((f, i) => beep(f, 0.2, { type: 'triangle', vol: 0.14, delay: i * 0.1 })); },
  bad() { beep(330, 0.3, { type: 'sawtooth', vol: 0.08, f2: 220 }); },
};

/** Continuous motor and wheel sound. update(speed m/s, accel m/s²) every frame. */
export class Motor {
  constructor() { this.on = false; }
  start() {
    const c = ac();
    if (!c || this.on) return;
    this.on = true;
    this.osc = c.createOscillator(); this.osc.type = 'sawtooth';
    this.osc2 = c.createOscillator(); this.osc2.type = 'square';
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 900; this.lp.Q.value = 4;
    this.g = c.createGain(); this.g.gain.value = 0;
    this.osc.connect(this.lp); this.osc2.connect(this.lp); this.lp.connect(this.g).connect(out);
    // wheel rumble: filtered noise
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = c.createBufferSource(); this.noise.buffer = buf; this.noise.loop = true;
    this.nf = c.createBiquadFilter(); this.nf.type = 'lowpass'; this.nf.frequency.value = 300;
    this.ng = c.createGain(); this.ng.gain.value = 0;
    this.noise.connect(this.nf).connect(this.ng).connect(out);
    this.osc.start(); this.osc2.start(); this.noise.start();
  }
  update(v, a) {
    if (!this.on || !ctx) return;
    const t = ctx.currentTime;
    const m = sfx.muted ? 0 : 1;
    const drive = Math.min(1, Math.abs(a) / 1.2);
    // the inverter steps up in pitch as the train speeds up (a staircase of tones)
    const stepF = 180 + Math.floor(v * 1.6) * 22 + (v * 1.6 % 1) * 30;
    this.osc.frequency.setTargetAtTime(stepF, t, 0.05);
    this.osc2.frequency.setTargetAtTime(stepF * 1.5, t, 0.05);
    this.g.gain.setTargetAtTime(m * (v > 0.2 || a > 0.05 ? 0.018 + 0.05 * drive : 0), t, 0.08);
    this.nf.frequency.setTargetAtTime(160 + v * 30, t, 0.1);
    this.ng.gain.setTargetAtTime(m * Math.min(0.22, v * 0.012), t, 0.1);
  }
  stop() {
    if (!this.on) return;
    this.on = false;
    const t = ctx.currentTime;
    this.g.gain.setTargetAtTime(0, t, 0.05); this.ng.gain.setTargetAtTime(0, t, 0.05);
    const [a, b, n] = [this.osc, this.osc2, this.noise];
    setTimeout(() => { try { a.stop(); b.stop(); n.stop(); } catch {} }, 300);
  }
}
export const unlockAudio = () => ac();
