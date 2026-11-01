'use strict';
// Unterlagen zum Ansehen vor der ersten Anfrage (Testkunden Runde 2). Gruppe: Vertrauens-Seiten.

exports.meta = {
  path: 'unterlagen/',
  nav: 'ki',
  css: ['vertrauen'],
  title: 'Unterlagen und Muster-Verträge | {{marke}}',
  description: 'Vertraulichkeitserklärung, Vertrag zur Auftragsbearbeitung, Beispielbericht und Betriebshandbuch: alles lesen, bevor Sie mir schreiben.',
};

exports.render = (ctx) => {
  const c = ctx.c;
  const e = ctx.esc;
  const DOCS = [
    { icon: 'dokument', titel: 'Vertraulichkeitserklärung', art: 'Muster, 1 Seite', text: 'Unterschreibe ich auf Wunsch vor dem ersten Gespräch. Was vertraulich ist, was ich damit tun darf, Löschung und Dauer.', href: 'unterlagen/vertraulichkeit/', pdf: 'assets/docs/muster-vertraulichkeit.pdf' },
    { icon: 'schild', titel: 'Vertrag zur Auftragsbearbeitung', art: 'Muster, 2 Seiten', text: 'Unterschreiben wir vor dem Pilot. Zweck, Datenort, Unterauftragsbearbeiter, Datensicherheit, Meldung bei Vorfällen, Löschung.', href: 'unterlagen/auftragsbearbeitung/', pdf: 'assets/docs/muster-auftragsbearbeitung.pdf' },
    { icon: 'liste', titel: 'Bericht zum KI-Check', art: 'Beispiel mit erfundenen Daten', text: 'So sieht das Ergebnis des KI-Checks aus: bewertete Abläufe, Datenschutz, Empfehlung mit Fixpreis für den Pilot.', href: 'preise/#bericht' },
    { icon: 'buch', titel: 'Betriebshandbuch', art: 'Inhaltsverzeichnis', text: 'Was Ihr Team und Ihr IT-Partner bei der Übergabe erhalten: Zugänge, Kosten, Abschalten, Fehler, Übergabe.', href: 'support/#dokumentation' },
    { icon: 'schluessel', titel: 'Für Ihre IT', art: 'Technischer Aufbau', text: 'Welche Dienste, welche Berechtigungen, wo der Code läuft und wohin Protokolle und Fehlermeldungen gehen.', href: 'sicherheit/#it' },
  ];
  const liste = `<ul class="unterlagen">${DOCS.map((d) => `<li class="unterlagen__item" data-reveal>
    <span class="unterlagen__icon">${c.icon(d.icon)}</span>
    <div class="unterlagen__text">
      <p class="unterlagen__art">${e(d.art)}</p>
      <h2 class="t-h3 unterlagen__titel"><a href="${ctx.url(d.href)}">${d.titel}</a></h2>
      <p>${d.text}</p>
      ${d.pdf ? `<p class="unterlagen__links">${c.more({ href: d.href, label: 'Ansehen' })}<a class="more" href="${ctx.url(d.pdf)}" download>PDF herunterladen</a></p>` : `<p class="unterlagen__links">${c.more({ href: d.href, label: 'Ansehen' })}</p>`}
    </div>
  </li>`).join('\n')}</ul>`;
  return [
    c.hero({
      crumbs: [{ label: 'KI', href: 'ki/' }, { label: 'Unterlagen' }],
      eyebrow: 'Unterlagen',
      title: 'Lesen Sie die Verträge, bevor Sie mir schreiben.',
      lead: 'Hier stehen die Unterlagen, die Sie vor einem Auftrag sehen wollen. Zeigen Sie sie ruhig Ihrer Fachperson, Ihrem Verband oder Ihrer IT.',
    }),
    c.section({
      id: 'liste',
      label: 'Unterlagen',
      body: liste,
    }),
    c.section({
      id: 'hinweis', tone: 'soft',
      label: 'Hinweis zu den Mustern',
      body: c.info({ icon: 'dokument', tone: 'warm', title: 'Muster, kein Rechtsrat', text: 'Ich bin kein Jurist. Verbindlich ist die Fassung, die wir unterschreiben. Weil ich minderjährig bin, unterschreiben meine Eltern als gesetzliche Vertretung mit. Haben Sie eigene Vorlagen, etwa von Ihrem Verband, unterschreibe ich gerne diese.' }),
    }),
    c.kontaktBlock({
      title: 'Fehlt Ihnen eine Unterlage?',
      text: 'Schreiben Sie mir, was Sie vor einem Auftrag sehen möchten.',
      buttons: [{ href: 'kontakt/?thema=datenschutz', label: 'Frage stellen' }],
    }),
  ].join('\n');
};
