// Tournée finale : la caméra recule sur l'île finie, s'arrête sur trois ou quatre endroits qui ont fait
// la partie, salue tout le reste d'une seule vague, laisse l'année
// tourner d'un trait, puis fabrique la carte postale autour du paysage — le nom s'écrit, les étoiles se
// posent, un voilier s'en va — et la carte reste là, tant que le joueur n'a pas choisi : voir le
// récapitulatif, ou l'enregistrer. Un toucher presse le pas, un second saute à la carte.
//
// Ce qu'elle remplace : douze étapes de même durée, du plus petit au plus grand, avec une caméra qui ne
// s'approchait jamais vraiment (trois dixièmes vers la cible) et un bandeau plein écran qui cachait l'île
// au moment où elle était la plus belle. La tournée d'avant est gardée mot pour mot dans
// `finale_classique.js` : l'option `finaleClassique` y revient sans rien changer d'autre.
//
// Il y a eu un tour de cadran (jour, nuit, jour) pendant le recul, d'abord en fondu, puis en fronts qui
// traversaient l'île, avec des halos au pied des maisons. Le commanditaire l'a trouvé bizarre et l'a
// fait retirer entièrement (journal 92) : le recul est un recul, rien d'autre.
import { toWorld, key } from './hex.js';
import { STORY } from '../data/story.js';
import { STAGE } from '../core/stage.js';
import { Save } from '../core/save.js';
import { clamp, TAU, rnd } from '../core/math.js';
import { waterBodies } from './water.js';
import { SEASONS } from '../data/tiles.js';
import { cadreCarte, habillerCarte, geoCarte, renderPostcard, postcardName } from './postcard.js';
import { insignesDe, TAMPON } from './tampon.js';
import { exporterCarte } from '../ui/postcard.js';
import { showUI, hideUI, h, button } from '../ui/dom.js';

/** Familles de région visitables (l'eau a son propre compte : ce sont des plans d'eau, pas des régions). */
const REGION_LABEL = { forest: 'Forêt', meadow: 'Prairie', field: 'Champs', hamlet: 'Village', orchard: 'Verger', marsh: 'Marais', rock: 'Massif', hill: 'Collines', heath: 'Lande', sand: 'Plage' };
/** Le nom d'un lieu quand on s'y arrête : pas « Prairie de 4 » — un décompte — mais « les prés ». */
const LIEU = { forest: 'La grande forêt', meadow: 'Les prés', field: 'Les champs', hamlet: 'Le village', orchard: 'Le verger', marsh: 'Le marais', rock: 'Le massif', hill: 'Les collines', heath: 'La lande', sand: 'La plage' };
const EAU = { pond: 'L’étang', lake: 'Le lac', mountainLake: 'Le lac de montagne', river: 'La rivière' };
const ANIMAL_LINE = { rabbit: 'les lapins y courent', moose: 'l’élan y passe', bear: 'l’ours y dort', owl: 'le hibou y veille', duck: 'les canards s’y posent', penguin: 'les manchots y glissent', frog: 'la grenouille y chante', chicken: 'les poules y picorent', horse: 'le cheval y monte', cow: 'la vache y broute', goat: 'la chèvre y grimpe' };

/**
 * Le tempo, en secondes. `long` : la première fois qu'on termine une île, on prend le temps.
 * `court` : les fois suivantes — le joueur connaît le paysage, il veut son bilan : un seul plan, des
 * saisons rapides.
 */
const DUREE = {
  long: { reveil: 2.6, plan: 1.8, vague: 1.5, saison: 1.15, titre: 4 },
  court: { reveil: 1.6, plan: 1.5, vague: 1.2, saison: 0.7, titre: 2.8 },
};

const doux = (t) => t * t * (3 - 2 * t);
const maj = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export class Finale {
  constructor(scene) {
    this.sc = scene; this.isl = scene.isl; this.cam = scene.cam; this.fx = scene.fx; this.r = scene.renderer;
    this.t = 0; this.stepT = 0; this.phaseT = 0; this.done = false; this.vitesse = 1;
    this.phase = 'reveil'; this.idx = -1; this.plan = null; this.sweepIdx = -1;
    this.score = 0; this.target = this.isl.result ? this.isl.result.score : this.isl.score;
    this.season0 = this.isl.season; this.starsShown = 0; this.stars = this.isl.result ? this.isl.result.stars : 0;
    this.bandes = 0; this.lettres = 0; this.salues = new Set(); this.vagueNotes = 0;
    const d = this.isl.def;
    // Version courte dès la deuxième réussite sur la même île : `plays` ne compte que les parties
    // DÉJÀ finies (celle-ci n'y entrera qu'au bilan), donc un seul test suffit.
    this.court = !!(d.id && ((Save.campaign.plays || {})[d.id] || 0) > 0);
    this.D = this.court ? DUREE.court : DUREE.long;

    this.camA = this.instantane();
    this.cam.fit(this.isl.board.mask, { uiLeft: 20, uiRight: 20, uiTop: 90, uiBottom: 60, padding: 60 });
    this.centre = { x: this.cam.tx, y: this.cam.ty, z: this.cam.tzoom, ox: this.cam.offsetX, oy: this.cam.offsetY };
    // Si le joueur regardait déjà l'île entière, le recul ne se verrait pas : on part d'un cheveu plus près.
    if (Math.abs(this.camA.z - this.centre.z) < this.centre.z * 0.06) this.camA = { ...this.camA, z: this.centre.z * 1.14 };
    this.camB = this.centre;
    this.cadre = cadreCarte(this.isl, STAGE.W, STAGE.H);   // le cadrage de la carte postale : la fin du voyage
    this.bornes = this.bornesIle();
    this.plans = this.choisirPlans();
    const vill = this.plans.find((p) => p.famille === 'hamlet');
    this.versLaMer = vill ? { x: vill.x, y: vill.y } : { x: this.centre.x, y: this.centre.y + 180 };

    this.r.finale = true; this.r.hover = null;
    this.r.nu = true;    // la grille des cases vides et le contour autour du vide s'effacent
  }

  /** Les bornes du monde de l'île : elles servent à semer les particules sur le front des saisons. */
  bornesIle() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const t of this.isl.board.tiles.values()) { const w = toWorld(t.q, t.r); minX = Math.min(minX, w.x); maxX = Math.max(maxX, w.x); minY = Math.min(minY, w.y); maxY = Math.max(maxY, w.y); }
    if (minX === Infinity) return { minX: -200, maxX: 200, minY: -200, maxY: 200 };
    return { minX, maxX, minY, maxY };
  }

  /**
   * Les plans de la tournée : trois ou quatre endroits choisis pour ce qu'ils SONT, pas pour ce qu'ils
   * rapportent — la plus grande région, le village, là où vit la faune, l'eau qui rejoint la mer, la
   * tuile rare. Le reste de l'île n'est pas oublié pour autant : la vague, juste après, le salue d'un
   * seul geste. Les plans sont ensuite rangés d'ouest en est, pour que la caméra TRAVERSE l'île au lieu
   * de sauter d'un bout à l'autre.
   */
  choisirPlans() {
    const b = this.isl.board, isl = this.isl, cand = [];
    const pousser = (cells, id, poids, titre, famille) => { if (cells && cells.length && titre) cand.push({ cells, id, poids, titre, famille }); };
    const regions = [];
    for (const fam of Object.keys(REGION_LABEL)) for (const reg of b.regions(fam)) if (reg.size >= 2) regions.push({ reg, fam });
    // 1. la plus grande région : c'est elle qu'on a bâtie
    const grande = regions.slice().sort((a, c) => c.reg.size - a.reg.size)[0];
    if (grande) pousser(grande.reg.cells, grande.reg.id, 100, LIEU[grande.fam], grande.fam);
    // 2. là où vit la faune, nommée par son animal
    const parRegion = new Map();
    for (const a of isl.fauna.values()) { if (!a.regionId) continue; const l = parRegion.get(a.regionId) || []; l.push(a); parRegion.set(a.regionId, l); }
    let faune = null;
    for (const [id, l] of parRegion) { const x = regions.find((y) => y.reg.id === id); if (x && (!faune || l.length > faune.l.length)) faune = { x, l }; }
    if (faune && ANIMAL_LINE[faune.l[0].species]) pousser(faune.x.reg.cells, faune.x.reg.id, 86, maj(ANIMAL_LINE[faune.l[0].species]), faune.x.fam);
    // 3. l'eau qui rejoint la mer, sinon la plus grande nappe
    const eaux = waterBodies(b);
    const riviere = eaux.find((w) => w.kind === 'river' && w.mouth);
    if (riviere) pousser(riviere.cells, riviere.id, 80, 'Là où la rivière rejoint la mer', 'water');
    else { const nappe = eaux.filter((w) => w.size >= 2).sort((a, c) => c.size - a.size)[0]; if (nappe) pousser(nappe.cells, nappe.id, 62, EAU[nappe.kind], 'water'); }
    // 4. le village
    const village = regions.filter((x) => x.fam === 'hamlet').sort((a, c) => c.reg.size - a.reg.size)[0];
    if (village) pousser(village.reg.cells, village.reg.id, 74, LIEU.hamlet, 'hamlet');
    // 5. une tuile rare : c'est souvent la plus jolie chose posée sur l'île
    const rare = [...b.tiles.values()].find((t) => t.rare && STORY.tiles[t.family]);
    if (rare) pousser([rare], `rare:${key(rare.q, rare.r)}`, 56, STORY.tiles[rare.family].name, rare.family);

    const n = this.court ? 1 : STAGE.compact ? 3 : (b.tiles.size >= 60 ? 4 : 3);
    const vus = new Set(), gardes = [];
    for (const c of cand.sort((a, d) => d.poids - a.poids)) {
      if (gardes.length >= n || vus.has(c.id)) continue;
      // deux plans sur les mêmes cases, c'est deux fois le même plan
      if (gardes.some((g) => g.cells.some((x) => c.cells.some((y) => x.q === y.q && x.r === y.r)))) continue;
      vus.add(c.id); gardes.push(c);
    }
    for (const g of gardes) { let x = 0, y = 0; for (const c of g.cells) { const w = toWorld(c.q, c.r); x += w.x; y += w.y; } g.x = x / g.cells.length; g.y = y / g.cells.length; }
    return gardes.sort((a, c) => a.x - c.x);
  }

  // --- caméra : on pilote la position ET la cible, si bien que le lissage de la caméra ne fait rien
  //     par-dessus et que le mouvement est exactement celui qu'on écrit ici.
  instantane() { const c = this.cam; return { x: c.x, y: c.y, z: c.zoom, ox: c.offsetX, oy: c.offsetY }; }
  majCamera(e) {
    const a = this.camA, b = this.camB, c = this.cam; if (!a || !b) return;
    c.x = c.tx = a.x + (b.x - a.x) * e;
    c.y = c.ty = a.y + (b.y - a.y) * e;
    c.zoom = c.tzoom = a.z + (b.z - a.z) * e;
    c.offsetX = a.ox + (b.ox - a.ox) * e;
    c.offsetY = a.oy + (b.oy - a.oy) * e;
  }

  skip(k = null) {
    if (this.done) return;
    // sur la carte, aucun toucher ne passe : seuls les boutons (ou Entrée) mènent au récapitulatif
    if (this.phase === 'carte') { if (k === 'Enter' || k === 'NumpadEnter' || k === 'Space') this.finish(); return; }
    if (this.vitesse < 2) { this.vitesse = 2.6; if (this.r.transition) this.r.transitionSpeed *= 2.6; return; }   // le premier toucher presse le pas
    this.entrer('carte');   // le second saute à la carte, qui attend
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.isl.season = this.season0; this.isl.board.touch();
    this.r.transition = null; this.r.transitionSpeed = 1; this.r.finale = false; this.r.nu = false;
    if (this.boutons) { hideUI(); this.boutons = null; }
    this.sc.onFinaleDone();
  }

  entrer(p) {
    this.phase = p; this.stepT = 0; this.phaseT = 0;
    if (p === 'tour') { this.idx = -1; if (!this.plans.length) this.entrer('vague'); return; }
    this.camA = this.instantane();
    if (p === 'vague') { this.camB = this.centre; this.lancerVague(); }
    else if (p === 'saisons') { this.camB = this.centre; this.sweepIdx = -1; }
    else if (p === 'titre') { this.camB = this.cadre; this.bandes = 0; this.lettres = 0; }
    else if (p === 'carte') {
      // la carte est là, entière, et elle reste : le paysage continue de vivre dessous
      this.camB = this.cadre; this.majCamera(1); this.bandes = 1; this.lettres = 1; this.starsShown = this.stars; this.r.transition = null;
      this.montrerBoutons();
    }
  }

  /** Les deux boutons de la carte, en bas du paysage, au-dessus du bandeau : voir le récapitulatif, ou l'enregistrer. */
  montrerBoutons() {
    if (this.boutons) return;
    const g = geoCarte(STAGE.W);
    const voir = button('Voir le récapitulatif →', () => this.finish(), { cls: 'btn-primary' });
    const garder = button('Enregistrer la carte', () => { try { exporterCarte(renderPostcard(this.sc), postcardName(this.sc)); } catch (e) { console.warn('carte postale', e); } }, { iconName: 'icon_save' });
    this.boutons = h('div', { class: 'carte-actions', style: `bottom:${g.bottom + 14}px` }, garder, voir);
    showUI(this.boutons, 'carte-wrap');
  }

  update(dt) {
    if (this.done) return;
    dt *= this.vitesse;
    this.t += dt; this.stepT += dt; this.phaseT += dt;
    const D = this.D;
    if (this.phase === 'reveil') {
      this.majCamera(doux(clamp(this.stepT / D.reveil, 0, 1)));
      if (this.stepT >= D.reveil) this.entrer('tour');
    } else if (this.phase === 'tour') {
      if (this.idx < 0 || this.stepT >= D.plan) {
        this.idx++; this.stepT = 0;
        if (this.idx >= this.plans.length) { this.entrer('vague'); return; }
        this.entrerPlan();
      }
      // la caméra arrive aux sept dixièmes puis continue d'avancer tout doucement : un plan qui vit
      this.majCamera(doux(clamp(this.stepT / (D.plan * 0.7), 0, 1)) + Math.max(0, this.stepT / D.plan - 0.7) * 0.12);
    } else if (this.phase === 'vague') {
      this.majCamera(doux(clamp(this.stepT / (D.vague * 0.8), 0, 1)));
      this.majVague();
      if (this.stepT >= D.vague) this.entrer('saisons');
    } else if (this.phase === 'saisons') {
      // le cadrage tient, avec un recul imperceptible qui empêche le plan de se figer
      this.majCamera(1);
      this.cam.zoom = this.cam.tzoom = this.centre.z * (1 - 0.025 * clamp(this.phaseT / (D.saison * 4), 0, 1));
      if (this.sweepIdx < 0 || this.stepT >= D.saison) {
        this.sweepIdx++; this.stepT = 0; this.salues = new Set();
        if (this.sweepIdx > 3) { this.entrer('titre'); return; }   // quatre fronts : l'année entière, et on rentre chez soi
        const from = this.isl.season;
        const to = SEASONS[(SEASONS.indexOf(this.season0) + 1 + this.sweepIdx) % 4];
        this.r.startTransition(from, to); this.r.transitionSpeed = (1.6 / D.saison) * this.vitesse;
        this.isl.season = to; this.isl.board.touch();
        this.sc.playSfx(`season_${to}`, 0.4);
      }
      this.majFront();
    } else if (this.phase === 'titre') {
      this.majTitre();
    } else if (this.phase === 'carte') {
      this.majCamera(1);   // et rien d'autre : pas de minuterie, la carte attend le joueur
    }
    this.majScore();
  }

  entrerPlan() {
    const p = this.plans[this.idx]; this.plan = p;
    this.camA = this.instantane();
    this.camB = { x: p.x, y: p.y, z: this.centre.z * (p.cells.length <= 2 ? 2.1 : 1.8), ox: this.centre.ox, oy: this.centre.oy };
    // l'onde part du milieu du lieu et gagne ses bords : il s'allume, il ne clignote pas
    const cells = p.cells.map((c) => { const w = toWorld(c.q, c.r); return { q: c.q, r: c.r, d: Math.min(0.5, Math.hypot(w.x - p.x, w.y - p.y) / 420) }; });
    this.fx.ring(cells, p.famille === 'water' ? '#8fd0ff' : '#ffd77a');
    this.fx.closeBurst(p.x, p.y, Math.min(6, p.cells.length));
    for (const [k, a] of this.isl.fauna) if (a.regionId === p.id) this.fx.fauna(k, 'arrive');
    this.sc.playSfx(`point_${Math.min(8, 2 + this.idx * 2)}`, 0.5);   // une gamme qui monte de plan en plan
  }

  /**
   * La vague : tout ce que la tournée n'a pas visité s'allume d'un seul geste, d'ouest en est. Une onde
   * par couleur (la terre en doré, l'eau en bleu) avec un retard par case tiré de sa position — c'est ce
   * retard, déjà prévu par `Effects.ring`, qui fait la vague.
   */
  lancerVague() {
    const b = this.isl.board, vus = new Set(this.plans.map((p) => p.id));
    const terre = [], eau = [];
    let minX = Infinity, maxX = -Infinity;
    const ajouter = (cells, sac) => { for (const c of cells) { const w = toWorld(c.q, c.r); minX = Math.min(minX, w.x); maxX = Math.max(maxX, w.x); sac.push({ q: c.q, r: c.r, x: w.x }); } };
    for (const fam of Object.keys(REGION_LABEL)) for (const reg of b.regions(fam)) if (reg.size >= 2 && !vus.has(reg.id)) ajouter(reg.cells, terre);
    for (const w of waterBodies(b)) if (!vus.has(w.id)) ajouter(w.cells, eau);
    if (!terre.length && !eau.length) return;
    const span = Math.max(1, maxX - minX), retard = this.D.vague * 0.72;
    for (const c of [...terre, ...eau]) c.d = (c.x - minX) / span * retard;
    if (terre.length) this.fx.ring(terre, '#ffd77a');
    if (eau.length) this.fx.ring(eau, '#8fd0ff');
    this.vagueNotes = 0;
  }

  majVague() {
    const n = Math.min(6, Math.floor(this.stepT / (this.D.vague * 0.72 / 6)) + 1);
    while (this.vagueNotes < n) { this.vagueNotes++; this.sc.playSfx(`point_${Math.min(8, this.vagueNotes + 1)}`, 0.34); }
  }

  /**
   * Le front d'une saison. Le balayage existait déjà (`seasonFor` change la saison colonne par colonne,
   * donc l'île change VRAIMENT au passage du front) ; ce qui manquait, c'est ce que la saison apporte
   * avec elle. On sème donc ses particules sur la ligne du front, et la faune qu'il vient de dépasser
   * fait son petit bond.
   */
  majFront() {
    const tr = this.r.transition; if (!tr) return;
    const p = tr.t / 1.6; if (p <= 0 || p >= 1) return;
    const wx = this.cam.toWorldPoint(-200 + p * (STAGE.W + 400), STAGE.H / 2).x;
    const ete = tr.to === 'summer';
    const img = this.fx.img(tr.to === 'autumn' ? 'leaf_' : tr.to === 'spring' ? 'petal_' : tr.to === 'winter' ? 'snowflake_' : 'light_') || this.fx.img('circle_');
    // hors de l'île, rien : des feuilles qui tombent en plein milieu de la mer, c'est du confetti
    if (wx < this.bornes.minX - 90 || wx > this.bornes.maxX + 90) return this.saluer(wx);
    if (img) for (let i = 0, n = this.r.lowFx ? 1 : 3; i < n; i++) {
      const g = { x: wx + rnd(-26, 26), y: rnd(this.bornes.minY - 40, this.bornes.maxY + 40), vx: rnd(-20, 30), vy: ete ? rnd(-34, -12) : rnd(30, 70), life: rnd(1.1, 2), size: rnd(9, 17), sizeEnd: rnd(6, 13), img, alpha: 0.95, alphaEnd: 0, layer: 1, rot: rnd(0, TAU), rotV: rnd(-2.5, 2.5) };
      this.fx.p.emit(ete ? { ...g, color: '#ffe9a8', blend: 'lighter' } : g);
    }
    this.saluer(wx);
  }

  /** La faune que le front vient de dépasser fait son petit bond, une fois par balayage. */
  saluer(wx) {
    for (const [k, a] of this.isl.fauna) {
      if (this.salues.has(k) || toWorld(a.q, a.r).x > wx) continue;
      this.salues.add(k); this.fx.fauna(k, 'arrive');
    }
  }

  /**
   * Le titre : la carte postale se fabrique autour du paysage VIVANT. Les bandeaux de papier glissent,
   * le nom s'écrit, les étoiles se posent après un silence, un voilier s'en va. Rien ne cache l'île —
   * c'est tout l'intérêt : elle est dans le cadre, pas derrière.
   */
  majTitre() {
    const D = this.D, t = this.stepT;
    this.majCamera(doux(clamp(t / (D.titre * 0.45), 0, 1)));
    this.bandes = doux(clamp(t / (D.titre * 0.26), 0, 1));
    this.lettres = clamp((t - D.titre * 0.2) / (D.titre * 0.33), 0, 1);
    // Le nom fini, on ne dit plus rien pendant une demi-seconde : c'est ce silence qui fait les étoiles.
    const premiere = D.titre * 0.53 + 0.5, pas = this.court ? 0.3 : 0.42;
    if (t > premiere + this.starsShown * pas && this.starsShown < this.stars) { this.starsShown++; this.sc.playSfx(`star_${this.starsShown}`, 0.7); }
    // après les étoiles, le coup de tampon : l'encre paraît d'un coup, avec le choc sourd du bois sur la table
    // chaque tampon tombe à son tour, avec le choc du bois ; celui de l'archétype rallume la région qui l'a valu
    const tape = premiere + this.stars * pas + 0.35, ins = insignesDe(this.sc);
    const avant = this.tampons || 0; this.tampons = Math.max(0, t - tape);
    ins.forEach((it, n) => {
      const d = n * TAMPON.espace; if (!(avant <= d && this.tampons > d)) return;
      this.sc.playSfx('tile_place_2', 0.8);
      if (it.cells) { const c0 = it.cells.reduce((m, c) => { const w = toWorld(c.q, c.r); return { x: m.x + w.x / it.cells.length, y: m.y + w.y / it.cells.length }; }, { x: 0, y: 0 }); this.fx.ring(it.cells.map((c) => { const w = toWorld(c.q, c.r); return { q: c.q, r: c.r, d: Math.min(0.5, Math.hypot(w.x - c0.x, w.y - c0.y) / 420) }; }), '#ffd77a'); }
    });
    const finTampons = ins.length ? tape + (ins.length - 1) * TAMPON.espace + TAMPON.chute + 1.4 : 0;   // le temps de lire la dernière légende
    if (!this.voilier && t > 0.25) { this.voilier = true; this.r.envoyerVoilier(this.versLaMer, D.titre * 1.3); }
    if (!this.baleine && t > D.titre * 0.3) { this.baleine = true; if (this.r.anses().size) this.r.souffleBaleine(D.titre); }
    // la carte attend que le tampon soit tombé (trois étoiles et un tampon débordent un peu la durée du titre)
    if (t >= Math.max(D.titre, finTampons)) this.entrer('carte');
  }

  /** Le compteur monte pendant la tournée et finit sa course avec la vague. */
  majScore() {
    const D = this.D; let av = 0;
    if (this.phase === 'tour') av = 0.15 + 0.5 * ((this.idx + clamp(this.stepT / D.plan, 0, 1)) / Math.max(1, this.plans.length));
    else if (this.phase === 'vague') av = 0.65 + 0.35 * clamp(this.stepT / (D.vague * 0.8), 0, 1);
    else if (this.phase === 'saisons' || this.phase === 'titre') av = 1;
    this.score = Math.min(this.target, Math.round(this.target * clamp(av, 0, 1)));
  }

  /** Surimpression écran : le compteur, le nom du lieu visité, puis la carte postale. */
  render(ctx) {
    if (this.done) return;
    const W = STAGE.W, H = STAGE.H, compact = STAGE.compact;
    if (this.phase === 'carte') { habillerCarte(ctx, this.sc, W, H, { legendes: true }); return; }
    const fin = this.phase === 'titre' ? clamp(this.stepT / (this.D.titre * 0.26), 0, 1) : 0;
    if (this.phase === 'titre') habillerCarte(ctx, this.sc, W, H, { bandes: this.bandes, lettres: this.lettres, etoiles: this.starsShown, tampons: this.tampons || 0, legendes: true });
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // le compteur, tant que la carte n'a pas pris le relais (elle porte le score, elle aussi)
    const a = clamp(this.t / 0.8, 0, 1) * (1 - fin);
    if (a > 0.01) {
      ctx.globalAlpha = a;
      ctx.font = `700 ${compact ? 12 : 14}px Quicksand, sans-serif`; ctx.fillStyle = 'rgba(43,42,38,0.7)'; ctx.fillText('POINTS', W / 2, compact ? 22 : 30);
      ctx.font = `800 ${compact ? 34 : 46}px Quicksand, sans-serif`; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,253,248,0.9)';
      ctx.strokeText(String(this.score), W / 2, compact ? 50 : 66); ctx.fillStyle = '#2b2a26'; ctx.fillText(String(this.score), W / 2, compact ? 50 : 66);
    }
    // le nom du lieu, EN BAS : l'île reste entière au-dessus
    if (this.phase === 'tour' && this.plan) {
      const k = clamp(this.stepT / 0.3, 0, 1) * (1 - clamp((this.stepT - this.D.plan + 0.32) / 0.32, 0, 1));
      if (k > 0.01) {
        // un nom posé sur un paysage clair ne tient que s'il est cerné de blanc ET dense : le liseré
        // à lui seul avalait les déliés de l'italique, et il n'en restait qu'un gris pâle.
        const y = H - (compact ? 74 : 88);
        ctx.globalAlpha = k; ctx.font = `italic 500 ${compact ? 21 : 31}px Lora, Georgia, serif`;
        ctx.lineJoin = 'round'; ctx.lineWidth = compact ? 5 : 7; ctx.strokeStyle = 'rgba(255,253,248,0.95)';
        ctx.strokeText(this.plan.titre, W / 2, y);
        ctx.fillStyle = this.plan.famille === 'water' ? '#255c80' : '#2b2a26';
        ctx.fillText(this.plan.titre, W / 2, y); ctx.fillText(this.plan.titre, W / 2, y);
      }
    }
    ctx.globalAlpha = 0.6 * a; ctx.font = `700 ${compact ? 10 : 12}px Quicksand, sans-serif`; ctx.fillStyle = '#2b2a26';
    ctx.fillText(this.vitesse > 1 ? 'TOUCHER POUR PASSER' : 'TOUCHER POUR ACCÉLÉRER', W / 2, H - (compact ? 14 : 22));
    ctx.restore();
  }
}
