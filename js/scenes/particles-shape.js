// Szene "particles": Zielpunkte der Partikel-Bueste (Hero) und des Partikel-Aufbaus im Beat robot.
// Form der Android-Bueste der Szene "robot": Punkte auf der Bueste (assets/robot/bust.bin), Linien entlang der
// Gesichtsplatten, Lidfalten und Plattenkanten, helle Punkte in den Pupillen (Art "eye", leuchtet am staerksten),
// Sensormodule, Hals-Mechanik und das Kabelbuendel im Nacken.
// Die Bueste kommt aus robot-mesh.js (einmal geladen und geglaettet, top-level await), sampleRobot bleibt synchron.
// Gesicht und Figur folgen robot-face.js (Standard D: eine Gesichtsplatte, schlankerer Rumpf; ?gesicht=alt Version 4).
import { bustLevel1 } from './robot-mesh.js';
import { LAYOUT } from './robot-layout.js';
import { FACE_STYLE } from './robot-face.js';

// cable (1.25) zaehlt im Shader als Linie, fliesst im Hero aber langsam nach hinten weg (Kabel aus dem Hinterkopf)
export const KIND = Object.freeze({ surface: 0, line: 1, cable: 1.25, eye: 2, dust: 3, far: 4 });

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

const BUST = await bustLevel1().catch(() => null);

/** Drehpunkt des Kopfs (Hals), gleich wie in robot.js, damit Partikel-Kopf und fester Kopf deckungsgleich drehen */
export const HEAD_PIVOT = BUST ? BUST.lm.headPivot.slice() : [0, -0.3, -0.09];

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ------------------------------------- Linien (JS-Fassung der Felder aus robot-layout.js) */
const segD = (px, py, ax, ay, bx, by) => {
  const vx = bx - ax; const vy = by - ay;
  const h = clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy), 0, 1);
  return Math.hypot(px - ax - vx * h, py - ay - vy * h);
};
// Gesichtsplatten wie robot-layout.js lFaceSeams: Stirnbogen und seitliche Wangenfuge (Version 4: flacher Bogen).
// Gesicht D (Standard, robot-face.js) hat eine einzige Gesichtsplatte ohne diese Fugen: dann nur Maske und Lidfalte.
const V4_SEAMS = FACE_STYLE.seams === 'v4';
const faceSeams = (x, y) => {
  const fh = Math.abs(y - (0.262 - 0.11 * x * x));
  const t = clamp(-y / 0.95, 0, 1);
  const ck = Math.max(Math.abs(x - (0.668 - 0.2 * t * t)), y - 0.2);
  return Math.min(fh, ck);
};
// Hinterkopf-Oeffnung wie robot-layout.js lSkullWin (Ellipse in Bogenlaenge ab hinten und y)
const SKW = LAYOUT.skull;
const skullWin = (x, y, z) => {
  const u = (Math.PI - Math.atan2(x, z)) * Math.hypot(x, z);
  return (Math.hypot(u / SKW.a, (y - SKW.yc) / SKW.b) - 1) * Math.min(SKW.a, SKW.b);
};
const lJaw = (x, y, z) => -(y + 0.62 + 0.63 * (z - 0.05)) / 1.183;
const smax = (a, b, k) => { const h = clamp(0.5 - 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h + k * h * (1 - h); };
const lFace = (x, y, z) => {
  const A = y - (0.56 - 0.5 * x * x);
  const rxz = Math.hypot(x, z);
  const th = Math.atan2(x, z);
  const ths = 1.2 + 0.36 * smoothstep(-0.12, -0.62, y);
  return smax(smax(A, (th - ths) * rxz, 0.11), lJaw(x, y, z), 0.1);
};
/** Abstand zur naechsten Linie am Kopf (Maske, Stirn- und Wangenfuge, Lidfalte, Scheitelnaht, Rand der Oeffnung) */
function headLine(px, y, z) {
  const x = Math.abs(px);
  let d = 9;
  const face = lFace(x, y, z);
  if (y > -1.15 && y > -0.75 - 0.6 * Math.max(z, 0)) d = Math.min(d, Math.abs(face));
  if (z > 0.12 && face < 0.05) {
    if (V4_SEAMS) d = Math.min(d, Math.max(faceSeams(x, y), face));
    const ex = (x - 0.3) / 0.15; const ey = (y + 0.012) / 0.078;
    if (y > 0.0) d = Math.min(d, Math.abs(Math.hypot(ex, ey) - 1) * 0.08);
  }
  const win = skullWin(x, y, z);
  if (face > 0 && win > 0.05) d = Math.min(d, x);
  if (y > -0.66) d = Math.min(d, Math.abs(win));
  return d;
}
/** Abstand zu Plattenkanten am Rumpf: Schluesselbein-Spangen, Bogen der Brustplatte, Schulterring */
function torsoLine(px, y, z) {
  const x = Math.abs(px);
  let d = 9;
  if (z > -0.25) {
    const cy = -1.66 - 0.16 * (x - 0.12) + 0.035 * Math.sin((x - 0.12) * 2.8);
    if (x > 0.13 && x < 1.26) d = Math.min(d, Math.abs(Math.abs(y - cy) - 0.05));
    if (px < 0 && x > 0.02 && x < 1.1) d = Math.min(d, Math.abs(Math.hypot(x - LAYOUT.pecC[0], y - LAYOUT.pecC[1]) - LAYOUT.pecR));
  }
  const S = LAYOUT.shoulder; const ad = LAYOUT.armDir;
  const rx = x - S[0]; const ry = y - S[1]; const rz = z - S[2];
  const ta = rx * ad[0] + ry * ad[1] + rz * ad[2];
  const rr = Math.hypot(rx - ad[0] * ta, ry - ad[1] * ta, rz - ad[2] * ta);
  if (rr < 0.6 && x > 1.0) d = Math.min(d, Math.abs(ta - LAYOUT.ringAt));
  return d;
}

/* ------------------------------------------------------------ Flaechen-Abtaster */
function makeSurface(mesh, keep) {
  const { pos, normal, head, quads } = mesh;
  const tris = [];
  const cum = [];
  let acc = 0;
  for (let f = 0; f < quads.length; f += 4) {
    for (const [a, b, c] of [[0, 1, 2], [0, 2, 3]]) {
      const i = quads[f + a]; const j = quads[f + b]; const k = quads[f + c];
      const cx = (pos[i * 3] + pos[j * 3] + pos[k * 3]) / 3;
      const cy = (pos[i * 3 + 1] + pos[j * 3 + 1] + pos[k * 3 + 1]) / 3;
      const cz = (pos[i * 3 + 2] + pos[j * 3 + 2] + pos[k * 3 + 2]) / 3;
      if (!keep(cx, cy, cz)) continue;
      const ux = pos[j * 3] - pos[i * 3]; const uy = pos[j * 3 + 1] - pos[i * 3 + 1]; const uz = pos[j * 3 + 2] - pos[i * 3 + 2];
      const vx = pos[k * 3] - pos[i * 3]; const vy = pos[k * 3 + 1] - pos[i * 3 + 1]; const vz = pos[k * 3 + 2] - pos[i * 3 + 2];
      acc += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
      tris.push(i, j, k);
      cum.push(acc);
    }
  }
  return (rnd, o) => {
    const t = rnd() * acc;
    let lo = 0; let hi = cum.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < t) lo = m + 1; else hi = m; }
    const i = tris[lo * 3]; const j = tris[lo * 3 + 1]; const k = tris[lo * 3 + 2];
    let u = rnd(); let v = rnd();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const w = 1 - u - v;
    for (let a = 0; a < 3; a++) {
      o.p[a] = pos[i * 3 + a] * w + pos[j * 3 + a] * u + pos[k * 3 + a] * v;
      o.n[a] = normal[i * 3 + a] * w + normal[j * 3 + a] * u + normal[k * 3 + a] * v;
    }
    const l = Math.hypot(o.n[0], o.n[1], o.n[2]) || 1;
    o.n[0] /= l; o.n[1] /= l; o.n[2] /= l;
    o.h = head[i] * w + head[j] * u + head[k] * v;
  };
}

/**
 * Zielpunkte der Android-Bueste. Signatur wie bisher (robotGeo und Sampler werden nicht mehr gebraucht).
 * Rueckgabe: { pos, nrm, kind, vis, order, hw }
 */
export function sampleRobot(THREE, A, count, rnd) {
  const out = {
    pos: new Float32Array(count * 3), nrm: new Float32Array(count * 3), kind: new Float32Array(count),
    vis: new Float32Array(count), order: new Float32Array(count), hw: new Float32Array(count),
  };
  let n = 0;
  // Gesicht D: Rumpf schlanker wie robot-materials.js abSlim (ab dem Hals nach unten schmaler und etwas flacher)
  const slim = FACE_STYLE.slim;
  const put = (p, nr, kind, hw) => {
    if (n >= count) return;
    if (slim > 0 && p[1] < -1.2) {
      const k = slim * smoothstep(-1.2, -2.05, p[1]);
      p = [p[0] * (1 - k), p[1], -0.3 + (p[2] + 0.3) * (1 - 0.4 * k)];
    }
    out.pos.set(p, n * 3); out.nrm.set(nr, n * 3);
    out.kind[n] = kind;
    out.vis[n] = smoothstep(-3.25, -2.35, p[1]);
    out.order[n] = clamp((p[1] + 3.6) / 4.65, 0, 1);
    out.hw[n] = hw;
    n++;
  };
  if (!BUST) {
    // Rueckfall ohne Netz: Ellipsoid-Kopf und Schulterbogen
    for (let i = 0; i < count; i++) {
      const u = rnd() * 2 - 1; const a = rnd() * Math.PI * 2; const s = Math.sqrt(1 - u * u);
      const head = i < count * 0.4;
      const p = head ? [Math.cos(a) * s * 0.78, u, Math.sin(a) * s * 0.9] : [Math.cos(a) * s * 2.0, -2.4 + u * 0.8, Math.sin(a) * s * 0.8];
      put(p, [Math.cos(a) * s, u, Math.sin(a) * s], KIND.surface, head ? 1 : 0);
    }
    return out;
  }
  const lm = BUST.lm;
  const o = { p: [0, 0, 0], n: [0, 0, 0], h: 0 };
  const neckOpen = (x, y, z) => (y < -0.66 && y > -1.5 && Math.hypot(x, z + 0.22) < 0.5 && lJaw(Math.abs(x), y, z) > 0)
    || (y > -0.66 && z < 0.1 && skullWin(Math.abs(x), y, z) < 0);
  const headS = makeSurface(BUST, (x, y, z) => y > -1.1 && !neckOpen(x, y, z));
  const torsoS = makeSurface(BUST, (x, y, z) => y <= -1.1 && !neckOpen(x, y, z));
  const counts = { head: 0.25, headLines: 0.095, eyes: 0.004, ears: 0.016, neck: 0.065, torso: 0.42, torsoLines: 0.066, cables: 0.06 };
  const N = {};
  let sum = 0;
  for (const [k, v] of Object.entries(counts)) { N[k] = Math.floor(count * v); sum += N[k]; }
  N.torso += count - sum;

  for (let i = 0; i < N.head; i++) { headS(rnd, o); put(o.p, o.n, KIND.surface, o.h); }
  // Linien am Kopf (Rueckweisung: nur Punkte nahe einer Fuge)
  for (let i = 0, tries = 0; i < N.headLines && tries < N.headLines * 80; tries++) {
    headS(rnd, o);
    if (headLine(o.p[0], o.p[1], o.p[2]) > 0.007) continue;
    put(o.p, o.n, KIND.line, o.h); i++;
  }
  // Augen: Iris-Ring und Pupille
  for (let i = 0; i < N.eyes; i++) {
    const e = i % 2 ? lm.eyeL : lm.eyeR;
    const a = rnd() * Math.PI * 2;
    // Iris nur als feine Flaeche (keine helle Ringlinie: sonst wirken die Augen wie eine Taucherbrille), Pupille ruhig
    const ringPt = rnd() < 0.6;
    const r = ringPt ? 0.02 + Math.sqrt(rnd()) * 0.04 : Math.sqrt(rnd()) * 0.014;
    const z = Math.sqrt(Math.max(0, 0.128 * 0.128 - r * r));
    put([e[0] + Math.cos(a) * r, e[1] - 0.01 + Math.sin(a) * r, e[2] - 0.004 + z], [0, 0, 1], ringPt ? KIND.surface : KIND.eye, 1);
  }
  // Sensormodule an den Ohren: Chrom-Ring und Rand
  const ears = lm.ears || [];
  for (let i = 0; i < N.ears && ears.length; i++) {
    const e = ears[i % ears.length];
    const nx = e.n[0] * Math.sign(e.c[0] * e.n[0] || 1); const ny = e.n[1]; const nz = e.n[2];
    const ax = [0, 1, 0]; const t1 = [ny * ax[2] - nz * ax[1], nz * ax[0] - nx * ax[2], nx * ax[1] - ny * ax[0]];
    const l1 = Math.hypot(...t1); t1[0] /= l1; t1[1] /= l1; t1[2] /= l1;
    const t2 = [ny * t1[2] - nz * t1[1], nz * t1[0] - nx * t1[2], nx * t1[1] - ny * t1[0]];
    const r = rnd() < 0.55 ? 0.1 : (e.rmax || 0.18) + 0.02;
    const a = rnd() * Math.PI * 2;
    const c = Math.cos(a) * r; const s = Math.sin(a) * r;
    put([e.c[0] + t1[0] * c + t2[0] * s + nx * 0.03, e.c[1] + t1[1] * c + t2[1] * s + ny * 0.03, e.c[2] + t1[2] * c + t2[2] * s + nz * 0.03], [nx, ny, nz], KIND.line, 1);
  }
  // Hals: Mechanik als Zylinder (Gehaeuse), Kopfwender als Linien vom Ohr zum Brustbein
  const zn = (y) => -0.21 - 0.12 * clamp(-1 - y, -0.4, 0.6);
  const neckW = (y) => smoothstep(-1.45, -0.62, y);
  for (let i = 0; i < N.neck; i++) {
    if (i % 3 === 0) {
      const sx = rnd() < 0.5 ? -1 : 1; const t = rnd();
      const p = [sx * (0.46 + (0.08 - 0.46) * t), -0.48 + (-1.66 + 0.48) * t, -0.2 + 0.16 * t + 0.1 * Math.sin(Math.PI * t)];
      put(p, [sx, 0, 0.4], KIND.line, neckW(p[1]));
    } else {
      const y = -0.62 - rnd() * 0.95; const a = rnd() * Math.PI * 2;
      const p = [Math.sin(a) * 0.22, y, zn(y) + Math.cos(a) * 0.17];
      put(p, [Math.sin(a), 0, Math.cos(a)], KIND.surface, neckW(y));
    }
  }
  for (let i = 0; i < N.torso; i++) {
    torsoS(rnd, o);
    if (rnd() > 0.3 + 0.7 * smoothstep(-3.25, -2.35, o.p[1])) { i--; continue; }
    put(o.p, o.n, KIND.surface, o.h);
  }
  for (let i = 0, tries = 0; i < N.torsoLines && tries < N.torsoLines * 80; tries++) {
    torsoS(rnd, o);
    if (torsoLine(o.p[0], o.p[1], o.p[2]) > 0.008) continue;
    put(o.p, o.n, KIND.line, o.h); i++;
  }
  // Kabelfaecher wie in robot-mech.js: vier Steckerleisten am Hinterhaupt (y -0.47), von dort nach hinten und unten
  // aufgefaechert (Durchhang), unten im Schlitz zwischen den Schulterblaettern wieder zusammen
  const CX = [-0.27, -0.09, 0.09, 0.27];
  // wie robot-mech.js (Runde 2): Faecher mit Lagen, aussen grosser Bogen nach hinten, Gruppen verschieden lang
  const BOW = [0.95, 0.7, 1.15, 1.0];
  const END = [-1.7, -1.52, -1.9, -1.62];
  const neckBack = (y) => -0.92 + 0.3 * smoothstep(-0.3, -0.8, y) - 0.05 * smoothstep(-1.2, -1.8, y);
  for (let i = 0; i < N.cables; i++) {
    const g = i % 4; const f = rnd() * 2 - 1; const t = Math.pow(rnd(), 0.85);
    const L = rnd();
    const yEnd = Math.max(-2.12, END[g] - 0.3 * L);
    const y = -0.47 + (yEnd + 0.47) * t;
    const xFan = CX[g] * 1.75 + f * (0.06 + 0.05 * Math.abs(CX[g]) / 0.27);
    let x = CX[g] + f * 0.06 + (xFan - CX[g] - f * 0.06) * smoothstep(0, 0.42, t);
    x += (Math.max(-0.22, Math.min(0.22, xFan * 0.5)) - x) * smoothstep(0.45, 1, t);
    const bow = (0.04 + 0.72 * Math.pow(L, 1.3)) * BOW[g];
    const z0 = -0.84;
    const skin = neckBack(y);
    const zEnd = neckBack(yEnd) - 0.02;
    const z = Math.min(z0 + (zEnd - z0) * smoothstep(0.2, 1, t) - bow * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.52)), 0.8), skin - 0.02);
    put([x, y, z], [Math.sign(x) * 0.3, 0.2, -1], KIND.cable, y > -0.62 ? 1 : neckW(y));
  }
  while (n < count) { headS(rnd, o); put(o.p, o.n, KIND.surface, o.h); }
  return out;
}
