// Szene "robot": Gesichts-Varianten der Android-Bueste (07.11.2026, Rueckmeldung Jonas: das Gesicht hat "noch klar
// Luft nach oben"). Zur Auswahl ueber die Adresse: ?gesicht=a|b|c. Ohne Parameter bleibt das Gesicht von Version 4.
//
//   a  Feinschliff   das bisherige Gesicht, nur korrigiert: Kiefer und Kinn etwas schmaler, Lippen geschlossen und
//                    geformt, ruhigerer Blick, weniger Traenensack, Wangenfuge ohne Spitze am Kiefer
//   b  Elegant       weicher, feiner Android (klassisch, eher weiblich): ovales Gesicht, hohe, runde Wangen, schmales
//                    rundes Kinn, kuerzere feine Nase, volle Lippen, ruhiger Blick; eine einzige Gesichtsplatte
//   c  Skulptur      neutral, wie eine Statue oder ein Produkt modelliert: ruhige, glatte Wangen, gerade Linie von
//                    der Stirn zur Nase, klares Kinn, schmale ruhige Lippen, ruhigster Blick; Stirnplatte und
//                    Gesichtsplatte als zwei saubere Formteile
//
// Wirkt wie softenFace (robot-mesh.js) auf das Kontrollnetz vor der Glaettung: Schale, Partikel-Bueste und Kopfform
// (robot-geometry.js) haben dasselbe Gesicht. Die Landmarken (Augen, Mundlinie) wandern mit, damit Augaepfel und der
// dunkle Abschluss hinter dem Mund (robot-mech.js) passen. Fugen (robot-layout.js) und Augen (robot-mech.js) lesen
// FACE_STYLE. Eine Variante pro Seitenaufruf: gleiche Zahl Programme, Draws und Dreiecke wie vorher.

/** Variante aus der Adresse der Seite. Im Web Worker steht dort die Adresse des Workers: robot-mesh.js gibt sie mit. */
export function readFaceVariant() {
  try {
    const s = globalThis.location && globalThis.location.search ? globalThis.location.search : '';
    const v = (new URLSearchParams(s).get('gesicht') || '').toLowerCase();
    return v === 'a' || v === 'b' || v === 'c' ? v : '';
  } catch (e) {
    return '';
  }
}
export const FACE_VARIANT = readFaceVariant();

/*
 * Stil pro Variante (ausser der Form):
 *   lid      Faktor auf das Anheben des Oberlids (applyExpression): kleiner = ruhiger Blick, Lid deckt den Irisrand
 *   seams    Fugen im Gesicht (robot-layout.js): v4 wie bisher, clean (wie v4 ohne Haken), mask (eine Platte),
 *            visor (Stirnplatte und Gesichtsplatte)
 *   lidSeam  Tiefe der Lidfalte (v4 0.45; kleiner: keine "Brille" um die Augen)
 *   sclera   Helligkeit des Augapfels (v4 0.42 x Weiss)
 */
const STYLES = {
  '': { lid: 1, seams: 'v4', lidSeam: 0.45, sclera: 0.42 },
  a: { lid: 0.85, seams: 'clean', lidSeam: 0.32, sclera: 0.46 },
  b: { lid: 0.74, seams: 'mask', lidSeam: 0.2, sclera: 0.52 },
  c: { lid: 0.7, seams: 'visor', lidSeam: 0.28, sclera: 0.46 },
};
export function faceStyle(v) { return STYLES[v] || STYLES['']; }
export const FACE_STYLE = faceStyle(FACE_VARIANT);

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/*
 * Bausteine (symmetrisch, c[0] >= 0 gilt fuer beide Seiten):
 *   blob   Verschiebung d mit Gauss-Abfall um c (Halbachsen r); d[0] zeigt nach aussen
 *   pinch  zur Mitte hin schmaler (x * (1 - k w))
 *   jaw    Unterkiefer zum Kinn hin schmaler: Rampe in y (y0 -> y1) und |x| (x0 -> x1), k am Kieferwinkel, zf: Rampe in
 *          z (voll hinten, 0 vorne)
 *   smooth Taubin-Glaettung (ohne Schrumpfen) im Gewicht eines Ellipsoids, Augen, Nase, Lippen ausgenommen
 *   mouth  Lippen schliessen: Ober- und Unterlippe der Mundoeffnung treffen sich bis auf einen feinen Spalt
 *   seal   Lippen zur Mundlinie hin stauchen (aus der tiefen V-Rinne zwischen den Lippen wird ein feiner Spalt)
 *   ao     offline gerechnete Verdeckung aufhellen, wo eine Mulde gefuellt wird
 */
// Gemeinsame Bausteine: Lippen (Oberlippe als runde Lippe statt Kante, Amorbogen, Philtrum, Unterlippe in der Mitte
// voller), Unterlid (weniger Traenensack), mit Staerke k
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
const lowerLid = (k) => [{ op: 'blob', c: [0.3, -0.125, 0.665], r: [0.1, 0.04, 0.06], d: [0, 0.003 * k, -0.009 * k] }];
// Mulde unter der Braue flacher (weniger dunkle, muede Augenhoehle)
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
  // a: so nah wie moeglich am bisherigen Gesicht, nur die Fehler behoben
  a: [
    { op: 'jaw', y0: -0.3, y1: -0.95, x0: 0.14, x1: 0.52, k: 0.05, zf: [0.66, 0.36] },
    { op: 'pinch', c: [0, -0.9, 0.72], r: [0.34, 0.15, 0.32], k: 0.07 },
    { op: 'blob', c: [0, -0.87, 0.82], r: [0.15, 0.09, 0.2], d: [0, -0.003, 0.014] },
    ...chinRound(0.6),
    // weicher Wangenknochen (keine Mulde darunter: die wirkte als grauer Fleck auf der Wange)
    { op: 'blob', c: [0.5, -0.12, 0.64], r: [0.12, 0.08, 0.16], d: [0.005, 0.004, 0.008] },
    ...lowerLid(0.7),
    ...upperLid(0.8),
    ...lips(0.8),
    { op: 'smooth', c: [0.38, -0.4, 0.6], r: [0.4, 0.6, 0.5], it: 8, k: 0.6 },
  ],
  // b: ovales, feines Gesicht: unteres Gesicht insgesamt schmaler (nicht nur das Kinn, sonst wird es spitz), hohe
  // Wangenknochen, weiche Braue, feine Nase, mandelfoermige Augen, volle Lippen
  b: [
    { op: 'jaw', y0: -0.05, y1: -0.75, x0: 0.1, x1: 0.56, k: 0.058, zf: [0.66, 0.36] },
    { op: 'jaw', y0: -0.45, y1: -0.98, x0: 0.12, x1: 0.5, k: 0.035, zf: [0.66, 0.36] },
    { op: 'pinch', c: [0, -0.93, 0.72], r: [0.28, 0.14, 0.34], k: 0.05 },
    { op: 'blob', c: [0, -0.87, 0.82], r: [0.14, 0.08, 0.2], d: [0, 0.002, 0.012] },
    ...chinRound(1.3),
    { op: 'blob', c: [0.52, -0.08, 0.63], r: [0.13, 0.08, 0.16], d: [0.006, 0.01, 0.01] },
    // runde, hohe Wangen unter den Augen (jugendlich, faengt das Licht)
    { op: 'blob', c: [0.37, -0.22, 0.74], r: [0.11, 0.09, 0.09], d: [0.002, 0.004, 0.012] },
    ...nose(1),
    // Nase kuerzer: Spitze hoeher und etwas zurueck
    { op: 'blob', c: [0, -0.3, 0.98], r: [0.09, 0.08, 0.08], d: [0, 0.012, -0.012] },
    { op: 'blob', c: [0.43, -0.01, 0.55], r: [0.05, 0.045, 0.07], d: [0.006, 0.008, 0] },
    ...lowerLid(1),
    ...upperLid(1.5),
    ...lips(1.2, 1.2),
    { op: 'smooth', c: [0.38, -0.4, 0.6], r: [0.4, 0.6, 0.5], it: 10, k: 0.7 },
  ],
  // c: neutral wie eine Skulptur: ruhige, fast ebene Wangen, klares Kinn nach vorne, gerade Nase, schmale ruhige
  // Lippen, ruhiger Blick
  c: [
    { op: 'jaw', y0: -0.3, y1: -0.95, x0: 0.14, x1: 0.52, k: 0.065, zf: [0.66, 0.36] },
    { op: 'pinch', c: [0, -0.9, 0.72], r: [0.34, 0.15, 0.32], k: 0.05 },
    { op: 'blob', c: [0, -0.89, 0.82], r: [0.17, 0.08, 0.2], d: [0, -0.008, 0.03] },
    ...chinRound(0.4),
    { op: 'blob', c: [0.53, -0.15, 0.62], r: [0.13, 0.09, 0.16], d: [0.008, 0.004, 0.012] },
    // gerade Linie von der Stirn zur Nase wie bei einer Statue (Nasenwurzel gefuellt)
    { op: 'blob', c: [0, 0.04, 0.87], r: [0.07, 0.07, 0.07], d: [0, 0, 0.016] },
    { op: 'blob', c: [0, -0.12, 0.91], r: [0.05, 0.12, 0.08], d: [0, 0, 0.006] },
    ...nose(0.5),
    ...lowerLid(1),
    ...upperLid(1.1),
    ...lips(0.8, 0.3),
    { op: 'blob', c: [0, -0.657, 0.875], r: [0.09, 0.024, 0.06], d: [0, 0.003, -0.006] },
    { op: 'smooth', c: [0.38, -0.4, 0.6], r: [0.42, 0.62, 0.5], it: 18, k: 0.8 },
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
    } else if (o.op === 'jaw') {
      each((p) => {
        if (p[2] < -0.3) return false;
        // zf: nur die Seiten des Kiefers (die Vorderseite der Wange bleibt, wie sie zum Licht steht; sonst grauer Fleck)
        const zf = o.zf ? ss(o.zf[0], o.zf[1], p[2]) : 1;
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
