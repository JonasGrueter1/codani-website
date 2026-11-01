/* Studio V4 · Beispielrechnung auf den Branchenseiten (Komponente kiRechner in _src/components/ki-vorlagen.js).
   Rechnet gesparte Zeit in Stunden und Franken und vergleicht mit den Kosten (Werte aus site.json, im HTML als data-*).
   Ohne JS bleibt der Startwert stehen. */
(function () {
  'use strict';
  var APO = '’';
  var forms = document.querySelectorAll('[data-rechner]');
  Array.prototype.forEach.call(forms, function (f) {
    var monat = f.getAttribute('data-periode') === 'monat';
    var proJahr = monat ? 12 : 46;
    var einmal = parseFloat(f.getAttribute('data-einmal')) || 0;
    var laufend = parseFloat(f.getAttribute('data-monat')) || 0;
    var val = function (n) { var el = f.elements[n]; var v = el ? parseFloat(el.value) : 0; return isFinite(v) && v > 0 ? v : 0; };
    var rund = function (h) { return h < 10 ? Math.round(h * 2) / 2 : h < 50 ? Math.round(h) : Math.round(h / 10) * 10; };
    var std = function (h) { var r = rund(h); return r === 1 ? 'rund 1 Stunde' : 'rund ' + String(r) + ' Stunden'; };
    var chf = function (n) { return 'CHF ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, APO); };
    function calc() {
      var min = 0;
      for (var i = 0; f.elements['anzahl' + i]; i++) min += val('anzahl' + i) * Math.max(0, val('heute' + i) - val('neu' + i));
      var h = min / 60;
      var jahr = h * proJahr;
      var franken = jahr * val('satz');
      var proMonat = franken / 12;
      f.elements.zeit.value = h > 0 ? std(h) + (monat ? ' pro Monat' : ' pro Woche') : 'keine Zeit';
      f.elements.jahr.value = std(jahr) + ' im Jahr';
      f.elements.chf.value = franken > 0 ? 'rund ' + chf(Math.round(franken / 100) * 100) + ' pro Jahr' : 'nichts';
      var ab;
      if (proMonat <= laufend) {
        ab = 'Mit diesen Zahlen deckt die Ersparnis nicht einmal die laufenden Kosten. Dann lohnt sich KI für diese Aufgabe nicht, und ich sage Ihnen das auch so.';
      } else {
        var n = Math.ceil(einmal / (proMonat - laufend));
        ab = n > 36
          ? 'Ohne Einführung und mit den oberen laufenden Kosten gerechnet, wären KI-Check und Pilot erst nach über drei Jahren eingespielt.'
          : 'Ohne Einführung und mit den oberen laufenden Kosten gerechnet, wären KI-Check und Pilot nach rund ' + n + (n === 1 ? ' Monat' : ' Monaten') + ' eingespielt.';
      }
      f.elements.ab.value = ab;
    }
    f.addEventListener('input', calc);
    f.addEventListener('submit', function (e) { e.preventDefault(); });
    calc();
  });
})();
