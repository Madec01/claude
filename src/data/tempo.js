// « Le Souffle court » : le mode à part où la tuile arrive au dernier moment et où le cadran se vide en trois secondes.
// Une île procédurale à chaque partie, sans histoire, sans vœu, sans souffle ; autant de tuiles que de cases, et ce qui
// n'est pas posé à temps est perdu — les cases vides se paient à la fin. Ici : la définition d'île et les règles pures
// (malus des cases vides, paliers de série), testables sans navigateur. Le cadran et les saisons vivent dans game/tempo.js.
import { WEIGHTS } from './islands.js';
import { BALANCE } from './balance.js';
import { RNG } from '../core/math.js';
import { key, neighbors } from '../game/hex.js';
import { Board } from '../game/board.js';

const T = () => BALANCE.tempo;

/**
 * L'île d'une partie : tirée d'une graine (rejouable), 40 à 60 cases, une seule tuile de départ. `etire` : le rapport
 * hauteur/largeur de l'île — plus haute que large sur un écran en portrait, pour qu'elle remplisse l'écran.
 */
export function tempoDef(seed = Math.floor(Math.random() * 1e9), { etire = 1 } = {}) {
  const rng = new RNG(seed);
  const t = T();
  const cells = t.cellsMin + Math.floor(rng.next() * (t.cellsMax - t.cellsMin + 1));
  const sets = ['all', 'balanced', 'rivers', 'farms', 'coastAll', 'hills', 'moorFarm', 'gentle'];
  const weights = WEIGHTS[sets[Math.floor(rng.next() * sets.length)]];
  return {
    id: 'tempo', tempo: true, seed, arch: 0, cells, roughness: 0.35 + rng.next() * 0.15, holes: rng.next() < 0.5 ? 1 : 2, etire,
    seasonLength: t.seasonLength, startSeason: 'spring', weights, tilesRatio: 1,
    start: [{ q: 0, r: 0, family: 'hamlet' }], wishes: [], mechanics: [], surprise: false, name: 'Le Souffle court',
  };
}

/** Le multiplicateur que vaut une série. */
export function multDe(serie) { let m = 1; for (const [n, k] of T().paliers) if (serie >= n) m = k; return m; }

/**
 * Le malus des cases restées vides à la fin : par case ; plus fort quand la case est la seule qui manque à une région
 * pour se fermer ; plus fort encore dans une « région vide » (des cases vides qui se touchent, à partir de trois).
 * Rend le détail, pour le bilan.
 */
export function videsMalus(board) {
  const t = T();
  const vides = [...board.mask].filter((k) => !board.tiles.has(k));
  const videsSet = new Set(vides);
  // les régions vides : parcours en largeur sur les cases vides voisines
  const regionDe = new Map(); const tailles = [];
  for (const k0 of vides) {
    if (regionDe.has(k0)) continue;
    const id = tailles.length; const file = [k0]; regionDe.set(k0, id); let n = 0;
    while (file.length) { const k = file.pop(); n++; const [q, r] = k.split(',').map(Number); for (const [a, b] of neighbors(q, r)) { const kk = key(a, b); if (videsSet.has(kk) && !regionDe.has(kk)) { regionDe.set(kk, id); file.push(kk); } } }
    tailles.push(n);
  }
  // une case « bloque » si une région voisine n'a plus qu'elle comme case ouverte
  const bloque = (q, r) => {
    const vu = new Set();
    for (const [a, b] of neighbors(q, r)) {
      const tile = board.get(a, b); if (!tile) continue;
      for (const fam of Board.familiesOf(tile)) {
        const reg = board.region(a, b, fam); if (!reg || vu.has(reg.id)) continue; vu.add(reg.id);
        if (reg.cells.every((c) => c.start)) continue;   // la tuile de départ seule ne fait pas une région à fermer
        const ouvertes = new Set();
        for (const c of reg.cells) for (const [x, y] of neighbors(c.q, c.r)) if (board.has(x, y) && !board.get(x, y)) ouvertes.add(key(x, y));
        if (ouvertes.size === 1 && ouvertes.has(key(q, r))) return true;
      }
    }
    return false;
  };
  let total = 0, nBloque = 0, nRegion = 0;
  for (const k of vides) {
    const [q, r] = k.split(',').map(Number);
    const enRegion = tailles[regionDe.get(k)] >= t.videRegionDes;
    total += enRegion ? t.videRegion : t.vide; if (enRegion) nRegion++;
    if (bloque(q, r)) { total += t.videBloque; nBloque++; }
  }
  return { total, vides: vides.length, bloquent: nBloque, enRegion: nRegion, regions: tailles.filter((n) => n >= t.videRegionDes).length };
}
