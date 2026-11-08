// Szene "robot": Gesicht und Figur der Android-Bueste.
// Standard ist Gesicht D (08.11.2026): Rueckmeldung Jonas zu den Varianten A bis C vom 07.11.: "das Gebiss immer noch
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

/** Gesicht aus der Adresse der Seite: 'alt' (Version 4) oder 'd' (Standard). Im Web Worker steht dort die Adresse des
    Workers: robot-mesh.js gibt das Gesicht darum mit. */
export function readFaceVariant() {
  try {
    const s = globalThis.location && globalThis.location.search ? globalThis.location.search : '';
    return (new URLSearchParams(s).get('gesicht') || '').toLowerCase() === 'alt' ? 'alt' : 'd';
  } catch (e) {
    return 'd';
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
};
export function faceStyle(v) { return STYLES[v] || STYLES.d; }
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
