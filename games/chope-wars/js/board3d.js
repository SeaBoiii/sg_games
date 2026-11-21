// Chope Wars — 3D board (Three.js). Same adapter API as Board2D.
// Hawker-centre props (tables, stools, tissue packets, fans, stalls, tent cards, food trays)
// are templates in a Blender-made GLB; this file clones and arranges them.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as E from './engine.js';
import { tween, ease, wait, reducedMotion } from '../../../assets/lib/fx.js';
import { sfx, buzz } from '../../../assets/lib/sfx.js';

const SP = 1.5; // table spacing (m)
const SEAT_Y = 0.45;
const TABLE_Y = 0.74;
const PACKET_SCALE = 1.8; // exaggerated so packets read from the camera
const FONT = '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif';
const STALLS = [['CHICKEN RICE', '#D7263D'], ['KOPI · TEH', '#1F8A8A'], ['CHAR KWAY TEOW', '#F2B134'], ['LAKSA', '#2F6B4F'], ['SATAY', '#E0457B']];

const D2R = Math.PI / 180;
function canvasTex(cv, gltf = true) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (gltf) t.flipY = false;
  return t;
}
// glTF node names lose their '.001' dots in three.js, so match exact first, then by prefix
const find = (root, name) => root.getObjectByName(name) || (() => { let hit = null; root.traverse((o) => { if (!hit && o.name.startsWith(name)) hit = o; }); return hit; })();

export class Board3D {
  constructor(stage, { modelUrl = '../models/chope-assets.glb', fallbackHref = '../' } = {}) {
    this.onPick = null;
    this.stage = stage;
    this.pending = null;
    this.live = false;
    this.mode = 'place';
    this.camMode = 'idle';
    this.view = 0; // orbit quarter-turns chosen by the player
    this.topDown = false;
    this.packets = [];
    this.trays = [];
    this.rings = [];
    this.hot = [];

    stage.classList.add('stage-3d');
    stage.innerHTML = `
      <canvas class="gl" aria-label="3D hawker centre board"></canvas>
      <div class="loading" role="status"><div class="spinner" aria-hidden="true"></div><p>Setting up the hawker centre… <span class="pct">0%</span></p></div>
      <div class="cam-btns">
        <button type="button" data-cam="turn" aria-label="Turn the view">${'<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'}</button>
        <button type="button" data-cam="top" aria-label="Toggle top-down view">${'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>'}</button>
      </div>`;
    this.canvas = stage.querySelector('canvas');
    this.loadingEl = stage.querySelector('.loading');
    stage.querySelector('[data-cam="turn"]').onclick = () => { this.view = (this.view + 1) % 4; sfx.tap(); };
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
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.5;
    this.scene.fog = new THREE.Fog(0xe9dcc5, 14, 30);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    this.camPos = new THREE.Vector3(6, 7, 9);
    this.camLook = new THREE.Vector3(0, 0, 0);
    this.camera.position.copy(this.camPos);

    this.board = new THREE.Group();
    this.scene.add(this.board);
    this._lights();
    this._room();

    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._resize();
    new ResizeObserver(() => this._resize()).observe(stage);
    this.clock = new THREE.Clock();
    r.setAnimationLoop(() => this._frame());
    this._bind();

    this._load(modelUrl).catch((err) => {
      console.error(err);
      this.loadingEl.innerHTML = `<p>Couldn't load the 3D hawker centre.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
    });
  }

  // ---------- environment ----------
  _lights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xfff3df, 0x6b4a33, 1.0));
    const key = new THREE.DirectionalLight(0xffe7c4, 2.2);
    key.position.set(4, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const c = key.shadow.camera;
    c.left = -7; c.right = 7; c.top = 7; c.bottom = -7; c.near = 1; c.far = 25;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    s.add(key);
    const fill = new THREE.DirectionalLight(0xaee6df, 0.5);
    fill.position.set(-6, 5, -4);
    s.add(fill);
  }

  _room() {
    // terracotta + cream floor tiles
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#E2BFA3' : '#EFE4D1'; g.fillRect(x * 64, y * 64, 64, 64); }
    g.strokeStyle = 'rgba(60,30,15,.12)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); }
    const map = canvasTex(cv, false);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(45, 45);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map, roughness: 0.65 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    // ceiling with fluorescent tubes
    // faces down only: the camera looks in from above, dollhouse-style
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.9 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 3.6;
    this.scene.add(ceil);
    this.tubes = new THREE.Group();
    this.scene.add(this.tubes);
    this.pillars = new THREE.Group();
    this.scene.add(this.pillars);
  }

  async _load(url) {
    const gltf = await new GLTFLoader().loadAsync(url, (e) => {
      if (e.total) this.loadingEl.querySelector('.pct').textContent = `${Math.round((e.loaded / e.total) * 100)}%`;
    });
    await (document.fonts ? document.fonts.ready : null);
    const root = gltf.scene;
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.tpl = {};
    for (const name of ['TableTpl', 'StoolTpl', 'PacketTpl', 'FanTpl', 'StallTpl', 'CardTpl', 'TrayTpl']) {
      const t = root.getObjectByName(name);
      t.position.set(0, 0, 0);
      t.updateMatrixWorld(true);
      this.tpl[name] = t;
    }
    // packet materials per player colour
    const body = find(this.tpl.PacketTpl, 'PacketBody');
    this.packetMats = E.COLORS.map((c) => { const m = body.material.clone(); m.color.set(c); return m; });
    const tray = find(this.tpl.TrayTpl, 'TrayBase');
    this.trayMats = E.COLORS.map((c) => { const m = tray.material.clone(); m.color.set(c); return m; });
    this.ghostMats = E.COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.45, depthWrite: false }));
    this.ready = true;
    this.loadingEl.classList.add('done');
    if (this.pending) { const s = this.pending; this.pending = null; this.load(s); }
  }

  // ---------- geometry helpers ----------
  _tablePos(s, t) {
    const tb = E.geo(s).tables[t], h = (s.n - 1) / 2;
    return new THREE.Vector3((tb.c - h) * SP, 0, (tb.r - h) * SP);
  }
  _stoolPos(s, i) {
    const st = E.geo(s).stools[i], h = (s.n - 1) / 2;
    if (st.kind === 'h') return new THREE.Vector3((st.c - h) * SP, 0, (st.r - 0.5 - h) * SP);
    return new THREE.Vector3((st.c - 0.5 - h) * SP, 0, (st.r - h) * SP);
  }

  _cardTexture(name, type, value) {
    const cv = document.createElement('canvas');
    cv.width = 320; cv.height = 200;
    const g = cv.getContext('2d');
    g.fillStyle = type === 'famous' ? '#F2B134' : type === 'fan' ? '#DDF1EE' : '#FFFCF5';
    g.fillRect(0, 0, 320, 200);
    g.strokeStyle = '#2A1A12'; g.lineWidth = 10; g.strokeRect(5, 5, 310, 190);
    g.fillStyle = '#2A1A12'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 96px ${FONT}`;
    g.fillText(`+${value}`, 160, 92);
    g.font = `800 34px ${FONT}`;
    g.fillText(type === 'famous' ? `${name} · FAMOUS` : type === 'fan' ? `${name} · FAN` : name, 160, 162);
    return canvasTex(cv);
  }

  _signTexture(text, color) {
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 240;
    const g = cv.getContext('2d');
    g.fillStyle = '#2F6B4F'; g.fillRect(0, 0, 1024, 240);
    g.fillStyle = color; g.fillRect(0, 200, 1024, 40);
    g.fillStyle = '#FFF8E8'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 120px ${FONT}`;
    g.fillText(text, 512, 108, 960);
    return canvasTex(cv);
  }

  // ---------- adapter API ----------
  load(s) {
    if (!this.ready) { this.pending = s; return; }
    this.s = s;
    this.n = s.n;
    // clear previous board
    this.board.clear();
    this.tubes.clear();
    this.pillars.clear();
    const g = E.geo(s);
    const half = ((s.n - 1) / 2) * SP;
    this.extent = half + SP;

    // tables, tent cards, fans
    this.tableObjs = g.tables.map((tb, i) => {
      const t = this.tpl.TableTpl.clone(true);
      t.position.copy(this._tablePos(s, i));
      if (s.tables[i].type === 'famous') {
        const edge = find(t, 'TableEdge');
        edge.material = edge.material.clone();
        edge.material.color.set('#E2A93B');
        edge.material.metalness = 0.8;
        edge.material.roughness = 0.3;
      }
      const card = this.tpl.CardTpl.clone(true);
      const tex = this._cardTexture(tb.name, s.tables[i].type, s.tables[i].value);
      card.traverse((o) => { if (o.isMesh) o.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 }); });
      card.position.set(0, TABLE_Y, -0.16);
      card.scale.setScalar(1.5);
      t.add(card);
      if (s.tables[i].type === 'fan') {
        const fan = this.tpl.FanTpl.clone(true);
        fan.position.set(t.position.x, 3.6, t.position.z);
        fan.traverse((m) => {
          if (!m.isMesh) return;
          m.material = m.material.clone();
          m.material.transparent = true;
          m.material.opacity = 0.55;
          m.material.depthWrite = false;
          m.castShadow = false;
        });
        this.board.add(fan);
      }
      this.board.add(t);
      return t;
    });
    this.fans = [];
    this.board.traverse((o) => { if (o.name.startsWith('FanTpl')) { o.userData.blades = find(o, 'FanBlades'); this.fans.push(o); } });

    // stools + invisible pick targets
    const pickGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 12);
    const pickMat = new THREE.MeshBasicMaterial({ visible: false });
    this.picks = [];
    this.stoolObjs = g.stools.map((st, i) => {
      const o = this.tpl.StoolTpl.clone(true);
      const p = this._stoolPos(s, i);
      o.position.copy(p);
      o.rotation.y = ((i * 53) % 90) * D2R;
      this.board.add(o);
      const pick = new THREE.Mesh(pickGeo, pickMat);
      pick.position.set(p.x, 0.3, p.z);
      pick.userData.stool = i;
      this.board.add(pick);
      this.picks.push(pick);
      return o;
    });

    // stalls along the back
    const nStalls = Math.max(2, s.n - 1);
    const width = s.n * SP + 1;
    for (let k = 0; k < nStalls; k++) {
      const st = this.tpl.StallTpl.clone(true);
      const [name, color] = STALLS[k % STALLS.length];
      st.position.set(-width / 2 + (width / nStalls) * (k + 0.5), 0, -half - SP / 2 - 1.6);
      st.scale.setScalar(Math.min(1.25, (width / nStalls) / 1.9));
      const sign = find(st, 'StallSign');
      const signTex = this._signTexture(name, color);
      sign.material = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.18, emissiveMap: signTex });
      const aw = find(st, 'StallAwning');
      aw.material = aw.material.clone();
      aw.material.color.set(color);
      this.board.add(st);
    }

    // fluorescent tubes + pillars
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff8ec, emissiveIntensity: 2.2 });
    for (let r = 0; r <= s.n; r++) {
      const tube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.08), tubeMat);
      tube.position.set(0, 3.56, (r - s.n / 2) * SP);
      this.tubes.add(tube);
    }
    const pilMat = new THREE.MeshStandardMaterial({ color: 0xd9cdb8, roughness: 0.8 });
    for (const sx of [-1, 1]) for (const sz of [-1]) { // back pillars only, so nothing blocks the board
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.6, 0.45), pilMat);
      p.position.set(sx * (half + SP * 0.95), 1.8, sz * (half + SP * 0.95));
      p.castShadow = p.receiveShadow = true;
      this.pillars.add(p);
    }

    // dynamic layers
    this.packets = g.stools.map(() => null);
    this.trays = g.tables.map(() => null);
    this.hot = g.tables.map((_, i) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.7, 48), new THREE.MeshBasicMaterial({ color: 0xf2b134, transparent: true, opacity: 0, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(this._tablePos(s, i)).setY(0.012);
      this.board.add(ring);
      return ring;
    });
    this.lastRing = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.31, 40), new THREE.MeshBasicMaterial({ color: 0x2a1a12, transparent: true, opacity: 0, depthWrite: false }));
    this.lastRing.rotation.x = -Math.PI / 2;
    this.board.add(this.lastRing);
    this.ghost = this._makePacket(0, true);
    this.ghost.visible = false;
    this.board.add(this.ghost);

    this.sync(s);
  }

  _makePacket(p, ghost = false) {
    const o = this.tpl.PacketTpl.clone(true);
    o.scale.setScalar(PACKET_SCALE);
    o.traverse((m) => {
      if (!m.isMesh) return;
      if (ghost) { m.material = this.ghostMats[p]; m.castShadow = false; }
      else if (m.name.startsWith('PacketBody')) m.material = this.packetMats[p];
    });
    return o;
  }

  _placePacket(i, p) {
    const o = this._makePacket(p);
    const pos = this._stoolPos(this.s, i);
    o.position.set(pos.x, SEAT_Y, pos.z);
    o.rotation.y = (((i * 37) % 60) - 30) * D2R;
    this.board.add(o);
    this.packets[i] = { obj: o, owner: p };
    return o;
  }

  _setTray(t, owner, animate = false) {
    if (this.trays[t]) { this.board.remove(this.trays[t]); this.trays[t] = null; }
    if (owner == null) return;
    const tray = this.tpl.TrayTpl.clone(true);
    tray.traverse((m) => { if (m.isMesh && m.name.startsWith('TrayBase')) m.material = this.trayMats[owner]; });
    const p = this._tablePos(this.s, t);
    tray.position.set(p.x, TABLE_Y, p.z + 0.08);
    tray.scale.setScalar(1.5);
    // owner-coloured ring on the table rim
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.035, 10, 64), new THREE.MeshStandardMaterial({ color: E.COLORS[owner], roughness: 0.4, emissive: E.COLORS[owner], emissiveIntensity: 0.25 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.01 / 1.5, -0.08 / 1.5);
    ring.scale.setScalar(1 / 1.5);
    tray.add(ring);
    this.board.add(tray);
    this.trays[t] = tray;
    if (animate) {
      tray.scale.setScalar(0.01);
      tween({ from: 0, to: 1, duration: 520, easing: ease.outBack, onUpdate: (v) => tray.scale.setScalar(Math.max(0.01, v * 1.5)) });
    }
  }

  sync(s) {
    if (!this.ready) { this.pending = s; return; }
    if (s.n !== this.n || this.s !== s && !this.stoolObjs) { this.load(s); return; }
    this.s = s;
    s.stools.forEach((o, i) => {
      const cur = this.packets[i];
      if (cur && cur.owner === o) return;
      if (cur) { this.board.remove(cur.obj); this.packets[i] = null; }
      if (o != null) this._placePacket(i, o);
    });
    s.tables.forEach((t, i) => {
      const has = !!this.trays[i];
      if (t.owner != null && !has) this._setTray(i, t.owner);
      if (t.owner == null && has) this._setTray(i, null);
    });
    this._paintMarkers();
  }

  _paintMarkers() {
    const s = this.s;
    s.tables.forEach((t, i) => { this.hot[i].userData.on = t.owner == null && E.filledCount(s, i) === 3; });
    if (s.last && s.last.stool != null) {
      const p = this._stoolPos(s, s.last.stool);
      this.lastRing.position.set(p.x, 0.012, p.z);
      this.lastRing.material.opacity = 0.7;
    } else this.lastRing.material.opacity = 0;
  }

  setMode(m) { this.camMode = m; }

  setInteractive(on, { mode = 'place', player = 0, s = null } = {}) {
    this.live = on;
    this.mode = mode;
    this.player = player;
    if (s) this.s = s;
    this.stage.classList.toggle('live', on);
    if (!on && this.ghost) this.ghost.visible = false;
    this._swappable = new Set();
    if (on && mode === 'swap' && s) s.stools.forEach((_, i) => { if (E.canSwap(s, i, player)) this._swappable.add(i); });
    if (this.ghost && this.ready) this.ghost.traverse((m) => { if (m.isMesh) m.material = this.ghostMats[player]; });
  }

  async animateMove(ev, s) {
    if (!this.ready) { this.sync(s); return; }
    this.s = s;
    const i = ev.move.stool;
    const old = this.packets[i];
    if (ev.move.type === 'swap' && old) {
      sfx.sweep();
      const o = old.obj, x0 = o.position.x;
      await tween({ from: 0, to: 1, duration: 450, easing: ease.inOutCubic, onUpdate: (v) => { o.position.x = x0 + v * 1.2; o.position.y = SEAT_Y + Math.sin(v * Math.PI) * 0.6; o.rotation.z = v * 4; } });
      this.board.remove(o);
      this.packets[i] = null;
    }
    if (this.packets[i]) { this.board.remove(this.packets[i].obj); this.packets[i] = null; }
    const pk = this._placePacket(i, ev.player);
    const y1 = SEAT_Y;
    await tween({ from: 0, to: 1, duration: reducedMotion() ? 60 : 420, easing: ease.outCubic, onUpdate: (v) => {
      const b = v < 0.75 ? 1 - Math.pow(v / 0.75, 2) : Math.sin(((v - 0.75) / 0.25) * Math.PI) * 0.08;
      pk.position.y = y1 + b * 0.9;
      pk.rotation.x = (1 - v) * 0.8;
    } });
    sfx.plop();
    buzz(10);
    for (const c of ev.claims) {
      this._setTray(c.table, c.owner, true);
      sfx.claim(c.owner === ev.player);
      buzz(25);
      await wait(520);
    }
    this._paintMarkers();
  }

  // ---------- render loop + camera ----------
  _resize() {
    if (!this.renderer) return;
    const w = this.stage.clientWidth || 1, h = this.stage.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _camTarget(t) {
    const ext = this.extent || 3.5;
    const vfov = this.camera.fov * D2R;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const portrait = this.camera.aspect < 0.9;
    const elev = (this.topDown ? 78 : portrait ? 64 : 52) * D2R;
    const W = ext * 2 + 0.4;
    const dist = Math.max((W / 2) / Math.tan(hfov / 2), (ext * 1.45) / Math.tan(vfov / 2)) * (portrait ? 0.95 : 0.82);
    let az = this.view * (Math.PI / 2);
    if (this.camMode === 'idle' || this.camMode === 'over') az = t * (this.camMode === 'over' ? 0.25 : 0.12);
    const look = new THREE.Vector3(0, 0.3, portrait ? 0.2 : 0.35);
    const pos = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev)).multiplyScalar(dist).add(look);
    return { pos, look };
  }

  _frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    const tgt = this._camTarget(t);
    const k = reducedMotion() ? 1 : 1 - Math.exp(-dt * 2.4);
    this.camPos.lerp(tgt.pos, k);
    this.camLook.lerp(tgt.look, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    if (this.ready && this.s) {
      for (const f of this.fans) if (f.userData.blades) f.userData.blades.rotation.y += dt * 4;
      const pulse = 0.35 + Math.sin(t * 4) * 0.25;
      for (const r of this.hot) r.material.opacity += ((r.userData.on ? pulse : 0) - r.material.opacity) * 0.2;
      // swap mode: bob the packets that can be swapped
      this.packets.forEach((p, i) => {
        if (!p) return;
        const bob = this.live && this.mode === 'swap' && this._swappable && this._swappable.has(i);
        p.obj.position.y = SEAT_Y + (bob ? 0.08 + Math.sin(t * 6 + i) * 0.06 : 0);
      });
    }
    this.renderer.render(this.scene, this.camera);
  }

  _hit(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
    const hits = this.ray.intersectObjects(this.picks || [], false);
    return hits.length ? hits[0].object.userData.stool : null;
  }

  _ok(i) {
    if (i == null || !this.live || !this.s) return false;
    return this.mode === 'place' ? this.s.stools[i] == null : this._swappable.has(i);
  }

  _bind() {
    let down = null;
    this.canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    this.canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) { down = null; return; }
      down = null;
      const i = this._hit(e);
      if (this._ok(i) && this.onPick) { if (this.ghost) this.ghost.visible = false; this.onPick(i); }
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.ghost || e.pointerType === 'touch') return;
      const i = this._hit(e);
      const show = this.mode === 'place' && this._ok(i);
      this.ghost.visible = show;
      this.canvas.style.cursor = this._ok(i) ? 'pointer' : 'default';
      if (show) {
        const p = this._stoolPos(this.s, i);
        this.ghost.position.set(p.x, SEAT_Y + 0.02, p.z);
        this.ghost.rotation.y = (((i * 37) % 60) - 30) * D2R;
      }
    });
  }
}
