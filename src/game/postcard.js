// Carte postale : l'île finie rendue en pleine résolution sur un canvas hors écran, dans un cadre papier avec son nom, la saison,
// les étoiles, le score et la date. Téléchargeable (PNG) et partageable sur téléphone quand le navigateur le permet.
import { STAGE } from '../core/stage.js';
import { Camera } from './camera.js';
import { STORY } from '../data/story.js';
import { CHAPTERS } from '../data/campaign.js';
import { BALANCE } from '../data/balance.js';

const PAPER = '#fbf7ee', INK = '#2b2a26', GOLD = '#e0a33a';

/** Rend l'île de `scene` (IslandScene) sur un canvas `w`×`h` et l'habille. Retourne le canvas. */
export function renderPostcard(scene, { w = 1600, h = 1000 } = {}) {
  const isl = scene.isl, def = scene.def, r = scene.renderer;
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h; const ctx = cvs.getContext('2d');
  const frame = 36, top = 118, bottom = 128;
  // 1. l'île, cadrée dans la fenêtre du cadre (la scène logique est temporairement de la taille de la carte)
  const W0 = STAGE.W, H0 = STAGE.H; STAGE.W = w; STAGE.H = h;
  // le zoom maximal de jeu ne s'applique pas à la carte : l'île remplit le cadre
  const cam = new Camera(); const zmax = BALANCE.camera.maxZoom; BALANCE.camera.maxZoom = 3; try { cam.fit(isl.board.mask, { uiLeft: frame, uiRight: frame, uiTop: top, uiBottom: bottom, padding: 70, immediate: true }); } finally { BALANCE.camera.maxZoom = zmax; }
  const saved = { cam: r.cam, transition: r.transition, weather: r.weather, hover: r.hover, flash: r.flash, nu: r.nu, _nu0: r._nu0 };
  r.cam = cam; r.transition = null; r.weather = null; r.hover = null; r.flash = 0;
  // L'île nue : ni grille des cases jamais posées, ni écume contournant le vide. La carte est une
  // image fixe, donc pas de fondu à attendre — on antidate son départ pour qu'elle soit nue d'emblée.
  r.nu = true; r._nu0 = r.time - 10;
  try { r.render(ctx, 1, 0); } finally { Object.assign(r, saved); STAGE.W = W0; STAGE.H = H0; }
  // 2. le cadre papier : bandeau haut et bas, liseré, vignette douce
  ctx.save();
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75); vg.addColorStop(0, 'rgba(255,250,240,0)'); vg.addColorStop(1, 'rgba(120,100,70,0.28)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, top); ctx.fillRect(0, h - bottom, w, bottom); ctx.fillRect(0, 0, frame, h); ctx.fillRect(w - frame, 0, frame, h);
  ctx.strokeStyle = 'rgba(43,42,38,0.18)'; ctx.lineWidth = 2; ctx.strokeRect(frame + 0.5, top + 0.5, w - frame * 2 - 1, h - top - bottom - 1);
  ctx.strokeStyle = 'rgba(43,42,38,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(14.5, 14.5, w - 29, h - 29);
  // 3. les textes
  const s = STORY.seasons[isl.season] || { name: isl.season };
  const ch = def.chapter ? CHAPTERS[def.chapter - 1] : null;
  const kicker = def.infinite ? `Île infinie · ${isl.seasonsPassed.length} saisons` : def.garden ? 'Jardin' : def.daily ? 'Île du jour' : ch ? `Chapitre ${ch.id} · ${ch.name} · île ${def.id}` : `Île ${def.id}`;
  const climate = isl.climate && isl.climate.id !== 'temperate' && STORY.climates && STORY.climates[isl.climate.id] ? ` · ${STORY.climates[isl.climate.id].name}` : '';
  ctx.fillStyle = INK; ctx.textBaseline = 'alphabetic';
  ctx.font = '600 20px Quicksand, sans-serif'; ctx.globalAlpha = 0.65; ctx.fillText((kicker + climate).toUpperCase().replace(/ /g, '  '), frame + 10, 48);
  ctx.globalAlpha = 1; ctx.font = '500 52px Lora, Georgia, serif'; ctx.fillText(scene.title || def.name || 'Île', frame + 8, 98);
  // étoiles à droite
  const res = isl.result; const stars = res ? res.stars : 0; const gold = !!(res && res.gold);
  ctx.textAlign = 'right'; ctx.font = '48px Quicksand, sans-serif';
  let x = w - frame - 12; for (let i = 2; i >= 0; i--) { ctx.fillStyle = i < stars ? GOLD : 'rgba(43,42,38,0.14)'; ctx.fillText('★', x, 78); x -= 56; }
  if (gold) { ctx.fillStyle = GOLD; ctx.font = '600 18px Quicksand, sans-serif'; ctx.fillText('ÉTOILE D’OR', w - frame - 12, 104); }
  // bas : score, saison, date, marque
  ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.font = '700 40px Quicksand, sans-serif'; ctx.fillText(`${isl.score} points`, frame + 10, h - bottom + 58);
  ctx.font = 'italic 22px Lora, Georgia, serif'; ctx.globalAlpha = 0.75; ctx.fillText(`${s.name}${isl.seasonsPassed.length ? ` · ${isl.seasonsPassed.length + 1}e saison` : ''} · ${isl.board.placed} tuiles${isl.fauna.size ? ` · ${isl.fauna.size} animaux` : ''}`, frame + 10, h - bottom + 94);
  ctx.textAlign = 'right'; ctx.font = '500 20px Quicksand, sans-serif'; ctx.fillText(new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), w - frame - 12, h - bottom + 58);
  ctx.font = 'italic 26px Lora, Georgia, serif'; ctx.globalAlpha = 0.9; ctx.fillText('Cent Saisons', w - frame - 12, h - bottom + 96);
  ctx.restore();
  return cvs;
}

/** Nom de fichier lisible : cent-saisons-ile-08-la-pointe-des-joncs.png */
export function postcardName(scene) {
  const def = scene.def; const slug = (scene.title || def.name || 'ile').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = def.infinite ? 'infinie' : def.garden ? 'jardin' : def.daily ? 'jour' : String(def.id).padStart(2, '0');
  return `cent-saisons-ile-${id}-${slug}.png`;
}
