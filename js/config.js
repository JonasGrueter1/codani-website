// Zentrale Konstanten fuer die immersive Strecke.
// Alle Szenen-Module lesen Farben, Masse und Zeitfenster von hier (ueber ctx), nie hart codiert.
// Aenderungen hier wirken auf alle Szenen: vorher ARCHITEKTUR.md lesen.
import * as THREE from 'three';

const v = (x, y, z) => Object.freeze(new THREE.Vector3(x, y, z));

/* ------------------------------------------------------------------ Farben */
// Hex-Werte sind sRGB (wie in CSS). THREE.Color rechnet sie beim Setzen in linear um.
export const HEX = Object.freeze({
  void: 0x04060a,      // Hintergrund, Nebel
  deep: 0x070b12,      // tiefe Flaechen
  ink: 0x0d141d,       // dunkle Schale, Paneele
  steel: 0x2a3644,     // Kanten, Linien im Schatten
  mist: 0x8a99a8,      // gedaempfte Linien
  white: 0xe9f2f7,     // fast weiss, kuehl
  signal: 0x46e6ff,    // Akzent: elektrisches Cyan (Licht, Daten, Impulse)
  ice: 0xbdf6ff,       // heller Kern von Cyan-Glow
  ember: 0xffa45c,     // Gegenlicht: warmes Glimmen (Funken, Menschliches)
  emberDeep: 0xff7a2e, // tiefes Warm fuer Kerne
});

// Fertige THREE.Color-Objekte (linear). Nicht veraendern, bei Bedarf .clone().
export const PALETTE = Object.freeze(
  Object.fromEntries(Object.entries(HEX).map(([k, hex]) => [k, new THREE.Color(hex)]))
);

/* ------------------------------------------------------------- Qualitaet */
// particles: Faktor fuer Partikel-/Instanzzahlen. bloomScale: Aufloesung der Bloom-Kette.
export const QUALITY = Object.freeze({
  high: { dprMax: 2, dprMin: 1, msaa: 4, bloomScale: 1, particles: 1, aberration: true },
  medium: { dprMax: 1.5, dprMin: 0.85, msaa: 0, bloomScale: 1, particles: 0.5, aberration: false },
  low: { dprMax: 1, dprMin: 0.7, msaa: 0, bloomScale: 0.75, particles: 0.25, aberration: false },
});

/* ------------------------------------------------- Koordinaten und Masse */
// Y oben, rechtshaendig, Kamera schaut am Anfang Richtung -Z. 1 Einheit ~ 10 cm.
// Der Kopf des Roboters steht im Ursprung, das Gesicht zeigt nach +Z (zur Startkamera).
export const ANCHORS = Object.freeze({
  head: Object.freeze({ center: v(0, 0, 0), radii: v(0.82, 1.0, 0.92) }),
  neck: Object.freeze({ top: v(0, -0.85, -0.05), bottom: v(0, -1.55, -0.1), radius: 0.32 }),
  bust: Object.freeze({ center: v(0, -2.4, -0.15), shoulderWidth: 4.2, bottomY: -3.4 }),
  brain: Object.freeze({ center: v(0, 0.24, -0.06), radii: v(0.6, 0.48, 0.7) }),
  cableRoot: v(0, -0.28, -0.52),
  nodes: Object.freeze({
    email: v(-4.6, 1.8, -6.2),
    kalender: v(4.4, 2.2, -6.6),
    dokumente: v(-3.8, -2.0, -8.4),
    kunden: v(4.0, -1.6, -8.8),
    website: v(0, 0.5, -10.0),
  }),
  nodeRadius: 0.32,
  // Kapitel Code (dna): Helix hinter dem Website-Knoten, am Ende das Website-Geruest
  dna: Object.freeze({ start: v(0, 0.5, -10.4), end: v(0, 0.5, -32), radius: 1.1, turnLength: 4.2 }),
  wireframe: Object.freeze({ center: v(0, 0.5, -36), width: 5.6, height: 3.4 }),
});

/* ------------------------------------------------------- Hintergrund */
// Farbwelten des Hintergrund-Moduls (js/scenes/backdrop.js), eine pro Beat plus "inhalt" (Inhaltsbereich).
// backdrop.js mischt sie nach dem Fortschritt: weiche Kante BACKDROP_FADE (global) um jede Beat-Grenze, am Schnitt
// (Ende Code -> Ausklang) ein harter Wechsel im Lichtblitz, im Inhaltsbereich nach director.content zu "inhalt".
// Farben sRGB-Hex (wie HEX), gemischt wird linear. Punkte in Weltkoordinaten (ANCHORS):
//   glowAt     Gegenlicht-Halo liegt (vom Auge aus) hinter diesem Punkt, glowShift verschiebt ihn im Bild
//              (Anteil, x rechts, y oben). So bleibt das Licht beim Kreisen der Kamera hinter dem Motiv.
//   rayAt      Quelle der Lichtstrahlen (darf ausserhalb des Bildes liegen, die Strahlen fallen dann ins Bild)
//   accentAt   Richtung des Akzent-Dunsts (accent, meist ein warmer oder kuehler Gegenpol)
// Mengen 0..1 (Helligkeit linear, Kapitel 12 in ARCHITEKTUR.md). Fehlende Schluessel kommen aus `base` in backdrop.js.
// Kontrast-Regel: base unter 0.006, mid unter 0.025 relative Leuchtdichte; helle Teile (glow, rays, horizonGlow) nur
// auf der Seite des Motivs, nie hinter der Textspalte.
// Version 4 mit Kapitel Code (Scrollweg 780 statt 590 vh): globale Breiten mal 0.756, gleiche Breite in vh wie V4.
export const BACKDROP_FADE = 0.0265;
export const BACKDROPS = Object.freeze({
  // Tiefsee-Petrol: Nebel, Lichtstrahlen von oben (aus der Richtung des Lichtkegels der Partikel), Staub
  intro: {
    base: 0x03121a, mid: 0x072a35, hi: 0x1f6f7c, accent: 0x2b1a10, fogColor: 0x04161d,
    rayColor: 0x8fe3ee, starColor: 0xbdf6ff,
    glowAt: [0.3, -0.6, 0], glowShift: [0.02, 0.1], rayAt: [2.6, 10.5, -3.0], accentAt: [14, -6, -12],
    horizon: -0.02, horizonGlow: 0.2, glow: 0.42, glowSize: 1.3,
    fog: 0.9, fogScale: 1.0, fogSpeed: 0.004, rays: 1.0, rayFreq: 7, stars: 0.5, dust: 0.5, bokeh: 0.12,
    washA: 0x000000, washB: 0x2a7f9a, washC: 0xb8784a, wash: 0.3,
  },
  // Kuehles Fotostudio passend zur Android-Bueste: weiches Gegenlicht hinter dem Kopf, leiser Dunst, breite
  // schraege Lichtbahnen von oben rechts (Seite des Kantenlichts). Version 4 (Rueckmeldung "Hintergrund langweilig"):
  // dunkler, leicht spiegelnder Studio-Boden unter der Bueste (Lichtkegel um den Fuss, gespiegeltes Gegenlicht,
  // Lichtkante am Horizont) und drei grosse, weiche Lichtflaechen in Cyan, Violett und Ember, die langsam wandern
  robot: {
    base: 0x080c12, mid: 0x121b26, hi: 0x4d6b85, accent: 0x14100c, fogColor: 0x080d14,
    rayColor: 0x7f9fb8, starColor: 0xbdf6ff,
    washA: 0x8fd6ec, washB: 0x4a3ca8, washC: 0xd9905a,
    glowAt: [0, -0.35, 0], glowShift: [0.0, 0.06], rayAt: [6, 9, -7], accentAt: [-12, -4, 8],
    horizon: -0.12, horizonGlow: 0.16, glow: 0.9, glowSize: 1.7,
    fog: 0.35, fogScale: 0.8, fogSpeed: 0.002, rays: 0.28, rayFreq: 3, dust: 0.12,
    wash: 1.0, floor: 0.85, floorY: -3.5, floorShine: 1.3, pool: 1.0,
  },
  // Scan-Labor: wie das Studio, dazu Messraster, Scanlinie und Messkreis (steigen mit dem Roentgen-Scan)
  zoom: {
    base: 0x060f17, mid: 0x0d212c, hi: 0x3a87a0, accent: 0x0f4a5a, fogColor: 0x05141c,
    rayColor: 0x6fbfd0, gridColor: 0x2aa6bf, starColor: 0xbdf6ff,
    glowAt: [0, -0.2, 0], glowShift: [0.0, 0.04], rayAt: [6, 9, -7], accentAt: [0, -10, -10],
    washA: 0x5fd0e0, washB: 0x3a5fd8, washC: 0x4a3ca8,
    horizon: -0.08, horizonGlow: 0.15, glow: 0.8, glowSize: 1.5,
    fog: 0.4, fogScale: 0.9, fogSpeed: 0.003, rays: 0.12, rayFreq: 3, grid: 0.12, dust: 0.1,
    wash: 0.75, floor: 0.6, floorY: -3.5, floorShine: 1.1, pool: 0.6,
  },
  // Biolumineszenz: violetter Nebel, dessen Schwaden selbst leuchten (magenta, Raender tuerkis), Sporen; das Gehirn
  // bleibt Cyan davor. Gegenlicht hinter dem Hinterkopf (die Kamera taucht spaeter genau dorthin)
  brain: {
    base: 0x090518, mid: 0x1b0c33, hi: 0x7c36b0, accent: 0x102a30, fogColor: 0x0b0716,
    auroraA: 0x6a2fd8, auroraB: 0xb8338a, auroraEdge: 0x2fb7b0, starColor: 0x8fe8e0, bokehColor: 0xb8338a,
    glowAt: [0, 0.35, -1.6], glowShift: [0.2, 0.1], rayAt: [0, 10, -10], accentAt: [-6, -8, -14],
    horizon: -0.05, horizonGlow: 0.06, glow: 0.9, glowSize: 1.6,
    fog: 0.75, fogScale: 1.2, fogSpeed: 0.006, aurora: 1.0, dust: 0.35, bokeh: 0.18,
    washA: 0x000000, washB: 0x7a3fe0, washC: 0x2fb7b0, wash: 0.4,
  },
  // Glasfaser-Blau: tiefe Ebene weit unten mit Lichtpaketen auf feinen Bahnen, Bokeh, Sterne; Licht hinter dem
  // Website-Knoten
  cables: {
    base: 0x030916, mid: 0x0a1a33, hi: 0x2a63b8, accent: 0x0a1f40, fogColor: 0x040b1a,
    streakColor: 0x46e6ff, gridColor: 0x1d4f8f, bokehColor: 0x3a7fe0, starColor: 0xbdf6ff,
    glowAt: [0, 0.5, -14], glowShift: [0, 0], rayAt: [0, 10, -10], accentAt: [10, -10, -20],
    horizon: -0.04, horizonGlow: 0.3, glow: 0.55, glowSize: 1.4,
    fog: 0.3, fogScale: 1.0, fogSpeed: 0.004, streaks: 0.7, bokeh: 0.3, stars: 0.25,
    floor: 0.85, floorY: -9, floorGrid: 2.2, floorShine: 0.8,
    washA: 0x000000, washB: 0x5a3ccf, washC: 0x2a7fe0, wash: 0.5,
  },
  // Code-Raum Gruen-Tuerkis (wie V3), dazu die Lichtflaechen von V4: leiser Code-Regen auf der Tunnelwand, Lichtkern
  // beim Website-Geruest (-z), kuehle Lichtbahn und ein Rest Violett aus dem Kabel-Raum, unten Mint (kein Ember: der faerbte das Gruen
  // unter dem Geruest oliv). Kein Boden (die Kamera fliegt durch die Helix). Dynamik in backdrop.js.
  dna: {
    base: 0x02100e, mid: 0x05302a, hi: 0x17a888, accent: 0x0a3a30, fogColor: 0x03130f,
    codeColor: 0x1fd1a5, starColor: 0xbdf6ff, bokehColor: 0x2fd6b0,
    glowAt: [0, 0.5, -60], glowShift: [0, 0], rayAt: [0, 10, -10], accentAt: [0, -10, -30],
    washA: 0x5fe0c8, washB: 0x3a5fd8, washC: 0x2fb7b0,
    horizon: 0, horizonGlow: 0.2, glow: 0.6, glowSize: 1.2,
    fog: 0.3, fogScale: 1.1, fogSpeed: 0.004, code: 0.06, dust: 0.15, bokeh: 0.12, stars: 0.12,
    wash: 0.45,
  },
  // Morgenlicht: goldenes Horizontgluehen hinter den Schultern rechts (nie hinter dem Kontakt-Text links), Strahlen
  // von rechts oben, Goldstaub, oben kuehl
  outro: {
    base: 0x07080a, mid: 0x151210, hi: 0xe0a05a, accent: 0x1d3550, fogColor: 0x0b0a09,
    rayColor: 0xffd29a, starColor: 0xffd7a0,
    glowAt: [0.4, -1.3, -0.6], glowShift: [0.34, -0.05], rayAt: [9, 6, -10], accentAt: [-6, 30, -4],
    washA: 0xffc890, washB: 0x3a5fa8, washC: 0xc86a5a,
    horizon: -0.12, horizonGlow: 0.42, glow: 0.4, glowSize: 1.15,
    fog: 0.3, fogScale: 0.9, fogSpeed: 0.003, rays: 0.22, rayFreq: 5, dust: 0.14,
    wash: 0.85, floor: 0.8, floorY: -3.5, floorShine: 1.2, pool: 0.8,
  },
  // Inhaltsbereich: ruhig, nur Verlauf und ein Rest Waerme
  inhalt: {
    base: 0x05080d, mid: 0x0a0f16, hi: 0x2a1c12, accent: 0x000000, fogColor: 0x05080d,
    glowAt: [1.4, -1.7, -1.0], glowShift: [0.06, 0.0], horizon: -0.1, horizonGlow: 0.3, glow: 0.2, glowSize: 1.6,
    detail: 0.1,
  },
});

// Helles Thema (Kapitel 14 in ARCHITEKTUR.md): eigene Farbwelten mit denselben Schluesseln und derselben Dynamik
// (backdrop.js), aber anders gelesen (Lichtweg im Shader, CODANI_LIGHT). Zweite Runde 08.11.2026: "hell draussen,
// Abendlicht im Kopf".
//   Draussen (intro, robot, zoom bis zum Flug in den Kopf, outro): Studio-Hohlkehle in Blaugrau mit deutlicher Farbe
//   (Tuerkis, Blau, Flieder, ein Ember-Akzent), heller Horizont, Boden mit Spiegelung, Kontaktschatten und Punktraster,
//   Lichtbahnen, zwei grosse, unscharfe Glasringe (Echo des Helix-Logos), Lichtscheiben, Schwebeteilchen. Hinter dem
//   Text wird der Grund ruhiger und heller (calm).
//   Drinnen (zoom ab zoom@0.45 ueber `inner`, brain, cables, dna bis zum Schnitt): Abendlicht, tiefes Petrol bis
//   Schiefer-Blau mit etwas Flieder (Helligkeit rund 20 bis 40 %). Gehirn, Kabel und Code leuchten dort wie im dunklen
//   Thema (brain.js, cables.js, dna.js: themeKeep), Linien, Raster und Code-Regen des Hintergrunds sind hell.
// Schluessel (wie dunkel, hell gelesen):
//   base / mid   Hohlkehle oben (tiefer) und am Horizont (hell), hi = Licht hinter dem Motiv
//   accent       grosses, weiches Farbfeld aus accentAt, washA/B/C Farbfelder um das Gegenlicht (Softbox und Felder)
//   gridColor, streakColor, codeColor, rayColor   Linien, Pakete, Code-Zeichen, Lichtbahnen
//   pool, floorGrid, floorShine   Kontaktschatten, Punktraster und Spiegelung des Bodens
//   bokeh/bokehColor Lichtscheiben, dust + starColor Schwebeteilchen (draussen Tinte, drinnen hell)
// Nur hell:
//   vig, vigColor  Randabschattung nur des Hintergrunds
//   rings, ringA, ringB  zwei grosse, unscharfe Glasringe (Tuerkis und Ember) um das Gegenlicht, ringX Versatz
//   calm, calmColor      Grund hinter dem Text heller und ruhiger (Lesbarkeit)
//   dusk           0 draussen, 1 drinnen (backdrop.js setzt damit html.hell-abend fuer Kopfzeile und Text-Karten)
//   inner          Innenraum der Farbwelt zoom: mischt von zoom@0.45 bis 0.75 zu diesen Werten (nur hell)
// Die Punkte (glowAt, rayAt, accentAt) und Formen (floorY, glowSize, ...) bleiben wie im dunklen Thema.
const DUSK_BRAIN = {
  base: 0x394451, mid: 0x4f6274, hi: 0x8eaec1, accent: 0x57557b, fogColor: 0x445665,
  auroraA: 0x48657a, auroraB: 0x635a8c, auroraEdge: 0x73bdc7, bokehColor: 0xffffff, starColor: 0xcee5ed,
  gridColor: 0x80c7d7, washA: 0x447381, washB: 0x565381, washC: 0x447381, vigColor: 0x2b3137,
  ringA: 0x5f8fa3, ringB: 0x8a7a8c,
};
export const BACKDROPS_HELL = Object.freeze({
  intro: {
    base: 0x7c92a9, mid: 0xb3c0cc, hi: 0xffffff, accent: 0x7fb8c6, fogColor: 0xb9c5cf,
    rayColor: 0xffffff, gridColor: 0x2f5b70, starColor: 0x1d3a4a, bokehColor: 0xffffff,
    washA: 0x5aa8b9, washB: 0x8a84c4, washC: 0xe6a273, ringA: 0xd4f6fb, ringB: 0xffe3c8,
    horizonGlow: 0.7, glow: 0.6, fog: 0.4, rays: 0.7, stars: 0, dust: 0.35, bokeh: 0.5, wash: 1.0,
    floor: 0.85, floorY: -3.5, floorGrid: 1.0, floorShine: 1.3, pool: 0.9, vig: 1.0, vigColor: 0x5d7086,
    rings: 1.0, calm: 0.3, calmColor: 0xe4eaee, dusk: 0,
  },
  robot: {
    base: 0x6e8196, mid: 0xacb8c3, hi: 0xffffff, accent: 0x8fb0c9, fogColor: 0xb0bcc7,
    rayColor: 0xffffff, gridColor: 0x2f5b70, starColor: 0x1d3a4a, bokehColor: 0xffffff,
    washA: 0x58a3b6, washB: 0x837eba, washC: 0xd99a70, ringA: 0xd4f6fb, ringB: 0xffe3c8,
    horizonGlow: 0.7, glow: 0.4, fog: 0.3, rays: 0.6, dust: 0.35, bokeh: 0.45, wash: 1.0,
    floor: 0.9, floorShine: 1.3, floorGrid: 1.0, pool: 1.0, vig: 1.0, vigColor: 0x56687c,
    rings: 1.0, calm: 0.25, calmColor: 0xe2e8ed, dusk: 0,
  },
  zoom: {
    base: 0x6f849b, mid: 0xaebbc7, hi: 0xffffff, accent: 0x84b4c4, fogColor: 0xb1bdc8,
    rayColor: 0xffffff, gridColor: 0x0a5f74, starColor: 0x1d3a4a, bokehColor: 0xffffff,
    washA: 0x55a4b8, washB: 0x7f7cbd, washC: 0x9584c0, ringA: 0xd4f6fb, ringB: 0xffe3c8,
    horizonGlow: 0.65, glow: 0.45, fog: 0.3, rays: 0.4, grid: 0.12, dust: 0.35, bokeh: 0.35, wash: 1.0,
    floor: 0.75, floorShine: 1.3, floorGrid: 1.0, pool: 0.75, vig: 1.0, vigColor: 0x56687c,
    rings: 1.0, calm: 0.25, calmColor: 0xe2e8ed, dusk: 0,
    // Flug in den Kopf: das Studio wird zum Abendlicht des Gehirns
    inner: {
      ...DUSK_BRAIN, rayColor: 0x8eaec1,
      floor: 0.0, wash: 0.7, bokeh: 0.4, dust: 0.8, vig: 0.9, glow: 0.8, fog: 0.6, grid: 0.18, rings: 0.0,
      calm: 0.0, dusk: 1, rays: 0.2,
    },
  },
  brain: {
    ...DUSK_BRAIN,
    horizonGlow: 0.25, glow: 0.85, fog: 0.75, aurora: 1.0, dust: 0.8, bokeh: 0.4, wash: 0.6,
    vig: 0.9, rings: 0, calm: 0, dusk: 1,
  },
  cables: {
    base: 0x364151, mid: 0x495d71, hi: 0x8eaec1, accent: 0x445980, fogColor: 0x445668,
    streakColor: 0x99faff, gridColor: 0x73afc8, bokehColor: 0xffffff, starColor: 0xcee5ed,
    washA: 0x000000, washB: 0x555480, washC: 0x43668f, vigColor: 0x292e36, ringA: 0x5f8fa3, ringB: 0x8a7a8c,
    horizonGlow: 0.5, glow: 0.7, fog: 0.3, streaks: 0.8, bokeh: 0.3, stars: 0, dust: 0.6,
    floor: 0.85, floorShine: 0.8, wash: 0.7, vig: 0.85, rings: 0, calm: 0, dusk: 1,
  },
  dna: {
    base: 0x2f4143, mid: 0x405c60, hi: 0x73aea5, accent: 0x395858, fogColor: 0x3c5255,
    codeColor: 0x8fdfcd, bokehColor: 0xffffff, starColor: 0xcff0e8, gridColor: 0x8fdfcd,
    washA: 0x448a7f, washB: 0x4b5a86, washC: 0x427c7d, vigColor: 0x262f31, ringA: 0x5f8fa3, ringB: 0x8a7a8c,
    horizonGlow: 0.35, glow: 0.8, fog: 0.3, code: 0.08, dust: 0.5, bokeh: 0.2, stars: 0, wash: 0.7,
    vig: 0.85, rings: 0, calm: 0, dusk: 1,
  },
  outro: {
    base: 0x9e9695, mid: 0xc9baae, hi: 0xfffaf4, accent: 0xa3adc9, fogColor: 0xc4b9b1,
    rayColor: 0xfff6ea, gridColor: 0x5e5450, starColor: 0x2a2a2e, bokehColor: 0xfffaf2,
    washA: 0xe39a68, washB: 0x8f9ac4, washC: 0xc98a7c, ringA: 0xffe3c8, ringB: 0xd4f6fb,
    horizonGlow: 0.75, glow: 0.4, fog: 0.3, rays: 0.6, dust: 0.3, bokeh: 0.35, wash: 1.0,
    floor: 0.85, floorShine: 1.3, floorGrid: 1.0, pool: 0.85, vig: 1.0, vigColor: 0x726667,
    rings: 1.0, ringX: -0.22, calm: 0.25, calmColor: 0xece6e0, dusk: 0,
  },
  inhalt: {
    base: 0xdfe5ea, mid: 0xeef2f5, hi: 0xffffff, accent: 0xe4eaee, fogColor: 0xeaeef1,
    horizonGlow: 0.2, glow: 0.3, detail: 0.1, vig: 0.2, vigColor: 0xd2dae0, rings: 0, calm: 0, dusk: 0,
  },
});
// Hell am Handy (ctx.isMobile): einzelne Werte, die BACKDROPS_HELL ueberschreiben. Hinter der Bueste (robot, outro)
// weniger weisses Gegenlicht, sonst stand die weisse Schale (ohne Klarlack, Stufe medium) gleich hell wie das Studio.
export const BACKDROPS_HELL_M = Object.freeze({
  robot: { glow: 0.32 },
  outro: { glow: 0.3 },
});
// Helligkeit des Papiers im hellen Thema (linear vor der neutralen Tonwertkurve): 1.0 waere #f0f0f0 auf dem Schirm,
// mit diesem Faktor landet das Off-White bei rund #f2f4f6. Gilt auch fuer die Nebelfarbe (Objekte laufen ins Papier).
export const PAPER_GAIN = 1.16;

/* ------------------------------------------------------- Szenen (Beats) */
// Reihenfolge = Reihenfolge der <section data-scene> in index.html.
// len = Hoehe des Abschnitts in vh. Daraus misst der Director die Zeitfenster (global 0..1).
// Version 4: kurze Beats. Seit 01.11.2026 ist das Kapitel Code (dna: Helix und Website-Geruest) wieder drin (Jonas:
// "den fand ich sehr gut"), kompakt mit 190 statt 210 vh. Sechs Text-Stationen 01 bis 06 (brain ohne Text).
// Scrollweg bis zum Inhalt: Summe der Laengen minus 100 vh (der letzte Beat zaehlt nur mit len - 100), also 780 vh.
// Der Beat brain hat keinen Text: dort taucht die Kamera langsam ins Gehirn (TEMPO begrenzt zusaetzlich das Tempo).
export const BEATS = Object.freeze([
  // text = [ein0, ein1, aus0, aus1] (p im Beat), textM = Fenster im Hochformat, scrim = Abdunkeln hinter dem Text
  // (FxPass, 0..1). Die Panels (ausser Hero und Ausklang) stehen fix im Bild und blenden nur ueber diese Fenster.
  // intro: Scrim leise (der Titel steht auf dunklem Grund, ein starker Scrim machte den Kopf der Partikel-Bueste grau)
  { name: 'intro', len: 60, label: 'Start', text: [0, 0, 0.3, 0.62], scrim: 0.1 },
  // robot: Text, sobald die Bueste Form annimmt; weg, bevor die Kamera ins Profil kreist
  { name: 'robot', len: 90, label: 'Entlastung', text: [0.3, 0.42, 0.86, 0.97], textM: [0.3, 0.42, 0.9, 0.99], scrim: 0.42 },
  // zoom: Text im Profil, weg vor dem Roentgen-Scan ueber dem Gesicht
  { name: 'zoom', len: 120, label: 'Was KI kann', text: [0.02, 0.12, 0.42, 0.54], textM: [0.02, 0.12, 0.5, 0.62], scrim: 0.45 },
  // brain: kein Text (langsames Eintauchen, Flug durch das Gehirn und hinten hinaus)
  { name: 'brain', len: 160, label: 'Im Kern', noText: true, scrim: 0 },
  // cables: Text, sobald die Uebersicht steht; die fuenf Knoten sind Links (js/nodes.js) bis zum Ende des Beats
  { name: 'cables', len: 110, label: 'Verbindung', text: [0.16, 0.28, 0.9, 0.985], textM: [0.12, 0.24, 0.92, 0.99], scrim: 0.5 },
  // dna: zuerst fliegt die Kamera aus der Uebersicht in den Website-Knoten (0 bis DNA_FROM, ohne Text), dann laeuft
  // der Ablauf aus V3 (Szene dna, local 0..1): Helix von aussen (Text), Eintauchen, Aufbau des Geruests, Angebotszeile
  { name: 'dna', len: 190, label: 'Websites', text: [0.2, 0.27, 0.53, 0.62], textM: [0.2, 0.27, 0.5, 0.58], scrim: 0.6 },
  { name: 'outro', len: 150, label: 'Einstieg', scrim: 0.45 },
]);

// Breite der Ueberblendung an Beat-Grenzen (in global-Einheiten; bei 780 vh Scrollweg sind 0.015 rund 12 vh).
export const BEAT_FADE = 0.015;

// Tempo-Grenze (V4-KONZEPT 5.2): zwischen from und to folgt der gedaempfte Fortschritt dem Scroll hoechstens mit
// vhPerSec (Scrollweg pro Sekunde). Ein schneller Wisch spielt den Flug ins Gehirn so trotzdem ruhig ab, die Szene
// holt danach auf. Liegt das Ziel schon hinter dem Fenster (weitergescrollt), gilt catchUp mal so schnell.
// Spruenge (Ueberspringen, Anker: Ziel aendert sich in einem Bild um mehr als jump) gehen sofort.
export const TEMPO = Object.freeze({ from: 'zoom@0.6', to: 'cables@0.3', vhPerSec: 52, catchUp: 2.6, jump: 0.15 });

// Module (js/scenes/<name>.js) und ihre Zeitfenster. 'beat@p' = Punkt p (0..1) im Beat.
// windows[0] ist das Hauptfenster: daraus kommt `local`. Weitere Fenster halten das Modul nur aktiv.
// Faellt ein Fensterrand auf einen Schnitt (cut in CAMERA_KEYS), ist er hart (kein Ein- oder Ausblenden ueber den Schnitt).
// Kapitel Code: Anteil des Beats dna fuer den Anflug auf den Website-Knoten. Ab hier laeuft die Szene dna (local 0..1,
// Zeitplan in js/scenes/dna.js). dna-build.js rechnet die Kamera-Keys dna@p mit demselben Wert in local um.
export const DNA_FROM = 0.2;

export const MODULES = Object.freeze({
  // Hintergrund hinter allem: immer aktiv (Gewicht 1), Farbwelten aus BACKDROPS
  backdrop: { windows: [{ from: 'intro@0', to: 'outro@1' }] },
  particles: { windows: [{ from: 'intro@0', to: 'robot@0.7' }] },
  // robot bleibt bis brain@0.6 aktiv: die Roentgen-Schale (Hologramm) umgibt das Gehirn, bis die Kamera eintaucht
  robot: { windows: [{ from: 'robot@0', to: 'brain@0.6' }, { from: 'outro@0', to: 'outro@1' }] },
  // brain bleibt bis in den Anflug auf den Website-Knoten (das Gehirn steht dort noch unten rechts im Bild)
  brain: { windows: [{ from: 'zoom@0.3', to: 'dna@0.1' }] },
  // cables bis in die Helix: der Website-Knoten oeffnet sich zum Portal, die Helix tritt aus seiner Faser
  cables: { windows: [{ from: 'brain@0.7', to: 'dna@0.42' }] },
  dna: { windows: [{ from: `dna@${DNA_FROM}`, to: 'dna@1' }] },
});
export const MODULE_FADE = 0.0115;

/* ------------------------------------------------------------ Kamerapfad */
// Keyframes, an Beats verankert. pos = Kameraposition, look = Blickziel, fov = vertikal in Grad.
// posM/lookM: optional fuer Hochformat (Handy). cut: true = harter Schnitt mit Abblende.
export const CAMERA_KEYS = Object.freeze([
  // Hero: lose angedeuteter Kopf mit leuchtendem Kern rechts der Mitte (Hochformat: oberes Drittel), Titel links unten
  { at: 'intro@0', pos: [0.15, 0.32, 13.4], look: [-1.75, -0.3, 0], fov: 30, posM: [0, 0.35, 11.0], lookM: [0, -3.25, 0] },
  { at: 'intro@1', pos: [0.6, 0.3, 12.0], look: [-0.9, -0.3, 0], fov: 31, posM: [0.5, 0.3, 9.6], lookM: [0, -2.1, 0] },
  // Android-Bueste in Dreiviertelansicht von rechts vorne (+x): das Gesicht wendet sich dem Text links zu, die Bueste
  // steht rechts der Mitte. Danach kreist die Kamera ruhig auf derselben Seite weiter (Hochformat: Bueste oben, Text unten)
  {
    at: 'robot@0.5', pos: [4.2, 0.75, 7.4], look: [-0.98, -0.69, 0.58], fov: 31,
    lookM: [0.18, -2.8, 0.3],
  },
  {
    at: 'robot@1', pos: [6.3, 0.55, 3.9], look: [-0.54, -0.63, 0.78], fov: 32,
    lookM: [0.24, -2.48, 0.05],
  },
  // "Was dahinter steckt": Profil von schraeg hinten, solange der Text steht. Gesicht blickt nach links zum Text,
  // rechts im Bild der offene Hinterkopf mit Schaedelgitter, Glaskappe und Kabeln.
  {
    at: 'zoom@0.22', pos: [7.0, 0.45, -2.3], look: [0.23, -0.46, 0.61], fov: 30,
    posM: [7.0, 0.5, -2.3], lookM: [0.18, -1.89, -0.35],
  },
  {
    at: 'zoom@0.38', pos: [6.6, 0.55, -1.9], look: [0.19, -0.41, 0.59], fov: 31,
    posM: [6.6, 0.6, -1.95], lookM: [0.2, -1.8, -0.35],
  },
  // Roentgen-Scan (zoom@0.3 bis 0.84): die Kamera kommt seitlich nach vorne oben, das Gehirn erscheint in seiner
  // Hardware (Seitenansicht, nie frontal), am Ende Dreiviertelansicht von vorne rechts oben
  {
    at: 'zoom@0.6', pos: [4.3, 0.95, 0.6], look: [-0.07, -0.16, 0.33], fov: 34,
    posM: [3.9, 0.95, 0.55], lookM: [0.22, -0.92, -0.06],
  },
  {
    at: 'zoom@0.8', pos: [3.2, 1.15, 1.7], look: [-0.2, 0.04, 0.26], fov: 37,
    posM: [3.3, 1.2, 1.85], lookM: [0.22, -0.8, 0.04],
  },
  {
    at: 'zoom@1', pos: [2.3, 1.35, 2.55], look: [-0.44, 0.14, 0.26], fov: 40,
    posM: [2.3, 1.5, 3.0], lookM: [0.22, -0.9, 0.19],
  },
  // Dreiviertelansicht von vorne rechts oben (ohne Text), dann taucht die Kamera langsam ein (brain@0.12 bis 0.55,
  // rund 70 vh plus Tempo-Grenze), fliegt durch das Gehirn und hinten hinaus. Hochformat: Kopf fuellt rund 70 % der Breite
  { at: 'brain@0.12', pos: [1.62, 1.2, 2.18], look: [-0.42, 0.12, 0.21], fov: 40, posM: [1.9, 1.35, 2.6], lookM: [0.18, -0.7, 0.15] },
  { at: 'brain@0.34', pos: [1.05, 0.88, 1.32], look: [-0.3, 0.16, -0.1], fov: 46, posM: [1.25, 0.95, 1.6], lookM: [0.1, -0.35, -0.05] },
  { at: 'brain@0.55', pos: [0.5, 0.52, 0.42], look: [-0.15, 0.22, -0.5], fov: 54 },
  // Austrittspunkt der Kabel nicht in der Bildmitte, leichte Neigung: liest sich als "Kabel werden gezogen"
  { at: 'brain@0.78', pos: [0.02, 0.32, -0.25], look: [0.25, -0.05, -1.0], fov: 58, roll: 6 },
  { at: 'brain@1', pos: [-0.35, 0.55, -0.85], look: [0, 0, -3], fov: 55, roll: 2.5 },
  // Uebersicht von schraeg oben: Gehirn unten rechts, Kabel laufen nach links zu den Knoten, Text rechts.
  // Version 4: die Kamera bleibt bis cables@1 in der Uebersicht (ruhiges Driften), damit man die Knoten anklicken
  // kann. Danach fliegt sie im Beat dna auf den Website-Knoten zu. Aufstieg: Blick etwas hoeher, damit der Kalender-Knoten (hoechster Knoten) nie unter der Kopfzeile liegt
  { at: 'cables@0.12', pos: [-2.3, 1.75, -0.1], look: [0.55, 0.78, -3.9], fov: 52 },
  { at: 'cables@0.36', pos: [-6.8, 5.94, 2.23], look: [1.5, 0.5, -5.0], fov: 46, lookM: [1.5, -3.0, -5.0] },
  { at: 'cables@0.66', pos: [-7.3, 6.25, 1.9], look: [1.65, 0.42, -5.15], fov: 45, lookM: [1.65, -3.0, -5.15] },
  { at: 'cables@1', pos: [-7.55, 6.3, 1.35], look: [1.75, 0.38, -5.35], fov: 44.5, lookM: [1.75, -3.0, -5.35] },
  // Kapitel Code (dna). Anflug: aus der Uebersicht hinunter auf den Website-Knoten zu (dna@0 bis DNA_FROM), an E-Mail und
  // Dokumente vorbei. Danach die Keys aus V3, umgerechnet: p = DNA_FROM + (1 - DNA_FROM) * local (V3-Wert in Klammern).
  {
    at: 'dna@0.1', pos: [-4.55, 3.3, -2.75], look: [1.0, 0.95, -7.6], fov: 44,
    lookM: [0.9, -0.6, -7.8],
  },
  // (cables@1 in V3) nah am Website-Knoten, schon leicht von links: danach steht die Helix einmal von aussen im Bild
  { at: 'dna@0.2', pos: [-1.9, 1.05, -7.6], look: [0.15, 0.5, -11.2], fov: 44, posM: [-1.2, 1.2, -7.0], lookM: [0.1, -0.4, -11.5] },
  // (dna@0.1) Helix von aussen (Dreiviertelansicht von links): zwei Straenge mit Sprossen, klar als Doppelhelix
  // lesbar. Text links, die Helix rechts und nach links in die Tiefe. zTrack: die Kamera ist noch nicht in der Helix
  // (dna-build.js rechnet damit, wann Zeichen hinter der Kamera verloeschen)
  {
    at: 'dna@0.28', pos: [-2.75, 0.95, -11.0], look: [0.5, 0.45, -15.9], fov: 46, zTrack: -9.9,
    posM: [-2.1, 1.6, -9.6], lookM: [0.35, -0.9, -15.0],
  },
  // (dna@0.21) Kamera schwenkt vor den Anfang der Helix und taucht entlang der Achse ein (nicht durch die Wand)
  {
    at: 'dna@0.368', pos: [-0.55, 0.62, -9.5], look: [-1.0, 0.5, -16], fov: 50, zTrack: -10.0,
    posM: [-0.4, 0.75, -9.4], lookM: [0, 0.1, -16],
  },
  // (dna@0.33) Eingetaucht: Fluchtpunkt rechts der Mitte, solange links der Text steht
  { at: 'dna@0.464', pos: [0.2, 0.56, -15.0], look: [-1.55, 0.55, -20.5], fov: 50, lookM: [0, 0.5, -20.5] },
  // (dna@0.58) Uebergang ins Geruest: zuegig nah heran, damit es frueh gross und klar im Bild steht
  { at: 'dna@0.664', pos: [0.1, 0.48, -28.0], look: [0, 0.33, -36], fov: 43 },
  // (dna@0.74) Geruest fertig: oben im Bild, darunter Platz fuer die Angebotszeile (HTML, js/ui.js setOffer)
  { at: 'dna@0.792', pos: [0, 0.44, -29.25], look: [0, 0.3, -36], fov: 41, posM: [0, 0.5, -28.85], lookM: [0, -0.5, -36] },
  { at: 'dna@1', pos: [0, 0.42, -29.45], look: [0, 0.3, -36], fov: 41, posM: [0, 0.5, -29.05], lookM: [0, -0.5, -36] },
  // Ausklang: Schnitt aus dem fertigen Website-Geruest auf das Gesicht (die Augen erwachen im Lichtblitz), dann zieht die
  // Kamera langsam zurueck in eine ruhige Dreiviertelansicht leicht von unten: die Bueste rechts, der Blick zum
  // Kontakt links (Hochformat: Bueste oben)
  { at: 'outro@0', cut: true, pos: [0.5, 0.05, 4.5], look: [-0.22, -0.27, 0.03], fov: 34, posM: [0.5, 0.2, 6.6], lookM: [0.01, -1.95, 0.09] },
  {
    at: 'outro@1', pos: [3.7, -0.3, 7.9], look: [-1.19, -0.75, 0.56], fov: 31,
    posM: [3.9, 0.2, 9.6], lookM: [0.06, -3.2, 0.15],
  },
]);
export const CUT_FADE = 0.009; // halbe Breite des Lichtblitzes um einen Schnitt (global, ca. 7 vh)

// Hochformat: vertikales FOV wird erweitert, damit horizontal genug Bild bleibt.
// minPortrait: im Hochformat mindestens dieser Faktor (= Wert bei Seitenverhaeltnis 0.59), damit Tablets im Hochformat
// gleich gerahmt sind wie die Handys, fuer die posM/lookM abgestimmt sind (nur mit mehr Rand links und rechts).
export const PORTRAIT = Object.freeze({ refAspect: 1.6, exponent: 0.7, maxFactor: 2.4, below: 0.85, minPortrait: 2.0 });

/* ------------------------------------------------------------------ Look */
// Bildwirkung pro Frame. Module setzen Teilwerte in `module.look`, main mischt nach Gewicht.
export const BASE_LOOK = Object.freeze({
  exposure: 1.0,        // renderer.toneMappingExposure
  bloom: 0.85,          // UnrealBloom strength
  bloomRadius: 0.55,
  bloomThreshold: 0.72, // nur Werte ueber ~0.7 (linear) leuchten: Glow-Farben bewusst > 1 setzen
  aberration: 0.006,    // chromatische Aberration (UV-Versatz in der Ecke ~ 0.35 * Wert)
  vignette: 0.75,
  grain: 0.045,
  fogDensity: 0.035,
  env: 0.35,            // scene.environmentIntensity (Spiegelungen)
  key: 1.3,             // warmes Hauptlicht
  rim: 2.0,             // kuehles Kantenlicht
  amb: 0.12,            // Hemisphaere
  rimWarm: 0,           // Farbe des Kantenlichts: 0 Signal-Cyan, 1 warmes Gold (Ausklang im Morgenlicht)
  parallax: 0.22,       // Kamera folgt der Maus (Einheiten)
  drift: 0.025,         // ruhiges Schweben der Kamera
  flash: 0,             // additiver Lichtblitz in Signal-Farbe 0..1
  fade: 0,              // Abblende zu Schwarz 0..1
  dim: 0,               // Abdunkeln (Inhaltsbereich) 0..1
});
export const LOOK_KEYS = Object.freeze(Object.keys(BASE_LOOK));

// Helles Thema (Kapitel 14 in ARCHITEKTUR.md): Grundwerte. Studio-Licht statt Nacht: kaum Bloom (nur Glanzlichter der
// Bueste, Schwelle ueber dem Off-White des Hintergrunds), dezentes Korn, leise Vignette, keine Aberration.
// Die Schluessel in THEME_LOOK_KEYS nimmt das helle Thema nie aus dem dunklen `look` einer Szene: entweder aus ihrem
// `lookHell` oder von hier. Alle anderen (Licht, Nebel, Kamera) gelten fuer beide Themen gleich, solange `lookHell` sie
// nicht setzt.
export const BASE_LOOK_HELL = Object.freeze({
  ...BASE_LOOK,
  exposure: 1.0,
  bloom: 0.16,
  bloomRadius: 0.45,
  bloomThreshold: 1.7,
  aberration: 0,
  vignette: 0.08,
  grain: 0.02,
});
export const THEME_LOOK_KEYS = Object.freeze(['exposure', 'bloom', 'bloomRadius', 'bloomThreshold', 'aberration', 'vignette', 'grain', 'flash']);

/* --------------------------------------------------------------- Helfer */
// Nominelle Zeitfenster (ohne DOM), z. B. fuer dev.html. Gleiche Formel wie der Director.
export function nominalBeatWindows(beats = BEATS, viewportVh = 100) {
  const total = beats.reduce((s, b) => s + b.len, 0);
  const range = Math.max(1, total - viewportVh);
  let acc = 0;
  const out = {};
  beats.forEach((b, i) => {
    const start = acc / range;
    acc += b.len;
    const end = i === beats.length - 1 ? 1 : Math.min(1, acc / range);
    out[b.name] = { start: Math.min(1, start), end };
  });
  return out;
}
