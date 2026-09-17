// Règles de saison variables : chaque saison possède trois règles (une de base, une qui favorise les hameaux / champs /
// vergers, une qui favorise forêts / eau / faune). Dès l'île 4 (et dans les modes libres), la règle est tirée à chaque
// arrivée de la saison, de façon déterministe pour une île donnée.
export const SEASON_RULES = {
  spring: ['crue', 'semailles', 'nichees'],
  summer: ['secheresse', 'chaleurs', 'feux'],
  autumn: ['recolte', 'foire', 'chasse'],
  winter: ['veillee', 'froid', 'doux'],
};
export const BASE_RULE = { spring: 'crue', summer: 'secheresse', autumn: 'recolte', winter: 'veillee' };
export const RULE_SEASON = Object.fromEntries(Object.entries(SEASON_RULES).flatMap(([s, list]) => list.map((k) => [k, s])));

/** Tire une règle pour la saison : la règle de base a un poids de 40 %, les deux autres 30 % chacune. */
export function pickRule(season, rng, variable) {
  if (!variable) return BASE_RULE[season];
  const list = SEASON_RULES[season]; const x = rng();
  return x < 0.4 ? list[0] : x < 0.7 ? list[1] : list[2];
}
