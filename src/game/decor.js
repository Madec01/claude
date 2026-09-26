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
  farm:   [{ tpl: 'obj_farm', dx: 0, dy: 30 }, { tpl: 'obj_silo1', dx: -34, dy: 22 }, { tpl: 'obj_haybale', dx: 30, dy: 12 }, { tpl: 'obj_wheelbarrow', dx: 8, dy: 46, scale: 0.9 }, { tpl: 'obj_crop_{s}', dx: -28, dy: 44 }],
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
  mill:       [{ tpl: 'obj_windmill_complete', dx: 0, dy: 22, scale: 0.85 }, { tpl: 'obj_sack', dx: -30, dy: 34, scale: 1 }, { tpl: 'obj_barrel', dx: 34, dy: 30, scale: 1 }],
  chapel:     [{ tpl: 'obj_church', dx: 0, dy: 24, scale: 0.8 }, { tpl: 'obj_treePine_small_{s}', dx: -34, dy: 32, scale: 0.6 }, { tpl: 'obj_treePine_small_{s}', dx: 36, dy: 12, scale: 0.75 }],
  watchtower: [{ tpl: 'obj_tower', dx: 0, dy: 26, scale: 0.75 }, { tpl: 'obj_wall_small', dx: -30, dy: 28, scale: 0.6 }, { tpl: 'obj_treePine_small_{s}', dx: 34, dy: 12, scale: 0.7 }],
  well:       [{ tpl: 'obj_well', dx: 0, dy: 20, scale: 1.3 }, { tpl: 'obj_tallGrass_{s}', dx: -28, dy: 28, scale: 0.9 }, { tpl: 'obj_bushGrass_{s}', dx: 32, dy: 8, scale: 0.8 }],
  camp:       [{ tpl: 'obj_tent', dx: -12, dy: 22 }, { tpl: 'obj_fire', dx: 24, dy: 24 }, { tpl: 'obj_logPile', dx: 26, dy: 38, scale: 0.9 }, { tpl: 'obj_treePine_small_{s}', dx: -32, dy: 34, scale: 0.7 }],
  ruins:      [{ tpl: 'obj_towerRuin', dx: -2, dy: 24, scale: 0.9 }, { tpl: 'obj_logPile', dx: -28, dy: 32, scale: 0.95 }, { tpl: 'obj_ruins_brick1', dx: 28, dy: 30, scale: 0.9 }],
  hive:       [{ tpl: 'obj_box2', dx: 0, dy: 22, scale: 0.9 }, { tpl: 'obj_box2', dx: -26, dy: 30, scale: 0.75 }, { tpl: 'obj_flowerYellow', dx: 26, dy: 30 }, { tpl: 'obj_flowerWhite', dx: 16, dy: 38 }, { tpl: 'obj_flowerYellow', dx: -8, dy: 40 }],
  menhir:     [{ tpl: 'obj_shrine', dx: 0, dy: 26, scale: 1.25 }, { tpl: 'obj_rockGrey_small2{w}', dx: -30, dy: 32, scale: 0.8 }, { tpl: 'obj_rockGrey_small1{w}', dx: 30, dy: 34, scale: 0.7 }],   // pierre gravée et bougies (KayKit EXTRA)
  granary:    [{ tpl: 'obj_farm', dx: 0, dy: 26, scale: 0.85 }, { tpl: 'obj_silo1', dx: -32, dy: 20, scale: 0.9 }, { tpl: 'obj_sack', dx: 26, dy: 34, scale: 1 }, { tpl: 'obj_crate', dx: 34, dy: 36, scale: 0.85 }, { tpl: 'obj_haybale', dx: 32, dy: 14, scale: 0.9 }],
};
/** Les rares qui portent un massif de fleurs au printemps et en été (les points d'eau du village). */
const RARE_FLEURIES = new Set(['well']);
/** Un massif est toujours d'UNE SEULE couleur : une fleur isolée se lit comme une pastille d'interface. */
const FLEURS = ['obj_flowerWhite', 'obj_flowerRed', 'obj_flowerBlue', 'obj_flowerYellow'];


export function groundOf(t) {
  if (!t) return null;
  if (t.blighted) return t.family === 'water' ? 'sand' : 'dry';   // friche : sol sec ; lit asséché pour l'eau
  if (t.fusion) return FUSION_GROUND[t.family] || 'water';
  if (t.rare) return t.family === 'ruins' || t.family === 'menhir' ? 'stone' : 'grass';
  if (t.family === 'meadow' && t.dry) return 'dry';
  if (t.family === 'water' && t.frozen) return 'ice';
  // la colline est de l'herbe : son relief est un objet posé dessus (journal 102), plus un sol surélevé
  return { meadow: 'grass', forest: 'grass', field: 'field', hamlet: 'grass', orchard: 'grass', water: 'water', marsh: 'dirt', rock: 'stone', sand: 'sand', hill: 'grass', heath: 'heath' }[t.family] || 'grass';
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

/**
 * « Un des points de `liste` est-il à moins de `dmin` de `p` ? » — exactement `liste.some(o => Math.hypot(…) < dmin)`,
 * mais sans parcourir toute la liste. Les obstacles d'une région (la route, les arbres déjà posés) se comptent par
 * centaines dans une grande forêt, et `sample` les passait tous en revue à chaque essai : c'était le premier poste de
 * la reconstruction du décor sur les grandes îles. Au-delà d'une vingtaine de points, la liste est rangée dans une
 * grille (cases de GRILLE unités monde), tenue à jour au fil des `push` — les listes d'obstacles ne font que grandir.
 * Le test final reste le même `Math.hypot(…) < dmin` : la grille ne fait qu'écarter les points trop loin pour compter.
 */
const GRILLE = 32;
const grilles = new WeakMap();
const cleGrille = (i, j) => (i + 32768) * 65536 + (j + 32768);
function proche(liste, p, dmin) {
  if (liste.length < 24) { for (const o of liste) if (Math.hypot(o.x - p.x, o.y - p.y) < dmin) return true; return false; }
  let g = grilles.get(liste); if (!g) grilles.set(liste, (g = { n: 0, cases: new Map() }));
  for (; g.n < liste.length; g.n++) {
    const o = liste[g.n]; const k = cleGrille(Math.floor(o.x / GRILLE), Math.floor(o.y / GRILLE));
    const l = g.cases.get(k); if (l) l.push(o); else g.cases.set(k, [o]);
  }
  const m = dmin + 1;   // une case de marge : un point à dmin près ne doit jamais tomber hors de la fenêtre par un arrondi
  const i0 = Math.floor((p.x - m) / GRILLE), i1 = Math.floor((p.x + m) / GRILLE), j0 = Math.floor((p.y - m) / GRILLE), j1 = Math.floor((p.y + m) / GRILLE);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const l = g.cases.get(cleGrille(i, j)); if (!l) continue;
    for (const o of l) if (Math.hypot(o.x - p.x, o.y - p.y) < dmin) return true;
  }
  return false;
}

/** `liste` triée par y croissant, stable : le même ordre que `liste.slice().sort((a, b) => a.y - b.y)`, cinq fois plus vite. */
function trieParY(liste) {
  const n = liste.length, ys = new Float64Array(n); let a = new Uint32Array(n), b = new Uint32Array(n);
  for (let i = 0; i < n; i++) { ys[i] = liste[i].y; a[i] = i; }
  // paquets de 16 triés par insertion (on ne double que sur un y strictement plus grand : stable)…
  for (let s0 = 0; s0 < n; s0 += 16) {
    const e = Math.min(n, s0 + 16);
    for (let i = s0 + 1; i < e; i++) { const v = a[i], y = ys[v]; let j = i - 1; while (j >= s0 && ys[a[j]] > y) { a[j + 1] = a[j]; j--; } a[j + 1] = v; }
  }
  // … puis fusionnés deux à deux (la droite ne passe devant que si elle est strictement plus haute : stable)
  for (let w = 16; w < n; w *= 2) {
    for (let lo = 0; lo < n; lo += 2 * w) {
      const mid = Math.min(n, lo + w), hi = Math.min(n, lo + 2 * w); let i = lo, j = mid, k = lo;
      while (i < mid && j < hi) b[k++] = ys[a[j]] < ys[a[i]] ? a[j++] : a[i++];
      while (i < mid) b[k++] = a[i++];
      while (j < hi) b[k++] = a[j++];
    }
    const t = a; a = b; b = t;
  }
  const trie = [];
  for (let i = 0; i < n; i++) trie.push(liste[a[i]]);
  return trie;
}

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
  constructor(seed = 1) { this.seed = seed; this.version = -1; this.objects = []; this.memoire = new Map(); }

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
    // Les trous ne dépendent que du masque, qui ne fait que grandir (ou change d'objet quand on restaure un
    // plateau) : on ne refait leur recherche — tout le masque et ses voisines — que si l'un ou l'autre a bougé.
    const M = board.mask;
    if (!this._trous || this._trous.mask !== M || this._trous.taille !== M.size) {
      const trous = [], seen = new Set();
      for (const k of M) { const [q, r] = k.split(',').map(Number); for (const [a, b] of neighbors(q, r)) { const hk = key(a, b); if (M.has(hk) || seen.has(hk)) continue; seen.add(hk); if (neighbors(a, b).every(([x, y]) => M.has(key(x, y)))) trous.push([hk, a, b]); } }
      this._trous = { mask: M, taille: M.size, trous };
    }
    for (const [hk, a, b] of this._trous.trous) { const g = bankOf(a, b, null); if (g) { bank.set(hk, g); this.holes.push({ q: a, r: b, family: 'water', variant: 1, hole: true }); } }
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
    // -------------------------------------------------------------------------
    // La mémoire des régions. Le décor se refaisait EN ENTIER à chaque changement du plateau — une pose,
    // un bâtiment, une saison : sur une île de fin de campagne (mille trois cents objets), c'était un
    // à-coup à chaque geste, alors qu'une pose ne change qu'une ou deux régions. Les objets d'une région
    // (bourg ou famille) ne dépendent que de ce qu'on met dans sa SIGNATURE — ses cases dans leur ordre de
    // parcours, avec ce que le décor lit de chacune, plus ce qu'il lit autour (voir les appels) — et des
    // points de chemin qui passent sur ses cases. Même signature, mêmes chemins : on reprend les objets
    // (et les cours) de la dernière fois tels quels, au même rang ; sinon on les refait et on les garde.
    // Le résultat est exactement celui d'une reconstruction complète, objet pour objet.
    // Toute nouvelle lecture d'une tuile ou du plateau dans une région DOIT entrer dans la signature.
    // Les objets rendus sont partagés d'une reconstruction à l'autre : personne ne doit les modifier.
    // -------------------------------------------------------------------------
    const memoire = this.memoire;
    const signature = (reg, extra) => {
      let s = `${this.seed}|${reg.family}|${reg.id}|${extra}`;
      for (const c of reg.cells) {
        s += `|${c.q},${c.r},${c.level || 1},${c.rare ? c.family : ''},${c.blighted ? 1 : 0}${c.dry ? 1 : 0}${c.frozen ? 1 : 0}`;
        if (reg.family === 'water') { const b = this.water && this.water.get(key(c.q, c.r)); s += b ? b.kind : '-'; }
        else if (reg.family === 'hill') for (const [dq, dr] of DIRS) s += board.isSea(c.q + dq, c.r + dr) ? 1 : 0;
      }
      return s;
    };
    const cheminsDe = (keys) => { const a = []; for (const k of keys) { const l = chemins.get(k); if (!l) { a.push(0); continue; } a.push(l.length); for (const p of l) a.push(p.x, p.y); } return a; };
    const memes = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
    /** Les objets d'une région déjà connue, repris tels quels ; `true` si c'est fait. */
    const reprendre = (sig, chem) => {
      const m = memoire.get(sig); if (!m || !memes(m.chem, chem)) return false;
      for (const o of m.objets) out.push(o);
      for (const c of m.cours) this.courts.push(c);
      memoire.delete(sig); memoire.set(sig, m);   // la plus récente en dernier : on oublie d'abord les plus anciennes
      return true;
    };
    const retenir = (sig, chem, debut, debutCours) => memoire.set(sig, { chem, objets: out.slice(debut), cours: this.courts.slice(debutCours) });
    // Les arêtes d'une case qui bordent l'extérieur de sa région (milieu, normale, longueur), calculées une fois par
    // case et par région : `edgeOk` et `distBord` les refaisaient à chaque point essayé, des dizaines de fois par case.
    const bordsCache = new Map();
    const bordsDe = (k, keys) => {
      let parCase = bordsCache.get(keys); if (!parCase) bordsCache.set(keys, (parCase = new Map()));
      let e = parCase.get(k); if (e) return e;
      const [q, r] = parse(k); const c = toWorld(q, r); e = [];
      for (let d = 0; d < 6; d++) {
        const nk = key(q + DIRS[d][0], r + DIRS[d][1]); if (keys.has(nk)) continue;
        const m = edgeMid(c.x, c.y, d); const nx = (m.x - c.x), ny = (m.y - c.y);
        e.push({ mx: m.x, my: m.y, nx, ny, len: Math.hypot(nx, ny) });
      }
      parCase.set(k, e); return e;
    };
    const edgeOk = (p, k, keys, margin) => {
      for (const b of bordsDe(k, keys)) if (((b.mx - p.x) * b.nx + (b.my - p.y) * b.ny) / b.len < margin) return false;
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
          if (proche(placed, p, minDist) || proche(pts, p, minDist)) continue;
          pts.push(p); break;
        }
      }
      return pts;
    };
    const L2 = (cell) => (cell.level || 1) >= 2;   // tuile bâtie : décor nettement plus dense
    const L3 = (cell) => (cell.level || 1) >= 3;   // niveau 3 : une pièce maîtresse au centre
    const LANDMARK = { forest: ['obj_treeRound_large2_{s}', 1.9], field: ['obj_silo1', 1.0], orchard: ['obj_treeRound_fruit_{s}', 1.8], meadow: ['obj_treeRound_small_{s}', 1.5], marsh: ['obj_bushGrass_{s}', 1.8], rock: ['obj_rockGrey_large{w}', 1.6], sand: ['obj_rockBrown_small{w}', 1.6], hill: ['obj_treePine_large_{s}', 1.4], heath: ['obj_heather_{s}', 1.8] };
    for (const t of board.tiles.values()) { if (!L3(t) || t.rare) continue; const lm = LANDMARK[t.family]; if (!lm) continue; const c = toWorld(t.q, t.r); add({ x: c.x, y: c.y + 30, tpl: lm[0], cell: key(t.q, t.r), scale: lm[1], alpha: 1, notSeasons: t.family === 'forest' ? ['spring'] : undefined }); if (t.family === 'forest') add({ x: c.x, y: c.y + 30, tpl: 'obj_treeRound_blossom_large2', cell: key(t.q, t.r), scale: lm[1], alpha: 1, seasons: ['spring'] }); }
    // -------------------------------------------------------------------------
    // Les écueils. Une côte, ce n'est pas un trait : c'est une frange. Quelques rochers émergés
    // devant le rivage cassent la silhouette bien mieux qu'un contour, parce qu'ils mettent de la
    // PROFONDEUR entre la terre et le large — et ce sont de vraies images, pas du dessin.
    // Ils se posent au-delà de l'arête partagée avec la mer, jamais sur une case du masque, et sont
    // tirés de la graine de la case : la même île donne toujours les mêmes écueils.
    // -------------------------------------------------------------------------
    for (const t of board.tiles.values()) {
      const k0 = key(t.q, t.r);
      const rng = mulberry(cellSeed(this.seed, t.q, t.r, 57));
      const w = toWorld(t.q, t.r);
      for (let d = 0; d < 6; d++) {
        const [dq, dr] = DIRS[d]; if (!board.isSea(t.q + dq, t.r + dr)) continue;
        if (rng() > 0.45) continue;                       // un peu moins d'une arête de côte sur deux
        const m = edgeMid(w.x, w.y, d);
        const ux = (m.x - w.x), uy = (m.y - w.y); const len = Math.hypot(ux, uy) || 1;
        const tx = -uy / len, ty = ux / len;              // le long de l'arête
        const n = 1 + (rng() < 0.3 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          // Au large de l'arête. L'arête est à 60 unités du centre (l'apothème) et le pied lobé de
          // l'île monte jusqu'à ~92 : en deçà de 1,45 le rocher serait posé sur le rivage, au-delà
          // de 1,95 il empiéterait sur la case de mer suivante (dont le centre est à 120).
          const av = 1.45 + rng() * 0.50;
          const de = (rng() - 0.5) * SIZE * 0.85;         // décalé le long de l'arête
          const p = { x: w.x + ux * av + tx * de, y: w.y + uy * av + ty * de };
          const cc = fromWorld(p.x, p.y);
          if (board.mask.has(key(cc.q, cc.r))) continue;   // jamais sur une case de l'île, même pas posée
          // Gris de préférence : le brun disparaît sur le bleu, et un écueil de dix unités monde se
          // lit comme une miette. Vingt à trente, c'est un rocher qui sort de l'eau.
          const gris = rng() < 0.78;
          add({ x: p.x, y: p.y, tpl: gris ? `obj_rockGrey_small${VAR3(rng)}{w}` : 'obj_rockBrown_small{w}',
                cell: k0, scale: (gris ? 0.95 : 1.15) * (0.75 + rng() * 0.5), alpha: 1, flip: rng() < 0.5 });
        }
      }
    }
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
      let d = Infinity;
      for (const b of bordsDe(k, keys)) d = Math.min(d, ((b.mx - p.x) * b.nx + (b.my - p.y) * b.ny) / (b.len || 1));
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
    let nRegions = 0;
    for (const reg of board.regions('hamlet')) {
      nRegions++;
      const keys = reg.keys;
      const closed = board.regionPaid(reg);
      // Un bourg assez gros posé contre un pré mérite son écurie : c'est du décor pur, aucune règle
      // ne la connaît. Une par bourg, à la place d'une maison, et seulement si le pré est là — sinon
      // on aurait des chevaux au milieu des rochers.
      const preVoisin = reg.cells.some((c) => neighbors(c.q, c.r).some(([a, b2]) => {
        const n = board.get(a, b2); return n && !n.rare && Board.isFamily(n, 'meadow');
      }));
      const sig = signature(reg, `${closed ? 1 : 0}${preVoisin ? 1 : 0}`), chem = cheminsDe(keys);
      if (reprendre(sig, chem)) continue;
      const debut = out.length, debutCours = this.courts.length;
      let poids = 0; for (const c of reg.cells) poids += c.level || 1;
      const cour = bourgCour(poids);
      const garde = poids <= 1 ? 0.30 : poids <= 3 ? 0.52 : 0.72;
      const cen = centroidOf(reg);
      const hasRare = reg.cells.some((c) => c.rare && (c.family === 'chapel' || c.family === 'well'));
      let ecurieFaite = !(preVoisin && poids >= 4);
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
          // un hameau dont la trame n'a donné qu'un point (le cœur) n'avait qu'un puits, pas une maison :
          // le cœur devient alors une maisonnette, et le puits se range à côté
          if (poids < 3 && bati.length === 1) { met(`obj_house_small${roof(rng)}`, 0.86); add({ x: p.x - 22, y: p.y + 6, tpl: 'obj_well', cell: ck, scale: 0.8, alpha: 1, flip: w.flip }); }
          else if (poids >= 3) met('obj_townhall', 0.85); else met('obj_well', 1);
          add({ x: p.x + 24, y: p.y - 4, tpl: 'obj_banner', cell: ck, scale: 0.78, alpha: 1, seasons: ['summer'], notRules: ['foire'] });
          add({ x: p.x + 24, y: p.y - 4, tpl: 'obj_banner', cell: ck, scale: 0.78, alpha: 1, rules: ['foire'] });
          if (closed) add({ x: p.x - 26, y: p.y + 2, tpl: 'obj_shrine', cell: ck, scale: 0.55, alpha: 1 });   // la pierre à bougies : un bourg clos veille
          continue;
        }
        if (r < 0.82) pave();
        if (!ecurieFaite && r >= 0.44 && r < 0.74) { ecurieFaite = true; met('obj_stables', 0.62); continue; }
        if (r < 0.44) met(`obj_tinyBuilding${roof(rng)}`, 1);
        else if (r < 0.66) met(`obj_house_small${roof(rng)}`, 0.78);
        else if (r < 0.74) met(gros ? `obj_house${roof(rng)}` : `obj_house_small${roof(rng)}`, gros ? 0.62 : 0.86);
        else if (r < 0.80) met(rng() < 0.5 ? 'obj_workshop' : `obj_villa${roof(rng)}`, 0.7);
        else if (r < 0.82) {
          // les annexes : ce sont elles qui font la cour, pas la façade
          const q = rng();
          if (q < 0.26) met('obj_logPile', 0.8);
          else if (q < 0.46) met('obj_haybale', 0.9);
          else if (q < 0.62) met('obj_basket', 0.8);
          else if (q < 0.78) met('obj_cart', 0.7);
          else if (q < 0.9) met('obj_well', 0.8);
          else met('obj_crate', 1);
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
      retenir(sig, chem, debut, debutCours);
    }
    for (const family of ['forest', 'meadow', 'field', 'orchard', 'water', 'marsh', 'rock', 'sand', 'hill', 'heath']) {
      for (const reg of board.regions(family)) {
        nRegions++;
        const keys = reg.keys;
        const sig = signature(reg, ''), chem = cheminsDe(keys);
        if (reprendre(sig, chem)) continue;
        const debut = out.length, debutCours = this.courts.length;
        const cen = centroidOf(reg);
        // la route occupe la place : on la verse dans les obstacles avant de semer quoi que ce soit
        const placed = []; for (const k of keys) for (const p of chemins.get(k) || []) placed.push(p);
        const cells = reg.cells.filter((c) => !c.rare);
        // cellule « centrale » (village)
        let center = null, bd = Infinity;
        for (const c of cells) { const w = toWorld(c.q, c.r); const d = Math.hypot(w.x - cen.x, w.y - cen.y); if (d < bd) { bd = d; center = c; } }
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
              // Les herbes hautes du pack Forest : ce sont elles qui donnent enfin de la hauteur au pré.
              // (Les variantes « _A » et « _B » du pack sont des brins isolés de 37 px, illisibles seuls ;
              // on prend les « _C » et « _D », qui sont de vraies touffes.)
              if (r2 < 0.38) push(p, rng() < 0.6 ? 'obj_tallGrass_{s}' : 'obj_tallGrass2_{s}', w);
              else if (r2 < 0.46) push(p, 'obj_bushGrass_{s}', w);
              else if (r2 < 0.56) push(p, rng() < 0.5 ? 'obj_bush_{s}' : 'obj_bush2_{s}', Object.assign({ scale: (w.scale || 1) * 0.8 }, { flip: w.flip }));
              else if (r2 < 0.74) fleurir(p, ck, rng, 3);
              else if (r2 < 0.83) push(p, `obj_rockGrey_small${VAR3(rng)}{w}`, Object.assign({ scale: (w.scale || 1) * 0.45 }, { flip: w.flip }));
              else if (r2 < 0.89) push(p, 'obj_log', Object.assign({ scale: (w.scale || 1) * 0.8 }, { flip: w.flip }));
              // arbre isolé et piquet : seulement en lisière, là où un pré s'arrête vraiment.
              // (`obj_hedge` a été essayé ici : ce n'est pas un segment de haie mais un ENCLOS carré,
              // qui à cette taille se lit comme un rectangle vide posé sur l'herbe.)
              else if (d < 26) push(p, rng() < 0.65 ? 'obj_treeRound_small_{s}' : 'obj_tallGrass2_{s}', { scale: (w.scale || 1) * 0.62, flip: w.flip });
              else push(p, 'obj_tallGrass_{s}', Object.assign({ scale: (w.scale || 1) * 0.85 }, { flip: w.flip }));
            }
            if (rng() < 0.5) for (const p of sample(rng, cell, keys, 1, { minDist: 28, margin: 12, placed })) { placed.push(p); push(p, 'obj_haybale', { seasons: ['autumn'] }); }
            for (const p of sample(rng, cell, keys, 2, { minDist: 24, margin: 10, placed: [] })) push(p, 'obj_leafpile', { seasons: ['autumn'], alpha: 0.9 });
            for (const p of sample(rng, cell, keys, 2, { minDist: 26, margin: 10, placed: [] })) push(p, 'obj_snowdrift', { seasons: ['winter'] });
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 12, placed: [] })) push(p, `obj_puddle${VAR3(rng)}`, { weathers: ['storm'] });
          } else if (family === 'field') {
            // rangs de culture alignés sur une grille commune à la région (les sillons se prolongent d'une tuile à l'autre)
            const sx = L2(cell) ? 14 : 19, sy = L2(cell) ? 11 : 14, ox = (reg.id.length * 5) % sx, oy = (reg.id.length * 3) % sy;
            const x0 = Math.floor((c.x - 70 - ox) / sx) * sx + ox, y0 = Math.floor((c.y - 80 - oy) / sy) * sy + oy;
            for (let y = y0; y < c.y + 80; y += sy) for (let x = x0 + ((Math.round((y - oy) / sy) % 2) ? sx / 2 : 0); x < c.x + 70; x += sx) {
              const p = { x: x + (rng() - 0.5) * 3, y: y + (rng() - 0.5) * 2 };
              if (inRegion(p, keys) !== ck || !edgeOk(p, ck, keys, 5)) continue;
              if (surChemin(p, 11)) continue;   // on ne sème pas au milieu du chemin
              // la lisière du champ s'effiloche : les rangs coupés net au bord de la tuile redessinaient
              // l'hexagone que les fondus entre sols viennent d'effacer
              const d = distBord(p, ck, keys); if (d < 24 && rng() < 0.9 * (1 - d / 24)) continue;
              push(p, 'obj_crop_{s}');
            }
            // Deux silhouettes de récolte, tirées au sort. C'était la meule conique Kenney et la botte
            // ronde ; la meule était un aplat sans volume, plus large que le puits, et se lisait comme
            // un jeton d'interface. C'est maintenant la botte et la brouette.
            const botte = () => (rng() < 0.5 ? 'obj_haybale' : 'obj_wheelbarrow');
            if (rng() < 0.45) for (const p of sample(rng, cell, keys, 1, { minDist: 30, margin: 12, placed, radius: 0.7 })) { placed.push(p); push(p, botte(), wild(rng, 0.9, 1.1)); }
            for (const p of sample(rng, cell, keys, L2(cell) ? 2 : 1, { minDist: 30, margin: 12, placed, radius: 0.75 })) { placed.push(p); push(p, botte(), Object.assign({ seasons: ['autumn'] }, wild(rng, 0.9, 1.1))); }
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 12, placed: [] })) push(p, `obj_puddle${VAR3(rng)}`, { weathers: ['storm'] });
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
            for (const p of sample(rng, cell, keys, 2, { minDist: 30, margin: 12, placed })) { placed.push(p); push(p, `obj_puddle${VAR3(rng)}{w}`); }
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
            // Le sommet est un MONT du pack EXTRA (retour du commanditaire : « ces reliefs-là ») : roche nue
            // au sommet d'un massif, un alpage (sommet d'herbe) au cœur des grands massifs ; les crêtes et
            // l'éboulis autour restent des blocs, pour que la montagne ne s'arrête pas au bord de la case.
            if (peak || seul) {
              const alpage = !seul && cells.length >= 5 && dc < 40 && rng() < 0.5;
              const tpl = alpage ? `obj_mont_${PICK(rng, ['A', 'B', 'C'])}_{s}` : `obj_mont_roc_${PICK(rng, ['A', 'B', 'C'])}_{s}`;
              push({ x: c.x + (rng() - 0.5) * 12, y: c.y + (seul ? 30 : 34) }, tpl, { flip: rng() < 0.5, scale: (seul ? 0.72 : 0.9 + Math.min(0.3, cells.length * 0.04)) + (L2(cell) ? 0.2 : 0) });
            } else {
              push({ x: c.x + (rng() - 0.5) * 12, y: c.y + 44 }, PICK(rng, ['obj_rockGrey_medium1{w}', 'obj_rockGrey_medium2{w}', 'obj_rockGrey_medium3{w}']),
                Object.assign(wild(rng, 0.9, 1.1), { scale: 1.15 + (L2(cell) ? 0.35 : 0) }));
            }
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
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 12, placed: [] })) push(p, `obj_puddle${VAR3(rng)}`, { weathers: ['storm'] });
          } else if (family === 'hill') {
            // Des collines EN VOLUME (modèles du pack EXTRA) sur un sol d'herbe plat. La tuile surélevée
            // d'avant (grass_17) était un bloc hexagonal à flancs bruns qui ne se fondait avec rien ; un
            // seul gros modèle au centre de la case se lisait ensuite comme un accessoire posé (« un gros
            // bloc seul au milieu »). Chaque case porte donc une COMPOSITION : un mamelon principal un peu
            // décalé, un ou deux petits satellites poussés vers les collines voisines (la région se lit
            // comme une chaîne, les reliefs se chevauchent d'une case à l'autre), des rochers au pied.
            // Une chaîne (hills, parfois boisée) dès deux voisines, un mont au centre des grandes régions.
            const voisines = degreeOf(cell, keys);
            const vers = []; for (const [a, b] of neighbors(cell.q, cell.r)) if (keys.has(key(a, b))) { const w = toWorld(a, b); vers.push({ x: w.x - c.x, y: w.y - c.y }); }
            // Les monts herbeux (roche grise, sommet d'herbe) aussi sur les collines (« pour les collines
            // aussi ») : toujours au centre des grandes régions, une fois sur deux au cœur d'une chaîne,
            // une fois sur trois — petit — sur une colline isolée : la roche affleure sous l'herbe.
            let principal, ech; const mont = `obj_mont_${PICK(rng, ['A', 'B', 'C'])}_{s}`;
            if (cells.length >= 5 && cell === center) { principal = mont; ech = 0.9; }
            else if (voisines >= 2) { if (rng() < 0.5) { principal = mont; ech = 0.72; } else { principal = `obj_collines_${PICK(rng, ['A', 'B', 'C', 'B_arbres', 'C_arbres'])}_{s}`; ech = 0.8; } }
            else if (rng() < 0.34) { principal = mont; ech = 0.56; }
            else { principal = `obj_colline_${PICK(rng, ['A', 'B', 'C'])}_{s}`; ech = 0.78; }
            const p = { x: c.x + (rng() - 0.5) * 16, y: c.y + 20 + (rng() - 0.5) * 10 };
            placed.push(p); push(p, principal, { flip: rng() < 0.5, scale: ech * (0.94 + rng() * 0.12) });
            // les satellites : vers une voisine de colline quand il y en a, sinon au hasard, toujours à côté
            const n = 1 + (rng() < (voisines ? 0.6 : 0.4) ? 1 : 0);
            for (let i = 0; i < n; i++) {
              let dx, dy;
              if (vers.length && rng() < 0.75) { const v = PICK(rng, vers); const t = 0.42 + rng() * 0.16; dx = v.x * t + (rng() - 0.5) * 14; dy = v.y * t + (rng() - 0.5) * 10; }
              else { const a = rng() * Math.PI * 2; dx = Math.cos(a) * (34 + rng() * 10); dy = Math.sin(a) * (22 + rng() * 8); }
              const q = { x: c.x + dx, y: c.y + dy + 14 };
              placed.push(q); push(q, `obj_colline_${PICK(rng, ['A', 'B', 'C'])}_{s}`, { flip: rng() < 0.5, scale: 0.4 + rng() * 0.16 });
            }
            // au pied : cailloux et touffes, pour que le relief soit posé et non collé
            for (const p2 of sample(rng, cell, keys, 2, { minDist: 22, margin: 8, placed: [], yMin: 26, radius: 0.85 })) push(p2, rng() < 0.55 ? `obj_rockGrey_small${VAR3(rng)}{w}` : 'obj_bushGrass_{s}', { scale: 0.5 + rng() * 0.15, flip: rng() < 0.5 });
            // Piste C : les falaises côtières. Le sol de colline est de l'herbe plate partout (journal 102) ;
            // sur le flanc qui plonge dans la MER — pas un étang ni un lac, qui restent doux — un amas de
            // rochers prend le pied du relief là où l'herbe cède. Les écueils (plus haut dans ce fichier)
            // posent déjà des rochers AU LARGE, au-delà de l'arête ; ceux-ci restent EN DEÇÀ (t < 1, jamais
            // sur l'arête elle-même), pour ne pas doubler ce système et se lire comme la base du massif.
            for (let d = 0; d < 6; d++) {
              if (!board.isSea(cell.q + DIRS[d][0], cell.r + DIRS[d][1])) continue;
              const ex = edgeMid(c.x, c.y, d).x - c.x, ey = edgeMid(c.x, c.y, d).y - c.y;
              const len = Math.hypot(ex, ey) || 1, px = -ey / len, py = ex / len;   // le long du rivage
              for (let i = 0; i < 2; i++) {
                const t = 0.5 + rng() * 0.32, dec = (rng() - 0.5) * 30;
                push({ x: c.x + ex * t + px * dec, y: c.y + ey * t + py * dec + 6 }, PICK(rng, ['obj_rockGrey_medium1{w}', 'obj_rockGrey_medium2{w}', `obj_rockGrey_large${VAR(rng)}{w}`]), Object.assign(wild(rng, 0.85, 1.15), { scale: 0.95 }));
              }
            }
            // Piste D : un repère au sommet de la région (la case la plus centrale, une seule par région,
            // déjà calculée pour le hameau) pour qu'on la distingue au premier regard du reste de la chaîne —
            // un rocher isolé ou un arbre esseulé, IMMOBILE (la chèvre, elle, se déplace : pas de faune figée
            // ici). Sauf si la case a déjà sa pièce maîtresse de niveau 3 (LANDMARK, plus haut) : pas deux
            // repères sur la même case.
            if (cell === center && (cell.level || 1) < 3) {
              const a = rng() * Math.PI * 2, dd = 28 + rng() * 10;
              const sp = { x: p.x + Math.cos(a) * dd, y: p.y + Math.sin(a) * dd * 0.55 - 4 };
              if (rng() < 0.55) push(sp, `obj_rockGrey_large${VAR(rng)}{w}`, { scale: 0.5 + rng() * 0.15, flip: rng() < 0.5 });
              else push(sp, rng() < 0.5 ? 'obj_treePine_small_{s}' : 'obj_treeRound_small_{s}', { scale: 0.55 + rng() * 0.12, flip: rng() < 0.5 });
            }
          } else if (family === 'heath') {
            // La bruyère poussait en solitaires régulièrement espacées : on la met en TOUFFES, et on
            // sème entre elles ce qui fait une lande — cailloux affleurants, ajoncs, herbe rase.
            for (const p of sample(rng, cell, keys, L2(cell) ? 18 : 13, { minDist: 15, margin: 5, placed, radius: 1.0, tries: 26 })) {
              const d = distBord(p, ck, keys);
              if (rng() > Math.max(0.35, Math.min(0.95, 1 - d / 120))) continue;
              placed.push(p); const r2 = rng(); const w = wild(rng, 0.85, 1.15);
              if (r2 < 0.56) { const n = 1 + Math.floor(rng() * 3); for (let i = 0; i < n; i++) push({ x: p.x + (rng() - 0.5) * 22, y: p.y + (rng() - 0.5) * 13 }, 'obj_heather_{s}', wild(rng, 0.8, 1.1)); }
              else if (r2 < 0.72) push(p, `obj_rockGrey_small${VAR3(rng)}{w}`, Object.assign({ scale: (w.scale || 1) * 0.55 }, { flip: w.flip }));
              else if (r2 < 0.80) push(p, rng() < 0.5 ? 'obj_bush_{s}' : 'obj_bush2_{s}', Object.assign({ scale: (w.scale || 1) * 0.78 }, { flip: w.flip }));
              // la touffe à feuilles larges (Grass_1_C) : plus trapue que la graminée du pré, c'est elle
              // qui dit « lande » plutôt que « pelouse »
              else if (r2 < 0.90) push(p, 'obj_grassClump_{s}', w);
              else if (d < 26) push(p, 'obj_rockGrey_medium2{w}', { scale: (w.scale || 1) * 0.6, flip: w.flip });
              else push(p, 'obj_bushGrass_{s}', Object.assign({ scale: (w.scale || 1) * 0.75 }, { flip: w.flip }));
            }
            for (const p of sample(rng, cell, keys, 2, { minDist: 26, margin: 10, placed: [] })) push(p, 'obj_snowdrift', { seasons: ['winter'] });
          }
          // bourrasque : congères sur toutes les tuiles de terre
          if (family !== 'water') for (const p of sample(rng, cell, keys, 1, { minDist: 30, margin: 12, placed: [] })) push(p, 'obj_snowdrift', { weathers: ['blizzard'] });
        }
        retenir(sig, chem, debut, debutCours);
      }
    }
    // la mémoire garde les régions de ce plateau et quelques plateaux passés (une saison qui revient, une
    // annulation) ; au-delà, on oublie les plus anciennes
    for (const k of memoire.keys()) { if (memoire.size <= 3 * nRegions + 32) break; memoire.delete(k); }
    // Des pierres et des touffes au bord des chemins : un chemin de terre n'est pas posé sur l'herbe,
    // il y est usé, et ce sont les cailloux dégagés et l'herbe qui repousse au bord qui le disent.
    let ic = 0;
    for (const s of pathShapes(board)) {
      const rng = mulberry(cellSeed(this.seed, ic++, 977, 5)); const rb = s.ruban; if (!rb) continue;
      for (let i = 5; i < rb.gauche.length - 5; i += 8) {
        if (rng() < 0.6) continue;
        const gauche = rng() < 0.5; const e = gauche ? rb.gauche[i] : rb.droite[i], o = gauche ? rb.droite[i] : rb.gauche[i];
        const dx = e.x - o.x, dy = e.y - o.y; const d = Math.hypot(dx, dy) || 1; const recul = 3 + rng() * 4;
        const p = { x: e.x + dx / d * recul, y: e.y + dy / d * recul };
        const c = fromWorld(p.x, p.y); const t = board.get(c.q, c.r); if (!t || Board.isFamily(t, 'water')) continue;
        if (Board.isFamily(t, 'hamlet') && rng() < 0.6) continue;   // dans la rue, moins de cailloux
        if (rng() < 0.55) add({ x: p.x, y: p.y, tpl: `obj_rockGrey_small${VAR3(rng)}{w}`, cell: key(c.q, c.r), scale: 0.3 + rng() * 0.15, flip: rng() < 0.5 });
        else add({ x: p.x, y: p.y, tpl: 'obj_bushGrass_{s}', cell: key(c.q, c.r), scale: 0.5 + rng() * 0.2, flip: rng() < 0.5 });
      }
    }
    // Du fond vers l'avant : tri stable sur y (à y égal, l'ordre de pose) — exactement l'ordre que donnait
    // `out.sort((a, b) => a.y - b.y)`. Mais le comparateur, appelé treize mille fois depuis le tri natif,
    // coûtait à lui seul près d'une demi-milliseconde sur une grande île : on trie ici des indices sur un
    // tableau de y, par insertion puis fusion, stable (à égalité, celui de gauche passe d'abord).
    return trieParY(out);
  }
}

/** Clé d'image d'un objet pour une saison. */
export function spriteKey(tpl, season) { return tpl.replace('{s}', season).replace('{w}', season === 'winter' ? '_winter' : ''); }
