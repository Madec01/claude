// La construction : l'île se vide et se rebâtit sous les yeux, tuile après tuile — chaque tuile TOMBE à sa place, puis le
// plateau la dessine fondue à ses voisines (retouche de l'image gardée, voir render.js). Née en tête de la tournée finale
// et au bouton « Revoir la construction » (27 septembre) ; l'ouverture du jeu la reprend pour bâtir l'île du titre.
//
// Le plateau vrai est mis de côté (`boardReel`) et remplacé par un plateau vide de même masque, qui reçoit les tuiles au
// fur et à mesure : l'eau y est classée comme sur l'île finie (une rivière reste une rivière) et le décor est celui de
// l'île finie, révélé case par case. `finir()` rend le plateau vrai.
import { toWorld, key, TILE_W, TILE_H } from './hex.js';
import { Board } from './board.js';
import { STAGE } from '../core/stage.js';
import { clamp, easeOutBack } from '../core/math.js';
import { classifyWater } from './water.js';

export class Construction {
  /**
   * @param {object} o
   * @param {import('./island.js').Island} o.isl l'île, avec ses `poses` enregistrées
   * @param {import('./render.js').IslandRenderer} o.renderer
   * @param {import('./camera.js').Camera} o.cam
   * @param {boolean} [o.auto] en tête de tournée (très vite, sans passer les saisons) ; sinon la version manuelle, saison après saison
   * @param {number} [o.duree] le temps de toute la construction (s) ; par défaut 2,5 s en auto, 10 s à la main (3 et 12 au-delà de 80 poses)
   * @param {number} [o.chute] le temps de tomber d'une tuile (s)
   * @param {number} [o.ecart] l'écart entre deux tuiles de départ (s)
   * @param {(k:string, v:number)=>void} [o.playSfx]
   * @param {(from:string, to:string)=>void} [o.onSaison] version manuelle : la saison change au fil des poses
   */
  constructor({ isl, renderer, cam, auto = true, duree = null, chute = null, ecart = null, playSfx = () => {}, onSaison = null }) {
    this.isl = isl; this.r = renderer; this.cam = cam; this.auto = auto; this.playSfx = playSfx; this.onSaison = onSaison;
    const poses = isl.poses || []; const n = Math.max(1, poses.length);
    const D = duree ?? (auto ? (n > 80 ? 3 : 2.5) : (n > 80 ? 12 : 10));   // en tête de tournée : très vite (« un peu plus rapide, ce sera top »)
    this.i = 0; this.pas = D / n; this.fini = 0; this.posees = []; this.par = new Map(); this.reveil = 0; this.dernierTic = -1;
    this.chute = chute ?? (auto ? 0.36 : 0.55);   // le temps de tomber, plus vif en tête de tournée
    this.now = 0;   // l'horloge propre de la construction (les `at` des tuiles s'y rapportent)
    this.limite = Infinity;   // l'ouverture : pas de pose au-delà de cet indice tant que ses images ne sont pas là (l'île y est la barre de chargement)
    this.boardReel = isl.board; isl.board = new Board(this.boardReel.mask);
    isl.board.eauFinale = classifyWater(this.boardReel);   // l'eau se classe comme sur l'île finie : une rivière reste une rivière (voir water.js)
    this.r.decor.sync(this.boardReel); isl.board.decorFinal = { objects: this.r.decor.objects.slice(), courts: this.r.decor.courts.slice() };   // et le décor est celui de l'île finie, révélé case par case (voir decor.js)
    // les tuiles de départ (le hameau, les roches, l'eau d'une rivière commencée) ne sont pas des poses : elles
    // tombent en premier, vite, avant la première pose du joueur — sinon elles n'arrivaient qu'à la fin, d'un
    // coup (le commanditaire, 27 septembre)
    const e0 = ecart ?? (auto ? 0.05 : 0.16);
    const depart = [...this.boardReel.tiles.values()].filter((t) => t.start).sort((a, c) => (a.r - c.r) || (a.q - c.q));
    depart.forEach((t, i) => { const e = { q: t.q, r: t.r, t: { ...t }, at: 0.15 + i * e0, pop: -1, posee: false }; this.par.set(key(t.q, t.r), e); this.posees.push(e); });
    this.t = (auto ? -0.2 : -0.6) - depart.length * e0;   // le temps accumulé vers la prochaine pose
    if (!auto && poses.length) isl.season = poses[0].s;   // en tête de tournée, la saison ne bouge pas : elle est celle de la fin
    isl.board.touch();
    this.r.rejoue = true; this.r.transition = null; this.r.nu = false;   // les cases vides se voient : les tuiles tombent sur la forme de l'île, pas sur la mer
  }

  get n() { return this.isl.poses ? this.isl.poses.length : 0; }
  /** Tout est tombé et posé (la dernière tuile est en place). */
  get posee() { return this.i >= this.n && !this.posees.length; }

  /**
   * Un pas de temps. Rend `true` quand la construction est finie (tout posé, un court instant passé) : au caller de
   * `finir()`.
   */
  maj(dt) {
    const poses = this.isl.poses;
    if (this.posee) { this.fini += dt; return this.fini > (this.auto ? 0.35 : 0.4); }
    this.t += dt; this.now += dt;
    for (const e of this.posees) if (!e.posee && this.now - e.at >= this.chute) { e.posee = true; this.isl.board.place(e.q, e.r, { ...e.t }); }
    this.posees = this.posees.filter((e) => !e.posee);   // posée : le plateau la dessine, fondue à ses voisines
    while (this.t >= this.pas && this.i < poses.length) {
      if (this.i >= this.limite) { this.t = Math.min(this.t, this.pas); break; }   // on attend le chargement, sans accumuler de retard à rattraper d'un coup
      this.t -= this.pas; const p = poses[this.i++];
      if (!this.auto && p.s !== this.isl.season) { const from = this.isl.season; this.isl.season = p.s; if (this.onSaison) this.onSaison(from, p.s); }
      const k = key(p.q, p.r); const deja = this.par.get(k);
      if (deja && deja.posee) { this.isl.board.tiles.set(k, { ...p.t, q: p.q, r: p.r }); this.isl.board.touch(); }   // bâti, fusion, croissance d'une tuile déjà posée : elle change dans le plateau (retouche de l'image)
      else if (deja) { deja.t = { ...p.t, q: p.q, r: p.r }; deja.pop = this.now; }   // encore en l'air : elle change en vol
      else { const e = { q: p.q, r: p.r, t: { ...p.t, q: p.q, r: p.r }, at: this.now, pop: -1, posee: false }; this.par.set(k, e); this.posees.push(e); this.posees.sort((a, c) => (a.r - c.r) || (a.q - c.q)); }
      // un tic discret, jamais plus de six par seconde : la construction s'entend sans couvrir la musique
      if (this.now - this.dernierTic >= 0.16) { this.dernierTic = this.now; this.playSfx(`tile_place_${1 + (this.i % 4)}`, this.auto ? 0.1 : 0.14); }
    }
    return false;
  }

  /** Les tuiles en l'air, dessinées par-dessus le plateau (celles qui sont posées, c'est lui qui les dessine). */
  dessiner(ctx) {
    if (!this.posees.length) return;
    const cam = this.cam, z = cam.z;
    for (const e of this.posees) {
      const w = toWorld(e.q, e.r); const c = cam.toScreen(w.x, w.y);
      if (this.now < e.at) continue;   // pas encore partie
      if (c.x < -150 || c.x > STAGE.W + 150 || c.y < -220 || c.y > STAGE.H + 160) continue;
      const a = clamp((this.now - e.at) / this.chute, 0, 1);                   // la chute : d'assez haut, et un rebond à l'arrivée
      let dy = -(1 - a) * (1 - a) * 170, s = 0.88 + 0.12 * easeOutBack(a), alpha = 0.35 + 0.65 * Math.min(1, a * 2.5);
      if (e.pop >= 0) { const b = clamp((this.now - e.pop) / 0.4, 0, 1); s *= 1 + 0.12 * Math.sin(b * Math.PI); }   // le sursaut d'un bâti
      if (a < 1 && this.r.hexShadow) { ctx.save(); ctx.globalAlpha = 0.28 * a; const sw = TILE_W * z, sh = TILE_H * z; ctx.drawImage(this.r.hexShadow, c.x - sw / 2 + 4 * z, c.y - sh / 2 + 10 * z, sw, sh); ctx.restore(); }
      this.r.drawTileAt(ctx, e.t, c.x, c.y + dy * z, s, alpha);
    }
  }

  /** Rend le plateau vrai (sentiers, régions payées, faune) ; l'île se dénude en fondu (auto) ou d'un coup. Sans effet la seconde fois. */
  finir() {
    if (!this.boardReel) return;
    this.isl.board = this.boardReel; this.boardReel = null; this.posees = [];
    this.r.rejoue = false; this.r.transition = null; this.r.nu = true; this.r._nu0 = this.auto ? null : this.r.time - 10;
    this.isl.board.touch();
  }
}
