// Grille hexagonale à sommet en haut, coordonnées axiales (q, r). Unités « monde » en px 1× (tuile 120×140).
import { BALANCE } from '../data/balance.js';

const H = BALANCE.hex;
export const SIZE = H.size;            // rayon (centre → sommet)
export const TILE_W = H.w, TILE_H = H.h, ROW_H = H.rowH;
const SQ3 = Math.sqrt(3);

export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const key = (q, r) => `${q},${r}`;
export const parse = (k) => k.split(',').map(Number);
export const neighbors = (q, r) => DIRS.map(([dq, dr]) => [q + dq, r + dr]);

/** Centre d'une case en coordonnées monde. */
export function toWorld(q, r) { return { x: SIZE * SQ3 * (q + r / 2), y: SIZE * 1.5 * r }; }

/** Case contenant un point monde (arrondi axial). */
export function fromWorld(x, y) {
  const qf = (SQ3 / 3 * x - y / 3) / SIZE;
  const rf = (2 / 3 * y) / SIZE;
  const sf = -qf - rf;
  let q = Math.round(qf), r = Math.round(rf), s = Math.round(sf);
  const dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
  return { q, r };
}

export const hexDist = (q1, r1, q2, r2) => (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2;

/** Sommets d'un hexagone centré en (cx, cy) (monde), dans l'ordre horaire depuis le sommet du haut. */
export function corners(cx, cy, size = SIZE) {
  const pts = [];
  for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 90); pts.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]); }
  return pts;
}

/** Milieu du bord partagé avec le voisin de direction d (0..5, ordre de DIRS). */
export function edgeMid(cx, cy, d) {
  const [dq, dr] = DIRS[d];
  const n = toWorld(dq, dr);
  return { x: cx + n.x / 2, y: cy + n.y / 2 };
}
