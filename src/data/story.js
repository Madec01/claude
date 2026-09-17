// Feux de Brume — textes narratifs (français exclusivement).
// Consommé par src/ui/story.js, src/game/tutorial.js, src/ui/ending.js.
// Chaque « écran » tient en 1 à 3 phrases. Aucun markdown : le texte est affiché tel quel.

export const STORY = {
  title: 'Feux de Brume',
  subtitle: 'Chroniques du phare de Sant-Aël',

  characters: {
    elise: { name: 'Élise Kervran', role: 'Gardienne du phare' },
    yann: { name: 'Yann Kervran', role: 'Ancien gardien, disparu' },
    legoff: { name: 'Madame Le Goff', role: 'Capitaine de port' },
    mael: { name: 'Maël', role: 'Pêcheur, navette de l’île' },
  },

  prologue: [
    'Automne 1893. La chaloupe de Maël m’a déposée sur le rocher de Sant-Aël à la marée du soir. Il n’a pas voulu rester.',
    'Mon père, Yann Kervran, a tenu ce feu vingt-deux ans. Il y a trois mois, il est sorti dans la Brume avec le canot. Il n’est pas revenu.',
    'Depuis, la Brume monte chaque nuit avec la marée. Elle est trop blanche. Elle ne suit pas le vent. Les navires qui y entrent perdent le nord.',
    'Le port a besoin d’un feu. Personne d’autre n’a voulu monter. Je connais la lanterne : j’y ai grandi.',
    'La mèche est taillée, l’huile est chaude, la lentille sent le cuivre et le sel. Dehors, la mer est noire et la passe des Loups attend. Ce soir, je fais la relève.',
  ],

  nights: {
    1: {
      title: 'La Relève',
      act: 1,
      journal: [
        'Première nuit. Le mécanisme de la lentille grince, il lui faut de l’huile et à moi du courage. L’odeur de la lampe me rassure : elle sent l’enfance.',
        'J’ai relu les consignes de mon père, clouées près de l’escalier. Garder le feu. Relever les écueils. Ne jamais tracer une route à l’aveugle.',
        'Madame Le Goff a fait passer un mot par Maël. Deux navires attendus. Elle ne me croit pas capable. Nous verrons.',
      ],
      briefing: {
        speaker: 'legoff',
        lines: [
          'Mademoiselle Kervran. Deux cotres rentrent ce soir par la passe des Loups. Je veux les voir à quai avant l’aube.',
          'Votre père connaissait chaque roche. Vous, non. Éclairez avant de guider.',
        ],
      },
      tutorial: [
        { id: 'beam', text: 'Déplace la souris : la lentille suit ton geste. Ce que le faisceau touche apparaît. Un écueil relevé reste sur la carte jusqu’à l’aube.' },
        { id: 'route', text: 'Clique sur un navire et glisse jusqu’au quai pour tracer sa route. Il la suivra. Un clic simple sur le navire efface la route.' },
        { id: 'dock', text: 'Un navire à quai est un navire sauvé. Atteins le quota avant l’aube, et ne laisse pas la mer en prendre trois.' },
      ],
      outroWin: {
        speaker: 'legoff',
        lines: [
          'Deux à quai. Je n’en attendais pas tant.',
          'Dormez. Demain, la marée sera plus forte et les navires plus nombreux.',
        ],
      },
      outroLose: {
        speaker: 'legoff',
        lines: [
          'Les navires ne se guident pas dans le noir, mademoiselle. Éclairez d’abord.',
          'La passe sera encore là demain. Vous aussi, j’espère.',
        ],
      },
    },

    2: {
      title: 'Les Sardiniers',
      act: 1,
      journal: [
        'Dormi trois heures. Les mains sentent encore l’huile. J’ai sorti la corne de la remise : un réservoir d’air, une pompe, une bouche de cuivre verte de sel.',
        'Maël dit que les chaloupes des sardiniers rentrent ce soir. Elles vont vite et n’écoutent que le bruit. Mon père les arrêtait d’un coup de corne.',
      ],
      briefing: {
        speaker: 'mael',
        lines: [
          'Bonsoir Élise ! Les sardiniers rentrent, pressés comme toujours. Ils filent, ceux-là, et ils ne regardent pas devant.',
          'Si tu en vois un foncer sur une roche, donne de la corne. Ils s’arrêtent net. C’est la seule chose qu’ils respectent.',
        ],
      },
      tutorial: [
        { id: 'horn', text: 'Espace : la corne. Tous les navires proches stoppent trois secondes, puis repartent. Elle met huit secondes à se recharger.' },
      ],
      outroWin: {
        speaker: 'mael',
        lines: [
          'Je l’ai entendue depuis le port, ta corne ! Le vieux Guivarc’h a dit que c’était la voix de ton père. Je n’ai rien répondu.',
        ],
      },
      outroLose: {
        speaker: 'mael',
        lines: [
          'Les chaloupes, c’est de la poudre. Une corne un peu tôt vaut mieux qu’une corne trop tard. Tu retrouveras le rythme.',
        ],
      },
    },

    3: {
      title: 'Le Goulet',
      act: 1,
      journal: [
        'Hier, deux cotres se sont présentés ensemble au goulet. J’ai eu de la chance. La chance n’est pas un métier : il faut savoir faire attendre un navire.',
        'Les cartes de mon père sont trouées de notes. Au goulet, il a écrit : « Un seul à la fois. Ancre. » Trois mots, soulignés deux fois.',
        'La Brume est montée plus tôt ce soir. Elle était là avant le plein de la marée, immobile, comme si elle attendait que j’allume.',
      ],
      briefing: {
        speaker: 'legoff',
        lines: [
          'Trois navires dans le goulet ce soir, en même temps. Le goulet n’en passe qu’un. Faites-les attendre.',
          'Et n’essayez pas de deviner les roches. Ce qu’on ne voit pas, on ne le trace pas.',
        ],
      },
      tutorial: [
        { id: 'anchor', text: 'Clic droit sur un navire : il mouille l’ancre et attend sur place. Clic droit encore : il lève l’ancre et repart.' },
        { id: 'hazard', text: 'Un écueil hors de la lumière n’existe pas sur ta carte. Ne trace jamais une route dans le noir : éclaire d’abord, trace ensuite.' },
      ],
      outroWin: {
        speaker: 'legoff',
        lines: [
          'Trois navires, un goulet, aucun bois cassé. Votre père faisait cela sans y penser. Vous y pensez encore. C’est bien.',
        ],
      },
      outroLose: {
        speaker: 'legoff',
        lines: [
          'Un navire qui attend n’est pas un navire perdu. Ne les faites pas passer tous à la fois.',
        ],
      },
    },

    4: {
      title: 'Ce que l’eau ramène',
      act: 1,
      journal: [
        'Ce matin, sur la grève, un morceau de papier collé à une algue. L’écriture de mon père, délavée. Illisible. Je l’ai mis à sécher près du feu.',
        'S’il y en a une, il y en a d’autres. Elles dérivent dans la passe. Il faudra les lire à la lumière avant que la mer ne les reprenne.',
        'Maël a monté des Éclats de l’ancienne lentille, celle qui s’est brisée en 1852. Le verrier du port peut en tirer quelque chose à l’atelier.',
      ],
      briefing: {
        speaker: 'mael',
        lines: [
          'Élise, j’ai vu des papiers flotter près de la Grande Dent, hier. Tu crois que… enfin, je te dis ce que j’ai vu.',
          'Quatre bateaux ce soir. Et garde un œil sur l’eau, pas seulement sur les coques.',
        ],
      },
      tutorial: [
        { id: 'page', text: 'Une page dérive. Garde le faisceau dessus une seconde et demie pour la lire. Chaque page rapporte des Éclats pour l’atelier.' },
      ],
      outroWin: {
        speaker: 'legoff',
        lines: [
          'Le port a compté. Quatre à quai, mademoiselle Kervran. Les capitaines ont demandé qui tenait le feu. J’ai dit : la fille de Yann.',
          'Ils ont hoché la tête. C’est un début.',
        ],
      },
      outroLose: {
        speaker: 'mael',
        lines: [
          'Le papier attendra, les bateaux non. Prends les pages quand la passe est calme, pas quand tout arrive à la fois.',
        ],
      },
    },

    5: {
      title: 'La Marée',
      act: 2,
      journal: [
        'La première page a séché. Mon père écrivait : « La Brume monte avec la marée. » Je regarde la jauge du quai comme il la regardait.',
        'À marée basse, la passe montre ses dents : les roches émergent, noires, et rien ne passe. À marée haute, elles disparaissent. Les chaloupes passent, les gros navires s’y ouvrent.',
        'La mer rend et reprend. Je commence à comprendre ce qu’il voulait dire.',
      ],
      briefing: {
        speaker: 'legoff',
        lines: [
          'Grande marée ce soir, fort coefficient. Les roches de la passe vont sortir et rentrer avant l’aube.',
          'Une chaloupe passe sur une roche noyée. Un cotre y laisse sa quille. Regardez la jauge avant de tracer.',
        ],
      },
      tutorial: [
        { id: 'tide', text: 'La marée monte et descend. Marée basse : les écueils émergent et bloquent. Marée haute : noyés, les chaloupes passent, les gros navires s’y brisent.' },
      ],
      outroWin: {
        speaker: 'legoff',
        lines: [
          'Vous avez lu la marée. Votre père disait qu’elle était le seul horloger honnête de la côte.',
        ],
      },
      outroLose: {
        speaker: 'legoff',
        lines: [
          'La roche qu’on ne voit plus n’a pas bougé. Elle attend sous l’eau. Regardez la jauge.',
        ],
      },
    },

    6: {
      title: 'Vent d’ouest',
      act: 2,
      journal: [
        'Le baromètre est tombé toute la journée. Le vent d’ouest siffle dans les vitres de la lanterne. La pluie va raccourcir mon feu.',
        'Deuxième page. « Elle ne suit pas le vent. » J’ai vérifié depuis la galerie : le vent d’ouest pousse tout vers la Grande Dent. La Brume, non.',
      ],
      briefing: {
        speaker: 'mael',
        lines: [
          'Tempête ce soir, Élise. Des cotres n’ont pas pu attendre au large, ils rentrent quand même. Le vent va les jeter sur les roches.',
          'Il n’y a que ta corne qui les tienne. Regarde la flèche du vent, et ne compte pas trop sur ta lumière : la pluie la mange.',
        ],
      },
      tutorial: [
        { id: 'storm', text: 'Les rafales poussent les navires hors de leur route. La pluie raccourcit le faisceau. La flèche du HUD indique d’où souffle le vent.' },
      ],
      outroWin: {
        speaker: 'mael',
        lines: [
          'Je ne sais pas comment tu as fait. La pluie tombait de travers et je voyais ta lumière trouer tout ça. Les gars du port ont bu à ta santé.',
        ],
      },
      outroLose: {
        speaker: 'mael',
        lines: [
          'Contre le vent, il faut tracer large et corner tôt. Tu as tenu longtemps. La prochaine fois, tu tiens jusqu’à l’aube.',
        ],
      },
    },

    7: {
      title: 'La Sirène',
      act: 2,
      journal: [
        'La marée basse d’hier a découvert une carcasse au fond de la passe. Des membrures noires, un nom effacé. Maël a détourné les yeux.',
        'Ce soir passe un trois-mâts chargé. Il tire six pieds d’eau : les roches noyées le tueront là où les chaloupes glissent. Je n’ai jamais guidé si gros.',
        'Madame Le Goff monte au phare ce soir. Elle n’était jamais venue.',
      ],
      briefing: {
        speaker: 'legoff',
        lines: [
          'L’épave que vous avez vue, c’est La Sirène. Quarante-huit hommes, en novembre 1852. Le feu de Sant-Aël s’est éteint cette nuit-là.',
          'Le gardien s’appelait Kervran. Votre grand-père.',
          'Je vous le dis parce qu’un trois-mâts passe ce soir, et que vous devez savoir ce que la Brume regarde.',
        ],
      },
      tutorial: [],
      outroWin: {
        speaker: 'legoff',
        lines: [
          'Le trois-mâts est à quai. Son capitaine dit que le feu ne l’a pas lâché une seconde.',
          'Je ne vous ai pas parlé de votre grand-père pour vous accabler. Vous aviez le droit de savoir.',
        ],
      },
      outroLose: {
        speaker: 'legoff',
        lines: [
          'Un trois-mâts ne tourne pas. Tracez sa route longtemps d’avance, et faites attendre les petits.',
        ],
      },
    },

    8: {
      title: 'Contre le vent',
      act: 2,
      journal: [
        'Pas dormi. Grand-père Kervran. Personne ne m’en avait jamais parlé, et je comprends maintenant pourquoi mon père se taisait.',
        'Ce soir, la Brume est arrivée contre le vent. Elle remontait la passe comme on monte un escalier. Les pages disent vrai : elle cherche quelque chose.',
        'Marée, vent, trois-mâts, chaloupes. Tout ce que j’ai appris arrive en même temps. Je le ferai proprement.',
      ],
      briefing: {
        speaker: 'legoff',
        lines: [
          'Tout le cabotage de la semaine rentre ce soir, avant la tempête d’équinoxe. Six navires. Je ne vous dis pas comment.',
          'Les capitaines vous font confiance. C’est plus lourd que le contraire.',
        ],
      },
      tutorial: [],
      outroWin: {
        speaker: 'mael',
        lines: [
          'Six ! Le port n’a jamais vu ça en une nuit. Madame Le Goff a souri, je te jure, j’ai des témoins.',
          'Mais Élise… la Brume, en repartant, elle est passée contre mon bateau. Elle était froide. Elle avait comme une forme.',
        ],
      },
      outroLose: {
        speaker: 'legoff',
        lines: [
          'Vous savez tout ce qu’il faut savoir. Il reste à le faire dans l’ordre. Reprenez.',
        ],
      },
    },

    9: {
      title: 'La Bête',
      act: 3,
      journal: [
        'Elle a une forme. Je l’ai vue depuis la galerie, au montant : une masse plus dense dans la Brume, qui glissait vers le cotre de Maël.',
        'Elle a reculé quand je l’ai éclairée. Pas fui : reculé, comme une bête devant une torche. La corne l’a déchirée. Elle s’est refermée après.',
        'Je ne sais pas comment la nommer. Une bête, peut-être. Une bête qui cherche une porte.',
      ],
      briefing: {
        speaker: 'mael',
        lines: [
          'Élise, il y a une chose dans la Brume. Elle est venue sur moi, hier. Le froid, la lampe qui pâlit, plus de nord. Sans ta lumière, je n’étais plus là.',
          'Tiens-la loin des bateaux. Et si elle en attrape un, cherche-le : il est encore quelque part dans le blanc.',
        ],
      },
      tutorial: [
        { id: 'beast', text: 'La Bête traque le navire le plus proche. Le faisceau la ralentit, la corne la repousse. Un navire touché est perdu : retrouve-le et retrace sa route.' },
      ],
      outroWin: {
        speaker: 'elise',
        lines: [
          'Elle recule devant le feu. Pas parce qu’il la brûle. Parce qu’elle le reconnaît.',
          'Je ne sais pas encore ce que je dois lui donner. Mais elle n’a pris aucun navire ce soir.',
        ],
      },
      outroLose: {
        speaker: 'elise',
        lines: [
          'Un navire perdu n’est pas coulé. Il est dans le blanc, il attend qu’on le retrouve. Je l’ai laissé trop longtemps.',
        ],
      },
    },

    10: {
      title: 'La Mèche basse',
      act: 3,
      journal: [
        'Maël n’a pas pu venir hier : les barils sont restés à Port-Aël. La cuve sonne creux. À la jauge, trois nuits, si je ne baisse pas la mèche.',
        'Le feu réduit éclaire moitié moins. Mon père le pratiquait par les nuits creuses. On entend la flamme baisser, un souffle court, et la mer redevient immense.',
        'Les navires à quai déchargent des barils. Chaque navire sauvé me rend un peu de lumière. C’est la seule justice de ce métier.',
      ],
      briefing: {
        speaker: 'legoff',
        lines: [
          'Le port n’a plus d’huile à vous envoyer avant la fin de la semaine. Les navires vous en livreront à quai. Économisez.',
          'Un feu réduit vaut mieux qu’un feu mort. Un feu mort, c’est 1852.',
        ],
      },
      tutorial: [
        { id: 'oil', text: 'Le faisceau brûle l’huile. Touche F : feu réduit, demi-portée, moitié moins d’huile. Les navires à quai livrent des barils. À sec, le feu meurt cinq secondes.' },
      ],
      outroWin: {
        speaker: 'mael',
        lines: [
          'Je t’ai vue baisser la lampe et la relever, baisser et relever. Du port, on aurait dit que le phare respirait.',
        ],
      },
      outroLose: {
        speaker: 'legoff',
        lines: [
          'Une lampe à sec ne se rallume pas en claquant des doigts. Baissez-la quand la passe est vide, pas quand elle est pleine.',
        ],
      },
    },

    11: {
      title: 'Le Dernier Baril',
      act: 3,
      journal: [
        'Pages treize et quatorze. L’huile avait été vendue au village, l’hiver de 1852, pour manger. Le feu s’est éteint devant La Sirène. Grand-père en est mort de honte.',
        'Il faut leur répondre, écrivait mon père. Je crois savoir où il est allé. Au fond de la passe, sous la vase, il y a une cloche.',
        'Tempête annoncée. La Bête est là. La cuve est au quart. Maël monte le dernier baril du port. Je tiendrai. Pas pour le port : pour eux.',
      ],
      briefing: {
        speaker: 'mael',
        lines: [
          'C’est le dernier baril, Élise. Après ça, plus rien avant le caboteur de dimanche. Madame Le Goff a dit de te dire de descendre si ça tourne mal.',
          'Moi, je ne te dis rien. Je te regarde depuis le quai, comme d’habitude. Tiens bon.',
        ],
      },
      tutorial: [],
      outroWin: {
        speaker: 'elise',
        lines: [
          'Le baril est vide. La Bête a reculé jusqu’au fond de la passe et n’est pas revenue. Il reste une nuit d’huile, peut-être moins.',
          'J’ai entendu une cloche sous le vent. Pas celle du quai.',
        ],
      },
      outroLose: {
        speaker: 'mael',
        lines: [
          'Tu n’as pas à tout tenir d’un coup. Corne pour la Bête, feu réduit quand la passe est vide, routes larges contre le vent. Encore une fois.',
        ],
      },
    },

    12: {
      title: 'Le Feu du fond',
      act: 3,
      journal: [
        'Dernière huile. La Brume couvre toute la passe.',
        'Au fond, une lanterne bat. Trois coups longs, un court. Le signal de mon père.',
      ],
      briefing: {
        speaker: 'legoff',
        lines: [
          'Un navire sort de la Brume avec la lanterne de Yann. Aucun capitaine du port ne l’attend. Ramenez-le.',
          'Je serai sur le quai.',
        ],
      },
      tutorial: [],
      outroWin: {
        speaker: 'elise',
        lines: [
          'La lanterne s’est éteinte quand la coque a touché le quai. La mienne aussi. Il n’en fallait pas plus.',
        ],
      },
      outroLose: {
        speaker: 'elise',
        lines: [
          'Il est encore là, au fond de la passe. Il attend le feu. Je rallume.',
        ],
      },
    },
  },

  pages: [
    { id: 'p01', night: 4, title: 'Page arrachée', text: 'Trois mois que je note les heures. La Brume ne monte pas avec la nuit : elle monte avec la marée. Une heure après le flot, jamais avant. Je l’attends comme on attend un bateau.' },
    { id: 'p02', night: 4, title: 'Feuillet taché d’huile', text: 'Coup de vent d’ouest tout le jour. La Brume est venue de l’est, contre lui, épaisse comme une laine. Elle ne suit pas le vent. Rien de ce qui vit sur l’eau ne fait cela.' },
    { id: 'p03', night: 5, title: 'Page pliée en quatre', text: 'Ce soir j’ai tourné la lentille lentement, une seule fois. Là où passait le faisceau, la Brume s’écartait puis revenait, comme une main qu’on retire et qu’on repose.' },
    { id: 'p04', night: 5, title: 'Coin de carte', text: 'Elle ne fuit pas la lumière. Elle la suit. Quand j’éteins, elle vient sur le rocher ; quand j’allume, elle recule et attend. Elle cherche un feu. Pas le mien.' },
    { id: 'p05', night: 6, title: 'Page rongée par le sel', text: 'Relu le registre de 1852. Nuit du 14 novembre : « Feu éteint de minuit à l’aube. » Rien d’autre. Le gardien n’a jamais dit pourquoi. Je sais qui il était.' },
    { id: 'p06', night: 6, title: 'Feuillet aux lignes serrées', text: 'Deux versions au village. Il dormait, dit l’une. L’huile manquait, dit l’autre. Personne ne veut dire laquelle est vraie. Les deux vieillissent mal.' },
    { id: 'p07', night: 7, title: 'Page brûlée au bord', text: 'Marée d’équinoxe. La Sirène est sortie de la vase, noire, ouverte comme une côte. Quarante-huit hommes. Ils avaient un feu pour les ramener. Ils ne l’ont pas eu.' },
    { id: 'p08', night: 7, title: 'Page à l’encre diluée', text: 'J’ai compris ce que je regarde depuis trois mois. La Brume n’est pas un temps. C’est une mémoire. La mer se souvient à notre place.' },
    { id: 'p09', night: 8, title: 'Feuillet trouvé dans une bouteille', text: 'Ils cherchent le feu. Chaque nuit, ils remontent la passe à la même heure, dans le noir de 1852, et ils regardent Sant-Aël. Sant-Aël brille. Ce n’est pas le bon feu.' },
    { id: 'p10', night: 8, title: 'Page à moitié effacée', text: 'La lumière ne suffit pas. Il faut leur répondre. Quand La Sirène a touché, sa cloche a sonné jusqu’à ce que l’eau la couvre. Personne n’a répondu.' },
    { id: 'p11', night: 9, title: 'Page griffonnée', text: 'Elle a une forme, maintenant. Elle glisse vers les coques comme un chien vers une porte. Je l’appelle la Bête, faute de mieux. Elle n’est pas mauvaise. Elle est perdue.' },
    { id: 'p12', night: 9, title: 'Feuillet à la mine de plomb', text: 'La corne la déchire, la lumière la tient. Mais chaque nuit elle revient plus dense. Ils sont quarante-huit à vouloir rentrer. On ne repousse pas cela avec du cuivre.' },
    { id: 'p13', night: 10, title: 'Page cousue au fil de pêche', text: 'Trouvé la lettre de mon père dans la doublure du registre. Il ne dormait pas. L’huile avait été vendue au village, l’hiver d’avant, pour manger. La cuve était sèche.' },
    { id: 'p14', night: 10, title: 'Page à l’écriture tremblée', text: 'Il est mort deux hivers plus tard, sans reparler. Ma mère disait : de la poitrine. C’était la honte. Il est mort de honte devant un feu qu’il n’avait pas pu nourrir.' },
    { id: 'p15', night: 11, title: 'Feuillet lesté d’un galet', text: 'J’irai sonner la cloche de La Sirène. Elle est encore dans l’épave, sous la vase ; à marée basse, on la touche. Je frapperai jusqu’à ce qu’ils entendent.' },
    { id: 'p16', night: 11, title: 'Page à l’encre fraîche', text: 'Élise, si tu lis ceci, tu tiens le feu. Ne le laisse pas mourir, quoi qu’on te dise. Et n’aie pas peur de la Bête. Elle cherche le chemin du port. Comme tout le monde.' },
    { id: 'p17', night: 12, title: 'Page écrite dans le blanc', text: 'Je suis sur un navire qui n’avance plus. Il n’y a pas de vent ici, pas d’heure. Les hommes ne parlent pas. Ils regardent tous du même côté : vers ton feu.' },
    { id: 'p18', night: 12, title: 'Dernière page', text: 'Ma fille, ils me suivent parce que j’ai sonné. Il leur faut maintenant la lumière qui ramène. Garde le faisceau sur nous. Nous rentrons ensemble, ou nous restons.' },
    { id: 'p19', night: 0, title: 'Note de métier', text: 'Le feu ne sauve personne. Il montre où est la roche et laisse aux hommes le soin de la contourner. C’est déjà beaucoup.' },
    { id: 'p20', night: 0, title: 'Note de veille', text: 'Une nuit de garde est un long balayage. La lentille tourne, l’huile baisse, la mer parle. Quand l’aube vient, on ne l’a pas méritée. On l’a attendue.' },
  ],

  ending: [
    'La coque a touché le quai à l’instant où la mèche a rendu son dernier souffle. Sur le pont, personne n’a crié. Ils ont regardé le phare s’éteindre, et ils ont souri.',
    'La Brume s’est retirée par le fond de la passe, doucement, comme une marée qui descend. Elle n’a rien emporté.',
    'Mon père est descendu le premier. Amaigri, trempé, une cloche verte de vase à la main. Il a dit mon nom. Il ne l’avait jamais dit comme ça.',
    'Derrière lui, quarante-huit hommes en vareuse d’un autre temps ont posé le pied sur les pierres de Port-Aël. Ils n’ont rien dit. Puis ils n’étaient plus là.',
    'Madame Le Goff a inscrit La Sirène au registre des arrivées. « Retard : quarante et un ans. » Elle a signé sans trembler.',
    'Maël a fait trois voyages pour monter l’huile. Le feu est reparti avant le jour.',
    'L’aube est venue. Grise, ordinaire, sans mémoire. J’ai baissé la mèche et je suis restée à la galerie, à regarder la passe des Loups redevenir de l’eau.',
  ],

  epilogue: 'La Brume reviendra, comme la marée. Il y aura un feu.',

  infinite: {
    intro: [
      'La Brume est revenue. Pas la mémoire de 1852 : une autre, plus ancienne, sans nom. La mer a beaucoup à se souvenir.',
      'Cette veille n’a pas d’aube. Tiens le feu tant que tu peux. Le port comptera.',
    ],
  },

  lose: {
    generic: [
      'La mer a pris trois navires. Le feu brûle encore ; la passe attend.',
      'La mer a pris ce qu’elle voulait cette nuit. Elle reviendra. Toi aussi.',
      'La mer a pris trop de bois. Baisse la mèche, respire, rallume.',
    ],
  },
};
