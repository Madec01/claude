// Tests du mode « Sous la brume » : génération, indices, solveur, dévoilement, jalons, déplacement, fin, reprise.
// Usage : node tests/brume.test.js
import { Island } from '../src/game/island.js';
import { Board } from '../src/game/board.js';
import { brumeDef, CRANS, P, pts, possibles, inventaire, indice, compte, indiceActuel, porteeCachee, CARTES, CARTE_PAR_ID, TIRAGE, tirerCarte, COULEURS } from '../src/game/brume.js';
import { RNG } from '../src/core/math.js';
import { ENIGMES, brumeEnigme } from '../src/data/brume_enigmes.js';
import { key, parse, neighbors } from '../src/game/hex.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { failures++; console.error('ÉCHEC :', msg); } };
const fogKeys = (isl) => [...isl.board.fog].sort();

// Joueur glouton déterministe : la meilleure case pour la meilleure tuile de la main. Quand le passage est prêt
// (dernière pose de la saison), il lève la brume — ce que le bouton du HUD fait pour le joueur.
function joue(isl, k = Infinity) {
  let n = 0;
  while (n < k && !isl.ended) {
    if (isl.passagePret) { isl.leverBrume(); continue; }
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

// --- l'indice : les voisines cachées de la famille de la tuile posée ; le trésor ne compte pour aucun indice (B-M, décision 9)
{
  const b = new Board(['0,0', '1,0', '0,1', '-1,1']);
  b.fog = new Set(['1,0', '0,1', '-1,1']);
  const cachees = new Map([['1,0', { family: 'forest' }], ['0,1', { family: 'forest' }], ['-1,1', { family: 'mill', tresor: true, rare: true }]]);
  check(indice(b, cachees, 0, 0, { family: 'forest' }) === 2, 'une forêt compte deux forêts');
  check(indice(b, cachees, 0, 0, { family: 'field' }) === 0, 'un moulin caché ne change pas l’indice d’un champ');
  check(indice(b, cachees, 0, 0, { family: 'hamlet' }) === 0, 'ni celui d’un hameau');
  check(indice(b, cachees, 0, 0, { family: 'water' }) === 0, 'une eau ne compte rien');
  check(!compte('mill', ['hamlet']) && !compte('mill', ['field']) && !compte('well', ['meadow']) && compte('forest', ['forest']), 'aucun trésor ne compte, une forêt compte pour une forêt');
  // le solveur suit la même règle : le moulin ne répond pas à un champ
  const pos = possibles(['a', 'b'], [{ id: 'field', n: 1 }, { id: 'mill', n: 1 }], [{ voisines: ['a'], fams: ['field'], n: 0 }], CRANS.claire);
  check(pos.get('a').size === 1 && pos.get('a').has('mill') && pos.get('b').has('field'), 'solveur : un zéro au champ désigne le moulin');
}

// --- B-A.1 : un indice ne ment jamais. Le chiffre montré compte les cases de sa portée ENCORE cachées.
{
  // le cas de l'audit : une forêt lit « 1 » entre une forêt et une eau cachées ; la forêt se dévoile, le chiffre doit dire 0
  const b = new Board(['0,0', '1,0', '0,1', '-1,1']); b.fog = new Set(['1,0', '0,1']);
  const cachees = new Map([['1,0', { family: 'forest' }], ['0,1', { family: 'water' }]]);
  const t = { family: 'forest', q: 0, r: 0, indice: indice(b, cachees, 0, 0, { family: 'forest' }), portee: ['1,0', '0,1'] };
  check(t.indice === 1 && indiceActuel(b, cachees, t) === 1, 'lu 1');
  b.fog.delete('1,0'); cachees.delete('1,0');
  check(indiceActuel(b, cachees, t) === 0 && porteeCachee(b, t).join() === '0,1', 'forêt dévoilée : le chiffre dit 0, la portée cachée est l’eau');
  b.fog.delete('0,1'); cachees.delete('0,1');
  check(porteeCachee(b, t).length === 0, 'toute la portée dévoilée : plus de pastille');
  // « La brume gagne » à côté (une case neuve, jamais une case dévoilée) : elle n'entre pas dans la portée, le vieil indice ne revient pas
  b.fog.add('-1,1'); cachees.set('-1,1', { family: 'forest' });
  check(porteeCachee(b, t).length === 0 && indiceActuel(b, cachees, t) === 0, 'une case gagnée par la brume ne ressuscite pas un vieil indice');
  check(indiceActuel(b, cachees, { family: 'forest', q: 0, r: 0, muette: true }) === null, 'une tuile muette n’a pas de chiffre');
  // une vieille sauvegarde sans portée : ses voisines cachées d'aujourd'hui
  check(porteeCachee(b, { family: 'forest', q: 0, r: 0, indice: 0 }).join() === '-1,1', 'sans portée gardée, la portée est celle d’aujourd’hui');
}
// trente parties jouées : après chaque pose, dévoilement, Longue-vue, vent et « La brume gagne », chaque pastille affichée
// égale le compte réel sur sa portée (recompté ici, à la main), et la portée lue à la pose est exactement ses voisines cachées
{
  let verifs = 0, tuiles = 0;
  const reel = (isl, t) => { const fams = Board.familiesOf(t); return t.portee.filter((k) => isl.board.fog.has(k) && compte(isl.brume.cachees.get(k).family, fams)).length; };
  const verifie = (isl, ou) => { for (const t of isl.board.tiles.values()) { if (typeof t.indice !== 'number') continue; verifs++; if (indiceActuel(isl.board, isl.brume.cachees, t) !== reel(isl, t)) { failures++; console.error(`ÉCHEC : pastille fausse ${ou}`); } } };
  for (let seed = 1; seed <= 30; seed++) {
    const isl = new Island(brumeDef(seed % 2 ? 'claire' : 'epaisse', seed));
    isl.on((e) => {
      if (e.type === 'place' && isl.fogAround(e.q, e.r).length) { const t = isl.board.get(e.q, e.r); tuiles++; if (!t.portee || t.portee.slice().sort().join() !== isl.fogAround(e.q, e.r).map(([a, b]) => key(a, b)).sort().join()) { failures++; console.error('ÉCHEC : la portée lue à la pose n’est pas ses voisines cachées'); } if (typeof t.indice === 'number' && indiceActuel(isl.board, isl.brume.cachees, t) !== t.indice) { failures++; console.error('ÉCHEC : à la pose, le chiffre montré diffère de l’indice lu'); } }
      if (e.type === 'place' || (e.type === 'brume' && ['reveal', 'vent', 'brumeGagne', 'move'].includes(e.kind))) verifie(isl, `(graine ${seed}, ${e.type}/${e.kind || ''})`);
    });
    if (seed % 5 === 0) isl.appliquerCarte('longueVue');
    joue(isl, 8);
    if (seed % 5 === 0 && isl.board.fog.size) { isl.longueVue(...parse([...isl.board.fog][0])); verifie(isl, `(graine ${seed}, longue-vue)`); }
    if (seed % 7 === 0) isl.appliquerCarte('ventContraire');
    joue(isl);
  }
  check(verifs > 500 && tuiles > 100, `trente parties : ${verifs} pastilles vérifiées sur ${tuiles} tuiles lues`);
  // la portée passe par la reprise (même en JSON), et une reprise garde le chiffre juste
  const a = new Island(brumeDef('claire', 9)); joue(a, 6);
  const s = JSON.parse(JSON.stringify(a.serialize()));
  check((s.brume.portees || []).length > 0, 'les portées sont dans la sauvegarde');
  const b = new Island(brumeDef('claire', 9)); b.restoreRun(s);
  const lue = [...a.board.tiles.values()].filter((t) => t.portee);
  check(lue.length > 0 && lue.every((t) => { const u = b.board.get(t.q, t.r); return u && u.portee && u.portee.join() === t.portee.join() && indiceActuel(b.board, b.brume.cachees, u) === indiceActuel(a.board, a.brume.cachees, t); }), 'la portée et le chiffre reviennent tels quels à la reprise');
}

// --- B-A.2 : une règle affichée est la règle appliquée
{
  // tout nombre écrit dans un texte de carte vient de P ou de CRANS
  const connus = new Set([...Object.values(P), ...Object.values(CRANS).flatMap((c) => Object.values(c))].filter((v) => typeof v === 'number').map((v) => Math.abs(v)));
  for (const c of [...CARTES.bonus, ...CARTES.malus]) for (const m of c.texte.match(/\d+/g) || []) check(connus.has(Number(m)), `carte « ${c.nom} » : le nombre ${m} vient de P ou de CRANS`);
  check(CARTE_PAR_ID.jalonForce.texte.includes(pts(P.jalonManque)) && pts(P.jalonManque) === '−3', `« Jalon forcé » annonce ce qu’il applique (${CARTE_PAR_ID.jalonForce.texte})`);
  check(CARTE_PAR_ID.primeDevoilement.texte.includes(pts(P.prime)), '« Prime de dévoilement » annonce P.prime');
  const i = new Island(brumeDef('claire', 4)); i.appliquerCarte('primeDevoilement'); check(i.brume.saison.prime === P.prime, 'et applique P.prime');
  check(pts(5) === '+5' && pts(-5) === '−5', 'pts écrit les signes du jeu');
}

// --- B-L : sous « Nuit noire », la fiche ne laisse rien fuir : la liste des familles ne dépend pas de ce qui est caché
{
  const a = new Island(brumeDef('claire', 11)), b = new Island(brumeDef('epaisse', 12));
  check(a.famillesAnnoncables().join() === a.inventaireBrume.map((e) => e.id).join(), 'claire, sans carte : les familles de l’inventaire');
  check(b.famillesAnnoncables().every((f) => f === 'tresor' || COULEURS[f]) && b.famillesAnnoncables().length > b.inventaireBrume.length, 'épaisse : toutes les familles des couleurs annoncées');
  a.appliquerCarte('nuitNoire'); b.appliquerCarte('nuitNoire');
  check(a.famillesAnnoncables().join() === b.famillesAnnoncables().join() && a.famillesAnnoncables().length === 10 && a.famillesAnnoncables().includes('tresor'), 'Nuit noire : deux îles différentes, la même liste (neuf familles et trésor)');
  const k = [...a.board.fog][0]; check(a.planterJalon(...parse(k), 'tresor'), 'un jalon « trésor » se plante');
}

// --- B-N : le Vent contraire respecte la règle de Déplacer — une tuile qui touche la brume ne bouge pas
// (le dévoilement précède le vent : une tuile dont toute la brume voisine vient de se lever n'est plus engagée, elle peut glisser)
{
  let bouge = 0, engagees = 0, restees = 0, libresBougees = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const isl = new Island(brumeDef('claire', seed)); isl.appliquerCarte('ventContraire');
    // au moment du vent, la tuile qui glisse ne touchait pas la brume
    isl.on((e) => { if (e.type === 'brume' && e.kind === 'vent' && isl.fogAround(e.from.q, e.from.r).length) bouge++; });
    // une seule pose de la saison, contre la brume, puis le passage de saison à la main
    const c = isl.board.legalCells().find((c) => isl.fogAround(c.q, c.r).length && neighbors(c.q, c.r).some(([a, b]) => isl.board.isEmpty(a, b)));
    if (!c) continue;
    const fam = isl.current.family; isl.place(c.q, c.r); engagees++;
    isl.passageBrume();
    const t = isl.board.get(c.q, c.r);
    if (isl.fogAround(c.q, c.r).length && (!t || t.family !== fam)) bouge++;
    if (t && t.family === fam && isl.fogAround(c.q, c.r).length) restees++;
    // et une tuile libre de la brume, elle, glisse encore
    const j = new Island(brumeDef('claire', seed)); joue(j, 5); j.leverBrume();   // une saison est passée : une carte est tirée, on la remplace
    j.appliquerCarte('ventContraire'); j.brume.posesSaison = [];
    const cl = j.board.legalCells().find((c) => !j.fogAround(c.q, c.r).length && neighbors(c.q, c.r).some(([a, b]) => j.board.isEmpty(a, b)));
    if (cl) { j.place(cl.q, cl.r); const e2 = []; j.on((e) => { if (e.type === 'brume' && e.kind === 'vent') e2.push(e); }); j.passageBrume(); if (e2.length) libresBougees++; }
  }
  check(engagees > 5 && restees > 0 && bouge === 0, `le vent ne déplace jamais une tuile engagée contre la brume (${engagees} essais, ${restees} restées engagées)`);
  check(libresBougees > 0, `mais il déplace encore une tuile libre (${libresBougees})`);
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
  joue(isl, 5); isl.leverBrume();
  check(manques === 1 && isl.tally.brume <= P.jalonManque, 'épaisse : une saison sans jalon coûte −3');
  const c = new Island(brumeDef('claire', 5)); let m2 = 0; c.on((e) => { if (e.type === 'brume' && e.kind === 'jalonManque') m2++; });
  joue(c, 5); c.leverBrume(); check(m2 === 0, 'claire : le jalon est facultatif');
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


// --- le tirage de saison : la chance bouge avec les coups, une carte par saison, ses effets
{
  check(CARTES.bonus.length === 10 && CARTES.malus.length === 10, 'dix bonus, dix malus');
  check(new Set([...CARTES.bonus, ...CARTES.malus].map((c) => c.id)).size === 20, 'vingt identifiants distincts');
  // le tirage respecte la chance : à 0,8, surtout des bonus ; à 0,2, surtout des malus ; une carte exclue ne sort jamais
  const rng = new RNG(7); let b8 = 0, b2 = 0;
  for (let i = 0; i < 400; i++) { if (tirerCarte(rng, 0.8).bonus) b8++; if (tirerCarte(rng, 0.2).bonus) b2++; }
  check(b8 > 280 && b2 < 120, `la chance est respectée (${b8} / 400 bonus à 0,8 ; ${b2} / 400 à 0,2)`);
  let exclue = false; for (let i = 0; i < 200; i++) if (tirerCarte(rng, 1, new Set(['longueVue'])).id === 'longueVue') exclue = true;
  check(!exclue, 'la carte exclue ne sort jamais');
  // la partie : la chance part de 50 %, bouge d'un cran par coup jugé, une carte tombe au passage de saison
  const isl = new Island(brumeDef('claire', 3)); const B = isl.brume;
  check(B.ratio === TIRAGE.depart && B.carte === null, 'première saison : 50 / 50, pas de carte');
  joue(isl, 4);
  check(B.ratio >= TIRAGE.min && B.ratio <= TIRAGE.max && B.ratio !== TIRAGE.depart, `la chance a bougé (${B.ratio.toFixed(2)})`);
  joue(isl, 1); isl.leverBrume();
  check(isl.seasonsPassed.length === 1 && !!B.carte && !!CARTE_PAR_ID[B.carte.id], `au passage de saison, une carte est tirée (${B.carte && B.carte.nom})`);
  // les effets, un à un, sur une île fraîche
  const eff = (id) => { const i = new Island(brumeDef('claire', 4)); i.appliquerCarte(id); return i; };
  check(eff('mareeBasse').seuilDevoile() === CRANS.claire.devoile - 1 && eff('brumeEpaisse').seuilDevoile() === CRANS.claire.devoile + 1, 'Marée basse et Brume épaisse déplacent le seuil de dévoilement');
  check(eff('deuxJalons').brume.saison.jalonsMax === 2, 'Deux jalons');
  { const i = eff('tuilePerdue'); check(i.queue.remaining === new Island(brumeDef('claire', 4)).queue.remaining - 1, 'Tuile perdue : une tuile de moins'); }
  { const i = eff('mainCourte'); check(i.seasonLength === 4, 'Main courte : quatre poses'); i.appliquerCarte('nuitNoire'); check(i.seasonLength === 5 && i.brume.saison.nuit, 'la saison suivante rend la cinquième pose ; Nuit noire cache l’inventaire'); }
  check(eff('mainLarge').queue.list.length === 6, 'Main large : six tuiles en main');
  // La brume gagne : impossible au départ (chaque case libre touche la brume), possible une fois des cases dévoilées ; le tirage l'exclut sinon
  check(new Island(brumeDef('claire', 4)).casesPourLaBrume().length === 0, 'au départ, la brume ne peut gagner nulle part (jamais collée)');
  { let i = null; for (let seed = 4; seed <= 14 && !i; seed++) { const c = new Island(brumeDef('claire', seed)); while (!c.ended && !c.casesPourLaBrume().length) joue(c, 5); if (!c.ended && c.casesPourLaBrume().length) i = c; }
    if (i) { const avant = i.board.fog.size; i.appliquerCarte('brumeGagne'); check(i.board.fog.size === avant + 1, 'La brume gagne : une case cachée de plus, là où elle ne colle à rien'); } else console.log('  (aucune île ne s’est prêtée à « La brume gagne » : non testé)'); check([...i.board.fog].every((k) => !neighbors(...parse(k)).some(([a, c]) => i.board.fog.has(key(a, c)))), 'et toujours aucune case cachée collée à une autre'); }
  { const i = eff('crayonEfface'); const k = [...i.board.fog][0]; check(!i.noter(...parse(k), 'forest'), 'Crayon effacé : plus de note'); }
  { const i = eff('indicesMuets'); joue(i, 2); check([...i.board.tiles.values()].every((t) => typeof t.indice !== 'number'), 'Indices muets : aucun indice lu'); }
  { const i = eff('longueVue'); const k = [...i.board.fog][0]; const n = i.board.fog.size; check(i.longueVue(...parse(k)) && i.board.fog.size === n - 1 && !i.brume.saison.longueVue, 'Longue-vue : la case touchée se dévoile, une fois'); }
  { const i = eff('deplacementOffert'); joue(i, 3); const libre = [...i.board.tiles.values()].find((t) => !t.start && !i.fogAround(t.q, t.r).length); if (libre) { const c = i.moveTargets(libre.q, libre.r)[0]; const reste = i.queue.remaining; if (c) { i.move(libre.q, libre.r, c.q, c.r); check(i.queue.remaining === reste, 'Déplacement offert : la tuile suivante n’est pas perdue'); } } }
  // sauvegarde : le tirage revient tel quel
  { const i = new Island(brumeDef('claire', 5)); joue(i, 5); const j = new Island(brumeDef('claire', 5)); j.restoreRun(i.serialize()); check(j.brume.ratio === i.brume.ratio && JSON.stringify(j.brume.carte) === JSON.stringify(i.brume.carte) && JSON.stringify(j.brume.saison) === JSON.stringify(i.brume.saison), 'le tirage se sauvegarde et se reprend'); }
}

// --- B-F : observer avant de lever la brume. La dernière pose de la saison ne dévoile rien : le passage attend « Lever la brume ».
{
  const isl = new Island(brumeDef('claire', 7)); const ev = [];
  isl.on((e) => { if (e.type === 'brume' && (e.kind === 'reveal' || e.kind === 'passagePret')) ev.push(e); });
  const depart = isl.board.fog.size;
  joue(isl, 4); check(!isl.passagePret && isl.inSeason === 4, 'quatre poses : la saison court');
  joue(isl, 1);
  const pret = ev.find((e) => e.kind === 'passagePret');
  check(isl.passagePret && isl.seasonsPassed.length === 0 && !!pret && !ev.some((e) => e.kind === 'reveal') && isl.board.fog.size === depart, 'après cinq poses, rien n’est dévoilé : le passage est prêt');
  const prets = isl.casesPretes();
  check(prets.length > 0 && prets.join() === pret.prets.join(), `les cases qui vont se dévoiler sont annoncées (${prets.length})`);
  // le dernier indice sert : la cinquième tuile, contre la brume, a son chiffre avant le dévoilement
  const derniere = isl.board.get(...parse(isl.brume.posesSaison[isl.brume.posesSaison.length - 1]));
  if (isl.fogAround(derniere.q, derniere.r).length) check(typeof derniere.indice === 'number', 'le dernier indice de la saison se lit avant que la brume se lève');
  const libre = isl.board.legalCells()[0];
  check(!!libre && !isl.canPlace(libre.q, libre.r) && isl.place(libre.q, libre.r) === null && isl.placements === 5, 'aucune pose possible');
  check(!isl.canDiscard() && [...isl.board.tiles.values()].every((t) => !isl.canMove(t.q, t.r)), 'ni défausse ni déplacement');
  const kj = prets[0]; const fam = isl.brume.cachees.get(kj).family;
  check(isl.planterJalon(...parse(kj), fam) && isl.noter(...parse(prets[prets.length - 1]), 'water'), 'le jalon et le crayon restent ouverts');
  // la reprise garde l'état
  const sv = JSON.parse(JSON.stringify(isl.serialize())); const b = new Island(brumeDef('claire', 7)); b.restoreRun(sv);
  check(b.passagePret && b.casesPretes().join() === prets.join() && !b.canPlace(libre.q, libre.r) && b.brume.jalons.get(kj) === fam, 'la reprise garde le passage prêt, ses cases et le jalon');
  // lever la brume : le passage, avec ses dévoilements
  const s0 = isl.score;
  check(isl.leverBrume() && !isl.passagePret && isl.seasonsPassed.length === 1, 'Lever la brume fait le passage');
  const rev = ev.find((e) => e.kind === 'reveal');
  check(!!rev && rev.cells.map((c) => key(c.q, c.r)).sort().join() === prets.join() && rev.cells.find((c) => key(c.q, c.r) === kj).juste === true && isl.score > s0, 'les cases annoncées se dévoilent, le jalon est jugé');
  check(!isl.leverBrume() && b.leverBrume() && b.seasonsPassed.length === 1, 'on ne lève pas deux fois ; la partie reprise se lève aussi');
  check(isl.canPlace(libre.q, libre.r) || isl.board.get(libre.q, libre.r), 'la saison suivante, on pose de nouveau');
  joue(isl); check(isl.ended, 'la partie va au bout');
  // sans plus rien de caché, le passage se fait tout seul
  const j = new Island(brumeDef('claire', 8)); joue(j, 3); while (j.board.fog.size) { j.brume.saison.longueVue = true; j.longueVue(...parse([...j.board.fog][0])); }
  joue(j, 2); check(!j.passagePret && j.seasonsPassed.length === 1, 'plus rien de caché : la saison passe sans attendre');
}

// --- B-H : les énigmes. Pour chacune, le solveur ne tranche la case visée qu'après les deux indices, jamais avant.
for (const e of ENIGMES) {
  const def = brumeEnigme(e.id); const isl = new Island(def);
  check(!!isl.brume && isl.board.fog.size === Object.keys(e.cachees).length && isl.board.tiles.size === e.start.length, `énigme ${e.id} : la forme, les tuiles de départ et les cases cachées sont celles du plan`);
  check(isl.queue.list.every((t) => t.family === e.opening[0]), `énigme ${e.id} : la main est fixée`);
  const cases = [...isl.board.fog].sort(); const inv = isl.inventaireBrume; const contraintes = [];
  check(possibles(cases, inv, [], CRANS.claire).get(e.cible).size > 1, `énigme ${e.id} : sans indice, la cible est un pari`);
  e.poses.forEach(([q, r], i) => {
    check(isl.canPlace(q, r), `énigme ${e.id} : la pose ${i + 1} est possible`); isl.place(q, r);
    const t = isl.board.get(q, r); check(t && typeof t.indice === 'number', `énigme ${e.id} : la pose ${i + 1} lit un indice`);
    contraintes.push({ voisines: t.portee, fams: Board.familiesOf(t), n: t.indice });
    const pos = possibles(cases, inv, contraintes, CRANS.claire).get(e.cible);
    if (i < e.poses.length - 1) check(pos.size > 1, `énigme ${e.id} : après ${i + 1} indice(s), la cible n’est pas encore sûre`);
    else check(pos.size === 1 && pos.has(e.famille), `énigme ${e.id} : après les deux indices, la cible est sûre (${e.famille})`);
  });
  check(isl.passagePret && isl.casesPretes().join() === cases.join(), `énigme ${e.id} : après les poses imposées, le passage est prêt et toutes les cases vont se dévoiler`);
  for (const st of e.etapes) { const tx = typeof st.text === 'function' ? st.text(isl) : st.text; check(typeof tx === 'string' && tx.length > 20, `énigme ${e.id} : l’étape ${st.id} a son texte`); }
  check(isl.planterJalon(...parse(e.cible), e.famille) && isl.leverBrume() && isl.brume.justes === 1 && isl.board.fog.size === 0 && isl.brume.carte === null, `énigme ${e.id} : jalon juste, brume levée, tout dévoilé, pas de tirage`);
  check(!isl.ended, `énigme ${e.id} : l’île n’est pas finie (on la quitte par le tutoriel)`);
}

console.log(failures ? `\n${failures} échec(s)` : '\nSous la brume : tout est bon.');
process.exit(failures ? 1 : 0);
