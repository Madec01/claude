// Livre II — l'archipel : deux îles aux formes naturelles séparées par un détroit de mer posable.
//
// Le masque est celui d'une île étirée (generateMask, avec les baies et presqu'îles du Livre I), coupé par une bande
// verticale au milieu : ces cases sont le DÉTROIT — dans le masque, mais seules les tuiles de mer s'y posent, et tant
// qu'elles sont vides elles sont la mer (voir board.js). Le détroit n'a jamais à être rempli : l'île finit quand la file
// est vide, comme au Livre I. Sur chaque rive, un port et un hameau sont posés au départ : de quoi relier dès la
// première pose (« plus de tuiles au départ », le commanditaire).
import { generateMask, composantes, WEIGHTS } from './islands.js';
import { key, parse, neighbors } from '../game/hex.js';

const x = (q, r) => q + r / 2;

/**
 * @param {number} seed
 * @param {number} cells cases de terre (les deux îles ensemble) ; le détroit vient en plus
 * @param {{largeur?:number}} o largeur du détroit (cases)
 * @returns {{mask:Set<string>, detroit:string[], start:object[], cells:number}}
 */
export function archipelMask(seed, cells = 60, { largeur = 2 } = {}) {
  let mask, detroit, terre, tries = 0;
  do {
    const total = cells + Math.round(largeur * Math.sqrt(cells) * 1.4);
    mask = generateMask(seed + tries * 977, total, { roughness: 0.32, etire: 2.2, garde: [] });
    const xs = [...mask].map((k) => { const [q, r] = parse(k); return x(q, r); }).sort((a, b) => a - b);
    const xm = xs[Math.floor(xs.length / 2)];
    detroit = new Set([...mask].filter((k) => { const [q, r] = parse(k); const d = x(q, r) - xm; return d >= -largeur / 2 && d < largeur / 2; }));
    terre = new Set([...mask].filter((k) => !detroit.has(k)));
    tries++;
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
