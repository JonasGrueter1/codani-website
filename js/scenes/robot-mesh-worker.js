// Szene "robot": Glaettung der Bueste im Hintergrund (Web Worker, ES-Modul). Catmull-Clark dauert auf Handys einige
// hundert Millisekunden; im Worker laeuft der Preloader dabei fluessig weiter. Gleiche Funktionen wie im Hauptthread
// (robot-mesh.js), die Ergebnisse kommen als Transferables zurueck. Faellt der Worker aus, rechnet robot-mesh.js selbst.
//   { op: 'l1', buf }   Bueste lesen (Datei holt der Hauptthread), Gesichtsausdruck, eine Stufe Catmull-Clark, Normalen
//   { op: 'cc', mesh }  eine weitere Stufe Catmull-Clark und Normalen (Stufe high)
import { parseBust, applyExpression, catmullClark, computeNormals } from './robot-mesh.js';

const pack = (m) => {
  const out = { pos: m.pos, head: m.head, arm: m.arm, ao: m.ao, quads: m.quads, nV: m.nV, lm: m.lm, normal: m.normal };
  return [out, [out.pos.buffer, out.head.buffer, out.arm.buffer, out.ao.buffer, out.quads.buffer, out.normal.buffer]];
};

self.onmessage = async (ev) => {
  try {
    const { op } = ev.data;
    let m;
    if (op === 'l1') {
      m = catmullClark(applyExpression(parseBust(ev.data.buf)));
    } else {
      m = catmullClark(ev.data.mesh);
    }
    computeNormals(m);
    const [out, tr] = pack(m);
    self.postMessage(out, tr);
  } catch (e) {
    self.postMessage({ error: String(e && e.message) });
  }
};
