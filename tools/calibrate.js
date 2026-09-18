// Calibrage des étoiles : fait jouer le bot fort (tests/bot.js) et le bot glouton sur chaque île avec plusieurs graines.
// Usage : node tools/calibrate.js [nbGraines=6] [îles=1-12]
import { ISLANDS } from '../src/data/islands.js';
import { Island } from '../src/game/island.js';
import { playStrong } from '../tests/bot.js';
import { FUSIONS } from '../src/data/tiles.js';
const KNOWN = new Set(FUSIONS.map((f) => f.id));   // régime de croisière : recettes déjà découvertes (les découvertes ne rendent des tuiles qu'une fois par campagne)

const N = Number(process.argv[2] || 6);
const range = (process.argv[3] || '1-12').split('-').map(Number);
function playGreedy(def, seedOffset) {
  const isl = new Island(def, { seedOffset }); let g = 0;
  while (!isl.ended && g++ < 2000) { const t = isl.current; if (!t) { isl.checkEnd(); break; } if (t.work) { let bt = null, bw = -Infinity; for (const x of isl.board.tiles.values()) { if (!isl.canBuild(x.q, x.r)) continue; const pv = isl.previewBuild(x.q, x.r); if (pv && pv.total > bw) { bw = pv.total; bt = x; } } if (bt && (bw > 0 || !isl.canDiscard())) { isl.build(bt.q, bt.r); continue; } if (isl.canDiscard()) { isl.discard(); continue; } isl.checkEnd(); break; } let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const p = isl.preview(c.q, c.r); const s = p.total + Math.random() * 0.01; if (s > bs) { bs = s; best = c; } } if (!best) { isl.checkEnd(); break; } isl.place(best.q, best.r); }
  return isl.result;
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const rows = [];
for (const def of ISLANDS) {
  if (def.id < range[0] || def.id > (range[1] ?? range[0])) continue;
  const t0 = Date.now();
  const strong = [], greedy = [], wishes = [], perCell = [];
  for (let k = 0; k < N; k++) {
    const r = playStrong(def, { seedOffset: k, known: new Set(KNOWN) }).result; strong.push(r.score); wishes.push(r.wishesTotal ? r.wishesDone / r.wishesTotal : 1); perCell.push(r.score / r.cells);
    greedy.push(playGreedy(def, k).score);
  }
  const m = med(strong);
  rows.push({ île: def.id, cases: def.cells, glouton: Math.round(med(greedy)), fort_med: Math.round(m), fort_min: Math.min(...strong), fort_max: Math.max(...strong), par_case: (m / def.cells).toFixed(2), vœux: (wishes.reduce((a, b) => a + b, 0) / N).toFixed(2), seuils_actuels: (Island.prototype && def.starFactors ? def.starFactors : [2.8, 5.2, 7.8]).map((f) => Math.round(def.cells * f)).join('/'), s: ((Date.now() - t0) / 1000).toFixed(1) });
  console.error(`île ${def.id} : ${rows[rows.length - 1].s} s`);
}
console.table(rows);
