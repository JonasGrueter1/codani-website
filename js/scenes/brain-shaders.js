// Szene "brain": Shader und Materialien. Alle Bewegung laeuft hier auf der GPU, die CPU setzt nur Uniforms.

/* Gemeinsame Funktionen: Enthuellung von vorne nach hinten, Erregungswellen, Nebel */
const COMMON = /* glsl */ `
uniform float uTime;
uniform vec2 uResolution;
uniform float uAlpha;
uniform float uReveal;
uniform float uAct;
uniform float uFog;
uniform float uArrScale;
uniform vec4 uClock0;
uniform vec4 uClock1;
uniform vec4 uAmp0;
uniform vec4 uAmp1;
uniform vec4 uReach0;
uniform vec4 uReach1;
uniform float uNetBase; // Grundhelligkeit des Netzes (von aussen gedaempft, damit die Rinde lesbar bleibt)
uniform float uInside;  // 1 = Kamera im Gehirn: Tiefe staerker betonen

// Tiefenstaffelung im Inneren: Fernes tritt zurueck
float depthAtt(float depth) {
  return mix(1.0, mix(1.0, 0.4, smoothstep(0.3, 1.25, depth)), uInside);
}

// Sichtbarkeit beim Eintauchen: vorne (Gesicht, z = +0.7) zuerst, dann nach hinten. birth = kurzes Aufleuchten.
float revealMask(vec3 p, float seed, out float birth) {
  float ff = clamp(0.5 - p.z * 0.72, 0.0, 1.0);
  float th = 0.72 * ff + 0.22 * seed;
  float r = uReveal * 1.2;
  float m = smoothstep(th, th + 0.05, r);
  birth = m * (1.0 - smoothstep(th + 0.04, th + 0.2, r));
  return m;
}

// Erregungswellen: 8 Ausloeser, Ankunftszeit pro Element (normiert). Kopf (Gauss) plus Nachleuchten.
float cascade(vec4 a0, vec4 a1, float headK, float trailK, float trailAmt) {
  a0 *= uArrScale;
  a1 *= uArrScale;
  vec4 x0 = uClock0 - a0;
  vec4 x1 = uClock1 - a1;
  vec4 g0 = (1.0 - smoothstep(uReach0 * 0.5, uReach0, a0)) * uAmp0;
  vec4 g1 = (1.0 - smoothstep(uReach1 * 0.5, uReach1, a1)) * uAmp1;
  // Kopf und Nachleuchten als Polynome (wie Gauss bzw. Exponentialabfall, aber ohne exp: guenstig auf schwachen GPUs)
  vec4 h0 = max(1.0 - x0 * x0 * (headK * 0.33), 0.0);
  vec4 h1 = max(1.0 - x1 * x1 * (headK * 0.33), 0.0);
  vec4 t0 = max(1.0 - max(x0, 0.0) * (trailK * 0.25), 0.0);
  vec4 t1 = max(1.0 - max(x1, 0.0) * (trailK * 0.25), 0.0);
  t0 *= t0; t0 *= t0 * step(0.0, x0);
  t1 *= t1; t1 *= t1 * step(0.0, x1);
  vec4 p0 = h0 * h0 * h0 + trailAmt * t0;
  vec4 p1 = h1 * h1 * h1 + trailAmt * t1;
  return dot(p0, g0) + dot(p1, g1);
}

float fogF(float depth) {
  float f = uFog * depth;
  return exp(-f * f);
}

// Pixelgroesse eines Punktes mit Weltgroesse s (perspektivisch korrekt)
float pxSize(float s, float depth) {
  return s * projectionMatrix[1][1] * uResolution.y * 0.5 / max(depth, 1e-3);
}
`;

/* ------------------------------------------------------------ Rinde */
const CORTEX_VS = /* glsl */ `
${COMMON}
attribute vec4 aMeta;   // h (Windung), seed, Region (0 Grosshirn, 0.5 Kleinhirn, 1 Stamm), Tiefe/Parameter
attribute vec4 aArr0;
attribute vec4 aArr1;
uniform float uSize;
uniform vec3 uLightDir;
uniform vec3 uGyrus;
uniform vec3 uSulcus;
uniform vec3 uWave;
uniform vec3 uBirth;
varying vec3 vCol;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  float h = aMeta.x;
  float seed = aMeta.y;
  vec3 n = normalize(normalMatrix * normal);
  vec3 v = normalize(-mv.xyz);
  float ndv = dot(n, v);
  float rim = 1.0 - abs(ndv);
  float facing = mix(0.15, 1.0, smoothstep(-0.25, 0.3, ndv));
  float birth;
  float rev = revealMask(position, seed, birth);
  float wave = cascade(aArr0, aArr1, 9.0, 2.4, 0.4) * uAct;
  float shimmer = 0.8 + 0.2 * sin(uTime * (0.4 + seed * 0.9) + seed * 53.0);
  float region = aMeta.z;
  // Relief: Licht von oben vorne (Weltraum, die Gruppe ist nicht gedreht), Furchen dunkler, Kanten leuchten
  float wrap = 0.5 + 0.5 * dot(normal, uLightDir);
  float lit = 0.04 + 0.62 * wrap * wrap;
  float b = (lit * (0.4 + 0.6 * h) * shimmer + 0.07 * rim * rim * rim) * facing;
  b *= mix(1.0, 0.85, step(0.25, region));
  vec3 col = mix(uSulcus, uGyrus, wrap) * b;
  col += uWave * wave * (0.2 + 0.8 * h) * facing;
  col += uBirth * birth;
  vCol = col;
  float px = pxSize(uSize * (0.65 + 0.7 * seed) * (1.0 + 0.35 * min(wave, 1.5)), depth);
  float cover = 1.0;
  if (px < 1.5) { cover = px * px / 2.25; px = 1.5; }
  cover *= min(1.0, 9.0 / px);
  gl_PointSize = min(px, 64.0);
  vA = uAlpha * rev * cover * smoothstep(0.035, 0.16, depth) * fogF(depth);
  if (vA < 0.003) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // unsichtbar: keine Fragmente erzeugen
}
`;

const POINT_FS = /* glsl */ `
varying vec3 vCol;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d2 = dot(c, c) * 4.0;
  float m = exp(-d2 * 3.2) * (1.0 - smoothstep(0.7, 1.0, d2));
  float a = m * vA;
  if (a < 0.002) discard;
  gl_FragColor = vec4(vCol, a);
}
`;

/* ------------------------------------------------------------ Nervenzellen */
const NEURON_VS = /* glsl */ `
${COMMON}
attribute vec4 aMeta;   // Groesse, warm, seed, Art
attribute vec4 aArr0;
attribute vec4 aArr1;
uniform vec3 uCore;
uniform vec3 uHot;
uniform vec3 uWarmHot;
uniform vec2 uPointer;
uniform float uPointerAmt;
uniform float uAspect;
varying vec3 vCol;
varying float vA;
varying float vHot;
varying float vBig;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  float seed = aMeta.z;
  float birth;
  float rev = revealMask(position, seed, birth);
  float fire = cascade(aArr0, aArr1, 60.0, 5.0, 0.35) * uAct;
  float tw = 0.5 + 0.5 * sin(uTime * (0.6 + seed * 1.8) + seed * 61.0);
  vec2 ndc = gl_Position.xy / max(gl_Position.w, 1e-3);
  vec2 dp = (ndc - uPointer) * vec2(uAspect, 1.0);
  float pn = exp(-dot(dp, dp) * 10.0) * uPointerAmt;
  float hot = fire + 0.35 * pn * (0.4 + 0.6 * tw) + 0.45 * birth;
  vec3 hotCol = mix(uHot, uWarmHot, aMeta.y);
  float hubK = smoothstep(0.019, 0.022, aMeta.x); // Hub: heller, langsames Atmen
  vec3 col = uCore * (0.2 + 0.4 * tw + hubK * (0.9 + 0.5 * sin(uTime * 0.9 + seed * 20.0))) * uNetBase;
  col = mix(col, hotCol, clamp(hot, 0.0, 1.0)) + hotCol * max(hot - 1.0, 0.0) * 0.4;
  vCol = col;
  vHot = clamp(hot, 0.0, 1.0);
  float px = pxSize(aMeta.x * (1.0 + 0.8 * min(hot, 1.5)), depth);
  float cover = 1.0;
  if (px < 2.0) { cover = px * px / 4.0; px = 2.0; }
  cover *= min(1.0, 14.0 / px);
  vBig = smoothstep(14.0, 56.0, px); // nahe Zellen: weiche Scheibe ohne grossen Hof
  gl_PointSize = min(px, 64.0);
  vA = uAlpha * rev * cover * smoothstep(0.03, 0.12, depth) * fogF(depth) * depthAtt(depth);
  if (vA < 0.003) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const NEURON_FS = /* glsl */ `
varying vec3 vCol;
varying float vA;
varying float vHot;
varying float vBig;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d2 = dot(c, c) * 4.0;
  float core = exp(-d2 * mix(26.0, 6.0, vBig));
  float halo = exp(-d2 * 4.5) * (0.28 + 0.3 * vHot) * (1.0 - 0.75 * vBig);
  float m = (core * (1.2 + 1.5 * vHot) + halo) * (1.0 - smoothstep(0.8, 1.0, d2));
  float a = m * vA;
  if (a < 0.002) discard;
  gl_FragColor = vec4(vCol, a);
}
`;

/* ------------------------------------------------------------ Verbindungen und Fasern (Baender in Bildschirmbreite) */
const RIBBON_VS = /* glsl */ `
${COMMON}
attribute vec3 aA;
attribute vec3 aB;
attribute vec4 aMeta;
#ifdef EDGES
attribute vec4 aArA0;
attribute vec4 aArA1;
attribute vec4 aArB0;
attribute vec4 aArB1;
varying vec4 vArr0;
varying vec4 vArr1;
varying float vBirth;
varying float vHasC;
#endif
uniform float uWidth;
uniform float uNearClip;
uniform vec2 uNearFade; // Ausblenden nahe der Kamera (von, bis)
varying float vT;
varying float vSidePx;
varying float vHalfPx;
varying float vA;
varying vec4 vMeta;
void main() {
  vMeta = aMeta;
  vT = 0.0; vSidePx = 0.0; vHalfPx = 1.0; vA = 0.0;
#ifdef EDGES
  vArr0 = vec4(1.0); vArr1 = vec4(1.0); vBirth = 0.0;
  // Liegt dieses Stueck auf keinem Ausbreitungsbaum, spart der Fragment-Shader die Wellenrechnung
  vec4 mn = min(min(aArA0, aArA1), min(aArB0, aArB1));
  vHasC = step(min(min(mn.x, mn.y), min(mn.z, mn.w)), 0.999);
#endif
  vec4 a = modelViewMatrix * vec4(aA, 1.0);
  vec4 b = modelViewMatrix * vec4(aB, 1.0);
  float nz = -uNearClip;
  if (a.z > nz && b.z > nz) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  // Ganzes Band verwerfen, wenn es an beiden Enden unsichtbar ist (noch nicht enthuellt, zu nah, im Nebel).
  // Gleiche Rechnung in allen 4 Ecken, darum bleibt das Viereck heil.
  float bA; float bB;
  float visA = revealMask(aA, aMeta.x, bA) * smoothstep(uNearFade.x, uNearFade.y, -a.z) * fogF(-a.z);
  float visB = revealMask(aB, aMeta.x, bB) * smoothstep(uNearFade.x, uNearFade.y, -b.z) * fogF(-b.z);
  if (max(visA, visB) * uAlpha < 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float ta = 0.0;
  float tb = 1.0;
  if (a.z > nz) { float k = (nz - a.z) / (b.z - a.z); a = mix(a, b, k); ta = k; }
  else if (b.z > nz) { float k = (nz - b.z) / (a.z - b.z); b = mix(b, a, k); tb = 1.0 - k; }
  vec4 ca = projectionMatrix * a;
  vec4 cb = projectionMatrix * b;
  vec2 hr = uResolution * 0.5;
  vec2 sa = ca.xy / ca.w * hr;
  vec2 sb = cb.xy / cb.w * hr;
  vec2 d = sb - sa;
  float L = length(d);
  d = L > 1e-4 ? d / L : vec2(1.0, 0.0);
  vec2 nrm = vec2(-d.y, d.x);
  float t = position.x;
  vec4 c = mix(ca, cb, t);
  float depth = c.w;
  float wpx = uWidth * projectionMatrix[1][1] * hr.y / max(depth, 1e-3);
  float px = clamp(wpx, 1.0, 9.0); // breite nahe Baender begrenzen (Fuellrate), Energie unten ueber wpx
  float cover = min(wpx, 1.0);
  float halfW = px * 0.5 + 0.6;
  vec2 off = nrm * position.y * halfW + d * (t * 2.0 - 1.0) * 0.5;
  c.xy += off / hr * c.w;
  gl_Position = c;
  vSidePx = position.y * halfW;
  vHalfPx = px * 0.5;
  float tt = mix(ta, tb, t);
  vT = mix(aMeta.z, aMeta.w, tt);
  vec3 lp = mix(aA, aB, tt);
  float birth;
  float rev = revealMask(lp, aMeta.x, birth);
  vA = uAlpha * rev * cover * min(1.0, 3.0 / wpx) * smoothstep(uNearFade.x, uNearFade.y, depth) * fogF(depth) * depthAtt(depth);
#ifdef EDGES
  vArr0 = mix(aArA0, aArB0, tt);
  vArr1 = mix(aArA1, aArB1, tt);
  vBirth = birth;
#endif
}
`;

const RIBBON_FS = /* glsl */ `
uniform float uTime;
uniform float uAct;
uniform float uArrScale;
uniform vec4 uClock0;
uniform vec4 uClock1;
uniform vec4 uAmp0;
uniform vec4 uAmp1;
uniform vec4 uReach0;
uniform vec4 uReach1;
uniform vec3 uLine;
uniform vec3 uHot;
uniform vec3 uWarmHot;
uniform float uFlow;
uniform float uNetBase;
varying float vT;
varying float vSidePx;
varying float vHalfPx;
varying float vA;
varying vec4 vMeta;
#ifdef EDGES
varying vec4 vArr0;
varying vec4 vArr1;
varying float vBirth;
varying float vHasC;
float cascadeF(vec4 a0, vec4 a1, float headK, float trailK, float trailAmt) {
  a0 *= uArrScale;
  a1 *= uArrScale;
  vec4 x0 = uClock0 - a0;
  vec4 x1 = uClock1 - a1;
  vec4 g0 = (1.0 - smoothstep(uReach0 * 0.5, uReach0, a0)) * uAmp0;
  vec4 g1 = (1.0 - smoothstep(uReach1 * 0.5, uReach1, a1)) * uAmp1;
  // Kopf und Nachleuchten als Polynome (wie Gauss bzw. Exponentialabfall, aber ohne exp: guenstig auf schwachen GPUs)
  vec4 h0 = max(1.0 - x0 * x0 * (headK * 0.33), 0.0);
  vec4 h1 = max(1.0 - x1 * x1 * (headK * 0.33), 0.0);
  vec4 t0 = max(1.0 - max(x0, 0.0) * (trailK * 0.25), 0.0);
  vec4 t1 = max(1.0 - max(x1, 0.0) * (trailK * 0.25), 0.0);
  t0 *= t0; t0 *= t0 * step(0.0, x0);
  t1 *= t1; t1 *= t1 * step(0.0, x1);
  vec4 p0 = h0 * h0 * h0 + trailAmt * t0;
  vec4 p1 = h1 * h1 * h1 + trailAmt * t1;
  return dot(p0, g0) + dot(p1, g1);
}
#endif
void main() {
  float ax = abs(vSidePx);
  float edge = clamp(vHalfPx + 0.5 - ax, 0.0, 1.0);
  float prof = exp(-(ax * ax) / max(vHalfPx * vHalfPx, 0.25) * 1.1);
  float m = edge * mix(1.0, prof, smoothstep(1.0, 3.0, vHalfPx));
  float a = m * vA;
  if (a < 0.002) discard;
  float s = vMeta.x;
#ifdef EDGES
  float fire = vHasC > 0.5 ? cascadeF(vArr0, vArr1, 700.0, 5.0, 0.3) * uAct : 0.0;
  // spontane Einzelfunken
  float ph = fract(uTime * (0.06 + 0.1 * s) + s * 13.7) * 3.0 - 1.0;
  float sp = exp(-pow((ph - vT) * 14.0, 2.0)) * step(0.8, fract(s * 7.31)) * uAct;
  vec3 hot = mix(uHot, uWarmHot, vMeta.y);
  vec3 col = uLine * (0.6 + 0.4 * sin(uTime * 0.6 + s * 21.0)) * uNetBase + hot * (fire + 0.4 * sp + 0.12 * vBirth);
#else
  // Faserbahnen: Lichtpakete wandern Richtung Hirnstamm (t = 1)
  float type = vMeta.y;
  float proj = 1.0 - step(0.25, type);
  float ph = fract(vT * 1.6 - uTime * (0.16 + 0.12 * s) + s * 9.13);
  float dash = exp(-pow((ph - 0.5) * 13.0, 2.0));
  float conv = 1.0 + 0.3 * proj * smoothstep(0.55, 1.0, vT);
  vec3 col = uLine * conv + uHot * dash * uFlow * conv;
#endif
  gl_FragColor = vec4(col, a);
}
`;

/* ------------------------------------------------------------ Lichtflecken */
const GLOW_VS = /* glsl */ `
uniform float uAlpha;
uniform float uFog;
uniform vec4 uGlow[12];
attribute vec4 aGlow;   // Mitte xyz, Groesse
attribute float aIdx;
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(aGlow.xyz, 1.0);
  float size = aGlow.w;
  float depth = -mv.z;
  mv.xy += position.xy * size;
  gl_Position = projectionMatrix * mv;
  vUv = position.xy;
  vCol = uGlow[int(aIdx + 0.5)].rgb;
  float f = uFog * depth;
  vA = uAlpha * smoothstep(max(size * 1.2, 0.55), max(size * 3.5, 1.3), depth) * exp(-f * f);
}
`;

const GLOW_FS = /* glsl */ `
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
void main() {
  float r2 = dot(vUv, vUv);
  float m = exp(-r2 * 4.5) * (1.0 - smoothstep(0.6, 1.0, r2));
  float a = m * vA;
  if (a < 0.002) discard;
  gl_FragColor = vec4(vCol, a);
}
`;

/* ------------------------------------------------------------ Schwebeteilchen */
const DUST_VS = /* glsl */ `
${COMMON}
attribute vec4 aMeta;   // Groesse, warm, seed, Phase
uniform vec3 uDust;
uniform vec3 uDustWarm;
varying vec3 vCol;
varying float vA;
void main() {
  vec3 p = position;
  float ph = aMeta.w;
  p += vec3(sin(uTime * 0.13 + ph), sin(uTime * 0.11 + ph * 1.7), cos(uTime * 0.09 + ph * 2.3)) * 0.025;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  float tw = 0.55 + 0.45 * sin(uTime * (0.5 + aMeta.z) + ph * 3.0);
  vCol = mix(uDust, uDustWarm, aMeta.y) * tw;
  float px = pxSize(aMeta.x, depth);
  float cover = 1.0;
  if (px < 1.5) { cover = px * px / 2.25; px = 1.5; }
  cover *= min(1.0, 14.0 / px);
  gl_PointSize = min(px, 64.0);
  vA = uAlpha * uReveal * cover * smoothstep(0.04, 0.2, depth) * fogF(depth);
  if (vA < 0.003) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

/* ------------------------------------------------------------ Fabrik */
export function makeMaterials(THREE, U, palette) {
  const base = {
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  };
  const sig = palette.signal;
  const cortex = new THREE.ShaderMaterial({
    ...base,
    uniforms: {
      ...U,
      uSize: { value: 0.0042 },
      uLightDir: { value: new THREE.Vector3(0.35, 0.75, 0.55).normalize() },
      uGyrus: { value: sig.clone().lerp(palette.ice, 0.3).multiplyScalar(1.45) },
      uSulcus: { value: sig.clone().lerp(palette.steel, 0.5).multiplyScalar(1.0) },
      uWave: { value: sig.clone().lerp(palette.ice, 0.4).multiplyScalar(0.4) },
      uBirth: { value: palette.ice.clone().multiplyScalar(0.35) },
    },
    vertexShader: CORTEX_VS,
    fragmentShader: POINT_FS,
  });
  const neurons = new THREE.ShaderMaterial({
    ...base,
    uniforms: {
      ...U,
      uCore: { value: sig.clone().multiplyScalar(0.7) },
      uHot: { value: palette.ice.clone().multiplyScalar(2.6) },
      uWarmHot: { value: palette.ember.clone().multiplyScalar(2.6) },
    },
    vertexShader: NEURON_VS,
    fragmentShader: NEURON_FS,
  });
  const edges = new THREE.ShaderMaterial({
    ...base,
    defines: { EDGES: '' },
    uniforms: {
      ...U,
      uWidth: { value: 0.0018 },
      uNearFade: { value: new THREE.Vector2(0.05, 0.22) },
      uLine: { value: sig.clone().multiplyScalar(0.085) },
      uHot: { value: palette.ice.clone().multiplyScalar(3.3) },
      uWarmHot: { value: palette.ember.clone().multiplyScalar(3.3) },
    },
    vertexShader: RIBBON_VS,
    fragmentShader: RIBBON_FS,
  });
  const fibers = new THREE.ShaderMaterial({
    ...base,
    uniforms: {
      ...U,
      uWidth: { value: 0.0014 },
      uNearFade: { value: new THREE.Vector2(0.1, 0.38) },
      uLine: { value: sig.clone().lerp(palette.mist, 0.3).multiplyScalar(0.022) },
      uHot: { value: sig.clone().lerp(palette.ice, 0.5).multiplyScalar(0.7) },
      uWarmHot: { value: palette.ember.clone().multiplyScalar(2) },
    },
    vertexShader: RIBBON_VS,
    fragmentShader: RIBBON_FS,
  });
  const glows = new THREE.ShaderMaterial({
    ...base,
    uniforms: { uAlpha: U.uAlpha, uFog: U.uFog, uGlow: U.uGlow },
    vertexShader: GLOW_VS,
    fragmentShader: GLOW_FS,
  });
  const dust = new THREE.ShaderMaterial({
    ...base,
    uniforms: {
      ...U,
      uDust: { value: sig.clone().lerp(palette.mist, 0.5).multiplyScalar(0.55) },
      uDustWarm: { value: palette.ember.clone().multiplyScalar(0.9) },
    },
    vertexShader: DUST_VS,
    fragmentShader: POINT_FS,
  });
  return { cortex, neurons, edges, fibers, glows, dust };
}
