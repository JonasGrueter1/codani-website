'use strict';
// Impressum (V4-TEXTE 20). Gruppe: Vertrauens-Seiten. Alte Adresse impressum.html leitet hierher (Build).

exports.meta = {
  path: 'impressum/',
  nav: '',
  css: ['vertrauen'],
  title: 'Impressum | {{marke}}',
  description: 'Impressum von {{marke}}: KI-Lösungen und Websites für KMU, {{region}}. Verantwortliche Person, Kontakt, Inhalte und Haftung.',
};

exports.render = (ctx) => {
  const c = ctx.c;
  const s = ctx.site;
  const e = ctx.esc;
  const k = s.kontakt;
  const verantwortlich = [
    e(s.person.name),
    s.marke.name !== s.person.name ? `${e(s.marke.name)}, ${e(s.marke.zusatz)}` : '',
    k.adresse ? e(k.adresse) : `${e(s.marke.region)}, Schweiz`,
  ].filter(Boolean).join('<br>');
  return [
    c.hero({ eyebrow: 'Rechtliches', title: 'Impressum' }),
    c.section({
      id: 'angaben', width: 'text',
      label: 'Angaben',
      body: c.prose(`
        <h2>Verantwortlich für diese Website</h2>
        <p>${verantwortlich}</p>
        <p>${ctx.t('Ich bin {{alter}} und damit minderjährig. Offerten und Verträge unterschreiben meine Eltern als gesetzliche Vertretung mit.')}</p>
        <h2>Kontakt</h2>
        <p>E-Mail: <a href="mailto:${e(k.mail)}">${e(k.mail)}</a>${k.telefon ? `<br>Telefon: <a href="tel:${e(k.telefon.replace(/\s+/g, ''))}">${e(k.telefon)}</a>` : ''}</p>
        ${s.firma && s.firma.form ? `<h2>Firma</h2>\n        <p>${e(s.firma.form)}${k.uid ? `<br>UID: ${e(k.uid)}` : ''}</p>` : ''}
        <h2>Mehrwertsteuer</h2>
        <p>Nicht mehrwertsteuerpflichtig.</p>
        <h2>Inhalte</h2>
        <p>Texte, Gestaltung und Programmcode dieser Website stammen von ${e(s.person.name)}. Das 3D-Modell der Büste beruht auf dem freien Grundmodell von MakeHuman (CC0). Die Website verwendet die Bibliotheken three.js und GSAP sowie die frei lizenzierten Schriften Geist und Geist Mono.</p>
        <h2>Technik</h2>
        <p>${ctx.t('Die Website liegt bei {{hosting_text}}. Das Kontaktformular leitet Anfragen über {{formular_anbieter}} weiter.')} Schriften und Bibliotheken liegen auf demselben Server wie die Website, es werden keine fremden Dienste geladen.</p>
        <h2>Beispiele</h2>
        <p>Alle Beispiele auf dieser Website verwenden erfundene Namen und Daten. Ähnlichkeiten mit echten Personen oder Betrieben sind zufällig.</p>
        <h2>Haftung</h2>
        <p>Ich prüfe die Inhalte sorgfältig, übernehme aber keine Gewähr für Vollständigkeit und Aktualität. Für verlinkte Websites sind deren Betreiber verantwortlich.</p>
        <p>Informationen zum Umgang mit Ihren Daten finden Sie in der <a href="${ctx.url('datenschutz/')}">Datenschutzerklärung</a>.</p>
        <p><a href="${ctx.url('kontakt/')}">Zum Kontakt</a></p>
      `),
    }),
  ].join('\n');
};
