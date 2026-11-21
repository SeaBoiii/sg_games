// Marina Mini Golf — 3D board (Three.js). Same adapter API as Board2D:
//   load(s) · frame(s, aim) · toWorld(clientX, clientY) · react(event, s) · setMode(mode) · setBallColor(c)
// The floor is the 2D hole art rendered to a texture; walls, water, landmarks, the train and the
// Flyer arms are 3D on top of it (Blender models from ../models/golf-assets.glb).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as E from './engine.js';
import { THEME, holeSVG } from './art.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const K = 0.1; // metres per world unit
const X = (x) => (x - 50) * K;
const Z = (y) => (y - 31) * K;
const CAST = ['uncle', 'aunty', 'student_a', 'kid', 'worker_a', 'parent', 'ns', 'student_b', 'expecting', 'worker_b'];
const SKY = { merlion: 0xbfe0f5, mbs: 0xf3c7a6, jewel: 0xcfe7de, supertree: 0xc8e4d2 };
const VB = { x: -200, y: -150, w: 1400, h: 920 }; // floor texture covers a bit more than the play box

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const polyShape = (poly) => {
  const s = new THREE.Shape();
  poly.forEach(([x, y], i) => (i ? s.lineTo(X(x), -Z(y)) : s.moveTo(X(x), -Z(y))));
  s.closePath();
  return s;
};
// shapes are built in the XY plane with y = -Z, so rotating -90° about X puts them flat on the ground
const flat = (geo, y = 0) => { geo.rotateX(-Math.PI / 2); geo.translate(0, y, 0); return geo; };

export class Board3D {
  constructor(stage, { modelUrl = '../models/golf-assets.glb', fallbackHref = '../' } = {}) {
    this.stage = stage;
    this.mode = 'idle';
    this.color = '#E0457B';
    this.view = 'overview';
    stage.classList.add('stage-3d');
    stage.innerHTML = `
      <canvas class="gl" aria-label="3D mini golf course"></canvas>
      <div class="floats3d" aria-hidden="true"></div>
      <div class="cam-btns"><button type="button" class="cam-view" aria-label="Switch camera" title="Switch camera">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="13" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 11l5-3v9l-5-3z" fill="currentColor"/></svg></button></div>
      <div class="loading" role="status"><div class="spinner" aria-hidden="true"></div><p>Mowing the greens… <span class="pct">0%</span></p></div>`;
    this.canvas = stage.querySelector('canvas');
    this.floats = stage.querySelector('.floats3d');
    this.loadingEl = stage.querySelector('.loading');
    stage.querySelector('.cam-view').onclick = () => { this.view = this.view === 'overview' ? 'low' : 'overview'; this._fit(); };
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
    r.toneMappingExposure = 0.95;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcfe9f7);
    this.scene.fog = new THREE.Fog(0xcfe9f7, 16, 40);
    this.scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.3;
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80);
    this.camPos = new THREE.Vector3(0, 7, 5);
    this.camLook = new THREE.Vector3(0, 0, 0.2);
    this.camWant = this.camPos.clone();
    this.lookWant = this.camLook.clone();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6a7f5a, 0.75));
    const sun = new THREE.DirectionalLight(0xfff2dc, 1.9);
    sun.position.set(-4, 9, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 6, bottom: -6, near: 1, far: 30 });
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);
    this.outer = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: 0x5d9c50, roughness: 0.95 }));
    this.outer.rotation.x = -Math.PI / 2;
    this.outer.position.y = -0.012;
    this.outer.receiveShadow = true;
    this.scene.add(this.outer);
    this.hole = new THREE.Group();
    this.scene.add(this.hole);
    this._makeBall();
    this._makeAim();
    this.ray = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._resize();
    new ResizeObserver(() => this._resize()).observe(stage);
    this.clock = new THREE.Clock();
    r.setAnimationLoop(() => this._render());
    this._load(modelUrl).catch((err) => {
      console.error(err);
      this.loadingEl.innerHTML = `<p>Couldn't load the 3D course.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
    });
  }

  get surface() { return this.canvas; }

  async _load(url) {
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url, (e) => {
      if (e.total) this.loadingEl.querySelector('.pct').textContent = `${Math.round((e.loaded / e.total) * 100)}%`;
    });
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.tpl = {};
    for (const c of [...gltf.scene.children]) { c.position.set(0, 0, 0); this.tpl[c.name] = c; }
    this.ready = true;
    this.loadingEl.classList.add('done');
    if (this.pendingS) { const s = this.pendingS; this.pendingS = null; this.load(s); }
  }

  _clone(name, x, y, { scale = 1, rotY = 0, lift = 0 } = {}) {
    const t = this.tpl && this.tpl[name];
    if (!t) return null;
    const o = t.clone(true);
    o.position.set(x, lift, y);
    o.rotation.y = rotY;
    o.scale.setScalar(scale);
    this.hole.add(o);
    return o;
  }

  _makeBall() {
    this.ballMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.32, metalness: 0.05 });
    const R = E.BALL_R * K;
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20), this.ballMat);
    this.ball.castShadow = true;
    // a white band so you can see it roll
    const band = new THREE.Mesh(new THREE.TorusGeometry(R * 0.985, R * 0.12, 8, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
    this.ball.add(band);
    this.scene.add(this.ball);
    this.rollQ = new THREE.Quaternion();
  }

  _makeAim() {
    const g = new THREE.Group();
    this.aimMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
    const dots = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.025, 12), this.aimMat);
      d.rotation.x = -Math.PI / 2;
      dots.add(d);
    }
    const headShape = new THREE.Shape();
    headShape.moveTo(0, 0.09); headShape.lineTo(0.16, 0); headShape.lineTo(0, -0.09); headShape.closePath();
    const head = new THREE.Mesh(flat(new THREE.ShapeGeometry(headShape)), this.aimMat);
    const ring = new THREE.Mesh(flat(new THREE.RingGeometry(0.17, 0.2, 40)), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
    g.add(dots, head, ring);
    g.position.y = 0.015;
    g.visible = false;
    this.aim = { g, dots, head, ring };
    this.scene.add(g);
  }

  setBallColor(c) {
    this.color = c;
    this.ballMat.color.set(c);
  }

  // ---------------- building a hole ----------------
  load(s) {
    if (!this.ready) { this.pendingS = s; this.h = null; return; }
    const h = E.holeOf(s);
    this.h = h;
    this.holeId = h.id;
    const T = THEME[h.id];
    // clear previous
    for (const c of [...this.hole.children]) {
      this.hole.remove(c);
      c.traverse((o) => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); });
    }
    this.anim = [];
    this.scene.background.set(SKY[h.id] || 0xcfe9f7);
    this.scene.fog.color.set(SKY[h.id] || 0xcfe9f7);
    this.outer.material.color.set(T.ground);
    this._floor(h);
    this._walls(h, T);
    this._blocks(h);
    this._circles(h);
    this._zones(h);
    this._movers(h);
    this.flag = this._clone('Flag', X(h.cup[0]), Z(h.cup[1]));
    this._scenery(h);
    this.ballY = 0;
    this._fit(true);
    this.frame(s, null);
  }

  _floor(h) {
    const svg = holeSVG(h, 'f-', { flat: true }).under;
    const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" width="2800" height="1840">
      <style>.sc-text{font:800 15px 'Segoe UI',system-ui,sans-serif;letter-spacing:.08em}.sc-text.small{font-size:12px}</style>${svg}</svg>`;
    const tex = new THREE.Texture();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = 2800; cv.height = 1840;
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      tex.image = cv;
      tex.needsUpdate = true;
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(new Blob([doc], { type: 'image/svg+xml' }));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry((VB.w / 10) * K, (VB.h / 10) * K), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(X((VB.x + VB.w / 2) / 10), 0, Z((VB.y + VB.h / 2) / 10));
    floor.receiveShadow = true;
    this.hole.add(floor);
  }

  _walls(h, T) {
    const poly = h.outline;
    // orientation: outward normal side
    let area = 0;
    poly.forEach(([x1, y1], i) => { const [x2, y2] = poly[(i + 1) % poly.length]; area += x1 * y2 - x2 * y1; });
    const sgn = area > 0 ? 1 : -1; // y is down, so positive area = clockwise on screen
    const th = 1.3, ht = 0.09;
    const wallMat = new THREE.MeshStandardMaterial({ color: T.rim, roughness: 0.7 });
    const capMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(T.rim).offsetHSL(0, 0, 0.08), roughness: 0.6 });
    poly.forEach(([x1, y1], i) => {
      const [x2, y2] = poly[(i + 1) % poly.length];
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
      // outward normal in world (x,y)
      const nx = (-dy / L) * -sgn, ny = (dx / L) * -sgn;
      const cx = (x1 + x2) / 2 + nx * th / 2, cy = (y1 + y2) / 2 + ny * th / 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(L * K, ht, th * K), wallMat);
      m.position.set(X(cx), ht / 2, Z(cy));
      m.rotation.y = -Math.atan2(dy, dx);
      m.castShadow = m.receiveShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(L * K, 0.012, th * K + 0.01), capMat);
      cap.position.y = ht / 2 + 0.006;
      m.add(cap);
      this.hole.add(m);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(th * K / 2 + 0.004, th * K / 2 + 0.004, ht + 0.012, 16), capMat);
      post.position.set(X(x1 + 0), ht / 2 + 0.006, Z(y1));
      // nudge the post outward along the corner bisector so it sits on the wall line
      const [px, py] = poly[(i - 1 + poly.length) % poly.length];
      const ax = x1 - px, ay = y1 - py, aL = Math.hypot(ax, ay);
      const n1x = (-ay / aL) * -sgn, n1y = (ax / aL) * -sgn;
      post.position.set(X(x1 + (nx + n1x) * th / 4), ht / 2 + 0.006, Z(y1 + (ny + n1y) * th / 4));
      post.castShadow = true;
      this.hole.add(post);
    });
  }

  _blocks(h) {
    h.blocks.forEach((poly) => {
      const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const cx = X((x0 + x1) / 2), cz = Z((y0 + y1) / 2);
      if (h.id === 'mbs') { this._clone('MBSTower', cx, cz); return; }
      if (h.id === 'hawker') { this._clone('TrayReturn', cx, cz, { rotY: 0 }); return; }
      const geo = flat(new THREE.ExtrudeGeometry(polyShape(poly), { depth: 1, bevelEnabled: false }));
      const hgt = h.id === 'flyer' ? 0.1 : 0.14;
      geo.scale(1, hgt, 1);
      const mat = new THREE.MeshStandardMaterial({ color: h.id === 'flyer' ? 0xd8d2c4 : 0xd8c8a8, roughness: 0.85 });
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = m.receiveShadow = true;
      this.hole.add(m);
      if (h.id === 'flyer') {
        const top = new THREE.Mesh(flat(new THREE.ShapeGeometry(polyShape([[x0 + 1, y0 + 1], [x1 - 1, y0 + 1], [x1 - 1, y1 - 1], [x0 + 1, y1 - 1]])), hgt + 0.002), new THREE.MeshStandardMaterial({ color: 0x5fa052, roughness: 0.9 }));
        this.hole.add(top);
        for (let i = 0; i < 3; i++) this._clone('Bush', X(x0 + (x1 - x0) * (0.22 + i * 0.28)), cz, { lift: hgt, scale: 0.8, rotY: i });
      } else {
        // merlion promenade wall: a railing on top
        const rail = new THREE.Mesh(new THREE.BoxGeometry((x1 - x0) * K * 0.9, 0.02, (y1 - y0) * K * 0.98), new THREE.MeshStandardMaterial({ color: 0x8d7b5c, roughness: 0.6 }));
        rail.position.set(cx, hgt + 0.06, cz);
        this.hole.add(rail);
      }
    });
  }

  _circles(h) {
    for (const c of h.circles) {
      const x = X(c.x), z = Z(c.y);
      if (c.kind === 'pillar') this._clone('Pillar', x, z, { scale: c.r / 2.6 });
      else if (c.kind === 'merlion') {
        const o = this._clone('Merlion', x, z, { scale: c.r / 3.6 });
        if (o) this._spray(o, c);
      } else if (c.kind === 'dome') {
        const o = this._clone('Dome', x, z, { scale: c.r * K, rotY: c.x });
        if (o) o.userData.dome = c;
      } else if (c.kind === 'table') this._clone('HawkerTable', x, z, { scale: c.r / 3.4, rotY: c.x * 0.7 });
      else if (c.kind === 'stool') this._clone('Stool', x, z, { scale: c.r / 1.3 });
      else if (c.kind === 'tree') { const o = this._clone('Supertree', x, z, { scale: c.r / 3.4, rotY: c.y }); if (o) o.scale.y *= 0.62; }
      else if (c.kind === 'hub') {
        const o = this._clone('FlyerHub', x, z, { scale: c.r / 2.4 });
        if (o) { const w = o.getObjectByName('FlyerWheel'); if (w) this.anim.push((t) => { w.rotation.z = t * 0.25; }); }
      }
    }
  }

  _spray(o, c) {
    // the Merlion's jet: droplets along an arc from the mouth to the bridge
    const mat = new THREE.MeshBasicMaterial({ color: 0xf2fbff, transparent: true, opacity: 0.95 });
    const geo = new THREE.SphereGeometry(0.026, 8, 6);
    const mouth = new THREE.Vector3(X(c.x), 0.66 * (c.r / 3.6), Z(c.y) + 0.2);
    const land = new THREE.Vector3(X(c.x), 0.0, Z(25));
    const drops = [];
    for (let i = 0; i < 40; i++) {
      const d = new THREE.Mesh(geo, mat);
      d.userData.off = i / 40;
      d.userData.spread = (Math.random() - 0.5) * 0.14;
      this.hole.add(d);
      drops.push(d);
    }
    this.anim.push((t) => {
      for (const d of drops) {
        const u = (t * 0.9 + d.userData.off) % 1;
        d.position.set(mouth.x + d.userData.spread * u * 2, mouth.y + (land.y - mouth.y) * u + Math.sin(u * Math.PI) * 0.25, mouth.z + (land.z - mouth.z) * u);
      }
    });
  }

  _ripples() {
    if (!this._rippleTex) {
      this._rippleTex = canvasTex(256, 256, (g, w, hh) => {
        g.clearRect(0, 0, w, hh);
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 5; g.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          const x = (i * 97) % w, y = (i * 61) % hh;
          g.beginPath(); g.arc(x, y, 18 + (i % 3) * 10, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
        }
      });
      this._rippleTex.wrapS = this._rippleTex.wrapT = THREE.RepeatWrapping;
      this._rippleTex.repeat.set(3, 3);
    }
    return this._rippleTex;
  }

  _zones(h) {
    for (const z of h.zones) {
      if (z.type === 'water') {
        if (z.kind === 'vortex') { this._vortex(z); continue; }
        const geo = flat(new THREE.ShapeGeometry(polyShape(z.poly)), 0.006);
        const water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x3d9be0, transparent: true, opacity: 0.55, roughness: 0.08, metalness: 0.2 }));
        this.hole.add(water);
        const rip = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({ map: this._ripples(), transparent: true, opacity: 0.6, depthWrite: false }));
        rip.position.y = 0.002;
        // planar UVs so the ripple texture tiles in metres
        const uv = rip.geometry.attributes.uv, pos = rip.geometry.attributes.position;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) * 0.6, pos.getZ(i) * 0.6);
        this.hole.add(rip);
        const tex = rip.material.map;
        this.anim.push((t) => { tex.offset.set(t * 0.03, t * 0.05); });
      } else if (z.type === 'slope') {
        const geo = flat(new THREE.ShapeGeometry(polyShape(z.poly)), 0.004);
        const tex = this._chevTex();
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, depthWrite: false }));
        const uv = geo.attributes.uv, pos = geo.attributes.position;
        const a = Math.atan2(z.ay, z.ax), ca = Math.cos(a), sa = Math.sin(a);
        for (let i = 0; i < uv.count; i++) {
          const px = pos.getX(i), pz = pos.getZ(i);
          uv.setXY(i, (-px * sa + pz * ca) * 2.5, (px * ca + pz * sa) * 2.5);
        }
        this.hole.add(m);
        const off = Math.random();
        this.anim.push((t) => { m.material.map.offset.set(0, -(t * 0.7 + off)); });
      } else if (z.type === 'pull') {
        const [cx, cy, r] = z.circle;
        const ringTex = canvasTex(256, 256, (g, w) => {
          g.translate(w / 2, w / 2);
          g.strokeStyle = 'rgba(154,214,255,.9)'; g.lineWidth = 7; g.lineCap = 'round';
          for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.arc(0, 0, 60 + (i % 3) * 22, 0, 1.1); g.stroke(); }
        });
        const m = new THREE.Mesh(flat(new THREE.CircleGeometry(r * K, 48), 0.005), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, opacity: 0.8, depthWrite: false }));
        m.position.set(X(cx), 0, Z(cy));
        this.hole.add(m);
        this.anim.push((t) => { m.rotation.y = t * 0.9; });
      }
    }
  }

  _chevTex() {
    const t = canvasTex(64, 64, (g) => {
      g.clearRect(0, 0, 64, 64);
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(14, 20); g.lineTo(32, 40); g.lineTo(50, 20); g.stroke();
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  _vortex(z) {
    const [cx, cy, r] = z.circle;
    const x = X(cx), zz = Z(cy), R = r * K;
    // the drain: a dark well, a glass ring and the indoor waterfall falling into it
    const well = new THREE.Mesh(flat(new THREE.CircleGeometry(R, 40), 0.004), new THREE.MeshStandardMaterial({ color: 0x0b2f52, roughness: 0.1, metalness: 0.3 }));
    well.position.set(x, 0, zz);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.03, 10, 48), new THREE.MeshStandardMaterial({ color: 0xc7ccd2, roughness: 0.25, metalness: 0.6 }));
    lip.rotation.x = Math.PI / 2; lip.position.set(x, 0.02, zz);
    const fallTex = canvasTex(64, 256, (g, w, hh) => {
      g.clearRect(0, 0, w, hh);
      for (let i = 0; i < 26; i++) {
        g.fillStyle = `rgba(${200 + (i % 3) * 20},235,255,${0.25 + (i % 4) * 0.12})`;
        g.fillRect((i * 23) % w, (i * 41) % hh, 2 + (i % 3), 30 + (i % 5) * 14);
      }
    });
    fallTex.wrapS = fallTex.wrapT = THREE.RepeatWrapping;
    fallTex.repeat.set(4, 1);
    const fall = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.7, R * 0.95, 3.2, 32, 1, true), new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
    fall.position.set(x, 1.6, zz);
    const oculus = new THREE.Mesh(new THREE.TorusGeometry(R * 1.1, 0.05, 12, 48), new THREE.MeshStandardMaterial({ color: 0xdfe6ec, roughness: 0.2, metalness: 0.7 }));
    oculus.rotation.x = Math.PI / 2; oculus.position.set(x, 3.2, zz);
    const mist = new THREE.Mesh(flat(new THREE.RingGeometry(R, R * 2.6, 48), 0.008), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }));
    mist.position.set(x, 0, zz);
    this.hole.add(well, lip, fall, oculus, mist);
    this.anim.push((t) => { fallTex.offset.y = -t * 1.4; mist.material.opacity = 0.14 + Math.sin(t * 3) * 0.05; });
  }

  _movers(h) {
    this.movers = [];
    for (const m of h.movers) {
      if (m.type === 'slider') {
        const o = this._clone('Train', X((m.x0 + m.x1) / 2), Z(m.cy), { scale: 1 });
        if (o) this.movers.push({ m, o });
        // rails running right through the hole
        const railMat = new THREE.MeshStandardMaterial({ color: 0xc9ced3, roughness: 0.3, metalness: 0.8 });
        for (const dx of [-0.34, 0.34]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 12), railMat);
          rail.position.set(X((m.x0 + m.x1) / 2) + dx, 0.01, 0);
          rail.receiveShadow = true;
          this.hole.add(rail);
        }
      } else if (m.type === 'bar') {
        const arms = [];
        for (let k = 0; k < m.arms; k++) {
          const o = this._clone('FlyerArm', X(m.cx), Z(m.cy), { scale: 1 });
          if (o) { o.scale.set(m.len * K, 1, 1); arms.push(o); }
        }
        this.movers.push({ m, arms });
      }
    }
  }

  _scenery(h) {
    const add = (name, x, z, o = {}) => this._clone(name, x, z, o);
    const people = (n, z0 = -4.0) => {
      for (let i = 0; i < n; i++) {
        const who = CAST[(E.HOLES.indexOf(h) * 3 + i) % CAST.length];
        const x = -3.8 + i * (7.6 / Math.max(1, n - 1)) + Math.sin(i * 7.1) * 0.3;
        add(`Char_${who}_Stand`, x, z0 + Math.cos(i * 3.3) * 0.25, { scale: 0.62, rotY: Math.sin(i * 1.7) * 0.4 });
      }
    };
    if (h.id === 'merlion' || h.id === 'mbs') {
      // the bay holes: a stone promenade behind the course for the spectators
      const prom = new THREE.Mesh(new THREE.BoxGeometry(18, 0.06, 1.6), new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 0.9 }));
      prom.position.set(0, 0.02, -4.3);
      prom.receiveShadow = true;
      this.hole.add(prom);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.09, 0.08), new THREE.MeshStandardMaterial({ color: 0x9a8763, roughness: 0.8 }));
      edge.position.set(0, 0.045, -3.5);
      this.hole.add(edge);
    }
    switch (h.id) {
      case 'voiddeck':
        add('HDBBlock', -2.4, -5.4, { scale: 1.3 }); add('HDBBlock', 2.4, -5.6, { scale: 1.3 });
        add('Bench', -1.5, 1.9, { rotY: 0 }); add('LampPost', 4.6, -3.7, { rotY: Math.PI });
        people(3, -3.9); break;
      case 'merlion':
        add('MBSTower', 6.5, -7.5, { scale: 1.6 }); add('MBSTower', 4.5, -7.5, { scale: 1.6 }); add('MBSTower', 2.5, -7.5, { scale: 1.6 });
        add('PalmTree', -5.8, -3.6); add('PalmTree', 5.8, -3.4, { rotY: 2 }); people(3, -3.9); break;
      case 'esplanade':
        add('Dome', -3.4, -5.2, { scale: 1.6 }); add('Dome', -0.8, -5.6, { scale: 1.3 });
        add('PalmTree', 5.6, -3.6); add('LampPost', -4.6, -3.7); people(2, -3.8); break;
      case 'hawker':
        add('LampPost', -4.9, -3.6); add('LampPost', 4.9, -3.6, { rotY: Math.PI }); people(5, -3.9); break;
      case 'supertree':
        add('Supertree', -3.5, -5.2, { scale: 2.4 }); add('Supertree', 0.5, -6, { scale: 3 }); add('Supertree', 4, -5.1, { scale: 2.2 });
        add('Bush', -5.6, 2.4); add('Bush', 5.6, 2.4); people(2, -3.9); break;
      case 'mrt':
        add('HDBBlock', -3.4, -5.6, { scale: 1.3 }); add('HDBBlock', 3.4, -5.6, { scale: 1.3 });
        add('LampPost', -4.8, -3.7); people(4, -3.5); break;
      case 'mbs':
        add('SkyPark', X(52), Z(12), { lift: 1.44 });
        add('PalmTree', -5.8, -3.6); add('PalmTree', 5.9, -3.2, { rotY: 1.4 }); people(3, -3.9); break;
      case 'jewel':
        for (let i = 0; i < 9; i++) add('Bush', -5.6 + i * 1.4, -3.5 - (i % 2) * 0.4, { scale: 1.6, rotY: i });
        people(2, -4.3); break;
      case 'flyer': {
        const big = add('FlyerHub', 3.2, -6.5, { scale: 3.2 });
        if (big) { const w = big.getObjectByName('FlyerWheel'); if (w) this.anim.push((t) => { w.rotation.z = t * 0.05; }); }
        add('PalmTree', -5.8, -3.6); add('LampPost', -4.4, -3.7); people(3, -3.9); break;
      }
    }
  }

  // ---------------- per frame ----------------
  frame(s, aim) {
    if (!this.ready) { this.pendingS = s; return; }
    if (!this.h || E.holeOf(s).id !== this.holeId) this.load(s);
    const h = this.h;
    this.t = s.t;
    // movers
    if (this.movers) {
      const shapes = E.moverShapes(h, s.t);
      for (const mv of this.movers) {
        if (mv.o) {
          const sh = shapes.find((x) => x.type === 'slider');
          mv.o.position.z = Z((sh.y0 + sh.y1) / 2);
        } else if (mv.arms) {
          const bars = shapes.filter((x) => x.type === 'bar');
          mv.arms.forEach((o, i) => { o.rotation.y = -bars[i].angle; });
        }
      }
    }
    // ball
    const b = s.ball;
    const R = E.BALL_R * K;
    const holed = s.phase === 'holed';
    const want = holed ? -0.12 : 0;
    this.ballY += (want - this.ballY) * 0.25;
    const nx = X(b.x), nz = Z(b.y);
    const dx = nx - this.ball.position.x, dz = nz - this.ball.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1e-5 && dist < 0.5) {
      const axis = new THREE.Vector3(dz, 0, -dx).normalize();
      this.rollQ.setFromAxisAngle(axis, dist / R);
      this.ball.quaternion.premultiply(this.rollQ);
    }
    this.ball.position.set(nx, R + this.ballY, nz);
    this.ball.visible = this.ballY > -0.1;
    // aim
    const A = this.aim;
    if (aim && s.phase === 'aim') {
      A.g.visible = true;
      A.g.position.set(nx, 0.015, nz);
      A.g.rotation.y = -aim.angle;
      const len = 0.25 + aim.power * 1.9;
      const col = aim.power < 0.45 ? 0xb6f2a0 : aim.power < 0.75 ? 0xffd877 : 0xff8a8a;
      this.aimMat.color.set(col);
      A.dots.children.forEach((d, i) => {
        const u = (i + 1) / A.dots.children.length;
        d.position.set(0.2 + (len - 0.2) * u, 0, 0);
        d.visible = u * len < len - 0.08;
      });
      A.head.position.set(len, 0, 0);
    } else A.g.visible = false;
    // follow camera in the low view
    if (this.view === 'low') {
      this.lookWant.set(nx * 0.6, 0, nz * 0.6 - 0.2);
      this.camWant.set(nx * 0.6, 2.6, nz * 0.6 + 4.1);
    }
  }

  _render() {
    const dt = this.clock.getDelta();
    const t = this.t ?? this.clock.elapsedTime;
    if (this.anim) for (const f of this.anim) f(this.clock.elapsedTime);
    if (this.flagHop) {
      this.flagHop -= dt;
      if (this.flag) this.flag.position.y = Math.max(0, Math.sin((1 - this.flagHop) * Math.PI * 2) * 0.12 * this.flagHop);
    }
    this.camPos.lerp(this.camWant, Math.min(1, dt * 4));
    this.camLook.lerp(this.lookWant, Math.min(1, dt * 4));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    void t;
    this.renderer.render(this.scene, this.camera);
  }

  _resize() {
    const w = this.stage.clientWidth || 1, h = this.stage.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._fit(true);
  }

  /** Place the camera so the whole hole fits (overview) or a lower chase view. */
  _fit(snap = false) {
    if (this.view === 'overview') {
      const el = THREE.MathUtils.degToRad(60);
      const dir = new THREE.Vector3(0, Math.sin(el), Math.cos(el));
      const look = new THREE.Vector3(0, 0, 0.15);
      const pts = [];
      for (const x of [-5.15, 5.15]) for (const z of [-3.3, 3.3]) for (const y of [0, 0.15]) pts.push(new THREE.Vector3(x, y, z));
      const cam = this.camera;
      let lo = 3, hi = 40;
      for (let i = 0; i < 26; i++) {
        const d = (lo + hi) / 2;
        cam.position.copy(look).addScaledVector(dir, d);
        cam.lookAt(look);
        cam.updateMatrixWorld();
        const ok = pts.every((p) => { const q = p.clone().project(cam); return Math.abs(q.x) < 0.97 && Math.abs(q.y) < 0.95; });
        if (ok) hi = d; else lo = d;
      }
      this.camWant.copy(look).addScaledVector(dir, hi);
      this.lookWant.copy(look);
    }
    if (snap) { this.camPos.copy(this.camWant); this.camLook.copy(this.lookWant); }
  }

  toWorld(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const p = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(this.plane, p)) return null;
    return { x: p.x / K + 50, y: p.z / K + 31 };
  }

  _float(text, wx, wy, cls = 'good', lift = 0.3) {
    const v = new THREE.Vector3(X(wx), lift, Z(wy)).project(this.camera);
    const el = document.createElement('div');
    el.className = `float3d ${cls}`;
    el.textContent = text;
    el.style.left = `${((v.x + 1) / 2) * 100}%`;
    el.style.top = `${((1 - v.y) / 2) * 100}%`;
    this.floats.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  react(ev, s) {
    if (!this.h) return;
    const b = s.ball;
    if (ev.type === 'water') {
      const p = ev.at || b;
      this._splash(p.x, p.y);
      this._float('+1 splash!', p.x, p.y, 'bad');
    } else if (ev.type === 'sink') {
      this.flagHop = 1;
    } else if (ev.type === 'lip') {
      this._float('Lipped out!', this.h.cup[0], this.h.cup[1], 'bad');
    } else if (ev.type === 'bump') {
      const c = this.h.circles.find((k) => k.kind === ev.kind && Math.hypot(k.x - b.x, k.y - b.y) < k.r + 2);
      const o = c && this.hole.children.find((x) => x.userData.dome === c);
      if (o) {
        const base = o.scale.x;
        let k = 0;
        const pulse = () => { k += 1; const f = 1 + Math.sin((k / 12) * Math.PI) * 0.08; o.scale.set(base * f, base / f, base * f); if (k < 12) requestAnimationFrame(pulse); else o.scale.setScalar(base); };
        pulse();
      }
    }
  }

  _splash(wx, wy) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.9 });
    const geo = new THREE.SphereGeometry(0.02, 6, 4);
    const drops = Array.from({ length: 18 }, () => {
      const d = new THREE.Mesh(geo, mat);
      d.userData.v = new THREE.Vector3((Math.random() - 0.5) * 1.2, 1 + Math.random() * 1.2, (Math.random() - 0.5) * 1.2);
      g.add(d);
      return d;
    });
    g.position.set(X(wx), 0.02, Z(wy));
    this.scene.add(g);
    let life = 0;
    const step = () => {
      life += 1 / 60;
      for (const d of drops) { d.userData.v.y -= 6 / 60; d.position.addScaledVector(d.userData.v, 1 / 60); }
      mat.opacity = Math.max(0, 0.9 - life);
      if (life < 0.9) requestAnimationFrame(step); else { this.scene.remove(g); geo.dispose(); mat.dispose(); }
    };
    step();
  }

  celebrate(text) { if (this.h) this._float(text, this.h.cup[0], this.h.cup[1], 'good', 0.5); }

  setMode(mode) { this.mode = mode; this.stage.dataset.mode = mode; }
}
