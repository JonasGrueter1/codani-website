#!/usr/bin/env node
'use strict';
// Test der Website-Suche: echte, umschriebene Kundenfragen gegen den gebauten Index (assets/suche.json).
//   node _src/test-suche.js            Bericht, Ende mit Fehlercode, wenn ein Ziel nicht unter den ersten 3 ist
//   node _src/test-suche.js "Frage"    eine Anfrage mit den ersten Treffern zeigen
// Erwartet: eines der Ziele (Anfang der URL) unter den ersten drei Treffern.

const fs = require('fs');
const path = require('path');
const { Index } = require('../js/suche-kern.js');

const idx = new Index(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'suche.json'), 'utf8')));

const FAELLE = [
  ['Was kostet eine Website?', ['websites/#faq-kosten', 'websites/#preise', 'preise/#websites']],
  ['wie teuer ist eine homepage', ['websites/#faq-kosten', 'websites/#preise', 'preise/#websites']],
  ['Preis Webseite', ['websites/#faq-kosten', 'websites/#preise', 'preise/#websites']],
  ['Webiste kosten', ['websites/#faq-kosten', 'websites/#preise', 'preise/#websites']],
  ['Kosten KI', ['preise/#ki', 'ki/#faq-kosten', 'ki/#preise', 'preise/']],
  ['Was kostet der KI-Check?', ['preise/#ki', 'preise/#bericht', 'preise/']],
  ['Sind meine Daten sicher?', ['sicherheit/', 'ki/#faq-daten']],
  ['Wo werden meine Daten gespeichert', ['ki/#faq-daten', 'sicherheit/#daten', 'sicherheit/#loesung']],
  ['Sind die Daten in der Schweiz?', ['ki/#faq-daten', 'sicherheit/#daten', 'sicherheit/#loesung', 'sicherheit/#kurz']],
  ['Datenschutz', ['sicherheit/', 'datenschutz/', 'websites/#faq-datenschutz']],
  ['Datenshutz', ['sicherheit/', 'datenschutz/', 'websites/#faq-datenschutz']],
  ['Trainiert ChatGPT mit meinen Kundendaten?', ['ki/#faq-training']],
  ['Lernt die KI mit unseren Daten', ['ki/#faq-training']],
  ['Wie lange dauert eine neue Website?', ['websites/#faq-dauer']],
  ['wann ist meine homepage fertig', ['websites/#faq-dauer']],
  ['Kann ich die Texte selbst anpassen?', ['websites/#faq-aendern']],
  ['Kann ich später selber Bilder austauschen', ['websites/#faq-aendern']],
  ['Wer bist du?', ['ueber-mich/']],
  ['Wer steckt hinter Codani', ['ueber-mich/', '#wer']],
  ['Bist du nicht zu jung?', ['ki/#faq-alter', 'websites/#faq-alter', 'ueber-mich/#alter']],
  ['16 Jahre alt seriös', ['ki/#faq-alter', 'websites/#faq-alter', 'ueber-mich/#alter']],
  ['Telefonnummer', ['kontakt/', 'ueber-mich/#erreichbarkeit']],
  ['Wann bist du erreichbar?', ['ueber-mich/#erreichbarkeit', 'support/#reaktionszeit', 'kontakt/']],
  ['Was passiert, wenn die KI ausfällt?', ['ki/#faq-ausfall', 'support/#ausfall']],
  ['KI funktioniert nicht mehr', ['ki/#faq-ausfall', 'support/#ausfall']],
  ['Macht die KI Fehler?', ['ki/#faq-fehler']],
  ['Was wenn die KI etwas Falsches schreibt', ['ki/#faq-fehler']],
  ['Funktioniert das mit Outlook?', ['ki/#programme', 'ki/#faq-programme', 'ki/e-mail/']],
  ['bexio', ['ki/#programme', 'ki/#faq-programme', 'branchen/treuhand/', 'ki/dokumente/', 'ki/e-mail/', 'ki/kunden/', 'ki/kalender/']],
  ['Mails automatisch beantworten', ['ki/e-mail/']],
  ['Antworten auf Kundenmails vorbereiten lassen', ['ki/e-mail/']],
  ['Termine vereinbaren lassen', ['ki/kalender/']],
  ['Terminbuchung', ['ki/kalender/']],
  ['Kalnder', ['ki/kalender/']],
  ['Rechnungen abtippen', ['ki/dokumente/', 'branchen/treuhand/']],
  ['PDF auslesen', ['ki/dokumente/']],
  ['WhatsApp Anfragen sammeln', ['ki/kunden/']],
  ['Ich vergesse oft Rückrufe', ['ki/kunden/']],
  ['Offerten schreiben als Schreiner', ['branchen/handwerk/']],
  ['Malergeschäft', ['branchen/handwerk/']],
  ['Treuhand Buchhaltung Belege', ['branchen/treuhand/']],
  ['Hausverwaltung Mieter Anfragen', ['branchen/verwaltung/']],
  ['Copilot', ['ki/#faq-copilot']],
  ['Warum nicht einfach ChatGPT selber nutzen', ['ki/#faq-copilot']],
  ['Ersetzt KI meine Mitarbeiter?', ['ki/#faq-ersetzt']],
  ['Muss ich Leute entlassen', ['ki/#faq-ersetzt']],
  ['Muster Vertrag', ['unterlagen/']],
  ['Vertraulichkeitserklärung', ['unterlagen/vertraulichkeit/', 'unterlagen/', 'sicherheit/#vertraulichkeit']],
  ['Impressum', ['impressum/']],
  ['Mehrwertsteuer', ['preise/#faq-mwst']],
  ['Wie bezahle ich?', ['preise/#faq-zahlung', 'preise/#gut-zu-wissen']],
  ['Pilotprojekt', ['preise/#pilot', 'ki/#ablauf']],
  ['Was ist ein Pilot?', ['preise/#pilot', 'ki/#ablauf']],
  ['Referenzen', ['referenzen/']],
  ['bisherige Arbeiten ansehen', ['referenzen/', 'websites/#beispiele']],
  ['Website Beispiele', ['websites/#beispiele', 'referenzen/#websites']],
  ['Hosting und Domain', ['websites/#faq-hosting']],
  ['Gehört mir der Code?', ['support/#eigentum', 'websites/#faq-eigentum']],
  ['Wartung nach der Übergabe', ['websites/#faq-betreuung', 'support/']],
  ['bei Google gefunden werden', ['websites/#faq-google']],
  ['SEO', ['websites/#faq-google']],
  ['Brauche ich neue Computer?', ['ki/#faq-geraete']],
  ['Notfall', ['support/', 'branchen/verwaltung/#notfall']],
  ['Kontakt aufnehmen', ['kontakt/']],
  ['Wie läuft ein KI-Projekt ab?', ['ki/#ablauf']],
  ['Was kann die KI?', ['ki/#anwendungen', 'ki/']],
  ['kostenloser Entwurf', ['websites/#zusagen', 'websites/#faq-entwurf', 'websites/']],
  ['Entwurf gefällt mir nicht', ['websites/#faq-entwurf']],
  ['Datenschutzgesetz', ['sicherheit/#dsg']],
  ['DSGVO', ['sicherheit/#dsg']],
  ['Server in der Schweiz', ['sicherheit/#loesung', 'sicherheit/#daten', 'ki/#faq-daten']],
  ['Haftung', ['support/#haftung']],
  ['Garantie', ['support/#haftung']],
  ['Wie schnell antwortest du?', ['support/#reaktionszeit']],
  ['Was wenn du in den Ferien bist', ['support/#abwesend']],
  ['Dokumentation', ['support/#dokumentation']],
  ['Kann ich nach dem Pilot aufhören?', ['preise/#faq-aufhoeren']],
  ['laufende Kosten pro Monat', ['preise/#nutzung', 'support/#kosten', 'preise/#faq-nutzung']],
  ['Schweigepflicht', ['branchen/treuhand/#schweigepflicht']],
  ['Sehen Sie unsere Mandantendaten?', ['ki/#faq-vertraulich', 'branchen/treuhand/']],
  ['KI ausprobieren', ['ki/#demo', '#ausprobieren']],
  ['Welche Programme werden unterstützt?', ['ki/#programme', 'ki/#faq-programme']],
  ['Sprachnachricht von der Baustelle', ['branchen/handwerk/']],
  ['Steuererklärung', ['branchen/treuhand/']],
  ['Adresse', ['impressum/', 'kontakt/']],
  ['Microsoft 365', ['ki/#programme', 'ki/#faq-copilot']],
  ['Fixpreis', ['websites/#preise', 'preise/#websites', 'websites/#faq-kosten', 'preise/']],
  ['Lohnt sich das?', ['preise/#beispielrechnung', 'branchen/handwerk/#rechnung', 'branchen/treuhand/#rechnung']],
  ['AI', ['ki/', '']],
  ['Wer ist Jonas?', ['ueber-mich/']],
  ['Lehre', ['ueber-mich/#werdegang', 'ki/#faq-lehre']],
  ['OpenAI', ['sicherheit/#anbieter']],
  ['Verschlüsselung', ['sicherheit/#it']],
  ['Was ist nicht im Preis inbegriffen', ['preise/#gut-zu-wissen']],
  ['Wie läuft das bei einer neuen Website ab?', ['websites/#ablauf']],
  ['Was machen Sie genau?', ['', 'ki/', 'websites/']],
];

const einzel = process.argv[2];
if (einzel) {
  const t0 = process.hrtime.bigint();
  const r = idx.suche(einzel);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`"${einzel}" (${ms.toFixed(1)} ms) Begriffe:`, r.begriffe.map((b) => `${b.wort}[${Object.keys(b.v).slice(0, 6).join(',')}]`).join(' '));
  r.treffer.forEach((t, i) => console.log(`${i + 1}. ${t.score.toFixed(2)} ${t.doc.u.padEnd(36)} ${t.doc.t}\n   ${idx.auszug(t.doc, r.begriffe).replace(/<\/?mark>/g, '*')}`));
  process.exit(0);
}

let top1 = 0, top3 = 0, zeit = 0;
const fehl = [];
for (const [q, ziele] of FAELLE) {
  const t0 = process.hrtime.bigint();
  const r = idx.suche(q);
  zeit += Number(process.hrtime.bigint() - t0) / 1e6;
  const urls = r.treffer.map((t) => t.doc.u);
  const ok = (u) => ziele.some((z) => (z === '' ? u === '' || u.startsWith('#') : u.startsWith(z)));
  const pos = urls.findIndex(ok);
  if (pos === 0) top1 += 1;
  if (process.env.ALLE && pos !== 0) console.log(`  Platz ${pos + 1}: "${q}" -> ${urls.slice(0, 3).join(' | ')}`);
  if (pos >= 0 && pos < 3) top3 += 1;
  else fehl.push(`  ✗ "${q}" erwartet ${ziele.join(' | ')}\n      bekommen: ${urls.slice(0, 4).join(' | ') || '(nichts)'}`);
}
const n = FAELLE.length;
console.log(`Suche: ${n} Fragen, Platz 1: ${top1} (${Math.round(top1 / n * 100)} %), unter den ersten 3: ${top3} (${Math.round(top3 / n * 100)} %), im Schnitt ${(zeit / n).toFixed(1)} ms`);
if (fehl.length) { console.log('Nicht unter den ersten 3:'); console.log(fehl.join('\n')); process.exit(1); }
