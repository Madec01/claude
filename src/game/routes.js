// Livre II — ce qui paie à la saison sur un archipel : les routes de mer et la chaîne de territoire.
//
// Une ROUTE est un morceau de mer posée d'un seul tenant (mer, récif, algues sur le détroit) ; elle relie les ports
// qu'elle touche. Elle paie à chaque saison pour chaque port relié au-delà du premier, plus une marchandise par famille
// de terre différente qui touche l'un de ses ports. Relier deux réseaux est le grand coup d'une partie.
//
// La CHAÎNE DE TERRITOIRE (nom du commanditaire) : la plus longue file de tuiles voisines, toutes de familles
// différentes et chacune en bonne affinité avec la suivante. Elle paie à la saison à partir de quatre familles, et
// grimpe vite. Mesuré au Livre I : dès trois, c'était une rente touchée sans être cherchée ; à quatre, une décision.
import { Board } from './board.js';
import { key, neighbors } from './hex.js';
import { affinity, MER, MARCHANDISES } from '../data/tiles.js';
import { BALANCE } from '../data/balance.js';

const estMer = (t) => !!t && Board.familiesOf(t).some((f) => MER.has(f));

/**
 * Les routes du plateau : une par morceau de mer posée, avec ses ports et ses marchandises.
 * @returns {{ cells:string[], ports:object[], marchandises:string[], pts:number }[]} seules les routes à deux ports au moins paient
 */
export function computeRoutes(board) {
  if (board._routes && board._routesVersion === board.version) return board._routes;
  const R = BALANCE.livre2.route; const vus = new Set(); const out = [];
  for (const [k0, t0] of board.tiles) {
    if (vus.has(k0) || !estMer(t0)) continue;
    const cells = []; const pile = [k0]; vus.add(k0); const ports = new Map();
    while (pile.length) {
      const k = pile.pop(); cells.push(k); const t = board.tiles.get(k);
      for (const [a, b] of neighbors(t.q, t.r)) {
        const nk = key(a, b); const n = board.tiles.get(nk); if (!n) continue;
        if (estMer(n)) { if (!vus.has(nk)) { vus.add(nk); pile.push(nk); } }
        else if (Board.isFamily(n, 'port')) ports.set(nk, n);
      }
    }
    const marchandises = new Set();
    for (const p of ports.values()) for (const [a, b] of neighbors(p.q, p.r)) { const n = board.get(a, b); if (n) for (const f of Board.familiesOf(n)) if (MARCHANDISES.has(f)) marchandises.add(f); }
    const nPorts = ports.size;
    const pts = nPorts >= 2 ? (nPorts - 1) * R.port + marchandises.size * R.marchandise : 0;
    out.push({ cells, ports: [...ports.values()], marchandises: [...marchandises], pts });
  }
  board._routes = out; board._routesVersion = board.version;
  return out;
}

/**
 * La chaîne de territoire : la plus longue file de tuiles voisines de familles toutes différentes, chaque maillon en
 * bonne affinité (> 0) avec le suivant. Parcours en profondeur depuis chaque tuile, avec les familles déjà prises en
 * masque de bits ; on s'arrête dès qu'il ne reste pas assez de familles pour battre la meilleure. Une tuile rare compte
 * pour sa première famille ; une friche ne compte pas.
 * @returns {{ cells:string[], families:string[], length:number, pts:number }}
 */
export function chaineTerritoire(board) {
  if (board._chaine && board._chaineVersion === board.version) return board._chaine;
  const fam = new Map(); const idx = new Map(); const liste = [];
  for (const [k, t] of board.tiles) { const fs = Board.familiesOf(t); if (!fs.length) continue; fam.set(k, fs[0]); if (!idx.has(fs[0])) { idx.set(fs[0], liste.length); liste.push(fs[0]); } }
  const nF = liste.length; let best = [];
  const bit = (f) => 1 << idx.get(f);
  // les voisins compatibles de chaque tuile, calculés une fois
  const voisins = new Map();
  const min = BALANCE.livre2.chaine.min || 1;
  for (const [k, f] of fam) { const [q, r] = k.split(',').map(Number); const v = []; for (const [a, b] of neighbors(q, r)) { const nk = key(a, b); const g = fam.get(nk); if (g && g !== f && affinity(f, g) >= min) v.push(nk); } voisins.set(k, v); }
  const chemin = [];
  const dfs = (k, masque, prof) => {
    chemin.push(k);
    if (prof > best.length) best = chemin.slice();
    if (prof + (nF - prof) > best.length) for (const nk of voisins.get(k)) { const b = bit(fam.get(nk)); if (masque & b) continue; dfs(nk, masque | b, prof + 1); }
    chemin.pop();
  };
  for (const k of fam.keys()) if (nF > best.length) dfs(k, bit(fam.get(k)), 1);
  const C = BALANCE.livre2.chaine; const n = best.length;
  const pts = n < C.des ? 0 : (C.pts[Math.min(n, C.des + C.pts.length - 1) - C.des] || 0);
  const out = { cells: best, families: best.map((k) => fam.get(k)), length: n, pts };
  board._chaine = out; board._chaineVersion = board.version;
  return out;
}

/** Ce que la mer et la chaîne paieront à la saison, sur ce plateau : la somme, pour l'aperçu et la lecture de l'île. */
export function rentesLivre2(board) {
  let pts = 0; for (const r of computeRoutes(board)) pts += r.pts;
  return pts + chaineTerritoire(board).pts;
}
