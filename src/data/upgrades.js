// L'Atelier des saisons : améliorations achetées en graines.
export const UPGRADES = [
  { id: 'sight', name: 'Regard', icon: 'icon_info', desc: 'Voir plus loin dans la file de tuiles.', levels: ['3 tuiles', '4 tuiles', '5 tuiles'], costs: [4, 8] },
  { id: 'pocket', name: 'Poche', icon: 'icon_pocket', desc: 'Garder une tuile de côté pour plus tard.', levels: ['Aucune', '1 tuile', '2 tuiles'], costs: [5, 10] },
  { id: 'breath', name: 'Souffle de départ', icon: 'icon_wind', desc: 'Commencer chaque île avec des souffles en réserve.', levels: ['0', '+2', '+4', '+6'], costs: [3, 6, 9], requires: 'breath' },
  { id: 'patience', name: 'Patience des saisons', icon: 'icon_sun', desc: 'Chaque saison dure plus longtemps.', levels: ['Normale', '+1 pose', '+2 poses'], costs: [5, 9] },
  { id: 'rare', name: 'Semence rare', icon: 'icon_star', desc: 'Une tuile rare offerte au début de chaque île.', levels: ['Aucune', 'Puits', 'Moulin', 'Grenier', 'Fontaine'], costs: [6, 10, 12, 14], requires: 'rare' },
  { id: 'refuge', name: 'Refuge', icon: 'icon_tree', desc: 'Chaque animal présent rapporte plus de points à chaque changement de saison.', levels: ['Normal', '+1 point', '+2 points'], costs: [5, 9], requires: 'fauna' },
  { id: 'source', name: 'Source', icon: 'icon_drop', desc: 'Chaque tuile de rivière posée rapporte un point de plus.', levels: ['Normale', '+1 point'], costs: [6], requires: 'river' },
  { id: 'almanac', name: 'Almanach', icon: 'icon_save', desc: 'Des graines supplémentaires à chaque île terminée, même rejouée.', levels: ['Aucune', '+1 graine', '+2 graines'], costs: [4, 8] },
  { id: 'memory', name: 'Seconde chance', icon: 'icon_return', desc: 'Le souvenir (annuler) coûte moins de souffles.', levels: ['4 souffles', '3 souffles', '2 souffles'], costs: [4, 8], requires: 'breath' },
];

export const upgradeCost = (u, level) => (level < u.costs.length ? u.costs[level] : null);
export const upgradeMax = (u) => u.costs.length;
/** Première île qui introduit la mécanique requise par l'amélioration (null si aucune). */
export const upgradeUnlockIsland = (u, islands) => (u.requires ? (islands.find((i) => i.mechanics.includes(u.requires)) || { id: null }).id : null);
