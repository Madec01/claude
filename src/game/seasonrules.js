// Surprises de saison : chaque saison a sa règle de base et deux surprises (l'une qui favorise hameaux, champs et
// vergers, l'autre forêts, eau et faune). Dès l'île 11 (et dans les modes libres), la règle est tirée à chaque arrivée
// de la saison, de façon déterministe pour une île donnée, et vaut pour toute la saison.
export const SEASON_RULES = {
  spring: ['crue', 'semailles', 'nichees'],
  summer: ['secheresse', 'chaleurs', 'feux'],
  autumn: ['recolte', 'foire', 'chasse'],
  winter: ['veillee', 'froid', 'doux'],
};
export const BASE_RULE = { spring: 'crue', summer: 'secheresse', autumn: 'recolte', winter: 'veillee' };
/**
 * L'habillage d'une surprise : ce qu'il reste de l'ancienne météo, sans aucun effet sur le score. La pluie accompagne
 * les semailles, la chaleur les grandes chaleurs et les feux, le vent la foire, la neige le grand froid, le redoux
 * l'hiver doux. Les règles de base restent sans habillage : c'est la surprise qui doit se voir.
 */
export const RULE_LOOK = { semailles: 'storm', chaleurs: 'heat', feux: 'heat', foire: 'wind', froid: 'blizzard', doux: 'thaw', tempete: 'storm' };
/**
 * Livre II : deux surprises de mer prennent la place d'une surprise de terre — la tempête (hiver, dès l'île du phare)
 * à la place de l'hiver doux, la marée (printemps, dès l'île des marées) à la place des semailles. `reglesPour(mech)`
 * rend la table des règles d'une île d'après ses mécaniques.
 */
export const RULES_LIVRE2 = { tempete: { season: 'winter', replaces: 'doux' }, maree: { season: 'spring', replaces: 'semailles' } };
export function reglesPour(mech) {
  if (!mech) return SEASON_RULES;
  const out = {}; let change = false;
  for (const [s, list] of Object.entries(SEASON_RULES)) out[s] = list.slice();
  for (const [k, r] of Object.entries(RULES_LIVRE2)) if (mech.has(k)) { const i = out[r.season].indexOf(r.replaces); if (i >= 0) { out[r.season][i] = k; change = true; } }
  return change ? out : SEASON_RULES;
}
export const RULE_SEASON = Object.fromEntries([...Object.entries(SEASON_RULES).flatMap(([s, list]) => list.map((k) => [k, s])), ...Object.entries(RULES_LIVRE2).map(([k, r]) => [k, r.season])]);

/** Tire une règle pour la saison : la règle de base a un poids de 40 %, les deux autres 30 % chacune. */
export function pickRule(season, rng, variable, regles = SEASON_RULES) {
  if (!variable) return BASE_RULE[season];
  const list = regles[season] || SEASON_RULES[season]; const x = rng();
  return x < 0.4 ? list[0] : x < 0.7 ? list[1] : list[2];
}
