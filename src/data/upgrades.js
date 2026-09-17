// Atelier du phare : six améliorations à trois niveaux.
export const UPGRADES = [
  { id: 'lens', name: 'Lentille large', icon: 'icon_target', desc: 'Élargit l’angle du faisceau.', levels: ['28°', '34°', '40°', '46°'], costs: [4, 6, 9] },
  { id: 'mechanism', name: 'Mécanisme huilé', icon: 'icon_gear', desc: 'La lentille tourne plus vite vers le curseur.', levels: ['×1', '×1,25', '×1,5', '×1,75'], costs: [3, 5, 8] },
  { id: 'hornRange', name: 'Corne longue', icon: 'icon_signal', desc: 'Augmente le rayon de la corne de brume.', levels: ['250 m', '300 m', '350 m', '400 m'], costs: [3, 5, 8] },
  { id: 'hornSpeed', name: 'Corne rapide', icon: 'icon_clock', desc: 'Réduit le temps de recharge de la corne.', levels: ['8 s', '7 s', '6 s', '5 s'], costs: [4, 6, 9] },
  { id: 'oil', name: 'Réserve d’huile', icon: 'icon_wrench', desc: 'Augmente la capacité de la cuve (utile dès la nuit 10).', levels: ['100', '125', '150', '175'], costs: [3, 4, 6] },
  { id: 'lantern', name: 'Lanterne de secours', icon: 'icon_star', desc: 'Un naufrage de plus toléré par nuit.', levels: ['3 naufrages', '4 naufrages', '5 naufrages'], costs: [8, 12] },
];

export const upgradeCost = (u, level) => (level < u.costs.length ? u.costs[level] : null);
export const upgradeMax = (u) => u.costs.length;
