'use strict';
// Datenschutzerklaerung der Website (V4-TEXTE 21). Gruppe: Vertrauens-Seiten.
// Hoster, Formular-Anbieter, Mail-Dienst und Termin-Dienst kommen aus site.json und koennen nicht auseinanderlaufen.

exports.meta = {
  path: 'datenschutz/',
  nav: '',
  css: ['vertrauen'],
  title: 'Datenschutzerklärung | {{marke}}',
  description: 'Datenschutzerklärung der Website von {{marke}}: welche Daten bearbeitet werden, wozu, an wen sie gehen und welche Rechte Sie haben.',
};

exports.render = (ctx) => {
  const c = ctx.c;
  const t = ctx.t;
  const k = ctx.site.kontakt;
  const e = ctx.esc;
  return [
    c.hero({ eyebrow: 'Rechtliches', title: 'Datenschutzerklärung', lead: t('Stand: {{stand_datenschutz}}') }),
    c.section({
      id: 'erklaerung', width: 'text',
      label: 'Erklärung',
      body: c.prose(`
        <p>Diese Erklärung gilt für diese Website. Wie ich Daten in Kundenprojekten mit KI schütze, steht auf der Seite <a href="${ctx.url('sicherheit/')}">Datenschutz und Sicherheit bei KI</a>.</p>
        <h2>Dienste auf einen Blick</h2>
        <ul class="dienste">
          <li><b>Hosting:</b> ${t('{{hosting_text}}')}</li>
          <li><b>Kontaktformular:</b> ${t('{{formular_anbieter}} ({{formular_ort}}), nur wenn Sie das Formular senden')}</li>
          <li><b>E-Mail:</b> ${t('{{mail_dienst}}')}</li>
          ${k.terminLink && k.terminAnbieter ? `<li><b>Terminbuchung:</b> ${t('{{termin_anbieter}}')}, nur wenn Sie online einen Termin buchen</li>` : ''}
          <li><b>Schriften und Programmteile:</b> auf demselben Server wie die Website, keine Schriftdienste von Dritten</li>
          <li><b>Cookies, Statistik, Tracking:</b> keine</li>
        </ul>
        <h2>Verantwortlich</h2>
        <p>${e(ctx.site.person.name)}, ${e(ctx.site.marke.region)}, Schweiz. E-Mail: <a href="mailto:${e(k.mail)}">${e(k.mail)}</a>.</p>
        <h2>Besuch der Website</h2>
        <p>${t('Die Website liegt bei {{hosting_text}}.')} Beim Aufruf speichert der Hoster technisch nötige Zugriffsdaten, zum Beispiel Ihre IP-Adresse sowie Datum und Uhrzeit. Ich selbst setze keine Cookies und keine Tracking- oder Analysedienste ein. Schriften und Programmteile liegen auf demselben Server, es werden keine weiteren Dienste geladen.</p>
        <h2>Demo-Assistent</h2>
        <p>Der Demo-Assistent läuft nur in Ihrem Browser. Er ist mit keiner KI verbunden, Ihre Auswahl wird weder übertragen noch gespeichert.</p>
        <h2>Kontaktformular und E-Mail</h2>
        <p>${t('Wenn Sie das Formular nutzen, werden Ihr Name, Ihre Firma, Ihre E-Mail-Adresse, Ihre Telefonnummer, Ihr Rückrufwunsch, die Programme, die Sie nutzen, und Ihre Nachricht über den Dienst {{formular_anbieter}} an meine E-Mail-Adresse weitergeleitet. {{formular_detail}} Meine E-Mails verwalte ich mit {{mail_dienst}}.')}</p>
        ${k.terminLink ? `<h2>Terminbuchung</h2><p>${t('Buchen Sie einen Termin online, bearbeitet {{termin_anbieter}} Ihren Namen, Ihre E-Mail-Adresse und den gewählten Termin. Es gelten zusätzlich dessen Datenschutzbestimmungen.')}</p>` : ''}
        <h2>Zweck</h2>
        <p>Ich verwende Ihre Angaben nur, um Ihre Anfrage zu beantworten und allenfalls eine Offerte zu erstellen. Ich gebe sie nicht an andere weiter und verwende sie nicht für das Training von KI.</p>
        <h2>Bearbeitung im Ausland</h2>
        <p>${t('{{ausland_text}}')} Für die USA gilt das Swiss-U.S. Data Privacy Framework, soweit die Anbieter danach zertifiziert sind. Die Weiterleitung über das Formular ist nötig, damit ich Ihre Anfrage beantworten kann. Möchten Sie das vermeiden, schreiben Sie mir direkt per Mail.</p>
        <h2>Aufbewahrung</h2>
        <p>Ihre Anfrage bewahre ich so lange auf, wie es für die Antwort und eine allfällige Zusammenarbeit nötig ist. Danach lösche ich sie.</p>
        <h2>Ihre Rechte</h2>
        <p>Sie können jederzeit Auskunft über Ihre Daten verlangen und deren Berichtigung oder Löschung verlangen. Schreiben Sie mir dafür an <a href="mailto:${e(k.mail)}">${e(k.mail)}</a>. Sie können sich auch beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) beschweren.</p>
        <p><a href="${ctx.url('impressum/')}">Zum Impressum</a> · <a href="${ctx.url('kontakt/')}">Zum Kontakt</a></p>
      `),
    }),
  ].join('\n');
};
