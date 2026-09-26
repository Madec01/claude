// L'Atelier des saisons : améliorations achetées en graines. Chaque amélioration s'ouvre à un chapitre de la campagne
// (`chapter`) et, pour certaines, une fois sa mécanique introduite (`requires`, voir MECH_AT dans campaign.js).
import { CHAPTER_LEN, campaignMechanics } from './campaign.js';

export const UPGRADES = [
  // chapitre 1 : prise en main
  { id: 'sight', chapter: 1, name: 'Regard', icon: 'icon_target', desc: 'Voir plus loin dans la file, puis dans la main : quatre tuiles, puis cinq.', levels: ['3 tuiles', '4 tuiles', '5 tuiles'], costs: [4, 8] },
  { id: 'patience', chapter: 1, name: 'Patience des saisons', icon: 'icon_sun', desc: 'Chaque saison dure plus longtemps.', levels: ['Normale', '+1 pose', '+2 poses'], costs: [5, 9] },
  // chapitre 2 : vœux, souffles, rares
  { id: 'breath', chapter: 2, name: 'Souffle de départ', icon: 'icon_wind', desc: 'Commencer chaque île avec des souffles en réserve.', levels: ['0', '+2', '+4', '+6'], costs: [3, 6, 9], requires: 'breath' },
  { id: 'rare', chapter: 2, name: 'Semence rare', icon: 'icon_diamond', desc: 'Une tuile rare offerte au début de chaque île.', levels: ['Aucune', 'Puits', 'Moulin', 'Grenier'], costs: [6, 10, 12], requires: 'rare' },
  // chapitre 3 : surprises de saison, collines, lande
  { id: 'source', chapter: 3, name: 'Source', icon: 'icon_drop', desc: 'Chaque tuile de rivière posée rapporte un point de plus.', levels: ['Normale', '+1 point'], costs: [6], requires: 'river' },
  { id: 'refuge', chapter: 3, name: 'Refuge', icon: 'icon_home', desc: 'Chaque animal présent rapporte plus de points à chaque changement de saison.', levels: ['Normal', '+1 point', '+2 points'], costs: [5, 9], requires: 'fauna' },
  { id: 'almanac', chapter: 3, name: 'Almanach', icon: 'icon_save', desc: 'Des graines supplémentaires à chaque île terminée, même rejouée.', levels: ['Aucune', '+1 graine', '+2 graines'], costs: [4, 8] },
  // chapitre 4 : bâtir
  { id: 'frame', chapter: 4, name: 'Charpente', icon: 'icon_wrench', desc: 'Bâtir coûte un souffle de moins (niveau 2 : un souffle, niveau 3 : deux).', levels: ['Normal', '−1 souffle'], costs: [8], requires: 'build' },
  // chapitre 5 : climats et fusions
  { id: 'still', chapter: 5, name: 'Alambic', icon: 'icon_swap', desc: 'La première fusion de chaque île ne coûte aucun souffle.', levels: ['Normal', '1re fusion offerte'], costs: [8], requires: 'fuse' },
  { id: 'cloak', chapter: 5, name: 'Manteau', icon: 'icon_snow', desc: 'La contrainte du climat s’adoucit : au chaud les prés ne sèchent plus dès le printemps, au froid les champs ne dorment qu’en hiver, à l’humide un hameau contre un marais ne perd que 1.', levels: ['Normal', 'Adouci'], costs: [10], requires: 'climate' },
  // chapitre 7 : niveau 3
  { id: 'master', chapter: 7, name: 'Maître d’œuvre', icon: 'icon_gear', desc: 'Une tuile de niveau 2 peut passer au niveau 3 sans attendre une saison.', levels: ['Une saison', 'Aussitôt'], costs: [10], requires: 'build3' },
  // chapitres 8 et 9 : prestige
  { id: 'evening', chapter: 9, name: 'Étoile du soir', icon: 'icon_star', desc: 'Chaque nouvelle étoile rapporte une graine de plus.', levels: ['1 graine', '2 graines'], costs: [14] },
];

export const upgradeCost = (u, level) => (level < u.costs.length ? u.costs[level] : null);
export const upgradeMax = (u) => u.costs.length;
/** Chapitre atteint par le joueur d'après la dernière île débloquée. */
export const playerChapter = (unlockedIsland) => Math.max(1, Math.ceil(Math.max(1, unlockedIsland || 1) / CHAPTER_LEN));
/** Les améliorations ouvertes (chapitre atteint, mécanique arrivée), pas au maximum, que les graines paient maintenant. */
export function upgradesAPortee(c) {
  const chap = playerChapter(c.unlockedIsland), mech = campaignMechanics(Math.max(1, c.unlockedIsland || 1));
  return UPGRADES.filter((u) => { const cost = upgradeCost(u, (c.upgrades || {})[u.id] || 0); return u.chapter <= chap && (!u.requires || mech.has(u.requires)) && cost !== null && (c.seeds || 0) >= cost; });
}
/** Celles que le joueur n'a pas encore vues à portée : l'Atelier note ce qu'il montre (`atelierVu`), et c'est ce qui manque à cette liste qui vaut un rappel. */
export const upgradesNeuvesAPortee = (c) => upgradesAPortee(c).filter((u) => !(c.atelierVu || []).includes(u.id));
/** Première île qui introduit la mécanique requise par l'amélioration (null si aucune). */
export const upgradeUnlockIsland = (u, islands) => (u.requires ? (islands.find((i) => i.mechanics.includes(u.requires)) || { id: null }).id : null);
