// Sauvegarde locale versionnée (localStorage).

const KEY = 'feux-de-brume.save';
const VERSION = 1;

const defaults = () => ({
  version: VERSION,
  options: {
    master: 0.8, music: 0.7, ambience: 0.8, sfx: 0.9,
    muted: false,
    shake: true,
    testMode: false,
    skipTutorial: false,
    showFps: false,
    hardMode: false,
  },
  campaign: {
    unlockedNight: 1,       // dernière nuit accessible
    stars: {},              // nuit -> 0..3
    best: {},               // nuit -> meilleur score
    shards: 0,              // Éclats disponibles
    shardsTotal: 0,
    upgrades: { lens: 0, mechanism: 0, hornRange: 0, hornSpeed: 0, oil: 0, lantern: 0 },
    pagesRead: [],          // ids de pages lues
    prologueSeen: false,
    completed: false,
    nightsPlayed: 0,
  },
  infinite: { best: 0, bestWave: 0, unlocked: false },
  stats: { docked: 0, wrecked: 0, hornBlows: 0, pages: 0 },
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
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = merge(defaults(), parsed);
        this.data.version = VERSION;
      }
    } catch (e) {
      console.warn('Sauvegarde illisible, réinitialisation.', e);
      this.available = false;
      this.data = defaults();
    }
    return this.data;
  },

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (_) { this.available = false; }
  },

  reset() {
    const opts = this.data.options;
    this.data = defaults();
    this.data.options = opts;
    this.save();
  },

  get options() { return this.data.options; },
  get campaign() { return this.data.campaign; },
};
