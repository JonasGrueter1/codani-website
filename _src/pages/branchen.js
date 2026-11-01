'use strict';
// Branchen-Uebersicht (V4-KONZEPT 2.4, kurz). Gruppe: KI-Seiten.

exports.meta = {
  path: 'branchen/',
  nav: 'ki',
  css: ['ki'],
  title: 'KI in Ihrer Branche | {{marke}}',
  description: 'Beispiele in Bildern für Handwerk, Treuhand und Büro sowie Verwaltung: Wie KI Offerten, Buchungen und Antworten vorbereitet. Sie entscheiden.',
};

exports.render = (ctx) => {
  const c = ctx.c;
  return [
    c.hero({
      crumbs: [{ label: 'KI', href: 'ki/' }, { label: 'Branchen' }],
      eyebrow: 'Branchen',
      title: 'KI in Ihrer Branche.',
      lead: 'Drei Beispiele in Bildern, Schritt für Schritt. Alle mit erfundenen Daten. Ein Mensch prüft und entscheidet immer.',
    }),
    c.section({
      id: 'beispiele',
      head: { eyebrow: 'Beispiele', title: 'Drei Branchen, drei Abläufe.' },
      body: [
        c.kiBranchenKarten({ cols: 3 }),
        `<div class="sec__foot">${c.info({ icon: 'funke', title: 'Ihre Branche fehlt?', text: 'Die Werkzeuge passen in fast jeden Betrieb: Mails, Termine, Dokumente und Anfragen gibt es überall.', link: { href: 'ki/', label: 'Zur KI-Übersicht' } })}</div>`,
      ].join('\n'),
    }),
    c.kontaktBlock(),
  ].join('\n');
};
