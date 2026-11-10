'use strict';
// Ueber mich (V4-KONZEPT 2.10, V4-TEXTE 18). Gruppe: Vertrauens-Seiten.
// Ohne Foto und ohne Platzhalterbild (Jonas hat noch kein professionelles). Lehrbetrieb nie beim Namen nennen.
// Zeitleiste: nur belegte Eintraege, keine geratenen Jahreszahlen (Zeitraum der Fallstudie aus site.json).

const { mark } = require('../lib/marke');

exports.meta = {
  path: 'ueber-mich/',
  nav: 'ueber-mich',
  css: ['vertrauen'],
  title: 'Über mich | {{marke}}',
  description: 'Jonas Grüter, Gründer von {{marke}} in der {{region_kurz}}: KI-Lösungen und Websites für KMU. Werdegang, Arbeitsweise, Erreichbarkeit und Ziel.',
};

exports.render = (ctx) => {
  const c = ctx.c;
  const t = ctx.t;
  const e = ctx.esc;
  const p = ctx.site.person;
  const steckbrief = `<div class="steckbrief" data-reveal>
    <p class="steckbrief__name">${mark()}${e(p.name)}</p>
    <ul class="steckbrief__liste" aria-label="Kurzfakten">
      <li><span>Funktion</span><span>Gründer und Inhaber</span></li>
      <li><span>Schwerpunkt</span><span>KI für Büroabläufe, Websites</span></li>
      <li><span>Region</span><span>${e(ctx.site.marke.region)}</span></li>
      <li><span>Hintergrund</span><span>kaufmännisch und technisch</span></li>
      <li><span>Antwort</span><span>${e(ctx.site.support.reaktionszeit)}</span></li>
    </ul>
  </div>`;
  return [
    c.hero({
      variant: 'type',
      eyebrow: 'Über mich',
      title: t('Jonas Grüter, Gründer von {{marke}}.'),
      lead: t('Ich baue KI-Lösungen und Websites für KMU in der {{gebiet}}. Kaufmännisch ausgebildet, technisch zuhause: Ich kenne den Büroalltag und baue die Werkzeuge, die ihn leichter machen.'),
      media: steckbrief,
    }),
    c.section({
      id: 'werdegang',
      head: { eyebrow: 'Werdegang', title: 'Aus dem Büroalltag, mit dem Werkzeug von heute.' },
      body: `<div class="grid grid--split werdegang">
        <div data-reveal>
          <p class="t-lead">Meine kaufmännische Ausbildung mache ich bei einer grossen Versicherung. Dort erlebe ich jeden Tag, wie ein Unternehmen arbeitet: Abläufe, Kundenanliegen, Zahlen und Datenschutz. Mit Codani baue ich die Lösungen, die genau diese Arbeit erleichtern.</p>
          <p>${t('Für meine eigene Kundensuche habe ich einen Workflow mit KI-Agenten gebaut. Er hat {{ref_analysiert}} Betriebe analysiert und {{ref_demos}} Website-Demos gebaut. Jede Mail habe ich selbst geprüft und freigegeben.')} Die Zahlen stehen bei den <a class="text-link" href="${ctx.url('referenzen/')}">Referenzen</a>.</p>
        </div>
        ${c.trustZeitleiste([
          { when: 'Ausbildung', title: 'Kaufmännische Ausbildung', text: 'Bei einer grossen Versicherung: Abläufe, Kunden, Zahlen, Datenschutz.' },
          { when: 'Herbst 2026', title: 'KI-Workflow für die eigene Kundensuche', text: t('{{ref_analysiert}} Betriebe analysiert, {{ref_demos}} Website-Demos gebaut. Jede Mail selbst geprüft.') },
          { when: 'Jetzt', title: 'KI-Lösungen und Websites für KMU', text: 'KI-Check, Pilot und Betrieb für Büroabläufe. Websites zum Fixpreis.', now: true },
          { when: 'Ziel', title: 'Eine Software-Firma für KMU', text: t('Kleine, verständliche KI-Lösungen für Betriebe in der {{gebiet}}.'), ziel: true },
        ])}
      </div>`,
    }),
    c.section({
      id: 'erreichbarkeit', tone: 'soft',
      head: { eyebrow: 'Erreichbarkeit', title: 'Wann Sie mich erreichen.' },
      body: `<div class="grid grid--split erreichbar">
        <div data-reveal><p class="t-lead">${t('Mails beantworte ich {{reaktionszeit}}, meistens am Abend. Gespräche sind am frühen Abend, am Wochenende oder nach Absprache möglich.')}</p><p>Tagsüber bin ich in meiner Ausbildung. Abwesenheiten melde ich laufenden Kunden im Voraus.</p><p>${c.more({ href: 'support/', label: 'Betrieb und Support' })}</p></div>
        <div>${c.trustTag()}</div>
      </div>`,
    }),
    c.section({
      id: 'werte',
      head: { eyebrow: 'Wie ich arbeite', title: 'Fünf Dinge, auf die Sie zählen können.' },
      body: c.cards([
        { eyebrow: '01', title: 'Klar.', text: 'Ich sage, was KI kann und was nicht. Lohnt sich etwas nicht, sage ich das auch.' },
        { eyebrow: '02', title: 'Schriftlich.', text: 'Preis, Umfang, Zeitplan und Datenschutz stehen in der Offerte.' },
        { eyebrow: '03', title: 'Verständlich.', text: 'Keine Fachsprache, keine Überraschungen auf der Rechnung.' },
        { eyebrow: '04', title: 'Sorgfältig mit Daten.', text: 'So wenig wie nötig, so geschützt wie möglich.', href: 'sicherheit/', linkLabel: 'Datenschutz und Sicherheit' },
        { eyebrow: '05', title: 'Ihre Lösung.', text: 'Code und Dokumentation gehören Ihnen.', href: 'support/#eigentum', linkLabel: 'Was Ihnen gehört' },
      ], { cols: 3, cls: 'werte' }),
    }),
    c.section({
      id: 'ziel', tone: 'warm', width: 'text',
      label: 'Ziel',
      body: c.principle('Mein Ziel ist eine Software-Firma für KMU in der Zentralschweiz: kleine, verständliche KI-Lösungen, die im Alltag wirklich helfen.', { sub: 'Ich nehme nur so viele Projekte an, wie ich sauber betreuen kann.' }),
    }),
    c.section({
      id: 'technik',
      head: { eyebrow: 'Werkzeuge', title: 'Womit ich arbeite.' },
      body: c.cards([
        { title: 'HTML, CSS und JavaScript', text: 'Die Grundbausteine jeder Website. Ich schreibe den Code selbst, darum bleibt Ihre Seite schlank.' },
        { title: 'WordPress', text: 'Für alle, die Inhalte selber ändern möchten.' },
        { title: 'KI-Modelle und KI-Agenten', text: 'Programme, die lesen, schreiben, sortieren und Teilaufgaben selbständig erledigen.' },
        { title: 'Node.js und Python', text: 'Kleine Programme, die Abläufe selbständig erledigen.' },
        { title: 'Automatische Tests', text: 'Ein Testprogramm öffnet jede Seite wie ein Besucher auf Handy und Computer und meldet Fehler.' },
        { title: 'Three.js und WebGL', text: '3D-Grafik direkt im Browser, wie auf der Startseite.' },
      ], { cols: 3, cls: 'cards--soft' }),
    }),
    c.section({
      id: 'alter', tone: 'soft', width: 'text',
      head: { eyebrow: 'Verträge', title: 'Schriftlich geregelt, voll gültig.' },
      body: '<p class="t-lead" data-reveal>Jeder Auftrag beginnt mit einer schriftlichen Offerte: Preis, Umfang, Zeitplan und Datenschutz stehen drin.</p><p data-reveal>Weil ich noch nicht volljährig bin, unterschreiben meine Eltern jeden Auftrag als gesetzliche Vertretung mit. Damit ist er voll gültig.</p>' + [ctx.site.firma.form, ctx.site.firma.haftpflicht].filter(Boolean).map((x) => `<p data-reveal>${e(x)}</p>`).join('') + `<p data-reveal>${c.more({ href: 'support/#haftung', label: 'Gewährleistung und Haftung' })}</p>`,
    }),
    c.kontaktBlock(),
  ].join('\n');
};
