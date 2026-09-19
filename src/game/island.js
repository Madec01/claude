// Déroulement d'une île : orchestration des règles, saisons, faune, vœux, souffles, fin et bilan.
// Modèle pur (sans DOM ni canvas) : utilisable en Node pour les tests et le bot.
import { Board } from './board.js';
import { preview, apply, previewBuild, canBuild as ruleCanBuild, canFuse, previewFuse, fusedTile, evalWork, previewWork } from './rules.js';
import { FUSION_BY_ID, WORKS, LEVEL3_SEASONAL } from '../data/tiles.js';
import { climateOf } from '../data/climates.js';
import { transition, nextSeason } from './seasons.js';
import { evaluate as evalFauna, reconcile } from './fauna.js';
import { initWishes, updateWishes } from './wishes.js';
import { TileQueue } from './queue.js';
import { generateMask } from '../data/islands.js';
import { BALANCE } from '../data/balance.js';
import { computeLinks } from './paths.js';
import { pickWeather } from './weather.js';
import { pickRule, BASE_RULE } from './seasonrules.js';
import { gradeMove } from './feedback.js';
import { RNG } from '../core/math.js';
import { key, neighbors } from './hex.js';

export class Island {
  /**
   * @param {object} def définition d'île (data/islands.js)
   * @param {object} o { upgrades, seedOffset, garden }
   */
  constructor(def, o = {}) {
    this.def = def;
    this.listeners = []; this.lastEvents = [];   // dès le début : le constructeur peut déjà émettre (Talisman)
    this.upgrades = o.upgrades || {};
    this.climate = climateOf(def.climate);   // chaud, humide, froid ou tempéré
    if ((this.upgrades.cloak || 0) > 0 && this.climate.id !== 'temperate') { const c = { ...this.climate }; delete c.dryEarly; delete c.fieldsDormantAutumn; if (c.hamletMarsh) c.hamletMarsh = -1; this.climate = c; }   // Manteau : contrainte du climat adoucie
    this.longSeasonDone = false;
    // bâtir : dès l'île 6 en campagne, toujours dans les modes libres et sur l'Île du jour (forçable par les options : mode test)
    this.buildOn = o.build !== undefined ? !!o.build : (!!def.infinite || !!def.garden || !!def.daily || (typeof def.id === 'number' && def.id >= 6));
    // croissance : dès l'île 41 en campagne, toujours dans les modes libres — une tuile bien entourée des siennes monte au niveau 2 toute seule
    this.growOn = o.growth !== undefined ? !!o.growth : (!!def.infinite || !!def.daily || (typeof def.id === 'number' && def.id >= 41));
    this.refunds = 0;            // tuiles rendues cette saison (au plus une)
    // fusionner : dès l'île 8 en campagne, toujours dans les modes libres et sur l'Île du jour ; `known` = recettes déjà découvertes (sauvegarde)
    this.fuseOn = o.fuse !== undefined ? !!o.fuse : (!!def.infinite || !!def.garden || !!def.daily || (typeof def.id === 'number' && def.id >= 8));
    this.known = o.known || new Set();
    // main de saison : dès l'île 16 en campagne (et dans les modes libres), la tuile à jouer se choisit librement parmi les tuiles visibles
    this.handOn = o.hand !== undefined ? !!o.hand : (!!def.infinite || !!def.garden || !!def.daily || (typeof def.id === 'number' && def.id >= 16));
    this.rareTier = o.rareTier;   // paliers de tuiles rares (0 : base ; 1 : événements ; 2 : grenier, fontaine ; 3 : tardives)
    // niveau 3 : ouvert par les options de campagne (île 31), toujours dans les modes libres et sur l'Île du jour
    this.level3On = o.level3 !== undefined ? !!o.level3 : (!!def.infinite || !!def.garden || !!def.daily || (typeof def.id === 'number' && def.id >= BALANCE.build.level3From));
    // ouvrages : ouverts par les options de campagne (île 26), toujours dans les modes libres et sur l'Île du jour
    this.workOn = o.work !== undefined ? !!o.work : (!!def.infinite || !!def.garden || !!def.daily || (typeof def.id === 'number' && def.id >= BALANCE.works.from));
    this.shed = [];                  // remise : ouvrages mis de côté ({ ...tuile, shedAt })
    this.shedSize = 1 + (this.upgrades.shed || 0);
    const seed = def.seed + (o.seedOffset || 0);
    this.rng = new RNG(seed * 7 + 1);
    this.board = new Board(generateMask(seed, def.cells, { roughness: def.roughness, holes: def.holes }));
    if (this.climate.linkMax) this.board.linkMax = this.climate.linkMax;
    this.garden = !!def.garden;
    this.infinite = !!def.infinite;
    for (const [q, r] of def.ensure || []) this.board.mask.add(key(q, r));
    this.restrict = null;   // tutoriel guidé : cases autorisées (Set de clés) ou null
    // tuiles de départ
    for (const s of def.start) {
      if (!this.board.has(s.q, s.r)) this.board.mask.add(key(s.q, s.r));
      const t = this.board.place(s.q, s.r, { family: s.family, variant: 1, rare: s.family === 'ruins', id: 0, start: true });
      t.start = true;
    }
    const total = Number.isFinite(def.tilesRatio) ? Math.round(def.cells * def.tilesRatio) - def.start.length : Infinity;
    const visible = BALANCE.queue.visible[this.upgrades.sight || 0] + (this.upgrades.spyglass || 0);   // Regard + Longue-vue
    this.queue = new TileQueue(seed * 3 + 11, def.weights, total, visible);
    this.queue.pocketSize = BALANCE.queue.pocket[this.upgrades.pocket || 0];
    // ouverture guidée : les premières tuiles des îles d'apprentissage sont fixées (pas de marais ni de sable en première minute)
    this.pendingOpening = [];
    if (def.opening) { def.opening.forEach((f, i) => { if (i < this.queue.list.length) this.queue.list[i] = this.queue.makeTile(f); }); this.pendingOpening = def.opening.slice(this.queue.list.length); }
    if ((this.upgrades.rare || 0) > 0) this.queue.inject(this.queue.makeRare([null, 'well', 'mill', 'granary', 'fountain'][Math.min(4, this.upgrades.rare)]), false);
    // Semence forte : une tuile de niveau 2 dans la file de départ ; Talisman : un ouvrage (après la création de la file)
    if (this.buildOn && (this.upgrades.seed2 || 0) > 0) { const t = this.queue.makeTile(); t.level = 2; this.queue.inject(t, false); }
    if (this.workOn && (this.upgrades.talisman || 0) > 0) this.giveWork(this.pickWork());
    this.baseMods = { river: BALANCE.upgrades.source[this.upgrades.source || 0] || 0, refuge: BALANCE.upgrades.refuge[this.upgrades.refuge || 0] || 0 };
    this.season = def.startSeason || 'spring';
    this.seasonLength = def.seasonLength + BALANCE.queue.seasonExtra[this.upgrades.patience || 0];
    this.inSeason = 0;
    this.placements = 0;
    this.seasonsPassed = [];
    this.score = 0;
    this.breaths = BALANCE.breaths.start[this.upgrades.breath || 0];
    this.wishes = initWishes(def.wishes || []);
    this.fauna = new Map();
    // d'où viennent les points : cumul par source (le « pourquoi » du score), et le meilleur coup de la partie
    this.tally = { edges: 0, base: 0, closes: 0, seasons: 0, wishes: 0, fauna: 0, works: 0, fusions: 0, build: 0, streak: 0 };
    this.bestMove = null;
    this.stats = { grown: 0, harvest: 0, bloom: 0, closedThisSeason: 0, irrigatedSummer: 0, closed: 0, rivers: 0, faunaMax: 0, wishesDone: 0, biggestRegion: 0, undo: 0, links: 0, perfect: 0, streak: 0, bestStreak: 0, built: 0, refunds: 0, fusions: 0, works: 0, worksGood: 0, worksFresh: 0, worksExpired: 0, worksGone: 0, level3: 0 };
    this.history = [];         // instantanés pour le souvenir
    this.undoUsedThisSeason = false;
    this.ended = false;
    this.result = null;
    // météo : dès l'île 4, dans les modes libres et sur l'île du jour
    this.weatherOn = o.weather !== undefined ? (!!o.weather || this.infinite) : (!!def.weather || this.infinite || (typeof def.id === 'number' && def.id >= 4));
    this.weather = null;          // { key, phase: 'announced' | 'active', at }
    this.windSeason = false;      // grand vent actif pendant la saison écoulée → prime des moulins
    this.huntSeason = false;      // chasse et cueillette : les animaux des forêts rapportent +2 à la saison suivante
    this.rulesVariable = this.weatherOn;
    this.rule = this.garden ? BASE_RULE[this.season] : pickRule(this.season, () => this.rng.next(), this.rulesVariable);
    this.freeChoice = 0;          // marché : nombre de poses où l'on choisit sa tuile
    this.scheduleWeather(0.5);
    this.updateFauna();
  }

  /** Modificateurs de règles (améliorations + météo active). */
  get mods() {
    const w = this.weather && this.weather.phase === 'active' ? this.weather.key : null;
    return { river: this.baseMods.river + (w === 'storm' ? BALANCE.points.stormRiver : 0), refuge: this.baseMods.refuge, wind: w === 'wind', rule: this.rule, climate: this.climate };
  }
  weatherActive(key) { return !!this.weather && this.weather.phase === 'active' && (!key || this.weather.key === key); }

  scheduleWeather(chance = null) {
    if (!this.weatherOn || this.garden) { this.weather = null; return; }
    const key = pickWeather(this.season, () => this.rng.next(), chance === null ? (this.climate.weatherChance || 0.7) : chance);
    this.weather = key ? { key, phase: 'announced', at: Math.max(2, Math.floor(this.seasonLength / 2)) } : null;
    if (this.weather) this.emit({ type: 'weather', kind: 'announce', key, inPlacements: this.weather.at });
  }

  activateWeather() {
    const w = this.weather; if (!w || w.phase === 'active') return;
    w.phase = 'active';
    const ev = [];
    if (w.key === 'heat') {
      for (const t of this.board.tiles.values()) {
        if (t.family !== 'meadow' || t.rare || t.dry) continue;
        const ns = neighbors(t.q, t.r).map(([a, b]) => this.board.get(a, b)).filter(Boolean);
        const wet = ns.some((n) => Board.isFamily(n, 'water') || Board.isFamily(n, 'heath') || n.family === 'well' || n.family === 'fountain' || n.family === 'trough');
        if (!wet) { t.dry = true; ev.push({ type: 'dry', q: t.q, r: t.r }); }
      }
    } else if (w.key === 'thaw') {
      for (const t of this.board.tiles.values()) if (t.frozen) { t.frozen = false; ev.push({ type: 'thaw', q: t.q, r: t.r }); }
    } else if (w.key === 'wind') this.windSeason = true;
    this.board.touch();
    this.emit({ type: 'weather', kind: 'start', key: w.key, events: ev });
    this.updateFauna();
    this.checkWishes();
  }

  on(fn) { this.listeners.push(fn); }
  emit(ev) { this.lastEvents.push(ev); for (const fn of this.listeners) fn(ev); }

  get wishCtx() { return { board: this.board, season: this.season, fauna: this.fauna, stats: this.stats, placements: this.placements, seasonsPassed: this.seasonsPassed }; }
  get current() { return this.queue.next; }
  /** Seuils des trois étoiles (points), calibrés par île. */
  get thresholds() { const f = this.def.starFactors || BALANCE.stars.perCell; return f.slice(0, 3).map((x) => Math.round(this.board.cells * x)); }
  /** Étoile d'or : la médiane du bot fort (quatrième facteur calibré), cosmétique, hors porte de chapitre. */
  get goldThreshold() { const f = this.def.starFactors || BALANCE.stars.perCell; return Math.round(this.board.cells * (f[3] !== undefined ? f[3] : f[2] / 0.9)); }
  // ---- Faucille : clore la saison avant son terme ----
  get sickle() { return this.upgrades.sickle || 0; }
  canCloseSeason() { return !this.ended && !this.garden && this.sickle > 0 && this.inSeason < this.seasonLength && this.seasonLength - this.inSeason <= this.sickle; }
  closeSeason() { if (!this.canCloseSeason()) return false; this.stats.sickled = (this.stats.sickled || 0) + 1; this.emit({ type: 'sickle', left: this.seasonLength - this.inSeason }); this.advanceSeason(); return true; }
  get seasonProgress() { return this.inSeason / this.seasonLength; }

  /** Prévisualisation d'une pose de la tuile courante. */
  preview(q, r, tile = this.current) {
    if (!tile || tile.work || !this.board.canPlace(q, r)) return null;
    return preview(this.board, q, r, tile, this.season, this.mods);
  }

  canPlace(q, r) { return !this.ended && !!this.current && !this.current.work && this.board.canPlace(q, r) && (!this.restrict || this.restrict.has(key(q, r))); }

  // ---- Bâtir : poser une tuile sur une tuile de même famille ----
  canBuild(q, r, tile = this.current) {
    if (this.ended || this.restrict || !tile) return false;
    if (tile.work) { const t = this.board.get(q, r); return this.workOn && !!t && !t.rare && !t.work; }
    if (this.buildOn && ruleCanBuild(this.board, q, r, tile)) {
      const t = this.board.get(q, r); const lv = t.level || 1;
      if (t.blighted) return this.breaths >= BALANCE.build.cost;   // remise en état d'une friche
      if (lv >= 2 && (!this.level3On || !this.isMature(t))) return false;   // niveau 3 : débloqué, et la tuile a mûri une saison
      return this.breaths >= this.buildCost(lv + 1);
    }
    if (this.fuseOn && canFuse(this.board, q, r, tile)) return this.breaths >= this.fusionCost();
    return false;
  }
  /** Coût en souffles pour atteindre `level` (Charpente : un de moins, jamais moins que 0 pour le niveau 2 ni que 1 pour le niveau 3). */
  /** Coût d'une fusion (Alambic : la première de l'île est offerte). */
  fusionCost() { return (this.upgrades.still || 0) > 0 && this.stats.fusions === 0 ? 0 : BALANCE.fusion.cost; }
  buildCost(level) { const base = level >= 3 ? BALANCE.build.cost3 : BALANCE.build.cost; return Math.max(level >= 3 ? 1 : 0, base - (this.upgrades.frame || 0)); }
  /** Une tuile de niveau 2 a mûri si une saison a passé depuis sa construction. */
  isMature(t) { return (this.upgrades.master || 0) > 0 || this.seasonsPassed.length - (t.builtAt || 0) >= BALANCE.build.matureSeasons; }
  previewBuild(q, r, tile = this.current) {
    if (!tile) return null;
    if (tile.work) { if (!this.workOn) return null; const pv = previewWork(this.board, q, r, tile, this.season, { ...this.mods, fresh: this.isFresh(tile) }); if (pv) pv.cost = 0; return pv; }
    if (this.fuseOn && canFuse(this.board, q, r, tile)) {
      const pv = previewFuse(this.board, q, r, tile, this.season, this.mods); if (!pv) return null;
      const first = !this.known.has(pv.fuse.id);
      pv.refund = first ? { ok: true, reason: 'discovery' } : { ok: false, reason: 'none' }; pv.cost = this.fusionCost(); pv.first = first;
      return pv;
    }
    if (!ruleCanBuild(this.board, q, r, tile)) return null;
    const pv = previewBuild(this.board, q, r, tile, this.season, this.mods);
    if (pv.restore) { pv.refund = { ok: false, reason: 'none' }; pv.cost = BALANCE.build.cost; return pv; }
    pv.refund = this.refundFor(q, r, tile.family); pv.cost = this.buildCost(pv.level); if (pv.level >= 3) pv.signature = true;
    return pv;
  }
  /** Une tuile bien bâtie rend une tuile : région close, en saison, ou entourée d'au moins quatre tuiles de sa famille (une seule fois par saison). */
  refundFor(q, r, family) {
    const reg = this.board.region(q, r, family); if (!reg || this.refunds >= BALANCE.build.refundsPerSeason) return { ok: false, reason: 'none' };
    if (this.board.closedRegions.has(reg.id)) return { ok: true, reason: 'closed', region: reg.id };
    if (BALANCE.build.season[family] === this.season) return { ok: true, reason: 'season', region: reg.id };
    const same = neighbors(q, r).filter(([a, b]) => { const n = this.board.get(a, b); return n && n.family === family; }).length;
    if (same >= BALANCE.build.neighborsForRefund) return { ok: true, reason: 'crowd', region: reg.id };
    return { ok: false, reason: 'none' };
  }
  build(q, r) {
    if (!this.canBuild(q, r)) return null;
    const tile = this.current; const target = this.board.get(q, r);
    const pv = this.previewBuild(q, r, tile); if (!pv) return null;
    this.pushHistory();
    this.queue.take();
    const scoreBefore = this.score; let placed = target, rare = null;
    if (pv.work) {
      // ouvrage : posé sur la tuile, jugé maintenant puis à chaque saison
      target.work = pv.work; target.workBad = !pv.good; target.workFresh = !!pv.fresh; target.badSeasons = 0; this.board.touch(); this.stats.works++; if (pv.fresh) this.stats.worksFresh++;
    } else if (pv.fuse) {
      // fusion : la tuile en place devient la tuile composée ; fermetures éventuelles ; découverte = une tuile de retour et une rare
      placed = fusedTile(target, pv.fuse); this.board.tiles.set(key(q, r), placed); this.board.touch();
      for (const c of pv.closes) { this.board.closedRegions.add(c.id); this.stats.closed++; this.stats.closedThisSeason++; this.breaths += BALANCE.breaths.close; this.stats.biggestRegion = Math.max(this.stats.biggestRegion, c.size); }
      this.breaths -= this.fusionCost(); this.stats.fusions++;
      if (pv.first) { this.known.add(pv.fuse.id); this.queue.inject(this.queue.makeTile(tile.family), false); rare = this.pickRare(); if (WORKS.includes(rare)) this.giveWork(rare); else this.queue.inject(this.queue.makeRare(rare), false); this.stats.refunds++; }
    } else if (pv.restore) {
      target.blighted = false; this.board.touch(); this.breaths -= BALANCE.build.cost; this.stats.restored = (this.stats.restored || 0) + 1;
      for (const c of pv.closes) { this.board.closedRegions.add(c.id); this.stats.closed++; this.stats.closedThisSeason++; this.breaths += BALANCE.breaths.close; }
    } else {
      target.level = (target.level || 1) + 1; target.builtAt = this.seasonsPassed.length; this.board.touch();
      this.breaths -= this.buildCost(target.level); this.stats.built++; if (target.level >= 3) this.stats.level3++;
      if (pv.refund.ok) { this.refunds++; this.queue.inject(this.queue.makeTile(tile.family), false); this.stats.refunds++; }
    }
    this.placements++; this.inSeason++;
    this.score += pv.total; this.tally[pv.work ? 'works' : pv.fuse ? 'fusions' : 'build'] += pv.total;
    if (this.weather && this.weather.phase === 'announced' && this.inSeason >= this.weather.at) this.activateWeather();
    this.expireShed();
    this.emit({ type: 'build', kind: pv.work ? 'work' : pv.fuse ? 'fuse' : pv.restore ? 'restore' : 'level', work: pv.work || null, good: !!pv.good, fresh: !!pv.fresh, q, r, tile: placed, level: placed.level, result: pv, refund: pv.refund, family: tile.family, recipe: pv.fuse ? pv.fuse.id : null, first: !!pv.first, rare, milestone: Math.floor(this.score / 100) > Math.floor(scoreBefore / 100) ? Math.floor(this.score / 100) * 100 : 0 });
    for (const c of pv.closes || []) this.emit({ type: 'close', ...c, breath: BALANCE.breaths.close });
    this.updateFauna(); this.checkWishes();
    if (!this.garden && this.inSeason >= this.seasonLength) this.advanceSeason();
    this.checkEnd();
    return pv;
  }

  /** Pose la tuile courante. */
  place(q, r, tileOverride = null) {
    if (this.ended) return null;
    const tile = tileOverride || this.current;
    if (!tile || !this.board.canPlace(q, r) || (this.restrict && !this.restrict.has(key(q, r)))) return null;
    this.pushHistory();
    // meilleur total possible pour cette tuile, pour commenter le coup (cosmétique)
    // meilleur coup de référence, primes de fermeture exclues : garder une fermeture pour plus tard n'est pas une faute
    let best = -Infinity; if (!this.garden) for (const c of this.board.legalCells()) { const p = preview(this.board, c.q, c.r, tile, this.season, this.mods); if (!p) continue; const v = p.total - p.closes.reduce((a, x) => a + x.bonus, 0); if (v > best) best = v; }
    if (!tileOverride) { this.queue.take(); if (this.pendingOpening.length && this.queue.list.length) this.queue.list[this.queue.list.length - 1] = this.queue.makeTile(this.pendingOpening.shift()); }
    // ruine à restaurer : elle prend la famille majoritaire autour d'elle
    let placedTile = tile, restoredTo = null;
    if (tile.rare && tile.family === 'restore') {
      const counts = {};
      for (const [a, b] of neighbors(q, r)) { const n = this.board.get(a, b); if (!n) continue; const f = n.rare ? (Board.familiesOf(n)[0] || null) : n.family; if (f) counts[f] = (counts[f] || 0) + 1; }
      const fam = Object.keys(counts).sort((x, y) => counts[y] - counts[x])[0] || 'meadow';
      restoredTo = fam; placedTile = { family: fam, variant: 1, rare: false, id: tile.id, restored: true };
    }
    const res = apply(this.board, q, r, placedTile, this.season, this.mods);
    if (restoredTo) res.restoredTo = restoredTo;
    if (this.rule === 'semailles' && Board.isFamily(placedTile, 'orchard')) { const pt = this.board.get(q, r); if (pt) pt.sown = true; }
    if (this.freeChoice > 0) this.freeChoice--;
    if (tile.rare && tile.family === 'market') { this.freeChoice += 3; }
    this.placements++; this.inSeason++;
    if (this.workOn && this.placements % BALANCE.works.everyPlacements === 0 && !this.garden) this.giveWork(this.pickWork());
    this.expireShed();
    const scoreBefore = this.score;
    this.score += res.total;
    { const closes = res.closes.reduce((a, c) => a + c.bonus, 0); const base = res.base.reduce((a, b) => a + b.pts, 0); this.tally.closes += closes; this.tally.base += base; this.tally.edges += res.total - closes - base;
      if (!this.garden && (!this.bestMove || res.total > this.bestMove.pts)) this.bestMove = { pts: res.total, family: placedTile.family, season: this.season, closes: res.closes.length }; }
    const grade = this.garden ? null : gradeMove(res.total, best);
    if (grade === 'master' || grade === 'perfect') this.stats.perfect++;
    if (grade === 'master' || grade === 'perfect' || grade === 'good') { this.stats.streak++; this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.streak); } else if (grade === 'meh') this.stats.streak = 0;   // un coup correct ne casse pas la série, il ne la fait pas avancer
    // les séries comptent : à trois bons coups d'affilée, un souffle ; à cinq, la prochaine fermeture compte double
    if (grade && this.stats.streak === BALANCE.streaks.breathAt && !this.garden) { this.breaths += 1; this.emit({ type: 'streak', kind: 'breath', n: this.stats.streak }); }
    if (grade && this.stats.streak === BALANCE.streaks.doubleAt && !this.garden) { this.nextCloseDouble = true; this.emit({ type: 'streak', kind: 'double', n: this.stats.streak }); }
    if (this.weather && this.weather.phase === 'announced' && this.inSeason >= this.weather.at) this.activateWeather();
    for (const c of res.closes) { this.stats.closed++; this.stats.closedThisSeason++; this.breaths += BALANCE.breaths.close; this.stats.biggestRegion = Math.max(this.stats.biggestRegion, c.size); }
    if (this.nextCloseDouble && res.closes.length) { const extra = res.closes.reduce((s, c) => s + c.bonus, 0); this.score += extra; this.tally.streak += extra; this.nextCloseDouble = false; this.emit({ type: 'streak', kind: 'doubled', pts: extra, q, r }); }
    if (this.season === 'summer' && Board.isFamily(tile, 'field') && this.board.landNeighbors(q, r).some(([a, b]) => { const n = this.board.get(a, b); return n && Board.isFamily(n, 'water'); })) this.stats.irrigatedSummer++;
    this.emit({ type: 'place', q, r, tile: placedTile, result: res, restoredFrom: restoredTo ? 'restore' : null, market: tile.rare && tile.family === 'market' ? this.freeChoice : 0, best, grade, streak: this.stats.streak, milestone: Math.floor(this.score / 100) > Math.floor(scoreBefore / 100) ? Math.floor(this.score / 100) * 100 : 0 });
    for (const c of res.closes) this.emit({ type: 'close', ...c, breath: BALANCE.breaths.close });
    this.updateFauna();
    this.checkWishes();
    // rappel : dix poses avant l'échéance d'un vœu encore ouvert
    for (const w of this.wishes) { const dl = w.def.deadline; if (w.status === 'open' && dl && dl.placements && dl.placements - this.placements === 10) this.emit({ type: 'wish', kind: 'soon', wish: w, left: 10 }); }
    if (!this.garden && this.inSeason >= this.seasonLength) this.advanceSeason();
    if (this.infinite && this.placements % BALANCE.infinite.growEvery === 0 && this.board.cells < BALANCE.infinite.maxCells) {
      const added = this.board.grow(BALANCE.infinite.growCells, this.rng);
      if (added.length) this.emit({ type: 'grow', cells: added });
    }
    this.checkEnd();
    return res;
  }

  /**
   * Croissance : au changement de saison, une tuile entourée d'assez de voisines de sa propre famille depuis `seasons`
   * saisons passe au niveau 2 d'elle-même. Le temps épaissit, le joueur signe : le niveau 3 reste réservé à bâtir, et une
   * tuile poussée par le temps ne compte ni pour le vœu « bâtir » ni pour le contrat des bâtisseurs (`stats.built`).
   * Au plus une tuile par région et `perSeason` par saison, pour ne pas payer deux fois le gros bloc d'une seule famille.
   * @returns {Array<{q:number,r:number,family:string}>} les tuiles qui ont poussé
   */
  growTiles() {
    if (!this.growOn || this.garden || this.ended) return [];
    const G = BALANCE.growth; const ready = [], soon = [];
    for (const t of this.board.tiles.values()) {
      const min = G.at[t.family];
      if (!min || t.rare || t.fusion || t.work || t.blighted || (t.level || 1) > 1) { t.ripe = 0; t.ripening = false; continue; }
      const same = neighbors(t.q, t.r).filter(([a, b]) => Board.isFamily(this.board.get(a, b), t.family)).length;
      if (same < min) { t.ripe = 0; t.ripening = false; continue; }   // la condition tombe : le compteur repart de zéro
      t.ripe = (t.ripe || 0) + 1; t.ripening = false;
      (t.ripe >= G.seasons ? ready : t.ripe === G.seasons - 1 ? soon : []).push({ t, same });
    }
    // une seule tuile par région et `perSeason` par saison : le gros bloc d'une seule famille n'est pas payé deux fois
    const pick = (list) => {
      list.sort((a, b) => b.same - a.same || a.t.q - b.t.q || a.t.r - b.t.r);
      const regions = new Set(), out = [];
      for (const c of list) {
        if (out.length >= G.perSeason) break;
        const reg = this.board.regions(c.t.family).find((r) => r.keys.has(key(c.t.q, c.t.r)));
        const rid = reg ? reg.id : key(c.t.q, c.t.r);
        if (regions.has(rid)) continue;
        regions.add(rid); out.push(c.t);
      }
      return out;
    };
    const grown = [];
    for (const t of pick(ready)) { t.level = 2; t.grown = true; t.ripe = 0; t.builtAt = this.seasonsPassed.length; grown.push({ q: t.q, r: t.r, family: t.family }); }
    for (const t of pick(soon)) t.ripening = true;   // l'annonce ne porte que sur celles qui pousseront vraiment
    if (grown.length) { this.board.touch(); this.stats.grown = (this.stats.grown || 0) + grown.length; }
    return grown;
  }

  /**
   * Toute la partie en cours, en objet simple : de quoi la reprendre plus tard, à l'identique, y compris le tirage
   * des tuiles à venir (l'état des deux générateurs est gardé). L'historique du Souvenir n'est pas gardé : reprendre
   * une partie repart avec une ardoise d'annulation vide.
   */
  serialize() {
    return {
      v: 1, longSeasonDone: !!this.longSeasonDone, refunds: this.refunds, shed: this.shed.map((t) => ({ ...t })),
      rngS: this.rng.s, board: this.board.snapshot(), queue: this.queue.snapshot(),
      restrict: this.restrict ? [...this.restrict] : null, pendingOpening: [...this.pendingOpening],
      season: this.season, inSeason: this.inSeason, placements: this.placements, seasonsPassed: [...this.seasonsPassed],
      score: this.score, breaths: this.breaths, freeChoice: this.freeChoice,
      wishes: this.wishes.map((w) => ({ ...w })), fauna: [...this.fauna.entries()],
      tally: { ...this.tally }, bestMove: this.bestMove ? { ...this.bestMove } : null, stats: { ...this.stats },
      undoUsedThisSeason: !!this.undoUsedThisSeason, nextCloseDouble: !!this.nextCloseDouble,
      weather: this.weather ? { ...this.weather } : null, windSeason: !!this.windSeason, huntSeason: !!this.huntSeason, rule: this.rule,
    };
  }

  /** Remet l'île dans l'état rendu par `serialize()`. L'île doit avoir été construite avec la même définition. */
  restoreRun(s) {
    if (!s || s.v !== 1) return false;
    this.longSeasonDone = !!s.longSeasonDone; this.refunds = s.refunds || 0; this.shed = (s.shed || []).map((t) => ({ ...t }));
    this.rng.s = s.rngS; this.board.restore(s.board); this.queue.restore(s.queue);
    this.restrict = s.restrict ? new Set(s.restrict) : null; this.pendingOpening = [...(s.pendingOpening || [])];
    this.season = s.season; this.inSeason = s.inSeason; this.placements = s.placements; this.seasonsPassed = [...(s.seasonsPassed || [])];
    this.score = s.score; this.breaths = s.breaths; this.freeChoice = s.freeChoice || 0;
    this.wishes = (s.wishes || []).map((w) => ({ ...w })); this.fauna = new Map(s.fauna || []);
    this.tally = { ...this.tally, ...(s.tally || {}) }; this.bestMove = s.bestMove || null; this.stats = { ...this.stats, ...(s.stats || {}) };
    this.undoUsedThisSeason = !!s.undoUsedThisSeason; this.nextCloseDouble = !!s.nextCloseDouble;
    this.weather = s.weather ? { ...s.weather } : null; this.windSeason = !!s.windSeason; this.huntSeason = !!s.huntSeason; this.rule = s.rule;
    this.history = []; this.ended = false; this.result = null;
    return true;
  }

  advanceSeason() {
    const from = this.season;
    // climat : une saison longue (été au chaud, hiver au froid) revient une fois avant de passer à la suivante
    if (this.climate.longSeason === from && !this.longSeasonDone) { this.longSeasonDone = true; this.season = from; }
    else { this.season = nextSeason(this.season); if (this.season !== this.climate.longSeason) this.longSeasonDone = false; }
    this.seasonsPassed.push(this.season);
    this.inSeason = 0;
    this.stats.closedThisSeason = 0;
    this.refunds = 0;
    this.undoUsedThisSeason = false;
    const prevRule = this.rule;
    this.rule = this.garden ? BASE_RULE[this.season] : pickRule(this.season, () => this.rng.next(), this.rulesVariable);
    const ev = transition(this.board, this.season, this.rule, this.climate);
    this.board.touch();
    let pts = 0;
    // chasse et cueillette : les animaux des forêts de la saison écoulée rapportent +2
    if (this.huntSeason) { this.huntSeason = false; for (const a of this.fauna.values()) if (a.species === 'moose' || a.species === 'bear' || a.species === 'owl') { ev.push({ type: 'hunt', q: a.q, r: a.r, pts: 2 }); } }
    if (this.rule === 'chasse') this.huntSeason = true;
    // sentiers : chaque liaison entre deux villages rapporte des points
    const links = computeLinks(this.board).links.length;
    this.stats.links = Math.max(this.stats.links, links);
    pts += links * BALANCE.points.pathSeason;
    // fête : chaque hameau voisin d'une fête rapporte +2, une seule fois ; auberge : +1 par sentier touchant son village
    for (const t of this.board.tiles.values()) {
      if (t.family === 'fete' && !t.used) { const n = neighbors(t.q, t.r).filter(([a, b]) => Board.isFamily(this.board.get(a, b), 'hamlet')).length; if (n) { ev.push({ type: 'fete', q: t.q, r: t.r, pts: n * 2 }); pts += n * 2; } t.used = true; }
    }
    const tavernRegions = new Set(this.board.regions('hamlet').filter((reg) => reg.cells.some((c) => c.family === 'tavern')).map((reg) => reg.id));
    if (tavernRegions.size) { const extra = computeLinks(this.board).links.filter((l) => tavernRegions.has(l.a) || tavernRegions.has(l.b)).length; pts += extra; }
    // grand vent : les moulins ont tourné toute la saison
    if (this.windSeason) { this.windSeason = false; for (const t of this.board.tiles.values()) if (t.family === 'mill') { ev.push({ type: 'mill', q: t.q, r: t.r, pts: BALANCE.points.windMill }); pts += BALANCE.points.windMill; } }
    // ouvrages : jugés à chaque saison (bonne place : points ; mauvaise place : pénalité tant que le voisinage ne change pas)
    for (const t of this.board.tiles.values()) {
      if (!t.work) continue; const w = evalWork(this.board, t, this.season, this.rule); t.workBad = !w.good;
      if (w.good) { t.badSeasons = 0; if (w.pts) ev.push({ type: 'work', q: t.q, r: t.r, pts: w.pts, id: t.work, good: true, label: w.label }); continue; }
      // mal placé : plein tarif la première saison, moitié la deuxième, puis l'ouvrage s'efface
      t.badSeasons = (t.badSeasons || 0) + 1;
      if (t.badSeasons > BALANCE.works.badSeasons) { const id = t.work; delete t.work; delete t.workBad; delete t.workFresh; delete t.badSeasons; this.stats.worksGone++; ev.push({ type: 'work', q: t.q, r: t.r, pts: 0, id, good: false, gone: true, label: 's’efface' }); continue; }
      const pts = t.badSeasons === 1 ? w.pts : -Math.ceil(-w.pts / 2);
      if (pts) ev.push({ type: 'work', q: t.q, r: t.r, pts, id: t.work, good: false, label: w.label, last: t.badSeasons === BALANCE.works.badSeasons });
    }
    // niveau 3 : +1 par saison et signature de la famille
    for (const t of this.board.tiles.values()) {
      if ((t.level || 1) < 3 || t.rare) continue; let p = BALANCE.build.level3Season; const sp = LEVEL3_SEASONAL[t.family];
      if (sp) { if (sp.family) p += Math.min(sp.cap || 3, neighbors(t.q, t.r).filter(([a, b]) => Board.isFamily(this.board.get(a, b), sp.family)).length) * sp.pts; else if (sp.season === this.season) p += sp.pts; }
      if (p) ev.push({ type: 'level3', q: t.q, r: t.r, pts: p, family: t.family });
    }
    // bourgs (hameau de niveau 3) : chaque sentier qui touche leur village rapporte +1 de plus
    { const bourgs = new Set(this.board.regions('hamlet').filter((reg) => reg.cells.some((c) => (c.level || 1) >= 3 && !c.rare)).map((reg) => reg.id)); if (bourgs.size) pts += computeLinks(this.board).links.filter((l) => bourgs.has(l.a) || bourgs.has(l.b)).length; }
    // fusions : prime de saison (+pts par voisine d'une famille, plafonnée, ou +pts fixes dans une saison)
    for (const t of this.board.tiles.values()) {
      if (!t.fusion) continue; const rec = FUSION_BY_ID[t.family]; if (!rec || !rec.seasonal) continue; const sp = rec.seasonal; let p = 0;
      if (sp.family) p = Math.min(sp.cap || 6, neighbors(t.q, t.r).filter(([a, b]) => Board.isFamily(this.board.get(a, b), sp.family)).length) * sp.pts;
      else if (sp.season === this.season) p = sp.pts;
      if (p) { ev.push({ type: 'fusion', q: t.q, r: t.r, pts: p, id: t.family }); }
    }
    if (this.weather) this.emit({ type: 'weather', kind: 'end', key: this.weather.key });
    this.weather = null;
    for (const e of ev) { if (e.pts) pts += e.pts; if (e.type === 'harvest') this.stats.harvest++; if (e.type === 'bloom') this.stats.bloom++; }
    // faune : chaque animal présent donne des souffles et des points
    const faunaBonus = [...this.fauna.values()].filter((a) => !a.noBonus).length;
    pts += faunaBonus * (BALANCE.points.faunaSeason + this.mods.refuge);
    this.tally.fauna += faunaBonus * (BALANCE.points.faunaSeason + this.mods.refuge); this.tally.seasons += pts - faunaBonus * (BALANCE.points.faunaSeason + this.mods.refuge);
    const faunaBreaths = Math.floor(faunaBonus / BALANCE.breaths.faunaPer);   // un souffle pour deux animaux : les souffles restent rares
    this.breaths += faunaBreaths;
    this.score += pts;
    const grown = this.growTiles();
    this.emit({ type: 'season', from, to: this.season, events: ev, pts, faunaBonus, faunaBreaths, links, rule: this.rule, prevRule, grown });
    this.updateFauna();
    this.checkWishes();
    this.scheduleWeather();
    if (this.season === 'summer') this.stats.irrigatedSummer = this.countIrrigated();
  }

  countIrrigated() {
    let n = 0;
    for (const t of this.board.tiles.values()) if (Board.isFamily(t, 'field') && this.board.regionNeighbors({ cells: [t], keys: new Set([key(t.q, t.r)]) }).some((x) => Board.isFamily(x, 'water'))) n++;
    return n;
  }

  updateFauna() {
    const expected = evalFauna(this.board, this.season, this.rule);
    const { arrivals, departures, current } = reconcile(this.fauna, expected);
    const first = this.fauna.size === 0 && this.placements === 0;
    this.fauna = current;
    this.stats.faunaMax = Math.max(this.stats.faunaMax, this.fauna.size);
    for (const a of arrivals) { let bonus = 0; if (this.rule === 'nichees' && this.season === 'spring' && !first) { bonus = 3; this.score += 3; this.tally.fauna += 3; } this.emit({ type: 'fauna', kind: 'arrive', ...a, bonus }); }
    for (const d of departures) this.emit({ type: 'fauna', kind: 'leave', ...d });
  }

  checkWishes() {
    const ev = updateWishes(this.wishes, this.wishCtx);
    for (const e of ev) {
      if (e.type === 'done') {
        this.stats.wishesDone++;
        this.score += BALANCE.points.wish; this.tally.wishes += BALANCE.points.wish;
        this.breaths += BALANCE.breaths.wish;
        const rare = this.pickRare();
        if (WORKS.includes(rare)) this.giveWork(rare); else this.queue.inject(this.queue.makeRare(rare), false);
        this.emit({ type: 'wish', kind: 'done', wish: e.wish, rare });
      } else this.emit({ type: 'wish', kind: 'failed', wish: e.wish });
    }
  }

  pickRare() {
    const id = typeof this.def.id === 'number' ? this.def.id : 99;
    const tier = this.rareTier !== undefined ? this.rareTier : (id >= 8 ? 3 : id >= 7 ? 2 : id >= 5 ? 1 : 0);
    const pool = ['mill', 'chapel', 'watchtower', 'well', 'camp'];
    if (tier >= 1) pool.push('market', 'fete', 'restore');
    if (tier >= 2) pool.push('granary', 'fountain');
    if (tier >= 3) pool.push('tavern', 'trough', 'archway', 'mine', 'oven');
    if (this.workOn && this.rng.next() < BALANCE.works.wishChance) return this.pickWork();
    return pool[Math.floor(this.rng.next() * pool.length)];
  }
  pickWork() { return WORKS[Math.floor(this.rng.next() * WORKS.length)]; }

  // ---- Souffles ----
  get undoCost() { return BALANCE.breaths.undo[this.upgrades.memory || 0]; }
  canSwap(i) { return !this.handOn && !this.weatherActive('blizzard') && this.breaths >= BALANCE.breaths.swap && i < this.queue.list.length; }
  /** Main de saison : choisir librement la tuile à jouer parmi les tuiles visibles (gratuit). */
  canPick(i) { return this.handOn && !this.ended && i > 0 && i < this.queue.list.length; }
  pick(i) { if (!this.canPick(i) || !this.queue.swap(i)) return false; this.emit({ type: 'pick', i }); return true; }
  swap(i) { if (!this.canSwap(i) || !this.queue.swap(i)) return false; this.breaths -= BALANCE.breaths.swap; this.emit({ type: 'breath', kind: 'swap' }); return true; }
  /** Défausser : coûte des souffles, sauf pour un ouvrage (gratuit : on ne bloque jamais la file). */
  discardCost() { return this.current && this.current.work ? 0 : BALANCE.breaths.discard; }
  canDiscard() { return this.queue.list.length > 0 && this.breaths >= this.discardCost(); }
  discard() { if (!this.canDiscard()) return false; this.breaths -= this.discardCost(); const t = this.queue.discard(); this.emit({ type: 'breath', kind: 'discard', tile: t, free: !!(t && t.work) }); this.checkEnd(); return true; }

  // ---- Remise : un ouvrage mis de côté, qui expire au bout de `shedLife` poses ----
  /** Donne un ouvrage : il entre dans la file juste après la tuile courante. */
  giveWork(id) { const t = this.queue.makeWork(id); t.arrivedAt = this.placements; this.queue.inject(t, false); this.emit({ type: 'work', kind: 'arrive', tile: t }); return t; }
  /** Un ouvrage est frais s'il n'a pas traîné en remise (posé directement, ou repris dans les `freshWindow` poses). */
  isFresh(tile) { return !!tile && !!tile.work && (tile.shedAt === undefined || this.placements - tile.shedAt <= BALANCE.works.freshWindow * (1 + (this.upgrades.fresh || 0))); }
  /** Poses restantes avant expiration d'un ouvrage en remise. */
  shedLeft(tile) { return tile.shedAt === undefined ? BALANCE.works.shedLife : Math.max(0, BALANCE.works.shedLife - (this.placements - tile.shedAt)); }
  canShed() { return this.workOn && !this.ended && !!this.current && !!this.current.work; }
  /** Met l'ouvrage courant en remise ; si elle est pleine, il remplace le plus ancien (perdu). */
  toShed() {
    if (!this.canShed()) return false;
    const t = this.queue.take(); let replaced = null;
    if (this.shed.length >= this.shedSize) { replaced = this.shed.shift(); this.stats.worksExpired++; }
    const st = { ...t, shedAt: t.shedAt === undefined ? this.placements : t.shedAt }; this.shed.push(st);
    this.emit({ type: 'shed', kind: 'in', tile: st, replaced }); this.checkEnd(); return true;
  }
  fromShed(i = 0) { if (!this.shed.length || this.ended) return false; const t = this.shed.splice(i, 1)[0]; this.queue.list.unshift(t); this.emit({ type: 'shed', kind: 'out', tile: t }); return true; }
  expireShed() {
    for (let i = this.shed.length - 1; i >= 0; i--) { const t = this.shed[i]; if (this.placements - t.shedAt >= BALANCE.works.shedLife) { this.shed.splice(i, 1); this.stats.worksExpired++; this.emit({ type: 'shed', kind: 'expired', tile: t }); } }
  }
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
    this.board.restore(s.board); this.queue.restore(s.queue); this.nextCloseDouble = !!s.nextCloseDouble; this.weather = s.weather ? { ...s.weather } : null; this.windSeason = !!s.windSeason; this.freeChoice = s.freeChoice || 0; this.rule = s.rule || this.rule; this.huntSeason = !!s.huntSeason;
    this.score = s.score; this.placements = s.placements; this.inSeason = s.inSeason; this.season = s.season; this.seasonsPassed = [...s.seasonsPassed];
    this.stats = { ...s.stats }; if (s.tally) this.tally = { ...s.tally }; this.bestMove = s.bestMove ? { ...s.bestMove } : null; this.wishes = s.wishes.map((w) => ({ ...w })); this.shed = (s.shed || []).map((t) => ({ ...t }));
    this.breaths = s.breaths - this.undoCost;
    this.undoUsedThisSeason = true; this.stats.undo++;
    this.fauna = new Map(s.fauna);
    this.emit({ type: 'breath', kind: 'undo' });
    return true;
  }
  canPocket() { return this.queue.pocketSize > 0 && this.queue.pocket.length < this.queue.pocketSize && !!this.current && !this.current.work; }
  toPocket() { if (!this.canPocket()) return false; this.queue.toPocket(); this.emit({ type: 'pocket', kind: 'in' }); this.checkEnd(); return true; }
  fromPocket(i = 0) { if (!this.queue.pocket.length) return false; this.queue.fromPocket(i); this.emit({ type: 'pocket', kind: 'out' }); return true; }

  pushHistory() {
    this.history.push({ tally: { ...this.tally }, bestMove: this.bestMove ? { ...this.bestMove } : null, nextCloseDouble: !!this.nextCloseDouble, rule: this.rule, huntSeason: this.huntSeason, freeChoice: this.freeChoice, weather: this.weather ? { ...this.weather } : null, windSeason: this.windSeason, board: this.board.snapshot(), queue: this.queue.snapshot(), score: this.score, placements: this.placements, inSeason: this.inSeason, season: this.season, seasonsPassed: [...this.seasonsPassed], stats: { ...this.stats }, wishes: this.wishes.map((w) => ({ ...w })), breaths: this.breaths, fauna: new Map(this.fauna), shed: this.shed.map((t) => ({ ...t })) });
    if (this.history.length > 3) this.history.shift();
  }

  /** Jardin : choisir librement la famille de la tuile courante. */
  get canChoose() { return this.garden || this.freeChoice > 0; }
  setGardenTile(family) { if (!this.canChoose || !this.queue.list.length) return; this.queue.list[0] = this.queue.makeTile(family); this.emit({ type: 'choice', family }); }

  checkEnd() {
    if (this.ended) return;
    const noTile = this.queue.empty && this.queue.pocket.length === 0 && !this.shed.some((t) => [...this.board.tiles.values()].some((x) => this.canBuild(x.q, x.r, t)));
    const noMove = this.board.legalCells().length === 0;
    if (noTile || noMove) this.finish(noMove ? 'full' : 'queue');
  }

  finish(reason = 'queue') {
    if (this.ended) return this.result;
    this.ended = true;
    this.stats.worksGood = [...this.board.tiles.values()].filter((t) => t.work && !t.workBad).length;
    const cells = this.board.cells;
    const th = this.thresholds;
    let stars = 0;
    for (const t of th) if (this.score >= t) stars++;
    const gold = !this.infinite && !this.garden && this.score >= this.goldThreshold;
    const wishesTotal = this.wishes.length;
    // dominante de l'île bâtie (la voix du bilan et du souvenir en tient compte) : hameaux, eau ou forêt quand une famille prend au moins un tiers des tuiles
    const counts = {}; let placedN = 0; for (const t of this.board.tiles.values()) { const f = Board.familiesOf(t)[0] || t.family; counts[f] = (counts[f] || 0) + 1; placedN++; }
    const dom = ['hamlet', 'water', 'forest'].map((f) => ({ family: f, share: placedN ? (counts[f] || 0) / placedN : 0 })).sort((a, b) => b.share - a.share)[0];
    const dominant = dom && dom.share >= 0.3 ? dom : null;
    const seeds = stars * BALANCE.seeds.star + this.stats.wishesDone * BALANCE.seeds.wish + (this.infinite || this.garden ? 0 : BALANCE.seeds.island);
    this.result = { island: this.def.id, score: this.score, stars: this.infinite || this.garden ? 0 : stars, gold, goldThreshold: this.goldThreshold, thresholds: th, tally: { ...this.tally }, bestMove: this.bestMove, dominant, reason, placements: this.placements, seasons: this.seasonsPassed.length, stats: { ...this.stats }, fauna: this.fauna.size, wishesDone: this.stats.wishesDone, wishesTotal, seeds, cells, filled: this.board.placed };
    this.emit({ type: 'end', result: this.result });
    return this.result;
  }
}
