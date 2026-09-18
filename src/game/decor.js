// Décor composé par région : les objets (arbres, rochers, maisons, roseaux…) sont placés à la volée pour toute une
// région de même famille, de façon déterministe (graine par case), ce qui donne des forêts continues et denses,
// des massifs rocheux reliés et de vrais villages. Les tuiles rares gardent leur image composée.
import { toWorld, fromWorld, key, parse, neighbors, edgeMid, DIRS, SIZE, TILE_H } from './hex.js';
import { Board } from './board.js';
import { RARE_AS } from '../data/tiles.js';
import { classifyWater } from './water.js';

/** Type de sol d'une tuile (image `ground_<type>_<saison>`). */
/** Sol des tuiles composées (les fusions d'eau prennent la rive de leurs voisines, l'eau est dessinée par plan). */
const FUSION_GROUND = { farm: 'field', fort: 'stone', cave: 'stone' };
/** Décor des tuiles composées : objets posés autour du centre (dx, dy en unités monde). */
export const FUSION_DECOR = {
  port:   [{ tpl: 'obj_house_small', dx: -24, dy: 22 }, { tpl: 'obj_lightpost', dx: 22, dy: 30 }, { tpl: 'obj_log', dx: 12, dy: 44 }, { tpl: 'obj_basket', dx: 32, dy: 44 }, { tpl: 'obj_pole', dx: 4, dy: 36 }],
  paddy:  [{ tpl: 'obj_crop_{s}', dx: -20, dy: 10 }, { tpl: 'obj_crop_{s}', dx: 0, dy: 20 }, { tpl: 'obj_crop_{s}', dx: 20, dy: 10 }, { tpl: 'obj_crop_{s}', dx: -10, dy: 34 }, { tpl: 'obj_crop_{s}', dx: 12, dy: 36 }, { tpl: 'obj_lily', dx: -26, dy: 30, seasons: ['summer'] }],
  farm:   [{ tpl: 'obj_farm', dx: 0, dy: 30 }, { tpl: 'obj_silo1', dx: -34, dy: 22 }, { tpl: 'obj_fence', dx: 32, dy: 40 }, { tpl: 'obj_hay', dx: 30, dy: 12 }, { tpl: 'obj_crop_{s}', dx: -28, dy: 44 }],
  fort:   [{ tpl: 'obj_castle_small', dx: 0, dy: 30 }, { tpl: 'obj_wall_small', dx: -34, dy: 34 }, { tpl: 'obj_rockGrey_small1{w}', dx: 32, dy: 36 }],
  falls:  [{ tpl: 'obj_rockGrey_large{w}', dx: -10, dy: 34, scale: 1.15 }, { tpl: 'obj_rockGrey_medium2{w}', dx: 28, dy: 18 }, { tpl: 'sea_wave_1', dx: 2, dy: 14, wave: true }, { tpl: 'obj_moss', dx: -28, dy: 20, seasons: ['spring'] }],
  cave:   [{ tpl: 'obj_rockGrey_large{w}', dx: 0, dy: 40, scale: 1.3 }, { tpl: 'obj_medieval_doorway', dx: 0, dy: 44, scale: 0.8 }, { tpl: 'obj_treePine_small_{s}', dx: -34, dy: 22 }, { tpl: 'obj_treePine_small_{s}', dx: 34, dy: 26 }],
  lagoon: [{ tpl: 'obj_rockBrown_small{w}', dx: -30, dy: 32 }, { tpl: 'sea_wave_2', dx: 8, dy: 6, wave: true }, { tpl: 'obj_bushGrass_dry', dx: 30, dy: 30 }],
};

/** Décor des ouvrages posés sur une tuile. */
export const WORK_DECOR = {
  hive:      [{ tpl: 'obj_box2', dx: 18, dy: 20, scale: 0.7 }, { tpl: 'obj_flowerYellow', dx: 32, dy: 30 }, { tpl: 'obj_flowerWhite', dx: 6, dy: 30 }],
  scarecrow: [{ tpl: 'obj_pole', dx: 0, dy: 18, scale: 0.9 }, { tpl: 'obj_hay', dx: 0, dy: 26, scale: 0.6 }],
  pier:      [{ tpl: 'obj_log', dx: -10, dy: 18 }, { tpl: 'obj_log', dx: 10, dy: 26 }, { tpl: 'obj_basket', dx: -4, dy: 12, scale: 0.8 }],
  bridge:    [{ tpl: 'obj_wall_small', dx: 0, dy: 16, scale: 1.25 }],
  nestbox:   [{ tpl: 'obj_tinyBuilding', dx: 24, dy: 4, scale: 0.55 }],
  campfire:  [{ tpl: 'obj_fire', dx: 0, dy: 22 }, { tpl: 'obj_log', dx: 22, dy: 30, scale: 0.8 }],
  menhir:    [{ tpl: 'obj_tombstone1', dx: 0, dy: 26, scale: 1.5 }],
  compost:   [{ tpl: 'obj_logPile', dx: 0, dy: 24, scale: 0.9 }, { tpl: 'obj_hay', dx: 22, dy: 30, scale: 0.7 }],
};

export function groundOf(t) {
  if (!t) return null;
  if (t.fusion) return FUSION_GROUND[t.family] || 'water';
  if (t.rare) return t.family === 'ruins' || t.family === 'mine' ? 'stone' : 'grass';
  if (t.family === 'meadow' && t.dry) return 'dry';
  if (t.family === 'water' && t.frozen) return 'ice';
  return { meadow: 'grass', forest: 'grass', field: 'field', hamlet: 'grass', orchard: 'grass', water: 'water', marsh: 'dirt', rock: 'stone', sand: 'sand', hill: 'hill', heath: 'heath' }[t.family] || 'grass';
}
export const groundKey = (g, season) => (g === 'dry' ? 'ground_dry' : g === 'ice' ? 'water_frozen' : `ground_${g}_${season}`);
export const GROUND_COLORS = { dry: '#cdbb6a', ice: '#dbe9f4' };

function mulberry(seed) { let s = seed >>> 0 || 7; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const cellSeed = (seed, q, r, salt = 0) => ((seed * 73856093) ^ ((q + 512) * 19349663) ^ ((r + 512) * 83492791) ^ (salt * 2654435761)) >>> 0;

const PICK = (rng, list) => list[Math.floor(rng() * list.length)];

export class Decor {
  constructor(seed = 1) { this.seed = seed; this.version = -1; this.objects = []; }

  /** Recalcule tous les objets si le plateau a changé. */
  sync(board) {
    if (this.version === board.version) return;
    this.version = board.version;
    this.water = classifyWater(board);
    this.bank = this.computeBanks(board);
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
  groundFor(t) { const g = groundOf(t); if (g === 'water' || g === 'ice') return this.bank.get(key(t.q, t.r)) || 'grass'; return g; }

  generate(board) {
    const out = [];
    const rule = board._rule || null;
    const add = (o) => { out.push(o); return o; };
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
    const sample = (rng, cell, keys, n, { minDist = 18, margin = 6, radius = 0.92, tries = 40, placed = [], yMax = Infinity } = {}) => {
      const c = toWorld(cell.q, cell.r); const pts = [];
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * SIZE * radius;
          const p = { x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr * 0.9 };
          if (p.y - c.y > yMax) continue;
          const k = inRegion(p, keys); if (!k || !edgeOk(p, k, keys, margin)) continue;
          if (placed.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < minDist) || pts.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < minDist)) continue;
          pts.push(p); break;
        }
      }
      return pts;
    };
    const L2 = (cell) => (cell.level || 1) >= 2;   // tuile bâtie : décor nettement plus dense
    const L3 = (cell) => (cell.level || 1) >= 3;   // niveau 3 : une pièce maîtresse au centre
    const LANDMARK = { forest: ['obj_treeRound_large_{s}', 1.9], hamlet: ['obj_church', 1.0], field: ['obj_silo1', 1.0], orchard: ['obj_treeRound_fruit_{s}', 1.8], meadow: ['obj_fence', 1.2], marsh: ['obj_bushGrass_{s}', 1.8], rock: ['obj_rockGrey_large{w}', 1.9], sand: ['obj_rockBrown_small{w}', 1.6], hill: ['obj_treePine_large_{s}', 1.4], heath: ['obj_heather_{s}', 1.8] };
    for (const t of board.tiles.values()) { if (!L3(t) || t.rare) continue; const lm = LANDMARK[t.family]; if (!lm) continue; const c = toWorld(t.q, t.r); add({ x: c.x, y: c.y + (t.family === 'hamlet' ? 34 : 30), tpl: lm[0], cell: key(t.q, t.r), scale: lm[1], alpha: 1, notSeasons: t.family === 'forest' ? ['spring'] : undefined }); if (t.family === 'forest') add({ x: c.x, y: c.y + 30, tpl: 'obj_treeRound_blossom_large', cell: key(t.q, t.r), scale: lm[1], alpha: 1, seasons: ['spring'] }); }
    const degreeOf = (cell, keys) => neighbors(cell.q, cell.r).filter(([a, b]) => keys.has(key(a, b))).length;
    const rareTiles = [];
    for (const t of board.tiles.values()) {
      if (!t.rare) continue; const c = toWorld(t.q, t.r);
      if (t.fusion) { for (const o of FUSION_DECOR[t.family] || []) add({ x: c.x + o.dx, y: c.y + o.dy, tpl: o.tpl, cell: key(t.q, t.r), scale: o.scale || 1, alpha: o.alpha || 1, seasons: o.seasons, wave: o.wave }); continue; }
      add({ x: c.x, y: c.y + 26, tile: t, cell: key(t.q, t.r), composed: true });
    }
    for (const t of board.tiles.values()) { if (!t.work) continue; const c = toWorld(t.q, t.r); for (const o of WORK_DECOR[t.work] || []) add({ x: c.x + o.dx, y: c.y + o.dy, tpl: o.tpl, cell: key(t.q, t.r), scale: o.scale || 1, alpha: 1 }); }

    for (const family of ['forest', 'meadow', 'field', 'hamlet', 'orchard', 'water', 'marsh', 'rock', 'sand', 'hill', 'heath']) {
      for (const reg of board.regions(family)) {
        const keys = reg.keys; const cen = centroidOf(reg); const placed = [];
        const closed = board.closedRegions.has(reg.id);
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
              placed.push(p); const r = rng();
              if (r < 0.34) push(p, 'obj_treePine_large_{s}'); else if (r < 0.58) push(p, 'obj_treePine_small_{s}');
              else if (r < 0.8) { push(p, 'obj_treeRound_large_{s}', { notSeasons: rng() < 0.5 ? ['spring'] : null, tag: 'rl' }); if (out[out.length - 1].notSeasons) push(p, 'obj_treeRound_blossom_large', { seasons: ['spring'] }); }
              else { const bl = rng() < 0.6; push(p, 'obj_treeRound_small_{s}', { notSeasons: bl ? ['spring'] : null }); if (bl) push(p, 'obj_treeRound_blossom', { seasons: ['spring'] }); }
            }
            for (const p of sample(rng, cell, keys, 2, { minDist: 20, margin: 8, placed: [] })) push(p, 'obj_leafpile', { seasons: ['autumn'], alpha: 0.95 });
            for (const p of sample(rng, cell, keys, 1, { minDist: 20, margin: 8, placed: [] })) push(p, 'obj_snowdrift', { seasons: ['winter'] });
          } else if (family === 'meadow') {
            if (cell.dry) { for (const p of sample(rng, cell, keys, 2, { minDist: 26, margin: 8, placed })) { placed.push(p); push(p, 'obj_bushGrass_dry'); } continue; }
            for (const p of sample(rng, cell, keys, (deg >= 3 ? 1 : 2) + (L2(cell) ? 2 : 0), { minDist: L2(cell) ? 18 : 26, margin: 8, placed })) { placed.push(p); push(p, 'obj_bushGrass_{s}'); }
            for (const p of sample(rng, cell, keys, L2(cell) ? 5 : 2, { minDist: L2(cell) ? 16 : 22, margin: 10, placed })) { placed.push(p); push(p, PICK(rng, ['obj_flowerWhite', 'obj_flowerYellow']), { seasons: ['spring'] }); }
            for (const p of sample(rng, cell, keys, L2(cell) ? 4 : 1, { minDist: L2(cell) ? 16 : 22, margin: 10, placed })) { placed.push(p); push(p, PICK(rng, ['obj_flowerYellow', 'obj_flowerRed']), { seasons: ['summer'] }); }
            for (const p of sample(rng, cell, keys, 2, { minDist: 22, margin: 10, placed })) { placed.push(p); push(p, PICK(rng, ['obj_flowerBlue', 'obj_flowerWhite']), { seasons: ['spring'] }); }
            if (rng() < 0.5) for (const p of sample(rng, cell, keys, 1, { minDist: 28, margin: 12, placed })) { placed.push(p); push(p, 'obj_hay', { seasons: ['autumn'] }); }
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 10, placed: [] })) push(p, 'obj_snowdrift', { seasons: ['winter'] });
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 12, placed: [] })) push(p, 'obj_puddle', { weathers: ['storm'] });
          } else if (family === 'field') {
            // rangs de culture alignés sur une grille commune à la région (les sillons se prolongent d'une tuile à l'autre)
            const sx = L2(cell) ? 14 : 19, sy = L2(cell) ? 11 : 14, ox = (reg.id.length * 5) % sx, oy = (reg.id.length * 3) % sy;
            const x0 = Math.floor((c.x - 70 - ox) / sx) * sx + ox, y0 = Math.floor((c.y - 80 - oy) / sy) * sy + oy;
            for (let y = y0; y < c.y + 80; y += sy) for (let x = x0 + ((Math.round((y - oy) / sy) % 2) ? sx / 2 : 0); x < c.x + 70; x += sx) {
              const p = { x: x + (rng() - 0.5) * 3, y: y + (rng() - 0.5) * 2 };
              if (inRegion(p, keys) !== ck || !edgeOk(p, ck, keys, 5)) continue;
              push(p, 'obj_crop_{s}');
            }
            if (rng() < 0.45) for (const p of sample(rng, cell, keys, 1, { minDist: 30, margin: 12, placed, radius: 0.7 })) { placed.push(p); push(p, 'obj_hay'); }
            for (const p of sample(rng, cell, keys, 1, { minDist: 30, margin: 12, placed, radius: 0.7 })) { placed.push(p); push(p, 'obj_hay', { seasons: ['autumn'] }); }
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 12, placed: [] })) push(p, 'obj_puddle', { weathers: ['storm'] });
          } else if (family === 'hamlet') {
            const isCenter = cells.length >= 3 && cell === center && !hasRareCenter;
            const dx = Math.max(-10, Math.min(10, (cen.x - c.x) * 0.15)), dy = Math.max(-6, Math.min(6, (cen.y - c.y) * 0.1));
            const nearField = neighbors(cell.q, cell.r).some(([a, b]) => Board.isFamily(board.get(a, b), 'field'));
            const r = rng();
            if (isCenter) { push({ x: c.x + (dx >= 0 ? 4 : -4), y: c.y + 22 }, 'obj_well'); push({ x: c.x + (dx >= 0 ? -30 : 30), y: c.y + 30 + dy }, 'obj_house_small'); }
            else if (r < 0.34) push({ x: c.x + dx, y: c.y + 30 + dy }, 'obj_house');
            else if (r < 0.62) { push({ x: c.x + dx - 8, y: c.y + 28 + dy }, 'obj_house_small'); push({ x: c.x + 30, y: c.y + 12 }, rng() < 0.5 ? 'obj_hay' : 'obj_logPile'); }
            else if (r < 0.78) push({ x: c.x + dx, y: c.y + 30 + dy }, 'obj_villa');
            else if (r < 0.9 && nearField) { push({ x: c.x + dx, y: c.y + 30 + dy }, 'obj_farm'); push({ x: c.x - 32, y: c.y + 4 }, 'obj_hay'); }
            else { push({ x: c.x + dx + 10, y: c.y + 26 + dy }, 'obj_house_small'); push({ x: c.x - 28, y: c.y + 8 }, 'obj_tinyBuilding'); }
            if (L2(cell)) { push({ x: c.x + (dx >= 0 ? 30 : -30), y: c.y - 4 }, 'obj_house_small'); push({ x: c.x + (dx >= 0 ? -26 : 26), y: c.y - 10 }, 'obj_tinyBuilding'); }
            if (rng() < 0.45) push({ x: c.x + (dx >= 0 ? 34 : -34), y: c.y + 36 }, 'obj_fence');
            for (const p of sample(rng, cell, keys, 2, { minDist: 18, margin: 8, placed: [] })) push(p, PICK(rng, ['obj_flowerWhite', 'obj_flowerRed', 'obj_flowerBlue']), { seasons: ['spring'] });
            push({ x: c.x + (dx >= 0 ? -36 : 36), y: c.y + 14 }, 'obj_banner', { seasons: ['summer'], notRules: ['foire'] });
            push({ x: c.x + (dx >= 0 ? -36 : 36), y: c.y + 14 }, 'obj_banner', { rules: ['foire'] });
            if (rng() < 0.6) push({ x: c.x + (dx >= 0 ? 30 : -30), y: c.y + 8 }, 'obj_logPile', { seasons: ['autumn', 'winter'] });
            push({ x: c.x + (dx >= 0 ? -30 : 30), y: c.y + 40 }, 'obj_logPile', { rules: ['froid'] });
            if (closed && isCenter) push({ x: c.x + 26, y: c.y + 6 }, 'obj_lightpost');
          } else if (family === 'orchard') {
            const sx = L2(cell) ? 27 : 36, sy = L2(cell) ? 25 : 33, ox = (reg.id.length * 7) % sx, oy = (reg.id.length * 11) % sy;
            const x0 = Math.floor((c.x - 70 - ox) / sx) * sx + ox, y0 = Math.floor((c.y - 80 - oy) / sy) * sy + oy;
            for (let y = y0; y < c.y + 80; y += sy) for (let x = x0 + ((Math.round((y - oy) / sy) % 2) ? sx / 2 : 0); x < c.x + 70; x += sx) {
              const p = { x: x + (rng() - 0.5) * 6, y: y + (rng() - 0.5) * 6 };
              if (inRegion(p, keys) !== ck || !edgeOk(p, ck, keys, 9)) continue;
              push(p, 'obj_treeRound_fruit_{s}', { notSeasons: ['spring'] }); push(p, 'obj_treeRound_blossom', { seasons: ['spring'] });
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
            for (const p of sample(rng, cell, keys, 2, { minDist: 18, margin: 8, placed })) { placed.push(p); push(p, PICK(rng, ['obj_flowerWhite', 'obj_flowerBlue']), { seasons: ['spring'] }); }
            for (const p of sample(rng, cell, keys, 2, { minDist: 18, margin: 8, placed: [] })) push(p, 'obj_bushGrass_dry', { weathers: ['heat'] });
          } else if (family === 'rock') {
            if (cells.length === 1) { push({ x: c.x - 6, y: c.y + 36 }, 'obj_rockGrey_large{w}', { scale: L2(cell) ? 1.3 : 0.9 }); push({ x: c.x + 34, y: c.y + 18 }, 'obj_rockGrey_small2{w}'); push({ x: c.x - 34, y: c.y + 24 }, 'obj_rockGrey_small4{w}'); }
            else {
              // massif : les crêtes sont posées à cheval sur les arêtes communes, les gros sommets sur les cellules intérieures
              const dc = Math.hypot(c.x - cen.x, c.y - cen.y);
              const peak = deg >= 3 || dc < 40;
              push({ x: c.x + (rng() - 0.5) * 12, y: c.y + 44 }, peak ? 'obj_rockGrey_large{w}' : PICK(rng, ['obj_rockGrey_medium1{w}', 'obj_rockGrey_medium3{w}']), { scale: (peak ? 1.35 + Math.min(0.5, cells.length * 0.06) : 1.15) + (L2(cell) ? 0.35 : 0) });
              for (let d = 0; d < 6; d++) { const nk = key(cell.q + DIRS[d][0], cell.r + DIRS[d][1]); if (!keys.has(nk) || d >= 3) continue; const m = edgeMid(c.x, c.y, d); push({ x: m.x + (rng() - 0.5) * 10, y: m.y + 26 }, PICK(rng, ['obj_rockGrey_medium2{w}', 'obj_rockGrey_medium3{w}', 'obj_rockGrey_large{w}']), { scale: 1.05 }); }
              for (const p of sample(rng, cell, keys, 2, { minDist: 22, margin: 6, placed })) { placed.push(p); push(p, PICK(rng, ['obj_rockGrey_small1{w}', 'obj_rockGrey_small3{w}', 'obj_rockGrey_small4{w}'])); }
            }
            for (const p of sample(rng, cell, keys, 1, { minDist: 22, margin: 8, placed: [] })) push(p, 'obj_moss', { seasons: ['spring'] });
          } else if (family === 'sand') {
            if (rng() < 0.35) for (const p of sample(rng, cell, keys, 1, { minDist: 30, margin: 12, placed })) { placed.push(p); push(p, 'obj_rockBrown_small{w}'); }
          } else if (family === 'hill') {
            for (const p of sample(rng, cell, keys, L2(cell) ? 5 : 2, { minDist: L2(cell) ? 18 : 26, margin: 12, placed, yMax: 8, radius: 0.7 })) { placed.push(p); push(p, PICK(rng, ['obj_treePine_small_{s}', 'obj_treeRound_small_{s}', 'obj_bushGrass_{s}'])); }
            for (const p of sample(rng, cell, keys, 2, { minDist: 22, margin: 12, placed: [], yMax: 8, radius: 0.7 })) push(p, PICK(rng, ['obj_flowerYellow', 'obj_flowerBlue']), { seasons: ['spring'] });
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 12, placed: [], yMax: 8, radius: 0.7 })) push(p, 'obj_snowdrift', { seasons: ['winter'] });
          } else if (family === 'heath') {
            for (const p of sample(rng, cell, keys, L2(cell) ? 7 : 3, { minDist: L2(cell) ? 12 : 17, margin: 5, placed })) { placed.push(p); push(p, 'obj_heather_{s}'); }
            if (rng() < 0.4) for (const p of sample(rng, cell, keys, 1, { minDist: 22, margin: 10, placed })) { placed.push(p); push(p, 'obj_rockGrey_small3{w}'); }
            for (const p of sample(rng, cell, keys, 1, { minDist: 26, margin: 10, placed: [] })) push(p, 'obj_snowdrift', { seasons: ['winter'] });
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
