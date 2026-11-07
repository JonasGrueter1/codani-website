// Szene "brain": neuronales Gehirn im Kopf der Android-Bueste.
// Fenster: zoom@0.3 bis cables@1. Die Kamera taucht von vorne oben durch die Roentgen-Schale ein, fliegt durch das
// Gehirn und hinten hinaus,
// danach sieht man es von der Seite, waehrend die Kabel gezogen werden.
//
// Aufbau (alles prozedural, Daten aus brain-build.js, Shader aus brain-shaders.js):
//   Rinde      ~55k Punkte auf gefalteten Windungen. Form aus Ellipsoid-Lappen (Hauptkoerper, Schlaefen-, Hinterhaupt-
//              lappen je Haelfte), Laengsspalt und Sylvische Furche als Kerben, Windungen als Hoehenlinien von Rauschen.
//              Relief-Licht ueber echte Flaechennormalen, Rueckseite gedaempft. Kleinhirn mit Querrillen, Hirnstamm
//              bis zum Kabelaustritt (ANCHORS.cableRoot).
//   Neuronen   ~2600 Zellen (davon ~7 % ruhig leuchtende Hubs), gebogene Verbindungen zu den 3 naechsten Nachbarn.
//   Impulse    8 Erregungswellen laufen ueber die Verbindungen (Ankunftszeit pro Zelle, Dijkstra) und verzweigen
//              sich wie Blitze, die Rinde leuchtet dabei weich mit. Dazu einzelne spontane Funken.
//   Fasern     Projektionsbahnen laufen zum Hirnstamm und tragen Lichtpakete Richtung Kabelaustritt.
//   Licht      Aufblitzen an den Ausloesern, Glimmen am Kabelaustritt, Hauch. Maus: Zellen unter dem Zeiger glimmen.
//   Hardware   Das Gehirn liegt in einer Wiege (brain-hardware.js): Ring, Spanten, Buegel, Klammern, Streben zur Schale,
//              Saeule in den Hals, Rundstecker am Kabelaustritt, Platinen mit Leiterbahnen und Chips (brain-hw-atlas.js),
//              Kuehlrippen, Luefter, Elektroden-Kabel. Elektroden und Polster leuchten mit den Erregungswellen.
//              Sichtbar ab dem Roentgen-Scan (gleiche Formel wie robot.js robotScan), 2 Draw Calls.
//
// Ablauf (ctx.director.beat):
//   zoom   0.30-0.92  Enthuellung von vorne nach hinten (passend zur Schale, die vom Gesicht her zerfaellt)
//          0.50-1.00  Aktivitaet steigt
//   brain  0.25-0.90  Faserbahnen beginnen zu fliessen, Kabelaustritt glimmt auf
//   cables            ruhig weiter aktiv, Blick von der Seite
// Von aussen ist das Netz gedaempft (Windungen lesbar), innen voll und mit Tiefenstaffelung.
//
// Qualitaet: Mengen mit tier.particles (1 / 0.5 / 0.25), Teilstuecke pro Verbindung 4 / 3 / 2, auf Handy
// groessere und hellere Rindenpunkte. Draw Calls: 6 (+2 Hardware). Pro Frame nur Uniforms, keine Allokationen.
// Unsichtbares (noch nicht enthuellt, zu nah, im Nebel) wird schon im Vertex-Shader verworfen.
import { buildBrain, CASCADES, ARR_SCALE } from './brain-build.js';
import { makeMaterials } from './brain-shaders.js';
import { createHardware } from './brain-hardware.js';
import { makeHeadShape } from './robot-geometry.js'; // Kopfform der Android-Bueste (Szene robot)

const SUBDIV = { high: 4, medium: 3, low: 2 };
const FIBER_SEG = { high: 28, medium: 18, low: 12 };

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (n) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

export function create(ctx) {
  const { THREE, palette, anchors: A, director, shared, quality, tier, pointer } = ctx;
  const q = Math.max(0.2, tier ? tier.particles : 1);

  const group = new THREE.Group();
  group.name = 'scene:brain';
  group.position.copy(A.brain.center);
  const center = A.brain.center;
  const local = (v) => v.clone().sub(center);

  const data = buildBrain({
    R: A.brain.radii.clone(),
    root: local(A.cableRoot),
    headC: local(A.head.center),
    headR: A.head.radii.clone().multiplyScalar(0.93),
    q,
    subdiv: SUBDIV[quality] ?? 4,
    fiberSeg: FIBER_SEG[quality] ?? 28,
  });

  /* ---------------------------------------------------------- Uniforms */
  const glowVals = Array.from({ length: 12 }, () => new THREE.Vector4());
  const U = {
    uTime: shared.uTime,
    uResolution: shared.uResolution,
    uAlpha: { value: 1 },
    uReveal: { value: 0 },
    uAct: { value: 1 },
    uFog: { value: 0.03 },
    uArrScale: { value: ARR_SCALE },
    uClock0: { value: new THREE.Vector4(9, 9, 9, 9) },
    uClock1: { value: new THREE.Vector4(9, 9, 9, 9) },
    uAmp0: { value: new THREE.Vector4() },
    uAmp1: { value: new THREE.Vector4() },
    uReach0: { value: new THREE.Vector4().fromArray(data.cascades.reach, 0) },
    uReach1: { value: new THREE.Vector4().fromArray(data.cascades.reach, 4) },
    uPointer: { value: new THREE.Vector2() },
    uPointerAmt: { value: 0 },
    uAspect: { value: 1 },
    uNearClip: { value: Math.max(0.012, ctx.camera.near * 1.2) },
    uFlow: { value: 0 },
    uNetBase: { value: 1 },
    uInside: { value: 0 },
    uGlow: { value: glowVals },
  };
  const mats = makeMaterials(THREE, U, palette);
  // Helles Thema (theme.js): dunkle Linien und Punkte auf Hell. Gleicher Faktor fuer Materialien mit gleichem Shader
  // (cortex und dust, edges und fibers), sonst entstuenden zusaetzliche Programme. Die weichen Lichtflecken (glows)
  // bleiben Licht (hellen auf Hell nur leise auf).
  mats.cortex.userData.themeGain = 4.0; // 07.11.2026: 3.2 -> 4.0 (Rinde vor dem getoenten Innenraum)
  mats.dust.userData.themeGain = 4.0;
  mats.neurons.userData.themeGain = 2.6;
  mats.edges.userData.themeGain = 4.5;
  mats.fibers.userData.themeGain = 4.5;
  mats.glows.userData.themeKeep = true;
  // Hell (07.11.2026, Jonas: "Wenn man ins Gehirn zoomt, ... sieht man nichts"): Verbindungen und Faserbahnen breiter,
  // damit die Tinte vor dem getoenten Innenraum (backdrop, Farbwelt brain) klar steht. Nur Uniform-Werte (setTheme),
  // dunkel bleiben sie genau wie bisher.
  const WIDTH = { edges: mats.edges.uniforms.uWidth.value, fibers: mats.fibers.uniforms.uWidth.value };
  const WIDTH_HELL = { edges: 1.5, fibers: 1.6 };
  // Weniger Punkte (Handy): etwas groesser und heller, damit die Rinde gleich dicht wirkt
  const comp = 1 + 0.6 * (1 - Math.min(1, q));
  mats.cortex.uniforms.uSize.value *= comp;
  mats.cortex.uniforms.uGyrus.value.multiplyScalar(comp);
  mats.cortex.uniforms.uSulcus.value.multiplyScalar(comp);

  /* ---------------------------------------------------------- Geometrien */
  const geos = [];
  const attr = (arr, n, norm = false) => new THREE.BufferAttribute(arr, n, norm);
  const iattr = (arr, n, norm = false) => new THREE.InstancedBufferAttribute(arr, n, norm);

  // Rinde
  const gCortex = new THREE.BufferGeometry();
  gCortex.setAttribute('position', attr(data.cortex.pos, 3));
  gCortex.setAttribute('normal', attr(data.cortex.nor, 3));
  gCortex.setAttribute('aMeta', attr(data.cortex.meta, 4));
  gCortex.setAttribute('aArr0', attr(data.cortex.arr0, 4, true));
  gCortex.setAttribute('aArr1', attr(data.cortex.arr1, 4, true));
  geos.push(gCortex);

  // Nervenzellen
  const gNeurons = new THREE.BufferGeometry();
  gNeurons.setAttribute('position', attr(data.neurons.pos, 3));
  gNeurons.setAttribute('aMeta', attr(data.neurons.meta, 4));
  gNeurons.setAttribute('aArr0', attr(data.neurons.arr0, 4, true));
  gNeurons.setAttribute('aArr1', attr(data.neurons.arr1, 4, true));
  geos.push(gNeurons);

  // Baender: Viereck (x = t entlang, y = Seite)
  const ribbonBase = (g) => {
    g.setAttribute('position', attr(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    return g;
  };
  const gEdges = ribbonBase(new THREE.InstancedBufferGeometry());
  gEdges.setAttribute('aA', iattr(data.edges.a, 3));
  gEdges.setAttribute('aB', iattr(data.edges.b, 3));
  gEdges.setAttribute('aMeta', iattr(data.edges.meta, 4));
  gEdges.setAttribute('aArA0', iattr(data.edges.arA0, 4, true));
  gEdges.setAttribute('aArA1', iattr(data.edges.arA1, 4, true));
  gEdges.setAttribute('aArB0', iattr(data.edges.arB0, 4, true));
  gEdges.setAttribute('aArB1', iattr(data.edges.arB1, 4, true));
  gEdges.instanceCount = data.edges.count;
  geos.push(gEdges);

  const gFibers = ribbonBase(new THREE.InstancedBufferGeometry());
  gFibers.setAttribute('aA', iattr(data.fibers.a, 3));
  gFibers.setAttribute('aB', iattr(data.fibers.b, 3));
  gFibers.setAttribute('aMeta', iattr(data.fibers.meta, 4));
  gFibers.instanceCount = data.fibers.count;
  geos.push(gFibers);

  // Lichtflecken: Billboards
  const gGlows = new THREE.InstancedBufferGeometry();
  gGlows.setAttribute('position', attr(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  gGlows.setIndex([0, 1, 2, 0, 2, 3]);
  const glowArr = new Float32Array(data.glows.length * 4);
  const glowIdx = new Float32Array(data.glows.length);
  data.glows.forEach((g, i) => { glowArr.set(g, i * 4); glowIdx[i] = i; });
  gGlows.setAttribute('aGlow', iattr(glowArr, 4));
  gGlows.setAttribute('aIdx', iattr(glowIdx, 1));
  gGlows.instanceCount = data.glows.length;
  geos.push(gGlows);

  // Schwebeteilchen
  const gDust = new THREE.BufferGeometry();
  gDust.setAttribute('position', attr(data.dust.pos, 3));
  gDust.setAttribute('aMeta', attr(data.dust.meta, 4));
  geos.push(gDust);

  /* ---------------------------------------------------------- Objekte */
  const objs = [
    new THREE.Mesh(gGlows, mats.glows),
    new THREE.Mesh(gFibers, mats.fibers),
    new THREE.Mesh(gEdges, mats.edges),
    new THREE.Points(gCortex, mats.cortex),
    new THREE.Points(gNeurons, mats.neurons),
    new THREE.Points(gDust, mats.dust),
  ];
  objs.forEach((o, i) => {
    o.frustumCulled = false; // Verschiebung im Shader, Kamera oft mitten drin
    o.renderOrder = 10 + i;
    group.add(o);
  });

  /* ---------------------------------------------------------- Zustand */
  const { period, phase } = data.cascades;
  const clocks = new Float32Array(CASCADES);
  const amps = new Float32Array(CASCADES);

  /* ---------------------------------------------------------- Hardware (Wiege, Platinen, Kabel) */
  const hw = createHardware(ctx, data, { headShape: makeHeadShape(A.head.radii) });
  group.add(hw.group);
  const hwState = { weight: 1, reveal: 0, clocks, amps };
  const cIce = palette.ice;
  const cSig = palette.signal;
  const cEmber = palette.ember;

  const look = {
    bloom: 0.85, bloomRadius: 0.6, bloomThreshold: 0.72, exposure: 1.0,
    parallax: 0.05, drift: 0.008, fogDensity: 0.03, vignette: 0.85, aberration: 0.006,
  };
  // Integration: im Hochformat (Handy) liegt der Text ueber dem dichten Netz, darum etwas weniger Glow
  if (ctx.isMobile) { look.bloom = 0.72; look.exposure = 0.94; }
  const baseBloom = look.bloom; const baseExposure = look.exposure;

  const api = {
    group,
    look,
    update(time, dt, localP, global, weight = 1) {
      const zm = director.beat('zoom');
      const br = director.beat('brain');
      const reveal = smoothstep(0.3, 0.92, zm.p);
      const act = 0.35 + 0.65 * smoothstep(0.5, 1.0, zm.p);
      const flow = smoothstep(0.04, 0.9, br.p);
      const rootOn = 0.1 + 0.9 * smoothstep(0.55, 1.0, br.p);

      U.uAlpha.value = weight;
      U.uReveal.value = reveal;
      U.uAct.value = act;
      U.uFlow.value = flow;
      // Von aussen: Netz ruhiger, damit die Windungen lesbar bleiben. Innen: Netz voll
      const camDist = ctx.camera.position.distanceTo(center);
      const outside = smoothstep(0.85, 1.7, camDist);
      // Eintauchen (brain@0.2 bis 0.95): Netz und Bloom deutlich ruhiger, nur wenige Wellen hell (sonst brennt das Bild aus)
      const dive = smoothstep(0.2, 0.46, br.p) * (1 - smoothstep(0.85, 0.97, br.p));
      U.uNetBase.value = (1 - 0.65 * outside) * (1 - 0.45 * dive);
      look.bloom = baseBloom * (1 - 0.5 * dive);
      look.bloomThreshold = 0.72 + 0.4 * dive;
      look.exposure = baseExposure * (1 - 0.08 * dive);
      // Kabel-Szene: keine chromatische Aberration und weniger Vignette, die Knoten-Links am Bildrand (E-Mail, Dokumente)
      // sollen scharf und hell sein (Testkunden Runde 2). Ab cables@0.2, wenn die Links erscheinen.
      const cabOn = smoothstep(0.0, 0.2, director.beat('cables').p);
      look.aberration = 0.006 * (1 - cabOn);
      look.vignette = 0.85 - 0.4 * cabOn;
      U.uInside.value = 1 - outside;
      U.uFog.value = ctx.scene.fog ? ctx.scene.fog.density : 0.03;
      U.uAspect.value = ctx.size.width / Math.max(1, ctx.size.height);
      U.uPointer.value.set(pointer.sx, pointer.sy);
      // Maus: Zellen unter dem Zeiger glimmen auf (nur wenn die Maus wirklich auf der Seite ist, nicht auf Touch)
      const pTarget = pointer.inside && !pointer.touch ? 1 : 0;
      U.uPointerAmt.value += (pTarget - U.uPointerAmt.value) * (1 - Math.exp(-dt * 3));

      /* Erregungswellen: Uhr pro Ausloeser, Staerke je Durchgang leicht verschieden */
      for (let k = 0; k < CASCADES; k++) {
        const t = time + phase[k];
        const cyc = Math.floor(t / period[k]);
        clocks[k] = t - cyc * period[k];
        amps[k] = (0.45 + 0.55 * hash(cyc * 13.1 + k * 7.7)) * act * (k < 3 ? 1 : 1 - 0.75 * dive);
      }
      // Markanter Moment beim Flug durch das Gehirn: aus dem Kern (Thalamus, letzter Ausloeser) laeuft eine starke
      // Welle durch das ganze Netz, an den Scroll gekoppelt. Danach fliessen die Faserbahnen zum Kabelaustritt.
      const kw = CASCADES - 1;
      const wv = smoothstep(0.46, 0.86, br.p);
      if (wv > 0 && wv < 1) {
        clocks[kw] = wv * (data.cascades.reach[kw] + 0.5);
        amps[kw] = 1.05 * act;
      }
      U.uClock0.value.set(clocks[0], clocks[1], clocks[2], clocks[3]);
      U.uClock1.value.set(clocks[4], clocks[5], clocks[6], clocks[7]);
      U.uAmp0.value.set(amps[0], amps[1], amps[2], amps[3]);
      U.uAmp1.value.set(amps[4], amps[5], amps[6], amps[7]);

      hwState.weight = weight;
      hwState.reveal = reveal;
      hw.update(time, dt, hwState);

      /* Licht: Aufblitzen an den Ausloesern, warme Kerne, Kabelaustritt, Hauch */
      for (let k = 0; k < CASCADES; k++) {
        const c = clocks[k];
        const f = amps[k] * smoothstep(0, 0.05, c) * Math.exp(-c * 3.2) * 0.4 * reveal;
        glowVals[k].set(cIce.r * f, cIce.g * f, cIce.b * f, 0);
      }
      const heart = (0.012 + 0.006 * Math.sin(time * 1.25)) * reveal;
      glowVals[8].set(cEmber.r * heart, cEmber.g * heart, cEmber.b * heart, 0);
      const heart2 = (0.012 + 0.006 * Math.sin(time * 1.25 + 1.9)) * reveal;
      glowVals[9].set(cEmber.r * heart2, cEmber.g * heart2, cEmber.b * heart2, 0);
      const rg = rootOn * (0.45 + 0.12 * Math.sin(time * 2.1)) * reveal;
      glowVals[10].set(cSig.r * rg, cSig.g * rg, cSig.b * rg, 0);
      const hz = 0.03 * reveal * (0.85 + 0.15 * Math.sin(time * 0.9));
      glowVals[11].set(cSig.r * hz, cSig.g * hz, cSig.b * hz, 0);
    },
    setActive() {},
    setTheme(light) {
      mats.edges.uniforms.uWidth.value = WIDTH.edges * (light ? WIDTH_HELL.edges : 1);
      mats.fibers.uniforms.uWidth.value = WIDTH.fibers * (light ? WIDTH_HELL.fibers : 1);
      if (hw.setTheme) hw.setTheme(light);
    },
    dispose() {
      hw.dispose();
      geos.forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      group.clear();
    },
  };
  return api;
}
