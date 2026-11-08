# Studio: Architektur und Schnittstellen (Version 4)

Immersive Website von Jonas Grüter. Diese Datei ist der Vertrag zwischen Fundament und Szenen-Entwicklern.
Wer eine Szene baut, ändert nur seine Datei `js/scenes/<name>.js`. Alles andere läuft über die Schnittstellen unten.

**Version 4 (mehrseitig):** Alle Seiten entstehen mit `node studio/_src/build.js` aus `_src/` (Anleitung, Bausteine und
Zuständigkeiten in `_src/README.md`). `index.html`, `impressum.html` und `datenschutz.html` sind erzeugt, nie von Hand
ändern. `css/style.css` ist aufgeteilt: `css/site.css` (Designsystem, Kopf- und Fusszeile aller Seiten) und
`css/story.css` (nur die Geschichte, auch für `dev.html`). Navigation, Handy-Menü, FAQ, Formular und Einblenden der
Inhalte liegen in `js/site.js`, `js/ui.js` macht nur noch Preloader, Geschichte, HUD, Anker und Cursor. Die Kapitel der
Geschichte stehen in `_src/pages/start.js`, der Kopf der Startseite in `_src/layouts/story.js`.

**Startseite Version 4 (01.11.2026):** Die Geschichte hat Hero und sechs Stationen 01 bis 06 (Entlastung, Was KI kann,
Flug ins Gehirn ohne Text, Verbindung, Websites, Einstieg) und rund 780 vh Scrollweg statt 1080 vh. Das Kapitel Code
(Helix aus Code, die sich zum Website-Geruest aufbaut, `dna*.js`) war in der ersten Fassung von Version 4 entfernt und ist
seit dem 01.11.2026 wieder drin (Jonas: "den fand ich sehr gut"), kompakt mit 190 statt 210 vh und mit einem Anflug aus
der Kabel-Uebersicht (Kapitel 4 und 5). Der Flug ins Gehirn ist ein eigener Beat ohne Text und laeuft
langsamer (mehr Scrollweg und eine Tempo-Grenze, Kapitel 4). Die fuenf Knoten der Kabel-Szene sind echte HTML-Links
ueber den 3D-Knoten (`js/nodes.js`, Kapitel 13). Das Android-Gesicht ist weicher (Kapitel 11), der Hintergrund hat einen
Studio-Boden und wandernde Lichtflaechen (Kapitel 12). Unter der Geschichte stehen helle Teaser (Kapitel 9).

**Hellmodus (02.11.2026):** Die Geschichte gibt es in zwei Themen, dunkel (Standard, unverändert) und hell
(Produktfoto im hellen Studio). Schalter in der Kopfzeile, Umschalten live mit weicher Blende. Alles dazu in Kapitel 14.

## 1. Dateien

```
studio/
  index.html            Startseite (erzeugt aus _src/pages/start.js und _src/layouts/story.js, nie von Hand aendern)
  dev.html              Testseite: eine Szene isoliert, Regler für local, Kamerapfad oder Orbit
  css/story.css         Geschichte: Panels, HUD, Ueberspringen, Knoten-Links, Fallback mit Postern, Teaser-Grafiken
  css/site.css          Designsystem aller Seiten (Fundament)
  js/config.js          ALLE Konstanten: Farben, Qualitätsstufen, Masse (ANCHORS), Beats, Modul-Fenster, Kamera-Keys, Look
  js/engine.js          Renderer, Licht, Umgebung, Postprocessing, Resize, Maus, adaptive Auflösung
  js/director.js        Scroll -> global 0..1 -> Beats, Modul-Fenster, Kamerapfad, CSS-Variablen der Panels
  js/runner.js          Szenen laden, pro Frame aktivieren/updaten, Looks mischen (gleich für Seite und dev.html)
  js/main.js            Seite starten: Fallback-Entscheid, Preloader, Loop, Pause bei verstecktem Tab
  js/ui.js              Ohne three.js: Preloader, Cursor, HUD, Einblendungen der Panels, Anker
  js/nodes.js           Ohne three.js: die fuenf Werkzeug-Links ueber den 3D-Knoten (Kapitel 13)
  js/theme.js           Thema hell/dunkel der 3D-Szene: Zustand, Tinten-Uniforms, Umrechnung additiver Materialien (Kapitel 14)
  js/dev.js             Logik von dev.html
  js/fx/FxPass.js       Eigener Bild-Pass: chromatische Aberration, Vignette, Filmkorn, Blitz, Abblende, Abdunkeln
  js/scenes/*.js        backdrop, particles, robot, brain, cables, dna (je ein Szenen-Modul, Hilfsdateien <name>-*.js)
  js/scenes/dna*.js     Kapitel Code: dna.js Einstieg, -atlas (Zeichen-Textur), -code (Code der Straenge, Geruest),
                        -build (Geometrie, Zeitplan der Zeichen), -shaders
  js/scenes/backdrop*.js Hintergrund hinter allem (Kapitel 12): backdrop.js Einstieg, -glsl (Shader), -noise (Rausch-Volumen)
  js/scenes/robot*.js   Android-Bueste (Kapitel 11): robot.js Einstieg, robot-mesh/-layout/-materials/-mech/-env/-geometry,
                        robot-mesh-worker.js (Catmull-Clark im Web Worker)
  assets/robot/         bust.bin: Netz der Android-Bueste (MakeHuman CC0, offline aufbereitet, 76 KB)
  assets/fonts/         Geist (variabel 300..700) und Geist Mono (variabel 400..600), latin, woff2, OFL
  vendor/               three r170 (ES-Module, nur die 12 genutzten Addons) und GSAP 3.12.5 + ScrollTrigger (UMD)
../_config.yml          am Repo-Root: Jekyll veroeffentlicht ARCHITEKTUR.md, dev.html und js/dev.js nicht
```

Ablauf pro Frame (js/main.js):

1. `engine.updatePointer` (Maus geglättet)
2. `director.content` (Inhaltsbereich 0..1, gedämpft), `director.pullScroll()` und `director.update(dt)`: global, Beats,
   Modul-Zustände, Kamerapose
3. `director.applyCamera(camera, pointer, look)`: Pfad + Maus-Parallax + ruhiges Schweben
4. `runner.step(time, dt)`: Module aktivieren, `update(...)` aufrufen, `look` mischen
5. `engine.applyLook(look)` und `engine.render()`: RenderPass -> UnrealBloom -> OutputPass (ACES + sRGB) -> FxPass

## 2. Szenen-Modul

Jede Szene ist ein ES-Modul `js/scenes/<name>.js` mit genau diesem Export:

```js
export function create(ctx) {           // darf auch async sein (Promise)
  const group = new ctx.THREE.Group();
  // ... Geometrie, Materialien, Shader EINMAL hier erzeugen
  return {
    group,                               // Pflicht: wird von main in die Szene gehängt
    look: { bloom: 1.1 },                // optional: Bildwirkung, wird nach Gewicht gemischt (Kapitel 6)
    lookHell: { exposure: 1.1 },         // optional: Bildwirkung im hellen Thema (Kapitel 14)
    update(time, dt, local, global, weight) { ... },   // Pflicht, nur aufgerufen solange aktiv
    setActive(active) { ... },           // Pflicht (darf leer sein)
    setTheme(light) { ... },             // optional: Thema wechselt (vor dem Vorkompilieren und live, Kapitel 14)
    dispose() { ... },                   // Pflicht: Geometrien, Materialien, Texturen freigeben
  };
}
```

Parameter von `update`:

| Name | Bedeutung |
| --- | --- |
| `time` | Sekunden seit Start, läuft nicht weiter, wenn der Tab versteckt ist |
| `dt` | Sekunden seit letztem Frame, begrenzt auf höchstens 0.05 |
| `local` | Fortschritt 0..1 im **Hauptfenster** der Szene (`MODULES[name].windows[0]`) |
| `global` | gedämpfter Gesamtfortschritt 0..1 der Story |
| `weight` | 0..1, Sichtbarkeit inkl. Überblendung an den Fensterrändern. Für Deckkraft/Alpha verwenden |

`setActive(bool)` wird bei jedem Wechsel aufgerufen. `group.visible` setzt der Runner selbst, die Szene muss das nicht tun.
Wirft `update` einen Fehler, blendet der Runner die Szene aus und meldet es einmal in der Konsole. Die Seite läuft weiter.

### ctx

| Feld | Inhalt |
| --- | --- |
| `THREE` | three.js r170 (Addons per `import ... from 'three/addons/...'`) |
| `renderer`, `scene`, `camera` | Nur lesen. Kamera gehört dem Director, nie selbst bewegen |
| `quality` | `'high'`, `'medium'` oder `'low'` |
| `tier` | Werte der Stufe aus `QUALITY`, wichtig: `tier.particles` (1, 0.5, 0.25) als Faktor für Mengen |
| `isMobile` | Touch-Gerät oder schmal |
| `pointer` | `{ x, y }` roh und `{ sx, sy }` geglättet, je -1..1 (y oben), `vx, vy` Geschwindigkeit. Auf Touch: sanftes Eigenleben |
| `palette` | `THREE.Color` (linear) aus `HEX`. Nie verändern, für Glow `.clone().multiplyScalar(2..5)` |
| `anchors` | Masse und Positionen (Kapitel 3). Vektoren sind eingefroren: immer `.clone()` |
| `director` | `director.beat('zoom')` -> `{ start, end, p, w }`, `director.module('robot')`, `director.global`, `director.cutFade`, `director.cuts`, `director.content` (Inhaltsbereich 0..1) |
| `shared` | gemeinsame Uniforms: `uTime`, `uResolution` (Pixel inkl. DPR), `uPixelRatio`. Objekt direkt in eigene Uniforms hängen |
| `envMap` | PMREM-Umgebung (prozedural), ist schon `scene.environment` |
| `lights` | `{ key, rim, amb }`: feste Lichter. Intensität nur über `look.key/rim/amb` steuern |
| `overlay` | DOM-Ebene über dem Canvas für Beschriftungen (Klasse `.gl-label`), z. B. Werkzeug-Namen bei den Kabeln |
| `size` | `{ width, height, dpr }` aktuell |
| `onResize(fn)` | Rückruf `fn(width, height, dpr)`, gibt eine Abmelde-Funktion zurück |
| `time` | aktuelle Zeit (gleich wie `time` in update) |
| `dev` | `true` in dev.html |
| `theme` | `{ light }`: aktuelles Thema (nur lesen, Kapitel 14) |
| `themeUniforms` | Tintenfarben `uThemeInk`, `uThemeTeal`, `uThemeWarm` (linear), in eigene Shader haengen; heller Weg mit `#ifdef CODANI_LIGHT` |

## 3. Koordinatensystem und Massstab

- Y zeigt nach oben, rechtshändig. Die Startkamera steht auf +Z und schaut Richtung -Z.
- 1 Einheit entspricht etwa 10 cm. Der Kopf ist also rund 2 Einheiten hoch.
- **Der Kopf des Roboters steht im Ursprung**, das Gesicht zeigt nach +Z (Augen der Android-Bueste bei y ≈ 0, z ≈ 0.6).
- Alle Werte stehen in `js/config.js` unter `ANCHORS`. Nie Zahlen doppelt hart codieren.

| Anker | Wert | Bedeutung |
| --- | --- | --- |
| `head.center` | (0, 0, 0) | Kopfmitte |
| `head.radii` | (0.82, 1.0, 0.92) | Halbachsen des Kopf-Ellipsoids (Breite 1.64, Höhe 2.0, Tiefe 1.84) |
| Augen | (±0.30, 0, 0.60) | Landmarken `eyeL`/`eyeR` aus `bust.bin` (kein eigener Anker, `robot-mesh.js` liefert `lm`) |
| `neck.top` / `neck.bottom` | (0, -0.85, -0.05) / (0, -1.55, -0.1) | Hals, Radius 0.32 |
| `bust.center` | (0, -2.4, -0.15) | Schulterpartie, Schulterbreite 4.2, Unterkante y = -3.4 |
| `brain.center` | (0, 0.24, -0.06) | Gehirn im Kopf, Halbachsen (0.6, 0.48, 0.7), liegt ganz im Kopf |
| `cableRoot` | (0, -0.28, -0.52) | Hirnstamm: hier treten die Kabel aus (hinten unten am Gehirn) |
| `nodes.email` | (-4.6, 1.8, -6.2) | Werkzeug-Knoten hinter dem Kopf, Radius `nodeRadius` 0.32 |
| `nodes.kalender` | (4.4, 2.2, -6.6) | |
| `nodes.dokumente` | (-3.8, -2.0, -8.4) | |
| `nodes.kunden` | (4.0, -1.6, -8.8) | |
| `nodes.website` | (0, 0.5, -10.0) | Mittlerer Knoten (Link auf websites/), dahinter beginnt die Helix |
| `dna.start` / `dna.end` | (0, 0.5, -10.4) / (0, 0.5, -32) | Achse der Doppelhelix (entlang -Z), Radius 1.1, eine Windung pro 4.2 |
| `wireframe.center` | (0, 0.5, -36) | Website-Gerüst am Ende der Helix, 5.6 x 3.4, Fläche zeigt nach +Z |

Seitenansicht (Y nach oben, Z nach rechts = zur Startkamera):

```
  y
  2 |      email/kalender (y 1.8..2.2, z -6.2..-6.6)
  1 |   website    .-head-.
  0 |   (z -10)  ( brain )|Gesicht ..... Kamera Start (0, 0.35, 13.4)
 -1 |              '-neck-'
 -2 |      dokumente/kunden (y -2..-1.6)   bust
 -3.5 ---- Studio-Boden des Hintergrunds (Farbwelten robot, zoom, outro) ----
    +-----------------------------------------------------------> z
     -10   -6     -1   0   1                13.4
```

Draufsicht: Knoten auf einem Bogen hinter dem Kopf, Website-Knoten genau auf der Achse x = 0.

Kamera: `near` 0.01, `far` 220. Im Kopf und im Gehirn arbeitet die Kamera mit Abständen um 0.1 bis 1.

## 4. Zeitfenster

### Beats (Abschnitte der Story)

Jeder `<section data-scene="...">` in index.html ist ein Beat. Seine Höhe kommt aus `BEATS[].len` (in vh, als CSS-Variable `--len`).
Der Director misst die Abschnitte und rechnet Start/Ende in `global` um. Nominalwerte (1440 x 900, Standardlängen):

| Beat | len (vh) | start | end | Text | Inhalt |
| --- | --- | --- | --- | --- | --- |
| intro | 60 | 0.0000 | 0.0769 | Hero (scrollt normal weg) | Partikel-Büste fertig geformt (Kopf, Fugen, Augenpartie, Rand der Hinterkopf-Öffnung scharf; Kabel fliessen weg, atmet, folgt der Maus), Titel, zwei Wege |
| robot | 90 | 0.0769 | 0.1923 | 01 Entlastung (p 0.3 bis 0.97) | Partikel formen die Android-Büste (Hologramm, dann fest), Dreiviertelansicht, Studio-Boden |
| zoom | 120 | 0.1923 | 0.3462 | 02 Was KI kann (p 0.02 bis 0.54) | Profil mit offenem Hinterkopf und Kabeln, Röntgen-Scan, Gehirn in der Hardware, Kamera kreist nach vorne rechts oben |
| brain | 160 | 0.3462 | 0.5513 | keiner (03) | Dreiviertelansicht des Gehirns, langsames Eintauchen (brain@0.12 bis 0.55), Flug durch und hinten hinaus |
| cables | 110 | 0.5513 | 0.6923 | 04 Verbindung (p 0.16 bis 0.985) | Kabel werden gezogen, Übersicht von schräg oben, fünf Knoten als Links bis zum Ende des Beats |
| dna | 190 | 0.6923 | 0.9359 | 05 Websites (p 0.2 bis 0.62) | Anflug auf den Website-Knoten (bis dna@0.2), Helix aus Code von aussen, Eintauchen, Website-Gerüst, Angebotszeile (p 0.82 bis 0.985) |
| outro | 150 | 0.9359 | 1.0000 | 06 Einstieg (klebt) | Schnitt mit Lichtblitz, Roboter wieder ganz und ruhig, Kontakt |

Version 2 (Rückmeldung Art Director): Strecke von 1420 auf 1180 vh gekürzt. Version 4 (Testkunden und Jonas): 690 vh
Abschnitte, also 590 vh Scrollweg bis zum Inhalt (der letzte Beat zählt nur mit len - 100). Mit dem wieder eingebauten
Kapitel Code (01.11.2026, 190 vh) sind es 880 vh Abschnitte und 780 vh Scrollweg. Im Hochformat sind die Abschnitte 28 %
kürzer, der Ausklang nur im Teil über 100 vh (`.gl .chapter--outro`), zusammen rund 560 vh.

Die globalen Breiten der Überblendungen (`BEAT_FADE` 0.015, `MODULE_FADE` 0.0115, `BACKDROP_FADE` 0.0265, `CUT_FADE`
0.009) sind beim Wiedereinbau mit 590/780 skaliert: in vh gleich breit wie in der ersten Fassung von Version 4.

**Kapitel Code (dna), Zeitachse.** Der Beat beginnt in der Kabel-Übersicht. Bis `DNA_FROM` (config.js, 0.2, rund 38 vh)
fliegt die Kamera ohne Text hinunter auf den Website-Knoten (die Knoten-Links blenden dabei bis dna@0.035 aus, Kapitel
13), der Website-Knoten wird hervorgehoben und öffnet sich zum Portal (`cables.js`). Ab dna@0.2 läuft die Szene `dna`
mit ihrem Zeitplan aus Version 3 in `local` 0..1 (`dna.js`, Modul-Fenster dna@0.2 bis dna@1), also
p = 0.2 + 0.8 x local: Helix von aussen mit Text, Eintauchen, die Helix reisst auf und baut das Gerüst (local 0.44 bis
0.8, rund 55 vh), Ruhe mit Angebotszeile, Schnitt auf den Ausklang.

Formel: `start = top / (storyHeight - vh)`, `end = (top + height) / (storyHeight - vh)`, der letzte Beat endet bei 1.
`director.beat(name)` liefert `p` (0..1 im Beat, gedämpft) und `w` (Gewicht mit Überblendung `BEAT_FADE` = 0.015).

### Tempo-Grenze (Flug ins Gehirn)

Jonas (31.10.2026): "Flug ins Gehirn mit der Hardware geht mit einem Scroll durch". Version 4 löst das doppelt:

1. Mehr Scrollweg: Die Dreiviertelansicht steht am Anfang des Beats brain (brain@0.12), das Eintauchen läuft von
   brain@0.12 bis 0.55 (rund 70 vh, vorher 37 vh), im Beat brain steht kein Text.
2. `TEMPO` in config.js: zwischen zoom@0.6 und cables@0.3 folgt `global` dem Scroll höchstens mit 52 vh pro Sekunde
   (`director._limitTempo`). Ein schneller Wisch spielt den Flug trotzdem ruhig ab (zoom@0.6 bis brain@0.8 dauert
   mindestens rund 3 s), die Szene holt danach auf. Liegt das Ziel schon hinter dem Fenster, gilt 2.6 mal das Tempo.
   Sprünge (Ziel ändert sich in einem Bild um mehr als 0.15, Anker, Überspringen, Pos1/Ende, Ziel am Anfang oder Ende
   der Geschichte) gehen ohne Grenze. Text-Panels folgen dem ungedämpften Scroll (`tp`), darum steht im Fenster bis
   auf den Anfang des Kabel-Texts kein Text.

### Fenster der Module

In `MODULES` als `'beat@p'` definiert (p = Punkt im Beat). Nominal:

| Modul | Hauptfenster (local 0..1) | weitere Fenster |
| --- | --- | --- |
| backdrop | intro@0 bis outro@1 | (immer aktiv, Gewicht 1, Kapitel 12) |
| particles | intro@0 bis robot@0.7 | |
| robot | robot@0 bis brain@0.6 | outro@0 bis outro@1 |
| brain | zoom@0.3 bis dna@0.1 | (bleibt im Anflug, das Gehirn steht dort noch unten rechts im Bild) |
| cables | brain@0.7 bis dna@0.42 | (Website-Knoten als Portal, die Helix tritt aus seiner Faser) |
| dna | dna@0.2 bis dna@1 | (`local` = Zeitplan aus Version 3, Kapitel 4) |

- Ein Modul ist aktiv, solange eines seiner Fenster Gewicht > 0 hat (Rampe `MODULE_FADE` = 0.0115 an beiden Enden).
  Liegt ein Fensterrand auf einem Schnitt (`cut` in CAMERA_KEYS), ist er hart (`hardStart`, `hardEnd`): das Kapitel Code
  verschwindet genau im Lichtblitz, die Büste erscheint genau dort (sonst stand sie im Website-Gerüst).
- Für genaues Timing innerhalb der Geschichte lieber `ctx.director.beat('zoom').p` verwenden als `local`.
  Beispiel Roboter: Schale transparent machen mit `beat('zoom').p`, Ausklang mit `beat('outro').p`.
- Fenster nur in `config.js` ändern und hier nachführen.

## 5. Kamerapfad

`CAMERA_KEYS` in config.js: Keyframes an Beats verankert, `pos` (Position), `look` (Blickziel), `fov` (vertikal, Grad).

- Pro Schnitt-Abschnitt (Shot) je eine `CatmullRomCurve3` (centripetal) für Position und Blickziel.
- Zeit -> Kurve über Bogenlänge und monotone kubische Interpolation: die Geschwindigkeit bleibt über Keyframes stetig, kein Ruckeln.
- `cut: true` startet einen neuen Shot (harter Schnitt). Der Director liefert dafür `cutFade` (0..1, `CUT_FADE` 0.009 je Seite, etwa 7 vh).
  Der Runner macht daraus einen kurzen Lichtblitz (`flash`, Belichtung, Bloom), keine Abblende zu Schwarz.
  Zurzeit gibt es einen Schnitt: fertiges Website-Gerüst (dna@1) -> Ausklang beim Roboter (outro@0), wie in Version 3.
- `posM` / `lookM`: eigene Werte fürs Hochformat (Seitenverhältnis unter 0.85), abgestimmt für Handys (0.46 bis 0.59).
  Zusätzlich wird im Hochformat das FOV erweitert (`PORTRAIT`), damit horizontal genug Bild bleibt. Im Hochformat gilt
  mindestens der Faktor von 0.59 (`PORTRAIT.minPortrait` 2.0): Tablets im Hochformat (z. B. 768 x 1024) sind dadurch
  gleich gerahmt wie Handys, nur mit mehr Rand links und rechts (vorher stiess der Kopf dort oben an die Kopfzeile).
- Danach kommen Maus-Parallax (`look.parallax`, Einheiten) und ruhiges Schweben (`look.drift`).
- Dämpfung: `global` folgt dem Scroll mit `lambda` 4.2 (bei grossen Sprüngen schneller), im Fenster der Tempo-Grenze
  höchstens mit 52 vh pro Sekunde (Kapitel 4). Die Szenen bekommen immer den gedämpften Wert.

Verlauf (Version 1, von der Integration abgestimmt). Grundsatz: Solange ein Text-Panel links steht, sitzt das Motiv rechts
der Mitte (Blickziel nach links versetzt); im Hochformat steht der Text unten, darum dort das Motiv in der oberen Bildhälfte
(`posM`/`lookM`).

| Key | pos | look | fov | Hochformat | Notiz |
| --- | --- | --- | --- | --- | --- |
| intro@0 | (0.15, 0.32, 13.4) | (-1.75, -0.3, 0) | 30 | pos (0, 0.35, 11), look (0, -3.25, 0) | Hero: Partikel-Büste rechts neben dem Text, Hochformat oberes Drittel |
| intro@1 | (0.6, 0.3, 12) | (-0.9, -0.3, 0) | 31 | pos (0.5, 0.3, 9.6), look (0, -2.1, 0) | |
| robot@0.5 | (4.2, 0.75, 7.4) | (-0.98, -0.69, 0.58) | 31 | look (0.18, -2.8, 0.3) | Android-Büste Dreiviertelansicht von rechts vorne (+x), Gesicht zum Text, Büste rechts |
| robot@1 | (6.3, 0.55, 3.9) | (-0.54, -0.63, 0.78) | 32 | look (0.24, -2.48, 0.05) | kreist auf derselben Seite weiter |
| zoom@0.22 | (7.0, 0.45, -2.3) | (0.23, -0.46, 0.61) | 30 | pos (7, 0.5, -2.3), look (0.18, -1.89, -0.35) | Profil von schräg hinten: Gesicht zum Text, rechts offener Hinterkopf mit Kabeln |
| zoom@0.38 | (6.6, 0.55, -1.9) | (0.19, -0.41, 0.59) | 31 | pos (6.6, 0.6, -1.95), look (0.2, -1.8, -0.35) | ruhig, solange der Text steht; Scan beginnt |
| zoom@0.6 | (4.3, 0.95, 0.6) | (-0.07, -0.16, 0.33) | 34 | pos (3.9, 0.95, 0.55), look (0.22, -0.92, -0.06) | Röntgen seitlich: Gehirn in der Hardware, nie frontal; Hochformat enger auf Kopf und Hals |
| zoom@0.8 | (3.2, 1.15, 1.7) | (-0.2, 0.04, 0.26) | 37 | pos (3.3, 1.2, 1.85), look (0.22, -0.8, 0.04) | |
| zoom@1 | (2.3, 1.35, 2.55) | (-0.44, 0.14, 0.26) | 40 | pos (2.3, 1.5, 3), look (0.22, -0.9, 0.19) | Dreiviertelansicht vorne rechts oben |
| brain@0.12 | (1.62, 1.2, 2.18) | (-0.42, 0.12, 0.21) | 40 | pos (1.9, 1.35, 2.6), look (0.18, -0.7, 0.15) | Gehirn in der Röntgen-Schale, ohne Text (Version 4: vorher brain@0.3 mit Text) |
| brain@0.34 | (1.05, 0.88, 1.32) | (-0.3, 0.16, -0.1) | 46 | pos (1.25, 0.95, 1.6), look (0.1, -0.35, -0.05) | langsamer Anflug, gleichmässiges Tempo |
| brain@0.55 | (0.5, 0.52, 0.42) | (-0.15, 0.22, -0.5) | 54 | | Eintauchen durch Schale und Rinde |
| brain@0.78 | (0.02, 0.32, -0.25) | (0.25, -0.05, -1) | 58 | | mitten im Gehirn, roll 6°: Kabelaustritt nicht in der Bildmitte |
| brain@1 | (-0.35, 0.55, -0.85) | (0, 0, -3) | 55 | | hinten aus dem Gehirn, roll 2.5° |
| cables@0.12 | (-2.3, 1.75, -0.1) | (0.55, 0.78, -3.9) | 52 | | Aufstieg, Kalender-Knoten bleibt unter der Kopfzeile |
| cables@0.36 | (-6.8, 5.94, 2.23) | (1.5, 0.5, -5) | 46 | look (1.5, -3, -5) | Übersicht schräg oben: Gehirn unten rechts, Kabel nach links, Text rechts |
| cables@0.66 | (-7.3, 6.25, 1.9) | (1.65, 0.42, -5.15) | 45 | look (1.65, -3, -5.15) | ruhiges Driften: die Knoten-Links bleiben stehen (Kapitel 13) |
| cables@1 | (-7.55, 6.3, 1.35) | (1.75, 0.38, -5.35) | 44.5 | look (1.75, -3, -5.35) | bis zum Ende des Beats in der Übersicht, die Knoten-Links bleiben bedienbar |
| dna@0.1 | (-4.55, 3.3, -2.75) | (1, 0.95, -7.6) | 44 | look (0.9, -0.6, -7.8) | Anflug: hinunter, an E-Mail und Dokumente vorbei |
| dna@0.2 | (-1.9, 1.05, -7.6) | (0.15, 0.5, -11.2) | 44 | pos (-1.2, 1.2, -7), look (0.1, -0.4, -11.5) | nah am Website-Knoten (V3: cables@1), ab hier Szene dna |
| dna@0.28 | (-2.75, 0.95, -11) | (0.5, 0.45, -15.9) | 46 | pos (-2.1, 1.6, -9.6), look (0.35, -0.9, -15) | Helix von aussen (zTrack -9.9), Text links |
| dna@0.368 | (-0.55, 0.62, -9.5) | (-1, 0.5, -16) | 50 | pos (-0.4, 0.75, -9.4), look (0, 0.1, -16) | vor dem Anfang der Helix, Eintauchen entlang der Achse (zTrack -10) |
| dna@0.464 | (0.2, 0.56, -15) | (-1.55, 0.55, -20.5) | 50 | look (0, 0.5, -20.5) | Fluchtpunkt der Helix rechts, Text links |
| dna@0.664 | (0.1, 0.48, -28) | (0, 0.33, -36) | 43 | | Gerüst entsteht, früh gross im Bild |
| dna@0.792 | (0, 0.44, -29.25) | (0, 0.3, -36) | 41 | pos (0, 0.5, -28.85), look (0, -0.5, -36) | Gerüst fertig oben im Bild, darunter die Angebotszeile |
| dna@1 | (0, 0.42, -29.45) | (0, 0.3, -36) | 41 | pos (0, 0.5, -29.05), look (0, -0.5, -36) | |
| outro@0 (Schnitt) | (0.5, 0.05, 4.5) | (-0.22, -0.27, 0.03) | 34 | pos (0.5, 0.2, 6.6), look (0.01, -1.95, 0.09) | Gesicht nah, die Augen erwachen im Lichtblitz |
| outro@1 | (3.7, -0.3, 7.9) | (-1.19, -0.75, 0.56) | 31 | pos (3.9, 0.2, 9.6), look (0.06, -3.2, 0.15) | ruhige Dreiviertelansicht leicht von unten, Büste rechts, Blick wandert zum Kontakt; Hochformat: Kopf kleiner gerahmt, oben |

**Lens-Shift für andere Seitenverhältnisse:** Die Keys sind für 1440 x 900 komponiert (Text links endet bei ~41 % der Breite,
rechts beginnt er bei ~59 %). Der Director misst bei jedem Refresh, wie weit die Text-Panels tatsächlich reichen
(`_measureClearance`), und verschiebt das Bild über `camera.filmOffset` seitlich um die Differenz (höchstens 15 %,
gewichtet mit der Sichtbarkeit `--o` des Panels, gedämpft). Ergebnis: Auf Tablets quer oder 1280 x 800 bleibt das Motiv
neben dem Text, ohne eigene Keys. Im Hochformat ist der Shift 0 (Text unten). Szenen, die `vector.project(camera)` nutzen,
sind automatisch richtig.

`roll` (Grad) neigt die Kamera um die Blickachse.

Hinweis Kapitel Code: `dna-build.js` liest die z-Werte der `dna@`-Keys (wann die Kamera welche Stelle der Helix passiert)
und rechnet sie mit `DNA_FROM` in `local` um (local = (p - 0.2) / 0.8; Keys vor dna@0.2 zählen nicht). Die dna-Keys ab
dna@0.2 sind die Keys aus Version 3 mit p = 0.2 + 0.8 x p(V3). Neue dna-Keys darum mit z auf der Linie der bestehenden
setzen. Steht die Kamera ausserhalb der Helix (Ansicht von aussen), zählt statt pos.z der Wert `zTrack`.

### Text-Panels

Version 4: Die Abschnitte sind kurz (60 bis 160 vh), ein klebendes Panel (100 vh) hätte kaum Klebedauer. Darum gilt:

- **Hero** (intro, 60 vh): scrollt normal weg und blendet über `text` [0, 0, 0.3, 0.62] aus.
- **Entlastung, Was KI kann, Verbindung, Websites**: Panel **fix** im Bild (`position: fixed`, Desktop und Hochformat), blendet nur
  über sein Fenster `BEATS[].text` (Hochformat `textM`): robot [0.3, 0.42, 0.86, 0.97] (Text, sobald die Büste Form
  annimmt), zoom [0.02, 0.12, 0.42, 0.54] (weg vor dem Scan über dem Gesicht), cables [0.16, 0.28, 0.9, 0.985] (sobald
  die Übersicht steht, bis kurz vor dem Anflug), dna [0.2, 0.27, 0.53, 0.62] (Hochformat [0.2, 0.27, 0.5, 0.58]: ab
  dem Portal im Website-Knoten, wenn die Helix rechts steht, weg, bevor das Gerüst entsteht; im Hochformat früher, weil
  die Helix dort ab dna@0.56 quer durch die Textzone aufreisst). Zwischen den Texten von Verbindung und Websites liegt
  der Anflug ohne Text, sie überlappen nie. Leichtes Mitwandern über `--p` (36 px), Einblenden über `--o`.
- **Flug ins Gehirn** (brain): kein Text (`noText`), im HTML ein `div.chapter--image` ohne Panel (Fallback: nur Bild).
- **Ausklang** (outro, 150 vh): Panel klebt 50 vh und scrollt dann mit dem Inhalt weg.

Ohne eigenes Fenster gilt weiter: Einblenden bei p 0.02 bis 0.12, Ausblenden von `pinOut - 0.06` bis 40 vh nach `pinOut`
(Hochformat 0.84 bis 0.97). Im Hochformat ist die Strecke rund 28 % kürzer (`.gl .chapter { height: calc(var(--len) *
0.72vh) }`, der Ausklang nur im Teil über 100 vh), die Panels stehen dort unten.

**Überspringen:** `.story-skip` "Animation überspringen" (auf `#weiter`, den ersten Teaser) jetzt auch am Desktop: Pille unten
rechts, links neben dem HUD, von Entlastung bis Websites (im Hero führen die zwei Wege an der Strecke vorbei, im
Ausklang ist die Animation vorbei). Ab dem Angebotsmoment (`html.offer-end`, dna-Fortschritt über 0.82, ohne obere Grenze) ist sie aus, damit sie
nach der Angebotszeile nicht im Lichtblitz des Schnitts auftaucht. Die Angebotszeile selbst nimmt eingeblendet Klicks an
(`.gl .chapter__offer.is-on { pointer-events: auto; }`, der Abschnitt darum hat `pointer-events: none`). Im Hochformat unten rechts
unter dem Text-Panel. main.js setzt `html[data-beat]`. Die Pille springt weiterhin ans Ende der Geschichte (ohne
Tempo-Grenze, Kapitel 4), das Kapitel Code läuft dabei einfach durch.

**Angebotszeile (Kapitel Code):** `#offer` im Abschnitt `dna` (ausserhalb des Panels), fix unten in der Mitte, nur mit 3D.
`ui.setOffer(p)` (main.js, jedes Bild) blendet sie bei dna-Fortschritt (Scroll, ungedämpft) 0.82 bis 0.985 ein, also
wenn das Gerüst steht: "Ihr erster Entwurf ist kostenlos. Danach erhalten Sie eine Fixpreis-Offerte." mit Knopf
"Kostenlosen Entwurf anfragen" (`kontakt/?thema=website`, wie die anderen Website-Knöpfe). Sonst hat der Knopf
`tabindex="-1"` und gibt einen Fokus ab; im Fallback (`no-gl`, `ui.toStatic`) ist die Zeile nicht da. Im Hochformat
eine Karte über die ganze Breite unten. Die Kamera-Keys dna@0.792 und dna@1 lassen darunter Platz.

In unsichtbaren Panels haben Links und Buttons `tabindex="-1"` (kein Tab-Fokus), das setzt `ui.panel()`.
Kein `inert`: Überschriften und Texte bleiben im Accessibility-Baum, Screenreader lesen alle Kapitel.

**Abdunkeln hinter dem Text (Scrim):** Der Director misst die Lage jedes `.chapter__text` im klebenden Panel und liefert
`director.scrim` (Mitte und halbe Grösse in UV, Stärke = `--o` x `BEATS[].scrim`). Der FxPass dunkelt dort das Bild weich ab
(Neuronen, Code-Zeichen hinter dem Text). Hero nur 0.1 (Version 3.2: der stärkere Scrim reichte bis über den Kopf der
Partikel-Büste und machte ihn grau). Im Hochformat halb so stark, im Ausklang dort gar nicht: die Texte stehen auf einer
eigenen, fast deckenden Fläche, der volle Scrim lag sonst über dem Gesicht oben im Bild. Im hellen Thema zeichnet der FxPass
ihn im Hochformat gar nicht (`director.scrim.fx` 0, Prüfung 2: er lag als heller Schleier über Brust und Schultern
der Büste); die Zone selbst bleibt, die Knoten-Beschriftungen und der Hintergrund weichen ihr weiter aus. Dazu der CSS-Verlauf `.chapter__text::before` (0.78) und im Hochformat ein
linearer Verlauf vom unteren Rand (`.chapter__panel::before`). Die Knoten-Links weichen derselben Zone aus. Fixe Panels:
die Zone wandert nicht mit (Hero und Ausklang wandern mit). Die Wörter steigen per GSAP aus einer Maske auf (`js/ui.js`, `panel()`); `gsap.ticker.lagSmoothing(0)`
sorgt dafür, dass das in echter Zeit läuft, auch wenn ein 3D-Frame länger dauert.

Folgen für Szenen (Android-Büste siehe Kapitel 11): Der Röntgen-Wechsel ist ein Scan: eine helle, dünne Linie läuft von zoom@0.3 bis zoom@0.84 von oben nach
unten (`uScanY`, Kopf bis ~zoom@0.64), darüber Röntgen-Hologramm, darunter noch Schale. Im Röntgen bleiben nur Kopf und Hals
(Hologramm der Schultern blendet aus, Hals auf 30 %). Das Hologramm bleibt leise um das Gehirn, bis die Kamera bei brain@~0.45
eintaucht (Fenster robot bis brain@0.6). Die Rumpf-Unterkante blendet über die Deckkraft aus (Rumpf-Material transparent). Im Beat `brain` fliegt die Kamera danach durch das
Gehirn und hinten hinaus. Kabel und Knoten müssen aus beiden Blickrichtungen gut aussehen (von hinten aus dem Gehirn und von der Seite).

## 6. Look, Bloom und Farbe

Bild-Pipeline: Szene rendert linear in HalfFloat (HDR) -> UnrealBloom -> OutputPass (ACES Filmic + sRGB) -> FxPass
(FXAA ohne MSAA bei DPR unter 1.6, Aberration, Scrim hinter dem Text, Vignette, Blitz, Abblende, Abdunkeln, Korn).

**Bloom steuern**

- Leuchten entsteht über Helligkeit, nicht über Extra-Passes. Schwelle `bloomThreshold` 0.72 (linear, vor dem Tonemapping).
- Leuchtende Teile: Farbe über 1 setzen, z. B. `palette.signal.clone().multiplyScalar(3)` in `MeshBasicMaterial` oder im eigenen Shader.
  Faustregel: 1.5 = sanfter Schein, 3 = deutlicher Glow, 5 = sehr hell (Funken, Impulse). Flächen unter ~0.7 leuchten nicht.
- Additive Partikel (`AdditiveBlending`, `depthWrite: false`) summieren sich: bei vielen Punkten die Farbe eher tief halten.
- Pro Szene über `look`: `bloom` (Stärke), `bloomRadius`, `bloomThreshold`.
- **Nie NaN oder Unendlich ins Bild:** Ein einziger solcher Bildpunkt wird im Bloom zu grossen schwarzen Rechtecken
  (Abnahme Version 3: `exp(-abEdge / 0.0045)` in der Schale lief an Öffnungen mit negativem Abstand gegen Unendlich, mal 0
  auf der Innenseite gab NaN, sichtbar bei zoom@0.24 bis 0.31). Argumente von `exp()` begrenzen (`max(x, 0.0)`), keine
  Division durch Werte, die 0 werden können, und `pow()` nur mit Basis ab 0. Prüfen: `S/fuer-jonas-tools/nanprobe.js beat@p,...`
  rendert die Szene in ein Float-Ziel und nennt die Objekte mit NaN/Inf.

**Look-Werte** (`BASE_LOOK` in config.js). Eine Szene setzt in `api.look` nur, was sie ändern will, und darf die Werte pro Frame anpassen.

| Schlüssel | Basis | Wirkung |
| --- | --- | --- |
| `exposure` | 1.0 | Belichtung (Tonemapping) |
| `bloom`, `bloomRadius`, `bloomThreshold` | 0.85, 0.55, 0.72 | UnrealBloom |
| `aberration` | 0.006 | chromatische Aberration zum Rand hin (nur Stufe high) |
| `vignette` | 0.75 | Randabdunkelung 0..1 |
| `grain` | 0.045 | Filmkorn (24 Bilder/s), verhindert auch Banding |
| `fogDensity` | 0.035 | `FogExp2`, Farbe = Nebelfarbe der aktuellen Farbwelt (`fogColor`, setzt backdrop.js) |
| `env` | 0.35 | Stärke der Spiegelungen (`scene.environmentIntensity`) |
| `key`, `rim`, `amb` | 1.3, 2.0, 0.12 | warmes Führungslicht in Ember (links vorne), Cyan-Kantenlicht (rechts hinten), Hemisphäre. Nur der Roboter nutzt Lichter (Android-Büste: key nur 0.14 bis 0.45, rim 1.4 bis 1.8; der Glanz kommt aus ihrer eigenen Studio-Umgebung) |
| `rimWarm` | 0 | Farbe des Kantenlichts: 0 Signal-Cyan, 1 warmes Gold (engine mischt `lights.rim.color`, ohne Allokation). Ausklang 0.85 |
| `parallax`, `drift` | 0.22, 0.025 | Maus-Parallax und Schweben der Kamera (im Kopf/Gehirn klein halten) |
| `flash` | 0 | additiver Lichtblitz 0..1, klein in Signal-Cyan, ab ~0.3 weisser (Schnitt) |
| `fade` | 0 | Abblende zu Schwarz 0..1 (am Schnitt nur leicht, der Runner setzt dort vor allem `flash`) |
| `dim` | 0 | Abdunkeln. main setzt bis 0.62, sobald die normalen Inhalte kommen |

Helles Thema: Grundwerte `BASE_LOOK_HELL`, die Schlüssel in `THEME_LOOK_KEYS` kommen dort nur aus `lookHell` der
Szenen (Kapitel 14).

Mischregel: Für jeden Schlüssel zählen nur Module, die ihn setzen, gewichtet mit `weight`. Summe der Gewichte unter 1: Rest kommt aus
`BASE_LOOK`. Über 1: gewichteter Mittelwert. So blenden Looks bei Übergängen weich.

**Farben** (`HEX` in config.js = CSS-Variablen in style.css, gleiche Werte):

| Name | Hex | Einsatz |
| --- | --- | --- |
| `void` | #04060a | Clear-Farbe (vom Hintergrund-Modul überdeckt), Abblende |
| `deep` | #070b12 | tiefe Flächen |
| `ink` | #0d141d | Schale des Roboters, Paneele |
| `steel` | #2a3644 | Kanten, Linien im Schatten |
| `mist` | #8a99a8 | gedämpfte Linien |
| `white` | #e9f2f7 | kühles Weiss |
| `signal` | #46e6ff | **Akzent**: Licht, Daten, Impulse, Kabel |
| `ice` | #bdf6ff | heller Kern von Cyan-Glow |
| `ember` | #ffa45c | **Gegenlicht**: warme Funken, Kerne, das Menschliche (sparsam, etwa 10 %) |
| `emberDeep` | #ff7a2e | tiefes Warm |

Typografie: Geist (Titel 500, eng gesetzt, Laufweite -0.04em) und Geist Mono (Labels, Code, Grossbuchstaben, Laufweite 0.16em).
Für Zeichen in Texturen: `document.fonts.load('500 64px "Geist Mono"')` abwarten, dann in ein Canvas zeichnen.

## 7. Qualität und Leistung

| Stufe | Wann | DPR | MSAA | Partikel-Faktor | Aberration | Roboter |
| --- | --- | --- | --- | --- | --- | --- |
| high | Desktop (Maus, Fenster ab 760 px, auch 1280 x 800) | bis 2, Budget 3.5 MP | 4x, nur wenn DPR unter 1.5 | 1 | ja | Büste 2 x Catmull-Clark (~69k Ecken), 76 Kabel (Version 3.2, vorher 112), Klarlack 1.0 (Rauheit 0.06), Muskel-Innenstruktur, Hologramm auf Stufe 1 |
| medium | Touch (`pointer: coarse`) oder Fenster unter 760 px | bis 1.5 | nein, dafür FXAA | 0.5 | nein | 1 x Catmull-Clark, 36 Kabel, ohne Klarlack (im Ausklang glatter, Rauheit 0.11, mehr Spiegelung) (Grundschicht glatter, 0.2), ohne Rillen und Innenstruktur (`AB_CHEAP`), Fresnel und Fasern im Gel bleiben |
| low | 2 GB RAM oder 2 Kerne | 1 | nein, FXAA | 0.25 | nein | wie medium |

- Bloom läuft immer in halber Auflösung (UnrealBloom intern), Stufe low noch etwas kleiner.
- Pixelbudget: DPR höchstens `sqrt(3.5e6 / (Breite x Höhe))` (mindestens 1), z. B. 1440 x 900 mit DPR 2 -> 1.64.
- Adaptive Auflösung, dauernd aktiv (je 1 s gemessen): über ~29 ms pro Frame zuerst MSAA aus, dann DPR-Skala in Schritten
  bis 0.5 runter; mit Reserve (unter ~19 ms, 4 s lang) langsam um 0.1 wieder rauf, nach jedem Absenken 20 s Pause (Hysterese).
  Grundtakt: in den ersten 45 Bildern wird der Median des Bildabstands gemessen. Liegt er eng um 33 ms (iOS-Stromsparmodus,
  Chrome-Energiesparen, Android Battery Saver drosseln requestAnimationFrame auf 30 Hz), gilt 30 Hz als Basis: dann erst
  über 1.2 x Basis (40 ms) senken und unter 1.05 x Basis wieder anheben. Sonst würde die Auflösung ohne Grund aufs Minimum fallen.
- MSAA nur auf `composer.renderTarget1` (dort rendert die Szene), `renderTarget2` bekommt nur fertige Vollbild-Passes (0 Samples).
  FXAA läuft ohne MSAA bis DPR 1.75 (z. B. MacBook 1440 x 900 bei DPR 1.64, dort ist MSAA aus).
- Langsamer Start (Version 3.1): iOS liefert kein `navigator.deviceMemory`, jedes iPhone landet auf medium. Liegt der Median
  der ersten 45 Bilder (nicht gedrosselt) über 45 ms, rendert die Engine sofort wie Stufe low (`engine.slowStart`: MSAA aus,
  DPR-Skala 0.62). Die Szenen bleiben auf ihrer Stufe (ein Umbau zur Laufzeit wäre teurer als der Gewinn).
- Ladezeit (Version 3.1): Catmull-Clark der Büste läuft im Web Worker (`robot-mesh-worker.js`, Ergebnisse als Transferables),
  Stufe 1 für alle, Stufe 2 nur auf high. Fällt der Worker aus (kein Modul-Worker, Fehler, 9 s ohne Antwort), rechnet der
  Hauptthread. Ohne `KHR_parallel_shader_compile` kompiliert `engine.warmup()` Szene für Szene mit einem Bild Pause
  dazwischen (kein langer Block). Die Mechanik-Materialien teilen Programme (Schlüssel nur aus kind und '-scan').
- Shader-Vorkompilierung (Version 3.2): `engine.warmup()` kompiliert mit dem Render-Target des Composers. Vorher ohne Ziel
  (Bildschirm): three.js baute dann jedes Programm mit ACES und sRGB-Ausgabe, die Szene rendert aber linear in den
  Composer. Ergebnis war jedes Programm doppelt (94), die richtigen entstanden erst beim ersten Bild. Jetzt 53 Programme
  auf high und medium, nach einem Durchlauf durch alle Beats kommt keines dazu (`renderer.info.programs.length`).
- Sicherheitsnetze in `main.js`, alle führen in denselben statischen Fallback (`toFallback`: Loop und ScrollTrigger weg,
  Director und Szenen entsorgt, Overlay geleert, GSAP-Stile entfernt, Panels bedienbar):
  Start über 15 s, WebGL-Kontext verloren, FPS-Wächter (trotz kleinster Auflösung 3 s lang unter 20 fps).
- Notausgang im Kopf von index.html: läuft `main.js` nach 20 s (Tests 75 s) nicht (`window.__studioMain` fehlt, z. B. Netzabbruch
  oder Parse-Fehler), wechselt die Seite selbst auf `no-gl` und blendet den Preloader aus. Für `[data-reveal]` gibt es eine
  CSS-Sicherung (nach 3 s sichtbar), solange `html.ui-on` fehlt (das setzt ui.js beim Start).
- Software-Rendering (SwiftShader, llvmpipe, Microsoft Basic Render, `failIfMajorPerformanceCaveat`) bekommt schon im Kopf
  von index.html den Fallback. Ausnahmen für Tests: `navigator.webdriver` (Playwright), `?q=...` oder `?gl` setzen
  `html[data-gl-force]` (Software-GL erlaubt, kein FPS-Wächter, Start-Netz 60 s). `?glcheck` prüft auch in Tests streng.
- URL-Parameter: `?q=high|medium|low` erzwingt eine Stufe (ohne Anpassung), `?debug` zeigt FPS, Draw Calls und Modul-Zustände,
  `?nogl` erzwingt den statischen Fallback.
- Budget pro Szene (Stufe high, Richtwerte): höchstens 40 Draw Calls, 600k Dreiecke, 60k Punkte/Instanzen. Mengen immer mit
  `tier.particles` multiplizieren.
- Hintergrund (backdrop, immer aktiv): 1 Draw Call, 1 Dreieck, pro Bildpunkt höchstens 5 Zugriffe auf das 32³-Rausch-Volumen
  (high), 4 (medium), 2 (low). Details Kapitel 12.
- Gemessen auf der ganzen Seite (Version 3, 30.10.2026, `renderer.info` pro Bild inklusive Bloom und Post-Passes):

  | Stelle | high (Desktop 1440 x 900) | medium (iPhone 13) |
  | --- | --- | --- |
  | Hero (intro) | 20 Draw Calls, 2k Dreiecke, 37k Punkte | 19 Calls, 19k Punkte |
  | Übergang Partikel zu Büste (robot@0.3) | 34 Calls, 635k Dreiecke, 37k Punkte | 32 bis 41 Calls, 91k bis 167k |
  | Büste fest (robot@0.75) | 45 Calls, 528k | 42 Calls, 136k |
  | Röntgen (zoom@0.45 bis 0.75) | 48 bis 51 Calls, 766k bis 773k, 59k Punkte | 48 bis 50 Calls, 229k, 30k Punkte |
  | Im Gehirn (brain@0.75) | 29 Calls, 143k, 61k Punkte | |
  | Ausklang | 42 Calls, 526k | 42 Calls, 136k |

  Version 3.1 (dev.html mit Hintergrund, high): Büste fest 44 Calls, 441k Dreiecke (vorher 528k); Röntgen zoom@0.6 50 Calls,
  579k (vorher 773k, jetzt unter dem Budget von 600k). Grund: Muskel-Gel nur in den Öffnungen, Hologramm auf Stufe 1.
  Das Röntgen ist die teuerste Stelle (Büste, Gehirn und Gehirn-Hardware gleichzeitig). Director, Runner, Szenen und
  Mechanik legen pro Bild keine Objekte an (Vektoren, Matrizen, Farben werden wiederverwendet). Ganz ohne Garbage ist ein
  Bild trotzdem nicht: three.js selbst (Render-Listen, Matrizen, Uniform-Upload) und Zahlenwerte in JS-Objekten erzeugen
  pro Bild kurzlebige Daten. Gemessen in Runde 2 (medium, 960 x 600, `S/review-tech-scripts/garbage2.js`): vorher 102 KB
  (robot@0.75), 90 KB (zoom@0.6), 70 KB (cables@0.4); nach Version 3.2 rund 74, 75 und 71 KB. Hauptgrund für die
  Verbesserung: kein Material wird mehr von verschiedenen Programmen geteilt (siehe unten), `getParameters` läuft nicht
  mehr pro Bild.
- **Ein Programm pro Material (Version 3.2):** three.js wechselt das Programm eines Materials, sobald es an Objekten mit
  anderen Parametern hängt (InstancedMesh und Mesh, DoubleSide transparent in zwei Durchgängen). Darum haben die Kolben
  (InstancedMesh) eigene Chrom- und Graphit-Materialien, Schale und Glaskappe sind je zwei Meshes mit einer Seite pro
  Material (aussen `FrontSide`, innen `BackSide`, Innenseite zuerst bzw. Schale aussen zuerst). Prüfen:
  `renderer.properties.get(material).programs.size` muss für jedes Material 1 sein.
- **Schale in zwei Draws (Version 3.2):** erst die Aussenseite (renderOrder 2), dann die Innenseite (3). Verdeckte
  Innenflächen verwirft der Tiefentest, die teure Beleuchtung läuft nur noch dort, wo man durch eine Öffnung hineinsieht
  (vorher DoubleSide in einem Durchgang: jede Rückseite wurde voll schattiert). Die Innenhaut blendet bei ganz streifendem
  Blick aus (keine zwei hellen Lagen als Spitzen an dünnen Kanten).
- `vendor/three/addons` enthält seit Version 3.1 nur noch die 12 genutzten Dateien (vorher rund 890 KB Ballast).
- Seitengewicht beim ersten Laden (mit 3D, ungezippt): rund 1.7 MB inklusive `bust.bin` (76 KB), davon three.js 690 KB,
  GSAP 115 KB, Schriften 52 KB. GitHub Pages liefert gzip: rund 0.57 MB über die Leitung. Poster und `og.jpg` lädt nur der
  Fallback bzw. ein Link-Vorschau-Dienst.
- Rendern pausiert bei verstecktem Tab. Im Inhaltsbereich (3D nur abgedunkelter Hintergrund, `contentDim` über 0.98) wird ein
  letztes Bild gerendert und dann angehalten, bis man wieder in die Story scrollt. Karten und Formular verzichten dort auf
  `backdrop-filter`.
- Ladekette: Der Kopf von index.html legt mit 3D `modulepreload`-Links für three.js, Engine, Addons und alle Szenen an
  (alles parallel statt als Kette). Im Fallback wird nichts davon geladen. Die Import-Map steht **vor** diesem Skript:
  sonst kann ein vorgeladenes Modul `three` auflösen, bevor die Map bekannt ist (selten, unter Last beobachtet: Fehler
  "Failed to resolve module specifier three", Start im Fallback).

## 8. Konventionen

- **Dateinamen**: `js/scenes/<name>.js`, Name wie in `MODULES`. Hilfsdateien einer Szene als `js/scenes/<name>/*.js` oder
  `js/scenes/<name>-*.js`. Gemeinsame Hilfen nur nach Absprache in `js/lib/`.
- **Farben als Konstanten**: nur `ctx.palette` / `HEX` verwenden, keine neuen Hex-Werte in Szenen. Helligkeit über `multiplyScalar`.
- **Masse**: nur `ctx.anchors`, keine eigenen Positionen für Kopf, Gehirn, Knoten.
- **Shader**: inline als Template-String mit `/* glsl */`. Gemeinsame Uniforms aus `ctx.shared` einhängen (nicht kopieren).
  Punktgrösse perspektivisch korrekt: `gl_PointSize = worldSize * projectionMatrix[1][1] * uResolution.y * 0.5 / -mvPosition.z`
  und mit `min(..., 64.0)` begrenzen. Nebel in eigenen Shadern selbst lösen (Tiefe ausblenden) oder `fog: true` mit Fog-Chunks.
- **Hintergrund**: kein eigener Hintergrund in Szenen (keine Kugeln, Flächen oder `scene.background`). Den Raum hinter
  dem Motiv zeichnet nur `backdrop.js` (Kapitel 12). Braucht eine Szene eine andere Stimmung, wird ihre Farbwelt in
  `BACKDROPS` (config.js) angepasst. Seit Version 3 gibt es keine Ausnahme mehr (Nebelkugel der Partikel und eigener
  Lichtkegel der Büste sind entfernt).
- **Keine neuen Lichter** in Szenen (wechselnde Lichtanzahl kompiliert alle Shader neu und ruckelt). Licht über `look.key/rim/amb`
  oder Emission/Glow im Material.
- **Transparenz**: `transparent` einmal beim Erzeugen festlegen und danach nur `opacity` ändern (Umschalten kompiliert neu).
- **Alles in create() erzeugen**: Materialien, Geometrien, Texturen. main kompiliert danach alle Shader vor (alle Gruppen sichtbar),
  damit Übergänge nicht ruckeln. Später keine neuen Materialien anlegen.
- **Keine Allokationen pro Frame**: Vektoren, Farben, Arrays im Modul wiederverwenden.
- **Zufall deterministisch** (Seed, z. B. mulberry32), damit jedes Laden gleich aussieht.
- **Keine externen Dateien**: alles prozedural. Keine fremden Modelle, keine CDNs.
- **frustumCulled = false** für Punktwolken mit Shader-Verschiebung (sonst verschwinden sie am Rand).
- **dispose()**: jede Geometrie, jedes Material, jede Textur, jedes DOM-Label wieder entfernen.
- **Beschriftungen** im 3D (z. B. "E-Mail", "Website"): als DOM in `ctx.overlay` mit Klasse `.gl-label`, Position per
  `vector.project(camera)` pro Frame setzen (transform), bei `setActive(false)` ausblenden.
- Sprache in sichtbaren Texten: Deutsch, Sie-Form, ss statt ß, keine Gedankenstriche, keine Emojis.

## 9. HTML und CSS

Version 4: Die Startseite entsteht aus `_src/pages/start.js` (Kapitel `CHAPTERS`, Teaser) und `_src/layouts/story.js`
(Kopf mit gl-Entscheid, Notausgang, Import-Map, modulepreload, HUD, Überspringen). Kopfzeile, Fusszeile, Menü, FAQ,
Formular und Einblenden der hellen Inhalte gehören dem Fundament (`js/site.js`, `css/site.css`).

- Story: `#story` mit 7 Abschnitten `[data-scene]` (Reihenfolge wie `BEATS`): sechs `<section class="chapter">` mit
  `.chapter__panel > .chapter__text` und ein `div.chapter--image` für den Flug ins Gehirn (ohne Text, `aria-hidden`).
  Mit 3D (`html.gl`) sind die Abschnitte `--len` vh hoch; Panels siehe Kapitel 5 (Text-Panels).
- Der Director setzt pro Abschnitt: `--p` (Fortschritt 0..1 nach Scroll, ungedämpft), `--o` (Sichtbarkeit), Klasse `.is-on`.
- Hochformat-Layout (Text unten, Fortschrittsbalken oben statt HUD) gilt bei `max-width: 760px` **oder** Seitenverhältnis
  unter 0.85 (`max-aspect-ratio: 17/20`), also genau dann, wenn auch die Kamera ihre Hochformat-Werte nimmt.
- `html[data-theme]`: `dunkel` (Standard) oder `hell`, früh im Kopf gesetzt (Kapitel 14). Sitzt wie `gl` auf `<html>`:
  Selektoren darum `[data-theme="hell"].gl ...`, nicht `[data-theme="hell"] .gl ...`.
- Klassen auf `<html>`: `gl` oder `no-gl` (früh im Kopf entschieden: WebGL2, importmap, keine reduzierte Bewegung),
  `reduced`, `is-ready` (Preloader fertig), `is-content` (Inhaltsbereich erreicht, HUD aus), `ui-on` (ui.js läuft),
  `nodes-on` (Knoten-Links über der Szene, Kapitel 13), `data-beat` (aktueller Beat).
- HUD unten rechts: `00/06` (Beats ab 00, die Zahl hinter dem Schrägstrich rechnet `_src/layouts/story.js` aus
  `CHAPTERS`), Teilstriche, Name des Beats (`BEATS[].label`).
  **Regel:** Die Nummern der Text-Stationen (`kicker` in `_src/pages/start.js`) folgen derselben Zählung wie das HUD:
  01 Entlastung, 02 Was KI kann, 04 Verbindung, 05 Websites, 06 Einstieg (03 ist der Flug ins Gehirn ohne Text, HUD
  "Im Kern"). Im Fallback ohne WebGL fehlt die 03 darum bewusst: der Flug ist dort ein reines Bild (`aria-hidden`), ein
  HUD gibt es nur mit 3D. Wer einen Beat einfügt oder entfernt, nummeriert alle folgenden Kicker neu. Abnahme 01.11.2026: vorher stand
  "03 Verbindung" neben "04/05" im HUD; mit dem wieder eingebauten Kapitel Code wurde der Ausklang von 05 zu 06.
- Weiches Scrollen: `scroll-behavior: smooth` nur ohne 3D (`html:not(.gl)`). Mit 3D verfälscht es die Messung von ScrollTrigger
  beim Refresh (Handy drehen). Anker-Links scrollen dort per JS weich (`ui.initAnchors`, Fokus geht ans Ziel).
- Drehen des Handys: `ignoreMobileResize: true` bleibt (Adressleiste löst keinen Refresh aus), main.js misst bei jeder
  Breitenänderung und bei `screen.orientation` 'change' selbst neu (`ScrollTrigger.refresh()`, 150 ms entprellt).
- Überschriften mit `data-split`: ganzer Satz als `aria-label`, die Wort-Spans sind `aria-hidden` (VoiceOver liest sonst Wort für Wort).
- Skip-Link "Zum Inhalt springen" auf `main#inhalt` (H1 und die zwei Wege zuerst; die Pille "Animation überspringen"
  führt dagegen an der Geschichte vorbei auf `#weiter`).
- Fallback (`no-gl`, `no-js`, reduzierte Bewegung): kein Canvas, jeder Abschnitt ist mindestens bildschirmhoch und zeigt sein
  Posterbild (`.chapter__poster`, `assets/img/poster-<beat>.webp`, im Hochformat `poster-<beat>-m.webp`) mit Verlauf für
  die Lesbarkeit, das Bild-Kapitel brain 70 vh. Die Poster sind echte Renderings der Szenen (ohne UI und ohne Korn) und
  werden nur im Fallback geladen. Die fünf Werkzeug-Links stehen dort als Pillen im Text. Das Kapitel Code hat sein
  Poster `poster-dna(-m).webp` (Helix aus Code); die Angebotszeile gibt es im Fallback nicht.
- Blende der Story-Panels: `--oo = clamp(0, (--o - 0.2) / 0.6, 1)` macht sie steil (Text ist voll da oder weg, nie lange
  halb transparent über dem Bild). Im Ausklang liegt die Deckkraft auf `.chapter__text` statt auf dem Panel: ein Vorfahre
  mit opacity unter 1 würde zur "Backdrop Root" und der Blur der Karte sähe das 3D-Bild nicht mehr.
- Hero: "KI für meinen Betrieb" (`ki/`, Hauptweg) und "Neue Website" (`websites/`), darunter die Mono-Zeile
  "KI-Check zum Fixpreis · Preise offen · Mensch entscheidet". Der dunkle Verlauf hinter dem Hero-Text reicht rechts nur
  3 % über den Titel hinaus (sonst graue Partikel-Büste).
- Ausklang: ab `html[data-beat="outro"]` zeigt die Kopfzeile ihre feste Leiste. Titel kleiner als in Version 3
  (`.headline--xl` höchstens 4.1rem), damit die Glas-Karte bei 1440 x 900 unter die Kopfzeile passt.
- Eigener Cursor: nur ein dekorativer Ring, der Systemzeiger bleibt sichtbar.
- **Teaser unter der Geschichte** (`.content#content`, hell, `data-light` schaltet die Kopfzeile auf hell, das 3D-Bild
  dunkelt ab und hält an): `#weiter` Zwei Wege (Karte KI mit Kabel-Schema: vier Programme, KI, Sie entscheiden; Karte
  Website mit Handy-Schema), `#werkzeuge` (vier Werkzeug-Kacheln, Branchen-Zeile), `#ausprobieren` (Ausschnitt des
  Demo-Assistenten als statisches Bild mit Abzeichen, Preis-Karte KI-Check), `#vertrauen` (Preise, Sicherheit,
  Support, Referenzen), `#wer` (Über mich, Satz "KI entlastet Ihr Team, sie ersetzt niemanden."), Abschluss-Band.
  Grafiken mit Klassen `st-*` in `css/story.css`, dekorativ (`aria-hidden`) bzw. der Demo-Ausschnitt als `role="img"`.
- Alte Anker der einseitigen Version (`#kontakt`, `#leistungen`, `#fragen`, `#faq-...`) leiten auf die neuen Seiten um
  (`layouts/story.js`, `REDIRECTS`).

## 10. Testen

```
node S/tools/studio_capture.js S/studio/<name> 'studio/?q=high' --steps=12
node S/tools/studio_capture.js S/studio/<name> studio/ --mobile
node S/tools/studio_capture.js S/studio/<name> studio/ --nowebgl
node S/tools/studio_capture.js S/studio/<name> 'studio/dev.html?scene=robot&q=high' --steps=8
node S/tools/story_shots.js S/studio/<name> robot@0.3,zoom@0.35,cables@0.4 [--mobile] [--clean] [--nograin] [--vp=1200x630]
S/tools/make_posters.sh      # Poster (Desktop, Hochformat) und OG-Hintergrund rendern
python3 S/lead/convert_posters.py && node S/studio/og/render.js   # PNG -> WebP-Poster, OG-Bild (danach og.png -> og.jpg)
node S/lead/techcheck.js S/lead/tech   # Tab-Reihenfolge, Kontextverlust, Handy-Menue, Formular-Timeout, ?glcheck
```

Hellmodus: Test-Schalter `?hell` und `?dunkel` (z. B. `--page='?q=high&hell'`), helle Poster und Werkzeuge in Kapitel 14.

Poster (Version 4 mit Kapitel Code, sieben Abschnitte): intro@0.06, robot@0.95, zoom@0.85, brain@0.3, cables@0.6, dna@0.42,
outro@0.7, OG-Hintergrund
intro@0.06 (Partikel-Büste im Ruhezustand des Hero, 1200 x 630). Aufnahme ohne Kopfzeile, HUD, Panels und Knoten-Links
(`--clean` blendet `.tool-links` und `.node-hits` mit aus).

Version 4, weitere Werkzeuge (Arbeitsordner `studio-arbeit/v4/start-work/tools/`): `probe.js` (Zustand an beat@p ohne
Bilder: Fenster, Module, Panels, Knoten-Links mit Lage und tabindex), `tempo.js` (Logik-Test der Tempo-Grenze mit 60
Bildern pro Sekunde: schneller Wisch in das Gehirn, durch das Gehirn, ausserhalb, Sprung), `pres.js` (dev.html mit fester
Kamera, `REPO=` für einen Vergleich mit einer älteren Fassung).

Design-Abnahmen immer mit fester Stufe aufnehmen (`studio/?q=high` Desktop, `studio/?q=medium` Handy): sonst senkt die
adaptive Auflösung in SwiftShader die DPR auf 0.6 bis 0.75 und die Bilder sind weicher als auf echten Geräten.

Playwright setzt `navigator.webdriver`: Die Seite nimmt darum auch in SwiftShader die 3D-Strecke (`data-gl-force`), ohne
FPS-Wächter. Echte Besucher mit Software-Rendering bekommen den Fallback; das prüft `?glcheck`.

`story_shots.js` springt direkt an `beat@p` (ohne Daempfung) und macht je ein Bild, ideal fuer Kamera-Feinarbeit.

SwiftShader-Eigenheiten (keine Fehler der Seite, mit Version 3 geprüft): Nach einem grossen Sprung (z. B. von brain direkt
nach outro@0.1) zeigt das nächste Standbild manchmal noch ein älteres Bild aus der GPU-Warteschlange (Code-Gerüst statt
Büste); direkt geladen oder mit längerer Wartezeit stimmt es. Ebenso bleiben `[data-reveal]`-Blöcke nach einem Sprung in
den Inhaltsbereich ein paar Sekunden unsichtbar, weil ein Screenshot in SwiftShader rund 30 s dauert und die Zeitachse der
CSS-Übergänge solange steht. `studio_capture.js` wartet darum bis 240 s auf jedes Bild.

(`S` = Scratchpad-Ordner der Session.) `?q=high` verhindert, dass die adaptive Auflösung im langsamen SwiftShader die DPR senkt.

dev.html:

- `?scene=backdrop|particles|robot|brain|cables|dna|all` oder mehrere mit Komma (`scene=robot,brain` für den Röntgen-Zoom: die erste
  Szene bestimmt `local` und bleibt aktiv, die weiteren laufen in ihren Fenstern), `&local=0.4` (Startwert), `&at=zoom@0.4`
  (fester Punkt der Story), `&cam=orbit` (ziehen, Mausrad) oder `&cam=fix&pos=x,y,z&tgt=x,y,z&fov=30`, `&q=high`,
  `&post=0` (ohne Postprocessing), `&play` (läuft selbst), `&scroll=0` (nur Regler). Der Hintergrund (`backdrop`) läuft
  wie auf der Seite immer mit, `&bg=0` schaltet ihn ab. `?scene=backdrop` allein fährt mit dem Regler durch alle Farbwelten
  (Kamerapfad der Seite). Szene robot zusätzlich: `&ab=mech|debug|glass|nobloom|nokey|noenv` (Diagnose).
- Scrollen auf der Testseite fährt `local` von 0 bis 1. Darum tastet `studio_capture.js` mit `--steps=N` das ganze Fenster ab.
- In dev.html laufen Director, Runner und Looks exakt wie auf der Seite (nur ohne Dämpfung, wenn "Daempfung" aus ist).
- Konsole: `window.__dev` (dev.html) und `window.__studio` (index.html) mit `engine`, `director`, `runner`, `ctx`.
  Beispiel: `__dev.setLocal(0.5)`, `__studio.director.beat('zoom')`. Für Standbilder: `__dev.freeze(true)`,
  `__dev.setAt('robot@0.9')`, `__dev.setCam('fix')`, `__dev.fix.pos.set(...)`, `__dev.advance(3)` (Zeit vorspulen, rendert
  das letzte Bild).

Keine Konsolenfehler und keine Warnungen: studio_capture.js meldet beides. Szenen nicht mit `console.log` im Loop debuggen.

## 11. Szene robot: Android-Büste

Jonas hat am 30.10.2026 Variante B gewählt: weisse, glänzende Android-Büste mit türkis-transparenten Muskelteilen, offenem
Hinterkopf mit Schädelgitter und Kabelbündeln. Der frühere Helm-Roboter und Variante A sind entfernt.

| Datei | Inhalt |
| --- | --- |
| `robot.js` | Einstieg (create), Ablauf pro Beat, Look, Hintergrund-Schalter |
| `robot-face.js` | Gesicht und Figur (Version 5, Gesicht D): Formen auf dem Kontrollnetz, Stil (`FACE_STYLE`: Lider, Fugen, Augapfel, schlanker Rumpf, Aufheller), `?gesicht=alt` |
| `robot-mesh.js` | `bust.bin` laden (einmal, Promise im Cache), Gesichtsausdruck (Lider, Mundwinkel), Catmull-Clark, Normalen |
| `robot-layout.js` | Fugen und Öffnungen als Felder (GLSL): Gesichtsplatten, Lidfuge, Hinterkopf-Fenster, Glaskappe, Brustplatte |
| `robot-materials.js` | Schale (Klarlack, Spaltmass als feine Rinne mit Fase), Muskel-Gel, Innenschale, Glas, Hologramm, Mechanik |
| `robot-mech.js` | Augen (Blick folgt dezent der Kamera, Hornhaut mit Glanzlicht), Hals, Schädelgitter, Kabel, Ohrmodul |
| `robot-env.js` | eigene Studio-Umgebung, nur für die Spiegelungen (PMREM). Den Raum dahinter zeichnet backdrop.js |
| `robot-geometry.js` | `makeHeadShape`: Kopfform für brain.js (Gehirn-Hardware sitzt an der Innenseite der Schale) |
| `particles-shape.js` | Zielpunkte der Partikel-Büste (gleiches Netz, gleicher Drehpunkt `HEAD_PIVOT` wie robot.js) |

- **Hintergrund:** keiner in der Szene. Das Studio-Gegenlicht hinter der Büste kommt aus der Farbwelt `robot` von
  backdrop.js (Kapitel 12). Der frühere eigene Lichtkegel (`buildBackdrop`, `ROBOT.ownBackdrop`, `?robotbg`) ist in
  Version 3 entfernt.
- Ablauf: Aufbau im Beat robot (Hologramm robot@0.08 bis 0.26, dann von unten fest bis robot@0.64, Augen schalten bei
  robot@0.64 bis 0.74 ein), Röntgen-Scan im Beat zoom (`robotScan`, gleiche Formel wie brain-hardware.js), Ausklang im
  Beat outro (Augen leuchten im Lichtblitz).
- Spaltmasse: keine verworfenen Pixel mehr (früher schwarzer Strich). Die Fuge ist eine Rinne (Halbbreite 0.0021 Einheiten)
  mit Fase und weichem Schatten; ist sie schmaler als ein Bildpunkt (Handy), wird sie heller statt breiter. Die Lidfuge ist
  nur eine halb so tiefe Falte (`lSeamK`).
- Poster (Fallback) und OG-Bild am 30.10.2026 mit der Android-Büste neu gerendert (Kapitel 10, `make_posters.sh`), für
  Version 3 nach den letzten Änderungen (Hero-Linien, Kern, Flachbandkabel) noch einmal.
- Budget der Szene allein (gemessen in dev.html, Version 3.1): high 44 Draw Calls, rund 441k Dreiecke (vorher 526k, Gel nur in
  den Öffnungen); im Röntgen mit Gehirn rund 579k (vorher 796k).
- Eintauchen ins Gehirn: Die Mechanik (Schädelgitter, Kabel, Hals, alle Materialien aus `makeMechMaterial`) löst sich von
  brain@0.3 bis 0.45 (Version 3.2, vorher 0.4 bis 0.58) mit feinem Korn und leiser Kante auf (`uMechFade`). Ohne das standen Gitter und Kabel von innen
  gross im Bild und verschwanden am Ende des Fensters (brain@0.6 plus Rampe, rund brain@0.71) schlagartig.
- Übergang Partikel zu Büste: gleiche Form (`particles-shape.js` tastet dieselbe Büste ab), gleicher Drehpunkt und dieselbe
  Kopfbewegung. Partikel treten zurück, sobald das Hologramm erscheint (robot@0.05 bis 0.22), und gehen an der Abtastebene
  (robot@0.26 bis 0.64) in die feste Schale über. Im Hero zeichnen hellere Linien-Partikel Fugen, Augenringe und
  Plattenkanten nach, die Pupillen leuchten ruhig; der Kern im Kopf ist bei fertiger Form auf ein Drittel gedimmt.
- Kabel im Nacken: siehe Version 3.1 unten (Fächer aus vier Steckerleisten statt sieben Strängen).

### Version 3.1 (Runde 1 der Prüfer, 30.10.2026)

- **Schale:** weisse Glanzschale (Albedo um 0.85, kaum Blaustich), Klarlack 1.0 mit Rauheit 0.06 (nur high; medium ohne
  Klarlack, Grundschicht 0.2). Helligkeit auf der Seite gemessen: Stirn rund 207, Wange 191 (vorher 113 und 88, Ziel
  mindestens 161 wie `final-1-front.png`). Licht (`robot-env.js`): Führungsfläche jetzt **rechts vorne** (die Kamera der Seite
  steht fast immer bei +x), Aufheller links, zwei schmale, harte Streifen (oben links 14, hinten rechts 11) für lange
  Glanzlinien. Belichtung robot 1.13, Ausklang 1.12 (Handy 1.2). Die Schale wird bei 1.45 begrenzt, Bloom-Schwelle 1.5:
  scharfe Glanzlinien ohne Lichthof um die Silhouette.
- **Kanten:** Öffnungen mit weicher Deckung über etwa einen Bildpunkt (`abOpenA`, `abDeepA`) statt `discard`. Innenseite der
  Schale hell (`uShellIn`), direkt an jeder Öffnung eine helle Wandfläche (0.012 bis 0.024): wirkt wie ein Formteil mit
  Materialstärke statt Papier.
- **Fugen:** immer dunkle Rinne mit hellem Grat. Leuchten nur als kurzer Impuls von oben nach unten (zoom@0.24 bis 0.31,
  `uEdgeY`), danach aus.
- **Ohrmodul:** Drehprofil umgedreht (vorher zeigten Vorderseiten und Normalen nach innen, man sah durch das Loch der
  Ohrmuschel ins Dunkle: "schwarzer Aufkleber"). Jetzt helle Keramik mit Stufe, 128 Segmente, Gitter in gebürstetem Metall.
- **Muskel-Gel:** dunkler Kern, helle Fresnel-Kanten (0.5), zweite Faserlage tiefer im Gel (Parallaxe), feinere Glanzlichter
  (Rauheit 0.12). Halsmuskeln mit schmalen Sehnen und Chrom-Hülsen an Schädel und Brustbein. Das Gel-Netz entsteht nur dort,
  wo die Schale offen ist (`openFieldJS`/`deepOpenJS` in robot-layout.js, gleiche Formeln wie GLSL, plus Rand 0.075).
- **Hinterkopf:** (Kabel in Version 3.2 neu, siehe unten) vier Steckerleisten am Kamm (Graphit, Chromrahmen, Status-Punkt), daraus fächern 112 (medium 44) Kabel nach
  hinten und unten auf: eigene Lage, eigener Durchhang (Buckel früh, bis rund 0.38), 4 Rillenschläuche, Chromstecker, zwei
  Schellen um die mittleren Gruppen, unten im Rückenschlitz zusammen. Kabel beginnen hinter der Innenschale (keine offenen
  Enden zwischen den Stäben). Gitterstäbe mit Lochreihe und Chrom-Manschetten (`lattice`), Querstreben in Chrom, drei kleine
  Platinen (`board`). Glaskappe mit sichtbarer Kante oben und unten. Dünne Kabel (`cable`, `hose`, `rubber`) werden im
  Vertex-Shader um etwa einen halben Bildpunkt aufgeweitet (`uRes`): kein Moiré und kein Flimmern in der Ferne.
- **Hologramm:** Rückseiten zeichnen keine Linien mehr (vorher schienen die Schulterblatt-Fugen als zwei Kreise durch die
  Brust), Lidfuge fast unsichtbar (keine "Taucherbrille"). Netz auf Stufe 1 (spart auf high rund 100k Dreiecke).
- **Partikel-Hero:** (in Version 3.2 geschärft, siehe unten) kein leuchtender Kern mehr. Alle Linienpunkte (Gesichtsplatten, Plattenkanten, Rand der
  Hinterkopf-Öffnung) sind im Hero da, gross und hell (Rumpf-Linien halb so hell, sonst Flecken am Schulterring), Flächen
  leiser, Kantenlicht von rechts hinten. Der Kopf steht im Hero um 0.55 rad zum Text gedreht (Dreiviertelansicht) und dreht
  bis intro@0.95 in die Ruhelage zurück (Übergabe an das Hologramm deckungsgleich). Kabel als Linienpunkte im Fächer, die
  langsam nach hinten unten wegfliessen (`KIND.cable` 1.25). Augen ohne Ringlinie.
- **Ausklang:** Kantenlicht gold (`look.rimWarm` 0.85), Farbwelt outro neutraler (base #07080a, mid #151210, Gold nur als
  Horizont und Gegenlicht rechts). Blick erst zur Kamera, ab outro@0.32 langsam zum Kontakt (links neben der Kamera, im
  Hochformat darunter), der Kopf dreht leicht mit (`ms.gazeAt`). Handy: heller (Belichtung 1.2, key 0.36).
- **Röntgen im Hochformat:** der Rumpf blendet im Röntgen nach unten aus (`uFall` bis y -1.75, auch das Hologramm), nur
  Kopf und Hals.
- **Gehirn (brain.js, brain-hardware.js):** Eintauchen brain@0.35 bis 0.95 mit halbem Bloom, Schwelle 1.12, Netz 45 %
  dunkler, nur drei Erregungswellen voll (die Welle aus dem Kern 1.05 statt 1.7). Elektroden-Stifte, -Köpfe und -Scheiben in
  Chrom (vorher Gold), Lüfterkappe ohne Ember. Nahe Hardware blendet beim Eintauchen früher aus (`uHwNear` bis 0.2 / 0.68).
- Testwerkzeug: `S/studio-v4/tools/pres.js <out> name=beat@p[|pos|tgt|fov]` rendert dev.html mit fester Kamera oder dem
  Kamerapfad (`name=robot@0.9` ohne Kamera = Pfad), `S/studio-v4/tools/lum.py` misst Helligkeit in einem Kasten.

### Version 3.2 (Runde 2 der Prüfer, 30.10.2026)

- **Hero, erstes Bild:** Die Partikel-Büste steht ohne Scrollen fertig geformt da. Linien (Fugen, Augenpartie, Ohrmodul,
  Rand der Hinterkopf-Öffnung) liegen praktisch auf der Fuge (Streuung x 0.08), Kopfflächen eng (x 0.35), der Rumpf bleibt
  lockerer. Weiches Führungslicht von links oben modelliert Stirn, Wangen und Kinn (vorher hohle Augen), Kantenlicht von
  rechts hinten stärker. Neu `uPreGain` (x Helligkeit, y Punktgrösse; Querformat 2.4 / 1.3, Hochformat 1.6 / 1.0) und
  `uPreSurf` (Anteil der Kopfflächen-Partikel: high 0.45, medium 0.9, gleich viele Punkte pro Bildpunkt). Im Hero wenig,
  enger Bloom (Stärke 0.38, Schwelle 1.0), sonst lag ein Nebelschleier über den feinen Linien; die eigene Helligkeit geht
  beim Formen zurück, der Bloom wieder auf den alten Wert. Der Titel dämpft den fertigen Kopf nicht mehr, Scrim im Hero 0.1.
  Dazu reicht der Verlauf hinter dem Hero-Text rechts nicht mehr über den Kopf (Kapitel 9). Gemessen (Desktop
  1440 x 900, Kopf): Mittel 62 -> 177. Hochformat 121 -> 162.
- **Gehirn-Eintauchen:** Die Gehirn-Hardware blendet von brain@0.34 bis 0.46 ganz aus und kommt erst in der
  Kabel-Übersicht zurück (cables@0.02 bis 0.18). Im Gehirn bleiben nur Neuronen, Impulse und Licht. Unsichtbare Hardware
  verwirft ihre Fragmente (schreibt keine Tiefe). Die Platinen haben keinen Lüfter, keine Kühlrippen, keine Heatpipes und
  keine lesbare Schrift mehr (flache Graphitmodule, nur Pin-1-Punkt und Rahmen); Klammer-Polster sind flache Chromscheiben
  mit hellem Chromring (vorher dicke schwarze Gummiköpfe mit Goldring, im Bloom orange).
- **Kabelfächer:** 76 Kabel (medium 36), dafür kräftiger. Jede der vier Gruppen hat eigene Dicke, eigenen Bogen und eigene
  Länge (Eintritt in den Rückenschlitz zwischen y -1.5 und -2.1), jedes Kabel eine Lage L: innen dicht am Nacken, aussen
  mit grossem Bogen nach hinten (bis rund 0.75 hinter dem Nacken, Scheitel früh bei t 0.25). Die Kabel laufen auf den
  Eintrittspunkt zu statt der Haut entlang (keine Wellen über den Schulterblättern), die Schellen sind weg. Dünne Kabel hell
  metallisch, mittlere und dicke dunkel, zwei der vier Rillenschläuche dunkel. Im Profil öffnet sich ein Fächer vom
  Hinterkopf statt eines Zopfs. Die Partikel-Kabel (`particles-shape.js`) folgen derselben Form.
- **Halsmuskel (Kopfwender):** kürzer (Ansatz bei y -0.6 statt -0.48) und flacher (Bauch 0.059 statt 0.085).
- **Hologramm, Augen:** In der Augenhöhle liegen Lid und Augapfel hintereinander, additiv ergab das helle, umrandete
  Ovale. Dort wird jede Lage halbiert und der Fresnel-Ring am Rand der Höhle unterdrückt.
- **Ausklang Handy:** Kein Scrim mehr über dem Kopf (der volle Scrim des Text-Panels machte das Gesicht grau, Mittel 106),
  der Blick senkt sich nur leicht (vorher kippte das Gesicht aus dem Führungslicht), Kopf etwas höher gerahmt
  (outro@1 lookM y -3.2), auf medium im Ausklang Rauheit 0.11 statt 0.2 und Spiegelung 1.65: schmale Glanzlinien. Der
  Verlauf hinter dem Kontakt-Text beginnt erst 22 px über dem Text (vorher 56 px, dunkler Balken über Mund und Kinn).
  Gemessen outro@0.7 (Gesicht): Mittel 106 -> 190.
- **Ausklang Desktop:** Ab Beat outro steht die feste Kopfzeilen-Leiste (`.site-header::after`), das Kontakt-Panel scrollt
  nicht mehr sichtbar hinter das Logo. Die Angebotszeile ist im Ausklang aus (das Panel hat dieselben Knöpfe).
- **Technik:** siehe Kapitel 7 (Vorkompilierung mit Render-Target, ein Programm pro Material, Schale in zwei Draws).
  Offen: echte Messung auf einem iPhone 11/12 und einem Mittelklasse-Android (Zeit bis `is-ready`, Bildzeit mit `?debug`).

### Version 4: Gesicht weicher (01.11.2026)

Rückmeldung Jonas (31.10.2026): Gesicht "spitzig, stutzig", die Kieferecken neben der Nase wirken speziell; Testkunden:
"kantig und starr". Umgesetzt ohne neues Netz, auf dem Kontrollnetz vor der Glättung (`softenFace` in `robot-mesh.js`,
aufgerufen am Ende von `applyExpression`, damit Schale, Partikel-Büste und Kopfform dasselbe Gesicht haben):

1. Kiefer zum Kinn hin schmaler (bis rund 9 % am Kieferwinkel) und dort leicht nach vorne gerundet.
2. Wangen gefüllt: die Mulde seitlich der Mundwinkel (unter dem Jochbein, über dem Kiefermuskel) hebt sich um bis zu
   0.03 nach vorne und 0.012 nach aussen.
3. Taubin-Glättung (16 Durchgänge lambda 0.5 / mu -0.53, ohne Schrumpfen) nur auf Wangen und Kiefer. Augenlider, Nase,
   Lippen, Ohr-Platte, Schädel und Hals haben Gewicht 0 (weiche Übergänge).

Fugen (`robot-layout.js`, gleiche Formeln in `particles-shape.js` für die Linien-Partikel): die Wangenfuge läuft als
flacher Bogen weiter aussen hinunter (`0.668 - 0.2 t²` statt `0.672 - 0.33 t^1.45`, sie zog vorher schräg zum Kinn und
bildete mit der Maske die Ecken neben dem Mund), geht mit einer Rundung (`lSmin` 0.02) in die Stirnfuge über und ist als
Plattenfuge flacher (`lSeamK` 0.7). Die Ecken der Gesichtsmaske sind runder (`lFace`: Rundung 0.11 und 0.1 statt 0.08
und 0.05). Vergleich vorher und nachher: `studio-arbeit/v4/start/1-gesicht-vorher-nachher.png`.

### Version 5: Gesicht D, schlanker und freundlich (08.11.2026)

Rückmeldung Jonas zu den Varianten A bis C vom 07.11.2026 (Ex-Machina-Stil, alle drei zu wenig verändert): "das Gebiss
immer noch zu mollig", "die Figur soll schon einiges schlanker sein", "die Backen sind eckig", "es soll freundlich
aussehen, es ist ja für eine Website und nicht einen Terminator-Film". Standard ist seither **Gesicht D** (aus Variante
B weiterentwickelt), `?gesicht=alt` zeigt zum Vergleich Gesicht und Figur von Version 4 (Shader-Text und Netz dann
genau wie in Version 4, geprüft gegen Commit 593bf90). Alles in `robot-face.js`, gelesen von `robot-mesh.js`
(`applyExpression(mesh, amt, face)`, der Worker bekommt das Gesicht als Parameter, weil er die Adresse der Seite nicht
kennt), `robot-layout.js` (Fugen), `robot-materials.js` (Rumpf, Aufheller), `robot-mech.js` (Augapfel) und
`particles-shape.js` (Partikel-Büste).

- **Form** (`sculptFace`, auf dem Kontrollnetz nach `softenFace`, also gleich für Schale, Hologramm, Partikel-Büste und
  Kopfform der Gehirn-Hardware): ganzer Kopf 4 % schmaler, dazu der untere Kopf von den Wangenknochen bis zum Kiefer
  (auch hinter dem Gesicht, das bildet vorne die Silhouette) und Wangen und Kiefer (vorne weniger als an den Seiten,
  sonst graue Flecken auf der Wange). Gemessen in der Vorderansicht gegen `?gesicht=alt`: Wangen 9 bis 11 %, untere
  Wange und Kiefer 14 bis 16 % schmaler. Kinn fein, leicht zulaufend und rund. Runde Wangen (Apfel unter dem Auge),
  weicher Wangenknochen, nur eine ganz leise Mulde darunter. Feinere, kürzere Nase. Lippen geschlossen (Mundöffnung
  bis auf 0.002 zu, Ober- und Unterlippe zur Mundlinie gestaucht, Mundlinie nach vorne: vorher hing die Oberlippe als
  Kante über einer dunklen V-Rinne), Amorbogen, Philtrum.
  Leises Lächeln (Mundwinkel 0.018 hoch, etwas nach aussen und zurück), Unterlid eine Spur gehoben, Oberlid entspannter
  (Anheben x 0.8, das Lid deckt den Irisrand knapp), Brauenbogen tritt zurück, die Mulde darunter ist gefüllt und ihre
  Verdeckung (aAO) aufgehellt. Die Landmarken (Augen, Mundlinie, Ohrmodule) wandern mit.
- **Fugen:** eine einzige Gesichtsplatte (nur der Maskenrand), keine Stirn- und keine Wangenfuge mehr (sie rahmten das
  Gesicht wie ein Helmvisier, die Wangenfuge bildete die Spitze am Kiefer), Lidfalte sehr leise (`lSeamK` 0.16).
  `particles-shape.js` zeichnet im Hero dieselben Linien.
- **Figur:** Rumpf schlanker über `abSlim` in `DEFORM_PARS` (und in `makeMechMaterial`): ab dem Hals (y -1.2) nach unten
  bis 10 % schmaler (Schultern, Arme) und bis 4 % flacher (um z -0.3). Nur die gezeichnete Lage ändert sich: Fugen,
  Öffnungen und Muskel-Gel rechnen weiter in der Ruhelage (`vRest`), darum passen Schulterring, Brustplatte, Gel,
  Mechanik und Kabelfächer ohne neue Masse. Instanzen (Kolben am Hals) bleiben ungestaucht (Fehler unter 0.01).
  `particles-shape.js` staucht die Zielpunkte gleich.
- **Licht:** Aufheller von unten nur im Gesicht (Schale, `FACE_STYLE.fill`, nur Gesicht D): Flächen, die nach unten
  zeigen (unter den Brauen, an den Nasenflügeln), spiegelten das schwarze Studio und ergaben das dunkle, müde Band
  zwischen Braue und Lid. Ruhelage-Normale aus den Tangenten, Maske `lFace`, vor allem Augenpartie, unten nur 30 %,
  mit Verdeckung (Nasenlöcher und Mundwinkel bleiben dunkel); im hellen Thema halb so stark und ohne Spiegelanteil.
- **Augapfel** etwas heller (0.52 statt 0.42 x Weiss).
- Kosten: gleiche Zahl Programme und Draw Calls, Dreiecke praktisch gleich; das Formen läuft einmal im Worker (wenige
  Millisekunden). Werkzeuge und Bilder: `studio-arbeit/gesicht-0711/` (`tools/prev.js` schnelle Vorschau der Schale,
  `tools/close.sh` Nahaufnahmen, `tools/story.sh` Stellen der Geschichte, `gesicht-D.jpg` Vergleich).
- Offen: Poster (dunkel und hell) zeigen noch Gesicht und Figur von Version 4.

### Quellen und Lizenzen (CREDITS)

- Grundmodell: **MakeHuman** (Grundnetz `base.obj` hm08, Targets, Skelett und Gewichte), ausdrücklich als **CC0 1.0**
  freigegeben (September 2020, MakeHuman-Lizenz Abschnitt C "The license for the bundled assets"). Keine Namensnennung
  nötig, festgehalten trotzdem: Manuel Bastioni, Data Collection AB, Joel Palmius, Jonas Hauquier.
  Quelle: https://github.com/makehumancommunity/makehuman (Ordner `makehuman/data/`).
- Verwendete Targets (Auszug): macrodetails jung weiblich (caucasian 0.75, asian 0.25), athletisch-schlank, flache Brust,
  Nase, Wangenknochen, Kinn, Kiefer, Lippen, Schläfen, Brauenbogen; Arme per Skinning um 27 Grad gesenkt, Mundhöhle und
  Ohrmuschel entfernt, Lippen geschlossen, Ambient Occlusion pro Ecke offline gerechnet. Ergebnis `assets/robot/bust.bin`
  (76 KB, quantisiert). Die vollständige Liste mit Gewichten liegt bei den Aufbereitungs-Skripten im Scratchpad
  (`S/android/android-b/CREDITS.md`, Skripte `scripts/`, `scripts2/`).
- three.js r170 (MIT), schon unter `vendor/`. Keine weiteren Bibliotheken, keine weiteren Downloads.
- Alles andere ist eigener Code (prozedural): Platten, Fugen, Muskeln, Mechanik, Kabel, Augen, Licht, Hintergrund.
- Nicht verwendet: Kopf-Scan Lee Perry-Smith (CC BY 3.0).

## 12. Hintergrund (backdrop)

**Version 4 (Rückmeldung "Hintergrund immer noch mega langweilig"):** zwei neue Bausteine, professionell statt verspielt,
ohne zusätzliche Rauschzugriffe (weiter 1 Draw Call):

- **Lichtflächen** (`uWash`, `washAt()` im Shader): drei grosse, weiche Lichter um das Gegenlicht wie im Fotostudio, eine
  hohe, schmale Lichtbahn neben dem Motiv (Softbox, `washA`), eine breite Fläche oben (`washB`) und ein warmer Schein
  unten (`washC`). Sie liegen immer auf der Seite weg vom Text (`uWashSide`, aus `director.scrim`, gedämpft, im
  Hochformat rechts) und wandern sehr langsam. Farben und Menge pro Farbwelt (`washA/B/C`, `wash`; Schwarz schaltet ein
  Licht ab).
- **Studio-Boden** (robot, zoom, outro): dunkle, leicht spiegelnde Ebene auf y -3.5 (Unterkante der Büste) mit
  gespiegelten Lichtflächen, Lichtkegel um den Fuss des Motivs (`pool`, Mitte `glowAt`) und einer feinen Lichtkante am
  Übergang in die Hohlkehle. Gleicher Boden-Baustein wie die Punktraster-Ebene der Kabel-Szene, ohne Raster.
- Kapitel Code (wieder drin seit 01.11.2026): Farbwelt `dna` und der Code-Regen im Tunnel (`uCode`) aus Version 3,
  dazu Lichtflächen in Türkis, Blau und Mint wie die anderen Farbwelten von Version 4 (kein Ember: der färbte das Grün
  unter dem Gerüst oliv; kein Boden: die Kamera fliegt durch die Helix). Im Tunnel treten die Lichtflächen zurück (dna@0.3 bis 0.46), am Gerüst kommen sie wieder.


Rückmeldung Version 2: "alles in dem klassischen schwarzen Hintergrund". Seit dem 30.10.2026 zeichnet ein einziges Modul den
Raum hinter allen Szenen, mit einer eigenen Farbwelt pro Kapitel und weichen Übergängen. Keine Szene hat mehr einen eigenen
Hintergrund (Kapitel 8).

| Datei | Inhalt |
| --- | --- |
| `backdrop.js` | Einstieg (create), Farbwelten mischen, Dynamik pro Beat, Licht-Richtungen aus der Kamera, Uniforms |
| `backdrop-glsl.js` | Vertex- und Fragment-Shader, Stufen über `#define BD_Q` (2 high, 1 medium, 0 low) |
| `backdrop-noise.js` | Rausch-Volumen 32 x 32 x 32 RGBA (128 KB, Seed fest), geglättet gelesen: ein Zugriff = vier Rauschwerte |

**Aufbau.** Ein Vollbild-Dreieck (`ShaderMaterial`, deckend, ohne Tiefentest und Tiefenschreiben, `renderOrder` -50,
`frustumCulled` false). Pro Bildpunkt rechnet der Shader die Welt-Blickrichtung aus `camera.projectionMatrixInverse` (mit
Lens-Shift) und `camera.matrixWorld` (beide direkt als Uniform referenziert). Der Hintergrund dreht sich also mit jeder
Kamerafahrt, liegt aber unendlich weit weg; nur Boden und Code-Tunnel haben echte Parallaxe. Er geht wie alles andere durch
Bloom, Tonemapping und den FxPass. Sonst zeichnet keine Szene einen Hintergrund (die Nebelkugel von particles.js ist seit
Version 3 entfernt, das spart im Intro einen Vollbild-Pass).

**Farbwelten** (`BACKDROPS` in config.js, Farben sRGB-Hex, Mengen 0..1):

| Farbwelt | Stimmung | base / mid / hi | Bausteine | Dynamik (backdrop.js) |
| --- | --- | --- | --- | --- |
| intro | Tiefsee-Petrol | #03121a / #072a35 / #1f6f7c | Nebel, Lichtstrahlen von oben (Richtung Lichtkegel der Partikel), Staub, Sterne, warmer Dunst unten rechts | Strahlen schimmern |
| robot | kühles Fotostudio passend zur Büste (gedämpftes Schieferblau wie in ihren Renderings) | #080c12 / #121b26 / #4d6b85 | weiches Gegenlicht hinter dem Kopf, leiser Dunst, breite Lichtbahnen von oben rechts | Lichtbahnen atmen mit der Büste (5.2 s) |
| zoom | Scan-Labor | #060f17 / #0d212c / #3a87a0 | wie Studio, dazu Messraster, Messkreis um den Kopf, Scanlinie | Raster ab zoom@0.4, Scanlinie läuft auf Höhe des Röntgen-Scans (gleiche Formel wie `robotScan`) |
| brain | Biolumineszenz | #090518 / #1b0c33 / #7c36b0 | violetter Nebel, dessen Schwaden selbst leuchten (#6a2fd8 bis #b8338a, Ränder #2fb7b0), Sporen, Bokeh | leiser, solange die Kamera im Gehirn ist (brain@0.45 bis 0.98) |
| cables | Glasfaser-Blau | #030916 / #0a1a33 / #2a63b8 | tiefe Ebene weit unten (y -9) mit Punktraster und Lichtpaketen (Version 4 kräftiger, 0.7), Bokeh, Sterne, Licht hinter dem Website-Knoten | |
| dna | Code-Raum Grün-Türkis | #02100e / #05302a / #17a888 | leiser Code-Regen auf der Tunnelwand (Zylinder r 5.5 um die Helix-Achse), Lichtkern beim Gerüst (-z), Lichtflächen #5fe0c8 / #3a5fd8 / #2fb7b0 (kein Ember, der färbte das Grün oliv), wenig Bokeh und Sterne | Code ab dna@0.32, Lichtkern ab dna@0.56 (steigen mit dem Gerüst), Lichtflächen im Tunnel leiser |
| outro | Morgenlicht | #07080a / #151210 / #e0a05a | Gold nur als Horizont und Gegenlicht hinter der rechten Schulter (horizonGlow 0.42, glowSize 1.15), leise Strahlen, wenig Goldstaub, oben kühl | Sonnenaufgang über outro@0 bis 0.8 (Horizont 0.4 -> 1) |
| inhalt | Ruhe | #05080d / #0a0f16 / #2a1c12 | nur Verlauf und ein Rest Wärme, Muster auf 10 % (`detail` 0.1) | |

**Licht-Anker** (Weltpunkte, linear gemischt, pro Frame zur Richtung von der Kamera aus umgerechnet): `glowAt` + `glowShift`
(Gegenlicht-Halo hinter dem Motiv, Verschiebung im Bild als Anteil, x rechts, y oben), `rayAt` (Quelle der Lichtstrahlen,
meist ausserhalb des Bildes), `accentAt` (Akzent-Dunst). Weil der Halo an einem Punkt beim Motiv hängt, bleibt das Licht
hinter der Büste, wenn die Kamera kreist. Kompositionsregel: helle Teile nur auf der Seite des Motivs, nie hinter der Textspalte.

**Mischung** (ohne Allokationen pro Frame): Gewicht pro Beat mit weicher Kante `BACKDROP_FADE` = 0.0265 global (rund 21 vh)
um jede Beat-Grenze, als Partition der Eins. Am Schnitt (`director.cuts`, Ende dna -> outro) wechselt die Farbwelt hart,
versteckt im Lichtblitz des Runners. Im Inhaltsbereich mischt `director.content` (setzt main.js, gedämpft) zur Farbwelt
`inhalt`; danach friert main.js das Bild ohnehin ein. Farben werden linear gemischt, Zahlen und Punkte ebenso; die Dynamik pro
Beat wirkt als Faktor auf die Werte der jeweiligen Farbwelt.

**Was das Modul ausserhalb setzt:** nur `scene.fog.color` (Nebelfarbe der Farbwelt, entfernte Objekte mit `fog: true` laufen
in den Hintergrund statt gegen Schwarz). Lichtfarben, Looks und Belichtung der anderen Szenen bleiben unberührt (das Modul hat
keinen `look`). Eigene Looks pro Beat (BEAT_LOOKS aus dem Konzept Version 2) waren nicht nötig: Belichtung, Bloom und
Vignette der Szenen passen zu den Farbwelten, die Android-Büste bleibt so, wie Jonas sie freigegeben hat.

**Lesbarkeit.** Der Shader liest `director.scrim` und macht Muster (Nebel, Strahlen, Punkte, Raster) in der Textzone bis
75 % leiser; der FxPass dunkelt dort zusätzlich ab. Helligkeit linear vor dem Tonemapping: Flächen bis etwa 0.06, nur
Halo-Kern, Lichtpakete, Sterne und Bokeh werden heller. Gemessen am 30.10.2026 (Desktop 1440 x 900, Panels ausgeblendet,
Scrim aktiv, relative Leuchtdichte im Textblock, Kontrast für Fliesstext #d3dee6 gegen den 95-%-Wert): robot 12.7:1,
zoom 12.6:1, brain 11.6:1, cables 14.2:1 (Version 3); Weiss gegen das Mittel überall mindestens 14:1. Im Hero liegt der
Titel teilweise über der Partikel-Büste (Vordergrund), der Kontakt im Ausklang steht in seinem eigenen Panel.

**Qualität.** high: alle Bausteine, Nebel 3 Rauschzugriffe, Strahlen 2. medium (Handy): Nebel 2, Strahlen 2, ohne die
dritte Nebelschicht. low: Verlauf, 1 Nebelschicht, Strahlen einfach, ohne Staub, ohne Lichtpakete und ohne Code-Zeichen
(nur gemittelte Deckung). Immer 1 Draw Call. Falls ein Handy das nicht schafft: Hintergrund in halber Auflösung in ein eigenes
RenderTarget rechnen und hochskalieren (weich genug, noch nicht nötig).

**Hellmodus:** eigene Farbwelten `BACKDROPS_HELL` und ein eigener Lichtweg im Shader (`lightBackdrop()`, Kapitel 14).
Seit dem 07./08.11.2026 "hell draussen, Abendlicht im Kopf": Studio mit Farbfeldern, Glasringen, Boden mit Spiegelung
und Randabschattung, im Kopf ein getönter Abendlicht-Innenraum; die Schlüssel `vig`, `rings`, `calm`, `dusk`, `inner`
gelten nur hell (Kapitel 14, "Hintergrund mit Tiefe, Abendlicht im Kopf").

**Ändern.** Stimmung einer Szene: nur `BACKDROPS` in config.js (hell: `BACKDROPS_HELL`). Neue Bausteine: Uniform in `backdrop-glsl.js`, Schlüssel in
`BASE`, `NUMS` oder `COLORS` von backdrop.js, Wert in den Farbwelten. Testen: `dev.html?scene=backdrop` (alle Farbwelten
über den Regler), `dev.html?scene=all&at=brain@0.3`, Vergleich ohne Hintergrund `&bg=0`.

**Poster Kapitel Code (01.11.2026, Wiedereinbau):** `poster-dna.webp` und `poster-dna-m.webp` mit dem jetzigen Stand
neu aufgenommen: Helix aus Code im Tunnel bei dna@0.42 (Motiv rechts, links Platz für den Text), mit
`studio-arbeit/v4/start-work/tools/shots.js --clean --nograin` (Desktop 1440 x 900, Hochformat `--vp=540x1170`), WebP
Qualität 78 wie `convert_posters.py`. Bei der Abnahme (01.11.2026) nach dem Wechsel der Lichtfläche von Ember auf Mint
nochmals aufgenommen, mit `studio-arbeit/v4-dna/abnahme/tools/shots_frames.js` (wartet nach dem Sprung eine feste Zahl
gerenderter Bilder statt Sekunden; in SwiftShader dauert ein Bild 1 bis 2.5 s). dna@0.42 direkt nach dem Laden aufnehmen:
die Drehung der Helix hängt an der Zeit, kurz nach dem Laden bleibt die linke Hälfte frei für den Text. Die Poster
cables und outro passen weiter (Szenen dort unverändert, nur Lichtflächen und Impulse stehen zeitabhängig anders).

**Poster (Version 4, 01.11.2026):** zwölf Poster (sechs Stationen, Desktop und Hochformat, `poster-dna*` gelöscht) und
das OG-Bild neu gerendert: weicheres Gesicht, Lichtflächen und Studio-Boden, Kabel-Übersicht ohne Beschriftungen (im
Fallback stehen die Links als Pillen im Text). OG-Text jetzt KI zuerst ("KI, die Ihrem Team Büroarbeit abnimmt.");
Vorlage und Aufnahme in `studio-arbeit/v4/start-work/og/` (og.html, render.js), Umwandlung
`studio-arbeit/v4/start-work/tools/convert_posters.py`.

**Poster (Version 3.2):** nach Runde 2 alle 14 Poster und das OG-Bild neu gerendert (Hero im Ruhezustand, Kabelfächer,
Gehirn-Hardware ohne Lüfter und Schrift, Ausklang heller).

**Poster (Version 3.1):** nach Runde 1 der Prüfer alle 14 Poster und das OG-Bild neu gerendert (weisse Glanzschale,
Kabelfächer, Ausklang in Gold). `story_shots.js --clean` blendet auch `.story-skip` aus.

**Poster (Version 3):** Fallback-Poster (`assets/img/poster-*.webp`, Desktop und Hochformat) und OG-Bild am 30.10.2026 mit den neuen
Farbwelten neu gerendert (`S/tools/make_posters.sh`, Kapitel 10). Nebeneinander sind die sieben Kapitel klar unterscheidbar.
Für Version 3 (Integration) nochmals neu gerendert, zusammen mit dem OG-Bild.
## 13. Knoten-Links (js/nodes.js)

Version 4 (Brief und Testkunden): Die fünf Symbole der Kabel-Szene sind echte Links, auch per Tastatur und am Handy.
E-Mail → `ki/e-mail/`, Kalender → `ki/kalender/`, Dokumente → `ki/dokumente/`, Kunden → `ki/kunden/`,
Website → `websites/`. Grundsatz: ein Link-Satz je Darstellung, nie doppelt für Screenreader.

| Teil | Aufgabe |
| --- | --- |
| `_src/pages/start.js` | `nav.tool-links` im Text-Panel des Kapitels Verbindung: fünf `<a data-node>` mit `aria-label` (V4-TEXTE 3.2), darin `.tl-ring` (Trefferfläche), `.tl-label` (Name, Untertitel, Pfeil). Darüber der Hinweis "Klicken Sie auf ein Symbol." (nur Knoten-Modus). Im Hochformat endet der Satz im Text mit "Wählen Sie ein Werkzeug:", darum dort kein eigener Hinweis. |
| `js/scenes/cables.js` | meldet pro Bild `api.screen[i]`: Mitte `cx, cy` und Radius `r` des Knotens in CSS-Pixeln, Sichtbarkeit `vis` (im Bild, nicht unter Kopfzeile, HUD oder Text-Panel, nicht hinter einem näheren Knoten oder dessen Beschriftung), Seite der Beschriftung `side` (mit Hysterese). `api.setHighlight(name)`: Knoten leuchtet (Rand, Halo, Icon), die anderen treten zurück, die Impulse im Kabel laufen schneller (Phase statt Periode, kein Sprung). Die früheren `.gl-label` gibt es nicht mehr. |
| `js/nodes.js` | `NodeLinks`: setzt die Links pro Bild (nur bei Änderung ins DOM, ohne Allokation), schaltet den Modus, hebt bei Zeigen und Fokus hervor. |
| `js/main.js` | erzeugt `NodeLinks` nach den Szenen, ruft `update()` nach `runner.step()`, entsorgt beim Wechsel in den Fallback. |
| `css/story.css` | Pillen (ohne 3D, Hochformat), Knoten-Modus `.tool-links.is-nodes`, Tippflächen `.node-hits`. |

**Modus "nodes"** (`(min-width: 1024px) and (min-aspect-ratio: 17/20)`, `html.nodes-on`): Die nav wandert aus dem Text-Panel
hinter das Panel in den Abschnitt (gleiche Lesereihenfolge; im Panel läge sie unter dessen Transform und Deckkraft) und
steht fix über der Bühne (`z-index` 3). Jeder Link ist ein Punkt auf seinem Knoten (`transform`), die Trefferfläche ein
Kreis mit Radius `--R` = max(24 px, 1.25 r), also mindestens 48 x 48 px, daneben die Beschriftung als Pille ("E-Mail ›",
bei Zeigen oder Fokus mit Untertitel). Fokusring um den Knoten. Sichtbar ab cables@0.2 (voll ab 0.32) bis zum Ende des
Beats cables und solange `vis` > 0; mit dem Anflug ins Kapitel Code blenden sie von dna@0 bis 0.035 aus (`HIDE`).
Unsichtbare Links haben Deckkraft 0, keine Zeiger-Ereignisse und `tabindex="-1"`; vor der Kabel-Szene bleiben sie im
Accessibility-Baum. Ab dna@0.035 und im Inhaltsbereich sind die nav über der Bühne und die Tippflächen `inert` (kein
Fokus, kein Klick, nicht im Accessibility-Baum), eine Hervorhebung wird zurückgesetzt. Ein Link, der den Fokus hat und
unsichtbar wird, gibt ihn ab. Während des Anflugs wird der Website-Knoten hervorgehoben und öffnet sich zum Portal, die
anderen treten zurück (`cables.js`, `uNodeA.w`, `uNodeB.z/w`).

**Modus "pills"** (Hochformat, Fenster unter 1024 px): Die Links bleiben Pillen im Text-Panel (44 px hoch, Tab-Reihenfolge
wie das Panel, `ui.setInteractive`). Sichtbare Knoten bekommen zusätzlich eine Tippfläche mit Namen (`.node-hits`,
`aria-hidden`, `tabindex="-1"`, gleiches Ziel). Wechsel zwischen den Modi beim Drehen oder Ändern der Fenstergrösse
(`matchMedia`), die nav kehrt dabei an ihren Platz im Panel zurück.

**Treffer im 3D-Modus** (Korrektur 01.11.2026 nach Testkunden): Die Abschnitte `.gl .chapter` und ihre Panels nehmen keine
Zeiger-Ereignisse an, nur Links und Knöpfe im Text des aktiven Panels. Das aktive feste Panel liegt mit `z-index: 2` über
den späteren Abschnitten. Vorher lag im Hochformat der Abschnitt des Ausklangs (ab rund 450 px) über den Pillen der
Kabel-Szene, ein Tipp landete dort und die Seite wechselte nicht. Prüfung mit echtem Tipp (WebGL, iPhone 13):
`studio-arbeit/tools/tap_check.js`, Ergebnis: alle fünf Pillen an drei Stellen getroffen, Tipp auf E-Mail öffnet `ki/e-mail/`.

**Testkunden Runde 2 (01.11.2026):** Beim Zeigen lief die Beschriftung mit Untertitel ("Kunden · Anfragen in einer
Liste") in den Titel. `nodes.js` misst darum zusätzlich die Breite mit Untertitel (`screen[i].wf`, Klasse `is-measure`
nur während des Messens), `cables.js` nutzt sie für Seitenwahl und Abstand zum Text (`fullW`). Verdeckung und
Bildrand rechnen weiter mit der kurzen Breite. Die Knoten am Bildrand (E-Mail, Dokumente) wirkten unscharf: In der
Kabel-Szene gibt es keine chromatische Aberration mehr und weniger Vignette (`cables.look`, und `brain.js` blendet
beides ab cables@0 bis 0.2 aus). Das Icon unter der Maus oder mit Fokus wird voll hell und etwas kräftiger gezeichnet
(`uNodeA.w` = Hervorhebung, im Shader `focus`).

**Ohne 3D** (Fallback, reduzierte Bewegung): nur die Pillen im Text, Posterbild dahinter. Dieselben fünf Ziele stehen
gleich darunter noch einmal als Kacheln im Teaser `#werkzeuge`.

## 14. Hellmodus (Thema hell und dunkel)

Wunsch von Jonas (02.11.2026): Die Startgeschichte bekommt einen Hellmodus, den Besucher mit einem Schalter ein- und
ausschalten. **Standard bleibt dunkel.** Der dunkle Modus sieht unverändert aus und ist gleich schnell: alles Helle
kommt nur über Defines in die Shader (`CODANI_LIGHT`, im FxPass `FX_LIGHT` und `FX_SNAP`), dunkel ist der Shader-Text
der bisherige. Gleiche 53 Programme, gleiche Draw Calls und Dreiecke (gemessen unten). Die Unterseiten sind schon hell
und haben keinen Schalter.

**Bildsprache hell (seit 08.11.2026): "hell draussen, Abendlicht im Kopf".** Draussen (Hero, Büste, Profil bis zum
Flug in den Kopf, Ausklang) ein helles Studio wie ein Produktfoto, aber mit Gestaltung: Hohlkehle in Blaugrau mit
deutlicher Farbe (Türkis, Blau, Flieder, ein Ember-Akzent), heller Horizont, Boden mit Spiegelung, Kontaktschatten und
Punktraster, Lichtbahnen, zwei grosse, unscharfe Glasringe (Echo des Helix-Logos), Lichtscheiben und Schwebeteilchen;
Partikel-Büste und Röntgen als Tinte, die Android-Büste als Produkt-Rendering. Drinnen (ab der Mitte des Kapitels zoom
bis zum Schnitt in den Ausklang) ein Abendlicht-Innenraum in tiefem Petrol bis Schiefer-Blau mit etwas Flieder
(Helligkeit rund 20 bis 40 %): Gehirn, Kabel, Knoten, Helix und Website-Gerüst leuchten dort wie im dunklen Thema.
Die Seite bleibt hell (Kopfzeile, HUD, Text-Karten). Der Lichtblitz beim Schnitt ist eine ruhige Blende zum Off-White.
Draussen kaum Bloom, dezentes Korn; drinnen Bloom über den Lichtkernen.

### Ablauf

| Teil | Aufgabe |
| --- | --- |
| Kopf von index.html (`THEME_HEAD` in `_src/layouts/story.js`) | setzt vor dem CSS `html[data-theme]` auf `dunkel` oder `hell`: `?hell` und `?dunkel` (Test-Schalter, ändern die gespeicherte Wahl nicht), sonst `localStorage` `codani-theme` (Werte `hell`, `dunkel`, mit try/catch), sonst dunkel. Nichts blitzt auf. |
| Schalter (`THEME_TOGGLE`, `THEME_SCRIPT`) | runder Icon-Knopf `#theme-toggle` in der Kopfzeile nach Kontakt (Desktop 40 px wie Kontakt, Handy 44 px neben dem Menü, unter 360 px 40 px). Sonne im dunklen Thema, Mond im hellen. `aria-label` "Hellmodus einschalten" bzw. "Dunkelmodus einschalten", `aria-pressed` true im hellen Thema. Klick mit 3D (Prüfung 2): zuerst `window.__codaniTheme.prepare(t)` (main.js), der Knopf zeigt solange `aria-busy="true"` (Symbol pulsiert leise, weitere Klicks warten); erst wenn die Szene im neuen Thema bereit ist, `data-theme` setzen, speichern, `meta[name=theme-color]` nachführen, Ereignis `codani-theme` auf `window` (`detail: { theme, vt }`). Ohne 3D sofort. Weiche Blende der Seite über View Transitions (0.6 s, Klasse `theme-vt`), ohne View Transitions kurze Farb-Übergänge (Klasse `theme-fade`, 0.75 s). Bei reduzierter Bewegung sofort. Läuft ohne Module, also auch im Fallback. Antwortet die Szene nicht innert 6 s (Tests 180 s), schaltet die Seite trotzdem. Bricht der Browser die View Transition ab (Zeitlimit), bleibt das Thema gesetzt, die Ablehnung wird abgefangen. Ohne JavaScript ist der Knopf ausgeblendet (`.no-js .hdr__theme`). |
| `layout.js` (Fundament) | `header(ctx, { extra })`: zusätzliches HTML nach dem Kontakt-Knopf (rein additiv, Standard leer). |
| `js/theme.js` | Zustand `THEME.light`, Tintenfarben (`themeUniforms`), `patchScene` und `setSceneTheme` (unten). |
| `js/main.js` | setzt das Thema vor dem Vorkompilieren (`runner.setTheme`, `engine.setTheme`): wer hell startet, bekommt gleich die hellen Programme. Stellt nach dem Start `window.__codaniTheme.prepare(t)` bereit und hört auf `codani-theme`. Wechsel vom Schalter (Prüfung 2, Reihenfolge Szene vor Seite): dieses Bild noch im alten Thema rendern, festhalten (`engine.snapshot()`), umstellen, die Programme des neuen Themas kompilieren (`engine.compileScene()`, beim ersten Wechsel neu, danach aus dem Cache; solange wird nicht gerendert, das letzte Bild bleibt stehen), dann ein Bild im neuen Thema unsichtbar unter dem festen Bild rendern (`uSnap` bleibt 1; manche Treiber, z. B. SwiftShader, übersetzen erst beim ersten Zeichnen), erst jetzt löst `prepare` auf und die Seite setzt `data-theme`. Die Szene hält bis dahin an (Sicherheitsnetz 8 s). Mit View Transition blendet der Browser die ganze Seite samt Szene (`engine.dropSnap()`), sonst blendet das feste Bild über 0.65 s aus (`engine.stepSnap`). Ein Wechsel nur über `data-theme` (ohne Schalter) läuft wie bisher. Kein Neuladen, die Scroll-Position bleibt. Im Inhaltsbereich (sonst eingefroren) wird weiter gerendert, bis die Blende fertig ist (`engine.fading`, mindestens 1.2 s). Vorher (Prüfung 2) wurde die Seite sofort hell, das 3D-Bild stand beim ersten Wechsel aber bis zum Ende der Kompilierung dunkel still: dunkle Schrift auf dunklem Bild. |
| `js/engine.js` | `setTheme(light)`: Tonwertkurve dunkel ACES wie bisher, hell `NeutralToneMapping` (Produktfoto: Weiss bleibt weiss, Farben bleiben), FxPass-Define `FX_LIGHT` und Farben für Scrim, Abdunkeln, Abblende und Blitz, Clear-Farbe. `compileScene()`: mit `KHR_parallel_shader_compile` im Hintergrund (`compileAsync`), sonst Szene für Szene mit einem Bild Pause, unsichtbare Objekte dafür kurz sichtbar. `snapshot()` zeichnet den FxPass ein zweites Mal in ein eigenes Ziel (zwei Ziele im Wechsel, falls während einer Blende erneut geklickt wird), setzt danach das vorherige Render-Ziel wieder (sonst Speicherleck, siehe Prüfung 1) und schaltet `FX_SNAP` ein, nur während der Blende. `dropSnap()` beendet die Blende sofort (View Transition). |
| `js/runner.js` | `setTheme(light)`: Blending der umgerechneten Materialien, Hook `setTheme(light)` der Szenen. Looks im hellen Thema siehe unten. |
| `js/dev.js` | `dev.html?...&hell` zeigt eine Szene im hellen Thema. |

### Additive Materialien werden Tinte (theme.js)

`loadScenes` ruft nach dem Laden `patchScene` für jede Szene auf (vor dem Vorkompilieren). Jedes `ShaderMaterial` mit
`AdditiveBlending` bekommt einen Zusatz, der nur mit dem Define `CODANI_LIGHT` in den Shader kommt (`onBeforeCompile`,
dazu `customProgramCacheKey` mit den Werten unten): `main()` der Szene heisst dann `codaniSceneMain()`, das neue
`main()` ruft sie auf und rechnet die Farbe um: Leuchtkraft e = hellster Kanal x Alpha, Farbton aus
der Sättigung (Cyan wird Türkis, Weiss und Eis werden Tinte), starke Kerne dunkler, Deckkraft 1 - exp(-e x Faktor).
Ember wird ganz zur hellen, warmen Tinte #c9875a und ist nur halb so deckend (Prüfung 1: mit #a14b0c lagen rostbraune
Schlieren und Flecken auf Kabeln, Gehirn und Code). Beim Umschalten setzt `setSceneTheme` das Define (eigenes Programm je Thema, three.js
behält beide im Cache) und `material.blending` (Additive oder Normal). Pro Material (in `create()` vor dem Laden setzen):

| Wert | Wirkung |
| --- | --- |
| `material.userData.themeGain` | Deckkraft-Faktor im hellen Thema (Standard 1). Steht als Konstante im Shader: Materialien mit gleichem Shader brauchen denselben Wert, sonst entstehen zusätzliche Programme |
| `material.userData.themeKeep` | nicht umrechnen, bleibt Licht (hellt auf Hell nur leise auf): Lichtkegel der Partikel, Lichtflecken im Gehirn und an der Gehirn-Hardware. Zusammen mit `themeDefine`: eigener heller Weg ohne Umrechnung, die Szene stellt das Blending selbst um (Hologramm, robot.js) |
| `material.userData.themeInk` | Anteil, mit dem helle Kerne zur dunklen Tinte gehen (Standard 0.6) |
| `material.userData.themeCurve` | Exponent auf die Leuchtkraft (Standard 1; kleiner: schwache Punkte deutlicher, starke Linien gleich) |
| `material.userData.themeDefine` | Material hat einen eigenen hellen Weg (`#ifdef CODANI_LIGHT` im Shader), das Define kommt mit dem Thema (Hintergrund, Knoten der Kabel-Szene; umgerechnete Materialien haben es automatisch) |

Eigene Anpassungen im hellen Thema immer mit `#ifdef CODANI_LIGHT` schreiben, nie mit einem Uniform-Vergleich: sonst
rechnet der dunkle Modus unter Umständen mit (SwiftShader führt beide Zweige aus; gemessen in der Arbeitsfassung mit
Uniform-Vergleichen: Hero 17 % langsamer, mit Defines wie vorher).

Eigene helle Wege (weil kein reines Additiv): Hintergrund (`backdrop-glsl.js`, `lightBackdrop()`), Partikel
(unscharfe Scheiben und Staub leiser, sonst Flecken). Seit Prüfung 1 (03.11.2026) dazu die Teile unten. Gehirn, Kabel
(samt Knoten) und Code haben seit dem 08.11.2026 keinen hellen Weg mehr: sie liegen hell im Abendlicht-Innenraum und
leuchten wie dunkel (`themeKeep`, Abschnitt "Hintergrund mit Tiefe, Abendlicht im Kopf").

- **Hologramm** (`makeHoloMaterial`, robot-materials.js; `themeKeep` und `themeDefine`, robot.js stellt das Blending
  um): Milchglas mit Tintenlinien statt umgerechnetem Licht. Kontur (Fresnel-Rand) in Türkis bis Tinte, Fugen und
  Öffnungskanten in Türkis, die Fläche als zarter, heller Schleier mit leiser Tiefe zum Rand hin, im Röntgen
  (`uHoloX` = Röntgen-Anteil) noch leiser. Volle Tinte schon ab `uHolo` 0.18, damit der Aufbau nie verschwindet
  (Kontur gegen Hintergrund robot@0.3 rund 5:1, vorher 2.1:1). Nah an der Kamera werden Fugen und Kontur leiser
  (sonst dicke Balken). Scan-Kante: feine türkise Linie direkt am Schnitt, darüber eine weiche, weisse Lichtkante
  und deckendes Milchglas (rund 0.07 bis 0.3 über dem Schnitt), das den Blick in die angeschnittene Schale verdeckt
  (vorher: dunkles Türkisband und Kabel quer über den Augen).
- **Mechanik** (`makeMechMaterial`): löst sich beim Eintauchen weich über die Deckkraft auf (`uMechFade`, gleiches
  Fenster), dafür ist sie im hellen Thema `transparent` (robot.js `setTheme`). Dunkel bleibt das feine Korn.
- **Schale** (`makeShellMaterial`): zur Silhouette hin bis 48 % dunkler, wie Abschatter im Produktstudio. Sonst stand
  die weisse Schulter gleich hell wie das Off-White dahinter.

### Werte pro Szene

| Szene | hell |
| --- | --- |
| backdrop | eigene Farbwelten `BACKDROPS_HELL` (config.js), gleiche Schlüssel und Dynamik wie dunkel, im Shader anders gelesen (`lightBackdrop()`): `base`/`mid` Hohlkehle oben und am Horizont, `hi` Gegenlicht, `accent` und `wash*` Farbfelder, `pool` Kontaktschatten, `floorGrid` Punktraster, `floorShine` Spiegelung (auch der Ringe), `bokeh` Lichtscheiben, `dust` mit `starColor` Schwebeteilchen (draussen Tinte, drinnen hell). Nur hell: `vig`/`vigColor` Randabschattung, `rings`/`ringA`/`ringB`/`ringX` Glasringe, `calm`/`calmColor` ruhiger, heller Grund hinter dem Text, `dusk` (setzt `html.hell-abend`), `inner` (zoom mischt von zoom@0.45 bis 0.75 zum Abendlicht). Farbwelten intro, robot, zoom, outro: Studio (Config zum Beispiel robot oben #8297ad, Horizont #c3cfd9); brain, cables, dna: Abendlicht (`DUSK_BRAIN` in config.js, cables Blau, dna Petrol), Raster, Pakete und Code-Regen dort hell. Helligkeit `PAPER_GAIN` 1.16 (gilt auch für die Nebelfarbe). Handy (`BACKDROPS_HELL_M`): robot glow 0.42, outro glow 0.36. |
| particles | Faktor 1.3, Kurve 0.75 (Flächen der Büste deutlicher, Linien gleich kräftig), Tinten-Anteil 0.3 (Linien Türkis statt fast schwarz), unscharfe Scheiben x 0.15, Staub x 0.4 (Vordergrund x 0.15), ferne Lichter x 0.3, Lichtkegel bleibt Licht. Treten erst von robot@0.14 bis 0.3 zurück (dunkel 0.05 bis 0.22), wenn das Hologramm deckt |
| robot | `lookHell` (Belichtung high 1.05 bis 1.15, Handy-Ausklang auf high 1.18; Stufe medium/low 1.04 bis 1.08, Prüfung 2: ohne Klarlack glänzt die Schale breiter und lief am Handy im Off-White aus; Führungslicht 0.5 bis 0.6, Fülllicht 0.26 bis 0.3, Kantenlicht neutral `rimWarm` 0.45, im Ausklang 0.85 wie dunkel, Bloom 0.12, Schwelle 2.0), helles Studio für die Spiegelungen (`buildStudioEnv(..., { light: true })`: alles neutral weiss statt mit dem Blaustich von `palette.white`, Kuppel 0.14 / 0.22 / 0.5, also um den Horizont dunkler wie Abschatter; erst beim ersten Wechsel gebaut, die Materialien tauschen nur die Textur), Schale neutral weiss 0.9 (`setTheme` tauscht nur die Farbe; vorher eisblau), auf medium/low Spiegelung 1.0 bis 1.1 statt 1.45 bis 1.65 (nur hell), Abschatter zur Silhouette dort 0.62 mit Exponent 1.6 statt 0.48 und 2.2 (`#ifdef AB_CHEAP` im hellen Weg), Hologramm und Mechanik mit eigenem Weg (oben), Röntgen-Kontur bleibt bis brain@0.26 und blendet bis 0.46 aus (dunkel 0.15 bis 0.46) |
| brain | seit 08.11.2026 wie dunkel: alle Materialien `themeKeep` (keine Umrechnung in Tinte, gleiche Programme wie dunkel, die hellen `#ifdef`-Blöcke aus Prüfung 1 und 2 sind entfernt). `lookHell`: Bloom 0.75 (Handy 0.62, beim Eintauchen bis 45 % leiser), Schwelle 0.9 bis 1.2, Vignette 0.4 bis 0.2, Korn 0.03, keine Aberration |
| cables | seit 08.11.2026 wie dunkel: alle Materialien `themeKeep`, der Knoten ohne eigenen hellen Weg (der `#ifdef`-Block ist entfernt), `lookHell` Bloom 0.8, Schwelle 0.9, Vignette 0.3. Beschriftungen der Tippflächen (`.node-hits`, Hochformat) im hellen Thema mit Deckkraft min(1, 1.7 x Sichtbarkeit) (`js/nodes.js`); die Textzone, der die Beschriftungen ausweichen, beginnt hell im Hochformat direkt über dem Text |
| dna | seit 08.11.2026 wie dunkel: alle Materialien `themeKeep` (die hellen `#ifdef`-Blöcke in `dna-shaders.js` sind entfernt), `lookHell` Bloom 0.8, Schwelle 0.9, Vignette 0.45, kein kleiner Blitz beim Eintauchen |

**Looks:** `BASE_LOOK_HELL` (config.js) sind die Grundwerte hell (Bloom 0.16, Schwelle 1.7, Vignette 0.08, Korn 0.02,
keine Aberration). Die Schlüssel in `THEME_LOOK_KEYS` (exposure, bloom, bloomRadius, bloomThreshold, aberration,
vignette, grain, flash) nimmt das helle Thema nie aus dem dunklen `look` einer Szene, sondern aus ihrem `lookHell` oder
aus `BASE_LOOK_HELL`. Die übrigen (Licht, Nebel, Kamera) gelten für beide Themen, solange `lookHell` sie nicht setzt.
Schnitt hell: `flash` als Blende zum Off-White (smoothstep, bis 0.92), ohne Belichtung und Bloom hochzuziehen.

**FxPass hell** (`FX_LIGHT`): Scrim hellt zum Off-White auf (`uScrimTone`), Abdunkeln im Inhaltsbereich geht zum
Off-White (`uDimTone`), Blitz als Blende. Ohne Define die bisherigen Formeln. `FX_SNAP` (nur während der Blende) mischt
das feste Bild `tSnap` mit `uSnap` darüber.

**Messung (02.11.2026, SwiftShader 640 x 400, Stufe high, je 12 s, abwechselnd alt und neu):** Programme 53 alt, 53 neu
dunkel, 53 neu hell. Draw Calls und Dreiecke an allen sieben Stellen gleich. Bildzeit Hero alt 132 bis 146 ms, neu
dunkel 141 bis 143 ms; Büste alt 324 ms, neu dunkel 343 ms (35 statt 37 Bilder in 12 s, innerhalb der Messgenauigkeit),
neu hell 324 ms. Vorher- und Nachher-Bilder dunkel: gleiche Bilder bis auf zeitabhängige Bewegung (Drehung der Helix,
Blick im Ausklang), mittlere Helligkeit gleich.

**Prüfung 1 (03.11.2026):** Dunkel unverändert: alle 53 Programme sind nach Entfernen der hellen `#ifdef`-Blöcke und
der Leerzeilen dieselben wie vor der Behebung, 52 davon auch dieselben wie vor dem Hellmodus (nur der FxPass ohne die
ungenutzten Tonwert-Funktionen, `toneMapped: false`). Werkzeug: `studio-arbeit/hellmodus/tools/shader_dump.js` und
`shader_cmp.py`. Draw Calls und Dreiecke dunkel gleich (Hero 18 / 144, Büste robot@0.5 44 / 584k, Röntgen zoom@0.6
51 / 696k). Die neuen JS-Zweige (Hologramm-Fenster, Partikel, Mechanik `transparent`, Farbe der Schale) greifen nur
hell. Hell beim Start ebenfalls 53 Programme, nach dem ersten Wechsel von dunkel nach hell 90 statt 74 (Schale, Mechanik und Hologramm haben eigene helle Programme; sie entstehen erst
beim ersten Wechsel oder beim hellen Start). Speicher: `engine.snapshot()` setzt das Render-Ziel zurück. Vorher merkte
sich der Composer im nächsten Bild das feste Bild als aktuelles Ziel und band es nach der Blende wieder an, obwohl es
freigegeben war (pro Wechsel eine Textur mehr). Jetzt bleibt es nach vier Wechseln bei 19 Texturen (18 plus das helle
Studio). Der Schalter fängt den Abbruch einer View Transition ab (vorher eine unbehandelte Ablehnung in der Konsole,
wenn ein Bild sehr lange dauert).

### Hintergrund mit Tiefe, Abendlicht im Kopf (07. und 08.11.2026)

Rückmeldung Jonas (07.11.2026): "Der Hellmodus ist weiss, kein Hintergrund, nichts." Beim Flug ins Gehirn "sieht man
nichts", und "diese DNA-Strähne, die da drin ist, im Gehirn, sieht man auch nicht". Erste Runde (07.11.): Studio mit
Farbfeldern und getöntem Innenraum, Tinte im Gehirn kräftiger. Das war im Vergleich zu leise. Zweite Runde (08.11.):
"hell draussen, Abendlicht im Kopf". Dunkel ist unverändert (gemessen unten).

- **Draussen: Studio mit Gestaltung** (`lightBackdrop()` in `backdrop-glsl.js`, Farbwelten intro, robot, zoom, outro in
  `BACKDROPS_HELL`): Hohlkehle oben Blaugrau, am Horizont hell (Verlauf steiler als vorher), drei Farbfelder um das
  Gegenlicht (Softbox Türkis neben dem Motiv, oben Flieder, unten Ember), ein grosses Farbfeld aus `accentAt`, engeres
  weisses Gegenlicht. Zwei grosse, unscharfe **Glasringe** (`glassRings()`): geneigte Ellipsen, ineinander
  verschränkt wie die zwei Stränge des Helix-Logos (Türkis und Ember), auf der Seite weg vom Text, mit weichem Hof,
  hellerem Kern und einem leisen Schatten an der Innenkante (Glaskante), drehen sehr langsam; der Boden spiegelt sie.
  Boden mit zweistufigem Kontaktschatten, Punktraster (um das Motiv deutlicher), nah an der Kamera tiefer, Lichtkante
  am Horizont (ausserhalb des Bodens gerechnet, sonst harte Linie). Lichtbahnen, Lichtscheiben, Schwebeteilchen in Tinte,
  Randabschattung nur des Hintergrunds (`vig`). **Hinter dem Text** (`calm`, Zone aus `director.scrim` mit voller
  Stärke, sobald ein Panel steht): Grund heller und ruhiger, Ringe und Randabschattung treten zurück; das Motiv bleibt.
- **Drinnen: Abendlicht** (Farbwelten brain, cables, dna; zoom mischt über `inner` von zoom@0.45 bis 0.75 dorthin):
  tiefes Petrol bis Schiefer-Blau mit etwas Flieder, Helligkeit rund 20 bis 40 %, Schwaden, Lichtscheiben, helle
  Schwebeteilchen, Messraster, Bodenraster und Code-Regen in hellem Türkis. Gehirn, Kabel, Knoten, Helix und
  Website-Gerüst leuchten dort **wie im dunklen Thema**: ihre Materialien haben `themeKeep` (keine Umrechnung in
  Tinte, gleiche Programme wie dunkel), die hellen `#ifdef`-Blöcke in `brain-shaders.js`, `cables-shaders.js` und
  `dna-shaders.js` sind entfernt. Bloom hell aus `lookHell` der drei Szenen (Schwelle 0.9 über dem Innenraum). Der
  Schnitt in den Ausklang (Blende zum Off-White) bringt zurück ins helle Studio.
- **Seite im Abendlicht** (`css/story.css`): `backdrop.js` setzt `html.hell-abend`, solange `dusk` über 0.5 liegt
  (nur hell, nur bei Änderung). Dann ist die Kopfzeile eine feste, helle Leiste (ein heller Verlauf wirkte über dem
  tiefen Bild wie Nebel). Die Texte von Verbindung und Websites stehen am Desktop auf einer hellen Karte wie im
  Ausklang (0.93 deckend, ohne `backdrop-filter`); im Hochformat hat der Text ohnehin seine eigene helle Fläche.
- **Die "DNA-Strähne im Gehirn"** ist eine Punktkette der Rinde (Material `cortex`, Windung beziehungsweise Hirnstamm
  von innen gesehen), sichtbar beim Flug durch das Gehirn um brain@0.6 bis 0.8 links im Bild. Bestimmt durch Ausblenden
  der Objekte einzeln (`S/hellmodus-0711/tools/ident.js`): ohne `cortex` ist sie weg, ohne Fasern, Verbindungen und
  Lichtflecken bleibt sie. Hell war sie fast unsichtbar (nahe Punkte bis 85 % leiser), jetzt leuchtet sie wie dunkel.
- **Kopfzeile hell, draussen** (`css/story.css`): Der Off-White-Verlauf läuft länger und weich aus (am Desktop 64 px
  statt 40 px unter die Leiste, unter 1024 px 32 px statt 16 px), auf Höhe der Schrift gleich deckend wie vorher.
- **Text hell** (`css/story.css`): Kicker und Eyebrow in `--c-ice` #085a6d, Stichwort-Zeile #064858, Hero-Fakten
  #2f3a48, Hinweis "Scrollen" in `--c-text`, Untertitel der Kopfzeile #4a5463 (vor dem tieferen Grund lagen sie bei
  3.3 bis 4.6:1). Im Hochformat trägt eine leise helle Unterlage die Eyebrow im Hero (sie kreuzt dort die
  Schulterlinien der Partikel-Büste).
- Hinweis: Eine Klasse `.stage` in `css/site.css` (Schaufenster der Unterseiten, 07.11.2026) traf kurz auch die 3D-Bühne
  der Startseite (helle Ränder links und rechts). Sie heisst jetzt `.showcase`; `.stage` ist auf der Startseite allein
  die Bühne, dort keine allgemeinen Regeln mit diesem Namen anlegen.

**Messung (08.11.2026)** (Werkzeuge, Protokolle in `belege/` und Collagen in `S/hellmodus-0711/`; der Vergleich
"alt" nimmt für die geänderten Dateien den Stand 593bf90, sonst denselben Baum):

- Dunkel: alle 53 Programme nach Entfernen der hellen `#ifdef`-Blöcke gleich (`shader_cmp.py`), 44 im Wortlaut, die
  übrigen 9 unterscheiden sich nur in hellen Blöcken. Draw Calls und Dreiecke an sechs Stellen gleich. Bilder
  deterministisch über `dev.html?scene=all` (gleiche Zeit, gleiche Schritte) an neun Stellen: höchstens 1 von 255 pro
  Kanal Abweichung, kein Bildpunkt über 2, mittlere Helligkeit gleich (`belege/dunkel-vergleich.txt`). Bildzeit
  abwechselnd alt und neu (SwiftShader 640 x 400, high, je 12 s) gleich im Rahmen der Streuung (`belege/perf-summe.txt`).
- Hell am Handy (`?q=medium&hell`): beim Start 53 Programme alt und neu, Draw Calls und Dreiecke gleich, Bildzeit im
  Rahmen der Streuung (Wiederholung an drei Stellen je drei Mal: Hero, Kabel und Code im Mittel gleich).
- Kontrast der Texte hell (Textausdehnung, ungünstigster 5-%-Wert des Hintergrunds, Text unsichtbar gemacht, ohne den
  Off-White-Hof der Hero-Schrift; `belege/kontrast-*.txt`): Desktop 1440 x 900 alle mindestens 4.8:1 (Eyebrow im Hero
  4.85, Hero-Fakten 5.0, "Scrollen" 5.1, Stichwort-Zeile 5.65, Kicker 5.7, Untertitel der Kopfzeile 6.0, Fliesstext ab
  8.9, Texte auf den Karten im Abendlicht ab 6.7); Handy (iPhone 13) alle mindestens 6.2:1 (Eyebrow im Hero mit der
  hellen Unterlage 6.4).

### Seite drumherum (css/story.css, Abschnitt "Hellmodus")

Alles mit `html[data-theme="hell"]` (Achtung: `.gl`, `.no-gl` und `data-theme` sitzen alle auf `<html>`, also
`[data-theme="hell"].gl ...`). Farben der Geschichte als Tokens (`--c-*`), Kopfzeile in der hellen Variante (oben ohne
Fläche, beim Scrollen ein kräftiger Off-White-Verlauf: 0.96 oben, 0.88 bis 0.9 auf Höhe der Links, 0.74 an der
Unterkante, darunter weich auslaufend, am Desktop 40 px, am Handy 16 px, ohne Rand, keine Zeiger-Ereignisse; im
Ausklang die feste Leiste), Knöpfe wie auf den hellen Seiten, helle
Scrims hinter den Panels (Desktop radial, Hochformat Fläche unten), Glas-Karte im Ausklang weiss, Pillen
"Animation überspringen" und HUD hell (das HUD steht oft über der türkisen Brust: 0.95 deckend, Index #085a6d, "/06"
#4a5463), Angebotszeile, Knoten-Beschriftungen
und Pillen weiss mit Tinte, Preloader, Cursor, Hinweis bei Standbildern (`gl-hint`), Schleier über der Szene im
Inhaltsbereich. Kontraste gegen #f3f5f7: Text #0b1220 17.1:1, Fliesstext #2a3442 11.5:1, Nebentext #5a6575 5.4:1,
Akzent und Fokus-Rahmen #0a6f86 5.3:1 (Fokus-Rahmen der Knoten: weisser und türkiser Ring), Weiss auf dem Knopf
#0a6f86 5.8:1. Gemessen hinter den Text-Panels über der hellen Szene (02.11.2026, Desktop, 5-%-Wert des Hintergrunds
im Textblock): Fliesstext mindestens 10.2:1, Nebentext 4.8:1, Akzent 4.7:1 (Hero über der Partikel-Büste, sonst 4.9:1).
Prüfung 1 (03.11.2026, Desktop, dunkelster Bildpunkt hinter dem Text): HUD-Ziffern vorher 3.1 bis 3.8:1, jetzt
mindestens 6.9:1 (Index 7.0:1); Links der Kopfzeile über Tintenlinien vorher bis 3.5:1, jetzt mindestens 8.1:1.

Prüfung 2 (06.11.2026):

- **Hero:** Titel, Kapitelmarke und Zeile darunter haben im hellen Thema einen engen Off-White-Hof um jede Glyphe
  (Titel `filter: drop-shadow` 1.5 px und 6 px, die Wort-Masken schnitten einen `text-shadow` ab; Kapitelmarke und
  Zeile `text-shadow`). Die Tintenlinien der Partikel-Büste laufen damit nicht mehr durch die Buchstaben ("abnimmt.",
  am Handy die Halslinien durch "für KMU").
- **Hochformat mit 3D:** Das Panel wandert beim Scrollen bis rund 18 px nach oben (`--p`), seine Verläufe endeten dann
  über dem unteren Bildrand (harte Kante, 11 px). Hell reichen `.chapter__panel::before` und die Fläche hinter dem
  Text darum 40 px tiefer. Die Fläche hinter dem Text beginnt 60 px über dem Kicker und ist nach 34 px dicht (0.94);
  im Ausklang beginnt sie 30 px darüber (vorher wegen der Spezifität 80 px, hell über der Brust). Der helle Scrim im
  FxPass ist im Hochformat aus (director.js).
- **Fallback hell im Hochformat:** Der Text steht wie mit 3D auf einer fast deckenden Off-White-Fläche (ab rund 90 px
  über dem Kicker, ganze Breite, bis zum unteren Rand des Abschnitts; das Panel liegt dafür mit `z-index` über dem
  Poster), der Kicker in #085a6d, die Glas-Karte im Ausklang 0.92 deckend. Kicker vorher 2.3 bis 3.8:1 gegen den
  dunkelsten 2-%-Wert hinter den Glyphen, jetzt 6.6 bis 7.2:1 (iPhone 13). Desktop unverändert 5.1 bis 5.6:1.
- **Schalter:** ohne JavaScript ausgeblendet, während der Vorbereitung `aria-busy` (siehe Ablauf).

Abnahme (06.11.2026): Die Bildbeschreibung des Hero-Posters (`poster` in `CHAPTERS`, `_src/pages/start.js`) gilt für
beide Themen ("Büste eines Androiden aus feinen Punkten und Linien", vorher "aus leuchtenden Lichtpunkten vor dunklem
Hintergrund", im hellen Fallback falsch).

### Poster (ohne WebGL und bei reduzierter Bewegung)

Eigene helle Poster `assets/img/poster-<beat>-hell.webp` (1440 x 900) und `poster-<beat>-hell-m.webp` (540 x 1170) an
denselben Stellen wie die dunklen (intro@0.06, robot@0.95, zoom@0.85, brain@0.3, cables@0.6, dna@0.42, outro@0.7), ohne
UI und ohne Korn, WebP Qualität 78. Aufnahme: `studio-arbeit/hellmodus/tools/posters_hell.js <out> dm`, Umwandlung
`convert_posters_hell.py <out>`. Die Verläufe über den Postern sind im hellen Thema Off-White. Alle 14 hellen Poster am
03.11.2026 nach Prüfung 1 neu aufgenommen (Mechanik ohne Krümel, Hologramm, Schale neutral weiss). Nach Prüfung 2
(06.11.2026) neu: `poster-brain-hell.webp` (Impulse leise) und im Hochformat robot, zoom, brain, cables, outro
(`-hell-m`, Studio am Handy grauer, Knoten kräftiger, Impulse leise). Die Aufnahme läuft auf `?q=high` mit 540 px
Breite, also mit den Handy-Farbwelten `BACKDROPS_HELL_M`, aber der Büste der Stufe high. Abnahme (06.11.2026): neu
`poster-cables-hell.webp` (die Knoten sind seit Prüfung 2 auch am Desktop kräftiger) und alle sieben `-hell-m` (im
Hochformat weichen Hintergrund und Knoten-Beschriftungen der Textzone wieder aus, der Scrim im FxPass bleibt aus;
intro und dna stammten noch vom 03.11. mit hellem Scrim). Aufnahme mit `abnahme/tools/shots.js` (`--clean --nograin
--reload`, Handy `--vp=540x1170`), Umwandlung wie oben. Die übrigen sechs Desktop-Poster sind unverändert aktuell
(neu aufgenommen und verglichen: Unterschiede nur durch Bewegung).

### Testen

```
node S/tools/story_shots_codani.js <out> robot@0.5,... --page='?q=high&hell'          # 3D hell, Desktop
node S/tools/story_shots_codani.js <out> robot@0.5,... --mobile --page='?q=medium&hell'
node S/tools/pages_codani.js <out> start --q='?nogl&hell'                              # Fallback hell
node S/hellmodus/tools/theme_switch.js <out> robot@0.5 [--mobile]    # Schalter live, Blende, Speicher, ?dunkel
node S/hellmodus/tools/perf_probe.js <root> '?q=high'               # Programme und Bildzeit (Vergleich alt/neu)
node S/hellmodus/tools/shader_dump.js <out.json> '?q=high&dunkel'      # alle Programme als Text (nach allen Beats)
python3 S/hellmodus/tools/shader_cmp.py <alt.json> <neu.json>          # dunkel gleich? (ohne helle #ifdef-Bloecke)
node S/hellmodus/behebung-2/tools/switch_order.js <out> robot@0.9 [--mobile]   # Reihenfolge Szene vor Seite beim Klick
node S/hellmodus/behebung-2/tools/kicker_nogl.js <out> [--mobile] [--q=?nogl&hell] # Kicker im Fallback, Auswertung
python3 S/hellmodus/behebung-2/tools/kicker_messen.py <out>/m-kicker.json 3        #   mit kicker_messen.py (DPR)
python3 S/hellmodus/behebung-2/tools/bueste_messen.py <bild> x0,y0,x1,y1 [x,y0,y1] # Anteil ab 240, Spanne, Scheitel
node S/hellmodus/abnahme/tools/shots.js <out> robot@0.5,... --page='?q=high&hell' [--mobile] [--root=<repo>]  # wartet auf Bilder
node S/hellmodus/abnahme/tools/fallback_check.js <out>   # Fallback, Schalter ohne 3D, ?hell/?dunkel, ohne JS, Unterseiten
node S/hellmodus/abnahme/tools/axe_start.js              # axe-core Startseite hell und dunkel (Fallback, Desktop und Handy)
```

**Aufnahmen nie parallel laufen lassen.** SwiftShader braucht pro Bild rund eine Sekunde; laufen zwei Aufnahmen
gleichzeitig, kann ein Bildschirmfoto nach fester Wartezeit noch einen alten Stand zeigen (Abnahme: brain@0.3 mit
Mechanik, die dort längst aufgelöst ist). `abnahme/tools/shots.js` zählt darum die gerenderten Bilder nach dem Sprung
(Zähler an `engine.render`, Standard mindestens 6) und wartet zusätzlich eine feste Zeit.

**Prüfung 2 (06.11.2026), Messung:** Reihenfolge beim ersten Wechsel (SwiftShader, robot@0.9): erstes Bild im neuen
Thema (unter dem festen Bild) und `data-theme` innerhalb von 13 bis 16 ms, nie Seite hell über dunklem 3D-Bild
(vorher 103 s Abstand in SwiftShader, auf echten Geräten geschätzt 0.3 bis 2 s). Büste am Handy (outro@0.5, Kopf und
Hals): Anteil ab Grauwert 240 vorher 63 %, jetzt 15 %; Scheitel mit Konturlinie (dunkelster Wert 167, vorher 236 ohne
Kante). robot@0.9: 56 % auf 5 %. Desktop zum Vergleich 38 %. Dunkel unverändert: alle 53 Programme ohne die hellen
`#ifdef`-Blöcke gleich wie vor Prüfung 2 (`shader_cmp.py`), Fallback-Bilder dunkel pixelgleich.

**Abnahme (06.11.2026), Messung** (Werkzeuge und Bilder in `S/hellmodus/abnahme/`):

- Dunkel gegen den Stand vor dem Hellmodus (Commit 050d95c, entpackt nach `abnahme/repo-alt`): 53 Programme, nach
  Entfernen der hellen `#ifdef`-Blöcke 52 gleich, nur der FxPass anders (ohne die ungenutzten Tonwert-Funktionen, wie
  in Prüfung 1); gegen den Stand nach Prüfung 2 alle 53 gleich. Draw Calls und Dreiecke an allen sieben Stellen gleich.
  Bildzeit abwechselnd alt und neu, je 12 s (SwiftShader 960 x 600, high): Hero 132 bis 133 gegen 136 bis 138 ms,
  Röntgen 462 bis 480 gegen 400 bis 480 ms, Code 1333 gegen 1091 bis 1200 ms, also gleich im Rahmen der Messgenauigkeit.
  Dieselben zehn Stellen dunkel alt und neu aufgenommen: mittlere Helligkeit und Farbe je Stelle höchstens 0.5 von 255
  auseinander, sichtbar nur der neue Schalter und zeitabhängige Bewegung.
- Schalter: Klick mit 3D live (Desktop high, Handy medium), Scroll-Position gleich, `aria-pressed`, `aria-label`,
  `localStorage` und `meta[name=theme-color]` stimmen, Neuladen behält die Wahl, `?dunkel` und `?hell` überschreiben
  sie, ohne sie zu ändern. Drei schnelle Klicks ergeben genau einen Wechsel (`abnahme/tools/dreifach.js`). Reihenfolge
  (`switch_order.js`): erstes Bild im neuen Thema und `data-theme` 21 ms auseinander, nie Seite hell über dunklem Bild.
  Ohne 3D (reduzierte Bewegung, `?nogl`) sofort, nur helle Poster geladen; ohne `localStorage` (wirft) und ohne
  JavaScript ohne Fehler; Unterseiten ohne Schalter und ohne `data-theme`. axe-core (WCAG 2.1 AA) auf der Startseite
  hell und dunkel ohne Verstoss, Fokus-Rahmen #0a6f86 auf Off-White 5.3:1. Keine Meldungen in der Konsole.
(`S` = `/home/user/studio-arbeit`.)
