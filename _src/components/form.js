'use strict';
// Kontaktformular (Konzept 3.6.11, Texte 19.2). Ziel und Schluessel kommen aus site.json (formular.aktiv), die
// Logik liegt in js/site.js. Ohne JS sendet das Formular direkt an den Anbieter (action, method POST).

const { esc, join, when } = require('../lib/html');

function form(ctx, { id = 'kontakt-form', title = 'Ihre Anfrage' } = {}) {
  const { site, data } = ctx;
  const f = site.formular;
  const p = f.anbieter[f.aktiv];
  if (!p || !p.endpoint) throw new Error(`Formular-Anbieter "${f.aktiv}" hat keinen endpoint in site.json`);
  const T = data.form.texte;
  const themen = JSON.stringify({ standard: data.form.standard, themen: data.form.themen });
  const [user, domain] = site.kontakt.mail.split('@');
  const field = ({ name, label, type = 'text', req, auto, mode, hint, err, ph, cls }) => join([
    `<div class="field${cls ? ' ' + cls : ''}">`,
    `<label for="f-${name}">${esc(label)}${req ? ' <span class="field__req" aria-hidden="true">*</span>' : ''}</label>`,
    `<input id="f-${name}" name="${name}" type="${type}"${auto ? ` autocomplete="${auto}"` : ''}${mode ? ` inputmode="${mode}"` : ''}${ph ? ` placeholder="${esc(ph)}"` : ''}${req ? ' required' : ''}${hint ? ` aria-describedby="h-${name}"` : ''}>`,
    when(hint, () => `<p class="field__hint" id="h-${name}">${esc(hint)}</p>`),
    when(err, () => `<p class="field__error" id="e-${name}" data-msg="${esc(err)}" hidden></p>`),
    '</div>',
  ]);
  return join([
    `<form class="form" id="${esc(id)}" action="${esc(p.endpoint)}" method="POST" novalidate`,
    ` data-timeout="${esc(f.zeitlimitSekunden)}" data-mail-user="${esc(user)}" data-mail-domain="${esc(domain)}"`,
    ` data-subject="${esc(f.betreff)}" data-ok="${esc(ctx.t(T.erfolg))}" data-error="${esc(ctx.t(T.fehler))}" data-error-link="${esc(T.fehlerLink)}"`,
    ` data-sending="${esc(T.sendet)}" data-summary="${esc(T.fehlerListe)}" data-tel-msg="${esc(T.fehlerTelefon)}">`,
    `<h2 class="t-h3 form__title">${esc(title)}</h2>`,
    `<p class="form__req">${esc(T.pflicht)}</p>`,
    '<div class="form__summary" role="alert" hidden></div>',
    `<input type="hidden" name="${esc(p.schluesselFeld)}" value="${esc(p.schluessel)}">`,
    `<input type="hidden" name="subject" value="${esc(f.betreff)}">`,
    `<input type="hidden" name="from_name" value="${esc(f.absenderName)}">`,
    '<div class="form__row">',
    field({ name: 'name', label: 'Ihr Name', req: true, auto: 'name', err: T.fehlerName }),
    field({ name: 'firma', label: 'Firma (freiwillig)', auto: 'organization' }),
    '</div>',
    '<div class="form__row">',
    field({ name: 'email', label: 'E-Mail', type: 'email', req: true, auto: 'email', mode: 'email', err: T.fehlerMail }),
    field({ name: 'telefon', label: 'Telefon (freiwillig)', type: 'tel', auto: 'tel', mode: 'tel', err: T.fehlerTelefon }),
    '</div>',
    '<div class="field field--check">',
    '<input id="f-rueckruf" name="rueckruf" type="checkbox" value="Ja, bitte zurückrufen" aria-controls="f-wann-feld">',
    '<label for="f-rueckruf">Bitte rufen Sie mich zurück</label>',
    '</div>',
    '<div class="field" id="f-wann-feld">',
    '<label for="f-wann">Wann erreiche ich Sie am besten? (freiwillig)</label>',
    '<input id="f-wann" name="erreichbar" type="text" placeholder="z. B. Dienstag ab 17 Uhr">',
    '</div>',
    '<fieldset class="field field--choice">',
    '<legend>Worum geht es?</legend>',
    '<div class="choice">',
    // "Pilotbetrieb ..." nur, solange site.json pilotangebot.plaetze > 0
    data.form.wahl.filter((w) => !/^Pilotbetrieb/.test(w) || ((site.pilotangebot || {}).plaetze > 0))
      .map((w, i) => `<label class="choice__item"><input type="radio" name="thema" value="${esc(w)}" id="f-thema-${i}"><span>${esc(w)}</span></label>`).join(''),
    '</div>',
    '</fieldset>',
    field({ name: 'programme', label: 'Welche Programme nutzen Sie? (freiwillig)', hint: 'Zum Beispiel Outlook, bexio oder Ihre Branchensoftware. So kann ich vorab prüfen, ob es eine Schnittstelle gibt.' }),
    '<div class="field">',
    '<label for="f-nachricht">Ihre Nachricht <span class="field__req" aria-hidden="true">*</span></label>',
    `<textarea id="f-nachricht" name="message" rows="6" required placeholder="${esc(data.form.standard.platzhalter)}"></textarea>`,
    `<p class="field__error" id="e-nachricht" data-msg="${esc(T.fehlerNachricht)}" hidden></p>`,
    '</div>',
    '<input class="hp" type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true">',
    `<button class="btn btn--wide" type="submit">${esc(T.senden)}<span class="btn__arrow" aria-hidden="true"></span></button>`,
    '<p class="form__status" role="status" aria-live="polite"></p>',
    `<p class="form__privacy">${ctx.t('Ihre Angaben verwende ich nur für Ihre Anfrage. Das Formular wird über {{formular_anbieter}} an mich weitergeleitet ({{formular_ort}}).')} Bitte schicken Sie darüber keine Kunden- oder Mandantendaten. Mehr in der <a class="text-link" href="${ctx.url('datenschutz/')}">Datenschutzerklärung</a>.</p>`,
    `<script type="application/json" class="form__themen">${themen.replace(/</g, '\\u003c')}</script>`,
    '</form>',
  ]);
}

module.exports = { form };
