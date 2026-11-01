'use strict';
// Referenzen (V4-KONZEPT 2.7, V4-TEXTE 17): Balkenschema der Fallstudie (nur Summen aus site.json, gezaehlt mit
// _src/count-leads.js) und ein Eintrag der Firmenliste als Beispiel mit erfundenen Daten. Keine Namen echter Betriebe.
// Stile: css/websites.css. Gruppe: Websites und Referenzen.

const { esc, cls, join } = require('../lib/html');

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/** Datum aus site.json (2026-10-31) als Text: 31. Oktober 2026 */
function refDatum(ctx, iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${Number(m[3])}. ${MONATE[Number(m[2]) - 1]} ${m[1]}` : '';
}

/**
 * Waagrechte Balken: vom analysierten Betrieb bis zur freigegebenen Mail. Werte aus site.json referenzen.zahlen.
 * Als Tabelle fuer Screenreader lesbar (Beschriftung, Zahl), Balken sind Darstellung.
 */
function refBalken(ctx) {
  const z = ctx.site.referenzen.zahlen;
  const max = Math.max(z.betriebeAnalysiert, 1);
  const rows = [
    { label: 'Betriebe analysiert', sub: 'Website und Angaben geprüft', n: z.betriebeAnalysiert },
    { label: 'Bewusst nicht angeschrieben', sub: 'Werbesperre oder Werbewiderspruch', n: z.nichtAngeschrieben, tone: 'regel' },
    { label: 'Website-Demos gebaut', sub: 'je mit zwei Designs', n: z.demosGebaut },
    { label: 'Mails versendet', sub: 'jede von mir geprüft und freigegeben', n: z.mailsGesendet, tone: 'mensch' },
  ];
  const tr = rows.map((r) => join([
    `<tr class="${cls('rbar', r.tone && `rbar--${r.tone}`)}">`,
    `<th scope="row"><span class="rbar__label">${r.label}</span><span class="rbar__sub">${r.sub}</span></th>`,
    `<td><span class="rbar__track"><span class="rbar__fill" style="--w:${(r.n / max * 100).toFixed(1)}%"></span></span><span class="rbar__n">${esc(r.n)}</span></td>`,
    '</tr>',
  ], '')).join('');
  return join([
    '<figure class="rbars" data-reveal>',
    `<table class="rbars__tbl"><caption class="sr">Fallstudie in Zahlen, gezählt am ${esc(refDatum(ctx, ctx.site.referenzen.stand))}</caption><thead class="sr"><tr><th scope="col">Schritt</th><th scope="col">Anzahl</th></tr></thead><tbody>${tr}</tbody></table>`,
    `<figcaption class="rbars__cap">Gezählt am ${esc(refDatum(ctx, ctx.site.referenzen.stand))} aus der eigenen Firmenliste, ohne Namen. Zeitraum ${esc(ctx.site.referenzen.zeitraum)}.</figcaption>`,
    '</figure>',
  ]);
}

/** Ein Eintrag der Firmenliste als Beispiel (erfundener Betrieb), zeigt die Schritte des Workflows */
function refEintrag(ctx) {
  const row = (k, v, state = 'ok') => `<div class="reintrag__row"><dt>${k}</dt><dd><i class="reintrag__st reintrag__st--${state}" aria-hidden="true"></i>${v}</dd></div>`;
  return join([
    '<figure class="reintrag" data-reveal>',
    ctx.c.badge('beispiel'),
    '<div class="reintrag__win">',
    '<p class="reintrag__bar" aria-hidden="true"><span class="reintrag__dots"><i></i><i></i><i></i></span>Firmenliste, ein Eintrag</p>',
    '<div class="reintrag__body">',
    '<p class="reintrag__name">Garage Muster <span>erfundener Betrieb</span></p>',
    '<dl class="reintrag__dl">',
    row('Website', 'Handy, HTTPS, Aktualität und Inhalte geprüft'),
    row('Befunde', '<ul><li>Auf dem Handy schwer lesbar <em>Beleg: Bildschirmfoto</em></li><li>Öffnungszeiten veraltet <em>Beleg: Textstelle</em></li></ul>'),
    row('Werbung', 'Telefonbuch und Impressum geprüft, kein Sperrvermerk'),
    row('Demo', 'Entwurf A und B, auf Handy und Computer geprüft'),
    row('Mail', 'Entwurf bereit, wartet auf meine Freigabe', 'wait'),
    '</dl>',
    '</div>',
    '</div>',
    '<figcaption class="reintrag__cap">So sieht ein Eintrag aus, bevor ich die Mail prüfe und selbst sende.</figcaption>',
    '</figure>',
  ]);
}

module.exports = { refDatum, refBalken, refEintrag };
