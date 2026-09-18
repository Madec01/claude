// Vœux des habitants : évaluation, échéances, récompenses.
import { Board } from './board.js';
import { veilleePairs } from './seasons.js';
import { speciesCount } from './fauna.js';
import { neighbors } from './hex.js';
import { SEASONS } from '../data/tiles.js';
import { rivers, lakes } from './water.js';

/** État d'un vœu : { def, status: 'open'|'done'|'failed', progress, target } */
export function initWishes(defs) { return defs.map((def) => ({ def, status: 'open', progress: 0, target: targetOf(def) })); }

function targetOf(def) {
  switch (def.type) {
    case 'region': case 'closed': return def.size;
    case 'pairs': case 'bourg': case 'irrigated': case 'bloom': case 'harvest': case 'species': case 'rivers': case 'closedInSeason': return def.count;
    case 'veillee': return def.pairs;
    case 'river': case 'lake': return def.minLen || def.size;
    case 'fauna': return 1;
    case 'fusion': return def.count || 1;
    case 'level': case 'works': return def.count || 1;
    default: return 1;
  }
}

/** Compte les paires de bords entre deux familles. */
export function countPairs(board, a, b) {
  let n = 0;
  for (const t of board.tiles.values()) {
    if (!Board.isFamily(t, a)) continue;
    for (const [x, y] of neighbors(t.q, t.r)) { const o = board.get(x, y); if (o && Board.isFamily(o, b)) n++; }
  }
  return a === b ? n / 2 : n;
}

/**
 * Progression d'un vœu dans l'état courant.
 * @param {object} ctx { board, season, fauna(Map), stats: { harvest, bloom, closedThisSeason, irrigatedSummer } }
 */
export function progressOf(w, ctx) {
  const d = w.def, b = ctx.board;
  switch (d.type) {
    case 'region': return Math.max(0, ...b.regions(d.family).map((r) => r.size));
    case 'closed': { let best = 0; for (const id of b.closedRegions) { if (d.family && !id.startsWith(d.family + ':')) continue; const [fam, k] = id.split(':'); const [q, r] = k.split(',').map(Number); const reg = b.region(q, r, fam); if (reg) best = Math.max(best, reg.size); } return best; }
    case 'pairs': return countPairs(b, d.a, d.b);
    case 'river': return Math.max(0, ...rivers(b).filter((w) => !d.mouth || w.mouth).map((w) => w.size));
    case 'rivers': return rivers(b).filter((w) => w.mouth).length;
    case 'lake': return Math.max(0, ...lakes(b).map((w) => w.size));
    case 'fauna': return [...ctx.fauna.values()].some((a) => a.species === d.species) ? 1 : 0;
    case 'fusion': return [...b.tiles.values()].filter((t) => t.fusion && t.family === d.recipe).length;
    case 'level': return [...b.tiles.values()].filter((t) => !t.rare && (t.level || 1) >= 2).length;
    case 'works': return [...b.tiles.values()].filter((t) => t.work && !t.workBad).length;
    case 'species': return speciesCount(ctx.fauna);
    case 'bourg': return [...b.closedRegions].filter((id) => id.startsWith('hamlet:')).length + b.regions('hamlet').filter((r) => !b.closedRegions.has(r.id) && r.cells.some((c) => (c.level || 1) >= 3 && !c.rare)).length;
    case 'veillee': return veilleePairs(b);
    case 'irrigated': return ctx.stats.irrigatedSummer;
    case 'bloom': return ctx.stats.bloom;
    case 'harvest': return ctx.stats.harvest;
    case 'closedInSeason': return ctx.stats.closedThisSeason;
    default: return 0;
  }
}

/** L'échéance est-elle dépassée ? (placements : nombre de poses ; season : la saison nommée commence) */
export function expired(w, ctx) {
  const dl = w.def.deadline;
  if (!dl) return false;
  if (dl.placements !== undefined) return ctx.placements >= dl.placements;
  if (dl.season) {
    const cycle = dl.cycle || 1;
    return ctx.seasonsPassed.filter((s) => s === dl.season).length >= cycle;
  }
  return false;
}

/** Met à jour tous les vœux. Retourne les événements { type:'done'|'failed', wish }. */
export function updateWishes(wishes, ctx) {
  const ev = [];
  for (const w of wishes) {
    if (w.status === 'failed') { w.progress = progressOf(w, ctx); continue; }   // on continue d'afficher la progression réelle
    if (w.status !== 'open') continue;
    w.progress = progressOf(w, ctx);
    if (w.progress >= w.target) { w.status = 'done'; ev.push({ type: 'done', wish: w }); continue; }
    if (expired(w, ctx)) { w.status = 'failed'; w.failedAt = ctx.placements; ev.push({ type: 'failed', wish: w }); }
  }
  return ev;
}

/** Texte de l'échéance. */
export function deadlineLabel(w, ctx, story) {
  const dl = w.def.deadline;
  if (!dl) return '';
  if (dl.placements !== undefined) { const left = dl.placements - ctx.placements; return left > 0 ? `${left} pose${left > 1 ? 's' : ''}` : 'dernière pose'; }
  if (dl.season) { const name = story && story.seasons[dl.season] ? story.seasons[dl.season].name.toLowerCase() : dl.season; return `avant l’${SEASONS.indexOf(dl.season) === 3 ? 'hiver' : name}`.replace('l’printemps', 'le printemps').replace('l’été', 'l’été'); }
  return '';
}
