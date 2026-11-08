'use strict';
// Werkzeug Dokumente (V4-TEXTE 8). Gruppe: KI-Seiten.

exports.meta = {
  path: 'ki/dokumente/',
  nav: 'ki',
  css: ['ki', 'ki-mockups', 'demo'],
  js: ['demo'],
  title: 'KI für Dokumente: Daten aus PDFs | {{marke}}',
  description: 'Die KI liest Angaben aus PDFs, Lieferscheinen und Belegen aus und überträgt sie in Ihre Tabelle. Dazu Antworten aus Ihren eigenen Reglementen.',
};

exports.render = (ctx) => ctx.c.werkzeugSeite({
  key: 'dokumente',
  crumb: 'Dokumente',
  eyebrow: 'KI-Werkzeug · Dokumente',
  title: 'Angaben aus PDFs und Belegen, ohne Abtippen.',
  lead: 'Die KI liest Lieferscheine, Rechnungen und Formulare und überträgt die Angaben in Ihre Tabelle oder Ihr Programm. Unklare Stellen markiert sie, Ihr Team prüft.',
  mockup: ctx.c.kiMockDokument(),
  demo: 'lieferscheine',
  heute: 'Lieferscheine, Rechnungen, Anmeldungen, Rapporte: Vieles kommt als PDF oder Foto und wird von Hand abgetippt. Das dauert und führt zu Tippfehlern.',
  vorher: [
    'Ein PDF kommt per Mail.',
    'Jemand öffnet es und sucht die Angaben.',
    'Die Angaben werden abgetippt.',
    'Fehler fallen erst später auf.',
  ],
  nachher: [
    { text: 'Das PDF landet in einem Ordner oder Postfach.' },
    { text: 'Die KI liest Datum, Absender, Positionen und Beträge.', who: 'ki' },
    { text: 'Die Angaben stehen in Ihrer Tabelle, unklare Stellen sind markiert.', who: 'ki' },
    { text: 'Ihr Team prüft die Markierungen und übernimmt.', who: 'sie' },
  ],
  extra: [{
    id: 'wissen',
    head: { eyebrow: 'Zweites Beispiel', title: 'Fragen an Ihre eigenen Dokumente.', intro: 'Die KI sucht die Antwort in Ihren Reglementen und Vorlagen und nennt immer die Quelle. So lässt sich jede Antwort nachprüfen.' },
    body: `<div class="frage" data-reveal>
      ${ctx.c.badge('beispiel')}
      <div class="frage__win showcase">
        <p class="frage__q"><span class="frage__who">Frage</span>Bis wann müssen Spesen eingereicht werden?</p>
        <div class="frage__a"><span class="frage__who">${ctx.c.who('ki')} Antwort</span><p>Laut Spesenreglement, Abschnitt 3, bis zum 5. des Folgemonats.</p>
          <p class="frage__src">${ctx.c.icon('dokument')}<span>Quelle: Spesenreglement.pdf, Seite 2</span></p>
        </div>
      </div>
    </div>`,
  }],
  programme: ['PDF', 'Word', 'Excel', 'OneDrive', 'SharePoint', 'Google Drive', 'bexio', 'Abacus'],
  programmeText: 'PDF, Word und Excel, OneDrive, SharePoint und Google Drive. bexio und Abacus, sofern die Schnittstelle eingerichtet ist.',
  grenzen: 'Schlecht lesbare Fotos und Handschrift erkennt die KI nicht immer richtig. Darum markiert sie unklare Stellen, und Ihr Team prüft vor dem Übernehmen. Stichproben bleiben sinnvoll.',
  aufwand: 'Typischer Start: eine Art von Dokument, zum Beispiel Lieferscheine.',
  branche: 'treuhand',
});
