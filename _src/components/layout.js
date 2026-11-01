'use strict';
// Gemeinsame Teile aller Seiten: Kopf (head), Kopfzeile mit Navigation, KI-Panel, Handy-Menue, Fusszeile.
// Fundament: Aenderungen hier wirken auf jede Seite (auch die 3D-Startseite). Nur nach Absprache aendern.

const { esc, attrs, join, when } = require('../lib/html');

/** <head>-Teile, die jede Seite hat: Zeichensatz, Titel, Beschreibung, Robots, Kanonisch, Open Graph, Icons */
function headMeta(ctx, { themeColor = '#ffffff', colorScheme = 'light' } = {}) {
  const { site, page } = ctx;
  const url = site.seite.basisUrl + page.path;
  return join([
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}">`,
    when(site.seite.noindex, '<meta name="robots" content="noindex, nofollow">'),
    `<meta name="author" content="${esc(site.person.name)}">`,
    `<meta name="theme-color" content="${themeColor}">`,
    `<meta name="color-scheme" content="${colorScheme}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="de_CH">',
    `<meta property="og:site_name" content="${esc(site.marke.name)}">`,
    `<meta property="og:title" content="${esc(page.title)}">`,
    `<meta property="og:description" content="${esc(page.description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(site.seite.basisUrl)}assets/img/og.jpg">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(page.ogAlt || 'Büste eines Androiden aus leuchtenden Lichtpunkten vor dunklem Hintergrund')}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<link rel="icon" href="${ctx.url('assets/img/favicon.svg')}" type="image/svg+xml">`,
    `<link rel="icon" href="${ctx.url('assets/img/favicon-32.png')}" sizes="32x32" type="image/png">`,
    `<link rel="apple-touch-icon" href="${ctx.url('assets/img/apple-touch-icon.png')}">`,
  ]);
}

function isActive(ctx, id) {
  const cur = ctx.page.nav;
  if (!cur) return '';
  if (cur === id) return ctx.page.path === navHref(ctx, id) ? 'page' : 'true';
  return '';
}

function navHref(ctx, id) {
  const all = [...ctx.data.nav.haupt, ctx.data.nav.kontakt];
  const e = all.find((x) => x.id === id);
  return e ? e.href : null;
}

function chevron() {
  return '<svg class="hdr__chev" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

/** Kopfzeile. dark: Variante der 3D-Startseite. */
function header(ctx, { dark = false } = {}) {
  const { site, data } = ctx;
  const nav = data.nav;
  const items = nav.haupt.map((e) => {
    const cur = isActive(ctx, e.id);
    const a = `<a class="hdr__link" href="${ctx.url(e.href)}"${attrs({ 'aria-current': cur })}>${esc(e.label)}</a>`;
    if (!e.panel) return `<li class="hdr__item">${a}</li>`;
    return `<li class="hdr__item hdr__item--split">${a}<button class="hdr__more" type="button" aria-expanded="false" aria-controls="ki-panel" aria-label="Untermenü KI öffnen" data-label-open="Untermenü KI öffnen" data-label-close="Untermenü KI schliessen">${chevron()}</button></li>`;
  }).join('\n');
  const kontaktCur = isActive(ctx, 'kontakt');
  return join([
    `<header class="hdr${dark ? ' hdr--dark' : ''}" id="hdr" data-hdr>`,
    '<div class="hdr__bar">',
    `<a class="hdr__brand" href="${ctx.url('')}" aria-label="${esc(site.marke.name)}, zur Startseite">`,
    '<span class="mark" aria-hidden="true"></span>',
    `<span class="hdr__brandtext"><span class="hdr__name">${esc(site.marke.name)}</span><span class="hdr__sub">${esc(site.marke.zusatz)}</span></span>`,
    '</a>',
    '<nav class="hdr__nav" aria-label="Hauptnavigation">',
    `<ul class="hdr__list">${items}</ul>`,
    '</nav>',
    `<a class="btn btn--sm hdr__cta" href="${ctx.url(nav.kontakt.href)}"${attrs({ 'aria-current': kontaktCur })}>${esc(nav.kontakt.label)}</a>`,
    '<button class="hdr__toggle" type="button" aria-expanded="false" aria-controls="menu" aria-label="Menü öffnen" data-label-open="Menü öffnen" data-label-close="Menü schliessen">',
    '<span class="hdr__toggle-text" aria-hidden="true" data-open="Menü" data-close="Schliessen">Menü</span>',
    '<span class="hdr__burger" aria-hidden="true"><i></i><i></i></span>',
    '</button>',
    '</div>',
    kiPanel(ctx),
    mobileMenu(ctx),
    '</header>',
  ]);
}

/** KI-Panel unter der Kopfzeile (Desktop, Disclosure-Muster, kein role=menu) */
function kiPanel(ctx) {
  const { data } = ctx;
  const check = ctx.preis('ki-check');
  const cols = data.nav.kiPanel.map((col, i) => join([
    '<div class="kipanel__col">',
    `<p class="kipanel__title" id="kp-${i}">${esc(col.titel)}</p>`,
    `<ul aria-labelledby="kp-${i}">`,
    col.links.map((l) => `<li><a class="kipanel__link" href="${ctx.url(l.href)}">${l.icon ? ctx.icon(l.icon, { cls: 'kipanel__ico' }) : ''}<span><span class="kipanel__name">${esc(l.label)}</span><span class="kipanel__text">${esc(l.text || '')}</span></span></a></li>`).join('\n'),
    '</ul>',
    '</div>',
  ]));
  return join([
    '<div class="kipanel" id="ki-panel" hidden>',
    `<div class="kipanel__grid">${cols.join('\n')}</div>`,
    '<div class="kipanel__strip">',
    `<p>Einstieg: KI-Check zum Fixpreis ${esc(ctx.fmt.chf(check.betrag))}</p>`,
    `<a class="more" href="${ctx.url('kontakt/?thema=ki-check')}">KI-Check anfragen</a>`,
    '</div>',
    '</div>',
  ]);
}

/** Handy-Menue als Vollbild-Blatt */
function mobileMenu(ctx) {
  const { data, site } = ctx;
  const nav = data.nav;
  const ki = [
    { label: 'Überblick', href: 'ki/' },
    ...data.nav.kiPanel[1].links,
    ...data.nav.kiPanel[2].links,
  ];
  const li = (e) => {
    const cur = isActive(ctx, e.id);
    if (!e.panel) return `<li><a class="menu__link" href="${ctx.url(e.href)}"${attrs({ 'aria-current': cur })}>${esc(e.label)}</a></li>`;
    return join([
      '<li>',
      `<button class="menu__link menu__group" type="button" aria-expanded="false" aria-controls="menu-ki"${attrs({ 'data-current': cur ? '1' : '' })}>${esc(e.label)}${chevron()}</button>`,
      '<ul class="menu__sub" id="menu-ki" hidden>',
      ki.map((k) => `<li><a href="${ctx.url(k.href)}"${attrs({ 'aria-current': ctx.page.path === k.href ? 'page' : '' })}>${esc(k.label)}</a></li>`).join('\n'),
      '</ul>',
      '</li>',
    ]);
  };
  return join([
    '<div class="menu" id="menu" hidden>',
    '<nav class="menu__nav" aria-label="Menü">',
    '<ul class="menu__list">',
    nav.haupt.map(li).join('\n'),
    li(nav.kontakt),
    '</ul>',
    '<ul class="menu__small">',
    nav.menuKlein.map((l) => `<li><a href="${ctx.url(l.href)}"${attrs({ 'aria-current': ctx.page.path === l.href ? 'page' : '' })}>${esc(l.label)}</a></li>`).join('\n'),
    '</ul>',
    '</nav>',
    '<div class="menu__foot">',
    ctx.c.btn({ href: 'kontakt/?thema=ki-check', label: 'KI-Check anfragen' }),
    `<a class="menu__mail" href="mailto:${esc(site.kontakt.mail)}">${esc(site.kontakt.mail)}</a>`,
    '</div>',
    '</div>',
  ]);
}

/** Fusszeile (dunkel, alle Seiten) */
function footer(ctx) {
  const { site, data } = ctx;
  const cols = data.nav.fuss.map((col, i) => join([
    '<div class="ftr__col">',
    `<p class="ftr__title" id="ft-${i}">${esc(col.titel)}</p>`,
    `<ul aria-labelledby="ft-${i}">`,
    col.links.map((l) => `<li><a href="${ctx.url(l.href)}">${esc(l.label)}</a></li>`).join('\n'),
    '</ul>',
    '</div>',
  ]));
  const k = site.kontakt;
  return join([
    '<footer class="ftr on-dark" id="fuss">',
    '<div class="wrap ftr__grid">',
    '<div class="ftr__brand">',
    `<p class="ftr__name"><span class="mark" aria-hidden="true"></span>${esc(site.marke.name)}</p>`,
    `<p>${esc(site.marke.zusatz)} in der ${esc(site.marke.gebiet)}</p>`,
    // Leitsatz nur auf Start und Über mich, sonst eine konkrete Zusage (Testkunden: Satz wirkte auf jeder Seite nach Vorlage)
    `<p class="ftr__claim">${['start', 'ueber-mich'].includes(ctx.page.id) ? 'KI entlastet Ihr Team, sie ersetzt niemanden.' : 'Code und Dokumentation gehören Ihnen. Jede Lösung lässt sich abschalten.'}</p>`,
    `<p class="ftr__contact">${esc(site.marke.region)}<br><a href="mailto:${esc(k.mail)}">${esc(k.mail)}</a>${when(k.telefon, () => `<br><a href="tel:${esc(k.telefon.replace(/\s+/g, ''))}">${esc(k.telefon)}</a>`)}${when(k.adresse, () => `<br>${esc(k.adresse)}`)}</p>`,
    '</div>',
    `<nav class="ftr__nav" aria-label="Fusszeile">${cols.join('\n')}</nav>`,
    '</div>',
    '<div class="wrap ftr__bottom">',
    `<p>© ${esc(site.seite.jahr)} ${esc(site.marke.name)} · Keine Cookies, keine Tracking-Dienste.</p>`,
    '<a class="ftr__top" href="#top">Nach oben</a>',
    '</div>',
    '</footer>',
  ]);
}

module.exports = { headMeta, header, footer };
