// Garde-fou du décor : il garde une mémoire par région et ne refait que les régions qui ont changé (decor.js). Si une
// lecture d'une tuile manque un jour à la signature d'une région, le décor gardé divergera d'un décor recalculé de
// zéro. Ce test joue des parties (poses, actions de bâtir, annulations, saisons) et compare, après chaque geste, le
// décor avec mémoire à un `new Decor` tout neuf, objet pour objet.
// Usage : node tests/decor.test.js
import { Island } from '../src/game/island.js';
import { Decor } from '../src/game/decor.js';
import { campaignIsland, islandOptions } from '../src/data/campaign.js';

const ser = (d) => JSON.stringify({ objects: d.objects, courts: d.courts, holes: d.holes }, (k, v) => (v instanceof Map ? [...v] : v instanceof Set ? [...v] : v));
let gestes = 0, ecarts = 0;
for (const n of [4, 13, 19, 29]) for (const graine of [0, 1]) {
  const d = campaignIsland(n); const isl = new Island(d, { ...islandOptions(d), seedOffset: graine });
  const garde = new Decor(7 + graine);
  let s = 99 + n * 13 + graine; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  let g = 0;
  while (!isl.ended && g++ < 400) {
    // un geste : parfois une action de bâtir, parfois une annulation, sinon la meilleure pose parmi quelques cases
    const cibles = isl.buildTargets();
    if (cibles.length && rnd() < 0.3) { const t = cibles[Math.floor(rnd() * cibles.length)]; isl.build(t.q, t.r); }
    else if (isl.canUndo() && rnd() < 0.08) isl.undo();
    else {
      const cs = isl.board.legalCells(); if (!cs.length || !isl.current) break;
      let best = cs[0], bs = -Infinity; for (let i = 0; i < 6; i++) { const c = cs[Math.floor(rnd() * cs.length)]; const pv = isl.preview(c.q, c.r); if (pv.total > bs) { bs = pv.total; best = c; } }
      if (!isl.place(best.q, best.r)) break;
    }
    garde.sync(isl.board); const neuf = new Decor(7 + graine); neuf.sync(isl.board);
    gestes++;
    if (ser(garde) !== ser(neuf)) { ecarts++; if (ecarts <= 3) console.log(`ÉCHEC : île ${n}, graine ${graine}, geste ${g} : le décor gardé diffère d'un décor recalculé`); }
  }
}
console.log(ecarts ? `${ecarts} écart(s) sur ${gestes} gestes.` : `Décor : ${gestes} gestes, le décor gardé est toujours identique au décor recalculé.`);
process.exit(ecarts ? 1 : 0);
