// Szene "robot": eigene Studio-Umgebung fuer die Spiegelungen (nur Materialien dieser Szene).
// Weiche Leuchtflaechen wie im Fotostudio: grosse Decke (Scheitel-Glanz), Fuehrungsflaeche vorne rechts (Seite der
// Kamera), Aufheller vorne links, zwei schmale, harte Streifen (lange Glanzlinien im Klarlack), Kantenlicht hinten.
// Farben nur aus der Palette (white, ice, signal, ember), Helligkeit ueber multiplyScalar.
export function buildStudioEnv(THREE, renderer, palette) {
  const scene = new THREE.Scene();
  const disposables = [];
  const domeGeo = new THREE.SphereGeometry(30, 48, 24);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uLow: { value: palette.void.clone().multiplyScalar(0.4) },
      uMid: { value: palette.mist.clone().multiplyScalar(0.035) },
      uHigh: { value: palette.mist.clone().multiplyScalar(0.03) },
      uBand: { value: palette.mist.clone().lerp(palette.white, 0.5).multiplyScalar(0.55) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vP;
      void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLow, uMid, uHigh, uBand;
      varying vec3 vP;
      void main() {
        float y = vP.y;
        vec3 c = mix(uLow, uMid, smoothstep(-0.35, 0.02, y));
        c = mix(c, uHigh, smoothstep(0.1, 0.9, y));
        // Horizontlinie (Hohlkehle): gibt Chrom und Kanten eine ruhige Spiegelung
        c += uBand * exp(-pow((y + 0.04) / 0.07, 2.0)) * (0.55 + 0.45 * smoothstep(0.2, -0.6, vP.z));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(domeGeo, domeMat));
  disposables.push(domeGeo, domeMat);

  const planeGeo = new THREE.PlaneGeometry(1, 1);
  disposables.push(planeGeo);
  const panel = (w, h, color, pos, soft = 0.3) => {
    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { uCol: { value: color }, uSoft: { value: soft } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uCol; uniform float uSoft;
        varying vec2 vUv;
        void main() {
          vec2 d = abs(vUv - 0.5) * 2.0;
          float a = (1.0 - smoothstep(1.0 - uSoft, 1.0, d.x)) * (1.0 - smoothstep(1.0 - uSoft, 1.0, d.y));
          gl_FragColor = vec4(uCol * a, 1.0);
        }`,
    });
    const m = new THREE.Mesh(planeGeo, mat);
    m.scale.set(w, h, 1);
    m.position.set(pos[0], pos[1], pos[2]);
    m.lookAt(0, 0, 0);
    scene.add(m);
    disposables.push(mat);
    return m;
  };
  const white = palette.white.clone();
  const cool = palette.white.clone().lerp(palette.ice, 0.3);
  const coolDeep = palette.white.clone().lerp(palette.signal, 0.22);
  // Die Kamera der Seite steht fast immer rechts vorne (+x): dort sitzt die Fuehrungsflaeche, damit die Schale im Bild
  // weiss und hell wirkt (frueher lag die Fuehrung links, die Seite zur Kamera blieb grau). Links vorne ein Aufheller.
  panel(8, 10, white.clone().multiplyScalar(4.3), [8.5, 4.2, 7.5], 0.4);
  panel(8, 11, white.clone().multiplyScalar(3.4), [-9.5, 4.5, 4.0], 0.45);
  // Oberlicht (Scheitel-Glanz)
  panel(11, 11, white.clone().multiplyScalar(0.85), [0, 12, 1], 0.7);
  // Lange Glanzlinien: zwei schmale, scharfkantige Streifen (oben links und hinten rechts). Sie zeichnen im Klarlack
  // klare Linien ueber Schaedel, Wangenknochen und Schulter.
  panel(1.1, 17, white.clone().multiplyScalar(14.0), [-6.5, 6.5, 3.5], 0.08);
  panel(1.2, 16, coolDeep.clone().multiplyScalar(11.0), [8.0, 3.0, -6.0], 0.08);
  // Kantenlicht hinten links und Balken hinten oben
  panel(2.4, 14, cool.clone().multiplyScalar(4.4), [-8.5, 3, -6.5], 0.3);
  panel(14, 2.6, cool.clone().multiplyScalar(3.0), [0, 8.5, -7.5], 0.4);
  // Glanzlinie oben vorne (Stirn, Chrom)
  panel(10, 1.4, white.clone().multiplyScalar(2.2), [1.5, 7.5, 9], 0.2);
  // Boden: fast schwarz, leicht kuehl
  panel(24, 24, palette.steel.clone().multiplyScalar(0.12), [0, -12, 0], 0.7);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  disposables.forEach((d) => d.dispose());
  return { texture: rt.texture, dispose: () => rt.dispose() };
}
