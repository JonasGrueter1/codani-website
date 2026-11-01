// Szene "dna": Die DNA aus Code.
// Die Kamera taucht in den Website-Knoten und fliegt durch eine rotierende Doppelhelix aus Code-Zeichen.
// Strang A ist Website-Code (HTML, CSS), Strang B ist KI und Logik (JavaScript, Python): die zwei Angebote,
// verbunden durch Basenpaare aus Klammer-Paaren. In der zweiten Haelfte reisst die Helix vor der Kamera auf,
// die Zeichen fliegen nach vorne und setzen sich zu einem Website-Geruest zusammen (Browserfenster mit
// Kopfzeile, Hero, Karten, Buttons als leuchtende Linien). Auf dem Handy entsteht eine Handy-Ansicht.
//
// Zeitplan (local = dna@0..1, Kamerapfad siehe config.js, Werte in dna-build.js und dna-code.js):
//   0.00..0.12  Flug in den Website-Knoten, die Helix tritt dahinter aus der Faser
//   0.12..0.44  Flug durch die Helix: Lesekoepfe laufen die Baender entlang, Basenpaare leuchten,
//               die Maus entschluesselt Zeichen unter dem Zeiger
//   0.00..0.21  Helix einmal von aussen (Dreiviertelansicht), dann schwenkt die Kamera vor den Anfang
//   0.21..0.44  Eintauchen entlang der Achse
//   0.44..0.58  vor der Kamera reisst die Helix auf (Basenpaare oeffnen sich), ein Teil der Zeichen fliegt
//               ins Geruest (ohne Lichtspuren: sie wirkten ueber dem Geruest wie Splitter), der Rest verglueht
//   0.50..0.74  Layout-Raster, Konturen mit Schreibkopf, Flaechen, Texte entschluesseln sich Zeichen fuer Zeichen
//               (zeitbasiert: uDec laeuft auch ohne Scrollen weiter, spaetestens bei ~0.76 ist alles lesbar)
//   0.66..0.80  Ebenen setzen sich, danach Ruhe: Lichtlauf, Lichtkegel der Maus, leichte Neigung.
//               Kleine Beschriftungen sind Balken, als Text bleiben Headline, Adresse und Hauptbutton (lesbar).
//               Darunter blendet ui.js die Angebotszeile ein (HTML, #offer).
//
// Leistung: 4 Draw Calls (Rueckgrat-Baender, Basenpaare, Geruest, Zeichen), Stufe high rund
// 7300 Instanzen und 37k Dreiecke. Alles Bewegte im Shader, pro Frame nur Uniforms, keine Allokationen.
import { buildAtlas, BLOCK } from './dna-atlas.js';
import { CLS } from './dna-code.js';
import {
  QUALITY, GROOVE, bandHalfWidth, buildWire, buildGlyphs, buildRungGeometry, buildWireGeometry, buildBandGeometry,
} from './dna-build.js';
import { makeMaterials } from './dna-shaders.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export async function create(ctx) {
  const { THREE, palette: C, anchors: A, shared, quality, director, pointer } = ctx;
  const q = QUALITY[quality] || QUALITY.high;
  const group = new THREE.Group();
  group.name = 'scene:dna';

  const atlas = await buildAtlas(THREE, quality);
  const wire = buildWire(A);
  const glyphData = buildGlyphs(A, atlas, q, wire);
  const { start, end, radius, turnLength } = A.dna;
  const turnC = turnLength / (2 * Math.PI);

  /* ------------------------------------------------------------ Uniforms */
  const col = (c, k) => c.clone().multiplyScalar(k);
  const ink = (a, b, t, k) => a.clone().lerp(b, t).multiplyScalar(k);
  const palette12 = new Array(12).fill(null).map(() => new THREE.Color());
  palette12[CLS.plainA] = col(C.signal, 0.36);
  palette12[CLS.keyA] = ink(C.signal, C.ice, 0.7, 0.62);
  palette12[CLS.string] = col(C.ember, 0.5);
  palette12[CLS.punct] = ink(C.steel, C.mist, 0.5, 0.42);
  palette12[CLS.number] = ink(C.signal, C.white, 0.4, 0.5);
  palette12[CLS.plainB] = ink(C.mist, C.ice, 0.55, 0.34);
  palette12[CLS.keyB] = ink(C.ice, C.white, 0.5, 0.62);
  palette12[CLS.bracket] = ink(C.ice, C.white, 0.3, 1.05);
  palette12[CLS.dust] = ink(C.signal, C.mist, 0.5, 0.2);
  // Zieltexte knapp unter der Bloom-Schwelle: gestochen scharf statt verschwommen
  palette12[CLS.head] = ink(C.white, C.ice, 0.3, 0.74);
  palette12[CLS.label] = ink(C.ice, C.signal, 0.35, 0.66);
  palette12[CLS.button] = ink(C.ice, C.white, 0.5, 0.8);

  const U = {
    uTime: shared.uTime,
    uResolution: shared.uResolution,
    uPixelRatio: shared.uPixelRatio,
    uLocal: { value: 0 },
    uDec: { value: 0 },
    uRot: { value: 0 },
    uAlpha: { value: 1 },
    uFog: { value: 0.03 },
    uFogT: { value: 0.08 },
    uPortrait: { value: 0 },
    uSettle: { value: 0 },
    uLayerSep: { value: 0.34 },
    uLen: { value: start.distanceTo(end) },
    uRadius: { value: radius },
    uGroove: { value: GROOVE },
    uHalfW: { value: bandHalfWidth(q) },
    uTurnC: { value: turnC },
    uKArc: { value: Math.hypot(radius, turnC) },
    uAxis: { value: new THREE.Vector3(start.x, start.y, start.z) },
    uWire: { value: A.wireframe.center.clone() },
    uWireRot: { value: new THREE.Matrix3() },
    uPointer: { value: new THREE.Vector2() },
    uPointerOn: { value: 0 },
    uBlock: { value: atlas.index(BLOCK) },
    uBuilt: { value: 0 },
    uSpot: { value: new THREE.Vector2(0, 0) },
    uSpotOn: { value: 0 },
    uTrail: { value: 0 },
    uStreak: { value: ink(C.signal, C.ice, 0.5, 0.5) },
    uAtlas: { value: atlas.texture },
    uCol: { value: palette12 },
    uHot: { value: ink(C.ice, C.white, 0.35, 1.0) },
    uRungA: { value: col(C.signal, 0.5) },
    uRungB: { value: ink(C.ice, C.mist, 0.3, 0.42) },
    uRungW: { value: col(C.ember, 0.55) },
    uBandA: { value: col(C.signal, 0.42) },
    uBandB: { value: ink(C.ice, C.mist, 0.35, 0.34) },
    uLine: { value: ink(C.signal, C.ice, 0.35, 0.95) },
    uHead: { value: ink(C.ice, C.white, 0.5, 1.9) },
    uFill: { value: ink(C.signal, C.deep, 0.35, 0.16) },
    uGridCol: { value: col(C.signal, 0.045) },
  };

  /* ------------------------------------------------------------ Objekte */
  const mats = makeMaterials(THREE, U);

  const plane = new THREE.PlaneGeometry(1, 1);
  const glyphGeo = new THREE.InstancedBufferGeometry();
  glyphGeo.setAttribute('position', plane.getAttribute('position'));
  glyphGeo.setAttribute('uv', plane.getAttribute('uv'));
  glyphGeo.setIndex(plane.getIndex());
  for (const [name, arr] of Object.entries(glyphData.attrs)) {
    glyphGeo.setAttribute(name, new THREE.InstancedBufferAttribute(arr, 4));
  }
  glyphGeo.instanceCount = glyphData.count;
  plane.dispose();

  const rungGeo = buildRungGeometry(THREE, glyphData.rungs, q.rungSeg);
  const wireGeo = buildWireGeometry(THREE, wire);
  const bandGeo = buildBandGeometry(THREE, A, q);

  const glyphs = new THREE.Mesh(glyphGeo, mats.glyph);
  const rungs = new THREE.Mesh(rungGeo, mats.rung);
  const bands = new THREE.Mesh(bandGeo, mats.band);
  // Lichtspuren der fliegenden Zeichen sind aus: ueber dem Geruest wirkten sie wie Splitter (gesprungenes Display)
  const frame = new THREE.Mesh(wireGeo, mats.wire);
  bands.renderOrder = 29;
  rungs.renderOrder = 30;
  frame.renderOrder = 31;
  glyphs.renderOrder = 33;
  for (const o of [bands, rungs, frame, glyphs]) {
    o.frustumCulled = false;
    group.add(o);
  }

  /* ------------------------------------------------------------ Zustand */
  const euler = new THREE.Euler();
  const m4 = new THREE.Matrix4();
  let tiltX = 0;
  let tiltY = 0;
  let lastLocal = -1;
  let spotOn = 0;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const wirePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -A.wireframe.center.z);
  const hit = new THREE.Vector3();
  let trail = 0;
  let decLocal = 0;
  let decWall = -1;

  const api = {
    group,
    // Bloom eher ruhig: viele kleine Zeichen, nur Lesekoepfe und Schreibkoepfe sollen leuchten
    look: { bloom: 0.95, bloomRadius: 0.5, fogDensity: 0.03, parallax: 0.08, drift: 0.014, aberration: 0.007, flash: 0, vignette: 0.8 },

    update(time, dt, local, global, weight = 1) {
      U.uLocal.value = local;
      U.uAlpha.value = weight;
      U.uRot.value = time * 0.14 + local * 2.2;
      U.uFog.value = (ctx.scene.fog ? ctx.scene.fog.density : 0.03) * 1.25;
      U.uPortrait.value = director.portrait ? 1 : 0;
      U.uSettle.value = smooth(0.66, 0.8, local);
      const built = smooth(0.76, 0.83, local);
      // Entschluesselung laeuft auch ohne Scrollen weiter: uDec eilt local zeitbasiert bis 0.06 voraus.
      // So steht nie halb entschluesselter Zeichensalat, wenn jemand stehen bleibt.
      // Wanduhr statt dt (dt ist pro Frame gedeckelt): auch bei wenigen Bildern pro Sekunde in ~0.3 s fertig
      const now = performance.now();
      const wall = decWall < 0 ? 0 : Math.min(0.5, (now - decWall) / 1000);
      decWall = now;
      decLocal = Math.min(local + 0.06, Math.max(local, decLocal + wall * 0.2));
      U.uDec.value = decLocal;
      U.uBuilt.value = built;

      // Lichtspuren: Laenge aus der Scroll-Geschwindigkeit (local pro Sekunde), weich gefuehrt
      const speed = lastLocal < 0 || dt <= 0 ? 0 : Math.abs(local - lastLocal) / dt;
      lastLocal = local;
      trail += (Math.min(0.022, speed * 0.12) - trail) * (1 - Math.exp(-6 * dt));
      U.uTrail.value = trail;

      // Maus: im Tunnel entschluesselt der Zeiger Zeichen, am Ende neigt sich das Geruest leicht
      const tunnel = 1 - smooth(0.42, 0.55, local);
      U.uPointerOn.value = pointer.touch ? 0 : tunnel * (pointer.inside ? 1 : 0);
      U.uPointer.value.set(pointer.sx, pointer.sy);
      const k = 1 - Math.exp(-4 * dt);
      const tw = smooth(0.66, 0.86, local);
      tiltY += (pointer.sx * 0.07 * tw - tiltY) * k;
      tiltX += (-pointer.sy * 0.05 * tw - tiltX) * k;
      euler.set(tiltX, tiltY, 0);
      m4.makeRotationFromEuler(euler);
      U.uWireRot.value.setFromMatrix4(m4);

      // Lichtkegel der Maus auf dem fertigen Geruest (nur mit Maus, nicht auf Touch)
      const spotTarget = !pointer.touch && pointer.inside ? smooth(0.74, 0.84, local) : 0;
      spotOn += (spotTarget - spotOn) * (1 - Math.exp(-3 * dt));
      U.uSpotOn.value = spotOn;
      if (spotOn > 0.001) {
        ndc.set(pointer.sx, pointer.sy);
        ray.setFromCamera(ndc, ctx.camera);
        if (ray.ray.intersectPlane(wirePlane, hit)) U.uSpot.value.set(hit.x - A.wireframe.center.x, hit.y - A.wireframe.center.y);
      }

      // Geruest erst zeichnen, wenn es gebraucht wird (spart Fuellrate im Tunnel)
      frame.visible = local > 0.47;

      const L = api.look;
      L.flash = 0.05 * Math.exp(-(((local - 0.1) / 0.03) ** 2));
      L.parallax = 0.08 + 0.1 * tw;
      L.aberration = 0.007 - 0.003 * tw;
    },

    setActive(active) {
      if (!active) { lastLocal = -1; trail = 0; decWall = -1; }
    },

    dispose() {
      glyphGeo.dispose();
      rungGeo.dispose();
      bandGeo.dispose();
      wireGeo.dispose();
      atlas.texture.dispose();
      for (const m of Object.values(mats)) m.dispose();
      group.clear();
    },
  };
  return api;
}
