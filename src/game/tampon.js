// Les tampons de la carte postale : l'archétype de l'île et, sur l'île-souvenir qui ferme un chapitre, le sceau du
// chapitre. Ce sont les images de tampon fournies par le commanditaire (assets/img/tampons/), posées telles quelles :
// l'encre, le grain et les manques sont dans l'image. Le jeu ne fait que les appliquer, chacune un peu de travers, avec
// un angle et un décalage tirés d'une graine propre à l'île — la même carte retombe toujours de la même façon.
import { archetypeOf } from '../data/archetypes.js';
import { STORY } from '../data/story.js';
import { CHAPTERS } from '../data/campaign.js';

/** Rythme de la pose : un tampon toutes les ESPACE secondes, chacun tombe en CHUTE secondes. */
export const TAMPON = { espace: 1.4, chute: 0.25 };

const images = new Map();   // chemin → Image (chargée à la demande : les tampons ne pèsent pas sur le démarrage)

function charger(src) {
  if (images.has(src)) return images.get(src);
  if (typeof Image === 'undefined') return null;
  const img = new Image(); img.src = src; images.set(src, img); return img;
}
const pret = (img) => img && img.complete && img.naturalWidth > 0;

/** Générateur pseudo-aléatoire à graine (mulberry32). */
function hasard(graine) {
  let a = graine >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Les tampons que la carte de cette île porte, dans l'ordre où ils se posent. Vide tant que l'île n'est pas finie. */
export function insignesDe(scene) {
  const isl = scene.isl, def = scene.def; if (!isl || !isl.ended || def.garden) return [];
  // appelé à chaque image pendant la tournée : on ne relit les régions que si le plateau a changé
  if (scene._insignes && scene._insignes.v === isl.board.version) return scene._insignes.list;
  const out = []; scene._insignes = { v: isl.board.version, list: out };
  // chaque tampon dit pourquoi il est là : la légende s'écrit à côté quand il tombe, et la région en cause s'illumine
  const a = archetypeOf(isl.board);
  if (a) { const fam = ((STORY.tiles[a.family] || {}).name || a.family).toLowerCase(); out.push({ id: `archetype-${a.id}`, src: `assets/img/tampons/tampon-archetype-${a.id}.png`, nom: a.name, raison: `${a.name} · sa plus grande région : ${fam}, ${a.cells.length} tuile${a.cells.length > 1 ? 's' : ''}`, cells: a.cells }); }
  // l'île-souvenir ferme son chapitre : la carte en porte le sceau
  if (def.memory && def.chapter && !def.daily) { const ch = CHAPTERS[def.chapter - 1]; out.push({ id: `chapitre-${def.chapter}`, src: `assets/img/tampons/tampon-chapitre-${def.chapter}.png`, nom: `Chapitre ${def.chapter}`, raison: `Chapitre ${def.chapter}${ch ? ` · ${ch.name}` : ''} : clos` }); }
  return out;
}

/** Commence à charger les tampons d'une île (appelé dès la fin de partie, pour qu'ils soient prêts au moment de la carte). */
export function prechargerTampons(scene) { for (const t of insignesDe(scene)) charger(t.src); }

const graineDe = (def, n) => { const s = `${def.id}|${def.date || ''}|${n}`; let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** Avancée du tampon n (0 à 1) quand `t` secondes se sont écoulées depuis le premier coup. */
export const chuteDe = (t, n) => Math.min(1, Math.max(0, (t - n * TAMPON.espace) / TAMPON.chute));

/**
 * Tamponne la carte : les tampons de l'île, en bas à droite de la fenêtre, à cheval sur le bandeau, chacun un peu de
 * travers. `g` est la géométrie du cadre (geoCarte). `t` : secondes depuis le premier coup (Infinity : tout est posé,
 * c'est la carte téléchargée). Chaque tampon tombe de plus haut, plus grand, puis se plaque. Avec `legendes`, la
 * tournée finale écrit au-dessus pourquoi chacun est là.
 */
export function tamponner(ctx, scene, w, h, g, t = Infinity, { legendes = false } = {}) {
  if (t <= 0) return;
  const ts = insignesDe(scene); if (!ts.length) return;
  const S = Math.round(200 * g.k);   // hauteur d'un tampon
  const lignes = [];
  ts.forEach((it, n) => {
    const f = chuteDe(t, n); if (f <= 0) return;
    const img = charger(it.src); if (!pret(img)) return;
    const rnd = hasard(graineDe(scene.def, n) ^ 0x9e3779b9);
    const sh = S, sw = S * img.naturalWidth / img.naturalHeight;
    const x = w - g.frame - sw * 0.62 - n * sw * 1.02 + (rnd() - 0.5) * 12 * g.k, y = h - g.bottom - sh * 0.3 + (rnd() - 0.5) * 12 * g.k;
    const e = 1 + 0.45 * (1 - f) * (1 - f);   // la chute : plus grand en l'air, plaqué au contact
    ctx.save(); ctx.translate(x, y); ctx.rotate((rnd() - 0.5) * 0.42); ctx.scale(e, e);
    ctx.globalAlpha = 0.9 * f;
    ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
    if (f >= 1 && it.raison) lignes.push(it.raison);
  });
  if (!legendes || !lignes.length) return;
  // les légendes, au-dessus des tampons, sur une bande de papier : la plus récente en bas, près de son tampon
  const k = g.k, fs = Math.round(22 * k), lh = Math.round(34 * k), xr = w - g.frame - Math.round(14 * k);
  let y = h - g.bottom - S * 0.95;
  ctx.save(); ctx.font = `600 ${fs}px Quicksand, sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = lignes.length - 1; i >= 0; i--) {
    const txt = lignes[i], lw = ctx.measureText(txt).width, px = Math.round(12 * k);
    ctx.fillStyle = 'rgba(251,247,238,0.94)'; ctx.fillRect(xr - lw - px, y - lh / 2, lw + px * 2, lh - 4 * k);
    ctx.fillStyle = '#2f5a3a'; ctx.fillText(txt, xr, y - 1 * k);
    y -= lh;
  }
  ctx.restore();
}
