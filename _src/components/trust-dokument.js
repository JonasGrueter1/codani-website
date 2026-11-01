'use strict';
// Muster-Dokumente zum Ansehen, Drucken und als PDF (Seiten unterlagen/*). Gruppe: Vertrauens-Seiten.
// Ein Dokument ist ein Blatt mit Kopf, Parteien, nummerierten Abschnitten, optionalem Anhang und Unterschriften.
// Druck und PDF: css/vertrauen.css (@media print zeigt nur #dokument). PDF erzeugen: node studio/_src/unterlagen-pdf.js

const { esc, join, when } = require('../lib/html');

const LINIE = '<span class="doc__linie" aria-hidden="true"></span>';

/** Unterschriften: Auftraggeber, Auftragnehmer, gesetzliche Vertretung (Jonas ist minderjaehrig) */
function trustUnterschriften(ctx, { kunde = 'Auftraggeber', ich = 'Auftragnehmer' } = {}) {
  const feld = (label, name = '') => `<p class="doc__feld"><span class="doc__feldname">${label}</span>${name ? `<span class="doc__wert">${name}</span>` : LINIE}</p>`;
  const spalte = (titel, name) => join([
    '<div class="doc__sign">',
    `<p class="doc__signtitel">${titel}</p>`,
    feld('Ort, Datum'),
    feld('Name', name),
    feld('Unterschrift'),
    '</div>',
  ]);
  return join([
    '<div class="doc__signs">',
    spalte(kunde),
    spalte(ich, esc(ctx.site.person.name)),
    spalte('Einverständnis der gesetzlichen Vertretung (Eltern)'),
    '</div>',
  ]);
}

/**
 * Dokument. d: { titel, art (z. B. 'Muster'), stand, einleitung, parteien: [[rolle, html]], abschnitte: [[titel, html]],
 * anhang: { titel, html }, unterschriften: { kunde } }
 */
function trustDokument(ctx, d) {
  return join([
    '<article class="doc" aria-labelledby="doc-titel">',
    '<header class="doc__kopf">',
    `<p class="doc__marke"><span class="mark" aria-hidden="true"></span>${esc(ctx.site.marke.name)}</p>`,
    `<p class="doc__stand">${esc(d.art || 'Muster')}, Stand ${esc(d.stand)}</p>`,
    '</header>',
    `<h2 class="doc__titel" id="doc-titel">${d.titel}</h2>`,
    when(d.einleitung, () => `<p class="doc__einleitung">${d.einleitung}</p>`),
    when(d.parteien, () => `<dl class="doc__parteien">${d.parteien.map(([rolle, html]) => `<div><dt>${rolle}</dt><dd>${html}</dd></div>`).join('')}</dl>`),
    `<ol class="doc__abschnitte">${d.abschnitte.map(([titel, html]) => `<li><h3 class="doc__h">${titel}</h3>${/^\s*</.test(html) ? html : `<p>${html}</p>`}</li>`).join('\n')}</ol>`,
    when(d.anhang, () => `<section class="doc__anhang" aria-labelledby="doc-anhang"><h3 class="doc__h" id="doc-anhang">${d.anhang.titel}</h3>${d.anhang.html}</section>`),
    when(d.unterschriften, () => trustUnterschriften(ctx, d.unterschriften)),
    '</article>',
  ]);
}

/** Leere Zeile zum Ausfuellen, mit sichtbarer Beschriftung fuer Screenreader */
function trustLuecke(ctx, label = 'auszufüllen') {
  return `<span class="doc__luecke"><span class="sr">${esc(label)}</span></span>`;
}

module.exports = { trustDokument, trustUnterschriften, trustLuecke };
