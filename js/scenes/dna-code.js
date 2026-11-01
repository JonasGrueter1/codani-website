// Szene "dna": Inhalte. Echte Code-Schnipsel fuer die beiden Straenge, ein kleiner Tokenizer fuer die
// Syntax-Farben und das Website-Geruest (Querformat und Hochformat) am Ende der Helix.
//
// Strang A = Website (HTML, CSS), Strang B = KI und Logik (JavaScript, Python).
// Die beiden Angebote von Jonas sind die zwei Straenge, die Basenpaare verbinden sie.

/* ------------------------------------------------------------- Code */
export const CODE_A = `<!doctype html>
<html lang="de-CH">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ihre Firma</title>
<header class="nav">
  <a class="logo" href="/">Ihre Firma</a>
  <nav><a href="#angebot">Angebot</a> <a href="#kontakt">Kontakt</a></nav>
</header>
<section class="hero">
  <h1>Ihre neue Website.</h1>
  <p>Modern, schnell und auf dem Handy so gut wie am Computer.</p>
  <a class="btn" href="#kontakt">Offerte anfragen</a>
</section>
:root { --accent: #46e6ff; --ink: #0d141d; --radius: 14px; }
.hero { display: grid; gap: clamp(1rem, 4vw, 3rem); min-height: 100svh; }
.btn { border-radius: var(--radius); transition: transform .3s ease; }
.btn:hover { transform: translateY(-2px); }
@media (max-width: 760px) { .hero { grid-template-columns: 1fr; } }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
img { max-width: 100%; height: auto; object-fit: cover; }
<!-- Karten: Leistungen, Team, Standort -->
<article class="card"><h3>Leistungen</h3><p>Alles auf einen Blick.</p></article>`;

export const CODE_B = `const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => e.target.classList.toggle('is-in', e.isIntersecting));
}, { threshold: 0.2 });
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await fetch('/api/anfrage', { method: 'POST', body: new FormData(form) });
  status.textContent = res.ok ? 'Danke, wir melden uns.' : 'Bitte erneut versuchen.';
});
# Assistent für Kundenanfragen
def antworte(anfrage: str, wissen: list[str]) -> str:
    kontext = "\\n".join(suche(wissen, anfrage, k=4))
    return assistent.frage(system=REGELN, kontext=kontext, frage=anfrage)
for mail in posteingang.neu():
    entwurf = antworte(mail.text, dokumente)
    mail.entwurf_speichern(entwurf)
# Daten aus PDF-Offerten lesen
daten = [lies_pdf(p) for p in Path("offerten").glob("*.pdf")]
bericht = {"anzahl": len(daten), "offen": sum(1 for d in daten if not d["erledigt"])}`;

/* -------------------------------------------------------- Syntax-Klassen */
// Index in die Farbtabelle des Glyph-Shaders (dna-shaders.js, uCol)
export const CLS = Object.freeze({
  plainA: 0, keyA: 1, string: 2, punct: 3, number: 4, plainB: 5, keyB: 6, bracket: 7, dust: 8,
  head: 9, label: 10, button: 11,
});

const KEYWORDS = new Set([
  'const', 'let', 'new', 'async', 'await', 'return', 'def', 'for', 'in', 'if', 'not', 'import', 'from', 'true',
  'false', 'function', 'class', 'href', 'lang', 'content', 'name', 'display', 'grid', 'gap', 'transition',
  'transform', 'media', 'repeat', 'var', 'clamp', 'sum', 'len',
]);
const TAGS = new Set(['html', 'meta', 'title', 'header', 'nav', 'section', 'h1', 'h3', 'p', 'a', 'article', 'doctype', 'img']);

/**
 * Zerlegt Code in Zeichen mit Syntax-Klasse. Zeilenumbrueche und Einrueckung werden zu zwei Leerzeichen,
 * damit der Code als fortlaufendes Band entlang eines Strangs laeuft.
 * @returns {{ch: string, cls: number}[]}
 */
export function tokenize(src, strand) {
  const plain = strand === 0 ? CLS.plainA : CLS.plainB;
  const key = strand === 0 ? CLS.keyA : CLS.keyB;
  const lines = src.split('\n').map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    let i = 0;
    const n = line.length;
    const isComment = line.startsWith('#') || line.startsWith('//') || line.startsWith('<!--');
    while (i < n) {
      const c = line[i];
      if (isComment) { out.push({ ch: c, cls: CLS.punct }); i++; continue; }
      if (c === '"' || c === "'") { // String
        let j = i + 1;
        while (j < n && line[j] !== c) j++;
        for (let k = i; k <= Math.min(j, n - 1); k++) out.push({ ch: line[k], cls: CLS.string });
        i = j + 1;
        continue;
      }
      if (/[A-Za-z_À-ÿ]/.test(c)) { // Wort
        let j = i;
        while (j < n && /[A-Za-z0-9_\-À-ÿ]/.test(line[j])) j++;
        const w = line.slice(i, j);
        const prev = line[i - 1];
        let cls = plain;
        if (KEYWORDS.has(w)) cls = key;
        else if (TAGS.has(w) && (prev === '<' || prev === '/' || prev === '!')) cls = key;
        else if (line[j] === '(') cls = CLS.number;
        for (let k = i; k < j; k++) out.push({ ch: line[k], cls });
        i = j;
        continue;
      }
      if (/[0-9#]/.test(c)) { // Zahl oder Farbwert
        let j = i;
        while (j < n && /[0-9a-fA-F#.%a-z]/.test(line[j])) j++;
        for (let k = i; k < j; k++) out.push({ ch: line[k], cls: CLS.number });
        i = j;
        continue;
      }
      out.push({ ch: c, cls: c === ' ' ? plain : CLS.punct });
      i++;
    }
    out.push({ ch: ' ', cls: plain }, { ch: ' ', cls: plain });
  }
  return out;
}

/* ------------------------------------------------------ Website-Geruest */
// Koordinaten von oben links (x nach rechts, y nach unten) in Welt-Einheiten. dna-build.js rechnet in
// Mittelpunkt-Koordinaten um (y nach oben). L = Querformat (W x H aus ANCHORS.wireframe), P = Hochformat (H x W).
// kind: 0 Rechteck, 1 Linie/Balken, 2 Kreis, 3 Bildplatzhalter, 4 Layout-Raster
// t0/dur in local der Szene (Zeichnen der Kontur), layer: Ebene fuer die Explosionsansicht vor dem Zusammensetzen.
export function wireframeSpec(W, H) {
  // Querformat-Raster: Inhalt von x 0.36 bis W - 0.36
  const cx = W / 2;
  const cardW = (W - 0.72 - 0.32) / 3;
  const cardsL = [0, 1, 2].map((i) => 0.36 + i * (cardW + 0.16));
  const els = [
    { id: 'grid', kind: 4, L: [0.36, 0.44, W - 0.36, H - 0.14], P: [0.3, 0.5, H - 0.3, W - 0.2], r: 0, sw: 0, fill: 1, t0: 0.53, dur: 0.1, layer: -0.6, bright: 1 },
    { id: 'frame', kind: 0, L: [0, 0, W, H], P: [0, 0, H, W], r: 0.14, rP: 0.24, sw: 0.016, fill: 0.03, t0: 0.555, dur: 0.12, layer: 0, bright: 0.95 },
    { id: 'titlebar', kind: 1, L: [0, 0.34, W, 0.34], P: [0, 0.42, H, 0.42], sw: 0.01, t0: 0.62, dur: 0.07, layer: 0, bright: 0.7 },
    { id: 'dot1', kind: 2, L: [0.22, 0.17, 0.045], P: null, sw: 0.011, fill: 0.2, t0: 0.635, dur: 0.035, layer: 0.2, bright: 0.9 },
    { id: 'dot2', kind: 2, L: [0.36, 0.17, 0.045], P: null, sw: 0.011, fill: 0.2, t0: 0.645, dur: 0.035, layer: 0.2, bright: 0.9 },
    { id: 'dot3', kind: 2, L: [0.5, 0.17, 0.045], P: null, sw: 0.011, fill: 0.2, t0: 0.655, dur: 0.035, layer: 0.2, bright: 0.9 },
    { id: 'address', kind: 0, L: [cx - 0.85, 0.085, cx + 0.85, 0.255], P: [0.3, 0.12, H - 0.3, 0.3], r: 0.085, sw: 0.011, fill: 0.05, t0: 0.645, dur: 0.06, layer: 0.2, bright: 0.85 },
    { id: 'logo', kind: 2, L: [0.5, 0.62, 0.08], P: [0.42, 0.7, 0.08], sw: 0.013, fill: 0.35, t0: 0.665, dur: 0.04, layer: 0.8, bright: 1.2 },
    { id: 'cta', kind: 0, L: [W - 0.94, 0.5, W - 0.36, 0.74], P: null, r: 0.12, sw: 0.012, fill: 0.08, t0: 0.69, dur: 0.05, layer: 0.8, bright: 1 },
    { id: 'burger1', kind: 1, L: null, P: [H - 0.62, 0.62, H - 0.32, 0.62], sw: 0.016, t0: 0.69, dur: 0.03, layer: 0.8, bright: 0.9 },
    { id: 'burger2', kind: 1, L: null, P: [H - 0.62, 0.7, H - 0.32, 0.7], sw: 0.016, t0: 0.695, dur: 0.03, layer: 0.8, bright: 0.9 },
    { id: 'burger3', kind: 1, L: null, P: [H - 0.62, 0.78, H - 0.32, 0.78], sw: 0.016, t0: 0.7, dur: 0.03, layer: 0.8, bright: 0.9 },
    { id: 'image', kind: 3, L: [3.0, 0.98, W - 0.36, 2.48], P: [0.3, 3.3, H - 0.3, 4.5], r: 0.08, sw: 0.012, fill: 0.04, t0: 0.67, dur: 0.1, layer: 1.2, bright: 0.95 },
    { id: 'sub1', kind: 1, L: [0.36, 1.97, 2.6, 1.97], P: [0.3, 2.1, H - 0.5, 2.1], sw: 0.042, t0: 0.72, dur: 0.05, layer: 1.6, bright: 0.32 },
    { id: 'sub2', kind: 1, L: [0.36, 2.08, 2.05, 2.08], P: [0.3, 2.22, H - 1.1, 2.22], sw: 0.042, t0: 0.735, dur: 0.05, layer: 1.6, bright: 0.32 },
    { id: 'btn1', kind: 0, L: [0.36, 2.2, 1.8, 2.5], P: [0.3, 2.44, H - 0.3, 2.72], r: 0.15, rP: 0.14, sw: 0.014, fill: 0.2, t0: 0.74, dur: 0.05, layer: 2, bright: 1.25 },
    { id: 'btn2', kind: 0, L: [1.94, 2.2, 2.9, 2.5], P: [0.3, 2.84, H - 0.3, 3.12], r: 0.15, rP: 0.14, sw: 0.012, fill: 0.0, t0: 0.755, dur: 0.05, layer: 2, bright: 0.9 },
  ];
  cardsL.forEach((x0, i) => {
    const P = i === 0;
    els.push(
      { id: `card${i}`, kind: 0, L: [x0, 2.66, x0 + cardW, 3.2], P: P ? [0.3, 4.7, H - 0.3, 5.36] : null, r: 0.07, sw: 0.011, fill: 0.03, t0: 0.74 + i * 0.015, dur: 0.065, layer: 1, bright: 0.85 },
      { id: `icon${i}`, kind: 2, L: [x0 + 0.21, 2.87, 0.075], P: P ? [0.53, 4.92, 0.075] : null, sw: 0.011, fill: 0.15, t0: 0.775 + i * 0.015, dur: 0.035, layer: 1.4, bright: 1 },
      { id: `cline${i}`, kind: 1, L: [x0 + 0.21, 3.05, x0 + cardW - 0.35, 3.05], P: P ? [0.53, 5.14, H - 0.9, 5.14] : null, sw: 0.03, t0: 0.785 + i * 0.015, dur: 0.04, layer: 1.4, bright: 0.28 },
    );
  });

  // Texte: x/y = Ankerpunkt, size = Zellgroesse der Glyphe, align: 'l' links, 'c' zentriert
  const texts = [
    { str: 'ihre-firma', L: [cx, 0.17, 0.17, 'c'], P: [H / 2, 0.21, 0.16, 'c'], cls: 'label', t0: 0.69, layer: 0.2 },
    { str: 'IHRE FIRMA', L: [0.66, 0.62, 0.13, 'l'], P: [0.58, 0.7, 0.17, 'l'], cls: 'label', t0: 0.695, layer: 0.8 },
    { str: 'Angebot', L: [W - 2.6, 0.62, 0.12, 'l'], P: null, cls: 'label', t0: 0.705, layer: 0.8 },
    { str: 'Über uns', L: [W - 2.06, 0.62, 0.12, 'l'], P: null, cls: 'label', t0: 0.712, layer: 0.8 },
    { str: 'Kontakt', L: [W - 1.46, 0.62, 0.12, 'l'], P: null, cls: 'label', t0: 0.72, layer: 0.8 },
    { str: 'Anfrage', L: [W - 0.65, 0.62, 0.12, 'c'], P: null, cls: 'button', t0: 0.73, layer: 0.8 },
    { str: 'Ihre neue', L: [0.36, 1.2, 0.46, 'l'], P: [0.3, 1.32, 0.44, 'l'], cls: 'head', t0: 0.72, layer: 1.8 },
    { str: 'Website.█', L: [0.36, 1.62, 0.46, 'l'], P: [0.3, 1.72, 0.44, 'l'], cls: 'head', t0: 0.745, layer: 1.8 },
    { str: 'Offerte anfragen', L: [1.08, 2.35, 0.165, 'c'], P: [H / 2, 2.58, 0.15, 'c'], cls: 'button', t0: 0.76, layer: 2 },
    { str: 'Mehr erfahren', L: [2.42, 2.35, 0.1, 'c'], P: [H / 2, 2.98, 0.15, 'c'], cls: 'label', t0: 0.77, layer: 2 },
    ...['Leistungen', 'Team', 'Standort'].map((s, i) => ({
      str: s, L: [cardsL[i] + 0.36, 2.87, 0.11, 'l'], P: i === 0 ? [0.72, 4.92, 0.16, 'l'] : null, cls: 'label', t0: 0.77 + i * 0.01, layer: 1.4,
    })),
  ];
  // Zeitplan straffen: das Geruest steht bei local ~0.72, alle Texte sind spaetestens bei ~0.76 entschluesselt
  // (danach bleibt das Bild ruhig stehen). Die Werte oben sind relativ zueinander gepflegt.
  const T = (t) => 0.5 + (t - 0.53) * 0.72;
  for (const e of els) { e.t0 = T(e.t0); e.dur *= 0.75; }
  for (const t of texts) t.t0 = T(t.t0);
  // Kleine Beschriftungen waeren bei wenigen Pixeln Pixelbrei (aus n wird r). Sie werden zu ruhigen Balken.
  // Querformat: als Text bleiben nur Headline, Adresse und Hauptbutton (gross genug, mindestens ~14 px Versalhoehe).
  // Hochformat (Handy): nur die grosse Headline.
  const SMALL = 0.3;
  const KEEP_L = new Set(['ihre-firma', 'Offerte anfragen']);
  const bar = (spec, str, w) => {
    const [x, y, size, align] = spec;
    const len = Math.min(w - 0.9, [...str].length * size * 0.42);
    const x0 = align === 'c' ? x - len / 2 : x;
    return [x0, y, x0 + len, y];
  };
  for (const t of texts) {
    const barL = t.L && t.cls !== 'head' && !KEEP_L.has(t.str);
    const barP = t.P && t.P[2] < SMALL;
    if (!barL && !barP) continue;
    const size = (barP ? t.P : t.L)[2];
    els.push({
      id: `bar-${t.str}`, kind: 1, L: barL ? bar(t.L, t.str, W) : null, P: barP ? bar(t.P, t.str, H) : null,
      sw: size * 0.34, t0: t.t0 + 0.01, dur: 0.03, layer: t.layer, bright: 0.38,
    });
    if (barL) t.L = null;
    if (barP) t.P = null;
  }
  return { els, texts: texts.filter((t) => t.L || t.P) };
}
