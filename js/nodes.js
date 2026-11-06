// Knoten-Links der Kabel-Szene (V4-KONZEPT 5.3). Ohne three.js, laeuft nur mit 3D (main.js erzeugt und entsorgt es).
//
// Die fuenf Werkzeug-Links stehen im Kapitel Kabel als nav.tool-links im Text-Panel (echte Links, ohne 3D als Pillen).
// Ein Link-Satz je Darstellung, nie doppelt fuer Screenreader:
//   Modus "nodes" (Querformat ab 1024 px): die nav wandert aus dem Text-Panel (dort laege sie unter dessen Transform und
//     Deckkraft) direkt hinter das Panel in den Abschnitt und steht fix ueber der Buehne. Jeder Link sitzt mit einer
//     runden Trefferflaeche (mindestens 48 px) auf seinem 3D-Knoten, daneben die Beschriftung als Pille. Zeigen oder
//     Fokus hebt den Knoten hervor (cables.setHighlight: Knoten leuchtet, Impulse laufen schneller).
//   Modus "pills" (Hochformat, schmale Fenster): die Links bleiben Pillen im Text-Panel. Sichtbare Knoten bekommen
//     zusaetzlich eine Tippflaeche mit Namen (aria-hidden, tabindex -1, gleicher Link), ohne eigenen Fokus.
// Sichtbar nur von cables@SHOW bis zum Ende des Beats cables und solange der Knoten frei im Bild steht
// (cables.screen[i].vis: nicht unter Kopfzeile, HUD oder Text, nicht hinter einem naeheren Knoten). Mit dem Anflug auf
// den Website-Knoten (Kapitel Code, Beat dna) blenden sie in HIDE (p im Beat dna) aus. Unsichtbare Links: Deckkraft 0,
// keine Zeiger-Ereignisse, tabindex -1. Vor der Kabel-Szene bleiben sie im Accessibility-Baum (wie die Texte der
// Panels). Ab dem Kapitel Code und im Inhaltsbereich sind die Links ueber der Buehne und die Tippflaechen inert
// (kein Fokus, kein Klick, nicht im Accessibility-Baum); die Pillen im Text-Panel sperrt ui.setInteractive.
// Pro Bild nur Zahlen vergleichen, ins DOM geschrieben wird nur bei Aenderung (keine Allokation pro Bild).

const NODES_MQ = '(min-width: 1024px) and (min-aspect-ratio: 17/20)';
const SHOW = [0.2, 0.32]; // Einblenden der Links im Beat cables (p)
const HIDE = [0, 0.035]; // Ausblenden im Beat dna (p), waehrend die Kamera Richtung Website-Knoten losfliegt
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class NodeLinks {
  /**
   * @param {object} o
   * @param {object} o.director  Director (Beat cables, Modul cables)
   * @param {object} o.cables    Instanz der Szene cables (screen, setHighlight)
   * @param {(section: Element, on: boolean) => void} [o.onRestore]  Tab-Reihenfolge im Panel neu setzen
   * @param {() => boolean} [o.alive]  false, wenn die Szene im Betrieb ausgefallen ist (Runner.fail)
   */
  constructor({ director, cables, onRestore = () => {}, alive = () => true }) {
    this.director = director;
    this.cables = cables;
    this.onRestore = onRestore;
    this.alive = alive;
    this.root = document.documentElement;
    this.nav = document.querySelector('[data-scene="cables"] .tool-links');
    this.ok = !!(this.nav && cables && cables.screen);
    if (!this.ok) return;
    this.section = this.nav.closest('.chapter');
    this.home = this.nav.parentNode;
    this.homeNext = this.nav.nextSibling;
    this.links = Array.from(this.nav.querySelectorAll('a[data-node]'));
    this.idx = this.links.map((a) => cables.screen.findIndex((s) => s.name === a.dataset.node));
    this.state = this.links.map(() => ({ x: -1, y: -1, o: -1, R: -1, on: null, left: null }));
    this.hitState = this.links.map(() => ({ x: -1, y: -1, o: -1, R: -1, on: null, left: null }));
    this.hiName = null;
    this.content = false;
    // Thema (Pruefung 2): im hellen Thema sind die Beschriftungen der Tippflaechen (Handy) kraeftiger, sonst wirkten sie
    // bei kleinen Knoten (Sichtbarkeit 0.4 bis 0.6) blass auf dem Off-White. Nur bei Wechsel gelesen, nicht pro Bild.
    this.light = this.root.getAttribute('data-theme') === 'hell';
    this._theme = () => {
      this.light = this.root.getAttribute('data-theme') === 'hell';
      for (const st of this.hitState) st.o = -1;
    };
    window.addEventListener('codani-theme', this._theme);

    // Tippflaechen fuer den Modus "pills" (nur Zeiger, kein Fokus, fuer Screenreader versteckt)
    this.hitLayer = document.createElement('div');
    this.hitLayer.className = 'node-hits';
    this.hitLayer.setAttribute('aria-hidden', 'true');
    this.hits = this.links.map((a) => {
      const h = document.createElement('a');
      h.href = a.getAttribute('href');
      h.tabIndex = -1;
      h.dataset.node = a.dataset.node;
      const ring = document.createElement('span');
      ring.className = 'tl-ring';
      const lab = document.createElement('span');
      lab.className = 'tl-label';
      lab.textContent = a.dataset.label || a.dataset.node;
      h.append(ring, lab);
      this.hitLayer.appendChild(h);
      return h;
    });
    this.section.appendChild(this.hitLayer);

    // Hervorheben beim Zeigen und bei Tastatur-Fokus
    this._on = (e) => this.highlight(e.currentTarget.dataset.node);
    this._off = (e) => { if (this.hiName === e.currentTarget.dataset.node) this.highlight(null); };
    for (const a of this.links) {
      a.addEventListener('pointerenter', this._on);
      a.addEventListener('focus', this._on);
      a.addEventListener('pointerleave', this._off);
      a.addEventListener('blur', this._off);
    }

    this.mq = window.matchMedia(NODES_MQ);
    this._mode = () => this.setMode(this.mq.matches ? 'nodes' : 'pills');
    if (this.mq.addEventListener) this.mq.addEventListener('change', this._mode);
    else this.mq.addListener(this._mode);
    this.mode = null;
    this._mode();
  }

  highlight(name) {
    this.hiName = name || null;
    this.cables.setHighlight(this.hiName);
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    const nodes = mode === 'nodes';
    this.root.classList.toggle('nodes-on', nodes);
    if (nodes) {
      // hinter das Panel: gleiche Lesereihenfolge (nach dem Kapiteltext), aber ohne Transform und Deckkraft des Panels
      this.section.insertBefore(this.nav, this.hitLayer);
      this.nav.classList.add('is-nodes');
      for (const st of this.state) { st.x = -1; st.o = -1; st.R = -1; st.on = null; st.left = null; }
      for (let i = 0; i < this.links.length; i++) this._hide(this.links[i], this.state[i]);
      this._measure();
    } else {
      this.nav.classList.remove('is-nodes');
      for (const a of this.links) {
        a.style.removeProperty('transform');
        a.style.removeProperty('opacity');
        a.style.removeProperty('--R');
        a.classList.remove('is-on', 'is-left');
        a.removeAttribute('tabindex');
      }
      this.home.insertBefore(this.nav, this.homeNext && this.homeNext.parentNode === this.home ? this.homeNext : null);
      this.onRestore(this.section, this.section.classList.contains('is-on'));
      this.highlight(null);
      this._measure();
    }
    for (let i = 0; i < this.hits.length; i++) this._hide(this.hits[i], this.hitState[i]);
    // Inert neu setzen (die Pillen im Panel nie inert, sie sperrt ui.setInteractive)
    const was = this._inert;
    this._inert = null;
    this._setInert(!!was);
  }

  /** Breite der Beschriftungen messen (Seitenwahl und Verdeckung in cables.js), je nach Modus Links oder Tippflaechen */
  _measure() {
    const run = () => {
      const nodes = this.mode === 'nodes';
      const els = nodes ? this.links : this.hits;
      for (let i = 0; i < els.length; i++) {
        const lab = els[i].querySelector('.tl-label');
        const k = this.idx[i];
        if (lab && k >= 0 && lab.offsetWidth) this.cables.screen[k].w = lab.offsetWidth;
      }
      // Breite mit Untertitel (beim Zeigen sichtbar): cables.js haelt damit Abstand zum Text-Panel
      if (nodes) {
        this.nav.classList.add('is-measure');
        for (let i = 0; i < els.length; i++) {
          const lab = els[i].querySelector('.tl-label');
          const k = this.idx[i];
          if (lab && k >= 0 && lab.offsetWidth) this.cables.screen[k].wf = lab.offsetWidth;
        }
        this.nav.classList.remove('is-measure');
      } else {
        for (let i = 0; i < els.length; i++) { const k = this.idx[i]; if (k >= 0) this.cables.screen[k].wf = 0; }
      }
    };
    run();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
  }

  setContent(on) { this.content = !!on; }

  /** Pro Bild nach runner.step() */
  update() {
    if (!this.ok) return;
    const d = this.director;
    const b = d.beat('cables');
    const m = d.module('cables');
    const dn = d.beat('dna');
    const past = this.content || (dn && d.global >= dn.start + (dn.end - dn.start) * HIDE[1]);
    let show = 0;
    if (!past && m && m.active && this.alive()) {
      show = ss(SHOW[0], SHOW[1], b.p);
      if (dn && d.global >= dn.start) show *= 1 - ss(HIDE[0], HIDE[1], dn.p);
    }
    this._setInert(past);
    const nodes = this.mode === 'nodes';
    const els = nodes ? this.links : this.hits;
    const sts = nodes ? this.state : this.hitState;
    for (let i = 0; i < els.length; i++) {
      const sc = this.cables.screen[this.idx[i]];
      const v = sc ? show * sc.vis : 0;
      if (v < 0.02) { this._hide(els[i], sts[i]); continue; }
      this._place(els[i], sts[i], sc, !nodes && this.light ? Math.min(1, v * 1.7) : v, nodes);
    }
  }

  /** Ab dem Kapitel Code (und im Inhaltsbereich): Links ueber der Buehne und Tippflaechen inert */
  _setInert(on) {
    if (on === this._inert) return;
    this._inert = on;
    const floating = this.mode === 'nodes';
    if (on && floating && this.nav.contains(document.activeElement)) document.activeElement.blur();
    this.nav.inert = on && floating;
    this.hitLayer.inert = on;
    if (on && this.hiName) this.highlight(null);
  }

  _place(a, st, sc, v, focusable) {
    const x = Math.round(sc.cx * 2) / 2;
    const y = Math.round(sc.cy * 2) / 2;
    if (x !== st.x || y !== st.y) {
      a.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      st.x = x;
      st.y = y;
    }
    const R = Math.round(Math.max(24, sc.r * 1.25));
    if (R !== st.R) { a.style.setProperty('--R', `${R}px`); st.R = R; }
    const left = sc.side < 0;
    if (left !== st.left) { a.classList.toggle('is-left', left); st.left = left; }
    const o = Math.round(v * 100) / 100;
    if (o !== st.o) { a.style.opacity = String(o); st.o = o; }
    const on = o > 0.35;
    if (on !== st.on) {
      a.classList.toggle('is-on', on);
      if (focusable) {
        if (on) a.removeAttribute('tabindex');
        else a.setAttribute('tabindex', '-1');
      }
      st.on = on;
    }
  }

  _hide(a, st) {
    if (st.o === 0 && st.on === false) return;
    a.style.opacity = '0';
    a.classList.remove('is-on');
    if (a.parentNode && a.closest('.tool-links')) a.setAttribute('tabindex', '-1');
    // Fokus nicht auf einem unsichtbaren Link lassen
    if (document.activeElement === a) a.blur();
    st.o = 0;
    st.on = false;
  }

  dispose() {
    if (!this.ok) return;
    window.removeEventListener('codani-theme', this._theme);
    if (this.mq.removeEventListener) this.mq.removeEventListener('change', this._mode);
    else this.mq.removeListener(this._mode);
    for (const a of this.links) {
      a.removeEventListener('pointerenter', this._on);
      a.removeEventListener('focus', this._on);
      a.removeEventListener('pointerleave', this._off);
      a.removeEventListener('blur', this._off);
    }
    this.setMode('pills');
    this.nav.inert = false;
    this.root.classList.remove('nodes-on');
    for (const a of this.links) a.removeAttribute('tabindex');
    this.hitLayer.remove();
    this.ok = false;
  }
}
