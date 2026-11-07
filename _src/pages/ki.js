'use strict';
// KI-Integration (V4-KONZEPT 2.2, V4-TEXTE 4 und 5). Gruppe: KI-Seiten.

exports.meta = {
  path: 'ki/',
  nav: 'ki',
  css: ['ki', 'ki-mockups', 'demo'],
  js: ['demo'],
  title: 'KI-Integration für KMU | {{marke}}',
  description: 'KI für Ihren Betrieb: Antwortentwürfe, Terminvorschläge, Daten aus Belegen. In Ihren Programmen, in vier Stufen, mit offenen Preisen und Demo.',
};

const FAQ = [
  { id: 'ersetzt', q: 'Ersetzt KI bei uns Mitarbeitende?', a: 'Nein, das ist nicht das Ziel. KI entlastet Ihr Team, sie ersetzt niemanden. Sie übernimmt Abtippen, Sortieren und erste Entwürfe. Die gewonnene Zeit fliesst in Gespräche mit Kunden, in Facharbeit oder in weniger Überstunden. Wie Sie sie nutzen, entscheiden Sie.' },
  { id: 'kosten', q: 'Was kostet eine KI-Lösung?', a: 'Der KI-Check kostet fix {{preis_ki_check}}. Ein Pilot beginnt bei {{preis_pilot_ab}}, eine Einführung liegt meist bei {{preis_einfuehrung}}. Im Betrieb zahlen Sie ab {{preis_betrieb_ab}} plus die KI-Nutzung nach Verbrauch, typisch {{ki_nutzung}}. Das sind Richtwerte, verbindlich ist die Offerte. Mehrwertsteuer kommt keine dazu.' },
  { id: 'daten', q: 'Wo liegen unsere Daten?', a: 'Ihre Daten bleiben in Ihren Programmen, zum Beispiel in Outlook oder bexio. Auch die Lösung selbst läuft in Ihrem Konto, nicht bei mir. Zur KI geht nur der Text, der für eine Aufgabe nötig ist, und zwar standardmässig {{daten_standard}}. Etwas anderes nur mit Ihrer schriftlichen Zustimmung, pro Fall. Details stehen auf der Seite Datenschutz und Sicherheit.' },
  { id: 'vertraulich', q: 'Sehen Sie im KI-Check unsere Kunden- oder Mandantendaten?', a: 'Nein. Im KI-Check besprechen wir Abläufe und arbeiten mit Musterbelegen oder erfundenen Beispielen. Auf Wunsch unterschreibe ich vor dem ersten Gespräch eine Vertraulichkeitserklärung. Echte Kundendaten kommen erst im Pilot dazu, nach dem unterschriebenen Vertrag zur Auftragsbearbeitung.' },
  { id: 'training', q: 'Trainiert die KI mit unseren Daten?', a: 'Nein. Ich setze nur Geschäftsangebote ein, deren Bedingungen das Training mit Ihren Daten ausschliessen, zum Beispiel von OpenAI, Anthropic, Microsoft und Google, solange Sie nicht ausdrücklich zustimmen. Bei Gratis-Versionen für Privatpersonen kann das anders sein. Darum nutze ich sie für Ihre Daten nicht. Die Quellen stehen auf der Seite Sicherheit.' },
  { id: 'fehler', q: 'Was passiert, wenn die KI einen Fehler macht?', a: 'Das kommt vor. KI kann etwas falsch verstehen oder eine Angabe erfinden. Darum schreibt sie nur Entwürfe, und ein Mensch prüft vor dem Versand. Ich richte sie so ein, dass sie fehlende Angaben als Frage markiert, statt zu raten. Ganz verhindern lassen sich Fehler nicht. Im Pilot messen wir, wie oft die Entwürfe passen.' },
  { id: 'ausfall', q: 'Was passiert, wenn die KI oder ein Anbieter ausfällt?', a: 'Dann arbeiten Sie wie heute weiter. Ihre Mails, Termine und Dokumente bleiben in Ihren Programmen, die KI liefert nur Entwürfe dazu. Jede Lösung lässt sich mit einem Schalter abschalten. Bei Fehlern erhalte ich automatisch eine Meldung.' },
  { id: 'lehre', q: 'Wer hilft, wenn Sie in der Lehre sind?', a: 'Tagsüber bin ich in der Lehre und meist erst am Abend erreichbar. Ich antworte {{reaktionszeit}}. Eine Stellvertretung habe ich nicht, das sage ich offen. Darum baue ich jede Lösung so, dass Ihr Betrieb auch ohne sie läuft, dokumentiere alles und übergebe Ihnen den Code. Ihr IT-Partner kann jederzeit übernehmen.' },
  { id: 'copilot', q: 'Warum nicht einfach Microsoft 365 Copilot?', a: 'Copilot ist eine Lizenz pro Person. Er hilft Einzelnen beim Schreiben, Zusammenfassen und Suchen, wenn sie ihn selbst aufrufen. Eine Lösung von mir ist ein fester Ablauf für das Team: Sie arbeitet jede neue Anfrage von selbst ab, nach Ihren Regeln und mit Ihren Quellen, und legt den Entwurf zur Freigabe dort ab, wo Ihr Team arbeitet. Beides lässt sich kombinieren. Haben Sie Copilot schon, prüfe ich im KI-Check ehrlich, ob er für Ihren Fall reicht.' },
  { id: 'programme', q: 'Funktioniert das mit unseren Programmen?', a: 'Oft ja. Outlook, Microsoft 365, Google Workspace, bexio und Abacus bieten Schnittstellen. Bei Branchensoftware hängt es davon ab, ob sie eine hat. Wenn nicht, gibt es oft einen Weg über Export und Import. Das kläre ich im KI-Check, bevor Sie etwas bestellen.' },
  { id: 'geraete', q: 'Brauchen wir neue Geräte oder Software?', a: 'Meistens nicht. Die Lösung arbeitet mit Ihren bestehenden Programmen. Für die KI braucht es ein Konto bei einem Anbieter, am besten auf Ihren Namen. Dann sehen Sie jede Rechnung selbst und behalten die Kontrolle.' },
  { id: 'alter', q: 'Sie sind erst {{alter}}. Warum sollten wir Ihnen Firmendaten anvertrauen?', a: 'Eine berechtigte Frage. Darum ist bei mir alles schriftlich: Offerte, Vertrag zur Auftragsbearbeitung nach Schweizer Datenschutzgesetz und Dokumentation. Weil ich minderjährig bin, unterschreiben meine Eltern als gesetzliche Vertretung mit. Ich erhalte nur die Zugriffe, die eine Aufgabe braucht, und Sie können sie jederzeit entziehen. Und Sie beginnen mit einem kleinen Check zum Fixpreis, nicht mit einem grossen Projekt.' },
];

const PROGRAMME = [
  { title: 'Outlook und Microsoft 365', text: 'Mails, Kalender und Dateien in OneDrive oder SharePoint, über die offizielle Schnittstelle von Microsoft.' },
  { title: 'Google Workspace', text: 'Gmail, Google Kalender und Google Drive.' },
  { title: 'bexio', text: 'Kontakte, Offerten und Rechnungen über die Schnittstelle von bexio.' },
  { title: 'Abacus', text: 'Über die Schnittstelle von Abacus, wenn sie bei Ihnen eingerichtet ist. Das klären wir mit Ihrem Abacus-Partner.' },
  { title: 'Excel', text: 'Tabellen lesen und füllen, als Datei oder in Microsoft 365.' },
  { title: 'WhatsApp Business', text: 'Über die WhatsApp Business Platform von Meta. Die normale WhatsApp-Business-App auf dem Handy hat keine offene Schnittstelle.' },
  { title: 'Branchensoftware', text: 'Wenn sie eine Schnittstelle hat. Sonst oft über Export und Import, zum Beispiel als Excel- oder CSV-Datei.' },
];

exports.render = (ctx) => {
  const c = ctx.c;
  const t = ctx.t;
  const fluss = { handwerk: ['mikro', 'funke', 'dokument'], treuhand: ['dokument', 'funke', 'rechner'], verwaltung: ['chat', 'funke', 'mail'] };
  const programme = `<dl class="prog" data-reveal>${PROGRAMME.map((x) => `<div class="prog__item"><dt>${x.title}</dt><dd>${x.text}</dd></div>`).join('')}</dl>`;
  return [
    c.hero({
      variant: 'stage',
      cls: 'hero--ki',
      eyebrow: 'KI-Integration',
      title: 'KI im Betrieb: weniger Abtippen, mehr Zeit für Kunden.',
      lead: 'Ich richte KI so ein, dass sie in Ihren bestehenden Programmen Entwürfe vorbereitet. Ihr Team prüft und entscheidet. Sie beginnen klein, sehen den Nutzen und entscheiden dann, ob es weitergeht.',
      buttons: [
        { href: 'kontakt/?thema=ki-check', label: 'KI-Check anfragen' },
        { href: '#demo', label: 'Demo ausprobieren', variant: 'secondary' },
      ],
      line: t('KI-Check {{preis_ki_check}} fix · Mensch entscheidet · Jederzeit abschaltbar'),
      media: c.kiBuehne(),
    }),
    `<nav class="sprung" aria-label="Auf dieser Seite"><div class="wrap"><ul class="sprung__liste">${[
      ['#anwendungen', 'Anwendungen'], ['#demo', 'Demo'], ['#ablauf', 'Ablauf'], ['#preise', 'Preise'], ['#fragen', 'Fragen'],
    ].map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}<li><a href="${ctx.url('sicherheit/')}">Sicherheit</a></li><li><a href="${ctx.url('unterlagen/')}">Unterlagen</a></li></ul></div></nav>`,
    c.section({
      id: 'anwendungen',
      head: { eyebrow: 'Anwendungen', title: 'Was die KI für Sie vorbereitet.', intro: 'Die KI liest, sortiert und schreibt Entwürfe in Ihren Programmen. Ihr Team prüft und entscheidet.' },
      body: [
        c.tiles([
          { icon: 'mail', title: 'E-Mail', text: 'Antwortentwürfe für häufige Anfragen, direkt in Ihrem Entwurfsordner.', href: 'ki/e-mail/', html: c.kiMiniMock('mail') },
          { icon: 'kalender', title: 'Kalender', text: 'Terminvorschläge aus Ihren freien Zeiten und Erinnerungen an Kunden.', href: 'ki/kalender/', html: c.kiMiniMock('kalender') },
          { icon: 'dokument', title: 'Dokumente', text: 'Angaben aus PDFs, Lieferscheinen und Belegen auslesen und übertragen.', href: 'ki/dokumente/', html: c.kiMiniMock('dokument') },
          { icon: 'kunden', title: 'Kunden', text: 'Anfragen aus Telefon, Mail und WhatsApp in einer Liste.', href: 'ki/kunden/', html: c.kiMiniMock('kunden') },
        ], { cls: 'tiles--mini' }),
        `<div class="sec__foot">${c.cards([
          { icon: 'funke', title: 'Wissen', text: 'Antworten auf Fragen zu Ihren eigenen Vorlagen, Reglementen und Verträgen, mit Verweis auf die Quelle.' },
          { icon: 'liste', title: 'Berichte', text: 'Rapporte, Protokolle und Notizen zusammenfassen.' },
        ], { cols: 2, cls: 'cards--soft cards--row' })}</div>`,
        `<p class="sec__foot ki-branchenzeile">Beispiele nach Branche: <a class="text-link" href="${ctx.url('branchen/handwerk/')}">Handwerk</a> · <a class="text-link" href="${ctx.url('branchen/treuhand/')}">Treuhand und Büro</a> · <a class="text-link" href="${ctx.url('branchen/verwaltung/')}">Verwaltung</a></p>`,
      ].join('\n'),
    }),
    c.section({
      id: 'liste', width: 'wide',
      body: `<div class="ki-angebot">
        <div class="ki-angebot__text" data-reveal>
          ${c.eyebrow('Angebot')}
          <h2 class="t-h2" id="liste-t">Anfragen aus Telefon, Mail und WhatsApp in einer Liste.</h2>
          <p class="t-lead">In vielen Betrieben kommen Anfragen über drei, vier Kanäle und gehen im Alltag unter. Die KI sammelt sie in einer Liste, erkennt das Anliegen und schlägt vor, wer es übernimmt. Ihr Team sieht auf einen Blick, was offen ist.</p>
          ${c.list(['Jede Anfrage mit Kanal, Anliegen, Dringlichkeit und Zuständigkeit.', 'Wo es passt, liegt ein Antwortentwurf bereit.', 'Nichts geht verloren, auch wenn jemand in den Ferien ist.'])}
          <p class="sec__foot">${c.more({ href: 'ki/kunden/', label: 'So funktioniert die Liste' })}</p>
        </div>
        <div class="mk-stage stage" data-reveal>${c.badge('beispiel')}${c.kiMockListe({ mehr: true })}</div>
      </div>`,
      label: 'Angebot: Anfragen in einer Liste',
    }),
    c.section({
      id: 'demo', tone: 'stage', width: 'wide',
      head: { eyebrow: 'Demo', title: 'So arbeitet die KI mit. Probieren Sie es aus.', intro: 'Wählen Sie ein Beispiel. Der Assistent zeigt Schritt für Schritt, was die KI vorbereitet und wo Ihr Team entscheidet.' },
      body: [
        c.demoAssistent({ id: 'demo-ki', szenen: ['email', 'baustelle', 'beleg', 'sonderfall', 'mieter'] }),
        '<p class="note ki-demo-note">Hier arbeitet keine echte KI. Die Antworten sind vorbereitet. Es wird nichts gesendet und nichts gespeichert.</p>',
        `<p class="sec__foot ki-demo-foot">So ähnlich läuft es im Pilot, nur mit Ihren echten Abläufen, Vorlagen und Preisen. ${c.more({ href: 'kontakt/?thema=ki-check', label: 'KI-Check anfragen' })}</p>`,
      ].join('\n'),
    }),
    c.section({
      id: 'ablauf',
      head: { eyebrow: 'Ablauf', title: 'In vier Stufen, mit Ausstieg nach jeder Stufe.', intro: 'Sie wissen jederzeit, was Sie tun, was ich tue und was es kostet.' },
      body: [
        c.steps([
          { title: 'KI-Check', parts: [
            ['Sie', 'Zeigen mir in einem Gespräch, bei Ihnen oder per Video, wie die Arbeit heute läuft. Rund anderthalb Stunden.'],
            ['Ich', 'Schaue mir zwei bis drei Abläufe genau an, schätze Nutzen, Aufwand und Risiken und prüfe den Datenschutz.'],
            ['Ergebnis', 'Ein kurzer Bericht mit Empfehlung und einem Fixpreis für den Pilot. Er gehört Ihnen, auch wenn Sie nicht weitermachen.'],
            ['Ihr Aufwand', 'Rund anderthalb Stunden für das Gespräch.'],
            ['Dauer', 'Bericht innert zwei Wochen nach dem Gespräch.'],
            ['Preis', t('Fixpreis {{preis_ki_check}} ({{ki_check_stunden}} Stunden)')],
          ] },
          { title: 'Pilot', parts: [
            ['Sie', 'Bestimmen ein bis drei Personen, die die KI im Alltag testen und ehrlich Rückmeldung geben.'],
            ['Ich', 'Baue einen Ablauf, verbinde ihn mit einem Programm und messe mit Ihnen, wie oft die Entwürfe passen und wie viel Zeit Sie sparen.'],
            ['Ergebnis', 'Zahlen aus Ihrem eigenen Alltag statt Versprechen. Reicht der Nutzen nicht, hören wir auf.'],
            ['Ihr Aufwand', 'Start 1 Stunde, dann rund 15 Minuten pro Person und Woche für Rückmeldungen, Auswertung 1 Stunde.'],
            ['Dauer', 'Rund vier Wochen Testbetrieb.'],
            ['Preis', t('ab {{preis_pilot_ab}}')],
          ] },
          { title: 'Einführung', parts: [
            ['Sie', 'Entscheiden, welche Abläufe und welche Personen dazukommen.'],
            ['Ich', 'Baue die Lösung aus, mache die Verbindungen stabil, schule Ihr Team und schreibe die Dokumentation.'],
            ['Ergebnis', 'Eine Lösung im Alltag, die Ihr Team versteht und selbst abschalten kann.'],
            ['Ihr Aufwand', 'Schulung und Abnahme, je rund 1 Stunde pro Team.'],
            ['Dauer', 'Den Zielmonat sehen Sie in der Offerte.'],
            ['Preis', t('{{preis_einfuehrung}}, als Fixpreis in der Offerte')],
          ] },
          { title: 'Betrieb', parts: [
            ['Sie', 'Melden Wünsche und Fehler per Mail.'],
            ['Ich', 'Überwache die Abläufe, passe sie an, wenn sich ein Programm ändert, und bin Ihre Ansprechperson.'],
            ['Ergebnis', 'Die Lösung bleibt aktuell. Code und Dokumentation gehören Ihnen.'],
            ['Ihr Aufwand', 'Wünsche und Fehler melden, sonst keiner.'],
            ['Dauer', 'Auf Ende jedes Monats kündbar.'],
            ['Preis', t('ab {{preis_betrieb_ab}} plus KI-Nutzung nach Verbrauch, typisch {{ki_nutzung}}')],
          ] },
        ], { cls: 'steps--ki' }),
        '<p class="ki-ausstieg"><span class="chip chip--sie">Sie entscheiden</span> Nach jeder Stufe entscheiden Sie, ob es weitergeht.</p>',
        `<p class="sec__foot">${c.more({ href: 'preise/', label: 'Alle Preise im Detail' })}</p>`,
      ].join('\n'),
    }),
    c.section({
      id: 'programme', tone: 'soft',
      head: { eyebrow: 'Programme', title: 'Mit diesen Programmen arbeitet die KI zusammen.', intro: 'Immer unter einer Bedingung: Das Programm muss eine Schnittstelle bieten. Ob und wie gut das bei Ihnen klappt, prüfe ich im KI-Check, bevor Sie etwas bestellen.' },
      body: [
        programme,
        '<div class="sec__foot ki-datenweg stage">',
        '<h3 class="t-h3 ki-datenweg__t" data-reveal>So läuft eine Aufgabe durch die Lösung.</h3>',
        c.kiDatenweg(),
        `<p class="sec__foot">${c.more({ href: 'sicherheit/#loesung', label: 'Wo die Lösung läuft und was bei mir liegt' })}</p>`,
        '</div>',
      ].join('\n'),
    }),
    c.section({
      id: 'branchen',
      head: { eyebrow: 'Branchen', title: 'So sieht das in Ihrer Branche aus.', intro: 'Alle Beispiele mit erfundenen Daten. Ein Mensch prüft und entscheidet immer.' },
      body: c.cards(c.KI_BRANCHEN.map((b) => ({ ...b, html: c.kiFluss(fluss[b.key]), linkLabel: 'Beispiel ansehen' })), { cols: 3, cls: 'cards--fluss' }),
    }),
    c.section({
      id: 'grundsaetze', tone: 'warm',
      head: { eyebrow: 'Grundsätze', title: 'Fünf Regeln für jede Lösung.' },
      body: [
        c.list([
          '<strong>Mensch entscheidet.</strong> Die KI schreibt Entwürfe. Was Ihren Betrieb verlässt, gibt ein Mensch frei.',
          '<strong>So wenig Daten wie nötig.</strong> Die KI erhält nur, was eine Aufgabe braucht.',
          '<strong>Jederzeit abschaltbar.</strong> Ein Schalter genügt, dann arbeiten Sie wie heute weiter.',
          '<strong>Offen gelegt.</strong> Sie wissen schriftlich, welcher Anbieter welche Daten erhält und wo.',
          '<strong>Ihnen gehört die Lösung.</strong> Code und Dokumentation gehören nach der Bezahlung Ihnen.',
        ], { style: 'num', cls: 'ki-regeln' }),
        `<div class="sec__foot">${c.cards([
          { icon: 'schild', title: 'Datenschutz und Sicherheit', text: 'Wo Ihre Daten liegen, welche Anbieter ich einsetze und warum nicht mit Ihren Daten trainiert wird.', href: 'sicherheit/', linkLabel: 'Zur Seite Sicherheit' },
          { icon: 'schalter', title: 'Betrieb und Support', text: 'Reaktionszeit, was bei einem Ausfall passiert und wer übernehmen kann.', href: 'support/', linkLabel: 'Zur Seite Support' },
        ], { cols: 2, cls: 'cards--white' })}</div>`,
      ].join('\n'),
    }),
    c.section({
      id: 'preise',
      head: { eyebrow: 'Preise', title: 'Was es kostet.' },
      body: c.priceStrip(['ki-check', 'pilot', 'einfuehrung', 'betrieb', 'nutzung']),
    }),
    c.section({
      id: 'fragen', tone: 'soft',
      head: { eyebrow: 'Häufige Fragen', title: 'Fragen zu KI, ehrlich beantwortet.' },
      body: c.faq(FAQ.map((f) => ({ ...f, q: t(f.q), a: t(f.a) })), { name: 'faq-ki' }),
    }),
    c.ctaBand({
      title: 'Wo verlieren Sie heute am meisten Zeit?',
      text: 'Schreiben Sie mir zwei, drei Sätze dazu. Ich sage Ihnen ehrlich, ob KI dort hilft.',
      buttons: [{ href: 'kontakt/?thema=ki-check', label: 'KI-Check anfragen' }],
    }),
  ].join('\n');
};
