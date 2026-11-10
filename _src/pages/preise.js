'use strict';
// Preise (V4-KONZEPT 2.6, V4-TEXTE 16). Gruppe: Vertrauens-Seiten. Alle Betraege aus site.json,
// Kostenschema und Beispielrechnung rechnet components/trust-grafiken.js.

exports.meta = {
  path: 'preise/',
  nav: 'preise',
  css: ['vertrauen'],
  title: 'Preise für KI und Websites | {{marke}}',
  description: 'Richtwerte für KI und Websites: KI-Check zum Fixpreis, Pilot, Einführung, Betrieb pro Monat und Website ab Fixpreis. Stundenansatz {{stundenansatz}}.',
};

exports.render = (ctx) => {
  const c = ctx.c;
  const t = ctx.t;
  const e = ctx.esc;
  const k = ctx.site.kontakt;
  const pa = ctx.site.pilotangebot || {};
  const pilotStunden = Math.round(ctx.preis('pilot').betrag / ctx.site.preise.stundenansatz);
  // Pilotangebot direkt beim KI-Check (Testkunden: auf Referenzen allein zu versteckt)
  const pilotText = pa.plaetze > 0 && (pa.frei === undefined || pa.frei > 0)
    ? `<span class="price__pilot">${t('Pilotangebot: {{preis_ki_check_pilot}} statt {{preis_ki_check}}.')} Noch ${e(pa.frei === undefined ? pa.plaetze : pa.frei)} Plätze frei. <a class="text-link" href="${ctx.url('referenzen/#pilot')}">Bedingungen</a></span>`
    : '';
  return [
    // Abnahme V4: Zahlen schon im ersten Bildschirm (vorher leere rechte Hälfte, erste Preiskarte erst nach dem Scrollen)
    c.hero({
      variant: 'split',
      cls: 'hero--preise',
      eyebrow: 'Preise',
      title: 'Preise, offen und verständlich.',
      lead: t('Richtwerte, damit Sie wissen, woran Sie sind. Verbindlich ist die Offerte. Stundenansatz {{stundenansatz}}, es kommt keine Mehrwertsteuer dazu.'),
      line: 'KI-Check · Pilot · Einführung · Betrieb · Websites',
      media: `<p class="t-eyebrow">Auf einen Blick</p>${c.priceStrip(['ki-check', 'pilot', 'einfuehrung', 'betrieb', 'nutzung', 'website'], { note: false, link: false })}`,
    }),
    c.section({
      id: 'ki',
      head: { eyebrow: 'KI im Betrieb', title: 'KI in vier Stufen.', intro: `Nach jeder Stufe entscheiden Sie, ob es weitergeht. Reicht der Nutzen nicht, hören wir auf.${k.erstgespraech ? ' Vorher: ' + e(k.erstgespraech).replace(/^Das erste Gespräch/, 'ein Erstgespräch. Es') : ''}` },
      body: [
        c.priceCards([
          { id: 'ki-check', featured: true, badge: 'Empfohlener Einstieg', hours: true, text: pilotText, points: ['Gespräch, bei Ihnen oder per Video', 'Analyse von zwei bis drei Abläufen', 'Bericht mit Empfehlung und Fixpreis für den Pilot', 'Ihr Aufwand: rund anderthalb Stunden Gespräch'], button: { href: 'kontakt/?thema=ki-check', label: 'KI-Check anfragen' } },
          { id: 'pilot', hours: true, points: ['ein Ablauf, mit einem Programm verbunden', 'rund vier Wochen Test mit Ihrem Team', 'Auswertung', 'Ihr Aufwand: Start 1 Stunde, dann rund 15 Minuten pro Person und Woche, Auswertung 1 Stunde'] },
          { id: 'einfuehrung', points: ['Ausbau und stabile Verbindungen', 'Schulung und Dokumentation', 'Übergabe mit Abschalter', 'Ihr Aufwand: Schulung und Abnahme, je rund 1 Stunde'] },
          { id: 'betrieb', points: ['Überwachung und Anpassungen', 'Ansprechperson', 'auf Ende jedes Monats kündbar', 'Ihr Aufwand: Wünsche und Fehler melden'], text: t('plus KI-Nutzung nach Verbrauch, typisch {{ki_nutzung}}') },
        ]),
        c.preisHinweis(),
        `<p class="sec__foot preise-links">${c.more({ href: 'ki/#ablauf', label: 'Was in jeder Stufe passiert' })}${c.more({ href: 'support/', label: 'Was der Betrieb enthält' })}</p>`,
      ].join('\n'),
    }),
    c.section({
      id: 'pilot', tone: 'tint',
      head: { eyebrow: 'Pilot', title: t('Was im Pilot ab {{preis_pilot_ab}} steckt.'), intro: `Rund ${pilotStunden} Stunden Arbeit für einen Ablauf mit einem Programm. Das ist knapp, aber reicht, weil der Pilot bewusst klein ist.` },
      body: `<div class="grid grid--split pilot-inhalt">
        <div data-reveal>${c.list([
          '<strong>Zugriffe einrichten.</strong> Eigene App mit Rechten auf ein Postfach oder einen Ordner, Konto beim KI-Anbieter auf Ihren Namen, Vertrag zur Auftragsbearbeitung.',
          '<strong>Ablauf bauen und testen.</strong> Zuerst mit erfundenen Daten, dann mit Ihren echten Abläufen.',
          '<strong>Begleiten.</strong> Start mit Ihrem Team und Antworten auf Fragen während der rund vier Wochen.',
          '<strong>Auswerten.</strong> Wie oft passten die Entwürfe, wie viel Zeit wurde gespart. Mit Empfehlung, ob es weitergeht.',
          '<strong>Kurzdokumentation und Abschalter.</strong> Damit Sie die Lösung jederzeit selbst stoppen können.',
        ], { style: 'num' })}</div>
        <div data-reveal>${c.info({ icon: 'stecker', tone: 'warm', title: 'Wann der Pilot grösser wird', text: 'Muss eine Schnittstelle erst freigeschaltet werden, wie bei Abacus, oder sind mehrere Programme beteiligt, braucht der Pilot mehr Zeit. Den Fixpreis dafür nennt Ihnen der Bericht zum KI-Check, bevor Sie etwas bestellen. Der Aufwand Ihres Software-Partners kommt dazu.' })}</div>
      </div>`,
    }),
    c.section({
      id: 'bericht', tone: 'stage',
      head: { eyebrow: 'KI-Check', title: 'Was Sie für den KI-Check erhalten.', intro: t('Einen Bericht von drei bis vier Seiten, innert zwei Wochen nach dem Gespräch. Er gehört Ihnen, auch wenn Sie nicht weitermachen. So sieht er aus, am Beispiel einer erfundenen Verwaltung:') },
      body: `<div class="grid grid--split bericht-grid">
        <div class="bericht" data-reveal role="img" aria-label="Beispiel eines KI-Check-Berichts für eine erfundene Verwaltung: drei Abläufe bewertet, Datenschutz, Empfehlung mit Fixpreis für den Pilot">
          <p class="bericht__kopf"><span>KI-Check</span><span>Verwaltung Muster AG</span></p>
          <p class="bericht__h">2. Drei Abläufe, bewertet</p>
          <table class="bericht__tbl">
            <thead><tr><th>Ablauf</th><th>pro Woche</th><th>heute</th><th>Eignung</th></tr></thead>
            <tbody>
              <tr><td>Mieteranfragen per Mail</td><td>rund 60</td><td>je 6 Min.</td><td><span class="bericht__tag bericht__tag--gut">gut</span></td></tr>
              <tr><td>Schadenmeldungen</td><td>rund 15</td><td>je 10 Min.</td><td><span class="bericht__tag">mit Notfallregel</span></td></tr>
              <tr><td>Rückfragen Nebenkosten</td><td>rund 10</td><td>je 20 Min.</td><td><span class="bericht__tag bericht__tag--nein">noch nicht</span></td></tr>
            </tbody>
          </table>
          <p class="bericht__h">3. Datenschutz</p>
          <p class="bericht__p">Daten bleiben in Microsoft 365. KI in der Region Schweiz. Vertrag zur Auftragsbearbeitung vor dem Pilot.</p>
          <p class="bericht__h">4. Empfehlung</p>
          <p class="bericht__p">${t('Pilot mit den Mieteranfragen, vier Wochen, zwei Personen testen. Ziel: Sieben von zehn Entwürfen passen ohne grosse Änderung. Fixpreis Pilot ab {{preis_pilot_ab}}.')}</p>
          <p class="bericht__p bericht__p--leise">5. Was ich nicht empfehle · 6. Programme und Schnittstellen · 7. Nächste Schritte</p>
        </div>
        <div data-reveal>
          ${c.badge('beispiel')}
          ${c.list([
            'Ihre Abläufe heute, mit Menge und Zeitaufwand',
            'zwei bis drei Abläufe, bewertet nach Nutzen, Aufwand und Risiko',
            'Datenschutz: welche Daten wohin gehen, und was es dafür braucht',
            'welche Programme sich anbinden lassen, und wie',
            'Empfehlung mit Fixpreis und Erfolgsziel für den Pilot',
            'ehrlich: was sich nicht lohnt',
          ], { style: 'check' })}
          <p class="note">Für den KI-Check brauche ich keine Kunden- oder Mandantendaten. ${c.more({ href: 'sicherheit/#vertraulichkeit', label: 'Vertraulichkeit' })}</p>
        </div>
      </div>`,
    }),
    c.section({
      id: 'nutzung', tone: 'tint',
      head: { eyebrow: 'Kosten pro Monat', title: 'Was ist die KI-Nutzung?' },
      body: [
        '<div class="grid grid--split preise-nutzung">',
        `<div data-reveal><p class="t-lead">KI-Anbieter rechnen nach Verbrauch ab, also nach der Menge Text, die verarbeitet wird. Wie viel das bei Ihnen ist, hängt von der Menge und vom Modell ab. Ich rechne es im KI-Check für Ihren Fall aus.</p><p>Am liebsten läuft das Konto auf Ihren Namen, dann sehen Sie jede Rechnung selbst.</p></div>`,
        `<div>${c.trustKostenMonat()}</div>`,
        '</div>',
      ].join('\n'),
    }),
    c.section({
      id: 'beispielrechnung',
      head: { eyebrow: 'Beispielrechnung', title: 'So kann das erste Jahr aussehen.', intro: t('Ein Betrieb startet mit dem KI-Check ({{preis_ki_check}}) und einem kleinen Pilot (ab {{preis_pilot_ab}}). Einmalig sind das ab {{einmalig_start}}. Läuft die Lösung danach im Betrieb, kommen ab {{preis_betrieb_ab}} dazu, plus die KI-Nutzung.') },
      body: [
        c.badge('Beispielrechnung mit Richtwerten'),
        c.trustJahresrechnung(),
      ].join('\n'),
    }),
    c.section({
      id: 'websites', tone: 'soft',
      head: { eyebrow: 'Websites', title: 'Websites zum Fixpreis.', intro: 'Den ersten Entwurf sehen Sie, bevor Sie etwas bezahlen.' },
      body: [
        c.priceCards([
          { id: 'entwurf', points: ['Entwurf in zwei Designs', 'unverbindlich'], button: { href: 'kontakt/?thema=website', label: 'Website-Entwurf anfragen' } },
          { id: 'website', featured: true, badge: 'Fixpreis', points: ['Design nach Mass, alle Seiten', 'Formular und Google-Grundlagen', 'Übergabe und Einführung'] },
          { id: 'pflege', points: ['Änderungen an Inhalten und Design', 'auf Ende jedes Monats kündbar'] },
        ]),
        c.preisHinweis(),
        `<p class="sec__foot">${c.more({ href: 'websites/#ablauf', label: 'So entsteht Ihre Website' })}</p>`,
      ].join('\n'),
    }),
    c.section({
      id: 'gut-zu-wissen',
      head: { eyebrow: 'Gut zu wissen', title: 'Zahlung und was nicht im Preis ist.' },
      body: `<div class="grid grid--2 preise-wissen">
        <div class="wissen" data-reveal><h3 class="t-h3">Zahlung</h3>${c.list([
          'KI-Check: Rechnung nach Erhalt des Berichts.',
          'Pilot, Einführung und Website: die Hälfte bei Auftrag, die Hälfte bei Übergabe, zahlbar innert 30 Tagen mit QR-Rechnung.',
          'Betrieb und Pflege: Rechnung pro Quartal im Voraus. Kündigen Sie, erstatte ich zu viel Bezahltes zurück.',
          t('Brechen Sie einen Auftrag ab, bezahlen Sie nur die geleistete Arbeit zum Stundenansatz von {{stundenansatz}}.'),
        ], { style: 'dot' })}</div>
        <div class="wissen" data-reveal><h3 class="t-h3">Nicht im Preis</h3>${c.list([
          'Lizenzen Ihrer Programme, zum Beispiel Microsoft 365 oder bexio',
          'KI-Nutzung nach Verbrauch',
          'Domain, Hosting und E-Mail der Website',
          'Gebühren von Meta für die WhatsApp Business Platform, falls genutzt',
          'Aufwand Ihres Software-Partners, zum Beispiel des Abacus-Partners, um eine Schnittstelle freizuschalten. Den Betrag klären wir im KI-Check.',
        ], { style: 'dot' })}<p class="wissen__mwst">${ctx.esc(ctx.site.preise.mwst)}</p></div>
      </div>`,
    }),
    c.section({
      id: 'fragen', tone: 'soft', width: 'text',
      head: { eyebrow: 'Fragen', title: 'Fragen zu den Preisen.' },
      body: c.faq([
        { id: 'richtwerte', q: 'Warum nennen Sie Richtwerte und keine festen Preise?', a: 'Jeder Betrieb ist anders: wie viele Abläufe, welche Programme, ob eine Schnittstelle da ist. Die Richtwerte zeigen den Rahmen. Den KI-Check gibt es zum Fixpreis. Danach erhalten Sie für den nächsten Schritt eine Offerte mit Fixpreis.' },
        { id: 'nutzung', q: 'Was kostet die KI-Nutzung genau?', a: t('Das hängt davon ab, wie viel Text verarbeitet wird und welches Modell passt. Typisch sind {{ki_nutzung}}. Ich rechne es im KI-Check für Ihren Fall aus. Läuft das Konto auf Ihren Namen, sehen Sie jede Rechnung des Anbieters selbst.') },
        { id: 'aufhoeren', q: 'Kann ich nach dem Pilot aufhören?', a: 'Ja. Nach jeder Stufe entscheiden Sie, ob es weitergeht. Reicht der Nutzen nicht, hören wir auf. Sie bezahlen nur, was bis dahin vereinbart war.' },
        { id: 'zahlung', q: 'Wie wird bezahlt?', a: 'Den KI-Check nach Erhalt des Berichts. Pilot, Einführung und Website zur Hälfte bei Auftrag und zur Hälfte bei Übergabe, mit QR-Rechnung. Betrieb und Pflege pro Quartal im Voraus, auf Ende jedes Monats kündbar.' },
        { id: 'mwst', q: 'Kommt Mehrwertsteuer dazu?', a: ctx.esc(ctx.site.preise.mwst) },
      ], { name: 'preise' }),
    }),
    c.ctaBand({
      title: 'Was kostet es in Ihrem Fall?',
      text: 'Im KI-Check erhalten Sie einen Fixpreis für den nächsten Schritt.',
      buttons: [
        { href: 'kontakt/?thema=ki-check', label: 'KI-Check anfragen' },
        { href: 'kontakt/?thema=website', label: 'Website-Entwurf anfragen', variant: 'secondary' },
      ],
    }),
  ].join('\n');
};
