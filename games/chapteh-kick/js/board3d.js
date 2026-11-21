// Chapteh Kick — 3D playground (Three.js). Same adapter API as Board2D:
//   load(s) · frame(s) · react(ev, s) · setMode(mode)
// The kid is a jointed Blender rig (hips, knees, shoulders, elbows) posed with the same two-bone IK as 2D.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as E from './engine.js';
import { OUTFITS, ZONE_COLORS } from './art.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const GRADE = { perfect: ['PERFECT!', 'good'], good: ['GOOD', 'ok'], ok: ['OK', 'plain'], scrappy: ['SCRAPPY', 'bad'] };
const LEG = { hipX: 0.085, hipY: 0.63, thigh: 0.33, shin: 0.3 };
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const CHAPTEH_SCALE = 2.0; // a touch bigger than life so it reads on a phone

function knee(hip, foot, a, b, sign) {
  const dx = foot.x - hip.x, dy = foot.y - hip.y;
  let d = Math.hypot(dx, dy);
  if (d > a + b - 0.002) d = a + b - 0.002;
  const base = Math.atan2(dy, dx);
  const ang = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
  const k1 = { x: hip.x + Math.cos(base + ang) * a, y: hip.y + Math.sin(base + ang) * a };
  const k2 = { x: hip.x + Math.cos(base - ang) * a, y: hip.y + Math.sin(base - ang) * a };
  return (k1.x - k2.x) * sign > 0 ? k1 : k2;
}
/** Foot targets in metres (kid-local, origin at the feet), mirroring the 2D board. */
function legTargets(pose, t) {
  const out = { l: { x: -0.1, y: 0 }, r: { x: 0.1, y: 0 }, kneeHint: null, lift: 0 };
  if (!pose || pose.kind === 'idle') return out;
  const dt = t - pose.t, dur = 0.34;
  if (dt < 0 || dt > dur) return out;
  const k = dt < 0.05 ? easeOut(dt / 0.05) : dt < 0.12 ? 1 : 1 - easeOut((dt - 0.12) / (dur - 0.12));
  out.lift = k;
  const miss = pose.whiff ? 1 : 0;
  if (pose.kind === 'C') {
    const tg = { x: -0.038 + miss * 0.04, y: 0.277 + miss * 0.05 };
    out.l = { x: -0.1 + (tg.x + 0.1) * k, y: tg.y * k };
    out.kneeHint = { side: 'l', x: -0.023, y: 0.577 - miss * 0.03, k };
    return out;
  }
  const sd = pose.kind === 'L' ? 'l' : 'r', sign = sd === 'l' ? -1 : 1;
  const tg = { x: sign * 0.17 + (miss ? -sign * 0.07 : 0), y: 0.235 + (miss ? 0.1 : 0) };
  out[sd] = { x: out[sd].x + (tg.x - out[sd].x) * k, y: tg.y * k };
  return out;
}
const angleDown = (from, to) => Math.atan2(to.x - from.x, -(to.y - from.y));

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export class Board3D {
  constructor(stage, { modelUrl = '../models/chapteh-assets.glb', fallbackHref = '../' } = {}) {
    this.stage = stage;
    this.mode = 'idle';
    stage.classList.add('stage-3d');
    stage.innerHTML = `
      <canvas class="gl" aria-label="3D playground"></canvas>
      <div class="hud3d" aria-hidden="true"></div>
      <div class="floats3d" aria-hidden="true"></div>
      <div class="count3d" aria-hidden="true"></div>
      <div class="loading" role="status"><div class="spinner" aria-hidden="true"></div><p>Sweeping the void deck… <span class="pct">0%</span></p></div>`;
    this.canvas = stage.querySelector('canvas');
    this.hud = stage.querySelector('.hud3d');
    this.floats = stage.querySelector('.floats3d');
    this.countEl = stage.querySelector('.count3d');
    this.loadingEl = stage.querySelector('.loading');
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    } catch {
      this.loadingEl.innerHTML = `<p>Your browser can't run the 3D version.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
      return;
    }
    const r = this.renderer;
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = canvasTex(4, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#6FBEEB'); gr.addColorStop(0.65, '#CFEAF2'); gr.addColorStop(1, '#FFE7B8');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    this.scene.fog = new THREE.Fog(0xcfeaf2, 14, 34);
    this.scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80);
    this.look = new THREE.Vector3(0, 0.9, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x5d8f4a, 0.9));
    const sun = new THREE.DirectionalLight(0xfff0d6, 2.1);
    sun.position.set(3, 7, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 5, bottom: -3, near: 1, far: 25 });
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);
    const grass = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#62B052'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { g.fillStyle = i % 3 ? 'rgba(40,110,40,.25)' : 'rgba(200,240,160,.18)'; g.fillRect((i * 97) % w, (i * 61) % h, 2, 5); }
    });
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(30, 30);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.set = new THREE.Group(); this.scene.add(this.set);
    this.dyn = new THREE.Group(); this.scene.add(this.dyn);
    this._resize();
    new ResizeObserver(() => this._resize()).observe(stage);
    this.clock = new THREE.Clock();
    r.setAnimationLoop(() => this.renderer.render(this.scene, this.camera));
    this._load(modelUrl).catch((err) => {
      console.error(err);
      this.loadingEl.innerHTML = `<p>Couldn't load the 3D playground.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
    });
  }

  async _load(url) {
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url, (e) => {
      if (e.total) this.loadingEl.querySelector('.pct').textContent = `${Math.round((e.loaded / e.total) * 100)}%`;
    });
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.tpl = {};
    for (const c of [...gltf.scene.children]) { c.position.set(0, 0, 0); this.tpl[c.name] = c; }
    this._buildSet();
    this.ready = true;
    this.loadingEl.classList.add('done');
    if (this.pendingS) { const s = this.pendingS; this.pendingS = null; this.load(s); }
  }

  _add(name, x, z, rotY = 0, scale = 1, parent = this.set) {
    const t = this.tpl[name];
    if (!t) return null;
    const o = t.clone(true);
    o.position.set(x, 0, z); o.rotation.y = rotY; o.scale.setScalar(scale);
    parent.add(o);
    return o;
  }

  _buildSet() {
    // estate backdrop: HDB blocks, rain trees, the dragon playground and a few neighbours watching
    [[-8.5, -16, 0.1], [-3, -17.5, 0], [3, -17, -0.05], [8.6, -15.5, -0.12]].forEach(([x, z, r]) => this._add('HDBBlock', x, z, r, 1.7));
    this._add('RainTree', -5.2, -4.6, 0.4, 1.1);
    this._add('RainTree', 5.6, -5.2, 2.1, 1.25);
    this._add('RainTree', -1.4, -7.4, 1.0, 0.9);
    this._add('DragonPlayground', 2.6, -3.4, -0.25, 0.9);
    this._add('Bench', -3.4, -2.0, 0.25);
    this._add('LampPost', -4.3, -1.6, 0.2);
    this._add('Bush', -2.6, -2.6, 0.3, 1.4);
    this._add('Bush', 4.6, -2.0, 1.2, 1.3);
    this.crowd = [];
    [['uncle', -2.3, -2.4, 0.4], ['aunty', -1.8, -2.7, 0.3], ['kid', 2.0, -1.9, -0.6], ['student_b', 1.5, -2.6, -0.5], ['parent', -3.2, -3.0, 0.5]].forEach(([w, x, z, r]) => {
      const c = this._add(`Char_${w}_Stand`, x, z, r, 0.95);
      if (c) this.crowd.push(c);
    });
    // chalk rings and the chapteh
    this.chalk = new THREE.Group(); this.set.add(this.chalk);
    this.ch = this._add('Chapteh', 0, 0, 0, CHAPTEH_SCALE, this.scene);
    this.chQ = new THREE.Quaternion();
    this.chShadow = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
    this.chShadow.rotation.x = -Math.PI / 2; this.chShadow.position.y = 0.005;
    this.scene.add(this.chShadow);
    // timing ring (faces the camera) and the three zone pads
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    this.scene.add(this.ring);
    this.pads = {};
    for (const [z, p] of Object.entries(E.ZONES)) {
      const glyph = { L: '◀', C: '▲', R: '▶' }[z];
      const tex = canvasTex(128, 128, (g) => {
        g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fillStyle = ZONE_COLORS[z]; g.globalAlpha = 0.85; g.fill();
        g.globalAlpha = 1; g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
        g.fillStyle = '#fff'; g.font = '800 64px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, 64, 70);
      });
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
      pad.position.set(p.x, p.y, 0.3);
      pad.renderOrder = 5;
      this.scene.add(pad);
      this.pads[z] = pad;
    }
  }

  _kids(mode, outfitIdx) {
    for (const c of [...this.dyn.children]) this.dyn.remove(c);
    for (const c of [...this.chalk.children]) this.chalk.remove(c);
    const xs = mode === 'rally' ? [-E.RALLY_X, E.RALLY_X] : [0];
    const chalkMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    this.kids = xs.map((x, i) => {
      const rig = this.tpl.KidRig.clone(true);
      const o = OUTFITS[mode === 'rally' ? i : outfitIdx % OUTFITS.length];
      const recolor = { CK_Shirt: o.shirt, CK_Shorts: o.shorts, CK_Skin: o.skin, CK_Hair: o.hair, CK_Sock: o.sock, CK_Shoe: o.shoe, CK_Trim: o.trim };
      rig.traverse((m) => { if (m.isMesh && recolor[m.material.name]) { m.material = m.material.clone(); m.material.color.set(recolor[m.material.name]); } });
      rig.position.set(x, 0, 0);
      if (mode === 'rally') rig.rotation.y = i === 0 ? 0.35 : -0.35; // turn a little towards each other
      this.dyn.add(rig);
      const ring = new THREE.Mesh(new THREE.RingGeometry(mode === 'rally' ? 0.62 : 0.78, mode === 'rally' ? 0.66 : 0.82, 64), chalkMat);
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.006, 0); ring.scale.set(1, 0.5, 1);
      this.chalk.add(ring);
      const g = (n) => rig.getObjectByName(n);
      return { rig, x, thigh: { l: g('Kid_ThighL'), r: g('Kid_ThighR') }, shin: { l: g('Kid_ShinL'), r: g('Kid_ShinR') }, arm: { l: g('Kid_ArmL'), r: g('Kid_ArmR') }, fore: { l: g('Kid_ForeL'), r: g('Kid_ForeR') }, body: g('Kid_Body'), head: g('Kid_Head') };
    });
    if (mode === 'rally') {
      for (let i = 0; i < 7; i++) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.22), chalkMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(0, 0.006, 0.9 - i * 0.36);
        this.chalk.add(dash);
      }
    }
  }

  load(s) {
    if (!this.ready) { this.pendingS = s; return; }
    const mode = s.mode === 'rally' ? 'rally' : 'solo';
    this.modeKey = `${mode}|${mode === 'rally' ? '' : s.turn}`;
    this.viewMode = mode;
    this._kids(mode, s.turn);
    for (const p of Object.values(this.pads)) p.visible = mode === 'solo';
    this.hudKey = '';
    this._resize();
    this.frame(s);
  }

  _poseKid(i, s) {
    const K = this.kids[i];
    const pose = s.pose[i];
    const tg = legTargets(pose, s.t);
    const bob = Math.sin(s.t * 6 + i) * 0.006 * (1 - tg.lift);
    K.rig.position.y = bob;
    for (const sd of ['l', 'r']) {
      const sign = sd === 'l' ? -1 : 1;
      const hip = { x: sign * LEG.hipX, y: LEG.hipY };
      const foot = tg[sd];
      let kn;
      if (tg.kneeHint && tg.kneeHint.side === sd) {
        const rest = knee(hip, { x: sign * 0.1, y: 0 }, LEG.thigh, LEG.shin, sign);
        kn = { x: rest.x + (tg.kneeHint.x - rest.x) * tg.kneeHint.k, y: rest.y + (tg.kneeHint.y - rest.y) * tg.kneeHint.k };
      } else kn = knee(hip, foot, LEG.thigh, LEG.shin, sign);
      const a1 = angleDown(hip, kn), a2 = angleDown(kn, foot);
      if (K.thigh[sd]) K.thigh[sd].rotation.set(0, 0, a1);
      if (K.shin[sd]) K.shin[sd].rotation.set(0, 0, a2 - a1);
      // the knee raise points the thigh towards the camera a little
      if (tg.kneeHint && tg.kneeHint.side === sd && K.thigh[sd]) K.thigh[sd].rotation.x = -1.2 * tg.kneeHint.k;
    }
    for (const sd of ['l', 'r']) {
      const sign = sd === 'l' ? -1 : 1;
      if (K.arm[sd]) K.arm[sd].rotation.set(0, 0, sign * (0.12 + tg.lift * 1.05));
      if (K.fore[sd]) K.fore[sd].rotation.set(-0.25 - tg.lift * 0.4, 0, sign * tg.lift * 0.5);
    }
    const lean = pose && tg.lift ? (pose.kind === 'L' ? 0.07 : pose.kind === 'R' ? -0.07 : 0) * tg.lift : 0;
    if (K.body) K.body.rotation.z = lean;
    if (K.head && s.f) {
      const p = E.posAt(s.f, s.t);
      K.head.rotation.y = Math.max(-0.5, Math.min(0.5, (p.x - K.x) * 0.6));
      K.head.rotation.x = -Math.max(-0.3, Math.min(0.35, (p.y - 1.2) * 0.25));
    }
  }

  frame(s) {
    if (!this.ready) { this.pendingS = s; return; }
    const mode = s.mode === 'rally' ? 'rally' : 'solo';
    if (`${mode}|${mode === 'rally' ? '' : s.turn}` !== this.modeKey) this.load(s);
    this.kids.forEach((_, i) => this._poseKid(i, s));
    // crowd sways
    this.crowd.forEach((c, i) => { c.position.y = Math.abs(Math.sin(s.t * 2 + i)) * 0.015; });
    // chapteh
    const show = !!s.f && ['play', 'dropped', 'over', 'done'].includes(s.phase);
    this.ch.visible = show; this.chShadow.visible = show;
    if (show) {
      const p = E.posAt(s.f, s.t);
      const y = Math.max(0, p.y);
      this.ch.position.set(p.x, y + (y <= 0.01 ? 0.02 : 0), 0.2);
      const v = new THREE.Vector3(p.vx, p.vy, 0);
      if (y > 0.02 && v.lengthSq() > 1e-4) {
        // base first: the model's −Y (base) follows the velocity
        this.chQ.setFromUnitVectors(new THREE.Vector3(0, -1, 0), v.normalize());
        this.ch.quaternion.slerp(this.chQ, 0.25);
      } else if (y <= 0.02) this.ch.quaternion.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
      this.chShadow.position.set(p.x, 0.005, 0.2);
      const h = Math.min(1, y / 2);
      this.chShadow.scale.setScalar(1 - h * 0.5);
      this.chShadow.material.opacity = 0.28 - h * 0.15;
    }
    // ring + pads
    const ttk = E.timeToKick(s);
    const tgt = s.phase === 'play' ? E.targetPoint(s) : null;
    if (tgt && ttk < 0.8 && ttk > -0.12) {
      const k = Math.max(0, Math.min(1, ttk / 0.8));
      this.ring.position.set(tgt.x, tgt.y, 0.27);
      this.ring.scale.setScalar(0.07 + k * 0.42);
      this.ring.material.color.set(mode === 'solo' ? ZONE_COLORS[s.to] : E.PLAYER_COLORS[s.to]);
      this.ring.material.opacity = Math.min(1, (0.8 - ttk) / 0.25) * 0.9;
    } else this.ring.material.opacity = 0;
    if (mode === 'solo') for (const [z, pad] of Object.entries(this.pads)) {
      const live = s.phase === 'play' || s.phase === 'dropped';
      pad.material.opacity = live ? (s.to === z && s.phase === 'play' ? 0.95 : 0.3) : 0;
    }
    // countdown
    const txt = s.phase === 'countdown' && Math.ceil(s.countdown) > 0 ? String(Math.ceil(s.countdown)) : '';
    if (this.countEl.textContent !== txt) { this.countEl.textContent = txt; this.countEl.classList.remove('pop'); void this.countEl.offsetWidth; if (txt) this.countEl.classList.add('pop'); }
    this._hud(s);
  }

  _hud(s) {
    if (s.phase === 'idle') { if (this.hudKey !== 'idle') { this.hudKey = 'idle'; this.hud.innerHTML = ''; } return; }
    const key = s.mode === 'rally' ? `r|${s.players.map((p) => p.points).join(',')}` : `s|${E.current(s).score}|${s.combo}|${s.lives}|${s.turn}`;
    if (key === this.hudKey) return;
    this.hudKey = key;
    if (s.mode === 'rally') {
      const [a, b] = s.players;
      this.hud.innerHTML = `<div class="h3-side" style="--c:${a.color}"><small>${esc(a.name)}</small><b>${a.points}</b></div><div class="h3-mid">First to ${s.target}</div><div class="h3-side right" style="--c:${b.color}"><small>${esc(b.name)}</small><b>${b.points}</b></div>`;
      return;
    }
    const pl = E.current(s);
    const mult = 1 + Math.min(4, Math.floor(s.combo / 8));
    this.hud.innerHTML = `<div class="h3-side"><small>${s.mode === 'turns' ? esc(pl.name) : 'Score'}</small><b>${pl.score}</b>${s.combo >= 3 ? `<em class="${mult > 1 ? 'hot' : ''}">${s.combo} combo${mult > 1 ? ` · ×${mult}` : ''}</em>` : ''}</div>
      <div class="h3-lives">${[0, 1, 2].map((i) => `<i class="${i < s.lives ? 'on' : ''}"></i>`).join('')}</div>`;
  }

  _float(text, wx, wy, cls) {
    const v = new THREE.Vector3(wx, wy, 0).project(this.camera);
    const el = document.createElement('div');
    el.className = `float3d ${cls}`;
    el.textContent = text;
    el.style.left = `${((v.x + 1) / 2) * 100}%`;
    el.style.top = `${((1 - v.y) / 2) * 100}%`;
    this.floats.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  react(ev, s) {
    if (!this.ready) return;
    if (ev.type === 'kick') {
      const [label, cls] = GRADE[ev.grade];
      this._float(ev.bonus ? `GOLDEN +${ev.bonus}` : ev.smash ? 'SMASH!' : label, ev.at.x, ev.at.y + 0.28, cls);
    } else if (ev.type === 'whiff') {
      const k = this.kids[ev.p];
      if (k) this._float('whiff!', k.x, 1.55, 'plain');
    } else if (ev.type === 'drop') {
      this._float('Aiyoh!', ev.at.x, 0.5, 'bad');
    } else if (ev.type === 'point') {
      this._float(`Point ${s.players[ev.winner].name}!`, ev.at.x, 0.6, 'bad');
    }
  }

  setMode(mode) { this.mode = mode; this.stage.dataset.mode = mode; }

  _resize() {
    const w = this.stage.clientWidth || 1, h = this.stage.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const cam = this.camera;
    cam.aspect = w / h;
    // keep the kid(s) and the top of the arcs in view
    const halfW = this.viewMode === 'rally' ? 2.55 : 1.45, halfH = 1.25;
    const vHalf = THREE.MathUtils.degToRad(cam.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * cam.aspect);
    const dist = Math.max(halfH / Math.tan(vHalf), halfW / Math.tan(hHalf)) + 0.4;
    this.look.set(0, 1.0, 0);
    cam.position.set(0, 1.35, dist);
    cam.lookAt(this.look);
    cam.updateProjectionMatrix();
  }
}
