'use strict';
// Werkzeug Kunden (V4-TEXTE 9). Gruppe: KI-Seiten.

exports.meta = {
  path: 'ki/kunden/',
  nav: 'ki',
  css: ['ki', 'ki-mockups', 'demo'],
  js: ['demo'],
  title: 'Anfragen aus Telefon, Mail und WhatsApp | {{marke}}',
  description: 'Alle Anfragen aus Telefon, Mail, WhatsApp und Website in einer Liste, mit Anliegen, Dringlichkeit und Zuständigkeit. Ihr Team entscheidet.',
};

exports.render = (ctx) => ctx.c.werkzeugSeite({
  key: 'kunden',
  crumb: 'Kunden',
  eyebrow: 'KI-Werkzeug · Kunden',
  title: 'Anfragen aus Telefon, Mail und WhatsApp in einer Liste.',
  lead: 'Die KI sammelt Anfragen aus allen Kanälen, erkennt das Anliegen und schlägt vor, wer sie übernimmt. Ihr Team sieht auf einen Blick, was offen ist, und nichts geht verloren.',
  mockup: ctx.c.kiMockListe(),
  demo: 'anfragen',
  heute: 'Anfragen kommen per Telefon, Mail, WhatsApp und über die Website. Jede Person hat ihren Teil im Kopf oder auf dem Handy. Wer ist zuständig, wer hat schon geantwortet? Das zeigt sich oft erst, wenn ein Kunde nachfragt.',
  vorher: [
    'Anfragen kommen über vier Kanäle.',
    'Jede Person sammelt für sich.',
    'Was in den Ferien kommt, bleibt liegen.',
    'Niemand sieht, was offen ist.',
  ],
  nachher: [
    { text: 'Anfragen kommen über vier Kanäle.' },
    { text: 'Die KI trägt jede Anfrage mit Anliegen und Dringlichkeit in eine Liste ein.', who: 'ki' },
    { text: 'Sie schlägt vor, wer zuständig ist, und legt wo passend einen Antwortentwurf bereit.', who: 'ki' },
    { text: 'Ihr Team sieht alles auf einen Blick und entscheidet.', who: 'sie' },
  ],
  extra: [{
    id: 'kanaele', tone: 'tint',
    head: { eyebrow: 'Kanäle', title: 'So kommen die Kanäle in die Liste.' },
    body: [
      ctx.c.kiKanaele([
        { icon: 'mail', title: 'Mail', text: 'Direkt aus Ihrem Postfach.' },
        { icon: 'website', title: 'Website', text: 'Aus Ihrem Kontaktformular.' },
        { icon: 'chat', title: 'WhatsApp', text: 'Über die WhatsApp Business Platform von Meta. Die normale App hat dafür keine Schnittstelle.' },
        { icon: 'telefon', title: 'Telefon', text: 'Nachrichten auf dem Anrufbeantworter, wenn Ihr Anbieter sie als Audiodatei per Mail schickt, oder eine kurze Notiz, die Sie nach dem Anruf ins Handy sprechen.' },
      ]),
      `<div class="sec__foot">${ctx.c.info({ icon: 'liste', title: 'Wo die Liste liegt', text: 'Eine Tabelle in Excel oder Microsoft 365, Ihr bestehendes Kundenprogramm, wenn es eine Schnittstelle hat, oder eine einfache eigene Ansicht im Browser.' })}</div>`,
    ].join('\n'),
  }],
  programme: ['WhatsApp Business Platform', 'Outlook', 'Microsoft 365', 'bexio (Kontakte)', 'Excel', 'Kontaktformular Ihrer Website'],
  grenzen: 'Die KI sagt Kunden keine Termine und keine Preise zu. Sie ordnet und schlägt vor, Ihr Team antwortet. Für die WhatsApp Business Platform kann Meta Gebühren verlangen. Das rechne ich im KI-Check für Ihren Fall aus.',
  aufwand: 'Typischer Start: zwei Kanäle, zum Beispiel Mail und Website, danach WhatsApp und Telefon.',
  branche: 'verwaltung',
});
