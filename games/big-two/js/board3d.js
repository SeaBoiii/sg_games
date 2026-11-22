// Big Two — 3D table (Three.js). Same adapter API as Board2D:
//   load(s) · sync(s) · deal(s, sound) · play(events, s, sound) · say(p, text) · setMode(mode)
// The room and props come from Blender (bigtwo-assets.glb); the cards are built here, with
// faces drawn from the same SVG art as the 2D build into one texture atlas.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as E from './engine.js';
import { cardFace, cardBack, CW, CH, orangeIcon, esc } from './art.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const TOP = 0.7598;                 // tablecloth height
const CARD = { w: 0.125, h: 0.175 };
const SEAT_R = 0.98;                // chair distance from the table centre
const FAN_R = 0.38;                 // where a hand is laid out at the end of a deal
const HOLD_R = 0.74;                // where each relative holds their cards
const ANG = [Math.PI / 2, 0, -Math.PI / 2, Math.PI]; // seat directions (x = cos, z = sin): near, right, far, left
const STEP = 0.082;                 // overlap of cards in a played combination
const COLS = 14, ROWS = 4, CELL_W = 160, CELL_H = 224;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const dirOf = (p) => new THREE.Vector3(Math.cos(ANG[p]), 0, Math.sin(ANG[p]));
const ease = (k) => 1 - Math.pow(1 - k, 3);

export class Board3D {
  constructor(el, { modelUrl = '../models/bigtwo-assets.glb', fallbackHref = '../' } = {}) {
    this.el = el;
    this.anims = [];
    el.classList.add('stage-3d');
    el.innerHTML = `
      <canvas class="gl" aria-label="3D Big Two table"></canvas>
      <div class="tags3d" aria-hidden="true"></div>
      <div class="fx3d" aria-hidden="true"></div>
      <div class="loading" role="status"><div class="spinner" aria-hidden="true"></div><p>Setting up the table at Ah Ma's… <span class="pct">0%</span></p></div>`;
    this.canvas = el.querySelector('canvas');
    window.__bigTwo3D = this; // handy for poking at the scene from the console
    this.tagsEl = el.querySelector('.tags3d');
    this.fxEl = el.querySelector('.fx3d');
    this.loadingEl = el.querySelector('.loading');
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
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe9d8bb);
    this.scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.05, 40);
    this.scene.add(new THREE.HemisphereLight(0xfff3e0, 0x7a5a3e, 0.95));
    const key = new THREE.DirectionalLight(0xfff0d8, 2.1);
    key.position.set(-1.6, 4.2, 2.4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 1, far: 9 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.01;
    this.scene.add(key);
    const warm = new THREE.PointLight(0xffb070, 1.4, 4, 2);
    warm.position.set(0, 2.0, -0.6);
    this.scene.add(warm);
    this._room();
    this._atlas();
    this.ray = new THREE.Raycaster();
    this._resize();
    new ResizeObserver(() => this._resize()).observe(el);
    r.setAnimationLoop(() => this._render());
    this._load(modelUrl).catch((err) => {
      console.error(err);
      this.loadingEl.innerHTML = `<p>Couldn't load the 3D table.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
    });
  }

  // ---------------- room ----------------
  _room() {
    const tile = (a, b, n, grout) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 512;
      const g = cv.getContext('2d');
      const s = 512 / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * s, y * s, s, s);
        // a few speckles so the tiles don't look flat
        for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(90,60,30,${Math.random() * 0.08})`; g.fillRect(x * s + Math.random() * s, y * s + Math.random() * s, 3, 3); }
      }
      g.strokeStyle = grout; g.lineWidth = 4;
      for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(512, i * s); g.stroke(); }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
      return t;
    };
    const ft = tile('#E2D2B6', '#D8C6A6', 4, '#BFAA88'); ft.repeat.set(6, 6);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.45 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1e2c8, roughness: 0.9 });
    const lowMat = new THREE.MeshStandardMaterial({ color: 0xd9bf98, roughness: 0.85 });
    const skirt = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.6 });
    const wall = (w, x, z, ry) => {
      const g = new THREE.Group();
      const up = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.2), wallMat); up.position.y = 1.6; g.add(up);
      const low = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.9), lowMat); low.position.set(0, 0.45, 0.002); g.add(low);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.03), skirt); rail.position.set(0, 0.9, 0.012); g.add(rail);
      const sk = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.02), skirt); sk.position.set(0, 0.05, 0.01); g.add(sk);
      g.position.set(x, 0, z); g.rotation.y = ry;
      g.traverse((m) => { if (m.isMesh) m.receiveShadow = true; });
      this.scene.add(g);
    };
    wall(7, 0, -2.4, 0);
    wall(6, -3.2, 0.4, Math.PI / 2);
    wall(6, 3.2, 0.4, -Math.PI / 2);
  }

  // ---------------- cards ----------------
  _atlas() {
    const cv = document.createElement('canvas');
    cv.width = COLS * CELL_W; cv.height = ROWS * CELL_H;
    this.atlas = new THREE.CanvasTexture(cv);
    this.atlas.colorSpace = THREE.SRGBColorSpace;
    this.atlas.anisotropy = 8;
    const k = CELL_W / CW;
    let body = '';
    for (let id = 0; id < 52; id++) body += `<g transform="translate(${(id % 13) * CELL_W} ${Math.floor(id / 13) * CELL_H}) scale(${k})">${cardFace(id)}</g>`;
    body += `<g transform="translate(${13 * CELL_W} 0) scale(${k})">${cardBack()}</g>`;
    const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${cv.width}" height="${cv.height}" viewBox="0 0 ${cv.width} ${cv.height}">${body}</svg>`;
    const img = new Image();
    img.onload = () => { cv.getContext('2d').drawImage(img, 0, 0); this.atlas.needsUpdate = true; this.atlasReady = true; URL.revokeObjectURL(img.src); };
    img.onerror = (e) => console.error('card atlas failed', e);
    img.src = URL.createObjectURL(new Blob([doc], { type: 'image/svg+xml' }));
    this.cardMat = new THREE.MeshStandardMaterial({ map: this.atlas, alphaTest: 0.5, roughness: 0.55, metalness: 0 });
    this.geos = new Map();
  }

  _uv(i) {
    const col = i === 'back' ? 13 : i % 13, row = i === 'back' ? 0 : Math.floor(i / 13);
    const px = 1.5 / (COLS * CELL_W), py = 1.5 / (ROWS * CELL_H);
    return [col / COLS + px, 1 - (row + 1) / ROWS + py, (col + 1) / COLS - px, 1 - row / ROWS - py];
  }

  _geo(id) {
    if (this.geos.has(id)) return this.geos.get(id);
    const hw = CARD.w / 2, hh = CARD.h / 2, t = 0.00035;
    const [u0, v0, u1, v1] = this._uv(id);
    const [b0, bv0, b1, bv1] = this._uv('back');
    const pos = [
      -hw, t, -hh, -hw, t, hh, hw, t, hh, hw, t, -hh,      // face (+Y), top edge at -Z
      -hw, -t, -hh, hw, -t, -hh, hw, -t, hh, -hw, -t, hh,  // back (-Y)
    ];
    const uv = [u0, v1, u0, v0, u1, v0, u1, v1, b0, bv1, b1, bv1, b1, bv0, b0, bv0];
    const nrm = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
    this.geos.set(id, g);
    return g;
  }

  _card(id, faceUp = true) {
    const m = new THREE.Mesh(this._geo(id), this.cardMat);
    m.castShadow = true; m.receiveShadow = true;
    m.rotation.z = faceUp ? 0 : Math.PI;
    m.userData.id = id;
    return m;
  }

  // ---------------- loading ----------------
  async _load(url) {
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url, (e) => {
      if (e.total) this.loadingEl.querySelector('.pct').textContent = `${Math.round((e.loaded / e.total) * 100)}%`;
    });
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.tpl = {};
    for (const c of [...gltf.scene.children]) { c.position.set(0, 0, 0); this.tpl[c.name.replace(/_\d+$/, '')] = c; }
    const add = (name, x, y, z, ry = 0, s = 1) => {
      const t = this.tpl[name]; if (!t) return null;
      const o = t.clone(true); o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(s); this.scene.add(o); return o;
    };
    add('RoundTable', 0, 0, 0);
    add('Window', -0.75, 1.5, -2.37);
    add('FuPlaque', 0.95, 1.62, -2.36);
    add('Sideboard', -2.05, 0, -2.12, 0);
    add('Lantern', -1.35, 1.95, -1.9);
    add('Lantern', 1.6, 2.0, -1.75);
    add('OrangePlate', 0.4, TOP - 0.003, -0.3, 0.4);
    add('TartJar', -0.36, TOP - 0.002, -0.36);
    add('TeaSet', -0.36, TOP - 0.002, 0.36, 0.75, 0.8);
    add('AngBao', 0.38, TOP - 0.001, 0.36, -0.6);
    this.chairs = [1, 2, 3].map((p) => { const d = dirOf(p); return add('Chair', d.x * SEAT_R, 0, d.z * SEAT_R, Math.atan2(-d.x, -d.z)); });
    this.ready = true;
    this.loadingEl.classList.add('done');
    if (this.pendingS) { const s = this.pendingS; this.pendingS = null; this.load(s); }
  }

  // ---------------- state ----------------
  load(s) {
    if (!this.ready) { this.pendingS = s; return; }
    if (this.set) this.scene.remove(this.set);
    this.set = new THREE.Group();
    this.scene.add(this.set);
    this.people = [null, ...[1, 2, 3].map((p) => {
      const t = this.tpl[`Char_${s.players[p].char}_Sit`];
      if (!t) return null;
      const d = dirOf(p);
      const o = t.clone(true);
      o.position.set(d.x * SEAT_R, 0, d.z * SEAT_R);
      o.rotation.y = Math.atan2(-d.x, -d.z);
      this.set.add(o);
      return o;
    })];
    // each relative holds their cards upright in front of them; the reveal lies flat on the table
    this.fans = [0, 1, 2, 3].map((p) => {
      const g = new THREE.Group();
      const d = dirOf(p);
      g.position.set(d.x * HOLD_R, TOP + 0.09, d.z * HOLD_R);
      g.rotation.y = Math.atan2(d.x, d.z) + (p === 1 ? 0.6 : p === 3 ? -0.6 : 0); // side hands turn a little towards you
      const tilt = new THREE.Group();
      tilt.rotation.x = 0.32;
      g.add(tilt);
      g.userData.tilt = tilt;
      this.set.add(g);
      return g;
    });
    this.opens = [0, 1, 2, 3].map((p) => {
      const g = new THREE.Group();
      const d = dirOf(p);
      g.position.set(d.x * FAN_R, TOP, d.z * FAN_R);
      g.rotation.y = Math.atan2(d.x, d.z);
      this.set.add(g);
      return g;
    });
    this.pile = new THREE.Group();
    this.set.add(this.pile);
    this.pileCombos = [];
    this.pileKey = '';
    this.counts = [-1, -1, -1, -1];
    this.tagKey = '';
    this._tags(s, true);
    this.sync(s);
  }

  setMode(mode) { this.el.dataset.mode = mode; }

  _fan(p, n, faces = null) {
    const g = this.fans[p], o = this.opens[p];
    if (!g || p === 0) return;
    const key = faces ? `o${faces.join('.')}` : `n${n}`;
    if (g.userData.key === key) return;
    g.userData.key = key;
    const hold = g.userData.tilt;
    hold.clear();
    o.clear();
    if (faces) {
      // deal over: lay what's left face up for everyone to see
      const k = faces.length, step = Math.min(0.06, 0.55 / Math.max(1, k));
      faces.forEach((id, i) => {
        const c = this._card(id, true);
        c.position.set((i - (k - 1) / 2) * step * -1, 0.001 + i * 0.0007, -0.03);
        c.rotation.y = Math.PI; // read from the near side of the table
        o.add(c);
      });
      return;
    }
    const spread = Math.min(0.15, 1.5 / Math.max(1, n - 1));
    for (let i = 0; i < n; i++) {
      const piv = new THREE.Group();
      piv.rotation.z = -(i - (n - 1) / 2) * spread;
      const c = this._card('back', true);
      c.rotation.x = Math.PI / 2;                 // stand up, back towards the table
      c.position.set(0, CARD.h * 0.42, i * 0.0012);
      c.scale.setScalar(0.9);
      piv.add(c);
      hold.add(piv);
    }
  }

  _slot(k, combo, i, n) {
    // k = 0 is the newest play (centre); older plays slide back and to the left
    const jitter = (((combo.cards[0] * 37) % 9) - 4) * 0.012;
    const base = new THREE.Vector3(-0.07 * k, 0.0008 + (3 - k) * 0.0012, -0.06 * k + 0.02);
    const rot = jitter - 0.12 * k;
    const off = new THREE.Vector3((i - (n - 1) / 2) * STEP, i * 0.0006, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    return { pos: base.add(off).add(new THREE.Vector3(0, TOP, 0)), rot };
  }

  _renderPile(s) {
    const key = s.trick.map((t) => t.combo.cards.join('.')).join('|');
    if (key === this.pileKey) return;
    this.pileKey = key;
    this.pile.clear();
    this.pileCombos = s.trick.slice(-3).map((t, j, arr) => {
      const k = arr.length - 1 - j;
      return t.combo.cards.map((id, i) => {
        const c = this._card(id, true);
        const sl = this._slot(k, t.combo, i, t.combo.cards.length);
        c.position.copy(sl.pos); c.rotation.y = sl.rot;
        this.pile.add(c);
        return c;
      });
    });
  }

  sync(s) {
    if (!this.ready) { this.pendingS = s; return; }
    if (!this.fans) return;
    const open = s.phase === 'dealover' || s.phase === 'over';
    s.players.forEach((p, i) => this._fan(i, p.hand.length, open ? E.sortHand(p.hand) : null));
    this._renderPile(s);
    this._tags(s);
    this.turn = s.phase === 'play' ? s.turn : -1;
    this.cpuTurn = s.phase === 'play' && s.players[s.turn].cpu;
  }

  // ---------------- HTML tags, bubbles and floaters ----------------
  _anchor(p, kind) {
    if (p === 0) return new THREE.Vector3(0, TOP + 0.02, 0.6);
    const d = dirOf(p);
    if (kind === 'bubble') return new THREE.Vector3(d.x * (SEAT_R - 0.22), 1.3, d.z * (SEAT_R - 0.22));
    if (kind === 'fan') return new THREE.Vector3(d.x * FAN_R, TOP + 0.05, d.z * FAN_R);
    // name tags sit on the table edge in front of each player, next to their cards
    return new THREE.Vector3(d.x * 0.6, TOP + 0.01, d.z * 0.6);
  }
  _screen(v) {
    const p = v.clone().project(this.camera);
    return { x: Math.min(94, Math.max(6, ((p.x + 1) / 2) * 100)), y: Math.min(94, Math.max(9, ((1 - p.y) / 2) * 100)) };
  }

  _tags(s, force = false) {
    const key = s.players.map((p, i) => `${p.name}|${p.oranges}|${p.hand.length}|${s.said[i]}`).join('/') + `|${s.turn}|${s.phase}`;
    if (!force && key === this.tagKey) return;
    this.tagKey = key;
    this.tagsEl.innerHTML = s.players.map((pl, p) => {
      const on = s.phase === 'play' && s.turn === p;
      const flag = s.phase === 'play' && pl.hand.length === 1 ? '<span class="flag">LAST CARD</span>' : s.phase === 'play' && s.said[p] === 'pass' ? '<span class="flag pass">PASS</span>' : '';
      return `<div class="tag3d${on ? ' on' : ''}" data-p="${p}" style="--c:${pl.color}">${p !== 0 && s.phase !== 'idle' ? `<span class="cnt">${pl.hand.length}</span>` : ''}<span>${esc(pl.name)}</span><span class="or">${orangeIcon()}${pl.oranges}</span>${flag}</div>`;
    }).join('');
    this._placeTags();
  }
  _placeTags() {
    if (!this.tagsEl) return;
    this.tagsEl.querySelectorAll('.tag3d').forEach((t) => {
      const { x, y } = this._screen(this._anchor(+t.dataset.p, 'tag'));
      t.style.left = `${x}%`; t.style.top = `${y}%`;
    });
  }

  say(p, text) {
    const { x, y } = this._screen(this._anchor(p, p === 0 ? 'tag' : 'bubble'));
    const b = document.createElement('div');
    b.className = 'bub3d';
    b.textContent = text;
    b.style.left = `${x}%`; b.style.top = `${p === 0 ? y - 8 : y}%`;
    (this.bubbles ||= {})[p]?.remove();
    this.bubbles[p] = b;
    this.fxEl.appendChild(b);
    setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 400); }, 1500);
  }

  _float(p, text, cls) {
    const { x, y } = this._screen(this._anchor(p, p === 0 ? 'tag' : 'fan'));
    const el = document.createElement('div');
    el.className = `float3d ${cls}`;
    el.textContent = text;
    el.style.left = `${x}%`; el.style.top = `${p === 0 ? y - 10 : y}%`;
    this.fxEl.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  // ---------------- animation ----------------
  _anim(dur, fn) {
    if (document.hidden) { fn(1); return Promise.resolve(); }
    return new Promise((res) => this.anims.push({ t0: performance.now(), dur, fn, done: res }));
  }

  _origin(p) {
    if (p === 0) return { pos: new THREE.Vector3(0, TOP + 0.32, 0.95), faceUp: true, rot: 0 };
    const d = dirOf(p);
    return { pos: new THREE.Vector3(d.x * (HOLD_R - 0.04), TOP + 0.16, d.z * (HOLD_R - 0.04)), faceUp: false, rot: Math.atan2(d.x, d.z) };
  }

  async deal(s, sound = () => {}) {
    if (!this.ready) { await new Promise((r) => { const t = setInterval(() => { if (this.ready) { clearInterval(t); r(); } }, 100); }); this.load(s); }
    this.pile.clear(); this.pileKey = ''; this.pileCombos = [];
    this.fans.forEach((g) => { g.userData.tilt.clear(); g.userData.key = ''; });
    this.opens.forEach((g) => g.clear());
    const deck = new THREE.Vector3(0, TOP + 0.02, 0);
    const flights = [];
    const shown = [0, 0, 0, 0];
    for (let i = 0; i < 20; i++) {
      const p = i % 4;
      const c = this._card('back', false);
      this.scene.add(c);
      const o = this._origin(p);
      const end = o.pos;
      const spin = Math.random() * 2;
      flights.push(this._anim(380, (k) => {
        const e = ease(k);
        c.position.lerpVectors(deck, end, e); c.position.y += Math.sin(k * Math.PI) * 0.12;
        c.rotation.y = spin * (1 - e) + o.rot * e;
      }).then(() => {
        this.scene.remove(c);
        shown[p] = Math.min(13, shown[p] + 3.25);
        if (p) this._fan(p, Math.round(shown[p]));
      }));
      if (p === 0) sound({ type: 'deal' });
      await wait(50);
    }
    await Promise.all(flights);
    this.counts = s.players.map((p) => p.hand.length);
    this.sync(s);
  }

  async play(events, s, sound = () => {}) {
    for (const ev of events) {
      if (ev.type === 'play') {
        sound(ev);
        await this._fly(ev, s);
        this._float(ev.p, E.comboName(ev.combo), 'plain');
        await wait(220);
      } else if (ev.type === 'pass') {
        sound(ev);
        this._tags(s);
        await wait(380);
      } else if (ev.type === 'clear') {
        sound(ev);
        await wait(380);
        await this._sweep(ev.p);
      } else if (ev.type === 'last') {
        sound(ev);
        this.say(ev.p, 'Last card!');
      } else if (ev.type === 'out') {
        sound(ev);
        this._float(ev.p, 'Huat ah!', 'good');
        await wait(600);
      } else if (ev.type === 'score') {
        await this._oranges(ev.results, s, sound);
      }
      this.sync(s);
    }
  }

  async _fly(ev, s) {
    const n = ev.combo.cards.length;
    // older plays shuffle back first
    const older = this.pileCombos.slice(-2);
    this.pileCombos.slice(0, -2).forEach((cs) => cs.forEach((c) => this.pile.remove(c)));
    const moves = older.map((cs, j) => {
      const k = older.length - j;
      const combo = { cards: cs.map((c) => c.userData.id) };
      return cs.map((c, i) => ({ c, from: c.position.clone(), r0: c.rotation.y, to: this._slot(k, combo, i, cs.length) }));
    }).flat();
    this.pileCombos = older;
    // the new cards leave the player's hand
    if (ev.p !== 0) this._fan(ev.p, ev.left);
    const o = this._origin(ev.p);
    const cards = ev.combo.cards.map((id, i) => {
      const c = this._card(id, o.faceUp);
      c.position.copy(o.pos).add(new THREE.Vector3((i - (n - 1) / 2) * 0.02, 0, 0));
      c.rotation.y = o.rot;
      this.pile.add(c);
      return { c, from: c.position.clone(), to: this._slot(0, ev.combo, i, n) };
    });
    const r0 = o.rot;
    // shortest turn to the slot angle
    await this._anim(480, (k) => {
      const e = ease(k);
      for (const m of moves) { m.c.position.lerpVectors(m.from, m.to.pos, e); m.c.rotation.y = m.r0 + (m.to.rot - m.r0) * e; }
      for (const m of cards) {
        m.c.position.lerpVectors(m.from, m.to.pos, e);
        m.c.position.y += Math.sin(k * Math.PI) * 0.09;
        let dr = m.to.rot - r0; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        m.c.rotation.y = r0 + dr * e;
        if (!o.faceUp) m.c.rotation.z = Math.PI * (1 - Math.min(1, k * 1.4));
      }
    });
    this.pileCombos.push(cards.map((m) => m.c));
    this.pileKey = s.trick.map((t) => t.combo.cards.join('.')).join('|');
  }

  async _sweep(p) {
    const o = this._origin(p);
    const to = p === 0 ? new THREE.Vector3(0, TOP + 0.05, 0.75) : o.pos.clone().setY(TOP + 0.01);
    const all = this.pileCombos.flat().map((c) => ({ c, from: c.position.clone() }));
    await this._anim(420, (k) => {
      const e = ease(k);
      for (const m of all) { m.c.position.lerpVectors(m.from, to, e); m.c.scale.setScalar(1 - 0.6 * e); }
    });
    this.pile.clear();
    this.pileCombos = [];
    this.pileKey = '';
  }

  async _oranges(res, s, sound) {
    const w = res.winner;
    const target = w === 0 ? new THREE.Vector3(0, TOP + 0.1, 0.62) : this._anchor(w, 'fan');
    const flights = [];
    res.rows.forEach((r, p) => {
      if (p === w || !r.paid) return;
      const from = p === 0 ? new THREE.Vector3(0, TOP + 0.1, 0.62) : this._anchor(p, 'fan');
      const n = Math.min(6, r.paid);
      for (let k = 0; k < n; k++) {
        const o = this.tpl.Orange ? this.tpl.Orange.clone(true) : null;
        if (!o) continue;
        o.scale.setScalar(1.3);
        this.scene.add(o);
        const jitter = new THREE.Vector3((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.1);
        flights.push(wait(k * 90).then(() => this._anim(650, (t) => {
          const e = ease(t);
          o.position.lerpVectors(from, target, e).add(jitter.clone().multiplyScalar(e));
          o.position.y += Math.sin(t * Math.PI) * 0.25;
          o.rotation.x = t * 6;
        })).then(() => { this.scene.remove(o); sound({ type: 'orange' }); }));
      }
      this._float(p, `−${r.paid}`, 'bad');
    });
    await Promise.all(flights);
    if (res.rows[w].got) this._float(w, `+${res.rows[w].got}`, 'good');
    await wait(500);
  }

  // ---------------- frame ----------------
  _render() {
    const now = performance.now();
    this.anims = this.anims.filter((a) => { const k = Math.min(1, (now - a.t0) / a.dur); a.fn(k); if (k >= 1) { a.done(); return false; } return true; });
    const t = now / 1000;
    if (this.people) this.people.forEach((o, p) => {
      if (!o) return;
      const thinking = this.cpuTurn && this.turn === p;
      o.position.y = Math.sin(t * 1.7 + p) * 0.004 + (thinking ? Math.abs(Math.sin(t * 5)) * 0.012 : 0);
      o.rotation.z = thinking ? Math.sin(t * 2.4) * 0.025 : 0;
    });
    this.renderer.render(this.scene, this.camera);
  }

  _resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const cam = this.camera;
    const hand = this.el.parentElement?.querySelector('.hand');
    const handH = hand ? Math.min(hand.clientHeight, h * 0.6) : 0;
    const vis = Math.max(1, h - handH);
    // frame the table and the three relatives in the area above the hand, then let the
    // picture run on underneath it (setViewOffset with a taller window than the framed one)
    cam.aspect = w / vis;
    cam.fov = 36;
    const halfW = 1.08, halfH = 0.5;
    const vHalf = THREE.MathUtils.degToRad(cam.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * cam.aspect);
    const dist = Math.max(halfH / Math.tan(vHalf), halfW / Math.tan(hHalf)) + 0.3;
    const look = new THREE.Vector3(0, 0.86, -0.12);
    cam.position.set(0, look.y + dist * 0.53, look.z + dist * 0.85);
    cam.lookAt(look);
    cam.setViewOffset(w, vis, 0, 0, w, h);
    cam.updateProjectionMatrix();
    this._placeTags();
  }
}
