// Szene "dna": Zeichen-Atlas als Distanzfeld (SDF) aus Geist Mono.
// Jede Glyphe wird einmal in ein Canvas gezeichnet, daraus rechnet ein exakter euklidischer
// Distanz-Transform (Felzenszwalb/Huttenlocher, wie TinySDF) ein Distanzfeld. Vorteil: Zeichen sind
// in jeder Groesse scharf (klein im Tunnel, gross in der Headline des Website-Geruests).
//
// Atlas: COLS x ROWS Zellen, einkanalig (RedFormat), Glyphe aufrecht (v nach oben).
// Kante des Zeichens liegt beim Wert CUT (0.75).

export const COLS = 16;
export const ROWS = 8;
export const CUT = 0.75;
// Zellgeometrie (relativ zur Zelle): Schriftgroesse, Laufweite (Geist Mono: 600/1000 em),
// Grundlinie so, dass die Mitte der Versalhoehe (710/1000 em) in der Zellmitte liegt.
export const FONT = 0.66;
export const ADVANCE = 0.6 * FONT;
const BASELINE = 0.5 + (0.71 * FONT) / 2;

// Reihenfolge = Index im Atlas. Zuerst ASCII (fuer das Flackern), dann Umlaute, dann Sonderzellen.
const ASCII = Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i)).join('');
export const SCRAMBLE = 94; // Index 0..93: zufaellige Zeichen beim Flackern
const EXTRA = 'äöüÄÖÜéèà·';
export const BLOCK = '█'; // Schreibmarke (als Rechteck gezeichnet)

/**
 * @param {typeof import('three')} THREE
 * @param {'high'|'medium'|'low'} quality
 * @returns {Promise<{texture: THREE.DataTexture, index: (ch: string) => number, cell: number}>}
 */
export async function buildAtlas(THREE, quality) {
  // Gewicht 600: kraeftigere Striche, kleine Zeichen verlieren ihre duennen Linien nicht (aus n wird sonst r)
  const fontSpec = (px) => `600 ${px}px "Geist Mono"`;
  try {
    if (document.fonts && document.fonts.load) {
      await Promise.race([document.fonts.load(fontSpec(64)), new Promise((r) => setTimeout(r, 2500))]);
    }
  } catch (e) { /* Fallback-Schrift */ }

  const cell = quality === 'high' ? 96 : 64;
  const radius = Math.round(cell * 0.11);
  const chars = [...ASCII, ...EXTRA, BLOCK];
  const W = COLS * cell;
  const H = ROWS * cell;
  const data = new Uint8Array(W * H);

  const cv = document.createElement('canvas');
  cv.width = cell;
  cv.height = cell;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const px = Math.round(cell * FONT);
  g.font = `${fontSpec(px)}, ui-monospace, Menlo, Consolas, monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';

  const n = cell * cell;
  const outer = new Float64Array(n);
  const inner = new Float64Array(n);
  const f = new Float64Array(cell);
  const z = new Float64Array(cell + 1);
  const v = new Uint16Array(cell);

  const map = new Map();
  chars.forEach((ch, i) => {
    map.set(ch, i);
    g.clearRect(0, 0, cell, cell);
    g.fillStyle = '#fff';
    if (ch === BLOCK) {
      // Schreibmarke: schmaler Balken in Versalhoehe
      const h = 0.71 * FONT * cell * 1.1;
      g.fillRect(cell * 0.5 - cell * 0.12, cell * 0.5 - h / 2, cell * 0.24, h);
    } else {
      g.fillText(ch, cell / 2, BASELINE * cell);
    }
    const img = g.getImageData(0, 0, cell, cell).data;
    for (let k = 0; k < n; k++) {
      const a = img[k * 4 + 3] / 255;
      if (a >= 1) { outer[k] = 0; inner[k] = INF; }
      else if (a <= 0) { outer[k] = INF; inner[k] = 0; }
      else {
        const d = 0.5 - a;
        outer[k] = d > 0 ? d * d : 0;
        inner[k] = d < 0 ? d * d : 0;
      }
    }
    edt(outer, cell, cell, f, v, z);
    edt(inner, cell, cell, f, v, z);
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    for (let y = 0; y < cell; y++) {
      // v nach oben: Zeile y des Canvas (von oben) landet in Texel-Zeile (cell - 1 - y)
      const ty = row * cell + (cell - 1 - y);
      for (let x = 0; x < cell; x++) {
        const k = y * cell + x;
        const d = Math.sqrt(outer[k]) - Math.sqrt(inner[k]);
        const val = Math.round(255 - 255 * (d / radius + (1 - CUT)));
        data[ty * W + col * cell + x] = val < 0 ? 0 : val > 255 ? 255 : val;
      }
    }
  });

  const texture = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.UnsignedByteType);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;

  const fallback = map.get('?');
  return {
    texture,
    cell,
    index: (ch) => (map.has(ch) ? map.get(ch) : fallback),
  };
}

/* ---------------------------------------- Distanz-Transform (Felzenszwalb) */
const INF = 1e20;

function edt(data, width, height, f, v, z) {
  for (let x = 0; x < width; x++) edt1d(data, x, width, height, f, v, z);
  for (let y = 0; y < height; y++) edt1d(data, y * width, 1, width, f, v, z);
}

function edt1d(grid, offset, stride, length, f, v, z) {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 0; q < length; q++) f[q] = grid[offset + q * stride];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    do {
      const r = v[k];
      s = (f[q] - f[r] + q * q - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    const qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}
