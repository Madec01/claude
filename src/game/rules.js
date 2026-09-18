// Règles de score : affinités par bord, rivières, saisons, fermeture de régions.
import { affinity, PAIR_LABELS, pairKey } from '../data/tiles.js';
import { BALANCE } from '../data/balance.js';
import { Board } from './board.js';
import { DIRS, key, neighbors } from './hex.js';
import { classifyWater, KIND_LABEL } from './water.js';

const P = BALANCE.points;

/** Une tuile est-elle « active » pour les affinités (une prairie sèche ne compte pas) ? */
function active(tile) { return !(tile.dry); }

/** Points d'un bord entre la tuile posée et un voisin, selon la saison. */
function edgePoints(tile, other, season, rule = null) {
  if (!active(other) && !tile.rare) { if (Board.isFamily(other, 'meadow')) return { pts: 0, label: 'sèche' }; }
  const fa = Board.familiesOf(tile), fb = Board.familiesOf(other);
  let best = 0, bestKey = null;
  for (const x of fa) for (const y of fb) {
    if (season === 'winter' && rule !== 'doux' && ((x === 'field' && y === 'hamlet') || (x === 'hamlet' && y === 'field')) && tile.family !== 'granary' && other.family !== 'granary') continue; // champs dormants (sauf grenier, sauf hiver doux)
    const v = affinity(x, y);
    if (Math.abs(v) > Math.abs(best)) { best = v; bestKey = pairKey(x, y); }
  }
  // règles de saison : semailles (champ posé contre un hameau +2), nichées (prairie posée contre une forêt +1)
  if (rule === 'semailles' && ((fa.includes('field') && fb.includes('hamlet')) || (fa.includes('hamlet') && fb.includes('field')))) best += 2;
  if (rule === 'nichees' && fa.includes('meadow') && fb.includes('forest')) best += 1;
  // été : champ irrigué
  if (season === 'summer' && ((fa.includes('field') && fb.includes('water')) || (fa.includes('water') && fb.includes('field')))) best += P.summerIrrigation;
  // chapelle : tous les bords +1 en hiver
  if (season === 'winter' && (tile.family === 'chapel' || other.family === 'chapel')) best += 1;
  // grenier : +1 par bord avec un champ ; fontaine : +1 par bord avec un hameau
  if ((tile.family === 'granary' && fb.includes('field')) || (other.family === 'granary' && fa.includes('field'))) best += 1;
  if ((tile.family === 'fountain' && fb.includes('hamlet')) || (other.family === 'fountain' && fa.includes('hamlet'))) best += 1;
  // four à pain : +1 par bord avec un champ ; mine : +1 par bord avec une roche
  if ((tile.family === 'oven' && fb.includes('field')) || (other.family === 'oven' && fa.includes('field'))) best += 1;
  if ((tile.family === 'mine' && fb.includes('rock')) || (other.family === 'mine' && fa.includes('rock'))) best += 1;
  // niveau 2 : tous les bords de la tuile bâtie valent +1 de plus (les mauvaises paires restent mauvaises)
  if (best >= 0) best += ((tile.level || 1) >= 2 ? 1 : 0) + ((other.level || 1) >= 2 ? 1 : 0);
  return { pts: best, label: bestKey ? (PAIR_LABELS[bestKey] || '') : '' };
}

/** Peut-on bâtir `tile` sur la case (q, r) ? Même famille, pas de rare, niveau maximal non atteint. */
export function canBuild(board, q, r, tile) {
  const t = board.get(q, r);
  return !!t && !!tile && !t.rare && !tile.rare && t.family === tile.family && (t.level || 1) < BALANCE.build.maxLevel;
}

/**
 * Aperçu d'une construction : la tuile en place monte d'un niveau et l'on gagne, sur chaque bord, la différence
 * entre sa valeur au nouveau niveau et sa valeur actuelle (+1 par bord qui n'est pas une mauvaise paire).
 * Les bords ne sont donc pas rejoués en entier : bâtir vaut à peu près une bonne pose, pas le double.
 */
export function previewBuild(board, q, r, tile, season, mods = {}) {
  const t = board.get(q, r); if (!t) return null;
  const up = { ...t, level: (t.level || 1) + 1 };
  const edges = []; let total = 0;
  DIRS.forEach(([dq, dr], d) => {
    const n = board.get(q + dq, r + dr); if (!n) return;
    const after = edgePoints(up, n, season, mods.rule || null), before = edgePoints(t, n, season, mods.rule || null);
    const pts = after.pts - before.pts;
    if (pts !== 0) { edges.push({ d, q: q + dq, r: r + dr, pts, label: after.label }); total += pts; }
  });
  return { total, edges, closes: [], river: null, base: [], build: true, level: up.level };
}

/**
 * Prévisualise une pose sans modifier le plateau.
 * @returns {{ total, edges:[{d,q,r,pts,label}], closes:[{family,size,bonus,keys}], river, base:[{pts,label}] }}
 */
export function preview(board, q, r, tile, season, mods = {}) {
  const edges = [];
  let total = 0;
  const base = [];
  DIRS.forEach(([dq, dr], d) => {
    const n = board.get(q + dq, r + dr);
    if (!n) return;
    const e = edgePoints(tile, n, season, mods.rule || null);
    if (e.pts !== 0) { edges.push({ d, q: q + dq, r: r + dr, pts: e.pts, label: e.label }); total += e.pts; }
  });
  // simulation de la pose pour rivières et fermetures
  const placed = board.place(q, r, tile);
  let river = null;
  if (Board.isFamily(placed, 'water')) {
    // nature de l'eau avant / après la pose (embouchure atteinte ?)
    const before = neighbors(q, r).map(([a, b]) => classifyWater(board).get(key(a, b))).filter(Boolean);
    const mouthBefore = before.some((w) => w.kind === 'river' && w.mouth);
    board.version++; board._water = null;
    const body = classifyWater(board).get(key(q, r));
    const spring = season === 'spring' && (mods.rule === 'crue' || !mods.rule) ? P.springWater : 0;
    if (body.kind === 'river') {
      river = { pts: P.river + (mods.river || 0) + spring, len: body.size, kind: 'river' };
      if (body.mouth && !mouthBefore) river.mouthPts = P.mouth;
    } else if (body.kind === 'pond') river = { pts: P.pond + spring, len: 1, pond: true, kind: 'pond' };
    else if (body.kind === 'mountainLake') { const rocks = neighbors(q, r).filter(([a, b]) => { const n = board.get(a, b); return n && (Board.isFamily(n, 'rock') || Board.isFamily(n, 'hill')); }).length; river = { pts: P.lake + rocks + spring, len: body.size, kind: 'mountainLake' }; }
    else river = { pts: P.lake + spring, len: body.size, kind: 'lake' };
    if (river.pts) { base.push({ pts: river.pts, label: KIND_LABEL[body.kind] }); total += river.pts; }
    if (river.mouthPts) { base.push({ pts: river.mouthPts, label: 'embouchure' }); total += river.mouthPts; }
    if (mods.rule === 'chaleurs') { base.push({ pts: 2, label: 'fraîcheur' }); total += 2; }
    board.version++; board._water = null;
  }
  if (mods.wind && (Board.isFamily(placed, 'forest') || Board.isFamily(placed, 'orchard'))) { base.push({ pts: 1, label: 'vent' }); total += 1; }
  if (mods.rule === 'feux' && Board.isFamily(placed, 'forest') && neighbors(q, r).some(([a, b]) => Board.isFamily(board.get(a, b), 'water'))) { base.push({ pts: 2, label: 'pare-feu' }); total += 2; }
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
      // porche : un bourg clos vaut ×3 ; mine : une roche close vaut ×2
      let mul = P.closeBonusMul[fam] || 1;
      if (fam === 'hamlet' && reg.cells.some((c) => c.family === 'archway')) mul = 3;
      if (fam === 'rock' && reg.cells.some((c) => c.family === 'mine')) mul = Math.max(mul, 2);
      if (closed) out.push({ family: fam, size: reg.size, bonus: reg.size * mul, keys: reg.keys, id: reg.id, cells: reg.cells });
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
export function apply(board, q, r, tile, season, mods = {}) {
  const res = preview(board, q, r, tile, season, mods);
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
