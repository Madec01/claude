// Sauvegarde locale versionnée (localStorage).
import { UPGRADES } from '../data/upgrades.js';
import { CAMPAIGN_SIZE, CHAPTER_LEN, CHAPTERS, CAMPAGNE_50_VERS_30, unlockedUpTo } from '../data/campaign.js';
const KEY = 'cent-saisons.save';
const VERSION = 3;
// v1 → v2 : la campagne passe de 12 à 50 îles ; les douze îles dessinées gardent leurs étoiles à leur nouvelle place
const OLD_TO_NEW = { 1: 1, 2: 3, 3: 7, 4: 5, 5: 10, 6: 15, 7: 13, 8: 20, 9: 25, 10: 30, 11: 35, 12: 50 };
function migrate(data, from) {
  if (from < 2) {
    const c = data.campaign; const remap = (obj) => { const o = {}; for (const [k, v] of Object.entries(obj || {})) { const n = OLD_TO_NEW[Number(k)]; if (n) o[n] = v; } return o; };
    c.stars = remap(c.stars); c.best = remap(c.best); c.plays = remap(c.plays); c.memoriesRead = (c.memoriesRead || []).map((k) => OLD_TO_NEW[k]).filter(Boolean);
    c.unlockedIsland = c.completed ? 50 : (OLD_TO_NEW[Math.min(12, Math.max(1, c.unlockedIsland || 1))] || 1);
    c.completed = false;
  }
  if (from < 3) migrerVers30(data.campaign);
  // « Grille discrète » : elle redessinait le contour des hexagones PAR-DESSUS les fondus de sol,
  // donc la grille réapparaissait entre deux tuiles posées — exactement ce que les fondus servent à
  // effacer. Elle n'a jamais été cochée par défaut, mais une sauvegarde l'ayant essayée la gardait
  // allumée sans qu'on fasse le lien. On la décoche une seule fois ; le marqueur évite de contrarier
  // qui la rallume ensuite volontairement.
  if (!data.fixes) data.fixes = {};
  if (!data.fixes.gridOff) { data.fixes.gridOff = true; if (data.options) data.options.grid = false; }
  // La fiche de la tuile à poser était affichée en permanence : une béquille qui couvrait le plateau au téléphone.
  // Elle se masque désormais par défaut (touche H, ou le « ? » de la file) ; on la replie une fois pour tous.
  if (!data.fixes.tileHelpOff) { data.fixes.tileHelpOff = true; if (data.options) { data.options.tileHelp = false; delete data.options.recap; } }
  tidyCampaign(data);
  return data;
}

/**
 * v2 → v3 : la campagne passe de cinquante à trente îles (24 septembre 2026). Les îles gardées suivent leur nouveau
 * numéro avec leurs étoiles, scores, parties, ors et archétypes ; celles qui partent sont mises de côté dans
 * `archive50`, jamais effacées. Les graines, les améliorations, les succès et les insignes de chapitre restent
 * (les chapitres gardent leur sens). Le joueur reprend à la première île qu'il n'avait pas encore atteinte.
 * Idempotent : une campagne déjà migrée n'a plus d'`archive50` à faire.
 */
export function migrerVers30(c) {
  if (!c || c.migre30) return;
  const M = CAMPAGNE_50_VERS_30; const archive = { stars: {}, best: {}, plays: {}, gold: {}, memoriesRead: [], iles: {} };
  const remap = (obj, nom) => { const o = {}; for (const [k, v] of Object.entries(obj || {})) { const n = M[Number(k)]; if (n) o[n] = v; else archive[nom][k] = v; } return o; };
  c.stars = remap(c.stars, 'stars'); c.best = remap(c.best, 'best'); c.plays = remap(c.plays, 'plays'); c.gold = remap(c.gold, 'gold');
  c.memoriesRead = (c.memoriesRead || []).map((k) => { const n = M[k]; if (!n) archive.memoriesRead.push(k); return n; }).filter(Boolean);
  if (c.insignes && c.insignes.iles) c.insignes.iles = remap(c.insignes.iles, 'iles');
  const ancienne = Math.max(1, c.unlockedIsland || 1);
  // la première île nouvelle dont l'ancien numéro atteint l'île où l'on en était — celle qu'on aurait jouée ensuite
  let suivante = CAMPAIGN_SIZE;
  for (const [vieux, neuf] of Object.entries(M)) if (Number(vieux) >= ancienne && neuf < suivante) suivante = neuf;
  c.unlockedIsland = c.completed ? CAMPAIGN_SIZE : Math.max(suivante, unlockedUpTo(c));
  if (Object.values(archive).some((v) => (Array.isArray(v) ? v.length : Object.keys(v).length))) c.archive50 = archive;
  c.migre30 = true;
}

/**
 * Coûts, niveau par niveau, des améliorations retirées par l'audit de simplification (22 septembre) et des niveaux
 * retirés à celles qui restent. Ils ne servent qu'à rembourser : les graines dépensées reviennent au joueur.
 */
const OLD_COSTS = {
  sickle: [6, 9, 12], seed2: [7], pocket: [5, 10], memory: [4, 8], talisman: [7], shed: [8], fresh: [7], spyglass: [12, 16],
  rare: [6, 10, 12, 14],
};
/**
 * Ce que la simplification retire de la sauvegarde, sans rien faire perdre : chaque niveau d'amélioration disparu
 * rend ses graines, et les contrats d'archipel s'effacent (ils ne comptent plus pour les portes). Idempotent : une
 * amélioration remboursée disparaît de la sauvegarde, un niveau en trop redescend au plafond — rien ne se rembourse
 * deux fois. Appelé au chargement et quand on reprend une partie en ligne.
 * @returns {number} graines rendues
 */
export function tidyCampaign(data) {
  const c = data && data.campaign; if (!c) return 0;
  let back = 0; const ups = c.upgrades || (c.upgrades = {});
  for (const [id, lv] of Object.entries({ ...ups })) {
    const u = UPGRADES.find((x) => x.id === id); const old = OLD_COSTS[id];
    const max = u ? u.costs.length : 0;
    if (u && (lv || 0) <= max) continue;
    if (old) for (let i = max; i < (lv || 0) && i < old.length; i++) back += old[i];
    if (u) ups[id] = max; else delete ups[id];
  }
  if (back) { c.seeds = (c.seeds || 0) + back; c.refunded = (c.refunded || 0) + back; }
  if (c.contracts) delete c.contracts;
  // les insignes : les archétypes gagnés île par île, et les chapitres clos (leur île-souvenir terminée). Une sauvegarde
  // d'avant les insignes reçoit ses chapitres déjà clos ; ses archétypes, eux, ne se devinent pas : ils viendront en rejouant.
  const ins = c.insignes || (c.insignes = { iles: {}, chapitres: [] });
  ins.iles = ins.iles || {}; ins.chapitres = ins.chapitres || [];
  for (let ch = 1; ch <= CHAPTERS.length; ch++) { const fin = ch * CHAPTER_LEN; if (!ins.chapitres.includes(ch) && (((c.plays || {})[fin] || 0) > 0 || (c.memoriesRead || []).includes(fin))) ins.chapitres.push(ch); }
  return back;
}
const defaults = () => ({
  version: VERSION,
  options: { master: 0.8, music: 0.7, ambience: 0.8, sfx: 0.9, muted: false, shake: true, testMode: false, skipTutorial: false, showFps: false, tileHelp: false, grid: false, notes: 'auto', haptics: true, rest: true, finaleClassique: false },   // notes : auto (sobres sur téléphone, toutes sur ordinateur), all, sober ; haptics : vibrations
  campaign: {
    recipes: [],   // fusions découvertes (Cahier)
    unlockedIsland: 1, stars: {}, gold: {}, best: {}, plays: {}, seeds: 0, seedsTotal: 0,   // gold : étoile d'or par île (cosmétique) ; plays : parties terminées par île (déblocage et porte de chapitre)
    upgrades: { sight: 0, breath: 0, patience: 0, rare: 0 },
    prologueSeen: false, completed: false, islandsPlayed: 0, memoriesRead: [],
    insignes: { iles: {}, chapitres: [] },   // archétypes gagnés par île ({ 12: ['sauvage', …] }) et chapitres clos
    announced: [],   // déblocages déjà annoncés par une bannière (modes de jeu, chapitre d'Atelier) : chacun ne passe qu'une fois
  },
  cloud: { choice: null, uid: null, pending: null },   // sauvegarde en ligne : choix de connexion (null = pas encore demandé, 'anon', 'google', 'none') ; `pending` = redirection Google en cours
  seen: {},   // cartes explicatives déjà vues (sentiers, rivière-lac), une seule fois par joueur
  backup: { lastAt: null, islandsSince: 0 },   // copie locale (fichier téléchargé) : date de la dernière et îles jouées depuis, pour le rappel
  infinite: { best: 0, bestSeasons: 0, unlocked: false },
  tempo: { best: 0, bestSerie: 0, parties: 0 },   // Le Souffle court : meilleur score tout court, meilleure série, parties jouées
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
  /** Une sauvegarde venue d'ailleurs (le nuage), mise au format courant : complétée et migrée, sans toucher à celle de l'appareil. */
  normalize(d) { const out = migrate(merge(defaults(), d || {}), (d && d.version) || 1); out.version = VERSION; return out; },
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
