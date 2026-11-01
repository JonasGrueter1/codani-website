'use strict';
// Erzeugt die PDFs der Muster-Unterlagen aus den gebauten Seiten (Druckansicht, A4).
// Braucht Playwright (nicht Teil des Builds). Nach jeder Textaenderung an pages/unterlagen-*.js:
//   node studio/_src/build.js && node studio/_src/unterlagen-pdf.js
// Ergebnis: studio/assets/docs/muster-vertraulichkeit.pdf, muster-auftragsbearbeitung.pdf

const http = require('http');
const fs = require('fs');
const path = require('path');

const STUDIO = path.resolve(__dirname, '..');
const OUT = path.join(STUDIO, 'assets', 'docs');
const DOCS = [
  ['unterlagen/vertraulichkeit/', 'muster-vertraulichkeit.pdf'],
  ['unterlagen/auftragsbearbeitung/', 'muster-auftragsbearbeitung.pdf'],
];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.pdf': 'application/pdf' };

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.error('Playwright fehlt. Installieren: npm i -g playwright (oder NODE_PATH setzen).');
  process.exit(1);
}

const srv = http.createServer((q, r) => {
  let f = path.join(STUDIO, decodeURIComponent(q.url.split('?')[0].split('#')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(STUDIO) || !fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});

srv.listen(0, async () => {
  const port = srv.address().port;
  const browser = await chromium.launch();
  fs.mkdirSync(OUT, { recursive: true });
  try {
    for (const [page, file] of DOCS) {
      const p = await browser.newPage();
      await p.goto(`http://localhost:${port}/${page}`, { waitUntil: 'networkidle' });
      await p.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
      await p.evaluate(() => document.fonts && document.fonts.ready);
      await p.pdf({ path: path.join(OUT, file), format: 'A4', printBackground: true, preferCSSPageSize: true });
      console.log(`${file} geschrieben`);
      await p.close();
    }
  } finally {
    await browser.close();
    srv.close();
  }
});
