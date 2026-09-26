// L'harmonie d'une île : trois fleurs qui récompensent ce que le score ne récompense pas. Le score pousse à la
// monoculture (grandes régions, primes de fermeture, bonus de grande région : « encore plus de la même chose ») ;
// rien ne récompensait une île variée et bien finie, alors que c'est ce qui la rend belle. Chaque fleur rapporte des
// points fixes, proportionnels à la taille de l'île, comptés à la fin de la partie ; elles se voient s'ouvrir en jeu.
//   Variété     : assez de familles tiennent une région d'au moins trois tuiles
//   Équilibre   : aucune région ne couvre plus d'une part donnée de l'île (le contrepoids des grandes régions ; la part
//                 d'une famille dans les tuiles posées dépendait de la file, donc du hasard : c'est la région qu'on choisit)
//   Achèvement  : la plupart des tuiles sont dans des régions closes, et aucune friche ne reste
// Modèle pur (sans DOM) : utilisable en Node pour les tests et le bot.
import { BALANCE } from '../data/balance.js';
import { Board } from './board.js';
import { key } from './hex.js';

const H = () => BALANCE.harmonie;

/** Nombre de familles demandé pour la Variété : jamais plus que ce que la file de l'île peut offrir. */
export function varieteDemandee(def) {
  const w = def && def.weights; const offertes = w ? Object.values(w).filter((x) => x > 0).length : 11;
  return Math.max(2, Math.min(H().variete, offertes - 1));
}

/** Points d'une fleur pour une île de `cells` cases. */
export const ptsFleur = (cells) => Math.max(3, Math.round(cells / H().casesParPoint));

/**
 * État des trois fleurs sur ce plateau.
 * @returns {{ fleurs: Array<{id:string, nom:string, ok:boolean, valeur:number, seuil:number, detail:string}>, ouvertes:number, pts:number, total:number }}
 */
export function harmonie(board, def = null) {
  const h = H(); const tiles = [...board.tiles.values()]; const n = tiles.length;
  // Variété : les familles de base qui tiennent une région de trois tuiles au moins (en tuiles, pas en niveaux)
  const tenues = new Set();
  for (const fam of new Set(tiles.flatMap((t) => Board.familiesOf(t)))) {
    if (board.regions(fam).some((r) => r.cells.length >= h.regionMin)) tenues.add(fam);
  }
  const demande = varieteDemandee(def);
  // Équilibre : la plus grande région, toutes familles confondues (en tuiles), rapportée aux tuiles posées
  let plus = null, plusN = 0;
  for (const fam of new Set(tiles.flatMap((t) => Board.familiesOf(t)))) for (const r of board.regions(fam)) if (r.cells.length > plusN) { plusN = r.cells.length; plus = fam; }
  const part = n ? plusN / n : 1;
  const equilibreOk = n >= h.poseMin && part <= h.equilibre;
  // Achèvement : la part des tuiles qui appartiennent à au moins une région close (payée), et pas de friche
  let closes = 0, friches = 0;
  for (const t of tiles) {
    if (t.blighted) { friches++; continue; }
    const k = key(t.q, t.r); if (Board.familiesOf(t).some((f) => board.closedRegions.has(`${f}:${k}`))) closes++;
  }
  const partClose = n ? closes / n : 0;
  const acheveOk = n >= h.poseMin && partClose >= h.acheve && friches === 0;
  const pct = (x) => `${Math.round(x * 100)} %`;
  const fleurs = [
    { id: 'variete', nom: 'Variété', ok: tenues.size >= demande, valeur: tenues.size, seuil: demande, detail: `${tenues.size} famille${tenues.size > 1 ? 's' : ''} sur ${demande} tiennent une région de ${h.regionMin} tuiles ou plus` },
    { id: 'equilibre', nom: 'Équilibre', ok: equilibreOk, valeur: part, seuil: h.equilibre, detail: n < h.poseMin ? `à juger après ${h.poseMin} tuiles` : `la plus grande région couvre ${pct(part)} de l’île (${pct(h.equilibre)} au plus)`, famille: plus },
    { id: 'acheve', nom: 'Achèvement', ok: acheveOk, valeur: partClose, seuil: h.acheve, detail: n < h.poseMin ? `à juger après ${h.poseMin} tuiles` : `${pct(partClose)} des tuiles dans des régions closes (${pct(h.acheve)} au moins)${friches ? `, ${friches} friche${friches > 1 ? 's' : ''}` : ''}`, friches },
  ];
  const ouvertes = fleurs.filter((f) => f.ok).length; const pts = ptsFleur(board.cells);
  return { fleurs, ouvertes, pts, total: ouvertes * pts };
}
