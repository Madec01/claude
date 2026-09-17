// Sauvegarde locale versionnée (localStorage).
const KEY = 'cent-saisons.save';
const VERSION = 1;

const defaults = () => ({
  version: VERSION,
  options: { master: 0.8, music: 0.7, ambience: 0.8, sfx: 0.9, muted: false, shake: true, testMode: false, skipTutorial: false, showFps: false },
  campaign: {
    unlockedIsland: 1, stars: {}, best: {}, seeds: 0, seedsTotal: 0,
    upgrades: { sight: 0, pocket: 0, breath: 0, patience: 0, rare: 0, memory: 0 },
    prologueSeen: false, completed: false, islandsPlayed: 0, memoriesRead: [],
  },
  infinite: { best: 0, bestSeasons: 0, unlocked: false },
  daily: { best: {}, history: [], streak: 0, lastPlayed: null },
  stats: { placements: 0, closed: 0, fauna: 0, wishes: 0 },
});

function merge(base, extra) {
  if (!extra || typeof extra !== 'object') return base;
  for (const k of Object.keys(extra)) {
    if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && base[k] && typeof base[k] === 'object') merge(base[k], extra[k]);
    else base[k] = extra[k];
  }
  return base;
}

export const Save = {
  data: defaults(),
  available: true,
  load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { this.data = merge(defaults(), JSON.parse(raw)); this.data.version = VERSION; } }
    catch (e) { console.warn('Sauvegarde illisible, réinitialisation.', e); this.available = false; this.data = defaults(); }
    return this.data;
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (_) { this.available = false; } },
  reset() { const opts = this.data.options; this.data = defaults(); this.data.options = opts; this.save(); },
  get options() { return this.data.options; },
  get campaign() { return this.data.campaign; },
};
