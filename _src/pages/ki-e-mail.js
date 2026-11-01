'use strict';
// Werkzeug E-Mail (V4-TEXTE 6). Gruppe: KI-Seiten.

exports.meta = {
  path: 'ki/e-mail/',
  nav: 'ki',
  css: ['ki', 'ki-mockups', 'demo'],
  js: ['demo'],
  title: 'KI für E-Mails: Antwortentwürfe | {{marke}}',
  description: 'Die KI sortiert Ihr Postfach und legt Antwortentwürfe für häufige Anfragen bereit. Für Outlook und Gmail. Sie prüfen und senden selbst.',
};

exports.render = (ctx) => ctx.c.werkzeugSeite({
  key: 'e-mail',
  crumb: 'E-Mail',
  eyebrow: 'KI-Werkzeug · E-Mail',
  title: 'Antwortentwürfe, die bereitliegen, wenn Sie das Postfach öffnen.',
  lead: 'Die KI liest neue Mails, erkennt das Anliegen und schreibt einen Entwurf in Ihrem Ton. Sie prüfen, passen an und senden. Ohne Ihre Freigabe geht nichts hinaus.',
  mockup: ctx.c.kiMockPostfach(),
  demo: 'offerte',
  heute: 'Viele Mails stellen dieselben Fragen: Stand der Offerte, Öffnungszeiten, Preise, fehlende Unterlagen. Jede Antwort ist schnell geschrieben, zusammen kosten sie jeden Tag Zeit. Und wer sie beantworten kann, ist oft gerade beim Kunden.',
  vorher: [
    'Eine Mail kommt an.',
    'Jemand liest sie und sucht die nötige Angabe.',
    'Die Antwort wird von Grund auf geschrieben.',
    'Gesendet wird oft erst am Abend.',
  ],
  nachher: [
    { text: 'Eine Mail kommt an.' },
    { text: 'Die KI erkennt das Anliegen und sucht die nötige Angabe, zum Beispiel den Stand einer Offerte.', who: 'ki' },
    { text: 'Der Entwurf liegt im Entwurfsordner, offene Punkte sind markiert.', who: 'ki' },
    { text: 'Sie prüfen, passen an und senden.', who: 'sie' },
  ],
  programme: ['Outlook', 'Microsoft 365', 'Gmail', 'Google Workspace', 'andere Postfächer über IMAP', 'bexio', 'Excel'],
  programmeText: 'Outlook und Microsoft 365, Gmail und Google Workspace, andere Postfächer über IMAP, den Standard der meisten Mailanbieter. Dazu Ihre Offerten- oder Kundenliste, zum Beispiel in bexio oder Excel, sofern eine Schnittstelle besteht.',
  grenzen: 'Heikle Mails wie Reklamationen, Kündigungen oder rechtliche Fragen beantwortet Ihr Team selbst. Die KI markiert sie nur.',
  aufwand: 'Typischer Start: ein Postfach und drei bis fünf häufige Arten von Anfragen. Wie viel Zeit Sie sparen, messen wir im Pilot mit Ihren echten Mails.',
  branche: 'verwaltung',
});
