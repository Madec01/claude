// Les 12 îles de la campagne, l'Île infinie et le Jardin. Les masques sont générés de façon déterministe (seed).
import { RNG } from '../core/math.js';
import { neighbors, key, parse, hexDist, DIRS } from '../game/hex.js';

/**
 * Génère un masque d'île : croissance aléatoire depuis le centre, avec baies et éventuels lacs (trous).
 * @returns {Set<string>} clés "q,r"
 */
/**
 * `etire` : le rapport hauteur/largeur visé (1 = île ronde ; 1,4 = plus haute que large, pour un écran en portrait).
 * `forme` : une forme d'île qui change la façon de jouer (docs/PISTES_FORMES.md, voir FORMES plus bas), appliquée
 *   après la croissance et les trous. Ce qu'elle creuse devient la mer et ne repousse jamais ; la croissance reprend
 *   ailleurs pour rendre le nombre de cases demandé — sauf les lagunes, qui restent des cases de l'île (de l'eau
 *   posée au départ, comme les trous). Prototypes : aucune île de la campagne ne passe encore par là.
 */
export function generateMask(seed, cells, { roughness = 0.35, holes = 0, etire = 1, isthme = false, garde = [], forme = null } = {}) {
  if (forme && FORMES[forme] && FORMES[forme].etire && etire === 1) etire = FORMES[forme].etire;   // la longue côte (2,6), le haricot, la goutte… : une île plus haute que large
  const ex = Math.sqrt(etire), ey = 1 / ex;
  const rng = new RNG(seed);
  const mask = new Set([key(0, 0)]);
  const frontier = new Map();
  // ce qu'une forme a creusé ne repousse pas : un ensemble de cases, et parfois une règle sur tout le plan (`admis`)
  const interdit = new Set(); let admis = null;
  const permis = (q, r) => !interdit.has(key(q, r)) && (!admis || admis(q, r));
  const addFrontier = (q, r) => { for (const [nq, nr] of neighbors(q, r)) { const k = key(nq, nr); if (!mask.has(k) && !frontier.has(k) && permis(nq, nr)) frontier.set(k, { q: nq, r: nr, w: rng.next() }); } };
  const ctx = { mask, garde: new Set(garde), cells, interdit, regle: (fn) => { admis = fn; } };
  // une forme qui se décrit avant de pousser (l'étoile) : la croissance se fait dedans, les bras poussent d'un même pas
  if (forme && FORMES[forme] && FORMES[forme].avant) FORMES[forme].avant(ctx);
  addFrontier(0, 0);
  const croitre = (n) => {
    while (mask.size < n && frontier.size) {
      // choisir une case de la frontière en favorisant celles proches du centre (compacité) mais avec du bruit
      let best = null, bestScore = -Infinity;
      for (const f of frontier.values()) {
        const d = Math.hypot((f.q + f.r / 2) * ex, f.r * 0.866 * ey);
        const n = neighbors(f.q, f.r).filter(([a, b]) => mask.has(key(a, b))).length;
        if (n === 0 || !permis(f.q, f.r)) { frontier.delete(key(f.q, f.r)); continue; }   // orpheline ou interdite depuis qu'une forme a creusé (jamais avant)
        const score = -d * (1 - roughness) + n * 0.6 + f.w * roughness * 4;
        if (score > bestScore) { bestScore = score; best = f; }
      }
      if (!best) break;
      frontier.delete(key(best.q, best.r));
      mask.add(key(best.q, best.r));
      addFrontier(best.q, best.r);
    }
  };
  croitre(cells);
  // trous (lacs intérieurs = mer intérieure)
  const list = [...mask];
  for (let h = 0; h < holes; h++) {
    const k = list[Math.floor(rng.next() * list.length)];
    const [q, r] = k.split(',').map(Number);
    if (q === 0 && r === 0) continue;
    if (neighbors(q, r).every(([a, b]) => mask.has(key(a, b)))) mask.delete(k);
  }
  if (isthme) creuserIsthme(mask, garde);
  if (forme && FORMES[forme] && FORMES[forme].masque) {
    for (const k of list) if (!mask.has(k)) interdit.add(k);   // les trous déjà creusés ne repoussent pas non plus
    // reprendre la croissance jusqu'à n cases : la frontière est relue depuis tout le masque (la forme l'a changé)
    ctx.croitre = (n) => { for (const k of mask) { const [q, r] = parse(k); addFrontier(q, r); } croitre(n); };
    FORMES[forme].masque(ctx);
  }
  return mask;
}

/**
 * Le « passage étroit » (feuille Histoire, J-M) : deux terres reliées par deux cases. On retire une bande verticale
 * d'une case de large (deux demi-colonnes de la grille), à droite du centre pour épargner les tuiles de départ, et
 * l'on garde deux cases voisines qui font le pont — une dans chaque demi-colonne, sinon rien ne se toucherait.
 * Les cases retirées deviennent la mer : un bras d'eau, un gué.
 */
function creuserIsthme(mask, garde = []) {
  const cellules = [...mask].map((k) => { const [q, r] = k.split(',').map(Number); return { k, q, r, x: q + r / 2, y: r }; });
  const interdit = new Set(garde);
  const xs = cellules.map((c) => c.x).sort((a, b) => a - b); const med = Math.round(xs[Math.floor(xs.length / 2)]);
  // la bande : celle qui partage l'île le plus également, chaque terre gardant au moins huit cases ; une tuile de départ
  // qui s'y trouve (le hameau) reste et devient le gué lui-même
  let choix = null;
  for (const x0 of [med, med - 1, med + 1, med - 2, med + 2, med - 3, med + 3]) {
    const bande = cellules.filter((c) => c.x >= x0 && c.x < x0 + 1);
    const gauche = cellules.filter((c) => c.x < x0).length, droite = cellules.filter((c) => c.x >= x0 + 1).length;
    if (bande.length < 4 || gauche < 8 || droite < 8) continue;
    const ecart = Math.abs(gauche - droite); if (!choix || ecart < choix.ecart) choix = { x0, bande, ecart };
  }
  if (!choix) return;   // l'île est trop petite ou trop biscornue : on la laisse entière
  const { x0, bande } = choix;
  // le pont : une case de la demi-colonne x0 proche de l'axe, et une voisine de la demi-colonne x0 + 0,5
  const axe = bande.filter((c) => c.x === x0).sort((a, b) => (interdit.has(b.k) - interdit.has(a.k)) || (Math.abs(a.y) - Math.abs(b.y)));   // la tuile de départ d'abord, puis la plus proche de l'axe
  let pont = null;
  for (const a of axe) { const b = neighbors(a.q, a.r).map(([q, r]) => key(q, r)).find((k) => mask.has(k) && bande.some((c) => c.k === k && c.x === x0 + 0.5)); if (b) { pont = [a.k, b]; break; } }
  if (!pont) return;
  for (const c of bande) if (!pont.includes(c.k) && !interdit.has(c.k)) mask.delete(c.k);
}

// ---------------------------------------------------------------------------------------------------------------
// Des formes d'îles qui changent la façon de jouer (docs/PISTES_FORMES.md). Prototypes : rien dans la campagne n'y
// passe. Une forme a deux faces possibles : `masque(ctx)` creuse le masque après la croissance (l'archipel, l'anneau…),
// `departs(mask, garde)` donne des tuiles de départ à ajouter à `def.start` (la crête de roches, le plateau de
// collines…) — une signature les pousserait dans la définition. Les fonctions de géométrie ci-dessous travaillent en
// « demi-colonnes » : x = q + r / 2 (la colonne, en largeur de case), y = r (la ligne).
// ---------------------------------------------------------------------------------------------------------------

const coord = (k) => { const [q, r] = parse(k); return { k, q, r, x: q + r / 2, y: r }; };
const cellules = (mask) => [...mask].map(coord);
const etendue = (cs) => { const xs = cs.map((c) => c.x), ys = cs.map((c) => c.y); const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys); return { xmin, xmax, ymin, ymax, cx: (xmin + xmax) / 2, cy: (ymin + ymax) / 2, R: (xmax - xmin) / 2, H: ymax - ymin }; };

/** Les morceaux d'un masque (composantes connexes), du plus grand au plus petit. */
export function composantes(mask) {
  const vu = new Set(), out = [];
  for (const start of mask) {
    if (vu.has(start)) continue;
    const comp = new Set([start]); const pile = [start]; vu.add(start);
    while (pile.length) { const [q, r] = parse(pile.pop()); for (const [a, b] of neighbors(q, r)) { const k = key(a, b); if (mask.has(k) && !vu.has(k)) { vu.add(k); comp.add(k); pile.push(k); } } }
    out.push(comp);
  }
  return out.sort((a, b) => b.size - a.size);
}

/**
 * Rend l'île d'un seul tenant en ajoutant le moins de cases possible : depuis le plus grand morceau, le plus court
 * chemin par la mer vers un autre morceau, dont les cases redeviennent terre (un gué). Répété tant qu'il y a des morceaux.
 * @returns {string[]} les cases ajoutées
 */
export function relier(mask, interdit = null) {
  const ajoutees = [];
  for (let tour = 0; tour < 32; tour++) {
    const comps = composantes(mask); if (comps.length <= 1) break;
    const principal = comps[0]; const autres = new Set(); for (let i = 1; i < comps.length; i++) for (const k of comps[i]) autres.add(k);
    const prev = new Map(); const file = []; for (const k of principal) { prev.set(k, null); file.push(k); }
    let atteint = null;
    while (file.length && !atteint) {
      const k = file.shift(); const [q, r] = parse(k);
      for (const [a, b] of neighbors(q, r)) { const nk = key(a, b); if (prev.has(nk)) continue; prev.set(nk, k); if (autres.has(nk)) { atteint = nk; break; } if (!mask.has(nk)) file.push(nk); }
    }
    if (!atteint) break;
    for (let k = prev.get(atteint); k && !principal.has(k); k = prev.get(k)) { mask.add(k); ajoutees.push(k); if (interdit) interdit.delete(k); }
  }
  return ajoutees;
}

/** Distance de chaque case à la mer (1 = sur la côte). */
function profondeur(mask) {
  const prof = new Map(); const file = [];
  for (const k of mask) { const [q, r] = parse(k); if (neighbors(q, r).some(([a, b]) => !mask.has(key(a, b)))) { prof.set(k, 1); file.push(k); } }
  while (file.length) { const k = file.shift(); const d = prof.get(k); const [q, r] = parse(k); for (const [a, b] of neighbors(q, r)) { const nk = key(a, b); if (mask.has(nk) && !prof.has(nk)) { prof.set(nk, d + 1); file.push(nk); } } }
  return prof;
}

/**
 * Creuse : les cases où `mer(c)` est vrai deviennent la mer (les tuiles de départ restent), la règle vaut aussi pour la
 * croissance qui suit, l'île est reliée s'il le faut (gués), puis elle repousse jusqu'au compte demandé.
 */
function sculpter(ctx, mer, ajouts = []) {
  const { mask, garde, interdit } = ctx;
  for (const c of cellules(mask)) if (!garde.has(c.k) && mer(c)) { mask.delete(c.k); interdit.add(c.k); }
  for (const k of ajouts) { mask.add(k); interdit.delete(k); }   // des cases posées d'office (les îlots de la comète), reliées comme le reste
  ctx.regle((q, r) => !mer(coord(key(q, r))));
  ctx.gues = relier(mask, interdit);
  ctx.croitre(ctx.cells);
}

/** La bande verticale d'une case de large qui commence à la demi-colonne entière x0 (deux demi-colonnes, en zigzag). */
const bande = (x0) => (c) => c.x >= x0 && c.x < x0 + 1;
const quantile = (vals, p) => { const s = [...vals].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
/** La demi-colonne entière la plus proche de x dont la bande ne contient aucune tuile de départ (un gué doit être une case libre). */
function bandeLibre(x, cs, garde) {
  for (const dx of [0, 1, -1, 2, -2]) { const x0 = Math.round(x) + dx; if (!cs.some((c) => bande(x0)(c) && garde.has(c.k))) return x0; }
  return Math.round(x);
}

/** Le point le plus enfoncé dans les terres dont tout le disque de rayon `rayon` tient dans l'île, loin des tuiles de départ. */
function coeur(mask, garde, rayon, marge = 1) {
  // les trous cernés sont des mares, pas la mer : ils ne creusent pas la profondeur
  const plein = new Set(mask); for (const h of enclosedHoles(mask)) plein.add(key(h.q, h.r));
  const prof = profondeur(plein); let best = null;
  for (const k of mask) {
    const [q, r] = parse(k); const p = prof.get(k) || 0;
    if (p < rayon + marge) continue;
    let ok = true; for (const g of garde) { const [gq, gr] = parse(g); if (hexDist(q, r, gq, gr) <= rayon) { ok = false; break; } }
    if (!ok) continue;
    const d = hexDist(q, r, 0, 0);
    if (!best || p > best.p || (p === best.p && d < best.d)) best = { q, r, p, d };
  }
  return best;
}
const disque = (q0, r0, rayon) => { const out = []; for (let q = -rayon; q <= rayon; q++) for (let r = Math.max(-rayon, -q - rayon); r <= Math.min(rayon, -q + rayon); r++) out.push(key(q0 + q, r0 + r)); return out; };

/** Les cases de la côte (un voisin dans la mer), dans l'ordre de l'angle autour du centre. */
const cote = (mask) => cellules(mask).filter((c) => neighbors(c.q, c.r).some(([a, b]) => !mask.has(key(a, b)))).sort((a, b) => Math.atan2(a.y * 0.866, a.x) - Math.atan2(b.y * 0.866, b.x));

// --- outils des vingt formes de plus (« Vingt formes de plus » dans docs/PISTES_FORMES.md)

/** Parmi plusieurs façons de creuser (`{ mer }`), la première qui n'emporte aucune tuile de départ — sinon celle qui en emporte le moins. */
function sansDepart(garde, options) {
  let best = null;
  for (const o of options) { const n = [...garde].filter((k) => o.mer(coord(k))).length; if (!best || n < best.n) best = { o, n }; if (n === 0) break; }
  return best ? best.o : options[0];
}
/** Pour une forme décrite avant la croissance : une tuile de départ tombée hors de la forme rejoint l'île (un gué), puis l'île repousse au compte. */
function finir(ctx) { combler(ctx); for (const g of ctx.garde) ctx.mask.add(g); ctx.gues = relier(ctx.mask, ctx.interdit); ctx.croitre(ctx.cells); }
/** Comble les trous de départ (les mares de `holes`) : une forme étrange a des couloirs trop fins pour en garder. Au moment où une forme creuse, `interdit` ne contient qu'eux. */
function combler(ctx) { for (const k of [...ctx.interdit]) { ctx.mask.add(k); ctx.interdit.delete(k); } }
/** Ramène l'île au compte en retirant des cases de la côte, les plus loin du centre d'abord, sans la couper, sans toucher un départ ni une case à `eviter`. */
function rogner(ctx, n, eviter = () => false) {
  const { mask, garde, interdit } = ctx;
  while (mask.size > n) {
    const cs = cellules(mask).filter((c) => !garde.has(c.k) && !eviter(c) && neighbors(c.q, c.r).some(([a, b]) => !mask.has(key(a, b)))).sort((a, b) => loin(b, 0, 0) - loin(a, 0, 0) || (a.k < b.k ? -1 : 1));
    let fait = false;
    for (const c of cs) { mask.delete(c.k); if (composantes(mask).length === 1) { interdit.add(c.k); fait = true; break; } mask.add(c.k); }
    if (!fait) break;
  }
}
/** Les coordonnées ramenées à l'étendue de l'île : u, v dans [−1, 1] sur l'île ronde, rho la distance au centre, th l'angle. */
const polaire = (e) => (c) => { const u = (c.x - e.cx) / (e.R || 1), v = (c.y - e.cy) / (e.H / 2 || 1); return { u, v, rho: Math.hypot(u, v), th: Math.atan2(v, u) }; };
/** La distance « monde » (largeur de case = 1) entre une case et un point. */
const loin = (c, x, y) => Math.hypot(c.x - x, (c.y - y) * 0.866);
/** Le départ que l'anneau demande : le hameau et la roche sur la couronne (« Un lac au milieu » les déplace de même). */
const DEPART_ANNEAU = [{ q: 3, r: -1, family: 'hamlet' }, { q: -3, r: 2, family: 'rock' }];
/** Le départ de l'ourlet : à 3,5 cases du centre, sur la couronne fine quelle que soit la taille (vérifié de 50 à 150 cases). */
const DEPART_OURLET = [{ q: 4, r: -2, family: 'hamlet' }, { q: -4, r: 2, family: 'rock' }];
/** Le départ de l'atoll : le hameau et la roche sur l'îlot central (sept cases autour de l'origine). */
const DEPART_ATOLL = [{ q: 0, r: 0, family: 'hamlet' }, { q: 1, r: -1, family: 'rock' }];
/**
 * Une couronne fine (2 cases sous 70, 3 sous 105, 4 au-delà) autour d'une mer intérieure, centrée sur l'origine ; avec `ilot`,
 * un îlot de sept cases reste au milieu (relié par un gué). Le rayon vient de l'aire : une case vaut 0,866 en unités monde.
 */
function couronneFine(ctx, ilot) {
  combler(ctx); const n = ctx.cells; const t = n < 70 ? 2 : n < 105 ? 3 : 4; const R0 = (0.276 * n + t * t) / (2 * t);   // au-delà de 105 cases, trois d'épaisseur mettrait le départ dans le lac
  sculpter(ctx, (c) => { const rho = loin(c, 0, 0); if (ilot && rho <= 1.05) return false; return rho < R0 - t || rho >= R0 + 0.3; });
}

/**
 * Les formes. `nom` et `intention` sont ce que l'écran de départ dirait ; `masque` creuse ; `departs` pose ; `famille` range
 * (douce : naturelle, pour la campagne ; construite : une situation ; étrange : le mode où l'île change à chaque partie) ;
 * `difficulte` est mesurée au robot fort contre l'île ronde de même taille, moyenne sur 60, 78 et 100 cases, trois hasards
 * (`node tools/mesure_formes.js difficulte`) : aucune à ±5 %, légère jusqu'à 15 %, forte au-delà. `depart` : les tuiles de
 * départ que la forme demande à la place des tuiles de l'île (le hameau sur la couronne). `etire` : le rapport hauteur/largeur.
 * Les chiffres (largeur des bras, rayon du lac, densité des lagunes) viennent des croquis de docs/PISTES_FORMES.md.
 */
export const FORMES = {
  /** Trois îlots reliés par un gué d'une case : trois petits plans, et ce qu'on pose sur un gué compte pour deux. */
  archipel: { famille: 'construite', difficulte: 'aucune', nom: 'L’archipel', intention: 'Ici, on apprend à finir petit : trois îlots, trois plans, et un gué qui engage les deux rives.',
    masque(ctx) {
      const cs = cellules(ctx.mask); const xs = cs.map((c) => c.x);
      const xa = bandeLibre(quantile(xs, 0.3), cs, ctx.garde); let xb = bandeLibre(quantile(xs, 0.7), cs, ctx.garde); if (xb - xa < 3) xb = bandeLibre(xa + 3, cs, ctx.garde);
      sculpter(ctx, (c) => bande(xa)(c) || bande(xb)(c));
    } },
  /** Un chapelet : quatre lobes sur un fil, des cols de deux cases. Le passage étroit répété. */
  chapelet: { famille: 'construite', difficulte: 'aucune', nom: 'Le chapelet', intention: 'Ici, on apprend à traverser : chaque col est une porte, et une région qui la franchit ne se ferme plus.',
    masque(ctx) {
      const cs = cellules(ctx.mask); const { xmin, xmax } = etendue(cs); const n = ctx.cells >= 90 ? 4 : 3; const pas = (xmax - xmin) / n;
      const cols = []; for (let i = 1; i < n; i++) cols.push(bandeLibre(xmin + i * pas, cs, ctx.garde));
      const ymed = quantile(cs.map((c) => c.y), 0.5);
      // la bande est creusée sauf deux cases au milieu de la hauteur : le col
      sculpter(ctx, (c) => cols.some((x0) => bande(x0)(c) && (c.y < ymed || c.y > ymed + 1)));
    } },
  /** Un lac au milieu, qui reste la mer : tout se bâtit sur la couronne, et l'eau a deux mers où se jeter. */
  anneau: { famille: 'construite', difficulte: 'légère', depart: DEPART_ANNEAU, nom: 'L’anneau', intention: 'Ici, on apprend à bâtir sur une couronne : deux mers, des régions courtes, des embouchures partout.',
    masque(ctx) {
      const rayon = ctx.cells >= 56 ? 2 : 1;
      let c = coeur(ctx.mask, ctx.garde, rayon); if (!c && rayon > 1) c = coeur(ctx.mask, ctx.garde, 1);
      if (!c) return;   // l'île est trop petite ou ses tuiles de départ trop au centre : elle reste pleine
      const lac = new Set(disque(c.q, c.r, c.p >= rayon + 1 ? rayon : 1));
      sculpter(ctx, (x) => lac.has(x.k));
    } },
  /** Une grande baie à l'ouest : l'île est un C, tout est côte, le tour est long. */
  croissant: { famille: 'douce', difficulte: 'légère', nom: 'Le croissant', intention: 'Ici, on apprend à jouer le long d’une côte : peu d’intérieur, une baie qui reçoit toutes les rivières.',
    masque(ctx) {
      const e = etendue(cellules(ctx.mask)); const bx = e.cx - 0.95 * e.R, by = e.cy, br = 0.72 * e.R;
      sculpter(ctx, (c) => Math.hypot(c.x - bx, (c.y - by) * 0.866) <= br);
    } },
  /** Deux échancrures profondes, l'une du nord, l'autre du sud : l'île serpente. */
  baies: { famille: 'douce', difficulte: 'aucune', nom: 'Les deux baies', intention: 'Ici, on apprend à serpenter : deux baies se croisent, et tout chemin fait le tour.',
    masque(ctx) {
      const cs = cellules(ctx.mask); const e = etendue(cs); const xa = bandeLibre(e.cx - e.R / 2, cs, ctx.garde), xb = bandeLibre(e.cx + e.R / 2, cs, ctx.garde);
      const nord = e.ymin + 0.62 * e.H, sud = e.ymax - 0.62 * e.H;
      const large = (x0) => (c) => c.x >= x0 && c.x < x0 + 1.5;   // une baie et demie de large : ça se voit
      sculpter(ctx, (c) => (large(xa)(c) && c.y <= nord) || (large(xb)(c) && c.y >= sud));
    } },
  /** La longue côte : une île bien plus longue que large (voir `etire`, réglé à 2,6 dans generateMask). */
  cote: { famille: 'douce', difficulte: 'aucune', nom: 'La longue côte', intention: 'Ici, on apprend à finir une rivière : la mer n’est jamais loin, l’intérieur est un couloir.', etire: 2.6, masque: null },
  /** Des mares de départ sur un réseau régulier (une case sur sept, à l'intérieur) : l'eau est déjà là, partout. */
  lagunes: { famille: 'construite', difficulte: 'légère', nom: 'Le damier de lagunes', intention: 'Ici, on apprend à composer avec l’eau qui est déjà là : chaque mare touche tout ce qu’on pose.',
    masque(ctx) {
      const { mask, garde, interdit } = ctx;
      const interieur = (k) => { const [q, r] = parse(k); return neighbors(q, r).every(([a, b]) => mask.has(key(a, b))); };
      // le réseau en fleur (une case sur sept, jamais deux voisines) ; sept décalages possibles, on garde le plus fourni
      let best = [];
      for (let phase = 0; phase < 7; phase++) {
        const pts = [...mask].filter((k) => { const [q, r] = parse(k); return ((3 * q + r + phase) % 7 + 7) % 7 === 0 && !garde.has(k) && interieur(k); });
        if (pts.length > best.length) best = pts;
      }
      for (const k of best) { mask.delete(k); interdit.add(k); }   // pas de repousse : la lagune reste une case de l'île (eau posée)
    } },
  /** Trois bras autour d'un cœur : trois fronts à tenir depuis un seul centre. */
  etoile: { famille: 'construite', difficulte: 'aucune', nom: 'L’étoile', intention: 'Ici, on apprend à tenir trois fronts : chaque bras est un couloir, le cœur les relie.',
    avant(ctx) {
      // trois bras le long des directions de la grille (est, nord-ouest, sud-ouest) : des couloirs droits de quatre à cinq cases,
      // décrits avant la croissance pour qu'ils poussent d'un même pas depuis le cœur
      const bras = [0, 2 * Math.PI / 3, -2 * Math.PI / 3];
      ctx.regle((q, r) => {
        const x = q + r / 2, y = r * 0.866; const rho = Math.hypot(x, y); if (rho <= 2.4) return true;
        const th = Math.atan2(y, x);
        return bras.some((b) => Math.cos(th - b) > 0 && Math.abs(rho * Math.sin(th - b)) <= 2.3);
      });
    } },
  /** Une arête de roches du nord jusqu'aux deux tiers : deux versants, un col au sud, des sources partout. */
  crete: { famille: 'construite', difficulte: 'aucune', nom: 'La crête', intention: 'Ici, on apprend à faire naître l’eau d’une montagne : deux versants, un col, des rivières des deux côtés.',
    departs(mask, garde) {
      const cs = cellules(mask); const g = new Set(garde); const med = Math.round(quantile(cs.map((c) => c.x), 0.5));
      const { ymin, H } = etendue(cs);
      let choix = null;
      for (const x0 of [med + 2, med - 2, med + 3, med - 3, med + 1, med - 1]) {
        const b = cs.filter(bande(x0)); if (b.length < 4 || b.some((c) => g.has(c.k))) continue;
        const gauche = cs.filter((c) => c.x < x0).length, droite = cs.filter((c) => c.x >= x0 + 1).length;
        if (gauche < Math.max(6, cs.length * 0.12) || droite < Math.max(6, cs.length * 0.12)) continue;
        const ecart = Math.abs(gauche - droite); if (!choix || ecart < choix.ecart) choix = { b, ecart };
      }
      if (!choix) return [];
      return choix.b.filter((c) => c.y <= ymin + 0.7 * H).map((c) => ({ q: c.q, r: c.r, family: 'rock' }));
    } },
  /** Sept collines en fleur au plus profond de l'île : un plateau d'où l'eau descend vers toutes les côtes. */
  plateau: { famille: 'construite', difficulte: 'légère', nom: 'Le plateau', intention: 'Ici, on apprend à descendre du plateau : les collines sont la source, et les chevaux paissent en dessous.',
    departs(mask, garde) {
      const c = coeur(mask, garde, 1, 1); if (!c) return [];
      return disque(c.q, c.r, 1).map((k) => { const [q, r] = parse(k); return { q, r, family: 'hill' }; });
    } },
  /** Des roches sur la côte, une toutes les trois cases : l'eau ne naît qu'au bord, et le centre n'a que des lacs. */
  cuvette: { famille: 'construite', difficulte: 'légère', nom: 'La cuvette', intention: 'Ici, on apprend à garder l’eau : les sources sont au bord, le centre ne connaît que les lacs.',
    departs(mask, garde) {
      const g = new Set(garde); const pris = [];
      for (const c of cote(mask)) { if (g.has(c.k) || neighbors(c.q, c.r).some(([a, b]) => g.has(key(a, b)))) continue; if (pris.every((p) => hexDist(p.q, p.r, c.q, c.r) >= 3)) pris.push(c); }
      return pris.map((c) => ({ q: c.q, r: c.r, family: 'rock' }));
    } },

  // ------------------------------------------------------------------------------------------------------------
  // Dix formes douces : des îles plus naturelles pour la campagne, qui ne changent pas le score du robot fort.
  // ------------------------------------------------------------------------------------------------------------

  /** Une seule baie, profonde et étroite, du nord ou du sud : une ellipse posée sur le bord, ouverte sur le large. */
  baie: { famille: 'douce', difficulte: 'aucune', nom: 'La baie', intention: 'Ici, on apprend à bâtir autour d’une baie : une seule échancrure, profonde, et toutes les rivières y descendent.',
    masque(ctx) {
      const e = etendue(cellules(ctx.mask)); const a = 0.42 * e.R, b = 0.85 * e.H / 2;
      const options = [];
      for (const sud of [true, false]) for (const dx of [0.2, -0.2]) {
        const bx = e.cx + dx * e.R, by = sud ? e.ymax + 0.4 : e.ymin - 0.4;
        options.push({ mer: (c) => { const u = (c.x - bx) / a, v = (c.y - by) / b; return u * u + v * v <= 1 || ((sud ? c.y > by : c.y < by) && Math.abs(c.x - bx) <= a); } });
      }
      sculpter(ctx, sansDepart(ctx.garde, options).mer);
    } },
  /** Un bras de mer étroit qui entre d'un côté et passe le centre : deux rangées à l'entrée, une seule au fond. */
  fjord: { famille: 'douce', difficulte: 'aucune', nom: 'Le fjord', intention: 'Ici, on apprend à vivre des deux rives : un bras de mer entre au cœur de l’île, et chaque rive a sa côte.',
    masque(ctx) {
      const e = etendue(cellules(ctx.mask)); const options = [];
      for (const dy of [-0.3, -0.2, 0.2, 0.3]) for (const ouest of [true, false]) {
        const y0 = Math.round(e.cy + dy * e.H); const fond = e.cx + (ouest ? 0.12 : -0.12) * e.R, fond2 = e.cx + (ouest ? -0.3 : 0.3) * e.R;
        const avant = (x, lim) => (ouest ? x <= lim : x >= lim);
        options.push({ mer: (c) => (c.y === y0 && avant(c.x, fond)) || (c.y === y0 + 1 && avant(c.x, fond2)) });
      }
      sculpter(ctx, sansDepart(ctx.garde, options).mer);
    } },
  /** Un lac de sept cases (neuf à partir de 90) au plus profond de l'île, qui reste la mer : une mer intérieure, pas une mare. */
  lac: { famille: 'douce', difficulte: 'aucune', nom: 'Le grand lac', intention: 'Ici, on apprend à tourner autour d’un lac : une seconde mer au milieu, et des embouchures des deux côtés.',
    masque(ctx) {
      const c = coeur(ctx.mask, ctx.garde, 1, 1); if (!c) return;   // l'île est trop petite ou ses départs trop au centre : elle reste pleine
      const lac = new Set(disque(c.q, c.r, 1));
      if (ctx.cells >= 90 && c.p >= 3) { lac.add(key(c.q + 2, c.r)); lac.add(key(c.q + 2, c.r - 1)); }
      sculpter(ctx, (x) => lac.has(x.k));
    } },
  /** Une côte découpée d'un côté : trois anses entre des caps, le tour de l'île s'allonge sans que l'intérieur change. */
  anses: { famille: 'douce', difficulte: 'aucune', nom: 'La côte découpée', intention: 'Ici, on apprend à finir contre la mer : trois anses ferment les régions du bord, les caps reçoivent les rivières.',
    masque(ctx) {
      const e = etendue(cellules(ctx.mask)); const pol = polaire(e);
      const options = [0, Math.PI].map((th0) => ({ mer: (c) => { const p = pol(c); const face = Math.cos(p.th - th0); if (face < 0.25) return false; const f = 0.5 + 0.5 * Math.cos(6 * (p.th - th0) + Math.PI); return p.rho > 0.66 + 0.46 * f; } }));
      sculpter(ctx, sansDepart(ctx.garde, options).mer);
    } },
  /** Un lobe d'un tiers de l'île, relié par un col de trois cases : le passage étroit en plus doux. */
  presquile: { famille: 'douce', difficulte: 'aucune', nom: 'La presqu’île', intention: 'Ici, on apprend à tenir un col : la presqu’île est un plan à part, et trois cases la relient.',
    masque(ctx) {
      const cs = cellules(ctx.mask); const xs = cs.map((c) => c.x); const ymed = Math.round(quantile(cs.map((c) => c.y), 0.5));
      const options = [0.3, 0.7].map((p) => { const x0 = bandeLibre(quantile(xs, p), cs, ctx.garde); return { mer: (c) => bande(x0)(c) && Math.abs(c.y - ymed) > 1 }; });
      sculpter(ctx, sansDepart(ctx.garde, options).mer);
    } },
  /** Une pointe qui se divise en deux langues de terre : un V de mer qui entre par le sud (ou le nord). */
  delta: { famille: 'douce', difficulte: 'aucune', nom: 'Le delta', intention: 'Ici, on apprend à choisir une langue de terre : deux pointes, une mer entre elles, et rien ne passe de l’une à l’autre.',
    masque(ctx) {
      const e = etendue(cellules(ctx.mask)); const options = [];
      for (const sud of [true, false]) for (const dx of [0, 0.25, -0.25]) {
        const x0 = e.cx + dx * e.R, y0 = e.cy + (sud ? 0.05 : -0.05) * e.H;
        options.push({ mer: (c) => { const d = sud ? c.y - y0 : y0 - c.y; return d >= 0 && Math.abs(c.x - x0) <= 0.3 + 0.45 * d; } });
      }
      sculpter(ctx, sansDepart(ctx.garde, options).mer);
    } },
  /** Le haricot : une île plus haute que large, creusée d'une baie large et peu profonde sur un flanc. */
  haricot: { famille: 'douce', difficulte: 'aucune', etire: 1.35, nom: 'Le haricot', intention: 'Ici, on apprend à jouer en longueur : deux lobes, un creux entre eux, et la mer qui suit la courbe.',
    masque(ctx) {
      const e = etendue(cellules(ctx.mask)); const pol = polaire(e);
      const options = [0, Math.PI].map((th0) => ({ mer: (c) => { const p = pol(c); const face = Math.cos(p.th - th0); return face >= 0.35 && p.rho > 1.02 - 0.42 * Math.pow(face, 1.5); } }));
      sculpter(ctx, sansDepart(ctx.garde, options).mer);
    } },
  /** La goutte : un bout fin (deux ou trois cases), un bout large et rond, plus haute que large. */
  goutte: { famille: 'douce', difficulte: 'aucune', etire: 1.3, nom: 'La goutte', intention: 'Ici, on apprend à finir une pointe : le bout fin se ferme vite, le bout large prend son temps.',
    masque(ctx) {
      const e = etendue(cellules(ctx.mask));
      const options = [true, false].map((nord) => ({ mer: (c) => { const t = nord ? (c.y - e.ymin) / e.H : (e.ymax - c.y) / e.H; if (t < -0.15) return true; if (t > 0.72) return false; return Math.abs(c.x - e.cx) > e.R * (0.34 + 0.95 * Math.max(0, t)); } }));
      sculpter(ctx, sansDepart(ctx.garde, options).mer);
    } },
  /** L'île double : deux lobes de tailles différentes (42 / 58) reliés par un col large, deux baies qui se font face. */
  double: { famille: 'douce', difficulte: 'aucune', nom: 'L’île double', intention: 'Ici, on apprend à partager : deux lobes inégaux, un col large entre deux baies, et chaque lobe a ses plans.',
    masque(ctx) {
      const cs = cellules(ctx.mask); const e = etendue(cs); const xs = cs.map((c) => c.x); const rr = 0.4 * e.R;
      const options = [0.42, 0.58].map((p) => { const x0 = quantile(xs, p); return { mer: (c) => loin(c, x0, e.ymin - 0.3) <= rr || loin(c, x0, e.ymax + 0.3) <= rr || (Math.abs(c.x - x0) <= rr && (c.y < e.ymin || c.y > e.ymax)) }; });
      sculpter(ctx, sansDepart(ctx.garde, options).mer);
    } },
  /** La lagune ouverte : un lac de sept cases près du bord, relié au large par une passe d'une case. */
  lagune: { famille: 'douce', difficulte: 'aucune', nom: 'La lagune', intention: 'Ici, on apprend à garder une passe : la lagune est une mer calme, et une seule case la relie au large.',
    masque(ctx) {
      const e = etendue(cellules(ctx.mask)); const k = Math.max(2, Math.round(0.5 * e.R));
      const options = DIRS.map(([dq, dr]) => {
        const cq = dq * k, cr = dr * k; const lac = new Set(disque(cq, cr, 1));
        const passe = (c) => { const a = c.q - cq, b = c.r - cr; if (a * dr !== b * dq) return false; const m = dq ? a / dq : b / dr; return m >= 2; };
        return { dedans: [...lac].every((x) => ctx.mask.has(x)), mer: (c) => lac.has(c.k) || passe(c) };
      });
      const bonnes = options.filter((o) => o.dedans);
      sculpter(ctx, sansDepart(ctx.garde, bonnes.length ? bonnes : options).mer);
    } },

  // ------------------------------------------------------------------------------------------------------------
  // Dix formes étranges : jouables, surprenantes — pour le mode où l'île change de forme à chaque partie.
  // ------------------------------------------------------------------------------------------------------------

  /** La spirale : un bras de terre de trois cases qui s'enroule depuis le cœur, une rangée de mer entre les tours. */
  spirale: { famille: 'etrange', difficulte: 'aucune', nom: 'La spirale', intention: 'Ici, on apprend à suivre un seul chemin : l’île s’enroule, et chaque région n’a qu’un sens pour grandir.',
    avant(ctx) {
      const L = 2.9, S = 1.1, p = L + S;   // un bras de trois cases : à 2,4 le robot perdait 45 % sur 60 cases
      ctx.regle((q, r) => { const x = q + r / 2, y = r * 0.866; const rho = Math.hypot(x, y); if (rho <= 1.6) return true; const v = rho - p * Math.atan2(y, x) / (2 * Math.PI); return ((v % p) + p) % p < L; });
    },
    masque(ctx) { finir(ctx); } },
  /** Le labyrinthe : des bras de mer d'une rangée qui entrent tour à tour de l'ouest et de l'est ; la terre serpente entre eux. */
  labyrinthe: { famille: 'etrange', difficulte: 'légère', etire: 1.4, nom: 'Le labyrinthe', intention: 'Ici, on apprend à serpenter jusqu’au bout : les bras de mer se croisent, et l’île n’est qu’un couloir replié.',
    masque(ctx) {
      combler(ctx); const e = etendue(cellules(ctx.mask)); const options = [];
      for (const y0 of [1, 2, 3]) for (const pair of [true, false]) options.push({ mer: (c) => {
        const d = c.y - y0; if (((d % 3) + 3) % 3 !== 0) return false;
        const ouest = (((d / 3) % 2) + 2) % 2 === 0 ? pair : !pair;
        return ouest ? c.x <= e.cx + 0.3 * e.R : c.x >= e.cx - 0.3 * e.R;
      } });
      sculpter(ctx, sansDepart(ctx.garde, options).mer);
    } },
  /** Les jumelles : la moitié nord, ramenée à la moitié du compte, et son reflet au sud d'un détroit d'une rangée ; un gué les relie. */
  jumelles: { famille: 'etrange', difficulte: 'aucune', nom: 'Les jumelles', intention: 'Ici, on apprend à jouer deux fois la même île : deux jumelles en miroir, un gué, et deux plans qui se répondent.',
    masque(ctx) {
      combler(ctx); const { mask, garde, interdit, cells } = ctx;
      const y0 = Math.max(1, ...[...garde].map((k) => coord(k).y + 1));   // la rangée du détroit, sous toutes les tuiles de départ
      for (const c of cellules(mask)) if (c.y >= y0) { mask.delete(c.k); interdit.add(c.k); }
      ctx.regle((q, r) => r < y0);
      const cible = Math.floor((cells - 1) / 2);   // deux moitiés et un gué font le compte
      if (mask.size < cible) ctx.croitre(cible);
      else {   // trop de nord : les cases les plus loin de son centre partent, jamais un départ
        const cs = cellules(mask); const gx = cs.reduce((s, c) => s + c.x, 0) / cs.length, gy = cs.reduce((s, c) => s + c.y, 0) / cs.length;
        cs.sort((a, b) => loin(b, gx, gy) - loin(a, gx, gy));
        for (const c of cs) { if (mask.size <= cible) break; if (garde.has(c.k)) continue; mask.delete(c.k); interdit.add(c.k); }
      }
      for (const c of cellules(mask)) { const k = key(c.q + c.r - y0, 2 * y0 - c.r); mask.add(k); interdit.delete(k); }   // le reflet : r' = 2·y0 − r, même colonne x
      ctx.regle(() => false);   // rien ne repousse : les jumelles restent jumelles
      ctx.gues = relier(mask, interdit);
    } },
  /** Le trou de serrure : un lac de sept cases au plus profond, et une fente d'une case qui descend jusqu'à la mer du sud. */
  serrure: { famille: 'etrange', difficulte: 'aucune', nom: 'Le trou de serrure', intention: 'Ici, on apprend à contourner : le lac et sa fente coupent le sud en deux, tout passe par le nord.',
    masque(ctx) {
      combler(ctx); const c = coeur(ctx.mask, ctx.garde, 1, 1); if (!c) return;
      const lac = new Set(disque(c.q, c.r, 1));
      const options = [c.q - 1, c.q, c.q - 2].map((a) => { const x0 = Math.floor(a + (c.r + 2) / 2); return { mer: (x) => lac.has(x.k) || (bande(x0)(x) && x.y >= c.r + 2) }; });
      sculpter(ctx, sansDepart(ctx.garde, options).mer);
    } },
  /** La comète : une tête ronde et une queue de trois îlots (quatre à partir de 90) de sept cases, une rangée de mer et un gué d'une case entre deux. */
  comete: { famille: 'etrange', difficulte: 'aucune', nom: 'La comète', intention: 'Ici, on apprend à finir petit et loin : la tête est une île, chaque îlot de la queue un plan de sept cases.',
    masque(ctx) {
      combler(ctx); const cs = cellules(ctx.mask); const e = etendue(cs); const k = ctx.cells >= 90 ? 4 : 3; const cible = Math.max(12, ctx.cells - 8 * k);
      const options = [1, -1].map((s) => {   // la queue vers le sud (s = 1) ou le nord ; la tête est décalée à l'opposé
        const hx = e.cx, hy = e.cy - s * 0.12 * e.H;
        const ds = cs.map((c) => loin(c, hx, hy)).sort((a, b) => a - b); const Rh = ds[Math.min(ds.length - 1, cible - 1)] + 0.01;
        const bord = s > 0 ? Math.floor(hy + Rh / 0.866) : Math.ceil(hy - Rh / 0.866);   // la dernière rangée de la tête du côté de la queue
        const ilots = []; let cr = bord + 3 * s, cq = Math.round(hx - cr / 2);
        for (let i = 0; i < k; i++) { ilots.push(...disque(cq, cr, 1)); cq -= 2 * s; cr += 4 * s; }   // à quatre cases d'écart : une rangée de mer entre deux îlots, en colonne droite
        const set = new Set(ilots);
        return { ilots, mer: (c) => !set.has(c.k) && loin(c, hx, hy) > Rh };
      });
      const o = sansDepart(ctx.garde, options);
      sculpter(ctx, o.mer, o.ilots);
    } },
  /** La vrille : un S serré, une bande de terre de quatre cases qui ondule sur quatorze rangées. */
  vrille: { famille: 'etrange', difficulte: 'légère', nom: 'La vrille', intention: 'Ici, on apprend à ne jamais couper court : l’île ondule, et le chemin d’un bout à l’autre fait toute la courbe.',
    avant(ctx) {
      const A = 2.4, P = 14, w = 2.0; const g = [...ctx.garde].map(coord);
      const dedans = (y0) => (c) => Math.abs(c.x - A * Math.sin(2 * Math.PI * (c.y - y0) / P)) <= w;
      let best = null;   // la phase qui garde le plus de tuiles de départ dans la bande, l'origine toujours
      for (let y0 = 0; y0 < P; y0++) { const d = dedans(y0); if (!d({ x: 0, y: 0 })) continue; const n = g.filter(d).length; if (!best || n > best.n) best = { y0, n }; }
      const d = dedans(best ? best.y0 : 0);
      ctx.regle((q, r) => d({ x: q + r / 2, y: r }));
    },
    masque(ctx) { finir(ctx); } },
  /** L'île percée : dix lacs de deux cases, jamais deux voisins, jamais sur la côte ; ils restent la mer (deux cases ne font pas une mare). */
  percee: { famille: 'etrange', difficulte: 'légère', nom: 'L’île aux dix lacs', intention: 'Ici, on apprend à composer avec dix mers : chaque lac ferme ce qui le touche et reçoit une rivière.',
    masque(ctx) {
      combler(ctx); ctx.croitre(ctx.cells + 20);   // l'île pousse d'abord de ce que les lacs vont lui prendre : dix lacs tiennent même sur 50 cases
      const { mask, garde } = ctx; const prof = profondeur(mask); const lacs = new Set();
      const libre = (q, r) => { if (garde.has(key(q, r))) return false; for (const k of lacs) { const [a, b] = parse(k); if (hexDist(q, r, a, b) < 2) return false; } return true; };
      const cand = cellules(mask).filter((c) => (prof.get(c.k) || 0) >= 2).sort((a, b) => hexDist(a.q, a.r, 0, 0) - hexDist(b.q, b.r, 0, 0) || (a.k < b.k ? -1 : 1));
      for (const c of cand) {
        if (lacs.size >= 20 || !libre(c.q, c.r)) continue;
        const v = neighbors(c.q, c.r).map(([a, b]) => key(a, b)).find((k) => mask.has(k) && (prof.get(k) || 0) >= 2 && libre(...parse(k)));
        if (v) { lacs.add(c.k); lacs.add(v); }
      }
      sculpter(ctx, (c) => lacs.has(c.k));
      rogner(ctx, ctx.cells, (c) => neighbors(c.q, c.r).some(([a, b]) => lacs.has(key(a, b))));   // ce qui a poussé en trop repart par la côte, jamais la rive d'un lac
    } },
  /** L'ourlet : l'île n'est qu'une côte, une couronne de deux cases (trois à partir de 70, quatre de 105) autour d'une mer intérieure. */
  ourlet: { famille: 'etrange', difficulte: 'légère', depart: DEPART_OURLET, nom: 'L’ourlet', intention: 'Ici, on apprend à n’avoir que la côte : deux mers de chaque côté, et pas une case qui ne les touche.',
    masque(ctx) { couronneFine(ctx, false); } },
  /** Le peigne : une barre de deux à trois cases et des dents de deux rangées, une rangée de mer entre chaque. */
  peigne: { famille: 'etrange', difficulte: 'légère', nom: 'Le peigne', intention: 'Ici, on apprend à finir dent par dent : chaque dent est un couloir fermé par la mer, la barre les relie.',
    avant(ctx) {
      const L = ctx.cells >= 90 ? 6.5 : ctx.cells >= 70 ? 5.5 : 4.5; const xs = -2;
      ctx.regle((q, r) => { const x = q + r / 2; if (Math.abs(x - xs) <= 1) return true; const d = (((r + 1) % 3) + 3) % 3; return d !== 2 && x >= xs && x <= xs + L; });
    },
    masque(ctx) { finir(ctx); } },
  /** L'atoll : la même couronne fine, et un îlot de sept cases au milieu de la mer intérieure, relié par un gué. */
  atoll: { famille: 'etrange', difficulte: 'légère', depart: DEPART_ATOLL, nom: 'L’atoll', intention: 'Ici, on apprend à partir d’un îlot : sept cases au milieu d’une mer calme, un gué, et la couronne tout autour.',
    masque(ctx) { couronneFine(ctx, true); } },
};

/** Tuiles de départ qu'une forme ajoute (crête, plateau, cuvette) ; vide pour les formes qui ne creusent que le masque. */
export function departsDeForme(forme, mask, garde = []) { const f = FORMES[forme]; return f && f.departs ? f.departs(mask, garde) : []; }

/**
 * Les trous cernés par six cases de l'île — les « lagunes » du journal 21, à ne pas confondre avec la fusion
 * sable + eau qui porte le même nom. `generateMask` les creuse et le rendu les peint comme des étangs : ce
 * sont donc de VRAIES tuiles d'eau, posées au départ comme le hameau ou la roche, et non une « mer
 * intérieure » qui ne rapporte rien (pépin G6HX : un marais posé contre la mare ne donnait aucun point).
 * Une seule passe suffit : un trou voisin d'un autre trou n'en est pas un (il a un voisin hors masque), donc
 * combler les trous ne peut jamais en créer de nouveaux.
 * @returns {Array<{q:number,r:number}>}
 */
export function enclosedHoles(mask) {
  const out = [], seen = new Set();
  for (const k of mask) {
    const [q, r] = k.split(',').map(Number);
    for (const [a, b] of neighbors(q, r)) {
      const hk = key(a, b);
      if (mask.has(hk) || seen.has(hk)) continue;
      seen.add(hk);
      if (neighbors(a, b).every(([x, y]) => mask.has(key(x, y)))) out.push({ q: a, r: b });
    }
  }
  return out;
}

const W = {
  gentle:  { meadow: 22, forest: 20, field: 12, hamlet: 10, orchard: 8, water: 12, marsh: 5, rock: 7, sand: 4 },
  rivers:  { meadow: 18, forest: 16, field: 10, hamlet: 10, orchard: 6, water: 20, marsh: 8, rock: 8, sand: 4 },
  farms:   { meadow: 18, forest: 12, field: 18, hamlet: 14, orchard: 12, water: 10, marsh: 4, rock: 6, sand: 6 },
  wild:    { meadow: 16, forest: 24, field: 6, hamlet: 8, orchard: 6, water: 12, marsh: 10, rock: 12, sand: 6 },
  coast:   { meadow: 16, forest: 12, field: 10, hamlet: 12, orchard: 8, water: 16, marsh: 8, rock: 6, sand: 12 },
  balanced:{ meadow: 16, forest: 16, field: 12, hamlet: 12, orchard: 10, water: 14, marsh: 7, rock: 8, sand: 5 },
  hills:   { meadow: 14, forest: 16, field: 8, hamlet: 10, orchard: 8, water: 12, marsh: 5, rock: 10, sand: 3, hill: 12 },
  ridges:  { meadow: 14, forest: 20, field: 6, hamlet: 8, orchard: 6, water: 12, marsh: 8, rock: 10, sand: 4, hill: 10 },
  moor:    { meadow: 14, forest: 12, field: 8, hamlet: 10, orchard: 6, water: 12, marsh: 6, rock: 8, sand: 5, hill: 8, heath: 12 },
  moorFarm:{ meadow: 14, forest: 10, field: 14, hamlet: 12, orchard: 8, water: 12, marsh: 4, rock: 6, sand: 4, hill: 6, heath: 10 },
  coastAll:{ meadow: 14, forest: 10, field: 8, hamlet: 12, orchard: 8, water: 16, marsh: 6, rock: 6, sand: 10, hill: 6, heath: 8 },
  all:     { meadow: 14, forest: 14, field: 10, hamlet: 12, orchard: 8, water: 13, marsh: 6, rock: 8, sand: 5, hill: 8, heath: 8 },
};

// starFactors : seuils d'étoiles en points par case (55 / 80 / 100 % de la médiane du bot fort, voir tools/calibrate.js).
export const ISLANDS = [
  { id: 1,  arch: 1, cells: 30, starFactors: [2.5, 3.6, 4.5], seed: 1101, roughness: 0.2, holes: 0, seasonLength: 6, startSeason: 'spring', weights: W.gentle, tilesRatio: 0.95, opening: ['meadow', 'forest', 'field', 'hamlet', 'water', 'field', 'orchard', 'meadow', 'forest'], ensure: [[1, 0], [2, 0], [-1, 0], [-1, 1], [1, -1], [0, 1], [1, 1]], guided: true, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 2, r: -1, family: 'rock' }], wishes: [], mechanics: ['affinity', 'close', 'season'], music: 'spring' },
  { id: 2,  arch: 1, cells: 36, starFactors: [3.1, 4.5, 5.6], seed: 1202, roughness: 0.3, holes: 0, seasonLength: 7, startSeason: 'spring', weights: W.rivers, tilesRatio: 0.95, opening: ['water', 'meadow', 'water'], start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -2, r: 1, family: 'rock' }, { q: 2, r: 1, family: 'rock' }], mechanics: ['river', 'wish'],
    wishes: [ { id: 'w2_1', type: 'river', minLen: 3, deadline: { placements: 26 } } ] },
  { id: 3,  arch: 1, cells: 42, starFactors: [3.2, 4.6, 5.8], seed: 1303, roughness: 0.3, holes: 0, seasonLength: 8, startSeason: 'spring', weights: W.farms, tilesRatio: 0.95, opening: ['field', 'meadow', 'hamlet'], start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 1, r: -2, family: 'rock' }], mechanics: ['breath'],
    wishes: [ { id: 'w3_1', type: 'pairs', a: 'field', b: 'hamlet', count: 2, deadline: { placements: 26 } }, { id: 'w3_2', type: 'closed', family: 'meadow', size: 3, deadline: { placements: 38 } } ] },
  { id: 4,  arch: 1, cells: 48, starFactors: [2.8, 4.0, 5.0], seed: 1404, roughness: 0.35, holes: 0, seasonLength: 9, startSeason: 'spring', weights: W.wild, tilesRatio: 0.95, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -2, r: 0, family: 'rock' }, { q: 2, r: -2, family: 'rock' }, { q: 1, r: 2, family: 'ruins' }], mechanics: ['fauna'],
    wishes: [ { id: 'w4_1', type: 'fauna', species: 'rabbit', deadline: { placements: 30 } }, { id: 'w4_2', type: 'region', family: 'forest', size: 4, deadline: { placements: 42 } } ] },
  { id: 5,  arch: 2, cells: 54, starFactors: [3.0, 4.4, 5.5], seed: 2505, roughness: 0.35, holes: 1, seasonLength: 10, startSeason: 'spring', weights: W.rivers, tilesRatio: 0.93, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -3, r: 1, family: 'rock' }, { q: 2, r: -2, family: 'rock' }], mechanics: [],
    wishes: [ { id: 'w5_1', type: 'region', family: 'forest', size: 6, deadline: { placements: 36 } }, { id: 'w5_2', type: 'river', minLen: 2, mouth: true, deadline: { placements: 40 } }, { id: 'w5_3', type: 'fauna', species: 'rabbit', deadline: { placements: 36 } } ] },
  { id: 6,  arch: 2, cells: 60, starFactors: [3.1, 4.5, 5.6], seed: 2606, roughness: 0.4, holes: 1, seasonLength: 10, startSeason: 'summer', weights: W.farms, tilesRatio: 0.93, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 3, r: 0, family: 'hamlet' }, { q: -2, r: 2, family: 'rock' }], mechanics: ['rare', 'build'],
    wishes: [ { id: 'w6_1', type: 'pairs', a: 'field', b: 'hamlet', count: 3, deadline: { placements: 30 } }, { id: 'w6_2', type: 'closed', family: 'meadow', size: 4, deadline: { placements: 44 } }, { id: 'w6_3', type: 'fauna', species: 'duck', deadline: { placements: 40 } } ] },
  { id: 7,  arch: 2, cells: 66, starFactors: [4.0, 5.8, 7.2], seed: 2707, roughness: 0.4, holes: 2, seasonLength: 10, startSeason: 'spring', weights: W.hills, tilesRatio: 0.92, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -3, r: 0, family: 'rock' }, { q: 2, r: 2, family: 'ruins' }], mechanics: ['hill'],
    wishes: [ { id: 'w7_1', type: 'pairs', a: 'orchard', b: 'hamlet', count: 3, deadline: { season: 'autumn' } }, { id: 'w7_2', type: 'lake', size: 5, deadline: { placements: 40 } }, { id: 'w7_3', type: 'fauna', species: 'frog', deadline: { placements: 50 } } ] },
  { id: 8,  arch: 2, cells: 72, starFactors: [4.3, 6.2, 7.8], seed: 2808, roughness: 0.45, holes: 2, seasonLength: 9, startSeason: 'autumn', weights: W.ridges, tilesRatio: 0.92, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -4, r: 2, family: 'hamlet' }, { q: 3, r: -3, family: 'rock' }, { q: 1, r: 3, family: 'rock' }], mechanics: ['fuse'],
    wishes: [ { id: 'w8_1', type: 'fauna', species: 'moose', deadline: { placements: 45 } }, { id: 'w8_2', type: 'veillee', pairs: 1, deadline: { season: 'spring' } }, { id: 'w8_3', type: 'closed', size: 6, deadline: { placements: 60 } }, { id: 'w8_4', type: 'fusion', recipe: 'fort', deadline: { placements: 64 } } ] },
  { id: 9,  arch: 3, cells: 84, starFactors: [4.2, 6.2, 7.7], seed: 3909, roughness: 0.45, holes: 2, seasonLength: 9, startSeason: 'spring', weights: W.moor, tilesRatio: 0.9, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -4, r: 1, family: 'rock' }, { q: 4, r: -2, family: 'rock' }, { q: 2, r: 3, family: 'rock' }, { q: -2, r: -2, family: 'ruins' }], mechanics: ['heath'],
    wishes: [ { id: 'w9_1', type: 'fauna', species: 'bear', deadline: { placements: 50 } }, { id: 'w9_2', type: 'river', minLen: 8, mouth: true, deadline: { placements: 70 } }, { id: 'w9_3', type: 'bourg', count: 3, deadline: { placements: 76 } } ] },
  { id: 10, arch: 3, cells: 96, starFactors: [5.1, 7.5, 9.3], seed: 3010, roughness: 0.5, holes: 3, seasonLength: 9, startSeason: 'summer', weights: W.moorFarm, tilesRatio: 0.9, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 5, r: -1, family: 'hamlet' }, { q: -3, r: 3, family: 'rock' }, { q: -1, r: -4, family: 'rock' }], mechanics: ['build3'],
    wishes: [ { id: 'w10_1', type: 'fauna', species: 'chicken', deadline: { placements: 50 } }, { id: 'w10_2', type: 'irrigated', count: 3, deadline: { season: 'autumn' } }, { id: 'w10_3', type: 'bloom', count: 4, deadline: { season: 'summer', cycle: 2 } }, { id: 'w10_4', type: 'fusion', recipe: 'cave', deadline: { placements: 86 } } ] },
  { id: 11, arch: 3, cells: 108, starFactors: [5.1, 7.4, 9.2], seed: 3111, roughness: 0.5, holes: 3, seasonLength: 8, startSeason: 'autumn', weights: W.coastAll, tilesRatio: 0.9, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -5, r: 2, family: 'rock' }, { q: 4, r: 1, family: 'rock' }, { q: 0, r: -4, family: 'ruins' }, { q: 3, r: -4, family: 'hamlet' }], mechanics: [],
    wishes: [ { id: 'w11_1', type: 'fauna', species: 'penguin', deadline: { season: 'spring' } }, { id: 'w11_2', type: 'harvest', count: 4, deadline: { placements: 80 } }, { id: 'w11_3', type: 'closed', family: 'forest', size: 10, deadline: { placements: 96 } } ] },
  { id: 12, arch: 3, cells: 120, starFactors: [6.1, 8.8, 11.1], seed: 3212, roughness: 0.5, holes: 4, seasonLength: 8, startSeason: 'spring', weights: W.all, tilesRatio: 0.9, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: -6, r: 3, family: 'rock' }, { q: 5, r: -3, family: 'rock' }, { q: 3, r: 3, family: 'rock' }, { q: -3, r: -3, family: 'rock' }, { q: 6, r: 0, family: 'hamlet' }, { q: -4, r: 0, family: 'ruins' }], mechanics: [], finale: true,
    wishes: [ { id: 'w12_1', type: 'species', count: 6, deadline: { placements: 90 } }, { id: 'w12_2', type: 'rivers', count: 2, deadline: { placements: 80 } }, { id: 'w12_3', type: 'closedInSeason', count: 3, deadline: { placements: 108 } }, { id: 'w12_4', type: 'fusion', recipe: 'falls', deadline: { placements: 110 } } ] },
];

export const getIsland = (id) => ISLANDS.find((i) => i.id === id);
export const WEIGHTS = W;

export const INFINITE = { id: 'infinite', arch: 3, cells: 40, seed: 7777, roughness: 0.45, holes: 1, seasonLength: 10, startSeason: 'spring', weights: W.all, tilesRatio: Infinity, start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 3, r: -1, family: 'rock' }], wishes: [], mechanics: [], infinite: true };
export const GARDEN = { id: 'garden', arch: 1, cells: 80, seed: 4242, roughness: 0.4, holes: 2, seasonLength: 14, startSeason: 'spring', weights: W.all, tilesRatio: Infinity, start: [{ q: 0, r: 0, family: 'hamlet' }], wishes: [], mechanics: [], garden: true };
