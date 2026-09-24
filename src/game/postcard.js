// Carte postale : l'île finie rendue en pleine résolution sur un canvas hors écran, dans un cadre papier avec son nom, la saison,
// les étoiles, le score et la date. Téléchargeable (PNG) et partageable sur téléphone quand le navigateur le permet.
import { STAGE } from '../core/stage.js';
import { Camera } from './camera.js';
import { STORY } from '../data/story.js';
import { CHAPTERS } from '../data/campaign.js';
import { BALANCE } from '../data/balance.js';
import { tamponner } from './tampon.js';

const PAPER = '#fbf7ee', INK = '#2b2a26', GOLD = '#e0a33a';

/**
 * Géométrie du cadre, dérivée de la largeur. À 1600 px (la carte téléchargée) on retrouve exactement
 * les valeurs d'origine — bandeaux de 118 et 128, marge de 36, corps de 52 — et rien ne bouge ; plus
 * petit, tout se réduit d'autant, ce qu'il faut pour que la tournée finale dessine le même cadre à
 * la taille de l'écran, téléphone compris.
 */
export function geoCarte(w) {
  const k = Math.max(0.42, Math.min(1, w / 1600));
  return { k, frame: Math.round(36 * k), top: Math.round(118 * k), bottom: Math.round(128 * k) };
}

/** Le cadrage de l'île dans la fenêtre du cadre : ce que la caméra doit viser pour que la carte tombe juste. */
export function cadreCarte(isl, w, h) {
  const g = geoCarte(w);
  const W0 = STAGE.W, H0 = STAGE.H; STAGE.W = w; STAGE.H = h;
  const cam = new Camera(); const zmax = BALANCE.camera.maxZoom; BALANCE.camera.maxZoom = 3;
  try { cam.fit(isl.board.mask, { uiLeft: g.frame, uiRight: g.frame, uiTop: g.top, uiBottom: g.bottom, padding: 70 * g.k, immediate: true }); }
  finally { BALANCE.camera.maxZoom = zmax; STAGE.W = W0; STAGE.H = H0; }
  return { x: cam.tx, y: cam.ty, z: cam.tzoom, ox: cam.offsetX, oy: cam.offsetY };
}

/**
 * Le papier et les mots : vignette, bandeaux, liseré, titre, étoiles, score et date. Séparé du rendu
 * de l'île pour que la tournée finale puisse fabriquer la carte PAR-DESSUS le paysage vivant, au lieu
 * d'en montrer une image toute faite — les bandeaux glissent (`bandes`), le nom s'écrit (`lettres`) et
 * les étoiles se posent une à une (`etoiles`). À valeurs pleines, c'est la carte téléchargeable.
 */
export function habillerCarte(ctx, scene, w, h, { bandes = 1, lettres = 1, etoiles = null, tampons = Infinity, legendes = false } = {}) {
  const isl = scene.isl, def = scene.def;
  const g = geoCarte(w); const { k, frame, top, bottom } = g;
  const f = (px) => Math.round(px * k);
  const dh = (1 - bandes) * top, db = (1 - bandes) * bottom;   // les bandeaux arrivent en glissant
  ctx.save();
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75); vg.addColorStop(0, 'rgba(255,250,240,0)'); vg.addColorStop(1, `rgba(120,100,70,${(0.28 * bandes).toFixed(3)})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PAPER; ctx.fillRect(0, -dh, w, top); ctx.fillRect(0, h - bottom + db, w, bottom);
  ctx.globalAlpha = bandes; ctx.fillRect(0, 0, frame, h); ctx.fillRect(w - frame, 0, frame, h);
  ctx.strokeStyle = 'rgba(43,42,38,0.18)'; ctx.lineWidth = 2 * k; ctx.strokeRect(frame + 0.5, top + 0.5, w - frame * 2 - 1, h - top - bottom - 1);
  ctx.strokeStyle = 'rgba(43,42,38,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(f(14) + 0.5, f(14) + 0.5, w - f(29), h - f(29));
  ctx.globalAlpha = 1;
  // les textes
  const s = STORY.seasons[isl.season] || { name: isl.season };
  const ch = def.chapter ? CHAPTERS[def.chapter - 1] : null;
  const kicker = def.infinite ? `Île infinie · ${isl.seasonsPassed.length} saisons` : def.garden ? 'Jardin' : def.daily ? 'Île du jour' : ch ? `Chapitre ${ch.id} · ${ch.name} · île ${def.id}` : `Île ${def.id}`;
  const climate = isl.climate && isl.climate.id !== 'temperate' && STORY.climates && STORY.climates[isl.climate.id] ? ` · ${STORY.climates[isl.climate.id].name}` : '';
  ctx.fillStyle = INK; ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${f(20)}px Quicksand, sans-serif`; ctx.globalAlpha = 0.65 * bandes; ctx.fillText((kicker + climate).toUpperCase().replace(/ /g, '  '), frame + f(10), f(48) - dh);
  // le nom s'écrit : on n'en montre que le début, et rien tant que le bandeau n'est pas posé
  const nom = scene.title || def.name || 'Île';
  ctx.globalAlpha = bandes; ctx.font = `500 ${f(52)}px Lora, Georgia, serif`;
  ctx.fillText(lettres >= 1 ? nom : nom.slice(0, Math.ceil(nom.length * Math.max(0, lettres))), frame + f(8), f(98) - dh);
  // étoiles à droite
  const res = isl.result; const stars = res ? res.stars : 0; const gold = !!(res && res.gold);
  const vues = etoiles == null ? stars : Math.min(stars, etoiles);
  ctx.textAlign = 'right'; ctx.font = `${f(48)}px Quicksand, sans-serif`;
  let x = w - frame - f(12); for (let i = 2; i >= 0; i--) { ctx.fillStyle = i < vues ? GOLD : 'rgba(43,42,38,0.14)'; ctx.fillText('★', x, f(78) - dh); x -= f(56); }
  if (gold && vues >= stars) { ctx.fillStyle = GOLD; ctx.font = `600 ${f(18)}px Quicksand, sans-serif`; ctx.fillText('ÉTOILE D’OR', w - frame - f(12), f(104) - dh); }
  // bas : score, saison, date, marque
  ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.font = `700 ${f(40)}px Quicksand, sans-serif`; ctx.fillText(`${isl.score} points`, frame + f(10), h - bottom + f(58) + db);
  ctx.font = `italic ${f(22)}px Lora, Georgia, serif`; ctx.globalAlpha = 0.75 * bandes; ctx.fillText(`${s.name}${isl.seasonsPassed.length ? ` · ${isl.seasonsPassed.length + 1}e saison` : ''} · ${isl.board.placed} tuiles${isl.fauna.size ? ` · ${isl.fauna.size} animaux` : ''}`, frame + f(10), h - bottom + f(94) + db);
  ctx.textAlign = 'right'; ctx.font = `500 ${f(20)}px Quicksand, sans-serif`; ctx.fillText(new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), w - frame - f(12), h - bottom + f(58) + db);
  ctx.font = `italic ${f(26)}px Lora, Georgia, serif`; ctx.globalAlpha = 0.9 * bandes; ctx.fillText('Cent Saisons', w - frame - f(12), h - bottom + f(96) + db);
  ctx.restore();
  // les tampons : l'archétype de l'île, et le sceau du chapitre sur l'île-souvenir ; ils tombent une fois le nom écrit
  if (bandes >= 1) tamponner(ctx, scene, w, h, g, lettres >= 1 ? tampons : 0, { legendes });
}

/** Rend l'île de `scene` (IslandScene) sur un canvas `w`×`h` et l'habille. Retourne le canvas. */
export function renderPostcard(scene, { w = 1600, h = 1000 } = {}) {
  const isl = scene.isl, r = scene.renderer;
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h; const ctx = cvs.getContext('2d');
  const g = geoCarte(w);
  // 1. l'île, cadrée dans la fenêtre du cadre (la scène logique est temporairement de la taille de la carte)
  const W0 = STAGE.W, H0 = STAGE.H; STAGE.W = w; STAGE.H = h;
  // le zoom maximal de jeu ne s'applique pas à la carte : l'île remplit le cadre
  const cam = new Camera(); const zmax = BALANCE.camera.maxZoom; BALANCE.camera.maxZoom = 3; try { cam.fit(isl.board.mask, { uiLeft: g.frame, uiRight: g.frame, uiTop: g.top, uiBottom: g.bottom, padding: 70 * g.k, immediate: true }); } finally { BALANCE.camera.maxZoom = zmax; }
  const saved = { cam: r.cam, transition: r.transition, weather: r.weather, hover: r.hover, flash: r.flash, nu: r.nu, _nu0: r._nu0 };
  r.cam = cam; r.transition = null; r.weather = null; r.hover = null; r.flash = 0;
  // L'île nue : ni grille des cases jamais posées, ni écume contournant le vide. La carte est une
  // image fixe, donc pas de fondu à attendre — on antidate son départ pour qu'elle soit nue d'emblée.
  r.nu = true; r._nu0 = r.time - 10;
  try { r.render(ctx, 1, 0); } finally { Object.assign(r, saved); STAGE.W = W0; STAGE.H = H0; }
  // 2. le papier et les mots
  habillerCarte(ctx, scene, w, h);
  return cvs;
}

/** Nom de fichier lisible : cent-saisons-ile-08-la-pointe-des-joncs.png */
export function postcardName(scene) {
  const def = scene.def; const slug = (scene.title || def.name || 'ile').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = def.infinite ? 'infinie' : def.garden ? 'jardin' : def.daily ? 'jour' : String(def.id).padStart(2, '0');
  return `cent-saisons-ile-${id}-${slug}.png`;
}
