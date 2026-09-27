// Les énigmes de « Sous la brume » : de petites îles préparées, où des indices croisés désignent une case à coup sûr.
// La première sert de mini-énigme en tête du tutoriel du mode (feuille de brume, B-H) ; d'autres viendront (B-Q).
// Tout y est fixé : la forme (`mask`), les tuiles de départ, les cases cachées et ce qu'elles cachent (`planBrume`),
// la main (`opening`), et les étapes guidées (comme le tutoriel de l'île 1 : la case qui brille, puis une carte).
import { WEIGHTS } from './islands.js';
import { P, pts } from '../game/brume.js';

/**
 * Énigme 1, « Où est la forêt ? ». Trois cases cachées : A (en haut à droite), B (en bas à gauche), C (en bas).
 * Une forêt posée en X touche A et B et dit « 1 » ; une forêt posée en Y touche B et C et dit « 0 ». Donc B et C
 * ne sont pas la forêt : elle est en A. Le solveur ne tranche A qu'avec les deux indices (test brume.test.js).
 *
 *   coordonnées axiales (q, r) ; r descend, q va vers la droite
 *   X = (0, 0)  A = (1, −1)  B = (−1, 1)  C = (0, 2)  Y = (−1, 2) ; roche de départ (2, −1), hameau de départ (1, 1)
 *   A touche X et la roche ; B touche X et Y ; C touche Y et le hameau : à deux voisines posées, les trois se dévoilent.
 */
const ENIGME_1 = {
  id: 1, nom: 'Où est la forêt ?', cible: '1,-1', famille: 'forest',
  mask: ['0,0', '1,0', '0,-1', '-1,0', '0,1', '1,-1', '-1,1', '0,2', '-1,2', '2,-1', '1,1', '1,-2', '2,0', '1,2', '-2,2', '2,-2', '-1,3'],
  start: [{ q: 2, r: -1, family: 'rock' }, { q: 1, r: 1, family: 'hamlet' }],
  cachees: { '1,-1': 'forest', '-1,1': 'water', '0,2': 'field' },
  poses: [[0, 0], [-1, 2]],
  opening: ['forest', 'forest', 'forest', 'forest', 'forest'],
};
const juste1 = (i) => i.brume.jalons.get('1,-1') === 'forest' || i.brume.justes > 0;
ENIGME_1.etapes = [
  { id: 'en1', target: [0, 0], text: 'Trois cases sous la brume. L’inventaire, en bas, dit ce qu’elles cachent : une forêt, une eau, un champ — jamais où. Pose la forêt sur la case qui brille : elle touche deux cases cachées.', done: (i) => i.placements >= 1 },
  { id: 'en2', target: [-1, 2], text: (i) => { const t = i.board.get(0, 0); const n = t && typeof t.indice === 'number' ? t.indice : 1; return `Son chiffre dit ${n} : parmi ses deux voisines cachées, en haut à droite et en bas à gauche, ${n === 1 ? 'une seule est une forêt' : `${n} sont des forêts`}. Laquelle ? On ne sait pas encore. Pose la seconde forêt sur la case qui brille : elle touche la case en bas à gauche et celle du bas.`; }, done: (i) => i.placements >= 2 },
  { id: 'en3', info: false, done: (i) => i.brume.jalons.size >= 1, text: 'Elle dit 0 : ni la case en bas à gauche ni celle du bas n’est une forêt. Or la première forêt en voyait une… Touche une tuile pour voir les cases que son chiffre compte. Où est la forêt ? Touche cette case et plante le jalon « Forêt ».' },
  { id: 'en4', info: true, porteesToutes: true, done: () => false, text: (i) => (juste1(i)
    ? 'Juste. La preuve : la seconde forêt dit 0, donc la case en bas à gauche n’est pas une forêt ; la première dit 1 sur cette case et sur celle d’en haut à droite : la forêt est en haut à droite. C’est ça, déduire : deux chiffres croisés, et une case sûre. Lève la brume pour le voir.'
    : 'Ce jalon n’est pas sûr. Regarde les deux portées cernées : la seconde forêt dit 0, donc ni la case en bas à gauche ni celle du bas n’est une forêt ; la première dit 1 sur la case en bas à gauche et sur celle d’en haut à droite : la forêt est en haut à droite. Lève la brume pour le voir.') },
  { id: 'en5', info: false, done: (i) => i.seasonsPassed.length >= 1, focus: '.brume-lever', text: 'Lève la brume : le bouton, en bas. Les cases qui battent vont se dévoiler.' },
  { id: 'en6', info: true, done: () => false, text: (i) => `${i.brume.justes ? `Jalon juste : ${pts(P.jalonJuste)}, et les bords de la forêt dévoilée valent double.` : `La forêt était en haut à droite : un jalon juste aurait rapporté ${pts(P.jalonJuste)}, un jalon faux coûte ${pts(P.jalonFaux)}.`} Maintenant, une vraie île : un tiers de ses cases sous la brume, cinq poses par saison, un trésor à trouver. Le crayon note ce que tu crois, le jalon engage ce que tu sais.` },
];

export const ENIGMES = [ENIGME_1];

/** La définition d'île d'une énigme (jouable telle quelle par `Island`, sans solveur : le plan est fixé). */
export function brumeEnigme(id = 1) {
  const e = ENIGMES.find((x) => x.id === id) || ENIGMES[0];
  let n = 0;
  const cachees = Object.entries(e.cachees).map(([k, family]) => [k, { family, variant: 1, rare: false, id: --n }]);
  return {
    id: 'brume', brume: 'claire', enigme: { id: e.id, nom: e.nom, cible: e.cible, famille: e.famille, poses: e.poses, etapes: e.etapes },
    mask: [...e.mask], cells: e.mask.length, seed: 1000 + e.id, roughness: 0, holes: 0,
    seasonLength: e.poses.length, startSeason: 'spring', weights: WEIGHTS.balanced, tilesRatio: 1,
    start: e.start.map((s) => ({ ...s })), wishes: [], mechanics: [], opening: [...e.opening], tuto: true,
    planBrume: { fog: Object.keys(e.cachees), cachees, deduc: 1 },
    name: `Énigme · ${e.nom}`,
  };
}
