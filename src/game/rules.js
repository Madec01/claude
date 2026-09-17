// Règles de score : affinités par bord, rivières, saisons, fermeture de régions.
import { affinity, PAIR_LABELS, pairKey } from '../data/tiles.js';
import { BALANCE } from '../data/balance.js';
import { Board } from './board.js';
import { DIRS, key, neighbors } from './hex.js';

const P = BALANCE.points;

/** Une tuile est-elle « active » pour les affinités (une prairie sèche ne compte pas) ? */
function active(tile) { return !(tile.dry); }

/** Points d'un bord entre la tuile posée et un voisin, selon la saison. */
function edgePoints(tile, other, season) {
  if (!active(other) && !tile.rare) { if (Board.isFamily(other, 'meadow')) return { pts: 0, label: 'sèche' }; }
  const fa = Board.familiesOf(tile), fb = Board.familiesOf(other);
  let best = 0, bestKey = null;
  for (const x of fa) for (const y of fb) {
    if (season === 'winter' && ((x === 'field' && y === 'hamlet') || (x === 'hamlet' && y === 'field'))) continue; // champs dormants
    const v = affinity(x, y);
    if (Math.abs(v) > Math.abs(best)) { best = v; bestKey = pairKey(x, y); }
  }
  // été : champ irrigué
  if (season === 'summer' && ((fa.includes('field') && fb.includes('water')) || (fa.includes('water') && fb.includes('field')))) best += P.summerIrrigation;
  // chapelle : tous les bords +1 en hiver
  if (season === 'winter' && (tile.family === 'chapel' || other.family === 'chapel')) best += 1;
  return { pts: best, label: bestKey ? (PAIR_LABELS[bestKey] || '') : '' };
}

/**
 * Prévisualise une pose sans modifier le plateau.
 * @returns {{ total, edges:[{d,q,r,pts,label}], closes:[{family,size,bonus,keys}], river, base:[{pts,label}] }}
 */
export function preview(board, q, r, tile, season) {
  const edges = [];
  let total = 0;
  const base = [];
  DIRS.forEach(([dq, dr], d) => {
    const n = board.get(q + dq, r + dr);
    if (!n) return;
    const e = edgePoints(tile, n, season);
    if (e.pts !== 0) { edges.push({ d, q: q + dq, r: r + dr, pts: e.pts, label: e.label }); total += e.pts; }
  });
  // simulation de la pose pour rivières et fermetures
  const placed = board.place(q, r, tile);
  let river = null;
  if (Board.isFamily(placed, 'water')) {
    const reg = board.region(q, r, 'water');
    if (board.isRiver(reg)) { river = { pts: P.river + (season === 'spring' ? P.springWater : 0), len: reg.size }; }
    else river = { pts: P.pond + (season === 'spring' ? P.springWater : 0), len: reg.size, pond: true };
    if (river.pts) { base.push({ pts: river.pts, label: river.pond ? 'mare' : 'rivière' }); total += river.pts; }
  }
  const closes = closedRegionsAround(board, q, r);
  for (const c of closes) total += c.bonus;
  board.remove(q, r);
  return { total, edges, closes, river, base };
}

/** Régions qui seraient closes après une pose en (q, r) (la tuile doit déjà être posée). */
export function closedRegionsAround(board, q, r) {
  const out = [];
  const seen = new Set();
  const cellsToCheck = [[q, r], ...neighbors(q, r)];
  for (const [a, b] of cellsToCheck) {
    const t = board.get(a, b); if (!t) continue;
    for (const fam of Board.familiesOf(t)) {
      const reg = board.region(a, b, fam);
      if (!reg || seen.has(reg.id) || board.closedRegions.has(reg.id)) continue;
      seen.add(reg.id);
      if (fam === 'rock' && reg.cells.every((c) => c.rare || c.start)) continue; // les rochers de départ ne font pas de prime
      const closed = board.isRegionClosed(reg) || (reg.cells.some((c) => c.family === 'watchtower') && openCells(board, reg) <= 1);
      if (closed) out.push({ family: fam, size: reg.size, bonus: reg.size * (P.closeBonusMul[fam] || 1), keys: reg.keys, id: reg.id, cells: reg.cells });
    }
  }
  return out;
}

function openCells(board, reg) {
  const open = new Set();
  for (const t of reg.cells) for (const [a, b] of neighbors(t.q, t.r)) if (board.isEmpty(a, b)) open.add(key(a, b));
  return open.size;
}

/** Applique une pose. Retourne le détail (identique à preview) et marque les régions closes. */
export function apply(board, q, r, tile, season) {
  const res = preview(board, q, r, tile, season);
  board.place(q, r, tile);
  for (const c of res.closes) board.closedRegions.add(c.id);
  return res;
}

/** Régions closes « bourgs » (hameaux) présentes sur le plateau. */
export function countClosedRegions(board, family = null) {
  let n = 0;
  for (const id of board.closedRegions) if (!family || id.startsWith(family + ':')) n++;
  return n;
}
