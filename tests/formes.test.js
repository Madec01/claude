// Tests Node des formes d'îles (FORMES, src/data/islands.js — docs/PISTES_FORMES.md) : chaque forme reste d'un seul
// tenant (les archipels, chapelets, jumelles, comètes… sont reliés par des gués, c'est voulu), garde les tuiles de départ,
// rend un nombre de cases proche de la demande, est déterministe, tient dans un écran en portrait ; les dix formes douces
// n'ont pas de gué et ne coûtent rien au robot (`difficulte: 'aucune'`, mesurée par tools/mesure_formes.js) ; et les îles
// sans forme ne bougent pas. Usage : node tests/formes.test.js
import { generateMask, enclosedHoles, FORMES, departsDeForme, composantes, relier } from '../src/data/islands.js';
import { campaignIsland, islandOptions, islandCells } from '../src/data/campaign.js';
import { Island } from '../src/game/island.js';
import { neighbors, key, parse, hexDist } from '../src/game/hex.js';
import { playStrong } from './bot.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { failures++; console.error('ÉCHEC :', msg); } };

/** Le masque complet d'une définition, tel que l'île le voit : la forme, puis les tuiles de départ et les lagunes. */
function masqueComplet(def, forme) {
  const garde = def.start.map((t) => key(t.q, t.r));
  const m = generateMask(def.seed, def.cells, { roughness: def.roughness, holes: def.holes, etire: def.etire || 1, forme, garde });
  for (const k of garde) m.add(k);
  for (const h of enclosedHoles(m)) m.add(key(h.q, h.r));
  return m;
}
const cote = (m) => [...m].filter((k) => { const [q, r] = parse(k); return neighbors(q, r).some(([a, b]) => !m.has(key(a, b))); }).length;
/** Le départ que la signature de l'anneau déplacerait sur la couronne (FORMES.anneau.depart le porte désormais). */
const DEPART_ANNEAU = [{ q: 3, r: -1, family: 'hamlet' }, { q: -3, r: 2, family: 'rock' }];
/** La définition d'une île de campagne nue ; une forme qui demande son départ (anneau, ourlet, atoll) l'obtient. */
const defDe = (n, forme) => { const d = campaignIsland(n); const def = { ...d, start: d.start.map((t) => ({ ...t })) }; delete def.isthme; delete def.signature; const f = forme && FORMES[forme]; if (f && f.depart) def.start = f.depart.map((t) => ({ ...t })); return def; };
/** Les gués : les cases dont le retrait coupe l'île en deux morceaux d'au moins cinq cases (une pointe qui tient par une case n'en est pas un). */
const gues = (m) => [...m].filter((k) => { const m2 = new Set(m); m2.delete(k); const c = composantes(m2); return c.length > 1 && c[1].size >= 5; });
/** La mer intérieure : les cases hors masque qu'on n'atteint pas depuis le large (par morceaux). */
function merInterieure(m) {
  const cs = [...m].map(parse); const qmin = Math.min(...cs.map((c) => c[0])) - 1, qmax = Math.max(...cs.map((c) => c[0])) + 1, rmin = Math.min(...cs.map((c) => c[1])) - 1, rmax = Math.max(...cs.map((c) => c[1])) + 1;
  const large = new Set([key(qmin, rmin)]); const pile = [[qmin, rmin]];
  while (pile.length) { const [q, r] = pile.pop(); for (const [a, b] of neighbors(q, r)) { const k = key(a, b); if (a < qmin || a > qmax || b < rmin || b > rmax || m.has(k) || large.has(k)) continue; large.add(k); pile.push([a, b]); } }
  const dedans = new Set(); for (let q = qmin; q <= qmax; q++) for (let r = rmin; r <= rmax; r++) { const k = key(q, r); if (!m.has(k) && !large.has(k)) dedans.add(k); }
  return composantes(dedans);
}
/** La mer enfoncée : les cases de mer reliées au large à quatre pas ou plus (par la mer) du bord de la boîte de l'île — un fjord, une baie, une lagune, une fente. */
function enfoncees(m) {
  const cs = [...m].map(parse); const qmin = Math.min(...cs.map((c) => c[0])) - 2, qmax = Math.max(...cs.map((c) => c[0])) + 2, rmin = Math.min(...cs.map((c) => c[1])) - 2, rmax = Math.max(...cs.map((c) => c[1])) + 2;
  const dist = new Map(); const file = [];
  for (let q = qmin; q <= qmax; q++) for (let r = rmin; r <= rmax; r++) if ((q === qmin || q === qmax || r === rmin || r === rmax) && !m.has(key(q, r))) { dist.set(key(q, r), 0); file.push([q, r]); }
  while (file.length) { const [q, r] = file.shift(); const d = dist.get(key(q, r)); for (const [a, b] of neighbors(q, r)) { const k = key(a, b); if (a < qmin || a > qmax || b < rmin || b > rmax || m.has(k) || dist.has(k)) continue; dist.set(k, d + 1); file.push([a, b]); } }
  let n = 0; for (const d of dist.values()) if (d >= 4) n++; return n;
}
const dimensions = (m) => { const cs = [...m].map(parse); return { larg: Math.max(...cs.map(([q, r]) => q + r / 2)) - Math.min(...cs.map(([q, r]) => q + r / 2)) + 1, haut: (Math.max(...cs.map((c) => c[1])) - Math.min(...cs.map((c) => c[1]))) * 0.866 + 1 }; };
const NOUVELLES = Object.keys(FORMES).slice(11);
const DOUCES = NOUVELLES.filter((f) => FORMES[f].famille === 'douce'), ETRANGES = NOUVELLES.filter((f) => FORMES[f].famille === 'etrange');
check(NOUVELLES.length === 20 && DOUCES.length === 10 && ETRANGES.length === 10, `vingt formes de plus, dix douces et dix étranges (${NOUVELLES.length}, ${DOUCES.length}, ${ETRANGES.length})`);
check(JSON.stringify(FORMES.anneau.depart) === JSON.stringify(DEPART_ANNEAU), 'l’anneau porte le départ que sa signature déplacerait');
for (const forme of Object.keys(FORMES)) {
  const f = FORMES[forme];
  check(['douce', 'construite', 'etrange'].includes(f.famille), `${forme} : une famille (${f.famille})`);
  check(['aucune', 'légère', 'forte'].includes(f.difficulte), `${forme} : une difficulté mesurée (${f.difficulte})`);
  check(typeof f.nom === 'string' && /^Ici, on apprend à/.test(f.intention), `${forme} : un nom et une intention « Ici, on apprend à… »`);
}
for (const forme of DOUCES) check(FORMES[forme].difficulte === 'aucune', `${forme} : une forme douce ne coûte rien au robot (${FORMES[forme].difficulte})`);

// --- les formes qui creusent : un seul tenant, départ gardé, compte de cases, déterminisme
const ILES = [4, 7, 11, 19, 26];   // 50, 60, 66, 82 et 120 cases, sans signature
for (const forme of Object.keys(FORMES)) {
  const f = FORMES[forme];
  if (!(f.masque || f.avant || forme === 'cote')) continue;
  for (const n of ILES) {
    const def = defDe(n, forme);
    const m = masqueComplet(def, forme), ronde = masqueComplet(def, null);
    const comps = composantes(m);
    check(comps.length === 1, `${forme}, île ${n} : d’un seul tenant (${comps.length} morceaux)`);
    check(def.start.every((t) => m.has(key(t.q, t.r))), `${forme}, île ${n} : les tuiles de départ sont sur l’île`);
    check(Math.abs(m.size - def.cells) <= Math.max(3, def.cells * 0.06), `${forme}, île ${n} : ${m.size} cases pour ${def.cells} demandées`);
    check([...masqueComplet(def, forme)].join() === [...m].join(), `${forme}, île ${n} : même graine, même masque`);
    check(islandCells({ ...def, forme, id: `t_${n}_${forme}` }) === m.size, `${forme}, île ${n} : islandCells suit la forme (${islandCells({ ...def, forme, id: `t2_${n}_${forme}` })} / ${m.size})`);
    if (forme !== 'lagunes' && forme !== 'anneau') check(cote(m) > cote(ronde), `${forme}, île ${n} : plus de côte que l’île ronde (${cote(m)} contre ${cote(ronde)})`);
    if (!NOUVELLES.includes(forme)) continue;
    // les vingt formes de plus : lisibles au téléphone en portrait (pas plus larges que 1,6 fois leur hauteur), et les douces sans gué
    const { larg, haut } = dimensions(m);
    check(larg / haut <= 1.6, `${forme}, île ${n} : tient en portrait (${larg.toFixed(0)} × ${haut.toFixed(0)})`);
    if (FORMES[forme].famille === 'douce') check(gues(m).length === 0, `${forme}, île ${n} : une forme douce n’a pas de gué (${gues(m).length})`);
  }
}

// --- les dix douces : ce que chacune promet
for (const n of ILES) {
  const ronde = masqueComplet(defDe(n, null), null); const e0 = enfoncees(ronde);
  const de = (forme) => masqueComplet(defDe(n, forme), forme);
  check(merInterieure(de('lac')).some((c) => c.size >= 5), `lac, île ${n} : une mer intérieure d’au moins cinq cases`);
  check(enclosedHoles(de('lac')).length === enclosedHoles(ronde).length, `lac, île ${n} : le lac n’est pas une mare (il reste la mer)`);
  check(enfoncees(de('lagune')) >= e0 + 4 && merInterieure(de('lagune')).every((c) => c.size < 5), `lagune, île ${n} : une lagune abritée et ouverte sur le large (${enfoncees(de('lagune'))} cases de mer enfoncées, ${e0} sur la ronde)`);
  check(enfoncees(de('fjord')) >= e0 + 5, `fjord, île ${n} : un bras de mer enfoncé dans les terres (${enfoncees(de('fjord'))} enfoncées, ${e0} sur la ronde)`);
  check(enfoncees(de('baie')) >= e0 + 2, `baie, île ${n} : une baie profonde (${enfoncees(de('baie'))} enfoncées, ${e0} sur la ronde)`);
  for (const forme of ['haricot', 'goutte']) { const { larg, haut } = dimensions(de(forme)); check(haut > larg, `${forme}, île ${n} : plus haute que large (${larg.toFixed(0)} × ${haut.toFixed(0)})`); }
}
// --- les dix étranges : ce que chacune promet
for (const n of ILES) {
  const de = (forme) => masqueComplet(defDe(n, forme), forme);
  { const m = de('jumelles'); let best = Infinity;   // un reflet par une rangée : presque toutes les cases ont leur jumelle (le gué et les départs exceptés)
    for (let y0 = -3; y0 <= 8; y0++) { let hors = 0; for (const k of m) { const [q, r] = parse(k); if (!m.has(key(q + r - y0, 2 * y0 - r))) hors++; } best = Math.min(best, hors); }
    check(best <= 4, `jumelles, île ${n} : deux moitiés en miroir (${best} cases sans jumelle)`);
    check(gues(m).length >= 1, `jumelles, île ${n} : un gué entre les jumelles`); }
  { const m = de('comete'); const sans = new Set(m); for (const k of gues(m)) sans.delete(k); const comps = composantes(sans);
    check(comps.length >= 4 && comps.filter((c) => c.size >= 5 && c.size <= 7).length >= 3, `comète, île ${n} : une tête et au moins trois îlots de sept cases, gués ôtés (${comps.map((c) => c.size).join(' ')})`); }
  { const m = de('ourlet'); const bord = new Set([...m].filter((k) => { const [q, r] = parse(k); return neighbors(q, r).some(([a, b]) => !m.has(key(a, b))); }));
    const pres = new Set(bord); for (const k of bord) { const [q, r] = parse(k); for (const [a, b] of neighbors(q, r)) pres.add(key(a, b)); }
    check([...m].every((k) => { const [q, r] = parse(k); return pres.has(k) || neighbors(q, r).some(([a, b]) => pres.has(key(a, b))); }), `ourlet, île ${n} : toute case est à deux pas d’une côte (deux à quatre d’épaisseur)`);
    check(merInterieure(m).some((c) => c.size >= 10), `ourlet, île ${n} : une grande mer intérieure`); }
  { const m = de('atoll'); const sans = new Set(m); for (const k of gues(m)) sans.delete(k); const ilot = composantes(sans).find((c) => c.has('0,0'));
    check(ilot && ilot.size <= 9 && ilot.size >= 5, `atoll, île ${n} : le hameau sur un îlot de sept cases, gué ôté (${ilot && ilot.size})`);
    check(merInterieure(m).some((c) => c.size >= 8), `atoll, île ${n} : une mer intérieure autour de l’îlot`); }
  { const lacs = merInterieure(de('percee')).filter((c) => c.size === 2); check(lacs.length >= 6, `percée, île ${n} : au moins six lacs de deux cases (${lacs.length})`); }
  check(enfoncees(de('serrure')) >= 8, `serrure, île ${n} : un lac et une fente enfoncés (${enfoncees(de('serrure'))})`);
  check(enfoncees(de('labyrinthe')) >= 8, `labyrinthe, île ${n} : des bras de mer enfoncés (${enfoncees(de('labyrinthe'))})`);
  check(de('spirale').has('0,0') && de('vrille').has('0,0') && de('peigne').has('0,0'), `spirale, vrille, peigne, île ${n} : l’origine est sur l’île`);
}

// --- l'archipel : des gués, chacun une case dont le retrait coupe l'île
{
  for (const n of ILES) {
    const m = masqueComplet(defDe(n, 'archipel'), 'archipel');
    let coupures = 0; for (const k of m) { const m2 = new Set(m); m2.delete(k); if (composantes(m2).length > 1) coupures++; }
    check(coupures >= 2, `archipel, île ${n} : au moins deux gués d’une case (${coupures} cases coupent l’île)`);
  }
}
// --- le chapelet : des cols de deux cases (aucune case seule ne coupe l'île, mais deux voisines le font)
{
  const m = masqueComplet(defDe(11, 'chapelet'), 'chapelet');
  let seules = 0, paires = 0;
  for (const k of m) { const m2 = new Set(m); m2.delete(k); if (composantes(m2).length > 1) seules++; const [q, r] = parse(k); for (const [a, b] of neighbors(q, r)) { const k2 = key(a, b); if (!m.has(k2) || k2 < k) continue; const m3 = new Set(m2); m3.delete(k2); if (composantes(m3).length > 1) paires++; } }
  check(seules === 0 && paires >= 2, `chapelet, île 11 : des cols de deux cases (${seules} case seule, ${paires} paires coupent l’île)`);
}
// --- l'anneau : une mer intérieure (des cases hors masque qu'on n'atteint pas depuis le large), restée mer (pas une lagune)
{
  for (const n of [7, 11, 19]) {
    const def = defDe(n, 'anneau'); const m = masqueComplet(def, 'anneau');
    const cs = [...m].map(parse); const qmin = Math.min(...cs.map((c) => c[0])) - 1, qmax = Math.max(...cs.map((c) => c[0])) + 1, rmin = Math.min(...cs.map((c) => c[1])) - 1, rmax = Math.max(...cs.map((c) => c[1])) + 1;
    const large = new Set([key(qmin, rmin)]); const pile = [[qmin, rmin]];
    while (pile.length) { const [q, r] = pile.pop(); for (const [a, b] of neighbors(q, r)) { const k = key(a, b); if (a < qmin || a > qmax || b < rmin || b > rmax || m.has(k) || large.has(k)) continue; large.add(k); pile.push([a, b]); } }
    let interieure = 0; for (let q = qmin; q <= qmax; q++) for (let r = rmin; r <= rmax; r++) { const k = key(q, r); if (!m.has(k) && !large.has(k)) interieure++; }
    check(interieure >= 7, `anneau, île ${n} : une mer intérieure d’au moins sept cases (${interieure})`);
    check(enclosedHoles(m).length === 0, `anneau, île ${n} : la mer intérieure n’est pas une lagune`);
    const isl = new Island({ ...def, forme: 'anneau', id: `t_anneau_${n}` }, islandOptions(def));
    check(isl.board.cells === m.size, `anneau, île ${n} : l’île en jeu a les cases du masque (${isl.board.cells} / ${m.size})`);
  }
}
// --- les lagunes : des mares de départ, jamais deux voisines, jamais sur la côte
{
  for (const n of [7, 11, 19, 26]) {
    const def = defDe(n, 'lagunes');
    const brut = generateMask(def.seed, def.cells, { roughness: def.roughness, holes: def.holes, forme: 'lagunes', garde: def.start.map((t) => key(t.q, t.r)) });
    const lag = enclosedHoles(brut);
    const rondeLag = enclosedHoles(generateMask(def.seed, def.cells, { roughness: def.roughness, holes: def.holes, garde: def.start.map((t) => key(t.q, t.r)) })).length;
    check(lag.length >= rondeLag + Math.floor(def.cells / 20), `lagunes, île ${n} : bien plus de mares que l’île ronde (${lag.length} contre ${rondeLag})`);
    check(lag.every((a) => lag.every((b) => a === b || hexDist(a.q, a.r, b.q, b.r) >= 2)), `lagunes, île ${n} : jamais deux mares voisines`);
    const isl = new Island({ ...def, forme: 'lagunes', id: `t_lag_${n}` }, islandOptions(def));
    const garde = def.start.map((t) => key(t.q, t.r));   // un trou tombé sur une tuile de départ reçoit cette tuile-là, pas de l'eau
    check([...isl.board.tiles.values()].filter((t) => t.family === 'water' && t.start).length >= lag.filter((h) => !garde.includes(key(h.q, h.r))).length, `lagunes, île ${n} : chaque mare est une tuile d’eau posée au départ`);
  }
}
// --- la longue côte : bien plus haute que large
{
  const m = masqueComplet(defDe(11, 'cote'), 'cote'); const cs = [...m].map(parse);
  const w = Math.max(...cs.map(([q, r]) => q + r / 2)) - Math.min(...cs.map(([q, r]) => q + r / 2)), h = (Math.max(...cs.map((c) => c[1])) - Math.min(...cs.map((c) => c[1]))) * 0.866;
  check(h / w >= 1.8, `cote : bien plus haute que large (${(h / w).toFixed(2)})`);
}

// --- les formes qui posent des tuiles de départ : sur l'île, jamais sur une tuile de départ, et ce qu'elles promettent
for (const n of ILES) {
  const def = defDe(n, null); const garde = def.start.map((t) => key(t.q, t.r)); const m = masqueComplet(def, null);
  const rochers = departsDeForme('crete', m, garde);
  check(rochers.length >= 5 && rochers.every((t) => t.family === 'rock' && m.has(key(t.q, t.r)) && !garde.includes(key(t.q, t.r))), `crête, île ${n} : au moins cinq roches sur l’île, hors départ (${rochers.length})`);
  const xs = new Set(rochers.map((t) => t.q + t.r / 2)); check(xs.size <= 2 && Math.max(...xs) - Math.min(...xs) <= 0.5, `crête, île ${n} : une seule bande en zigzag`);
  const ys = rochers.map((t) => t.r); const tous = [...m].map((k) => parse(k)[1]);
  check(Math.max(...ys) < Math.max(...tous) - 1, `crête, île ${n} : un col reste ouvert au sud (roches jusqu’à r=${Math.max(...ys)}, île jusqu’à r=${Math.max(...tous)})`);
  const collines = departsDeForme('plateau', m, garde);
  check(collines.length === 7 && collines.every((t) => t.family === 'hill' && m.has(key(t.q, t.r)) && !garde.includes(key(t.q, t.r))), `plateau, île ${n} : sept collines en fleur, sur l’île, hors départ (${collines.length})`);
  check(composantes(new Set(collines.map((t) => key(t.q, t.r)))).length === 1, `plateau, île ${n} : les collines se touchent`);
  const bord = departsDeForme('cuvette', m, garde);
  check(bord.length >= 6 && bord.every((t) => t.family === 'rock' && neighbors(t.q, t.r).some(([a, b]) => !m.has(key(a, b)))), `cuvette, île ${n} : au moins six roches, toutes sur la côte (${bord.length})`);
  check(bord.every((a) => bord.every((b) => a === b || hexDist(a.q, a.r, b.q, b.r) >= 3)), `cuvette, île ${n} : des roches espacées d’au moins trois cases`);
  check(departsDeForme('archipel', m, garde).length === 0 && departsDeForme('inconnue', m, garde).length === 0, `île ${n} : une forme sans départ n’en donne pas`);
}

// --- sans forme, rien ne bouge : une forme inconnue ou nulle donne le masque d'avant
{
  const d = campaignIsland(11); const o = { roughness: d.roughness, holes: d.holes, garde: d.start.map((t) => key(t.q, t.r)) };
  const a = [...generateMask(d.seed, d.cells, o)].join(), b = [...generateMask(d.seed, d.cells, { ...o, forme: null })].join(), c = [...generateMask(d.seed, d.cells, { ...o, forme: 'inconnue' })].join();
  check(a === b && a === c, 'sans forme (ou forme inconnue), le masque est celui d’avant');
  const d8 = campaignIsland(8); check(d8.isthme && !d8.forme, 'la campagne ne porte aucune forme : le passage étroit reste une option à part');
  for (let n = 1; n <= 30; n++) check(!campaignIsland(n).forme, `île ${n} : pas de forme branchée dans la campagne`);
}
// --- relier : deux morceaux séparés d'une case sont reliés par une seule case
{
  const m = new Set(['0,0', '1,0', '3,0', '4,0']); const ajout = relier(m);
  check(ajout.length === 1 && ajout[0] === '2,0' && composantes(m).length === 1, `relier : un gué d’une case (${ajout.join(' ')})`);
}

// --- une partie entière sur six formes : le robot va au bout, l'île est pleine ou la file vide
for (const [n, forme] of [[7, 'archipel'], [11, 'lagunes'], [11, 'anneau'], [7, 'jumelles'], [11, 'comete'], [19, 'atoll']]) {
  const def = { ...defDe(n, forme), forme, id: `t_partie_${forme}` };
  const { result } = playStrong(def, { seedOffset: 0, botSeed: 1 });
  check(result && result.score > 0 && (result.reason === 'full' || result.reason === 'queue'), `${forme}, île ${n} : partie jouée jusqu’au bout (${result && result.reason}, ${result && result.score} pts)`);
}
// --- une forme à départ dans une île : la crête pose ses roches et la partie se joue
{
  const def = defDe(11, null); const garde = def.start.map((t) => key(t.q, t.r)); const m = masqueComplet(def, null);
  def.start.push(...departsDeForme('crete', m, garde)); def.id = 't_crete';
  const { result, isl } = playStrong(def, { seedOffset: 0, botSeed: 1 });
  check([...isl.board.tiles.values()].filter((t) => t.family === 'rock' && t.start).length >= 6 && result && result.score > 0, `crête, île 11 : les roches sont posées et la partie va au bout (${result && result.score} pts)`);
}

if (failures) { console.error(`${failures} échec(s)`); process.exit(1); }
console.log('Tous les tests des formes passent.');
