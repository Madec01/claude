// Tests Node du modèle de jeu (sans DOM) : règles, saisons, faune, vœux, bot glouton sur toutes les îles.
// Usage : node tests/rules.test.js
import { Island } from '../src/game/island.js';
import { ISLANDS, INFINITE, GARDEN } from '../src/data/islands.js';
import { Board } from '../src/game/board.js';
import { affinity } from '../src/data/tiles.js';
import { preview } from '../src/game/rules.js';
import { STORY } from '../src/data/story.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { failures++; console.error('ÉCHEC :', msg); } };

// --- affinités
check(affinity('field', 'hamlet') === 2, 'champ-hameau = 2');
check(affinity('hamlet', 'marsh') === -1, 'hameau-marais = -1');
check(affinity('mill', 'hamlet') === 2, 'moulin compte comme champ');
check(affinity('meadow', 'water') === 0, 'prairie-eau = 0');

// --- plateau minimal
{
  const b = new Board(['0,0', '1,0', '0,1', '-1,1', '-1,0', '0,-1', '1,-1']);
  b.place(0, 0, { family: 'hamlet', variant: 1 });
  const p = preview(b, 1, 0, { family: 'field', variant: 1 }, 'spring');
  check(p.total === 2, `champ près d'un hameau = 2 (obtenu ${p.total})`);
  const pw = preview(b, 1, 0, { family: 'field', variant: 1 }, 'winter');
  check(pw.total === 0, `en hiver, champ dormant = 0 (obtenu ${pw.total})`);
  // fermeture : entourer le hameau
  for (const [q, r] of [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]]) b.place(q, r, { family: 'meadow', variant: 1 });
  const pc = preview(b, 1, -1, { family: 'meadow', variant: 1 }, 'spring');
  check(pc.closes.some((c) => c.family === 'hamlet' && c.bonus === 2), 'fermer un hameau seul = prime 2');
  check(pc.closes.some((c) => c.family === 'meadow' && c.size === 6), 'la prairie de 6 se ferme aussi');
}

// --- histoire : chaque île a ses textes
for (const isl of ISLANDS) {
  check(!!STORY.islands[isl.id], `textes de l'île ${isl.id}`);
  for (const w of isl.wishes) check(!!STORY.wishes[w.id], `texte du vœu ${w.id}`);
}

// --- bot glouton : joue chaque île jusqu'au bout
function playGreedy(def, upgrades = {}) {
  const isl = new Island(def, { upgrades });
  const events = {};
  isl.on((e) => { events[e.type] = (events[e.type] || 0) + 1; });
  let guard = 0;
  while (!isl.ended && guard++ < 2000) {
    const tile = isl.current;
    if (!tile) { isl.checkEnd(); break; }
    let best = null, bestScore = -Infinity;
    for (const c of isl.board.legalCells()) {
      const p = isl.preview(c.q, c.r);
      const s = p.total + Math.random() * 0.01;
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (!best) { isl.checkEnd(); break; }
    if (isl.breaths >= 1 && bestScore < 0 && isl.canSwap(1)) { isl.swap(1); continue; }
    isl.place(best.q, best.r);
    if (def.infinite && isl.placements > 150) isl.finish('test');
  }
  return { result: isl.result, events, isl };
}

const summary = [];
for (const def of [...ISLANDS, INFINITE, GARDEN]) {
  try {
    const { result, events, isl } = playGreedy(def);
    check(!!result, `l'île ${def.id} se termine`);
    summary.push({ id: def.id, cells: def.cells, score: result.score, stars: result.stars, thresholds: result.thresholds.join('/'), placements: result.placements, seasons: result.seasons, closed: result.stats.closed, fauna: result.stats.faunaMax, wishes: `${result.wishesDone}/${result.wishesTotal}`, ev: Object.entries(events).map(([k, v]) => `${k}:${v}`).join(' ') });
    // cohérence : le score est la somme des points affichés ? (contrôle grossier : positif et fini)
    check(Number.isFinite(result.score), `score fini île ${def.id}`);
    check(isl.board.placed <= isl.board.cells, `pas plus de tuiles que de cases (île ${def.id})`);
  } catch (e) { failures++; console.error(`EXCEPTION île ${def.id} :`, e); }
}
console.table(summary);
console.log(failures ? `${failures} échec(s)` : 'Tous les tests passent.');
process.exit(failures ? 1 : 0);
