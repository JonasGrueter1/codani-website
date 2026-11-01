// Director: Scrollposition -> globaler Fortschritt 0..1 -> Beats, Module, Kamera.
// Laeuft mit ScrollTrigger (index.html) oder ohne DOM (dev.html, setTarget()).
import * as THREE from 'three';
import {
  BEATS, BEAT_FADE, MODULES, MODULE_FADE, CAMERA_KEYS, CUT_FADE, PORTRAIT, TEMPO, nominalBeatWindows,
} from './config.js';

/* ------------------------------------------------------------ Helfer */
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
// Bildrate-unabhaengiges Daempfen: lambda ~ 1/Sekunden (hoeher = straffer)
export const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));

export function parseAt(str) {
  const [beat, p] = String(str).split('@');
  return { beat, p: p === undefined ? 0 : parseFloat(p) };
}

export function resolveAt(str, beatWindows) {
  const { beat, p } = parseAt(str);
  const w = beatWindows[beat];
  if (!w) throw new Error(`Director: unbekannter Beat "${beat}" in "${str}"`);
  return w.start + (w.end - w.start) * clamp01(p);
}

// Gewicht 0..1 mit weicher Ueberblendung an beiden Enden (Raender 0 und 1 ohne Rampe).
// hardStart/hardEnd: Rand liegt auf einem Schnitt, dort ohne Rampe (sonst blendete ein Modul ueber den Schnitt).
export function windowWeight(g, start, end, fade, hardStart = false, hardEnd = false) {
  const a = start <= 1e-4 ? 1 : hardStart ? (g >= start ? 1 : 0) : smoothstep(start - fade, start + fade, g);
  const b = end >= 1 - 1e-4 ? 1 : hardEnd ? (g < end ? 1 : 0) : 1 - smoothstep(end - fade, end + fade, g);
  return a * b;
}

// Monotone kubische Interpolation (Fritsch-Carlson): stetige Geschwindigkeit ueber Keyframes
function monotone(xs, ys) {
  const n = xs.length;
  if (n === 1) return () => ys[0];
  const d = new Array(n - 1);
  const m = new Array(n);
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(d[i]) < 1e-9) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i]
      + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// Bogenlaengen-Anteil der Kurve an jedem Kontrollpunkt (CatmullRom laeuft durch alle Punkte)
function arcFractions(curve, count) {
  if (count < 2) return [0];
  const per = 48;
  const lengths = curve.getLengths((count - 1) * per);
  const total = lengths[lengths.length - 1] || 1;
  const out = [];
  for (let i = 0; i < count; i++) out.push(lengths[i * per] / total);
  return out;
}

function buildShots(keys, beatWindows, portrait) {
  const resolved = keys.map((k, i) => ({
    i,
    t: resolveAt(k.at, beatWindows),
    cut: !!k.cut,
    pos: new THREE.Vector3().fromArray(portrait && k.posM ? k.posM : k.pos),
    look: new THREE.Vector3().fromArray(portrait && k.lookM ? k.lookM : k.look),
    fov: k.fov ?? 35,
    roll: k.roll ?? 0,
  }));
  // Keine Sortierung: CAMERA_KEYS steht chronologisch. Innerhalb eines Shots wird die Zeit streng steigend erzwungen.
  const groups = [];
  for (const k of resolved) {
    if (!groups.length || k.cut) groups.push([]);
    const g = groups[groups.length - 1];
    if (g.length && k.t <= g[g.length - 1].t) k.t = g[g.length - 1].t + 1e-4;
    g.push(k);
  }
  return groups.map((ks) => {
    const shot = { keys: ks, t0: ks[0].t, t1: ks[ks.length - 1].t };
    const ts = ks.map((k) => k.t);
    if (ks.length > 1) {
      shot.posCurve = new THREE.CatmullRomCurve3(ks.map((k) => k.pos), false, 'centripetal');
      shot.lookCurve = new THREE.CatmullRomCurve3(ks.map((k) => k.look), false, 'centripetal');
      shot.sPos = monotone(ts, arcFractions(shot.posCurve, ks.length));
      shot.sLook = monotone(ts, arcFractions(shot.lookCurve, ks.length));
    }
    shot.fov = monotone(ts, ks.map((k) => k.fov));
    shot.roll = monotone(ts, ks.map((k) => k.roll));
    return shot;
  });
}

/* ---------------------------------------------------------- Director */
export class Director {
  /**
   * @param {object} o
   * @param {HTMLElement} [o.story]  Wrapper der Szenen-Abschnitte (ohne: Nominalwerte, dev.html)
   * @param {number} [o.lambda]      Daempfung des Fortschritts (hoeher = direkter)
   */
  constructor({ story = null, lambda = 4.2 } = {}) {
    this.story = story;
    this.lambda = lambda;
    this.target = 0;     // roher Fortschritt aus dem Scroll
    this.global = 0;     // gedaempfter Fortschritt (fuer 3D)
    this.velocity = 0;   // d(global)/dt
    this.portrait = false;
    this.aspect = 16 / 9;
    this.cutFade = 0;
    // Inhaltsbereich 0..1 (setzt main.js, gedaempft): der Hintergrund wechselt dort zur Farbwelt "inhalt"
    this.content = 0;
    // Bildverschiebung (Lens-Shift) als Anteil der Bildbreite: haelt das Motiv neben dem Text-Panel frei,
    // wenn das Seitenverhaeltnis vom Entwurf (1440 x 900) abweicht. + = Motiv nach rechts.
    this.shift = 0;
    this._shiftTarget = 0;
    this._clear = {};
    this._rects = {};
    // Abdunkeln hinter dem Text im Bild (FxPass): Mitte und halbe Groesse in UV (y oben), Staerke 0..1
    this.scrim = { x: 0.25, y: 0.5, rx: 0.2, ry: 0.2, a: 0 };
    this.current = BEATS[0].name; // Beat mit hoechstem Gewicht
    this.beats = {};
    this.modules = {};
    this.sections = {};
    this.listeners = new Set();
    this.panelListeners = new Set();
    this._dom = new Map();
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._fov = 35;
    this._roll = 0;
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._v3 = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    for (const b of BEATS) this.beats[b.name] = { name: b.name, label: b.label, len: b.len, start: 0, end: 1, p: 0, w: 0, tp: 0 };
    for (const name of Object.keys(MODULES)) this.modules[name] = { name, local: 0, weight: 0, active: false, windows: [] };
    this._moduleList = Object.values(this.modules); // pro Frame ohne neues Array durchlaufen
    if (story) {
      for (const b of BEATS) {
        const el = story.querySelector(`[data-scene="${b.name}"]`);
        if (el) {
          el.style.setProperty('--len', b.len);
          this.sections[b.name] = el;
        }
      }
    }
    this.refresh();
  }

  /** Zeitfenster neu messen (nach Resize, Schriften, ScrollTrigger.refresh) */
  refresh() {
    let windows;
    // Scrollweg in vh fuer global 0..1 (fuer die Tempo-Grenze)
    this._vhPerG = 1;
    if (this.story && Object.keys(this.sections).length === BEATS.length) {
      const vh = window.innerHeight;
      const storyTop = this.story.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(1, this.story.offsetHeight - vh);
      this._vhPerG = (range / Math.max(1, vh)) * 100;
      windows = {};
      // Beats liegen lueckenlos aneinander: Ende = Start des naechsten (keine Rundungsfehler an den Grenzen)
      const tops = BEATS.map((b) => this.sections[b.name].getBoundingClientRect().top + window.scrollY - storyTop);
      BEATS.forEach((b, i) => {
        const h = this.sections[b.name].getBoundingClientRect().height;
        const start = clamp01(tops[i] / range);
        const end = i === BEATS.length - 1 ? 1 : clamp01(tops[i + 1] / range);
        windows[b.name] = { start, end, pinOut: clamp01((h - vh) / Math.max(1, h)) };
      });
    } else {
      windows = nominalBeatWindows();
      this._vhPerG = BEATS.reduce((s, b) => s + b.len, 0) - 100;
      for (const b of BEATS) windows[b.name].pinOut = clamp01((b.len - 100) / b.len);
    }
    for (const b of BEATS) Object.assign(this.beats[b.name], windows[b.name]);
    this._windows = windows;
    this._measureClearance();
    this._shotsL = buildShots(CAMERA_KEYS, windows, false);
    this._shotsP = buildShots(CAMERA_KEYS, windows, true);
    this.cuts = this._shotsL.slice(1).map((s) => s.t0);
    const atCut = (t) => this.cuts.some((c) => Math.abs(c - t) < 1e-3);
    for (const [name, def] of Object.entries(MODULES)) {
      this.modules[name].windows = def.windows.map((w) => {
        const start = resolveAt(w.from, windows);
        const end = resolveAt(w.to, windows);
        return { start, end, hardStart: atCut(start), hardEnd: atCut(end) };
      });
    }
    this._tempo = TEMPO ? { a: resolveAt(TEMPO.from, windows), b: resolveAt(TEMPO.to, windows) } : null;
    this.update(0);
  }

  /**
   * ScrollTrigger mit scrub: ein Proxy-Wert laeuft 0..1 ueber die ganze Story.
   * scrub: true = direkt (die Daempfung macht update()), Zahl = zusaetzliche GSAP-Glaettung in Sekunden.
   */
  bindScroll(gsap, ScrollTrigger, { scrub = true } = {}) {
    if (!this.story) return;
    this._proxy = { p: 0 };
    this._tween = gsap.to(this._proxy, {
      p: 1,
      ease: 'none',
      scrollTrigger: { trigger: this.story, start: 'top top', end: 'bottom bottom', scrub, invalidateOnRefresh: true },
    });
    this._onRefresh = () => this.refresh();
    ScrollTrigger.addEventListener('refresh', this._onRefresh);
    this.refresh();
    this.setTarget(this._tween.scrollTrigger.progress, true);
  }

  /** Scroll-Fortschritt uebernehmen (in jedem Frame vor update) */
  pullScroll() {
    if (this._proxy) this.target = clamp01(this._proxy.p);
  }

  /** resetDom: CSS-Variablen und Klassen der Abschnitte entfernen (Wechsel auf den statischen Fallback) */
  dispose(resetDom = false) {
    if (this._tween) { this._tween.scrollTrigger.kill(); this._tween.kill(); this._tween = null; }
    if (this._onRefresh && window.ScrollTrigger) window.ScrollTrigger.removeEventListener('refresh', this._onRefresh);
    this._proxy = null;
    this.listeners.clear();
    this.panelListeners.clear();
    if (resetDom) {
      for (const el of Object.values(this.sections)) {
        for (const k of ['--len', '--o', '--p']) el.style.removeProperty(k);
        el.classList.remove('is-on');
      }
      this._dom.clear();
      this.story = null;
    }
  }

  setAspect(aspect) {
    this.aspect = aspect;
    this.portrait = aspect < PORTRAIT.below;
  }

  /** Ziel setzen (ScrollTrigger oder dev.html). immediate: ohne Daempfung springen */
  setTarget(p, immediate = false) {
    this.target = clamp01(p);
    if (immediate) this.global = this.target;
  }

  beat(name) { return this.beats[name]; }
  module(name) { return this.modules[name]; }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  /** fn(sectionEl, on, beatName): Text-Panel eines Abschnitts wird sichtbar (on) oder ist ganz ausgeblendet */
  onPanel(fn) { this.panelListeners.add(fn); return () => this.panelListeners.delete(fn); }

  update(dt) {
    const prev = this.global;
    const diff = this.target - this.global;
    // Sprung des Ziels in einem Bild (Ueberspringen, Anker, Tastatur Pos1/Ende): ohne Tempo-Grenze nachziehen
    const lastT = this._lastTarget === undefined ? this.target : this._lastTarget;
    if (TEMPO && Math.abs(this.target - lastT) > TEMPO.jump) this._free = true;
    // Ziel am Ende oder am Anfang der Geschichte (Ueberspringen mit weichem Scrollen, Pos1): ebenfalls ohne Grenze
    if (this.target >= 0.999 || this.target <= 0.001) this._free = true;
    this._lastTarget = this.target;
    let next;
    if (Math.abs(diff) < 1e-5) next = this.target;
    else next = damp(this.global, this.target, this.lambda * (Math.abs(diff) > 0.12 ? 1.8 : 1), dt);
    if (this._free && Math.abs(this.target - next) < 0.004) this._free = false;
    next = this._limitTempo(prev, next, dt);
    this.global = next;
    this.velocity = dt > 0 ? (this.global - prev) / dt : 0;
    this.shift = damp(this.shift, this.portrait ? 0 : this._shiftTarget, 3.2, dt > 0 ? dt : 1);
    const g = this.global;

    // Beats
    let best = this.current;
    let bestW = -1;
    for (const b of BEATS) {
      const s = this.beats[b.name];
      const span = Math.max(1e-6, s.end - s.start);
      s.p = clamp01((g - s.start) / span);
      s.tp = clamp01((this.target - s.start) / span);
      s.w = windowWeight(g, s.start, s.end, BEAT_FADE);
      const wt = windowWeight(this.target, s.start, s.end, 1e-4);
      if (wt > bestW) { bestW = wt; best = b.name; }
    }
    if (best !== this.current) {
      this.current = best;
      for (const fn of this.listeners) fn(best, this);
    }

    // Module
    for (const m of this._moduleList) {
      let weight = 0;
      for (const w of m.windows) weight = Math.max(weight, windowWeight(g, w.start, w.end, MODULE_FADE, w.hardStart, w.hardEnd));
      const w0 = m.windows[0];
      m.local = w0 ? clamp01((g - w0.start) / Math.max(1e-6, w0.end - w0.start)) : 0;
      m.weight = weight;
      m.active = weight > 1e-4;
    }

    // Kamerapfad
    const shots = this.portrait ? this._shotsP : this._shotsL;
    let shot = shots[0];
    for (const s of shots) if (g >= s.t0) shot = s;
    const gc = Math.min(Math.max(g, shot.t0), shot.t1);
    if (shot.posCurve) {
      shot.posCurve.getPointAt(clamp01(shot.sPos(gc)), this._pos);
      shot.lookCurve.getPointAt(clamp01(shot.sLook(gc)), this._look);
    } else {
      this._pos.copy(shot.keys[0].pos);
      this._look.copy(shot.keys[0].look);
    }
    this._fov = shot.fov(gc);
    this._roll = shot.roll(gc);
    let fade = 0;
    for (const t of this.cuts) fade = Math.max(fade, 1 - smoothstep(0, CUT_FADE, Math.abs(g - t)));
    this.cutFade = fade;

    this._writeDom();
    return this;
  }

  /**
   * Tempo-Grenze (config TEMPO): im Fenster a..b bewegt sich global hoechstens mit vhPerSec Scrollweg pro Sekunde.
   * Ausserhalb des Fensters frei bis an den Rand, danach begrenzt. Liegt das Ziel schon hinter dem Fenster,
   * holt die Szene mit catchUp mal dem Tempo auf. Nach einem Sprung (this._free) gilt keine Grenze.
   */
  _limitTempo(prev, next, dt) {
    const lim = this._tempo;
    if (!lim || this._free || !(dt > 0) || next === prev) return next;
    const fwd = next > prev;
    const beyond = fwd ? this.target > lim.b + 0.01 : this.target < lim.a - 0.01;
    const step = (TEMPO.vhPerSec / Math.max(1, this._vhPerG)) * (beyond ? TEMPO.catchUp : 1) * dt;
    if (fwd) {
      if (prev >= lim.b || next <= lim.a) return next;
      return Math.min(next, Math.max(prev, lim.a) + step);
    }
    if (prev <= lim.a || next >= lim.b) return next;
    return Math.max(next, Math.min(prev, lim.b) - step);
  }

  /** Effektives vertikales FOV fuer das aktuelle Seitenverhaeltnis */
  fovFor(fov, aspect = this.aspect) {
    if (aspect >= PORTRAIT.refAspect) return fov;
    let k = Math.min(PORTRAIT.maxFactor, Math.pow(PORTRAIT.refAspect / aspect, PORTRAIT.exponent));
    // Hochformat (Tablet bis Handy): mindestens so weit wie bei Seitenverhaeltnis 0.59, fuer das posM/lookM abgestimmt
    // sind. Sonst waere das Bild auf Tablets enger und der Kopf stiesse oben an die Kopfzeile.
    if (aspect < PORTRAIT.below) k = Math.max(k, PORTRAIT.minPortrait);
    const half = THREE.MathUtils.degToRad(fov / 2);
    return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) * k));
  }

  /** Pfad-Pose (ohne Parallax) */
  getPose() {
    return { pos: this._pos, look: this._look, fov: this._fov, roll: this._roll };
  }

  /**
   * Kamera setzen: Pfad + Maus-Parallax + ruhiges Schweben.
   * @param {THREE.PerspectiveCamera} camera
   * @param {{sx:number, sy:number}} pointer geglaettete Maus (-1..1)
   */
  applyCamera(camera, pointer, { parallax = 0, drift = 0 } = {}, time = 0) {
    const dir = this._v1.subVectors(this._look, this._pos).normalize();
    const right = this._v2.crossVectors(dir, this._up).normalize();
    const up = this._v3.crossVectors(right, dir).normalize();
    const ox = (pointer ? pointer.sx : 0) * parallax + Math.sin(time * 0.21) * drift;
    const oy = (pointer ? pointer.sy : 0) * parallax * 0.6 + Math.sin(time * 0.17 + 1.3) * drift * 0.8;
    camera.position.copy(this._pos).addScaledVector(right, ox).addScaledVector(up, oy);
    camera.up.set(0, 1, 0);
    if (this._roll) camera.up.applyAxisAngle(dir, THREE.MathUtils.degToRad(this._roll));
    camera.lookAt(this._look);
    const fov = this.fovFor(this._fov, camera.aspect);
    // Lens-Shift ueber filmOffset: verschiebt das Bild seitlich, ohne die Perspektive zu aendern
    const off = -this.shift * camera.getFilmWidth() * camera.aspect * 2 * Math.tan(THREE.MathUtils.degToRad(fov / 2));
    if (Math.abs(camera.fov - fov) > 1e-3 || Math.abs(camera.filmOffset - off) > 1e-4) {
      camera.fov = fov;
      camera.filmOffset = off;
      camera.updateProjectionMatrix();
    }
  }

  /**
   * Wie weit muss das Motiv seitlich ausweichen, damit es nicht unter dem Text liegt?
   * Die Kamera-Keys sind fuer 1440 x 900 komponiert: Text links endet dort bei ~41 % der Breite (rechts beginnt er bei ~59 %).
   * Ist der Text relativ breiter (z. B. Tablet quer), wird die Differenz als Lens-Shift ausgeglichen.
   */
  _measureClearance() {
    this._clear = {};
    this._rects = {};
    if (!this.story || typeof window === 'undefined') return;
    const W = Math.max(1, window.innerWidth);
    const H = Math.max(1, window.innerHeight);
    for (const b of BEATS) {
      const el = this.sections[b.name];
      if (!el) continue;
      const t = el.querySelector('.chapter__text');
      if (!t) continue;
      const r = t.getBoundingClientRect();
      if (!r.width) continue;
      // Lage im klebenden Panel (unabhaengig von der aktuellen Scrollposition), in Pixeln des Viewports
      this._rects[b.name] = { x: t.offsetLeft, y: t.offsetTop, w: t.offsetWidth, h: t.offsetHeight, W, H, sec: el.offsetHeight };
      if (b.name === 'intro') continue;
      const right = el.classList.contains('chapter--right');
      const need = right ? -Math.min(0.15, Math.max(0, 0.59 - r.left / W)) : Math.min(0.15, Math.max(0, r.right / W - 0.41));
      this._clear[b.name] = need;
    }
  }

  // CSS-Variablen fuer Text-Panels: --p (Fortschritt), --o (Sichtbarkeit des Panels)
  // Sichtbarkeit pro Beat aus BEATS[].text = [ein0, ein1, aus0, aus1] (p im Beat), sonst aus der Klebedauer.
  _writeDom() {
    if (!this.story) return;
    let shiftT = 0;
    let bestO = 0;
    let bestName = null;
    let bestP = 0;
    const last = BEATS.length - 1;
    for (let i = 0; i < BEATS.length; i++) {
      const b = BEATS[i];
      const el = this.sections[b.name];
      if (!el) continue;
      const s = this.beats[b.name];
      const p = s.tp;
      // Hochformat: Panels stehen fix unten (story.css). Eigene Fenster (BEATS[].textM), sonst bleibt der Text stehen,
      // bis kurz vor dem naechsten Panel (kaum Bilder ohne Satz auf dem Handy)
      const t = this.portrait && b.textM ? b.textM : b.text;
      let fin;
      let fout;
      if (b.noText) {
        fin = 0;
        fout = 0;
      } else if (t) {
        fin = i === 0 ? 1 : smoothstep(t[0], t[1], p);
        fout = i === last && t[2] >= 1 ? 1 : 1 - smoothstep(t[2], t[3], p);
      } else {
        fin = i === 0 ? 1 : smoothstep(0.02, 0.12, p);
        // Ausblenden erst, waehrend das Panel nach oben wegscrollt (rund 40 vh): kurze Strecken ohne Text
        fout = i === last ? 1 : this.portrait ? 1 - smoothstep(0.84, 0.97, p) : 1 - smoothstep(s.pinOut - 0.06, s.pinOut + 40 / b.len, p);
      }
      const o = Math.round(fin * fout * 1000) / 1000;
      shiftT += (this._clear[b.name] || 0) * o;
      if (o > bestO) { bestO = o; bestName = b.name; bestP = p; }
      const pr = Math.round(p * 1000) / 1000;
      const cache = this._dom.get(el) || {};
      if (cache.o !== o) { el.style.setProperty('--o', o); cache.o = o; }
      if (cache.p !== pr) { el.style.setProperty('--p', pr); cache.p = pr; }
      const on = o > 0.01;
      if (cache.on !== on) {
        el.classList.toggle('is-on', on);
        cache.on = on;
        for (const fn of this.panelListeners) fn(el, on, b.name);
      }
      this._dom.set(el, cache);
    }
    this._shiftTarget = shiftT;
    this._updateScrim(bestName, bestO, bestP);
  }

  // Abdunkeln hinter dem sichtbarsten Text-Panel (Staerke aus BEATS[].scrim). Scrollt das Panel nach pinOut weg,
  // wandert die Zone mit.
  _updateScrim(name, o, p) {
    const sc = this.scrim;
    const r = name ? this._rects[name] : null;
    let def = null;
    for (let i = 0; i < BEATS.length; i++) if (BEATS[i].name === name) def = BEATS[i];
    if (!r || !def || o <= 0.001) { sc.a = 0; return; }
    const s = this.beats[name];
    // Panels stehen fix (Version 4, ausser Hero und Ausklang; im Hochformat auch der Hero): die Zone wandert nicht mit.
    // Hero und Ausklang scrollen (Hero sofort, Ausklang nach der Klebedauer), die Zone wandert mit.
    const fixed = name !== 'outro' && (this.portrait || name !== 'intro');
    const up = fixed ? 0 : Math.max(0, p - s.pinOut) * r.sec;
    const padX = r.w * 0.08;
    const padY = r.h * 0.12;
    sc.x = (r.x + r.w / 2) / r.W;
    sc.y = 1 - (r.y - up + r.h / 2) / r.H;
    sc.rx = (r.w / 2 + padX) / r.W;
    sc.ry = (r.h / 2 + padY) / r.H;
    sc.a = o * (def.scrim ?? 0.45);
    // Hochformat: der Text steht dort auf einer eigenen, fast deckenden Flaeche. Ein voller Scrim reichte bis ueber
    // den Kopf oben im Bild (Ausklang: graues, flaues Gesicht), darum halb, im Ausklang gar nicht (Runde 2)
    if (this.portrait) sc.a *= name === 'outro' ? 0 : 0.5;
  }
}
