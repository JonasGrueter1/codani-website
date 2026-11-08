'use strict';
// Suchindex der Website (08.11.2026). Wird beim Build aus den fertigen Seiten erzeugt und als assets/suche.json
// geschrieben. Die Suche selbst laeuft im Browser (js/suche.js, js/suche-kern.js), ohne fremden Dienst.
//
// Pro Seite entstehen Eintraege ("docs"):
//   seite      Titel, Beschreibung, Einstieg (Text vor dem ersten Abschnitt mit id)
//   abschnitt  jede <section id="..."> mit Ueberschrift, Unterueberschriften und Text
//   frage      jede <details id="..."> (FAQ) mit Frage und Antwort
// Dazu kommen aus _src/data/suche.json: Synonyme, Wendungen, eigene Fragen pro Ziel und Vorschlaege.
// Ziele in suche.json, die es nicht mehr gibt, sind ein Build-Fehler (sonst laeuft die Suche ins Leere).

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const SKIP = new Set(['script', 'style', 'svg', 'template', 'noscript', 'canvas', 'button', 'select', 'textarea', 'form']);
const BLOCK = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'section', 'article', 'header', 'footer', 'details', 'summary', 'td', 'th', 'tr', 'dd', 'dt', 'figcaption', 'blockquote', 'ul', 'ol', 'dl', 'table', 'aside', 'figure']);

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', bdquo: '„', ldquo: '“', rdquo: '”', middot: '·', times: '×', euro: '€' };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    const v = ENT[e.toLowerCase()];
    return v == null ? m : v;
  });
}
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`)); return m ? decode(m[1]) : null; };
const clean = (s) => s.replace(/[ \t\r\f\v ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();

/** Zerlegt eine fertige Seite in Eintraege. html: ganze Seite, pfad: '' | 'ki/' | ... */
function zerlege(html, pfad) {
  const title = decode((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim();
  const desc = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '').trim();
  const mainM = html.match(/<main[^>]*>([\s\S]*)<\/main>/);
  const main = mainM ? mainM[1] : '';

  const seite = { k: 'seite', u: pfad, t: '', h: [], x: '', d: desc, titel: title };
  const docs = [seite];
  const stack = []; // offene Elemente: { tag, skip, doc }
  let skipDepth = 0;
  const secStack = []; // offene Abschnitte mit id
  let faq = null; // offene Frage
  let inSummary = false;
  let heading = null; // { level, text }

  const cur = () => faq || (secStack.length ? secStack[secStack.length - 1] : seite);
  const push = (doc, text) => { if (doc) doc.x += text; };

  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(main))) {
    if (m[4] != null) {
      if (skipDepth) continue;
      const text = decode(m[4]);
      if (heading) { heading.text += text; continue; }
      if (inSummary && faq) { faq.t += text; continue; }
      push(cur(), text);
      continue;
    }
    const close = m[1] === '/';
    const tag = m[2].toLowerCase();
    const rest = m[3];
    if (!close) {
      if (VOID.has(tag) || rest.endsWith('/')) { if (tag === 'br' && !skipDepth) push(cur(), '\n'); continue; }
      const hidden = /\saria-hidden="true"/.test(rest) || /\shidden(\s|$|=)/.test(rest) || /\sdata-suche="aus"/.test(rest);
      const skip = SKIP.has(tag) || hidden;
      const entry = { tag, skip, sec: null, faq: null, heading: false };
      stack.push(entry);
      if (skip) { skipDepth += 1; continue; }
      if (skipDepth) continue;
      if (BLOCK.has(tag)) push(cur(), '\n');
      if (tag === 'section') {
        const id = attr(rest, 'id');
        if (id) {
          const doc = { k: 'abschnitt', u: pfad + '#' + id, t: '', h: [], x: '' };
          docs.push(doc); secStack.push(doc); entry.sec = doc;
        }
      } else if (tag === 'details') {
        const id = attr(rest, 'id');
        if (id) {
          const sec = secStack.length ? secStack[secStack.length - 1] : null;
          faq = { k: 'frage', u: pfad + '#' + id, t: '', h: [], x: '', ctx: sec };
          docs.push(faq); entry.faq = faq;
        }
      } else if (tag === 'summary') {
        inSummary = true;
      } else if (/^h[1-4]$/.test(tag)) {
        heading = { level: Number(tag[1]), text: '' };
        entry.heading = true;
      }
      continue;
    }
    // schliessendes Tag: bis zum passenden oeffnenden zurueck
    let i = stack.length - 1;
    while (i >= 0 && stack[i].tag !== tag) i -= 1;
    if (i < 0) continue;
    const closing = stack.splice(i);
    for (let j = closing.length - 1; j >= 0; j -= 1) {
      const e = closing[j];
      if (e.skip) { skipDepth -= 1; continue; }
      if (e.heading && heading) {
        const text = clean(heading.text);
        const doc = cur();
        if (text) {
          if (heading.level === 1 && !seite.t) seite.t = text;
          else if (doc !== seite && !doc.t && doc.k === 'abschnitt') doc.t = text;
          else if (doc === seite && heading.level <= 2 && !seite.t) seite.t = text;
          else doc.h.push(text);
          push(doc, '\n' + text + '\n');
        }
        heading = null;
      }
      if (e.tag === 'summary') { inSummary = false; if (faq) faq.t = clean(faq.t); }
      if (e.faq) faq = null;
      if (e.sec) { const k = secStack.indexOf(e.sec); if (k >= 0) secStack.splice(k, 1); }
      if (BLOCK.has(e.tag)) push(cur(), '\n');
    }
  }
  for (const doc of docs) { doc.x = clean(doc.x); doc.t = clean(doc.t); }
  return docs;
}

/** Index fuer alle Seiten. pages: [{ path, html, name }], cfg: data/suche.json. err(where, msg) meldet Fehler. */
function baue(pages, cfg, err) {
  const docs = [];
  for (const p of pages) {
    const teile = zerlege(p.html, p.path);
    const seitenName = p.name;
    for (const d of teile) {
      const out = { k: d.k, u: d.u, p: seitenName, t: d.t || seitenName, x: d.x };
      if (d.k === 'seite') {
        out.t = d.t || seitenName;
        out.x = clean([d.d, d.x].filter(Boolean).join('\n'));
      }
      if (d.h && d.h.length) out.h = d.h.join(' · ');
      if (d.k === 'frage' && d.ctx && d.ctx.t) out.c = d.ctx.t;
      // leere Abschnitte (nur Bild, nur Knopf) weglassen
      if (d.k !== 'seite' && out.x.length < 20 && !out.h) continue;
      docs.push(out);
    }
  }
  // Abschnitt ohne eigene Ueberschrift: Seitenname als Titel
  for (const d of docs) if (!d.t) d.t = d.p;

  // eigene Fragen und Stichwoerter pro Ziel
  const byUrl = new Map(docs.map((d, i) => [d.u, i]));
  for (const [ziel, liste] of Object.entries(cfg.fragen || {})) {
    if (!byUrl.has(ziel)) { err('data/suche.json', `Ziel "${ziel}" gibt es nicht (mehr) im Index`); continue; }
    const d = docs[byUrl.get(ziel)];
    d.q = (d.q ? d.q + ' | ' : '') + liste.join(' | ');
  }
  for (const v of [...(cfg.vorschlaege || []), ...(cfg.schnell || [])]) {
    if (v.ziel && !byUrl.has(v.ziel)) err('data/suche.json', `Eintrag "${v.text}": Ziel "${v.ziel}" fehlt`);
  }
  // Gewicht pro Seite (Impressum und Rechtliches leiser)
  for (const d of docs) {
    for (const [prefix, g] of Object.entries(cfg.gewichte || {})) if (d.u.startsWith(prefix)) d.g = g;
  }
  return {
    v: 1,
    docs,
    syn: cfg.synonyme || [],
    stopp: cfg.stoppwoerter || [],
    vorschlaege: cfg.vorschlaege || [],
    schnell: cfg.schnell || [],
    leise: cfg.leise || [],
  };
}

module.exports = { zerlege, baue };
