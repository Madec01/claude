// Déroulement d'une île : orchestration des règles, saisons, faune, vœux, souffles, fin et bilan.
// Modèle pur (sans DOM ni canvas) : utilisable en Node pour les tests et le bot.
import { Board } from './board.js';
import { archetypeOf } from '../data/archetypes.js';
import { mechIsland } from '../data/campaign.js';
import { preview, apply, previewBuild, canBuild as ruleCanBuild, canFuse, previewFuse, fusedTile } from './rules.js';
import { FUSION_BY_ID, RETIRED_RARE, RETIRED_WORKS, RARE_SEASONAL } from '../data/tiles.js';
import { climateOf } from '../data/climates.js';
import { transition, nextSeason } from './seasons.js';
import { evaluate as evalFauna, reconcile } from './fauna.js';
import { initWishes, updateWishes } from './wishes.js';
import { TileQueue } from './queue.js';
import { generateMask, enclosedHoles } from '../data/islands.js';
import { BALANCE } from '../data/balance.js';
import { computeLinks } from './paths.js';
import { pickRule, BASE_RULE, RULE_LOOK } from './seasonrules.js';
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
    // Sans option, les mécaniques suivent le numéro d'île (MECH_AT, campaign.js) : la campagne passe toujours par
    // `islandOptions`, qui fait foi ; les modes libres et l'Île du jour ont tout.
    const libre = !!def.infinite || !!def.garden || !!def.daily; const des = (m) => typeof def.id === 'number' && def.id >= (mechIsland(m) || 1);
    this.buildOn = o.build !== undefined ? !!o.build : (libre || des('build'));
    // croissance : le caractère du chapitre 9 en campagne, toujours là dans les modes libres — une tuile bien entourée des siennes monte au niveau 2 toute seule
    this.growOn = o.growth !== undefined ? !!o.growth : (!!def.infinite || !!def.daily || des('growth'));
    this.refunds = 0;            // tuiles rendues cette saison (au plus une)
    // fusionner ; `known` = recettes déjà découvertes (sauvegarde)
    this.fuseOn = o.fuse !== undefined ? !!o.fuse : (libre || des('fuse'));
    this.known = o.known || new Set();
    // main de saison : la tuile à jouer se choisit librement parmi les tuiles visibles
    this.handOn = o.hand !== undefined ? !!o.hand : (libre || des('hand'));
    this.rareTier = o.rareTier;   // 0 : les cinq rares de base ; 1 : le grenier, la ruche et le menhir s'y ajoutent
    // niveau 3
    this.level3On = o.level3 !== undefined ? !!o.level3 : (libre || des('build3'));
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
    this.fillEnclosedHoles();   // les trous cernés par l'île sont des mares : de vraies tuiles d'eau, posées au départ
    const total = Number.isFinite(def.tilesRatio) ? Math.round(def.cells * def.tilesRatio) - def.start.length : Infinity;
    const visible = BALANCE.queue.visible[this.upgrades.sight || 0];   // Regard : trois tuiles visibles, puis quatre, puis cinq
    this.queue = new TileQueue(seed * 3 + 11, def.weights, total, visible);
    // ouverture guidée : les premières tuiles des îles d'apprentissage sont fixées (pas de marais ni de sable en première minute)
    this.pendingOpening = [];
    if (def.opening) { def.opening.forEach((f, i) => { if (i < this.queue.list.length) this.queue.list[i] = this.queue.makeTile(f); }); this.pendingOpening = def.opening.slice(this.queue.list.length); }
    if ((this.upgrades.rare || 0) > 0) this.queue.inject(this.queue.makeRare([null, 'well', 'mill', 'granary'][Math.min(3, this.upgrades.rare)]), false);
    // Talisman : un ouvrage dans la file de départ (après la création de la file)
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
    this.tally = { edges: 0, base: 0, closes: 0, seasons: 0, wishes: 0, fauna: 0, fusions: 0, build: 0 };
    this.bestMove = null;
    this.stats = { grown: 0, harvest: 0, bloom: 0, closedThisSeason: 0, irrigatedSummer: 0, closed: 0, rivers: 0, faunaMax: 0, wishesDone: 0, biggestRegion: 0, undo: 0, links: 0, perfect: 0, streak: 0, bestStreak: 0, built: 0, refunds: 0, fusions: 0, level3: 0 };
    this.history = [];         // instantanés pour le souvenir
    this.undoUsedThisSeason = false;
    this.ended = false;
    this.result = null;
    // surprise de saison : à chaque arrivée d'une saison, la règle de base ou l'une de ses deux surprises, tirée au
    // sort et active toute la saison (campagne : MECH_AT ; toujours dans les modes libres et sur l'Île du jour).
    // Elle a remplacé la météo, qui annonçait un événement en début de saison et le déclenchait à la mi-saison :
    // cinq effets de plus pour 0,2 % du score. Ce qu'il en reste est l'habillage (`look`).
    this.surpriseOn = o.surprise !== undefined ? (!!o.surprise || this.infinite) : (!!def.surprise || !!def.weather || this.infinite || des('surprise'));
    this.huntSeason = false;      // chasse et cueillette : les animaux des forêts rapportent +2 à la saison suivante
    this.rulesVariable = this.surpriseOn;
    this.rule = this.garden ? BASE_RULE[this.season] : pickRule(this.season, () => this.rng.next(), this.rulesVariable);
    this.updateFauna();
  }

  /**
   * UNE LAGUNE EST DE L'EAU. Un trou du masque cerné par six cases de l'île était une « mer intérieure » :
   * le rendu le peignait en étang (journal 21) mais rien ne s'y posait et il ne donnait aucun bord — un
   * joueur y a posé un marais et n'a pas compris son « +0 » (pépin G6HX). Le trou entre donc dans le masque
   * et reçoit une vraie tuile d'eau, posée au départ comme le hameau ou la roche.
   * @returns {Array<object>} les tuiles posées
   */
  fillEnclosedHoles() {
    const out = [];
    for (const { q, r } of enclosedHoles(this.board.mask)) {
      this.board.mask.add(key(q, r));
      out.push(this.board.place(q, r, { family: 'water', variant: 1, rare: false, id: 0, start: true }));
    }
    return out;
  }

  /** Modificateurs de règles (améliorations, règle de la saison, climat). */
  get mods() { return { river: this.baseMods.river, refuge: this.baseMods.refuge, rule: this.rule, climate: this.climate }; }
  /** L'habillage de la saison (pluie, vent, chaleur, neige, redoux), tiré de la surprise en cours : purement visuel. */
  get look() { return this.garden ? null : RULE_LOOK[this.rule] || null; }


  on(fn) { this.listeners.push(fn); }
  emit(ev) { this.lastEvents.push(ev); for (const fn of this.listeners) fn(ev); }

  get wishCtx() { return { board: this.board, season: this.season, fauna: this.fauna, stats: this.stats, placements: this.placements, seasonsPassed: this.seasonsPassed }; }
  get current() { return this.queue.next; }
  /** Seuils des trois étoiles (points), calibrés par île. */
  get thresholds() { const f = this.def.starFactors || BALANCE.stars.perCell; return f.slice(0, 3).map((x) => Math.round(this.board.cells * x)); }
  /** Étoile d'or : la médiane du bot fort (quatrième facteur calibré), cosmétique, hors porte de chapitre. */
  get goldThreshold() { const f = this.def.starFactors || BALANCE.stars.perCell; return Math.round(this.board.cells * (f[3] !== undefined ? f[3] : f[2] / 0.9)); }
  get seasonProgress() { return this.inSeason / this.seasonLength; }

  /** Prévisualisation d'une pose de la tuile courante. */
  preview(q, r, tile = this.current) {
    if (!tile || !this.board.canPlace(q, r)) return null;
    return preview(this.board, q, r, tile, this.season, this.mods);
  }

  canPlace(q, r) { return !this.ended && !!this.current && this.board.canPlace(q, r) && (!this.restrict || this.restrict.has(key(q, r))); }

  // ---- Bâtir : poser une tuile sur une tuile de même famille ----
  /**
   * Les tuiles DÉJÀ POSÉES où la tuile courante peut aller : bâtir (même famille), fusionner (recette),
   * poser un ouvrage, remettre une friche en état. Rien dans le jeu ne le montrait — ni la file, ni le plateau —
   * et une mécanique entière passait inaperçue (retour du commanditaire).
   * @returns {Array<{q:number,r:number,kind:'build'|'fuse'|'restore',total:number}>}
   */
  buildTargets(tile = this.current) {
    if (this.ended || this.restrict || !tile) return [];
    // le rendu et le bandeau le demandent à chaque image : on garde le résultat tant que rien n'a bougé
    const cle = `${this.board.version}|${tile.family}:${tile.level || 1}:${tile.rare ? 1 : 0}|${this.breaths}|${this.season}|${this.placements}`;
    if (this._btKey === cle) return this._bt;
    const out = [];
    for (const t of this.board.tiles.values()) {
      if (!this.canBuild(t.q, t.r, tile)) continue;
      const pv = this.previewBuild(t.q, t.r, tile);
      if (!pv) continue;
      out.push({ q: t.q, r: t.r, kind: pv.fuse ? 'fuse' : pv.restore ? 'restore' : 'build', total: pv.total || 0 });
    }
    this._btKey = cle; this._bt = out;
    return out;
  }

  canBuild(q, r, tile = this.current) {
    if (this.ended || this.restrict || !tile) return false;
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
    if (this.fuseOn && canFuse(this.board, q, r, tile)) {
      const pv = previewFuse(this.board, q, r, tile, this.season, this.mods); if (!pv) return null;
      const first = !this.known.has(pv.fuse.id);
      pv.refund = { ok: false, reason: 'none' }; pv.cost = this.fusionCost(); pv.first = first;
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
    if (this.board.regionPaid(reg)) return { ok: true, reason: 'closed', region: reg.id };
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
    if (pv.fuse) {
      // fusion : la tuile en place devient la tuile composée ; fermetures éventuelles ; découverte = une tuile de retour et une rare
      placed = fusedTile(target, pv.fuse); this.board.tiles.set(key(q, r), placed); this.board.touch();
      for (const c of pv.closes) { this.board.payRegion(c); this.stats.closed++; this.stats.closedThisSeason++; this.breaths += BALANCE.breaths.close; this.stats.biggestRegion = Math.max(this.stats.biggestRegion, c.size); }
      this.breaths -= this.fusionCost(); this.stats.fusions++;
      if (pv.first) this.known.add(pv.fuse.id);   // la recette s'écrit dans le Cahier ; plus de tuile ni de rare en retour (elles faussaient le calibrage de 23 %)
    } else if (pv.restore) {
      target.blighted = false; this.board.touch(); this.breaths -= BALANCE.build.cost; this.stats.restored = (this.stats.restored || 0) + 1;
      for (const c of pv.closes) { this.board.payRegion(c); this.stats.closed++; this.stats.closedThisSeason++; this.breaths += BALANCE.breaths.close; }
    } else {
      target.level = (target.level || 1) + 1; target.builtAt = this.seasonsPassed.length; this.board.touch();
      this.breaths -= this.buildCost(target.level); this.stats.built++; if (target.level >= 3) this.stats.level3++;
      if (pv.refund.ok) { this.refunds++; this.queue.inject(this.queue.makeTile(tile.family), false); this.stats.refunds++; }
    }
    this.placements++; this.inSeason++;
    this.score += pv.total; this.tally[pv.fuse ? 'fusions' : 'build'] += pv.total;
    this.emit({ type: 'build', kind: pv.fuse ? 'fuse' : pv.restore ? 'restore' : 'level', q, r, tile: placed, level: placed.level, result: pv, refund: pv.refund, family: tile.family, recipe: pv.fuse ? pv.fuse.id : null, first: !!pv.first, rare, milestone: Math.floor(this.score / 100) > Math.floor(scoreBefore / 100) ? Math.floor(this.score / 100) * 100 : 0 });
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
    const placedTile = tile;
    const res = apply(this.board, q, r, placedTile, this.season, this.mods);
    if (this.rule === 'semailles' && Board.isFamily(placedTile, 'orchard')) { const pt = this.board.get(q, r); if (pt) pt.sown = true; }
    this.placements++; this.inSeason++;
    const scoreBefore = this.score;
    this.score += res.total;
    { const closes = res.closes.reduce((a, c) => a + c.bonus, 0); const base = res.base.reduce((a, b) => a + b.pts, 0); this.tally.closes += closes; this.tally.base += base; this.tally.edges += res.total - closes - base;
      if (!this.garden && (!this.bestMove || res.total > this.bestMove.pts)) this.bestMove = { pts: res.total, family: placedTile.family, season: this.season, closes: res.closes.length }; }
    const grade = this.garden ? null : gradeMove(res.total, best);
    if (grade === 'master' || grade === 'perfect') this.stats.perfect++;
    if (grade === 'master' || grade === 'perfect' || grade === 'good') { this.stats.streak++; this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.streak); } else if (grade === 'meh') this.stats.streak = 0;   // un coup correct ne casse pas la série, il ne la fait pas avancer
    for (const c of res.closes) { this.stats.closed++; this.stats.closedThisSeason++; this.breaths += BALANCE.breaths.close; this.stats.biggestRegion = Math.max(this.stats.biggestRegion, c.size); }
    if (this.season === 'summer' && Board.isFamily(tile, 'field') && this.board.landNeighbors(q, r).some(([a, b]) => { const n = this.board.get(a, b); return n && Board.isFamily(n, 'water'); })) this.stats.irrigatedSummer++;
    this.emit({ type: 'place', q, r, tile: placedTile, result: res, best, grade, streak: this.stats.streak, milestone: Math.floor(this.score / 100) > Math.floor(scoreBefore / 100) ? Math.floor(this.score / 100) * 100 : 0 });
    for (const c of res.closes) this.emit({ type: 'close', ...c, breath: BALANCE.breaths.close });
    this.updateFauna();
    this.checkWishes();
    // rappel : dix poses avant l'échéance d'un vœu encore ouvert
    for (const w of this.wishes) { const dl = w.def.deadline; if (w.status === 'open' && dl && dl.placements && dl.placements - this.placements === 10) this.emit({ type: 'wish', kind: 'soon', wish: w, left: 10 }); }
    if (!this.garden && this.inSeason >= this.seasonLength) this.advanceSeason();
    if (this.infinite && this.placements % BALANCE.infinite.growEvery === 0 && this.board.cells < BALANCE.infinite.maxCells) {
      const added = this.board.grow(BALANCE.infinite.growCells, this.rng);
      this.fillEnclosedHoles();   // la bordure neuve peut cerner une case : elle devient une mare, pas un trou
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
      if (!min || t.rare || t.fusion || t.blighted || (t.level || 1) > 1) { t.ripe = 0; t.ripening = false; continue; }
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
      v: 1, longSeasonDone: !!this.longSeasonDone, refunds: this.refunds,
      rngS: this.rng.s, board: this.board.snapshot(), queue: this.queue.snapshot(),
      restrict: this.restrict ? [...this.restrict] : null, pendingOpening: [...this.pendingOpening],
      season: this.season, inSeason: this.inSeason, placements: this.placements, seasonsPassed: [...this.seasonsPassed],
      score: this.score, breaths: this.breaths,
      wishes: this.wishes.map((w) => ({ ...w })), fauna: [...this.fauna.entries()],
      tally: { ...this.tally }, bestMove: this.bestMove ? { ...this.bestMove } : null, stats: { ...this.stats },
      undoUsedThisSeason: !!this.undoUsedThisSeason,
      huntSeason: !!this.huntSeason, rule: this.rule,
    };
  }

  /** Les rares retirées du jeu, encore présentes dans une partie reprise (plateau ou file), deviennent la tuile de leur famille. */
  retireRares() {
    let changed = false;
    for (const t of this.board.tiles.values()) {
      const f = RETIRED_RARE[t.family]; if (f) { t.family = f; t.rare = false; t.variant = 1; changed = true; }
      // un ouvrage posé sur une tuile (retirés eux aussi) s'en va : la tuile dessous reste telle quelle
      if (t.work) { delete t.work; delete t.workBad; delete t.workFresh; delete t.badSeasons; delete t.freshSeasons; changed = true; }
    }
    const list = this.queue.list;
    for (let k = list.length - 1; k >= 0; k--) {
      const t = list[k]; const f = RETIRED_RARE[t.family];
      if (f) list[k] = { ...this.queue.makeTile(f), id: t.id };
      else if (t.work) { if (RETIRED_WORKS.includes(t.family)) list.splice(k, 1); else list[k] = { ...this.queue.makeRare(t.family), id: t.id }; }   // ruche et menhir en main : des rares, désormais
    }
    if (changed) this.board.touch();
  }

  /** Remet l'île dans l'état rendu par `serialize()`. L'île doit avoir été construite avec la même définition. */
  restoreRun(s) {
    if (!s || s.v !== 1) return false;
    this.longSeasonDone = !!s.longSeasonDone; this.refunds = s.refunds || 0;
    this.rng.s = s.rngS; this.board.restore(s.board); this.queue.restore(s.queue);
    this.fillEnclosedHoles();   // une partie commencée avant le correctif garde son trou : la mare devient l'eau qu'elle a toujours eu l'air d'être
    this.retireRares();         // une rare retirée depuis (audit de simplification) redevient la tuile ordinaire qu'elle comptait
    this.restrict = s.restrict ? new Set(s.restrict) : null; this.pendingOpening = [...(s.pendingOpening || [])];
    this.season = s.season; this.inSeason = s.inSeason; this.placements = s.placements; this.seasonsPassed = [...(s.seasonsPassed || [])];
    this.score = s.score; this.breaths = s.breaths;
    this.wishes = (s.wishes || []).map((w) => ({ ...w })); this.fauna = new Map(s.fauna || []);
    this.tally = { ...this.tally, ...(s.tally || {}) }; this.bestMove = s.bestMove || null; this.stats = { ...this.stats, ...(s.stats || {}) };
    this.undoUsedThisSeason = !!s.undoUsedThisSeason;
    this.huntSeason = !!s.huntSeason; this.rule = s.rule;
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
    // rares à rente (ruche, menhir) : +pts par voisine des familles citées, plafonné ; la ruche donne un peu plus au printemps
    for (const t of this.board.tiles.values()) {
      const rs = t.rare && RARE_SEASONAL[t.family]; if (!rs) continue;
      const n = neighbors(t.q, t.r).filter(([a, b]) => { const x = this.board.get(a, b); return x && rs.families.some((f) => Board.isFamily(x, f)); }).length;
      const p = Math.min(rs.cap, n) * rs.pts + (this.season === 'spring' ? rs.spring || 0 : 0);
      if (p) ev.push({ type: 'rare', q: t.q, r: t.r, pts: p, id: t.family });
    }
    // niveau 3 : +1 par saison, et c'est tout (ses bords valent +2 et il compte triple dans sa région : voir rules.js).
    // Les « signatures » par famille (forêt ancienne, pâturage, domaine…) ne sont plus que des noms.
    for (const t of this.board.tiles.values()) {
      if ((t.level || 1) < 3 || t.rare) continue; const p = BALANCE.build.level3Season;
      if (p) ev.push({ type: 'level3', q: t.q, r: t.r, pts: p, family: t.family });
    }
    // fusions : prime de saison (+pts par voisine d'une famille, plafonnée, ou +pts fixes dans une saison)
    for (const t of this.board.tiles.values()) {
      if (!t.fusion) continue; const rec = FUSION_BY_ID[t.family]; if (!rec || !rec.seasonal) continue; const sp = rec.seasonal; let p = 0;
      if (sp.family) p = Math.min(sp.cap || 6, neighbors(t.q, t.r).filter(([a, b]) => Board.isFamily(this.board.get(a, b), sp.family)).length) * sp.pts;
      else if (sp.season === this.season) p = sp.pts;
      if (p) { ev.push({ type: 'fusion', q: t.q, r: t.r, pts: p, id: t.family }); }
    }
    for (const e of ev) { if (e.pts) pts += e.pts; if (e.type === 'harvest') this.stats.harvest++; if (e.type === 'bloom') this.stats.bloom++; }
    // faune : chaque animal présent donne des souffles et des points
    const faunaBonus = [...this.fauna.values()].filter((a) => !a.noBonus).length;
    pts += faunaBonus * (BALANCE.points.faunaSeason + this.mods.refuge);
    // le cumul par source garde chaque nature de prime à part (récoltes, veillées, sentiers…) : le bilan les montre une à une
    // au lieu d'une ligne « Saisons » qui en agrégeait une douzaine
    const faunaPts = faunaBonus * (BALANCE.points.faunaSeason + this.mods.refuge); let listed = faunaPts;
    this.tally.fauna += faunaPts;
    if (links) { this.tally.paths = (this.tally.paths || 0) + links * BALANCE.points.pathSeason; listed += links * BALANCE.points.pathSeason; }
    for (const e of ev) if (e.pts) { const k = `s_${e.type}`; this.tally[k] = (this.tally[k] || 0) + e.pts; listed += e.pts; }
    if (pts - listed) this.tally.seasons += pts - listed;
    this.score += pts;
    const grown = this.growTiles();
    this.emit({ type: 'season', from, to: this.season, events: ev, pts, faunaBonus, links, rule: this.rule, prevRule, grown });
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
        this.queue.inject(this.queue.makeRare(rare), false);
        this.emit({ type: 'wish', kind: 'done', wish: e.wish, rare });
      } else this.emit({ type: 'wish', kind: 'failed', wish: e.wish });
    }
  }

  pickRare() {
    const id = typeof this.def.id === 'number' ? this.def.id : 99;
    const tier = this.rareTier !== undefined ? this.rareTier : (id >= (mechIsland('rare2') || 1) ? 1 : 0);
    const pool = ['mill', 'chapel', 'watchtower', 'well', 'camp'];
    if (tier >= 1) pool.push('granary', 'hive', 'menhir');
    return pool[Math.floor(this.rng.next() * pool.length)];
  }

  // ---- Souffles ----
  get undoCost() { return BALANCE.breaths.undo; }
  /** Main de saison : choisir librement la tuile à jouer parmi les tuiles visibles (gratuit). */
  canPick(i) { return this.handOn && !this.ended && i > 0 && i < this.queue.list.length; }
  pick(i) { if (!this.canPick(i) || !this.queue.swap(i)) return false; this.emit({ type: 'pick', i }); return true; }
  /** Défausser : coûte des souffles, sauf pour un ouvrage (gratuit : on ne bloque jamais la file). */
  discardCost() { return BALANCE.breaths.discard; }
  canDiscard() { return this.queue.list.length > 0 && this.breaths >= this.discardCost(); }
  discard() { if (!this.canDiscard()) return false; this.breaths -= this.discardCost(); const t = this.queue.discard(); this.emit({ type: 'breath', kind: 'discard', tile: t }); this.checkEnd(); return true; }

  canUndo() { return this.history.length > 0 && this.breaths >= this.undoCost && !this.undoUsedThisSeason; }
  undo() {
    if (!this.canUndo()) return false;
    const s = this.history.pop();
    this.board.restore(s.board); this.queue.restore(s.queue); this.rule = s.rule || this.rule; this.huntSeason = !!s.huntSeason;
    this.score = s.score; this.placements = s.placements; this.inSeason = s.inSeason; this.season = s.season; this.seasonsPassed = [...s.seasonsPassed];
    this.stats = { ...s.stats }; if (s.tally) this.tally = { ...s.tally }; this.bestMove = s.bestMove ? { ...s.bestMove } : null; this.wishes = s.wishes.map((w) => ({ ...w }));
    this.breaths = s.breaths - this.undoCost;
    this.undoUsedThisSeason = true; this.stats.undo++;
    this.fauna = new Map(s.fauna);
    this.emit({ type: 'breath', kind: 'undo' });
    return true;
  }

  pushHistory() {
    this.history.push({ tally: { ...this.tally }, bestMove: this.bestMove ? { ...this.bestMove } : null, rule: this.rule, huntSeason: this.huntSeason, board: this.board.snapshot(), queue: this.queue.snapshot(), score: this.score, placements: this.placements, inSeason: this.inSeason, season: this.season, seasonsPassed: [...this.seasonsPassed], stats: { ...this.stats }, wishes: this.wishes.map((w) => ({ ...w })), breaths: this.breaths, fauna: new Map(this.fauna) });
    if (this.history.length > 3) this.history.shift();
  }

  /** Jardin : choisir librement la famille de la tuile courante. */
  get canChoose() { return this.garden; }
  setGardenTile(family) { if (!this.canChoose || !this.queue.list.length) return; this.queue.list[0] = this.queue.makeTile(family); this.emit({ type: 'choice', family }); }

  checkEnd() {
    if (this.ended) return;
    const noTile = this.queue.empty;
    const noMove = this.board.legalCells().length === 0;
    if (noTile || noMove) this.finish(noMove ? 'full' : 'queue');
  }

  finish(reason = 'queue') {
    if (this.ended) return this.result;
    this.ended = true;
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
    this.result = { island: this.def.id, score: this.score, stars: this.infinite || this.garden ? 0 : stars, gold, goldThreshold: this.goldThreshold, thresholds: th, tally: { ...this.tally }, bestMove: this.bestMove, dominant, archetype: (() => { const a = archetypeOf(this.board); return a ? { id: a.id, family: a.family, size: a.size } : null; })(), reason, placements: this.placements, seasons: this.seasonsPassed.length, stats: { ...this.stats }, fauna: this.fauna.size, wishesDone: this.stats.wishesDone, wishesTotal, seeds, cells, filled: this.board.placed };
    this.emit({ type: 'end', result: this.result });
    return this.result;
  }
}
