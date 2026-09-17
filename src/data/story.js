// Cent Saisons — textes narratifs (français exclusivement).
// La voix de l’île parle au « nous » et s’adresse à la Saison (le joueur) au « tu ».
// Chaque « écran » tient en 1 à 3 phrases. Aucun markdown : le texte est affiché tel quel.

export const STORY = {
  title: 'Cent Saisons',
  subtitle: 'L’île qui se souvient',

  prologue: [
    'Douze îles dorment sous le même ciel. Sable, roche, silence. Nous étions vertes, nous étions pleines, et nous ne savons plus depuis quand nous nous taisons.',
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
      tutorial: [
        { id: 'wish', text: 'Les habitants formulent des vœux avec une échéance. Exaucer un vœu injecte une tuile rare dans ta file.' },
      ],
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
      tutorial: [],
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
      tutorial: [],
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
      text: 'Que l’eau descende jusqu’à la mer. Ma barque en a assez de la boue.',
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
      text: 'Cinq tuiles d’eau ensemble. Je veux voir le ciel par terre.',
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
    water: { name: 'Eau', blurb: 'Aime le marais et le sable ; reliée à la mer ou à une roche, elle devient rivière et gèle en hiver.' },
    marsh: { name: 'Marais', blurb: 'Aime l’eau, fleurit au printemps et attire la grenouille ; le hameau ne veut pas de lui.' },
    rock: { name: 'Roche', blurb: 'Aime la forêt et fait naître les rivières ; le champ s’y casse la charrue.' },
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

  closed: ['Bouclé !', 'Une région entière !', 'Tout autour !', 'Voilà qui tient.'],

  ending: [
    'La dernière tuile est posée. Nous attendons que tu nous dises quelle saison vient. Tu ne dis rien.',
    'Alors la rivière gèle toute seule. Les hameaux se regardent par-dessus la glace. Personne ne t’a rien demandé.',
    'Puis la glace craque au matin, les marais fleurissent, et les canards reviennent en freinant des pattes. Nous avons fait cela sans toi.',
    'Nous avons compris. Ce n’est pas la saison que tu nous rendais. C’est le passage.',
    'Douze îles. Cent saisons. Nous les avons toutes comptées et nous ne compterons plus.',
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

  garden: {
    intro: [
      'Le Jardin. Pas de file, pas de points, pas de vœux : tu choisis chaque tuile et tu fais une île belle.',
    ],
  },
};
