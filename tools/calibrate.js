// Calibrage des étoiles : fait jouer le bot fort (tests/bot.js) et le bot glouton sur chaque île avec plusieurs graines.
// Les seuils valent 45 / 65 / 85 % de la médiane du bot fort, et l'étoile d'or 100 % (voir plus bas).
// Usage : node tools/calibrate.js [nbEssais=6] [îles=1-30] [--write : écrit src/data/campaign_stars.js]
// L'île est toujours jouée avec sa graine (celle du joueur) ; les essais ne font varier que le hasard du bot.
import { campaignIsland, CAMPAIGN_SIZE, islandOptions } from '../src/data/campaign.js';
import { writeFileSync } from 'node:fs';
import { Island } from '../src/game/island.js';
import { playStrong } from '../tests/bot.js';
import { FUSIONS } from '../src/data/tiles.js';
const KNOWN = new Set(FUSIONS.map((f) => f.id));   // recettes connues ou non, c'est désormais pareil : une découverte ne rend plus ni tuile ni rare (audit de simplification, lot S5)

const N = Number(process.argv[2] || 6);
const range = (process.argv[3] || `1-${CAMPAIGN_SIZE}`).split('-').map(Number);
const WRITE = process.argv.includes('--write');
function playGreedy(def, seedOffset) {
  const isl = new Island(def, { seedOffset, ...(def.mech ? islandOptions(def) : {}) }); let g = 0;
  while (!isl.ended && g++ < 2000) { const t = isl.current; if (!t) { isl.checkEnd(); break; } let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const p = isl.preview(c.q, c.r); const s = p.total + Math.random() * 0.01; if (s > bs) { bs = s; best = c; } } if (!best) { isl.checkEnd(); break; } isl.place(best.q, best.r); }
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
  // Échelle mesurée sur quatre niveaux de jeu (cinquante îles, trois parties chacun) rapportés à cette médiane :
  // jeu au hasard 0,43 · joueur tranquille 0,66 · joueur appliqué 0,70 · meilleur coup immédiat 0,73.
  // D'où 45 % (« tu as joué, pas posé au hasard »), 65 % (« bonne partie »), 85 % (« très bonne »), 100 % pour l'or.
  // à partir de l'île 11 (bâtir, fusions, faune qui se prépare de loin), le joueur du meilleur coup immédiat ne fait plus que 59 à 77 % du bot
  // fort, contre 86 à 96 % avant : les seuils passent à 40 / 58 / 75 % pour qu'un joueur appliqué y ait ses trois étoiles (26 septembre)
  const FACT = n >= 11 ? [0.40, 0.58, 0.75, 1.0] : [0.45, 0.65, 0.85, 1.0];
  const m = med(strong); out[n] = FACT.map((f) => Math.round((m / def.cells) * f * 10) / 10);
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
