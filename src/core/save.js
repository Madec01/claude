// Sauvegarde locale versionnée (localStorage).
const KEY = 'cent-saisons.save';
const VERSION = 2;
// v1 → v2 : la campagne passe de 12 à 50 îles ; les douze îles dessinées gardent leurs étoiles à leur nouvelle place
const OLD_TO_NEW = { 1: 1, 2: 3, 3: 7, 4: 5, 5: 10, 6: 15, 7: 13, 8: 20, 9: 25, 10: 30, 11: 35, 12: 50 };
function migrate(data, from) {
  if (from < 2) {
    const c = data.campaign; const remap = (obj) => { const o = {}; for (const [k, v] of Object.entries(obj || {})) { const n = OLD_TO_NEW[Number(k)]; if (n) o[n] = v; } return o; };
    c.stars = remap(c.stars); c.best = remap(c.best); c.plays = remap(c.plays); c.memoriesRead = (c.memoriesRead || []).map((k) => OLD_TO_NEW[k]).filter(Boolean);
    c.unlockedIsland = c.completed ? 50 : (OLD_TO_NEW[Math.min(12, Math.max(1, c.unlockedIsland || 1))] || 1);
    c.completed = false;
  }
  // « Grille discrète » : elle redessinait le contour des hexagones PAR-DESSUS les fondus de sol,
  // donc la grille réapparaissait entre deux tuiles posées — exactement ce que les fondus servent à
  // effacer. Elle n'a jamais été cochée par défaut, mais une sauvegarde l'ayant essayée la gardait
  // allumée sans qu'on fasse le lien. On la décoche une seule fois ; le marqueur évite de contrarier
  // qui la rallume ensuite volontairement.
  if (!data.fixes) data.fixes = {};
  if (!data.fixes.gridOff) { data.fixes.gridOff = true; if (data.options) data.options.grid = false; }
  return data;
}

const defaults = () => ({
  version: VERSION,
  options: { master: 0.8, music: 0.7, ambience: 0.8, sfx: 0.9, muted: false, shake: true, testMode: false, skipTutorial: false, showFps: false, tileHelp: true, grid: false, recap: 'auto', notes: 'auto', haptics: true, rest: true },   // relevé de saison : auto (complet sur ordinateur, bref sur téléphone), full, brief, none ; notes : auto (sobres sur téléphone, toutes sur ordinateur), all, sober ; haptics : vibrations
  campaign: {
    recipes: [],   // fusions découvertes (Cahier)
    unlockedIsland: 1, stars: {}, gold: {}, best: {}, plays: {}, seeds: 0, seedsTotal: 0,   // gold : étoile d'or par île (cosmétique) ; plays : parties terminées par île (déblocage et porte de chapitre) ; contracts : contrat d'archipel par chapitre
    contracts: {},
    upgrades: { sight: 0, pocket: 0, breath: 0, patience: 0, rare: 0, memory: 0 },
    prologueSeen: false, completed: false, islandsPlayed: 0, memoriesRead: [],
    announced: [],   // déblocages déjà annoncés par une bannière (modes de jeu, chapitre d'Atelier) : chacun ne passe qu'une fois
  },
  cloud: { choice: null, uid: null, pending: null },   // sauvegarde en ligne : choix de connexion (null = pas encore demandé, 'anon', 'google', 'none') ; `pending` = redirection Google en cours
  seen: {},   // cartes explicatives déjà vues (sentiers, rivière-lac), une seule fois par joueur
  backup: { lastAt: null, islandsSince: 0 },   // copie locale (fichier téléchargé) : date de la dernière et îles jouées depuis, pour le rappel
  infinite: { best: 0, bestSeasons: 0, unlocked: false },
  daily: { best: {}, history: [], streak: 0, lastPlayed: null },
  stats: { placements: 0, closed: 0, fauna: 0, wishes: 0 },
  fixes: {},   // correctifs appliqués une seule fois aux sauvegardes existantes (voir `migrate`)
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
    let raw = null;
    try { raw = localStorage.getItem(KEY); if (raw) { const parsed = JSON.parse(raw); this.data = migrate(merge(defaults(), parsed), parsed.version || 1); this.data.version = VERSION; } }
    catch (e) {
      // sauvegarde illisible : on la met de côté (jamais écrasée sans copie) et on tente la copie précédente
      console.warn('Sauvegarde illisible, copie de secours mise de côté.', e);
      try { if (raw) localStorage.setItem(KEY + '.broken', raw); const prev = localStorage.getItem(KEY + '.prev'); if (prev) { const parsed = JSON.parse(prev); this.data = migrate(merge(defaults(), parsed), parsed.version || 1); this.data.version = VERSION; return this.data; } } catch (_) {}
      this.available = false; this.data = defaults();
    }
    return this.data;
  },
  /** Écrit la sauvegarde ; l'état précédent est gardé en copie (`.prev`), relue si la sauvegarde devient illisible. */
  save() { this.data.savedAt = Date.now(); try { const cur = localStorage.getItem(KEY); if (cur) localStorage.setItem(KEY + '.prev', cur); localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (_) { this.available = false; } },

  // ---- copie locale : fichier téléchargé / chargé par le joueur ----
  /** Texte du fichier de sauvegarde (JSON lisible, avec version et date). */
  exportText() { return JSON.stringify({ app: 'cent-saisons', version: VERSION, exportedAt: new Date().toISOString(), data: this.data }, null, 1); },
  /** Résumé d'un fichier sans l'appliquer, ou null s'il n'est pas une sauvegarde du jeu. */
  inspect(text) {
    try {
      const doc = JSON.parse(text); const d = doc && doc.app === 'cent-saisons' && doc.data ? doc.data : (doc && doc.campaign ? doc : null);
      if (!d || !d.campaign) return null;
      const c = d.campaign; return { version: doc.version || d.version || 1, exportedAt: doc.exportedAt || null, unlockedIsland: c.unlockedIsland || 1, stars: Object.values(c.stars || {}).reduce((a, b) => a + b, 0), seeds: c.seeds || 0, data: d };
    } catch (_) { return null; }
  },
  /** Remplace la progression par celle du fichier (les options de l'appareil sont conservées). */
  importText(text) {
    const info = this.inspect(text); if (!info) return null;
    const opts = this.data.options;
    this.data = migrate(merge(defaults(), info.data), info.version); this.data.version = VERSION; this.data.options = opts;
    this.data.backup = { lastAt: Date.now(), islandsSince: 0 };
    this.save(); return info;
  },
  /** Rappel de copie locale : après cinq îles, ou une semaine, ou dès la troisième île si aucune copie n'a jamais été faite. */
  noteIslandDone() { const b = this.data.backup || (this.data.backup = { lastAt: null, islandsSince: 0 }); b.islandsSince = (b.islandsSince || 0) + 1; },
  backupDue() { const b = this.data.backup || {}; const week = 7 * 24 * 3600 * 1000; return (b.islandsSince || 0) >= 5 || (!b.lastAt && (b.islandsSince || 0) >= 3) || (!!b.lastAt && Date.now() - b.lastAt > week && (b.islandsSince || 0) >= 1); },
  markBackedUp() { this.data.backup = { lastAt: Date.now(), islandsSince: 0 }; this.save(); },
  reset() { const opts = this.data.options; this.data = defaults(); this.data.options = opts; this.save(); },
  get options() { return this.data.options; },
  get campaign() { return this.data.campaign; },
};
