// Règles de score : affinités par bord, rivières, saisons, fermeture de régions.
import { affinity, PAIR_LABELS, pairKey, fusionFor } from '../data/tiles.js';
import { BALANCE } from '../data/balance.js';
import { Board } from './board.js';
import { DIRS, key, neighbors } from './hex.js';
import { classifyWater, KIND_LABEL } from './water.js';

const P = BALANCE.points;

/** Une tuile est-elle « active » pour les affinités (une prairie sèche ne compte pas) ? */
function active(tile) { return !(tile.dry); }

/** Points d'un bord entre la tuile posée et un voisin, selon la saison. */
function edgePoints(tile, other, season, rule = null, climate = null) {
  if (other.blighted || tile.blighted) return { pts: 0, label: 'friche' };   // une friche ne donne et ne reçoit rien
  if (!active(other) && !tile.rare) { if (Board.isFamily(other, 'meadow')) return { pts: 0, label: 'sèche' }; }
  const fa = Board.familiesOf(tile), fb = Board.familiesOf(other);
  let best = 0, bestKey = null;
  for (const x of fa) for (const y of fb) {
    if ((season === 'winter' || (season === 'autumn' && climate && climate.fieldsDormantAutumn)) && rule !== 'doux' && ((x === 'field' && y === 'hamlet') || (x === 'hamlet' && y === 'field')) && tile.family !== 'granary' && other.family !== 'granary' && (tile.level || 1) < 3 && (other.level || 1) < 3) continue; // champs dormants (sauf grenier, hiver doux, domaine de niveau 3 ; dès l'automne en climat froid)
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
  // climat : vergers +1 au chaud ; hameau contre marais −2 en climat humide
  if (climate) {
    if (climate.orchardEdge && best > 0 && (fa.includes('orchard') || fb.includes('orchard'))) best += climate.orchardEdge;
    if (climate.hamletMarsh && ((fa.includes('hamlet') && fb.includes('marsh')) || (fa.includes('marsh') && fb.includes('hamlet')))) best = climate.hamletMarsh;
  }
  // niveau 2 : tous les bords de la tuile bâtie valent +1 de plus (les mauvaises paires restent mauvaises)
  if (best >= 0) best += Math.max(0, (tile.level || 1) - 1) + Math.max(0, (other.level || 1) - 1);   // niveau 2 : +1, niveau 3 : +2
  return { pts: best, label: bestKey ? (PAIR_LABELS[bestKey] || '') : '' };
}

/** Peut-on bâtir `tile` sur la case (q, r) ? Même famille, pas de rare, niveau maximal non atteint. */
export function canBuild(board, q, r, tile) {
  const t = board.get(q, r);
  return !!t && !!tile && !t.rare && !tile.rare && t.family === tile.family && ((t.level || 1) < BALANCE.build.maxLevel || !!t.blighted);
}

/**
 * Aperçu d'une construction : la tuile en place monte d'un niveau et l'on gagne, sur chaque bord, la différence
 * entre sa valeur au nouveau niveau et sa valeur actuelle (+1 par bord qui n'est pas une mauvaise paire).
 * Les bords ne sont donc pas rejoués en entier : bâtir vaut à peu près une bonne pose, pas le double.
 */
export function previewBuild(board, q, r, tile, season, mods = {}) {
  const t = board.get(q, r); if (!t) return null;
  // une friche se remet en état (même niveau, elle recompte pour sa famille) ; sinon la tuile monte d'un niveau
  const restore = !!t.blighted;
  const up = restore ? { ...t, blighted: false } : { ...t, level: (t.level || 1) + 1 };
  const edges = []; let total = 0;
  DIRS.forEach(([dq, dr], d) => {
    const n = board.get(q + dq, r + dr); if (!n) return;
    const after = edgePoints(up, n, season, mods.rule || null, mods.climate || null), before = edgePoints(t, n, season, mods.rule || null, mods.climate || null);
    const pts = after.pts - before.pts;
    if (pts !== 0) { edges.push({ d, q: q + dq, r: r + dr, pts, label: after.label }); total += pts; }
  });
  if (restore) {
    // seuls les bons voisins comptent : la friche a déjà payé les mauvais ; et la tuile remise en état peut fermer des régions (simulation)
    const good = edges.filter((e) => e.pts > 0); total = good.reduce((a, e) => a + e.pts, 0);
    const k = key(q, r); board.tiles.set(k, up); board.version++; board._water = null;
    const closes = closedRegionsAround(board, q, r); board.tiles.set(k, t); board.version++; board._water = null;
    for (const c of closes) total += c.bonus;
    return { total, edges: good, closes, river: null, base: [{ pts: 0, label: 'remise en état' }], build: true, level: up.level, restore: true };
  }
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
    const e = edgePoints(tile, n, season, mods.rule || null, mods.climate || null);
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
    const cl = mods.climate || {};
    if (body.kind === 'river') {
      river = { pts: P.river + (mods.river || 0) + spring + (cl.riverPlus || 0), len: body.size, kind: 'river' };
      if (body.mouth && !mouthBefore) river.mouthPts = P.mouth;
    } else if (body.kind === 'pond') river = { pts: P.pond + spring, len: 1, pond: true, kind: 'pond' };
    else if (body.kind === 'mountainLake') { const rocks = neighbors(q, r).filter(([a, b]) => { const n = board.get(a, b); return n && (Board.isFamily(n, 'rock') || Board.isFamily(n, 'hill')); }).length; river = { pts: P.lake + rocks + spring, len: body.size, kind: 'mountainLake' }; }
    else river = { pts: P.lake + spring + (cl.lakePlus || 0), len: body.size, kind: 'lake' };
    if (river.pts) { base.push({ pts: river.pts, label: KIND_LABEL[body.kind] }); total += river.pts; }
    if (river.mouthPts) { base.push({ pts: river.mouthPts, label: 'embouchure' }); total += river.mouthPts; }
    if (mods.rule === 'chaleurs') { base.push({ pts: 2, label: 'fraîcheur' }); total += 2; }
    if (cl.waterPlaced) { base.push({ pts: cl.waterPlaced, label: 'soleil' }); total += cl.waterPlaced; }
    board.version++; board._water = null;
  }
  if (mods.wind && (Board.isFamily(placed, 'forest') || Board.isFamily(placed, 'orchard'))) { base.push({ pts: 1, label: 'vent' }); total += 1; }
  if (mods.rule === 'feux' && Board.isFamily(placed, 'forest') && neighbors(q, r).some(([a, b]) => Board.isFamily(board.get(a, b), 'water'))) { base.push({ pts: 2, label: 'pare-feu' }); total += 2; }
  const closes = closedRegionsAround(board, q, r);
  for (const c of closes) total += c.bonus;
  board.remove(q, r);
  // friche : une pose qui coûte des points (bords et contraintes) laisse une tuile morte, qui ne rapportera plus rien
  const blight = total < 0 && !tile.rare;
  return { total, edges, closes, river, base, blight };
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
      const closed = board.isRegionClosed(reg) || (reg.cells.some((c) => c.family === 'watchtower' || c.family === 'fort') && openCells(board, reg) <= 1);
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
  const placed = board.place(q, r, tile);
  if (res.blight) { placed.blighted = true; placed.level = 1; }
  for (const c of res.closes) board.closedRegions.add(c.id);
  return res;
}

/** Régions closes « bourgs » (hameaux) présentes sur le plateau. */
export function countClosedRegions(board, family = null) {
  let n = 0;
  for (const id of board.closedRegions) if (!family || id.startsWith(family + ':')) n++;
  return n;
}

/** Recette de fusion applicable en posant `tile` sur la case (q, r), ou null. */
export function canFuse(board, q, r, tile) {
  const t = board.get(q, r);
  if (!t || !tile || t.rare || tile.rare || t.family === tile.family) return null;
  return fusionFor(t.family, tile.family);
}

/** Tuile fusionnée (compte pour ses deux familles). */
export function fusedTile(t, recipe) { return { ...t, family: recipe.id, rare: true, fusion: true, level: 1, from: [t.family] }; }

/**
 * Aperçu d'une fusion : la tuile en place devient la tuile composée ; on gagne la différence de valeur des bords,
 * la prime de fusion et les éventuelles fermetures de régions (la tuile composée appartient à deux familles).
 */
export function previewFuse(board, q, r, tile, season, mods = {}) {
  const t = board.get(q, r); const recipe = canFuse(board, q, r, tile); if (!recipe) return null;
  const fused = fusedTile(t, recipe);
  const edges = []; let total = 0;
  DIRS.forEach(([dq, dr], d) => {
    const n = board.get(q + dq, r + dr); if (!n) return;
    const after = edgePoints(fused, n, season, mods.rule || null, mods.climate || null), before = edgePoints(t, n, season, mods.rule || null, mods.climate || null);
    const pts = after.pts - before.pts;
    if (pts !== 0) { edges.push({ d, q: q + dq, r: r + dr, pts, label: after.label }); total += pts; }
  });
  const k = key(q, r); board.tiles.set(k, fused); board.version++; board._water = null;
  const closes = closedRegionsAround(board, q, r);
  board.tiles.set(k, t); board.version++; board._water = null;
  for (const c of closes) total += c.bonus;
  const base = [{ pts: BALANCE.fusion.bonus, label: 'fusion' }]; total += BALANCE.fusion.bonus;
  return { total, edges, closes, river: null, base, build: true, fuse: recipe, level: 1 };
}

/**
 * Ouvrage posé sur la tuile `t` : bonne ou mauvaise place, et points de la saison en cours.
 * @returns {{ good: boolean, pts: number, label: string }}
 */
export function evalWork(board, t, season, rule = null) {
  const r = evalWorkBase(board, t, season, rule);
  if (r.good && t.workFresh) r.pts += BALANCE.works.freshBonus;   // ouvrage frais (posé sans traîner) : +1 par saison
  return r;
}
function evalWorkBase(board, t, season, rule = null) {
  const id = t.work; if (!id) return { good: false, pts: 0, label: '' };
  const nbs = neighbors(t.q, t.r).map(([a, b]) => board.get(a, b)).filter(Boolean);
  const count = (fam) => nbs.filter((n) => Board.isFamily(n, fam)).length;
  const is = (fam) => Board.isFamily(t, fam);
  const regionSize = (fam) => { const reg = board.region(t.q, t.r, fam); return reg ? reg.size : 0; };
  switch (id) {
    case 'hive': { const fl = count('orchard') + count('meadow'); if ((is('orchard') || is('meadow')) && fl > 0 && count('marsh') === 0) return { good: true, pts: Math.min(3, fl) + (season === 'spring' ? 1 : 0), label: 'butine' }; return { good: false, pts: -2, label: 'sans fleurs' }; }
    case 'scarecrow': if (is('field')) return { good: true, pts: 1 + Math.min(3, count('field')), label: 'garde les champs' }; return { good: false, pts: -2, label: 'hors champ' };
    case 'pier': if (is('water') && count('hamlet') > 0) return { good: true, pts: 3, label: 'à quai' }; return { good: false, pts: -2, label: 'dérive' };
    case 'bridge': { const w = classifyWater(board).get(key(t.q, t.r)); if (is('water') && w && w.kind === 'river' && count('hamlet') >= 2) return { good: true, pts: 3, label: 'relie' }; return { good: false, pts: -1, label: w && w.kind !== 'river' ? 'pas de rivière' : 'ne mène nulle part' }; }
    case 'nestbox': if (is('forest') && regionSize('forest') >= 3) return { good: true, pts: 2, label: 'habité' }; return { good: false, pts: -2, label: 'vide' };
    case 'campfire': { if (rule === 'feux' && season === 'summer') return { good: false, pts: -5, label: 'brûle' }; const h = count('hamlet'); if ((is('forest') || is('meadow')) && h > 0) return { good: true, pts: 1 + Math.min(2, h) + (season === 'winter' ? 1 : 0), label: 'veillée' }; return { good: false, pts: -2, label: 'abandonné' }; }
    case 'menhir': if (is('rock') || is('hill')) return { good: true, pts: Math.min(4, Math.max(regionSize('rock'), regionSize('hill'))), label: 'dressé' }; return { good: false, pts: -1, label: 'couché' };
    case 'compost': { const f = count('field') + count('orchard'); if ((is('field') || is('orchard')) && count('hamlet') === 0) return { good: true, pts: Math.max(1, Math.min(3, f)), label: 'nourrit' }; return { good: false, pts: -2, label: 'ça sent' }; }
    default: return { good: false, pts: 0, label: '' };
  }
}

/** Aperçu de la pose d'un ouvrage sur la tuile (q, r) : ce qu'il rapporterait cette saison. */
export function previewWork(board, q, r, tile, season, mods = {}) {
  const t = board.get(q, r); if (!t || t.rare || t.work || !tile || !tile.work) return null;
  const r0 = evalWork(board, { ...t, work: tile.family, workFresh: !!mods.fresh }, season, mods.rule || null);
  return { total: r0.pts, edges: [], closes: [], river: null, base: [{ pts: r0.pts, label: r0.label }], build: true, work: tile.family, good: r0.good, level: t.level || 1, fresh: !!mods.fresh };
}
