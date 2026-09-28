// Livre II — l'archipel : deux îles aux formes naturelles séparées par un détroit de mer posable.
//
// Le masque est celui d'une île étirée (generateMask, avec les baies et presqu'îles du Livre I), coupé par une bande
// verticale au milieu : ces cases sont le DÉTROIT — dans le masque, mais seules les tuiles de mer s'y posent, et tant
// qu'elles sont vides elles sont la mer (voir board.js). Le détroit n'a jamais à être rempli : l'île finit quand la file
// est vide, comme au Livre I. Sur chaque rive, un port et un hameau sont posés au départ : de quoi relier dès la
// première pose (« plus de tuiles au départ », le commanditaire).
import { generateMask, composantes, WEIGHTS } from './islands.js';
import { FAMILLES_LIVRE2 } from './tiles.js';
import { key, parse, neighbors } from '../game/hex.js';

const x = (q, r) => q + r / 2;

/**
 * @param {number} seed
 * @param {number} cells cases de terre (les deux îles ensemble) ; le détroit vient en plus
 * @param {{largeur?:number}} o largeur du détroit (cases)
 * @returns {{mask:Set<string>, detroit:string[], start:object[], cells:number}}
 */
export function archipelMask(seed, cells = 60, { largeur = 2 } = {}) {
  // Deux VRAIES îles (retour du commanditaire : « pas des traits droits, de vraies îles avec une mer entre les deux ») :
  // chacune vient du générateur du Livre I, avec ses baies et ses caps ; la seconde est glissée à droite de la première
  // jusqu'à ce que `largeur` cases de mer les séparent au plus étroit. Le détroit, ce sont les cases de mer entre les deux
  // rives, ligne par ligne, jamais plus loin que `largeur + 2` d'une côte : au large des baies qui se font face, la mer reste
  // la mer (hors du masque). Les rives ont donc la forme des îles, pas celle d'une règle.
  const nA = Math.round(cells * 0.55), nB = cells - nA;
  let mask = null, detroit = null, terre = null, start = [];
  for (let tries = 0; tries < 24 && !mask; tries++) {
    const A = generateMask(seed + tries * 977, nA, { roughness: 0.34, etire: 1.25, garde: [] });
    const B = generateMask(seed * 3 + 11 + tries * 977, nB, { roughness: 0.34, etire: 1.25, garde: [] });
    // bord droit de A et bord gauche de B, ligne par ligne (x = q + r/2 : la coordonnée horizontale des hexagones)
    const droite = new Map(), gauche = new Map();
    for (const k of A) { const [q, r] = parse(k); droite.set(r, Math.max(droite.get(r) ?? -Infinity, q)); }
    for (const k of B) { const [q, r] = parse(k); gauche.set(r, Math.min(gauche.get(r) ?? Infinity, q)); }
    // le décalage de B : au plus étroit, `largeur` cases de mer entre les deux (même ligne : q_B − q_A − 1 cases entre)
    let s = -Infinity;
    for (const [r, qa] of droite) if (gauche.has(r)) s = Math.max(s, qa + largeur + 1 - gauche.get(r));
    if (s === -Infinity) continue;   // aucune ligne commune : les îles ne se font pas face
    const Bd = new Set([...B].map((k) => { const [q, r] = parse(k); return key(q + s, r); }));
    // aucune case de A ne touche B (les voisins d'une ligne à l'autre) : sinon on écarte encore
    let touche = false; for (const k of A) { const [q, r] = parse(k); if (neighbors(q, r).some(([a, b]) => Bd.has(key(a, b)))) { touche = true; break; } }
    if (touche) { s += 1; }
    const B2 = touche ? new Set([...B].map((k) => { const [q, r] = parse(k); return key(q + s, r); })) : Bd;
    terre = new Set([...A, ...B2]);
    // le détroit : entre les deux rives, ligne par ligne, au plus `largeur + 2` cases de chaque côte
    detroit = new Set();
    const gaucheB = new Map(); for (const k of B2) { const [q, r] = parse(k); gaucheB.set(r, Math.min(gaucheB.get(r) ?? Infinity, q)); }
    for (const [r, qa] of droite) {
      if (!gaucheB.has(r)) continue; const qb = gaucheB.get(r);
      for (let q = qa + 1; q < qb; q++) if (q - qa <= largeur + 2 || qb - q <= largeur + 2) detroit.add(key(q, r));
    }
    // le détroit doit se tenir d'un seul tenant entre les deux ports : on garde la plus grande composante
    const comps = composantes(detroit); if (!comps.length) continue;
    detroit = new Set(comps[0]);
    // les deux îles doivent toucher le détroit (sinon une rive n'a pas de port possible)
    const touchent = [A, B2].every((ile) => [...ile].some((k) => { const [q, r] = parse(k); return neighbors(q, r).some(([a, b]) => detroit.has(key(a, b))); }));
    if (!touchent || detroit.size < largeur * 3) continue;
    mask = new Set([...terre, ...detroit]);
    // le départ : sur chaque île, un port sur la côte du détroit (la case de terre voisine du détroit la plus proche du milieu), un hameau à côté
    const ys = [...detroit].map((k) => parse(k)[1]).sort((a, b) => a - b); const ym = ys[Math.floor(ys.length / 2)];
    start = [];
    for (const comp of [A, B2]) {
      let best = null, bd = Infinity;
      for (const k of comp) { const [q, r] = parse(k); if (!neighbors(q, r).some(([a, b]) => detroit.has(key(a, b)))) continue; const d = Math.abs(r - ym); if (d < bd) { bd = d; best = [q, r]; } }
      if (!best) continue;
      start.push({ q: best[0], r: best[1], family: 'port' });
      const voisin = neighbors(best[0], best[1]).find(([a, b]) => comp.has(key(a, b)) && !start.some((t) => t.q === a && t.r === b));
      if (voisin) start.push({ q: voisin[0], r: voisin[1], family: 'hamlet' });
    }
  }
  if (!mask) throw new Error(`archipelMask : pas d'archipel pour la graine ${seed}`);
  return { mask, detroit: [...detroit], start, cells: terre.size };
}

/** La file d'un archipel : les familles de la côte, la pinède et le port, et une part `mer` de tuiles de mer (mer, récif, algues). */
export function poidsArchipel(base = WEIGHTS.coastAll, mer = 0.25) {
  const w = { ...base, pine: 7, port: 4 }; const somme = Object.values(w).reduce((a, b) => a + b, 0);
  const wm = somme * mer / (1 - mer); w.sea = Math.round(wm * 0.55); w.reef = Math.round(wm * 0.25); w.kelp = Math.round(wm * 0.2);
  return w;
}

/**
 * La côte (chapitre 11, « La Traversée ») : une seule île, et la mer qui la borde se pose — le détroit est la couronne
 * de cases autour de l'île. Pas de port : on apprend le récif, les algues et la chaîne avant de relier.
 */
export function coteMask(seed, cells = 50) {
  const start = [{ q: 0, r: 0, family: 'hamlet' }, { q: 2, r: -1, family: 'rock' }];
  const terre = generateMask(seed, cells, { roughness: 0.35, garde: start.map((t) => key(t.q, t.r)) });
  const detroit = new Set();
  for (const k of terre) { const [q, r] = parse(k); for (const [a, b] of neighbors(q, r)) { const nk = key(a, b); if (!terre.has(nk)) detroit.add(nk); } }
  return { mask: new Set([...terre, ...detroit]), detroit: [...detroit], start, cells: terre.size };
}

/** Les familles du Livre II que la file peut donner à l'île n (la mer dès 31, les ports dès leur chapitre). */
export function famillesMerPour(mech) { return FAMILLES_LIVRE2.filter((f) => mech.has('mer') && (f !== 'port' || mech.has('ports'))); }
