'use strict';
// Werkzeug Kalender (V4-TEXTE 7). Gruppe: KI-Seiten.

exports.meta = {
  path: 'ki/kalender/',
  nav: 'ki',
  css: ['ki', 'ki-mockups', 'demo'],
  js: ['demo'],
  title: 'KI für Termine: Terminvorschläge | {{marke}}',
  description: 'Terminwünsche aus Mail und Formular erhalten passende Vorschläge aus Ihrem Kalender. Für Outlook und Google Kalender. Sie bestätigen.',
};

exports.render = (ctx) => ctx.c.werkzeugSeite({
  key: 'kalender',
  crumb: 'Kalender',
  eyebrow: 'KI-Werkzeug · Kalender',
  title: 'Terminwünsche beantwortet, ohne Hin und Her.',
  lead: 'Die KI erkennt Terminwünsche, schaut in Ihren Kalender und schlägt passende freie Zeiten vor. Sagt der Kunde zu, trägt sie den Termin ein. Auf Wunsch erinnert sie ihn am Vortag.',
  mockup: ctx.c.kiMockKalender(),
  demo: 'termin',
  heute: 'Ein Termin braucht oft drei, vier Mails. Wer welche Zeit vorgeschlagen hat, steht verstreut im Postfach. Doppelte Buchungen und vergessene Termine kosten Zeit und Nerven.',
  vorher: [
    'Ein Kunde fragt nach einem Termin.',
    'Kalender öffnen, freie Zeiten suchen.',
    'Vorschläge schreiben, auf Antwort warten.',
    'Termin eintragen, Erinnerung von Hand.',
  ],
  nachher: [
    { text: 'Ein Kunde fragt nach einem Termin.' },
    { text: 'Die KI liest den Wunsch, zum Beispiel «nur nachmittags».', who: 'ki' },
    { text: 'Ein Entwurf mit drei passenden Zeiten liegt bereit. Sie senden ihn.', who: 'sie' },
    { text: 'Nach der Zusage trägt die KI den Termin ein. Auf Wunsch geht am Vortag eine Erinnerung nach Ihrer Vorlage hinaus.', who: 'ki' },
  ],
  programme: ['Outlook-Kalender', 'Microsoft 365', 'Google Kalender', 'Online-Buchungssysteme', 'Kontaktformular Ihrer Website'],
  programmeText: 'Outlook-Kalender in Microsoft 365, Google Kalender, Online-Buchungssysteme, sofern sie eine Schnittstelle bieten, und das Kontaktformular Ihrer Website.',
  grenzen: 'Die KI bucht nicht über bestehende Termine und sagt nichts ab. Absagen und Verschiebungen bleiben bei Ihrem Team.',
  aufwand: 'Typischer Start: ein Kalender und eine Art von Termin.',
  branche: 'treuhand',
});
