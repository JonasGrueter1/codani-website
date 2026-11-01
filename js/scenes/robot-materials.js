// Szene "robot": Materialien. Schale (satinierter Lack, Fugen mit Fase und hellem Grat, AO), Muskel-Gel (tuerkis, glasig,
// Innenstruktur per Parallaxe), Innenschale des Hinterkopfs (Graphit), Glas, Hologramm (Roentgen).
// Alle Teile der Bueste teilen dieselbe Verformung im Vertex-Shader: Kopf dreht ueber aHead (0..1) mit uHeadMat,
// Brustkorb und Schultern atmen ueber uBreath. Die Fugen und Oeffnungen kommen aus robot-layout.js (Ruhelage-Koordinaten).
import { LAYOUT_GLSL } from './robot-layout.js';

/* ---------------------------------------------------------------- Vertex-Teile */
export const DEFORM_PARS = /* glsl */ `
attribute float aHead;
uniform mat4 uHeadMat;
uniform float uBreath;
vec3 abBreath(vec3 p, vec3 n) {
  float ax = abs(p.x);
  float chest = smoothstep(-1.55, -2.2, p.y) * smoothstep(-3.7, -2.7, p.y) * smoothstep(-0.7, 0.25, p.z) * (1.0 - smoothstep(1.05, 1.35, ax));
  float sh = smoothstep(-1.25, -1.75, p.y) * smoothstep(0.45, 1.1, ax);
  return n * (chest * 0.011 * uBreath) + vec3(0.0, uBreath * (0.007 * sh + 0.004 * chest), 0.0);
}
vec3 abDeform(vec3 p, vec3 n, float w) {
  vec3 t = p + abBreath(p, n);
  return mix(t, (uHeadMat * vec4(t, 1.0)).xyz, w);
}
vec3 abDeformDir(vec3 d, float w) { return mix(d, mat3(uHeadMat) * d, w); }
`;

/* ------------------------------------------------------------ Schale (Physical) */
export function makeShellMaterial(THREE, U, opts) {
  const m = new THREE.MeshPhysicalMaterial({
    color: opts.color,
    roughness: opts.roughness ?? 0.34,
    metalness: 0,
    clearcoat: opts.clearcoat ?? 1.0,
    clearcoatRoughness: opts.clearcoatRoughness ?? 0.06,
    envMap: opts.envMap,
    envMapIntensity: opts.envIntensity ?? 1,
    // Runde 2: Aussen- und Innenseite als zwei Draws (erst aussen, dann innen). Die Innenseite wird so nur dort
    // schattiert, wo sie durch eine Oeffnung sichtbar ist (sonst verwirft der Tiefentest sie); vorher DoubleSide in
    // einem Durchgang: jede Rueckseite lief durch die ganze PBR-Beleuchtung
    side: opts.side ?? THREE.DoubleSide,
    transparent: true,
    depthWrite: true,
  });
  m.forceSinglePass = true;
  if (opts.cheap) m.defines = { AB_CHEAP: '' };
  m.onBeforeCompile = (sh) => {
    for (const k of ['uHeadMat', 'uBreath', 'uScanY', 'uInner', 'uShellIn', 'uWall', 'uFall', 'uDebug', 'uEdgeGlow', 'uEdgeCol', 'uEdgeY', 'uTime', 'uRidge']) sh.uniforms[k] = U[k];
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
${DEFORM_PARS}
attribute float aArm; varying float vArm; attribute float aAO; varying float vAO;
varying vec3 vRest; varying vec3 vT1; varying vec3 vT2; varying vec3 vT1v; varying vec3 vT2v;`)
      .replace('#include <beginnormal_vertex>', `vec3 objectNormal = normalize(abDeformDir(normal, aHead));`)
      .replace('#include <begin_vertex>', `vec3 transformed = abDeform(position, normal, aHead);
vRest = position; vArm = aArm; vAO = aAO;
vec3 rt1 = normalize(cross(normal, abs(normal.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
vec3 rt2 = cross(normal, rt1);
vT1 = rt1; vT2 = rt2;
vT1v = normalMatrix * abDeformDir(rt1, aHead);
vT2v = normalMatrix * abDeformDir(rt2, aHead);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uScanY; uniform vec3 uInner; uniform vec2 uFall; uniform float uDebug; uniform float uEdgeGlow; uniform vec3 uEdgeCol; uniform float uEdgeY; uniform float uTime;
uniform vec3 uRidge; uniform vec3 uShellIn; uniform vec3 uWall;
varying vec3 vRest; varying vec3 vT1; varying vec3 vT2; varying vec3 vT1v; varying vec3 vT2v; varying float vArm; varying float vAO;
float abRidge = 0.0;
float abGap = 0.0;
float abInA = 1.0;
${LAYOUT_GLSL}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
vec3 rp = vRest;
if (rp.y > uScanY || rp.y < uFall.x) discard;
lArm = vArm;
const float SE = 0.003;
vec3 t1 = normalize(vT1); vec3 t2 = normalize(vT2);
float s0 = seamField(rp);
float abSK = lSeamK;
vec2 sg = vec2(seamField(rp + t1 * SE) - s0, seamField(rp + t2 * SE) - s0) / SE;
float sgl = max(length(sg), 0.35);
float dS = s0 / sgl;
float o0 = openField(rp);
vec2 og = vec2(openField(rp + t1 * SE) - o0, openField(rp + t2 * SE) - o0) / SE;
float ogl = max(length(og), 0.35);
float dO = o0 / ogl;
// Spaltmass statt Tuschelinie: die Fuge ist eine feine Rinne (Halbbreite GW) mit Fase und weichem Schatten.
// Die Schale bleibt geschlossen (kein Blick auf die dunkle Innenschicht). Ist die Rinne schmaler als ein Bildpunkt
// (Handy, Abstand), wird sie heller statt breiter: Deckung = Breite / Bildpunkt.
float abPx = max(length(fwidth(rp)), 1e-5);
// Oeffnungen mit weicher Kante (Deckung ueber etwa einen Bildpunkt) statt hartem discard: keine Treppen und kein
// Pixelrauschen an Schulter, Hals und Kabelschlitz, auch ohne MSAA (Handy)
float abOpenA = smoothstep(-0.6 * abPx, 0.6 * abPx, dO);
if (abOpenA < 0.004) discard;
const float GW = 0.0021;
float dG = max(dS - GW, 0.0);
float gapCov = clamp(2.0 * GW / abPx, 0.0, 1.0);
abGap = (1.0 - smoothstep(GW - 0.5 * abPx, GW + 0.5 * abPx, dS)) * gapCov * abSK;
float ed; vec2 eg; float bw;
if (dG < dO) { ed = dG; eg = sg / sgl; bw = 0.0075; } else { ed = dO; eg = og / ogl; bw = 0.02; }
// Fase nur, wenn sie mindestens etwa einen Bildpunkt breit ist (sonst flimmert sie)
float bevAA = clamp(bw / (1.6 * abPx), 0.0, 1.0) * (dG < dO ? mix(0.55, 1.0, abSK) : 1.0);
float abEdge = ed;
if (gl_FrontFacing) {
  vec3 gv = eg.x * vT1v + eg.y * vT2v;
  gv -= normal * dot(gv, normal);
  float gl2 = length(gv);
  if (gl2 > 1e-5) {
    gv /= gl2;
    float bt = 1.0 - clamp(ed / bw, 0.0, 1.0);
    float ang = bt * bt * 1.05 * bevAA;
    normal = normalize(normal * cos(ang) - gv * sin(ang));
  }
  // weicher Schatten neben der Fuge und heller Grat auf der Fase (spiegelt die Softbox)
  diffuseColor.rgb *= mix(mix(1.0, 0.74, bevAA), 1.0, smoothstep(0.0, max(0.01, 1.5 * abPx), ed));
  abRidge = exp(-pow((ed - bw * 0.45) / (bw * 0.28), 2.0)) * bevAA;
  // Gravierte Linie in der Schulterkappe
#ifndef AB_CHEAP
  float gq = grooveField(rp);
  if (gq < 0.008) {
    vec2 gg = vec2(grooveField(rp + t1 * SE) - gq, grooveField(rp + t2 * SE) - gq) / SE;
    float ggl = max(length(gg), 0.35);
    float gz = gq / ggl;
    if (gz < 0.006) {
      vec3 gv2 = (gg.x * vT1v + gg.y * vT2v) / ggl;
      gv2 -= normal * dot(gv2, normal);
      normal = normalize(normal + gv2 * (1.0 - gz / 0.006) * 0.5);
      diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(0.0, 0.003, gz));
    }
  }
#endif
} else {
  // Innenseite: helle Keramik wie die Schale, nur matter. Direkt an einer Oeffnung (0.022 breit) die Schnittkante
  // der Wand: hell und glatter, so wirkt die Schale wie ein Formteil mit Materialstaerke statt wie Papier.
  float abWallIn = 1.0 - smoothstep(0.012, 0.024, dO);
  diffuseColor.rgb = mix(uShellIn, uWall, abWallIn);
  // ganz streifend gesehen ausblenden: sonst stehen Aussen- und Innenhaut an duennen Kanten als zwei helle Spitzen da
  abInA = smoothstep(0.03, 0.14, abs(dot(normal, normalize(vViewPosition))));
  roughnessFactor = mix(0.7, 0.38, abWallIn);
  // Innenseite im Hals: leises Leuchten (Licht der Mechanik), sonst kaum
  float neckIn = smoothstep(-1.55, -1.3, rp.y) * smoothstep(-0.5, -0.75, rp.y);
  totalEmissiveRadiance += uEdgeCol * (0.006 + 0.03 * neckIn);
}
if (uDebug > 0.5) { diffuseColor.rgb = mix(vec3(1.0, 0.1, 0.1), diffuseColor.rgb, smoothstep(0.0, 0.01, min(ed, dS))); }`)
      .replace('#include <clearcoat_normal_fragment_maps>', `#include <clearcoat_normal_fragment_maps>
#ifdef USE_CLEARCOAT
clearcoatNormal = normal;
#endif`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
if (!gl_FrontFacing) material.clearcoat = 0.0;
#endif`)
      // Punktlicht-Glanz stark daempfen: Glanz kommt von den Softboxen der Umgebung (sonst kleine "nasse" Punkte)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
reflectedLight.directSpecular *= 0.12;
#ifdef USE_CLEARCOAT
clearcoatSpecularDirect *= 0.2;
#endif
// Direktes Licht (fast nur das kuehle Kantenlicht) vor allem an streifenden Flaechen: Kontur statt Farbstich
reflectedLight.directDiffuse *= 0.22 + 0.78 * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 1.6);
{
  // Ambient Occlusion (offline gerechnet): Ohr, Kinn und Hals, Achsel, Augenhoehlen
  float ao = clamp(vAO, 0.0, 1.0);
  ao = ao * ao * (3.0 - 2.0 * ao);
  // im Gesicht (Augenhoehlen) weniger: tiefe Schatten um die Augen wirken muede
  float abFaceK = smoothstep(0.35, 0.55, vRest.z) * step(-0.7, vRest.y) * step(vRest.y, 0.3);
  float aoS = mix(1.0, ao, mix(0.9, 0.62, abFaceK));
  reflectedLight.indirectDiffuse *= aoS;
  reflectedLight.indirectSpecular *= mix(1.0, ao, 0.75);
  reflectedLight.directDiffuse *= mix(1.0, ao, 0.45);
#ifdef USE_CLEARCOAT
  clearcoatSpecularIndirect *= mix(1.0, ao, 0.75);
#endif
}`)
      .replace('#include <opaque_fragment>', `float abFall = smoothstep(uFall.x, uFall.y, rp.y);
// Rinne der Fuge: dunkles Grau (Innenkante im Schatten), kein reines Schwarz
outgoingLight *= 1.0 - 0.8 * abGap;
if (gl_FrontFacing) outgoingLight += uRidge * abRidge * (0.35 + 0.65 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0)) * mix(0.4, 1.0, vAO);
outgoingLight *= 0.35 + 0.65 * abFall;
diffuseColor.a = abFall * abOpenA * abInA;
// Obergrenze knapp ueber der Bloom-Schwelle der Bueste: Glanzlinien bleiben scharf, kein Lichthof um die Silhouette
outgoingLight = min(outgoingLight, vec3(1.45));
// Fugen leuchten nie dauerhaft: nur ein kurzer Lichtimpuls laeuft vor dem Scan von oben nach unten durch (uEdgeY)
// abEdge kann an Oeffnungen leicht negativ sein (weiche Kante, bei streifendem Blick bis zu einem halben Bildpunkt, also
// gross): ohne max() wuchs exp() bis Unendlich, auf der Innenseite wurde daraus mal 0 ein NaN, und der Bloom zog
// daraus schwarze Rechtecke ueber das halbe Bild (zoom@0.24 bis 0.31)
if (uEdgeGlow > 0.0 && gl_FrontFacing) { float abEy = (rp.y - uEdgeY) / 0.28; outgoingLight += uEdgeCol * uEdgeGlow * exp(-max(abEdge, 0.0) / 0.0045) * exp(-abEy * abEy); }
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => `ab-shell-${opts.key || ''}${opts.cheap ? '-cheap' : ''}-${m.side}`;
  return m;
}

/* ------------------------------------------------- Muskel-Gel und Innenhaut */
// Liegt 0.032 unter der Schale. Unter geschlossenen Platten dunkel (Fugen wirken als Schattenlinie), in Oeffnungen
// tuerkis: helles, glasiges Gel mit weichen Faserbuendeln. Durch das Gel sieht man per Parallaxe eine Innenstruktur
// (Rippenboegen und Brustbein in Graphit mit Chrom-Kante). Kontaktschatten unter den Plattenkanten, Plattenwand mit
// Materialstaerke. In tiefen Oeffnungen (Hals, Hinterkopf, Ruecken) fehlt die Schicht ganz.
export function makeMuscleMaterial(THREE, U, opts) {
  const m = new THREE.MeshStandardMaterial({
    color: opts.color,
    roughness: 0.2,
    metalness: 0,
    envMap: opts.envMap,
    envMapIntensity: opts.envIntensity ?? 1,
    transparent: true,
    depthWrite: true,
  });
  if (opts.cheap) m.defines = { AB_CHEAP: '' };
  m.onBeforeCompile = (sh) => {
    for (const k of ['uHeadMat', 'uBreath', 'uScanY', 'uInner', 'uFall', 'uTime', 'uGel', 'uGelHi', 'uPulse', 'uDepth', 'uDim', 'uWall', 'uStruct']) sh.uniforms[k] = U[k];
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
${DEFORM_PARS}
uniform float uDepth;
attribute float aArm; varying float vArm; attribute float aAO; varying float vAO;
varying vec3 vRest; varying vec3 vRN; varying vec3 vT1v; varying vec3 vT2v; varying vec3 vT1; varying vec3 vT2;`)
      .replace('#include <beginnormal_vertex>', `vec3 objectNormal = normalize(abDeformDir(normal, aHead));`)
      .replace('#include <begin_vertex>', `vec3 outer = position + normal * uDepth;
vec3 transformed = abDeform(position, normal, aHead);
vRest = outer; vRN = normal; vArm = aArm; vAO = aAO;
vec3 rt1 = normalize(cross(normal, abs(normal.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
vec3 rt2 = cross(normal, rt1);
vT1 = rt1; vT2 = rt2;
vT1v = normalMatrix * abDeformDir(rt1, aHead);
vT2v = normalMatrix * abDeformDir(rt2, aHead);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uScanY; uniform vec3 uInner; uniform vec2 uFall; uniform float uTime; uniform vec3 uGel; uniform vec3 uGelHi;
uniform vec4 uPulse; uniform float uDim; uniform vec3 uWall; uniform vec3 uStruct;
varying vec3 vRest; varying vec3 vRN; varying vec3 vT1v; varying vec3 vT2v; varying vec3 vT1; varying vec3 vT2; varying float vArm; varying float vAO;
${LAYOUT_GLSL}
float abHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float abNoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(abHash(i), abHash(i + vec2(1.0, 0.0)), f.x), mix(abHash(i + vec2(0.0, 1.0)), abHash(i + vec2(1.0, 1.0)), f.x), f.y); }
// Faserkoordinaten je Muskelgruppe (Welt-Einheiten): x quer zu den Fasern, y entlang.
vec2 abMap(int r, vec3 q) {
  if (r == 0) return vec2(q.x, q.y);
  if (r == 1) return vec2(q.x * 0.66 + q.y * 0.75, q.y * 0.66 - q.x * 0.75);
  if (r == 2) { vec2 rel = q.xy - vec2(1.16, -2.24); return vec2(atan(rel.y, -rel.x) * 0.95, length(rel)); }
  if (r == 3) return vec2(q.x * 0.8 + q.y * 0.6, q.y * 0.8 - q.x * 0.6);
  vec3 rel = q - vec3(1.473, -2.257, -0.29);
  return vec2(atan(rel.z, rel.x - 0.05) * 0.28, rel.y);
}
// Gewichte: 0 Bauch, 1 seitlich schraeg, 2 grosser Brustmuskel (Faecher zum Oberarm), 3 ueber dem Schluesselbein, 4 Arm
void abRegions(vec3 q, out int r1, out int r2, out float t) {
  float w[5];
  float arm = smoothstep(1.12, 1.17, q.x) * smoothstep(-2.0, -2.08, q.y);
  float sup = (1.0 - arm) * smoothstep(lClavY(q.x) - 0.01, lClavY(q.x) + 0.03, q.y);
  float rest = (1.0 - arm) * (1.0 - sup);
  float pec = rest * (1.0 - smoothstep(-0.03, 0.03, lPecLow(q))) * (1.0 - smoothstep(1.08, 1.16, q.x));
  rest -= pec;
  float obl = rest * smoothstep(0.3, 0.4, q.x);
  w[0] = rest - obl; w[1] = obl; w[2] = pec; w[3] = sup; w[4] = arm;
  r1 = 0; for (int i = 1; i < 5; i++) if (w[i] > w[r1]) r1 = i;
  r2 = r1 == 0 ? 1 : 0; for (int i = 0; i < 5; i++) if (i != r1 && w[i] > w[r2]) r2 = i;
  t = w[r2] / max(w[r1] + w[r2], 1e-4);
}
// Muster einer Gruppe: x Buendel (0..1, weich), y Wolke
vec2 abPattern(int r, vec3 q, out float along, out float aaB) {
  vec2 fb = abMap(r, q);
  along = fb.y;
  float nz = abNoise(vec2(fb.x * 11.0, fb.y * 2.0));
  // Faecher des Brustmuskels: breitere, unregelmaessige Buendel, die zum Ansatz am Oberarm weich verschwinden
  // (sonst Strahlenkranz). Die anderen Gruppen: feinere Buendel.
  float per = r == 2 ? 0.11 : 0.075;
  float pb = (fb.x + (nz - 0.5) * (r == 2 ? 0.07 : 0.04)) / per * 6.2832;
  float hb = 0.5 + 0.5 * cos(pb);
  hb = mix(hb, smoothstep(0.15, 0.85, hb), 0.5);
  aaB = 1.0 - smoothstep(0.5, 1.4, fwidth(pb));
  if (r == 2) aaB *= 0.38 * smoothstep(0.62, 1.15, fb.y) * (0.6 + 0.4 * abNoise(vec2(fb.x * 4.0, fb.y * 1.5)));
  // Wolke: beim Brustmuskel in kartesischen Koordinaten (in Polarkoordinaten entstuende ein Strahlenkranz)
  vec2 cq = r == 2 ? q.xy * 2.2 : fb;
  float cloud = abNoise(vec2(cq.x * 5.0, cq.y * 2.5)) * 0.65 + abNoise(vec2(cq.x * 13.0, cq.y * 5.0)) * 0.35;
  return vec2(mix(0.5, hb, aaB), cloud);
}
// Innenstruktur hinter dem Gel (Parallaxe): Rippenboegen, Brustbein. x Maske, y Chrom-Kante
vec2 abStructure(vec3 p) {
  float x = p.x;
  float s = (p.y + 0.3 * x * x + 0.12 * x + 1.98) / 0.2;
  float fs = fract(s) - 0.5;
  float aa = clamp(fwidth(s) * 1.5, 0.0, 0.5);
  float rib = 1.0 - smoothstep(0.17 - aa, 0.25 + aa, abs(fs));
  rib *= smoothstep(-1.82, -1.95, p.y) * (1.0 - smoothstep(0.95, 1.1, x)) * smoothstep(0.04, 0.09, x) * smoothstep(-0.02, 0.08, lPecLow(p));
  float edge = exp(-pow((fs + 0.14) / 0.05, 2.0)) * rib;
  float st = (1.0 - smoothstep(0.045, 0.06, x)) * smoothstep(-1.78, -1.9, p.y);
  float stEdge = exp(-pow((x - 0.04) / 0.012, 2.0)) * st;
  return vec2(max(rib, st), max(edge, stEdge) * (1.0 - aa * 2.0));
}
// Relief per Bildschirm-Ableitung (wie Bump-Mapping)
vec3 abBump(vec3 pos, vec3 n, float h) {
  vec3 dpx = dFdx(pos); vec3 dpy = dFdy(pos);
  float dhx = dFdx(h); float dhy = dFdy(h);
  vec3 r1 = cross(dpy, n); vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 g = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * n - g);
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
vec3 rp = vRest;
if (rp.y > uScanY || rp.y < uFall.x) discard;
vec3 q = vec3(abs(rp.x), rp.y, rp.z);
lArm = vArm;
float abPx = max(length(fwidth(rp)), 1e-5);
float abDeepA = smoothstep(-0.6 * abPx, 0.6 * abPx, deepOpen(rp));
if (abDeepA < 0.004) discard;
const float SE = 0.003;
vec3 t1 = normalize(vT1); vec3 t2 = normalize(vT2);
float o0 = openField(rp);
vec2 og = vec2(openField(rp + t1 * SE) - o0, openField(rp + t2 * SE) - o0) / SE;
float ogl = max(length(og), 0.35);
float dO = o0 / ogl;
float open = 1.0 - smoothstep(-0.004, 0.0, dO);
// Unter einer Platte nahe einer Oeffnung: Plattenwand (Materialstaerke) ist sichtbar
float wall = (1.0 - open) * (1.0 - smoothstep(0.022, 0.05, dO));
vec3 V = normalize(vViewPosition);
vec2 vt = vec2(dot(V, normalize(vT1v)), dot(V, normalize(vT2v)));
int r1; int r2; float rt;
abRegions(q, r1, r2, rt);
float al1; float al2; float ab1; float ab2;
#ifdef AB_CHEAP
vec2 P1 = abPattern(r1, q, al1, ab1);
vec2 PT = P1; al2 = al1; ab2 = ab1; rt = 0.0;
#else
vec2 P1 = abPattern(r1, q, al1, ab1);
vec2 P2 = abPattern(r2, q, al2, ab2);
vec2 PT = mix(P1, P2, rt);
#endif
float hb = PT.x; float cloud = PT.y;
float aaB = mix(ab1, ab2, rt);
float hgt = hb * 0.0016 * open * aaB;
normal = abBump(-vViewPosition, normal, hgt);
// Kontaktschatten unter den Plattenkanten
float shade = mix(0.12, 1.0, smoothstep(0.0, 0.1, -dO));
// Innenstruktur hinter dem Gel (0.11 tiefer, Parallaxe entlang der Blickrichtung)
vec3 q3 = q - (vT1 * vt.x + vT2 * vt.y) * 0.11;
#ifdef AB_CHEAP
vec2 ST = vec2(0.0);
#else
vec2 ST = abStructure(q3) * open;
#endif
vec3 gel = uGel * (0.95 + 0.05 * hb) * shade;
gel = mix(gel, uStruct, ST.x * 0.32);
diffuseColor.rgb = mix(uInner, gel, open);
if (wall > 0.0) {
  vec3 wn = -(og.x * vT1v + og.y * vT2v);
  wn -= normal * dot(wn, normal);
  if (length(wn) > 1e-5) normal = normalize(normalize(wn) * 0.92 + normal * 0.25 * wall + normal * (1.0 - wall));
  diffuseColor.rgb = mix(diffuseColor.rgb, uWall, wall);
}
float fres = pow(1.0 - abs(dot(normal, V)), 3.0);
// zweite Faserlage tiefer im Gel (Parallaxe entlang der Blickrichtung): Tiefe statt flachem Verlauf
vec3 qd = q - (vT1 * vt.x + vT2 * vt.y) * 0.05;
float alD; float abD;
vec2 PD = abPattern(r1, qd + vec3(0.013, 0.0, 0.0), alD, abD);
float pulse = 0.0;
for (int i = 0; i < 2; i++) {
  float ph = fract(uTime * uPulse.x + float(i) * 0.5);
  pulse += exp(-pow((q.y - mix(-1.4, -3.6, ph) + q.x * 0.3) / 0.09, 2.0));
}
// dunkler Kern, helle Fresnel-Kanten, tiefe Fasern leuchten leise durch
float inner = (0.03 + 0.045 * cloud + 0.035 * PD.x * abD) * (1.0 - fres) * (1.0 - 0.45 * ST.x);
vec3 glow = uGelHi * (inner + 0.5 * fres) + uGelHi * pulse * uPulse.y * (0.2 + 0.12 * hb * aaB) * (1.0 - 0.5 * ST.x);
glow += uGelHi * ST.y * 0.16 * (1.0 - fres);
glow *= open * shade * (1.0 - uDim);
totalEmissiveRadiance += glow;
roughnessFactor = mix(mix(0.85, 0.32, wall), 0.12, open);`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
{
  float ao = clamp(vAO, 0.0, 1.0);
  reflectedLight.indirectDiffuse *= mix(1.0, ao, 0.8);
  reflectedLight.indirectSpecular *= mix(1.0, ao, 0.6);
}`)
      .replace('#include <opaque_fragment>', `float abFall = smoothstep(uFall.x, uFall.y, rp.y);
outgoingLight = min(outgoingLight, vec3(2.0)) * (0.35 + 0.65 * abFall);
diffuseColor.a = abFall * abDeepA;
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => `ab-muscle2${opts.cheap ? '-cheap' : ''}`;
  return m;
}

/* -------------------------------------- Innenschale des Hinterkopfs (Graphit) */
// Liegt 0.13 unter der Schale, nur im Bereich des Hinterkopf-Fensters. Querrippen, feine Paneel-Linien, Status-Punkte.
export function makeCoreMaterial(THREE, U, opts) {
  const m = new THREE.MeshPhysicalMaterial({
    color: opts.color, metalness: 0.65, roughness: 0.42, envMap: opts.envMap, envMapIntensity: 0.85,
    clearcoat: 0.3, clearcoatRoughness: 0.3,
  });
  m.onBeforeCompile = (sh) => {
    for (const k of ['uHeadMat', 'uBreath', 'uScanY', 'uTime', 'uGelHi', 'uCoreDepth', 'uMechDim']) sh.uniforms[k] = U[k];
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
${DEFORM_PARS}
uniform float uCoreDepth;
attribute float aAO; varying float vAO; varying vec3 vRest;`)
      .replace('#include <beginnormal_vertex>', `vec3 objectNormal = normalize(abDeformDir(normal, aHead));`)
      .replace('#include <begin_vertex>', `vec3 transformed = abDeform(position, normal, aHead);
vRest = position + normal * uCoreDepth; vAO = aAO;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uScanY; uniform float uTime; uniform vec3 uGelHi; uniform float uMechDim;
varying vec3 vRest; varying float vAO;
${LAYOUT_GLSL}
vec3 abBump(vec3 pos, vec3 n, float h) {
  vec3 dpx = dFdx(pos); vec3 dpy = dFdy(pos);
  float dhx = dFdx(h); float dhy = dFdy(h);
  vec3 r1 = cross(dpy, n); vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 g = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * n - g);
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
vec3 rp = vRest;
vec3 q = vec3(abs(rp.x), rp.y, rp.z);
if (rp.y > uScanY || lSkullWin(q) > 0.1 || rp.y < -0.64) discard;
float th = atan(q.x, q.z);
float u = (3.14159 - th) * length(q.xz);
// Querrippen und Laengsnut
float ry = rp.y * 15.0;
float rib = smoothstep(0.0, 0.35, abs(fract(ry) - 0.5));
float aa = clamp(fwidth(ry), 0.0, 1.0);
rib = mix(rib, 0.7, aa);
float groove = 1.0 - smoothstep(0.004, 0.009, abs(u - 0.2));
float h = (rib * 0.0016 - groove * 0.002);
normal = abBump(-vViewPosition, normal, h);
diffuseColor.rgb *= 0.72 + 0.28 * rib;
float led = exp(-pow(length(vec2(fract(rp.y * 5.0 + 0.5) - 0.5, (u - 0.32) * 5.0)) / 0.06, 2.0)) * step(rp.y, 0.2);
totalEmissiveRadiance += uGelHi * led * 0.6 * (0.6 + 0.4 * sin(uTime * 2.1 + rp.y * 9.0)) * (1.0 - uMechDim);`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
// leiser Schein aus dem Schaedelinneren (Licht der Gehirn-Hardware), damit die Form auch hinten lesbar bleibt
reflectedLight.indirectDiffuse += diffuseColor.rgb * uGelHi * 0.22 * (1.0 - uMechDim);`);
  };
  m.customProgramCacheKey = () => 'ab-core';
  return m;
}

/* --------------------------------------------------------- Glas (Hinterkopf) */
// Klare Schale ueber dem oberen Teil des Hinterkopf-Fensters: kaum sichtbar, starke Spiegelung am Rand (Fresnel).
export function makeGlassMaterial(THREE, U, opts) {
  const m = new THREE.MeshPhysicalMaterial({
    color: opts.color, metalness: 0, roughness: 0.06, envMap: opts.envMap, envMapIntensity: 1.6,
    // Runde 2: eine Seite pro Material (robot.js zeichnet zwei Meshes: erst innen, dann aussen). DoubleSide ohne
    // forceSinglePass schaltete three.js pro Bild zweimal das Programm um (Parameter neu, rund 6 KB Garbage pro Bild)
    transparent: true, depthWrite: false, side: opts.side ?? THREE.FrontSide, clearcoat: 1, clearcoatRoughness: 0.04,
  });
  m.onBeforeCompile = (sh) => {
    for (const k of ['uHeadMat', 'uBreath', 'uScanY', 'uRidge']) sh.uniforms[k] = U[k];
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
${DEFORM_PARS}
varying vec3 vRest;`)
      .replace('#include <beginnormal_vertex>', `vec3 objectNormal = normalize(abDeformDir(normal, aHead));`)
      .replace('#include <begin_vertex>', `vec3 transformed = abDeform(position + normal * 0.004, normal, aHead);
vRest = position;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uScanY; uniform vec3 uRidge;
varying vec3 vRest;
${LAYOUT_GLSL}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
float gF = glassField(vRest);
if (vRest.y > uScanY || gF < 0.0) discard;
// heller Rand nur oben am Fensterrand; zur Unterkante laeuft die Kappe weich aus (keine harte Facette)
float gLow = glassLow(vec3(abs(vRest.x), vRest.y, vRest.z));
float gFade = smoothstep(0.0, 0.11, gLow) * smoothstep(0.0, 0.025, gF);
float gEdge = exp(-gF / 0.006) * smoothstep(0.02, 0.09, gLow);`)
      .replace('#include <opaque_fragment>', `float gFres = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
// sichtbare Kante: polierte Glaskante oben am Fensterrand und unten an der Kappe (schmale helle Linie)
float gLowEdge = exp(-pow((gLow - 0.012) / 0.007, 2.0)) * smoothstep(0.0, 0.03, gF);
float gRim = max(gEdge, gLowEdge);
diffuseColor.a = clamp(0.08 + 0.8 * gFres + 0.55 * gRim, 0.0, 1.0) * max(gFade, gLowEdge);
outgoingLight = outgoingLight * (0.85 + 0.6 * gFres) + uRidge * (gRim * 1.1 + 0.05);
#ifdef AB_DBG_GLASS
outgoingLight = gl_FrontFacing ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0); diffuseColor.a = 0.8;
#endif
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => `ab-glass2-${m.side}`;
  return m;
}

/* -------------------------------------------------------------- Hologramm */
export function makeHoloMaterial(THREE, U) {
  return new THREE.ShaderMaterial({
    uniforms: { uHeadMat: U.uHeadMat, uBreath: U.uBreath, uScanY: U.uScanY, uHolo: U.uHolo, uHoloCol: U.uHoloCol, uHoloHi: U.uHoloHi, uTime: U.uTime, uFall: U.uFall },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
${DEFORM_PARS}
uniform float uScanY;
attribute float aArm; varying float vArm;
varying vec3 vRest; varying vec3 vN; varying vec3 vV;
void main() {
  vRest = position; vArm = aArm;
  vec3 p = abDeform(position, normal, aHead);
  // Hologramm weitet sich ueber der Scan-Linie leicht (umschliesst die Hardware im Kopf)
  float above = smoothstep(0.0, 0.3, position.y - uScanY) * smoothstep(-0.6, -0.2, position.y);
  float temple = exp(-pow((position.y - 0.05) / 0.24, 2.0)) * smoothstep(-0.1, 0.2, position.z);
  float infl = (0.055 + 0.065 * temple) * above;
  p.x *= 1.0 + infl;
  p.z *= 1.0 + 0.02 * above;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * abDeformDir(normal, aHead));
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: /* glsl */ `
uniform float uScanY; uniform float uHolo; uniform vec3 uHoloCol; uniform vec3 uHoloHi; uniform float uTime; uniform vec2 uFall;
varying vec3 vRest; varying vec3 vN; varying vec3 vV; varying float vArm;
${LAYOUT_GLSL}
void main() {
  if (vRest.y < uScanY - 0.002 || uHolo < 0.002 || vRest.y < uFall.x) discard;
  lArm = vArm;
  vec3 n = normalize(vN); vec3 v = normalize(vV);
  float fres = pow(1.0 - abs(dot(n, v)), 2.2);
  float s = seamField(vRest);
  // feine Falten (Lidfuge) im Hologramm kaum: sonst wirken die Augen umrandet wie eine Taucherbrille
  float lk = lSeamK * lSeamK;
  float line = (1.0 - smoothstep(0.0, 0.005 + fwidth(s) * 1.5, s)) * lk * lk;
  float o = openField(vRest);
  float edge = 1.0 - smoothstep(0.0, 0.008 + fwidth(o) * 1.5, abs(o));
  float scan = exp(-pow((vRest.y - uScanY) / 0.03, 2.0));
  float stripes = 0.5 + 0.5 * sin(vRest.y * 220.0 - uTime * 2.0);
  vec3 c;
  // Augenpartie (Runde 2): In der Augenhoehle liegen Lid und Augapfel hintereinander, additiv ergab das helle,
  // umrandete Ovale (Taucherbrille). Dort jede Lage gedaempft, damit die Summe etwa der Flaeche daneben entspricht.
  float eyeE = length(vec2((abs(vRest.x) - 0.304) / 0.168, (vRest.y + 0.005) / 0.145));
  float eyeF = smoothstep(0.3, 0.42, vRest.z);
  float eyeZ = (1.0 - smoothstep(0.85, 1.0, eyeE)) * eyeF;   // Lagen in der Hoehle
  float eyeR = (1.0 - smoothstep(1.02, 1.3, eyeE)) * eyeF;   // Rand der Hoehle: kein Fresnel-Ring
  if (gl_FrontFacing) {
    c = uHoloCol * (fres * mix(0.9, 0.12, eyeR) + 0.06 + 0.05 * stripes) + uHoloHi * (line * 0.55 + edge * 0.4) + uHoloHi * scan * 2.0;
    if (o < 0.0) c *= 0.15;
    c *= mix(1.0, 0.5, eyeZ);
  } else {
    // Rueckseite: nur ein leiser Fresnel-Schein, keine Linien (sonst scheinen die Schulterblatt-Fugen durch die Brust)
    c = uHoloCol * fres * 0.18;
  }
  gl_FragColor = vec4(c * uHolo * smoothstep(uFall.x, uFall.y, vRest.y), 1.0);
}`,
  });
}

/* ------------------------------------------------- Mechanik (mit Kopf-Verformung) */
// kind: 'metal' (Chrom, Graphit), 'gel' (Muskelstraenge: Fasern entlang uv.y, Impulse), 'cable' (Gummi, einzelne leuchten)
export function makeMechMaterial(THREE, U, params, kind = 'metal', key = '') {
  const m = new THREE.MeshPhysicalMaterial(params);
  const thin = kind === 'cable' || key === 'hose' || key === 'rubber';
  m.onBeforeCompile = (sh) => {
    for (const k of ['uHeadMat', 'uBreath', 'uScanY', 'uFall', 'uTime', 'uGelHi', 'uPulse', 'uMechDim', 'uMechCut', 'uMechFade', 'uChromeCol', 'uRes']) sh.uniforms[k] = U[k];
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
${DEFORM_PARS}
attribute vec2 aUv2; uniform vec2 uRes;
varying vec3 vRest; varying vec2 vU;`)
      .replace('#include <beginnormal_vertex>', `vec3 objectNormal = normalize(abDeformDir(normal, aHead));`)
      .replace('#include <begin_vertex>', `vec3 transformed = mix(position, (uHeadMat * vec4(position, 1.0)).xyz, aHead);
vRest = position; vU = aUv2;
${thin ? `{
  // Mindestbreite duenner Kabel: um etwa einen halben Bildpunkt aufweiten (kein Moire, kein Flimmern in Bewegung)
  vec4 abMv = modelViewMatrix * vec4(transformed, 1.0);
  float abPxW = -abMv.z * 2.0 / (projectionMatrix[1][1] * max(uRes.y, 1.0));
  transformed += objectNormal * 0.45 * abPxW;
}` : ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uScanY; uniform vec2 uFall; uniform float uTime; uniform vec3 uGelHi; uniform vec4 uPulse; uniform float uMechDim;
uniform float uMechCut; uniform float uMechFade; uniform vec3 uChromeCol;
varying vec3 vRest; varying vec2 vU;
// Werterauschen fuer das Aufloesen der Mechanik (Kamera taucht ins Gehirn), ohne Textur
float abFadeN(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float n = dot(i, vec3(1.0, 57.0, 113.0));
  vec4 a = fract(sin(vec4(n, n + 1.0, n + 57.0, n + 58.0)) * 43758.5453);
  vec4 b = fract(sin(vec4(n + 113.0, n + 114.0, n + 170.0, n + 171.0)) * 43758.5453);
  vec4 m = mix(a, b, f.z);
  vec2 q = mix(m.xy, m.zw, f.y);
  return mix(q.x, q.y, f.x);
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if (vRest.y < uFall.x || vRest.y > uMechCut) discard;
if (uMechFade > 0.0) {
  // Aufloesen mit feinem Korn und leiser Kante statt hartem Verschwinden am Ende des Fensters (Runde 2: Rauschen
  // rund dreimal feiner, Kante schmaler und dunkler; vorher grosse, kantige Fetzen mit Leuchtrand, vor allem am Handy)
  float dn = abFadeN(vRest * 34.0) * 0.6 + abFadeN(vRest * 97.0) * 0.4;
  float th = uMechFade * 1.2 - 0.1;
  if (dn < th) discard;
  totalEmissiveRadiance += uGelHi * 1.1 * (1.0 - smoothstep(0.0, 0.02, dn - th)) * step(0.001, uMechFade);
}
${key.endsWith('-scan') ? 'if (vRest.y > uScanY) discard;' : ''}
${kind === 'gel' ? `{
  // Fasern entlang des Strangs, zwei Lagen, Impulse laufen nach unten
  float a = vU.x * 6.2832;
  float f1 = 0.5 + 0.5 * sin(a * 9.0 + sin(vU.y * 7.0) * 0.8);
  float f2 = 0.5 + 0.5 * sin(a * 15.0 + 1.7);
  vec3 V = normalize(vViewPosition);
  float fres = pow(1.0 - abs(dot(normal, V)), 1.6);
  diffuseColor.rgb *= 0.55 + 0.45 * f1;
  float ph = fract(uTime * uPulse.x * 1.3 + vU.y * 0.0);
  float pulse = exp(-pow((vU.y - ph * 1.4 + 0.2) / 0.07, 2.0));
  totalEmissiveRadiance += uGelHi * ((0.1 + 0.3 * f2 * f1) * (0.4 + 0.6 * (1.0 - fres)) + 0.35 * fres + pulse * uPulse.y * (0.5 + 0.5 * f1)) * (1.0 - uMechDim);
  roughnessFactor = 0.18 + 0.2 * (1.0 - f1);
}` : ''}
${kind === 'housing' ? `{
  // Leuchtschlitze zwischen den Rippen (Hals-Gehaeuse), langsames Atmen
  float rib = 0.5 + 0.5 * cos(vRest.y * 75.0);
  float slot = smoothstep(0.92, 1.0, rib) * smoothstep(0.15, 0.35, abs(fract(vU.x * 6.0) - 0.5));
  totalEmissiveRadiance += uGelHi * (slot * (0.4 + 0.15 * sin(uTime * 1.3 + vRest.y * 6.0)) + 0.04) * (1.0 - uMechDim);
}` : ''}
${kind === 'grille' ? `{
  // feines Lochgitter (Sechseck), Loecher dunkel mit leisem Schein
  vec2 g = (vU - 0.5) * 30.0;
  vec2 rr = vec2(1.0, 1.732); vec2 hh = rr * 0.5;
  vec2 a = mod(g, rr) - hh; vec2 b = mod(g - hh, rr) - hh;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  float aa = fwidth(g.x);
  float hole = 1.0 - smoothstep(0.3 - aa, 0.3 + aa, length(gv));
  hole = mix(hole, 0.3, clamp(aa * 1.5 - 0.3, 0.0, 1.0));
  // gebuerstetes Metall: feine konzentrische Schleifspuren (Rauheit wechselt), Loecher matt und dunkel
  float brush = 0.5 + 0.5 * sin(length(vU - 0.5) * 1400.0 + sin(atan(vU.y - 0.5, vU.x - 0.5) * 7.0) * 0.6);
  brush = mix(brush, 0.5, clamp(fwidth(length(vU - 0.5) * 1400.0) * 0.5, 0.0, 1.0));
  diffuseColor.rgb *= (1.0 - 0.75 * hole) * (0.9 + 0.2 * brush);
  roughnessFactor = mix(mix(0.22, 0.42, brush), 0.95, hole);
  totalEmissiveRadiance += uGelHi * hole * 0.025 * (1.0 - uMechDim);
}` : ''}
${kind === 'lattice' ? `{
  // Lochreihe (zwei gegenueberliegende Seiten) und Chrom-Manschetten in festen Abstaenden: gefraester Gitterstab
  float hv = (fract(vU.y * 24.0) - 0.5) / 24.0;
  float hu = (fract(vU.x * 2.0 + 0.25) - 0.5) * 0.05;
  float hd = length(vec2(hv, hu));
  float aa = fwidth(hd) + 1e-4;
  float hole = 1.0 - smoothstep(0.0048 - aa, 0.0048 + aa, hd);
  float band = 1.0 - smoothstep(0.012 - fwidth(vU.y), 0.012 + fwidth(vU.y), abs(fract(vU.y * 5.0 + 0.5) - 0.5) / 5.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, uChromeCol, band);
  metalnessFactor = mix(metalnessFactor, 1.0, band);
  roughnessFactor = mix(mix(roughnessFactor, 0.16, band), 0.9, hole);
  diffuseColor.rgb *= 1.0 - 0.88 * hole;
}` : ''}
${kind === 'board' ? `{
  // Platine: Leiterbahnen im Raster (hell, metallisch), ein Chip (dunkel), Loetpunkte, ein Status-Punkt
  vec2 g = vU * vec2(26.0, 16.0);
  vec2 cell = floor(g); vec2 fg = abs(fract(g) - 0.5);
  float rh = step(0.45, fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453));
  float rv = step(0.72, fract(sin(dot(cell, vec2(39.346, 11.135))) * 24634.6345));
  float aa = fwidth(g.x) * 0.7;
  float tr = max((1.0 - smoothstep(0.07, 0.07 + aa + 0.04, fg.y)) * rh, (1.0 - smoothstep(0.07, 0.07 + aa + 0.04, fg.x)) * rv);
  float chip = step(abs(vU.x - 0.36), 0.15) * step(abs(vU.y - 0.5), 0.24);
  float pad = (1.0 - smoothstep(0.14, 0.2, length(fract(g) - 0.5))) * step(0.86, fract(sin(dot(cell, vec2(7.1, 3.7))) * 9137.1));
  tr = max(tr, pad) * (1.0 - chip);
  diffuseColor.rgb *= (1.0 + 2.6 * tr) * (1.0 - 0.6 * chip);
  metalnessFactor = mix(metalnessFactor, 1.0, tr);
  roughnessFactor = mix(roughnessFactor, mix(0.25, 0.6, chip), max(tr, chip));
  float st = exp(-pow(length((vU - vec2(0.82, 0.22)) * vec2(1.0, 0.7)) / 0.03, 2.0));
  totalEmissiveRadiance += uGelHi * st * 1.6 * (0.7 + 0.3 * sin(uTime * 2.3)) * (1.0 - uMechDim);
}` : ''}
${kind === 'led' ? `totalEmissiveRadiance += uGelHi * 2.4 * (0.75 + 0.25 * sin(uTime * 1.7)) * (1.0 - 0.6 * uMechDim);` : ''}
${kind === 'cable' ? `{
  // feine Leuchtlinie entlang des Kabels, Lichtpakete laufen vom Kopf in den Rumpf
  float stripe = exp(-pow((fract(vU.x + 0.25) - 0.5) / 0.09, 2.0));
  float pk = fract(vU.y * 1.6 - uTime * 0.42 + vRest.x * 1.7);
  float pulse = exp(-pow((pk - 0.5) / 0.06, 2.0));
  totalEmissiveRadiance += uGelHi * stripe * (0.1 + 0.9 * pulse) * uPulse.z * (1.0 - uMechDim);
}` : ''}`)
      .replace('#include <opaque_fragment>', `outgoingLight = min(outgoingLight, vec3(${kind === 'led' ? '3.0' : '1.8'})) * smoothstep(uFall.x, uFall.y, vRest.y);
#include <opaque_fragment>`);
  };
  // Der Shader haengt nur von kind und '-scan' ab: Materialien mit gleichem Schluessel teilen ein Programm
  // (Klarlack und andere Parameter unterscheidet three.js selbst). Weniger Programme, kuerzere Ladezeit.
  m.customProgramCacheKey = () => `ab-mech-${kind}${key.endsWith('-scan') ? '-scan' : ''}${thin ? '-thin' : ''}`;
  return m;
}
