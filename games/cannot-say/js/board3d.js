// Cannot Say! — 3D game-show studio (Three.js). Same adapter API as Board2D:
//   load(s) · sync(s) · reveal(s) · react(result, s) · timeUp(s) · showBack() · setMode(mode)
// Stage, podiums, buzzer, stopwatch, lights and the cast come from ../models/studio-assets.glb.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as E from './engine.js';
import { CATEGORIES } from './cards.js';
import { wrapWord, wordSize } from './art.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const FONT = '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif';
const BODY = '"DM Sans", "Segoe UI", system-ui, sans-serif';
const INK = '#20142E';
const CAST = ['uncle', 'aunty', 'student_a', 'worker_a', 'parent', 'ns', 'student_b', 'expecting'];
const CARD_W = 1.0, CARD_H = 1.22;
const STAMP = { got: ['SHIOK!', '#2F9E5B'], skip: ['SKIP', '#7A6A86'], buzz: ['BZZT!', '#D7263D'] };

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;

// ---------- card faces (720 × 880, mirrors the 2D SVG card) ----------
function drawFront(g, card) {
  const W = 720, H = 880, cat = CATEGORIES[card.cat];
  g.clearRect(0, 0, W, H);
  rrect(g, 6, 6, W - 12, H - 12, 46); g.fillStyle = '#FFFCF5'; g.fill();
  g.save(); g.clip();
  g.fillStyle = cat.color; g.fillRect(0, 0, W, 128);
  g.restore();
  g.lineWidth = 10; g.strokeStyle = INK; rrect(g, 6, 6, W - 12, H - 12, 46); g.stroke();
  g.beginPath(); g.moveTo(6, 128); g.lineTo(W - 6, 128); g.lineWidth = 8; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(70, 66, 18, 0, Math.PI * 2); g.fill();
  g.font = `800 40px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillText(cat.name.toUpperCase(), 108, 68);
  const lines = wrapWord(card.word);
  const fs = wordSize(lines) * 2;
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `800 ${fs}px ${FONT}`;
  const y0 = (lines.length === 1 ? -88 : -112) * 2 + 440;
  lines.forEach((l, i) => g.fillText(l, W / 2, y0 + i * fs * 1.02, W - 60));
  // CANNOT SAY pill
  rrect(g, W / 2 - 184, 440 - 24 - 34, 368, 68, 34); g.fillStyle = '#D7263D'; g.fill();
  g.fillStyle = '#fff'; g.font = `800 36px ${FONT}`; g.textBaseline = 'middle';
  g.fillText('C A N N O T   S A Y', W / 2, 440 - 24 + 2);
  card.banned.forEach((b, i) => {
    const y = 440 + (38 + i * 38) * 2;
    g.beginPath(); g.arc(W / 2 - 256, y, 22, 0, Math.PI * 2); g.fillStyle = '#FCE4E7'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#D7263D'; g.stroke();
    g.beginPath(); g.moveTo(W / 2 - 265, y - 9); g.lineTo(W / 2 - 247, y + 9); g.moveTo(W / 2 - 247, y - 9); g.lineTo(W / 2 - 265, y + 9); g.lineWidth = 6; g.lineCap = 'round'; g.stroke();
    g.fillStyle = INK; g.textAlign = 'left'; g.font = `700 ${b.length > 16 ? 44 : 52}px ${BODY}`;
    g.fillText(b, W / 2 - 208, y + 3, W - (W / 2 - 208) - 30);
  });
}
function drawLogo(g, cx, cy, s) {
  g.save(); g.translate(cx, cy); g.scale(s, s);
  g.beginPath();
  g.moveTo(-60, -40); g.lineTo(60, -40); g.quadraticCurveTo(76, -40, 76, -24); g.lineTo(76, 20); g.quadraticCurveTo(76, 36, 60, 36);
  g.lineTo(-2, 36); g.lineTo(-28, 58); g.lineTo(-28, 36); g.lineTo(-60, 36); g.quadraticCurveTo(-76, 36, -76, 20); g.lineTo(-76, -24); g.quadraticCurveTo(-76, -40, -60, -40);
  g.fillStyle = '#fff'; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
  g.fillStyle = INK; g.beginPath(); g.arc(-26, -14, 6, 0, 7); g.arc(26, -14, 6, 0, 7); g.fill();
  g.beginPath(); g.moveTo(-30, -2); g.quadraticCurveTo(0, 24, 30, -2); g.lineWidth = 7; g.lineCap = 'round'; g.stroke();
  g.strokeStyle = '#D7263D'; g.lineWidth = 10; g.beginPath(); g.arc(0, -2, 52, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(-36, -38); g.lineTo(36, 34); g.stroke();
  g.restore();
}
function drawBack(g) {
  const W = 720, H = 880;
  g.clearRect(0, 0, W, H);
  g.save(); rrect(g, 6, 6, W - 12, H - 12, 46); g.clip();
  g.fillStyle = '#E8590C'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#F08A3C'; g.lineWidth = 36;
  for (let i = -10; i < 14; i++) { g.beginPath(); g.moveTo(i * 88, 0); g.lineTo(i * 88 - 320, H); g.stroke(); }
  g.restore();
  g.lineWidth = 10; g.strokeStyle = INK; rrect(g, 6, 6, W - 12, H - 12, 46); g.stroke();
  g.setLineDash([20, 16]); g.lineWidth = 6; g.strokeStyle = '#FFD877'; rrect(g, 54, 54, W - 108, H - 108, 30); g.stroke(); g.setLineDash([]);
  drawLogo(g, W / 2, 360, 2.5);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = `800 100px ${FONT}`; g.lineJoin = 'round';
  [['CANNOT', 648, '#FFF8E8'], ['SAY!', 748, '#FFD877']].forEach(([t, y, c]) => { g.lineWidth = 14; g.strokeStyle = INK; g.strokeText(t, W / 2, y); g.fillStyle = c; g.fillText(t, W / 2, y); });
}

export class Board3D {
  constructor(stage, { modelUrl = '../models/studio-assets.glb', fallbackHref = '../' } = {}) {
    this.stage = stage;
    this.mode = 'idle';
    this.anims = [];
    stage.classList.add('stage-3d');
    stage.innerHTML = `
      <canvas class="gl" aria-label="3D game show studio"></canvas>
      <div class="floats3d" aria-hidden="true"></div>
      <div class="loading" role="status"><div class="spinner" aria-hidden="true"></div><p>Switching on the studio lights… <span class="pct">0%</span></p></div>`;
    this.canvas = stage.querySelector('canvas');
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
    this.scene.background = new THREE.Color(0x140b29);
    this.scene.fog = new THREE.Fog(0x140b29, 9, 22);
    this.scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.25;
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 60);
    this.look = new THREE.Vector3(0.35, 1.3, 0);
    this.scene.add(new THREE.HemisphereLight(0x9a86e0, 0x1a0f33, 0.55));
    const key = new THREE.SpotLight(0xfff1d6, 60, 14, 0.42, 0.5, 1.6);
    key.position.set(0.6, 5.2, 4.2);
    key.target.position.set(0, 1.2, 0.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key, key.target);
    const rimL = new THREE.PointLight(0xff5fa2, 6, 8); rimL.position.set(-3, 2.5, -1.5);
    const rimR = new THREE.PointLight(0xff8a3d, 6, 8); rimR.position.set(3.4, 2.5, -1.2);
    this.scene.add(rimL, rimR);
    this.buzzLight = new THREE.PointLight(0xff2b3d, 0, 6); this.buzzLight.position.set(0, 2, 1.6);
    this.scene.add(this.buzzLight);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x1a0f33, roughness: 0.4, metalness: 0.2 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this._makeCard();
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
    const fontsReady = document.fonts ? Promise.all([document.fonts.load(`800 60px ${FONT}`), document.fonts.load(`700 40px ${BODY}`)]).catch(() => {}) : null;
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url, (e) => {
      if (e.total) this.loadingEl.querySelector('.pct').textContent = `${Math.round((e.loaded / e.total) * 100)}%`;
    });
    await fontsReady;
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.tpl = {};
    for (const c of [...gltf.scene.children]) { c.position.set(0, 0, 0); this.tpl[c.name] = c; }
    this._buildSet();
    this.ready = true;
    this.loadingEl.classList.add('done');
    drawBack(this.backCv.getContext('2d')); this.backTex.needsUpdate = true;
    if (this.cardFace === 'front' && this.curCard) this._paintFront(this.curCard);
    if (this.pendingS) { const s = this.pendingS; this.pendingS = null; this.load(s); }
  }

  _clone(name, x, y, z, rotY = 0, scale = 1) {
    const t = this.tpl[name];
    if (!t) return null;
    const o = t.clone(true);
    o.position.set(x, y, z); o.rotation.y = rotY; o.scale.setScalar(scale);
    this.scene.add(o);
    return o;
  }

  _buildSet() {
    this._clone('StageDeck', 0, 0, 0);
    const back = this._clone('Backdrop', 0, 0, 0);
    // the big screen behind everything
    this.screenCv = canvas(1024, 512);
    this.screenTex = new THREE.CanvasTexture(this.screenCv);
    this.screenTex.colorSpace = THREE.SRGBColorSpace; this.screenTex.flipY = false;
    const scr = back.getObjectByName('BigScreen');
    if (scr) scr.material = new THREE.MeshBasicMaterial({ map: this.screenTex, toneMapped: false });
    // stopwatch with a live face
    this.watch = this._clone('Stopwatch', -1.7, 1.42, 0.9, 0.42, 0.95);
    this.watchCv = canvas(512, 512);
    this.watchTex = new THREE.CanvasTexture(this.watchCv);
    this.watchTex.colorSpace = THREE.SRGBColorSpace; this.watchTex.flipY = false;
    const face = this.watch && this.watch.getObjectByName('WatchFace');
    if (face) face.material = new THREE.MeshBasicMaterial({ map: this.watchTex, side: THREE.DoubleSide, toneMapped: false });
    // buzzer
    this.buzzer = this._clone('Buzzer', -2.55, 0.18, 1.55, 0.3);
    this.buzzCap = this.buzzer && this.buzzer.getObjectByName('BuzzerCap');
    // spots and a TV camera for atmosphere
    this.spots = [this._clone('SpotFixture', -2.9, 0.18, 1.0, -0.6), this._clone('SpotFixture', 2.9, 0.18, 1.0, 0.6)];
    this._clone('TVCamera', -3.6, 0, 3.0, Math.PI + 0.5, 1.1);
    this._clone('TVCamera', 4.0, 0, 2.6, Math.PI - 0.6, 1.1);
    // swinging light beams
    this.beams = [];
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
    for (const [x, c] of [[-2.2, 0xffd877], [0, 0xffe9a8], [2.4, 0xff9fbf]]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 7, 32, 1, true), beamMat.clone());
      cone.material.color.set(c);
      cone.geometry.translate(0, -3.5, 0);
      const pivot = new THREE.Group();
      pivot.position.set(x, 7, -0.8);
      pivot.add(cone);
      this.scene.add(pivot);
      this.beams.push(pivot);
    }
    // host and a couple of crew
    this._clone('Char_ns_Stand', -2.7, 0.18, -0.6, 0.5, 0.82);
    this.trophy = this._clone('Trophy', 0, 0.18, 1.2, 0, 2.2);
    if (this.trophy) this.trophy.visible = false;
    this.podGroup = new THREE.Group();
    this.scene.add(this.podGroup);
  }

  _podiums(s) {
    if (!this.ready) return;
    for (const c of [...this.podGroup.children]) this.podGroup.remove(c);
    this.pods = s.teams.map((t, i) => {
      const n = s.teams.length;
      const k = n === 1 ? 0 : i / (n - 1);
      const x = 1.4 + k * 1.2, z = 1.05 - k * 1.8, rot = -0.45 - k * 0.3;
      const g = new THREE.Group();
      g.position.set(x, 0.18, z); g.rotation.y = rot;
      const pod = this.tpl.Podium.clone(true);
      const col = new THREE.Color(t.color);
      const cv = canvas(320, 208);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false;
      pod.traverse((o) => {
        if (!o.isMesh) return;
        const name = o.material && o.material.name;
        if (name === 'CS_PodiumPanel') { o.material = o.material.clone(); o.material.color.copy(col); }
        if (name === 'CS_PodiumStrip') { o.material = o.material.clone(); o.material.color.copy(col); o.material.emissive = col.clone(); o.userData.strip = true; }
        if (o.name === 'PD_screen' || (o.parent && o.parent.name === 'PD_screen')) { o.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); o.position.z += 0.012; }
      });
      const strip = []; pod.traverse((o) => { if (o.userData.strip) strip.push(o); });
      g.add(pod);
      const who = CAST[(i * 2 + 1) % CAST.length];
      const ch = this.tpl[`Char_${who}_Stand`];
      if (ch) { const c = ch.clone(true); c.position.set(0, 0, -0.42); c.scale.setScalar(0.8); g.add(c); }
      this.podGroup.add(g);
      return { g, tex, cv, strip, key: '' };
    });
  }

  _paintPods(s) {
    if (!this.pods) return;
    s.teams.forEach((t, i) => {
      const p = this.pods[i];
      if (!p) return;
      const on = i === s.turn && s.phase !== 'over' && s.phase !== 'idle';
      const key = `${t.name}|${t.score}|${on}`;
      if (p.key !== key) {
        p.key = key;
        const g = p.cv.getContext('2d');
        g.fillStyle = on ? t.color : '#120B24'; g.fillRect(0, 0, 320, 208);
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `800 ${t.name.length > 11 ? 30 : 36}px ${FONT}`;
        g.fillText(t.name, 160, 46, 300);
        g.font = `800 112px ${FONT}`; g.fillStyle = on ? '#fff' : '#FFD877';
        g.fillText(String(t.score), 160, 138);
        p.tex.needsUpdate = true;
      }
      for (const m of p.strip) m.material.emissiveIntensity = on ? 3 + Math.sin(this.clock.elapsedTime * 6) * 1.2 : 0.4;
    });
  }

  _paintScreen(s) {
    const key = s ? `${s.phase}|${s.round}|${s.turn}|${s.teams.map((t) => t.score).join(',')}` : 'idle';
    if (key === this.screenKey) return;
    this.screenKey = key;
    const g = this.screenCv.getContext('2d'), W = 1024, H = 512;
    const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#2A1650'); grad.addColorStop(1, '#120B24');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 2;
    for (let x = 0; x < W; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    drawLogo(g, 190, 230, 1.6);
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.shadowColor = '#FF8A3D'; g.shadowBlur = 30;
    g.font = `800 128px ${FONT}`; g.fillStyle = '#FF8A3D'; g.fillText('CANNOT', 340, 170);
    g.fillStyle = '#FFD877'; g.fillText('SAY!', 340, 300);
    g.shadowBlur = 0;
    if (s && s.phase !== 'idle') {
      g.font = `800 40px ${FONT}`; g.fillStyle = '#fff';
      const t = s.teams[s.turn];
      const line = s.phase === 'over' ? 'FINAL SCORES' : `ROUND ${s.round + 1} / ${s.rounds}  ·  ${t.name.toUpperCase()}`;
      g.fillText(line, 340, 410, 650);
    }
    this.screenTex.needsUpdate = true;
  }

  _paintWatch(s) {
    if (!this.watchCv) return;
    const secs = s ? Math.ceil(s.timeLeft) : 60;
    const frac = s ? s.timeLeft / s.seconds : 1;
    const key = `${secs}|${Math.round(frac * 200)}`;
    if (key === this.watchKey) return;
    this.watchKey = key;
    const g = this.watchCv.getContext('2d');
    g.fillStyle = '#FFFCF5'; g.fillRect(0, 0, 512, 512);
    g.lineWidth = 46; g.strokeStyle = '#EDE6DA';
    g.beginPath(); g.arc(256, 256, 190, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = secs <= 10 ? '#D7263D' : frac < 0.5 ? '#F2B134' : '#2F9E5B';
    g.lineCap = 'round';
    if (frac > 0.001) { g.beginPath(); g.arc(256, 256, 190, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); g.stroke(); }
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 168px ${FONT}`; g.fillText(String(secs), 256, 246);
    g.font = `800 34px ${FONT}`; g.fillStyle = '#7A6A86'; g.fillText('S E C O N D S', 256, 348);
    this.watchTex.needsUpdate = true;
  }

  // ---------------- the card ----------------
  _makeCard() {
    this.frontCv = canvas(720, 880);
    this.backCv = canvas(720, 880);
    this.frontTex = new THREE.CanvasTexture(this.frontCv);
    this.backTex = new THREE.CanvasTexture(this.backCv);
    for (const t of [this.frontTex, this.backTex]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; }
    drawBack(this.backCv.getContext('2d'));
    this.cardGeo = new THREE.BoxGeometry(CARD_W, CARD_H, 0.018);
    const edge = new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.6 });
    this.card = new THREE.Mesh(this.cardGeo, [edge, edge, edge, edge,
      new THREE.MeshStandardMaterial({ map: this.frontTex, roughness: 0.55 }),
      new THREE.MeshStandardMaterial({ map: this.backTex, roughness: 0.55 })]);
    this.card.castShadow = true;
    this.cardHome = new THREE.Vector3(-0.05, 1.42, 1.55);
    this.cardRoot = new THREE.Group();
    this.cardRoot.position.copy(this.cardHome);
    this.cardRoot.rotation.z = -0.03;
    this.cardRoot.scale.setScalar(1.2);
    this.cardRoot.add(this.card);
    this.card.rotation.y = Math.PI; // face down
    this.cardFace = 'back';
    this.scene.add(this.cardRoot);
  }

  _paintFront(card) {
    this.curCard = card;
    drawFront(this.frontCv.getContext('2d'), card);
    this.frontTex.needsUpdate = true;
  }

  showBack() {
    this.cardFace = 'back';
    this.curCard = null;
    this.card.rotation.y = Math.PI;
  }

  _anim(dur, fn, done) { this.anims.push({ t0: performance.now(), dur, fn, done }); }

  load(s) {
    if (!this.ready) { this.pendingS = s; return; }
    if (this.trophy) this.trophy.visible = false;
    this._podiums(s);
    this.showBack();
    this.sync(s);
  }

  sync(s) {
    if (!this.ready || !s) return;
    if (!this.pods || this.pods.length !== s.teams.length) this._podiums(s);
    this._paintPods(s);
    this._paintScreen(s);
    this._paintWatch(s);
    if (s.phase === 'play' && s.card && this.stage.dataset.mode !== 'paused' && !this.flipping && (!this.curCard || this.curCard.id !== s.card.id)) {
      this._paintFront(s.card);
      this.cardFace = 'front';
      this.card.rotation.y = 0;
    }
    if (s.phase !== 'play' && s.phase !== 'review' && this.cardFace === 'front') this.showBack();
    if (s.phase === 'over' && this.trophy && !this.trophy.visible) {
      // the card flies up out of shot and the trophy rises in its place
      this.trophy.visible = true;
      this.trophy.position.set(this.cardHome.x, 0.18, this.cardHome.z - 0.2);
      this.cardOff = true;
      this._anim(600, (k) => { this.cardRoot.position.y = this.cardHome.y + easeIn(k) * 3.5; }, () => { this.cardRoot.visible = false; });
      this._anim(900, (k) => { this.trophy.scale.setScalar(2.4 * easeOut(k)); this.trophy.rotation.y = (1 - k) * 4; });
    }
    if (s.phase !== 'over' && this.cardOff) {
      this.cardOff = false;
      this.cardRoot.visible = true;
      this.cardRoot.position.copy(this.cardHome);
      if (this.trophy) this.trophy.visible = false;
    }
  }

  reveal(s) {
    return new Promise((resolve) => {
      if (!this.ready || !s.card) { resolve(); return; }
      this.flipping = true;
      this._paintFront(s.card);
      const from = this.card.rotation.y;
      this._anim(450, (k) => {
        const e = easeOut(k);
        this.card.rotation.y = from + (0 - from) * e;
        this.cardRoot.position.y = this.cardHome.y + Math.sin(k * Math.PI) * 0.18;
      }, () => { this.card.rotation.y = 0; this.cardFace = 'front'; this.flipping = false; resolve(); });
    });
  }

  react(result, s) {
    if (!this.ready) return;
    const st = STAMP[result];
    if (!st) return;
    // snapshot the old face onto a flying copy, with a rubber stamp
    const cv = canvas(720, 880);
    const g = cv.getContext('2d');
    g.drawImage(this.frontCv, 0, 0);
    g.save(); g.translate(360, 380); g.rotate(-0.24);
    g.lineWidth = 18; g.strokeStyle = st[1]; rrect(g, -250, -86, 500, 172, 28); g.stroke();
    g.fillStyle = st[1]; g.font = `800 128px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(st[0], 0, 8);
    g.restore();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const mats = this.card.material.map((m, i) => (i === 4 ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }) : m));
    const fly = new THREE.Mesh(this.cardGeo, mats);
    fly.position.copy(this.cardRoot.position);
    fly.rotation.copy(this.cardRoot.rotation);
    fly.position.z += 0.02;
    this.scene.add(fly);
    const p0 = fly.position.clone();
    const cleanup = () => { this.scene.remove(fly); tex.dispose(); mats[4].dispose(); };
    if (result === 'got') {
      this._anim(700, (k) => { const e = easeIn(k); fly.position.set(p0.x + e * 4.2, p0.y + Math.sin(k * Math.PI) * 0.6 + e * 1.2, p0.z - e * 1.5); fly.rotation.z = -0.03 - e * 1.4; fly.rotation.y = e * 0.8; }, cleanup);
      this._flashPod(s.turn);
    } else if (result === 'skip') {
      this._anim(600, (k) => { const e = easeIn(k); fly.position.set(p0.x - e * 4.4, p0.y - e * 0.3, p0.z - e * 0.8); fly.rotation.z = -0.03 + e * 0.9; }, cleanup);
    } else {
      this._anim(800, (k) => {
        const shake = k < 0.35 ? Math.sin(k * 60) * 0.06 * (1 - k / 0.35) : 0;
        const d = k < 0.35 ? 0 : easeIn((k - 0.35) / 0.65);
        fly.position.set(p0.x + shake, p0.y - d * 2.4, p0.z + d * 0.3);
        fly.rotation.x = -d * 1.2;
      }, cleanup);
      this._pressBuzzer();
    }
    // deal the next card in
    if (s.card) {
      this._paintFront(s.card);
      this.cardFace = 'front';
      this.card.rotation.y = 0;
      this._anim(280, (k) => { const e = easeOut(k); this.cardRoot.position.set(this.cardHome.x + (1 - e) * 0.25, this.cardHome.y - (1 - e) * 0.2, this.cardHome.z - (1 - e) * 0.15); this.card.rotation.z = (1 - e) * 0.12; });
    }
  }

  _pressBuzzer() {
    if (this.buzzCap) { const y0 = this.buzzCap.userData.y0 ?? (this.buzzCap.userData.y0 = this.buzzCap.position.y); this._anim(300, (k) => { this.buzzCap.position.y = y0 - Math.sin(k * Math.PI) * 0.05; }); }
    this._anim(600, (k) => { this.buzzLight.intensity = Math.sin(k * Math.PI) * 30; }, () => { this.buzzLight.intensity = 0; });
  }

  _flashPod(i) {
    const p = this.pods && this.pods[i];
    if (!p) return;
    this._anim(450, (k) => { p.g.position.y = 0.18 + Math.sin(k * Math.PI) * 0.06; });
  }

  timeUp() {
    if (this.watch) { const r0 = this.watch.rotation.z; this._anim(700, (k) => { this.watch.rotation.z = r0 + Math.sin(k * 40) * 0.12 * (1 - k); }); }
    this._pressBuzzer();
    const el = document.createElement('div');
    el.className = 'float3d times-up3d';
    el.textContent = "TIME'S UP!";
    el.style.left = '50%'; el.style.top = '48%';
    this.floats.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  setMode(mode) { this.mode = mode; this.stage.dataset.mode = mode; if (mode === 'paused') this.showBack(); }

  _render() {
    const now = performance.now();
    const t = this.clock.getElapsedTime();
    this.anims = this.anims.filter((a) => {
      const k = Math.min(1, (now - a.t0) / a.dur);
      a.fn(k);
      if (k >= 1) { if (a.done) a.done(); return false; }
      return true;
    });
    if (this.beams) this.beams.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.5 + i * 2) * 0.35; b.rotation.x = Math.cos(t * 0.4 + i) * 0.2; });
    // the card floats gently
    if (!this.anims.length && !this.cardOff) this.cardRoot.position.y = this.cardHome.y + Math.sin(t * 1.6) * 0.012;
    if (this.mode === 'play' && this.pods) this.pods.forEach((p) => p.strip.forEach((m) => { if (m.material.emissiveIntensity > 1) m.material.emissiveIntensity = 3 + Math.sin(t * 6) * 1.2; }));
    this.renderer.render(this.scene, this.camera);
  }

  _resize() {
    const w = this.stage.clientWidth || 1, h = this.stage.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const cam = this.camera;
    cam.aspect = w / h;
    // keep about 6.8 m of the stage in view across, whatever the shape of the screen
    const fovH = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
    const dist = Math.max(4.2, 3.0 / Math.tan(fovH / 2));
    cam.position.set(0.35, 1.25 + dist * 0.11, dist);
    cam.lookAt(this.look);
    cam.updateProjectionMatrix();
    // on short phone screens make the card bigger so the banned words stay readable
    if (this.cardRoot) this.cardRoot.scale.setScalar(h < 420 ? 1.45 : 1.2);
  }
}
