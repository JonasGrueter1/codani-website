// Szene "dna": Geometrie-Daten (einmal in create()).
//   glyphs     Instanzen fuer alle Zeichen: zwei Straenge aus Code, Klammer-Paare an den Basenpaaren, Staub.
//              Dazu pro Zeichen der Ausflug ins Website-Geruest (Startzeit, Dauer, Ziel quer/hoch).
//   rungs      Basenpaare (Instanzen eines Bandes mit zwei Haelften)
//   wire       Elemente des Website-Geruests (Instanzen, Form per SDF im Shader)
// Alles, was sich bewegt, rechnet der Shader aus diesen Daten. Pro Frame aendern sich nur Uniforms.
import { CAMERA_KEYS, DNA_FROM } from '../config.js';
import { ADVANCE, BLOCK } from './dna-atlas.js';
import { CODE_A, CODE_B, CLS, tokenize, wireframeSpec } from './dna-code.js';

export const GROOVE = Math.PI * 0.74;   // Winkel zwischen den Straengen (grosse/kleine Furche wie echte DNA)
export const BP_PER_TURN = 10.5;         // Basenpaare pro Windung

export const QUALITY = {
  high: { lines: 4, adv: 0.05, gap: 0.1, cell: 0.1, dust: 1400, rungSeg: 12, bandSeg: 1400 },
  medium: { lines: 3, adv: 0.056, gap: 0.12, cell: 0.122, dust: 650, rungSeg: 8, bandSeg: 900 },
  low: { lines: 2, adv: 0.07, gap: 0.13, cell: 0.13, dust: 260, rungSeg: 6, bandSeg: 600 },
};
/** halbe Breite des Rueckgrat-Bandes eines Strangs (Code-Zeilen plus Rand) */
export const bandHalfWidth = (q) => ((q.lines - 1) / 2) * q.gap + q.gap * 0.62;

// Zeitplan in local (siehe dna.js)
const LEAD = 5.0;        // ein Zeichen loest sich, wenn die Kamera noch so weit davor ist
const FLY_MIN = 0.44;    // vorher fliegt nichts
const FLY_END = 0.58;    // das Ende der Helix loest sich zuletzt, bevor die Headline im Geruest erscheint (kein Knaeuel)
const DUR_MIN = 0.07;
const DUR_MAX = 0.28;
const FADE_AFTER = 0.05; // Zeichen hinter der Kamera verloeschen kurz nach dem Vorbeiflug
const FLY_SHARE = 0.3;    // Anteil der Kontur-Zeichen, die wirklich fliegen (der Rest verglueht an Ort)

/**
 * Startzeiten der Helix: vor der Kamera fliegen die Zeichen ab FLY_MIN ins Geruest (linear entlang der Achse
 * bis FLY_END am Ende der Helix, so ist die Helix aufgeloest, bevor das Geruest fertig ist). Was die Kamera
 * vorher passiert, verloescht: im Tunnel kurz nach dem Vorbeiflug, in der Uebergangszone schon davor
 * (sonst stuenden einzelne grosse Zeichen neben der Kamera).
 */
function makeRelease(pass, zStart, zEnd) {
  let lo = zEnd;
  let hi = zStart;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (pass(m + LEAD) >= FLY_MIN) lo = m; else hi = m;
  }
  const zFly = lo;
  return (z) => {
    if (z <= zFly) {
      const t = Math.min(1, Math.max(0, (zFly - z) / Math.max(1e-6, zFly - zEnd)));
      return { rel: FLY_MIN + (FLY_END - FLY_MIN) * t, fly: true };
    }
    const p = pass(z);
    const k = Math.min(1, Math.max(0, (p - 0.34) / 0.1));
    return { rel: p + FADE_AFTER * (1 - k) - 0.12 * k, fly: false };
  };
}

export function mulberry32(a) {
  return function rnd() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Kamera-z ueber local (stueckweise linear aus CAMERA_KEYS), daraus: wann passiert die Kamera z?
 * Keys mit `zTrack` (Kamera ausserhalb der Helix, Ansicht von aussen) zaehlen mit diesem Wert statt pos.z.
 * Version 4: Die Szene laeuft erst ab dna@DNA_FROM (davor fliegt die Kamera aus der Kabel-Uebersicht heran).
 * Die Keys sind im Beat verankert (dna@p) und werden hier in local umgerechnet: local = (p - DNA_FROM) / (1 - DNA_FROM).
 * Keys vor dem Start der Szene zaehlen nicht, der Startwert kommt vom letzten Key bei oder vor local 0.
 */
function cameraTrack() {
  const toLocal = (k) => (parseFloat(String(k.at).split('@')[1]) - DNA_FROM) / Math.max(1e-6, 1 - DNA_FROM);
  const zOf = (k) => (k.zTrack ?? k.pos[2]);
  const dnaKeys = CAMERA_KEYS.filter((k) => String(k.at).startsWith('dna@'));
  const before = CAMERA_KEYS.filter((k) => !String(k.at).startsWith('dna@') && CAMERA_KEYS.indexOf(k) < CAMERA_KEYS.indexOf(dnaKeys[0]));
  const keys = [];
  let first = -1;
  for (let i = 0; i < dnaKeys.length; i++) if (toLocal(dnaKeys[i]) <= 1e-6) first = i;
  const startKey = first >= 0 ? dnaKeys[first] : before[before.length - 1];
  const next = dnaKeys[first + 1];
  if (startKey && next) keys.push({ p: 0, z: Math.max(zOf(startKey), zOf(next) + 0.5) });
  for (let i = first + 1; i < dnaKeys.length; i++) keys.push({ p: toLocal(dnaKeys[i]), z: zOf(dnaKeys[i]) });
  return (z) => {
    if (!keys.length) return 0.5;
    if (z >= keys[0].z) return keys[0].p;
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1];
      const b = keys[i];
      if (z >= b.z) return a.p + ((b.p - a.p) * (a.z - z)) / Math.max(1e-6, a.z - b.z);
    }
    const last = keys[keys.length - 1];
    return last.p + (last.z - z) * 0.04;
  };
}

/* ======================================================= Website-Geruest */
function toCenter(box, kind, w, h) {
  if (!box) return null;
  if (kind === 2) return [box[0] - w / 2, h / 2 - box[1], box[2], box[2]];
  const [x0, y0, x1, y1] = box;
  return [(x0 + x1) / 2 - w / 2, h / 2 - (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2];
}

function perimeter(kind, r) {
  if (!r) return 0;
  if (kind === 1) return 2 * r[2];
  if (kind === 2) return 2 * Math.PI * r[2];
  if (kind === 4) return 0;
  return 4 * (r[2] + r[3]);
}

// Punkt auf der Kontur bei Parameter d (0..1) und Seite sg (+1/-1). Gleiche Parametrisierung wie im Shader.
function contourPoint(kind, r, d, sg) {
  if (kind === 1) return [r[0] - r[2] + 2 * r[2] * d, r[1]];
  if (kind === 2) {
    const th = Math.PI / 2 + sg * d * Math.PI;
    return [r[0] + Math.cos(th) * r[2], r[1] + Math.sin(th) * r[2]];
  }
  const th = (3 * Math.PI) / 4 + sg * d * Math.PI;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const k = 1 / Math.max(Math.abs(c), Math.abs(s));
  return [r[0] + c * k * r[2], r[1] + s * k * r[3]];
}

export function buildWire(anchors) {
  const W = anchors.wireframe.width;
  const H = anchors.wireframe.height;
  const spec = wireframeSpec(W, H);
  const els = spec.els.map((e) => ({
    ...e,
    rl: toCenter(e.L, e.kind, W, H),
    rp: toCenter(e.P, e.kind, H, W),
  }));
  return { W, H, els, texts: spec.texts };
}

/* ============================================================== Zeichen */
export function buildGlyphs(anchors, atlas, q, wire) {
  const { start, end, radius: R, turnLength } = anchors.dna;
  const c = turnLength / (2 * Math.PI);
  const kArc = Math.hypot(R, c);
  const zStart = start.z;
  const zEnd = end.z;
  const rnd = mulberry32(0x5eed42);
  const pass = cameraTrack();
  const releaseAt = makeRelease(pass, zStart, zEnd);
  const G = [];

  // Straenge: je Strang ein Band aus q.lines Code-Zeilen
  const tokens = [tokenize(CODE_A, 0), tokenize(CODE_B, 1)];
  const arcMax = ((zStart - zEnd) / c) * kArc;
  const nSlots = Math.floor(arcMax / q.adv);
  for (let s = 0; s < 2; s++) {
    const tk = tokens[s];
    for (let j = 0; j < q.lines; j++) {
      const o = (j - (q.lines - 1) / 2) * q.gap;
      const dTh = ((o * -c) / kArc) / R;
      const dz = -(o * R) / kArc;
      const edge = Math.abs(o) / Math.max(1e-6, (q.gap * (q.lines - 1)) / 2 || 1);
      const prof = 1 - 0.42 * edge * edge;
      const radial = 1 - 0.03 * edge * edge;
      let ti = Math.floor(rnd() * tk.length);
      for (let k = 0; k < nSlots; k++) {
        const t = tk[ti % tk.length];
        ti++;
        if (t.ch === ' ') continue;
        const phi = (k * q.adv) / kArc;
        const z = zStart - phi * c + dz;
        if (z > zStart + 0.02 || z < zEnd) continue;
        G.push({
          th: phi + s * GROOVE + dTh, z, r: R * radial, kind: s,
          ch: atlas.index(t.ch), cls: t.cls, seed: rnd(), size: q.cell * (0.9 + 0.2 * rnd()), prof,
        });
      }
    }
  }

  // Basenpaare und ihre Klammern
  const rungs = [];
  const pairs = [['<', '>'], ['{', '}'], ['(', ')'], ['[', ']']];
  const dPhi = (2 * Math.PI) / BP_PER_TURN;
  for (let i = 1; ; i++) {
    const phi = i * dPhi;
    const z = zStart - phi * c;
    if (z < zEnd + 0.15) break;
    const type = rnd();
    const pr = pairs[Math.floor(rnd() * pairs.length)];
    const seed = rnd();
    rungs.push({ th: phi, z, seed, warm: type < 0.18 ? 1 : 0 });
    for (let e = 0; e < 2; e++) {
      G.push({
        th: phi + e * GROOVE, z, r: R * 0.93, kind: 3,
        ch: atlas.index(pr[e]), cls: CLS.bracket, seed: rnd(), size: q.cell * 1.15, prof: 1,
      });
    }
  }

  // Ausloesen: vorne fliegen die Zeichen ins Geruest, hinten verloeschen sie nach dem Vorbeiflug
  const fly = [];
  for (const g of G) {
    const { rel, fly: f } = releaseAt(g.z);
    if (f && g.kind !== 3) {
      g.rel = rel + (rnd() - 0.5) * 0.012;
      g.mode = 1;
      fly.push(g);
    } else {
      g.rel = f ? rel - 0.01 : rel;
      g.mode = 0;
    }
    g.dur = 0.1;
  }
  for (const r of rungs) {
    const { rel, fly: f } = releaseAt(r.z);
    r.unzip = f ? 1 : 0;
    r.rel = f ? rel - 0.012 : rel;
  }
  fly.sort((a, b) => a.rel - b.rel);
  const taken = new Uint8Array(fly.length);

  const frameEl = wire.els.find((e) => e.id === 'frame');
  const randomFramePoint = (layout) => {
    const r = layout === 'L' ? frameEl.rl : frameEl.rp;
    return contourPoint(0, r, rnd(), rnd() < 0.5 ? -1 : 1);
  };

  // Texte: Ziel-Zeichen, Ankunft gestaffelt (Zeichen fuer Zeichen)
  const textTargets = [];
  for (const t of wire.texts) {
    if (!t.L) continue; // jedes Zeichen braucht ein Ziel im Querformat (Hochformat-Ziel ist optional)
    const chars = [...t.str];
    const cls = CLS[t.cls] ?? CLS.label;
    const place = (spec, w, h) => {
      if (!spec) return null;
      const [x, y, size, align] = spec;
      const adv = size * ADVANCE;
      const x0 = align === 'c' ? x - (chars.length * adv) / 2 : x;
      return chars.map((_, i) => [x0 + (i + 0.5) * adv - w / 2, h / 2 - y, size]);
    };
    const pl = place(t.L, wire.W, wire.H);
    const pp = place(t.P, wire.H, wire.W);
    chars.forEach((ch, i) => {
      if (ch === ' ') return;
      textTargets.push({
        arr: t.t0 + i * 0.0025,
        L: pl[i],
        P: pp ? pp[i] : null,
        ch: ch === BLOCK ? atlas.index(BLOCK) : atlas.index(ch),
        cls,
        layer: t.layer,
      });
    });
  }
  // Fuer jedes Text-Zeichen das passende fliegende Zeichen (Start etwa 0.14 vor der Ankunft)
  const rels = fly.map((g) => g.rel);
  const lowerBound = (v) => {
    let lo = 0;
    let hi = rels.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (rels[m] < v) lo = m + 1; else hi = m; }
    return lo;
  };
  for (const tt of textTargets) {
    const want = tt.arr - 0.14;
    let i0 = Math.min(fly.length - 1, lowerBound(want));
    let best = -1;
    for (let d = 0; d < fly.length && best < 0; d++) {
      for (const i of [i0 - d, i0 + d]) {
        if (i >= 0 && i < fly.length && !taken[i] && fly[i].rel <= tt.arr - DUR_MIN) { best = i; break; }
      }
    }
    if (best < 0) continue;
    taken[best] = 1;
    const g = fly[best];
    g.mode = 2;
    g.dur = Math.min(DUR_MAX, Math.max(DUR_MIN, tt.arr - g.rel));
    g.rel = tt.arr - g.dur;
    const fp = tt.P || randomFramePoint('P');
    g.tL = [tt.L[0], tt.L[1], tt.L[2], tt.layer];
    g.tP = [fp[0], fp[1], tt.P ? tt.P[2] : q.cell * 0.6, tt.P ? 1 : 0];
    g.fin = [tt.ch, tt.cls];
  }

  // Uebrige fliegende Zeichen: auf die Konturen (Ankunft = Zeitpunkt, an dem die Kontur dort gezeichnet wird)
  const rest = [];
  fly.forEach((g, i) => {
    if (taken[i]) return;
    if (rnd() < FLY_SHARE) rest.push(g);
    else g.mode = 0; // verglueht beim Aufreissen
  });
  const lineEls = wire.els.filter((e) => e.rl && e.kind !== 4);
  const total = lineEls.reduce((s, e) => s + perimeter(e.kind, e.rl) * (0.6 + 0.4 * e.bright), 0);
  const points = [];
  for (const e of lineEls) {
    const share = (perimeter(e.kind, e.rl) * (0.6 + 0.4 * e.bright)) / total;
    const n = Math.round(share * rest.length);
    for (let i = 0; i < n; i++) {
      const d = (i + rnd()) / n;
      const sg = rnd() < 0.5 ? -1 : 1;
      const pL = contourPoint(e.kind, e.rl, d, sg);
      let pP;
      let layerP = e.layer;
      if (e.rp) pP = contourPoint(e.kind, e.rp, d, sg);
      else { pP = randomFramePoint('P'); layerP = 0; }
      points.push({ arr: e.t0 + e.dur * d, L: pL, P: pP, layer: e.layer, layerP });
    }
  }
  points.sort((a, b) => a.arr - b.arr);
  const m = Math.min(points.length, rest.length);
  for (let i = 0; i < rest.length; i++) {
    const g = rest[i];
    if (i >= m) { g.mode = 0; continue; }
    const p = points[Math.floor((i * points.length) / rest.length)];
    let dur = p.arr - g.rel;
    if (dur < DUR_MIN) { g.rel = p.arr - DUR_MIN; dur = DUR_MIN; }
    if (dur > DUR_MAX) { g.rel = p.arr - DUR_MAX; dur = DUR_MAX; }
    g.dur = dur;
    g.mode = 1;
    g.tL = [p.L[0], p.L[1], q.cell * 0.55, p.layer];
    g.tP = [p.P[0], p.P[1], q.cell * 0.55, 0];
  }

  // Staub: einzelne Zeichen im Raum um die Helix (Tiefe, Parallaxe)
  const dustChars = '01{}[]()<>/;:=+*#&%$.,_-ACGT';
  for (let i = 0; i < q.dust; i++) {
    const r = 1.75 + 3.4 * Math.sqrt(rnd());
    const z = zStart + 3 - rnd() * (zStart + 3 - (anchors.wireframe.center.z - 5));
    G.push({
      th: rnd() * Math.PI * 2, z, r, kind: 2,
      ch: atlas.index(dustChars[Math.floor(rnd() * dustChars.length)]), cls: CLS.dust, seed: rnd(),
      size: q.cell * (0.7 + 0.7 * rnd()), prof: 0.5 + 0.5 * rnd(), mode: 3, rel: 2, dur: 1,
    });
  }

  // Packen
  const n = G.length;
  const aHel = new Float32Array(n * 4);
  const aChr = new Float32Array(n * 4);
  const aFly = new Float32Array(n * 4);
  const aTgt = new Float32Array(n * 4);
  const aTgtP = new Float32Array(n * 4);
  const aFin = new Float32Array(n * 4);
  G.forEach((g, i) => {
    const k = i * 4;
    aHel.set([g.th, g.z, g.r, g.kind], k);
    aChr.set([g.ch, g.cls, g.seed, g.size], k);
    const swirl = 0.22 + rnd() * 0.36; // wenig Drall: klare Bahnen statt Knaeuel
    aFly.set([g.rel, g.dur, g.mode, swirl], k);
    aTgt.set(g.tL || [0, 0, g.size, 0], k);
    aTgtP.set(g.tP || [0, 0, g.size, 0], k);
    aFin.set([g.fin ? g.fin[0] : g.ch, g.fin ? g.fin[1] : g.cls, g.prof, 0], k);
  });
  return { count: n, attrs: { aHel, aChr, aFly, aTgt, aTgtP, aFin }, rungs, stats: { fly: fly.length, text: textTargets.length, points: points.length } };
}

/* ===================================================== Rueckgrat-Baender */
// Je Strang ein Band (zwei Schienen mit feiner Flaeche), auf dem die Code-Zeilen laufen.
export function buildBandGeometry(THREE, anchors, q) {
  const { start, end, turnLength } = anchors.dna;
  const c = turnLength / (2 * Math.PI);
  const phiMax = (start.z - end.z) / c;
  const releaseAt = makeRelease(cameraTrack(), start.z, end.z);
  const n = q.bandSeg;
  const data = [];
  const idx = [];
  for (let s = 0; s < 2; s++) {
    const base = data.length / 4;
    for (let i = 0; i <= n; i++) {
      const phi = (i / n) * phiMax;
      const z = start.z - phi * c;
      const { rel, fly } = releaseAt(z);
      const r = fly ? rel - 0.008 : rel;
      // etwas ueber die Schienen hinaus (|v| bis 1.25), damit die Schiene beidseitig kantengeglaettet ist
      data.push(phi, -1.25, s, r, phi, 1.25, s, r);
    }
    for (let i = 0; i < n; i++) {
      const a = base + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((data.length / 4) * 3), 3));
  geo.setAttribute('aBand', new THREE.Float32BufferAttribute(data, 4));
  geo.setIndex(idx);
  return geo;
}

/* =========================================================== Basenpaare */
export function buildRungGeometry(THREE, rungs, seg) {
  // Zwei Haelften (A bis Mitte, Mitte bis B), je seg Abschnitte, zwei Seiten
  const pos = [];
  const idx = [];
  for (let h = 0; h < 2; h++) {
    const base = pos.length / 3;
    for (let i = 0; i <= seg; i++) {
      const u = h === 0 ? (i / seg) * 0.5 : 0.5 + (i / seg) * 0.5;
      pos.push(u, -1, h, u, 1, h);
    }
    for (let i = 0; i < seg; i++) {
      const a = base + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const a = new Float32Array(rungs.length * 4);
  const b = new Float32Array(rungs.length * 4);
  rungs.forEach((r, i) => {
    a.set([r.th, r.z, r.seed, r.warm], i * 4);
    b.set([r.rel, r.unzip, 0, 0], i * 4);
  });
  geo.setAttribute('aRung', new THREE.InstancedBufferAttribute(a, 4));
  geo.setAttribute('aRung2', new THREE.InstancedBufferAttribute(b, 4));
  geo.instanceCount = rungs.length;
  return geo;
}

/* ======================================================= Geruest-Mesh */
export function buildWireGeometry(THREE, wire) {
  const plane = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', plane.getAttribute('position'));
  geo.setIndex(plane.getIndex());
  const els = wire.els;
  const n = els.length;
  const aR = new Float32Array(n * 4);
  const aRP = new Float32Array(n * 4);
  const aS = new Float32Array(n * 4);
  const aT = new Float32Array(n * 4);
  const hidden = [0, 0, -1, -1];
  els.forEach((e, i) => {
    aR.set(e.rl || hidden, i * 4);
    aRP.set(e.rp || hidden, i * 4);
    aS.set([e.r || 0, e.rP ?? e.r ?? 0, e.sw || 0, e.kind], i * 4);
    aT.set([e.t0, e.dur, e.layer, e.bright], i * 4);
  });
  const aF = new Float32Array(els.map((e) => e.fill || 0));
  geo.setAttribute('aR', new THREE.InstancedBufferAttribute(aR, 4));
  geo.setAttribute('aRP', new THREE.InstancedBufferAttribute(aRP, 4));
  geo.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 4));
  geo.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 4));
  geo.setAttribute('aF', new THREE.InstancedBufferAttribute(aF, 1));
  geo.instanceCount = n;
  plane.dispose();
  return geo;
}
