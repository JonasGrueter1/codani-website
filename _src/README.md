# Studio V4: Quellen und Build

Die Website besteht aus Quellen in diesem Ordner. Ein kleines Node-Skript ohne Abhängigkeiten erzeugt daraus die
Seiten `studio/<seite>/index.html`. Die erzeugten Dateien werden mit eingecheckt (GitHub Pages veröffentlicht sie,
Jekyll veröffentlicht Ordner mit `_` nicht). Das Repo ist öffentlich: alles hier ist auf GitHub lesbar.

## Kurz: Seite ändern und neu bauen

```
node studio/_src/build.js                  # alle Seiten erzeugen und prüfen (vom Repo-Root aus)
node studio/_src/build.js --only ki/       # nur Seiten unter ki/ (schneller beim Arbeiten, schreibt keine Weiterleitungen)
node studio/_src/build.js --leads <pfad>   # Pfad zur privaten leads.json für die Namensprüfung
node studio/_src/count-leads.js [pfad]     # Kennzahlen der Fallstudie neu zählen (nur Summen nach site.json)
node studio/_src/unterlagen-pdf.js         # PDFs der Muster-Verträge neu erzeugen (braucht Playwright, nach Textänderung)
```

1. Text oder Aufbau ändern: in `pages/<seite>.js` (eine Datei pro Seite).
2. Preis, Mail, Telefon, Termin-Link, Reaktionszeit, Markenname, Formular-Anbieter ändern: nur in `site.json`.
3. `node studio/_src/build.js` laufen lassen. Bei Fehlern schreibt der Build nichts und listet die Fehler auf.
4. Erzeugte HTML-Dateien nie von Hand ändern, sie werden beim nächsten Build überschrieben.

Standardpfad der Firmenliste: `../../workflow-leads/leads.json` (neben dem Repo). Fehlt sie, gibt es nur eine Warnung.

## Ordner

```
_src/
  build.js          Build: lädt site.json, data/*.json, components/*.js, pages/*.js, rendert, prüft, schreibt
  count-leads.js    zählt Kennzahlen aus der privaten Firmenliste (nur Summen) in site.json
  site.json         ALLE Einstellungen (Marke, Kontakt, Formular-Anbieter, Hosting, Reaktionszeit, Preise, Kennzahlen)
  data/nav.json     Navigation, KI-Panel, Handy-Menü, Fusszeile
  data/form.json    Formular: Auswahl "Worum geht es?", Thema-Vorauswahl (?thema=), Texte und Fehlermeldungen
  lib/              html.js (esc, attrs, join), format.js (CHF, Platzhalter), check.js (Prüfungen), leads.js (Vertraulichkeit)
  layouts/          base.js (helle Unterseiten), story.js (Startseite mit 3D-Kopf, Preloader, alte Anker, Schalter
                    fuer den Hellmodus)
  components/       layout.js (Kopf, Kopfzeile, KI-Panel, Handy-Menü, Fusszeile), blocks.js (Bausteine),
                    form.js (Kontaktformular), ki-vorlagen.js (Werkzeug- und Branchen-Vorlage),
                    ki-demo.js (Demo-Assistent), ki-mockups.js (Mockups der KI-Seiten), branchen-bilder.js,
                    trust-grafiken.js (Grafiken der Vertrauens-Seiten), trust-dokument.js (Muster-Dokumente mit
                    Unterschriften: trustDokument, trustUnterschriften, trustLuecke), web-geraete.js (webBild, webLaptop, webHandy,
                    webDuo, webBento, webAblauf, webGalerie, webMusterKarten), web-referenzen.js (refDatum, refBalken,
                    refEintrag)
  muster/           Musterseiten (Quelle der Produktbilder assets/img/muster-*). muster/aufnehmen.js braucht
                    Playwright und ist nicht Teil des Builds. Wird nicht veröffentlicht.
  pages/            eine Datei pro Seite (siehe Zuständigkeiten)
```

Erzeugt: `index.html` (Start), `ki/`, `ki/e-mail/`, `ki/kalender/`, `ki/dokumente/`, `ki/kunden/`, `branchen/`,
`branchen/handwerk/`, `branchen/treuhand/`, `branchen/verwaltung/`, `websites/`, `preise/`, `referenzen/`,
`sicherheit/`, `support/`, `ueber-mich/`, `kontakt/`, `impressum/`, `datenschutz/`, `unterlagen/` (mit
`unterlagen/vertraulichkeit/` und `unterlagen/auftragsbearbeitung/`, PDFs in `assets/docs/`), die Weiterleitungen
`impressum.html` und `datenschutz.html` (alte Adressen) und `sitemap.xml` (erst mit eigener Domain verlinken).

## Eine Seite (pages/<name>.js)

```js
exports.meta = {
  path: 'ki/e-mail/',          // Ausgabeordner relativ zu studio/ ('' = Startseite)
  nav: 'ki',                   // aktiver Menüpunkt: start, ki, websites, preise, referenzen, ueber-mich, kontakt
  css: ['ki'],                 // zusätzliche Bereichs-CSS (css/ki.css), site.css lädt immer
  js: [],                      // zusätzliche Skripte (js/demo.js), site.js lädt immer
  title: 'KI für E-Mails: Antwortentwürfe | {{marke}}',     // höchstens 60 Zeichen
  description: '...',          // 120 bis 155 Zeichen, Nutzen zuerst
};
exports.render = (ctx) => [ ctx.c.hero({...}), ctx.c.section({...}), ctx.c.kontaktBlock() ].join('\n');
```

Im Kontext `ctx`:

| Feld | Zweck |
| --- | --- |
| `ctx.url('kontakt/?thema=ki-check')` | relativer Link von der aktuellen Seite (läuft unter /Workflow-Website/studio/ und auf eigener Domain). Immer verwenden, nie `/studio/...` |
| `ctx.t('Ab {{preis_website_ab}}')` | Platzhalter aus site.json einsetzen. Namen wie in V4-TEXTE.md (Liste: `lib/format.js`, `placeholders`). Unbekannter Name = Fehler |
| `ctx.preis('ki-check')`, `ctx.preisText('pilot')` | Preis-Eintrag und Text aus site.json |
| `ctx.site`, `ctx.data`, `ctx.esc()` | Einstellungen, Daten, HTML maskieren (für Werte aus Einstellungen) |
| `ctx.c.<baustein>(...)` | Bausteine (unten) |

## Bausteine (components/blocks.js, Designsystem V4-KONZEPT Kapitel 3)

| Baustein | Aufruf (Auszug) |
| --- | --- |
| Hero (genau eine H1) | `hero({ variant: 'compact', 'split', 'stage', 'statement', 'type', crumbs, eyebrow, title, lead, buttons, line, media })` |
| Abschnitt | `section({ id, tone: '', 'soft', 'tint', 'warm', width: '', 'wide', 'text', head: { eyebrow, title, intro }, body, label })` |
| Knöpfe | `btn({ href, label, variant: 'primary', 'secondary', 'ghost' })`, `btns([...])`, `more({ href, label })` |
| Karten, Kacheln | `cards(items, { cols: 2, 3, 4 })` (mit `href` ist die ganze Karte ein Link), `tiles(items)` mit Symbol |
| Ablauf-Grafik | `steps([{ title, parts: [['Sie', '...'], ['Ich', '...']], text, decide }], { vertical })` |
| Vorher/Nachher | `beforeAfter({ before: ['...'], after: [{ text, who: 'ki', 'sie' }] })` |
| Preise | `priceCards([{ id, featured, badge, points, hours, button }])`, `priceStrip(['ki-check', 'pilot', ...])`, `preisHinweis()` |
| FAQ | `faq([{ id, q, a }], { name })` (native `details`, Link `#faq-<id>` öffnet die Frage) |
| Kästen | `principle(text, { sub })`, `info({ icon, title, text, link, tone })`, `datenschutzBox()` |
| Abschluss | `ctaBand({ title, text, buttons })`, `kontaktBlock()` (Standard aus V4-TEXTE 2.3) |
| Kleinteile | `badge('beispiel', 'muster', 'demo')`, `chips([...])`, `who('ki', 'sie')`, `list(items, { style })`, `crumbs([...])`, `icon(name)`, `stat({ value, label, sub })`, `prose(html)` |
| Formular | `form()` (Ziel und Schlüssel aus site.json `formular.aktiv`, Logik in js/site.js) |
| Platzhalter | `placeholder('Beschreibung', { ratio, tone })`: leere Fläche für ein Mockup, das noch gebaut wird. Der Build listet alle Platzhalter auf |
| KI-Vorlagen | `werkzeugSeite({...})`, `branchenSeite({...})` (Programme mit `status`: ja, partner, export, offen, ungeprueft, dazu `programmeQuellen`, `programmeStand`, `programmeCheck`), `kiWerkzeugKacheln({ ohne })`, `kiBranchenKarten({ ohne })` |
| Beispielrechnung | `kiRechner({ periode: 'woche' \| 'monat', zeilen: [{ titel, name, anzahl, heute, neu }], satz, annahme })`: Stunden, Franken, Kosten erstes Jahr und Monat, ab dem es sich rechnet (Preise aus site.json, Logik js/rechner.js) |
| Muster-Dokument | `trustDokument({ titel, stand, parteien, abschnitte, anhang, unterschriften })` (Druck und PDF: nur `#dokument`) |

Symbole: `assets/icons.svg` (mail, kalender, dokument, kunden, website, schild, uhr, schalter, schluessel, haken,
person, stecker, ort, papierkorb, pfeil, chevron, plus, telefon, chat, liste, werkzeug, rechner, haus, mikro, funke,
extern). Neue Symbole dort ergänzen (24 x 24, Strich 1.5, `currentColor`).

CSS-Klassen der hellen Seiten (css/site.css): Typo `t-eyebrow`, `t-display-xl`, `t-display`, `t-h2`, `t-h3`,
`t-lead`, `t-small`, `t-price`, `t-stat`, Links `text-link`, `more`, Raster `wrap`, `grid grid--2 | grid--3 | grid--split`,
Tabellen `tbl-wrap` + `tbl`, Hinweis `note`. Dunkle Inseln mit Klasse `on-dark`.

## Einstellungen, die Jonas noch setzen muss (leer = ausgeblendet)

`kontakt.telefon`, `kontakt.telefonZeiten`, `kontakt.terminLink`, `kontakt.adresse` (Postadresse fürs Impressum),
`kontakt.uid`, `kontakt.naechsterKiCheck` (z. B. "ab KW 47"), `kontakt.umstellung` (Satz zum Umzug von Mail und Formular
in die Schweiz), `support.stellvertretung` (IT-Betrieb, der bei Ausfall einspringt), `firma.form`, `firma.haftpflicht`.
Gesetzt und sichtbar: `kontakt.erstgespraech` (kostenloses Erstgespräch), `pilotangebot.frei` (freie Pilotplätze nachführen). Mit `bestaetigt: false` als Vorschlag sichtbar und vom Build
gemeldet: `preise`, `support` (Reaktionszeit, `dringend`), `daten` (Regel Kundendaten Schweiz), `firma` (Haftung,
Gewährleistung), `pilotangebot` (`plaetze: 0` blendet das Angebot aus). Formular-Anbieter: `formular.aktiv` und der
Eintrag `formular.anbieter.alternative` (Schweiz oder EU, sobald gewählt).

## Was der Build prüft (Fehler brechen ab)

- genau eine H1, Titel höchstens 60 Zeichen, Beschreibung 120 bis 155 Zeichen, keine doppelten IDs, Bilder mit `alt`
- jeder interne Link und jede Datei existiert, auch Anker (`ki/#demo`, Symbole in icons.svg), kein Link aus studio/ hinaus
  und keiner auf Demo-Ordner
- sichtbarer Text: kein Eszett, keine Gedankenstriche (– — und " - "), keine Emojis, kein "Vorschau" oder "Version 3"
- Telefonnummern nur, wenn in site.json gesetzt; keine Schlüssel-Muster (API-Schlüssel, Tokens)
- Vertraulichkeit: keine Namen, Kennungen, Domains, Mailadressen oder Nummern echter Betriebe aus der privaten
  Firmenliste, in den erzeugten Seiten UND in allen Dateien unter studio/ (Quellen, CSS, JS, Kommentare, ARCHITEKTUR.md)
- Warnungen: CHF-Beträge fest in Seitenquellen (Beispielpreise mit Kommentar `beispiel` markieren), Du-Form

Weitere private Begriffe (z. B. Name des Lehrbetriebs) in eine Datei `studio-verboten.txt` neben `leads.json`
schreiben (ein Begriff pro Zeile). Diese Datei liegt nur im privaten Repo, nie hier.

## Regeln (gelten für jede Datei unter studio/)

Deutsch, Sie-Form, Schweizer Rechtschreibung (ss), keine Gedankenstriche als Satzzeichen, keine Emojis. Nichts erfinden:
keine Kunden, Logos, Bewertungen, Zahlen, Zertifikate. Beispiele nur mit erfundenen Namen (Muster, Beispiel, Mailadressen
`@example.com`) und immer gekennzeichnet (`badge('beispiel')`). Keine echten Firmennamen aus den Demos, keine Links auf
Demo-Ordner. Lehrbetrieb nie nennen ("bei einer grossen Versicherung"). Preise nur aus site.json. Unterseiten laden
kein three.js und kein GSAP. Kommentare im Code ebenfalls ohne Namen (das Repo ist öffentlich).

## Zuständigkeiten (vier Entwickler parallel)

Jede Datei hat genau eine zuständige Gruppe. Fremde Dateien nur lesen. Braucht eine Gruppe etwas im Fundament, ergänzt
sie es selbst nur, wenn es rein additiv ist (neue Option mit Standardwert, neue Klasse, neues Symbol), und meldet es
dem Hauptagenten. Signaturen bestehender Bausteine und Klassen nicht ändern. `site.json` nie komplett überschreiben,
nur einzelne Werte gezielt ändern (Edit), und nur nach Absprache.

| Gruppe | Dateien (nur diese ändern) |
| --- | --- |
| **Startseite 3D** | `_src/pages/start.js`, `_src/layouts/story.js`, `css/story.css`, `js/main.js`, `js/ui.js`, `js/engine.js`, `js/director.js`, `js/runner.js`, `js/config.js`, `js/fx/*`, `js/scenes/*`, `js/dev.js`, `dev.html`, `assets/robot/*`, `assets/img/poster-*`, `assets/img/og.jpg`, neue Dateien `js/nodes.js` o. ä., `ARCHITEKTUR.md` (Kapitel zur 3D-Geschichte) |
| **KI-Seiten** | `_src/pages/ki.js`, `ki-e-mail.js`, `ki-kalender.js`, `ki-dokumente.js`, `ki-kunden.js`, `branchen.js`, `branchen-handwerk.js`, `branchen-treuhand.js`, `branchen-verwaltung.js`, `_src/components/ki-vorlagen.js`, `_src/components/ki-demo.js`, `_src/components/ki-mockups.js`, `_src/data/demo.json`, `css/ki.css`, `css/demo.css`, `css/ki-mockups.css`, `js/demo.js` (Demo-Assistent, `?demo=<szene>` wählt eine Szene vor), `js/rechner.js` (Zeitrechner Handwerk, Stile in `css/branchen.css`), `assets/img/ki-*` |
| **Websites und Referenzen** | `_src/pages/websites.js`, `_src/pages/referenzen.js`, neue `_src/components/web-*.js`, `_src/muster/` (neu, Musterseiten als Quelle der Produktbilder, werden nicht veröffentlicht), `css/websites.css`, `js/websites.js` (neu, falls nötig), `assets/img/muster-*` (neu), `_src/count-leads.js`, in `site.json` nur `referenzen` |
| **Vertrauens-Seiten** | `_src/pages/preise.js`, `sicherheit.js`, `support.js`, `ueber-mich.js`, `kontakt.js`, `impressum.js`, `datenschutz.js`, `unterlagen*.js`, `_src/unterlagen-pdf.js`, `assets/docs/*`, neue `_src/components/trust-*.js`, `_src/components/branchen-bilder.js` (Bilder der Branchen-Seiten), `css/vertrauen.css`, `css/branchen.css`, `_src/data/form.json` (Texte des Formulars) |
| **Fundament** (Hauptagent) | `_src/build.js`, `_src/lib/*`, `_src/layouts/base.js`, `_src/components/layout.js`, `_src/components/blocks.js`, `_src/components/form.js`, `_src/data/nav.json`, `_src/site.json`, `css/site.css`, `js/site.js`, `assets/icons.svg` (Symbole ergänzen darf jede Gruppe), `_src/README.md` |

Erzeugte Dateien (`index.html`, `ki/**/index.html` und so weiter) gehören der Gruppe ihrer Quelle. Nach einer Änderung
baut jede Gruppe neu (`node studio/_src/build.js`). Weil der Build alle Seiten schreibt, entstehen dabei auch Dateien
anderer Gruppen neu: das ist harmlos, solange niemand erzeugte Dateien von Hand ändert. Bricht der Build wegen eines
Fehlers in einer fremden Seite ab, die Gruppe informieren statt deren Datei zu ändern (zum Weiterarbeiten
`--only <pfad>`).

Neue Seiten: Datei in `pages/` anlegen, Pfad in `data/nav.json` (Menü, Fusszeile) nur über den Hauptagenten.

## Prüfen

- Unterseiten: `node /home/user/studio-arbeit/tools/pages.js <outdir> [all|ki/,preise/] --vp=desktop,mobile,small`
  (ganze Seiten 1440 x 900, 390 x 844 und 320 x 640, meldet Konsolenfehler, 404, horizontales Scrollen).
- Startseite mit 3D: `studio_capture.js`, `story_shots.js`, `content_shots.js` (siehe ARCHITEKTUR.md Kapitel 10).
  Hellmodus: dieselben Werkzeuge mit `?hell` im Query (`--page='?q=high&hell'`, `--q='?nogl&hell'`), Schalter live:
  `studio-arbeit/hellmodus/tools/theme_switch.js`. Dunkel unverändert? `shader_dump.js` vorher und nachher, dann
  `shader_cmp.py` (gleiche Programme ohne die hellen `#ifdef`-Blöcke, ARCHITEKTUR.md Kapitel 14).
- Bilder immer ansehen. Keine Konsolenfehler, keine 404, kein horizontales Scrollen ab 320 px.

## Startseite: was das Fundament bereits erledigt hat

- Kopfzeile und Fusszeile kommen aus `components/layout.js` (dunkle Variante `hdr--dark`, über dem hellen Inhalt
  schaltet `js/site.js` auf hell, Auslöser ist `data-light` am Element `#content`). `header(ctx, { extra })` setzt
  zusätzliches HTML nach dem Kontakt-Knopf (Standard leer, nur die Startseite nutzt es für den Schalter).
- **Hellmodus der Startseite** (02.11.2026, ARCHITEKTUR.md Kapitel 14): `layouts/story.js` setzt früh im Kopf
  `html[data-theme]` (`dunkel` Standard, `hell`; gespeichert in `localStorage` `codani-theme`, Test-Schalter `?hell`
  und `?dunkel`), legt den runden Knopf `#theme-toggle` (Sonne/Mond) neben Kontakt und schaltet live um (Ereignis
  `codani-theme` für die 3D-Szene, weiche Blende; bricht der Browser die View Transition ab, bleibt das Thema gesetzt
  und die Ablehnung wird abgefangen). Farben der hellen Geschichte: `css/story.css`, Abschnitt "Hellmodus" (Kopfzeile
  mit kräftigem Off-White-Verlauf über der Szene, HUD fast deckend). Helle Poster: `assets/img/poster-<beat>-hell.webp`
  und `-hell-m.webp` (nach Prüfung 1 am 03.11.2026 neu aufgenommen). Die Unterseiten sind schon hell und haben keinen
  Schalter.
- `js/ui.js` macht nur noch Geschichte, Preloader, HUD, Anker und Cursor. Navigation, Menü, FAQ, Formular und
  Einblenden liegen in `js/site.js`. `css/style.css` ist aufgeteilt: Geschichte in `css/story.css`, der Rest in `site.css`.
- Die Kapitel und Texte stehen in `pages/start.js` (`CHAPTERS`, Namen wie `BEATS` in `js/config.js`). Hero und
  sechs Stationen: intro, robot (01), zoom (02), brain (03, ohne Text), cables (04), dna (05 Websites: Code-Helix und
  Website-Gerüst, seit 01.11.2026 wieder drin), outro (06). Die Nummern im Kicker passen zum HUD (`0X/06`, die Zahl
  hinter dem Schrägstrich rechnet `layouts/story.js` aus `CHAPTERS`). Neue Station: Eintrag in `CHAPTERS` und `BEATS`,
  Kicker-Nummern und ARCHITEKTUR.md Kapitel 9 nachführen.
- Das Kapitel dna hat zusätzlich die Angebotszeile (`offer` in `CHAPTERS`, `#offer`): "Ihr erster Entwurf ist kostenlos."
  mit Knopf auf `kontakt/?thema=website`. Nur mit 3D sichtbar (`js/ui.js` `setOffer`), der Knopf ist sonst `tabindex -1`.
- Die fünf Werkzeuge sind im Kabel-Kapitel echte Links (`nav.tool-links`, `a[data-node]`). Am Desktop mit 3D sitzen
  sie über den Knoten (`js/nodes.js`), im Hochformat und ohne 3D sind es Pillen im Text.
- Treffer im 3D-Modus: Die Abschnitte (`.gl .chapter`) und Panels nehmen keine Zeiger-Ereignisse an, nur die Links
  und Knöpfe des aktiven Panels und der eingeblendete Angebotsknopf (`.chapter__offer.is-on`, `css/story.css`).
  Sonst landet ein Tipp im Hochformat auf dem nächsten Abschnitt.
  Prüfen mit `/home/user/studio-arbeit/tools/tap_check.js` (echter Tipp mit WebGL).
- Alte Anker (`#kontakt`, `#leistungen`, `#ablauf`, `#fragen`, `#faq-...` und weitere) leiten auf die neuen Seiten um
  (`layouts/story.js`, `REDIRECTS`). Alte Adressen `impressum.html` und `datenschutz.html` leiten weiter.
