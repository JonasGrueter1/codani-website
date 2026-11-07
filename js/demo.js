/* Studio V4 · Demo-Assistent (V4-KONZEPT 3.6.13). Ohne KI, ohne Netzwerk, ohne Abhaengigkeiten.
   Die Seite enthaelt jede Szene im Endzustand (geht ohne JS). Dieses Skript blendet die Auswahl und die Steuerung
   ein und zeigt die Schritte nacheinander. Bei reduzierter Bewegung bleiben alle Schritte sichtbar.
   Gruppe: KI-Seiten. HTML: _src/components/ki-demo.js, Daten: _src/data/demo.json, Stile: css/demo.css. */
(function () {
  'use strict';
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var fill = function (s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); };

  each(document.querySelectorAll('[data-demo]'), function (root) {
    var T = {};
    try { T = JSON.parse(root.getAttribute('data-texte') || '{}'); } catch (e) { /* Standardtexte */ }
    var pick = root.querySelector('.demo__pick');
    var ctrl = root.querySelector('.demo__ctrl');
    var progress = root.querySelector('.demo__progress');
    var btn = {};
    each(root.querySelectorAll('.demo__ctrl [data-act]'), function (b) { btn[b.getAttribute('data-act')] = b; });
    var scene = null;
    var steps = [];
    var n = 0;
    var timer = 0;

    each(root.querySelectorAll('.demo__decide'), function (d) { d.hidden = false; });
    if (pick) pick.hidden = false;
    root.classList.add('is-js');
    if (!reduced && ctrl) { ctrl.hidden = false; root.classList.add('is-live'); }

    function name(i) { return steps[i] ? steps[i].getAttribute('data-name') : ''; }
    function dis(b, off) { if (b) b.setAttribute('aria-disabled', off ? 'true' : 'false'); }

    function set(k) {
      n = Math.max(0, Math.min(k, steps.length));
      each(steps, function (li, i) {
        li.classList.toggle('is-on', i < n);
        if (i >= n) li.classList.remove('is-working');
      });
      root.classList.toggle('has-read', n > 0);
      root.classList.toggle('is-done', n === steps.length);
      var total = steps.length;
      if (progress) {
        progress.textContent = n === 0 ? fill(T.bereit || '{gesamt}', { gesamt: total })
          : fill(T.schritt || '{n}/{gesamt}', { n: n, gesamt: total }) + ': ' + name(n - 1);
      }
      dis(btn.next, n === total);
      dis(btn.all, n === total);
      dis(btn.reset, n === 0);
    }

    function show(key) {
      each(root.querySelectorAll('.demo__scene'), function (s) {
        var on = s.getAttribute('data-scene') === key;
        s.hidden = !on;
        if (on) scene = s;
      });
      steps = scene ? scene.querySelectorAll('.demo__step') : [];
      each(root.querySelectorAll('.demo__msg'), function (m) { m.textContent = ''; });
      set(reduced ? steps.length : 0);
    }

    function next() {
      if (n >= steps.length) return;
      clearTimeout(timer);
      each(steps, function (li) { li.classList.remove('is-working'); });
      var li = steps[n];
      set(n + 1);
      li.classList.add('is-working');
      timer = setTimeout(function () { li.classList.remove('is-working'); reveal(li); }, 650);
      reveal(li);
    }

    function reveal(li) {
      if (!li.scrollIntoView) return;
      var r = li.getBoundingClientRect();
      var bar = ctrl && !ctrl.hidden ? ctrl.offsetHeight : 0;
      if (r.bottom > window.innerHeight - bar - 8 || r.top < 72) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    // Rueckmeldung nach dem Entscheid ueber der klebenden Steuerleiste zeigen (sonst halb verdeckt)
    function showMsg(msg) {
      var r = msg.getBoundingClientRect();
      var bar = ctrl && !ctrl.hidden ? ctrl.offsetHeight : 0;
      var over = r.bottom - (window.innerHeight - bar - 16);
      if (over > 0) window.scrollBy({ top: over, behavior: reduced ? 'auto' : 'smooth' });
    }

    root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!b || !root.contains(b)) return;
      if (b.getAttribute('aria-disabled') === 'true') return;
      var act = b.getAttribute('data-act');
      if (act === 'next') {
        next();
        // Startknopf im leeren Feld verschwindet: Fokus auf "Naechster Schritt" in der Leiste
        if (b.classList.contains('demo__start') && btn.next) btn.next.focus({ preventScroll: true });
      }
      else if (act === 'all') { clearTimeout(timer); set(steps.length); each(steps, function (li) { li.classList.remove('is-working'); }); }
      else if (act === 'reset') {
        clearTimeout(timer);
        each(root.querySelectorAll('.demo__msg'), function (m) { m.textContent = ''; });
        set(0);
        if (btn.next) btn.next.focus();
      } else if (act === 'ja' || act === 'nein') {
        var msg = b.parentNode.parentNode.querySelector('.demo__msg');
        if (msg) { msg.textContent = b.getAttribute('data-msg'); showMsg(msg); }
      }
    });

    if (pick) {
      pick.addEventListener('change', function (e) {
        if (e.target && e.target.type === 'radio') show(e.target.value);
      });
    }
    // ?demo=mieter waehlt die passende Szene vor (Links von den Branchenseiten)
    var want = (location.search.match(/[?&]demo=([\w-]+)/) || [])[1];
    var wanted = want && pick ? pick.querySelector('input[value="' + want + '"]') : null;
    if (wanted) wanted.checked = true;
    var checked = pick && pick.querySelector('input:checked');
    var first = root.querySelector('.demo__scene');
    show(checked ? checked.value : first && first.getAttribute('data-scene'));
  });
})();
