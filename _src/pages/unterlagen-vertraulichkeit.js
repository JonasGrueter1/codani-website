'use strict';
// Muster Vertraulichkeitserklaerung (Testkunden Runde 2: Wortlaut vorab pruefen koennen). Gruppe: Vertrauens-Seiten.
// Text aendern: hier. Danach Build und PDF neu erzeugen (node studio/_src/unterlagen-pdf.js).

exports.meta = {
  path: 'unterlagen/vertraulichkeit/',
  nav: 'ki',
  css: ['vertrauen'],
  title: 'Muster Vertraulichkeitserklärung | {{marke}}',
  description: 'Lesen Sie die Vertraulichkeitserklärung, bevor Sie anfragen: was vertraulich ist, was ich damit tun darf, Löschung, Dauer und Unterschrift der Eltern.',
};

const STAND = 'November 2026';

exports.render = (ctx) => {
  const c = ctx.c;
  const s = ctx.site;
  const e = ctx.esc;
  const luecke = (l) => c.trustLuecke(l);
  const ich = `${e(s.person.name)}, ${s.kontakt.adresse ? e(s.kontakt.adresse) : e(s.marke.region)}<br>${e(s.kontakt.mail)}`;
  return [
    c.hero({
      crumbs: [{ label: 'KI', href: 'ki/' }, { label: 'Unterlagen', href: 'unterlagen/' }, { label: 'Vertraulichkeit' }],
      eyebrow: 'Muster',
      title: 'Vertraulichkeitserklärung.',
      lead: 'So lautet die Erklärung, die ich auf Wunsch vor dem ersten Gespräch unterschreibe. Eine Seite, ohne Kleingedrucktes.',
      buttons: [
        { href: 'assets/docs/muster-vertraulichkeit.pdf', label: 'Als PDF herunterladen' },
        { href: 'unterlagen/', label: 'Alle Unterlagen', variant: 'secondary' },
      ],
    }),
    c.section({
      id: 'dokument', tone: 'soft',
      label: 'Muster Vertraulichkeitserklärung',
      body: c.trustDokument({
        titel: 'Vertraulichkeitserklärung',
        art: 'Muster',
        stand: STAND,
        parteien: [
          ['Auftraggeber', `Firma, Adresse: ${luecke('Firma und Adresse des Auftraggebers')}`],
          ['Auftragnehmer', `${ich}<br>Minderjährig, vertreten durch die Eltern als gesetzliche Vertretung`],
        ],
        abschnitte: [
          ['Zweck', 'Wir klären, ob und wie KI in Ihrem Betrieb Arbeit abnehmen kann: Gespräch, KI-Check und Offerte. Die Erklärung gilt auch für einen späteren Auftrag, bis ein Vertrag etwas anderes regelt.'],
          ['Was vertraulich ist', 'Alles, was ich dabei über Ihren Betrieb erfahre, mündlich, schriftlich oder elektronisch: Kunden, Mandanten, Mieter, Mitarbeitende, Abläufe, Preise, Programme, Zugänge und Geschäftszahlen.'],
          ['Was ich damit tue', 'Ich behandle diese Informationen geheim und verwende sie nur für den Zweck oben. Ich gebe sie nicht an Dritte weiter, auch nicht an KI-Dienste oder meine Entwicklungswerkzeuge. Ich schütze sie mindestens so gut wie meine eigenen und mache keine Kopien, die ich dafür nicht brauche.'],
          ['Ausnahmen', 'Nicht vertraulich ist, was öffentlich bekannt ist oder was ich nachweislich schon vorher wusste. Muss ich etwas von Gesetzes wegen offenlegen, sage ich es Ihnen vorher, soweit das erlaubt ist.'],
          ['Rückgabe und Löschung', 'Auf Ihren Wunsch, spätestens am Ende der Zusammenarbeit, gebe ich Ihre Unterlagen zurück oder lösche sie. Das bestätige ich Ihnen schriftlich.'],
          ['Dauer', 'Die Pflicht gilt ab der Unterschrift und auch nach dem Ende der Zusammenarbeit, ohne zeitliche Grenze.'],
          ['Recht', 'Es gilt Schweizer Recht. Gerichtsstand ist am Sitz des Auftraggebers.'],
        ],
        unterschriften: { kunde: 'Auftraggeber' },
      }),
    }),
    c.section({
      id: 'hinweis',
      label: 'Hinweis zum Muster',
      body: `<div class="grid grid--2">
        ${c.info({ icon: 'dokument', tone: 'warm', title: 'Ein Muster, kein Rechtsrat', text: 'Verbindlich ist die Fassung, die wir beide unterschreiben. Zeigen Sie das Muster gerne Ihrer Fachperson oder Ihrem Verband. Wünsche zum Wortlaut übernehme ich, wo es geht.' })}
        ${c.info({ icon: 'person', tone: 'tint', title: 'Warum meine Eltern mitunterschreiben', text: ctx.t('Ich bin {{alter}} und damit minderjährig. Damit die Erklärung gültig ist, geben meine Eltern als gesetzliche Vertretung ihr Einverständnis.') })}
      </div>`,
    }),
    c.ctaBand({
      title: 'Möchten Sie die Erklärung vor dem Gespräch?',
      text: 'Schreiben Sie es in Ihre Anfrage. Ich schicke sie Ihnen unterschrieben, bevor wir über Ihren Betrieb sprechen.',
      buttons: [{ href: 'kontakt/?thema=ki-check', label: 'KI-Check anfragen' }],
    }),
  ].join('\n');
};
