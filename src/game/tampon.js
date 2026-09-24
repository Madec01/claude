// Les tampons de la carte postale : l'archétype de l'île et, sur l'île-souvenir qui ferme un chapitre, le sceau du
// chapitre. Ce sont les images de tampon fournies par le commanditaire (assets/img/tampons/), posées telles quelles :
// l'encre, le grain et les manques sont dans l'image. Le jeu ne fait que les appliquer, chacune un peu de travers, avec
// un angle et un décalage tirés d'une graine propre à l'île — la même carte retombe toujours de la même façon.
import { archetypeOf } from '../data/archetypes.js';

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
  const a = archetypeOf(isl.board); if (a) out.push({ id: `archetype-${a.id}`, src: `assets/img/tampons/tampon-archetype-${a.id}.png`, nom: a.name });
  // l'île-souvenir ferme son chapitre : la carte en porte le sceau
  if (def.memory && def.chapter && !def.daily) out.push({ id: `chapitre-${def.chapter}`, src: `assets/img/tampons/tampon-chapitre-${def.chapter}.png`, nom: `Chapitre ${def.chapter}` });
  return out;
}

/** Commence à charger les tampons d'une île (appelé dès la fin de partie, pour qu'ils soient prêts au moment de la carte). */
export function prechargerTampons(scene) { for (const t of insignesDe(scene)) charger(t.src); }

const graineDe = (def, n) => { const s = `${def.id}|${def.date || ''}|${n}`; let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/**
 * Tamponne la carte : les tampons de l'île, en bas à droite de la fenêtre, à cheval sur le bandeau, chacun un peu de
 * travers. `g` est la géométrie du cadre (geoCarte), `force` de 0 à 1 fait apparaître l'encre (la tournée finale l'anime).
 */
export function tamponner(ctx, scene, w, h, g, force = 1) {
  if (force <= 0) return;
  const ts = insignesDe(scene); if (!ts.length) return;
  const S = Math.round(200 * g.k);   // hauteur d'un tampon
  ts.forEach((t, n) => {
    const img = charger(t.src); if (!pret(img)) return;
    const rnd = hasard(graineDe(scene.def, n) ^ 0x9e3779b9);
    const sh = S, sw = S * img.naturalWidth / img.naturalHeight;
    const x = w - g.frame - sw * 0.62 - n * sw * 1.02 + (rnd() - 0.5) * 12 * g.k, y = h - g.bottom - sh * 0.3 + (rnd() - 0.5) * 12 * g.k;
    ctx.save(); ctx.translate(x, y); ctx.rotate((rnd() - 0.5) * 0.42);
    ctx.globalAlpha = 0.9 * Math.min(1, force);
    ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  });
}
