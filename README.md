# Codani, Website codani.ch

Firmenwebsite von Codani (Jonas Grüter): KI und Websites für KMU.
Statische Seite auf GitHub Pages mit eigener Domain codani.ch (Datei `CNAME`).

## Arbeiten
- Alle Einstellungen in `_src/site.json`, Seiten in `_src/pages/`. Nach jeder Änderung: `node _src/build.js`.
- Die erzeugten HTML-Seiten nie von Hand ändern.
- Der Build prüft Links, Textregeln und dass keine echten Firmennamen aus der privaten Firmenliste
  (`../workflow-leads/leads.json`) auf der Seite stehen.
- Aufbau und 3D-Startgeschichte: `_src/README.md` und `ARCHITEKTUR.md` (beide werden nicht veröffentlicht).

Die Kunden-Demos liegen bewusst im getrennten Repo Workflow-Website und erscheinen nicht unter codani.ch.
