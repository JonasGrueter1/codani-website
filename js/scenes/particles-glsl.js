// Szene "particles": GLSL-Shader (Partikel, Lichtkegel). Den Raum dahinter zeichnet backdrop.js.
// Alles laeuft auf der GPU: Position = f(Startwert, Zeit, Formung). Kein Zustand, darum auch rueckwaerts scrollbar.

/* --------------------------------------------------------------- Rauschen */
// Simplex-Rauschen 3D mit analytischem Gradienten (Ashima Arts / Stefan Gustavson, MIT)
export const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoiseGrad(vec3 v, out vec3 gradient) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  vec4 m2 = m * m;
  vec4 m4 = m2 * m2;
  vec4 pdotx = vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3));
  vec4 temp = m2 * m * pdotx;
  gradient = -8.0 * (temp.x * x0 + temp.y * x1 + temp.z * x2 + temp.w * x3);
  gradient += m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3;
  gradient *= 105.0;
  return 105.0 * dot(m4, pdotx);
}

// Curl-Rauschen: divergenzfreies Stroemungsfeld (wirkt wie Luftwirbel).
// CURL_LITE: ein einziger Rauschwert (Gradient x feste Achse), fuer schwache Geraete.
vec3 curlNoise(vec3 p) {
  vec3 g1;
  snoiseGrad(p, g1);
#ifdef CURL_LITE
  return cross(g1, vec3(0.38, 0.86, 0.34));
#else
  vec3 g2;
  vec3 g3;
  snoiseGrad(p + vec3(31.416, -47.853, 12.793), g2);
  snoiseGrad(p + vec3(-23.145, -11.408, -18.531), g3);
  return vec3(g3.y - g2.z, g1.z - g3.x, g2.x - g1.y);
#endif
}
`;

/* -------------------------------------------------------------- Partikel */
export const POINTS_VERT = /* glsl */ `
attribute vec3 aTarget;   // Ziel auf dem Roboter
attribute vec4 aRand;     // x Groesse, y Phase, z Farbe, w Helligkeit
attribute vec4 aInfo;     // x Art, y Reihenfolge, z Wirbel, w Sichtbarkeit / Ebene
attribute float aHw;      // 1 = Teil des Kopfes (folgt der Kopfbewegung)

uniform float uTime;
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uForm;      // 0..1 Formung (pro Partikel versetzt)
uniform float uGather;    // 0..1 Vorbereitung: Wolke zieht sich zusammen, dreht
uniform float uHolo;      // 0..1 Hologramm des Roboters ist da: fertige Partikel treten zurueck (nur Funkeln)
uniform float uBuildY;    // Hoehe der Abtastebene des Roboters: darunter gehen die Partikel in die Schale ueber
uniform float uAlpha;
uniform float uIgnite;    // 0..1 Aufleuchten nach dem Preloader
uniform float uFocus;     // Schaerfe-Ebene (Abstand Kamera)
uniform float uAperture;  // Blende: Groesse der Unschaerfe-Kreise
uniform float uFog;
uniform float uSize;
uniform float uBokeh;
uniform float uHint;      // 0..1 lose angedeuteter Kopf im Hero (Teil der Form-Partikel wartet schon nah am Ziel)
uniform vec2 uPreGain;    // Hero-Bueste: x Helligkeit, y Punktgroesse (Querformat hoeher: der Kopf ist dort kleiner im Bild)
uniform vec2 uPreSurf;    // Hero-Bueste, Flaechen: x Anteil der Partikel am Ziel, y Helligkeit (viele Partikel: weniger, heller)
uniform vec3 uBoxC;       // Schwebe-Wolke: Mitte
uniform vec3 uBoxH;       // Schwebe-Wolke: halbe Ausdehnung
uniform vec4 uTextArea;   // Bereich des Titels (NDC: Mitte xy, Radien zw): Partikel dort gedaempft, solange der Titel steht
uniform float uTitle;
uniform vec2 uPointer;    // Maus in NDC
uniform float uPointerAmt;
uniform mat4 uHeadMat;    // Kopfbewegung wie im Roboter (Drehung um den Hals)
uniform float uBodyY;     // Atmen des Rumpfs
uniform vec3 uBeamA;      // Lichtkegel: Spitze
uniform vec3 uBeamD;      // Richtung (normiert)
uniform vec2 uBeamR;      // Radius an der Spitze, Zunahme pro Einheit
uniform float uBeam;
uniform vec3 uColA;       // Signal
uniform vec3 uColB;       // Eis
uniform vec3 uColC;       // Glut
uniform vec3 uColW;       // Weiss

varying vec3 vColor;
varying float vBlur;
varying vec4 vStreak;     // xy Richtung * halbe Laenge (Punkt-Koordinaten), z Kernradius, w 1 = Spur

const float PI = 3.14159265;
const float TAU = 6.28318531;

${NOISE}

vec3 rotY(vec3 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

// Flugbahn: der Startpunkt dreht sich leicht um die Hochachse (alle in dieselbe Richtung) und wird dabei
// zum Ziel gezogen: eine sanfte Spirale nach innen. Ohne Winkel-Spruenge, darum auch bei stehendem Scroll ruhig.
vec3 formPath(vec3 p, vec3 tgt, float f, float spin) {
  float eR = f * f * (3.0 - 2.0 * f);
  float eA = 1.0 - (1.0 - f) * (1.0 - f);
  float bump = sin(PI * f);
  vec3 src = rotY(p, (0.55 + 0.45 * aInfo.z) * eA * spin);
  vec3 q = mix(src, tgt, eR);
  q.y += bump * (aRand.y - 0.5) * 0.22 * spin;
  return q;
}

void main() {
  float kind = aInfo.x;
  float t = uTime;
  bool isForm = kind < 2.5;
  bool isDust = kind > 2.5 && kind < 3.5;
  bool isFar = kind > 3.5;

  /* --- Schweben */
  vec3 p;
  float edge = 1.0;
  if (isFar) {
    p = position + vec3(sin(t * 0.031 + aRand.y * TAU), cos(t * 0.023 + aRand.y * 9.0), 0.0) * 0.8;
  } else if (isDust) {
    // Staub steigt langsam und kommt unten wieder (Box wird umgebrochen, Raender blenden weich aus)
    vec3 q = fract(position + vec3(0.0016, 0.0042, 0.0011) * t * (0.55 + aRand.x));
    vec3 e3 = smoothstep(vec3(0.0), vec3(0.09), q) * (1.0 - smoothstep(vec3(0.91), vec3(1.0), q));
    edge = e3.x * e3.y * e3.z;
    vec3 boxC = uBoxC;
    vec3 boxH = uBoxH;
    if (aInfo.w > 0.5) { // Vordergrund-Ebene nah an der Kamera
      boxC = vec3(uBoxC.x, uBoxC.y, 9.0);
      boxH = vec3(uBoxH.x * 0.62, uBoxH.y * 0.62, 3.6);
    }
    p = boxC + (q * 2.0 - 1.0) * boxH;
  } else {
    p = uBoxC + position * uBoxH;
    p += vec3(sin(t * 0.11 + aRand.y * TAU), sin(t * 0.087 + aRand.y * 4.1), cos(t * 0.097 + aRand.y * 5.3)) * 0.22;
  }
  if (!isFar) {
    vec3 c = curlNoise(p * 0.16 + vec3(0.0, -t * 0.045, t * 0.03));
    p += c * (0.42 + 0.25 * uGather);
    float rr = length(p.xz);
    p = rotY(p, t * 0.016 + uGather * 0.55 / (1.0 + rr * 0.12));
    p.xz *= 1.0 - 0.16 * uGather;
    p.y *= 1.0 - 0.1 * uGather;
  }

  /* --- Formung zum Roboter */
  float f = 0.0;
  float flash = 0.0;
  vec3 nrm = normal;
  vec3 tgt = aTarget;
  float pre = 0.0;
  if (isForm) {
    tgt = mix(aTarget, (uHeadMat * vec4(aTarget, 1.0)).xyz, aHw);
    tgt.y += uBodyY;
    nrm = normalize(mix(normal, mat3(uHeadMat) * normal, aHw));
    tgt += nrm * (0.005 * sin(t * 1.7 + aRand.y * 40.0));
    // Hero: die Bueste steht schon zu etwa zwei Dritteln aus Licht (Kopf und Augen dichter, Schultern lockerer),
    // atmet mit dem Rumpf und folgt mit dem Kopf der Maus. Beim Scrollen verdichtet sie sich zum Hologramm.
    // Linien (Fugen, Plattenkanten, Kabel) sind im Hero alle da: sie machen die Android-Form lesbar
    // Runde 2: der Kopf steht im ersten Bild fertig geformt (Flaechen 90 %, Linien ganz, eng an der Form), nur der Rumpf
    // bleibt lockerer. Die Wolke loest sich erst beim Scrollen in den Flug zum Hologramm auf.
    float isLine = (kind > 0.5 && kind < 1.5) ? 1.0 : 0.0;
    float share = kind > 1.5 ? 0.95 : (isLine > 0.5 ? 1.0 : (aHw > 0.5 ? uPreSurf.x : 0.66 * smoothstep(-3.3, -2.7, aTarget.y)));
    pre = step(aInfo.z, share) * uHint;
    if (pre > 0.0) {
      vec3 jd = normalize(vec3(sin(aRand.y * 91.7), cos(aRand.y * 37.3 + aRand.x * 5.0), sin(aRand.x * 53.1) + 0.01));
      // Streuung: Linien praktisch auf der Fuge (scharf), Kopfflaechen eng, Rumpf lockerer
      float tight = kind > 1.5 ? 0.15 : (isLine > 0.5 ? 0.08 : (aHw > 0.5 ? 0.35 : 0.8));
      float rad = (0.008 + 0.09 * aRand.x * aRand.x * aRand.x) * tight;
      vec3 dr = vec3(sin(t * 0.31 + aRand.y * TAU), sin(t * 0.23 + aRand.x * 9.0), cos(t * 0.27 + aRand.y * 5.0)) * (0.006 + 0.022 * tight);
      // Kabel: Lichtpunkte fliessen langsam vom Hinterkopf nach hinten unten weg (wie die Kabel in Referenz 1)
      vec3 flow = vec3(0.0);
      if (abs(kind - 1.25) < 0.1) { float ph = fract(t * 0.06 + aRand.y); flow = vec3(sign(tgt.x) * 0.08, -0.32, -0.62) * ph * ph; }
      p = mix(p, tgt + flow + jd * rad * (abs(kind - 1.25) < 0.1 ? 3.0 : 1.0) + nrm * ((0.004 + 0.03 * aRand.w) * tight + 0.004) + dr, pre);
    }
  }
  vec3 pos = p;
  if (isForm) {
    float delay = aInfo.y * 0.42 + aInfo.z * 0.34;
    float k = (uForm - delay) / 0.24;
    f = clamp(k, 0.0, 1.0);
    flash = smoothstep(0.82, 1.0, k) * (1.0 - smoothstep(1.0, 1.7, k));
    if (f > 0.0) pos = formPath(p, tgt, f, 1.0 - pre);
  }

  /* --- Farbe und Helligkeit */
  // Wenige helle Funken (hero) zwischen vielen feinen, schwachen Staubkoernern: gibt Tiefe statt Rauschen
  float hero = step(0.86, aRand.w);
  float tw = mix(0.8, 0.55, hero) + mix(0.2, 0.45, hero) * sin(t * (0.6 + aRand.x * 1.8) + aRand.y * 31.0);
  vec3 col = mix(uColA, uColB, pow(aRand.z, 3.0) * 0.9);
  if (aRand.z > 0.988) col = uColC; // warme Funken nur vereinzelt
  float bright = mix(0.06 + 0.22 * aRand.w, 0.9 + 11.0 * (aRand.w - 0.86), hero) * tw;
  float wsize = uSize * mix(0.45 + 0.55 * aRand.x, 0.8 + 1.5 * aRand.x * aRand.x, hero);
  if (isDust) {
    bright = (0.05 + 0.1 * aRand.w) * tw;
    wsize = uSize * (0.35 + 0.4 * aRand.x);
    col = mix(col, uColW, 0.3);
    // Vordergrund nah an der Kamera: hoechstens halbe Groesse und Deckkraft (grosse Baelle wirken wie Flecken)
    if (aInfo.w > 0.5) { bright = (0.35 + 0.4 * aRand.w) * 0.5; wsize = uSize * (0.6 + 0.7 * aRand.x); }
  }
  if (isFar) {
    col = aRand.z > 0.95 ? uColC : (aRand.z > 0.45 ? uColA : uColW);
    bright = 0.14 + 0.4 * aRand.w;
    wsize = 0.16 + 0.34 * aRand.x;
  }

  // Lichtkegel: Staub leuchtet auf, wenn er durchs Licht treibt
  vec3 bv = pos - uBeamA;
  float along = dot(bv, uBeamD);
  float perp = length(bv - uBeamD * along);
  float radius = uBeamR.x + uBeamR.y * max(along, 0.0);
  float inBeam = (1.0 - smoothstep(0.25 * radius, radius, perp)) * smoothstep(1.0, 5.0, along) * (1.0 - smoothstep(11.0, 15.0, along));
  if (!isFar) {
    float lit = inBeam * uBeam * (isDust ? 5.0 : 1.6 - 1.1 * hero) * (1.0 - f);
    bright *= 1.0 + lit;
    col = mix(col, uColW, clamp(lit * 0.45, 0.0, 0.8));
  }

  if (pre > 0.0) {
    // Bueste aus Licht im Hero: Silhouette hell, Flaechen fein, Rueckseite gedaempft, Pupillen als ruhige Lichtpunkte
    vec3 Vp = normalize(cameraPosition - tgt);
    float ndp = dot(nrm, Vp);
    float rimP = 1.0 - abs(ndp);
    float backP = ndp < 0.0 ? 0.35 : 1.0;
    float twP = 0.75 + 0.25 * sin(t * (0.7 + aRand.x) + aRand.y * 20.0);
    // Kantenlicht von rechts hinten: zeichnet Schaedel, Wange und Schulter als helle Kontur
    float rl = max(dot(nrm, normalize(vec3(0.75, 0.35, -0.55))), 0.0);
    // weiches Fuehrungslicht von links oben vorne: modelliert Stirn, Wangen und Kinn (sonst wirkt das Gesicht hohl)
    float kl = max(dot(nrm, normalize(vec3(-0.35, 0.55, 0.75))), 0.0);
    float bp = (0.15 + 0.55 * kl * kl + 2.3 * rimP * rimP * rimP) * backP * twP * (aHw > 0.5 ? uPreSurf.y : 1.2) * (1.0 + 2.4 * rl * rl);
    vec3 pc = mix(mix(uColA, uColB, 0.35 + 0.4 * rimP), uColW, 0.3 * rl + 0.25 * kl);
    // Groesse: mindestens rund 3 Bildpunkte, sonst ist der Kern kleiner als ein Bildpunkt (graues Flimmern statt Licht)
    float ps = uSize * (0.62 + 0.38 * aRand.x);
    if (kind > 0.5 && kind < 1.5) {
      // Fugen der Gesichtsplatten, Plattenkanten am Rumpf, Rand der Hinterkopf-Oeffnung: zeichnen schon im Hero die
      // Bueste B nach (heller als die Flaechen, damit die Android-Form im ersten Bild lesbar ist)
      // Rumpf-Linien (Schulterring, Spangen) leiser: von vorne liegen sie oft hintereinander und bilden helle Flecken
      bp = (2.6 + 1.3 * rimP) * backP * twP * (1.0 + 1.0 * rl) * (aHw > 0.5 ? 1.0 : 0.5);
      pc = mix(uColB, uColW, 0.25);
      ps = uSize * 1.12;
      if (abs(kind - 1.25) < 0.1) {
        float ph = fract(t * 0.06 + aRand.y);
        bp = (0.7 + 0.6 * aRand.w) * sin(PI * ph) * twP;
        pc = mix(uColB, uColW, 0.15);
        ps = uSize * 0.4;
      }
    }
    if (kind > 1.5) {
      // Pupillen (Augen der Android-Bueste bei x +-0.30, y -0.01)
      float vy = aTarget.y + 0.01;
      float eyes = exp(-pow((abs(aTarget.x) - 0.3) / 0.1, 2.0)) * exp(-vy * vy / 0.003);
      float breathe = 0.85 + 0.15 * sin(t * 1.6);
      bp = (0.22 + 0.65 * eyes) * breathe * backP;
      pc = mix(uColA, uColB, 0.3 + 0.3 * eyes);
      ps = uSize * (0.45 + 0.09 * eyes);
    }
    bright = mix(bright, bp * uPreGain.x, pre);
    col = mix(col, pc, pre);
    wsize = mix(wsize, ps * uPreGain.y, pre);
  }
  if (isForm && f > 0.0) {
    // Roboter-Zustand: Hologramm. Kanten (Silhouette) hell, Flaechen fein, Rueckseite gedaempft
    vec3 V = normalize(cameraPosition - tgt);
    float nd = dot(nrm, V);
    float rim = 1.0 - abs(nd);
    float back = nd < 0.0 ? 0.3 : 1.0;
    float fb = (0.13 + 0.6 * pow(rim, 3.0)) * back * aInfo.w;
    vec3 fc = mix(uColA, uColB, pow(rim, 3.0) * 0.6);
    float fsize = uSize * (0.42 + 0.3 * aRand.x);
    if (kind > 0.5 && kind < 1.5) { // Linien
      fb = (0.42 + 0.45 * rim) * back * aInfo.w;
      fc = mix(uColB, uColW, 0.25);
      fsize = uSize * 0.4;
    } else if (kind > 1.5) {        // Pupillen
      float ex = abs(tgt.x);
      float eyes = exp(-pow((ex - 0.3) / 0.11, 2.0)) * exp(-pow((tgt.y + 0.01) / 0.07, 2.0));
      float on = smoothstep(0.82, 0.97, uForm);
      float breathe = 0.85 + 0.15 * sin(t * 1.6);
      fb = mix(0.3, (0.5 + 0.4 * eyes) * breathe, on) * back;
      fc = mix(uColA, uColB, eyes * 0.34);
      fsize = uSize * (0.5 + 0.12 * eyes);
    }
    // Uebergabe an das Hologramm des Roboters: nur noch feines Funkeln
    fb *= 1.0 - uHolo * (0.72 - 0.3 * step(0.93, aRand.w));
    // im Flug: Spur leuchtet etwas heller, bei Ankunft ein kurzes Aufblitzen
    float travel = sin(PI * f);
    bright = mix(bright, fb, f) * (1.0 + 0.3 * travel) + flash * 0.75;
    col = mix(col, fc, f);
    col = mix(col, uColW, flash * 0.5);
    wsize = mix(wsize, fsize, f) * (1.0 + flash * 0.5);
    // Uebergabe an den festen Roboter: die Abtastebene faehrt von unten nach oben,
    // Partikel leuchten an der Linie auf und gehen darunter in die Schale ueber
    float below = uBuildY - aTarget.y;
    float dis = smoothstep(0.0, 0.16 + 0.12 * aRand.w, below);
    float edgeGlow = exp(-pow(below / 0.05, 2.0)) * f;
    bright = bright * (1.0 + 2.2 * edgeGlow) * (1.0 - dis);
    col = mix(col, uColW, edgeGlow * 0.5);
    wsize *= 1.0 - 0.5 * dis;
    pos -= nrm * 0.015 * dis;
  }

  /* --- Projektion, Tiefenunschaerfe */
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float depth = -mv.z;
  gl_Position = projectionMatrix * mv;
  float proj = projectionMatrix[1][1] * uResolution.y * 0.5;
  float d = max(depth, 0.05);
  float px = wsize * proj / d;
  float coc = uAperture * proj * abs(d - uFocus) / d;
  if (isDust && aInfo.w > 0.5) coc *= 0.5;
  float size = sqrt(px * px + coc * coc);
  float minPx = 1.4 * uPixelRatio;
  float drawn = clamp(size, minPx, 64.0);
  // Energie verteilt sich auf die gezeichnete Flaeche; Unschaerfe-Kreise bekommen etwas Zusatzlicht (wirken wie Linsen-Bokeh)
  float energy = (px * px + 1.0) / (drawn * drawn + 1.0);
  vBlur = clamp((coc - px * 0.5) / max(drawn, 1.0), 0.0, 1.0);
  energy *= 1.0 + uBokeh * vBlur;
  energy = min(energy, 1.0 + uBokeh);

  // Nebel (wie FogExp2), nah an der Kamera ausblenden
  float fogD = isFar ? uFog * 0.22 : uFog * 0.8;
  float fog = exp(-fogD * fogD * d * d);
  float nearFade = smoothstep(0.35, 1.8, d);

  // Maus: Partikel nahe am Zeiger leuchten auf und weichen leicht aus
  vec2 ndc = gl_Position.xy / max(gl_Position.w, 1e-4);
  float aspect = uResolution.x / uResolution.y;
  vec2 dv = (ndc - uPointer) * vec2(aspect, 1.0);
  float pl = exp(-dot(dv, dv) * 14.0) * uPointerAmt * (1.0 - f) * (isFar ? 0.0 : 1.0);
  bright *= 1.0 + 1.5 * pl;
  float ta = length((ndc - uTextArea.xy) / uTextArea.zw);
  // Titel: Partikel dahinter gedaempft, der fertig geformte Kopf nicht (er steht neben bzw. ueber dem Text)
  bright *= 1.0 - 0.6 * uTitle * (1.0 - smoothstep(0.55, 1.1, ta)) * (1.0 - f) * (1.0 - pre * aHw);
  gl_Position.xy += normalize(dv + 1e-5) / vec2(aspect, 1.0) * pl * 0.035 * gl_Position.w;

  // Lichtspur im Flug: Sprite wird entlang der Bahn gestreckt (Richtung aus der Bahn kurz davor)
  vStreak = vec4(0.0, 0.0, 1.0, 0.0);
  float pointSize = drawn;
  if (isForm && f > 0.0 && f < 1.0 && aRand.x < 0.55) {
    vec4 prevClip = projectionMatrix * (modelViewMatrix * vec4(formPath(p, tgt, max(f - 0.07, 0.0), 1.0 - pre), 1.0));
    vec2 a = gl_Position.xy / max(gl_Position.w, 1e-4);
    vec2 b = prevClip.xy / max(prevClip.w, 1e-4);
    vec2 sv = (a - b) * 0.5 * uResolution;
    float len = min(length(sv), 28.0 * uPixelRatio) * sin(PI * f);
    if (len > 1.0 && prevClip.w > 0.05) {
      pointSize = min(drawn + len, 64.0);
      float L = (pointSize - drawn) / pointSize;          // halbe Spurlaenge in Punkt-Koordinaten (-1..1)
      vec2 dir = normalize(sv) * vec2(1.0, -1.0);         // gl_PointCoord zeigt nach unten
      vStreak = vec4(dir * L, drawn / pointSize, 1.0);
      gl_Position.xy -= (sv / uResolution) * gl_Position.w; // Mitte der Spur zwischen jetzt und vorher
      energy *= drawn / (drawn + len * 0.6);
    }
  }

  float ign = smoothstep(aRand.y * 0.75, aRand.y * 0.75 + 0.25, uIgnite);
  float intensity = bright * energy * fog * nearFade * edge * uAlpha * ign;
  vColor = col * intensity;
  gl_PointSize = pointSize;
  if (intensity < 0.0004 || depth < 0.05) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
  }
}
`;

export const POINTS_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vBlur;
varying vec4 vStreak;
void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  if (vStreak.w > 0.5) {
    // Spur: Abstand zur Strecke, Kopf heller als Schweif
    vec2 s = vStreak.xy;
    float h = clamp(dot(uv + s, s) / max(dot(s, s) * 2.0, 1e-5), 0.0, 1.0);
    vec2 d = uv + s - 2.0 * s * h;
    float core = vStreak.z;
    float q = dot(d, d) / (core * core);
    float a = exp(-q * 9.0) * (0.25 + 0.75 * h * h);
    gl_FragColor = vec4(vColor * a, 1.0);
    return;
  }
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float r = sqrt(r2);
  // scharf: heller Kern mit feinem Schein
  float sharp = exp(-r2 * 11.0) + exp(-r2 * 3.2) * 0.12;
  // unscharf: weiche Scheibe mit leicht hellerem Rand (Linsen-Bokeh)
  float disc = (1.0 - smoothstep(0.74, 1.0, r)) * (0.62 + 0.38 * smoothstep(0.3, 0.92, r)) * 0.42;
  float a = mix(sharp, disc, vBlur);
  gl_FragColor = vec4(vColor * a, 1.0);
}
`;

/* ------------------------------------------------------------ Lichtkegel */
export const BEAM_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
varying float vH;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vH = uv.y; // 1 oben (Spitze), 0 unten
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const BEAM_FRAG = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;
uniform float uFog;
varying vec3 vN;
varying vec3 vW;
varying float vH;
void main() {
  vec3 V = normalize(cameraPosition - vW);
  float facing = abs(dot(normalize(vN), V));
  float soft = pow(facing, 3.6);
  float along = smoothstep(0.0, 0.55, vH) * (1.0 - smoothstep(0.82, 1.0, vH));
  // feine Schlieren im Licht
  float st = 0.78 + 0.22 * sin(vW.y * 3.1 + vW.x * 1.7 - uTime * 0.35) * sin(vW.y * 1.3 - vW.z * 2.3 + uTime * 0.21);
  float d = length(cameraPosition - vW);
  float fog = exp(-uFog * uFog * d * d * 0.5);
  gl_FragColor = vec4(uColor * (uIntensity * soft * along * st * fog), 1.0);
}
`;
