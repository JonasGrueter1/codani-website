'use strict';
// Bilder der Branchen-Seiten (V4-KONZEPT 2.4): je ein Hero (Handy als Eingang, Dokument als Ergebnis, mit Kabel-Linie
// verbunden) und fuenf Bilder der Bildergeschichte. In HTML und CSS gebaut, keine Fotos, keine fremden Oberflaechen.
// Alle Namen, Adressen und Betraege sind erfunden (Muster, Beispiel) und als Beispiel gekennzeichnet (beispiel).
// Stile: css/branchen.css. Gruppe: Vertrauens-Seiten (Branchen-Bilder).

const { esc, cls, join } = require('../lib/html');

/* ------------------------------------------------------------------ Kleinteile */

const chip = (text, kind = '') => `<span class="${cls('bb-chip', kind && `bb-chip--${kind}`)}">${text}</span>`;
const btn = (text, ghost) => `<span class="${cls('bb-btn', ghost && 'bb-btn--ghost')}">${text}</span>`;

/** Wellenform einer Sprachnachricht (feste Werte, keine Zufallszahlen) */
function wave(n = 26) {
  const h = [30, 55, 40, 70, 90, 60, 45, 80, 100, 65, 40, 55, 85, 70, 50, 35, 60, 95, 75, 45, 30, 50, 70, 40, 25, 35, 55, 30];
  return `<span class="bb-wave">${h.slice(0, n).map((x, i) => `<i style="--h:${x}%"${i < 9 ? ' class="is-played"' : ''}></i>`).join('')}</span>`;
}

/** Handy-Rahmen mit Inhalt */
const phone = (body, { c = '' } = {}) => `<div class="${cls('bb-phone', c)}"><div class="bb-phone__screen">${body}</div></div>`;

/** Papier (Dokument) mit Kopfzeile */
const paper = (head, body, { c = '' } = {}) => `<div class="${cls('bb-paper', c)}"><p class="bb-paper__head">${head}</p>${body}</div>`;

/** Kabel-Linie mit Lichtpunkt und Chip "KI" in der Mitte */
function cable() {
  const d = 'M2 70 C 40 70, 60 30, 98 30';
  return join([
    '<div class="bb-cable">',
    '<svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false" aria-hidden="true">',
    `<path class="bb-cable__line" d="${d}" vector-effect="non-scaling-stroke"/>`,
    `<path class="bb-cable__pulse" d="${d}" pathLength="100" vector-effect="non-scaling-stroke"/>`,
    '</svg>',
    chip('KI', 'ki'),
    '</div>',
  ]);
}

/** Rahmen eines Bildes der Bildergeschichte */
const frame = (body, { tone = 'tint', c = '' } = {}) => `<div class="${cls('bb', `bb--${tone}`, c)}">${body}</div>`;

/** Zeile Bezeichnung und Wert */
const row = (k, v, { c = '' } = {}) => `<p class="${cls('bb-row', c)}"><span>${k}</span><span>${v}</span></p>`;

/* ------------------------------------------------------------------ Handwerk: Sprachnachricht wird Offerte */

const handwerk = {
  hero: (ctx) => join([
    phone(join([
      '<p class="bb-phone__top">Sprachnachricht, Besichtigung</p>',
      `<div class="bb-voice"><span class="bb-voice__play">${ctx.c.icon('play')}</span>${wave(22)}<span class="bb-voice__t">0:58</span></div>`,
      '<p class="bb-bubble">Bin bei Familie Muster, Einbauschrank, zwei Meter vierzig breit …</p>',
    ])),
    cable(),
    paper('Offerte, Entwurf', join([
      row('Einbauschrank nach Mass', 'CHF 4’850.00'), // beispiel
      row('Demontage Altschrank', 'CHF 380.00'), // beispiel
      row('Montage, 6 Std.', 'CHF 570.00'), // beispiel
      row('Total inkl. MWST', 'CHF 6’269.80', { c: 'bb-row--total' }), // beispiel
      `<p class="bb-paper__foot">${chip('2 offene Punkte', 'warn')}${chip('Sie prüfen', 'sie')}</p>`,
    ]), { c: 'bb-paper--hero' }),
  ]),
  bilder: [
    (ctx) => frame(phone(join([
      '<p class="bb-phone__top">Familie Muster, Musterweg 4</p>',
      `<div class="bb-voice"><span class="bb-voice__play">${ctx.c.icon('play')}</span>${wave(20)}<span class="bb-voice__t">0:58</span></div>`,
      `<p class="bb-bubble bb-bubble--small"><b>Abschrift</b> Im Gang ein Einbauschrank, zwei Meter vierzig breit, raumhoch …</p>`,
    ]), { c: 'bb-phone--solo' }), { c: 'bb--phone' }),
    () => frame(`<div class="bb-card">${join([
      `<p class="bb-card__title">${chip('KI', 'ki')} Erkannt</p>`,
      `<p class="bb-tags">${chip('Einbauschrank 240 x 260 x 60 cm')}${chip('2 Drehtüren, 2 Schubladen')}${chip('Front weiss lackiert')}${chip('Demontage Altschrank')}${chip('Montage')}</p>`,
      `<p class="bb-card__sub">Offen</p>`,
      `<p class="bb-tags">${chip('Griffe?', 'warn')}${chip('Innenausstattung?', 'warn')}</p>`,
    ])}</div>`),
    () => frame(paper('Offerte 2026-041, Entwurf', join([
      row('1 Einbauschrank nach Mass', '4’850.00'), // beispiel
      row('2 Demontage und Entsorgung', '380.00'), // beispiel
      row('3 Montage, 6 Std. à 95.00', '570.00'), // beispiel
      row('Zwischentotal', '5’800.00', { c: 'bb-row--sub' }), // beispiel
      row('MWST 8.1 %', '469.80'), // beispiel
      row('Total CHF', '6’269.80', { c: 'bb-row--total' }), // beispiel
    ]), { c: 'bb-paper--wide' })),
    () => frame(paper('Offerte 2026-041, Entwurf', join([
      row('1 Einbauschrank nach Mass', '4’850.00'), // beispiel
      '<p class="bb-flag">Griffe nicht erwähnt: Modell wählen</p>',
      '<p class="bb-flag">Innenausstattung: Tablare oder Kleiderstange?</p>',
      '<p class="bb-flag">Vor Weihnachten: Kapazität prüfen</p>',
      `<p class="bb-paper__foot">${chip('Sie ergänzen', 'sie')}</p>`,
    ]), { c: 'bb-paper--wide' })),
    () => frame(`<div class="bb-card bb-card--decide">${join([
      '<p class="bb-card__title">Offerte 2026-041 an Familie Muster</p>',
      row('Positionen', '3'),
      row('Offene Punkte', 'ergänzt'),
      row('Status', 'wartet auf Ihre Freigabe', { c: 'bb-row--status' }),
      `<p class="bb-actions">${btn('Prüfen', true)}${btn('Senden')}</p>`,
      '<p class="bb-note">Ohne Ihre Freigabe geht nichts hinaus.</p>',
    ])}</div>`, { tone: 'warm' }),
  ],
  alt: 'Beispiel mit erfundenen Daten: Links ein Handy mit einer Sprachnachricht von der Baustelle, 58 Sekunden. Eine Linie mit der Markierung KI führt zu einem Offertentwurf mit drei Positionen und Total. Zwei Punkte sind offen, Sie prüfen.',
};

/* ------------------------------------------------------------------ Treuhand: Beleg wird Buchungsvorschlag */

const treuhand = {
  hero: (ctx) => join([
    phone(join([
      '<p class="bb-phone__top">Posteingang Belege</p>',
      `<div class="bb-mailitem is-sel"><b>Bürobedarf Beispiel</b><span>Rechnung 2026-118</span><span class="bb-file">${ctx.c.icon('dokument')}Rechnung.pdf</span></div>`,
      '<div class="bb-mailitem"><b>Beleg vom Handy</b><span>Foto, Quittung</span></div>',
    ])),
    cable(),
    paper('Buchungsvorschlag', join([
      row('6500 Büromaterial', '230.02'), // beispiel
      row('1171 Vorsteuer MWST', '18.63'), // beispiel
      row('an 2000 Kreditoren', '248.65', { c: 'bb-row--total' }), // beispiel
      `<p class="bb-paper__foot">${chip('Kein Sonderfall', 'ok')}${chip('Fachperson bucht', 'sie')}</p>`,
    ]), { c: 'bb-paper--hero' }),
  ]),
  bilder: [
    (ctx) => frame(paper(`${ctx.c.icon('dokument')} Rechnung.pdf`, join([
      '<p class="bb-inv__firm">Bürobedarf Beispiel</p>',
      '<p class="bb-inv__title">Rechnung 2026-118</p>',
      row('Datum', '14.10.2026'),
      row('Druckerpapier, Toner', ''),
      row('Total inkl. 8.1 % MWST', 'CHF 248.65', { c: 'bb-row--total' }), // beispiel
      '<p class="bb-inv__small">zahlbar innert 30 Tagen</p>',
    ]), { c: 'bb-paper--inv' })),
    () => frame(`<div class="bb-card">${join([
      `<p class="bb-card__title">${chip('KI', 'ki')} Ausgelesen</p>`,
      row('Lieferant', 'Bürobedarf Beispiel', { c: 'bb-row--ok' }),
      row('Datum', '14.10.2026', { c: 'bb-row--ok' }),
      row('Netto', 'CHF 230.02', { c: 'bb-row--ok' }), // beispiel
      row('MWST 8.1 %', 'CHF 18.63', { c: 'bb-row--ok' }), // beispiel
      row('Total', 'CHF 248.65', { c: 'bb-row--ok' }), // beispiel
      row('Fällig', '13.11.2026', { c: 'bb-row--ok' }),
    ])}</div>`),
    () => frame(`<div class="bb-card">${join([
      `<p class="bb-card__title">${chip('KI', 'ki')} Buchungsvorschlag</p>`,
      '<div class="bb-book"><span>Soll</span><span>Haben</span><span>Betrag</span>',
      '<span>6500 Büromaterial</span><span>2000 Kreditoren</span><span>230.02</span>', // beispiel
      '<span>1171 Vorsteuer</span><span>2000 Kreditoren</span><span>18.63</span></div>', // beispiel
      '<p class="bb-why">Gleicher Lieferant fünfmal auf 6500 gebucht. Betrag im üblichen Rahmen.</p>',
    ])}</div>`),
    () => frame(`<div class="bb-card">${join([
      '<p class="bb-card__title">Prüfung auf Sonderfälle</p>',
      row('Lieferant bekannt', 'ja', { c: 'bb-row--ok' }),
      row('Betrag im üblichen Rahmen', 'ja', { c: 'bb-row--ok' }),
      row('MWST-Satz passt', 'ja', { c: 'bb-row--ok' }),
      `<p class="bb-result">${chip('Kein Sonderfall erkannt', 'ok')}</p>`,
      '<p class="bb-flag">Anderer Beleg: neuer Lieferant, zur genauen Prüfung markiert</p>',
    ])}</div>`),
    () => frame(`<div class="bb-card bb-card--decide">${join([
      '<p class="bb-card__title">Beleg 2026-118, Bürobedarf Beispiel</p>',
      row('Vorschlag', '6500 / 1171'),
      row('Betrag', 'CHF 248.65'), // beispiel
      row('Status', 'wartet auf die Fachperson', { c: 'bb-row--status' }),
      `<p class="bb-actions">${btn('Ändern', true)}${btn('Buchen')}</p>`,
      '<p class="bb-note">Ohne Freigabe wird nichts gebucht.</p>',
    ])}</div>`, { tone: 'warm' }),
  ],
  alt: 'Beispiel mit erfundenen Daten: Links ein Handy mit einer Rechnung als PDF im Posteingang. Eine Linie mit der Markierung KI führt zu einem Buchungsvorschlag: Büromaterial und Vorsteuer an Kreditoren, total CHF 248.65. Kein Sonderfall, die Fachperson bucht.',
};

/* ------------------------------------------------------------------ Verwaltung: Mieteranfrage wird Antwortentwurf */

const verwaltung = {
  hero: () => join([
    phone(join([
      '<p class="bb-phone__top">Neue Anfrage</p>',
      '<p class="bb-bubble">Gibt es noch einen freien Platz in der Einstellhalle? Und darf ich am Sonntag waschen?</p>',
      '<p class="bb-bubble bb-bubble--meta">Marco Beispiel, Musterweg 4</p>',
    ])),
    cable(),
    paper('Antwortentwurf', join([
      '<p class="bb-line">Platz 14 ist ab 1. Dezember frei <sup>1</sup></p>',
      '<p class="bb-line">Waschküche sonntags geschlossen <sup>2</sup></p>',
      '<p class="bb-src"><span>1 Parkplatzliste</span><span>2 Hausordnung</span></p>',
      `<p class="bb-paper__foot">${chip('Dringlichkeit tief')}${chip('Team gibt frei', 'sie')}</p>`,
    ]), { c: 'bb-paper--hero' }),
  ]),
  bilder: [
    (ctx) => frame(`<div class="bb-card bb-card--inbox">${join([
      `<p class="bb-card__title">${ctx.c.icon('mail')} Posteingang</p>`,
      '<div class="bb-mailitem is-sel"><b>Marco Beispiel</b><span>Einstellhalle und Waschküche</span><span class="bb-mailitem__pre">Gibt es noch einen freien Platz …</span></div>',
      '<div class="bb-mailitem"><b>Sara Muster</b><span>Schlüssel bestellen</span></div>',
      '<div class="bb-mailitem"><b>Nico Beispiel</b><span>Frage zu den Nebenkosten</span></div>',
    ])}</div>`),
    () => frame(`<div class="bb-card">${join([
      `<p class="bb-card__title">${chip('KI', 'ki')} Zugeordnet</p>`,
      row('Mieter', 'Marco Beispiel'),
      row('Objekt', 'Musterweg 4, Wohnung 1.2'),
      `<p class="bb-tags">${chip('Parkplatz')}${chip('Waschküche')}</p>`,
      row('Dringlichkeit', 'tief'),
    ])}</div>`),
    (ctx) => frame(`<div class="bb-sources">${join([
      `<div class="bb-source"><p class="bb-source__file">${ctx.c.icon('liste')} Parkplatzliste</p><p><mark>Platz 14: frei ab 1.12.</mark></p><p><mark>CHF 120 pro Monat</mark></p></div>`, // beispiel
      `<div class="bb-source"><p class="bb-source__file">${ctx.c.icon('dokument')} Hausordnung</p><p>Abschnitt 5</p><p><mark>Sonn- und Feiertage: Waschküche geschlossen</mark></p></div>`,
    ])}</div>`),
    () => frame(paper('Antwortentwurf an Marco Beispiel', join([
      '<p class="bb-line">In der Einstellhalle ist Platz 14 ab 1. Dezember frei, die Miete beträgt CHF 120 pro Monat. <sup>1</sup></p>', // beispiel
      '<p class="bb-line">Die Waschküche ist an Sonn- und Feiertagen geschlossen. <sup>2</sup></p>',
      '<p class="bb-src"><span>1 Parkplatzliste</span><span>2 Hausordnung, Abschnitt 5</span></p>',
    ]), { c: 'bb-paper--wide' })),
    () => frame(`<div class="bb-card bb-card--decide">${join([
      '<p class="bb-card__title">Anfragen, heute</p>',
      `<p class="bb-listrow bb-listrow--hoch"><span>Wasserschaden, Musterweg 8</span>${chip('hoch', 'warn')}</p>`,
      `<p class="bb-listrow is-sel"><span>Marco Beispiel, Parkplatz</span>${chip('Entwurf bereit', 'ki')}</p>`,
      `<p class="bb-actions">${btn('Ändern', true)}${btn('Freigeben')}</p>`,
      '<p class="bb-note">Ihr Team prüft und sendet.</p>',
    ])}</div>`, { tone: 'warm' }),
  ],
  alt: 'Beispiel mit erfundenen Daten: Links ein Handy mit der Anfrage eines Mieters nach einem Parkplatz und der Waschküche. Eine Linie mit der Markierung KI führt zu einem Antwortentwurf mit zwei Angaben und ihren Quellen, Parkplatzliste und Hausordnung. Ihr Team gibt ihn frei.',
};

const BRANCHEN = { handwerk, treuhand, verwaltung };

/** Hero-Grafik einer Branche: branchenHero('handwerk') */
function branchenHero(ctx, key) {
  const b = BRANCHEN[key];
  if (!b) throw new Error(`branchenHero: unbekannte Branche "${key}"`);
  return join([
    `<div class="bb-hero" role="img" aria-label="${esc(b.alt)}">`,
    `<div class="bb-hero__in" aria-hidden="true">${b.hero(ctx)}</div>`,
    '</div>',
  ]);
}

/** Bild n (1 bis 5) der Bildergeschichte einer Branche: branchenBild('handwerk', 1) */
function branchenBild(ctx, key, n) {
  const b = BRANCHEN[key];
  const f = b && b.bilder[n - 1];
  if (!f) throw new Error(`branchenBild: Bild ${n} fuer "${key}" fehlt`);
  return f(ctx);
}

module.exports = { branchenHero, branchenBild };
