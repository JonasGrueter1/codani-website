// UI der 3D-Startseite ohne three.js: Preloader, eigener Cursor, Fortschritt (HUD), Text-Einblendungen der Geschichte,
// weiches Scrollen zu Ankern im 3D-Modus. Laeuft auch im Fallback (ohne WebGL, reduzierte Bewegung).
// Seit V4 liegen Kopfzeile, Navigation, Handy-Menue, Einblenden der Inhalte, FAQ und Formular in js/site.js
// (gemeinsam mit allen Unterseiten).

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export class UI {
  constructor() {
    this.root = document.documentElement;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.gsap = window.gsap || null;
    this._shown = 0;
    this._target = 0;
    this._ticking = false;
    this._panels = new Map();
    this.pre = $('#preloader');
    this.preNum = $('#preload-num');
    this.prePct = $('#preload-pct');
    this.preText = $('#preload-text');
    this.preBar = $('#preload-bar');
    this.hudIndex = $('#hud-index');
    this.hudLabel = $('#hud-label');
    this.progressEls = $$('.hud, .story-bar');
    this._static = false;
    this.root.classList.add('ui-on');
    // 3D-Modus: Panels sind bis zum Einblenden unsichtbar (--o 0) und duerfen keinen Fokus bekommen
    if (this.root.classList.contains('gl')) {
      for (const sec of $$('.chapter')) this.setInteractive(sec, sec.dataset.scene === 'intro');
    }
    this.splitText();
    this.initAnchors();
    this.initCursor();
  }

  /* ------------------------------------------------- Woerter aufteilen */
  // Jedes Wort in <span class="w"><i>..</i></span>, damit es aus einer Maske aufsteigen kann.
  // Die Ueberschrift bekommt den ganzen Satz als aria-label, die Wort-Spans sind fuer Screenreader versteckt
  // (VoiceOver liest inline-block-Woerter sonst einzeln). Leerzeichen bleiben echte Textknoten (Suche, Kopieren).
  splitText() {
    for (const el of $$('[data-split]')) {
      if (el.classList.contains('is-split')) continue;
      const text = el.textContent.trim().replace(/\s+/g, ' ');
      const words = text.split(' ');
      el.setAttribute('aria-label', text);
      el.textContent = '';
      words.forEach((word, i) => {
        const w = document.createElement('span');
        w.className = 'w';
        w.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('i');
        inner.textContent = word;
        w.appendChild(inner);
        el.appendChild(w);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
      el.classList.add('is-split');
    }
  }

  /* ---------------------------------------------------------- Preloader */
  progress(f) {
    this._target = Math.max(this._target, Math.min(1, f));
    if (!this._ticking) { this._ticking = true; requestAnimationFrame(() => this._tick()); }
  }

  _tick() {
    const d = this._target - this._shown;
    this._shown += Math.max(Math.min(d, 0.004), d * 0.09);
    if (this._target - this._shown < 0.002) this._shown = this._target;
    const pct = Math.round(this._shown * 100);
    if (pct !== this._pct) {
      this._pct = pct;
      if (this.preNum) this.preNum.textContent = String(pct);
      if (this.prePct) this.prePct.textContent = String(pct);
      if (this.preText && pct >= 55 && !this._altText) {
        this._altText = true;
        const t = this.preText;
        t.style.opacity = '0';
        setTimeout(() => { t.textContent = t.dataset.alt || t.textContent; t.style.opacity = '1'; }, 380);
      }
    }
    if (this.preBar) this.preBar.style.transform = `scaleX(${this._shown.toFixed(4)})`;
    if (this._shown < this._target) requestAnimationFrame(() => this._tick());
    else this._ticking = false;
  }

  /** Preloader auf 100 % laufen lassen und ausblenden. Loest auf, wenn die Seite frei ist. */
  finish() {
    if (this._finishing) return this._finishing;
    this.progress(1);
    this._finishing = new Promise((resolve) => {
      const wait = () => {
        if (this._shown < 0.999) { requestAnimationFrame(wait); return; }
        this._exit(resolve);
      };
      wait();
    });
    return this._finishing;
  }

  _exit(resolve) {
    const ready = () => {
      if (this._ready) return;
      this._ready = true;
      this.root.classList.add('is-ready');
      resolve();
    };
    const done = () => {
      if (this.pre) this.pre.hidden = true;
      ready();
    };
    if (!this.pre || this.reduced) { done(); return; }
    const g = this.gsap;
    this.root.classList.add('is-leaving');
    if (g) {
      // Intro startet schon, waehrend der Vorhang noch ausblendet
      g.timeline({ onComplete: done })
        .to('.preloader__meta, .preloader__count, .preloader__status', { y: -18, opacity: 0, duration: 0.5, ease: 'power2.in', stagger: 0.04 })
        .to('.preloader__line', { scaleX: 1.6, opacity: 0, duration: 0.6, ease: 'power3.inOut' }, '<0.1')
        .to(this.pre, { opacity: 0, duration: 0.8, ease: 'power2.out' }, '-=0.25')
        .add(ready, '-=0.6');
    } else {
      this.pre.style.transition = 'opacity .6s ease';
      this.pre.style.opacity = '0';
      setTimeout(ready, 150);
      setTimeout(done, 650);
    }
  }

  hidePreloader() {
    if (this.pre) this.pre.hidden = true;
    this.root.classList.add('is-ready');
  }

  /** Einstieg nach dem Preloader: Intro-Elemente nacheinander einblenden */
  introReveal() {
    const intro = $('[data-scene="intro"]');
    if (!intro) return;
    this._introDone = true;
    this.panel(intro, true, { first: true });
  }

  /* ------------------------------------------- Text-Panels der Geschichte */
  _parts(section) {
    let p = this._panels.get(section);
    if (p) return p;
    const text = $('.chapter__text', section) || section;
    p = {
      words: $$('[data-split] .w > i', text),
      lines: $$('.kicker, .eyebrow', text),
      items: $$('[data-anim]:not(.kicker), [data-intro]:not([data-split]):not(.eyebrow)', section),
      tl: null,
      on: false,
    };
    this._panels.set(section, p);
    return p;
  }

  /** Panel wird sichtbar (on) oder ist ganz ausgeblendet (off). Vom Director bei jedem Wechsel gerufen. */
  panel(section, on, { first = false } = {}) {
    const g = this.gsap;
    const p = this._parts(section);
    if (this._static) return;
    this.setInteractive(section, on);
    // Station ohne Text (Flug ins Gehirn): nichts einzublenden (GSAP warnt sonst bei leeren Zielen)
    if (!p.words.length && !p.lines.length && !p.items.length) return;
    if (!g || this.reduced) {
      [...p.words, ...p.lines, ...p.items].forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
      return;
    }
    if (section.dataset.scene === 'intro' && !this._introDone) return; // wartet auf den Preloader
    if (on === p.on && !first) return;
    p.on = on;
    if (p.tl) { p.tl.kill(); p.tl = null; }
    if (!on) {
      // Panel ist schon ausgeblendet (--o = 0): Ausgangslage fuer das naechste Mal
      g.set(p.words, { yPercent: 115, rotate: 4 });
      g.set(p.items, { opacity: 0, y: 14 });
      g.set(p.lines, { opacity: 0, x: -12 });
      return;
    }
    // Lesbarkeit vor Effekt: Die Woerter stehen nach hoechstens 0.6 s (inkl. Versatz) still, der Rest folgt kurz danach.
    // Nur der Hero direkt nach dem Preloader darf etwas laenger aufsteigen.
    const delay = first ? 0.15 : 0.02;
    const tl = g.timeline({ delay });
    const n = p.words.length;
    const wDur = first ? 0.8 : 0.48;
    const wTotal = first ? 1.1 : 0.6;
    const stagger = n > 1 ? Math.min(first ? 0.06 : 0.035, (wTotal - wDur) / (n - 1)) : 0;
    if (p.lines.length) tl.fromTo(p.lines, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }, 0);
    if (n) {
      tl.fromTo(p.words, { yPercent: 115, rotate: 4 }, {
        yPercent: 0, rotate: 0, duration: wDur, ease: 'expo.out', stagger,
      }, 0.04);
    }
    if (p.items.length) {
      tl.fromTo(p.items, { opacity: 0, y: 14 }, {
        opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.06, clearProps: 'transform',
      }, first ? 0.45 : 0.16);
    }
    p.tl = tl;
  }

  /**
   * Unsichtbare Panels: Links und Buttons aus der Tab-Reihenfolge nehmen (tabindex -1). Kein inert: Texte und
   * Ueberschriften bleiben im Accessibility-Baum, Screenreader lesen alle Kapitel (Deckkraft 0 stoert sie nicht).
   */
  setInteractive(section, on) {
    const panel = section.querySelector('.chapter__panel');
    if (!panel) return;
    for (const a of panel.querySelectorAll('a, button')) {
      if (on) a.removeAttribute('tabindex');
      else a.setAttribute('tabindex', '-1');
    }
  }

  /**
   * Statischer Fallback (kein WebGL, Kontextverlust, zu langsam): alle Einblend-Animationen stoppen,
   * Inline-Stile von GSAP entfernen, alle Panels sichtbar und bedienbar.
   */
  toStatic() {
    this._static = true;
    // Angebotszeile gibt es nur mit 3D (im Fallback steht der Knopf nicht im Bild)
    this._offerOn = false;
    this._offerEnd = false;
    this.root.classList.remove('offer-on', 'offer-end');
    const offer = $('#offer');
    if (offer) offer.classList.remove('is-on');
    const g = this.gsap;
    for (const sec of $$('.chapter')) {
      const p = this._parts(sec);
      if (p.tl) { p.tl.kill(); p.tl = null; }
      p.on = true;
      const els = [...p.words, ...p.lines, ...p.items];
      if (g && els.length) { g.killTweensOf(els); g.set(els, { clearProps: 'all' }); }
      els.forEach((el) => { el.style.opacity = ''; el.style.transform = ''; });
      this.setInteractive(sec, true);
    }
  }

  /* --------------------------------------------------------------- HUD */
  setChapter(index, label) {
    const idx = String(index).padStart(2, '0');
    if (this.hudIndex) this.hudIndex.textContent = idx;
    const el = this.hudLabel;
    if (!el || el.textContent === label) return;
    const g = this.gsap;
    if (!g || this.reduced || !this._ready) { el.textContent = label; return; }
    g.killTweensOf(el);
    g.to(el, {
      opacity: 0, y: -6, duration: 0.2, ease: 'power2.in',
      onComplete: () => {
        el.textContent = label;
        g.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
      },
    });
  }

  /**
   * Angebotszeile unter dem fertigen Website-Geruest (Kapitel Code, Fortschritt p im Beat dna 0..1). Nur mit 3D: der
   * Knopf ist sonst nicht fokussierbar (tabindex -1), damit er nicht unsichtbar im Fokus liegt.
   */
  setOffer(p, inContent) {
    // "Animation ueberspringen" bleibt vom Angebotsmoment bis zum Ausklang weg (sonst taucht die Pille nach der
    // Angebotszeile im Lichtblitz des Schnitts kurz auf). Im Ausklang blendet data-beat sie ohnehin aus.
    const end = !inContent && p > 0.82;
    if (end !== this._offerEnd) {
      this._offerEnd = end;
      this.root.classList.toggle('offer-end', end);
    }
    const on = end && p < 0.985;
    if (on === this._offerOn) return;
    this._offerOn = on;
    const el = this._offer || (this._offer = $('#offer'));
    if (!el) return;
    el.classList.toggle('is-on', on);
    this.root.classList.toggle('offer-on', on);
    const a = el.querySelector('a');
    if (a) {
      if (on) a.removeAttribute('tabindex');
      else {
        a.setAttribute('tabindex', '-1');
        if (document.activeElement === a) a.blur();
      }
    }
  }

  setStory(p, inContent) {
    const v = Math.round(p * 1000) / 1000;
    if (v !== this._story) {
      this._story = v;
      for (const el of this.progressEls) el.style.setProperty('--story', v);
    }
    const off = !!inContent;
    if (off !== this._hudOff) { this._hudOff = off; this.root.classList.toggle('is-content', off); }
  }

  /* ------------------------------------------------------ Anker-Links */
  // Im 3D-Modus ist scroll-behavior aus (ScrollTrigger misst sonst beim Refresh falsch). Anker scrollen darum
  // per JS weich. Im Fallback uebernimmt das CSS (html:not(.gl) { scroll-behavior: smooth }).
  initAnchors() {
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!this.root.classList.contains('gl') || this.reduced) return;
      const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      const header = $('.hdr');
      const pad = id === 'top' ? 0 : (header ? header.offsetHeight : 0);
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - pad);
      window.scrollTo({ top, behavior: 'smooth' });
      if (window.history && history.pushState) history.pushState(null, '', `#${id}`);
      // Fokus an das Ziel (Tastatur und Screenreader lesen dort weiter), ohne den weichen Scroll zu stoeren
      if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) {
        target.setAttribute('tabindex', '-1');
      }
      try { target.focus({ preventScroll: true }); } catch (err) { /* alter Browser */ }
    });
  }

  /* ------------------------------------------------------------ Cursor */
  initCursor() {
    // Nur Dekoration: der Systemzeiger bleibt (auch vergroesserte Zeiger und Barrierefreiheit), ein feiner Ring folgt
    // ihm weich. Erst nach dem Preloader und nur mit echter Maus.
    if (this.reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = document.createElement('div');
    el.className = 'cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="cursor__ring"></span>';
    document.body.appendChild(el);
    this.root.classList.add('has-cursor');
    const ring = el.firstElementChild;
    let x = -100;
    let y = -100;
    let rx = x;
    let ry = y;
    let last = performance.now();
    let raf = 0;
    let idle = 0;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = 1 - Math.exp(-dt * 16);
      rx += (x - rx) * k;
      ry += (y - ry) * k;
      ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
      // Ruhe: Schleife anhalten, bis die Maus sich wieder bewegt
      idle = Math.abs(x - rx) + Math.abs(y - ry) < 0.3 ? idle + 1 : 0;
      raf = idle > 10 ? 0 : requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      el.classList.add('is-visible');
      if (!raf) { last = performance.now(); idle = 0; raf = requestAnimationFrame(loop); }
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      el.classList.toggle('is-link', !!t.closest('a, button, [data-cursor], label, summary, select'));
      el.classList.toggle('is-text', !!t.closest('input, textarea'));
    });
    document.documentElement.addEventListener('pointerleave', () => el.classList.remove('is-visible'));
    window.addEventListener('pointerdown', () => el.classList.add('is-down'));
    window.addEventListener('pointerup', () => el.classList.remove('is-down'));
  }
}
