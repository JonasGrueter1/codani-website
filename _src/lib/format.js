'use strict';
// Formatierung (CHF, Zahlen) und Platzhalter {{...}} aus den Einstellungen (site.json).

const APO = '’'; // typografischer Apostroph als Tausender-Trennzeichen (CHF 1’350)

function num(n) {
  const s = String(Math.round(Number(n)));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, APO);
}

function chf(n) {
  return `CHF ${num(n)}`;
}

/** Preis-Eintrag aus site.json als Text */
function preisText(p, { kurz = false } = {}) {
  if (!p) return '';
  switch (p.art) {
    case 'fix': return kurz ? chf(p.betrag) : `Fixpreis ${chf(p.betrag)}`;
    case 'ab': return `ab ${chf(p.betrag)}`;
    case 'spanne': return `${chf(p.von)} bis ${num(p.bis)}`;
    case 'monat-ab': return `ab ${chf(p.betrag)} pro Monat`;
    case 'monat-spanne': return `${chf(p.von)} bis ${num(p.bis)} pro Monat`;
    case 'kostenlos': return 'kostenlos';
    case 'offen': return p.text || 'nach Vereinbarung';
    default: return '';
  }
}

/** Preis-Eintrag in Teile fuer Preis-Karten: Art, Vorsatz, Betrag, Einheit */
function preisTeile(p) {
  if (!p) return null;
  switch (p.art) {
    case 'fix': return { art: 'Fixpreis', vor: '', betrag: chf(p.betrag), einheit: '' };
    case 'ab': return { art: 'Richtwert', vor: 'ab', betrag: chf(p.betrag), einheit: '' };
    case 'spanne': return { art: 'Spanne', vor: '', betrag: `${chf(p.von)} bis ${num(p.bis)}`, einheit: '' };
    case 'monat-ab': return { art: 'pro Monat', vor: 'ab', betrag: chf(p.betrag), einheit: 'pro Monat' };
    case 'monat-spanne': return { art: 'nach Verbrauch', vor: '', betrag: `${chf(p.von)} bis ${num(p.bis)}`, einheit: 'pro Monat' };
    case 'kostenlos': return { art: 'Vorab', vor: '', betrag: 'Kostenlos', einheit: '' };
    case 'offen': return { art: 'Offen', vor: '', betrag: p.text || 'nach Vereinbarung', einheit: '' };
    default: return null;
  }
}

function findPreis(site, id) {
  const all = [...(site.preise.ki || []), ...(site.preise.web || [])];
  const p = all.find((x) => x.id === id);
  if (!p) throw new Error(`Preis "${id}" fehlt in site.json`);
  return p;
}

/** Alle Platzhalter fuer Texte. Namen wie in V4-TEXTE.md. */
function placeholders(site) {
  const P = (id) => findPreis(site, id);
  const form = site.formular.anbieter[site.formular.aktiv] || {};
  const check = P('ki-check');
  const pilot = P('pilot');
  const pflege = P('pflege');
  const z = site.referenzen.zahlen;
  return {
    marke: site.marke.name,
    zusatz: site.marke.zusatz,
    inhaber: site.person.name,
    region: site.marke.region,
    region_kurz: site.marke.regionKurz,
    gebiet: site.marke.gebiet,
    mail: site.kontakt.mail,
    mail_dienst: site.kontakt.mailDienst,
    telefon: site.kontakt.telefon,
    adresse: site.kontakt.adresse,
    termin_link: site.kontakt.terminLink,
    termin_anbieter: site.kontakt.terminAnbieter,
    reaktionszeit: site.support.reaktionszeit,
    erreichbarkeit: site.support.erreichbarkeit,
    alter: String(site.person.alter),
    lehrjahr: site.person.lehrjahr,
    lehre: site.person.lehre,
    stundenansatz: chf(site.preise.stundenansatz),
    preis_ki_check: chf(check.betrag),
    ki_check_stunden: String(check.stunden),
    preis_pilot_ab: chf(pilot.betrag),
    preis_einfuehrung: preisText(P('einfuehrung')),
    preis_betrieb_ab: preisText(P('betrieb')).replace(/^ab /, ''),
    ki_nutzung: preisText(P('nutzung')),
    preis_website_ab: chf(P('website').betrag),
    preis_pflege_web: `${chf(pflege.betrag)} pro Monat${pflege.text ? ' ' + pflege.text : ''}`,
    einmalig_start: chf(check.betrag + pilot.betrag),
    dauer_website: site.preise.dauerWebsite,
    preis_hinweis: site.preise.hinweis,
    mwst_text: site.preise.mwst,
    formular_anbieter: form.name || '',
    formular_ort: form.ort || '',
    formular_detail: form.detail || '',
    ausland_text: form.ausland || '',
    hosting_text: `${site.hosting.name} (${site.hosting.firma}, ${site.hosting.sitz})`,
    stand_datenschutz: site.stand.datenschutz,
    stand_sicherheit: site.stand.sicherheit,
    jahr: String(site.seite.jahr),
    ref_websites: String(z.websitesGesichtet),
    ref_analysiert: String(z.betriebeAnalysiert),
    ref_befunde: String(z.befunde),
    ref_befunde_min: String(z.befundeMin),
    ref_befunde_max: String(z.befundeMax),
    ref_demos: String(z.demosGebaut),
    ref_mails: String(z.mailsGesendet),
    ref_nicht: String(z.nichtAngeschrieben),
    ref_antworten: String(z.antworten),
    ref_zeitraum: site.referenzen.zeitraum,
    dringend_text: site.support.dringend || '',
    daten_standard: (site.daten || {}).standard || '',
    daten_beispiele: (site.daten || {}).beispiele || '',
    gewaehrleistung_tage: String((site.firma || {}).gewaehrleistungTage || ''),
    haftung_text: (site.firma || {}).haftung || '',
    pilot_plaetze: String((site.pilotangebot || {}).plaetze || 0),
    pilot_rabatt: `${(site.pilotangebot || {}).rabattKiCheck || 0} %`,
    preis_ki_check_pilot: chf(check.betrag * (1 - ((site.pilotangebot || {}).rabattKiCheck || 0) / 100)),
  };
}

/** Platzhalter in einem Text ersetzen. Unbekannte Namen sind ein Fehler (Tippfehler fallen sofort auf). */
function fill(text, map) {
  return String(text).replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k) => {
    if (!(k in map)) throw new Error(`Unbekannter Platzhalter {{${k}}}`);
    return map[k];
  });
}

module.exports = { APO, num, chf, preisText, preisTeile, findPreis, placeholders, fill };
