/* Studio V4 · gemeinsames Skript aller Seiten (auch der 3D-Startseite). Ohne Abhaengigkeiten, ohne three.js.
   Kopfzeile, KI-Panel, Handy-Menue, Einblenden, FAQ-Anker, Kontaktformular. Fundament: nur nach Absprache aendern. */
(function () {
  'use strict';
  var d = document;
  var root = d.documentElement;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('site-on');

  /* ------------------------------------------------------------ Kopfzeile */
  var hdr = $('[data-hdr]');
  var lightStart = $('[data-light]');
  function onScroll() {
    if (!hdr) return;
    hdr.classList.toggle('is-scrolled', window.scrollY > 8);
    if (lightStart) {
      var top = lightStart.getBoundingClientRect().top;
      hdr.classList.toggle('is-light', top <= hdr.offsetHeight);
    }
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; onScroll(); });
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ------------------------------------------------------------ KI-Panel (Disclosure) */
  var more = hdr && $('.hdr__more', hdr);
  var panel = $('#ki-panel');
  if (more && panel) {
    var item = more.parentNode;
    var hoverTimer = 0;
    var setPanel = function (open, focusBack) {
      panel.hidden = !open;
      more.setAttribute('aria-expanded', String(open));
      more.setAttribute('aria-label', more.getAttribute(open ? 'data-label-close' : 'data-label-open'));
      if (!open && focusBack) more.focus();
    };
    var isOpen = function () { return !panel.hidden; };
    more.addEventListener('click', function () { setPanel(!isOpen()); });
    var canHover = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (canHover) {
      var enter = function () { clearTimeout(hoverTimer); if (!isOpen()) hoverTimer = setTimeout(function () { setPanel(true); }, 120); };
      var leave = function () { clearTimeout(hoverTimer); hoverTimer = setTimeout(function () { if (!panel.contains(d.activeElement) && !item.contains(d.activeElement)) setPanel(false); }, 220); };
      item.addEventListener('mouseenter', enter);
      item.addEventListener('mouseleave', leave);
      panel.addEventListener('mouseenter', function () { clearTimeout(hoverTimer); });
      panel.addEventListener('mouseleave', leave);
    }
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) setPanel(false, true); });
    d.addEventListener('click', function (e) { if (isOpen() && !panel.contains(e.target) && !item.contains(e.target)) setPanel(false); });
    var focusOut = function (e) {
      var to = e.relatedTarget;
      if (isOpen() && to && !panel.contains(to) && !item.contains(to)) setPanel(false);
    };
    item.addEventListener('focusout', focusOut);
    panel.addEventListener('focusout', focusOut);
  }

  /* ------------------------------------------------------------ Handy-Menue */
  var toggle = hdr && $('.hdr__toggle', hdr);
  var menu = $('#menu');
  if (toggle && menu) {
    var text = $('.hdr__toggle-text', toggle);
    var behind = function () { return $$('main, .ftr, .hud, .story-skip, .skip-link, .story-bar'); };
    var setMenu = function (open, focusBack) {
      menu.hidden = !open;
      hdr.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', toggle.getAttribute(open ? 'data-label-close' : 'data-label-open'));
      if (text) text.textContent = text.getAttribute(open ? 'data-close' : 'data-open');
      d.body.style.overflow = open ? 'hidden' : '';
      behind().forEach(function (el) { el.inert = open; });
      if (open) { var first = $('a, button', menu); if (first) requestAnimationFrame(function () { first.focus(); }); }
      else if (focusBack) toggle.focus();
    };
    toggle.addEventListener('click', function () { setMenu(menu.hidden, !menu.hidden); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) setMenu(false, true); });
    menu.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) setMenu(false); });
    $$('.menu__group', menu).forEach(function (b) {
      var sub = d.getElementById(b.getAttribute('aria-controls'));
      if (b.hasAttribute('data-current') && sub) { sub.hidden = false; b.setAttribute('aria-expanded', 'true'); }
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(open));
        if (sub) sub.hidden = !open;
      });
    });
    var mq = window.matchMedia && matchMedia('(min-width: 1024px)');
    if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (mq.matches && !menu.hidden) setMenu(false); });
  }

  /* ------------------------------------------------------------ Einblenden (einmal, Versatz fuer Geschwister) */
  // Nichts darf unsichtbar bleiben (07.11.2026): Schwelle 0 statt 15 % (sehr hohe Bloecke wie der Demo-Assistent
  // am Handy erreichten 15 % nie), Bloecke ueber dem Bildschirm (Sprung per Anker, Zurueck) und in waagrecht
  // wischbaren Reihen (Bildergeschichte am Handy) sofort zeigen, beim Drucken alles.
  var rev = $$('[data-reveal]');
  if (rev.length) {
    var showAll = function () { rev.forEach(function (el) { el.classList.add('is-in'); }); };
    var inScroller = function (el) {
      for (var p = el.parentElement; p && p !== d.body; p = p.parentElement) {
        var o = getComputedStyle(p).overflowX;
        if (o === 'auto' || o === 'scroll') return true;
      }
      return false;
    };
    window.addEventListener('beforeprint', showAll);
    if (reduced || !('IntersectionObserver' in window)) showAll();
    else {
      var io = new IntersectionObserver(function (entries) {
        var batch = 0;
        entries.forEach(function (e) {
          var el = e.target;
          if (!e.isIntersecting) {
            if (e.boundingClientRect.bottom > 0) return;
            el.style.transitionDuration = '0s';
          } else {
            el.style.transitionDelay = Math.min(batch, 4) * 60 + 'ms';
            batch += 1;
          }
          el.classList.add('is-in');
          io.unobserve(el);
          if (above) above.unobserve(el);
        });
      }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
      // Zweiter Beobachter fuer alles ueber dem Bildschirm: Ein Sprung per Anker oder die Zurueck-Taste wechselt von
      // "unterhalb" direkt zu "oberhalb", ohne dass der erste Beobachter etwas meldet.
      var above = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting || e.target.classList.contains('is-in')) return;
          e.target.style.transitionDuration = '0s';
          e.target.classList.add('is-in');
          io.unobserve(e.target);
          above.unobserve(e.target);
        });
      }, { threshold: 0, rootMargin: '100000px 0px -100% 0px' });
      rev.forEach(function (el) {
        if (inScroller(el)) el.classList.add('is-in');
        else { io.observe(el); above.observe(el); }
      });
    }
  }

  /* ------------------------------------------------------------ FAQ: Link auf #faq-... oeffnet die Frage */
  function openHash() {
    var id = location.hash.slice(1);
    if (!id) return;
    var el = d.getElementById(id);
    var det = el && (el.tagName === 'DETAILS' ? el : el.closest && el.closest('details'));
    if (det && !det.open) det.open = true;
  }
  openHash();
  window.addEventListener('hashchange', openHash);

  /* ------------------------------------------------------------ Kontaktformular */
  $$('form.form[data-timeout]').forEach(initForm);

  function initForm(form) {
    var status = $('.form__status', form);
    var summary = $('.form__summary', form);
    var btn = $('button[type="submit"]', form);
    var btnHtml = btn ? btn.innerHTML : '';
    var call = $('#f-rueckruf', form);
    var tel = $('#f-telefon', form);
    var msg = $('#f-nachricht', form);
    var mail = form.getAttribute('data-mail-user') + '@' + form.getAttribute('data-mail-domain');

    // Thema aus ?thema= vorwaehlen, passender Platzhalter in der Nachricht
    try {
      var cfg = JSON.parse(($('.form__themen', form) || {}).textContent || '{}');
      var key = new URLSearchParams(location.search).get('thema');
      var t = key && cfg.themen && cfg.themen[key];
      if (t) {
        $$('input[name="thema"]', form).forEach(function (r) { r.checked = r.value === t.wahl; });
        if (msg && t.platzhalter) msg.placeholder = t.platzhalter;
      }
    } catch (e) { /* ohne Vorauswahl weiter */ }

    // Rueckruf: Telefon wird Pflicht, "Wann erreiche ich Sie" erscheint
    var syncCall = function () {
      var on = !!(call && call.checked);
      form.classList.toggle('is-callback', on);
      if (tel) { tel.required = on; if (!on) setError(tel, ''); }
    };
    if (call) { call.addEventListener('change', syncCall); syncCall(); }

    function setError(input, text) {
      var field = input.closest('.field');
      var err = field && $('.field__error', field);
      if (field) field.classList.toggle('is-invalid', !!text);
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
      var ids = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (err) {
        err.textContent = text || '';
        err.hidden = !text;
        ids = ids.filter(function (x) { return x !== err.id; });
        if (text) ids.push(err.id);
      }
      if (ids.length) input.setAttribute('aria-describedby', ids.join(' ')); else input.removeAttribute('aria-describedby');
    }
    function validate(input) {
      var v = input.value.trim();
      var err = input.closest('.field') && $('.field__error', input.closest('.field'));
      var text = '';
      if (input.required && !v) text = input === tel ? form.getAttribute('data-tel-msg') : (err && err.getAttribute('data-msg')) || '';
      else if (input.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) text = err && err.getAttribute('data-msg');
      setError(input, text);
      return !text;
    }
    var fields = function () { return $$('input[required], textarea[required]', form); };
    $$('input, textarea', form).forEach(function (input) {
      input.addEventListener('blur', function () { if (input.required && (input.value.trim() || input.dataset.touched)) validate(input); input.dataset.touched = '1'; });
      input.addEventListener('input', function () { if (input.getAttribute('aria-invalid') === 'true') validate(input); });
    });

    function show(kind, textMsg, extra) {
      if (!status) return;
      status.className = 'form__status is-' + kind;
      status.textContent = '';
      var s = d.createElement('span');
      s.textContent = textMsg;
      status.appendChild(s);
      if (extra) status.appendChild(extra);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = fields().filter(function (i) { return !validate(i); });
      if (summary) {
        summary.hidden = bad.length < 2;
        summary.textContent = '';
        if (bad.length >= 2) {
          var p = d.createElement('p'); p.style.margin = '0'; p.textContent = form.getAttribute('data-summary');
          var ul = d.createElement('ul');
          bad.forEach(function (i) {
            var li = d.createElement('li'); var a = d.createElement('a');
            a.href = '#' + i.id; a.textContent = $('.field__error', i.closest('.field')).textContent;
            a.addEventListener('click', function (ev) { ev.preventDefault(); i.focus(); });
            li.appendChild(a); ul.appendChild(li);
          });
          summary.appendChild(p); summary.appendChild(ul);
        }
      }
      if (bad.length) { bad[0].focus(); return; }
      var data = new FormData(form);
      if (data.get('botcheck')) return;
      var body = ['Thema: ' + (data.get('thema') || 'nicht angegeben'), 'Firma: ' + (data.get('firma') || ''), 'Telefon: ' + (data.get('telefon') || ''), 'Programme: ' + (data.get('programme') || ''),
        'Rückruf: ' + (data.get('rueckruf') ? 'ja, ' + (data.get('erreichbar') || '') : 'nein'), '', String(data.get('message') || ''), '',
        'Name: ' + data.get('name'), 'E-Mail: ' + data.get('email')].join('\n');
      if (btn) { btn.disabled = true; btn.textContent = form.getAttribute('data-sending'); }
      show('info', form.getAttribute('data-sending'));
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, (+form.getAttribute('data-timeout') || 15) * 1000) : 0;
      fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (j) { if (!res.ok || j.success === false) throw new Error('HTTP ' + res.status); });
        })
        .then(function () {
          clearTimeout(timer);
          show('ok', form.getAttribute('data-ok'));
          form.reset(); syncCall();
          fields().forEach(function (i) { delete i.dataset.touched; setError(i, ''); });
        })
        .catch(function () {
          clearTimeout(timer);
          var a = d.createElement('a');
          a.href = 'mailto:' + mail + '?subject=' + encodeURIComponent(form.getAttribute('data-subject')) + '&body=' + encodeURIComponent(body);
          a.textContent = form.getAttribute('data-error-link');
          show('error', form.getAttribute('data-error'), a);
        })
        .then(function () { if (btn) { btn.disabled = false; btn.innerHTML = btnHtml; } });
    });
  }
})();
