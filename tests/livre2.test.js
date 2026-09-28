// Livre II (28 septembre, prototype) : l'archipel, le détroit, les tuiles de mer, les routes et la chaîne de territoire.
import { archipelMask, poidsArchipel } from '../src/data/archipel.js';
import { Island } from '../src/game/island.js';
import { Board } from '../src/game/board.js';
import { computeRoutes, chaineTerritoire, rentesRares, rentesLivre2 } from '../src/game/routes.js';
import { campaignMechanics, campaignIsland, MECH_AT } from '../src/data/campaign.js';
import { transition } from '../src/game/seasons.js';
import { reglesPour, SEASON_RULES, RULE_SEASON, RULE_LOOK } from '../src/game/seasonrules.js';
import { fusionFor, RARE_AS } from '../src/data/tiles.js';
import { fusedTile } from '../src/game/rules.js';
import { affinity, MER } from '../src/data/tiles.js';
import { BALANCE } from '../src/data/balance.js';
import { key, neighbors } from '../src/game/hex.js';
import { playStrong } from './bot.js';

let failures = 0; const check = (ok, m) => { if (!ok) failures++; console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };
const defDe = (seed, cells) => { const a = archipelMask(seed, cells); return { id: 'proto', livre2: true, chapter: 11, climate: 'temperate', mech: campaignMechanics(30), cells: a.cells, seed, mask: a.mask, detroit: a.detroit, seasonLength: 8, startSeason: 'summer', weights: poidsArchipel(), tilesRatio: 0.92, start: a.start, wishes: [], mechanics: [], surprise: true, starFactors: [4, 6, 8, 9], name: 'Archipel', intro: [], memoryText: '' }; };

// --- l'archipel : deux îles, un détroit qui les sépare, un port et un hameau par rive
{
  const a = archipelMask(107, 60);
  const terre = new Set([...a.mask].filter((k) => !a.detroit.includes(k)));
  const { composantes } = await import('../src/data/islands.js');
  const comps = composantes(terre);
  check(a.cells >= 54 && a.cells <= 66 && comps.length >= 2 && comps[1].size >= terre.size * 0.3, `deux îles (${comps[0].size} et ${comps[1].size} cases) séparées par un détroit de ${a.detroit.length} cases`);
  check(a.start.filter((s) => s.family === 'port').length === 2 && a.start.filter((s) => s.family === 'hamlet').length === 2, 'un port et un hameau de départ sur chaque rive');
  check(a.start.filter((s) => s.family === 'port').every((s) => neighbors(s.q, s.r).some(([q, r]) => a.detroit.includes(key(q, r)))), 'les ports de départ touchent le détroit');
}

// --- le détroit : la mer tant qu'il est vide ; seules les tuiles de mer s'y posent, et nulle part ailleurs
{
  const isl = new Island(defDe(107, 60), { upgrades: {} });
  const b = isl.board; const d = isl.def.detroit[0]; const [dq, dr] = d.split(',').map(Number);
  check(b.detroit.size === isl.def.detroit.length && b.mask.has(d) && b.isSea(dq, dr), 'les cases du détroit sont dans le masque et comptent comme la mer tant qu\'elles sont vides');
  const mer = { family: 'sea', variant: 1, id: 1 }, pre = { family: 'meadow', variant: 1, id: 2 };
  const legMer = b.legalCells(mer), legPre = b.legalCells(pre);
  check(legMer.length > 0 && legMer.every((c) => b.detroit.has(key(c.q, c.r))), `une tuile de mer ne se pose que sur le détroit (${legMer.length} cases)`);
  check(legPre.length > 0 && legPre.every((c) => !b.detroit.has(key(c.q, c.r))), `une prairie ne se pose jamais sur le détroit (${legPre.length} cases)`);
  const c = legMer[0]; b.place(c.q, c.r, mer);
  check(b.isSea(c.q, c.r) && Board.isFamily(b.get(c.q, c.r), 'sea') && !b.isEmpty(c.q, c.r), 'une case du détroit posée porte une tuile de mer, et reste la mer (côte, écume, embouchures)');
  const port = isl.def.start.find((s) => s.family === 'port');
  check(affinity('port', 'sea') === 2 && affinity('hamlet', 'port') === 2 && affinity('reef', 'sand') === 2 && affinity('kelp', 'marsh') === 2 && affinity('hamlet', 'reef') === -1 && affinity('port', 'port') === -1, 'les affinités de la mer : quai +2, ville portuaire +2, lagon +2, vasière +2, naufrage −1, deux ports −1');
  check(MER.has('sea') && MER.has('reef') && MER.has('kelp') && !MER.has('port') && !MER.has('pine'), 'la mer, le récif et les algues sont des tuiles de mer ; le port et la pinède sont des terres');
}

// --- les routes : une mer d'un seul tenant qui relie deux ports paie ; ses marchandises sont les terres autour des ports
{
  const isl = new Island(defDe(107, 60), { upgrades: {} }); const b = isl.board;
  const ports = isl.def.start.filter((s) => s.family === 'port');
  check(computeRoutes(b).every((r) => !r.pts), 'au départ, aucune route ne paie (rien n\'est posé sur le détroit)');
  // un chemin de mer entre les deux ports, par le détroit
  const cible = new Set(ports.map((p) => key(p.q, p.r)));
  const prev = new Map(); const file = []; const p0 = ports[0]; for (const [a, c] of neighbors(p0.q, p0.r)) if (b.detroit.has(key(a, c))) { prev.set(key(a, c), null); file.push(key(a, c)); }
  let arrivee = null;
  while (file.length && !arrivee) { const k = file.shift(); const [q, r] = k.split(',').map(Number); for (const [a, c] of neighbors(q, r)) { const nk = key(a, c); if (cible.has(nk) && nk !== key(p0.q, p0.r)) { arrivee = k; break; } if (b.detroit.has(nk) && !prev.has(nk)) { prev.set(nk, k); file.push(nk); } } }
  const chemin = []; for (let k = arrivee; k; k = prev.get(k)) chemin.push(k);
  for (const k of chemin) { const [q, r] = k.split(',').map(Number); b.place(q, r, { family: 'sea', variant: 1, id: 9 }); }
  const routes = computeRoutes(b); const payante = routes.find((r) => r.pts);
  const R = BALANCE.livre2.route;
  check(!!payante && payante.ports.length === 2 && payante.pts === R.port + payante.marchandises.length * R.marchandise, `une mer de ${chemin.length} cases relie les deux ports : la route paie ${payante ? payante.pts : 0} (${R.port} par port relié au-delà du premier + ${payante ? payante.marchandises.length : 0} marchandises)`);
  // la saison paie la route
  const avant = isl.score; isl.advanceSeason();
  check(isl.score - avant >= payante.pts && (isl.tally.s_route || 0) === payante.pts, `au changement de saison, la route est payée (+${isl.tally.s_route || 0} au cumul « route »)`);
}

// --- la chaîne de territoire : des familles toutes différentes, en paires fortes, dès quatre maillons
{
  const isl = new Island(defDe(107, 60), { upgrades: {} }); const b = isl.board;
  const C = BALANCE.livre2.chaine;
  check(C.des === 4 && C.min === 2, 'la chaîne part de quatre familles, en paires fortes (+2)');
  const c0 = chaineTerritoire(b);
  check(c0.length <= 3 || c0.pts === (C.pts[Math.min(c0.length, C.des + C.pts.length - 1) - C.des] || 0), `au départ, la chaîne fait ${c0.length} (${c0.families.join(' › ')}) et paie ${c0.pts}`);
  // on la construit : port › hameau (départ) › champ › ... en posant côté terre
  const hameau = isl.def.start.find((s) => s.family === 'hamlet'); const port = isl.def.start.find((s) => s.family === 'port' && neighbors(s.q, s.r).some(([a, c]) => a === hameau.q && c === hameau.r));
  const libre = (q, r) => neighbors(q, r).find(([a, c]) => b.isEmpty(a, c) && !b.detroit.has(key(a, c)) && !isl.def.start.some((s) => s.q === a && s.r === c));
  const f1 = libre(hameau.q, hameau.r); b.place(f1[0], f1[1], { family: 'field', variant: 1, id: 3 });
  const c1 = chaineTerritoire(b);
  check(c1.length >= 3 && c1.families.includes('field') && c1.families.includes('hamlet'), `hameau › champ : la chaîne passe à ${c1.length} (${c1.families.join(' › ')})`);
  const distinct = new Set(c1.families).size === c1.families.length;
  const fortes = c1.families.every((f, i) => i === 0 || affinity(c1.families[i - 1], f) >= 2);
  check(distinct && fortes, 'toutes les familles de la chaîne sont différentes, et chaque maillon est une paire forte');
}

// --- une partie entière au robot : elle se termine, la mer est posée sur le détroit seulement, les rentes paient
{
  const { result: r, isl } = playStrong(defDe(114, 50), { seedOffset: 0, botSeed: 1 });
  check(!!r && r.score > 100, `le robot finit l'archipel (${r ? r.score : '?'} pts, ${r ? r.seasons : '?'} saisons)`);
  const mer = [...isl.board.tiles.values()].filter((t) => MER.has(t.family));
  check(mer.length > 0 && mer.every((t) => isl.board.detroit.has(key(t.q, t.r))), `${mer.length} tuiles de mer posées, toutes sur le détroit`);
  check([...isl.board.tiles.values()].filter((t) => !MER.has(t.family)).every((t) => !isl.board.detroit.has(key(t.q, t.r))), 'aucune tuile de terre sur le détroit');
  check((isl.tally.s_route || 0) > 0 || (isl.tally.s_chaine || 0) > 0, `les rentes de la mer ont payé (routes ${isl.tally.s_route || 0}, chaîne ${isl.tally.s_chaine || 0})`);
}


// ===================== lot 7b : les règles de mer =====================
/** Relie les deux ports de départ par un chemin de mer sur le détroit ; rend les cases du chemin. */
function relier(isl) {
  const b = isl.board; const ports = isl.def.start.filter((s) => s.family === 'port'); const cible = new Set(ports.map((p) => key(p.q, p.r)));
  const prev = new Map(); const file = []; const p0 = ports[0]; for (const [a, c] of neighbors(p0.q, p0.r)) if (b.detroit.has(key(a, c))) { prev.set(key(a, c), null); file.push(key(a, c)); }
  let arrivee = null;
  while (file.length && !arrivee) { const k = file.shift(); const [q, r] = k.split(',').map(Number); for (const [a, c] of neighbors(q, r)) { const nk = key(a, c); if (cible.has(nk) && nk !== key(p0.q, p0.r)) { arrivee = k; break; } if (b.detroit.has(nk) && !prev.has(nk)) { prev.set(nk, k); file.push(nk); } } }
  const chemin = []; for (let k = arrivee; k; k = prev.get(k)) chemin.push(k);
  for (const k of chemin) { const [q, r] = k.split(',').map(Number); b.place(q, r, { family: 'sea', variant: 1, id: 9 }); }
  return { chemin, ports };
}
const caseLibre = (isl, q, r, pred = () => true) => neighbors(q, r).find(([a, c]) => isl.board.isEmpty(a, c) && !isl.board.detroit.has(key(a, c)) && pred(a, c));
const defMech = (seed, cells, extra = {}) => ({ ...defDe(seed, cells), mech: new Set([...campaignMechanics(45)]), ...extra });

// --- la pinède fait de l'ombre : une prairie qui la touche ne sèche pas l'été
{
  const isl = new Island(defMech(107, 60), { upgrades: {} }); const b = isl.board;
  const h = isl.def.start.find((s) => s.family === 'hamlet');
  const c1 = caseLibre(isl, h.q, h.r); b.place(c1[0], c1[1], { family: 'meadow', variant: 1, id: 1 });
  const c2 = caseLibre(isl, c1[0], c1[1], (a, c) => !neighbors(a, c).some(([x, y]) => Board.isFamily(b.get(x, y), 'water'))); b.place(c2[0], c2[1], { family: 'pine', variant: 1, id: 2 });
  const ev = transition(b, 'summer', 'secheresse', {});
  check(!ev.some((e) => e.type === 'dry' && e.q === c1[0] && e.r === c1[1]), 'l’été, une prairie contre une pinède ne sèche pas (la pinède abrite comme la forêt)');
}

// --- la taverne et le marché vivent des routes ; le phare fait payer les routes qui le touchent
{
  const isl = new Island(defMech(107, 60), { upgrades: {} }); const b = isl.board;
  const { chemin, ports } = relier(isl); const R = BALANCE.livre2;
  const route = computeRoutes(b).find((r) => r.pts); check(!!route && route.ports.length === 2, `deux ports reliés par ${chemin.length} cases de mer`);
  const p = ports[0]; const ct = caseLibre(isl, p.q, p.r); b.place(ct[0], ct[1], { family: 'tavern', variant: 1, rare: true, id: 11 });
  const rt = rentesRares(b).find((e) => e.id === 'tavern');
  check(!!rt && rt.pts === Math.min(R.taverne.cap, 2) * R.taverne.pts, `la taverne contre un port relié paie +${rt ? rt.pts : 0} (deux ports sur la route)`);
  const cm = caseLibre(isl, p.q, p.r); b.place(cm[0], cm[1], { family: 'market', variant: 1, rare: true, id: 12 });
  const attendu = Math.min(R.marche.cap, computeRoutes(b).find((r) => r.ports.some((x) => x.q === p.q && x.r === p.r)).marchandises.length) * R.marche.pts;
  const rm = rentesRares(b).find((e) => e.id === 'market');
  check(rm ? rm.pts === attendu : attendu === 0, `le marché paie +${rm ? rm.pts : 0} : une par marchandise différente des routes de ses ports (${attendu} attendues)`);
  check(RARE_AS.tavern[0] === 'hamlet' && RARE_AS.market[0] === 'hamlet' && RARE_AS.phare[0] === 'rock', 'la taverne et le marché comptent comme hameau, le phare comme roche');
  // le phare : une case de terre qui touche une case du chemin
  const sansMarch = (r) => r.pts - r.marchandises.length * R.route.marchandise;   // le phare compte comme roche : posé contre un port, il serait aussi une marchandise
  const avantPhare = sansMarch(computeRoutes(b).find((r) => r.pts));
  let cp = null; for (const k of chemin) { const [q, r] = k.split(',').map(Number); cp = caseLibre(isl, q, r); if (cp) break; }
  b.place(cp[0], cp[1], { family: 'phare', variant: 1, rare: true, id: 13 });
  const apresPhare = sansMarch(computeRoutes(b).find((r) => r.pts));
  check(apresPhare === avantPhare + R.route.phare, `le phare fait payer la route qui le touche +${R.route.phare} (${avantPhare} → ${apresPhare}, marchandises à part)`);
  check(rentesLivre2(b) >= apresPhare + (rt ? rt.pts : 0) && rentesLivre2(b, 'tempete') < rentesLivre2(b), 'les rentes comptent le phare, la taverne et le marché ; sous la tempête, les routes ne paient pas');
  isl.rule = 'tempete';
  check(!isl.rentesMer(b).some((e) => e.type === 'route') && isl.rentesMer(b).some((e) => e.id === 'tavern'), 'sous la tempête, rentesMer ne paie pas les routes mais paie encore la taverne');
}

// --- le chantier naval : port + forêt, +1 par tuile de mer voisine à chaque saison
{
  const isl = new Island(defMech(107, 60), { upgrades: {} }); const b = isl.board;
  const rec = fusionFor('port', 'forest');
  check(!!rec && rec.id === 'shipyard' && rec.seasonal.family === 'sea' && rec.seasonal.cap === 3, 'port + forêt = chantier naval, +1 par mer voisine (au plus 3)');
  const { chemin, ports } = relier(isl); const p = ports[0];
  const nMer = neighbors(p.q, p.r).filter(([a, c]) => { const t = b.get(a, c); return t && MER.has(t.family); }).length;
  const t = fusedTile(b.get(p.q, p.r), rec, 'forest'); b.tiles.set(key(p.q, p.r), t); b.touch();
  const prime = isl.primesFixes(b, 'autumn').find((e) => e.type === 'fusion' && e.id === 'shipyard');
  check(Board.isFamily(t, 'port') && Board.isFamily(t, 'forest') && (nMer === 0 ? !prime : prime && prime.pts === Math.min(3, nMer)), `le chantier compte port et forêt et paie +${prime ? prime.pts : 0} pour ${nMer} tuile(s) de mer voisine(s)`);
  check(computeRoutes(b).some((r) => r.pts && r.ports.some((x) => x.q === p.q && x.r === p.r)), 'le chantier reste un port : la route qui le touche paie toujours');
}

// --- la tempête (hiver) et la marée (printemps)
{
  const isl = new Island(defMech(107, 60), { upgrades: {} }); const b = isl.board; const S2 = BALANCE.livre2;
  const { chemin } = relier(isl);
  const [q0, r0] = chemin[0].split(',').map(Number); b.tiles.get(chemin[0]).family = 'reef';
  const [q1, r1] = chemin[chemin.length - 1].split(',').map(Number); b.tiles.get(chemin[chemin.length - 1]).family = 'kelp';
  // une pinède au bord de la mer, une roche loin de tout pour l'eau
  let cp = null; for (const k of chemin) { const [q, r] = k.split(',').map(Number); cp = caseLibre(isl, q, r); if (cp) break; }
  b.place(cp[0], cp[1], { family: 'pine', variant: 1, id: 21 }); b.touch();
  const hiver = transition(b, 'winter', 'tempete', {});
  check(hiver.some((e) => e.type === 'tempete' && e.q === q0 && e.r === r0 && e.pts === S2.tempete.recif), `tempête : le récif rapporte +${S2.tempete.recif}`);
  check(hiver.some((e) => e.type === 'tempete' && e.q === cp[0] && e.r === cp[1] && e.pts === S2.tempete.pinede), `tempête : la pinède au bord de la mer rapporte +${S2.tempete.pinede}`);
  check(!hiver.some((e) => e.type === 'freeze' || e.type === 'veillee'), 'tempête : pas de gel, pas de veillée');
  const printemps = transition(b, 'spring', 'maree', {});
  const estran = printemps.filter((e) => e.type === 'maree');
  check(estran.length > 0 && estran.every((e) => e.pts === (Board.isFamily(b.get(e.q, e.r), 'kelp') ? S2.maree.algues : S2.maree.estran)), `marée basse : ${estran.length} tuile(s) de mer contre la terre paient l’estran (+${S2.maree.estran}, algues +${S2.maree.algues})`);
  check(estran.some((e) => e.q === q1 && e.r === r1 && e.pts === S2.maree.algues) || !neighbors(q1, r1).some(([a, c]) => { const n = b.get(a, c); return n && !MER.has(n.family) && !Board.isFamily(n, 'port'); }), 'les algues contre la terre paient +2');
  check(!printemps.some((e) => e.type === 'bloom' && e.pts), 'marée basse : les marais ne rapportent pas leur floraison');
  // les tables de règles : la tempête remplace l'hiver doux, la marée les semailles, dès leurs îles ; le Livre I ne change pas
  const t1 = reglesPour(campaignMechanics(30)), t2 = reglesPour(campaignMechanics(37)), t3 = reglesPour(campaignMechanics(40));
  check(t1 === SEASON_RULES && t2.winter.includes('tempete') && !t2.winter.includes('doux') && !t2.spring.includes('maree') && t3.spring.includes('maree') && !t3.spring.includes('semailles'), 'les surprises de mer remplacent une surprise de terre à partir de leurs îles, jamais avant');
  check(RULE_SEASON.tempete === 'winter' && RULE_SEASON.maree === 'spring', 'la tempête est d’hiver, la marée de printemps');
  const i37 = new Island(campaignIsland(37), { upgrades: {} });
  check(i37.reglesSaison.winter.includes('tempete') && i37.climate.id === 'windy' && i37.board.routePort === 1 && i37.look === 'wind' || i37.rule === 'foire' || i37.rule === 'semailles', `l’île 37 : tempête possible, climat venteux (routes +1 par port), le vent se voit (règle ${i37.rule}, look ${i37.look})`);
  const tirages = new Set(); for (let i = 0; i < 60; i++) tirages.add(i37.pickRare());
  check(tirages.has('phare') && tirages.has('tavern') && tirages.has('market'), `l’île 37 tire le phare, la taverne et le marché parmi ses rares (${[...tirages].join(', ')})`);
  const i33 = new Island(campaignIsland(33), { upgrades: {} }); const t33 = new Set(); for (let i = 0; i < 60; i++) t33.add(i33.pickRare());
  check(!t33.has('phare') && !t33.has('tavern'), 'l’île 33, avant les ports, ne tire ni taverne ni phare');
  check(MECH_AT[37].includes('tempete') && MECH_AT[37].includes('phare') && MECH_AT[40].includes('maree'), 'MECH_AT : tempête et phare à l’île 37, marée à la 40');
}

// --- le climat venteux : les routes paient +1 par port, un champ sans abri perd 1 par saison
{
  const isl = new Island(defMech(107, 60, { climate: 'windy' }), { upgrades: {} }); const b = isl.board; const R = BALANCE.livre2.route;
  const { ports } = relier(isl); const route = computeRoutes(b).find((r) => r.pts);
  check(b.routePort === 1 && route.pts === (R.port + 1) + route.marchandises.length * R.marchandise, `venteux : la route à deux ports paie ${route.pts} (${R.port + 1} par port au lieu de ${R.port})`);
  const h = isl.def.start.find((s) => s.family === 'hamlet');
  // un champ loin de tout abri : deux cases du hameau, sans forêt ni roche ni colline ni hameau ni pinède autour
  let expose = null; for (const k of b.mask) { const [q, r] = k.split(',').map(Number); if (!b.isEmpty(q, r) || b.detroit.has(k)) continue; if (!neighbors(q, r).some(([a, c]) => { const n = b.get(a, c); return n && ['forest', 'pine', 'hill', 'rock', 'hamlet'].some((f) => Board.isFamily(n, f)); })) { expose = [q, r]; break; } }
  b.place(expose[0], expose[1], { family: 'field', variant: 1, id: 31 });
  const ca = caseLibre(isl, h.q, h.r); b.place(ca[0], ca[1], { family: 'field', variant: 1, id: 32 });   // celui-ci touche le hameau : abrité
  const ev = transition(b, 'autumn', 'recolte', isl.climate);
  check(ev.some((e) => e.type === 'wind' && e.q === expose[0] && e.r === expose[1] && e.pts === -1) && !ev.some((e) => e.type === 'wind' && e.q === ca[0] && e.r === ca[1]), 'venteux : le champ sans abri perd 1, celui contre le hameau est abrité');
  check(isl.climate.longSeason === 'autumn' && (isl.look === 'wind' || (RULE_LOOK[isl.rule] && isl.look === RULE_LOOK[isl.rule])), `venteux : l’automne dure deux saisons et le vent souffle sur l’île quand la règle n’a pas son propre habillage (règle ${isl.rule}, look ${isl.look})`);
}

console.log(failures ? `${failures} échec(s)` : 'Tous les tests du Livre II passent.');
process.exit(failures ? 1 : 0);
