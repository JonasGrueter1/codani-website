// Szene "backdrop": der Hintergrund hinter allem, immer aktiv (Fenster intro@0 bis outro@1, Gewicht 1).
// Schnittstelle siehe ARCHITEKTUR.md (Kapitel 2 und 12): create(ctx) -> { group, update, setActive, dispose }.
//
// Ein Vollbild-Dreieck mit eigenem Shader (backdrop-glsl.js), gezeichnet vor allen anderen deckenden Objekten
// (renderOrder -50, ohne Tiefentest und ohne Tiefenschreiben, nicht transparent). Es geht wie alles andere durch Bloom
// und Tonemapping. Pro Bildpunkt rechnet der Shader die Welt-Blickrichtung: der Hintergrund dreht sich mit der Kamera
// (Kamerafahrten bekommen Tiefe), liegt aber unendlich weit weg.
//
// Farbwelten: BACKDROPS in config.js, eine pro Beat (intro Petrol, robot Studio mit Boden, zoom Scan-Labor, brain
// Biolumineszenz, cables Glasfaser-Blau, dna Code-Raum, outro Morgenlicht) und "inhalt". Mischung hier (ohne Allokationen pro Frame):
//   - weiche Kante BACKDROP_FADE (global) um jede Beat-Grenze, Gewichte normiert
//   - am Schnitt (director.cuts, Ende dna -> outro) harter Wechsel, versteckt im Lichtblitz des Runners
//   - im Inhaltsbereich nach director.content (setzt main.js) zur Farbwelt "inhalt"
// Dynamik innerhalb eines Beats (nur hier, Liste in ARCHITEKTUR.md): intro Strahlen schimmern; robot Lichtbahnen atmen
// mit der Bueste (5.2 s); zoom Messraster und Scanlinie mit dem Roentgen-Scan; brain Aurora leiser, solange die Kamera
// im Gehirn ist; dna Lichtkern und Code-Regen steigen mit dem Geruest, die Lichtflaechen treten im Tunnel zurueck;
// outro Sonnenaufgang (Horizont 0.4 -> 1).
// Das Modul setzt ausserdem scene.fog.color auf die Nebelfarbe der Farbwelt (entfernte Objekte laufen in den
// Hintergrund statt gegen Schwarz). Lichtfarben und Looks der anderen Szenen bleiben unberuehrt.
//
// Qualitaet: BD_Q 2 (high, alle Bausteine, Nebel 3 Zugriffe), 1 (medium: Nebel 2 Zugriffe, 1 Aurora-Vorhang),
// 0 (low: Verlauf, 1 Nebelschicht, Strahlen einfach, ohne Staub und Datenbahnen).
import { makeNoiseVolume } from './backdrop-noise.js';
import { BACKDROP_VERT, BACKDROP_FRAG } from './backdrop-glsl.js';
import { BACKDROPS, BACKDROPS_HELL, BACKDROPS_HELL_M, PAPER_GAIN, BACKDROP_FADE, BEATS } from '../config.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Grundwerte fuer Schluessel, die eine Farbwelt nicht setzt
const BASE = {
  base: 0x04060a, mid: 0x070b12, hi: 0x2a3644, accent: 0x000000, fogColor: 0x04060a,
  rayColor: 0x8fe3ee, starColor: 0xbdf6ff, gridColor: 0x2aa6bf, streakColor: 0x46e6ff, bokehColor: 0x46e6ff,
  codeColor: 0x1fd1a5, auroraA: 0x5b2bd1, auroraB: 0xb0307a, auroraEdge: 0x2fb7b0,
  washA: 0x46e6ff, washB: 0x6a3fd0, washC: 0xffa45c,
  glowAt: [0, 0, -10], glowShift: [0, 0], rayAt: [0, 10, -10], accentAt: [10, -4, -10],
  horizon: 0, horizonGlow: 0, glow: 0, glowSize: 1, fog: 0, fogScale: 1, fogSpeed: 0.004, rays: 0, rayFreq: 6,
  aurora: 0, stars: 0, dust: 0, floor: 0, floorY: -3.6, floorGrid: 0, floorShine: 1, grid: 0, streaks: 0, bokeh: 0,
  code: 0, wash: 0, pool: 0, detail: 1,
  // nur hell (Kapitel 14): Randabschattung, Glasringe, ruhiger Grund hinter dem Text, Abendlicht im Kopf
  vig: 0, vigColor: 0x000000, rings: 0, ringX: 0, ringA: 0x000000, ringB: 0x000000, calm: 0, calmColor: 0xe4eaee, dusk: 0,
};
const COLORS = ['base', 'mid', 'hi', 'accent', 'fogColor', 'rayColor', 'starColor', 'gridColor', 'streakColor',
  'bokehColor', 'codeColor', 'auroraA', 'auroraB', 'auroraEdge', 'washA', 'washB', 'washC', 'vigColor', 'ringA', 'ringB',
  'calmColor'];
const POINTS = ['glowAt', 'rayAt', 'accentAt'];
const NUMS = ['horizon', 'horizonGlow', 'glow', 'glowSize', 'fog', 'fogScale', 'fogSpeed', 'rays', 'rayFreq', 'aurora',
  'stars', 'dust', 'floor', 'floorY', 'floorGrid', 'floorShine', 'grid', 'streaks', 'bokeh', 'code', 'wash', 'pool', 'detail',
  'shiftX', 'shiftY', 'vig', 'rings', 'ringX', 'calm', 'dusk'];
const N = Object.fromEntries(NUMS.map((k, i) => [k, i]));

export function create(ctx) {
  const { THREE, camera, scene, director, shared, quality } = ctx;
  const group = new THREE.Group();
  group.name = 'scene:backdrop';

  /* --------------------------------------------------------- Farbwelten */
  // Jede Farbwelt einmal in feste Objekte umrechnen (Farben linear)
  const names = [...BEATS.map((b) => b.name), 'inhalt'];
  const makePreset = (name, src, mul) => {
    const num = new Float32Array(NUMS.length);
    for (const k of NUMS) num[N[k]] = k === 'shiftX' ? src.glowShift[0] : k === 'shiftY' ? src.glowShift[1] : src[k];
    return {
      name,
      num,
      mul, // Dynamik pro Frame (Faktor je Schluessel), dunkel und hell teilen dasselbe Feld
      col: COLORS.map((k) => new THREE.Color(src[k])),
      pt: POINTS.map((k) => new THREE.Vector3().fromArray(src[k])),
    };
  };
  const presetsDark = names.map((name) => makePreset(name, { ...BASE, ...(BACKDROPS[name] || {}) }, new Float32Array(NUMS.length).fill(1)));
  // Helles Thema (Kapitel 14): eigene Farben und Mengen, Formen und Punkte aus der dunklen Farbwelt
  // Hell (07.11.2026): `inner` einer Farbwelt ist ihr Innenraum (zoom: Flug in den Kopf, dna: Tunnel der Helix). Die
  // Farbwelt mischt pro Bild mit dem Faktor `inner` (unten, nur hell) von ihren Werten zu diesen.
  const fogI = COLORS.indexOf('fogColor');
  const presetsHell = names.map((name, i) => {
    const m = ctx.isMobile ? BACKDROPS_HELL_M[name] : null; // Handy: einzelne Werte anders (config.js)
    const src = { ...BASE, ...(BACKDROPS[name] || {}), ...(BACKDROPS_HELL[name] || {}), ...(m || {}) };
    const p = makePreset(name, src, presetsDark[i].mul);
    p.col[fogI].multiplyScalar(PAPER_GAIN);
    const inn = src.inner ? { ...src.inner, ...((m && m.inner) || {}) } : null;
    if (inn) {
      p.inner = {
        f: -1,
        cols: COLORS.map((k, j) => (inn[k] === undefined ? null
          : [p.col[j].clone(), new THREE.Color(inn[k]).multiplyScalar(k === 'fogColor' ? PAPER_GAIN : 1)])).filter(Boolean),
        idx: COLORS.map((k, j) => (inn[k] === undefined ? -1 : j)).filter((j) => j >= 0),
        nums: NUMS.filter((k) => inn[k] !== undefined).map((k) => [N[k], p.num[N[k]], inn[k]]),
      };
    }
    return p;
  });
  // Innenraum einer hellen Farbwelt mit Faktor f (0 = Farbwelt, 1 = inner), nur bei Aenderung
  const setInner = (p, f) => {
    const I = p.inner;
    if (!I || Math.abs(f - I.f) < 1e-4) return;
    I.f = f;
    for (let j = 0; j < I.idx.length; j++) p.col[I.idx[j]].copy(I.cols[j][0]).lerp(I.cols[j][1], f);
    for (const [k, a, b] of I.nums) p.num[k] = a + (b - a) * f;
  };
  const PH = Object.fromEntries(presetsHell.map((p) => [p.name, p]));
  let presets = presetsDark;
  const P = Object.fromEntries(presetsDark.map((p) => [p.name, p]));
  const weights = new Float32Array(presets.length);
  const mix = {
    num: new Float32Array(NUMS.length),
    col: COLORS.map(() => new THREE.Color()),
    pt: POINTS.map(() => new THREE.Vector3()),
  };
  const C = Object.fromEntries(COLORS.map((k, i) => [k, mix.col[i]]));
  const PT = Object.fromEntries(POINTS.map((k, i) => [k, mix.pt[i]]));

  /* ------------------------------------------------------------- Shader */
  const noise = makeNoiseVolume(THREE);
  const v3 = () => new THREE.Vector3();
  const U = {
    uNoise: { value: noise },
    uTime: shared.uTime,
    uRes: shared.uResolution,
    uInvProj: { value: camera.projectionMatrixInverse },
    uCamWorld: { value: camera.matrixWorld },
    uCamPos: { value: v3() },
    uBase: { value: C.base }, uMid: { value: C.mid }, uHi: { value: C.hi },
    uAccent: { value: C.accent }, uAccentDir: { value: v3() },
    uHorizon: { value: 0 }, uHorizonGlow: { value: 0 },
    uGlowDir: { value: v3() }, uGlow: { value: 0 }, uGlowSize: { value: 1 },
    uFog: { value: 0 }, uFogScale: { value: 1 }, uFogRot: { value: new THREE.Vector2() },
    uRayDir: { value: v3() }, uRays: { value: 0 }, uRayFreq: { value: 6 }, uRayColor: { value: C.rayColor },
    uAurora: { value: 0 }, uAuroraA: { value: C.auroraA }, uAuroraB: { value: C.auroraB }, uAuroraEdge: { value: C.auroraEdge },
    uStars: { value: 0 }, uStarColor: { value: C.starColor }, uDust: { value: 0 },
    uFloor: { value: 0 }, uFloorY: { value: -3.6 }, uFloorGrid: { value: 0 }, uFloorShine: { value: 1 },
    uGrid: { value: 0 }, uGridColor: { value: C.gridColor }, uScan: { value: 0 }, uScanTan: { value: 0 },
    uRingDir: { value: v3() }, uRingCos: { value: 0.99 },
    uStreaks: { value: 0 }, uStreakColor: { value: C.streakColor },
    uBokeh: { value: 0 }, uBokehColor: { value: C.bokehColor },
    uCode: { value: 0 }, uCodeColor: { value: C.codeColor },
    uWash: { value: 0 }, uWashA: { value: C.washA }, uWashB: { value: C.washB }, uWashC: { value: C.washC },
    uPool: { value: 0 }, uPoolAt: { value: PT.glowAt }, uWashSide: { value: 1 },
    uDetail: { value: 1 },
    uScrimRect: { value: new THREE.Vector4(0.25, 0.5, 0.2, 0.2) }, uScrimA: { value: 0 },
    uPaper: { value: PAPER_GAIN },
    // nur hell (#ifdef CODANI_LIGHT im Shader)
    uVig: { value: 0 }, uVigColor: { value: C.vigColor },
    uRings: { value: 0 }, uRingX: { value: 0 }, uRingA: { value: C.ringA }, uRingB: { value: C.ringB },
    uCalm: { value: 0 }, uCalmColor: { value: C.calmColor },
  };
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const mat = new THREE.ShaderMaterial({
    name: 'Backdrop',
    uniforms: U,
    vertexShader: BACKDROP_VERT,
    fragmentShader: BACKDROP_FRAG,
    defines: { BD_Q: quality === 'high' ? 2 : quality === 'medium' ? 1 : 0 },
    depthTest: false,
    depthWrite: false,
    fog: false,
  });
  mat.userData.themeDefine = true; // heller Lichtweg im Shader (#ifdef CODANI_LIGHT, theme.js)
  const mesh = new THREE.Mesh(geo, mat);
  // Deckend und vor allen anderen deckenden Objekten (die Nebelkugel von particles.js liegt bei -100 und wird
  // ueberdeckt). Transparente Objekte zeichnet three ohnehin danach.
  mesh.renderOrder = -50;
  mesh.frustumCulled = false;
  group.add(mesh);

  /* ------------------------------------------------------------ Zustand */
  const fogRot = { a: 0, b: 0 };
  // html.hell-abend nur bei Aenderung setzen (kein DOM-Zugriff pro Bild)
  let dusk = false;
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  const setDusk = (on) => {
    if (on === dusk) return;
    dusk = on;
    if (root) root.classList.toggle('hell-abend', on);
  };
  const washSide = { v: 1, target: 1 };
  const _right = v3();
  const _up = v3();
  const _d = v3();
  const iZoom = names.indexOf('zoom');
  const iInhalt = names.indexOf('inhalt');

  // Liegt am Beginn dieses Beats ein Schnitt (director.cuts)? Dort wechselt die Farbwelt hart.
  function isCut(t) {
    const cuts = director.cuts;
    if (!cuts) return false;
    for (let i = 0; i < cuts.length; i++) if (Math.abs(cuts[i] - t) < 1e-4) return true;
    return false;
  }
  // Uebergang in Beat i (0..1) beim Fortschritt g
  function enter(i, g) {
    const s = director.beat(BEATS[i].name).start;
    if (isCut(s)) return g >= s ? 1 : 0;
    return smoothstep(s - BACKDROP_FADE, s + BACKDROP_FADE, g);
  }
  // Gewicht pro Beat: Partition der Eins mit weicher Kante um jede Beat-Grenze, am Schnitt hart
  function beatWeights(g) {
    let sum = 0;
    for (let i = 0; i < BEATS.length; i++) {
      const a = i > 0 ? enter(i, g) : 1;
      const z = i < BEATS.length - 1 ? 1 - enter(i + 1, g) : 1;
      weights[i] = a * z;
      sum += weights[i];
    }
    for (let i = 0; i < BEATS.length; i++) weights[i] /= Math.max(1e-6, sum);
  }

  const api = {
    group,
    update(time, dt) {
      const g = director.global;
      beatWeights(g);
      const content = clamp01(director.content || 0);
      for (let i = 0; i < BEATS.length; i++) weights[i] *= 1 - content;
      weights[iInhalt] = content;

      /* Dynamik innerhalb der Beats (Faktoren auf die Werte der jeweiligen Farbwelt) */
      const zm = director.beat('zoom');
      const br = director.beat('brain');
      const dn = director.beat('dna');
      const ou = director.beat('outro');
      const inOutro = g >= ou.start - 0.04;
      // Roentgen-Scan: gleiche Formel wie robotScan in robot.js (xray, scanY)
      const dissolve = inOutro ? 0 : smoothstep(0.3, 0.84, zm.p);
      const scanY = dissolve <= 0 ? 9 : 1.15 - 2.35 * smoothstep(0, 0.62, dissolve) - 2.4 * smoothstep(0.62, 1, dissolve);
      const xray = inOutro ? 0 : smoothstep(0.42, 0.62, zm.p);
      P.intro.mul[N.rays] = 0.9 + 0.1 * Math.sin(time * 0.31) * Math.sin(time * 0.17 + 1.0);
      P.robot.mul[N.rays] = 1 + 0.06 * Math.sin((time * Math.PI * 2) / 5.2);
      P.zoom.mul[N.grid] = smoothstep(0.4, 0.58, zm.p);
      P.zoom.mul[N.rays] = 1 - smoothstep(0.3, 0.5, zm.p);
      const inside = smoothstep(0.38, 0.56, br.p) * (1 - smoothstep(0.86, 0.98, br.p));
      P.brain.mul[N.aurora] = 1 - 0.6 * inside;
      // Kapitel Code: Anflug (bis DNA_FROM) mit voller Lichtflaeche, im Tunnel leiser, das Geruest bringt den Lichtkern
      P.dna.mul[N.glow] = 0.35 + 0.65 * smoothstep(0.56, 0.8, dn.p);
      P.dna.mul[N.code] = 0.5 + 0.5 * smoothstep(0.32, 0.52, dn.p);
      P.dna.mul[N.wash] = 1 - 0.55 * smoothstep(0.3, 0.46, dn.p) * (1 - smoothstep(0.7, 0.86, dn.p));
      const sun = smoothstep(0, 0.8, ou.p);
      P.outro.mul[N.horizonGlow] = 0.4 + 0.6 * sun;
      P.outro.mul[N.glow] = 0.55 + 0.45 * sun;
      P.outro.mul[N.rays] = 0.3 + 0.7 * sun;
      if (presets === presetsHell) {
        // Hell: beim Flug in den Kopf wird das Studio zum Abendlicht des Gehirns (brain, cables und dna sind es ganz)
        setInner(PH.zoom, smoothstep(0.45, 0.75, zm.p));
      }

      /* Mischen */
      mix.num.fill(0);
      for (const c of mix.col) c.setRGB(0, 0, 0);
      for (const p of mix.pt) p.set(0, 0, 0);
      for (let i = 0; i < presets.length; i++) {
        const w = weights[i];
        if (w <= 1e-5) continue;
        const pr = presets[i];
        for (let k = 0; k < NUMS.length; k++) mix.num[k] += pr.num[k] * pr.mul[k] * w;
        for (let k = 0; k < COLORS.length; k++) {
          const s = pr.col[k];
          const o = mix.col[k];
          o.r += s.r * w; o.g += s.g * w; o.b += s.b * w;
        }
        for (let k = 0; k < POINTS.length; k++) mix.pt[k].addScaledVector(pr.pt[k], w);
      }
      const m = mix.num;

      /* Kamera und Richtungen */
      camera.updateMatrixWorld();
      const cp = camera.position;
      U.uCamPos.value.copy(cp);
      _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      U.uGlowDir.value.copy(PT.glowAt).sub(cp).normalize()
        .addScaledVector(_right, m[N.shiftX]).addScaledVector(_up, m[N.shiftY]).normalize();
      U.uRayDir.value.copy(PT.rayAt).sub(cp).normalize();
      U.uAccentDir.value.copy(PT.accentAt).sub(cp).normalize();

      /* Messkreis um den Kopf und Scanlinie (nur Farbwelt zoom) */
      const wz = weights[iZoom];
      if (wz > 1e-4) {
        _d.set(0, -0.1, 0).sub(cp);
        const dist = Math.max(0.5, _d.length());
        U.uRingDir.value.copy(_d).normalize();
        U.uRingCos.value = Math.cos(Math.atan(1.45 / dist));
        const hd = Math.max(0.3, Math.hypot(cp.x, cp.z));
        U.uScanTan.value = (Math.min(scanY, 2) - cp.y) / hd;
        U.uScan.value = dissolve > 0 && dissolve < 0.995 ? xray * (1 - smoothstep(0.85, 1, dissolve)) : 0;
      } else {
        U.uScan.value = 0;
      }

      /* Uniforms */
      U.uHorizon.value = m[N.horizon];
      U.uHorizonGlow.value = m[N.horizonGlow];
      U.uGlow.value = m[N.glow];
      U.uGlowSize.value = m[N.glowSize];
      U.uFog.value = m[N.fog];
      U.uFogScale.value = m[N.fogScale];
      fogRot.a += m[N.fogSpeed] * dt;
      fogRot.b += m[N.fogSpeed] * 1.9 * dt;
      U.uFogRot.value.set(fogRot.a, fogRot.b);
      U.uRays.value = m[N.rays];
      U.uRayFreq.value = m[N.rayFreq];
      U.uAurora.value = m[N.aurora];
      U.uStars.value = m[N.stars];
      U.uDust.value = m[N.dust];
      U.uFloor.value = m[N.floor];
      U.uFloorY.value = m[N.floorY];
      U.uFloorGrid.value = m[N.floorGrid];
      U.uFloorShine.value = m[N.floorShine];
      U.uGrid.value = m[N.grid];
      U.uStreaks.value = m[N.streaks];
      U.uBokeh.value = m[N.bokeh];
      U.uCode.value = m[N.code];
      U.uWash.value = m[N.wash];
      U.uPool.value = m[N.pool];
      U.uDetail.value = m[N.detail];
      U.uVig.value = m[N.vig];
      U.uRings.value = m[N.rings];
      U.uRingX.value = m[N.ringX];
      U.uCalm.value = m[N.calm];
      // Hell: Abendlicht im Kopf. Kopfzeile und Text-Karten richten sich danach (css/story.css, html.hell-abend)
      if (presets === presetsHell) setDusk(m[N.dusk] > 0.5);

      const sc = director.scrim;
      // Lichtflaechen auf die Seite weg vom Text (gedaempft, damit sie beim Wechsel der Textseite wandern statt springen)
      const portrait = ctx.size.width / Math.max(1, ctx.size.height) < 0.85;
      if (portrait) washSide.target = 1;
      else if (sc && sc.a > 0.1) washSide.target = sc.x < 0.5 ? 1 : -1;
      washSide.v += (washSide.target - washSide.v) * (1 - Math.exp(-dt * 1.2));
      U.uWashSide.value = washSide.v;
      if (sc && sc.a > 0.001) {
        U.uScrimRect.value.set(sc.x, sc.y, Math.max(0.02, sc.rx), Math.max(0.02, sc.ry));
        U.uScrimA.value = sc.a;
      } else {
        U.uScrimA.value = 0;
      }

      // Entfernte Objekte laufen in die Nebelfarbe der Farbwelt
      if (scene.fog) scene.fog.color.copy(C.fogColor);
    },
    setActive() {},
    // Thema: Farbwelten wechseln (den Lichtweg im Shader schaltet das Define CODANI_LIGHT, gesetzt von theme.js)
    setTheme(light) {
      presets = light ? presetsHell : presetsDark;
      if (!light) setDusk(false);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      noise.dispose();
      group.clear();
    },
  };
  return api;
}
