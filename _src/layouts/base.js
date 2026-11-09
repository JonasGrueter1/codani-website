'use strict';
// Layout aller hellen Unterseiten: kein three.js, kein GSAP. CSS: site.css plus optional eine Bereichsdatei
// (meta.css, z. B. ['ki']). JS: site.js plus optional Bereichs-Skripte (meta.js, z. B. ['demo']).

const { join } = require('../lib/html');
const { headMeta, header, footer } = require('../components/layout');

module.exports = function base(ctx, body) {
  const { page } = ctx;
  const css = (page.css || []).map((n) => `<link rel="stylesheet" href="${ctx.url(`css/${n}.css`)}">`);
  const js = (page.js || []).map((n) => `<script src="${ctx.url(`js/${n}.js`)}" defer></script>`);
  return join([
    '<!doctype html>',
    `<html lang="${ctx.site.seite.sprache}" class="no-js">`,
    '<head>',
    headMeta(ctx),
    `<link rel="preload" href="${ctx.url('assets/fonts/geist-latin-var.woff2')}" as="font" type="font/woff2" crossorigin>`,
    `<link rel="stylesheet" href="${ctx.url('css/site.css')}">`,
    css,
    "<script>document.documentElement.classList.replace('no-js', 'js');</script>",
    `<script src="${ctx.url('js/site.js')}" defer></script>`,
    `<script src="${ctx.url('js/suche.js')}" defer></script>`,
    js,
    '</head>',
    `<body id="top" class="page page--${page.id}">`,
    '<a class="skip-link" href="#inhalt">Zum Inhalt springen</a>',
    header(ctx),
    '<main id="inhalt" tabindex="-1">',
    body,
    '</main>',
    footer(ctx),
    '</body>',
    '</html>',
    '',
  ]);
};
