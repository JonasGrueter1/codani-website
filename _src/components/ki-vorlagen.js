'use strict';
// Vorlagen der KI-Unterseiten: Werkzeug-Seite (V4-KONZEPT 2.3) und Branchen-Seite (2.4).
// Gehoert zur Gruppe KI-Seiten (siehe _src/README.md). Die Seiten in pages/ki-*.js und pages/branchen-*.js
// liefern nur ihre Inhalte, Aufbau und Reihenfolge stehen hier.

const { esc, join, when } = require('../lib/html');

const WERKZEUGE = [
  { key: 'e-mail', icon: 'mail', title: 'E-Mail', text: 'Antwortentwürfe liegen bereit, wenn Sie das Postfach öffnen.', href: 'ki/e-mail/' },
  { key: 'kalender', icon: 'kalender', title: 'Kalender', text: 'Terminwünsche erhalten Vorschläge aus Ihren freien Zeiten.', href: 'ki/kalender/' },
  { key: 'dokumente', icon: 'dokument', title: 'Dokumente', text: 'Angaben aus PDFs und Belegen landen in Ihrer Tabelle.', href: 'ki/dokumente/' },
  { key: 'kunden', icon: 'kunden', title: 'Kunden', text: 'Anfragen aus Telefon, Mail und WhatsApp in einer Liste.', href: 'ki/kunden/' },
  { key: 'website', icon: 'website', title: 'Website', text: 'Eine neue Website, die auf jedem Handy klar ist.', href: 'websites/' },
];

const BRANCHEN = [
  { key: 'handwerk', icon: 'werkzeug', title: 'Handwerk', text: 'Aus der Sprachnachricht von der Baustelle wird ein Offertentwurf.', href: 'branchen/handwerk/' },
  { key: 'treuhand', icon: 'rechner', title: 'Treuhand und Büro', text: 'Aus dem Beleg wird ein Buchungsvorschlag.', href: 'branchen/treuhand/' },
  { key: 'verwaltung', icon: 'haus', title: 'Verwaltung', text: 'Aus der Mieteranfrage wird ein Antwortentwurf.', href: 'branchen/verwaltung/' },
];

// Ehrliche Einstufung der Programme auf den Branchenseiten (programmeListe[].status)
const PROG_STATUS = {
  ja: 'Schnittstelle dokumentiert',
  partner: 'Schnittstelle über Ihren Partner',
  export: 'Austausch per Datei',
  offen: 'Keine offene Schnittstelle gefunden',
  ungeprueft: 'Noch nicht geprüft',
};

/** Werkzeug-Kacheln (ohne das aktuelle Werkzeug): kiWerkzeugKacheln({ ohne: 'e-mail', mitWebsite: true }) */
function kiWerkzeugKacheln(ctx, { ohne = '', mitWebsite = false, linkLabel = 'Ansehen' } = {}) {
  const items = WERKZEUGE.filter((w) => w.key !== ohne && (mitWebsite || w.key !== 'website'))
    .map((w) => ({ ...w, linkLabel }));
  return ctx.c.tiles(items, { cls: items.length === 3 ? 'cards--3' : '' });
}

/** Branchen-Karten (ohne die aktuelle Branche) */
function kiBranchenKarten(ctx, { ohne = '', cols } = {}) {
  const items = BRANCHEN.filter((b) => b.key !== ohne);
  return ctx.c.cards(items, { cols: cols || (items.length === 2 ? 2 : 3) });
}

/** Kurzer Absatz "Aufwand und Preis" mit kompakter Preisleiste */
function kiAufwand(ctx, text, { ids = ['ki-check', 'pilot', 'betrieb', 'nutzung'] } = {}) {
  return join([
    `<div class="grid grid--2 ki-aufwand">`,
    `<div><p class="t-lead">${ctx.t(text)}</p><p class="ki-aufwand__links">${ctx.c.more({ href: 'support/', label: 'Was bei einem Ausfall passiert' })}${ctx.site.pilotangebot && ctx.site.pilotangebot.plaetze ? ctx.c.more({ href: 'referenzen/#pilot', label: ctx.t('Angebot für die ersten {{pilot_plaetze}} Pilotbetriebe') }) : ''}</p></div>`,
    `<div>${ctx.c.priceStrip(ids)}</div>`,
    '</div>',
  ]);
}

/**
 * Beispielrechnung mit eigenen Zahlen, in Stunden und Franken, verglichen mit den Kosten (Preise aus site.json).
 * kiRechner({ id, label, periode: 'woche' | 'monat', zeilen: [{ name, titel, anzahl, heute, neu, step, neuLabel }], satz, annahme })
 * Logik: js/rechner.js (meta.js: ['rechner']), Stile: css/branchen.css. Ohne JS bleibt der Startwert stehen.
 */
function kiRechner(ctx, { id = 'rechner', label = 'Zeitersparnis berechnen', periode = 'woche', zeilen, satz = 60, annahme = '' } = {}) {
  const { chf, preisText } = require('../lib/format');
  const P = (k) => ctx.preis(k);
  const check = P('ki-check').betrag;
  const pilot = P('pilot').betrag;
  const betrieb = P('betrieb').betrag;
  const nutzung = P('nutzung');
  const einmal = check + pilot;
  const jahrMin = einmal + 12 * (betrieb + nutzung.von);
  const jahrMax = einmal + 12 * (betrieb + nutzung.bis);
  const r100 = (n) => Math.round(n / 100) * 100;
  const proPeriode = periode === 'monat' ? 'pro Monat' : 'pro Woche';
  const feld = (name, text, value, step, max) => `<label class="rechner__feld"><span>${text}</span><input type="number" name="${name}" min="0" max="${max}" step="${step}" value="${value}" inputmode="decimal"></label>`;
  const rows = zeilen.map((z, i) => join([
    `<fieldset class="rechner__zeile"><legend class="rechner__legend">${esc(z.titel)}</legend>`,
    '<div class="rechner__felder">',
    feld(`anzahl${i}`, `${esc(z.name)} ${proPeriode}`, z.anzahl, 1, 5000),
    feld(`heute${i}`, 'Minuten pro Stück heute', z.heute, z.step || 1, 600),
    feld(`neu${i}`, z.neuLabel || 'Minuten mit Entwurf der KI', z.neu, z.step || 1, 600),
    '</div></fieldset>',
  ])).join('\n');
  const kosten = ctx.t(`Kosten im ersten Jahr: rund ${chf(r100(jahrMin))} bis ${chf(r100(jahrMax)).replace('CHF ', '')} für KI-Check, Pilot ab {{preis_pilot_ab}} und 12 Monate Betrieb mit KI-Nutzung. Braucht es danach eine grössere Einführung, kommen ${preisText(P('einfuehrung'))} dazu.`);
  return join([
    `<form class="rechner" id="${esc(id)}" data-rechner data-reveal aria-label="${esc(label)}"`,
    ` data-periode="${periode}" data-einmal="${einmal}" data-monat="${betrieb + nutzung.bis}">`,
    rows,
    `<div class="rechner__felder rechner__felder--satz">${feld('satz', 'Kosten pro Stunde Ihres Teams in CHF (Lohn und Nebenkosten)', satz, 5, 500)}</div>`,
    '<div class="rechner__ergebnis" aria-live="polite">',
    '<p class="rechner__haupt">Gespart: <output name="zeit">rund 4 Stunden pro Woche</output><span class="rechner__jahr">, <output name="jahr">rund 190 Stunden im Jahr</output></span>.</p>',
    '<p class="rechner__chf">In Franken: <output name="chf">rund CHF 11’500 pro Jahr</output>.</p>',
    `<p class="rechner__kosten">${kosten}</p>`,
    '<p class="rechner__ab"><output name="ab">Ohne Einführung und mit den oberen laufenden Kosten gerechnet, wären KI-Check und Pilot nach rund 3 Monaten eingespielt.</output></p>',
    '</div>',
    `<p class="note rechner__note">${annahme} Grobe Rechnung: ${periode === 'monat' ? '12 Monate' : '46 Arbeitswochen'} im Jahr, die Testwochen im Pilot zählen schon voll. Ob die Minuten bei Ihnen stimmen, messen wir im Pilot.</p>`,
    '</form>',
  ]);
}

/**
 * Werkzeug-Seite (V4-KONZEPT 2.3). d: { key, crumb, eyebrow, title, lead, mockup (HTML des Haupt-Mockups),
 * heute, vorher: [], nachher: [{text, who}], demo: 'szene' (aus demo.json), beispiel (HTML, falls keine Demo),
 * programme: [], programmeText, grenzen, aufwand, extra: [{ id, tone, head, body }], branche: 'handwerk' }
 * Seiten mit Demo laden css/demo.css und js/demo.js, Mockups css/ki-mockups.css (meta.css, meta.js).
 */
function werkzeugSeite(ctx, d) {
  const c = ctx.c;
  const sections = [
    c.hero({
      variant: 'split',
      cls: 'hero--werkzeug',
      crumbs: [{ label: 'KI', href: 'ki/' }, { label: d.crumb }],
      eyebrow: d.eyebrow,
      title: d.title,
      lead: d.lead,
      buttons: [
        { href: `kontakt/?thema=${d.key}`, label: 'Dieses Beispiel besprechen' },
        { href: '#beispiel', label: 'Beispiel ausprobieren', variant: 'secondary' },
      ],
      media: d.mockup ? `<div class="mk-stage">${c.badge('beispiel')}${d.mockup}</div>` : c.placeholder(`Haupt-Mockup ${d.crumb}`, { ratio: '4 / 3', tone: 'soft' }),
    }),
    c.section({
      id: 'heute',
      head: { eyebrow: 'Das kennen Sie', title: d.heuteTitel || 'So läuft es heute.', intro: d.heute },
      body: c.beforeAfter({ before: d.vorher, after: d.nachher }),
    }),
    c.section({
      id: 'beispiel', tone: 'soft', width: 'wide',
      head: { eyebrow: 'Beispiel zum Ausprobieren', title: d.beispielTitel || 'Schritt für Schritt, mit erfundenen Daten.', intro: d.beispielIntro || 'Klicken Sie sich durch. Der Assistent zeigt, was die KI vorbereitet und wo Sie entscheiden.' },
      body: join([
        d.demo ? c.demoAssistent({ id: `demo-${d.key}`, szenen: [d.demo], link: { href: `kontakt/?thema=${d.key}`, label: 'Dieses Beispiel besprechen' } }) : join([c.badge('beispiel'), d.beispiel]),
        `<p class="sec__foot">${c.more({ href: 'ki/#demo', label: 'Weitere Beispiele im Demo-Assistenten' })}</p>`,
      ]),
    }),
    ...(d.extra || []).map((s) => c.section(s)),
    c.section({
      id: 'programme',
      head: { eyebrow: 'Programme', title: 'Passende Programme.', intro: d.programmeText || 'Sofern das Programm eine Schnittstelle bietet. Ob und wie, kläre ich im KI-Check.' },
      body: join([
        c.chips(d.programme, { label: 'Passende Programme', cls: 'chips--prog' }),
        '<div class="grid grid--2 sec__foot" id="grenzen">',
        c.info({ icon: 'uhr', tone: 'warm', title: 'Grenzen', text: d.grenzen }),
        c.datenschutzBox(),
        '</div>',
      ]),
    }),
    c.section({
      id: 'aufwand', tone: 'tint',
      head: { eyebrow: 'Aufwand und Preis', title: 'Klein anfangen, Nutzen messen.', intro: ctx.t(d.aufwand) },
      body: c.kiPfad(),
    }),
    c.section({
      id: 'weitere',
      head: { eyebrow: 'Weitere Werkzeuge', title: 'Was die KI sonst noch vorbereitet.' },
      body: join([
        kiWerkzeugKacheln(ctx, { ohne: d.key, mitWebsite: true }),
        `<p class="sec__foot ki-weiter">${c.more({ href: 'ki/', label: 'Zurück zur KI-Übersicht' })}${when(d.branche, () => c.more({ href: `branchen/${d.branche}/`, label: 'Passendes Beispiel aus einer Branche' }))}</p>`,
      ]),
    }),
    c.kontaktBlock({
      title: 'Passt das zu Ihrem Betrieb?',
      buttons: [
        { href: `kontakt/?thema=${d.key}`, label: 'Dieses Beispiel besprechen' },
        { href: 'kontakt/?thema=ki-check', label: 'KI-Check anfragen', variant: 'secondary' },
      ],
    }),
  ];
  return join(sections);
}

/**
 * Branchen-Seite. d: { key, crumb, eyebrow, title, lead, heute, hilft, media (Hero-Grafik), schritte: [{ title, text, alt, html, bild, sie }],
 * fussnote, rollen: [[ki, team]], hinweis: { title, text, icon }, programme: [], aufwand, abschluss: { title, text, buttons },
 * extra: [{ id, tone, head, body }] (nach der Aufgabenteilung), programmeListe: [{ name, weg, status }] (statt Chips, ehrlich
 * eingestuft, status siehe PROG_STATUS), programmeText (Einleitung), programmeQuellen: [[label, url]], programmeStand (Datum),
 * programmeCheck: true (Angebot: Programm kostenlos pruefen lassen) }
 */
function branchenSeite(ctx, d) {
  const c = ctx.c;
  // s.bild: fertiges Bild (HTML), s.sie: warm markierter Schritt (Standard: Schritt 4)
  const story = d.schritte.map((s, i) => join([
    `<li class="bilder__step${(s.sie !== undefined ? s.sie : i === 3) ? ' bilder__step--sie' : ''}" data-reveal>`,
    `<div class="bilder__bild" role="img" aria-label="${esc(s.alt)}">${s.bild || c.placeholder(`Bild ${i + 1}: ${s.alt}`, { ratio: '4 / 3', tone: i === 3 ? 'warm' : 'tint' })}</div>`,
    `<p class="bilder__nr">${i + 1} von ${d.schritte.length}</p>`,
    `<h3 class="t-h3 bilder__title">${s.title}</h3>`,
    when(s.text, () => `<p class="bilder__text">${s.text}</p>`),
    s.html || '',
    '</li>',
  ])).join('\n');
  const rollen = join([
    '<div class="tbl-wrap" data-reveal><table class="tbl rollen">',
    '<thead><tr><th scope="col">KI</th><th scope="col">Ihr Team</th></tr></thead>',
    `<tbody>${d.rollen.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody>`,
    '</table></div>',
  ]);
  return join([
    c.hero({
      variant: 'split',
      crumbs: [{ label: 'KI', href: 'ki/' }, { label: 'Branchen', href: 'branchen/' }, { label: d.crumb }],
      eyebrow: d.eyebrow,
      title: d.title,
      lead: d.lead,
      buttons: [{ href: `kontakt/?thema=${d.key}`, label: 'Beispiel für meinen Betrieb besprechen' }],
      media: d.media || c.placeholder(`Hero ${d.crumb}: Eingang und Ergebnis, mit Kabel-Linie verbunden`, { ratio: '4 / 3', tone: 'soft' }),
    }),
    c.section({
      id: 'heute',
      head: { eyebrow: 'Heute', title: d.heuteTitel || 'So läuft es heute.' },
      body: join([`<p class="t-lead" data-reveal>${d.heute}</p>`, when(d.hilft, () => `<p class="t-lead" data-reveal>${d.hilft}</p>`)]),
    }),
    c.section({
      id: 'beispiel', tone: 'soft', width: 'wide',
      head: { eyebrow: 'Beispiel in Bildern', title: d.beispielTitel || 'Schritt für Schritt.' },
      body: join([
        c.badge('beispiel'),
        `<ol class="bilder" tabindex="0" aria-label="Beispiel in ${d.schritte.length} Bildern">${story}</ol>`,
        when(d.fussnote, () => `<p class="note">${d.fussnote}</p>`),
      ]),
    }),
    c.section({
      id: 'rollen',
      head: { eyebrow: 'Aufgabenteilung', title: 'Was die KI macht, was Ihr Team macht.' },
      body: join([
        rollen,
        `<div class="sec__foot">${c.principle('Die KI bereitet vor. Sie entscheiden.', { sub: d.grundsatz || '' })}</div>`,
      ]),
    }),
    ...(d.extra || []).map((x) => c.section(x)),
    c.section({
      id: 'hinweise', tone: 'soft',
      label: 'Hinweise und Datenschutz',
      body: join([
        '<div class="grid grid--2">',
        c.info({ icon: d.hinweis.icon || 'schild', tone: 'warm', title: d.hinweis.title, text: d.hinweis.text }),
        c.datenschutzBox(),
        '</div>',
      ]),
    }),
    c.section({
      id: 'programme',
      head: { eyebrow: 'Programme', title: 'Typische Programme.', intro: d.programmeText || 'Sofern das Programm eine Schnittstelle bietet. Ob und wie, kläre ich im KI-Check.' },
      body: d.programmeListe
        ? join([
          `<dl class="prog" data-reveal>${d.programmeListe.map((x) => `<div class="prog__item"><dt>${x.name}${when(x.status && PROG_STATUS[x.status], () => `<span class="prog__status prog__status--${x.status}">${PROG_STATUS[x.status]}</span>`)}</dt><dd>${x.weg}</dd></div>`).join('')}</dl>`,
          when(d.programmeQuellen, () => `<p class="note prog__quellen">${d.programmeStand ? `Öffentliche Angaben der Hersteller, geprüft am ${d.programmeStand}. ` : ''}Quellen: ${d.programmeQuellen.map(([l, h]) => `<a class="text-link" href="${esc(h)}" target="_blank" rel="noopener">${l}<span class="sr"> (öffnet eine externe Seite)</span></a>`).join(', ')}.</p>`),
          when(d.programmeCheck, () => c.info({ icon: 'stecker', tone: 'tint', title: 'Ihr Programm fehlt?', text: ctx.t('Schicken Sie mir den Namen und wenn möglich die Version. Ich prüfe kostenlos, was der Hersteller zu Schnittstellen und Import veröffentlicht, und schreibe Ihnen {{reaktionszeit}}, was ich gefunden habe. Wo nötig, frage ich beim Hersteller nach.'), link: { href: 'kontakt/?thema=programm', label: 'Programm prüfen lassen' } })),
        ])
        : c.chips(d.programme, { label: 'Typische Programme' }),
    }),
    c.section({
      id: 'aufwand', tone: 'tint',
      head: { eyebrow: 'Einstieg und Preis', title: 'Klein anfangen, Nutzen messen.' },
      body: kiAufwand(ctx, d.aufwand),
    }),
    c.section({
      id: 'andere',
      head: { eyebrow: 'Andere Branchen', title: 'Weitere Beispiele.' },
      body: kiBranchenKarten(ctx, { ohne: d.key }),
    }),
    c.ctaBand(d.abschluss),
  ]);
}

module.exports = { kiWerkzeugKacheln, kiBranchenKarten, kiAufwand, kiRechner, werkzeugSeite, branchenSeite, KI_WERKZEUGE: WERKZEUGE, KI_BRANCHEN: BRANCHEN };
