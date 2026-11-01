// Testseite fuer Szenen-Entwickler: dev.html?scene=robot&local=0.4&cam=orbit&q=high
// scene    particles|robot|brain|cables|dna|all, oder mehrere mit Komma (z. B. robot,brain fuer den Roentgen-Zoom:
//          die erste Szene bestimmt local und bleibt immer aktiv, die weiteren laufen in ihren eigenen Fenstern)
// local    Startwert 0..1 im Hauptfenster der ersten Szene
// at       statt local ein fester Punkt der Story (beat@p, z. B. at=zoom@0.4)
// cam      path (Kamerapfad der Seite), orbit (ziehen, Mausrad) oder fix (pos=x,y,z tgt=x,y,z fov=32)
// q        high|medium|low   post=0 ohne Postprocessing   play laeuft selbst   scroll=0 nur Regler
// bg       der Hintergrund (Szene backdrop) laeuft immer mit, bg=0 schaltet ihn ab (reiner Szenen-Test)
// Sonst steuert das Scrollen local (fuer studio_capture.js).
// Konsole und Testskripte: window.__dev (setLocal, setAt, setCam, fix, orbit, advance, freeze, setTime, ready).
import * as THREE from 'three';
import { Engine, pickQuality, isMobileDevice } from './engine.js';
import { Director, clamp01, parseAt } from './director.js';
import { makeContext, loadScenes, Runner } from './runner.js';
import { MODULES, ANCHORS } from './config.js';

const params = new URLSearchParams(window.location.search);
const names = Object.keys(MODULES);
const rawScene = params.get('scene') || 'robot';
let sceneList = rawScene === 'all' ? ['all'] : rawScene.split(',').filter((n) => names.includes(n));
if (!sceneList.length) sceneList = ['robot'];
const sceneName = sceneList[0];
// Hintergrund wie auf der Seite immer dazu (ausser bg=0); er laeuft in seinem eigenen Fenster (ganze Story)
const loadList = sceneName === 'all' ? names
  : (params.get('bg') === '0' || sceneList.includes('backdrop') ? sceneList : [...sceneList, 'backdrop']);
const useScroll = params.get('scroll') !== '0';
let local = clamp01(parseFloat(params.get('local') || '0') || 0);
const vec = (s, d) => (s ? s.split(',').map(Number) : d);

// Orbit-Zentrum und Abstand je Szene
const FOCUS = {
  backdrop: { target: [0, -0.5, 0], radius: 9 },
  particles: { target: [0, -0.5, 0], radius: 14 },
  robot: { target: [0, -0.6, 0], radius: 7.5 },
  brain: { target: ANCHORS.brain.center.toArray(), radius: 2.4 },
  cables: { target: [0, 0.2, -5.5], radius: 13 },
  dna: { target: [0, 0.5, -22], radius: 18 },
  all: { target: [0, 0, -8], radius: 26 },
};

const $ = (id) => document.getElementById(id);
const ui = {
  root: $('dev-ui'), title: $('dev-title'), scene: $('dev-scene'), local: $('dev-local'), out: $('dev-local-out'),
  play: $('dev-play'), cam: $('dev-cam'), post: $('dev-post'), damp: $('dev-damp'), stats: $('dev-stats'), min: $('dev-min'),
};
const options = [...names, 'all'];
if (sceneList.length > 1) options.push(sceneList.join(','));
for (const n of options) {
  const o = document.createElement('option');
  o.value = n;
  o.textContent = n === 'all' ? 'alle Szenen' : n;
  ui.scene.append(o);
}
ui.scene.value = sceneList.join(',');
ui.title.textContent = sceneName;
const fixOpt = document.createElement('option');
fixOpt.value = 'fix';
fixOpt.textContent = 'Fest (pos, tgt, fov)';
ui.cam.append(fixOpt);
ui.cam.value = ['orbit', 'fix'].includes(params.get('cam')) ? params.get('cam') : 'path';
if (params.get('post') === '0') ui.post.checked = false;
ui.scene.addEventListener('change', () => {
  params.set('scene', ui.scene.value);
  params.set('local', '0');
  params.delete('at');
  window.location.search = params.toString();
});
ui.min.addEventListener('click', () => ui.root.classList.toggle('is-min'));
if (!useScroll) document.body.style.minHeight = '0';

async function boot() {
  const canvas = $('gl');
  const { quality, forced } = pickQuality();
  const engine = new Engine(canvas, { quality, forced, isMobile: isMobileDevice() });
  const { renderer, scene, camera } = engine;
  if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]);

  const director = new Director();
  director.setAspect(camera.aspect);
  engine.onResize((w, h) => director.setAspect(w / h));
  const ctx = makeContext(engine, director, { dev: true });
  const mods = await loadScenes(loadList, ctx);
  const runner = new Runner({ director, mods });
  if (sceneName !== 'all') runner.force = sceneName;

  const win = sceneName === 'all' ? { start: 0, end: 1 } : director.modules[sceneName].windows[0];
  const toGlobal = (l) => win.start + l * (win.end - win.start);
  const atGlobal = (str) => {
    const { beat, p } = parseAt(str);
    const b = director.beat(beat);
    return b.start + (b.end - b.start) * clamp01(p);
  };
  let fixedGlobal = params.get('at') ? atGlobal(params.get('at')) : null;

  director.setTarget(fixedGlobal ?? toGlobal(local), true);
  director.update(0);
  director.applyCamera(camera, engine.pointer, { parallax: 0, drift: 0 }, 0);
  runner.showAll();
  await engine.warmup();

  /* local: Regler, Scrollen, Play */
  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const setLocal = (v, fromScroll = false) => {
    local = clamp01(v);
    ui.local.value = String(local);
    ui.out.textContent = local.toFixed(3);
    if (useScroll && !fromScroll) window.scrollTo(0, Math.round(local * maxScroll()));
  };
  ui.local.addEventListener('input', () => { fixedGlobal = null; setLocal(parseFloat(ui.local.value)); });
  if (useScroll) window.addEventListener('scroll', () => { fixedGlobal = null; setLocal(window.scrollY / maxScroll(), true); }, { passive: true });
  if (fixedGlobal === null) setLocal(local);
  let playing = params.has('play');
  const syncPlay = () => { ui.play.textContent = playing ? 'Pause' : 'Play'; };
  ui.play.addEventListener('click', () => { playing = !playing; syncPlay(); });
  syncPlay();

  /* Kameras: Orbit und fest */
  const focus = FOCUS[sceneName] || FOCUS.all;
  const orbit = { target: new THREE.Vector3().fromArray(focus.target), radius: focus.radius, theta: 0.5, phi: 1.35 };
  const fix = {
    pos: new THREE.Vector3().fromArray(vec(params.get('pos'), [2.6, 0.2, 6.2])),
    tgt: new THREE.Vector3().fromArray(vec(params.get('tgt'), [0, -0.9, 0])),
    fov: parseFloat(params.get('fov') || '30'),
  };
  const sph = new THREE.Spherical();
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || ui.cam.value !== 'orbit') return;
    orbit.theta -= (e.clientX - drag.x) * 0.006;
    orbit.phi = Math.min(3.0, Math.max(0.15, orbit.phi - (e.clientY - drag.y) * 0.006));
    drag = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('wheel', (e) => {
    if (ui.cam.value !== 'orbit') return;
    e.preventDefault();
    orbit.radius = Math.min(80, Math.max(0.2, orbit.radius * (1 + e.deltaY * 0.001)));
  }, { passive: false });

  let time = 0;
  let last = performance.now();
  let look = runner.look;
  const step = (dtRaw, draw = true) => {
    const dt = Math.min(dtRaw, 1 / 20);
    time += dt;
    ctx.time = time;
    engine.shared.uTime.value = time;
    if (playing) { fixedGlobal = null; setLocal((local + dt / 14) % 1); }

    engine.updatePointer(dt, time);
    director.setTarget(fixedGlobal ?? toGlobal(local), !ui.damp.checked);
    director.update(dtRaw);
    if (ui.cam.value === 'orbit') {
      sph.set(orbit.radius, orbit.phi, orbit.theta);
      camera.position.setFromSpherical(sph).add(orbit.target);
      camera.up.set(0, 1, 0);
      camera.lookAt(orbit.target);
      camera.filmOffset = 0;
      const fov = director.fovFor(40, camera.aspect);
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    } else if (ui.cam.value === 'fix') {
      camera.position.copy(fix.pos);
      camera.up.set(0, 1, 0);
      camera.lookAt(fix.tgt);
      camera.filmOffset = 0;
      if (camera.fov !== fix.fov) { camera.fov = fix.fov; camera.updateProjectionMatrix(); }
    } else {
      director.applyCamera(camera, engine.pointer, look, time);
    }
    look = runner.step(time, dt);
    engine.applyLook(look, time);
    if (!draw) return;
    if (ui.post.checked) engine.render(dt);
    else { renderer.info.reset(); renderer.setRenderTarget(null); renderer.render(scene, camera); }
  };
  let frozen = false;
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || frozen) { last = now; return; }
    const dtRaw = Math.min(Math.max((now - last) / 1000, 0), 0.25);
    last = now;
    step(dtRaw);
    if (!engine.forced) engine.adapt(dtRaw);
  }
  requestAnimationFrame(frame);

  setInterval(() => {
    const s = engine.stats;
    const info = renderer.info.render;
    const loaded = new Set(runner.mods.map((m) => m.name));
    const act = Object.values(director.modules).filter((m) => m.active && loaded.has(m.name))
      .map((m) => `${m.name.padEnd(9)} local ${m.local.toFixed(3)}  w ${m.weight.toFixed(2)}`).join('\n');
    const b = director.beat(director.current);
    ui.stats.textContent = `${s.fps} fps  ${s.frameMs.toFixed(1)} ms  dpr ${s.dpr.toFixed(2)}  q ${engine.quality}\n`
      + `calls ${info.calls}  tris ${info.triangles}\n`
      + `global ${director.global.toFixed(3)}  beat ${director.current} p ${b.p.toFixed(3)}\n${act}\n`
      + `cam ${camera.position.toArray().map((v) => v.toFixed(2)).join(', ')}  fov ${camera.fov.toFixed(1)}`;
  }, 250);

  window.__dev = {
    engine, director, runner, ctx, orbit, fix, setLocal,
    setAt(str) { fixedGlobal = atGlobal(str); },
    setCam(mode) { ui.cam.value = mode; },
    // Fuer Standbilder: Zeit vorspulen (Animationen ausklingen lassen), dann ein Bild rendern
    advance(seconds, fps = 30) {
      const n = Math.max(1, Math.round(seconds * fps));
      for (let i = 0; i < n; i++) step(1 / fps, i === n - 1);
    },
    freeze(v) { frozen = v; },
    setTime(t) { time = t; },
    get time() { return time; },
    ready: true,
  };
}

boot().catch((e) => console.error('dev.html konnte nicht starten:', e));
