// L'Atelier des saisons : améliorations achetées en graines.
export const UPGRADES = [
  { id: 'sight', name: 'Regard', icon: 'icon_info', desc: 'Voir plus loin dans la file de tuiles.', levels: ['3 tuiles', '4 tuiles', '5 tuiles'], costs: [4, 8] },
  { id: 'pocket', name: 'Poche', icon: 'icon_bag', desc: 'Garder une tuile de côté pour plus tard.', levels: ['Aucune', '1 tuile', '2 tuiles'], costs: [5, 10] },
  { id: 'breath', name: 'Souffle de départ', icon: 'icon_wind', desc: 'Commencer chaque île avec des souffles.', levels: ['0', '+2', '+4', '+6'], costs: [3, 6, 9] },
  { id: 'patience', name: 'Patience des saisons', icon: 'icon_sun', desc: 'Chaque saison dure plus longtemps.', levels: ['12 poses', '13 poses', '14 poses'], costs: [5, 9] },
  { id: 'rare', name: 'Semence rare', icon: 'icon_star', desc: 'Une tuile rare offerte au début de chaque île.', levels: ['Aucune', 'Puits', 'Moulin'], costs: [6, 10] },
  { id: 'memory', name: 'Seconde chance', icon: 'icon_return', desc: 'Le souvenir (annuler) coûte moins de souffles.', levels: ['4 souffles', '3 souffles', '2 souffles'], costs: [4, 8] },
];

export const upgradeCost = (u, level) => (level < u.costs.length ? u.costs[level] : null);
export const upgradeMax = (u) => u.costs.length;
