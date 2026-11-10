'use strict';
// Grafiken der Vertrauens-Seiten (V4-KONZEPT 2.6 bis 2.10): Kostenschema und Jahresrechnung (preise/), Datenweg und
// Platzhalter-Beispiel (sicherheit/), Abschalter und Betriebshandbuch (support/), Zeitleiste und Tagesbalken
// (ueber-mich/). In HTML und CSS gebaut, Werte nur aus site.json. Stile: css/vertrauen.css. Gruppe: Vertrauens-Seiten.

const { esc, cls, join, when } = require('../lib/html');

/* ------------------------------------------------------------------ Preise: Kosten pro Monat */

/**
 * Wie sich die Kosten pro Monat zusammensetzen: Betrieb (fest, ab) plus KI-Nutzung (Spanne nach Verbrauch).
 * Ein Balken auf einer gemeinsamen Achse, direkt beschriftet. Die Tabelle "Beispielrechnung" ist die Tabellenansicht.
 */
function trustKostenMonat(ctx) {
  const { chf } = ctx.fmt;
  const b = ctx.preis('betrieb');
  const n = ctx.preis('nutzung');
  const max = b.betrag + n.bis;
  const pct = (v) => `${(v / max * 100).toFixed(2)}%`;
  const label = `Kosten pro Monat, Richtwerte: Betrieb ab ${chf(b.betrag)}, dazu KI-Nutzung nach Verbrauch, typisch ${chf(n.von)} bis ${chf(n.bis)}. Zusammen typisch ${chf(b.betrag + n.von)} bis ${chf(max)} pro Monat.`;
  return join([
    '<figure class="kosten" data-reveal>',
    `<div class="kosten__chart" role="img" aria-label="${esc(label)}">`,
    '<div class="kosten__bar" aria-hidden="true">',
    `<span class="kosten__seg kosten__seg--betrieb" style="width:${pct(b.betrag)}"></span>`,
    `<span class="kosten__seg kosten__seg--min" style="width:${pct(n.von)}"></span>`,
    `<span class="kosten__seg kosten__seg--var" style="width:${pct(n.bis - n.von)}"></span>`,
    '</div>',
    '<div class="kosten__ticks" aria-hidden="true">',
    `<span style="left:0">${esc(chf(0))}</span>`,
    `<span style="left:${pct(b.betrag + n.von)}">${esc(chf(b.betrag + n.von))}</span>`,
    `<span style="left:100%">${esc(chf(max))}</span>`,
    '</div>',
    '</div>',
    '<ul class="kosten__legend">',
    `<li><span class="kosten__key kosten__key--betrieb" aria-hidden="true"></span><span><b>Betrieb</b> ab ${esc(chf(b.betrag))} pro Monat. Wartung, Anpassungen, Ansprechperson.</span></li>`,
    `<li><span class="kosten__key kosten__key--var" aria-hidden="true"></span><span><b>KI-Nutzung</b> ${esc(ctx.fmt.preisText(n))}, nach Verbrauch. Das sind die Gebühren des KI-Anbieters.</span></li>`,
    '</ul>',
    `<figcaption class="note">Zusammen typisch ${esc(chf(b.betrag + n.von))} bis ${esc(chf(max))} pro Monat. ${esc(ctx.site.preise.hinweis)}</figcaption>`,
    '</figure>',
  ]);
}

/** Beispielrechnung erstes Jahr: KI-Check + Pilot + 12 Monate Betrieb + 12 Monate KI-Nutzung (aus site.json gerechnet) */
function trustJahresrechnung(ctx) {
  const { chf, num } = ctx.fmt;
  const check = ctx.preis('ki-check');
  const pilot = ctx.preis('pilot');
  const b = ctx.preis('betrieb');
  const n = ctx.preis('nutzung');
  const e = ctx.preis('einfuehrung');
  const von = check.betrag + pilot.betrag + 12 * b.betrag + 12 * n.von;
  const bis = check.betrag + pilot.betrag + 12 * b.betrag + 12 * n.bis;
  const rows = [
    ['KI-Check', 'Fixpreis', chf(check.betrag)],
    ['Pilot', 'Einstiegspreis', chf(pilot.betrag)],
    ['Betrieb, 12 Monate', `12 x ${chf(b.betrag)}`, chf(12 * b.betrag)],
    ['KI-Nutzung, 12 Monate', `12 x ${chf(n.von)} bis ${num(n.bis)}`, `${chf(12 * n.von)} bis ${num(12 * n.bis)}`],
  ];
  return join([
    '<div class="tbl-wrap jahr" data-reveal>',
    '<table class="tbl tbl--jahr">',
    '<caption class="sr">Beispielrechnung für das erste Jahr mit Richtwerten</caption>',
    '<thead><tr><th scope="col">Posten</th><th scope="col" class="jahr__r">Rechnung</th><th scope="col" class="num">Richtwert</th></tr></thead>',
    `<tbody>${rows.map(([a, r, v]) => `<tr><th scope="row">${esc(a)}<span class="jahr__calc">${esc(r)}</span></th><td class="jahr__r">${esc(r)}</td><td class="num">${esc(v)}</td></tr>`).join('')}</tbody>`,
    `<tfoot><tr><th scope="row">Erstes Jahr</th><td class="jahr__r"></td><td class="num">${esc(chf(von))} bis ${esc(num(bis))}</td></tr></tfoot>`,
    '</table>',
    '</div>',
    `<p class="note">Ohne Einführung. Braucht es nach dem Pilot einen Ausbau, kommt die Einführung dazu (${esc(ctx.fmt.preisText(e))}). Der Pilot ist mit dem Einstiegspreis gerechnet.</p>`,
  ]);
}

/* ------------------------------------------------------------------ Sicherheit: Datenweg */

function trustDatenweg(ctx) {
  const icon = ctx.c.icon;
  const label = 'Schema: Der Text geht verschlüsselt von Ihrem Programm zum KI-Anbieter, der Entwurf kommt zurück in Ihr Programm. Gespeichert wird bei Ihnen, beim KI-Anbieter wird der Text nur verarbeitet.';
  return join([
    `<figure class="dweg" role="img" aria-label="${esc(label)}" data-reveal>`,
    '<div class="dweg__box dweg__box--sie">',
    `<span class="dweg__icon">${icon('haus')}</span>`,
    '<p class="dweg__zone">Bei Ihnen</p>',
    '<p class="dweg__title">Ihr Programm, z. B. Outlook</p>',
    '<p class="dweg__text">Hier bleiben Ihre Daten gespeichert.</p>',
    '<p class="dweg__chip"><span class="chip chip--sie">Sie prüfen den Entwurf</span></p>',
    '</div>',
    '<div class="dweg__mid">',
    '<p class="dweg__arrow dweg__arrow--hin"><span>nur der nötige Text</span></p>',
    `<p class="dweg__lock">${icon('schloss')}<span>verschlüsselte Verbindung</span></p>`,
    '<p class="dweg__arrow dweg__arrow--zurueck"><span>Entwurf zurück</span></p>',
    '</div>',
    '<div class="dweg__box dweg__box--ki">',
    `<span class="dweg__icon">${icon('funke')}</span>`,
    '<p class="dweg__zone">Beim KI-Anbieter</p>',
    '<p class="dweg__title">verarbeitet den Text</p>',
    '<p class="dweg__text">Kein Training mit Ihren Daten. Protokolle je nach Anbieter meist bis 30 Tage.</p>',
    '</div>',
    '</figure>',
  ]);
}

/** So wenig Daten wie noetig: Namen und Nummern werden vor dem Versand ersetzt (Beispiel mit erfundenen Daten) */
function trustPlatzhalter(ctx) {
  return join([
    '<div class="pseudo" data-reveal>',
    ctx.c.badge('beispiel'),
    '<div class="pseudo__grid">',
    '<div class="pseudo__col"><p class="pseudo__label">In Ihrem Postfach</p><p class="pseudo__text">Guten Tag, hier ist <mark>Sara Muster</mark>, Kundennummer <mark>K-4021</mark>. Meine Rechnung vom Oktober stimmt nicht.</p></div>',
    `<div class="pseudo__arrow" aria-hidden="true">${ctx.c.icon('pfeil')}</div>`,
    '<div class="pseudo__col pseudo__col--ki"><p class="pseudo__label">Was zur KI geht</p><p class="pseudo__text">Guten Tag, hier ist <mark>[Name 1]</mark>, Kundennummer <mark>[Nummer 1]</mark>. Meine Rechnung vom Oktober stimmt nicht.</p></div>',
    '</div>',
    '<p class="note">Der Entwurf kommt mit den Platzhaltern zurück. Die Lösung setzt Name und Nummer danach wieder ein.</p>',
    '</div>',
  ]);
}

/* ------------------------------------------------------------------ Support: Abschalter */

function trustAbschalter(ctx) {
  const icon = ctx.c.icon;
  const lane = (kind, title, steps) => join([
    `<div class="${cls('schalter__lane', `schalter__lane--${kind}`)}">`,
    `<p class="schalter__state"><span class="${cls('schalter__toggle', kind === 'an' && 'is-on')}" aria-hidden="true"><i></i></span>${title}</p>`,
    `<ol class="schalter__flow">${steps.map(([ic, t, who]) => `<li class="${cls(who && `is-${who}`)}">${icon(ic)}<span>${t}</span></li>`).join('')}</ol>`,
    '</div>',
  ]);
  return join([
    `<figure class="schalter" role="img" aria-label="${esc('Schema Abschalter: Mit eingeschalteter KI geht eine Anfrage über einen Entwurf der KI zu Ihrer Prüfung und dann hinaus. Mit ausgeschalteter KI bearbeitet Ihr Team die Anfrage von Hand wie früher. In beiden Fällen bleibt alles in Ihren Programmen.')}" data-reveal>`,
    lane('an', 'KI an', [['mail', 'Anfrage kommt an'], ['funke', 'KI schreibt einen Entwurf', 'ki'], ['person', 'Sie prüfen und geben frei', 'sie'], ['haken', 'erledigt']]),
    lane('aus', 'KI aus', [['mail', 'Anfrage kommt an'], ['person', 'Ihr Team bearbeitet sie von Hand, wie früher', 'team'], ['haken', 'erledigt']]),
    '<figcaption class="note">Der Schalter ist dokumentiert. Sie brauchen dafür weder mich noch Programmierkenntnisse.</figcaption>',
    '</figure>',
  ]);
}

/** Betriebshandbuch: Inhaltsverzeichnis als Dokument (Beispiel) */
function trustHandbuch(ctx) {
  const items = [
    ['Was läuft wo', 'Programme, Schnittstellen und der Ablauf in einem Bild'],
    ['Konten und Zugänge', 'wer welche Rechte hat und wie Sie sie entziehen'],
    ['Kosten', 'welche Rechnungen kommen und von wem'],
    ['Abschalten und wieder starten', 'Schritt für Schritt, ohne Fachwissen'],
    ['Wenn etwas nicht stimmt', 'woran Sie es merken und was zu tun ist'],
    ['Übergabe an Ihren IT-Partner', 'Code, Zugänge und Notizen an einem Ort'],
  ];
  return join([
    '<div class="handbuch" data-reveal>',
    ctx.c.badge('Beispiel eines Inhaltsverzeichnisses'),
    '<div class="handbuch__doc" aria-label="Inhalt des Betriebshandbuchs" role="group">',
    `<p class="handbuch__head">${ctx.c.icon('buch')}<span>Betriebshandbuch</span></p>`,
    `<ol class="handbuch__toc">${items.map(([t, s], i) => `<li><span class="handbuch__nr">${String(i + 1).padStart(2, '0')}</span><span><b>${t}</b>${s}</span></li>`).join('')}</ol>`,
    '</div>',
    '</div>',
  ]);
}

/* ------------------------------------------------------------------ Ueber mich: Zeitleiste und Tag */

/** Zeitleiste: [{ when, title, text, now }] */
function trustZeitleiste(ctx, items) {
  return `<ol class="zeit">${items.map((x) => join([
    `<li class="${cls('zeit__item', x.now && 'is-now', x.ziel && 'is-ziel')}" data-reveal>`,
    `<p class="zeit__when">${x.when}</p>`,
    `<h3 class="t-h3 zeit__title">${x.title}</h3>`,
    when(x.text, () => `<p class="zeit__text">${x.text}</p>`),
    '</li>',
  ])).join('\n')}</ol>`;
}

/** Erreichbarkeit an einem Werktag, ohne genaue Uhrzeiten */
function trustTag(ctx) {
  return join([
    `<div class="tag" role="img" aria-label="${esc(ctx.t('Ein Werktag: tagsüber Ausbildung, am Abend Mails und Gespräche. Antwort {{reaktionszeit}}.'))}" data-reveal>`,
    '<div class="tag__bar" aria-hidden="true"><span class="tag__seg tag__seg--lehre">Tagsüber: Ausbildung</span><span class="tag__seg tag__seg--abend">Abends: Mails und Gespräche</span></div>',
    `<p class="tag__legend" aria-hidden="true"><span>Ein Werktag</span><span>${esc(ctx.t('Antwort {{reaktionszeit}}'))}</span></p>`,
    '</div>',
  ]);
}

module.exports = { trustKostenMonat, trustJahresrechnung, trustDatenweg, trustPlatzhalter, trustAbschalter, trustHandbuch, trustZeitleiste, trustTag };
