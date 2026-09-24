// Mode « Sous la brume » : des cases de l'île cachent des tuiles déjà là. On voit quelles cases sont cachées et
// l'inventaire de ce qu'elles cachent, jamais quelle tuile est où ; on déduit en posant (chaque tuile posée contre la
// brume dit combien de ses voisines cachées sont de sa famille), on parie quand la déduction s'arrête.
// Modèle pur (sans DOM ni canvas) : génération de la brume, indices, solveur de déduction, dosage du hasard.
// Règles et décisions : FEUILLE_DE_ROUTE.md, « Sous la brume ».
import { Board } from './board.js';
import { key, parse, neighbors } from './hex.js';
import { RARE_AS } from '../data/tiles.js';
import { WEIGHTS } from '../data/islands.js';
import { RNG } from '../core/math.js';

/**
 * Les deux crans. `devoile` : voisines posées qu'il faut à une case cachée pour se dévoiler au passage de saison ;
 * `indices` : 1 = chaque pose contre la brume donne son indice, 2 = une pose sur deux ; `inventaire` : 'exact' (les
 * familles) ou 'couleur' (seulement les couleurs) ; `jalonObligatoire` : une saison sans jalon coûte `P.jalonManque` ;
 * `part` : part des cases de l'île sous la brume (un tiers : décision du commanditaire, qui voulait « beaucoup de tuiles
 * cachées ») ; `vise` : part des cases cachées qu'un joueur appliqué déduit (mesurée par le solveur, voir `deductibilite` ;
 * à un tiers de brume, 0,3 à 0,4 en Brume claire).
 */
export const CRANS = {
  claire: { id: 'claire', nom: 'Brume claire', devoile: 2, indices: 1, inventaire: 'exact', jalonObligatoire: false, part: 0.3, vise: 0.4 },
  epaisse: { id: 'epaisse', nom: 'Brume épaisse', devoile: 3, indices: 2, inventaire: 'couleur', jalonObligatoire: true, part: 0.3, vise: 0.15 },
};

/** Les points propres au mode. Le trésor est une première valeur, à régler en jouant. */
export const P = { jalonJuste: 5, jalonFaux: -5, jalonManque: -3, tresor: 8, cachee: -3 };

/** Les trésors possibles : les cinq rares de base. */
export const TRESORS = ['mill', 'chapel', 'watchtower', 'well', 'camp'];

/** Couleurs de l'inventaire en Brume épaisse : on sait « deux vertes, une bleue », pas lesquelles. */
export const COULEURS = { meadow: 'vert', forest: 'vert', orchard: 'vert', water: 'bleu', marsh: 'bleu', field: 'ocre', sand: 'ocre', hamlet: 'gris', rock: 'gris' };
export const NOMS_COULEURS = { vert: 'vertes', bleu: 'bleues', ocre: 'ocres', gris: 'grises', tresor: 'trésor' };
/** Couleur d'une tuile cachée : le trésor est à part (il est annoncé comme tel). */
export function couleurDe(t) { return t.rare ? 'tresor' : COULEURS[t.family] || 'gris'; }

/** Familles « effectives » d'une sorte de tuile (une rare compte pour celles qu'elle représente). */
function famillesDe(sorte) { return RARE_AS[sorte] || [sorte]; }

/** Une tuile cachée de sorte `sorte` compte-t-elle dans l'indice d'une tuile posée de familles `fams` ? */
export function compte(sorte, fams) { const f = famillesDe(sorte); return fams.some((x) => f.includes(x)); }

/**
 * Indice lu à la pose : combien des voisines cachées de (q, r) sont de la famille de `tile`.
 * @param {Board} board @param {Map<string,object>} cachees clé → tuile cachée
 */
export function indice(board, cachees, q, r, tile) {
  const fams = Board.familiesOf(tile);
  let n = 0;
  for (const [a, b] of neighbors(q, r)) { const k = key(a, b); if (board.fog.has(k) && cachees.has(k) && compte(cachees.get(k).family, fams)) n++; }
  return n;
}

/** Voisines « solides » d'une case cachée : des cases de l'île qui ne sont pas sous la brume. */
function solides(board, fog, q, r) { return neighbors(q, r).filter(([a, b]) => { const k = key(a, b); return board.mask.has(k) && !fog.has(k); }).length; }


/**
 * Choisit `n` cases sous la brume parmi les cases libres. Chacune garde au moins `k` voisines hors brume (sinon elle
 * ne pourrait jamais se dévoiler), et deux cases cachées ne se touchent jamais.
 */
export function choisirBrume(board, rng, n, k) {
  const fog = new Set();
  const libres = [...board.mask].filter((c) => !board.tiles.has(c));
  let essais = 0;
  while (fog.size < n && essais++ < 400) {
    // jamais deux cases cachées côte à côte (décision du commanditaire) : chaque banc de brume est une case seule,
    // entourée de cases où l'on peut poser — c'est là que l'indice se lit
    const pool = libres.filter((c) => !fog.has(c) && !neighbors(...parse(c)).some(([a, b]) => fog.has(key(a, b))));
    if (!pool.length) break;
    const c = pool[Math.floor(rng.next() * pool.length)];
    fog.add(c);
    const ok = [...fog].every((f) => solides(board, fog, ...parse(f)) >= k);   // (plus besoin que l'île reste d'un seul tenant : on pose aussi contre la brume)
    if (!ok) fog.delete(c);
  }
  return fog;
}

/** Tire les tuiles cachées : des tuiles ordinaires selon les poids de l'île, et un trésor. */
export function tirerCachees(fog, rng, weights = WEIGHTS.balanced) {
  const fams = Object.keys(weights).filter((f) => weights[f] > 0 && COULEURS[f]);
  const somme = fams.reduce((s, f) => s + weights[f], 0);
  const cles = [...fog].sort();
  const out = new Map();
  const tresorA = cles[Math.floor(rng.next() * cles.length)];
  let id = 0;
  for (const c of cles) {
    if (c === tresorA) { out.set(c, { family: TRESORS[Math.floor(rng.next() * TRESORS.length)], variant: 1, rare: true, tresor: true, id: --id }); continue; }
    let x = rng.next() * somme, family = fams[0];
    for (const f of fams) { x -= weights[f]; if (x <= 0) { family = f; break; } }
    out.set(c, { family, variant: 1, rare: false, id: --id });
  }
  return out;
}

/** Inventaire montré au joueur : par famille (Brume claire) ou par couleur (Brume épaisse). @returns {Array<{id,n}>} */
export function inventaire(cachees, cran) {
  const compteur = new Map();
  for (const t of cachees.values()) { const id = cran.inventaire === 'couleur' ? couleurDe(t) : t.family; compteur.set(id, (compteur.get(id) || 0) + 1); }
  return [...compteur.entries()].map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n || a.id.localeCompare(b.id));
}

// ---- Solveur ----

/**
 * Ce qu'on peut déduire. `cases` : les clés cachées ; `inv` : l'inventaire (familles, ou couleurs) ; `contraintes` :
 * les indices lus, { voisines: [clés cachées], fams: familles de la tuile posée, n }. En Brume épaisse, `sortes`
 * donne les familles possibles de chaque couleur.
 * @returns {Map<string, Set<string>>} pour chaque case cachée, les sortes encore possibles
 */
export function possibles(cases, inv, contraintes, cran, budget = 4000, sortesTresor = TRESORS) {
  const idx = new Map(cases.map((c, i) => [c, i]));
  // le domaine : en exact, les sortes de l'inventaire ; en couleur, toutes les familles des couleurs annoncées
  const groupeDe = (s) => (cran.inventaire === 'couleur' ? (TRESORS.includes(s) ? 'tresor' : COULEURS[s]) : s);
  const capacite = new Map(inv.map((e) => [e.id, e.n]));
  let domaine;
  if (cran.inventaire === 'couleur') {
    domaine = [];
    for (const [s, c] of Object.entries(COULEURS)) if (capacite.has(c)) domaine.push(s);
    if (capacite.has('tresor')) domaine.push(...sortesTresor);
  } else domaine = inv.map((e) => e.id);
  const C = contraintes.map((c) => ({ v: c.voisines.map((k) => idx.get(k)).filter((i) => i !== undefined), ok: new Set(domaine.filter((s) => compte(s, c.fams))), n: c.n }));
  const parCase = cases.map(() => []);
  C.forEach((c, j) => { for (const i of c.v) parCase[i].push(j); });
  // ordre : les cases les plus contraintes d'abord
  const ordre = cases.map((_, i) => i).sort((a, b) => parCase[b].length - parCase[a].length);
  const val = new Array(cases.length).fill(null);
  const pris = new Map(), dedans = C.map(() => 0), restent = C.map((c) => c.v.length);
  const possible = cases.map(() => new Set());

  const tenable = (i) => parCase[i].every((j) => dedans[j] <= C[j].n && dedans[j] + restent[j] >= C[j].n);
  function poser(i, s) { val[i] = s; const g = groupeDe(s); pris.set(g, (pris.get(g) || 0) + 1); for (const j of parCase[i]) { restent[j]--; if (C[j].ok.has(s)) dedans[j]++; } }
  function oter(i, s) { val[i] = null; const g = groupeDe(s); pris.set(g, pris.get(g) - 1); for (const j of parCase[i]) { restent[j]++; if (C[j].ok.has(s)) dedans[j]--; } }
  // cherche une solution complète. Un budget de nœuds borne la recherche (le téléphone ne doit pas geler) : au-delà,
  // la sorte est tenue pour possible — on se trompe alors du côté prudent, une case de moins « déductible ».
  let noeuds = 0;
  function chercher(p) {
    if (p === ordre.length) return true;
    if (++noeuds > budget) { deborde = true; return true; }
    const i = ordre[p];
    if (val[i] !== null) return chercher(p + 1);
    for (const s of domaine) {
      const g = groupeDe(s); if ((pris.get(g) || 0) >= (capacite.get(g) || 0)) continue;
      poser(i, s);
      if (tenable(i) && chercher(p + 1)) return true;
      oter(i, s);
    }
    return false;
  }
  let deborde = false;
  function noter() { if (deborde) { possible[iCourant].add(sCourant); deborde = false; return; } val.forEach((s, i) => possible[i].add(s)); }
  let iCourant = 0, sCourant = null;
  function vider() { for (let i = 0; i < val.length; i++) if (val[i] !== null) oter(i, val[i]); }
  // pour chaque case et chaque sorte pas encore vue possible : une solution existe-t-elle avec cette case fixée ?
  // Chaque solution trouvée marque d'un coup toutes ses cases (c'est ce qui rend la chose rapide).
  for (let i = 0; i < cases.length; i++) {
    for (const s of domaine) {
      if (possible[i].has(s)) continue;
      const g = groupeDe(s); if (!capacite.get(g)) continue;
      poser(i, s); noeuds = 0; iCourant = i; sCourant = s;
      if (tenable(i) && chercher(0)) noter();
      vider(); deborde = false;
    }
  }
  return new Map(cases.map((c, i) => [c, possible[i]]));
}

/**
 * Part des cases cachées qu'on déduit. Le joueur modèle pose une tuile, d'une famille tirée selon les poids, sur chaque
 * case libre qui touche la brume, et lit son indice (une pose sur deux en Brume épaisse). Moyenne sur `tirages`
 * parties : c'est un joueur appliqué, pas un devin (il ne choisit pas sa question, il n'use ni jalon ni déplacement).
 */
export function deductibilite(board, cachees, cran, rng, tirages = 4, weights = WEIGHTS.balanced) {
  const cases = [...board.fog].sort();
  if (!cases.length) return 1;
  const inv = inventaire(cachees, cran);
  const fams = Object.keys(weights).filter((f) => weights[f] > 0 && COULEURS[f]);
  const somme = fams.reduce((s, f) => s + weights[f], 0);
  const bord = [];
  for (const k of board.mask) {
    if (board.fog.has(k) || board.tiles.has(k)) continue;
    const [q, r] = parse(k); const v = neighbors(q, r).map(([a, b]) => key(a, b)).filter((x) => board.fog.has(x));
    if (v.length) bord.push({ q, r, v });
  }
  // les familles qui ont un sens à demander : celles de l'inventaire, ou des couleurs annoncées en Brume épaisse
  const utiles = new Set(fams.filter((f) => [...cachees.values()].some((c) => (cran.inventaire === 'couleur' ? couleurDe(c) === COULEURS[f] : compte(c.family, [f])))));
  let total = 0;
  for (let t = 0; t < tirages; t++) {
    const contraintes = [];
    bord.forEach((b, i) => {
      if (cran.indices === 2 && (i + t) % 2) return;
      // trois tuiles en main : il pose celle qui pose une vraie question (une famille que la brume peut cacher)
      const main = [0, 1, 2].map(() => { let x = rng.next() * somme; for (const f of fams) { x -= weights[f]; if (x <= 0) return f; } return fams[0]; });
      const family = main.find((f) => utiles.has(f)) || main[0];
      const n = b.v.filter((k) => compte(cachees.get(k).family, [family])).length;
      contraintes.push({ voisines: b.v, fams: [family], n });
    });
    const pos = possibles(cases, inv, contraintes, cran);
    total += cases.filter((c) => pos.get(c).size === 1).length / cases.length;
  }
  return total / tirages;
}

/**
 * Prépare la brume d'une île déjà munie de ses tuiles de départ : plusieurs tirages, on garde celui dont la part
 * déductible est la plus proche de celle que vise le cran (le hasard est un réglage, pas un accident).
 * @returns {{ fog:Set<string>, cachees:Map<string,object>, deduc:number, essais:number }}
 */
export function preparerBrume(board, cran, seed, weights = WEIGHTS.balanced, essais = cran.inventaire === 'couleur' ? 6 : 10) {
  const libres = [...board.mask].filter((k) => !board.tiles.has(k)).length;
  const n = Math.max(5, Math.min(24, Math.round(board.mask.size * cran.part)));   // un tiers de l'île, décision du commanditaire (5 à 10 au départ : trop peu)
  let meilleur = null;
  for (let e = 0; e < essais; e++) {
    const rng = new RNG(seed * 131 + e * 7919 + 17);
    const fog = choisirBrume(board, rng, Math.min(n, libres - 4), cran.devoile);
    if (fog.size < 3) continue;
    const cachees = tirerCachees(fog, rng, weights);
    const avant = board.fog; board.fog = fog;
    const deduc = deductibilite(board, cachees, cran, new RNG(seed + e), cran.inventaire === 'couleur' ? 3 : 4, weights);
    board.fog = avant;
    const ecart = Math.abs(deduc - cran.vise);
    if (!meilleur || ecart < meilleur.ecart) meilleur = { fog, cachees, deduc, ecart, essais: e + 1 };
    if (ecart <= 0.06) break;
  }
  return meilleur;
}

/**
 * Définition d'une île « Sous la brume » : procédurale, une île par graine. 45 à 55 cases, saisons de cinq poses,
 * un hameau et une roche au départ, pas de vœux.
 */
export function brumeDef(cran = 'claire', seed = 1) {
  const rng = new RNG(seed * 97 + 3);
  const cells = 45 + Math.floor(rng.next() * 11);
  return {
    id: 'brume', brume: CRANS[cran] ? cran : 'claire', arch: 0, cells, seed, roughness: 0.35 + rng.next() * 0.1, holes: 0,
    seasonLength: 5, startSeason: 'spring', weights: WEIGHTS.balanced, tilesRatio: 1,
    start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 2, r: -1, family: 'rock' }], wishes: [], mechanics: [],
    name: CRANS[cran] ? CRANS[cran].nom : CRANS.claire.nom,
  };
}
