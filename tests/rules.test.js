// Tests Node du modèle de jeu (sans DOM) : règles, saisons, faune, vœux, bot glouton sur toutes les îles.
// Usage : node tests/rules.test.js
import { Island } from '../src/game/island.js';
import { ISLANDS, INFINITE, GARDEN } from '../src/data/islands.js';
import { Board } from '../src/game/board.js';
import { neighbors } from '../src/game/hex.js';
import { affinity } from '../src/data/tiles.js';
import { preview, previewBuild, canBuild, canFuse, previewFuse, apply, closedRegionsAround, countClosedRegions } from '../src/game/rules.js';
import { STORY } from '../src/data/story.js';
import { progressOf } from '../src/game/wishes.js';
import { BALANCE } from '../src/data/balance.js';
import { playStrong } from './bot.js';
import { campaignIsland, CAMPAIGN_SIZE, CAMPAIGN_WISHES, islandOptions, gateStars, chapterStars, unlockedUpTo, CHAPTER_GATE, CHAPTER_PATIENCE, islandDone, chapterPlays, gateOpen, gateText, islandCells, islandThresholds, restarFromBest } from '../src/data/campaign.js';
import { gradeMove } from '../src/game/feedback.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { failures++; console.error('ÉCHEC :', msg); } };

// --- la réserve de vœux ne demande rien d'impossible : chaque recette existe, chaque mécanique requise arrive un jour
// (le vœu du port a visé pendant des semaines une recette retirée, sur dix îles, sans que rien ne casse)
{
  const { FUSION_BY_ID } = await import('../src/data/tiles.js'); const { mechIsland } = await import('../src/data/campaign.js');
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
  check(!canFuse(b, 0, 0, { family: 'water', variant: 1 }), 'eau sur hameau : plus de recette (le port attend le Livre II)');
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
  const { UPGRADES, playerChapter } = await import('../src/data/upgrades.js'); const { mechIsland } = await import('../src/data/campaign.js');
  let prevCh = 0;
  for (const u of UPGRADES) { check(u.chapter >= prevCh && u.chapter >= 1 && u.chapter <= 10, `amélioration ${u.id} : chapitre croissant`); prevCh = u.chapter; if (u.requires) { const at = mechIsland(u.requires); check(at !== null && Math.ceil(at / 5) <= u.chapter, `amélioration ${u.id} : sa mécanique (${u.requires}, île ${at}) arrive avant son chapitre ${u.chapter}`); } check(u.levels.length === u.costs.length + 1, `amélioration ${u.id} : niveaux et coûts`); }
  check(playerChapter(1) === 1 && playerChapter(5) === 1 && playerChapter(6) === 2 && playerChapter(50) === 10, 'chapitre du joueur');
  const d = campaignIsland(31);
  const a = new Island(d, { ...islandOptions(d) }), b = new Island(d, { ...islandOptions(d), upgrades: { sight: 2, master: 1, still: 1, cloak: 1 } });
  check(b.queue.visible === a.queue.visible + 2, 'Regard : deux tuiles de plus (la Longue-vue y est fondue)');
  check(b.fusionCost() === 0 && a.fusionCost() === 1, 'Alambic : première fusion offerte');
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
  Save.data.campaign.stars = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 }; Achievements.onCampaignResult({ stars: 3 }, campaignIsland(5)); check(got.includes('chapitre-clos'), 'quinze étoiles sur le chapitre 1');
  check(Achievements.progress(ACHIEVEMENTS.find((a) => a.id === 'cent-cinquante')).value === 15, 'progression des étoiles');
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

// --- main de saison dès l'île 6 : choisir librement la tuile visible ; plus d'échange, de bourgeon ni de poche
{
  const d = campaignIsland(6); const isl = new Island(d, { ...islandOptions(d) });
  const second = isl.queue.list[1]; check(isl.canPick(1) && isl.canSwap === undefined && isl.pick(1) && isl.current === second, 'la deuxième tuile devient la tuile courante, gratuitement');
  const d5 = campaignIsland(5); const i5 = new Island(d5, { ...islandOptions(d5) }); check(!i5.canPick(1), 'pas de main avant l’île 6');
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


// --- friche : une pose négative laisse une tuile morte, sans famille ; bâtir la remet en état
{
  const { apply, preview, previewBuild, canBuild } = await import('../src/game/rules.js');
  const cells = []; for (let q = -2; q <= 3; q++) for (let r = -2; r <= 2; r++) cells.push(`${q},${r}`);
  const b = new Board(cells);
  b.place(0, 0, { family: 'rock', variant: 1 }); b.place(1, -1, { family: 'sand', variant: 1 });
  const pv = preview(b, 1, 0, { family: 'field', variant: 1 }, 'spring');   // champ contre roche (−1) et sable (−1)
  check(pv.total < 0 && pv.blight, `champ contre roche et sable : pose négative, friche annoncée (${pv.total})`);
  apply(b, 1, 0, { family: 'field', variant: 1 }, 'spring');
  const t = b.get(1, 0); check(t.blighted && Board.familiesOf(t).length === 0 && b.regions('field').length === 0, 'la friche ne compte pour aucune famille');
  const pv2 = preview(b, 2, -1, { family: 'field', variant: 1 }, 'spring'); check(!pv2.edges.some((e) => e.q === 1 && e.r === 0), 'un bord contre une friche ne vaut rien');
  check(canBuild(b, 1, 0, { family: 'field', variant: 1 }), 'on peut bâtir sur la friche');
  const pb = previewBuild(b, 1, 0, { family: 'field', variant: 1 }, 'spring'); check(pb.restore && pb.level === 1, 'bâtir sur une friche = remise en état au même niveau');
  const d = campaignIsland(16); const isl = new Island(d, { ...islandOptions(d) }); isl.breaths = 3;
  const rock = [...isl.board.tiles.values()].find((x) => x.family === 'rock');
  const near = isl.board.legalCells().find((c) => neighbors(c.q, c.r).some(([a, bb]) => isl.board.get(a, bb) === rock));
  const res = isl.place(near.q, near.r, { family: 'field', variant: 1, rare: false, id: 999 });
  if (res.blight) { const tf = isl.board.get(near.q, near.r); isl.queue.list.unshift({ family: 'field', variant: 1, rare: false, id: 998 }); check(isl.canBuild(near.q, near.r) && isl.build(near.q, near.r) && !tf.blighted, 'remise en état par l’île : la friche recompte'); }
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
    // déblocage des mécaniques : rien avant son île (main 6, bâtir 16, fusions 21, ouvrages 26, niveau 3 31, surprises 11, vœux 6, collines 12, lande 14, rares 8/13)
    const isl = new Island(d, { ...islandOptions(d) });
    const exp = { buildOn: n >= 16, handOn: n >= 6, fuseOn: n >= 21, level3On: n >= 31, surpriseOn: n >= 11 };
    for (const [k, v] of Object.entries(exp)) check(!!isl[k] === v, `île ${n} : ${k} devrait valoir ${v}`);
    check((isl.wishes.length > 0) === (n >= 6) || (n >= 6 && isl.wishes.length === 0 && d.story === 1), `île ${n} : vœux ${n >= 6 ? 'attendus' : 'interdits'} (${isl.wishes.length})`);
    check((n >= 12 || !d.weights.hill) && (n >= 14 || !d.weights.heath), `île ${n} : pas de colline avant 12 ni de lande avant 14`);
    check(isl.rareTier === (n >= 13 ? 1 : 0), `île ${n} : grenier dans la réserve de rares seulement dès l’île 13 (${isl.rareTier})`);
    check(isl.breaths === 0 && !isl.queue.list.some((t) => t.rare), `île ${n} : file de départ sans rare, aucun souffle`);
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
  const camp = { stars: { 6: 2, 7: 2, 8: 1 }, contracts: { 2: { id: 'wishes', progress: { 6: 9 }, done: true } } };
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
  check(unlockedUpTo(camp({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 })) === 5, `cinq étoiles au chapitre 1 : la porte tient (il en faut ${CHAPTER_GATE})`);
  check(unlockedUpTo(camp({ 1: 1, 2: 2, 3: 1, 4: 1, 5: 1 })) === 6, 'la sixième étoile décrochée en REFAISANT l’île 2 ouvre le chapitre 2');
  check(unlockedUpTo(camp({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 2 })) === 6, 'six étoiles gagnées sur l’île de bout de chapitre : pareil');
  check(unlockedUpTo(camp({ 1: 3, 2: 3, 3: 0, 4: 0, 5: 0 })) === 3, 'six étoiles mais l’île 3 jamais réussie : on s’arrête à l’île 3');
  check(unlockedUpTo(camp({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 }, { 1: { done: true } })) === 5, 'un contrat d’archipel d’une vieille sauvegarde ne vaut plus rien pour la porte');
  const plein = {}; for (let n = 1; n <= CAMPAIGN_SIZE; n++) plein[n] = 3;
  check(unlockedUpTo(camp(plein)) === CAMPAIGN_SIZE, 'campagne parfaite : tout est ouvert jusqu’à la dernière île');
  // la règle ne retire jamais rien : `Math.max` côté jeu, vérifié ici sur le principe
  check(unlockedUpTo(camp({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 3, 7: 3 })) === 5, 'des étoiles au-delà d’une porte fermée n’ouvrent pas la porte');

  // --- plus aucune île ne peut murer : la terminer suffit à ouvrir la suivante
  check(unlockedUpTo({ stars: {}, plays: { 1: 1 } }) === 2, 'une île terminée SANS étoile ouvre la suivante');
  check(islandDone({ plays: { 3: 2 } }, 3) && islandDone({ stars: { 3: 1 } }, 3) && islandDone({ best: { 3: 120 } }, 3), 'terminée : parties comptées, étoile, ou meilleur score (anciennes sauvegardes)');
  check(!islandDone({ stars: { 3: 0 }, best: { 3: 0 } }, 3), 'jamais jouée : pas terminée');
  // le cas du joueur bloqué à l'île 9 : chapitre 1 passé, puis une île qu'il n'arrive pas à étoiler
  const bloque = { stars: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 1, 7: 1, 8: 1 }, contracts: {}, plays: { 9: 1 } };
  check(unlockedUpTo(bloque) === 10, 'île 9 terminée sans étoile : l’île 10 s’ouvre (avant, la campagne s’arrêtait là)');

  // --- la porte de chapitre a une seconde clé : la patience. Elle s'atteint en jouant, donc elle ne peut pas se fermer pour de bon.
  const cinq = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };
  check(chapterPlays({ stars: cinq }, 1) === 5, 'cinq îles terminées : cinq parties comptées');
  check(!gateOpen({ stars: cinq, contracts: {} }, 1), `cinq étoiles et cinq parties : la porte tient (${CHAPTER_GATE} étoiles ou ${CHAPTER_PATIENCE} parties)`);
  check(gateOpen({ stars: cinq, contracts: {}, plays: { 1: 2, 2: 2, 3: 2, 4: 1, 5: 1 } }, 1), 'huit parties terminées dans le chapitre : la porte s’ouvre sans les étoiles');
  check(unlockedUpTo({ stars: cinq, contracts: {}, plays: { 1: 2, 2: 2, 3: 2, 4: 1, 5: 1 } }) === 6, 'et le chapitre 2 devient jouable');
  check(!gateOpen({ stars: {}, contracts: {}, plays: { 1: 9 } }, 1), 'rejouer neuf fois la même île n’ouvre rien : les cinq îles restent à terminer');
  check(gateText({ stars: cinq, contracts: {} }, 1).includes(`5 / ${CHAPTER_GATE}`) && gateText({ stars: cinq, contracts: {} }, 1).includes(`5 / ${CHAPTER_PATIENCE}`), 'le joueur voit les deux comptes');
  check(gateText({ stars: { 1: 3, 2: 3 }, contracts: {} }, 1) === null, 'porte ouverte : plus rien à afficher');
}

// --- l'échelle des étoiles : 45 / 65 / 85 % de la médiane du bot fort, l'or à 100 %
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
    if ([0.45, 0.65, 0.85].every((x, i) => Math.abs(f[i] - f[3] * x) <= 0.1)) bornes++;
    if (islandCells(def) > 0 && islandThresholds(def).length === 4) cases++;
  }
  check(ordre === CAMPAIGN_SIZE, `les quatre seuils montent sur les ${CAMPAIGN_SIZE} îles (${ordre})`);
  check(bornes === CAMPAIGN_SIZE, `et valent 45 / 65 / 85 % de l’étoile d’or (${bornes})`);
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
  for (let n = 36; n <= 49; n++) { const d = campaignIsland(n); check(!!d.signature && d.intro[1].toLowerCase().includes(d.signature.name.toLowerCase().split(' ')[0]) || !!d.signature, `île ${n} : signature « ${d.signature && d.signature.name} »`); }
  check(!campaignIsland(44).weights.rock && !campaignIsland(44).wishes.some((w) => w.type === 'river'), 'Sans une pierre : ni roche ni vœu de rivière');
  check(campaignIsland(49).tilesRatio < 0.8 && campaignIsland(46).seasonLength === campaignIsland(48).seasonLength - 4, 'file courte, saisons brèves et longues');
  // les tuiles de départ de la signature sont posées ; les tuiles en plus ne peuvent être que des lagunes (eau)
  for (let n = 36; n <= 49; n++) { const d = campaignIsland(n); const i2 = new Island(d, { ...islandOptions(d) }); const sk = new Set(d.start.map((t) => `${t.q},${t.r}`)); const extra = [...i2.board.tiles.values()].filter((t) => !sk.has(`${t.q},${t.r}`)); check(d.start.every((t) => !!i2.board.get(t.q, t.r)) && extra.every((t) => t.family === 'water' && t.start), `île ${n} : ${d.start.length} tuiles de départ posées${extra.length ? ` + ${extra.length} lagune(s)` : ''}`); }
  check(STORY.resultsBy.hamlet[3].length > 0 && STORY.memoryVoice.water.length > 0, 'textes de voix par dominante présents');
}
// --- croissance : une tuile bien entourée des siennes monte au niveau 2 toute seule
{
  const def = campaignIsland(41); const isl = new Island(def, { ...islandOptions(def) });
  check(isl.growOn, 'la croissance est ouverte à l’île 41');
  check(!new Island(campaignIsland(30), { ...islandOptions(campaignIsland(30)) }).growOn, 'elle est fermée à l’île 30');
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
  for (const d of [INFINITE, GARDEN, ...[5, 12, 26, 40, 50].map(campaignIsland)]) check(!cerne(new Island(d, { ...islandOptions(d) }).board), `île ${d.id} : aucun trou cerné au départ`);
  // l'Île infinie s'agrandit sans jamais laisser de trou derrière elle
  const inf = new Island(INFINITE); let n = 0;
  while (!inf.ended && n++ < 120) { const c = inf.board.legalCells()[0]; if (!c) break; inf.place(c.q, c.r); }
  check(!cerne(inf.board), `Île infinie : aucun trou cerné après ${n} poses (${inf.board.cells} cases)`);
}
console.log(failures ? `${failures} échec(s)` : 'Tous les tests passent.');
process.exit(failures ? 1 : 0);
