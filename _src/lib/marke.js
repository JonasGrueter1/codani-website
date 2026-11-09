'use strict';
// Markenzeichen Codani: Helix (gewaehlt am 03.11.2026, Quelle workflow-leads/marke/logo-helix/make.js).
// Zwei Straenge (Akzent und Ember) mit vier Sprossen, Farben ueber CSS (.mark, .mark__a, .mark__b, .mark__r in site.css).
// Ersetzt seit 08.11.2026 den frueheren Ring mit Punkt.

/** Zeichen als Inline-SVG. cls: zusaetzliche Klasse, z. B. 'mark--lg' */
function mark(cls = '') {
  return `<span class="mark${cls ? ' ' + cls : ''}" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false">`
    + '<path class="mark__a" d="M8 32C20 6 28 6 32 32S44 58 56 32"/>'
    + '<path class="mark__b" d="M8 32C20 58 28 58 32 32S44 6 56 32"/>'
    + '<path class="mark__r" d="M17.5 21V43M24.5 17.5V46.5M39.5 17.5V46.5M46.5 21V43"/>'
    + '</svg></span>';
}

module.exports = { mark };
