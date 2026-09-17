// Le Bar des Sports : jeux de boules et entraînements achetés en jetons.
export const UPGRADES = [
  { id: 'steady', name: 'Régularité', icon: 'icon_target', desc: 'La zone verte de la jauge s’élargit.', levels: ['Normale', 'Large', 'Très large', 'Généreuse'], costs: [6, 10, 16] },
  { id: 'calm', name: 'Sang-froid', icon: 'icon_clock', desc: 'L’aiguille de la jauge ralentit.', levels: ['Vive', 'Posée', 'Lente', 'Tranquille'], costs: [6, 10, 16] },
  { id: 'eye', name: 'Œil du tireur', icon: 'icon_signal', desc: 'La trajectoire prévisualisée du tir s’allonge.', levels: ['Courte', 'Moyenne', 'Longue', 'Complète'], costs: [5, 8, 12] },
  { id: 'reading', name: 'Lecture du terrain', icon: 'icon_info', desc: 'Pentes et sols difficiles sont mieux affichés.', levels: ['À l’œil', 'Pentes', 'Pentes + sols', 'Tout'], costs: [4, 7, 10] },
];

export const BOULE_SETS = [
  { id: 'fanny', name: 'Les boules de Fanny', desc: 'Équilibrées. Celles de la boîte à biscuits.', cost: 0 },
  { id: 'tender', name: 'Les tendres', desc: 'Acier doux : rebondissent peu, roulent moins loin. Pour pointer.', cost: 12 },
  { id: 'hard', name: 'Les dures', desc: 'Acier dur : rebond franc, choc violent. Pour tirer et faire des carreaux.', cost: 14 },
];

export const upgradeCost = (u, level) => (level < u.costs.length ? u.costs[level] : null);
export const upgradeMax = (u) => u.costs.length;
