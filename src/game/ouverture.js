// L'ouverture : après l'animation du studio, à la place de la barre de chargement, une île se bâtit sous les yeux en dix
// secondes — la construction de la tournée finale (construction.js), sur l'île du titre, jouée d'avance par un robot —
// pendant que le reste des images arrive derrière. Le paysage part en gris et prend ses couleurs avec les tuiles, la
// caméra s'approche lentement, une musique d'un seul tenant (« Cool Intro », onze secondes pleines puis la chute) porte
// le tout, et le titre s'écrit avec la dernière tuile posée. Un toucher passe. Idée du commanditaire, 28 septembre.
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
import { key } from './hex.js';
import { Decor, spriteKey } from './decor.js';
import { AudioSys } from '../core/audio.js';
import { Assets } from '../core/assets.js';
import { clamp } from '../core/math.js';
import { campaignIsland, islandOptions } from '../data/campaign.js';
import { Board } from './board.js';

/** L'île du titre : toujours la même (l'île qui se souvient), jouée par le robot du meilleur coup, sans hasard. */
export const ILE_DU_TITRE = 12;
const DUREE = 3.5;      // la construction (s) : vive, comme en tête de tournée (« il faut que ça aille beaucoup plus vite »)
const CHUTE = 0.4;      // le temps de tomber d'une tuile (s)
const TENUE = 1.6;      // le titre reste seul à l'écran avant le menu (s), si le chargement est fini

const doux = (t) => t * t * (3 - 2 * t);

export class OuvertureScene {
  constructor() { this.prete = false; this.finie = null; }

  /**
   * Avant les images : l'île est jouée d'un trait, ses poses enregistrées, sa caméra et son rendu prêts. Rend l'ensemble
   * des clés d'images dont la construction a besoin (les sols, les tuiles et le décor de cette île à cette saison, la
   * mer) : le chargeur les prend d'abord. Une centaine de kilo-octets, contre trois mégaoctets pour tout.
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
    this.isl = isl;
    // les clés qu'il faut : sols, tuiles des familles présentes, décor de l'île finie (le même tirage que le rendu : même graine), mer, ombre et masque d'hexagone
    const s = isl.season, cles = new Set(), toutes = Assets.manifestKeys();
    const familles = new Set(); for (const t of isl.board.tiles.values()) { familles.add(t.family); if (t.dry) familles.add('dry_meadow'); }
    cles.add('ground_grass_spring');   // c'est à cette clé que le rendu décide, à sa naissance, s'il a des sols (sinon : hexagones plats pour toujours)
    for (const k of toutes) {
      if (k.startsWith('hex_') || k.startsWith('sea_')) cles.add(k);
      else if (k.startsWith('ground_') && k.endsWith(`_${s}`)) cles.add(k);
      else for (const f of familles) if (k.startsWith(`${f}_`) && k.endsWith(`_${s}`)) cles.add(k);
    }
    const decor = new Decor(def.seed || 1); decor.sync(isl.board);
    for (const o of decor.objects) if (o.tpl) cles.add(spriteKey(o.tpl, s));
    this.cles = cles; this.prete = true;
    return cles;
  }

  async enter() {
    if (!this.prete) this.preparer();
    const isl = this.isl;
    // le rendu naît ICI, ses images déjà là : créé avant elles, il se croyait sans sols (`legacy`) et dessinait des
    // hexagones plats pour toujours — la première ouverture montrait des tuiles sans leur forme naturelle
    this.cam = new Camera();
    this.particles = new ParticleSystem(400); this.fx = new Effects(this.particles);
    this.renderer = new IslandRenderer(isl, this.cam, this.fx, this.particles);
    this.renderer.finale = true; this.renderer.hover = null;
    const cam = this.cam;
    this.marges = () => (STAGE.compact ? { uiLeft: 16, uiRight: 16, uiTop: STAGE.portrait ? 170 : 90, uiBottom: STAGE.portrait ? 90 : 40, padding: 24 } : { uiLeft: 60, uiRight: 60, uiTop: 150, uiBottom: 70, padding: 40 });
    cam.fit(isl.board.mask, { ...this.marges(), immediate: true });
    this.zoomFin = cam.tzoom; cam.zoom = cam.tzoom = this.zoomFin * 0.86;   // la caméra s'approche pendant toute la construction
    this.t = 0; this.titreT = -1; this.chargeFini = false; this.passee = false; this.sortie = 0;
    this.construction = new Construction({ isl, renderer: this.renderer, cam, auto: true, duree: DUREE, chute: CHUTE, ecart: 0.06, playSfx: (k, v) => { if (AudioSys.has(k)) AudioSys.play(k, { volume: v }); } });
    // le thème du menu part ici et continue sans coupure au menu (le morceau dédié d'abord essayé, « Cool Intro », n'a pas plu)
    AudioSys.init(); AudioSys.playMusic('menu', { fade: 1.5 }).catch(() => {});
    this.el = document.getElementById('ouverture'); if (this.el) { this.el.hidden = false; this.el.classList.remove('titre', 'attente', 'off'); this.progres(this._p || 0); }
    this.finie = new Promise((r) => { this._fin = r; });
    this._passer = (e) => { if (e && e.type === 'keydown' && e.code === 'KeyM') return; this.passer(); };
    if (this.el) this.el.addEventListener('pointerdown', this._passer);
    window.addEventListener('keydown', this._passer);
  }
  exit() {
    if (this.el) { this.el.removeEventListener('pointerdown', this._passer); this.el.classList.add('off'); setTimeout(() => { if (this.el) this.el.hidden = true; }, 700); }
    window.removeEventListener('keydown', this._passer);
  }

  /** L'avancement du chargement du reste (0 à 1) : la ligne sous le titre le montre tant qu'il n'est pas fini. */
  progres(p) { this._p = p; const el = this.el && this.el.querySelector('.ouv-charge i'); if (el) el.style.width = `${Math.round(p * 100)}%`; }
  /** Le chargement de tout le reste est fini : le menu peut suivre dès que le titre a été lu. */
  chargementFini() { this.chargeFini = true; this.progres(1); if (this.el) this.el.classList.remove('attente'); }
  /** Un toucher : la construction finit d'un coup, le titre s'écrit, et le menu suit dès que le chargement le permet. */
  passer() { if (this.passee) return; this.passee = true; if (this.construction) { this.construction.finir(); this.construction = null; } this.montrerTitre(); }
  montrerTitre() {
    if (this.titreT >= 0) return; this.titreT = 0;
    if (this.el) { this.el.classList.add('titre'); if (!this.chargeFini) this.el.classList.add('attente'); }   // le titre est là ; s'il reste à charger, on le montre tout de suite
    if (AudioSys.has('region_close')) AudioSys.play('region_close', { volume: 0.3 });
  }

  update(dt) {
    this.t += dt;
    const cam = this.cam;
    if (this.construction) {
      if (this.construction.maj(dt)) { this.construction.finir(); this.construction = null; }
      if (this.construction && this.construction.posee) this.montrerTitre();   // le titre s'écrit avec la dernière tuile posée, pas après
      const a = doux(clamp(this.t / (DUREE + 1), 0, 1)); cam.zoom = cam.tzoom = this.zoomFin * (0.86 + 0.14 * a);
    } else { this.montrerTitre(); cam.update(dt); }
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
    const gris = this.passee ? 0 : clamp(1 - this.t / (DUREE * 0.9), 0, 1);
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
