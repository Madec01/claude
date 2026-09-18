// Sentiers : ruelles entre hameaux voisins et sentiers automatiques entre deux hameaux séparés par de la terre ouverte.
// Rien n'est posé par le joueur : les chemins se déduisent du plateau et se redessinent à chaque changement.
import { Board } from './board.js';
import { key, parse, neighbors } from './hex.js';

const OPEN = new Set(['meadow', 'field', 'orchard', 'heath', 'hill']);
export const MAX_PATH = 3;   // nombre maximal de tuiles de terre ouverte entre deux hameaux

const isHamlet = (t) => Board.isFamily(t, 'hamlet');
const isOpen = (t) => !!t && !isHamlet(t) && Board.familiesOf(t).some((f) => OPEN.has(f));

/**
 * @returns {{ lanes: Array<[string, string]>, links: Array<{ a: string, b: string, cells: string[] }> }}
 *  lanes : paires de hameaux adjacents (ruelles) ; links : sentiers entre régions de hameaux distinctes (cellules de bout en bout).
 */
export function computeLinks(board) {
  if (board._links && board._linksVersion === board.version) return board._links;
  const regionOf = new Map();
  for (const reg of board.regions('hamlet')) for (const k of reg.keys) regionOf.set(k, reg.id);
  // ruelles : arbre de desserte de chaque village (parcours en largeur depuis la cellule la plus centrale), pas une toile
  const lanes = [];
  for (const reg of board.regions('hamlet')) {
    if (reg.size < 2) continue;
    let cx = 0, cy = 0; for (const c of reg.cells) { cx += c.q; cy += c.r; } cx /= reg.cells.length; cy /= reg.cells.length;
    let start = reg.cells[0], bd = Infinity;
    for (const c of reg.cells) { const d = Math.hypot(c.q - cx, c.r - cy); if (d < bd) { bd = d; start = c; } }
    const seen = new Set([key(start.q, start.r)]); const queue = [start];
    while (queue.length) {
      const c = queue.shift();
      for (const [a, b] of neighbors(c.q, c.r)) {
        const nk = key(a, b); if (!reg.keys.has(nk) || seen.has(nk)) continue;
        seen.add(nk); lanes.push([key(c.q, c.r), nk]); queue.push(board.get(a, b));
      }
    }
  }
  // sentiers : plus court chemin (≤ MAX_PATH tuiles ouvertes) entre deux régions de hameaux différentes
  const best = new Map();   // "regA|regB" -> { cells, len }
  for (const t of board.tiles.values()) {
    if (!isHamlet(t)) continue;
    const start = key(t.q, t.r), ra = regionOf.get(start);
    const queue = [[start, [start]]]; const dist = new Map([[start, 0]]);
    while (queue.length) {
      const [k, path] = queue.shift(); const d = dist.get(k);
      const [q, r] = parse(k);
      for (const [a, b] of neighbors(q, r)) {
        const nk = key(a, b); const n = board.get(a, b); if (!n) continue;
        if (isHamlet(n)) {
          const rb = regionOf.get(nk);
          if (rb === ra || d === 0) continue;
          const pk = ra < rb ? `${ra}|${rb}` : `${rb}|${ra}`;
          const cells = [...path, nk]; const cur = best.get(pk);
          if (!cur || cells.length < cur.cells.length) best.set(pk, { a: ra, b: rb, cells });
          continue;
        }
        if (!isOpen(n) || d + 1 > (board.linkMax || MAX_PATH) || dist.has(nk)) continue;
        dist.set(nk, d + 1); queue.push([nk, [...path, nk]]);
      }
    }
  }
  const links = [...best.values()];
  board._links = { lanes, links }; board._linksVersion = board.version;
  return board._links;
}
