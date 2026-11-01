#!/usr/bin/env node
'use strict';
// Zaehlt die Kennzahlen der Fallstudie aus der privaten Firmenliste und schreibt NUR die Summen nach site.json
// (referenzen.zahlen, referenzen.stand). Keine Namen, Orte oder Einzeldaten.
//
//   node studio/_src/count-leads.js [pfad/zu/leads.json]     Standard: ../../workflow-leads/leads.json

const fs = require('fs');
const path = require('path');
const leads = require('./lib/leads');

const STUDIO = path.resolve(__dirname, '..');
const file = process.argv[2] || process.env.STUDIO_LEADS || leads.defaultPath(STUDIO);
const list = leads.load(file);
if (!list) { console.error(`Firmenliste nicht gefunden: ${file}`); process.exit(1); }

const siteFile = path.join(__dirname, 'site.json');
let raw = fs.readFileSync(siteFile, 'utf8');
const z = leads.counts(list);
// Nur den Block referenzen.zahlen und das Datum ersetzen, der Rest der Datei bleibt wie er ist
const block = JSON.stringify(z, null, 2).split('\n').map((l, i) => (i ? '    ' + l : l)).join('\n');
raw = raw.replace(/("zahlen":\s*)\{[^}]*\}/, `$1${block}`);
raw = raw.replace(/("referenzen":\s*\{\s*"stand":\s*)"[^"]*"/, `$1"${new Date().toISOString().slice(0, 10)}"`);
JSON.parse(raw); // muss gueltig bleiben
fs.writeFileSync(siteFile, raw);
console.log('Kennzahlen geschrieben:', z);
