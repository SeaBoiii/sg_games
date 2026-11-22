// Next Station — the overlay both views share: the line strip, the precision stop gauge,
// speed readout, result toasts and the ATP flash.
import * as E from './engine.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class Hud {
  constructor(el) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="strip" aria-hidden="true">
        <span class="st-from"></span>
        <div class="st-bar"><div class="st-zones"></div><i class="st-brake"></i><i class="st-train"></i><b class="st-end"></b></div>
        <span class="st-to"></span>
      </div>
      <div class="speedo" aria-live="off"><b class="sp-v">0</b><small>km/h</small><span class="sp-lim"><em>70</em></span></div>
      <div class="gauge" hidden><div class="g-scale"></div><i class="g-mark"></i><i class="g-nose"></i><b class="g-d"></b></div>
      <div class="toasts" aria-live="polite"></div>
      <div class="flash"></div>`;
    el.appendChild(this.el);
    this.$ = (q) => this.el.querySelector(q);
    this.segKey = -1;
  }

  _strip(s) {
    const i = Math.min(s.seg, s.line.segs.length - 1);
    const a = s.map.marks[i], b = s.map.marks[i + 1];
    if (this.segKey !== `${s.line.id}${i}`) {
      this.segKey = `${s.line.id}${i}`;
      this.$('.st-from').textContent = s.line.stations[i];
      this.$('.st-to').textContent = s.line.stations[i + 1];
      this.$('.st-zones').innerHTML = s.map.zones.filter((z) => z.to > a && z.from < b).map((z) => {
        const l = ((z.from - a) / (b - a)) * 100, w = ((Math.min(b, z.to + E.TRAIN_LEN) - z.from) / (b - a)) * 100;
        return `<span style="left:${l}%;width:${w}%"><em>${z.kmh}</em></span>`;
      }).join('');
      this.el.style.setProperty('--line', s.line.color);
    }
    const k = Math.max(0, Math.min(1, (s.x - a) / (b - a)));
    this.$('.st-train').style.left = `${k * 100}%`;
    const bp = s.line.guide && s.phase === 'run' ? E.brakePoint(s) : null;
    const br = this.$('.st-brake');
    if (bp != null && bp > 0 && s.v > 3) { br.hidden = false; br.style.left = `${Math.min(100, ((s.x + bp - a) / (b - a)) * 100)}%`; } else br.hidden = true;
  }

  update(s) {
    if (!s) return;
    this._strip(s);
    const sp = Math.round(s.v * 3.6);
    const lim = E.limitAt(s, s.x);
    this.$('.sp-v').textContent = sp;
    this.$('.sp-lim em').textContent = lim;
    this.el.classList.toggle('over', sp > lim + 2);
    this.el.classList.toggle('atp', !!s.atp);
    // the precision gauge for the last stretch
    const d = E.nextMark(s) - s.x;
    const g = this.$('.gauge');
    const show = s.phase === 'run' && d < 70 && d > -16;
    g.hidden = !show;
    if (show) {
      const span = Math.abs(d) < 8 ? 5 : Math.abs(d) < 25 ? 15 : 40; // metres each side of the mark
      if (this.span !== span) {
        this.span = span;
        const step = span <= 5 ? 1 : 5;
        let ticks = '';
        for (let m = -span; m <= span; m += step) ticks += `<span style="left:${50 + (m / span) * 50}%" class="${m === 0 ? 'zero' : ''}">${m === 0 ? '' : m > 0 ? `+${m}` : m}</span>`;
        g.querySelector('.g-scale').innerHTML = ticks;
      }
      const pos = Math.max(-0.97, Math.min(0.97, -d / span));
      g.querySelector('.g-nose').style.left = `${50 + pos * 50}%`;
      g.querySelector('.g-d').textContent = d > 0 ? `${d < 10 ? d.toFixed(1) : Math.round(d)} m to go` : `${(-d).toFixed(1)} m past`;
      g.classList.toggle('close', Math.abs(d) < 1);
    }
  }

  toast(html, cls = '', ms = 1700) {
    const t = document.createElement('div');
    t.className = `toast ${cls}`;
    t.innerHTML = html;
    const box = this.$('.toasts');
    box.appendChild(t);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
  }
  clearToasts() { this.$('.toasts').innerHTML = ''; }
  show(on) { this.el.hidden = !on; }
}
export { esc };
