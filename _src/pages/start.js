'use strict';
// Startseite (V4-KONZEPT 5, V4-TEXTE 3). Gruppe: Startseite 3D.
// Die Geschichte: je Abschnitt <section class="chapter" data-scene="..."> ein Beat aus js/config.js (BEATS).
// Namen und Reihenfolge muessen zu BEATS passen, sonst findet der Director die Abschnitte nicht.
// Danach der helle Inhalt (.content#content, data-light schaltet die Kopfzeile auf hell).

exports.meta = {
  path: '',
  nav: 'start',
  layout: 'story',
  title: '{{marke}} | KI und Websites für KMU in der Zentralschweiz',
  description: 'KI für KMU in der Zentralschweiz: Antwortentwürfe, Terminvorschläge und Daten aus Belegen, direkt in Ihren Programmen. Dazu Websites. Preise offen.',
};

// Text-Stationen der Geschichte. Fuer jeden Beat in config.js genau ein Eintrag (gleicher Name).
// Version 4: Hero und sechs Stationen 01 bis 06 (Entlastung, Was KI kann, Flug ins Gehirn, Verbindung, Websites,
// Einstieg). Die Nummern im Kicker folgen dem HUD (0X/06, ARCHITEKTUR.md Kapitel 9). Der Beat brain (03) hat keinen
// Text (langsamer Flug ins Gehirn), im Fallback ist er ein reines Bild. Das Kapitel Code (dna, Helix und
// Website-Geruest) ist seit 01.11.2026 wieder drin, mit der Angebotszeile unter dem fertigen Geruest (offer).
const CHAPTERS = [
  {
    scene: 'intro', cls: 'chapter--intro', id: 'top',
    // Bildbeschreibung gilt fuer beide Themen (hell: Tinte auf Off-White, dunkel: Licht auf Schwarz)
    poster: 'Büste eines Androiden aus feinen Punkten und Linien',
  },
  {
    scene: 'robot', cls: 'chapter--left', kicker: ['01', 'Entlastung'],
    title: 'KI entlastet Ihr Team, sie ersetzt niemanden.',
    text: 'Die KI übernimmt Abtippen, Sortieren und den ersten Entwurf. Ihre Leute behalten die Gespräche mit Kunden, die Facharbeit und jede Entscheidung.',
    tags: 'Vorbereiten · Prüfen · Entscheiden',
  },
  {
    scene: 'zoom', cls: 'chapter--left', kicker: ['02', 'Was KI kann'],
    title: 'Lesen, sortieren, zusammenfassen, Entwürfe schreiben.',
    text: 'Das kann KI heute gut, aber nicht fehlerfrei. Darum geht jeder Entwurf über Ihren Tisch, bevor er Ihren Betrieb verlässt.',
    tags: 'Lesen · Sortieren · Zusammenfassen · Entwerfen',
  },
  { scene: 'brain', image: true },
  {
    scene: 'cables', cls: 'chapter--right', kicker: ['04', 'Verbindung'],
    title: 'Verbunden mit den Programmen, die Sie schon nutzen.',
    text: 'Outlook, Microsoft 365, Google Workspace, bexio, Abacus, Excel und WhatsApp Business, sofern das Programm eine Schnittstelle bietet. Wählen Sie ein Werkzeug:',
    tools: true,
  },
  {
    scene: 'dna', cls: 'chapter--left', kicker: ['05', 'Websites'],
    title: 'Websites aus eigenem Code.',
    text: 'Schnell geladen, auf jedem Handy gut lesbar, bei Google sauber beschrieben. Anfragen über Ihre Website landen auf Wunsch in derselben Liste wie Mail und WhatsApp.',
    tags: 'Nach Mass · Eigener Code · Anfragen in einer Liste',
    // Angebotszeile unter dem fertigen Website-Geruest: nur mit 3D (js/ui.js setOffer), Knopf sonst tabindex -1
    offer: {
      text: 'Ihr erster Entwurf ist kostenlos. Danach erhalten Sie eine Fixpreis-Offerte.',
      label: 'Kostenlosen Entwurf anfragen', href: 'kontakt/?thema=website',
    },
  },
  {
    scene: 'outro', cls: 'chapter--left chapter--outro', kicker: ['06', 'Einstieg'],
    title: 'Klein anfangen, Nutzen messen, dann entscheiden.',
    text: 'Der KI-Check zum Fixpreis von {{preis_ki_check}} zeigt, wo KI in Ihrem Betrieb Zeit spart und was das kostet. Für eine neue Website erhalten Sie zuerst einen kostenlosen Entwurf.',
    outro: true,
  },
];

// Die fuenf Symbole der Kabel-Szene als echte Links (V4-TEXTE 3.2, Bild 4)
const TOOLS = [
  { node: 'email', label: 'E-Mail', sub: 'Antwortentwürfe', aria: 'E-Mail: Antwortentwürfe für Ihr Postfach', href: 'ki/e-mail/' },
  { node: 'kalender', label: 'Kalender', sub: 'Terminvorschläge', aria: 'Kalender: Terminvorschläge aus freien Zeiten', href: 'ki/kalender/' },
  { node: 'dokumente', label: 'Dokumente', sub: 'Daten aus PDFs und Belegen', aria: 'Dokumente: Angaben aus PDFs und Belegen', href: 'ki/dokumente/' },
  { node: 'kunden', label: 'Kunden', sub: 'Anfragen in einer Liste', aria: 'Kunden: Anfragen aus Telefon, Mail und WhatsApp in einer Liste', href: 'ki/kunden/' },
  { node: 'website', label: 'Website', sub: 'Neue Website', aria: 'Website: neue Website für Ihren Betrieb', href: 'websites/' },
];

function hero(ctx) {
  const t = ctx.t;
  // Die Marke steht schon in der Kopfzeile: am Handy nur "KI und Software für KMU" (eine Zeile, Gesicht bleibt frei)
  return `<p class="eyebrow" data-intro><span><span class="eyebrow__brand">${t('{{marke}} · ')}</span>KI und Software für KMU</span></p>
            <h1 class="display" id="t-intro" data-intro data-split>KI, die Ihrem Team Büroarbeit abnimmt.</h1>
            <p class="lead" data-intro>Ich verbinde KI mit Outlook, bexio und Ihren anderen Programmen. Sie liest Anfragen, sortiert und schreibt Entwürfe. Ihr Team prüft und entscheidet.</p>
            <div class="actions hero-actions" data-intro>
              <a class="btn" href="ki/">KI für meinen Betrieb <span class="btn__arrow" aria-hidden="true"></span></a>
              <a class="btn btn--secondary" href="websites/">Neue Website</a>
            </div>
            <p class="hero-facts" data-intro>KI-Check zum Fixpreis · Preise offen · Mensch entscheidet</p>`;
}

function chapter(ctx, ch) {
  const t = ctx.t;
  const id = `t-${ch.scene}`;
  // Station ohne Text (Flug ins Gehirn): mit 3D nur Scrollweg, im Fallback ein Bild (fuer Screenreader versteckt)
  if (ch.image) {
    return `<div class="chapter chapter--image" data-scene="${ch.scene}" aria-hidden="true">
        <div class="chapter__poster"></div>
      </div>`;
  }
  let inner;
  if (ch.scene === 'intro') {
    inner = `<div class="chapter__text">${hero(ctx)}</div>
          <p class="scroll-cue" data-intro><span>Scrollen</span><i></i></p>`;
  } else {
    const parts = [
      `<p class="kicker" data-anim><span>${ch.kicker[0]}</span> ${ch.kicker[1]}</p>`,
      `<h2 class="headline${ch.outro ? ' headline--xl' : ''}" id="${id}" data-split>${ch.title}</h2>`,
      `<p data-anim>${t(ch.text)}</p>`,
    ];
    if (ch.tags) parts.push(`<p class="story-tags" data-anim>${ch.tags}</p>`);
    if (ch.tools) {
      // Mit 3D am Desktop setzt js/nodes.js diese Links ueber die Knoten (tl-ring = Trefferflaeche um den Knoten)
      parts.push('<p class="tool-hint" data-anim><span class="tool-hint__d">Klicken Sie auf ein Symbol.</span></p>');
      parts.push(`<nav class="tool-links" aria-label="Beispiele nach Werkzeug"><ul>${TOOLS.map((x) => `<li><a href="${ctx.url(x.href)}" data-node="${x.node}" data-label="${x.label}" aria-label="${x.aria}"><span class="tl-ring" aria-hidden="true"></span><span class="tl-label">${x.label}<span class="tool-links__sub"> · ${x.sub}</span><span class="tl-go" aria-hidden="true"></span></span></a></li>`).join('')}</ul></nav>`);
    }
    if (ch.outro) {
      parts.push(`<div class="actions" data-anim>
              <a class="btn" href="kontakt/?thema=ki-check">KI-Check anfragen <span class="btn__arrow" aria-hidden="true"></span></a>
              <a class="btn btn--secondary" href="kontakt/?thema=website">Website-Entwurf anfragen</a>
            </div>`);
      parts.push(`<p class="outro-mail" data-anim><span class="mono">Direkt per Mail</span> <a class="link" href="mailto:${ctx.esc(ctx.site.kontakt.mail)}">${ctx.esc(ctx.site.kontakt.mail)}</a></p>`);
    }
    inner = `<div class="chapter__text">\n            ${parts.join('\n            ')}\n          </div>`;
  }
  const poster = ch.poster ? `<div class="chapter__poster" role="img" aria-label="${ch.poster}"></div>` : '<div class="chapter__poster"></div>';
  // Angebotsmoment (Kapitel Code): ausserhalb des Panels, steht fix unter dem fertigen Geruest
  const offer = ch.offer ? `
        <div class="chapter__offer" id="offer">
          <p>${ch.offer.text}</p>
          <a class="btn" href="${ctx.url(ch.offer.href)}" tabindex="-1">${ch.offer.label} <span class="btn__arrow" aria-hidden="true"></span></a>
        </div>` : '';
  return `<section class="chapter ${ch.cls}" data-scene="${ch.scene}"${ch.id ? ` id="${ch.id}"` : ''} aria-labelledby="${id}">
        ${poster}
        <div class="chapter__panel">
          ${inner}
        </div>${offer}
      </section>`;
}

// Kleine Grafiken der Teaser (dekorativ, aria-hidden): Kabel-Schema KI und Handy-Schema Website
function kabelGrafik(ctx) {
  const sym = (id, x, y) => `<svg x="${x - 11}" y="${y - 11}" width="22" height="22" viewBox="0 0 24 24"><use href="${ctx.url('assets/icons.svg')}#${id}"></use></svg>`;
  const ys = [22, 54, 86, 118];
  const ids = ['mail', 'kalender', 'dokument', 'kunden'];
  return `<svg class="st-kabel" viewBox="0 0 360 140" aria-hidden="true" focusable="false">
          ${ys.map((y) => `<path class="st-kabel__line" d="M48 ${y} C 120 ${y}, 140 70, 196 70"/>`).join('')}
          <path class="st-kabel__line st-kabel__line--out" d="M232 70 H 300"/>
          <circle class="st-kabel__pulse" r="3"><animateMotion dur="3.2s" repeatCount="indefinite" path="M48 22 C 120 22, 140 70, 196 70 H 300"/></circle>
          ${ys.map((y, i) => `<circle class="st-kabel__node" cx="30" cy="${y}" r="17"/>${sym(ids[i], 30, y)}`).join('')}
          <circle class="st-kabel__hub" cx="214" cy="70" r="20"/><text class="st-kabel__ki" x="214" y="75">KI</text>
          <circle class="st-kabel__sie" cx="322" cy="70" r="20"/>${sym('person', 322, 70)}
        </svg>
        <p class="st-kabel__cap" aria-hidden="true"><span>Ihre Programme</span><span>KI bereitet vor</span><span>Sie entscheiden</span></p>`;
}
function handyGrafik() {
  return `<div class="st-phone" aria-hidden="true"><div class="st-phone__screen">
          <span class="st-phone__bar"></span><span class="st-phone__hero"></span>
          <span class="st-phone__line"></span><span class="st-phone__line st-phone__line--s"></span>
          <span class="st-phone__btn"></span>
          <span class="st-phone__tiles"><i></i><i></i></span>
        </div></div>`;
}
// Vorschau des Demo-Assistenten (statisch, Szenario Kundenmail aus V4-TEXTE 5.2). Der echte Assistent liegt auf ki/#demo.
function demoVorschau() {
  return `<figure class="st-demo" role="img" aria-label="Ausschnitt aus dem Demo-Assistenten: Eine Kundenmail wird in vier Schritten zu einem Antwortentwurf. Sie geben ihn frei oder ändern ihn.">
          <div class="st-demo__in" aria-hidden="true">
            <div class="st-demo__bar"><span>Demo-Assistent</span><span class="st-demo__dots"><i></i><i></i><i></i></span></div>
            <div class="st-demo__mail">
              <p class="st-demo__k">Eingang · Mail</p>
              <p class="st-demo__from"><b>Reto Beispiel</b> · Wohnung streichen im Frühling</p>
              <p class="st-demo__t">Was kostet das ungefähr und wann hätten Sie Zeit?</p>
            </div>
            <ol class="st-demo__steps"><li class="is-done">Lesen</li><li class="is-done">Einordnen</li><li class="is-done">Nachschlagen</li><li class="is-now">Entwurf</li></ol>
            <div class="st-demo__draft">
              <p class="st-demo__k">Entwurf</p>
              <p>Guten Tag Herr Beispiel. Vielen Dank für Ihre Anfrage. Damit der Preis stimmt, schauen wir die Wohnung kurz an. Passt Ihnen Dienstag, 10. November, 17.00 Uhr?</p>
              <div class="st-demo__act"><span class="st-demo__b">Freigeben</span><span class="st-demo__b st-demo__b--2">Ändern</span><span class="st-demo__who">Sie entscheiden</span></div>
            </div>
          </div>
        </figure>`;
}

// Pilotangebot beim KI-Check (wie auf preise/), nur solange Plaetze frei sind
function pilotHinweis(ctx) {
  const pa = ctx.site.pilotangebot || {};
  const frei = pa.frei === undefined ? pa.plaetze : pa.frei;
  if (!(pa.plaetze > 0 && frei > 0)) return '';
  return `<span class="price__pilot">${ctx.t('Pilotangebot: {{preis_ki_check_pilot}} statt {{preis_ki_check}}.')} Noch ${ctx.esc(frei)} Plätze frei. <a class="text-link" href="${ctx.url('referenzen/#pilot')}">Bedingungen</a></span>`;
}

function content(ctx) {
  const c = ctx.c;
  const t = ctx.t;
  return [
    c.section({
      id: 'weiter',
      head: { eyebrow: 'Angebot', title: 'Zwei Wege, ein Ansprechpartner.' },
      body: `<div class="wege-start">
        ${c.cards([
          { eyebrow: 'Hauptangebot', title: 'KI für meinen Betrieb', text: 'Für Betriebe mit vielen Mails, Belegen und wiederkehrenden Anfragen. Die KI bereitet vor, Ihr Team entscheidet.', html: `<div class="st-media st-media--kabel">${kabelGrafik(ctx)}</div><p class="card__line">${t('Start mit dem KI-Check · Fixpreis {{preis_ki_check}}')}</p>`, href: 'ki/', linkLabel: 'Zur KI-Integration', tone: 'tint' },
          { eyebrow: 'Zweites Standbein', title: 'Neue Website', text: 'Modern, schnell und auf jedem Handy gut lesbar. Sie sehen den ersten Entwurf, bevor Sie etwas bezahlen.', html: `<div class="st-media st-media--phone">${handyGrafik()}</div><p class="card__line">${t('Entwurf kostenlos · Fixpreis ab {{preis_website_ab}}')}</p>`, href: 'websites/', linkLabel: 'Zu den Websites' },
        ], { cols: 2, cls: 'wege-start__karten' })}
      </div>`,
    }),
    c.section({
      id: 'werkzeuge', tone: 'soft',
      head: { eyebrow: 'Werkzeuge', title: 'Wo die KI bei Ihnen mitarbeitet.' },
      body: [
        c.kiWerkzeugKacheln({}),
        `<p class="sec__foot start-branchen">Beispiele nach Branche: <a class="text-link" href="${ctx.url('branchen/handwerk/')}">Handwerk</a> · <a class="text-link" href="${ctx.url('branchen/treuhand/')}">Treuhand und Büro</a> · <a class="text-link" href="${ctx.url('branchen/verwaltung/')}">Verwaltung</a></p>`,
        '<p class="note">Alle Beispiele mit erfundenen Daten. Ein Mensch prüft und entscheidet immer.</p>',
      ].join('\n'),
    }),
    c.section({
      id: 'ausprobieren',
      head: { eyebrow: 'Ausprobieren', title: 'So arbeitet die KI mit.' },
      body: `<div class="grid grid--2 st-try">
        <div data-reveal>
          ${c.badge('demo')}
          ${demoVorschau()}
          <p class="sec__foot">Der Demo-Assistent zeigt Schritt für Schritt, wie aus einer Kundenmail ein Antwortentwurf wird. Vorführung mit erfundenen Daten.</p>
          <p>${c.more({ href: 'ki/#demo', label: 'Selbst ausprobieren im Demo-Assistenten' })}</p>
        </div>
        <div>${c.priceCards([{ id: 'ki-check', featured: true, badge: 'Empfohlener Einstieg', hours: true, text: pilotHinweis(ctx), points: ['Gespräch, bei Ihnen oder per Video', 'Analyse von zwei bis drei Abläufen', 'Bericht mit Empfehlung und Fixpreis für den Pilot'], button: { href: 'kontakt/?thema=ki-check', label: 'KI-Check anfragen' } }], { cls: 'prices--start' })}
          <p class="sec__foot">${c.more({ href: 'preise/', label: 'Alle Preise' })}</p>
        </div>
      </div>`,
    }),
    c.section({
      id: 'vertrauen', tone: 'soft',
      head: { eyebrow: ctx.site.kontakt.telefon ? 'Bevor Sie anrufen' : 'Bevor Sie schreiben', title: 'Was Sie vorher wissen wollen.' },
      body: c.cards([
        { icon: 'liste', title: 'Preise', text: 'Richtwerte für jede Stufe, offen auf einer Seite.', href: 'preise/' },
        { icon: 'schild', title: 'Datenschutz und Sicherheit', text: t('Wo Ihre Daten und die Lösung liegen, standardmässig {{daten_standard}}.'), href: 'sicherheit/' },
        { icon: 'schalter', title: 'Betrieb und Support', text: 'Was passiert, wenn etwas ausfällt, und wem die Lösung gehört.', href: 'support/' },
        { icon: 'haken', title: 'Referenzen', text: 'Fallstudie mit echten Zahlen und Lösungen zum Ausprobieren.', href: 'referenzen/' },
      ], { cols: 4, cls: 'cards--white' }),
    }),
    c.section({
      id: 'wer',
      head: { eyebrow: 'Über mich', title: 'Wer dahinter steht.' },
      body: `<div class="grid grid--split">
        <p class="t-lead" data-reveal>${t('Ich bin Jonas Grüter aus der {{region}}, Gründer von {{marke}}. Ich komme aus dem Büroalltag und baue KI-Lösungen und Websites für KMU. Mein Ziel ist eine Software-Firma, die KMU in der Zentralschweiz den Alltag erleichtert.')}</p>
        <div data-reveal>${c.principle('KI entlastet Ihr Team, sie ersetzt niemanden.')}<p class="sec__foot">${c.more({ href: 'ueber-mich/', label: 'Mehr über mich' })}</p></div>
      </div>`,
    }),
    c.ctaBand({
      id: 'start-kontakt',
      title: 'Erzählen Sie mir, wo es bei Ihnen hakt.',
      text: t('Ein paar Sätze genügen. Ich antworte {{reaktionszeit}}, meistens am Abend.'),
      buttons: [{ href: 'kontakt/', label: 'Anfrage senden' }],
    }),
  ].join('\n');
}

exports.render = (ctx) => `<div class="story on-dark" id="story">
      ${CHAPTERS.map((ch) => chapter(ctx, ch)).join('\n\n      ')}
    </div>

    <div class="content" id="content" tabindex="-1" data-light>
${content(ctx)}
    </div>`;

exports.CHAPTERS = CHAPTERS;
exports.TOOLS = TOOLS;
