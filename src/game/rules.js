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
    if ((season === 'winter' || (season === 'autumn' && climate && climate.fieldsDormantAutumn)) && rule !== 'doux' && ((x === 'field' && y === 'hamlet') || (x === 'hamlet' && y === 'field')) && tile.family !== 'granary' && other.family !== 'granary') continue; // champs dormants (sauf grenier et hiver doux ; dès l'automne en climat froid)
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
  // grenier : +1 par bord avec un champ
  if ((tile.family === 'granary' && fb.includes('field')) || (other.family === 'granary' && fa.includes('field'))) best += 1;
  // climat : vergers +1 au chaud ; hameau contre marais −2 en climat humide
  if (climate) {
    if (climate.orchardEdge && best > 0 && (fa.includes('orchard') || fb.includes('orchard'))) best += climate.orchardEdge;
    if (climate.hamletMarsh && ((fa.includes('hamlet') && fb.includes('marsh')) || (fa.includes('marsh') && fb.includes('hamlet')))) best = climate.hamletMarsh;
  }
  // niveau 2 : tous les bords de la tuile bâtie valent +1 de plus (les mauvaises paires restent mauvaises)
  if (best >= 0) best += Math.max(0, (tile.level || 1) - 1) + Math.max(0, (other.level || 1) - 1);   // niveau 2 : +1, niveau 3 : +2
  return { pts: best, label: bestKey ? (PAIR_LABELS[bestKey] || '') : '' };
}

/** Multiplicateur de bord du mode « Sous la brume » : jalon juste ×3, tuile dévoilée ×2, sinon ×1. */
function brumeMul(t, dores = false) { return t.jalon ? 3 : t.devoilee ? (dores ? 3 : 2) : 1; }

/** Points gagnés sur chaque bord si la tuile `t` en (q, r) devenait `up` : la différence entre après et avant, bord par bord. */
function deltaEdges(board, q, r, t, up, season, mods) {
  const edges = []; let total = 0;
  DIRS.forEach(([dq, dr], d) => {
    const n = board.get(q + dq, r + dr); if (!n) return;
    const after = edgePoints(up, n, season, mods.rule || null, mods.climate || null), before = edgePoints(t, n, season, mods.rule || null, mods.climate || null);
    const pts = after.pts - before.pts;
    if (pts !== 0) { edges.push({ d, q: q + dq, r: r + dr, pts, label: after.label }); total += pts; }
  });
  return { edges, total };
}

/** Régions que fermerait la tuile `up` mise à la place de `t` en (q, r) (simulation, le plateau est rendu tel quel). */
function closesIf(board, q, r, t, up) {
  return board.simulate(() => {
    const k = key(q, r); board.tiles.set(k, up); board.version++; board._water = null;
    try { return closedRegionsAround(board, q, r); } finally { board.tiles.set(k, t); }
  });
}

/**
 * Peut-on bâtir la tuile en (q, r) ? Une tuile de base (ni rare ni friche) dont le niveau maximal n'est pas atteint,
 * et dont la région est close (déjà payée) : on bâtit ce qui est achevé. Aucune tuile de la file n'est consommée.
 */
export function canLevelUp(board, q, r) {
  const t = board.get(q, r);
  if (!t || t.rare || t.blighted || (t.level || 1) >= BALANCE.build.maxLevel) return false;
  return board.regionPaid(board.region(q, r, t.family));
}

/**
 * Aperçu d'une construction : la tuile en place monte d'un niveau et l'on gagne, sur chaque bord, la différence
 * entre sa valeur au nouveau niveau et sa valeur actuelle (+1 par bord qui n'est pas une mauvaise paire).
 * Les bords ne sont donc pas rejoués en entier : bâtir vaut à peu près une bonne pose. La région étant close, rien ne se ferme.
 */
export function previewBuild(board, q, r, season, mods = {}) {
  const t = board.get(q, r); if (!t) return null;
  const up = { ...t, level: (t.level || 1) + 1 };
  const { edges, total } = deltaEdges(board, q, r, t, up, season, mods);
  return { total, edges, closes: [], river: null, base: [], build: true, level: up.level };
}

/** Une friche (ruine, lit asséché, terre morte) se remet en état d'un toucher, sans tuile. */
export function canRestore(board, q, r) { const t = board.get(q, r); return !!t && !!t.blighted; }

/**
 * Aperçu d'une remise en état : la friche recompte pour sa famille au même niveau. Seuls ses bons voisins comptent
 * (elle a déjà payé les mauvais), et elle peut fermer des régions.
 */
export function previewRestore(board, q, r, season, mods = {}) {
  const t = board.get(q, r); if (!t || !t.blighted) return null;
  const up = { ...t, blighted: false };
  const good = deltaEdges(board, q, r, t, up, season, mods).edges.filter((e) => e.pts > 0);
  let total = good.reduce((a, e) => a + e.pts, 0);
  const closes = closesIf(board, q, r, t, up);
  for (const c of closes) total += c.bonus;
  return { total, edges: good, closes, river: null, base: [{ pts: 0, label: 'remise en état' }], build: true, level: up.level || 1, restore: true };
}

/**
 * Les fusions possibles pour la tuile en (q, r) avec l'une de ses voisines : une entrée par recette, avec la voisine
 * qui la permet. La tuile doit être de base, saine et au niveau 1 (une tuile bâtie ne fusionne plus : la fusion
 * repart au niveau 1) ; la voisine, de base et saine. Aucune des deux n'est consommée : la tuile touchée devient
 * la tuile composée, la voisine reste.
 * @returns {Array<{recipe:object, with:{q:number,r:number,family:string}}>}
 */
export function fusionsAround(board, q, r) {
  const t = board.get(q, r);
  if (!t || t.rare || t.blighted || (t.level || 1) > 1) return [];
  const out = [];
  for (const [a, b] of neighbors(q, r)) {
    const n = board.get(a, b); if (!n || n.rare || n.blighted) continue;
    const recipe = fusionFor(t.family, n.family); if (!recipe || out.some((o) => o.recipe.id === recipe.id)) continue;
    out.push({ recipe, with: { q: a, r: b, family: n.family } });
  }
  return out;
}

/** Tuile fusionnée (compte pour ses deux familles). `from` garde la famille d'origine et celle de la voisine. */
export function fusedTile(t, recipe, withFamily = null) { return { ...t, family: recipe.id, rare: true, fusion: true, level: 1, from: withFamily ? [t.family, withFamily] : [t.family] }; }

/**
 * Aperçu d'une fusion : la tuile en place devient la tuile composée ; on gagne la différence de valeur des bords,
 * la prime de fusion et les éventuelles fermetures de régions (la tuile composée appartient à deux familles).
 */
export function previewFuse(board, q, r, recipeId, season, mods = {}) {
  const t = board.get(q, r); const f = fusionsAround(board, q, r).find((x) => x.recipe.id === recipeId); if (!f) return null;
  const fused = fusedTile(t, f.recipe, f.with.family);
  const { edges } = deltaEdges(board, q, r, t, fused, season, mods); let total = edges.reduce((a, e) => a + e.pts, 0);
  const closes = closesIf(board, q, r, t, fused);
  for (const c of closes) total += c.bonus;
  const base = [{ pts: BALANCE.fusion.bonus, label: 'fusion' }]; total += BALANCE.fusion.bonus;
  return { total, edges, closes, river: null, base, build: true, fuse: f.recipe, with: f.with, level: 1 };
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
    // Sous la brume : un bord qui touche une tuile dévoilée compte double, un jalon juste le triple (dans les deux sens :
    // une mauvaise paire coûte d'autant plus). Aucune tuile n'a ces marques hors de ce mode.
    const mul = Math.max(brumeMul(tile, !!mods.brumeDores), brumeMul(n, !!mods.brumeDores));
    let pts = e.pts * mul;
    if (mods.brumeMauvais && pts < 0) pts *= 2;   // la carte « Mauvais voisinage » : les mauvaises paires comptent double
    if (pts !== 0) { edges.push({ d, q: q + dq, r: r + dr, pts, label: mul > 1 ? `${e.label ? e.label + " " : ""}×${mul}` : e.label }); total += pts; }
  });
  // simulation de la pose pour rivières et fermetures (la version et les caches du plateau sont rendus intacts)
  return board.simulate(() => {
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
  if (mods.rule === 'feux' && Board.isFamily(placed, 'forest') && neighbors(q, r).some(([a, b]) => Board.isFamily(board.get(a, b), 'water'))) { base.push({ pts: 2, label: 'pare-feu' }); total += 2; }
  // une grande région : la tuile qui agrandit une région de sa famille de 5 tuiles ou plus gagne +1 (+2 à partir de 10)
  { const G = P.grandeRegion; const fam = placed.rare ? null : placed.family; const reg = fam ? board.region(q, r, fam) : null;
    if (reg && reg.size >= G.des) { const pts = reg.size >= G.tresGrande ? G.poseTresGrande : G.pose; base.push({ pts, label: reg.size >= G.tresGrande ? 'très grande région' : 'grande région' }); total += pts; } }
  const closes = closedRegionsAround(board, q, r);
  for (const c of closes) total += c.bonus;
  board.tiles.delete(key(q, r));
  // friche : une pose qui coûte des points (bords et contraintes) laisse une tuile morte, qui ne rapportera plus rien
  const blight = total < 0 && !tile.rare;
  return { total, edges, closes, river, base, blight };
  });
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
      if (!reg || seen.has(reg.id) || board.regionPaid(reg)) continue;   // déjà payée en entier : plus rien à donner
      seen.add(reg.id);
      if (fam === 'rock' && reg.cells.every((c) => c.rare || c.start)) continue; // les rochers de départ ne font pas de prime
      const closed = board.isRegionClosed(reg) || (reg.cells.some((c) => c.family === 'watchtower' || c.family === 'fort') && openCells(board, reg) <= 1);
      // une grande région fermée : sa prime ×1,5 à partir de 5 tuiles, ×2 à partir de 10 (en plus du double des hameaux)
      const G = P.grandeRegion; const mul = (P.closeBonusMul[fam] || 1) * (reg.size >= G.tresGrande ? G.primeTresGrande : reg.size >= G.des ? G.prime : 1);
      // la prime ne porte que sur ce qui n'a pas déjà été payé : une région close qui regrandit paie
      // son agrandissement, du côté qu'on veut, et jamais deux fois la même case
      const neuf = board.regionUnpaid(reg);
      if (closed && neuf > 0) out.push({ family: fam, size: reg.size, newSize: neuf, bonus: Math.round(neuf * mul), keys: reg.keys, id: reg.id, cells: reg.cells, again: neuf < reg.size });
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
  for (const c of res.closes) board.payRegion(c);
  return res;
}

/** Régions closes « bourgs » (hameaux) présentes sur le plateau. */
export function countClosedRegions(board, family = null) {
  if (family) return board.paidRegions(family).length;
  const familles = new Set();
  for (const t of board.tiles.values()) for (const f of Board.familiesOf(t)) familles.add(f);
  let n = 0;
  for (const fam of familles) n += board.paidRegions(fam).length;
  return n;
}
