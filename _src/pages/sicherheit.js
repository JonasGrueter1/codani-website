'use strict';
// Datenschutz und Sicherheit bei KI (V4-KONZEPT 2.8, V4-TEXTE 14 und 23). Gruppe: Vertrauens-Seiten.
// Pflicht: Nur Aussagen, die eine Quelle belegt. Quellen und Abrufdatum sichtbar unten auf der Seite.

exports.meta = {
  path: 'sicherheit/',
  nav: 'ki',
  css: ['vertrauen'],
  title: 'Datenschutz und Sicherheit bei KI | {{marke}}',
  description: 'Wo Ihre Daten liegen, welche KI-Anbieter ich einsetze, warum nicht mit Ihren Daten trainiert wird und was das DSG verlangt. Einfach erklärt, mit Quellen.',
};

// [Anbieter oder Stelle, Titel, Adresse]
const QUELLEN = [
  ['Microsoft', 'Datenschutz bei Azure OpenAI', 'https://learn.microsoft.com/en-us/legal/cognitive-services/openai/data-privacy'],
  ['Microsoft Schweiz', 'Azure OpenAI im Schweizer Rechenzentrum', 'https://news.microsoft.com/de-ch/2023/09/18/microsoft-announces-availability-of-azure-openai-service-in-swiss-data-center-accelerating-ai-innovation-in-switzerland/'],
  ['OpenAI', 'Ihre Daten in der API', 'https://developers.openai.com/api/docs/guides/your-data'],
  ['OpenAI', 'Datenhaltung in Europa', 'https://openai.com/index/introducing-data-residency-in-europe/'],
  ['Anthropic', 'Geschäftsbedingungen', 'https://www.anthropic.com/legal/commercial-terms'],
  ['Anthropic', 'Aufbewahrung der Daten', 'https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data'],
  ['Amazon Web Services', 'Verarbeitung in EU-Regionen', 'https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html'],
  ['Google', 'Datenschutz bei generativer KI in Workspace', 'https://support.google.com/a/answer/15706919'],
  ['Infomaniak', 'KI-Dienste', 'https://www.infomaniak.com/en/hosting/ai-services'],
  ['Microsoft', 'Zugriff einer App auf einzelne Postfächer beschränken (RBAC für Anwendungen)', 'https://learn.microsoft.com/graph/auth-limit-mailbox-access'],
  ['Microsoft', 'Berechtigungen von Microsoft Graph', 'https://learn.microsoft.com/graph/permissions-reference'],
  ['EDÖB', 'Swiss-U.S. Data Privacy Framework', 'https://www.edoeb.admin.ch/en/15082024-new-swiss-us-data-privacy-framework'],
  ['Netzwoche', 'EDÖB: Das Datenschutzgesetz gilt auch für KI (9. November 2023)', 'https://www.netzwoche.ch/news/2023-11-10/das-neue-datenschutzgesetz-gilt-auch-fuer-ki-anwendungen'],
  ['Bundesrecht', 'Datenschutzgesetz (SR 235.1)', 'https://www.fedlex.admin.ch/eli/cc/2022/491/de'],
];

const ANBIETER = [
  ['Microsoft Azure OpenAI', 'Rechenzentrum «Switzerland North» wählbar, bei regionaler Bereitstellung', 'nein, laut Microsoft', 'zur Missbrauchskontrolle, Details in den Bedingungen von Microsoft'],
  ['OpenAI (API für Firmen)', 'USA, für neue Projekte ist Europa wählbar, sofern berechtigt', 'nein, seit 1. März 2023, ausser Sie stimmen ausdrücklich zu', 'Protokolle zur Missbrauchskontrolle bis 30 Tage'],
  ['Anthropic (Claude, API für Firmen)', 'USA, über Cloud-Partner wie Amazon Web Services auch in EU-Regionen', 'nein, laut Geschäftsbedingungen', 'Ein- und Ausgaben standardmässig innert 30 Tagen gelöscht'],
  ['Google (Gemini in Google Workspace)', 'gemäss Ihrem Workspace-Vertrag', 'nein, laut Google, ausser Sie erlauben es', 'gemäss Ihrem Workspace-Vertrag'],
  ['Infomaniak (offene KI-Modelle)', 'eigene Rechenzentren in der Schweiz', 'laut Anbieter keine Speicherung der Anfragen', 'laut Anbieter keine'],
];
const SPALTEN = ['Wo die Daten verarbeitet werden', 'Training mit Ihren Daten', 'Aufbewahrung'];

exports.render = (ctx) => {
  const c = ctx.c;
  const t = ctx.t;
  const e = ctx.esc;
  const ext = (label, href) => `<a class="text-link" href="${href}" target="_blank" rel="noopener">${label}<span class="sr"> (öffnet eine externe Seite)</span></a>`;
  const host = (u) => new URL(u).hostname.replace(/^www\./, '');
  const block = (id, icon, title, text) => `<article class="grundsatz" id="${id}" data-reveal><span class="grundsatz__icon">${c.icon(icon)}</span><h3 class="t-h3">${title}</h3><p>${text}</p></article>`;
  const tabelle = `<div class="tbl-wrap" data-reveal><table class="tbl tbl--anbieter">
    <caption class="sr">KI-Anbieter im Überblick, Stand ${e(ctx.site.stand.sicherheit)}</caption>
    <thead><tr><th scope="col">Anbieter</th>${SPALTEN.map((s) => `<th scope="col">${s}</th>`).join('')}</tr></thead>
    <tbody>${ANBIETER.map(([a, ...v]) => `<tr><th scope="row">${a}</th>${v.map((x, i) => `<td data-label="${SPALTEN[i]}">${x}</td>`).join('')}</tr>`).join('\n')}</tbody>
  </table></div>`;
  return [
    c.hero({
      crumbs: [{ label: 'KI', href: 'ki/' }, { label: 'Datenschutz und Sicherheit' }],
      eyebrow: 'Sicherheit',
      title: 'Datenschutz und Sicherheit bei KI, in einfacher Sprache.',
      lead: 'Bevor Sie einer KI Kundendaten anvertrauen, wollen Sie wissen, wohin sie gehen. Hier steht es, mit Quellen.',
      line: t('Anbieter-Bedingungen geprüft am {{stand_sicherheit}}'),
    }),
    c.section({
      id: 'kurz', tone: 'tint',
      head: { eyebrow: 'Kurz gesagt', title: 'Das Wichtigste in Kürze.' },
      body: c.cards([
        { icon: 'haus', title: 'Daten bleiben bei Ihnen', text: 'Ihre Daten und die Lösung selbst liegen in Ihrem Konto. Zur KI geht nur, was eine Aufgabe braucht.' },
        { icon: 'schild', title: 'Kein Training', text: 'Ich setze nur Geschäftsangebote ein, deren Bedingungen das Training mit Ihren Daten ausschliessen.' },
        { icon: 'ort', title: 'Standard: Schweiz', text: t('Kundendaten verarbeite ich standardmässig {{daten_standard}}. Etwas anderes nur mit Ihrer schriftlichen Zustimmung, pro Fall.') },
        { icon: 'dokument', title: 'Vertraulich ab dem ersten Gespräch', text: 'Auf Wunsch unterschreibe ich vorher eine Vertraulichkeitserklärung. Welcher Anbieter welche Daten erhält, steht im Vertrag.', href: 'sicherheit/#vertraulichkeit', linkLabel: 'So läuft es' },
        { icon: 'schluessel', title: 'Nur nötige Zugriffe', text: 'Die KI erhält nur die Zugriffe, die sie braucht. Sie können sie jederzeit entziehen.' },
        { icon: 'papierkorb', title: 'Löschung bestätigt', text: 'Am Ende entziehen Sie meine Zugänge. Was ich für das Projekt bei mir hatte, lösche ich und bestätige es schriftlich.' },
      ], { cols: 3, cls: 'cards--white kurz' }),
    }),
    c.section({
      id: 'daten',
      head: { eyebrow: 'Datenweg', title: 'Wo Ihre Daten liegen.' },
      body: [
        c.trustDatenweg(),
        '<p class="t-lead sec__foot daten__text" data-reveal>Gespeichert wird bei Ihnen, in Ihren Programmen. Beim KI-Anbieter wird der Text verarbeitet. Je nach Anbieter bewahrt er ihn eine begrenzte Zeit für Missbrauchskontrollen auf, meist bis 30 Tage, und löscht ihn danach.</p>',
      ].join('\n'),
    }),
    c.section({
      id: 'loesung', tone: 'soft',
      head: { eyebrow: 'Betrieb', title: 'Wo die Lösung läuft.', intro: 'Nicht nur Ihre Daten, auch die Lösung selbst gehört in Ihr Konto: Abläufe, Schlüssel, Zwischenergebnisse und Protokolle. So sieht Ihre IT jederzeit, was läuft, und kann mir den Zugang entziehen.' },
      body: `<div class="ort" data-reveal>
        <div class="ort__box ort__box--ihr">
          <p class="ort__zone">${c.icon('haus')}<span>In Ihrem Konto</span></p>
          <p class="ort__title">Bevorzugt in Ihrem Microsoft-365- oder Azure-Konto, Region Schweiz.</p>
          <p class="ort__text">Arbeiten Sie nicht mit Microsoft, in einem Konto bei Infomaniak auf Ihren Namen.</p>
          ${c.list([
            'Ihre Daten: Mails, Belege, Anfragen',
            'die Abläufe der Lösung und der KI-Dienst',
            'Schlüssel und Zugangsdaten, verschlüsselt',
            'Zwischenergebnisse und Protokolle: wer wann was freigegeben hat',
          ], { style: 'check' })}
          <p class="ort__app">${c.icon('schluessel')}<span>Die Lösung erhält eine eigene App-Registrierung, der Ihre IT zustimmt. Sie darf nur auf das vereinbarte Postfach oder den vereinbarten Ordner zugreifen.</span></p>
        </div>
        <div class="ort__mitte" aria-hidden="true"><span class="ort__linie"></span></div>
        <div class="ort__box ort__box--ich">
          <p class="ort__zone">${c.icon('person')}<span>Mein Zugang</span></p>
          <p class="ort__text">Ein eigenes Konto mit Zwei-Faktor-Anmeldung, das Sie jederzeit entziehen können.</p>
          <p class="ort__sub">Bei mir liegt</p>
          ${c.list(['eine Kopie des Codes, er gehört Ihnen', 'die Dokumentation', 'erfundene Testdaten'], { style: 'dot' })}
          <p class="ort__sub ort__sub--nie">Nie auf meinen Geräten</p>
          ${c.list(['Ihre Kunden- und Mandantendaten', 'Passwörter oder Schlüssel in Mails', 'Protokolle mit Personendaten'], { style: 'dot', cls: 'ort__nie' })}
        </div>
      </div>
      <p class="note">Gebaut und getestet wird mit erfundenen Daten. Meine Entwicklungswerkzeuge, auch KI-Assistenten beim Programmieren, sehen keine echten Kundendaten.</p>`,
    }),
    c.section({
      id: 'it', tone: 'soft',
      head: { eyebrow: 'Für Ihre IT', title: 'Technischer Aufbau, zum Aufklappen.', intro: 'So baue ich eine Lösung für Microsoft 365 auf, am Beispiel Antwortentwürfe für ein Postfach. Die Einzelheiten legen wir im Pilot mit Ihrer IT fest und schreiben sie ins Betriebshandbuch.' },
      body: `<details class="it" data-reveal>
        <summary class="it__sum"><span>Dienste, Berechtigungen, Protokolle</span></summary>
        <div class="it__body">
          <ol class="it__fluss" aria-label="Ablauf einer Anfrage">
            <li><span class="it__ort">Exchange Online</span><b>Postfach</b><span>neue Mail im vereinbarten Postfach</span></li>
            <li><span class="it__ort">Azure, Switzerland North</span><b>Ablauf</b><span>Azure Functions in Ihrem Abonnement</span></li>
            <li><span class="it__ort">Azure, Switzerland North</span><b>KI</b><span>Azure OpenAI, regionale Bereitstellung</span></li>
            <li><span class="it__ort">Exchange Online</span><b>Entwurf</b><span>im Entwurfsordner, Versand durch Ihr Team</span></li>
          </ol>
          <dl class="it__liste">
            <div><dt>App-Registrierung</dt><dd>Eigene App in Ihrem Entra ID, Ihre IT erteilt die Zustimmung. Anmeldung mit Zertifikat, nicht mit Passwort.</dd></div>
            <div><dt>Berechtigungen</dt><dd>Microsoft Graph, Anwendungsrecht Mail.ReadWrite: Mails lesen und Entwürfe anlegen. Kein Recht zum Senden (Mail.Send). Beschränkt auf das vereinbarte Postfach mit RBAC für Anwendungen in Exchange Online. Eine Freigabe für alle Postfächer in Entra ID gibt es nicht, sie würde die Beschränkung aushebeln.</dd></div>
            <div><dt>Schlüssel</dt><dd>In Azure Key Vault in Ihrem Abonnement. Der Ablauf greift mit einer verwalteten Identität darauf zu.</dd></div>
            <div><dt>Code</dt><dd>In einem Repository auf Ihren Namen, zum Beispiel bei GitHub oder Azure DevOps. Änderungen sind nachvollziehbar.</dd></div>
            <div><dt>Protokolle</dt><dd>Application Insights in Ihrem Abonnement: Zeit, Ablauf, Ergebnis und Fehler, keine Mailinhalte. Aufbewahrung standardmässig 30 Tage, anders nach Vereinbarung.</dd></div>
            <div><dt>Fehlermeldungen</dt><dd>Warnungen über Azure Monitor per Mail an mich und auf Wunsch an Ihre IT.</dd></div>
            <div><dt>Abschalten</dt><dd>Ablauf in Azure stoppen oder die App in Entra ID deaktivieren. Beides kann Ihre IT ohne mich.</dd></div>
          </dl>
          <p class="note">Mit Google Workspace oder anderen Programmen ist der Grundsatz gleich: eigenes Konto der Lösung mit eng begrenzten Rechten, in Ihrem Konto. Den genauen Aufbau legen wir im KI-Check fest. Quellen von Microsoft stehen <a class="text-link" href="#quellen">unten auf dieser Seite</a>.</p>
        </div>
      </details>`,
    }),
    c.section({
      id: 'vertraulichkeit',
      head: { eyebrow: 'Vertraulichkeit', title: 'Vertraulich vom ersten Gespräch an.', intro: 'Für den KI-Check brauche ich keine Kunden- oder Mandantendaten. Echte Daten kommen erst im Pilot dazu, wenn alles unterschrieben ist.' },
      body: c.steps([
        { title: 'Gespräch', text: 'Wir besprechen Ihre Abläufe. Auf Wunsch unterschreibe ich vorher eine Vertraulichkeitserklärung: Was ich von Ihrem Betrieb erfahre, bleibt bei mir und wird nur für Ihren Auftrag verwendet, auch nach dem Ende der Zusammenarbeit.' },
        { title: 'KI-Check', text: 'Ich arbeite mit Musterbelegen, erfundenen Beispielen oder Unterlagen Ihres eigenen Betriebs, die Sie dafür freigeben. Kunden- und Mandantendaten sehe ich nicht.' },
        { title: 'Vertrag', text: 'Vor dem Pilot unterschreiben wir den Vertrag zur Auftragsbearbeitung. Darin steht, welcher Anbieter welche Daten erhält und wo.', decide: true },
        { title: 'Pilot', text: t('Erst jetzt arbeitet die KI mit echten Daten, in Ihrem Konto und standardmässig {{daten_standard}}.') },
      ], { decideLabel: 'Sie unterschreiben' }) + `<p class="sec__foot vertraulich__links">${c.more({ href: 'unterlagen/vertraulichkeit/', label: 'Muster der Vertraulichkeitserklärung lesen' })}${c.more({ href: 'unterlagen/auftragsbearbeitung/', label: 'Muster des Vertrags zur Auftragsbearbeitung lesen' })}</p>`,
    }),
    c.section({
      id: 'anbieter', tone: 'soft',
      head: { eyebrow: 'Anbieter', title: 'Welche Anbieter ich einsetze.', intro: t('Welcher Anbieter passt, hängt von der Aufgabe und von Ihren Anforderungen ab. Das klären wir im KI-Check. Die wichtigsten im Überblick (Stand {{stand_sicherheit}}):') },
      body: `${tabelle}
      <p class="note">Bedingungen können sich ändern. Vor jedem Projekt prüfe ich sie neu und lege Ihnen die aktuellen Unterlagen vor. Die Quellen stehen <a class="text-link" href="#quellen">unten auf dieser Seite</a>.</p>`,
    }),
    c.section({
      id: 'grundsaetze',
      head: { eyebrow: 'So schütze ich Ihre Daten', title: 'Sieben Regeln für jedes Projekt.' },
      body: `<div class="grundsaetze">
        ${block('training', 'schild', 'Kein Training mit Ihren Daten.', 'Die Geschäftsangebote der grossen Anbieter schliessen das Training mit Kundendaten in ihren Bedingungen aus. Bei Gratis-Apps für Privatpersonen ist das anders: Dort können Eingaben je nach Einstellung zum Training verwendet werden. Darum nutze ich für Ihre Daten nie Gratis-Versionen, sondern nur Geschäftskonten mit Vertrag.')}
        ${block('standort', 'ort', 'Standard: Schweiz. Ausnahmen nur schriftlich.', t('Kundendaten verarbeite ich standardmässig {{daten_standard}}, {{daten_beispiele}}. Braucht eine Aufgabe ein Modell, das es dort nicht gibt, frage ich Sie vorher schriftlich, pro Fall. Ohne Ihre Zustimmung gehen keine Kundendaten in die EU oder die USA. Für die USA gilt seit dem 15. September 2024 das Swiss-U.S. Data Privacy Framework: Daten dürfen grundsätzlich an US-Firmen gehen, die sich danach zertifiziert haben.'))}
        ${block('zugriff', 'schluessel', 'Zugriffsrechte.', 'Die KI erhält ein eigenes Konto mit eng begrenzten Rechten, zum Beispiel nur Lesen in einem Postfach und Schreiben in den Entwurfsordner. Alle Zugänge sind mit Zwei-Faktor-Anmeldung geschützt, Schlüssel liegen verschlüsselt und nie in Mails. Sie sehen jederzeit, welche Zugänge es gibt, und können sie entziehen.')}
        ${block('loeschung', 'papierkorb', 'Löschung.', 'Zwischenergebnisse der KI werden nach einer Frist gelöscht, die wir vereinbaren. Am Ende der Zusammenarbeit entziehen Sie meine Zugänge, und ich lösche, was ich für das Projekt bei mir hatte. Das bestätige ich schriftlich. Ihre Belege, Buchungen und Akten bleiben in Ihren Programmen, auch für die gesetzliche Aufbewahrungspflicht.')}
        ${block('entwicklung', 'werkzeug', 'Gebaut wird mit erfundenen Daten.', 'Ich baue und teste jede Lösung mit erfundenen Daten. Meine Entwicklungswerkzeuge, auch KI-Assistenten beim Programmieren, sehen keine echten Kundendaten. Auf Ihre Systeme greife ich nur über mein eigenes Konto mit Zwei-Faktor-Anmeldung zu.')}
        ${block('formular', 'mail', 'Keine Kundendaten über die Website.', t('Formular und Mail dieser Website laufen heute über {{formular_anbieter}} ({{formular_ort}}) und {{mail_dienst}}. Sie sind für erste Anfragen gedacht, darum gilt die Regel «Standard Schweiz» hier noch nicht. Bitte schicken Sie darüber keine Kunden- oder Mandantendaten. Ihre Daten in einer KI-Lösung laufen nie über diese Wege, sondern in Ihrem eigenen Konto.') + (ctx.site.kontakt.umstellung ? ' ' + e(ctx.site.kontakt.umstellung) : ''))}
        <article class="grundsatz grundsatz--breit" id="wenig-daten" data-reveal><div><span class="grundsatz__icon">${c.icon('liste')}</span><h3 class="t-h3">So wenig Daten wie nötig.</h3><p>Für einen Antwortentwurf braucht die KI die Anfrage, nicht Ihre ganze Kundendatenbank. Wo es die Aufgabe erlaubt, ersetze ich Namen und Nummern durch Platzhalter, bevor Text zur KI geht.</p></div>${c.trustPlatzhalter()}</article>
      </div>`,
    }),
    c.section({
      id: 'dsg', tone: 'soft',
      head: { eyebrow: 'Gesetz', title: 'Schweizer Datenschutzgesetz (DSG).' },
      body: `<div class="grid grid--split dsg">
        <div data-reveal>
          <p class="t-lead">Seit dem 1. September 2023 gilt das neue Datenschutzgesetz. Es gilt auch für KI, das hat der Eidgenössische Datenschutz- und Öffentlichkeitsbeauftragte (EDÖB) klargestellt. Wer mit Ihrem Betrieb schreibt, soll erfahren können, dass KI mitarbeitet. Ich schlage Ihnen dafür einen kurzen Text für Ihre Datenschutzerklärung vor. Eine Rechtsberatung ersetzt das nicht.</p>
          <h3 class="t-h3 dsg__h">Auftragsbearbeitung</h3>
          <p>Bearbeite ich für Sie Personendaten, bin ich Auftragsbearbeiter. Das regeln wir in einem schriftlichen Vertrag: was ich darf, welche Anbieter beteiligt sind, wie ich die Daten schütze und wann ich lösche. Die KI-Anbieter sind dann Unterauftragsbearbeiter. Sie stimmen ihnen vorher zu.</p>
        </div>
        <div class="vertrag" data-reveal role="group" aria-labelledby="vertrag-t">
          <p class="vertrag__head" id="vertrag-t">${c.icon('dokument')}<span>Vertrag zur Auftragsbearbeitung</span></p>
          ${c.list(['was ich mit Ihren Daten tun darf', 'welche Anbieter beteiligt sind, und wo', 'wie ich die Daten schütze', 'wann und wie ich lösche', 'Ihre Zustimmung zu jedem Unteranbieter'], { style: 'check' })}
          <p>${c.more({ href: 'unterlagen/auftragsbearbeitung/', label: 'Muster lesen' })}</p>
          <p class="note">Ich bin kein Jurist. Rechtliche Fragen klären Sie mit Ihrer Fachperson, ich liefere die technischen Angaben.</p>
        </div>
      </div>`,
    }),
    c.section({
      id: 'ehrlich',
      label: 'Was ich nicht habe und fünf Fragen an jeden KI-Anbieter',
      body: `<div class="grid grid--2 ehrlich">
        <div>${c.info({ icon: 'schild', tone: 'warm', level: 2, title: 'Was ich nicht habe.', text: 'Ich habe keine Zertifizierung wie ISO 27001 und gebe keine Garantien, die ich nicht halten kann. Die grossen Anbieter legen ihre Sicherheitsnachweise und Datenschutzverträge offen. Ich zeige sie Ihnen auf Wunsch.' })}</div>
        <div class="fragen5" data-reveal>
          <h2 class="t-h3" id="fuenf-fragen">Fünf Fragen, die Sie jedem KI-Anbieter stellen sollten, auch mir.</h2>
          ${c.list(['Wo werden unsere Daten verarbeitet und gespeichert?', 'Wird mit unseren Daten trainiert?', 'Wer hat Zugriff, und wie entziehen wir ihn?', 'Was passiert mit den Daten am Ende der Zusammenarbeit?', 'Wie arbeiten wir weiter, wenn die KI ausfällt?'], { style: 'num' })}
          <p>${c.more({ href: 'support/', label: 'Antwort auf Frage 5: Betrieb und Support' })}</p>
        </div>
      </div>`,
    }),
    c.section({
      id: 'quellen', tone: 'soft',
      head: { eyebrow: 'Quellen', title: 'Quellen.', intro: t('Geprüft am {{stand_sicherheit}}. Diese Website selbst setzt keine Cookies und keine Tracking-Dienste ein, mehr dazu in der') + ` <a class="text-link" href="${ctx.url('datenschutz/')}">Datenschutzerklärung</a>.` },
      body: `<ul class="quellen">${QUELLEN.map(([wer, l, h]) => `<li data-reveal><span class="quellen__wer">${e(wer)}</span>${ext(l, h)}<span class="quellen__host">${e(host(h))}</span></li>`).join('')}</ul>`,
    }),
    c.ctaBand({
      title: 'Noch eine Frage zum Datenschutz?',
      text: 'Fragen Sie mich direkt. Im KI-Check klären wir den Datenschutz für Ihren Fall, bevor etwas läuft.',
      buttons: [{ href: 'kontakt/?thema=datenschutz', label: 'Frage stellen' }],
    }),
  ].join('\n');
};
