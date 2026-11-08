'use strict';
// Bausteine fuer alle hellen Seiten (Designsystem V4-KONZEPT Kapitel 3.6). Aufruf in Seiten: ctx.c.<name>(...).
// Fundament: Signaturen nicht aendern, nur ergaenzen (neue Optionen mit Standardwert). Eigene Bausteine einer
// Seiten-Gruppe gehoeren in eine eigene Datei (z. B. components/ki-mockups.js), siehe _src/README.md.

const { esc, attrs, cls, join, when, slug } = require('../lib/html');

/* ------------------------------------------------------------------ Kleinteile */

/** Symbol aus assets/icons.svg */
function icon(ctx, name, { cls: c = '', label = '' } = {}) {
  const a = label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"';
  return `<svg class="${cls('ico', c)}" width="24" height="24"${a} focusable="false"><use href="${ctx.url('assets/icons.svg')}#${esc(name)}"></use></svg>`;
}

/** Knopf als Link. variant: primary (Standard), secondary, ghost. thema: setzt ?thema= bei kontakt/ */
function btn(ctx, { href, label, variant = 'primary', arrow, size = '', cls: c = '', attrs: extra } = {}) {
  const showArrow = arrow === undefined ? variant === 'primary' : arrow;
  return `<a class="${cls('btn', variant !== 'primary' && `btn--${variant}`, size && `btn--${size}`, c)}" href="${ctx.url(href)}"${attrs(extra)}>${esc(label)}${showArrow ? '<span class="btn__arrow" aria-hidden="true"></span>' : ''}</a>`;
}

/** Reihe von Knoepfen: [{ href, label, variant }] */
function btns(ctx, list, { cls: c = '' } = {}) {
  const items = (list || []).filter(Boolean);
  if (!items.length) return '';
  return `<div class="${cls('btns', c)}">${items.map((b) => btn(ctx, b)).join('')}</div>`;
}

/** Text-Link mit Pfeil ("Ansehen ›"). sr: Zusatz nur fuer Screenreader */
function more(ctx, { href, label = 'Mehr', sr = '' }) {
  return `<a class="more" href="${ctx.url(href)}">${esc(label)}${sr ? `<span class="sr"> ${esc(sr)}</span>` : ''}</a>`;
}

const BADGES = {
  beispiel: 'Beispiel mit erfundenen Daten',
  muster: 'Musterbeispiel, erfundener Betrieb',
  demo: 'Vorführung mit erfundenen Daten, vorbereitete Antworten',
};
/** Kennzeichnung erfundener Inhalte: badge('beispiel'), badge('muster'), badge('demo') oder eigener Text */
function badge(ctx, key, { cls: c = '' } = {}) {
  return `<p class="${cls('badge', c)}">${esc(BADGES[key] || key)}</p>`;
}

/** Programm-Chips (Text, nie Logos): chips(['Outlook', 'bexio'], { label: 'Programme' }) */
function chips(ctx, list, { label = '', cls: c = '' } = {}) {
  return `<ul class="${cls('chips', c)}"${attrs({ 'aria-label': label })}>${(list || []).map((x) => `<li class="chip">${esc(x)}</li>`).join('')}</ul>`;
}

/** Chip "KI" (kuehl) oder "Sie" (warm), z. B. in Ablaeufen */
function who(ctx, kind) {
  if (kind === 'ki') return '<span class="chip chip--ki">KI</span>';
  if (kind === 'sie') return '<span class="chip chip--sie">Sie</span>';
  if (kind === 'team') return '<span class="chip chip--sie">Ihr Team</span>';
  return '';
}

function eyebrow(ctx, text, { tag = 'p' } = {}) {
  return text ? `<${tag} class="t-eyebrow">${text}</${tag}>` : '';
}

/** Liste: style 'check' (Haken), 'num' (Nummern), 'dot' (Punkte) */
function list(ctx, items, { style = 'check', cls: c = '' } = {}) {
  const tag = style === 'num' ? 'ol' : 'ul';
  return `<${tag} class="${cls('list', `list--${style}`, c)}">${(items || []).map((x) => `<li>${x}</li>`).join('')}</${tag}>`;
}

/** Brotkrumen: [{ label, href }], letzter Eintrag ist die aktuelle Seite (ohne href) */
function crumbs(ctx, items) {
  if (!items || !items.length) return '';
  const li = items.map((x, i) => {
    const last = i === items.length - 1;
    return `<li>${last || !x.href ? `<span${last ? ' aria-current="page"' : ''}>${esc(x.label)}</span>` : `<a href="${ctx.url(x.href)}">${esc(x.label)}</a>`}</li>`;
  }).join('');
  return `<nav class="crumbs" aria-label="Brotkrumen"><ol>${li}</ol></nav>`;
}

/**
 * Platzhalter fuer ein Mockup oder eine Grafik, die noch gebaut wird. Dekorativ (aria-hidden), ohne sichtbaren Text.
 * Der Build zaehlt alle Platzhalter (data-todo) und listet sie auf. tone: tint (Standard), soft, warm, dark.
 */
function placeholder(ctx, label, { ratio = '16 / 10', tone = 'tint', cls: c = '' } = {}) {
  return `<div class="${cls('ph', `ph--${tone}`, c)}" style="aspect-ratio: ${esc(ratio)}" data-todo="${esc(label)}" aria-hidden="true"><span class="ph__dots"></span></div>`;
}

/* ------------------------------------------------------------------ Abschnitte */

/** Titelblock eines Abschnitts. id: fuer aria-labelledby. align: 'center' */
function head(ctx, { eyebrow: eb, title, intro, id, level = 2, align = '', cls: c = '' } = {}) {
  if (!title && !eb && !intro) return '';
  const h = level === 2 ? 't-h2' : 't-h3';
  return join([
    `<header class="${cls('sec__head', align && `sec__head--${align}`, c)}" data-reveal>`,
    eyebrow(ctx, eb),
    when(title, () => `<h${level} class="${h}"${attrs({ id })}>${title}</h${level}>`),
    when(intro, () => `<p class="t-lead">${intro}</p>`),
    '</header>',
  ]);
}

/**
 * Abschnitt mit Titelblock. tone: '' (weiss), soft, tint, warm, stage (Buehne fuer Beispiele, Mockups, Demos und Rechner,
 * siehe css/site.css "Schaufenster"). width: '' (1200), wide (1360), text (720).
 * body: HTML. id: Anker (wird auch fuer die Ueberschrift verwendet: <id>-t).
 */
function section(ctx, { id, tone = '', width = '', head: h, body = '', cls: c = '', label } = {}) {
  const sid = id || (h && h.title ? slug(h.title.replace(/<[^>]+>/g, '')) : '');
  const tid = h && h.title ? `${sid}-t` : '';
  return join([
    `<section class="${cls('sec', tone && `sec--${tone}`, c)}"${attrs({ id: id || undefined, 'aria-labelledby': tid || undefined, 'aria-label': !tid ? label : undefined })}>`,
    `<div class="${cls('wrap', width && `wrap--${width}`)}">`,
    h ? head(ctx, { ...h, id: tid }) : '',
    body,
    '</div>',
    '</section>',
  ]);
}

/**
 * Hero oben auf der Seite (enthaelt die einzige H1).
 * variant: compact (Standard), split (Text links, Grafik rechts), stage (Text links, dunkle Buehne rechts),
 *          statement (zentriert, Produktbild darunter), type (grosse Zeile links, Karte rechts).
 * media: HTML fuer die Grafik (split, stage, statement) oder die Karte (type).
 */
function hero(ctx, { variant = 'compact', crumbs: cr, eyebrow: eb, title, lead, buttons, line, media = '', cls: c = '' } = {}) {
  const text = join([
    cr ? crumbs(ctx, cr) : '',
    eyebrow(ctx, eb),
    `<h1 class="${variant === 'statement' ? 't-display-xl' : 't-display'}">${title}</h1>`,
    when(lead, () => `<p class="t-lead hero__lead">${lead}</p>`),
    btns(ctx, buttons),
    when(line, () => `<p class="hero__line">${line}</p>`),
  ]);
  if (variant === 'compact') {
    return `<section class="${cls('hero hero--compact', c)}"><div class="wrap"><div class="hero__text">${text}</div></div></section>`;
  }
  return join([
    `<section class="${cls('hero', `hero--${variant}`, c)}">`,
    '<div class="wrap wrap--wide hero__grid">',
    `<div class="hero__text">${text}</div>`,
    when(media, () => `<div class="hero__media">${media}</div>`),
    '</div>',
    '</section>',
  ]);
}

/* ------------------------------------------------------------------ Karten und Kacheln */

/**
 * Karten-Raster. items: [{ title, text, href, linkLabel, icon, eyebrow, html }], cols: 2, 3 oder 4.
 * Mit href ist die ganze Karte klickbar (ein Link pro Karte, Titel ist der Link).
 */
function cards(ctx, items, { cols = 3, tone = '', level = 3, cls: c = '' } = {}) {
  const li = (items || []).map((x) => {
    const t = x.href
      ? `<a class="card__link" href="${ctx.url(x.href)}">${x.title}</a>`
      : x.title;
    return join([
      `<li class="${cls('card', x.href && 'card--link', x.tone && `card--${x.tone}`)}" data-reveal>`,
      when(x.icon, () => `<span class="card__icon">${icon(ctx, x.icon)}</span>`),
      eyebrow(ctx, x.eyebrow),
      when(x.title, () => `<h${level} class="t-h3 card__title">${t}</h${level}>`),
      when(x.text, () => `<p class="card__text">${x.text}</p>`),
      x.html || '',
      when(x.href, () => `<span class="more card__more" aria-hidden="true">${esc(x.linkLabel || 'Ansehen')}</span>`),
      '</li>',
    ]);
  }).join('\n');
  return `<ul class="${cls('cards', `cards--${cols}`, tone && `cards--${tone}`, c)}">${li}</ul>`;
}

/** Werkzeug-Kacheln mit den Symbolen der 3D-Knoten. items: [{ icon, title, text, href }] */
function tiles(ctx, items, opts = {}) {
  return cards(ctx, items, { cols: 4, ...opts, cls: cls('tiles', opts.cls) });
}

/** Kennzahl: { value, label, sub } */
function stat(ctx, { value, label, sub }) {
  return `<div class="stat" data-reveal><p class="t-stat">${value}</p><p class="stat__label">${label}</p>${sub ? `<p class="stat__sub">${sub}</p>` : ''}</div>`;
}

/* ------------------------------------------------------------------ Ablauf */

/**
 * Ablauf-Grafik (Konzept 3.6.4). items: [{ title, parts: [['Sie', '...'], ['Ich', '...'], ['Preis', '...']],
 * decide: true (warmer Knoten, Chip "Sie entscheiden"), text }]. Waagrecht ab 1024 px, sonst senkrecht.
 * vertical: true bleibt immer senkrecht (z. B. in einer schmalen Spalte).
 */
function steps(ctx, items, { level = 3, decideLabel = 'Sie entscheiden', vertical = false, cls: c = '' } = {}) {
  const n = (items || []).length;
  const li = items.map((x, i) => join([
    `<li class="${cls('step', x.decide && 'step--decide')}" data-reveal>`,
    `<span class="step__node" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>`,
    `<h${level} class="t-h3 step__title">${x.title}</h${level}>`,
    when(x.text, () => `<p class="step__text">${x.text}</p>`),
    when(x.parts && x.parts.length, () => `<dl class="step__dl">${x.parts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`),
    when(x.decide, () => `<p class="chip chip--sie step__chip">${esc(decideLabel)}</p>`),
    '</li>',
  ])).join('\n');
  return `<ol class="${cls('steps', !vertical && `steps--${n}`, c)}">${li}</ol>`;
}

/**
 * Vorher/Nachher (Konzept 3.6.5). before: ['...'], after: [{ text, who: 'ki'|'sie' }] oder Strings.
 */
function beforeAfter(ctx, { before = [], after = [], titleBefore = 'Heute', titleAfter = 'Mit KI', same = 'Was gleich bleibt: Sie entscheiden.', level = 3 } = {}) {
  const row = (x, side) => {
    const o = typeof x === 'string' ? { text: x } : x;
    const tag = side === 'before' ? '<span class="ba__who">' + icon(ctx, 'person') + '</span>' : (o.who ? who(ctx, o.who) : '<span class="ba__who"></span>');
    return `<li class="${cls(o.who === 'sie' && 'is-sie')}">${tag}<span>${o.text}</span></li>`;
  };
  return join([
    '<div class="ba">',
    `<div class="ba__col ba__col--before" data-reveal><h${level} class="ba__title">${esc(titleBefore)}</h${level}><ol class="ba__list">${before.map((x) => row(x, 'before')).join('')}</ol></div>`,
    `<div class="ba__col ba__col--after" data-reveal><h${level} class="ba__title">${esc(titleAfter)}</h${level}><ol class="ba__list">${after.map((x) => row(x, 'after')).join('')}</ol>${same ? `<p class="ba__same">${esc(same)}</p>` : ''}</div>`,
    '</div>',
  ]);
}

/* ------------------------------------------------------------------ Preise */

/**
 * Preis-Karten (Konzept 3.6.6). items: [{ id (aus site.json), points: ['...'], featured, badge, text,
 * hours: true (Zeile "entspricht rund N Stunden"), button: { href, label } }]. Betraege nur aus site.json.
 */
function priceCards(ctx, items, { level = 3, cls: c = '' } = {}) {
  const rate = ctx.site.preise.stundenansatz;
  const li = items.map((x) => {
    const p = ctx.preis(x.id);
    const t = ctx.fmt.preisTeile(p);
    let hours = '';
    if (x.hours) {
      const h = p.stunden || (p.betrag ? Math.round(p.betrag / rate) : 0);
      if (h) hours = `<p class="price__hours">${p.stunden ? `${h} Stunden` : `entspricht rund ${h} Stunden`} à ${esc(ctx.fmt.chf(rate))}</p>`;
    }
    return join([
      `<li class="${cls('price', x.featured && 'price--featured')}" data-reveal>`,
      when(x.badge, () => `<p class="price__badge">${esc(x.badge)}</p>`),
      `<h${level} class="t-h3 price__name">${esc(x.name || p.name)}</h${level}>`,
      `<p class="price__art">${esc(x.art || t.art)}</p>`,
      `<p class="price__amount">${t.vor ? `<span class="price__pre">${t.vor}</span> ` : ''}<span class="t-price">${esc(t.betrag)}</span>${t.einheit ? ` <span class="price__unit">${t.einheit}</span>` : ''}</p>`,
      hours,
      when(x.text || p.text, () => `<p class="price__text">${x.text || esc(p.text)}</p>`),
      when(x.points && x.points.length, () => list(ctx, x.points, { style: 'check', cls: 'price__list' })),
      when(x.button, () => btn(ctx, { variant: x.featured ? 'primary' : 'secondary', ...x.button, cls: 'price__btn' })),
      '</li>',
    ]);
  }).join('\n');
  return `<ul class="${cls('prices', `prices--${items.length}`, c)}">${li}</ul>`;
}

/** Kompakte Preisleiste (Konzept 3.6.7). ids: ['ki-check', 'pilot', 'einfuehrung', 'betrieb', 'nutzung'] */
function priceStrip(ctx, ids = ['ki-check', 'pilot', 'einfuehrung', 'betrieb', 'nutzung'], { note = true, link = true } = {}) {
  const rows = ids.map((id) => {
    const p = ctx.preis(id);
    const label = p.art === 'monat-spanne' ? `${p.name}, ${p.text || ''}`.replace(/,\s*$/, '') : p.name;
    return `<div class="pstrip__row"><dt>${esc(label)}</dt><dd>${esc(ctx.fmt.preisText(p))}</dd></div>`;
  }).join('');
  return join([
    `<dl class="pstrip" data-reveal>${rows}</dl>`,
    when(note, () => preisHinweis(ctx)),
    when(link, () => `<p class="pstrip__more">${more(ctx, { href: 'preise/', label: 'Alle Preise im Detail' })}</p>`),
  ]);
}

/** Preis-Hinweis (Texte 2.6) */
function preisHinweis(ctx) {
  return `<p class="note">${esc(ctx.site.preise.hinweis)} ${esc(ctx.site.preise.mwst)}</p>`;
}

/* ------------------------------------------------------------------ FAQ, Kaesten */

/**
 * Haeufige Fragen mit <details> (geht ohne JS). items: [{ q, a, id }]. a darf HTML sein (Absaetze mit <p>).
 * name: Gruppe (nur eine Frage offen). Die erste Frage ist offen. Link auf #faq-<id> oeffnet die Frage (site.js).
 */
function faq(ctx, items, { name = 'faq', openFirst = true } = {}) {
  const it = items.map((x, i) => {
    const id = `faq-${x.id || slug(x.q)}`;
    const a = /^\s*</.test(x.a) ? x.a : `<p>${x.a}</p>`;
    return `<details class="faq__item" name="${esc(name)}" id="${esc(id)}"${openFirst && i === 0 ? ' open' : ''}><summary class="faq__q"><span>${x.q}</span><span class="faq__icon" aria-hidden="true"></span></summary><div class="faq__a">${a}</div></details>`;
  }).join('\n');
  return `<div class="faq" data-reveal>${it}</div>`;
}

/** Grundsatz-Kasten (Konzept 3.6.9): grosse Zeile, Ember-Strich, Mono-Absender */
function principle(ctx, text, { sign, sub = '' } = {}) {
  const s = sign === undefined ? ctx.site.person.name : sign;
  return `<figure class="principle" data-reveal><blockquote><p>${text}</p></blockquote>${sub ? `<p class="principle__sub">${sub}</p>` : ''}${s ? `<figcaption>${esc(s)}</figcaption>` : ''}</figure>`;
}

/** Info-Kasten (Konzept 3.6.10). tone: tint (Standard) oder warm. link: { href, label } */
function info(ctx, { icon: ic = 'schild', title, text, link, tone = 'tint', level = 3 } = {}) {
  return join([
    `<div class="${cls('info', `info--${tone}`)}" data-reveal>`,
    `<span class="info__icon">${icon(ctx, ic)}</span>`,
    '<div class="info__body">',
    when(title, () => `<h${level} class="info__title">${title}</h${level}>`),
    when(text, () => (/^\s*</.test(text) ? text : `<p>${text}</p>`)),
    when(link, () => `<p>${more(ctx, link)}</p>`),
    '</div>',
    '</div>',
  ]);
}

/** Datenschutz-Hinweis fuer Werkzeug- und Branchenseiten (Texte 2.5) */
function datenschutzBox(ctx, { text } = {}) {
  return info(ctx, {
    icon: 'schild',
    title: 'Datenschutz',
    // gleiche Regel wie auf sicherheit/ (#standort): Standard Schweiz, Ausnahmen nur schriftlich, pro Fall
    text: text || ctx.t('Zur KI geht nur der Text, der für die Aufgabe nötig ist. Ich setze nur Geschäftsangebote ein, deren Bedingungen das Training mit Ihren Daten ausschliessen. Kundendaten verarbeite ich standardmässig {{daten_standard}}, etwas anderes nur mit Ihrer schriftlichen Zustimmung, pro Fall. Welcher Anbieter welche Daten erhält, wissen Sie vor dem Start schriftlich.'),
    link: { href: 'sicherheit/', label: 'Mehr zu Datenschutz und Sicherheit' },
  });
}

/* ------------------------------------------------------------------ Abschluss */

/**
 * Dunkles Band am Seitenende (Konzept 3.9). buttons wie btns(). Auf Dunkel ist der Hauptknopf Cyan.
 */
function ctaBand(ctx, { title, text, buttons, mail = true, id = 'abschluss' } = {}) {
  const m = ctx.site.kontakt.mail;
  return join([
    `<section class="cta-band on-dark" id="${esc(id)}" aria-labelledby="${esc(id)}-t">`,
    '<div class="wrap cta-band__inner" data-reveal>',
    '<span class="mark mark--lg" aria-hidden="true"></span>',
    `<h2 class="t-h2" id="${esc(id)}-t">${title}</h2>`,
    when(text, () => `<p class="t-lead">${text}</p>`),
    btns(ctx, buttons),
    when(mail, () => `<p class="cta-band__mail">Lieber per Mail? <a href="mailto:${esc(m)}">${esc(m)}</a></p>`),
    '</div>',
    '</section>',
  ]);
}

/** Standard-Abschluss fuer Unterseiten (Texte 2.3) */
function kontaktBlock(ctx, { title, text, buttons } = {}) {
  return ctaBand(ctx, {
    title: title || 'Sprechen wir über Ihren Betrieb.',
    text: text || ctx.t('Ein paar Sätze genügen. Ich antworte {{reaktionszeit}}, meistens am Abend.'),
    buttons: buttons || [
      { href: 'kontakt/?thema=ki-check', label: 'KI-Check anfragen' },
      { href: 'kontakt/?thema=website', label: 'Website-Entwurf anfragen', variant: 'secondary' },
    ],
  });
}

/** Fliesstext mit Lesebreite (Rechtliches, lange Texte) */
function prose(ctx, html, { cls: c = '' } = {}) {
  return `<div class="${cls('prose', c)}">${html}</div>`;
}

module.exports = {
  icon, btn, btns, more, badge, chips, who, eyebrow, list, crumbs, placeholder,
  head, section, hero, cards, tiles, stat, steps, beforeAfter,
  priceCards, priceStrip, preisHinweis, faq, principle, info, datenschutzBox,
  ctaBand, kontaktBlock, prose,
};
