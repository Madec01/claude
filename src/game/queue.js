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


  setVisible(n) { this.visible = n; this.fill(); }

  snapshot() { return { list: this.list.map((t) => ({ ...t })), total: this.total, generated: this.generated, s: this.rng.s }; }
  // une partie sauvée avant le retrait de la poche : ses tuiles en poche reviennent en tête de la main
  restore(s) { this.list = [...(s.pocket || []), ...s.list].map((t) => ({ ...t })); this.total = s.total; this.generated = s.generated; this.rng.s = s.s; }
}
