// L'eau : étang (une tuile), lac (plusieurs tuiles en tas, sans montagne contiguë), rivière (chaîne en ligne qui part
// d'une montagne : roche ou colline), lac de montagne (tas qui touche une montagne). Classification par forme, mise en
// cache par version de plateau ; sert aux règles, aux vœux, à la faune et au rendu (ruban de rivière, nappe, mare).
import { Board } from './board.js';
import { key, parse, neighbors } from './hex.js';

const isMountain = (t) => !!t && (Board.isFamily(t, 'rock') || Board.isFamily(t, 'hill'));

/** @returns {Map<string, { id, kind:'pond'|'lake'|'river'|'mountainLake', cells, keys, size, source, mouth, chain:string[] }>} par clé de cellule */
export function classifyWater(board) {
  if (board._water && board._waterVersion === board.version) return board._water;
  const byCell = new Map(); const bodies = [];
  for (const reg of board.regions('water')) {
    const deg = (t) => neighbors(t.q, t.r).filter(([a, b]) => reg.keys.has(key(a, b))).length;
    const touchesMountain = board.regionNeighbors(reg).some(isMountain);
    const mouth = board.regionTouchesSea(reg);
    const line = reg.size >= 2 && reg.cells.every((t) => deg(t) <= 2) && reg.cells.filter((t) => deg(t) === 1).length === 2;
    let kind = reg.size === 1 ? 'pond' : line && touchesMountain ? 'river' : touchesMountain ? 'mountainLake' : 'lake';
    let chain = [];
    if (kind === 'river') {
      // ordonner la chaîne de la source (extrémité qui touche une montagne) vers l'autre bout
      const ends = reg.cells.filter((t) => deg(t) === 1);
      const srcEnd = ends.find((t) => neighbors(t.q, t.r).some(([a, b]) => isMountain(board.get(a, b)))) || ends[0];
      let cur = srcEnd, prev = null;
      while (cur) { chain.push(key(cur.q, cur.r)); const nx = neighbors(cur.q, cur.r).map(([a, b]) => board.get(a, b)).find((n) => n && reg.keys.has(key(n.q, n.r)) && n !== prev && !chain.includes(key(n.q, n.r))); prev = cur; cur = nx; }
    }
    const body = { id: reg.id, kind, cells: reg.cells, keys: reg.keys, size: reg.size, source: touchesMountain, mouth, chain };
    bodies.push(body);
    for (const k of reg.keys) byCell.set(k, body);
  }
  byCell.bodies = bodies;
  board._water = byCell; board._waterVersion = board.version;
  return byCell;
}

export const waterBodies = (board) => classifyWater(board).bodies;
export const rivers = (board) => waterBodies(board).filter((b) => b.kind === 'river');
export const lakes = (board) => waterBodies(board).filter((b) => b.kind === 'lake' || b.kind === 'mountainLake');
export const KIND_LABEL = { pond: 'étang', lake: 'lac', river: 'rivière', mountainLake: 'lac de montagne' };
