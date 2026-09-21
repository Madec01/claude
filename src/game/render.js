// Rendu d'une île : mer, cases vides, tuiles par saison, survol et prévisualisation, faune, effets.
import { Assets } from '../core/assets.js';
import { toWorld, corners, parse, key, DIRS, edgeMid, TILE_W, TILE_H, SIZE } from './hex.js';
import { FAMILY_COLORS, SEASONS } from '../data/tiles.js';
import { STORY } from '../data/story.js';
import { FAUNA_SIZE } from './fauna.js';
import { clamp, lerp, TAU, easeOutCubic, rnd } from '../core/math.js';

import { STAGE } from '../core/stage.js';
import { Save } from '../core/save.js';
import { Decor, groundOf, groundKey, GROUND_COLORS, spriteKey } from './decor.js';
import { pathShapes } from './paths.js';
// arête i (sommet i → i+1 de corners()) → indice dans DIRS du voisin de l'autre côté ; mesuré, pas deviné
const EDGE_DIR = [1, 0, 5, 4, 3, 2];
/** Décors déjà posés à plat sur le sol : ils ne reçoivent pas d'ombre de contact. */
const PLAT = new Set(['obj_puddle1', 'obj_puddle2', 'obj_puddle3', 'obj_leafpile', 'obj_snowdrift',
  'obj_moss', 'obj_lily', 'obj_flowerWhite', 'obj_flowerRed', 'obj_flowerBlue', 'obj_flowerYellow']);
/**
 * Un objet est-il à plat au sol (donc sans ombre de contact) ?
 *
 * Le test portait sur `o.tpl`, c'est-à-dire le GABARIT — et le gabarit d'une flaque est
 * `obj_puddle2{w}`, qui n'est évidemment dans aucun ensemble. Les flaques recevaient donc l'ombre
 * des objets debout : une flaque qui projette une ombre, c'est une flaque qui vole. On compare
 * maintenant le gabarit débarrassé de ses marques de saison et d'hiver.
 */
const estPlat = (tpl) => PLAT.has(tpl.replace(/\{[sw]\}/g, ''));

/** Sols en relief : falaise (roche) et talus (colline). */
const RELIEF = new Set(['stone', 'hill']);
/** Deux sols qui se touchent par une arête franche plutôt que par un fondu. */
const areteFranche = (a, b) => (RELIEF.has(a) || RELIEF.has(b)) && (a === 'grass' || b === 'grass' || (RELIEF.has(a) && RELIEF.has(b)));
const FAUNA_GROUND = 10;   // un animal se tient un peu en avant du centre de sa tuile, comme le décor
const SEA = { spring: ['#8fc8e6', '#5f9fc8'], summer: ['#7fc0e4', '#4f93c2'], autumn: ['#8cb9d3', '#5d8fb3'], winter: ['#a9c7db', '#7aa2bf'] };
// `bank` : l'ombre de la berge, posée SOUS l'eau et débordant vers le bas — c'est elle qui fait que l'eau
// est creusée dans le terrain au lieu d'être peinte dessus. `shoal` : les bas-fonds, un anneau clair au
// contact de la terre. `deep` : le fond, vers lequel le dégradé descend. Une seule famille de teintes.
/**
 * Un seul bleu pour toute l'eau de l'île.
 *
 * La mer et les lacs parlaient deux langues : la mer est un dégradé d'écran tiré de `SEA`, les lacs
 * avaient leurs quatre teintes écrites à la main — plus saturées, d'une autre famille. À côté l'une de
 * l'autre, on lisait deux matières. La palette d'un lac se DÉDUIT donc maintenant de celle de la mer :
 * son plan d'eau prend la couleur de la mer à mi-hauteur, et le creux se construit autour.
 *
 * Le creux reste, lui : c'est lui qui dit « trou dans la terre » plutôt que « flaque posée dessus ».
 * En relevant les anciennes teintes on a trouvé qu'il tenait dans trois rapports, presque identiques
 * aux quatre saisons (écart maximal 0,03) — on les garde donc tels quels, appliqués à la mer.
 */
/**
 * La ride : un seul rythme de pointillé pour toute l'eau intérieure (lac, étang, rivière). Le lac
 * pointillait en 10/26, la rivière en 8/22, et à deux cases d'écart cela suffisait à les faire lire
 * comme deux matières. La VITESSE, elle, reste différente à dessein : une rivière coule, un lac non.
 */
const RIDE = { tirets: [10, 26], trait: 2.2 };
const CREUX = { deep: [0.87, 0.91, 0.93], shoal: [1.32, 1.14, 1.05], edge: [0.76, 0.83, 0.85] };
// La SURFACE moyenne d'une nappe : son dégradé va de `fill` à `shoal`, donc le ton qu'on lit vraiment
// est entre les deux. C'est lui que le pipeline recopie pour les flaques du marais et pour la carte de
// la tuile d'eau, qui sont des aplats : sans quoi une flaque prend le point le plus SOMBRE du lac et
// paraît d'un autre bleu, alors que la famille est la bonne.
const SURFACE = CREUX.shoal.map((k) => (1 + k) / 2);
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgbHex = (c) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const teinter = (rgb, k) => rgbHex(rgb.map((v, i) => v * k[i]));
const nappeDe = (saison) => {
  const [haut, bas] = SEA[saison];
  const mid = hexRgb(haut).map((v, i) => (v + hexRgb(bas)[i]) / 2);   // la mer à mi-écran
  return {
    fill: rgbHex(mid), deep: teinter(mid, CREUX.deep), shoal: teinter(mid, CREUX.shoal), edge: teinter(mid, CREUX.edge),
    // la même écume que le trait de côte de `drawShallows` : une seule blancheur pour toute l'île
    foam: `rgba(255,255,255,${saison === 'winter' ? 0.4 : 0.52})`,
  };
};
const WATER = { spring: nappeDe('spring'), summer: nappeDe('summer'), autumn: nappeDe('autumn'), winter: nappeDe('winter') };
const ICE = { fill: '#dbe9f4', deep: '#cfe0ee', shoal: '#e8f2fa', edge: '#bdd2e2', foam: 'rgba(255,255,255,0.8)' };

export class IslandRenderer {
  constructor(island, camera, effects, particles) {
    this.isl = island; this.cam = camera; this.fx = effects; this.p = particles;
    this.time = 0;
    this.hover = null;          // { q, r, preview }
    this.budMode = false;
    this.transition = null;     // { from, to, t }
    this.waveImgs = Assets.keysStarting('sea_wave_').map((k) => Assets.img(k));
    this.faunaImgs = {};
    this.hexMask = Assets.img('hex_mask'); this.hexOutline = Assets.img('hex_outline'); this.hexShadow = Assets.img('hex_shadow');
    this.lowFx = false;         // posé par la scène quand les i/s baissent : on coupe la profondeur et l'écume large
    this._sea = null;           // géométrie de la mer (centre, rayon, côte, vagues), recalculée si l'île change de forme
    this._life = null;          // le voilier et la baleine
    this.faunaPos = new Map();  // clé -> { x, y, bob }
    this.decor = new Decor((island.def && island.def.seed) || 1);
    this.weather = null; this.flash = 0; this.rain = [];
    this.wander = new Map();   // faune : position et cible de déplacement par clé
    this.legacy = !Assets.has('ground_grass_spring');   // manifeste sans sols/objets : tuiles composées (repli)
  }

  startTransition(from, to) { this.transition = { from, to, t: 0 }; }

  seasonFor(worldX) {
    const s = this.isl.season;
    if (!this.transition) return s;
    // balayage diagonal de gauche à droite
    const p = this.transition.t / 1.6;
    const sx = this.cam.toScreen(worldX, 0).x;
    const sweep = -200 + p * (STAGE.W + 400);
    return sx < sweep ? this.transition.to : this.transition.from;
  }

  tileImage(t, season) {
    let fam = t.family, variant = t.variant || 1;
    if (t.dry && fam === 'meadow') { fam = 'dry_meadow'; variant = 1; }
    if (t.frozen && fam === 'water') { const k = `water_frozen_${variant}_${season}`; if (Assets.has(k)) return Assets.img(k); if (Assets.has('water_frozen')) return Assets.img('water_frozen'); }
    const k = `${fam}_${variant}_${season}`;
    if (Assets.has(k)) return Assets.img(k);
    const alt = Assets.keysStarting(`${fam}_`).find((x) => x.endsWith(`_${season}`)) || Assets.keysStarting(`${fam}_`)[0];
    return alt ? Assets.img(alt) : null;
  }

  render(ctx, alpha, dt) {
    this.time += dt;
    if (this.transition) { this.transition.t += dt * (this.transitionSpeed || 1); if (this.transition.t > 1.9) { this.transition = null; this.transitionSpeed = 1; } }
    const isl = this.isl, cam = this.cam;
    const season = isl.season;
    this.drawSea(ctx, season, dt);
    this.drawShallows(ctx);
    this.drawEmptyCells(ctx);
    if (this.legacy) this.drawTiles(ctx); else this.drawLayered(ctx);
    this.drawClimateTint(ctx);
    this.drawBuildTargets(ctx);
    this.particlesWorld(ctx, 0);
    this.drawHover(ctx);
    this.drawRings(ctx);
    this.drawFauna(ctx, dt);
    this.drawWorkMarks(ctx);
    this.particlesWorld(ctx, 1);
    this.drawTexts(ctx);
    this.drawWeather(ctx, dt);
    this.drawTransition(ctx);
    this.drawFlights(ctx);
  }

  /** Particules exprimées en coordonnées monde : on applique la caméra avant de les dessiner. */
  particlesWorld(ctx, layer) {
    const cam = this.cam;
    ctx.save(); ctx.translate(STAGE.W / 2 + cam.offsetX, STAGE.H / 2 + cam.offsetY); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
    this.p.render(ctx, layer);
    ctx.restore();
  }

  /**
   * Géométrie de la mer : centre et rayon de l'île, arêtes de côte (celles qui donnent sur l'eau, sans aucune arête
   * intérieure) et vagues réparties en couronne, plus serrées près du rivage. Recalculée seulement si l'île change de
   * forme (Île infinie). Rien d'hexagonal n'est dessiné dans l'eau : seule la forme de l'île se lit.
   */
  seaGeometry() {
    const mask = this.isl.board.mask; const ver = mask.size;
    if (this._sea && this._sea.ver === ver) return this._sea;
    let sx = 0, sy = 0, n = 0; const pts = [];
    for (const k of mask) { const [q, r] = parse(k); const w = toWorld(q, r); sx += w.x; sy += w.y; n++; pts.push(w); }
    const cx = n ? sx / n : 0, cy = n ? sy / n : 0; let R = SIZE; for (const w of pts) R = Math.max(R, Math.hypot(w.x - cx, w.y - cy) + SIZE);
    const segs = [];
    for (const k of mask) {
      const [q, r] = parse(k); const w = toWorld(q, r); const c = corners(w.x, w.y, SIZE * 1.08);
      for (let i = 0; i < 6; i++) { const [dq, dr] = DIRS[EDGE_DIR[i]]; if (mask.has(key(q + dq, r + dr))) continue; const a = c[i], d = c[(i + 1) % 6]; segs.push([a[0], a[1], d[0], d[1]]); }   // arêtes de côte (à 1,08 rayon : l'écume lèche le pied des tuiles sans se confondre avec leur bord)
    }
    // vagues : les deux tiers longent la côte (depuis une arête, poussées vers le large), le reste peuple le large
    const count = STAGE.compact ? 34 : 60; const waves = [];
    for (let i = 0; i < count; i++) {
      let x, y;
      if (segs.length && i % 3 !== 2) { const sg = segs[Math.floor(rnd(0, segs.length))]; const mx = (sg[0] + sg[2]) / 2, my = (sg[1] + sg[3]) / 2; const dx = mx - cx, dy = my - cy; const dn = Math.hypot(dx, dy) || 1; const d = 40 + Math.pow(rnd(0, 1), 1.6) * 260; x = mx + dx / dn * d + rnd(-30, 30); y = my + dy / dn * d + rnd(-20, 20); }
      else { const a = rnd(0, TAU); const rr = R * rnd(1.4, 3.2); x = cx + Math.cos(a) * rr; y = cy + Math.sin(a) * rr; }
      waves.push({ x, y, t: rnd(0, 10), s: rnd(0.75, 1.25), ph: rnd(0, TAU) });
    }
    this._sea = { ver, cx, cy, R, segs, waves };
    return this._sea;
  }

  /** Transformation caméra : ce qui suit se dessine en coordonnées monde. */
  worldSpace(ctx) { const cam = this.cam; ctx.translate(STAGE.W / 2 + cam.offsetX, STAGE.H / 2 + cam.offsetY); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y); }

  drawSea(ctx, season, dt = 0.016) {
    const cl = this.isl.climate; const cols = (cl && cl.sea) || SEA[season] || SEA.spring;
    const g = ctx.createLinearGradient(0, 0, 0, STAGE.H);
    g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, STAGE.W, STAGE.H);
    const sea = this.seaGeometry(); const cam = this.cam; const z = cam.zoom;
    const storm = this.weather === 'storm', winter = season === 'winter';
    // profondeur : la mer s'assombrit en s'éloignant de l'île
    if (!this.lowFx) {
      const c = cam.toScreen(sea.cx, sea.cy); const r0 = sea.R * z;
      const rg = ctx.createRadialGradient(c.x, c.y, r0 * 1.05, c.x, c.y, r0 * 3.0);
      rg.addColorStop(0, 'rgba(16,48,92,0)'); rg.addColorStop(1, `rgba(16,48,92,${storm ? 0.42 : 0.30})`);
      ctx.fillStyle = rg; ctx.fillRect(0, 0, STAGE.W, STAGE.H);
    }
    // vagues : grandes et franches, serrées près du rivage ; rares et pâles en hiver ; agitées par l'orage
    ctx.save();
    const aBase = winter ? 0.22 : storm ? 0.55 : 0.44, aAmp = winter ? 0.12 : 0.24, sz = (storm ? 1.35 : 1) * 74, speed = storm ? 1.8 : 1;
    let i = 0;
    for (const w of sea.waves) {
      if (winter && (++i & 1)) continue;   // une vague sur deux en hiver
      w.t += dt * speed;
      const p = cam.toScreen(w.x + Math.sin(w.t * 0.5) * 12, w.y + Math.sin(w.t * 0.35 + w.ph) * 4);
      const ww = sz * w.s * z, hh = ww / 3.6;
      if (p.x < -ww || p.x > STAGE.W + ww || p.y < -hh || p.y > STAGE.H + hh) continue;
      const img = this.waveImgs[Math.floor(w.t * 0.7) % Math.max(1, this.waveImgs.length)];
      ctx.globalAlpha = clamp(aBase + aAmp * Math.sin(w.t * 1.3 + w.ph), 0.05, 0.85);
      if (img) ctx.drawImage(img, p.x - ww / 2, p.y - hh / 2, ww, hh);
      else { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x - ww / 3, p.y); ctx.quadraticCurveTo(p.x, p.y - hh / 2, p.x + ww / 3, p.y); ctx.stroke(); }
    }
    ctx.restore();
    this.drawSeaLife(ctx, dt);
  }

  /** Le rivage : un haut-fond très léger, puis l'écume qui suit la côte et respire lentement. */
  drawShallows(ctx) {
    const sea = this.seaGeometry(); const mask = this.isl.board.mask;
    const winter = this.isl.season === 'winter', storm = this.weather === 'storm';
    ctx.save(); this.worldSpace(ctx);
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.beginPath();
    for (const k of mask) { const [q, r] = parse(k); const w = toWorld(q, r); const pts = corners(w.x, w.y, SIZE * 1.22); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
    ctx.fill();
    const breath = 0.5 + 0.5 * Math.sin(this.time * (storm ? 2.2 : 0.9));
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const coast = (lw, a) => { ctx.lineWidth = lw; ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`; ctx.beginPath(); for (const [x1, y1, x2, y2] of sea.segs) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); } ctx.stroke(); };
    if (!this.lowFx) coast(15, (winter ? 0.12 : 0.20) + 0.10 * breath);   // large et douce
    coast(4.5, (winter ? 0.40 : 0.52) + 0.18 * breath);                   // fine
    ctx.restore();
  }

  /** La vie au large : un voilier passe une fois par saison, une baleine fait surface de loin en loin. */
  drawSeaLife(ctx, dt) {
    const sea = this.seaGeometry(); const cam = this.cam, z = cam.zoom; const storm = this.weather === 'storm';
    const life = this._life || (this._life = { boat: null, whale: null, nextBoat: rnd(5, 18), nextWhale: rnd(45, 100), season: this.isl.season });
    if (life.season !== this.isl.season) { life.season = this.isl.season; life.nextBoat = Math.min(life.nextBoat, rnd(4, 14)); }   // à chaque saison, un bateau ne tarde pas
    // --- le voilier : une ligne tangente à l'île, au large, d'un bord du champ à l'autre
    if (!life.boat) {
      life.nextBoat -= dt;
      if (life.nextBoat <= 0 && !storm) {
        // le point de tangence est tiré parmi ceux qui sont à l'écran : un bateau qu'on ne voit pas ne sert à rien
        let a = rnd(0, TAU), rr = sea.R * 1.5, px = 0, py = 0;
        for (let k = 0; k < 12; k++) { a = rnd(0, TAU); rr = sea.R * rnd(1.3, 1.9); px = sea.cx + Math.cos(a) * rr; py = sea.cy + Math.sin(a) * rr; const p = cam.toScreen(px, py); if (p.x > 40 && p.x < STAGE.W - 40 && p.y > 60 && p.y < STAGE.H - 60) break; }
        const dir = a + Math.PI / 2 + (Math.random() < 0.5 ? 0 : Math.PI); const len = sea.R * 2.6;
        life.boat = { x: px - Math.cos(dir) * len / 2, y: py - Math.sin(dir) * len / 2, dir, dist: 0, len, speed: rnd(20, 30), img: Math.random() < 0.5 ? 'sea_boat_1' : 'sea_boat_2', t: 0 };
        life.nextBoat = rnd(90, 200);
      }
    } else {
      const bt = life.boat; bt.t += dt; const sp = bt.speed * (storm ? 2 : 1);
      bt.x += Math.cos(bt.dir) * sp * dt; bt.y += Math.sin(bt.dir) * sp * dt; bt.dist += sp * dt;
      if (bt.dist > bt.len) life.boat = null;
      else {
        const img = Assets.img(bt.img);
        if (img) {
          const p = cam.toScreen(bt.x, bt.y); const s = 0.42 * z; const w = img.width * s, h = img.height * s;
          if (p.x > -w && p.x < STAGE.W + w && p.y > -h && p.y < STAGE.H + h) {
            ctx.save(); ctx.translate(p.x, p.y + Math.sin(bt.t * 1.4) * 1.5 * z); ctx.rotate(bt.dir + Math.PI / 2 + Math.sin(bt.t * 0.9) * 0.03);   // le sprite pointe vers le haut
            const wv = this.waveImgs[0]; if (wv) { ctx.globalAlpha = 0.28; ctx.drawImage(wv, -w * 0.55, h * 0.5, w * 1.1, h * 0.28); }   // sillage
            ctx.globalAlpha = 0.95; ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
          }
        }
      }
    }
    // --- la baleine : au large mais dans le champ ; elle monte, souffle, reste un peu, replonge
    if (!life.whale) {
      life.nextWhale -= dt;
      if (life.nextWhale <= 0) {
        let pt = null;
        for (let k = 0; k < 12 && !pt; k++) { const a = rnd(0, TAU); const rr = sea.R * rnd(1.25, 1.9); const x = sea.cx + Math.cos(a) * rr, y = sea.cy + Math.sin(a) * rr; const p = cam.toScreen(x, y); if (p.x > 60 && p.x < STAGE.W - 60 && p.y > 90 && p.y < STAGE.H - 90) pt = { x, y }; }
        if (pt) life.whale = { ...pt, t: 0, life: rnd(4.5, 7), flip: Math.random() < 0.5, spouted: false };
        life.nextWhale = rnd(70, 150);
      }
    } else {
      const wh = life.whale; wh.t += dt;
      if (wh.t > wh.life) life.whale = null;
      else {
        const img = Assets.img('sea_whale');
        if (img) {
          const u = wh.t / wh.life; const rise = u < 0.22 ? u / 0.22 : u > 0.78 ? (1 - u) / 0.22 : 1;
          const p = cam.toScreen(wh.x, wh.y); const s = 0.34 * z; const w = img.width * s, h = img.height * s;
          ctx.save(); ctx.translate(p.x, p.y + Math.sin(wh.t * 2) * 1.5 * z); if (wh.flip) ctx.scale(-1, 1);
          const wv = this.waveImgs[1]; if (wv) { ctx.globalAlpha = 0.22 * rise; ctx.drawImage(wv, -w * 0.7, h * 0.05, w * 1.4, h * 0.3); }   // le remous
          ctx.beginPath(); ctx.rect(-w, -h, 2 * w, h * 1.25); ctx.clip();   // seule la partie émergée : le reste est sous la ligne d'eau
          ctx.globalAlpha = 0.95; ctx.drawImage(img, -w / 2, -h / 2 + (1 - rise) * h * 0.8, w, h); ctx.restore();
          if (rise >= 1 && !wh.spouted) {   // le souffle, une fois, en particules monde
            wh.spouted = true; const c = this.fx.img('circle_');
            for (let k = 0; k < 7; k++) this.p.emit({ x: wh.x + (wh.flip ? -1 : 1) * 18 + rnd(-6, 6), y: wh.y - 26, vx: rnd(-12, 12), vy: rnd(-55, -35), life: rnd(0.7, 1.1), size: rnd(5, 9), sizeEnd: 0, img: c, color: '#fff', alpha: 0.75, alphaEnd: 0, layer: 0 });
          }
        }
      }
    }
  }

  /**
   * Les tuiles déjà posées qui peuvent recevoir la tuile du moment : liseré doré sur le contour, plus discret
   * que la case vide (qui, elle, est l'action ordinaire). Sans ce repère, bâtir et fusionner ne s'apprenaient
   * qu'en survolant une tuile au hasard — impossible au doigt.
   */
  drawBuildTargets(ctx) {
    const isl = this.isl;
    if (this.finale || isl.ended || isl.garden) return;
    const list = isl.buildTargets();   // gardé en cache côté île : recalculé seulement quand le plateau ou la tuile change
    if (!list.length) return;
    const cam = this.cam;
    const puls = 0.55 + 0.25 * Math.sin(this.time * 2.4);
    ctx.save();
    for (const c of list) {
      const w = toWorld(c.q, c.r); const p = cam.toScreen(w.x, w.y);
      if (p.x < -100 || p.x > STAGE.W + 100 || p.y < -100 || p.y > STAGE.H + 100) continue;
      const pts = corners(p.x, p.y, SIZE * cam.zoom * 0.9);
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
      ctx.strokeStyle = c.kind === 'fuse' ? `rgba(138,111,181,${puls})` : c.kind === 'work' ? `rgba(47,158,143,${puls})` : `rgba(224,163,58,${puls})`;
      ctx.lineWidth = Math.max(1.5, 2.4 * cam.zoom); ctx.setLineDash([7 * cam.zoom, 5 * cam.zoom]);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawEmptyCells(ctx) {
    const cam = this.cam, b = this.isl.board;
    const legal = new Set(b.legalCells().map((c) => key(c.q, c.r)));
    ctx.save();
    for (const k of b.mask) {
      if (b.tiles.has(k)) continue;
      const [q, r] = parse(k); const w = toWorld(q, r); const c = cam.toScreen(w.x, w.y);
      if (c.x < -100 || c.x > STAGE.W + 100 || c.y < -100 || c.y > STAGE.H + 100) continue;
      const pts = corners(c.x, c.y, SIZE * cam.zoom * 0.96);
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
      if (this.finale) { ctx.fillStyle = 'rgba(244,239,230,0.14)'; ctx.fill(); continue; }
      ctx.fillStyle = legal.has(k) ? 'rgba(244,239,230,0.55)' : 'rgba(244,239,230,0.28)';
      ctx.fill();
      ctx.strokeStyle = legal.has(k) ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)';
      ctx.lineWidth = legal.has(k) ? 1.5 : 1; ctx.setLineDash(legal.has(k) ? [] : [4, 6]);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTileAt(ctx, t, cx, cy, scale = 1, alpha = 1, seasonOverride = null) {
    const season = seasonOverride || this.seasonFor(toWorld(t.q, t.r).x);
    const img = this.tileImage(t, season);
    const z = this.cam.zoom * scale;
    if (!img) { const pts = corners(cx, cy, SIZE * z); ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = FAMILY_COLORS[t.family] || '#999'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); ctx.restore(); return; }
    const w = TILE_W * z, h = TILE_H * z;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  }

  drawTiles(ctx) {
    const cam = this.cam, b = this.isl.board;
    const list = [...b.tiles.values()].sort((a, c) => (a.r - c.r) || (a.q - c.q));
    // ombres
    if (this.hexShadow) {
      ctx.save(); ctx.globalAlpha = 0.28;
      for (const t of list) { const w = toWorld(t.q, t.r); const c = cam.toScreen(w.x, w.y); const z = cam.zoom; ctx.drawImage(this.hexShadow, c.x - TILE_W * z / 2 + 4 * z, c.y - TILE_H * z / 2 + 10 * z, TILE_W * z, TILE_H * z); }
      ctx.restore();
    }
    for (const t of list) {
      const w = toWorld(t.q, t.r); const c = cam.toScreen(w.x, w.y);
      if (c.x < -150 || c.x > STAGE.W + 150 || c.y < -160 || c.y > STAGE.H + 160) continue;
      const d = this.fx.dropTransform(key(t.q, t.r));
      this.drawTileAt(ctx, t, c.x, c.y + d.dy * cam.zoom, d.s, 1);
      if (t.bloom) this.drawBloom(ctx, c.x, c.y);
    }
  }

  /**
   * Rendu par couches : ombres → sols → raccords entre sols identiques → sentiers → objets du décor (triés par pied) et tuiles rares.
   * Les objets sont générés par région (src/game/decor.js), ce qui donne forêts continues, massifs et villages.
   */
  drawLayered(ctx) {
    const cam = this.cam, b = this.isl.board, z = cam.zoom;
    this.decor.sync(b);
    const tiles = [...b.tiles.values()];
    const vis = (c, m = 170) => !(c.x < -m || c.x > STAGE.W + m || c.y < -m || c.y > STAGE.H + m);
    if (this.hexShadow) {
      ctx.save(); ctx.globalAlpha = 0.28;
      for (const t of tiles) { const w = toWorld(t.q, t.r); const c = cam.toScreen(w.x, w.y); if (!vis(c)) continue; ctx.drawImage(this.hexShadow, c.x - TILE_W * z / 2 + 4 * z, c.y - TILE_H * z / 2 + 10 * z, TILE_W * z, TILE_H * z); }
      ctx.restore();
    }
    // sols
    const dropping = new Map();
    const images = Assets.manifest().images || {};
    for (const t of tiles) {
      const w = toWorld(t.q, t.r); const c = cam.toScreen(w.x, w.y);
      const k = key(t.q, t.r); const d = this.fx.dropTransform(k); if (d.dy !== 0 || d.s !== 1) dropping.set(k, d);
      if (!vis(c)) continue;
      const season = this.seasonFor(w.x); const g = this.decor.groundFor(t);
      const img = t.family === 'water' ? this.waterGround(t, season) : Assets.img(groundKey(g, season));
      const zz = z * d.s, cy = c.y + d.dy * z;
      if (img) ctx.drawImage(img, c.x - TILE_W * zz / 2, cy - TILE_H * zz / 2, TILE_W * zz, TILE_H * zz);
      else this.drawTileAt(ctx, t, c.x, cy, d.s, 1);
      // la grille s'efface : le sol de chaque voisine de terre déborde en fondu le long du bord partagé.
      // La roche et la colline sont des reliefs : elles gardent une arête franche contre l'herbe, où la
      // falaise et le talus se lisent, mais se fondent contre un champ, une lande, du sable ou de la terre.
      // (Tout leur refuser alignait leurs six arêtes d'une case à l'autre et redessinait la grille ;
      // l'eau, elle, compose déjà ses rives.)
      if (!this.noLens && t.family !== 'water' && d.s === 1 && d.dy === 0) {
        for (let dir = 0; dir < 6; dir++) {
          const n = b.get(t.q + DIRS[dir][0], t.r + DIRS[dir][1]); if (!n || n.family === 'water') continue;
          const gn = this.decor.groundFor(n); if (gn === g || areteFranche(g, gn)) continue;
          const lens = this.groundLens(gn, season, dir); if (lens) ctx.drawImage(lens, c.x - TILE_W * z / 2, c.y - TILE_H * z / 2, TILE_W * z, TILE_H * z);
        }
      }
    }
    // lagunes (trous du masque entourés de terre) : sol de rive puis mare, dessinées comme un étang
    for (const h of this.decor.holes || []) {
      const w = toWorld(h.q, h.r); const c = cam.toScreen(w.x, w.y); if (!vis(c)) continue;
      const img = this.waterGround(h, this.seasonFor(w.x)); if (img) ctx.drawImage(img, c.x - TILE_W * z / 2, c.y - TILE_H * z / 2, TILE_W * z, TILE_H * z);
    }
    // raccords : un ruban de la couleur du sol sur chaque arête partagée par deux sols identiques (efface la couture)
    ctx.save();
    const half = SIZE * 0.46, e = 7;
    for (const t of tiles) {
      const k = key(t.q, t.r); if (dropping.has(k)) continue;
      const g = this.decor.groundFor(t); if (g === 'hill') continue;
      const w = toWorld(t.q, t.r);
      for (let d = 0; d < 3; d++) {
        const n = b.get(t.q + DIRS[d][0], t.r + DIRS[d][1]);
        if (!n || dropping.has(key(n.q, n.r))) continue;
        // avec une tuile d'eau voisine, la rive du côté concerné est déjà dans notre sol : on raccorde aussi
        const gn = this.decor.groundFor(n); if (gn !== g && !(n.family === 'water' && g !== 'water')) continue;
        if (t.family === 'water' && n.family === 'water') continue;
        const season = this.seasonFor(w.x);
        const col = GROUND_COLORS[g] || (images[groundKey(g, season)] || {}).ground_color; if (!col) continue;
        const m = edgeMid(w.x, w.y, d); const nx = m.x - w.x, ny = m.y - w.y; const len = Math.hypot(nx, ny) || 1; const ux = nx / len, uy = ny / len, tx = -uy, ty = ux;
        const quad = [[m.x + tx * half - ux * e, m.y + ty * half - uy * e], [m.x + tx * half + ux * e, m.y + ty * half + uy * e], [m.x - tx * half + ux * e, m.y - ty * half + uy * e], [m.x - tx * half - ux * e, m.y - ty * half - uy * e]].map(([x, y]) => cam.toScreen(x, y));
        if (!vis(quad[0], 120)) continue;
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(quad[0].x, quad[0].y); for (let i = 1; i < 4; i++) ctx.lineTo(quad[i].x, quad[i].y); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
    this.drawCourts(ctx, dropping);
    this.drawWater(ctx, dropping);
    this.drawPaths(ctx);
    // objets
    const rule = this.isl.rule || null, wkey = this.weather || null;
    for (const o of this.decor.objects) {
      const c = cam.toScreen(o.x, o.y); if (!vis(c)) continue;
      const d = dropping.get(o.cell); const season = this.seasonFor(o.x);
      if (o.seasons && !o.seasons.includes(season)) continue;
      if (o.notSeasons && o.notSeasons.includes(season)) continue;
      if (o.weathers && !o.weathers.includes(wkey)) continue;
      if (o.rules && !o.rules.includes(rule)) continue;
      if (o.notRules && o.notRules.includes(rule)) continue;
      if (o.composed) { const cw = toWorld(o.tile.q, o.tile.r); const cc = cam.toScreen(cw.x, cw.y); const dd = d || { s: 1, dy: 0 }; this.drawTileAt(ctx, o.tile, cc.x, cc.y + dd.dy * z, dd.s, 1); continue; }
      const sk = spriteKey(o.tpl, season); const img = Assets.img(sk); if (!img) continue;
      const m = images[sk]; const div = o.wave ? 3 : 2;
      const os = o.scale || 1;
      const w = (m ? m.w : img.width) / div * os, h = (m ? m.h : img.height) / div * os;
      const sc = d ? z * d.s : z, dy = d ? d.dy * z : 0;
      ctx.save();
      // Ombre de contact : sans elle un arbre a l'air collé en autocollant AU-DESSUS du sol — les
      // animaux en avaient une, pas le décor, et c'est ce qui faisait flotter tout le reste. Rien
      // qui soit déjà à plat n'en reçoit (flaque, feuilles, congère, fleurs, mousse, vague).
      if (!o.wave && !estPlat(o.tpl) && h * sc > 9) {
        ctx.globalAlpha = (o.alpha || 1) * 0.16; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(c.x, c.y + dy, w * sc * 0.30, w * sc * 0.11, 0, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (o.alpha) ctx.globalAlpha = o.alpha;
      if (o.flip) { ctx.translate(c.x, c.y + dy); ctx.scale(-1, 1); ctx.drawImage(img, -w * sc / 2, -h * sc, w * sc, h * sc); }
      else ctx.drawImage(img, c.x - w * sc / 2, c.y + dy - h * sc, w * sc, h * sc);
      ctx.restore();
    }
    for (const t of tiles) if (t.bloom) { const w = toWorld(t.q, t.r); const c = cam.toScreen(w.x, w.y); if (vis(c)) this.drawBloom(ctx, c.x, c.y); }
    // option « Grille discrète » : fin contour sur les tuiles posées, par-dessus les sols et les objets (sinon les fondus le couvrent)
    if (Save.options.grid) {
      ctx.save(); ctx.strokeStyle = 'rgba(43,42,38,0.32)'; ctx.lineWidth = Math.max(1, 1.2 * z); ctx.beginPath();
      for (const t of tiles) { const w = toWorld(t.q, t.r); const c = cam.toScreen(w.x, w.y); if (!vis(c)) continue; const pts = corners(c.x, c.y, SIZE * z * 0.985); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
      ctx.stroke(); ctx.restore();
    }
  }

  /**
   * Plans d'eau : étang (mare ronde), lac (nappe continue aux coutures effacées, rive sur le pourtour), rivière (ruban
   * courbe de la source à l'embouchure, rides animées). Les rives reprennent le sol des voisines (dessiné en dessous).
   */
  drawWater(ctx, dropping) {
    const cam = this.cam, z = cam.zoom, b = this.isl.board;
    const bodies = this.decor.water && this.decor.water.bodies ? this.decor.water.bodies : [];
    if (!bodies.length && !(this.decor.holes && this.decor.holes.length)) return;
    const vis = (c, m = 200) => !(c.x < -m || c.x > STAGE.W + m || c.y < -m || c.y > STAGE.H + m);
    const S = (p) => cam.toScreen(p.x, p.y);
    const jit = (a, c) => { const h = Math.sin(a.x * 12.9898 + a.y * 78.233 + c.x * 37.719 + c.y * 4.1) * 43758.5453; return (h - Math.floor(h)) - 0.5; };
    const trace = (sp) => { ctx.beginPath(); ctx.moveTo(sp[0].x, sp[0].y); if (sp.length === 2) ctx.lineTo(sp[1].x, sp[1].y); else { for (let i = 1; i < sp.length - 1; i++) { const mx = (sp[i].x + sp[i + 1].x) / 2, my = (sp[i].y + sp[i + 1].y) / 2; ctx.quadraticCurveTo(sp[i].x, sp[i].y, mx, my); } ctx.lineTo(sp[sp.length - 1].x, sp[sp.length - 1].y); } };
    const meander = (pts) => {
      const out = [pts[0]]; let side = jit(pts[0], pts[pts.length - 1]) > 0 ? 1 : -1;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], c = pts[i + 1]; const dx = c.x - a.x, dy = c.y - a.y, len = Math.hypot(dx, dy) || 1; const nx = -dy / len, ny = dx / len;
        const amp = 14 + 10 * Math.abs(jit(a, c)) * 2, amp2 = 10 + 8 * Math.abs(jit(c, a)) * 2;
        out.push({ x: a.x + dx * 0.25 + nx * side * amp, y: a.y + dy * 0.25 + ny * side * amp });
        out.push({ x: a.x + dx * 0.5 + nx * jit(a, c) * 6, y: a.y + dy * 0.5 + ny * jit(a, c) * 6 });
        out.push({ x: a.x + dx * 0.75 - nx * side * amp2, y: a.y + dy * 0.75 - ny * side * amp2 });
        out.push(c);
      }
      return out;
    };
    // tracé lissé tronçon par tronçon, largeur variable (bouts ronds)
    const tapered = (sp, wAt, mul, color) => {
      ctx.strokeStyle = color;
      if (sp.length < 3) { ctx.lineWidth = wAt(0) * mul; ctx.beginPath(); ctx.moveTo(sp[0].x, sp[0].y); ctx.lineTo(sp[sp.length - 1].x, sp[sp.length - 1].y); ctx.stroke(); return; }
      let px = sp[0].x, py = sp[0].y;
      for (let i = 1; i < sp.length - 1; i++) {
        const mx = (sp[i].x + sp[i + 1].x) / 2, my = (sp[i].y + sp[i + 1].y) / 2;
        ctx.lineWidth = wAt(i) * mul; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(sp[i].x, sp[i].y, mx, my); ctx.stroke(); px = mx; py = my;
      }
      ctx.lineWidth = wAt(sp.length - 1) * mul; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sp[sp.length - 1].x, sp[sp.length - 1].y); ctx.stroke();
    };
    // La mer est un dégradé vertical d'écran (voir `drawSea`) : on sait donc sa couleur à n'importe
    // quelle hauteur, et un bras de mer peut virer exactement à la teinte qu'il rejoint.
    const seaCols = (this.isl.climate && this.isl.climate.sea) || SEA[this.isl.season] || SEA.spring;
    // `voile` : la même mer, mais avec le blanc à 10 % de `drawShallows` DÉJÀ MÉLANGÉ dedans. Le
    // repeindre par-dessus ne marcherait pas — nos disques se recouvrent, et quatre couches de 10 %
    // font 34 %. Une couleur opaque ne se cumule pas.
    const blanchi = (hex, a) => { const h = hex.replace('#', ''); const n = parseInt(h, 16);
      const f = (v) => Math.round(v * (1 - a) + 255 * a).toString(16).padStart(2, '0');
      return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`; };
    const grdCache = {};
    const degradeMer = (a) => {
      if (grdCache[a]) return grdCache[a];
      const g = ctx.createLinearGradient(0, 0, 0, STAGE.H);
      g.addColorStop(0, blanchi(seaCols[0], a)); g.addColorStop(1, blanchi(seaCols[1], a));
      grdCache[a] = g; return g;
    };
    const mer = (a = 0) => degradeMer(a);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const h of this.decor.holes || []) {
      // lagune : une mare comme un étang, gelée en hiver
      const c0 = toWorld(h.q, h.r); const c = S(c0); if (!vis(c)) continue;
      const frozen = this.isl.season === 'winter'; const pal = frozen ? ICE : (WATER[this.seasonFor(c0.x)] || WATER.spring);
      const rr = SIZE * 0.7 * z;
      ctx.fillStyle = pal.edge; this.blob(ctx, c.x, c.y, rr * 1.03, c0); ctx.fill();
      ctx.fillStyle = pal.deep; this.blob(ctx, c.x, c.y, rr, c0); ctx.fill();
      ctx.fillStyle = pal.shoal; this.blob(ctx, c.x, c.y + 3.5 * z, rr * 0.92, c0); ctx.fill();
      if (!frozen) { ctx.strokeStyle = pal.foam; ctx.lineWidth = RIDE.trait * 0.7 * z; ctx.beginPath(); ctx.ellipse(c.x - rr * 0.2, c.y - rr * 0.25, rr * 0.35, rr * 0.16, -0.4, 0, TAU); ctx.stroke(); }
      else this.drawCracks(ctx, [c], z);
    }
    const ordered = [...bodies].sort((a, b) => (a.kind === 'river') - (b.kind === 'river'));   // nappes d'abord, rubans par-dessus (la rivière se jette dans le lac)
    for (const body of ordered) {
      if (body.cells.some((c) => dropping.has(key(c.q, c.r)))) continue;
      const frozen = body.cells.every((c) => c.frozen);
      const c0 = toWorld(body.cells[0].q, body.cells[0].r);
      const pal = frozen ? ICE : (WATER[this.seasonFor(c0.x)] || WATER.spring);
      if (body.kind === 'river') {
        // ruban de la source à l'embouchure, prolongé vers la montagne et vers la mer
        const pts = body.chain.map((k) => { const [q, r] = parse(k); return toWorld(q, r); });
        const first = body.cells.find((c) => key(c.q, c.r) === body.chain[0]); const last = body.cells.find((c) => key(c.q, c.r) === body.chain[body.chain.length - 1]);
        const ext = (cell, pred, pt, len) => { for (let d = 0; d < 6; d++) { const n = b.get(cell.q + DIRS[d][0], cell.r + DIRS[d][1]); const sea = b.isSea(cell.q + DIRS[d][0], cell.r + DIRS[d][1]); if (pred(n, sea)) { const m = edgeMid(pt.x, pt.y, d); return { x: pt.x + (m.x - pt.x) * len, y: pt.y + (m.y - pt.y) * len }; } } return null; };
        const src = first ? ext(first, (n) => n && (n.family === 'rock' || n.family === 'hill' || (n.rare && (n.family === 'watchtower' || n.family === 'mine'))), pts[0], 0.75) : null;
        let mouth = body.mouth && last ? ext(last, (n, sea) => sea, pts[pts.length - 1], 1.05) : null;
        if (!mouth && body.intoLake) { const [lq, lr] = parse(body.intoLake); const lw = toWorld(lq, lr); const e = pts[pts.length - 1]; mouth = { x: e.x + (lw.x - e.x) * 0.55, y: e.y + (lw.y - e.y) * 0.55 }; }   // le ruban entre dans la nappe
        // méandres : trois points par segment, décalés en alternance d'un côté puis de l'autre (serpent) avec une part de hasard déterministe
        const full = meander([...(src ? [src] : []), ...pts, ...(mouth ? [mouth] : [])]);
        const sp = full.map(S); if (!sp.some((p) => vis(p))) continue;
        // filet qui s'élargit de la source à l'embouchure : chaque tronçon lissé a sa propre largeur (bouts ronds : pas de joint visible)
        const wAt = (i) => { const t = i / Math.max(1, sp.length - 1); return (16 + 12 * t + 3 * Math.sin(i * 2.3)) * z; };
        ctx.globalAlpha = 1;
        // le lit est creusé : bord sombre, fond à l'ombre, puis le filet d'eau clair décalé vers le bas
        tapered(sp, wAt, 1.12, pal.edge);
        tapered(sp, wAt, 1, pal.deep);
        ctx.save(); ctx.translate(0, 2.5 * z); tapered(sp, wAt, 0.88, pal.shoal); ctx.restore();
        if (mouth) { const m = S(mouth); ctx.fillStyle = pal.fill; ctx.beginPath(); ctx.ellipse(m.x, m.y, 26 * z, 16 * z, 0, 0, TAU); ctx.fill(); }
        if (!frozen) { ctx.strokeStyle = pal.foam; ctx.lineWidth = (this.finale ? 3 : RIDE.trait) * z; ctx.setLineDash(RIDE.tirets.map((v) => v * z)); ctx.lineDashOffset = -this.time * (this.finale ? 120 : 40) * z; trace(sp); ctx.stroke(); ctx.setLineDash([]); }
        else this.drawCracks(ctx, sp, z);
      } else if (body.kind === 'pond') {
        const c = S(c0); if (!vis(c)) continue;
        const rr = SIZE * 0.66 * z;
        ctx.fillStyle = pal.edge; this.blob(ctx, c.x, c.y, rr * 1.03, c0); ctx.fill();
        ctx.fillStyle = pal.deep; this.blob(ctx, c.x, c.y, rr, c0); ctx.fill();
        ctx.fillStyle = pal.shoal; this.blob(ctx, c.x, c.y + 3.5 * z, rr * 0.92, c0); ctx.fill();
        for (let d = 0; d < 6; d++) {   // mare ouverte sur la mer : elle devient une crique
          const cell = body.cells[0]; const nq = cell.q + DIRS[d][0], nr = cell.r + DIRS[d][1];
          if (!b.isSea(nq, nr)) continue;
          this.bras(ctx, c0, d, mer, z, S, body.cells[0], pal);
        }
        if (!frozen) { ctx.strokeStyle = pal.foam; ctx.lineWidth = RIDE.trait * 0.7 * z; ctx.beginPath(); ctx.ellipse(c.x - rr * 0.2, c.y - rr * 0.25, rr * 0.35, rr * 0.16, -0.4, 0, TAU); ctx.stroke(); }
      } else {
        // lac : union de mares arrondies (une par case, forme irrégulière) reliées par des ponts arrondis entre cases voisines ;
        // tout est de la même couleur, donc aucune couture : le lac devient une nappe organique aux rives lobées
        const cs = body.cells.map((cell) => { const w = toWorld(cell.q, cell.r); return { w, s: S(w), cell }; });
        if (!cs.some((c) => vis(c.s))) continue;
        const bridges = []; for (const a of cs) for (let d = 0; d < 3; d++) { const nk = key(a.cell.q + DIRS[d][0], a.cell.r + DIRS[d][1]); if (!body.keys.has(nk)) continue; const o = cs.find((c) => key(c.cell.q, c.cell.r) === nk); if (o) bridges.push([a, o]); }
        const nappe = (color, grow, dy = 0) => {
          ctx.fillStyle = color; ctx.strokeStyle = color;
          for (const c of cs) { this.blob(ctx, c.s.x, c.s.y + dy, (SIZE * 0.92 + grow) * z, c.w); ctx.fill(); }
          ctx.lineWidth = (SIZE * 1.11 + grow * 2) * z; ctx.beginPath(); for (const [a, o] of bridges) { ctx.moveTo(a.s.x, a.s.y + dy); ctx.lineTo(o.s.x, o.s.y + dy); } ctx.stroke();
        };
        // Une CUVETTE, pas un monticule. Une ombre portée à l'extérieur et vers le bas est la signature
        // d'un objet posé SUR le sol : c'est exactement l'inverse de ce qu'on veut. L'ombre va donc
        // DEDANS, en croissant sous la lèvre proche (le bord haut), et le fond s'éclaircit en
        // s'éloignant. On l'obtient sans découpe : la nappe entière au ton le plus sombre, puis la même
        // forme rétrécie et descendue par-dessus — ce qui reste à découvert est le croissant du haut.
        let grad = null;
        { let y0 = Infinity, y1 = -Infinity; for (const c of cs) { y0 = Math.min(y0, c.s.y); y1 = Math.max(y1, c.s.y); }
          grad = ctx.createLinearGradient(0, y0 - SIZE * 0.6 * z, 0, y1 + SIZE * z);
          grad.addColorStop(0, pal.fill); grad.addColorStop(0.75, pal.shoal); grad.addColorStop(1, pal.shoal); }
        nappe(pal.edge, 2);            // la lèvre : un liseré sombre au contact de la terre, sans débord
        nappe(pal.deep, 0);            // le fond, à l'ombre
        nappe(grad, -4, 4 * z);        // le plan d'eau, un peu rétréci et descendu : ombre fine sous la lèvre
        if (!frozen) {
          // la rive scintille : un liseré clair qui court le long du contour, et qui BOUGE — sans
          // l'animation ce n'est qu'un trait peint, et c'est ce mouvement qui fait lire « de l'eau »
          ctx.save(); ctx.strokeStyle = pal.foam; ctx.lineWidth = RIDE.trait * z;
          ctx.setLineDash(RIDE.tirets.map((v) => v * z)); ctx.lineDashOffset = -this.time * 12 * z;
          for (const c of cs) { this.blob(ctx, c.s.x, c.s.y, SIZE * 0.9 * z, c.w); ctx.stroke(); }
          ctx.restore();
          // reflets : une ride par case, placée de façon déterministe
          ctx.strokeStyle = pal.foam; ctx.lineWidth = RIDE.trait * 0.7 * z; ctx.beginPath();
          for (const c of cs) { const j = jit(c.w, { x: 1, y: 1 }); const rr = SIZE * 0.86 * z; ctx.moveTo(c.s.x - rr * 0.3 + j * rr * 0.4, c.s.y - rr * 0.2 + j * rr * 0.3); ctx.bezierCurveTo(c.s.x - rr * 0.1, c.s.y - rr * 0.35 + j * rr * 0.3, c.s.x + rr * 0.1, c.s.y - rr * 0.05 + j * rr * 0.3, c.s.x + rr * 0.3, c.s.y - rr * 0.2 + j * rr * 0.3); }
          ctx.stroke();
        } else this.drawCracks(ctx, cs.map((c) => c.s), z);
        // Bras de mer : une nappe qui touche le bord de l'île n'est pas un lac fermé, c'est une
        // échancrure. Dessiné EN DERNIER, après l'écume et les rides : sinon le liseré du lac se
        // prolongeait dans la mer et redessinait la lèvre qu'on venait d'ouvrir. Mais HORS du
        // `if (!frozen)` : un lac gelé touche la mer tout autant, et sans ce bras sa lèvre restait
        // nue au contact du large tout l'hiver.
        for (const c of cs) for (let d = 0; d < 6; d++) {
          const nq = c.cell.q + DIRS[d][0], nr = c.cell.r + DIRS[d][1];
          if (!b.isSea(nq, nr)) continue;
          this.bras(ctx, c.w, d, mer, z, S, c.cell, pal);
        }
      }
    }
    ctx.restore();
  }

  /**
   * Sol d'une tuile d'eau : le sol majoritaire de ses voisines, sur lequel chaque voisine d'un autre sol déborde en une
   * lentille fondue centrée sur le milieu du bord partagé (dégradé radial, pas de couture ni de secteur). Mis en cache par
   * signature (sol de base, sol par côté, saison), car les combinaisons sont peu nombreuses.
   */
  waterGround(t, season) {
    const b = this.isl.board; const base = this.decor.groundFor(t);
    const gs = []; for (let d = 0; d < 6; d++) { const n = b.get(t.q + DIRS[d][0], t.r + DIRS[d][1]); let g = n && n.family !== 'water' ? this.decor.groundFor(n) : ''; if (g === 'hill') g = 'grass'; gs.push(g === base ? '' : g); }
    const sig = `${base}|${gs.join(',')}|${season}`;
    this._wg = this._wg || new Map(); const hit = this._wg.get(sig); if (hit) return hit;
    const baseImg = Assets.img(groundKey(base, season)); if (!baseImg) return null;
    const W = baseImg.width, H = baseImg.height, sc = W / TILE_W;   // images 2×
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    g.drawImage(baseImg, 0, 0);
    const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tg = tmp.getContext('2d');
    const c0 = toWorld(t.q, t.r);
    for (let d = 0; d < 6; d++) {
      if (!gs[d]) continue; const img = Assets.img(groundKey(gs[d], season)); if (!img) continue;
      const m = edgeMid(c0.x, c0.y, d); const mx = W / 2 + (m.x - c0.x) * sc, my = H / 2 + (m.y - c0.y) * sc;
      tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(img, 0, 0);
      const r = SIZE * 0.95 * sc; const grad = tg.createRadialGradient(mx, my, 0, mx, my, r);
      grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.45, 'rgba(0,0,0,0.9)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      tg.globalCompositeOperation = 'destination-in'; tg.fillStyle = grad; tg.fillRect(0, 0, W, H);
      g.drawImage(tmp, 0, 0);
    }
    this._wg.set(sig, cv); return cv;
  }

  /**
   * Les cours des bourgs : un disque de terre battue sous chaque bâtiment, fondu sur son pourtour. Une seule
   * image masquée par saison, posée autant de fois qu'il y a de bâtiments : les disques voisins se recouvrent
   * et font une place, sans couture puisqu'ils partagent la même texture. L'opacité dit la taille du bourg.
   */
  drawCourts(ctx, dropping) {
    const courts = this.decor.courts; if (!courts || !courts.length) return;
    const cam = this.cam, z = cam.zoom;
    ctx.save();
    for (const c of courts) {
      if (dropping.has(c.cell)) continue;
      const p = cam.toScreen(c.x, c.y); const rr = c.r * z;
      if (p.x + rr < 0 || p.x - rr > STAGE.W || p.y + rr < 0 || p.y - rr > STAGE.H) continue;
      const img = this.courtImage('dirt', this.seasonFor(c.x)); if (!img) continue;
      ctx.globalAlpha = c.a;
      ctx.drawImage(img, p.x - rr, p.y - rr, rr * 2, rr * 2);
    }
    ctx.restore();
  }

  /**
   * L'échancrure par laquelle une nappe d'eau rejoint le large, du côté `d` de la case `w`.
   *
   * Deux essais avant celui-ci. Peindre le prolongement en ton de bas-fond faisait des taches pâles
   * sur une mer d'une autre teinte ; le faire virer puis s'effacer laissait passer, entre deux taches
   * mal jointes, une bande de terre et un bout d'herbe. La réponse est plus simple : **une échancrure
   * est de l'eau de mer**. On la peint donc exactement à la couleur de la mer, en opaque — la jointure
   * est alors invisible par construction, et l'opacité recouvre ce qui traînait au milieu (liseré de
   * côte, coin de terre).
   *
   * Mais peindre TOUT le bras en mer déplaçait la couture : le premier disque recouvre le centre de
   * la tuile, donc le trait ne tombait plus entre le bras et la mer, mais entre le bras et la NAPPE,
   * en plein milieu de l'eau douce (mesuré : lac 104,176,219 contre bras 116,176,214, d'un pixel au
   * suivant). Le bras part donc maintenant de l'eau douce et vire à la mer AVANT le trait de côte :
   * une rampe ne peut pas faire de trait.
   */
  bras(ctx, w, d, mer, z, S, cell, pal) {
    const m = edgeMid(w.x, w.y, d);
    const vers = (t) => ({ x: w.x + (m.x - w.x) * t, y: w.y + (m.y - w.y) * t });
    // Le dégradé de la mer, repris à l'identique : même axe (vertical, plein écran), mêmes bornes.
    // Une couleur plate ne pouvait pas marcher — la mer est un dégradé, donc une teinte unique ne
    // coïncide que sur une ligne et se voit au-dessus et au-dessous. Avec le même dégradé, l'échancrure
    // est de l'eau de mer où qu'elle soit, et la jointure ne peut plus se voir. (Mesuré : la mer fait
    // (110, 172, 209) au ras de l'île, le lac (98, 173, 216) — un cheveu d'écart, invisible.)
    // quatre disques qui se chevauchent franchement : aucun interstice ne peut subsister entre eux.
    // Ils sont tracés en UN SEUL chemin, rempli d'un coup : leur union ne se recouvre donc plus
    // elle-même, et un remplissage semi-transparent (la rampe, plus bas) ne s'y cumule pas.
    const disques = [[0.55, 0.55], [0.95, 0.55], [1.4, 0.5], [1.85, 0.4]];
    const tracer = () => { ctx.beginPath(); for (const [t, r] of disques) { const p = S(vers(t)); this.blob(ctx, p.x, p.y, SIZE * r * z, { x: w.x + t * 41, y: w.y - t * 23 }, true); } };
    tracer(); ctx.fillStyle = mer(); ctx.fill();
    // Et le voile des bas-fonds. `drawShallows` pose un blanc à 10 % sur chaque case du masque ÉLARGIE
    // à 1,22 : c'est le halo clair autour de l'île. Le bras, peint à la mer brute, l'effaçait — d'où
    // une tache plus SOMBRE que son entourage, et c'est elle qu'on voyait encore après trois
    // corrections de couleur. On remet le voile, découpé sur exactement la même emprise.
    ctx.save();
    ctx.beginPath();
    for (const [q, r] of [[cell.q, cell.r], ...DIRS.map(([a, b]) => [cell.q + a, cell.r + b])]) {
      if (!this.isl.board.has(q, r)) continue;
      const c = toWorld(q, r); const pts = corners(c.x, c.y, SIZE * 1.22).map(([x, y]) => S({ x, y }));
      ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath();
    }
    ctx.clip();
    ctx.fillStyle = mer(0.10); tracer(); ctx.fill();
    ctx.restore();
    // Le raccord côté NAPPE. Le bras commence dans l'eau douce : on l'y repeint à son ton de bas-fond,
    // qui s'efface avant le trait de côte. D'un bout à l'autre il n'y a plus de saut de couleur, juste
    // une eau qui vire — du lac au large sans rupture.
    const p0 = S(vers(0)), p1 = S(vers(1.05));
    const rampe = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
    rampe.addColorStop(0, pal.shoal); rampe.addColorStop(1, `${pal.shoal}00`);
    tracer(); ctx.fillStyle = rampe; ctx.fill();
  }

  /** Disque d'un sol, opaque au centre et effacé sur le bord. Mis en cache par sol et saison. */
  courtImage(g, season) {
    const k = `${g}|${season}`; this._court = this._court || new Map();
    const hit = this._court.get(k); if (hit !== undefined) return hit;
    const img = Assets.img(groundKey(g, season)); if (!img) { this._court.set(k, null); return null; }
    // le disque fait un apothème de rayon : à cette échelle la texture est à sa taille native, donc nette
    const D = 256, ech = (D / 2) / (img.width / 2);
    const cv = document.createElement('canvas'); cv.width = D; cv.height = D; const c = cv.getContext('2d');
    c.drawImage(img, D / 2 - img.width * ech / 2, D / 2 - img.height * ech / 2, img.width * ech, img.height * ech);
    const grad = c.createRadialGradient(D / 2, D / 2, 0, D / 2, D / 2, D / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0.92)'); grad.addColorStop(0.42, 'rgba(0,0,0,0.74)');
    grad.addColorStop(0.72, 'rgba(0,0,0,0.36)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalCompositeOperation = 'destination-in'; c.fillStyle = grad; c.fillRect(0, 0, D, D);
    this._court.set(k, cv); return cv;
  }

  /**
   * Lentille de sol : l'image du sol `g` masquée par un dégradé perpendiculaire au bord `d` (opaque sur le bord, effacé
   * à un tiers de l'apothème), limitée au trapèze de ce bord. Dessinée sur la tuile voisine, elle efface la couture.
   * Cache par sol, saison et direction (au plus quelques dizaines de petites images).
   */
  groundLens(g, season, d) {
    const k = `${g}|${season}|${d}`; this._lens = this._lens || new Map();
    const hit = this._lens.get(k); if (hit !== undefined) return hit;
    const img = Assets.img(groundKey(g, season)); if (!img) { this._lens.set(k, null); return null; }
    const W = img.width, H = img.height, sc = W / TILE_W;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const c0 = { x: 0, y: 0 }; const pts = corners(0, 0, SIZE); const m = edgeMid(0, 0, d);
    const P = (x, y) => [W / 2 + x * sc, H / 2 + y * sc];
    const a = pts[d], bpt = pts[(d + 1) % 6]; const depth = 0.42;
    const ia = [a[0] * (1 - depth), a[1] * (1 - depth)], ib = [bpt[0] * (1 - depth), bpt[1] * (1 - depth)];
    c.beginPath(); c.moveTo(...P(a[0], a[1])); c.lineTo(...P(bpt[0], bpt[1])); c.lineTo(...P(ib[0], ib[1])); c.lineTo(...P(ia[0], ia[1])); c.closePath(); c.clip();
    c.drawImage(img, 0, 0);
    const [mx, my] = P(m.x, m.y); const [cx, cy] = P(c0.x, c0.y);
    const grad = c.createLinearGradient(mx, my, mx + (cx - mx) * depth, my + (cy - my) * depth);
    grad.addColorStop(0, 'rgba(0,0,0,0.95)'); grad.addColorStop(0.35, 'rgba(0,0,0,0.7)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalCompositeOperation = 'destination-in'; c.fillStyle = grad; c.fillRect(0, 0, W, H);
    this._lens.set(k, cv); return cv;
  }

  /** Voile de climat (multiplication d'une teinte claire sur l'île seulement) : ocre au chaud, vert d'eau à l'humide, bleu pâle au froid. */
  drawClimateTint(ctx) {
    const cl = this.isl.climate; if (!cl || !cl.tint) return;
    const cam = this.cam, b = this.isl.board; ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = cl.tint; ctx.beginPath();
    for (const t of b.tiles.values()) { const w = toWorld(t.q, t.r); const c = cam.toScreen(w.x, w.y); if (c.x < -100 || c.x > STAGE.W + 100 || c.y < -100 || c.y > STAGE.H + 100) continue; const pts = corners(c.x, c.y, SIZE * cam.zoom * 1.01); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
    for (const h of this.decor.holes || []) { const w = toWorld(h.q, h.r); const c = cam.toScreen(w.x, w.y); const pts = corners(c.x, c.y, SIZE * cam.zoom * 1.01); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
    ctx.fill(); ctx.restore();
  }

  /** Forme arrondie légèrement irrégulière (mare). */
  blob(ctx, cx, cy, r, seed, suite) {
    const N = 28, pts = [];
    for (let i = 0; i < N; i++) { const a = (i / N) * TAU; const j = 0.92 + 0.08 * Math.sin(seed.x * 0.037 + seed.y * 0.011 + a * 3) + 0.05 * Math.cos(a * 5 + seed.y * 0.02); pts.push([cx + Math.cos(a) * r * j, cy + Math.sin(a) * r * 0.8 * j]); }
    if (!suite) ctx.beginPath();   // `suite` : on s'ajoute au chemin en cours au lieu d'en ouvrir un neuf
    ctx.moveTo((pts[0][0] + pts[N - 1][0]) / 2, (pts[0][1] + pts[N - 1][1]) / 2);
    for (let i = 0; i < N; i++) { const p = pts[i], q = pts[(i + 1) % N]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    ctx.closePath();
  }

  /** Fissures blanches sur la glace, le long d'une suite de points écran. */
  drawCracks(ctx, sp, z) {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5 * z; ctx.beginPath();
    for (let i = 0; i < sp.length; i++) { const p = sp[i]; const h = Math.sin(i * 7.3 + p.x * 0.01) * 20 * z; ctx.moveTo(p.x - 14 * z, p.y + h * 0.3); ctx.lineTo(p.x + 4 * z, p.y - 8 * z + h * 0.1); ctx.lineTo(p.x + 18 * z, p.y + 6 * z); }
    ctx.stroke();
  }

  /**
   * Ruelles entre hameaux voisins et sentiers entre villages, tracés en courbes douces sous les objets.
   * La géométrie vient de `pathShapes` (partagée avec le décor, qui l'évite) : le chemin s'arrête devant
   * la maison au lieu de la traverser, et son hésitation est tirée par case, si bien que deux chemins
   * n'ondulent plus de la même façon.
   */
  drawPaths(ctx) {
    const b = this.isl.board, cam = this.cam, z = cam.zoom;
    const shapes = pathShapes(b);
    if (!shapes.length) return;
    const season = this.isl.season;
    const col = { spring: '#c9a570', summer: '#d1ab74', autumn: '#bf9463', winter: '#dcd2c3' }[season] || '#c9a570';
    const dark = { spring: '#a37f4c', summer: '#ab864f', autumn: '#966f42', winter: '#b7ab9a' }[season] || '#a37f4c';
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const trace = (sp) => { ctx.beginPath(); ctx.moveTo(sp[0].x, sp[0].y); if (sp.length === 2) ctx.lineTo(sp[1].x, sp[1].y); else { for (let i = 1; i < sp.length - 1; i++) { const mx = (sp[i].x + sp[i + 1].x) / 2, my = (sp[i].y + sp[i + 1].y) / 2; ctx.quadraticCurveTo(sp[i].x, sp[i].y, mx, my); } ctx.lineTo(sp[sp.length - 1].x, sp[sp.length - 1].y); } };
    const all = shapes.map((s) => ({ sp: s.pts.map((p) => cam.toScreen(p.x, p.y)), width: s.kind === 'lane' ? 6 : 9 }))
      .filter((o) => !o.sp.every((p) => p.x < -200 || p.x > STAGE.W + 200 || p.y < -200 || p.y > STAGE.H + 200));
    // deux passes globales (bordure sombre puis terre) pour que les croisements restent propres.
    // Le pointillé blanc du milieu est parti : c'était un marquage routier dans un jeu qui n'a pas de routes.
    ctx.globalAlpha = 0.5; ctx.strokeStyle = dark; for (const o of all) { ctx.lineWidth = (o.width + 4) * z; trace(o.sp); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.strokeStyle = col; for (const o of all) { ctx.lineWidth = o.width * z; trace(o.sp); ctx.stroke(); }
    if (this.finale) { ctx.globalAlpha = 0.35 + 0.3 * Math.sin(this.time * 5); ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 4 * z; ctx.setLineDash([14 * z, 10 * z]); ctx.lineDashOffset = -this.time * 60 * z; for (const o of all) { trace(o.sp); ctx.stroke(); } ctx.setLineDash([]); }
    ctx.restore();
  }

  /** Voiles et pluie de la météo active (espace écran). */
  drawWeather(ctx, dt) {
    const w = this.weather; const W = STAGE.W, H = STAGE.H;
    if (this.flash > 0) { ctx.save(); ctx.globalAlpha = Math.min(0.5, this.flash * 2.5); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); this.flash -= dt; }
    if (!w || this.finale) { this.rain.length = 0; return; }
    if (w === 'storm') {
      while (this.rain.length < 160) this.rain.push({ x: Math.random() * (W + 200) - 100, y: Math.random() * H, l: 10 + Math.random() * 14, v: 700 + Math.random() * 400 });
      ctx.save(); ctx.strokeStyle = 'rgba(220,240,255,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (const d of this.rain) { d.y += d.v * dt; d.x -= d.v * 0.18 * dt; if (d.y > H + 20) { d.y = -30; d.x = Math.random() * (W + 200) - 60; } ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.18, d.y + d.l); }
      ctx.stroke();
      ctx.globalAlpha = 0.12; ctx.fillStyle = '#3a5a78'; ctx.fillRect(0, 0, W, H); ctx.restore();
    } else if (w === 'heat') {
      ctx.save(); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,200,110,0.16)'); g.addColorStop(1, 'rgba(255,160,80,0.06)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    } else if (w === 'blizzard') {
      ctx.save(); ctx.globalAlpha = 0.22 + 0.05 * Math.sin(this.time * 1.7); ctx.fillStyle = '#eef4fa'; ctx.fillRect(0, 0, W, H); ctx.restore();
    } else if (w === 'wind') {
      ctx.save(); ctx.globalAlpha = 0.18; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { const y = ((this.time * 60 + i * 137) % (H + 80)) - 40; const x = ((this.time * 380 + i * 331) % (W + 400)) - 200; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 60, y - 8, x + 130, y + 4); ctx.stroke(); }
      ctx.restore();
    }
  }

  drawBloom(ctx, cx, cy) {
    ctx.save(); ctx.globalAlpha = 0.8;
    for (let i = 0; i < 5; i++) { const a = this.time * 0.6 + i * 1.3; const r = 14 * this.cam.zoom; ctx.fillStyle = i % 2 ? '#fff6c9' : '#f7c8d8'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * 0.9 + 6 * this.cam.zoom, 2.2 * this.cam.zoom, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  drawHover(ctx) {
    if (this.isl.restrict) { const cam = this.cam; for (const k of this.isl.restrict) { const [q, r] = parse(k); const w = toWorld(q, r); const c = cam.toScreen(w.x, w.y); const pulse = 0.55 + 0.45 * Math.sin(this.time * 4); ctx.save(); ctx.globalAlpha = 0.35 * pulse; ctx.fillStyle = '#ffd77a'; const pts = corners(c.x, c.y, SIZE * cam.zoom * 0.95); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); ctx.restore(); this.outline(ctx, c.x, c.y, '#e0a33a', 0.6 + 0.4 * pulse); } }
    const hv = this.hover; if (!hv) return;
    const cam = this.cam;
    const w = toWorld(hv.q, hv.r); const c = cam.toScreen(w.x, w.y);
    const z = cam.zoom;
    if (this.budMode) {
      const t = this.isl.board.get(hv.q, hv.r);
      const ok = this.isl.canBud(hv.q, hv.r);
      this.outline(ctx, c.x, c.y, ok ? '#2f9e8f' : '#d95f4b', 0.9);
      return;
    }
    if (!hv.preview) {
      if (this.isl.board.has(hv.q, hv.r) && !this.isl.board.get(hv.q, hv.r)) this.outline(ctx, c.x, c.y, '#d95f4b', 0.6);
      else if (this.isl.board.get(hv.q, hv.r)) { const pts = corners(c.x, c.y, SIZE * z * 0.97); ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = '#fffdf8'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.stroke(); ctx.restore(); }
      return;
    }
    const pv = hv.preview;
    // régions qui se fermeraient
    for (const cl of pv.closes) {
      ctx.save(); ctx.globalAlpha = 0.45 + 0.2 * Math.sin(this.time * 6); ctx.fillStyle = '#ffd77a';
      for (const cell of cl.cells) { const ww = toWorld(cell.q, cell.r); const cc = cam.toScreen(ww.x, ww.y); const pts = corners(cc.x, cc.y, SIZE * z * 0.92); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    // tuile fantôme
    if (!pv.build) { const tile = { ...this.isl.current, q: hv.q, r: hv.r }; this.drawTileAt(ctx, tile, c.x, c.y - 6 * z, 1, 0.8, this.isl.season); }
    this.outline(ctx, c.x, c.y, pv.build ? '#e0a33a' : pv.total >= 0 ? '#2f9e8f' : '#d95f4b', 0.9);
    if (pv.build) { const p2 = 0.5 + 0.5 * Math.sin(this.time * 5); ctx.save(); ctx.globalAlpha = 0.18 + 0.12 * p2; ctx.fillStyle = '#ffd77a'; const pts = corners(c.x, c.y, SIZE * z * 0.92); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); ctx.restore(); }
    // points par bord
    ctx.save();
    ctx.font = `700 ${Math.round(14 * clamp(z, 0.8, 1.3))}px Quicksand, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const e of pv.edges) {
      const m = edgeMid(w.x, w.y, e.d); const s = cam.toScreen(m.x, m.y);
      this.pill(ctx, s.x, s.y, (e.pts > 0 ? '+' : '') + e.pts, e.pts > 0 ? (e.pts >= 2 ? '#e0a33a' : '#2f9e8f') : '#d95f4b');
    }
    for (let i = 0; i < pv.base.length; i++) { const bs = pv.base[i]; this.pill(ctx, c.x, c.y + (30 + i * 22) * z, `+${bs.pts} ${bs.label}`, '#5aa7d6'); }
    for (const cl of pv.closes) this.pill(ctx, c.x, c.y - (64) * z, `région close +${cl.bonus}`, '#e0a33a');
    if (pv.blight) this.pill(ctx, c.x, c.y - 64 * z, '✗ en friche : ne rapportera plus rien', '#d95f4b');
    const py = (34 + pv.base.length * 24) * z;   // sous les pastilles de base
    if (pv.work) { const nm = (STORY.tiles[pv.work] || {}).name || pv.work; this.pill(ctx, c.x, c.y + py, nm + (pv.fresh ? ' · frais' : ''), '#2b2a26'); this.pill(ctx, c.x, c.y + py + 22 * z, pv.good ? (pv.fresh ? '✓ bonne place, frais : +1 par saison' : '✓ bonne place') : '✗ mauvaise place : pénalité deux saisons, puis il s’efface', pv.good ? '#2f9e8f' : '#d95f4b'); }
    else if (pv.build && pv.fuse) { const nm = (STORY.tiles[pv.fuse.id] || {}).name || pv.fuse.id; this.pill(ctx, c.x, c.y + py, `${nm} · ${pv.cost} souffle`, '#2b2a26'); this.pill(ctx, c.x, c.y + py + 22 * z, pv.first ? '★ recette nouvelle : rend une tuile et une rare' : 'recette connue', pv.first ? '#e0a33a' : '#8a867c'); }
    else if (pv.build && pv.restore) { this.pill(ctx, c.x, c.y + py, `Remise en état · ${pv.cost} souffle`, '#2b2a26'); this.pill(ctx, c.x, c.y + py + 22 * z, 'la friche recompte pour sa famille', '#2f9e8f'); }
    else if (pv.build) { const ok = pv.refund && pv.refund.ok; const sig = pv.level >= 3 && STORY.level3[this.isl.board.get(hv.q, hv.r).family]; this.pill(ctx, c.x, c.y + py, `${sig ? sig.name : `niveau ${pv.level}`} · ${pv.cost} souffle${pv.cost > 1 ? 's' : ''}`, '#2b2a26'); if (sig) this.pill(ctx, c.x, c.y + py + 22 * z, `★ ${sig.short}, +1 par saison`, '#e0a33a'); this.pill(ctx, c.x, c.y + py + (sig ? 44 : 22) * z, ok ? '↩ rend une tuile' : 'sans retour', ok ? '#2f9e8f' : '#8a867c'); }
    // total : badge nettement plus grand et plus contrasté que les pastilles de bord, avec son libellé
    const tz = clamp(z, 0.8, 1.3);
    const txt = `${pv.total >= 0 ? '+' : ''}${pv.total}`;
    ctx.font = `800 ${Math.round(30 * tz)}px Quicksand, sans-serif`;
    const bw = ctx.measureText(txt).width + 40 * tz, bh = 44 * tz, bx = c.x, by = c.y - 102 * z;
    const bg = pv.total > 0 ? '#2b2a26' : pv.total < 0 ? '#d95f4b' : '#6b6a66', accent = pv.total > 0 ? '#e0a33a' : '#ffffff';
    ctx.save(); ctx.shadowColor = 'rgba(20,30,40,0.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2); ctx.fill(); ctx.restore();
    ctx.strokeStyle = accent; ctx.lineWidth = 2.5 * tz; ctx.beginPath(); ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, bx, by + 1);
    ctx.font = `700 ${Math.round(11 * tz)}px Quicksand, sans-serif`; ctx.fillStyle = '#2b2a26';
    const lab = pv.work ? 'OUVRAGE' : pv.fuse ? 'FUSION' : pv.build ? 'BÂTIR' : 'TOTAL', lw = ctx.measureText(lab).width + 14 * tz;
    ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(bx - lw / 2, by - bh / 2 - 15 * tz, lw, 16 * tz, 8 * tz); ctx.fill();
    ctx.fillStyle = pv.total > 0 ? '#2b2a26' : '#d95f4b'; ctx.fillText(lab, bx, by - bh / 2 - 7 * tz);
    ctx.restore();
  }

  pill(ctx, x, y, text, bg, fg = '#fff') {
    const fm = /(\d+(?:\.\d+)?)px/.exec(ctx.font); const w = ctx.measureText(text).width + 14, h = (fm ? parseFloat(fm[1]) : 14) + 8;
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.fillText(text, x, y + 1);
  }

  outline(ctx, cx, cy, color, alpha) {
    const pts = corners(cx, cy, SIZE * this.cam.zoom * 0.97);
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 3 * this.cam.zoom + 1; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.stroke(); ctx.restore();
  }

  /** Ouvrages mal placés : un marqueur rouge au-dessus de la tuile (la pénalité court tant que le voisinage ne change pas). */
  drawWorkMarks(ctx) {
    const cam = this.cam, z = cam.zoom; let any = false;
    for (const t of this.isl.board.tiles.values()) {
      if (!t.work || !t.workBad) continue; const w = toWorld(t.q, t.r); const c = cam.toScreen(w.x, w.y - 44); if (c.x < -40 || c.x > STAGE.W + 40 || c.y < -40 || c.y > STAGE.H + 40) continue;
      if (!any) { ctx.save(); ctx.font = `800 ${Math.round(13 * clamp(z, 0.8, 1.3))}px Quicksand, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; any = true; }
      const bob = Math.sin(this.time * 3 + t.q) * 2 * z; this.pill(ctx, c.x, c.y + bob, '!', '#d95f4b');
    }
    if (any) ctx.restore();
  }

  drawRings(ctx) {
    const cam = this.cam;
    for (const r of this.fx.rings) {
      ctx.save(); ctx.strokeStyle = r.color; ctx.fillStyle = r.color;
      for (const cell of r.cells) {
        const t = (r.t - (cell.d || 0)) / 1.3; if (t < 0 || t > 1) continue;   // chaque cellule vit sa propre onde, décalée
        const e = easeOutCubic(t);
        const w = toWorld(cell.q, cell.r); const c = cam.toScreen(w.x, w.y);
        const pts = corners(c.x, c.y, SIZE * cam.zoom * (0.9 + e * 0.25));
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < 6; k++) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath();
        if (t < 0.45) { ctx.globalAlpha = (1 - t / 0.45) * 0.28; ctx.fill(); }   // l'éclat : la case s'allume, puis l'anneau part
        ctx.globalAlpha = (1 - t) * 0.9; ctx.lineWidth = 4 * cam.zoom * (1 - t) + 1; ctx.stroke();
      }
      ctx.restore();
    }
  }

  /** Position animée d'un animal : il se déplace lentement de case en case dans sa région. */
  wanderPos(k, a, dt) {
    const HAB = { rabbit: 'meadow', cow: 'meadow', moose: 'forest', bear: 'forest', owl: 'forest', duck: 'water', penguin: 'water', frog: 'marsh', chicken: 'hamlet', horse: 'hill' };
    const home = toWorld(a.q, a.r);
    let st = this.wander.get(k);
    if (!st) { st = { x: home.x, y: home.y, tx: home.x, ty: home.y, wait: 1 + Math.random() * 3, hop: 0, walked: Math.random() * 100, left: Math.random() < 0.5 }; this.wander.set(k, st); }
    st.wait -= dt;
    const fam = HAB[a.species];
    if (st.wait <= 0 && fam) {
      const reg = this.isl.board.region(a.q, a.r, fam);
      const cells = reg ? reg.cells.filter((c) => !c.rare && !(fam === 'meadow' && c.dry) && !(fam === 'water' && c.frozen !== (a.species === 'penguin'))) : [];
      const c = cells.length ? cells[Math.floor(Math.random() * cells.length)] : null;
      const t = c ? toWorld(c.q, c.r) : home;
      st.tx = t.x + (Math.random() - 0.5) * 36; st.ty = t.y + (Math.random() - 0.5) * 26;
      st.wait = 1.2 + Math.random() * 2.5;
    }
    const dx = st.tx - st.x, dy = st.ty - st.y; const d = Math.hypot(dx, dy);
    const speed = a.species === 'duck' || a.species === 'penguin' ? 22 : a.species === 'horse' ? 40 : 30;
    if (d > 1) {
      const step = Math.min(d, speed * dt);
      st.x += (dx / d) * step; st.y += (dy / d) * step;
      st.hop += dt * (a.species === 'duck' ? 3 : 9);
      st.walked = (st.walked || 0) + step;             // le cycle de marche avance avec le chemin parcouru
      if (Math.abs(dx) > 2) st.left = dx < 0;          // les bandes regardent à droite ; on retourne pour l'autre sens
    }
    return st;
  }

  /**
   * Un animal posé au sol. `gx, gy` est le point **au sol** en pixels écran : l'ombre s'y pose et
   * n'en bouge jamais, seul l'animal se soulève de `lift` (le petit saut de la marche, l'envol du
   * départ) — c'est ce qui l'empêche de paraître voler. L'image vient de la bande de profil
   * (`fauna_<espèce>_side`), choisie par la distance parcourue et retournée selon le sens de
   * marche ; repli sur la tête ronde si la bande manque.
   */
  drawAnimal(ctx, species, st, gx, gy, lift, s, alpha) {
    const cam = this.cam;
    const sheet = Assets.img(`fauna_${species}_side`);
    const m = sheet ? (Assets.manifest().images || {})[`fauna_${species}_side`] : null;
    s *= FAUNA_SIZE[species] || 0.5;   // échelle commune : sans elle, chaque espèce fait la taille de son rendu
    const w = m ? (m.frame_w / 2) * cam.zoom * s : 44 * cam.zoom * s;
    const k = 1 - Math.min(0.3, Math.abs(lift) / Math.max(1, 70 * cam.zoom));   // l'ombre rétrécit un peu quand il se soulève
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.beginPath(); ctx.ellipse(gx, gy, w * 0.30 * k, w * 0.11 * k, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = alpha;
    if (st && st.left) { ctx.translate(gx, 0); ctx.scale(-1, 1); ctx.translate(-gx, 0); }
    if (sheet && m && m.frames) {
      const h = (m.frame_h / 2) * cam.zoom * s;
      const f = m.frames > 1 ? Math.floor(((st && st.walked) || 0) / 14) % m.frames : 0;
      ctx.drawImage(sheet, f * m.frame_w, 0, m.frame_w, m.frame_h, gx - w / 2, gy - h - lift, w, h);
    } else {
      const img = Assets.img(`fauna_${species}`);
      if (img) ctx.drawImage(img, gx - w / 2, gy - w - lift, w, w * (img.height / img.width));
    }
    ctx.restore();
  }

  drawFauna(ctx, dt) {
    const cam = this.cam;
    for (const [k, a] of this.isl.fauna) {
      const st = this.wanderPos(k, a, dt);
      const moving = Math.hypot(st.tx - st.x, st.ty - st.y) > 1;
      const g = cam.toScreen(st.x, st.y + FAUNA_GROUND);
      let s = 1, alpha = 1;
      const an = this.fx.faunaAnim.get(k);
      if (an) { const t = Math.min(1, an.t / 0.8); s = an.kind === 'arrive' ? 0.3 + 0.7 * easeOutCubic(t) * (1 + 0.25 * Math.sin(t * Math.PI)) : 1 - t; alpha = an.kind === 'arrive' ? 1 : 1 - t; }
      // une espèce qui a un vrai cycle de marche porte déjà son mouvement : on ne la fait pas sauter
      // en plus (ses sabots resteraient en l'air). Les autres avancent par petits bonds.
      const sheet = (Assets.manifest().images || {})[`fauna_${a.species}_side`];
      const walks = !!(sheet && sheet.cycle === 'walk');
      const lift = moving && !walks ? Math.abs(Math.sin(st.hop)) * 5 * cam.zoom
        : (walks ? 0 : (Math.sin(this.time * 2.2 + a.q * 1.7 + a.r) + 1) * 0.8 * cam.zoom);
      this.drawAnimal(ctx, a.species, st, g.x, g.y, lift, s, alpha);
    }
    // départs en cours
    for (const [k, an] of this.fx.faunaAnim) {
      if (an.kind !== 'leave' || this.isl.fauna.has(k)) continue;
      const info = an.info; if (!info) continue;
      const w = toWorld(info.q, info.r); const g = cam.toScreen(w.x, w.y + FAUNA_GROUND);
      const t = Math.min(1, an.t / 0.8);
      this.drawAnimal(ctx, info.species, null, g.x, g.y, t * 40 * cam.zoom, 1, 1 - t);
    }
  }

  drawTexts(ctx) {
    const cam = this.cam;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.fx.texts) {
      const k = t.t / t.life; const c = cam.toScreen(t.x, t.y);
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `700 ${Math.round(t.size * clamp(cam.zoom, 0.8, 1.3))}px Quicksand, sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.strokeText(t.text, c.x, c.y - k * 50);
      ctx.fillStyle = t.color; ctx.fillText(t.text, c.x, c.y - k * 50);
    }
    ctx.restore();
  }

  /** Étincelles de points : de la tuile (monde) vers le compteur (écran), en arc, avec une courte traîne. */
  drawFlights(ctx) {
    const fx = this.fx; if (!fx.flights.length) return;
    const tgt = fx.flightTarget || { x: STAGE.W - 120, y: 40 }; const cam = this.cam;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of fx.flights) {
      if (f.t < 0) continue;
      // temps de départ : l'étincelle naît sur sa tuile, s'élève un peu et reste posée avec son « +N » ; puis elle part
      const hv = Math.min(1, f.t / f.hover); const fl = Math.max(0, (f.t - f.hover) / (f.life - f.hover));
      const k = Math.min(1, fl); const e = k * k * (3 - 2 * k);   // départ doux, arrivée franche
      const s0 = cam.toScreen(f.x, f.y); s0.y -= 14 * (1 - (1 - hv) * (1 - hv)); const cx = (s0.x + tgt.x) / 2, cy = Math.min(s0.y, tgt.y) - 90;
      const at = (u) => ({ x: (1 - u) * (1 - u) * s0.x + 2 * (1 - u) * u * cx + u * u * tgt.x, y: (1 - u) * (1 - u) * s0.y + 2 * (1 - u) * u * cy + u * u * tgt.y });
      const p = at(e);
      if (f.done) {   // éclat à l'arrivée
        const a = 1 - (f.t - f.life) / 0.25; ctx.globalAlpha = Math.max(0, a) * 0.8; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 6 + (1 - a) * 22, 0, TAU); ctx.fill(); continue;
      }
      if (k > 0) for (let i = 6; i >= 1; i--) { const q = at(Math.max(0, e - i * 0.04)); ctx.globalAlpha = 0.38 - i * 0.055; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(q.x, q.y, 6 - i * 0.7, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; const rad = 12 + Math.min(6, Math.abs(f.pts)); const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad); g.addColorStop(0, '#fffdf2'); g.addColorStop(0.4, f.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, TAU); ctx.fill();
      if (k < 0.75) { ctx.globalAlpha = Math.min(1, hv * 2) * (1 - Math.max(0, k - 0.45) / 0.3); ctx.font = '800 18px Quicksand, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.strokeText(`${f.pts > 0 ? '+' : ''}${f.pts}`, p.x, p.y - 20); ctx.fillStyle = f.color; ctx.fillText(`${f.pts > 0 ? '+' : ''}${f.pts}`, p.x, p.y - 20); }
    }
    ctx.restore();
  }

  drawTransition(ctx) {
    const tr = this.transition; if (!tr) return;
    const p = tr.t / 1.6;
    const sweep = -200 + p * (STAGE.W + 400);
    const cols = { spring: '#bfe8a8', summer: '#ffe9a8', autumn: '#f2c08a', winter: '#eef4fa' };
    ctx.save();
    const g = ctx.createLinearGradient(sweep - 160, 0, sweep + 40, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, cols[tr.to] || '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.75 * (1 - Math.max(0, p - 0.9) * 10);
    ctx.fillStyle = g; ctx.fillRect(sweep - 160, 0, 200, STAGE.H);
    ctx.restore();
  }
}
