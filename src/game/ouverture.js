// L'ouverture : après l'animation du studio, l'île du titre se bâtit sous les yeux — et c'est elle la barre de
// chargement (l'idée du commanditaire, 28 septembre) : chaque tuile tombe au rythme des images qui arrivent, la dernière
// se pose quand tout est là, et le titre s'écrit dessus. Jamais plus vite que cinq secondes pour toute l'île (deuxième
// visite, tout en cache : ce serait un éclair), jamais plus loin que le chargement (un réseau lent : les tuiles
// attendent, honnêtement). Un petit cercle en bas à droite tourne tant que ça charge.
//
// La construction est celle de la tournée finale (construction.js), sur l'île 12 jouée d'avance par le robot du meilleur
// coup, sans hasard : toujours la même île, celle qui se souvient. Les saisons passent avec elle — été, puis un front
// d'automne, d'hiver et de printemps à chaque quart — et le titre vient sur le printemps. Le monde part en gris et prend
// ses couleurs avec les tuiles, la caméra s'approche. Un toucher presse le pas (jamais au-delà du chargement).
//
// Rien n'est dessiné par le code : ce sont les tuiles du jeu, leur décor et la mer ; le gris est un mélange de couleur
// sur l'image déjà peinte. L'île est ensuite remise au menu, qui continue de la faire vivre en fond (AmbientIsland).
import { Island } from './island.js';
import { Camera } from './camera.js';
import { IslandRenderer } from './render.js';
import { ParticleSystem } from '../core/particles.js';
import { Effects } from './effects.js';
import { Construction } from './construction.js';
import { STAGE } from '../core/stage.js';
import { Decor, spriteKey } from './decor.js';
import { AudioSys } from '../core/audio.js';
import { Assets } from '../core/assets.js';
import { clamp } from '../core/math.js';
import { campaignIsland, islandOptions } from '../data/campaign.js';

/** L'île du titre : toujours la même (l'île qui se souvient), jouée par le robot du meilleur coup, sans hasard. */
export const ILE_DU_TITRE = 12;
/** Les saisons de la construction, un quart chacune : le titre vient sur le printemps. */
export const SAISONS = ['summer', 'autumn', 'winter', 'spring'];
const PLANCHER = 5;     // l'île ne se bâtit jamais en moins de cinq secondes (s)
const CHUTE = 0.4;      // le temps de tomber d'une tuile (s)
const TENUE = 1.6;      // le titre reste seul à l'écran avant le menu (s)

const doux = (t) => t * t * (3 - 2 * t);

export class OuvertureScene {
  constructor() { this.prete = false; this.finie = null; this.paliers = 0; this.p = 0; }

  /**
   * Avant les images : l'île est jouée d'un trait, ses poses enregistrées. Rend les paliers d'images à charger dans
   * l'ordre : l'amorce (la mer, les masques d'hexagone : de quoi montrer le plan), puis les tuiles, sols et décor de
   * chaque saison de la construction, dans l'ordre où elles viennent. Le reste des images suit.
   * @returns {{cles:Set<string>, fait:()=>void}[]}
   */
  preparer() {
    const def = { ...campaignIsland(ILE_DU_TITRE), id: 'ouverture', wishes: [] };
    const isl = new Island(def, { upgrades: {}, ...islandOptions(def) });
    for (let k = 0; k < 400 && !isl.ended; k++) {
      const t = isl.current; if (!t) { isl.checkEnd(); break; }
      if (t.work && isl.toShed) { isl.toShed(); continue; }
      let best = null, bs = -Infinity;
      for (const c of isl.board.legalCells()) { const p = isl.preview(c.q, c.r); if (p && p.total > bs) { bs = p.total; best = c; } }
      if (!best || !isl.place(best.q, best.r)) { isl.checkEnd(); break; }
    }
    if (!isl.ended) isl.finish('full');
    isl.season = SAISONS[0];
    this.isl = isl;
    const toutes = Assets.manifestKeys();
    const familles = new Set(); for (const t of isl.board.tiles.values()) { familles.add(t.family); if (t.dry) familles.add('dry_meadow'); }
    const decor = new Decor(def.seed || 1); decor.sync(isl.board);
    // l'amorce : la mer et les masques ; et la clé à laquelle le rendu décide, à sa naissance, s'il a des sols (sinon : hexagones plats pour toujours)
    const amorce = new Set(['ground_grass_spring']);
    for (const k of toutes) if (k.startsWith('hex_') || k.startsWith('sea_')) amorce.add(k);
    const etapes = [{ cles: amorce, fait: () => { this.paliers = Math.max(this.paliers, 1); if (this.onAmorce) this.onAmorce(); } }];
    SAISONS.forEach((s, i) => {
      const cles = new Set();
      for (const k of toutes) {
        if (k.startsWith('ground_') && k.endsWith(`_${s}`)) cles.add(k);
        else for (const f of familles) if (k.startsWith(`${f}_`) && k.endsWith(`_${s}`)) cles.add(k);
      }
      for (const o of decor.objects) if (o.tpl) cles.add(spriteKey(o.tpl, s));
      etapes.push({ cles, fait: () => { this.paliers = Math.max(this.paliers, i + 2); } });
    });
    this.prete = true;
    return etapes;
  }

  async enter() {
    if (!this.prete) this.preparer();
    const isl = this.isl;
    // le rendu naît ICI, l'amorce chargée : créé avant elle, il se croyait sans sols (`legacy`) et dessinait des hexagones plats pour toujours
    this.cam = new Camera();
    this.particles = new ParticleSystem(400); this.fx = new Effects(this.particles);
    this.renderer = new IslandRenderer(isl, this.cam, this.fx, this.particles);
    this.renderer.finale = true; this.renderer.hover = null;
    const cam = this.cam;
    this.marges = () => (STAGE.compact ? { uiLeft: 16, uiRight: 16, uiTop: STAGE.portrait ? 170 : 90, uiBottom: STAGE.portrait ? 90 : 40, padding: 24 } : { uiLeft: 60, uiRight: 60, uiTop: 150, uiBottom: 70, padding: 40 });
    cam.fit(isl.board.mask, { ...this.marges(), immediate: true });
    this.zoomFin = cam.tzoom; cam.zoom = cam.tzoom = this.zoomFin * 0.86;   // la caméra s'approche pendant toute la construction
    this.t = 0; this.titreT = -1; this.chargeFini = false; this.passee = false; this.sortie = 0; this.avance = 0; this.saison = 0;
    this.construction = new Construction({ isl, renderer: this.renderer, cam, auto: true, duree: PLANCHER, chute: CHUTE, ecart: 0.06, playSfx: (k, v) => { if (AudioSys.has(k)) AudioSys.play(k, { volume: v }); } });
    this.construction.limite = 0;   // rien ne tombe avant les images de l'été
    // le thème du menu part ici et continue sans coupure au menu (le morceau dédié d'abord essayé, « Cool Intro », n'a pas plu)
    AudioSys.init(); AudioSys.playMusic('menu', { fade: 1.5 }).catch(() => {});
    this.el = document.getElementById('ouverture'); if (this.el) { this.el.hidden = false; this.el.classList.remove('titre', 'off'); this.el.classList.toggle('charge', !this.chargeFini); }
    this.finie = new Promise((r) => { this._fin = r; });
    this._passer = (e) => { if (e && e.type === 'keydown' && e.code === 'KeyM') return; this.passer(); };
    if (this.el) this.el.addEventListener('pointerdown', this._passer);
    window.addEventListener('keydown', this._passer);
  }
  exit() {
    if (this.el) { this.el.removeEventListener('pointerdown', this._passer); this.el.classList.add('off'); setTimeout(() => { if (this.el) this.el.hidden = true; }, 700); }
    window.removeEventListener('keydown', this._passer);
  }

  /** L'avancement du chargement de toutes les images (0 à 1) : c'est lui qui donne le pas aux tuiles. */
  progres(p) { this.p = p; }
  /** Tout est chargé : le cercle s'arrête ; le menu suivra dès que la dernière tuile aura été posée et le titre lu. */
  chargementFini() { this.chargeFini = true; this.p = 1; if (this.el) this.el.classList.remove('charge'); }
  /** Un toucher presse le pas : les tuiles tombent aussi vite que le chargement le permet (jamais au-delà). */
  passer() { if (this.passee) return; this.passee = true; if (this.construction) { this.construction.pas = 0.03; this.construction.chute = 0.25; } }
  montrerTitre() {
    if (this.titreT >= 0) return; this.titreT = 0;
    if (this.el) this.el.classList.add('titre');
    if (AudioSys.has('region_close')) AudioSys.play('region_close', { volume: 0.3 });
  }

  /** Jusqu'où les tuiles peuvent tomber : le chargement d'abord, et jamais au-delà des images de la saison en cours. */
  limite() {
    const n = this.construction.n; const saisons = Math.max(0, this.paliers - 1);   // paliers : 1 = amorce, 2 = été, 3 = automne, 4 = hiver, 5 = printemps
    if (!saisons) return 0;
    const parSaison = saisons >= SAISONS.length ? n : Math.ceil(n * saisons / SAISONS.length) - 1;   // on ne franchit pas un front sans les images de la saison qui vient
    return Math.min(parSaison, this.chargeFini ? n : Math.floor(n * this.p));
  }

  update(dt) {
    this.t += dt;
    const cam = this.cam, c = this.construction;
    if (c) {
      c.limite = this.limite();
      // les saisons passent avec la construction : un front à chaque quart, été → automne → hiver → printemps
      const quart = Math.min(SAISONS.length - 1, Math.floor(c.i / c.n * SAISONS.length));
      if (quart > this.saison) { const from = SAISONS[this.saison]; this.saison = quart; const to = SAISONS[quart]; this.isl.season = to; this.renderer.startTransition(from, to); this.renderer.transitionSpeed = 2.2; if (AudioSys.has('season_sweep')) AudioSys.play('season_sweep', { volume: 0.18 }); }
      if (c.maj(dt)) { c.finir(); this.construction = null; this.montrerTitre(); }
      this.avance += (c ? Math.min(1, c.i / c.n) - this.avance : 0) * Math.min(1, dt * 3);   // l'avancée, lissée : la caméra et la couleur la suivent
      cam.zoom = cam.tzoom = this.zoomFin * (0.86 + 0.14 * doux(this.avance));
    } else { this.avance = 1; cam.update(dt); }
    if (this.titreT >= 0) {
      this.titreT += dt;
      // le titre s'efface avant que le menu n'écrive le sien : jamais deux « Cent Saisons » à l'écran
      if (this.titreT >= (this.passee ? 0.8 : TENUE) && this.chargeFini && this._fin && !this.sortie) { this.sortie = this.titreT; if (this.el) this.el.classList.add('off'); }
      if (this.sortie && this.titreT - this.sortie >= 0.6 && this._fin) { const f = this._fin; this._fin = null; f(); }
    }
    this.particles.update(dt); this.fx.update(dt);
  }

  render(ctx, alpha, dt) {
    this.renderer.render(ctx, alpha, dt);
    if (this.construction) this.construction.dessiner(ctx);
    // le monde part en gris et prend ses couleurs avec les tuiles (mélange « saturation » sur l'image peinte, puis un voile clair)
    const gris = clamp(1 - this.avance / 0.8, 0, 1);
    if (gris > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = gris; ctx.fillStyle = '#8a8a8a'; ctx.fillRect(0, 0, STAGE.W, STAGE.H);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.3 * gris; ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, STAGE.W, STAGE.H);
      ctx.restore();
    }
  }

  /** L'île, sa caméra et son rendu passent au menu, qui continue de la faire vivre en fond. */
  remettre() { const r = { isl: this.isl, cam: this.cam, particles: this.particles, fx: this.fx, renderer: this.renderer }; this.isl = null; this.renderer = null; return r; }
}
