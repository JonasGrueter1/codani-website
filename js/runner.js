// Gemeinsamer Ablauf fuer index.html und dev.html: Szenen laden, pro Frame aktivieren,
// updaten, Looks mischen. So verhaelt sich eine Szene in dev.html genau wie auf der Seite.
import * as THREE from 'three';
import { blendLook } from './engine.js';
import { PALETTE, ANCHORS, BASE_LOOK, BASE_LOOK_HELL, LOOK_KEYS, THEME_LOOK_KEYS } from './config.js';
import { THEME, themeUniforms, patchScene, setSceneTheme } from './theme.js';

const THEMED = new Set(THEME_LOOK_KEYS);

/** ctx fuer create(ctx). Felder siehe ARCHITEKTUR.md */
export function makeContext(engine, director, extra = {}) {
  return {
    THREE,
    renderer: engine.renderer,
    camera: engine.camera,
    scene: engine.scene,
    quality: engine.quality,
    tier: engine.tier,
    isMobile: engine.isMobile,
    pointer: engine.pointer,
    palette: PALETTE,
    anchors: ANCHORS,
    director,
    shared: engine.shared,
    envMap: engine.envMap,
    lights: engine.lights,
    overlay: document.getElementById('gl-overlay'),
    // Thema (Kapitel 14): theme.light lesen, themeUniforms (Tintenfarben) in eigene Shader haengen; heller Weg im
    // Shader mit #ifdef CODANI_LIGHT und material.userData.themeDefine
    theme: THEME,
    themeUniforms,
    size: engine.size,
    onResize: (fn) => engine.onResize(fn),
    time: 0,
    dev: false,
    ...extra,
  };
}

/** Module laden und erzeugen. Ein Fehler in einer Szene stoppt die anderen nicht. */
export async function loadScenes(names, ctx, onProgress = () => {}) {
  let done = 0;
  const results = await Promise.all(names.map(async (name) => {
    try {
      const mod = await import(`./scenes/${name}.js`);
      const inst = await mod.create(ctx);
      if (!inst || !inst.group || typeof inst.update !== 'function') {
        throw new Error('create() muss { group, update, setActive, dispose } liefern');
      }
      inst.group.name = inst.group.name || `scene:${name}`;
      return { name, inst, active: true, failed: false };
    } catch (err) {
      console.error(`Szene "${name}" konnte nicht geladen werden:`, err);
      return null;
    } finally {
      done += 1;
      onProgress(done / names.length);
    }
  }));
  const mods = results.filter(Boolean);
  for (const m of mods) ctx.scene.add(m.inst.group);
  // Helles Thema: additive Materialien bekommen ihren Zusatz vor dem Vorkompilieren (theme.js)
  for (const m of mods) patchScene(m.inst.group);
  return mods;
}

export class Runner {
  constructor({ director, mods }) {
    this.director = director;
    this.mods = mods;
    this.entries = mods.map(() => ({ look: null, weight: 0 }));
    this.themed = mods.map(() => ({})); // Look eines Moduls im hellen Thema (einmal angelegt, pro Bild ueberschrieben)
    this.look = blendLook([], undefined, {});
    this.force = null; // dev.html: Modulname, der immer aktiv bleibt
  }

  /** Thema umschalten: Blending der umgerechneten Materialien, Hook setTheme(light) der Szenen */
  setTheme(light) {
    THEME.light = !!light;
    for (const m of this.mods) {
      setSceneTheme(m.inst.group, THEME.light);
      if (m.inst.setTheme && !m.failed) {
        try { m.inst.setTheme(THEME.light); } catch (e) { this.fail(m, e); }
      }
    }
  }

  // Look eines Moduls fuer das aktuelle Thema. Hell: themenabhaengige Schluessel nur aus lookHell (sonst Grundwert hell)
  _lookOf(i, inst) {
    const L = inst.look || null;
    if (!THEME.light) return L;
    const H = inst.lookHell || null;
    if (!L && !H) return null;
    const t = this.themed[i];
    for (const k of LOOK_KEYS) {
      const h = H ? H[k] : undefined;
      t[k] = h !== undefined ? h : (L && !THEMED.has(k) ? L[k] : undefined);
    }
    return t;
  }

  /** Alle Gruppen sichtbar schalten (fuer warmup/Shader-Kompilierung) */
  showAll() {
    for (const m of this.mods) { m.inst.group.visible = true; m.active = true; }
  }

  setActive(m, active) {
    if (m.active === active) return;
    m.active = active;
    m.inst.group.visible = active && !m.failed;
    if (m.inst.setActive) {
      try { m.inst.setActive(active); } catch (e) { this.fail(m, e); }
    }
  }

  fail(m, e) {
    if (m.failed) return;
    m.failed = true;
    m.inst.group.visible = false;
    console.error(`Szene "${m.name}" ist im Betrieb abgestuerzt und wurde ausgeblendet:`, e);
  }

  /** Pro Frame nach director.update() und applyCamera(). Gibt den gemischten Look zurueck. */
  step(time, dt) {
    const d = this.director;
    for (let i = 0; i < this.mods.length; i++) {
      const m = this.mods[i];
      const st = d.modules[m.name];
      const active = st.active || this.force === m.name;
      this.setActive(m, active);
      const weight = st.active ? st.weight : (this.force === m.name ? 1 : 0);
      this.entries[i].weight = m.active && !m.failed ? weight : 0;
      if (m.active && !m.failed) {
        try { m.inst.update(time, dt, st.local, d.global, weight); } catch (e) { this.fail(m, e); }
      }
      // nach update: dunkel derselbe Verweis wie bisher, hell die Kopie mit den Werten dieses Bildes
      this.entries[i].look = this._lookOf(i, m.inst);
    }
    blendLook(this.entries, THEME.light ? BASE_LOOK_HELL : BASE_LOOK, this.look);
    // Schnitt (Ende Kapitel Code -> Ausklang beim Roboter): kein Schwarz, sondern ein kurzer Lichtblitz. Das fertige
    // Website-Geruest blendet auf, im Licht steht die Android-Bueste, deren Augen danach erwachen.
    // Hell: eine ruhige Blende zum Off-White (FxPass, Define FX_LIGHT), ohne Belichtung und Bloom hochzuziehen.
    const c = d.cutFade;
    if (c > 0 && THEME.light) {
      this.look.flash = Math.max(this.look.flash, c * c * (3 - 2 * c) * 0.92);
    } else if (c > 0) {
      // kurzer, heller Peak (c^3): wirkt als Lichtblitz, nicht als milchiger Schleier
      this.look.flash = Math.max(this.look.flash, c * c * c * 0.9);
      this.look.exposure *= 1 + 0.4 * c * c;
      this.look.bloom += 0.7 * c * c;
    }
    return this.look;
  }

  dispose() {
    for (const m of this.mods) {
      m.inst.group.removeFromParent();
      try { m.inst.dispose && m.inst.dispose(); } catch (e) { console.error(e); }
    }
  }
}
