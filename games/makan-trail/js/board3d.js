// Makan Trail — 3D tabletop (Three.js). Same adapter API as Board2D:
//   load(s) · sync(s) · rollDie(v) · play(events, s, sound) · setMode(mode) · onSquare(i)
// The board is the 2D board art rendered to a texture, laid on a kopitiam table, with Blender
// props on the squares, tingkat tokens and a real die.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as E from './engine.js';
import { BOARD, CELL, centre, squareSVG, centreSVG, dishSVG, esc } from './art.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const SIZE = 2.2;          // board width in metres
const TOP = 0.772;         // table-top height
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PROP = { hawker: 'MiniHawker', home: 'MiniHDB', mrt: 'MiniMRT', erp: 'MiniERP', angbao: 'MiniAngBao', rain: 'MiniRain', card: 'MiniCards' };
const CHARS = ['student_a', 'aunty', 'uncle', 'worker_b'];
// die orientation that puts each face on top (face 1 is +Y in the model)
const FACE_UP = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [0, 0, Math.PI / 2], 5: [0, 0, -Math.PI / 2], 3: [Math.PI / 2, 0, 0], 4: [-Math.PI / 2, 0, 0] };

const toWorld = (x, y) => new THREE.Vector3(((x - 310) / 620) * SIZE, TOP + 0.004, ((y - 310) / 620) * SIZE);

export class Board3D {
  constructor(stage, { modelUrl = '../models/makan-assets.glb', fallbackHref = '../' } = {}) {
    this.stage = stage;
    this.onSquare = null;
    this.anims = [];
    stage.classList.add('stage-3d');
    stage.innerHTML = `
      <canvas class="gl" aria-label="3D Makan Trail table"></canvas>
      <div class="hud3d" aria-live="polite"></div>
      <div class="card3d" hidden></div>
      <div class="floats3d" aria-hidden="true"></div>
      <div class="loading" role="status"><div class="spinner" aria-hidden="true"></div><p>Wiping down the kopitiam table… <span class="pct">0%</span></p></div>`;
    this.canvas = stage.querySelector('canvas');
    this.hud = stage.querySelector('.hud3d');
    this.cardEl = stage.querySelector('.card3d');
    this.floats = stage.querySelector('.floats3d');
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
    this.scene.background = new THREE.Color(0xe9dcc6);
    this.scene.fog = new THREE.Fog(0xe9dcc6, 7, 18);
    this.scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.4;
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
    this.look = new THREE.Vector3(0, TOP, 0.12);
    this.scene.add(new THREE.HemisphereLight(0xfff6e4, 0x8a6a4a, 0.9));
    const lamp = new THREE.DirectionalLight(0xfff1d6, 2.0);
    lamp.position.set(-2.5, 6, 3.5);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(2048, 2048);
    Object.assign(lamp.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 15 });
    lamp.shadow.bias = -0.0005;
    this.scene.add(lamp);
    // kopitiam floor tiles
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#C9B79A' : '#E7DCC6'; g.fillRect(x * 64, y * 64, 64, 64); }
    const ft = new THREE.CanvasTexture(cv); ft.colorSpace = THREE.SRGBColorSpace; ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(12, 12);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.6 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.ray = new THREE.Raycaster();
    this.canvas.addEventListener('pointerdown', (e) => this._click(e));
    this._resize();
    new ResizeObserver(() => this._resize()).observe(stage);
    r.setAnimationLoop(() => this._render());
    this._load(modelUrl).catch((err) => {
      console.error(err);
      this.loadingEl.innerHTML = `<p>Couldn't load the 3D table.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
    });
  }

  async _load(url) {
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url, (e) => {
      if (e.total) this.loadingEl.querySelector('.pct').textContent = `${Math.round((e.loaded / e.total) * 100)}%`;
    });
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.tpl = {};
    for (const c of [...gltf.scene.children]) { c.position.set(0, 0, 0); this.tpl[c.name.replace(/_\d+$/, '')] = c; }
    this._add('KopiTable', 0, 0, 0);
    this.die = this._add('Die', 0.55, TOP + 0.04, 0.45, 0, 1.8);
    this.ready = true;
    this.loadingEl.classList.add('done');
    if (this.pendingS) { const s = this.pendingS; this.pendingS = null; this.load(s); }
  }

  _add(name, x, y, z, rotY = 0, scale = 1, parent = this.scene) {
    const t = this.tpl[name];
    if (!t) return null;
    const o = t.clone(true);
    o.position.set(x, y, z); o.rotation.y = rotY; o.scale.setScalar(scale);
    parent.add(o);
    return o;
  }

  load(s) {
    if (!this.ready) { this.pendingS = s; return; }
    if (this.set) this.scene.remove(this.set);
    this.set = new THREE.Group();
    this.scene.add(this.set);
    const owner = {};
    s.players.forEach((p) => { owner[p.home] = p.color; });
    // board texture from the 2D art
    const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 620" width="2048" height="2048">
      <style>text{font-family:'Segoe UI',system-ui,sans-serif}</style>
      <rect x="${BOARD.x - 6}" y="${BOARD.y - 6}" width="${BOARD.size + 12}" height="${BOARD.size + 12}" rx="22" fill="#6B3E26"/>
      <rect x="${BOARD.x}" y="${BOARD.y}" width="${BOARD.size}" height="${BOARD.size}" rx="16" fill="#F6EFE3"/>
      ${centreSVG()}${E.SQUARES.map((_, i) => squareSVG(i, owner[i])).join('')}</svg>`;
    const tex = new THREE.Texture();
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 2048; c.getContext('2d').drawImage(img, 0, 0, 2048, 2048); tex.image = c; tex.needsUpdate = true; URL.revokeObjectURL(img.src); };
    img.src = URL.createObjectURL(new Blob([doc], { type: 'image/svg+xml' }));
    const board = new THREE.Mesh(new THREE.BoxGeometry(SIZE, 0.03, SIZE), [
      ...Array(2).fill(new THREE.MeshStandardMaterial({ color: 0x6b3e26, roughness: 0.6 })),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }),
      ...Array(3).fill(new THREE.MeshStandardMaterial({ color: 0x6b3e26, roughness: 0.6 })),
    ]);
    board.position.y = TOP - 0.011;
    board.receiveShadow = true; board.castShadow = true;
    this.board = board;
    this.set.add(board);
    // props on the squares, nudged towards the top of each square so the labels stay readable
    E.SQUARES.forEach((q, i) => {
      const c = centre(i);
      const pos = toWorld(c.x, c.y - CELL * 0.12);
      const scale = q.type === 'home' ? 1.25 : q.type === 'hawker' ? 1.25 : 1.15;
      const o = this._add(PROP[q.type], pos.x, pos.y, pos.z, 0, scale, this.set);
      if (o && q.type === 'home') o.traverse((m) => { if (m.isMesh && m.material.name === 'MT_HDBAccent') { m.material = m.material.clone(); m.material.color.set(owner[i] || '#C9C1B1'); } });
    });
    // tokens and the players standing round the table
    this.vis = s.players.map((p) => p.pos);
    this.tokens = s.players.map((p) => {
      const t = this._add('Tingkat', 0, TOP, 0, 0, 1.9, this.set);
      t.traverse((m) => { if (m.isMesh && m.material.name === 'MT_Tier') { m.material = m.material.clone(); m.material.color.set(p.color); } });
      return t;
    });
    this.people = s.players.map((p, i) => {
      const c = centre(p.home);
      const w = toWorld(c.x, c.y);
      const dir = new THREE.Vector3(w.x, 0, w.z).normalize();
      const o = this._add(`Char_${CHARS[i]}_Stand`, dir.x * 2.05, 0, dir.z * 2.05, Math.atan2(-dir.x, -dir.z), 0.95, this.set);
      return o;
    });
    this.hlMeshes = [];
    this._placeAll();
    this.hudKey = '';
    this.optKey = '';
    this.sync(s);
  }

  _spot(p, sq) {
    const c = centre(sq);
    const here = this.vis.map((v, k) => (v === sq ? k : -1)).filter((k) => k >= 0);
    const n = here.length, k = Math.max(0, here.indexOf(p));
    const off = n <= 1 ? [[0, 0]] : n === 2 ? [[-12, 0], [12, 0]] : n === 3 ? [[-14, 6], [14, 6], [0, -10]] : [[-13, -8], [13, -8], [-13, 10], [13, 10]];
    const [dx, dy] = off[k] || [0, 0];
    return toWorld(c.x + dx, c.y + dy + 12);
  }
  _placeAll() { this.tokens.forEach((t, p) => t.position.copy(this._spot(p, this.vis[p]))); }

  sync(s) {
    if (!this.ready) { this.pendingS = s; return; }
    if (!this.tokens) return;
    // glowing squares the current player may stop at
    const optKey = s.phase === 'choose' && !E.current(s).cpu ? s.options.join(',') : '';
    if (optKey !== this.optKey) {
      this.optKey = optKey;
      for (const m of this.hlMeshes) this.set.remove(m);
      this.hlMeshes = (optKey ? s.options : []).map((i) => {
        const c = centre(i), w = toWorld(c.x, c.y);
        const m = new THREE.Mesh(new THREE.RingGeometry(0.125, 0.165, 4, 1), new THREE.MeshBasicMaterial({ color: E.current(s).color, transparent: true, opacity: 0.95 }));
        m.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
        m.position.set(w.x, TOP + 0.006, w.z);
        m.userData.sq = i;
        this.set.add(m);
        return m;
      });
    }
    this._hud(s);
  }

  _hud(s) {
    const key = s.players.map((p) => `${p.money}|${p.got.join()}|${p.skip}`).join('/') + `|${s.turn}|${s.phase}`;
    if (key === this.hudKey) return;
    this.hudKey = key;
    this.hud.innerHTML = s.players.map((p, i) => `<div class="h3p ${i === s.turn && s.phase !== 'over' ? 'on' : ''}" style="--c:${p.color}">
      <b>${esc(p.name)}</b><em>$${p.money}</em><small class="h3n">${p.got.length}/${E.LIST_SIZE}</small>
      <span class="h3d">${p.list.map((d) => `<svg viewBox="-26 -26 52 52" class="${p.got.includes(d) ? 'got' : ''}" aria-label="${E.DISHES[d].name}">${dishSVG(d)}</svg>`).join('')}</span>
    </div>`).join('');
  }

  _anim(dur, fn) { return new Promise((res) => this.anims.push({ t0: performance.now(), dur, fn, done: res })); }

  async rollDie(v) {
    if (!this.die) return;
    const d = this.die;
    const start = new THREE.Vector3(-0.2, TOP + 0.6, 0.9), end = new THREE.Vector3(0.55, TOP + 0.045, 0.42);
    const [ex, ey, ez] = FACE_UP[v];
    const spin = new THREE.Euler(ex + Math.PI * 4, (Math.random() - 0.5) * 1.2 + Math.PI * 2, ez + Math.PI * 2);
    await this._anim(720, (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      d.position.lerpVectors(start, end, e);
      d.position.y = end.y + (start.y - end.y) * (1 - e) + Math.abs(Math.sin(k * Math.PI * 2.5)) * 0.12 * (1 - k);
      d.rotation.set(spin.x * (1 - e) + ex * e, spin.y * (1 - e), spin.z * (1 - e) + ez * e);
    });
    d.rotation.set(ex, 0, ez);
  }

  async _hopTo(p, to, stepMs, onStep) {
    while (this.vis[p] !== to) {
      const from = this._spot(p, this.vis[p]);
      this.vis[p] = (this.vis[p] + 1) % E.N;
      const b = this._spot(p, this.vis[p]);
      const t = this.tokens[p];
      await this._anim(stepMs, (k) => { t.position.lerpVectors(from, b, k); t.position.y = TOP + Math.sin(k * Math.PI) * 0.09; });
      if (onStep) onStep();
    }
    this._placeAll();
  }
  async _slideTo(p, to, ms) {
    const a = this._spot(p, this.vis[p]);
    this.vis[p] = to;
    const b = this._spot(p, to);
    const t = this.tokens[p];
    await this._anim(ms, (k) => { const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; t.position.lerpVectors(a, b, e); t.position.y = TOP + Math.sin(k * Math.PI) * 0.25; });
    this._placeAll();
  }

  _float(text, sq, cls) {
    const c = centre(sq);
    const v = toWorld(c.x, c.y); v.y += 0.2; v.project(this.camera);
    const el = document.createElement('div');
    el.className = `float3d ${cls}`;
    el.textContent = text;
    el.style.left = `${((v.x + 1) / 2) * 100}%`; el.style.top = `${((1 - v.y) / 2) * 100}%`;
    this.floats.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  async play(events, s, sound = () => {}) {
    for (const ev of events) {
      const p = ev.p;
      if (ev.type === 'move') await this._hopTo(p, ev.to, 170, () => sound({ type: 'step' }));
      else if (ev.type === 'hop') { if (ev.by > 0) await this._hopTo(p, ev.to, 170, () => sound({ type: 'step' })); else await this._slideTo(p, ev.to, 450); }
      else if (ev.type === 'mrt') { sound(ev); await this._slideTo(p, ev.to, 900); }
      else {
        sound(ev);
        const at = ev.at ?? this.vis[p];
        if (ev.type === 'payday' || ev.type === 'angbao') this._float(`+$${ev.amount}`, at, 'good');
        else if (ev.type === 'erp') this._float(ev.amount ? `−$${ev.amount}` : 'No cash!', at, 'bad');
        else if (ev.type === 'rain') this._float('Kena rain!', at, 'bad');
        else if (ev.type === 'broke') this._float('Not enough $', at, 'bad');
        else if (ev.type === 'buy') { this._float(ev.free ? `Free ${E.DISHES[ev.dish].name}!` : `${E.DISHES[ev.dish].name} −$${ev.price}`, at, ev.free ? 'good' : 'plain'); await wait(650); }
        else if (ev.type === 'card') await this._card(ev.text);
        else if (ev.type === 'win') { this._float('HOME!', at, 'good'); const t = this.tokens[p]; await this._anim(900, (k) => { t.rotation.y = k * Math.PI * 4; t.position.y = TOP + Math.sin(k * Math.PI) * 0.3; }); }
        if (!['buy', 'card', 'win', 'nothing', 'visit'].includes(ev.type)) await wait(420);
      }
      this._hud(s);
    }
  }

  async _card(text) {
    this.cardEl.innerHTML = `<small>KOPITIAM TALK</small><b>${esc(text)}</b>`;
    this.cardEl.hidden = false;
    this.cardEl.classList.remove('pop'); void this.cardEl.offsetWidth; this.cardEl.classList.add('pop');
    await wait(1700);
    this.cardEl.hidden = true;
  }

  _click(e) {
    if (!this.ready || !this.board || !this.onSquare || !this.hlMeshes.length) return;
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const hit = this.ray.intersectObject(this.board, false)[0];
    if (!hit) return;
    // back to board (SVG) coordinates and find the nearest highlighted square
    const x = (hit.point.x / SIZE) * 620 + 310, y = (hit.point.z / SIZE) * 620 + 310;
    let best = null, bd = 1e9;
    for (const m of this.hlMeshes) { const c = centre(m.userData.sq); const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; best = m.userData.sq; } }
    if (best != null && bd < CELL * 0.8) this.onSquare(best);
  }

  setMode(mode) { this.stage.dataset.mode = mode; }

  _render() {
    const now = performance.now();
    this.anims = this.anims.filter((a) => { const k = Math.min(1, (now - a.t0) / a.dur); a.fn(k); if (k >= 1) { a.done(); return false; } return true; });
    const t = now / 1000;
    if (this.hlMeshes) this.hlMeshes.forEach((m) => { m.material.opacity = 0.55 + Math.sin(t * 6) * 0.4; });
    if (this.people) this.people.forEach((o, i) => { if (o) o.position.y = Math.abs(Math.sin(t * 1.6 + i)) * 0.01; });
    this.renderer.render(this.scene, this.camera);
  }

  _resize() {
    const w = this.stage.clientWidth || 1, h = this.stage.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const cam = this.camera;
    cam.aspect = w / h;
    const halfW = 1.45, halfH = 1.25;
    const vHalf = THREE.MathUtils.degToRad(cam.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * cam.aspect);
    const dist = Math.max(halfH / Math.tan(vHalf), halfW / Math.tan(hHalf)) + 1.3;
    cam.position.set(0, TOP + dist * 0.78, dist * 0.62);
    cam.lookAt(this.look);
    cam.updateProjectionMatrix();
  }
}
