'use strict';
// Pruefungen der erzeugten Seiten. Fehler brechen den Build ab, Warnungen werden nur gemeldet.

/** Sichtbarer Text einer Seite (ohne Skripte, Stile, Kommentare), dazu Texte aus alt, aria-label, title,
 *  placeholder und der Meta-Beschreibung. */
function visibleText(html) {
  const attrText = [];
  html.replace(/\s(?:alt|aria-label|title|placeholder|data-label-open|data-label-close)="([^"]*)"/g, (m, v) => { attrText.push(v); return m; });
  html.replace(/<meta\s+(?:name|property)="(?:description|og:description|og:title)"\s+content="([^"]*)"/g, (m, v) => { attrText.push(v); return m; });
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decode(`${body}\n${attrText.join('\n')}`).replace(/[ \t]+/g, ' ');
}

function decode(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n)));
}

/** Textregeln von Jonas: kein Eszett, keine Gedankenstriche, keine Emojis, keine Vorschau-Hinweise */
function textRules(text) {
  const errs = [];
  const ctx = (i) => JSON.stringify(text.slice(Math.max(0, i - 30), i + 30).replace(/\s+/g, ' '));
  const find = (re, msg) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) errs.push(`${msg} bei ${ctx(m.index)}`);
  };
  find(/ß/g, 'Eszett (ss verwenden)');
  find(/[–—]/g, 'Gedankenstrich');
  find(/\s-\s/g, 'Bindestrich als Gedankenstrich');
  find(/(?![\u00A9\u00AE\u2122])\p{Extended_Pictographic}/gu, 'Emoji oder Piktogramm'); // ausser ©, ®, ™
  find(/Vorschau|Version 3/g, 'Vorschau-Hinweis');
  return errs;
}

function duForm(text) {
  const out = [];
  const re = /\b(du|dein|deine|deinen|deinem|deiner|dir|dich)\b/g;
  let m;
  while ((m = re.exec(text))) out.push(`Du-Form? "${text.slice(Math.max(0, m.index - 25), m.index + 25).replace(/\s+/g, ' ')}"`);
  return out;
}

/** Struktur: genau eine H1, Titel, Beschreibung, eindeutige IDs, Bilder mit alt */
function structure(html, { titleMax = 60, descMin = 120, descMax = 155 } = {}) {
  const errs = [];
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) errs.push(`${h1} H1 statt genau einer`);
  const t = /<title>([^<]*)<\/title>/.exec(html);
  const title = t ? decode(t[1]) : '';
  if (!title) errs.push('Titel fehlt');
  else if (title.length > titleMax) errs.push(`Titel ${title.length} Zeichen (hoechstens ${titleMax}): "${title}"`);
  const d = /<meta name="description" content="([^"]*)"/.exec(html);
  const desc = d ? decode(d[1]) : '';
  if (!desc) errs.push('Beschreibung fehlt');
  else if (desc.length < descMin || desc.length > descMax) errs.push(`Beschreibung ${desc.length} Zeichen (${descMin} bis ${descMax}): "${desc}"`);
  const ids = new Map();
  html.replace(/\sid="([^"]+)"/g, (m, id) => { ids.set(id, (ids.get(id) || 0) + 1); return m; });
  for (const [id, n] of ids) if (n > 1) errs.push(`ID doppelt: #${id}`);
  html.replace(/<img\b[^>]*>/g, (m) => { if (!/\salt="/.test(m)) errs.push(`Bild ohne alt: ${m.slice(0, 80)}`); return m; });
  return { errs, ids: new Set(ids.keys()), title, desc };
}

/** Alle href und src einer Seite */
function links(html) {
  const out = [];
  html.replace(/\s(href|src|action)="([^"]*)"/g, (m, k, v) => { out.push({ k, v: decode(v) }); return m; });
  return out;
}

/** Sicherheitsmuster: Schluessel, die nie im oeffentlichen Repo stehen duerfen */
function secrets(text) {
  const errs = [];
  const pats = [
    [/\bsk-[A-Za-z0-9_-]{20,}/, 'API-Schluessel (sk-)'],
    [/\bsk-ant-[A-Za-z0-9_-]{10,}/, 'Anthropic-Schluessel'],
    [/\bgh[pousr]_[A-Za-z0-9]{20,}/, 'GitHub-Token'],
    [/\bAIza[0-9A-Za-z_-]{30,}/, 'Google-Schluessel'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'Privater Schluessel'],
    [/\bxox[abp]-[A-Za-z0-9-]{10,}/, 'Slack-Token'],
  ];
  for (const [re, msg] of pats) if (re.test(text)) errs.push(msg);
  return errs;
}

module.exports = { visibleText, decode, textRules, duForm, structure, links, secrets };
