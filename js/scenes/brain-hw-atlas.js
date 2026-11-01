// Szene "brain", Gehirn-Hardware: Platinen-Layouts und Atlas-Textur.
// Ein Layout beschreibt jede Platine einmal (Masse in Einheiten, Ursprung in der Mitte, u nach rechts, v nach oben,
// so gesehen von der Bauteilseite). Daraus entstehen sowohl die 3D-Bauteile (brain-hardware.js) als auch die Textur:
//   R  Kupfer unter dem Loetstopplack (Leiterbahnen 1.0, Masseflaeche schwach)
//   G  blankes Gold (Pads, Vias, Steckkontakte)
//   B  Phase der Lichtimpulse entlang einer Leiterbahn (0 = keine Impulse, sonst 1..255)
//   A  Bestueckungsdruck (weiss) bzw. Gravur/Druck auf den Chips
// Alles prozedural (eigener Rasterizer, Schrift ueber ein Canvas), deterministisch.
import { mulberry32 } from './brain-build.js';

/* ------------------------------------------------------------------ Layouts */
// Bauteil: { t: 'soc'|'mem'|'cap'|'smd'|'led'|'hdr'|'fins'|'fan', u, v, w, h, ... }
function templeLayout(f) {
  // f = +1: vorne (Gesicht) liegt rechts (+u), f = -1: vorne liegt links
  const U = (u) => u * f;
  const comps = [
    { t: 'soc', u: U(-0.005), v: 0.012, w: 0.085, h: 0.085, label: 'soc' },
    { t: 'mem', u: U(0.083), v: 0.036, w: 0.05, h: 0.024, label: 'mem' },
    { t: 'mem', u: U(0.083), v: -0.002, w: 0.05, h: 0.024, label: 'mem' },
    { t: 'mem', u: U(-0.093), v: 0.036, w: 0.05, h: 0.024, label: 'mem2' },
    { t: 'mem', u: U(-0.093), v: -0.002, w: 0.05, h: 0.024, label: 'mem2' },
    // Runde 2: kein Kuehlkoerper mehr (wirkte wie ein Modellbausatz), dafuer ein flaches Graphitmodul
    { t: 'soc', u: U(-0.163), v: 0.006, w: 0.05, h: 0.1, label: 'plain' },
    { t: 'hdr', u: U(0.005), v: 0.079, w: 0.07, h: 0.016, pins: 7 },
    { t: 'cap', u: U(0.14), v: -0.035, r: 0.012, hgt: 0.024 },
    { t: 'cap', u: U(0.168), v: -0.035, r: 0.012, hgt: 0.024 },
    { t: 'led', u: U(0.17), v: -0.068, c: 0 },
    { t: 'led', u: U(0.153), v: -0.068, c: 0 },
    { t: 'led', u: U(0.136), v: -0.068, c: 1 },
  ];
  const smd = [[0.05, -0.052], [0.065, -0.052], [0.08, -0.052], [-0.05, -0.05], [-0.065, -0.05], [0.12, 0.012],
    [0.12, -0.004], [-0.125, -0.066], [0.045, 0.066], [-0.045, 0.066]];
  for (const [u, v] of smd) comps.push({ t: 'smd', u: U(u), v, w: 0.009, h: 0.005 });
  return {
    w: 0.4, h: 0.19,
    chamfer: { corner: f > 0 ? 'tr' : 'tl', a: 0.1, b: 0.095 }, // vorne oben abgeschraegt (Platz fuer das Ohrmodul)
    holes: [[U(-0.186), 0.081], [U(-0.186), -0.081], [U(0.186), -0.081], [U(0.06), 0.081]],
    fingers: { u0: U(-0.096), u1: U(0.096), n: 24, v0: -0.095, v1: -0.077 },
    comps,
    buses: [
      // SoC -> Speicher vorne
      { n: 6, pitch: 0.0042, w: 0.0016, pts: [[U(0.0375), 0.036], [U(0.058), 0.036]] },
      { n: 6, pitch: 0.0042, w: 0.0016, pts: [[U(0.0375), -0.002], [U(0.058), -0.002]] },
      // SoC -> Speicher hinten
      { n: 6, pitch: 0.0042, w: 0.0016, pts: [[U(-0.0475), 0.036], [U(-0.068), 0.036]] },
      { n: 6, pitch: 0.0042, w: 0.0016, pts: [[U(-0.0475), -0.002], [U(-0.068), -0.002]] },
      // SoC -> Steckkontakte unten (gefaechert)
      { n: 10, pitch: 0.0062, w: 0.0018, pulse: 0.5, pts: [[U(-0.005), -0.03], [U(-0.005), -0.045], [U(-0.005), -0.06], [U(0), -0.074]] },
      // Stecker oben -> SoC (Elektroden-Signale)
      { n: 6, pitch: 0.0045, w: 0.0016, pulse: 0.8, pts: [[U(0.005), 0.071], [U(0.005), 0.055]] },
      // Speicher -> Steckkontakte
      { n: 5, pitch: 0.0042, w: 0.0016, pts: [[U(0.083), -0.014], [U(0.083), -0.03], [U(0.068), -0.045], [U(0.068), -0.074]] },
      { n: 5, pitch: 0.0042, w: 0.0016, pts: [[U(-0.093), -0.014], [U(-0.093), -0.03], [U(-0.078), -0.045], [U(-0.078), -0.074]] },
    ],
    leds: 3,
    silk: [], // Runde 2: kein lesbarer Aufdruck (wirkte wie ein Bausatz)
  };
}

function backLayout() {
  // Tablar hinter dem Kleinhirn, Bauteile oben. v+ = nach hinten (zur Schale), v- = nach vorne (zum Gehirn)
  const comps = [
    // Runde 2: ohne Luefter und Kuehlrippen, flache Module ohne Aufdruck
    { t: 'soc', u: 0.083, v: 0.012, w: 0.086, h: 0.086, label: 'soc2' },
    { t: 'soc', u: -0.112, v: -0.012, w: 0.12, h: 0.1, label: 'plain' },
    { t: 'mem', u: 0.178, v: 0.04, w: 0.024, h: 0.048, label: 'mem', rot: 1 },
    { t: 'mem', u: 0.178, v: -0.018, w: 0.024, h: 0.048, label: 'mem', rot: 1 },
    { t: 'hdr', u: 0.083, v: -0.08, w: 0.08, h: 0.014, pins: 8 },
    { t: 'cap', u: -0.012, v: -0.068, r: 0.012, hgt: 0.024 },
    { t: 'cap', u: 0.014, v: -0.068, r: 0.012, hgt: 0.024 },
    { t: 'cap', u: -0.012, v: 0.066, r: 0.01, hgt: 0.02 },
    { t: 'led', u: 0.14, v: -0.083, c: 0 },
    { t: 'led', u: 0.157, v: -0.083, c: 0 },
    { t: 'led', u: 0.174, v: -0.083, c: 0 },
    { t: 'led', u: 0.191, v: -0.083, c: 1 },
  ];
  const smd = [[0.13, -0.058], [0.145, -0.058], [0.16, -0.058], [0.01, 0.05], [0.025, 0.05], [-0.03, -0.05], [-0.03, -0.035],
    [-0.2, 0.05], [-0.2, 0.035], [0.035, -0.088]];
  for (const [u, v] of smd) comps.push({ t: 'smd', u, v, w: 0.009, h: 0.005 });
  return {
    w: 0.42, h: 0.19,
    chamfer: null,
    holes: [[-0.194, 0.079], [0.194, 0.079], [-0.194, -0.079], [0.194, -0.079]],
    fingers: { u0: 0.0, u1: 0.16, n: 20, v0: 0.079, v1: 0.094 },
    comps,
    buses: [
      { n: 7, pitch: 0.0044, w: 0.0016, pts: [[0.126, 0.04], [0.15, 0.04], [0.166, 0.04]] },
      { n: 7, pitch: 0.0044, w: 0.0016, pts: [[0.126, -0.018], [0.15, -0.018], [0.166, -0.018]] },
      { n: 9, pitch: 0.0056, w: 0.0018, pulse: 0.5, pts: [[0.06, -0.031], [0.06, -0.045], [0.035, -0.066], [0.0, -0.066], [-0.025, -0.084]] },
      { n: 6, pitch: 0.0045, w: 0.0016, pulse: 0.8, pts: [[0.083, -0.073], [0.083, -0.031]] },
      { n: 5, pitch: 0.0045, w: 0.0016, pulse: 0.5, pts: [[0.04, 0.03], [0.0, 0.03], [-0.02, 0.05], [-0.045, 0.05]] },
      { n: 10, pitch: 0.0062, w: 0.0018, pulse: 0.4, pts: [[0.083, 0.055], [0.083, 0.066], [0.08, 0.08]] },
    ],
    leds: 4,
    silk: [],
  };
}

function riserLayout() {
  // Steigplatine hinter dem Hinterhauptlappen, Bauteile zum Gehirn. Sichtbar beim Flug hinten hinaus
  const comps = [
    { t: 'mem', u: -0.105, v: 0.03, w: 0.05, h: 0.024, label: 'mem2' },
    { t: 'mem', u: -0.045, v: 0.03, w: 0.05, h: 0.024, label: 'mem' },
    { t: 'mem', u: 0.015, v: 0.03, w: 0.05, h: 0.024, label: 'mem' },
    { t: 'mem', u: 0.075, v: 0.03, w: 0.05, h: 0.024, label: 'mem2' },
    { t: 'soc', u: -0.06, v: -0.045, w: 0.07, h: 0.07, label: 'soc' },
    { t: 'hdr', u: 0.075, v: 0.105, w: 0.07, h: 0.014, pins: 7 },
    { t: 'hdr', u: -0.075, v: 0.105, w: 0.07, h: 0.014, pins: 7 },
    { t: 'cap', u: 0.04, v: -0.07, r: 0.011, hgt: 0.022 },
    { t: 'cap', u: 0.066, v: -0.07, r: 0.011, hgt: 0.022 },
    { t: 'cap', u: 0.092, v: -0.07, r: 0.011, hgt: 0.022 },
    { t: 'led', u: 0.125, v: 0.075, c: 0 },
    { t: 'led', u: 0.125, v: 0.058, c: 1 },
  ];
  const smd = [[0.03, -0.03], [0.045, -0.03], [0.06, -0.03], [0.075, -0.03], [0.09, -0.03], [0.115, -0.04], [0.115, -0.025],
    [-0.13, -0.08], [-0.115, -0.08], [0.0, 0.075]];
  for (const [u, v] of smd) comps.push({ t: 'smd', u, v, w: 0.009, h: 0.005 });
  return {
    w: 0.3, h: 0.25,
    chamfer: null,
    holes: [[-0.136, 0.111], [0.136, 0.111], [-0.136, -0.111], [0.136, -0.111]],
    fingers: { u0: -0.1, u1: 0.1, n: 18, v0: -0.125, v1: -0.11 },
    comps,
    buses: [
      { n: 8, pitch: 0.0044, w: 0.0016, pulse: 0.4, pts: [[-0.06, -0.01], [-0.06, 0.005], [-0.045, 0.017]] },
      { n: 6, pitch: 0.0044, w: 0.0016, pulse: 0.6, pts: [[-0.105, 0.042], [-0.105, 0.06], [-0.09, 0.075], [-0.075, 0.097]] },
      { n: 6, pitch: 0.0044, w: 0.0016, pulse: 0.6, pts: [[0.075, 0.042], [0.075, 0.097]] },
      { n: 12, pitch: 0.0058, w: 0.0018, pulse: 0.5, pts: [[-0.025, -0.06], [0.0, -0.085], [0.0, -0.109]] },
      { n: 5, pitch: 0.0044, w: 0.0016, pts: [[-0.095, -0.045], [-0.12, -0.045], [-0.13, -0.06]] },
    ],
    leds: 2,
    silk: [],
  };
}

export function boardLayouts() {
  return { tempL: templeLayout(1), tempR: templeLayout(-1), back: backLayout(), riser: riserLayout() };
}

// Bereiche im Atlas (Pixel, Ursprung unten links). Chip-Beschriftungen: gemeinsame Felder pro Typ.
export const ATLAS_SIZE = { w: 1024, h: 832 };
export const REGIONS = {
  tempL: [0, 0, 512, 244],
  tempR: [512, 0, 512, 244],
  back: [0, 256, 512, 244],
  soc: [512, 256, 192, 192],
  soc2: [704, 256, 192, 192],
  mem: [896, 256, 128, 64],
  mem2: [896, 320, 128, 64],
  hdr: [896, 384, 128, 32],
  riser: [0, 512, 384, 320], // 0.30 x 0.25
  plain: [1000, 740, 16, 16], // leeres Feld (nur Grundfarbe)
};

/* ------------------------------------------------------------------ Rasterizer */
class Raster {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint8Array(w * h * 4);
  }
  put(x, y, ch, v) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4 + ch;
    if (v > this.d[i]) this.d[i] = v;
  }
  set(x, y, ch, v) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[(y * this.w + x) * 4 + ch] = v;
  }
  get(x, y, ch) { return this.d[(y * this.w + x) * 4 + ch]; }
  rect(x0, y0, x1, y1, ch, v, mode = 'max') {
    const ax = Math.max(0, Math.floor(Math.min(x0, x1))); const bx = Math.min(this.w - 1, Math.ceil(Math.max(x0, x1)));
    const ay = Math.max(0, Math.floor(Math.min(y0, y1))); const by = Math.min(this.h - 1, Math.ceil(Math.max(y0, y1)));
    for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
      if (mode === 'set') this.set(x, y, ch, v); else this.put(x, y, ch, v);
    }
  }
  disc(cx, cy, r, ch, v, mode = 'max') {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const c = Math.min(1, Math.max(0, r + 0.5 - d));
        if (c <= 0) continue;
        if (mode === 'set') { if (c > 0.5) this.set(x, y, ch, v); } else this.put(x, y, ch, Math.round(v * c));
      }
    }
  }
  // Segment mit Breite w (Pixel), weiche Kanten. phase: { a0, per, off } schreibt Impuls-Phase in B
  seg(ax, ay, bx, by, w, ch, v, phase) {
    const dx = bx - ax; const dy = by - ay;
    const L2 = dx * dx + dy * dy || 1e-9;
    const L = Math.sqrt(L2);
    const r = w * 0.5 + 1;
    for (let y = Math.floor(Math.min(ay, by) - r); y <= Math.ceil(Math.max(ay, by) + r); y++) {
      for (let x = Math.floor(Math.min(ax, bx) - r); x <= Math.ceil(Math.max(ax, bx) + r); x++) {
        const px = x + 0.5 - ax; const py = y + 0.5 - ay;
        const t = Math.min(1, Math.max(0, (px * dx + py * dy) / L2));
        const d = Math.hypot(px - dx * t, py - dy * t);
        const c = Math.min(1, Math.max(0, w * 0.5 + 0.5 - d));
        if (c <= 0) continue;
        this.put(x, y, ch, Math.round(v * c));
        if (phase && c > 0.35) {
          const s = (phase.a0 + t * L) / phase.per + phase.off;
          const f = s - Math.floor(s);
          this.set(x, y, 2, 1 + Math.round(f * 254));
        }
      }
    }
    return L;
  }
}

// Parallel versetzte Polylinie (Gehrung), o in Einheiten der Punkte
function offsetLine(pts, o) {
  const n = pts.length;
  const out = [];
  const nrm = (a, b) => {
    const dx = b[0] - a[0]; const dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  for (let i = 0; i < n; i++) {
    let m;
    if (i === 0) m = nrm(pts[0], pts[1]);
    else if (i === n - 1) m = nrm(pts[n - 2], pts[n - 1]);
    else {
      const a = nrm(pts[i - 1], pts[i]); const b = nrm(pts[i], pts[i + 1]);
      const mx = a[0] + b[0]; const my = a[1] + b[1]; const ml = Math.hypot(mx, my) || 1;
      const k = 1 / Math.max(0.5, (mx / ml) * a[0] + (my / ml) * a[1]);
      m = [(mx / ml) * k, (my / ml) * k];
    }
    out.push([pts[i][0] + m[0] * o, pts[i][1] + m[1] * o]);
  }
  return out;
}

/* ------------------------------------------------------------------ Schrift */
function makeTextCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  return null;
}
function fontFamily() {
  try {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.check('500 20px "Geist Mono"')) return '"Geist Mono", monospace';
  } catch (e) { /* ohne Schrift-API */ }
  return 'monospace';
}
// Zeichnet Text (aufrecht) in den A-Kanal: Mitte (cx, cy) in Atlas-Pixeln, Hoehe px
function drawText(R, lines, cx, cy, px, opts = {}) {
  const cw = Math.ceil(px * Math.max(...lines.map((l) => l.length)) * 0.72 + 8);
  const lh = Math.ceil(px * 1.25);
  const ch = lh * lines.length + 6;
  const cv = makeTextCanvas(cw, ch);
  if (!cv) return;
  const g = cv.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, cw, ch);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `${opts.weight || 500} ${px}px ${fontFamily()}`;
  lines.forEach((l, i) => g.fillText(l, cw / 2, 3 + lh * (i + 0.5)));
  const img = g.getImageData(0, 0, cw, ch).data;
  const x0 = Math.round(cx - cw / 2); const y0 = Math.round(cy - ch / 2);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const a = img[(y * cw + x) * 4 + 3];
      if (a) R.put(x0 + x, y0 + (ch - 1 - y), 3, a);
    }
  }
}

/* ------------------------------------------------------------------ Atlas */
/**
 * Erzeugt die Atlas-Daten (Uint8Array RGBA, Ursprung unten links). scale: 1 (high/medium) oder 0.5 (low).
 */
export function buildAtlas(layouts, scale = 1) {
  const W = Math.round(ATLAS_SIZE.w * scale);
  const H = Math.round(ATLAS_SIZE.h * scale);
  const R = new Raster(W, H);
  const rnd = mulberry32(9177);
  const reg = (k) => REGIONS[k].map((v) => v * scale);

  for (const key of ['tempL', 'tempR', 'back', 'riser']) {
    const L = layouts[key];
    const [rx, ry, rw, rh] = reg(key);
    const sx = rw / L.w; const sy = rh / L.h;
    const P = (u, v) => [rx + (u + L.w / 2) * sx, ry + (v + L.h / 2) * sy];
    const S = (d) => d * sx;
    const inBoard = (u, v) => {
      if (Math.abs(u) > L.w / 2 - 0.004 || Math.abs(v) > L.h / 2 - 0.004) return false;
      const c = L.chamfer;
      if (c) {
        const du = c.corner === 'tr' ? u - (L.w / 2 - c.a) : -(u + (L.w / 2 - c.a));
        const dv = v - (L.h / 2 - c.b);
        if (du > 0 && dv > 0 && du / c.a + dv / c.b > 1 - 0.04) return false;
      }
      return true;
    };
    // Masseflaeche: feines Kreuzraster, nur innerhalb der Platine
    for (let y = Math.floor(ry); y < ry + rh; y++) {
      for (let x = Math.floor(rx); x < rx + rw; x++) {
        const u = (x + 0.5 - rx) / sx - L.w / 2; const v = (y + 0.5 - ry) / sy - L.h / 2;
        if (!inBoard(u, v)) continue;
        const hx = (x % Math.max(3, Math.round(6 * scale))) === 0 || (y % Math.max(3, Math.round(6 * scale))) === 0;
        R.set(x, y, 0, hx ? 46 : 30);
      }
    }
    const keep = [];
    // Bauteile: Freiraum in der Masseflaeche, Pads, Druck
    for (const c of L.comps) {
      if (c.t === 'cap') {
        const [x, y] = P(c.u, c.v);
        R.disc(x, y, S(c.r + 0.004), 0, 0, 'set');
        R.disc(x, y, S(c.r + 0.0025), 3, 230);
        R.disc(x, y, S(c.r + 0.0012), 3, 0, 'set');
        keep.push([c.u, c.v, c.r + 0.004, c.r + 0.004]);
        continue;
      }
      if (c.t === 'fan') {
        const [x, y] = P(c.u, c.v);
        R.disc(x, y, S(c.r + 0.006), 3, 220);
        R.disc(x, y, S(c.r + 0.0045), 3, 0, 'set');
        keep.push([c.u, c.v, c.r + 0.004, c.r + 0.004]);
        continue;
      }
      const hw = (c.w || 0.01) / 2; const hh = (c.h || 0.01) / 2;
      const [x0, y0] = P(c.u - hw - 0.004, c.v - hh - 0.004);
      const [x1, y1] = P(c.u + hw + 0.004, c.v + hh + 0.004);
      R.rect(x0, y0, x1, y1, 0, 0, 'set');
      keep.push([c.u, c.v, hw + 0.004, hh + 0.004]);
      if (c.t === 'mem') {
        // Anschlussbeinchen als Goldpads an den Langseiten
        const vert = c.rot === 1;
        const n = 8;
        for (let i = 0; i < n; i++) {
          const f = (i + 0.5) / n - 0.5;
          for (const s of [-1, 1]) {
            const pu = vert ? c.u + s * (hw + 0.0022) : c.u + f * (c.w - 0.006);
            const pv = vert ? c.v + f * (c.h - 0.006) : c.v + s * (hh + 0.0022);
            const [a0, b0] = P(pu - (vert ? 0.0028 : 0.0011), pv - (vert ? 0.0011 : 0.0028));
            const [a1, b1] = P(pu + (vert ? 0.0028 : 0.0011), pv + (vert ? 0.0011 : 0.0028));
            R.rect(a0, b0, a1, b1, 1, 255);
          }
        }
      }
      if (c.t === 'smd' || c.t === 'led') {
        const w2 = c.t === 'led' ? 0.004 : hw;
        for (const s of [-1, 1]) {
          const [a0, b0] = P(c.u + s * w2 - 0.0016, c.v - 0.0022);
          const [a1, b1] = P(c.u + s * w2 + 0.0016, c.v + 0.0022);
          R.rect(a0, b0, a1, b1, 1, 255);
        }
      }
      if (c.t === 'soc' || c.t === 'mem' || c.t === 'hdr' || c.t === 'fins') {
        // Umriss im Bestueckungsdruck, Pin-1-Markierung
        const m = c.t === 'fins' ? 0.003 : 0.0045;
        const [a0, b0] = P(c.u - hw - m, c.v - hh - m);
        const [a1, b1] = P(c.u + hw + m, c.v + hh + m);
        const t = Math.max(1.2, S(0.0011));
        R.seg(a0, b0, a1, b0, t, 3, 235); R.seg(a1, b0, a1, b1, t, 3, 235);
        R.seg(a1, b1, a0, b1, t, 3, 235); R.seg(a0, b1, a0, b0, t, 3, 235);
        if (c.t !== 'fins') R.disc(a0 - S(0.003), b1 + S(0.003), S(0.0016), 3, 240);
      }
    }
    const blocked = (u, v, pad = 0.002) => !inBoard(u, v) || keep.some(([cu, cv, hw, hh]) => Math.abs(u - cu) < hw + pad && Math.abs(v - cv) < hh + pad);

    // Steckkontakte unten
    const F = L.fingers;
    for (let i = 0; i < F.n; i++) {
      const u = F.u0 + ((i + 0.5) / F.n) * (F.u1 - F.u0);
      const pw = Math.abs(F.u1 - F.u0) / F.n * 0.32;
      const [a0, b0] = P(u - pw, F.v0);
      const [a1, b1] = P(u + pw, F.v1);
      R.rect(a0, b0, a1, b1, 1, 255);
    }
    // Befestigungsloecher: Goldring, dunkle Mitte
    for (const [u, v] of L.holes) {
      const [x, y] = P(u, v);
      R.disc(x, y, S(0.0085), 0, 0, 'set');
      R.disc(x, y, S(0.0062), 1, 255);
      R.disc(x, y, S(0.0034), 1, 0, 'set');
      R.disc(x, y, S(0.0034), 3, 0, 'set');
    }
    // Busse (parallele Bahnen, 45-Grad-Knicke), einzelne Bahnen mit Impulsen
    const lanes = [];
    for (const b of L.buses) {
      const pts = b.pts;
      for (let k = 0; k < b.n; k++) {
        const o = (k - (b.n - 1) / 2) * b.pitch;
        lanes.push({ pts: offsetLine(pts, o), w: b.w, pulse: rnd() < (b.pulse ?? 0.15) });
      }
    }
    // Freie Bahnen: zufaellige 45-Grad-Wege zwischen zwei Vias, weichen den Bauteilen aus
    const dirs = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];
    const nFree = key === 'back' ? 34 : 28;
    for (let i = 0; i < nFree; i++) {
      let u = (rnd() - 0.5) * (L.w - 0.03); let v = (rnd() - 0.5) * (L.h - 0.03);
      if (blocked(u, v, 0.006)) continue;
      const pts = [[u, v]];
      let d = Math.floor(rnd() * 8);
      const steps = 3 + Math.floor(rnd() * 4);
      for (let s = 0; s < steps; s++) {
        const len = 0.012 + rnd() * 0.035;
        let ok = false;
        for (let tries = 0; tries < 4 && !ok; tries++) {
          const nu = u + dirs[d][0] * len; const nv = v + dirs[d][1] * len;
          let free = true;
          for (let q = 1; q <= 6; q++) {
            if (blocked(u + dirs[d][0] * len * q / 6, v + dirs[d][1] * len * q / 6, 0.003)) { free = false; break; }
          }
          if (free) { u = nu; v = nv; pts.push([u, v]); ok = true; } else d = (d + (rnd() < 0.5 ? 1 : 7)) % 8;
        }
        if (!ok) break;
        d = (d + [0, 1, 7, 0, 1, 7][Math.floor(rnd() * 6)]) % 8;
      }
      if (pts.length < 2) continue;
      const lane = { pts, w: 0.0014 + rnd() * 0.0008, pulse: rnd() < 0.15, via: true };
      lanes.push(lane);
      // Doppelbahn daneben (wirkt wie echte Leitungspaare)
      if (rnd() < 0.45) lanes.push({ pts: offsetLine(pts, 0.0038), w: lane.w, pulse: false, via: true });
    }
    for (const ln of lanes) {
      const pp = ln.pts.map(([u, v]) => P(u, v));
      const per = S(0.16);
      const ph = ln.pulse ? { a0: 0, per, off: rnd() } : null;
      let acc = 0;
      for (let i = 0; i < pp.length - 1; i++) {
        if (ph) ph.a0 = acc;
        acc += R.seg(pp[i][0], pp[i][1], pp[i + 1][0], pp[i + 1][1], Math.max(1.1, S(ln.w)), 0, 255, ph);
      }
      if (ln.via) {
        for (const q of [pp[0], pp[pp.length - 1]]) {
          R.disc(q[0], q[1], Math.max(1.4, S(0.0024)), 1, 255);
          R.disc(q[0], q[1], Math.max(0.6, S(0.0011)), 1, 60, 'set');
        }
      }
    }
    // Bestueckungsdruck: Beschriftungen
    for (const t of L.silk) {
      if (t.skip && scale < 1) continue;
      const [x, y] = P(t.u, t.v);
      drawText(R, [t.text], x, y, Math.max(7, S(t.size)));
    }
  }

  // Runde 2: keine lesbaren Chip-Beschriftungen mehr, nur Pin-1-Punkt und Rahmen (ruhige, dunkle Module)
  {
    // Pin-1-Punkte und Rahmenlinie auf den grossen Chips
    for (const k of ['soc', 'soc2']) {
      const [x, y, w, h] = reg(k);
      R.disc(x + w * 0.12, y + h * 0.88, 6 * scale, 3, 200);
      const t = 2 * scale;
      R.seg(x + w * 0.05, y + h * 0.05, x + w * 0.95, y + h * 0.05, t, 3, 120);
      R.seg(x + w * 0.95, y + h * 0.05, x + w * 0.95, y + h * 0.95, t, 3, 120);
      R.seg(x + w * 0.95, y + h * 0.95, x + w * 0.05, y + h * 0.95, t, 3, 120);
      R.seg(x + w * 0.05, y + h * 0.95, x + w * 0.05, y + h * 0.05, t, 3, 120);
    }
    for (const k of ['mem', 'mem2']) {
      const [x, y, , h] = reg(k);
      R.disc(x + 10 * scale, y + h - 10 * scale, 4 * scale, 3, 200);
    }
  }
  return { data: R.d, width: W, height: H, scale };
}

/** Atlas-UV (0..1) fuer einen Punkt (u, v) auf einer Platine bzw. relative Lage (fu, fv) 0..1 in einem Feld */
export function regionUV(key, fu, fv, scale = 1) {
  const [x, y, w, h] = REGIONS[key];
  return [(x + fu * w) / ATLAS_SIZE.w, (y + fv * h) / ATLAS_SIZE.h];
}
