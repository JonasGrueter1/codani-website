// Engine: Renderer, Licht, Umgebung, Postprocessing, Groesse, Maus, Qualitaetsstufen.
// Wird von main.js (Seite) und dev.js (Testseite) gleich verwendet.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FxPass } from './fx/FxPass.js';
import { PALETTE, QUALITY, BASE_LOOK, LOOK_KEYS } from './config.js';

const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const PIXEL_BUDGET = 3.5e6;
const DPR_SCALE_MIN = 0.5;

/** Qualitaetsstufe waehlen. ?q=high|medium|low erzwingt eine Stufe (ohne automatische Anpassung). */
export function pickQuality(search = window.location.search) {
  const forced = new URLSearchParams(search).get('q');
  if (forced && QUALITY[forced]) return { quality: forced, forced: true };
  // Handy/Tablet: Touch als Hauptzeiger oder schmales Fenster. Laptops mit 1280 x 800 bleiben auf high
  // (die adaptive Aufloesung faengt schwache Grafik ab).
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = Math.min(window.innerWidth, window.screen.width || 9999) < 760;
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  let quality = coarse || narrow ? 'medium' : 'high';
  if (mem <= 2 || cores <= 2) quality = 'low';
  return { quality, forced: false };
}

export function isMobileDevice() {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
}

/** Mischt BASE_LOOK mit den Looks der Module nach Gewicht. entries: [{ look, weight }] */
export function blendLook(entries, base = BASE_LOOK, out = {}) {
  for (const key of LOOK_KEYS) {
    let acc = 0;
    let ws = 0;
    for (const e of entries) {
      const v = e.look ? e.look[key] : undefined;
      if (v === undefined || v === null || !(e.weight > 0)) continue;
      acc += v * e.weight;
      ws += e.weight;
    }
    out[key] = ws > 1 ? acc / ws : acc + (1 - ws) * base[key];
  }
  return out;
}

export class Engine {
  constructor(canvas, { quality = 'high', forced = false, isMobile = false } = {}) {
    this.canvas = canvas;
    this.quality = quality;
    this.tier = QUALITY[quality];
    this.forced = forced;
    this.isMobile = isMobile;
    this.dprScale = 1;
    this.size = { width: 1, height: 1, dpr: 1 };
    this.listeners = new Set();
    this.stats = { fps: 60, frameMs: 16.7, calls: 0, triangles: 0, dpr: 1 };
    // base: typischer Bildabstand des Geraets (60 Hz oder gedrosselt auf 30 Hz), in den ersten Sekunden gemessen
    this._adapt = { acc: 0, frames: 0, good: 0, cool: 0, base: 1 / 60, probe: [], probed: false };

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = BASE_LOOK.exposure;
    renderer.setClearColor(PALETTE.void, 1);
    renderer.info.autoReset = false; // Statistik ueber alle Passes eines Frames
    this.renderer = renderer;

    /* Szene, Kamera, Nebel */
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(PALETTE.void.clone(), BASE_LOOK.fogDensity);
    this.camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.01, 220);
    this.camera.position.set(0, 0.35, 15.5);
    this.scene.add(this.camera);

    /* Licht: feste Anzahl (sonst kompilieren Shader neu). Module aendern nur Intensitaeten ueber `look`.
       key: warmes Fuehrungslicht (Ember, aufgehellt) von links vorne, rim: kuehles Kantenlicht von rechts hinten.
       So steht die Figur warm/kalt geteilt im Raum statt monochrom Tuerkis. Nur der Roboter nutzt diese Lichter. */
    const key = new THREE.DirectionalLight(PALETTE.ember.clone().lerp(new THREE.Color(0xffffff), 0.38), BASE_LOOK.key);
    key.position.set(-4.4, 2.8, 5.0);
    const rim = new THREE.DirectionalLight(PALETTE.signal.clone(), BASE_LOOK.rim);
    rim.position.set(5.0, 2.4, -4.2);
    const amb = new THREE.HemisphereLight(0x8fb8d8, 0x05070a, BASE_LOOK.amb);
    this.lights = { key, rim, amb };
    // Kantenlicht-Farbe: Cyan, im Ausklang warmes Gold (look.rimWarm), ohne Allokation pro Bild
    this._rimCool = PALETTE.signal.clone();
    this._rimWarm = PALETTE.ember.clone().lerp(new THREE.Color(0xffffff), 0.25);
    this.scene.add(key, rim, amb);

    /* Umgebung fuer Spiegelungen (prozedural, kein Download) */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    this.envMap = pmrem.fromScene(room, 0.04).texture;
    room.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    pmrem.dispose();
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = BASE_LOOK.env;

    /* Gemeinsame Uniforms fuer eigene Shader (ein Objekt, ueberall referenzieren, nicht kopieren) */
    this.shared = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) }, // in Pixeln (inkl. DPR)
      uPixelRatio: { value: 1 },
    };

    /* Postprocessing: Render -> Bloom -> Output (ACES + sRGB) -> Fx (Aberration, Vignette, Korn) */
    const floatOk = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
    this._msaa = floatOk ? this.tier.msaa : 0;
    const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 0 });
    rt.texture.name = 'Studio.rt1';
    this.composer = new EffectComposer(renderer, rt);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), BASE_LOOK.bloom, BASE_LOOK.bloomRadius, BASE_LOOK.bloomThreshold);
    const bloomSetSize = this.bloom.setSize.bind(this.bloom);
    this.bloom.setSize = (w, h) => {
      const s = this.tier.bloomScale;
      bloomSetSize(Math.max(4, Math.round(w * s)), Math.max(4, Math.round(h * s)));
    };
    this.output = new OutputPass();
    this.fx = new FxPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);
    this.composer.addPass(this.fx);

    /* Maus: x/y roh (-1..1, y oben), sx/sy geglaettet, vx/vy Geschwindigkeit */
    this.pointer = { x: 0, y: 0, sx: 0, sy: 0, vx: 0, vy: 0, inside: false, touch: isMobile };
    this._onPointer = (e) => {
      if (e.pointerType === 'touch') return;
      this.pointer.touch = false;
      this.pointer.inside = true;
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    this._onLeave = () => { this.pointer.inside = false; };
    window.addEventListener('pointermove', this._onPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', this._onLeave);

    /* Groesse */
    this._resizeQueued = false;
    this._onResize = () => {
      if (this._resizeQueued) return;
      this._resizeQueued = true;
      requestAnimationFrame(() => { this._resizeQueued = false; this.resize(); });
    };
    window.addEventListener('resize', this._onResize);
    this.resize(true);
  }

  // Pixelbudget: hoechstens ~3.5 Megapixel pro Bild (16 Vollbild-Passes mit HalfFloat), danach adaptive Skala
  get dpr() {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const budget = Math.sqrt(PIXEL_BUDGET / (w * h));
    const base = Math.min(window.devicePixelRatio || 1, this.tier.dprMax, Math.max(1, budget));
    return Math.max(0.6, Math.max(this.tier.dprMin, base) * this.dprScale);
  }

  /** true, wenn die Aufloesung nicht weiter sinken kann (fuer den FPS-Waechter in main.js) */
  atFloor() { return this.dprScale <= DPR_SCALE_MIN + 1e-3 && !this._msaa; }

  /** Abdunkeln hinter dem Text (director.scrim) */
  setScrim(sc) {
    const u = this.fx.uniforms;
    if (!sc) { u.uScrim.value = 0; return; }
    u.uScrimRect.value.set(sc.x, sc.y, Math.max(0.02, sc.rx), Math.max(0.02, sc.ry));
    u.uScrim.value = sc.a;
  }

  resize(force = false) {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const dpr = this.dpr;
    if (!force && w === this.size.width && h === this.size.height && dpr === this.size.dpr) return;
    this.size.width = w;
    this.size.height = h;
    this.size.dpr = dpr;
    this.stats.dpr = dpr;
    const samples = dpr < 1.5 ? this._msaa : 0;
    // MSAA nur dort, wo die Szene hinein gerendert wird (RenderPass schreibt immer in renderTarget1).
    // renderTarget2 bekommt nur fertige Vollbild-Passes: dort bringt Multisampling nichts und kostet Speicher.
    const rt1 = this.composer.renderTarget1;
    const rt2 = this.composer.renderTarget2;
    if (rt1.samples !== samples) { rt1.samples = samples; rt1.dispose(); }
    if (rt2.samples !== 0) { rt2.samples = 0; rt2.dispose(); }
    // Ohne MSAA und bei kleiner Aufloesung (Handy, nach Adaption): FXAA im letzten Pass gegen Treppen an Kanten
    this.fx.uniforms.uFxaa.value = samples === 0 && dpr < 1.76 ? 1 : 0;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.shared.uResolution.value.set(w * dpr, h * dpr);
    this.shared.uPixelRatio.value = dpr;
    for (const fn of this.listeners) fn(w, h, dpr);
  }

  onResize(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  updatePointer(dt, time) {
    const p = this.pointer;
    let tx = p.x;
    let ty = p.y;
    if (p.touch) { // Touch: sanftes Eigenleben statt Maus
      tx = Math.sin(time * 0.23) * 0.35;
      ty = Math.sin(time * 0.19 + 1.1) * 0.2;
    } else if (!p.inside) { tx *= 0.5; ty *= 0.5; }
    const ox = p.sx;
    const oy = p.sy;
    p.sx = damp(p.sx, tx, 3.2, dt);
    p.sy = damp(p.sy, ty, 3.2, dt);
    p.vx = dt > 0 ? (p.sx - ox) / dt : 0;
    p.vy = dt > 0 ? (p.sy - oy) / dt : 0;
  }

  /** Look anwenden (Werte aus blendLook) */
  applyLook(look, time) {
    const r = this.renderer;
    r.toneMappingExposure = look.exposure;
    this.bloom.strength = look.bloom;
    this.bloom.radius = look.bloomRadius;
    this.bloom.threshold = look.bloomThreshold;
    this.bloom.enabled = look.bloom > 0.005;
    const u = this.fx.uniforms;
    u.uTime.value = time;
    u.uAberration.value = this.tier.aberration ? look.aberration : 0;
    u.uVignette.value = look.vignette;
    u.uGrain.value = look.grain;
    u.uFlash.value = look.flash;
    u.uFade.value = look.fade;
    u.uDim.value = look.dim;
    this.scene.fog.density = look.fogDensity;
    this.scene.environmentIntensity = look.env;
    this.lights.key.intensity = look.key;
    this.lights.rim.intensity = look.rim;
    this.lights.rim.color.copy(this._rimCool).lerp(this._rimWarm, look.rimWarm || 0);
    this.lights.amb.intensity = look.amb;
  }

  /** Alle Shader vorab kompilieren (alle Gruppen muessen dafuer sichtbar sein) */
  async warmup() {
    try {
      // compileAsync nur mit KHR_parallel_shader_compile, sonst warnt three.js (z. B. SwiftShader)
      const parallel = this.renderer.extensions.has('KHR_parallel_shader_compile');
      // Wichtig (Runde 2): mit dem Render-Target der Szene kompilieren. Ohne Ziel (Bildschirm) baut three.js die
      // Programme mit ACES und sRGB-Ausgabe; die Szene rendert aber linear in den Composer. Dann war jedes Programm
      // doppelt da (94 statt rund 50) und die richtigen entstanden erst beim ersten Bild (Ruckler, langer Start).
      const r = this.renderer;
      const target = this.composer.readBuffer;
      const withTarget = (fn) => { const prev = r.getRenderTarget(); r.setRenderTarget(target); try { return fn(); } finally { r.setRenderTarget(prev); } };
      if (parallel && r.compileAsync) await withTarget(() => r.compileAsync(this.scene, this.camera));
      else {
        // Ohne parallele Kompilierung: Szene fuer Szene, mit einem Bild Pause dazwischen. So bleibt der Preloader
        // fluessig (sonst ein einziger langer Block von mehreren Sekunden).
        const nextFrame = () => new Promise((res) => { requestAnimationFrame(() => res()); setTimeout(res, 60); });
        for (const child of this.scene.children.slice()) {
          if (child.isLight || child.isCamera) continue;
          withTarget(() => r.compile(child, this.camera, this.scene));
          await nextFrame();
        }
      }
    } catch (e) {
      console.warn('Shader-Vorkompilierung uebersprungen:', e && e.message);
    }
    this.composer.render(0);
  }

  render(dt) {
    this.renderer.info.reset();
    this.composer.render(dt);
    const info = this.renderer.info.render;
    this.stats.calls = info.calls;
    this.stats.triangles = info.triangles;
  }

  /**
   * Adaptive Aufloesung, dauernd aktiv: schnell runter, wenn Frames zu lange dauern, langsam wieder rauf,
   * wenn ueber mehrere Sekunden Reserve da ist (Hysterese, nach einem Absenken 20 s Pause fuer das Anheben).
   */
  adapt(dtRaw) {
    const a = this._adapt;
    this.stats.frameMs = this.stats.frameMs * 0.92 + dtRaw * 1000 * 0.08;
    this.stats.fps = Math.round(1000 / Math.max(1, this.stats.frameMs));
    if (this.forced) return;
    // Grundtakt erkennen: iOS-Stromsparmodus, Chrome-Energiesparen und Android Battery Saver drosseln
    // requestAnimationFrame fix auf 30 Hz (33.3 ms), auch wenn die GPU kaum zu tun hat. Liegen die Abstaende
    // eng um 33 ms, gilt 30 Hz als Basis: sonst wuerde die Aufloesung ohne Grund bis aufs Minimum sinken.
    if (!a.probed) {
      if (dtRaw > 0 && dtRaw < 0.1) a.probe.push(dtRaw);
      if (a.probe.length < 45) return;
      const sorted = a.probe.slice().sort((x, y) => x - y);
      const med = sorted[sorted.length >> 1];
      const q1 = sorted[Math.floor(sorted.length * 0.2)];
      const q3 = sorted[Math.floor(sorted.length * 0.8)];
      a.base = med > 0.028 && med < 0.04 && q3 - q1 < 0.004 ? 1 / 30 : 1 / 60;
      // Schwaches Geraet ohne navigator.deviceMemory (iOS landet sonst immer auf medium): ist schon der ruhige
      // Anfang deutlich zu langsam (Median ueber 45 ms, nicht gedrosselt), sofort wie Stufe low rendern
      if (this.quality !== 'low' && a.base < 1 / 40 && med > 0.045) {
        this.slowStart = true;
        this._msaa = 0;
        this.dprScale = Math.min(this.dprScale, 0.62);
        this.resize(true);
      }
      a.probed = true;
      a.probe.length = 0;
      a.acc = 0;
      a.frames = 0;
      return;
    }
    a.acc += dtRaw;
    a.frames += 1;
    a.cool = Math.max(0, a.cool - dtRaw);
    if (a.acc < 1.0) return;
    const avg = a.acc / a.frames;
    a.acc = 0;
    a.frames = 0;
    // Schwellen relativ zum Grundtakt: 60 Hz -> runter ab ~29 ms, rauf unter ~19 ms; 30 Hz -> runter ab 40 ms,
    // rauf unter 35 ms (gedrosselt kann man Reserve nur an knapp eingehaltenen 33 ms erkennen)
    const slow = a.base > 1 / 40 ? a.base * 1.2 : 1 / 34;
    const fast = a.base > 1 / 40 ? a.base * 1.05 : 1 / 52;
    if (avg > slow) {
      a.good = 0;
      a.cool = 20;
      if (this._msaa) { this._msaa = 0; this.resize(true); return; }
      const next = Math.max(DPR_SCALE_MIN, this.dprScale - (avg > 1 / 20 ? 0.25 : 0.12));
      if (next < this.dprScale - 1e-3) { this.dprScale = next; this.resize(true); }
    } else if (avg < fast && this.dprScale < 1) {
      a.good += 1;
      if (a.good >= 4 && a.cool <= 0) {
        a.good = 0;
        this.dprScale = Math.min(1, this.dprScale + 0.1);
        this.resize(true);
      }
    } else {
      a.good = 0;
    }
  }

  dispose() {
    window.removeEventListener('pointermove', this._onPointer);
    window.removeEventListener('resize', this._onResize);
    document.documentElement.removeEventListener('pointerleave', this._onLeave);
    this.composer.passes.forEach((p) => p.dispose && p.dispose());
    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();
    this.envMap.dispose();
    this.renderer.dispose();
  }
}
