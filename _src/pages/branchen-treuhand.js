'use strict';
// Branche Treuhand und Buero (V4-TEXTE 12). Vorlage: components/ki-vorlagen.js, Bilder: components/branchen-bilder.js.

exports.meta = {
  path: 'branchen/treuhand/',
  nav: 'ki',
  css: ['ki', 'branchen', 'demo'],
  js: ['demo', 'rechner'],
  title: 'KI in Treuhand und Büro: Beleg wird Buchung | {{marke}}',
  description: 'Die KI liest Lieferant, Datum, Betrag und Mehrwertsteuer aus Belegen und schlägt die Buchung vor. Gebucht wird erst nach Ihrer Prüfung.',
};

exports.render = (ctx) => ctx.c.branchenSeite({
  key: 'treuhand',
  media: ctx.c.branchenHero('treuhand'),
  crumb: 'Treuhand und Büro',
  eyebrow: 'Branche · Treuhand und Büro',
  title: 'Aus dem Beleg wird ein Buchungs&shy;vorschlag.',
  lead: 'Die KI liest Lieferant, Datum, Betrag und Mehrwertsteuer aus und schlägt das Konto vor. Gebucht wird erst, wenn Ihre Fachperson zustimmt.',
  heute: 'Belege kommen als PDF, Foto oder auf Papier. Viele Buchhaltungsprogramme lesen Beträge heute schon selbst aus. Die Kontierung, Sonderfälle und Rückfragen an Mandanten bleiben trotzdem Handarbeit.',
  hilft: 'Wo KI hier hilft: dort, wo Ihr Programm aufhört. Beim Konto-Vorschlag aus Ihrer bisherigen Buchungsgeschichte, beim Erkennen von Sonderfällen und beim Entwurf von Rückfragen an Mandanten.',
  schritte: [
    {
      title: 'Beleg.',
      alt: 'Rechnung eines Bürobedarf-Lieferanten als PDF',
      bild: ctx.c.branchenBild('treuhand', 1),
      text: 'Bürobedarf Beispiel, Rechnung 2026-118 vom 14.10.2026, Druckerpapier und Toner, Total CHF 248.65 inklusive 8.1 % MWST, zahlbar innert 30 Tagen.', // beispiel
    },
    {
      title: 'Ausgelesen.',
      alt: 'Ausgelesene Felder des Belegs',
      bild: ctx.c.branchenBild('treuhand', 2),
      text: 'Lieferant Bürobedarf Beispiel · Datum 14.10.2026 · Netto CHF 230.02 · MWST 8.1 % CHF 18.63 · Total CHF 248.65 · fällig am 13.11.2026', // beispiel
    },
    {
      title: 'Buchungsvorschlag.',
      alt: 'Buchungsvorschlag mit Konten und Begründung',
      bild: ctx.c.branchenBild('treuhand', 3),
      text: 'Soll 6500 Büromaterial CHF 230.02 und 1171 Vorsteuer CHF 18.63, Haben 2000 Kreditoren. Begründung der KI: Gleicher Lieferant in den letzten sechs Monaten fünfmal auf 6500 gebucht. Betrag im üblichen Rahmen.', // beispiel
    },
    {
      title: 'Sonderfall.',
      alt: 'Hinweis auf einen möglichen Sonderfall',
      bild: ctx.c.branchenBild('treuhand', 4),
      sie: false,
      text: 'Kein Sonderfall erkannt. Bei neuen Lieferanten, Fremdwährung oder möglichem Privatanteil markiert die KI den Beleg und entwirft die Rückfrage. Ein solcher Fall steht weiter unten zum Ausprobieren.',
    },
    {
      title: 'Sie entscheiden.',
      alt: 'Der Vorschlag wartet auf die Freigabe der Fachperson',
      bild: ctx.c.branchenBild('treuhand', 5),
      sie: true,
      text: 'Ihre Fachperson prüft und bucht. Ohne Freigabe wird nichts gebucht.',
    },
  ],
  fussnote: 'Kontonummern nach KMU-Kontenrahmen als Beispiel. Im Alltag gilt Ihr Kontenplan.',
  rollen: [
    ['liest den Beleg aus', 'prüft die Angaben'],
    ['schlägt Konto und MWST vor', 'entscheidet und bucht'],
    ['markiert neue und ungewöhnliche Fälle', 'klärt Sonderfälle'],
    ['entwirft Rückfragen an Mandanten', 'sendet sie'],
  ],
  hinweis: {
    icon: 'schluessel',
    title: 'KI-Check ohne Mandantendaten',
    text: ctx.t('Im KI-Check sehe ich keine Mandantendaten. Wir besprechen Abläufe und arbeiten mit Musterbelegen oder Belegen Ihres eigenen Büros. Auf Wunsch unterschreibe ich vor dem ersten Gespräch eine Vertraulichkeitserklärung. Mandantendaten kommen erst im Pilot dazu, nach dem unterschriebenen Vertrag zur Auftragsbearbeitung. Verarbeitet werden sie standardmässig {{daten_standard}}, etwas anderes nur mit Ihrer schriftlichen Zustimmung, pro Fall.'),
  },
  extra: [{
    id: 'sonderfaelle', tone: 'stage', width: 'wide',
    head: { eyebrow: 'Zum Ausprobieren', title: 'Sonderfälle und Steuersaison.', intro: 'Den einfachen Beleg liest Ihr Programm oft schon selbst. Hier zwei Fälle, bei denen die KI Ihrer Fachperson Arbeit abnimmt: ein Beleg mit Sonderfall und fehlende Unterlagen in der Steuersaison.' },
    body: ctx.c.demoAssistent({ id: 'demo-treuhand', szenen: ['sonderfall', 'steuern'], link: { href: 'kontakt/?thema=treuhand', label: 'Beispiel für mein Büro besprechen' } }),
  }, {
    id: 'schweigepflicht',
    head: { eyebrow: 'Schweigepflicht', title: 'Ihre Schweigepflicht und Ihre Mandanten.', intro: 'Mandantendaten sind geheim. Wer für Sie arbeitet, muss daran gebunden sein, auch die KI-Anbieter. So regle ich das:' },
    body: [
      ctx.c.list([
        '<strong>Geheimhaltung im Vertrag, auch für Unterauftragsbearbeiter.</strong> Im Vertrag zur Auftragsbearbeitung verpflichte ich mich zur Geheimhaltung, auch nach dem Ende des Auftrags. KI-Anbieter setze ich nur ein, wenn ihr Vertrag sie ebenfalls zur Vertraulichkeit verpflichtet und Sie ihnen vorher zugestimmt haben.',
        '<strong>Auch das Gesetz bindet mich.</strong> Nach Art. 62 DSG macht sich strafbar, wer geheime Personendaten offenbart, die er bei der Arbeit für eine schweigepflichtige Person erfahren hat. Das gilt auch für mich, und auch nach dem Ende der Zusammenarbeit.',
        ctx.t('<strong>Ihre Mandanten informieren.</strong> Ich schlage Ihnen einen kurzen Satz für Mandatsvertrag oder Datenschutzerklärung vor, zum Beispiel: «Für einzelne Arbeitsschritte setzen wir KI-Dienste ein. Die Daten werden {{daten_standard}} verarbeitet und nicht zum Training verwendet.» Ob und wie Sie Ihre Mandanten informieren müssen, klären Sie mit Ihrer Fachperson oder Ihrem Verband.'),
      ], { style: 'num', cls: 'schweige' }),
      `<p class="sec__foot">${ctx.c.more({ href: 'unterlagen/', label: 'Muster der Vertraulichkeitserklärung und des Vertrags ansehen' })}</p>`,
      '<p class="note">Ich bin kein Jurist. Revisionsmandate und Fragen zum Berufsgeheimnis klären Sie mit Ihrer Fachperson. Ich liefere die technischen Angaben dazu.</p>',
    ].join('\n'),
  }, {
    id: 'rechnung', tone: 'stage',
    head: { eyebrow: 'Beispielrechnung', title: 'Was bringt das einem Büro in Franken?', intro: 'Zum Beispiel ein Büro mit 9 Mitarbeitenden. Ersetzen Sie die Startwerte durch Ihre Zahlen.' },
    body: ctx.c.kiRechner({
      id: 'rechner-treuhand',
      label: 'Ersparnis bei Belegen und Rückfragen berechnen',
      periode: 'monat',
      zeilen: [
        { titel: 'Belege kontieren', name: 'Belege', anzahl: 500, heute: 2, neu: 1, step: 0.5, neuLabel: 'Minuten mit Vorschlag der KI' },
        { titel: 'Rückfragen an Mandanten', name: 'Rückfragen', anzahl: 60, heute: 10, neu: 4, step: 1 },
      ],
      satz: 60,
      annahme: 'Annahme zum Start: 500 Belege pro Monat, Kontieren heute 2 Minuten, mit Vorschlag 1 Minute. 60 Rückfragen pro Monat, heute je 10 Minuten, mit Entwurf je 4 Minuten. CHF 60 pro Stunde.', // beispiel
    }),
  }],
  programmeText: 'Ehrlich eingestuft, nach dem, was die Hersteller öffentlich dokumentieren. Wo ich ein Programm noch nicht geprüft habe, steht es so da.',
  programmeStand: '1. November 2026',
  programmeListe: [
    { name: 'bexio', status: 'ja', weg: 'Offizielle Schnittstelle von bexio.' },
    { name: 'Abacus', status: 'partner', weg: 'Abacus bietet eine REST-Schnittstelle. Ihr Abacus-Partner richtet den Zugang ein, sein Aufwand ist nicht in meinem Preis.' },
    { name: 'Banana Buchhaltung', status: 'export', weg: 'Weg über Import: Die KI erstellt eine Datei, die Ihre Fachperson in Banana einliest.' },
    { name: 'Topal und Sorba', status: 'ungeprueft', weg: 'Noch nicht geprüft. Ob Schnittstelle oder Import, kläre ich im KI-Check.' },
    { name: 'Steuersoftware', status: 'ungeprueft', weg: 'Noch nicht geprüft. Die KI bereitet Unterlagen und Rückfragen vor, die Steuererklärung füllt Ihre Fachperson aus.' },
    { name: 'Excel', status: 'ja', weg: 'Als Datei oder in Microsoft 365.' },
    { name: 'Mail-Postfach, OneDrive, SharePoint, Google Drive', status: 'ja', weg: 'Über die offiziellen Schnittstellen von Microsoft und Google.' },
  ],
  programmeQuellen: [
    ['bexio API', 'https://docs.bexio.com/'],
    ['Abacus REST-API', 'https://downloads.abacus.ch/fileadmin/ablage/abaconnect/htmlfiles/docs/restapi/abacus_authorization_rest_api.html'],
    ['Microsoft Graph', 'https://learn.microsoft.com/graph/overview'],
  ],
  programmeCheck: true,
  programme: ['bexio', 'Abacus', 'Banana', 'Excel', 'Mail-Postfach für Belege', 'OneDrive', 'SharePoint', 'Google Drive'],
  aufwand: 'Typischer Start: eine Art von Beleg und Ihr eigenes Büro. Den Pilot legen wir ausserhalb der Steuersaison, damit Ihr Team Zeit zum Testen hat.',
  abschluss: {
    title: 'Wo bleibt bei Ihnen am meisten Handarbeit?',
    text: 'Im KI-Check schauen wir zwei, drei Abläufe an und klären den Datenschutz, bevor etwas läuft.',
    buttons: [
      { href: 'kontakt/?thema=treuhand', label: 'KI-Check anfragen' },
      { href: 'ki/?demo=beleg#demo', label: 'Demo ausprobieren', variant: 'secondary' },
    ],
  },
});
