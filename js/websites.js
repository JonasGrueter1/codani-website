/* Studio V4 · Websites (websites/): klebender Ablauf und Galerie. Ohne Abhaengigkeiten.
   Ablauf: der Schritt in der Bildschirmmitte wird aktiv, der Laptop zeigt den passenden Bildschirm (nur ab 1024 px
   ohne reduzierte Bewegung sichtbar, sonst hat jeder Schritt sein eigenes Bild). Galerie: Pfeile blaettern um eine
   Karte, Knoepfe am Anfang und Ende deaktiviert. Gruppe: Websites und Referenzen. */
(function () {
  'use strict';
  var d = document;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* ------------------------------------------------------------ Klebender Ablauf */
  $$('[data-wab]').forEach(function (wab) {
    var steps = $$('.wab__step', wab);
    var screens = $$('.wab__screen', wab);
    var dots = $$('.wab__dots i', wab);
    if (!steps.length || !('IntersectionObserver' in window)) return;
    var current = 0;
    var set = function (i) {
      if (i === current) return;
      current = i;
      steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      screens.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      dots.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) set(Number(e.target.getAttribute('data-step')) || 0);
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    steps.forEach(function (s) { io.observe(s); });
  });

  /* ------------------------------------------------------------ Galerie */
  $$('[data-wgal]').forEach(function (gal) {
    var track = gal.querySelector('.wgal__track');
    var btns = $$('.wgal__btn', gal);
    if (!track || !btns.length) return;
    var slides = $$('.wgal__slide', track);
    var update = function () {
      var max = track.scrollWidth - track.clientWidth - 4;
      btns.forEach(function (b) {
        var dir = Number(b.getAttribute('data-dir'));
        b.disabled = dir < 0 ? track.scrollLeft <= 4 : track.scrollLeft >= max;
      });
    };
    var step = function (dir) {
      var left = track.scrollLeft;
      var x0 = track.getBoundingClientRect().left;
      var pos = slides.map(function (s) { return s.getBoundingClientRect().left - x0 + left; });
      var target = left;
      if (dir > 0) { for (var i = 0; i < pos.length; i++) { if (pos[i] > left + 8) { target = pos[i]; break; } } }
      else { for (var j = pos.length - 1; j >= 0; j--) { if (pos[j] < left - 8) { target = pos[j]; break; } } }
      track.scrollTo({ left: target, behavior: 'smooth' });
    };
    btns.forEach(function (b) { b.addEventListener('click', function () { step(Number(b.getAttribute('data-dir'))); }); });
    var t = 0;
    track.addEventListener('scroll', function () { cancelAnimationFrame(t); t = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();
