// Szene "robot": Android-Bueste mit menschlicher Anatomie (Variante B, von Jonas am 30.10.2026 gewaehlt).
// Schnittstelle siehe ARCHITEKTUR.md: create(ctx) -> { group, look, update, setActive, dispose }.
//
// Grundlage: MakeHuman-Grundmodell (CC0), offline aufbereitet (assets/robot/bust.bin), zur Laufzeit mit
// Catmull-Clark geglaettet (high 2 Stufen, sonst 1). Hilfsmodule:
//   robot-mesh.js       Bueste laden (einmal, gemeinsam mit particles-shape.js und robot-geometry.js), Unterteilung
//   robot-layout.js     Fugen und Oeffnungen der Schale als Felder (GLSL), Masse der Platten
//   robot-materials.js  Schale, Muskel-Gel, Innenschale, Glas, Hologramm, Mechanik-Materialien
//   robot-mech.js       Augen, Hals-Mechanik, Schaedelgitter, Kabelbuendel, Ohr-Sensormodul, Schulterringe, Kolben
//   robot-env.js        eigene Studio-Umgebung (nur Spiegelungen; den Raum dahinter zeichnet backdrop.js)
//   robot-geometry.js   Kopfform fuer andere Szenen (brain.js: Gehirn-Hardware sitzt an der Innenseite der Schale)
// Aufbau:
//   Schale    weisse Klarlack-Platten mit feinen Spaltmassen (Fase, Schatten, kein schwarzer Strich)
//   Muskeln   tuerkis-transparent wirkendes Gel mit weichen Faserbuendeln unter den Oeffnungen (Bauch, Achsel, Schulter)
//   Hals      offen: Kopfwender-Muskeln (Gel), Wirbelsaeule, Kolben, Kabel, Luftroehre
//   Hinterkopf offen mit Schaedelgitter, Glaskappe und lose fallenden Kabelbuendeln (Referenz 1)
//   Augen     Glasaugen mit Iris, Hornhaut mit Glanzlicht, Blick folgt dezent der Kamera
// Ablauf (ctx.director.beat):
//   robot   Aufbau (Hologramm, dann von unten fest), atmet, Kopf folgt dezent der Maus, Lichtimpulse
//   zoom    0.30-0.84 Roentgen-Scan von oben nach unten (uScanY): darueber Hologramm, das Gehirn (brain.js) erscheint
//   brain   Hologramm leise um das Gehirn, bis die Kamera eintaucht
//   outro   Bueste wieder ganz, Augen leuchten im Lichtblitz auf
// Hintergrund: keiner in dieser Szene. Das Studio-Gegenlicht hinter der Bueste kommt aus backdrop.js (Farbwelt robot).
// Diagnose nur in dev.html: ?ab=mech (ohne Schale), ab=debug (Fugen rot), ab=nobloom, ab=nokey, ab=noenv.
import { bustLevel1, bustLevel2, toGeometry, subMesh } from './robot-mesh.js';
import { makeShellMaterial, makeMuscleMaterial, makeHoloMaterial, makeCoreMaterial, makeGlassMaterial } from './robot-materials.js';
import { buildStudioEnv } from './robot-env.js';
import { buildMechanics } from './robot-mech.js';
import { openFieldJS, deepOpenJS } from './robot-layout.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Roentgen-Scan aus dem Fortschritt von zoom (brain.js und brain-hardware.js rechnen dieselbe Formel) */
export function robotScan(zoomP, inOutro = false, out = {}) {
  const dissolve = inOutro ? 0 : smoothstep(0.3, 0.84, zoomP);
  out.dissolve = dissolve;
  out.scanY = dissolve <= 0 ? 9 : 1.15 - 2.35 * smoothstep(0, 0.62, dissolve) - 2.4 * smoothstep(0.62, 1, dissolve);
  out.xray = inOutro ? 0 : smoothstep(0.42, 0.62, zoomP);
  return out;
}

export async function create(ctx) {
  const { THREE, palette, director, pointer, shared, quality } = ctx;
  const hi = quality === 'high';
  const debug = !!ctx.dev && /[?&]ab=debug\b/.test(window.location.search);
  const noShell = !!ctx.dev && /[?&]ab=mech\b/.test(window.location.search);
  const noBloom = !!ctx.dev && /[?&]ab=nobloom\b/.test(window.location.search);
  const dbgFlags = ctx.dev ? (new URLSearchParams(window.location.search).get('ab') || '') : '';

  const group = new THREE.Group();
  group.name = 'scene:robot';
  const body = new THREE.Group();
  group.add(body);

  /* ------------------------------------------------------------- Netz */
  // Stufe 1 ist geteilt (nur lesen), high glaettet ein zweites Mal (eigenes Netz)
  const level1 = await bustLevel1();
  let mesh = level1;
  if (hi) mesh = await bustLevel2(level1);
  const lm = mesh.lm;
  const DEPTH = 0.032;
  const CORE = 0.13;
  // Hinterkopf: Innenschale (Graphit, 0.13 tiefer) und Glas, nur die Vierecke im Bereich des Fensters
  const backHead = (x, y, z) => z < 0.2 && y > -0.72 && y < 0.6 && Math.atan2(Math.abs(x), z + 0.05) > 1.6;
  // Muskel-Gel nur dort, wo die Schale offen ist (plus Rand fuer Plattenwand und Kontaktschatten): unter geschlossenen
  // Platten wuerde es voll schattiert und danach von der Schale verdeckt (Overdraw, rund zwei Drittel gespart)
  const gelKeep = (x, y, z, arm) => openFieldJS(x, y, z, arm) < 0.075 && deepOpenJS(x, y, z) > -0.06;
  const geo = {
    shell: toGeometry(THREE, mesh),
    muscle: toGeometry(THREE, subMesh(mesh, gelKeep), -DEPTH),
    core: toGeometry(THREE, subMesh(mesh, backHead), -CORE),
    glass: toGeometry(THREE, subMesh(mesh, (x, y, z) => backHead(x, y, z) && y > -0.12), 0),
  };
  // Hologramm (Aufbau, Roentgen): eine Glaettungsstufe reicht, spart auf high rund 100k Dreiecke
  geo.holo = hi ? toGeometry(THREE, level1) : geo.shell;

  /* --------------------------------------------------------- Uniforms */
  const headMat = new THREE.Matrix4();
  const U = {
    uTime: shared.uTime,
    uHeadMat: { value: headMat },
    uBreath: { value: 0 },
    uScanY: { value: 9 },
    uInner: { value: palette.steel.clone().multiplyScalar(0.4) },
    uShellIn: { value: palette.white.clone().multiplyScalar(0.3) },
    uChromeCol: { value: palette.white.clone().multiplyScalar(0.92) },
    uRes: shared.uResolution,
    uFall: { value: new THREE.Vector2(-3.5, -2.95) },
    uDebug: { value: debug ? 1 : 0 },
    uEdgeGlow: { value: 0 },
    uEdgeY: { value: 9 },
    uEdgeCol: { value: palette.signal.clone().multiplyScalar(2.0) },
    uGel: { value: palette.signal.clone().multiplyScalar(0.12) },
    uGelHi: { value: palette.signal.clone().multiplyScalar(0.85) },
    uStruct: { value: palette.steel.clone().multiplyScalar(0.22) },
    uRidge: { value: palette.white.clone().lerp(palette.ice, 0.2).multiplyScalar(0.3) },
    uCoreDepth: { value: CORE },
    uPulse: { value: new THREE.Vector4(0.22, 1.0, 1.0, 0) },
    uDepth: { value: DEPTH },
    uDim: { value: 0 },
    uMechDim: { value: 0 },
    uMechCut: { value: 9 },
    uMechFade: { value: 0 },
    uWall: { value: palette.white.clone().multiplyScalar(0.8) },
    uHolo: { value: 0 },
    uHoloCol: { value: palette.signal.clone().multiplyScalar(0.55) },
    uHoloHi: { value: palette.ice.clone().multiplyScalar(1.6) },
    // nur im hellen Weg des Hologramms (Kapitel 14): Roentgen-Anteil und Tintenfarben
    uHoloX: { value: 0 },
    uThemeInk: ctx.themeUniforms ? ctx.themeUniforms.uThemeInk : { value: palette.ink.clone() },
    uThemeTeal: ctx.themeUniforms ? ctx.themeUniforms.uThemeTeal : { value: palette.signal.clone() },
  };

  /* ------------------------------------------------------- Materialien */
  const env = buildStudioEnv(THREE, ctx.renderer, palette);
  let envLight = null; // helles Studio (setTheme)
  // Weisse Glanzschale (Albedo um 0.85, kaum Blaustich), Klarlack voll, glatt. Auf medium/low ohne Klarlack (Leistung)
  const shellCol = palette.white.clone().lerp(new THREE.Color(1, 1, 1), 0.35).multiplyScalar(0.9);
  // Helles Thema (Pruefung 1): neutral weiss statt mit dem Blaustich von palette.white (setTheme tauscht nur die Farbe)
  const shellColLight = new THREE.Color(1, 1, 1).multiplyScalar(0.9);
  const mats = {
    shell: makeShellMaterial(THREE, U, { color: shellCol, envMap: env.texture, envIntensity: hi ? 1.15 : 1.45, roughness: hi ? 0.34 : 0.2, clearcoat: hi ? 1.0 : 0, clearcoatRoughness: 0.06, cheap: !hi, side: THREE.FrontSide }),
    // Innenseite der Schale (nur durch die Oeffnungen sichtbar), ohne Klarlack
    shellIn: makeShellMaterial(THREE, U, { color: shellCol, envMap: env.texture, envIntensity: hi ? 1.15 : 1.45, roughness: 0.5, clearcoat: 0, cheap: !hi, side: THREE.BackSide }),
    muscle: makeMuscleMaterial(THREE, U, { color: palette.signal.clone().multiplyScalar(0.16), envMap: env.texture, envIntensity: 1.1, cheap: !hi }),
    holo: makeHoloMaterial(THREE, U),
    core: makeCoreMaterial(THREE, U, { color: palette.mist.clone().multiplyScalar(0.36), envMap: env.texture }),
    glass: makeGlassMaterial(THREE, U, { color: palette.white.clone(), envMap: env.texture, side: THREE.FrontSide }),
    glassIn: makeGlassMaterial(THREE, U, { color: palette.white.clone(), envMap: env.texture, side: THREE.BackSide }),
  };
  // Helles Thema: das Hologramm hat einen eigenen Weg (#ifdef CODANI_LIGHT in robot-materials.js: Milchglas mit
  // Tintenlinien, weisse Scan-Kante) statt der allgemeinen Umrechnung von theme.js. Blending stellt setTheme um.
  mats.holo.userData.themeKeep = true;
  mats.holo.userData.themeDefine = true;
  if (dbgFlags.includes('glass')) { mats.glass.defines = { AB_DBG_GLASS: '' }; mats.glassIn.defines = { AB_DBG_GLASS: '' }; }
  const shellMesh = new THREE.Mesh(geo.shell, mats.shell);
  const shellInMesh = new THREE.Mesh(geo.shell, mats.shellIn);
  shellInMesh.renderOrder = 3; // nach der Aussenseite: verdeckte Innenflaechen verwirft der Tiefentest
  const muscleMesh = new THREE.Mesh(geo.muscle, mats.muscle);
  const holoMesh = new THREE.Mesh(geo.holo, mats.holo);
  holoMesh.renderOrder = 20;
  muscleMesh.renderOrder = 1;
  shellMesh.renderOrder = 2;
  const coreMesh = new THREE.Mesh(geo.core, mats.core);
  const glassMesh = new THREE.Mesh(geo.glass, mats.glass);
  glassMesh.renderOrder = 8;
  const glassInMesh = new THREE.Mesh(geo.glass, mats.glassIn);
  glassInMesh.renderOrder = 7; // Rueckseite zuerst, wie three.js es bei DoubleSide in zwei Durchgaengen macht
  for (const m of [shellMesh, shellInMesh, muscleMesh, holoMesh, coreMesh, glassMesh, glassInMesh]) m.frustumCulled = false;
  body.add(coreMesh, muscleMesh, shellMesh, shellInMesh, glassInMesh, glassMesh, holoMesh);

  /* ---------------------------------------------------------- Mechanik */
  const mech = buildMechanics(THREE, { lm, mesh, U, palette, env: env.texture, quality, headMat, shellCol });
  body.add(mech.group);

  /* ----------------------------------------------------------- Zustand */
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const pivot = new THREE.Vector3().fromArray(lm.headPivot);
  const _v = new THREE.Vector3();
  const st = { yaw: 0, pitch: 0, eye: 0, wall: 0 };
  const scan = {};
  // Zustand fuer die Mechanik, einmal angelegt und pro Frame nur ueberschrieben (keine Allokation pro Frame)
  const ms = { follow: 1, scan, weight: 1, leak: 0, inOutro: false, out: null, irisBoost: 0, buildLine: 9, camPos: ctx.camera.position, gaze: 1, gazeAt: null };
  // Ausklang: Blick erst zur Kamera, dann langsam zum Kontakt (links im Bild, im Hochformat darunter), Kopf dreht leicht mit
  const gazePt = new THREE.Vector3();
  const _cr = new THREE.Vector3(); const _cu = new THREE.Vector3();
  let outroYaw = 0;
  const look = {
    exposure: 1.0, bloom: 0.55, bloomRadius: 0.5, bloomThreshold: 1.15, key: 1.35, rim: 1.0, amb: 0.1,
    parallax: 0.26, drift: 0.025, aberration: 0.0012, flash: 0, vignette: 0.74, env: 0.35,
  };
  // Helles Thema (Kapitel 14): Produktfoto im hellen Studio. Mehr Fuehrungslicht und Fuellung (die Schattenseite der
  // Schale steht grau vor dem weissen Gegenlicht und traegt so die Silhouette), Glanzlichter ohne Lichthof.
  const lookHell = { exposure: 1.2, bloom: 0.12, bloomRadius: 0.4, bloomThreshold: 2.0, aberration: 0, vignette: 0.08, grain: 0.018, key: 0.5, rim: 1.0, amb: 0.25, rimWarm: 0.45 };
  const bw = { r: 0, z: 0, b: 0, o: 0, s: 1 };
  const mix4 = (a, b, c, d) => (a * bw.r + b * bw.z + c * bw.b + d * bw.o) / bw.s;

  const api = {
    group,
    look,
    lookHell,
    update(time, dt, local, global, weight = 1) {
      const rb = director.beat('robot');
      const zm = director.beat('zoom');
      const br = director.beat('brain');
      const out = director.beat('outro');
      const inOutro = global >= out.start - 0.04;

      let follow = 1;
      let holoAmt = 0;
      let buildLine = 9;
      let power = 1;
      let leak = 0;
      if (!inOutro) {
        follow = 1 - smoothstep(0.0, 0.32, zm.p);
        // Lichtimpuls in den Fugen kurz vor dem Scan: laeuft einmal von oben nach unten (zoom@0.24 bis 0.31), sonst
        // sind die Fugen dunkle Rinnen mit hellem Grat (kein Dauerleuchten im Profil)
        const lp = clamp01((zm.p - 0.24) / 0.07);
        leak = lp > 0 && lp < 1 ? Math.sin(Math.PI * lp) : 0;
        U.uEdgeY.value = 1.25 - 2.9 * lp;
        // Hell (Pruefung 1): die Roentgen-Kontur bleibt bis zum Eintauchen stehen (sonst verschwindet der Kopf im Off-White)
        const holoOut = ctx.theme && ctx.theme.light ? 1 - smoothstep(0.26, 0.46, br.p) : 1 - smoothstep(0.15, 0.46, br.p);
        holoAmt = 0.6 * smoothstep(0.3, 0.42, zm.p) * (1 - 0.55 * smoothstep(0.6, 0.95, zm.p)) * holoOut;
        // Aufbau im Beat robot: erst Hologramm (0.08-0.26), dann von unten nach oben fest (0.26-0.64)
        const b = smoothstep(0.26, 0.64, rb.p);
        buildLine = b >= 0.999 ? 9 : -3.6 + (1.25 + 3.6) * b;
        holoAmt = Math.max(holoAmt, 0.75 * smoothstep(0.08, 0.26, rb.p) * (1 - smoothstep(0.6, 0.68, rb.p)));
        power = smoothstep(0.64, 0.74, rb.p);
      }
      if (shared.uScanY && shared.uDissolve) {
        scan.scanY = shared.uScanY.value;
        scan.dissolve = shared.uDissolve.value;
        scan.xray = shared.uXray ? shared.uXray.value : robotScan(zm.p, inOutro, {}).xray;
      } else robotScan(zm.p, inOutro, scan);

      /* Kopf folgt der Maus (dezent), Eigenleben, Atmen */
      const k = 1 - Math.exp(-dt * 2.2);
      const idleYaw = Math.sin(time * 0.19) * 0.04 + Math.sin(time * 0.067) * 0.025;
      const idlePitch = Math.sin(time * 0.15 + 1.0) * 0.018;
      let gazeMix = 0;
      if (inOutro) {
        const cam = ctx.camera;
        _cr.setFromMatrixColumn(cam.matrixWorld, 0); _cu.setFromMatrixColumn(cam.matrixWorld, 1);
        const portrait = ctx.size.width / Math.max(1, ctx.size.height) < 0.85;
        gazeMix = smoothstep(0.32, 0.85, out.p);
        // Ziel: Kamera, dann eine Stelle links neben der Kamera (Kontakt-Panel), leicht unter Augenhoehe
        // Hochformat: der Blick senkt sich nur leicht (vorher -0.9: das Gesicht kippte aus dem Fuehrungslicht und wurde grau)
        gazePt.copy(cam.position).addScaledVector(_cr, -(portrait ? 1.4 : 2.6) * gazeMix).addScaledVector(_cu, -(portrait ? 0.3 : 0.45) * gazeMix);
        ms.gazeAt = gazePt;
        const ty = clamp01((Math.atan2(gazePt.x - pivot.x, gazePt.z - pivot.z) + 0.6) / 1.2) * 1.2 - 0.6;
        outroYaw += (ty * 0.32 - outroYaw) * (1 - Math.exp(-dt * 1.2));
      } else { ms.gazeAt = null; outroYaw *= Math.exp(-dt * 2); }
      st.yaw += ((pointer.sx * 0.26 * (1 - 0.5 * gazeMix) + idleYaw + outroYaw) * follow - st.yaw) * k;
      st.pitch += ((-pointer.sy * 0.1 + idlePitch) * follow - st.pitch) * k;
      const roll = (Math.sin(time * 0.11) * 0.01 - st.yaw * 0.06) * follow;
      euler.set(st.pitch, st.yaw, roll);
      headMat.makeRotationFromEuler(euler);
      _v.copy(pivot).applyMatrix4(headMat);
      headMat.setPosition(pivot.x - _v.x, pivot.y - _v.y, pivot.z - _v.z);
      const breath = Math.sin((time * Math.PI * 2) / 5.2);
      U.uBreath.value = breath * follow;
      body.position.y = breath * 0.004 * follow;

      U.uScanY.value = Math.min(scan.scanY, buildLine);
      // Hochformat: im Roentgen nur Kopf und Hals, der Rumpf blendet nach unten aus (sonst wirre Umrisse am Handy)
      const fallK = !inOutro && ctx.size.width / Math.max(1, ctx.size.height) < 0.85 ? scan.xray : 0;
      U.uFall.value.set(-3.5 + 1.75 * fallK, -2.95 + 1.6 * fallK);
      U.uMechCut.value = buildLine;
      // Mechanik (Schaedelgitter, Kabel, Hals) loest sich auf, waehrend die Kamera ins Gehirn taucht: so verschwindet
      // sie nicht hart am Ende des Fensters (brain@0.6 plus Rampe), wenn sie von innen gross im Bild steht
      // Runde 2: frueher, damit beim Eintauchen keine Kabel und Stangen mehr vor der Linse stehen (Version 4: der
      // Anflug ist laenger, brain@0.12 bis 0.38)
      U.uMechFade.value = inOutro ? 0 : smoothstep(0.12, 0.38, br.p);
      // Augen: kurzes Flackern beim Einschalten, im Ausklang hell im Lichtblitz
      const flick = power > 0 && power < 1 ? 0.55 + 0.45 * Math.sin(time * 47) * Math.sin(time * 13) : 1;
      const irisBoost = power * flick * (inOutro ? 1 + 1.4 * Math.exp(-Math.pow(out.p / 0.12, 2)) : 1);
      U.uHolo.value = holoAmt * weight;
      U.uHoloX.value = scan.xray;
      U.uEdgeGlow.value = leak * 0.5 * weight;
      U.uDim.value = 0.35 * scan.xray;
      U.uMechDim.value = 0.4 * scan.xray;
      U.uPulse.value.y = (0.9 + 1.2 * leak) * weight;

      ms.follow = follow; ms.scan = scan; ms.weight = weight; ms.leak = leak; ms.inOutro = inOutro; ms.out = out;
      ms.irisBoost = irisBoost; ms.buildLine = buildLine; ms.gaze = follow;
      mech.update(time, dt, ms);

      shellMesh.visible = scan.dissolve < 0.999 && buildLine > -3.55 && !noShell;
      shellInMesh.visible = shellMesh.visible;
      muscleMesh.visible = scan.dissolve < 0.999 && buildLine > -3.55;
      coreMesh.visible = scan.dissolve < 0.999 && buildLine > -0.9;
      glassMesh.visible = scan.dissolve < 0.5 && buildLine > -0.3 && !noShell;
      glassInMesh.visible = glassMesh.visible;
      holoMesh.visible = holoAmt > 0.002;

      /* Bildwirkung */
      bw.r = rb.w; bw.z = zm.w; bw.b = br.w; bw.o = out.w;
      bw.s = Math.max(1e-3, bw.r + bw.z + bw.b + bw.o);
      // Licht: kuehles Kantenlicht hinten deutlich, warmes Fuehrungslicht fast weg (Weiss bleibt neutral), Fuellung leise
      // Ausklang auf dem Handy (Runde 2): heller und mit Glanz, sonst wirkt die Schale ohne Klarlack grau und matt
      look.key = mix4(0.14, 0.16, 0.45, ctx.isMobile ? 0.36 : 0.16);
      look.rim = mix4(1.8, 1.6, 1.4, 1.7);
      look.amb = mix4(0.06, 0.06, 0.1, ctx.isMobile ? 0.1 : 0.06);
      // Ausklang im Morgenlicht: Kantenlicht warm (Gold) statt Cyan, sonst wirkt die Bueste hineinkopiert
      look.rimWarm = mix4(0, 0, 0, 0.85);
      look.aberration = mix4(0.0012, 0.0015, 0.004, 0.001);
      look.exposure = mix4(1.13, 1.08, 0.98, ctx.isMobile ? 1.12 : 1.12);
      if (!hi) {
        // medium/low ohne Klarlack: im Ausklang glatter und mehr Spiegelung (schmale Glanzlinien der Studio-Streifen)
        const ow = bw.o / bw.s;
        mats.shell.roughness = 0.2 - 0.09 * ow;
        mats.shell.envMapIntensity = 1.45 + 0.2 * ow;
        mats.shellIn.envMapIntensity = mats.shell.envMapIntensity;
      }
      const xr = smoothstep(0.45, 0.75, zm.p);
      look.bloom = (mix4(0.55, 0.6, 0.6, 0.6) + 0.3 * xr * (1 - smoothstep(0.12, 0.46, br.p))) * (ctx.isMobile ? 0.86 : 1);
      look.bloomThreshold = mix4(1.5, 1.4, 1.05, 1.5) - 0.35 * xr;
      if (noBloom) look.bloom = 0;
      if (dbgFlags.includes('nokey')) { look.key = 0; look.rim = 0; }
      if (dbgFlags.includes('noenv')) { mats.shell.envMapIntensity = 0; }
      look.parallax = (inOutro ? 0.28 : 0.26) * follow + 0.02;
      look.drift = 0.025 * (1 - smoothstep(0.4, 0.9, zm.p)) + 0.004;
      look.flash = inOutro ? 0 : 0.06 * Math.exp(-Math.pow((br.p - 0.4) / 0.086, 2));
      if (ctx.theme && ctx.theme.light) {
        lookHell.exposure = mix4(1.15, 1.12, 1.05, ctx.isMobile ? 1.18 : 1.15);
        lookHell.key = mix4(0.55, 0.5, 0.6, ctx.isMobile ? 0.6 : 0.5);
        lookHell.rim = mix4(1.1, 1.0, 1.0, 1.1);
        lookHell.amb = mix4(0.28, 0.26, 0.3, 0.28);
        lookHell.bloom = 0.12 + 0.1 * xr * (1 - smoothstep(0.12, 0.46, br.p));
        // Kantenlicht neutral weiss statt Cyan (sonst wirkt die weisse Schale hellblau), im Ausklang warm wie dunkel
        lookHell.rimWarm = mix4(0.45, 0.45, 0.45, 0.85);
      }
    },
    setActive() {},
    // Helles Thema: Spiegelungen aus dem hellen Studio (erst beim ersten Wechsel gebaut, dunkel kostet es nichts).
    // Gleicher Umgebungs-Typ und gleiche Groesse: three.js nimmt dasselbe Programm, nur die Textur wechselt.
    // Hologramm: eigener heller Weg mit normalem Blending. Mechanik: im hellen Thema transparent, damit sie sich beim
    // Eintauchen weich ueber die Deckkraft aufloest (dunkel bleibt sie deckend mit dem Korn wie bisher).
    setTheme(light) {
      mats.holo.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      mats.shell.color.copy(light ? shellColLight : shellCol);
      mats.shellIn.color.copy(light ? shellColLight : shellCol);
      group.traverse((o) => {
        const list = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of list) {
          if (!m.userData.abMech) continue;
          const tr = light ? true : !!m.userData.abTr0;
          if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
        }
      });
      if (light && !envLight) envLight = buildStudioEnv(THREE, ctx.renderer, palette, { light: true });
      const from = light ? env.texture : envLight && envLight.texture;
      const to = light ? envLight.texture : env.texture;
      if (!from || from === to) return;
      group.traverse((o) => {
        const list = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of list) if (m.envMap === from) m.envMap = to;
      });
    },
    dispose() {
      new Set(Object.values(geo)).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      mech.dispose();
      env.dispose();
      if (envLight) envLight.dispose();
      group.clear();
    },
  };
  return api;
}
