'use strict';
// Muster Vertrag zur Auftragsbearbeitung nach DSG (Testkunden Runde 2). Gruppe: Vertrauens-Seiten.
// Stuetzt sich auf Art. 8 (Datensicherheit), Art. 9 (Auftragsbearbeitung), Art. 16 (Ausland), Art. 24 (Meldung) DSG.
// Text aendern: hier. Danach Build und PDF neu erzeugen (node studio/_src/unterlagen-pdf.js).

exports.meta = {
  path: 'unterlagen/auftragsbearbeitung/',
  nav: 'ki',
  css: ['vertrauen'],
  title: 'Muster Vertrag zur Auftragsbearbeitung | {{marke}}',
  description: 'Der Vertrag zur Auftragsbearbeitung nach Schweizer DSG zum Lesen vor dem Pilot: Zweck, Datenort, Unteranbieter, Sicherheit, Meldung, Löschung.',
};

const STAND = 'November 2026';

exports.render = (ctx) => {
  const c = ctx.c;
  const s = ctx.site;
  const e = ctx.esc;
  const t = ctx.t;
  const luecke = (l) => c.trustLuecke(l);
  const ich = `${e(s.person.name)}, ${s.kontakt.adresse ? e(s.kontakt.adresse) : e(s.marke.region)}<br>${e(s.kontakt.mail)}`;
  const anhang = `<p>Diesen Anbietern stimmen Sie mit der Unterschrift zu. Weitere nur nach Ihrer schriftlichen Zustimmung.</p>
    <div class="tbl-wrap"><table class="tbl tbl--klein doc__tbl">
      <thead><tr><th scope="col">Anbieter</th><th scope="col">Wofür</th><th scope="col">Wo die Daten bearbeitet werden</th></tr></thead>
      <tbody>
        <tr><td>Beispiel: Microsoft Azure OpenAI, Konto auf Ihren Namen</td><td>Text der Anfrage lesen, Entwurf schreiben</td><td>Schweiz, Region «Switzerland North»</td></tr>
        <tr><td>${luecke('Anbieter')}</td><td>${luecke('Zweck')}</td><td>${luecke('Ort')}</td></tr>
        <tr><td>${luecke('Anbieter')}</td><td>${luecke('Zweck')}</td><td>${luecke('Ort')}</td></tr>
      </tbody>
    </table></div>`;
  return [
    c.hero({
      crumbs: [{ label: 'KI', href: 'ki/' }, { label: 'Unterlagen', href: 'unterlagen/' }, { label: 'Auftragsbearbeitung' }],
      eyebrow: 'Muster',
      title: 'Vertrag zur Auftragsbearbeitung.',
      lead: 'Diesen Vertrag unterschreiben wir vor dem Pilot, bevor die KI mit echten Daten arbeitet. Zwei Seiten, nach dem Schweizer Datenschutzgesetz.',
      buttons: [
        { href: 'assets/docs/muster-auftragsbearbeitung.pdf', label: 'Als PDF herunterladen' },
        { href: 'unterlagen/', label: 'Alle Unterlagen', variant: 'secondary' },
      ],
    }),
    c.section({
      id: 'dokument', tone: 'soft',
      label: 'Muster Vertrag zur Auftragsbearbeitung',
      body: c.trustDokument({
        titel: 'Vertrag zur Auftragsbearbeitung',
        art: 'Muster',
        stand: STAND,
        einleitung: 'Gilt zusätzlich zur Offerte. Wo sich die beiden widersprechen, geht dieser Vertrag für den Umgang mit Personendaten vor.',
        parteien: [
          ['Verantwortlicher', `Firma, Adresse: ${luecke('Firma und Adresse des Verantwortlichen')}`],
          ['Auftragsbearbeiter', `${ich}<br>Minderjährig, vertreten durch die Eltern als gesetzliche Vertretung`],
        ],
        abschnitte: [
          ['Gegenstand', `<p>Ich baue, teste und betreibe die KI-Lösung gemäss Offerte vom ${luecke('Datum der Offerte')}. Dabei bearbeite ich Personendaten in Ihrem Auftrag.</p><p>Art der Daten: ${luecke('zum Beispiel Mails von Kunden, Belege')}<br>Betroffene Personen: ${luecke('zum Beispiel Kunden, Mandanten, Mieter')}<br>Dauer: solange der Auftrag läuft.</p>`],
          ['Nur nach Ihren Weisungen', 'Ich bearbeite die Daten nur so, wie Sie es selbst dürften, und nur für diesen Auftrag (Art. 9 DSG). Eigene Auswertungen, andere Zwecke und das Training von KI-Modellen mit Ihren Daten sind ausgeschlossen. Halte ich eine Weisung für rechtswidrig, sage ich es Ihnen.'],
          ['Wo die Daten liegen', t('Die Daten bleiben in Ihren Programmen und Konten. Zur KI geht nur, was eine Aufgabe braucht, und zwar standardmässig {{daten_standard}}. Eine Bearbeitung ausserhalb der Schweiz braucht Ihre schriftliche Zustimmung, pro Fall, und die Voraussetzungen von Art. 16 DSG.')],
          ['Unterauftragsbearbeiter', 'Ich setze nur die Anbieter im Anhang ein. Ein neuer Anbieter braucht vorher Ihre schriftliche Zustimmung (Art. 9 Abs. 3 DSG). Ich wähle nur Anbieter, deren Vertrag sie zu Vertraulichkeit und Datensicherheit verpflichtet. Läuft das Konto beim Anbieter auf Ihren Namen, ist er direkt Ihr Auftragsbearbeiter.'],
          ['Vertraulichkeit', 'Ich behandle die Daten vertraulich, auch nach dem Ende des Auftrags. Unterstehen Sie einer beruflichen Schweigepflicht, bin auch ich daran gebunden (Art. 62 Abs. 2 DSG).'],
          ['Datensicherheit', `<p>Ich schütze die Daten nach dem Stand der Technik (Art. 8 DSG), insbesondere so:</p><ul><li>Die Lösung erhält nur die Rechte, die sie braucht, zum Beispiel Lesen in einem Postfach und Schreiben in den Entwurfsordner.</li><li>Mein Zugang ist ein eigenes Konto mit Zwei-Faktor-Anmeldung. Sie können ihn jederzeit entziehen.</li><li>Schlüssel liegen verschlüsselt, nie in Mails. Ihre Daten speichere ich nicht auf meinen Geräten.</li><li>Gebaut und getestet wird mit erfundenen Daten.</li><li>Freigaben werden mit Name und Zeit festgehalten.</li></ul>`],
          ['Meldung bei Vorfällen', 'Bemerke ich eine Verletzung der Datensicherheit, melde ich sie Ihnen so rasch als möglich, mit allem, was ich dazu weiss (Art. 24 Abs. 3 DSG). Die KI schalte ich bis zur Klärung ab.'],
          ['Unterstützung und Kontrolle', 'Ich helfe Ihnen bei Auskunftsbegehren und anderen Rechten betroffener Personen, soweit es die Lösung betrifft. Sie dürfen prüfen, wie ich diesen Vertrag einhalte, zum Beispiel durch Einsicht in Dokumentation und Zugänge.'],
          ['Ende des Auftrags', 'Sie entziehen meine Zugänge. Ich lösche alle Daten, die ich für den Auftrag bei mir hatte, und bestätige es schriftlich. Ihre Daten bleiben in Ihren Programmen.'],
          ['Haftung und Recht', 'Die Haftung richtet sich nach der Offerte. Es gilt Schweizer Recht. Gerichtsstand ist am Sitz des Verantwortlichen.'],
        ],
        anhang: { titel: 'Anhang: Unterauftragsbearbeiter', html: anhang },
        unterschriften: { kunde: 'Verantwortlicher', ich: 'Auftragsbearbeiter' },
      }),
    }),
    c.section({
      id: 'hinweis',
      label: 'Hinweis zum Muster',
      body: `<div class="grid grid--2">
        ${c.info({ icon: 'dokument', tone: 'warm', title: 'Ein Muster, kein Rechtsrat', text: 'Verbindlich ist die Fassung, die wir beide unterschreiben. Haben Sie eine eigene Vorlage, etwa von Ihrem Verband, unterschreibe ich gerne diese.' })}
        ${c.info({ icon: 'schild', tone: 'tint', title: 'Mehr zum Datenschutz', text: 'Welche Anbieter ich einsetze, wo sie Daten bearbeiten und wie lange sie sie aufbewahren, steht mit Quellen auf der Seite Sicherheit.', link: { href: 'sicherheit/#anbieter', label: 'Anbieter im Überblick' } })}
      </div>`,
    }),
    c.ctaBand({
      title: 'Fragen zum Vertrag?',
      text: 'Fragen Sie mich direkt. Im KI-Check gehen wir den Vertrag gemeinsam durch, bevor etwas läuft.',
      buttons: [{ href: 'kontakt/?thema=datenschutz', label: 'Frage stellen' }],
    }),
  ].join('\n');
};
