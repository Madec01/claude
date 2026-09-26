// Campagne : dix chapitres de trois îles. Les douze îles dessinées à la main (islands.js) y sont replacées ; les dix-huit
// autres sont générées ici (masque, file, vœux tirés d'une réserve, textes courts). La campagne a compté cinquante îles
// (dix chapitres de cinq) jusqu'au 24 septembre 2026 : treize îles n'y apportaient rien de neuf. Chaque île générée garde
// la graine et les textes de son ancien numéro (`from`), sans quoi la renuméroter en ferait une autre île.
// Chaque mécanique arrive à une île précise (MECH_AT) ; les climats arrivent avec les archipels (chapitres 5 à 8).
// Une carte de tutoriel propre au climat s'affiche à chaque île dont le climat diffère de la précédente (climateCardFor).
import { ISLANDS, WEIGHTS, generateMask, enclosedHoles } from './islands.js';
import { CAMPAIGN_TEXTS } from './campaign_texts.js';
import { CAMPAIGN_STARS } from './campaign_stars.js';
import { SIGNATURE_OF, applySignature } from './signatures.js';

export const CAMPAIGN_SIZE = 30;
export const CHAPTER_LEN = 3;      // îles par chapitre
/** La croissance n'est pas une mécanique de plus à retenir : c'est le caractère du chapitre 9, « ici, le temps bâtit seul ». */
export const GROWTH_CHAPTER = 9;

/** Mécaniques introduites par île (cumulatives ; la croissance, elle, n'est active que sur son chapitre). */
export const MECH_AT = {
  1: ['affinity', 'close', 'fauna'], 2: ['river', 'season'], 3: ['semis'],
  4: ['wish', 'hand'], 5: ['breath'], 6: ['rare', 'harmonie'],
  7: ['surprise'], 8: ['hill'], 9: ['rare2'], 10: ['heath'],
  11: ['build'],
  13: ['climate', 'fuse'], 19: ['build3'], 25: ['growth'],
};
export const MECH_NAMES = { river: 'rivière', season: 'saisons', fauna: 'faune', semis: 'semis', wish: 'vœux', breath: 'souffles', rare: 'tuiles rares', surprise: 'surprises de saison', hill: 'collines', rare2: 'grenier, ruche et menhir', heath: 'lande', build: 'bâtir', hand: 'main de saison', climate: 'climats', fuse: 'fusions', build3: 'niveau 3' , growth: 'croissance', harmonie: 'harmonie'};
/** Île où une mécanique arrive (pour le Guide et l'Atelier). */
export function mechIsland(m) { for (const [n, list] of Object.entries(MECH_AT)) if (list.includes(m)) return Number(n); return null; }
/** Mécaniques disponibles jusqu'à l'île n (incluse). Sans argument : toutes (modes libres). */
export function campaignMechanics(n = 99) { const set = new Set(); for (const [k, list] of Object.entries(MECH_AT)) if (Number(k) <= n) for (const m of list) set.add(m); return set; }

// Chaque chapitre suit le schéma « nouveauté, pratique, souvenir ». `hand` : île dessinée ; `from` : ancien numéro d'une
// île générée (sa graine, sa saison de départ, son texte et sa signature en dépendent).
export const CHAPTERS = [
  { id: 1, name: 'Prise en main', sub: 'Trois petites îles pour apprendre', climate: 'temperate', islands: [{ hand: 1 }, { hand: 2 }, { hand: 4, memory: true }] },
  { id: 2, name: 'Les habitants', sub: 'Vœux, souffles et tuiles rares', climate: 'temperate', islands: [{ from: 6, cells: 50, w: 'farms' }, { hand: 3 }, { hand: 5, memory: true }] },
  { id: 3, name: 'Le ciel', sub: 'Surprises de saison, collines, nouvelles rares', climate: 'temperate', islands: [{ from: 11, cells: 60, w: 'balanced' }, { from: 12, cells: 64, w: 'hills' }, { hand: 7, memory: true }] },
  { id: 4, name: 'Bâtir', sub: 'Landes, puis les tuiles montent de niveau', climate: 'temperate', islands: [{ from: 14, cells: 68, w: 'moor' }, { from: 16, cells: 66, w: 'all' }, { hand: 6, memory: true }] },
  { id: 5, name: 'Archipel du Sud', sub: 'Climat chaud, fusions', climate: 'hot', islands: [{ from: 21, cells: 72, w: 'coastAll' }, { from: 23, cells: 78, w: 'hills' }, { hand: 9, memory: true }] },
  { id: 6, name: 'Archipel des Pluies', sub: 'Climat humide, grandes pluies', climate: 'humid', islands: [{ from: 26, cells: 76, w: 'rivers' }, { from: 29, cells: 88, w: 'moorFarm' }, { hand: 10, memory: true }] },
  { id: 7, name: 'Archipel du Nord', sub: 'Climat froid, niveau 3', climate: 'cold', islands: [{ from: 31, cells: 82, w: 'ridges' }, { hand: 8 }, { hand: 11, memory: true }] },
  { id: 8, name: 'Les Quatre Climats', sub: 'Chaque île change de climat', climate: 'mixed', islands: [{ from: 36, cells: 90, w: 'coastAll', climate: 'hot' }, { from: 37, cells: 94, w: 'ridges', climate: 'cold' }, { from: 39, cells: 100, w: 'rivers', climate: 'humid', memory: true }] },
  { id: 9, name: 'Les grandes îles', sub: 'Ici, le temps bâtit seul', climate: 'mixed', islands: [{ from: 41, cells: 104, w: 'all', climate: 'temperate' }, { from: 43, cells: 120, w: 'ridges', climate: 'cold' }, { from: 45, cells: 140, w: 'moorFarm', climate: 'hot', memory: true }] },
  { id: 10, name: 'Cent saisons', sub: 'La fin du souvenir', climate: 'temperate', islands: [{ from: 46, cells: 120, w: 'all' }, { from: 49, cells: 150, w: 'all' }, { hand: 12, memory: true }] },
];

/** Réserve de vœux des îles générées (textes dans STORY.wishes, clés c_*). `needs` : mécanique requise ; `dl` : échéance en fraction des cases. */
export const CAMPAIGN_WISHES = [
  { id: 'c_forest', type: 'region', family: 'forest', size: 6, dl: 0.6 },
  { id: 'c_meadow', type: 'closed', family: 'meadow', size: 4, dl: 0.7 },
  { id: 'c_pairs', type: 'pairs', a: 'field', b: 'hamlet', count: 4, dl: 0.7 },
  { id: 'c_river', type: 'river', minLen: 5, dl: 0.65, needs: 'river' },
  { id: 'c_mouth', type: 'river', minLen: 3, mouth: true, dl: 0.75, needs: 'river' },
  { id: 'c_lake', type: 'lake', size: 5, dl: 0.7, needs: 'river' },
  { id: 'c_rabbit', type: 'fauna', species: 'rabbit', dl: 0.5, needs: 'fauna' },
  { id: 'c_duck', type: 'fauna', species: 'duck', dl: 0.6, needs: 'fauna' },
  { id: 'c_species', type: 'species', count: 4, dl: 0.85, needs: 'fauna' },
  { id: 'c_bourg', type: 'bourg', count: 2, dl: 0.85 },
  { id: 'c_harvest', type: 'harvest', count: 3, dl: 0.95, needs: 'season' },
  { id: 'c_bloom', type: 'bloom', count: 3, dl: 0.95, needs: 'season' },
  { id: 'c_veillee', type: 'veillee', pairs: 2, dl: 0.95, needs: 'season' },
  { id: 'c_closedSeason', type: 'closedInSeason', count: 2, dl: 0.95 },
  { id: 'c_level', type: 'level', count: 2, dl: 0.85, needs: 'build' },
  { id: 'c_paddy', type: 'fusion', recipe: 'paddy', dl: 0.85, needs: 'fuse' },
  { id: 'c_farm', type: 'fusion', recipe: 'farm', dl: 0.85, needs: 'fuse' },
];

function mulberry(seed) { let s = seed >>> 0 || 7; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Multiplicateurs de file par climat (le reste du climat est dans climates.js). */
const CLIMATE_WEIGHTS = {
  temperate: {},
  hot: { sand: 2.2, rock: 1.4, orchard: 1.3, water: 0.6, marsh: 0.4, forest: 0.8 },
  humid: { marsh: 2.0, water: 1.5, forest: 1.3, sand: 0.5, orchard: 0.8 },
  cold: { forest: 1.5, rock: 1.4, orchard: 0.4, marsh: 0.6, sand: 0.5, heath: 1.2 },
};
function weightsFor(setName, climate, mech) {
  const base = { ...WEIGHTS[setName] };
  if (!mech.has('hill')) delete base.hill; if (!mech.has('heath')) delete base.heath;
  const mul = CLIMATE_WEIGHTS[climate] || {};
  for (const k of Object.keys(base)) base[k] = Math.max(1, Math.round(base[k] * (mul[k] || 1)));
  return base;
}

const chapterOf = (n) => CHAPTERS[Math.floor((n - 1) / CHAPTER_LEN)];

/** Définition d'une île de campagne (1 à CAMPAIGN_SIZE) : île dessinée replacée, ou île générée. Un numéro hors campagne est ramené aux bords. */
export function campaignIsland(n) {
  n = Math.max(1, Math.min(CAMPAIGN_SIZE, Number(n) || 1));
  const ch = chapterOf(n); const slot = ch.islands[(n - 1) % CHAPTER_LEN];
  const mech = campaignMechanics(n);
  const climate = slot.climate || (ch.climate === 'mixed' ? 'temperate' : ch.climate);
  const stars = CAMPAIGN_STARS[n];
  if (slot.hand) {
    const h = ISLANDS.find((i) => i.id === slot.hand);
    // les vœux et tuiles de départ restent ; les vœux disparaissent si l'île est jouée avant l'arrivée des vœux
    // un vœu qui demande une mécanique pas encore arrivée tombe (Le Pont de Glace demande un fortin : les fusions ouvrent avant lui, désormais)
    const wishOk = (w) => !(w.type === 'fusion' && !mech.has('fuse')) && !(w.type === 'level' && !mech.has('build'));
    return { ...h, id: n, story: h.id, chapter: ch.id, climate, memory: !!slot.memory, mech, wishes: mech.has('wish') ? h.wishes.filter(wishOk) : [], mechanics: [], starFactors: stars || h.starFactors, surprise: mech.has('surprise') };
  }
  const from = slot.from || n;   // l'ancien numéro : la graine et les textes lui restent attachés
  const seed = 5000 + from * 131;
  const rng = mulberry(seed);
  const cells = slot.cells;
  const seasonLength = cells <= 40 ? 7 : cells <= 56 ? 8 : cells <= 80 ? 9 : cells <= 100 ? 10 : 11;
  const tilesRatio = ch.id <= 2 ? 0.95 : ch.id <= 4 ? 0.93 : ch.id <= 7 ? 0.92 : 0.9;
  const startSeason = ['spring', 'summer', 'autumn', 'winter'][from % 4];
  // vœux : de la réserve, compatibles avec les mécaniques et le climat
  const wishCount = !mech.has('wish') ? 0 : ch.id <= 2 ? 2 : ch.id <= 7 ? 3 : 4;
  const wts = weightsFor(slot.w, climate, mech); const share = (f) => (wts[f] || 0) / Object.values(wts).reduce((a, b) => a + b, 0);
  // faisabilité : pas de vœu d'eau sur une file pauvre en eau, pas de floraison sans marais, pas de bourg sans hameaux, pas de grande forêt sur une petite île
  const feasible = (w) => {
    if ((w.type === 'river' || w.type === 'lake') && share('water') < 0.12) return false;
    if (w.id === 'c_bloom' && share('marsh') < 0.06) return false;
    if (w.id === 'c_veillee' && (share('water') < 0.1 || share('hamlet') < 0.09)) return false;
    if ((w.id === 'c_bourg' || w.id === 'c_pairs') && (share('hamlet') < 0.09 || share('field') + share('orchard') < 0.12)) return false;
    if (w.id === 'c_forest' && (share('forest') < 0.12 || cells < 44)) return false;
    if (w.id === 'c_species' && cells < 50) return false;
    return true;
  };
  const pool = CAMPAIGN_WISHES.filter((w) => !w.needs || mech.has(w.needs)).filter((w) => !(climate === 'cold' && (w.id === 'c_bloom' || w.id === 'c_harvest')) && !(climate === 'hot' && (w.id === 'c_veillee' || w.id === 'c_lake'))).filter(feasible);
  const wishes = [];
  while (wishes.length < wishCount && pool.length) { const w = pool.splice(Math.floor(rng() * pool.length), 1)[0]; const { dl, needs, ...def } = w; wishes.push({ ...def, deadline: { placements: Math.round(cells * dl) } }); }
  const t = CAMPAIGN_TEXTS[from] || { name: `Île ${n}`, intro: ['Une île sans nom, pour l’instant.', 'Pose, et elle se souviendra.'], memory: 'Elle a fini par avoir un nom. Le tien.' };
  const start = [{ q: 0, r: 0, family: 'hamlet' }, { q: 2, r: -1, family: 'rock' }];
  if (cells >= 60) start.push({ q: -2, r: 2, family: rng() < 0.5 ? 'rock' : 'water' });
  if (cells >= 100) start.push({ q: 3, r: 1, family: 'meadow' });
  let def = {
    id: n, story: null, chapter: ch.id, climate, memory: !!slot.memory, mech, arch: ch.id, cells, seed, roughness: 0.3 + rng() * 0.2, holes: cells >= 60 ? 1 + Math.floor(rng() * 2) : 0,
    seasonLength, startSeason, weights: weightsFor(slot.w, climate, mech), tilesRatio, start, wishes, mechanics: [], surprise: mech.has('surprise'),
    name: t.name, intro: t.intro, memoryText: t.memory, starFactors: stars || [3.6, 5.2, 6.5, 7.2],
  };
  // signature de l'île (fin de campagne) : la contrainte modifie la file et le départ ; les vœux qui n'ont plus de sens tombent
  if (SIGNATURE_OF[from]) {
    def = applySignature(def, SIGNATURE_OF[from]);
    const w2 = def.weights; const tot = Object.values(w2).reduce((a, b) => a + b, 0); const sh = (f) => (w2[f] || 0) / (tot || 1);
    def.wishes = def.wishes.filter((w) => !((w.type === 'river' || w.type === 'lake') && sh('water') < 0.08) && !(w.type === 'river' && !w2.rock && !w2.hill) && !(w.id === 'c_bloom' && sh('marsh') < 0.04) && !((w.id === 'c_bourg' || w.id === 'c_pairs' || w.id === 'c_veillee') && !w2.hamlet));
  }
  return def;
}

/** Carte de climat à afficher sur l'île n : quand son climat diffère de celui de l'île précédente (ou à la première île à climat). */
export function climateCardFor(n) {
  const def = campaignIsland(n); const prev = n > 1 ? campaignIsland(n - 1) : null;
  if (prev && prev.climate === def.climate) return null;
  if (!prev || (prev.climate === 'temperate' && def.climate === 'temperate')) return null;
  return `climate_${def.climate}`;
}

/**
 * Correspondance des numéros d'île de la campagne à cinquante (jusqu'au 24 septembre 2026) vers la campagne à trente :
 * migration des sauvegardes (save.js) et des parties en cours (run.js). Les vingt îles absentes sont retirées
 * (gardées de côté pour le Livre II).
 */
export const CAMPAGNE_50_VERS_30 = { 1: 1, 3: 2, 5: 3, 6: 4, 7: 5, 10: 6, 11: 7, 12: 8, 13: 9, 14: 10, 16: 11, 15: 12, 21: 13, 23: 14, 25: 15, 26: 16, 29: 17, 30: 18, 31: 19, 20: 20, 35: 21, 36: 22, 37: 23, 39: 24, 41: 25, 43: 26, 45: 27, 46: 28, 49: 29, 50: 30 };
/** Étoiles du chapitre k dans une sauvegarde. */
export function chapterStars(stars, k) { let s = 0; for (let n = (k - 1) * CHAPTER_LEN + 1; n <= k * CHAPTER_LEN; n++) s += stars[n] || 0; return s; }
/** Étoiles comptées pour la porte : celles des îles du chapitre (les contrats d'archipel, qui en ajoutaient deux, ont été retirés). */
export function gateStars(campaign, k) { return chapterStars((campaign && campaign.stars) || {}, k); }
export const CHAPTER_GATE = 4;       // étoiles dans un chapitre (sur 9) pour ouvrir le suivant
export const CHAPTER_PATIENCE = 5;   // ou, sans les étoiles : parties terminées dans le chapitre. La porte finit toujours par s'ouvrir.

/**
 * Une île est **terminée** dès qu'on en a vu le bout, avec ou sans étoile : c'est ce qui ouvre la suivante.
 * Les étoiles ne servent plus qu'aux portes de chapitre, aux graines et à l'or — une île ratée ne mure personne.
 * `best` et `stars` servent de repli pour les sauvegardes d'avant `plays`.
 */
export function islandDone(campaign, n) {
  const c = campaign || {};
  return ((c.plays && c.plays[n]) || 0) > 0 || ((c.stars && c.stars[n]) || 0) >= 1 || ((c.best && c.best[n]) || 0) > 0;
}
/** Parties terminées dans le chapitre k (une île terminée avant que `plays` n'existe compte pour une). */
export function chapterPlays(campaign, k) {
  const c = campaign || {}; let s = 0;
  for (let n = (k - 1) * CHAPTER_LEN + 1; n <= k * CHAPTER_LEN; n++) s += Math.max((c.plays && c.plays[n]) || 0, islandDone(c, n) ? 1 : 0);
  return s;
}
/** Les îles du chapitre k sont-elles toutes terminées ? */
export function chapterDone(campaign, k) { for (let n = (k - 1) * CHAPTER_LEN + 1; n <= k * CHAPTER_LEN; n++) if (!islandDone(campaign, n)) return false; return true; }
/**
 * La porte du chapitre k. Deux clés, et il suffit d'une :
 *  — les étoiles (quatre sur neuf) : la voie du joueur qui vise ;
 *  — la patience (les trois îles terminées, et cinq parties en tout dans le chapitre) : la voie du joueur qui rame.
 *    Elle s'atteint en jouant, donc aucune porte ne peut rester fermée pour de bon — et rejouer cinq fois la même
 *    île n'ouvre rien, puisqu'il faut d'abord avoir vu le bout des trois.
 */
export function gateOpen(campaign, k) {
  return gateStars(campaign, k) >= CHAPTER_GATE || (chapterDone(campaign, k) && chapterPlays(campaign, k) >= CHAPTER_PATIENCE);
}

/**
 * Jusqu'où la campagne est ouverte, **déduite de la sauvegarde** plutôt que notée au passage.
 * Recalculée après chaque île et au lancement : terminer une île ouvre la suivante, et décrocher sur une île déjà
 * jouée l'étoile qui manquait à une porte ouvre la suite immédiatement, sans rejouer l'île de bout de chapitre.
 */
export function unlockedUpTo(campaign) {
  let n = 1;
  while (n < CAMPAIGN_SIZE) {
    if (!islandDone(campaign, n)) break;                          // île pas encore terminée : la suite attend
    if (n % CHAPTER_LEN === 0 && !gateOpen(campaign, n / CHAPTER_LEN)) break;   // porte de chapitre encore fermée
    n++;
  }
  return n;
}

/**
 * Nombre de cases réel d'une île, sans jouer la partie : le masque tiré de la graine, plus les cases forcées.
 * C'est lui qui multiplie les facteurs d'étoiles (`Island.thresholds`) — il peut différer de `def.cells` d'une
 * case ou deux, le masque s'arrêtant quand sa frontière est épuisée.
 */
const cellsCache = new Map();
export function islandCells(def) {
  if (cellsCache.has(def.id)) return cellsCache.get(def.id);
  const mask = generateMask(def.seed, def.cells, { roughness: def.roughness, holes: def.holes });
  for (const [q, r] of def.ensure || []) mask.add(`${q},${r}`);
  for (const t of def.start || []) mask.add(`${t.q},${t.r}`);
  for (const c of enclosedHoles(mask)) mask.add(`${c.q},${c.r}`);   // une lagune est une case de l'île, avec sa tuile d'eau
  cellsCache.set(def.id, mask.size);
  return mask.size;
}

/** Les seuils d'étoiles d'une île, en points (les trois étoiles, puis l'or). */
export function islandThresholds(def) {
  const f = def.starFactors || []; const cells = islandCells(def);
  return f.map((x) => Math.round(cells * x));
}

/**
 * Réattribue les étoiles des îles déjà jouées à partir du meilleur score gardé en sauvegarde.
 * Une échelle d'étoiles revue ne doit pas laisser le joueur avec l'ancienne note : son score, lui, n'a pas bougé.
 * Ne retire jamais rien (`Math.max`), donc rejouer moins bien ne coûte rien. Rend true si la sauvegarde a changé.
 */
export function restarFromBest(campaign) {
  const c = campaign || {}; const best = c.best || {}; let changed = false;
  for (const [k, score] of Object.entries(best)) {
    const n = Number(k);
    if (!(n >= 1 && n <= CAMPAIGN_SIZE) || !(score > 0)) continue;
    const th = islandThresholds(campaignIsland(n));
    if (!th.length) continue;
    let st = 0; for (let i = 0; i < 3; i++) if (th[i] !== undefined && score >= th[i]) st++;
    if (st > ((c.stars && c.stars[n]) || 0)) { c.stars = c.stars || {}; c.stars[n] = st; changed = true; }
    if (th[3] !== undefined && score >= th[3] && !(c.gold && c.gold[n])) { c.gold = c.gold || {}; c.gold[n] = true; changed = true; }
  }
  return changed;
}

/** Ce qui manque pour ouvrir la porte du chapitre k, en une phrase pour le joueur (null si elle est ouverte). */
export function gateText(campaign, k) {
  if (gateOpen(campaign, k)) return null;
  const st = gateStars(campaign, k), pl = chapterPlays(campaign, k);
  return `${st} / ${CHAPTER_GATE} étoiles pour ouvrir le chapitre suivant — ou ${pl} / ${CHAPTER_PATIENCE} parties terminées dans ce chapitre, les trois îles comprises. Rejouer une île déjà faite compte des deux côtés.`;
}

/** Options à passer à `new Island(def, …)` depuis les mécaniques de l'île (tout est ouvert dans les modes libres). */
export function islandOptions(def) {
  const m = def.mech || campaignMechanics(99);
  // la croissance : le caractère du chapitre 9 en campagne, toujours là dans les modes libres
  const growth = def.chapter ? def.chapter === GROWTH_CHAPTER : m.has('growth');
  return { build: m.has('build'), growth, hand: m.has('hand'), fuse: m.has('fuse'), level3: m.has('build3'), surprise: m.has('surprise'), rareTier: m.has('rare2') ? 1 : 0, harmonie: m.has('harmonie') };
}
