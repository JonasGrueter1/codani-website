'use strict';
// Layout der Startseite mit der 3D-Geschichte. Kopf wie bis Version 3.2 (Inline-Skript fuer gl oder no-gl,
// Notausgang, modulepreload, Import-Map vor dem Skript), dazu die gemeinsame Kopfzeile (dunkle Variante),
// Fusszeile und site.js. Gehoert zur Startseite (siehe _src/README.md).

const { join, esc } = require('../lib/html');
const { headMeta, header, footer } = require('../components/layout');

// Alte Anker der einseitigen Version (Links in verschickten Mails) fuehren auf die neuen Seiten.
// Der Build prueft, dass jedes Ziel existiert.
const REDIRECTS = {
  kontakt: 'kontakt/',
  leistungen: 'ki/',
  'ki-beispiele': 'ki/',
  ablauf: 'ki/#ablauf',
  fallbeispiel: 'referenzen/',
  'ueber-mich': 'ueber-mich/',
  fragen: 'ki/#fragen',
  werkzeuge: 'ueber-mich/#technik',
  warum: 'ueber-mich/',
  'kontakt-form': 'kontakt/',
};
const REDIRECT_FAQ = 'websites/#fragen'; // alte Fragen #faq-q1 bis #faq-a8 waren Website-Fragen

// HUD: zaehlt die Beats ab 00 (intro) bis zum Ausklang. Gleiche Zahl wie BEATS in js/config.js minus 1.
const HUD_LAST = require('../pages/start.js').CHAPTERS.length - 1;

// Module der 3D-Kette, parallel vorgeladen (nur mit 3D). Reihenfolge egal.
const MODULES = [
  'vendor/three/three.module.min.js', 'js/config.js', 'js/engine.js', 'js/director.js', 'js/runner.js', 'js/fx/FxPass.js',
  'vendor/three/addons/postprocessing/EffectComposer.js', 'vendor/three/addons/postprocessing/RenderPass.js',
  'vendor/three/addons/postprocessing/UnrealBloomPass.js', 'vendor/three/addons/postprocessing/OutputPass.js',
  'vendor/three/addons/postprocessing/Pass.js', 'vendor/three/addons/postprocessing/ShaderPass.js',
  'vendor/three/addons/postprocessing/MaskPass.js', 'vendor/three/addons/shaders/CopyShader.js',
  'vendor/three/addons/shaders/LuminosityHighPassShader.js', 'vendor/three/addons/shaders/OutputShader.js',
  'vendor/three/addons/environments/RoomEnvironment.js', 'vendor/three/addons/utils/BufferGeometryUtils.js',
  'js/scenes/backdrop-noise.js', 'js/scenes/backdrop-glsl.js', 'js/scenes/backdrop.js',
  'js/scenes/brain-build.js', 'js/scenes/brain-shaders.js', 'js/scenes/brain-hw-atlas.js', 'js/scenes/brain-hw-shaders.js',
  'js/scenes/brain-hardware.js', 'js/scenes/brain.js',
  'js/scenes/cables-paths.js', 'js/scenes/cables-shaders.js', 'js/scenes/cables.js', 'js/nodes.js',
  'js/scenes/dna-atlas.js', 'js/scenes/dna-code.js', 'js/scenes/dna-build.js', 'js/scenes/dna-shaders.js', 'js/scenes/dna.js',
  'js/scenes/particles-glsl.js', 'js/scenes/particles-shape.js', 'js/scenes/particles.js',
  'js/scenes/robot-mesh.js', 'js/scenes/robot-layout.js', 'js/scenes/robot-materials.js', 'js/scenes/robot-mech.js',
  'js/scenes/robot-env.js', 'js/scenes/robot-geometry.js', 'js/scenes/robot.js',
];

function redirectScript() {
  return `<script>
    // Alte Anker der einseitigen Version auf die neuen Seiten umleiten (vor allem anderen, laedt kein 3D)
    (function () {
      var m = ${JSON.stringify(REDIRECTS)};
      var h = location.hash.slice(1);
      var to = m[h] || (/^faq-/.test(h) ? ${JSON.stringify(REDIRECT_FAQ)} : '');
      if (to) location.replace(to);
    })();
  </script>`;
}

function glScript() {
  return `<script>
    // Frueh entscheiden: 3D (gl) oder statischer Fallback (no-gl). ?nogl erzwingt den Fallback.
    // Software-Rendering (SwiftShader, llvmpipe, Microsoft Basic Render, gesperrte GPU) bekommt den Fallback,
    // ausser bei automatisierten Tests (navigator.webdriver) oder ?q=... / ?gl (dann html[data-gl-force]).
    // ?glcheck prueft auch in Tests streng.
    (function () {
      var d = document.documentElement, ok = false, s = location.search;
      d.classList.remove('no-js'); d.classList.add('js');
      try {
        var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var im = window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('importmap');
        var force = /[?&](q=|gl\\b)/.test(s) || (navigator.webdriver === true && !/[?&]glcheck\\b/.test(s));
        if (!rm && im && !/[?&]nogl\\b/.test(s)) {
          var c = document.createElement('canvas');
          var gl = c.getContext('webgl2', force ? undefined : { failIfMajorPerformanceCaveat: true });
          ok = !!gl;
          if (gl && !force) {
            var info = gl.getExtension('WEBGL_debug_renderer_info');
            var r = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
            if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(r)) ok = false;
          }
          var lose = gl && gl.getExtension('WEBGL_lose_context');
          if (lose) lose.loseContext();
        }
        if (rm) d.classList.add('reduced');
        if (ok && force) d.setAttribute('data-gl-force', '1');
      } catch (e) { ok = false; }
      d.classList.add(ok ? 'gl' : 'no-gl');
      // Notausgang: startet main.js nie (Netzabbruch, Parse-Fehler in einem alten Browser), bliebe die Seite beim
      // Preloader stehen. Nach 20 s (Tests: 75 s) ohne laufendes main.js auf den statischen Fallback wechseln.
      if (ok) {
        setTimeout(function () {
          if (window.__studioMain || d.classList.contains('is-ready')) return;
          d.classList.remove('gl'); d.classList.add('no-gl', 'is-ready');
          var p = document.getElementById('preloader'); if (p) p.hidden = true;
        }, force ? 75000 : 20000);
      }
      // Nur mit 3D: Module der Engine und der Szenen gleich parallel laden (statt Kette main -> engine -> three -> Szenen)
      if (ok) {
        var mods = ${JSON.stringify(MODULES.join(','))}.split(',');
        for (var i = 0; i < mods.length; i++) {
          var l = document.createElement('link');
          l.rel = 'modulepreload'; l.href = mods[i];
          document.head.appendChild(l);
        }
        // Netz der Android-Bueste (robot-mesh.js holt es per fetch)
        var b = document.createElement('link');
        b.rel = 'preload'; b.as = 'fetch'; b.href = 'assets/robot/bust.bin'; b.crossOrigin = 'anonymous';
        document.head.appendChild(b);
      }
    })();
  </script>`;
}

function story(ctx, body) {
  const { site } = ctx;
  return join([
    '<!doctype html>',
    `<html lang="${site.seite.sprache}" class="no-js">`,
    '<head>',
    redirectScript(),
    headMeta(ctx, { themeColor: '#04060a', colorScheme: 'dark light' }),
    '<link rel="preload" href="assets/fonts/geist-latin-var.woff2" as="font" type="font/woff2" crossorigin>',
    '<link rel="preload" href="assets/fonts/geist-mono-latin-var.woff2" as="font" type="font/woff2" crossorigin>',
    '<link rel="stylesheet" href="css/site.css">',
    '<link rel="stylesheet" href="css/story.css">',
    '<script type="importmap">',
    '  { "imports": { "three": "./vendor/three/three.module.min.js", "three/addons/": "./vendor/three/addons/" } }',
    '</script>',
    glScript(),
    '<link rel="modulepreload" href="js/main.js">',
    '<link rel="modulepreload" href="js/ui.js">',
    '<script src="vendor/gsap/gsap.min.js" defer></script>',
    '<script src="vendor/gsap/ScrollTrigger.min.js" defer></script>',
    '<script src="js/site.js" defer></script>',
    '<script type="module" src="js/main.js"></script>',
    '</head>',
    '<body class="page page--start">',
    '<a class="skip-link" href="#inhalt">Zum Inhalt springen</a>',
    '<div class="preloader" id="preloader" aria-hidden="true">',
    '<div class="preloader__meta">',
    `<span>${esc(site.marke.name)}</span>`,
    '<span>KI und Websites</span>',
    '</div>',
    '<div class="preloader__count"><span id="preload-num">0</span><small>%</small></div>',
    '<div class="preloader__foot">',
    '<div class="preloader__line"><i id="preload-bar"></i></div>',
    '<div class="preloader__status">',
    '<span id="preload-text" data-alt="Gleich geht es los.">Die Szene wird geladen.</span>',
    '<span class="preloader__pct">Lädt <b id="preload-pct">0</b> %</span>',
    '</div>',
    '</div>',
    '</div>',
    '<div class="stage" aria-hidden="true">',
    '<canvas id="gl" class="stage__canvas"></canvas>',
    '<div class="stage__poster"></div>',
    '<div id="gl-overlay" class="stage__overlay"></div>',
    '</div>',
    header(ctx, { dark: true }),
    '<div class="story-bar" aria-hidden="true"><i></i></div>',
    '<a class="story-skip" href="#weiter" aria-label="Animation überspringen, weiter zum Inhalt">Animation überspringen</a>',
    '<aside class="hud" aria-hidden="true">',
    `<span class="hud__index"><span id="hud-index">00</span><small>/${String(HUD_LAST).padStart(2, '0')}</small></span>`,
    '<span class="hud__track"><i></i><span class="hud__ticks"></span></span>',
    '<span class="hud__label" id="hud-label">Start</span>',
    '</aside>',
    '<main id="inhalt" tabindex="-1">',
    body,
    '</main>',
    footer(ctx),
    '</body>',
    '</html>',
    '',
  ]);
}

story.REDIRECTS = REDIRECTS;
story.REDIRECT_FAQ = REDIRECT_FAQ;
module.exports = story;
