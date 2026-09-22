// LA TOURNÉE D'AVANT, gardée au cas où. C'est mot pour mot la tournée finale telle qu'elle était
// avant la refonte du journal 90 : recul, douze étapes de même durée du plus petit au plus grand,
// balayage des saisons, bandeau plein écran avec le nom et les étoiles.
//
// Elle n'est pas branchée par défaut. Pour y revenir sans rien recompiler, il suffit de mettre
// l'option `finaleClassique` à vrai dans la sauvegarde (Options → mode test, ou la console :
// `CS.Save.options.finaleClassique = true; CS.Save.save()`), ce que `startFinale()` lit à chaque île.
// Tournée finale : quand l'île est terminée, la caméra recule, chaque région s'illumine à son tour (du plus petit
// au plus grand), les sentiers et rivières scintillent, un compteur monte jusqu'au score, puis les quatre saisons
// balaient l'île, le nom s'écrit et les étoiles se posent. Un toucher, un clic ou une touche passe au bilan.
import { toWorld } from './hex.js';
import { STORY } from '../data/story.js';
import { Assets } from '../core/assets.js';
import { STAGE, uiMargins } from '../core/stage.js';
import { clamp, TAU } from '../core/math.js';
import { waterBodies, KIND_LABEL } from './water.js';
import { SEASONS } from '../data/tiles.js';

const REGION_LABEL = { forest: 'Forêt', meadow: 'Prairie', field: 'Champs', hamlet: 'Village', orchard: 'Verger', marsh: 'Marais', rock: 'Massif', hill: 'Collines', heath: 'Lande', sand: 'Plage' };
const ANIMAL_LINE = { rabbit: 'les lapins y courent', moose: 'l’élan y passe', bear: 'l’ours y dort', owl: 'le hibou y veille', duck: 'les canards s’y posent', penguin: 'les manchots y glissent', frog: 'la grenouille y chante', chicken: 'les poules y picorent', horse: 'le cheval y monte', cow: 'la vache y broute', goat: 'la chèvre y grimpe' };

export class FinaleClassique {
  constructor(scene) {
    this.sc = scene; this.isl = scene.isl; this.cam = scene.cam; this.fx = scene.fx; this.r = scene.renderer;
    this.t = 0; this.done = false; this.phase = 'zoom'; this.idx = -1; this.stepT = 0;
    this.score = 0; this.target = this.isl.result ? this.isl.result.score : this.isl.score;
    this.season0 = this.isl.season; this.sweepIdx = -1; this.starsShown = 0; this.stars = this.isl.result ? this.isl.result.stars : 0;
    const d = this.isl.def; this.name = d.story && STORY.islands[d.story] ? STORY.islands[d.story].name : (d.name || (d.infinite ? 'Île infinie' : 'Jardin'));
    this.stops = this.buildStops();
    this.cam.fit(this.isl.board.mask, { uiLeft: 20, uiRight: 20, uiTop: 90, uiBottom: 60, padding: 60 });
    this.center = { x: this.cam.tx, y: this.cam.ty, z: this.cam.tzoom };
    this.r.finale = true; this.r.hover = null;
    this.r.nu = true;   // la grille des cases vides et le contour autour du vide s'effacent
  }

  /** Étapes de la tournée : régions de deux tuiles ou plus (au plus douze, les plus grandes), du plus petit au plus grand, puis les plans d'eau. */
  buildStops() {
    const b = this.isl.board; const stops = [];
    for (const fam of Object.keys(REGION_LABEL)) for (const reg of b.regions(fam)) if (reg.size >= 2) stops.push({ cells: reg.cells, size: reg.size, id: reg.id, closed: b.regionPaid(reg), label: `${REGION_LABEL[fam]} de ${reg.size}`, family: fam });
    for (const w of waterBodies(b)) if (w.size >= 2 || w.kind === 'pond') stops.push({ cells: w.cells, size: w.size, id: w.id, label: `${KIND_LABEL[w.kind][0].toUpperCase()}${KIND_LABEL[w.kind].slice(1)}${w.size > 1 ? ` de ${w.size}` : ''}${w.kind === 'river' && w.mouth ? ' jusqu’à la mer' : ''}`, family: 'water' });
    stops.sort((a, c) => c.size - a.size); const kept = stops.slice(0, 12).sort((a, c) => a.size - c.size);
    for (const s of kept) {
      let x = 0, y = 0; for (const c of s.cells) { const w = toWorld(c.q, c.r); x += w.x; y += w.y; } s.x = x / s.cells.length; s.y = y / s.cells.length;
      const animals = [...this.isl.fauna.values()].filter((a) => a.regionId === s.id).map((a) => ANIMAL_LINE[a.species]).filter(Boolean);
      if (animals.length) s.label += ` · ${animals[0]}`;
      else if (s.closed) s.label += ' · bien clos';
    }
    return kept;
  }

  skip() { this.finish(); }
  finish() { if (this.done) return; this.done = true; this.isl.season = this.season0; this.r.transition = null; this.r.finale = false; this.r.nu = false; this.sc.onFinaleDone(); }

  update(dt) {
    if (this.done) return;
    this.t += dt; this.stepT += dt;
    const per = this.stops.length > 8 ? 0.55 : 0.75;
    if (this.phase === 'zoom') {
      if (this.t > 1.1) { this.phase = 'tour'; this.stepT = 0; this.idx = -1; }
    } else if (this.phase === 'tour') {
      if (this.idx < 0 || this.stepT >= per) {
        this.idx++; this.stepT = 0;
        if (this.idx >= this.stops.length) { this.phase = 'seasons'; this.sweepIdx = -1; this.cam.tx = this.center.x; this.cam.ty = this.center.y; this.cam.tzoom = this.center.z; return; }
        const s = this.stops[this.idx];
        this.fx.ring(s.cells, s.family === 'water' ? '#8fd0ff' : '#ffd77a');
        this.fx.closeBurst(s.x, s.y, Math.min(6, s.size));
        for (const [k, a] of this.isl.fauna) if (a.regionId === s.id) this.fx.fauna(k, 'arrive');
        this.cam.tx = this.center.x * 0.7 + s.x * 0.3; this.cam.ty = this.center.y * 0.7 + s.y * 0.3; this.cam.tzoom = this.center.z * 1.08;
        this.sc.playSfx(s.family === 'water' ? 'point_3' : `point_${1 + (this.idx % 8)}`, 0.5);
      }
      this.score = Math.min(this.target, Math.round(this.target * clamp((this.idx + Math.min(1, this.stepT / (per * 0.8))) / Math.max(1, this.stops.length), 0, 1)));
    } else if (this.phase === 'seasons') {
      this.score = this.target;
      if (this.sweepIdx < 0 || this.stepT >= 0.85) {
        this.sweepIdx++; this.stepT = 0;
        if (this.sweepIdx > 4) { this.phase = 'title'; this.stepT = 0; this.isl.season = this.season0; return; }
        const from = this.isl.season; const to = this.sweepIdx < 4 ? SEASONS[(SEASONS.indexOf(this.season0) + 1 + this.sweepIdx) % 4] : this.season0;
        this.r.startTransition(from, to); this.r.transitionSpeed = 2; this.isl.season = to; this.isl.board.touch();
        this.sc.playSfx(`season_${to}`, 0.4);
      }
    } else if (this.phase === 'title') {
      if (this.stepT > 0.9 + this.starsShown * 0.5 && this.starsShown < this.stars) { this.starsShown++; this.sc.playSfx(`star_${this.starsShown}`, 0.7); }
      if (this.stepT > 2.2 + this.stars * 0.5) this.finish();
    }
  }

  /** Surimpression écran : compteur, nom de l'île, étoiles, invite. */
  render(ctx) {
    if (this.done) return;
    const W = STAGE.W, H = STAGE.H, compact = STAGE.compact;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // voile léger + compteur
    const a = clamp(this.t / 0.8, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = `700 ${compact ? 12 : 14}px Quicksand, sans-serif`; ctx.fillStyle = 'rgba(43,42,38,0.7)'; ctx.fillText('POINTS', W / 2, compact ? 22 : 30);
    ctx.font = `800 ${compact ? 34 : 46}px Quicksand, sans-serif`; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,253,248,0.9)'; ctx.strokeText(String(this.score), W / 2, compact ? 50 : 66); ctx.fillStyle = '#2b2a26'; ctx.fillText(String(this.score), W / 2, compact ? 50 : 66);
    if (this.phase === 'tour' && this.idx >= 0 && this.idx < this.stops.length) {
      const s = this.stops[this.idx]; const k = clamp(this.stepT / 0.15, 0, 1) * (1 - clamp((this.stepT - (this.stops.length > 8 ? 0.55 : 0.75) + 0.12) / 0.12, 0, 1));
      ctx.globalAlpha = a * k; ctx.font = `700 ${compact ? 15 : 20}px Quicksand, sans-serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,253,248,0.9)'; ctx.strokeText(s.label, W / 2, compact ? 74 : 104);
      ctx.fillStyle = s.family === 'water' ? '#2f6f9a' : '#b8781e'; ctx.fillText(s.label, W / 2, compact ? 74 : 104);
    }
    if (this.phase === 'title') {
      const k = clamp(this.stepT / 0.6, 0, 1); ctx.globalAlpha = k;
      // en portrait le bandeau se pose sous le compteur pour laisser l'île visible
      const cy = STAGE.portrait ? 190 : H / 2;
      ctx.fillStyle = 'rgba(255,253,248,0.82)'; const bh = compact ? 120 : 170; ctx.fillRect(0, cy - bh / 2, W, bh);
      ctx.font = `500 ${compact ? 30 : 52}px Lora, Georgia, serif`; ctx.fillStyle = '#2b2a26'; ctx.fillText(this.name, W / 2, cy - (compact ? 18 : 26));
      const star = Assets.img('icon_star'); const sz = compact ? 36 : 56;
      for (let i = 0; i < 3; i++) {
        const x = W / 2 + (i - 1) * (sz + 14), y = cy + (compact ? 24 : 34); const on = i < this.starsShown;
        const pop = on ? 1 + 0.25 * Math.max(0, 1 - (this.stepT - (0.9 + i * 0.5)) / 0.3) : 1;
        ctx.save(); ctx.globalAlpha = k * (on ? 1 : 0.18); ctx.translate(x, y); ctx.scale(pop, pop);
        if (on) { const g = ctx.createRadialGradient(0, 0, sz * 0.2, 0, 0, sz * 0.8); g.addColorStop(0, 'rgba(255,214,120,0.55)'); g.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, sz * 0.8, 0, TAU); ctx.fill(); }
        // pas de ctx.filter (rasterisation lente) : silhouette teintée mise en cache
        if (star) ctx.drawImage(this.sc.particles.tinted(star, on ? '#e0a33a' : '#6b6a66'), -sz / 2, -sz / 2, sz, sz); else { ctx.fillStyle = on ? '#e0a33a' : '#999'; ctx.beginPath(); ctx.arc(0, 0, sz / 2, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
    }
    ctx.globalAlpha = 0.6 * a; ctx.font = `700 ${compact ? 10 : 12}px Quicksand, sans-serif`; ctx.fillStyle = '#2b2a26'; ctx.fillText('TOUCHER POUR PASSER', W / 2, H - (compact ? 14 : 22));
    ctx.restore();
  }
}
