// File de tuiles : génération pondérée déterministe, poche, échanges.
import { RNG } from '../core/math.js';
import { VARIANTS, FAMILIES, RARE_AS } from '../data/tiles.js';

export class TileQueue {
  constructor(seed, weights, total, visible) {
    this.rng = new RNG(seed);
    this.weights = weights;
    this.total = total;             // nombre de tuiles restantes à générer (Infinity = infinie)
    this.visible = visible;
    this.list = [];
    this.generated = 0;
    this.recu = {};         // tuiles données par famille (plus celles du départ) : la tenue des promesses
    this.promesses = [];    // { family, need, fin } : `need` tuiles de la famille avant la `fin`-ième tuile tirée
    this.fill();
  }

  /**
   * Les vœux de l'île promettent leurs tuiles. La file suit un calendrier régulier : à la tuile n, une promesse de
   * `need` tuiles pour la `fin`-ième doit en avoir donné au moins need × n / fin. Quand le hasard est en retard, le tirage
   * suivant donne la famille promise ; en avance, on le laisse faire. Les tuiles viennent donc réparties, jamais en
   * paquet à la fin, et une file déjà généreuse n'est pas touchée. `depart` : les tuiles déjà sur l'île.
   */
  promettre(promesses, depart = {}) {
    for (const [f, n] of Object.entries(depart)) this.recu[f] = (this.recu[f] || 0) + n;
    this.promesses = promesses.filter((p) => p.need > 0 && p.fin > 0).map((p) => ({ ...p }));
  }
  /** La famille qu'une promesse en retard réclame pour la tuile qui va être tirée (la plus en retard d'abord), ou null. */
  enRetard(rang) {
    let pire = null, ecart = 0;
    for (const p of this.promesses) {
      const recu = this.recu[p.family] || 0; if (recu >= p.need) continue;
      const cible = Math.floor(p.need * Math.min(1, rang / Math.max(1, p.fin - 1)));   // une tuile d'avance sur la fin : deux promesses qui se disputent la dernière place tiennent quand même
      const e = cible - recu; if (e > ecart || (e === ecart && e > 0 && pire && p.fin < pire.fin)) { ecart = e; pire = p; }
    }
    return ecart > 0 ? pire.family : null;
  }
  compter(tile, sens = 1) { for (const f of (tile.rare ? RARE_AS[tile.family] || [] : [tile.family])) this.recu[f] = (this.recu[f] || 0) + sens; }
  /** Remplace la tuile en position i par une tuile de la famille donnée (ouverture guidée) ; les comptes suivent. */
  remplacer(i, family) { const old = this.list[i]; if (old) this.compter(old, -1); const t = this.makeTile(family); this.list[i] = t; return t; }

  makeTile(family = null) {
    if (!family) {
      const fams = FAMILIES;
      let sum = 0; for (const f of fams) sum += this.weights[f] || 0;
      let r = this.rng.next() * sum;
      family = fams[0];
      for (const f of fams) { r -= this.weights[f] || 0; if (r <= 0) { family = f; break; } }
      // une promesse de vœu en retard prend la place du hasard (le tirage a eu lieu : la suite de la file reste la même)
      const due = this.promesses.length ? this.enRetard(this.generated + 1) : null; if (due) { if (due !== family) this.forcees = (this.forcees || 0) + 1; family = due; }
    }
    const variant = 1 + Math.floor(this.rng.next() * (VARIANTS[family] || 1));
    const t = { family, variant, rare: false, id: ++this.generated }; this.compter(t); return t;
  }

  makeRare(family) { const t = { family, variant: 1, rare: true, id: ++this.generated }; this.compter(t); return t; }

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

  snapshot() { return { list: this.list.map((t) => ({ ...t })), total: this.total, generated: this.generated, s: this.rng.s, recu: { ...this.recu } }; }
  // une partie sauvée avant le retrait de la poche : ses tuiles en poche reviennent en tête de la main
  restore(s) { this.list = [...(s.pocket || []), ...s.list].map((t) => ({ ...t })); this.total = s.total; this.generated = s.generated; this.rng.s = s.s; if (s.recu) this.recu = { ...s.recu }; }
}
