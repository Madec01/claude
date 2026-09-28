// Livre II (28 septembre, prototype) : l'archipel, le détroit, les tuiles de mer, les routes et la chaîne de territoire.
import { archipelMask, poidsArchipel } from '../src/data/archipel.js';
import { Island } from '../src/game/island.js';
import { Board } from '../src/game/board.js';
import { computeRoutes, chaineTerritoire } from '../src/game/routes.js';
import { campaignMechanics } from '../src/data/campaign.js';
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
  check(!b.isSea(c.q, c.r) && Board.isFamily(b.get(c.q, c.r), 'sea'), 'une case du détroit posée n\'est plus la mer vide : c\'est une tuile de mer');
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

console.log(failures ? `${failures} échec(s)` : 'Tous les tests du Livre II passent.');
process.exit(failures ? 1 : 0);
