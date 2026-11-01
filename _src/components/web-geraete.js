'use strict';
// Websites und Referenzen (V4-KONZEPT 4 und 2.7): Geraete-Rahmen mit Produktbildern der Musterseiten, Bento-Kacheln,
// klebender Ablauf, Galerie und kleine Mockups. Alle Betriebe sind erfunden (Muster, Beispiel) und gekennzeichnet.
// Produktbilder: assets/img/muster-*.webp, aufgenommen aus _src/muster/ (siehe _src/muster/README.md).
// Stile: css/websites.css, Verhalten: js/websites.js. Gruppe: Websites und Referenzen.

const { esc, cls, join, when } = require('../lib/html');

/** Musterseiten: Name, Farbe der Statusleiste im Handy, Merkmale (V4-TEXTE 10.3) */
const MUSTER = {
  'schreinerei-a': { name: 'Schreinerei Beispiel', bar: '#f6f1ea', ink: '#2a1f16', text: 'Grosse Bilder der Arbeiten, Ablauf vom Gespräch bis zur Montage, Offertanfrage mit Fotos.', merkmale: ['Grosse Bilder der Arbeiten', 'Offertanfrage mit Fotos'] },
  'schreinerei-b': { name: 'Schreinerei Beispiel', bar: '#15130f', ink: '#f4ede4' },
  fahrschule: { name: 'Fahrschule Muster', bar: '#ffffff', ink: '#0f1b3d', text: 'Hell und freundlich. Preise auf einen Blick, Kurse mit Daten, Anmeldung in zwei Schritten.', merkmale: ['Preise auf einen Blick', 'Kurse mit Daten'] },
  treuhand: { name: 'Treuhandbüro Beispiel', bar: '#f4f3ee', ink: '#16302a', text: 'Ruhig und klar. Leistungen gegliedert, Team, Termin anfragen.', merkmale: ['Leistungen gegliedert', 'Termin anfragen'] },
};

const altMuster = (key) => `Musterbeispiel einer Website für ${MUSTER[key].name}, auf Laptop und Handy`;

/** Bild einer Musterseite. art: 'laptop' oder 'handy' */
function webBild(ctx, key, art, { alt = '', eager = false, sizes } = {}) {
  const base = `assets/img/muster-${key}-${art}`;
  const lazy = eager ? ' fetchpriority="high"' : ' loading="lazy"';
  if (art === 'laptop') {
    return `<img src="${ctx.url(base + '.webp')}" srcset="${ctx.url(base + '-800.webp')} 800w, ${ctx.url(base + '.webp')} 1440w" sizes="${esc(sizes || '(min-width: 1024px) 60vw, 92vw')}" width="1440" height="900" alt="${esc(alt)}" decoding="async"${lazy}>`;
  }
  return `<img src="${ctx.url(base + '.webp')}" width="585" height="1266" alt="${esc(alt)}" decoding="async"${lazy}>`;
}

/** Laptop-Rahmen. Inhalt: Bild einer Musterseite (key) oder eigenes HTML (screen) */
function webLaptop(ctx, { key, screen, alt = '', eager = false, sizes, cls: c = '' } = {}) {
  const inner = screen || webBild(ctx, key, 'laptop', { alt, eager, sizes });
  return join([
    `<div class="${cls('dev-laptop', c)}">`,
    `<div class="dev-laptop__lid"><div class="dev-laptop__screen">${inner}</div></div>`,
    '<div class="dev-laptop__base" aria-hidden="true"></div>',
    '</div>',
  ]);
}

/** Handy-Rahmen mit Statusleiste in der Farbe der Musterseite */
function webHandy(ctx, { key, alt = '', eager = false, cls: c = '' } = {}) {
  const m = MUSTER[key];
  return join([
    `<div class="${cls('dev-phone', c)}" style="--bar:${m.bar};--bar-ink:${m.ink}">`,
    '<div class="dev-phone__screen">',
    '<span class="dev-phone__status" aria-hidden="true"><span>08:30</span><i></i><b></b></span>',
    webBild(ctx, key, 'handy', { alt, eager }),
    '</div>',
    '</div>',
  ]);
}

/** Laptop und Handy zusammen (Hero, Galerie, Referenzen). Das Handy zeigt dieselbe Seite, darum alt leer. */
function webDuo(ctx, key, { eager = false, cls: c = '', sizes } = {}) {
  return join([
    `<div class="${cls('dev-duo', c)}">`,
    webLaptop(ctx, { key, alt: altMuster(key), eager, sizes }),
    webHandy(ctx, { key, eager }),
    '</div>',
  ]);
}

/* ------------------------------------------------------------------ Kleine Mockups (dekorativ) */

function mkSuche() {
  return join([
    '<div class="wm-serp" aria-hidden="true">',
    '<p class="wm-serp__q"><span>küche nach mass schreinerei</span><i></i></p>',
    '<div class="wm-serp__hit">',
    '<p class="wm-serp__site"><span class="wm-serp__fav">S</span><span>Schreinerei Beispiel<small>ihre-firma › kuechen</small></span></p>',
    '<p class="wm-serp__title">Küchen nach Mass | Schreinerei Beispiel</p>',
    '<p class="wm-serp__desc">Küchen, Einbauschränke und Möbel aus Massivholz. Mit Ihnen geplant, in der eigenen Werkstatt gefertigt und montiert.</p>',
    '</div>',
    '<div class="wm-serp__ghost"><i></i><i></i><i></i></div>',
    '</div>',
  ]);
}

function mkCode() {
  const L = (indent, html) => `<span class="wm-code__l" style="--i:${indent}">${html}</span>`;
  const tag = (t) => `<span class="wm-code__t">${esc(t)}</span>`;
  const at = (a, v) => ` <span class="wm-code__a">${a}</span>=<span class="wm-code__v">${esc(`"${v}"`)}</span>`;
  return join([
    '<p class="wm-code" aria-hidden="true">',
    L(0, `${tag('<header')}${at('class', 'kopf')}${tag('>')}`),
    L(1, `${tag('<h1>')}Möbel nach Mass${tag('</h1>')}`),
    L(1, `${tag('<a')}${at('class', 'knopf')}${tag('>')}Offerte anfragen${tag('</a>')}`),
    L(0, tag('</header>')),
    '</p>',
  ], '');
}

function mkFormular() {
  return join([
    '<div class="wm-form" aria-hidden="true">',
    '<p class="wm-form__f"><span>Name</span><b>Sara Muster</b></p>',
    '<p class="wm-form__f"><span>Nachricht</span><b>Wir möchten eine neue Küche.</b></p>',
    '<p class="wm-form__ok"><i></i>Danke, Ihre Anfrage ist angekommen.</p>',
    '</div>',
  ]);
}

function mkZweiEntwuerfe(ctx) {
  const one = (key, label, chosen) => join([
    `<div class="${cls('wm-pick', chosen && 'is-chosen')}">`,
    `<div class="wm-pick__img">${webBild(ctx, key, 'laptop', { sizes: '(min-width: 1024px) 22vw, 44vw' })}</div>`,
    `<p class="wm-pick__label"><span>${label}</span>${chosen ? '<b>Ihre Wahl</b>' : ''}</p>`,
    '</div>',
  ]);
  return `<div class="wm-picks" aria-hidden="true">${one('schreinerei-a', 'Entwurf A', true)}${one('schreinerei-b', 'Entwurf B', false)}</div>`;
}

/* ------------------------------------------------------------------ Bento "Was drin ist" */

function webBento(ctx) {
  const t = (o) => join([
    `<li class="${cls('bento__tile', `bento__tile--${o.size}`, o.cls)}" data-reveal>`,
    '<div class="bento__text">',
    when(o.icon, () => `<span class="bento__icon">${ctx.c.icon(o.icon)}</span>`),
    `<h3 class="bento__title">${o.title}</h3>`,
    `<p>${o.text}</p>`,
    '</div>',
    when(o.visual, () => `<div class="bento__visual">${o.visual}</div>`),
    '</li>',
  ]);
  return `<ul class="bento">${[
    t({ size: 'tall', cls: 'bento__tile--handy', title: 'Auf jedem Handy klar.', text: 'Viele Kundinnen und Kunden suchen zuerst auf dem Handy. Jede Seite ist dafür gebaut und wird auf Handy, Tablet und Computer geprüft.', visual: `<div class="bento__phones">${webHandy(ctx, { key: 'fahrschule', alt: 'Musterbeispiel der Website Fahrschule Muster auf dem Handy' })}${webHandy(ctx, { key: 'treuhand', alt: 'Musterbeispiel der Website Treuhandbüro Beispiel auf dem Handy' })}</div>` }),
    t({ size: 'wide', title: 'Zwei Entwürfe zur Auswahl.', text: 'Zum Start baue ich zwei Designs. Sie wählen, was besser zu Ihrem Betrieb passt.', visual: mkZweiEntwuerfe(ctx) }),
    t({ size: 'wide', cls: 'bento__tile--google', title: 'Bei Google sauber beschrieben.', text: 'Seitentitel, Beschreibungen und Struktur, damit Google versteht, was Sie anbieten.', visual: mkSuche() }),
    t({ size: 'small', title: 'Schnell geladen.', text: 'Eigener, schlanker Code statt schwerer Baukasten.', visual: mkCode() }),
    t({ size: 'small', title: 'Anfragen per Formular.', text: 'Das Kontaktformular schickt Anfragen direkt in Ihr Postfach.', visual: mkFormular() }),
    t({ size: 'small', icon: 'werkzeug', title: 'Selber ändern oder ändern lassen.', text: 'Mit WordPress ändern Sie Texte, Preise und Fotos selbst. Oder ich mache es für Sie.' }),
    t({ size: 'small', icon: 'schluessel', title: 'Ihre Website gehört Ihnen.', text: 'Nach der Bezahlung erhalten Sie alle Rechte und alle Dateien.' }),
  ].join('\n')}</ul>`;
}

/* ------------------------------------------------------------------ Bildschirme des Ablaufs */

function screenEntwurf(ctx) {
  const one = (key, label) => `<div class="ws-pick"><div class="ws-pick__img">${webBild(ctx, key, 'laptop', { sizes: '30vw' })}</div><p>${label}</p></div>`;
  return `<div class="ws ws--entwurf"><p class="ws__kopf">Ihr Entwurf, zwei Designs</p><div class="ws-picks">${one('schreinerei-a', 'Entwurf A')}${one('schreinerei-b', 'Entwurf B')}</div></div>`;
}

function screenWunschliste(ctx) {
  const basis = ctx.preis('website').betrag;
  // beispiel: erfundene Zusatzpreise fuer die Vorfuehrung der Wunschliste, Basis kommt aus site.json
  const rows = [
    ['Design A, Startseite und vier Unterseiten', true, 0],
    ['Kontaktformular', true, 0],
    ['Galerie Ihrer Arbeiten', true, 270], // beispiel
    ['Offertanfrage mit Fotos', true, 225], // beispiel
    ['Zweite Sprache', false, 540], // beispiel
  ];
  const total = basis + rows.filter((r) => r[1]).reduce((a, r) => a + r[2], 0);
  const li = rows.map(([name, on, plus]) => `<li class="${cls(on && 'is-on')}"><i></i><span>${name}</span><b>${plus ? `+ ${esc(ctx.fmt.num(plus))}` : 'inbegriffen'}</b></li>`).join('');
  return join([
    '<div class="ws ws--liste">',
    '<p class="ws__kopf">Wunschliste <span class="ws__tag">Beispiel, erfunden</span></p>',
    `<ul class="ws-liste">${li}</ul>`,
    `<p class="ws-total"><span>Ihr Fixpreis</span><b>${esc(ctx.fmt.chf(total))}</b></p>`,
    '</div>',
  ], '');
}

function screenUmsetzung(ctx) {
  return join([
    '<div class="ws ws--umsetzung">',
    webBild(ctx, 'fahrschule', 'laptop', { sizes: '40vw' }),
    '<ul class="ws-checks"><li>Handy geprüft</li><li>Tablet geprüft</li><li>Computer geprüft</li></ul>',
    '</div>',
  ], '');
}

function screenUebergabe(ctx) {
  return join([
    '<div class="ws ws--uebergabe">',
    '<p class="ws-url"><i class="ws-url__lock"></i><span>ihre-firma</span><b>Online</b></p>',
    `<div class="ws-url__page">${webBild(ctx, 'treuhand', 'laptop', { sizes: '40vw' })}</div>`,
    '</div>',
  ], '');
}

function screenBetreuung(ctx) {
  return join([
    '<div class="ws ws--mail">',
    '<div class="ws-mail">',
    `<p class="ws-mail__kopf"><span class="ws-mail__ava">${esc(ctx.site.person.name.split(' ').map((w) => w[0]).join(''))}</span><span><b>${esc(ctx.site.person.name)}</b><small>An: Sara Muster</small></span></p>`,
    '<p class="ws-mail__betreff">Änderung erledigt</p>',
    '<p class="ws-mail__text">Guten Tag Frau Muster<br>Die neuen Öffnungszeiten sind online. Bitte schauen Sie kurz darüber.<br>Freundliche Grüsse</p>',
    '<p class="ws-mail__done"><i></i>Erledigt</p>',
    '</div>',
    '</div>',
  ], '');
}

const SCREENS = [screenEntwurf, screenWunschliste, screenUmsetzung, screenUebergabe, screenBetreuung];

/**
 * Klebender Ablauf (Konzept 4.4): links Schritte, rechts ein Laptop, der seinen Bildschirm wechselt (ab 1024 px,
 * ohne reduzierte Bewegung). Sonst hat jeder Schritt sein eigenes kleines Bild. Bilder sind dekorativ, der Text
 * des Schritts beschreibt sie. items: [{ title, parts: [['Sie', '...'], ...], decide }]
 */
function webAblauf(ctx, items) {
  const steps = items.map((x, i) => join([
    `<li class="${cls('wab__step', x.decide && 'wab__step--decide', i === 0 && 'is-active')}" data-step="${i}">`,
    `<span class="wab__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>`,
    `<h3 class="wab__title">${x.title}</h3>`,
    `<dl class="wab__dl">${x.parts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`,
    when(x.decide, () => '<p class="chip chip--sie wab__chip">Sie entscheiden</p>'),
    `<div class="wab__fig" aria-hidden="true"><div class="wab__win">${SCREENS[i](ctx)}</div></div>`,
    '</li>',
  ])).join('\n');
  const screens = SCREENS.map((fn, i) => `<div class="${cls('wab__screen', i === 0 && 'is-active')}" data-screen="${i}">${fn(ctx)}</div>`).join('');
  return join([
    '<div class="wab" data-wab>',
    `<ol class="wab__steps">${steps}</ol>`,
    `<div class="wab__stage" aria-hidden="true"><div class="wab__sticky">${webLaptop(ctx, { screen: `<div class="wab__screens">${screens}</div>` })}<p class="wab__dots">${SCREENS.map((_, i) => `<i class="${cls(i === 0 && 'is-active')}"></i>`).join('')}</p></div></div>`,
    '</div>',
  ]);
}

/* ------------------------------------------------------------------ Galerie */

/** Waagrechte Galerie mit Einrastpunkten und zwei Pfeil-Knoepfen (Konzept 4.5). keys: ['schreinerei-a', ...] */
function webGalerie(ctx, keys, { id = 'galerie', level = 3 } = {}) {
  const slides = keys.map((k) => {
    const m = MUSTER[k];
    return join([
      `<li class="wgal__slide wgal__slide--${k}">`,
      `<div class="wgal__stage">${webDuo(ctx, k, { sizes: '(min-width: 1024px) 50vw, 80vw' })}</div>`,
      '<div class="wgal__text">',
      `<h${level} class="t-h3">${esc(m.name)}</h${level}>`,
      `<p>${m.text}</p>`,
      ctx.c.badge('muster'),
      '</div>',
      '</li>',
    ]);
  }).join('\n');
  return join([
    `<div class="wgal" data-wgal>`,
    `<ul class="wgal__track" id="${esc(id)}" tabindex="0" aria-label="Musterbeispiele, waagrecht scrollbar">${slides}</ul>`,
    '<div class="wgal__nav">',
    `<button class="wgal__btn wgal__btn--prev" type="button" aria-controls="${esc(id)}" aria-label="Vorheriges Beispiel" data-dir="-1" disabled>${ctx.c.icon('chevron')}</button>`,
    `<button class="wgal__btn" type="button" aria-controls="${esc(id)}" aria-label="Nächstes Beispiel" data-dir="1">${ctx.c.icon('chevron')}</button>`,
    '</div>',
    '</div>',
  ]);
}

/** Karten der Musterbeispiele (Referenzen): Bild, Name, Text, Kennzeichnung */
function webMusterKarten(ctx, keys, { level = 3 } = {}) {
  return `<ul class="wkarten">${keys.map((k) => join([
    '<li class="wkarte" data-reveal>',
    `<div class="wkarte__stage">${webDuo(ctx, k, { cls: 'dev-duo--klein', sizes: '(min-width: 1024px) 30vw, 88vw' })}</div>`,
    `<h${level} class="t-h3">${esc(MUSTER[k].name)}</h${level}>`,
    `<p>${MUSTER[k].text}</p>`,
    ctx.c.badge('muster'),
    '</li>',
  ])).join('\n')}</ul>`;
}

module.exports = { webBild, webLaptop, webHandy, webDuo, webBento, webAblauf, webGalerie, webMusterKarten, webMuster: MUSTER };
