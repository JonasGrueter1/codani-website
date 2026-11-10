// Szene "robot": Gesicht und Figur der Android-Bueste.
// Standard ist Gesicht r (10.11.2026): deckungsgleich nach der Vorlage von Jonas (ARCHITEKTUR.md Kapitel 11, Version 6).
// Es baut auf Gesicht D auf (?gesicht=d zeigt es zum Vergleich). Zu D (08.11.2026): Rueckmeldung Jonas zu den Varianten A bis C vom 07.11.: "das Gebiss immer noch
// zu mollig", "die Figur soll schon einiges schlanker sein", "die Backen sind eckig", "es soll freundlich aussehen, es
// ist ja fuer eine Website und nicht einen Terminator-Film". D baut auf Variante B auf (eine Gesichtsplatte ohne
// Querfugen) und geht deutlich weiter:
//   schlanker   ganzer Kopf etwas schmaler, Wangen und Kiefer rund 12 bis 18 % schmaler, feines, leicht spitz
//               zulaufendes, rundes Kinn; Rumpf (Schultern, Brust) schlanker ueber abSlim in robot-materials.js
//   weich       runde Wangen (Apfel unter dem Auge), weicher Wangenknochen, sanfte Mulde darunter, keine Kanten
//   freundlich  leises Laecheln (Mundwinkel hoch), entspannte Lider, weichere, leicht gehobene Brauen, die dunkle
//               Mulde zwischen Braue und Lid gefuellt und aufgehellt
// ?gesicht=alt zeigt zum Vergleich das Gesicht und die Figur von Version 4 (gleicher Shader-Text wie damals).
//
// Wirkt wie softenFace (robot-mesh.js) auf das Kontrollnetz vor der Glaettung: Schale, Partikel-Bueste und Kopfform
// (robot-geometry.js) haben dasselbe Gesicht. Die Landmarken (Augen, Mundlinie, Ohrmodule) wandern mit, damit
// Augaepfel, Ohrmodule und der dunkle Abschluss hinter dem Mund (robot-mech.js) passen. Fugen (robot-layout.js),
// Rumpf (robot-materials.js) und Augen (robot-mech.js) lesen FACE_STYLE.

/** Gesicht aus der Adresse der Seite: 'r' (Standard), 'd' (Version 5), 'alt' (Version 4), zum Messen 'rb', 'rm', 'rn'.
    Im Web Worker steht dort die Adresse des
    Workers: robot-mesh.js gibt das Gesicht darum mit. */
export function readFaceVariant() {
  try {
    const s = globalThis.location && globalThis.location.search ? globalThis.location.search : '';
    const g = (new URLSearchParams(s).get('gesicht') || '').toLowerCase();
    return ['alt', 'd', 'e', 'f', 'rb', 'rm', 'rn'].includes(g) ? g : 'r';
  } catch (e) {
    return 'r';
  }
}
export const FACE_VARIANT = readFaceVariant();

/*
 * Stil (ausser der Form):
 *   lid      Faktor auf das Anheben des Oberlids (applyExpression): kleiner = entspannter Blick, Lid deckt den Irisrand
 *   seams    Fugen im Gesicht (robot-layout.js): v4 wie bisher (Stirn-, Wangen- und Lidfuge), mask (nur die Maske)
 *   lidSeam  Tiefe der Lidfalte (v4 0.45; kleiner: keine "Brille" um die Augen)
 *   sclera   Helligkeit des Augapfels (v4 0.42 x Weiss)
 *   slim     Rumpf schmaler (robot-materials.js abSlim): Anteil in x an den Schultern, 0 = wie Version 4
 *   fill     Aufheller von unten nur im Gesicht (robot-materials.js, Schale): [diffus, Spiegelung], 0 = keiner
 */
const STYLES = {
  alt: { lid: 1, seams: 'v4', lidSeam: 0.45, sclera: 0.42, slim: 0, fill: 0 },
  d: { lid: 0.8, seams: 'mask', lidSeam: 0.16, sclera: 0.52, slim: 0.1, fill: [0.24, 0.05] },
  // eye: Faktor auf den Augapfel (robot-mech.js), groessere Augen wirken jung und freundlich
  e: { lid: 0.95, seams: 'mask', lidSeam: 0.08, sclera: 0.74, slim: 0.13, fill: [0.3, 0.06], eye: 1.1 },
  f: { lid: 0.95, seams: 'mask', lidSeam: 0.08, sclera: 0.74, slim: 0.13, fill: [0.3, 0.06], eye: 1.06 },
  // r: nach der Vorlage von Jonas (10.11.2026): Plattenfugen mit Schrauben, dunkle Augenhoehle mit leuchtenden
  // blauen Ringen (glow), Brauen und Lidrand als dunkle Linie, vollere Lippen
  // eyeOff: Augapfel gegenueber der Landmarke versetzt [nach aussen, nach oben], damit die Iris auf der Vorlage sitzt
  r: { lid: 1.0, seams: 'ref', lidSeam: 1.0, sclera: 0.05, slim: 0.13, fill: [0.3, 0.06], eye: 1.34, glow: 1, eyeOff: [-0.0012, -0.0015],
    // tone: Licht nach Vorlage als Helligkeitskarte (robot-tone.js, robot-materials.js)
    tone: 1 },
};
STYLES.rb = STYLES.r; // Grundform von r ohne Verzug (nur zum Vermessen)
STYLES.rm = { ...STYLES.r, seams: 'mask', lidSeam: 0.1, tone: 0 }; // nur erste Verzug-Stufe, ohne Bemalung (Lidoeffnung messen)
STYLES.rn = STYLES.rm; // Form von r ganz, aber ohne Bemalung (Lidoeffnung messen)
export function faceStyle(v) { return STYLES[v] || STYLES.r; }
export const FACE_STYLE = faceStyle(FACE_VARIANT);

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/*
 * Bausteine (symmetrisch, c[0] >= 0 gilt fuer beide Seiten):
 *   head   ganzer Kopf schmaler (x * (1 - k)), zum Hals hin (y0 -> y1) auslaufend
 *   band   wie head, aber nur in einem Band der Hoehe (Rampe y0 -> y1 hinein, y2 -> y3 hinaus)
 *   blob   Verschiebung d mit Gauss-Abfall um c (Halbachsen r); d[0] zeigt nach aussen
 *   pinch  zur Mitte hin schmaler (x * (1 - k w))
 *   jaw    Unterkiefer zum Kinn hin schmaler: Rampe in y (y0 -> y1) und |x| (x0 -> x1), k am Kieferwinkel, zf: Rampe in
 *          z (voll hinten, 0 vorne)
 *   smooth Taubin-Glaettung (ohne Schrumpfen) im Gewicht eines Ellipsoids, Augen, Nase, Lippen ausgenommen
 *   mouth  Lippen schliessen: Ober- und Unterlippe der Mundoeffnung treffen sich bis auf einen feinen Spalt
 *   seal   Lippen zur Mundlinie hin stauchen (aus der tiefen V-Rinne zwischen den Lippen wird ein feiner Spalt)
 *   ao     offline gerechnete Verdeckung aufhellen, wo eine Mulde gefuellt wird
 */
// Lippen: geschlossen, Oberlippe als runde Lippe statt Kante, Amorbogen, Philtrum, Unterlippe in der Mitte voller
const lips = (k, bow = 1) => [
  { op: 'mouth', gap: 0.002 },
  { op: 'seal', up: 0.04, au: 0.75, dn: 0.028, ad: 0.55 },
  // Mundlinie nach vorne: die Oberlippe zeigt nach vorne statt nach unten in den Schatten (vorher eine Kante ueber
  // einem dunklen Spalt)
  { op: 'blob', c: [0, -0.615, 0.83], r: [0.13, 0.03, 0.05], d: [0, 0, 0.024 * k] },
  { op: 'blob', c: [0, -0.597, 0.875], r: [0.11, 0.02, 0.06], d: [0, -0.002, 0.02 * k] },
  { op: 'blob', c: [0.045, -0.553, 0.915], r: [0.026, 0.013, 0.05], d: [0, 0.005 * k * bow, 0.003 * k * bow] },
  { op: 'blob', c: [0, -0.49, 0.912], r: [0.022, 0.05, 0.05], d: [0, 0, -0.006 * k] },
  { op: 'blob', c: [0.036, -0.49, 0.905], r: [0.014, 0.05, 0.05], d: [0, 0, 0.002 * k] },
  { op: 'blob', c: [0, -0.657, 0.862], r: [0.085, 0.024, 0.06], d: [0, 0.002, 0.012 * k] },
  { op: 'blob', c: [0.17, -0.652, 0.8], r: [0.05, 0.03, 0.06], d: [0, 0.002, -0.006 * k] },
];
// Unterlid: weniger Traenensack
const lowerLid = (k) => [{ op: 'blob', c: [0.3, -0.125, 0.665], r: [0.1, 0.04, 0.06], d: [0, 0.003 * k, -0.009 * k] }];
// Mulde unter der Braue flacher und heller (weniger dunkle, muede Augenhoehle)
const upperLid = (k) => [
  { op: 'blob', c: [0.3, 0.13, 0.8], r: [0.12, 0.05, 0.07], d: [0, 0, 0.009 * k] },
  { op: 'ao', c: [0.3, 0.12, 0.78], r: [0.17, 0.08, 0.12], k: 0.32 * k },
];
// Kinn unten an den Seiten runder (in der Vorderansicht kein flacher Boden)
const chinRound = (k) => [{ op: 'blob', c: [0.19, -0.97, 0.62], r: [0.08, 0.05, 0.2], d: [-0.008 * k, 0.014 * k, 0] }];
// Nase feiner: Nasenfluegel schmaler, Spitze zierlicher und leicht angehoben, Ruecken schmaler
const nose = (k) => [
  { op: 'pinch', c: [0.18, -0.4, 0.84], r: [0.1, 0.08, 0.12], k: 0.09 * k },
  { op: 'blob', c: [0, -0.29, 1.0], r: [0.07, 0.06, 0.06], d: [0, 0.008 * k, -0.01 * k] },
  { op: 'pinch', c: [0, -0.08, 0.86], r: [0.1, 0.12, 0.08], k: 0.07 * k },
];

const VARIANTS = {
  d: [
    // schlanker als Oval (nicht als Dreieck): ganzer Kopf, Wangenknochen und Schlaefen, dann Wangen und Kiefer (vorne
    // weniger als an den Seiten), Kinn fein und rund
    { op: 'head', y0: -1.3, y1: -1.0, k: 0.04 },
    // unterer Kopf von den Wangenknochen bis zum Kiefer, auch hinter dem Gesicht (bildet vorne die Silhouette)
    { op: 'band', y0: 0.25, y1: -0.15, y2: -0.95, y3: -1.25, k: 0.065 },
    { op: 'jaw', y0: 0.15, y1: -0.35, x0: 0.3, x1: 0.66, k: 0.03, zf: [0.7, 0.3], zk: 0.2 },
    { op: 'jaw', y0: -0.1, y1: -0.82, x0: 0.1, x1: 0.56, k: 0.045, zf: [0.85, 0.35], zk: 0.45 },
    { op: 'jaw', y0: -0.45, y1: -1.0, x0: 0.12, x1: 0.5, k: 0.03, zf: [0.75, 0.35], zk: 0.3 },
    { op: 'pinch', c: [0, -0.93, 0.72], r: [0.28, 0.14, 0.34], k: 0.08 },
    { op: 'blob', c: [0, -0.88, 0.82], r: [0.13, 0.08, 0.2], d: [0, 0, 0.012] },
    ...chinRound(1.4),
    // runde, weiche Wangen: voller Apfel unter dem Auge (leicht gehoben wie beim Laecheln), weicher Wangenknochen,
    // darunter nur eine ganz leise Mulde
    { op: 'blob', c: [0.36, -0.25, 0.74], r: [0.13, 0.11, 0.1], d: [0.002, 0.012, 0.018] },
    { op: 'blob', c: [0.52, -0.09, 0.62], r: [0.13, 0.08, 0.16], d: [0.004, 0.008, 0.008] },
    { op: 'blob', c: [0.46, -0.52, 0.6], r: [0.15, 0.15, 0.2], d: [-0.002, 0, -0.003] },
    ...nose(1),
    { op: 'blob', c: [0, -0.3, 0.98], r: [0.09, 0.08, 0.08], d: [0, 0.012, -0.012] },
    // Augen: aeusserer Lidwinkel leicht hoeher (offener, freundlicher Blick), Unterlid eine Spur gehoben (laechelnde
    // Augen). Brauen weicher: der Brauenbogen tritt zurueck, die Mulde darunter wird gefuellt. So zeigt die Flaeche
    // zwischen Braue und Lid nach vorne statt nach unten in das dunkle Studio (das dunkle, muede Band)
    { op: 'blob', c: [0.43, -0.01, 0.55], r: [0.05, 0.045, 0.07], d: [0.004, 0.008, 0] },
    ...lowerLid(1),
    { op: 'blob', c: [0.3, -0.09, 0.69], r: [0.1, 0.03, 0.05], d: [0, 0.004, 0.002] },
    { op: 'blob', c: [0.27, 0.25, 0.92], r: [0.2, 0.06, 0.08], d: [0, 0.003, -0.012] },
    ...upperLid(2.2),
    ...lips(1.15, 1.1),
    // leises Laecheln: Mundwinkel hoch, etwas nach aussen und zurueck
    { op: 'blob', c: [0.205, -0.612, 0.775], r: [0.045, 0.032, 0.06], d: [0.005, 0.018, -0.006] },
    { op: 'blob', c: [0.15, -0.6, 0.83], r: [0.06, 0.03, 0.06], d: [0, 0.006, 0] },
    { op: 'smooth', c: [0.38, -0.4, 0.6], r: [0.42, 0.62, 0.5], it: 12, k: 0.7 },
  ],
};
// Gesicht E (10.11.2026): deutlich anderes Gesicht statt Feinschliff. Jung und freundlich: grosse Augen, kurzes
// Untergesicht, schmaler Kiefer, kleiner Mund mit Laecheln, kleine Nase. Baut auf D auf.
const eBase = (K) => [
  ...VARIANTS.d.filter((o) => o.op !== 'smooth'),
  // Augen groesser (Lidspalte um die Augenmitte skaliert), der Augapfel waechst weniger mit (FACE_STYLE.eye): so
  // bleibt neben der Iris Weiss sichtbar
  { op: 'eyes', s: 1 + 0.2 * K, r: 0.2 },
  // Untergesicht kuerzer (unter der Nase gestaucht): juengere Proportionen
  { op: 'squash', y0: -0.42, y1: -1.02, y2: -1.5, k: 0.1 * K },
  // Wangen und Kiefer schmaler, aber als Oval: das Kinn bleibt rund und kommt leicht nach vorne
  { op: 'band', y0: -0.05, y1: -0.45, y2: -0.95, y3: -1.25, k: 0.025 * K },
  { op: 'blob', c: [0, -0.9, 0.8], r: [0.2, 0.1, 0.2], d: [0, 0, 0.03 * K] },
  { op: 'blob', c: [0.2, -0.86, 0.66], r: [0.14, 0.12, 0.24], d: [0.03 * K, 0, 0.012 * K] },
  { op: 'blob', c: [0.42, -0.62, 0.5], r: [0.16, 0.16, 0.26], d: [0.02 * K, 0, 0] },
  // Mund etwas schmaler, Laecheln deutlicher (Mundwinkel hoch, Wange darueber voller)
  { op: 'pinch', c: [0, -0.56, 0.84], r: [0.26, 0.09, 0.14], k: 0.1 * K },
  { op: 'blob', c: [0.18, -0.56, 0.78], r: [0.05, 0.035, 0.06], d: [0.003, 0.02 * K, -0.005] },
  { op: 'blob', c: [0.3, -0.42, 0.74], r: [0.1, 0.08, 0.1], d: [0.004, 0.008 * K, 0.012 * K] },
  // Nase kuerzer und kleiner (nur die Spitze, der Ruecken bleibt)
  { op: 'blob', c: [0, -0.3, 0.98], r: [0.1, 0.09, 0.09], d: [0, 0.016 * K, -0.022 * K] },
  { op: 'blob', c: [0, -0.08, 0.86], r: [0.06, 0.14, 0.08], d: [0, 0, -0.008 * K] },
  // Brauen weicher: der Wulst tritt zurueck, die Flaeche unter der Braue zeigt nach vorne (kein strenger Blick)
  { op: 'blob', c: [0.28, 0.24, 0.9], r: [0.22, 0.07, 0.1], d: [0, 0.006 * K, -0.02 * K] },
  { op: 'blob', c: [0.3, 0.13, 0.8], r: [0.14, 0.05, 0.08], d: [0, 0.004 * K, 0.014 * K] },
  { op: 'ao', c: [0.3, 0.1, 0.78], r: [0.2, 0.1, 0.14], k: 0.5 * K },
  // Wangen voller (Apfel), Stirn runder
  { op: 'blob', c: [0.36, -0.22, 0.76], r: [0.14, 0.12, 0.11], d: [0.002, 0.008 * K, 0.016 * K] },
  { op: 'blob', c: [0, 0.55, 0.78], r: [0.4, 0.3, 0.2], d: [0, 0, 0.02 * K] },
  { op: 'smooth', c: [0.36, -0.4, 0.6], r: [0.46, 0.66, 0.52], it: 16, k: 0.8 },
];
VARIANTS.e = eBase(1);
VARIANTS.f = eBase(0.65);
/*
 * Vorlagen-Koordinaten (Gesicht r): die Vorderansicht der Vorlage von Jonas (10.11.2026). Einheit: Augenabstand der
 * Vorlage wie im Modell (526 Bildpunkte je Einheit), Ursprung auf der Augenlinie in der Gesichtsmitte, u nach aussen,
 * v nach oben. Die Abbildung ist die Zentralprojektion der Pruefkamera (Kamera bei z 9.65, y -0.345): so liegen
 * Modell und Vorlage im Vergleichsbild deckungsgleich. robot-layout.js rechnet Fugen und Bemalung in denselben
 * Koordinaten (lRef).
 */
export const REF_CAM = { z: 9.65, y: -0.345, k: 9.0494, v0: -0.3317 };
// Landmarken in Bildpunkten der Vorlage (1345 x 1169, Mittelachse x 672, Augenlinie y 413.5): [Abstand zur
// Mittelachse, Hoehe] des Modells -> der Vorlage. Gemessen an Rasterbildern von Vorlage und Rendering.
const px = (a) => [a[0] / 526, (410 - a[1]) / 526, a[2] / 526, (410 - a[3]) / 526];
const R_WARP = [
  // Stirn und Scheitel: fest
  [0, 20, 0, 20], [150, 60, 150, 60], [0, 160, 0, 160], [120, 200, 120, 200], [0, 300, 0, 300], [160, 290, 160, 290],
  // Umriss (Grundform in neutraler Haltung gemessen, beide Seiten gemittelt): Schlaefe schmaler
  [290, 40, 285, 40], [325, 100, 318, 100], [344, 150, 328, 150], [355, 200, 336, 200], [359, 250, 338, 250],
  [359, 300, 334, 300], [354, 350, 318, 350], [344, 400, 314, 400], [335, 450, 315, 450], [321, 500, 320, 500],
  // Kiefer: in der Mitte breiter, klare Kieferecke, dann gerade und steil zum schmalen Kinn
  [312, 540, 315, 540], [304, 575, 308, 575], [292, 610, 302, 610], [277, 650, 295, 650], [262, 690, 285, 690],
  [252, 720, 277, 720], [242, 750, 262, 750], [234, 775, 240, 778], [215, 814, 193, 815], [195, 853, 138, 849],
  [173, 893, 104, 885], [94, 924, 60, 897], [0, 932, 0, 896], [0, 860, 0, 838],
  // Augen: weiter auseinander (Augenmitte der Grundform liegt bei 147)
  [147, 412, 160, 413.5],
  // Nase: laenger, Fluegel breiter
  [0, 413, 0, 413], [40, 470, 40, 470], [57, 603, 73, 601], [0, 560, 0, 585], [0, 608, 0, 628],
  // Mund: hoeher, etwas breiter
  [104, 735, 111, 730], [0, 735, 0, 723], [0, 703, 0, 691], [0, 790, 0, 773], [55, 735, 57, 725],
].map(px);
const R_EYE = [
  // Lidoeffnung auf die Mandelform der Vorlage (knapp innerhalb des Lidstrichs): Winkel, Oberlid, Unterlid
  [105, 433, 86, 440], [225, 414.5, 243, 415.5], [165, 385.5, 165, 379], [159, 442, 160, 448],
  [128, 399.5, 125, 389], [204, 396.5, 205, 385], [122, 439, 120, 449], [201, 433, 200, 438],
  // Umgebung fest: Braue, Nasenwurzel, Wange, Schlaefe, Augenmitte
  [160, 335, 160, 335], [90, 350, 90, 350], [240, 350, 240, 350], [35, 430, 35, 430], [60, 490, 60, 490],
  [160, 505, 160, 505], [260, 480, 260, 480], [290, 410, 290, 410], [160, 413.5, 160, 413.5],
  // Nasenloecher enger zusammen, Fluegel und Spitze fest
  [48, 612.6, 38, 613], [74, 606, 73, 602], [0, 585, 0, 585], [0, 628, 0, 628], [100, 600, 100, 600],
  [48, 560, 48, 560], [45, 652, 45, 652],
].map(px);
// dritte Stufe, ganz am Schluss (nach dem Glaetten): Lidrand auf die Vorlage. Gemessen am fertigen Netz ohne Bemalung
// (?gesicht=rn, doppelte Groesse). Oberlid bis unter den Lidstrich (die Iris wird wie in der Vorlage oben angeschnitten),
// Unterlid tiefer und zur Nase hin weiter offen.
const R_LID = [
  [182, 372, 182, 381], [160, 371, 160, 381], [142, 372, 142, 383], [122, 375, 122, 387], [202, 381, 202, 384],
  [102, 383, 102, 392], [222, 394, 222, 394], [232, 402, 232, 402],
  [160, 440, 160, 450.5], [172, 438, 172, 451], [192, 434, 192, 450], [212, 428, 212, 445.5], [232, 420, 232, 436],
  [132, 438, 132, 449], [112, 436, 112, 446.5], [92, 432, 92, 446.5], [75, 427, 75, 443], [240, 413, 250, 414],
  // Umgebung fest: Braue, Nasenwurzel, Wange, Schlaefe
  [160, 335, 160, 335], [90, 350, 90, 350], [240, 350, 240, 350], [35, 430, 35, 430], [60, 540, 60, 540],
  [160, 545, 160, 545], [262, 530, 262, 530], [290, 410, 290, 410],
].map(px);
// Lippen (nach der Haltung, also in den Koordinaten der Vorlage): Oberlippenrand y -0.543, Mundlinie -0.600,
// Unterlippenrand -0.692, Mundwinkel x 0.206. Im Profil rund: der vorderste Punkt der Oberlippe liegt am Lippenrand,
// von dort laeuft das Lippenrot zurueck zur Mundlinie; die Unterlippe woelbt sich darunter vor.
const LIPS = [
  // Mund 4 Bildpunkte hoeher (Mundlinie der Vorlage bei y 723)
  { op: 'blob', c: [0, -0.605, 0.87], r: [0.24, 0.045, 0.14], d: [0, 0.007, 0] },
  // Unterlippe voll nach vorne (sie lag 0.04 hinter der Oberlippe: im Profil ein Ueberbiss), Rinne darunter flacher,
  // Kinn eine Spur vor
  { op: 'blob', c: [0, -0.636, 0.88], r: [0.13, 0.03, 0.1], d: [0, 0, 0.03] },
  { op: 'blob', c: [0, -0.704, 0.82], r: [0.12, 0.03, 0.1], d: [0, 0, 0.02] },
  { op: 'blob', c: [0, -0.82, 0.86], r: [0.14, 0.07, 0.15], d: [0, 0, 0.012] },
  // Lippenbogen: zwei Spitzen am Lippenrand, dazwischen leicht zurueck
  { op: 'blob', c: [0.058, -0.537, 0.915], r: [0.034, 0.012, 0.06], d: [0, 0.003, 0.008] },
  { op: 'blob', c: [0, -0.548, 0.915], r: [0.018, 0.012, 0.06], d: [0, -0.003, -0.006] },
];
const SMILE = new Set(['0.205,-0.612,0.775', '0.15,-0.6,0.83']);
VARIANTS.r = [
  // Grundform wie D (schlank, runde Wangen, feine Nase, geschlossene Lippen), aber ohne Laecheln
  ...VARIANTS.d.filter((o) => o.op !== 'smooth' && !(o.op === 'blob' && SMILE.has(o.c.join(',')))),
  { op: 'eyes', s: 1.2, r: 0.2 },
  { op: 'warp', sigma: 0.13, pts: R_WARP },
  // zweite Stufe, fein: Lidoeffnung auf die Mandelform der Vorlage (gemessen nach der ersten Stufe)
  { op: 'warp', sigma: 0.05, pts: R_EYE },
  // Kinn nach vorne (der Verzug arbeitet nur in der Vorderansicht, im Profil wich das Kinn zurueck)
  { op: 'blob', c: [0, -0.84, 0.76], r: [0.2, 0.1, 0.22], d: [0, 0, 0.045] },
  // Falten neben dem Mund glaetten (die Grundform hat dort eine Kante von der Nase zum Mundwinkel)
  { op: 'smooth', c: [0.2, -0.56, 0.75], r: [0.2, 0.2, 0.25], it: 14, k: 0.85 },
  { op: 'blob', c: [0.215, -0.612, 0.78], r: [0.04, 0.04, 0.07], d: [0, -0.004, -0.01] },
  { op: 'smooth', c: [0.36, -0.4, 0.6], r: [0.46, 0.66, 0.52], it: 10, k: 0.6 },
  // Flaeche unter dem Auge und neben der Nase ruhig (kein Traenensack, keine Wellen im Glanz)
  { op: 'smooth', c: [0.3, -0.2, 0.7], r: [0.24, 0.09, 0.25], it: 10, k: 0.8 },
  { op: 'smooth', c: [0.13, -0.15, 0.8], r: [0.09, 0.13, 0.15], it: 8, k: 0.7 },
  // Flaeche zwischen Nase und Oberlippe ruhig (die Verzuege und die Lippenform hinterlassen dort Wellen im Glanz)
  { op: 'smooth', c: [0, -0.49, 0.85], r: [0.17, 0.045, 0.2], it: 12, k: 0.8 },
  { op: 'warp', sigma: 0.04, pts: R_LID },
  // Alle Verzuege oben sind an Aufnahmen gemessen, in denen der Kopf durch das Eigenleben leicht geneigt war
  // (robot.js, Zeit 0: Nicken 0.0144, Drehen -0.0040, Neigen 0.0002 um den Drehpunkt). Diese Haltung wird hier in
  // die Ruhelage uebernommen: so ist die Ruhelage selbst deckungsgleich mit der Vorlage, und die Bemalung
  // (robot-layout.js rechnet in der Ruhelage) sitzt genau auf der Form. Pruefen mit ?ab=still (Kopf in Ruhelage).
  { op: 'pose', e: [0.014441887659919658, -0.0040322856931844, 0.00024193714159105934] },
  ...LIPS,
];

VARIANTS.rb = VARIANTS.r.filter((o) => o.op !== 'warp');
VARIANTS.rm = VARIANTS.r.filter((o) => !(o.op === 'warp' && o.pts === R_EYE));
VARIANTS.rn = VARIANTS.r;

/** Form der Variante auf das Kontrollnetz (nach Gesichtsausdruck und softenFace). Ohne Variante: unveraendert. */
export function sculptFace(mesh, v) {
  const ops = VARIANTS[v];
  if (!ops || !mesh.head || !mesh.quads) return mesh;
  const { pos, nV, head, lm } = mesh;
  // Landmarken, die mitwandern (Augenmitte, Mundlinie)
  const marks = [];
  if (lm) {
    if (lm.eyeL) marks.push(lm.eyeL);
    if (lm.eyeR) marks.push(lm.eyeR);
    if (lm.mouthLoop) for (const p of lm.mouthLoop) marks.push(p);
    if (lm.ears) for (const e of lm.ears) marks.push(e.c);
  }
  const each = (fn) => {
    const o = [0, 0, 0];
    for (let i = 0; i < nV; i++) {
      const h = head[i];
      if (h < 0.02) continue;
      o[0] = pos[i * 3]; o[1] = pos[i * 3 + 1]; o[2] = pos[i * 3 + 2];
      if (!fn(o)) continue;
      pos[i * 3] += (o[0] - pos[i * 3]) * h; pos[i * 3 + 1] += (o[1] - pos[i * 3 + 1]) * h; pos[i * 3 + 2] += (o[2] - pos[i * 3 + 2]) * h;
    }
    for (const p of marks) fn(p);
  };
  const gw = (p, c, r) => {
    const dx = (Math.abs(p[0]) - c[0]) / r[0]; const dy = (p[1] - c[1]) / r[1]; const dz = (p[2] - c[2]) / r[2];
    const d2 = dx * dx + dy * dy + dz * dz;
    return d2 > 9 ? 0 : Math.exp(-d2);
  };
  for (const o of ops) {
    if (o.op === 'blob') {
      each((p) => {
        const w = gw(p, o.c, o.r);
        if (!w) return false;
        p[0] += (Math.sign(p[0]) || 1) * o.d[0] * w; p[1] += o.d[1] * w; p[2] += o.d[2] * w;
        return true;
      });
    } else if (o.op === 'pinch') {
      each((p) => {
        const w = gw(p, o.c, o.r);
        if (!w) return false;
        p[0] *= 1 - o.k * w;
        return true;
      });
    } else if (o.op === 'head' || o.op === 'band') {
      each((p) => {
        const t = ss(o.y0, o.y1, p[1]) * (o.op === 'band' ? 1 - ss(o.y2, o.y3, p[1]) : 1);
        if (!t) return false;
        p[0] *= 1 - o.k * t;
        return true;
      });
    } else if (o.op === 'jaw') {
      each((p) => {
        if (p[2] < -0.3) return false;
        // zf: vorne weniger (zk: Anteil vorne), die Vorderseite der Wange bleibt eher, wie sie zum Licht steht
        const zf = o.zf ? (o.zk || 0) + (1 - (o.zk || 0)) * ss(o.zf[0], o.zf[1], p[2]) : 1;
        const t = ss(o.y0, o.y1, p[1]) * ss(o.x0, o.x1, Math.abs(p[0])) * (1 - 0.5 * ss(-0.05, -0.3, p[2])) * zf;
        if (!t) return false;
        p[0] *= 1 - o.k * t;
        return true;
      });
    } else if (o.op === 'eyes') {
      const E = lm && lm.eyeL ? [[lm.eyeL[0], lm.eyeL[1], lm.eyeL[2]], [lm.eyeR[0], lm.eyeR[1], lm.eyeR[2]]] : [];
      each((p) => {
        let hit = false;
        for (const e of E) {
          const dx = p[0] - e[0]; const dy = p[1] - e[1]; const dz = p[2] - e[2];
          const d2 = (dx * dx + dy * dy + dz * dz * 0.5) / (o.r * o.r);
          if (d2 > 6) continue;
          const w = Math.exp(-d2) * (o.s - 1);
          // zur Nase hin nicht in x schieben (sonst wird der Nasenruecken eingeschnuert)
          p[0] += dx * w * ss(0.1, 0.24, Math.abs(p[0])); p[1] += dy * w * 1.1;
          hit = true;
        }
        return hit;
      });
    } else if (o.op === 'squash') {
      each((p) => {
        if (p[1] > o.y0 || p[1] < o.y2) return false;
        const zf = ss(-0.95, -0.1, p[2]);
        const dy = p[1] > o.y1 ? o.k * (o.y0 - p[1]) : o.k * (o.y0 - o.y1) * (1 - ss(o.y1, o.y2, p[1]));
        p[1] += dy * zf;
        return true;
      });
    } else if (o.op === 'pose') {
      // Drehung um den Kopf-Drehpunkt, Reihenfolge YXZ wie robot.js (Euler)
      const a = Math.cos(o.e[0]); const b = Math.sin(o.e[0]); const c = Math.cos(o.e[1]); const d = Math.sin(o.e[1]);
      const e = Math.cos(o.e[2]); const f = Math.sin(o.e[2]);
      const R = [c * e + d * f * b, d * e * b - c * f, a * d, a * f, a * e, -b, c * f * b - d * e, d * f + c * e * b, a * c];
      const pv = (lm && lm.headPivot) || [0, -0.3, -0.09];
      each((p) => {
        const x = p[0] - pv[0]; const y = p[1] - pv[1]; const z = p[2] - pv[2];
        p[0] = pv[0] + R[0] * x + R[1] * y + R[2] * z;
        p[1] = pv[1] + R[3] * x + R[4] * y + R[5] * z;
        p[2] = pv[2] + R[6] * x + R[7] * y + R[8] * z;
        return true;
      });
    } else if (o.op === 'warp') {
      warpRef(o, each);
    } else if (o.op === 'ao') {
      // offline gerechnete Verdeckung (aAO) aufhellen, wo die Variante eine Mulde fuellt (sonst bleibt sie dunkel)
      const ao = mesh.ao;
      if (!ao) continue;
      const p = [0, 0, 0];
      for (let i = 0; i < nV; i++) {
        p[0] = pos[i * 3]; p[1] = pos[i * 3 + 1]; p[2] = pos[i * 3 + 2];
        const w = gw(p, o.c, o.r);
        if (w) ao[i] += (1 - ao[i]) * Math.min(1, o.k * w);
      }
    } else if (o.op === 'mouth') closeMouth(mesh, o.gap, marks);
    else if (o.op === 'seal') sealLips(mesh, o, marks);
    else if (o.op === 'smooth') smoothRegion(mesh, o);
  }
  return mesh;
}

/* Verzug in Vorlagen-Koordinaten: radiale Basisfunktionen (Gauss, Breite sigma) durch alle Landmarken und ihre
   Spiegelbilder. Jede Ecke wird in die Vorderansicht der Pruefkamera projiziert, dort verschoben und bei gleicher
   Tiefe zurueckgerechnet. Nach hinten laeuft der Verzug aus (Hinterkopf bleibt). */
function warpRef(o, each) {
  const P = [];
  for (const [su, sv, tu, tv] of o.pts) {
    P.push([su, sv, tu - su, tv - sv]);
    if (su > 1e-4) P.push([-su, sv, -(tu - su), tv - sv]);
  }
  const n = P.length;
  if (!n) return;
  const s2 = o.sigma * o.sigma;
  const phi = (ax, ay, bx, by) => Math.exp(-((ax - bx) * (ax - bx) + (ay - by) * (ay - by)) / (2 * s2));
  // (K + lambda I) c = d, Gauss-Elimination mit Pivot, zwei rechte Seiten
  const A = [];
  for (let i = 0; i < n; i++) {
    const row = new Float64Array(n + 2);
    for (let j = 0; j < n; j++) row[j] = phi(P[i][0], P[i][1], P[j][0], P[j][1]) + (i === j ? 2e-3 : 0);
    row[n] = P[i][2]; row[n + 1] = P[i][3];
    A.push(row);
  }
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    const d = A[c][c];
    if (Math.abs(d) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / d;
      if (!f) continue;
      for (let k = c; k < n + 2; k++) A[r][k] -= f * A[c][k];
    }
  }
  const cu = new Float64Array(n); const cv = new Float64Array(n);
  for (let i = 0; i < n; i++) { cu[i] = A[i][n] / A[i][i]; cv[i] = A[i][n + 1] / A[i][i]; }
  const C = REF_CAM;
  each((p) => {
    const zf = ss(-0.45, 0.0, p[2]);
    if (!zf) return false;
    const d = C.z - p[2];
    const u = p[0] * C.k / d; const v = C.v0 + C.k * (p[1] - C.y) / d;
    let du = 0; let dv = 0;
    for (let i = 0; i < n; i++) {
      const w = phi(u, v, P[i][0], P[i][1]);
      if (w < 1e-5) continue;
      du += cu[i] * w; dv += cv[i] * w;
    }
    p[0] += du * zf * d / C.k; p[1] += dv * zf * d / C.k;
    return true;
  });
}

/* Lippen schliessen. Die Mundoeffnung ist ein Randring (Kanten mit nur einem Viereck). Er wird an den Mundwinkeln in
   Ober- und Unterlippe geteilt; jede Ecke wandert zur Mittellinie der beiden Lippen bei gleichem x (bis auf gap/2),
   die Nachbarn bis etwa 0.035 dahinter und davor weich mit. */
function closeMouth(mesh, gap, marks) {
  const { pos, quads, nV } = mesh;
  const cnt = new Map();
  for (let f = 0; f < quads.length; f += 4) {
    // nur Vierecke am Mund (spart die Kantenzaehlung ueber das ganze Netz)
    const v0 = quads[f];
    if (Math.abs(pos[v0 * 3]) > 0.32 || Math.abs(pos[v0 * 3 + 1] + 0.615) > 0.1 || pos[v0 * 3 + 2] < 0.5) continue;
    for (let e = 0; e < 4; e++) {
      const a = quads[f + e]; const b = quads[f + ((e + 1) & 3)];
      const k = a < b ? a * 1048576 + b : b * 1048576 + a;
      cnt.set(k, (cnt.get(k) || 0) + 1);
    }
  }
  const ring = [];
  const seen = new Set();
  for (const [k, c] of cnt) {
    if (c !== 1) continue;
    for (const i of [Math.floor(k / 1048576), k % 1048576]) {
      if (seen.has(i)) continue;
      const x = pos[i * 3]; const y = pos[i * 3 + 1]; const z = pos[i * 3 + 2];
      if (Math.abs(x) < 0.26 && Math.abs(y + 0.615) < 0.05 && z > 0.6) { seen.add(i); ring.push(i); }
    }
  }
  if (ring.length < 8) return;
  // Mittellinie: pro Ecke die Mundlinie bei diesem x (Mittel aus Ober- und Unterlippe, ueber die naechsten Ecken)
  const pts = ring.map((i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], i]);
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const upper = pts.filter((p) => p[1] >= cy); const lower = pts.filter((p) => p[1] < cy);
  const lerpAt = (arr, x) => {
    // naechste zwei Ecken links und rechts von x
    let a = null; let b = null;
    for (const p of arr) {
      if (p[0] <= x && (!a || p[0] > a[0])) a = p;
      if (p[0] >= x && (!b || p[0] < b[0])) b = p;
    }
    if (!a) return b; if (!b) return a;
    const t = b[0] - a[0] > 1e-6 ? (x - a[0]) / (b[0] - a[0]) : 0.5;
    return [x, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  };
  const disp = []; // [x, y, z, dy, dz]
  for (const p of pts) {
    const isUp = p[1] >= cy;
    const o = lerpAt(isUp ? lower : upper, p[0]);
    if (!o) continue;
    const my = (p[1] + o[1]) / 2; const mz = (p[2] + o[2]) / 2;
    const ty = my + (isUp ? 0.5 : -0.5) * gap;
    disp.push([p[0], p[1], p[2], ty - p[1], mz - p[2]]);
  }
  // Feld: gewichtetes Mittel der Verschiebungen der naechsten Randecken, Abfall mit dem Abstand zum Rand
  const R = 0.035;
  const field = (x, y, z, out) => {
    let ws = 0; let dy = 0; let dz = 0; let dmin = 9;
    for (const d of disp) {
      const ex = x - d[0]; const ey = y - d[1]; const ez = z - d[2];
      const d2 = ex * ex + ey * ey + ez * ez;
      if (d2 < dmin) dmin = d2;
      const w = 1 / (d2 + 1e-6);
      ws += w; dy += d[3] * w; dz += d[4] * w;
    }
    const f = Math.exp(-dmin / (R * R));
    out[0] = (dy / ws) * f; out[1] = (dz / ws) * f;
    return f > 1e-3;
  };
  const o = [0, 0];
  for (let i = 0; i < nV; i++) {
    const x = pos[i * 3]; const y = pos[i * 3 + 1]; const z = pos[i * 3 + 2];
    if (Math.abs(x) > 0.3 || Math.abs(y + 0.615) > 0.12 || z < 0.55) continue;
    if (!field(x, y, z, o)) continue;
    pos[i * 3 + 1] += o[0]; pos[i * 3 + 2] += o[1];
  }
  for (const p of marks) {
    if (Math.abs(p[0]) > 0.3 || Math.abs(p[1] + 0.615) > 0.12 || p[2] < 0.55) continue;
    if (field(p[0], p[1], p[2], o)) { p[1] += o[0]; p[2] += o[1]; }
  }
}

/* Lippen aufeinander: Ober- und Unterlippe werden zur Mundlinie hin in der Hoehe gestaucht (Abbildung
   t -> t - a t (1 - t)^2 auf t = Abstand / H). Die Lippen beruehren sich so weiter vorne, aus der V-Rinne zwischen
   Unterseite der Oberlippe und Oberseite der Unterlippe wird ein feiner Spalt. Zu den Mundwinkeln hin weniger. */
function sealLips(mesh, o, marks) {
  const { pos, nV, lm } = mesh;
  const ml = lm && lm.mouthLoop;
  if (!ml || !ml.length) return;
  const xc = ml.reduce((m, p) => Math.max(m, Math.abs(p[0])), 0);
  // Mundlinie y(x): Mittel der Landmarken in der Naehe von |x|
  const ym = (ax) => {
    let s = 0; let w = 0;
    for (const p of ml) { const k = Math.exp(-(((Math.abs(p[0]) - ax) / 0.03) ** 2)); s += p[1] * k; w += k; }
    return w > 1e-6 ? s / w : -0.615;
  };
  const map = (dy, H, a) => {
    const t = Math.min(1, Math.abs(dy) / H);
    return Math.sign(dy) * H * (t - a * t * (1 - t) * (1 - t));
  };
  const f = (p) => {
    const ax = Math.abs(p[0]);
    if (ax > xc + 0.02 || p[2] < 0.6) return;
    const kx = 1 - ss(xc * 0.55, xc * 1.02, ax);
    if (!kx) return;
    const y0 = ym(ax); const dy = p[1] - y0;
    if (dy > o.up || dy < -o.dn) return;
    const ny = dy > 0 ? map(dy, o.up, o.au * kx) : map(dy, o.dn, o.ad * kx);
    p[1] = y0 + ny;
  };
  const p = [0, 0, 0];
  for (let i = 0; i < nV; i++) {
    p[0] = pos[i * 3]; p[1] = pos[i * 3 + 1]; p[2] = pos[i * 3 + 2];
    f(p);
    pos[i * 3 + 1] = p[1];
  }
  for (const q of marks) if (q !== lm.eyeL && q !== lm.eyeR) f(q);
}

/* Taubin-Glaettung in einem Ellipsoid (beide Seiten), Augen, Nase und Lippen bleiben (wie softenFace) */
function smoothRegion(mesh, o) {
  const { pos, nV, quads, head, lm } = mesh;
  const eyes = lm && lm.eyeL ? [lm.eyeL, lm.eyeR] : [[0.304, 0, 0.597], [-0.304, 0, 0.597]];
  const w = new Float32Array(nV);
  for (let i = 0; i < nV; i++) {
    if (head[i] < 0.5) continue;
    const x = pos[i * 3]; const y = pos[i * 3 + 1]; const z = pos[i * 3 + 2];
    const ax = Math.abs(x);
    const dx = (ax - o.c[0]) / o.r[0]; const dy = (y - o.c[1]) / o.r[1]; const dz = (z - o.c[2]) / o.r[2];
    let k = 1 - ss(0.6, 1, Math.sqrt(dx * dx + dy * dy + dz * dz));
    if (!k) continue;
    for (const e of eyes) k *= ss(0.17, 0.25, Math.hypot(x - e[0], (y - e[1]) * 1.25, (z - e[2]) * 0.8));
    k *= 1 - (1 - ss(0.12, 0.18, ax)) * ss(-0.56, -0.48, y) * ss(0.45, 0.6, z);
    k *= 1 - (1 - ss(0.2, 0.26, ax)) * ss(-0.78, -0.72, y) * (1 - ss(-0.52, -0.46, y)) * ss(0.55, 0.66, z);
    k *= 1 - ss(0.6, 0.68, ax) * ss(-0.35, -0.12, -z);
    w[i] = k * o.k;
  }
  const nb = new Map();
  const add = (a, b) => {
    if (!w[a]) return;
    let s = nb.get(a);
    if (!s) { s = new Set(); nb.set(a, s); }
    s.add(b);
  };
  for (let f = 0; f < quads.length; f += 4) {
    for (let e = 0; e < 4; e++) {
      const a = quads[f + e]; const b = quads[f + ((e + 1) & 3)];
      add(a, b); add(b, a);
    }
  }
  const ids = Array.from(nb.keys());
  const lists = ids.map((i) => Array.from(nb.get(i)));
  const tmp = new Float32Array(ids.length * 3);
  const pass = (f) => {
    for (let j = 0; j < ids.length; j++) {
      const i = ids[j]; const L = lists[j];
      let sx = 0; let sy = 0; let sz = 0;
      for (const n of L) { sx += pos[n * 3]; sy += pos[n * 3 + 1]; sz += pos[n * 3 + 2]; }
      const inv = 1 / L.length; const k = f * w[i];
      tmp[j * 3] = pos[i * 3] + (sx * inv - pos[i * 3]) * k;
      tmp[j * 3 + 1] = pos[i * 3 + 1] + (sy * inv - pos[i * 3 + 1]) * k;
      tmp[j * 3 + 2] = pos[i * 3 + 2] + (sz * inv - pos[i * 3 + 2]) * k;
    }
    for (let j = 0; j < ids.length; j++) {
      const i = ids[j];
      pos[i * 3] = tmp[j * 3]; pos[i * 3 + 1] = tmp[j * 3 + 1]; pos[i * 3 + 2] = tmp[j * 3 + 2];
    }
  };
  for (let it = 0; it < o.it; it++) { pass(0.5); pass(-0.53); }
}
