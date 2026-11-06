// Szene "cables": Materialien und GLSL.
//   fibre  Fasern und Glasmantel als Baender im Bildschirmraum (kantenglatt bei jeder Entfernung),
//          Wachstum, Lichtimpulse (Cyan zum Knoten, selten Ember zurueck), feine Funken.
//   ring   Orbit-Ringe um die Knoten, Lage und Drehung im Vertex-Shader, hinter der Kugel verdeckt.
//   node   Knoten als Billboard: dunkle Glaskugel mit Lichtkante, analytische SDF-Icons (gestochen scharf
//          in jeder Groesse), Halo, Schockwelle beim Eintreffen eines Impulses.
//   tip    Leuchtender Kopf an der Spitze eines wachsenden Kabels.
// Alle additiv oder vormultipliziert, ohne Tiefe zu schreiben. Nebel wird selbst gerechnet.

const N = 5; // Anzahl Knoten/Kabel (ANCHORS.nodes)

const RIBBON = /* glsl */ `
  uniform vec2 uResolution;
  uniform float uPixelRatio;
  // Band im Bildschirmraum. p, t in Weltkoordinaten (Gruppe ohne Transformation), w = Breite in Welt-Einheiten.
  // sidePx: Abstand des Vertex zur Mitte in Pixeln (mit 1 px Saum), halfPx: halbe gezeichnete Breite.
  vec4 ribbon(vec3 p, vec3 t, float side, float w, float minPx, out float cover, out float depth, out vec2 sideInfo) {
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec3 tv = mat3(modelViewMatrix) * t;
    vec4 clip = projectionMatrix * mv;
    vec4 dclip = projectionMatrix * vec4(tv, 0.0);
    depth = -mv.z;
    vec2 dir = vec2(1.0, 0.0);
    if (clip.w > 1e-4) {
      vec2 d = (dclip.xy * clip.w - clip.xy * dclip.w) * uResolution;
      float l = length(d);
      if (l > 1e-9) dir = d / l;
    }
    vec2 nrm = vec2(-dir.y, dir.x);
    float px = w * projectionMatrix[1][1] * uResolution.y * 0.5 / max(depth, 1e-3);
    float drawPx = max(px, minPx);
    cover = px / drawPx;
    float halfPx = drawPx * 0.5 + 1.0;
    // hinter der Kamera nicht aufziehen (sonst Streifen beim Clipping)
    float ok = step(0.02, depth);
    clip.xy += nrm * side * halfPx * ok * 2.0 / uResolution * clip.w;
    sideInfo = vec2(side * halfPx, drawPx * 0.5);
    return clip;
  }
`;

const FOG = /* glsl */ `
  uniform float uFog;
  float fogVis(float d) { return exp(-uFog * uFog * d * d); }
`;

/* ------------------------------------------------------------------ Fasern */
const FIBRE_VS = /* glsl */ `
  ${RIBBON}
  uniform float uTime;
  uniform vec4 uCab[${N}];   // x: Wachstum (Bogenlaenge der Spitze), y: Impuls-Kopf, z: Rueck-Impuls, w: verbunden
  uniform vec4 uCab2[${N}];  // xyz: Versatz des Knotens (Schweben), w: Laenge
  uniform vec4 uNodeB[${N}]; // z: Portal (Kamera fliegt in den Knoten)
  attribute vec3 aTan;
  attribute vec4 aData;      // Seite, s, Kabel, Zufall
  attribute vec4 aMeta;      // Breite, Art, Helligkeit, Phase
  varying vec2 vSide;
  varying float vS, vCover, vDepth, vSeed, vPhase, vGain, vKind, vL, vPortal;
  varying vec4 vCab;
  void main() {
    int c = int(aData.z + 0.5);
    vPortal = uNodeB[c].z;
    vec4 cab = uCab[c];
    vec4 cab2 = uCab2[c];
    float s = aData.y;
    float L = cab2.w;
    vec3 p = position;
    // Ende folgt dem schwebenden Knoten, Mitte schwingt ganz leicht
    p += cab2.xyz * smoothstep(L * 0.5, L, s);
    float sway = smoothstep(1.6, 3.6, s) * (1.0 - smoothstep(L - 3.0, L - 0.6, s));
    p += vec3(sin(uTime * 0.55 + s * 0.8 + aData.z * 1.7), 0.8 * sin(uTime * 0.47 + s * 0.63 + aData.z * 2.3), 0.0) * 0.05 * sway;
    float minPx = aMeta.y > 0.5 ? 1.5 : 1.2 * max(1.0, uPixelRatio * 0.8);
    gl_Position = ribbon(p, aTan, aData.x, aMeta.x, minPx, vCover, vDepth, vSide);
    vS = s; vL = L; vCab = cab;
    vSeed = aData.w; vKind = aMeta.y; vGain = aMeta.z; vPhase = aMeta.w;
  }
`;

const FIBRE_FS = /* glsl */ `
  ${FOG}
  uniform float uTime, uAlpha, uTrunk;
  uniform vec3 uBase, uPulse, uPulseTail, uEmber, uTipCol, uSheath;
  varying vec2 vSide;
  varying float vS, vCover, vDepth, vSeed, vPhase, vGain, vKind, vL, vPortal;
  varying vec4 vCab;
  void main() {
    float grow = vCab.x;
    if (vS > grow) discard;
    float on = vCab.w;
    float x = abs(vSide.x) / max(vSide.y, 1e-3);

    // Impuls zum Knoten: scharfe Front, weicher Schweif Richtung Gehirn
    float jit = (vSeed - 0.5) * 0.32;
    float dp = vCab.y + jit - vS;
    float pulse = dp >= 0.0 ? exp(-dp * 2.6) : exp(-dp * dp * 160.0);
    float headI = exp(-dp * dp * 60.0);
    pulse *= mix(0.45, 1.0, on);
    // nahe an der Kamera sind die Fasern breit: Impulse dort zurueckhaltender
    float wide = smoothstep(2.5, 12.0, vSide.y);
    pulse *= 1.0 - 0.5 * wide;
    // im gemeinsamen Stamm laufen alle Impulse uebereinander: dort leiser
    float trunk = 1.0 - smoothstep(1.4, 3.2, vS);
    pulse *= 1.0 - 0.5 * trunk;
    // Rueck-Impuls (warm, selten) vom Knoten zum Gehirn
    float dq = vS - (vCab.z + jit * 0.6);
    float ret = (dq >= 0.0 ? exp(-dq * 3.2) : exp(-dq * dq * 160.0)) * on * (1.0 - 0.5 * (1.0 - smoothstep(1.4, 3.2, vS)));
    // Spitze beim Wachsen
    float tip = exp(-(grow - vS) * 5.0) * (1.0 - on) * 0.3;

    vec3 col;
    float a;
    if (vKind < 0.5) {
      // Faser: weiches Profil, heller Kern
      float prof = exp(-x * x * 2.2);
      // feine Funken, die einzeln durch die Fasern huschen
      float m = fract(uTime * (0.05 + vSeed * 0.06) + vPhase) * (vL + 3.0) - 1.5;
      float spark = exp(-(m - vS) * (m - vS) * 380.0) * 0.9;
      col = uBase * vGain
        + mix(uPulseTail, uPulse, headI) * pulse * (0.7 + 0.6 * vGain)
        + uEmber * ret * 0.9
        + uPulse * spark * vGain
        + uTipCol * tip;
      a = prof * vCover;
      a *= smoothstep(0.0, 0.35, vS); // Wurzeln wachsen weich aus dem Gehirn
    } else {
      // Glasmantel: helle Kanten (Fresnel), fast leeres Inneres, Impulse streuen hinein
      float edge = smoothstep(0.5, 0.93, x) * (1.0 - smoothstep(0.93, 1.0 + 1.0 / max(vSide.y, 1.0), x));
      float fill = (1.0 - smoothstep(0.0, 1.0, x));
      col = uSheath * (edge * 1.0 + fill * 0.12)
        + uPulseTail * pulse * (0.10 * fill + 0.35 * edge)
        + uEmber * ret * 0.12 * fill
        + uTipCol * tip * 0.1;
      a = vCover;
      a *= smoothstep(0.55, 0.95, vS) * (1.0 - smoothstep(vL - 1.2, vL - 0.8, vS));
    }
    // im Website-Knoten beim Hineinfliegen: Faserenden ausblenden
    a *= 1.0 - smoothstep(vL - 0.7, vL - 0.2, vS) * vPortal;
    // Gemeinsamer Stamm: solange die Kamera im Gehirn ist, ausgeblendet (von innen las er sich mit den ersten
    // Aesten als Windrad- oder Y-Form). Die Kabel tauchen dann einzeln aus dem Dunkel hinter dem Gehirn auf.
    a *= 1.0 - (1.0 - uTrunk) * (1.0 - smoothstep(1.2, 2.8, vS));
    a *= uAlpha * fogVis(vDepth) * smoothstep(0.03, 0.3, vDepth);
    gl_FragColor = vec4(col * a, 1.0);
  }
`;

/* ------------------------------------------------------------------ Ringe */
const RING_VS = /* glsl */ `
  ${RIBBON}
  uniform float uTime, uR;
  uniform vec3 uNodePos[${N}];
  uniform vec4 uNodeA[${N}];   // erscheinen, verbunden, Aufleuchten, Fokus
  uniform vec4 uNodeB[${N}];   // Schockwelle Alter, Staerke, Portal, Abdunkeln
  attribute float aNode;
  varying vec2 vSide;
  varying float vCover, vDepth, vAng, vRing, vOcc;
  varying vec4 vA;
  varying vec4 vB;
  void main() {
    int i = int(aNode + 0.5);
    vA = uNodeA[i];
    vB = uNodeB[i];
    float ring = position.z;
    float ang = position.x;
    float outer = 1.0 - step(0.5, ring);
    float rad = uR * mix(1.24, 1.58, outer) * (0.72 + 0.28 * vA.x) * (1.0 + vB.z * 0.6);
    float spin = uTime * mix(-0.27, 0.19, outer) + aNode * 1.7;
    float tilt = mix(0.62, 1.18 + 0.12 * sin(aNode * 2.3), outer);
    vec3 n = vec3(sin(tilt) * cos(spin), cos(tilt), sin(tilt) * sin(spin));
    vec3 u = normalize(cross(vec3(0.0, 1.0, 0.0), n));
    vec3 v = cross(n, u);
    vec3 c = uNodePos[i];
    vec3 p = c + rad * (cos(ang) * u + sin(ang) * v);
    vec3 t = -sin(ang) * u + cos(ang) * v;
    gl_Position = ribbon(p, t, position.y, 0.0065, 1.1, vCover, vDepth, vSide);
    // Verdeckung durch Kugeln: hinter einer Kugel und in ihrem Umriss unsichtbar.
    // Vor der eigenen Kugel nur gedaempft (ruhigeres Bild ueber dem Icon).
    vec4 pm = modelViewMatrix * vec4(p, 1.0);
    vec2 pp = pm.xy / max(-pm.z, 1e-3);
    vOcc = 0.0;
    for (int j = 0; j < ${N}; j++) {
      vec4 cm = modelViewMatrix * vec4(uNodePos[j], 1.0);
      float behind = step(pm.z, cm.z);
      float own = j == i ? 1.0 : 0.0;
      float k = mix(behind, mix(0.6, 1.0, behind), own);
      float rr = uR / max(-cm.z, 1e-3);
      float inDisc = 1.0 - smoothstep(rr * 0.9, rr * 1.04, length(pp - cm.xy / max(-cm.z, 1e-3)));
      vOcc = max(vOcc, inDisc * k * step(0.0, -cm.z));
    }
    vAng = ang;
    vRing = ring;
  }
`;

const RING_FS = /* glsl */ `
  ${FOG}
  uniform float uTime, uAlpha;
  uniform vec3 uSig, uIce;
  varying vec2 vSide;
  varying float vCover, vDepth, vAng, vRing, vOcc;
  varying vec4 vA;
  varying vec4 vB;
  void main() {
    float x = abs(vSide.x) / max(vSide.y, 1e-3);
    float prof = exp(-x * x * 2.0);
    float appear = vA.x;
    float on = vA.y;
    float flash = vA.z;
    float outer = 1.0 - step(0.5, vRing);
    // aeusserer Ring: durchgehend mit einem wandernden Lichtpunkt; innerer Ring: gestrichelt
    float dash = mix(step(0.42, fract(vAng * 40.0 / 6.2831853)), 1.0, outer);
    float glintPos = fract(uTime * 0.09 + vRing * 0.37 + vA.w * 0.0);
    float da = abs(fract(vAng / 6.2831853 - glintPos + 0.5) - 0.5);
    float glint = exp(-da * da * 900.0) * outer;
    // Bogen, der sich beim Verbinden schliesst
    float arc = smoothstep(0.0, 0.02, appear * 1.02 - vAng / 6.2831853);
    vec3 col = uSig * (0.32 + 0.55 * on) * dash + uIce * (glint * (0.6 + 2.2 * on) + flash * 1.4 * dash);
    float a = prof * vCover * arc * smoothstep(0.0, 0.25, appear);
    a *= 1.0 - 0.88 * vOcc;
    a *= 1.0 - vB.z; // Portal: Ringe weg
    a *= 1.0 - 0.5 * vB.w;
    a *= uAlpha * fogVis(vDepth) * smoothstep(0.05, 0.4, vDepth);
    gl_FragColor = vec4(col * a, 1.0);
  }
`;

/* ------------------------------------------------------------------ Knoten */
const NODE_VS = /* glsl */ `
  uniform float uR;
  uniform vec3 uNodePos[${N}];
  uniform vec4 uNodeA[${N}];
  uniform vec4 uNodeB[${N}];
  uniform vec3 uNodeIn[${N}];  // Richtung, aus der das Kabel in die Kugel steigt (Welt)
  attribute float aIdx;
  varying vec2 vP, vEntry;
  varying vec4 vA;
  varying vec4 vB;
  varying float vIdx, vDepth;
  const float QUAD = 2.9;
  void main() {
    int i = int(aIdx + 0.5);
    vA = uNodeA[i];
    vB = uNodeB[i];
    vIdx = aIdx;
    vEntry = (mat3(modelViewMatrix) * uNodeIn[i]).xy * 0.86;
    vec4 mv = modelViewMatrix * vec4(uNodePos[i], 1.0);
    float sc = uR * (0.8 + 0.2 * vA.x);
    vP = position.xy * QUAD;
    mv.xy += position.xy * QUAD * sc;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const NODE_FS = /* glsl */ `
  ${FOG}
  uniform float uTime, uAlpha;
  uniform vec3 uSig, uIce, uEmber, uDeep, uMist, uWhite;
#ifdef CODANI_LIGHT
  uniform vec3 uThemeInk, uThemeTeal, uThemeWarm; // helles Thema (Kapitel 14)
#endif
  varying vec2 vP, vEntry;
  varying vec4 vA;
  varying vec4 vB;
  varying float vIdx, vDepth;

  float sdSeg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  float sdBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  // obere Haelfte eines Kreises (Schultern)
  float sdArcTop(vec2 p, vec2 c, float r) {
    vec2 q = p - c;
    return q.y > 0.0 ? abs(length(q) - r) : min(length(q - vec2(-r, 0.0)), length(q - vec2(r, 0.0)));
  }

  // Icons in Einheiten des Kugelradius (Kasten etwa +-0.5). x: Linien, y: Akzent (warm)
  vec2 icon(int k, vec2 p) {
    float d = 1e3;
    float acc = 1e3;
    if (k == 0) { // E-Mail: Umschlag
      d = abs(sdBox(p, vec2(0.44, 0.31), 0.07));
      d = min(d, sdSeg(p, vec2(-0.37, 0.25), vec2(0.0, -0.04)));
      d = min(d, sdSeg(p, vec2(0.0, -0.04), vec2(0.37, 0.25)));
    } else if (k == 1) { // Kalender
      vec2 q = p - vec2(0.0, -0.04);
      d = abs(sdBox(q, vec2(0.42, 0.38), 0.07));
      d = min(d, sdSeg(q, vec2(-0.42, 0.16), vec2(0.42, 0.16)));
      d = min(d, sdSeg(q, vec2(-0.2, 0.3), vec2(-0.2, 0.48)));
      d = min(d, sdSeg(q, vec2(0.2, 0.3), vec2(0.2, 0.48)));
      for (int iy = 0; iy < 2; iy++) {
        for (int ix = 0; ix < 3; ix++) {
          vec2 c = vec2(-0.2 + 0.2 * float(ix), -0.02 - 0.18 * float(iy));
          float b = sdBox(q - c, vec2(0.035), 0.012) - 0.012;
          if (ix == 2 && iy == 1) acc = b; else d = min(d, b);
        }
      }
    } else if (k == 2) { // Dokumente: Blatt mit Eselsohr
      vec2 A = vec2(-0.33, -0.46), B = vec2(0.33, -0.46), C = vec2(0.33, 0.22), D = vec2(0.09, 0.46), E = vec2(-0.33, 0.46);
      d = min(min(sdSeg(p, A, B), sdSeg(p, B, C)), min(sdSeg(p, C, D), min(sdSeg(p, D, E), sdSeg(p, E, A))));
      d = min(d, sdSeg(p, D, vec2(0.09, 0.22)));
      d = min(d, sdSeg(p, vec2(0.09, 0.22), C));
      d = min(d, sdSeg(p, vec2(-0.17, 0.04), vec2(0.17, 0.04)));
      d = min(d, sdSeg(p, vec2(-0.17, -0.11), vec2(0.17, -0.11)));
      d = min(d, sdSeg(p, vec2(-0.17, -0.26), vec2(0.05, -0.26)));
    } else if (k == 3) { // Kunden: zwei Personen
      vec2 f = vec2(-0.1, 0.0);
      float fHead = abs(length(p - f - vec2(0.0, 0.16)) - 0.15);
      float fBody = sdArcTop(p, f + vec2(0.0, -0.44), 0.3);
      float fSil = min(length(p - f - vec2(0.0, 0.16)) - 0.15, max(length(p - f - vec2(0.0, -0.44)) - 0.3, f.y - 0.44 - p.y));
      vec2 b = vec2(0.2, 0.05);
      float bHead = abs(length(p - b - vec2(0.0, 0.16)) - 0.12);
      float bBody = sdArcTop(p, b + vec2(0.0, -0.4), 0.24);
      float back = max(min(bHead, bBody), -(fSil - 0.075));
      d = min(min(fHead, fBody), back);
      d = max(d, -(p.y + 0.44)); // unten gerade abschneiden
    } else { // Website: Browserfenster mit </>
      d = abs(sdBox(p, vec2(0.46, 0.36), 0.07));
      d = min(d, sdSeg(p, vec2(-0.46, 0.17), vec2(0.46, 0.17)));
      d = min(d, length(p - vec2(-0.33, 0.265)) - 0.022);
      d = min(d, length(p - vec2(-0.23, 0.265)) - 0.022);
      d = min(d, length(p - vec2(-0.13, 0.265)) - 0.022);
      d = min(d, sdSeg(p, vec2(-0.13, 0.04), vec2(-0.25, -0.07)));
      d = min(d, sdSeg(p, vec2(-0.25, -0.07), vec2(-0.13, -0.18)));
      d = min(d, sdSeg(p, vec2(0.13, 0.04), vec2(0.25, -0.07)));
      d = min(d, sdSeg(p, vec2(0.25, -0.07), vec2(0.13, -0.18)));
      acc = sdSeg(p, vec2(0.05, 0.06), vec2(-0.05, -0.2));
    }
    return vec2(d, acc);
  }

  float cover(float d, float hw) {
    float aa = max(fwidth(d), 1e-4) * 0.85;
    return 1.0 - smoothstep(hw - aa, hw + aa, d);
  }

  void main() {
    float appear = vA.x, on = vA.y, flash = vA.z, focus = vA.w;
    float shockAge = vB.x, shockAmp = vB.y, portal = vB.z, dimO = vB.w;
    float d = length(vP);
    float aaD = max(fwidth(d), 1e-4);
    float inside = 1.0 - smoothstep(1.0 - aaD, 1.0 + aaD, d);
    float solid = 1.0 - portal;

    // Koerper: dunkles Glas, zum Rand hin heller (Fresnel)
    float fres = pow(clamp(d, 0.0, 1.0), 4.0);
    vec3 body = uDeep + uSig * (0.015 + 0.11 * fres) * (0.4 + 0.6 * on);
    float bodyA = inside * 0.96 * smoothstep(0.0, 0.5, appear) * solid;

    // Licht tritt dort ins Glas, wo das Kabel ankommt (bei jedem Impuls)
    vec2 de = vP - vEntry;
    float entry = exp(-dot(de, de) * 7.0) * inside;
    float bloomIn = exp(-dot(de, de) * 1.6) * inside;

    // Lichtkante
    float rimW = 0.016 + 0.01 * on;
    float rim = cover(abs(d - 1.0), rimW);
    vec3 rimCol = uSig * (0.4 + 0.95 * on) + uIce * 1.5 * flash;
    // Glanzlicht oben links (Glas)
    vec2 nd = vP / max(d, 1e-4);
    float spec = exp(-pow((d - 0.9) * 20.0, 2.0)) * smoothstep(0.5, 1.0, dot(nd, normalize(vec2(-0.62, 0.78)))) * inside;
    // feiner Skalenring innen
    float ang = atan(vP.y, vP.x);
    float dir = mod(vIdx, 2.0) * 2.0 - 1.0;
    float ticks = step(0.55, fract(ang * 48.0 / 6.2831853 + uTime * 0.05 * dir));
    float inner = cover(abs(d - 0.86), 0.005) * ticks;
    // Halo
    float halo = exp(-max(d - 1.0, 0.0) * 6.5) * step(1.0, d) * (0.025 + 0.05 * on + 0.3 * flash);
    // Schockwelle beim Eintreffen eines Impulses
    float sr = 1.0 + shockAge * 1.6;
    float sw = cover(abs(d - sr), 0.01 + shockAge * 0.025) * shockAmp * exp(-shockAge * 2.8) * step(shockAge, 1.6);

    // Icon
    int k = int(vIdx + 0.5);
    vec2 id = icon(k, vP / 0.9);
    // Hervorgehoben (focus): Icon voll hell und etwas kraeftiger, auch wenn das Kabel noch nicht angekommen ist
    float lit = max(on, focus);
    float hw = 0.03 + 0.008 * focus;
#ifdef CODANI_LIGHT
    hw *= 1.45; // hell: Striche kraeftiger (Tinte statt Leuchten)
#endif
    float ic = cover(id.x, hw) * inside;
    float acc = cover(id.y, hw) * inside;
    vec3 icCol = mix(uMist * 0.3, uIce * 1.25, lit) + uIce * 1.3 * flash;
    vec3 accCol = mix(uMist * 0.3, k == 4 ? uIce * 1.25 : uEmber * 1.6, lit) + uIce * 0.8 * flash;
    float icA = 1.0 - smoothstep(0.0, 0.45, portal);

    vec3 glow = rim * rimCol * (1.0 - 0.5 * portal)
      + spec * uWhite * (0.18 + 0.22 * on) * solid
      + inner * uSig * (0.2 + 0.4 * on) * solid
      + halo * uSig * solid
      + sw * mix(uSig * 1.3, uIce * 1.8, 0.5) * solid
      + (entry * (0.18 * on + 1.1 * flash) + bloomIn * flash * 0.12) * uSig * solid
      + (ic * icCol + acc * accCol) * icA;
    glow *= smoothstep(0.0, 0.6, appear) * (1.0 - 0.45 * dimO);

    float vis = uAlpha * fogVis(vDepth) * smoothstep(0.25, 0.7, vDepth);
#ifdef CODANI_LIGHT
    {
      // Helles Thema: weisses Glas mit Ring, Skala und Icon in Tinte, leiser Schatten statt Halo (vormultipliziert)
      float app = smoothstep(0.0, 0.6, appear) * (1.0 - 0.45 * dimO);
      vec3 glass = mix(vec3(1.2), vec3(0.98, 1.08, 1.12), clamp(fres * 0.8 + entry * (0.3 * on + flash), 0.0, 1.0));
      vec4 c = vec4(glass * bodyA, bodyA);
      float la = clamp(rim * (0.6 + 0.4 * on + 0.6 * flash) * (1.0 - 0.5 * portal), 0.0, 1.0) * app;
      c = vec4(uThemeTeal * la + c.rgb * (1.0 - la), la + c.a * (1.0 - la));
      la = clamp((inner * (0.3 + 0.4 * on) + sw * 0.8) * solid, 0.0, 1.0) * app;
      c = vec4(uThemeTeal * la + c.rgb * (1.0 - la), la + c.a * (1.0 - la));
      la = clamp(ic * (0.82 + 0.18 * lit), 0.0, 1.0) * icA * app;
      c = vec4(uThemeInk * la + c.rgb * (1.0 - la), la + c.a * (1.0 - la));
      la = clamp(acc * (0.82 + 0.18 * lit), 0.0, 1.0) * icA * app;
      c = vec4((k == 4 ? uThemeInk : uThemeWarm) * la + c.rgb * (1.0 - la), la + c.a * (1.0 - la));
      float sh = exp(-max(d - 1.0, 0.0) * 5.0) * step(1.0, d) * (0.1 + 0.08 * on) * solid * app;
      c = vec4(uThemeInk * sh + c.rgb * (1.0 - sh), sh + c.a * (1.0 - sh));
      gl_FragColor = c * vis;
      return;
    }
#endif
    // vormultipliziert: Koerper deckt ab (Alpha), Glanz addiert sich
    gl_FragColor = vec4((body * bodyA + glow) * vis, bodyA * vis);
  }
`;

/* ------------------------------------------------------------------ Spitzen */
const TIP_VS = /* glsl */ `
  uniform vec2 uResolution;
  uniform vec4 uTip[${N}];   // xyz Position, w Helligkeit
  attribute float aIdx;
  varying float vI, vDepth;
  void main() {
    vec4 t = uTip[int(aIdx + 0.5)];
    vec4 mv = modelViewMatrix * vec4(t.xyz, 1.0);
    vI = t.w;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = t.w > 0.001 ? min(64.0, 0.3 * projectionMatrix[1][1] * uResolution.y * 0.5 / max(vDepth, 0.05)) : 0.0;
  }
`;

const TIP_FS = /* glsl */ `
  ${FOG}
  uniform float uAlpha;
  uniform vec3 uTipCol, uSig;
  varying float vI, vDepth;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float r = length(q) * 2.0;
    // breiter, weicher Kern: winzige, sehr helle Punkte erzeugen im Bloom eckige Flecken
    float core = exp(-r * r * 20.0) * 0.5;
    float glow = exp(-r * r * 5.0) * 0.2;
    float a = (core + glow) * (1.0 - smoothstep(0.85, 1.0, r)) * vI * uAlpha * fogVis(vDepth) * smoothstep(0.05, 0.4, vDepth);
    gl_FragColor = vec4((uTipCol * core + uSig * 2.0 * glow) * a, 1.0);
  }
`;


/* ------------------------------------------------------------------ Staub */
// Feine Datenteilchen um die Kabel: geben Tiefe und Parallaxe bei der Kamerafahrt.
const MOTE_VS = /* glsl */ `
  uniform vec2 uResolution;
  uniform float uTime, uMotes;
  attribute vec4 aRnd;     // Phase, Groesse, Helligkeit, Erscheinen (0..1)
  varying float vA, vDepth;
  void main() {
    vec3 p = position;
    float ph = aRnd.x * 6.2831853;
    p += vec3(sin(uTime * 0.13 + ph), cos(uTime * 0.11 + ph * 1.3), sin(uTime * 0.09 + ph * 0.7)) * 0.16;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    float tw = 0.55 + 0.45 * sin(uTime * (0.8 + aRnd.y * 1.6) + ph * 3.0);
    vA = aRnd.z * tw * smoothstep(aRnd.w, aRnd.w + 0.15, uMotes);
    gl_Position = projectionMatrix * mv;
    float px = (0.01 + 0.018 * aRnd.y) * projectionMatrix[1][1] * uResolution.y * 0.5 / max(vDepth, 0.05);
    vA *= clamp(px / 1.5, 0.0, 1.0);
    gl_PointSize = clamp(px, 1.5, 24.0);
  }
`;

const MOTE_FS = /* glsl */ `
  ${FOG}
  uniform float uAlpha;
  uniform vec3 uMoteCol;
  varying float vA, vDepth;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float r = length(q) * 2.0;
    float a = exp(-r * r * 5.0) * (1.0 - smoothstep(0.8, 1.0, r));
    a *= vA * uAlpha * fogVis(vDepth) * smoothstep(0.3, 1.2, vDepth);
    gl_FragColor = vec4(uMoteCol * a, 1.0);
  }
`;

/** Materialien erzeugen. U: gemeinsame Uniforms der Szene. */
export function makeMaterials(THREE, U) {
  // DoubleSide: die Baender haben im Bildschirmraum immer dieselbe Drehrichtung (sonst alle weggeschnitten)
  const common = { transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide };
  const fibre = new THREE.ShaderMaterial({
    ...common,
    uniforms: U,
    vertexShader: FIBRE_VS,
    fragmentShader: FIBRE_FS,
    blending: THREE.AdditiveBlending,
  });
  const ring = new THREE.ShaderMaterial({
    ...common,
    uniforms: U,
    vertexShader: RING_VS,
    fragmentShader: RING_FS,
    blending: THREE.AdditiveBlending,
  });
  const node = new THREE.ShaderMaterial({
    ...common,
    uniforms: U,
    vertexShader: NODE_VS,
    fragmentShader: NODE_FS,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const tip = new THREE.ShaderMaterial({
    ...common,
    uniforms: U,
    vertexShader: TIP_VS,
    fragmentShader: TIP_FS,
    blending: THREE.AdditiveBlending,
  });
  const mote = new THREE.ShaderMaterial({
    ...common,
    uniforms: U,
    vertexShader: MOTE_VS,
    fragmentShader: MOTE_FS,
    blending: THREE.AdditiveBlending,
  });
  return { fibre, ring, node, tip, mote };
}
