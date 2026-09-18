// Faune : habitats, apparition et départ des animaux.
import { BALANCE } from '../data/balance.js';
import { Board } from './board.js';
import { neighbors } from './hex.js';

const F = BALANCE.fauna;
export const SPECIES = ['rabbit', 'moose', 'frog', 'duck', 'bear', 'owl', 'penguin', 'goat', 'chicken', 'horse', 'cow'];

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
  const add = (species, reg, cell = null) => { const a = cell || anchor(reg); out.set(`${species}@${reg.id}`, { species, q: a.q, r: a.r, regionId: reg.id }); };
  for (const reg of board.regions('meadow')) {
    const alive = reg.cells.filter((c) => !c.dry).length;
    if (alive >= F.rabbit) add('rabbit', reg);
  }
  for (const reg of board.regions('forest')) {
    if (rule === 'feux' && board.regionNeighbors(reg).filter((n) => n.family === 'meadow' && n.dry).length >= 2) continue;   // feux de broussaille : la forêt se vide
    if (reg.size >= F.moose) add('moose', reg);
    if (reg.size >= F.bear && board.regionTouches(reg, 'rock')) add('bear', reg);
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
  const troughNear = (reg) => reg.cells.some((c) => c.family === 'trough') || board.regionNeighbors(reg).some((n) => n.family === 'trough');
  for (const reg of board.regions('hill')) if ((reg.size >= F.horse || troughNear(reg)) && board.regionTouches(reg, 'meadow')) add('horse', reg);
  // vaches : une prairie en lisière de lande
  for (const reg of board.regions('meadow')) {
    const alive = reg.cells.filter((c) => !c.dry).length;
    if ((alive >= F.cow || troughNear(reg)) && (board.regionTouches(reg, 'heath') || troughNear(reg))) add('cow', reg, reg.cells.find((t) => !t.dry && neighbors(t.q, t.r).some(([a, b]) => { const n = board.get(a, b); return n && Board.isFamily(n, 'heath'); })) || undefined);
  }
  for (const t of board.tiles.values()) if (t.family === 'camp') out.set(`goat@camp:${t.q},${t.r}`, { species: 'goat', q: t.q, r: t.r, regionId: `camp:${t.q},${t.r}` });
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
