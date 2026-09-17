// Déroulement d'une île : orchestration des règles, saisons, faune, vœux, souffles, fin et bilan.
// Modèle pur (sans DOM ni canvas) : utilisable en Node pour les tests et le bot.
import { Board } from './board.js';
import { preview, apply } from './rules.js';
import { transition, nextSeason } from './seasons.js';
import { evaluate as evalFauna, reconcile } from './fauna.js';
import { initWishes, updateWishes } from './wishes.js';
import { TileQueue } from './queue.js';
import { generateMask } from '../data/islands.js';
import { BALANCE } from '../data/balance.js';
import { RNG } from '../core/math.js';
import { key } from './hex.js';

export class Island {
  /**
   * @param {object} def définition d'île (data/islands.js)
   * @param {object} o { upgrades, seedOffset, garden }
   */
  constructor(def, o = {}) {
    this.def = def;
    this.upgrades = o.upgrades || {};
    const seed = def.seed + (o.seedOffset || 0);
    this.rng = new RNG(seed * 7 + 1);
    this.board = new Board(generateMask(seed, def.cells, { roughness: def.roughness, holes: def.holes }));
    this.garden = !!def.garden;
    this.infinite = !!def.infinite;
    // tuiles de départ
    for (const s of def.start) {
      if (!this.board.has(s.q, s.r)) this.board.mask.add(key(s.q, s.r));
      const t = this.board.place(s.q, s.r, { family: s.family, variant: 1, rare: s.family === 'ruins', id: 0, start: true });
      t.start = true;
    }
    const total = Number.isFinite(def.tilesRatio) ? Math.round(def.cells * def.tilesRatio) - def.start.length : Infinity;
    const visible = BALANCE.queue.visible[this.upgrades.sight || 0];
    this.queue = new TileQueue(seed * 3 + 11, def.weights, total, visible);
    this.queue.pocketSize = BALANCE.queue.pocket[this.upgrades.pocket || 0];
    // ouverture guidée : les premières tuiles des îles d'apprentissage sont fixées (pas de marais ni de sable en première minute)
    if (def.opening) def.opening.forEach((f, i) => { if (i < this.queue.list.length) this.queue.list[i] = this.queue.makeTile(f); });
    if ((this.upgrades.rare || 0) > 0) this.queue.inject(this.queue.makeRare(this.upgrades.rare === 1 ? 'well' : 'mill'), false);
    this.season = def.startSeason || 'spring';
    this.seasonLength = def.seasonLength + BALANCE.queue.seasonExtra[this.upgrades.patience || 0];
    this.inSeason = 0;
    this.placements = 0;
    this.seasonsPassed = [];
    this.score = 0;
    this.breaths = BALANCE.breaths.start[this.upgrades.breath || 0];
    this.wishes = initWishes(def.wishes || []);
    this.fauna = new Map();
    this.stats = { harvest: 0, bloom: 0, closedThisSeason: 0, irrigatedSummer: 0, closed: 0, rivers: 0, faunaMax: 0, wishesDone: 0, biggestRegion: 0, undo: 0 };
    this.history = [];         // instantanés pour le souvenir
    this.undoUsedThisSeason = false;
    this.ended = false;
    this.result = null;
    this.listeners = [];
    this.lastEvents = [];
    this.updateFauna();
  }

  on(fn) { this.listeners.push(fn); }
  emit(ev) { this.lastEvents.push(ev); for (const fn of this.listeners) fn(ev); }

  get wishCtx() { return { board: this.board, season: this.season, fauna: this.fauna, stats: this.stats, placements: this.placements, seasonsPassed: this.seasonsPassed }; }
  get current() { return this.queue.next; }
  get seasonProgress() { return this.inSeason / this.seasonLength; }

  /** Prévisualisation d'une pose de la tuile courante. */
  preview(q, r, tile = this.current) {
    if (!tile || !this.board.canPlace(q, r)) return null;
    return preview(this.board, q, r, tile, this.season);
  }

  canPlace(q, r) { return !this.ended && !!this.current && this.board.canPlace(q, r); }

  /** Pose la tuile courante. */
  place(q, r, tileOverride = null) {
    if (this.ended) return null;
    const tile = tileOverride || this.current;
    if (!tile || !this.board.canPlace(q, r)) return null;
    this.pushHistory();
    if (!tileOverride) this.queue.take();
    const res = apply(this.board, q, r, tile, this.season);
    this.placements++; this.inSeason++;
    this.score += res.total;
    for (const c of res.closes) { this.stats.closed++; this.stats.closedThisSeason++; this.stats.biggestRegion = Math.max(this.stats.biggestRegion, c.size); }
    if (this.season === 'summer' && Board.isFamily(tile, 'field') && this.board.landNeighbors(q, r).some(([a, b]) => { const n = this.board.get(a, b); return n && Board.isFamily(n, 'water'); })) this.stats.irrigatedSummer++;
    this.emit({ type: 'place', q, r, tile, result: res });
    for (const c of res.closes) this.emit({ type: 'close', ...c });
    this.updateFauna();
    this.checkWishes();
    if (!this.garden && this.inSeason >= this.seasonLength) this.advanceSeason();
    if (this.infinite && this.placements % BALANCE.infinite.growEvery === 0 && this.board.cells < BALANCE.infinite.maxCells) {
      const added = this.board.grow(BALANCE.infinite.growCells, this.rng);
      if (added.length) this.emit({ type: 'grow', cells: added });
    }
    this.checkEnd();
    return res;
  }

  advanceSeason() {
    const from = this.season;
    this.season = nextSeason(this.season);
    this.seasonsPassed.push(this.season);
    this.inSeason = 0;
    this.stats.closedThisSeason = 0;
    this.undoUsedThisSeason = false;
    const ev = transition(this.board, this.season);
    let pts = 0;
    for (const e of ev) { if (e.pts) pts += e.pts; if (e.type === 'harvest') this.stats.harvest++; if (e.type === 'bloom') this.stats.bloom++; }
    // faune : chaque animal présent donne des souffles et des points
    const faunaBonus = this.fauna.size;
    pts += faunaBonus * BALANCE.points.faunaSeason;
    this.breaths += faunaBonus * BALANCE.breaths.faunaSeason;
    this.score += pts;
    this.emit({ type: 'season', from, to: this.season, events: ev, pts, faunaBonus });
    this.updateFauna();
    this.checkWishes();
    if (this.season === 'summer') this.stats.irrigatedSummer = this.countIrrigated();
  }

  countIrrigated() {
    let n = 0;
    for (const t of this.board.tiles.values()) if (Board.isFamily(t, 'field') && this.board.regionNeighbors({ cells: [t], keys: new Set([key(t.q, t.r)]) }).some((x) => Board.isFamily(x, 'water'))) n++;
    return n;
  }

  updateFauna() {
    const expected = evalFauna(this.board, this.season);
    const { arrivals, departures, current } = reconcile(this.fauna, expected);
    this.fauna = current;
    this.stats.faunaMax = Math.max(this.stats.faunaMax, this.fauna.size);
    for (const a of arrivals) this.emit({ type: 'fauna', kind: 'arrive', ...a });
    for (const d of departures) this.emit({ type: 'fauna', kind: 'leave', ...d });
  }

  checkWishes() {
    const ev = updateWishes(this.wishes, this.wishCtx);
    for (const e of ev) {
      if (e.type === 'done') {
        this.stats.wishesDone++;
        this.score += BALANCE.points.wish;
        this.breaths += BALANCE.breaths.wish;
        const rare = this.pickRare();
        this.queue.inject(this.queue.makeRare(rare), false);
        this.emit({ type: 'wish', kind: 'done', wish: e.wish, rare });
      } else this.emit({ type: 'wish', kind: 'failed', wish: e.wish });
    }
  }

  pickRare() { const pool = ['mill', 'chapel', 'watchtower', 'well', 'camp']; return pool[Math.floor(this.rng.next() * pool.length)]; }

  // ---- Souffles ----
  get undoCost() { return BALANCE.breaths.undo[this.upgrades.memory || 0]; }
  canSwap(i) { return this.breaths >= BALANCE.breaths.swap && i < this.queue.list.length; }
  swap(i) { if (!this.canSwap(i) || !this.queue.swap(i)) return false; this.breaths -= BALANCE.breaths.swap; this.emit({ type: 'breath', kind: 'swap' }); return true; }
  canDiscard() { return this.breaths >= BALANCE.breaths.discard && this.queue.list.length > 0; }
  discard() { if (!this.canDiscard()) return false; this.breaths -= BALANCE.breaths.discard; const t = this.queue.discard(); this.emit({ type: 'breath', kind: 'discard', tile: t }); this.checkEnd(); return true; }
  canBud(q, r) { const t = this.board.get(q, r); return this.breaths >= BALANCE.breaths.bud && !!t && t.family === 'meadow' && !t.rare; }
  bud(q, r, family) {
    if (!this.canBud(q, r) || !['forest', 'orchard'].includes(family)) return false;
    this.pushHistory();
    const t = this.board.get(q, r);
    t.family = family; t.variant = 1 + Math.floor(this.rng.next() * 2); t.dry = false;
    this.breaths -= BALANCE.breaths.bud;
    this.emit({ type: 'breath', kind: 'bud', q, r, family });
    this.updateFauna(); this.checkWishes();
    return true;
  }
  canUndo() { return this.history.length > 0 && this.breaths >= this.undoCost && !this.undoUsedThisSeason; }
  undo() {
    if (!this.canUndo()) return false;
    const s = this.history.pop();
    this.board.restore(s.board); this.queue.restore(s.queue);
    this.score = s.score; this.placements = s.placements; this.inSeason = s.inSeason; this.season = s.season; this.seasonsPassed = [...s.seasonsPassed];
    this.stats = { ...s.stats }; this.wishes = s.wishes.map((w) => ({ ...w }));
    this.breaths = s.breaths - this.undoCost;
    this.undoUsedThisSeason = true; this.stats.undo++;
    this.fauna = new Map(s.fauna);
    this.emit({ type: 'breath', kind: 'undo' });
    return true;
  }
  canPocket() { return this.queue.pocketSize > 0 && this.queue.pocket.length < this.queue.pocketSize && !!this.current; }
  toPocket() { if (!this.canPocket()) return false; this.queue.toPocket(); this.emit({ type: 'pocket', kind: 'in' }); this.checkEnd(); return true; }
  fromPocket(i = 0) { if (!this.queue.pocket.length) return false; this.queue.fromPocket(i); this.emit({ type: 'pocket', kind: 'out' }); return true; }

  pushHistory() {
    this.history.push({ board: this.board.snapshot(), queue: this.queue.snapshot(), score: this.score, placements: this.placements, inSeason: this.inSeason, season: this.season, seasonsPassed: [...this.seasonsPassed], stats: { ...this.stats }, wishes: this.wishes.map((w) => ({ ...w })), breaths: this.breaths, fauna: new Map(this.fauna) });
    if (this.history.length > 3) this.history.shift();
  }

  /** Jardin : choisir librement la famille de la tuile courante. */
  setGardenTile(family) { if (!this.garden) return; this.queue.list[0] = this.queue.makeTile(family); }

  checkEnd() {
    if (this.ended) return;
    const noTile = this.queue.empty && this.queue.pocket.length === 0;
    const noMove = this.board.legalCells().length === 0;
    if (noTile || noMove) this.finish(noMove ? 'full' : 'queue');
  }

  finish(reason = 'queue') {
    if (this.ended) return this.result;
    this.ended = true;
    const cells = this.board.cells;
    const th = BALANCE.stars.perCell.map((f) => Math.round(cells * f));
    let stars = 0;
    for (const t of th) if (this.score >= t) stars++;
    const wishesTotal = this.wishes.length;
    if (stars === 3 && wishesTotal && this.stats.wishesDone < wishesTotal) stars = 2;
    const seeds = stars * BALANCE.seeds.star + this.stats.wishesDone * BALANCE.seeds.wish + (this.infinite || this.garden ? 0 : BALANCE.seeds.island);
    this.result = { island: this.def.id, score: this.score, stars: this.infinite || this.garden ? 0 : stars, thresholds: th, reason, placements: this.placements, seasons: this.seasonsPassed.length, stats: { ...this.stats }, fauna: this.fauna.size, wishesDone: this.stats.wishesDone, wishesTotal, seeds, cells, filled: this.board.placed };
    this.emit({ type: 'end', result: this.result });
    return this.result;
  }
}
