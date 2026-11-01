'use strict';
// Demo-Assistent (V4-KONZEPT 3.6.13, V4-TEXTE 5). Gruppe: KI-Seiten.
// Rein im Browser, ohne KI und ohne Netzwerk. Der Build legt jede Szene im Endzustand als HTML in die Seite
// (geht ohne JS), js/demo.js zeigt die Schritte nacheinander. Daten: _src/data/demo.json. Stile: css/demo.css.
//
// Bausteine je Schritt: text, chips, felder, liste (listeArt pruefen), dokument, ok (gruener Hinweis), hinweis (gelb), entscheid.
// Aufruf: ctx.c.demoAssistent({ id: 'demo-ki', szenen: ['email', 'baustelle', 'beleg', 'mieter'] })
//         ctx.c.demoAssistent({ id: 'demo-mail', szenen: ['offerte'] })   (eine Szene: ohne Auswahl)
// Seiten mit dem Assistenten laden css/demo.css und js/demo.js (meta.css: ['demo'], meta.js: ['demo']).

const { esc, attrs, cls, join, when } = require('../lib/html');

/** [[Wort]] im Eingang wird zur Markierung, die ab Schritt 1 aufleuchtet. Texte aus demo.json sind eigenes HTML. */
const mark = (s) => String(s || '').replace(/\[\[([\s\S]+?)\]\]/g, '<mark class="demo__mark">$1</mark>');
const plain = (s) => String(s || '').replace(/\[\[|\]\]/g, '');
const initials = (name) => plain(name).split(/[\s,]+/).filter((w) => /^[A-ZÄÖÜ]/.test(w)).slice(0, 2).map((w) => w[0]).join('');

function tabelle(t, { cap = '' } = {}) {
  const num = new Set(t.num || []);
  const markiert = new Set(t.markiert || []);
  // data-label: am Handy wird jede Zeile zur Karte mit Beschriftung (css/demo.css)
  const lab = (i) => String(t.kopf[i] || '').replace(/<[^>]+>/g, '').replace(/"/g, '&quot;');
  const cell = (v, i, tag = 'td') => `<${tag}${num.has(i) ? ' class="num"' : ''}${tag === 'td' && lab(i) ? ` data-label="${lab(i)}"` : ''}>${v}</${tag}>`;
  return join([
    `<div class="tbl-wrap demo__tbl" tabindex="0" role="region" aria-label="${esc(cap || 'Tabelle')}">`,
    '<table class="tbl tbl--klein">',
    `<thead><tr>${t.kopf.map((h, i) => `<th scope="col"${num.has(i) ? ' class="num"' : ''}>${h}</th>`).join('')}</tr></thead>`,
    `<tbody>${t.zeilen.map((z, r) => `<tr${markiert.has(r) ? ' class="is-pruefen"' : ''}>${z.map((v, i) => cell(v, i)).join('')}</tr>`).join('')}</tbody>`,
    when(t.fuss, () => `<tfoot>${t.fuss.map((z, r) => `<tr${r === t.fuss.length - 1 ? ' class="is-total"' : ''}>${z.map((v, i) => cell(v, i)).join('')}</tr>`).join('')}</tfoot>`),
    '</table>',
    '</div>',
  ]);
}

// Hoehen der Balken der Sprachnachricht (fest, damit jedes Laden gleich aussieht)
const WAVE = [30, 55, 80, 45, 65, 95, 70, 40, 60, 85, 50, 35, 75, 100, 60, 45, 70, 90, 55, 30, 50, 80, 65, 40, 55, 75, 45, 30, 50, 35];

const felder = (list, c = '') => `<dl class="${cls('demo__felder', c)}">${list.map(([k, v]) => `<div><dt>${mark(k)}</dt><dd>${mark(v)}</dd></div>`).join('')}</dl>`;

/* ------------------------------------------------------------------ Eingang */

function eingang(ctx, e) {
  const icon = ctx.c.icon;
  switch (e.typ) {
    case 'mail':
      return join([
        '<div class="demo-mail">',
        '<div class="demo-mail__head">',
        `<span class="demo-ava" aria-hidden="true">${initials(e.von)}</span>`,
        `<div class="demo-mail__who"><p class="demo-mail__from">${e.von}</p><p class="demo-mail__addr">${esc(e.adresse)}</p></div>`,
        `<p class="demo-mail__time">${e.zeit}</p>`,
        '</div>',
        `<p class="demo-mail__subj"><span class="sr">Betreff: </span>${e.betreff}</p>`,
        `<div class="demo-mail__body">${e.text.map((p) => `<p>${mark(p)}</p>`).join('')}</div>`,
        '</div>',
      ]);
    case 'sprache':
      return join([
        '<div class="demo-voice">',
        '<div class="demo-voice__player">',
        `<span class="demo-voice__play">${icon('mikro')}</span>`,
        `<span class="demo-voice__wave" aria-hidden="true">${WAVE.map((h) => `<i style="--h:${h}%"></i>`).join('')}</span>`,
        `<span class="demo-voice__dur"><span class="sr">Länge </span>${e.dauer}</span>`,
        '</div>',
        `<p class="demo-voice__from">Sprachnachricht von ${e.von} · ${e.zeit}</p>`,
        '<p class="demo-voice__leer">Noch nicht abgeschrieben.</p>',
        `<div class="demo-voice__text demo__abschrift"><p class="demo__label">Abschrift</p>${e.text.map((p) => `<p>${mark(p)}</p>`).join('')}</div>`,
        '</div>',
      ]);
    case 'chat':
      return join([
        '<div class="demo-chat">',
        `<p class="demo-chat__head">${icon('chat')}<span>${e.kanal} · ${e.von}</span></p>`,
        `<div class="demo-chat__bubble">${e.text.map((p) => `<p>${mark(p)}</p>`).join('')}<p class="demo-chat__time">${e.zeit}</p></div>`,
        '</div>',
      ]);
    case 'pdf':
      return join([
        '<div class="demo-pdf">',
        `<p class="demo-pdf__file">${icon('dokument')}<span>${e.datei}</span></p>`,
        '<div class="demo-pdf__page">',
        `<p class="demo-pdf__sender"><span class="demo-pdf__logo" aria-hidden="true"></span>${mark(e.absender)}</p>`,
        `<p class="demo-pdf__title">${e.titel}</p>`,
        felder(e.felder, 'demo-pdf__meta'),
        `<ul class="demo-pdf__lines">${e.zeilen.map(([a]) => `<li>${a}</li>`).join('')}</ul>`,
        felder(e.total, 'demo-pdf__total'),
        '</div>',
        '</div>',
      ]);
    case 'dateien':
      return join([
        '<div class="demo-files">',
        e.text.map((p) => `<p class="demo-files__intro">${mark(p)}</p>`),
        `<ul class="demo-files__list">${e.dateien.map((f) => `<li class="${cls('demo-file', f.unklar && 'is-unklar')}"><span class="demo-file__icon">${icon('dokument')}<span>PDF</span></span><span class="demo-file__text"><span class="demo-file__name">${f.name}</span><span class="demo-file__info">${f.info}</span></span></li>`).join('')}</ul>`,
        '</div>',
      ]);
    case 'mehrere':
      return `<ul class="demo-multi">${e.nachrichten.map((m) => join([
        '<li class="demo-multi__item">',
        `<p class="demo-multi__head"><span class="demo-multi__icon">${icon(m.icon)}</span><span class="demo-multi__kanal">${m.kanal}</span><span class="demo-multi__zeit">${m.zeit}</span></p>`,
        `<p class="demo-multi__von">${m.von}</p>`,
        `<p class="demo-multi__text">${mark(m.text)}</p>`,
        '</li>',
      ])).join('\n')}</ul>`;
    default:
      throw new Error(`Demo: unbekannter Eingang "${e.typ}"`);
  }
}

/* ------------------------------------------------------------------ Schritte */

function dokument(d, name) {
  return join([
    `<div class="${cls('demo-doc', `demo-doc--${d.art}`)}">`,
    when(d.badge, () => `<p class="demo-doc__badge">${d.badge}</p>`),
    when(d.kopf, () => `<dl class="demo-doc__kopf">${d.kopf.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`),
    when(d.text, () => `<div class="demo-doc__text">${d.text.map((p) => `<p>${p}</p>`).join('')}</div>`),
    when(d.felder, () => felder(d.felder, 'demo-doc__felder')),
    when(d.tabelle, () => tabelle(d.tabelle, { cap: name })),
    '</div>',
  ]);
}

function schritt(ctx, s, i, n, T) {
  const sie = !!s.entscheid;
  const e = typeof s.entscheid === 'object' ? s.entscheid : {};
  const liste = (items, art) => `<ul class="${cls('demo__liste', art && `demo__liste--${art}`)}">${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  return join([
    `<li class="${cls('demo__step', sie && 'demo__step--sie')}" data-name="${esc(s.name)}">`,
    `<span class="demo__node" aria-hidden="true">${i + 1}</span>`,
    '<div class="demo__body">',
    `<p class="demo__name"><span class="sr">Schritt ${i + 1} von ${n}: </span>${s.name}${sie ? ctx.c.who('sie') : ctx.c.who('ki')}</p>`,
    when(s.text, () => `<p class="demo__text">${s.text}</p>`),
    when(s.chips, () => `<ul class="demo__chips">${s.chips.map((x) => `<li>${x}</li>`).join('')}</ul>`),
    when(s.felder, () => felder(s.felder)),
    when(s.liste, () => liste(s.liste, s.listeArt)),
    when(s.dokument, () => dokument(s.dokument, s.name)),
    when(s.ok, () => `<p class="demo__ok">${s.ok}</p>`),
    when(s.hinweis, () => `<p class="demo__hinweis">${s.hinweis}</p>`),
    when(sie, () => join([
      '<div class="demo__decide" hidden>',
      `<button type="button" class="btn btn--sm" data-act="ja" data-msg="${esc(e.msgJa || T.msgJa)}">${esc(e.ja || T.ja)}</button>`,
      `<button type="button" class="btn btn--sm btn--secondary" data-act="nein" data-msg="${esc(e.msgNein || T.msgNein)}">${esc(e.nein || T.nein)}</button>`,
      '</div>',
      '<p class="demo__msg" role="status"></p>',
    ])),
    '</div>',
    '</li>',
  ]);
}

function szene(ctx, key, sc, first, T) {
  const n = sc.schritte.length;
  return join([
    `<div class="demo__scene" data-scene="${esc(key)}" data-total="${n}"${first ? '' : ' hidden'}>`,
    '<div class="demo__grid">',
    '<div class="demo__in">',
    `<h3 class="demo__h">${esc(T.eingang)}<span class="demo__kontext">${sc.kontext}</span></h3>`,
    eingang(ctx, sc.eingang),
    '</div>',
    '<div class="demo__out">',
    `<h3 class="demo__h">${esc(T.assistent)}</h3>`,
    `<p class="demo__empty">${T.leer}</p>`,
    `<ol class="demo__steps">${sc.schritte.map((s, i) => schritt(ctx, s, i, n, T)).join('\n')}</ol>`,
    when(sc.fussnote, () => `<p class="demo__fussnote">${sc.fussnote}</p>`),
    '</div>',
    '</div>',
    '</div>',
  ]);
}

/**
 * Demo-Assistent. id: eindeutig pro Seite. szenen: Schluessel aus demo.json (erste ist vorgewaehlt, eine einzige
 * blendet die Auswahl aus). link: Abschluss-Link im Fuss.
 */
function demoAssistent(ctx, { id = 'demo-app', szenen, link = { href: 'kontakt/?thema=ki-check', label: 'KI-Check anfragen' } } = {}) {
  const D = ctx.data.demo;
  if (!D) throw new Error('Demo: _src/data/demo.json fehlt');
  const T = D.texte;
  const keys = szenen && szenen.length ? szenen : Object.keys(D.szenen);
  for (const k of keys) if (!D.szenen[k]) throw new Error(`Demo: Szene "${k}" fehlt in demo.json`);
  const jsTexte = { schritt: T.schritt, bereit: T.bereit, fertig: T.fertig, arbeitet: T.arbeitet };
  const pick = keys.length > 1 ? join([
    '<fieldset class="demo__pick" hidden>',
    `<legend class="demo__legend">${esc(T.auswahl)}</legend>`,
    '<div class="demo__opts">',
    keys.map((k, i) => `<label class="demo__opt"><input type="radio" name="${esc(id)}-szene" value="${esc(k)}"${i === 0 ? ' checked' : ''}><span>${D.szenen[k].label}</span></label>`).join(''),
    '</div>',
    '</fieldset>',
  ]) : '';
  return join([
    `<div class="${cls('demo', keys.length === 1 && 'demo--fix')}" id="${esc(id)}" data-demo${attrs({ 'data-texte': JSON.stringify(jsTexte) })}>`,
    `<div class="demo__bar"><span class="demo__dots" aria-hidden="true"><i></i><i></i><i></i></span><p class="demo__title">${esc(T.fenster)}</p></div>`,
    `<p class="demo__band">${ctx.c.icon('schild')}<span>${esc(T.band)}</span></p>`,
    pick,
    keys.map((k, i) => szene(ctx, k, D.szenen[k], i === 0, T)),
    join([
      '<div class="demo__ctrl" hidden>',
      `<p class="demo__progress" role="status">${esc(T.bereit.replace('{gesamt}', D.szenen[keys[0]].schritte.length))}</p>`,
      '<div class="demo__btns">',
      `<button type="button" class="btn btn--sm" data-act="next">${esc(T.weiter)}<span class="btn__arrow" aria-hidden="true"></span></button>`,
      `<button type="button" class="btn btn--sm btn--secondary" data-act="all"><span>${esc(T.alle).replace(/^(\S+) (\S+) /, '$1 <span class="demo__lg">$2 </span>')}</span></button>`,
      `<button type="button" class="btn btn--sm btn--ghost" data-act="reset" aria-disabled="true">${esc(T.neu)}</button>`,
      '</div>',
      '</div>',
    ]),
    `<p class="demo__foot">${esc(T.fuss)} ${link ? ctx.c.more(link) : ''}</p>`,
    '</div>',
  ]);
}

module.exports = { demoAssistent };
