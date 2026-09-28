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
export function archipelMask(seed, cells = 60, { largeur = 2, iles = 2 } = {}) {
  // De VRAIES îles (retour du commanditaire : « pas des traits droits, de vraies îles avec une mer entre les deux ») :
  // chacune vient du générateur du Livre I, avec ses baies et ses caps ; les suivantes sont glissées à droite de ce qui est
  // déjà là jusqu'à ce que `largeur` cases de mer les séparent au plus étroit. Chaque détroit, ce sont les cases de mer
  // entre les deux rives, ligne par ligne, jamais plus loin que `largeur + 2` d'une côte : au large des baies qui se font
  // face, la mer reste la mer (hors du masque). Trois ou quatre îles (chapitre 15) se placent en chapelet, un détroit
  // entre chacune. Les rives ont donc la forme des îles, pas celle d'une règle.
  const n = Math.max(2, iles);
  // la première île a 55 % de la terre à deux, 40 % à trois ou quatre ; les autres se partagent le reste à parts égales
  const parts = []; { let reste = cells; const p0 = n === 2 ? 0.55 : 0.4; for (let i = 0; i < n; i++) { const p = i === n - 1 ? reste : Math.round(cells * (i === 0 ? p0 : (1 - p0) / (n - 1))); parts.push(Math.max(8, p)); reste -= parts[i]; } }
  const bordDroit = (ens) => { const m = new Map(); for (const k of ens) { const [q, r] = parse(k); m.set(r, Math.max(m.get(r) ?? -Infinity, q)); } return m; };
  const bordGauche = (ens) => { const m = new Map(); for (const k of ens) { const [q, r] = parse(k); m.set(r, Math.min(m.get(r) ?? Infinity, q)); } return m; };
  for (let tries = 0; tries < 24; tries++) {
    const ilesFaites = [];   // les composantes de terre, dans l'ordre, chacune un Set
    let terre = new Set(); const detroit = new Set(); let ok = true;
    for (let i = 0; i < n && ok; i++) {
      const g = i === 0 ? seed + tries * 977 : seed * 3 + 11 * i + tries * 977;
      let B = generateMask(g, parts[i], { roughness: 0.34, etire: 1.25, garde: [] });
      if (i === 0) { ilesFaites.push(B); terre = new Set(B); continue; }
      const droite = bordDroit(terre), gauche = bordGauche(B);
      let s = -Infinity;
      for (const [r, qa] of droite) if (gauche.has(r)) s = Math.max(s, qa + largeur + 1 - gauche.get(r));
      if (s === -Infinity) { ok = false; break; }   // aucune ligne commune : les îles ne se font pas face
      let Bd = new Set([...B].map((k) => { const [q, r] = parse(k); return key(q + s, r); }));
      // aucune case de la terre déjà là ne touche la nouvelle île (les voisins d'une ligne à l'autre) : sinon on écarte encore
      const touche = (X) => [...terre].some((k) => { const [q, r] = parse(k); return neighbors(q, r).some(([a, b]) => X.has(key(a, b))); });
      if (touche(Bd)) { s += 1; Bd = new Set([...B].map((k) => { const [q, r] = parse(k); return key(q + s, r); })); }
      // le détroit entre ce qui est là et la nouvelle île : ligne par ligne, au plus `largeur + 2` cases de chaque côte
      const gaucheB = bordGauche(Bd); const d = new Set();
      for (const [r, qa] of droite) { if (!gaucheB.has(r)) continue; const qb = gaucheB.get(r); for (let q = qa + 1; q < qb; q++) if (q - qa <= largeur + 2 || qb - q <= largeur + 2) d.add(key(q, r)); }
      const comps = composantes(d); if (!comps.length) { ok = false; break; }
      const dd = new Set(comps[0]);
      // les deux rives doivent toucher ce détroit
      const touchent = [ilesFaites[ilesFaites.length - 1], Bd].every((ile) => [...ile].some((k) => { const [q, r] = parse(k); return neighbors(q, r).some(([a, b]) => dd.has(key(a, b))); }));
      if (!touchent || dd.size < largeur * 3) { ok = false; break; }
      for (const k of dd) detroit.add(k);
      for (const k of Bd) terre.add(k); ilesFaites.push(Bd);
    }
    if (!ok) continue;
    const mask = new Set([...terre, ...detroit]);
    // le départ : sur chaque île, un port sur la côte d'un détroit (la case de terre voisine du détroit la plus proche du milieu), un hameau à côté
    const ys = [...detroit].map((k) => parse(k)[1]).sort((a, b) => a - b); const ym = ys[Math.floor(ys.length / 2)];
    const start = [];
    for (const comp of ilesFaites) {
      let best = null, bd = Infinity;
      for (const k of comp) { const [q, r] = parse(k); if (!neighbors(q, r).some(([a, b]) => detroit.has(key(a, b)))) continue; const dist = Math.abs(r - ym); if (dist < bd) { bd = dist; best = [q, r]; } }
      if (!best) continue;
      start.push({ q: best[0], r: best[1], family: 'port' });
      const voisin = neighbors(best[0], best[1]).find(([a, b]) => comp.has(key(a, b)) && !start.some((t) => t.q === a && t.r === b));
      if (voisin) start.push({ q: voisin[0], r: voisin[1], family: 'hamlet' });
    }
    return { mask, detroit: [...detroit], start, cells: terre.size, iles: ilesFaites.length };
  }
  throw new Error(`archipelMask : pas d'archipel pour la graine ${seed}`);
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
