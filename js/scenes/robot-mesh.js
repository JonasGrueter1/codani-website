// Szene "robot": Bueste laden und glaetten.
// Grundlage: MakeHuman-Grundmodell (CC0), offline aufbereitet (Targets, Arme gesenkt, zugeschnitten, ARCHITEKTUR-Massstab).
// Datei assets/robot/bust.bin: 'AB01', JSON-Kopf, uint16 Positionen (quantisiert), uint8 Kopf-Gewicht, uint8 Oberarm-
// Gewicht, uint8 Ambient Occlusion (offline per Strahltest gerechnet, Kopf-Flag 'ao'), uint16 Vierecke.
// Hier: Catmull-Clark-Unterteilung (Randregeln fuer offene Kanten), Normalen, BufferGeometry.
//
// Gemeinsamer Zugriff: robot.js, particles-shape.js (Partikel-Bueste) und robot-geometry.js (Kopfform fuer die
// Gehirn-Hardware) brauchen dieselbe Bueste. bustLevel1() laedt sie einmal und glaettet sie einmal (Promise im Cache).

import { FACE_VARIANT, faceStyle, sculptFace } from './robot-face.js';

export const BUST_URL = new URL('../../assets/robot/bust.bin', import.meta.url).href;

let rawP = null;
let l1P = null;
/** Rohnetz (einmal geladen, mit Gesichtsausdruck) */
export function bustRaw() {
  if (!rawP) rawP = loadBust(BUST_URL).then((m) => applyExpression(m, 1, FACE_VARIANT));
  return rawP;
}

/**
 * Gesichtsausdruck: neutral, wach, selbstbewusst (statt muede und traurig). Wirkt auf das Kontrollnetz vor der
 * Glaettung, damit Schale, Partikel und Kopfform dasselbe Gesicht haben.
 *   Oberlid   dreht um die Augenmitte nach oben (Lidrand von etwa einem Drittel der Iris auf ihren oberen Rand)
 *   Unterlid  minimal angehoben (leichte Spannung, wacher Blick)
 *   Mund      Mundwinkel eine Spur angehoben und etwas eingezogen (neutral statt herabhaengend)
 * face: Gesichts-Variante (robot-face.js, ?gesicht=a|b|c), leer = Version 4. Der Worker kennt die Adresse der Seite
 * nicht, darum als Parameter.
 */
export function applyExpression(mesh, amt = 1, face = '') {
  const { pos, nV, lm } = mesh;
  if (!lm || !lm.eyeL || !lm.eyeR) return mesh;
  const lidK = faceStyle(face).lid;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (const e of [lm.eyeL, lm.eyeR]) {
    const side = Math.sign(e[0]) || 1;
    for (let i = 0; i < nV; i++) {
      const x = pos[i * 3] - e[0]; const y = pos[i * 3 + 1] - e[1]; const z = pos[i * 3 + 2] - e[2];
      if (z < -0.02 || Math.abs(x) > 0.2 || Math.abs(y) > 0.2 || Math.hypot(x, y, z) > 0.21) continue;
      const xm = x * side; // < 0 zur Nase hin
      const taper = ss(-0.118, -0.055, xm) * (1 - ss(0.075, 0.135, xm));
      let a = 0;
      if (y > -0.01) a = -0.092 * lidK * ss(-0.01, 0.024, y) * (1 - ss(0.045, 0.14, y));
      else a = -0.034 * ss(-0.01, -0.034, y) * (1 - ss(-0.075, -0.13, y));
      a *= taper * amt;
      if (!a) continue;
      // Drehung um die Achse x durch die Augenmitte (negativ: Punkte vor dem Auge wandern nach oben)
      const c = Math.cos(a); const sn = Math.sin(a);
      pos[i * 3 + 1] = e[1] + y * c - z * sn;
      pos[i * 3 + 2] = e[2] + y * sn + z * c;
    }
  }
  if (lm.mouthLoop && lm.mouthLoop.length) {
    // Mundwinkel: aeusserster Punkt der Mundlinie (symmetrisch)
    const corner = lm.mouthLoop.reduce((b, p) => (Math.abs(p[0]) > Math.abs(b[0]) ? p : b), lm.mouthLoop[0]);
    for (const sx of [-1, 1]) {
      const C = [sx * Math.abs(corner[0]), corner[1], corner[2]];
      for (let i = 0; i < nV; i++) {
        const dx = pos[i * 3] - C[0]; const dy = pos[i * 3 + 1] - C[1]; const dz = pos[i * 3 + 2] - C[2];
        const d2 = (dx * dx) / (0.075 * 0.075) + (dy * dy) / (0.05 * 0.05) + (dz * dz) / (0.06 * 0.06);
        if (d2 > 9) continue;
        const w = Math.exp(-d2) * amt;
        pos[i * 3 + 1] += 0.0075 * w;
        pos[i * 3 + 2] -= 0.003 * w;
      }
    }
  }
  softenFace(mesh, amt);
  sculptFace(mesh, face);
  return mesh;
}

/**
 * Weichere Gesichtsform (Version 4, Rueckmeldung "spitzig, stutzig, die Kieferecken neben der Nase"): Die Bueste hat
 * kantige Wangenknochen und einen breiten, eckigen Kiefer (in der Dreiviertelansicht stehen Jochbein und Kieferwinkel
 * der abgewandten Seite als Ecken neben der Nase). Auf dem Kontrollnetz, vor der Glaettung, damit Schale, Partikel und
 * Kopfform dasselbe Gesicht haben:
 *   1. Kiefer schmaler zum Kinn hin (der Kieferwinkel wandert nach innen, Gesicht ovaler statt eckig)
 *   2. Wangen fuellen (Mulde seitlich der Mundwinkel)
 *   3. Taubin-Glaettung (ohne Schrumpfen) auf Wangen und Kiefer: Kanten am Jochbein und am Kiefer werden runde Flaechen
 * Augen, Nase, Lippen und Ohren bleiben unberuehrt (Gewicht 0 dort, weicher Uebergang).
 */
const SOFTEN_ITERS = 16;
export function softenFace(mesh, amt = 1) {
  const { pos, nV, quads, head, lm } = mesh;
  if (!amt || !quads || !head) return mesh;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const eyes = lm && lm.eyeL ? [lm.eyeL, lm.eyeR] : [[0.304, 0, 0.597], [-0.304, 0, 0.597]];
  // Gewicht pro Ecke: 1 auf Wangen und Kiefer, 0 an Augen, Nase, Mund, Ohr, Schaedel und Hals
  const w = new Float32Array(nV);
  for (let i = 0; i < nV; i++) {
    if (head[i] < 0.5) continue;
    const x = pos[i * 3]; const y = pos[i * 3 + 1]; const z = pos[i * 3 + 2];
    const ax = Math.abs(x);
    let k = ss(-1.12, -0.98, y) * (1 - ss(-0.02, 0.12, y)) * ss(-0.25, 0.05, z);
    if (!k) continue;
    // Augen (nur Lider und Augapfel bleiben, wie applyExpression sie setzt; Jochbein darunter wird geglaettet)
    for (const e of eyes) k *= ss(0.17, 0.25, Math.hypot(x - e[0], (y - e[1]) * 1.25, (z - e[2]) * 0.8));
    // Nase: schmaler Streifen in der Mitte bis unter die Nasenfluegel
    k *= 1 - (1 - ss(0.12, 0.18, ax)) * ss(-0.56, -0.48, y) * ss(0.45, 0.6, z);
    // Lippen
    k *= 1 - (1 - ss(0.17, 0.23, ax)) * ss(-0.76, -0.71, y) * (1 - ss(-0.52, -0.47, y)) * ss(0.55, 0.66, z);
    // Ohr und Ohr-Platte
    k *= 1 - ss(0.6, 0.68, ax) * ss(-0.35, -0.12, -z);
    w[i] = k;
  }

  // 1. Kiefer zum Kinn hin schmaler: x nach innen, staerker aussen und unten (rund 9 % am Kieferwinkel)
  for (let i = 0; i < nV; i++) {
    const x = pos[i * 3]; const y = pos[i * 3 + 1]; const z = pos[i * 3 + 2];
    if (head[i] < 0.5 || z < -0.3) continue;
    const ax = Math.abs(x);
    const t = ss(-0.42, -0.9, y) * ss(0.18, 0.55, ax) * (1 - ss(-0.05, -0.3, z) * 0.5);
    pos[i * 3] = x * (1 - 0.095 * t * amt);
    // Kieferwinkel leicht nach vorne runden (nimmt die Stufe unter der Wange)
    pos[i * 3 + 2] = z + 0.012 * t * ss(0.4, 0.62, ax) * amt;
  }

  // 2. Wangen fuellen: die Mulde seitlich der Mundwinkel (unter dem Jochbein, ueber dem Kiefermuskel) nach vorne und
  //    aussen heben. Sie liess Jochbein und Kieferwinkel als Ecken stehen (hohle, kantige Wangen).
  for (let i = 0; i < nV; i++) {
    if (!w[i]) continue;
    const x = pos[i * 3]; const y = pos[i * 3 + 1]; const z = pos[i * 3 + 2];
    const ax = Math.abs(x);
    const dx = (ax - 0.43) / 0.17; const dy = (y + 0.56) / 0.19;
    const f = Math.exp(-(dx * dx + dy * dy)) * ss(0.2, 0.45, z) * amt;
    if (f < 1e-3) continue;
    const s = Math.sign(x) || 1;
    pos[i * 3] = x + s * 0.012 * f;
    pos[i * 3 + 2] = z + 0.03 * f;
  }

  // 3. Taubin-Glaettung (lambda/mu) nur im Gewicht w: Nachbarn aus den Vierecken
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
      const inv = 1 / L.length;
      const k = f * w[i] * amt;
      tmp[j * 3] = pos[i * 3] + (sx * inv - pos[i * 3]) * k;
      tmp[j * 3 + 1] = pos[i * 3 + 1] + (sy * inv - pos[i * 3 + 1]) * k;
      tmp[j * 3 + 2] = pos[i * 3 + 2] + (sz * inv - pos[i * 3 + 2]) * k;
    }
    for (let j = 0; j < ids.length; j++) {
      const i = ids[j];
      pos[i * 3] = tmp[j * 3]; pos[i * 3 + 1] = tmp[j * 3 + 1]; pos[i * 3 + 2] = tmp[j * 3 + 2];
    }
  };
  for (let it = 0; it < SOFTEN_ITERS; it++) { pass(0.5); pass(-0.53); }
  return mesh;
}
/* Glaettung im Web Worker (robot-mesh-worker.js), damit der Hauptthread frei bleibt. Faellt der Worker aus (alter
   Browser ohne Modul-Worker, Fehler, 9 s ohne Antwort), rechnet der Hauptthread dasselbe selbst. */
function runWorker(msg, transfer = []) {
  return new Promise((resolve, reject) => {
    if (typeof Worker === 'undefined') { reject(new Error('kein Worker')); return; }
    let w;
    try { w = new Worker(new URL('./robot-mesh-worker.js', import.meta.url), { type: 'module' }); } catch (e) { reject(e); return; }
    let to = 0;
    const done = (fn, v) => { clearTimeout(to); w.terminate(); fn(v); };
    to = setTimeout(() => done(reject, new Error('Worker antwortet nicht')), 9000);
    w.onmessage = (ev) => (ev.data && ev.data.error ? done(reject, new Error(ev.data.error)) : done(resolve, ev.data));
    w.onerror = (ev) => { if (ev && ev.preventDefault) ev.preventDefault(); done(reject, new Error('Worker-Fehler')); };
    w.postMessage(msg, transfer);
  });
}
const onMain = (m) => { const s = catmullClark(m); computeNormals(s); return s; };

/** Eine Stufe Catmull-Clark mit Normalen (einmal gerechnet, nur lesen) */
export function bustLevel1() {
  // Die Datei holt der Hauptthread (Preload aus index.html), die Rechnung macht der Worker
  if (!l1P) {
    l1P = fetchBust(BUST_URL).then((buf) => runWorker({ op: 'l1', buf: buf.slice(0), face: FACE_VARIANT }, [])
      .catch(() => onMain(applyExpression(parseBust(buf), 1, FACE_VARIANT))));
  }
  return l1P;
}

let l2P = null;
/** Zweite Stufe (nur Qualitaet high), aus Stufe 1, ebenfalls im Worker. Eigenes Netz, nur lesen. */
export function bustLevel2(l1) {
  if (!l2P) {
    const c = { pos: l1.pos.slice(), head: l1.head.slice(), arm: l1.arm.slice(), ao: l1.ao.slice(), quads: l1.quads.slice(), nV: l1.nV, lm: l1.lm };
    l2P = runWorker({ op: 'cc', mesh: c }, [c.pos.buffer, c.head.buffer, c.arm.buffer, c.ao.buffer, c.quads.buffer]).catch(() => onMain(l1));
  }
  return l2P;
}

/** Laedt die Bueste. Gibt { pos: Float32Array, head: Float32Array, quads: Uint32Array, nV, lm } zurueck. */
export async function loadBust(url) {
  return parseBust(await fetchBust(url));
}
/** Datei holen (im Hauptthread: nutzt den Preload aus index.html) */
export async function fetchBust(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`robot: ${url} fehlt (${res.status})`);
  return res.arrayBuffer();
}
/** Datei lesen */
export function parseBust(buf) {
  const dv = new DataView(buf);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'AB01') throw new Error('robot: falsches Dateiformat');
  const hl = dv.getUint32(4, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
  let o = 8 + hl;
  const { nV, nF, bmin, bmax } = head;
  const q = new Uint16Array(buf, o, nV * 3);
  o += nV * 6;
  const hw = new Uint8Array(buf, o, nV);
  o += nV + ((4 - (nV % 4)) % 4);
  const armW = new Float32Array(nV);
  if (head.arm) {
    const aw = new Uint8Array(buf, o, nV);
    for (let i = 0; i < nV; i++) armW[i] = aw[i] / 255;
    o += nV + ((4 - (nV % 4)) % 4);
  }
  const ao = new Float32Array(nV).fill(1);
  if (head.ao) {
    const a8 = new Uint8Array(buf, o, nV);
    for (let i = 0; i < nV; i++) ao[i] = a8[i] / 255;
    o += nV + ((4 - (nV % 4)) % 4);
  }
  const quads16 = new Uint16Array(buf, o, nF * 4);
  const pos = new Float32Array(nV * 3);
  for (let i = 0; i < nV; i++) {
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = bmin[k] + (q[i * 3 + k] / 65535) * (bmax[k] - bmin[k]);
  }
  const headW = new Float32Array(nV);
  for (let i = 0; i < nV; i++) headW[i] = hw[i] / 255;
  return { pos, head: headW, arm: armW, ao, quads: Uint32Array.from(quads16), nV, lm: head.lm };
}

/** Eine Stufe Catmull-Clark fuer reine Vierecks-Netze. Die Ecken-Attribute head, arm und ao werden mitgeteilt. */
export function catmullClark(mesh) {
  const ao = mesh.ao || new Float32Array(mesh.nV).fill(1);
  const r = ccStep(mesh.pos, [mesh.head, mesh.arm, ao], mesh.quads, mesh.nV);
  return { pos: r.pos, head: r.attrs[0], arm: r.attrs[1], ao: r.attrs[2], quads: r.quads, nV: r.nV, lm: mesh.lm };
}

/** Teilnetz: nur Vierecke, deren Mitte keep(x, y, z, arm) erfuellt (Innenschale, Glas, Muskel-Gel). */
export function subMesh(mesh, keep) {
  const { pos, quads } = mesh;
  const map = new Int32Array(mesh.nV).fill(-1);
  const q = [];
  let n = 0;
  for (let f = 0; f < quads.length; f += 4) {
    let x = 0; let y = 0; let z = 0; let arm = 0;
    for (let k = 0; k < 4; k++) { const v = quads[f + k]; x += pos[v * 3]; y += pos[v * 3 + 1]; z += pos[v * 3 + 2]; arm += mesh.arm[v]; }
    if (!keep(x / 4, y / 4, z / 4, arm / 4)) continue;
    for (let k = 0; k < 4; k++) {
      const v = quads[f + k];
      if (map[v] < 0) map[v] = n++;
      q.push(map[v]);
    }
  }
  const P = new Float32Array(n * 3); const N = new Float32Array(n * 3);
  const H = new Float32Array(n); const A = new Float32Array(n); const O = new Float32Array(n);
  for (let v = 0; v < mesh.nV; v++) {
    const m = map[v];
    if (m < 0) continue;
    for (let k = 0; k < 3; k++) { P[m * 3 + k] = pos[v * 3 + k]; N[m * 3 + k] = mesh.normal[v * 3 + k]; }
    H[m] = mesh.head[v]; A[m] = mesh.arm[v]; O[m] = mesh.ao ? mesh.ao[v] : 1;
  }
  return { pos: P, normal: N, head: H, arm: A, ao: O, quads: Uint32Array.from(q), nV: n, lm: mesh.lm };
}

// Catmull-Clark: Positionen (3 Komponenten) und skalare Attribute (A[k]) in einem Durchgang
function ccStep(pos, A, quads, nV) {
  const nA = A.length;
  const nF = quads.length / 4;
  // Kanten
  const edgeMap = new Map();
  const eV = []; // [a, b]
  const eF = []; // [f0, f1]
  const faceEdges = new Uint32Array(nF * 4);
  for (let f = 0; f < nF; f++) {
    for (let k = 0; k < 4; k++) {
      const a = quads[f * 4 + k];
      const b = quads[f * 4 + ((k + 1) & 3)];
      const key = a < b ? a * 1048576 + b : b * 1048576 + a;
      let e = edgeMap.get(key);
      if (e === undefined) {
        e = eV.length / 2;
        edgeMap.set(key, e);
        eV.push(a, b);
        eF.push(f, -1);
      } else eF[e * 2 + 1] = f;
      faceEdges[f * 4 + k] = e;
    }
  }
  const nE = eV.length / 2;
  const NV = nV + nE + nF;
  const P = new Float32Array(NV * 3);
  const H = A.map(() => new Float32Array(NV));
  const oE = nV;
  const oF = nV + nE;
  // Flaechenpunkte
  for (let f = 0; f < nF; f++) {
    const i = oF + f;
    for (let k = 0; k < 4; k++) {
      const v = quads[f * 4 + k];
      P[i * 3] += pos[v * 3] / 4; P[i * 3 + 1] += pos[v * 3 + 1] / 4; P[i * 3 + 2] += pos[v * 3 + 2] / 4;
      for (let a = 0; a < nA; a++) H[a][i] += A[a][v] / 4;
    }
  }
  // Kantenpunkte
  const boundary = new Uint8Array(nE);
  for (let e = 0; e < nE; e++) {
    const a = eV[e * 2]; const b = eV[e * 2 + 1];
    const f0 = eF[e * 2]; const f1 = eF[e * 2 + 1];
    const i = oE + e;
    if (f1 < 0) {
      boundary[e] = 1;
      for (let k = 0; k < 3; k++) P[i * 3 + k] = (pos[a * 3 + k] + pos[b * 3 + k]) / 2;
      for (let c = 0; c < nA; c++) H[c][i] = (A[c][a] + A[c][b]) / 2;
    } else {
      const F0 = oF + f0; const F1 = oF + f1;
      for (let k = 0; k < 3; k++) P[i * 3 + k] = (pos[a * 3 + k] + pos[b * 3 + k] + P[F0 * 3 + k] + P[F1 * 3 + k]) / 4;
      for (let c = 0; c < nA; c++) H[c][i] = (A[c][a] + A[c][b] + H[c][F0] + H[c][F1]) / 4;
    }
  }
  // Eckpunkte
  const W = 3 + nA;
  const val = new Uint16Array(nV);
  const sumF = new Float32Array(nV * W);
  const sumE = new Float32Array(nV * W);
  const nb = new Uint16Array(nV); // Randkanten
  const bsum = new Float32Array(nV * W);
  const nFace = new Uint16Array(nV);
  for (let f = 0; f < nF; f++) {
    const F = oF + f;
    for (let k = 0; k < 4; k++) {
      const v = quads[f * 4 + k];
      nFace[v]++;
      sumF[v * W] += P[F * 3]; sumF[v * W + 1] += P[F * 3 + 1]; sumF[v * W + 2] += P[F * 3 + 2];
      for (let c = 0; c < nA; c++) sumF[v * W + 3 + c] += H[c][F];
    }
  }
  for (let e = 0; e < nE; e++) {
    const a = eV[e * 2]; const b = eV[e * 2 + 1];
    for (const v of [a, b]) {
      val[v]++;
      for (let k = 0; k < 3; k++) sumE[v * W + k] += (pos[a * 3 + k] + pos[b * 3 + k]) / 2;
      for (let c = 0; c < nA; c++) sumE[v * W + 3 + c] += (A[c][a] + A[c][b]) / 2;
    }
    if (boundary[e]) {
      nb[a]++; nb[b]++;
      for (let k = 0; k < 3; k++) { bsum[a * W + k] += pos[b * 3 + k]; bsum[b * W + k] += pos[a * 3 + k]; }
      for (let c = 0; c < nA; c++) { bsum[a * W + 3 + c] += A[c][b]; bsum[b * W + 3 + c] += A[c][a]; }
    }
  }
  for (let v = 0; v < nV; v++) {
    const n = val[v];
    if (nb[v] === 2) {
      for (let k = 0; k < 3; k++) P[v * 3 + k] = (6 * pos[v * 3 + k] + bsum[v * W + k]) / 8;
      for (let c = 0; c < nA; c++) H[c][v] = (6 * A[c][v] + bsum[v * W + 3 + c]) / 8;
    } else if (nb[v] > 0 || n < 3 || nFace[v] !== n) {
      for (let k = 0; k < 3; k++) P[v * 3 + k] = pos[v * 3 + k];
      for (let c = 0; c < nA; c++) H[c][v] = A[c][v];
    } else {
      const fn = nFace[v];
      for (let k = 0; k < 3; k++) P[v * 3 + k] = (sumF[v * W + k] / fn + 2 * (sumE[v * W + k] / n) + (n - 3) * pos[v * 3 + k]) / n;
      for (let c = 0; c < nA; c++) H[c][v] = (sumF[v * W + 3 + c] / fn + 2 * (sumE[v * W + 3 + c] / n) + (n - 3) * A[c][v]) / n;
    }
  }
  // Neue Vierecke
  const Q = new Uint32Array(nF * 16);
  for (let f = 0; f < nF; f++) {
    const F = oF + f;
    const v0 = quads[f * 4]; const v1 = quads[f * 4 + 1]; const v2 = quads[f * 4 + 2]; const v3 = quads[f * 4 + 3];
    const vv = [v0, v1, v2, v3];
    const e = [oE + faceEdges[f * 4], oE + faceEdges[f * 4 + 1], oE + faceEdges[f * 4 + 2], oE + faceEdges[f * 4 + 3]];
    for (let k = 0; k < 4; k++) {
      const o = f * 16 + k * 4;
      Q[o] = vv[k]; Q[o + 1] = e[k]; Q[o + 2] = F; Q[o + 3] = e[(k + 3) & 3];
    }
  }
  return { pos: P, attrs: H, quads: Q, nV: NV };
}

/** Flaechengewichtete Normalen */
export function computeNormals(mesh, smoothIters = 2) {
  const { pos, quads, nV } = mesh;
  const N = new Float32Array(nV * 3);
  const tri = (a, b, c) => {
    const ax = pos[a * 3]; const ay = pos[a * 3 + 1]; const az = pos[a * 3 + 2];
    const ux = pos[b * 3] - ax; const uy = pos[b * 3 + 1] - ay; const uz = pos[b * 3 + 2] - az;
    const vx = pos[c * 3] - ax; const vy = pos[c * 3 + 1] - ay; const vz = pos[c * 3 + 2] - az;
    const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
    for (const i of [a, b, c]) { N[i * 3] += nx; N[i * 3 + 1] += ny; N[i * 3 + 2] += nz; }
  };
  for (let f = 0; f < quads.length; f += 4) {
    tri(quads[f], quads[f + 1], quads[f + 2]);
    tri(quads[f], quads[f + 2], quads[f + 3]);
  }
  const norm = (A) => {
    for (let i = 0; i < nV; i++) {
      const l = Math.hypot(A[i * 3], A[i * 3 + 1], A[i * 3 + 2]) || 1;
      A[i * 3] /= l; A[i * 3 + 1] /= l; A[i * 3 + 2] /= l;
    }
  };
  norm(N);
  // Normalen glaetten (2 Durchgaenge ueber die Kanten): verhindert Glanzpunkte an Ecken mit Valenz != 4
  const S = new Float32Array(nV * 3); const C = new Float32Array(nV);
  for (let it = 0; it < smoothIters; it++) {
    S.fill(0); C.fill(0);
    for (let f = 0; f < quads.length; f += 4) {
      for (let k = 0; k < 4; k++) {
        const a = quads[f + k]; const b = quads[f + ((k + 1) & 3)];
        S[a * 3] += N[b * 3]; S[a * 3 + 1] += N[b * 3 + 1]; S[a * 3 + 2] += N[b * 3 + 2]; C[a] += 1;
        S[b * 3] += N[a * 3]; S[b * 3 + 1] += N[a * 3 + 1]; S[b * 3 + 2] += N[a * 3 + 2]; C[b] += 1;
      }
    }
    for (let i = 0; i < nV; i++) {
      if (!C[i]) continue;
      N[i * 3] = N[i * 3] + S[i * 3] / C[i];
      N[i * 3 + 1] = N[i * 3 + 1] + S[i * 3 + 1] / C[i];
      N[i * 3 + 2] = N[i * 3 + 2] + S[i * 3 + 2] / C[i];
    }
    norm(N);
  }
  mesh.normal = N;
  return N;
}

/** BufferGeometry (Dreiecke) mit position, normal, aHead. offset: Verschiebung entlang der Normalen. */
export function toGeometry(THREE, mesh, offset = 0) {
  const { pos, quads, nV, head } = mesh;
  const N = mesh.normal || computeNormals(mesh);
  const P = new Float32Array(nV * 3);
  for (let i = 0; i < nV * 3; i++) P[i] = pos[i] + N[i] * offset;
  const nQ = quads.length / 4;
  const idx = nV > 65535 ? new Uint32Array(nQ * 6) : new Uint16Array(nQ * 6);
  for (let f = 0; f < nQ; f++) {
    const a = quads[f * 4]; const b = quads[f * 4 + 1]; const c = quads[f * 4 + 2]; const d = quads[f * 4 + 3];
    // Diagonale entlang der kuerzeren Strecke (weniger Knicke)
    const dac = (pos[a * 3] - pos[c * 3]) ** 2 + (pos[a * 3 + 1] - pos[c * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[c * 3 + 2]) ** 2;
    const dbd = (pos[b * 3] - pos[d * 3]) ** 2 + (pos[b * 3 + 1] - pos[d * 3 + 1]) ** 2 + (pos[b * 3 + 2] - pos[d * 3 + 2]) ** 2;
    const o = f * 6;
    if (dac <= dbd) { idx[o] = a; idx[o + 1] = b; idx[o + 2] = c; idx[o + 3] = a; idx[o + 4] = c; idx[o + 5] = d; } else {
      idx[o] = a; idx[o + 1] = b; idx[o + 2] = d; idx[o + 3] = b; idx[o + 4] = c; idx[o + 5] = d;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N.slice(), 3));
  g.setAttribute('aHead', new THREE.BufferAttribute(head.slice(), 1));
  g.setAttribute('aArm', new THREE.BufferAttribute(mesh.arm.slice(), 1));
  g.setAttribute('aAO', new THREE.BufferAttribute(mesh.ao ? mesh.ao.slice() : new Float32Array(nV).fill(1), 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}
