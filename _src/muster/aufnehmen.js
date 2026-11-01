#!/usr/bin/env node
'use strict';
// Nimmt die Musterseiten als Produktbilder auf (Laptop 1440 x 900, Handy 390 x 844) und schreibt WebP nach
// studio/assets/img/muster-<name>-laptop.webp, -laptop-800.webp und -handy.webp.
// Braucht Playwright mit Chromium (nur auf dem Arbeitsrechner, nicht Teil des Builds).
//
//   node studio/_src/muster/aufnehmen.js                 alle Musterseiten
//   node studio/_src/muster/aufnehmen.js fahrschule      nur eine
//   node studio/_src/muster/aufnehmen.js --png /tmp/x    zusaetzlich PNG zum Ansehen in einen Ordner

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const DIR = __dirname;
const OUT = path.resolve(DIR, '..', '..', 'assets', 'img');
const args = process.argv.slice(2);
const pngDir = args.includes('--png') ? args[args.indexOf('--png') + 1] : '';
const ALLE = ['schreinerei-a', 'schreinerei-b', 'fahrschule', 'treuhand'];
const namen = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--png');
const liste = namen.length ? namen : ALLE;

const ZIELE = [
  { suffix: 'laptop', vp: { width: 1440, height: 900 }, dsf: 1, out: [{ w: 1440, h: 900, q: 0.8, s: '' }, { w: 800, h: 500, q: 0.82, s: '-800' }] },
  { suffix: 'handy', vp: { width: 390, height: 844 }, dsf: 2, mobile: true, out: [{ w: 585, h: 1266, q: 0.8, s: '' }] },
];

(async () => {
  const browser = await chromium.launch();
  const enc = await (await browser.newContext()).newPage();
  for (const name of liste) {
    const file = path.join(DIR, `${name}.html`);
    if (!fs.existsSync(file)) { console.error(`Fehlt: ${file}`); process.exitCode = 1; continue; }
    for (const z of ZIELE) {
      const ctx = await browser.newContext({ viewport: z.vp, deviceScaleFactor: z.dsf, isMobile: !!z.mobile, hasTouch: !!z.mobile });
      const page = await ctx.newPage();
      await page.goto('file://' + file);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const png = await page.screenshot({ type: 'png' });
      await ctx.close();
      if (pngDir) { fs.mkdirSync(pngDir, { recursive: true }); fs.writeFileSync(path.join(pngDir, `${name}-${z.suffix}.png`), png); }
      for (const o of z.out) {
        const data = await enc.evaluate(async ({ b64, w, h, q }) => {
          const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
          const bmp = await createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(bmp, 0, 0);
          return c.toDataURL('image/webp', q).split(',')[1];
        }, { b64: png.toString('base64'), w: o.w, h: o.h, q: o.q });
        const target = path.join(OUT, `muster-${name}-${z.suffix}${o.s}.webp`);
        fs.writeFileSync(target, Buffer.from(data, 'base64'));
        console.log(`${path.relative(process.cwd(), target)}  ${Math.round(Buffer.byteLength(data, 'base64') / 1024)} KB`);
      }
    }
  }
  await browser.close();
})();
