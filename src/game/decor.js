// Décor composé par région : les objets (arbres, rochers, maisons, roseaux…) sont placés à la volée pour toute une
// région de même famille, de façon déterministe (graine par case), ce qui donne des forêts continues et denses,
// des massifs rocheux reliés et de vrais villages. Les tuiles rares gardent leur image composée.
import { toWorld, fromWorld, key, parse, neighbors, edgeMid, DIRS, SIZE, TILE_H } from './hex.js';
import { Board } from './board.js';
import { RARE_AS } from '../data/tiles.js';
import { classifyWater } from './water.js';
import { pathShapes, pathPoints } from './paths.js';

/** Type de sol d'une tuile (image `ground_<type>_<saison>`). */
/** Sol des tuiles composées (les fusions d'eau prennent la rive de leurs voisines, l'eau est dessinée par plan). */
const FUSION_GROUND = { farm: 'field', fort: 'stone', cave: 'stone' };
/** Décor des tuiles composées : objets posés autour du centre (dx, dy en unités monde). */
export const FUSION_DECOR = {
  paddy:  [{ tpl: 'obj_crop_{s}', dx: -20, dy: 10 }, { tpl: 'obj_crop_{s}', dx: 0, dy: 20 }, { tpl: 'obj_crop_{s}', dx: 20, dy: 10 }, { tpl: 'obj_crop_{s}', dx: -10, dy: 34 }, { tpl: 'obj_crop_{s}', dx: 12, dy: 36 }, { tpl: 'obj_lily', dx: -26, dy: 30, seasons: ['summer'] }],
  farm:   [{ tpl: 'obj_farm', dx: 0, dy: 30 }, { tpl: 'obj_silo1', dx: -34, dy: 22 }, { tpl: 'obj_fence', dx: 32, dy: 40 }, { tpl: 'obj_haybale', dx: 30, dy: 12 }, { tpl: 'obj_hay', dx: 8, dy: 46 }, { tpl: 'obj_crop_{s}', dx: -28, dy: 44 }],
  // le château faisait 75 × 84 sur un hexagone large de 120 : il mangeait sa case et débordait, et le
  // bout de rempart posé à côté n'était accroché à rien. Réduit à la taille d'une petite maison, avec
  // deux maisonnettes blotties dessous : on lit un hameau fortifié, pas un donjon tombé là.
  fort:   [{ tpl: 'obj_castle_small', dx: 0, dy: 26, scale: 0.6 }, { tpl: 'obj_tinyBuilding', dx: -30, dy: 40, scale: 0.9 }, { tpl: 'obj_tinyBuilding_jaune', dx: 26, dy: 42, scale: 0.85 }, { tpl: 'obj_rockGrey_small1{w}', dx: 34, dy: 24, scale: 0.7 }],
  falls:  [{ tpl: 'obj_rockGrey_large{w}', dx: -10, dy: 34, scale: 1.15 }, { tpl: 'obj_rockGrey_medium2{w}', dx: 28, dy: 18 }, { tpl: 'sea_wave_1', dx: 2, dy: 14, wave: true }, { tpl: 'obj_moss', dx: -28, dy: 20, seasons: ['spring'] }],
  cave:   [{ tpl: 'obj_rockGrey_large{w}', dx: 0, dy: 40, scale: 1.3 }, { tpl: 'obj_medieval_doorway', dx: 0, dy: 44, scale: 0.8 }, { tpl: 'obj_treePine_small_{s}', dx: -34, dy: 22 }, { tpl: 'obj_treePine_small_{s}', dx: 34, dy: 26 }],
  lagoon: [{ tpl: 'obj_rockBrown_small{w}', dx: -30, dy: 32 }, { tpl: 'sea_wave_2', dx: 8, dy: 6, wave: true }, { tpl: 'obj_bushGrass_dry', dx: 30, dy: 30 }],
};

/**
 * Décor des tuiles rares. Elles étaient jusqu'ici PRÉ-COMPOSÉES : une image de tuile complète, avec son
 * sol cuit dedans (`T("rare", "grass_05", …)` dans build_images.py) — un sol unique, sans variante de
 * saison. En hiver le marché gardait donc son herbe d'été au milieu de la neige, et son hexagone ne se
 * fondait avec aucune voisine. Les rares se dessinent maintenant comme tout le reste : le sol partagé,
 * qui suit la saison et déborde en fondu, plus leurs objets posés dessus.
 * Coordonnées en unités monde depuis le centre de la case.
 */
export const RARE_DECOR = {
  mill:       [{ tpl: 'obj_windmill_complete', dx: 0, dy: 22, scale: 0.85 }, { tpl: 'obj_sack', dx: -30, dy: 34, scale: 1.6 }, { tpl: 'obj_fence', dx: 34, dy: 30, scale: 0.8 }],
  chapel:     [{ tpl: 'obj_church', dx: 0, dy: 24, scale: 0.8 }, { tpl: 'obj_fence', dx: -34, dy: 32, scale: 0.75 }, { tpl: 'obj_treePine_small_{s}', dx: 36, dy: 12, scale: 0.75 }],
  watchtower: [{ tpl: 'obj_tower', dx: 0, dy: 26, scale: 0.75 }, { tpl: 'obj_wall_small', dx: -30, dy: 28, scale: 0.6 }, { tpl: 'obj_treePine_small_{s}', dx: 34, dy: 12, scale: 0.7 }],
  well:       [{ tpl: 'obj_well', dx: 0, dy: 20, scale: 1.3 }, { tpl: 'obj_fence', dx: -26, dy: 26, scale: 0.6 }, { tpl: 'obj_fence', dx: 26, dy: 26, scale: 0.6 }, { tpl: 'obj_bushGrass_{s}', dx: 32, dy: 8, scale: 0.8 }],
  camp:       [{ tpl: 'obj_campingTent', dx: -12, dy: 20 }, { tpl: 'obj_fire', dx: 24, dy: 24 }, { tpl: 'obj_logPile', dx: 26, dy: 38, scale: 0.9 }, { tpl: 'obj_treePine_small_{s}', dx: -32, dy: 34, scale: 0.7 }],
  ruins:      [{ tpl: 'obj_towerRuin', dx: -2, dy: 24, scale: 0.9 }, { tpl: 'obj_logPile', dx: -28, dy: 32, scale: 0.95 }, { tpl: 'obj_ruins_brick1', dx: 28, dy: 30, scale: 0.9 }],
  granary:    [{ tpl: 'obj_farm', dx: 0, dy: 26, scale: 0.85 }, { tpl: 'obj_silo1', dx: -32, dy: 20, scale: 0.9 }, { tpl: 'obj_sack', dx: 26, dy: 34, scale: 2.2 }, { tpl: 'obj_hay', dx: 32, dy: 14, scale: 0.8 }],
  fountain:   [{ tpl: 'obj_fountain', dx: 0, dy: 24 }, { tpl: 'obj_fence', dx: -30, dy: 26, scale: 0.6 }, { tpl: 'obj_fence', dx: 30, dy: 26, scale: 0.6 }],
  market:     [{ tpl: 'obj_shop', dx: 0, dy: 22 }, { tpl: 'obj_cart', dx: 30, dy: 36, scale: 0.8 }, { tpl: 'obj_crate', dx: -32, dy: 34, scale: 1.2 }, { tpl: 'obj_barrel', dx: -24, dy: 16, scale: 1.1 }],
  fete:       [{ tpl: 'obj_stage', dx: 0, dy: 24, scale: 0.8 }, { tpl: 'obj_barrel', dx: -30, dy: 32, scale: 1.2 }, { tpl: 'obj_barrel', dx: 30, dy: 34, scale: 1.1 }, { tpl: 'obj_banner', dx: -34, dy: 10, scale: 0.9 }],
  restore:    [{ tpl: 'obj_scaffolding', dx: 0, dy: 26, scale: 0.9 }, { tpl: 'obj_ladder', dx: 30, dy: 30, scale: 0.9 }, { tpl: 'obj_crate', dx: -32, dy: 34, scale: 1.2 }],
  tavern:     [{ tpl: 'obj_tavern', dx: 0, dy: 24, scale: 0.75 }, { tpl: 'obj_barrel', dx: -32, dy: 32, scale: 1.3 }, { tpl: 'obj_barrel', dx: 34, dy: 36, scale: 1.1 }],
  trough:     [{ tpl: 'obj_horseTrough', dx: 0, dy: 24, scale: 1.4 }, { tpl: 'obj_fence', dx: -30, dy: 26, scale: 0.6 }, { tpl: 'obj_fence', dx: 30, dy: 26, scale: 0.6 }, { tpl: 'obj_bushGrass_{s}', dx: 30, dy: 8, scale: 0.8 }],
  archway:    [{ tpl: 'obj_archway', dx: 0, dy: 24, scale: 0.95 }, { tpl: 'obj_wall_small', dx: -32, dy: 26, scale: 0.55 }, { tpl: 'obj_wall_small', dx: 32, dy: 26, scale: 0.55, flip: true }],
  mine:       [{ tpl: 'obj_mine', dx: 0, dy: 24 }, { tpl: 'obj_logPile', dx: -30, dy: 32 }, { tpl: 'obj_rockGrey_small2{w}', dx: 32, dy: 28, scale: 0.8 }],
  oven:       [{ tpl: 'obj_oven', dx: 0, dy: 24 }, { tpl: 'obj_logPile', dx: -30, dy: 32 }, { tpl: 'obj_sack', dx: 30, dy: 30, scale: 1.6 }],
};
/** Les rares qui portent un massif de fleurs au printemps et en été (les points d'eau du village). */
const RARE_FLEURIES = new Set(['well', 'fountain', 'trough']);
/** Un massif est toujours d'UNE SEULE couleur : une fleur isolée se lit comme une pastille d'interface. */
const FLEURS = ['obj_flowerWhite', 'obj_flowerRed', 'obj_flowerBlue', 'obj_flowerYellow'];

/** Décor des ouvrages posés sur une tuile. */
export const WORK_DECOR = {
  hive:      [{ tpl: 'obj_box2', dx: 18, dy: 20, scale: 0.7 }, { tpl: 'obj_flowerYellow', dx: 32, dy: 30 }, { tpl: 'obj_flowerWhite', dx: 6, dy: 30 }],
  scarecrow: [{ tpl: 'obj_pole', dx: 0, dy: 18, scale: 0.9 }, { tpl: 'obj_hay', dx: 0, dy: 26, scale: 0.6 }],
  nestbox:   [{ tpl: 'obj_tinyBuilding', dx: 24, dy: 4, scale: 0.55 }],
  campfire:  [{ tpl: 'obj_fire', dx: 0, dy: 22 }, { tpl: 'obj_log', dx: 22, dy: 30, scale: 0.8 }],
  menhir:    [{ tpl: 'obj_shrine', dx: 0, dy: 28 }],   // pierre gravée et bougies (KayKit EXTRA) : c'était une pierre TOMBALE de 24 px
  compost:   [{ tpl: 'obj_logPile', dx: 0, dy: 24, scale: 0.9 }, { tpl: 'obj_hay', dx: 22, dy: 30, scale: 0.7 }],
};

export function groundOf(t) {
  if (!t) return null;
  if (t.blighted) return t.family === 'water' ? 'sand' : 'dry';   // friche : sol sec ; lit asséché pour l'eau
  if (t.fusion) return FUSION_GROUND[t.family] || 'water';
  if (t.rare) return t.family === 'ruins' || t.family === 'mine' ? 'stone' : 'grass';
  if (t.family === 'meadow' && t.dry) return 'dry';
  if (t.family === 'water' && t.frozen) return 'ice';
  return { meadow: 'grass', forest: 'grass', field: 'field', hamlet: 'grass', orchard: 'grass', water: 'water', marsh: 'dirt', rock: 'stone', sand: 'sand', hill: 'hill', heath: 'heath' }[t.family] || 'grass';
}
export const groundKey = (g, season) => (g === 'dry' ? 'ground_dry' : g === 'ice' ? 'water_frozen' : `ground_${g}_${season}`);

/**
 * La cour d'un bourg. Un hameau isolé reste sur l'herbe ; dès deux, le sol est battu par le passage,
 * et il l'est davantage dans une petite ville. Le poids compte les niveaux et non les cases — un
 * hameau devenu village vaut deux.
 *
 * C'est de la terre, pas du pavé : le sol de roche avait été essayé en guise de pavage, mais c'est
 * une dalle bleu-gris semée de carrés clairs — sous des maisons chaudes, ça ne lisait ni pavé ni
 * sol, juste une tache froide. La terre battue dit la même chose (« ici on passe ») sans jurer.
 *
 * Ce n'est PAS le sol de la tuile : remplir l'hexagone donnait une grande dalle vide, avec une
 * couture franche contre l'herbe. C'est une COUR, un disque fondu sous CHAQUE bâtiment ; les disques
 * voisins se recouvrent, si bien que la terre est exactement là où elle doit être — entre les maisons.
 * @returns {{ r: number, a: number }|null} rayon et opacité de la cour, ou null pour un hameau isolé
 */
export function bourgCour(poids) {
  if (poids <= 1) return null;
  return poids <= 3 ? { r: 40, a: 0.5 } : { r: 48, a: 0.72 };
}

/** Pas de la trame du bâti des bourgs, en unités monde. */
const PAS = 34;
export const GROUND_COLORS = { dry: '#cdbb6a', ice: '#dbe9f4' };

function mulberry(seed) { let s = seed >>> 0 || 7; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const cellSeed = (seed, q, r, salt = 0) => ((seed * 73856093) ^ ((q + 512) * 19349663) ^ ((r + 512) * 83492791) ^ (salt * 2654435761)) >>> 0;

const PICK = (rng, list) => list[Math.floor(rng() * list.length)];

/** Couleur de toit d'une maison : ambre le plus souvent, vert ensuite, rouge en accent.
 *  Tirée du hasard de la case, donc toujours la même pour une case donnée. */
const ROOFS = ['_jaune', '_jaune', '_vert', ''];
const roof = (rng) => ROOFS[Math.floor(rng() * ROOFS.length)];

/** Un arbre n'est jamais deux fois le même : trois silhouettes, une taille tirée au sort et un
 *  miroir une fois sur deux. Tout vient du hasard de la case, donc la forêt ne bouge pas d'une
 *  partie à l'autre — elle est seulement moins alignée. */
const VAR = (rng) => ['', '2', '3'][Math.floor(rng() * 3)];
const VAR3 = (rng) => ['1', '2', '3'][Math.floor(rng() * 3)];
const wild = (rng, lo = 0.82, hi = 1.18) => ({ scale: lo + rng() * (hi - lo), flip: rng() < 0.5 });

export class Decor {
  constructor(seed = 1) { this.seed = seed; this.version = -1; this.objects = []; }

  /** Recalcule tous les objets si le plateau a changé. */
  sync(board) {
    if (this.version === board.version) return;
    this.version = board.version;
    this.water = classifyWater(board);
    this.bank = this.computeBanks(board);
    this.courts = [];                       // rempli par generate : les cours suivent le bâti des bourgs
    this.objects = this.generate(board);
  }

  /** Sol de rive de chaque tuile d'eau : le sol majoritaire de ses voisines de terre (herbe par défaut). */
  computeBanks(board) {
    const bank = new Map();
    const bankOf = (q, r, fallback) => { const counts = {}; for (const [a, b] of neighbors(q, r)) { const n = board.get(a, b); if (!n || Board.isFamily(n, 'water')) continue; let g = groundOf(n); if (g === 'ice' || g === 'water') continue; if (g === 'hill') g = 'grass'; if (g === 'dry') g = 'grass'; counts[g] = (counts[g] || 0) + 1; } return Object.keys(counts).sort((x, y) => counts[y] - counts[x])[0] || fallback; };
    for (const t of board.tiles.values()) { if (!Board.isFamily(t, 'water')) continue; bank.set(key(t.q, t.r), bankOf(t.q, t.r, 'grass')); }
    // lagunes : trous du masque entourés de six cases de l'île ; elles prennent une rive dès qu'une voisine est posée
    this.holes = [];
    const seen = new Set();
    for (const k of board.mask) { const [q, r] = k.split(',').map(Number); for (const [a, b] of neighbors(q, r)) { const hk = key(a, b); if (board.mask.has(hk) || seen.has(hk)) continue; seen.add(hk); if (neighbors(a, b).every(([x, y]) => board.mask.has(key(x, y)))) { const g = bankOf(a, b, null); if (g) { bank.set(hk, g); this.holes.push({ q: a, r: b, family: 'water', variant: 1, hole: true }); } } } }
    return bank;
  }

  /** Sol à dessiner pour une tuile (rive pour l'eau). */
  groundFor(t) { const g = groundOf(t); if (g === 'water' || g === 'ice') return (this.bank && this.bank.get(key(t.q, t.r))) || 'grass'; return g; }

  generate(board) {
    const out = [];
    const rule = board._rule || null;
    const add = (o) => { out.push(o); return o; };
    // Les chemins, rangés par case : le décor les connaît maintenant et ne pose plus rien au milieu
    // de la route (retour du commanditaire : « le chemin traverse tout sans dévier »).
    const chemins = pathPoints(board);
    const surChemin = (p, d = 13) => { const c = fromWorld(p.x, p.y); const pts = chemins.get(key(c.q, c.r)); if (!pts) return false; for (const o of pts) if (Math.hypot(o.x - p.x, o.y - p.y) < d) return true; return false; };
    const centroidOf = (reg) => { let x = 0, y = 0; for (const c of reg.cells) { const w = toWorld(c.q, c.r); x += w.x; y += w.y; } return { x: x / reg.cells.length, y: y / reg.cells.length }; };
    // outils de placement
    const inRegion = (p, keys) => { const c = fromWorld(p.x, p.y); const k = key(c.q, c.r); return keys.has(k) ? k : null; };
    const edgeOk = (p, k, keys, margin) => {
      const [q, r] = parse(k); const c = toWorld(q, r);
      for (let d = 0; d < 6; d++) {
        const nk = key(q + DIRS[d][0], r + DIRS[d][1]); if (keys.has(nk)) continue;
        const m = edgeMid(c.x, c.y, d); const nx = (m.x - c.x), ny = (m.y - c.y); const len = Math.hypot(nx, ny);
        if (((m.x - p.x) * nx + (m.y - p.y) * ny) / len < margin) return false;
      }
      return true;
    };
    // `yMin` / `yMax` : bornes verticales par rapport au centre de la case. yMin sert à garnir l'avant-plan —
    // un objet est dessiné AU-DESSUS de son point d'ancrage, donc sans lui le bas de l'hexagone reste nu.
    const sample = (rng, cell, keys, n, { minDist = 18, margin = 6, radius = 0.92, tries = 40, placed = [], yMax = Infinity, yMin = -Infinity } = {}) => {
      const c = toWorld(cell.q, cell.r); const pts = [];
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * SIZE * radius;
          const p = { x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr * 0.9 };
          if (p.y - c.y > yMax || p.y - c.y < yMin) continue;
          const k = inRegion(p, keys); if (!k || !edgeOk(p, k, keys, margin)) continue;
          if (placed.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < minDist) || pts.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < minDist)) continue;
          pts.push(p); break;
        }
      }
      return pts;
    };
    const L2 = (cell) => (cell.level || 1) >= 2;   // tuile bâtie : décor nettement plus dense
    const L3 = (cell) => (cell.level || 1) >= 3;   // niveau 3 : une pièce maîtresse au centre
    const LANDMARK = { forest: ['obj_treeRound_large2_{s}', 1.9], field: ['obj_silo1', 1.0], orchard: ['obj_treeRound_fruit_{s}', 1.8], meadow: ['obj_fence', 1.2], marsh: ['obj_bushGrass_{s}', 1.8], rock: ['obj_rockGrey_large{w}', 1.6], sand: ['obj_rockBrown_small{w}', 1.6], hill: ['obj_treePine_large_{s}', 1.4], heath: ['obj_heather_{s}', 1.8] };
    for (const t of board.tiles.values()) { if (!L3(t) || t.rare) continue; const lm = LANDMARK[t.family]; if (!lm) continue; const c = toWorld(t.q, t.r); add({ x: c.x, y: c.y + 30, tpl: lm[0], cell: key(t.q, t.r), scale: lm[1], alpha: 1, notSeasons: t.family === 'forest' ? ['spring'] : undefined }); if (t.family === 'forest') add({ x: c.x, y: c.y + 30, tpl: 'obj_treeRound_blossom_large2', cell: key(t.q, t.r), scale: lm[1], alpha: 1, seasons: ['spring'] }); }
    // croissance annoncée : une saison avant, la tuile porte en petit ce qu'elle va devenir (jeune pin, maisonnette, pousses)
    const SPROUT = { forest: ['obj_treePine_small_{s}', 0.85], orchard: ['obj_treeRound_small2_{s}', 0.8], hamlet: ['obj_house_small_jaune', 0.7], field: ['obj_crop_{s}', 0.75], meadow: ['obj_bushGrass_{s}', 0.85] };
    for (const t of board.tiles.values()) {
      if (!t.ripening || t.rare) continue; const sp = SPROUT[t.family]; if (!sp) continue;
      const c = toWorld(t.q, t.r); const rng = mulberry(cellSeed(this.seed, t.q, t.r, 11));
      for (let i = 0; i < 3; i++) add({ x: c.x + (i - 1) * 20 + (rng() - 0.5) * 6, y: c.y + 30 + (rng() - 0.5) * 6, tpl: sp[0], cell: key(t.q, t.r), scale: sp[1] * (0.85 + rng() * 0.3), alpha: 0.9, sprout: true });
    }
    /**
     * Distance d'un point au bord EXTÉRIEUR de sa région (Infinity s'il n'en longe aucun). Sert à faire
     * varier la densité dans une même région : un pré uniformément peuplé reste plat ; dense sur les
     * lisières et clair au milieu, on lit une clairière.
     */
    const distBord = (p, k, keys) => {
      const [q, r] = parse(k); const c = toWorld(q, r); let d = Infinity;
      for (let i = 0; i < 6; i++) {
        const nk = key(q + DIRS[i][0], r + DIRS[i][1]); if (keys.has(nk)) continue;
        const m = edgeMid(c.x, c.y, i); const nx = m.x - c.x, ny = m.y - c.y; const len = Math.hypot(nx, ny) || 1;
        d = Math.min(d, ((m.x - p.x) * nx + (m.y - p.y) * ny) / len);
      }
      return d;
    };
    // Une rivière qui ne rejoint ni la mer ni un lac s'arrêtait sur un bout rond en pleine plaine :
    // c'est le défaut qui trahit le plus vite que les cases ne se parlent pas. Elle passe maintenant
    // SOUS une roche — un ruisseau qui s'enfonce, ça se comprend sans un mot.
    for (const body of (this.water && this.water.bodies) || []) {
      if (body.kind !== 'river' || body.mouth || body.intoLake || !body.chain.length) continue;
      const k = body.chain[body.chain.length - 1]; const [q, r] = parse(k); const c = toWorld(q, r);
      const rng = mulberry(cellSeed(this.seed, q, r, 59));
      add({ x: c.x + (rng() - 0.5) * 12, y: c.y + 34, tpl: 'obj_rockGrey_large{w}', cell: k, scale: 1.15, alpha: 1, flip: rng() < 0.5 });
      add({ x: c.x - 26 + rng() * 8, y: c.y + 26, tpl: 'obj_rockGrey_medium2{w}', cell: k, scale: 0.8, alpha: 1 });
      add({ x: c.x + 24, y: c.y + 20, tpl: 'obj_bushGrass_{s}', cell: k, scale: 0.8, alpha: 1 });
    }
    const degreeOf = (cell, keys) => neighbors(cell.q, cell.r).filter(([a, b]) => keys.has(key(a, b))).length;
    const rareTiles = [];
    for (const t of board.tiles.values()) {
      if (!t.rare) continue; const c = toWorld(t.q, t.r);
      if (t.fusion) {
        // `FUSION_DECOR` est un tableau fixe : sans hasard de case, tous les forts de l'île sont
        // dessinés au pixel près identiques, et deux cases voisines affichent le même trio.
        const rg = mulberry(cellSeed(this.seed, t.q, t.r, 29)); const ck2 = key(t.q, t.r);
        for (const o of FUSION_DECOR[t.family] || []) add({ x: c.x + o.dx + (rg() - 0.5) * 7, y: c.y + o.dy + (rg() - 0.5) * 5, tpl: o.tpl, cell: ck2, scale: (o.scale || 1) * (0.93 + rg() * 0.14), alpha: o.alpha || 1, seasons: o.seasons, wave: o.wave, flip: o.wave ? false : rg() < 0.35 });
        continue;
      }
      const ck = key(t.q, t.r); const liste = RARE_DECOR[t.family];
      if (!liste) { add({ x: c.x, y: c.y + 26, tile: t, cell: ck, composed: true }); continue; }   // repli (pré sec)
      const rng = mulberry(cellSeed(this.seed, t.q, t.r, 23));
      for (const o of liste) add({ x: c.x + o.dx, y: c.y + o.dy, tpl: o.tpl, cell: ck, scale: (o.scale || 1) * (0.94 + rng() * 0.12), alpha: 1, flip: o.flip !== undefined ? o.flip : rng() < 0.35 });
      if (RARE_FLEURIES.has(t.family)) {
        for (let m = 0; m < 2; m++) {
          const tpl = PICK(rng, FLEURS), a = rng() * Math.PI * 2, rr = 26 + rng() * 14;
          const px = c.x + Math.cos(a) * rr, py = c.y + Math.sin(a) * rr * 0.7 + 16;
          for (let i = 0; i < 3; i++) add({ x: px + (rng() - 0.5) * 18, y: py + (rng() - 0.5) * 10, tpl, cell: ck, scale: 0.5 + rng() * 0.18, alpha: 1, seasons: ['spring', 'summer'], flip: rng() < 0.5 });
        }
      }
    }
    // friches : décor mort selon la famille d'origine (ruine, bois mort, lit asséché, herbes sèches)
    for (const t of board.tiles.values()) {
      if (!t.blighted) continue; const c = toWorld(t.q, t.r); const ck = key(t.q, t.r); const rng = mulberry(cellSeed(this.seed, t.q, t.r, 9));
      const push = (dx, dy, tpl, scale = 1) => add({ x: c.x + dx, y: c.y + dy, tpl, cell: ck, scale, alpha: 0.95 });
      if (t.family === 'hamlet') { push(-8, 30, 'obj_ruinsCorner', 1.0); push(26, 22, 'obj_ruins_brick1', 0.9); }
      else if (t.family === 'forest' || t.family === 'orchard') { push(-14, 28, 'obj_log', 1.0); push(20, 20, 'obj_logPile', 0.9); }
      else if (t.family === 'water') { push(-18, 26, 'obj_rockBrown_small', 0.9); push(18, 30, 'obj_rockBrown_small', 0.7); }
      else if (t.family === 'rock' || t.family === 'hill') { push(0, 34, 'obj_rockGrey_medium2', 0.9); }
      push(-26 + rng() * 10, 36, 'obj_bushGrass_dry', 0.9); push(24 + rng() * 8, 34, 'obj_bushGrass_dry', 0.8); push(6, 20, 'obj_bushGrass_dry', 0.7);
    }
    for (const t of board.tiles.values()) {
      if (!t.work) continue; const c = toWorld(t.q, t.r); const ck = key(t.q, t.r);
      const rg = mulberry(cellSeed(this.seed, t.q, t.r, 31));
      for (const o of WORK_DECOR[t.work] || []) add({ x: c.x + o.dx + (rg() - 0.5) * 7, y: c.y + o.dy + (rg() - 0.5) * 5, tpl: o.tpl, cell: ck, scale: (o.scale || 1) * (0.93 + rg() * 0.14), alpha: 1, flip: o.flip !== undefined ? o.flip : rg() < 0.4 });
    }

    // -------------------------------------------------------------------------
    // Les bords de chemin. Un caillou, une touffe, une flaque : rien qui ait de DIRECTION,
    // et c'est le point. Une barrière est un panneau dessiné sous un seul angle : elle tombe
    // en travers dès que le sentier tourne, et ces sprites sont des rendus 3D à lumière cuite,
    // qu'on ne peut pas faire pivoter. Un caillou, lui, se lit pareil de partout.
    // Tout petits (6 à 10 unités monde, soit 12 à 20 px à l'écran) et clairsemés : c'est une
    // accroche du regard le long du tracé, pas un décor de plus.
    // -------------------------------------------------------------------------
    const BORD = [
      { tpl: 'obj_rockGrey_small1{w}', sc: 0.3 }, { tpl: 'obj_rockGrey_small2{w}', sc: 0.28 },
      { tpl: 'obj_rockBrown_small{w}', sc: 0.36 }, { tpl: 'obj_bushGrass_{s}', sc: 0.42 },
      { tpl: 'obj_bush_{s}', sc: 0.3 }, { tpl: 'obj_flowerWhite', sc: 0.42, seasons: ['spring'] },
      { tpl: 'obj_flowerYellow', sc: 0.42, seasons: ['spring'] }, { tpl: 'obj_leafpile', sc: 0.34, seasons: ['autumn'] },
      { tpl: 'obj_snowdrift', sc: 0.34, seasons: ['winter'] },
    ];
    for (const sh of pathShapes(board)) {
      let reste = 12;
      for (let i = 0; i < sh.pts.length - 1; i++) {
        const a = sh.pts[i], b2 = sh.pts[i + 1];
        const vx = b2.x - a.x, vy = b2.y - a.y, len = Math.hypot(vx, vy); if (len < 0.001) continue;
        const ux = vx / len, uy = vy / len, nx = -uy, ny = ux;
        for (let d = reste; d < len; d += 22) {
          const rng = mulberry(cellSeed(this.seed, Math.round(a.x + ux * d), Math.round(a.y + uy * d), 53));
          if (rng() > 0.5) continue;
          const cote = rng() < 0.5 ? -1 : 1, ecart = 13 + rng() * 9;
          const p = { x: a.x + ux * d + nx * ecart * cote, y: a.y + uy * d + ny * ecart * cote + 3 };
          const c = fromWorld(p.x, p.y); const t = board.get(c.q, c.r);
          if (!t || Board.isFamily(t, 'water')) continue;     // pas de caillou sur l'eau
          const o = BORD[Math.floor(rng() * BORD.length)];
          add({ x: p.x, y: p.y, tpl: o.tpl, cell: key(c.q, c.r), scale: o.sc * (0.85 + rng() * 0.3), alpha: 1, seasons: o.seasons, flip: rng() < 0.5 });
        }
        reste = (reste - len) % 22; if (reste < 0) reste += 22;
      }
    }
    /**
     * Un massif de fleurs : printemps et été, elles ne passent pas l'automne. Toujours plusieurs têtes
     * serrées et d'UNE SEULE couleur — une fleur isolée, ou un mélange de couleurs, se lit comme une
     * pastille d'interface ; c'est le bouquet qui fait le jardin.
     */
    const fleurir = (p, ck, rng, n) => {
      const tpl = PICK(rng, FLEURS);
      for (let i = 0; i < n; i++) add({ x: p.x + (rng() - 0.5) * 19, y: p.y + (rng() - 0.5) * 11 + 4, tpl, cell: ck, scale: 0.5 + rng() * 0.18, alpha: 1, seasons: ['spring', 'summer'], flip: rng() < 0.5 });
    };

    // -------------------------------------------------------------------------
    // Les bourgs. Un village ne se compose pas case par case : tant que chaque tuile
    // plaçait ses maisons dans son coin, on lisait des fermes isolées, avec des paquets
    // d'un côté et des trous de l'autre. Le bâti se sème donc sur une TRAME GLOBALE,
    // la même pour toute l'île : un bourg, ce sont les points de la trame qui tombent
    // dedans. Poser un hameau de plus ne déplace rien, il ajoute des points ; fusionner
    // deux villages non plus. Le seuil de garde monte avec la taille du bourg, donc un
    // village qui devient une ville se DENSIFIE au lieu de se réorganiser.
    // Les bâtiments sont volontairement petits : la maisonnette (25 × 29 unités monde)
    // est l'ordinaire, la grande maison (63 × 91) l'exception — sinon trois maisons
    // remplissent l'hexagone et l'œil ne lit plus qu'un tas.
    // Tout ceci est du DESSIN : pour les règles, ce sont toujours N tuiles distinctes.
    // -------------------------------------------------------------------------
    for (const reg of board.regions('hamlet')) {
      const keys = reg.keys;
      let poids = 0; for (const c of reg.cells) poids += c.level || 1;
      const cour = bourgCour(poids);
      const garde = poids <= 1 ? 0.30 : poids <= 3 ? 0.52 : 0.72;
      const cen = centroidOf(reg);
      const closed = board.regionPaid(reg);
      const hasRare = reg.cells.some((c) => c.rare && (c.family === 'fountain' || c.family === 'chapel' || c.family === 'well'));
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const c of reg.cells) { const w = toWorld(c.q, c.r); x0 = Math.min(x0, w.x); x1 = Math.max(x1, w.x); y0 = Math.min(y0, w.y); y1 = Math.max(y1, w.y); }
      const bati = [];
      for (let i = Math.floor((x0 - SIZE) / PAS); i <= Math.ceil((x1 + SIZE) / PAS); i++) {
        for (let j = Math.floor((y0 - SIZE) / PAS); j <= Math.ceil((y1 + SIZE) / PAS); j++) {
          const rng = mulberry(cellSeed(this.seed, i, j, 41));
          const p = { x: i * PAS + (rng() - 0.5) * PAS * 0.6, y: j * PAS + (rng() - 0.5) * PAS * 0.6 };
          const ck = inRegion(p, keys); if (!ck) continue;
          const [cq, cr] = parse(ck); const cell = board.get(cq, cr);
          if (!cell || cell.rare || cell.blighted) continue;
          if (!edgeOk(p, ck, keys, 9)) continue;      // rien ne déborde sur le champ d'à côté
          if (surChemin(p, 15)) continue;             // la rue reste libre
          const gros = (cell.level || 1) >= 2;
          if (rng() > garde + (gros ? 0.14 : 0)) continue;
          bati.push({ p, ck, rng, gros });
        }
      }
      // la pièce maîtresse : le point le plus proche du cœur du bourg (le seul qui bouge quand il grandit)
      let coeur = null, bd = Infinity;
      for (const b of bati) { const d = Math.hypot(b.p.x - cen.x, b.p.y - cen.y); if (d < bd) { bd = d; coeur = b; } }
      for (const b of bati) {
        const { p, ck, rng, gros } = b; const r = rng(); const w = wild(rng, 0.9, 1.06);
        const met = (tpl, sc, extra) => add(Object.assign({ x: p.x, y: p.y, tpl, cell: ck, scale: (w.scale || 1) * sc, alpha: 1, flip: w.flip }, extra));
        // la cour ne se met que sous ce qui est bâti : un jardin reste sur l'herbe, c'est lui qui aère le bourg
        const pave = () => { if (cour) this.courts.push({ x: p.x, y: p.y - 4, r: cour.r * (0.9 + rng() * 0.25), a: cour.a, cell: ck }); };
        if (b === coeur && !hasRare) {
          pave();
          if (poids >= 3) met('obj_townhall', 0.85); else met('obj_well', 1);
          add({ x: p.x + 24, y: p.y - 4, tpl: 'obj_banner', cell: ck, scale: 0.78, alpha: 1, seasons: ['summer'], notRules: ['foire'] });
          add({ x: p.x + 24, y: p.y - 4, tpl: 'obj_banner', cell: ck, scale: 0.78, alpha: 1, rules: ['foire'] });
          if (closed) add({ x: p.x - 26, y: p.y - 2, tpl: 'obj_lightpost', cell: ck, scale: 0.8, alpha: 1 });
          continue;
        }
        if (r < 0.82) pave();
        if (r < 0.44) met(`obj_tinyBuilding${roof(rng)}`, 1);
        else if (r < 0.66) met(`obj_house_small${roof(rng)}`, 0.78);
        else if (r < 0.74) met(gros ? `obj_house${roof(rng)}` : `obj_house_small${roof(rng)}`, gros ? 0.62 : 0.86);
        else if (r < 0.80) met(rng() < 0.5 ? 'obj_workshop' : `obj_villa${roof(rng)}`, 0.7);
        else if (r < 0.82) {
          // les annexes : ce sont elles qui font la cour, pas la façade
          const q = rng();
          if (q < 0.26) met('obj_logPile', 0.8);
          else if (q < 0.46) met('obj_hay', 0.7);
          else if (q < 0.62) met('obj_basket', 0.8);
          else if (q < 0.78) met('obj_cart', 0.7);
          else if (q < 0.9) met('obj_well', 0.8);
          else met('obj_fence', 0.85);
          if (rng() < 0.4) add({ x: p.x + 12, y: p.y + 6, tpl: 'obj_logPile', cell: ck, scale: 0.7, alpha: 1, rules: ['froid'] });
        } else {
          // Les jardins : ce sont les trouées vertes qui empêchent le bourg de faire bloc. Un arbre de
          // village n'est pas un arbre de forêt — il est plus petit, et un sur quatre est un fruitier.
          const j = rng();
          if (j < 0.30) { const bl = rng() < 0.4; met('obj_treeRound_small_{s}', 0.8, { notSeasons: bl ? ['spring'] : null }); if (bl) met(`obj_treeRound_blossom${VAR(rng)}`, 0.8, { seasons: ['spring'] }); }
          else if (j < 0.48) met('obj_treeRound_small2_{s}', 0.78);
          else if (j < 0.62) met('obj_treeRound_fruit_{s}', 0.72);
          else if (j < 0.72) met('obj_treePine_small_{s}', 0.7);
          else { met('obj_bush_{s}', 0.85); fleurir(p, ck, rng, 4); }
        }
      }
      // Fleurs et touffes entre les maisons, semées À PART de la trame : sur la trame elles se
      // rangeraient sagement comme les bâtiments, alors qu'un jardin déborde. Elles évitent le bâti
      // (qui leur sert d'obstacle) et la rue.
      const poses = bati.map((b) => b.p);
      for (const cell of reg.cells) {
        if (cell.rare || cell.blighted) continue;
        const ck = key(cell.q, cell.r); const rng = mulberry(cellSeed(this.seed, cell.q, cell.r, 47));
        for (const g of sample(rng, cell, keys, 3 + Math.floor(rng() * 3), { minDist: 22, margin: 12, radius: 0.9, placed: poses })) {
          if (surChemin(g, 13)) continue;
          if (rng() < 0.5) fleurir(g, ck, rng, 3 + Math.floor(rng() * 3));
          else add({ x: g.x, y: g.y, tpl: 'obj_bushGrass_{s}', cell: ck, scale: 0.55 + rng() * 0.2, alpha: 1, flip: rng() < 0.5 });
        }
      }
    }
    for (const family of ['forest', 'meadow', 'field', 'orchard', 'water', 'marsh', 'rock', 'sand', 'hill', 'heath']) {
      for (const reg of board.regions(family)) {
        const keys = reg.keys; const cen = centroidOf(reg);
        // la route occupe la place : on la verse dans les obstacles avant de semer quoi que ce soit
        const placed = []; for (const k of keys) for (const p of chemins.get(k) || []) placed.push(p);
        const closed = board.regionPaid(reg);
        const cells = reg.cells.filter((c) => !c.rare);
        // cellule « centrale » (village)
        let center = null, bd = Infinity;
        for (const c of cells) { const w = toWorld(c.q, c.r); const d = Math.hypot(w.x - cen.x, w.y - cen.y); if (d < bd) { bd = d; center = c; } }
        const hasRareCenter = reg.cells.some((c) => c.rare && (c.family === 'fountain' || c.family === 'chapel' || c.family === 'well'));
        for (const cell of cells) {
          const ck = key(cell.q, cell.r); const rng = mulberry(cellSeed(this.seed, cell.q, cell.r, 1));
          const c = toWorld(cell.q, cell.r); const deg = degreeOf(cell, keys);
          const push = (p, tpl, extra = {}) => add(Object.assign({ x: p.x, y: p.y, tpl, cell: ck }, extra));
          if (family === 'forest') {
            const n = Math.round((16 + deg * 2.2) * (L2(cell) ? 1.7 : 1));
            for (const p of sample(rng, cell, keys, n, { minDist: L2(cell) ? 7 : 9, margin: 4, radius: 1.0, placed, tries: 30 })) {
              placed.push(p); const r = rng(); const w = wild(rng); const v = VAR(rng);
              if (r < 0.28) push(p, `obj_treePine_large${v === '3' ? '2' : ''}_{s}`, w);
              else if (r < 0.52) push(p, `obj_treePine_small${v === '3' ? '2' : ''}_{s}`, w);
              else if (r < 0.78) { const bl = rng() < 0.3; push(p, `obj_treeRound_large${v}_{s}`, Object.assign({ notSeasons: bl ? ['spring'] : null, tag: 'rl' }, w)); if (bl) push(p, `obj_treeRound_blossom_large${v}`, Object.assign({ seasons: ['spring'] }, w)); }
              else { const bl = rng() < 0.35; push(p, `obj_treeRound_small${v}_{s}`, Object.assign({ notSeasons: bl ? ['spring'] : null }, w)); if (bl) push(p, `obj_treeRound_blossom${v}`, Object.assign({ seasons: ['spring'] }, w)); }
            }
            // sous-bois : ce sont les buissons entre les troncs qui font qu'une forêt respire
            for (const p of sample(rng, cell, keys, L2(cell) ? 5 : 3, { minDist: 14, margin: 6, placed: [] })) push(p, rng() < 0.5 ? 'obj_bush_{s}' : 'obj_bush2_{s}', wild(rng, 0.75, 1.25));
            for (const p of sample(rng, cell, keys, 2, { minDist: 20, margin: 8, placed: [] })) push(p, 'obj_leafpile', { seasons: ['autumn'], alpha: 0.95 });
            for (const p of sample(rng, cell, keys, 1, { minDist: 20, margin: 8, placed: [] })) push(p, 'obj_snowdrift', { seasons: ['winter'] });
          } else if (family === 'meadow') {
            if (cell.dry) { for (const p of sample(rng, cell, keys, 4, { minDist: 22, margin: 8, placed })) { placed.push(p); push(p, 'obj_bushGrass_dry', wild(rng, 0.8, 1.15)); } continue; }
            // Un pré portait deux touffes et une fleur : un hexagone vert et plat, à côté d'une forêt
            // qui en porte trente. On le peuple vraiment — mais avec des choses BASSES, et surtout avec
            // une densité qui varie dans la région : dense sur les lisières, clair au milieu (cf. distBord).
            for (const p of sample(rng, cell, keys, L2(cell) ? 22 : 16, { minDist: 15, margin: 5, placed, radius: 1.0, tries: 26 })) {
              const d = distBord(p, ck, keys);
              if (rng() > Math.max(0.3, Math.min(0.92, 0.95 - d / 110))) continue;
              placed.push(p); const r2 = rng(); const w = wild(rng, 0.85, 1.15);
              if (r2 < 0.40) push(p, 'obj_bushGrass_{s}', w);
              else if (r2 < 0.56) push(p, rng() < 0.5 ? 'obj_bush_{s}' : 'obj_bush2_{s}', Object.assign({ scale: (w.scale || 1) * 0.8 }, { flip: w.flip }));
              else if (r2 < 0.74) fleurir(p, ck, rng, 3);
              else if (r2 < 0.83) push(p, `obj_rockGrey_small${VAR3(rng)}{w}`, Object.assign({ scale: (w.scale || 1) * 0.45 }, { flip: w.flip }));
              else if (r2 < 0.89) push(p, 'obj_log', Object.assign({ scale: (w.scale || 1) * 0.8 }, { flip: w.flip }));
              // haie et arbre isolé : seulement en lisière, là où un pré s'arrête vraiment
              else if (d < 26) push(p, rng() < 0.55 ? 'obj_hedge_{s}' : 'obj_treeRound_small_{s}', { scale: (w.scale || 1) * 0.62, flip: w.flip });
              else push(p, 'obj_bushGrass_{s}', Object.assign({ scale: (w.scale || 1) * 0.8 }, { flip: w.flip }));
            }
            if (rng() < 0.5) for (const p of sample(rng, cell, keys, 1, { minDist: 28, margin: 12, placed })) { placed.push(p); push(p, 'obj_hay', { seasons: ['autumn'] }); }
            for (const p of sample(rng, cell, keys, 2, { minDist: 24, margin: 10, placed: [] })) push(p, 'obj_leafpile', { seasons: ['autumn'], alpha: 0.9 });
            for (const p of sample(rng, cell, keys, 2, { minDist: 26, margin: 10, placed: [] })) push(p, 'obj_snowdrift', { seasons: ['winter'] });
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 12, placed: [] })) push(p, 'obj_puddle', { weathers: ['storm'] });
          } else if (family === 'field') {
            // rangs de culture alignés sur une grille commune à la région (les sillons se prolongent d'une tuile à l'autre)
            const sx = L2(cell) ? 14 : 19, sy = L2(cell) ? 11 : 14, ox = (reg.id.length * 5) % sx, oy = (reg.id.length * 3) % sy;
            const x0 = Math.floor((c.x - 70 - ox) / sx) * sx + ox, y0 = Math.floor((c.y - 80 - oy) / sy) * sy + oy;
            for (let y = y0; y < c.y + 80; y += sy) for (let x = x0 + ((Math.round((y - oy) / sy) % 2) ? sx / 2 : 0); x < c.x + 70; x += sx) {
              const p = { x: x + (rng() - 0.5) * 3, y: y + (rng() - 0.5) * 2 };
              if (inRegion(p, keys) !== ck || !edgeOk(p, ck, keys, 5)) continue;
              if (surChemin(p, 11)) continue;   // on ne sème pas au milieu du chemin
              push(p, 'obj_crop_{s}');
            }
            // deux silhouettes de récolte, tirées au sort : la meule conique et la botte ronde du pack EXTRA
            const botte = () => (rng() < 0.5 ? 'obj_hay' : 'obj_haybale');
            if (rng() < 0.45) for (const p of sample(rng, cell, keys, 1, { minDist: 30, margin: 12, placed, radius: 0.7 })) { placed.push(p); push(p, botte(), wild(rng, 0.9, 1.1)); }
            for (const p of sample(rng, cell, keys, L2(cell) ? 2 : 1, { minDist: 30, margin: 12, placed, radius: 0.75 })) { placed.push(p); push(p, botte(), Object.assign({ seasons: ['autumn'] }, wild(rng, 0.9, 1.1))); }
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 12, placed: [] })) push(p, 'obj_puddle', { weathers: ['storm'] });
          } else if (family === 'orchard') {
            const sx = L2(cell) ? 27 : 36, sy = L2(cell) ? 25 : 33, ox = (reg.id.length * 7) % sx, oy = (reg.id.length * 11) % sy;
            const x0 = Math.floor((c.x - 70 - ox) / sx) * sx + ox, y0 = Math.floor((c.y - 80 - oy) / sy) * sy + oy;
            for (let y = y0; y < c.y + 80; y += sy) for (let x = x0 + ((Math.round((y - oy) / sy) % 2) ? sx / 2 : 0); x < c.x + 70; x += sx) {
              const p = { x: x + (rng() - 0.5) * 6, y: y + (rng() - 0.5) * 6 };
              if (inRegion(p, keys) !== ck || !edgeOk(p, ck, keys, 9)) continue;
              // au printemps, tous les arbres ne fleurissent pas en même temps : deux sur trois
              const w = wild(rng, 0.9, 1.1); const fleurit = rng() < 0.66;
              push(p, 'obj_treeRound_fruit_{s}', Object.assign({ notSeasons: fleurit ? ['spring'] : null }, w));
              if (fleurit) push(p, `obj_treeRound_blossom${VAR(rng)}`, Object.assign({ seasons: ['spring'] }, w));
            }
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 12, placed: [] })) push(p, 'obj_basket', { seasons: ['autumn'] });
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 12, placed: [] })) push(p, 'obj_leafpile', { seasons: ['autumn'], alpha: 0.9 });
          } else if (family === 'water') {
            if (cell.frozen) continue;
            const body = this.water.get(ck); if (!body) continue;
            if (body.kind !== 'river') for (const p of sample(rng, cell, keys, body.kind === 'pond' ? 1 : 2, { minDist: 26, margin: body.kind === 'pond' ? 30 : 22, placed: [] })) push(p, 'obj_lily', { seasons: ['summer'], alpha: 0.95 });
            if (body.kind === 'pond' || body.kind === 'river') continue;
            for (const p of sample(rng, cell, keys, deg >= 3 ? 2 : 1, { minDist: 34, margin: 22, placed })) { placed.push(p); push(p, PICK(rng, ['sea_wave_1', 'sea_wave_2', 'sea_wave_3']), { alpha: 0.6, wave: true }); }
          } else if (family === 'marsh') {
            for (const p of sample(rng, cell, keys, 2, { minDist: 30, margin: 12, placed })) { placed.push(p); push(p, 'obj_puddle{w}'); }
            for (const p of sample(rng, cell, keys, L2(cell) ? 7 : 3, { minDist: L2(cell) ? 11 : 15, margin: 5, placed })) { placed.push(p); push(p, 'obj_bushGrass_{s}'); }
            // les massettes du pack : un vrai volume au milieu des touffes recolorées
            for (const p of sample(rng, cell, keys, L2(cell) ? 4 : 2, { minDist: 16, margin: 6, placed })) { placed.push(p); push(p, PICK(rng, ['obj_waterplant1', 'obj_waterplant2', 'obj_waterplant3']), wild(rng, 0.85, 1.2)); }
            for (const p of sample(rng, cell, keys, 2, { minDist: 18, margin: 8, placed })) { placed.push(p); push(p, PICK(rng, ['obj_flowerWhite', 'obj_flowerBlue']), { seasons: ['spring'] }); }
            for (const p of sample(rng, cell, keys, 2, { minDist: 18, margin: 8, placed: [] })) push(p, 'obj_bushGrass_dry', { weathers: ['heat'] });
          } else if (family === 'rock') {
            // Un massif, c'est de la pierre partout, pas un caillou au milieu d'un hexagone vide (retour du commanditaire).
            // Trois couches : le sommet qui donne la silhouette, les crêtes à cheval sur les arêtes communes pour que
            // la montagne ne s'arrête pas au bord de la case, et l'éboulis qui remplit le reste jusqu'aux bords.
            const dc = Math.hypot(c.x - cen.x, c.y - cen.y);
            const seul = cells.length === 1;
            const peak = !seul && (deg >= 3 || dc < 40);
            push({ x: c.x + (rng() - 0.5) * 12, y: c.y + (seul ? 38 : 44) }, peak || seul ? `obj_rockGrey_large${VAR(rng)}{w}` : PICK(rng, ['obj_rockGrey_medium1{w}', 'obj_rockGrey_medium2{w}', 'obj_rockGrey_medium3{w}']),
              Object.assign(wild(rng, 0.9, 1.1), { scale: (seul ? 1.0 : peak ? 1.35 + Math.min(0.5, cells.length * 0.06) : 1.15) + (L2(cell) ? 0.35 : 0) }));
            if (!seul) for (let d = 0; d < 6; d++) { const nk = key(cell.q + DIRS[d][0], cell.r + DIRS[d][1]); if (!keys.has(nk) || d >= 3) continue; const m = edgeMid(c.x, c.y, d); push({ x: m.x + (rng() - 0.5) * 10, y: m.y + 26 }, PICK(rng, ['obj_rockGrey_medium2{w}', 'obj_rockGrey_medium3{w}', `obj_rockGrey_large${VAR(rng)}{w}`]), Object.assign(wild(rng, 0.9, 1.15), { scale: 1.05 })); }
            // éboulis : deux passes, les blocs moyens d'abord (espacés), puis les pierres qui comblent les creux
            const blocs = Math.round((seul ? 5 : 5 + deg * 0.5) * (L2(cell) ? 1.5 : 1));
            for (const p of sample(rng, cell, keys, blocs, { minDist: 24, margin: 5, radius: 1.0, tries: 40, placed })) {
              placed.push(p); push(p, PICK(rng, ['obj_rockGrey_medium1{w}', 'obj_rockGrey_medium2{w}', 'obj_rockGrey_medium3{w}']), Object.assign(wild(rng, 0.8, 1.15), { scale: 0.92 }));
            }
            const pierres = Math.round((seul ? 12 : 11 + deg * 1.2) * (L2(cell) ? 1.4 : 1));
            for (const p of sample(rng, cell, keys, pierres, { minDist: 12, margin: 3, radius: 1.0, tries: 40, placed: [] })) {
              push(p, PICK(rng, ['obj_rockGrey_small1{w}', 'obj_rockGrey_small2{w}', 'obj_rockGrey_small3{w}', 'obj_rockGrey_small4{w}']), wild(rng, 0.8, 1.35));
            }
            // l'avant-plan : sans ça, le bas de l'hexagone reste vide, les pierres étant dessinées vers le haut
            for (const p of sample(rng, cell, keys, seul ? 4 : 3, { minDist: 14, margin: 3, radius: 1.0, tries: 40, yMin: 8, placed: [] })) {
              push(p, PICK(rng, ['obj_rockGrey_small1{w}', 'obj_rockGrey_small2{w}', 'obj_rockGrey_small3{w}', 'obj_rockGrey_small4{w}']), wild(rng, 0.85, 1.35));
            }
            for (const p of sample(rng, cell, keys, 1, { minDist: 22, margin: 8, placed: [] })) push(p, 'obj_moss', { seasons: ['spring'] });
          } else if (family === 'sand') {
            // Le sable était le dernier grand vide : un aplat beige avec un caillou une fois sur trois.
            // Même recette que les prés — densité forte en lisière, claire au milieu — mais avec ce qui
            // se trouve sur une plage : bois flotté, oyats, galets, coquilles, et des rides de sable.
            for (const p of sample(rng, cell, keys, L2(cell) ? 15 : 11, { minDist: 17, margin: 6, placed, radius: 1.0, tries: 24 })) {
              const d = distBord(p, ck, keys);
              if (rng() > Math.max(0.28, Math.min(0.9, 0.92 - d / 105))) continue;
              placed.push(p); const r2 = rng(); const w = wild(rng, 0.85, 1.15);
              if (r2 < 0.30) push(p, 'obj_bushGrass_dry', Object.assign({ scale: (w.scale || 1) * 0.85 }, { flip: w.flip }));            // oyats
              else if (r2 < 0.52) push(p, `obj_rockBrown_small{w}`, Object.assign({ scale: (w.scale || 1) * 0.5 }, { flip: w.flip }));   // galets
              else if (r2 < 0.66) push(p, `obj_rockGrey_small${VAR3(rng)}{w}`, Object.assign({ scale: (w.scale || 1) * 0.42 }, { flip: w.flip }));
              else if (r2 < 0.76) push(p, 'obj_log', Object.assign({ scale: (w.scale || 1) * 0.7 }, { flip: w.flip }));                  // bois flotté
              else if (r2 < 0.86) push(p, 'obj_bushGrass_dry', Object.assign({ scale: (w.scale || 1) * 1.05 }, { flip: w.flip }));
              else if (d < 24) push(p, 'obj_logPile', { scale: (w.scale || 1) * 0.6, flip: w.flip });
              else push(p, 'obj_bushGrass_dry', Object.assign({ scale: (w.scale || 1) * 0.6 }, { flip: w.flip }));
            }
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 12, placed: [] })) push(p, 'obj_puddle', { weathers: ['storm'] });
          } else if (family === 'hill') {
            for (const p of sample(rng, cell, keys, L2(cell) ? 5 : 2, { minDist: L2(cell) ? 18 : 26, margin: 12, placed, yMax: 8, radius: 0.7 })) { placed.push(p); push(p, PICK(rng, ['obj_treePine_small_{s}', 'obj_treeRound_small_{s}', 'obj_bushGrass_{s}'])); }
            for (const p of sample(rng, cell, keys, 2, { minDist: 22, margin: 12, placed: [], yMax: 8, radius: 0.7 })) push(p, PICK(rng, ['obj_flowerYellow', 'obj_flowerBlue']), { seasons: ['spring'] });
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 12, placed: [], yMax: 8, radius: 0.7 })) push(p, 'obj_snowdrift', { seasons: ['winter'] });
          } else if (family === 'heath') {
            // La bruyère poussait en solitaires régulièrement espacées : on la met en TOUFFES, et on
            // sème entre elles ce qui fait une lande — cailloux affleurants, ajoncs, herbe rase.
            for (const p of sample(rng, cell, keys, L2(cell) ? 18 : 13, { minDist: 15, margin: 5, placed, radius: 1.0, tries: 26 })) {
              const d = distBord(p, ck, keys);
              if (rng() > Math.max(0.35, Math.min(0.95, 1 - d / 120))) continue;
              placed.push(p); const r2 = rng(); const w = wild(rng, 0.85, 1.15);
              if (r2 < 0.56) { const n = 1 + Math.floor(rng() * 3); for (let i = 0; i < n; i++) push({ x: p.x + (rng() - 0.5) * 22, y: p.y + (rng() - 0.5) * 13 }, 'obj_heather_{s}', wild(rng, 0.8, 1.1)); }
              else if (r2 < 0.72) push(p, `obj_rockGrey_small${VAR3(rng)}{w}`, Object.assign({ scale: (w.scale || 1) * 0.55 }, { flip: w.flip }));
              else if (r2 < 0.86) push(p, rng() < 0.5 ? 'obj_bush_{s}' : 'obj_bush2_{s}', Object.assign({ scale: (w.scale || 1) * 0.78 }, { flip: w.flip }));
              else if (d < 26) push(p, 'obj_rockGrey_medium2{w}', { scale: (w.scale || 1) * 0.6, flip: w.flip });
              else push(p, 'obj_bushGrass_{s}', Object.assign({ scale: (w.scale || 1) * 0.75 }, { flip: w.flip }));
            }
            for (const p of sample(rng, cell, keys, 2, { minDist: 26, margin: 10, placed: [] })) push(p, 'obj_snowdrift', { seasons: ['winter'] });
          }
          // bourrasque : congères sur toutes les tuiles de terre
          if (family !== 'water') for (const p of sample(rng, cell, keys, 1, { minDist: 30, margin: 12, placed: [] })) push(p, 'obj_snowdrift', { weathers: ['blizzard'] });
        }
      }
    }
    out.sort((a, b) => a.y - b.y);
    return out;
  }
}

/** Clé d'image d'un objet pour une saison. */
export function spriteKey(tpl, season) { return tpl.replace('{s}', season).replace('{w}', season === 'winter' ? '_winter' : ''); }
