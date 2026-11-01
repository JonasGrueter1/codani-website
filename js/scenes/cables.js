// Szene "cables": Aus dem Gehirn werden Glasfaserbuendel gezogen und mit fuenf Werkzeug-Knoten verbunden.
// Fenster: brain@0.7 bis dna@0.42 (siehe config.js MODULES). Im Beat dna fliegt die Kamera in den Website-Knoten.
//
// Zeitachse u in Beat-Einheiten: -0.3 = brain@0.7, 0 = cables@0, 1 = cables@1 = dna@0, 1 + p = dna@p
//   -0.25..0.42  Kabel wachsen aus dem Hirnstamm (gestaffelt), leuchtende Spitze vorne
//   -0.12..0.10  Knoten erscheinen als leise Ziele (Ring schliesst sich, Icon gedimmt)
//    Verbindung  Knoten startet: Schockwelle, Licht in der Kugel
//    danach      Lichtimpulse laufen zu den Knoten (Takt pro Kabel), jeder Treffer laesst den Knoten
//                aufleuchten. Selten laeuft ein warmer Impuls zurueck zum Gehirn.
//    1..1+DNA_FROM  Anflug (Beat dna): Fokus auf den Website-Knoten, die anderen treten zurueck, die Kamera fliegt
//                hinein (Portal: Ringe weg, Kugel oeffnet sich), dahinter tritt die Helix (dna) aus der Faser
//
// Version 4: Die Knoten sind Links. Beschriftungen zeichnet die Szene nicht mehr selbst: sie meldet pro Bild die
// Bildposition jedes Knotens (api.screen, ohne Allokation) und js/nodes.js setzt die HTML-Links darueber. Zeigt
// oder fokussiert man einen Link, leuchtet sein Knoten und die Impulse laufen schneller (api.setHighlight).
//
// Leistung: 5 Draw Calls (Staub, Fasern + Maentel, Ringe, Knoten, Spitzen). Alles Bewegte im Shader,
// pro Frame nur wenige Uniforms.
import {
  STRANDS, SAMPLES, RING_SEG, MOTES, buildCurves, buildFibreGeometry, buildRingGeometry, buildNodeGeometry,
  buildMoteGeometry, smoothstep,
} from './cables-paths.js';
import { makeMaterials } from './cables-shaders.js';
import { DNA_FROM } from '../config.js';

export const NODE_LABELS = { email: 'E-Mail', website: 'Website', kalender: 'Kalender', dokumente: 'Dokumente', kunden: 'Kunden' };

// Wachstum je Kabel [Start, Ende] in u: deutlich gestaffelt, damit die Kabel unterschiedlich lang aus dem Gehirn
// kommen (gleichzeitig wirkten die Spitzen von innen wie ein Windrad)
const GROW = {
  email: [-0.27, 0.16],
  dokumente: [-0.2, 0.23],
  kalender: [-0.13, 0.29],
  kunden: [-0.06, 0.35],
  website: [0.0, 0.42],
};
const SPEED = 3.4;        // Impulse in Welt-Einheiten pro Sekunde
const HI_SPEED = 2.2;     // hervorgehobenes Kabel: Impulse so viel schneller (zusaetzlich zu SPEED)
const GAP = 4.2;          // Pause zwischen zwei Impulsen (in Laengeneinheiten)
const RET_FACTOR = 2.6;   // Rueck-Impulse sind seltener

export function create(ctx) {
  const { THREE, palette, anchors: A, director, shared, quality, camera } = ctx;
  const group = new THREE.Group();
  group.name = 'scene:cables';

  const strands = STRANDS[quality] ?? STRANDS.high;
  const samples = SAMPLES[quality] ?? SAMPLES.high;
  const curves = buildCurves(THREE, A, samples);
  const names = curves.map((c) => c.name);
  const count = curves.length;

  /* ------------------------------------------------------------ Uniforms */
  const vec4s = () => Array.from({ length: count }, () => new THREE.Vector4());
  const U = {
    uTime: shared.uTime,
    uResolution: shared.uResolution,
    uPixelRatio: shared.uPixelRatio,
    uAlpha: { value: 1 },
    uTrunk: { value: 1 },
    uFog: { value: 0.03 },
    uR: { value: A.nodeRadius },
    uCab: { value: vec4s() },
    uCab2: { value: vec4s() },
    uNodePos: { value: curves.map((c) => c.node.clone()) },
    uNodeA: { value: vec4s() },
    uNodeB: { value: vec4s() },
    uNodeIn: { value: curves.map((c) => c.inDir.clone()) },
    uTip: { value: vec4s() },
    // Helligkeiten bewusst moderat: kleine, sehr helle Flecken wirken im Bloom eckig
    uBase: { value: palette.signal.clone().multiplyScalar(0.2) },
    uPulse: { value: palette.ice.clone().multiplyScalar(2.3) },
    uPulseTail: { value: palette.signal.clone().multiplyScalar(1.05) },
    uEmber: { value: palette.ember.clone().multiplyScalar(2.0) },
    uTipCol: { value: palette.ice.clone().multiplyScalar(1.7) },
    uSheath: { value: palette.signal.clone().lerp(palette.mist, 0.35).multiplyScalar(0.34) },
    uSig: { value: palette.signal.clone() },
    uIce: { value: palette.ice.clone() },
    uDeep: { value: palette.deep.clone().lerp(palette.ink, 0.6) },
    uMist: { value: palette.mist.clone() },
    uWhite: { value: palette.white.clone() },
    uMotes: { value: 0 },
    uMoteCol: { value: palette.signal.clone().lerp(palette.ice, 0.4).multiplyScalar(0.9) },
  };
  for (let i = 0; i < count; i++) U.uCab2.value[i].w = curves[i].length;

  /* ------------------------------------------------------------ Objekte */
  const mats = makeMaterials(THREE, U);
  const fibreGeo = buildFibreGeometry(THREE, curves, strands);
  const ringGeo = buildRingGeometry(THREE, count, RING_SEG[quality] ?? RING_SEG.high);
  const nodeGeo = buildNodeGeometry(THREE, curves);
  const moteGeo = buildMoteGeometry(THREE, curves, MOTES[quality] ?? MOTES.high);
  const tipGeo = new THREE.BufferGeometry();
  tipGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  tipGeo.setAttribute('aIdx', new THREE.BufferAttribute(new Float32Array(curves.map((_, i) => i)), 1));

  const fibres = new THREE.Mesh(fibreGeo, mats.fibre);
  const rings = new THREE.Mesh(ringGeo, mats.ring);
  const nodes = new THREE.Mesh(nodeGeo.geometry, mats.node);
  const tips = new THREE.Points(tipGeo, mats.tip);
  const motes = new THREE.Points(moteGeo, mats.mote);
  motes.renderOrder = 19;
  fibres.renderOrder = 20;
  tips.renderOrder = 21;
  nodes.renderOrder = 22;
  rings.renderOrder = 23;
  for (const o of [motes, fibres, rings, nodes, tips]) {
    o.frustumCulled = false;
    group.add(o);
  }

  /* ------------------------------------------------------------ Bildpositionen der Knoten (fuer js/nodes.js) */
  // Pro Knoten: Mitte (cx, cy) und Radius r in CSS-Pixeln, Sichtbarkeit vis 0..1 (Knoten im Bild, nicht unter Kopfzeile,
  // HUD oder Text, nicht hinter einem naeheren Knoten), side = Seite der Beschriftung (1 rechts, -1 links), w = Breite der
  // Beschriftung (setzt nodes.js nach dem Messen). Die Objekte werden pro Bild nur ueberschrieben.
  const screen = curves.map((c) => ({
    name: c.name, label: NODE_LABELS[c.name] || c.name,
    cx: 0, cy: 0, r: 0, vis: 0, on: 0, side: 1, w: (NODE_LABELS[c.name] || c.name).length * 8.6 + 52, wf: 0,
    depth: 0, occ: 1, nx0r: 0, nx0l: 0, ny: 0, nx: 0, base: 0,
  }));
  let hiName = null;
  const hi = new Float32Array(curves.length); // Hervorhebung pro Knoten, weich 0..1

  /* ------------------------------------------------- Sichere Zonen der Links */
  // Knoten-Links duerfen nicht unter Kopfzeile, HUD (unten rechts) oder dem Text-Panel liegen: dort weich ausblenden.
  const safe = { top: 76, hud: null, dirty: true };
  const measureSafe = () => {
    safe.dirty = false;
    if (typeof document === 'undefined') return;
    const cs = getComputedStyle(document.documentElement);
    const hh = parseFloat(cs.getPropertyValue('--header-h'));
    safe.top = (Number.isFinite(hh) ? hh : 76) + 24;
    const hud = document.querySelector('.hud');
    const r = hud ? hud.getBoundingClientRect() : null;
    safe.hud = r && r.width > 0 ? { x0: r.left - 16, y0: r.top - 14, x1: r.right + 16, y1: r.bottom + 14 } : null;
  };
  const offSafe = ctx.onResize(() => { safe.dirty = true; });
  const boxDist = (ax0, ay0, ax1, ay1, b) => {
    const dx = Math.max(b.x0 - ax1, ax0 - b.x1, 0);
    const dy = Math.max(b.y0 - ay1, ay0 - b.y1, 0);
    return Math.hypot(dx, dy);
  };
  const textBox = { x0: 0, y0: 0, x1: 0, y1: 0, on: 0 };
  // Text-Panel (Zone aus director.scrim, in UV mit y oben), einmal pro Frame
  function measureText(W, H) {
    const sc = director.scrim;
    // Hochformat: der Scrim ist dort nur halb so stark, der Text steht aber voll da (fast deckende Flaeche)
    const portrait = W / Math.max(1, H) < 0.85;
    textBox.on = sc && sc.a > 0.01 ? Math.min(1, sc.a * (portrait ? 5 : 2.5)) : 0;
    if (!textBox.on) return;
    textBox.x0 = (sc.x - sc.rx) * W - 12;
    textBox.x1 = (sc.x + sc.rx) * W + 12;
    textBox.y0 = (1 - sc.y - sc.ry) * H - 12;
    textBox.y1 = (1 - sc.y + sc.ry) * H + 12;
  }
  // Abstand zum Text mit der vollen Breite (wf: mit Untertitel, den nodes.js beim Zeigen einblendet), damit die
  // Beschriftung auch beim Zeigen nicht in den Text laeuft
  const fullW = (lb) => Math.max(lb.w, lb.wf || 0);
  const textDist = (lb, side) => {
    const w = fullW(lb);
    const x0 = side > 0 ? lb.nx0r : lb.nx0l - w;
    return boxDist(x0, lb.ny - 9, x0 + w, lb.ny + 9, textBox);
  };
  function safeFade(lb, W, H) {
    const x0 = lb.side > 0 ? lb.nx : lb.nx - lb.w;
    const x1 = x0 + lb.w;
    const y0 = lb.ny - 9;
    const y1 = lb.ny + 9;
    // Kopfzeile: Knoten und Label muessen ganz darunter liegen
    let f = smoothstep(safe.top - 4, safe.top + 22, Math.min(y0, lb.cy - lb.r));
    if (safe.hud) f *= smoothstep(0, 22, boxDist(x0, y0, x1, y1, safe.hud));
    if (textBox.on) f *= 1 - (1 - smoothstep(0, 26, boxDist(x0, y0, x1, y1, textBox))) * textBox.on;
    return f;
  }
  // Knoten (3D) unter der Kopfzeile: weich ausblenden, wie die Labels
  function nodeHeaderFade(i) {
    tmpV.copy(nodePos[i]).applyMatrix4(camera.matrixWorldInverse);
    const depth = -tmpV.z;
    if (depth < 0.4) return 1;
    tmpV.copy(nodePos[i]).project(camera);
    const H = ctx.size.height;
    const cy = (-tmpV.y * 0.5 + 0.5) * H;
    const rPx = (A.nodeRadius * camera.projectionMatrix.elements[5] * H * 0.5) / depth;
    if (safe.dirty) measureSafe();
    // Halo der Kugel mitrechnen (etwa 1.6 r)
    return smoothstep(safe.top - 10, safe.top + 36, cy - rPx * 1.6);
  }

  /* ------------------------------------------------------------ Zustand */
  const state = curves.map((c, i) => ({
    growWin: GROW[c.name] || [-0.2, 0.4],
    grow: 0,
    on: 0,
    connected: false,
    bootAt: -100,
    // Impulse: Takt pro Kabel, gleiche Geschwindigkeit in der Welt
    period: (c.length + GAP) / SPEED,
    offset: i * 1.37 + 0.4,
    retPeriod: ((c.length + GAP) / SPEED) * RET_FACTOR,
    retOffset: i * 2.11 + 1.3,
  }));
  const tmpV = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const nodePos = U.uNodePos.value;
  // Knoten werden von hinten nach vorne gezeichnet (ein Draw Call, vormultipliziertes Alpha)
  const idxAttr = nodeGeo.geometry.getAttribute('aIdx');
  const order = Array.from({ length: count }, (_, i) => i);
  const viewZ = new Float32Array(count);

  function sortNodes() {
    for (let i = 0; i < count; i++) {
      tmpV.copy(nodePos[i]).applyMatrix4(camera.matrixWorldInverse);
      viewZ[i] = tmpV.z; // negativ = vor der Kamera, kleiner = weiter weg
    }
    for (let i = 1; i < count; i++) { // Einfuegesortierung, 5 Elemente, ohne Speicher
      const v = order[i];
      let j = i - 1;
      while (j >= 0 && viewZ[order[j]] > viewZ[v]) { order[j + 1] = order[j]; j--; }
      order[j + 1] = v;
    }
    let changed = false;
    for (let i = 0; i < count; i++) {
      if (idxAttr.array[i] !== order[i]) { idxAttr.array[i] = order[i]; changed = true; }
    }
    if (changed) idxAttr.needsUpdate = true;
  }

  function timeline(global) {
    const bb = director.beat('brain');
    const bc = director.beat('cables');
    const bd = director.beat('dna');
    if (global < bc.start) return (global - bc.start) / Math.max(1e-6, bb.end - bb.start);
    if (global < bd.start) return (global - bc.start) / Math.max(1e-6, bc.end - bc.start);
    return 1 + (global - bd.start) / Math.max(1e-6, bd.end - bd.start);
  }

  // Punkt auf der Mittellinie bei Bogenlaenge s (inkl. Schweben/Schwingen wie im Shader)
  function pointAt(cv, s, time, out) {
    const { pts, s: S, count: n, length: L, index: c } = cv;
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (S[mid] < s) lo = mid; else hi = mid;
    }
    const f = Math.min(1, Math.max(0, (s - S[lo]) / Math.max(1e-6, S[hi] - S[lo])));
    out.set(
      pts[lo * 3] + (pts[hi * 3] - pts[lo * 3]) * f,
      pts[lo * 3 + 1] + (pts[hi * 3 + 1] - pts[lo * 3 + 1]) * f,
      pts[lo * 3 + 2] + (pts[hi * 3 + 2] - pts[lo * 3 + 2]) * f,
    );
    const bob = U.uCab2.value[c];
    const k = smoothstep(L * 0.5, L, s);
    out.x += bob.x * k;
    out.y += bob.y * k;
    out.z += bob.z * k;
    const sway = smoothstep(1.6, 3.6, s) * (1 - smoothstep(L - 3.0, L - 0.6, s));
    out.x += Math.sin(time * 0.55 + s * 0.8 + c * 1.7) * 0.05 * sway;
    out.y += 0.8 * Math.sin(time * 0.47 + s * 0.63 + c * 2.3) * 0.05 * sway;
    return out;
  }

  function hideScreen() {
    for (const sc of screen) sc.vis = 0;
  }

  const api = {
    group,
    // Keine chromatische Aberration: die Knoten am Bildrand (E-Mail, Dokumente) sind Links und sollen scharf sein
    look: { bloom: 1.0, bloomRadius: 0.4, parallax: 0.12, drift: 0.018, fogDensity: 0.026, aberration: 0, vignette: 0.45 },

    update(time, dt, local, global, weight = 1) {
      const u = timeline(global);
      U.uAlpha.value = weight;
      U.uTrunk.value = smoothstep(-0.06, 0.12, u);
      U.uFog.value = ctx.scene.fog ? ctx.scene.fog.density : 0.03;
      camera.updateMatrixWorld();
      camPos.setFromMatrixPosition(camera.matrixWorld);
      // Anflug auf den Website-Knoten (Beat dna bis DNA_FROM): Fokus dort, die anderen Knoten treten zurueck
      const focus = smoothstep(1.01, 1 + DNA_FROM * 0.85, u);

      measureText(ctx.size.width, ctx.size.height);
      // Hervorhebung (Link gezeigt oder fokussiert): weich ein und aus
      let anyHi = 0;
      for (let i = 0; i < count; i++) {
        const want = hiName === names[i] ? 1 : 0;
        hi[i] += (want - hi[i]) * (1 - Math.exp(-Math.max(dt, 1 / 60) * (want ? 9 : 5)));
        if (dt === 0) hi[i] = want;
        anyHi = Math.max(anyHi, hi[i]);
      }
      U.uMotes.value = smoothstep(-0.25, 0.5, u) * 1.15;
      for (let i = 0; i < count; i++) {
        const cv = curves[i];
        const st = state[i];
        const L = cv.length;

        // Schweben des Knotens
        const bob = U.uCab2.value[i];
        bob.set(
          Math.sin(time * 0.61 + i * 1.3) * 0.05,
          Math.sin(time * 0.83 + i * 2.1) * 0.07,
          Math.cos(time * 0.52 + i) * 0.04,
          L,
        );
        nodePos[i].copy(cv.node).add(tmpV.set(bob.x, bob.y, bob.z));

        // Wachstum: schnell heraus, weich ins Ziel
        const gw = st.growWin;
        const gx = Math.min(1, Math.max(0, (u - gw[0]) / (gw[1] - gw[0])));
        const ge = 1 - Math.pow(1 - gx, 2.4);
        st.grow = ge * L;
        const connected = gx >= 1;
        if (connected && !st.connected) st.bootAt = time;
        st.connected = connected;
        st.on = connected ? Math.min(1, st.on + dt * 2.5) : Math.max(0, st.on - dt * 4);
        if (dt === 0) st.on = connected ? 1 : 0;

        // Impulse (CPU rechnet die Koepfe, der Shader zeichnet: Treffer und Aufleuchten sind synchron)
        // Hervorgehobenes Kabel: der Takt laeuft schneller (Phase verschieben statt Periode aendern, ohne Sprung)
        st.offset += dt * HI_SPEED * hi[i];
        const ph = ((time + st.offset) % st.period + st.period) % st.period;
        const P = ph * SPEED - 1.0;
        const arrive = L - 0.12;
        const pulseAge = P >= arrive ? (P - arrive) / SPEED : 99;
        const rph = ((time + st.retOffset) % st.retPeriod + st.retPeriod) % st.retPeriod;
        const Q = L + 0.4 - rph * SPEED * 0.85;

        const cab = U.uCab.value[i];
        cab.set(st.grow + 0.002, P, Q, st.on);

        // Knoten
        const appear = smoothstep(-0.14 + i * 0.015, 0.1 + i * 0.015, u);
        const bootAge = time - st.bootAt;
        let shockAge = 99;
        let shockAmp = 0;
        if (st.on > 0.01 && pulseAge < 1.8) { shockAge = pulseAge; shockAmp = 0.75; }
        if (connected && bootAge < 1.8 && bootAge < shockAge) { shockAge = bootAge; shockAmp = 1.35; }
        const flash = connected
          ? Math.max(Math.exp(-pulseAge * 3.4) * st.on, Math.exp(-Math.max(0, bootAge) * 2.2) * 1.2)
          : 0;
        // Hervorhebung: Knoten leuchtet (Rand, Halo, Icon), die anderen treten etwas zurueck
        const glowHi = hi[i] * st.on * (0.55 + 0.15 * Math.sin(time * 5.0 + i));
        const isWeb = names[i] === 'website';
        const dimO = Math.max((anyHi - hi[i]) * 0.55, isWeb ? 0 : focus);
        // Portal: die Kamera fliegt in den Website-Knoten (Ringe weg, Kugel oeffnet sich), ganz nah blendet er aus
        const dist = camPos.distanceTo(nodePos[i]);
        const portal = isWeb ? 1 - smoothstep(0.7, 3.2, dist) : 0;
        const inside = smoothstep(0.32, 0.6, dist);
        // w = Hervorhebung: das Icon unter der Maus (oder mit Fokus) wird hell und scharf gezeichnet
        U.uNodeA.value[i].set(appear * inside * nodeHeaderFade(i), st.on, Math.min(1.4, flash + glowHi), Math.max(hi[i], isWeb ? focus : 0));
        U.uNodeB.value[i].set(shockAge, shockAmp, portal, dimO);

        // Spitze
        const tipI = gx > 0 && gx < 1 ? smoothstep(0, 0.04, gx) * (1 - smoothstep(0.9, 1, gx)) : 0;
        const tip = U.uTip.value[i];
        pointAt(cv, st.grow, time, tmpV);
        tip.set(tmpV.x, tmpV.y, tmpV.z, tipI);

        // Bildposition fuer den Link (Verdeckung danach in resolveScreen)
        placeNode(i, appear * weight, st.on);
      }
      sortNodes();
      resolveScreen(dt);
    },

    /** Bildpositionen der Knoten (nur lesen, siehe oben) */
    screen,
    /** Knoten hervorheben (Name aus NODE_LABELS) oder null */
    setHighlight(name) { hiName = name || null; },

    setActive(active) {
      if (!active) hideScreen();
    },

    dispose() {
      offSafe();
      fibreGeo.dispose();
      ringGeo.dispose();
      nodeGeo.dispose();
      tipGeo.dispose();
      moteGeo.dispose();
      for (const m of Object.values(mats)) m.dispose();
      hideScreen();
      group.clear();
    },
  };

  // Pass 1: Bildposition, Grundsichtbarkeit, Tiefe, Seite der Beschriftung
  function placeNode(i, vis, on) {
    const lb = screen[i];
    lb.on = on;
    lb.base = 0;
    const p = nodePos[i];
    tmpV.copy(p).applyMatrix4(camera.matrixWorldInverse);
    const depth = -tmpV.z;
    lb.depth = depth;
    if (depth < 0.4 || vis < 0.01) return;
    tmpV.copy(p).project(camera);
    const W = ctx.size.width;
    const H = ctx.size.height;
    const rPx = (A.nodeRadius * camera.projectionMatrix.elements[5] * H * 0.5) / depth;
    lb.cx = (tmpV.x * 0.5 + 0.5) * W;
    lb.cy = (-tmpV.y * 0.5 + 0.5) * H;
    lb.r = rPx;
    // Beschriftung neben der Trefferflaeche (mindestens 24 px Radius um die Mitte)
    const hit = Math.max(24, rPx * 1.25);
    lb.nx0r = lb.cx + hit + 4;
    lb.nx0l = lb.cx - hit - 4;
    lb.ny = lb.cy;
    // Seite mit Hysterese: rechts der Kugel, nahe am rechten Rand oder am Text-Panel links davon
    const room = W - (lb.nx0r + fullW(lb) + 16);
    const textR = textBox.on ? textDist(lb, 1) < 30 : false;
    const textL = textBox.on ? textDist(lb, -1) < 30 : false;
    if (lb.side > 0 && (room < 0 || (textR && !textL))) lb.side = -1;
    else if (lb.side < 0 && room > 40 && !(textR && !textL) && (!textBox.on || textDist(lb, 1) > 60)) lb.side = 1;
    lb.nx = lb.side > 0 ? lb.nx0r : lb.nx0l;
    // Knoten muss im Bild sein, Beschriftung ganz lesbar
    const x0 = lb.side > 0 ? lb.nx : lb.nx - lb.w;
    if (lb.cx < 8 || lb.cx > W - 8 || lb.cy < 12 || lb.cy > H - 12 || x0 < 4 || x0 + lb.w > W - 4 || rPx < 5) return;
    if (safe.dirty) measureSafe();
    lb.base = vis * smoothstep(5, 12, rPx) * (1 - smoothstep(Math.min(W, H) * 0.22, Math.min(W, H) * 0.36, rPx)) * safeFade(lb, W, H);
  }

  // Pass 2: Knoten, deren Beschriftung von einem naeheren Knoten oder dessen Beschriftung verdeckt wird, weich ausblenden
  function resolveScreen(dt) {
    for (let i = 0; i < count; i++) {
      const a = screen[i];
      let occ = 0;
      if (a.base > 0) {
        const ax = a.side > 0 ? a.nx + a.w * 0.5 : a.nx - a.w * 0.5; // Mitte der Beschriftung
        const hw = a.w * 0.5 + 6;
        for (let j = 0; j < count; j++) {
          const b = screen[j];
          if (j === i || !(b.base > 0.05) || b.depth >= a.depth) continue;
          // naeherer Knoten (Kugel mit Halo) ueber der Beschriftung?
          const dx = Math.max(Math.abs(ax - b.cx) - hw, 0);
          const dy = Math.max(Math.abs(a.ny - b.cy) - 10, 0);
          if (dx * dx + dy * dy < (b.r * 1.35) ** 2) occ = 1;
          // naehere Beschriftung im Weg?
          const bx = b.side > 0 ? b.nx + b.w * 0.5 : b.nx - b.w * 0.5;
          if (Math.abs(ax - bx) < (a.w + b.w) * 0.5 + 10 && Math.abs(a.ny - b.ny) < 30) occ = 1;
          // eigene Kugel hinter einer naeheren Kugel?
          const dc = Math.hypot(a.cx - b.cx, a.cy - b.cy);
          if (dc < b.r * 1.1 + a.r * 0.6) occ = 1;
        }
      }
      a.occ += ((occ ? 0 : 1) - a.occ) * (1 - Math.exp(-10 * Math.max(dt, 1 / 60)));
      const v = a.base * a.occ;
      a.vis = v < 0.01 ? 0 : Math.round(v * 100) / 100;
    }
  }

  return api;
}
