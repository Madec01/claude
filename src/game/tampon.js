// Les tampons de la carte postale. Les insignes (archétype de l'île, chapitre fermé) sont des images en couleur ;
// au moment de tamponner, le jeu en tire l'empreinte d'un tampon encreur : une seule encre, les aplats sombres et les
// contours gardés, le liseré doré devenu cadre, une pression inégale et un grain où l'encre n'a pas pris. Rien n'est
// dessiné : c'est l'image de l'insigne, filtrée. Chaque île garde son coup de tampon (même angle, même grain) d'une
// carte à l'autre, parce que tout est tiré d'une graine propre à l'île.
import { archetypeOf } from '../data/archetypes.js';

const ENCRE = [138, 46, 31];   // rouge-brun de bureau de poste
const images = new Map();      // chemin → Image (chargée à la demande : les insignes ne pèsent pas sur le démarrage)
const encrees = new Map();     // chemin|graine → canvas encré

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

/** L'empreinte encrée d'un insigne : un canvas de la taille de l'image, transparent hors de l'encre. */
function encrer(img, graine) {
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d', { willReadFrequently: true });
  c.drawImage(img, 0, 0);
  const data = c.getImageData(0, 0, W, H); const p = data.data;
  const lum = new Float32Array(W * H), alpha = new Float32Array(W * H);
  for (let i = 0, j = 0; i < p.length; i += 4, j++) { lum[j] = (0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]) / 255; alpha[j] = p[i + 3] / 255; }
  const rnd = hasard(graine);
  const bord = Math.round(Math.min(W, H) * 0.035);                                   // épaisseur du cadre d'encre
  const angle = rnd() * Math.PI * 2, ca = Math.cos(angle), sa = Math.sin(angle);     // côté où l'on a appuyé plus fort
  const plein = (x, y) => x >= 0 && y >= 0 && x < W && y < H && alpha[y * W + x] > 0.5;
  // deux bruits de valeur : un large (des plages où l'encre a moins pris) et un fin, par grains de trois pixels
  // (un bruit au pixel près faisait une trame d'imprimerie, pas un tampon)
  const grille = (pas) => { const gw = Math.ceil(W / pas) + 2, gh = Math.ceil(H / pas) + 2, v = new Float32Array(gw * gh); for (let k = 0; k < v.length; k++) v[k] = rnd(); return (x, y) => { const fx = x / pas, fy = y / pas, x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0, a = v[y0 * gw + x0], b = v[y0 * gw + x0 + 1], c2 = v[(y0 + 1) * gw + x0], d2 = v[(y0 + 1) * gw + x0 + 1]; return (a * (1 - tx) + b * tx) * (1 - ty) + (c2 * (1 - tx) + d2 * tx) * ty; }; };
  const large = grille(38), fin = grille(3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = y * W + x, i = j * 4; if (alpha[j] < 0.05) { p[i + 3] = 0; continue; }
    // les aplats sombres prennent l'encre, les clairs restent papier ; les contours marquent toujours
    const l = lum[j], dx = x + 1 < W ? Math.abs(l - lum[j + 1]) : 0, dy = y + 1 < H ? Math.abs(l - lum[j + W]) : 0;
    let d = Math.min(1, Math.max(0, (0.62 - l) * 2.4)); d = d > 0.35 ? 0.9 : d * 0.6; d = Math.max(d, Math.min(1, (dx + dy) * 3));
    // le liseré devient le cadre du tampon
    if (!plein(x - bord, y) || !plein(x + bord, y) || !plein(x, y - bord) || !plein(x, y + bord)) d = 1;
    const press = 0.72 + 0.28 * (0.5 + 0.5 * (((x / W - 0.5) * ca + (y / H - 0.5) * sa) * 2));   // un côté plus chargé, l'autre plus pâle
    const plage = Math.min(1, Math.max(0.25, 0.35 + large(x, y) * 0.9));                         // des plages plus pâles
    const manque = fin(x, y) < 0.2 ? 0.15 : 1;                                                    // le grain : l'encre n'a pas pris partout
    p[i] = ENCRE[0]; p[i + 1] = ENCRE[1]; p[i + 2] = ENCRE[2];
    p[i + 3] = Math.round(Math.min(1, d * press * plage * manque * alpha[j]) * 235);
  }
  c.putImageData(data, 0, 0);
  return cv;
}

/** Les insignes que la carte de cette île porte, dans l'ordre où ils se tamponnent. Vide tant que l'île n'est pas finie. */
export function insignesDe(scene) {
  const isl = scene.isl, def = scene.def; if (!isl || !isl.ended || def.garden) return [];
  // appelé à chaque image pendant la tournée : on ne relit les régions que si le plateau a changé
  if (scene._insignes && scene._insignes.v === isl.board.version) return scene._insignes.list;
  const out = []; scene._insignes = { v: isl.board.version, list: out };
  const a = archetypeOf(isl.board); if (a) out.push({ id: `archetype-${a.id}`, src: `assets/img/archetypes/archetype-${a.id}.png`, nom: a.name });
  // l'île-souvenir ferme son chapitre : la carte en porte le sceau
  if (def.memory && def.chapter && !def.daily) out.push({ id: `chapitre-${def.chapter}`, src: `assets/img/chapitres/chapitre-${def.chapter}.png`, nom: `Chapitre ${def.chapter}` });
  return out;
}

/** Commence à charger les insignes d'une île (appelé dès la fin de partie, pour qu'ils soient prêts au moment de la carte). */
export function prechargerTampons(scene) { for (const t of insignesDe(scene)) charger(t.src); }

const graineDe = (def, n) => { const s = `${def.id}|${def.date || ''}|${n}`; let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/**
 * Tamponne la carte : les insignes de l'île, en bas à droite de la fenêtre, à cheval sur le bandeau, chacun un peu de
 * travers. `k` est l'échelle du cadre (geoCarte), `force` de 0 à 1 fait apparaître l'encre (la tournée finale l'anime).
 */
export function tamponner(ctx, scene, w, h, g, force = 1) {
  if (force <= 0) return;
  const ts = insignesDe(scene); if (!ts.length) return;
  const S = Math.round(200 * g.k);   // hauteur d'un tampon
  ts.forEach((t, n) => {
    const img = charger(t.src); if (!pret(img)) return;
    const graine = graineDe(scene.def, n), cle = `${t.src}|${graine}`;
    if (!encrees.has(cle)) encrees.set(cle, encrer(img, graine));
    const cv = encrees.get(cle), rnd = hasard(graine ^ 0x9e3779b9);
    const sh = S, sw = S * cv.width / cv.height;
    const x = w - g.frame - sw * 0.62 - n * sw * 1.02 + (rnd() - 0.5) * 12 * g.k, y = h - g.bottom - sh * 0.3 + (rnd() - 0.5) * 12 * g.k;
    // encre posée par-dessus, pas en « multiply » : sur la mer, la multiplication la virait au violet sombre
    ctx.save(); ctx.translate(x, y); ctx.rotate((rnd() - 0.5) * 0.42);
    ctx.globalAlpha = 0.85 * Math.min(1, force);
    ctx.drawImage(cv, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  });
}
