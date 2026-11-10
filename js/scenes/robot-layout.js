// Szene "robot": Aufteilung der Schale (Fugen und Oeffnungen) als Felder in Ruhelage-Koordinaten (ARCHITEKTUR-Masse:
// Kopfmitte im Ursprung, Gesicht +Z, Kinn y -1, Scheitel y 1, Unterkante y -3.5). Meist symmetrisch: q = (|x|, y, z).
// Die Brust ist asymmetrisch (lSide = Vorzeichen von x): rechts im Bild (x < 0) eine weisse Brustplatte mit
// Rippenschlitzen, links offener Muskel.
//
// seamField(p): ungefaehre Distanz zur naechsten Fuge (Nullstellen glatter Funktionen, auf Bereiche begrenzt).
//   Der Shader rechnet daraus mit dem Tangential-Gradienten die Distanz auf der Oberflaeche (gleichmaessige Fugenbreite).
//   Gesicht symmetrisch wie eine Maske: Stirnplatte, Gesichtsmaske, seitliche Wangen- und Kieferplatten. Feine Lidfuge.
//   Schaedel: zwei Scheitelplatten mit Scheitelnaht (kein Ring mehr, wirkte wie ein Helm).
// openField(p): < 0 dort, wo keine Schale ist.
//   tief offen (deepOpen, auch keine Muskelschicht): Hinterhaupt als gewoelbte Oeffnung bis in den Nacken
//   (Schaedelgitter, Kabel, oben eine klare Glaskappe, die die Kopfform haelt),
//   Hals rundum (Kopfwender, Kehlkopf, Wirbel), Schlitz zwischen den Schulterblaettern (dort tauchen die Kabel ein).
//   Muskel offen: Rumpf vorne ausserhalb der Platten, Schulterring.
// Fugen im Gesicht je nach Gesicht (robot-face.js, faceSeamsGLSL): Standard D eine Gesichtsplatte, ?gesicht=alt wie
// Version 4 (gleicher Shader-Text wie damals).
import { FACE_STYLE } from './robot-face.js';

export const LAYOUT = {
  shoulder: [1.473, -2.257, -0.29],
  armDir: [0.199, -0.98, 0.017],
  ringAt: 0.5,
  ringHalf: 0.03,
  deltoid: [1.56, -2.02, -0.24],
  deltoidR: 0.6,
  // Hinterkopf-Oeffnung: Ellipse in (Bogenlaenge u ab hinten, y), Mitte yc, Halbachsen a (u) und b (y).
  // Oben gewoelbt wie das Hinterhaupt, unten offen in den Nacken (geht in die Hals-Oeffnung ueber).
  // Glas: schmale, gewoelbte Kappe im oberen Teil (oberhalb glassY, gewoelbter Unterrand).
  skull: { yc: -0.22, a: 0.92, b: 0.68, top: 0.46, bot: -0.9, glassY: -0.02 },
  // Brustplatte: Unterrand als Kreisbogen (Mitte, Radius)
  pecC: [0.08, -1.74],
  pecR: 1.16,
};

/* Fugen im Gesicht. v4 (?gesicht=alt): Text wie in Version 4 (Stirnfuge, Wangenfuge als Linie in der Vorderansicht,
   Lidfuge). mask (Gesicht D): nur die Maske (Haaransatz, Seite, Kiefer) und eine sehr leise Lidfalte, eine ruhige
   Gesichtsplatte ohne Querfugen (vorher rahmten Stirn- und Wangenfuge das Gesicht wie ein Helmvisier). */
function faceSeamsGLSL(st) {
  if (st.seams === 'v4') {
    return `    // Platten im Gesicht und Lidfuge
    if (q.z > 0.12 && face < 0.05) {
      // Plattenfugen im Gesicht etwas flacher als die Maske (weicher, Version 4)
      float dc = max(lFaceSeams(q.xy), face);
      if (dc < d) { d = dc; lSeamK = 0.7; }
      float dl = lLid(q.xy);
      if (dl < d) { d = dl; lSeamK = 0.45; }
    }`;
  }
  if (st.seams === 'ref') {
    return `    // Gesicht nach Vorlage: Fugen, Raender der Aussparungen und Schrauben in Vorlagen-Koordinaten (nur vorne)
    if (q.z > -0.15) {
      vec2 r = lRef(q);
      float kk; float ww;
      float dr = lRefSeams(r, kk, ww);
      if (dr < d) { d = dr; lSeamK = kk; lGapW = ww; }
    }`;
  }
  const lid = `      float dl = lLid(q.xy);
      if (dl < d) { d = dl; lSeamK = ${st.lidSeam.toFixed(3)}; }`;
  return `    // Gesicht D: eine Gesichtsplatte, nur die leise Lidfalte
    if (q.z > 0.12 && face < 0.05) {
${lid}
    }`;
}


/* ------------------------------------------------------------------ Gesicht nach Vorlage (FACE_STYLE.seams 'ref') */
// Alle Masse in Bildpunkten der Vorlage: [Abstand zur Mittelachse (x 672), Hoehe y]. Umrechnung in Vorlagen-Koordinaten
// wie robot-face.js (526 Bildpunkte je Einheit, Ursprung y 410). Gemessen an Rasterbildern der Vorlage.
const rp2 = (dx, y) => `vec2(${(dx / 526).toFixed(4)}, ${((410 - y) / 526).toFixed(4)})`;
const rlen = (n) => (n / 526).toFixed(5);
const chain = (pts) => pts.slice(1).map((q, i) => `lLine(p, ${rp2(...pts[i])}, ${rp2(...q)})`).reduce((a, b) => `min(${a}, ${b})`);
const taper = (pts) => pts.slice(1).map((q, i) => `lTaper(p, ${rp2(pts[i][0], pts[i][1])}, ${rp2(q[0], q[1])}, ${rlen(pts[i][2])}, ${rlen(q[2])})`).reduce((a, b) => `min(${a}, ${b})`);
// Huellkasten (Vorlagen-Koordinaten) fuer einen fruehen Ausstieg. Jedes Feld ist bei BB gekappt: ausserhalb des Kastens
// gilt derselbe Wert, das Feld bleibt also stetig (ein Sprung an der Kastenkante ergaebe ueber die Ableitung eine Linie).
const bbox = (pts, pad = 0) => {
  const us = pts.map((q) => q[0] / 526); const vs = pts.map((q) => (410 - q[1]) / 526);
  const f = (x) => x.toFixed(4);
  return `vec2 bb = max(vec2(${f(Math.min(...us) - pad)}, ${f(Math.min(...vs) - pad)}) - p, p - vec2(${f(Math.max(...us) + pad)}, ${f(Math.max(...vs) + pad)})); float ob = max(bb.x, bb.y);`;
};
const poly = (name, pts) => `float ${name}(vec2 p) {
  ${bbox(pts)}
  if (ob > BB) return BB;
  const vec2 v[${pts.length}] = vec2[${pts.length}](${pts.map((q) => rp2(...q)).join(', ')});
  float d = dot(p - v[0], p - v[0]); float s = 1.0;
  for (int i = 0, j = ${pts.length - 1}; i < ${pts.length}; j = i, i++) {
    vec2 e = v[j] - v[i]; vec2 w = p - v[i];
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= v[i].y, p.y < v[j].y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s = -s;
  }
  return min(s * sqrt(d), BB);
}`;
// Kreis durch drei Punkte (Bildpunkte) -> [Mitte als GLSL, Radius]
const circ3 = (a, b, c) => {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / d;
  const uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / d;
  return [rp2(ux, uy), rlen(Math.hypot(a[0] - ux, a[1] - uy))];
};
export const REF = {
  // Fugen: k Tiefe (1 Plattenfuge), w halbe Breite der Rinne in Einheiten
  seams: [
    { k: 1, w: 0.0042, pts: [[146, -40], [137, 0], [102, 150], [94, 158], [82, 162], [0, 160]] }, // Stirnplatte
    { k: 0.5, w: 0.0021, pts: [[258, 60], [245, 100], [236, 160], [235, 215]] }, // Schlaefe, feine Kante
    { k: 1, w: 0.0036, pts: [[235, 215], [239, 232], [250, 248], [298, 306], [297, 318], [287, 348]] }, // Schlaefenplatte
    { k: 0.7, w: 0.0026, pts: [[287, 348], [290.5, 380], [294, 396], [314, 387]] }, // Kante neben dem Auge
    { k: 1, w: 0.0036, pts: [[316, 457], [299, 480.5], [281.5, 498.6], [270.4, 505.5], [250.7, 519.4], [234, 530.5], [229.8, 540], [209.3, 568], [188.9, 592], [178.7, 602], [173.6, 612], [168.1, 640], [164.4, 680], [159.7, 720], [158.5, 733], [152, 797], [120, 826], [91, 863], [80, 881]] }, // Wange bis Kinn
    { k: 1, w: 0.0032, pts: [[227, 702], [158.5, 733]] }, // von der Kieferaussparung zur Wangenfuge
  ],
  // Kinnplatte: feiner Bogen (Kreis durch die Enden und den Scheitel)
  chin: circ3([-79.5, 881], [0, 832], [79.5, 881]),
  chinY: 881,
  // dunkle Aussparungen
  ventTemple: [[305, 118], [257, 98], [256, 128], [261, 136], [302, 176], [310, 150]],
  ventJaw: [[273, 582], [265, 592], [252.6, 612], [245, 632], [240, 655], [233.4, 680], [227, 700], [237, 694], [247.5, 676], [256, 655], [263, 632], [268.6, 610], [273, 595]],
  slotTop: [[253, 45, 5], [204, 15, 5]],
  // dunkler Spalt zwischen Schlaefenplatte und aeusserer Schale (aussen bleibt ein heller Steg stehen)
  ventStrut: [[316, 180], [328, 184], [331, 250], [328, 320], [316, 322], [318, 250]],
  // Lippen: leicht grauer als das Gesicht (Umriss von Ober- und Unterlippe)
  lipU: [[0, 694], [12, 690], [32, 688], [60, 703], [85, 716], [111, 730], [60, 727], [0, 723]],
  lipL: [[0, 723], [60, 727], [111, 730], [92, 748], [62, 764], [30, 771], [0, 773]],
  // Nasenloch als weicher Schatten: Mitte, Halbachsen
  nostril: [38, 613, 17, 8],
  screws: [[211, 62], [299, 219], [280, 478], [219.5, 743]],
  // Braue: Mittellinie mit halber Dicke
  // (automatisch gemessen: dunkelste Stelle je Spalte und Breite bei halber Tiefe, beide Seiten gemittelt)
  brow: [[284, 346, 1.2], [270, 336.5, 2.0], [250, 330, 2.6], [230, 326, 4.5], [210, 327, 5.5], [190, 329, 6.5], [170, 332.5, 7.0],
    [150, 336, 7.5], [130, 340, 7.5], [110, 345, 8.0], [90, 353, 8.5], [75, 358.5, 7.5], [62, 364, 5.5]],
  // Mundlinie: feiner dunkler Strich zwischen den Lippen, zu den Mundwinkeln hin duenner
  mouth: [[0, 723, 1.7], [60, 727, 1.6], [100, 729.5, 1.2], [114, 730.5, 0.5]],
  // Auge: dunkle Mandel (Lidstrich, Lidkante und Augapfel) als Umriss, automatisch an der Vorlage gemessen (dunkle
  // Flaeche um die Iris, beide Augen gemittelt): oben von innen nach aussen, unten zurueck. Dazu der Strich zur Schlaefe.
  eye: [[73, 441], [76, 430], [80, 420], [90, 404], [100, 392.5], [110, 386.5], [120, 381], [130, 378], [140, 376],
    [150, 372.5], [160, 371.5], [180, 372], [200, 374], [210, 375.5], [220, 378.5], [230, 382.5], [240, 387],
    [250, 395.5], [258, 404], [264, 411], [258, 419], [250, 426.5], [240, 430.5], [230, 437], [220, 442.5],
    [210, 446.5], [200, 449], [190, 451], [170, 452], [160, 451.5], [150, 451], [140, 449.5], [130, 447.5],
    [110, 446], [90, 447.5], [80, 448], [74, 446]],
  wing: [[256, 412, 5], [270, 410, 3.2], [281, 404.5, 2.5], [294, 396.5, 1.2]],
};
const REF_GLSL = FACE_STYLE.seams !== 'ref' ? '' : `
// ---- Gesicht nach Vorlage: Vorlagen-Koordinaten (Zentralprojektion der Pruefkamera, wie REF_CAM in robot-face.js)
const float BB = 0.03;
vec2 lRef(vec3 q) { float d = 9.65 - q.z; return vec2(q.x * 9.0494 / d, -0.3317 + 9.0494 * (q.y + 0.345) / d); }
float lTaper(vec2 p, vec2 a, vec2 b, float ra, float rb) {
  vec2 pa = p - a; vec2 ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - mix(ra, rb, h);
}
${poly('lRefVentT', REF.ventTemple)}
${poly('lRefVentJ', REF.ventJaw)}
${poly('lRefVentS', REF.ventStrut)}
${poly('lRefLipU', REF.lipU)}
${poly('lRefLipL', REF.lipL)}
// Lippen (0 .. 1), weiche Kante
float lRefLips(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  if (q.z < 0.5 || q.y > -0.3 || q.y < -0.9) return 0.0;
  vec2 r = lRef(q);
  // Oberlippe etwas grauer, Unterlippe fast wie das Gesicht (in der Vorlage hell mit Glanz)
  return max(1.0 - smoothstep(-0.004, 0.006, lRefLipU(r)), 0.45 * (1.0 - smoothstep(-0.004, 0.006, lRefLipL(r))));
}
float lRefSlot(vec2 p) { return ${taper(REF.slotTop)}; }
float lRefMouth(vec2 p) { return ${taper(REF.mouth)}; }
float lRefScrew(vec2 p) {
  float d = 1e3;
${REF.screws.map((c) => `  d = min(d, length(p - ${rp2(...c)}));`).join('\n')}
  return d;
}
// Fugen: naechste Fuge mit Tiefe k und halber Breite w
float lRefSeams(vec2 p, out float k, out float w) {
  float d = 1e3; float t; k = 1.0; w = 0.0021;
${REF.seams.map((sm) => `  { ${bbox(sm.pts)}\n    t = ob > BB ? BB : min(${chain(sm.pts)}, BB); }\n  if (t < d) { d = t; k = ${sm.k.toFixed(2)}; w = ${sm.w.toFixed(4)}; }`).join('\n')}
  // Kinnplatte
  t = max(abs(length(p - ${REF.chin[0]}) - ${REF.chin[1]}), ${((410 - REF.chinY) / 526).toFixed(4)} - p.y);
  if (t < d) { d = t; k = 0.55; w = 0.0018; }
  // Raender der Aussparungen und Schraubenkoepfe
  t = min(min(abs(lRefVentT(p)), abs(lRefVentJ(p))), min(abs(lRefSlot(p)), abs(lRefVentS(p))));
  if (t < d) { d = t; k = 1.0; w = 0.0024; }
  t = abs(lRefScrew(p) - ${rlen(7)});
  if (t < d) { d = t; k = 0.8; w = 0.0018; }
  return d;
}
float lRefBrow(vec2 p) { ${bbox(REF.brow, 0.02)} if (ob > BB) return BB; return min(${taper(REF.brow)}, BB); }
${poly('lRefEyeP', REF.eye)}
float lRefEye(vec2 p) { return min(lRefEyeP(p), min(${taper(REF.wing)}, BB)); }
// Auge von innen (Rueckseiten der Schale am Lidrand): 1 im Umriss des Auges
float lRefEyeIn(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  if (q.z < 0.3 || q.y > 0.3 || q.y < -0.4) return 0.0;
  return 1.0 - smoothstep(0.004, 0.008, lRefEyeP(lRef(q)));
}
// Bemalung (0 keine .. 1 dunkel): Braue, Lidstrich mit Augenhoehle, Aussparungen, Schraubenkoepfe. aa: Kantenbreite
float lRefPaint(vec3 p, float aa) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  if (q.z < -0.15 || q.y < -1.1) return 0.0;
  vec2 r = lRef(q);
  float d = min(lRefEye(r), min(min(lRefVentT(r), lRefVentJ(r)), min(min(lRefSlot(r), lRefVentS(r)), lRefScrew(r) - ${rlen(5.2)})));
  if (q.y < -0.3) d = min(d, lRefMouth(r));
  float nz = 1.0 - smoothstep(0.5, 1.15, length((r - ${rp2(REF.nostril[0], REF.nostril[1])}) / vec2(${rlen(REF.nostril[2])}, ${rlen(REF.nostril[3])})));
  // Braue mit weicher Kante (in der Vorlage laeuft sie ueber gut zwei Bildpunkte aus)
  float br = 0.94 * (1.0 - smoothstep(-0.0045, 0.004, lRefBrow(r)));
  return max(max(1.0 - smoothstep(-aa, aa, d), br), 0.88 * nz) * smoothstep(-0.15, 0.0, q.z);
}
`;

const f3 = (a) => `vec3(${a.map((x) => x.toFixed(4)).join(', ')})`;
const f2 = (a) => `vec2(${a.map((x) => x.toFixed(4)).join(', ')})`;
const SK = LAYOUT.skull;

export const LAYOUT_GLSL = /* glsl */ `
// Oberarm-Gewicht des aktuellen Punkts (aus dem Skinning, 0 Rumpf .. 1 Arm) und Seite, vor dem Aufruf setzen
float lArm = 0.0;
float lSide = 1.0;
// Tiefe der naechsten Fuge (1 Plattenfuge, kleiner: feine Falte wie die Lidfuge), wird von seamField gesetzt
float lSeamK = 1.0;
// halbe Breite der Rinne der naechsten Fuge (Einheiten)
float lGapW = 0.0021;
float lArmSdf() { return (0.45 - lArm) * 0.35; }
float lSmax(float a, float b, float k) { float h = clamp(0.5 - 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) + k * h * (1.0 - h); }
float lSmin(float a, float b, float k) { return -lSmax(-a, -b, k); }
float lSeg(float s, float m) { return max(abs(s), -m); }
float lRoundBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float lLine(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a; vec2 ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }

// Gesichtsmaske: < 0 innerhalb (unter dem Haaransatz, vor der Ohr-Platte, ueber der Kieferlinie)
float lJaw(vec3 q) { return -(q.y + 0.62 + 0.63 * (q.z - 0.05)) / 1.183; }
float lFace(vec3 q) {
  float A = q.y - (0.56 - 0.5 * q.x * q.x);
  float rxz = length(q.xz);
  float th = atan(q.x, q.z);
  float ths = 1.2 + 0.36 * smoothstep(-0.12, -0.62, q.y);
  float B = (th - ths) * rxz;
  // Version 4: Ecken der Maske runder (vorher 0.08 und 0.05), kein spitzer Winkel am Kiefer
  return lSmax(lSmax(A, B, 0.11), lJaw(q), 0.1);
}
float lRing(vec3 q) { return q.y - (0.43 - 0.06 * q.z); }

// Fugen der Gesichtsplatten (Vorderansicht x/y, nur x >= 0), symmetrisch wie eine Maske:
// Stirnplatte | Gesichtsmaske (Augen, Nase, Mund, Kinn) | seitliche Wangen- und Kieferplatte.
// Keine Linien durch Mund und Nasenfluegel (sonst wirkt es wie eine Bauchrednerpuppe).
// Version 4 (Gesicht weicher): die Wangenfuge laeuft als flacher Bogen weiter aussen hinunter (endet am Kiefer statt
// unter dem Jochbein nach innen zur Nase zu ziehen) und geht mit einer Rundung in die Stirnfuge ueber.
float lFaceSeams(vec2 p) {
  // Stirn: flacher Bogen ueber den Brauen
  float fh = abs(p.y - (0.262 - 0.11 * p.x * p.x));
  // Wange: aussen am Augenhoehlenrand hinunter, sanft nach innen zum Kiefer
  float t = clamp(-p.y / 0.95, 0.0, 1.0);
  float ck = max(abs(p.x - (0.668 - 0.2 * t * t)), p.y - 0.2);
  return lSmin(fh, ck, 0.02);
}
// Lidfuge: oberer Bogen knapp ueber dem Auge (Lidfalte)
float lLid(vec2 p) {
  vec2 r = vec2(0.15, 0.078);
  vec2 d = (p - vec2(0.3, -0.012)) / r;
  return max(abs(length(d) - 1.0) * 0.08, (0.012 - p.y) * 0.6);
}

${REF_GLSL}
// Hals: Polarwinkel um die Halsachse (0 vorne, pi hinten)
float lNeckTh(vec3 q, out float rn) {
  float zn = -0.21 - 0.12 * clamp(-1.0 - q.y, -0.4, 0.6);
  vec2 d = vec2(q.x, q.z - zn);
  rn = max(length(d), 0.2);
  return atan(d.x, d.y);
}
float lHeadSdf(vec3 q) { return min(lJaw(q), max(-(q.y + 0.64 - 0.06 * q.z), q.z - 0.05)); }
// Hals rundum offen: zwischen Kopf (Kiefer, Schaedelbasis) und Rumpf (Schluesselbein vorne, Trapez hinten)
float lNeckBand(vec3 q) {
  float rn;
  float th = lNeckTh(q, rn);
  float bot = -1.6 + 0.13 * smoothstep(0.55, 1.6, th);
  float w = max(bot - q.y, -lHeadSdf(q));
  return max(w, rn - 0.52);
}
// Hinterkopf: Oeffnung ab hinter der Ohr-Platte, gewoelbt, unten in den Nacken offen
float lSkullU(vec3 q) {
  float th = atan(q.x, q.z);
  return (3.14159 - th) * length(q.xz);
}
float lSkullWin(vec3 q) {
  vec2 e = vec2(lSkullU(q) / ${SK.a.toFixed(3)}, (q.y - (${SK.yc.toFixed(3)})) / ${SK.b.toFixed(3)});
  return (length(e) - 1.0) * ${Math.min(SK.a, SK.b).toFixed(3)};
}
// Schlitz zwischen den Schulterblaettern: hier tauchen die Kabel in den Rumpf. Oben breit, unten schmaler, damit die
// Kabel als lockerer Vorhang eintauchen (nicht zu einem Zopf zusammenlaufen). Breite wie slotHalf() in robot-mech.js.
float lBackSlot(vec3 q) {
  float hw = 0.31 - 0.07 * smoothstep(-1.46, -2.2, q.y);
  float s = lRoundBox(vec2(q.x, q.y + 1.83), vec2(hw, 0.37), 0.12);
  return max(s, q.z + 0.3);
}
// tief offen: keine Schale, keine Muskelschicht (Blick auf Mechanik)
float deepOpen(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  return min(min(lNeckBand(q), lSkullWin(q)), lBackSlot(q));
}
// Glas ueber dem oberen Teil des Hinterkopf-Fensters (> 0: Glas). glassLow: Abstand zur Unterkante der Kappe.
float glassLow(vec3 q) { float u = lSkullU(q); return q.y - (${SK.glassY.toFixed(3)} + 0.24 * u * u); }
float glassField(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  // runde Ecken (weiches Minimum): Unterkante und Fensterrand treffen sich tangential, keine spitze Facette
  return lSmin(-lSkullWin(q) - 0.03, glassLow(q), 0.1);
}

// Schluesselbein-Linie (y in Abhaengigkeit von x)
float lClavY(float x) { return -1.66 - 0.16 * (x - 0.12) + 0.035 * sin((x - 0.12) * 2.8); }
vec3 lDelt() { return ${f3(LAYOUT.deltoid)}; }
float lDeltSdf(vec3 q) {
  vec3 ad = ${f3(LAYOUT.armDir)};
  vec3 rel = q - lDelt();
  float t = dot(rel, ad);
  rel -= ad * t * (1.0 - 1.0 / 1.3);
  return length(rel) - ${LAYOUT.deltoidR.toFixed(3)} * 0.93;
}
// Unterrand der Brustplatte (Kreisbogen) und Rippenschlitze parallel dazu
float lPecLow(vec3 q) { return length(q.xy - ${f2(LAYOUT.pecC)}) - ${LAYOUT.pecR.toFixed(3)}; }

// Platten des vorderen Rumpfs: < 0 innerhalb
float lPlates(vec3 q) {
  float cy = lClavY(q.x);
  // Schluesselbein-Spange
  float clav = lSmax(abs(q.y - cy) - 0.05, lSmax(0.13 - q.x, q.x - 1.26, 0.05), 0.04);
  float dd = lDeltSdf(q);
  float pec = 1e3;
  if (lSide < 0.0) {
    // Brustplatte wie der grosse Brustmuskel: vom Brustbein zur Achsel, oben Schluesselbein, unten runder Bogen
    float xLat = 1.12;
    float inside = lSmax(lSmax(0.012 - q.x, q.y - (cy - 0.085), 0.05), lSmax(lPecLow(q), lSmax(0.05 - dd, q.x - xLat, 0.1), 0.08), 0.06);
    // Rippenschlitze: vier kurze, leicht geneigte Schlitze aussen unten (wie Rippen), innen tuerkis
    float slit = 1e3;
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      float yk = -2.1 - 0.082 * fk - 0.11 * (q.x - 0.72);
      float s = lSmax(abs(q.y - yk) - 0.0135, max(0.5 + 0.035 * fk - q.x, q.x - (0.99 - 0.03 * fk)), 0.016);
      slit = min(slit, max(s, lPecLow(q) + 0.07));
    }
    pec = max(inside, -slit);
  }
  // Schulterkappe
  float delt = dd;
  // Oberarm-Schale unter dem Schulterring
  vec3 S = ${f3(LAYOUT.shoulder)};
  vec3 ad = ${f3(LAYOUT.armDir)};
  vec3 rel = q - S;
  float ta = dot(rel, ad);
  float sleeve = lSmax(${(LAYOUT.ringAt + LAYOUT.ringHalf).toFixed(3)} - ta, lArmSdf(), 0.03);
  float upper = lSmax(ta - ${(LAYOUT.ringAt - LAYOUT.ringHalf).toFixed(3)}, lArmSdf(), 0.03);
  sleeve = min(sleeve, upper);
  return min(min(clav, pec), min(delt, sleeve));
}

float seamField(vec3 p) {
  lSide = p.x < 0.0 ? -1.0 : 1.0;
  lSeamK = 1.0;
  lGapW = 0.0021;
  vec3 q = vec3(abs(p.x), p.y, p.z);
  float d = 1e3;
  if (q.y > -1.15) {
    float face = lFace(q);
${FACE_STYLE.seams === 'ref' ? '' : `    // Gesichtsmaske (nur am Kopf, nicht am Hals)
    d = min(d, max(abs(face), -(q.y + 0.75 + 0.6 * max(q.z, 0.0))));`}
${faceSeamsGLSL(FACE_STYLE)}
    // Schaedeldecke: zwei Scheitelplatten, Scheitelnaht von der Maske bis zur Oeffnung hinten
    d = min(d, max(q.x, max(${FACE_STYLE.seams === 'ref' ? '0.02 + q.z' : '-face'}, 0.05 - lSkullWin(q))));
  }
  // Ruecken: Schulterblatt
  d = min(d, max(abs(length(q - vec3(0.78, -2.6, -1.1)) - 0.62), max(q.z + 0.45, 0.12 - q.x)));
  // Schulterkappe: Fuge hinten (Kappe gegen Ruecken)
  d = min(d, max(abs(lDeltSdf(q)), max(q.z + 0.2, 1.0 - q.x)));
  // Oberarm: Laengsfuge aussen
  vec3 S = ${f3(LAYOUT.shoulder)};
  vec3 ad = ${f3(LAYOUT.armDir)};
  vec3 rel = q - S;
  float ta = dot(rel, ad);
  vec3 radial = rel - ad * ta;
  d = min(d, max(abs(radial.z + 0.02), max(max(${LAYOUT.ringAt.toFixed(3)} - ta, lArmSdf()), -radial.x)));
  return d;
}

// Gravierte Linien (keine Oeffnung, nur Rille): Schulterkappe innen
float grooveField(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  return max(abs(lDeltSdf(q) + 0.075), 1.02 - q.x);
}

float openField(vec3 p) {
  lSide = p.x < 0.0 ? -1.0 : 1.0;
  vec3 q = vec3(abs(p.x), p.y, p.z);
  float o = deepOpen(p);
  // Rumpf vorne: offen, wo keine Platte liegt
  float front = lSmax(q.y + 1.38, -(q.z + 0.22 - 0.06 * q.x), 0.05);
  o = min(o, max(front, -lPlates(q)));
  // Schulterring rundum
  vec3 S = ${f3(LAYOUT.shoulder)};
  vec3 ad = ${f3(LAYOUT.armDir)};
  vec3 rel = q - S;
  float ta = dot(rel, ad);
  o = min(o, max(abs(ta - ${LAYOUT.ringAt.toFixed(3)}) - ${LAYOUT.ringHalf.toFixed(3)}, lArmSdf()));
  return o;
}
`;

/* ------------------------------------------------------------------ JS-Fassung (CPU) */
// Gleiche Formeln wie openField/deepOpen oben, fuer Entscheidungen beim Aufbau (z. B. Muskel-Gel nur dort erzeugen,
// wo die Schale offen ist). Gibt den Wert von openField(p) zurueck (< 0: offen). arm = Oberarm-Gewicht (aArm).
const jsClamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const jSmax = (a, b, k) => { const h = jsClamp(0.5 - 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h + k * h * (1 - h); };
const jSmin = (a, b, k) => -jSmax(-a, -b, k);
const jRoundBox = (px, py, bx, by, r) => {
  const qx = Math.abs(px) - bx + r; const qy = Math.abs(py) - by + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const JS = LAYOUT.shoulder; const JAD = LAYOUT.armDir; const JDL = LAYOUT.deltoid;
const jJaw = (x, y, z) => -(y + 0.62 + 0.63 * (z - 0.05)) / 1.183;
const jHeadSdf = (x, y, z) => Math.min(jJaw(x, y, z), Math.max(-(y + 0.64 - 0.06 * z), z - 0.05));
const jNeckBand = (x, y, z) => {
  const zn = -0.21 - 0.12 * jsClamp(-1 - y, -0.4, 0.6);
  const rn = Math.max(Math.hypot(x, z - zn), 0.2);
  const th = Math.atan2(x, z - zn);
  const t = jsClamp((th - 0.55) / (1.6 - 0.55), 0, 1);
  const bot = -1.6 + 0.13 * t * t * (3 - 2 * t);
  return Math.max(Math.max(bot - y, -jHeadSdf(x, y, z)), rn - 0.52);
};
const jSkullWin = (x, y, z) => {
  const u = (Math.PI - Math.atan2(x, z)) * Math.hypot(x, z);
  return (Math.hypot(u / SK.a, (y - SK.yc) / SK.b) - 1) * Math.min(SK.a, SK.b);
};
const jSs = (a, b, x) => { const t = jsClamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const jBackSlot = (x, y, z) => {
  const hw = 0.31 - 0.07 * jSs(-1.46, -2.2, y);
  return Math.max(jRoundBox(x, y + 1.83, hw, 0.37, 0.12), z + 0.3);
};
export function deepOpenJS(px, y, z) {
  const x = Math.abs(px);
  return Math.min(Math.min(jNeckBand(x, y, z), jSkullWin(x, y, z)), jBackSlot(x, y, z));
}
const jClavY = (x) => -1.66 - 0.16 * (x - 0.12) + 0.035 * Math.sin((x - 0.12) * 2.8);
const jDeltSdf = (x, y, z) => {
  let rx = x - JDL[0]; let ry = y - JDL[1]; let rz = z - JDL[2];
  const t = rx * JAD[0] + ry * JAD[1] + rz * JAD[2];
  const k = t * (1 - 1 / 1.3);
  rx -= JAD[0] * k; ry -= JAD[1] * k; rz -= JAD[2] * k;
  return Math.hypot(rx, ry, rz) - LAYOUT.deltoidR * 0.93;
};
const jPecLow = (x, y) => Math.hypot(x - LAYOUT.pecC[0], y - LAYOUT.pecC[1]) - LAYOUT.pecR;
const jArmSdf = (arm) => (0.45 - arm) * 0.35;
function jPlates(x, y, z, side, arm) {
  const cy = jClavY(x);
  const clav = jSmax(Math.abs(y - cy) - 0.05, jSmax(0.13 - x, x - 1.26, 0.05), 0.04);
  const dd = jDeltSdf(x, y, z);
  let pec = 1e3;
  if (side < 0) {
    const inside = jSmax(jSmax(0.012 - x, y - (cy - 0.085), 0.05), jSmax(jPecLow(x, y), jSmax(0.05 - dd, x - 1.12, 0.1), 0.08), 0.06);
    let slit = 1e3;
    for (let k = 0; k < 4; k++) {
      const yk = -2.1 - 0.082 * k - 0.11 * (x - 0.72);
      const s = jSmax(Math.abs(y - yk) - 0.0135, Math.max(0.5 + 0.035 * k - x, x - (0.99 - 0.03 * k)), 0.016);
      slit = Math.min(slit, Math.max(s, jPecLow(x, y) + 0.07));
    }
    pec = Math.max(inside, -slit);
  }
  const rx = x - JS[0]; const ry = y - JS[1]; const rz = z - JS[2];
  const ta = rx * JAD[0] + ry * JAD[1] + rz * JAD[2];
  let sleeve = jSmax(LAYOUT.ringAt + LAYOUT.ringHalf - ta, jArmSdf(arm), 0.03);
  const upper = jSmax(ta - (LAYOUT.ringAt - LAYOUT.ringHalf), jArmSdf(arm), 0.03);
  sleeve = Math.min(sleeve, upper);
  return Math.min(Math.min(clav, pec), Math.min(dd, sleeve));
}
export function openFieldJS(px, y, z, arm) {
  const side = px < 0 ? -1 : 1;
  const x = Math.abs(px);
  let o = deepOpenJS(px, y, z);
  const front = jSmax(y + 1.38, -(z + 0.22 - 0.06 * x), 0.05);
  o = Math.min(o, Math.max(front, -jPlates(x, y, z, side, arm)));
  const rx = x - JS[0]; const ry = y - JS[1]; const rz = z - JS[2];
  const ta = rx * JAD[0] + ry * JAD[1] + rz * JAD[2];
  o = Math.min(o, Math.max(Math.abs(ta - LAYOUT.ringAt) - LAYOUT.ringHalf, jArmSdf(arm)));
  return o;
}
