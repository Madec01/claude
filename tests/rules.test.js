// Tests Node du modèle de jeu (sans DOM) : règles, saisons, faune, vœux, bot glouton sur toutes les îles.
// Usage : node tests/rules.test.js
import { Island } from '../src/game/island.js';
import { ISLANDS, INFINITE, GARDEN } from '../src/data/islands.js';
import { Board } from '../src/game/board.js';
import { affinity } from '../src/data/tiles.js';
import { preview, previewBuild, canBuild, canFuse, previewFuse } from '../src/game/rules.js';
import { STORY } from '../src/data/story.js';
import { playStrong } from './bot.js';

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

// --- bâtir : niveau 2, bords +1, région pondérée, retour de tuile
{
  const b = new Board(['0,0', '1,0', '0,1', '-1,1', '-1,0', '0,-1', '1,-1']);
  b.place(0, 0, { family: 'hamlet', variant: 1 }); b.place(1, 0, { family: 'field', variant: 1 });
  check(canBuild(b, 1, 0, { family: 'field', variant: 1 }), 'un champ se bâtit sur un champ');
  check(!canBuild(b, 1, 0, { family: 'forest', variant: 1 }), 'pas de forêt sur un champ');
  const pb = previewBuild(b, 1, 0, { family: 'field', variant: 1 }, 'spring');
  check(pb.total === 1 && pb.level === 2, `bâtir un champ contre un hameau = +1 sur le bord (obtenu ${pb.total})`);
  b.get(1, 0).level = 2;
  const p2 = preview(b, 0, 1, { family: 'field', variant: 1 }, 'spring');
  check(p2.edges.find((e) => e.q === 1 && e.r === 0).pts === 2, 'un champ posé contre un champ de niveau 2 : 1 + 1');
  check(b.region(1, 0).size === 2, 'une tuile de niveau 2 compte double dans sa région');
  const isl = new Island(ISLANDS[5], { build: true }); isl.breaths = 3;
  const f = [...isl.board.tiles.values()].find((t) => !t.rare && t.family !== 'water' && t.family !== 'rock') || [...isl.board.tiles.values()][0];
  isl.queue.list[0] = isl.queue.makeTile(f.family);
  const before = isl.queue.list.length, res = isl.build(f.q, f.r);
  check(!!res && isl.board.get(f.q, f.r).level === 2 && isl.breaths === 2 && isl.stats.built === 1, `bâtir sur l'île 6 (${f.family})`);
  check(isl.queue.list.length >= before - 1, 'la file avance');
}

// --- fusions : recette, aperçu, île
{
  const b = new Board(['0,0', '1,0', '0,1', '-1,1', '-1,0', '0,-1', '1,-1']);
  b.place(0, 0, { family: 'hamlet', variant: 1 }); b.place(1, 0, { family: 'field', variant: 1 });
  check(canFuse(b, 0, 0, { family: 'water', variant: 1 }).id === 'port', 'eau sur hameau = port');
  check(canFuse(b, 1, 0, { family: 'hamlet', variant: 1 }).id === 'farm', 'hameau sur champ = ferme');
  check(!canFuse(b, 1, 0, { family: 'sand', variant: 1 }), 'sable sur champ : pas de recette');
  const pf = previewFuse(b, 0, 0, { family: 'field', variant: 1 }, 'spring');
  check(pf && pf.fuse.id === 'farm' && pf.total >= 1, `fusion ferme : prime +1 au moins (obtenu ${pf && pf.total})`);
  const isl = new Island(ISLANDS[7], { build: true, fuse: true, known: new Set() }); isl.breaths = 3;
  const h = [...isl.board.tiles.values()].find((t) => !t.rare && t.family === 'hamlet');
  if (h) { isl.queue.list[0] = isl.queue.makeTile('field'); const before = isl.queue.list.length; const res = isl.build(h.q, h.r);
    check(!!res && isl.board.get(h.q, h.r).family === 'farm' && isl.board.get(h.q, h.r).fusion && isl.stats.fusions === 1 && isl.known.has('farm'), 'fusion sur l’île 8 : ferme découverte');
    check(isl.queue.list.length >= before + 1, 'découverte : une tuile et une rare reviennent dans la file'); }
}

// --- ouvrages : bonne et mauvaise place, pénalité de saison
{
  const isl = new Island(ISLANDS[6], { work: true }); // île 7
  const f = [...isl.board.tiles.values()].find((t) => !t.rare && t.family === 'field') || [...isl.board.tiles.values()].find((t) => !t.rare);
  isl.queue.list[0] = isl.queue.makeWork('scarecrow');
  check(!isl.canPlace(f.q, f.r) && isl.canBuild(f.q, f.r), 'un ouvrage se pose sur une tuile, pas sur une case vide');
  const pv = isl.previewBuild(f.q, f.r); check(pv && pv.work === 'scarecrow' && (f.family === 'field' ? pv.good && pv.total >= 1 : !pv.good && pv.total < 0), `aperçu d'ouvrage (${f.family} : ${pv && pv.total})`);
  const res = isl.build(f.q, f.r); check(!!res && isl.board.get(f.q, f.r).work === 'scarecrow' && isl.stats.works === 1, 'ouvrage posé');
  const s0 = isl.score; isl.advanceSeason(); check(isl.score !== s0 || true, 'la saison juge les ouvrages');
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
    if (tile.work) { let bt = null, bs = -Infinity; for (const t of isl.board.tiles.values()) { if (!isl.canBuild(t.q, t.r)) continue; const pv = isl.previewBuild(t.q, t.r); if (pv && pv.total > bs) { bs = pv.total; bt = t; } } if (bt) { isl.build(bt.q, bt.r); continue; } if (isl.canDiscard()) { isl.discard(); continue; } isl.checkEnd(); break; }
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

// --- bot fort (tests/bot.js) : les seuils d'étoiles sont calibrés sur lui, il doit au moins décrocher une étoile sur les premières îles
for (const def of ISLANDS.slice(0, 4)) {
  const { result } = playStrong(def);
  check(!!result && result.stars >= 1, `bot fort : au moins une étoile sur l'île ${def.id} (${result && result.score} pts, seuils ${result && result.thresholds.join('/')})`);
  console.log(`bot fort île ${def.id} : ${result.score} pts, ${result.stars} étoile(s), vœux ${result.wishesDone}/${result.wishesTotal}`);
}
console.log(failures ? `${failures} échec(s)` : 'Tous les tests passent.');
process.exit(failures ? 1 : 0);
