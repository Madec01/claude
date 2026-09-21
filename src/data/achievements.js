// Succès : trente-trois vignettes à débloquer, une graine chacune. `target` : succès qui se compte (barre de progression) ;
// `hidden` : le nom reste caché tant qu'il n'est pas obtenu. Les conditions sont évaluées dans src/game/achievements.js.
export const ACHIEVEMENT_CATS = { start: 'Prise en main', water: 'Eau et saisons', fauna: 'Faune', people: 'Habitants et vœux', build: 'Bâtir, fusions, ouvrages', campaign: 'Campagne', elsewhere: 'Ailleurs' };

export const ACHIEVEMENTS = [
  // prise en main
  { id: 'premiere-tuile', cat: 'start', name: 'Première tuile', desc: 'Poser sa première tuile.' },
  { id: 'un-toit', cat: 'start', name: 'Un toit', desc: 'Fermer une première région.' },
  { id: 'bourg', cat: 'start', name: 'Bourg', desc: 'Fermer une région de hameaux d’au moins quatre tuiles.' },
  { id: 'grand-domaine', cat: 'start', name: 'Grand domaine', desc: 'Fermer une région de dix tuiles ou plus.' },
  { id: 'coup-de-maitre', cat: 'start', name: 'Coup de maître', desc: 'Réussir dix « Coup de maître ! » en tout.', target: 10, counter: 'masters' },
  { id: 'sans-faute', cat: 'start', name: 'Sans faute', desc: 'Huit bons coups d’affilée.' },
  { id: 'sans-regret', cat: 'start', name: 'Sans regret', desc: 'Finir une île de campagne sans utiliser Souvenir.', hidden: true },
  // eau et saisons
  { id: 'la-source', cat: 'water', name: 'La source', desc: 'Faire une rivière de six tuiles.' },
  { id: 'jusqu-a-la-mer', cat: 'water', name: 'Jusqu’à la mer', desc: 'Une rivière qui atteint la mer.' },
  { id: 'le-lac', cat: 'water', name: 'Le lac', desc: 'Une rivière qui se jette dans un lac.', hidden: true },
  { id: 'veillee', cat: 'water', name: 'Veillée', desc: 'Deux hameaux reliés par la glace en hiver.' },
  { id: 'quatre-saisons', cat: 'water', name: 'Quatre saisons', desc: 'Traverser les quatre saisons sur une même île.' },
  { id: 'grande-foire', cat: 'water', name: 'Grande foire', desc: 'Vingt récoltes d’automne en tout.', target: 20, counter: 'harvests' },
  // faune
  { id: 'compagnie', cat: 'fauna', name: 'Compagnie', desc: 'Cinq espèces différentes sur une même île.' },
  { id: 'menagerie', cat: 'fauna', name: 'Ménagerie', desc: 'Avoir vu chacune des onze espèces.', target: 11, counter: 'species' },
  { id: 'l-ours', cat: 'fauna', name: 'L’ours', desc: 'Faire venir l’ours.' },
  { id: 'les-manchots', cat: 'fauna', name: 'Les manchots', desc: 'Faire venir les manchots.', hidden: true },
  // habitants et vœux
  { id: 'promesse-tenue', cat: 'people', name: 'Promesse tenue', desc: 'Exaucer un premier vœu.' },
  { id: 'toute-l-ile', cat: 'people', name: 'Toute l’île', desc: 'Exaucer tous les vœux d’une île à quatre vœux.' },
  { id: 'cinquante-promesses', cat: 'people', name: 'Cinquante promesses', desc: 'Cinquante vœux exaucés en tout.', target: 50, counter: 'wishes' },
  // bâtir, fusions, ouvrages
  { id: 'charpentier', cat: 'build', name: 'Charpentier', desc: 'Bâtir vingt tuiles en tout.', target: 20, counter: 'built' },
  { id: 'signature', cat: 'build', name: 'Signature', desc: 'Amener une tuile au niveau 3.' },
  { id: 'le-cahier-complet', cat: 'build', name: 'Le Cahier complet', desc: 'Découvrir les six recettes de fusion.', target: 6, counter: 'recipes' },
  // Ce succès récompensait le port, recette retirée en attendant le Livre II (il n'y a pas de tuile de
  // mer à marier : un port se formait donc toujours sur un étang). Il garde son identifiant — le
  // supprimer changerait le compte des succès et fausserait les sauvegardes existantes — et récompense
  // désormais la cascade, qui demande la même idée : marier l'eau à ce qui n'est pas elle.
  { id: 'port-d-attache', cat: 'build', name: 'Le saut de l’eau', desc: 'Faire une cascade.' },
  { id: 'bien-place', cat: 'build', name: 'Bien placé', desc: 'Dix ouvrages bien placés à la fin d’une île.' },
  { id: 'frais-du-jour', cat: 'build', name: 'Frais du jour', desc: 'Un ouvrage frais qui rapporte pendant six saisons.' },
  // campagne
  { id: 'chapitre-clos', cat: 'campaign', name: 'Chapitre clos', desc: 'Quinze étoiles sur un chapitre.' },
  { id: 'les-quatre-climats', cat: 'campaign', name: 'Les quatre climats', desc: 'Trois étoiles sur une île de chaque climat.', target: 4, counter: 'climates3' },
  { id: 'cent-saisons', cat: 'campaign', name: 'Cent saisons', desc: 'Terminer l’île 50.' },
  { id: 'cent-cinquante', cat: 'campaign', name: 'Cent cinquante', desc: 'Toutes les étoiles de la campagne.', target: 150, counter: 'stars' },
  // ailleurs
  { id: 'lever-du-jour', cat: 'elsewhere', name: 'Lever du jour', desc: 'Sept Îles du jour d’affilée.', target: 7, counter: 'dailyStreak' },
  { id: 'sans-fin', cat: 'elsewhere', name: 'Sans fin', desc: 'Deux cents tuiles sur l’Île infinie.', target: 200, counter: 'infiniteBest' },
  { id: 'prudence', cat: 'elsewhere', name: 'Prudence', desc: 'Télécharger une copie de sa sauvegarde.' },
];
export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
export const ACHIEVEMENT_SEED = 1;   // graine offerte par succès
