// Szene "brain": Erzeugung aller Daten auf der CPU (einmal in create()).
// Alles in lokalen Koordinaten des Gehirns (Ursprung = ANCHORS.brain.center, Halbachsen = ANCHORS.brain.radii).
//
//   cortex   Punkte auf der gefalteten Rinde (Lappen aus Ellipsoiden, Laengsspalt und Sylvische Furche als Kerben,
//            Windungen als Hoehenlinien von verzerrtem Rauschen, Normalen numerisch), Kleinhirn mit Querrillen,
//            Hirnstamm bis zum Kabelaustritt
//   neurons  Nervenzellen: unter der Rinde, in tiefen Kernen, im Kleinhirn und im Stamm
//   edges    gebogene Verbindungen zu den naechsten Nachbarn (in Teilstuecke zerlegt)
//   fibers   Faserbahnen: Projektionsbahnen zum Hirnstamm, Balken zwischen den Haelften, Assoziationsbahnen
//   cascades 8 Ausloeser: Ankunftszeiten der Erregungswelle pro Zelle (Dijkstra), Baum der Ausbreitung
//   glows    weiche Lichtflecken (Ausloeser, warme Kerne, Kabelaustritt)
//   dust     Schwebeteilchen im Kopf

export const CASCADES = 8;
export const ARR_SCALE = 4.0; // Sekunden, die Uint16 1.0 entsprechen. 1.0 = nie erreicht

/* ------------------------------------------------------------- Helfer */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
function smooth(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

// 3D-Simplex-Rauschen (nach Stefan Gustavson), deterministisch ueber eigenen Zufall
export function makeSimplex(rnd) {
  const grad = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  const pm12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; }
  const F3 = 1 / 3;
  const G3 = 1 / 6;
  return function noise(xin, yin, zin) {
    let n0 = 0; let n1 = 0; let n2 = 0; let n3 = 0;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s); const j = Math.floor(yin + s); const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t); const y0 = yin - (j - t); const z0 = zin - (k - t);
    let i1; let j1; let k1; let i2; let j2; let k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    const x1 = x0 - i1 + G3; const y1 = y0 - j1 + G3; const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3; const y2 = y0 - j2 + 2 * G3; const z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3; const y3 = y0 - 1 + 3 * G3; const z3 = z0 - 1 + 3 * G3;
    const ii = i & 255; const jj = j & 255; const kk = k & 255;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) { const g = pm12[ii + perm[jj + perm[kk]]] * 3; t0 *= t0; n0 = t0 * t0 * (grad[g] * x0 + grad[g + 1] * y0 + grad[g + 2] * z0); }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) { const g = pm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; t1 *= t1; n1 = t1 * t1 * (grad[g] * x1 + grad[g + 1] * y1 + grad[g + 2] * z1); }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) { const g = pm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; t2 *= t2; n2 = t2 * t2 * (grad[g] * x2 + grad[g + 1] * y2 + grad[g + 2] * z2); }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) { const g = pm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; t3 *= t3; n3 = t3 * t3 * (grad[g] * x3 + grad[g + 1] * y3 + grad[g + 2] * z3); }
    return 32 * (n0 + n1 + n2 + n3);
  };
}

/* ------------------------------------------------------------- Gestalt */
// Grosshirn als Vereinigung von Ellipsoiden (normierte Koordinaten, 1 = ANCHORS.brain.radii):
// je Haelfte ein Hauptkoerper, ein Schlaefenlappen und ein Hinterhauptlappen. Wo sie sich schneiden, entstehen
// Laengsspalt und Sylvische Furche von selbst. Darauf Windungen aus verzerrtem Rauschen.
const LOBES = [];
for (const sx of [-1, 1]) {
  // Hauptkoerper (Stirn, Scheitel): Haelften ueberlappen breit, darum oben ein schmaler Spalt statt einer Herzform
  LOBES.push({ c: [sx * 0.34, 0.12, 0.0], r: [0.67, 0.86, 0.97], kind: 0, side: sx });
  LOBES.push({ c: [sx * 0.53, -0.45, 0.14], r: [0.37, 0.37, 0.56], kind: 1, side: sx }); // Schlaefenlappen
  LOBES.push({ c: [sx * 0.38, -0.1, -0.55], r: [0.54, 0.6, 0.47], kind: 2, side: sx }); // Hinterhaupt
}
// Tiefe der Kerbe, wo sich zwei Lappen treffen: [Art a][Art b], gleiche Seite / andere Seite
const CREASE_SAME = [[0, 0.07, 0.015], [0.07, 0, 0.02], [0.015, 0.02, 0]];
const CREASE_CROSS = 0.2; // Laengsspalt zwischen den Haelften

// Austrittsdistanz eines Strahls vom Ursprung (Richtung d) aus einem Ellipsoid, 0 wenn kein Treffer
function exitT(dx, dy, dz, L) {
  const ax = dx / L.r[0]; const ay = dy / L.r[1]; const az = dz / L.r[2];
  const cx = L.c[0] / L.r[0]; const cy = L.c[1] / L.r[1]; const cz = L.c[2] / L.r[2];
  const a = ax * ax + ay * ay + az * az;
  const b = -2 * (ax * cx + ay * cy + az * cz);
  const c = cx * cx + cy * cy + cz * cz - 1;
  const disc = b * b - 4 * a * c;
  if (disc <= 0) return 0;
  const t = (-b + Math.sqrt(disc)) / (2 * a);
  return t > 0 ? t : 0;
}

// Grundform ohne Windungen: Radius entlang d. Wo sich zwei Lappen schneiden, wird eine Kerbe eingezogen
// (Laengsspalt, Sylvische Furche). out.crease = Staerke der Kerbe 0..1
const BR = { s: 1, crease: 0 };
function baseRadius(dx, dy, dz) {
  let s = 0; let best = -1;
  let s2 = 0; let second = -1;
  for (let i = 0; i < LOBES.length; i++) {
    const t = exitT(dx, dy, dz, LOBES[i]);
    if (t > s) { s2 = s; second = best; s = t; best = i; } else if (t > s2) { s2 = t; second = i; }
  }
  let carve = 0;
  if (second >= 0 && best >= 0) {
    const A = LOBES[best]; const B = LOBES[second];
    // Laengsspalt nur oben, vorne und hinten (unten liegen Stamm und Schlaefenlappen)
    const depth = A.side !== B.side ? CREASE_CROSS * smooth(-0.6, -0.05, dy) : CREASE_SAME[A.kind][B.kind];
    const k = Math.exp(-(((s - s2) / (A.side !== B.side ? 0.028 : 0.05)) ** 2));
    carve = depth * k;
  }
  BR.crease = carve;
  BR.s = s * (1 - carve);
  return BR.s;
}

export const GY = { k: 8, dz: 4, lo: 0.22, hi: 0.72 }; // Windungen: Dichte, Ausrichtung, Furchenbreite
export const GO = [11.2, 2.5, 6.1]; // Versatz des Windungsmusters (ausgewaehlt: ruhige Front ohne Zielscheiben)
export function makeShape(noise) {
  const out = { s: 1, h: 1, fis: 0 };
  return function shape(dx, dy, dz) {
    const s0 = baseRadius(dx, dy, dz);
    const fis = smooth(0.04, 0.2, BR.crease); // tief im Spalt oder in der Furche
    // Windungen: Hoehenlinien von verzerrtem Rauschen bilden gleichmaessig breite Maeander (Labyrinth)
    const w = 1.3;
    const wx = noise(dx * w + 7.1, dy * w, dz * w);
    const wy = noise(dx * w, dy * w + 3.3, dz * w - 5.2);
    const f = 1.7;
    const n = noise(dx * f + 0.45 * wx + GO[0], dy * f * 1.15 + 0.45 * wy + GO[1], dz * f + 0.3 * (wx - wy) + GO[2]);
    const band = 0.5 + 0.5 * Math.cos(n * GY.k + 0.5 * wx + dz * GY.dz + dy * 2.0);
    const crest = smooth(GY.lo, GY.hi, band); // breite runde Kaemme, deutliche Furchen
    out.s = s0 * (1 - 0.055 * (1 - crest));
    out.h = crest;
    out.fis = fis;
    return out;
  };
}

// Punkt auf dem Grosshirn in lokalen Koordinaten (Richtung d, Skalierung s, Tiefe u)
function brainPoint(R, dx, dy, dz, s, u, target) {
  const k = s * u;
  target[0] = dx * k * R.x;
  target[1] = dy * k * R.y;
  target[2] = dz * k * R.z;
  return target;
}

// Flaechennormale der Grundform (numerisch), in lokalen Koordinaten
function baseNormal(R, dx, dy, dz, out) {
  // zwei Tangenten zur Richtung d
  let tx = -dz; let ty = 0; let tz = dx;
  if (Math.abs(dy) > 0.95) { tx = 1; ty = 0; tz = 0; }
  let l = Math.hypot(tx, ty, tz); tx /= l; ty /= l; tz /= l;
  const bx = dy * tz - dz * ty; const by = dz * tx - dx * tz; const bz = dx * ty - dy * tx;
  const e = 0.01;
  const P = (x, y, z, o) => {
    const ll = Math.hypot(x, y, z);
    x /= ll; y /= ll; z /= ll;
    const s = baseRadius(x, y, z);
    o[0] = x * s * R.x; o[1] = y * s * R.y; o[2] = z * s * R.z;
    return o;
  };
  const p1 = P(dx + tx * e, dy + ty * e, dz + tz * e, FN[0]);
  const p2 = P(dx - tx * e, dy - ty * e, dz - tz * e, FN[1]);
  const p3 = P(dx + bx * e, dy + by * e, dz + bz * e, FN[2]);
  const p4 = P(dx - bx * e, dy - by * e, dz - bz * e, FN[3]);
  const ux = p1[0] - p2[0]; const uy = p1[1] - p2[1]; const uz = p1[2] - p2[2];
  const vx = p3[0] - p4[0]; const vy = p3[1] - p4[1]; const vz = p3[2] - p4[2];
  let nx = uy * vz - uz * vy; let ny = uz * vx - ux * vz; let nz = ux * vy - uy * vx;
  l = Math.hypot(nx, ny, nz) || 1;
  nx /= l; ny /= l; nz /= l;
  // nach aussen zeigen lassen
  if (nx * dx + ny * dy + nz * dz < 0) { nx = -nx; ny = -ny; nz = -nz; }
  out[0] = nx; out[1] = ny; out[2] = nz;
  return out;
}

// Flaechennormale der gefalteten Rinde (numerisch, mit Windungen), in lokalen Koordinaten.
// p0 = Punkt auf der Flaeche (ohne Tiefenversatz), Vorwaertsdifferenzen in zwei Tangentenrichtungen.
function foldNormal(shape, R, dx, dy, dz, s0, out) {
  let tx = -dz; let ty = 0; let tz = dx;
  if (Math.abs(dy) > 0.95) { tx = 1; ty = 0; tz = 0; }
  let l = Math.hypot(tx, ty, tz); tx /= l; ty /= l; tz /= l;
  const bx = dy * tz - dz * ty; const by = dz * tx - dx * tz; const bz = dx * ty - dy * tx;
  const e = 0.005;
  const P = (x, y, z, o) => {
    const ll = Math.hypot(x, y, z);
    x /= ll; y /= ll; z /= ll;
    const s = shape(x, y, z).s;
    o[0] = x * s * R.x; o[1] = y * s * R.y; o[2] = z * s * R.z;
    return o;
  };
  const p0 = FN[0];
  p0[0] = dx * s0 * R.x; p0[1] = dy * s0 * R.y; p0[2] = dz * s0 * R.z;
  const p1 = P(dx + tx * e, dy + ty * e, dz + tz * e, FN[1]);
  const p3 = P(dx + bx * e, dy + by * e, dz + bz * e, FN[2]);
  const ux = p1[0] - p0[0]; const uy = p1[1] - p0[1]; const uz = p1[2] - p0[2];
  const vx = p3[0] - p0[0]; const vy = p3[1] - p0[1]; const vz = p3[2] - p0[2];
  let nx = uy * vz - uz * vy; let ny = uz * vx - ux * vz; let nz = ux * vy - uy * vx;
  l = Math.hypot(nx, ny, nz) || 1;
  nx /= l; ny /= l; nz /= l;
  if (nx * dx + ny * dy + nz * dz < 0) { nx = -nx; ny = -ny; nz = -nz; }
  out[0] = nx; out[1] = ny; out[2] = nz;
  return out;
}
const FN = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];

/* ------------------------------------------------------------- Kleinhirn, Hirnstamm, Sonde */
// Gemeinsam mit brain-hardware.js: die Hardware (Wiege, Klammern, Elektroden) wird an diese Form angepasst.
export const CEREB = Object.freeze({ c: [0, -0.29, -0.43], r: [0.31, 0.14, 0.2] });
export const STEM_R = (t) => 0.078 - 0.026 * t;
export function stemPoints(root) {
  return [[0, -0.25, -0.2], [0, -0.45, -0.34], [root.x, root.y, root.z]];
}
export function stemAt(P, t, out) {
  const a = (1 - t) * (1 - t); const b = 2 * (1 - t) * t; const c = t * t;
  for (let i = 0; i < 3; i++) out[i] = a * P[0][i] + b * P[1][i] + c * P[2][i];
  return out;
}

/**
 * Sonde fuer die Form des Gehirns (lokal, gleiche Windungen wie buildBrain): Innen-Test und Oberflaeche entlang eines
 * Strahls. Wird nur beim Bauen gebraucht (Hardware anpassen), nie pro Frame.
 */
export function makeBrainProbe(R, root) {
  const shape = makeShape(makeSimplex(mulberry32(77)));
  const SP = stemPoints(root);
  const sp = [0, 0, 0];
  const stemSamples = [];
  for (let i = 0; i <= 24; i++) stemSamples.push([...stemAt(SP, i / 24, [0, 0, 0]), STEM_R(i / 24)]);
  function insideCerebrum(x, y, z) {
    const qx = x / R.x; const qy = y / R.y; const qz = z / R.z;
    const l = Math.hypot(qx, qy, qz);
    if (l < 1e-6) return true;
    return l < shape(qx / l, qy / l, qz / l).s;
  }
  function insideCereb(x, y, z) {
    const a = (x - CEREB.c[0]) / CEREB.r[0]; const b = (y - CEREB.c[1]) / CEREB.r[1]; const c = (z - CEREB.c[2]) / CEREB.r[2];
    return a * a + b * b + c * c < 1;
  }
  function insideStem(x, y, z) {
    for (const s of stemSamples) {
      const dx = x - s[0]; const dy = y - s[1]; const dz = z - s[2];
      if (dx * dx + dy * dy + dz * dz < s[3] * s[3]) return true;
    }
    return false;
  }
  const inside = (x, y, z, stem = true) => insideCerebrum(x, y, z) || insideCereb(x, y, z) || (stem && insideStem(x, y, z));
  // Aeusserste Oberflaeche entlang des Strahls c + d * t (t in 0..maxT), 0 wenn der Strahl das Gehirn nicht trifft
  function surfaceAlong(cx, cy, cz, dx, dy, dz, maxT = 1.2, stem = true) {
    const step = 0.008;
    let t = maxT;
    while (t > 0) {
      if (inside(cx + dx * t, cy + dy * t, cz + dz * t, stem)) {
        let a = t; let b = t + step;
        for (let i = 0; i < 8; i++) {
          const m = (a + b) * 0.5;
          if (inside(cx + dx * m, cy + dy * m, cz + dz * m, stem)) a = m; else b = m;
        }
        return a;
      }
      t -= step;
    }
    return 0;
  }
  // Erster Eintritt in das Gehirn entlang c + d * t (Strahl von aussen), 0 wenn kein Treffer
  function hitAlong(cx, cy, cz, dx, dy, dz, maxT = 0.5, stem = true) {
    const step = 0.004;
    for (let t = 0; t < maxT; t += step) {
      if (inside(cx + dx * t, cy + dy * t, cz + dz * t, stem)) {
        let a = Math.max(0, t - step); let b = t;
        for (let i = 0; i < 8; i++) {
          const m = (a + b) * 0.5;
          if (inside(cx + dx * m, cy + dy * m, cz + dz * m, stem)) b = m; else a = m;
        }
        return b;
      }
    }
    return 0;
  }
  // Punkt auf der Rinde in Richtung d (vom Mittelpunkt aus) und Flaechennormale (numerisch, Grundform ohne Windungen)
  function cortexPoint(dx, dy, dz, out) {
    const l = Math.hypot(dx, dy, dz) || 1;
    const t = surfaceAlong(0, 0, 0, dx / l, dy / l, dz / l, 1.2, false);
    out[0] = (dx / l) * t; out[1] = (dy / l) * t; out[2] = (dz / l) * t;
    return out;
  }
  return { inside, insideCerebrum, insideCereb, insideStem, surfaceAlong, hitAlong, cortexPoint, stemPoints: SP, stemAt: (t, o) => stemAt(SP, t, o), sp };
}

/* ------------------------------------------------------------- Hauptfunktion */
/**
 * @param {object} o
 * @param {THREE.Vector3} o.R      Halbachsen des Gehirns
 * @param {THREE.Vector3} o.root   Kabelaustritt (lokal)
 * @param {THREE.Vector3} o.headC  Kopfmitte (lokal), o.headR Halbachsen des Kopfes
 * @param {number} o.q             Mengenfaktor (tier.particles)
 * @param {number} o.subdiv        Teilstuecke pro Verbindung
 * @param {number} o.fiberSeg      Teilstuecke pro Faserbahn
 */
export function buildBrain(o) {
  const { R, root, headC, headR, q, subdiv, fiberSeg } = o;
  const rnd = mulberry32(20261026);
  const noise = makeSimplex(mulberry32(77));
  const shape = makeShape(noise);
  const gauss = () => {
    let u = 0; let v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const randDir = (t) => {
    let x; let y; let z; let l;
    do { x = gauss(); y = gauss(); z = gauss(); l = Math.hypot(x, y, z); } while (l < 1e-6);
    t[0] = x / l; t[1] = y / l; t[2] = z / l;
    return t;
  };
  const tmp = [0, 0, 0];
  const dir = [0, 0, 0];

  // Kleinhirn und Hirnstamm (lokal)
  const CB = CEREB;
  // Hirnstamm hinten unten (vor dem Kleinhirn), von vorne kaum sichtbar
  const stemP = stemPoints(root);
  const bez = (t, out) => stemAt(stemP, t, out);
  const stemR = STEM_R;

  const insideBrain = (x, y, z, margin = 0.985) => {
    const qx = x / R.x;
    const qy = y / R.y;
    const qz = z / R.z;
    const l = Math.hypot(qx, qy, qz);
    if (l < 1e-6) return true;
    return l < baseRadius(qx / l, qy / l, qz / l) * margin;
  };
  const insideCereb = (x, y, z, m = 0.98) => {
    const a = (x - CB.c[0]) / CB.r[0]; const b = (y - CB.c[1]) / CB.r[1]; const c = (z - CB.c[2]) / CB.r[2];
    return a * a + b * b + c * c < m * m;
  };

  /* ---------------------------------------------------------- Rinde */
  const nCortex = Math.round(46000 * q);
  const nCereb = Math.round(6500 * q);
  const nStem = Math.round(2600 * q);
  const nC = nCortex + nCereb + nStem;
  const cPos = new Float32Array(nC * 3);
  const cNor = new Float32Array(nC * 3);
  const cMeta = new Float32Array(nC * 4); // h, seed, region (0 Rinde, 0.5 Kleinhirn, 1 Stamm), Tiefe
  let ci = 0;
  let guard = 0;
  const nrm = [0, 0, 0];
  while (ci < nCortex && guard++ < nCortex * 40) {
    randDir(dir);
    // gleichmaessige Dichte auf der Flaeche (Raumwinkel -> Flaeche), zuerst mit der guenstigen Grundform
    const sb = baseRadius(dir[0], dir[1], dir[2]);
    brainPoint(R, dir[0], dir[1], dir[2], sb, 1, tmp);
    if (insideCereb(tmp[0], tmp[1], tmp[2], 1.02)) continue;
    baseNormal(R, dir[0], dir[1], dir[2], nrm);
    const r = Math.hypot(tmp[0], tmp[1], tmp[2]);
    const cos = Math.max(0.3, (nrm[0] * tmp[0] + nrm[1] * tmp[1] + nrm[2] * tmp[2]) / r);
    if (rnd() > Math.min(1, (r * r) / cos / 0.75)) continue;
    // Kaemme dichter als Furchen
    const sh = shape(dir[0], dir[1], dir[2]);
    const h = sh.h;
    const ss = sh.s;
    if (rnd() > 0.05 + 0.95 * h * Math.sqrt(h)) continue;
    if (sh.fis > 0.5 && rnd() < 0.7) continue;
    const u = 1 - rnd() * rnd() * 0.03;
    foldNormal(shape, R, dir[0], dir[1], dir[2], ss, nrm);
    const o = ci * 3;
    cPos[o] = dir[0] * ss * u * R.x; cPos[o + 1] = dir[1] * ss * u * R.y; cPos[o + 2] = dir[2] * ss * u * R.z;
    cNor[o] = nrm[0]; cNor[o + 1] = nrm[1]; cNor[o + 2] = nrm[2];
    const m = ci * 4;
    cMeta[m] = h; cMeta[m + 1] = rnd(); cMeta[m + 2] = 0; cMeta[m + 3] = 0;
    ci++;
  }
  // Kleinhirn: feine Querrillen (Folia), Wurm in der Mitte
  guard = 0;
  const cEnd = ci + nCereb;
  while (ci < cEnd && guard++ < nCereb * 40) {
    randDir(dir);
    const e = Math.atan2(dir[1], Math.hypot(dir[0] * 0.8, dir[2]));
    const st = 0.5 + 0.5 * Math.cos(e * 26 + 2.2 * noise(dir[0] * 2.2, dir[1] * 2.2, dir[2] * 2.2));
    const verm = Math.exp(-(dir[0] * dir[0]) / 0.006);
    if (rnd() > 0.2 + 0.8 * st * st) continue;
    const s = (1 - 0.06 * (1 - st)) * (1 - 0.14 * verm);
    const x = CB.c[0] + dir[0] * s * CB.r[0];
    const y = CB.c[1] + dir[1] * s * CB.r[1];
    const z = CB.c[2] + dir[2] * s * CB.r[2];
    if (insideBrain(x, y, z, 1.0)) continue;
    cPos.set([x, y, z], ci * 3);
    const nx = dir[0] / CB.r[0]; const ny = dir[1] / CB.r[1]; const nz = dir[2] / CB.r[2];
    const nl = Math.hypot(nx, ny, nz) || 1;
    cNor.set([nx / nl, ny / nl, nz / nl], ci * 3);
    cMeta.set([st * (1 - 0.5 * verm), rnd(), 0.5, st * st], ci * 4);
    ci++;
  }
  // Hirnstamm: Roehre mit Laengsfasern bis zum Kabelaustritt
  guard = 0;
  const sEnd = ci + nStem;
  const sp = [0, 0, 0];
  const sp2 = [0, 0, 0];
  while (ci < sEnd && guard++ < nStem * 40) {
    const t = rnd();
    bez(t, sp);
    bez(Math.min(1, t + 0.01), sp2);
    let tx = sp2[0] - sp[0]; let ty = sp2[1] - sp[1]; let tz = sp2[2] - sp[2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;
    // Basis senkrecht zur Achse (Achse liegt in der y-z-Ebene)
    const ax = [1, 0, 0];
    const bx = [ty * ax[2] - tz * ax[1], tz * ax[0] - tx * ax[2], tx * ax[1] - ty * ax[0]];
    const th = rnd() * Math.PI * 2;
    const str = 0.5 + 0.5 * Math.cos(th * 14);
    if (rnd() > 0.3 + 0.7 * str) continue;
    const r = stemR(t) * (0.96 + 0.04 * str);
    const cx = Math.cos(th); const sx = Math.sin(th);
    const x = sp[0] + (ax[0] * cx + bx[0] * sx) * r;
    const y = sp[1] + (ax[1] * cx + bx[1] * sx) * r;
    const z = sp[2] + (ax[2] * cx + bx[2] * sx) * r;
    if (insideBrain(x, y, z, 1.0) || insideCereb(x, y, z, 1.0)) continue;
    cPos.set([x, y, z], ci * 3);
    cNor.set([ax[0] * cx + bx[0] * sx, ax[1] * cx + bx[1] * sx, ax[2] * cx + bx[2] * sx], ci * 3);
    cMeta.set([str * 0.8, rnd(), 1, 0], ci * 4);
    ci++;
  }
  const cortexCount = ci;

  /* ---------------------------------------------------------- Nervenzellen */
  const nN = Math.max(300, Math.round(2600 * q));
  const nPos = new Float32Array(nN * 3);
  const nMeta = new Float32Array(nN * 4); // Groesse, warm, seed, Art (0 Rinde, 1 tief, 2 Kleinhirn, 3 Stamm)
  const kinds = new Uint8Array(nN);
  const nuclei = [
    [0.1, -0.1, -0.06], [-0.1, -0.1, -0.06], // Thalamus
    [0.23, -0.04, 0.1], [-0.23, -0.04, 0.1], // Basalganglien
    [0.3, -0.26, -0.04], [-0.3, -0.26, -0.04], // Hippocampus
  ];
  let ni = 0;
  guard = 0;
  while (ni < nN && guard++ < nN * 60) {
    const r = rnd();
    let kind;
    if (r < 0.8) {
      randDir(dir);
      if (Math.abs(dir[0]) < 0.05 && dir[1] > -0.4) continue;
      const sh = shape(dir[0], dir[1], dir[2]);
      if (sh.h < 0.35 && rnd() < 0.6) continue;
      brainPoint(R, dir[0], dir[1], dir[2], sh.s, 0.8 + 0.16 * rnd(), tmp);
      if (insideCereb(tmp[0], tmp[1], tmp[2], 1.05)) continue;
      kind = 0;
    } else if (r < 0.91) {
      if (rnd() < 0.35) {
        const c = nuclei[Math.floor(rnd() * nuclei.length)];
        tmp[0] = c[0] + gauss() * 0.07; tmp[1] = c[1] + gauss() * 0.06; tmp[2] = c[2] + gauss() * 0.08;
      } else {
        randDir(dir);
        const k = Math.cbrt(rnd()) * 0.72;
        tmp[0] = dir[0] * k * R.x; tmp[1] = dir[1] * k * R.y; tmp[2] = dir[2] * k * R.z;
      }
      if (!insideBrain(tmp[0], tmp[1], tmp[2], 0.82)) continue;
      kind = 1;
    } else if (r < 0.97) {
      randDir(dir);
      const k = 0.55 + 0.38 * rnd();
      tmp[0] = CB.c[0] + dir[0] * k * CB.r[0]; tmp[1] = CB.c[1] + dir[1] * k * CB.r[1]; tmp[2] = CB.c[2] + dir[2] * k * CB.r[2];
      if (insideBrain(tmp[0], tmp[1], tmp[2], 1.0)) continue;
      kind = 2;
    } else {
      const t = 0.05 + 0.95 * rnd();
      bez(t, tmp);
      randDir(dir);
      const k = stemR(t) * 0.75 * Math.sqrt(rnd());
      tmp[0] += dir[0] * k; tmp[1] += dir[1] * k; tmp[2] += dir[2] * k;
      kind = 3;
    }
    nPos.set(tmp, ni * 3);
    const big = rnd();
    // wenige grosse Knoten (Hubs) als ruhige Lichtpunkte, der Rest fein
    const hub = rnd() < 0.07;
    nMeta.set([hub ? 0.021 + 0.006 * rnd() : 0.0085 + 0.0095 * big * big, rnd() < 0.1 ? 1 : 0, rnd(), kind], ni * 4);
    kinds[ni] = kind;
    ni++;
  }
  const neuronCount = ni;

  /* ---------------------------------------------------------- Raster fuer Nachbarsuche */
  // Flaches Raster (Zaehlsortierung), Bereich -1.2..1.2 in jeder Achse
  const cell = 0.1;
  const G = 24;
  const OFF = 1.2;
  const gIdx = (v) => Math.min(G - 1, Math.max(0, Math.floor((v + OFF) / cell)));
  const cellStart = new Int32Array(G * G * G + 1);
  const cellOf = new Int32Array(neuronCount);
  for (let i = 0; i < neuronCount; i++) {
    const c = (gIdx(nPos[i * 3]) * G + gIdx(nPos[i * 3 + 1])) * G + gIdx(nPos[i * 3 + 2]);
    cellOf[i] = c;
    cellStart[c + 1]++;
  }
  for (let c = 0; c < G * G * G; c++) cellStart[c + 1] += cellStart[c];
  const cellItems = new Int32Array(neuronCount);
  const fill = cellStart.slice(0, G * G * G);
  for (let i = 0; i < neuronCount; i++) cellItems[fill[cellOf[i]]++] = i;
  const near = (x, y, z, maxD, cb) => {
    const gx = gIdx(x); const gy = gIdx(y); const gz = gIdx(z);
    const r = Math.ceil(maxD / cell);
    const m2 = maxD * maxD;
    for (let a = Math.max(0, gx - r); a <= Math.min(G - 1, gx + r); a++) {
      for (let b = Math.max(0, gy - r); b <= Math.min(G - 1, gy + r); b++) {
        for (let c = Math.max(0, gz - r); c <= Math.min(G - 1, gz + r); c++) {
          const ci2 = (a * G + b) * G + c;
          for (let s = cellStart[ci2]; s < cellStart[ci2 + 1]; s++) {
            const j = cellItems[s];
            const dx = nPos[j * 3] - x; const dy = nPos[j * 3 + 1] - y; const dz = nPos[j * 3 + 2] - z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < m2) cb(j, d2);
          }
        }
      }
    }
  };

  /* ---------------------------------------------------------- Verbindungen */
  const K = 3;
  const maxD = 0.16;
  const edgeSet = new Set();
  const edges = [];
  const adj = Array.from({ length: neuronCount }, () => []);
  const cand = [];
  for (let i = 0; i < neuronCount; i++) {
    cand.length = 0;
    const x = nPos[i * 3]; const y = nPos[i * 3 + 1]; const z = nPos[i * 3 + 2];
    near(x, y, z, maxD, (j, d2) => {
      if (j === i) return;
      const xj = nPos[j * 3];
      // keine Verbindung quer durch den Laengsspalt (das macht der Balken)
      if (x * xj < 0 && (kinds[i] === 0 || kinds[j] === 0)) return;
      cand.push(d2, j);
    });
    const order = [];
    for (let c = 0; c < cand.length; c += 2) order.push(c);
    order.sort((a, b) => cand[a] - cand[b]);
    for (let c = 0; c < Math.min(K, order.length); c++) {
      const j = cand[order[c] + 1];
      const a = Math.min(i, j); const b = Math.max(i, j);
      const ek = a * 65536 + b;
      if (edgeSet.has(ek)) continue;
      edgeSet.add(ek);
      const len = Math.sqrt(cand[order[c]]);
      const w = len * (0.75 + 0.7 * rnd()); // Leitungszeit (ungleichmaessig: verzweigte Blitze)
      const e = edges.length;
      edges.push({ a, b, len, w });
      adj[a].push(b, e);
      adj[b].push(a, e);
    }
  }

  /* ---------------------------------------------------------- Erregungswellen (Dijkstra) */
  // Ausloeser: weit auseinander, ueberwiegend in der Rinde, einer im Thalamus
  const seeds = [];
  const cortical = [];
  for (let i = 0; i < neuronCount; i++) if (kinds[i] === 0) cortical.push(i);
  seeds.push(cortical[Math.floor(rnd() * cortical.length)]);
  const minD = new Float32Array(neuronCount).fill(1e9);
  while (seeds.length < CASCADES - 1) {
    const s = seeds[seeds.length - 1];
    let best = -1; let bestD = -1;
    for (const i of cortical) {
      const dx = nPos[i * 3] - nPos[s * 3]; const dy = nPos[i * 3 + 1] - nPos[s * 3 + 1]; const dz = nPos[i * 3 + 2] - nPos[s * 3 + 2];
      minD[i] = Math.min(minD[i], dx * dx + dy * dy + dz * dz);
      const v = minD[i] * (0.6 + 0.4 * rnd());
      if (v > bestD) { bestD = v; best = i; }
    }
    seeds.push(best);
  }
  {
    let best = 0; let bd = 1e9;
    for (let i = 0; i < neuronCount; i++) {
      if (kinds[i] !== 1) continue;
      const d = Math.hypot(nPos[i * 3] - 0.1, nPos[i * 3 + 1] + 0.1, nPos[i * 3 + 2] + 0.06);
      if (d < bd) { bd = d; best = i; }
    }
    seeds.push(best);
  }
  const speed = q >= 0.75 ? 0.68 : 0.82; // Einheiten pro Sekunde (weniger Zellen: Wege kruemmer, darum schneller)
  const reach = [];
  const period = [];
  const phase = [];
  const arr = Array.from({ length: CASCADES }, () => new Float64Array(neuronCount).fill(Infinity));
  const parentEdge = Array.from({ length: CASCADES }, () => new Int32Array(neuronCount).fill(-1));
  for (let k = 0; k < CASCADES; k++) {
    reach.push(k === CASCADES - 1 ? 1.0 : 1.1 + 0.6 * rnd());
    period.push(reach[k] + 1.3 + 1.8 * rnd());
    phase.push(rnd() * period[k]);
    // Dijkstra mit einfachem Binaerheap
    const A = arr[k]; const P = parentEdge[k];
    const heap = [];
    const push = (d, i) => {
      heap.push([d, i]);
      let c = heap.length - 1;
      while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; }
    };
    const pop = () => {
      const top = heap[0]; const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let c = 0;
        for (;;) {
          const l = c * 2 + 1; const r = l + 1; let m = c;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === c) break;
          [heap[m], heap[c]] = [heap[c], heap[m]]; c = m;
        }
      }
      return top;
    };
    A[seeds[k]] = 0;
    push(0, seeds[k]);
    while (heap.length) {
      const [d, i] = pop();
      if (d > A[i] || d > reach[k]) continue;
      const nb = adj[i];
      for (let c = 0; c < nb.length; c += 2) {
        const j = nb[c]; const e = nb[c + 1];
        const nd = d + edges[e].w / speed;
        if (nd < A[j]) { A[j] = nd; P[j] = e; push(nd, j); }
      }
    }
  }
  const enc = (v) => (Number.isFinite(v) ? Math.min(65534, Math.round((v / ARR_SCALE) * 65535)) : 65535);

  // Ankunftszeiten der Zellen (2 x vec4, Uint16 normiert)
  const nArr0 = new Uint16Array(neuronCount * 4);
  const nArr1 = new Uint16Array(neuronCount * 4);
  for (let i = 0; i < neuronCount; i++) {
    for (let k = 0; k < 4; k++) {
      nArr0[i * 4 + k] = enc(arr[k][i]);
      nArr1[i * 4 + k] = enc(arr[k + 4][i]);
    }
  }

  // Rinde: Ankunft der naechsten Zelle plus Laufzeit an der Oberflaeche (weiche Welle)
  const cArr0 = new Uint16Array(cortexCount * 4);
  const cArr1 = new Uint16Array(cortexCount * 4);
  for (let i = 0; i < cortexCount; i++) {
    const x = cPos[i * 3]; const y = cPos[i * 3 + 1]; const z = cPos[i * 3 + 2];
    let best = -1; let bd = 1e9;
    const pick = (j, d2) => {
      if (kinds[j] === 1) return;
      if (d2 < bd) { bd = d2; best = j; }
    };
    near(x, y, z, 0.1, pick);
    if (best < 0) near(x, y, z, 0.24, pick);
    for (let k = 0; k < CASCADES; k++) {
      const v = best >= 0 ? arr[k][best] + Math.sqrt(bd) / 0.45 : Infinity;
      if (k < 4) cArr0[i * 4 + k] = enc(v); else cArr1[i * 4 + (k - 4)] = enc(v);
    }
  }

  /* ---------------------------------------------------------- Verbindungen als Teilstuecke */
  const S = Math.max(1, subdiv);
  const eCount = edges.length * S;
  const eA = new Float32Array(eCount * 3);
  const eB = new Float32Array(eCount * 3);
  const eMeta = new Float32Array(eCount * 4); // seed, warm, tA, tB (Parameter entlang der ganzen Verbindung)
  const eArA0 = new Uint16Array(eCount * 4);
  const eArA1 = new Uint16Array(eCount * 4);
  const eArB0 = new Uint16Array(eCount * 4);
  const eArB1 = new Uint16Array(eCount * 4);
  const pa = [0, 0, 0]; const pb = [0, 0, 0]; const pc = [0, 0, 0];
  const curve = (t, out) => {
    const a = (1 - t) * (1 - t); const b = 2 * (1 - t) * t; const c = t * t;
    for (let i = 0; i < 3; i++) out[i] = a * pa[i] + b * pc[i] + c * pb[i];
    return out;
  };
  const q0 = [0, 0, 0]; const q1 = [0, 0, 0];
  let si = 0;
  edges.forEach((ed) => {
    for (let i = 0; i < 3; i++) { pa[i] = nPos[ed.a * 3 + i]; pb[i] = nPos[ed.b * 3 + i]; }
    // leichte Kruemmung quer zur Verbindung
    const dx = pb[0] - pa[0]; const dy = pb[1] - pa[1]; const dz = pb[2] - pa[2];
    randDir(dir);
    let cx = dy * dir[2] - dz * dir[1]; let cy = dz * dir[0] - dx * dir[2]; let cz = dx * dir[1] - dy * dir[0];
    const cl = Math.hypot(cx, cy, cz) || 1;
    const bend = ed.len * (0.12 + 0.2 * rnd());
    cx = (cx / cl) * bend; cy = (cy / cl) * bend; cz = (cz / cl) * bend;
    pc[0] = (pa[0] + pb[0]) / 2 + cx; pc[1] = (pa[1] + pb[1]) / 2 + cy; pc[2] = (pa[2] + pb[2]) / 2 + cz;
    const seed = rnd();
    const warm = rnd() < 0.07 ? 1 : 0;
    // Ankunft an den Enden: wird unten nur fuer Kanten des Ausbreitungsbaums gesetzt
    ed.ta = new Float32Array(CASCADES).fill(Infinity);
    ed.tb = new Float32Array(CASCADES).fill(Infinity);
    for (let s = 0; s < S; s++) {
      curve(s / S, q0);
      curve((s + 1) / S, q1);
      eA.set(q0, si * 3);
      eB.set(q1, si * 3);
      eMeta.set([seed, warm, s / S, (s + 1) / S], si * 4);
      si++;
    }
  });
  // Baum-Kanten markieren und Ankunftszeiten in die Teilstuecke schreiben
  for (let k = 0; k < CASCADES; k++) {
    const P = parentEdge[k]; const A = arr[k];
    for (let i = 0; i < neuronCount; i++) {
      const e = P[i];
      if (e < 0) continue;
      const ed = edges[e];
      ed.ta[k] = A[ed.a];
      ed.tb[k] = A[ed.b];
    }
  }
  edges.forEach((ed, e) => {
    for (let s = 0; s < S; s++) {
      const idx = e * S + s;
      const t0 = s / S; const t1 = (s + 1) / S;
      for (let k = 0; k < CASCADES; k++) {
        const fa = ed.ta[k]; const fb = ed.tb[k];
        const ok = Number.isFinite(fa) && Number.isFinite(fb);
        const va = ok ? fa + (fb - fa) * t0 : Infinity;
        const vb = ok ? fa + (fb - fa) * t1 : Infinity;
        if (k < 4) { eArA0[idx * 4 + k] = enc(va); eArB0[idx * 4 + k] = enc(vb); }
        else { eArA1[idx * 4 + k - 4] = enc(va); eArB1[idx * 4 + k - 4] = enc(vb); }
      }
    }
  });

  /* ---------------------------------------------------------- Faserbahnen */
  const nF = Math.max(24, Math.round(96 * q));
  const FS = Math.max(6, fiberSeg);
  const fA = new Float32Array(nF * FS * 3);
  const fB = new Float32Array(nF * FS * 3);
  const fMeta = new Float32Array(nF * FS * 4); // seed, Art (0 Projektion, 0.5 Balken, 1 Assoziation), tA, tB
  let fi = 0;
  const cat = (pts, t, out) => {
    // Catmull-Rom (uniform) durch pts
    const n = pts.length - 1;
    const x = Math.min(n - 1e-6, Math.max(0, t * n));
    const i = Math.floor(x); const u = x - i;
    const p0 = pts[Math.max(0, i - 1)]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[Math.min(n, i + 2)];
    const u2 = u * u; const u3 = u2 * u;
    for (let c = 0; c < 3; c++) {
      out[c] = 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * u + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * u2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * u3);
    }
    return out;
  };
  const surf = (dx, dy, dz, u) => {
    const l = Math.hypot(dx, dy, dz);
    const sh = shape(dx / l, dy / l, dz / l);
    return brainPoint(R, dx / l, dy / l, dz / l, sh.s, u, [0, 0, 0]);
  };
  for (let f = 0; f < nF; f++) {
    const r = f / nF;
    let pts;
    let type;
    const side = rnd() < 0.5 ? -1 : 1;
    if (r < 0.4) {
      // Projektionsbahn: Rinde -> innere Kapsel -> Hirnstamm -> Kabelaustritt
      type = 0;
      const dy = 0.0 + rnd() * 0.95; const dz = (rnd() * 2 - 1) * 0.9;
      const dx = side * (0.25 + rnd() * 0.75);
      const s0 = surf(dx, dy, dz, 0.9);
      const ic = [side * (0.11 + rnd() * 0.05), -0.06 + rnd() * 0.06, -0.04 + (rnd() - 0.5) * 0.12];
      const m0 = [(s0[0] * 0.55 + ic[0] * 0.45), (s0[1] * 0.55 + ic[1] * 0.45) + 0.03, (s0[2] * 0.55 + ic[2] * 0.45)];
      const e0 = bez(0.1 + rnd() * 0.15, [0, 0, 0]);
      e0[0] += side * 0.025 * rnd();
      const e1 = bez(0.55 + rnd() * 0.2, [0, 0, 0]);
      const rr = stemR(0.9) * 0.6;
      const end = [root.x + (rnd() - 0.5) * rr, root.y + (rnd() - 0.5) * rr, root.z + (rnd() - 0.5) * rr * 0.5];
      pts = [s0, m0, ic, e0, e1, end];
    } else if (r < 0.75) {
      // Balken: bogenfoermig von einer Haelfte in die andere
      type = 0.5;
      const dy = 0.15 + rnd() * 0.8; const dz = (rnd() * 2 - 1) * 0.8;
      const s0 = surf(-(0.35 + rnd() * 0.6), dy, dz, 0.9);
      const s1 = surf(0.35 + rnd() * 0.6, dy + (rnd() - 0.5) * 0.15, dz + (rnd() - 0.5) * 0.15, 0.9);
      const cz = dz * R.z * 0.45;
      const cy = 0.02 + rnd() * 0.06;
      pts = [s0, [s0[0] * 0.45, s0[1] * 0.4 + cy, s0[2] * 0.6], [0, cy - 0.02, cz], [s1[0] * 0.45, s1[1] * 0.4 + cy, s1[2] * 0.6], s1];
    } else {
      // Assoziationsbahn: vorne -> hinten in einer Haelfte, bogenfoermig nach innen
      type = 1;
      const y0 = (rnd() - 0.3) * 0.8;
      const s0 = surf(side * (0.4 + rnd() * 0.5), y0, 0.7 + rnd() * 0.3, 0.9);
      const s1 = surf(side * (0.4 + rnd() * 0.5), y0 + (rnd() - 0.5) * 0.4, -(0.6 + rnd() * 0.4), 0.9);
      const mid = [side * (0.2 + rnd() * 0.12), (s0[1] + s1[1]) * 0.5 + 0.04, (s0[2] + s1[2]) * 0.5];
      pts = [s0, [s0[0] * 0.75 + mid[0] * 0.25, s0[1] * 0.8 + mid[1] * 0.2, s0[2] * 0.6 + mid[2] * 0.4], mid,
        [s1[0] * 0.75 + mid[0] * 0.25, s1[1] * 0.8 + mid[1] * 0.2, s1[2] * 0.6 + mid[2] * 0.4], s1];
    }
    // organisch: Zwischenpunkte leicht versetzen
    const wig = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1]; const p1 = pts[i];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
      const amp = len * 0.18;
      wig.push([(p0[0] + p1[0]) / 2 + gauss() * amp, (p0[1] + p1[1]) / 2 + gauss() * amp, (p0[2] + p1[2]) / 2 + gauss() * amp]);
      wig.push(p1);
    }
    pts = wig;
    const seed = rnd();
    for (let s = 0; s < FS; s++) {
      cat(pts, s / FS, q0);
      cat(pts, (s + 1) / FS, q1);
      fA.set(q0, fi * 3);
      fB.set(q1, fi * 3);
      fMeta.set([seed, type, s / FS, (s + 1) / FS], fi * 4);
      fi++;
    }
  }

  /* ---------------------------------------------------------- Lichtflecken */
  // [x, y, z, Groesse]  Reihenfolge: 8 Ausloeser, 2 warme Kerne, Kabelaustritt, Hauch in der Mitte
  const glows = [];
  for (let k = 0; k < CASCADES; k++) {
    const s = seeds[k];
    glows.push([nPos[s * 3], nPos[s * 3 + 1], nPos[s * 3 + 2], 0.15]);
  }
  glows.push([-0.2, -0.02, 0.02, 0.32], [0.2, -0.02, 0.02, 0.32]);
  glows.push([root.x, root.y, root.z, 0.16]);
  glows.push([0, -0.04, -0.04, 1.05]);

  /* ---------------------------------------------------------- Schwebeteilchen */
  const nD = Math.max(200, Math.round(1400 * q));
  const dPos = new Float32Array(nD * 3);
  const dMeta = new Float32Array(nD * 4); // Groesse, warm, seed, Phase
  for (let i = 0; i < nD; i++) {
    randDir(dir);
    const k = 0.35 + 0.6 * Math.cbrt(rnd());
    dPos[i * 3] = headC.x + dir[0] * k * headR.x;
    dPos[i * 3 + 1] = headC.y + dir[1] * k * headR.y;
    dPos[i * 3 + 2] = headC.z + dir[2] * k * headR.z;
    dMeta.set([0.0025 + 0.004 * rnd() ** 3, rnd() < 0.08 ? 1 : 0, rnd(), rnd() * 6.283], i * 4);
  }

  return {
    cortex: { count: cortexCount, pos: cPos.subarray(0, cortexCount * 3), nor: cNor.subarray(0, cortexCount * 3), meta: cMeta.subarray(0, cortexCount * 4), arr0: cArr0, arr1: cArr1 },
    neurons: { count: neuronCount, pos: nPos.subarray(0, neuronCount * 3), meta: nMeta.subarray(0, neuronCount * 4), arr0: nArr0, arr1: nArr1 },
    edges: { count: eCount, a: eA, b: eB, meta: eMeta, arA0: eArA0, arA1: eArA1, arB0: eArB0, arB1: eArB1 },
    fibers: { count: fi, a: fA.subarray(0, fi * 3), b: fB.subarray(0, fi * 3), meta: fMeta.subarray(0, fi * 4) },
    glows,
    dust: { count: nD, pos: dPos, meta: dMeta },
    cascades: { reach, period, phase },
  };
}
