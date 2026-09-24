// État d'une île : masque, tuiles, régions connexes.
import { key, parse, neighbors } from './hex.js';
import { RARE_AS } from '../data/tiles.js';

export class Board {
  constructor(mask) {
    this.version = 0;
    this.mask = new Set(mask);
    this.tiles = new Map();     // key -> tile { family, variant, rare?, q, r, dry, frozen, bloom, closed }
    // Cellules déjà payées par une fermeture, « famille:q,r ». On note les CELLULES, pas la région :
    // l'identité d'une région était son plus petit sommet, or une région close qui grandit change d'identité
    // quand la nouvelle case trie plus petit, et pas autrement. Le même geste payait donc la prime entière
    // d'un côté et rien de l'autre. En notant les cellules, une région qui regrandit ne paie que ce qu'elle
    // a gagné, du côté qu'on veut.
    this.closedRegions = new Set();
    // Mode « Sous la brume » : cases du masque sous la brume. Une tuile y est déjà, mais cachée — elle vit dans
    // l'île (`Island.brume`), pas ici : tant qu'elle n'est pas dévoilée, elle ne donne aucun bord et n'entre dans
    // aucune région. La case, elle, n'est ni libre (on n'y pose pas) ni fermée (une région qui la touche reste
    // ouverte : ce qui s'y cache pourrait en faire partie). Vide hors de ce mode.
    this.fog = new Set();
  }

  /** La région a-t-elle déjà été payée en entier ? */
  regionPaid(reg) {
    if (!reg) return false;
    for (const k of reg.keys) if (!this.closedRegions.has(`${reg.family}:${k}`)) return false;
    return true;
  }

  /** Ce que la région vaut encore : la taille de ce qui n'a pas déjà été payé (niveau 2 compté double). */
  regionUnpaid(reg) {
    if (!reg) return 0;
    let n = 0;
    for (const c of reg.cells) if (!this.closedRegions.has(`${reg.family}:${key(c.q, c.r)}`)) n += c.level || 1;
    return n;
  }

  /** Marque toute la région comme payée. */
  payRegion(reg) { if (reg) for (const k of reg.keys) this.closedRegions.add(`${reg.family}:${k}`); }

  /** Régions d'une famille déjà payées en entier (les « régions closes » au sens du jeu). */
  paidRegions(family) { return this.regions(family).filter((r) => this.regionPaid(r)); }

  has(q, r) { return this.mask.has(key(q, r)); }
  get(q, r) { return this.tiles.get(key(q, r)) || null; }
  isSea(q, r) { return !this.mask.has(key(q, r)); }
  isEmpty(q, r) { const k = key(q, r); return this.mask.has(k) && !this.tiles.has(k) && !this.fog.has(k); }
  get placed() { return this.tiles.size; }
  get cells() { return this.mask.size; }

  /** Voisins dans le masque (posés ou non). */
  landNeighbors(q, r) { return neighbors(q, r).filter(([a, b]) => this.mask.has(key(a, b))); }

  /** Une pose est-elle légale ? (case vide du masque, adjacente à une tuile — ou à une case sous la brume : ce qui s'y cache est déjà une tuile) */
  canPlace(q, r) {
    if (!this.isEmpty(q, r)) return false;
    return neighbors(q, r).some(([a, b]) => this.tiles.has(key(a, b)) || this.fog.has(key(a, b)));
  }

  /** Toutes les cases où l'on peut poser. */
  legalCells() {
    const out = [];
    for (const k of this.mask) { if (this.tiles.has(k) || this.fog.has(k)) continue; const [q, r] = parse(k); if (neighbors(q, r).some(([a, b]) => this.tiles.has(key(a, b)) || this.fog.has(key(a, b)))) out.push({ q, r }); }
    return out;
  }

  place(q, r, tile) {
    const t = { ...tile, q, r, dry: false, frozen: false, bloom: false };
    this.tiles.set(key(q, r), t);
    this.version = (this.version || 0) + 1;
    return t;
  }

  remove(q, r) { this.tiles.delete(key(q, r)); this.version = (this.version || 0) + 1; }
  /** À appeler quand des tuiles changent d'état sans pose (saison : sèche, gelée). */
  touch() { this.version = (this.version || 0) + 1; }

  /** Familles effectives d'une tuile (une rare compte pour plusieurs familles). */
  static familiesOf(tile) { if (tile.blighted) return []; return tile.rare ? (RARE_AS[tile.family] || []) : [tile.family]; }   // une friche ne compte pour rien
  static isFamily(tile, family) { return !!tile && Board.familiesOf(tile).includes(family); }

  /** Région connexe de même famille contenant (q, r). Retourne { family, cells:[tile], keys:Set, size }. */
  region(q, r, family = null) {
    const start = this.get(q, r);
    if (!start) return null;
    const fam = family || start.family;
    if (!Board.isFamily(start, fam)) return null;
    const seen = new Set([key(q, r)]);
    const stack = [start], cells = [];
    while (stack.length) {
      const t = stack.pop(); cells.push(t);
      for (const [a, b] of neighbors(t.q, t.r)) {
        const k = key(a, b); if (seen.has(k)) continue;
        const n = this.tiles.get(k);
        if (n && Board.isFamily(n, fam)) { seen.add(k); stack.push(n); }
      }
    }
    const minKey = [...seen].sort()[0];
    return { family: fam, cells, keys: seen, size: cells.reduce((s, c) => s + (c.level || 1), 0), id: `${fam}:${minKey}` };   // une tuile de niveau 2 compte double
  }

  /** Toutes les régions d'une famille (chaque tuile dans une seule région par famille). */
  regions(family) {
    const seen = new Set(), out = [];
    for (const t of this.tiles.values()) {
      if (!Board.isFamily(t, family) || seen.has(key(t.q, t.r))) continue;
      const reg = this.region(t.q, t.r, family);
      for (const k of reg.keys) seen.add(k);
      out.push(reg);
    }
    return out;
  }

  /** Une région est close si aucune de ses cases n'a de voisin vide dans le masque. */
  isRegionClosed(reg) {
    for (const t of reg.cells) for (const [a, b] of neighbors(t.q, t.r)) if (this.isEmpty(a, b) || this.fog.has(key(a, b))) return false;   // la brume laisse la région ouverte
    return true;
  }

  /** La région touche-t-elle la mer (case hors masque) ? */
  regionTouchesSea(reg) {
    for (const t of reg.cells) for (const [a, b] of neighbors(t.q, t.r)) if (this.isSea(a, b)) return true;
    return false;
  }

  /** La région touche-t-elle une tuile d'une famille donnée ? */
  regionTouches(reg, family) {
    for (const t of reg.cells) for (const [a, b] of neighbors(t.q, t.r)) { const n = this.get(a, b); if (n && !reg.keys.has(key(a, b)) && Board.isFamily(n, family)) return true; }
    return false;
  }

  /** Tuiles voisines d'une région (hors région), dédupliquées. */
  regionNeighbors(reg) {
    const out = new Map();
    for (const t of reg.cells) for (const [a, b] of neighbors(t.q, t.r)) { const k = key(a, b); if (reg.keys.has(k)) continue; const n = this.tiles.get(k); if (n) out.set(k, n); }
    return [...out.values()];
  }

  /** Une chaîne d'eau est une rivière si elle touche la mer ou une roche. */
  isRiver(reg) { return reg.family === 'water' && (this.regionTouchesSea(reg) || this.regionTouches(reg, 'rock') || this.regionTouches(reg, 'hill')); }

  /** Étend le masque (Île infinie) : n nouvelles cases en bordure. */
  grow(n, rng) {
    const frontier = new Map();
    for (const k of this.mask) { const [q, r] = parse(k); for (const [a, b] of neighbors(q, r)) { const kk = key(a, b); if (!this.mask.has(kk)) frontier.set(kk, (frontier.get(kk) || 0) + 1); } }
    const cand = [...frontier.entries()].sort((x, y) => (y[1] - x[1]) || (rng.next() - 0.5));
    const added = [];
    for (let i = 0; i < n && cand.length; i++) {
      const idx = Math.min(cand.length - 1, Math.floor(rng.next() * Math.min(cand.length, 6)));
      const [[k]] = cand.splice(idx, 1);
      this.mask.add(k); added.push(parse(k));
    }
    return added;
  }

  /** Instantané sérialisable (pour le souvenir / annulation). */
  snapshot() { return { mask: [...this.mask], tiles: [...this.tiles.values()].map((t) => ({ ...t })), closed: [...this.closedRegions], fog: [...this.fog] }; }
  restore(s) {
    this.mask = new Set(s.mask); this.tiles = new Map(s.tiles.map((t) => [key(t.q, t.r), { ...t }]));
    this.closedRegions = new Set(s.closed); this.fog = new Set(s.fog || []); this.version = (this.version || 0) + 1;
    this.sealClosed();
  }

  /**
   * Toute région actuellement close est payée : c'est vrai par construction (une région ne peut se fermer
   * sans qu'une pose voisine l'ait vue), et ça rattrape les parties enregistrées quand on notait les régions
   * plutôt que les cellules — sans quoi une partie reprise aurait repayé ses régions déjà closes.
   */
  sealClosed() {
    const familles = new Set();
    for (const t of this.tiles.values()) for (const f of Board.familiesOf(t)) familles.add(f);
    for (const fam of familles) {
      for (const reg of this.regions(fam)) {
        if (this.regionPaid(reg) || this.regionUnpaid(reg) === reg.size) continue;   // rien de payé du tout : on n'invente pas
        this.payRegion(reg);
      }
    }
  }
}
