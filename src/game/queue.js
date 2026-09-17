// File de tuiles : génération pondérée déterministe, poche, échanges.
import { RNG } from '../core/math.js';
import { VARIANTS, FAMILIES } from '../data/tiles.js';

export class TileQueue {
  constructor(seed, weights, total, visible) {
    this.rng = new RNG(seed);
    this.weights = weights;
    this.total = total;             // nombre de tuiles restantes à générer (Infinity = infinie)
    this.visible = visible;
    this.list = [];
    this.pocket = [];
    this.pocketSize = 0;
    this.generated = 0;
    this.fill();
  }

  makeTile(family = null) {
    if (!family) {
      const fams = FAMILIES;
      let sum = 0; for (const f of fams) sum += this.weights[f] || 0;
      let r = this.rng.next() * sum;
      family = fams[0];
      for (const f of fams) { r -= this.weights[f] || 0; if (r <= 0) { family = f; break; } }
    }
    const variant = 1 + Math.floor(this.rng.next() * (VARIANTS[family] || 1));
    return { family, variant, rare: false, id: ++this.generated };
  }

  makeRare(family) { return { family, variant: 1, rare: true, id: ++this.generated }; }

  fill() {
    while (this.list.length < this.visible && this.total > 0) { this.list.push(this.makeTile()); this.total--; }
  }

  get next() { return this.list[0] || null; }
  get remaining() { return this.list.length + (Number.isFinite(this.total) ? this.total : Infinity); }
  get empty() { return this.list.length === 0; }

  /** Retire et retourne la première tuile. */
  take() { const t = this.list.shift(); this.fill(); return t; }

  /** Échange la première tuile avec la i-ième (1 ou 2). */
  swap(i) { if (i <= 0 || i >= this.list.length) return false; [this.list[0], this.list[i]] = [this.list[i], this.list[0]]; return true; }

  discard() { const t = this.list.shift(); this.fill(); return t; }

  /** Injecte une tuile en tête (rare). */
  inject(tile, front = true) { if (front) this.list.unshift(tile); else this.list.splice(Math.min(1, this.list.length), 0, tile); }

  /** Poche : déplace la tuile courante en poche, ou reprend une tuile de la poche en tête. */
  toPocket() { if (this.pocket.length >= this.pocketSize || !this.list.length) return false; this.pocket.push(this.list.shift()); this.fill(); return true; }
  fromPocket(i = 0) { if (!this.pocket.length) return false; const t = this.pocket.splice(i, 1)[0]; this.list.unshift(t); return true; }

  setVisible(n) { this.visible = n; this.fill(); }

  snapshot() { return { list: this.list.map((t) => ({ ...t })), pocket: this.pocket.map((t) => ({ ...t })), total: this.total, generated: this.generated, s: this.rng.s }; }
  restore(s) { this.list = s.list.map((t) => ({ ...t })); this.pocket = s.pocket.map((t) => ({ ...t })); this.total = s.total; this.generated = s.generated; this.rng.s = s.s; }
}
