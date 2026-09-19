# Cent Saisons — Spécification de conception : la succession naturelle

*19 septembre 2026. Game design. Aucun fichier de code lu autrement que pour s'y ancrer, aucun fichier modifié, aucun commit.*

---

## 0. Verdict, avant tout le reste

**Oui, mais uniquement dans sa version minimale, et uniquement dans un lot qui retire autant qu'il ajoute.**

L'auditeur du 18 septembre a raison sur le diagnostic : le jeu est *large*, pas dense ; dix systèmes cohabitent dont trois partagent le même geste ; le chemin le plus court vers 8 passe par le retrait. Ajouter un onzième système est, en soi, une mauvaise idée.

Deux choses sauvent pourtant celle-ci :

1. **C'est la seule mécanique proposée jusqu'ici qui rend le titre mécaniquement vrai.** L'audit le dit en toutes lettres (mesure C1, « faire de la saison le cœur, pas l'accompagnement ») : aujourd'hui la saison change la couleur et la table de points, elle ne change pas l'île. Le gel, la sécheresse, la floraison sont des *états* (`t.frozen`, `t.dry`, `t.bloom`) — réversibles, cosmétiques, sans effet sur les familles. La succession est le premier effet du temps qui soit **irréversible et structurel**. Un jeu qui s'appelle *Cent Saisons* et dans lequel cent saisons ne transforment rien est un jeu dont le titre ment.
2. **Elle rend redondantes deux choses existantes** (le bourgeon et la ruine restaurée), donc elle peut être livrée à somme nulle en nombre de règles — et à somme négative si le lot emporte aussi G2.

**Conditions de rejet.** Je recommande de **ne pas faire** cette mécanique si l'une de ces trois conditions n'est pas tenue :

- si elle arrive **avant l'île 36** (les îles courtes ne durent pas assez de saisons : la mécanique n'y serait qu'un bruit) ;
- si elle est livrée **en version complète** (six successions) dès le premier lot ;
- si le bourgeon est **conservé à côté d'elle** — ce serait exactement la redondance que l'audit condamne, et cette fois nous l'aurions créée en connaissance de cause.

Dans ces trois cas, les mesures C1, G2, M1 et P3 de l'audit valent plus, pour moins cher.

---

## 1. La table de succession

### 1.1 Les deux principes qui produisent la table

**Principe A — l'ossature ne bouge pas.** Roche, colline, eau et hameau ne se transforment jamais. Ce n'est pas de la timidité, c'est une nécessité de code et de lisibilité :

- `Board.isRiver()` définit une rivière comme une chaîne d'eau qui touche **la mer, une roche ou une colline**. Une roche qui deviendrait forêt transformerait rétroactivement une rivière (+2 par tuile, +3 à l'embouchure) en lac (+1 par tuile), des saisons après que le joueur l'a construite. C'est un vol pur.
- L'eau est la seule famille dont la **forme** est notée (`water.js` : étang, lac, rivière, lac de montagne). La modifier, c'est reclasser un système entier après coup.
- Roche et colline portent le fortin, la grotte, la cascade, la mine, la tour, le menhir, le lac de montagne. Huit règles pendent à ces deux familles.
- Le hameau abandonné existe déjà dans le jeu : il s'appelle **la friche**. Le refaire serait un doublon.

La contrepartie de ce principe, c'est que le joueur garde un terrain stable sous les pieds : **l'île qu'il a dessinée en roche, en eau et en villages est celle qu'il retrouvera à la fin.** Seule la couverture végétale bouge — ce qui est, accessoirement, la vérité écologique : le relief et l'hydrographie sont des échelles de temps qui ne sont pas celles d'une succession.

**Principe B — la succession répare, elle ne punit pas.** Cinq des six flèches de la table partent d'une tuile **mal placée au regard des affinités existantes** et arrivent sur une tuile mieux placée :

| Situation de départ | Ce que dit déjà la table d'affinités | Ce que fait la succession |
|---|---|---|
| Champ sans hameau voisin | `field\|hamlet` = 2 perdu ; champ dormant tout l'hiver | devient prairie (`meadow\|forest` 1, `orchard\|meadow` 2…) |
| Marais sans eau voisine | `marsh\|water` = 2 perdu ; `hamlet\|marsh` = −1 | devient prairie |
| Sable dans les terres | `field\|sand` −1, `forest\|sand` −1, `orchard\|sand` −1 | devient lande (`heath\|meadow` 1, `forest\|heath` 1, `heath\|rock` 1) |
| Verger sans hameau | `orchard\|hamlet` = 2 perdu ; pas de récolte d'automne | devient forêt |

Conséquence directe et voulue : **un joueur qui joue bien ne voit presque rien se transformer.** Ses champs touchent des hameaux, ses marais touchent l'eau, ses sables touchent l'eau. La succession est le rattrapage doux des poses subies (file ingrate, dernière case libre), pas une taxe sur les bonnes poses. Elle se comporte comme la friche à l'envers : la friche punit la pose calamiteuse, la succession recycle la pose médiocre.

### 1.2 La table, onze familles

| Famille | Devient | Condition de voisinage (toutes les saisons comptées) | Saisons | Vérité écologique | Pourquoi ce choix de jeu |
|---|---|---|---|---|---|
| **prairie** | **forêt** | ≥ 3 voisines de forêt, **et** aucun voisin humain | **2** | Recolonisation par la lisière : une prairie non fauchée, bordée de forêt, est boisée en quelques années. La graine vient du bord, d'où la condition de trois voisines. | La flèche demandée par le commanditaire. Courte (2 saisons) parce que c'est **celle qu'on doit voir arriver la première**, sur l'île qui l'introduit. |
| **champ** | **prairie** | aucun voisin hameau (ni ferme, ni moulin, ni grenier, ni four) | **3** | La jachère : un champ que personne ne laboure est repris par les graminées en deux à trois ans. | La plus lisible de toutes : « personne ne cultive ici ». Trois saisons, parce qu'un champ isolé est souvent un accident de file qu'on veut pouvoir corriger en posant un hameau à côté. |
| **marais** | **prairie** | aucune voisine d'eau **et** ≥ 3 voisines de terre ferme (tout sauf eau et marais) | **2** | Atterrissement : un marais qui n'est plus alimenté se comble de sédiments et de matière organique, devient prairie humide, puis prairie. | La deuxième flèche demandée. Courte, parce qu'un marais sec est laid et mauvais (`hamlet\|marsh` = −1) et qu'il n'y a pas de plaisir à le regarder pourrir six saisons. |
| **sable** | **lande** | aucune voisine d'eau **et** ≥ 3 voisines végétalisées (prairie, forêt, lande, colline, verger) | **3** | Fixation des dunes : l'oyat puis la callune stabilisent un sable continental. | Sauve la famille la plus punie du jeu, **sans toucher à la plage** : le sable qui touche l'eau (`sand\|water` = 2, lagune) ne bouge jamais. Le bon sable reste, le mauvais s'améliore. |
| **verger** | **forêt** | aucun voisin hameau | **3** | Un verger que personne ne taille se referme : les fruitiers s'étiolent, les espèces forestières prennent le dessus. | Peu fréquent (le verger sans hameau est déjà rare et déjà peu payant). Présent surtout pour la cohérence de la règle générale « sans humains, la forêt revient ». |
| **lande** | **forêt** | ≥ 2 voisines de forêt **et** aucun voisin humain | **3** | L'embroussaillement classique de la lande abandonnée : genêt, bouleau, pin. | Le prix à payer pour la vérité écologique. **C'est la flèche que je coupe en version minimale** : elle n'ajoute aucune décision, seulement de la convergence vers la forêt. |
| **forêt** | **rien** | — | — | La forêt *est* le climax en climat tempéré. Elle ne devient rien. | Et surtout : « la forêt qui vieillit » **existe déjà**, c'est la signature de niveau 3 (`forêt ancienne`, `LEVEL3_SEASONAL.forest`). En faire une succession serait le doublon exact que l'audit reproche au jeu. |
| **eau** | **rien** | — | — | Un étang se comble, c'est vrai (2 à 5 siècles). | Refusé : l'eau est la seule famille dont la forme est notée (`water.js`) ; toute transformation reclasse rétroactivement rivières, embouchures et lacs de montagne. Coût de risque sans commune mesure avec le gain. |
| **roche** | **rien** | — | — | L'érosion d'une roche est à 10⁴–10⁶ ans : hors de l'échelle du jeu, contrairement à toutes les autres flèches (2 à 30 ans). | Principe A. Elle porte la définition de la rivière, le fortin, la grotte, la cascade, la mine, le lac de montagne. |
| **colline** | **rien** | — | — | Idem. | Idem. Elle est aussi source de rivière. |
| **hameau** | **rien** | — | — | Un village abandonné devient une ruine, puis un bois. | Refusé comme doublon : la **friche** (`t.blighted`, sol sec, rendue par `obj_ruinsCorner`) fait déjà exactement cela, et la ruine restaurée aussi. |

**Six flèches, cinq familles immobiles.** Deux flèches seulement pointent vers la forêt en version minimale (une seule, même : prairie → forêt), ce qui est le garde-fou principal contre l'île qui converge (§ 8.4).

### 1.3 La règle qui empêche les chaînes

**Une tuile ne succède qu'une fois.** Après transformation elle porte une marque définitive (`t.grown = true`) et n'est plus jamais candidate.

Sans cette règle : champ → prairie → forêt en 5 saisons, marais → prairie → forêt en 5 saisons, sable → lande → forêt en 6. Toute l'île finirait en forêt sur une grande île de douze saisons. Avec elle, le pire cas est un pas, et l'île garde la trace de ce qu'elle était : une prairie née d'un champ reste une prairie.

C'est aussi ce qui rend la mécanique **bornée et prévisible** : le joueur peut regarder son île et savoir, sans compter, que rien ne se transformera deux fois.

---

## 2. Le déclencheur

### 2.1 Au changement de saison, jamais en cours de saison

**Décision : la succession est résolue uniquement dans `transition()`, à l'intérieur de `advanceSeason()`, juste après le dégel, la sécheresse et la floraison.**

Trois raisons, par ordre de poids :

1. **L'aperçu de pose est la meilleure chose du jeu** (audit, § 3). Il est calculé sur l'état courant du plateau. Une transformation qui se déclencherait au bout de N poses ferait mentir un aperçu montré 200 ms plus tôt, et transformerait le meilleur élément du jeu en piège.
2. Le changement de saison est **déjà** le moment où le plateau change sans le joueur (gel, sécheresse, floraison, semis). Y ranger la succession, c'est n'ajouter aucun nouveau moment à apprendre : une seule respiration par saison, pas un goutte-à-goutte de surprises.
3. La saison est l'unité *dont parle* la mécanique. Le compteur de poses est déjà surchargé (ouvrage toutes les 16 poses, remise 12 poses, échéances de vœux en poses) ; ajouter un quatrième compteur en poses serait illisible.

### 2.2 Le compteur de maturité

À chaque changement de saison, pour chaque tuile éligible :

- si la condition de sa ligne est vraie → `t.ripe = (t.ripe || 0) + 1` ;
- **si elle est fausse → `t.ripe = 0`** (remise à zéro complète, pas un décrément) ;
- si `t.ripe ≥ N` → transformation.

La remise à zéro sèche est le cœur du consentement (§ 3) : **poser une seule tuile au bon endroit annule entièrement une maturation, quel que soit son avancement.** C'est net, c'est facile à énoncer, et c'est visible (les pousses disparaissent).

### 2.3 Qui est éligible

| Tuile | Succède ? | Pourquoi |
|---|---|---|
| Posée par le joueur, niveau 1, nue | **oui** | le cas normal |
| Tuile de départ (`t.start`) | **non** | C'est le décor initial de l'île, son identité et sa première image. La voir se transformer à la saison 2 ressemble à un bug, pas à une règle. Elles sont d'ailleurs majoritairement hameau, roche et ruines : immobiles de toute façon. |
| Niveau 2 ou 3 | **non — « bâtir, c'est fixer »** | (a) le joueur a payé un souffle : la transformer serait un vol ; (b) `region.size` compte une tuile de niveau 2 pour deux, et ses bords valent +1 : l'instabilité serait doublée ; (c) **cela donne à `bâtir` un second usage gratuit**, sans une ligne de règle nouvelle. |
| Portant un ouvrage (`t.work`) | **non** | L'évaluation d'un ouvrage dépend de la famille (`is('field')` pour l'épouvantail, `is('forest')` pour le nichoir). Un ouvrage qui deviendrait mauvais parce que le sol a changé sous lui serait la pire injustice du jeu. En prime, cela donne **un deuxième verrou** au joueur. |
| Fusion (`t.fusion`) | **non** | Famille composite (`RARE_AS`), aucune ligne de la table ne s'y applique. |
| Rare (`t.rare`) | **non** | Idem. |
| Friche (`t.blighted`) | **non** | Une friche ne compte pour aucune famille (`familiesOf` renvoie `[]`) : elle est le contraire d'une tuile vivante. On la répare en bâtissant dessus, c'est tout. |
| Tuile déjà transformée (`t.grown`) | **non** | § 1.3. |

**Les voisins, eux, comptent par `Board.isFamily()`** : la chapelle bloque comme un hameau, le moulin bloque comme un hameau et comme un champ, le puits, le campement et l'abreuvoir comptent comme prairie, le port compte comme hameau et comme eau. Aucune règle nouvelle : la table `RARE_AS` fait déjà tout le travail, et cela rend les tuiles rares *plus* intéressantes sans les toucher.

### 2.4 Les bornes de sécurité

| Borne | Valeur | Justification chiffrée |
|---|---|---|
| Transformations par changement de saison | **3 au plus** | Au-delà, la transition devient illisible (audit M1 : six surfaces simultanées déjà reprochées). Priorité aux `ripe` les plus élevés, puis ordre `(q, r)` pour rester déterministe. Les recalées gardent leur `ripe` et passent à la saison suivante. |
| Transformations par île | **15 % des tuiles posées** | Sur une île de 120 cases (108 poses), cela plafonne à 16. Au-delà, l'île n'est plus celle du joueur. Compteur simple sur l'objet `Island`. |
| Dernière saison | **aucune succession** | Quand il reste moins de `seasonLength` poses dans la file, la succession se tait : l'image finale, la tournée finale et la carte postale sont celles que le joueur a composées. |
| Jardin | **jamais** | Le Jardin n'appelle pas `advanceSeason()` (`this.garden` le court-circuite). Rien à faire, c'est cohérent : le Jardin est un mode sans temps. |

**Fréquence attendue.** Sur l'île 43 (120 cases, `seasonLength` 10, `tilesRatio` 0.9 → 108 poses, 10 à 11 saisons), en partant des poids de file `all` : environ 19 prairies, 15 champs, 8 marais posés. Avec les conditions ci-dessus et un joueur correct (qui colle ses champs aux hameaux et ses marais à l'eau), j'estime **7 à 9 transformations par île**, soit un peu moins d'une par saison. Un joueur faible en verra 14 à 16 (plafonnées). Un joueur excellent en verra 2 ou 3.

**C'est la propriété la plus importante de tout ce document : la mécanique se retire d'elle-même devant le bon jeu.**

---

## 3. Le consentement du joueur

### 3.1 Les trois postures, honnêtement

| | **(a) Automatique, annoncée une saison à l'avance** | **(b) Proposée, le joueur accepte ou refuse** | **(c) Automatique, annulable pour un souffle** |
|---|---|---|---|
| Ce que ça coûte au joueur | rien, s'il a regardé | une décision par transformation | 1 souffle par refus |
| Surfaces d'interface | zéro (le décor est l'annonce) | **1 à 3 fenêtres modales par changement de saison**, soit jusqu'à 30 par île | 1 bandeau + 1 bouton par transformation |
| Compatibilité avec M1 (« plus aucune bulle pendant la transition ») | totale | **destruction complète de M1** | mauvaise |
| Qualité de la décision offerte | la décision est *avant* : où je pose, quoi je bâtis | « voulez-vous gagner des points ? oui » — une fausse décision dans 90 % des cas | une décision sous forme d'amende |
| Compatibilité avec G3 (« rendre les souffles rares ») | neutre | neutre | **contraire** : crée un puits de souffles dont le joueur n'a pas choisi l'existence |
| Ton | contemplatif : l'île continue | administratif | punitif |
| Risque de frustration | moyen (§ 8.2) | nul | faible mais permanent |

### 3.2 Recommandation : (a), avec quatre leviers préventifs

**Automatique, annoncée une saison à l'avance.** C'est la seule posture cohérente avec le jeu : *tout ce que le joueur fait, il le fait en posant une tuile.* Il n'y a pas, dans Cent Saisons, de bouton « accepter » ni de fenêtre de confirmation, et il ne faut pas en introduire un pour la mécanique dont le sujet est précisément que le temps passe sans demander la permission.

La posture (b) est disqualifiée par un calcul simple : jusqu'à 3 transformations × 10 saisons = 30 interruptions par île, au moment exact où l'audit demande de retirer du texte. La posture (c) est un `undo` avec des étapes supplémentaires, et elle entre en collision avec le vrai `undo` (un par saison, 2 à 4 souffles) : le joueur ne saurait plus lequel des deux il utilise.

Mais (a) n'est acceptable que parce que le joueur dispose de **quatre leviers, dont deux gratuits**, pour dire non :

1. **Poser une tuile humaine à côté** (hameau, champ, verger — ou une rare qui en tient lieu). Gratuit, c'est une pose qu'il faisait de toute façon, et c'est la vérité écologique : on arrête une succession en entretenant la terre. Levier disponible dans 100 % des cas.
2. **Poser une tuile d'une autre famille pour casser la condition de voisinage** (une eau à côté du marais, une eau à côté du sable). Gratuit.
3. **Bâtir dessus** (1 souffle) : la tuile passe au niveau 2 et sort définitivement de la table.
4. **Poser un ouvrage dessus** (gratuit, quand on en a un) : même effet.

Et un cinquième levier, dans l'autre sens : **hâter** (§ 6.1), 1 souffle, pour provoquer une succession qu'on veut.

### 3.3 Prévenir une saison à l'avance sans un mot

**L'annonce, c'est le décor.** Quand `t.ripe` atteint `N − 1`, la tuile reçoit, au même changement de saison et dans la même animation que le reste, **les objets de sa famille future, en petit** (§ 7). Une prairie qui va se boiser porte trois jeunes arbres de 40 % de taille. Un champ qui va retourner en jachère perd ses cultures et garde ses sillons vides. Un marais qui se comble perd ses nénuphars.

Trois propriétés :

- **Zéro caractère de texte ajouté à l'écran.** L'audit reproche déjà six surfaces de texte simultanées à la transition ; nous en ajoutons zéro.
- **La convention est unique et apprise en une fois** : *un objet deux fois trop petit au centre-bas d'une tuile veut dire « cette tuile change à la prochaine saison »*. Elle vaut pour les six flèches.
- **Le signal inverse est aussi visible** : si le joueur pose un hameau à côté, les pousses disparaissent au changement de saison suivant. Il voit qu'il a agi, sans qu'on le lui dise.

Le texte existe quand même, mais **à la demande** : la fiche de tuile au survol (qui existe déjà) affiche une ligne — « Prairie — se boise à la prochaine saison ». C'est de l'information tirée, pas poussée.

---

## 4. Le score

### 4.1 Une succession rapporte zéro point

**Décision tranchée : 0 point direct.** Trois raisons :

1. Ce n'est pas un coup du joueur. Payer un coup que le joueur n'a pas joué brouille la lecture du score, que le lot C vient précisément de clarifier (`tally` par source, « le pourquoi des points »).
2. **Le calibrage.** Les cinquante îles ont des seuils mesurés au bot (`campaign_stars.js`, quatre facteurs). Une source de points automatique et variable selon la qualité du jeu — plus le joueur est mauvais, plus il en gagne — est exactement le genre de bruit qui casse un calibrage. À 0 point, la dérive ne vient que des bords et des fermetures, elle est mesurable et bornée (§ 8.3).
3. **Le gain existe déjà et il est structurel** : la tuile transformée s'agrège à une meilleure région, ses bords deviennent meilleurs dès la saison suivante, et son niveau 3 éventuel (si le joueur bâtit dessus après) devient accessible. C'est plus satisfaisant qu'un « +3 » qui vole vers le compteur.

L'événement est tout de même émis (`{ type: 'succession', q, r, from, to, pts: 0 }`) pour l'animation, le journal de saison et les succès.

### 4.2 Les régions déjà closes : le vrai piège, et sa parade

`board.closedRegions` est un `Set` de clés `"famille:cléMinimale"`. Une région close est mémorisée par cette clé **et la prime de fermeture n'est payée qu'une fois par clé**.

Or une succession change la famille d'une tuile, donc :

- elle peut **scinder** une région close (une prairie close dont une tuile devient forêt : deux régions de prairie, deux nouvelles clés, dont `isRegionClosed()` sera vrai) ;
- elle peut **agrandir** une région forestière close et **changer sa clé minimale** (la nouvelle tuile a une coordonnée plus petite).

Dans les deux cas, la clé enregistrée ne correspond plus, `closedRegionsAround()` conclut « région close jamais comptée » et **repaie la prime, pour une région qui peut faire 20 cases**. C'est à la fois un bug d'affichage, une brèche de score et un exploit trivial (laisser un trou de prairie dans une forêt close).

**Parade, en trois temps, à la transformation :**

1. relever les clés de régions closes auxquelles la tuile appartient **avant** (pour sa famille d'origine, et pour toutes les régions voisines de sa famille d'arrivée) ;
2. transformer ;
3. recalculer les régions autour de la case ; **toute région dont la clé est nouvelle mais qui recouvre au moins une case appartenant à une région close relevée en 1 est ajoutée à `closedRegions` silencieusement** : pas de prime, pas d'événement `close`, pas d'incrément de `stats.closed`.

**Une seule exception, volontaire :** si la transformation ferme une région qui n'avait **jamais** été close, la prime est payée normalement. C'est rare (il faut une enclave d'une famille au milieu d'une autre, et deux saisons de patience) et c'est un joli cadeau. Il reste borné par la taille de la région, et l'obtenir coûte au joueur d'avoir laissé un trou deux saisons.

### 4.3 Les vœux : droit de veto

**Règle : une succession qui ferait *reculer* la progression d'un vœu encore ouvert ne se déclenche pas.**

Mise en œuvre : avant de transformer, comparer `progressOf(w, ctx)` avec et sans la transformation, pour chaque vœu `status === 'open'`. Si l'un recule, la tuile **gèle son compteur** (`ripe` reste à `N`, il n'est pas remis à zéro) et se transformera au premier changement de saison après la clôture du vœu (exaucé ou manqué).

Coût : au plus 3 candidates × 4 vœux = 12 évaluations par changement de saison, une centaine par île. Négligeable au regard des balayages déjà faits à chaque transition.

Ce que cela protège concrètement, sur les vœux existants : `region` (plus grande région d'une famille), `closed` (plus grande région close d'une famille), `pairs` (paires de bords `field|hamlet`), `bourg`. Ce que cela ne protège pas, et c'est voulu : un vœu **déjà exaucé** reste acquis pour toujours (`status === 'done'`), la succession ne le reprend pas.

### 4.4 Les contrats d'archipel : rien à faire

Vérification faite sur `contracts.js`, les huit contrats comptent : régions closes, animaux présents en fin d'île, vœux exaucés, coups parfaits, séries, tuiles bâties, fusions, ouvrages bien placés. **Aucun ne porte sur une famille.** La succession ne les touche donc pas — à une réserve près, traitée en § 4.2 : les fermetures héritées n'incrémentent pas `stats.closed`, sans quoi le contrat « Les enclos » serait rempli gratuitement.

### 4.5 Le reste

| Cas | Décision |
|---|---|
| **Fusion posée dessus** | Impossible : une fusion ne succède jamais (§ 2.3). Réciproquement, on peut fusionner sur une tuile en train de mûrir — cela annule la maturation, la fusion est un verrou de plus. |
| **Ouvrage posé dessus** | Impossible : une tuile avec ouvrage ne succède jamais. Le joueur qui veut figer une tuile y pose un ouvrage. |
| **Tuile rare voisine** | Compte par `RARE_AS` : la chapelle bloque comme un hameau, le puits compte comme une prairie. Aucune règle nouvelle. |
| **Niveau 2 / 3** | Ne succèdent pas ; la signature de niveau 3 (forêt ancienne, bourg, eau profonde) reste ce qu'elle est. |
| **Faune** | `evalFauna()` lit les familles : une succession peut faire partir un lapin et arriver un chevreuil. C'est une conséquence heureuse, à ne pas corriger. `updateFauna()` est déjà appelé en fin d'`advanceSeason()`. |
| **Sentiers** | `computeLinks()` relie deux hameaux à travers de la terre ouverte (prairie, champ, verger, lande, colline). Un champ devenu prairie reste ouvert ; **une prairie devenue forêt coupe un sentier** (−1 par saison). C'est la seule perte sèche possible de la mécanique : elle est réelle, elle est rare, et le joueur peut la prévenir avec un hameau — qui, justement, est ce qui fait le sentier. Cohérent. |
| **Eau, gel, veillée** | Intouchés : l'eau ne succède pas. |
| **Friche** | Ne succède pas ; une friche reste une friche jusqu'à réparation. |

---

## 5. La place dans la campagne

### 5.1 Où : l'île 41, chapitre 9

Contraintes à satisfaire :

- **Assez de saisons.** Une succession à 2 ou 3 saisons n'a de sens que sur une île qui en compte 8 à 12. Les îles 1 à 20 en comptent 4 à 7 : la mécanique n'y produirait rien de visible, et le peu qu'elle produirait tomberait dans la dernière saison, interdite.
- **`bâtir` doit exister**, puisque « bâtir, c'est fixer » est le levier de consentement principal. Donc après l'île 16.
- **Ne pas charger un chapitre qui a déjà une identité.** Le chapitre 8 (36–40) porte déjà le changement de climat à chaque île, avec sa carte de tutoriel à chaque fois.
- **Combler le vide.** Après l'île 31 (niveau 3), **plus aucune mécanique n'arrive sur dix-neuf îles.** L'audit le dit crûment (§ 4) : « les chapitres 8 et 9 ne diffèrent que par la taille ». Le chapitre 9 est celui qui n'a d'autre identité que « c'est plus grand ».

**Décision : `MECH_AT[41] = ['succession']`, et le chapitre 9 change de sous-titre : « Les grandes îles » → « Les grandes îles — ce que le temps y fait ».**

C'est le seul endroit où les trois choses coïncident : des îles de 104 à 140 cases (10 à 13 saisons, les seules où une tuile posée tôt peut mûrir *et* être vue mûrir), un chapitre sans identité, et une mécanique qui a besoin de durée. Aucun réordonnancement des chapitres existants n'est nécessaire.

Dans les modes libres (Île infinie, Île du jour), elle est active comme les autres mécaniques ; dans le Jardin, elle ne se déclenche jamais faute de saisons.

### 5.2 Faut-il une île tutoriel ? Non — mais l'île 41 doit être écrite pour ça

Créer une 51ᵉ île coûterait un décalage de toute la carte, des seuils, des chapitres et de la porte. Inutile : l'île 41 peut *être* le tutoriel sans cesser d'être une île de campagne, avec trois éléments qui existent tous déjà :

1. **Une signature d'île** (système `signatures.js`, dix-sept contraintes écrites, quatorze déjà assignées aux îles 36 à 49) : **« L'île abandonnée »** — parmi les tuiles de départ, trois prairies encerclées de forêts, posées avec `ripe = 1` et leurs jeunes pousses déjà visibles. Exception assumée et unique à la règle « les tuiles de départ ne succèdent pas », propre à cette île. Le joueur voit sa première succession **au premier changement de saison**, dans les dix premières poses, sans qu'on la lui explique.
2. **Une carte de mécanique** (`STORY.mechCards.succession`), une seule, ~45 mots : *« Une tuile bien entourée assez longtemps finit par changer de famille : la prairie cernée de forêts se boise, le champ que personne ne cultive retourne en prairie, le marais coupé de l'eau se comble. Des pousses l'annoncent une saison à l'avance. Un hameau voisin l'arrête ; bâtir dessus la fixe. »*
3. **Un vœu propre à l'île 41** (réserve `CAMPAIGN_WISHES`, nouveau type `succession`, `count: 2`, `dl: 0.8`) : « Laisser deux tuiles changer d'elles-mêmes. » Un vœu qui demande de **ne rien faire** est, dans ce jeu, une petite idée juste.

### 5.3 Coût de calibrage

Dix îles (41 à 50) à recalibrer : `campaign_stars.js`, quatre facteurs chacune, une passe de `calibrate.js`. Le bot doit en plus apprendre une règle (« un champ posé loin d'un hameau vaut, à trois saisons, une prairie »), sans quoi il sous-estimera ces îles et poussera les seuils vers le bas — ce qui serait un cadeau, mais un cadeau faux.

**Critère d'arrêt chiffré : si la dérive mesurée du score médian du bot sur les îles 41–50 dépasse ±8 %, la mécanique ne passe pas en l'état.**

---

## 6. Ce que ça retire

L'auditeur demande du retrait. Voici la contrepartie, et elle est exigible : **je ne recommande pas de livrer la succession seule.**

### 6.1 Le bourgeon disparaît et devient « hâter »

Le bourgeon (`BALANCE.breaths.bud = 3`, prairie → forêt ou verger, immédiat) est **le même effet, obtenu par un autre chemin**. Le garder à côté de la succession, c'est créer volontairement la redondance que l'audit reproche.

**Il devient « hâter », 1 souffle : la tuile survolée gagne immédiatement une saison de maturité.** Sur une prairie qui remplit la condition, deux souffles et deux clics donnent exactement l'ancien bourgeon, en plus lent et en plus cher — mais sur *toutes* les flèches, pas seulement la prairie.

Bilan : même bouton, même touche, même icône, **une règle en moins** (plus besoin d'expliquer « prairie → forêt ou verger »), un souffle de moins par usage (cohérent avec G3 qui veut les souffles rares mais les emplois nombreux), et une action qui devient **l'accélérateur d'un système** au lieu d'être un système à elle seule. Perte réelle et assumée : on ne peut plus fabriquer un verger de rien ; le verger reste dans la file.

### 6.2 La ruine restaurée (`restore`) disparaît

La tuile d'événement « Ruine restaurée » adopte la famille majoritaire autour d'elle. C'est la version unique, rare et instantanée de l'idée « c'est le voisinage qui décide ce que devient cette tuile » — c'est-à-dire la succession en un coup.

Ce que son retrait emporte : une tuile rare sur quinze, une branche de vingt lignes dans `place()`, une ligne de `EVENT_TILES`, une phrase de `mechCards.event`, et une entrée du Cahier. Le joueur, lui, perd un tirage sur douze dans la réserve de rares — qu'il ne remarquera pas.

### 6.3 La condition sine qua non : G2 dans le même lot

La succession ajoute une **quatrième** chose qui peut arriver à une tuile déjà posée, après bâtir, fusionner et poser un ouvrage. Le compte est mauvais.

**Je recommande de conditionner la livraison de la succession à celle de G2** (les ouvrages deviennent des fusions ; la remise, son compte à rebours, son `freshWindow`, ses trois statistiques et l'amélioration « Grande remise » disparaissent).

Bilan de règles du lot complet : **+1** (succession) **−1** (bourgeon) **−1** (ruine restaurée) **−1** (ouvrages comme file séparée + remise) = **−2**. C'est à ce prix-là, et pas moins, que la mécanique est défendable devant l'audit.

---

## 7. Lisibilité : voir qu'une tuile mûrit, et vers quoi

Contrainte absolue du projet : **on ne dessine jamais d'image par le code.** Tout ce qui suit n'utilise que des sprites déjà présents dans `assets/img/deco/` et le système `Decor` existant (objets placés par région, positions déterministes par graine de case, filtres `seasons` / `weathers` / `rules` déjà en place).

### 7.1 La convention unique

> **Un objet de la famille d'arrivée, à moins de la moitié de sa taille, posé au centre-bas de la tuile, veut dire : cette tuile change au prochain changement de saison.**

Elle s'apprend une fois, sur les trois prairies de l'île 41, et elle vaut pour les six flèches. Ces objets respirent lentement (alpha 0,85 → 1,0 sur 2 s) : c'est le seul mouvement lent de l'île, l'œil le trouve tout seul en balayant, et cela ne coûte rien au rendu (un paramètre d'alpha, pas un filtre `ctx.filter` — le journal a déjà mesuré ce que coûtent les filtres).

### 7.2 Les six annonces, sprite par sprite

| Flèche | À `ripe = N − 1` | À la transformation |
|---|---|---|
| **prairie → forêt** | 3 × `obj_treeRound_small_{s}` à `scale 0.42`, placés par `sample()` avec la graine de la case | le décor de forêt est généré normalement, **en gardant les trois positions des pousses** portées à `scale 1.0` : on voit littéralement les jeunes arbres avoir grandi |
| **champ → prairie** | `obj_farmland_{s}` remplacé par `obj_farmland_empty_{s}` (sprite existant), + 2 × `obj_bushGrass_{s}` sur les marges | sol `field` → `grass` en fondu de 1 s (le fondu de sols entre familles existe déjà pour les raccords de bords), décor de prairie normal |
| **verger → forêt** | 1 × `obj_hedge_{s}` (sprite existant) entre deux rangées + 2 × `obj_bushGrass_{s}` : la haie se referme, personne ne passe plus | décor de forêt, les `obj_treeRound_fruit_{s}` remplacés par des `obj_treeRound_large_{s}` |
| **marais → prairie** | `obj_lily` retiré, 1 × `obj_moss` ajouté, densité de `obj_bushGrass_{s}` doublée | sol `dirt` → `grass` en fondu de 1 s |
| **sable → lande** | 2 × `obj_heather_{s}` à `scale 0.5` + 1 × `obj_bushGrass_dry` | sol `sand` → `heath`, décor de lande normal |
| **lande → forêt** | 2 × `obj_treePine_small_{s}` à `scale 0.45` | décor de forêt de conifères |

**Sprites nouveaux à produire : aucun.** `obj_farmland_empty_{s}` et `obj_hedge_{s}` sont déjà au pipeline et inutilisés ou sous-utilisés : la mécanique les fait enfin servir.

### 7.3 Ce qui n'est pas ajouté

Pas de badge, pas d'icône d'horloge, pas de contour de couleur, pas de compteur « 2/3 », pas de bandeau à la transformation, pas de bulle. La transformation est jouée **avant** les vols de points de la saison, pendant la seconde où la caméra recule (M1), à raison de 0,25 s par tuile — trois tuiles au plus, donc 0,75 s, dans le temps mort qui existe déjà.

Un seul texte, tiré et non poussé : la ligne de la fiche de tuile au survol.

---

## 8. Risques, et parades

### 8.1 Chaos visuel à la transition

*Le changement de saison affiche déjà gel, dégel, sécheresse, floraison, récoltes, veillées, ouvrages, niveaux 3, fusions, faune. Six surfaces de texte simultanées sont déjà reprochées.*

**Parade :** plafond de 3 transformations par saison ; jouées avant les vols de points, dans le temps mort du recul de caméra ; 0 point donc aucun chiffre volant ; aucun texte. Contrôle de recette : capture de la transition la plus chargée possible (hiver, climat froid, île 45, trois successions) — si elle n'est pas lisible en une seconde, le plafond descend à 2.

### 8.2 Le joueur subit

*Une région close cassée, une affinité soignée détruite, un vœu compromis.*

**Parade :** les régions déjà closes ne sont jamais repayées ni « décloses » (§ 4.2) ; les vœux ouverts ont un droit de veto (§ 4.3) ; quatre leviers préventifs dont deux gratuits (§ 3.2) ; annonce une saison à l'avance (§ 7). Et la propriété de fond : la table ne transforme presque jamais une tuile *bien* placée, parce que ses conditions sont exactement les symptômes d'une mauvaise place.

### 8.3 Calibrage des étoiles cassé

*Cinquante îles ont des seuils mesurés au bot. Dix changent de comportement.*

**Parade :** 0 point direct, donc la dérive ne vient que des bords (meilleurs) et de fermetures occasionnelles. Recalibrage obligatoire des îles 41 à 50. **Critère de refus : dérive médiane > 8 %.** Et le bot doit connaître la règle, sinon il jouera comme si elle n'existait pas et abaissera artificiellement les seuils.

### 8.4 L'île qui converge vers la forêt

*C'est le risque le plus sérieux, parce que la vérité écologique pousse dans ce sens : en climat tempéré, tout finit en forêt.*

**Parade, à quatre étages :**
1. **Un pas par tuile, jamais de chaîne** (`t.grown`, § 1.3). C'est la parade principale : aucune tuile ne peut faire champ → prairie → forêt.
2. **Deux flèches sur six pointent vers la forêt** en version complète, **une sur trois** en version minimale ; les autres vont vers prairie et lande.
3. **Les deux flèches vers la forêt exigent de la forêt déjà présente** (3 voisines pour la prairie, 2 pour la lande) : elles épaississent des forêts existantes au lieu d'en créer.
4. **Plafond dur de 15 % des tuiles posées par île.**

**Contrôle de recette chiffré :** faire jouer le bot sur les îles 41 à 50 avec et sans la mécanique, et comparer la part de forêt en fin de partie. **Si la part de forêt augmente de plus de 4 points de pourcentage, la mécanique est refusée en l'état** (les conditions passent de 3 à 4 voisines, ou la flèche lande → forêt saute).

### 8.5 Incompatibilité avec les contrats et les vœux

**Parade :** vérification faite, aucun des huit contrats ne porte sur une famille ; les fermetures héritées n'incrémentent pas `stats.closed` (sans quoi « Les enclos » se remplirait tout seul) ; les vœux ont un droit de veto. Reste un cas non couvert et accepté : un vœu à échéance lointaine peut geler une maturation pendant plusieurs saisons. C'est un retard, jamais une perte.

### 8.6 Le repaiement des fermetures (bug et exploit)

*Détaillé en § 4.2 : la clé `"famille:cléMinimale"` change, la prime est repayée.* **Parade :** héritage silencieux des clés closes. **Contrôle de recette :** test modèle qui ferme une forêt de 12 cases avec un trou de prairie, laisse la prairie se boiser, et vérifie que le score n'a pas bougé de plus que les bords.

### 8.7 La mécanique qui ne se voit jamais

*Risque inverse et tout aussi grave : si un bon joueur ne déclenche que 2 successions par île, la mécanique est un coût de règle pour rien.*

**Parade :** l'île 41 la montre de force (signature « L'île abandonnée », trois prairies déjà mûres). Et la mesure à faire : si le bot fort en déclenche **moins de 3 par île en moyenne** sur les îles 41–50, les seuils sont trop stricts — passer la prairie à 2 voisines de forêt. La bande cible est **4 à 10 par île**.

### 8.8 La dernière image n'est pas celle du joueur

*Une succession à l'avant-dernière saison change la carte postale et la tournée finale.*

**Parade :** aucune succession quand il reste moins de `seasonLength` poses. L'image finale appartient au joueur.

### 8.9 Le sentier coupé

*Une prairie devenue forêt casse une liaison entre deux hameaux (−1 par saison), sans que le joueur l'ait demandé.*

**Parade :** c'est la seule perte sèche possible, elle est rare, et le levier qui l'empêche (poser un hameau ou un champ à côté) est celui-là même qui crée les sentiers. Je laisse la conséquence : une règle qui ne peut jamais coûter n'est pas une règle.

---

## 9. Trois variantes de portée

### V1 — Minimale : trois successions *(recommandée)*

**prairie → forêt** (3 forêts, 2 saisons) · **marais → prairie** (0 eau, ≥3 terres, 2 saisons) · **champ → prairie** (0 hameau, 3 saisons).

Les deux flèches demandées par le commanditaire, plus la jachère — la plus lisible des trois et la seule qui parle de l'absence des hommes plutôt que de la nature. Arrivée à l'île 41. Bourgeon fondu en « hâter », ruine restaurée supprimée. Une seule flèche vers la forêt, donc risque de convergence quasi nul.

| Plaisir attendu | Coût | Risque |
|---|---|---|
| **4 / 5** | **2 / 5** | **2 / 5** |

*Plaisir 4* : les trois flèches couvrent les trois émotions (l'île qui avance toute seule, la réparation de la pose subie, la trace de l'abandon). La quatrième étoile manquerait à un système qui offrirait une vraie décision — celui-ci offre surtout une atmosphère. *Coût 2* : une table de trois lignes, un compteur par tuile, un bloc dans `transition()`, trois entrées de décor avec des sprites existants, le recalibrage de dix îles. *Risque 2* : les parades des § 8.2, 8.4 et 8.6 sont indispensables ; le reste est confortable.

### V2 — Complète : six successions, onze familles arbitrées

Ajoute **verger → forêt**, **sable → lande**, **lande → forêt**.

| Plaisir attendu | Coût | Risque |
|---|---|---|
| **4 / 5** | **4 / 5** | **4 / 5** |

*Plaisir 4, pas 5, et c'est l'argument décisif* : les trois flèches supplémentaires ajoutent de l'écologie, pas des décisions. Le joueur ne joue pas différemment parce que le sable peut devenir lande ; il le constate. *Coût 4* : doublement de la table, six annonces de décor, six comportements du bot, recalibrage plus incertain. *Risque 4* : deux flèches de plus vers la forêt (verger, lande) rouvrent le risque de convergence, et six transformations possibles par île augmentent mécaniquement le nombre d'occasions de casser quelque chose.

**Recommandation : V2 comme lot ultérieur, six mois après V1, si et seulement si la mesure de § 8.7 montre que V1 se déclenche trop rarement.** V1 est, littéralement, un sous-ensemble de V2 : on n'aura rien à défaire.

### V3 — Alternative : la succession seulement dans les régions closes

Une région close est, dans la fiction du jeu, un lieu achevé. **La succession ne s'applique qu'aux tuiles appartenant à une région close**, avec la même table et les mêmes délais. Une prairie close cernée de forêts se boise ; une prairie ouverte ne bouge jamais.

| Plaisir attendu | Coût | Risque |
|---|---|---|
| **3 / 5** | **1 / 5** | **1 / 5** |

*Plaisir 3* : la propriété est belle (« ce que vous finissez, le temps le reprend ») et la fréquence est basse mais visible (10 à 20 fermetures par grande île). Elle perd toutefois l'essentiel : la réparation de la pose subie, puisqu'une tuile mal placée est rarement dans une région close. *Coût 1* : le déclencheur se greffe sur `closedRegions`, qui est déjà maintenu ; pas de compteur global, pas de plafond, très peu de cas. *Risque 1* : les régions closes ont déjà payé leur prime, le § 4.2 devient trivial ; les vœux `closed` restent protégés par le veto.

**Défaut honnête et sérieux** : elle rend la fermeture d'une région ambiguë. Aujourd'hui fermer est un pur gain ; avec V3, fermer une prairie au milieu d'une forêt revient à la condamner. Cela pourrait dissuader de fermer — c'est-à-dire abîmer la meilleure mécanique du jeu.

**C'est néanmoins la variante que je livrerais si le commanditaire refuse de retirer quoi que ce soit** (§ 6), parce qu'elle n'ajoute presque rien à tenir en tête.

*V3-bis, écartée : la succession comme pure récompense de vœu (« ce vœu exaucé, choisissez une tuile qui changera »). Rejetée : elle fait de la succession un pouvoir du joueur, pas un effet du temps — c'est le bourgeon avec un autre nom, donc le doublon qu'on cherche à supprimer.*

---

## 10. Récapitulatif des décisions

| Question | Décision |
|---|---|
| Table | 6 flèches en V2, **3 en V1 recommandée** ; forêt, eau, roche, colline, hameau immobiles |
| Chaînes | interdites : une tuile ne succède qu'une fois (`t.grown`) |
| Déclencheur | au changement de saison, dans `transition()`, jamais en cours de saison |
| Compteur | `t.ripe` +1 par saison où la condition tient, **remis à 0 dès qu'elle tombe** |
| Éligibilité | tuiles posées, niveau 1, nues ; **pas** les tuiles de départ, ni niveau 2/3, ni ouvrage, ni fusion, ni rare, ni friche |
| Plafonds | 3 par saison, 15 % des tuiles par île, rien dans la dernière saison, rien au Jardin |
| Consentement | **(a) automatique, annoncée une saison à l'avance** + 4 leviers préventifs dont 2 gratuits |
| Annonce | décor en petit format, sprites existants, zéro texte poussé |
| Score | **0 point direct** ; fermetures héritées silencieusement ; droit de veto des vœux ouverts |
| Campagne | **île 41**, chapitre 9 renommé ; pas d'île tutoriel, une signature d'île + une carte + un vœu |
| Retraits exigés | bourgeon → « hâter » (1 souffle) ; ruine restaurée supprimée ; **G2 dans le même lot** |
| Refus | si avant l'île 36, si V2 d'emblée, si le bourgeon est conservé, si la dérive de calibrage dépasse 8 %, ou si la part de forêt monte de plus de 4 points |

---

# Annexe — Vérification par la mesure (lead, 19 septembre)

*La spécification ci-dessus est une conception. Cette annexe la confronte à des parties réelles : six variantes de
déclencheur simulées saison par saison sur les îles 26 à 49, avec un joueur automatique glouton (il pose toujours au
meilleur emplacement, sans anticiper — un bon joueur humain, pas un expert).*

## A1. Le point de départ : une succession subie fait perdre des points

| Variante | Tuiles concernées par île | Effet sur le score |
|---|---|---|
| Succession écologique, changement de famille pur | 3 à 12 | **−9 à +2** |
| Succession libre (la tuile prend la meilleure famille possible) | 26 à 58 | +53 à +148 |
| Double famille (garde l'ancienne, gagne la nouvelle) | 0 à 7 | +0 à +13 |

Gain possible par tuile si elle pouvait changer librement de famille : `0:143  1:57  2:50  3:36  4:23  5:11  6:8  7:3  8:3`.
La moitié des tuiles concernées sont dans une région déjà close.

**Lecture.** Quand on pose bien, chaque tuile est déjà à sa meilleure place pour sa famille. En changer la famille casse
des affinités soignées. Une succession automatique punit donc le bon joueur ; une succession optimisante offre jusqu'à
25 % du score et casse le calibrage. Le principe B de la spécification (« la succession répare, elle ne punit pas »)
est la bonne réponse à ce problème : il est confirmé par la mesure, l'effet sur le score tombe à zéro.

## A2. Mais toutes les conditions de voisinage se déclenchent trop rarement

Six variantes simulées avec le compteur `ripe` saison par saison, plafond de 3 par saison, rien dans la dernière saison :

| Déclencheur testé | Transformations par île | Moyenne | Flèches qui se déclenchent |
|---|---|---|---|
| **V1 de la spécification** (3 flèches strictes, 2–3 saisons) | 0 à 4 | **2,0** | champ → prairie seulement |
| V1 assouplie (5 flèches, ≥2 voisines, ≤1 eau) | 0 à 5 | 3,0 | champ, sable, prairie, marais |
| « la tuile ne rapporte rien depuis 2 saisons » | 0 à 1 | 0,5 | trois familles, une fois chacune |
| « entourée de tous côtés » + meilleure famille | 1 à 8 | 3,3 | incohérent (verger → marais) |
| **Synthèse** : entourée de tous côtés + table écologique, 3 saisons | 0 à 4 | 1,6 | champ, lande, prairie |
| Idem, 2 saisons | 0 à 5 | 1,9 | champ, lande, prairie |
| Idem, 1 saison | 0 à 6 | 2,6 | champ, lande, prairie, verger |

**Lecture.** Le résultat est structurel, pas un problème de réglage : assouplir les seuils, multiplier les flèches et
descendre le délai à une seule saison ne fait pas passer la moyenne au-dessus de 3. Un joueur correct entoure chaque
tuile de sa propre famille ; « le voisinage appelle une autre famille » est donc rare par construction, et les tuiles
qui restent mal placées sont sur le bord de l'île, avec trop peu de voisines.

**Conséquence sur le critère de recette de la spécification** (§ 8.7 : « moins de 3 successions par île au bot fort,
la mécanique est refusée en l'état ») : **V1 ne le passe pas.** 2,0 en moyenne, et surtout les deux flèches demandées
par le commanditaire — prairie → forêt et marais → prairie — ne se déclenchent jamais sur six îles. Seule
champ → prairie vit vraiment. L'estimation de 7 à 9 transformations par île pour un joueur correct est quatre fois
trop haute ; elle n'avait pas pu être mesurée.

## A3. Ce que la mesure ne remet pas en cause

Tout le reste de la spécification tient, et deux trouvailles valent d'être gardées quoi qu'il advienne :

- **La brèche de score des régions closes.** `closedRegions` mémorise `"famille:cléMinimale"` ; une succession change
  la clé, la prime de fermeture serait repayée sur une région de vingt cases. Le piège est réel et la parade proposée
  (héritage silencieux des clés) est la bonne.
- **L'ossature immobile.** `isRiver` exige une roche ou une colline en tête de chaîne : transformer une roche
  reclasserait rétroactivement une rivière en lac, des saisons après coup. Roche, colline, eau et hameau ne doivent
  jamais changer. Et le hameau abandonné existe déjà : c'est la friche.

## A4. Trois façons de sortir, à trancher par le commanditaire

1. **Assumer la rareté.** Deux à quatre transformations par île, mais chacune devient un événement : annoncée par le
   décor une saison avant, saluée par un ruban et une note à la transition, comptée dans un succès, nommée sur la
   carte postale (« trois tuiles ont changé d'elles-mêmes »). On livre une atmosphère, pas un système. Coût faible.
2. **Changer de déclencheur : la région close mûrit.** 22 à 41 régions closes par île, dont 2 à 7 d'au moins quatre
   tuiles — à comparer aux 0 à 14 tuiles que le bot bâtit. Fréquence juste, déclencheur volontaire et déjà compris.
   Mais c'est une promotion dans la même famille (niveau 2), pas la prairie qui devient forêt.
3. **En faire une identité d'île plutôt qu'une règle générale.** Le système des signatures existe
   (`signatures.js`, dix-sept contraintes écrites). « L'île qui se reboise » devient une signature : sur cette
   île-là, et seulement là, la succession est agressive, visible, spectaculaire. Aucun système global ajouté, un
   système existant qui gagne un type de contenu. Coût très faible, et c'est le seul chemin compatible avec le
   « retirer plutôt qu'ajouter » de l'audit.

**Recommandation du lead : 1 + 3.** La table V1 de la spécification, ses garde-fous, son île 41, ses retraits
(bourgeon fondu en « hâter », ruine restaurée supprimée) — mais livrée comme une atmosphère rare et saluée, et
rendue spectaculaire sur deux ou trois îles à signature. La version 2 (six flèches partout) n'ajouterait pas de
décisions, seulement de l'écologie.
