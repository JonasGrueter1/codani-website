// Letzter Bild-Pass (nach OutputPass, also im Anzeige-Farbraum sRGB):
// FXAA (nur ohne MSAA bei kleiner Aufloesung), chromatische Aberration, Abdunkeln hinter dem Text (Scrim),
// Vignette, Filmkorn, Lichtblitz, Abblende, Abdunkeln.
import { ShaderMaterial, Vector2, Vector4, Color } from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uTime;
uniform float uAberration;
uniform float uVignette;
uniform float uGrain;
uniform float uFlash;
uniform float uFade;
uniform float uDim;
uniform vec3 uFlashColor;
uniform vec3 uFadeColor;
uniform float uFxaa;
uniform float uScrim;
uniform vec4 uScrimRect; // Mitte (UV), halbe Groesse (UV) der Textzone
varying vec2 vUv;

// FXAA (nach Timothy Lottes, vereinfachte Konsolen-Variante): 5 Abtastungen, bei wenig Kontrast sofort fertig
vec3 fxaa(vec2 uv) {
  vec2 px = 1.0 / uResolution;
  vec3 cM = texture2D(tDiffuse, uv).rgb;
  vec3 cNW = texture2D(tDiffuse, uv + vec2(-1.0, -1.0) * px).rgb;
  vec3 cNE = texture2D(tDiffuse, uv + vec2(1.0, -1.0) * px).rgb;
  vec3 cSW = texture2D(tDiffuse, uv + vec2(-1.0, 1.0) * px).rgb;
  vec3 cSE = texture2D(tDiffuse, uv + vec2(1.0, 1.0) * px).rgb;
  const vec3 L = vec3(0.299, 0.587, 0.114);
  float lM = dot(cM, L);
  float lNW = dot(cNW, L);
  float lNE = dot(cNE, L);
  float lSW = dot(cSW, L);
  float lSE = dot(cSE, L);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  if (lMax - lMin < max(0.0312, lMax * 0.125)) return cM;
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
  float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
  float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
  dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * px;
  vec3 a = 0.5 * (texture2D(tDiffuse, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tDiffuse, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 b = a * 0.5 + 0.25 * (texture2D(tDiffuse, uv - dir * 0.5).rgb + texture2D(tDiffuse, uv + dir * 0.5).rgb);
  float lB = dot(b, L);
  return (lB < lMin || lB > lMax) ? a : b;
}

// Hash ohne Sinus (stabil auf Mobile-GPUs), Dave Hoskins
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = vUv;
  vec2 d = uv - 0.5;
  float r2 = dot(d, d);
  vec3 col;
  if (uFxaa > 0.5) {
    col = fxaa(uv);
  } else if (uAberration > 0.0) {
    vec2 off = d * r2 * uAberration * 4.0;
    col.r = texture2D(tDiffuse, uv - off).r;
    col.g = texture2D(tDiffuse, uv).g;
    col.b = texture2D(tDiffuse, uv + off).b;
  } else {
    col = texture2D(tDiffuse, uv).rgb;
  }

  // Vignette: elliptisch nach Seitenverhaeltnis, weich
  vec2 dv = d * vec2(mix(1.0, uResolution.x / uResolution.y, 0.5), 1.0);
  float vig = 1.0 - smoothstep(0.25, 0.95, length(dv) * 1.15);
  col *= mix(1.0, vig, uVignette);

  // Textzone: Bild dahinter weich abdunkeln (Lesbarkeit ueber hellen Neuronen, Code-Zeichen usw.)
  if (uScrim > 0.0) {
    vec2 q = (uv - uScrimRect.xy) / uScrimRect.zw;
    float dq = length(max(abs(q) - vec2(0.62), vec2(0.0)));
    col *= 1.0 - uScrim * (1.0 - smoothstep(0.0, 0.85, dq));
  }

  // Kleine Blitze in Signal-Cyan, starke (Schnitt) werden weisser
  col += mix(uFlashColor, vec3(0.85, 0.97, 1.0), smoothstep(0.15, 0.5, uFlash)) * uFlash;
  col = mix(col, uFadeColor, clamp(uFade, 0.0, 1.0));
  col *= 1.0 - clamp(uDim, 0.0, 1.0);

  // Filmkorn mit 24 Bildern pro Sekunde, staerker in dunklen Bereichen (verhindert auch Banding)
  float frame = floor(uTime * 24.0);
  float n = hash12(gl_FragCoord.xy + frame * vec2(37.0, 17.0)) - 0.5;
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col += n * uGrain * (1.0 - 0.6 * luma);

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;

export class FxPass extends Pass {
  constructor() {
    super();
    this.uniforms = {
      tDiffuse: { value: null },
      uResolution: { value: new Vector2(1, 1) },
      uTime: { value: 0 },
      uAberration: { value: 0.006 },
      uVignette: { value: 0.75 },
      uGrain: { value: 0.045 },
      uFlash: { value: 0 },
      uFade: { value: 0 },
      uDim: { value: 0 },
      uFlashColor: { value: new Color(0.27, 0.9, 1.0) },
      uFadeColor: { value: new Color(0.0157, 0.0235, 0.039) },
      uFxaa: { value: 0 },
      uScrim: { value: 0 },
      uScrimRect: { value: new Vector4(0.25, 0.5, 0.2, 0.2) },
    };
    this.material = new ShaderMaterial({
      name: 'FxPass',
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  setSize(width, height) {
    this.uniforms.uResolution.value.set(width, height);
  }

  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.fsQuad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
