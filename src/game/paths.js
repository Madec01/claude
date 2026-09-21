// Sentiers : ruelles entre hameaux voisins et sentiers automatiques entre deux hameaux séparés par de la terre ouverte.
// Rien n'est posé par le joueur : les chemins se déduisent du plateau et se redessinent à chaque changement.
import { Board } from './board.js';
import { key, parse, neighbors, toWorld, SIZE } from './hex.js';

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

// ---------------------------------------------------------------------------
// Géométrie des chemins : partagée par le rendu (qui les trace) et le décor
// (qui doit savoir où ils passent pour ne rien poser dessus).
// ---------------------------------------------------------------------------

/** Bruit déterministe par case : le chemin ne traverse pas le centre exact, il hésite. */
function wobble(k, salt) {
  const [q, r] = parse(k);
  const h = Math.sin((q + 512) * 127.1 + (r + 512) * 311.7 + salt * 74.7) * 43758.5453;
  return (h - Math.floor(h)) - 0.5;
}

/**
 * Le point par lequel le chemin traverse une case.
 * Un hameau fait exception : le bâtiment est dessiné sous le centre de la case (son pied tombe à
 * environ +30), et le chemin passait donc **dessous**, à travers la maison. Il passe maintenant
 * DEVANT la façade — une rue de village longe les portes, elle ne les traverse pas et ne s'arrête
 * pas non plus au bord de l'hexagone. Ailleurs, le centre de la case décalé d'un rien : ce décalage,
 * tiré par case et non par segment, empêche tous les chemins d'onduler de la même façon.
 */
const SEUIL = 34;           // devant la façade, en px monde (le sommet bas de l'hexagone est à 69)
const WOBBLE = SIZE * 0.17; // hésitation du tracé dans une case ordinaire

function waypoint(board, k, maison) {
  const [q, r] = parse(k); const c = toWorld(q, r);
  if (maison) return { x: c.x + wobble(k, 1) * 9, y: c.y + SEUIL };
  return { x: c.x + wobble(k, 1) * WOBBLE, y: c.y + wobble(k, 2) * WOBBLE };
}

/** Points de contrôle d'un chemin, de bout en bout, en coordonnées monde. */
function shape(board, cells) {
  const n = cells.length;
  const pts = cells.map((k) => { const [q, r] = parse(k); return waypoint(board, k, isHamlet(board.get(q, r))); });
  if (n === 1) return pts;
  // lissage léger : un point de contrôle par segment, à peine décalé (le gros du hasard est déjà par case)
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const j = wobble(cells[i], 3 + i);
    out.push({ x: a.x + dx * 0.5 + (-dy / len) * j * 9, y: a.y + dy * 0.5 + (dx / len) * j * 9 });
    out.push(b);
  }
  return out;
}

/**
 * Tous les chemins de l'île, prêts à tracer : { kind, cells, pts }.
 * `kind` vaut 'lane' (ruelle d'un village) ou 'link' (sentier entre deux villages).
 */
export function pathShapes(board) {
  if (board._shapes && board._shapesVersion === board.version) return board._shapes;
  const { lanes, links } = computeLinks(board);
  const out = [];
  for (const [a, b] of lanes) out.push({ kind: 'lane', cells: [a, b], pts: shape(board, [a, b]) });
  for (const l of links) out.push({ kind: 'link', cells: l.cells, pts: shape(board, l.cells) });
  board._shapes = out; board._shapesVersion = board.version;
  return out;
}

/**
 * Points semés le long des chemins, rangés par case : le décor s'en sert comme d'obstacles,
 * pour que rien ne vienne se planter au milieu de la route.
 */
export function pathPoints(board, pas = 11) {
  if (board._pathPts && board._pathPtsVersion === board.version) return board._pathPts;
  const map = new Map();
  const ajoute = (p) => {
    const q = Math.round((Math.sqrt(3) / 3 * p.x - p.y / 3) / SIZE), r0 = Math.round((2 / 3 * p.y) / SIZE);
    for (const [a, b] of [[q, r0], ...neighbors(q, r0)]) {
      const k = key(a, b); const c = toWorld(a, b);
      if (Math.hypot(c.x - p.x, c.y - p.y) > SIZE) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    }
  };
  for (const s of pathShapes(board)) {
    for (let i = 0; i < s.pts.length - 1; i++) {
      const a = s.pts[i], b = s.pts[i + 1];
      const d = Math.hypot(b.x - a.x, b.y - a.y); const n = Math.max(1, Math.round(d / pas));
      for (let j = 0; j <= n; j++) ajoute({ x: a.x + (b.x - a.x) * (j / n), y: a.y + (b.y - a.y) * (j / n) });
    }
  }
  board._pathPts = map; board._pathPtsVersion = board.version;
  return map;
}
