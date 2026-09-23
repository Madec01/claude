// L'arbre des tuiles de pépin : trois niveaux au plus, le vocabulaire du jeu, et pour chaque feuille les deux ou
// trois questions qui permettent de REPRODUIRE. Voir docs/SECTION_BUGS_TUILES.md.
//
// Règle de tenue (journal de bord, en-tête) : toute mécanique, tuile, règle, écran ou réglage NOUVEAU ajoute sa
// tuile ici. Sans quoi l'arbre vieillit et le joueur écrit dans « Autre chose ».
//
// n  : le nom affiché      q  : les questions du mode « pépin »
// e  : les enfants         i  : la question propre à la branche, en mode « idée »
// Le chemin d'une tuile (« graphisme/sprites/foret ») est son identité : il part dans le rapport et devient
// l'étiquette de l'issue, à ses trois niveaux.

/** Feuille : un identifiant, un nom, des questions. */
const f = (id, n, ...q) => ({ id, n, q });
/** La sortie de secours, à chaque niveau. */
const autre = (q = 'Qu’est-ce qui cloche, et où ?') => f('autre', 'Autre chose', q);

export const TREE = [
  {
    id: 'graphisme', n: 'Graphisme', s: 'ce qu’on voit',
    q: ['Quelle saison ?', 'Ça le fait partout sur l’île ou à un seul endroit ?'],
    i: 'Qu’est-ce que tu voudrais voir à la place, ou en plus ?',
    e: [
      { id: 'sprites', n: 'Sprites et décor', q: ['Quelle famille de tuiles ?', 'Une seule tuile ou toutes celles de sa famille ?'], e: [
        f('foret', 'Forêt et arbres', 'Quelle saison ?', 'Un arbre dépasse de l’hexagone ?', 'Toute la forêt ou un seul arbre ?'),
        f('hameau', 'Hameaux et bâtiments', 'Quelle couleur de toit ?', 'Le bâtiment se répète à l’identique ?', 'Il passe devant son voisin ?'),
        f('roche', 'Roche et montagnes', 'Le massif est troué au milieu, ou nu en bas ?', 'Les pierres débordent sur la case voisine ?'),
        f('champ', 'Champs et cultures', 'Les sillons se coupent au bord de la tuile ?', 'Ils sont décalés d’une rangée ?'),
        f('prairie', 'Prairie, marais, lande', 'La floraison de printemps est là ?', 'Le pré sec ressemble-t-il à un pré sec ?'),
        f('verger', 'Verger', 'Fleuri au printemps, chargé en été, cuivré en automne, nu en hiver ?', 'Quelle saison cloche ?'),
        f('sable', 'Sable et dunes', 'Le sol jure avec l’eau à côté ?', 'La roche brune est-elle là ?'),
        f('colline', 'Collines', 'Le talus est-il net ?', 'La colline se confond avec la prairie ?'),
        f('bati', 'Tuiles bâties (niveau 2 et 3)', 'Quel niveau ?', 'Le village est-il plus dense qu’avant ?', 'La pièce maîtresse est-elle au centre ?'),
        f('rare', 'Tuiles rares', 'Laquelle (moulin, chapelle, tour de guet, puits, campement, grenier) ?', 'Elle s’affiche vide ou comme une prairie ?'),
        f('ouvrage', 'Ouvrages', 'Lequel ?', 'Il est tourné dans le mauvais sens ?', 'Le « ! » rouge reste après correction ?'),
        f('fusion', 'Fusions', 'Quelle recette ?', 'Un élément manque (la vague de la cascade, la porte de la grotte) ?'),
        f('friche', 'Friches', 'Quelle famille est tombée en friche ?', 'Le sol redevient-il normal après remise en état ?'),
        f('pousses', 'Jeunes pousses (croissance annoncée)', 'Les pousses restent-elles après que la tuile a grandi ?'),
        autre('Qu’est-ce qui est mal dessiné, et où ?'),
      ] },
      { id: 'sol', n: 'Sol des tuiles et raccords', q: ['Quelle saison ?', 'Entre quelles deux familles ?'], e: [
        f('saison', 'Couleur de saison du sol', 'Le sol est trop clair, trop foncé, ou de la mauvaise saison ?'),
        f('couture', 'Trait ou couture entre deux tuiles', 'Tu vois un trait, une couture ou une marche ?', 'Ça bouge quand tu zoomes ?'),
        f('vides', 'Cases vides et liserés', 'Les cases libres brillent-elles quand il faut ?', 'Le liseré doré apparaît sans raison ?'),
        f('ombre', 'Ombre sous les tuiles', 'L’ombre est-elle du bon côté ?', 'Elle manque complètement ?'),
        f('climat', 'Voile de climat', 'Quel climat ?', 'Le voile déborde-t-il sur la mer ?'),
        f('grille', 'Option « Grille discrète »', 'L’option est-elle cochée ?', 'Le contour apparaît-il quand même ?'),
        autre('Ce qui cloche dans le fond des tuiles ?'),
      ] },
      { id: 'eau', n: 'Eau et mer', q: ['Quelle saison ?'], e: [
        f('etang', 'Étang et lac', 'Combien de tuiles d’eau collées ?', 'La nappe a-t-elle une couture ?'),
        f('riviere', 'Rivière', 'Part-elle bien de la roche ?', 'Le ruban sort-il des tuiles d’eau ?', 'L’écume défile-t-elle à l’envers ?'),
        f('glace', 'Glace d’hiver', 'La glace apparaît-elle hors de l’hiver ?', 'Les fissures sont-elles là ?'),
        f('ecume', 'Écume de côte et vagues', 'Une vague est plantée sur la terre ?', 'L’écume suit-elle la côte ?'),
        f('voilier', 'Voilier et baleine', 'Le bateau coupe-t-il l’île ?', 'La baleine flotte-t-elle hors de l’eau ?'),
        autre('Ce qui cloche dans l’eau ou la mer ?'),
      ] },
      { id: 'faune', n: 'Faune à l’écran', q: ['Quel animal ?', 'Sur quelle famille de tuiles ?'], e: [
        f('place', 'Un animal mal dessiné ou mal placé', 'Il flotte au-dessus de son ombre ?', 'Il sort de sa région ?'),
        f('marche', 'La marche', 'Il glisse sans bouger les pattes ?', 'Il marche à reculons ?'),
        f('arrivee', 'Arrivée et départ', 'Qu’as-tu posé juste avant ?', 'Est-il parti sans raison ?'),
        autre('Ce qui cloche chez les animaux ?'),
      ] },
      { id: 'chemins', n: 'Sentiers, ruelles, ponts', q: ['Quelle saison ?'], e: [
        f('sentier', 'Sentier entre deux villages', 'Il traverse une tuile qu’il ne devrait pas ?', 'Il s’arrête en plein milieu ?'),
        f('ruelles', 'Ruelles du village', 'Elles passent par-dessus une maison ?', 'Elles relient les mauvaises tuiles ?'),
        f('pont', 'Pont et jetée', 'Le pont est-il en travers du courant ?', 'La jetée part-elle de la rive du hameau ?'),
        f('couleur', 'Couleur de saison des chemins', 'Elle correspond à la saison affichée ?'),
        autre('Ce qui cloche dans les chemins ?'),
      ] },
      { id: 'effets', n: 'Habillage des saisons et effets', q: ['Quel événement ou quel moment exactement ?'], e: [
        f('orage', 'Averses des semailles, éclair', 'Le voile reste-t-il après la saison ?', 'La pluie passe-t-elle devant le HUD ?'),
        f('canicule', 'Chaleur (grandes chaleurs, feux)', 'La chaleur tremblante est-elle là ?', 'Le voile ocre reste-t-il ?'),
        f('vent', 'Vent de foire', 'Les rafales de feuilles traversent-elles l’île ?'),
        f('bourrasque', 'Neige du grand froid', 'Les congères apparaissent-elles partout ?', 'Restent-elles après la saison ?'),
        f('particules', 'Particules', 'Elles partent du bon endroit ?', 'Il y en a trop, ou plus du tout ?'),
        f('vol', 'Points qui volent (changement de saison)', 'L’étincelle part-elle de la bonne tuile ?', 'Il en reste en l’air ?'),
        f('onde', 'Onde de fermeture de région', 'L’onde couvre-t-elle toute la région ?', 'Part-elle de la mauvaise case ?'),
        f('transition', 'Transition de saison (le balayage)', 'Une bande reste figée ?', 'Des tuiles restent dans l’ancienne saison ?'),
        f('finale', 'Tournée finale', 'À quel moment (le recul, un plan, la vague, une saison, la carte postale) ?', 'La caméra va-t-elle au bon endroit ?'),
        f('tremblement', 'Tremblement de l’écran', 'Trop fort, trop fréquent ?', 'L’option est-elle coupée ?'),
        autre('Quel effet cloche, et à quel moment ?'),
      ] },
      { id: 'hud', n: 'HUD (ce qui s’affiche mal)', q: ['Téléphone tenu en portrait ou en paysage ?', 'Quel élément se chevauche ?'], e: [
        f('saison', 'Barre de saison', 'Le nom, la règle ou les pastilles sont coupés ?', 'La barre passe-t-elle sur deux lignes ?'),
        f('score', 'Compteur de points', 'Le badge « +N » déborde ?', 'Le compte monte-t-il jusqu’au bon total ?'),
        f('file', 'File de tuiles / main', 'Une tuile est-elle coupée ?', 'La file déborde-t-elle de l’écran ?'),
        f('voeux', 'Vœux', 'Le panneau cache-t-il l’île ?', 'Le bouton est-il atteignable au pouce ?'),
        f('bords', 'Chiffres sur les bords des cases', 'Ils se chevauchent ?', 'Le badge du total sort de l’écran ?'),
        f('ruban', 'Ruban des mots et notifications', 'Deux messages se marchent dessus ?', 'Ça cache la file ?'),
        f('boutons', 'Boutons ronds (pause, journal, plein écran)', 'Trop petits à toucher ?', 'Sous l’encoche du téléphone ?'),
        f('poser', 'Bouton « Poser ici »', 'Il reste après la pose ?', 'Il cache la case visée ?'),
        f('fiche', 'Fiche de la tuile', 'Elle masque le plateau ?', 'Elle déborde ?'),
        autre('Quel bloc du HUD s’affiche mal ?'),
      ] },
      { id: 'camera', n: 'Caméra et cadrage', q: [], e: [
        f('zoom', 'Zoom', 'Il saute ?', 'Il se bloque à une limite ?', 'Au doigt ou à la molette ?'),
        f('pan', 'Déplacement de la vue', 'Elle reste accrochée ?', 'Elle bouge trop facilement ?'),
        f('cadrage', 'Cadrage automatique', 'L’île est-elle coupée par le HUD ?', 'Le recadrage t’a-t-il perdu ?'),
        f('repos', 'Mode repos (l’interface qui s’efface)', 'Ça se déclenche pendant que tu réfléchis ?', 'Un geste la rétablit-il ?'),
        autre('Ce qui cloche dans la vue ?'),
      ] },
      { id: 'postcard', n: 'Carte postale', q: [], e: [
        f('image', 'L’image', 'L’île est-elle bien cadrée ?', 'Un texte dépasse-t-il ?'),
        f('infos', 'Les informations', 'Nom, chapitre, saison, étoiles, score, date : lesquels sont faux ?'),
        f('sortie', 'Téléchargement et partage', 'Le fichier est-il arrivé ?', 'Depuis le bilan ou la pause ?'),
      ] },
    ],
  },

  {
    id: 'son', n: 'Son et vibrations',
    q: ['Sur téléphone ou sur ordinateur ?', 'Le son est-il coupé quelque part ?'],
    i: 'Qu’est-ce que tu voudrais entendre, ou ne plus entendre ?',
    e: [
      { id: 'musique', n: 'Musique', q: [], e: [
        f('saison', 'Musique de saison', 'Quelle saison ?', 'Deux musiques jouent-elles en même temps ?'),
        f('ecran', 'Musique d’un écran (menu, bilan, Jardin, Île du jour, fin)', 'Lequel ?', 'Elle continue après avoir changé d’écran ?'),
        f('boucle', 'La boucle', 'Y a-t-il un blanc ou un clic à la reprise ?'),
        autre('Quel problème de musique ?'),
      ] },
      { id: 'ambiance', n: 'Ambiance', q: [], e: [
        f('nature', 'Oiseaux, ruisseau, vent, grillons, mer, hiver', 'Laquelle est de trop ou absente ?', 'Que contient ton île ?'),
        f('pluie', 'Pluie et orage', 'L’ambiance reste-t-elle après la fin de l’orage ?'),
        f('volume', 'Le volume qui suit l’île', 'Il monte ou descend sans raison ?'),
        autre('Quel problème d’ambiance ?'),
      ] },
      { id: 'effets', n: 'Effets sonores', q: [], e: [
        f('pose', 'Son de pose', 'Absent, doublé, en retard ?'),
        f('notes', 'Notes par point marqué', 'Trop longues ?', 'Quel réglage « Notes du coup » ?'),
        f('fermeture', 'Accord de fermeture de région', 'Absent ?', 'Joué au mauvais moment ?'),
        f('animaux', 'Cris d’animaux', 'Quelle espèce ?', 'Trop fréquents ?'),
        f('divers', 'Sons de saison, de vœu, de souffle', 'Lequel manque ou tombe à côté ?'),
        autre('Quel son, à quel geste ?'),
      ] },
      { id: 'menus', n: 'Voix des menus et jingles', q: [], e: [
        f('clics', 'Clics et retours de boutons', 'Absents ?', 'Joués deux fois ?'),
        f('jingles', 'Jingle de succès, d’étoile, d’amélioration', 'Lequel ?', 'Il manque ou arrive en retard ?'),
        autre('Quel son d’interface ?'),
      ] },
      { id: 'volumes', n: 'Volumes et coupure', q: [], e: [
        f('curseurs', 'Les quatre curseurs', 'Lequel ?', 'Le changement s’entend-il tout de suite ?'),
        f('muet', 'Couper le son (M)', 'Coupe-t-il vraiment tout ?', 'Revient-il après un changement d’onglet ?'),
        f('depart', 'Le son qui ne démarre pas', 'As-tu du son après un premier toucher ?', 'Le téléphone est-il en silencieux ?'),
      ] },
      { id: 'vibrations', n: 'Vibrations', q: [], e: [
        f('trop', 'Trop, ou jamais', 'Android ou iPhone ?', 'L’option est-elle cochée ?', 'À quel moment exactement ?'),
      ] },
    ],
  },

  {
    id: 'regles', n: 'Règles et comptes', s: 'le jeu ne compte pas comme il faut',
    q: ['Quel score attendais-tu, et quel score as-tu eu ?'],
    i: 'Qu’est-ce qui te semble injuste, plat ou trop prévisible ?',
    e: [
      { id: 'pose', n: 'Points d’une pose', q: [], e: [
        f('bord', 'Points d’un bord', 'Quelles deux familles ?', 'Quel chiffre était affiché ?', 'Une des deux était-elle bâtie ?'),
        f('total', 'Le total annoncé avant la pose', 'Faisait-il la somme des bords ?', 'Combien as-tu encaissé ?'),
        f('prime', 'Prime de pose (eau, rivière, surprise, climat)', 'Quelle prime attendue ?', 'Quel libellé dans le détail ?'),
        f('ruban', 'Le mot du ruban (Coup de maître, Il y avait mieux…)', 'Quel mot ?', 'Le coup te semblait meilleur ou pire ?'),
        f('friche', 'Friche (une pose négative)', 'Quel total négatif ?', 'Ta région s’est-elle quand même fermée ?'),
        f('reparer', 'Remise en état d’une friche', 'La case était-elle proposée ?', 'Le souffle a-t-il été débité ?'),
        autre('Quel compte est faux à la pose ?'),
      ] },
      { id: 'regions', n: 'Régions et fermetures', q: [], e: [
        f('ferme', 'Une région ne se ferme pas', 'Reste-t-il une case vide ?', 'Est-ce la mer ou une case libre ?'),
        f('prime', 'La prime de fermeture', 'Quelle famille ?', 'Quelle prime reçue ?', 'Une tour de guet dedans ?'),
        f('taille', 'La taille d’une région', 'Quelle taille annoncée ?', 'Des tuiles bâties comptent-elles double ou triple ?'),
        f('trou', 'Fermeture malgré un trou (tour de guet, fortin)', 'Combien de cases vides ?', 'La prime est-elle tombée ?'),
        f('multiple', 'Fermetures multiples en une pose', 'Combien de régions ?', 'Toutes payées ?'),
        f('souffle', 'Le souffle de fermeture', 'Le compteur a-t-il bougé ?'),
        autre('Quel problème de région ?'),
      ] },
      { id: 'eau', n: 'Eau et rivières', q: [], e: [
        f('nature', 'Étang, lac, lac de montagne', 'Quelle nature annoncée ?', 'Une roche ou colline touche-t-elle l’eau ?'),
        f('riviere', 'Rivière', 'Est-ce bien une ligne ?', 'Une extrémité touche-t-elle une roche ou une colline ?'),
        f('fourche', 'Rivière-lac (la fourche)', 'Où était la fourche ?', 'Quelle partie comptait comme rivière ?'),
        f('mer', 'Arrivée à la mer', 'Quelle extrémité touchait la mer ?', 'Le +3 est-il tombé ?'),
        f('gel', 'Gel de l’hiver', 'Quel climat, quelle règle ?', 'Un redoux est-il passé ?'),
        f('veillee', 'Veillée (hameaux reliés par la glace)', 'Combien de hameaux au bord ?', 'Combien de paires payées ?'),
        autre('Quel problème d’eau ?'),
      ] },
      { id: 'saisons', n: 'Saisons et règles de saison', q: [], e: [
        f('changement', 'Le changement de saison', 'La ligne de pastilles était-elle pleine ?', 'Combien de poses ?'),
        f('regle', 'La règle annoncée', 'Laquelle (Crue, Semailles, Nichées, Sécheresse, Grandes chaleurs, Feux de broussaille, Récolte, Grande foire, Chasse et cueillette, Veillée, Grand froid, Hiver doux) ?', 'Ses effets ont-ils suivi ?'),
        f('primes', 'Les points de fin de saison', 'Quelle source manquait au relevé ?'),
        f('retard', 'Points en retard d’une saison', 'Chasse (animaux de forêt) ou Grand vent (moulins) ? Ils paient la saison suivante.'),
        f('longue', 'Saison longue (climat chaud ou froid)', 'Quelle saison s’est répétée ?', 'Combien de fois ?'),
        f('releve', 'Relevé de saison', 'Quel réglage ?', 'Le total colle-t-il à la somme des lignes ?'),
        autre('Quel problème de saison ?'),
      ] },
      { id: 'climat', n: 'Climat et surprises de saison', q: [], e: [
        f('chaud', 'Climat chaud', 'Le +2 sur l’eau tombait-il ?', 'Tes prés ont-ils séché dès le printemps ?'),
        f('humide', 'Climat humide', 'Le −2 hameau–marais était-il annoncé ?', 'Ton sentier de trois cases a-t-il disparu ?'),
        f('froid', 'Climat froid', 'Le bois de chauffage tombait-il ?', 'Les marais ont-ils fleuri malgré tout ?'),
        f('manteau', 'Manteau (l’amélioration qui adoucit)', 'Achetée ?', 'La contrainte s’appliquait-elle encore ?'),
        f('surprise', 'Une surprise de saison', 'Laquelle était écrite sous la saison ?', 'Quel effet attendais-tu, lequel as-tu vu ?'),
        autre('Quel problème de climat ou de surprise ?'),
      ] },
      { id: 'faune', n: 'Faune', q: ['Quelle espèce ?', 'Combien d’animaux étaient affichés ?'], e: [
        f('absent', 'Un animal ne vient pas', 'Quel habitat as-tu construit ?', 'Quelle taille ?', 'Quelle saison ?'),
        f('part', 'Un animal part', 'Qu’as-tu posé juste avant ?', 'Le pré a-t-il séché, l’eau dégelé ?'),
        f('points', 'Les points par animal', 'Combien d’animaux comptés ?', 'Combien de points à la saison ?'),
        f('souffle', 'Le souffle pour deux animaux', 'Combien d’animaux ?', 'Combien de souffles reçus ?'),
        f('attache', 'Animaux liés à une fusion ou un nichoir', 'Lequel ? Ceux-là ne rapportent pas de points, c’est voulu.'),
        autre('Quel problème de faune ?'),
      ] },
      { id: 'voeux', n: 'Vœux', q: [], e: [
        f('avancement', 'L’avancement d’un vœu', 'Quel vœu, quel objectif ?', 'Que compte le compteur ?'),
        f('exauce', 'Un vœu ne s’exauce pas', 'L’objectif te semblait-il atteint ?', 'À quelle pose ?'),
        f('echeance', 'Un vœu échoue trop tôt', 'Quelle échéance annoncée (poses ou saison) ?', 'As-tu vu le rappel ?'),
        f('recompense', 'La récompense', 'Qu’as-tu reçu ?', 'La rare est-elle entrée dans la file ?'),
        f('intro', 'La présentation des vœux au départ', 'Le texte correspondait-il à l’objectif du HUD ?'),
        autre('Quel problème de vœu ?'),
      ] },
      { id: 'souffles', n: 'Souffles et pouvoirs', q: [], e: [
        f('compteur', 'Le compteur de souffles', 'Combien avant, combien après ?', 'Quel geste ?'),
        f('echange', 'Échanger (2 / 3)', 'Avant ou après l’île 16 ?', 'Bourrasque active ?'),
        f('defausse', 'Défausser (X)', 'Le coût affiché était-il 0 (ouvrage) ou 2 ?', 'La file s’est-elle rechargée ?'),
        f('bourgeon', 'Bourgeon (B puis F / V)', 'Quelle prairie ?', 'Était-elle rare ou bâtie ?'),
        f('souvenir', 'Souvenir / annuler (Z)', 'Quel coût ?', 'L’avais-tu déjà utilisé cette saison ?', 'Tout est-il revenu ?'),
        f('poche', 'Poche (P)', 'Combien de places ?', 'La tuile est-elle ressortie en tête ?'),
        autre('Quel pouvoir a mal réagi ?'),
      ] },
      { id: 'file', n: 'File, main, poche, remise', q: [], e: [
        f('file', 'La file de tuiles', 'Combien de tuiles voyais-tu ?', 'Quelles améliorations (Regard, Longue-vue) ?'),
        f('main', 'La main de saison (dès l’île 16)', 'La tuile cliquée a-t-elle été jouée ?', 'Un souffle a-t-il été débité à tort ?'),
        f('injection', 'Une tuile qui arrive au mauvais endroit', 'Rare de vœu, retour de « bien bâtie », recette découverte ?', 'Où est-elle apparue ?'),
        f('remise', 'La remise (ouvrages, R)', 'Combien de poses restaient ?', 'Un second ouvrage a-t-il remplacé le premier ?'),
        f('fin', 'La fin de la file', 'Restait-il une tuile en poche ou en remise ?', 'Restait-il une case libre ?'),
        autre('Quel problème de file ?'),
      ] },
      { id: 'batir', n: 'Bâtir, fusionner, ouvrages', q: [], e: [
        f('niveau2', 'Bâtir (niveau 2)', 'Même famille exactement ?', 'Les bords ont-ils gagné +1 ?', 'La région a-t-elle grandi de 2 ?'),
        f('bienbati', 'Bien bâtie (la tuile qui revient)', 'Quelle raison affichée ?', 'Une tuile était-elle déjà revenue cette saison ?'),
        f('niveau3', 'Niveau 3 et signature', 'Depuis combien de saisons au niveau 2 ?', 'Quelle signature annoncée ?'),
        f('croissance', 'Croissance naturelle (dès l’île 41)', 'Combien de voisines de sa famille ?', 'As-tu vu les jeunes pousses ?', 'Qu’as-tu posé à côté ?'),
        f('fusion', 'Fusion', 'Quelles deux familles ?', 'La case était-elle surlignée ?', 'Le souffle a-t-il été débité ?'),
        f('prime', 'La prime d’une fusion', 'Quelle recette ?', 'Combien de voisines comptées ?', 'Chaque saison ou une fois ?'),
        f('cahier', 'Le Cahier des recettes', 'Était-ce ta première fois ?', 'As-tu reçu les deux tuiles ?'),
        f('ouvrage', 'Un ouvrage bien ou mal placé', 'Lequel ?', 'Sur quelle tuile ?', 'Quelles voisines ?'),
        f('frais', 'Ouvrage frais', 'Combien de poses après réception ?', 'Le +1 apparaissait-il ?'),
        autre('Quel problème en posant sur une tuile déjà posée ?'),
      ] },
      { id: 'rares', n: 'Tuiles rares', q: [], e: [
        f('famille', 'Ce pour quoi la rare compte', 'Laquelle ?', 'Pour quelle(s) famille(s) l’attendais-tu ?'),
        f('effet', 'L’effet d’une rare', 'Laquelle ?', 'Quel effet attendu (protection, bonus de bord, fermeture) ?'),
        autre('Quel problème de tuile rare ?'),
      ] },
      { id: 'etoiles', n: 'Étoiles, graines, Atelier', q: [], e: [
        f('nombre', 'Le nombre d’étoiles', 'Quel score, quels seuils affichés ?', 'Combien d’étoiles reçues ?'),
        f('or', 'L’étoile d’or', 'Le bilan l’annonçait-il ?', 'L’île brille-t-elle sur la carte ?'),
        f('change', 'Mes étoiles ont changé toutes seules', 'Dans quel sens ?', 'Après une mise à jour ou au lancement ?'),
        f('graines', 'Les graines', 'Combien attendais-tu ?', 'Combien reçues ?', 'Mode test actif ?'),
        f('amelioration', 'Une amélioration d’Atelier', 'Laquelle, quel niveau ?', 'As-tu vu son effet en partie ?'),
        f('verrou', 'Une amélioration reste verrouillée', 'Quel chapitre atteint ?', 'Que disait la carte grisée ?'),
        autre('Quel problème d’étoile ou de graine ?'),
      ] },
      { id: 'campagne', n: 'Campagne et chapitres', q: [], e: [
        f('deblocage', 'Une île ne se débloque pas', 'As-tu vu le bilan de la précédente ?', 'Que dit la carte verrouillée ?'),
        f('porte', 'Une porte de chapitre', 'Combien d’étoiles, combien de parties jouées ?', 'Les cinq îles sont-elles terminées ?'),
        f('semis', 'Semis', 'Lequel choisi ?', 'La file te semblait-elle suivre ce penchant ?'),
        f('signature', 'La signature d’une île (36 à 49)', 'Quelle signature annoncée ?', 'L’île correspondait-elle ?'),
        f('masque', 'Le masque ou la taille d’une île', 'Quelle île ?', 'Qu’est-ce qui te paraît faux ?'),
        autre('Quel problème de campagne ?'),
      ] },
      { id: 'bilan', n: 'Fin d’île et bilan', q: [], e: [
        f('fin', 'L’île s’arrête trop tôt ou trop tard', 'Restait-il une case libre ?', 'Une tuile en poche ou en remise ?'),
        f('ligne', 'Une ligne du bilan', 'Laquelle ?', 'Quelle valeur attendais-tu ?'),
        f('sources', '« D’où viennent les points »', 'Quelle ligne semble fausse ?', 'La somme fait-elle le score total ?'),
        f('meilleur', 'Le meilleur coup de la partie', 'Correspond-il à ce que tu as joué ?'),
        f('tournee', 'Les noms des lieux visités par la tournée', 'Quel nom tombe à côté ?', 'Un lieu est-il visité deux fois, ou oublié ?'),
        autre('Quel problème de fin d’île ?'),
      ] },
      { id: 'succes', n: 'Succès', q: [], e: [
        f('bloque', 'Un succès ne se débloque pas', 'Lequel ?', 'Quelle condition croyais-tu remplie ?'),
        f('progression', 'La progression d’un succès', 'Quel compte affiché ?', 'Quel compte attendu ?'),
        f('cache', 'Un succès caché', 'Est-il resté « ??? » après l’avoir obtenu ?'),
        autre('Quel problème de succès ?'),
      ] },
      autre('Qu’est-ce que le jeu a compté autrement que tu ne l’attendais ?'),
    ],
  },

  {
    id: 'interface', n: 'Interface et commandes', s: 'ça ne répond pas',
    q: ['Au doigt, à la souris ou au clavier ?', 'Ça le fait à chaque fois ?'],
    i: 'Quel geste aimerais-tu plus court, ou moins risqué ?',
    e: [
      { id: 'poser', n: 'Poser une tuile', q: [], e: [
        f('rien', 'La pose ne part pas', 'Combien de touchers as-tu faits ?', 'Le bouton « Poser ici » apparaissait-il ?'),
        f('ailleurs', 'La pose part au mauvais endroit', 'Quel niveau de zoom ?', 'Tu visais quelle case ?'),
        f('refus', 'Le refus est incompris', 'Quel message exact ?'),
        f('dessus', 'Bâtir / fusionner / poser un ouvrage au doigt', 'Les deux touchers marchent-ils ?', 'La case était-elle soulignée ?'),
        autre('Que fait le jeu au lieu de poser ?'),
      ] },
      { id: 'vue', n: 'Déplacer et zoomer', q: [], e: [
        f('undoigt', 'Un doigt qui glisse', 'La vue bouge-t-elle trop facilement ?', 'Ça a posé une tuile pendant le glissement ?'),
        f('deuxdoigts', 'Deux doigts', 'Le zoom saute-t-il ?', 'La page entière zoome-t-elle ?'),
        f('souris', 'Clic droit et molette', 'Le menu du navigateur s’ouvre-t-il ?', 'Le zoom part-il à l’envers ?'),
        f('accroche', 'La vue reste accrochée', 'Après un passage sur un panneau ?', 'Après un changement d’onglet ?'),
        autre('Quel geste de vue ne marche pas ?'),
      ] },
      { id: 'clavier', n: 'Les touches du clavier', q: [], e: [
        f('rien', 'Une touche ne fait rien', 'Laquelle ?', 'Elle marche au bouton mais pas au clavier ?'),
        f('autre', 'Une touche fait autre chose', 'Laquelle, et quoi ?'),
        f('echap', 'Échap et M', 'Échap a-t-il fermé autre chose que prévu ?', 'M coupe-t-il et remet-il bien ?'),
        autre('Quelle touche, quel effet attendu ?'),
      ] },
      { id: 'hud', n: 'Les blocs du HUD qui ne répondent pas', q: [], e: [
        f('pause', 'Bouton pause', 'Répond-il au premier toucher ?', 'Un panneau était-il déjà ouvert ?'),
        f('journal', 'Journal (ⓘ / J)', 'S’ouvre-t-il ?', 'Le badge de non-lus s’efface-t-il ?'),
        f('score', 'Détail des points (toucher le compteur)', 'La bulle s’ouvre-t-elle ?'),
        f('saison', 'Bulle de la saison', 'S’ouvre-t-elle au toucher ?', 'Se referme-t-elle toute seule ?'),
        f('voeux', 'Panneau des vœux', 'Se déplie-t-il ?', 'Se replie-t-il tout seul ?'),
        f('file', 'File / main', 'Le toucher joue-t-il la bonne tuile ?'),
        f('travers', 'Un toucher sur un panneau pose une tuile derrière', 'Quel panneau ?', 'Portrait ou paysage ?'),
        autre('Quel élément ne répond pas ?'),
      ] },
      { id: 'ecran', n: 'Disposition sur l’écran', q: [], e: [
        f('portrait', 'Portrait', 'Quel élément se chevauche ou sort de l’écran ?'),
        f('paysage', 'Paysage', 'Les souffles restent-ils atteignables ?', 'La file défile-t-elle ?'),
        f('encoche', 'Encoche, barre d’accueil', 'Quel modèle de téléphone ?', 'Quel élément passe dessous ?'),
        f('rotation', 'Rotation de l’écran', 'Pendant une partie ou dans un menu ?', 'A-t-il fallu recharger ?'),
        f('pleinecran', 'Plein écran', 'Quel bouton ?', 'Quel message reçu ?', 'Safari ou écran d’accueil ?'),
        f('petit', 'Un bouton trop petit à toucher', 'Lequel ?', 'Tu touches un bouton voisin ?'),
        autre('Quel problème de disposition ?'),
      ] },
      { id: 'tutoriel', n: 'Le tutoriel et les cartes', q: [], e: [
        f('premiere', 'Le tutoriel de la première île', 'À quelle étape ?', 'La case qui brille refuse-t-elle la tuile ?'),
        f('carte', 'Une carte d’explication', 'Laquelle ?', 'Elle revient alors que tu l’as vue ?', 'Elle bloque le jeu ?'),
        f('jamais', 'Une carte ne s’affiche jamais', 'Quelle mécanique aurait dû être expliquée ?'),
        autre('Quel problème de consigne ?'),
      ] },
      autre('Qu’est-ce qui ne répond pas, et à quel geste ?'),
    ],
  },

  {
    id: 'ecrans', n: 'Écrans et menus',
    q: ['Quel écran ?', 'Tu y venais d’où ?'],
    i: 'Qu’est-ce que tu cherches et que tu ne trouves pas ?',
    e: [
      { id: 'menu', n: 'Menu d’accueil', q: [], e: [
        f('reprendre', 'Bouton « Reprendre »', 'Quel texte affiché ?', 'L’île reprise est-elle la bonne ?'),
        f('carte', 'Carte des îles', 'Quel chapitre, quelle île ?', 'Que dit la carte grisée ?'),
        f('verrou', 'Un bouton verrouillé', 'Lequel ?', 'La condition annoncée est-elle remplie ?'),
        f('nouveau', 'La mention « nouveau »', 'Sur quel bouton ?', 'Reste-t-elle après avoir essayé ?'),
        f('pied', 'Le pied de page (étoiles, graines, version)', 'Quels chiffres ?', 'Collent-ils à ta progression ?'),
        autre('Quel problème au menu ?'),
      ] },
      { id: 'pause', n: 'Pause', q: [], e: [
        f('bouton', 'Un bouton mène ailleurs que prévu', 'Lequel ?', 'Où t’a-t-il envoyé ?'),
        f('perdue', 'La partie perdue en passant par la pause', 'Quel bouton touché avant ?'),
        autre('Quel problème en pause ?'),
      ] },
      { id: 'options', n: 'Options', q: [], e: [
        f('retenu', 'Un réglage n’est pas retenu', 'Lequel ?', 'Il revient après relance ou tout de suite ?'),
        f('ignore', 'Un réglage est ignoré en jeu', 'Lequel ?', 'Qu’attendais-tu ?'),
        f('test', 'Mode test', 'Est-il bien actif ?', 'Une progression a-t-elle été enregistrée quand même ?'),
        autre('Quel problème dans les Options ?'),
      ] },
      { id: 'guide', n: 'Guide et Cahier', q: [], e: [
        f('info', 'Une information du Guide semble fausse', 'Quel onglet ?', 'Quelle donnée ?'),
        f('cahier', 'Le Cahier des recettes', 'Combien découvertes annoncées ?', 'Une recette réussie n’est pas notée ?'),
        f('vide', 'Un onglet s’ouvre vide', 'Lequel ?'),
        autre('Quel problème dans le Guide ?'),
      ] },
      { id: 'apres', n: 'Bilan, Atelier, Succès, Crédits', q: [], e: [
        f('bilan', 'Le bilan', 'Quelle ligne ?', 'Quelle valeur attendue ?'),
        f('atelier', 'L’Atelier des saisons', 'Quelle carte ?', 'Le coût correspond-il aux graines retirées ?'),
        f('succes', 'L’écran des Succès', 'Quel succès ?', 'Une vignette manque (médaille grise à la place) ?'),
        f('credits', 'Les Crédits', 'Quelle section est vide ?', 'Un lien n’ouvre rien ?'),
        autre('Quel problème sur ces écrans ?'),
      ] },
      { id: 'depart', n: 'Écrans de départ d’île', q: [], e: [
        f('prep', 'Préparation d’île (nom, signature)', 'Quelle île ?', 'La signature annoncée est-elle la bonne ?'),
        f('semis', 'Choix du semis', 'Le choix est-il resté sélectionné ?'),
        f('voeux', 'Présentation des vœux', 'L’objectif annoncé colle-t-il à celui du HUD ?'),
        autre('Quel problème avant de commencer ?'),
      ] },
      { id: 'recit', n: 'Écrans narratifs', q: [], e: [
        f('texte', 'Texte coupé ou manquant', 'Quel écran ?', 'Copie ce que tu lis.'),
        f('passer', '« Passer » ne marche pas', 'A-t-il tout sauté ou rien ?'),
        f('souvenir', 'Un souvenir ne s’affiche pas', 'Quelle île terminée ?'),
        autre('Quel problème de récit ?'),
      ] },
      { id: 'bannieres', n: 'Bannières et messages', q: [], e: [
        f('bloquee', 'Une bannière reste bloquée', 'Laquelle (succès, mode ouvert, bon à savoir) ?'),
        f('superpose', 'Plusieurs bannières se superposent', 'Après quel événement ?'),
        f('toast', 'Un message du bas de l’écran', 'Lequel ?', 'Il disparaît trop vite ?'),
        autre('Quel message pose problème ?'),
      ] },
      autre('Quel écran, et qu’est-ce qui cloche ?'),
    ],
  },

  {
    id: 'sauvegarde', n: 'Sauvegarde et progression',
    q: ['Qu’as-tu perdu exactement ?', 'Après quoi (fermeture, mise à jour, changement d’appareil) ?'],
    i: 'De quoi voudrais-tu être sûr, et quand ?',
    e: [
      { id: 'perdue', n: 'Progression perdue ou changée', q: [], e: [
        f('etoiles', 'Étoiles, graines ou îles perdues', 'Combien avant, combien après ?', 'Sur quel navigateur ?'),
        f('zero', 'Le jeu est reparti de zéro', 'Un message est-il apparu ?', 'Navigation privée ?'),
        f('reglages', 'Mes réglages ne sont pas retenus', 'Lequel ?', 'As-tu effacé les données du site ?'),
        autre('Qu’est-ce qui n’a pas été gardé ?'),
      ] },
      { id: 'reprise', n: 'Reprendre une partie en cours', q: [], e: [
        f('disparu', 'Le bouton « Reprendre » a disparu', 'Depuis combien de temps l’avais-tu laissée ?', 'As-tu ouvert une autre île ?'),
        f('differente', 'La partie reprise n’est pas la même', 'Qu’est-ce qui a changé (plateau, file, saison, score, souffles) ?'),
        f('refus', '« Cette partie ne peut plus être reprise »', 'Quelle île était-ce ?', 'L’Île du jour de la veille ?'),
        autre('Quel problème de reprise ?'),
      ] },
      { id: 'fichier', n: 'Copie de sauvegarde (fichier)', q: [], e: [
        f('telecharger', 'Télécharger ma sauvegarde', 'Le fichier est-il arrivé ?', 'Sur quel appareil ?'),
        f('charger', 'Charger une sauvegarde', 'Le résumé affiché était-il celui du fichier ?', 'Qu’a-t-il remplacé ?'),
        f('refus', '« Ce fichier n’est pas une sauvegarde de Cent Saisons »', 'D’où vient le fichier ?'),
        f('rappel', 'Le rappel de copie', 'Apparaît-il, ou jamais ?', 'Quelle date de dernière copie ?'),
        autre('Quel problème de fichier ?'),
      ] },
      { id: 'nuage', n: 'Partie en ligne', q: [], e: [
        f('connexion', 'La connexion échoue', 'Quel choix (Google, sans compte, hors ligne) ?', 'Quel message exact ?'),
        f('boucle', 'L’écran de connexion revient en boucle', 'Sur quel navigateur ?', 'La fenêtre Google s’est-elle ouverte ?'),
        f('rattacher', 'Rattacher un compte Google', 'Jouais-tu sans compte avant ?', 'La progression a-t-elle suivi ?'),
        f('conflit', 'Deux parties proposées', 'Quels chiffres de chaque côté ?', 'Laquelle as-tu gardée ?'),
        f('verifier', '« Vérifier la connexion »', 'Quelle ligne est en ✗ ?', 'Quel détail affiché ?'),
        f('quota', 'Le quota (« le nuage se repose »)', 'Quel message ?', 'Avais-tu enchaîné beaucoup d’îles ?'),
        f('appareils', 'Ma partie ne suit pas d’un appareil à l’autre', 'Même compte des deux côtés ?', 'Quand as-tu fini ta dernière île ?'),
        autre('Quel problème avec le nuage ?'),
      ] },
      autre('Qu’est-ce qui n’a pas été gardé, et depuis quand ?'),
    ],
  },

  {
    id: 'technique', n: 'Lenteur, chargement, plantage',
    q: ['Quel appareil et quel navigateur ?', 'Ça le fait à chaque fois ?'],
    i: 'Qu’est-ce qui te fait attendre, et combien de temps ?',
    e: [
      { id: 'lancement', n: 'Le jeu ne se lance pas', q: [], e: [
        f('bloque', 'Bloqué sur l’écran de démarrage', 'À quel message ?', 'Quel pourcentage ?'),
        f('erreur', '« Erreur de chargement »', 'Quel message exact ?'),
        f('image', 'Une image manque (carré vide)', 'Quelle tuile ou icône ?', 'Après rechargement, pareil ?'),
        autre('Où ça bloque ?'),
      ] },
      { id: 'lenteur', n: 'Ça rame', q: [], e: [
        f('toujours', 'Ça saccade tout le temps', 'Combien d’images par seconde (Options) ?', 'Quel appareil ?'),
        f('moment', 'Ça saccade à un moment précis', 'Lequel (pose, changement de saison, orage, grande île) ?'),
        f('mer', 'La mer a changé d’aspect', 'C’est l’allègement automatique quand ça rame : à quel moment ?'),
        f('chauffe', 'Le téléphone chauffe ou la batterie tombe', 'Après combien de temps de jeu ?'),
        autre('Quand est-ce que ça rame ?'),
      ] },
      { id: 'fige', n: 'Ça s’est bloqué', q: [], e: [
        f('rien', 'Le jeu ne répond plus du tout', 'Qu’as-tu fait juste avant ?', 'L’écran bougeait-il encore ?'),
        f('ecran', 'Bloqué sur un écran', 'Lequel ?', 'Un bouton manquait-il ?'),
        f('partie', 'Impossible de continuer une partie', 'Restait-il des cases ?', 'Des tuiles ?'),
        autre('Où es-tu resté coincé ?'),
      ] },
      { id: 'plantage', n: 'Le jeu a planté', q: [], e: [
        f('ferme', 'La page s’est fermée ou rechargée toute seule', 'Qu’as-tu fait juste avant ?', 'Depuis combien de temps jouais-tu ?'),
        f('blanche', 'Page blanche', 'Après quel geste ?', 'Le rechargement a-t-il suffi ?'),
      ] },
      autre('Que s’est-il passé, et à quel moment ?'),
    ],
  },

  {
    id: 'textes', n: 'Textes',
    q: ['Sur quel écran ?', 'Copie le texte tel que tu le lis.'],
    i: 'Quelle phrase te fait tiquer, et comment tu la dirais ?',
    e: [
      f('faute', 'Faute d’orthographe ou de frappe', 'Où exactement ?', 'Copie la phrase.'),
      f('coupe', 'Texte coupé ou rogné', 'Téléphone tenu comment ?', 'Le texte est coupé ou le bouton déborde ?'),
      f('deborde', 'Texte qui déborde de son cadre', 'Quel bloc (bouton, ruban, fiche, notification) ?', 'Quel mot ?'),
      f('manquant', 'Texte manquant', 'Où ?', 'Quel texte attendais-tu ?'),
      f('technique', 'Un identifiant technique à la place d’un nom', 'Copie ce qui s’affiche.'),
      f('mot', 'Un mot qui n’est pas celui du jeu', 'Quel mot lu, quel mot attendu ?'),
      f('incoherent', 'Deux écrans qui ne disent pas la même chose', 'Quelle valeur ici, quelle valeur là ?'),
      f('petit', 'Texte trop petit ou illisible', 'Lequel ?', 'En plein soleil ou en intérieur ?'),
      autre('Quel texte, sur quel écran ?'),
    ],
  },
];

/** Les quatre raccourcis du haut, par mode : des étiquettes à plat, pas des branches. */
export const RACCOURCIS = {
  pepin: [
    { id: 'bloque', n: 'Ça s’est bloqué', q: ['Qu’as-tu fait juste avant ?', 'L’écran bougeait-il encore ?', 'As-tu pu continuer ?'] },
    { id: 'compte', n: 'Le compte est faux', q: ['Quel score attendais-tu, quel score as-tu eu ?', 'À quel moment l’as-tu vu ?'] },
    { id: 'place', n: 'C’est mal placé', q: ['Téléphone en portrait ou en paysage ?', 'Quel élément se chevauche ou sort de l’écran ?'] },
    { id: 'plantage', n: 'Le jeu a planté', q: ['Qu’as-tu fait juste avant ?', 'La page s’est-elle fermée ou rechargée ?'] },
  ],
  idee: [
    { id: 'compris', n: 'Je n’ai pas compris', q: ['Quelle règle ?', 'Où l’as-tu cherchée (Guide, carte, bandeau) ?', 'Qu’est-ce que tu croyais ?'] },
    { id: 'dur', n: 'C’est trop dur', q: ['Quelle île, quel moment ?', 'Qu’as-tu essayé ?', 'Tu es resté bloqué combien de temps ?'] },
    { id: 'facile', n: 'C’est trop facile', q: ['Quelle île, quel moment ?', 'Qu’est-ce qui ne te demandait aucun effort ?'] },
    { id: 'simple', n: 'Ce serait plus simple si…', q: ['Quel geste te coûte ?', 'Combien de fois par partie tu le fais ?'] },
  ],
};

/** En mode « idée », rien à reproduire : trois questions suffisent, partout. */
export const TRIO_IDEE = [
  'Qu’est-ce que tu aimerais ?',
  'Qu’est-ce qui te manque ou t’agace aujourd’hui ?',
  'À quel moment du jeu ça te viendrait ?',
];

/**
 * Les mots que le joueur tape, et qui ne sont dans aucun nom de tuile. Gardés à part plutôt que semés dans
 * l'arbre : on les relit d'un coup d'œil, et ajouter un synonyme ne demande pas de toucher à l'arbre.
 * Un mot posé sur une branche vaut pour toutes ses feuilles.
 */
export const MOTS = {
  graphisme: ['image', 'affichage', 'moche', 'laid', 'dessin', 'visuel', 'couleur', 'pixel'],
  'graphisme/sprites': ['tuile', 'objet', 'batiment', 'maison', 'arbre', 'decor'],
  'graphisme/sprites/roche': ['montagne', 'caillou', 'pierre', 'massif', 'rocher'],
  'graphisme/sprites/hameau': ['village', 'maison', 'toit', 'bourg'],
  'graphisme/effets': ['animation', 'particule', 'meteo'],
  'graphisme/camera': ['vue', 'zoom', 'cadrage', 'deplacement'],
  'graphisme/hud': ['interface', 'barre', 'affichage', 'ecran', 'coupe', 'rogne', 'deborde'],
  son: ['audio', 'bruit', 'musique', 'volume', 'silence', 'sourd'],
  'son/vibrations': ['haptique', 'vibre', 'vibreur'],
  regles: ['score', 'points', 'compte', 'calcul', 'injuste', 'faux', 'fausse', 'mauvais', 'incorrect', 'errone', 'compte pas', 'pas compte'],
  'regles/pose': ['poser', 'placement', 'bord', 'affinite'],
  'regles/regions': ['fermer', 'fermeture', 'cloture', 'prime', 'encercler'],
  'regles/eau': ['riviere', 'lac', 'etang', 'mer', 'gel', 'glace'],
  'regles/saisons': ['printemps', 'ete', 'automne', 'hiver', 'regle de saison'],
  'regles/climat': ['chaud', 'froid', 'humide', 'orage', 'canicule', 'vent', 'neige'],
  'regles/faune': ['animal', 'animaux', 'bete', 'lapin', 'ours', 'elan', 'canard', 'hibou', 'manchot', 'grenouille', 'poule', 'cheval', 'vache', 'chevre'],
  'regles/voeux': ['objectif', 'quete', 'demande', 'habitant', 'promesse'],
  'regles/souffles': ['pouvoir', 'energie', 'annuler', 'echanger', 'defausser', 'bourgeon', 'poche'],
  'regles/file': ['main', 'tuiles a venir', 'prochaine tuile', 'remise'],
  'regles/batir': ['construire', 'niveau 2', 'niveau 3', 'fusion', 'fusionner', 'ouvrage', 'signature', 'croissance'],
  'regles/rares': ['moulin', 'chapelle', 'puits', 'campement', 'grenier', 'tour de guet'],
  'regles/etoiles': ['graine', 'atelier', 'amelioration', 'seuil', 'etoile d or'],
  'regles/campagne': ['chapitre', 'porte', 'archipel', 'semis', 'debloquer', 'verrouille', 'ile suivante'],
  'regles/bilan': ['fin de partie', 'resultat', 'recapitulatif'],
  interface: ['commande', 'bouton', 'touche', 'clic', 'toucher', 'repond pas', 'reagit pas'],
  'interface/poser': ['poser', 'placer', 'pose pas', 'refuse'],
  'interface/vue': ['glisser', 'pincer', 'zoomer', 'deplacer', 'scroll', 'defiler'],
  'interface/clavier': ['touche', 'raccourci'],
  'interface/ecran': ['portrait', 'paysage', 'rotation', 'plein ecran', 'encoche', 'trop petit', 'deborde'],
  'interface/tutoriel': ['consigne', 'aide', 'explication', 'carte'],
  ecrans: ['menu', 'panneau', 'page', 'fenetre'],
  'ecrans/menu': ['accueil', 'carte des iles', 'reprendre', 'continuer'],
  'ecrans/options': ['reglage', 'parametre', 'preference'],
  'ecrans/guide': ['cahier', 'aide', 'recette'],
  'ecrans/apres': ['bilan', 'atelier', 'succes', 'credits', 'trophee'],
  sauvegarde: ['perdu', 'progression', 'compte', 'nuage', 'cloud', 'synchro', 'google', 'sauvegarder'],
  'sauvegarde/reprise': ['reprendre', 'partie en cours', 'continuer'],
  'sauvegarde/nuage': ['en ligne', 'google', 'connexion', 'synchronisation', 'firebase', 'appareil'],
  technique: ['bug', 'crash', 'plante', 'plantage', 'lent', 'lag', 'rame', 'fps', 'freeze', 'fige', 'bloque'],
  'technique/lenteur': ['lag', 'rame', 'fps', 'saccade', 'ralenti', 'images par seconde', 'chauffe'],
  'technique/fige': ['bloque', 'coince', 'freeze', 'repond plus'],
  'technique/plantage': ['crash', 'ferme', 'page blanche', 'plante'],
  'technique/lancement': ['demarrage', 'chargement', 'ouvre pas', 'lance pas'],
  textes: ['faute', 'orthographe', 'traduction', 'mot', 'phrase', 'ecriture', 'coupe', 'deborde'],
};

/**
 * Où regarder dans le code, par chemin de tuile. **Le joueur ne voit jamais ça** : c'est du renseignement pour
 * celui qui corrigera. Une tuile « graphisme/sprites/foret » ne dit rien à un correcteur qui découvre le projet ;
 * `src/game/decor.js` lui fait gagner la demi-heure qu'il aurait passée à chercher.
 *
 * Les pistes d'une branche valent pour toutes ses feuilles, et s'ajoutent à celles de la feuille. On reste au
 * niveau du rameau quand les feuilles partagent le même fichier : une piste par feuille vieillirait plus vite
 * qu'elle ne servirait.
 */
export const CODE = {
  graphisme: ['src/game/render.js'],
  'graphisme/sprites': ['src/game/decor.js', 'assets/img/manifest.json', 'tools/render_kaykit.js'],
  'graphisme/sprites/foret': ['src/game/decor.js (FOREST, les silhouettes et les palettes de saison)'],
  'graphisme/sprites/hameau': ['src/game/decor.js (village, BUILD_SCALE, les couleurs de toit)'],
  'graphisme/sprites/roche': ['src/game/decor.js (massif : sommet, crêtes, éboulis, avant-plan)'],
  'graphisme/sprites/champ': ['src/game/decor.js (rangs de culture, alignés par région)'],
  'graphisme/sprites/bati': ['src/game/decor.js', 'src/data/signatures.js'],
  'graphisme/sprites/ouvrage': ['src/game/decor.js', 'src/data/balance.js (works)'],
  'graphisme/sprites/fusion': ['src/game/decor.js', 'src/data/balance.js (fusions)'],
  'graphisme/sprites/friche': ['src/game/decor.js (blight)', 'src/game/rules.js (friche)'],
  'graphisme/sol': ['src/game/render.js (drawLayered, les fondus de bord)', 'src/data/tiles.js'],
  'graphisme/eau': ['src/game/water.js', 'src/game/render.js (mer, écume, vagues)'],
  'graphisme/faune': ['src/game/fauna.js', 'tools/render_animals.js'],
  'graphisme/chemins': ['src/game/paths.js', 'src/game/render.js (sentiers et ruelles)'],
  'graphisme/effets': ['src/game/effects.js', 'src/core/particles.js', 'src/game/finale.js'],
  'graphisme/hud': ['src/game/hud.js', 'css/hud.css', 'css/mobile.css'],
  'graphisme/camera': ['src/game/camera.js', 'src/core/stage.js (uiMargins, minZoom)'],
  'graphisme/postcard': ['src/game/postcard.js', 'src/ui/postcard.js'],

  son: ['src/core/audio.js', 'assets/audio/manifest.json'],
  'son/ambiance': ['src/main.js (le paysage sonore, recalculé selon la composition de l’île)'],
  'son/vibrations': ['src/core/haptics.js'],

  regles: ['src/game/rules.js', 'src/data/balance.js'],
  'regles/pose': ['src/game/rules.js (preview, apply)', 'src/game/feedback.js (les mots et la série)'],
  'regles/regions': ['src/game/board.js (régions connexes)', 'src/game/rules.js (fermeture et primes)'],
  'regles/eau': ['src/game/water.js (étang, lac, rivière, fourche, embouchure)'],
  'regles/saisons': ['src/game/seasons.js', 'src/game/seasonrules.js (les douze règles)'],
  'regles/climat': ['src/data/climates.js', 'src/game/seasons.js (règles et surprises de saison)', 'src/game/seasonrules.js'],
  'regles/faune': ['src/game/fauna.js (habitats, arrivées et départs)'],
  'regles/voeux': ['src/game/wishes.js', 'src/data/story.js (les textes des vœux)'],
  'regles/souffles': ['src/game/queue.js', 'src/game/island.js (les pouvoirs)'],
  'regles/file': ['src/game/queue.js (tirage, main, poche, remise)'],
  'regles/batir': ['src/game/rules.js (bâtir, fusionner, ouvrages)', 'src/data/signatures.js', 'src/data/balance.js'],
  'regles/rares': ['src/data/tiles.js (rares et tuiles d’événement)', 'src/game/rules.js'],
  'regles/etoiles': ['src/data/campaign_stars.js', 'src/data/upgrades.js', 'tools/calibrate.js'],
  'regles/campagne': ['src/data/campaign.js (déblocage, portes)', 'src/data/semis.js', 'src/data/islands.js'],
  'regles/bilan': ['src/game/island.js (fin d’île, tally)', 'src/ui/results.js', 'src/game/finale.js'],
  'regles/succes': ['src/data/achievements.js', 'src/game/achievements.js'],

  interface: ['src/core/input.js', 'src/game/hud.js'],
  'interface/poser': ['src/main.js (IslandScene : placeArmed, armed)', 'src/core/input.js'],
  'interface/vue': ['src/core/input.js (tactile, pincement)', 'src/game/camera.js'],
  'interface/clavier': ['src/main.js (les raccourcis)', 'src/core/input.js'],
  'interface/hud': ['src/game/hud.js', 'css/hud.css'],
  'interface/ecran': ['src/core/stage.js', 'css/mobile.css'],
  'interface/tutoriel': ['src/game/tutorial.js', 'src/data/story.js (mechCards)'],

  ecrans: ['src/ui/', 'src/main.js (les scènes)'],
  'ecrans/menu': ['src/ui/menu.js', 'css/menu.css'],
  'ecrans/pause': ['src/ui/pause.js'],
  'ecrans/options': ['src/ui/options.js', 'src/core/save.js (les options)'],
  'ecrans/guide': ['src/ui/guide.js'],
  'ecrans/apres': ['src/ui/results.js', 'src/ui/workshop.js', 'src/ui/achievements.js', 'src/ui/credits.js'],
  'ecrans/depart': ['src/ui/island_prep.js', 'src/ui/wishes_intro.js'],
  'ecrans/recit': ['src/ui/story.js', 'src/data/story.js'],
  'ecrans/bannieres': ['src/ui/achievements.js (celebrate, celebrateThing)', 'src/main.js (toast)'],

  sauvegarde: ['src/core/save.js'],
  'sauvegarde/reprise': ['src/core/run.js', 'src/game/island.js (serialize, restoreRun)'],
  'sauvegarde/fichier': ['src/core/save.js (exportText, inspect, importText)', 'src/ui/options.js'],
  'sauvegarde/nuage': ['src/core/cloud.js', 'src/data/firebase_config.js', 'firestore.rules', 'src/ui/signin.js'],

  technique: ['src/main.js', 'src/core/loop.js'],
  'technique/lancement': ['src/core/assets.js', 'index.html', 'src/main.js (boot)'],
  'technique/lenteur': ['src/game/render.js (lowFx)', 'src/core/particles.js', 'src/core/loop.js'],
  'technique/plantage': ['src/core/blackbox.js (l’erreur relevée est dans le rapport)'],

  textes: ['src/data/story.js', 'src/data/campaign_texts.js'],
};

/** Les pistes de code d'une liste de chemins : celles du nœud et de tous ses parents, sans doublon. */
export function pistesFor(paths) {
  const out = [];
  for (const chemin of paths || []) {
    const parts = String(chemin).split('/');
    for (let i = 1; i <= parts.length; i++) {
      for (const f of CODE[parts.slice(0, i).join('/')] || []) if (!out.includes(f)) out.push(f);
    }
  }
  return out;
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[\u2019']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/** L'index plat de l'arbre, construit une fois : un enregistrement par nœud, feuille ou branche. */
let _index = null;
function index() {
  if (_index) return _index;
  _index = [];
  const walk = (list, prefix, ancetres) => {
    for (const node of list || []) {
      const path = prefix ? `${prefix}/${node.id}` : node.id;
      const chemin = [...ancetres, node.n];
      // « Autre chose » est une sortie de secours dans un niveau, pas une réponse à une recherche : la proposer
      // reviendrait à répondre « je ne sais pas » à quelqu'un qui vient justement de dire ce qu'il cherche.
      if (node.id !== 'autre') {
        const anc = path.split('/').slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join('/'));
        _index.push({
          path, nom: node.n, label: chemin.join(' · '), feuille: !(node.e && node.e.length),
          nomN: norm(node.n),
          ancetresN: norm(ancetres.join(' ')),
          motsN: norm((MOTS[path] || []).join(' ')),
          motsAncN: norm(anc.flatMap((a) => MOTS[a] || []).join(' ')),
        });
      }
      if (node.e) walk(node.e, path, chemin);
    }
  };
  walk(TREE, '', []);
  return _index;
}

/**
 * Cherche une tuile par mots-clés. Tous les mots tapés doivent trouver quelque chose (et non « au moins un ») :
 * avec 300 nœuds, un « ou » rendrait la moitié de l'arbre à chaque frappe.
 * Le classement va du plus précis au plus vague : le nom de la tuile, ses propres mots courants, le chemin qui y
 * mène, puis les mots d'une branche au-dessus — sans quoi un mot posé sur une branche ferait remonter ses trente
 * feuilles à égalité. À score égal, une feuille passe devant une branche, parce qu'elle désigne mieux.
 */
export function search(q, limit = 30) {
  const mots = norm(q).split(' ').filter((m) => m.length >= 2);
  if (!mots.length) return [];
  const trouve = (exigeTous) => {
  const out = [];
  for (const e of index()) {
    let score = 0, tous = true;
    for (const m of mots) {
      let s = 0;
      if (e.nomN.split(' ').some((w) => w.startsWith(m))) s = 20;
      else if (e.nomN.includes(m)) s = 12;
      else if (e.motsN.split(' ').some((w) => w.startsWith(m))) s = 15;
      else if (e.motsN.includes(m)) s = 9;
      else if (e.ancetresN.includes(m)) s = 5;
      else if (e.motsAncN.split(' ').some((w) => w.startsWith(m))) s = 4;
      if (!s) { tous = false; if (exigeTous) break; else continue; }
      score += s;
    }
    if (exigeTous ? tous : score > 0) out.push({ ...e, score: score + (e.feuille ? 2 : 0) });
  }
  out.sort((a, b) => b.score - a.score || a.label.length - b.label.length);
  return out.slice(0, limit);
  };
  // d'abord tous les mots ; si rien ne colle, on se rabat sur ceux qui collent. Rendre « rien » à quelqu'un qui
  // vient d'écrire « musique coupée » serait le renvoyer à l'arbre entier pour un mot de trop.
  const strict = trouve(true);
  return strict.length ? strict : trouve(false);
}

/** Retrouve un nœud par son chemin (« graphisme/sprites/foret »). */
export function nodeAt(path) {
  const parts = String(path || '').split('/').filter(Boolean);
  let list = TREE, node = null;
  for (const p of parts) {
    node = (list || []).find((x) => x.id === p);
    if (!node) return null;
    list = node.e;
  }
  return node;
}

/** Le nom lisible d'un chemin : « Graphisme · Sprites et décor · Forêt et arbres ». */
export function labelOf(path) {
  const parts = String(path || '').split('/').filter(Boolean);
  const names = []; let list = TREE;
  for (const p of parts) {
    const node = (list || []).find((x) => x.id === p);
    if (!node) break;
    names.push(node.n); list = node.e;
  }
  return names.join(' · ');
}

/**
 * Les questions posées pour une liste de chemins, selon le mode.
 * En « pépin » : celles de chaque nœud choisi (feuille ou branche). En « idée » : le trio commun, dont la deuxième
 * est remplacée par la nuance de la branche quand il n'y en a qu'une. Six au plus, sans doublon.
 */
export function questionsFor(paths, mode = 'pepin') {
  const out = [];
  const push = (q) => { if (q && !out.includes(q)) out.push(q); };
  if (mode === 'idee') {
    const racines = [...new Set(paths.map((p) => String(p).split('/')[0]))];
    const nuance = racines.length === 1 ? (nodeAt(racines[0]) || {}).i : null;
    push(TRIO_IDEE[0]); push(nuance || TRIO_IDEE[1]); push(TRIO_IDEE[2]);
    return out;
  }
  for (const p of paths) { const node = nodeAt(p); if (node) for (const q of node.q || []) push(q); }
  return out.slice(0, 6);
}
