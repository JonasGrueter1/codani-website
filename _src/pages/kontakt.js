'use strict';
// Kontakt (V4-KONZEPT 2.11, V4-TEXTE 19). Gruppe: Vertrauens-Seiten. Formular: components/form.js, Logik js/site.js.
// Telefon, Termin-Link und Adresse erscheinen nur, wenn sie in site.json gesetzt sind.

exports.meta = {
  path: 'kontakt/',
  nav: 'kontakt',
  css: ['vertrauen'],
  title: 'Kontakt | {{marke}}',
  description: 'KI-Check oder Website-Entwurf anfragen, Rückruf wünschen oder direkt mailen. Ich antworte {{reaktionszeit}}, meistens am Abend. Ohne Verpflichtung.',
};

exports.render = (ctx) => {
  const c = ctx.c;
  const t = ctx.t;
  const k = ctx.site.kontakt;
  const e = ctx.esc;
  const wege = [
    `<li>${c.icon('mail')}<div><p class="wege__titel">Formular</p><p>Schreiben Sie mir über das Formular.</p></div></li>`,
    `<li>${c.icon('telefon')}<div><p class="wege__titel">Rückruf</p><p>Lieber telefonieren? Hinterlassen Sie im Formular Ihre Nummer und wann es passt. Ich rufe zurück.</p></div></li>`,
    k.terminLink ? `<li>${c.icon('kalender')}<div><p class="wege__titel">Termin</p><p>Wählen Sie einen freien Termin für ein erstes Gespräch.</p><p><a class="btn btn--secondary btn--sm" href="${e(k.terminLink)}" target="_blank" rel="noopener">Termin direkt buchen<span class="sr"> (öffnet eine externe Seite)</span></a></p></div></li>` : '',
    `<li>${c.icon('chat')}<div><p class="wege__titel">Mail</p><p>Lieber per Mail? <a class="text-link" href="mailto:${e(k.mail)}">${e(k.mail)}</a></p><p class="wege__klein">${t('Mail und Formular laufen heute über {{mail_dienst}} und {{formular_anbieter}} in den USA. Sie sind für erste Anfragen gedacht. Daten in einer KI-Lösung laufen nie darüber, sondern in Ihrem eigenen Konto.')}${k.umstellung ? ' ' + e(k.umstellung) : ''}</p></div></li>`,
    k.telefon ? `<li>${c.icon('telefon')}<div><p class="wege__titel">Telefon</p><p><a class="text-link" href="tel:${e(k.telefon.replace(/\s+/g, ''))}">${e(k.telefon)}</a>${k.telefonZeiten ? `<br>${e(k.telefonZeiten)}` : ''}</p></div></li>` : '',
    k.adresse ? `<li>${c.icon('ort')}<div><p class="wege__titel">Adresse</p><p>${e(k.adresse)}</p></div></li>` : '',
  ].filter(Boolean).join('\n');
  return [
    c.hero({
      eyebrow: 'Kontakt',
      title: 'Kontakt: Erzählen Sie mir, worum es geht.',
      lead: t('Ein paar Sätze genügen. Ich antworte {{reaktionszeit}}, meistens am Abend.'),
    }),
    c.section({
      id: 'anfrage',
      label: 'Anfrage',
      body: `<div class="kontakt-grid">
        <div class="kontakt-wege">
          <h2 class="t-h3">So erreichen Sie mich.</h2>
          <ul class="wege">${wege}</ul>
          ${k.erstgespraech || k.naechsterKiCheck ? `<div class="kontakt-erst">${k.erstgespraech ? `<p>${c.icon('uhr')}<span>${e(k.erstgespraech)}</span></p>` : ''}${k.naechsterKiCheck ? `<p>${c.icon('kalender')}<span>Nächster freier KI-Check: ${e(k.naechsterKiCheck)}</span></p>` : ''}</div>` : ''}
          <h2 class="t-h3 kontakt-danach">Was danach passiert.</h2>
          ${c.steps([
            { title: 'Antwort', text: t('Ich lese Ihre Anfrage und melde mich {{reaktionszeit}}.') },
            { title: 'Gespräch', text: 'In einem kurzen, kostenlosen Gespräch klären wir, was Sie brauchen. Haben Sie die Programme angegeben, weiss ich bis dahin, ob es Schnittstellen gibt.' },
            { title: 'Vorschlag', text: 'Sie erhalten einen Vorschlag: KI-Check zum Fixpreis oder einen kostenlosen Website-Entwurf. Ohne Verpflichtung.', decide: true },
          ], { vertical: true })}
        </div>
        <div class="kontakt-form">${c.form()}</div>
      </div>`,
    }),
    c.section({
      id: 'hinweise', tone: 'soft',
      label: 'Weitere Informationen',
      body: c.cards([
        { icon: 'schild', title: 'Datenschutz und Sicherheit', text: 'Wo Ihre Daten bei einer KI-Lösung liegen.', href: 'sicherheit/' },
        { icon: 'liste', title: 'Preise', text: 'Richtwerte für KI und Websites.', href: 'preise/' },
        { icon: 'buch', title: 'Unterlagen', text: 'Vertraulichkeitserklärung und Vertrag zur Auftragsbearbeitung als Muster.', href: 'unterlagen/' },
        { icon: 'dokument', title: 'Datenschutzerklärung', text: 'Was mit Ihren Angaben aus dem Formular passiert.', href: 'datenschutz/' },
      ], { cols: 4, cls: 'cards--white' }),
    }),
  ].join('\n');
};
