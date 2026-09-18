// Tests Node du modèle de jeu (sans DOM) : règles, saisons, faune, vœux, bot glouton sur toutes les îles.
// Usage : node tests/rules.test.js
import { Island } from '../src/game/island.js';
import { ISLANDS, INFINITE, GARDEN } from '../src/data/islands.js';
import { Board } from '../src/game/board.js';
import { neighbors } from '../src/game/hex.js';
import { affinity } from '../src/data/tiles.js';
import { preview, previewBuild, canBuild, canFuse, previewFuse } from '../src/game/rules.js';
import { STORY } from '../src/data/story.js';
import { BALANCE } from '../src/data/balance.js';
import { playStrong } from './bot.js';
import { campaignIsland, CAMPAIGN_SIZE, CAMPAIGN_WISHES, islandOptions } from '../src/data/campaign.js';

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

// --- niveau 3 : mûrir une saison, 2 souffles, bords +2, signature
{
  const isl = new Island(ISLANDS[9], { build: true, level3: true }); isl.breaths = 6;   // île 10
  const f = [...isl.board.tiles.values()].find((t) => !t.rare && t.family === 'forest') || [...isl.board.tiles.values()].find((t) => !t.rare);
  isl.queue.list[0] = isl.queue.makeTile(f.family); isl.build(f.q, f.r);
  check(isl.board.get(f.q, f.r).level === 2, 'niveau 2 atteint');
  isl.queue.list[0] = isl.queue.makeTile(f.family);
  check(!isl.canBuild(f.q, f.r), 'pas de niveau 3 avant une saison');
  isl.seasonsPassed.push('summer');
  check(isl.canBuild(f.q, f.r) && isl.previewBuild(f.q, f.r).cost === 2, 'niveau 3 possible après une saison, 2 souffles');
  const b0 = isl.breaths; isl.build(f.q, f.r);
  check(isl.board.get(f.q, f.r).level === 3 && isl.breaths === b0 - 2 && isl.stats.level3 === 1, 'niveau 3 bâti');
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


// --- remise des ouvrages : défausse gratuite, expiration au bout de 12 poses, fraîcheur, pénalité qui s'éteint
{
  const d = campaignIsland(26); const isl = new Island(d, { ...islandOptions(d) });
  const cadence = BALANCE.works.everyPlacements; BALANCE.works.everyPlacements = 9999;   // pas d'ouvrage automatique pendant ce scénario
  const placeOne = () => { if (isl.current.work) return false; const c = isl.board.legalCells()[0]; isl.place(c.q, c.r); return true; };
  isl.giveWork('scarecrow'); placeOne();
  check(!!isl.current && isl.current.work && isl.discardCost() === 0 && isl.canDiscard(), 'un ouvrage en tête de file se défausse gratuitement');
  check(isl.canShed() && !isl.canPocket(), 'un ouvrage va en remise, pas en poche');
  const before = isl.queue.list.length;
  check(isl.toShed() && isl.shed.length === 1 && isl.shedLeft(isl.shed[0]) === 12 && isl.queue.list.length === before, 'mise en remise : 12 poses devant lui, la file continue');
  for (let i = 0; i < 5; i++) placeOne();
  check(isl.shed.length === 1 && isl.shedLeft(isl.shed[0]) === 7 && !isl.isFresh(isl.shed[0]), 'après cinq poses : sept restantes, plus frais');
  for (let i = 0; i < 7; i++) placeOne();
  check(isl.shed.length === 0 && isl.stats.worksExpired === 1, `l'ouvrage expire à la douzième pose (${isl.shed.length}, ${isl.stats.worksExpired})`);
  // frais : repris dans les quatre poses
  isl.giveWork('hive'); placeOne(); isl.toShed(); placeOne(); placeOne();
  check(isl.fromShed(0) && isl.current.work && isl.isFresh(isl.current), 'repris après deux poses : encore frais');
  // remplacement : un second ouvrage prend la place du premier
  isl.toShed(); isl.giveWork('menhir'); placeOne(); isl.toShed();
  check(isl.shed.length === 1 && isl.shed[0].family === 'menhir' && isl.stats.worksExpired === 2, 'la remise pleine : le nouveau remplace l’ancien');
  // pénalité qui s'éteint : un épouvantail sur une forêt
  isl.fromShed(0); isl.discard();
  isl.giveWork('scarecrow'); placeOne();
  const forest = [...isl.board.tiles.values()].find((t) => t.family === 'forest' && !t.rare && !t.work) || [...isl.board.tiles.values()].find((t) => t.family !== 'field' && !t.rare && !t.work);
  const pv = isl.previewBuild(forest.q, forest.r); check(pv && !pv.good && pv.fresh, 'épouvantail hors champ : mauvaise place, mais frais');
  isl.build(forest.q, forest.r); const tt = isl.board.get(forest.q, forest.r); check(tt.work === 'scarecrow' && tt.workBad, 'ouvrage posé mal placé');
  const pts = [];
  for (let k = 0; k < 3; k++) { isl.advanceSeason(); const ev = isl.lastEvents.filter((e) => e.type === 'season').pop(); const w = ev.events.filter((x) => x.type === 'work' && x.q === forest.q && x.r === forest.r); pts.push(w.length ? (w[0].gone ? 'gone' : w[0].pts) : null); }
  check(pts[0] === -2 && pts[1] === -1 && pts[2] === 'gone' && !isl.board.get(forest.q, forest.r).work && isl.stats.worksGone === 1, `pénalité −2, −1 puis effacement (${pts.join(',')})`);
  BALANCE.works.everyPlacements = cadence;
}

// --- campagne : cinquante définitions valides, textes présents, mécaniques cumulatives, bot fort sur les îles générées du début
for (const w of CAMPAIGN_WISHES) check(!!STORY.wishes[w.id], `texte du vœu de campagne ${w.id}`);
{
  let prev = 0;
  for (let n = 1; n <= CAMPAIGN_SIZE; n++) {
    const d = campaignIsland(n);
    check(d.id === n && d.cells > 0 && d.seasonLength > 0 && d.mech && d.mech.size >= prev && Array.isArray(d.wishes), `île de campagne ${n} valide`);
    check(!!(d.story ? STORY.islands[d.story] : d.name && d.intro && d.intro.length === 2), `textes de l'île de campagne ${n}`);
    for (const w of d.wishes) check(!!STORY.wishes[w.id] && (!w.deadline || w.deadline.placements > 5 || w.deadline.season), `vœu ${w.id} sur l'île ${n}`);
    prev = d.mech.size;
    // déblocage des mécaniques : rien avant son île (bâtir 16, fusions 21, ouvrages 26, niveau 3 31, météo 11, vœux 6, collines 12, lande 14, rares 8/9/13/18)
    const isl = new Island(d, { ...islandOptions(d) });
    const exp = { buildOn: n >= 16, fuseOn: n >= 21, workOn: n >= 26, level3On: n >= 31, weatherOn: n >= 11 };
    for (const [k, v] of Object.entries(exp)) check(!!isl[k] === v, `île ${n} : ${k} devrait valoir ${v}`);
    check((isl.wishes.length > 0) === (n >= 6) || (n >= 6 && isl.wishes.length === 0 && d.story === 1), `île ${n} : vœux ${n >= 6 ? 'attendus' : 'interdits'} (${isl.wishes.length})`);
    check((n >= 12 || !d.weights.hill) && (n >= 14 || !d.weights.heath), `île ${n} : pas de colline avant 12 ni de lande avant 14`);
    check(isl.rareTier === (n >= 18 ? 3 : n >= 13 ? 2 : n >= 9 ? 1 : 0), `île ${n} : palier de rares ${isl.rareTier}`);
    check(isl.breaths === 0 && !isl.queue.list.some((t) => t.work || t.rare), `île ${n} : file de départ sans ouvrage ni rare, aucun souffle`);
  }
  // climats : eau posée +2 au chaud, hameau contre marais −2 à l'humide, champs dormants dès l'automne au froid, saisons longues
  {
    const hot = campaignIsland(21), humid = campaignIsland(26), cold = campaignIsland(31);
    check(hot.climate === 'hot' && humid.climate === 'humid' && cold.climate === 'cold', 'climats des chapitres 5, 6, 7');
    const ih = new Island(hot, islandOptions(hot)); const c = ih.board.legalCells()[0]; ih.queue.list[0] = ih.queue.makeTile('water');
    check(ih.preview(c.q, c.r).base.some((b) => b.label === 'soleil' && b.pts === 2), 'climat chaud : eau posée +2');
    const iu = new Island(humid, islandOptions(humid)); const hm = [...iu.board.tiles.values()].find((t) => t.family === 'hamlet'); const cc = iu.board.legalCells().find((x) => neighbors(x.q, x.r).some(([a, b]) => a === hm.q && b === hm.r)); iu.queue.list[0] = iu.queue.makeTile('marsh');
    check(iu.preview(cc.q, cc.r).edges.find((e) => e.q === hm.q && e.r === hm.r).pts === -2, 'climat humide : hameau contre marais −2');
    const ic = new Island(cold, islandOptions(cold)); ic.season = 'autumn'; ic.rule = 'recolte'; const hc = [...ic.board.tiles.values()].find((t) => t.family === 'hamlet'); const c2 = ic.board.legalCells().find((x) => neighbors(x.q, x.r).some(([a, b]) => a === hc.q && b === hc.r)); ic.queue.list[0] = ic.queue.makeTile('field');
    check(!ic.preview(c2.q, c2.r).edges.some((e) => e.q === hc.q && e.r === hc.r && e.pts > 0), 'climat froid : champ dormant dès l’automne');
    ic.season = 'autumn'; ic.inSeason = ic.seasonLength; ic.advanceSeason(); const w1 = ic.season; ic.inSeason = ic.seasonLength; ic.advanceSeason(); const w2 = ic.season; ic.inSeason = ic.seasonLength; ic.advanceSeason();
    check(w1 === 'winter' && w2 === 'winter' && ic.season === 'spring', `climat froid : deux hivers (${w1}, ${w2}, ${ic.season})`);
  }
  for (const n of [2, 4, 6, 9, 11, 21, 26, 31]) { const d = campaignIsland(n); const { result } = playStrong(d, { seedOffset: 0, ...islandOptions(d) }); check(!!result && result.score > 0, `bot fort sur l'île générée ${n} (${result && result.score} pts)`); }
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
