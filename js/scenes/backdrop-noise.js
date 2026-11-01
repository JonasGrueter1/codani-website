// Szene "backdrop": Rausch-Volumen fuer den Hintergrund-Shader.
// 32 x 32 x 32 Zufallswerte (RGBA = vier unabhaengige Kanaele), kachelbar (REPEAT). Der Shader liest es mit
// geglaetteten Koordinaten (Trick von Inigo Quilez: floor(p) + smoothstep(fract(p))): ein Zugriff liefert vier
// glatte Value-Noise-Werte. Kein Rauschen pro Bildpunkt rechnen, keine Naht, keine Pole (3D statt Kugel-Textur).

export const NOISE_SIZE = 32;

// Deterministischer Zufall (mulberry32), damit jedes Laden gleich aussieht
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeNoiseVolume(THREE, size = NOISE_SIZE, seed = 20261027) {
  const rnd = mulberry32(seed);
  const data = new Uint8Array(size * size * size * 4);
  for (let i = 0; i < data.length; i++) data[i] = Math.floor(rnd() * 256);
  const tex = new THREE.Data3DTexture(data, size, size, size);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.wrapR = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}
