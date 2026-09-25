// « Le Souffle court », côté partie : le cadran qui se vide, la série, les saisons qui changent le temps et le plateau.
// S'accroche à la scène d'île (IslandScene) quand la définition porte `tempo` ; l'île elle-même ne sait que perdre une
// tuile (loseCurrent) et compter des points hors pose (addBonus). Tous les chiffres sont dans BALANCE.tempo.
//
//   - une tuile à la fois, cadran de `cadran` secondes ; à zéro elle est perdue, et la série avec
//   - posée sous `sousSeconde` : la série monte (de deux si la place était bonne) ; plus lente : elle retombe
//   - hiver : le cadran gelé (×hiver) ; printemps : deux tuiles proposées, l'autre est perdue sans entamer le compte ;
//     été : une réserve de secondes pour la saison (proportionnelle au délai), à répartir — vide, la fin d'été perd
//     d'un coup ce qui restait à poser, en un seul événement ; automne : la brume couvre les tuiles posées, la pose
//     dissipe les six voisines
//   - changement de saison : la prime compte double, et la saison sans tuile perdue en rapporte une de plus
import { BALANCE } from '../data/balance.js';
import { multDe, reserveEte } from '../data/tempo.js';
import { key, neighbors } from './hex.js';

const T = () => BALANCE.tempo;
const BON = new Set(['perfect', 'master', 'good']);

export class Tempo {
  constructor(scene) {
    this.sc = scene; this.isl = scene.isl;
    this.serie = 0; this.mult = 1; this.perduesSaison = 0; this.reserve = null; this.reserveMax = null; this.dernier = null;
    this.brume = new Set();   // clés des tuiles sous la brume (automne) — lue par le rendu
    this.musiqueAt = null;    // départ de la musique sur l'horloge audio : la marée bat la mesure dessus
    this.isl.stats.lost = 0; this.isl.stats.bestSerie = 0;
    this.entrer(this.isl.season);
    this.armer();
    this.isl.on((e) => this.onEvent(e));
  }

  get saison() { return this.isl.season; }
  /** Le cadran d'une tuile, selon la saison. */
  limite() { return (this.isl.def.cadran || T().cadran) * (this.saison === 'winter' && !this.isl.def.sansEffets ? T().hiver : 1); }
  /** Une tuile nouvelle : le cadran repart (l'été, c'est la réserve qui fait foi). */
  armer() { this.limit = this.limite(); this.t = this.saison === 'summer' ? this.reserve : this.limit; this.depuis = 0; }
  /** Ce qu'il reste, de 0 à 1, pour l'arc autour de la tuile. */
  get fraction() { const max = this.saison === 'summer' ? this.reserveMax : this.limit; return max > 0 ? Math.max(0, Math.min(1, this.t / max)) : 0; }

  /** À l'entraînement, le chrono attend la fin des poses guidées. */
  get attend() { const d = this.isl.def; return !!(d.chronoDes && this.isl.placements < d.chronoDes); }
  update(dt) {
    const isl = this.isl; if (isl.ended || !isl.current || this.attend) return;
    this.depuis += dt;
    if (this.saison === 'summer') { this.reserve = Math.max(0, this.reserve - dt); this.t = this.reserve; if (this.reserve <= 0) this.finEte(); }
    else { this.t -= dt; if (this.t <= 0) this.perdre(); }
  }

  /** Le temps est tombé : `n` tuiles perdues d'un coup (une, sauf en fin d'été), la série avec. */
  perdre(n = 1) {
    this.serie = 0; this.mult = 1; this.perduesSaison += n;
    this.isl.loseCurrent(n);
    if (!this.isl.ended) this.armer();
  }
  /**
   * La réserve d'été est vide : tout ce qui restait à poser dans la saison est perdu en un seul événement, et l'automne
   * commence. Avant, chaque tuile tombait au pas suivant de la boucle — cinq pertes en une poignée d'images, invisibles.
   */
  finEte() { this.perdre(Math.max(1, this.isl.seasonLength - this.isl.inSeason)); }

  onEvent(e) {
    if (e.type === 'place') {
      if (this.attend || (this.isl.def.chronoDes && this.isl.placements === this.isl.def.chronoDes)) { this.dernier = null; this.armer(); return; }   // poses guidées : ni série ni cadran
      const rapide = this.depuis <= T().sousSeconde; const bon = BON.has(e.grade);
      this.serie = rapide ? this.serie + (bon ? 2 : 1) : 0;
      this.isl.stats.bestSerie = Math.max(this.isl.stats.bestSerie, this.serie);
      this.mult = multDe(this.serie);
      const total = e.result.total; let bonus = 0;
      if (this.mult > 1 && total > 0) { bonus = Math.round(total * (this.mult - 1)); this.isl.addBonus(bonus, 'tempo'); }
      this.dernier = { rapide, bon, bonus, depuis: this.depuis };
      if (this.saison === 'spring') this.perdreLAutre();
      if (this.saison === 'autumn') { this.brume.delete(key(e.q, e.r)); for (const [a, b] of neighbors(e.q, e.r)) this.brume.delete(key(a, b)); }
      if (!this.isl.ended) this.armer();
    } else if (e.type === 'season') {
      if (e.pts > 0) this.isl.addBonus(Math.round(e.pts * (T().primeSaison - 1)), 's_tempo');
      if (this.perduesSaison === 0) this.isl.addBonus(T().saisonPleine, 'pleine');
      this.saisonPleine = this.perduesSaison === 0;
      this.perduesSaison = 0;
      this.sortir(e.from); this.entrer(e.to);
      if (!this.isl.ended) this.armer();
    }
  }

  /**
   * Printemps : deux tuiles proposées. Après la pose, l'autre est perdue — sans entamer le compte de l'île. Après le
   * `take()` de la pose, la file vaut [l'autre, une neuve] : c'est bien l'autre qu'on retire (et non la neuve, comme
   * avant : la tuile refusée restait proposée).
   */
  perdreLAutre() {
    const q = this.isl.queue; if (q.list.length < 2) return;
    q.list.splice(0, 1); if (Number.isFinite(q.total)) q.total += 1;
    q.fill();
  }

  entrer(saison) {
    const isl = this.isl, q = isl.queue; if (isl.def.sansEffets) return;
    if (saison === 'spring') { isl.handOn = true; q.setVisible(T().printemps); }
    if (saison === 'summer') this.reserve = this.reserveMax = reserveEte(isl.def);
    if (saison === 'autumn') { this.brume.clear(); for (const t of isl.board.tiles.values()) if (!t.start && Math.random() < T().automne) this.brume.add(key(t.q, t.r)); }
  }
  sortir(saison) {
    const isl = this.isl, q = isl.queue; if (isl.def.sansEffets) return;
    if (saison === 'spring') { isl.handOn = false; const enTrop = Math.max(0, q.list.length - 1); if (enTrop) { q.list.splice(1); if (Number.isFinite(q.total)) q.total += enTrop; } q.setVisible(1); }
    if (saison === 'summer') this.reserve = this.reserveMax = null;
    if (saison === 'autumn') this.brume.clear();
  }
}
