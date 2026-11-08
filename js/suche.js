/* Codani · Website-Suche (08.11.2026). Knopf in der Kopfzeile (und im Handy-Menue) oeffnet ein Suchfenster.
   Suchkern (js/suche-kern.js) und Index (assets/suche.json) werden erst beim ersten Oeffnen geladen, beim
   Darueberfahren schon vorab. Alles laeuft im Browser: die Eingabe wird nirgends hin gesendet.
   Tasten: Ctrl+K oder Cmd+K und "/" oeffnen, Pfeile waehlen, Enter oeffnet, Esc schliesst.
   ?suche=... in der Adresse oeffnet die Suche mit diesem Begriff. */
(function () {
  'use strict';
  var d = document;
  var script = d.currentScript;
  var BASIS = new URL('..', script ? script.src : location.href);
  var istMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');

  var index = null, daten = null, laden = null, fehler = false;
  var el, panel, feld, inhalt, status, liste, leer, nichts, ausloeser = null, inertListe = [], letzte = '';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function url(u) { return new URL(u, BASIS).href; }

  function lade() {
    if (laden) return laden;
    fehler = false;
    laden = new Promise(function (ok, nein) {
      if (window.CodaniSucheKern) { ok(); return; }
      var s = d.createElement('script');
      s.src = url('js/suche-kern.js'); s.async = true;
      s.onload = function () { ok(); }; s.onerror = function () { nein(new Error('Suchkern')); };
      d.head.appendChild(s);
    }).then(function () {
      return fetch(url('assets/suche.json'), { credentials: 'same-origin' });
    }).then(function (r) {
      if (!r.ok) throw new Error('Index ' + r.status);
      return r.json();
    }).then(function (j) {
      daten = j; index = new window.CodaniSucheKern.Index(j);
      return index;
    });
    laden.catch(function () { laden = null; fehler = true; if (el && !el.hidden) zeige(feld.value); });
    return laden;
  }

  /* ---------------------------------------------------------------- Fenster */
  var LUPE = '<svg class="suche__lupe" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="8.6" cy="8.6" r="5.9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13.1 13.1l4.4 4.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  function baue() {
    el = d.createElement('div');
    el.className = 'suche';
    el.hidden = true;
    el.innerHTML =
      '<div class="suche__hinter" data-suche-zu></div>' +
      '<div class="suche__panel" role="dialog" aria-modal="true" aria-label="Suche auf der Website">' +
        '<div class="suche__kopf">' + LUPE +
          '<input class="suche__feld" id="suche-feld" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"' +
          ' placeholder="Frage oder Stichwort, z. B. Was kostet eine Website?" aria-label="Suchbegriff oder Frage" aria-describedby="suche-status" aria-controls="suche-liste">' +
          '<button class="suche__zu" type="button" data-suche-zu aria-label="Suche schliessen"><span class="suche__zu-esc" aria-hidden="true">Esc</span><span class="suche__zu-x" aria-hidden="true">×</span></button>' +
        '</div>' +
        '<div class="suche__inhalt">' +
          '<p class="suche__status" id="suche-status" role="status" aria-live="polite"></p>' +
          '<ol class="suche__liste" id="suche-liste"></ol>' +
          '<div class="suche__leer"></div>' +
          '<div class="suche__nichts" hidden></div>' +
        '</div>' +
        '<div class="suche__fuss">' +
          '<span>Die Suche läuft in Ihrem Browser. Ihre Eingabe wird nicht übertragen.</span>' +
          '<span class="suche__tasten" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> wählen <kbd>Enter</kbd> öffnen <kbd>Esc</kbd> schliessen</span>' +
        '</div>' +
      '</div>';
    d.body.appendChild(el);
    panel = el.querySelector('.suche__panel');
    feld = el.querySelector('.suche__feld');
    inhalt = el.querySelector('.suche__inhalt');
    status = el.querySelector('.suche__status');
    liste = el.querySelector('.suche__liste');
    leer = el.querySelector('.suche__leer');
    nichts = el.querySelector('.suche__nichts');

    var timer = 0;
    feld.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { zeige(feld.value); }, 60);
    });
    feld.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { var a = ziele()[0]; if (a) { e.preventDefault(); a.focus(); } }
      else if (e.key === 'Enter') {
        var erster = liste.querySelector('.suche__treffer');
        if (erster && feld.value.trim()) { e.preventDefault(); oeffne(erster); }
      }
    });
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-suche-zu]');
      if (t) { zu(); return; }
      var v = e.target.closest('[data-suche-vorschlag]');
      if (v) { feld.value = v.getAttribute('data-suche-vorschlag'); zeige(feld.value); feld.focus(); return; }
      var a = e.target.closest('a.suche__treffer, a[data-suche-link]');
      if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) { e.preventDefault(); oeffne(a); }
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); zu(); return; }
      if (e.key === 'Tab') falle(e);
      if (e.target === feld) return;
      var alle = ziele(), i = alle.indexOf(d.activeElement);
      if (e.key === 'ArrowDown' && i >= 0) { e.preventDefault(); (alle[i + 1] || alle[i]).focus(); }
      else if (e.key === 'ArrowUp' && i >= 0) { e.preventDefault(); if (i === 0) feld.focus(); else alle[i - 1].focus(); }
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && i >= 0) feld.focus();
    });
    // Seite dahinter nicht mitscrollen
    el.addEventListener('wheel', function (e) { if (!inhalt.contains(e.target) || inhalt.scrollHeight <= inhalt.clientHeight) e.preventDefault(); }, { passive: false });
    el.addEventListener('touchmove', function (e) { if (!inhalt.contains(e.target)) e.preventDefault(); }, { passive: false });
  }

  // Treffer, Vorschlaege und Links in Reihenfolge (fuer die Pfeiltasten)
  function ziele() { return Array.prototype.slice.call(inhalt.querySelectorAll('a, button')).filter(function (x) { return x.offsetParent !== null; }); }

  // Tab bleibt im Fenster
  function falle(e) {
    var f = [feld].concat(ziele()).concat([el.querySelector('.suche__zu')]);
    var i = f.indexOf(d.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }

  function oeffne(a) {
    var ziel = new URL(a.href, location.href);
    var gleich = ziel.origin === location.origin && ziel.pathname === location.pathname;
    zu(true);
    if (gleich && ziel.hash) {
      if (location.hash === ziel.hash) springe(ziel.hash);
      else location.hash = ziel.hash;
    } else location.href = ziel.href;
  }
  function springe(hash) {
    var t = d.getElementById(decodeURIComponent(hash.slice(1)));
    if (!t) return;
    var det = t.tagName === 'DETAILS' ? t : t.closest && t.closest('details');
    if (det) det.open = true;
    t.scrollIntoView({ block: 'start' });
  }

  /* ---------------------------------------------------------------- Anzeige */
  function zeigeLeer() {
    liste.innerHTML = ''; nichts.hidden = true; leer.hidden = false;
    status.textContent = '';
    var v = (daten && daten.vorschlaege) || [], s = (daten && daten.schnell) || [];
    leer.innerHTML =
      '<p class="suche__gruppe">Häufige Fragen</p>' +
      '<div class="suche__chips">' + (v.length ? v.map(function (x) {
        return '<button class="suche__chip" type="button" data-suche-vorschlag="' + esc(x.text) + '">' + esc(x.text) + '</button>';
      }).join('') : '<span class="suche__lade">Wird geladen …</span>') + '</div>' +
      (s.length ? '<p class="suche__gruppe">Direkt zu</p><div class="suche__schnell">' + s.map(function (x) {
        return '<a data-suche-link href="' + esc(url(x.ziel)) + '">' + esc(x.text) + '<span aria-hidden="true">→</span></a>';
      }).join('') + '</div>' : '');
  }

  function zeige(q) {
    if (!el) return;
    letzte = q;
    if (!q.trim()) { zeigeLeer(); return; }
    if (fehler) {
      leer.hidden = true; liste.innerHTML = '';
      status.textContent = 'Die Suche konnte nicht geladen werden.';
      nichts.hidden = false;
      nichts.innerHTML = '<p>Bitte laden Sie die Seite neu oder schreiben Sie mir direkt.</p>' + kontaktLinks(q);
      return;
    }
    if (!index) {
      status.textContent = 'Die Suche wird geladen …';
      lade().then(function () { if (letzte === q) zeige(q); }, function () {});
      return;
    }
    var r = index.suche(q, { max: 8 });
    leer.hidden = true;
    if (!r.treffer.length) {
      liste.innerHTML = '';
      status.textContent = 'Keine Treffer.';
      nichts.hidden = false;
      nichts.innerHTML = '<p class="suche__nichts-titel">Dazu habe ich auf der Website nichts gefunden.</p>' +
        '<p>Versuchen Sie ein anderes Wort, oder stellen Sie Ihre Frage direkt. Ich antworte persönlich.</p>' + kontaktLinks(q);
      return;
    }
    nichts.hidden = true;
    var schmal = window.innerWidth < 760;
    status.textContent = r.treffer.length === 1 ? '1 Treffer' : r.treffer.length + ' Treffer';
    liste.innerHTML = r.treffer.map(function (t) {
      var doc = t.doc;
      var art = doc.k === 'frage' ? 'Frage' : doc.k === 'seite' ? 'Seite' : '';
      var text = index.auszug(doc, r.begriffe, schmal ? 115 : 190);
      return '<li><a class="suche__treffer" href="' + esc(url(doc.u)) + '">' +
        '<span class="suche__ort">' + esc(doc.p) + (art ? '<span class="suche__art">' + art + '</span>' : '') + '</span>' +
        '<span class="suche__titel">' + index.markiere(doc.t, r.begriffe) + '</span>' +
        (text ? '<span class="suche__text">' + text + '</span>' : '') +
        '</a></li>';
    }).join('');
    inhalt.scrollTop = 0;
  }

  function kontaktLinks(q) {
    return '<div class="suche__kontakt">' +
      '<a class="btn btn--sm" data-suche-link href="' + esc(url('kontakt/?frage=' + encodeURIComponent(q.trim()))) + '">Frage an Jonas senden</a>' +
      '<a class="more" data-suche-link href="' + esc(url('kontakt/')) + '">Alle Kontaktwege</a>' +
      '</div>';
  }

  /* ---------------------------------------------------------------- Oeffnen und Schliessen */
  function auf(q, von) {
    if (!el) baue();
    if (!el.hidden) { feld.focus(); return; }
    ausloeser = von || d.activeElement;
    // Handy-Menue zuerst schliessen
    var toggle = d.querySelector('.hdr__toggle[aria-expanded="true"]');
    if (toggle) toggle.click();
    el.hidden = false;
    inertListe = Array.prototype.filter.call(d.body.children, function (c) { return c !== el && !c.inert && c.tagName !== 'SCRIPT'; });
    inertListe.forEach(function (c) { c.inert = true; });
    d.documentElement.classList.add('suche-offen');
    requestAnimationFrame(function () { el.classList.add('is-offen'); });
    if (typeof q === 'string') feld.value = q;
    feld.focus();
    if (feld.value) feld.select();
    zeige(feld.value);
    lade().then(function () { if (!feld.value.trim()) zeigeLeer(); }, function () {});
  }

  function zu(ohneFokus) {
    if (!el || el.hidden) return;
    el.classList.remove('is-offen');
    el.hidden = true;
    d.documentElement.classList.remove('suche-offen');
    inertListe.forEach(function (c) { c.inert = false; });
    inertListe = [];
    if (!ohneFokus && ausloeser && ausloeser.focus && d.contains(ausloeser)) ausloeser.focus();
  }

  /* ---------------------------------------------------------------- Knoepfe und Tasten */
  function init() {
    var knoepfe = d.querySelectorAll('[data-suche-auf]');
    Array.prototype.forEach.call(knoepfe, function (k) {
      k.addEventListener('click', function () { auf(undefined, k); });
      k.addEventListener('pointerenter', function () { lade().catch(function () {}); }, { once: true });
      k.addEventListener('focus', function () { lade().catch(function () {}); }, { once: true });
    });
    Array.prototype.forEach.call(d.querySelectorAll('[data-suche-kbd]'), function (k) { k.textContent = istMac ? '⌘ K' : 'Ctrl K'; });
    d.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (el && !el.hidden) zu(); else auf();
        return;
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var t = e.target, tag = t && t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
        if (el && !el.hidden) return;
        e.preventDefault(); auf();
      }
    });
    try {
      var q = new URLSearchParams(location.search).get('suche');
      if (q !== null) auf(q);
    } catch (e) { /* ohne Suchparameter */ }
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
