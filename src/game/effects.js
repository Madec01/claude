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

  /** Particules ambiantes de saison autour d'une zone (monde). */
  ambient(dt, season, bounds, count) {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = season === 'winter' ? 0.05 : 0.14;
    const img = season === 'autumn' ? this.img('leaf_') : season === 'spring' ? this.img('petal_') : season === 'winter' ? (this.img('snowflake_') || this.img('circle_')) : null;
    if (!img && season !== 'summer') return;
    const x = rnd(bounds.minX, bounds.maxX), y = rnd(bounds.minY - 200, bounds.minY);
    if (season === 'summer') { const c = this.img('light_') || this.img('circle_'); if (Math.random() < 0.4) this.p.emit({ x, y: rnd(bounds.minY, bounds.maxY), vx: rnd(-6, 6), vy: rnd(-14, -4), life: rnd(2, 3.5), size: rnd(6, 12), sizeEnd: 0, img: c, color: '#fff2b0', alpha: 0.7, alphaEnd: 0, blend: 'lighter', layer: 1 }); return; }
    this.p.emit({ x, y, vx: rnd(-25, 25) + (season === 'autumn' ? 30 : 0), vy: season === 'winter' ? rnd(30, 60) : rnd(40, 80), life: rnd(5, 8), size: season === 'winter' ? rnd(4, 9) : rnd(12, 20), sizeEnd: season === 'winter' ? rnd(3, 7) : rnd(10, 18), img, alpha: 0.9, alphaEnd: 0.6, layer: 1, rot: rnd(0, TAU), rotV: rnd(-2, 2) });
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
