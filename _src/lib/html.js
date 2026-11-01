'use strict';
// Kleine Helfer fuer Vorlagen. Seiten sind Template-Strings, Komponenten sind Funktionen.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Text fuer HTML maskieren (Werte aus Einstellungen, Attribute). Eigene HTML-Texte nicht maskieren. */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
}

/** Attribute aus einem Objekt: { id: 'x', hidden: true, 'aria-label': 'y' } -> ' id="x" hidden aria-label="y"' */
function attrs(obj) {
  let out = '';
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === false || v === null || v === undefined || v === '') continue;
    out += v === true ? ` ${k}` : ` ${k}="${esc(v)}"`;
  }
  return out;
}

/** Klassen zusammensetzen, leere weglassen */
function cls(...names) {
  return names.flat().filter(Boolean).join(' ');
}

/** Teile zusammenfuegen, leere weglassen (false, null, undefined, '') */
function join(parts, sep = '\n') {
  return parts.flat(Infinity).filter((p) => p !== false && p !== null && p !== undefined && p !== '').join(sep);
}

/** Nur wenn die Bedingung stimmt */
function when(cond, str) {
  return cond ? (typeof str === 'function' ? str() : str) : '';
}

/** Kennung aus einem Text: "Wo liegen Ihre Daten?" -> "wo-liegen-ihre-daten" */
function slug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/é|è|ê/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

module.exports = { esc, attrs, cls, join, when, slug };
