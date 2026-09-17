// Effets : particules de saison, textes flottants, ondes de fermeture, animations de tuiles et de faune.
import { Assets } from '../core/assets.js';
import { rnd, rndPick, TAU, easeOutCubic, easeOutBack } from '../core/math.js';

export class Effects {
  constructor(particles) {
    this.p = particles;
    this.texts = [];       // { x, y (monde), text, color, t, life, size }
    this.rings = [];       // ondes de fermeture { cells:[{q,r}], t }
    this.drops = new Map();// animations de chute par clé de case { t }
    this.faunaAnim = new Map(); // clé -> { t, kind }
    this.ambientTimer = 0;
    this.lifeTimers = { smoke: 0, shimmer: 0, gust: 0, heat: 0, snow: 0 };
  }

  img(prefix) { const keys = Assets.keysStarting(prefix); return keys.length ? Assets.img(rndPick(keys)) : null; }

  floatText(x, y, text, color = '#2b2a26', size = 22, life = 1.4) { this.texts.push({ x, y, text, color, t: 0, life, size }); }

  drop(key) { this.drops.set(key, { t: 0 }); }
  ring(cells, color = '#e0a33a') { this.rings.push({ cells, t: 0, color }); }
  fauna(key, kind) { this.faunaAnim.set(key, { t: 0, kind }); }

  /** Poussière et éclats à la pose (coordonnées monde). */
  placeBurst(x, y, good = true) {
    const dust = this.img('smoke_');
    for (let i = 0; i < 8; i++) { const a = rnd(0, TAU), sp = rnd(20, 60); this.p.emit({ x, y: y + 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, life: rnd(0.5, 0.9), size: rnd(18, 30), sizeEnd: rnd(40, 60), img: dust, alpha: 0.35, alphaEnd: 0, layer: 1 }); }
    if (good) { const star = this.img('star_'); for (let i = 0; i < 6; i++) { const a = rnd(0, TAU), sp = rnd(40, 110); this.p.emit({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: rnd(0.5, 0.9), size: rnd(8, 14), sizeEnd: 0, img: star, color: '#e0a33a', alpha: 1, alphaEnd: 0, gravity: 120, blend: 'lighter', layer: 1, rot: a, rotV: 4 }); } }
  }

  closeBurst(x, y, size) {
    const star = this.img('star_') || this.img('spark_');
    const n = 10 + Math.min(30, size * 3);
    for (let i = 0; i < n; i++) { const a = rnd(0, TAU), sp = rnd(50, 160); this.p.emit({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: rnd(0.7, 1.4), size: rnd(8, 16), sizeEnd: 0, img: star, color: '#ffd77a', alpha: 1, alphaEnd: 0, gravity: 80, drag: 1, blend: 'lighter', layer: 1, rot: a, rotV: rnd(-4, 4) }); }
    this.p.emit({ x, y, life: 0.9, size: 20, sizeEnd: 260 + size * 12, color: '#ffe9b0', alpha: 0.5, alphaEnd: 0, blend: 'lighter', layer: 1, ease: easeOutCubic });
  }

  faunaBurst(x, y) { const c = this.img('circle_'); for (let i = 0; i < 8; i++) { const a = rnd(0, TAU); this.p.emit({ x, y: y - 10, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50 - 30, life: 0.7, size: 10, sizeEnd: 0, img: c, color: '#fff', alpha: 0.9, alphaEnd: 0, layer: 1 }); } }

  /** Particules ambiantes de saison autour d'une zone (monde). `sources` : points (arbres, vergers) d'où partent feuilles et pétales. */
  ambient(dt, season, bounds, count, sources = null) {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = season === 'winter' ? 0.05 : 0.14;
    const img = season === 'autumn' ? this.img('leaf_') : season === 'spring' ? this.img('petal_') : season === 'winter' ? (this.img('snowflake_') || this.img('circle_')) : null;
    if (!img) return;
    let x = rnd(bounds.minX, bounds.maxX), y = rnd(bounds.minY - 200, bounds.minY);
    if (season !== 'winter') {
      if (!sources || !sources.length) return;
      const p = rndPick(sources); x = p.x + rnd(-24, 24); y = p.y - rnd(20, 44);
      if (x < bounds.minX - 100 || x > bounds.maxX + 100 || y < bounds.minY - 100 || y > bounds.maxY + 100) return;
    }
    this.p.emit({ x, y, vx: rnd(-25, 25) + (season === 'autumn' ? 30 : 0), vy: season === 'winter' ? rnd(30, 60) : rnd(40, 80), life: season === 'winter' ? rnd(5, 8) : rnd(1.6, 2.6), size: season === 'winter' ? rnd(4, 9) : rnd(12, 20), sizeEnd: season === 'winter' ? rnd(3, 7) : rnd(10, 18), img, alpha: 0.9, alphaEnd: 0.6, layer: 1, rot: rnd(0, TAU), rotV: rnd(-2, 2) });
  }

  /**
   * Vie sur les tuiles : fumée des cheminées (hiver, automne), reflets sur l'eau, rafales de feuilles (grand vent),
   * chaleur qui tremble (canicule), neige de bourrasque. `objects` = décor composé, `tiles` = tuiles du plateau.
   */
  life(dt, { objects, tiles, season, weather, bounds }) {
    const T = this.lifeTimers;
    for (const k of Object.keys(T)) T[k] -= dt;
    if (T.smoke <= 0) {
      T.smoke = season === 'winter' ? 0.09 : season === 'autumn' ? 0.2 : 0.45;
      const houses = objects.filter((o) => o.tpl === 'obj_house' || o.tpl === 'obj_house_small' || o.tpl === 'obj_villa' || o.tpl === 'obj_farm');
      if (houses.length) {
        const h = rndPick(houses); const smoke = this.img('smoke_');
        const top = h.tpl === 'obj_house' ? 62 : h.tpl === 'obj_villa' ? 58 : 48; const off = h.tpl === 'obj_house' ? 22 : 10;
        this.p.emit({ x: h.x + off, y: h.y - top, vx: rnd(3, 10), vy: rnd(-22, -12), life: rnd(2.8, 4), size: rnd(9, 13), sizeEnd: rnd(30, 40), img: smoke, tint: '#5c6168', alpha: 0.75, alphaEnd: 0, layer: 1, rotV: rnd(-0.4, 0.4), drag: 0.15 });
      }
    }
    if (T.shimmer <= 0) {
      T.shimmer = weather === 'thaw' ? 0.06 : 0.16;
      const water = tiles.filter((t) => t.family === 'water' && !t.frozen && !t.rare);
      if (water.length) { const t = rndPick(water); const c = this.img('light_') || this.img('circle_'); this.p.emit({ x: t.wx + rnd(-40, 40), y: t.wy + rnd(-28, 34), vx: 0, vy: 0, life: rnd(0.9, 1.6), size: 3, sizeEnd: rnd(10, 16), img: c, color: '#fff', alpha: 0.55, alphaEnd: 0, blend: 'lighter', layer: 1 }); }
    }
    if (weather === 'wind' && T.gust <= 0) {
      T.gust = 0.04; const img = this.img('leaf_');
      this.p.emit({ x: bounds.minX - 80, y: rnd(bounds.minY, bounds.maxY), vx: rnd(260, 420), vy: rnd(-30, 30), life: 3, size: rnd(8, 16), sizeEnd: rnd(8, 14), img, alpha: 0.9, alphaEnd: 0.6, layer: 1, rotV: rnd(-9, 9) });
    }
    if (weather === 'heat' && T.heat <= 0) {
      T.heat = 0.12; const c = this.img('light_') || this.img('circle_');
      this.p.emit({ x: rnd(bounds.minX, bounds.maxX), y: rnd(bounds.minY, bounds.maxY), vx: rnd(-4, 4), vy: rnd(-26, -12), life: rnd(1.5, 2.5), size: rnd(8, 16), sizeEnd: 0, img: c, color: '#ffd27a', alpha: 0.35, alphaEnd: 0, blend: 'lighter', layer: 1 });
    }
    if (weather === 'blizzard' && T.snow <= 0) {
      T.snow = 0.012; const img = this.img('snowflake_') || this.img('circle_');
      this.p.emit({ x: bounds.minX - 60, y: rnd(bounds.minY - 100, bounds.maxY), vx: rnd(280, 460), vy: rnd(60, 140), life: 3, size: rnd(3, 8), sizeEnd: rnd(3, 7), img, alpha: 0.9, alphaEnd: 0.5, layer: 1 });
    }
    if (weather === 'storm' && T.snow <= 0) {
      T.snow = 0.03; const c = this.img('circle_');
      this.p.emit({ x: rnd(bounds.minX, bounds.maxX), y: rnd(bounds.minY, bounds.maxY), vx: 0, vy: 0, life: 0.35, size: 2, sizeEnd: 10, img: c, color: '#dff2ff', alpha: 0.5, alphaEnd: 0, layer: 1 });
    }
  }

  /** Neige qui tombe des arbres voisins d'une pose en hiver (coordonnées monde des arbres). */
  snowShake(points) {
    const c = this.img('circle_');
    for (const p of points) for (let i = 0; i < 4; i++) this.p.emit({ x: p.x + rnd(-8, 8), y: p.y - rnd(14, 30), vx: rnd(-10, 10), vy: rnd(20, 50), life: rnd(0.6, 1.1), size: rnd(3, 6), sizeEnd: 2, img: c, color: '#fff', alpha: 0.9, alphaEnd: 0, gravity: 60, layer: 1 });
  }

  update(dt) {
    for (const t of this.texts) t.t += dt; this.texts = this.texts.filter((t) => t.t < t.life);
    for (const r of this.rings) r.t += dt; this.rings = this.rings.filter((r) => r.t < 1.3);
    for (const [k, d] of this.drops) { d.t += dt; if (d.t > 0.6) this.drops.delete(k); }
    for (const [k, a] of this.faunaAnim) { a.t += dt; if (a.t > 0.8) this.faunaAnim.delete(k); }
  }

  /** Échelle et décalage d'une tuile en chute (0..0.6 s). */
  dropTransform(key) {
    const d = this.drops.get(key);
    if (!d) return { s: 1, dy: 0 };
    const t = d.t / 0.6;
    return { s: 0.85 + 0.15 * easeOutBack(Math.min(1, t)), dy: -(1 - Math.min(1, t * 1.3)) * 60 };
  }
}
