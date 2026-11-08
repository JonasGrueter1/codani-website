/* Codani · Suchkern (08.11.2026). Laeuft im Browser (window.CodaniSucheKern) und beim Build/Test in Node (require).
   Ohne Abhaengigkeiten, ohne fremden Dienst: Index und Suche bleiben auf dem Geraet.

   So findet die Suche auch umschriebene Anfragen:
   1. Normalisieren: klein, Umlaute (ä = a, auch "ae"), Akzente weg, Bindestrich-Woerter ganz und in Teilen.
   2. Wortstamm (CISTEM, Weissweiler und Fraser 2017, ohne "ge"-Abtrennung): "kostet", "Kosten" -> gleicher Stamm.
   3. Wendungen und Synonyme aus _src/data/suche.json: "wie teuer" -> Preis, "Homepage" -> Website, "AI" -> KI.
   4. Eigene Fragen pro Abschnitt (Feld q): so formulieren Kunden, nicht wie die Seite.
   5. Tippfehler (Abstand 1 bis 2), Wortanfang beim Tippen, zusammengesetzte Woerter ("Datenschutz" findet "Daten").
   6. Gewichtung BM25F: Titel und Fragen zaehlen mehr als Fliesstext; Treffer, die alle Begriffe abdecken, kommen nach oben.
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CodaniSucheKern = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------------------------------------------------------- Text */
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/ß/g, 'ss')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[’'`´]/g, '');
  }

  // Woerter mit Position; Bindestrich-Woerter zusaetzlich zusammengeschrieben ("e-mail" -> email, e, mail)
  function woerter(s) {
    var n = norm(s), out = [], re = /[a-z0-9]+(?:-[a-z0-9]+)*/g, m;
    while ((m = re.exec(n))) {
      var w = m[0];
      if (w.indexOf('-') > 0) {
        var teile = w.split('-');
        out.push(teile.join(''));
        for (var i = 0; i < teile.length; i++) if (teile[i].length > 1) out.push(teile[i]);
      } else out.push(w);
    }
    return out;
  }

  // CISTEM-Stamm (ohne "ge"-Abtrennung, damit "Geraet" nicht zu "Rat" wird)
  function stamm(w) {
    if (w.length <= 3 || /\d/.test(w)) return w;
    var s = w.replace(/sch/g, '$').replace(/ei/g, '%').replace(/ie/g, '&').replace(/(.)\1/g, '$1*');
    while (s.length > 3) {
      if (s.length > 5) {
        if (/e[mr]$/.test(s)) { s = s.slice(0, -2); continue; }
        if (/nd$/.test(s)) { s = s.slice(0, -2); continue; }
      }
      if (/t$/.test(s)) { s = s.slice(0, -1); continue; }
      if (/[esn]$/.test(s)) { s = s.slice(0, -1); continue; }
      break;
    }
    return s.replace(/(.)\*/g, '$1$1').replace(/%/g, 'ei').replace(/&/g, 'ie').replace(/\$/g, 'sch');
  }

  // Tippfehler: Damerau-Levenshtein mit Abbruch ueber max
  function abstand(a, b, max) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    var prev2 = null, prev = new Array(lb + 1), cur;
    for (var j = 0; j <= lb; j++) prev[j] = j;
    for (var i = 1; i <= la; i++) {
      cur = new Array(lb + 1); cur[0] = i;
      var rowMin = cur[0];
      for (j = 1; j <= lb; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
        cur[j] = v; if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      prev2 = prev; prev = cur;
    }
    return prev[lb];
  }

  /* ---------------------------------------------------------------- Index */
  var FELDER = { t: 3.0, q: 2.4, h: 1.6, c: 1.2, x: 1.0 };
  var ARTIKEL = { der: 1, die: 1, das: 1, den: 1, dem: 1, des: 1, ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, eines: 1, the: 1 };
  var K1 = 1.2, B = 0.5;

  function Index(daten) {
    var self = this;
    this.docs = daten.docs || [];
    this.stopp = {};
    (daten.stopp || []).forEach(function (w) { self.stopp[norm(w)] = 1; });
    this.vorschlaege = daten.vorschlaege || [];
    // leise Woerter: kommen fast ueberall vor (Name, Marke) und entscheiden darum wenig
    this.leise = {};
    (daten.leise || []).forEach(function (w) { self.leise[stamm(norm(w))] = 1; });
    this.tf = []; this.len = []; this.df = {}; this.vocab = [];
    var gesamt = 0;
    this.docs.forEach(function (d, i) {
      var m = {}, L = 0;
      var felder = { t: d.t, q: d.q, h: d.h, c: [d.p, d.c].filter(Boolean).join(' '), x: d.x };
      for (var f in FELDER) {
        var ws = woerter(felder[f] || '');
        for (var k = 0; k < ws.length; k++) {
          var w = ws[k];
          if (self.stopp[w] || (w.length < 2)) continue;
          var st = stamm(w);
          m[st] = (m[st] || 0) + FELDER[f];
        }
        L += ws.length * FELDER[f];
      }
      self.tf[i] = m; self.len[i] = L; gesamt += L;
      for (var t in m) self.df[t] = (self.df[t] || 0) + 1;
    });
    this.avg = gesamt / Math.max(1, this.docs.length);

    this.vocab = Object.keys(this.df);
    this.N = this.docs.length;
    // Synonyme: Gruppen von Woertern und Wendungen
    this.gruppen = [];
    this.gruppeVon = {}; // stamm -> [gruppen]
    this.wendungen = []; // { re, gruppe }
    (daten.syn || []).forEach(function (liste, gi) {
      var g = { staemme: [], wendungen: [] };
      liste.forEach(function (eintrag) {
        if (/\s/.test(eintrag.trim())) { g.wendungen.push(norm(eintrag)); return; }
        woerter(eintrag).forEach(function (w, k) {
          if (k > 0 || self.stopp[w]) return; // Bindestrich-Wort: nur die zusammengeschriebene Form
          var st = stamm(w);
          if (g.staemme.indexOf(st) < 0) g.staemme.push(st);
        });
      });
      g.staemme.forEach(function (st) { (self.gruppeVon[st] = self.gruppeVon[st] || []).push(gi); });
      self.gruppen.push(g);
    });
    // Satzvergleich: so formulierte Fragen (eigene Fragen q und Titel) als Mengen von Begriffen
    this.saetze = this.docs.map(function (d) {
      var liste = (d.q ? String(d.q).split(' | ') : []).concat(d.t ? [d.t] : []);
      return liste.map(function (x) { return self.satzMenge(x); }).filter(function (m) { return m.n > 0; });
    });
  }

  // Begriffe eines Satzes als Menge: Stamm, bei Synonymen die Gruppe (so gelten "Homepage" und "Website" als gleich)
  Index.prototype.satzMenge = function (text) {
    var m = {}, n = 0, ws = woerter(text);
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i];
      if (ARTIKEL[w] || w.length < 2) continue;
      var st = stamm(w), g = this.gruppeVon && this.gruppeVon[st];
      var key = g && g.length ? 'g' + g[0] : st;
      if (!m[key]) { m[key] = 1; n += 1; }
    }
    return { m: m, n: n };
  };

  Index.prototype.idf = function (t) {
    var df = this.df[t] || 0;
    return Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
  };

  // Varianten eines Suchworts: { stamm: gewicht }
  Index.prototype.varianten = function (wort, istLetztes) {
    var self = this, v = {}, st = stamm(wort);
    var add = function (s, g) { if (s && (!v[s] || v[s] < g)) v[s] = g; };
    // Umlaut als ae/oe/ue getippt: "gebaeude" -> "gebaude"
    if (!this.df[st] && /ae|oe|ue/.test(wort)) {
      var alt = stamm(wort.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u'));
      if (this.df[alt]) st = alt;
    }
    add(st, 1);
    (this.gruppeVon[st] || []).forEach(function (gi) {
      self.gruppen[gi].staemme.forEach(function (s) { add(s, 0.72); });
    });
    var bekannt = !!this.df[st];
    // Wortanfang beim Tippen ("pre" -> "preis")
    if (istLetztes && wort.length >= 2) {
      var n = 0;
      for (var i = 0; i < this.vocab.length && n < 24; i++) {
        var t = this.vocab[i];
        if (t !== st && t.length > wort.length && t.indexOf(wort) === 0) { add(t, 0.68); n += 1; }
      }
    }
    // Zusammengesetzte Woerter: "Daten" findet "Datenschutz", "Schutz" auch
    if (wort.length >= 4) {
      var m = 0, kandidaten = [wort, st];
      for (var j = 0; j < this.vocab.length && m < 16; j++) {
        var u = this.vocab[j];
        if (u.length < wort.length + 3 || u === st) continue;
        for (var k = 0; k < kandidaten.length; k++) {
          var c = kandidaten[k];
          if (c.length >= 4 && (u.indexOf(c) === 0 || u.lastIndexOf(c) === u.length - c.length)) { add(u, 0.5); m += 1; break; }
        }
      }
    }
    // Zusammengesetztes Wort zerlegen: "Kundenmails" ist eine Mail (Kopf zaehlt mehr als Bestimmungswort)
    if (wort.length >= 8) {
      for (var p0 = 3; p0 <= wort.length - 3; p0++) {
        var links = stamm(wort.slice(0, p0)), rechts = stamm(wort.slice(p0));
        if (rechts.length >= 3 && links.length >= 3 && this.df[links] && (this.df[rechts] || this.gruppeVon[rechts])) {
          add(rechts, 0.75); add(links, 0.5);
          (this.gruppeVon[rechts] || []).forEach(function (gi) { self.gruppen[gi].staemme.forEach(function (s2) { add(s2, 0.6); }); });
          break;
        }
      }
    }
    // Tippfehler, wenn das Wort unbekannt ist
    if (!bekannt && !(this.gruppeVon[st] || []).length && wort.length >= 4) {
      var max = wort.length >= 8 ? 2 : 1, best = [];
      for (var q = 0; q < this.vocab.length; q++) {
        var z = this.vocab[q];
        if (Math.abs(z.length - st.length) > max) continue;
        var dd = abstand(st, z, max);
        if (dd <= max) best.push([z, dd]);
      }
      best.sort(function (a, b) { return a[1] - b[1] || (self.df[b[0]] - self.df[a[0]]); });
      best.slice(0, 4).forEach(function (b) {
        add(b[0], b[1] === 1 ? 0.85 : 0.7);
        (self.gruppeVon[b[0]] || []).forEach(function (gi) { self.gruppen[gi].staemme.forEach(function (s) { add(s, 0.6); }); });
      });
      // zusammengeschriebenes Wort zerlegen ("websitepreis" -> website + preis)
      if (!best.length && wort.length >= 7) {
        for (var p = 3; p <= wort.length - 3; p++) {
          var a = stamm(wort.slice(0, p)), b2 = stamm(wort.slice(p));
          if (this.df[a] && this.df[b2]) { add(a, 0.7); add(b2, 0.7); break; }
        }
      }
    }
    return v;
  };

  // Anfrage in Begriffe zerlegen; jeder Begriff hat Varianten
  Index.prototype.begriffe = function (anfrage) {
    var self = this, roh = norm(anfrage), begriffe = [];
    var tippt = !/\s$/.test(anfrage);
    // Wendungen ("wie teuer", "wer steckt dahinter") werden zu einem eigenen Begriff
    this.gruppen.forEach(function (g) {
      for (var i = 0; i < g.wendungen.length; i++) {
        var w = g.wendungen[i];
        if (w && (' ' + roh.replace(/[^a-z0-9]+/g, ' ') + ' ').indexOf(' ' + w.replace(/[^a-z0-9]+/g, ' ') + ' ') >= 0) {
          var v = {};
          g.staemme.forEach(function (s) { v[s] = 0.9; });
          begriffe.push({ wort: w, v: v, wendung: true });
          break;
        }
      }
    });
    var ws = woerter(anfrage);
    var gesehen = {};
    ws.forEach(function (w, i) {
      if (self.stopp[w] || w.length < 2 || gesehen[w]) return;
      gesehen[w] = 1;
      var v = self.varianten(w, tippt && i === ws.length - 1);
      // Wort schon durch eine Wendung abgedeckt? Dann nur ergaenzen
      begriffe.push({ wort: w, v: v });
    });
    return begriffe;
  };

  var FRAGEWORT = /^(was|wie|wo|wer|wann|warum|weshalb|wieso|welche|welcher|welches|kann|koennen|konnen|gibt|ist|sind|muss|brauche|brauchen|darf|werde|hilft|bietet|macht|lohnt)\b/;

  Index.prototype.suche = function (anfrage, opt) {
    opt = opt || {};
    var self = this, begriffe = this.begriffe(anfrage);
    if (!begriffe.length) return { treffer: [], begriffe: [] };
    var frage = /\?\s*$/.test(anfrage) || FRAGEWORT.test(norm(anfrage).trim()) || begriffe.length >= 3;
    var qm = this.satzMenge(anfrage), rohQ = norm(anfrage).replace(/[?!.,]+/g, '').trim();
    // Gewicht eines Begriffs fuer die Abdeckung: seltene Woerter zaehlen mehr ("krank" mehr als "Jonas")
    for (var bi = 0; bi < begriffe.length; bi++) {
      var maxIdf = 0, vv = begriffe[bi].v;
      for (var tt in vv) if (this.df[tt]) maxIdf = Math.max(maxIdf, this.idf(tt) * vv[tt]);
      var leise = this.leise[stamm(begriffe[bi].wort)] || /^\d+$/.test(begriffe[bi].wort);
      begriffe[bi].gw = (maxIdf || 1) * (begriffe[bi].wendung ? 1.2 : 1) * (leise ? 0.3 : 1);
      begriffe[bi].leise = leise;
    }
    var scores = [];
    for (var i = 0; i < this.docs.length; i++) {
      var tf = this.tf[i], L = this.len[i], sum = 0, gedeckt = 0, gewichtGesamt = 0;
      for (var b = 0; b < begriffe.length; b++) {
        var best = 0, v = begriffe[b].v;
        for (var t in v) {
          var f = tf[t];
          if (!f) continue;
          var s = v[t] * this.idf(t) * (f * (K1 + 1)) / (f + K1 * (1 - B + B * L / this.avg));
          if (s > best) best = s;
        }
        var bg = begriffe[b].gw;
        gewichtGesamt += bg;
        if (best > 0) { sum += best * (begriffe[b].leise ? 0.4 : 1); gedeckt += bg; }
      }
      if (!sum) continue;
      var cov = gedeckt / gewichtGesamt;
      var d = this.docs[i];
      var sc = sum * (0.3 + 0.7 * cov * cov);
      if (d.k === 'frage') sc *= frage ? 1.25 : 1.05;
      if (d.k === 'seite') sc *= 0.92;
      if (d.g) sc *= d.g;
      // ganze Anfrage im Titel
      var rohT = norm(d.t);
      if (rohQ.length > 3 && rohT.indexOf(rohQ) >= 0) sc *= 1.3;
      // Satzvergleich mit eigenen Fragen und Titel (Dice): "Was kann die KI" passt auf "Was kann die KI"
      var sims = this.saetze[i], sim = 0;
      for (var z = 0; z < sims.length; z++) {
        var pm = sims[z], inter = 0;
        for (var key in qm.m) if (pm.m[key]) inter += 1;
        var dice = 2 * inter / (qm.n + pm.n);
        if (dice > sim) sim = dice;
      }
      if (sim > 0.45) sc *= 1 + 1.6 * (sim - 0.45) / 0.55;
      scores.push([i, sc, cov]);
    }
    scores.sort(function (a, b) { return b[1] - a[1]; });
    if (!scores.length) return { treffer: [], begriffe: begriffe };
    var top = scores[0][1], proSeite = {}, treffer = [], max = opt.max || 8;
    for (var r = 0; r < scores.length && treffer.length < max; r++) {
      var sx = scores[r];
      if (sx[1] < top * (opt.schwelle || 0.22)) break;
      var doc = this.docs[sx[0]];
      var seite = doc.u.split('#')[0];
      proSeite[seite] = (proSeite[seite] || 0) + 1;
      if (proSeite[seite] > (opt.proSeite || 2)) continue;
      treffer.push({ doc: doc, score: sx[1], abdeckung: sx[2] });
    }
    return { treffer: treffer, begriffe: begriffe };
  };

  /* ---------------------------------------------------------------- Auszug mit Markierung */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  Index.prototype.passt = function (wort, begriffe) {
    var w = norm(wort);
    if (w.length < 2 || this.stopp[w]) return 0;
    var st = stamm(w), best = 0;
    for (var b = 0; b < begriffe.length; b++) {
      var v = begriffe[b].v;
      if (v[st] && v[st] > best) best = v[st];
    }
    return best;
  };

  Index.prototype.markiere = function (text, begriffe) {
    var self = this, out = '', last = 0, re = /[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?:-[A-Za-zÀ-ÖØ-öø-ÿ0-9]+)*/g, m;
    while ((m = re.exec(text))) {
      var w = m[0], hit = self.passt(w, begriffe);
      if (!hit && w.indexOf('-') > 0) hit = w.split('-').some(function (p) { return self.passt(p, begriffe) >= 0.9; }) ? 1 : 0;
      out += esc(text.slice(last, m.index)) + (hit >= 0.68 ? '<mark>' + esc(w) + '</mark>' : esc(w));
      last = m.index + w.length;
    }
    return out + esc(text.slice(last));
  };

  Index.prototype.auszug = function (doc, begriffe, laenge) {
    laenge = laenge || 190;
    var self = this;
    var saetze = String(doc.x || '').split(/\n|(?<=[.!?])\s+/).map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 2 && s !== doc.t; });
    if (!saetze.length) return '';
    var best = 0, bestI = 0;
    saetze.forEach(function (s, i) {
      var seen = {}, sc = 0, ws = s.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]+/g) || [];
      ws.forEach(function (w) { var p = self.passt(w, begriffe); var k = stamm(norm(w)); if (p && !seen[k]) { seen[k] = 1; sc += p; } });
      sc += Math.min(s.length, 140) / 1400; // laengere Saetze bei Gleichstand
      if (sc > best) { best = sc; bestI = i; }
    });
    var text = saetze[bestI], naechster = saetze[bestI + 1];
    if (naechster && text.length < 90 && naechster.length > 25 && /[.!?]$/.test(naechster)) text += ' ' + naechster;
    if (text.length > laenge) {
      // Fenster mit den meisten Treffern
      var re2 = /[A-Za-zÀ-ÖØ-öø-ÿ0-9]+/g, m2, pos = [], start = 0, bestN = -1;
      while ((m2 = re2.exec(text))) if (self.passt(m2[0], begriffe) >= 0.68) pos.push(m2.index);
      for (var a = 0; a < pos.length; a++) {
        var s0 = Math.max(0, pos[a] - 30), n = 0;
        for (var b = a; b < pos.length; b++) if (pos[b] < s0 + laenge - 15) n += 1;
        if (n > bestN) { bestN = n; start = s0; }
      }
      if (start > 0) { var sp = text.indexOf(' ', start); start = sp >= 0 ? sp + 1 : start; }
      var teil = text.slice(start, start + laenge);
      if (start + laenge < text.length) teil = teil.replace(/\s+\S*$/, '') + ' …';
      text = (start > 0 ? '… ' : '') + teil;
    }
    return this.markiere(text, begriffe);
  };

  return { Index: Index, norm: norm, woerter: woerter, stamm: stamm, abstand: abstand, esc: esc };
});
