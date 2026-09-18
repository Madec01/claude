// Semis : avant chaque île (dès l'île 4), le joueur choisit ce que la file donnera plutôt. Multiplicateurs de poids.
export const SEMIS = [
  { id: 'saisons', name: 'Au gré des saisons', desc: 'La file de l’île, telle quelle.', mul: {} },
  { id: 'hauts', name: 'Terres hautes', desc: 'Plus de roche, de collines et de forêts ; moins de champs et de hameaux.', mul: { rock: 1.6, hill: 1.6, forest: 1.5, field: 0.7, hamlet: 0.8, marsh: 0.7 } },
  { id: 'humides', name: 'Fonds humides', desc: 'Plus d’eau et de marais, des prés ; moins de roche et de champs.', mul: { water: 1.6, marsh: 1.6, meadow: 1.2, rock: 0.7, field: 0.8, sand: 0.8 } },
  { id: 'habite', name: 'Pays habité', desc: 'Plus de hameaux, de champs et de vergers ; moins de marais et de roche.', mul: { hamlet: 1.5, field: 1.5, orchard: 1.5, marsh: 0.6, rock: 0.7, heath: 0.8 } },
];
export const SEMIS_BY_ID = Object.fromEntries(SEMIS.map((s) => [s.id, s]));
/** Poids de file après un semis (les familles absentes de la file le restent). */
export function applySemis(weights, id) {
  const s = SEMIS_BY_ID[id]; if (!s || !weights) return weights;
  const out = {}; for (const [k, v] of Object.entries(weights)) out[k] = v > 0 ? Math.max(1, Math.round(v * (s.mul[k] || 1))) : v;
  return out;
}
