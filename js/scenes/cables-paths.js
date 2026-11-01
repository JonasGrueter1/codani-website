// Szene "cables": Kabelverlauf und Geometrie (einmal beim Erzeugen gerechnet, danach nur Shader).
//
// Aufbau eines Kabels
//   Wurzel   Die Fasern treten gefaechert aus dem Hirnstamm (ANCHORS.cableRoot), wie Nervenwurzeln.
//   Stamm    Alle fuenf Buendel laufen nebeneinander nach hinten unten bis zum Verzweigungspunkt.
//   Ast      Von dort schwingt jedes Buendel in einem weichen Bogen zu seinem Knoten.
//   Ende     Kurz vor dem Knoten faechern die Fasern auf und tauchen in die Glaskugel ein.
//
// Jede Faser ist ein Band (zwei Vertices pro Stuetzpunkt), das der Vertex-Shader im Bildschirmraum
// auf seine Breite zieht. So bleiben auch sehr feine Fasern aus jeder Entfernung sauber (keine Treppchen).

export const STRANDS = { high: 11, medium: 7, low: 4 };   // Fasern pro Buendel (inkl. Kernfaser)
export const SAMPLES = { high: 240, medium: 150, low: 96 }; // Stuetzpunkte pro Faser
export const RING_SEG = { high: 160, medium: 112, low: 80 };
export const MOTES = { high: 1400, medium: 700, low: 320 };

const BUNDLE_R = 0.034;     // Radius eines Buendels
const SHEATH_W = 0.098;     // Breite des Glasmantels
const TRUNK_SPREAD = 0.05;  // Abstand der Buendel im gemeinsamen Stamm

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

export function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Mittellinien der fuenf Kabel. Reihenfolge = Object.keys(ANCHORS.nodes).
 * @returns {{ name, index, node: Vector3, inDir: Vector3, length: number, pts: Float32Array, s: Float32Array, count }[]}
 */
export function buildCurves(THREE, A, samples) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const root = A.cableRoot.clone();
  const R = A.nodeRadius;
  const names = Object.keys(A.nodes);
  // Verzweigungspunkt hinter dem Kopf, etwas unter der Wurzel
  const split = root.clone().add(V(0, -0.3, -1.95));
  const trunkDir = V(0, -0.16, -1).normalize();
  const tmp = new THREE.Vector3();

  return names.map((name, c) => {
    const N = A.nodes[name].clone();
    // Buendel liegen im Stamm nebeneinander (Kreis um die Stammachse)
    const ang = (c / names.length) * Math.PI * 2 + 0.4;
    const off = V(Math.cos(ang), Math.sin(ang) * 0.8, 0).multiplyScalar(TRUNK_SPREAD);
    const r0 = root.clone().addScaledVector(off, 0.5);
    const t0 = split.clone().add(off);

    // Anflug von unten vorne: das Kabel steigt in die Kugel, statt quer davor vorbeizulaufen
    const toSplit = tmp.copy(split).sub(N).normalize();
    const inDir = toSplit.clone().multiplyScalar(0.62).add(V(0, -0.82, 0)).normalize();
    const end = N.clone().addScaledVector(inDir, R * 0.68);
    const span = t0.distanceTo(end);

    const path = new THREE.CurvePath();
    path.add(new THREE.CubicBezierCurve3(
      r0,
      r0.clone().add(V(0, -0.34, -0.5)),
      t0.clone().addScaledVector(trunkDir, -0.75),
      t0,
    ));
    path.add(new THREE.CubicBezierCurve3(
      t0.clone(),
      t0.clone().addScaledVector(trunkDir, span * (0.3 + 0.04 * (c % 2))),
      end.clone().addScaledVector(inDir, span * 0.38),
      end,
    ));

    // Gleichmaessig nach Bogenlaenge abtasten, s = exakte Laenge entlang der Abtastung
    const pts = new Float32Array(samples * 3);
    const s = new Float32Array(samples);
    const p = new THREE.Vector3();
    const prev = new THREE.Vector3();
    let acc = 0;
    for (let i = 0; i < samples; i++) {
      path.getPointAt(i / (samples - 1), p);
      if (i > 0) acc += p.distanceTo(prev);
      prev.copy(p);
      pts.set([p.x, p.y, p.z], i * 3);
      s[i] = acc;
    }
    return { name, index: c, node: N, inDir, length: acc, pts, s, count: samples };
  });
}

/** Paralleltransport-Rahmen entlang einer Punktliste (keine Verdrehung wie bei Frenet) */
function frames(THREE, pts, count) {
  const T = [];
  const Nn = [];
  const B = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(count - 1, i + 1);
    a.fromArray(pts, i0 * 3);
    b.fromArray(pts, i1 * 3);
    T.push(b.clone().sub(a).normalize());
  }
  // Start-Normale: moeglichst "oben"
  let n = new THREE.Vector3(0, 1, 0);
  if (Math.abs(n.dot(T[0])) > 0.9) n.set(1, 0, 0);
  n.addScaledVector(T[0], -n.dot(T[0])).normalize();
  for (let i = 0; i < count; i++) {
    if (i > 0) n.addScaledVector(T[i], -n.dot(T[i])).normalize();
    Nn.push(n.clone());
    B.push(new THREE.Vector3().crossVectors(T[i], n).normalize());
  }
  return { T, N: Nn, B };
}

/**
 * Band-Geometrie aller Fasern und Glasmaentel (ein Draw Call).
 * Attribute: position (Mittelpunkt), aTan (Richtung), aData (Seite, s, Kabel, Zufall), aMeta (Breite, Art, Helligkeit, Phase)
 * Art: 0 = Faser, 1 = Glasmantel.
 */
export function buildFibreGeometry(THREE, curves, strandsPer) {
  const rnd = mulberry32(4711);
  const lines = []; // { P: Float32Array, s: Float32Array, n, cable, seed, width, kind, gain }

  for (const cv of curves) {
    const { pts, s, count, length: L, index: c } = cv;
    const F = frames(THREE, pts, count);
    const twist = (c % 2 ? 1 : -1) * (0.85 + 0.25 * rnd());
    for (let j = 0; j < strandsPer; j++) {
      const core = j === 0;
      const a0 = core ? 0 : ((j - 1) / Math.max(1, strandsPer - 1)) * Math.PI * 2 + rnd() * 0.5;
      const baseR = core ? 0 : BUNDLE_R * (0.5 + 0.5 * rnd());
      const rootR = core ? 0.02 : 0.05 + rnd() * 0.11;
      const rootLift = core ? 0 : (rnd() - 0.3) * 0.08;
      const fanR = core ? 0 : 0.06 + rnd() * 0.09;
      const wob = rnd() * Math.PI * 2;
      const seed = rnd();
      const P = new Float32Array(count * 3);
      const q = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const si = s[i];
        // Radius: Wurzel gefaechert -> Buendel (leicht atmend) -> Ende gefaechert
        let r = baseR * (1 + 0.28 * Math.sin(si * 1.25 + wob));
        r = r + (rootR - r) * (1 - smoothstep(0, 0.95, si));
        r = r + (fanR - r) * smoothstep(L - 0.95, L, si);
        const th = a0 + twist * si;
        q.fromArray(pts, i * 3)
          .addScaledVector(F.N[i], Math.cos(th) * r)
          .addScaledVector(F.B[i], Math.sin(th) * r);
        // Wurzeln greifen leicht ins Gehirn hinauf
        q.y += rootLift * (1 - smoothstep(0, 0.5, si));
        P.set([q.x, q.y, q.z], i * 3);
      }
      lines.push({
        P, s, n: count, cable: c, seed,
        width: core ? 0.0085 : 0.0042 + rnd() * 0.0026,
        kind: 0,
        gain: core ? 1.0 : 0.55 + rnd() * 0.35,
        phase: rnd(),
      });
    }
    // Glasmantel: nur im mittleren Teil (Wurzeln und Enden bleiben offen)
    const i0 = s.findIndex((v) => v > 0.55);
    let i1 = count - 1;
    while (i1 > 0 && s[i1] > L - 0.8) i1--;
    const n = i1 - i0 + 1;
    lines.push({
      P: pts.slice(i0 * 3, (i1 + 1) * 3), s: s.slice(i0, i1 + 1), n, cable: c, seed: rnd(),
      width: SHEATH_W, kind: 1, gain: 1, phase: 0,
    });
  }

  let verts = 0;
  let quads = 0;
  for (const l of lines) { verts += l.n * 2; quads += l.n - 1; }
  const position = new Float32Array(verts * 3);
  const aTan = new Float32Array(verts * 3);
  const aData = new Float32Array(verts * 4);
  const aMeta = new Float32Array(verts * 4);
  const index = verts > 65535 ? new Uint32Array(quads * 6) : new Uint16Array(quads * 6);
  let v = 0;
  let k = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (const l of lines) {
    const base = v;
    for (let i = 0; i < l.n; i++) {
      a.fromArray(l.P, Math.max(0, i - 1) * 3);
      b.fromArray(l.P, Math.min(l.n - 1, i + 1) * 3);
      b.sub(a).normalize();
      for (let side = -1; side <= 1; side += 2) {
        position[v * 3] = l.P[i * 3];
        position[v * 3 + 1] = l.P[i * 3 + 1];
        position[v * 3 + 2] = l.P[i * 3 + 2];
        aTan[v * 3] = b.x;
        aTan[v * 3 + 1] = b.y;
        aTan[v * 3 + 2] = b.z;
        aData[v * 4] = side;
        aData[v * 4 + 1] = l.s[i];
        aData[v * 4 + 2] = l.cable;
        aData[v * 4 + 3] = l.seed;
        aMeta[v * 4] = l.width;
        aMeta[v * 4 + 1] = l.kind;
        aMeta[v * 4 + 2] = l.gain;
        aMeta[v * 4 + 3] = l.phase;
        v++;
      }
      if (i < l.n - 1) {
        const p0 = base + i * 2;
        index[k++] = p0; index[k++] = p0 + 1; index[k++] = p0 + 2;
        index[k++] = p0 + 1; index[k++] = p0 + 3; index[k++] = p0 + 2;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('aTan', new THREE.BufferAttribute(aTan, 3));
  g.setAttribute('aData', new THREE.BufferAttribute(aData, 4));
  g.setAttribute('aMeta', new THREE.BufferAttribute(aMeta, 4));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

/**
 * Orbit-Ringe um die Knoten (zwei pro Knoten). Die Lage rechnet der Vertex-Shader (drehen ohne CPU).
 * position = (Winkel, Seite, Ring), aNode = Knoten-Index.
 */
export function buildRingGeometry(THREE, nodeCount, seg) {
  const rings = 2;
  const per = (seg + 1) * 2;
  const verts = nodeCount * rings * per;
  const position = new Float32Array(verts * 3);
  const aNode = new Float32Array(verts);
  const idx = [];
  let v = 0;
  for (let n = 0; n < nodeCount; n++) {
    for (let r = 0; r < rings; r++) {
      const base = v;
      for (let i = 0; i <= seg; i++) {
        const ang = (i / seg) * Math.PI * 2;
        for (let side = -1; side <= 1; side += 2) {
          position[v * 3] = ang;
          position[v * 3 + 1] = side;
          position[v * 3 + 2] = r;
          aNode[v] = n;
          v++;
        }
        if (i < seg) {
          const p0 = base + i * 2;
          idx.push(p0, p0 + 1, p0 + 2, p0 + 1, p0 + 3, p0 + 2);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('aNode', new THREE.BufferAttribute(aNode, 1));
  g.setIndex(idx);
  return g;
}

/**
 * Staubteilchen: meist in einer lockeren Huelle um die Kabel, einige frei im Raum.
 * aRnd = (Phase, Groesse, Helligkeit, Erscheinen). Erscheinen folgt grob dem Wachstum der Kabel.
 */
export function buildMoteGeometry(THREE, curves, n) {
  const rnd = mulberry32(90210);
  const pos = new Float32Array(n * 3);
  const r4 = new Float32Array(n * 4);
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const free = rnd() < 0.3;
    let appear;
    if (free) {
      p.set((rnd() * 2 - 1) * 7, (rnd() * 2 - 1) * 3.6, 1 - rnd() * 13);
      appear = rnd() * 0.5;
    } else {
      const cv = curves[Math.floor(rnd() * curves.length)];
      const t = Math.pow(rnd(), 0.8);
      const k = Math.min(cv.count - 1, Math.floor(t * (cv.count - 1)));
      // Abstand zum Kabel: meist nah, selten weiter weg
      const rad = 0.12 + Math.pow(rnd(), 2.2) * 1.4;
      const th = rnd() * Math.PI * 2;
      const ph = Math.acos(rnd() * 2 - 1);
      p.fromArray(cv.pts, k * 3);
      p.x += Math.sin(ph) * Math.cos(th) * rad;
      p.y += Math.cos(ph) * rad * 0.7;
      p.z += Math.sin(ph) * Math.sin(th) * rad;
      appear = 0.1 + t * 0.75;
    }
    pos.set([p.x, p.y, p.z], i * 3);
    r4.set([rnd(), rnd(), 0.25 + 0.75 * rnd() * rnd(), appear], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRnd', new THREE.BufferAttribute(r4, 4));
  return g;
}

/** Billboard-Quads der Knoten (instanziert, ein Draw Call) */
export function buildNodeGeometry(THREE, curves) {
  const plane = new THREE.PlaneGeometry(2, 2);
  const g = new THREE.InstancedBufferGeometry();
  g.index = plane.index;
  g.setAttribute('position', plane.getAttribute('position'));
  // aIdx = Knoten-Index je Instanz; die Szene sortiert ihn pro Frame von hinten nach vorne
  const ids = new Float32Array(curves.map((_, i) => i));
  const attr = new THREE.InstancedBufferAttribute(ids, 1);
  attr.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('aIdx', attr);
  g.instanceCount = curves.length;
  return { geometry: g, dispose: () => { plane.dispose(); g.dispose(); } };
}
