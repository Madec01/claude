// Tests de la reprise d'une partie laissée en plan : on quitte au milieu d'une île, on revient, tout est exactement comme avant.
// Usage : node tests/run.test.js
import { Island } from '../src/game/island.js';
import { campaignIsland, islandOptions, campaignMechanics } from '../src/data/campaign.js';

// --- stockage local minimal (RunSave s'en sert)
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const { RunSave } = await import('../src/core/run.js');

let failures = 0;
const check = (cond, msg) => { if (!cond) { failures++; console.error('ÉCHEC :', msg); } };

const make = (n) => { const def = campaignIsland(n); const mech = new Set(def.mech || campaignMechanics(n)); return new Island(def, { ...islandOptions({ mech }), known: new Set() }); };

// Petit joueur glouton, strictement déterministe : la meilleure case pour la tuile du moment, sans hasard.
// Il sert à mener deux îles côte à côte et à vérifier qu'elles restent identiques.
function playSome(isl, k) {
  let n = 0;
  while (n < k && !isl.ended) {
    const tile = isl.current;
    if (!tile) { isl.checkEnd(); break; }
    if (tile.work) {   // ouvrage : la meilleure tuile d'accueil, sinon défausse
      let bt = null, bs = -Infinity;
      for (const t of [...isl.board.tiles.values()].sort((a, b) => a.q - b.q || a.r - b.r)) { if (!isl.canBuild(t.q, t.r)) continue; const pv = isl.previewBuild(t.q, t.r); if (pv && pv.total > bs) { bs = pv.total; bt = t; } }
      if (bt && bs > 0) { isl.build(bt.q, bt.r); n++; continue; }
      if (isl.canDiscard()) { isl.discard(); continue; }
      if (bt) { isl.build(bt.q, bt.r); n++; continue; }
      isl.checkEnd(); break;
    }
    let best = null, bs = -Infinity;
    for (const c of isl.board.legalCells().sort((a, b) => a.q - b.q || a.r - b.r)) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } }
    if (!best) { isl.checkEnd(); break; }
    const before = isl.placements;
    isl.place(best.q, best.r);
    if (isl.placements === before) break;
    n++;
  }
  return n;
}

// --- une partie rangée puis reprise rend la même île
for (const id of [4, 12, 23, 37, 46]) {
  const a = make(id);
  playSome(a, 25);
  check(!a.ended, `île ${id} : la partie est bien en cours`);
  check(a.placements >= 20, `île ${id} : le joueur d’essai a bien posé (${a.placements} tuiles)`);
  check(a.score > 0, `île ${id} : et marqué des points (${a.score})`);
  const snap = a.serialize();

  const b = make(id);
  check(b.restoreRun(JSON.parse(JSON.stringify(snap))), `île ${id} : la reprise est acceptée`);
  check(b.score === a.score, `île ${id} : même score (${b.score} vs ${a.score})`);
  check(b.placements === a.placements, `île ${id} : même nombre de poses`);
  check(b.season === a.season && b.inSeason === a.inSeason, `île ${id} : même saison`);
  check(b.breaths === a.breaths, `île ${id} : mêmes souffles`);
  check(b.rule === a.rule, `île ${id} : même règle de saison`);
  check(b.board.tiles.size === a.board.tiles.size, `île ${id} : même nombre de tuiles posées`);
  let same = true;
  for (const [k, t] of a.board.tiles) { const u = b.board.get(t.q, t.r); if (!u || u.family !== t.family || (u.level || 1) !== (t.level || 1) || !!u.blighted !== !!t.blighted) same = false; }
  check(same, `île ${id} : plateau identique case par case`);
  check(JSON.stringify(b.queue.snapshot()) === JSON.stringify(a.queue.snapshot()), `île ${id} : file de tuiles identique`);
  check(b.wishes.length === a.wishes.length && b.wishes.every((w, i) => w.id === a.wishes[i].id && w.done === a.wishes[i].done), `île ${id} : mêmes vœux au même point`);
  check(b.fauna.size === a.fauna.size, `île ${id} : même faune`);

  // et la suite se joue pareil : dix poses de plus des deux côtés donnent le même résultat
  playSome(a, 10); playSome(b, 10);
  check(b.score === a.score, `île ${id} : la suite marque pareil (${b.score} vs ${a.score})`);
  check(b.placements === a.placements, `île ${id} : la suite avance pareil`);
  check(JSON.stringify([...b.board.tiles.keys()].sort()) === JSON.stringify([...a.board.tiles.keys()].sort()), `île ${id} : la suite pose aux mêmes endroits`);
}

// --- une reprise après un passage de saison garde le tirage à venir
{
  const a = make(18);
  while (!a.ended && a.seasonsPassed.length < 2) { if (!playSome(a, 1)) break; }
  const snap = a.serialize();
  const b = make(18); b.restoreRun(JSON.parse(JSON.stringify(snap)));
  check(a.seasonsPassed.length >= 2, 'au moins deux saisons se sont écoulées');
  check(b.seasonsPassed.join() === a.seasonsPassed.join(), 'saisons écoulées identiques');
  check(JSON.stringify(b.queue.list.map((t) => t.family)) === JSON.stringify(a.queue.list.map((t) => t.family)), 'tuiles visibles identiques après un passage de saison');
}

// --- RunSave : écriture, lecture, résumé, oubli
{
  RunSave.clear();
  check(RunSave.read() === null, 'rien de rangé au départ');
  const isl = make(9); playSome(isl, 12);
  const where = { kind: 'campaign', id: 9, semis: null };
  check(RunSave.write(where, isl, 'Le Val Bâti') === true, 'la partie en cours est rangée');
  const d = RunSave.read();
  check(d && d.where.id === 9 && d.isl.placements === isl.placements, 'la partie rangée se relit');
  const desc = RunSave.describe();
  check(desc && desc.title === 'Le Val Bâti' && desc.placements === isl.placements && desc.season === isl.season, 'le résumé du bouton est juste');
  check(typeof desc.when === 'string' && desc.when.length > 0, 'le résumé dit depuis quand');

  // une île finie n'est pas rangée
  isl.ended = true;
  check(RunSave.write(where, isl, 'x') === false, 'une île finie n’est pas rangée');
  isl.ended = false;

  // une île à peine ouverte non plus
  const fresh = make(9);
  check(RunSave.write(where, fresh, 'x') === false, 'une île sans la moindre pose n’est pas rangée');

  // trop vieux : oublié
  const raw = JSON.parse(store.get('cent-saisons.run'));
  raw.at = Date.now() - 31 * 24 * 3600 * 1000;
  store.set('cent-saisons.run', JSON.stringify(raw));
  check(RunSave.read() === null, 'une partie vieille d’un mois est oubliée');
  check(store.has('cent-saisons.run') === false, 'et elle est effacée du stockage');

  // illisible : oublié sans planter
  store.set('cent-saisons.run', '{ceci n’est pas du JSON');
  check(RunSave.read() === null, 'une partie illisible est oubliée');

  // version inconnue : refusée par l'île
  check(make(9).restoreRun({ v: 99 }) === false, 'une version inconnue est refusée');
  check(make(9).restoreRun(null) === false, 'rien à reprendre est refusé');
}

// --- la partie en cours tient dans le stockage local
{
  const big = make(50); playSome(big, 60);
  const size = JSON.stringify({ v: 1, at: Date.now(), where: { kind: 'campaign', id: 50 }, title: 'x', isl: big.serialize() }).length;
  check(size < 400000, `la plus grande île tient dans le stockage (${Math.round(size / 1024)} Ko)`);
  console.log(`  partie en cours sur l’île 50 : ${Math.round(size / 1024)} Ko`);
}

console.log(failures ? `\n${failures} échec(s)` : '\nReprise : tout est bon.');
process.exit(failures ? 1 : 0);
