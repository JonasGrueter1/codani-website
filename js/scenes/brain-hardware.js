// Szene "brain": Gehirn-Hardware. Das Gehirn schwebt nicht mehr frei, es liegt in einer Wiege aus Titan.
//
// Aufbau (lokale Koordinaten des Gehirns: Ursprung = ANCHORS.brain.center, alles an die echte Form angepasst):
//   Wiegenring   Superellipse um die Hirnunterseite (Hoehe y -0.22), Goldkontakte mit Lauflicht, dunkle Nut
//   Spanten      7 U-Boegen unter dem Gehirn (Erleichterungsloecher), Kiel, 2 Laengstraeger mit Knotenbloecken
//   Buegel       ueber dem Laengsspalt von vorne nach hinten, 5 Elektroden-Draehte haengen in den Spalt
//   Klammern     6 Arme vom Ring an die Hirnseite, Gummipolster mit Kontaktring (leuchtet bei Erregungswellen)
//   Streben      4 Rohre zur Innenschale des Kopfes, 2 zu den Ohrmodulen, Gummipuffer, Flansche mit Schrauben
//   Stammsaeule  vom Kiel in den Hals (neck.top), Rueckenmark-Kabel dahinter
//   Rundstecker  am Kabelaustritt (ANCHORS.cableRoot): Raendelring, 5 Buchsen, aus denen die Kabel kommen
//   Platinen     2 Schlaefenplatinen, 1 Rueckplatine (Leiterbahnen, flache Module ohne Aufdruck, LEDs; seit Runde 2
//                ohne Luefter, Kuehlrippen und Heatpipes: die Bauteiltypen bleiben im Baukasten, kein Layout nutzt sie)
//   Kabel        12 Elektroden-Kabel in die Rinde (Lichtpaket vom Gehirn zur Platine), 3 geflochtene Stamm-Buendel,
//                Flachbandkabel von der Optik-Platine zwischen den Augen zum Ring
// Ein Draw Call fuer alle festen Teile (brain-hw-shaders.js), einer fuer die Leuchtpunkte.
import { makeBrainProbe, ARR_SCALE, CASCADES } from './brain-build.js';
import { KIND, makeHardwareMaterial, makeGlowMaterial } from './brain-hw-shaders.js';
import { boardLayouts, buildAtlas, REGIONS, ATLAS_SIZE } from './brain-hw-atlas.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Farb-Tokens der Hardware (Konzept V2, Kapitel 1.2). Stehen sie in HEX/palette, gelten diese Werte.
const TOKENS = {
  titanium: 0x8e969e, graphite: 0x1b2129, rubber: 0x0b0d10, pcb: 0x0c1620, gold: 0xd4a457, alu: 0xb9c0c6, copper: 0xb87346,
};

/* =================================================================== Geometrie-Sammler */
class Builder {
  constructor(THREE) {
    this.T = THREE;
    this.pos = []; this.nor = []; this.col = []; this.pbr = []; this.atl = []; this.idx = [];
    this.n = 0;
    this.v0 = new THREE.Vector3(); this.v1 = new THREE.Vector3(); this.m3 = new THREE.Matrix3();
  }
  vert(p, n, M, u = 0, w = 0, idx = M.i || 0) {
    this.pos.push(p.x, p.y, p.z);
    this.nor.push(n.x, n.y, n.z);
    this.col.push(M.c.r, M.c.g, M.c.b);
    this.pbr.push(M.m, M.r, M.k, idx);
    this.atl.push(u, w);
    return this.n++;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  // three-Geometrie uebernehmen. M: Material oder fn(gruppe, p0) -> Material. uvf(u, v, gruppe, p0) -> [u, v]
  geo(g, mat4, M, uvf = null) {
    const THREE = this.T;
    const src = g.index ? g.toNonIndexed() : g;
    const P = src.attributes.position; const N = src.attributes.normal; const UV = src.attributes.uv;
    this.m3.getNormalMatrix(mat4);
    const groups = src.groups.length ? src.groups : [{ start: 0, count: P.count, materialIndex: 0 }];
    const p0 = new THREE.Vector3();
    for (const gr of groups) {
      for (let i = gr.start; i < gr.start + gr.count; i += 3) {
        p0.fromBufferAttribute(P, i);
        const mat = typeof M === 'function' ? M(gr.materialIndex, p0) : M;
        if (!mat) continue;
        const ids = [];
        for (let j = 0; j < 3; j++) {
          p0.fromBufferAttribute(P, i + j);
          this.v0.copy(p0).applyMatrix4(mat4);
          this.v1.fromBufferAttribute(N, i + j).applyMatrix3(this.m3).normalize();
          let u = UV ? UV.getX(i + j) : 0; let w = UV ? UV.getY(i + j) : 0;
          if (uvf) [u, w] = uvf(u, w, gr.materialIndex, p0);
          ids.push(this.vert(this.v0, this.v1, mat, u, w));
        }
        this.tri(ids[0], ids[1], ids[2]);
      }
    }
    if (src !== g) src.dispose();
    g.dispose();
  }
  // Profil entlang eines Pfades. P: Vector3[], F: { N: Vector3[], B: Vector3[] }, prof: [{x, y, nx, ny, s}] (geschlossen)
  sweep(P, F, prof, M, o = {}) {
    const THREE = this.T;
    const { closed = false, caps = true, uvy = null, idx = M.i || 0 } = o;
    const n = P.length; const m = prof.length;
    const arc = [0];
    for (let i = 1; i < n; i++) arc.push(arc[i - 1] + P[i].distanceTo(P[i - 1]));
    const uvx = o.uvx || ((i) => arc[i]);
    const base = this.n;
    const p = new THREE.Vector3(); const nn = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        const q = prof[j];
        p.copy(P[i]).addScaledVector(F.N[i], q.x).addScaledVector(F.B[i], q.y);
        nn.copy(F.N[i]).multiplyScalar(q.nx).addScaledVector(F.B[i], q.ny).normalize();
        this.vert(p, nn, M, uvx(i), uvy ? uvy(q, j) : q.s, idx);
      }
    }
    const rows = closed ? n : n - 1;
    for (let i = 0; i < rows; i++) {
      const i1 = (i + 1) % n;
      for (let j = 0; j < m; j++) {
        const j1 = (j + 1) % m;
        const a = base + i * m + j; const b = base + i1 * m + j; const c = base + i1 * m + j1; const d = base + i * m + j1;
        this.tri(a, b, c); this.tri(a, c, d);
      }
    }
    if (!closed && caps) {
      for (const end of [0, n - 1]) {
        const T = new THREE.Vector3().subVectors(P[end === 0 ? 1 : n - 1], P[end === 0 ? 0 : n - 2]).normalize();
        if (end === 0) T.negate();
        const cIdx = this.vert(P[end], T, M, uvx(end), 0, idx);
        const first = this.n;
        for (let j = 0; j < m; j++) {
          const q = prof[j];
          p.copy(P[end]).addScaledVector(F.N[end], q.x).addScaledVector(F.B[end], q.y);
          this.vert(p, T, M, uvx(end), q.s, idx);
        }
        for (let j = 0; j < m; j++) this.tri(cIdx, first + j, first + ((j + 1) % m));
      }
    }
    return arc[n - 1];
  }
  // Alle Dreiecke so drehen, dass sie zur Vertex-Normale passen (Vorderseite aussen)
  orient() {
    const P = this.pos; const N = this.nor; const I = this.idx;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3; const b = I[t + 1] * 3; const c = I[t + 2] * 3;
      const ux = P[b] - P[a]; const uy = P[b + 1] - P[a + 1]; const uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a]; const vy = P[c + 1] - P[a + 1]; const vz = P[c + 2] - P[a + 2];
      const fx = uy * vz - uz * vy; const fy = uz * vx - ux * vz; const fz = ux * vy - uy * vx;
      const sx = N[a] + N[b] + N[c]; const sy = N[a + 1] + N[b + 1] + N[c + 1]; const sz = N[a + 2] + N[b + 2] + N[c + 2];
      if (fx * sx + fy * sy + fz * sz < 0) { const tmp = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = tmp; }
    }
  }
  toGeometry() {
    const THREE = this.T;
    this.orient();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aPbr', new THREE.Float32BufferAttribute(this.pbr, 4));
    g.setAttribute('aAtl', new THREE.Float32BufferAttribute(this.atl, 2));
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
}

/* =================================================================== Profile und Rahmen */
// Abgerundetes Rechteck: w entlang N (x), h entlang B (y). s = Umfang in Einheiten
function rrect(w, h, r, seg = 2) {
  const out = [];
  const cx = w / 2 - r; const cy = h / 2 - r;
  const corners = [[cx, cy, 0], [-cx, cy, Math.PI / 2], [-cx, -cy, Math.PI], [cx, -cy, Math.PI * 1.5]];
  for (const [x0, y0, a0] of corners) {
    for (let k = 0; k <= seg; k++) {
      const a = a0 + (k / seg) * (Math.PI / 2);
      out.push({ x: x0 + Math.cos(a) * r, y: y0 + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) });
    }
  }
  let s = 0;
  out.forEach((q, i) => {
    if (i > 0) s += Math.hypot(q.x - out[i - 1].x, q.y - out[i - 1].y);
    q.s = s;
  });
  return out;
}
function circle(r, seg) {
  const out = [];
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2;
    out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a), s: a * r });
  }
  return out;
}
// Ebene Kurve: B = Ebenen-Normale, N zeigt von `center` weg (bzw. weg von der Seite, auf der center liegt)
function planarFrames(THREE, P, planeN, center) {
  const N = []; const B = [];
  const T = new THREE.Vector3(); const d = new THREE.Vector3();
  for (let i = 0; i < P.length; i++) {
    T.subVectors(P[Math.min(P.length - 1, i + 1)], P[Math.max(0, i - 1)]).normalize();
    const n = new THREE.Vector3().crossVectors(T, planeN).normalize();
    if (center && n.dot(d.subVectors(P[i], center)) < 0) n.negate();
    N.push(n);
    B.push(planeN.clone());
  }
  return { N, B };
}
// Rotationsminimierende Rahmen (Double Reflection) fuer beliebige Kurven
function rmfFrames(THREE, P, up = null) {
  const n = P.length;
  const T = P.map((p, i) => new THREE.Vector3().subVectors(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)]).normalize());
  const N = new Array(n); const B = new Array(n);
  const a = up ? up.clone() : (Math.abs(T[0].y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0));
  N[0] = a.addScaledVector(T[0], -a.dot(T[0])).normalize();
  B[0] = new THREE.Vector3().crossVectors(T[0], N[0]);
  const v1 = new THREE.Vector3(); const rL = new THREE.Vector3(); const tL = new THREE.Vector3(); const v2 = new THREE.Vector3();
  for (let i = 0; i < n - 1; i++) {
    v1.subVectors(P[i + 1], P[i]);
    const c1 = v1.dot(v1) || 1e-12;
    rL.copy(N[i]).addScaledVector(v1, (-2 / c1) * v1.dot(N[i]));
    tL.copy(T[i]).addScaledVector(v1, (-2 / c1) * v1.dot(T[i]));
    v2.subVectors(T[i + 1], tL);
    const c2 = v2.dot(v2) || 1e-12;
    N[i + 1] = rL.clone().addScaledVector(v2, (-2 / c2) * v2.dot(rL)).normalize();
    B[i + 1] = new THREE.Vector3().crossVectors(T[i + 1], N[i + 1]);
  }
  return { N, B };
}
// Glatte Kurve durch Stuetzpunkte (Catmull-Rom, gleichmaessig nach Bogenlaenge)
function smoothPath(THREE, pts, count) {
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  return c.getSpacedPoints(count - 1);
}
function smoothArr(a, passes = 2, closed = false) {
  let x = a.slice();
  const n = x.length;
  for (let p = 0; p < passes; p++) {
    const y = x.slice();
    for (let i = 0; i < n; i++) {
      const i0 = closed ? (i - 1 + n) % n : Math.max(0, i - 1);
      const i1 = closed ? (i + 1) % n : Math.min(n - 1, i + 1);
      y[i] = (x[i0] + 2 * x[i] + x[i1]) / 4;
    }
    x = y;
  }
  return x;
}
function dilate(a, k, closed = false) {
  const n = a.length;
  return a.map((_, i) => {
    let m = -Infinity;
    for (let j = -k; j <= k; j++) {
      const q = closed ? (i + j + n) % n : Math.min(n - 1, Math.max(0, i + j));
      m = Math.max(m, a[q]);
    }
    return m;
  });
}

/* =================================================================== Hauptfunktion (rein, ohne DOM) */
/**
 * Baut die Hardware-Geometrie. Alle Positionen lokal zum Gehirn.
 * o: { THREE, R, C (brain.center Welt), root (lokal), neckTop (lokal), headShape (Welt), palette, q, seg }
 */
export function buildHardware(o) {
  const { THREE, R, C, root, neckTop, headShape, palette } = o;
  const q = o.seg ?? 1;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const S = (n, min = 3) => Math.max(min, Math.round(n * q));
  const probe = makeBrainProbe(R, root);
  const B = new Builder(THREE);
  const glows = []; // [x, y, z, size, r, g, b, mode, idx]
  const info = { elec: [], cables: [], pads: [], wires: [] };

  /* ---------- Materialien */
  const col = (k) => (palette[k] ? palette[k].clone() : new THREE.Color(TOKENS[k]));
  const cTi = col('titanium'); const cGr = col('graphite'); const cRb = col('rubber'); const cPcb = col('pcb');
  const cAu = col('gold'); const cAl = col('alu'); const cCu = col('copper');
  const mat = (c, m, r, k = KIND.PLAIN, i = 0) => ({ c, m, r, k, i });
  const TI = mat(cTi, 1, 0.38, KIND.BRUSH);
  const TIP = mat(cTi, 1, 0.42);
  const TID = mat(cTi.clone().multiplyScalar(0.5), 1, 0.48);
  const GR = mat(cGr, 0, 0.6);
  const RB = mat(cRb, 0, 0.82);
  const AU = mat(cAu, 1, 0.24);
  const AL = mat(cAl, 1, 0.34, KIND.BRUSH);
  const CU = mat(cCu, 1, 0.26);
  const EP = mat(cGr.clone().multiplyScalar(0.55), 0, 0.42);
  const PCB_EDGE = mat(cPcb.clone().lerp(cAu, 0.22), 0, 0.6);
  const PCB_BACK = mat(cPcb.clone(), 0, 0.4);
  const sig = palette.signal; const ember = palette.ember; const ice = palette.ice;

  /* ---------- Kopf-Innenschale (Welt): Strahl bis zur Schale */
  const tmpO = { x: 0, y: 0, z: 0 };
  const shellK = 0.962;
  const insideHead = (p) => {
    const l = p.length();
    if (l < 1e-6) return true;
    headShape(p.x / l, p.y / l, p.z / l, tmpO);
    return l < Math.hypot(tmpO.x, tmpO.y, tmpO.z) * shellK;
  };
  const toShell = (originL, dirL) => {
    // origin lokal, Rueckgabe lokal: erster Austritt aus der Innenschale
    const w = originL.clone().add(C);
    const d = dirL.clone().normalize();
    const p = new THREE.Vector3();
    let t = 0;
    while (t < 2) {
      p.copy(w).addScaledVector(d, t);
      if (!insideHead(p)) break;
      t += 0.004;
    }
    let a = Math.max(0, t - 0.004); let b = t;
    for (let i = 0; i < 10; i++) {
      const m = (a + b) / 2;
      p.copy(w).addScaledVector(d, m);
      if (insideHead(p)) a = m; else b = m;
    }
    return w.addScaledVector(d, a).sub(C);
  };
  const shellNormal = (pL) => {
    const e = 0.01;
    const w = pL.clone().add(C);
    const f = (x, y, z) => {
      const v = V(x, y, z); const l = v.length();
      headShape(v.x / l, v.y / l, v.z / l, tmpO);
      return l / (Math.hypot(tmpO.x, tmpO.y, tmpO.z) * shellK);
    };
    return V(f(w.x + e, w.y, w.z) - f(w.x - e, w.y, w.z), f(w.x, w.y + e, w.z) - f(w.x, w.y - e, w.z),
      f(w.x, w.y, w.z + e) - f(w.x, w.y, w.z - e)).normalize();
  };

  /* ---------- Hilfen fuer Kleinteile */
  const Y = V(0, 1, 0);
  const qAlign = (from, to) => new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
  const m4 = (pos, quat, scl = V(1, 1, 1)) => new THREE.Matrix4().compose(pos, quat, scl);
  const cyl = (p, axis, r0, r1, h, M, seg = 16, uvMap = null) => {
    const g = new THREE.CylinderGeometry(r1, r0, h, seg > 6 ? Math.max(6, Math.round(seg * Math.min(1, q * 1.2))) : seg, 1, false);
    B.geo(g, m4(p, qAlign(Y, axis)), M, uvMap);
  };
  const box = (p, xAxis, yAxis, sx, sy, sz, M, uvf = null) => {
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
    const mtx = new THREE.Matrix4().makeBasis(xAxis.clone().normalize(), yAxis.clone().normalize(), zAxis).setPosition(p);
    mtx.scale(V(sx, sy, sz));
    B.geo(new THREE.BoxGeometry(1, 1, 1), mtx, M, uvf);
  };
  const bolt = (p, n, r = 0.0065) => {
    cyl(p.clone().addScaledVector(n, 0.0006), n, r * 1.3, r * 1.3, 0.0012, TID, 12);
    cyl(p.clone().addScaledVector(n, 0.0026), n, r, r, 0.003, TIP, 6);
  };
  const tube = (pts, r, M, o2 = {}) => {
    const seg = o2.seg ?? S(8, 5);
    const F = rmfFrames(THREE, pts, o2.up || null);
    return B.sweep(pts, F, circle(r, seg), M, o2);
  };
  const glow = (p, size, c, k, mode = 0, idx = 0) => glows.push([p.x, p.y, p.z, size, c.r * k, c.g * k, c.b * k, mode, idx]);
  const discUV = (u, v, g) => (g === 1 || g === 2 ? [u * 2 - 1, v * 2 - 1] : [u, v]);

  /* ================================================================== 1. Wiegenring */
  const yR = -0.22; const z0 = -0.05; const NE = 2.8;
  const clr = 0.044;
  let ax = 0; let bF = 0; let bB = 0;
  const outline = [];
  for (let k = 0; k < 120; k++) {
    const a = (k / 120) * Math.PI * 2;
    const dx = Math.sin(a); const dz = Math.cos(a);
    const t = probe.surfaceAlong(0, yR, z0, dx, 0, dz, 1.1) + clr;
    const x = dx * t; const z = dz * t;
    outline.push([x, z]);
    ax = Math.max(ax, Math.abs(x));
    if (z > 0) bF = Math.max(bF, z); else bB = Math.max(bB, -z);
  }
  const sF = (x, z) => Math.pow(Math.pow(Math.abs(x / ax), NE) + Math.pow(Math.abs(z / (z > 0 ? bF : bB)), NE), 1 / NE);
  let fmax = 1;
  for (const [x, z] of outline) fmax = Math.max(fmax, sF(x, z));
  ax *= fmax; bF *= fmax; bB *= fmax;
  const ringR = { ax, bF, bB, z0, y: yR, n: NE };
  const sgnPow = (u, e) => Math.sign(u) * Math.pow(Math.abs(u), e);
  const ringAt = (th) => V(ax * sgnPow(Math.sin(th), 2 / NE), yR, z0 + (Math.cos(th) > 0 ? bF : bB) * sgnPow(Math.cos(th), 2 / NE));
  // Punkt des Rings in Richtung Azimut alpha (0 = vorne), mit Normale (waagrecht, nach aussen)
  const ringDir = (alpha) => {
    const h = V(Math.sin(alpha), 0, Math.cos(alpha));
    const t = 1 / sF(h.x, h.z);
    const p = V(h.x * t, yR, z0 + h.z * t);
    const e = 1e-3;
    const gx = (sF(p.x + e, p.z - z0) - sF(p.x - e, p.z - z0)); const gz = (sF(p.x, p.z - z0 + e) - sF(p.x, p.z - z0 - e));
    return { p, n: V(gx, 0, gz).normalize(), h };
  };
  const ringHalfX = (z) => {
    const b = z - z0 > 0 ? bF : bB;
    const u = 1 - Math.pow(Math.abs((z - z0) / b), NE);
    return u > 0 ? ax * Math.pow(u, 1 / NE) : 0;
  };
  {
    const n = S(220, 120);
    const P = [];
    for (let k = 0; k < n; k++) P.push(ringAt((k / n) * Math.PI * 2));
    const F = planarFrames(THREE, P, Y, V(0, yR, z0));
    B.sweep(P, F, rrect(0.04, 0.026, 0.0065, 3), mat(cTi, 1, 0.5, KIND.BRUSH), { closed: true });
    // dunkle Nut auf der Innenseite
    const Fi = { N: F.N, B: F.B };
    const Pn = P.map((p, i) => p.clone().addScaledVector(F.N[i], -0.0195));
    B.sweep(Pn, Fi, rrect(0.004, 0.007, 0.0015, 1), mat(cGr.clone().multiplyScalar(0.5), 0, 0.7), { closed: true });
    // 48 Goldkontakte auf der Oberseite (innen), Lauflicht
    for (let k = 0; k < 48; k++) {
      const th = (k / 48) * Math.PI * 2;
      const p = ringAt(th);
      const p2 = ringAt(th + 0.01);
      const T = p2.sub(p).normalize();
      const N = new THREE.Vector3().crossVectors(T, Y).normalize();
      if (N.dot(V(p.x, 0, p.z - z0)) < 0) N.negate();
      const c = p.clone().addScaledVector(N, -0.009).add(V(0, 0.0132, 0));
      box(c, T, Y, 0.009, 0.0016, 0.006, mat(cAu, 1, 0.22, KIND.GOLDRUN), (u, v) => [k / 48, 0]);
      glow(c.clone().add(V(0, 0.004, 0)), 0.014, cAu, 0.5, 5, k / 48);
    }
  }

  /* ================================================================== 2. Spanten, Kiel, Laengstraeger */
  const ribZ = [-0.56, -0.38, -0.19, 0.0, 0.17, 0.33, 0.46].filter((z) => ringHalfX(z) > 0.18);
  const ribs = [];
  const RIB_W = 0.026; const RIB_T = 0.012; const RIB_GAP = 0.036;
  for (const z of ribZ) {
    const K = S(56, 32);
    const c = V(0, yR, z);
    const xr = ringHalfX(z);
    const raw = [];
    for (let k = 0; k <= K; k++) {
      const ph = (k / K) * Math.PI;
      const t = probe.surfaceAlong(0, yR, z, Math.cos(ph), -Math.sin(ph), 0, 1.0);
      raw.push(t + RIB_GAP + RIB_W / 2);
    }
    let r = smoothArr(dilate(raw, 2), 4);
    r = r.map((v, k) => {
      const ph = (k / K) * Math.PI;
      const w = smoothstep(0, 0.55, Math.min(ph, Math.PI - ph));
      return xr + (Math.max(v, 0.05) - xr) * w;
    });
    const pts = r.map((v, k) => {
      const ph = (k / K) * Math.PI;
      return V(Math.cos(ph) * v, yR - Math.sin(ph) * v, z);
    });
    const open = z < -0.3;
    const segs = [];
    if (open) {
      const a = []; const b = [];
      for (const p of pts) { if (p.x > 0.1) a.push(p); else if (p.x < -0.1) b.push(p); }
      segs.push(a, b);
    } else segs.push(pts);
    const rib = { z, c, r, pts, open, ends: [] };
    for (const sp of segs) {
      if (sp.length < 3) continue;
      const P = smoothPath(THREE, sp, Math.max(12, Math.round(sp.length * 1.2)));
      const F = planarFrames(THREE, P, V(0, 0, 1), c);
      const prof = rrect(RIB_W, RIB_T, 0.0028, 2);
      const len = B.sweep(P, F, prof, mat(cTi, 1, 0.46, KIND.RIB), {
        idx: 0, uvy: (qq) => (Math.abs(qq.ny) > 0.7 ? 0.5 + qq.x / RIB_W : 2.0),
      });
      // Laenge in den Index schreiben (Shader: keine Loecher an den Enden)
      const nV = P.length * prof.length + 2 * (prof.length + 1);
      for (let i = B.n - nV; i < B.n; i++) B.pbr[i * 4 + 3] = len;
      if (open) rib.ends.push(P[P.length - 1].x > 0 ? P[P.length - 1] : P[0]);
    }
    ribs.push(rib);
  }
  // Kiel unter den durchgehenden Spanten
  const full = ribs.filter((rb) => !rb.open);
  const keelPts = full.map((rb) => {
    const k = Math.round(rb.r.length / 2);
    return V(0, yR - rb.r[k] - RIB_W / 2 - 0.011, rb.z);
  });
  if (keelPts.length >= 2) {
    const first = keelPts[0].clone().add(V(0, 0, -0.035));
    const last = keelPts[keelPts.length - 1].clone().add(V(0, 0.01, 0.03));
    const P = smoothPath(THREE, [first, ...keelPts, last], S(40, 20));
    const F = planarFrames(THREE, P, V(1, 0, 0), V(0, 0.5, P[0].z));
    B.sweep(P, F, rrect(0.02, 0.03, 0.004, 2), TI);
  }
  // Laengstraeger: auf jedem Spant unter 30 Grad, aussen
  for (const side of [1, -1]) {
    const ph = 0.55;
    const pts = ribs.map((rb) => {
      const K = rb.r.length - 1;
      const k = Math.round(((side > 0 ? ph : Math.PI - ph) / Math.PI) * K);
      const rr = rb.r[k] + RIB_W / 2 + 0.013;
      const a = (k / K) * Math.PI;
      return V(Math.cos(a) * rr, yR - Math.sin(a) * rr, rb.z);
    });
    const ext0 = pts[0].clone().add(V(0, 0, -0.03));
    const ext1 = pts[pts.length - 1].clone().add(V(0, 0, 0.03));
    const P = smoothPath(THREE, [ext0, ...pts, ext1], S(60, 30));
    tube(P, 0.012, TI, { up: V(side, 0, 0) });
    for (const p of pts) {
      const n = V(p.x, p.y - yR, 0).normalize();
      box(p.clone().addScaledVector(n, -0.004), V(0, 0, 1), n, 0.03, 0.022, 0.034, TIP);
    }
  }

  /* ================================================================== 3. Buegel quer ueber den Scheitel */
  // Von Ring links ueber den Scheitel zum Ring rechts (wie ein EEG-Buegel). Er liegt quer zur Flugbahn der Kamera,
  // die vorne links oben eintaucht und hinten hinaus fliegt: so bleibt die Schneise frei.
  {
    const zA = -0.06;
    const c = V(0, -0.08, zA);
    const right = V(ringHalfX(zA), yR, zA); const left = V(-ringHalfX(zA), yR, zA);
    const ps0 = Math.atan2(right.y - c.y, right.x - c.x);
    const ps1 = Math.PI - ps0;
    const K = S(90, 48);
    const raw = [];
    for (let k = 0; k <= K; k++) {
      const ps = ps0 + (k / K) * (ps1 - ps0);
      const dx = Math.cos(ps); const dy = Math.sin(ps);
      let t = 0;
      for (const zo of [-0.08, -0.04, 0, 0.04, 0.08]) t = Math.max(t, probe.surfaceAlong(0, c.y, c.z + zo, dx, dy, 0, 1.0, false));
      raw.push(t + 0.045 + 0.011);
    }
    const r0 = right.distanceTo(c);
    let r = smoothArr(dilate(raw, 3), 6);
    r = r.map((v, k) => {
      const f = k / K;
      const w = Math.min(smoothstep(0, 0.14, f), smoothstep(0, 0.14, 1 - f));
      return r0 + (Math.max(v, r0 * 0.8) - r0) * w;
    });
    const P = r.map((v, k) => {
      const ps = ps0 + (k / K) * (ps1 - ps0);
      return V(Math.cos(ps) * v, c.y + Math.sin(ps) * v, zA);
    });
    P[0].y += 0.013; P[P.length - 1].y += 0.013;
    const F = planarFrames(THREE, P, V(0, 0, 1), c);
    B.sweep(P, F, rrect(0.022, 0.018, 0.004, 2), TI);
    info.arch = { c, P, r, ps0, ps1 };
    // Fuesse auf dem Ring
    for (const e of [P[0], P[P.length - 1]]) {
      box(e.clone().add(V(0, -0.003, 0)), V(0, 0, 1), Y, 0.034, 0.016, 0.03, TIP);
      for (const sz of [-1, 1]) bolt(e.clone().add(V(0, 0.005, sz * 0.01)), Y, 0.0042);
    }
    // 5 Elektroden-Stifte entlang des Buegels, der mittlere haengt in den Laengsspalt
    const wx = [-0.27, -0.135, 0, 0.135, 0.27];
    wx.forEach((x, w) => {
      let k = 0; let bd = 9;
      P.forEach((p, i) => { const d = Math.abs(p.x - x); if (d < bd && p.y > c.y) { bd = d; k = i; } });
      const N = F.N[k];
      const top = P[k].clone().addScaledVector(N, -0.011);
      box(top.clone().addScaledVector(N, -0.002), V(0, 0, 1), N, 0.022, 0.01, 0.016, TIP);
      const d = N.clone().negate();
      const surf = probe.hitAlong(top.x, top.y, top.z, d.x, d.y, d.z, 0.25, false);
      const len = Math.min(0.11, surf > 0 ? surf + (w === 2 ? 0.03 : 0.004) : 0.05);
      const bottom = top.clone().addScaledVector(d, Math.max(0.02, len));
      // Elektroden-Stifte in Chrom (vorher Gold: wirkten im Bloom wie orange Stecknadeln)
      tube([top, top.clone().lerp(bottom, 0.5), bottom], 0.0036, mat(cAl.clone(), 1, 0.22), { seg: 5 });
      cyl(top.clone().addScaledVector(d, 0.01), d, 0.007, 0.007, 0.01, RB, 10);
      B.geo(new THREE.IcosahedronGeometry(0.0062, 1), m4(bottom, new THREE.Quaternion()), mat(cAl.clone(), 1, 0.18));
      glow(bottom.clone().addScaledVector(N, 0.006), 0.045, ice, 1.0, 1, 12 + w);
      info.wires.push(bottom.clone());
    });
  }

  /* ================================================================== 4. Klammern */
  const clampAz = [0.61, -0.61, 2.36, -2.36, 2.88, -2.88];
  clampAz.forEach((al, ci) => {
    const { p: pr, h } = ringDir(al);
    const yEnd = -0.07;
    const pts = [pr.clone().add(V(0, 0.011, 0))];
    const K = 7;
    let last = null;
    for (let k = 0; k <= K; k++) {
      const y = yR + 0.035 + (k / K) * (yEnd - yR - 0.035);
      const t = probe.surfaceAlong(0, y, z0, h.x, 0, h.z, 1.1, false);
      const rr = Math.min(t + 0.02, pr.clone().sub(V(0, yR, z0)).length() + 0.01);
      last = { y, t };
      pts.push(V(h.x * rr, y, z0 + h.z * rr));
    }
    const P = smoothPath(THREE, pts, S(28, 14));
    const plane = V(h.z, 0, -h.x);
    const F = planarFrames(THREE, P, plane, V(0, P[P.length - 1].y, z0));
    B.sweep(P, F, rrect(0.008, 0.016, 0.0025, 2), TI);
    box(pr.clone().add(V(0, 0.016, 0)), plane, Y, 0.036, 0.012, 0.03, TIP);
    bolt(pr.clone().add(V(0, 0.022, 0)), Y, 0.005);
    // Polster an der Hirnseite: flache Chromscheibe mit feinem Kontaktring (Runde 2: vorher dicke schwarze Gummikoepfe,
    // wirkten wie Pinnnadeln)
    const sp = V(h.x * last.t, last.y, z0 + h.z * last.t);
    const pc = sp.clone().addScaledVector(h, 0.006);
    cyl(pc, h, 0.019, 0.019, 0.004, (g) => (g === 1 ? mat(cAl.clone().multiplyScalar(0.85), 1, 0.24, KIND.PAD, ci) : AL), 20, discUV);
    glow(pc.clone().addScaledVector(h, 0.007), 0.05, sig, 1.0, 4, ci);
    info.pads.push(sp.clone());
  });

  /* ================================================================== 5. Streben zur Schale und zu den Ohren */
  for (const al of [1.05, -1.05, 2.1, -2.1]) {
    const { p, n } = ringDir(al);
    const d = n.clone().add(V(0, 0.22, 0)).normalize();
    const s = p.clone().addScaledVector(n, 0.017);
    const e = toShell(s, d);
    const len = s.distanceTo(e);
    if (len < 0.03 || len > 0.5) continue;
    const sn = shellNormal(e);
    const e2 = e.clone().addScaledVector(d, -0.008);
    tube([s, s.clone().lerp(e2, 0.5), e2], 0.013, TI, { caps: true });
    cyl(s.clone().addScaledVector(d, 0.006), d, 0.019, 0.019, 0.014, TIP, 16);
    cyl(s.clone().lerp(e2, 0.5), d, 0.026, 0.026, 0.034, RB, 20);
    const fl = e.clone().addScaledVector(sn, -0.004);
    cyl(fl, sn, 0.032, 0.032, 0.007, TIP, 20);
    const t1 = new THREE.Vector3().crossVectors(sn, Y).normalize();
    for (const sg of [1, -1]) bolt(fl.clone().addScaledVector(t1, sg * 0.021).addScaledVector(sn, -0.0035), sn.clone().negate(), 0.0045);
  }
  for (const side of [1, -1]) {
    const { p, n } = ringDir(side * Math.PI / 2);
    const s = p.clone().addScaledVector(n, 0.017);
    const xe = 0.685;
    const e = V(side * xe, s.y, s.z);
    if (Math.abs(e.x) - Math.abs(s.x) > 0.02) {
      tube([s, s.clone().lerp(e, 0.5), e], 0.013, TI);
      cyl(s.clone().lerp(e, 0.5), V(side, 0, 0), 0.025, 0.025, 0.03, RB, 20);
    }
    // Befestigungsplatte am Ohrmodul (Innenseite)
    cyl(e.clone().add(V(side * 0.003, 0, 0)), V(side, 0, 0), 0.06, 0.06, 0.006, TID, 32);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      bolt(e.clone().add(V(0, Math.cos(a) * 0.045, Math.sin(a) * 0.045)), V(-side, 0, 0), 0.0045);
    }
  }

  /* ================================================================== 6. Stammsaeule, Rundstecker, Kabel zum Hals */
  const colTopY = keelPts.length ? Math.min(...keelPts.map((p) => p.y)) - 0.01 : -0.42;
  const colZ = neckTop.z;
  {
    const yT = colTopY; const yB = neckTop.y;
    const L = yT - yB;
    const prof = [
      [0.0, yT + 0.002], [0.08, yT + 0.002], [0.085, yT - 0.004], [0.08, yT - 0.012], [0.055, yT - 0.016], [0.048, yT - 0.03],
    ];
    const grooves = [0.3, 0.45, 0.6];
    let y = yT - 0.03;
    for (const g of grooves) {
      const yc = yT - L * g;
      prof.push([0.048, yc + 0.008], [0.042, yc + 0.006], [0.042, yc - 0.006], [0.048, yc - 0.008]);
      y = yc;
    }
    prof.push([0.048, yB + 0.035], [0.064, yB + 0.028], [0.066, yB + 0.008], [0.06, yB], [0.0, yB]);
    const pts = prof.reverse().map(([r, yy]) => new THREE.Vector2(r, yy));
    const g = new THREE.LatheGeometry(pts, S(32, 16));
    B.geo(g, m4(V(0, 0, colZ), new THREE.Quaternion()), TIP);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      bolt(V(Math.cos(a) * 0.066, yT + 0.002, colZ + Math.sin(a) * 0.066), Y, 0.005);
    }
    info.column = { yT, yB, z: colZ };
  }
  // Rundstecker am Kabelaustritt
  const hubC = root.clone();
  const hubD = V(0, -0.16, -1).normalize();
  {
    const at = (s) => hubC.clone().addScaledVector(hubD, s);
    cyl(at(-0.037), hubD, 0.058, 0.066, 0.016, TIP, S(40, 20));
    const knurlUV = (u, v, g) => [u, g === 0 ? v : 0.5];
    cyl(at(-0.004), hubD, 0.08, 0.08, 0.05, (g) => (g === 0 ? mat(cTi, 1, 0.3, KIND.KNURL) : TIP), S(64, 32), knurlUV);
    cyl(at(0.03), hubD, 0.074, 0.068, 0.018, TIP, S(40, 20));
    cyl(at(0.042), hubD, 0.062, 0.062, 0.006, mat(cGr.clone().multiplyScalar(0.7), 0, 0.5), S(40, 20));
    const t1 = new THREE.Vector3().crossVectors(hubD, Y).normalize();
    const t2 = new THREE.Vector3().crossVectors(t1, hubD).normalize();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + Math.PI / 10;
      const p = at(0.046).addScaledVector(t1, Math.cos(a) * 0.035).addScaledVector(t2, Math.sin(a) * 0.035);
      cyl(p, hubD, 0.011, 0.011, 0.007, (g) => (g === 1 ? mat(cGr, 0, 0.5, KIND.SOCKET) : AU), 16, discUV);
      glow(p.clone().addScaledVector(hubD, 0.006), 0.04, sig, 1.4, 3, k);
    }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const p = at(-0.045).addScaledVector(t1, Math.cos(a) * 0.052).addScaledVector(t2, Math.sin(a) * 0.052);
      bolt(p, hubD.clone().negate(), 0.0045);
    }
    // Halter zu den hinteren Spanten
    for (const rb of ribs.filter((r) => r.open)) {
      for (const e of rb.ends) {
        const side = Math.sign(e.x);
        const hp = at(0).addScaledVector(t1, side * 0.079);
        if (hp.distanceTo(e) > 0.3) continue;
        tube([e, e.clone().lerp(hp, 0.5).add(V(0, -0.01, 0)), hp], 0.009, TI);
        box(e.clone(), V(0, 0, 1), V(side, 0, 0), 0.022, 0.02, 0.026, TIP);
      }
    }
    info.hub = { c: hubC, d: hubD };
  }
  // Rueckenmark-Kabel: vom Rundstecker hinter der Saeule in den Hals (Cyan-Adern, Index 15)
  {
    const p0 = hubC.clone().add(V(0, -0.07, 0.03));
    const pts = smoothPath(THREE, [p0, V(0, -0.72, -0.24), V(0, -0.94, -0.085), V(0, neckTop.y + 0.01, colZ - 0.072)], S(48, 24));
    const L = tube(pts, 0.017, mat(cRb, 0, 0.8, KIND.CABLE, 15), { seg: S(10, 6) });
    info.cables[15] = { len: L, loop: true };
    for (const f of [0.55, 0.85]) {
      const p = pts[Math.round(f * (pts.length - 1))];
      cyl(p, Y, 0.024, 0.024, 0.012, TIP, 16);
    }
  }

  /* ================================================================== 7. Platinen */
  const layouts = boardLayouts();
  const boards = {};
  const insideHeadK = (p, k) => {
    const l = p.length();
    headShape(p.x / l, p.y / l, p.z / l, tmpO);
    return l < Math.hypot(tmpO.x, tmpO.y, tmpO.z) * k;
  };
  // Platine einpassen: Lage an der Schale (oder fester Rahmen), Abstand nach innen automatisch so gross, dass alle
  // Ecken samt Bauteilen innerhalb der Innenschale liegen und das Gehirn nicht beruehren
  const placeBoard = (key, o2) => {
    const L = layouts[key];
    let Nb; let s; let Cb; let up;
    if (o2.frame) {
      Nb = o2.frame.N.clone().normalize();
      up = o2.frame.V.clone().addScaledVector(Nb, -o2.frame.V.dot(Nb)).normalize();
      Cb = o2.frame.C.clone();
      s = Cb.clone();
    } else {
      s = toShell(o2.origin, o2.dir);
      Nb = shellNormal(s).add(o2.tilt || V(0, 0, 0)).normalize();
      up = Y.clone().addScaledVector(Nb, -Y.dot(Nb)).normalize();
    }
    const Ub = new THREE.Vector3().crossVectors(up, Nb).normalize(); // = (-N) x up
    const w2 = L.w / 2; const h2 = L.h / 2; const hMax = o2.hMax ?? 0.04;
    const probePts = [];
    for (const fu of [-1, -0.5, 0, 0.5, 1]) for (const fv of [-1, 0, 1]) probePts.push([fu * w2, fv * h2]);
    // Pruefung: Ruecken und Bauteile innerhalb der Innenschale, Ruecken mindestens 0.07 vom Gehirn
    const check = (c) => {
      for (const [u, v] of probePts) {
        const edge = Math.abs(u) > w2 * 0.9 || Math.abs(v) > h2 * 0.9;
        for (const h of [-0.014, edge ? 0.012 : hMax]) {
          const p = c.clone().addScaledVector(Ub, u).addScaledVector(up, v).addScaledVector(Nb, h);
          if (!insideHeadK(p.clone().add(C), 0.955)) return `Schale bei u ${u.toFixed(2)} v ${v.toFixed(2)} h ${h}`;
          if (h < 0) {
            const towards = p.clone().multiplyScalar(-1).normalize();
            const q = p.clone().addScaledVector(towards, o2.brainGap ?? 0.06);
            if (probe.inside(q.x, q.y, q.z)) return `Gehirn bei u ${u.toFixed(2)} v ${v.toFixed(2)}`;
          }
        }
      }
      return null;
    };
    if (!o2.frame) {
      let inset = o2.inset ?? 0.03;
      let why = null;
      for (; inset < 0.25; inset += 0.003) {
        Cb = s.clone().addScaledVector(Nb, -inset);
        why = check(Cb);
        if (!why) break;
      }
      if (why) info.warn = (info.warn || []).concat(`Platine ${key}: ${why}`);
    } else {
      const why = check(Cb);
      if (why) info.warn = (info.warn || []).concat(`Platine ${key}: ${why}`);
    }
    const at = (u, v, h = 0) => Cb.clone().addScaledVector(Ub, u).addScaledVector(up, v).addScaledVector(Nb, h);
    const bd = { key, L, Nb, Ub, Vb: up, Cb, at, shell: s, standoff: o2.standoff || 'none' };
    boards[key] = bd;
    return bd;
  };
  const buildBoard = (bd, ledBase) => {
    const { L, Nb, Ub, Vb, Cb, at, key } = bd;
    const T = 0.012;
    // Umriss mit runden Ecken und Abschraegung
    const sh = new THREE.Shape();
    const w2 = L.w / 2; const h2 = L.h / 2; const rc = 0.006;
    const ch = L.chamfer;
    const pts = [];
    const corner = (cx, cy, a0) => { for (let k = 0; k <= 3; k++) { const a = a0 + (k / 3) * (Math.PI / 2); pts.push([cx + Math.cos(a) * rc, cy + Math.sin(a) * rc]); } };
    corner(w2 - rc, -h2 + rc, -Math.PI / 2);
    if (ch && ch.corner === 'tr') { pts.push([w2, h2 - ch.b], [w2 - ch.a, h2]); } else corner(w2 - rc, h2 - rc, 0);
    if (ch && ch.corner === 'tl') { pts.push([-w2 + ch.a, h2], [-w2, h2 - ch.b]); } else corner(-w2 + rc, h2 - rc, Math.PI / 2);
    corner(-w2 + rc, -h2 + rc, Math.PI);
    sh.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false, curveSegments: 4 });
    // Basis: x -> Ub, y -> Vb, z -> Nb (Bauteilseite bei z = T)
    const mtx = new THREE.Matrix4().makeBasis(Ub, Vb, Nb).setPosition(Cb.clone().addScaledVector(Nb, -T));
    const [rx, ry, rw, rh] = REGIONS[key];
    const pcbMat = mat(cPcb, 0, 0.36, KIND.PCB);
    B.geo(g, mtx, (gi, p0) => {
      if (gi === 1) return PCB_EDGE;
      return p0.z > T * 0.5 ? pcbMat : PCB_BACK;
    }, (u, v, gi, p0) => {
      if (gi === 1) return [0, 0];
      return [(rx + (p0.x / L.w + 0.5) * rw) / ATLAS_SIZE.w, (ry + (p0.y / L.h + 0.5) * rh) / ATLAS_SIZE.h];
    });
    // Befestigung: Schrauben in den Loechern; Schlaefenplatinen mit Abstandsbolzen zur Schale
    for (const [u, v] of L.holes) {
      const p = at(u, v, 0);
      bolt(p, Nb, 0.006);
      if (bd.standoff !== 'shell') continue;
      const dir = shellNormal(p).setY(0).normalize();
      const sp = toShell(p, dir);
      const len = p.distanceTo(sp);
      if (len > 0.01 && len < 0.16) {
        tube([p.clone().addScaledVector(dir, 0.002), p.clone().lerp(sp, 0.5), sp], 0.0055, TID, { seg: 6 });
        cyl(sp.clone().addScaledVector(dir, -0.003), dir, 0.011, 0.011, 0.005, TIP, 12);
      }
    }
    const label = (lk, rot) => (u, v, gi, p0) => {
      // Oberseite (+y der Box): Lage im Feld aus der Box-Position
      if (gi !== 2) return [0, 0];
      const [lx, ly, lw, lh] = REGIONS[lk];
      let fu = p0.x + 0.5; let fv = 0.5 - p0.z;
      if (rot) { const t = fu; fu = 1 - fv; fv = t; }
      return [(lx + fu * lw) / ATLAS_SIZE.w, (ly + fv * lh) / ATLAS_SIZE.h];
    };
    const Vneg = Vb.clone().negate();
    const boxOn = (u, v, w, h, hgt, M, uvf = null, base = 0) => {
      // Box auf der Platine: x -> Ub (w), y -> Nb (hgt), z -> -Vb (h)
      const mtx2 = new THREE.Matrix4().makeBasis(Ub, Nb, Vneg).setPosition(at(u, v, base + hgt / 2));
      mtx2.scale(V(w, hgt, h));
      B.geo(new THREE.BoxGeometry(1, 1, 1), mtx2, M, uvf);
    };
    let led = 0;
    const hdrs = [];
    for (const c of L.comps) {
      if (c.t === 'soc') {
        boxOn(c.u, c.v, c.w, c.h, 0.003, EP);
        // Deckel dunkel (Graphit mit etwas Titan), kein Aufdruck: ruhige Module statt Bausatz-Chips
        const lidM = (gi) => (gi === 2 ? mat(cGr.clone().lerp(cTi, 0.28), 1, 0.3, KIND.LABEL) : TIP);
        boxOn(c.u, c.v, c.w - 0.008, c.h - 0.008, 0.006, lidM, c.fins ? null : label(c.label), 0.003);
        if (c.fins) {
          const n = c.fins.n;
          boxOn(c.u, c.v, c.w - 0.006, c.h - 0.006, 0.003, AL, null, 0.009);
          for (let i = 0; i < n; i++) {
            const fu = c.u - (c.w - 0.014) / 2 + (i / (n - 1)) * (c.w - 0.014);
            boxOn(fu, c.v, 0.0042, c.h - 0.01, c.fins.fh, AL, null, 0.012);
          }
        }
      } else if (c.t === 'mem') {
        boxOn(c.u, c.v, c.w, c.h, 0.0045, (gi) => (gi === 2 ? mat(EP.c, 0, 0.42, KIND.LABEL) : EP), label(c.label, c.rot));
      } else if (c.t === 'smd') {
        boxOn(c.u, c.v, c.w * 0.6, c.h, 0.003, mat(cGr.clone().lerp(cAu, 0.25), 0, 0.5));
        for (const sgn of [-1, 1]) boxOn(c.u + sgn * c.w * 0.4, c.v, c.w * 0.2, c.h, 0.0032, AU);
      } else if (c.t === 'led') {
        const lc = c.c ? ember : sig;
        boxOn(c.u, c.v, 0.007, 0.0045, 0.003, mat(lc.clone(), 0, 0.3, KIND.LED, ledBase + led));
        glow(at(c.u, c.v, 0.006), 0.03, lc, 1.3, 2, ledBase + led);
        led++;
      } else if (c.t === 'cap') {
        cyl(at(c.u, c.v, c.hgt * 0.42), Nb, c.r, c.r, c.hgt * 0.84, mat(cGr.clone().lerp(sig, 0.08), 0, 0.5), 16);
        cyl(at(c.u, c.v, c.hgt * 0.92), Nb, c.r * 0.96, c.r * 0.96, c.hgt * 0.16, AL, 16);
      } else if (c.t === 'hdr') {
        boxOn(c.u, c.v, c.w, c.h, 0.009, mat(cGr.clone().multiplyScalar(0.8), 0, 0.55));
        for (let i = 0; i < c.pins; i++) {
          const pu = c.u - c.w / 2 + 0.006 + (i / Math.max(1, c.pins - 1)) * (c.w - 0.012);
          boxOn(pu, c.v, 0.0025, 0.004, 0.003, AU, null, 0.009);
        }
        hdrs.push({ p: at(c.u, c.v, 0.012), c });
      } else if (c.t === 'fins') {
        boxOn(c.u, c.v, c.w, c.h, 0.004, AL);
        for (let i = 0; i < c.n; i++) {
          const fu = c.u - c.w / 2 + 0.003 + (i / (c.n - 1)) * (c.w - 0.006);
          boxOn(fu, c.v, 0.0036, c.h, c.fh, AL, null, 0.004);
        }
      } else if (c.t === 'fan') {
        const fc = at(c.u, c.v, 0.0);
        info.fan = { c: fc.clone().addScaledVector(Nb, 0.012), ax: Nb.clone() };
        const ring = [[0.064, 0.002], [0.074, 0.002], [0.074, 0.024], [0.068, 0.024], [0.064, 0.02]].map(([r, h]) => new THREE.Vector2(r, h));
        B.geo(new THREE.LatheGeometry(ring, S(48, 24)), m4(fc, qAlign(Y, Nb)), TIP);
        const FAN = mat(cGr.clone().lerp(cTi, 0.15), 0, 0.45, KIND.FAN);
        cyl(fc.clone().addScaledVector(Nb, 0.012), Nb, 0.022, 0.022, 0.016, FAN, 24);
        cyl(fc.clone().addScaledVector(Nb, 0.0205), Nb, 0.006, 0.006, 0.0012, AL, 16);
        const blade = new THREE.Shape();
        const r0 = 0.023; const r1 = 0.063;
        blade.moveTo(r0, 0);
        blade.quadraticCurveTo((r0 + r1) / 2, 0.012, r1 * Math.cos(0.42), r1 * Math.sin(0.42));
        blade.lineTo(r1 * Math.cos(0.5), r1 * Math.sin(0.5));
        blade.quadraticCurveTo((r0 + r1) / 2 - 0.004, 0.022, r0 * Math.cos(0.2), r0 * Math.sin(0.2));
        blade.closePath();
        const qB = qAlign(V(0, 0, 1), Nb);
        for (let k = 0; k < 11; k++) {
          const bg = new THREE.ExtrudeGeometry(blade, { depth: 0.013, bevelEnabled: false, curveSegments: 4 });
          bg.rotateZ((k / 11) * Math.PI * 2);
          bg.translate(0, 0, 0.005);
          B.geo(bg, m4(fc, qB), FAN);
        }
        // Gitter: 4 Speichen
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + 0.4;
          const dir = Ub.clone().multiplyScalar(Math.cos(a)).addScaledVector(Vb, Math.sin(a));
          box(fc.clone().addScaledVector(Nb, 0.026).addScaledVector(dir, 0.045), dir, Nb, 0.05, 0.003, 0.004, TIP);
        }
      }
    }
    // Heatpipes: vom SoC-Deckel zum Rippenblock
    const soc = L.comps.find((c) => c.t === 'soc');
    const fins = L.comps.find((c) => c.t === 'fins');
    if (soc && fins) {
      for (const dv of [-0.022, 0.022]) {
        const su = soc.u + Math.sign(fins.u - soc.u) * (soc.w / 2 - 0.012);
        const fu = fins.u + Math.sign(soc.u - fins.u) * (fins.w / 2 - 0.006);
        const sv = soc.v + dv; const fv = fins.v + Math.sign(dv) * Math.min(Math.abs(dv) * 0.8, fins.h / 2 - 0.005);
        const p0 = at(su, sv, 0.0095);
        const p1 = at(su + (fu - su) * 0.3, sv + (fv - sv) * 0.3, 0.019);
        const p2 = at(su + (fu - su) * 0.75, sv + (fv - sv) * 0.75, 0.017);
        const p3 = at(fu, fv, 0.008);
        tube(smoothPath(THREE, [p0, p1, p2, p3], 20), 0.0042, CU, { seg: 6 });
      }
    }
    bd.hdrs = hdrs;
    return led;
  };
  // Schlaefenplatinen (unter der Hirnseite, vor den Ohren nach hinten versetzt), Rueckplatine hinten
  const tL = placeBoard('tempL', { frame: { N: V(-0.84, 0.52, 0.1), V: Y, C: V(-0.605, -0.47, -0.18) }, hMax: 0.04, standoff: 'shell' });
  const tR = placeBoard('tempR', { frame: { N: V(0.84, 0.52, 0.1), V: Y, C: V(0.605, -0.47, -0.18) }, hMax: 0.04, standoff: 'shell' });
  const bk = placeBoard('back', { frame: { N: Y, V: V(0, 0, -1), C: V(0, -0.405, -0.69) }, hMax: 0.05, brainGap: 0.03 });
  let ledN = 0;
  ledN += buildBoard(tL, ledN);
  ledN += buildBoard(tR, ledN);
  ledN += buildBoard(bk, ledN);
  // Steigplatine hinter dem Hinterhauptlappen, Bauteile zum Gehirn (+z), steht auf dem Tablar
  const rs = placeBoard('riser', { frame: { N: V(0, 0.12, 1), V: Y, C: V(0, -0.215, -0.805) }, hMax: 0.03, brainGap: 0.03 });
  ledN += buildBoard(rs, ledN);
  info.leds = ledN;
  { // Winkel zum Tablar und zwei Streben zur Schale
    for (const su of [-1, 1]) {
      const p = rs.at(su * 0.12, -rs.L.h / 2 + 0.012, -0.018);
      box(p, V(1, 0, 0), Y, 0.03, 0.024, 0.012, TIP);
      const q0 = rs.at(su * 0.12, rs.L.h / 2 - 0.03, -0.012);
      const dir = V(su * 0.2, 0.25, -1).normalize();
      const q1 = toShell(q0, dir);
      if (q0.distanceTo(q1) < 0.2) {
        tube([q0, q0.clone().lerp(q1, 0.5), q1], 0.007, TID);
        cyl(q1.clone().addScaledVector(dir, -0.003), dir, 0.012, 0.012, 0.005, TIP, 12);
      }
    }
  }
  // Rueckplatine als Tablar hinter dem Kleinhirn: 2 Stuetzen hinauf zum Ring, 2 schraeg hinunter zur Schale
  for (const su of [-1, 1]) {
    const L = bk.L;
    const u = su * (L.w / 2 - 0.026);
    let zr = 0;
    { // Ring-Unterseite bei x = u
      const x = u; const t = 1 - Math.pow(Math.abs(x / ringR.ax), NE);
      zr = z0 - ringR.bB * Math.pow(Math.max(t, 0), 1 / NE);
    }
    const v = bk.Cb.z - zr;
    const p0 = bk.at(u, v, 0.001);
    const p1 = V(u, yR - 0.013, zr);
    if (p1.y > p0.y + 0.03) {
      tube([p0, p0.clone().lerp(p1, 0.5), p1], 0.0085, TI);
      box(p1.clone().add(V(0, -0.004, 0)), V(1, 0, 0), Y, 0.028, 0.01, 0.028, TIP);
      cyl(p0.clone().add(V(0, 0.003, 0)), Y, 0.014, 0.014, 0.006, TIP, 12);
    }
    const q0 = bk.at(u, L.h / 2 - 0.02, -0.012);
    const dir = V(0, -0.55, -0.83).normalize();
    const q1 = toShell(q0, dir);
    if (q0.distanceTo(q1) < 0.25) {
      tube([q0, q0.clone().lerp(q1, 0.5), q1], 0.0075, TID);
      cyl(q1.clone().addScaledVector(dir, -0.003), dir, 0.012, 0.012, 0.005, TIP, 12);
    }
  }

  /* ================================================================== 8. Flachbandkabel von der Optik zum Ring */
  {
    const front = ringAt(0);
    // Start an der Optik-Platine zwischen den Augen der Android-Bueste (Welt etwa 0, 0, 0.74: hinter der Nasenwurzel,
    // innerhalb der Schale, Augen bei x +-0.30)
    const p0 = V(0, -0.235, 0.8);
    const pts = smoothPath(THREE, [p0, V(0, -0.205, 0.72), V(0, -0.19, 0.64), front.clone().add(V(0, 0.013, -0.004))], S(40, 20));
    const F = planarFrames(THREE, pts, V(1, 0, 0), V(0, -0.6, 0.5));
    B.sweep(pts, F, rrect(0.003, 0.12, 0.0012, 1), mat(cGr.clone().multiplyScalar(0.9), 0, 0.5, KIND.FLEX), {
      uvy: (qq) => 0.5 + qq.y / 0.12,
    });
    box(p0.clone().add(V(0, 0, 0.007)), V(1, 0, 0), V(0, 0, 1), 0.13, 0.014, 0.02, GR);
    box(front.clone().add(V(0, 0.018, 0.0)), V(1, 0, 0), Y, 0.13, 0.012, 0.022, GR);
  }

  /* ================================================================== 9. Elektroden und Kabel in die Rinde */
  const elecDirs = [
    [-0.38, 0.40, 0.83], [0.38, 0.40, 0.83], [-0.88, 0.22, 0.38], [0.85, 0.4, 0.34], [-0.30, 0.92, -0.05], [0.30, 0.92, -0.22],
    [-0.93, -0.32, 0.18], [0.93, -0.32, 0.18], [-0.94, -0.1, -0.32], [0.94, -0.1, -0.32], [-0.42, -0.12, -0.9], [0.36, 0.2, -0.9],
  ];
  const nrmAt = (d) => {
    // Normale der Rinde: Differenzen mit grossem Abstand (glatt ueber die Windungen)
    const p = probe.cortexPoint(d.x, d.y, d.z, [0, 0, 0]);
    const t1 = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 ? Y : V(1, 0, 0)).normalize();
    const t2 = new THREE.Vector3().crossVectors(d, t1).normalize();
    const e = 0.09;
    const a = probe.cortexPoint(d.x + t1.x * e, d.y + t1.y * e, d.z + t1.z * e, [0, 0, 0]);
    const b = probe.cortexPoint(d.x - t1.x * e, d.y - t1.y * e, d.z - t1.z * e, [0, 0, 0]);
    const c = probe.cortexPoint(d.x + t2.x * e, d.y + t2.y * e, d.z + t2.z * e, [0, 0, 0]);
    const f = probe.cortexPoint(d.x - t2.x * e, d.y - t2.y * e, d.z - t2.z * e, [0, 0, 0]);
    const u = V(a[0] - b[0], a[1] - b[1], a[2] - b[2]); const v = V(c[0] - f[0], c[1] - f[1], c[2] - f[2]);
    const n = new THREE.Vector3().crossVectors(u, v).normalize();
    if (n.dot(d) < 0) n.negate();
    return { p: V(p[0], p[1], p[2]), n: n.lerp(d, 0.35).normalize() };
  };
  const anchorFor = (i) => {
    const side = elecDirs[i][0] < 0 ? -1 : 1;
    if (i < 2) { const { p } = ringDir(side * 0.42); return p.clone().add(V(0, 0.012, 0)); }
    if (i < 4) { const { p } = ringDir(side * 0.98); return p.clone().add(V(0, 0.012, 0)); }
    if (i < 6) {
      const A = info.arch;
      let k = 0; let bd = 9;
      A.P.forEach((p, j) => { const d = Math.abs(p.x - side * 0.36); if (d < bd && p.y > A.c.y) { bd = d; k = j; } });
      return A.P[k].clone().add(V(0, -0.004, 0.012));
    }
    if (i < 10) {
      const bd = side < 0 ? tL : tR;
      const h = bd.hdrs[0];
      return h.p.clone().addScaledVector(bd.Ub, (i < 8 ? -0.012 : 0.012) * (side < 0 ? 1 : -1));
    }
    const h = rs.hdrs[side < 0 ? 1 : 0];
    return h.p.clone();
  };
  elecDirs.forEach((dd, i) => {
    const d = V(dd[0] * R.x, dd[1] * R.y, dd[2] * R.z).normalize();
    const { p, n } = nrmAt(d);
    const ec = p.clone().addScaledVector(n, 0.004);
    cyl(ec, n, 0.021, 0.021, 0.006, (g) => (g === 1 ? mat(cAl, 1, 0.25, KIND.ELEC, i) : AL), 24, discUV);
    glow(ec.clone().addScaledVector(n, 0.008), 0.065, sig, 1.25, 1, i);
    info.elec.push(p.clone());
    // Kabel: vom Anker in weichem Bogen zur Hirnoberflaeche und darauf entlang bis zur Elektrode
    const A = anchorFor(i);
    const dA = A.clone().normalize(); const dE = ec.clone().normalize();
    const K = S(36, 20);
    const pts = [];
    const ang = dA.angleTo(dE);
    const axis = new THREE.Vector3().crossVectors(dA, dE);
    if (axis.lengthSq() < 1e-8) axis.set(0, 1, 0);
    axis.normalize();
    const dirs = []; let rad = [];
    for (let k = 0; k <= K; k++) {
      const dir = dA.clone().applyAxisAngle(axis, ang * (k / K));
      const cp = probe.cortexPoint(dir.x, dir.y, dir.z, [0, 0, 0]);
      dirs.push(dir);
      rad.push(Math.hypot(cp[0], cp[1], cp[2]));
    }
    rad = smoothArr(dilate(rad, 2), 3); // ueber die Windungen hinweg, nicht hinein
    for (let k = 0; k <= K; k++) {
      const t = k / K;
      const rs = rad[k] + 0.014 + 0.012 * Math.sin(Math.PI * t);
      let rr = A.length() + (rs - A.length()) * smoothstep(0, 0.4, t);
      rr += (ec.length() + 0.005 - rr) * smoothstep(0.9, 1, t);
      pts.push(dirs[k].clone().multiplyScalar(rr));
    }
    pts[0].copy(A); pts[K].copy(ec.clone().addScaledVector(n, 0.003));
    const P = smoothPath(THREE, pts, S(48, 24)).reverse(); // Start an der Elektrode: Weg = Abstand vom Gehirn
    const len = tube(P, 0.0048, mat(cRb.clone().lerp(cGr, 0.5), 0, 0.6, KIND.CABLE, i), { seg: S(7, 5) });
    info.cables[i] = { len };
  });

  /* ================================================================== 10. Stamm-Buendel (geflochten) */
  {
    const sp = probe.stemAt;
    const defs = [
      { a: hubC.clone().addScaledVector(hubD, -0.044).add(V(0.035, 0.01, 0)), t: 0.62, side: 1 },
      { a: hubC.clone().addScaledVector(hubD, -0.044).add(V(-0.035, 0.01, 0)), t: 0.4, side: -1 },
      { a: V(0, colTopY + 0.004, colZ - 0.03), t: 0.18, side: 0 },
    ];
    defs.forEach((df, b) => {
      const c = sp(df.t, [0, 0, 0]);
      const r = 0.078 - 0.026 * df.t;
      const end = V(c[0] + df.side * r * 0.45, c[1] - r * 0.85, c[2]);
      const mid = df.a.clone().lerp(end, 0.5).add(V(df.side * 0.02, -0.03, 0));
      const P = smoothPath(THREE, [df.a, mid, end], S(40, 20));
      const F = rmfFrames(THREE, P);
      const arc = [0];
      for (let i = 1; i < P.length; i++) arc.push(arc[i - 1] + P[i].distanceTo(P[i - 1]));
      const L = arc[arc.length - 1];
      for (let s = 0; s < 3; s++) {
        const strand = P.map((p, i) => {
          const a = (arc[i] / 0.06) * Math.PI * 2 + (s / 3) * Math.PI * 2;
          return p.clone().addScaledVector(F.N[i], Math.cos(a) * 0.0105).addScaledVector(F.B[i], Math.sin(a) * 0.0105);
        }).reverse();
        const M = s === 0 ? mat(cRb.clone().lerp(sig, 0.06), 0, 0.6, KIND.CABLE, 12 + b) : RB;
        tube(strand, 0.0078, M, { seg: S(7, 5) });
      }
      info.cables[12 + b] = { len: L, loop: true };
      for (const pp of [P[1], P[P.length - 2]]) {
        const d = P[P.length - 1].clone().sub(P[0]).normalize();
        cyl(pp, d, 0.02, 0.02, 0.01, TIP, 14);
      }
    });
  }

  return { geometry: B.toGeometry(), glows, info, ring: ringR, boards, layouts, vertexCount: B.n, triCount: B.idx.length / 3 };
}

/* =================================================================== Szene-Teil (mit DOM, Uniforms, Animation) */
/**
 * @param ctx   Szenen-Kontext
 * @param data  Ergebnis von buildBrain (fuer die Kopplung an die Erregungswellen)
 * @param o     { headShape, seg }
 */
export function createHardware(ctx, data, o) {
  const { THREE, palette, anchors: A, director, shared, quality } = ctx;
  const SEG = { high: 1, medium: 0.66, low: 0.45 };
  const C = A.brain.center.clone();
  const built = buildHardware({
    THREE,
    R: A.brain.radii.clone(),
    C,
    root: A.cableRoot.clone().sub(C),
    neckTop: A.neck.top.clone().sub(C),
    headShape: o.headShape,
    palette,
    seg: SEG[quality] ?? 1,
  });
  const group = new THREE.Group();
  group.name = 'brain:hardware';

  /* ---------- Atlas */
  const at = buildAtlas(built.layouts, quality === 'low' ? 0.5 : 1);
  const tex = new THREE.DataTexture(at.data, at.width, at.height, THREE.RGBAFormat);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = quality === 'high' ? Math.min(2, ctx.renderer.capabilities.getMaxAnisotropy()) : 1;
  tex.needsUpdate = true;

  /* ---------- Uniforms */
  const fan = built.info.fan || { c: new THREE.Vector3(), ax: new THREE.Vector3(0, 0, 1) };
  const col = (k, f) => (palette[k] ? palette[k].clone() : new THREE.Color(TOKENS[k])).multiplyScalar(f);
  const U = {
    uHwTime: shared.uTime,
    uScanY: shared.uScanY || { value: 9 },
    uScanOn: { value: 1 },
    uXray: { value: 0 },
    uHwAlpha: { value: 1 },
    uHwNear: { value: new THREE.Vector2(0.07, 0.26) },
    uHwSig: { value: palette.signal.clone() },
    uHwIce: { value: palette.ice.clone().multiplyScalar(1.2) },
    uHwEmber: { value: palette.ember.clone() },
    uHwGold: { value: col('gold', 1) },
    uHwAtlas: { value: tex },
    uElec: { value: new Array(18).fill(0) },
    uCab: { value: new Array(18).fill(-1) },
    uPad: { value: new Array(6).fill(0) },
    uSock: { value: 0 },
    uRun: { value: 1 },
    uPcbOn: { value: 0.5 },
    uPcb: { value: col('pcb', 1) },
    uPcbCu: { value: col('pcb', 1).lerp(palette.steel, 0.55) },
    uSilk: { value: palette.mist.clone().multiplyScalar(0.9) },
    uRimX: { value: palette.signal.clone().multiplyScalar(0.65) },
    uRimK: { value: 0 },
    uFanC: { value: fan.c.clone() },
    uFanAx: { value: fan.ax.clone().normalize() },
    uFanCS: { value: new THREE.Vector2(1, 0) },
    uHwRes: shared.uResolution,
  };
  const ownScan = !shared.uScanY;
  const mat = makeHardwareMaterial(THREE, U, { envMap: ctx.envMap, envIntensity: 0.4 });
  const mesh = new THREE.Mesh(built.geometry, mat);
  mesh.renderOrder = 5; // vor den additiven Punkten des Gehirns (die Hardware schreibt Tiefe)
  mesh.frustumCulled = false; // Luefter dreht im Shader, Kamera oft mitten drin
  group.add(mesh);

  /* ---------- Leuchtpunkte */
  const G = built.glows;
  const gGeo = new THREE.InstancedBufferGeometry();
  gGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  gGeo.setIndex([0, 1, 2, 0, 2, 3]);
  const aG = new Float32Array(G.length * 4); const aGC = new Float32Array(G.length * 4); const aGI = new Float32Array(G.length);
  G.forEach((g, i) => {
    aG.set([g[0], g[1], g[2], g[3]], i * 4);
    aGC.set([g[4], g[5], g[6], g[7]], i * 4);
    aGI[i] = g[8];
  });
  gGeo.setAttribute('aG', new THREE.InstancedBufferAttribute(aG, 4));
  gGeo.setAttribute('aGC', new THREE.InstancedBufferAttribute(aGC, 4));
  gGeo.setAttribute('aGI', new THREE.InstancedBufferAttribute(aGI, 1));
  gGeo.instanceCount = G.length;
  const gMat = makeGlowMaterial(THREE, U);
  const glowMesh = new THREE.Mesh(gGeo, gMat);
  glowMesh.frustumCulled = false;
  glowMesh.renderOrder = 17;
  group.add(glowMesh);

  /* ---------- Kopplung an die Erregungswellen: naechste Nervenzelle je Elektrode, Draht, Polster */
  const nP = data.neurons.pos; const nM = data.neurons.meta; const nCount = data.neurons.count;
  const sites = [...built.info.elec, ...built.info.wires, ...built.info.pads];
  const arr = new Float32Array(sites.length * CASCADES);
  sites.forEach((p, s) => {
    let best = -1; let bd = 1e9;
    for (let i = 0; i < nCount; i++) {
      if (nM[i * 4 + 3] > 0.5) continue; // nur Rinde
      const dx = nP[i * 3] - p.x; const dy = nP[i * 3 + 1] - p.y; const dz = nP[i * 3 + 2] - p.z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    for (let k = 0; k < CASCADES; k++) {
      const src = k < 4 ? data.neurons.arr0 : data.neurons.arr1;
      const raw = best >= 0 ? src[best * 4 + (k % 4)] : 65535;
      arr[s * CASCADES + k] = raw >= 65535 ? 1e9 : (raw / 65535) * ARR_SCALE + Math.sqrt(bd) / 0.45;
    }
  });
  const nE = built.info.elec.length; const nW = built.info.wires.length; const nPd = built.info.pads.length;
  const env = new Float32Array(sites.length);
  const cabStart = new Float32Array(18).fill(-100);
  const reach = data.cascades.reach;
  const cabLen = built.info.cables.map((c) => (c ? c.len : 0));
  let fanAng = 0;

  // Werte der Erregungswelle an einer Stelle (gleiche Form wie im Shader der Rinde, etwas breiter)
  const waveAt = (s, clocks, amps) => {
    let v = 0;
    for (let k = 0; k < CASCADES; k++) {
      const a = arr[s * CASCADES + k];
      if (a > 1e8) continue;
      const gate = (1 - smoothstep(reach[k] * 0.5, reach[k], a)) * amps[k];
      if (gate <= 0) continue;
      const x = clocks[k] - a;
      const h = Math.max(1 - x * x * 7, 0);
      const tr = x > 0 ? Math.pow(Math.max(1 - x * 0.6, 0), 4) * 0.3 : 0;
      v += (h * h * h + tr) * gate;
    }
    return v;
  };

  /* ---------- Flugschneise pruefen (nur dev.html): kleinster Abstand Kamerapfad zu Hardware */
  if (ctx.dev) {
    try {
      const shots = director._shotsL;
      const z1 = director.beat('zoom').end; const c1 = director.beat('cables');
      const g1 = c1.start + 0.1 * (c1.end - c1.start);
      const pos = built.geometry.getAttribute('position');
      const cam = new THREE.Vector3(); let minD = 9; let minG = 0;
      const pts = [];
      for (let i = 0; i < pos.count; i += 3) pts.push(pos.getX(i) + C.x, pos.getY(i) + C.y, pos.getZ(i) + C.z);
      for (let s = 0; s <= 300; s++) {
        const g = z1 + (s / 300) * (g1 - z1);
        let shot = shots[0];
        for (const sh of shots) if (g >= sh.t0) shot = sh;
        if (!shot.posCurve) continue;
        shot.posCurve.getPointAt(clamp01(shot.sPos(Math.min(Math.max(g, shot.t0), shot.t1))), cam);
        for (let i = 0; i < pts.length; i += 3) {
          const dx = pts[i] - cam.x; const dy = pts[i + 1] - cam.y; const dz = pts[i + 2] - cam.z;
          const d = dx * dx + dy * dy + dz * dz;
          if (d < minD) { minD = d; minG = g; }
        }
      }
      minD = Math.sqrt(minD);
      ctx.hwCorridor = { min: minD, at: minG };
      if (minD < 0.12) console.warn(`Gehirn-Hardware: nur ${minD.toFixed(3)} Abstand zur Kamera bei global ${minG.toFixed(4)} (Schneise 0.12)`);
    } catch (e) { /* Director ohne Pfad (Test) */ }
  }

  const api = {
    group,
    info: built.info,
    stats: { tris: built.triCount, verts: built.vertexCount, glows: G.length },
    update(time, dt, st) {
      const zm = director.beat('zoom'); const br = director.beat('brain'); const cb = director.beat('cables');
      const inCables = director.global >= cb.start;
      /* Scan und Roentgen (gleiche Formeln wie robot.js, solange engine.shared sie nicht liefert) */
      const dissolve = smoothstep(0.3, 0.84, zm.p);
      if (ownScan) {
        U.uScanY.value = dissolve <= 0 ? 9 : 1.15 - 2.35 * smoothstep(0, 0.62, dissolve) - 2.4 * smoothstep(0.62, 1, dissolve);
      }
      U.uScanOn.value = dissolve < 0.999 && !inCables ? 1 : 0;
      const xr = (shared.uXray ? shared.uXray.value : smoothstep(0.42, 0.62, zm.p)) * (1 - smoothstep(0.0, 0.18, cb.p));
      U.uXray.value = xr;
      // Kapitel Kabel (ohne Kopf): leichte Kontur, damit der KI-Kern vor dem dunklen Raum lesbar bleibt
      U.uRimK.value = 0.45 * smoothstep(0.0, 0.2, cb.p);
      // Runde 2: Beim Eintauchen verschwindet die Hardware ganz (Version 4: brain@0.19 bis 0.4). Im Gehirn bleiben nur Neuronen,
      // Impulse und Licht, keine Platinen oder Klammern direkt vor der Linse. Zurueck kommt sie erst in der Kabel-
      // Uebersicht (cables@0.02 bis 0.18), wenn die Kamera das Gehirn von aussen sieht.
      const hide = inCables ? 1 - smoothstep(0.02, 0.18, cb.p) : smoothstep(0.19, 0.4, br.p);
      const hwA = st.weight * (1 - hide);
      U.uHwAlpha.value = hwA;
      mesh.visible = hwA > 0.002;
      glowMesh.visible = mesh.visible;
      // Nahe Hardware blendet zusaetzlich mit dem Abstand aus (Kabel-Uebersicht, Kamera dicht am Kopf)
      const dive = smoothstep(0.2, 0.46, br.p) * (1 - smoothstep(0.85, 0.97, br.p));
      U.uHwNear.value.set(0.07 + 0.13 * dive, 0.26 + 0.42 * dive);
      U.uPcbOn.value = 0.25 + 0.75 * smoothstep(0.45, 0.95, zm.p);
      U.uSock.value = inCables ? 1 : smoothstep(0.55, 0.85, br.p);
      U.uRun.value = 0.4 + 0.6 * smoothstep(0.5, 1, zm.p);

      /* Luefter: Leerlauf 0.6 U/s, ab brain 0.5 schneller */
      const rps = 0.6 + 0.6 * smoothstep(0.29, 0.6, br.p);
      fanAng = (fanAng + dt * rps * Math.PI * 2) % (Math.PI * 2);
      U.uFanCS.value.set(Math.cos(fanAng), Math.sin(fanAng));

      /* Elektroden, Draehte, Polster: Erregungswelle mit Nachleuchten (0.6 s) */
      const k = Math.exp(-dt / 0.6);
      const on = st.reveal;
      for (let s = 0; s < sites.length; s++) {
        const v = Math.min(1.2, waveAt(s, st.clocks, st.amps));
        const prev = env[s];
        env[s] = Math.max(env[s] * k, v);
        if (s < nE && prev < 0.5 && env[s] >= 0.5 && time - cabStart[s] > 1.1) cabStart[s] = time;
      }
      for (let i = 0; i < nE; i++) U.uElec.value[i] = env[i] * on;
      for (let i = 0; i < nW; i++) U.uElec.value[12 + i] = env[nE + i] * on;
      for (let i = 0; i < nPd; i++) U.uPad.value[i] = env[nE + nW + i] * on;
      /* Lichtpakete: Elektroden-Kabel nach dem Aufleuchten, Buendel und Rueckenmark laufend */
      for (let i = 0; i < 18; i++) {
        const L = cabLen[i] || 0;
        if (!L) { U.uCab.value[i] = -1; continue; }
        if (i < nE) {
          const p = (time - cabStart[i]) * 0.6;
          U.uCab.value[i] = p < L + 0.05 ? p : -1;
        } else {
          const per = (L + 0.3) / 0.45;
          const ph = ((time + i * 0.71) % per) / per;
          U.uCab.value[i] = ph * (L + 0.3) - 0.1;
        }
      }
    },
    dispose() {
      built.geometry.dispose();
      gGeo.dispose();
      mat.dispose();
      gMat.dispose();
      tex.dispose();
      group.clear();
    },
  };
  return api;
}
