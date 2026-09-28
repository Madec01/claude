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
  let mask, detroit, terre, tries = 0, total = cells + Math.round(largeur * Math.sqrt(cells) * 1.9);
  do {
    mask = generateMask(seed + tries * 977, total, { roughness: 0.32, etire: 2.2, garde: [] });
    const xs = [...mask].map((k) => { const [q, r] = parse(k); return x(q, r); }).sort((a, b) => a - b);
    const xm = xs[Math.floor(xs.length / 2)];
    detroit = new Set([...mask].filter((k) => { const [q, r] = parse(k); const d = x(q, r) - xm; return d >= -largeur / 2 && d < largeur / 2; }));
    terre = new Set([...mask].filter((k) => !detroit.has(k)));
    tries++;
    // la terre doit faire le compte demandé (la bande en prend plus ou moins) : on corrige la taille et on refait
    if (Math.abs(terre.size - cells) > 2 && tries < 20) { total += cells - terre.size; continue; }
  } while (tries < 20 && (composantes(terre).length < 2 || composantes(terre)[1].size < terre.size * 0.3));   // deux vraies îles, la petite au moins 30 % de la terre
  const comps = composantes(terre).slice(0, 2);
  // le départ : sur chaque île, un port sur la côte du détroit (la case de terre voisine du détroit la plus proche du milieu), un hameau à côté
  const ys = [...detroit].map((k) => parse(k)[1]).sort((a, b) => a - b); const ym = ys[Math.floor(ys.length / 2)];
  const start = [];
  for (const comp of comps) {
    let best = null, bd = Infinity;
    for (const k of comp) { const [q, r] = parse(k); if (!neighbors(q, r).some(([a, b]) => detroit.has(key(a, b)))) continue; const d = Math.abs(r - ym); if (d < bd) { bd = d; best = [q, r]; } }
    if (!best) continue;
    start.push({ q: best[0], r: best[1], family: 'port' });
    const voisin = neighbors(best[0], best[1]).find(([a, b]) => comp.has(key(a, b)) && !start.some((s) => s.q === a && s.r === b));
    if (voisin) start.push({ q: voisin[0], r: voisin[1], family: 'hamlet' });
  }
  return { mask: new Set([...terre, ...detroit]), detroit: [...detroit], start, cells: terre.size };
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
