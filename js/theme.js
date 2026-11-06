// Thema der 3D-Startgeschichte: dunkel (Standard) oder hell (Kapitel 14 in ARCHITEKTUR.md).
//
// Das Thema steht in html[data-theme] ("dunkel" oder "hell"). Gesetzt wird es frueh im Kopf von index.html
// (localStorage codani-theme, Test-Schalter ?hell und ?dunkel), umgeschaltet vom Knopf in der Kopfzeile (Skript im
// Layout, Ereignis "codani-theme" auf window). main.js uebernimmt den Wechsel live: altes Bild festhalten
// (engine.snapshot), Thema in Engine, Runner und Szenen umstellen, fehlende Programme kompilieren
// (engine.compileScene), dann weiche Blende im FxPass.
//
// Hell: Partikel, Linien, Kabel, Code-Zeichen und das Website-Geruest sind dunkle Tinte mit normalem Blending statt
// additivem Leuchten. Dafuer bekommt jedes additive ShaderMaterial der Szenen beim Laden einen Zusatz (patchScene),
// der NUR mit dem Define CODANI_LIGHT in den Shader kommt: main() der Szene laeuft unveraendert, danach rechnet der
// Zusatz die Farbe in Tinte um (Deckkraft aus der Leuchtkraft). Dunkel ist der Shader-Text genau der bisherige: gleiche
// Programme, gleiche Rechenarbeit pro Bildpunkt. Die hellen Programme entstehen erst, wenn jemand hell waehlt.
//
// Pro Material einstellbar (vor dem Laden in create() setzen):
//   material.userData.themeGain    Deckkraft-Faktor im hellen Thema (Standard 1.0)
//   material.userData.themeKeep    true: nicht umrechnen (bleibt additiv, z. B. Lichtkegel, der auf Hell nur aufhellt)
//   material.userData.themeInk     0..1 wie stark helle Kerne zur dunklen Tinte gehen (Standard 0.6)
//   material.userData.themeCurve   Exponent auf die Leuchtkraft (Standard 1; kleiner = schwache Punkte deutlicher,
//                                  starke Linien gleich, z. B. 0.75 fuer die Partikel-Bueste)
//   material.userData.themeDefine  true: Material hat einen eigenen hellen Weg im Shader (#ifdef CODANI_LIGHT), das
//                                  Define wird mit dem Thema gesetzt (Hintergrund, Knoten der Kabel-Szene)
import * as THREE from 'three';

export const THEME = { light: false };
export const THEME_DEFINE = 'CODANI_LIGHT';

// Farben der Tinte (sRGB-Hex wie in css/site.css, THREE.Color rechnet in linear um)
export const THEME_HEX = Object.freeze({
  ink: 0x0b1220,   // tiefe Tinte (--ink der hellen Seiten)
  teal: 0x0a6f86,  // tiefes Tuerkis (--accent der hellen Seiten)
  warm: 0xc9875a,  // Ember als helle, warme Tinte (Pruefung 1: #a14b0c wirkte auf Hell wie Rost)
  paper: 0xf3f5f7, // Off-White: Blende, Scrim, Abdunkeln im hellen Thema
});

// Gemeinsame Uniforms (ein Objekt, in jedes umgerechnete Material eingehaengt)
export const themeUniforms = {
  uThemeInk: { value: new THREE.Color(THEME_HEX.ink) },
  uThemeTeal: { value: new THREE.Color(THEME_HEX.teal) },
  uThemeWarm: { value: new THREE.Color(THEME_HEX.warm) },
};

/** true, wenn das helle Thema gewaehlt ist (html[data-theme="hell"]) */
export function readTheme() {
  return document.documentElement.getAttribute('data-theme') === 'hell';
}

// Zusatz am Ende des Fragment-Shaders (nur hell). gl_FragColor ist die additive Farbe der Szene (Alpha = Deckung):
// Leuchtkraft e = hellster Kanal x Alpha. Farbton aus der Saettigung (Cyan -> Tuerkis, Weiss und Eis -> Tinte),
// starke Kerne dunkler, Deckkraft 1 - exp(-e x Faktor). Normales Blending (SRC_ALPHA).
// Ember (Pruefung 1): ganz in die helle, warme Tinte #c9875a statt ins Dunkle gezogen und nur rund halb so deckend,
// sonst lagen rostbraune Schlieren und Flecken auf Kabeln, Gehirn und Code (wie Staub auf der Linse).
const lightTail = (gain, inkK, curve) => /* glsl */ `
uniform vec3 uThemeInk;
uniform vec3 uThemeTeal;
uniform vec3 uThemeWarm;
void main() {
  codaniSceneMain();
  vec3 c = max(gl_FragColor.rgb, vec3(0.0));
  float a = clamp(gl_FragColor.a, 0.0, 1.0);
  float m = max(max(c.r, c.g), c.b);
  float e = m * a;
  vec3 n = c / max(m, 1e-4);
  float sat = 1.0 - min(min(n.r, n.g), n.b);
  float warm = smoothstep(0.25, 0.75, clamp((n.r - n.b) * 1.25, 0.0, 1.0));
  vec3 ink = mix(uThemeInk, uThemeTeal, smoothstep(0.2, 0.8, sat));
  ink = mix(ink, uThemeInk, smoothstep(1.0, 3.5, m) * ${inkK.toFixed(3)});
  ink = mix(ink, uThemeWarm, warm);
  gl_FragColor = vec4(ink, (1.0 - exp(-${curve === 1 ? 'e' : `pow(e, ${curve.toFixed(3)})`} * ${gain.toFixed(3)})) * (1.0 - 0.5 * warm));
}
`;

const MAIN_RE = /void\s+main\s*\(\s*(void)?\s*\)/;
const listOf = (o) => (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []);

function patchMaterial(mat) {
  const ud = mat.userData;
  if (ud.themePatched || ud.themeKeep) return;
  if (!mat.isShaderMaterial || mat.isRawShaderMaterial) return;
  if (mat.blending !== THREE.AdditiveBlending) return;
  if (!MAIN_RE.test(mat.fragmentShader)) return;
  ud.themePatched = true;
  ud.themeDefine = true;
  ud.themeBlend = mat.blending;
  // Uniforms direkt ins Material (mehrere Materialien einer Szene teilen oft ein Uniform-Objekt: nur gemeinsame
  // Werte hier, Faktor, Tinten-Anteil und Kurve stehen als Konstanten im Shader-Text)
  const U = mat.uniforms;
  U.uThemeInk = themeUniforms.uThemeInk;
  U.uThemeTeal = themeUniforms.uThemeTeal;
  U.uThemeWarm = themeUniforms.uThemeWarm;
  const gain = ud.themeGain ?? 1.0;
  const inkK = ud.themeInk ?? 0.6;
  const curve = ud.themeCurve ?? 1;
  const tail = lightTail(gain, inkK, curve);
  // Der Zusatz kommt nur mit dem Define in den Shader. Der Schluessel trennt Materialien mit gleichem Shader, aber
  // anderen Werten (sonst teilten sie faelschlich ein Programm); gleiche Werte teilen weiter ein Programm.
  mat.onBeforeCompile = (shader) => {
    if (!mat.defines || mat.defines[THEME_DEFINE] === undefined) return;
    shader.fragmentShader = shader.fragmentShader.replace(MAIN_RE, 'void codaniSceneMain()') + tail;
  };
  const key = `codani-theme:${gain}:${inkK}:${curve}`;
  mat.customProgramCacheKey = () => key;
}

/** Alle additiven Materialien unter root fuer das helle Thema vorbereiten (einmal nach dem Laden der Szenen). */
export function patchScene(root) {
  const seen = new Set();
  root.traverse((o) => {
    for (const m of listOf(o)) {
      if (seen.has(m)) continue;
      seen.add(m);
      patchMaterial(m);
    }
  });
}

/**
 * Thema der Materialien unter root umstellen: Define CODANI_LIGHT setzen oder entfernen (eigenes Programm je Thema,
 * three.js behaelt beide im Cache), Blending der umgerechneten Materialien (Additiv oder Normal).
 */
export function setSceneTheme(root, light) {
  const seen = new Set();
  root.traverse((o) => {
    for (const m of listOf(o)) {
      if (seen.has(m) || !m.userData.themeDefine) continue;
      seen.add(m);
      if (!m.defines) m.defines = {};
      const has = m.defines[THEME_DEFINE] !== undefined;
      if (light !== has) {
        if (light) m.defines[THEME_DEFINE] = '';
        else delete m.defines[THEME_DEFINE];
        m.needsUpdate = true;
      }
      if (m.userData.themePatched) m.blending = light ? THREE.NormalBlending : m.userData.themeBlend;
    }
  });
}
