// Rendu d'une île : mer, cases vides, tuiles par saison, survol et prévisualisation, faune, effets.
import { Assets } from '../core/assets.js';
import { toWorld, corners, parse, key, DIRS, edgeMid, TILE_W, TILE_H, SIZE } from './hex.js';
import { FAMILY_COLORS, SEASONS } from '../data/tiles.js';
import { clamp, lerp, TAU, easeOutCubic, rnd } from '../core/math.js';

import { STAGE } from '../core/stage.js';
import { Decor, groundOf, groundKey, GROUND_COLORS, spriteKey } from './decor.js';
import { computeLinks } from './paths.js';
const SEA = { spring: ['#8fc8e6', '#5f9fc8'], summer: ['#7fc0e4', '#4f93c2'], autumn: ['#8cb9d3', '#5d8fb3'], winter: ['#a9c7db', '#7aa2bf'] };
const WATER = { spring: { fill: '#5aa7d6', edge: '#3f86b6', foam: 'rgba(255,255,255,0.55)' }, summer: { fill: '#4f9ed2', edge: '#397fb0', foam: 'rgba(255,255,255,0.5)' }, autumn: { fill: '#5b95bd', edge: '#41769a', foam: 'rgba(255,255,255,0.45)' }, winter: { fill: '#6f9fc0', edge: '#4f7f9f', foam: 'rgba(255,255,255,0.4)' } };
const ICE = { fill: '#dbe9f4', edge: '#b9cfe0', foam: 'rgba(255,255,255,0.8)' };

export class IslandRenderer {
  constructor(island, camera, effects, particles) {
    this.isl = island; this.cam = camera; this.fx = effects; this.p = particles;
    this.time = 0;
    this.hover = null;          // { q, r, preview }
    this.budMode = false;
    this.transition = null;     // { from, to, t }
    this.waveImgs = Assets.keysStarting('sea_wave_').map((k) => Assets.img(k));
    this.faunaImgs = {};
    this.hexMask = Assets.img('hex_mask'); this.hexOutline = Assets.img('hex_outline'); this.hexShadow = Assets.img('hex_shadow');
    this.waves = [];
    for (let i = 0; i < 40; i++) this.waves.push({ x: rnd(-1400, 1400), y: rnd(-900, 900), t: rnd(0, 10), s: rnd(0.6, 1.1) });
    this.faunaPos = new Map();  // clé -> { x, y, bob }
    this.decor = new Decor((island.def && island.def.seed) || 1);
    this.weather = null; this.flash = 0; this.rain = [];
    this.wander = new Map();   // faune : position et cible de déplacement par clé
    this.legacy = !Assets.has('ground_grass_spring');   // manifeste sans sols/objets : tuiles composées (repli)
  }

  startTransition(from, to) { this.transition = { from, to, t: 0 }; }

  seasonFor(worldX) {
    const s = this.isl.season;
    if (!this.transition) return s;
    // balayage diagonal de gauche à droite
    const p = this.transition.t / 1.6;
    const sx = this.cam.toScreen(worldX, 0).x;
    const sweep = -200 + p * (STAGE.W + 400);
    return sx < sweep ? this.transition.to : this.transition.from;
  }

  tileImage(t, season) {
    let fam = t.family, variant = t.variant || 1;
    if (t.dry && fam === 'meadow') { fam = 'dry_meadow'; variant = 1; }
    if (t.frozen && fam === 'water') { const k = `water_frozen_${variant}_${season}`; if (Assets.has(k)) return Assets.img(k); if (Assets.has('water_frozen')) return Assets.img('water_frozen'); }
    const k = `${fam}_${variant}_${season}`;
    if (Assets.has(k)) return Assets.img(k);
    const alt = Assets.keysStarting(`${fam}_`).find((x) => x.endsWith(`_${season}`)) || Assets.keysStarting(`${fam}_`)[0];
    return alt ? Assets.img(alt) : null;
  }

  render(ctx, alpha, dt) {
    this.time += dt;
    if (this.transition) { this.transition.t += dt * (this.transitionSpeed || 1); if (this.transition.t > 1.9) { this.transition = null; this.transitionSpeed = 1; } }
    const isl = this.isl, cam = this.cam;
    const season = isl.season;
    this.drawSea(ctx, season);
    this.drawShallows(ctx);
    this.drawEmptyCells(ctx);
    if (this.legacy) this.drawTiles(ctx); else this.drawLayered(ctx);
    this.particlesWorld(ctx, 0);
    this.drawHover(ctx);
    this.drawRings(ctx);
    this.drawFauna(ctx, dt);
    this.particlesWorld(ctx, 1);
    this.drawTexts(ctx);
    this.drawWeather(ctx, dt);
    this.drawTransition(ctx);
  }

  /** Particules exprimées en coordonnées monde : on applique la caméra avant de les dessiner. */
  particlesWorld(ctx, layer) {
    const cam = this.cam;
    ctx.save(); ctx.translate(STAGE.W / 2 + cam.offsetX, STAGE.H / 2 + cam.offsetY); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
    this.p.render(ctx, layer);
    ctx.restore();
  }

  drawSea(ctx, season) {
    const tr = this.transition;
    const cols = SEA[season] || SEA.spring;
    const g = ctx.createLinearGradient(0, 0, 0, STAGE.H);
    g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, STAGE.W, STAGE.H);
    // vagues discrètes
    ctx.save();
    for (const w of this.waves) {
      w.t += 0.016;
      const p = this.cam.toScreen(w.x + Math.sin(w.t * 0.5) * 10, w.y);
      if (p.x < -60 || p.x > STAGE.W + 60 || p.y < -30 || p.y > STAGE.H + 30) continue;
      const img = this.waveImgs[Math.floor(w.t * 0.7) % Math.max(1, this.waveImgs.length)];
      const a = 0.25 + 0.2 * Math.sin(w.t * 1.3);
      ctx.globalAlpha = a;
      if (img) ctx.drawImage(img, p.x - 18 * w.s * this.cam.zoom, p.y - 5 * w.s * this.cam.zoom, 36 * w.s * this.cam.zoom, 10 * w.s * this.cam.zoom);
      else { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x - 12 * w.s, p.y); ctx.quadraticCurveTo(p.x, p.y - 4 * w.s, p.x + 12 * w.s, p.y); ctx.stroke(); }
    }
    ctx.restore();
  }

  /** Halo de haut-fond autour de l'île (union d'hexagones élargis). */
  drawShallows(ctx) {
    const cam = this.cam;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    for (const k of this.isl.board.mask) {
      const [q, r] = parse(k); const w = toWorld(q, r); const c = cam.toScreen(w.x, w.y);
      const pts = corners(c.x, c.y, SIZE * cam.zoom * 1.28);
      ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  drawEmptyCells(ctx) {
    const cam = this.cam, b = this.isl.board;
    const legal = new Set(b.legalCells().map((c) => key(c.q, c.r)));
    ctx.save();
    for (const k of b.mask) {
      if (b.tiles.has(k)) continue;
      const [q, r] = parse(k); const w = toWorld(q, r); const c = cam.toScreen(w.x, w.y);
      if (c.x < -100 || c.x > STAGE.W + 100 || c.y < -100 || c.y > STAGE.H + 100) continue;
      const pts = corners(c.x, c.y, SIZE * cam.zoom * 0.96);
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
      if (this.finale) { ctx.fillStyle = 'rgba(244,239,230,0.14)'; ctx.fill(); continue; }
      ctx.fillStyle = legal.has(k) ? 'rgba(244,239,230,0.55)' : 'rgba(244,239,230,0.28)';
      ctx.fill();
      ctx.strokeStyle = legal.has(k) ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)';
      ctx.lineWidth = legal.has(k) ? 1.5 : 1; ctx.setLineDash(legal.has(k) ? [] : [4, 6]);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTileAt(ctx, t, cx, cy, scale = 1, alpha = 1, seasonOverride = null) {
    const season = seasonOverride || this.seasonFor(toWorld(t.q, t.r).x);
    const img = this.tileImage(t, season);
    const z = this.cam.zoom * scale;
    if (!img) { const pts = corners(cx, cy, SIZE * z); ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = FAMILY_COLORS[t.family] || '#999'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); ctx.restore(); return; }
    const w = TILE_W * z, h = TILE_H * z;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  }

  drawTiles(ctx) {
    const cam = this.cam, b = this.isl.board;
    const list = [...b.tiles.values()].sort((a, c) => (a.r - c.r) || (a.q - c.q));
    // ombres
    if (this.hexShadow) {
      ctx.save(); ctx.globalAlpha = 0.28;
      for (const t of list) { const w = toWorld(t.q, t.r); const c = cam.toScreen(w.x, w.y); const z = cam.zoom; ctx.drawImage(this.hexShadow, c.x - TILE_W * z / 2 + 4 * z, c.y - TILE_H * z / 2 + 10 * z, TILE_W * z, TILE_H * z); }
      ctx.restore();
    }
    for (const t of list) {
      const w = toWorld(t.q, t.r); const c = cam.toScreen(w.x, w.y);
      if (c.x < -150 || c.x > STAGE.W + 150 || c.y < -160 || c.y > STAGE.H + 160) continue;
      const d = this.fx.dropTransform(key(t.q, t.r));
      this.drawTileAt(ctx, t, c.x, c.y + d.dy * cam.zoom, d.s, 1);
      if (t.bloom) this.drawBloom(ctx, c.x, c.y);
    }
  }

  /**
   * Rendu par couches : ombres → sols → raccords entre sols identiques → sentiers → objets du décor (triés par pied) et tuiles rares.
   * Les objets sont générés par région (src/game/decor.js), ce qui donne forêts continues, massifs et villages.
   */
  drawLayered(ctx) {
    const cam = this.cam, b = this.isl.board, z = cam.zoom;
    this.decor.sync(b);
    const tiles = [...b.tiles.values()];
    const vis = (c, m = 170) => !(c.x < -m || c.x > STAGE.W + m || c.y < -m || c.y > STAGE.H + m);
    if (this.hexShadow) {
      ctx.save(); ctx.globalAlpha = 0.28;
      for (const t of tiles) { const w = toWorld(t.q, t.r); const c = cam.toScreen(w.x, w.y); if (!vis(c)) continue; ctx.drawImage(this.hexShadow, c.x - TILE_W * z / 2 + 4 * z, c.y - TILE_H * z / 2 + 10 * z, TILE_W * z, TILE_H * z); }
      ctx.restore();
    }
    // sols
    const dropping = new Map();
    const images = Assets.manifest().images || {};
    for (const t of tiles) {
      const w = toWorld(t.q, t.r); const c = cam.toScreen(w.x, w.y);
      const k = key(t.q, t.r); const d = this.fx.dropTransform(k); if (d.dy !== 0 || d.s !== 1) dropping.set(k, d);
      if (!vis(c)) continue;
      const img = t.family === 'water' ? this.waterGround(t, this.seasonFor(w.x)) : Assets.img(groundKey(this.decor.groundFor(t), this.seasonFor(w.x)));
      const zz = z * d.s, cy = c.y + d.dy * z;
      if (img) ctx.drawImage(img, c.x - TILE_W * zz / 2, cy - TILE_H * zz / 2, TILE_W * zz, TILE_H * zz);
      else this.drawTileAt(ctx, t, c.x, cy, d.s, 1);
    }
    // lagunes (trous du masque entourés de terre) : sol de rive puis mare, dessinées comme un étang
    for (const h of this.decor.holes || []) {
      const w = toWorld(h.q, h.r); const c = cam.toScreen(w.x, w.y); if (!vis(c)) continue;
      const img = this.waterGround(h, this.seasonFor(w.x)); if (img) ctx.drawImage(img, c.x - TILE_W * z / 2, c.y - TILE_H * z / 2, TILE_W * z, TILE_H * z);
    }
    // raccords : un ruban de la couleur du sol sur chaque arête partagée par deux sols identiques (efface la couture)
    ctx.save();
    const half = SIZE * 0.46, e = 7;
    for (const t of tiles) {
      const k = key(t.q, t.r); if (dropping.has(k)) continue;
      const g = this.decor.groundFor(t); if (g === 'hill') continue;
      const w = toWorld(t.q, t.r);
      for (let d = 0; d < 3; d++) {
        const n = b.get(t.q + DIRS[d][0], t.r + DIRS[d][1]);
        if (!n || dropping.has(key(n.q, n.r))) continue;
        // avec une tuile d'eau voisine, la rive du côté concerné est déjà dans notre sol : on raccorde aussi
        const gn = this.decor.groundFor(n); if (gn !== g && !(n.family === 'water' && g !== 'water')) continue;
        if (t.family === 'water' && n.family === 'water') continue;
        const season = this.seasonFor(w.x);
        const col = GROUND_COLORS[g] || (images[groundKey(g, season)] || {}).ground_color; if (!col) continue;
        const m = edgeMid(w.x, w.y, d); const nx = m.x - w.x, ny = m.y - w.y; const len = Math.hypot(nx, ny) || 1; const ux = nx / len, uy = ny / len, tx = -uy, ty = ux;
        const quad = [[m.x + tx * half - ux * e, m.y + ty * half - uy * e], [m.x + tx * half + ux * e, m.y + ty * half + uy * e], [m.x - tx * half + ux * e, m.y - ty * half + uy * e], [m.x - tx * half - ux * e, m.y - ty * half - uy * e]].map(([x, y]) => cam.toScreen(x, y));
        if (!vis(quad[0], 120)) continue;
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(quad[0].x, quad[0].y); for (let i = 1; i < 4; i++) ctx.lineTo(quad[i].x, quad[i].y); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
    this.drawWater(ctx, dropping);
    this.drawPaths(ctx);
    // objets
    const rule = this.isl.rule || null, wkey = this.weather || null;
    for (const o of this.decor.objects) {
      const c = cam.toScreen(o.x, o.y); if (!vis(c)) continue;
      const d = dropping.get(o.cell); const season = this.seasonFor(o.x);
      if (o.seasons && !o.seasons.includes(season)) continue;
      if (o.notSeasons && o.notSeasons.includes(season)) continue;
      if (o.weathers && !o.weathers.includes(wkey)) continue;
      if (o.rules && !o.rules.includes(rule)) continue;
      if (o.notRules && o.notRules.includes(rule)) continue;
      if (o.composed) { const cw = toWorld(o.tile.q, o.tile.r); const cc = cam.toScreen(cw.x, cw.y); const dd = d || { s: 1, dy: 0 }; this.drawTileAt(ctx, o.tile, cc.x, cc.y + dd.dy * z, dd.s, 1); continue; }
      const sk = spriteKey(o.tpl, season); const img = Assets.img(sk); if (!img) continue;
      const m = images[sk]; const div = o.wave ? 3 : 2;
      const os = o.scale || 1;
      const w = (m ? m.w : img.width) / div * os, h = (m ? m.h : img.height) / div * os;
      const sc = d ? z * d.s : z, dy = d ? d.dy * z : 0;
      ctx.save();
      if (o.alpha) ctx.globalAlpha = o.alpha;
      if (o.flip) { ctx.translate(c.x, c.y + dy); ctx.scale(-1, 1); ctx.drawImage(img, -w * sc / 2, -h * sc, w * sc, h * sc); }
      else ctx.drawImage(img, c.x - w * sc / 2, c.y + dy - h * sc, w * sc, h * sc);
      ctx.restore();
    }
    for (const t of tiles) if (t.bloom) { const w = toWorld(t.q, t.r); const c = cam.toScreen(w.x, w.y); if (vis(c)) this.drawBloom(ctx, c.x, c.y); }
  }

  /**
   * Plans d'eau : étang (mare ronde), lac (nappe continue aux coutures effacées, rive sur le pourtour), rivière (ruban
   * courbe de la source à l'embouchure, rides animées). Les rives reprennent le sol des voisines (dessiné en dessous).
   */
  drawWater(ctx, dropping) {
    const cam = this.cam, z = cam.zoom, b = this.isl.board;
    const bodies = this.decor.water && this.decor.water.bodies ? this.decor.water.bodies : [];
    if (!bodies.length && !(this.decor.holes && this.decor.holes.length)) return;
    const vis = (c, m = 200) => !(c.x < -m || c.x > STAGE.W + m || c.y < -m || c.y > STAGE.H + m);
    const S = (p) => cam.toScreen(p.x, p.y);
    const jit = (a, c) => { const h = Math.sin(a.x * 12.9898 + a.y * 78.233 + c.x * 37.719 + c.y * 4.1) * 43758.5453; return (h - Math.floor(h)) - 0.5; };
    const trace = (sp) => { ctx.beginPath(); ctx.moveTo(sp[0].x, sp[0].y); if (sp.length === 2) ctx.lineTo(sp[1].x, sp[1].y); else { for (let i = 1; i < sp.length - 1; i++) { const mx = (sp[i].x + sp[i + 1].x) / 2, my = (sp[i].y + sp[i + 1].y) / 2; ctx.quadraticCurveTo(sp[i].x, sp[i].y, mx, my); } ctx.lineTo(sp[sp.length - 1].x, sp[sp.length - 1].y); } };
    const meander = (pts) => {
      const out = [pts[0]]; let side = jit(pts[0], pts[pts.length - 1]) > 0 ? 1 : -1;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], c = pts[i + 1]; const dx = c.x - a.x, dy = c.y - a.y, len = Math.hypot(dx, dy) || 1; const nx = -dy / len, ny = dx / len;
        const amp = 14 + 10 * Math.abs(jit(a, c)) * 2, amp2 = 10 + 8 * Math.abs(jit(c, a)) * 2;
        out.push({ x: a.x + dx * 0.25 + nx * side * amp, y: a.y + dy * 0.25 + ny * side * amp });
        out.push({ x: a.x + dx * 0.5 + nx * jit(a, c) * 6, y: a.y + dy * 0.5 + ny * jit(a, c) * 6 });
        out.push({ x: a.x + dx * 0.75 - nx * side * amp2, y: a.y + dy * 0.75 - ny * side * amp2 });
        out.push(c);
      }
      return out;
    };
    // tracé lissé tronçon par tronçon, largeur variable (bouts ronds)
    const tapered = (sp, wAt, mul, color) => {
      ctx.strokeStyle = color;
      if (sp.length < 3) { ctx.lineWidth = wAt(0) * mul; ctx.beginPath(); ctx.moveTo(sp[0].x, sp[0].y); ctx.lineTo(sp[sp.length - 1].x, sp[sp.length - 1].y); ctx.stroke(); return; }
      let px = sp[0].x, py = sp[0].y;
      for (let i = 1; i < sp.length - 1; i++) {
        const mx = (sp[i].x + sp[i + 1].x) / 2, my = (sp[i].y + sp[i + 1].y) / 2;
        ctx.lineWidth = wAt(i) * mul; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(sp[i].x, sp[i].y, mx, my); ctx.stroke(); px = mx; py = my;
      }
      ctx.lineWidth = wAt(sp.length - 1) * mul; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sp[sp.length - 1].x, sp[sp.length - 1].y); ctx.stroke();
    };
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const h of this.decor.holes || []) {
      // lagune : une mare comme un étang, gelée en hiver
      const c0 = toWorld(h.q, h.r); const c = S(c0); if (!vis(c)) continue;
      const frozen = this.isl.season === 'winter'; const pal = frozen ? ICE : (WATER[this.seasonFor(c0.x)] || WATER.spring);
      const rr = SIZE * 0.7 * z; ctx.fillStyle = pal.edge; this.blob(ctx, c.x, c.y + 2 * z, rr, c0); ctx.fill();
      ctx.fillStyle = pal.fill; this.blob(ctx, c.x, c.y, rr * 0.9, c0); ctx.fill();
      if (!frozen) { ctx.strokeStyle = pal.foam; ctx.lineWidth = 1.5 * z; ctx.beginPath(); ctx.ellipse(c.x - rr * 0.2, c.y - rr * 0.25, rr * 0.35, rr * 0.16, -0.4, 0, TAU); ctx.stroke(); }
      else this.drawCracks(ctx, [c], z);
    }
    for (const body of bodies) {
      if (body.cells.some((c) => dropping.has(key(c.q, c.r)))) continue;
      const frozen = body.cells.every((c) => c.frozen);
      const c0 = toWorld(body.cells[0].q, body.cells[0].r);
      const pal = frozen ? ICE : (WATER[this.seasonFor(c0.x)] || WATER.spring);
      if (body.kind === 'river') {
        // ruban de la source à l'embouchure, prolongé vers la montagne et vers la mer
        const pts = body.chain.map((k) => { const [q, r] = parse(k); return toWorld(q, r); });
        const first = body.cells.find((c) => key(c.q, c.r) === body.chain[0]); const last = body.cells.find((c) => key(c.q, c.r) === body.chain[body.chain.length - 1]);
        const ext = (cell, pred, pt, len) => { for (let d = 0; d < 6; d++) { const n = b.get(cell.q + DIRS[d][0], cell.r + DIRS[d][1]); const sea = b.isSea(cell.q + DIRS[d][0], cell.r + DIRS[d][1]); if (pred(n, sea)) { const m = edgeMid(pt.x, pt.y, d); return { x: pt.x + (m.x - pt.x) * len, y: pt.y + (m.y - pt.y) * len }; } } return null; };
        const src = first ? ext(first, (n) => n && (n.family === 'rock' || n.family === 'hill' || (n.rare && (n.family === 'watchtower' || n.family === 'mine'))), pts[0], 0.75) : null;
        const mouth = body.mouth && last ? ext(last, (n, sea) => sea, pts[pts.length - 1], 1.05) : null;
        // méandres : trois points par segment, décalés en alternance d'un côté puis de l'autre (serpent) avec une part de hasard déterministe
        const full = meander([...(src ? [src] : []), ...pts, ...(mouth ? [mouth] : [])]);
        const sp = full.map(S); if (!sp.some((p) => vis(p))) continue;
        // filet qui s'élargit de la source à l'embouchure : chaque tronçon lissé a sa propre largeur (bouts ronds : pas de joint visible)
        const wAt = (i) => { const t = i / Math.max(1, sp.length - 1); return (16 + 12 * t + 3 * Math.sin(i * 2.3)) * z; };
        ctx.globalAlpha = 1;
        tapered(sp, wAt, 1.45, pal.edge); tapered(sp, wAt, 1, pal.fill);
        if (mouth) { const m = S(mouth); ctx.fillStyle = pal.fill; ctx.beginPath(); ctx.ellipse(m.x, m.y, 26 * z, 16 * z, 0, 0, TAU); ctx.fill(); }
        if (!frozen) { ctx.strokeStyle = pal.foam; ctx.lineWidth = (this.finale ? 3 : 1.5) * z; ctx.setLineDash([8 * z, 22 * z]); ctx.lineDashOffset = -this.time * (this.finale ? 120 : 40) * z; trace(sp); ctx.stroke(); ctx.setLineDash([]); }
        else this.drawCracks(ctx, sp, z);
      } else if (body.kind === 'pond') {
        const c = S(c0); if (!vis(c)) continue;
        const rr = SIZE * 0.66 * z; ctx.fillStyle = pal.edge; this.blob(ctx, c.x, c.y + 2 * z, rr, c0); ctx.fill();
        ctx.fillStyle = pal.fill; this.blob(ctx, c.x, c.y, rr * 0.9, c0); ctx.fill();
        if (!frozen) { ctx.strokeStyle = pal.foam; ctx.lineWidth = 1.5 * z; ctx.beginPath(); ctx.ellipse(c.x - rr * 0.2, c.y - rr * 0.25, rr * 0.35, rr * 0.16, -0.4, 0, TAU); ctx.stroke(); }
      } else {
        // lac : union de mares arrondies (une par case, forme irrégulière) reliées par des ponts arrondis entre cases voisines ;
        // tout est de la même couleur, donc aucune couture : le lac devient une nappe organique aux rives lobées
        const cs = body.cells.map((cell) => { const w = toWorld(cell.q, cell.r); return { w, s: S(w), cell }; });
        if (!cs.some((c) => vis(c.s))) continue;
        const bridges = []; for (const a of cs) for (let d = 0; d < 3; d++) { const nk = key(a.cell.q + DIRS[d][0], a.cell.r + DIRS[d][1]); if (!body.keys.has(nk)) continue; const o = cs.find((c) => key(c.cell.q, c.cell.r) === nk); if (o) bridges.push([a, o]); }
        const nappe = (color, grow) => {
          ctx.fillStyle = color; ctx.strokeStyle = color;
          for (const c of cs) { this.blob(ctx, c.s.x, c.s.y, (SIZE * 0.86 + grow) * z, c.w); ctx.fill(); }
          ctx.lineWidth = (SIZE * 1.05 + grow * 2) * z; ctx.beginPath(); for (const [a, o] of bridges) { ctx.moveTo(a.s.x, a.s.y); ctx.lineTo(o.s.x, o.s.y); } ctx.stroke();
        };
        nappe(pal.edge, 7); nappe(pal.fill, 0);
        if (!frozen) {
          // reflets : une ride par case, placée de façon déterministe
          ctx.strokeStyle = pal.foam; ctx.lineWidth = 1.5 * z; ctx.beginPath();
          for (const c of cs) { const j = jit(c.w, { x: 1, y: 1 }); const rr = SIZE * 0.86 * z; ctx.moveTo(c.s.x - rr * 0.3 + j * rr * 0.4, c.s.y - rr * 0.2 + j * rr * 0.3); ctx.bezierCurveTo(c.s.x - rr * 0.1, c.s.y - rr * 0.35 + j * rr * 0.3, c.s.x + rr * 0.1, c.s.y - rr * 0.05 + j * rr * 0.3, c.s.x + rr * 0.3, c.s.y - rr * 0.2 + j * rr * 0.3); }
          ctx.stroke();
        } else this.drawCracks(ctx, cs.map((c) => c.s), z);
      }
    }
    ctx.restore();
  }

  /**
   * Sol d'une tuile d'eau : le sol majoritaire de ses voisines, sur lequel chaque voisine d'un autre sol déborde en une
   * lentille fondue centrée sur le milieu du bord partagé (dégradé radial, pas de couture ni de secteur). Mis en cache par
   * signature (sol de base, sol par côté, saison), car les combinaisons sont peu nombreuses.
   */
  waterGround(t, season) {
    const b = this.isl.board; const base = this.decor.groundFor(t);
    const gs = []; for (let d = 0; d < 6; d++) { const n = b.get(t.q + DIRS[d][0], t.r + DIRS[d][1]); let g = n && n.family !== 'water' ? this.decor.groundFor(n) : ''; if (g === 'hill') g = 'grass'; gs.push(g === base ? '' : g); }
    const sig = `${base}|${gs.join(',')}|${season}`;
    this._wg = this._wg || new Map(); const hit = this._wg.get(sig); if (hit) return hit;
    const baseImg = Assets.img(groundKey(base, season)); if (!baseImg) return null;
    const W = baseImg.width, H = baseImg.height, sc = W / TILE_W;   // images 2×
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    g.drawImage(baseImg, 0, 0);
    const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tg = tmp.getContext('2d');
    const c0 = toWorld(t.q, t.r);
    for (let d = 0; d < 6; d++) {
      if (!gs[d]) continue; const img = Assets.img(groundKey(gs[d], season)); if (!img) continue;
      const m = edgeMid(c0.x, c0.y, d); const mx = W / 2 + (m.x - c0.x) * sc, my = H / 2 + (m.y - c0.y) * sc;
      tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(img, 0, 0);
      const r = SIZE * 0.95 * sc; const grad = tg.createRadialGradient(mx, my, 0, mx, my, r);
      grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.45, 'rgba(0,0,0,0.9)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      tg.globalCompositeOperation = 'destination-in'; tg.fillStyle = grad; tg.fillRect(0, 0, W, H);
      g.drawImage(tmp, 0, 0);
    }
    this._wg.set(sig, cv); return cv;
  }

  /** Forme arrondie légèrement irrégulière (mare). */
  blob(ctx, cx, cy, r, seed) {
    const N = 28, pts = [];
    for (let i = 0; i < N; i++) { const a = (i / N) * TAU; const j = 0.92 + 0.08 * Math.sin(seed.x * 0.037 + seed.y * 0.011 + a * 3) + 0.05 * Math.cos(a * 5 + seed.y * 0.02); pts.push([cx + Math.cos(a) * r * j, cy + Math.sin(a) * r * 0.8 * j]); }
    ctx.beginPath(); ctx.moveTo((pts[0][0] + pts[N - 1][0]) / 2, (pts[0][1] + pts[N - 1][1]) / 2);
    for (let i = 0; i < N; i++) { const p = pts[i], q = pts[(i + 1) % N]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    ctx.closePath();
  }

  /** Fissures blanches sur la glace, le long d'une suite de points écran. */
  drawCracks(ctx, sp, z) {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5 * z; ctx.beginPath();
    for (let i = 0; i < sp.length; i++) { const p = sp[i]; const h = Math.sin(i * 7.3 + p.x * 0.01) * 20 * z; ctx.moveTo(p.x - 14 * z, p.y + h * 0.3); ctx.lineTo(p.x + 4 * z, p.y - 8 * z + h * 0.1); ctx.lineTo(p.x + 18 * z, p.y + 6 * z); }
    ctx.stroke();
  }

  /** Ruelles entre hameaux voisins et sentiers entre villages, tracés en courbes douces sous les objets. */
  drawPaths(ctx) {
    const b = this.isl.board, cam = this.cam, z = cam.zoom;
    const { lanes, links } = computeLinks(b);
    if (!lanes.length && !links.length) return;
    const season = this.isl.season;
    const col = { spring: '#c9a570', summer: '#d1ab74', autumn: '#bf9463', winter: '#dcd2c3' }[season] || '#c9a570';
    const dark = { spring: '#a37f4c', summer: '#ab864f', autumn: '#966f42', winter: '#b7ab9a' }[season] || '#a37f4c';
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const trace = (sp) => { ctx.beginPath(); ctx.moveTo(sp[0].x, sp[0].y); if (sp.length === 2) ctx.lineTo(sp[1].x, sp[1].y); else { for (let i = 1; i < sp.length - 1; i++) { const mx = (sp[i].x + sp[i + 1].x) / 2, my = (sp[i].y + sp[i + 1].y) / 2; ctx.quadraticCurveTo(sp[i].x, sp[i].y, mx, my); } ctx.lineTo(sp[sp.length - 1].x, sp[sp.length - 1].y); } };
    const w = (k) => { const [q, r] = parse(k); return toWorld(q, r); };
    // tracé organique : un point de contrôle décalé perpendiculairement au milieu de chaque segment (décalage déterministe par segment)
    const jit = (a, c) => { const h = Math.sin(a.x * 12.9898 + a.y * 78.233 + c.x * 37.719 + c.y * 4.1) * 43758.5453; return (h - Math.floor(h)) - 0.5; };
    const organic = (pts) => { const out = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], c = pts[i + 1]; const dx = c.x - a.x, dy = c.y - a.y, len = Math.hypot(dx, dy) || 1; const j = jit(a, c), j2 = jit(c, a); out.push({ x: a.x + dx * 0.35 + (-dy / len) * j * 26, y: a.y + dy * 0.35 + (dx / len) * j * 26 }); out.push({ x: a.x + dx * 0.7 + (-dy / len) * j2 * 18, y: a.y + dy * 0.7 + (dx / len) * j2 * 18 }); out.push(c); } return out; };
    const all = [...lanes.map(([a, c]) => ({ sp: organic([w(a), w(c)]).map((p) => cam.toScreen(p.x, p.y)), width: 6 })), ...links.map((l) => ({ sp: organic(l.cells.map(w)).map((p) => cam.toScreen(p.x, p.y)), width: 9 }))]
      .filter((o) => !o.sp.every((p) => p.x < -200 || p.x > STAGE.W + 200 || p.y < -200 || p.y > STAGE.H + 200));
    // trois passes globales (bordure sombre, terre, pointillé clair) pour que les croisements restent propres
    ctx.globalAlpha = 0.5; ctx.strokeStyle = dark; for (const o of all) { ctx.lineWidth = (o.width + 4) * z; trace(o.sp); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.strokeStyle = col; for (const o of all) { ctx.lineWidth = o.width * z; trace(o.sp); ctx.stroke(); }
    ctx.globalAlpha = 0.4; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4 * z; ctx.setLineDash([4 * z, 9 * z]); for (const o of all) { trace(o.sp); ctx.stroke(); } ctx.setLineDash([]);
    if (this.finale) { ctx.globalAlpha = 0.35 + 0.3 * Math.sin(this.time * 5); ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 4 * z; ctx.setLineDash([14 * z, 10 * z]); ctx.lineDashOffset = -this.time * 60 * z; for (const o of all) { trace(o.sp); ctx.stroke(); } ctx.setLineDash([]); }
    ctx.restore();
  }

  /** Voiles et pluie de la météo active (espace écran). */
  drawWeather(ctx, dt) {
    const w = this.weather; const W = STAGE.W, H = STAGE.H;
    if (this.flash > 0) { ctx.save(); ctx.globalAlpha = Math.min(0.5, this.flash * 2.5); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); this.flash -= dt; }
    if (!w || this.finale) { this.rain.length = 0; return; }
    if (w === 'storm') {
      while (this.rain.length < 160) this.rain.push({ x: Math.random() * (W + 200) - 100, y: Math.random() * H, l: 10 + Math.random() * 14, v: 700 + Math.random() * 400 });
      ctx.save(); ctx.strokeStyle = 'rgba(220,240,255,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (const d of this.rain) { d.y += d.v * dt; d.x -= d.v * 0.18 * dt; if (d.y > H + 20) { d.y = -30; d.x = Math.random() * (W + 200) - 60; } ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.18, d.y + d.l); }
      ctx.stroke();
      ctx.globalAlpha = 0.12; ctx.fillStyle = '#3a5a78'; ctx.fillRect(0, 0, W, H); ctx.restore();
    } else if (w === 'heat') {
      ctx.save(); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,200,110,0.16)'); g.addColorStop(1, 'rgba(255,160,80,0.06)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    } else if (w === 'blizzard') {
      ctx.save(); ctx.globalAlpha = 0.22 + 0.05 * Math.sin(this.time * 1.7); ctx.fillStyle = '#eef4fa'; ctx.fillRect(0, 0, W, H); ctx.restore();
    } else if (w === 'wind') {
      ctx.save(); ctx.globalAlpha = 0.18; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { const y = ((this.time * 60 + i * 137) % (H + 80)) - 40; const x = ((this.time * 380 + i * 331) % (W + 400)) - 200; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 60, y - 8, x + 130, y + 4); ctx.stroke(); }
      ctx.restore();
    }
  }

  drawBloom(ctx, cx, cy) {
    ctx.save(); ctx.globalAlpha = 0.8;
    for (let i = 0; i < 5; i++) { const a = this.time * 0.6 + i * 1.3; const r = 14 * this.cam.zoom; ctx.fillStyle = i % 2 ? '#fff6c9' : '#f7c8d8'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * 0.9 + 6 * this.cam.zoom, 2.2 * this.cam.zoom, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  drawHover(ctx) {
    if (this.isl.restrict) { const cam = this.cam; for (const k of this.isl.restrict) { const [q, r] = parse(k); const w = toWorld(q, r); const c = cam.toScreen(w.x, w.y); const pulse = 0.55 + 0.45 * Math.sin(this.time * 4); ctx.save(); ctx.globalAlpha = 0.35 * pulse; ctx.fillStyle = '#ffd77a'; const pts = corners(c.x, c.y, SIZE * cam.zoom * 0.95); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); ctx.restore(); this.outline(ctx, c.x, c.y, '#e0a33a', 0.6 + 0.4 * pulse); } }
    const hv = this.hover; if (!hv) return;
    const cam = this.cam;
    const w = toWorld(hv.q, hv.r); const c = cam.toScreen(w.x, w.y);
    const z = cam.zoom;
    if (this.budMode) {
      const t = this.isl.board.get(hv.q, hv.r);
      const ok = this.isl.canBud(hv.q, hv.r);
      this.outline(ctx, c.x, c.y, ok ? '#2f9e8f' : '#d95f4b', 0.9);
      return;
    }
    if (!hv.preview) { if (this.isl.board.has(hv.q, hv.r) && !this.isl.board.get(hv.q, hv.r)) this.outline(ctx, c.x, c.y, '#d95f4b', 0.6); return; }
    const pv = hv.preview;
    // régions qui se fermeraient
    for (const cl of pv.closes) {
      ctx.save(); ctx.globalAlpha = 0.45 + 0.2 * Math.sin(this.time * 6); ctx.fillStyle = '#ffd77a';
      for (const cell of cl.cells) { const ww = toWorld(cell.q, cell.r); const cc = cam.toScreen(ww.x, ww.y); const pts = corners(cc.x, cc.y, SIZE * z * 0.92); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    // tuile fantôme
    if (!pv.build) { const tile = { ...this.isl.current, q: hv.q, r: hv.r }; this.drawTileAt(ctx, tile, c.x, c.y - 6 * z, 1, 0.8, this.isl.season); }
    this.outline(ctx, c.x, c.y, pv.build ? '#e0a33a' : pv.total >= 0 ? '#2f9e8f' : '#d95f4b', 0.9);
    if (pv.build) { const p2 = 0.5 + 0.5 * Math.sin(this.time * 5); ctx.save(); ctx.globalAlpha = 0.18 + 0.12 * p2; ctx.fillStyle = '#ffd77a'; const pts = corners(c.x, c.y, SIZE * z * 0.92); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); ctx.restore(); }
    // points par bord
    ctx.save();
    ctx.font = `700 ${Math.round(14 * clamp(z, 0.8, 1.3))}px Quicksand, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const e of pv.edges) {
      const m = edgeMid(w.x, w.y, e.d); const s = cam.toScreen(m.x, m.y);
      this.pill(ctx, s.x, s.y, (e.pts > 0 ? '+' : '') + e.pts, e.pts > 0 ? (e.pts >= 2 ? '#e0a33a' : '#2f9e8f') : '#d95f4b');
    }
    for (let i = 0; i < pv.base.length; i++) { const bs = pv.base[i]; this.pill(ctx, c.x, c.y + (30 + i * 22) * z, `+${bs.pts} ${bs.label}`, '#5aa7d6'); }
    for (const cl of pv.closes) this.pill(ctx, c.x, c.y - (64) * z, `région close +${cl.bonus}`, '#e0a33a');
    if (pv.build) { const ok = pv.refund && pv.refund.ok; this.pill(ctx, c.x, c.y + 30 * z, `niveau ${pv.level} · ${pv.cost} souffle`, '#2b2a26'); this.pill(ctx, c.x, c.y + 52 * z, ok ? '↩ rend une tuile' : 'sans retour', ok ? '#2f9e8f' : '#8a867c'); }
    // total : badge nettement plus grand et plus contrasté que les pastilles de bord, avec son libellé
    const tz = clamp(z, 0.8, 1.3);
    const txt = `${pv.total >= 0 ? '+' : ''}${pv.total}`;
    ctx.font = `800 ${Math.round(30 * tz)}px Quicksand, sans-serif`;
    const bw = ctx.measureText(txt).width + 40 * tz, bh = 44 * tz, bx = c.x, by = c.y - 102 * z;
    const bg = pv.total > 0 ? '#2b2a26' : pv.total < 0 ? '#d95f4b' : '#6b6a66', accent = pv.total > 0 ? '#e0a33a' : '#ffffff';
    ctx.save(); ctx.shadowColor = 'rgba(20,30,40,0.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2); ctx.fill(); ctx.restore();
    ctx.strokeStyle = accent; ctx.lineWidth = 2.5 * tz; ctx.beginPath(); ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, bx, by + 1);
    ctx.font = `700 ${Math.round(11 * tz)}px Quicksand, sans-serif`; ctx.fillStyle = '#2b2a26';
    const lab = pv.build ? 'BÂTIR' : 'TOTAL', lw = ctx.measureText(lab).width + 14 * tz;
    ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(bx - lw / 2, by - bh / 2 - 15 * tz, lw, 16 * tz, 8 * tz); ctx.fill();
    ctx.fillStyle = pv.total > 0 ? '#2b2a26' : '#d95f4b'; ctx.fillText(lab, bx, by - bh / 2 - 7 * tz);
    ctx.restore();
  }

  pill(ctx, x, y, text, bg, fg = '#fff') {
    const w = ctx.measureText(text).width + 14, h = parseInt(ctx.font, 10) + 8;
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.fillText(text, x, y + 1);
  }

  outline(ctx, cx, cy, color, alpha) {
    const pts = corners(cx, cy, SIZE * this.cam.zoom * 0.97);
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 3 * this.cam.zoom + 1; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.stroke(); ctx.restore();
  }

  drawRings(ctx) {
    const cam = this.cam;
    for (const r of this.fx.rings) {
      const t = r.t / 1.3, e = easeOutCubic(Math.min(1, t));
      ctx.save(); ctx.globalAlpha = (1 - t) * 0.9; ctx.strokeStyle = r.color; ctx.lineWidth = 4 * cam.zoom * (1 - t) + 1;
      for (const cell of r.cells) { const w = toWorld(cell.q, cell.r); const c = cam.toScreen(w.x, w.y); const pts = corners(c.x, c.y, SIZE * cam.zoom * (0.9 + e * 0.25)); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.stroke(); }
      ctx.restore();
    }
  }

  /** Position animée d'un animal : il se déplace lentement de case en case dans sa région. */
  wanderPos(k, a, dt) {
    const HAB = { rabbit: 'meadow', cow: 'meadow', moose: 'forest', bear: 'forest', owl: 'forest', duck: 'water', penguin: 'water', frog: 'marsh', chicken: 'hamlet', horse: 'hill' };
    const home = toWorld(a.q, a.r);
    let st = this.wander.get(k);
    if (!st) { st = { x: home.x, y: home.y, tx: home.x, ty: home.y, wait: 1 + Math.random() * 3, hop: 0 }; this.wander.set(k, st); }
    st.wait -= dt;
    const fam = HAB[a.species];
    if (st.wait <= 0 && fam) {
      const reg = this.isl.board.region(a.q, a.r, fam);
      const cells = reg ? reg.cells.filter((c) => !c.rare && !(fam === 'meadow' && c.dry) && !(fam === 'water' && c.frozen !== (a.species === 'penguin'))) : [];
      const c = cells.length ? cells[Math.floor(Math.random() * cells.length)] : null;
      const t = c ? toWorld(c.q, c.r) : home;
      st.tx = t.x + (Math.random() - 0.5) * 36; st.ty = t.y + (Math.random() - 0.5) * 26;
      st.wait = 1.2 + Math.random() * 2.5;
    }
    const dx = st.tx - st.x, dy = st.ty - st.y; const d = Math.hypot(dx, dy);
    const speed = a.species === 'duck' || a.species === 'penguin' ? 22 : a.species === 'horse' ? 40 : 30;
    if (d > 1) { const step = Math.min(d, speed * dt); st.x += (dx / d) * step; st.y += (dy / d) * step; st.hop += dt * (a.species === 'duck' ? 3 : 9); }
    return st;
  }

  drawFauna(ctx, dt) {
    const cam = this.cam;
    for (const [k, a] of this.isl.fauna) {
      const img = Assets.img(`fauna_${a.species}`);
      const st = this.wanderPos(k, a, dt);
      const moving = Math.hypot(st.tx - st.x, st.ty - st.y) > 1;
      const c = cam.toScreen(st.x, st.y - 26 - (moving ? Math.abs(Math.sin(st.hop)) * 6 : 0));
      let s = 1, alpha = 1;
      const an = this.fx.faunaAnim.get(k);
      if (an) { const t = Math.min(1, an.t / 0.8); s = an.kind === 'arrive' ? 0.3 + 0.7 * easeOutCubic(t) * (1 + 0.25 * Math.sin(t * Math.PI)) : 1 - t; alpha = an.kind === 'arrive' ? 1 : 1 - t; }
      const bob = Math.sin(this.time * 2.2 + a.q * 1.7 + a.r) * 3 * cam.zoom;
      const size = 44 * cam.zoom * s;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 20 * cam.zoom, size * 0.4, size * 0.16, 0, 0, TAU); ctx.fill();
      if (img) ctx.drawImage(img, c.x - size / 2, c.y - size / 2 + bob, size, size * (img.height / img.width));
      else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c.x, c.y + bob, size / 3, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // départs en cours
    for (const [k, an] of this.fx.faunaAnim) {
      if (an.kind !== 'leave' || this.isl.fauna.has(k)) continue;
      const info = an.info; if (!info) continue;
      const img = Assets.img(`fauna_${info.species}`);
      const w = toWorld(info.q, info.r); const c = cam.toScreen(w.x, w.y - 26);
      const t = Math.min(1, an.t / 0.8); const size = 44 * cam.zoom;
      ctx.save(); ctx.globalAlpha = 1 - t;
      if (img) ctx.drawImage(img, c.x - size / 2, c.y - size / 2 - t * 40 * cam.zoom, size, size * (img.height / img.width));
      ctx.restore();
    }
  }

  drawTexts(ctx) {
    const cam = this.cam;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.fx.texts) {
      const k = t.t / t.life; const c = cam.toScreen(t.x, t.y);
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `700 ${Math.round(t.size * clamp(cam.zoom, 0.8, 1.3))}px Quicksand, sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.strokeText(t.text, c.x, c.y - k * 50);
      ctx.fillStyle = t.color; ctx.fillText(t.text, c.x, c.y - k * 50);
    }
    ctx.restore();
  }

  drawTransition(ctx) {
    const tr = this.transition; if (!tr) return;
    const p = tr.t / 1.6;
    const sweep = -200 + p * (STAGE.W + 400);
    const cols = { spring: '#bfe8a8', summer: '#ffe9a8', autumn: '#f2c08a', winter: '#eef4fa' };
    ctx.save();
    const g = ctx.createLinearGradient(sweep - 160, 0, sweep + 40, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, cols[tr.to] || '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.75 * (1 - Math.max(0, p - 0.9) * 10);
    ctx.fillStyle = g; ctx.fillRect(sweep - 160, 0, 200, STAGE.H);
    ctx.restore();
  }
}
