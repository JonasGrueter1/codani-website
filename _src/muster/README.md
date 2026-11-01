# Musterseiten (Quelle der Produktbilder)

Kleine Websites für erfundene Betriebe. Sie dienen nur als Vorlage für die Produktbilder auf `websites/` und
`referenzen/` und werden nicht veröffentlicht (Ordner mit `_`). Alle Betriebe, Texte, Daten und Preise sind erfunden.
Keine Fotos, keine Personen, keine echten Firmen: Bilder sind selbst gezeichnete SVG-Illustrationen.

| Datei | Musterbetrieb | Stil |
| --- | --- | --- |
| `schreinerei-a.html` | Schreinerei Beispiel, Entwurf A | hell und warm, Serifenschrift |
| `schreinerei-b.html` | Schreinerei Beispiel, Entwurf B | dunkel und edel, grosses Bild |
| `fahrschule.html` | Fahrschule Muster | frisch, mit Kategorienkarte |
| `treuhand.html` | Treuhandbüro Beispiel | ruhig und klar |

Bilder neu aufnehmen (braucht Playwright mit Chromium und Python mit Pillow, beides nur auf dem Arbeitsrechner):

```
node studio/_src/muster/aufnehmen.js        # schreibt studio/assets/img/muster-*.webp
```

Aufgenommen wird je Laptop (1440 x 900) und Handy (390 x 844). Danach `node studio/_src/build.js` laufen lassen.
