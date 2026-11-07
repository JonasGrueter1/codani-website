'use strict';
// Referenzen (V4-KONZEPT 2.7, V4-TEXTE 17). Gruppe: Websites und Referenzen.
// Zahlen kommen aus site.json (referenzen.zahlen), gezaehlt mit _src/count-leads.js. Keine Namen von Betrieben.

exports.meta = {
  path: 'referenzen/',
  nav: 'referenzen',
  css: ['websites'],
  title: 'Referenzen und Fallstudie | {{marke}}',
  description: 'Fallstudie mit echten Zahlen: ein KI-Workflow, der Betriebe analysiert, Website-Entwürfe baut und persönliche Mails vorbereitet. Dazu Musterbeispiele.',
};

const LOESUNG = [
  { title: 'Recherche', text: 'KI-Agenten suchen Betriebe einer Branche und Region und prüfen, ob sie noch aktiv sind.' },
  { title: 'Prüfung', text: 'Handy-Tauglichkeit, Sicherheit (HTTPS), Aktualität und Inhalte der Website. Jeder Befund mit Beleg.' },
  { title: 'Regeln', text: 'Wer im Telefonbuch «Wünscht keine Werbung» eingetragen hat oder Werbung ablehnt, wird nicht angeschrieben.' },
  { title: 'Entwurf', text: 'Für passende Betriebe entsteht eine Website-Demo mit zwei Designs, automatisch auf Handy und Computer geprüft.' },
  { title: 'Mail', text: 'Ein persönlicher Entwurf nennt nur belegte Befunde.' },
  { title: 'Freigabe', text: 'Ich prüfe jede Mail und sende sie selbst. Antworten werden jeden Abend automatisch überwacht.', decide: true },
];

// Labortests mit erfundenen Daten (Testkunden Runde 2). status: geplant, laeuft, fertig. ergebnis erst mit echten Zahlen.
const LABOR_STATUS = { geplant: 'Geplant', laeuft: 'Läuft', fertig: 'Abgeschlossen' };
const LABOR = [
  { status: 'geplant', titel: 'Microsoft 365: Antwortentwürfe in einem Testkonto', text: 'Ein Prototyp in einer Testumgebung von Microsoft 365, mit Azure OpenAI in der Region Schweiz. Eine Testmail kommt an, der Entwurf liegt danach im Entwurfsordner. Die App darf nur auf ein Postfach zugreifen.', mass: 'ob die Beschränkung auf ein Postfach hält, wie lange ein Entwurf dauert. Dazu ein kurzes Bildschirmvideo und die Liste der Berechtigungen.' },
  { status: 'geplant', titel: 'Treuhand: 50 Musterbelege', text: 'Fünfzig erfundene Belege nach KMU-Kontenrahmen, darunter Fremdwährung, neue Lieferanten und Privatanteile.', mass: 'wie viele richtig kontiert, wie viele richtig als Sonderfall markiert und wie viele falsch.' },
  { status: 'geplant', titel: 'Handwerk: 10 Sprachnachrichten in Mundart', text: 'Zehn selbst aufgenommene Sprachnachrichten von einer Besichtigung, wie sie in einer Schreinerei vorkommen.', mass: 'wie viele Positionen und Masse richtig erkannt werden und wie viele Minuten ein Offertentwurf danach noch braucht.' },
];

exports.render = (ctx) => {
  const c = ctx.c;
  const t = ctx.t;
  const z = ctx.site.referenzen.zahlen;
  return [
    c.hero({
      eyebrow: 'Referenzen',
      title: 'Referenzen: was ich gebaut habe, mit echten Zahlen.',
      lead: 'Ehrlich vorweg: Mein erster KI-Pilot bei einem Kunden ist in Vorbereitung. Bis dahin zeige ich, was ich für meinen eigenen Betrieb gebaut habe.',
      line: 'Fallstudie · Musterbeispiele · Erster Pilot in Vorbereitung',
    }),
    c.section({
      id: 'fallstudie',
      head: { eyebrow: 'Fallstudie · eigener Betrieb', title: 'Ein KI-Workflow, der für mich Kunden sucht.' },
      body: [
        '<div class="rfall">',
        '<div class="rfall__text" data-reveal>',
        '<h3 class="t-h3">Ausgangslage</h3>',
        '<p>Neben der Lehre habe ich keine Zeit, Betriebe einzeln zu recherchieren, ihre Websites zu prüfen und persönliche Mails zu schreiben. Genau diese Art von wiederkehrender Arbeit kann KI vorbereiten.</p>',
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
        `<p class="note">${t('Antworten bisher: {{ref_antworten}}. Die letzten Mails sind erst wenige Tage alt.')}</p>`,
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
      id: 'pilot', tone: 'warm',
      label: 'Erster KI-Pilot bei einem Kunden',
      body: `<div class="pilot-karte" data-reveal>
        <p class="t-eyebrow">In Vorbereitung</p>
        <h2 class="t-h2">Erster KI-Pilot bei einem Kunden: in Vorbereitung.</h2>
        <p class="t-lead">Sobald er läuft und der Betrieb zustimmt, stehen hier Ergebnisse mit Zahlen.</p>
        <ul class="pilot-karte__plan" aria-label="Was hier später steht">
          <li><span>Ausgangslage</span></li><li><span>Lösung</span></li><li><span>Ergebnis mit Zahlen</span></li><li><span>Aussage des Betriebs, mit Freigabe</span></li>
        </ul>
        ${ctx.site.pilotangebot && ctx.site.pilotangebot.plaetze ? `<div class="pilot-angebot">
          <h3 class="t-h3">${t('Angebot für die ersten {{pilot_plaetze}} Pilotbetriebe.')}</h3>
          <p class="pilot-angebot__frei">Stand heute: noch ${ctx.esc(ctx.site.pilotangebot.frei === undefined ? ctx.site.pilotangebot.plaetze : ctx.site.pilotangebot.frei)} von ${ctx.esc(ctx.site.pilotangebot.plaetze)} Plätzen frei.</p>
          <dl class="pilot-angebot__liste">
            <div><dt>Sie erhalten</dt><dd>${t('Den KI-Check {{pilot_rabatt}} günstiger: {{preis_ki_check_pilot}} statt {{preis_ki_check}}. Dazu persönliche Begleitung im Pilot und eine Auswertung mit Zahlen aus Ihrem Alltag.')}</dd></div>
            <div><dt>Ich bitte Sie um</dt><dd>Ehrliche Rückmeldung während des Pilots. Sind Sie zufrieden, eine Nennung mit kurzem Zitat. Ohne Ihre schriftliche Zustimmung veröffentliche ich nichts.</dd></div>
            <div><dt>Abbruch</dt><dd>Vor dem Start legen wir fest, woran wir den Erfolg messen, zum Beispiel wie viele Entwürfe ohne grosse Änderung passen und wie viele Minuten pro Fall wegfallen. Wird das Ziel nicht erreicht, hören wir auf. Sie bezahlen nur den vereinbarten Pilotpreis.</dd></div>
          </dl>
        </div>` : ''}
        ${c.btns([{ href: 'kontakt/?thema=pilot', label: 'Pilotbetrieb werden' }, { href: 'ki/#ablauf', label: 'Ablauf eines Pilots', variant: 'secondary' }])}
      </div>`,
    }),
    c.section({
      id: 'labor',
      head: { eyebrow: 'Labortests', title: 'Bis zum ersten Kunden: messen statt behaupten.', intro: 'Diese Tests mache ich mit erfundenen Daten, bevor ein Betrieb seine Daten anvertraut. Die Ergebnisse stehen hier, auch wenn sie nicht gut ausfallen.' },
      body: `<ul class="labor">${LABOR.map((x) => `<li class="labor__item" data-reveal>
        <p class="labor__status labor__status--${x.status}">${LABOR_STATUS[x.status]}</p>
        <h3 class="t-h3">${x.titel}</h3>
        <p>${x.text}</p>
        <p class="labor__mass"><strong>Gemessen wird:</strong> ${x.mass}</p>
        ${x.ergebnis ? `<p class="labor__ergebnis"><strong>Ergebnis:</strong> ${x.ergebnis}</p>` : ''}
      </li>`).join('\n')}</ul>
      <p class="note">Labortests ersetzen keinen echten Kunden. Sie zeigen aber, ob ein Ablauf technisch hält, was diese Website beschreibt.</p>`,
    }),
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
