// Cent Saisons — textes narratifs (français exclusivement).
// La voix de l’île parle au « nous » et s’adresse à la Saison (le joueur) au « tu ».
// Chaque « écran » tient en 1 à 3 phrases. Aucun markdown : le texte est affiché tel quel.

export const STORY = {
  title: 'Cent Saisons',
  subtitle: 'L’île qui se souvient',

  prologue: [
    'Cinquante îles dorment sous le même ciel. Sable, roche, silence. Nous étions vertes, nous étions pleines, et nous ne savons plus depuis quand nous nous taisons.',
    'Toi, tu es la Saison. Pas une des quatre : celle qui passe de l’une à l’autre. Tu n’as ni corps ni nom. Tu as des tuiles.',
    'Poser une tuile, c’est nous rendre un morceau. Une prairie, une forêt, un hameau. Chaque bord qui touche un autre bord est une chose que nous nous rappelons.',
    'Nous ne te demanderons pas d’aller vite. Nous te demanderons de regarder où tu poses.',
    'Commence par la plus petite d’entre nous. Elle a gardé des lapins dans un coin de sa mémoire.',
  ],

  archipelagos: {
    1: { name: 'Archipel du Nord', sub: 'Réveil' },
    2: { name: 'Archipel du Milieu', sub: 'Mémoire' },
    3: { name: 'Archipel du Large', sub: 'Cent saisons' },
  },

  islands: {
    1: {
      name: 'L’Anse aux Lapins',
      intro: [
        'Nous sommes la plus petite. Trente cases, une anse, et quelque part sous le sable, une trace de lapin.',
        'Nous nous rappelons l’herbe. Commence par là.',
      ],
      memory: [
        'Ça y est, ça revient. Il y avait des lapins dans l’herbe haute, et une petite fille qui les comptait le soir. Elle n’arrivait jamais au même nombre.',
        'Le premier verger tenait sur trois arbres. Le premier hameau, sur deux toits. On appelait ça un village, avec une pointe d’orgueil.',
        'Merci. Nous savons de nouveau ce que c’est, une prairie.',
      ],
      tutorial: [
        { id: 'place', text: 'Pose la tuile sur une case vide qui touche une tuile déjà posée. Survole une case : les points de chaque bord s’affichent avant de cliquer.' },
        { id: 'affinity', text: 'Même famille : +1. Bonnes paires : +2 (un champ près d’un hameau, un verger près d’une prairie). Mauvaises paires : −1.' },
        { id: 'close', text: 'Entoure complètement une région : plus aucune case vide autour. La prime vaut sa taille en tuiles.' },
        { id: 'season', text: 'Quand les pastilles de la ligne de saison sont toutes remplies, la saison change et une règle avec elle. Chaque île traverse les quatre saisons.' },
      ],
    },
    2: {
      name: 'Le Gué des Roches',
      intro: [
        'Ici, l’eau descendait de la roche et cherchait la mer. Elle ne la cherche plus : elle attend qu’on lui redonne un chemin.',
        'Il y a une différence entre une rivière et une mare. Nous l’avons oubliée. Pas toi.',
      ],
      memory: [
        'Le gué. Des pierres plates posées de la roche à l’anse, et une rivière qui les mouillait au printemps.',
        'Les enfants passaient en sautant, les vieux en râlant, les bêtes en buvant. La rivière savait où aller : elle allait à la mer.',
        'Nous entendons de nouveau l’eau. C’est le premier son qui revient.',
      ],
      tutorial: [
        { id: 'river', text: 'Une chaîne d’eau qui touche la mer ou une roche est une rivière : +2 par tuile. Une eau isolée n’est qu’une mare.' },
        { id: 'wish', text: 'Les habitants formulent des vœux (à droite), avec une échéance en poses ou en saisons. Un vœu exaucé rapporte des points, des souffles et une tuile rare.' },
      ],
    },
    3: {
      name: 'La Pointe des Quatre Vents',
      intro: [
        'Quatre vents, disait-on, un par saison. Puis un seul vent, longtemps. Nous ne savons plus le nom des trois autres.',
        'Chaque région que tu fermes nous rend un peu de souffle. Il est à toi : dépense-le comme on dépense un bon vent.',
      ],
      memory: [
        'Le premier pont de glace. Un hiver, la rivière a gelé d’un hameau à l’autre et les gens se sont rendu visite sans barque.',
        'Ils ont porté des lanternes sur la glace. De la pointe, on voyait une ligne de petites lumières qui traversait la nuit.',
        'Au printemps, la glace est partie. Personne n’a été triste : on savait qu’elle reviendrait.',
      ],
      tutorial: [
        { id: 'breath', text: 'Chaque région fermée te donne un souffle. Dépense-les : échanger la tuile avec la suivante (1), la défausser (2), faire bourgeonner une prairie (3), annuler la dernière pose (4).' },
      ],
    },
    4: {
      name: 'Les Trois Prés',
      intro: [
        'Trois prés, trois haies, et sous chaque haie quelque chose qui respirait. Nous ne sommes pas sûres de quoi.',
        'Fais-leur de la place. Ils sauront revenir.',
      ],
      memory: [
        'Les lapins, d’abord. Puis les canards sur la mare, puis un élan qu’on ne voyait qu’au petit matin, entre les troncs.',
        'Une vieille femme laissait des pommes au bord du bois. Elle disait que ce n’était pas pour les bêtes. Personne ne la croyait.',
        'Nous avons compris ceci : les bêtes ne viennent pas parce qu’on les appelle. Elles viennent parce qu’il y a de la place.',
      ],
      tutorial: [
        { id: 'fauna', text: 'Les animaux viennent quand leur habitat existe et partent s’il se brise. À chaque saison, chaque animal présent donne des souffles.' },
      ],
    },
    5: {
      name: 'La Baie des Promesses',
      intro: [
        'Ici, les habitants sont restés. Silhouettes dans les hameaux, ils regardent la baie et formulent des vœux à voix basse.',
        'Ils ont du caractère. Ils ne diront pas merci deux fois.',
      ],
      memory: [
        'Voilà ce dont nous nous souvenons : un été. Le plus beau. Les vergers pliaient, la mer était tiède, personne ne voulait qu’il finisse.',
        'Alors quelqu’un a dit : gardons-le. Et nous avons trouvé ça bien. Nous avons cessé d’appeler l’automne.',
        'Le premier hiver qui n’est pas venu, nous ne l’avons pas remarqué. Le deuxième non plus.',
      ],
      tutorial: []
    },
    6: {
      name: 'La Mare aux Canards',
      intro: [
        'Il y avait une mare. Il y avait des canards. Il y avait, entre les deux, des gens qui savaient demander.',
        'Exauce-les : ce qu’ils rendent ne s’achète pas. Un moulin, un puits, une chapelle, ça se mérite.',
      ],
      memory: [
        'Pendant le long été, la mare a baissé. Un doigt par mois. Les canards ont attendu, puis ils sont partis vers le nord en triangle.',
        'Les gens ont creusé. Ils ont porté des seaux. La mare ne voulait pas d’eau portée : elle voulait la crue, et la crue vient au printemps.',
        'Nous n’avions pas de printemps. Nous avions le plein été, toujours.',
      ],
      tutorial: [
        { id: 'rare', text: 'Tuiles rares : le moulin vaut champ et hameau, la chapelle réchauffe l’hiver, la tour clôt malgré un trou, le puits garde l’eau, le campement attire.' },
        { id: 'build', text: 'Bâtir : pose une tuile sur une tuile de la même famille (1 souffle). Elle passe au niveau 2 : ses bords valent +1 de plus et elle compte double dans sa région. Bâtie dans une région close, en sa saison ou entourée d’au moins quatre tuiles de sa famille, elle rend une tuile à la file.' },
      ],
    },
    7: {
      name: 'Trois Moulins',
      intro: [
        'Trois moulins, un puits, une chapelle, une tour. Nous avions de belles choses. Elles sont tombées en poussière fine.',
        'Les habitants s’en souviennent mieux que nous. Exauce-les et ils te rendront ces tuiles-là.',
      ],
      memory: [
        'Sans vent d’automne, les moulins tournaient à peine. Le meunier moulait à la main, la nuit, pour que personne ne le voie.',
        'Le puits a tenu. C’est lui qui a gardé les prairies vertes le plus longtemps. Quand il a rendu du sable, les gens ont commencé à charger les barques.',
        'La chapelle est restée ouverte. Pas pour prier : pour se serrer. Il n’y avait plus d’hiver, mais il y avait du froid dans les gens.',
      ],
      tutorial: [
        { id: 'work', text: 'Ouvrages : une tuile bonus qui se pose SUR une tuile posée (ruche, épouvantail, ponton, pont, nichoir, feu de camp, menhir, compost). Bien placée, elle rapporte à chaque saison ; mal placée, elle coûte à chaque saison tant qu’on n’a pas arrangé son voisinage. Sa fiche dit la bonne et la mauvaise place. Une arrive toutes les seize poses, parfois en récompense d’un vœu.' },
        { id: 'hill', text: 'Les collines : +2 contre la roche, +1 avec forêt, prairie, verger et hameau. Comme la roche, elles font naître les rivières, et les chevaux y montent depuis les prés.' },
      ],
    },
    8: {
      name: 'Le Pont de Glace',
      intro: [
        'Deux hameaux, une rivière entre eux, et un souvenir de glace. C’est la dernière chose que nous ayons perdue.',
        'Nous avons peur de l’hiver, maintenant. Rends-le-nous quand même.',
      ],
      memory: [
        'Le dernier hiver. Il est venu tard, un peu par hasard, comme quelqu’un qui a oublié qu’il était invité.',
        'La rivière a gelé. Les deux hameaux ont traversé avec des lanternes, comme avant. Ils ont dansé sur la glace toute la nuit. Ils savaient, nous pensons.',
        'Puis l’été est revenu et n’est plus reparti. Les lanternes se sont éteintes une à une. Nous nous sommes endormies au bruit des barques qui s’en allaient.',
        'Voilà. C’est cela qui nous a figées : pas une catastrophe. Une saison qui a trop plu.',
      ],
      tutorial: [
        { id: 'fuse', text: 'Fusionner : pose une tuile sur une tuile d’une autre famille quand une recette existe (1 souffle) : hameau + eau = port, champ + eau = rizière, hameau + champ = ferme, hameau + roche = fortin, roche + eau = cascade, forêt + roche = grotte, sable + eau = lagune. La tuile compte pour ses deux familles et rapporte chaque saison. Une recette découverte rend une tuile et une rare, et s’écrit dans le Cahier du Guide.' },],
    },
    9: {
      name: 'La Falaise de l’Ours',
      intro: [
        'Grande île, falaise noire, forêt à flanc de roche. Nous sommes larges, et les saisons ici seront courtes.',
        'Il dormait dans la roche. Nous ne l’avons plus entendu ronfler depuis très longtemps.',
      ],
      memory: [
        'Le premier automne après le long été, nous ne l’avons pas reconnu. Les forêts ont rougi et les gens ont cru qu’elles brûlaient.',
        'Puis l’ours est sorti de la falaise, gras et lent, et il a mangé des baies au bord du bois. Alors les gens ont compris : c’était l’automne. Rien de grave.',
        'Nous réapprenons dans cet ordre : ce qui tombe, ce qui dort, ce qui revient.',
      ],
      tutorial: [
        { id: 'heath', text: 'La lande : sol pauvre (−1 avec le champ et le verger) mais elle fleurit au printemps, ne sèche jamais et protège les prairies voisines de l’été. Les vaches paissent en lisière.' },
      ],
    },
    10: {
      name: 'La Plaine des Crues',
      intro: [
        'Une plaine basse, des marais, des champs qui aimaient la boue. Ici, l’eau montait chaque printemps et personne ne s’en plaignait.',
        'Le long été l’a séchée jusqu’à la fissure. Recommence par le marais.',
      ],
      memory: [
        'La crue. Un matin de printemps, l’eau venait jusqu’au seuil des maisons, et les enfants allaient à l’école en barque. C’était la fête.',
        'L’été, la même eau se retirait et laissait les champs gras. On semait dans ses traces.',
        'Nous avons réappris ceci : ce qui déborde au printemps nourrit en été. Il faut les deux, ou rien.',
      ],
      tutorial: [
        { id: 'build3', text: 'Niveau 3 : une tuile de niveau 2 qui a traversé une saison peut être bâtie une seconde fois (2 souffles). Elle prend sa signature : forêt ancienne, pâturage, domaine, bourg, grand verger, eau profonde, tourbière, pic, dune… et rapporte +1 à chaque saison en plus.' },],
    },
    11: {
      name: 'Les Vergers de Neige',
      intro: [
        'Nous étions l’île des vergers. Et l’île de la neige. Les deux, à tour de rôle. Nous avions oublié qu’on pouvait être deux choses.',
        'Il paraît que des oiseaux qui ne volent pas venaient sur la glace. Nous ne l’avons jamais tout à fait cru.',
      ],
      memory: [
        'La première neige après le long été est tombée à midi. Les gens sont sortis sans manteau. Ils l’ont regardée fondre dans leurs mains.',
        'Puis la rivière a gelé, et les manchots sont arrivés, dressés, sérieux, en file. Ils ont traversé l’île comme s’ils l’avaient toujours fait.',
        'Les vergers avaient déjà donné. Il y avait du cidre dans les caves et de la glace sur la rivière. Nous savions de nouveau tenir les deux.',
      ],
      tutorial: [],
    },
    12: {
      name: 'L’Île qui se souvient',
      intro: [
        'Nous sommes la dernière. Nous nous souvenons de tout, maintenant, sauf d’une chose : comment on change sans qu’on nous le dise.',
        'Pose. Nous regarderons comment tu fais.',
        'Peut-être qu’à la fin, nous saurons.',
      ],
      memory: [
        'Ce dont nous nous souvenons, c’est de toi. Une tuile, puis une autre. Une prairie qui sèche et qu’on ne laisse pas seule. Une rivière qu’on mène à la mer.',
        'Tu ne nous as rien expliqué. Tu as posé, nous avons regardé, et à force de regarder nous avons vu ce qui revient toujours : rien ne reste.',
        'C’est le souvenir le plus ancien que nous ayons. Il était sous tous les autres. Il fallait seulement les soulever un à un.',
      ],
      tutorial: [],
    },
  },

  wishes: {
    w2_1: {
      giver: 'Le passeur du gué',
      title: 'Un vrai courant',
      text: 'Une rivière de trois tuiles : de l’eau en ligne, qui part de la roche. Une flaque ne porte pas une barque.',
      done: 'Le passeur a mis sa barque à l’eau. Elle a flotté. Il n’en revenait pas.',
      failed: 'Le passeur a remisé sa barque. Il dit que la rivière viendra bien un jour.',
    },
    w3_1: {
      giver: 'La meunière',
      title: 'Du blé sous les toits',
      text: 'Deux champs collés à un hameau. On ne moud pas ce qui pousse loin des gens.',
      done: 'La meunière a rouvert ses volets. On entend la meule depuis la pointe.',
      failed: 'La meunière a laissé la meule au repos. Le blé attendra.',
    },
    w3_2: {
      giver: 'Les enfants de la pointe',
      title: 'Un pré à nous',
      text: 'Un pré d’au moins trois tuiles, entouré de partout. Pour jouer sans qu’on nous appelle.',
      done: 'Les enfants ont couru dans le pré jusqu’à la nuit. Personne ne les a appelés.',
      failed: 'Les enfants ont joué sur le sable. Ce n’était pas pareil.',
    },
    w4_1: {
      giver: 'La vieille femme aux pommes',
      title: 'Le premier lapin',
      text: 'Un lapin. Il lui faut une prairie de trois tuiles, pas une de moins.',
      done: 'Un lapin est venu manger dans sa main. Elle a fait comme si c’était normal.',
      failed: 'La vieille femme a rangé ses pommes. Les lapins sont encore sous la haie.',
    },
    w4_2: {
      giver: 'Le garde des haies',
      title: 'Un bois qui tient',
      text: 'Une forêt de quatre tuiles. Sous quatre arbres, on peut déjà se croire perdu.',
      done: 'Le garde a fait le tour du bois. Il a mis du temps : c’est bon signe.',
      failed: 'Le garde a compté les arbres sur ses doigts. Il en manquait.',
    },
    d_forest: { giver: 'Le passant du jour', title: 'Un bois pour aujourd’hui', text: 'Une forêt de six tuiles avant la quarantième pose.', done: 'Le passant s’est assis à l’ombre. Il repassera demain.', failed: 'Le passant a continué son chemin, sans ombre.' },
    d_river: { giver: 'La rameuse', title: 'Cinq tuiles d’eau qui coulent', text: 'Une rivière de cinq tuiles en ligne, qui part d’une roche ou d’une colline.', done: 'La rameuse a descendu la rivière en chantant.', failed: 'La rameuse a porté sa barque. Elle n’a pas chanté.' },
    d_rabbit: { giver: 'L’enfant du matin', title: 'Un lapin avant midi', text: 'Un lapin, donc une prairie de trois tuiles, vite.', done: 'L’enfant a vu le lapin. Il a couru le dire à tout le monde.', failed: 'L’enfant a cherché dans l’herbe rase. Rien.' },
    d_bourg: { giver: 'Le maire d’un jour', title: 'Deux bourgs', text: 'Deux hameaux clos de partout.', done: 'Le maire a fait le tour des deux bourgs, très digne.', failed: 'Le maire a rendu son écharpe. Un seul bourg, ce n’est pas une commune.' },
    d_pairs: { giver: 'La boulangère', title: 'Quatre champs contre les toits', text: 'Quatre bords champ-hameau.', done: 'La boulangère a chauffé le four pour tout le monde.', failed: 'La boulangère a fermé boutique avant le soir.' },
    d_species: { giver: 'La naturaliste', title: 'Quatre espèces', text: 'Quatre animaux différents sur l’île en même temps.', done: 'La naturaliste a rempli quatre pages de son carnet.', failed: 'La naturaliste a refermé un carnet à moitié vide.' },
    d_meadow: { giver: 'Le berger de passage', title: 'Un pré fermé', text: 'Un pré d’au moins quatre tuiles, clos de partout.', done: 'Le berger a laissé ses bêtes paître sans les surveiller.', failed: 'Le berger a gardé ses bêtes en ligne. Fatigant.' },
    d_lake: { giver: 'Le pêcheur du dimanche', title: 'Un lac', text: 'Un lac de cinq tuiles, en tas.', done: 'Le pêcheur a lancé sa ligne et n’a rien pris. Il était content quand même.', failed: 'Le pêcheur a lancé sa ligne dans une flaque.' },
    d_harvest: { giver: 'La cidrière', title: 'Trois récoltes', text: 'Trois paires verger-hameau à l’automne.', done: 'La cidrière a rempli trois tonneaux.', failed: 'La cidrière a rangé ses tonneaux vides.' },
    w5_1: {
      giver: 'Le bûcheron de la baie',
      title: 'Un bois pour se perdre',
      text: 'Une forêt de six tuiles. Pas cinq : six. On ne se perd pas dans cinq arbres.',
      done: 'Le bûcheron est entré dans le bois et n’en est ressorti qu’au soir. Il avait l’air content.',
      failed: 'Le bûcheron a rangé sa hache. Il dit que ce sera pour une autre saison.',
    },
    w5_2: {
      giver: 'La vieille passeuse',
      title: 'Une rivière jusqu’à la mer',
      text: 'Une rivière qui descende de la roche jusqu’à la mer. Ma barque en a assez de la boue.',
      done: 'La passeuse a poussé sa barque. Elle est arrivée à la mer sans ramer une seule fois.',
      failed: 'La passeuse a retourné sa barque sur la berge. Elle attendra.',
    },
    w5_3: {
      giver: 'Les enfants du hameau de la baie',
      title: 'Un lapin, un vrai',
      text: 'On veut un lapin. Un vrai, qui bouge. Il paraît qu’il faut de l’herbe.',
      done: 'Les enfants ont vu le lapin. Ils l’ont appelé Bouton et lui ont interdit de partir.',
      failed: 'Les enfants ont fait le tour de l’île. Pas de lapin. Ils ont décidé qu’il se cachait.',
    },
    w6_1: {
      giver: 'Le fermier du haut',
      title: 'Trois champs, trois toits',
      text: 'Trois champs, chacun collé à un hameau. On ne fait pas pousser du blé pour le vent.',
      done: 'Le fermier a compté trois fois. Trois champs, trois toits. Il a hoché la tête, ce qui chez lui est un discours.',
      failed: 'Le fermier a remis ses sacs de graines à l’abri. Il n’a rien dit.',
    },
    w6_2: {
      giver: 'La bergère',
      title: 'Un pré bien fermé',
      text: 'Un pré d’au moins quatre tuiles, clos de partout. Mes bêtes savent trouver le trou.',
      done: 'La bergère a fait le tour du pré. Pas de trou. Elle s’est assise pour la première fois depuis longtemps.',
      failed: 'Les bêtes ont trouvé le trou. La bergère l’avait prédit.',
    },
    w6_3: {
      giver: 'Le vieux pêcheur de la mare',
      title: 'Le retour des canards',
      text: 'Un canard. Rien qu’un. Il faut assez d’eau pour qu’il se pose sans se cogner.',
      done: 'Le canard s’est posé, a fait le tour de la mare et a jugé que tout était en ordre.',
      failed: 'Le pêcheur a regardé le ciel jusqu’au soir. Rien n’est descendu.',
    },
    w7_1: {
      giver: 'Le meunier',
      title: 'Des pommes avant l’automne',
      text: 'Trois vergers qui touchent un hameau avant l’automne. Après, c’est trop tard pour le cidre.',
      done: 'Le meunier a pressé les pommes. L’odeur a tenu deux saisons.',
      failed: 'L’automne est venu avant les vergers. Le meunier a bu de l’eau.',
    },
    w7_2: {
      giver: 'La fille du puits',
      title: 'Un lac pour se regarder',
      text: 'Un lac de cinq tuiles, en tas, loin de la roche. Je veux voir le ciel par terre.',
      done: 'La fille du puits s’est penchée sur le lac. Elle a trouvé que le ciel lui allait bien.',
      failed: 'La fille du puits regarde toujours dans son seau. C’est plus petit.',
    },
    w7_3: {
      giver: 'Le sonneur de la chapelle',
      title: 'Une voix dans le marais',
      text: 'Une grenouille. Le soir, sans elle, la cloche sonne dans le vide.',
      done: 'La grenouille a répondu à la cloche. Le sonneur dit qu’elle chante faux, mais il sourit.',
      failed: 'La cloche a sonné seule. Le sonneur a raccourci la sonnerie.',
    },
    w8_4: {
      giver: 'La capitaine sans bateau',
      title: 'Un port',
      text: 'Pose un hameau sur l’eau, ou l’eau sur un hameau : un port. J’ai une barque qui attend depuis dix ans.',
      done: 'La barque est à quai. La capitaine ne part pas, elle regarde. C’est déjà beaucoup.',
      failed: 'La barque pourrit dans l’herbe. La capitaine en fait un banc.',
    },
    w10_4: {
      giver: 'Le vieux charbonnier',
      title: 'Une grotte',
      text: 'Une forêt sur la roche, ou la roche sur une forêt : une grotte. J’y mettrai mon bois au sec.',
      done: 'Le bois est au sec. L’ours aussi. Ils se sont arrangés.',
      failed: 'Le bois a pris l’eau. Le charbonnier a pris froid.',
    },
    w12_4: {
      giver: 'La meunière du haut',
      title: 'Une cascade',
      text: 'De l’eau sur la roche, ou la roche sous l’eau : une cascade. Mon moulin en rêve.',
      done: 'La cascade chante. La meunière moud en rythme.',
      failed: 'La roche est restée sèche. La meunière moud à la main.',
    },
    // vœux de la réserve des îles générées
    c_forest: { giver: 'Le bûcheron', title: 'Six arbres', text: 'Une forêt de six tuiles. Je ne coupe que ce qui repousse.', done: 'La forêt est là. Le bûcheron y dort mieux que chez lui.', failed: 'Le bûcheron a coupé ailleurs. Il ne l’a pas dit.' },
    c_meadow: { giver: 'La bergère', title: 'Un pré bien fermé', text: 'Un pré d’au moins quatre tuiles, clos de partout. Mes bêtes trouvent tous les trous.', done: 'Le pré est clos. Les bêtes ont cherché le trou toute la nuit.', failed: 'Une bête est partie. Elle est revenue, mais on ne sait pas d’où.' },
    c_pairs: { giver: 'Le fermier', title: 'Quatre champs contre les toits', text: 'Quatre champs collés à un hameau. Le blé n’aime pas voyager.', done: 'Le blé est à la porte. Le fermier aussi, souvent.', failed: 'Le blé a poussé loin. On l’a mangé quand même.' },
    c_river: { giver: 'La passeuse', title: 'Une rivière de cinq', text: 'Cinq tuiles d’eau qui coulent depuis la roche. Ma barque veut de la longueur.', done: 'La barque a fait le trajet en chantant. Faux, mais en chantant.', failed: 'La barque a pris l’eau dans l’herbe. C’est un banc maintenant.' },
    c_mouth: { giver: 'Le vieux pêcheur', title: 'Jusqu’à la mer', text: 'Une rivière qui atteint la mer. Les poissons connaissent le chemin, pas moi.', done: 'L’embouchure est là. Le pêcheur a attrapé un souvenir.', failed: 'La rivière s’est arrêtée. Le pêcheur aussi.' },
    c_lake: { giver: 'La fille du puits', title: 'Un lac pour se regarder', text: 'Un lac de cinq tuiles, en tas, loin de la roche. Je veux voir le ciel par terre.', done: 'Le lac reflète tout. Même ce qu’on ne montre pas.', failed: 'Pas de lac. La fille du puits regarde le puits.' },
    c_rabbit: { giver: 'Les enfants', title: 'Un lapin', text: 'Un lapin. Il faut de l’herbe, et pas trop de monde.', done: 'Le lapin est venu. Les enfants ont promis de ne pas le toucher. Ils ont menti.', failed: 'Pas de lapin. Les enfants en ont dessiné un.' },
    c_duck: { giver: 'Le meunier', title: 'Des canards', text: 'Un lac assez grand pour des canards. Ils se posent lourd.', done: 'Les canards sont là. Le meunier leur parle le matin.', failed: 'Les canards ont survolé l’île. Sans s’arrêter.' },
    c_species: { giver: 'La vieille', title: 'Quatre espèces', text: 'Quatre animaux différents. Une île sans bêtes, c’est une table sans pieds.', done: 'Quatre espèces, et une vieille qui les nomme toutes.', failed: 'Trois espèces. La vieille compte le chat.' },
    c_bourg: { giver: 'Le conseil', title: 'Deux bourgs', text: 'Deux hameaux clos. On s’entend mieux avec un mur entre nous.', done: 'Deux bourgs, deux murs, une fête commune. Allez comprendre.', failed: 'Un seul bourg. Il se croit capitale.' },
    c_harvest: { giver: 'La cidrière', title: 'Trois récoltes', text: 'À l’automne, trois vergers qui touchent un hameau. Sinon, le cidre attendra.', done: 'Trois récoltes. Le cidre ne s’est pas gardé, on a fait ce qu’il fallait.', failed: 'Une récolte. On a bu de l’eau, en parlant de cidre.' },
    c_bloom: { giver: 'La tresseuse', title: 'Trois marais en fleurs', text: 'Au printemps, trois marais fleuris. Les joncs ont besoin de boue.', done: 'Les marais ont fleuri. La tresseuse a fait des chapeaux.', failed: 'Un marais a fleuri. Un chapeau, donc.' },
    c_veillee: { giver: 'Les deux hameaux', title: 'La veillée', text: 'Que la glace relie deux hameaux en hiver. On a des choses à se dire.', done: 'La glace a tenu toute la veillée. On a tout dit. Presque.', failed: 'Pas de glace. On a crié d’une rive à l’autre.' },
    c_closedSeason: { giver: 'La passeuse du pont', title: 'Deux régions en une saison', text: 'Deux régions closes dans la même saison. Je veux voir l’île se fermer d’un coup.', done: 'Deux régions, une saison. La passeuse a applaudi seule.', failed: 'Une région par saison. C’est bien aussi, dit-elle. Elle ment.' },
    c_level: { giver: 'Le charpentier', title: 'Deux tuiles bâties', text: 'Bâtis deux tuiles au niveau 2. Une île qui ne monte pas s’étale.', done: 'Deux tuiles bâties. Le charpentier regarde le ciel avec envie.', failed: 'Rien de bâti. Le charpentier a fait une chaise.' },
    c_works: { giver: 'L’ouvrière', title: 'Deux ouvrages à leur place', text: 'Deux ouvrages bien placés. Un ouvrage mal posé, c’est une dette.', done: 'Deux ouvrages, aucune dette. L’ouvrière s’est payé une pause.', failed: 'Un ouvrage bien placé. L’autre dérive encore.' },
    c_port: { giver: 'La capitaine', title: 'Un port', text: 'Un hameau sur l’eau, ou l’eau sur un hameau : un port. Ma barque attend.', done: 'La barque est à quai. La capitaine regarde le large sans partir.', failed: 'La barque pourrit dans l’herbe. Elle fait un banc.' },
    c_farm: { giver: 'La fermière', title: 'Une ferme', text: 'Un hameau sur un champ, ou un champ sur un hameau : une ferme. Les poules y seront chez elles.', done: 'La ferme est là. Les poules ont pris le pouvoir.', failed: 'Pas de ferme. Les poules errent, dignes.' },
    w8_1: {
      giver: 'Le garde-forestier',
      title: 'Le pas de l’élan',
      text: 'Un élan. Il lui faut cinq tuiles de forêt, et qu’on ne lui parle pas.',
      done: 'L’élan est passé entre les troncs. Le garde ne lui a pas parlé. Ils se sont compris.',
      failed: 'Le garde a trouvé des traces. Vieilles. Il les a recouvertes de feuilles.',
    },
    w8_2: {
      giver: 'Les deux hameaux',
      title: 'Se rendre visite',
      text: 'Que la rivière gèle entre nos deux hameaux. On a des choses à se dire depuis cent saisons.',
      done: 'Les deux hameaux se sont retrouvés au milieu de la glace. Ils ont parlé jusqu’au dégel.',
      failed: 'L’hiver est passé sans pont. Les deux hameaux se sont fait signe de loin.',
    },
    w8_3: {
      giver: 'La passeuse du pont',
      title: 'Un lieu qui tient',
      text: 'Une région close de six tuiles. N’importe laquelle. Je veux quelque chose de fini, pour une fois.',
      done: 'La passeuse a marché le long du bord. Six tuiles, tout autour. Ça, dit-elle, c’est fini.',
      failed: 'La passeuse a haussé les épaules. Rien n’est jamais fini, dit-elle, mais elle aurait préféré.',
    },
    w9_1: {
      giver: 'Le vieux chasseur qui ne chasse plus',
      title: 'Faire sortir l’ours',
      text: 'Un ours. Trois forêts contre la roche, et il sortira. Ne t’approche pas, c’est mon affaire.',
      done: 'L’ours est sorti. Le chasseur a posé son bâton et s’est assis à bonne distance. Ils ont regardé la mer.',
      failed: 'La roche est restée fermée. Le chasseur dit que l’ours a ses raisons.',
    },
    w9_2: {
      giver: 'La passeuse et sa fille',
      title: 'Une longue rivière',
      text: 'Une rivière de huit tuiles jusqu’à la mer. Ma fille veut apprendre à ramer sur une vraie distance.',
      done: 'La fille a ramé huit tuiles sans se retourner. Sa mère, derrière, faisait semblant de ne pas compter.',
      failed: 'La rivière s’arrête trop tôt. La fille rame en rond dans la mare, en attendant.',
    },
    w9_3: {
      giver: 'Le conseil des trois bourgs',
      title: 'Trois bourgs bien clos',
      text: 'Trois hameaux clos, chacun de son côté. On s’entend mieux avec un mur entre nous.',
      done: 'Trois bourgs, trois enceintes. Le conseil s’est réuni sur la place du milieu pour fêter la distance.',
      failed: 'Le conseil n’a pas pu se réunir : les bourgs n’étaient pas finis. Chacun a accusé les deux autres.',
    },
    w10_1: {
      giver: 'La fermière de la plaine',
      title: 'Des poules dans la cour',
      text: 'Un hameau bordé de deux champs, et les poules reviendront picorer. Elles n’aiment pas la boue.',
      done: 'Les poules sont revenues d’un coup, comme si elles avaient attendu derrière la haie.',
      failed: 'La fermière a rangé le grain. Les poules attendront une autre saison.',
    },
    w10_2: {
      giver: 'Les semeurs de la plaine',
      title: 'Cinq champs irrigués',
      text: 'En été, cinq champs qui touchent l’eau. Sinon on sème de la poussière.',
      done: 'Cinq champs irrigués. Les semeurs ont marché dedans pieds nus, ce qu’ils ne font qu’en cas de grande joie.',
      failed: 'L’été est passé, les champs ont eu soif. Les semeurs gardent le grain pour l’an prochain.',
    },
    w10_3: {
      giver: 'La tresseuse de joncs',
      title: 'Le marais en fleurs',
      text: 'Au printemps, quatre marais fleuris. J’ai besoin de joncs et les joncs ont besoin de boue.',
      done: 'Quatre marais en fleurs. La tresseuse en a fait un panier et y a mis son premier sourire de l’année.',
      failed: 'Le printemps est passé, les marais sont restés gris. La tresseuse tresse de la paille, en soupirant.',
    },
    w11_1: {
      giver: 'Les enfants du hameau du nord',
      title: 'Les oiseaux qui marchent',
      text: 'On veut voir les manchots. Il faut de l’hiver et une longue rivière gelée. On attendra.',
      done: 'Les manchots sont passés en file devant les enfants. Les enfants ont marché derrière eux, en file aussi.',
      failed: 'L’hiver est passé sans manchots. Les enfants ont fait des manchots de neige. Ils ne marchent pas.',
    },
    w11_2: {
      giver: 'La cidrière',
      title: 'Quatre vergers récoltés',
      text: 'À l’automne, quatre vergers qui touchent un hameau. On ne récolte pas ce qui pousse loin des gens.',
      done: 'Quatre vergers récoltés. La cidrière a rempli les fûts et interdit d’y toucher avant la neige.',
      failed: 'L’automne est passé sans assez de pommes. La cidrière a fait du jus. Ce n’est pas pareil.',
    },
    w11_3: {
      giver: 'Le charbonnier',
      title: 'Une grande forêt close',
      text: 'Une forêt de dix tuiles, fermée de partout. Je veux du bois pour cent hivers.',
      done: 'La forêt est close, dix tuiles. Le charbonnier a compté les arbres, puis les hivers. Ça suffira.',
      failed: 'La forêt s’est arrêtée trop tôt. Le charbonnier coupera moins, et plus bas.',
    },
    w12_1: {
      giver: 'Toute l’île',
      title: 'Cinq voix à la fois',
      text: 'Cinq espèces sur l’île en même temps. Nous voulons entendre le bruit que ça fait.',
      done: 'Cinq espèces, un seul bruit. Nous ne l’avions pas entendu depuis cent saisons. Il est plus fort que dans notre souvenir.',
      failed: 'Il a manqué une voix. Le bruit était beau quand même, mais nous connaissons la différence.',
    },
    w12_2: {
      giver: 'Les passeuses',
      title: 'Deux rivières, deux barques',
      text: 'Deux rivières jusqu’à la mer. Une pour partir, une pour revenir. Ma fille prend l’autre.',
      done: 'Deux rivières. Les deux barques se sont croisées au large et se sont fait signe.',
      failed: 'Une seule rivière. Les deux barques y sont allées à tour de rôle, ce qui n’est pas la même chose.',
    },
    w12_3: {
      giver: 'Les enfants de partout',
      title: 'Trois en une saison',
      text: 'Trois régions closes avant que la saison change. On veut voir l’île finir des choses vite, pour une fois.',
      done: 'Trois régions bouclées dans la même saison. Les enfants ont crié trois fois. L’île a trouvé cela suffisant.',
      failed: 'La saison a changé avant la troisième. Les enfants ont dit : la prochaine. Ils disent toujours ça.',
    },
  },

  seasons: {
    spring: {
      name: 'Printemps',
      line: 'Quelque chose remue sous la boue. Nous appelons cela le printemps.',
      rule: 'Les marais fleurissent (+2 chacun), la lande aussi (+1), et chaque tuile d’eau posée rapporte +1 : c’est la crue.',
    },
    summer: {
      name: 'Été',
      line: 'Le ciel ne bouge plus. Les prairies retiennent leur souffle.',
      rule: 'Une prairie sans eau, forêt, marais ni lande voisine sèche ; un champ qui touche l’eau rapporte +1.',
    },
    autumn: {
      name: 'Automne',
      line: 'Les vergers plient. Les forêts rougissent. Tout se donne avant de se taire.',
      rule: 'Récolte : chaque paire verger-hameau rapporte +2.',
    },
    winter: {
      name: 'Hiver',
      line: 'La rivière s’arrête pour écouter. On marche dessus.',
      rule: 'L’eau gèle : +3 par paire de hameaux reliés par la glace ; les champs dorment (plus de bonus champ-hameau).',
    },
  },

  fauna: {
    rabbit: {
      name: 'Lapin',
      arrive: 'Un lapin. Puis deux. Ils n’ont jamais été loin.',
      leave: 'Les lapins se sont enfoncés sous la haie.',
      habitat: 'Une prairie d’au moins trois tuiles.',
    },
    moose: {
      name: 'Élan',
      arrive: 'L’élan traverse la forêt sans un bruit. Il a toujours fait ainsi.',
      leave: 'L’élan est parti chercher un bois plus large.',
      habitat: 'Une forêt d’au moins cinq tuiles.',
    },
    frog: {
      name: 'Grenouille',
      arrive: 'Une grenouille. Le marais a retrouvé sa voix.',
      leave: 'Le marais s’est tu : la grenouille aussi.',
      habitat: 'Un marais qui touche l’eau.',
    },
    duck: {
      name: 'Canard',
      arrive: 'Les canards se posent en freinant des pattes. Ils n’ont pas oublié le lac.',
      leave: 'Les canards ont repris leur vol en triangle.',
      habitat: 'Une étendue d’eau d’au moins trois tuiles.',
    },
    bear: {
      name: 'Ours',
      arrive: 'L’ours sort de la roche comme s’il y avait dormi cent ans.',
      leave: 'L’ours est retourné dans sa roche.',
      habitat: 'Une forêt d’au moins trois tuiles qui touche une roche.',
    },
    owl: {
      name: 'Hibou',
      arrive: 'Le hibou s’installe au-dessus des toits. Il compte les lumières.',
      leave: 'Le hibou a quitté le toit du hameau.',
      habitat: 'Une forêt qui touche un hameau.',
    },
    chicken: {
      name: 'Poule',
      arrive: 'Des poules dans la cour. Elles picorent comme si rien ne s’était jamais arrêté.',
      leave: 'Les poules sont rentrées. Il n’y avait plus de grain.',
      habitat: 'Un hameau bordé d’au moins deux champs.',
    },
    horse: {
      name: 'Cheval',
      arrive: 'Un cheval monte la colline au pas. D’en haut, il regarde toute l’île.',
      leave: 'Le cheval est redescendu. La colline est vide.',
      habitat: 'Des collines (au moins deux) qui touchent une prairie.',
    },
    cow: {
      name: 'Vache',
      arrive: 'Une vache broute en lisière de lande. Elle prend son temps, comme nous.',
      leave: 'La vache a quitté la lisière.',
      habitat: 'Une prairie d’au moins deux tuiles qui touche une lande.',
    },
    penguin: {
      name: 'Manchot',
      arrive: 'Des manchots ! Ils marchent sur la rivière gelée comme sur une place de village.',
      leave: 'La glace a fondu : les manchots sont repartis avec elle.',
      habitat: 'En hiver seulement : une chaîne d’eau gelée d’au moins quatre tuiles.',
    },
  },

  tiles: {
    meadow: { name: 'Prairie', blurb: 'Aime le verger, la forêt et l’eau ; sèche en été si elle reste seule.' },
    forest: { name: 'Forêt', blurb: 'Aime la roche et la prairie, déteste le sable ; les grandes forêts attirent l’élan.' },
    field: { name: 'Champ', blurb: 'Aime le hameau et, en été, l’eau qui l’irrigue ; n’aime ni la roche ni le sable.' },
    hamlet: { name: 'Hameau', blurb: 'Aime le champ, le verger et un peu l’eau ; clos, il devient un bourg et sa prime double.' },
    orchard: { name: 'Verger', blurb: 'Aime la prairie et le hameau ; à l’automne, chaque hameau voisin devient une récolte.' },
    water: { name: 'Eau', blurb: 'Aime le marais et le sable. Seule : un étang (+1, et +1 par saison près d’un pré ou d’un marais). En tas : un lac (+1 par tuile, canards dès trois). En ligne depuis une roche ou une colline : une rivière (+2 par tuile, +3 à l’embouchure). Gèle en hiver.' },
    marsh: { name: 'Marais', blurb: 'Aime l’eau, fleurit au printemps et attire la grenouille ; le hameau ne veut pas de lui.' },
    rock: { name: 'Roche', blurb: 'Aime la forêt ; une ligne d’eau qui part d’elle devient une rivière ; le champ s’y casse la charrue.' },
    sand: { name: 'Sable', blurb: 'Aime l’eau ; la forêt et le champ n’y poussent pas.' },
    mill: { name: 'Moulin', blurb: 'Compte comme champ et comme hameau à la fois : il s’entend avec les deux.' },
    chapel: { name: 'Chapelle', blurb: 'En hiver, chaque bord voisin rapporte +1 : on s’y serre.' },
    watchtower: { name: 'Tour de guet', blurb: 'Clôt une région même s’il lui reste une case vide.' },
    well: { name: 'Puits', blurb: 'Protège les prairies voisines de la sécheresse d’été.' },
    camp: { name: 'Campement', blurb: 'Attire un animal, quel que soit l’habitat autour.' },
    ruins: { name: 'Ruines', blurb: 'Ce qui reste d’avant. Ne rapporte rien, ne gêne personne : on bâtit autour.' },
    hill: { name: 'Colline', blurb: 'Aime la roche (+2), la forêt, la prairie, le verger et le hameau ; fait naître les rivières comme la roche ; les chevaux y montent depuis les prés.' },
    heath: { name: 'Lande', blurb: 'Sol pauvre (le champ et le verger n’y poussent pas) mais fleurit au printemps, ne sèche jamais et protège les prairies voisines de l’été ; les vaches paissent en lisière.' },
    granary: { name: 'Grenier', blurb: 'Compte comme champ, +1 par bord avec un champ, et ne dort pas en hiver.' },
    market: { name: 'Marché', blurb: 'Tuile d’événement : compte comme hameau ; une fois posé, tu choisis toi-même la famille des trois tuiles suivantes.' },
    fete: { name: 'Fête', blurb: 'Tuile d’événement : compte comme hameau ; au prochain changement de saison, chaque hameau voisin rapporte +2, une seule fois.' },
    restore: { name: 'Ruine à restaurer', blurb: 'Tuile d’événement : posée, elle prend la famille majoritaire de ses voisines et devient une tuile ordinaire.' },
    tavern: { name: 'Auberge', blurb: 'Compte comme hameau ; chaque sentier qui rejoint son village rapporte +1 de plus à chaque saison.' },
    trough: { name: 'Abreuvoir', blurb: 'Compte comme prairie ; protège les prairies voisines de la sécheresse et fait venir cheval et vache avec une seule tuile.' },
    archway: { name: 'Porche', blurb: 'Compte comme hameau ; un bourg clos qui le contient rapporte ×3 au lieu de ×2.' },
    mine: { name: 'Mine', blurb: 'Compte comme roche ; +1 par bord avec une roche, et une roche close qui la contient rapporte ×2.' },
    oven: { name: 'Four à pain', blurb: 'Compte comme hameau ; +1 par bord avec un champ.' },
    // ouvrages (tuiles bonus à superposer)
    hive: { name: 'Ruche', blurb: 'Ouvrage. Bonne place : verger ou prairie avec des fleurs autour (+1 par verger ou prairie voisin, +1 au printemps). Mauvaise place : sans fleur, ou près d’un marais (−2 la première saison, −1 la seconde, puis il s’efface).' },
    scarecrow: { name: 'Épouvantail', blurb: 'Ouvrage. Bonne place : un champ (+1, +1 par champ voisin). Mauvaise place : ailleurs (−2 la première saison, −1 la seconde, puis il s’efface).' },
    pier: { name: 'Ponton', blurb: 'Ouvrage. Bonne place : l’eau collée à un hameau, la jetée part de sa rive (+3 par saison). Mauvaise place : eau sans hameau, ou terre (−2 puis −1, puis il dérive pour de bon).' },
    bridge: { name: 'Pont', blurb: 'Ouvrage. Bonne place : une rivière entre deux hameaux, il la traverse (+3 par saison). Mauvaise place : un lac, un étang ou la terre (−1 deux saisons, puis il s’efface).' },
    nestbox: { name: 'Nichoir', blurb: 'Ouvrage. Bonne place : une forêt d’au moins trois tuiles (+2 par saison, le hibou s’installe). Mauvaise place : petite forêt ou autre famille (−2 la première saison, −1 la seconde, puis il s’efface).' },
    campfire: { name: 'Feu de camp', blurb: 'Ouvrage. Bonne place : forêt ou prairie près d’un hameau (+1, +1 par hameau voisin, +1 en hiver). Mauvaise place : sans hameau (−2 la première saison, −1 la seconde, puis il s’efface) ; sous les feux de broussaille, −5.' },
    menhir: { name: 'Menhir', blurb: 'Ouvrage. Bonne place : roche ou colline (+1 par tuile de son massif, au plus 4). Mauvaise place : ailleurs (−1 deux saisons, puis il s’efface).' },
    compost: { name: 'Compost', blurb: 'Ouvrage. Bonne place : champ ou verger sans hameau voisin (+1 par champ ou verger voisin). Mauvaise place : un hameau voisin (−2 puis −1, puis on l’enlève).' },
    // fusions
    port: { name: 'Port', blurb: 'Hameau + eau. Compte pour les deux ; +1 par tuile d’eau voisine à chaque saison (au plus 4). Les canards s’y posent.' },
    paddy: { name: 'Rizière', blurb: 'Champ + eau. Compte pour les deux ; +3 à chaque automne. La grenouille s’y plaît.' },
    farm: { name: 'Ferme', blurb: 'Hameau + champ. Compte pour les deux ; +1 par champ voisin à chaque saison (au plus 4). Les poules y sont chez elles.' },
    fort: { name: 'Fortin', blurb: 'Hameau + roche. Compte pour les deux ; +1 par roche voisine à chaque saison ; sa région se ferme même avec un trou.' },
    falls: { name: 'Cascade', blurb: 'Roche + eau. Compte pour les deux ; +1 par tuile d’eau voisine à chaque saison. Une rivière peut en naître.' },
    cave: { name: 'Grotte', blurb: 'Forêt + roche. Compte pour les deux ; +1 par forêt voisine à chaque saison. L’ours y dort.' },
    lagoon: { name: 'Lagune', blurb: 'Sable + eau. Compte pour les deux ; +1 par tuile d’eau voisine à chaque saison. Les manchots y glissent l’hiver.' },
    fountain: { name: 'Fontaine', blurb: 'Compte comme hameau, +1 par bord avec un hameau, et protège les prairies voisines de la sécheresse.' },
  },

  breaths: {
    swap: 'Échanger (1 souffle) : la tuile obligatoire prend la place de l’une des deux suivantes.',
    discard: 'Défausser (2 souffles) : la tuile obligatoire s’en va et ne revient pas.',
    bud: 'Bourgeon (3 souffles) : une prairie déjà posée devient forêt ou verger.',
    undo: 'Souvenir (4 souffles, une fois par saison) : la dernière tuile posée revient dans ta main.',
    pocket: 'Poche : mets la tuile de côté et reprends-la quand la bonne case apparaît.',
  },

  results: {
    0: [
      'Nous avons bougé. C’est peu, mais nous n’avions rien fait depuis longtemps.',
      'Tu as posé. Reviens : nous te montrerons où.',
    ],
    1: [
      'Une étoile. Une île se contente de peu, mais elle se souvient de tout.',
      'Quelque chose tient. Le reste attendra une autre saison.',
    ],
    2: [
      'Deux étoiles. Les animaux en parlent déjà entre eux.',
      'C’est presque nous. Il manque un vœu, ou une rivière, ou un rien.',
    ],
    3: [
      'Trois étoiles. Nous nous reconnaissons.',
      'Tout est là. Tu peux regarder l’île un moment : elle ne bougera pas sans toi.',
    ],
  },

  seasonRules: {
    crue: { name: 'Crue', line: 'L’eau court partout. Le marais fleurit là où elle passe.', rule: 'Les marais fleurissent (+2 chacun), la lande aussi (+1), et chaque tuile d’eau posée rapporte +1.' },
    semailles: { name: 'Semailles', line: 'On sème vite, on sème près des maisons. Les vergers plantés maintenant se souviendront de l’automne.', rule: 'Chaque champ posé contre un hameau rapporte +2 de plus ; les vergers posés ce printemps donneront une récolte double à l’automne.' },
    nichees: { name: 'Nichées', line: 'Sous chaque haie, quelque chose est né cette nuit.', rule: 'Chaque animal qui arrive ce printemps rapporte +3 aussitôt ; une prairie posée contre une forêt vaut +1.' },
    secheresse: { name: 'Sécheresse', line: 'Le ciel ne bouge plus. Les prairies retiennent leur souffle.', rule: 'Une prairie sans eau, forêt, marais ni lande voisine sèche ; un champ qui touche l’eau rapporte +1.' },
    chaleurs: { name: 'Grandes chaleurs', line: 'Tout le monde cherche l’ombre et le bord de l’eau.', rule: 'Rien ne sèche, et chaque tuile d’eau posée rapporte +2 de plus ; mais une prairie collée à un marais privé d’eau sèche quand même.' },
    feux: { name: 'Feux de broussaille', line: 'L’herbe sèche craque. Les bêtes des bois s’en vont avant la fumée.', rule: 'Les prairies sèchent comme d’habitude ; une forêt qui touche deux prairies sèches perd ses animaux jusqu’à l’automne ; une forêt posée près de l’eau rapporte +2.' },
    recolte: { name: 'Récolte', line: 'Les vergers plient. Les forêts rougissent. Tout se donne avant de se taire.', rule: 'Chaque paire verger-hameau rapporte +2.' },
    foire: { name: 'Grande foire', line: 'On dresse les étals sur la place. Tout ce qui pousse autour se vend.', rule: 'Chaque bourg (hameau clos) rapporte +1 par champ, verger ou moulin voisin ; les vergers seuls ne rapportent rien cet automne.' },
    chasse: { name: 'Chasse et cueillette', line: 'On rentre du bois avec les paniers pleins et les mains rouges de mûres.', rule: 'Chaque forêt qui touche un hameau rapporte +2 ; chaque animal des forêts rapportera +2 à la prochaine saison.' },
    veillee: { name: 'Veillée', line: 'La rivière s’arrête pour écouter. On marche dessus.', rule: 'L’eau gèle : +3 par paire de hameaux reliés par la glace ; les champs dorment (plus de bonus champ-hameau).' },
    froid: { name: 'Grand froid', line: 'On ne sort plus. On compte les bûches.', rule: 'L’eau gèle, pas de veillée ; un hameau sans forêt voisine perd 2 points, chaque forêt qui touche un hameau en rapporte 2 ; les champs dorment.' },
    doux: { name: 'Hiver doux', line: 'Pas de glace cette année. Les canards n’en reviennent pas.', rule: 'L’eau ne gèle pas, pas de veillée ; les champs continuent de rapporter avec les hameaux et chaque marais qui touche l’eau rapporte +1.' },
  },

  weather: {
    storm: { name: 'Orage', announce: 'Le ciel se charge. Les rivières attendent la pluie.', line: 'L’orage éclate. L’eau court partout et les rivières débordent de joie.', rule: 'Chaque tuile de rivière posée rapporte +2 de plus.' },
    heat: { name: 'Canicule', announce: 'L’air tremble déjà. Les prairies isolées vont souffrir.', line: 'La canicule s’installe. L’herbe jaunit loin de l’eau.', rule: 'Une prairie ne reste verte que si elle touche l’eau, un puits, une fontaine, un abreuvoir ou une lande.' },
    wind: { name: 'Grand vent', announce: 'Le vent tourne. Les moulins s’impatientent.', line: 'Le grand vent souffle. Les feuilles volent, les ailes tournent.', rule: 'Chaque forêt ou verger posé rapporte +1 ; chaque moulin rapportera +3 à la prochaine saison.' },
    blizzard: { name: 'Bourrasque', announce: 'La neige se lève à l’horizon. On n’y verra bientôt plus rien.', line: 'La bourrasque efface tout. On ne voit plus que la tuile dans sa main.', rule: 'La file est masquée : seule la tuile à poser est visible, et on ne peut plus échanger.' },
    thaw: { name: 'Redoux', announce: 'Un vent tiède se lève. La glace craque déjà.', line: 'Le redoux : la glace fond, l’eau reprend sa voix et les canards reviennent.', rule: 'L’eau dégèle au milieu de l’hiver : les canards reviennent, les manchots repartent.' },
  },

  closed: ['Bouclé !', 'Une région entière !', 'Tout autour !', 'Voilà qui tient.'],

  // commentaire de chaque coup (feedback.js) : comparé au meilleur emplacement possible pour la même tuile
  build: {
    done: ['Bâti !', 'Plus haut !', 'Niveau deux !', 'Ça pousse !'],
    refund: { closed: 'à l’abri : une {f} revient', season: 'en saison : une {f} revient', crowd: 'bien entourée : une {f} revient', none: 'sans retour' },
  },
  fusion: {
    done: ['Fusion !', 'Deux en un !', 'Ça se marie !'],
    discovery: 'Recette découverte : {n} !',
  },
  work: {
    good: ['Bien placé !', 'À sa place.', 'Ça rendra.'],
    bad: ['Mal placé…', 'Ça va coûter.', 'Pas ici.'],
    gone: ['abandonné', 's’efface', 'emporté par le vent'],
  },
  // signatures du niveau 3 (bâtir une seconde fois une tuile de niveau 2 qui a traversé une saison)
  level3: {
    forest:  { name: 'Forêt ancienne', short: 'ours et hibou, à l’abri des feux' },
    meadow:  { name: 'Pâturage', short: 'ne sèche jamais, vache et cheval' },
    field:   { name: 'Domaine', short: 'ne dort pas l’hiver, +2 chaque automne' },
    hamlet:  { name: 'Bourg', short: 'vaut un bourg clos, sentiers +1' },
    orchard: { name: 'Grand verger', short: '+2 chaque printemps' },
    water:   { name: 'Eau profonde', short: '+1 par eau voisine chaque saison' },
    marsh:   { name: 'Tourbière', short: '+2 chaque printemps' },
    rock:    { name: 'Pic', short: '+1 par eau voisine chaque saison' },
    sand:    { name: 'Dune', short: '+1 par eau voisine chaque saison' },
    hill:    { name: 'Alpage', short: '+1 par prairie voisine chaque saison' },
    heath:   { name: 'Grande lande', short: '+1 par forêt voisine chaque saison' },
  },
  // cartes de tutoriel des mécaniques, montrées sur l'île qui les introduit (îles générées)
  mechCards: {
    river: 'L’eau posée contre une roche ou une colline devient une rivière : +2 par tuile, +3 si elle atteint la mer. Seule, c’est un étang ; en tas, un lac. Une rivière qui s’élargit se jette dans un lac : ce qui était rivière le reste.',
    season: 'Quand la ligne de saison est pleine, la saison change et une règle avec elle. Chaque île traverse les quatre saisons.',
    fauna: 'La faune s’installe quand un habitat existe (lapin dans les prés, canard sur l’eau, ours près de la roche…) et rapporte des points à chaque saison.',
    wish: 'Les vœux des habitants (à droite) donnent des objectifs à échéance : exaucés, ils rapportent des points, des souffles et une tuile rare.',
    breath: 'Les souffles se gagnent en fermant des régions : échanger la tuile, la défausser, faire bourgeonner un pré, annuler la dernière pose.',
    rare: 'Tuiles rares : le moulin vaut champ et hameau, la chapelle réchauffe l’hiver, la tour clôt malgré un trou, le puits garde l’eau, le campement attire.',
    event: 'Tuiles d’événement, par les vœux : le marché laisse choisir trois tuiles, la fête offre +2 aux hameaux voisins, la ruine restaurée prend la famille majoritaire.',
    weather: 'La météo s’annonce en début de saison et se déclenche à la mi-saison : orage, canicule, grand vent, bourrasque, redoux. La règle de saison est tirée parmi trois.',
    hill: 'La colline aime le pré et la forêt ; deux collines qui se touchent attirent le cheval. Une rivière peut en naître.',
    rare2: 'Nouvelles rares : le grenier (+1 par bord avec un champ, pas de dormance d’hiver) et la fontaine (+1 par bord avec un hameau).',
    heath: 'La lande fleurit au printemps (+1) et attire la vache en lisière des prés.',
    build: 'Bâtir : pose une tuile sur une tuile de la même famille (1 souffle). Elle passe au niveau 2 : ses bords valent +1 de plus, elle compte double dans sa région. Bien bâtie (région close, en saison, bien entourée), elle rend une tuile.',
    rare3: 'Rares tardives : auberge (+1 par sentier), abreuvoir (anti-sécheresse), porche (bourg clos ×3), mine (+1 par roche), four à pain (+1 par champ).',
    climate: 'Climat : chaque archipel a le sien. Il change la file, donne un avantage permanent et une contrainte, affichés à côté de la saison.',
    fuse: 'Fusionner : pose une tuile sur une tuile d’une autre famille quand une recette existe (hameau + eau = port…). La tuile compte pour ses deux familles. Une recette découverte rend une tuile et une rare.',
    work: 'Ouvrages : une tuile bonus qui se pose sur une tuile posée. Bien placée, elle rapporte à chaque saison ; mal placée, elle coûte deux saisons puis s’efface. Posée tout de suite, elle est fraîche (+1 par saison). Pas de bonne place ? Mets-la en remise (R), elle y attend douze poses, ou défausse-la gratuitement.',
    paths: 'Un sentier vient de se tracer : deux villages séparés par au plus trois tuiles de terre ouverte (prairie, champ, verger, lande, colline) se relient tout seuls. Chaque sentier rapporte +1 à chaque saison ; les hameaux voisins se relient par des ruelles.',
    riverLake: 'Ta rivière s’élargit : le tronc depuis la montagne reste une rivière (+2 par tuile), la suite devient un lac dans lequel elle se jette (+1 par tuile). Un ponton posé sur la rivière y reste.',
    blight: 'Friche : une tuile posée qui coûte des points (bords et contraintes) devient une friche, une ruine ou un lit asséché. Elle ne rapporte plus rien et ne compte plus pour sa famille. Bâtir dessus la remet en état (1 souffle).',
    hand: 'Main de saison : la file devient une main. Clique sur n’importe quelle tuile visible pour la jouer maintenant, sans souffle. L’échange disparaît, le Regard agrandit la main.',
    semis: 'Semis : avant chaque île, tu choisis ce que la file donnera plutôt. Terres hautes, fonds humides, pays habité ou au gré des saisons. Un choix, pas une garantie : la file reste tirée au sort.',
    build3: 'Niveau 3 : une tuile de niveau 2 qui a traversé une saison se bâtit encore (2 souffles). Elle prend sa signature et rapporte +1 par saison.',
  },
  climates: {
    temperate: { name: 'Tempéré', line: 'Le climat de référence.', plus: '', minus: '' },
    hot: { name: 'Climat chaud', line: 'Le sable est chaud dès le matin. L’eau vaut de l’or.', plus: 'Chaque tuile d’eau posée +2, un étang +1 de plus par saison, les bords des vergers +1, l’été dure deux saisons.', minus: 'Les prés loin de l’eau sèchent dès le printemps ; pas de gel, donc pas de veillée.' },
    humid: { name: 'Climat humide', line: 'Il pleut. Puis il pleut. Rien ne sèche.', plus: 'Les prés ne sèchent jamais, rivières et lacs +1 par tuile, orages fréquents.', minus: 'Un hameau contre un marais vaut −2 ; les sentiers ne dépassent pas deux cases.' },
    cold: { name: 'Climat froid', line: 'La neige reste. Le silence compte double.', plus: 'La veillée vaut +1 par paire ; chaque forêt qui touche un hameau rapporte +1 chaque hiver ; l’hiver dure deux saisons.', minus: 'Les champs dorment dès l’automne ; rien ne fleurit au printemps.' },
  },
  verdicts: {
    master: ['Coup de maître !', 'Magistral !', 'L’île applaudit !', 'Rien à redire !'],
    perfect: ['Parfait !', 'Pile là !', 'Exactement !', 'La bonne case !'],
    good: ['Bien joué', 'Bien vu', 'Joli', 'Ça tient'],
    ok: ['Correct', 'Pas mal', 'Ça passe', 'Prudent'],
    meh: ['Il y avait mieux', 'Dommage…', 'Une autre case valait plus', 'Trop vite ?'],
    streak: { 3: 'Trois d’affilée !', 5: 'En feu ! ×5', 8: 'Série de huit !', default: 'Série de {n} !' },
    milestone: '{n} points !',
  },

  ending: [
    'La dernière tuile est posée. Nous attendons que tu nous dises quelle saison vient. Tu ne dis rien.',
    'Alors la rivière gèle toute seule. Les hameaux se regardent par-dessus la glace. Personne ne t’a rien demandé.',
    'Puis la glace craque au matin, les marais fleurissent, et les canards reviennent en freinant des pattes. Nous avons fait cela sans toi.',
    'Nous avons compris. Ce n’est pas la saison que tu nous rendais. C’est le passage.',
    'Cinquante îles. Cent saisons. Nous les avons toutes comptées et nous ne compterons plus.',
    'Le meunier a remis son aile. La passeuse a retourné sa barque. Les enfants du hameau du nord ont un nouveau vœu, mais ils ne te le diront pas : ils le feront.',
    'Tu peux partir, Saison. Il y a d’autres îles, sous d’autres ciels, qui ne savent plus ce qu’est l’automne.',
  ],

  epilogue: 'Nous n’avons plus besoin d’être rappelées. Nous nous souvenons.',

  infinite: {
    intro: [
      'Une île sans fin. Elle grandit à chaque saison et la file de tuiles ne se vide jamais.',
      'Ici nous ne te demandons rien : nous regardons jusqu’où tu iras avant qu’il ne reste plus une case.',
    ],
  },

  daily: {
    intro: [
      'L’île du jour. Elle n’existe que vingt-quatre heures et elle est la même pour tout le monde.',
      'Trois vœux, la météo qui change, et ton meilleur score de la journée qui reste. Demain, une autre île.',
    ],
  },

  garden: {
    intro: [
      'Le Jardin. Pas de file, pas de points, pas de vœux : tu choisis chaque tuile et tu fais une île belle.',
    ],
  },
};

// Cartes de tutoriel propres à chaque climat (affichées à chaque changement de climat dans la campagne).
for (const [id, c] of Object.entries(STORY.climates)) {
  STORY.mechCards[`climate_${id}`] = id === 'temperate' ? 'Retour au climat tempéré : plus d’avantage ni de contrainte de climat. Les prés sèchent l’été loin de l’eau, l’eau gèle l’hiver, tout fleurit au printemps.'
    : `${c.name}. ${c.line} ✓ ${c.plus} ✗ ${c.minus} Le détail reste dans la bulle de saison.`;
}
