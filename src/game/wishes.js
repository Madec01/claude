// Vœux des habitants : évaluation, échéances, récompenses.
import { Board } from './board.js';
import { veilleePairs } from './seasons.js';
import { speciesCount } from './fauna.js';
import { neighbors } from './hex.js';
import { SEASONS, FUSION_BY_ID } from '../data/tiles.js';
import { rivers, lakes } from './water.js';

/** État d'un vœu : { def, status: 'open'|'done'|'failed', progress, target } */
export function initWishes(defs) { return defs.map((def) => ({ def, status: 'open', progress: 0, target: targetOf(def) })); }

export function targetOf(def) {
  switch (def.type) {
    case 'region': case 'closed': return def.size;
    case 'pairs': case 'bourg': case 'irrigated': case 'bloom': case 'harvest': case 'species': case 'rivers': case 'closedInSeason': return def.count;
    case 'veillee': return def.pairs;
    case 'river': case 'lake': return def.minLen || def.size;
    case 'fauna': return 1;
    case 'fusion': return def.count || 1;
    case 'level': return def.count || 1;
    default: return 1;
  }
}

/** Compte les paires de bords entre deux familles (un champ entre deux hameaux fait deux bords). */
export function countPairs(board, a, b) {
  let n = 0;
  for (const t of board.tiles.values()) {
    if (!Board.isFamily(t, a)) continue;
    for (const [x, y] of neighbors(t.q, t.r)) { const o = board.get(x, y); if (o && Board.isFamily(o, b)) n++; }
  }
  return a === b ? n / 2 : n;
}

/**
 * Compte les tuiles de la famille `a` qui touchent au moins une tuile de la famille `b`.
 * C'est ce que promettent les vœux : « deux champs collés à un hameau », ce sont bien DEUX CHAMPS.
 * Compter les bords laissait un seul champ posé entre deux hameaux exaucer le vœu (retour joueur).
 */
export function countTouching(board, a, b) {
  let n = 0;
  for (const t of board.tiles.values()) {
    if (!Board.isFamily(t, a)) continue;
    if (neighbors(t.q, t.r).some(([x, y]) => { const o = board.get(x, y); return o && o !== t && Board.isFamily(o, b); })) n++;
  }
  return n;
}

/**
 * Progression d'un vœu dans l'état courant.
 * @param {object} ctx { board, season, fauna(Map), stats: { harvest, bloom, closedThisSeason, irrigatedSummer } }
 */
export function progressOf(w, ctx) {
  const d = w.def, b = ctx.board;
  switch (d.type) {
    case 'region': return Math.max(0, ...b.regions(d.family).map((r) => r.size));
    case 'closed': { let best = 0; for (const reg of b.paidRegions(d.family || 'meadow')) best = Math.max(best, reg.size); return best; }
    case 'pairs': return countTouching(b, d.a, d.b);   // « deux champs collés à un hameau » : deux champs, pas deux bords
    case 'river': return Math.max(0, ...rivers(b).filter((w) => !d.mouth || w.mouth).map((w) => w.size));
    case 'rivers': return rivers(b).filter((w) => w.mouth).length;
    case 'lake': return Math.max(0, ...lakes(b).map((w) => w.size));
    case 'fauna': return [...ctx.fauna.values()].some((a) => a.species === d.species) ? 1 : 0;
    case 'fusion': return [...b.tiles.values()].filter((t) => t.fusion && t.family === d.recipe).length;
    case 'level': return [...b.tiles.values()].filter((t) => !t.rare && !t.grown && (t.level || 1) >= 2).length;   // le vœu demande de bâtir : ce que le temps fait seul ne compte pas
    case 'species': return speciesCount(ctx.fauna);
    case 'bourg': return b.paidRegions('hamlet').length;
    case 'veillee': return veilleePairs(b);
    case 'irrigated': return ctx.stats.irrigatedSummer;
    case 'bloom': return ctx.stats.bloom;
    case 'harvest': return ctx.stats.harvest;
    case 'closedInSeason': return ctx.stats.closedThisSeason;
    default: return 0;
  }
}

/**
 * Ce qu'un vœu demande à la file de tuiles : les familles et leur nombre, pour qu'il soit faisable. Un vœu qui demande
 * « trois vergers collés à un hameau » ne vaut rien si la file n'apporte qu'un verger (retour du commanditaire). Les
 * tuiles de départ comptent ; une tuile de plus (`reserve`) laisse droit à une erreur de placement. Les vœux qui ne
 * dépendent pas d'une famille précise (espèces, régions closes dans la saison, bâtir) ne demandent rien.
 */
const HABITAT = {
  rabbit: { meadow: 3 }, moose: { forest: 5 }, duck: { water: 3 }, bear: { forest: 3, rock: 1 }, frog: { marsh: 1, water: 1 },
  owl: { forest: 1, hamlet: 1 }, penguin: { water: 4 }, chicken: { field: 2, hamlet: 1 }, horse: { hill: 2, meadow: 1 }, cow: { meadow: 2, heath: 1 },
};
export function besoinsVoeu(def) {
  const out = {};
  const add = (f, n) => { if (f && n > 0) out[f] = Math.max(out[f] || 0, n); };
  switch (def.type) {
    case 'pairs': add(def.a, def.count); add(def.b, Math.ceil(def.count / 4)); break;
    case 'region': add(def.family, def.size); break;
    case 'closed': add(def.family || 'meadow', def.size); break;
    case 'river': add('water', (def.minLen || 3) + (def.mouth ? 1 : 0)); add('rock', 1); break;
    case 'rivers': add('water', 3 * def.count); add('rock', def.count); break;
    case 'lake': add('water', def.size); break;
    case 'fauna': for (const [f, n] of Object.entries(HABITAT[def.species] || {})) add(f, n); break;
    case 'bourg': add('hamlet', 2 * def.count); break;
    case 'veillee': add('water', 2); add('hamlet', def.pairs + 1); break;
    case 'irrigated': add('field', def.count); add('water', 1); break;
    case 'bloom': add('marsh', def.count); break;
    case 'harvest': add('orchard', Math.ceil(def.count / 2)); add('hamlet', 1); break;
    case 'fusion': { const r = FUSION_BY_ID[def.recipe]; if (r) { add(r.a, 1); add(r.b, 1); } break; }
    default: break;
  }
  return out;
}

/** La pose limite d'un vœu, en nombre de poses : son échéance, ou l'arrivée de la saison nommée (saisons de base). */
export function poseLimite(def, { startSeason = 'spring', seasonLength = 8, cells = 60 } = {}) {
  const dl = def.deadline || {};
  if (dl.placements !== undefined) return dl.placements;
  if (dl.season) { const k = (SEASONS.indexOf(dl.season) - SEASONS.indexOf(startSeason) + 4) % 4 || 4; return (k + 4 * ((dl.cycle || 1) - 1)) * seasonLength; }
  return cells;
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
