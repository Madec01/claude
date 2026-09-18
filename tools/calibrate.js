// Calibrage des étoiles : fait jouer le bot fort (tests/bot.js) et le bot glouton sur chaque île avec plusieurs graines.
// Usage : node tools/calibrate.js [nbEssais=6] [îles=1-50] [--write : écrit src/data/campaign_stars.js]
// L'île est toujours jouée avec sa graine (celle du joueur) ; les essais ne font varier que le hasard du bot.
import { campaignIsland, CAMPAIGN_SIZE, islandOptions } from '../src/data/campaign.js';
import { writeFileSync } from 'node:fs';
import { Island } from '../src/game/island.js';
import { playStrong } from '../tests/bot.js';
import { FUSIONS } from '../src/data/tiles.js';
const KNOWN = new Set(FUSIONS.map((f) => f.id));   // régime de croisière : recettes déjà découvertes (les découvertes ne rendent des tuiles qu'une fois par campagne)

const N = Number(process.argv[2] || 6);
const range = (process.argv[3] || `1-${CAMPAIGN_SIZE}`).split('-').map(Number);
const WRITE = process.argv.includes('--write');
function playGreedy(def, seedOffset) {
  const isl = new Island(def, { seedOffset, ...(def.mech ? islandOptions(def) : {}) }); let g = 0;
  while (!isl.ended && g++ < 2000) { const t = isl.current; if (!t) { if (isl.shed.length && isl.fromShed(0)) continue; isl.checkEnd(); break; } if (t.work) { let bt = null, bw = -Infinity; for (const x of isl.board.tiles.values()) { if (!isl.canBuild(x.q, x.r)) continue; const pv = isl.previewBuild(x.q, x.r); if (pv && pv.total > bw) { bw = pv.total; bt = x; } } if (bt && (bw > 0 || !isl.canDiscard())) { isl.build(bt.q, bt.r); continue; } if (isl.canDiscard()) { isl.discard(); continue; } isl.checkEnd(); break; } let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const p = isl.preview(c.q, c.r); const s = p.total + Math.random() * 0.01; if (s > bs) { bs = s; best = c; } } if (!best) { isl.checkEnd(); break; } isl.place(best.q, best.r); }
  return isl.result;
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const rows = [];
const out = {};
for (let n = range[0]; n <= (range[1] ?? range[0]); n++) {
  const def = campaignIsland(n);
  const t0 = Date.now();
  const strong = [], greedy = [], wishes = [], perCell = [];
  for (let k = 0; k < N; k++) {
    // la graine 0 est celle que le joueur joue ; seul le hasard du bot varie
    const r = playStrong(def, { seedOffset: 0, botSeed: k, known: new Set(KNOWN) }).result;
    if (!r) { console.error(`île ${n}, hasard ${k} : partie sans fin (bot bloqué), ignorée`); continue; }
    strong.push(r.score); wishes.push(r.wishesTotal ? r.wishesDone / r.wishesTotal : 1); perCell.push(r.score / r.cells);
    greedy.push(playGreedy(def, 0).score);
  }
  const m = med(strong); out[n] = [0.55, 0.8, 0.9, 1.0].map((f) => Math.round((m / def.cells) * f * 10) / 10);   // trois étoiles à 55 / 80 / 90 %, étoile d'or à 100 %
  rows.push({ île: def.id, cases: def.cells, glouton: Math.round(med(greedy)), fort_med: Math.round(m), fort_min: Math.min(...strong), fort_max: Math.max(...strong), par_case: (m / def.cells).toFixed(2), vœux: (wishes.reduce((a, b) => a + b, 0) / N).toFixed(2), seuils_actuels: (def.starFactors || [2.8, 5.2, 7.8]).map((f) => Math.round(def.cells * f)).join('/'), nouveaux: out[n].join('/'), s: ((Date.now() - t0) / 1000).toFixed(1) });
  console.error(`île ${def.id} : ${rows[rows.length - 1].s} s`);
}
console.table(rows);
if (WRITE) {
  const { CAMPAIGN_STARS } = await import('../src/data/campaign_stars.js'); const merged = { ...CAMPAIGN_STARS, ...out };
  const body = Object.keys(merged).map(Number).sort((a, b) => a - b).map((k) => `  ${k}: [${merged[k].join(', ')}],`).join('\n');
  writeFileSync(new URL('../src/data/campaign_stars.js', import.meta.url), `// Seuils d'étoiles des îles de campagne (points par case : 55 / 80 / 90 % de la médiane du bot fort, puis l'étoile d'or à 100 %), générés par tools/calibrate.js.\nexport const CAMPAIGN_STARS = {\n${body}\n};\n`);
  console.error('campaign_stars.js écrit');
}
