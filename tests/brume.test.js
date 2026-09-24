// Tests du mode « Sous la brume » : génération, indices, solveur, dévoilement, jalons, déplacement, fin, reprise.
// Usage : node tests/brume.test.js
import { Island } from '../src/game/island.js';
import { Board } from '../src/game/board.js';
import { brumeDef, CRANS, P, possibles, inventaire, indice, compte } from '../src/game/brume.js';
import { key, parse, neighbors } from '../src/game/hex.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { failures++; console.error('ÉCHEC :', msg); } };
const fogKeys = (isl) => [...isl.board.fog].sort();

// Joueur glouton déterministe : la meilleure case pour la meilleure tuile de la main.
function joue(isl, k = Infinity) {
  let n = 0;
  while (n < k && !isl.ended) {
    let best = null;
    isl.queue.list.forEach((t, i) => { for (const c of isl.board.legalCells()) { const p = isl.preview(c.q, c.r, t); if (p && (!best || p.total > best.v)) best = { i, c, v: p.total }; } });
    if (!best) { isl.checkEnd(); break; }
    if (best.i) isl.pick(best.i);
    isl.place(best.c.q, best.c.r); n++;
  }
}

// --- génération : la brume respecte ses règles, dans les deux crans et sur plusieurs graines
for (const cran of ['claire', 'epaisse']) {
  for (let seed = 1; seed <= 6; seed++) {
    const isl = new Island(brumeDef(cran, seed)); const b = isl.board; const C = CRANS[cran];
    const fog = fogKeys(isl);
    check(fog.length >= 5 && fog.length <= 24 && fog.length >= Math.floor(b.mask.size * 0.2), `${cran} ${seed} : un quart au moins des cases sous la brume (${fog.length} sur ${b.mask.size})`);
    check(fog.every((k) => !neighbors(...parse(k)).some(([a, d]) => b.fog.has(key(a, d)))), `${cran} ${seed} : deux cases cachées ne se touchent jamais`);
    // la brume compte comme une voisine pour poser : une case libre qui ne touche que la brume est posable
    check(b.legalCells().some((c) => !neighbors(c.q, c.r).some(([a, d]) => b.tiles.has(key(a, d)))), `${cran} ${seed} : on pose aussi contre la brume`);
    check(fog.every((k) => !b.tiles.has(k)), `${cran} ${seed} : aucune tuile visible sous la brume`);
    check(fog.every((k) => neighbors(...parse(k)).filter(([a, c]) => b.mask.has(key(a, c)) && !b.fog.has(key(a, c))).length >= C.devoile), `${cran} ${seed} : chaque case cachée peut se dévoiler`);
    check([...isl.brume.cachees.keys()].sort().join() === fog.join(), `${cran} ${seed} : une tuile cachée par case`);
    check([...isl.brume.cachees.values()].filter((t) => t.tresor).length === 1, `${cran} ${seed} : un trésor et un seul`);
    check(b.legalCells().every((c) => !b.fog.has(key(c.q, c.r))), `${cran} ${seed} : on ne pose pas sur la brume`);
    check(!isl.buildOn && !isl.fuseOn && !isl.growOn && isl.handOn && !isl.surpriseOn, `${cran} ${seed} : options du mode`);
    check(isl.seasonLength === 5, `${cran} ${seed} : cinq poses par saison`);
    const libres = [...b.mask].filter((k) => !b.tiles.has(k) && !b.fog.has(k)).length;
    check(isl.queue.remaining === libres, `${cran} ${seed} : une tuile par case libre (${isl.queue.remaining} / ${libres})`);
    // même graine, même île
    check(fogKeys(new Island(brumeDef(cran, seed))).join() === fog.join(), `${cran} ${seed} : la brume est déterministe`);
  }
}

// --- inventaire : exact en Brume claire, par couleur en Brume épaisse
{
  const c = new Island(brumeDef('claire', 2)); const inv = c.inventaireBrume;
  check(inv.reduce((s, e) => s + e.n, 0) === c.board.fog.size, 'claire : l’inventaire compte toutes les cases cachées');
  check(inv.some((e) => [...c.brume.cachees.values()].find((t) => t.tresor).family === e.id), 'claire : le trésor figure dans l’inventaire sous son nom');
  const e = new Island(brumeDef('epaisse', 2));
  check(e.inventaireBrume.every((x) => ['vert', 'bleu', 'ocre', 'gris', 'tresor'].includes(x.id)), 'épaisse : l’inventaire ne donne que des couleurs');
}

// --- la brume coupe les régions et les bords
{
  const b = new Board(['0,0', '1,0', '2,0']);
  b.place(0, 0, { family: 'forest' }); b.place(2, 0, { family: 'forest' }); b.fog.add('1,0');
  check(!b.isEmpty(1, 0) && !b.canPlace(1, 0), 'une case cachée n’est ni vide ni jouable');
  check(!b.isRegionClosed(b.region(0, 0, 'forest')), 'une région qui touche la brume reste ouverte');
  check(b.region(0, 0, 'forest').size === 1, 'la brume coupe la région');
  const s = b.snapshot(); const b2 = new Board([]); b2.restore(s);
  check(b2.fog.has('1,0'), 'la brume passe par l’instantané');
}

// --- l'indice : les voisines cachées de la famille de la tuile posée (une rare compte pour ses familles)
{
  const b = new Board(['0,0', '1,0', '0,1', '-1,1']);
  b.fog = new Set(['1,0', '0,1', '-1,1']);
  const cachees = new Map([['1,0', { family: 'forest' }], ['0,1', { family: 'forest' }], ['-1,1', { family: 'mill' }]]);
  check(indice(b, cachees, 0, 0, { family: 'forest' }) === 2, 'une forêt compte deux forêts');
  check(indice(b, cachees, 0, 0, { family: 'field' }) === 1, 'un champ compte le moulin (champ et hameau)');
  check(indice(b, cachees, 0, 0, { family: 'water' }) === 0, 'une eau ne compte rien');
  check(compte('mill', ['hamlet']) && !compte('mill', ['rock']), 'le moulin compte pour le hameau, pas pour la roche');
}

// --- le solveur : ce qui se déduit, ce qui reste un pari
{
  const cr = CRANS.claire;
  const inv = [{ id: 'forest', n: 1 }, { id: 'water', n: 1 }];
  const pos = possibles(['a', 'b'], inv, [{ voisines: ['a'], fams: ['forest'], n: 1 }], cr);
  check(pos.get('a').size === 1 && pos.get('a').has('forest') && pos.get('b').size === 1 && pos.get('b').has('water'), 'un indice et l’inventaire suffisent à tout déduire');
  const pari = possibles(['a', 'b'], inv, [{ voisines: ['a', 'b'], fams: ['forest'], n: 1 }], cr);
  check(pari.get('a').size === 2 && pari.get('b').size === 2, 'deux cases qui partagent le même indice : un pari');
  // Brume épaisse : une couleur, deux familles possibles
  const ep = possibles(['a'], [{ id: 'bleu', n: 1 }], [], CRANS.epaisse);
  check(ep.get('a').has('water') && ep.get('a').has('marsh') && !ep.get('a').has('forest'), 'épaisse : une bleue est une eau ou un marais');
  // le hasard dosé : la part déductible est notée, et la Brume claire en garde plus que l'épaisse
  let dc = 0, de = 0;
  for (let s = 1; s <= 6; s++) { dc += new Island(brumeDef('claire', s)).brume.deduc; de += new Island(brumeDef('epaisse', s)).brume.deduc; }
  console.log(`  part déductible moyenne : claire ${(dc / 6).toFixed(2)}, épaisse ${(de / 6).toFixed(2)}`);
  check(dc / 6 > 0.2 && dc / 6 < 0.6, 'claire : entre 20 et 60 % déductible (un tiers de brume : le pari fait partie du jeu)');
  check(de < dc, 'épaisse : moins déductible que claire');
}

// --- indices à la pose : toujours en claire, une pose sur deux en épaisse
for (const cran of ['claire', 'epaisse']) {
  const isl = new Island(brumeDef(cran, 4));
  const poses = [];
  isl.on((e) => { if (e.type === 'place' && isl.fogAround(e.q, e.r).length) poses.push(isl.board.get(e.q, e.r)); });
  joue(isl, 25);
  const parlantes = poses.filter((t) => typeof t.indice === 'number').length;
  if (cran === 'claire') check(poses.length > 0 && parlantes === poses.length, `claire : chaque pose contre la brume a son indice (${parlantes}/${poses.length})`);
  else check(poses.length > 1 && parlantes === Math.ceil(poses.length / 2), `épaisse : une pose sur deux parle (${parlantes}/${poses.length})`);
  for (const t of poses.filter((x) => typeof x.indice === 'number')) check(t.indice <= 6, 'un indice reste un nombre de voisines');
}

// --- dévoilement au passage de saison, bords ×2, jalon juste ×3 et +5, trésor
{
  const isl = new Island(brumeDef('claire', 3));
  const reveal = [];
  isl.on((e) => { if (e.type === 'brume' && e.kind === 'reveal') reveal.push(e); });
  // un jalon juste sur la première case cachée (on triche pour le test : on lit la tuile cachée)
  const k0 = fogKeys(isl)[0]; const fam0 = isl.brume.cachees.get(k0).family;
  check(isl.planterJalon(...parse(k0), fam0), 'on plante un jalon');
  check(!isl.canJalon(...parse(fogKeys(isl)[1])), 'un seul jalon par saison');
  const s0 = isl.score;
  joue(isl);
  check(isl.ended, 'la partie va au bout');
  const toutes = reveal.flatMap((e) => e.cells);
  check(toutes.length === isl.result.brume.devoilees, 'chaque dévoilement est annoncé');
  check(toutes.every((c) => c.tile.devoilee), 'une tuile dévoilée est marquée');
  const j = toutes.find((c) => `${c.q},${c.r}` === k0);
  if (j) { check(j.juste === true && j.tile.jalon && j.extra >= P.jalonJuste, 'jalon juste : +5 et marque ×3'); }
  const t = toutes.find((c) => c.tresor);
  if (t) check(t.extra >= P.tresor && isl.result.brume.tresor === t.tile.family, 'le trésor dévoilé rapporte sa prime');
  // un bord contre une tuile dévoilée compte double
  const dev = [...isl.board.tiles.values()].find((x) => x.devoilee && !x.jalon && !x.blighted);
  check(!!dev, 'au moins une tuile dévoilée sur le plateau');
  check(isl.score > s0, 'le score avance');
}
{
  // bords ×2 et ×3, mesurés directement
  const isl = new Island(brumeDef('claire', 1));
  const b = new Board(['0,0', '1,0']); b.place(1, 0, { family: 'forest', devoilee: true });
  const { preview } = await import('../src/game/rules.js');
  const b1 = new Board(['0,0', '1,0']); b1.place(1, 0, { family: 'forest' });
  const simple = preview(b1, 0, 0, { family: 'forest' }, 'spring');
  const double = preview(b, 0, 0, { family: 'forest' }, 'spring');
  const b3 = new Board(['0,0', '1,0']); b3.place(1, 0, { family: 'forest', devoilee: true, jalon: true });
  const triple = preview(b3, 0, 0, { family: 'forest' }, 'spring');
  check(double.edges[0].pts === 2 * simple.edges[0].pts, `bord contre une dévoilée ×2 (${double.edges[0].pts})`);
  check(triple.edges[0].pts === 3 * simple.edges[0].pts, `bord contre un jalon juste ×3 (${triple.edges[0].pts})`);
  const bm = new Board(['0,0', '1,0']); bm.place(1, 0, { family: 'rock', devoilee: true });
  const mauvais = preview(bm, 0, 0, { family: 'field' }, 'spring');
  check(mauvais.edges[0].pts === -2, 'une mauvaise paire contre une dévoilée coûte double');
  check(isl.brume.cran.id === 'claire', 'cran par défaut');
}

// --- jalon faux, jalon manqué en Brume épaisse
{
  const isl = new Island(brumeDef('claire', 5));
  const k0 = fogKeys(isl)[0]; const vraie = isl.brume.cachees.get(k0).family;
  isl.planterJalon(...parse(k0), vraie === 'sand' ? 'rock' : 'sand');
  const ev = []; isl.on((e) => { if (e.type === 'brume' && e.kind === 'reveal') ev.push(...e.cells); });
  joue(isl);
  const c = ev.find((x) => `${x.q},${x.r}` === k0);
  if (c) check(c.juste === false && !c.tile.jalon, 'jalon faux : pas de ×3');
  check(isl.result.brume.fausses >= 1 || !c, 'le jalon faux est compté');
}
{
  const isl = new Island(brumeDef('epaisse', 5));
  let manques = 0; isl.on((e) => { if (e.type === 'brume' && e.kind === 'jalonManque') manques++; });
  joue(isl, 5);
  check(manques === 1 && isl.tally.brume <= P.jalonManque, 'épaisse : une saison sans jalon coûte −3');
  const c = new Island(brumeDef('claire', 5)); let m2 = 0; c.on((e) => { if (e.type === 'brume' && e.kind === 'jalonManque') m2++; });
  joue(c, 5); check(m2 === 0, 'claire : le jalon est facultatif');
}

// --- le crayon ne change rien au score
{
  const isl = new Island(brumeDef('claire', 6)); const k = fogKeys(isl)[0];
  const s = isl.score; check(isl.noter(...parse(k), 'forest') && isl.brume.crayon.get(k) === 'forest' && isl.score === s, 'le crayon note, sans effet');
  check(!isl.noter(0, 0, 'forest'), 'on ne note qu’une case cachée'); isl.noter(...parse(k), null); check(!isl.brume.crayon.has(k), 'le crayon s’efface');
}

// --- déplacement : coûte la prochaine tuile ; une tuile engagée contre la brume ne bouge pas ; nouvel indice
{
  // avec un tiers de brume, il faut quelques poses avant qu'une tuile ne touche plus la brume : on joue jusqu'à en trouver une
  let isl = null, libre = null;
  for (let seed = 2; seed <= 8 && !libre; seed++) { isl = new Island(brumeDef('claire', seed)); for (let n = 0; n < 4 && !libre; n++) { joue(isl, 3); libre = [...isl.board.tiles.values()].find((t) => !t.start && !isl.fogAround(t.q, t.r).length); } }
  const engagee = [...isl.board.tiles.values()].find((t) => !t.start && isl.fogAround(t.q, t.r).length);
  if (engagee) check(!isl.canMove(engagee.q, engagee.r), 'une tuile engagée contre la brume ne bouge pas');
  check(!isl.canMove(0, 0), 'une tuile de départ ne bouge pas');
  if (libre) {
    const cibles = isl.moveTargets(libre.q, libre.r);
    const contre = cibles.find((c) => isl.fogAround(c.q, c.r).length) || cibles[0];
    const reste = isl.queue.remaining, poses = isl.placements, fam = libre.family;
    const res = isl.move(libre.q, libre.r, contre.q, contre.r);
    check(!!res, 'le déplacement a lieu');
    check(!isl.board.get(libre.q, libre.r), 'la case d’origine est libérée');
    check(isl.board.get(contre.q, contre.r).family === fam, 'la tuile est à sa nouvelle place');
    check(isl.queue.remaining === reste - 1 && isl.placements === poses + 1, 'la prochaine tuile est perdue, le déplacement compte comme une pose');
    if (isl.fogAround(contre.q, contre.r).length) check(typeof isl.board.get(contre.q, contre.r).indice === 'number', 'une tuile déplacée contre la brume lit un nouvel indice');
  } else check(false, 'une tuile déplaçable pour le test');
}

// --- fin : dernier dévoilement puis −3 par case restée cachée ; ni étoiles ni graines ; pas de souvenir
{
  const isl = new Island(brumeDef('claire', 1));
  check(!isl.canUndo(), 'pas de souvenir sous la brume');
  isl.finish('queue');
  const r = isl.result.brume;
  check(r.penalite === r.restantes.length * P.cachee, 'chaque case restée cachée coûte −3');
  check(r.restantes.length + r.devoilees === r.depart, 'dévoilées et restantes font le compte');
  check(isl.result.stars === 0 && isl.result.seeds === 0 && !isl.result.gold, 'ni étoiles ni graines');
}

// --- reprise : la partie reprise est identique, jalons, crayon et tuiles cachées compris
{
  const a = new Island(brumeDef('epaisse', 3)); joue(a, 7);
  const k = fogKeys(a); if (a.canJalon(...parse(k[0]))) a.planterJalon(...parse(k[0]), 'forest'); a.noter(...parse(k[k.length - 1]), 'water');
  const s = JSON.parse(JSON.stringify(a.serialize()));
  const b = new Island(brumeDef('epaisse', 3)); check(b.restoreRun(s), 'la reprise est acceptée');
  check(JSON.stringify(b.serialize()) === JSON.stringify(a.serialize()), 'la partie reprise est identique');
  joue(a); joue(b);
  check(a.result.score === b.result.score, `les deux parties finissent pareil (${a.result.score} / ${b.result.score})`);
}

// --- hors du mode, rien ne change
{
  const { campaignIsland } = await import('../src/data/campaign.js');
  const isl = new Island(campaignIsland(5));
  check(isl.brume === null && isl.board.fog.size === 0 && isl.tally.brume === undefined, 'hors du mode : ni brume ni ligne de bilan');
}

console.log(failures ? `\n${failures} échec(s)` : '\nSous la brume : tout est bon.');
process.exit(failures ? 1 : 0);
