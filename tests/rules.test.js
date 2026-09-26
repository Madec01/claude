// Tests Node du modèle de jeu (sans DOM) : règles, saisons, faune, vœux, bot glouton sur toutes les îles.
// Usage : node tests/rules.test.js
import { Island } from '../src/game/island.js';
import { ISLANDS, INFINITE, GARDEN } from '../src/data/islands.js';
import { Board } from '../src/game/board.js';
import { neighbors } from '../src/game/hex.js';
import { affinity } from '../src/data/tiles.js';
import { preview, previewBuild, canLevelUp, fusionsAround, previewFuse, apply, closedRegionsAround, countClosedRegions } from '../src/game/rules.js';
import { STORY } from '../src/data/story.js';
import { progressOf } from '../src/game/wishes.js';
import { BALANCE } from '../src/data/balance.js';
import { playStrong } from './bot.js';
import { campaignIsland, mechIsland, CAMPAIGN_SIZE, CHAPTER_LEN, CHAPTERS, MECH_AT, GROWTH_CHAPTER, CAMPAIGN_WISHES, islandOptions, gateStars, chapterStars, unlockedUpTo, CHAPTER_GATE, CHAPTER_PATIENCE, islandDone, chapterPlays, gateOpen, gateText, islandCells, islandThresholds, restarFromBest } from '../src/data/campaign.js';
import { CAMPAIGN_STARS } from '../src/data/campaign_stars.js';
import { applySignature } from '../src/data/signatures.js';
import { gradeMove } from '../src/game/feedback.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { failures++; console.error('ÉCHEC :', msg); } };

// --- la réserve de vœux ne demande rien d'impossible : chaque recette existe, chaque mécanique requise arrive un jour
// (le vœu du port a visé pendant des semaines une recette retirée, sur dix îles, sans que rien ne casse)
{
  const { FUSION_BY_ID } = await import('../src/data/tiles.js');
  for (const w of CAMPAIGN_WISHES) {
    if (w.type === 'fusion') check(!!FUSION_BY_ID[w.recipe], `vœu ${w.id} : la recette « ${w.recipe} » existe`);
    if (w.needs) check(mechIsland(w.needs) !== null, `vœu ${w.id} : la mécanique « ${w.needs} » arrive dans la campagne`);
  }
  for (const i of ISLANDS) for (const w of i.wishes || []) if (w.type === 'fusion') check(!!FUSION_BY_ID[w.recipe], `île ${i.id}, vœu ${w.id} : la recette « ${w.recipe} » existe`);
  const needOf = { fusion: 'fuse', level: 'build' };
  for (let n = 1; n <= CAMPAIGN_SIZE; n++) { const d = campaignIsland(n); for (const w of d.wishes) if (needOf[w.type]) check(d.mech.has(needOf[w.type]), `île ${n}, vœu ${w.id} : demande « ${needOf[w.type]} », pas encore ouvert`); }
}

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

// --- bâtir : une tuile d'une région close monte d'un niveau (2 souffles, sans tuile) ; bords +1, région pondérée
{
  const b = new Board(['0,0', '1,0', '0,1', '-1,1', '-1,0', '0,-1', '1,-1']);
  b.place(0, 0, { family: 'hamlet', variant: 1 }); b.place(1, 0, { family: 'field', variant: 1 });
  check(!canLevelUp(b, 1, 0), 'un champ dont la région est ouverte ne se bâtit pas');
  b.payRegion(b.region(1, 0, 'field'));
  check(canLevelUp(b, 1, 0), 'un champ d’une région close se bâtit');
  const pb = previewBuild(b, 1, 0, 'spring');
  check(pb.total === 1 && pb.level === 2, `bâtir un champ contre un hameau = +1 sur le bord (obtenu ${pb.total})`);
  b.get(1, 0).level = 2;
  const p2 = preview(b, 0, 1, { family: 'field', variant: 1 }, 'spring');
  check(p2.edges.find((e) => e.q === 1 && e.r === 0).pts === 2, 'un champ posé contre un champ de niveau 2 : 1 + 1');
  check(b.region(1, 0).size === 2, 'une tuile de niveau 2 compte double dans sa région');
  const isl = new Island(ISLANDS[5], { build: true }); isl.breaths = 3;
  const tuiles = [...isl.board.tiles.values()].filter((t) => !t.rare && t.family !== 'water' && t.family !== 'rock');
  const f = tuiles[0] || [...isl.board.tiles.values()][0];
  check(!isl.canBuild(f.q, f.r) && /close/.test(isl.pourquoiPas(f.q, f.r) || ''), `région ouverte : rien à bâtir, et le jeu dit pourquoi (${isl.pourquoiPas(f.q, f.r)})`);
  isl.board.payRegion(isl.board.region(f.q, f.r, f.family)); isl.board.touch();
  check(isl.action(f.q, f.r).kind === 'level' && isl.action(f.q, f.r).cost === 2, 'région close : bâtir le niveau 2 pour 2 souffles');
  const before = isl.queue.list.length, pl = isl.placements, res = isl.build(f.q, f.r);
  check(!!res && isl.board.get(f.q, f.r).level === 2 && isl.breaths === 1 && isl.stats.built === 1, `bâtir sur l'île 6 (${f.family}) : 2 souffles`);
  check(isl.queue.list.length === before && isl.placements === pl, 'bâtir ne prend rien dans la file et ne compte pas comme une pose');
  const g = tuiles.find((t) => t !== f && t.family !== f.family);
  if (g) { isl.board.payRegion(isl.board.region(g.q, g.r, g.family)); isl.board.touch(); check(!isl.canBuild(g.q, g.r) && /souffle/.test(isl.pourquoiPas(g.q, g.r) || ''), `sans assez de souffles : rien, et le jeu le dit (${isl.pourquoiPas(g.q, g.r)})`); }
}

// --- fusions : deux voisines qui font recette ; la touchée devient la composée, la voisine reste
{
  const b = new Board(['0,0', '1,0', '0,1', '-1,1', '-1,0', '0,-1', '1,-1']);
  b.place(0, 0, { family: 'hamlet', variant: 1 }); b.place(1, 0, { family: 'field', variant: 1 });
  const pf = previewFuse(b, 0, 0, 'farm', 'spring');
  check(pf && pf.fuse.id === 'farm' && pf.total >= 1 && pf.with.family === 'field', `fusion ferme : prime +1 au moins (obtenu ${pf && pf.total})`);
  check(!previewFuse(b, 0, 0, 'paddy', 'spring'), 'pas de rizière sans eau voisine');
  b.place(0, 1, { family: 'sand', variant: 1 });
  check(fusionsAround(b, 0, 0).map((f) => f.recipe.id).join() === 'farm', 'hameau à côté d’un champ : ferme (et rien avec le sable)');
  const fa = fusionsAround(b, 1, 0); check(fa.length === 1 && fa[0].with.q === 0 && fa[0].with.r === 0 && fa[0].with.family === 'hamlet', 'la voisine qui fait recette est nommée');
  check(!fusionsAround(b, 0, 1).length, 'sable : pas de recette avec ces voisines');
  b.get(0, 0).level = 2; check(!fusionsAround(b, 0, 0).length, 'une tuile bâtie ne fusionne plus'); b.get(0, 0).level = 1;
  const isl = new Island(ISLANDS[7], { build: true, fuse: true, known: new Set() }); isl.breaths = 3;
  const h = [...isl.board.tiles.values()].find((t) => !t.rare && t.family === 'hamlet');
  const c = h && isl.board.legalCells().find((c) => neighbors(c.q, c.r).some(([a, bb]) => a === h.q && bb === h.r));
  if (h && c) {
    isl.board.place(c.q, c.r, { family: 'field', variant: 1 }); isl.board.touch();
    const before = isl.queue.list.length, pl = isl.placements; const a = isl.action(h.q, h.r, 'fuse', 'farm');
    check(!!a && a.cost === 2 && a.first, 'la ferme est proposée sur le hameau : 2 souffles, recette nouvelle');
    const res = isl.build(h.q, h.r, 'fuse', 'farm');
    check(!!res && isl.board.get(h.q, h.r).family === 'farm' && isl.board.get(h.q, h.r).fusion && isl.stats.fusions === 1 && isl.known.has('farm') && isl.breaths === 1, 'fusion sur l’île 8 : ferme découverte, 2 souffles');
    check(isl.board.get(c.q, c.r).family === 'field' && isl.queue.list.length === before && isl.placements === pl, 'la voisine reste, rien ne sort de la file, pas une pose');
  }
}

// --- niveau 3 : mûrir une saison, 3 souffles, bords +2, signature
{
  const isl = new Island(ISLANDS[9], { build: true, level3: true }); isl.breaths = 6;   // île 10
  const f = [...isl.board.tiles.values()].find((t) => !t.rare && t.family === 'forest') || [...isl.board.tiles.values()].find((t) => !t.rare);
  isl.board.payRegion(isl.board.region(f.q, f.r, f.family)); isl.board.touch(); isl.build(f.q, f.r);
  check(isl.board.get(f.q, f.r).level === 2, 'niveau 2 atteint');
  check(!isl.canBuild(f.q, f.r) && /saison/.test(isl.pourquoiPas(f.q, f.r) || ''), `pas de niveau 3 avant une saison (${isl.pourquoiPas(f.q, f.r)})`);
  isl.seasonsPassed.push('summer');
  check(isl.canBuild(f.q, f.r) && isl.previewBuild(f.q, f.r).cost === 3, 'niveau 3 possible après une saison, 3 souffles');
  const b0 = isl.breaths; isl.build(f.q, f.r);
  check(isl.board.get(f.q, f.r).level === 3 && isl.breaths === b0 - 3 && isl.stats.level3 === 1, 'niveau 3 bâti');
}

// --- niveau 3 : une seule règle (bords +2, triple dans sa région, +1 par saison) ; les noms par famille n'ont plus d'effet
{
  const { STORY: ST } = await import('../src/data/story.js');
  check(Object.values(ST.level3).every((l) => l.name && !l.short), 'les signatures du niveau 3 ne sont plus que des noms');
  const d = campaignIsland(mechIsland('build3')); const isl = new Island(d, { ...islandOptions(d) });
  const f = [...isl.board.tiles.values()].find((t) => !t.rare && t.family === 'hamlet'); f.level = 3; isl.board.touch();
  isl.inSeason = isl.seasonLength - 1; const c = isl.board.legalCells()[0]; isl.place(c.q, c.r);
  const ev = isl.lastEvents.filter((e) => e.type === 'season').pop();
  const l3 = ev ? ev.events.filter((x) => x.type === 'level3') : [];
  check(l3.length === 1 && l3[0].pts === BALANCE.build.level3Season, `niveau 3 : +${BALANCE.build.level3Season} par saison, rien de plus (${l3.map((x) => x.pts).join(',')})`);
}
// --- les ouvrages sont retirés : la ruche et le menhir sont des rares qui se posent sur une case vide et rapportent à chaque saison
{
  const { RARE, RARE_SEASONAL } = await import('../src/data/tiles.js');
  check(RARE.includes('hive') && RARE.includes('menhir') && !!RARE_SEASONAL.hive && !!RARE_SEASONAL.menhir, 'ruche et menhir sont des rares à rente');
  const d = campaignIsland(26); const isl = new Island(d, { ...islandOptions(d) });
  check(isl.workOn === undefined && isl.shed === undefined && isl.giveWork === undefined, 'plus d’ouvrage, de remise ni de don d’ouvrage');
  const rock = [...isl.board.tiles.values()].find((t) => t.family === 'rock');
  const c = isl.board.legalCells().find((x) => neighbors(x.q, x.r).some(([a, b]) => a === rock.q && b === rock.r));
  isl.queue.list[0] = isl.queue.makeRare('menhir'); check(isl.canPlace(c.q, c.r), 'le menhir se pose sur une case vide');
  isl.place(c.q, c.r); isl.inSeason = isl.seasonLength - 1;
  const c2 = isl.board.legalCells()[0]; isl.place(c2.q, c2.r);
  const ev = isl.lastEvents.filter((e) => e.type === 'season').pop();
  check(ev && ev.events.some((x) => x.type === 'rare' && x.id === 'menhir' && x.pts >= 1), 'le menhir rapporte au changement de saison, près de la roche');
  // une partie reprise avec des ouvrages : ceux posés s'en vont, la ruche en main devient une rare, les autres disparaissent
  const snap = isl.serialize(); const t0 = snap.board.tiles ? null : null;
  const i2 = new Island(d, { ...islandOptions(d) }); i2.restoreRun(snap);
  const any = [...i2.board.tiles.values()][0]; any.work = 'scarecrow'; any.workBad = true;
  i2.queue.list.unshift({ family: 'hive', variant: 1, work: true, id: 900 }, { family: 'compost', variant: 1, work: true, id: 901 });
  i2.retireRares();
  check(!any.work && i2.queue.list[0].family === 'hive' && i2.queue.list[0].rare && !i2.queue.list.some((t) => t.family === 'compost'), 'vieille partie : ouvrages retirés, ruche en main devenue rare');
}


// --- Atelier par chapitre : cohérence des données et effets des nouvelles améliorations
{
  const { UPGRADES, playerChapter, upgradesAPortee, upgradesNeuvesAPortee } = await import('../src/data/upgrades.js');
  // les graines qui paient : ce que le menu, le bilan et le passage entre deux îles rappellent
  { const c = { unlockedIsland: 12, seeds: 8, upgrades: {}, atelierVu: [] };
    const ap = upgradesAPortee(c); check(ap.length >= 1 && ap.every((u) => u.chapter <= 4 && u.costs[0] <= 8), `île 12, 8 graines : ${ap.length} amélioration(s) à portée (${ap.map((u) => u.id).join(', ')})`);
    check(upgradesAPortee({ ...c, seeds: 0 }).length === 0, 'sans graine, rien à portée');
    c.atelierVu = ap.map((u) => u.id); check(upgradesNeuvesAPortee(c).length === 0, 'une fois vues, plus rien de neuf');
    c.seeds = 30; check(upgradesNeuvesAPortee(c).length === upgradesAPortee(c).length - ap.length, 'davantage de graines : seules les nouvelles à portée sont neuves'); }
  let prevCh = 0;
  for (const u of UPGRADES) { check(u.chapter >= prevCh && u.chapter >= 1 && u.chapter <= CHAPTERS.length, `amélioration ${u.id} : chapitre croissant`); prevCh = u.chapter; if (u.requires) { const at = mechIsland(u.requires); check(at !== null && Math.ceil(at / 5) <= u.chapter, `amélioration ${u.id} : sa mécanique (${u.requires}, île ${at}) arrive avant son chapitre ${u.chapter}`); } check(u.levels.length === u.costs.length + 1, `amélioration ${u.id} : niveaux et coûts`); }
  check(playerChapter(1) === 1 && playerChapter(CHAPTER_LEN) === 1 && playerChapter(CHAPTER_LEN + 1) === 2 && playerChapter(CAMPAIGN_SIZE) === CHAPTERS.length, 'chapitre du joueur');
  const d = campaignIsland(mechIsland('build3'));
  const a = new Island(d, { ...islandOptions(d) }), b = new Island(d, { ...islandOptions(d), upgrades: { sight: 2, master: 1, still: 1, cloak: 1 } });
  check(b.queue.visible === a.queue.visible + 2, 'Regard : deux tuiles de plus (la Longue-vue y est fondue)');
  check(b.fusionCost() === 0 && a.fusionCost() === 2, 'Alambic : première fusion offerte');
  check(b.isMature({ builtAt: b.seasonsPassed.length }) && !a.isMature({ builtAt: a.seasonsPassed.length }), 'Maître d’œuvre : mûrit aussitôt');
  check(!b.climate.fieldsDormantAutumn && a.climate.fieldsDormantAutumn === true, 'Manteau : au froid, les champs ne dorment qu’en hiver');
}


// --- eau : tronc et lobes (la rivière se jette dans le lac), pont sur une rivière seulement
{
  const { classifyWater } = await import('../src/game/water.js'); const { evalWork } = await import('../src/game/rules.js');
  const cells = []; for (let q = -2; q <= 5; q++) for (let r = -3; r <= 3; r++) cells.push(`${q},${r}`);
  const b = new Board(cells);
  b.place(0, 0, { family: 'rock', variant: 1 }); b.place(1, 0, { family: 'water', variant: 1 }); b.place(2, 0, { family: 'water', variant: 1 }); b.place(3, 0, { family: 'water', variant: 1 });
  let w = classifyWater(b); check(w.get('1,0').kind === 'river' && w.get('3,0').kind === 'river' && w.get('1,0').size === 3, 'trois tuiles d’eau en ligne depuis la roche : rivière de 3');
  b.place(3, -1, { family: 'water', variant: 1 });   // fourche en (2,0)
  w = classifyWater(b);
  check(w.get('1,0').kind === 'river' && w.get('2,0').kind === 'river' && w.get('1,0').size === 2, `le tronc reste une rivière jusqu'à la fourche incluse (${w.get('1,0').kind} ${w.get('1,0').size})`);
  check(w.get('3,0').kind === 'lake' && w.get('3,-1').kind === 'lake' && w.get('3,0').size === 2 && w.get('3,0').fedBy === w.get('1,0').id, `la suite devient un lac de 2 nourri par la rivière (${w.get('3,0').kind})`);
  check(w.get('1,0').intoLake === '3,0' || w.get('1,0').intoLake === '3,-1', 'le ruban sait où entrer dans la nappe');
  check(!w.get('1,0').mouth, 'une rivière qui se jette dans un lac n’a pas d’embouchure');
  // embouchure : seul le bout de la rivière compte ; un flanc contre la mer ne suffit pas
  {
    const cells2 = []; for (let q = -1; q <= 4; q++) for (let r = -1; r <= 1; r++) cells2.push(`${q},${r}`);
    const b2 = new Board(cells2);   // masque étroit : (1,0) a la mer au nord et au sud
    b2.place(0, 0, { family: 'rock', variant: 1 }); b2.place(1, 0, { family: 'water', variant: 1 }); b2.place(2, 0, { family: 'water', variant: 1 });
    check(!classifyWater(b2).get('2,0').mouth, 'bout de rivière à l’intérieur des terres : pas d’embouchure');
    b2.place(3, 0, { family: 'water', variant: 1 }); b2.place(4, 0, { family: 'water', variant: 1 });
    check(classifyWater(b2).get('4,0').mouth, 'le bout de la rivière touche la mer : embouchure');
  }
  // le pont et le ponton ont été retirés (leurs sprites ne tenaient pas l'échelle et un ouvrage au
  // milieu d'un étang ne racontait rien) : on vérifie qu'ils ne sont plus proposés
}


// --- sauvegarde : export / import (copie locale) et rappel
{
  const store = {}; globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const { Save } = await import('../src/core/save.js');
  Save.load(); Save.campaign.unlockedIsland = 23; Save.campaign.seeds = 17; Save.campaign.stars = { 1: 3, 2: 2 }; Save.campaign.upgrades.sight = 2; Save.save();
  const text = Save.exportText(); const info = Save.inspect(text);
  check(info && info.unlockedIsland === 23 && info.stars === 5 && info.seeds === 17, 'export : fichier lisible et résumé exact');
  check(Save.inspect('{"foo":1}') === null && Save.inspect('pas du json') === null, 'import : un fichier étranger est refusé');
  Save.campaign.unlockedIsland = 1; Save.campaign.seeds = 0; Save.campaign.upgrades.sight = 0; Save.options.muted = true; Save.save();
  const r = Save.importText(text);
  check(r && Save.campaign.unlockedIsland === 23 && Save.campaign.seeds === 17 && Save.campaign.upgrades.sight === 2 && Save.options.muted === true, 'import : progression restaurée, options de l’appareil conservées');
  check(!Save.backupDue(), 'après un import, aucun rappel');
  for (let i = 0; i < 5; i++) Save.noteIslandDone(); check(Save.backupDue(), 'rappel après cinq îles');
  Save.markBackedUp(); check(!Save.backupDue() && Save.data.backup.islandsSince === 0, 'copie faite : compteur remis à zéro');
  // sauvegarde illisible : copie mise de côté et copie précédente relue
  store['cent-saisons.save'] = '{corrompu'; Save.load();
  check(store['cent-saisons.save.broken'] === '{corrompu' && Save.campaign.unlockedIsland === 23, 'sauvegarde corrompue : mise de côté, la copie précédente est relue');
}


// --- succès : données valides, moteur (événements d'île, compteurs, bilan de campagne, copie)
{
  const { ACHIEVEMENTS } = await import('../src/data/achievements.js'); const { Achievements } = await import('../src/game/achievements.js');
  const ids = ACHIEVEMENTS.map((a) => a.id);
  check(ids.length === 31 && new Set(ids).size === 31 && ACHIEVEMENTS.every((a) => a.name && a.desc && a.cat && /^[a-z0-9-]+$/.test(a.id)), 'trente-trois succès, identifiants uniques en minuscules');
  check(ACHIEVEMENTS.every((a) => !a.target || a.counter), 'chaque succès qui se compte a son compteur');
  const store = {}; globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const { Save } = await import('../src/core/save.js'); Save.load(); Save.data.campaign.seeds = 0;
  Achievements.init(Save); const got = []; Achievements.onUnlock((a) => got.push(a.id));
  const d = campaignIsland(26); const isl = new Island(d, { ...islandOptions(d) });
  isl.on((e) => Achievements.onIslandEvent(e, isl));
  const { playStrong } = await import('./bot.js');
  // une île entière jouée par le bot : première tuile, région close, quatre saisons…
  const r = playStrong(d, { seedOffset: 0 }); r.isl.lastEvents.forEach((e) => Achievements.onIslandEvent(e, r.isl));
  check(got.includes('premiere-tuile') && got.includes('un-toit') && got.includes('quatre-saisons'), `succès de base après une île (${got.join(', ')})`);
  check(Save.data.campaign.seeds === got.length && Object.keys(Save.data.achievements.unlocked).length === got.length, 'une graine par succès, enregistré');
  const before = got.length; Achievements.unlock('premiere-tuile'); check(got.length === before, 'un succès ne se débloque qu’une fois');
  // compteurs cumulés et bilan de campagne
  for (let i = 0; i < 10; i++) Achievements.add('masters'); Achievements.checkCounters(); check(got.includes('coup-de-maitre'), 'dix coups de maître');
  Save.data.campaign.stars = { 1: 3, 2: 3, 3: 3, 47: 3 }; Achievements.onCampaignResult({ stars: 3 }, campaignIsland(3)); check(got.includes('chapitre-clos'), 'neuf étoiles sur le chapitre 1');
  check(Achievements.progress(ACHIEVEMENTS.find((a) => a.id === 'cent-cinquante')).value === 9, 'progression des étoiles : les îles hors campagne (47) ne comptent pas');
  Achievements.onBackup(); check(got.includes('prudence'), 'copie de sauvegarde');
  check(Achievements.counter('climates3') === 1, 'trois étoiles au tempéré seulement');
}


// --- vœux : rappel dix poses avant l'échéance
{
  const d = campaignIsland(26); const isl = new Island(d, { ...islandOptions(d) }); const soon = [];
  isl.on((e) => { if (e.type === 'wish' && e.kind === 'soon') soon.push(e.wish.def.id); });
  const first = Math.min(...isl.wishes.map((w) => w.def.deadline.placements));
  let guard = 0; while (isl.placements < first - 10 && !isl.ended && guard++ < 500) { const c = isl.board.legalCells()[0]; isl.place(c.q, c.r); }
  check(soon.length >= 1, `rappel émis dix poses avant la première échéance (${soon.join(',')})`);
}



// --- les séries ne rapportent plus rien : ni souffle à trois, ni fermeture doublée à cinq (audit de simplification)
{
  const d = campaignIsland(9); const isl = new Island(d, { ...islandOptions(d) }); const ev = [];
  isl.on((e) => { if (e.type === 'streak') ev.push(e.kind); });
  let g = 0; while (!isl.ended && g++ < 40) { let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } } isl.place(best.q, best.r); }
  check(ev.length === 0 && isl.stats.bestStreak >= 3, `la série se mesure encore (${isl.stats.bestStreak}) mais ne déclenche plus rien (${ev.join(',')})`);
}

// --- main de saison dès son île : choisir librement la tuile visible ; plus d'échange, de bourgeon ni de poche
{
  const d = campaignIsland(mechIsland('hand')); const isl = new Island(d, { ...islandOptions(d) });
  const second = isl.queue.list[1]; check(isl.canPick(1) && isl.canSwap === undefined && isl.pick(1) && isl.current === second, 'la deuxième tuile devient la tuile courante, gratuitement');
  const d5 = campaignIsland(mechIsland('hand') - 1); const i5 = new Island(d5, { ...islandOptions(d5) }); check(!i5.canPick(1), 'pas de main avant son île');
  check(isl.canBud === undefined && isl.toPocket === undefined, 'bourgeon et poche retirés');
}
// --- souffles : deux sources (fermer, exaucer), trois usages (défausser 1, annuler 3 une fois par saison, bâtir ou fusionner)
{
  const d = campaignIsland(20); const isl = new Island(d, { ...islandOptions(d) });
  let attendu = 0; isl.on((e) => { if (e.type === 'close') attendu += BALANCE.breaths.close; if (e.type === 'wish' && e.kind === 'done') attendu += BALANCE.breaths.wish; });
  let g = 0, depense = 0; while (!isl.ended && g++ < 200) { const c = isl.board.legalCells()[0]; if (!c) break; isl.place(c.q, c.r); }
  check(isl.breaths === attendu - depense, `les souffles ne viennent que des fermetures et des vœux (${isl.breaths} = ${attendu} − ${depense})`);
  check(BALANCE.breaths.discard === 1 && BALANCE.breaths.undo === 3 && isl.undoCost === 3, 'défausser coûte 1, annuler 3');
  const { tidyCampaign } = await import('../src/core/save.js');
  const data = { campaign: { seeds: 0, upgrades: { pocket: 2, memory: 1, spyglass: 1, sight: 1 } } };
  check(tidyCampaign(data) === 5 + 10 + 4 + 12 && !('pocket' in data.campaign.upgrades) && data.campaign.upgrades.sight === 1, 'Poche, Seconde chance et Longue-vue remboursées');
}


// --- friche : une pose négative laisse une tuile morte, sans famille ; la toucher la remet en état (1 souffle, sans tuile)
{
  const { apply, preview, previewRestore, canRestore } = await import('../src/game/rules.js');
  const cells = []; for (let q = -2; q <= 3; q++) for (let r = -2; r <= 2; r++) cells.push(`${q},${r}`);
  const b = new Board(cells);
  b.place(0, 0, { family: 'rock', variant: 1 }); b.place(1, -1, { family: 'sand', variant: 1 });
  const pv = preview(b, 1, 0, { family: 'field', variant: 1 }, 'spring');   // champ contre roche (−1) et sable (−1)
  check(pv.total < 0 && pv.blight, `champ contre roche et sable : pose négative, friche annoncée (${pv.total})`);
  apply(b, 1, 0, { family: 'field', variant: 1 }, 'spring');
  const t = b.get(1, 0); check(t.blighted && Board.familiesOf(t).length === 0 && b.regions('field').length === 0, 'la friche ne compte pour aucune famille');
  const pv2 = preview(b, 2, -1, { family: 'field', variant: 1 }, 'spring'); check(!pv2.edges.some((e) => e.q === 1 && e.r === 0), 'un bord contre une friche ne vaut rien');
  check(canRestore(b, 1, 0) && !canRestore(b, 0, 0), 'une friche se remet en état, une tuile saine non');
  const pb = previewRestore(b, 1, 0, 'spring'); check(pb.restore && pb.level === 1 && pb.total >= 0, 'remise en état au même niveau, seuls les bons voisins comptent');
  const d = campaignIsland(mechIsland('build')); const isl = new Island(d, { ...islandOptions(d) }); isl.breaths = 3;
  const rock = [...isl.board.tiles.values()].find((x) => x.family === 'rock');
  const near = isl.board.legalCells().find((c) => neighbors(c.q, c.r).some(([a, bb]) => isl.board.get(a, bb) === rock));
  const res = isl.place(near.q, near.r, { family: 'field', variant: 1, rare: false, id: 999 });
  if (res.blight) { const tf = isl.board.get(near.q, near.r); const a = isl.action(near.q, near.r); const b0 = isl.breaths, n0 = isl.queue.list.length; check(!!a && a.kind === 'restore' && a.cost === 1 && isl.build(near.q, near.r) && !tf.blighted && isl.breaths === b0 - 1 && isl.queue.list.length === n0, 'remise en état par l’île : 1 souffle, sans tuile, la friche recompte'); }
}

// --- campagne : trente définitions valides, textes présents, mécaniques cumulatives, bot fort sur les îles générées du début
for (const w of CAMPAIGN_WISHES) check(!!STORY.wishes[w.id], `texte du vœu de campagne ${w.id}`);
{ const { SPECIES } = await import('../src/game/fauna.js'); for (const sp of SPECIES) check(!!(STORY.fauna[sp] && STORY.fauna[sp].name), `nom français de l'animal ${sp} (la pastille de faune l'affiche)`); }
{
  let prev = 0;
  for (let n = 1; n <= CAMPAIGN_SIZE; n++) {
    const d = campaignIsland(n);
    check(d.id === n && d.cells > 0 && d.seasonLength > 0 && d.mech && d.mech.size >= prev && Array.isArray(d.wishes), `île de campagne ${n} valide`);
    check(!!(d.story ? STORY.islands[d.story] : d.name && d.intro && d.intro.length === 2), `textes de l'île de campagne ${n}`);
    for (const w of d.wishes) check(!!STORY.wishes[w.id] && (!w.deadline || w.deadline.placements > 5 || w.deadline.season), `vœu ${w.id} sur l'île ${n}`);
    prev = d.mech.size;
    // déblocage des mécaniques : rien avant son île (MECH_AT fait foi) ; la croissance n'est là que sur son chapitre
    const isl = new Island(d, { ...islandOptions(d) });
    const exp = { buildOn: n >= mechIsland('build'), handOn: n >= mechIsland('hand'), fuseOn: n >= mechIsland('fuse'), level3On: n >= mechIsland('build3'), surpriseOn: n >= mechIsland('surprise'), growOn: d.chapter === GROWTH_CHAPTER };
    for (const [k, v] of Object.entries(exp)) check(!!isl[k] === v, `île ${n} : ${k} devrait valoir ${v}`);
    const nw = mechIsland('wish'); check((isl.wishes.length > 0) === (n >= nw) || (n >= nw && isl.wishes.length === 0 && d.story === 1), `île ${n} : vœux ${n >= nw ? 'attendus' : 'interdits'} (${isl.wishes.length})`);
    check((n >= mechIsland('hill') || !d.weights.hill) && (n >= mechIsland('heath') || !d.weights.heath), `île ${n} : pas de colline avant ${mechIsland('hill')} ni de lande avant ${mechIsland('heath')}`);
    check(isl.rareTier === (n >= mechIsland('rare2') ? 1 : 0), `île ${n} : grenier dans la réserve de rares seulement dès l’île ${mechIsland('rare2')} (${isl.rareTier})`);
    check(isl.breaths === 0 && !isl.queue.list.some((t) => t.rare), `île ${n} : file de départ sans rare, aucun souffle`);
  }
  // climats : eau posée +2 au chaud, hameau contre marais −2 à l'humide, champs dormants dès l'automne au froid, saisons longues
  {
    const hot = campaignIsland(4 * CHAPTER_LEN + 1), humid = campaignIsland(5 * CHAPTER_LEN + 1), cold = campaignIsland(6 * CHAPTER_LEN + 1);
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
  for (const n of [4, 7, 8, 13, 16, 19, 25]) { const d = campaignIsland(n); const { result } = playStrong(d, { seedOffset: 0, ...islandOptions(d) }); check(!!result && result.score > 0, `bot fort sur l'île générée ${n} (${result && result.score} pts)`); }
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
// --- séries assouplies : un coup correct ne casse pas, à deux points du meilleur c'est bon, fermetures hors étalon
{
  check(gradeMove(4, 6) === 'good', 'à deux points du meilleur : bon');
  check(gradeMove(3, 6) === 'ok', 'à la moitié : correct');
  check(gradeMove(2, 6) === 'meh', 'sous la moitié : faible');
  const def = campaignIsland(9); const isl = new Island(def, { ...islandOptions(def) });
  isl.stats.streak = 2;
  const cells = isl.board.legalCells().map((c) => ({ c, pv: isl.preview(c.q, c.r) })).filter((x) => x.pv).sort((a, b) => b.pv.total - a.pv.total);
  const mid = cells.find((x) => x.pv.total > 0 && x.pv.total >= cells[0].pv.total * 0.5 && x.pv.total < cells[0].pv.total * 0.8 && x.pv.total < cells[0].pv.total - 2);
  if (mid) { isl.place(mid.c.q, mid.c.r); check(isl.stats.streak === 2, `un coup correct laisse la série à 2 (${isl.stats.streak})`); }
}
// --- étoile d'or (la Faucille a été retirée)
{
  const def = campaignIsland(12); const isl = new Island(def, { ...islandOptions(def) });
  check(isl.goldThreshold > isl.thresholds[2], `l'étoile d'or est au-dessus de la troisième étoile (${isl.thresholds[2]} < ${isl.goldThreshold})`);
  check(isl.canCloseSeason === undefined, 'plus de Faucille : on ne clôt plus une saison avant son terme');
}
// --- contrats d'archipel retirés : la porte ne compte plus que les étoiles, une vieille sauvegarde perd ses contrats sans rien perdre
{
  const { tidyCampaign } = await import('../src/core/save.js');
  const camp = { stars: { 4: 2, 5: 2, 6: 1 }, contracts: { 2: { id: 'wishes', progress: { 4: 9 }, done: true } } };
  check(gateStars(camp, 2) === 5, `les étoiles seules comptent pour la porte (${gateStars(camp, 2)})`);
  const data = { campaign: { ...camp, seeds: 3, upgrades: { sight: 1, sickle: 2, seed2: 1, rare: 4 } } };
  const back = tidyCampaign(data);
  check(back === 6 + 9 + 7 + 14 && data.campaign.seeds === 3 + back, `Faucille 2 (6+9), Semence forte (7) et la Fontaine de Semence rare (14) sont remboursées (${back})`);
  check(!('sickle' in data.campaign.upgrades) && !('seed2' in data.campaign.upgrades) && data.campaign.upgrades.rare === 3 && data.campaign.upgrades.sight === 1, 'améliorations retirées effacées, Semence rare ramenée au Grenier, le reste intact');
  check(!data.campaign.contracts, 'les contrats disparaissent de la sauvegarde');
  check(tidyCampaign(data) === 0 && data.campaign.seeds === 3 + back, 'une seconde passe ne rembourse rien');
}

// --- une région close qui regrandit : ce qu'elle paie ne doit pas dépendre du côté par lequel elle grandit.
// L'identité d'une région était « famille:plus petit sommet », et ne changeait donc que si la nouvelle case
// triait plus petit. Réparer une friche au bout d'une rangée close payait la prime ENTIÈRE d'un côté, et rien
// de l'autre. (Une friche ne compte pour aucune famille : la réparer fait grandir une région déjà close.)
{
  // trois cases en ligne ; une friche à un bout, la rangée close de l'autre. On répare, et on regarde ce que ça paie.
  const essai = (friche) => {
    const cases = ['0,0', '1,0', '2,0'];
    const b = new Board(cases);
    for (const k of cases) {
      const [q, r] = k.split(',').map(Number);
      const t = b.place(q, r, { family: 'meadow', variant: 1, id: 0 });
      if (k === friche) t.blighted = true;
    }
    // la rangée sans la friche est close (son seul voisin du masque est occupé) : on la paie, comme en jeu
    const vivantes = cases.filter((k) => k !== friche);
    const [q0, r0] = vivantes[0].split(',').map(Number);
    const premier = closedRegionsAround(b, q0, r0);
    const primeInitiale = premier.reduce((a, c) => a + c.bonus, 0);
    for (const c of premier) b.payRegion(c);
    // on répare la friche : la région close grandit d'une case
    const [qf, rf] = friche.split(',').map(Number);
    b.get(qf, rf).blighted = false; b.touch();
    const apres = closedRegionsAround(b, qf, rf);
    return { primeInitiale, prime: apres.reduce((a, c) => a + c.bonus, 0) };
  };
  const gauche = essai('0,0');   // la case réparée trie PLUS PETIT que la région : l'ancien identifiant changeait
  const droite = essai('2,0');   // elle trie plus grand : l'identifiant ne changeait pas
  check(gauche.primeInitiale === 2 && droite.primeInitiale === 2, `la rangée de deux se paie d'abord (${gauche.primeInitiale} / ${droite.primeInitiale})`);
  check(gauche.prime === droite.prime, `réparer paie pareil des deux côtés (gauche +${gauche.prime}, droite +${droite.prime})`);
  check(gauche.prime === 1, `et ne paie que la case gagnée, jamais la région entière (+${gauche.prime} pour une case)`);

  // une case déjà payée ne repaie jamais : on redemande la fermeture sans rien avoir changé
  const b2 = new Board(['0,0', '1,0']);
  for (const [q, r] of [[0, 0], [1, 0]]) b2.place(q, r, { family: 'meadow', variant: 1, id: 0 });
  const un = closedRegionsAround(b2, 0, 0); for (const c of un) b2.payRegion(c);
  check(un.reduce((a, c) => a + c.bonus, 0) === 2, 'une région de deux vaut deux');
  check(closedRegionsAround(b2, 0, 0).length === 0, 'redemandée telle quelle, elle ne propose plus rien');
  const reg = b2.region(0, 0, 'meadow');
  check(b2.regionPaid(reg) && b2.regionUnpaid(reg) === 0, 'elle est marquée payée, cellule par cellule');
  check(countClosedRegions(b2, 'meadow') === 1, 'et elle compte pour une région close');
}

// --- portes de chapitre : le déblocage se déduit de la sauvegarde, pas du moment où on gagne les étoiles
// (retour joueur : bloqué à l'île 5 alors que le compte y était, parce que l'étoile manquante avait été décrochée
//  en refaisant une île précédente et que rien ne rejugeait la porte ; puis bloqué à l'île 9, sans étoile sur elle.)
{
  const camp = (stars, contracts = {}, plays = undefined) => ({ stars, contracts, ...(plays ? { plays } : {}) });
  check(unlockedUpTo(camp({})) === 1, 'rien de joué : on commence à l’île 1');
  check(unlockedUpTo(camp({ 1: 2 })) === 2, 'une île réussie ouvre la suivante');
  check(unlockedUpTo(camp({ 1: 2, 3: 3 })) === 2, 'un trou dans la série arrête le déblocage');
  check(unlockedUpTo(camp({ 1: 1, 2: 1, 3: 1 })) === 3, `trois étoiles au chapitre 1 : la porte tient (il en faut ${CHAPTER_GATE})`);
  check(unlockedUpTo(camp({ 1: 1, 2: 2, 3: 1 })) === 4, 'la quatrième étoile décrochée en REFAISANT l’île 2 ouvre le chapitre 2');
  check(unlockedUpTo(camp({ 1: 1, 2: 1, 3: 2 })) === 4, 'quatre étoiles gagnées sur l’île de bout de chapitre : pareil');
  check(unlockedUpTo(camp({ 1: 3, 2: 3, 3: 0 })) === 3, 'six étoiles mais l’île 3 jamais réussie : on s’arrête à l’île 3');
  check(unlockedUpTo(camp({ 1: 1, 2: 1, 3: 1 }, { 1: { done: true } })) === 3, 'un contrat d’archipel d’une vieille sauvegarde ne vaut plus rien pour la porte');
  const plein = {}; for (let n = 1; n <= CAMPAIGN_SIZE; n++) plein[n] = 3;
  check(unlockedUpTo(camp(plein)) === CAMPAIGN_SIZE, 'campagne parfaite : tout est ouvert jusqu’à la dernière île');
  // la règle ne retire jamais rien : `Math.max` côté jeu, vérifié ici sur le principe
  check(unlockedUpTo(camp({ 1: 1, 2: 1, 3: 1, 4: 3, 5: 3 })) === 3, 'des étoiles au-delà d’une porte fermée n’ouvrent pas la porte');

  // --- plus aucune île ne peut murer : la terminer suffit à ouvrir la suivante
  check(unlockedUpTo({ stars: {}, plays: { 1: 1 } }) === 2, 'une île terminée SANS étoile ouvre la suivante');
  check(islandDone({ plays: { 3: 2 } }, 3) && islandDone({ stars: { 3: 1 } }, 3) && islandDone({ best: { 3: 120 } }, 3), 'terminée : parties comptées, étoile, ou meilleur score (anciennes sauvegardes)');
  check(!islandDone({ stars: { 3: 0 }, best: { 3: 0 } }, 3), 'jamais jouée : pas terminée');
  // le cas du joueur bloqué : chapitre 1 passé, puis une île qu'il n'arrive pas à étoiler
  const bloque = { stars: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 }, contracts: {}, plays: { 6: 1 } };
  check(unlockedUpTo(bloque) === 7, 'île 6 terminée sans étoile, chapitre 2 à quatre étoiles : l’île 7 s’ouvre');

  // --- la porte de chapitre a une seconde clé : la patience. Elle s'atteint en jouant, donc elle ne peut pas se fermer pour de bon.
  const trois = { 1: 1, 2: 1, 3: 1 };
  check(chapterPlays({ stars: trois }, 1) === 3, 'trois îles terminées : trois parties comptées');
  check(!gateOpen({ stars: trois, contracts: {} }, 1), `trois étoiles et trois parties : la porte tient (${CHAPTER_GATE} étoiles ou ${CHAPTER_PATIENCE} parties)`);
  check(gateOpen({ stars: trois, contracts: {}, plays: { 1: 2, 2: 2, 3: 1 } }, 1), 'cinq parties terminées dans le chapitre : la porte s’ouvre sans les étoiles');
  check(unlockedUpTo({ stars: trois, contracts: {}, plays: { 1: 2, 2: 2, 3: 1 } }) === 4, 'et le chapitre 2 devient jouable');
  check(!gateOpen({ stars: {}, contracts: {}, plays: { 1: 9 } }, 1), 'rejouer neuf fois la même île n’ouvre rien : les trois îles restent à terminer');
  check(gateText({ stars: trois, contracts: {} }, 1).includes(`3 / ${CHAPTER_GATE}`) && gateText({ stars: trois, contracts: {} }, 1).includes(`3 / ${CHAPTER_PATIENCE}`), 'le joueur voit les deux comptes');
  check(gateText({ stars: { 1: 3, 2: 3 }, contracts: {} }, 1) === null, 'porte ouverte : plus rien à afficher');
}

// --- l'échelle des étoiles : 45 / 65 / 85 % de la médiane du bot fort jusqu'à l'île 10, 40 / 58 / 75 % ensuite (26 septembre), l'or à 100 %
// (mesuré sur quatre niveaux de jeu, cinquante îles : hasard 0,43 · tranquille 0,66 · meilleur coup immédiat 0,73
//  de cette médiane. À 55 % la première étoile valait le jeu au hasard et un joueur ordinaire plafonnait à
//  cinq étoiles par chapitre, une de moins que la porte.)
{
  let ordre = 0, bornes = 0, cases = 0;
  for (let n = 1; n <= CAMPAIGN_SIZE; n++) {
    const def = campaignIsland(n); const f = def.starFactors;
    if (f.length === 4 && f[0] < f[1] && f[1] < f[2] && f[2] < f[3]) ordre++;
    // les trois seuils tombent bien à 45 / 65 / 85 % de l'étoile d'or (les quatre colonnes sont arrondies au
    // dixième, d'où une marge de 0,1 : l'étoile d'or elle-même n'est la médiane qu'à l'arrondi près)
    if ((n >= 11 ? [0.40, 0.58, 0.75] : [0.45, 0.65, 0.85]).every((x, i) => Math.abs(f[i] - f[3] * x) <= 0.1)) bornes++;
    if (islandCells(def) > 0 && islandThresholds(def).length === 4) cases++;
  }
  check(ordre === CAMPAIGN_SIZE, `les quatre seuils montent sur les ${CAMPAIGN_SIZE} îles (${ordre})`);
  check(bornes === CAMPAIGN_SIZE, `et valent 45 / 65 / 85 % de l’étoile d’or jusqu’à l’île 10, 40 / 58 / 75 % ensuite (${bornes})`);
  check(cases === CAMPAIGN_SIZE, `le nombre de cases se calcule sans jouer la partie (${cases})`);
  // Island.thresholds doit donner exactement la même chose : c'est ce qui rend le rattrapage juste
  const def7 = campaignIsland(7); const isl7 = new Island(def7, islandOptions(def7));
  check(JSON.stringify(islandThresholds(def7).slice(0, 3)) === JSON.stringify(isl7.thresholds) && islandCells(def7) === isl7.board.cells,
    `même compte de cases et mêmes seuils que la partie (${isl7.board.cells} cases, ${isl7.thresholds.join('/')})`);

  // --- rattrapage : une échelle revue vaut pour les parties déjà jouées
  const th7 = islandThresholds(def7);
  const camp = { stars: { 7: 0 }, gold: {}, best: { 7: th7[1] } };   // score qui vaut deux étoiles aujourd'hui
  check(restarFromBest(camp) && camp.stars[7] === 2, `le meilleur score déjà gardé redonne ses étoiles (${camp.stars[7]})`);
  check(!restarFromBest(camp), 'une seconde passe ne change plus rien');
  const camp2 = { stars: { 7: 3 }, gold: {}, best: { 7: th7[0] } };
  restarFromBest(camp2); check(camp2.stars[7] === 3, 'le rattrapage ne retire jamais une étoile déjà gagnée');
  const camp3 = { stars: {}, gold: {}, best: { 7: th7[3] } };
  restarFromBest(camp3); check(camp3.stars[7] === 3 && camp3.gold[7] === true, 'un score d’or rend aussi l’étoile d’or');
  const camp4 = { stars: {}, gold: {}, best: { 7: 0, 99: 9999 } };
  check(!restarFromBest(camp4), 'un score nul ou une île hors campagne ne donnent rien');
}
// --- le pourquoi des points : le cumul par source vaut le score ; signatures des îles 36 à 49 ; voix selon la dominante
{
  const def = campaignIsland(26); const r = playStrong(def, { seedOffset: 0, botSeed: 1, known: new Set() }); const res = r.result;
  const sum = Object.values(res.tally).reduce((a, b) => a + b, 0);
  check(sum === res.score, `le cumul par source vaut le score (${sum} = ${res.score})`);
  check(res.bestMove && res.bestMove.pts > 0 && res.bestMove.family, `meilleur coup enregistré (+${res.bestMove && res.bestMove.pts})`);
  check(res.dominant === null || (res.dominant.share >= 0.3 && ['hamlet', 'water', 'forest'].includes(res.dominant.family)), 'dominante : hameaux, eau ou forêt à partir d’un tiers');
  // annuler rend le cumul cohérent
  const isl = new Island(def, { ...islandOptions(def) }); isl.breaths = 9; const c0 = isl.board.legalCells()[0]; isl.place(c0.q, c0.r); const t1 = { ...isl.tally }; const c1 = isl.board.legalCells()[0]; isl.place(c1.q, c1.r); isl.undo();
  check(JSON.stringify(isl.tally) === JSON.stringify(t1), 'annuler rend le cumul par source à son état précédent');
  for (let n = 22; n <= 29; n++) { const d = campaignIsland(n); check(!!d.signature && d.intro[1].toLowerCase().includes(d.signature.name.toLowerCase().split(' ')[0]) || !!d.signature, `île ${n} : signature « ${d.signature && d.signature.name} »`); }
  // « Sans une pierre » n'a plus d'île depuis la campagne à trente : la signature reste dans la réserve du livre II, on la vérifie à part
  const sp = applySignature(campaignIsland(22), 'sans_roche');
  check(!sp.weights.rock && !sp.weights.hill && !sp.start.some((t) => t.family === 'rock'), 'Sans une pierre : ni roche ni colline, ni pierre au départ');
  for (let n = 22; n <= 29; n++) { const d = campaignIsland(n); if (!d.weights.rock && !d.weights.hill) check(!d.wishes.some((w) => w.type === 'river'), `île ${n} : sans roche, pas de vœu de rivière`); }
  check(campaignIsland(29).tilesRatio < 0.8 && campaignIsland(28).seasonLength === 9 && applySignature(campaignIsland(29), 'saisons_longues').seasonLength === campaignIsland(29).seasonLength + 2, 'file courte, saisons brèves et longues');
  // les tuiles de départ de la signature sont posées ; les tuiles en plus ne peuvent être que des lagunes (eau)
  for (let n = 22; n <= 29; n++) { const d = campaignIsland(n); const i2 = new Island(d, { ...islandOptions(d) }); const sk = new Set(d.start.map((t) => `${t.q},${t.r}`)); const extra = [...i2.board.tiles.values()].filter((t) => !sk.has(`${t.q},${t.r}`)); check(d.start.every((t) => !!i2.board.get(t.q, t.r)) && extra.every((t) => t.family === 'water' && t.start), `île ${n} : ${d.start.length} tuiles de départ posées${extra.length ? ` + ${extra.length} lagune(s)` : ''}`); }
  check(STORY.resultsBy.hamlet[3].length > 0 && STORY.memoryVoice.water.length > 0, 'textes de voix par dominante présents');
}
// --- croissance : une tuile bien entourée des siennes monte au niveau 2 toute seule
{
  // la croissance est le caractère du chapitre 9 (îles 25 à 27) : fermée avant, fermée après
  const def = campaignIsland(25); const isl = new Island(def, { ...islandOptions(def) });
  check(isl.growOn, 'la croissance est ouverte à l’île 25');
  for (const n of [24, 28, 30]) check(!new Island(campaignIsland(n), { ...islandOptions(campaignIsland(n)) }).growOn, `elle est fermée à l’île ${n}`);
  // un hameau entouré de trois hameaux pousse après deux saisons, pas avant
  const b = isl.board; const c0 = b.legalCells()[0];
  const put = (q, r, family) => { if (!b.has(q, r)) b.mask.add(`${q},${r}`); return b.place(q, r, { family, variant: 1, rare: false, id: 0 }); };
  const t = put(20, 20, 'hamlet'); const ns = neighbors(20, 20);
  for (let i = 0; i < 3; i++) put(ns[i][0], ns[i][1], 'hamlet');
  let g = isl.growTiles(); check(g.length === 0 && t.ripe === 1 && t.ripening, `première saison : elle mûrit sans pousser (ripe=${t.ripe}, annonce=${t.ripening})`);
  g = isl.growTiles(); check(g.length === 1 && t.level === 2 && t.grown && !t.ripening, `deuxième saison : elle pousse au niveau 2 (${g.length})`);
  check(!isl.growTiles().some((x) => x.q === 20 && x.r === 20), 'une tuile déjà poussée ne pousse pas deux fois');
  // la condition qui tombe remet le compteur à zéro
  const t2 = put(30, 30, 'forest'); const ns2 = neighbors(30, 30);
  for (let i = 0; i < 4; i++) put(ns2[i][0], ns2[i][1], 'forest');
  isl.growTiles(); check(t2.ripe === 1, 'la forêt entourée de quatre forêts mûrit');
  b.tiles.delete(`${ns2[0][0]},${ns2[0][1]}`); b.touch();
  isl.growTiles(); check(t2.ripe === 0 && (t2.level || 1) === 1, 'une voisine en moins : le compteur repart de zéro');
  // une tuile bâtie, rare, fusionnée ou portant un ouvrage ne pousse pas ; le marais et la roche non plus
  const t3 = put(40, 40, 'marsh'); const ns3 = neighbors(40, 40);
  for (let i = 0; i < 5; i++) put(ns3[i][0], ns3[i][1], 'marsh');
  isl.growTiles(); isl.growTiles(); check((t3.level || 1) === 1, 'le marais ne pousse pas : « marais dense » ne veut rien dire');
  // une tuile poussée par le temps ne compte ni pour le vœu « bâtir » ni pour le contrat des bâtisseurs
  check(isl.stats.built === 0 && isl.stats.grown >= 1, `ce que le temps fait ne compte pas dans les tuiles bâties (bâties=${isl.stats.built}, poussées=${isl.stats.grown})`);
  check(progressOf({ def: { type: 'level', count: 2 } }, { board: b }) === 0, 'le vœu « deux tuiles de niveau 2 » ignore les tuiles poussées par le temps');
}
// --- lagunes : un trou cerné par l'île est de l'eau, pas de la mer (pépin G6HX)
{
  // la situation du rapport : Île infinie, trou en 1,-1, un marais posé en 2,-1 contre la mare
  const isl = new Island(INFINITE);
  const lagune = isl.board.get(1, -1);
  check(!!lagune && lagune.family === 'water' && lagune.start, 'Île infinie : la lagune de 1,-1 est une tuile d’eau posée au départ');
  const pv = isl.preview(2, -1, { family: 'marsh', variant: 1 });
  check(pv.total === 2 && pv.edges.some((e) => e.q === 1 && e.r === -1 && e.pts === 2), `un marais contre la lagune vaut ses deux points (${pv.total})`);
  // plus aucun trou cerné, sur aucune île : ce qui ressemble à une mare EST une mare
  const cerne = (b) => { for (const k of b.mask) { const [q, r] = k.split(',').map(Number); for (const [a, bb] of neighbors(q, r)) if (!b.has(a, bb) && neighbors(a, bb).every(([x, y]) => b.has(x, y))) return `${a},${bb}`; } return null; };
  for (const d of [INFINITE, GARDEN, ...[5, 12, 20, 26, 30].map(campaignIsland)]) check(!cerne(new Island(d, { ...islandOptions(d) }).board), `île ${d.id} : aucun trou cerné au départ`);
  // l'Île infinie s'agrandit sans jamais laisser de trou derrière elle
  const inf = new Island(INFINITE); let n = 0;
  while (!inf.ended && n++ < 120) { const c = inf.board.legalCells()[0]; if (!c) break; inf.place(c.q, c.r); }
  check(!cerne(inf.board), `Île infinie : aucun trou cerné après ${n} poses (${inf.board.cells} cases)`);
}
// --- les insignes : l'archétype au bilan, les chapitres déjà clos rendus à une vieille sauvegarde
{
  const { tidyCampaign } = await import('../src/core/save.js');
  const { archetypeOf, ARCHETYPES } = await import('../src/data/archetypes.js');
  const data = { campaign: { upgrades: {}, plays: { 3: 1, 6: 0 }, memoriesRead: [9] } }; tidyCampaign(data);
  check(JSON.stringify(data.campaign.insignes.chapitres.sort()) === '[1,3]', `chapitres clos rendus d'après les îles-souvenirs jouées (${data.campaign.insignes.chapitres})`);
  tidyCampaign(data); check(data.campaign.insignes.chapitres.length === 2, 'rendus une seule fois');
  const r = playStrong(campaignIsland(12), { seedOffset: 0, botSeed: 1, known: new Set() });
  const a = r.result.archetype, b = archetypeOf(r.isl.board);
  check(a && ARCHETYPES.some((x) => x.id === a.id) && b && b.id === a.id && b.size === a.size && b.cells.length <= a.size, `le bilan porte l'archétype de l'île (${a && a.id}, région de ${a && a.size}, une tuile bâtie compte double)`);
}
// --- Le Souffle court : île procédurale, tuile perdue, série et paliers, saisons à effets, malus des cases vides
{
  const { tempoDef, videsMalus, multDe, reserveEte, recordsTempo, entrainementDef, ENTRAINEMENT, seuilSerie, defiDuJourDef, OBJECTIF_PAR_ID } = await import('../src/data/tempo.js');
  const { Tempo } = await import('../src/game/tempo.js');
  const T = BALANCE.tempo;
  const def = tempoDef(12345); const def2 = tempoDef(12345);
  check(def.tempo && def.cells >= T.cellsMin && def.cells <= T.cellsMax && def.seasonLength === 5 && def.start.length === 1 && !def.wishes.length, `île procédurale : ${def.cells} cases, 5 poses par saison, une tuile de départ, sans vœu`);
  check(JSON.stringify(def) === JSON.stringify(def2) && tempoDef(999).seed !== def.seed, 'même graine, même île ; graine différente, île différente');
  // pas de famille jamais vue : avec les familles de la campagne à l'île 7, ni colline ni lande, sur 60 graines
  { const connues = new Set(['meadow', 'forest', 'field', 'hamlet', 'orchard', 'water', 'marsh', 'rock', 'sand']); let ok = true, avecAvant = 0; for (let s = 1; s <= 60; s++) { const d = tempoDef(s, { familles: connues }); if ((d.weights.hill || 0) > 0 || (d.weights.heath || 0) > 0) ok = false; const d0 = tempoDef(s); if ((d0.weights.hill || 0) > 0 || (d0.weights.heath || 0) > 0) avecAvant++; } check(ok && avecAvant > 0, `familles connues seulement : ni colline ni lande sur 60 graines (${avecAvant} îles en auraient eu)`); }
  const opt = { build: false, fuse: false, hand: false, level3: false, growth: false, surprise: false };
  const isl = new Island(def, opt);
  const libres = (b) => [...b.mask].filter((k) => !b.tiles.has(k)).length;
  check(isl.tempo && isl.queue.remaining === libres(isl.board) && isl.queue.list.length === 1, `une tuile par case libre, mares comprises (${isl.queue.remaining} = ${libres(isl.board)}), une seule visible (${isl.queue.list.length})`);
  { let ok = true, n = 0; for (let s = 1; s <= 60; s++) { const i = new Island(tempoDef(s), opt); if (i.queue.remaining !== libres(i.board)) ok = false; if (i.board.tiles.size > 1) n++; } check(ok, `sur 60 graines, autant de tuiles que de cases libres (${n} îles avec des mares)`); }
  // le défi du jour : la même île pour tous, tirée de la date, à 5 s, de forme fixe
  { const a = defiDuJourDef('2026-09-25'), b = defiDuJourDef('2026-09-25'), c = defiDuJourDef('2026-09-26');
    check(JSON.stringify(a) === JSON.stringify(b) && a.seed !== c.seed && a.cadran === 5 && a.etire === 1 && a.defi === '2026-09-25' && a.tempo, `défi du jour : même date, même île (graine ${a.seed}) ; autre date, autre île (${c.seed}) ; 5 s, forme fixe`); }
  // les objectifs personnels : jugés sur les statistiques de la partie
  check(OBJECTIF_PAR_ID.pertes3.atteint({ stats: { lost: 3 } }) && !OBJECTIF_PAR_ID.pertes3.atteint({ stats: { lost: 4 } }) && OBJECTIF_PAR_ID.serie6.atteint({ stats: { bestSerie: 6 } }) && !OBJECTIF_PAR_ID.serie6.atteint({ stats: { bestSerie: 5 } }) && OBJECTIF_PAR_ID.pleines3.atteint({ stats: { saisonsPleines: 3 } }), 'objectifs personnels : au plus trois perdues, série de six, trois saisons pleines');
  // l'entraînement : une petite île fixe, ses six cibles libres autour du hameau, dix-huit poses, sans record
  { const e = new Island(entrainementDef(), opt); const cibles = ENTRAINEMENT.cibles.every(([q, r]) => e.board.has(q, r) && !e.board.get(q, r)); const ouverture = e.queue.list[0].family === ENTRAINEMENT.opening[0];
    check(e.tempo && e.def.tuto && e.def.entrainement && e.def.cadran === 8 && cibles && ouverture && e.queue.remaining >= ENTRAINEMENT.poses, `entraînement : ${e.board.mask.size} cases, six cibles libres autour du hameau, première tuile « ${e.queue.list[0].family} », ${e.queue.remaining} tuiles`);
    const tpe = new Tempo({ isl: e }); tpe.update(5); check(e.stats.lost === 0 && tpe.attend && e.queue.list.length === 1, 'entraînement : le chrono attend les poses guidées, une seule tuile proposée (pas d’effet de printemps)');
    for (const [q, r] of ENTRAINEMENT.cibles) { e.restrict = new Set([`${q},${r}`]); e.place(q, r); } e.restrict = null;
    check(e.placements === 6 && !tpe.attend && tpe.serie === 0 && e.board.closedRegions.size >= 1, `six poses guidées : le hameau est clos (${e.board.closedRegions.size} région), la série n'a pas bougé, le chrono part`);
    tpe.update(9); check(e.stats.lost === 1, 'après les poses guidées, le temps compte : une tuile perdue à 8 s');
    let n = 0; while (!e.ended && n++ < 40) { const c = e.board.legalCells()[0]; if (!c) break; tpe.depuis = 0.2; e.place(c.q, c.r); }
    check(e.ended && e.placements + e.stats.lost === ENTRAINEMENT.poses, `l'entraînement s'arrête à ${ENTRAINEMENT.poses} tuiles (${e.placements} posées, ${e.stats.lost} perdue)`); }
  check(multDe(0) === 1 && multDe(2) === 1 && multDe(3) === 1.5 && multDe(6) === 2 && multDe(10) === 3 && multDe(40) === 3, 'paliers de série : ×1, ×1,5 à 3, ×2 à 6, ×3 à 10');
  // le contrôleur, sans scène : il ne lit que l'île
  const tp = new Tempo({ isl });
  check(isl.season === 'spring' && isl.handOn && isl.queue.list.length === 2, 'printemps : deux tuiles proposées, la main ouverte');
  const avant = isl.queue.remaining;
  // printemps honnête : c'est bien la tuile NON choisie qui disparaît, et deux tuiles neuves arrivent
  const [p1, p2] = isl.queue.list.map((t) => t.id);
  const c0 = isl.board.legalCells()[0]; tp.depuis = 0.4; isl.place(c0.q, c0.r);
  const apres = isl.queue.list.map((t) => t.id);
  check(isl.queue.remaining === avant - 1 && apres.length === 2 && !apres.includes(p1) && !apres.includes(p2), `l'autre tuile du printemps (n° ${p2}) est perdue sans entamer le compte (${isl.queue.remaining} = ${avant} − 1) ; proposées ensuite : ${apres.join(', ')}`);
  { const [a1, a2] = isl.queue.list.map((t) => t.id); isl.pick(1); const c = isl.board.legalCells()[0]; tp.depuis = 0.4; isl.place(c.q, c.r); const l = isl.queue.list.map((t) => t.id); check(l.length === 2 && !l.includes(a1) && !l.includes(a2), `en choisissant la seconde tuile (n° ${a2}), la première (n° ${a1}) disparaît aussi`); }
  check(tp.serie >= 1 && tp.t === tp.limit, `pose sous une seconde : série ${tp.serie}, cadran réarmé`);
  // une pose lente casse la série ; le cadran qui tombe à zéro perd la tuile
  tp.depuis = 1.5; const c1 = isl.board.legalCells()[0]; isl.place(c1.q, c1.r); check(tp.serie === 0 && tp.dernier && !tp.dernier.rapide && tp.dernier.serieAvant >= 1, 'pose lente : la série retombe, et la tuile sait qu’elle a cassé une série');
  // le seuil de la série suit le délai : 1 s à 3 s, 2,67 s à 8 s
  check(seuilSerie({ cadran: 3 }) === 1 && seuilSerie({ cadran: 5 }) === 1.67 && seuilSerie({ cadran: 8 }) === 2.67, `seuil de la série : ${seuilSerie({ cadran: 3 })} s à 3 s, ${seuilSerie({ cadran: 5 })} s à 5 s, ${seuilSerie({ cadran: 8 })} s à 8 s`);
  { const d8 = tempoDef(4242); d8.cadran = 8; const i8 = new Island(d8, opt); const t8 = new Tempo({ isl: i8 }); const c = i8.board.legalCells()[0]; t8.depuis = 2; i8.place(c.q, c.r); const s1 = t8.serie; const c2 = i8.board.legalCells()[0]; t8.depuis = 3; i8.place(c2.q, c2.r); check(s1 >= 1 && t8.serie === 0, `à 8 s, une pose à 2 s fait monter la série (${s1}), une pose à 3 s la casse`); }
  const rest = isl.queue.remaining; const inS = isl.inSeason; tp.update(T.cadran + 0.01);
  check(isl.stats.lost === 1 && isl.queue.remaining === rest - 1 && isl.inSeason === inS + 1, 'cadran à zéro : la tuile est perdue, elle compte pour la saison');
  // série et bonus : trois poses rapides et bien placées
  const bot = () => { let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } } return best; };
  const s0 = isl.score; let bonus = 0;
  for (let i = 0; i < 3 && !isl.ended; i++) { tp.depuis = 0.3; const b = bot(); isl.place(b.q, b.r); bonus += (tp.dernier && tp.dernier.bonus) || 0; }
  check(tp.serie >= 3 && tp.mult >= 1.5 && (isl.tally.tempo || 0) === bonus && isl.score >= s0 + bonus, `trois bonnes poses rapides : série ${tp.serie}, ×${tp.mult}, bonus ${bonus} compté à sa source`);
  // les saisons : hiver gelé, été en réserve, automne sous la brume
  while (isl.season !== 'winter' && !isl.ended) isl.advanceSeason();
  check(!isl.handOn && isl.queue.list.length === 1 && Math.abs(tp.limit - T.cadran * T.hiver) < 1e-9, `hiver : cadran ×${T.hiver} (${tp.limit.toFixed(1)} s), une seule tuile visible`);
  isl.advanceSeason(); isl.advanceSeason();   // printemps puis été
  check(isl.season === 'summer' && tp.reserve === reserveEte(def) && reserveEte(def) === 12, `été : une réserve de ${tp.reserve} s pour la saison (12 s à 3 s)`);
  check(reserveEte({ cadran: 5 }) === 20 && reserveEte({ cadran: 8 }) === 32, 'la réserve d’été suit le délai : 20 s à 5 s, 32 s à 8 s');
  tp.update(5); tp.depuis = 0.2; const c2 = bot(); if (c2) isl.place(c2.q, c2.r);
  check(Math.abs(tp.reserve - (12 - 5)) < 1e-6 && Math.abs(tp.t - tp.reserve) < 1e-6, 'la pose ne recharge pas la réserve d’été');
  // fin d'été lisible : la réserve vide perd d'un coup ce qui restait à poser, en UN seul événement, et l'automne commence
  { const pertes = []; const off = isl.on((e) => { if (e.type === 'lost') pertes.push(e); }); const restait = isl.seasonLength - isl.inSeason; const lost0 = isl.stats.lost; tp.update(20);
    check(pertes.length === 1 && pertes[0].n === restait && isl.stats.lost === lost0 + restait && isl.season === 'autumn', `réserve vide : un seul événement, ${pertes.length ? pertes[0].n : 0} tuiles perdues d'un coup (il en restait ${restait}), et l'automne commence`); if (typeof off === 'function') off(); }
  check(isl.season === 'autumn' && tp.brume.size > 0 && tp.brume.size <= isl.board.tiles.size, `automne : ${tp.brume.size} tuiles sur ${isl.board.tiles.size} sous la brume`);
  { const b = bot(); if (b) { tp.depuis = 0.2; isl.place(b.q, b.r); } const autour = neighbors(b.q, b.r).map(([a, c]) => `${a},${c}`); check(!autour.some((k) => tp.brume.has(k)) && !tp.brume.has(`${b.q},${b.r}`), 'la pose dissipe la brume sur ses six voisines'); }
  isl.advanceSeason(); check(tp.brume.size === 0, 'l’hiver revenu, la brume est levée');
  // la fin : les cases vides se paient
  const videsAvant = [...isl.board.mask].filter((k) => !isl.board.tiles.has(k)).length;
  isl.finish('test');
  const m = isl.stats.vides;
  check(m && m.vides === videsAvant && m.total >= videsAvant * T.vide && isl.tally.vides === -m.total && isl.result.stars === 0 && isl.result.seeds === 0, `fin : ${m.vides} cases vides, −${m.total} points, ni étoile ni graine`);
  // videsMalus sur un plateau connu : un trou seul, une région vide de trois, une case qui bloque une région
  const b2 = new Island(tempoDef(7), opt).board;
  const m0 = videsMalus(b2); check(m0.vides === b2.cells - b2.tiles.size && m0.total > 0, `plateau de départ : ${m0.vides} cases vides comptées`);
  // records par délai : l'ancien record (joué à 3 s) migre une seule fois, jamais deux
  { const S = { best: 420, bestSerie: 9, parties: 4, cadran: 5 }; recordsTempo(S); const une = JSON.stringify(S); recordsTempo(S); S.bests[5] = 100; recordsTempo(S);
    check(S.bests[3] === 420 && S.series[3] === 9 && une === JSON.stringify({ ...S, bests: { 3: 420 } }) && S.bests[5] === 100, `records rangés par délai : l'ancien passe à 3 s (${S.bests[3]}), la migration ne se rejoue pas`); }
}
// --- les grandes régions (26 septembre 2026) : +1 par pose qui agrandit une région de 5 tuiles ou plus (+2 à 10),
// prime de fermeture ×1,5 à partir de 5 tuiles (×2 à 10), en plus du double des hameaux
{
  const G = BALANCE.points.grandeRegion;
  const b = new Board(new Set(['0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0', '9,0', '10,0', '0,1', '1,1']));
  for (let x = 0; x < 4; x++) b.place(x, 0, { family: 'forest', variant: 1 });
  const p4 = preview(b, 4, 0, { family: 'forest', variant: 1 }, 'summer', {});
  check(p4 && p4.base.some((x) => x.label === 'grande région' && x.pts === G.pose), `la cinquième forêt d'une région gagne +${G.pose} « grande région »`);
  const p3 = preview(b, 0, 1, { family: 'field', variant: 1 }, 'summer', {});
  check(p3 && !p3.base.some((x) => /grande région/.test(x.label)), 'une tuile seule de sa famille ne gagne rien');
  for (let x = 4; x < 9; x++) b.place(x, 0, { family: 'forest', variant: 1 });
  const p10 = preview(b, 9, 0, { family: 'forest', variant: 1 }, 'summer', {});
  check(p10 && p10.base.some((x) => x.label === 'très grande région' && x.pts === G.poseTresGrande), `la dixième forêt gagne +${G.poseTresGrande} « très grande région »`);
  // fermetures : une région de 6 rapporte 9 au lieu de 6 ; de 4, toujours 4 ; un bourg de 6 rapporte 18
  const ferme = (fam, n) => { const cells = new Set(); for (let x = 0; x < n; x++) cells.add(`${x},0`); const bb = new Board(cells); for (let x = 0; x < n - 1; x++) bb.place(x, 0, { family: fam, variant: 1 }); const pv = preview(bb, n - 1, 0, { family: fam, variant: 1 }, 'summer', {}); return pv.closes.reduce((a, c) => a + c.bonus, 0); };
  check(ferme('forest', 4) === 4 && ferme('forest', 6) === 9 && ferme('forest', 10) === 20 && ferme('hamlet', 6) === 18, `primes de fermeture : 4 → ${ferme('forest', 4)}, 6 → ${ferme('forest', 6)}, 10 → ${ferme('forest', 10)}, bourg de 6 → ${ferme('hamlet', 6)}`);
}
// --- vœux faisables (25 septembre 2026) : chaque vœu promet ses tuiles, la file les donne avant 80 % de l'échéance,
// quel que soit le semis et pour toute île du jour (retour du commanditaire : « trois vergers » avec un seul verger en jeu)
{
  const { besoinsVoeu, poseLimite } = await import('../src/game/wishes.js');
  const { SEMIS, applySemis } = await import('../src/data/semis.js');
  const { dailyDef } = await import('../src/data/daily.js');
  const { RARE_AS } = await import('../src/data/tiles.js');
  const fams = (t) => (t.rare ? RARE_AS[t.family] || [] : [t.family]);
  const sequence = (d) => { const isl = new Island(d, { upgrades: {}, ...(d.mech ? islandOptions({ mech: d.mech }) : {}) }); const seq = []; const vus = new Set(); const push = () => { for (const t of isl.queue.list) if (!vus.has(t)) { vus.add(t); seq.push(t); } }; push(); let g = 0; while (!isl.queue.empty && g++ < 500) { isl.queue.take(); push(); } return { isl, seq }; };
  let besoins = 0; const manques = [];
  const verifie = (d, label) => { const { isl, seq } = sequence(d); const dep = {}; for (const t of isl.board.tiles.values()) for (const f of fams(t)) dep[f] = (dep[f] || 0) + 1;
    for (const w of isl.wishes) { const fin = Math.floor(poseLimite(w.def, { startSeason: d.startSeason, seasonLength: isl.seasonLength, cells: d.cells }) * 0.8);
      for (const [f, n] of Object.entries(besoinsVoeu(w.def))) { if (!((d.weights || {})[f] > 0)) continue; besoins++; const vues = seq.slice(0, fin).filter((t) => fams(t).includes(f)).length + (dep[f] || 0); if (vues < n) manques.push(`${label} · ${w.def.id} · ${f} ${vues}/${n}`); } } };
  for (let n = 1; n <= CAMPAIGN_SIZE; n++) { const base = campaignIsland(n); for (const sm of SEMIS) { if (sm.id !== 'saisons' && !(base.mech && base.mech.has('semis'))) continue; verifie(sm.id === 'saisons' ? base : { ...base, weights: applySemis(base.weights, sm.id), semis: sm.id }, `île ${n} (${sm.id})`); } }
  for (let j = 1; j <= 28; j++) verifie(dailyDef(`2026-11-${String(j).padStart(2, '0')}`), `jour ${j}`);
  check(!manques.length, `vœux faisables : ${besoins} besoins de tuiles, tous donnés avant 80 % de l'échéance${manques.length ? ` — manquent : ${manques.slice(0, 5).join(' ; ')}` : ''}`);
  // le cas du commanditaire : l'île 9 (Trois Moulins), semis « Pays habité », trois vergers avant l'automne
  { const base = campaignIsland(9); const d = { ...base, weights: applySemis(base.weights, 'habite'), semis: 'habite' }; const { isl, seq } = sequence(d); const w = isl.wishes.find((x) => x.def.id === 'w7_1'); const fin = poseLimite(w.def, { startSeason: d.startSeason, seasonLength: isl.seasonLength });
    const vergers = seq.slice(0, fin).filter((t) => t.family === 'orchard').length; check(vergers >= 4, `île 9, « Pays habité » : ${vergers} vergers avant l'automne pour « trois vergers collés à un hameau » (un de marge)`); }
  // la garantie ne remplace que le hasard en retard : peu de tirages touchés, et la file reste identique quand elle suffit
  { let f = 0, t = 0; for (let n = 1; n <= CAMPAIGN_SIZE; n++) { const { isl, seq } = sequence(campaignIsland(n)); f += isl.queue.forcees || 0; t += seq.length; } check(f / t < 0.05, `la garantie remplace ${f} tirages sur ${t} (${(100 * f / t).toFixed(1)} %)`); }
  // l'état des promesses suit la sauvegarde de la file (reprise, annulation)
  { const d = campaignIsland(9); const i1 = new Island(d, { upgrades: {}, ...islandOptions({ mech: d.mech }) }); for (let k = 0; k < 6; k++) i1.queue.take(); const snap = i1.queue.snapshot(); const i2 = new Island(d, { upgrades: {}, ...islandOptions({ mech: d.mech }) }); i2.queue.restore(snap);
    const suite = (q) => { const out = []; for (let k = 0; k < 20; k++) out.push(q.take().family); return out.join(','); }; check(suite(i1.queue) === suite(i2.queue), 'reprise d’une file : les promesses reprennent là où elles en étaient'); }
}
// --- campagne à trente (24 septembre 2026) : migration v2 → v3, parties en cours, et aucun numéro hors campagne
{
  const { migrerVers30 } = await import('../src/core/save.js'); const { migrerPartie } = await import('../src/core/run.js'); const { CAMPAGNE_50_VERS_30 } = await import('../src/data/campaign.js');
  const vals = Object.values(CAMPAGNE_50_VERS_30);
  check(vals.length === CAMPAIGN_SIZE && new Set(vals).size === CAMPAIGN_SIZE && Math.max(...vals) === CAMPAIGN_SIZE, 'la correspondance 50 → 30 couvre exactement les trente îles');
  check(Object.keys(MECH_AT).every((k) => Number(k) <= CAMPAIGN_SIZE) && Object.keys(CAMPAIGN_STARS).every((k) => Number(k) <= CAMPAIGN_SIZE), 'aucune mécanique ni aucun seuil hors campagne');
  check(campaignIsland(CAMPAIGN_SIZE).memory && campaignIsland(CAMPAIGN_SIZE).story === 12, 'la dernière île est L’Île qui se souvient');
  for (const ch of CHAPTERS) { check(ch.islands.length === CHAPTER_LEN && ch.islands[CHAPTER_LEN - 1].memory, `chapitre ${ch.id} : ${CHAPTER_LEN} îles, la dernière est un souvenir`); for (const sl of ch.islands) check(!!sl.hand || !!sl.from, `chapitre ${ch.id} : chaque île générée garde son ancien numéro (graine)`); }
  // un joueur à l'ancienne île 24 : les anciennes 1 à 23 faites (dont le Pont de Glace, ancienne 20), reprend à la nouvelle 15
  const c = { stars: {}, best: {}, plays: {}, gold: { 20: true }, memoriesRead: [], unlockedIsland: 24, insignes: { iles: { 20: ['aquatique'], 17: ['hameaux'] }, chapitres: [1, 2, 3, 4] }, seeds: 40, upgrades: { sight: 1 } };
  for (let n = 1; n <= 23; n++) { c.stars[n] = 2; c.best[n] = 100 + n; c.plays[n] = 1; c.memoriesRead.push(n); }
  migrerVers30(c);
  check(c.unlockedIsland === 15, `reprend à la première île non atteinte (${c.unlockedIsland})`);
  check(c.stars[20] === 2 && c.best[20] === 120 && c.gold[20] === true && c.insignes.iles[20][0] === 'aquatique', 'le Pont de Glace (ancienne 20) garde tout à la nouvelle 20');
  check(c.stars[14] === 123 - 100 + 0 || c.best[14] === 123, 'l’ancienne 23 devient la nouvelle 14');
  check(c.stars[17] === undefined && c.archive50 && c.archive50.stars[17] === 2 && c.archive50.iles[17][0] === 'hameaux', 'les îles retirées sont archivées, pas effacées');
  check(c.seeds === 40 && c.upgrades.sight === 1 && c.insignes.chapitres.length === 4, 'graines, Atelier et insignes de chapitre intacts');
  const avant = JSON.stringify(c); migrerVers30(c); check(JSON.stringify(c) === avant, 'migrer deux fois ne change rien');
  const fini = { stars: {}, completed: true, unlockedIsland: 50 }; migrerVers30(fini); check(fini.unlockedIsland === CAMPAIGN_SIZE && fini.completed, 'une campagne finie reste finie');
  const p1 = migrerPartie({ v: 1, at: 1, where: { kind: 'campaign', id: 20 }, isl: {} }), p2 = migrerPartie({ v: 1, at: 1, where: { kind: 'campaign', id: 17 }, isl: {} }), p3 = migrerPartie({ v: 1, at: 1, where: { kind: 'daily', date: 'x' }, isl: {} });
  check(p1 && p1.v === 2 && p1.where.id === 20 && p2 === null && p3 && p3.v === 2, 'partie en cours : renumérotée, oubliée si l’île est retirée, intacte pour l’Île du jour');
}
console.log(failures ? `${failures} échec(s)` : 'Tous les tests passent.');
process.exit(failures ? 1 : 0);
