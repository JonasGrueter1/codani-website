// Szene "backdrop": Shader des Hintergrunds. Ein Vollbild-Dreieck, pro Bildpunkt die Welt-Blickrichtung
// (aus projectionMatrixInverse inkl. Lens-Shift und matrixWorld der Kamera). Der Hintergrund dreht sich also korrekt
// mit der Kamera, liegt aber unendlich weit weg. Ausnahmen mit echter Parallaxe: der Boden (Ebene y = uFloorY) und der
// Code-Tunnel (Zylinder um die Helix-Achse, Kapitel Code), beide aus der Kameraposition geschnitten.
//
// Bausteine (alle ueber Uniforms gewichtet, Werte aus backdrop.js, gemischt aus BACKDROPS in config.js):
//   Verlauf + Horizontband, Akzent-Dunst, Gegenlicht-Halo (uGlowDir), Lichtflaechen (uWash: drei grosse, weiche
//   Farbflaechen, die langsam um das Gegenlicht wandern, Version 4), Nebel (1..3 Rausch-Zugriffe, Domain-Warp, vom
//   Gegenlicht beleuchtet), Lichtstrahlen um eine eigene Quelle (uRayDir), Biolumineszenz der Nebelschwaden (uAurora),
//   Sterne, Staub, Bokeh, Boden mit Spiegelung (Studio-Boden: Lichtbahn unter dem Motiv, Lichtkante am Horizont,
//   optional Punktraster und Datenpakete auf den Rasterlinien, uStreaks), Messraster mit Scanlinie und Messkreis,
//   Code-Regen im Tunnel (uCode, Kapitel Code).
// BD_Q: 2 = high, 1 = medium, 0 = low (weniger Zugriffe, weniger Ebenen).
// Helligkeit (linear, vor dem Tonemapping): Flaechen bleiben unter ~0.06, nur Halo-Kern, Pakete, Sterne und Bokeh
// werden heller (bis ~0.5, leichtes Bluehen). Die Mengen aus BACKDROPS (0..1) sind hier auf diese Werte skaliert.

export const BACKDROP_VERT = /* glsl */ `
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
varying vec3 vDir;
void main() {
  vec2 p = position.xy;
  vec4 v = uInvProj * vec4(p, 1.0, 1.0);
  v.xyz /= v.w;
  vDir = (uCamWorld * vec4(v.xyz, 0.0)).xyz;
  gl_Position = vec4(p, 0.9999, 1.0);
}
`;

export const BACKDROP_FRAG = /* glsl */ `
precision highp float;
precision highp sampler3D;

uniform sampler3D uNoise;
uniform float uTime;
uniform vec2 uRes;
uniform vec3 uCamPos;

uniform vec3 uBase;
uniform vec3 uMid;
uniform vec3 uHi;
uniform vec3 uAccent;
uniform vec3 uAccentDir;
uniform float uHorizon;
uniform float uHorizonGlow;
uniform vec3 uGlowDir;
uniform float uGlow;
uniform float uGlowSize;
uniform float uFog;
uniform float uFogScale;
uniform vec2 uFogRot;
uniform vec3 uRayDir;
uniform float uRays;
uniform float uRayFreq;
uniform vec3 uRayColor;
uniform float uAurora;
uniform vec3 uAuroraA;
uniform vec3 uAuroraB;
uniform vec3 uAuroraEdge;
uniform float uStars;
uniform vec3 uStarColor;
uniform float uDust;
uniform float uFloor;
uniform float uFloorY;
uniform float uFloorGrid;
uniform float uFloorShine;
uniform float uGrid;
uniform vec3 uGridColor;
uniform float uScan;
uniform float uScanTan;
uniform vec3 uRingDir;
uniform float uRingCos;
uniform float uStreaks;
uniform vec3 uStreakColor;
uniform float uBokeh;
uniform vec3 uBokehColor;
uniform float uCode;
uniform vec3 uCodeColor;
uniform float uWash;
uniform vec3 uWashA;
uniform vec3 uWashB;
uniform vec3 uWashC;
uniform vec3 uPoolAt;
uniform float uPool;
uniform float uWashSide;
uniform float uDetail;
uniform vec4 uScrimRect;
uniform float uScrimA;
#ifdef CODANI_LIGHT
uniform float uPaper;  // Helligkeit des Papiers im hellen Thema (Lichtweg unten, nur mit CODANI_LIGHT, Kapitel 14)
#endif

varying vec3 vDir;

#define TAU 6.2831853

// Glattes Value-Noise aus dem 32^3-Volumen, vier Kanaele pro Zugriff (p in Gitter-Einheiten)
vec4 nz(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return texture(uNoise, (i + f + 0.5) * 0.03125);
}

// Hashes ohne Sinus (Dave Hoskins), stabil auf Mobile-GPUs
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}

vec3 rotY(vec3 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z);
}

// Duenne Linie mit Kantenglaettung: x = Abstand in Gitter-Einheiten, w = fwidth
float aaLine(float x, float w, float width) {
  return 1.0 - smoothstep(width * w, (width + 1.2) * w, abs(x));
}

// Lichtflaechen (Version 4, Rueckmeldung "Hintergrund langweilig"): drei grosse, weiche Lichter um das Gegenlicht, wie
// im Fotostudio: eine hohe, schmale Lichtbahn neben dem Motiv (Softbox, uWashA), eine breite Flaeche oben (uWashB) und ein
// warmer Schein unten (uWashC). Lage in Winkeln um das Gegenlicht (x weg vom Text, uWashSide), sie wandern sehr
// langsam. Keine Rauschzugriffe. Der Boden spiegelt sie (washAt mit gespiegelter Richtung).
vec3 washAt(vec3 d) {
  vec3 gw = uGlowDir;
  float fr = dot(d, gw);
  if (fr <= 0.0) return vec3(0.0);
  vec3 r1 = normalize(cross(gw, vec3(0.0, 1.0, 0.0)) + vec3(1e-5, 0.0, 0.0));
  vec3 r2 = cross(r1, gw);
  vec3 q = d - gw * fr;
  vec2 p = vec2(dot(q, r1) * uWashSide, dot(q, r2));
  float T = uTime * 0.045;
  vec2 a = (p - vec2(0.21 + 0.035 * sin(T * 1.3), 0.04)) / vec2(0.055, 0.4);
  vec2 b = (p - vec2(0.1 + 0.08 * sin(T * 0.9 + 1.0), 0.3 + 0.05 * sin(T * 0.7))) / vec2(0.32, 0.17);
  vec2 c = (p - vec2(0.16 + 0.1 * sin(T * 0.8 + 4.0), -0.28)) / vec2(0.3, 0.14);
  return (uWashA * exp(-dot(a, a)) + uWashB * exp(-dot(b, b)) + uWashC * exp(-dot(c, c))) * 0.2 * smoothstep(0.0, 0.5, fr);
}

#ifdef CODANI_LIGHT
// Helles Thema: Gewichte der drei Lichtflaechen (gleiche Lage wie washAt), damit sie als blasse Farbtoene mischen
vec3 washG(vec3 d) {
  vec3 gw = uGlowDir;
  float fr = dot(d, gw);
  if (fr <= 0.0) return vec3(0.0);
  vec3 r1 = normalize(cross(gw, vec3(0.0, 1.0, 0.0)) + vec3(1e-5, 0.0, 0.0));
  vec3 r2 = cross(r1, gw);
  vec3 q = d - gw * fr;
  vec2 p = vec2(dot(q, r1) * uWashSide, dot(q, r2));
  float T = uTime * 0.045;
  vec2 a = (p - vec2(0.21 + 0.035 * sin(T * 1.3), 0.04)) / vec2(0.07, 0.42);
  vec2 b = (p - vec2(0.1 + 0.08 * sin(T * 0.9 + 1.0), 0.3 + 0.05 * sin(T * 0.7))) / vec2(0.36, 0.2);
  vec2 c = (p - vec2(0.16 + 0.1 * sin(T * 0.8 + 4.0), -0.28)) / vec2(0.34, 0.16);
  float m = smoothstep(0.0, 0.5, fr);
  return vec3(exp(-dot(a, a)), exp(-dot(b, b)), exp(-dot(c, c))) * m;
}
vec3 washMix(vec3 col, vec3 g, float k) {
  col = mix(col, uWashA, clamp(g.x * k * dot(uWashA, vec3(1.0)), 0.0, 1.0));
  col = mix(col, uWashB, clamp(g.y * k * dot(uWashB, vec3(1.0)), 0.0, 1.0));
  col = mix(col, uWashC, clamp(g.z * k * dot(uWashC, vec3(1.0)), 0.0, 1.0));
  return col;
}

// Helles Thema: Studio-Hohlkehle wie bei einem Produktfoto. Papier oben (uBase), am Horizont heller (uMid), weiches
// weisses Licht hinter dem Motiv (uHi, uGlowDir), blasse Lichtflaechen, Boden mit weichem Kontaktschatten und leiser
// Spiegelung, Linien (Raster, Pakete, Code) in tiefem Tuerkis. Keine Sterne und kein Staub (auf Hell wirken sie wie
// Schmutz). Gleiche Rausch-Zugriffe wie dunkel, eher weniger.
vec3 lightBackdrop(vec3 d, float px, float txt, float det) {
  float e = d.y - uHorizon;
  float cl = dot(d, uGlowDir);
  float lit = max(cl, 0.0);
  vec2 dxz = normalize(d.xz + vec2(1e-5, 0.0));
  vec2 lxz = normalize(uGlowDir.xz + vec2(1e-5, 0.0));
  float side = max(dot(dxz, lxz), 0.0);
  float side2 = side * side;
  float az = atan(d.x, -d.z);
  float hl = max(length(d.xz), 1e-3);
  float tanE = d.y / hl;

  float ae = abs(e);
  vec3 col = mix(uMid, uBase, smoothstep(0.0, 0.75, ae));
  col *= e < 0.0 ? 1.0 - 0.05 * smoothstep(0.0, 0.6, -e) : 1.0;
  float band = exp(-e * e * 30.0);
  col = mix(col, uHi, band * uHorizonGlow * 0.4 * (0.35 + 0.65 * side2));
  col = mix(col, uAccent, pow(max(dot(d, uAccentDir), 0.0), 3.0) * 0.6);

  // weisses Gegenlicht hinter dem Motiv (trennt die weisse Bueste vom Grund: ihre Schattenseite steht davor)
  float gs = max(uGlowSize, 0.2);
  float halo = pow(lit, 9.0 / gs) * 0.55 + pow(lit, 2.4 / gs) * 0.45;
  col = mix(col, uHi, clamp(halo * uGlow * 0.8, 0.0, 1.0));

  vec3 wg = vec3(0.0);
  if (uWash > 0.001) {
    wg = washG(d);
    col = washMix(col, wg, uWash * 0.55 * (1.0 - 0.6 * txt));
  }

  // Boden: gleiche Ebene wie dunkel, Kontaktschatten unter dem Motiv, leise Spiegelung der Lichtflaechen
  float floorMask = 0.0;
  if (uFloor > 0.001 && d.y < -0.001 && uCamPos.y > uFloorY + 0.05) {
    float t = (uFloorY - uCamPos.y) / d.y;
    vec3 P = uCamPos + d * t;
    vec3 r = vec3(d.x, -d.y, d.z);
    float rl = max(dot(r, uGlowDir), 0.0);
    float fres = 0.05 + 0.95 * pow(1.0 - abs(d.y), 5.0);
    vec3 fl = mix(uMid, uBase, 0.55);
    fl = mix(fl, uHi, (pow(rl, 20.0) * 0.5 + pow(rl, 4.0) * 0.2) * uGlow * uFloorShine * (0.3 + 0.7 * fres));
    if (uWash > 0.001) fl = washMix(fl, washG(r), uWash * 0.3 * uFloorShine);
    vec2 pq = P.xz - uPoolAt.xz;
    float pool = exp(-dot(pq, pq) * 0.09) * uPool;
    fl *= 1.0 - 0.11 * pool;
    if (uFloorGrid > 0.001) {
      vec2 g = P.xz / uFloorGrid;
      vec2 fw = max(fwidth(g), vec2(1e-4));
      vec2 gl = abs(fract(g - 0.5) - 0.5) / fw;
      float line = 1.0 - min(min(gl.x, gl.y) * 0.8, 1.0);
      float fade = 1.0 - smoothstep(0.12, 0.45, max(fw.x, fw.y));
      vec2 cg = abs(fract(g - 0.5) - 0.5);
      float dotR = max(0.035, 1.2 * max(fw.x, fw.y));
      float dotm = 1.0 - smoothstep(dotR * 0.5, dotR, length(cg));
      fl = mix(fl, uGridColor, clamp((line * 0.06 + dotm * 0.32) * fade * det, 0.0, 1.0));
#if BD_Q > 0
      if (uStreaks > 0.001) {
        float onZ = (1.0 - min(gl.y, 1.0)) * fade;
        float onX = (1.0 - min(gl.x, 1.0)) * fade;
        float lz = floor(g.y + 0.5);
        float lx = floor(g.x + 0.5);
        float hz = hash12(vec2(lz, 3.7));
        float hx = hash12(vec2(lx, 9.1));
        float pk = 0.0;
        if (hz > 0.72) {
          float ph = fract(g.x * 0.045 + uTime * (0.06 + 0.1 * hz) + hz * 13.0);
          pk += onZ * (smoothstep(0.0, 0.008, ph) * (1.0 - smoothstep(0.008, 0.11, ph)));
        }
        if (hx > 0.78) {
          float ph = fract(-g.y * 0.04 + uTime * (0.05 + 0.08 * hx) + hx * 7.0);
          pk += onX * (smoothstep(0.0, 0.008, ph) * (1.0 - smoothstep(0.008, 0.11, ph)));
        }
        fl = mix(fl, uStreakColor, clamp(pk * uStreaks * 0.55 * det, 0.0, 1.0));
      }
#endif
    }
    float haze = 1.0 - exp(-t * 0.022);
    haze = max(haze, smoothstep(-0.05, -0.002, d.y));
    floorMask = uFloor * (1.0 - haze);
    col = mix(col, fl, floorMask);
  }
  float sky = 1.0 - floorMask;

  // Nebel: ganz leise, helle und etwas dunklere Schwaden (Luft im Studio)
  float dens = 0.0;
  float bioN = 0.5;
  if (uFog > 0.001) {
    vec3 p1 = rotY(d, uFogRot.x) * (2.2 * uFogScale) + vec3(11.3, 4.1, 7.7);
    vec4 n1 = nz(p1);
    float f = n1.x;
    bioN = n1.w;
#if BD_Q > 0
    vec3 p2 = rotY(d, uFogRot.y) * (5.0 * uFogScale) + (n1.yzw - 0.5) * 1.7 + vec3(3.7, 9.2, 1.3);
    vec4 n2 = nz(p2);
    f = f * 0.6 + n2.x * 0.4;
    bioN = n1.w * 0.55 + n2.z * 0.45;
#endif
    dens = smoothstep(0.36, 0.8, f);
    float k = uFog * det * sky;
    col = mix(col, uHi, dens * 0.22 * k * (0.4 + 0.6 * lit));
    col *= 1.0 - (1.0 - dens) * 0.018 * k;
  }

  // Lichtstrahlen: helle, weiche Bahnen (nur aufhellen)
  if (uRays > 0.001) {
    vec3 L = uRayDir;
    float rc = dot(d, L);
    vec3 t1 = normalize(cross(L, abs(L.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 t2 = cross(L, t1);
    vec2 pc = normalize(vec2(dot(d, t1), dot(d, t2)) + vec2(1e-6, 0.0));
    float ang = acos(clamp(rc, -1.0, 1.0));
    float sr = nz(vec3(pc * uRayFreq, uTime * 0.03)).x;
    float streak = smoothstep(0.45, 0.9, sr);
    float fall = exp(-ang * 2.1);
    col = mix(col, uRayColor, clamp(streak * fall * uRays * 0.28 * det * sky, 0.0, 1.0));
  }

  // Gehirn: blasse Schwaden in Flieder und Rose, Raender tuerkis
  if (uAurora > 0.001 && uFog > 0.001) {
    float rim = dens * (1.0 - dens) * 4.0;
    float tone = smoothstep(0.25, 0.75, bioN);
    vec3 bio = mix(uAuroraA, uAuroraB, tone);
    float k = uAurora * det * sky * (0.35 + 0.65 * pow(lit, 1.5));
    col = mix(col, bio, clamp(dens * 0.5 * k, 0.0, 1.0));
    col = mix(col, uAuroraEdge, clamp(rim * pow(lit, 2.0) * 0.35 * k, 0.0, 1.0));
  }

  // Messraster, Scanlinie und Messkreis: feine Linien in Tuerkis
  if (uGrid > 0.001) {
    float ga = az * (180.0 / 3.14159265 / 8.0);
    float gaw = max(fwidth(ga), 1e-4);
    float ge = tanE / 0.14;
    float gew = max(fwidth(ge), 1e-4);
    float la = aaLine(fract(ga + 0.5) - 0.5, gaw, 0.0);
    float le = aaLine(fract(ge + 0.5) - 0.5, gew, 0.0);
    float gridL = max(la, le) * (1.0 - smoothstep(0.25, 0.7, max(gaw, gew)));
    float gw = gridL * (0.3 + 0.7 * exp(-e * e * 5.0)) * (0.35 + 0.65 * side);
    col = mix(col, uGridColor, clamp(gw * uGrid * 1.6 * det, 0.0, 1.0));
    if (uScan > 0.001) {
      float sd = tanE - uScanTan;
      float sw = max(fwidth(tanE), 1e-5);
      float line = aaLine(sd, sw, 0.5);
      float trail = step(0.0, sd) * exp(-sd * 7.0);
      col = mix(col, uGridColor, clamp((line * 0.7 + trail * 0.05) * uScan * det, 0.0, 1.0));
    }
    float rc = dot(d, uRingDir);
    float rw = max(fwidth(rc), 1e-6);
    float ring = aaLine(rc - uRingCos, rw, 0.3);
    vec3 rt1 = normalize(cross(uRingDir, vec3(0.0, 1.0, 0.0)));
    vec3 rt2 = cross(uRingDir, rt1);
    float ra = atan(dot(d, rt2), dot(d, rt1)) * (60.0 / TAU);
    float raw = max(fwidth(ra), 1e-4);
    float tick = aaLine(fract(ra + 0.5) - 0.5, raw, 0.4)
      * (1.0 - smoothstep(0.0, 1.0, abs(rc - uRingCos - 0.006) / 0.006));
    col = mix(col, uGridColor, clamp((ring * 0.3 + tick * 0.22) * uGrid * 3.0 * det, 0.0, 1.0));
  }

  // Code auf der Tunnelwand: leise Zeichen in Tinte
  if (uCode > 0.001) {
    vec2 o2 = uCamPos.xy - vec2(0.0, 0.5);
    vec2 d2 = d.xy;
    float a = dot(d2, d2);
    float c = dot(o2, o2) - 30.25;
    if (a > 1e-5 && c < 0.0) {
      float b = dot(o2, d2);
      float t = (-b + sqrt(max(b * b - a * c, 0.0))) / a;
      vec3 P = uCamPos + d * t;
      float th = atan(P.y - 0.5, P.x);
      float u = (th / TAU + 0.5) * 96.0;
      float rowf0 = P.z / 0.5;
      float ci = floor(u);
      float hc = hash12(vec2(ci, 7.1));
      float rowf = rowf0 + uTime * (1.2 + 2.4 * hc) + hc * 50.0;
      float ri = floor(rowf);
      float len = 10.0 + floor(hc * 16.0);
      float ph = fract((ri + floor(hc * 997.0)) / len);
      float bright = exp(-ph * 7.0) * step(ph, 0.75);
      bright *= step(0.42, hash12(vec2(ci, 1.3)));
      vec2 lc = vec2(fract(u), fract(rowf));
      vec2 cw = max(fwidth(vec2(u, rowf)), vec2(1e-4));
      float cellPx = 1.0 / max(cw.x, cw.y);
      vec2 gq = (lc - vec2(0.18, 0.12)) / vec2(0.64, 0.76);
      float glyph = 0.42;
#if BD_Q > 0
      if (cellPx > 7.0) {
        vec2 gi = floor(gq * vec2(3.0, 5.0));
        float inside = step(0.0, gq.x) * step(gq.x, 0.999) * step(0.0, gq.y) * step(gq.y, 0.999);
        float flick = floor(uTime * (0.6 + 4.0 * step(0.86, hash12(vec2(ri, ci)))));
        float bit = step(0.48, hash13(vec3(ci * 3.0 + gi.x, ri * 5.0 + gi.y, flick)));
        vec2 gf = fract(gq * vec2(3.0, 5.0)) - 0.5;
        float dotm = 1.0 - smoothstep(0.32, 0.48, max(abs(gf.x), abs(gf.y)));
        glyph = mix(0.42, inside * bit * dotm, smoothstep(7.0, 13.0, cellPx));
      }
#endif
      float fadeZ = exp(-abs(P.z - uCamPos.z) * 0.045);
      col = mix(col, uCodeColor, clamp(bright * glyph * fadeZ * uCode * 2.2 * det, 0.0, 1.0));
    }
  }

  // Bokeh: wenige, sehr weiche helle Scheiben (Licht im Objektiv), nur aufhellen
  if (uBokeh > 0.001) {
    vec3 q = rotY(d, uTime * 0.006) * 6.5 + vec3(0.0, uTime * 0.018, 0.0);
    vec3 ci = floor(q);
    vec3 h = hash33(ci + 17.0);
    if (h.x > 0.55) {
      vec3 cc = 0.25 + 0.5 * hash33(ci + 3.1);
      float rr = 0.1 + 0.14 * h.y;
      float dd = length(fract(q) - cc);
      float disc = 1.0 - smoothstep(rr * 0.7, rr, dd);
      col = mix(col, uBokehColor, clamp(disc * (0.2 + 0.3 * h.z) * uBokeh * det, 0.0, 1.0));
    }
  }
  return col * uPaper;
}
#endif

void main() {
  vec3 d = normalize(vDir);
  vec2 suv = gl_FragCoord.xy / uRes;
  float px = max(length(fwidth(d)), 1e-5); // Winkelgroesse eines Pixels (rad)

  // Textzone: Muster dort leiser (das Bild darunter dunkelt der FxPass-Scrim zusaetzlich ab)
  float txt = 0.0;
  if (uScrimA > 0.001) {
    vec2 q = (suv - uScrimRect.xy) / max(uScrimRect.zw, vec2(1e-3));
    float dq = length(max(abs(q) - vec2(0.62), vec2(0.0)));
    txt = clamp(uScrimA * 1.6, 0.0, 1.0) * (1.0 - smoothstep(0.0, 0.85, dq));
  }
  float det = uDetail * (1.0 - 0.75 * txt);

#ifdef CODANI_LIGHT
  gl_FragColor = vec4(max(lightBackdrop(d, px, txt, det), vec3(0.0)), 1.0);
  return;
#endif

  float e = d.y - uHorizon;
  float cl = dot(d, uGlowDir);
  float lit = max(cl, 0.0);
  vec2 dxz = normalize(d.xz + vec2(1e-5, 0.0));
  vec2 lxz = normalize(uGlowDir.xz + vec2(1e-5, 0.0));
  float side = max(dot(dxz, lxz), 0.0);
  float side2 = side * side;
  float az = atan(d.x, -d.z);
  float hl = max(length(d.xz), 1e-3);
  float tanE = d.y / hl;

  /* ---- Verlauf und Horizont (Hohlkehle) */
  float ae = abs(e);
  vec3 col = mix(uMid, uBase, smoothstep(0.02, 0.6, ae));
  col *= e < 0.0 ? 1.0 - 0.3 * smoothstep(0.0, 0.55, -e) : 1.0;
  float band = exp(-e * e * 70.0);
  float bandWide = exp(-e * e * 8.0);
  col += uHi * (band * 0.16 + bandWide * 0.035) * uHorizonGlow * (0.2 + 0.8 * side2);
  col += uAccent * pow(max(dot(d, uAccentDir), 0.0), 3.0) * 0.6;

  /* ---- Gegenlicht-Halo: heller Kern, weicher Hof, breiter Schein (Studio-Hintergrund) */
  float gs = max(uGlowSize, 0.2);
  float halo = pow(lit, 70.0 / gs) * 0.6 + pow(lit, 10.0 / gs) * 0.26 + pow(lit, 2.6 / gs) * 0.07;
  col += uHi * halo * uGlow * 0.22;

  /* ---- Lichtflaechen (Farbflaechen um das Gegenlicht, siehe washAt) */
  if (uWash > 0.001) col += washAt(d) * uWash * (1.0 - 0.6 * txt);

  /* ---- Boden (echte Ebene, Parallaxe) */
  float floorMask = 0.0;
  if (uFloor > 0.001 && d.y < -0.001 && uCamPos.y > uFloorY + 0.05) {
    float t = (uFloorY - uCamPos.y) / d.y;
    vec3 P = uCamPos + d * t;
    vec3 r = vec3(d.x, -d.y, d.z);
    float rl = max(dot(r, uGlowDir), 0.0);
    float fres = 0.05 + 0.95 * pow(1.0 - abs(d.y), 5.0);
    // glaenzende Spiegelung: Lichtquelle als in die Tiefe gezogener Streifen, Horizont gespiegelt
    float er = r.y - uHorizon;
    vec3 refl = uHi * (pow(rl, 26.0) * 0.55 + pow(rl, 5.0) * 0.14) * uGlow * 0.22;
    refl += uHi * exp(-er * er * 26.0) * uHorizonGlow * 0.1 * (0.2 + 0.8 * side2);
    float lane = pow(side, 90.0) * exp(-abs(d.y) * 3.0);
    refl += uHi * lane * 0.05 * uGlow;
    // Studio-Boden (Version 4): gespiegelte Lichtflaechen, Lichtkegel auf dem Boden um den Fuss des Motivs (uPoolAt)
    // und eine feine Lichtkante dort, wo der Boden in die Hohlkehle uebergeht
    if (uWash > 0.001) refl += washAt(r) * uWash * 0.55;
    vec2 pq = P.xz - uPoolAt.xz;
    float pool = exp(-dot(pq, pq) * 0.06) * uPool;
    refl += uHi * exp(-pow((d.y + 0.006) / 0.012, 2.0)) * uHorizonGlow * 0.08 * (0.3 + 0.7 * side2);
    vec3 fl = uBase * 0.6 + uHi * pool * 0.045 + refl * (0.3 + 0.7 * fres) * uFloorShine;
    if (uFloorGrid > 0.001) {
      vec2 g = P.xz / uFloorGrid;
      vec2 fw = max(fwidth(g), vec2(1e-4));
      vec2 gl = abs(fract(g - 0.5) - 0.5) / fw;
      float line = 1.0 - min(min(gl.x, gl.y) * 0.8, 1.0);
      float fade = 1.0 - smoothstep(0.12, 0.45, max(fw.x, fw.y));
      // Punkte an den Kreuzungen (ruhiger als ein volles Raster), die Linien nur als Hauch
      vec2 cg = abs(fract(g - 0.5) - 0.5);
      float dotR = max(0.035, 1.2 * max(fw.x, fw.y));
      float dotm = 1.0 - smoothstep(dotR * 0.5, dotR, length(cg));
      fl += uGridColor * (line * 0.1 + dotm * 0.55) * fade * det;
#if BD_Q > 0
      // Datenpakete laufen auf einzelnen Rasterlinien
      if (uStreaks > 0.001) {
        float onZ = (1.0 - min(gl.y, 1.0)) * fade; // Linie z = konst., Paket laeuft in x
        float onX = (1.0 - min(gl.x, 1.0)) * fade; // Linie x = konst., Paket laeuft in z
        float lz = floor(g.y + 0.5);
        float lx = floor(g.x + 0.5);
        float hz = hash12(vec2(lz, 3.7));
        float hx = hash12(vec2(lx, 9.1));
        float pk = 0.0;
        if (hz > 0.72) {
          float ph = fract(g.x * 0.045 + uTime * (0.06 + 0.1 * hz) + hz * 13.0);
          pk += onZ * (smoothstep(0.0, 0.008, ph) * (1.0 - smoothstep(0.008, 0.11, ph)));
        }
        if (hx > 0.78) {
          float ph = fract(-g.y * 0.04 + uTime * (0.05 + 0.08 * hx) + hx * 7.0);
          pk += onX * (smoothstep(0.0, 0.008, ph) * (1.0 - smoothstep(0.008, 0.11, ph)));
        }
        fl += uStreakColor * pk * uStreaks * 1.2 * det;
      }
#endif
    }
    // in der Tiefe in den Horizont-Dunst auslaufen
    float haze = 1.0 - exp(-t * 0.022);
    haze = max(haze, smoothstep(-0.05, -0.002, d.y));
    floorMask = uFloor * (1.0 - haze);
    col = mix(col, fl, floorMask);
  }
  float sky = 1.0 - floorMask;

  /* ---- Nebel: zwei Schichten, verschieden schnell um Y gedreht (Parallaxe), vom Gegenlicht beleuchtet */
  float dens = 0.0;
  float bioN = 0.5;
  if (uFog > 0.001) {
    vec3 p1 = rotY(d, uFogRot.x) * (2.2 * uFogScale) + vec3(11.3, 4.1, 7.7);
    vec4 n1 = nz(p1);
    float f = n1.x;
    bioN = n1.w;
#if BD_Q > 0
    vec3 p2 = rotY(d, uFogRot.y) * (5.0 * uFogScale) + (n1.yzw - 0.5) * 1.7 + vec3(3.7, 9.2, 1.3);
    vec4 n2 = nz(p2);
    f = f * 0.6 + n2.x * 0.4;
    bioN = n1.w * 0.55 + n2.z * 0.45;
#if BD_Q > 1
    vec4 n3 = nz(p2 * 2.1 + vec3(5.1, 1.7, 9.3));
    f = f * 0.84 + n3.y * 0.16;
#endif
#endif
    dens = smoothstep(0.36, 0.8, f);
    float lf = 0.2 + 0.95 * pow(lit, 3.0) + 0.3 * band * side;
    vec3 fc = mix(uMid * 1.5, uHi, clamp(0.12 + 0.9 * pow(lit, 2.0), 0.0, 1.0));
    col += fc * dens * lf * uFog * 0.14 * det * (1.0 - 0.5 * floorMask);
  }

  /* ---- Lichtstrahlen um die eigene Quelle (uRayDir), im Nebel staerker (wirkt volumetrisch) */
  if (uRays > 0.001) {
    vec3 L = uRayDir;
    float rc = dot(d, L);
    vec3 t1 = normalize(cross(L, abs(L.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 t2 = cross(L, t1);
    vec2 pc = normalize(vec2(dot(d, t1), dot(d, t2)) + vec2(1e-6, 0.0));
    float ang = acos(clamp(rc, -1.0, 1.0));
    float s = nz(vec3(pc * uRayFreq, uTime * 0.03)).x;
#if BD_Q > 0
    s = s * 0.62 + nz(vec3(pc * uRayFreq * 2.7, 7.3 + uTime * 0.05)).y * 0.38;
#endif
    float streak = smoothstep(0.4, 0.9, s);
    float fall = exp(-ang * 2.1);
    col += uRayColor * streak * fall * (0.4 + 0.6 * dens) * uRays * 0.1 * det * (1.0 - 0.6 * floorMask);
  }

  /* ---- Biolumineszenz (Farbwelt Gehirn): die Nebelschwaden selbst leuchten violett bis magenta, ihre Raender
     tuerkis. Haengt nur an der Blickrichtung, nicht am Horizont (die Kamera schaut im Gehirn steil nach unten). */
  if (uAurora > 0.001 && uFog > 0.001) {
    float rim = dens * (1.0 - dens) * 4.0;
    float tone = smoothstep(0.25, 0.75, bioN);
    vec3 bio = mix(uAuroraA, uAuroraB, tone);
    float bl = 0.35 + 0.65 * pow(lit, 1.5);
    col += (bio * dens * 0.7 + uAuroraEdge * rim * pow(lit, 2.0) * 0.5) * bl * uAurora * 0.16 * det * sky;
  }

  /* ---- Messraster (Scan-Labor): Zylinder-Raster, Scanlinie, Messkreis um den Kopf */
  if (uGrid > 0.001) {
    float ga = az * (180.0 / 3.14159265 / 8.0);
    float gaw = max(fwidth(ga), 1e-4);
    float ge = tanE / 0.14;
    float gew = max(fwidth(ge), 1e-4);
    float la = aaLine(fract(ga + 0.5) - 0.5, gaw, 0.0);
    float le = aaLine(fract(ge + 0.5) - 0.5, gew, 0.0);
    float gridL = max(la, le) * (1.0 - smoothstep(0.25, 0.7, max(gaw, gew)));
    float gw = gridL * (0.3 + 0.7 * exp(-e * e * 5.0)) * (0.35 + 0.65 * side);
    col += uGridColor * gw * uGrid * 0.9 * det;
    if (uScan > 0.001) {
      float sd = tanE - uScanTan;
      float sw = max(fwidth(tanE), 1e-5);
      float line = aaLine(sd, sw, 0.5);
      float trail = step(0.0, sd) * exp(-sd * 7.0);
      col += uHi * (line * 1.1 + trail * 0.07) * uScan * det;
    }
    float rc = dot(d, uRingDir);
    float rw = max(fwidth(rc), 1e-6);
    float ring = aaLine(rc - uRingCos, rw, 0.3);
    // Teilstriche alle 6 Grad, ein wenig innerhalb des Kreises
    vec3 rt1 = normalize(cross(uRingDir, vec3(0.0, 1.0, 0.0)));
    vec3 rt2 = cross(uRingDir, rt1);
    float ra = atan(dot(d, rt2), dot(d, rt1)) * (60.0 / TAU);
    float raw = max(fwidth(ra), 1e-4);
    float tick = aaLine(fract(ra + 0.5) - 0.5, raw, 0.4)
      * (1.0 - smoothstep(0.0, 1.0, abs(rc - uRingCos - 0.006) / 0.006));
    col += uHi * (ring * 0.5 + tick * 0.35) * uGrid * det;
  }

  /* ---- Code-Regen auf der Tunnelwand um die Helix-Achse (Zylinder r 5.5, Achse x 0, y 0.5) */
  if (uCode > 0.001) {
    vec2 o2 = uCamPos.xy - vec2(0.0, 0.5);
    vec2 d2 = d.xy;
    float a = dot(d2, d2);
    float c = dot(o2, o2) - 30.25;
    if (a > 1e-5 && c < 0.0) {
      float b = dot(o2, d2);
      float t = (-b + sqrt(max(b * b - a * c, 0.0))) / a;
      vec3 P = uCamPos + d * t;
      float th = atan(P.y - 0.5, P.x);
      float u = (th / TAU + 0.5) * 96.0;
      float rowf0 = P.z / 0.5;
      float ci = floor(u);
      float hc = hash12(vec2(ci, 7.1));
      float rowf = rowf0 + uTime * (1.2 + 2.4 * hc) + hc * 50.0;
      float ri = floor(rowf);
      float len = 10.0 + floor(hc * 16.0);
      float ph = fract((ri + floor(hc * 997.0)) / len);
      float bright = exp(-ph * 7.0) * step(ph, 0.75);
      bright *= step(0.42, hash12(vec2(ci, 1.3)));          // nicht jede Spalte laeuft
      vec2 lc = vec2(fract(u), fract(rowf));
      vec2 cw = max(fwidth(vec2(u, rowf)), vec2(1e-4));
      float cellPx = 1.0 / max(cw.x, cw.y);
      // Zeichen als 3 x 5 Punktmatrix, nur wenn die Zelle gross genug ist (sonst mittlere Deckung, kein Flimmern)
      vec2 gq = (lc - vec2(0.18, 0.12)) / vec2(0.64, 0.76);
      float glyph = 0.42;
#if BD_Q > 0
      if (cellPx > 7.0) {
        vec2 gi = floor(gq * vec2(3.0, 5.0));
        float inside = step(0.0, gq.x) * step(gq.x, 0.999) * step(0.0, gq.y) * step(gq.y, 0.999);
        float flick = floor(uTime * (0.6 + 4.0 * step(0.86, hash12(vec2(ri, ci)))));
        float bit = step(0.48, hash13(vec3(ci * 3.0 + gi.x, ri * 5.0 + gi.y, flick)));
        vec2 gf = fract(gq * vec2(3.0, 5.0)) - 0.5;
        float dotm = 1.0 - smoothstep(0.32, 0.48, max(abs(gf.x), abs(gf.y)));
        glyph = mix(0.42, inside * bit * dotm, smoothstep(7.0, 13.0, cellPx));
      }
#endif
      float fadeZ = exp(-abs(P.z - uCamPos.z) * 0.045);
      vec3 cc = mix(uCodeColor, vec3(0.85, 1.0, 0.95), smoothstep(0.03, 0.0, ph) * 0.6);
      col += cc * bright * glyph * fadeZ * uCode * det;
    }
  }

  /* ---- Sterne (fein, funkelnd) und Staub (weich, steigt langsam) */
  if (uStars > 0.001) {
    vec3 q = d * 150.0;
    vec3 ci = floor(q);
    vec3 h = hash33(ci);
    if (h.x > 0.72) {
      vec3 sp = 0.3 + 0.4 * hash33(ci + 13.7);
      float dist = length(fract(q) - sp);
      float pxc = px * 150.0;
      float r0 = 0.04;
      float r = max(r0, pxc * 0.75);
      float b = pow(h.y, 7.0) * 9.0 * (r0 * r0) / (r * r);
      float tw = 0.7 + 0.3 * sin(uTime * (0.8 + 2.5 * h.z) + h.x * 40.0);
      col += uStarColor * b * tw * (1.0 - smoothstep(0.0, r, dist)) * uStars * det * sky;
    }
  }
#if BD_Q > 0
  if (uDust > 0.001) {
    vec3 q = rotY(d, uTime * 0.012) * 24.0 + vec3(0.0, -uTime * 0.12, 0.0);
    vec3 ci = floor(q);
    vec3 h = hash33(ci + 5.3);
    if (h.x > 0.78) {
      vec3 sp = 0.3 + 0.4 * hash33(ci + 2.9);
      float dist = length(fract(q) - sp);
      float r = 0.05 + 0.07 * h.y;
      float m = 1.0 - smoothstep(r * 0.2, r, dist);
      col += mix(uHi, uStarColor, 0.35) * m * (0.08 + 0.18 * h.z) * uDust * det * (0.35 + 0.65 * lit);
    }
  }
#endif

  /* ---- Bokeh: weiche Scheiben mit hellerem Rand (Objektiv), sehr leise */
  if (uBokeh > 0.001) {
    vec3 q = rotY(d, uTime * 0.006) * 6.5 + vec3(0.0, uTime * 0.018, 0.0);
    vec3 ci = floor(q);
    vec3 h = hash33(ci + 17.0);
    if (h.x > 0.5) {
      vec3 cc = 0.25 + 0.5 * hash33(ci + 3.1);
      float rr = 0.1 + 0.14 * h.y;
      float dd = length(fract(q) - cc);
      float disc = 1.0 - smoothstep(rr * 0.84, rr, dd);
      float rim = smoothstep(rr * 0.5, rr * 0.93, dd) * disc;
      vec3 bc = mix(uBokehColor, uHi, h.z);
      col += bc * (disc * 0.45 + rim * 0.55) * (0.08 + 0.16 * h.z) * uBokeh * det;
    }
  }

  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;
