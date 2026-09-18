// Les 12 îles de la campagne, l'Île infinie et le Jardin. Les masques sont générés de façon déterministe (seed).
import { RNG } from '../core/math.js';
import { neighbors, key } from '../game/hex.js';

/**
 * Génère un masque d'île : croissance aléatoire depuis le centre, avec baies et éventuels lacs (trous).
 * @returns {Set<string>} clés "q,r"
 */
export function generateMask(seed, cells, { roughness = 0.35, holes = 0 } = {}) {
  const rng = new RNG(seed);
  const mask = new Set([key(0, 0)]);
  const frontier = new Map();
  const addFrontier = (q, r) => { for (const [nq, nr] of neighbors(q, r)) { const k = key(nq, nr); if (!mask.has(k) && !frontier.has(k)) frontier.set(k, { q: nq, r: nr, w: rng.next() }); } };
  addFrontier(0, 0);
  while (mask.size < cells && frontier.size) {
    // choisir une case de la frontière en favorisant celles proches du centre (compacité) mais avec du bruit
    let best = null, bestScore = -Infinity;
    for (const f of frontier.values()) {
      const d = Math.hypot(f.q + f.r / 2, f.r * 0.866);
      const n = neighbors(f.q, f.r).filter(([a, b]) => mask.has(key(a, b))).length;
      const score = -d * (1 - roughness) + n * 0.6 + f.w * roughness * 4;
      if (score > bestScore) { bestScore = score; best = f; }
    }
    frontier.delete(key(best.q, best.r));
    mask.add(key(best.q, best.r));
    addFrontier(best.q, best.r);
  }
  // trous (lacs intérieurs = mer intérieure)
  const list = [...mask];
  for (let h = 0; h < holes; h++) {
    const k = list[Math.floor(rng.next() * list.length)];
    const [q, r] = k.split(',').map(Number);
    if (q === 0 && r === 0) continue;
    if (neighbors(q, r).every(([a, b]) => mask.has(key(a, b)))) mask.delete(k);
  }
  return mask;
}

const W = {
  gentle:  { meadow: 22, forest: 20, field: 12, hamlet: 10, orchard: 8, water: 12, marsh: 5, rock: 7, sand: 4 },
  rivers:  { meadow: 18, forest: 16, field: 10, hamlet: 10, orchard: 6, water: 20, marsh: 8, rock: 8, sand: 4 },
  farms:   { meadow: 18, forest: 12, field: 18, hamlet: 14, orchard: 12, water: 10, marsh: 4, rock: 6, sand: 6 },
  wild:    { meadow: 16, forest: 24, field: 6, hamlet: 8, orchard: 6, water: 12, marsh: 10, rock: 12, sand: 6 },
  coast:   { meadow: 16, forest: 12, field: 10, hamlet: 12, orchard: 8, water: 16, marsh: 8, rock: 6, sand: 12 },
  balanced:{ meadow: 16, forest: 16, field: 12, hamlet: 12, orchard: 10, water: 14, marsh: 7, rock: 8, sand: 5 },
  hills:   { meadow: 14, forest: 16, field: 8, hamlet: 10, orchard: 8, water: 12, marsh: 5, rock: 10, sand: 3, hill: 12 },
  ridges:  { meadow: 14, forest: 20, field: 6, hamlet: 8, orchard: 6, water: 12, marsh: 8, rock: 10, sand: 4, hill: 10 },
  moor:    { meadow: 14, forest: 12, field: 8, hamlet: 10, orchard: 6, water: 12, marsh: 6, rock: 8, sand: 5, hill: 8, heath: 12 },
  moorFarm:{ meadow: 14, forest: 10, field: 14, hamlet: 12, orchard: 8, water: 12, marsh: 4, rock: 6, sand: 4, hill: 6, heath: 10 },
  coastAll:{ meadow: 14, forest: 10, field: 8, hamlet: 12, orchard: 8, water: 16, marsh: 6, rock: 6, sand: 10, hill: 6, heath: 8 },
  all:     { meadow: 14, forest: 14, field: 10, hamlet: 12, orchard: 8, water: 13, marsh: 6, rock: 8, sand: 5, hill: 8, heath: 8 },
};

// starFactors : seuils d'étoiles en points par case (55 / 80 / 100 % de la médiane du bot fort, voir tools/calibrate.js) ; la 3e étoile exige aussi tous les vœux.
export const ISLANDS = [
  { id: 1,  arch: 1, cells: 30, starFactors: [2.5, 3.6, 4.5], seed: 1101, roughness: 0.2, holes: 0, seasonLength: 6, startSeason: 'spring', weights: W.gentle, tilesRatio: 0.95, opening: ['meadow', 'forest', 'field', 'hamlet', 'water', 'field', 'orchard', 'meadow', 'forest'], ensure: [[1, 0], [2, 0], [-1, 0], [-1, 1], [1, -1], [0, 1], [1, 1]], guided: true, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 2, r: -1, family: 'rock' }], wishes: [], mechanics: ['affinity', 'close', 'season'], music: 'spring' },
  { id: 2,  arch: 1, cells: 36, starFactors: [3.1, 4.5, 5.6], seed: 1202, roughness: 0.3, holes: 0, seasonLength: 7, startSeason: 'spring', weights: W.rivers, tilesRatio: 0.95, opening: ['water', 'meadow', 'water'], start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -2, r: 1, family: 'rock' }, { q: 2, r: 1, family: 'rock' }], mechanics: ['river', 'wish'],
    wishes: [ { id: 'w2_1', type: 'river', minLen: 3, deadline: { placements: 26 } } ] },
  { id: 3,  arch: 1, cells: 42, starFactors: [3.2, 4.6, 5.8], seed: 1303, roughness: 0.3, holes: 0, seasonLength: 8, startSeason: 'spring', weights: W.farms, tilesRatio: 0.95, opening: ['field', 'meadow', 'hamlet'], start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 1, r: -2, family: 'rock' }], mechanics: ['breath'],
    wishes: [ { id: 'w3_1', type: 'pairs', a: 'field', b: 'hamlet', count: 2, deadline: { placements: 26 } }, { id: 'w3_2', type: 'closed', family: 'meadow', size: 3, deadline: { placements: 38 } } ] },
  { id: 4,  arch: 1, cells: 48, starFactors: [2.8, 4.0, 5.0], seed: 1404, roughness: 0.35, holes: 0, seasonLength: 9, startSeason: 'spring', weights: W.wild, tilesRatio: 0.95, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -2, r: 0, family: 'rock' }, { q: 2, r: -2, family: 'rock' }, { q: 1, r: 2, family: 'ruins' }], mechanics: ['fauna'],
    wishes: [ { id: 'w4_1', type: 'fauna', species: 'rabbit', deadline: { placements: 30 } }, { id: 'w4_2', type: 'region', family: 'forest', size: 4, deadline: { placements: 42 } } ] },
  { id: 5,  arch: 2, cells: 54, starFactors: [3.0, 4.4, 5.5], seed: 2505, roughness: 0.35, holes: 1, seasonLength: 10, startSeason: 'spring', weights: W.rivers, tilesRatio: 0.93, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -3, r: 1, family: 'rock' }, { q: 2, r: -2, family: 'rock' }], mechanics: [],
    wishes: [ { id: 'w5_1', type: 'region', family: 'forest', size: 6, deadline: { placements: 36 } }, { id: 'w5_2', type: 'river', minLen: 2, mouth: true, deadline: { placements: 40 } }, { id: 'w5_3', type: 'fauna', species: 'rabbit', deadline: { placements: 36 } } ] },
  { id: 6,  arch: 2, cells: 60, starFactors: [3.1, 4.5, 5.6], seed: 2606, roughness: 0.4, holes: 1, seasonLength: 10, startSeason: 'summer', weights: W.farms, tilesRatio: 0.93, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 3, r: 0, family: 'hamlet' }, { q: -2, r: 2, family: 'rock' }], mechanics: ['rare', 'build'],
    wishes: [ { id: 'w6_1', type: 'pairs', a: 'field', b: 'hamlet', count: 3, deadline: { placements: 30 } }, { id: 'w6_2', type: 'closed', family: 'meadow', size: 4, deadline: { placements: 44 } }, { id: 'w6_3', type: 'fauna', species: 'duck', deadline: { placements: 40 } } ] },
  { id: 7,  arch: 2, cells: 66, starFactors: [3.5, 5.0, 6.3], seed: 2707, roughness: 0.4, holes: 2, seasonLength: 10, startSeason: 'spring', weights: W.hills, tilesRatio: 0.92, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -3, r: 0, family: 'rock' }, { q: 2, r: 2, family: 'ruins' }], mechanics: ['hill', 'work'],
    wishes: [ { id: 'w7_1', type: 'pairs', a: 'orchard', b: 'hamlet', count: 3, deadline: { season: 'autumn' } }, { id: 'w7_2', type: 'lake', size: 5, deadline: { placements: 40 } }, { id: 'w7_3', type: 'fauna', species: 'frog', deadline: { placements: 50 } } ] },
  { id: 8,  arch: 2, cells: 72, starFactors: [3.6, 5.2, 6.5], seed: 2808, roughness: 0.45, holes: 2, seasonLength: 9, startSeason: 'autumn', weights: W.ridges, tilesRatio: 0.92, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -4, r: 2, family: 'hamlet' }, { q: 3, r: -3, family: 'rock' }, { q: 1, r: 3, family: 'rock' }], mechanics: ['fuse'],
    wishes: [ { id: 'w8_1', type: 'fauna', species: 'moose', deadline: { placements: 45 } }, { id: 'w8_2', type: 'veillee', pairs: 1, deadline: { season: 'spring' } }, { id: 'w8_3', type: 'closed', size: 6, deadline: { placements: 60 } }, { id: 'w8_4', type: 'fusion', recipe: 'port', deadline: { placements: 64 } } ] },
  { id: 9,  arch: 3, cells: 84, starFactors: [3.9, 5.7, 7.1], seed: 3909, roughness: 0.45, holes: 2, seasonLength: 9, startSeason: 'spring', weights: W.moor, tilesRatio: 0.9, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -4, r: 1, family: 'rock' }, { q: 4, r: -2, family: 'rock' }, { q: 2, r: 3, family: 'rock' }, { q: -2, r: -2, family: 'ruins' }], mechanics: ['heath'],
    wishes: [ { id: 'w9_1', type: 'fauna', species: 'bear', deadline: { placements: 50 } }, { id: 'w9_2', type: 'river', minLen: 8, mouth: true, deadline: { placements: 70 } }, { id: 'w9_3', type: 'bourg', count: 3, deadline: { placements: 76 } } ] },
  { id: 10, arch: 3, cells: 96, starFactors: [4.2, 6.1, 7.6], seed: 3010, roughness: 0.5, holes: 3, seasonLength: 9, startSeason: 'summer', weights: W.moorFarm, tilesRatio: 0.9, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 5, r: -1, family: 'hamlet' }, { q: -3, r: 3, family: 'rock' }, { q: -1, r: -4, family: 'rock' }], mechanics: [],
    wishes: [ { id: 'w10_1', type: 'fauna', species: 'chicken', deadline: { placements: 50 } }, { id: 'w10_2', type: 'irrigated', count: 5, deadline: { season: 'autumn' } }, { id: 'w10_3', type: 'bloom', count: 4, deadline: { season: 'summer', cycle: 2 } }, { id: 'w10_4', type: 'fusion', recipe: 'cave', deadline: { placements: 86 } } ] },
  { id: 11, arch: 3, cells: 108, starFactors: [4.6, 6.7, 8.4], seed: 3111, roughness: 0.5, holes: 3, seasonLength: 8, startSeason: 'autumn', weights: W.coastAll, tilesRatio: 0.9, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -5, r: 2, family: 'rock' }, { q: 4, r: 1, family: 'rock' }, { q: 0, r: -4, family: 'ruins' }, { q: 3, r: -4, family: 'hamlet' }], mechanics: [],
    wishes: [ { id: 'w11_1', type: 'fauna', species: 'penguin', deadline: { season: 'spring' } }, { id: 'w11_2', type: 'harvest', count: 4, deadline: { placements: 80 } }, { id: 'w11_3', type: 'closed', family: 'forest', size: 10, deadline: { placements: 96 } } ] },
  { id: 12, arch: 3, cells: 120, starFactors: [4.6, 6.6, 8.3], seed: 3212, roughness: 0.5, holes: 4, seasonLength: 8, startSeason: 'spring', weights: W.all, tilesRatio: 0.9, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -6, r: 3, family: 'rock' }, { q: 5, r: -3, family: 'rock' }, { q: 3, r: 3, family: 'rock' }, { q: -3, r: -3, family: 'rock' }, { q: 6, r: 0, family: 'hamlet' }, { q: -4, r: 0, family: 'ruins' }], mechanics: [], finale: true,
    wishes: [ { id: 'w12_1', type: 'species', count: 6, deadline: { placements: 90 } }, { id: 'w12_2', type: 'rivers', count: 2, deadline: { placements: 80 } }, { id: 'w12_3', type: 'closedInSeason', count: 3, deadline: { placements: 108 } }, { id: 'w12_4', type: 'fusion', recipe: 'falls', deadline: { placements: 110 } } ] },
];

export const getIsland = (id) => ISLANDS.find((i) => i.id === id);
export const WEIGHTS = W;

export const INFINITE = { id: 'infinite', arch: 3, cells: 40, seed: 7777, roughness: 0.45, holes: 1, seasonLength: 10, startSeason: 'spring', weights: W.all, tilesRatio: Infinity, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 3, r: -1, family: 'rock' }], wishes: [], mechanics: [], infinite: true };
export const GARDEN = { id: 'garden', arch: 1, cells: 80, seed: 4242, roughness: 0.4, holes: 2, seasonLength: 14, startSeason: 'spring', weights: W.all, tilesRatio: Infinity, start: [{ q: 0, r: 0, family: 'hamlet' }], wishes: [], mechanics: [], garden: true };

/** Mécaniques disponibles jusqu'à une île donnée (incluse). */
export function mechanicsUpTo(id) {
  const set = new Set(['affinity', 'close']);
  for (const i of ISLANDS) { if (typeof id === 'number' && i.id > id) break; for (const m of i.mechanics) set.add(m); }
  return set;
}
