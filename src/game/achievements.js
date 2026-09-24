// Moteur des succès : écoute les événements d'une île, le bilan et quelques gestes (copie de sauvegarde), tient les
// compteurs cumulés dans la sauvegarde et débloque les vignettes (une graine chacune). Sans DOM : les écouteurs
// (`onUnlock`) affichent la bannière et jouent le son.
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, ACHIEVEMENT_SEED } from '../data/achievements.js';
import { SPECIES } from './fauna.js';
import { FUSIONS } from '../data/tiles.js';
import { CHAPTERS, campaignIsland, chapterStars, CAMPAIGN_SIZE, CHAPTER_LEN } from '../data/campaign.js';
import { waterBodies } from './water.js';

const CLIMATES = ['temperate', 'hot', 'humid', 'cold'];

export const Achievements = {
  save: null, listeners: [], testMode: () => false,
  init(save) {
    this.save = save;
    const d = save.data; if (!d.achievements) d.achievements = {};
    const a = d.achievements; a.unlocked = a.unlocked || {}; a.counters = a.counters || {}; a.species = a.species || [];
    return a;
  },
  get state() { return this.init(this.save); },
  onUnlock(fn) { this.listeners.push(fn); },
  has(id) { return !!this.state.unlocked[id]; },
  count() { return Object.keys(this.state.unlocked).length; },
  /** Valeur courante d'un compteur (pour les barres de progression). */
  counter(name) {
    const a = this.state, s = this.save.data;
    switch (name) {
      case 'species': return a.species.length;
      case 'recipes': return (s.campaign.recipes || []).filter((r) => FUSIONS.some((f) => f.id === r)).length;
      case 'stars': return Object.entries(s.campaign.stars || {}).filter(([n]) => Number(n) >= 1 && Number(n) <= CAMPAIGN_SIZE).reduce((x, [, y]) => x + y, 0);   // les îles hors campagne ne comptent pas
      case 'climates3': return this.climates3();
      case 'dailyStreak': return s.daily ? (s.daily.streak || 0) : 0;
      case 'infiniteBest': return s.infinite ? (s.infinite.bestPlacements || 0) : 0;
      default: return a.counters[name] || 0;
    }
  },
  progress(ach) { return ach.target ? { value: Math.min(ach.target, this.counter(ach.counter)), target: ach.target } : null; },
  climates3() {
    const stars = this.save.data.campaign.stars || {}; const got = new Set();
    for (const [n, st] of Object.entries(stars)) if (st >= 3 && Number(n) >= 1 && Number(n) <= CAMPAIGN_SIZE) got.add(campaignIsland(Number(n)).climate);
    return CLIMATES.filter((c) => got.has(c)).length;
  },
  unlock(id) {
    const a = this.state; const ach = ACHIEVEMENT_BY_ID[id];
    if (!ach || a.unlocked[id] || this.testMode()) return false;
    a.unlocked[id] = Date.now();
    this.save.data.campaign.seeds += ACHIEVEMENT_SEED; this.save.data.campaign.seedsTotal = (this.save.data.campaign.seedsTotal || 0) + ACHIEVEMENT_SEED;
    this.save.save();
    for (const fn of this.listeners) fn(ach);
    return true;
  },
  add(counterName, n = 1) { const a = this.state; a.counters[counterName] = (a.counters[counterName] || 0) + n; },
  /** Vérifie tous les succès qui se comptent. */
  checkCounters() {
    for (const ach of ACHIEVEMENTS) if (ach.target && !this.has(ach.id) && this.counter(ach.counter) >= ach.target) this.unlock(ach.id);
  },

  /** Événement d'une île en cours (place, close, season, fauna, wish, build…). */
  onIslandEvent(e, isl) {
    if (!this.save || !isl) return;
    const campaign = typeof isl.def.id === 'number' && !isl.def.daily && !isl.infinite && !isl.garden;
    if (e.type === 'place') {
      this.unlock('premiere-tuile');
      if (e.grade === 'master') { this.add('masters'); this.checkCounters(); }
      if (isl.stats.bestStreak >= 8) this.unlock('sans-faute');
      const rv = e.result && e.result.river;
      if (rv && rv.kind === 'river' && rv.len >= 6) this.unlock('la-source');
      if (rv && rv.mouthPts) this.unlock('jusqu-a-la-mer');
      if (rv && waterBodies(isl.board).some((w) => w.fedBy)) this.unlock('le-lac');
    } else if (e.type === 'close') {
      this.unlock('un-toit');
      if (e.family === 'hamlet' && e.size >= 4) this.unlock('bourg');
      if (e.size >= 10) this.unlock('grand-domaine');
    } else if (e.type === 'season') {
      if ((e.events || []).some((x) => x.type === 'veillee')) this.unlock('veillee');
      if (isl.seasonsPassed.length >= 4) this.unlock('quatre-saisons');
      const harvests = (e.events || []).filter((x) => x.type === 'harvest').length; if (harvests) { this.add('harvests', harvests); this.checkCounters(); }
    } else if (e.type === 'fauna' && e.kind === 'arrive') {
      const a = this.state; if (SPECIES.includes(e.species) && !a.species.includes(e.species)) { a.species.push(e.species); this.checkCounters(); }
      if (e.species === 'bear') this.unlock('l-ours');
      if (e.species === 'penguin') this.unlock('les-manchots');
      if (new Set([...isl.fauna.values()].map((x) => x.species)).size >= 5) this.unlock('compagnie');
    } else if (e.type === 'wish' && e.kind === 'done') {
      this.unlock('promesse-tenue'); this.add('wishes'); this.checkCounters();
    } else if (e.type === 'build') {
      if (e.kind === 'level') { this.add('built'); this.checkCounters(); if (e.level >= 3) this.unlock('signature'); }
      if (e.kind === 'fuse' && e.recipe === 'falls') this.unlock('port-d-attache');
      if (e.kind === 'fuse') this.checkCounters();   // recettes du Cahier (enregistrées par la scène)
    } else if (e.type === 'end') {
      const r = e.result;
      if (campaign && r.stats && r.stats.undo === 0 && r.placements >= 20) this.unlock('sans-regret');
      if (r.wishesTotal >= 4 && r.wishesDone === r.wishesTotal) this.unlock('toute-l-ile');
      if (isl.infinite) { const s = this.save.data; s.infinite.bestPlacements = Math.max(s.infinite.bestPlacements || 0, r.placements); this.checkCounters(); }
    }
    void campaign;
  },

  /** Après l'enregistrement du bilan d'une île de campagne (étoiles à jour). */
  onCampaignResult(result, def) {
    const s = this.save.data;
    if (def.id === CAMPAIGN_SIZE) this.unlock('cent-saisons');   // « Terminer la dernière île » : la terminer suffit, comme partout ailleurs
    for (const ch of CHAPTERS) if (chapterStars(s.campaign.stars, ch.id) >= CHAPTER_LEN * 3) { this.unlock('chapitre-clos'); break; }
    this.checkCounters();   // étoiles, climats
  },
  /** Copie locale de la sauvegarde téléchargée. */
  onBackup() { this.unlock('prudence'); },
  onDaily() { this.checkCounters(); },
};
