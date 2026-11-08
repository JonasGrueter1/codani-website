// Szene "dna": Materialien und GLSL.
//   glyph  Zeichen als Billboards aus dem SDF-Atlas: Helix (zwei Code-Straenge, Rotation im Shader),
//          Lesekopf-Impulse, seltenes Flackern, Maus entschluesselt, Ausflug ins Website-Geruest,
//          dort Entschluesseln zum Zieltext. Staub-Zeichen im Raum.
//   rung   Basenpaare als Lichtbaender im Bildschirmraum (zwei Haelften, Licht-Perlen, Aufreissen).
//   streak Lichtspuren der fliegenden Zeichen (Laenge nach Scroll-Geschwindigkeit).
//   band   Rueckgrat je Strang: zwei Schienen mit feiner Flaeche, Lesekoepfe laufen mit.
//   wire   Website-Geruest: abgerundete Rechtecke, Linien, Kreise, Bildplatzhalter, Layout-Raster als SDF.
//          Konturen werden mit hellem Schreibkopf gezeichnet, danach Flaechen, am Ende ein ruhiger Lichtlauf.
// Alles additiv, ohne Tiefe zu schreiben. Nebel wird selbst gerechnet.
import { COLS, ROWS, CUT, SCRAMBLE } from './dna-atlas.js';

const COMMON = /* glsl */ `
  #define PI 3.14159265
  float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
`;

// Helix-Punkt (Achse entlang -Z). Am Anfang verjuengt (die Faser oeffnet sich zur Helix).
const HELIX = /* glsl */ `
  uniform vec3 uAxis;    // x, y der Achse, z = Anfang
  uniform float uRot;
  vec3 helixPoint(float th0, float z0, float r0) {
    float dz = uAxis.z - z0;
    float taper = mix(0.3, 1.0, smoothstep(-0.2, 2.6, dz));
    float th = th0 + uRot;
    float r = r0 * taper * (1.0 + 0.025 * sin(z0 * 1.3 + uRot * 2.0));
    return vec3(uAxis.x + cos(th) * r, uAxis.y + sin(th) * r, z0);
  }
  // Die Helix tritt weich aus dem Knoten (kein heller Fleck direkt beim Eintauchen)
  float helixFade(float z0) { return mix(0.25, 1.0, smoothstep(0.0, 1.8, uAxis.z - z0)); }
`;

// Ausflug: Bahn vom Helix-Punkt ins Website-Geruest (quer oder hoch), gleichsinniger Drall um die Achse.
// Gemeinsam fuer Zeichen und Lichtspuren, damit beide exakt uebereinanderliegen.
const FLIGHT = /* glsl */ `
  uniform float uPortrait, uSettle, uLayerSep;
  uniform vec3 uWire;
  uniform mat3 uWireRot;
  // Hinweis: nie pow() mit negativer Basis (in GLSL undefiniert, liefert auf vielen GPUs NaN -> Bloom-Quadrate)
  // Ease-out: die Zeichen loesen sich zuegig (die Kamera holt sie nicht ein) und setzen sich weich ins Ziel
  float flightEase(float fp) { return 1.0 - pow(1.0 - clamp(fp, 0.0, 1.0), 2.6); }
  vec3 flightPos(vec3 P0, float e, vec4 tL, vec4 tP, float swirl) {
    vec4 tg = uPortrait > 0.5 ? tP : tL;
    float layer = uPortrait > 0.5 ? tL.w * step(0.5, tP.w) : tL.w;
    vec3 off = vec3(tg.xy, layer * uLayerSep * (1.0 - uSettle) + 0.006);
    vec3 P1 = uWire + uWireRot * off;
    vec3 C = vec3(mix(P0.xy, uAxis.xy, 0.38), mix(P0.z, P1.z, 0.5));
    vec3 pos = mix(mix(P0, C, e), mix(C, P1, e), e);
    float sw = sin(PI * e) * swirl * (1.0 - e * 0.4);
    vec2 q = pos.xy - uAxis.xy;
    float cs = cos(sw);
    float sn = sin(sw);
    pos.xy = uAxis.xy + vec2(q.x * cs - q.y * sn, q.x * sn + q.y * cs);
    return pos;
  }
`;

/* ================================================================ Zeichen */
const GLYPH_VS = /* glsl */ `
  ${COMMON}
  ${HELIX}
  ${FLIGHT}
  #define COLS ${COLS.toFixed(1)}
  #define ROWS ${ROWS.toFixed(1)}
  #define SCRAMBLE ${SCRAMBLE.toFixed(1)}
  uniform float uTime, uLocal, uDec, uAlpha, uFog, uFogT, uLen, uPointerOn, uBlock, uSpotOn;
  uniform vec2 uResolution, uPointer, uSpot;
  uniform vec3 uCol[12];
  uniform vec3 uHot;
  attribute vec4 aHel;   // Winkel, z, Radius, Art (0 Strang A, 1 Strang B, 2 Staub, 3 Klammer)
  attribute vec4 aChr;   // Zeichen, Klasse, Zufall, Groesse
  attribute vec4 aFly;   // Start, Dauer, Modus (0 verloeschen, 1 Kontur, 2 Text, 3 Staub), Drall
  attribute vec4 aTgt;   // Ziel quer: x, y, Groesse, Ebene
  attribute vec4 aTgtP;  // Ziel hoch: x, y, Groesse, sichtbar
  attribute vec4 aFin;   // Zielzeichen, Zielklasse, Helligkeit im Band
  varying vec2 vUv;
  varying vec3 vCol;
  varying float vAlpha;
  varying float vSoft;
  varying float vPx;

  // Lesekoepfe laufen die Straenge entlang (wie beim Ablesen der DNA), mit weichem Schweif
  float readPulse(float s, float strand) {
    float span = uLen + 7.0;
    float acc = 0.0;
    for (int i = 0; i < 2; i++) {
      float head = mod(uTime * 2.3 + float(i) * span * 0.5 + strand * 5.3, span) - 3.5;
      float d = head - s;
      acc += d > 0.0 ? exp(-d * 1.15) : exp(-d * d * 30.0);
    }
    return acc;
  }

  void main() {
    float kind = aHel.w;
    float seed = aChr.z;
    float mode = aFly.z;
    float rel = aFly.x;
    float dur = aFly.y;
    bool dust = kind > 1.5 && kind < 2.5;

    vec3 P0;
    if (dust) {
      float th = aHel.x + uRot * 0.12 + uTime * 0.012 * (0.5 + seed);
      float z = aHel.y + sin(uTime * 0.19 + seed * 40.0) * 0.22;
      P0 = vec3(uAxis.x + cos(th) * aHel.z, uAxis.y + sin(th) * aHel.z, z);
    } else {
      P0 = helixPoint(aHel.x, aHel.y, aHel.z);
    }
    vec3 pos = P0;
    float size = aChr.w;
    float ch = aChr.x;
    vec3 col = uCol[int(aChr.y + 0.5)] * aFin.z;
    float alpha = 1.0;
    float hot = 0.0;
    float settled = 0.0;

    bool released = mode > 0.5 && mode < 2.5 && uLocal > rel;
    if (!dust && !released) alpha *= helixFade(aHel.y);
    if (!dust && !released) hot += readPulse(uAxis.z - aHel.y, kind > 2.5 ? 0.5 : kind) * (kind > 2.5 ? 1.15 : 0.85);

    // Flackern: selten laeuft ein Zeichen kurz durch zufaellige Zeichen (ruhig, nicht wie Regen)
    float tt = uTime * (dust ? 0.7 : 0.42) + seed * 37.0;
    float ev = hash11(floor(tt) * 7.31 + seed * 131.0);
    float scr = step(dust ? 0.8 : 0.9, ev) * step(fract(tt), 0.3);

    // Maus: Zeichen unter dem Zeiger leuchten auf und entschluesseln sich neu
    if (uPointerOn > 0.001 && mode < 3.5) {
      vec4 c0 = projectionMatrix * modelViewMatrix * vec4(P0, 1.0);
      if (c0.w > 0.05) {
        vec2 ndc = c0.xy / c0.w;
        float pd = length((ndc - uPointer) * vec2(uResolution.x / uResolution.y, 1.0));
        float hv = smoothstep(0.3, 0.02, pd) * uPointerOn;
        hot += hv * 0.9;
        scr = max(scr, step(0.6, hv * (0.55 + 0.45 * hash11(seed * 91.0 + floor(uTime * 5.0)))));
      }
    }
    // Zeichen, die im Geruest als Text stehen, flackern nie: sonst heben sie kurz ueber die Bloom-Schwelle und
    // ein heller Glow-Fleck bleibt auf der Headline stehen
    bool textGlyph = mode > 1.5 && mode < 2.5 && (uPortrait < 0.5 || aTgtP.w > 0.5);
    if (textGlyph && uLocal > rel) scr = 0.0;
    hot += scr * 0.35;

    // Verloeschen (Zeichen hinter der Kamera, Klammern beim Aufreissen)
    if (mode < 0.5) {
      float f = smoothstep(rel, rel + 0.045, uLocal);
      alpha *= 1.0 - f;
      hot += f * (1.0 - f) * 3.0;
    }

    // Ausflug ins Website-Geruest
    float fp = (mode > 0.5 && mode < 2.5) ? clamp((uLocal - rel) / dur, 0.0, 1.0) : 0.0;
    float arrive = rel + dur;
    if (fp > 0.0) {
      float e = flightEase(fp);
      vec4 tg = uPortrait > 0.5 ? aTgtP : aTgt;
      pos = flightPos(P0, e, aTgt, aTgtP, aFly.w);
      size = mix(size, tg.z, e) * (1.0 - 0.3 * sin(PI * e));
      hot += sin(PI * fp) * 0.35;
      settled = e;
    }

    bool textHere = mode > 1.5 && mode < 2.5 && (uPortrait < 0.5 || aTgtP.w > 0.5);
    if ((mode > 0.5 && mode < 1.5) || (mode > 1.5 && mode < 2.5 && !textHere)) {
      // Kontur-Zeichen verloeschen beim Eintreffen, die Linie uebernimmt
      float f = smoothstep(arrive - 0.006, arrive + 0.028, uLocal);
      alpha *= 1.0 - f;
      hot += exp(-abs(uLocal - arrive) * 80.0) * 0.6;
    }
    if (textHere && fp > 0.0) {
      vec3 fin = uCol[int(aFin.y + 0.5)];
      col = mix(col, fin, smoothstep(0.6, 1.0, fp));
      float dec = (uDec - arrive) / 0.03;
      if (dec > -0.5 && dec < 1.0) {
        ch = floor(hash11(floor(uTime * 16.0) * 1.7 + seed * 733.0) * SCRAMBLE);
        hot += 0.35 * (1.0 - max(dec, 0.0));
      } else if (dec >= 1.0) {
        ch = aFin.x;
        hot += exp(-(dec - 1.0) * 3.0) * 0.3;
        vec2 sv = (uPortrait > 0.5 ? aTgtP.xy : aTgt.xy) - uSpot;
        hot += exp(-dot(sv, sv) * 2.0) * uSpotOn * 0.16;
        if (abs(ch - uBlock) < 0.5) alpha *= step(0.5, fract(uTime * 0.95));
      }
      scr = 0.0;
    }
    if (scr > 0.5 && fp <= 0.0) ch = floor(hash11(floor(uTime * 14.0) + seed * 517.0) * SCRAMBLE);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = -mv.z;
    float px = size * projectionMatrix[1][1] * uResolution.y * 0.5 / max(dist, 0.01);
    // Tunnel: dichterer Nebel fuer die Helix (die Tiefe verschwindet ruhig im Dunkeln), Ausflug und Geruest normal
    float fogK = (dust || released) ? uFog : uFogT;
    alpha *= smoothstep(0.35, 1.5, dist) * exp(-fogK * fogK * dist * dist) * smoothstep(1.5, 4.5, px) * uAlpha;
    // Kleine Zeichen (grobe Mip-Stufe) duerfen nicht hell leuchten: sonst macht der Bloom daraus helle Quadrate
    float small = smoothstep(5.0, 16.0, px);
    hot = min(hot, 2.0) * mix(0.35, 1.0, small);
    vCol = col + uHot * hot * 0.42;
    vSoft = clamp(hot * 0.35, 0.0, 0.8) * small;
    vAlpha = alpha;
    vPx = px;
    mv.xy += position.xy * size;
    gl_Position = projectionMatrix * mv;
    if (alpha < 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    float c = floor(ch + 0.5);
    float cx = mod(c, COLS);
    float cy = floor(c / COLS);
    vUv = vec2((cx + uv.x) / COLS, (cy + uv.y) / ROWS);
  }
`;

const GLYPH_FS = /* glsl */ `
  #define CUT ${CUT.toFixed(3)}
  uniform sampler2D uAtlas;
  varying vec2 vUv;
  varying vec3 vCol;
  varying float vAlpha;
  varying float vSoft;
  varying float vPx;
  void main() {
    float d = texture2D(uAtlas, vUv).r;
    float w = clamp(fwidth(d) * 0.7, 0.012, 0.3);
    // Kleine Zeichen (Zelle unter ~26 px, Versalhoehe unter ~12 px): Kante tiefer legen, Striche werden kraeftiger
    float cut = mix(CUT - 0.07, CUT, smoothstep(14.0, 30.0, vPx));
    float a = smoothstep(cut - w, cut + w, d);
    float halo = smoothstep(cut - 0.35, cut, d);
    float k = (a + halo * halo * vSoft * 0.5) * vAlpha;
    if (!(k > 0.003)) discard;
    gl_FragColor = vec4(max(vCol, 0.0), min(k, 1.0));
  }
`;

/* ============================================================ Lichtspuren */
// Duenne Spur hinter jedem fliegenden Zeichen. Laenge folgt der Scroll-Geschwindigkeit (wie Bewegungsunschaerfe):
// steht die Seite still, bleibt nur ein Hauch.
const STREAK_VS = /* glsl */ `
  ${COMMON}
  ${HELIX}
  ${FLIGHT}
  uniform float uLocal, uAlpha, uFog, uTrail, uPixelRatio;
  uniform vec2 uResolution;
  attribute vec4 aHel, aChr, aFly, aTgt, aTgtP;
  varying float vT, vAcross, vAlpha;
  void main() {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vT = 0.0;
    vAcross = 0.0;
    vAlpha = 0.0;
    float mode = aFly.z;
    float fp = clamp((uLocal - aFly.x) / aFly.y, 0.0, 1.0);
    // nur ein Teil der Zeichen zieht eine Spur (ruhiger, edler)
    if (mode < 0.5 || mode > 2.5 || fp <= 0.0 || fp >= 1.0 || aHel.w > 1.5 || fract(aChr.z * 13.7) > 0.4) return;
    float fpT = max(0.0, fp - (uTrail + 0.004) / aFly.y);
    vec3 P0 = helixPoint(aHel.x, aHel.y, aHel.z);
    vec4 mh = modelViewMatrix * vec4(flightPos(P0, flightEase(fp), aTgt, aTgtP, aFly.w), 1.0);
    vec4 mt = modelViewMatrix * vec4(flightPos(P0, flightEase(fpT), aTgt, aTgtP, aFly.w), 1.0);
    if (-mh.z < 0.4 || -mt.z < 0.4) return;
    vec4 ch = projectionMatrix * mh;
    vec4 ct = projectionMatrix * mt;
    float u = position.x + 0.5;
    vec4 c = mix(ct, ch, u);
    vec2 d = (ch.xy / ch.w - ct.xy / ct.w) * uResolution * 0.5;
    float l = length(d);
    vec2 dir = l > 1e-3 ? d / l : vec2(1.0, 0.0);
    vec2 n = vec2(-dir.y, dir.x);
    float w = 0.45 * uPixelRatio + 0.45;
    c.xy += n * position.y * 2.0 * w * 2.0 / uResolution * c.w;
    gl_Position = c;
    vT = u;
    vAcross = position.y * 2.0;
    float depth = mix(-mt.z, -mh.z, u);
    vAlpha = uAlpha * sin(PI * fp) * exp(-uFog * uFog * depth * depth) * smoothstep(3.0, 14.0, l);
  }
`;

const STREAK_FS = /* glsl */ `
  uniform vec3 uStreak;
  varying float vT, vAcross, vAlpha;
  void main() {
    float t = clamp(vT, 0.0, 1.0);
    float k = t * t * (1.0 - smoothstep(0.25, 1.0, abs(vAcross))) * vAlpha;
    if (!(k > 0.003)) discard;
    gl_FragColor = vec4(uStreak, min(k, 1.0));
  }
`;

/* ============================================================ Basenpaare */
const RUNG_VS = /* glsl */ `
  ${COMMON}
  ${HELIX}
  uniform float uTime, uLocal, uAlpha, uFogT, uRadius, uGroove, uLen, uPixelRatio;
  uniform vec2 uResolution;
  attribute vec4 aRung;   // Winkel A, z, Zufall, warm
  attribute vec4 aRung2;  // Start, aufreissen (1) oder verloeschen (0)
  varying float vU, vV, vAlpha, vSeed, vWarm, vHalf, vPulse;

  float readPulse(float s, float strand) {
    float span = uLen + 7.0;
    float acc = 0.0;
    for (int i = 0; i < 2; i++) {
      float head = mod(uTime * 2.3 + float(i) * span * 0.5 + strand * 5.3, span) - 3.5;
      float d = head - s;
      acc += d > 0.0 ? exp(-d * 1.15) : exp(-d * d * 30.0);
    }
    return acc;
  }

  void main() {
    float r = uRadius * 0.93;
    vec3 A = helixPoint(aRung.x, aRung.y, r);
    vec3 B = helixPoint(aRung.x + uGroove, aRung.y, r);
    float rel = aRung2.x;
    float unzip = aRung2.y > 0.5 ? smoothstep(rel - 0.035, rel, uLocal) : 0.0;
    float fade = aRung2.y > 0.5 ? 1.0 - smoothstep(rel - 0.005, rel + 0.02, uLocal) : 1.0 - smoothstep(rel, rel + 0.04, uLocal);
    float u = position.x;
    float half_ = position.z;
    // Aufreissen: jede Haelfte zieht sich zu ihrem Strang zurueck
    float uu = half_ < 0.5 ? u * (1.0 - unzip) : 1.0 - (1.0 - u) * (1.0 - unzip);
    vec3 P = mix(A, B, uu);

    vec4 mv = modelViewMatrix * vec4(P, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec3 dv = mat3(modelViewMatrix) * (B - A);
    vec4 dclip = projectionMatrix * vec4(dv, 0.0);
    vec2 dir = vec2(1.0, 0.0);
    if (clip.w > 1e-4) {
      vec2 dd = (dclip.xy * clip.w - clip.xy * dclip.w) * uResolution;
      float l = length(dd);
      if (l > 1e-9) dir = dd / l;
    }
    vec2 nrm = vec2(-dir.y, dir.x);
    float depth = -mv.z;
    float px = 0.008 * projectionMatrix[1][1] * uResolution.y * 0.5 / max(depth, 1e-3);
    float drawPx = max(px, 1.0 * uPixelRatio);
    float halfPx = drawPx * 0.5 + 1.0;
    clip.xy += nrm * position.y * halfPx * 2.0 / uResolution * clip.w * step(0.02, depth);
    gl_Position = clip;

    vU = uu;
    vV = position.y * halfPx / max(drawPx * 0.5, 1e-3);
    vHalf = half_;
    vSeed = aRung.z;
    vWarm = aRung.w;
    vPulse = readPulse(uAxis.z - aRung.y, 0.0) + readPulse(uAxis.z - aRung.y, 1.0);
    float near = smoothstep(0.9, 2.6, depth);
    vAlpha = uAlpha * fade * near * helixFade(aRung.y) * exp(-uFogT * uFogT * depth * depth * 1.3) * (px / drawPx);
  }
`;

const RUNG_FS = /* glsl */ `
  uniform float uTime;
  uniform vec3 uRungA, uRungB, uRungW, uHot;
  varying float vU, vV, vAlpha, vSeed, vWarm, vHalf, vPulse;
  void main() {
    float core = 1.0 - smoothstep(0.55, 1.15, abs(vV));
    float m = clamp(abs(vU - 0.5) * 2.0, 0.0, 1.0); // 0 Mitte, 1 Strang
    float gap = smoothstep(0.015, 0.06, m);       // feine Luecke zwischen den Basen
    // Basen hell am Strang, zur Mitte hin fast unsichtbar: die Mitte des Tunnels bleibt ruhig
    float base = mix(0.05, 1.0, smoothstep(0.38, 0.92, m));
    vec3 col = vHalf < 0.5 ? uRungA : mix(uRungB, uRungW, vWarm);
    // Licht-Perlen: laufen von den Straengen zur Mitte und treffen sich dort
    float ph = fract(uTime * 0.32 + vSeed * 7.0);
    float bd = (m - (1.0 - ph)) * 10.0;
    float bead = exp(-bd * bd) * smoothstep(0.0, 0.15, ph) * (1.0 - smoothstep(0.85, 1.0, ph));
    float md = (ph - 0.97) * 14.0;
    float meet = exp(-m * 18.0) * exp(-md * md);
    float lit = mix(0.15, 1.0, smoothstep(0.3, 0.9, m));
    vec3 c = col * base * gap + uHot * (bead * 0.45 * lit + meet * 0.35) + col * vPulse * 0.55 * gap * lit;
    float k = core * vAlpha;
    if (!(k > 0.003)) discard;
    gl_FragColor = vec4(max(c, 0.0), min(k, 1.0));
  }
`;

/* ============================================================ Geruest */
const WIRE_VS = /* glsl */ `
  uniform float uLocal, uAlpha, uFog, uPortrait, uSettle, uLayerSep;
  uniform vec3 uWire;
  uniform mat3 uWireRot;
  attribute vec4 aR, aRP;   // Mitte xy, halbe Groesse (quer, hoch); halbe Breite < 0 = nicht vorhanden
  attribute vec4 aS;        // Radius quer, Radius hoch, Linienbreite, Art
  attribute vec4 aT;        // Start, Dauer, Ebene, Helligkeit
  attribute float aF;       // Flaeche
  varying vec2 vP, vH, vW;
  varying float vRad, vSw, vKind, vFill, vRev, vBright, vAlpha;
  void main() {
    bool portrait = uPortrait > 0.5;
    vec4 R = portrait ? aRP : aR;
    float rev = clamp((uLocal - aT.x) / aT.y, 0.0, 1.0);
    vec2 hs = max(R.zw, vec2(0.0));
    float pad = aS.z * 2.0 + 0.05;
    vec2 p = position.xy * 2.0 * (hs + pad);
    float z = aT.z * uLayerSep * (1.0 - uSettle);
    vec3 wp = uWire + uWireRot * vec3(R.xy + p, z);
    vec4 mv = modelViewMatrix * vec4(wp, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    vP = p;
    vW = R.xy + p;
    vH = max(hs, vec2(1e-4));
    vRad = portrait ? aS.y : aS.x;
    vSw = aS.z;
    vKind = aS.w;
    vFill = aF;
    vRev = rev;
    vBright = aT.w;
    vAlpha = uAlpha * exp(-uFog * uFog * depth * depth);
    if (R.z < 0.0 || rev <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }
`;

const WIRE_FS = /* glsl */ `
  #define PI 3.14159265
  uniform float uTime, uLocal, uPortrait, uBuilt, uSpotOn;
  uniform vec2 uSpot;
  uniform vec3 uLine, uHead, uFill, uGridCol;
  varying vec2 vP, vH, vW;
  varying float vRad, vSw, vKind, vFill, vRev, vBright, vAlpha;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float sdSeg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  // Abstand vom Startwinkel, beide Richtungen, 0..1
  float angParam(float th, float th0) {
    return abs(mod(th - th0 + PI, 2.0 * PI) - PI) / PI;
  }

  void main() {
    vec2 p = vP;
    vec2 h = vH;
    float kind = vKind;
    // Lichtkegel der Maus auf dem fertigen Geruest
    vec2 sv = vW - uSpot;
    float spot = exp(-dot(sv, sv) * 1.4) * uSpotOn;
    float d;
    float prm;
    vec3 col = vec3(0.0);
    float a = 0.0;

    if (kind > 3.5) {
      // Layout-Raster: Spalten mit Zwischenraeumen, erscheinen von links
      float cols = uPortrait > 0.5 ? 4.0 : 12.0;
      float gut = uPortrait > 0.5 ? 0.16 : 0.12;
      float cw = (2.0 * h.x - (cols - 1.0) * gut) / cols;
      float xx = p.x + h.x;
      float ci = floor(xx / (cw + gut));
      float fx = mod(xx, cw + gut);
      float inside = step(abs(p.x), h.x) * step(abs(p.y), h.y);
      float inCol = step(fx, cw) * inside;
      float edge = (1.0 - smoothstep(0.0, 0.006, min(abs(fx), abs(fx - cw)))) * inCol;
      float appear = smoothstep(ci / cols * 0.7, ci / cols * 0.7 + 0.3, vRev);
      float fadeY = smoothstep(-h.y, h.y * 0.2, p.y);
      // Raster nur kurz als Aufbauhilfe, danach auf ~28 %: es liegt sonst wie ein Strichcode ueber allem
      float dim = 1.0 - 0.72 * smoothstep(0.58, 0.66, uLocal);
      col = uGridCol * (inCol * 0.6 + edge * 1.4) * appear * fadeY * (dim + spot * 1.6);
      a = 1.0;
      gl_FragColor = vec4(max(col, 0.0), clamp(a * vAlpha, 0.0, 1.0));
      return;
    }

    if (kind < 0.5 || (kind > 2.5 && kind < 3.5)) {
      d = sdRoundBox(p, h, min(vRad, min(h.x, h.y)));
      prm = angParam(atan(p.y / h.y, p.x / h.x), 0.75 * PI);
    } else if (kind < 1.5) {
      d = length(p - vec2(clamp(p.x, -h.x, h.x), 0.0));
      prm = clamp(p.x / h.x * 0.5 + 0.5, 0.0, 1.0);
    } else {
      d = length(p) - h.x;
      prm = angParam(atan(p.y, p.x), 0.5 * PI);
    }

    float aa = max(fwidth(d), 1e-5);
    float sw = max(vSw, aa * 1.35);
    float cover = vSw / sw;
    float stroke = (1.0 - smoothstep(sw * 0.5 - aa * 0.5, sw * 0.5 + aa * 0.5, abs(d))) * cover;
    // Linien (Balken) mit grosser Breite: gefuellte Kapsel
    if (kind > 0.5 && kind < 1.5) stroke = (1.0 - smoothstep(-aa * 0.5, aa * 0.5, d - vSw * 0.5)) * cover;

    float pw = fwidth(prm) + 1e-4;
    float shown = 1.0 - smoothstep(vRev - pw, vRev + pw, prm);
    float drawing = 1.0 - step(0.999, vRev);
    float headD = (prm - vRev) / 0.02;
    float head = exp(-headD * headD) * drawing;
    float headGlow = exp(-headD * headD * 0.5) * exp(-d * d / 0.0025) * drawing;

    // Lichtlauf ueber das fertige Geruest
    float sweepPos = mod(uTime * 0.55, 3.2) * 4.0 - 6.0;
    float sd = p.x * 0.8 + p.y * 0.35 - sweepPos;
    float sweep = exp(-sd * sd * 2.2) * uBuilt;

    float strokeCol = vBright * (1.0 + 0.22 * sweep + 0.9 * spot);
    col += uLine * stroke * shown * strokeCol;
    col += uHead * (stroke * head + headGlow * 0.12);

    float fillOn = smoothstep(0.55, 1.0, vRev);
    float inside = 1.0 - smoothstep(-aa, aa, d);
    float grad = mix(0.55, 1.15, smoothstep(-h.y, h.y, p.y));
    col += uFill * inside * fillOn * (vFill * grad + spot * 0.5);

    // Bildplatzhalter: Berg und Sonne als feine Linien, nach der Kontur
    if (kind > 2.5 && kind < 3.5) {
      float s = min(h.x, h.y) * 0.42;
      vec2 c = p / s;
      float m1 = sdSeg(c, vec2(-1.3, -0.75), vec2(-0.35, 0.35));
      m1 = min(m1, sdSeg(c, vec2(-0.35, 0.35), vec2(0.25, -0.3)));
      m1 = min(m1, sdSeg(c, vec2(0.05, -0.08), vec2(0.55, 0.42)));
      m1 = min(m1, sdSeg(c, vec2(0.55, 0.42), vec2(1.3, -0.75)));
      m1 = min(m1, sdSeg(c, vec2(-1.3, -0.75), vec2(1.3, -0.75)));
      float sun = abs(length(c - vec2(0.85, 0.85)) - 0.2);
      float icon = min(m1, sun) * s;
      float iaa = fwidth(icon);
      float iw = 0.009;
      float il = 1.0 - smoothstep(iw * 0.5 - iaa * 0.5, iw * 0.5 + iaa * 0.5 + 0.0005, icon);
      float iOn = smoothstep(0.65, 1.0, vRev);
      col += uLine * il * iOn * 0.75 * (1.0 + sweep);
      // feine Diagonale als Bildflaeche
      float diag = abs(fract((p.x - p.y) * 9.0) - 0.5);
      col += uFill * 0.35 * inside * fillOn * (1.0 - smoothstep(0.0, 0.08, diag)) * 0.5;
    }

    gl_FragColor = vec4(max(col, 0.0), clamp(vAlpha, 0.0, 1.0));
  }
`;

/* ======================================================= Rueckgrat-Baender */
const BAND_VS = /* glsl */ `
  ${COMMON}
  ${HELIX}
  uniform float uTime, uLocal, uAlpha, uFogT, uRadius, uGroove, uLen, uHalfW, uTurnC, uKArc;
  attribute vec4 aBand;   // phi, Seite (-1/1), Strang, Start
  varying float vV, vAlpha, vPulse, vStrand, vFlash;

  float readPulse(float s, float strand) {
    float span = uLen + 7.0;
    float acc = 0.0;
    for (int i = 0; i < 2; i++) {
      float head = mod(uTime * 2.3 + float(i) * span * 0.5 + strand * 5.3, span) - 3.5;
      float d = head - s;
      acc += d > 0.0 ? exp(-d * 1.15) : exp(-d * d * 30.0);
    }
    return acc;
  }

  void main() {
    float phi = aBand.x;
    float v = aBand.y;
    float st = aBand.z;
    float o = v * uHalfW;
    // Versatz senkrecht zum Strang auf der Zylinderflaeche (gleich wie die Code-Zeilen)
    float th = phi + st * uGroove + (o * -uTurnC / uKArc) / uRadius;
    float z = uAxis.z - phi * uTurnC - o * uRadius / uKArc;
    vec3 P = helixPoint(th, z, uRadius * (1.0 - 0.03 * v * v));
    vec4 mv = modelViewMatrix * vec4(P, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    float rel = aBand.w;
    float f = smoothstep(rel, rel + 0.04, uLocal);
    vFlash = f * (1.0 - f) * 4.0;
    vV = v;
    vStrand = st;
    vPulse = readPulse(uAxis.z - z, st);
    vAlpha = uAlpha * (1.0 - f) * helixFade(z) * smoothstep(0.3, 1.4, depth) * exp(-uFogT * uFogT * depth * depth);
  }
`;

const BAND_FS = /* glsl */ `
  uniform vec3 uBandA, uBandB, uHot;
  varying float vV, vAlpha, vPulse, vStrand, vFlash;
  void main() {
    // Mit MSAA kann der Pixelmittelpunkt ausserhalb eines duennen Dreiecks liegen: Varyings werden dann
    // extrapoliert. Alles begrenzen, sonst entstehen negative Farben (und daraus NaN im Post-Processing).
    float av = min(abs(vV), 1.25);
    float aw = max(fwidth(vV), 1e-4);
    // Schienen an beiden Raendern (|v| = 1): immer etwa 1 Pixel, beidseitig geglaettet
    float rail = 1.0 - smoothstep(aw * 0.45, aw * 1.3, abs(1.0 - av));
    rail *= clamp(0.35 / aw, 0.0, 1.0);   // flach angeschnitten: nicht zur Flaeche verschmieren
    float a1 = min(av, 1.0);
    float fill = (0.07 * (1.0 - a1 * a1) + 0.03) * (1.0 - smoothstep(1.0 - aw, 1.0 + aw, av));
    vec3 col = mix(uBandA, uBandB, vStrand);
    float lit = vPulse * 0.8 + vFlash;
    vec3 c = col * (rail + fill) + uHot * lit * (rail * 0.55 + fill * 0.9);
    gl_FragColor = vec4(max(c, 0.0), clamp(vAlpha, 0.0, 1.0));
  }
`;

/**
 * @param {typeof import('three')} THREE
 * @param {object} U   gemeinsame Uniforms der Szene
 */
export function makeMaterials(THREE, U) {
  const base = { transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending };
  const glyph = new THREE.ShaderMaterial({
    ...base,
    uniforms: U,
    vertexShader: GLYPH_VS,
    fragmentShader: GLYPH_FS,
  });
  const rung = new THREE.ShaderMaterial({
    ...base,
    uniforms: U,
    vertexShader: RUNG_VS,
    fragmentShader: RUNG_FS,
    side: THREE.DoubleSide,
  });
  const wire = new THREE.ShaderMaterial({
    ...base,
    uniforms: U,
    vertexShader: WIRE_VS,
    fragmentShader: WIRE_FS,
    side: THREE.DoubleSide,
  });
  const band = new THREE.ShaderMaterial({
    ...base,
    uniforms: U,
    vertexShader: BAND_VS,
    fragmentShader: BAND_FS,
    side: THREE.DoubleSide,
  });
  const streak = new THREE.ShaderMaterial({
    ...base,
    uniforms: U,
    vertexShader: STREAK_VS,
    fragmentShader: STREAK_FS,
    side: THREE.DoubleSide,
  });
  return { glyph, rung, wire, band, streak };
}
