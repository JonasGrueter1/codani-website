// Einstieg der Seite: Fallback-Entscheid, Preloader, Engine + Director + Szenen, Render-Loop.
// three.js wird nur geladen, wenn 3D wirklich laeuft (der Fallback bleibt leicht).
//
// Sicherheitsnetze (alle fuehren in denselben statischen Fallback, toFallback):
//   - Start dauert laenger als 15 s
//   - WebGL-Kontext geht verloren (iOS: App-Wechsel, Speicherdruck)
//   - Bildrate bleibt trotz kleinster Aufloesung ueber 3 s unter 20 fps (FPS-Waechter)
// Ausnahme: Tests und ?q=... (html[data-gl-force]) laufen auch langsam weiter, siehe index.html.
import { UI } from './ui.js';

// Fuer den Notausgang im Kopf von index.html: main.js laeuft (danach greifen die Netze hier)
window.__studioMain = true;
const root = document.documentElement;
const ui = new UI();
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
if (gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  // Adressleiste ein/aus (nur die Hoehe aendert sich) loest keinen Refresh aus, sonst springt die Szene
  ScrollTrigger.config({ ignoreMobileResize: true });
  // ... aber ScrollTrigger merkt sich die Masse nur beim ersten Messen und haelt das Zurueckdrehen des Handys
  // sonst fuer eine Adressleisten-Aenderung. Darum bei jeder Breitenaenderung selbst neu messen (entprellt).
  let lastW = window.innerWidth;
  let refreshTimer = 0;
  const remeasure = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      ScrollTrigger.refresh();
    }, 150);
  };
  window.addEventListener('resize', remeasure);
  if (window.screen && screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', remeasure);
  } else {
    window.addEventListener('orientationchange', remeasure);
  }
  // Text-Einblendungen laufen in echter Zeit: ein langsamer 3D-Frame bremst sie nicht aus
  gsap.ticker.lagSmoothing(0);
}

const useGL = root.classList.contains('gl');
const forcedGL = root.dataset.glForce === '1';
let dead = false; // 3D ist endgueltig aus, der statische Fallback laeuft
const cleanups = []; // raeumt die 3D-Strecke ab (in umgekehrter Reihenfolge)
// Tests in Software-GL (SwiftShader) brauchen fuer den Start bis 14 s: dort grosszuegiger
const safety = setTimeout(() => toFallback('Start dauert zu lange'), forcedGL ? 60000 : 15000);

if (useGL) {
  boot().catch((err) => {
    if (dead) return;
    console.error('3D konnte nicht starten, Fallback aktiv:', err);
    toFallback();
  });
} else {
  clearTimeout(safety);
  ui.toStatic();
  ui.hidePreloader();
  ui.introReveal();
}

/** Auf den statischen Fallback wechseln: Loop stoppen, 3D abraeumen, alle Texte sichtbar und bedienbar. */
function toFallback(reason) {
  if (dead) return;
  dead = true;
  clearTimeout(safety);
  // Grund fuer den Hinweis bei den Standbildern (siehe gl-hint im Layout)
  if (!root.hasAttribute('data-fb')) root.setAttribute('data-fb', 'slow');
  if (reason) console.warn(`3D beendet (${reason}), statischer Hintergrund aktiv.`);
  // Im Fallback sind die Kapitel kuerzer: danach an dieselbe Stelle springen (gleiches Kapitel oder gleicher
  // Inhaltsabschnitt), statt irgendwo zu landen
  let anchor = null;
  let anchorTop = 0;
  if (window.scrollY > 0) {
    for (const el of document.querySelectorAll('.chapter, .content > section, .ftr')) {
      const r = el.getBoundingClientRect();
      if (r.bottom > window.innerHeight * 0.3) { anchor = el; anchorTop = el.classList.contains('chapter') ? 0 : r.top; break; }
    }
  }
  while (cleanups.length) {
    const fn = cleanups.pop();
    try { fn(); } catch (e) { /* weiter abraeumen */ }
  }
  root.classList.remove('gl', 'is-content');
  root.classList.add('no-gl');
  ui.toStatic();
  ui.hidePreloader();
  ui.introReveal();
  if (ScrollTrigger) ScrollTrigger.refresh();
  if (anchor) {
    // zweimal: ScrollTrigger kann die Position nach dem Refresh noch einmal setzen
    const go = () => {
      const y = anchor.getBoundingClientRect().top + window.scrollY - anchorTop;
      window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: 'instant' });
    };
    go();
    requestAnimationFrame(() => requestAnimationFrame(go));
    setTimeout(go, 400);
  }
}

async function boot() {
  const canvas = document.getElementById('gl');
  const story = document.getElementById('story');
  ui.progress(0.04);

  const [engineMod, directorMod, runnerMod, config, nodesMod] = await Promise.all([
    import('./engine.js'),
    import('./director.js'),
    import('./runner.js'),
    import('./config.js'),
    import('./nodes.js'),
  ]);
  if (dead) return;
  ui.progress(0.22);
  const { Engine, pickQuality, isMobileDevice } = engineMod;
  const { Director, damp } = directorMod;
  const { makeContext, loadScenes, Runner } = runnerMod;
  const { MODULES, BEATS } = config;

  const { quality, forced } = pickQuality();
  const engine = new Engine(canvas, { quality, forced, isMobile: isMobileDevice() });
  cleanups.push(() => engine.dispose());
  const { camera } = engine;
  root.dataset.quality = quality;

  // Schriften abwarten (Masse der Abschnitte, Glyphen fuer Code-Texturen), hoechstens 2.5 s
  if (document.fonts && document.fonts.ready) {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  }
  if (dead) return;
  ui.progress(0.3);

  const director = new Director({ story });
  cleanups.push(() => director.dispose(true));
  if (gsap && ScrollTrigger) director.bindScroll(gsap, ScrollTrigger);
  director.setAspect(camera.aspect);
  engine.onResize((w, h) => director.setAspect(w / h));

  const ctx = makeContext(engine, director);
  const mods = await loadScenes(Object.keys(MODULES), ctx, (f) => ui.progress(0.3 + 0.45 * f));
  if (dead) { mods.forEach((m) => { try { m.inst.dispose(); } catch (e) { /* egal */ } }); return; }
  const runner = new Runner({ director, mods });
  cleanups.push(() => {
    runner.dispose();
    if (ctx.overlay) ctx.overlay.textContent = '';
  });
  // Die fuenf Knoten der Kabel-Szene als Links (js/nodes.js)
  const cablesMod = mods.find((m) => m.name === 'cables');
  const nodeLinks = cablesMod ? new nodesMod.NodeLinks({
    director,
    cables: cablesMod.inst,
    onRestore: (section, on) => ui.setInteractive(section, on),
    alive: () => !cablesMod.failed,
  }) : null;
  if (nodeLinks) cleanups.push(() => nodeLinks.dispose());

  // Alle Shader vorab kompilieren, damit Uebergaenge nicht ruckeln
  director.update(0);
  director.applyCamera(camera, engine.pointer, { parallax: 0, drift: 0 }, 0);
  runner.showAll();
  await engine.warmup();
  if (dead) return;
  ui.progress(0.95);

  // Inhaltsbereich: 3D tritt in den Hintergrund
  let contentDim = 0;
  let contentTarget = 0;
  if (gsap && ScrollTrigger) {
    const st = ScrollTrigger.create({
      trigger: '#content',
      start: 'top bottom',
      end: 'top 25%',
      onUpdate: (self) => { contentTarget = self.progress; },
      onRefresh: (self) => { contentTarget = self.progress; },
    });
    cleanups.push(() => st.kill());
  }

  // HUD und Text-Panels
  const chapter = (name) => {
    const i = BEATS.findIndex((b) => b.name === name);
    ui.setChapter(i, BEATS[i].label);
    root.dataset.beat = name; // CSS: z. B. "Animation ueberspringen" nur zwischen Hero und Ausklang
  };
  chapter(director.current);
  director.onChange((name) => chapter(name));
  director.onPanel((el, on) => ui.panel(el, on));
  for (const el of Object.values(director.sections)) ui.panel(el, el.classList.contains('is-on'));

  let time = 0;
  let last = performance.now();
  let raf = 0;
  let running = false;
  let frameNo = 0;
  let frozen = false; // Inhaltsbereich: letztes Bild bleibt stehen, es wird nicht mehr gerendert
  let look = runner.look;
  // FPS-Waechter: misst echte Bildabstaende (ab 4 s nach dem Start, je 1 s), nicht bei erzwungenem 3D
  const watch = { t: 0, acc: 0, n: 0, low: 0 };

  function frame(now) {
    if (!running || dead) return;
    raf = requestAnimationFrame(frame);
    const gap = Math.max((now - last) / 1000, 0);
    last = now;
    const dtRaw = Math.min(gap, 0.25);
    const dt = Math.min(dtRaw, 1 / 20);
    time += dt;
    ctx.time = time;
    engine.shared.uTime.value = time;

    contentDim = damp(contentDim, contentTarget, 6, dtRaw);
    director.content = contentDim;
    const background = contentDim > 0.98;
    ui.setStory(director.global, contentDim > 0.35);
    director.pullScroll();
    director.update(dtRaw);
    if (director.beats.dna) ui.setOffer(director.beats.dna.tp, contentDim > 0.35);

    // Im Inhaltsbereich ist das Canvas fast ganz abgedeckt: ein letztes Bild rendern, dann anhalten (spart Akku)
    if (background) {
      if (frozen) return;
      frozen = true;
    } else {
      frozen = false;
    }

    engine.updatePointer(dt, time);
    director.applyCamera(camera, engine.pointer, look, time);
    look = runner.step(time, dt);
    if (nodeLinks) {
      nodeLinks.setContent(contentDim > 0.35);
      nodeLinks.update();
    }
    look.dim = Math.max(look.dim, contentDim * 0.62);
    engine.setScrim(director.scrim);
    engine.applyLook(look, time);
    frameNo += 1;
    engine.render(dt);
    if (background) return;
    engine.adapt(dtRaw);

    if (!forcedGL && !engine.forced) {
      watch.t += gap;
      if (watch.t > 4) {
        watch.acc += Math.min(gap, 0.5);
        watch.n += 1;
        if (watch.acc >= 1) {
          const fps = watch.n / watch.acc;
          watch.low = fps < 20 && engine.atFloor() ? watch.low + 1 : 0;
          watch.acc = 0;
          watch.n = 0;
          if (watch.low >= 3) toFallback('zu wenig Bilder pro Sekunde');
        }
      }
    }
  }

  function start() {
    if (running || dead) return;
    running = true;
    last = performance.now();
    watch.acc = 0;
    watch.n = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  const onLost = (e) => {
    e.preventDefault();
    toFallback('WebGL-Kontext verloren');
  };
  canvas.addEventListener('webglcontextlost', onLost);
  cleanups.push(() => {
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onLost);
    if (window.__studio) delete window.__studio;
  });

  // Zugriff fuer Tests und Szenen-Entwicklung: window.__studio
  window.__studio = { engine, director, runner, ctx, nodeLinks, toFallback, get frame() { return frameNo; } };
  if (new URLSearchParams(window.location.search).has('debug')) mountStats(engine, director);

  start();
  clearTimeout(safety);
  if (ScrollTrigger) ScrollTrigger.refresh();
  await ui.finish();
  if (dead) return;
  ui.introReveal();
}

function mountStats(engine, director) {
  const el = document.createElement('pre');
  el.className = 'debug-stats';
  document.body.appendChild(el);
  const id = setInterval(() => {
    if (dead) { clearInterval(id); el.remove(); return; }
    const s = engine.stats;
    const mods = Object.values(director.modules).filter((m) => m.active)
      .map((m) => `${m.name} local ${m.local.toFixed(2)} w ${m.weight.toFixed(2)}`).join('\n');
    el.textContent = `${s.fps} fps  ${s.frameMs.toFixed(1)} ms\ndpr ${s.dpr.toFixed(2)}  q ${engine.quality}\ncalls ${s.calls}  tris ${s.triangles}\nglobal ${director.global.toFixed(3)}  ${director.current}\n${mods}`;
  }, 250);
}
