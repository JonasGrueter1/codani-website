'use strict';
// Vertraulichkeit: Namen echter Betriebe stehen NIE in diesem oeffentlichen Repo. Die Pruefung liest sie zur
// Laufzeit aus der privaten Firmenliste (leads.json im privaten Repo). Fehlt die Datei, gibt es nur eine Warnung.
// Zusaetzliche private Begriffe (z. B. Name des Lehrbetriebs) koennen in einer Datei "studio-verboten.txt" neben
// leads.json stehen (ein Begriff pro Zeile). Auch diese Datei liegt nur im privaten Repo.

const fs = require('fs');
const path = require('path');

// Allgemeine Woerter aus Firmennamen, die fuer sich allein nichts verraten
const GENERISCH = new Set(`fahrschule fahrschulen fahrlehrer fahrlehrerin garage garagen carrosserie carrosserien
autohaus auto autos gmbh ag sa sarl und the with drive driving school logo inhaber inhaberin team center zentrum
schreinerei malerei maler gartenbau sanitaer sanitär elektro holzbau metallbau spenglerei dach bau haus
luzern sursee sempach hochdorf schweiz zentralschweiz kanton region neu neue alte von der die das im am bei
design generation einzelfirma gründer gruender haustechnik motorrad motorrad-fahrschule motorradfahrschule
geschäftsführer geschäftsführerin geschäftsinhaber geschäftsinhaberin geschäftsleitung impressum website seite
oktober november büro über firma handelsregister mitglied präsident präsidentin fachausweis team-seite teamseite
laut gemäss eintrag verzeichnis vermutlich vorname nachname fahrlehrerin
jonas grüter grueter muster beispiel
kern`.split(/\s+/).filter(Boolean));

function defaultPath(studioDir) {
  // Dieses Repo liegt neben workflow-leads (z. B. /home/user/codani-website und /home/user/workflow-leads).
  return path.resolve(studioDir, '..', 'workflow-leads', 'leads.json');
}

function load(file) {
  if (!file || !fs.existsSync(file)) return null;
  try {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(d) ? d : (d.leads || d.firmen || []);
  } catch (e) {
    return null;
  }
}

/** Liste verbotener Begriffe: Kennungen, Domains, Mailadressen, Telefonnummern, markante Namensteile */
function forbidden(list, file) {
  const exact = new Set(); // Gross-/Kleinschreibung egal, als Teilstring
  const words = new Set(); // markante Woerter, mit Wortgrenze und Grossbuchstabe am Anfang
  const phones = new Set(); // nur Ziffern
  for (const x of list || []) {
    if (x.id) exact.add(String(x.id).toLowerCase());
    if (x.website) {
      const host = String(x.website).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
      if (host) exact.add(host);
    }
    for (const k of ['email', 'mail_an']) if (x[k] && /@/.test(x[k])) exact.add(String(x[k]).toLowerCase().trim());
    if (x.telefon) {
      for (const t of String(x.telefon).split(/[,;/]| und /)) {
        const digits = t.replace(/\D/g, '');
        if (digits.length >= 9) phones.add(digits.slice(-9));
      }
    }
    // Firmenname: alle markanten Woerter. Inhaber: nur Nachnamen (Vornamen allein verraten niemanden und kommen
    // in Texten und Quellen ueberall vor, z. B. in Namen von Fachleuten).
    const tokens = (str) => String(str || '').replace(/\([^)]*\)/g, ' ').split(/[^A-Za-zÀ-ÿ'’-]+/)
      .map((w) => w.replace(/['’]s$/, '').replace(/^['’-]+|['’-]+$/g, ''))
      .filter((b) => b.length >= 4 && /^[A-ZÀ-Þ]/.test(b) && !GENERISCH.has(b.toLowerCase()));
    for (const b of tokens(x.firma)) words.add(b);
    // Klammern zuerst entfernen: Beschreibungen wie "(führt den Betrieb seit ...)" enthalten Kommas und sonst
    // landen gewöhnliche Wörter aus der Beschreibung als Namen in der Liste.
    for (const person of String(x.inhaber || '').replace(/\([^)]*\)/g, ' ').split(/,| und | & |\//)) {
      const t = tokens(person);
      for (const b of t.slice(1)) words.add(b);
    }
  }
  if (file) {
    const extra = path.join(path.dirname(file), 'studio-verboten.txt');
    if (fs.existsSync(extra)) {
      for (const line of fs.readFileSync(extra, 'utf8').split(/\r?\n/)) {
        const t = line.trim();
        if (t && !t.startsWith('#')) exact.add(t.toLowerCase());
      }
    }
  }
  return { exact: [...exact], words: [...words], phones: [...phones] };
}

/** Text auf verbotene Begriffe pruefen. Gibt Treffer als Liste von Hinweisen zurueck (ohne den Begriff im Klartext
 *  zu wiederholen, damit er nicht in Protokollen landet: nur Position und Laenge). */
function scan(text, f) {
  const hits = [];
  if (!f) return hits;
  const low = text.toLowerCase();
  for (const e of f.exact) {
    const i = low.indexOf(e);
    if (i >= 0) hits.push({ i, kind: 'Kennung/Domain/Mail', len: e.length });
  }
  for (const w of f.words) {
    const re = new RegExp(`(^|[^A-Za-zÀ-ÿ])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-zÀ-ÿ])`);
    const m = re.exec(text);
    if (m) hits.push({ i: m.index + m[1].length, kind: 'Name', len: w.length });
  }
  if (f.phones.length) {
    const re = /(?:\+41|0)[\s.]?\d{2}[\s.]?\d{3}[\s.]?\d{2}[\s.]?\d{2}/g;
    let m;
    while ((m = re.exec(text))) {
      const d = m[0].replace(/\D/g, '').slice(-9);
      if (f.phones.includes(d)) hits.push({ i: m.index, kind: 'Telefon', len: m[0].length });
    }
  }
  return hits;
}

/** Kennzahlen fuer die Referenzen (nur Summen) */
function counts(list) {
  const n = (fn) => list.filter(fn).length;
  const befunde = list.map((x) => (Array.isArray(x.befunde) ? x.befunde.length : 0));
  const mitBefund = befunde.filter((b) => b > 0);
  return {
    websitesGesichtet: n((x) => x.website),
    betriebeAnalysiert: n((x) => x.analysiert_am),
    befunde: befunde.reduce((a, b) => a + b, 0),
    befundeMin: mitBefund.length ? Math.min(...mitBefund) : 0,
    befundeMax: mitBefund.length ? Math.max(...mitBefund) : 0,
    demosGebaut: n((x) => x.demo_url),
    mailsGesendet: n((x) => x.gesendet_am),
    nichtAngeschrieben: n((x) => x.ausschlussgrund && /stern|sperr|widerspruch|vorbehalt/i.test(String(x.ausschlussgrund).slice(0, 80))),
    antworten: n((x) => x.antwort_am),
  };
}

module.exports = { defaultPath, load, forbidden, scan, counts };
