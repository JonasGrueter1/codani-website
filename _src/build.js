#!/usr/bin/env node
'use strict';
// Build der Studio-Website (Node 18 oder neuer, ohne Abhaengigkeiten).
//
//   node _src/build.js                 Seiten erzeugen und pruefen
//   node _src/build.js --leads <pfad>  Pfad zur privaten leads.json (Namenspruefung), Standard: ../../workflow-leads/leads.json
//   node _src/build.js --force         auch bei Fehlern schreiben (nur zum Nachsehen, nie so einchecken)
//   node _src/build.js --only ki/      nur Seiten, deren Pfad so beginnt (schneller beim Arbeiten)
//
// Ablauf: site.json und data/*.json laden, alle pages/*.js rendern, pruefen, nach studio/<pfad>/index.html schreiben,
// dazu die Weiterleitungen impressum.html und datenschutz.html und sitemap.xml. Siehe _src/README.md.

const fs = require('fs');
const path = require('path');
const { esc } = require('./lib/html');
const fmt = require('./lib/format');
const check = require('./lib/check');
const leads = require('./lib/leads');
const suche = require('./lib/suche');

const SRC = __dirname;
const STUDIO = path.resolve(SRC, '..');
const args = process.argv.slice(2);
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const FORCE = args.includes('--force');
const ONLY = arg('--only');

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

/* ------------------------------------------------------------------ Laden */

const site = JSON.parse(fs.readFileSync(path.join(SRC, 'site.json'), 'utf8'));
const data = {};
for (const f of fs.readdirSync(path.join(SRC, 'data'))) {
  if (f.endsWith('.json')) data[path.basename(f, '.json')] = JSON.parse(fs.readFileSync(path.join(SRC, 'data', f), 'utf8'));
}
const PH = fmt.placeholders(site);

// Komponenten: alle Dateien in components/, Namen muessen eindeutig sein
const components = {};
for (const f of fs.readdirSync(path.join(SRC, 'components')).sort()) {
  if (!f.endsWith('.js')) continue;
  const mod = require(path.join(SRC, 'components', f));
  for (const [k, fn] of Object.entries(mod)) {
    if (f === 'layout.js') continue; // Kopf und Fuss nur ueber die Layouts
    if (components[k]) throw new Error(`Komponente "${k}" doppelt (components/${f} und ${components[k].file})`);
    components[k] = { fn, file: f };
  }
}

const layouts = { base: require('./layouts/base'), story: require('./layouts/story') };

// Seiten
const pages = [];
for (const f of fs.readdirSync(path.join(SRC, 'pages')).sort()) {
  if (!f.endsWith('.js')) continue;
  const mod = require(path.join(SRC, 'pages', f));
  const meta = { id: path.basename(f, '.js'), layout: 'base', css: [], js: [], ...mod.meta };
  meta.file = `pages/${f}`;
  if (typeof mod.render !== 'function') throw new Error(`pages/${f}: render(ctx) fehlt`);
  if (meta.path === undefined) throw new Error(`pages/${f}: meta.path fehlt`);
  meta.title = fmt.fill(meta.title || '', PH);
  meta.description = fmt.fill(meta.description || '', PH).replace(/\s+/g, ' ').trim();
  pages.push({ meta, render: mod.render });
}
const byPath = new Map(pages.map((p) => [p.meta.path, p]));
for (const p of pages) if (pages.filter((q) => q.meta.path === p.meta.path).length > 1) throw new Error(`Pfad doppelt: ${p.meta.path}`);

/* ------------------------------------------------------------------ Kontext */

function makeCtx(meta) {
  const depth = meta.path.split('/').filter(Boolean).length;
  const root = '../'.repeat(depth);
  const ctx = {
    site, data, page: meta, root, fmt, esc,
    pages: pages.map((p) => p.meta),
    extraLinks: [],
    /** Relativer Link von dieser Seite auf einen Pfad der Website ('' = Start, 'ki/', 'kontakt/?thema=x', 'ki/#demo') */
    url(target) {
      const t = String(target == null ? '' : target);
      if (/^(#|mailto:|tel:|https?:|data:)/.test(t)) return t;
      const out = root + t;
      return out === '' ? './' : out;
    },
    /** Platzhalter {{...}} aus den Einstellungen einsetzen */
    t(text) { return fmt.fill(text, PH); },
    preis(id) { return fmt.findPreis(site, id); },
    preisText(id, o) { return fmt.preisText(fmt.findPreis(site, id), o); },
    ph: PH,
  };
  ctx.c = {};
  for (const [k, { fn }] of Object.entries(components)) ctx.c[k] = typeof fn === 'function' ? (...a) => fn(ctx, ...a) : fn;
  ctx.icon = ctx.c.icon;
  return ctx;
}

/* ------------------------------------------------------------------ Rendern */

const out = new Map(); // relativer Ausgabepfad -> HTML
const pageInfo = new Map(); // Seitenpfad -> { ids, html, file }

for (const p of pages) {
  if (ONLY && !p.meta.path.startsWith(ONLY) && !(ONLY === '/' && p.meta.path === '')) continue;
  const ctx = makeCtx(p.meta);
  let html;
  try {
    const body = p.render(ctx);
    const layout = layouts[p.meta.layout];
    if (!layout) throw new Error(`Layout "${p.meta.layout}" gibt es nicht`);
    html = layout(ctx, body);
  } catch (e) {
    err(p.meta.file, `Fehler beim Rendern: ${e.message}`);
    continue;
  }
  // HTML-Kommentare entfernen (das Repo ist oeffentlich, Notizen gehoeren nicht in die Seite)
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  const file = p.meta.path + 'index.html';
  out.set(file, html);
  pageInfo.set(p.meta.path, { html, file, meta: p.meta, extra: ctx.extraLinks });
}

// Weiterleitungen der alten Adressen
const REDIRECT_PAGES = [
  { file: 'impressum.html', to: 'impressum/', label: 'Zum Impressum' },
  { file: 'datenschutz.html', to: 'datenschutz/', label: 'Zur Datenschutzerklärung' },
];
if (!ONLY) {
  for (const r of REDIRECT_PAGES) {
    out.set(r.file, [
      '<!doctype html>',
      `<html lang="${site.seite.sprache}">`,
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<title>Seite umgezogen | ${esc(site.marke.name)}</title>`,
      '<meta name="robots" content="noindex, nofollow">',
      `<meta http-equiv="refresh" content="0; url=${r.to}">`,
      `<link rel="canonical" href="${esc(site.seite.basisUrl + r.to)}">`,
      `<script>location.replace(${JSON.stringify(r.to)} + location.hash);</script>`,
      '<style>body{margin:0;padding:12vh 24px;font:17px/1.6 system-ui,sans-serif;color:#2a3442;background:#fff}h1{color:#0b1220;font-size:28px}a{color:#0a6f86}</style>',
      '</head>',
      '<body>',
      '<h1>Diese Seite ist umgezogen.</h1>',
      `<p>Sie werden weitergeleitet. Falls nicht, hier entlang: <a href="${r.to}">${esc(r.label)}</a></p>`,
      '</body>',
      '</html>',
      '',
    ].join('\n'));
  }
  // Sitemap (erst mit eigener Domain verlinken)
  const urls = pages.map((p) => `  <url><loc>${esc(site.seite.basisUrl + p.meta.path)}</loc></url>`).join('\n');
  out.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}

/* ------------------------------------------------------------------ Suchindex (assets/suche.json, siehe lib/suche.js) */

if (!ONLY && data.suche) {
  const namen = data.suche.seitennamen || {};
  const seiten = [...pageInfo.values()].map((x) => {
    const titel = ((x.html.match(/<title>([^<]*)<\/title>/) || [])[1] || '').split(' | ')[0].trim();
    if (!(x.meta.path in namen)) warn('data/suche.json', `Seitenname fuer "${x.meta.path}" fehlt, nehme "${titel}"`);
    return { path: x.meta.path, html: x.html, name: namen[x.meta.path] || titel };
  });
  const idx = suche.baue(seiten, data.suche, err);
  out.set('assets/suche.json', JSON.stringify(idx));
}

/* ------------------------------------------------------------------ Pruefen */

const LEADS_FILE = arg('--leads') || process.env.STUDIO_LEADS || leads.defaultPath(STUDIO);
const leadList = leads.load(LEADS_FILE);
const forbidden = leadList ? leads.forbidden(leadList, LEADS_FILE) : null;
if (!forbidden) warn('Vertraulichkeit', `Firmenliste nicht gefunden (${path.relative(process.cwd(), LEADS_FILE) || LEADS_FILE}). Namenspruefung uebersprungen. Pfad mit --leads angeben.`);

const exists = (rel) => out.has(rel) || fs.existsSync(path.join(STUDIO, rel));
const idsOf = (rel) => {
  if (out.has(rel)) return new Set([...out.get(rel).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const f = path.join(STUDIO, rel);
  if (/\.(svg|html)$/.test(rel) && fs.existsSync(f)) return new Set([...fs.readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  return null;
};

function checkLink(where, fromDir, href) {
  if (!href || /^(mailto:|tel:|data:|javascript:)/.test(href)) return;
  if (/^https?:/.test(href)) {
    if (/github\.io\/Workflow-Website\/(?!studio\/)/i.test(href)) err(where, `Link auf einen Demo-Ordner: ${href}`);
    return;
  }
  const [beforeHash, hash] = href.split('#');
  const pathPart = beforeHash.split('?')[0];
  let rel = pathPart === '' ? (fromDir + '') : path.posix.normalize(path.posix.join(fromDir, pathPart));
  if (pathPart !== '' && pathPart.endsWith('/') && !rel.endsWith('/')) rel += '/';
  if (rel === '.' || rel === './') rel = '';
  if (rel.startsWith('..')) { err(where, `Link fuehrt aus studio/ hinaus: ${href}`); return; }
  let target = rel;
  if (pathPart === '') target = fromDir === '' ? 'index.html' : fromDir + 'index.html';
  else if (target === '' || target.endsWith('/')) target += 'index.html';
  if (!exists(target)) { err(where, `Ziel fehlt: ${href} (${target})`); return; }
  if (hash) {
    const ids = idsOf(target);
    if (ids && !ids.has(hash)) err(where, `Anker fehlt: ${href}`);
  }
}

const nameHits = (where, text) => {
  for (const h of leads.scan(text, forbidden)) {
    err(where, `VERTRAULICH: ${h.kind} eines echten Betriebs gefunden (Zeichen ${h.i}, Laenge ${h.len}). Entfernen.`);
  }
};

const todo = [];
if (out.has('assets/suche.json')) nameHits('assets/suche.json', out.get('assets/suche.json'));
for (const [rel, html] of out) {
  if (!rel.endsWith('.html')) continue;
  const info = [...pageInfo.values()].find((x) => x.file === rel);
  const where = info ? info.meta.file : rel;
  const isRedirect = !info;
  const text = check.visibleText(html);
  for (const e of check.textRules(text)) err(where, e);
  for (const w of check.duForm(text)) warn(where, w);
  for (const e of check.secrets(html)) err(where, `Geheimnis? ${e}`);
  nameHits(where, html);
  // Telefonnummern nur, wenn in site.json gesetzt
  const tel = /(?:\+41|\b0)[\s.]?\d{2}[\s.]?\d{3}[\s.]?\d{2}[\s.]?\d{2}\b/g;
  for (const m of text.matchAll(tel)) {
    const digits = m[0].replace(/\D/g, '').slice(-9);
    const own = site.kontakt.telefon.replace(/\D/g, '').slice(-9);
    if (!own || digits !== own) err(where, `Telefonnummer im Text: ${m[0]}`);
  }
  if (!isRedirect) {
    const s = check.structure(html);
    for (const e of s.errs) err(where, e);
  }
  const dir = rel.endsWith('index.html') ? rel.slice(0, -'index.html'.length) : path.posix.dirname(rel) === '.' ? '' : path.posix.dirname(rel) + '/';
  for (const l of check.links(html)) {
    if (l.k === 'action') continue;
    checkLink(where, dir, l.v);
  }
  if (info) for (const l of info.extra) checkLink(where, dir, l);
  const n = (html.match(/data-todo="/g) || []).length;
  if (n) todo.push(`${info ? info.meta.path || 'Start' : rel}: ${n} (${[...html.matchAll(/data-todo="([^"]*)"/g)].map((m) => m[1]).join(', ')})`);
}

// Startseite: Ziele der alten Anker und die vorgeladenen 3D-Module muessen existieren
if (pageInfo.has('')) {
  for (const to of [...Object.values(layouts.story.REDIRECTS), layouts.story.REDIRECT_FAQ]) checkLink('layouts/story.js (alte Anker)', '', to);
}

// Quellen und eigene Dateien im oeffentlichen Repo: Namen echter Betriebe, Geheimnisse, CHF-Betraege in Seiten
const walk = (dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['vendor', 'node_modules', '.git'].includes(e.name)) walk(f, acc); } else acc.push(f);
  }
  return acc;
};
for (const f of walk(STUDIO)) {
  if (!/\.(js|json|css|md|html|svg|xml|txt)$/.test(f)) continue;
  const rel = path.relative(STUDIO, f);
  if (out.has(rel)) continue; // schon oben geprueft
  const text = fs.readFileSync(f, 'utf8');
  nameHits(rel, text);
  for (const e of check.secrets(text)) err(rel, `Geheimnis? ${e}`);
}
for (const p of pages) {
  const src = fs.readFileSync(path.join(SRC, p.meta.file), 'utf8').split('\n');
  src.forEach((line, i) => {
    if (/CHF\s*\d/.test(line) && !/beispiel/i.test(line)) warn(`${p.meta.file}:${i + 1}`, 'CHF-Betrag fest im Text. Preise aus site.json nehmen ({{preis_...}} oder ctx.preis), Beispielpreise mit Kommentar "beispiel" markieren.');
  });
}

/* ------------------------------------------------------------------ Schreiben und Bericht */

const unconfirmed = [];
if (site.preise.bestaetigt === false) unconfirmed.push('Preise (site.json preise)');
if (site.support.bestaetigt === false) unconfirmed.push(`Reaktionszeit "${site.support.reaktionszeit}" (site.json support)`);
if (site.support.dringend && site.support.bestaetigt === false) unconfirmed.push('Versprechen bei DRINGEND (site.json support.dringend)');
if (site.daten && site.daten.bestaetigt === false) unconfirmed.push(`Regel Kundendaten "${site.daten.standard}" (site.json daten)`);
if (site.firma && site.firma.bestaetigt === false) unconfirmed.push(`Haftung und Gewaehrleistung ${site.firma.gewaehrleistungTage} Tage (site.json firma)`);
if (site.firma && !site.firma.form) unconfirmed.push('Firmenform leer, darum ausgeblendet (site.json firma.form)');
if (site.firma && !site.firma.haftpflicht) unconfirmed.push('Berufshaftpflicht leer, darum ausgeblendet (site.json firma.haftpflicht)');
if (site.pilotangebot && site.pilotangebot.plaetze && site.pilotangebot.bestaetigt === false) unconfirmed.push(`Pilotangebot ${site.pilotangebot.plaetze} Plaetze, KI-Check ${site.pilotangebot.rabattKiCheck} % guenstiger (site.json pilotangebot)`);
for (const [k, label] of [['telefon', 'Telefon'], ['telefonZeiten', 'Telefonzeiten'], ['terminLink', 'Termin-Link'], ['adresse', 'Adresse (Postadresse fuers Impressum)'], ['uid', 'UID']]) {
  if (!site.kontakt[k]) unconfirmed.push(`${label} leer, darum ausgeblendet (site.json kontakt.${k})`);
}

const log = (s = '') => process.stdout.write(s + '\n');
if (warnings.length) { log(`\nWarnungen (${warnings.length}):`); warnings.forEach((w) => log(`  - ${w}`)); }
if (todo.length) { log(`\nPlatzhalter noch zu bauen (data-todo):`); todo.forEach((t) => log(`  - ${t}`)); }
if (unconfirmed.length) { log('\nNoch von Jonas zu bestaetigen:'); unconfirmed.forEach((u) => log(`  - ${u}`)); }

if (errors.length) {
  log(`\nFEHLER (${errors.length}):`);
  errors.forEach((e) => log(`  - ${e}`));
  if (!FORCE) { log('\nNichts geschrieben. Fehler beheben (oder --force zum Nachsehen).'); process.exit(1); }
}

let written = 0;
for (const [rel, html] of out) {
  const f = path.join(STUDIO, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const old = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
  if (old !== html) { fs.writeFileSync(f, html); written += 1; }
}
log(`\n${out.size} Dateien erzeugt, ${written} geaendert${errors.length ? ` (TROTZ ${errors.length} FEHLERN, --force)` : ''}.`);
