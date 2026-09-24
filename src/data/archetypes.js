// Archétypes d'île : ce que l'île bâtie est devenue, lu dans sa composition. Chacun a son insigne
// (assets/img/archetypes/archetype-<id>.png), qui se tamponne sur la carte postale de l'île.
import { Board } from '../game/board.js';

export const ARCHETYPES = [
  { id: 'hameaux', name: 'Île des hameaux', families: ['hamlet'] },
  { id: 'aquatique', name: 'Île aquatique', families: ['water'] },
  { id: 'sauvage', name: 'Île sauvage', families: ['forest', 'marsh', 'heath'] },
  { id: 'montagneuse', name: 'Île montagneuse', families: ['rock', 'hill'] },
  { id: 'nourriciere', name: 'Île nourricière', families: ['field', 'orchard', 'meadow'] },
  { id: 'littorale', name: 'Île littorale', families: ['sand'] },
];

/**
 * L'archétype d'une île : celui de sa plus grande région (tuiles d'une même famille qui se touchent). La composition
 * seule ne disait rien — elle suit la file de tuiles, et 70 % des îles restaient sans archétype ou « nourricières » ;
 * la plus grande région, c'est le joueur qui la façonne. Sur 100 parties du bot : nourricière 33, aquatique 22,
 * hameaux 18, sauvage 14, littorale 7, montagneuse 6. Rend null sur un plateau vide.
 */
export function archetypeOf(board) {
  let big = null; const seen = new Set();
  for (const t of board.tiles.values()) for (const f of Board.familiesOf(t)) {
    const reg = board.region(t.q, t.r, f); if (!reg || seen.has(reg.id)) continue; seen.add(reg.id);
    if (!big || reg.size > big.size) big = { size: reg.size, family: f };
  }
  const a = big && ARCHETYPES.find((x) => x.families.includes(big.family));
  return a ? { ...a, family: big.family, size: big.size } : null;
}
