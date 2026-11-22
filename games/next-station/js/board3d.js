// Next Station — 3D cab view (Three.js). Same adapter API as Board2D:
//   load(s) · render(s, dt) · event(ev, s) · setMode(mode) · hud
// The line is built along -Z from the engine's layout (1 m of track = 1 unit). The camera sits in the
// driver's cab, which moves with the front of the train.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as E from './engine.js';
import { Hud } from './hud.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const EYE = 2.45;            // driver's eye height above the rail
const CAB_BACK = 1.6;        // eye sits this far behind the nose
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const CAST = ['aunty', 'uncle', 'ns', 'worker_a', 'worker_b', 'student_a', 'student_b', 'parent'];
const LOOK = {
  day: { bg: 0x9fd3ec, fog: 0xcfe6ee, hemi: 1.05, sun: 2.3, sunCol: 0xfff1d6, near: 60, far: 460 },
  dusk: { bg: 0xf2a77c, fog: 0xe8b08e, hemi: 0.75, sun: 1.3, sunCol: 0xffb070, near: 50, far: 380 },
  night: { bg: 0x0e1430, fog: 0x1a2040, hemi: 0.32, sun: 0.25, sunCol: 0x9fb4ff, near: 30, far: 260 },
};

export class Board3D {
  constructor(el, { modelUrl = '../models/station-assets.glb', fallbackHref = '../' } = {}) {
    this.el = el;
    el.classList.add('stage-3d');
    el.innerHTML = `
      <canvas class="gl" aria-label="View from the driver's cab"></canvas>
      <div class="loading" role="status"><div class="spinner" aria-hidden="true"></div><p>Signing in at the depot… <span class="pct">0%</span></p></div>`;
    this.canvas = el.querySelector('canvas');
    this.loadingEl = el.querySelector('.loading');
    this.hud = new Hud(el);
    this.t = 0;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    } catch {
      this.loadingEl.innerHTML = `<p>Your browser can't run the 3D version.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
      return;
    }
    window.__nextStation3D = this; // handy for poking at the scene from the console
    const r = this.renderer;
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = false; // the whole line is lit by sun and sky; no shadow maps keeps phones smooth
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xcfe6ee, 60, 460);
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.05, 600);
    this.rig = new THREE.Group();
    this.rig.add(this.camera);
    this.camera.position.set(0, EYE, 0);
    this.scene.add(this.rig);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x7a6a4a, 1.0);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
    this.scene.add(this.sun, this.sun.target);
    this.head = new THREE.SpotLight(0xfff4d6, 0, 140, 0.5, 0.6, 1.2);
    this.head.position.set(0, 1.2, -1);
    this.head.target.position.set(0, 0.4, -40);
    this.rig.add(this.head, this.head.target);
    this.stationLight = new THREE.PointLight(0xfff0d0, 0, 60, 1.6);
    this.scene.add(this.stationLight);
    this._resize();
    new ResizeObserver(() => this._resize()).observe(el);
    this._load(modelUrl).catch((err) => {
      console.error(err);
      this.loadingEl.innerHTML = `<p>Couldn't load the 3D line.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
    });
  }

  async _load(url) {
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url, (e) => {
      if (e.total) this.loadingEl.querySelector('.pct').textContent = `${Math.round((e.loaded / e.total) * 100)}%`;
    });
    this.tpl = {};
    for (const c of [...gltf.scene.children]) { c.position.set(0, 0, 0); this.tpl[c.name.replace(/_\d+$/, '')] = c; }
    // the cab rides with the camera; its screens get live canvas textures
    this.cab = this.tpl.Cab.clone(true);
    this.cab.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; o.renderOrder = 10; } });
    this.camera.add(this.cab);
    this.cab.position.set(0, 0.24, 0.05);   // sits a little high so the desk shows at the bottom of the view
    this.lever = this.cab.getObjectByName('CabLever');
    this.screen = this._screenTex(512, 320);
    this.screen2 = this._screenTex(256, 160);
    const scr = this.cab.getObjectByName('CabScreen'), scr2 = this.cab.getObjectByName('CabScreen2');
    if (scr) scr.material = new THREE.MeshBasicMaterial({ map: this.screen.tex, toneMapped: false });
    if (scr2) scr2.material = new THREE.MeshBasicMaterial({ map: this.screen2.tex, toneMapped: false });
    this.ready = true;
    this.loadingEl.classList.add('done');
    if (this.pending) { const s = this.pending; this.pending = null; this.load(s); }
  }

  _canvasTex(w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { cv, g: cv.getContext('2d'), tex };
  }

  _screenTex(w, h) {
    const c = this._canvasTex(w, h);
    c.tex.flipY = false; // the cab screens' UVs run top-down
    return c;
  }

  setMode(mode) { this.el.dataset.mode = mode; }

  // ---------------- building the line ----------------
  _clone(name, x, y, z, ry = 0, s = 1, parent = this.world) {
    const t = this.tpl[name];
    if (!t) return null;
    const o = t.clone(true);
    o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(s);
    parent.add(o);
    return o;
  }

  /** Many copies of a template as instanced meshes, chunked along the track so far chunks get culled. */
  _scatter(name, places, chunk = 150) {
    const t = this.tpl[name];
    if (!t || !places.length) return;
    t.updateMatrixWorld(true);
    const parts = [];
    t.traverse((o) => { if (o.isMesh) parts.push({ geo: o.geometry, mat: o.material, m: new THREE.Matrix4().copy(t.matrixWorld).invert().multiply(o.matrixWorld) }); });
    const groups = new Map();
    for (const p of places) { const k = Math.floor(-p.z / chunk); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); }
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    for (const list of groups.values()) {
      for (const part of parts) {
        const im = new THREE.InstancedMesh(part.geo, part.mat, list.length);
        list.forEach((p, i) => {
          Q.setFromAxisAngle(Y, p.ry || 0); S.setScalar(p.s || 1); P.set(p.x, p.y || 0, p.z);
          M.compose(P, Q, S).multiply(part.m);
          im.setMatrixAt(i, M);
        });
        im.castShadow = !!places.shadow; im.receiveShadow = true;
        im.computeBoundingSphere();
        this.world.add(im);
      }
    }
  }

  _signTex(key, draw, w = 256, h = 256) {
    (this.texCache ||= new Map());
    if (this.texCache.has(key)) return this.texCache.get(key);
    const c = this._canvasTex(w, h);
    draw(c.g, w, h);
    c.tex.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ map: c.tex, roughness: 0.5 });
    this.texCache.set(key, mat);
    return mat;
  }

  load(s) {
    if (!this.ready) { this.pending = s; return; }
    this.s = s;
    if (this.world) { this.scene.remove(this.world); this.world.traverse((o) => { if (o.isInstancedMesh) o.dispose(); }); }
    this.world = new THREE.Group();
    this.scene.add(this.world);
    const L = s.line, map = s.map;
    const end = map.end + 160, start = -160;
    const look = LOOK[L.time] || LOOK.day;
    this.look = look;
    this.scene.background = new THREE.Color(look.bg);
    this.hemi.intensity = look.hemi;
    this.sun.color.set(look.sunCol);
    this.sun.intensity = look.sun;
    const envAt = (x) => (map.envs.find((e) => x >= e.from && x < e.to) || (x < 0 ? map.envs[0] : map.envs[map.envs.length - 1])).env;
    const lineCol = new THREE.Color(L.color);

    // ground far below, rails, third rail
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, end - start + 600), new THREE.MeshStandardMaterial({ color: L.time === 'night' ? 0x1f2b25 : 0x7fa35a, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -16, -(start + end) / 2); ground.receiveShadow = true;
    this.world.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(14, end - start + 600), new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.9 }));
    road.rotation.x = -Math.PI / 2; road.position.set(-26, -15.95, -(start + end) / 2);
    this.world.add(road);
    const steel = new THREE.MeshStandardMaterial({ color: 0x9aa1a7, metalness: 0.85, roughness: 0.35 });
    for (const x of [-0.7175, 0.7175]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, end - start), steel);
      rail.position.set(x, 0.075, -(start + end) / 2); rail.receiveShadow = true;
      this.world.add(rail);
    }
    const third = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, end - start), new THREE.MeshStandardMaterial({ color: 0x5c5850, roughness: 0.6 }));
    third.position.set(1.45, 0.2, -(start + end) / 2);
    this.world.add(third);

    // viaduct spans, embankments, tunnels
    const spans = [], rings = [], fences = [];
    const tunnels = [];
    for (const e of map.envs) if (e.env === 'tunnel') {
      const prev = tunnels[tunnels.length - 1];
      if (prev && Math.abs(prev.to - e.from) < 1) prev.to = e.to; else tunnels.push({ from: e.from, to: e.to });
    }
    // stations sit in the open, so tunnels stop short of the platforms
    for (const t of tunnels) {
      const a = t.from + (map.marks.some((m) => Math.abs(m - t.from) < 1) ? 30 : 0);
      const b = t.to - (map.marks.some((m) => Math.abs(m - t.to) < 1) ? E.PLATFORM + 12 : 0);
      t.a = a; t.b = b;
      for (let x = a; x < b; x += 6) rings.push({ x: 0, z: -x });
      // a green hill over the tunnel with a portal at each end
      const hill = new THREE.Mesh(new THREE.BoxGeometry(80, 22, b - a), new THREE.MeshStandardMaterial({ color: L.time === 'night' ? 0x1e3a2a : 0x6e9a4e, roughness: 1 }));
      hill.geometry.groups = hill.geometry.groups.filter((gr) => gr.materialIndex !== 4 && gr.materialIndex !== 5);
      hill.material = [hill.material, hill.material, hill.material, hill.material, hill.material, hill.material];
      hill.position.set(0, -5, -(a + b) / 2);
      this.world.add(hill);
      for (const zx of [a, b]) {
        const shape = new THREE.Shape();
        shape.moveTo(-40, -16); shape.lineTo(40, -16); shape.lineTo(40, 6); shape.lineTo(-40, 6); shape.lineTo(-40, -16);
        const hole = new THREE.Path();
        hole.moveTo(3, -0.3); hole.lineTo(3, 1.2);
        for (let i = 0; i <= 16; i++) { const an = Math.PI * i / 16; hole.lineTo(3 * Math.cos(an), 1.2 + 2.85 * Math.sin(an)); }
        hole.lineTo(-3, -0.3); hole.lineTo(3, -0.3);
        shape.holes.push(hole);
        const portal = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: 0xc9c1b1, roughness: 0.9, side: THREE.DoubleSide }));
        portal.position.set(0, 0, -zx);
        this.world.add(portal);
      }
    }
    this.tunnels = tunnels;
    this._scatter('TunnelRing', rings, 120);
    for (let x = start; x < end; x += 30) if (!tunnels.some((t) => x + 15 > t.a && x + 15 < t.b)) spans.push({ x: 0, z: -x });
    this._scatter('ViaductSpan', spans, 240);

    // scenery outside the tunnels: HDB blocks, rain trees, a fence on the ground sections
    const outside = (x) => !tunnels.some((t) => x > t.a - 20 && x < t.b + 20);
    const blocks = [], trees = [];
    let k = 0;
    for (let x = start; x < end; x += 38) {
      for (const side of [-1, 1]) {
        k += 1;
        if (!outside(x)) continue;
        const r = hash(k * 3.7);
        if (r > 0.2) blocks.push({ x: side * (34 + hash(k) * 40), y: -16, z: -(x + hash(k * 2) * 20), ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, s: 9 + hash(k * 5) * 3 });
        if (hash(k * 9.1) > 0.45) trees.push({ x: side * (12 + hash(k * 4) * 8), y: -16, z: -(x + 10), ry: hash(k) * 6, s: 4 + hash(k * 7) * 1.5 });
      }
    }
    trees.shadow = false;
    this._scatter('HDBBlock', blocks, 200);
    this._scatter('RainTree', trees, 200);
    for (const e of map.envs) if (e.env === 'ground') for (let x = e.from; x < e.to; x += 10) for (const side of [-1, 1]) fences.push({ x: side * 3.6, y: 0, z: -x });
    this._scatter('Fence', fences, 150);

    // stations: platforms, signs, the stop board and the people waiting
    this.stations = map.marks.map((m, i) => {
      const g = new THREE.Group();
      this.world.add(g);
      for (let x = m - E.PLATFORM + 4; x < m + 4; x += 10) {
        const mod = this._clone('PlatformModule', 0, 0, -x, 0, 1, g);
        mod.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; if (/^(PSDHeader|Fascia)/.test(o.name)) { o.material = o.material.clone(); o.material.color.copy(lineCol); } } });
      }
      const nameMat = this._signTex(`st-${L.id}-${i}`, (c, w, h) => {
        c.fillStyle = '#FFFDF7'; c.fillRect(0, 0, w, h);
        c.fillStyle = L.color; c.fillRect(0, 0, 70, h);
        c.fillStyle = '#fff'; c.font = '800 54px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(L.name[0], 35, h / 2 + 2);
        c.fillStyle = '#2A1A12'; c.textAlign = 'left';
        let fs = 60; c.font = `800 ${fs}px 'Bricolage Grotesque', system-ui, sans-serif`;
        while (c.measureText(L.stations[i]).width > w - 110 && fs > 26) { fs -= 2; c.font = `800 ${fs}px 'Bricolage Grotesque', system-ui, sans-serif`; }
        c.fillText(L.stations[i], 92, h / 2 + 3);
      }, 1024, 170);
      for (const x of [m - E.PLATFORM * 0.78, m - E.PLATFORM * 0.42, m - 12]) {
        const sign = this._clone('StationSign', -2.6, 4.6, -x, 0, 1, g);
        sign.traverse((o) => { if (o.isMesh && /^SignFace/.test(o.name)) o.material = nameMat; });
      }
      this._clone('StopBoard', -1.85, 1.11, -m, 0, 1, g);
      for (const x of [m - 70, m - 30]) this._clone('Bench', -5.4, 1.11, -x, 0, 1, g);
      const people = [];
      const n = 7 + Math.floor(hash(i * 3 + L.id.length) * 4);
      for (let p = 0; p < n; p++) {
        const key = CAST[Math.floor(hash(i * 11 + p * 3) * CAST.length)];
        const x = m - 8 - hash(i * 7 + p) * (E.PLATFORM - 20);
        const o = this._clone(`Char_${key}_Stand`, -2.4 - hash(p * 13 + i) * 1.6, 1.11, -x, Math.PI / 2 + (hash(p + i) - 0.5) * 0.8, 1, g);
        if (o) { o.traverse((q) => { if (q.isMesh) q.castShadow = false; }); people.push({ o, x0: o.position.x, z0: o.position.z, ph: hash(p * 3 + i) * 6 }); }
      }
      return { g, people, m, doors: [] };
    });

    // line-side signs
    for (const z of map.zones) {
      const mat = this._signTex(`lim-${z.kmh}`, (c, w, h) => {
        c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
        c.fillStyle = '#2A1A12'; c.font = '800 120px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(z.kmh, w / 2, h / 2 + 6);
      });
      const warn = this._signTex(`warn-${z.kmh}`, (c, w, h) => {
        c.fillStyle = '#F2C230'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#2A1A12'; c.font = '800 110px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(z.kmh, w / 2, h / 2 + 6);
      });
      const a = this._clone('SpeedSign', 2.9, 0, -z.from);
      a.traverse((o) => { if (o.isMesh && o.name.startsWith('SignDisc')) o.material = mat; });
      const b = this._clone('WarnSign', 2.9, 0, -(z.from - 140));
      b.traverse((o) => { if (o.isMesh && o.name.startsWith('WarnFace')) o.material = warn; });
      this._clone('EndSign', 2.9, 0, -(z.to + E.TRAIN_LEN));
    }

    // sleepers: a moving window of instances that follows the train
    if (this.sleepers) this.scene.remove(this.sleepers);
    this.sleepers = new THREE.Group();
    const sl = this.tpl.Sleeper;
    if (sl) {
      const parts = [];
      sl.updateMatrixWorld(true);
      sl.traverse((o) => { if (o.isMesh) parts.push(o); });
      const N = 280;
      const M = new THREE.Matrix4();
      for (const p of parts) {
        const im = new THREE.InstancedMesh(p.geometry, p.material, N);
        const local = new THREE.Matrix4().copy(sl.matrixWorld).invert().multiply(p.matrixWorld);
        for (let i = 0; i < N; i++) { M.makeTranslation(0, 0, -i * 0.7 + 12).multiply(local); im.setMatrixAt(i, M); }
        im.frustumCulled = false; im.receiveShadow = true;
        this.sleepers.add(im);
      }
    }
    this.scene.add(this.sleepers);

    // rain
    if (this.rainMesh) { this.rig.remove(this.rainMesh); this.rainMesh = null; }
    if (L.weather === 'rain') {
      const n = 700, pos = new Float32Array(n * 6);
      this.rainDrops = Array.from({ length: n }, () => ({ x: (Math.random() - 0.5) * 30, y: Math.random() * 14 - 3, z: -Math.random() * 40 }));
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.rainMesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xaab8cc, transparent: true, opacity: 0.5 }));
      this.rainMesh.frustumCulled = false;
      this.rig.add(this.rainMesh);
    }
    this.boarding = -1;
    this.render(s, 0);
  }

  event(ev) {
    if (ev.type === 'arrive') this.boarding = this.s.seg;
  }

  // ---------------- every frame ----------------
  render(s, dt) {
    if (!this.ready) { this.pending = s; return; }
    if (s !== this.s) { this.load(s); return; }
    this.t += dt;
    const z = -s.x + CAB_BACK;
    this.rig.position.set(0, 0, z);
    // a touch of sway with the track and the brakes
    this.camera.position.set(Math.sin(this.t * 2.1) * 0.006 * Math.min(1, s.v / 10), EYE + Math.sin(this.t * 13) * 0.003 * Math.min(1, s.v / 8), 0);
    this.camera.rotation.set(-0.06 + (s.a || 0) * 0.012, 0, Math.sin(this.t * 1.3) * 0.002 * Math.min(1, s.v / 10));
    if (this.sleepers) this.sleepers.position.z = -Math.floor(s.x / 0.7) * 0.7;
    // light and fog: open air vs tunnel
    const inTunnel = (this.tunnels || []).some((t) => s.x > t.a + 2 && s.x < t.b - 4);
    const look = this.look;
    const fogTarget = inTunnel ? { col: 0x14171a, near: 4, far: 110 } : { col: look.fog, near: look.near, far: look.far };
    const f = this.scene.fog;
    f.color.lerp(new THREE.Color(fogTarget.col), Math.min(1, dt * 3));
    f.near += (fogTarget.near - f.near) * Math.min(1, dt * 3);
    f.far += (fogTarget.far - f.far) * Math.min(1, dt * 3);
    const dark = inTunnel || s.line.time === 'night';
    this.hemi.intensity += ((inTunnel ? 0.22 : look.hemi) - this.hemi.intensity) * Math.min(1, dt * 3);
    this.sun.intensity += ((inTunnel ? 0 : look.sun) - this.sun.intensity) * Math.min(1, dt * 3);
    this.head.intensity = dark ? 60 : 0;
    this.sun.position.set(-30, 60, z + 20); this.sun.target.position.set(0, 0, z - 20);
    // station lights near the next stop after dark
    const m = E.nextMark(s);
    this.stationLight.position.set(-2.5, 6, -m + 50);
    this.stationLight.intensity = s.line.time !== 'day' ? 400 : 0;
    // master controller handle
    if (this.lever) this.lever.rotation.x = ((s.atp ? 0 : s.notch) - E.N_IDX) * -0.11;
    // people board when the doors open
    if (this.stations) this.stations.forEach((st, i) => {
      const here = this.boarding === i && (s.phase === 'doors' || s.phase === 'depart') && s.seg === i;
      st.people.forEach((p, k) => {
        if (here && s.phase === 'doors' && s.phaseT > 0.5) {
          const kk = Math.min(1, (s.phaseT - 0.5 - k * 0.15) / 1.4);
          if (kk > 0) { p.o.position.x = p.x0 + (-0.9 - p.x0) * kk; p.o.rotation.y = Math.PI / 2; p.o.visible = kk < 0.98; }
        } else if (!p.o.visible && st.m > s.x + 200) { p.o.visible = true; p.o.position.x = p.x0; }
        else if (p.o.visible) p.o.position.y = 1.11 + Math.abs(Math.sin(this.t * 1.5 + p.ph)) * 0.008;
      });
    });
    if (this.rainMesh) this._rain(s, dt);
    this._screens(s);
    this.hud.update(s);
    this.renderer.render(this.scene, this.camera);
  }

  _rain(s, dt) {
    const pos = this.rainMesh.geometry.attributes.position.array;
    const vz = 4 + s.v;
    this.rainDrops.forEach((d, i) => {
      d.y -= 16 * dt; d.z += vz * dt;
      if (d.y < -3 || d.z > 2) { d.y = 10 + Math.random() * 4; d.z = -Math.random() * 40; d.x = (Math.random() - 0.5) * 30; }
      const j = i * 6;
      pos[j] = d.x; pos[j + 1] = d.y + EYE; pos[j + 2] = d.z;
      pos[j + 3] = d.x; pos[j + 4] = d.y + EYE + 0.35; pos[j + 5] = d.z - 0.02 * vz;
    });
    this.rainMesh.geometry.attributes.position.needsUpdate = true;
  }

  _screens(s) {
    if (!this.screen || this.t - (this.scrT || 0) < 0.08) return;
    this.scrT = this.t;
    const { g, cv, tex } = this.screen;
    const w = cv.width, h = cv.height;
    const sp = Math.round(s.v * 3.6), lim = E.limitAt(s, s.x);
    g.fillStyle = '#0B141B'; g.fillRect(0, 0, w, h);
    // speed arc
    const cx = 150, cy = 175, R = 120;
    g.lineWidth = 18; g.lineCap = 'round';
    g.strokeStyle = '#22313B'; g.beginPath(); g.arc(cx, cy, R, Math.PI * 0.8, Math.PI * 2.2); g.stroke();
    const k = Math.min(1, s.v * 3.6 / 100);
    g.strokeStyle = sp > lim + 2 ? '#FF4D5E' : '#5FE08A'; g.beginPath(); g.arc(cx, cy, R, Math.PI * 0.8, Math.PI * (0.8 + 1.4 * k)); g.stroke();
    const lk = Math.min(1, lim / 100), la = Math.PI * (0.8 + 1.4 * lk);
    g.strokeStyle = '#FF4D5E'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx + Math.cos(la) * (R - 18), cy + Math.sin(la) * (R - 18)); g.lineTo(cx + Math.cos(la) * (R + 18), cy + Math.sin(la) * (R + 18)); g.stroke();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 84px system-ui, sans-serif'; g.fillText(sp, cx, cy - 6);
    g.font = '700 24px system-ui, sans-serif'; g.fillStyle = '#9FB4C0'; g.fillText('km/h', cx, cy + 46);
    // right column: limit, notch, distance
    g.textAlign = 'left';
    g.fillStyle = '#fff'; g.beginPath(); g.arc(340, 70, 42, 0, 7); g.fill();
    g.strokeStyle = '#D7263D'; g.lineWidth = 9; g.stroke();
    g.fillStyle = '#111'; g.font = '800 36px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(lim, 340, 72);
    const notch = E.NOTCHES[s.atp ? 0 : s.notch];
    g.fillStyle = notch[0] === 'P' ? '#5FE08A' : notch === 'N' ? '#E8EEF2' : '#FF8A8A';
    g.font = '800 52px system-ui, sans-serif'; g.fillText(notch, 440, 72);
    const d = E.nextMark(s) - s.x;
    g.fillStyle = '#F2B134'; g.font = '800 46px system-ui, sans-serif'; g.textAlign = 'right';
    g.fillText(s.phase === 'doors' ? 'DOORS' : `${d > 20 ? Math.round(d) : d.toFixed(1)} m`, 500, 175);
    g.fillStyle = '#9FB4C0'; g.font = '700 22px system-ui, sans-serif';
    g.fillText(s.line.stations[Math.min(s.seg + 1, s.line.stations.length - 1)].toUpperCase().slice(0, 18), 500, 222);
    if (s.atp) { g.fillStyle = '#FF4D5E'; g.font = '800 30px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('ATP BRAKE', w / 2, h - 30); }
    tex.needsUpdate = true;
    // small screen: line colour and comfort
    const b = this.screen2;
    b.g.fillStyle = '#0B141B'; b.g.fillRect(0, 0, 256, 160);
    b.g.fillStyle = s.line.color; b.g.fillRect(0, 0, 256, 34);
    b.g.fillStyle = '#fff'; b.g.font = '800 22px system-ui, sans-serif'; b.g.textAlign = 'left'; b.g.textBaseline = 'middle'; b.g.fillText(s.line.name.toUpperCase(), 12, 18);
    b.g.fillStyle = '#9FB4C0'; b.g.font = '700 18px system-ui, sans-serif'; b.g.fillText('COMFORT', 12, 70);
    b.g.fillStyle = '#22313B'; b.g.fillRect(12, 88, 232, 22);
    b.g.fillStyle = s.comfort > 38 ? '#5FE08A' : s.comfort > 20 ? '#F2B134' : '#FF4D5E'; b.g.fillRect(12, 88, 232 * Math.max(0, s.comfort) / 50, 22);
    b.g.fillStyle = '#fff'; b.g.font = '800 20px system-ui, sans-serif'; b.g.fillText(`${s.total} PTS`, 12, 136);
    b.tex.needsUpdate = true;
  }

  _resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    if (!this.renderer) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep a similar sideways view on narrow screens
    this.camera.fov = w / h < 1 ? 74 : w / h < 1.4 ? 64 : 56;
    this.camera.updateProjectionMatrix();
    if (this.s) this.render(this.s, 0);
  }
}
