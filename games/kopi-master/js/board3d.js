// Kopi Master — 3D stall (Three.js). Same adapter API as Board2D.
// You stand behind the counter. Customers (the same Blender-made characters as MRT Rush) walk up,
// their orders float above them as HTML speech bubbles, and the drink builds up on the counter.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { liquidColor } from './art.js';
import { tween, ease, wait, reducedMotion } from '../../../assets/lib/fx.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const SLOT_X = [-1.05, 0, 1.05];
const CUST_Z = -1.0;
const TOP_Y = 0.985;
const DRINK = new THREE.Vector3(0.15, TOP_Y, 0.3);
const DRINK_SCALE = 2.0;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const find = (root, name) => root.getObjectByName(name) || (() => { let h = null; root.traverse((o) => { if (!h && o.name.startsWith(name)) h = o; }); return h; })();

export class Board3D {
  constructor(stage, { modelUrl = '../models/kopi-assets.glb', fallbackHref = '../' } = {}) {
    this.stage = stage;
    this.onSelect = null;
    this.cust = new Map();
    this.mode = 'idle';
    this.pendingLoad = null;
    stage.classList.add('stage-3d');
    stage.innerHTML = `
      <canvas class="gl" aria-label="3D kopitiam drinks stall"></canvas>
      <div class="bubbles3d" aria-live="polite"></div>
      <div class="loading" role="status"><div class="spinner" aria-hidden="true"></div><p>Brewing the kopi… <span class="pct">0%</span></p></div>`;
    this.canvas = stage.querySelector('canvas');
    this.bubbleLayer = stage.querySelector('.bubbles3d');
    this.loadingEl = stage.querySelector('.loading');
    this.bubbleLayer.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cid]');
      if (b && this.onSelect) this.onSelect(+b.dataset.cid);
    });

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
    this.scene.fog = new THREE.Fog(0xf3e2c4, 8, 18);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 40);
    this.camPos = new THREE.Vector3(0, 1.8, 2.2);
    this.camLook = new THREE.Vector3(0, 1.2, -1);
    this.scene.add(new THREE.HemisphereLight(0xfff3df, 0x6b4a33, 1.1));
    const key = new THREE.DirectionalLight(0xffe7c4, 2.0);
    key.position.set(2, 5, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 15 });
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);
    this._room();
    this._resize();
    new ResizeObserver(() => this._resize()).observe(stage);
    this.clock = new THREE.Clock();
    r.setAnimationLoop(() => this._frame());
    this._load(modelUrl).catch((err) => {
      console.error(err);
      this.loadingEl.innerHTML = `<p>Couldn't load the 3D stall.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
    });
  }

  _room() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#E2BFA3' : '#EFE4D1'; g.fillRect(x * 64, y * 64, 64, 64); }
    const map = new THREE.CanvasTexture(cv);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(20, 20);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map, roughness: 0.7 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    // back wall: cream paint above a green-and-cream tile dado
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 6), new THREE.MeshStandardMaterial({ color: 0xf6ead4, roughness: 0.9 }));
    wall.position.set(0, 3, -7.5);
    this.scene.add(wall);
    const tv = document.createElement('canvas');
    tv.width = 256; tv.height = 64;
    const tg = tv.getContext('2d');
    for (let x = 0; x < 8; x++) { tg.fillStyle = x % 2 ? '#2F6B4F' : '#E8EFE6'; tg.fillRect(x * 32, 0, 32, 32); tg.fillStyle = x % 2 ? '#E8EFE6' : '#2F6B4F'; tg.fillRect(x * 32, 32, 32, 32); }
    const tmap = new THREE.CanvasTexture(tv);
    tmap.colorSpace = THREE.SRGBColorSpace;
    tmap.wrapS = THREE.RepeatWrapping;
    tmap.repeat.set(30, 1);
    const dado = new THREE.Mesh(new THREE.PlaneGeometry(40, 1.2), new THREE.MeshStandardMaterial({ map: tmap, roughness: 0.4 }));
    dado.position.set(0, 0.6, -7.49);
    this.scene.add(dado);
  }

  async _load(url) {
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url, (e) => {
      if (e.total) this.loadingEl.querySelector('.pct').textContent = `${Math.round((e.loaded / e.total) * 100)}%`;
    });
    const root = gltf.scene;
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.tpl = {};
    for (const c of [...root.children]) { c.position.set(0, 0, 0); this.tpl[c.name] = c; }

    const counter = this.tpl.CounterTpl.clone(true);
    this.scene.add(counter);
    const props = this.tpl.PropsTpl.clone(true);
    props.position.set(-1.75, TOP_Y, 0.3);
    props.scale.setScalar(1.15);
    this.scene.add(props);
    // the hall behind the customers
    const spots = [[-2.6, -3.4], [0, -4.2], [2.6, -3.4], [-1.4, -5.8], [1.6, -5.9]];
    for (const [x, z] of spots) {
      const t = this.tpl.HallTableTpl.clone(true);
      t.position.set(x, 0, z);
      this.scene.add(t);
      for (const [dx, dz] of [[-0.75, 0], [0.75, 0], [0, -0.75]]) {
        const st = this.tpl.HallStoolTpl.clone(true);
        st.position.set(x + dx, 0, z + dz);
        this.scene.add(st);
      }
    }
    this.fans = [];
    for (const [x, z] of [[-1.8, -2.6], [1.8, -2.6], [0, -5]]) {
      const f = this.tpl.HallFanTpl.clone(true);
      f.position.set(x, 3.4, z);
      f.userData.blades = find(f, 'FanBlades');
      this.scene.add(f);
      this.fans.push(f);
    }
    // the drink being built
    this.drink = new THREE.Group();
    this.drink.position.copy(DRINK);
    this.drink.scale.setScalar(DRINK_SCALE);
    this.scene.add(this.drink);
    this.vessels = {};
    for (const [k, n] of [['cup', 'CupTpl'], ['glass', 'GlassTpl'], ['bag', 'BagTpl']]) {
      const v = this.tpl[n].clone(true);
      v.visible = false;
      v.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); });
      this.drink.add(v);
      this.vessels[k] = v;
    }
    this.vessels.glass.traverse((m) => { if (m.isMesh && m.name.startsWith('Glass') && !m.name.startsWith('GlassLiquid')) { m.material.transparent = true; m.material.opacity = 0.3; m.material.depthWrite = false; } });
    this.vessels.bag.traverse((m) => { if (m.isMesh && m.name.startsWith('BagPlastic')) { m.material.transparent = true; m.material.opacity = 0.35; m.material.depthWrite = false; } });
    this.foam = this.tpl.FoamTpl.clone(true);
    this.milo = this.tpl.MiloHeapTpl.clone(true);
    this.drink.add(this.foam, this.milo);
    this.sugar = [];
    for (let i = 0; i < 4; i++) {
      const s = this.tpl.SugarTpl.clone(true);
      s.position.set(0.1 + (i % 2) * 0.022, 0, 0.02 + Math.floor(i / 2) * 0.022);
      this.drink.add(s);
      this.sugar.push(s);
    }
    this.ready = true;
    this.loadingEl.classList.add('done');
    if (this.pendingLoad) { const s = this.pendingLoad; this.pendingLoad = null; this.load(s); }
  }

  // ---------- adapter API ----------
  load(s) {
    if (!this.ready) { this.pendingLoad = s; return; }
    for (const [, c] of this.cust) { this.scene.remove(c.obj); c.bub.remove(); }
    this.cust.clear();
    this.sync(s);
  }

  setMode(m) { this.mode = m; }

  _bubble(c) {
    const b = document.createElement('button');
    b.className = 'bub3d entering';
    b.dataset.cid = c.id;
    b.type = 'button';
    b.innerHTML = `<span class="sel">SERVING</span><b>${esc(c.order.text)}</b><small>$${c.order.price.toFixed(2)}</small><i class="pat"><i></i></i>`;
    this.bubbleLayer.appendChild(b);
    requestAnimationFrame(() => b.classList.remove('entering'));
    return b;
  }

  sync(s) {
    this.s = s;
    if (!this.ready) { this.pendingLoad = s; return; }
    const ids = new Set(s.counter.map((c) => c.id));
    for (const [id, c] of this.cust) if (!ids.has(id) && !c.leaving) { this.scene.remove(c.obj); c.bub.remove(); this.cust.delete(id); }
    s.counter.forEach((c, i) => {
      let e = this.cust.get(c.id);
      const x = SLOT_X[i] ?? SLOT_X[2];
      if (!e) {
        const tpl = this.tpl[`Cust_${c.who}`] || this.tpl.Cust_worker_a;
        const obj = tpl.clone(true);
        obj.position.set(x + (i % 2 ? 3 : -3), 0, CUST_Z);
        this.scene.add(obj);
        e = { obj, bub: this._bubble(c), x, tx: x, phase: Math.random() * 6, height: new THREE.Box3().setFromObject(tpl).max.y };
        this.cust.set(c.id, e);
        tween({ from: obj.position.x, to: x, duration: reducedMotion() ? 60 : 700, easing: ease.outCubic, onUpdate: (v) => { obj.position.x = v; } });
      } else if (e.tx !== x) {
        e.tx = x;
        const from = e.obj.position.x;
        tween({ from, to: x, duration: 450, easing: ease.inOutCubic, onUpdate: (v) => { e.obj.position.x = v; } });
      }
      e.bub.classList.toggle('selected', s.selected === c.id);
    });
    this.updatePatience(s);
    this.setCup(s.cup);
  }

  updatePatience(s) {
    for (const c of s.counter) {
      const e = this.cust.get(c.id);
      if (!e) continue;
      const f = Math.max(0, c.patience / c.max);
      e.frac = f;
      const bar = e.bub.querySelector('.pat i');
      bar.style.width = `${f * 100}%`;
      bar.style.background = f > 0.55 ? '#3F8F5B' : f > 0.25 ? '#F2B134' : '#D7263D';
      e.bub.classList.toggle('hurry', f < 0.25);
    }
  }

  setCup(cup) {
    if (!this.ready) return;
    const kind = cup.bag ? 'bag' : cup.ice ? 'glass' : 'cup';
    for (const [k, v] of Object.entries(this.vessels)) v.visible = k === kind;
    const v = this.vessels[kind];
    const col = liquidColor(cup);
    const parts = cup.kopi + cup.teh + cup.milo + cup.condensed + cup.evaporated + cup.water;
    const fill = Math.min(1, parts / 4);
    v.traverse((m) => {
      if (!m.isMesh) return;
      if (/Liquid/.test(m.name)) {
        m.visible = !!col;
        if (col) m.material.color.set(col);
        if (kind === 'cup') m.position.y = 0.04 + fill * 0.03;
        else { m.scale.y = Math.max(0.05, fill); m.position.y = kind === 'glass' ? 0.008 + 0.067 * m.scale.y : 0; }
      }
      if (m.name.startsWith('Ice')) m.visible = !!cup.ice;
    });
    const topY = kind === 'cup' ? 0.075 : kind === 'glass' ? 0.008 + 0.135 * fill : 0.1 * fill;
    this.foam.visible = !!(cup.tarik && col);
    this.foam.position.set(0, topY, 0);
    this.milo.visible = cup.milo > 1;
    this.milo.position.set(0, kind === 'glass' ? 0.16 : topY + 0.01, 0);
    this.sugar.forEach((sg, i) => { sg.visible = i < cup.sugar; });
  }

  pour() {
    if (!this.drink) return;
    tween({ from: 0, to: 1, duration: 260, easing: ease.outCubic, onUpdate: (t) => {
      const k = 1 + Math.sin(t * Math.PI) * 0.06;
      this.drink.scale.set(DRINK_SCALE * k, DRINK_SCALE / k, DRINK_SCALE * k);
    } });
  }

  async animateServe(res, s) {
    const e = this.cust.get(res.customer.id);
    if (!e || !this.ready) { this.sync(s); return; }
    e.leaving = true;
    e.bub.classList.add(res.good ? 'served' : 'angry', 'leaving');
    e.bub.querySelector('b').textContent = res.good ? `+$${(res.price + res.tip).toFixed(2)}  Shiok!` : 'Aiyo!';
    // a copy of the drink slides across the counter to them
    const ghost = this.drink.clone(true);
    this.scene.add(ghost);
    const from = ghost.position.clone();
    const to = new THREE.Vector3(e.obj.position.x, TOP_Y, -0.35);
    this.setCup(s.cup);
    await tween({ from: 0, to: 1, duration: 380, easing: ease.inOutCubic, onUpdate: (t) => ghost.position.lerpVectors(from, to, t) });
    const o = e.obj, y0 = o.position.y;
    if (res.good) await tween({ from: 0, to: 1, duration: 420, easing: ease.outCubic, onUpdate: (t) => { o.position.y = y0 + Math.sin(t * Math.PI) * 0.18; } });
    else await tween({ from: 0, to: 1, duration: 420, onUpdate: (t) => { o.rotation.y = Math.sin(t * Math.PI * 6) * 0.25 * (1 - t); } });
    this.scene.remove(ghost);
    await this._walkOff(e);
    this.cust.delete(res.customer.id);
    this.sync(s);
  }

  async _walkOff(e) {
    const o = e.obj;
    o.rotation.y = Math.PI;
    e.bub.classList.add('leaving');
    const z0 = o.position.z;
    await tween({ from: 0, to: 1, duration: reducedMotion() ? 60 : 700, easing: ease.inOutCubic, onUpdate: (t) => { o.position.z = z0 - t * 2.4; o.position.y = Math.abs(Math.sin(t * Math.PI * 4)) * 0.04; } });
    this.scene.remove(o);
    e.bub.remove();
  }

  async animateLeave(c, s) {
    const e = this.cust.get(c.id);
    if (!e) return;
    e.leaving = true;
    e.bub.classList.add('angry');
    e.bub.querySelector('b').textContent = 'Too slow lah!';
    await wait(350);
    await this._walkOff(e);
    this.cust.delete(c.id);
    this.sync(s);
  }

  // ---------- loop ----------
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
    // frame all three customers and the drink: pull back on narrow screens
    const a = this.camera.aspect;
    const back = a < 1 ? 1 + (1 - a) * 1.6 : a < 1.4 ? 1 + (1.4 - a) * 0.5 : 1;
    const sway = this.mode === 'idle' ? Math.sin(t * 0.4) * 0.25 : 0;
    const want = new THREE.Vector3(sway, 2.05 + (back - 1) * 0.6, 2.0 * back + 0.5);
    const look = new THREE.Vector3(0, 1.1, -0.95);
    const k = reducedMotion() ? 1 : 1 - Math.exp(-dt * 3);
    this.camPos.lerp(want, k);
    this.camLook.lerp(look, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    if (this.ready) {
      for (const f of this.fans) if (f.userData.blades) f.userData.blades.rotation.y += dt * 4;
      const w = this.stage.clientWidth, h = this.stage.clientHeight;
      const p = new THREE.Vector3();
      for (const [, e] of this.cust) {
        // idle: a gentle sway; impatient customers fidget
        if (!e.leaving) {
          e.phase += dt * (e.frac != null && e.frac < 0.25 ? 9 : 1.6);
          e.obj.rotation.y = Math.sin(e.phase) * (e.frac != null && e.frac < 0.25 ? 0.12 : 0.04);
        }
        p.set(e.obj.position.x, e.height + 0.32, e.obj.position.z).project(this.camera);
        e.bub.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px) translate(-50%, -100%)`;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}
