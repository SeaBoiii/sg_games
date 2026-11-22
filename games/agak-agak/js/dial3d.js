// 3D dial — Three.js renderer for Agak Agak. Same adapter API as Dial2D.
// The kopitiam table, dial housing, wheel, shutter and needle come from a Blender-made GLB.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BAND } from './engine.js';
import { tween, ease, reducedMotion } from '../../../assets/lib/fx.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';

const D2R = Math.PI / 180;
const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const mod = (n, m) => ((n % m) + m) % m;
const loadImage = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const WALL_R = 3.45;
const FLOOR_Y = -0.752;

// canvas helpers — angle θ: 0 = left, 90 = top, 180 = right (same as the 2D dial)
const cpt = (c, r, a) => [c - r * Math.cos(a * D2R), c - r * Math.sin(a * D2R)];
function wedgePath(g, c, r, a0, a1) {
  g.beginPath();
  g.moveTo(c, c);
  // canvas arc angles: 0 = +x, clockwise. θ=0 (left) → π, θ=90 (top) → 1.5π
  g.arc(c, c, r, Math.PI + a0 * D2R, Math.PI + a1 * D2R);
  g.closePath();
}

function canvasTex(cv, { srgb = true, aniso = 8, gltf = false } = {}) {
  const t = new THREE.CanvasTexture(cv);
  if (gltf) t.flipY = false; // glTF UVs have their origin at the top-left
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

const FONT = '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif';

export class Dial3D {
  constructor(stage, { modelUrl = '../models/agak-scene.glb', tileHref = '../../../assets/tile.svg', fallbackHref = '../' } = {}) {
    this.onNeedle = null;
    this.needle = 90;
    this.wheelZ = 0; // degrees of wheel.rotation.z
    this.shutterZ = 0; // 0 closed, 180 open
    this.enabled = false;
    this.mode = 'idle';
    this.labels = ['Shiok', 'Sian'];
    this.needleColor = '#D7263D';
    this.points = null;
    this.call = null;
    this.ready = false;
    this.knobSpin = 0;
    this._pulse = 0;

    stage.classList.add('stage-3d');
    stage.innerHTML = `
      <canvas class="gl" aria-label="3D Agak Agak dial on a kopitiam table"></canvas>
      <div class="loading" role="status"><div class="kopi-spin" aria-hidden="true"></div><p>Brewing kopi… <span class="pct">0%</span></p></div>
      <div class="dial-topic topic3d" aria-live="polite" hidden></div>
      <div class="dial-labels lab3d" aria-live="polite">
        <div class="lab lab-l"><span class="arrow">←</span><span class="txt"></span></div>
        <div class="lab lab-r"><span class="txt"></span><span class="arrow">→</span></div>
      </div>`;
    this.stage = stage;
    this.canvas = stage.querySelector('canvas');
    this.loadingEl = stage.querySelector('.loading');
    this.labL = stage.querySelector('.lab-l .txt');
    this.labR = stage.querySelector('.lab-r .txt');
    this.topicEl = stage.querySelector('.topic3d');

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      this.loadingEl.innerHTML = `<p>Your browser can't run the 3D version.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
      return;
    }
    const r = this.renderer;
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.02, 30);
    this.camPos = new THREE.Vector3(1.6, 1.1, 1.6);
    this.camLook = new THREE.Vector3(0, 0.2, 0);
    this.camera.position.copy(this.camPos);

    this._lights();
    this._resize();
    new ResizeObserver(() => this._resize()).observe(stage);

    this.clock = new THREE.Clock();
    r.setAnimationLoop(() => this._frame());

    this._load(modelUrl, tileHref).catch((err) => {
      console.error(err);
      this.loadingEl.innerHTML = `<p>Couldn't load the 3D table.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
    });
    this._bindDrag();
  }

  // ---------- scene setup ----------
  _lights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xfff1dc, 0x5a3624, 0.9));
    const key = new THREE.DirectionalLight(0xffe2b8, 2.4);
    key.position.set(1.1, 2.4, 1.7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -1.2; sc.right = 1.2; sc.top = 1.2; sc.bottom = -1.2; sc.near = 0.5; sc.far = 6;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.01;
    key.shadow.radius = 4;
    s.add(key);
    const rim = new THREE.DirectionalLight(0x9fe3dc, 0.7);
    rim.position.set(-2, 1.4, -1.5);
    s.add(rim);
    // warm "fluorescent tube" glow from above the table
    const tube = new THREE.PointLight(0xfff6e6, 1.4, 4, 1.6);
    tube.position.set(0, 1.6, 0.4);
    s.add(tube);
  }

  _floor() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 512;
    const g = cv.getContext('2d');
    const n = 8, s = 512 / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = (x + y) % 2 ? '#C9643F' : '#EAD9BC';
      g.fillRect(x * s, y * s, s, s);
    }
    g.strokeStyle = 'rgba(60,30,15,.25)'; g.lineWidth = 3;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 512); g.moveTo(0, i * s); g.lineTo(512, i * s); g.stroke(); }
    const map = canvasTex(cv);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(5.4, 5.4);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(WALL_R, 96),
      new THREE.MeshStandardMaterial({ map, roughness: 0.6, metalness: 0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  // Kopitiam wall all round: faint Peranakan tiles above (like the 2D page), stronger tile dado below.
  _backdrop(tile) {
    const tex = (fade, rx, ry) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      const g = cv.getContext('2d');
      g.drawImage(tile, 0, 0, 256, 256);
      g.fillStyle = `rgba(246,239,227,${fade})`;
      g.fillRect(0, 0, 256, 256);
      const t = canvasTex(cv);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      return t;
    };
    const H = 3.4, DADO = 1.05;
    const around = Math.round((2 * Math.PI * WALL_R) / 0.3);
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(WALL_R, WALL_R, H, 160, 1, true),
      new THREE.MeshStandardMaterial({ map: tex(0.9, around, H / 0.3), side: THREE.BackSide, roughness: 0.95 })
    );
    wall.position.y = FLOOR_Y + H / 2;
    const dado = new THREE.Mesh(
      new THREE.CylinderGeometry(WALL_R - 0.005, WALL_R - 0.005, DADO, 160, 1, true),
      new THREE.MeshStandardMaterial({ map: tex(0.74, around, DADO / 0.3), side: THREE.BackSide, roughness: 0.35 })
    );
    dado.position.y = FLOOR_Y + DADO / 2;
    const railMat = new THREE.MeshStandardMaterial({ color: 0x2f6b4f, roughness: 0.4 });
    const rail = new THREE.Mesh(new THREE.TorusGeometry(WALL_R - 0.02, 0.022, 10, 200), railMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = FLOOR_Y + DADO;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(WALL_R - 0.01, WALL_R - 0.01, 0.09, 160, 1, true), new THREE.MeshStandardMaterial({ color: 0x3b2216, side: THREE.BackSide, roughness: 0.5 }));
    skirt.position.y = FLOOR_Y + 0.045;
    this.scene.add(wall, dado, rail, skirt);
  }

  _marble() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1024;
    const g = cv.getContext('2d');
    g.fillStyle = '#F2EEE7'; g.fillRect(0, 0, 1024, 1024);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let v = 0; v < 22; v++) {
      g.beginPath();
      let x = rnd() * 1024, y = rnd() * 1024, a = rnd() * Math.PI * 2;
      g.moveTo(x, y);
      for (let k = 0; k < 60; k++) { a += (rnd() - 0.5) * 0.7; x += Math.cos(a) * 18; y += Math.sin(a) * 18; g.lineTo(x, y); }
      g.strokeStyle = `rgba(${120 + rnd() * 40},${115 + rnd() * 30},${110 + rnd() * 30},${0.08 + rnd() * 0.18})`;
      g.lineWidth = 0.8 + rnd() * 3;
      g.filter = `blur(${rnd() * 2}px)`;
      g.stroke();
    }
    g.filter = 'none';
    return canvasTex(cv);
  }

  _wheelCanvas() {
    if (!this.wheelCv) { this.wheelCv = document.createElement('canvas'); this.wheelCv.width = this.wheelCv.height = 1024; }
    const g = this.wheelCv.getContext('2d');
    const c = 512, R = 512;
    const face = g.createRadialGradient(c, c, 0, c, c, R);
    face.addColorStop(0, '#FFFDF7'); face.addColorStop(0.75, '#FBF3E2'); face.addColorStop(1, '#E9D9BB');
    g.fillStyle = face; g.fillRect(0, 0, 1024, 1024);
    g.lineCap = 'round';
    for (let a = 0; a < 360; a += 6) {
      const long = a % 30 === 0;
      const [x0, y0] = cpt(c, R - (long ? 58 : 34), a);
      const [x1, y1] = cpt(c, R - 14, a);
      g.strokeStyle = `rgba(107,62,38,${long ? 0.3 : 0.14})`;
      g.lineWidth = long ? 7 : 5;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    const bands = [[2.5, '#1F8A8A'], [1.5, '#F2B134'], [0.5, '#D7263D']];
    for (const [w, col] of bands) {
      wedgePath(g, c, R - 6, 90 - BAND * w, 90 + BAND * w);
      g.fillStyle = col; g.fill();
      g.strokeStyle = 'rgba(42,26,18,.3)'; g.lineWidth = 4; g.stroke();
    }
    g.font = `800 64px ${FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const num = (a, n, col) => {
      const [x, y] = cpt(c, R - 110, a);
      g.save(); g.translate(x, y); g.rotate((a - 90) * D2R); g.fillStyle = col; g.fillText(n, 0, 0); g.restore();
    };
    num(90, '4', '#FFF8E8');
    num(90 - BAND, '3', '#2A1A12'); num(90 + BAND, '3', '#2A1A12');
    num(90 - 2 * BAND, '2', '#FFF8E8'); num(90 + 2 * BAND, '2', '#FFF8E8');
    if (this.wheelTex) this.wheelTex.needsUpdate = true;
    return this.wheelCv;
  }

  // Calm lacquer finish for the shutter (kaya cream) and lower panel (kopi brown).
  _lacquerCanvas({ base = ['#F3EAD8', '#EADDC4', '#D6C3A0'], label = false, ribs = false } = {}) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1024;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(512, 512, 0, 512, 512, 512);
    grad.addColorStop(0, base[0]); grad.addColorStop(0.7, base[1]); grad.addColorStop(1, base[2]);
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 1024);
    if (ribs) {
      g.strokeStyle = 'rgba(107,62,38,.12)'; g.lineWidth = 4;
      for (let a = 15; a < 180; a += 15) {
        const [x0, y0] = cpt(512, 190, a), [x1, y1] = cpt(512, 470, a);
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      }
    }
    // thin gold pinstripes
    g.strokeStyle = 'rgba(242,177,52,.55)'; g.lineWidth = 6;
    g.beginPath(); g.arc(512, 512, 456, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(242,177,52,.3)'; g.lineWidth = 4;
    g.beginPath(); g.arc(512, 512, 180, 0, Math.PI * 2); g.stroke();
    if (label) {
      g.fillStyle = '#2A1A12';
      const w = 250, h = 76, y = 512 - 360;
      g.beginPath(); g.roundRect(512 - w / 2, y - h / 2, w, h, h / 2); g.fill();
      g.fillStyle = '#FBF6EC'; g.font = `800 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.letterSpacing = '10px';
      g.fillText('AGAK', 517, y + 3);
    }
    return cv;
  }

  _plaqueCanvas(cv, text, side) {
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    g.fillStyle = side === 'l' ? '#FDE3E7' : '#DDF1EE';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#2A1A12';
    g.textBaseline = 'middle';
    const arrow = side === 'l' ? '←' : '→';
    const pad = 34;
    g.font = `800 64px ${FONT}`;
    const aw = g.measureText(arrow).width + 16;
    // fit text in up to two lines
    const maxW = W - pad * 2 - aw;
    let size = 64, lines = [text];
    const fit = () => {
      g.font = `800 ${size}px ${FONT}`;
      if (g.measureText(text).width <= maxW) return [text];
      const words = text.split(' ');
      let best = null;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
        const w = Math.max(g.measureText(a).width, g.measureText(b).width);
        if (!best || w < best.w) best = { w, l: [a, b] };
      }
      return best && best.w <= maxW ? best.l : null;
    };
    while (size > 24) { const l = fit(); if (l) { lines = l; break; } size -= 3; }
    g.font = `800 ${size}px ${FONT}`;
    const lh = size * 1.05;
    const y0 = H / 2 - ((lines.length - 1) * lh) / 2 + 4;
    if (side === 'l') {
      g.textAlign = 'left';
      g.font = `800 64px ${FONT}`; g.fillText(arrow, pad, H / 2 + 2);
      g.font = `800 ${size}px ${FONT}`;
      lines.forEach((ln, i) => g.fillText(ln, pad + aw, y0 + i * lh));
    } else {
      g.textAlign = 'right';
      g.font = `800 64px ${FONT}`; g.fillText(arrow, W - pad, H / 2 + 2);
      g.font = `800 ${size}px ${FONT}`;
      lines.forEach((ln, i) => g.fillText(ln, W - pad - aw, y0 + i * lh));
    }
  }

  _overlayCanvas() {
    const g = this.overCv.getContext('2d');
    g.clearRect(0, 0, 1024, 1024);
    if (this.call) {
      const c = 512, r = 330;
      const dir = this.call === 'left' ? -1 : 1;
      const a0 = this.needle + dir * 4;
      const a1 = Math.max(3, Math.min(177, this.needle + dir * 22));
      g.lineCap = 'round';
      g.strokeStyle = '#2A1A12'; g.lineWidth = 30;
      g.beginPath();
      g.arc(c, c, r, Math.PI + Math.min(a0, a1) * D2R, Math.PI + Math.max(a0, a1) * D2R);
      g.stroke();
      const [hx, hy] = cpt(c, r, a1);
      const tang = (Math.PI + a1 * D2R) + (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      g.fillStyle = '#2A1A12';
      g.beginPath();
      g.moveTo(hx + Math.cos(tang) * 40, hy + Math.sin(tang) * 40);
      g.lineTo(hx + Math.cos(tang + 2.4) * 34, hy + Math.sin(tang + 2.4) * 34);
      g.lineTo(hx + Math.cos(tang - 2.4) * 34, hy + Math.sin(tang - 2.4) * 34);
      g.closePath(); g.fill();
      const [tx, ty] = cpt(c, r - 78, this.needle + dir * 13);
      g.font = `800 58px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 16; g.strokeStyle = '#FFFCF5'; g.strokeText(this.call.toUpperCase(), tx, ty);
      g.fillStyle = '#2A1A12'; g.fillText(this.call.toUpperCase(), tx, ty);
    }
    this.overTex.needsUpdate = true;
  }

  async _load(modelUrl, tileHref) {
    const [gltf, tile] = await Promise.all([
      new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(DRACO_PATH)).loadAsync(modelUrl, (e) => {
        if (e.total) this.loadingEl.querySelector('.pct').textContent = `${Math.round((e.loaded / e.total) * 100)}%`;
      }),
      loadImage(tileHref).catch(() => null),
      document.fonts ? document.fonts.ready : Promise.resolve(),
    ]);
    const root = gltf.scene;
    this.scene.add(root);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) o.material = o.material.clone();
      }
    });
    const get = (n) => root.getObjectByName(n);
    this.wheel = get('Wheel');
    this.shutter = get('Shutter');
    this.needleObj = get('Needle');
    this.knob = get('SpinKnob');
    this.device = get('Device');
    this.cardL = get('CardL');
    this.cardR = get('CardR');

    // wheel face
    this.wheelTex = canvasTex(this._wheelCanvas(), { gltf: true });
    this.wheel.material = new THREE.MeshStandardMaterial({ map: this.wheelTex, roughness: 0.55, emissive: 0xffffff, emissiveMap: this.wheelTex, emissiveIntensity: 0 });
    // shutter + lower panel: calm lacquer finish
    this.shutter.material = new THREE.MeshStandardMaterial({ map: canvasTex(this._lacquerCanvas({ label: true, ribs: true }), { gltf: true }), roughness: 0.38 });
    const lower = get('LowerPanel');
    lower.material = new THREE.MeshStandardMaterial({ map: canvasTex(this._lacquerCanvas({ base: ['#4A2C1B', '#3B2216', '#2A170E'] }), { gltf: true }), roughness: 0.4 });
    // card plaques
    this.plaqueL = document.createElement('canvas'); this.plaqueL.width = 512; this.plaqueL.height = 184;
    this.plaqueR = document.createElement('canvas'); this.plaqueR.width = 512; this.plaqueR.height = 184;
    this.texL = canvasTex(this.plaqueL, { gltf: true }); this.texR = canvasTex(this.plaqueR, { gltf: true });
    this.cardL.material = new THREE.MeshStandardMaterial({ map: this.texL, roughness: 0.75 });
    this.cardR.material = new THREE.MeshStandardMaterial({ map: this.texR, roughness: 0.75 });
    // table marble with generated planar UVs
    const top = get('TableTop');
    const pos = top.geometry.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) + 0.5; uv[i * 2 + 1] = pos.getZ(i) + 0.5; }
    top.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    top.material = new THREE.MeshStandardMaterial({ map: this._marble(), roughness: 0.18, metalness: 0 });

    // overlay for the left/right call (sits between the shutter and the lower panel)
    this.overCv = document.createElement('canvas'); this.overCv.width = this.overCv.height = 1024;
    this.overTex = canvasTex(this.overCv);
    const r = 0.218;
    const geo = new THREE.CircleGeometry(r, 96);
    const over = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.overTex, transparent: true, depthWrite: false, toneMapped: false }));
    over.position.copy(this.wheel.position);
    over.position.z = 0.0333;
    over.renderOrder = 2;
    this.wheel.parent.add(over);
    this.overlay = over;

    this._floor();
    if (tile) this._backdrop(tile);
    this.ready = true;
    this._applyAll();
    this.loadingEl.classList.add('done');
  }

  _applyAll() {
    if (!this.ready) return;
    this.setLabels(this.labels);
    this.setNeedleColor(this.needleColor);
    this._applyNeedle();
    this._applyWheel();
    this._applyShutter();
    this._overlayCanvas();
  }

  _applyNeedle() { if (this.needleObj) this.needleObj.rotation.z = (90 - this.needle) * D2R; }
  _applyWheel() { if (this.wheel) this.wheel.rotation.z = this.wheelZ * D2R; }
  _applyShutter() { if (this.shutter) this.shutter.rotation.z = this.shutterZ * D2R; }

  // ---------- camera ----------
  _resize() {
    if (!this.renderer) return;
    const w = this.stage.clientWidth || 1, h = this.stage.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _closeShot(lift = 0) {
    const vfov = this.camera.fov * D2R;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const W = 0.66, H = 0.62;
    const d = Math.max(W / 2 / Math.tan(hfov / 2), H / 2 / Math.tan(vfov / 2)) + 0.06;
    return { pos: new THREE.Vector3(0, 0.33 + lift, d), look: new THREE.Vector3(0, 0.27 + lift * 0.3, 0) };
  }

  _target(t) {
    const m = this.mode;
    if (m === 'idle' || m === 'over') {
      const sp = m === 'over' ? 0.22 : 0.09;
      const a = t * sp + 0.6;
      const rad = this.camera.aspect < 0.8 ? 2.6 : 1.9;
      return { pos: new THREE.Vector3(Math.sin(a) * rad, 1.05, Math.cos(a) * rad), look: new THREE.Vector3(0, 0.12, 0) };
    }
    if (m === 'handoff') {
      const far = this.camera.aspect < 0.8 ? 1.9 : 1.35;
      return { pos: new THREE.Vector3(0.45 * far, 0.62 * far, 1.0 * far), look: new THREE.Vector3(0, 0.16, 0) };
    }
    const shot = this._closeShot(m === 'psychic' ? 0.02 : 0);
    if (m === 'reveal') shot.pos.multiplyScalar(0.98);
    return shot;
  }

  _frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    const tgt = this._target(t);
    const k = reducedMotion() ? 1 : 1 - Math.exp(-dt * 2.6);
    this.camPos.lerp(tgt.pos, k);
    this.camLook.lerp(tgt.look, k);
    const sway = this.mode === 'idle' || reducedMotion() ? 0 : 0.006;
    this.camera.position.set(this.camPos.x + Math.sin(t * 0.7) * sway, this.camPos.y + Math.sin(t * 0.9) * sway * 0.6, this.camPos.z);
    this.camera.lookAt(this.camLook);

    if (this.ready) {
      if (this.mode === 'idle' && !reducedMotion()) { this.needle = 90 + Math.sin(t / 1.4) * 55; this._applyNeedle(); }
      if (this.points != null && this.points > 0) {
        this._pulse += dt;
        this.wheel.material.emissiveIntensity = Math.max(0, Math.sin(this._pulse * 5)) * 0.22 * Math.max(0, 1 - this._pulse / 4);
      } else if (this.wheel.material.emissiveIntensity) this.wheel.material.emissiveIntensity = 0;
    }
    this.renderer.render(this.scene, this.camera);
  }

  // ---------- adapter API ----------
  setMode(mode) {
    this.mode = mode;
    this.stage.dataset.mode = mode;
  }

  setLabels(lab) {
    this.stage.classList.toggle('no-labels', !lab);
    if (lab) this.labels = lab;
    const l = lab || ['', ''];
    this.labL.textContent = l[0];
    this.labR.textContent = l[1];
    if (!this.ready) return;
    this._plaqueCanvas(this.plaqueL, l[0], 'l');
    this._plaqueCanvas(this.plaqueR, l[1], 'r');
    this.texL.needsUpdate = this.texR.needsUpdate = true;
  }

  setTopic(q) {
    this.topicEl.textContent = q || '';
    this.topicEl.hidden = !q;
  }

  setTarget(deg) { this.wheelZ = 90 - deg; this._applyWheel(); }

  spin(deg) {
    const start = this.wheelZ;
    const desired = 90 - deg;
    let end = start - mod(start, 360) - 360 * 4 + mod(desired, 360);
    if (start - end < 360 * 3) end -= 360;
    let lastTick = Math.floor(start / 12);
    const knob0 = this.knob ? this.knob.rotation.x : 0;
    return tween({
      from: start, to: end, duration: 3200, easing: ease.spin,
      onUpdate: (v, p) => {
        this.wheelZ = v;
        this._applyWheel();
        if (this.knob) this.knob.rotation.x = knob0 + (start - v) * D2R * 0.5;
        const k = Math.floor(v / 12);
        if (k !== lastTick) { lastTick = k; sfx.tick(); }
      },
    }).then(() => { this.wheelZ = desired; this._applyWheel(); sfx.thunk(); buzz(20); });
  }

  setShutter(open, { animate = true, slow = false } = {}) {
    const to = open ? 180 : 0;
    if (this.shutterZ === to) return Promise.resolve();
    if (!animate || !this.ready) { this.shutterZ = to; this._applyShutter(); return Promise.resolve(); }
    sfx.whoosh(open);
    return tween({
      from: this.shutterZ, to, duration: slow ? 1500 : 900, easing: slow ? ease.inOutCubic : ease.outCubic,
      onUpdate: (v) => { this.shutterZ = v; this._applyShutter(); },
    });
  }

  setNeedle(deg, animate = false) {
    if (!animate) { this.needle = deg; this._applyNeedle(); return; }
    tween({ from: this.needle, to: deg, duration: 500, easing: ease.outBack, onUpdate: (v) => { this.needle = v; this._applyNeedle(); } });
  }

  setNeedleColor(c) {
    this.needleColor = c;
    if (this.needleObj) this.needleObj.material.color.set(c);
  }

  setNeedleEnabled(on) {
    this.enabled = on;
    this.stage.classList.toggle('interactive', on);
    if (on) this.canvas.setAttribute('tabindex', '0'); else this.canvas.removeAttribute('tabindex');
    if (on) this.canvas.focus({ preventScroll: true });
  }

  showCall(side) {
    this.call = side;
    if (this.ready) this._overlayCanvas();
  }

  highlight(points) {
    this.points = points;
    this._pulse = 0;
  }

  // ---------- interaction ----------
  _angleFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const pivot = new THREE.Vector3();
    this.needleObj.getWorldPosition(pivot);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -pivot.z);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, hit)) return this.needle;
    const dx = hit.x - pivot.x, dy = hit.y - pivot.y;
    if (dy < 0) return dx > 0 ? 180 : 0;
    const phi = Math.atan2(dy, dx) / D2R;
    return Math.max(0, Math.min(180, 180 - phi));
  }

  _set(deg) {
    const prev = this.needle;
    this.needle = deg;
    this._applyNeedle();
    if (Math.floor(prev / 3) !== Math.floor(deg / 3)) sfx.needle();
    if (this.onNeedle) this.onNeedle(deg);
  }

  _bindDrag() {
    let dragging = false;
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (!this.enabled || !this.ready) return;
      dragging = true;
      c.setPointerCapture(e.pointerId);
      this.stage.classList.add('dragging');
      this._set(this._angleFromEvent(e));
      e.preventDefault();
    });
    c.addEventListener('pointermove', (e) => { if (dragging && this.enabled) this._set(this._angleFromEvent(e)); });
    const end = () => { dragging = false; this.stage.classList.remove('dragging'); };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { this._set(Math.max(0, this.needle - step)); e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { this._set(Math.min(180, this.needle + step)); e.preventDefault(); }
    });
  }
}
