'use strict';
// Websites (V4-KONZEPT 4, V4-TEXTE 10). Eigener Apple-Stil. Gruppe: Websites und Referenzen.

exports.meta = {
  path: 'websites/',
  nav: 'websites',
  css: ['websites'],
  js: ['websites'],
  title: 'Websites für KMU | {{marke}}',
  description: 'Moderne Websites für KMU: kostenloser Entwurf vorab, Fixpreis ab {{preis_website_ab}}, auf jedem Handy schnell und klar. Aus der {{region_kurz}}.',
};

const FAQ = [
  { id: 'kosten', q: 'Was kostet eine neue Website?', a: 'Ab {{preis_website_ab}}. Den genauen Preis stellen Sie in der Online-Wunschliste selbst zusammen: Seiten und Funktionen wählen, der Preis rechnet sofort mit. Danach erhalten Sie eine Fixpreis-Offerte, und der Preis bleibt fest. Der erste Entwurf ist kostenlos, Mehrwertsteuer kommt keine dazu.' },
  { id: 'dauer', q: 'Wie lange dauert es?', a: 'Den Termin für den Entwurf vereinbaren wir im ersten Gespräch. Für die fertige Website rechne ich mit {{dauer_website}}, je nach Umfang und inklusive Ihrer Prüfzeiten. Weil ich neben der Lehre arbeite, plane ich lieber realistisch als knapp. Den Zielmonat sehen Sie in der Offerte.' },
  { id: 'entwurf', q: 'Was passiert, wenn mir der Entwurf nicht gefällt?', a: 'Dann sagen Sie es mir einfach. Der Entwurf ist kostenlos und unverbindlich. Im Auftrag sind zwei Korrekturrunden enthalten, und was nicht der Offerte entspricht, behebe ich vor der Abnahme kostenlos. Steigen Sie vorher aus, bezahlen Sie nur die bis dahin geleistete Arbeit.' },
  { id: 'aendern', q: 'Kann ich die Website später selber ändern?', a: 'Ja, wenn Sie das möchten. Mit WordPress ändern Sie Texte, Preise und Fotos selbst im Browser, und ich zeige Ihnen bei der Übergabe, wie es geht. WordPress braucht regelmässige Updates, wer sie macht, steht in der Offerte. Ohne WordPress übernehme ich Änderungen für Sie, im Pflegepaket oder nach Aufwand.' },
  { id: 'hosting', q: 'Wer kümmert sich um Hosting, Domain und E-Mail?', a: 'Haben Sie schon einen Anbieter oder Webmaster, bleibt alles dort, und ich übergebe die fertige Website. Haben Sie noch nichts, richte ich Domain und Hosting mit Ihnen ein. Die laufenden Kosten bezahlen Sie direkt dem Anbieter, sie sind nicht im Fixpreis enthalten. An Ihren E-Mail-Einstellungen ändere ich nichts.' },
  { id: 'betreuung', q: 'Betreuen Sie die Website auch nach der Übergabe?', a: 'Ja. Fehler an meiner Arbeit, die Sie innert 30 Tagen nach der Abnahme melden, behebe ich kostenlos. Danach können Sie das Pflegepaket wählen: {{preis_pflege_web}} für Änderungen, auf Ende jedes Monats kündbar. Oder Sie melden sich, wenn Sie etwas brauchen, und ich sage Ihnen vorher, wie viele Stunden es braucht.' },
  { id: 'eigentum', q: 'Gehört mir die Website?', a: 'Ja. Mit der vollständigen Bezahlung erhalten Sie das unbeschränkte Recht, die Website zu nutzen, zu ändern und weiterzuentwickeln, auch durch Ihren Webmaster. Sie erhalten alle Dateien. Fremdbausteine wie Schriften oder WordPress gelten unter ihren eigenen Lizenzen.' },
  { id: 'google', q: 'Werde ich bei Google gefunden?', a: 'Ich richte die Grundlagen sauber ein: Seitentitel, Beschreibungen, Struktur und schnelle Ladezeit. Eine bestimmte Platzierung kann niemand ehrlich versprechen. Gute Inhalte und ein gepflegtes Google-Unternehmensprofil helfen zusätzlich.' },
  { id: 'datenschutz', q: 'Wie steht es um den Datenschutz?', a: 'Ich setze so wenige fremde Dienste wie möglich ein, ohne Tracking, wenn Sie es nicht ausdrücklich wünschen. Impressum und Datenschutzerklärung baue ich ein. Die Texte liefern Sie oder geben sie frei, eine rechtliche Prüfung mache ich nicht.' },
  { id: 'alter', q: 'Wie ist der Auftrag abgesichert?', a: 'Alles ist schriftlich geregelt: Preis, Umfang, Zeitplan und Zahlung stehen in der Offerte. Weil ich noch nicht volljährig bin, unterschreiben meine Eltern den Auftrag als gesetzliche Vertretung mit, damit ist er voll gültig. Den Entwurf sehen Sie, bevor Sie etwas bezahlen, und die zweite Hälfte des Preises bezahlen Sie erst bei der Übergabe.' },
];

const ZUSAGEN = [
  ['Kostenloser Entwurf vorab.', 'Sie sehen Ihre neue Website, bevor Sie etwas bezahlen.'],
  ['Fixpreis statt Stundenrechnung.', 'Der Preis bleibt fest, auch wenn ich länger brauche.'],
  ['Persönlich betreut.', 'Vom ersten Gespräch bis nach der Übergabe haben Sie einen Ansprechpartner.'],
];

// Ablauf (V4-TEXTE 10.4) in der Dreiteilung Sie, Ich, Dauer
const ABLAUF = [
  { title: 'Kostenloser Entwurf', parts: [['Sie', 'Erzählen mir per Formular oder Mail kurz von Ihrem Betrieb.'], ['Ich', 'Baue einen ersten Entwurf in zwei Designs zur Auswahl.'], ['Kosten', 'Keine. Der Entwurf ist kostenlos und unverbindlich.']] },
  { title: 'Fixpreis-Offerte', decide: true, parts: [['Sie', 'Wählen in einer Online-Wunschliste Design, Seiten und Funktionen. Der Preis rechnet sofort mit.'], ['Ich', 'Schreibe Ihnen eine Offerte mit festem Preis, Umfang und Zielmonat.'], ['Dauer', 'Die Offerte gilt 30 Tage. Sie entscheiden in Ruhe.']] },
  { title: 'Umsetzung', parts: [['Sie', 'Liefern Texte, Preise und Fotos. Zwei Korrekturrunden sind enthalten.'], ['Ich', 'Baue alle Seiten, prüfe sie auf Handy, Tablet und Computer und richte Formular und Google-Grundlagen ein.'], ['Dauer', '{{dauer_website}}, je nach Umfang und inklusive Ihrer Prüfzeiten.']] },
  { title: 'Übergabe', parts: [['Sie', 'Prüfen die Website über einen Testlink und geben sie frei.'], ['Ich', 'Schalte sie auf oder übergebe sie Ihrem Webmaster und zeige Ihnen, wie alles funktioniert.'], ['Dauer', 'Für Ihre Prüfung haben Sie 10 Arbeitstage.']] },
  { title: 'Betreuung', parts: [['Sie', 'Melden sich, wenn etwas nicht stimmt oder Sie etwas ändern möchten.'], ['Ich', 'Behebe Fehler an meiner Arbeit, die Sie innert 30 Tagen melden, kostenlos.'], ['Danach', 'Auf Wunsch Pflegepaket ab {{preis_pflege_web}}.']] },
];

/** Preise (V4-TEXTE 10.5): grosse Karte Website, daneben Entwurf und Pflegepaket. Betraege aus site.json */
function preise(ctx) {
  const c = ctx.c;
  const teil = (id) => ctx.fmt.preisTeile(ctx.preis(id));
  const w = teil('website');
  const pf = teil('pflege');
  const pflege = ctx.preis('pflege');
  return `<div class="wpreis">
    <div class="wpreis__main" data-reveal>
      <p class="wpreis__name">Website</p>
      <p class="wpreis__amount"><span class="wpreis__pre">${w.vor}</span> <span class="wpreis__chf">${ctx.esc(w.betrag)}</span></p>
      <p class="wpreis__text">Fixpreis nach Ihrer Wunschliste. Der Preis bleibt fest, auch wenn ich länger brauche.</p>
      <div class="wpreis__cols">
        <div><h3 class="wpreis__h">Enthalten</h3>${c.list(['Design nach Mass', 'alle Seiten handyoptimiert', 'Kontaktformular', 'Google-Grundlagen', 'Impressum und Datenschutzerklärung eingebaut (die Texte liefern Sie oder geben sie frei)', 'Aufschaltung und Einführung'], { style: 'check' })}</div>
        <div><h3 class="wpreis__h">Nicht enthalten</h3>${c.list(['Domain, Hosting und E-Mail (bezahlen Sie direkt dem Anbieter)', 'Fotos von Fotografen', 'rechtliche Prüfung'], { style: 'dot' })}</div>
      </div>
      ${c.btns([{ href: 'kontakt/?thema=website', label: 'Kostenlosen Entwurf anfragen' }])}
    </div>
    <div class="wpreis__side">
      <div class="wpreis__card" data-reveal>
        <p class="wpreis__name">Erster Entwurf</p>
        <p class="wpreis__amount wpreis__amount--s"><span class="wpreis__chf">${ctx.esc(teil('entwurf').betrag)}</span></p>
        <p class="wpreis__text">Zwei Designs zur Auswahl, unverbindlich.</p>
      </div>
      <div class="wpreis__card" data-reveal>
        <p class="wpreis__name">${ctx.esc(pflege.name)}</p>
        <p class="wpreis__amount wpreis__amount--s"><span class="wpreis__pre">${pf.vor}</span> <span class="wpreis__chf">${ctx.esc(pf.betrag)}</span> <span class="wpreis__pre">${pf.einheit}</span></p>
        <p class="wpreis__text">${ctx.esc(pflege.text ? pflege.text.charAt(0).toUpperCase() + pflege.text.slice(1) : '')} für Änderungen. Auf Ende jedes Monats kündbar.</p>
      </div>
    </div>
  </div>`;
}

exports.render = (ctx) => {
  const c = ctx.c;
  const t = ctx.t;
  return [
    c.hero({
      variant: 'statement',
      cls: 'whero',
      eyebrow: 'Websites',
      title: 'Ihre neue Website. Zuerst sehen, dann entscheiden.',
      lead: t('Sie erhalten einen kostenlosen Entwurf, bevor Sie etwas bezahlen. Gefällt er Ihnen, gilt ein Fixpreis ab {{preis_website_ab}}.'),
      buttons: [
        { href: 'kontakt/?thema=website', label: 'Kostenlosen Entwurf anfragen' },
        { href: '#ablauf', label: 'Ablauf ansehen', variant: 'secondary' },
      ],
      media: `<div class="whero__media">${c.webDuo('schreinerei-a', { eager: true, cls: 'dev-duo--hero', sizes: '(min-width: 1100px) 860px, 80vw' })}${c.badge('muster', { cls: 'whero__badge' })}</div>`,
    }),
    c.section({
      id: 'zusagen',
      label: 'Drei Zusagen',
      cls: 'wzusagen-sec',
      body: `<ul class="wzusagen">${ZUSAGEN.map(([h, p]) => `<li data-reveal><h2 class="wzusagen__h">${h}</h2><p>${p}</p></li>`).join('')}</ul>`,
    }),
    c.section({
      id: 'eigenschaften', tone: 'soft',
      head: { eyebrow: 'Was drin ist', title: 'Alles, was eine gute Website braucht.', intro: 'Gebaut für Ihre Kundinnen und Kunden: schnell, klar und auf jedem Gerät lesbar.' },
      body: c.webBento(),
    }),
    c.section({
      id: 'ablauf',
      head: { eyebrow: 'Ablauf', title: 'In fünf Schritten zur neuen Website.', intro: 'Sie wissen jederzeit, was Sie tun, was ich tue und wie lange es dauert.' },
      body: c.webAblauf(ABLAUF.map((s) => ({ ...s, parts: s.parts.map(([k, v]) => [k, t(v)]) }))),
    }),
    c.section({
      id: 'beispiele', tone: 'stage',
      head: { eyebrow: 'Musterbeispiele', title: 'So kann Ihre Website aussehen.', intro: 'Drei Musterbeispiele für Aufbau und Stil. Die Betriebe sind erfunden.' },
      body: [
        c.webGalerie(['fahrschule', 'schreinerei-a', 'treuhand']),
        `<p class="sec__foot">${c.more({ href: 'referenzen/#websites', label: 'Mehr auf Referenzen' })}</p>`,
      ].join('\n'),
    }),
    c.section({
      id: 'preise',
      head: { eyebrow: 'Preise', title: 'Was eine Website kostet.' },
      body: [
        preise(ctx),
        c.preisHinweis(),
        `<p class="sec__foot wpreis__more">${c.more({ href: 'preise/#websites', label: 'Alle Preise' })}</p>`,
      ].join('\n'),
    }),
    c.section({
      id: 'ki-verbinden', tone: 'tint',
      label: 'Website und KI verbinden',
      body: `<div class="web-band" data-reveal><span class="web-band__icon">${c.icon('kunden')}</span><div><h2 class="t-h3">Website und KI verbinden.</h2><p>Anfragen von Ihrer Website landen direkt in der Liste mit allen anderen Anfragen.</p></div>${c.more({ href: 'ki/kunden/', label: 'Anfragen in einer Liste' })}</div>`,
    }),
    c.section({
      id: 'fragen', tone: 'soft',
      head: { eyebrow: 'Häufige Fragen', title: 'Fragen zu Websites, ehrlich beantwortet.' },
      body: c.faq(FAQ.map((f) => ({ ...f, q: t(f.q), a: t(f.a) })), { name: 'faq-web' }),
    }),
    c.ctaBand({
      title: 'Sehen Sie Ihre neue Website, bevor Sie sich entscheiden.',
      text: 'Der erste Entwurf ist kostenlos und unverbindlich.',
      buttons: [{ href: 'kontakt/?thema=website', label: 'Kostenlosen Entwurf anfragen' }],
    }),
  ].join('\n');
};
