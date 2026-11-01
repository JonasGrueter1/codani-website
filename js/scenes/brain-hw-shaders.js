// Szene "brain", Gehirn-Hardware: Materialien.
//
// hardware  Ein MeshStandardMaterial fuer ALLE festen Teile (ein Draw Call): Farbe, Metall, Rauheit und Art kommen pro
//           Vertex (color, aPbr = metalness, roughness, Art, Index). Die Art waehlt im Shader die Oberflaeche:
//           gebuerstetes Titan, Platine (Atlas), Chip-Druck, Kabel mit Lichtpaket, Elektrode, Lauflicht im Ring,
//           Raendelring, Luefter (dreht im Vertex-Shader), LED, Buchse, Spant mit Erleichterungsloechern, Flachband.
//           Dazu fuer alle: Scan-Linie (Freilegen von oben nach unten), Roentgen-Toenung, Nah-Ausblendung, Nebel.
// glows     Leuchtpunkte (instanzierte Billboards, additiv): Elektroden, LEDs, Buchsen, Kontakte, Polster.

export const KIND = Object.freeze({
  PLAIN: 0, BRUSH: 1, PCB: 2, LABEL: 3, CABLE: 4, ELEC: 5, GOLDRUN: 6, KNURL: 7, FAN: 8, LED: 9, SOCKET: 10,
  RIB: 11, FLEX: 12, PAD: 13, EMBER: 14, EDGE: 15,
});

const COMMON = /* glsl */ `
uniform float uHwTime;
uniform float uScanY;
uniform float uScanOn;
uniform float uXray;
uniform float uHwAlpha;
uniform vec2 uHwNear;
uniform vec3 uHwSig;
uniform vec3 uHwIce;
uniform vec3 uHwEmber;
uniform vec3 uHwGold;
float hwHash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
float hwHash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hwNoise(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hwHash(i), hwHash(i + 1.0), f); }
`;

export function makeHardwareMaterial(THREE, U, opts) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    metalness: 1,
    roughness: 1,
    envMap: opts.envMap || null,
    envMapIntensity: opts.envIntensity ?? 0.7,
    transparent: true,
    depthWrite: true,
    fog: true,
  });
  mat.name = 'brain-hardware';
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', /* glsl */ `#include <common>
        attribute vec4 aPbr;
        attribute vec2 aAtl;
        varying vec4 vPbr;
        varying vec2 vAtl;
        varying vec3 vHwL;
        varying vec3 vHwW;
        uniform vec3 uFanC;
        uniform vec3 uFanAx;
        uniform vec2 uFanCS;
        vec3 hwRot(vec3 v) {
          // Rodrigues: Drehung um uFanAx (normiert) mit cos/sin in uFanCS
          return v * uFanCS.x + cross(uFanAx, v) * uFanCS.y + uFanAx * dot(uFanAx, v) * (1.0 - uFanCS.x);
        }`)
      .replace('#include <beginnormal_vertex>', /* glsl */ `#include <beginnormal_vertex>
        if (abs(aPbr.z - 8.0) < 0.5) objectNormal = hwRot(objectNormal);`)
      .replace('#include <begin_vertex>', /* glsl */ `#include <begin_vertex>
        if (abs(aPbr.z - 8.0) < 0.5) transformed = uFanC + hwRot(transformed - uFanC);
        vPbr = aPbr;
        vAtl = aAtl;
        vHwL = transformed;
        vHwW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);

    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', /* glsl */ `#include <common>
        ${COMMON}
        uniform sampler2D uHwAtlas;
        uniform float uElec[18];
        uniform float uCab[18];
        uniform float uPad[6];
        uniform float uSock;
        uniform float uRun;
        uniform float uPcbOn;
        uniform vec3 uPcb;
        uniform vec3 uPcbCu;
        uniform vec3 uSilk;
        uniform vec3 uRimX;
        uniform float uRimK;
        varying vec4 vPbr;
        varying vec2 vAtl;
        varying vec3 vHwL;
        varying vec3 vHwW;
        float hwLed(float i) {
          // feste, versetzte Rhythmen
          float r = hwHash(i * 7.13 + 1.0);
          float per = 1.1 + 2.6 * r;
          float ph = fract(uHwTime / per + r * 5.0);
          float blink = r > 0.55 ? step(0.82, ph) : 0.55 + 0.45 * sin(uHwTime * (0.8 + r) + i);
          return mix(0.25, 1.0, blink);
        }`)
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
        float hwKind = vPbr.z;
        int hwK = int(hwKind + 0.5);
        float hwMetal = vPbr.x;
        float hwRough = vPbr.y;
        vec3 hwEmis = vec3(0.0);
        float hwIdx = vPbr.w;
        // Scan: oberhalb der Linie freigelegt, darunter (noch Schale) unsichtbar
        float hwSd = vHwW.y - uScanY;
        float hwVis = mix(1.0, smoothstep(-0.004, 0.004, hwSd), uScanOn);
        if (hwVis < 0.01) discard;
        if (hwK == 1 || hwK == 11) {
          // gebuerstet: feine Streifen quer zur Laufrichtung (vAtl.y = Umfang in Einheiten bzw. quer 0..1 beim Spant)
          float sc = hwK == 11 ? vAtl.y * 26.0 : vAtl.y * 900.0;
          float fw = fwidth(sc);
          float st = hwNoise(sc) * 0.6 + hwNoise(sc * 0.31 + 7.0) * 0.4;
          float k = clamp(1.6 - fw * 0.9, 0.0, 1.0);
          hwRough = clamp(hwRough + (st - 0.5) * 0.16 * k + (hwNoise(vAtl.x * 40.0) - 0.5) * 0.05, 0.08, 1.0);
          diffuseColor.rgb *= 1.0 + (st - 0.5) * 0.08 * k;
        }
        if (hwK == 11 && vAtl.y < 1.0) {
          // Erleichterungsloecher (Langloecher) in den Seitenflaechen der Spanten: vAtl.x = Laenge, vAtl.y = quer 0..1
          float L = vPbr.w;
          float along = (fract((vAtl.x - 0.03) / 0.062) - 0.5) * 0.062;
          float across = (vAtl.y - 0.5) * 0.026;
          float d = length(vec2(max(abs(along) - 0.011, 0.0), across)) - 0.0052;
          if (d < 0.0 && vAtl.x > 0.07 && vAtl.x < L - 0.07) discard;
          hwRough += 0.15 * (1.0 - smoothstep(0.0, 0.0015, abs(d))) * step(0.07, vAtl.x) * step(vAtl.x, L - 0.07);
        }
        if (hwK == 2) {
          vec4 t = texture2D(uHwAtlas, vAtl);
          vec3 base = mix(uPcb, uPcbCu, t.r);
          base = mix(base, uHwGold, t.g);
          base = mix(base, uSilk, t.a);
          diffuseColor.rgb = base;
          hwMetal = t.g * 0.95;
          hwRough = mix(mix(0.36, 0.3, t.r), 0.3, t.g);
          hwRough = mix(hwRough, 0.72, t.a);
          if (t.b > 0.003) {
            float ph = (t.b * 255.0 - 1.0) / 254.0;
            float p = fract(ph - uHwTime * 1.6);
            float d = (p - 0.5) * 16.0;
            hwEmis += uHwSig * (exp(-d * d) * 2.4 + 0.06) * smoothstep(0.4, 0.8, t.r) * uPcbOn;
          }
        }
        if (hwK == 3) {
          float a = texture2D(uHwAtlas, vAtl).a;
          if (hwMetal > 0.5) { diffuseColor.rgb *= 1.0 - 0.55 * a; hwRough = mix(hwRough, 0.62, a); }
          else { diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.45, 0.48), a * 0.85); hwRough = mix(hwRough, 0.7, a); }
        }
        if (hwK == 4) {
          // Kabel: vAtl.x = Weg vom Gehirn (Einheiten). Lichtpaket an Position uCab[i]; die letzten 2 cm mit Cyan-Kern
          int i = int(hwIdx + 0.5);
          float p = uCab[i];
          float d = (vAtl.x - p) / 0.03;
          float pk = exp(-d * d) * step(-0.5, p);
          float tip = 1.0 - smoothstep(0.012, 0.024, vAtl.x);
          hwEmis += uHwSig * (pk * 3.2 + tip * 0.9);
          diffuseColor.rgb = mix(diffuseColor.rgb, uHwSig * 0.25, tip * 0.6);
        }
        if (hwK == 5) {
          // Elektrode: vAtl = Scheibe -1..1. Goldrand, dunkler Ring, Cyan-Mitte (leuchtet mit der Erregungswelle)
          float r = length(vAtl);
          float rim = smoothstep(0.66, 0.74, r);
          float core = 1.0 - smoothstep(0.38, 0.48, r);
          float e = uElec[int(hwIdx + 0.5)];
          diffuseColor.rgb = mix(mix(vec3(0.02, 0.025, 0.03), uHwGold, rim), uHwSig * 0.3, core);
          hwMetal = rim;
          hwRough = mix(0.5, 0.25, rim);
          hwEmis += uHwSig * core * (0.4 + 3.6 * e) + uHwGold * rim * e * 0.4;
        }
        if (hwK == 6) {
          // Goldkontakte im Ring: weiches Lauflicht (eine Runde in 4 s), vAtl.x = Winkel 0..1
          float ph = fract(vAtl.x - uHwTime * 0.25);
          float run = exp(-pow(min(ph, 1.0 - ph) * 9.0, 2.0)) + exp(-pow((ph - 0.5) * 9.0, 2.0)) * 0.35;
          hwEmis += uHwGold * run * 0.8 * uRun;
        }
        if (hwK == 7) {
          // Raendelring: 40 Rillen (vAtl.x = Umfang 0..1), mit Cyan-Kante sobald die Kabel gezogen sind
          float g = abs(fract(vAtl.x * 40.0) - 0.5) * 2.0;
          float fw = fwidth(vAtl.x * 40.0);
          float groove = smoothstep(0.55 + fw, 0.55 - fw, g) * clamp(1.5 - fw * 2.0, 0.0, 1.0);
          diffuseColor.rgb *= 1.0 - 0.45 * groove;
          hwRough = mix(hwRough, 0.55, groove);
          float edge = smoothstep(0.85, 1.0, abs(vAtl.y * 2.0 - 1.0));
          hwEmis += uHwSig * edge * uSock * 1.2;
        }
        if (hwK == 9) {
          float on = hwLed(hwIdx);
          hwEmis += diffuseColor.rgb * 3.0 * on;
          diffuseColor.rgb *= 0.3;
        }
        if (hwK == 10) {
          float r = length(vAtl);
          hwEmis += uHwSig * uSock * 3.0 * (1.0 - smoothstep(0.35, 0.6, r));
        }
        if (hwK == 12) {
          // Flachbandkabel: 12 Goldadern unter dunklem Mantel (vAtl.y = quer 0..1)
          float s = fract(vAtl.y * 12.0);
          float fw = fwidth(vAtl.y * 12.0);
          float st = smoothstep(0.25 - fw, 0.25 + fw, s) * smoothstep(0.75 + fw, 0.75 - fw, s);
          diffuseColor.rgb = mix(diffuseColor.rgb, uHwGold * 0.55, st * clamp(1.4 - fw, 0.0, 1.0));
          hwMetal = st * 0.6;
          float p = fract(vAtl.x * 2.5 - uHwTime * 0.9 + floor(vAtl.y * 12.0) * 0.37);
          hwEmis += uHwSig * st * exp(-pow((p - 0.5) * 18.0, 2.0)) * 0.9 * uPcbOn;
        }
        if (hwK == 13) {
          // Klammer-Polster: Kontaktring (vAtl = Scheibe -1..1) leuchtet bei Erregungswellen
          float r = length(vAtl);
          float ring = smoothstep(0.62, 0.7, r) * (1.0 - smoothstep(0.8, 0.88, r));
          float e = uPad[int(hwIdx + 0.5)];
          // Kontaktring in hellem Chrom (Runde 2: vorher Gold, im Bloom ein oranger Ring)
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.86, 0.9), ring);
          hwMetal = 1.0;
          hwEmis += uHwSig * ring * (0.25 + 2.6 * e);
        }
        if (hwK == 14) hwEmis += uHwEmber * 2.4;
        // Freilegen: frisch gescannte Teile leuchten kurz auf, die Linie selbst als feine Kontur
        float hwBirth = exp(-max(hwSd, 0.0) / 0.05) * uScanOn;
        float hwLine = exp(-abs(hwSd) / 0.006) * uScanOn;
        hwEmis += uHwIce * (hwLine * 1.8 + hwBirth * 0.35);
        // Roentgen-Toenung: dunkler, damit das Gehirn fuehrt
        diffuseColor.rgb *= mix(1.0, 0.8, uXray);
        diffuseColor.a = uHwAlpha * hwVis * smoothstep(uHwNear.x, uHwNear.y, vViewPosition.z);
        if (diffuseColor.a < 0.004) discard; // unsichtbar: auch keine Tiefe schreiben (Neuronen dahinter bleiben)`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = hwRough;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = hwMetal;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += hwEmis;`)
      .replace('#include <opaque_fragment>', /* glsl */ `
        {
          // Glanzlichter weich begrenzen (sonst bluehen Kanten des Titans zu grossen Flecken), Leuchten bleibt
          vec3 lit = outgoingLight - totalEmissiveRadiance;
          float lm = max(max(lit.r, lit.g), lit.b);
          if (lm > 0.5) lit *= (0.5 + (lm - 0.5) * 0.3) / lm;
          outgoingLight = lit + totalEmissiveRadiance;
          // leichter Cyan-Fresnel-Rand im Roentgen
          float ndv = abs(dot(normalize(normal), normalize(vViewPosition)));
          outgoingLight += uRimX * (pow(1.0 - ndv, 3.0) + 0.06) * max(uXray, uRimK);
        }
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'brain-hardware-v1';
  return mat;
}

/* ------------------------------------------------------------ Leuchtpunkte */
const GLOW_VS = /* glsl */ `
${COMMON}
uniform vec2 uHwRes;
uniform float uElec[18];
uniform float uPad[6];
uniform float uSock;
uniform float uRun;
attribute vec4 aG;     // Position (lokal), Groesse
attribute vec4 aGC;    // Farbe (linear, inkl. Helligkeit), Art
attribute float aGI;   // Index bzw. Parameter
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
float hwLedV(float i) {
  float r = hwHash(i * 7.13 + 1.0);
  float per = 1.1 + 2.6 * r;
  float ph = fract(uHwTime / per + r * 5.0);
  float blink = r > 0.55 ? step(0.82, ph) : 0.55 + 0.45 * sin(uHwTime * (0.8 + r) + i);
  return mix(0.25, 1.0, blink);
}
void main() {
  vec4 wp = modelMatrix * vec4(aG.xyz, 1.0);
  vec4 mv = viewMatrix * wp;
  float depth = -mv.z;
  float mode = aGC.w;
  float k = 1.0;
  if (mode < 0.5) k = 1.0;
  else if (mode < 1.5) k = 0.12 + uElec[int(aGI + 0.5)];
  else if (mode < 2.5) k = hwLedV(aGI);
  else if (mode < 3.5) k = uSock;
  else if (mode < 4.5) k = 0.1 + uPad[int(aGI + 0.5)];
  else if (mode < 5.5) {
    float ph = fract(aGI - uHwTime * 0.25);
    k = (exp(-pow(min(ph, 1.0 - ph) * 9.0, 2.0)) + exp(-pow((ph - 0.5) * 9.0, 2.0)) * 0.35) * uRun;
  } else k = 0.8 + 0.2 * sin(uHwTime * 2.0);
  float vis = mix(1.0, smoothstep(0.0, 0.01, wp.y - uScanY), uScanOn);
  vCol = aGC.rgb * k;
  float size = aG.w;
  mv.xy += position.xy * size;
  gl_Position = projectionMatrix * mv;
  vUv = position.xy;
  vA = uHwAlpha * vis * smoothstep(uHwNear.x * 0.8, uHwNear.y, depth);
  if (vA * k < 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;
const GLOW_FS = /* glsl */ `
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
void main() {
  float r2 = dot(vUv, vUv);
  float m = (exp(-r2 * 9.0) * 0.8 + exp(-r2 * 60.0) * 1.2) * (1.0 - smoothstep(0.7, 1.0, r2));
  float a = m * vA;
  if (a < 0.002) discard;
  gl_FragColor = vec4(vCol * a, 1.0);
}
`;

export function makeGlowMaterial(THREE, U) {
  return new THREE.ShaderMaterial({
    name: 'brain-hw-glow',
    uniforms: U,
    vertexShader: GLOW_VS,
    fragmentShader: GLOW_FS,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
}
