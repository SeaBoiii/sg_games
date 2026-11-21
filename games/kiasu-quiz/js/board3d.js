// Kiasu Quiz — 3D studio (Three.js). Same adapter API as Board2D:
//   sync(s) · say(text, mood) · react(type, s, data) · setMode(mode) · onPick(i) · onBuzz(p)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as E from './engine.js';
import { TILE_COLORS, fit } from './art.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const FONT = '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif';
const BODY = '"DM Sans", "Segoe UI", system-ui, sans-serif';
const INK = '#13202B';
const CAST = ['student_a', 'worker_b', 'aunty', 'ns'];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texOf(cv, gltf = true) { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (gltf) t.flipY = false; return t; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

export class Board3D {
  constructor(stage, { modelUrl = '../models/quiz-assets.glb', fallbackHref = '../' } = {}) {
    this.stage = stage;
    this.keys = {};
    this.anims = [];
    this.onPick = null;
    this.onBuzz = null;
    stage.classList.add('stage-3d');
    stage.innerHTML = `
      <canvas class="gl" aria-label="3D quiz studio"></canvas>
      <div class="bubble3d" hidden><b></b></div>
      <div class="floats3d" aria-hidden="true"></div>
      <div class="loading" role="status"><div class="spinner" aria-hidden="true"></div><p>Warming up the studio lights… <span class="pct">0%</span></p></div>`;
    this.canvas = stage.querySelector('canvas');
    this.bubble = stage.querySelector('.bubble3d');
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
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07262d);
    this.scene.fog = new THREE.Fog(0x07262d, 12, 30);
    this.scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.3;
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 80);
    this.look = new THREE.Vector3(0.1, 1.85, -1);
    this.scene.add(new THREE.HemisphereLight(0x9fd3e0, 0x0a2f37, 0.8));
    const key = new THREE.SpotLight(0xfff1d6, 70, 16, 0.55, 0.5, 1.4);
    key.position.set(0.5, 6, 5);
    key.target.position.set(0, 1.5, -1.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key, key.target);
    this.flash = new THREE.PointLight(0xffffff, 0, 9);
    this.flash.position.set(0, 2.2, 1.5);
    this.scene.add(this.flash);
    // sunburst behind the wall, and a checker floor
    const rays = makeCanvas(1024, 1024);
    { const g = rays.getContext('2d'); g.translate(512, 512);
      for (let i = 0; i < 28; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 720, (i / 28) * Math.PI * 2, ((i + 0.5) / 28) * Math.PI * 2); g.closePath(); g.fillStyle = i % 2 ? '#0F5F6B' : '#0C4E59'; g.fill(); } }
    this.rays = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshBasicMaterial({ map: texOf(rays, false) }));
    this.rays.position.set(0, 2.4, -3.6);
    this.scene.add(this.rays);
    const chk = makeCanvas(256, 256);
    { const g = chk.getContext('2d'); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#0A2F37' : '#0E3E48'; g.fillRect(x * 64, y * 64, 64, 64); } }
    const ft = texOf(chk, false); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(10, 10);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.35, metalness: 0.1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.ray = new THREE.Raycaster();
    this.canvas.addEventListener('pointerdown', (e) => this._click(e));
    this._resize();
    new ResizeObserver(() => this._resize()).observe(stage);
    this.clock = new THREE.Clock();
    r.setAnimationLoop(() => this._render());
    this._load(modelUrl).catch((err) => {
      console.error(err);
      this.loadingEl.innerHTML = `<p>Couldn't load the 3D studio.<br><a href="${fallbackHref}">Play the 2D version instead</a></p>`;
    });
  }

  async _load(url) {
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const fonts = document.fonts ? Promise.all([document.fonts.load(`800 40px ${FONT}`), document.fonts.load(`700 30px ${BODY}`)]).catch(() => {}) : null;
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url, (e) => {
      if (e.total) this.loadingEl.querySelector('.pct').textContent = `${Math.round((e.loaded / e.total) * 100)}%`;
    });
    await fonts;
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.tpl = {};
    // three.js de-duplicates node names ("Char_uncle_Stand_1"), so register each root under its base name
    for (const c of [...gltf.scene.children]) { c.position.set(0, 0, 0); this.tpl[c.name.replace(/_\d+$/, '')] = c; }
    this._build();
    this.ready = true;
    this.loadingEl.classList.add('done');
    if (this.pendingS) { const s = this.pendingS; this.pendingS = null; this.sync(s); }
  }

  _add(name, x, y, z, rotY = 0, scale = 1, parent = this.scene) {
    const t = this.tpl[name];
    if (!t) return null;
    const o = t.clone(true);
    o.position.set(x, y, z); o.rotation.y = rotY; o.scale.setScalar(scale);
    parent.add(o);
    return o;
  }

  _build() {
    const wall = this._add('QuizWall', 0, 0, -3);
    // the screen and the four tiles get live canvas textures
    this.scrCv = makeCanvas(1280, 358);
    this.scrTex = texOf(this.scrCv);
    const scr = wall.getObjectByName('QScreen');
    scr.material = new THREE.MeshBasicMaterial({ map: this.scrTex, toneMapped: false });
    this.tiles = [0, 1, 2, 3].map((i) => {
      const mesh = wall.getObjectByName(`QTile${i}`);
      const cv = makeCanvas(640, 150);
      const tex = texOf(cv);
      mesh.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
      mesh.userData.tile = i;
      return { mesh, cv, tex, base: mesh.position.clone() };
    });
    this._add('LightTruss', 0, 4.4, -1.6);
    const desk = this._add('HostDesk', -3.05, 0, -0.75, 0.55);
    const logo = desk && desk.getObjectByName('HostLogo');
    if (logo) {
      const cv = makeCanvas(320, 216);
      const g = cv.getContext('2d');
      g.fillStyle = '#13202B'; g.fillRect(0, 0, 320, 216);
      g.textAlign = 'center'; g.fillStyle = '#FFE59A'; g.font = `800 64px ${FONT}`; g.fillText('KIASU', 160, 96); g.fillStyle = '#0FB8C9'; g.fillText('QUIZ', 160, 168);
      logo.material = new THREE.MeshBasicMaterial({ map: texOf(cv), toneMapped: false });
    }
    this.host = this._add('Char_uncle_Stand', -3.25, 0, -1.25, 0.55, 1.0);
    this.podGroup = new THREE.Group();
    this.scene.add(this.podGroup);
  }

  _podiums(s) {
    for (const c of [...this.podGroup.children]) this.podGroup.remove(c);
    const n = s.players.length;
    this.pods = s.players.map((p, i) => {
      const x = (i - (n - 1) / 2) * 1.35 + 0.35;
      const g = new THREE.Group();
      g.position.set(x, 0, 0.9);
      g.rotation.y = -x * 0.06;
      const pod = this.tpl.QPodium.clone(true);
      const col = new THREE.Color(p.color);
      const cv = makeCanvas(300, 168);
      const tex = texOf(cv);
      let dome = null;
      pod.traverse((o) => {
        if (!o.isMesh) return;
        const name = o.material && o.material.name;
        if (name === 'KQ_PodiumPanel') { o.material = o.material.clone(); o.material.color.copy(col); }
        if (name === 'KQ_PodStrip' || name === 'KQ_Dome') { o.material = o.material.clone(); o.material.color.copy(col); o.material.emissive = col.clone(); }
        if (name === 'KQ_Dome') { dome = o; o.userData.buzz = i; }
        if (o.name === 'QPodScreen' || (o.parent && o.parent.name === 'QPodScreen')) { o.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); o.position.z += 0.01; }
      });
      g.add(pod);
      const who = s.mode === 'solo' ? 'student_b' : CAST[i % CAST.length];
      const ch = this.tpl[`Char_${who}_Stand`];
      if (ch) { const c = ch.clone(true); c.position.set(0, 0, -0.45); c.scale.setScalar(0.82); g.add(c); }
      this.podGroup.add(g);
      return { g, cv, tex, dome, domeRoot: pod.getObjectByName('QDome'), key: '' };
    });
  }

  // ---------------- canvas painters ----------------
  _paintScreen(s) {
    const g = this.scrCv.getContext('2d'), W = 1280, H = 358;
    const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#16324A'); grad.addColorStop(1, '#0D1E2E');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    if (!s || s.phase === 'idle' || s.phase === 'intro') {
      g.shadowColor = '#F2B134'; g.shadowBlur = 24;
      g.fillStyle = '#FFE59A'; g.font = `800 150px ${FONT}`; g.fillText('KIASU QUIZ', W / 2, 200);
      g.shadowBlur = 0; g.fillStyle = '#9FD3E0'; g.font = `800 40px ${FONT}`; g.fillText('THE SINGAPORE TRIVIA SHOW', W / 2, 280);
      this.scrTex.needsUpdate = true;
      return;
    }
    const q = E.question(s), cat = E.CATEGORIES[q.cat];
    g.font = `800 30px ${FONT}`;
    const cw = g.measureText(cat.name.toUpperCase()).width + 56;
    rr(g, 36, 26, cw, 52, 26); g.fillStyle = cat.color; g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(cat.name.toUpperCase(), 64, 63);
    g.textAlign = 'right'; g.fillStyle = '#F2B134'; g.fillText(`Q ${s.qi + 1} / ${E.total(s)}  ${'★'.repeat(q.d)}`, W - 40, 63);
    let f = fit(q.q, 1160, 2, 62, 46);
    if (f.lines.length > 2) f = fit(q.q, 1160, 3, 48, 34);
    const lh = f.size * 1.16;
    const cy = (f.lines.length > 2 ? 200 : 190) - ((f.lines.length - 1) * lh) / 2;
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `800 ${f.size}px ${FONT}`;
    f.lines.forEach((l, i) => g.fillText(l, W / 2, cy + i * lh));
    // timer bar
    let frac = 0, col = '#2F9E5B';
    if (s.phase === 'ask') { frac = s.timeLeft / (s.mode === 'solo' ? E.SOLO_TIME : E.BUZZ_OPEN); col = s.timeLeft <= 5 ? '#D7263D' : frac < 0.5 ? '#F2B134' : '#2F9E5B'; }
    else if (s.phase === 'answering') { frac = s.answerLeft / E.BUZZ_ANSWER; col = s.players[s.buzzer].color; }
    rr(g, 50, H - 40, W - 100, 16, 8); g.fillStyle = '#24425C'; g.fill();
    if (frac > 0) { rr(g, 50, H - 40, (W - 100) * Math.max(0, frac), 16, 8); g.fillStyle = col; g.fill(); }
    this.scrTex.needsUpdate = true;
  }

  _paintTile(i, text, state, poll) {
    const t = this.tiles[i], g = t.cv.getContext('2d'), W = 640, H = 150;
    g.clearRect(0, 0, W, H);
    const fill = state === 'right' ? '#2F9E5B' : state === 'wrong' ? '#D7263D' : state === 'blank' ? '#1A3A48' : '#FFFCF5';
    g.fillStyle = fill; g.fillRect(0, 0, W, H);
    g.globalAlpha = state === 'hidden' ? 0.2 : state === 'tried' ? 0.5 : 1;
    if (state !== 'blank') {
      g.beginPath(); g.arc(78, H / 2, 46, 0, Math.PI * 2); g.fillStyle = TILE_COLORS[i]; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
      g.fillStyle = '#fff'; g.font = `800 54px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ABCD'[i], 78, H / 2 + 3);
      const f = fit(text, W - 190, 2, 46, 30);
      const lh = f.size * 1.1;
      g.textAlign = 'left'; g.fillStyle = state === 'right' || state === 'wrong' ? '#fff' : INK; g.font = `700 ${f.size}px ${BODY}`;
      f.lines.forEach((l, k) => g.fillText(l, 150, H / 2 - ((f.lines.length - 1) * lh) / 2 + k * lh + 2));
      if (state === 'tried') { g.strokeStyle = '#D7263D'; g.lineWidth = 8; g.beginPath(); g.moveTo(140, H / 2); g.lineTo(W - 30, H / 2); g.stroke(); }
      if (poll != null) {
        g.globalAlpha = 1;
        rr(g, 8, H - 22, (W - 16) * poll / 100, 14, 7); g.fillStyle = TILE_COLORS[i]; g.fill();
        g.textAlign = 'right'; g.font = `800 32px ${FONT}`; g.fillText(`${poll}%`, W - 18, 40);
      }
    }
    g.globalAlpha = 1;
    t.tex.needsUpdate = true;
  }

  _paintPod(p, i, state) {
    const P = this.pods[i], g = P.cv.getContext('2d'), W = 300, H = 168;
    g.fillStyle = state === 'buzzed' ? p.color : '#0A1A24'; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = state === 'locked' ? '#6B7785' : '#fff'; g.font = `800 ${p.name.length > 9 ? 34 : 42}px ${FONT}`; g.fillText(p.name, W / 2, 46, W - 20);
    g.fillStyle = state === 'buzzed' ? '#fff' : '#FFE59A'; g.font = `800 72px ${FONT}`; g.fillText(String(p.score), W / 2, 118);
    P.tex.needsUpdate = true;
    if (P.dome) { P.dome.material.emissiveIntensity = state === 'buzzed' ? 3 : state === 'locked' ? 0 : 0.4; P.dome.material.color.set(state === 'locked' ? '#5B646E' : p.color); }
  }

  sync(s) {
    if (!this.ready) { this.pendingS = s; return; }
    if (!s) return;
    if (!this.pods || this.pods.length !== s.players.length || this.podMode !== s.mode) { this.podMode = s.mode; this._podiums(s); this.keys = {}; }
    const idle = s.phase === 'idle' || s.phase === 'intro';
    const q = idle ? null : E.question(s);
    // screen (redrawn when the question or ~1/15 s of timer changes)
    const timeKey = s.phase === 'ask' ? Math.round(s.timeLeft * 15) : s.phase === 'answering' ? Math.round(s.answerLeft * 15) : 0;
    const sKey = `${idle ? 'idle' : `${s.qi}|${q.id}`}|${s.phase}|${timeKey}`;
    if (sKey !== this.keys.s) { this.keys.s = sKey; this._paintScreen(idle ? null : s); }
    // tiles
    const reveal = s.phase === 'reveal' || s.phase === 'over';
    const tKey = idle ? 'blank' : `${s.qi}|${q.id}|${s.phase === 'reveal'}|${s.picked}|${[...s.hidden].join()}|${s.tried ? [...s.tried].join() : ''}|${s.poll ? s.poll.join() : ''}`;
    if (tKey !== this.keys.t) {
      this.keys.t = tKey;
      for (let i = 0; i < 4; i++) {
        if (idle) { this._paintTile(i, '', 'blank'); continue; }
        const st = reveal && i === q.right ? 'right' : reveal && s.picked === i ? 'wrong' : s.hidden.has(i) ? 'hidden' : s.tried && s.tried.has(i) ? 'tried' : '';
        this._paintTile(i, q.opts[i], st, s.poll ? s.poll[i] : null);
      }
    }
    // podiums
    s.players.forEach((p, i) => {
      const st = s.buzzer === i && s.phase === 'answering' ? 'buzzed' : s.locked && s.locked.has(i) && !reveal ? 'locked' : '';
      const k = `${p.name}|${p.score}|${st}`;
      if (this.pods[i] && this.pods[i].key !== k) { this.pods[i].key = k; this._paintPod(p, i, st); }
    });
  }

  say(text, mood = 'happy') {
    void mood;
    this.sayText = text;
    if (!text) { this.bubble.hidden = true; return; }
    this.bubble.querySelector('b').textContent = text;
    this.bubble.hidden = false;
    this.bubble.classList.remove('pop'); void this.bubble.offsetWidth; this.bubble.classList.add('pop');
  }

  _anim(dur, fn, done) { this.anims.push({ t0: performance.now(), dur, fn, done }); }

  _float(text, obj, cls) {
    const v = new THREE.Vector3(); obj.getWorldPosition(v); v.y += 0.3; v.project(this.camera);
    const el = document.createElement('div');
    el.className = `float3d ${cls}`;
    el.textContent = text;
    el.style.left = `${((v.x + 1) / 2) * 100}%`; el.style.top = `${((1 - v.y) / 2) * 100}%`;
    this.floats.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  react(type, s, data = {}) {
    if (!this.ready) return;
    if (type === 'right' || type === 'wrong') {
      const t = this.tiles[data.choice];
      if (!t) return;
      if (type === 'right') {
        this._anim(500, (k) => { const sc = 1 + Math.sin(k * Math.PI) * 0.08; t.mesh.scale.set(sc, 1, sc); }, () => t.mesh.scale.set(1, 1, 1));
        this.flash.color.set(0x9fe3a8);
        if (data.points) this._float(`+${data.points}`, t.mesh, 'good');
      } else {
        this._anim(400, (k) => { t.mesh.position.x = t.base.x + Math.sin(k * 30) * 0.05 * (1 - k); }, () => t.mesh.position.copy(t.base));
        this.flash.color.set(0xff6b7a);
        if (data.points) this._float(String(data.points), t.mesh, 'bad');
      }
      this._anim(600, (k) => { this.flash.intensity = Math.sin(k * Math.PI) * 25; }, () => { this.flash.intensity = 0; });
    } else if (type === 'buzz') {
      const P = this.pods && this.pods[data.p];
      if (P && P.domeRoot) { const y0 = P.domeRoot.position.y; this._anim(300, (k) => { P.domeRoot.position.y = y0 - Math.sin(k * Math.PI) * 0.04; }, () => { P.domeRoot.position.y = y0; }); }
    }
  }

  _click(e) {
    if (!this.ready) return;
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const targets = [...this.tiles.map((t) => t.mesh), ...(this.pods || []).map((p) => p.dome).filter(Boolean)];
    const hit = this.ray.intersectObjects(targets, false)[0];
    if (!hit) return;
    if (hit.object.userData.tile != null && this.onPick) this.onPick(hit.object.userData.tile);
    else if (hit.object.userData.buzz != null && this.onBuzz) this.onBuzz(hit.object.userData.buzz);
  }

  setMode(mode) { this.stage.dataset.mode = mode; }

  _render() {
    const now = performance.now();
    this.anims = this.anims.filter((a) => { const k = Math.min(1, (now - a.t0) / a.dur); a.fn(k); if (k >= 1) { if (a.done) a.done(); return false; } return true; });
    this.rays.rotation.z += 0.0012;
    // keep the speech bubble over the host's head
    if (this.host && !this.bubble.hidden) {
      const v = new THREE.Vector3(); this.host.getWorldPosition(v); v.y += 1.95; v.project(this.camera);
      this.bubble.style.left = `${Math.max(8, ((v.x + 1) / 2) * 100)}%`;
      this.bubble.style.top = `${((1 - v.y) / 2) * 100}%`;
    }
    this.renderer.render(this.scene, this.camera);
  }

  _resize() {
    const w = this.stage.clientWidth || 1, h = this.stage.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const cam = this.camera;
    cam.aspect = w / h;
    // keep the wall (6.2 m wide) and the host in view
    const halfW = 4.0, halfH = 2.2;
    const vHalf = THREE.MathUtils.degToRad(cam.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * cam.aspect);
    const dist = Math.max(halfH / Math.tan(vHalf), halfW / Math.tan(hHalf));
    cam.position.set(0.1, 2.55, dist - 1.2);
    cam.lookAt(this.look);
    cam.updateProjectionMatrix();
  }
}
