'use strict';
// Referenzen (V4-KONZEPT 2.7, V4-TEXTE 17). Gruppe: Websites und Referenzen.
// Zahlen kommen aus site.json (referenzen.zahlen), gezaehlt mit _src/count-leads.js. Keine Namen von Betrieben.

exports.meta = {
  path: 'referenzen/',
  nav: 'referenzen',
  css: ['websites'],
  title: 'Referenzen und Fallstudie | {{marke}}',
  description: 'Fallstudie mit echten Zahlen aus dem eigenen Betrieb. Dazu KI-Lösungen für KMU, jede mit einem Beispiel zum Durchklicken, und Website-Beispiele.',
};

const LOESUNG = [
  { title: 'Recherche', text: 'KI-Agenten suchen Betriebe einer Branche und Region und prüfen, ob sie noch aktiv sind.' },
  { title: 'Prüfung', text: 'Handy-Tauglichkeit, Sicherheit (HTTPS), Aktualität und Inhalte der Website. Jeder Befund mit Beleg.' },
  { title: 'Regeln', text: 'Wer im Telefonbuch «Wünscht keine Werbung» eingetragen hat oder Werbung ablehnt, wird nicht angeschrieben.' },
  { title: 'Entwurf', text: 'Für passende Betriebe entsteht eine Website-Demo mit zwei Designs, automatisch auf Handy und Computer geprüft.' },
  { title: 'Mail', text: 'Ein persönlicher Entwurf nennt nur belegte Befunde.' },
  { title: 'Freigabe', text: 'Ich prüfe jede Mail und sende sie selbst. Antworten werden jeden Abend automatisch überwacht.', decide: true },
];

// Loesungen, die Codani fuer KMU baut (Karten mit Link auf die Detailseite samt Beispiel zum Ausprobieren).
const BAUE = [
  { icon: 'mail', title: 'Antwortentwürfe im Postfach', text: 'Die KI liest neue Anfragen, erkennt das Anliegen und legt einen Entwurf in Ihrem Ton bereit. Ihr Team prüft und sendet.', href: 'ki/e-mail/', linkLabel: 'Beispiel ansehen' },
  { icon: 'kalender', title: 'Terminvorschläge und Erinnerungen', text: 'Die KI erkennt Terminwünsche, schaut in Ihren Kalender und schlägt freie Zeiten vor. Auf Wunsch erinnert sie Kunden am Vortag.', href: 'ki/kalender/', linkLabel: 'Beispiel ansehen' },
  { icon: 'dokument', title: 'Belege und PDFs auslesen', text: 'Lieferscheine, Rechnungen und Formulare werden gelesen, geprüft und als Tabelle oder Buchungsvorschlag vorbereitet.', href: 'ki/dokumente/', linkLabel: 'Beispiel ansehen' },
  { icon: 'liste', title: 'Anfragen aus allen Kanälen in einer Liste', text: 'Telefonnotiz, Mail, Formular und WhatsApp landen sortiert an einem Ort, mit Dringlichkeit und nächstem Schritt.', href: 'ki/kunden/', linkLabel: 'Beispiel ansehen' },
  { icon: 'werkzeug', title: 'Offertentwurf aus der Sprachnachricht', text: 'Für Handwerksbetriebe: Masse und Wünsche von der Baustelle werden zum Offertentwurf mit Ihren Preisen.', href: 'branchen/handwerk/', linkLabel: 'Beispiel ansehen' },
  { icon: 'haus', title: 'Mieteranfragen und Schadenmeldungen', text: 'Für Verwaltungen: Anfragen landen geordnet in einer Liste. Die KI sucht die Antwort in Ihren Unterlagen und schlägt einen Text vor.', href: 'branchen/verwaltung/', linkLabel: 'Beispiel ansehen' },
];

exports.render = (ctx) => {
  const c = ctx.c;
  const t = ctx.t;
  const z = ctx.site.referenzen.zahlen;
  return [
    c.hero({
      eyebrow: 'Referenzen',
      title: 'Referenzen: gebaut, gezählt und zum Ausprobieren.',
      lead: 'Eine Fallstudie aus dem eigenen Betrieb mit gezählten Zahlen. Dazu die Lösungen, die ich für KMU baue, jede mit einem Beispiel zum Durchklicken.',
      line: 'Fallstudie · KI-Lösungen · Website-Beispiele',
    }),
    c.section({
      id: 'fallstudie',
      head: { eyebrow: 'Fallstudie · eigener Betrieb', title: 'Ein KI-Workflow, der für mich Kunden sucht.' },
      body: [
        '<div class="rfall">',
        '<div class="rfall__text" data-reveal>',
        '<h3 class="t-h3">Ausgangslage</h3>',
        '<p>Betriebe einzeln recherchieren, ihre Websites prüfen und persönliche Mails schreiben kostet viele Stunden. Genau diese Art von wiederkehrender Arbeit kann KI vorbereiten.</p>',
        '<h3 class="t-h3">Lösung</h3>',
        '<p>Ein Ablauf aus mehreren KI-Agenten, der von der Recherche bis zum fertigen Mailentwurf alles vorbereitet. Am Schluss entscheide ich.</p>',
        '</div>',
        c.refEintrag(),
        '</div>',
        c.steps(LOESUNG, { decideLabel: 'Ich gebe frei', cls: 'rsteps' }),
      ].join('\n'),
    }),
    c.section({
      id: 'zahlen', tone: 'soft',
      head: { eyebrow: 'Zahlen', title: 'Gezählt, nicht geschätzt.', intro: t('Zeitraum {{ref_zeitraum}}. Nur Summen aus der eigenen Firmenliste, keine Namen.') },
      body: [
        '<div class="rzahlen">',
        c.refBalken(),
        '<div class="rzahlen__side">',
        c.stat({ value: String(z.befunde), label: 'belegte Befunde', sub: t('{{ref_befunde_min}} bis {{ref_befunde_max}} pro Betrieb, jeder mit Quelle') }),
        c.stat({ value: '<span class="rstat-text">am selben Tag</span>', label: 'erste Rückmeldung zum Design', sub: 'nach dem Versand' }),
        '</div>',
        '</div>',
      ].join('\n'),
    }),
    c.section({
      id: 'gelernt',
      head: { eyebrow: 'Gelernt', title: 'Was ich daraus gelernt habe.' },
      body: [
        '<ol class="rlearn">',
        '<li data-reveal><h3 class="t-h3">KI ist schnell, aber nicht unfehlbar.</h3><p>In zwei Fällen hat die erste Suche einen Werbesperrvermerk übersehen. Die zweite Prüfung hat ihn gefunden, beide Betriebe wurden nicht angeschrieben. Darum gibt es bei mir immer eine zweite Prüfung, bevor etwas hinausgeht.</p></li>',
        '<li data-reveal><h3 class="t-h3">Belege statt Behauptungen.</h3><p>In die Mails kam nur, was mit Quelle belegt war.</p></li>',
        '<li data-reveal><h3 class="t-h3">Der Mensch bleibt am Schluss.</h3><p>Keine Mail ging ohne meine Freigabe hinaus.</p></li>',
        '</ol>',
        `<div class="sec__foot rlearn__foot">${c.principle('Dieselben Bausteine stecken in vielen Büroarbeiten: Informationen suchen, nach Regeln prüfen, einen Entwurf mit Belegen schreiben und vor dem Versand freigeben.', { sub: 'Ob Offerten, Anfragen oder Belege, der Ablauf ist ähnlich.' })}</div>`,
        `<p class="note">Namen der Betriebe nenne ich nicht. Sie haben einer Nennung nicht zugestimmt. ${c.more({ href: 'ki/', label: 'Was KI in Ihrem Betrieb vorbereiten kann' })}</p>`,
      ].join('\n'),
    }),
    c.section({
      id: 'loesungen', tone: 'soft',
      head: { eyebrow: 'KI-Lösungen', title: 'Das baue ich für Ihren Betrieb.', intro: 'Sechs Abläufe, die in vielen KMU täglich Zeit kosten. Zu jedem gibt es ein Beispiel, das Sie Schritt für Schritt durchklicken können.' },
      body: [
        c.cards(BAUE, { cols: 3 }),
        `<p class="sec__foot">${c.more({ href: 'ki/', label: 'Alle KI-Lösungen im Überblick' })}${c.more({ href: 'ki/#ablauf', label: 'So läuft ein Projekt ab' })}</p>`,
      ].join('\n'),
    }),
    ctx.site.pilotangebot && ctx.site.pilotangebot.plaetze ? c.section({
      id: 'pilot', tone: 'warm',
      label: 'Pilotangebot',
      body: `<div class="pilot-karte" data-reveal>
        <p class="t-eyebrow">Pilotangebot</p>
        <h2 class="t-h2">${t('KI-Check {{pilot_rabatt}} günstiger für {{pilot_plaetze}} Pilotbetriebe.')}</h2>
        <p class="t-lead">Für Betriebe, die ihre Lösung als Fallstudie mit Zahlen begleiten lassen.</p>
        <div class="pilot-angebot">
          <p class="pilot-angebot__frei">Noch ${ctx.esc(ctx.site.pilotangebot.frei === undefined ? ctx.site.pilotangebot.plaetze : ctx.site.pilotangebot.frei)} Plätze frei.</p>
          <dl class="pilot-angebot__liste">
            <div><dt>Sie erhalten</dt><dd>${t('Den KI-Check für {{preis_ki_check_pilot}} statt {{preis_ki_check}}. Dazu persönliche Begleitung im Pilot und eine Auswertung mit Zahlen aus Ihrem Alltag.')}</dd></div>
            <div><dt>Ich bitte Sie um</dt><dd>Offene Rückmeldung während des Pilots. Sind Sie zufrieden, eine Nennung mit kurzem Zitat. Ohne Ihre schriftliche Zustimmung veröffentliche ich nichts.</dd></div>
            <div><dt>Erfolgsziel</dt><dd>Vor dem Start legen wir fest, woran wir den Erfolg messen, zum Beispiel wie viele Entwürfe ohne grosse Änderung passen und wie viele Minuten pro Fall wegfallen. Wird das Ziel nicht erreicht, hören wir auf. Sie bezahlen nur den vereinbarten Pilotpreis.</dd></div>
          </dl>
        </div>
        ${c.btns([{ href: 'kontakt/?thema=pilot', label: 'Pilotbetrieb werden' }, { href: 'ki/#ablauf', label: 'Ablauf eines Pilots', variant: 'secondary' }])}
      </div>`,
    }) : '',
    c.section({
      id: 'websites', tone: 'stage',
      head: { eyebrow: 'Websites', title: 'Musterbeispiele für Websites.', intro: 'Diese Beispiele zeigen Aufbau und Stil. Die Betriebe sind erfunden.' },
      body: [
        c.webMusterKarten(['fahrschule', 'schreinerei-a', 'treuhand']),
        `<p class="sec__foot">${c.more({ href: 'websites/', label: 'Zu den Websites' })}</p>`,
      ].join('\n'),
    }),
    c.kontaktBlock(),
  ].join('\n');
};
