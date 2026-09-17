// Rendu d'une île : mer, cases vides, tuiles par saison, survol et prévisualisation, faune, effets.
import { Assets } from '../core/assets.js';
import { toWorld, corners, parse, key, DIRS, edgeMid, TILE_W, TILE_H, SIZE } from './hex.js';
import { FAMILY_COLORS, SEASONS } from '../data/tiles.js';
import { clamp, lerp, TAU, easeOutCubic, rnd } from '../core/math.js';

import { STAGE } from '../core/stage.js';
const SEA = { spring: ['#8fc8e6', '#5f9fc8'], summer: ['#7fc0e4', '#4f93c2'], autumn: ['#8cb9d3', '#5d8fb3'], winter: ['#a9c7db', '#7aa2bf'] };

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
    if (this.transition) { this.transition.t += dt; if (this.transition.t > 1.9) this.transition = null; }
    const isl = this.isl, cam = this.cam;
    const season = isl.season;
    this.drawSea(ctx, season);
    this.drawShallows(ctx);
    this.drawEmptyCells(ctx);
    this.drawTiles(ctx);
    this.p.render(ctx, 0);
    this.drawHover(ctx);
    this.drawRings(ctx);
    this.drawFauna(ctx, dt);
    this.p.render(ctx, 1);
    this.drawTexts(ctx);
    this.drawTransition(ctx);
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

  drawBloom(ctx, cx, cy) {
    ctx.save(); ctx.globalAlpha = 0.8;
    for (let i = 0; i < 5; i++) { const a = this.time * 0.6 + i * 1.3; const r = 14 * this.cam.zoom; ctx.fillStyle = i % 2 ? '#fff6c9' : '#f7c8d8'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * 0.9 + 6 * this.cam.zoom, 2.2 * this.cam.zoom, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  drawHover(ctx) {
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
    const tile = { ...this.isl.current, q: hv.q, r: hv.r };
    this.drawTileAt(ctx, tile, c.x, c.y - 6 * z, 1, 0.8, this.isl.season);
    this.outline(ctx, c.x, c.y, pv.total >= 0 ? '#2f9e8f' : '#d95f4b', 0.9);
    // points par bord
    ctx.save();
    ctx.font = `700 ${Math.round(14 * clamp(z, 0.8, 1.3))}px Quicksand, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const e of pv.edges) {
      const m = edgeMid(w.x, w.y, e.d); const s = cam.toScreen(m.x, m.y);
      this.pill(ctx, s.x, s.y, (e.pts > 0 ? '+' : '') + e.pts, e.pts > 0 ? (e.pts >= 2 ? '#e0a33a' : '#2f9e8f') : '#d95f4b');
    }
    for (let i = 0; i < pv.base.length; i++) { const bs = pv.base[i]; this.pill(ctx, c.x, c.y + (30 + i * 22) * z, `+${bs.pts} ${bs.label}`, '#5aa7d6'); }
    for (const cl of pv.closes) this.pill(ctx, c.x, c.y - (64) * z, `région close +${cl.bonus}`, '#e0a33a');
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
    const lab = 'TOTAL', lw = ctx.measureText(lab).width + 14 * tz;
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

  drawFauna(ctx, dt) {
    const cam = this.cam;
    for (const [k, a] of this.isl.fauna) {
      const img = Assets.img(`fauna_${a.species}`);
      const w = toWorld(a.q, a.r); const c = cam.toScreen(w.x, w.y - 26);
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
