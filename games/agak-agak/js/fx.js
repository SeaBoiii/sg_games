// Confetti + small animation helpers, shared by both builds.
export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  // long decelerating spin with a tiny settle at the end
  spin: (t) => { const e = 1 - Math.pow(1 - t, 4); return e + Math.sin(t * Math.PI) * 0.004; },
};

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** rAF tween. onUpdate(value, t). Resolves when done. */
export function tween({ from, to, duration = 600, easing = ease.outCubic, onUpdate }) {
  return new Promise((resolve) => {
    if (reducedMotion()) duration = Math.min(duration, 120);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      onUpdate(from + (to - from) * easing(t), t);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

export const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? Math.min(ms, 80) : ms));

let confettiCanvas = null;
export function confetti({ count = 160, colors = ['#D7263D', '#1F8A8A', '#F2B134', '#E88EA6', '#FBF6EC'], origin = null } = {}) {
  if (reducedMotion()) return;
  if (!confettiCanvas) {
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.className = 'confetti';
    Object.assign(confettiCanvas.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: 60, width: '100%', height: '100%' });
    document.body.appendChild(confettiCanvas);
  }
  const cv = confettiCanvas;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ox = origin ? origin.x : innerWidth / 2;
  const oy = origin ? origin.y : innerHeight * 0.35;
  const parts = Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2;
    const v = 4 + Math.random() * 9;
    return {
      x: ox, y: oy,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6,
      w: 6 + Math.random() * 8, h: 4 + Math.random() * 6,
      r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: colors[Math.floor(Math.random() * colors.length)],
      life: 0, max: 90 + Math.random() * 70,
    };
  });
  const frame = () => {
    g.clearRect(0, 0, innerWidth, innerHeight);
    let alive = 0;
    for (const p of parts) {
      if (p.life++ > p.max) continue;
      alive++;
      p.vy += 0.28; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save();
      g.globalAlpha = Math.max(0, 1 - p.life / p.max);
      g.translate(p.x, p.y); g.rotate(p.r);
      g.fillStyle = p.c;
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life * 0.15)));
      g.restore();
    }
    if (alive) requestAnimationFrame(frame);
    else g.clearRect(0, 0, innerWidth, innerHeight);
  };
  requestAnimationFrame(frame);
}
