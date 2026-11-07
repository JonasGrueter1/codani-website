'use strict';
// Branche Handwerk (V4-TEXTE 11). Vorlage: components/ki-vorlagen.js, Bilder: components/branchen-bilder.js.

exports.meta = {
  path: 'branchen/handwerk/',
  nav: 'ki',
  css: ['ki', 'branchen'],
  js: ['rechner'],
  title: 'KI im Handwerk: Sprachnachricht wird Offerte | {{marke}}',
  description: 'Masse und Wünsche direkt auf der Baustelle ins Handy sprechen. Die KI macht daraus einen Offertentwurf mit Ihren Preisen. Sie prüfen und senden.',
};

exports.render = (ctx) => ctx.c.branchenSeite({
  key: 'handwerk',
  media: ctx.c.branchenHero('handwerk'),
  crumb: 'Handwerk',
  eyebrow: 'Branche · Handwerk',
  title: 'Aus der Sprach&shy;nachricht von der Baustelle wird ein Offert&shy;entwurf.',
  lead: 'Sie sprechen Masse und Wünsche vor Ort ins Handy. Wenn Sie zurück im Büro sind, liegt der Entwurf bereit, mit Ihren Preisen. Sie prüfen, ergänzen und senden.',
  heute: 'Die Notizen von der Besichtigung liegen im Auto, auf dem Handy oder im Kopf. Abends werden sie abgetippt, Positionen gesucht und Preise nachgeschaut. Bis die Offerte beim Kunden ist, vergehen oft Tage.',
  schritte: [
    {
      title: 'Vor Ort.',
      alt: 'Handy mit einer Sprachnachricht von 58 Sekunden',
      bild: ctx.c.branchenBild('handwerk', 1),
      text: '«Bin bei Familie Muster am Musterweg 4. Im Gang ein Einbauschrank, zwei Meter vierzig breit, raumhoch, zwei Meter sechzig. Zwei Drehtüren, unten zwei Schubladen, Front weiss lackiert. Der alte Schrank muss raus. Wenn möglich vor Weihnachten.»',
    },
    {
      title: 'Erkannt.',
      alt: 'Liste mit drei erkannten Positionen und zwei offenen Fragen',
      bild: ctx.c.branchenBild('handwerk', 2),
      text: 'Einbauschrank 240 x 260 x 60 cm · Demontage und Entsorgung Altschrank · Montage · Offen: Griffe? Innenausstattung?',
    },
    {
      title: 'Offertentwurf.',
      alt: 'Offertentwurf mit drei Positionen und Total',
      bild: ctx.c.branchenBild('handwerk', 3),
      text: 'Positionen aus Ihrer Preisliste: Einbauschrank CHF 4’850.00, Demontage und Entsorgung CHF 380.00, Montage 6 Stunden CHF 570.00. Total mit 8.1 % MWST CHF 6’269.80.', // beispiel
    },
    {
      title: 'Offene Punkte.',
      alt: 'Zwei markierte Rückfragen im Entwurf',
      bild: ctx.c.branchenBild('handwerk', 4),
      sie: false,
      text: 'Griffe nicht erwähnt: Modell wählen. Innenausstattung offen: Tablare oder Kleiderstange? Termin vor Weihnachten: Kapazität prüfen.',
    },
    {
      title: 'Sie entscheiden.',
      alt: 'Der Entwurf wartet auf Ihre Freigabe',
      bild: ctx.c.branchenBild('handwerk', 5),
      sie: true,
      text: 'Sie ergänzen die offenen Punkte und senden die Offerte. Ohne Ihre Freigabe geht nichts hinaus.',
    },
  ],
  fussnote: 'Beispielpreise. Im Alltag nimmt die KI die Preise aus Ihrer eigenen Preisliste.',
  rollen: [
    ['schreibt die Sprachnachricht ab', 'spricht vor Ort, was wichtig ist'],
    ['erkennt Positionen und Masse', 'prüft Masse und Positionen'],
    ['nimmt Preise aus Ihrer Preisliste', 'entscheidet über Preis und Rabatt'],
    ['markiert, was fehlt', 'ergänzt und sendet'],
  ],
  hinweis: {
    icon: 'mikro',
    title: 'Ehrlich gesagt',
    text: 'Mundart erkennt die Spracherkennung oft gut, aber nicht fehlerfrei. Darum bleibt die Abschrift beim Entwurf, und Sie sehen, worauf er beruht. Wie viel Zeit das bei Ihnen spart, messen wir im Pilot.',
  },
  extra: [{
    id: 'rechnung', tone: 'stage',
    head: { eyebrow: 'Beispielrechnung', title: 'Lohnt sich das für Ihren Betrieb?', intro: 'Rechnen Sie mit Ihren eigenen Zahlen, in Stunden und in Franken. Die Startwerte sind Annahmen, keine Messung.' },
    body: ctx.c.kiRechner({
      id: 'rechner-handwerk',
      label: 'Ersparnis bei Offerten berechnen',
      periode: 'woche',
      zeilen: [{ titel: 'Offerten nach einer Besichtigung', name: 'Offerten', anzahl: 10, heute: 40, neu: 15, step: 5 }],
      satz: 60,
      annahme: 'Annahme zum Start: 10 Offerten pro Woche, heute je 40 Minuten Abtippen und Suchen, mit Entwurf je 15 Minuten, CHF 60 pro Stunde.', // beispiel
    }),
  }],
  programmeText: 'Ehrlich eingestuft, nach dem, was die Hersteller öffentlich dokumentieren. Selbst angebunden habe ich noch keines dieser Programme. Das kläre ich im KI-Check, bevor Sie etwas bestellen.',
  programmeStand: '1. November 2026',
  programmeListe: [
    { name: 'bexio', status: 'ja', weg: 'Kontakte, Offerten und Rechnungen über die öffentlich dokumentierte Schnittstelle. Der Offertentwurf kann direkt in bexio entstehen.' },
    { name: 'Abacus', status: 'partner', weg: 'Abacus bietet eine REST-Schnittstelle. Den Zugang richtet Ihr Abacus-Partner ein, sein Aufwand ist nicht in meinem Preis.' },
    { name: 'Borm', status: 'offen', weg: 'Verbreitet in Schreinereien. Belegt sind Anbindungen an CAD und Produktion. Eine offene Schnittstelle für Offerten habe ich nicht gefunden. Ob es einen Import gibt, frage ich beim Hersteller an.' },
    { name: 'Triviso', status: 'offen', weg: 'Gleicher Stand wie bei Borm: Anbindungen an CAD und Maschinen sind belegt, eine offene Schnittstelle für Offerten nicht. Ich frage beim Hersteller an.' },
    { name: 'WhatsApp Business und Mail', status: 'ja', weg: 'Sprachnachrichten und Fotos kommen über die WhatsApp Business Platform von Meta oder per Mail an. Die normale WhatsApp-Business-App hat keine offene Schnittstelle.' },
    { name: 'Word, Excel und Ihre Preisliste', status: 'ja', weg: 'Gibt es keinen Weg in Ihr Programm, entsteht der Entwurf als Word- oder PDF-Datei mit Ihrer Vorlage und Ihren Preisen.' },
  ],
  programmeQuellen: [
    ['bexio API', 'https://docs.bexio.com/'],
    ['Abacus REST-API', 'https://downloads.abacus.ch/fileadmin/ablage/abaconnect/htmlfiles/docs/restapi/abacus_authorization_rest_api.html'],
    ['HOMAG: Anbindungen von Borm und Triviso', 'https://www.homag.com/en/features/schnittstellen-productionmanager'],
    ['Meta: WhatsApp Business Platform', 'https://developers.facebook.com/docs/whatsapp/'],
  ],
  programmeCheck: true,
  programme: ['WhatsApp Business', 'Mail', 'bexio', 'Abacus', 'Borm', 'Triviso', 'Word-Vorlage', 'Excel-Vorlage'],
  aufwand: 'Fällt die KI aus, schreiben Sie Offerten wie heute. Typischer Start: eine Art von Offerte und Ihre bestehende Preisliste.',
  abschluss: {
    title: 'Wie viele Offerten tippen Sie pro Woche ab?',
    text: 'Erzählen Sie mir kurz, wie es heute läuft. Ich sage Ihnen ehrlich, ob sich das lohnt.',
    buttons: [
      { href: 'kontakt/?thema=handwerk', label: 'KI-Check anfragen' },
      { href: 'ki/?demo=baustelle#demo', label: 'Demo ausprobieren', variant: 'secondary' },
    ],
  },
});
