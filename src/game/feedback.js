// Commentaire de chaque coup : la pose est comparée au meilleur emplacement possible pour la même tuile.
// Purement cosmétique (aucun point), mais compté dans les statistiques du bilan (coups parfaits, meilleure série).
export const GRADES = {
  master:  { color: '#e0a33a', size: 30, burst: 7, streak: true },
  perfect: { color: '#2f9e8f', size: 26, burst: 4, streak: true },
  good:    { color: '#3f9d4f', size: 22, burst: 2, streak: true },
  ok:      { color: '#7d7a72', size: 18, burst: 0, streak: false },
  meh:     { color: '#c0674f', size: 18, burst: 0, streak: false },
};

/**
 * @param {number} total points de la pose
 * @param {number} best  meilleur total possible pour cette tuile au moment de la pose
 * @returns {string|null} clé de GRADES, ou null quand il n'y avait rien à gagner
 */
export function gradeMove(total, best) {
  if (total < 0) return 'meh';                // une pose qui coûte des points casse la série
  if (best <= 0) return null;                 // aucune case ne rapportait : pas de jugement
  if (total === 0) return best >= 2 ? 'meh' : null;
  const r = total / best;
  if (r >= 1 && total >= 10) return 'master';   // le meilleur coup, et un gros coup
  if (r >= 1 && total >= 6) return 'perfect';
  if (r >= 0.8 && total >= 3) return 'good';
  if (r >= 0.5) return 'ok';
  return 'meh';
}

/** Paliers de série (coups bons ou mieux d'affilée) qui méritent un mot. */
export function streakMilestone(n) { return n === 3 || n === 5 || n === 8 || (n >= 10 && n % 5 === 0); }
