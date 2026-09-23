// Faune : habitats, apparition et départ des animaux.
import { BALANCE } from '../data/balance.js';
import { Board } from './board.js';
import { neighbors, key } from './hex.js';

const F = BALANCE.fauna;
export const SPECIES = ['rabbit', 'moose', 'frog', 'duck', 'bear', 'owl', 'penguin', 'goat', 'chicken', 'horse', 'cow'];

/**
 * Échelle de chaque espèce à l'écran. Chaque sprite était dessiné à la taille que son rendu 3D avait
 * produite, sans référence au monde : la poule faisait 36 unités de haut pour une maisonnette de 29,
 * le cheval 52 pour une petite maison de 50. Ce n'est pas l'échelle réelle qu'on vise — une poule à
 * l'échelle ferait quatre pixels et disparaîtrait — mais une échelle COHÉRENTE : le plus grand animal
 * arrive à mi-hauteur d'une maison, le plus petit est un point. Les facteurs ci-dessous amènent la
 * hauteur de chaque espèce à la valeur voulue, en unités monde (l'hexagone fait 120 de large).
 */
export const FAUNA_SIZE = {
  moose: 0.55,    // 51 → 28
  horse: 0.50,    // 52 → 26
  cow: 0.63,      // 38 → 24
  bear: 0.62,     // 39 → 24
  goat: 0.47,     // 38 → 18
  penguin: 0.34,  // 53 → 18
  duck: 0.46,     // 28 → 13
  chicken: 0.36,  // 36 → 13
  rabbit: 0.41,   // 27 → 11
  owl: 0.46,      // 24 → 11
  chick: 0.44,    // 18 → 8
  frog: 0.58,     // 12 → 7
};

/**
 * Les espèces dont le sprite porte son perchoir. Le hibou est rendu **avec sa branche** : tout
 * mouvement le déplace avec son décor, et on voit une branche qui sautille ou qui glisse sur le sol.
 * Ces espèces-là ne se promènent pas et ne bondissent pas — elles veillent, posées sur leur case.
 */
export const FAUNA_PERCHED = new Set(['owl']);

/** Case « centrale » d'une région (la plus proche du barycentre) pour poser l'animal. */
function anchor(reg) {
  let cx = 0, cy = 0;
  for (const c of reg.cells) { cx += c.q; cy += c.r; }
  cx /= reg.cells.length; cy /= reg.cells.length;
  let best = reg.cells[0], bd = Infinity;
  for (const c of reg.cells) { const d = Math.hypot(c.q - cx, c.r - cy); if (d < bd) { bd = d; best = c; } }
  return best;
}

/**
 * Calcule les animaux qui devraient être présents.
 * @returns {Map<string, {species, q, r, regionId}>} clé = `${species}@${regionId}`
 */
export function evaluate(board, season, rule = null) {
  const out = new Map();
  const add = (species, reg, cell = null, extra = null) => { const a = cell || anchor(reg); out.set(`${species}@${reg.id}`, { species, q: a.q, r: a.r, regionId: reg.id, ...(extra || {}) }); };
  for (const reg of board.regions('meadow')) {
    const alive = reg.cells.filter((c) => !c.dry).length;
    if (alive >= F.rabbit) add('rabbit', reg);
  }
  for (const reg of board.regions('forest')) {
    const ancient = reg.cells.some((c) => (c.level || 1) >= 3 && !c.rare);   // forêt ancienne : ours et hibou même sans roche ni hameau, à l'abri des feux
    if (!ancient && rule === 'feux' && board.regionNeighbors(reg).filter((n) => n.family === 'meadow' && n.dry).length >= 2) continue;   // feux de broussaille : la forêt se vide
    if (reg.size >= F.moose) add('moose', reg);
    if (reg.size >= F.bear && (board.regionTouches(reg, 'rock') || ancient)) add('bear', reg);
    if (ancient && !board.regionTouches(reg, 'hamlet')) add('owl', reg);
    if (reg.size >= F.owl && board.regionTouches(reg, 'hamlet')) {
      const c = reg.cells.find((t) => neighbors(t.q, t.r).some(([a, b]) => { const n = board.get(a, b); return n && Board.isFamily(n, 'hamlet'); }));
      add('owl', reg, c);
    }
  }
  for (const reg of board.regions('water')) {
    const frozen = reg.cells.every((c) => c.frozen);
    if (reg.size >= F.duck && !frozen) add('duck', reg);
    if (season === 'winter' && frozen && reg.size >= F.penguin) add('penguin', reg);
  }
  for (const reg of board.regions('marsh')) {
    if (board.regionTouches(reg, 'water')) add('frog', reg);
  }
  // poules : un hameau bordé d'au moins deux champs
  for (const reg of board.regions('hamlet')) {
    const fields = board.regionNeighbors(reg).filter((n) => Board.isFamily(n, 'field'));
    if (fields.length >= F.chicken) {
      const c = reg.cells.find((t) => neighbors(t.q, t.r).some(([a, b]) => { const n = board.get(a, b); return n && Board.isFamily(n, 'field'); }));
      add('chicken', reg, c);
    }
  }
  // chevaux : des collines qui touchent une prairie
  for (const reg of board.regions('hill')) if (reg.size >= F.horse && board.regionTouches(reg, 'meadow')) add('horse', reg);
  // vaches : une prairie en lisière de lande
  for (const reg of board.regions('meadow')) {
    const alive = reg.cells.filter((c) => !c.dry).length;
    if (alive >= F.cow && board.regionTouches(reg, 'heath')) add('cow', reg, reg.cells.find((t) => !t.dry && neighbors(t.q, t.r).some(([a, b]) => { const n = board.get(a, b); return n && Board.isFamily(n, 'heath'); })) || undefined);
  }
  for (const t of board.tiles.values()) if (t.family === 'camp') out.set(`goat@camp:${t.q},${t.r}`, { species: 'goat', q: t.q, r: t.r, regionId: `camp:${t.q},${t.r}` });
  // pâturages (prairie de niveau 3) : vache et cheval
  for (const t of board.tiles.values()) if (t.family === 'meadow' && (t.level || 1) >= 3 && !t.rare) { const reg = { id: `pasture:${key(t.q, t.r)}`, cells: [t] }; add('cow', reg, t); add('horse', reg, t); }
  // fusions : chaque tuile composée accueille son animal
  for (const t of board.tiles.values()) {
    if (!t.fusion) continue; const reg = { id: `${t.family}:${key(t.q, t.r)}`, cells: [t] };
    // (ces animaux « attachés » ne donnent pas la prime de saison : la tuile composée a déjà la sienne)
    const nb = { noBonus: true };
    if (t.family === 'cave') add('bear', reg, t, nb);
    else if (t.family === 'farm') add('chicken', reg, t, nb);
    else if (t.family === 'port') add('duck', reg, t, nb);
    else if (t.family === 'paddy') add('frog', reg, t, nb);
    else if (t.family === 'lagoon' && season === 'winter') add('penguin', reg, t, nb);
  }
  return out;
}

/** Différence entre l'état courant et l'état attendu → { arrivals, departures, current }. */
export function reconcile(current, expected) {
  const arrivals = [], departures = [];
  for (const [k, v] of expected) if (!current.has(k)) arrivals.push(v);
  for (const [k, v] of current) if (!expected.has(k)) departures.push(v);
  return { arrivals, departures, current: new Map(expected) };
}

export const speciesCount = (current) => new Set([...current.values()].map((a) => a.species)).size;
