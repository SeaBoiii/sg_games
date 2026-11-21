// Pasar Malam Haggle — 3D night market (Three.js). Same adapter API as Board2D.
// Stalls, goods, string lights and the stallholders are Blender-made templates; every stall of the
// night is laid out along one aisle and the camera walks from stall to stall.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as E from './engine.js';
import { CANOPY } from './art.js';
import { tween, ease, wait, reducedMotion } from '../../../assets/lib/fx.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const GAP = 4.2;
const FONT = '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => `$${n.toFixed(2)}`;
const BULBS = ['#FFD877', '#FF9FBF', '#9FD3FF', '#B6F2A0'];
const CROWD = ['worker_b', 'parent', 'kid', 'ns', 'student_b', 'worker_a', 'aunty'];

function canvasTex(w, h, draw, gltf = true) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (gltf) t.flipY = false;
  t.userData.canvas = cv;
  return t;
}

export class Board3D {
  constructor(stage, { modelUrl = '../models/pasar-assets.glb', fallbackHref = '../' } = {}) {
    this.stage = stage;
    this.mode = 'idle';
    this.stallObjs = [];
    this.cur = 0;
    stage.classList.add('stage-3d');
    stage.innerHTML = `
      <canvas class="gl" aria-label="3D night market"></canvas>
      <div class="bubbles3d" aria-live="polite"><div class="bub3d seller-bub" hidden><span class="pips3d"></span><b></b></div></div>
      <div class="loading" role="status"><div class="spinner" aria-hidden="true"></div><p>Setting up the stalls… <span class="pct">0%</span></p></div>`;
    this.canvas = stage.querySelector('canvas');
    this.bub = stage.querySelector('.seller-bub');
    this.loadingEl = stage.querySelector('.loading');
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
    r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1b1f4a);
    this.scene.fog = new THREE.Fog(0x2a2350, 9, 26);
    this.scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.25;
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
    this.camPos = new THREE.Vector3(0, 1.7, 3.6);
    this.camLook = new THREE.Vector3(0, 1.25, 0);
    this.scene.add(new THREE.HemisphereLight(0x8a7bd8, 0x2b2230, 0.7));
    const moon = new THREE.DirectionalLight(0xbfc8ff, 0.6);
    moon.position.set(-4, 8, 6);
    this.scene.add(moon);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 40), new THREE.MeshStandardMaterial({ color: 0x2b2a33, roughness: 0.85 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this._resize();
    new ResizeObserver(() => this._resize()).observe(stage);
    this.clock = new THREE.Clock();
    r.setAnimationLoop(() => this._frame());
    this._load(modelUrl).catch((err) => {
      console.error(err);
      this.loadingEl.innerHTML = `<p>Couldn't load the 3D market.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
    });
  }

  async _load(url) {
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url, (e) => {
      if (e.total) this.loadingEl.querySelector('.pct').textContent = `${Math.round((e.loaded / e.total) * 100)}%`;
    });
    if (document.fonts) await document.fonts.ready;
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.tpl = {};
    for (const c of [...gltf.scene.children]) { c.position.set(0, 0, 0); this.tpl[c.name] = c; }
    this.ready = true;
    this.loadingEl.classList.add('done');
    if (this.pending) { const s = this.pending; this.pending = null; this.load(s); }
  }

  _signTex(text) {
    return canvasTex(1024, 180, (g, w, h) => {
      g.fillStyle = '#1A1512'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#FFD877'; g.font = `800 96px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2 + 6, w - 60);
    });
  }

  _drawBoard(t, item, ask, cur, last) {
    const cv = t.userData.canvas, g = cv.getContext('2d'), w = cv.width, h = cv.height;
    g.fillStyle = '#22302A'; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(232,239,230,.85)'; g.font = `800 40px ${FONT}`;
    g.fillText(item.toUpperCase(), w / 2, 60, w - 40);
    if (cur < ask) {
      g.fillStyle = 'rgba(232,239,230,.55)'; g.font = `800 52px ${FONT}`;
      const txt = money(ask); g.fillText(txt, w / 2, 130);
      const tw = g.measureText(txt).width; g.fillRect(w / 2 - tw / 2, 128, tw, 6);
    }
    g.fillStyle = last ? '#FF9FBF' : '#FFD877'; g.font = `800 120px ${FONT}`;
    g.fillText(money(cur), w / 2, cur < ask ? 240 : 200);
    t.needsUpdate = true;
  }

  load(s) {
    if (!this.ready) { this.pending = s; return; }
    for (const o of this.stallObjs) this.scene.remove(o.root);
    if (this.extras) this.scene.remove(this.extras);
    this.stallObjs = [];
    this.extras = new THREE.Group();
    this.scene.add(this.extras);
    s.stalls.forEach((st, i) => {
      const S = E.SELLERS[st.seller];
      const root = new THREE.Group();
      root.position.set(i * GAP, 0, 0);
      const stall = this.tpl.StallTpl.clone(true);
      const col = new THREE.Color(CANOPY[st.seller]);
      stall.traverse((m) => {
        if (!m.isMesh) return;
        if (/^(CanopyC|ScallopC|Valance)/.test(m.name)) { m.material = m.material.clone(); m.material.color.copy(col); }
        if (/^Cloth/.test(m.name)) { m.material = m.material.clone(); m.material.color.copy(col).lerp(new THREE.Color('#FFF8E8'), 0.15); }
      });
      const sign = stall.getObjectByName('StallSign');
      sign.material = new THREE.MeshBasicMaterial({ map: this._signTex(`${S.name.toUpperCase()}'S STALL`), toneMapped: false });
      const boardTex = canvasTex(512, 366, () => {});
      const board = stall.getObjectByName('PriceBoard');
      board.material = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.9, emissive: 0xffffff, emissiveMap: boardTex, emissiveIntensity: 0.25 });
      this._drawBoard(boardTex, E.ITEMS[st.item].name, st.ask, st.ask, false);
      root.add(stall);
      const seller = (this.tpl[`Char_${S.who}_Stand`] || this.tpl.Char_uncle_Stand).clone(true);
      seller.position.set(0.25, 0, -0.2);
      root.add(seller);
      const goods = this.tpl[`Goods_${st.item}`].clone(true);
      goods.position.set(-0.55, 0.89, 0.42);
      goods.scale.setScalar(2.3);
      root.add(goods);
      const lamp = new THREE.PointLight(0xffd9a0, 6, 6, 1.8);
      lamp.position.set(0, 2.1, 0.6);
      root.add(lamp);
      this.scene.add(root);
      this.stallObjs.push({ root, seller, goods, boardTex, item: E.ITEMS[st.item].name, ask: st.ask, height: new THREE.Box3().setFromObject(seller).max.y });
    });
    // string lights criss-crossing the aisle, and shoppers on the far side
    const spans = s.stalls.length + 1;
    for (let i = -1; i < spans; i++) {
      for (const [z, y] of [[1.4, 3.0], [2.6, 3.2]]) {
        const L = this.tpl.LightsTpl.clone(true);
        L.position.set(i * GAP + GAP / 2, y, z);
        L.scale.set(GAP / 4, 1, 1);
        let k = 0;
        L.traverse((m) => { if (m.isMesh && m.name.startsWith('Bulb')) { const c = BULBS[(k++ + i) % 4]; m.material = new THREE.MeshBasicMaterial({ color: c }); m.scale.set(4 / GAP, 1, 1); } });
        this.extras.add(L);
      }
    }
    for (let i = 0; i < s.stalls.length * 2; i++) {
      const who = CROWD[i % CROWD.length];
      const p = this.tpl[`Char_${who}_Stand`].clone(true);
      p.position.set(i * (GAP / 2) - 1 + ((i * 37) % 10) / 10, 0, 6 + ((i * 53) % 10) / 6);
      p.rotation.y = Math.PI + (((i * 17) % 10) - 5) / 10;
      p.userData.sway = i * 0.7;
      this.extras.add(p);
    }
    this.cur = s.stallIdx;
    this.camPos.set(this.cur * GAP, 1.95, 5.0);
    this.sync(s);
  }

  setMode(m) { this.mode = m; }

  sync(s) {
    if (!this.ready) { this.pending = s; return; }
    if (!this.stallObjs.length || s.phase === 'over') { this.bub.hidden = true; return; }
    if (this.stallObjs.length !== s.stalls.length) { this.load(s); return; }
    const o = this.stallObjs[s.stallIdx];
    if (!o) return;
    const st = E.stallOf(s), S = E.SELLERS[st.seller], h = s.h;
    this._drawBoard(o.boardTex, o.item, st.ask, h ? h.cur : st.ask, !!(h && h.last != null));
    this.bub.hidden = false;
    this.bub.querySelector('b').textContent = h ? h.line : S.lines.hello;
    const max = h ? h.max : S.patience, pat = h ? Math.max(0, h.patience) : S.patience;
    this.bub.querySelector('.pips3d').innerHTML = h ? Array.from({ length: max }, (_, i) => `<i class="${i < pat ? 'on' : ''}"></i>`).join('') : '';
    this.bub.classList.toggle('angry', !!(h && h.mood === 'cross'));
    this.cur = s.stallIdx;
  }

  async react(res, s) {
    this.sync(s);
    const o = this.stallObjs[s.stallIdx];
    if (!o) return;
    const p = o.seller, y0 = 0;
    if (res.result === 'deal' || res.result === 'callback') {
      await tween({ from: 0, to: 1, duration: 450, easing: ease.outCubic, onUpdate: (t) => { p.position.y = y0 + Math.sin(t * Math.PI) * 0.15; } });
      if (res.result === 'deal') {
        const g = o.goods, from = g.position.clone();
        await tween({ from: 0, to: 1, duration: 500, easing: ease.inOutCubic, onUpdate: (t) => { g.position.set(from.x, from.y + Math.sin(t * Math.PI) * 0.3, from.z + t * 1.2); g.scale.setScalar(2.3 * (1 - t * 0.6)); } });
        g.visible = false;
      }
    } else if (res.result === 'insult' || res.result === 'angry') {
      await tween({ from: 0, to: 1, duration: 450, onUpdate: (t) => { p.rotation.y = Math.sin(t * Math.PI * 6) * 0.3 * (1 - t); } });
    } else {
      await tween({ from: 0, to: 1, duration: 300, onUpdate: (t) => { p.rotation.x = Math.sin(t * Math.PI) * 0.08; } });
    }
    p.position.y = 0; p.rotation.set(0, 0, 0);
  }

  async walk(s) {
    this.bub.hidden = true;
    this.cur = s.stallIdx;
    await wait(reducedMotion() ? 50 : 900);
    this.sync(s);
  }

  _resize() {
    if (!this.renderer) return;
    const w = this.stage.clientWidth || 1, h = this.stage.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    const a = this.camera.aspect;
    const back = a < 1 ? 1 + (1 - a) * 1.4 : a < 1.3 ? 1 + (1.3 - a) * 0.6 : 1;
    const x = this.cur * GAP + (this.mode === 'idle' ? Math.sin(t * 0.3) * 0.4 : 0);
    const want = new THREE.Vector3(x, 1.95 + (back - 1) * 0.4, 5.0 * back);
    const look = new THREE.Vector3(this.cur * GAP, 1.35, 0);
    const k = reducedMotion() ? 1 : 1 - Math.exp(-dt * 2.2);
    this.camPos.lerp(want, k);
    this.camLook.lerp(look, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    if (this.ready) {
      if (this.extras) this.extras.children.forEach((c) => { if (c.userData.sway != null) c.rotation.z = Math.sin(t * 1.3 + c.userData.sway) * 0.03; });
      const o = this.stallObjs[this.cur];
      if (o && !this.bub.hidden) {
        // beside the seller's head, below the stall sign
        const p = new THREE.Vector3(o.root.position.x + 1.05, o.height - 0.05, -0.2).project(this.camera);
        const w = this.stage.clientWidth, h = this.stage.clientHeight;
        this.bub.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px) translate(-50%, -100%)`;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}
