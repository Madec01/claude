// Bot « fort » pour le calibrage des étoiles et les tests : anticipation d'un coup, poursuite des vœux,
// faune, fermetures, souffles (échange, défausse, bourgeon). Sans DOM. Usage : import { playStrong } from './bot.js'.
import { Island } from '../src/game/island.js';
import { islandOptions } from '../src/data/campaign.js';
import { Board } from '../src/game/board.js';
import { evaluate as evalFauna } from '../src/game/fauna.js';
import { progressOf } from '../src/game/wishes.js';
import { neighbors } from '../src/game/hex.js';

const W = { next: 0.6, wish: 2.5, wishDone: 12, fauna: 3, grow: 0.35, close: 1.2 };

/** Score heuristique d'une pose (points immédiats + avenir proche). */
function evalMove(isl, tile, q, r, rng, deep) {
  const pv = isl.preview(q, r, tile);
  if (!pv) return -Infinity;
  let s = pv.total + rng() * 0.05;
  if (!deep) return s;
  const b = isl.board;
  // prime aux régions qui grandissent (fermetures et vœux de taille)
  let same = 0; for (const [a, c] of neighbors(q, r)) { const n = b.get(a, c); if (n && Board.familiesOf(n).some((f) => Board.isFamily(tile, f))) same++; }
  s += same * W.grow;
  for (const c of pv.closes) s += c.size * W.close * (c.family === 'hamlet' ? 1.5 : 1);
  // simulation brute : vœux, faune, meilleur coup suivant
  const ctx = isl.wishCtx;
  const open = isl.wishes.filter((w) => w.status === 'open');
  const before = open.map((w) => progressOf(w, ctx));
  const faunaBefore = evalFauna(b, isl.season, isl.rule).size;
  b.place(q, r, tile);
  const avant = new Set(b.closedRegions); for (const c of pv.closes) b.payRegion(c);
  try {
    open.forEach((w, i) => { const p = progressOf(w, ctx); const d = Math.min(p, w.target) - Math.min(before[i], w.target); if (d > 0) s += d * W.wish; if (p >= w.target && before[i] < w.target) s += W.wishDone; });
    s += (evalFauna(b, isl.season, isl.rule).size - faunaBefore) * W.fauna;
    const nxt = isl.queue.list[1];
    if (nxt) { let best = 0; for (const c of b.legalCells()) { const p = isl.preview(c.q, c.r, nxt); if (p && p.total > best) best = p.total; } s += best * W.next; }
  } finally { b.closedRegions = avant; b.remove(q, r); }
  return s;
}

function bestMove(isl, tile, rng) {
  const cells = isl.board.legalCells();
  const quick = cells.map((c) => ({ c, s: evalMove(isl, tile, c.q, c.r, rng, false) })).sort((a, b) => b.s - a.s).slice(0, 10);
  let best = null, bs = -Infinity;
  for (const { c } of quick) { const s = evalMove(isl, tile, c.q, c.r, rng, true); if (s > bs) { bs = s; best = c; } }
  return { cell: best, score: bs };
}

/**
 * Joue une île jusqu'au bout.
 * @param {object} def définition d'île
 * @param {object} o { upgrades, seedOffset (graine de l'île), botSeed (hasard du bot, par défaut = seedOffset), maxPlacements }
 */
export function playStrong(def, o = {}) {
  const isl = new Island(def, { upgrades: o.upgrades || {}, seedOffset: o.seedOffset || 0, known: o.known, ...(def.mech ? islandOptions(def) : {}) });
  let seed = ((o.botSeed !== undefined ? o.botSeed : o.seedOffset) || 0) * 9973 + 17; const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const events = {}; isl.on((e) => { events[e.type] = (events[e.type] || 0) + 1; });
  let guard = 0, picked = false;   // `picked` : une seule prise dans la main par pose, pour ne jamais osciller entre deux tuiles
  while (!isl.ended && guard++ < 3000) {
    const tile = isl.current;
    if (!tile) { if (isl.shed.length && isl.fromShed(0)) continue; isl.checkEnd(); break; }   // file vide : la remise se vide avant la fin
    if (tile.work) {
      // ouvrage : la meilleure tuile d'accueil tout de suite (frais), sinon en remise, sinon défausse (gratuite)
      let bt = null, bs = -Infinity; for (const t of isl.board.tiles.values()) { if (!isl.canBuild(t.q, t.r)) continue; const pv = isl.previewBuild(t.q, t.r); if (pv && pv.total > bs) { bs = pv.total; bt = t; } }
      if (bt && bs > 0) { isl.build(bt.q, bt.r); continue; }
      if (isl.canShed() && isl.queue.list.length > 1 && (isl.shed.length < isl.shedSize || isl.shed.every((s) => isl.shedLeft(s) <= 2))) { isl.toShed(); continue; }   // en remise seulement s'il reste d'autres tuiles à jouer
      if (isl.canDiscard()) { isl.discard(); continue; }
      if (bt) { isl.build(bt.q, bt.r); continue; }
      isl.checkEnd(); break;
    }
    // remise : un ouvrage mis de côté trouve-t-il maintenant une bonne place ?
    if (isl.shed.length) {
      let bi = -1, bt = null, bs = 0;
      isl.shed.forEach((s, i) => { for (const t of isl.board.tiles.values()) { if (!isl.canBuild(t.q, t.r, s)) continue; const pv = isl.previewBuild(t.q, t.r, s); if (pv && pv.total > bs) { bs = pv.total; bt = t; bi = i; } } });
      if (bt && isl.fromShed(bi)) { isl.build(bt.q, bt.r); continue; }
    }
    let mv = bestMove(isl, tile, rng);
    if (!mv.cell) { isl.checkEnd(); break; }
    // main de saison : jouer la meilleure tuile visible, gratuitement
    if (isl.handOn && !picked && isl.queue.list.length > 1) {
      // évaluation rapide (un coup) des autres tuiles de la main ; la meilleure candidate seule est évaluée en profondeur
      let bi = -1, bq = -Infinity;
      for (let i = 1; i < isl.queue.list.length; i++) { if (!isl.canPick(i) || isl.queue.list[i].work) continue; let q = -Infinity; for (const c of isl.board.legalCells()) { const sc = evalMove(isl, isl.queue.list[i], c.q, c.r, rng, false); if (sc > q) q = sc; } if (q > bq) { bq = q; bi = i; } }
      if (bi > 0) { const m = bestMove(isl, isl.queue.list[bi], rng); if (m.cell && m.score > mv.score + 0.5 && isl.pick(bi)) { picked = true; continue; } }
    }
    // souffles : défausser une tuile sans avenir (l'échange et le bourgeon ont été retirés, la main les remplace)
    if (mv.score <= 0 && isl.breaths >= 3 && isl.canDiscard()) { isl.discard(); continue; }
    // bâtir : si une tuile de même famille bien placée rapporte plus que la meilleure pose (retour de tuile compté 3, souffle compté 1)
    if (isl.buildOn && isl.breaths >= 2) {
      let bb = null, bbs = mv.score + 1;
      for (const t of isl.board.tiles.values()) { if (!isl.canBuild(t.q, t.r)) continue; const pv = isl.previewBuild(t.q, t.r); if (!pv) continue; const sc = pv.total + (pv.refund && pv.refund.ok ? 3 : -1) - (pv.cost || 1) + (pv.level >= 3 ? 4 : 0) + (pv.fuse ? 3 : 0); if (sc > bbs) { bbs = sc; bb = t; } }
      if (bb && isl.build(bb.q, bb.r)) continue;
    }
    isl.place(mv.cell.q, mv.cell.r); picked = false;
    if (o.maxPlacements && isl.placements >= o.maxPlacements) isl.finish('test');
  }
  return { result: isl.result, events, isl };
}
