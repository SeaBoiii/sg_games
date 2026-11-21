// MRT Rush — 3D carriage (Three.js). Same adapter API as Board2D.
// Seats, wall panels, door leaves, poles, ten unique textured commuters (standing + seated) and their
// luggage are Blender-made templates in a Draco-compressed GLB; this file lays them out from the game grid.
// Every character fits inside its 0.6 m grid square, so neighbours never overlap.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as E from './engine.js';
import { TYPE_COLORS } from './board2d.js';
import { tween, ease, wait, reducedMotion } from '../../../assets/lib/fx.js';
import { sfx } from '../../../assets/lib/sfx.js';

const CELL = 0.6;
const HALF_W = (E.COLS * CELL) / 2;
const HALF_D = (E.ROWS * CELL) / 2;
const FONT = '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif';
const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const CHAR_KEYS = ['worker_a', 'worker_b', 'student_a', 'student_b', 'aunty', 'ns', 'parent', 'kid', 'uncle', 'expecting'];
const ITEM_TPL = { bag: 'BagTpl', trolley: 'TrolleyTpl', pack: 'PackTpl', stroller: 'StrollerTpl' };

/** Which of the ten characters plays this commuter. Workers and students alternate between two people. */
function charKey(type, kind, id) {
  if (kind === 'kid') return 'kid';
  switch (type) {
    case 'worker': return id % 2 ? 'worker_b' : 'worker_a';
    case 'student': return id % 2 ? 'student_b' : 'student_a';
    case 'family': return 'parent';
    default: return type; // aunty, ns, uncle, expecting
  }
}
const D2R = Math.PI / 180;

const cellPos = (r, c) => new THREE.Vector3((c - (E.COLS - 1) / 2) * CELL, 0, (r - (E.ROWS - 1) / 2) * CELL);
const sideZ = (side) => (side === 'top' ? -1 : 1);
const tex = (cv, flip = true) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = flip; return t; };

export class Board3D {
  constructor(stage, { modelUrl = '../models/mrt-assets.glb', fallbackHref = '../' } = {}) {
    this.stage = stage;
    this.onCell = null;
    this.onHover = null;
    this.onRotate = null;
    this.pick = null;
    this.mode = 'idle';
    this.topDown = false;
    this.riderObjs = new Map();
    this.pending = null;

    stage.classList.add('stage-3d');
    stage.innerHTML = `
      <canvas class="gl" aria-label="3D MRT carriage"></canvas>
      <div class="loading" role="status"><div class="spinner" aria-hidden="true"></div><p>Train arriving… <span class="pct">0%</span></p></div>
      <div class="cam-btns"><button type="button" data-cam="top" aria-label="Toggle top-down view"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg></button></div>`;
    this.canvas = stage.querySelector('canvas');
    this.loadingEl = stage.querySelector('.loading');
    stage.querySelector('[data-cam="top"]').onclick = () => { this.topDown = !this.topDown; sfx.tap(); };

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      this.loadingEl.innerHTML = `<p>Your browser can't run the 3D version.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
      return;
    }
    const r = this.renderer;
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    this.camPos = new THREE.Vector3(0, 9, 9);
    this.camLook = new THREE.Vector3();
    this.camera.position.copy(this.camPos);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6a6258, 1.0));
    const key = new THREE.DirectionalLight(0xfff2de, 2.0);
    key.position.set(3, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 25 });
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.ray = new THREE.Raycaster();
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._resize();
    new ResizeObserver(() => this._resize()).observe(stage);
    this.clock = new THREE.Clock();
    r.setAnimationLoop(() => this._frame());
    this._bind();
    this._load(modelUrl).catch((err) => {
      console.error(err);
      this.loadingEl.innerHTML = `<p>Couldn't load the 3D train.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
    });
  }

  async _load(url) {
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url, (e) => {
      if (e.total) this.loadingEl.querySelector('.pct').textContent = `${Math.round((e.loaded / e.total) * 100)}%`;
    });
    if (document.fonts) await document.fonts.ready;
    this.tpl = {};
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const names = ['SeatTpl', 'WallTpl', 'DoorTpl', 'PoleTpl', ...Object.values(ITEM_TPL)];
    for (const k of CHAR_KEYS) names.push(`Char_${k}_Stand`, `Char_${k}_Sit`);
    for (const n of names) {
      const t = gltf.scene.getObjectByName(n);
      if (!t) { console.warn('missing template', n); continue; }
      t.position.set(0, 0, 0);
      t.updateMatrixWorld(true);
      t.userData.height = new THREE.Box3().setFromObject(t).max.y;
      this.tpl[n] = t;
    }
    this.ready = true;
    this.loadingEl.classList.add('done');
    if (this.pending) { const s = this.pending; this.pending = null; this.load(s); }
  }

  // ---------- building ----------
  _clone(name, recolor = null) {
    const o = this.tpl[name].clone(true);
    if (recolor) o.traverse((m) => {
      if (!m.isMesh) return;
      const c = recolor(m.name);
      if (c) { m.material = m.material.clone(); m.material.color.set(c); }
    });
    return o;
  }

  /** Near-side wall/door pieces are cut to waist height so the camera can see in (dollhouse view). */
  _cutaway(obj) {
    const H = 0.42;
    obj.traverse((m) => {
      if (!m.isMesh) return;
      if (m.name.startsWith('WallLow') || m.name.startsWith('DoorLeaf')) {
        const box = new THREE.Box3().setFromObject(m);
        const full = box.max.y - box.min.y || 1;
        m.scale.y *= H / full;
        m.position.y = H / 2;
      } else m.visible = false;
    });
  }

  _floorTexture(side) {
    const P = 100;
    const cv = document.createElement('canvas');
    cv.width = E.COLS * P; cv.height = E.ROWS * P;
    const g = cv.getContext('2d');
    g.fillStyle = '#D8D4CC'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#C6C1B7';
    for (let y = 12; y < cv.height; y += 25) for (let x = (y / 25) % 2 ? 12 : 24; x < cv.width; x += 25) g.fillRect(x, y, 3, 3);
    for (const [r, c] of [...E.doorCells('top'), ...E.doorCells('bottom')]) {
      const active = r === E.doorRow(side);
      g.save();
      g.beginPath(); g.rect(c * P, r * P, P, P); g.clip();
      g.fillStyle = active ? '#EFE3B8' : '#E3DFD6'; g.fillRect(c * P, r * P, P, P);
      g.strokeStyle = active ? '#F2C230' : 'rgba(242,194,48,.35)'; g.lineWidth = 14;
      for (let k = -P; k < 2 * P; k += 30) { g.beginPath(); g.moveTo(c * P + k, r * P); g.lineTo(c * P + k + P, r * P + P); g.stroke(); }
      g.restore();
    }
    return tex(cv);
  }

  _overlayCanvas() {
    if (!this.ovCv) { this.ovCv = document.createElement('canvas'); this.ovCv.width = E.COLS * 64; this.ovCv.height = E.ROWS * 64; }
    return this.ovCv;
  }

  _signTexture(name, color) {
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 200;
    const g = cv.getContext('2d');
    g.fillStyle = '#1F2328'; g.fillRect(0, 0, 1024, 200);
    g.fillStyle = color; g.beginPath(); g.arc(90, 100, 56, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = `800 92px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText(name, 176, 104, 820);
    return tex(cv);
  }

  load(s) {
    if (!this.ready) { this.pending = s; return; }
    this.s = s;
    this.world.clear();
    this.riderObjs = new Map();
    const line = E.lineOf(s);
    this.lineColor = line.color;

    // floor + overlay
    this.floorMat = new THREE.MeshStandardMaterial({ map: this._floorTexture(s.side), roughness: 0.7 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(E.COLS * CELL, E.ROWS * CELL), this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.world.add(floor);
    this.ovTex = tex(this._overlayCanvas());
    const ov = new THREE.Mesh(new THREE.PlaneGeometry(E.COLS * CELL, E.ROWS * CELL), new THREE.MeshBasicMaterial({ map: this.ovTex, transparent: true, depthWrite: false }));
    ov.rotation.x = -Math.PI / 2;
    ov.position.y = 0.006;
    ov.renderOrder = 2;
    this.world.add(ov);
    this._paintOverlay();

    // body shell: a line-coloured skirt below the floor + end walls
    const bodyMat = new THREE.MeshStandardMaterial({ color: line.color, roughness: 0.45 });
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(E.COLS * CELL + 0.5, 0.5, E.ROWS * CELL + 0.9), bodyMat);
    skirt.position.y = -0.26;
    this.world.add(skirt);
    const endMat = new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: 0.6 });
    for (const sx of [-1, 1]) {
      const end = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, E.ROWS * CELL + 0.84), endMat);
      end.position.set(sx * (HALF_W + 0.06), 1.05, 0);
      end.castShadow = true;
      this.world.add(end);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.18, E.ROWS * CELL + 0.86), bodyMat);
      stripe.position.set(sx * (HALF_W + 0.06), 1.0, 0);
      this.world.add(stripe);
    }

    // seats, walls, doors
    const seatColor = (t) => (t === 'priority' ? '#8E2C48' : line.color);
    this.doorLeaves = { top: [], bottom: [] };
    for (const side of ['top', 'bottom']) {
      const r = E.doorRow(side);
      const rot = side === 'top' ? 0 : Math.PI;
      for (let c = 0; c < E.COLS; c++) {
        const p = cellPos(r, c);
        const t = E.cellType(r, c);
        if (t === 'door') {
          const leaf = this._clone('DoorTpl');
          leaf.position.copy(p);
          leaf.rotation.y = rot;
          leaf.position.z += sideZ(side) * -0.03;
          leaf.userData = { home: p.x, dir: E.DOOR_COLS.indexOf(c) % 2 ? 1 : -1 };
          if (side === 'bottom') this._cutaway(leaf);
          this.world.add(leaf);
          this.doorLeaves[side].push(leaf);
        } else {
          const wall = this._clone('WallTpl');
          wall.position.copy(p);
          wall.rotation.y = rot;
          if (side === 'bottom') this._cutaway(wall);
          this.world.add(wall);
          const seat = this._clone('SeatTpl', (n) => (n.startsWith('SeatCushion') || n.startsWith('SeatBack') ? seatColor(t) : null));
          seat.position.copy(p);
          seat.rotation.y = rot;
          this.world.add(seat);
        }
      }
    }
    for (const c of [1, 5, 7, 11]) for (const r of [2, 3]) {
      const pole = this._clone('PoleTpl');
      pole.position.set((c - E.COLS / 2) * CELL, 0, (r - E.ROWS / 2) * CELL);
      this.world.add(pole);
    }
    const railMat = new THREE.MeshStandardMaterial({ color: 0xc9ced1, metalness: 1, roughness: 0.25 });
    for (const z of [-0.6, 0.6]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, E.COLS * CELL, 10), railMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, 1.9, z);
      this.world.add(rail);
    }

    // station + tunnel scenery
    this.platform = new THREE.Group();
    this.world.add(this.platform);
    this.tunnel = new THREE.Group();
    this.world.add(this.tunnel);
    this._buildTunnel();
    this.crowd = new THREE.Group();
    this.world.add(this.crowd);
    this.riders = new THREE.Group();
    this.world.add(this.riders);
    this.ghost = new THREE.Group();
    this.world.add(this.ghost);
    this.walkers = new THREE.Group();
    this.world.add(this.walkers);
    this._buildPlatform(s);
    this.sync(s);
  }

  _buildPlatform(s) {
    this.platform.clear();
    const line = E.lineOf(s);
    const side = s.side;
    const z = sideZ(side);
    const g = this.platform;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 4), new THREE.MeshStandardMaterial({ color: 0xe4dfd5, roughness: 0.8 }));
    slab.position.set(0, -0.15, z * (HALF_D + 0.45 + 2));
    slab.receiveShadow = true;
    g.add(slab);
    const yellow = new THREE.Mesh(new THREE.BoxGeometry(16, 0.012, 0.16), new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.6 }));
    yellow.position.set(0, 0.006, z * (HALF_D + 0.9));
    g.add(yellow);
    // platform screen doors: glass panels with gaps at the train doors
    const glass = new THREE.MeshStandardMaterial({ color: 0x9fd3e0, transparent: true, opacity: 0.35, roughness: 0.1 });
    // the near side (towards the camera) gets half-height gates so they never hide the carriage
    const near = z > 0;
    const gateH = near ? 1.1 : 1.8;
    const frame = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.4, metalness: 0.5 });
    const gaps = [[2, 4], [8, 10]];
    for (let c = -4; c < E.COLS + 4; c++) {
      if (gaps.some(([a, b]) => c >= a && c < b)) continue;
      const x = (c - (E.COLS - 1) / 2) * CELL;
      const pane = new THREE.Mesh(new THREE.BoxGeometry(CELL - 0.02, gateH, 0.03), glass);
      pane.position.set(x, gateH / 2, z * (HALF_D + 0.62));
      g.add(pane);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, gateH + 0.1, 0.06), frame);
      post.position.set(x + CELL / 2, (gateH + 0.1) / 2, z * (HALF_D + 0.62));
      g.add(post);
    }
    if (!near) {
      const header = new THREE.Mesh(new THREE.BoxGeometry(16, 0.22, 0.08), frame);
      header.position.set(0, 1.95, z * (HALF_D + 0.62));
      g.add(header);
    }
    // station sign above the screen doors
    const name = line.stations[Math.min(s.station, line.stations.length - 1)];
    // station sign: on the far wall it faces the camera; on the near side it lies on the platform floor
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ map: this._signTexture(name, line.color), toneMapped: false }));
    if (near) { sign.rotation.x = -Math.PI / 2; sign.position.set(0, 0.01, z * (HALF_D + 1.5)); }
    else sign.position.set(0, 2.35, z * (HALF_D + 0.66));
    g.add(sign);
    this.platformBuiltFor = `${s.station}:${side}`;
  }

  _buildTunnel() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.9 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    this.tunnelLights = [];
    for (const z of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(40, 3, 0.3), wallMat);
      w.position.set(0, 1.2, z * (HALF_D + 2.6));
      this.tunnel.add(w);
      for (let i = 0; i < 10; i++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.05), lightMat);
        l.position.set(-20 + i * 4, 1.6, z * (HALF_D + 2.42));
        this.tunnel.add(l);
        this.tunnelLights.push(l);
      }
    }
    this.tunnel.visible = false;
  }

  _badge(stops) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = stops <= 1 ? '#F2B134' : '#FFFCF5';
    g.strokeStyle = '#2A1A12'; g.lineWidth = 6;
    g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#2A1A12'; g.font = `800 34px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(stops), 32, 35);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(cv), depthTest: false }));
    sp.scale.set(0.28, 0.28, 1);
    sp.renderOrder = 5;
    return sp;
  }

  /** Build the 3D group for a rider (or queue item) laid out on its cells, relative to the first cell. */
  _riderGroup(rd, { ghost = false, onPlatform = false } = {}) {
    const g = new THREE.Group();
    const [ar, ac] = rd.cells ? rd.cells[0] : [0, 0];
    const cells = rd.cells || E.shapeCells(rd.type, 0).map(([r, c, k]) => [r, c, k]);
    // standing riders face one of four directions, so every model stays inside its own square
    const facing = ((rd.id * 7) % 4) * (Math.PI / 2);
    for (const [r, c, k] of cells) {
      const local = new THREE.Vector3((c - ac) * CELL, 0, (r - ar) * CELL);
      const seat = !onPlatform && rd.cells && E.isSeat(r, c);
      let o;
      if (k === 'p' || k === 'kid') {
        const name = `Char_${charKey(rd.type, k, rd.id)}_${seat ? 'Sit' : 'Stand'}`;
        o = this.tpl[name].clone(true);
        if (seat) o.rotation.y = r === 0 ? 0 : Math.PI;
        else o.rotation.y = onPlatform ? (rd.side === 'top' ? Math.PI : 0) : facing;
        if (k === 'p' && rd.stops != null && !ghost) {
          const b = this._badge(rd.stops);
          b.position.set(0, (this.tpl[name].userData.height || 1.7) + 0.2, 0);
          o.add(b);
        }
      } else {
        o = this.tpl[ITEM_TPL[k]].clone(true);
        o.rotation.y = facing;
      }
      o.position.copy(local);
      g.add(o);
    }
    if (TE_PRIORITY.has(rd.type) && rd.cells && !ghost && !onPlatform) {
      const seated = E.isSeat(...rd.cells[0].slice(0, 2));
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.29, 40), new THREE.MeshBasicMaterial({ color: seated ? 0x3f8f5b : 0xd7263d, transparent: true, opacity: 0.9, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.012;
      ring.userData.pulse = !seated;
      g.add(ring);
    }
    if (ghost) g.traverse((m) => { if (m.isMesh) { m.material = Array.isArray(m.material) ? m.material.map((x) => this._ghostMat(x)) : this._ghostMat(m.material); m.castShadow = false; } });
    return g;
  }

  _ghostMat(mat) {
    const c = mat.clone();
    c.transparent = true;
    c.opacity = 0.45;
    c.depthWrite = false;
    return c;
  }

  sync(s) {
    this.s = s;
    if (!this.ready || !this.riders) { this.pending = s; return; }
    const key = `${s.station}:${s.side}`;
    // only rebuild the station once we've actually arrived (not while pulling out)
    if (this.platformBuiltFor !== key && (s.phase === 'board' || s.phase === 'over')) {
      this._buildPlatform(s);
      this.floorMat.map = this._floorTexture(s.side);
      this.floorMat.needsUpdate = true;
    }
    this.riders.clear();
    this.riderObjs = new Map();
    for (const rd of Object.values(s.riders)) {
      const g = this._riderGroup(rd);
      g.position.copy(cellPos(rd.cells[0][0], rd.cells[0][1]));
      this.riders.add(g);
      this.riderObjs.set(rd.id, g);
    }
    // waiting crowd on the platform
    this.crowd.clear();
    if (s.phase === 'board') {
      const z = sideZ(s.side);
      s.queue.forEach((q, i) => {
        const g = this._riderGroup({ ...q, side: s.side, stops: null }, { onPlatform: true });
        const door = i % 2 ? 8.5 : 2.5;
        g.position.set((door - (E.COLS - 1) / 2 + ((Math.floor(i / 2) % 3) - 1) * 1.6) * CELL, 0, z * (HALF_D + 1.3 + Math.floor(i / 6) * 0.6));
        this.crowd.add(g);
      });
    }
  }

  setMode(m) { this.mode = m; }

  async doors(open) {
    if (!this.ready || !this.doorLeaves) return;
    sfx.whoosh(open);
    const leaves = this.doorLeaves[this.s.side];
    await tween({ from: open ? 0 : 1, to: open ? 1 : 0, duration: 420, easing: ease.outCubic, onUpdate: (v) => {
      for (const l of leaves) l.position.x = l.userData.home + l.userData.dir * 0.55 * v;
    } });
  }

  setPicking(pick, s) {
    this.pick = pick;
    this.s = s;
    this.reach = pick ? E.reachable(s) : null;
    this.ghost && this.ghost.clear();
    this._paintOverlay();
    if (pick && this.hoverCell) this._ghost(...this.hoverCell);
  }

  _paintOverlay(ghostRes = null) {
    if (!this.ovTex) return;
    const cv = this._overlayCanvas();
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    if (this.reach) {
      g.fillStyle = 'rgba(127,196,142,.32)';
      for (const k of this.reach) { const [r, c] = k.split(',').map(Number); g.beginPath(); g.roundRect(c * 64 + 4, r * 64 + 4, 56, 56, 10); g.fill(); }
    }
    if (ghostRes) {
      g.fillStyle = ghostRes.ok ? 'rgba(63,143,91,.55)' : 'rgba(215,38,61,.5)';
      for (const [r, c] of ghostRes.cells) if (r >= 0 && r < E.ROWS && c >= 0 && c < E.COLS) { g.beginPath(); g.roundRect(c * 64 + 4, r * 64 + 4, 56, 56, 10); g.fill(); }
    }
    this.ovTex.needsUpdate = true;
  }

  _ghost(r, c) {
    if (!this.pick) return;
    const res = E.canPlace(this.s, this.pick.type, this.pick.rot, r, c, this.reach);
    this._paintOverlay(res);
    this.ghost.clear();
    const fake = { id: this.pick.id, type: this.pick.type, cells: res.cells.map(([cr, cc, k]) => [cr, cc, k]) };
    if (res.cells.every(([cr, cc]) => cr >= 0 && cr < E.ROWS && cc >= 0 && cc < E.COLS)) {
      const g = this._riderGroup(fake, { ghost: true });
      g.position.copy(cellPos(r, c));
      this.ghost.add(g);
    }
    if (this.onHover) this.onHover(res);
  }

  async animateBoard(rider, s) {
    this.sync(s);
    const g = this.riderObjs.get(rider.id);
    if (!g) return;
    const to = g.position.clone();
    const [, ac] = rider.cells[0];
    const door = E.DOOR_COLS.reduce((b, d) => (Math.abs(d - ac) < Math.abs(b - ac) ? d : b), E.DOOR_COLS[0]);
    const from = cellPos(E.doorRow(s.side), door).add(new THREE.Vector3(0, 0, sideZ(s.side) * 0.9));
    sfx.plop();
    await tween({ from: 0, to: 1, duration: reducedMotion() ? 60 : 320, easing: ease.outCubic, onUpdate: (v) => g.position.lerpVectors(from, to, v) });
  }

  async animateExits(exits, s) {
    if (!this.ready || !exits.length) { this.sync(s); return; }
    this.walkers.clear();
    const items = exits.map((e) => {
      const g = this._riderGroup(e.rider);
      const [ar, ac] = e.rider.cells[0];
      g.position.copy(cellPos(ar, ac));
      const door = E.DOOR_COLS.reduce((b, d) => (Math.abs(d - ac) < Math.abs(b - ac) ? d : b), E.DOOR_COLS[0]);
      this.walkers.add(g);
      return { g, from: g.position.clone(), to: cellPos(E.doorRow(s.side), door).add(new THREE.Vector3(0, 0, sideZ(s.side) * 1.6)) };
    });
    this.sync(s);
    await Promise.all(items.map((it, i) => wait(i * 90).then(() => tween({ from: 0, to: 1, duration: 600, easing: ease.inOutCubic, onUpdate: (v) => {
      it.g.position.lerpVectors(it.from, it.to, v);
      it.g.visible = v < 0.95;
    } }))));
    this.walkers.clear();
  }

  async travel(s) {
    if (!this.ready) return;
    this.crowd.clear();
    const p = this.platform;
    await tween({ from: 0, to: 1, duration: 700, easing: ease.inOutCubic, onUpdate: (v) => { p.position.x = -v * 14; } });
    p.visible = false;
    this.tunnel.visible = true;
    this.traveling = true;
    await wait(900);
    this.traveling = false;
    this.tunnel.visible = false;
    this._buildPlatform({ ...s, station: Math.min(s.station, E.lineOf(s).stations.length - 1) });
    p.visible = true;
    await tween({ from: 1, to: 0, duration: 700, easing: ease.outCubic, onUpdate: (v) => { p.position.x = v * 14; } });
  }

  // ---------- loop ----------
  _resize() {
    if (!this.renderer) return;
    const w = this.stage.clientWidth || 1, h = this.stage.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _target(t) {
    const vfov = this.camera.fov * D2R;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const portrait = this.camera.aspect < 1;
    const elev = (this.topDown ? 82 : portrait ? 70 : 56) * D2R;
    const W = E.COLS * CELL + 1.2;
    const dist = Math.max((W / 2) / Math.tan(hfov / 2), 3.6 / Math.tan(vfov / 2)) * 0.95;
    let az = 0;
    if (this.mode === 'idle' || this.mode === 'over') az = Math.sin(t * 0.25) * 0.5;
    const look = new THREE.Vector3(0, 0.4, 0.2);
    const pos = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev)).multiplyScalar(dist).add(look);
    return { pos, look };
  }

  _frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    const tg = this._target(t);
    const k = reducedMotion() ? 1 : 1 - Math.exp(-dt * 2.6);
    this.camPos.lerp(tg.pos, k);
    this.camLook.lerp(tg.look, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    if (this.traveling && this.tunnelLights) {
      for (const l of this.tunnelLights) { l.position.x -= dt * 30; if (l.position.x < -20) l.position.x += 40; }
    }
    if (this.riders) this.riders.traverse((o) => { if (o.userData && o.userData.pulse) o.material.opacity = 0.5 + Math.sin(t * 6) * 0.4; });
    this.renderer.render(this.scene, this.camera);
  }

  _cellFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(this.floorPlane, hit)) return null;
    const c = Math.floor(hit.x / CELL + E.COLS / 2), r = Math.floor(hit.z / CELL + E.ROWS / 2);
    return r >= 0 && r < E.ROWS && c >= 0 && c < E.COLS ? [r, c] : null;
  }

  _bind() {
    let down = null;
    this.canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    this.canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) { down = null; return; }
      down = null;
      if (e.button === 2) return;
      const cell = this._cellFromEvent(e);
      if (cell && this.pick && this.onCell) this.onCell(cell[0], cell[1]);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.pick || !this.ready) return;
      const cell = this._cellFromEvent(e);
      if (!cell) { this.hoverCell = null; this.ghost.clear(); this._paintOverlay(); return; }
      if (this.hoverCell && cell[0] === this.hoverCell[0] && cell[1] === this.hoverCell[1]) return;
      this.hoverCell = cell;
      this._ghost(...cell);
    });
    this.canvas.addEventListener('contextmenu', (e) => { if (this.pick) { e.preventDefault(); this.onRotate && this.onRotate(); } });
  }
}

const TE_PRIORITY = new Set(Object.entries(E.TYPES).filter(([, t]) => t.priority).map(([k]) => k));
