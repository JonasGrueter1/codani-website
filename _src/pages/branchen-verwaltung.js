'use strict';
// Branche Verwaltung (V4-TEXTE 13). Vorlage: components/ki-vorlagen.js, Bilder: components/branchen-bilder.js.

exports.meta = {
  path: 'branchen/verwaltung/',
  nav: 'ki',
  css: ['ki', 'branchen'],
  title: 'KI in der Verwaltung: Anfrage wird Antwort | {{marke}}',
  description: 'Mieteranfragen aus Mail, Formular und WhatsApp geordnet in einer Liste. Die KI schlägt eine Antwort aus Ihren Unterlagen vor, Ihr Team gibt sie frei.',
};

exports.render = (ctx) => ctx.c.branchenSeite({
  key: 'verwaltung',
  media: ctx.c.branchenHero('verwaltung'),
  crumb: 'Verwaltung',
  eyebrow: 'Branche · Verwaltung',
  title: 'Aus der Mieter&shy;anfrage wird ein Antwort&shy;entwurf.',
  lead: 'Anfragen per Mail, Formular oder WhatsApp landen geordnet in einer Liste. Die KI sucht die Antwort in Ihren Unterlagen und schlägt einen Text vor. Ihr Team gibt ihn frei.',
  heute: 'Viele Anfragen von Mieterinnen und Mietern wiederholen sich: Parkplatz, Waschküche, Schlüssel, Nebenkosten. Die Antwort steht irgendwo in der Hausordnung oder einer Liste. Sie zu suchen kostet Zeit, und dringende Meldungen gehen zwischen Routinefragen unter.',
  schritte: [
    {
      title: 'Anfrage.',
      alt: 'Mail eines Mieters im Posteingang',
      bild: ctx.c.branchenBild('verwaltung', 1),
      text: '«Guten Tag. Ich wohne seit Oktober am Musterweg 4. Gibt es noch einen freien Platz in der Einstellhalle, und was kostet er? Und darf ich am Sonntag waschen? Freundliche Grüsse, Marco Beispiel»',
    },
    {
      title: 'Zugeordnet.',
      alt: 'Anfrage in der Liste mit Objekt und Anliegen',
      bild: ctx.c.branchenBild('verwaltung', 2),
      text: 'Mieter Marco Beispiel, Musterweg 4, Wohnung 1.2 · zwei Anliegen: Parkplatz, Waschküche · Dringlichkeit tief',
    },
    {
      title: 'Nachgeschlagen.',
      alt: 'Parkplatzliste und Hausordnung als Quellen',
      bild: ctx.c.branchenBild('verwaltung', 3),
      text: 'Parkplatzliste: Platz 14 frei ab 1. Dezember, CHF 120 pro Monat. Hausordnung, Abschnitt 5: Waschküche an Sonn- und Feiertagen geschlossen.', // beispiel
    },
    {
      title: 'Antwortentwurf.',
      alt: 'Antwortentwurf mit Verweis auf die Quellen',
      bild: ctx.c.branchenBild('verwaltung', 4),
      sie: false,
      text: '«Guten Tag Herr Beispiel. Danke für Ihre Anfrage. In der Einstellhalle ist Platz 14 ab 1. Dezember frei, die Miete beträgt CHF 120 pro Monat. Möchten Sie ihn mieten, senden wir Ihnen den Vertrag. Die Waschküche ist laut Hausordnung an Sonn- und Feiertagen geschlossen. Freundliche Grüsse, Ihre Verwaltung»', // beispiel
    },
    {
      title: 'Sie entscheiden.',
      alt: 'Der Entwurf wartet auf die Freigabe',
      bild: ctx.c.branchenBild('verwaltung', 5),
      sie: true,
      text: 'Ihre Sachbearbeiterin prüft und sendet. Dringende Meldungen wie Wasserschäden stehen in der Liste zuoberst.',
    },
  ],
  rollen: [
    ['ordnet Anfrage, Objekt und Wohnung zu', 'prüft die Zuordnung'],
    ['sucht die Antwort in Ihren Unterlagen', 'entscheidet und gibt frei'],
    ['stuft die Dringlichkeit ein', 'handelt bei Notfällen'],
    ['zeigt die Quelle zu jeder Angabe', 'hält die Unterlagen aktuell'],
  ],
  hinweis: {
    icon: 'schluessel',
    title: 'Für grössere Verwaltungen',
    text: 'Zugriffe nach Team: Jedes Team sieht nur seine Liegenschaften. Jede Freigabe wird mit Name und Zeit festgehalten. Die KI arbeitet nur mit den Unterlagen, die Sie dafür freigeben.',
  },
  extra: [{
    id: 'notfall', tone: 'warm',
    head: { eyebrow: 'Ausserhalb der Bürozeit', title: 'Notfälle warten nicht auf den Morgen.', intro: 'Eine Meldung um 19.42 Uhr «Wasser tropft von der Decke» darf nicht bis am Morgen in der Liste liegen. So richte ich das ein:' },
    body: [
      '<div class="grid grid--split notfall"><div>',
      ctx.c.list([
        '<strong>Feste Wörter gehen immer vor.</strong> Meldungen mit Wörtern wie Wasser, Feuer, Rauch, Gas, Strom oder Lift gelten immer als dringend, auch wenn die KI sie tiefer einstuft.',
        '<strong>Dringendes sofort an den Pikett.</strong> Hohe Dringlichkeit geht ausserhalb der Bürozeit sofort per SMS oder Teams an die Person, die Pikett hat. Die KI wartet nicht auf eine Freigabe, um Alarm zu geben, sie antwortet aber nicht selbst.',
        '<strong>Lieber einmal zu oft.</strong> Im Zweifel stuft die Lösung höher ein. Im Pilot prüfen wir mit Ihren alten Meldungen, ob nichts durchrutscht.',
      ], { style: 'check' }),
      '</div><div>',
      ctx.c.info({ icon: 'telefon', tone: 'tint', title: 'Die KI ersetzt keine Notfallnummer.', text: 'Ihre Mieterinnen und Mieter brauchen weiterhin Ihre Pikett-Nummer. Die Liste hilft, dass keine Meldung untergeht, die trotzdem schriftlich kommt.' }),
      '</div></div>',
    ].join('\n'),
  }],
  programmeText: 'Ob Ihre Liegenschaftssoftware angebunden werden kann, ist oft die wichtigste Frage. Unten steht, was die Hersteller öffentlich dokumentieren. Wie die Anbindung in Ihrem Fall aussieht, kläre ich im KI-Check, bevor Sie etwas bestellen.',
  programmeStand: '1. November 2026',
  programmeListe: [
    { name: 'Outlook und Microsoft 365', status: 'ja', weg: 'Postfach, Kalender und Dateien über Microsoft Graph, die offizielle Schnittstelle von Microsoft.' },
    { name: 'GARAIO REM', status: 'ja', weg: 'Öffentlich beschriebene Schnittstelle (GraphQL). Die Zugangsdaten vergibt der Hersteller.' },
    { name: 'Abacus Immobilien', status: 'partner', weg: 'Abacus bietet eine REST-Schnittstelle, den Zugang richtet Ihr Abacus-Partner ein. Ob sie alle Immobilien-Daten abdeckt, die wir brauchen, kläre ich mit ihm.' },
    { name: 'ImmoTop2 und Rimo R5', status: 'export', weg: 'Keine öffentliche Schnittstellen-Dokumentation gefunden. Belegt ist ein täglicher Austausch per CSV-Datei mit einer Mieter-App: Objekte, Wohnungen, Mietverhältnisse. Ein solcher Export reicht oft, damit die KI Meldungen der richtigen Wohnung zuordnet.' },
    { name: 'WhatsApp Business Platform', status: 'ja', weg: 'Über die Plattform von Meta. Die normale WhatsApp-Business-App hat keine offene Schnittstelle.' },
    { name: 'Kontaktformular, PDF und Excel', status: 'ja', weg: 'Meldungen aus dem Formular landen im Postfach oder direkt in der Liste. Hausordnung, Parkplatzliste und Reglemente liest die KI als Quelle für Antworten.' },
  ],
  programmeQuellen: [
    ['Microsoft Graph', 'https://learn.microsoft.com/graph/overview'],
    ['GARAIO REM GraphQL API', 'https://github.com/Garaio-REM/grem-graphql-api'],
    ['Abacus REST-API', 'https://downloads.abacus.ch/fileadmin/ablage/abaconnect/htmlfiles/docs/restapi/abacus_authorization_rest_api.html'],
    ['Datenaustausch ImmoTop2 und Rimo R5 mit einer Mieter-App', 'https://marketplace.allthings.me/en/solutions/erp--immotop2--rimo-r4--rimo-r5'],
    ['Meta: WhatsApp Business Platform', 'https://developers.facebook.com/docs/whatsapp/'],
  ],
  programmeCheck: true,
  programme: ['Outlook', 'Microsoft 365', 'Kontaktformular Ihrer Website', 'WhatsApp Business Platform', 'Liegenschaftssoftware', 'PDF', 'Excel'],
  aufwand: 'Typischer Start: ein Postfach und die zehn häufigsten Fragen mit den passenden Unterlagen.',
  abschluss: {
    title: 'Welche Fragen beantworten Sie jede Woche wieder?',
    text: 'Im Demo-Assistenten sehen Sie, wie aus einer Schadenmeldung ein Ticket wird. Für Ihren Betrieb klären wir es im KI-Check.',
    buttons: [
      { href: 'kontakt/?thema=verwaltung', label: 'KI-Check anfragen' },
      { href: 'ki/?demo=mieter#demo', label: 'Demo ausprobieren', variant: 'secondary' },
    ],
  },
});
