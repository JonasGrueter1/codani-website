'use strict';
// Mockups und Schemata der KI-Seiten (V4-KONZEPT 3.7): in HTML, CSS und SVG gebaut, keine Bilder, keine fremden
// Oberflaechen nachgebaut. Alle Namen und Daten sind erfunden (Muster, Beispiel) und als Beispiel gekennzeichnet.
// Inhaltliche Mockups haben role="img" mit aria-label, dekorative aria-hidden. Stile: css/ki-mockups.css.
// Gruppe: KI-Seiten.

const { esc, cls, join, when } = require('../lib/html');

const BEISPIEL = 'Beispiel mit erfundenen Daten: ';

/** Fensterrahmen eines Programms (neutral): Titelzeile mit drei Punkten */
function win(title, body, { c = '', label = '' } = {}) {
  return join([
    `<div class="${cls('mk-win', c)}" role="img" aria-label="${esc(BEISPIEL + label)}">`,
    `<div class="mk-win__bar" aria-hidden="true"><span class="mk-win__dots"><i></i><i></i><i></i></span><span class="mk-win__title">${title}</span></div>`,
    body,
    '</div>',
  ]);
}

const initials = (name) => String(name).split(/[\s.]+/).filter((w) => /^[A-ZÄÖÜ]/.test(w)).slice(0, 2).map((w) => w[0]).join('');

/* ------------------------------------------------------------------ Buehne auf ki/: Kabel-Szene als Schema */

// Knoten in Koordinaten der Grafik (viewBox 800 x 520). Die HTML-Links sitzen in Prozent genau darauf.
const KNOTEN = [
  { key: 'e-mail', icon: 'mail', label: 'E-Mail', href: 'ki/e-mail/', x: 150, y: 120, c: [300, 250, 250, 120] },
  { key: 'kalender', icon: 'kalender', label: 'Kalender', href: 'ki/kalender/', x: 650, y: 112, c: [500, 248, 560, 112] },
  { key: 'dokumente', icon: 'dokument', label: 'Dokumente', href: 'ki/dokumente/', x: 124, y: 372, c: [290, 300, 230, 372] },
  { key: 'kunden', icon: 'kunden', label: 'Kunden', href: 'ki/kunden/', x: 676, y: 380, c: [510, 300, 580, 380] },
  { key: 'website', icon: 'website', label: 'Website', href: 'websites/', x: 400, y: 438, c: [400, 360, 400, 400] },
];
const CORE = { x: 400, y: 262 };

function kiBuehne(ctx) {
  const icons = ctx.url('assets/icons.svg');
  const cables = KNOTEN.map((k, i) => {
    const [c1x, c1y, c2x, c2y] = k.c;
    const d = `M${CORE.x} ${CORE.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${k.x} ${k.y}`;
    return join([
      `<g class="kb__cable" data-node="${k.key}">`,
      `<path class="kb__glow" d="${d}"/>`,
      `<path class="kb__line" d="${d}"/>`,
      `<path class="kb__pulse" d="${d}" pathLength="100" style="--d:${(i * 0.7).toFixed(1)}s"/>`,
      '</g>',
    ]);
  }).join('\n');
  const nodes = KNOTEN.map((k) => join([
    `<g class="kb__node" data-node="${k.key}" transform="translate(${k.x} ${k.y})">`,
    '<circle class="kb__halo" r="40"/>',
    '<circle class="kb__ring" r="28"/>',
    `<use href="${icons}#${k.icon}" x="-12" y="-12" width="24" height="24" class="kb__icon"/>`,
    '</g>',
  ])).join('\n');
  const links = KNOTEN.map((k) => `<li style="--x:${(k.x / 8).toFixed(2)}%;--y:${(k.y / 5.2).toFixed(2)}%"><a class="kb__link" href="${ctx.url(k.href)}" data-node="${k.key}">${ctx.c.icon(k.icon)}<span>${k.label}</span></a></li>`).join('');
  // Feste Lichtpunkte im Hintergrund (deterministisch)
  const dots = [[70, 40, 1.4], [240, 60, 1], [520, 46, 1.6], [740, 64, 1.1], [44, 250, 1.2], [770, 250, 1.5], [210, 470, 1.1], [600, 488, 1.3], [330, 150, 0.9], [470, 380, 1], [560, 200, 0.8], [250, 330, 0.8]]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  return join([
    '<div class="kb">',
    '<svg class="kb__svg" viewBox="0 0 800 520" aria-hidden="true" focusable="false">',
    '<defs>',
    '<radialGradient id="kb-core" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#9ff4ff"/><stop offset="0.35" stop-color="#46e6ff"/><stop offset="1" stop-color="#0a6f86" stop-opacity="0.15"/></radialGradient>',
    '<radialGradient id="kb-haze" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#46e6ff" stop-opacity="0.22"/><stop offset="1" stop-color="#46e6ff" stop-opacity="0"/></radialGradient>',
    '<filter id="kb-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>',
    '</defs>',
    `<g class="kb__dots">${dots}</g>`,
    `<circle class="kb__haze" cx="${CORE.x}" cy="${CORE.y}" r="190" fill="url(#kb-haze)"/>`,
    cables,
    `<g class="kb__core" transform="translate(${CORE.x} ${CORE.y})">`,
    '<circle class="kb__orbit" r="86"/>',
    '<circle class="kb__orbit kb__orbit--2" r="62"/>',
    '<circle class="kb__corebg" r="44"/>',
    '<circle r="44" fill="url(#kb-core)" opacity="0.35"/>',
    '<circle class="kb__corering" r="30"/>',
    '<circle class="kb__ember" r="8"/>',
    '</g>',
    nodes,
    '</svg>',
    `<p class="kb__caption"><span class="kb__caption-k">KI</span> liest, sortiert und schreibt Entwürfe. Sie entscheiden.</p>`,
    `<nav class="kb__nav" aria-label="KI-Werkzeuge"><ul>${links}</ul></nav>`,
    '</div>',
  ]);
}

/* ------------------------------------------------------------------ Postfach (E-Mail) */

function kiMockPostfach(ctx) {
  const mails = [
    { von: 'Reto Beispiel', zeit: 'Mo 08.03', betreff: 'Offerte Garagentor', vor: 'Vor zwei Wochen haben wir eine Offerte für ein neues Garagentor angefragt.', tag: 'Entwurf bereit', sel: true },
    { von: 'Sara Muster', zeit: 'Mo 07.51', betreff: 'Fehlende Unterlagen', vor: 'Welche Unterlagen brauchen Sie noch von uns?', tag: 'Entwurf bereit' },
    { von: 'Marco Beispiel', zeit: 'Mo 07.30', betreff: 'Öffnungszeiten über die Feiertage', vor: 'Haben Sie zwischen Weihnachten und Neujahr offen?', tag: 'Entwurf bereit' },
    { von: 'Anna Muster', zeit: 'So 21.14', betreff: 'Reklamation Lieferung', vor: 'Leider ist bei der Lieferung etwas schiefgegangen.', tag: 'Ihr Team', team: true },
  ];
  const list = mails.map((m) => join([
    `<li class="${cls('mk-mail', m.sel && 'is-sel')}">`,
    `<span class="mk-ava">${initials(m.von)}</span>`,
    '<span class="mk-mail__main">',
    `<span class="mk-mail__row"><span class="mk-mail__von">${m.von}</span><span class="mk-mail__zeit">${m.zeit}</span></span>`,
    `<span class="mk-mail__betreff">${m.betreff}</span>`,
    `<span class="mk-mail__vor">${m.vor}</span>`,
    `<span class="${cls('mk-tag', m.team ? 'mk-tag--team' : 'mk-tag--ki')}">${m.tag}</span>`,
    '</span>',
    '</li>',
  ])).join('');
  const body = join([
    '<div class="mk-postfach">',
    `<div class="mk-postfach__list"><p class="mk-pane-title">Posteingang <span>4</span></p><ul>${list}</ul></div>`,
    '<div class="mk-postfach__draft">',
    '<p class="mk-draftbadge">Entwurf, nicht gesendet</p>',
    '<dl class="mk-kopf"><div><dt>An</dt><dd>Reto Beispiel</dd></div><div><dt>Betreff</dt><dd>AW: Offerte Garagentor</dd></div></dl>',
    '<div class="mk-text"><p>Guten Tag Herr Beispiel</p><p>Danke für Ihre Nachfrage. Ihre Offerte für das Garagentor ist in Arbeit, Sie erhalten sie bis Freitag, 6. November 2026.</p><p>Freundliche Grüsse<br>M. Muster</p></div>',
    '<p class="mk-hint">Versanddatum aus der Offertenliste übernommen. Bitte prüfen.</p>',
    '<p class="mk-actions"><span class="mk-btn">Senden</span><span class="mk-btn mk-btn--ghost">Bearbeiten</span></p>',
    '</div>',
    '</div>',
  ]);
  return win('Posteingang', body, {
    c: 'mk-win--postfach',
    label: 'Postfach mit vier neuen Mails. Für drei liegt ein Antwortentwurf bereit, die Reklamation ist für Ihr Team markiert. Offen ist der Entwurf an Reto Beispiel zur Frage nach seiner Offerte, mit dem Hinweis, das Versanddatum zu prüfen.',
  });
}

/* ------------------------------------------------------------------ Kalender */

function kiMockKalender(ctx) {
  const tage = [['Mo', '16'], ['Di', '17'], ['Mi', '18'], ['Do', '19'], ['Fr', '20']];
  // [Tag 0..4, Beginn (Stunde), Dauer (Stunden), Text, Art]
  const ev = [
    [0, 8, 1.5, 'Baustelle', ''], [0, 13.5, 2, 'Kundentermin', ''],
    [1, 9, 2, 'Besprechung', ''], [1, 14, 1, 'Vorschlag 1', 'vor'], [1, 15.5, 1.5, 'Kundentermin', ''],
    [2, 8, 4, 'Abschlüsse', ''], [2, 13, 3, 'Abschlüsse', ''],
    [3, 10, 1, 'Team', ''], [3, 13.5, 1.5, 'Besprechung', ''], [3, 15.5, 1, 'Vorschlag 2', 'vor'],
    [4, 8, 2, 'Kundentermin', ''], [4, 13, 2.5, 'Weiterbildung', ''],
  ];
  const start = 8;
  const span = 9; // 8 bis 17 Uhr
  const hours = Array.from({ length: span + 1 }, (_, i) => `<span style="--t:${(i / span * 100).toFixed(3)}%">${String(start + i).padStart(2, '0')}</span>`).join('');
  const cols = tage.map(([d, n], i) => join([
    `<div class="mk-cal__col">`,
    `<p class="mk-cal__day"><span>${d}</span> ${n}</p>`,
    '<div class="mk-cal__slots">',
    ev.filter((e) => e[0] === i).map(([, b, dur, t, art]) => {
      const zeit = `${String(Math.floor(b)).padStart(2, '0')}.${b % 1 ? '30' : '00'}`;
      return `<span class="${cls('mk-ev', art && `mk-ev--${art}`)}" style="--t:${((b - start) / span * 100).toFixed(3)}%;--h:${(dur / span * 100).toFixed(3)}%"><b>${zeit}</b> ${t}</span>`;
    }).join(''),
    '</div>',
    '</div>',
  ])).join('');
  const body = join([
    '<div class="mk-cal">',
    '<div class="mk-cal__head"><p class="mk-cal__range">16. bis 20. November</p><p class="mk-cal__legend"><span class="mk-ev-dot"></span>Vorschlag der KI</p></div>',
    `<div class="mk-cal__grid"><div class="mk-cal__hours">${hours}</div>${cols}</div>`,
    '<div class="mk-cal__reply">',
    '<p class="mk-draftbadge">Entwurf an Sara Muster</p>',
    '<p>Diese Termine sind frei: <b>Di 17.11., 14.00</b> · <b>Do 19.11., 15.30</b> · <b>Di 24.11., 13.30</b> (Folgewoche)</p>',
    '</div>',
    '</div>',
  ]);
  return win('Kalender', body, {
    c: 'mk-win--kalender',
    label: 'Wochenkalender vom 16. bis 20. November mit bestehenden Terminen. Die KI schlägt zwei freie Zeiten am Dienstagnachmittag und am Donnerstagnachmittag vor, dazu eine in der Folgewoche, und hat eine Antwort an Sara Muster vorbereitet.',
  });
}

/* ------------------------------------------------------------------ Dokument wird Tabelle */

function kiMockDokument(ctx) {
  const icon = ctx.c.icon;
  const pdf = join([
    '<div class="mk-pdf">',
    `<p class="mk-pdf__file">${icon('dokument')}<span>Lieferschein.pdf</span></p>`,
    '<div class="mk-pdf__page">',
    '<p class="mk-pdf__firm"><span class="mk-pdf__logo"></span>Holzhandel Muster</p>',
    '<p class="mk-pdf__title">Lieferschein</p>',
    '<p class="mk-pdf__f"><span>Datum</span><mark class="mk-mark" data-n="1">26.10.2026</mark></p>',
    '<p class="mk-pdf__f"><span>Projekt</span><mark class="mk-mark" data-n="2">Umbau Musterweg 4</mark></p>',
    '<div class="mk-pdf__pos"><p><mark class="mk-mark" data-n="3">Dreischichtplatte Fichte 27 mm</mark><span>12 Stk.</span></p><p class="mk-pdf__blur"><i></i><i></i></p><p class="mk-pdf__blur"><i></i></p></div>',
    '<p class="mk-pdf__sign"><i></i>Unterschrift</p>',
    '</div>',
    '</div>',
  ]);
  const rows = [
    ['26.10.2026', 'Holzhandel Muster', 'Dreischichtplatte Fichte 27 mm', '12 Stk.', 'Umbau Musterweg 4'],
    ['27.10.2026', 'Beschläge Beispiel', 'Topfscharnier 110°', '40 Stk.', 'Küche Familie Beispiel'],
    ['28.10.2026', 'Holzhandel Muster', 'Kantenband Eiche 23 mm', '2 Rollen', 'bitte prüfen'],
  ];
  const tbl = join([
    '<div class="mk-sheet">',
    `<p class="mk-sheet__file">${icon('liste')}<span>Materialliste</span></p>`,
    '<table class="mk-sheet__tbl"><thead><tr><th>Datum</th><th>Lieferant</th><th>Artikel</th><th>Menge</th><th>Projekt</th></tr></thead>',
    `<tbody>${rows.map((r, i) => `<tr class="${cls(i === 0 && 'is-neu', i === 2 && 'is-pruefen')}">${r.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
    '<p class="mk-hint">Zeile 3: Projektnummer nicht lesbar, darum markiert.</p>',
    '</div>',
  ]);
  return join([
    `<div class="mk-dok" role="img" aria-label="${esc(`${BEISPIEL}Ein Lieferschein als PDF, Datum, Projekt und Artikel sind markiert. Die KI überträgt die Angaben von drei Lieferscheinen in eine Materialliste. Die dritte Zeile ist gelb markiert, weil die Projektnummer nicht lesbar war.`)}">`,
    pdf,
    '<div class="mk-dok__arrow" aria-hidden="true"><span class="chip chip--ki">KI</span><i></i></div>',
    tbl,
    '</div>',
  ]);
}

/* ------------------------------------------------------------------ Liste der Anfragen (Kunden) */

const ANFRAGEN = [
  { zeit: 'Mo 08.12', kanal: 'Telefon', icon: 'telefon', von: 'Reto Beispiel', anliegen: 'Rückruf wegen Offerte Garagentor', dr: 'normal', wer: 'M. Muster', status: 'offen', st: 'offen' },
  { zeit: 'Mo 09.40', kanal: 'WhatsApp', icon: 'chat', von: 'Anna Muster', anliegen: 'Foto: Fensterscheibe gesprungen, Ersatz?', dr: 'hoch', wer: 'L. Beispiel', status: 'Entwurf bereit', st: 'entwurf',
    detail: { zus: 'Fensterscheibe im Wohnzimmer gesprungen, Foto liegt bei. Fragt, ob wir die Scheibe ersetzen.', vor: 'Antwortentwurf: Termin für die Besichtigung vorschlagen, Mass vor Ort nehmen.' } },
  { zeit: 'Mo 10.05', kanal: 'Mail', icon: 'mail', von: 'Sara Muster', anliegen: 'Termin für Besichtigung', dr: 'normal', wer: 'M. Muster', status: 'Termin vorgeschlagen', st: 'entwurf' },
  { zeit: 'Mo 11.30', kanal: 'Website', icon: 'website', von: 'Marco Beispiel', anliegen: 'Frage nach Preisliste', dr: 'tief', wer: 'Sekretariat', status: 'beantwortet', st: 'ok' },
];
const ANFRAGEN_MEHR = [
  { zeit: 'Mo 13.15', kanal: 'Telefon', icon: 'telefon', von: 'Lea Muster', anliegen: 'Combox: Frage zur Rechnung', dr: 'normal', wer: 'Sekretariat', status: 'Entwurf bereit', st: 'entwurf' },
  { zeit: 'Mo 14.02', kanal: 'Mail', icon: 'mail', von: 'Nico Beispiel', anliegen: 'Bestätigt den Termin am Donnerstag', dr: 'tief', wer: 'M. Muster', status: 'erledigt', st: 'ok' },
];

/**
 * Liste der Anfragen. mehr: sechs statt vier Zeilen. offen: Zeile mit Detail aufgeklappt (Standard: ja).
 */
function kiMockListe(ctx, { mehr = false, offen = true } = {}) {
  const icon = ctx.c.icon;
  const items = mehr ? [...ANFRAGEN, ...ANFRAGEN_MEHR] : ANFRAGEN;
  const n = (st) => items.filter((x) => x.st === st).length;
  const rows = items.map((x) => join([
    `<li class="${cls('mk-req', offen && x.detail && 'is-open')}">`,
    '<div class="mk-req__row">',
    `<span class="mk-req__kanal">${icon(x.icon)}<span>${x.kanal}</span></span>`,
    `<span class="mk-req__zeit">${x.zeit}</span>`,
    `<span class="mk-req__main"><span class="mk-req__von">${x.von}</span><span class="mk-req__anliegen">${x.anliegen}</span></span>`,
    `<span class="${cls('mk-dr', `mk-dr--${x.dr}`)}">${x.dr}</span>`,
    `<span class="mk-req__wer">${x.wer}</span>`,
    `<span class="${cls('mk-st', `mk-st--${x.st}`)}">${x.status}</span>`,
    '</div>',
    when(offen && x.detail, () => join([
      '<div class="mk-req__detail">',
      `<p><b>Zusammenfassung der KI</b>${x.detail.zus}</p>`,
      `<p><b>Vorbereitet</b>${x.detail.vor}</p>`,
      '<p class="mk-actions"><span class="mk-btn">Entwurf ansehen</span><span class="mk-btn mk-btn--ghost">Zuteilung ändern</span></p>',
      '</div>',
    ])),
    '</li>',
  ])).join('');
  const body = join([
    '<div class="mk-list">',
    `<p class="mk-list__filter"><span class="is-on">Alle ${items.length}</span><span>Offen ${n('offen')}</span><span>Entwurf bereit ${n('entwurf')}</span><span>Erledigt ${n('ok')}</span></p>`,
    '<div class="mk-list__head"><span>Kanal</span><span>Eingang</span><span>Von und Anliegen</span><span>Dringlichkeit</span><span>Zuständig</span><span>Status</span></div>',
    `<ul class="mk-list__rows">${rows}</ul>`,
    '</div>',
  ]);
  const kanaele = [...new Set(items.map((x) => x.kanal))].join(', ');
  return win('Anfragen, heute', body, {
    c: 'mk-win--liste',
    label: `Liste mit ${items.length} Anfragen aus ${kanaele}. Jede Zeile zeigt Anliegen, Dringlichkeit, Zuständigkeit und Status. Aufgeklappt ist die Meldung von Anna Muster über WhatsApp: Fensterscheibe gesprungen, Dringlichkeit hoch, ein Antwortentwurf liegt bereit.`,
  });
}

/* ------------------------------------------------------------------ Datenweg (Programme auf ki/) */

function kiDatenweg(ctx) {
  const icon = ctx.c.icon;
  const steps = [
    { icon: 'stecker', t: 'Ihr Programm', s: 'Outlook, bexio, Excel und Co. Ihre Daten bleiben dort.' },
    { icon: 'schluessel', t: 'Schnittstelle', s: 'Offizieller Zugang des Programms. Es geht nur, was die Aufgabe braucht.' },
    { icon: 'funke', t: 'KI-Dienst', s: 'Geschäftsangebot, dessen Bedingungen das Training mit Ihren Daten ausschliessen.' },
    { icon: 'dokument', t: 'Entwurf', s: 'Die KI legt einen Entwurf zurück in Ihr Programm.' },
    { icon: 'person', t: 'Sie prüfen', s: 'Sie geben frei, ändern oder verwerfen.', sie: true },
    { icon: 'haken', t: 'Erledigt', s: 'Erst nach Ihrer Freigabe geht etwas hinaus.' },
  ];
  return join([
    '<ol class="dw" aria-label="So läuft ein Auftrag durch die Lösung">',
    steps.map((x, i) => join([
      `<li class="${cls('dw__step', x.sie && 'dw__step--sie')}" data-reveal>`,
      `<span class="dw__icon">${icon(x.icon)}</span>`,
      `<span class="dw__nr" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>`,
      `<p class="dw__t">${x.t}</p>`,
      `<p class="dw__s">${x.s}</p>`,
      '</li>',
    ])).join('\n'),
    '</ol>',
  ]);
}

/* ------------------------------------------------------------------ Kanaele werden eine Liste (Kunden) */

function kiKanaele(ctx, items) {
  const icon = ctx.c.icon;
  return join([
    '<div class="kanaele">',
    `<ul class="kanaele__in">${items.map((x) => `<li class="kanaele__item" data-reveal><span class="kanaele__icon">${icon(x.icon)}</span><div><h3 class="kanaele__t">${x.title}</h3><p class="kanaele__s">${x.text}</p></div></li>`).join('')}</ul>`,
    '<svg class="kanaele__lines" viewBox="0 0 120 400" preserveAspectRatio="none" aria-hidden="true" focusable="false">',
    [50, 150, 250, 350].map((y) => `<path d="M0 ${y} C 60 ${y}, 60 200, 120 200"/>`).join(''),
    '</svg>',
    '<div class="kanaele__out" data-reveal>',
    `<p class="kanaele__badge">${icon('liste')}<span>Eine Liste</span></p>`,
    '<ul class="kanaele__mini" aria-hidden="true">',
    ['telefon', 'chat', 'mail', 'website'].map((ic, i) => `<li>${icon(ic)}<i style="--w:${[72, 88, 60, 50][i]}%"></i><span class="${['', 'is-hoch', '', 'is-tief'][i]}"></span></li>`).join(''),
    '</ul>',
    '<p class="kanaele__s">Mit Anliegen, Dringlichkeit und Zuständigkeit. Ihr Team sieht auf einen Blick, was offen ist.</p>',
    '</div>',
    '</div>',
  ]);
}

/* ------------------------------------------------------------------ Weg und Preise (Werkzeug-Seiten) */

function kiPfad(ctx, { text = '', ids = ['ki-check', 'pilot', 'betrieb'] } = {}) {
  const was = {
    'ki-check': 'Ich schaue Ihre Abläufe an. Sie erhalten einen Bericht mit Empfehlung.',
    pilot: 'Ein Ablauf im Alltag, rund vier Wochen. Wir messen, ob er hilft.',
    einfuehrung: 'Ausbau, Schulung und Dokumentation.',
    betrieb: 'Wartung, Anpassungen und eine Ansprechperson. Monatlich kündbar.',
  };
  const nutzung = ctx.preis('nutzung');
  const items = ids.map((id, i) => {
    const p = ctx.preis(id);
    const t = ctx.fmt.preisTeile(p);
    return join([
      `<li class="pfad__step" data-reveal>`,
      `<span class="pfad__nr" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>`,
      `<h3 class="pfad__name">${esc(p.name)}</h3>`,
      `<p class="pfad__preis">${t.vor ? `<span>${t.vor}</span> ` : ''}<strong>${esc(t.betrag)}</strong>${t.einheit ? ` <span>${t.einheit}</span>` : ''}${p.art === 'fix' ? ' <span>fix</span>' : ''}</p>`,
      when(id === 'betrieb', () => `<p class="pfad__plus">plus KI-Nutzung, typisch ${esc(ctx.fmt.preisText(nutzung))}</p>`),
      `<p class="pfad__was">${was[id] || ''}</p>`,
      '</li>',
    ]);
  }).join('\n');
  return join([
    when(text, () => `<p class="t-lead pfad__lead" data-reveal>${ctx.t(text)}</p>`),
    `<ol class="pfad">${items}</ol>`,
    '<p class="pfad__exit">Nach jeder Stufe entscheiden Sie, ob es weitergeht. Reicht der Nutzen nicht, hören wir auf.</p>',
    ctx.c.preisHinweis(),
    `<p class="pfad__links">${ctx.c.more({ href: 'preise/', label: 'Alle Preise im Detail' })}${ctx.c.more({ href: 'support/', label: 'Was bei einem Ausfall passiert' })}</p>`,
  ]);
}

/* ------------------------------------------------------------------ Kleine Bilder fuer Kacheln und Karten (dekorativ) */

function kiMiniMock(ctx, key) {
  const icon = ctx.c.icon;
  switch (key) {
    case 'mail':
      return '<div class="mini mini--mail" aria-hidden="true"><i></i><i class="is-ki"></i><i></i></div>';
    case 'kalender':
      return `<div class="mini mini--cal" aria-hidden="true">${Array.from({ length: 5 }, (_, i) => `<span>${i === 1 ? '<i class="is-vor" style="--t:55%"></i>' : ''}${i === 3 ? '<i class="is-vor" style="--t:70%"></i>' : ''}<i style="--t:${[10, 15, 5, 30, 20][i]}%;--h:${[30, 25, 45, 22, 35][i]}%"></i></span>`).join('')}</div>`;
    case 'dokument':
      return `<div class="mini mini--dok" aria-hidden="true"><span class="mini__page"><i></i><i class="is-m"></i><i></i><i class="is-m"></i></span>${icon('pfeil')}<span class="mini__tbl"><i></i><i></i><i class="is-w"></i></span></div>`;
    case 'kunden':
      return `<div class="mini mini--list" aria-hidden="true">${['telefon', 'chat', 'mail'].map((ic, i) => `<span>${icon(ic)}<i style="--w:${[70, 85, 55][i]}%"></i><b class="${['', 'is-hoch', 'is-ok'][i]}"></b></span>`).join('')}</div>`;
    default:
      return '';
  }
}

/** Mini-Ablauf in drei Bildern fuer Branchen-Karten: [Eingang, KI, Ergebnis] mit Symbolen */
function kiFluss(ctx, [a, b, c]) {
  const icon = ctx.c.icon;
  return `<div class="fluss" aria-hidden="true"><span>${icon(a)}</span><i></i><span class="is-ki">${icon(b)}</span><i></i><span class="is-sie">${icon(c)}</span></div>`;
}

module.exports = { kiBuehne, kiMockPostfach, kiMockKalender, kiMockDokument, kiMockListe, kiDatenweg, kiKanaele, kiPfad, kiMiniMock, kiFluss, KI_KNOTEN: KNOTEN };
