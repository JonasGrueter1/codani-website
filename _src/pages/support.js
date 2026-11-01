'use strict';
// Betrieb und Support (V4-KONZEPT 2.9, V4-TEXTE 15). Gruppe: Vertrauens-Seiten.
// Ehrlich: Jonas arbeitet allein und ist in der Lehre, keine erfundene Stellvertretung.

exports.meta = {
  path: 'support/',
  nav: 'ki',
  css: ['vertrauen'],
  title: 'Betrieb und Support | {{marke}}',
  description: 'Reaktionszeit, was bei einem Ausfall passiert, Dokumentation und Übergabe. Lösung und Code gehören Ihnen, Ihr IT-Partner kann jederzeit übernehmen.',
};

exports.render = (ctx) => {
  const c = ctx.c;
  const t = ctx.t;
  return [
    c.hero({
      crumbs: [{ label: 'KI', href: 'ki/' }, { label: 'Betrieb und Support' }],
      eyebrow: 'Support',
      title: 'Betrieb und Support: Was passiert, wenn etwas nicht läuft.',
      lead: 'Wer hilft, wie schnell, und was Ihnen gehört. Ehrlich beantwortet.',
    }),
    c.section({
      id: 'reaktionszeit',
      head: { eyebrow: 'Erreichbarkeit', title: 'Reaktionszeit.' },
      body: `<div class="grid grid--2">
        <div class="support-zahl" data-reveal>${c.icon('uhr', { cls: 'support-zahl__ico' })}<p class="support-zahl__wert">${ctx.esc(ctx.site.support.reaktionszeit)}</p><p>${t('Ich antworte {{reaktionszeit}}, Montag bis Freitag.')}</p></div>
        <div class="support-zahl support-zahl--warm" data-reveal>${c.icon('person', { cls: 'support-zahl__ico' })}<p class="support-zahl__wert">Meistens am Abend</p><p>Tagsüber bin ich in der Lehre oder in der Berufsschule. ${t('{{dringend_text}}')} Bis dahin schalten Sie die KI mit dem Schalter ab, Ihr Betrieb läuft von Hand weiter.</p></div>
      </div>`,
    }),
    c.section({
      id: 'ausfall', tone: 'soft',
      head: { eyebrow: 'Ausfall', title: 'Wenn die KI ausfällt, läuft Ihr Betrieb weiter.', intro: 'Die KI liefert nur Entwürfe. Ihre Mails, Termine und Dokumente bleiben in Ihren Programmen. Jede Lösung hat einen Schalter, mit dem Sie sie selbst abschalten.' },
      body: [
        c.trustAbschalter(),
        '<h3 class="t-h3 ausfall__h">So läuft ein Ausfall ab.</h3>',
        c.steps([
          { title: 'Abschalten', text: 'Sie schalten die KI ab, oder ich erhalte automatisch eine Fehlermeldung.', decide: true },
          { title: 'Von Hand weiter', text: 'Ihr Team arbeitet von Hand weiter, wie vor der KI.' },
          { title: 'Beheben', text: 'Ich suche den Fehler und melde mich mit Ursache und Lösung.' },
        ], { decideLabel: 'Sie entscheiden' }),
      ].join('\n'),
    }),
    c.section({
      id: 'abwesend',
      head: { eyebrow: 'Ehrlich gesagt', title: 'Wenn ich nicht erreichbar bin.' },
      body: `<div class="grid grid--2 abwesend">
        <div data-reveal>${ctx.site.support.stellvertretung
          ? `<p class="t-lead">Ich arbeite allein. Für Ausfälle habe ich eine schriftliche Vereinbarung: ${ctx.esc(ctx.site.support.stellvertretung)} hat Zugriff auf Code und Betriebshandbuch und springt ein, wenn ich nicht erreichbar bin.</p>`
          : '<p class="t-lead">Ich arbeite allein, eine Stellvertretung gibt es heute nicht. Ferien und Prüfungszeiten melde ich Ihnen im Voraus. In dieser Zeit läuft die Lösung weiter oder bleibt abgeschaltet, bis ich zurück bin. Ihr Betrieb hängt nie davon ab, weil alles auch von Hand geht.</p>'}
        <p>Haben Sie keinen IT-Partner, ist das Betriebshandbuch so geschrieben, dass ein IT-Betrieb Ihrer Wahl die Lösung ohne mich weiterführen kann.</p></div>
        ${c.info({ icon: 'person', tone: 'warm', title: 'Darum baue ich so', text: 'Ich arbeite allein und mache eine Lehre. Darum baue ich jede Lösung so, dass sie abschaltbar ist, dokumentiert ist und von Ihrem IT-Partner übernommen werden kann.' })}
      </div>`,
    }),
    c.section({
      id: 'dokumentation', tone: 'tint',
      head: { eyebrow: 'Übergabe', title: 'Dokumentation und Übergabe.' },
      body: `<div class="grid grid--split doku">
        <div data-reveal><p class="t-lead">Sie erhalten eine Kurzanleitung für Ihr Team und eine technische Dokumentation: welche Programme verbunden sind, welche Zugänge es gibt, wie man die Lösung abschaltet und wieder startet.</p><p>Bei der Einführung zeige ich Ihrem Team in einer kurzen Schulung, wie es mit den Entwürfen arbeitet.</p><p>${c.more({ href: 'unterlagen/', label: 'Muster-Verträge und weitere Unterlagen' })}</p></div>
        ${c.trustHandbuch()}
      </div>`,
    }),
    c.section({
      id: 'eigentum', tone: 'warm',
      head: { eyebrow: 'Eigentum', title: 'Lösung und Code gehören Ihnen.' },
      body: `<div class="grid grid--2 eigentum">
        <div>${c.principle('Mit der vollständigen Bezahlung erhalten Sie den Quellcode und das unbeschränkte Recht, ihn zu nutzen, zu ändern und weiterzugeben.', { sub: 'Das KI-Konto läuft am besten auf Ihren Namen. Fremdbausteine gelten unter ihren eigenen Lizenzen.' })}</div>
        <div class="partner" data-reveal>
          <h3 class="t-h3">Ihr IT-Partner kann übernehmen.</h3>
          <p>Haben Sie einen IT-Partner, beziehe ich ihn von Anfang an ein. Er erhält Code und Dokumentation und kann die Lösung jederzeit selbst weiterführen. Sie sind nicht von mir abhängig.</p>
          ${c.list(['Quellcode', 'Dokumentation und Betriebshandbuch', 'Konten und Zugänge auf Ihren Betrieb'], { style: 'check', cls: 'partner__list' })}
        </div>
      </div>`,
    }),
    c.section({
      id: 'haftung', tone: 'soft',
      head: { eyebrow: 'Gewährleistung und Haftung', title: 'Wenn an meiner Arbeit etwas nicht stimmt.' },
      body: `<div class="grid grid--2 haftung">
        <div class="wissen" data-reveal><h3 class="t-h3">Gewährleistung</h3><p>${t('Fehler an meiner Arbeit, die Sie innert {{gewaehrleistung_tage}} Tagen nach der Einführung oder nach der Abnahme einer Website melden, behebe ich kostenlos. Das gilt für KI-Lösungen und Websites.')}</p><p>Nicht dazu gehören Änderungen an Programmen anderer Anbieter, etwa wenn ein Programm seine Schnittstelle ändert. Das deckt der Betrieb ab.</p></div>
        <div class="wissen" data-reveal><h3 class="t-h3">Haftung</h3><p>${t('{{haftung_text}}')}</p>${[ctx.site.firma.form, ctx.site.firma.haftpflicht].filter(Boolean).map((x) => `<p>${ctx.esc(x)}</p>`).join('')}<p>KI kann sich irren. Darum gibt ein Mensch jeden Entwurf frei, bevor er Ihren Betrieb verlässt.</p></div>
      </div>
      <div class="risiko" data-reveal>
        <h3 class="t-h3">Warum das Risiko klein bleibt.</h3>
        ${c.list([
          '<strong>Wenig Rechte.</strong> Die Lösung darf nur, was sie braucht, oft nur Lesen und Entwürfe anlegen. Antworten an Ihre Kunden sendet sie nie selbst.',
          '<strong>Ihre Daten bleiben bei Ihnen.</strong> In Ihren Programmen und Ihrem Konto, nicht auf meinen Geräten.',
          '<strong>Ein Mensch gibt frei.</strong> Kein Entwurf verlässt Ihren Betrieb ohne Freigabe.',
          '<strong>Ein Schalter.</strong> Sie stoppen die Lösung jederzeit selbst, Ihr Betrieb läuft von Hand weiter.',
        ], { style: 'check', cls: 'risiko__liste' })}
      </div>`,
    }),
    c.section({
      id: 'kosten',
      head: { eyebrow: 'Kosten', title: 'Kosten im Betrieb.' },
      body: `<div class="grid grid--split kosten-betrieb">
        <div data-reveal>
          <p class="t-lead">${t('KI-Lösungen: ab {{preis_betrieb_ab}} plus KI-Nutzung nach Verbrauch, typisch {{ki_nutzung}}. Enthalten sind Überwachung, Anpassungen, wenn ein Programm seine Schnittstelle ändert, und Antworten auf Ihre Fragen. Websites: Pflegepaket ab {{preis_pflege_web}}. Beides auf Ende jedes Monats kündbar.')}</p>
          <p>${c.more({ href: 'support/#haftung', label: 'Gewährleistung und Haftung' })}</p>
        </div>
        <div>${c.priceStrip(['betrieb', 'nutzung', 'pflege'], { link: false })}<p class="pstrip__more">${c.more({ href: 'preise/#ki', label: 'Alle Preise' })}</p></div>
      </div>`,
    }),
    c.kontaktBlock({
      buttons: [
        { href: 'kontakt/?thema=support', label: 'Frage zum Support stellen' },
        { href: 'kontakt/?thema=ki-check', label: 'KI-Check anfragen', variant: 'secondary' },
      ],
    }),
  ].join('\n');
};
