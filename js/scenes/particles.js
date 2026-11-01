// Szene "particles": Intro "Schweben" und Entstehung des Roboters aus Licht.
//
// - Tausende leuchtende GPU-Partikel mit eigenem Shader: Curl-Noise-Stroemung, Tiefenunschaerfe (Bokeh),
//   wenige helle Funken zwischen feinem Staub, Staub, der in einem Lichtkegel aufleuchtet, Reaktion auf die Maus.
// - Hero: die Bueste steht schon zu etwa zwei Dritteln aus Licht (Plattenlinien, Rand der Hinterkopf-Oeffnung, Kabel, die
//   langsam nach hinten wegfliessen, Kantenlicht von rechts hinten; atmet, Kopf folgt der Maus).
// - Ab der zweiten Haelfte des Intros ziehen sich die Partikel in einer sanften Spirale zur Roboter-Silhouette
//   zusammen (von unten nach oben), im Flug als feine Lichtspuren, bei der Ankunft mit kurzem Aufblitzen.
//   Die Zielpunkte liegen auf der Android-Bueste der Szene robot (particles-shape.js, Netz aus robot-mesh.js).
// - Uebergabe an die Szene "robot": erscheint ihr Hologramm, treten die fertigen Partikel zurueck (nur Funkeln);
//   an ihrer Abtastebene leuchten die Partikel auf und gehen darunter in die Schale ueber.
// - Dahinter ferne, unscharfe Lichter. Den Raum selbst (Nebel, Licht) zeichnet backdrop.js (Farbwelt intro).
//
// Alles ist eine reine Funktion von (Zeit, Scroll): rueckwaerts scrollen setzt den Roboter wieder in Partikel um.
// Pro Frame werden nur Uniforms gesetzt (keine Schleifen ueber Partikel, keine Allokationen).
// Hilfsdateien: particles-shape.js (Zielpunkte), particles-glsl.js (Shader).
// Qualitaet: Mengen x tier.particles, Stufe low mit einfacherem Curl-Rauschen.

import { sampleRobot, mulberry32, KIND, HEAD_PIVOT } from './particles-shape.js';
import { POINTS_VERT, POINTS_FRAG, BEAM_VERT, BEAM_FRAG } from './particles-glsl.js';

// Mengen bei Stufe high (werden mit tier.particles multipliziert)
// Drei Ebenen: wenige grosse unscharfe Punkte vorne (fore), scharfe Mitte (form), feiner Staub (dust) und ferne
// Lichter. Staub gegenueber Version 1 um 40 % reduziert (wirkte wie Schneegestoeber).
const COUNT = { form: 30000, dust: 7200, fore: 70, far: 220 };

// Lichtkegel von oben rechts hinten auf die Stelle, an der der Roboter entsteht
const BEAM = { apex: [2.6, 10.5, -3.0], target: [0, -1.2, 0], length: 15, r0: 0.35, slope: 0.167 };

export async function create(ctx) {
  const { THREE, palette, anchors, director, shared, tier, quality, pointer, camera, scene } = ctx;
  const group = new THREE.Group();
  group.name = 'scene:particles';
  const k = tier.particles;
  const rnd = mulberry32(20261026);

  /* ------------------------------------------------------------ Partikel */
  const nForm = Math.round(COUNT.form * k);
  const nDust = Math.round(COUNT.dust * k);
  const nFore = Math.max(24, Math.round(COUNT.fore * Math.sqrt(k)));
  const nFar = Math.max(60, Math.round(COUNT.far * Math.sqrt(k)));
  const total = nForm + nDust + nFore + nFar;

  const aPos = new Float32Array(total * 3);
  const aTarget = new Float32Array(total * 3);
  const aNormal = new Float32Array(total * 3);
  const aRand = new Float32Array(total * 4);
  const aInfo = new Float32Array(total * 4);
  const aHw = new Float32Array(total);

  // Zielpunkte auf der Android-Bueste (gleiche Form wie die Szene robot, particles-shape.js)
  const robot = sampleRobot(THREE, anchors, nForm, rnd);
  const bell = () => (rnd() + rnd() + rnd()) / 1.5 - 1; // -1..1, zur Mitte hin dichter
  const spread = (v) => (rnd() < 0.72 ? v : rnd() * 2 - 1); // Wolke zur Mitte hin dichter, Raender ruhiger

  for (let i = 0; i < total; i++) {
    const i3 = i * 3;
    const i4 = i * 4;
    aRand[i4] = rnd();
    aRand[i4 + 1] = rnd();
    aRand[i4 + 2] = rnd();
    aRand[i4 + 3] = rnd();
    if (i < nForm) {
      aPos[i3] = spread(bell());
      aPos[i3 + 1] = spread(bell());
      aPos[i3 + 2] = spread(bell());
      aTarget[i3] = robot.pos[i3];
      aTarget[i3 + 1] = robot.pos[i3 + 1];
      aTarget[i3 + 2] = robot.pos[i3 + 2];
      aNormal[i3] = robot.nrm[i3];
      aNormal[i3 + 1] = robot.nrm[i3 + 1];
      aNormal[i3 + 2] = robot.nrm[i3 + 2];
      aInfo[i4] = robot.kind[i];
      aInfo[i4 + 1] = robot.order[i];
      aInfo[i4 + 2] = rnd();
      aInfo[i4 + 3] = robot.vis[i];
      aHw[i] = robot.hw[i];
    } else if (i < nForm + nDust + nFore) {
      // Staub: Startwert 0..1 in der Box (wird im Shader umgebrochen)
      aPos[i3] = rnd();
      aPos[i3 + 1] = rnd();
      aPos[i3 + 2] = rnd();
      aNormal[i3 + 1] = 1;
      aInfo[i4] = KIND.dust;
      aInfo[i4 + 3] = i >= nForm + nDust ? 1 : 0; // 1 = Vordergrund
    } else {
      // Ferne Lichter weit hinter der Szene
      aPos[i3] = (rnd() * 2 - 1) * 40;
      aPos[i3 + 1] = -12 + rnd() * 28;
      aPos[i3 + 2] = -38 - rnd() * 42;
      aNormal[i3 + 1] = 1;
      aInfo[i4] = KIND.far;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(aPos, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(aNormal, 3));
  geometry.setAttribute('aTarget', new THREE.BufferAttribute(aTarget, 3));
  geometry.setAttribute('aRand', new THREE.BufferAttribute(aRand, 4));
  geometry.setAttribute('aInfo', new THREE.BufferAttribute(aInfo, 4));
  geometry.setAttribute('aHw', new THREE.BufferAttribute(aHw, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -10), 80);

  const beamDir = new THREE.Vector3().fromArray(BEAM.target).sub(new THREE.Vector3().fromArray(BEAM.apex)).normalize();
  const uniforms = {
    uTime: shared.uTime,
    uResolution: shared.uResolution,
    uPixelRatio: shared.uPixelRatio,
    uForm: { value: 0 },
    uGather: { value: 0 },
    uBuildY: { value: -4 },
    uHolo: { value: 0 },
    uAlpha: { value: 1 },
    uIgnite: { value: 0 },
    uFocus: { value: 15 },
    uAperture: { value: ctx.isMobile ? 0.0045 : 0.0055 },
    uFog: { value: 0.035 },
    uSize: { value: 0.03 },
    uBokeh: { value: 1.6 },
    uHint: { value: 0 },
    uPreGain: { value: new THREE.Vector2(1, 1) },
    // Kopfflaechen im Hero: gleich viele Partikel pro Bildpunkt auf jeder Stufe (high hat doppelt so viele Partikel,
    // dort sonst ein Nebelschleier statt einzelner Lichtpunkte)
    uPreSurf: { value: new THREE.Vector2(Math.min(0.9, 0.45 / k), k > 0.75 ? 1.5 : 1.0) },
    uBoxC: { value: new THREE.Vector3(0, 0.3, -2.5) },
    uBoxH: { value: new THREE.Vector3(12.5, 6.8, 8.5) },
    uTextArea: { value: new THREE.Vector4(-0.45, -0.3, 0.8, 0.62) },
    uTitle: { value: 1 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uPointerAmt: { value: 0 },
    uHeadMat: { value: new THREE.Matrix4() },
    uBodyY: { value: 0 },
    uBeamA: { value: new THREE.Vector3().fromArray(BEAM.apex) },
    uBeamD: { value: beamDir.clone() },
    uBeamR: { value: new THREE.Vector2(BEAM.r0, BEAM.slope) },
    uBeam: { value: 0 },
    uColA: { value: palette.signal.clone().multiplyScalar(1.15) },
    uColB: { value: palette.ice.clone().multiplyScalar(1.25) },
    uColC: { value: palette.ember.clone().multiplyScalar(1.5) },
    uColW: { value: palette.white.clone().multiplyScalar(1.3) },
  };
  const defines = {};
  if (quality === 'low') defines.CURL_LITE = 1;
  const material = new THREE.ShaderMaterial({
    uniforms,
    defines,
    vertexShader: POINTS_VERT,
    fragmentShader: POINTS_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 2;
  group.add(points);

  /* ------------------------------------------------------------ Lichtkegel */
  const beamGeo = new THREE.CylinderGeometry(BEAM.r0, BEAM.r0 + BEAM.slope * BEAM.length, BEAM.length,
    quality === 'low' ? 32 : 64, 1, true);
  const beamUniforms = {
    uTime: shared.uTime,
    uIntensity: { value: 0 },
    uColor: { value: palette.white.clone().lerp(palette.ice, 0.35) },
    uFog: { value: 0.035 },
  };
  const beamMat = new THREE.ShaderMaterial({
    uniforms: beamUniforms,
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamDir.clone().negate());
  beam.position.fromArray(BEAM.apex).addScaledVector(beamDir, BEAM.length / 2);
  beam.renderOrder = 1;
  beam.frustumCulled = false;
  group.add(beam);

  // Kein leuchtender Kern mehr im Kopf (wirkte wie ein Lampenfleck auf der Stirn, auf dem Handy wie eine Stirnlampe).

  /* ----------------------------------------------- Groesse, Seitenverhaeltnis */
  let preGain = 1;
  const setAspect = (w, h) => {
    const a = w / Math.max(1, h);
    const t = smoothstep(0.6, 1.3, a);
    uniforms.uBoxH.value.set(lerp(6.6, 12.5, t), lerp(10.5, 6.8, t), 8.5);
    // Hochformat: das FOV wird breiter, Partikel sonst zu klein
    uniforms.uSize.value = 0.03 * lerp(1.4, 1, t);
    // Hero-Bueste: im Querformat kleiner im Bild (weniger Partikel pro Bildpunkt), darum heller
    preGain = lerp(1.6, 2.4, t);
    uniforms.uPreGain.value.set(preGain, lerp(1, 1.3, t));
    // Titel: im Querformat links unten, im Hochformat unten ueber die ganze Breite
    if (a < 0.85) uniforms.uTextArea.value.set(0, -0.42, 1.4, 0.55);
    else uniforms.uTextArea.value.set(-0.45, -0.3, 0.8, 0.62);
  };
  setAspect(ctx.size.width, ctx.size.height);
  const offResize = ctx.onResize(setAspect);

  /* ------------------------------------------------------------ Zustand */
  const focusPoint = new THREE.Vector3(0, -0.3, 0).add(anchors.head.center);
  // Kopfbewegung wie in robot.js (Drehpunkt im Hals, Maus, Eigenleben), damit die Uebergabe deckungsgleich ist
  const pivot = new THREE.Vector3().fromArray(HEAD_PIVOT);
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const tmpV = new THREE.Vector3();
  const root = document.documentElement;
  let igniteStart = -1;
  let robotGroup = null; // Gruppe der Szene "robot" (nur lesen: ist sie da und sichtbar?)
  let robotLookup = 0;
  let yaw = 0;
  let pitch = 0;
  let pointerAmt = 0;

  const api = {
    group,
    look: { bloom: 0.95, bloomRadius: 0.72, vignette: 0.86, parallax: 0.32, drift: 0.035 },

    update(time, dt, local, global, weight = 1) {
      const intro = director.beat('intro');
      const rb = director.beat('robot');
      const s = intro.p + rb.p; // 0..2: Intro, dann Roboter

      // Reagiert ab dem ersten Scroll-Pixel: die Wolke zieht sich zusammen, die ersten Partikel fliegen los
      const form = clamp01(s / 1.3);
      const gather = smoothstep(0.0, 0.5, s);
      // Abtastebene des Roboters (wie robot.js: Aufbau robot@0.26 bis robot@0.64, von y -3.6 bis 1.25)
      const build = smoothstep(0.26, 0.64, rb.p);
      const buildY = build >= 0.999 ? 2 : -3.6 + (1.25 + 3.6) * build;

      // Aufleuchten, sobald der Preloader weg ist (Wanduhr, damit es auch bei kurzer Bildrate ruhig bleibt)
      if (igniteStart < 0 && (ctx.dev || root.classList.contains('is-ready'))) igniteStart = performance.now();
      const ignite = igniteStart < 0 ? 0 : clamp01((performance.now() - igniteStart) / 2600);

      const u = uniforms;
      u.uForm.value = form;
      u.uGather.value = gather;
      u.uBuildY.value = buildY;
      u.uTitle.value = 1 - smoothstep(0.28, 0.5, intro.p); // solange der Hero-Text steht (BEATS intro.text)
      // Ist der feste Roboter geladen und sichtbar, uebernimmt sein Hologramm (sonst bleibt der Partikel-Roboter hell)
      if (!robotGroup && time >= robotLookup) {
        robotLookup = time + 1;
        const list = scene.children;
        for (let i = 0; i < list.length; i++) if (list[i].name === 'scene:robot') { robotGroup = list[i]; break; }
      }
      const robotOn = robotGroup !== null && robotGroup.visible && robotGroup.parent !== null;
      u.uHolo.value = robotOn ? smoothstep(0.05, 0.22, rb.p) : 0;
      u.uIgnite.value = ignite;
      u.uHint.value = ignite;
      u.uAlpha.value = weight;
      u.uFocus.value = camera.position.distanceTo(focusPoint);
      u.uFog.value = scene.fog ? scene.fog.density : 0.035;

      // Maus: nur mit echter Maus (Touch hat Eigenleben, das soll keine Partikel schieben)
      const want = !pointer.touch && pointer.inside ? 1 : 0;
      pointerAmt += (want - pointerAmt) * (1 - Math.exp(-dt * 2.5));
      u.uPointerAmt.value = pointerAmt * (1 - form);
      u.uPointer.value.set(pointer.sx, pointer.sy);

      // Kopf folgt der Maus, mit leichtem Eigenleben (gleiche Werte wie robot.js)
      const kk = 1 - Math.exp(-dt * 2.2);
      const idleYaw = Math.sin(time * 0.19) * 0.04 + Math.sin(time * 0.067) * 0.025;
      const idlePitch = Math.sin(time * 0.15 + 1.0) * 0.018;
      // Hero: Kopf leicht zum Text gedreht (Dreiviertelansicht, der offene Hinterkopf mit den Kabeln wird sichtbar);
      // bis zum Beat robot zurueck in die Ruhelage, damit die Uebergabe an das Hologramm deckungsgleich bleibt
      const heroYaw = -0.55 * (1 - smoothstep(0.25, 0.95, intro.p));
      yaw += (pointer.sx * 0.26 + idleYaw + heroYaw - yaw) * kk;
      pitch += (-pointer.sy * 0.1 + idlePitch - pitch) * kk;
      euler.set(pitch, yaw, Math.sin(time * 0.11) * 0.01 - yaw * 0.06);
      const hm = u.uHeadMat.value.makeRotationFromEuler(euler);
      tmpV.copy(pivot).applyMatrix4(hm);
      hm.setPosition(pivot.x - tmpV.x, pivot.y - tmpV.y + Math.sin(time * 1.1 - 0.7) * 0.005, pivot.z - tmpV.z);
      u.uBodyY.value = Math.sin(time * 1.1) * 0.009;

      // Licht und Hintergrund
      u.uBeam.value = ignite * (0.65 + 0.35 * gather) * (1 - build);
      beamUniforms.uIntensity.value = 0.075 * ignite * weight * (0.7 + 0.3 * gather) * (1 - 0.8 * build);
      beamUniforms.uFog.value = u.uFog.value;

      // Bildwirkung: bei der Ankunft etwas mehr Glanz
      const arrive = smoothstep(0.55, 0.95, form) * (1 - build);
      // Hero: Bloom enger, damit die fertige Bueste scharf bleibt (kein Nebelschleier), beim Formen wieder weiter
      // Schwelle hoch: nur die hellen Kerne der Linien leuchten, die vielen Flaechenpunkte nicht (sonst Nebelschleier)
      // Hero: wenig, enger Bloom (sonst legt sich ein Nebelschleier ueber die feinen Linien der Bueste); die Helligkeit
      // kommt aus den Partikeln selbst (uPreGain). Beim Formen wieder der volle Schein.
      const fw = smoothstep(0.0, 0.5, form);
      api.look.bloom = 0.38 + 0.42 * fw + 0.08 * arrive;
      api.look.bloomRadius = 0.5 + 0.16 * fw;
      api.look.bloomThreshold = 1.0 - 0.28 * fw;
      // die eigene Helligkeit der Hero-Bueste geht mit dem Bloom zurueck (kein heller Nebelball beim Formen)
      u.uPreGain.value.x = lerp(preGain, 1, fw);
      api.look.parallax = 0.32 - 0.08 * form;
    },

    setActive() {},

    dispose() {
      offResize();
      geometry.dispose();
      material.dispose();
      beamGeo.dispose();
      beamMat.dispose();
      group.clear();
    },
  };
  return api;
}

function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
