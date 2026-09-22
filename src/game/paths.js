// Sentiers : ruelles entre hameaux voisins et sentiers automatiques entre deux hameaux séparés par de la terre ouverte.
// Rien n'est posé par le joueur : les chemins se déduisent du plateau et se redessinent à chaque changement.
import { Board } from './board.js';
import { key, parse, neighbors, toWorld, edgeMid, DIRS, SIZE } from './hex.js';

// La colline n'est plus une terre ouverte : depuis qu'elle est un relief en volume (journal 102), un
// sentier qui la traversait passait dedans, ou grimpait dessus comme une rampe — « très bizarre »,
// dit le commanditaire. Le sentier la contourne, ou n'existe pas. (Score recalibré, journal 105.)
const OPEN = new Set(['meadow', 'field', 'orchard', 'heath']);
export const MAX_PATH = 3;   // nombre maximal de tuiles de terre ouverte entre deux hameaux

const isHamlet = (t) => Board.isFamily(t, 'hamlet');
const isOpen = (t) => !!t && !isHamlet(t) && Board.familiesOf(t).some((f) => OPEN.has(f));

/**
 * @returns {{ lanes: Array<[string, string]>, links: Array<{ a: string, b: string, cells: string[] }> }}
 *  lanes : paires de hameaux adjacents (ruelles) ; links : sentiers entre régions de hameaux distinctes (cellules de bout en bout).
 */
export function computeLinks(board) {
  if (board._links && board._linksVersion === board.version) return board._links;
  const regionOf = new Map();
  for (const reg of board.regions('hamlet')) for (const k of reg.keys) regionOf.set(k, reg.id);
  // ruelles : arbre de desserte de chaque village (parcours en largeur depuis la cellule la plus centrale), pas une toile
  const lanes = [];
  for (const reg of board.regions('hamlet')) {
    if (reg.size < 2) continue;
    let cx = 0, cy = 0; for (const c of reg.cells) { cx += c.q; cy += c.r; } cx /= reg.cells.length; cy /= reg.cells.length;
    let start = reg.cells[0], bd = Infinity;
    for (const c of reg.cells) { const d = Math.hypot(c.q - cx, c.r - cy); if (d < bd) { bd = d; start = c; } }
    const seen = new Set([key(start.q, start.r)]); const queue = [start];
    while (queue.length) {
      const c = queue.shift();
      for (const [a, b] of neighbors(c.q, c.r)) {
        const nk = key(a, b); if (!reg.keys.has(nk) || seen.has(nk)) continue;
        seen.add(nk); lanes.push([key(c.q, c.r), nk]); queue.push(board.get(a, b));
      }
    }
  }
  // sentiers : plus court chemin (≤ MAX_PATH tuiles ouvertes) entre deux régions de hameaux différentes.
  // Entre plusieurs chemins de même longueur, on garde le plus DROIT : un parcours en largeur qui prend
  // le premier venu faisait des crochets par une case de côté, et le sentier partait vers la côte
  // pour revenir (retour du commanditaire : « des itinéraires assez bizarres »).
  const best = new Map();   // "regA|regB" -> { cells, detour }
  const centre = (k) => { const [q, r] = parse(k); return toWorld(q, r); };
  // l'écart d'un chemin à la ligne droite : la somme des distances de ses cases intermédiaires à la corde
  const detour = (cells) => {
    const a = centre(cells[0]), b = centre(cells[cells.length - 1]); const dx = b.x - a.x, dy = b.y - a.y; const L = Math.hypot(dx, dy) || 1;
    let s = 0; for (let i = 1; i < cells.length - 1; i++) { const c = centre(cells[i]); s += Math.abs((c.x - a.x) * dy - (c.y - a.y) * dx) / L; }
    return s;
  };
  for (const t of board.tiles.values()) {
    if (!isHamlet(t)) continue;
    const start = key(t.q, t.r), ra = regionOf.get(start);
    // tous les chemins les plus courts vers chaque case (pas seulement le premier trouvé), bornés
    const queue = [[start, [start]]]; const dist = new Map([[start, 0]]); const vus = new Map([[start, 1]]);
    while (queue.length) {
      const [k, path] = queue.shift(); const d = dist.get(k);
      const [q, r] = parse(k);
      for (const [a, b] of neighbors(q, r)) {
        const nk = key(a, b); const n = board.get(a, b); if (!n) continue;
        if (isHamlet(n)) {
          const rb = regionOf.get(nk);
          if (rb === ra || d === 0) continue;
          const pk = ra < rb ? `${ra}|${rb}` : `${rb}|${ra}`;
          const cells = [...path, nk]; const cur = best.get(pk); const e = detour(cells);
          if (!cur || cells.length < cur.cells.length || (cells.length === cur.cells.length && e < cur.detour - 1e-6)) best.set(pk, { a: ra, b: rb, cells, detour: e });
          continue;
        }
        if (!isOpen(n) || d + 1 > (board.linkMax || MAX_PATH)) continue;
        if (dist.has(nk) && dist.get(nk) < d + 1) continue;          // déjà atteinte en moins de pas
        const nv = (vus.get(nk) || 0) + 1; if (nv > 6) continue;    // six chemins de même longueur suffisent
        vus.set(nk, nv); dist.set(nk, d + 1); queue.push([nk, [...path, nk]]);
      }
    }
  }
  const links = [...best.values()];
  board._links = { lanes, links }; board._linksVersion = board.version;
  return board._links;
}

// ---------------------------------------------------------------------------
// Géométrie des chemins : partagée par le rendu (qui les trace) et le décor
// (qui doit savoir où ils passent pour ne rien poser dessus).
// ---------------------------------------------------------------------------

/** Bruit déterministe par case : le chemin ne traverse pas le centre exact, il hésite. */
function wobble(k, salt) {
  const [q, r] = parse(k);
  const h = Math.sin((q + 512) * 127.1 + (r + 512) * 311.7 + salt * 74.7) * 43758.5453;
  return (h - Math.floor(h)) - 0.5;
}

/**
 * Le point par lequel le chemin traverse une case.
 * Un hameau fait exception : le bâtiment est dessiné sous le centre de la case (son pied tombe à
 * environ +30), et le chemin passait donc **dessous**, à travers la maison. Il passe maintenant
 * DEVANT la façade — une rue de village longe les portes, elle ne les traverse pas et ne s'arrête
 * pas non plus au bord de l'hexagone. Ailleurs, le centre de la case décalé d'un rien : ce décalage,
 * tiré par case et non par segment, empêche tous les chemins d'onduler de la même façon.
 */
const SEUIL = 34;           // devant la façade, en px monde (le sommet bas de l'hexagone est à 69)
const WOBBLE = SIZE * 0.17; // hésitation du tracé dans une case ordinaire

function waypoint(board, k, maison) {
  const [q, r] = parse(k); const c = toWorld(q, r);
  if (maison) return { x: c.x + wobble(k, 1) * 9, y: c.y + SEUIL };
  return { x: c.x + wobble(k, 1) * WOBBLE, y: c.y + wobble(k, 2) * WOBBLE };
}

/** Points de contrôle d'un chemin, de bout en bout, en coordonnées monde. */
/**
 * Arrondi de Chaikin : chaque coin d'une polyligne est remplacé par deux points au quart et aux trois
 * quarts du segment. Deux passes suffisent à faire d'une ligne brisée une courbe. Les extrémités ne
 * bougent pas — un chemin doit rester devant la façade où on l'a posé.
 */
function chaikin(pts, passes = 2) {
  let cur = pts;
  for (let p = 0; p < passes; p++) {
    if (cur.length < 3) return cur;
    const out = [cur[0]];
    for (let i = 0; i < cur.length - 1; i++) {
      const a = cur[i], b = cur[i + 1];
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    out.push(cur[cur.length - 1]);
    cur = out;
  }
  return cur;
}

/** Le milieu de l'arête partagée par deux cases voisines, un peu décalé au hasard de la paire. */
function passage(ka, kb) {
  const [qa, ra] = parse(ka), [qb, rb] = parse(kb);
  const c = toWorld(qa, ra);
  for (let d = 0; d < 6; d++) {
    const [dq, dr] = DIRS[d];
    if (qa + dq !== qb || ra + dr !== rb) continue;
    const m = edgeMid(c.x, c.y, d);
    const j = wobble(ka, 7) * SIZE * 0.14, j2 = wobble(kb, 11) * SIZE * 0.1;
    return { x: m.x + j, y: m.y + j2 };
  }
  return null;   // cases non adjacentes (ne devrait pas arriver)
}

/**
 * Le tracé d'un chemin. Un seul point par case faisait couper les coins : la courbe n'avait aucune
 * raison de tourner là où elle tournait, et elle mordait sur les cases voisines. On passe donc aussi
 * par le milieu de chaque arête réellement franchie, puis on arrondit le tout (Chaikin).
 */
function shape(board, cells) {
  if (cells.length === 1) { const [q, r] = parse(cells[0]); return [waypoint(board, cells[0], isHamlet(board.get(q, r)))]; }
  const brut = [];
  for (let i = 0; i < cells.length; i++) {
    const k = cells[i]; const [q, r] = parse(k);
    let w = waypoint(board, k, isHamlet(board.get(q, r)));
    // une case traversée : le chemin la COUPE, il ne va pas visiter son centre. Le point de passage
    // est tiré vers le milieu des deux arêtes franchies — sinon chaque case faisait un crochet
    if (i > 0 && i < cells.length - 1) {
      const e1 = passage(cells[i - 1], k), e2 = passage(k, cells[i + 1]);
      if (e1 && e2) { const mx = (e1.x + e2.x) / 2, my = (e1.y + e2.y) / 2; w = { x: w.x * 0.45 + mx * 0.55, y: w.y * 0.45 + my * 0.55 }; }
    }
    brut.push(w);
    if (i < cells.length - 1) { const m = passage(k, cells[i + 1]); if (m) brut.push(m); }
  }
  return chaikin(brut, 2);
}

// ---------------------------------------------------------------------------
// Le ruban : un chemin n'est pas un trait d'épaisseur constante aux bords nets, c'est de la terre
// battue, mangée par l'herbe. Sa largeur ondule, ses deux bords s'effilochent chacun de leur côté,
// et il s'amenuise aux deux bouts — devant la porte, le chemin se perd dans la cour.
// ---------------------------------------------------------------------------

/** Bruit 1D lisse et déterministe, dans [-1, 1], le long d'une abscisse `s` (longueur d'onde `lambda`). */
function bruit1d(seed, s, lambda) {
  const x = s / lambda, i = Math.floor(x), f = x - i, t = f * f * (3 - 2 * f);
  const h = (k) => { const v = Math.sin(k * 127.1 + seed * 311.7) * 43758.5453; return v - Math.floor(v); };
  const a = h(i), b = h(i + 1);
  return (a + (b - a) * t) * 2 - 1;
}

/** Rééchantillonnage d'une polyligne à pas constant (les bords irréguliers ont besoin de points serrés). */
function resample(pts, pas) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]]; let reste = pas;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]; const d = Math.hypot(b.x - a.x, b.y - a.y); let t = reste;
    while (t <= d) { out.push({ x: a.x + (b.x - a.x) * (t / d), y: a.y + (b.y - a.y) * (t / d) }); t += pas; }
    reste = t - d;
  }
  const fin = pts[pts.length - 1], der = out[out.length - 1];
  if (Math.hypot(fin.x - der.x, fin.y - der.y) > pas * 0.4) out.push(fin); else out[out.length - 1] = fin;
  return out;
}

export const LARGEUR = { lane: 7, link: 10 };   // largeur nominale d'une ruelle et d'un sentier, en px monde

/**
 * Les deux bords d'un chemin, en coordonnées monde. `marge` élargit le ruban d'autant de chaque côté
 * (pour la bordure sombre) sans changer ses irrégularités : la bordure suit le bord clair.
 * @returns {{ gauche: Array<{x:number,y:number}>, droite: Array<{x:number,y:number}> }}
 */
export function ruban(pts, largeur, seed, marge = 0) {
  const p = resample(pts, 5);
  const gauche = [], droite = [];
  let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    if (i > 0) s += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    let tx = b.x - a.x, ty = b.y - a.y; const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
    const nx = -ty, ny = tx;
    // effilé aux deux bouts sur 22 px, largeur qui ondule lentement (± 8 %), bords qui s'effilochent
    // chacun à leur rythme (± 18 % sur 12 px) — deux bruits différents, sinon le chemin ne fait
    // qu'onduler. (± 35 % sur 9 px, la première fois : « trop prononcé », dit le commanditaire.)
    const bout = Math.min(1, s / 22, (L - s) / 22); const effile = 0.45 + 0.55 * bout * bout * (3 - 2 * bout);
    const w = (largeur / 2) * effile * (0.92 + 0.08 * bruit1d(seed, s, 30)) + marge;
    const gl = 1 + 0.18 * bruit1d(seed + 3, s, 12), gr = 1 + 0.18 * bruit1d(seed + 7, s, 12);
    gauche.push({ x: p[i].x + nx * w * gl, y: p[i].y + ny * w * gl });
    droite.push({ x: p[i].x - nx * w * gr, y: p[i].y - ny * w * gr });
  }
  return { gauche, droite };
}

/**
 * Tous les chemins de l'île, prêts à tracer : { kind, cells, pts, ruban, bordure }.
 * `kind` vaut 'lane' (ruelle d'un village) ou 'link' (sentier entre deux villages) ; `ruban` et
 * `bordure` sont les deux bords du chemin et ceux de sa bordure sombre (voir `ruban`).
 */
export function pathShapes(board) {
  if (board._shapes && board._shapesVersion === board.version) return board._shapes;
  const { lanes, links } = computeLinks(board);
  const out = [];
  for (const [a, b] of lanes) out.push({ kind: 'lane', cells: [a, b], pts: shape(board, [a, b]) });
  for (const l of links) out.push({ kind: 'link', cells: l.cells, pts: shape(board, l.cells) });
  out.forEach((o, i) => { o.ruban = ruban(o.pts, LARGEUR[o.kind], i); o.bordure = ruban(o.pts, LARGEUR[o.kind], i, 2); });
  board._shapes = out; board._shapesVersion = board.version;
  return out;
}

/**
 * Points semés le long des chemins, rangés par case : le décor s'en sert comme d'obstacles,
 * pour que rien ne vienne se planter au milieu de la route.
 */
export function pathPoints(board, pas = 11) {
  if (board._pathPts && board._pathPtsVersion === board.version) return board._pathPts;
  const map = new Map();
  const ajoute = (p) => {
    const q = Math.round((Math.sqrt(3) / 3 * p.x - p.y / 3) / SIZE), r0 = Math.round((2 / 3 * p.y) / SIZE);
    for (const [a, b] of [[q, r0], ...neighbors(q, r0)]) {
      const k = key(a, b); const c = toWorld(a, b);
      if (Math.hypot(c.x - p.x, c.y - p.y) > SIZE) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    }
  };
  for (const s of pathShapes(board)) {
    for (let i = 0; i < s.pts.length - 1; i++) {
      const a = s.pts[i], b = s.pts[i + 1];
      const d = Math.hypot(b.x - a.x, b.y - a.y); const n = Math.max(1, Math.round(d / pas));
      for (let j = 0; j <= n; j++) ajoute({ x: a.x + (b.x - a.x) * (j / n), y: a.y + (b.y - a.y) * (j / n) });
    }
  }
  board._pathPts = map; board._pathPtsVersion = board.version;
  return map;
}
