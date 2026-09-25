# Le Souffle court : la feuille de route du mode

- **Date** : 25 septembre 2026.
- **Source** : audit de gameplay du 25 septembre 2026 (`docs/AUDIT_GAMEPLAY_2026-09-25.pdf`, pages 9 à 14 et 21 à 24), révision **31b3d60**. Dans l'audit, le mode s'appelle « À bout de souffle ».
- **Méthode** : chaque constat marqué « Vérifié » a été relu dans le code de cette révision, puis reproduit quand c'était possible, avec les vrais modules en Node ou dans Chromium (Playwright). Les scripts de reproduction sont restés hors du dépôt. Les décisions du commanditaire viennent de `FEUILLE_DE_ROUTE.md` (« Deux modes à part ») et des lignes 139 à 156 du journal.

**Ce que le mode promet.** Trouver vite une bonne place pour une tuile qu'on découvre au dernier moment, et avoir envie de recommencer pour faire mieux.

**Verdict.**
Le cœur du mode tient : poser vite, et bien. Mais quatre défauts trahissent la promesse. L'été perd cinq tuiles en une fraction de seconde. Le printemps ne fait pas ce qu'il annonce. Le tutoriel et la pause offrent du temps gratuit et gonflent les records. Et le délai de 8 s ne vaut pas en été.
On répare d'abord : les règles affichées doivent être les règles jouées. Ensuite seulement, on simplifie la découverte et on règle la série.
Les choix de fond de l'audit (retirer les saisons à effets, changer la série ou les pénalités) défont des décisions du commanditaire. Ils sont posés plus bas, comme des questions.

---

## 1. Constats vérifiés

Légende du verdict : **confirmé** (le code fait bien ce que dit l'audit), **partiel** (vrai, avec une nuance), **infirmé**, **déjà corrigé**, **à tester** (le code est vu, mais l'effet sur les joueurs reste à mesurer).

| Repère audit | Constat | Verdict | Preuve |
|---|---|---|---|
| 4.4 · S3 | **Été : pertes en rafale.** Quand la réserve de 12 s est vide, chaque tuile restante de la saison est perdue au pas suivant de la boucle, soit un tous les 1/60 s. | **confirmé**, et pire au téléphone | `src/game/tempo.js:41` : une fois vide, la réserve reste à 0. `armer()` (l. 34) remet `t = reserve = 0`, donc `perdre()` se déclenche à chaque pas. Node, graine 17, aux trois délais : 5 pertes à 11,983 · 12,000 · 12,017 · 12,033 · 12,050 s, puis l'automne arrive. Chromium : 5 pertes en 66 ms. Avec une image de 0,1 s (téléphone lent, `src/core/loop.js:38` enchaîne 6 pas fixes), **les 5 pertes tombent dans la même image**. |
| 4.4 · S3 | **8 s ne facilite pas l'été.** La réserve reste de 12 s pour 5 tuiles, quel que soit le délai. | **confirmé** | `src/data/balance.js:199` (`ete: 12`) ; `tempo.js:83`. Cela fait 2,4 s par tuile en été à tous les réglages. À 3 s, l'été enlève 20 % du temps. À 8 s, il en enlève 70 %, alors que l'hiver passe à 11,2 s (×1,4, l. 32). |
| 4.4 · S4 | **Les cartes du tutoriel figent le temps sans bloquer les poses.** | **confirmé** dans le navigateur | `src/main.js:1139-1140` : le temps s'arrête sous une carte (`tutoTient`), mais les entrées (`main.js:934`, `949`, `964`) ne regardent que `paused` et `hold`. La carte 1 n'a ni fin ni délai (`src/game/tutorial.js:50`) : elle reste tant qu'on ne touche pas « Compris ». Chromium : 14 poses **à la souris**, une toutes les 1,5 s, sans jamais toucher « Compris ». Résultat : 0 tuile perdue, série de 24, ×3, chronomètre figé à 3 s puis à 12 s. |
| 4.4 · S4 | **Une partie jouée avec le tutoriel compte pour le record.** | **confirmé** | `main.js:455` : le record est enregistré sans regarder `def.tuto`. Or la case « Revoir le tutoriel » peut être cochée à chaque partie (`src/ui/tempo_prep.js:20`). |
| 4.4 · S4 | **La pause réarme le délai.** À la reprise, le décompte appelle `armer()`, qui remet le délai à plein, et remet aussi à zéro le temps compté pour la série. | **confirmé** dans le navigateur | `main.js:1125` puis `main.js:701` (`this.tempo.armer()`) ; `tempo.js:34`. Chromium, automne, délai de 5 s : il reste **0,58 s** avant la pause et **4,98 s** après (`depuis` revient à 0,02). L'été n'est pas touché, parce que `armer()` y relit la réserve. |
| 4.4 · S3 | **Printemps : la tuile non choisie reste, la tuile neuve est jetée.** Il n'y a donc aucune perte. | **confirmé** | `tempo.js:74-77` : après `queue.take()`, la liste vaut [non choisie, neuve], et `splice(1)` garde la non choisie. Node, graines 12345, 17 et 42 : chaque fois, « l'autre RESTE » et la tuile n° 3 disparaît. Même résultat quand on choisit la 2ᵉ tuile. Le test Node `tests/rules.test.js:603` passe quand même, parce qu'il ne compte que le nombre de tuiles. |
| 4.3 | **Quatre exceptions dans une partie courte.** | **confirmé**, et plus lourd que dit | Les quatre effets du mode (`tempo.js:80-85`) s'ajoutent aux **règles de saison de la campagne**, qui restent actives : crue, sécheresse, récolte, veillée (`main.js:607` garde la mécanique `season`). Node sur 30 îles : 60 fois sur 60, chaque saison porte aussi sa règle de campagne. Chaque saison a donc deux couches de règles. Le récapitulatif et le tutoriel n'en disent rien. |
| 4.3 | **9 à 11 familles possibles.** Le mode s'ouvre après l'île 6. | **partiel** : 8 à 11 | Node, 60 îles jouées jusqu'au bout : minimum 8 familles, médiane 9, maximum 11. Le mode s'ouvre dès l'île 7 (`src/ui/menu.js:63`). La campagne présente la colline à l'île 8 et la lande à l'île 10 (`src/data/campaign.js:21`), mais 4 des 8 jeux de poids du mode les contiennent (`src/data/tempo.js:113`). |
| 4.3 | **La série exige toujours moins d'une seconde.** | **confirmé** | `balance.js:196` (`sousSeconde: 1`) ; `tempo.js:53`. Le seuil ne suit pas le délai : à 8 s, il faut poser dans le premier huitième du temps. |
| 4.3 | **Les cases vides ont plusieurs pénalités.** | **confirmé** | Une perte coûte à la fois : les points de la tuile, la série (`tempo.js:46`), la prime de saison pleine de +10 (`tempo.js:65`) et le malus de fin (−2, −5 ou −4, `src/data/tempo.js:130-165`). Mesure Node sur 30 îles, avec 10 % de pertes : 4 pertes en moyenne, **−4,1 points de malus de fin par perte**, et les saisons pleines tombent de 95 à 64 points. En tout, une perte coûte environ **25 points** (mesuré : 101 points de moins pour 4 pertes, 217 pour 9), mais le joueur ne voit sur le moment que la tuile qui disparaît. |
| 4.3 | **Au doigt, poser demande deux touchers.** | **confirmé** (l'effet est à tester) | `main.js:947-961` : le premier toucher arme la case, le second pose. Rien n'est propre au mode. |
| 4.3 | **Records peu comparables.** | **confirmé** | Un même bot, rapide et sans perte, sur 60 îles : de **574 à 1316 points** (médiane 899). Le tirage de l'île fait donc plus que doubler le score. De plus, l'île est plus haute que large au téléphone en portrait (`etire`, `main.js:390`) : à graine égale, ce n'est pas la même île sur téléphone et sur ordinateur. |
| 4.1 · S2 | **Cinq cartes de tutoriel, dont la dernière présente les quatre saisons ensemble.** | **confirmé** | `tutorial.js:49-55`. La carte `tp5` décrit hiver, printemps, été et automne en une phrase. |
| — (nouveau) | **Deux décomptes se superposent** si l'on met en pause pendant un décompte. Le premier libère le jeu alors que le second affiche encore « 1 ». | **confirmé** dans le navigateur | `main.js:692-703` : les minuteurs du décompte précédent ne sont jamais annulés. Chromium : deux éléments `.tempo-compte` (« 1/Pose ! ») ; 4 relevés où le temps coule alors qu'un chiffre est encore affiché ; le délai remonte de 2,62 à 2,93 s au second « Pose ! ». |
| — (nouveau) | **Des records mélangés entre délais.** | **confirmé** (lu dans le code) | `tempo_prep.js:13` : sans record à 3 s, l'écran affiche le meilleur score **tous délais confondus** comme « ton meilleur à 3 s ». La meilleure série est globale (`main.js:455`). Le menu et le bilan montrent le meilleur tout court (`menu.js:64`, `src/ui/results.js:54`). Le menu dit toujours « 3 secondes par tuile », même si le joueur a choisi 5 ou 8 s. |
| — (nouveau) | **« Autant de tuiles que de cases » n'est pas exact.** Les trous cernés deviennent des mares au départ, mais le compte des tuiles se fait sur toutes les cases. | **confirmé** | `src/game/island.js:81-82` (`def.cells × tilesRatio − 1`, calculé avant de retirer les mares). Node, 60 îles : 0 tuile en trop sur 26 îles, 1 sur 28, 2 sur 6. Sur ces îles, les premières pertes ne coûtent aucun malus de fin. |
| — (nouveau) | **Les tests du mode passent alors que les défauts sont là.** | **confirmé** | `node tests/rules.test.js` et `node tests/tempo.js` passent à 31b3d60. Le test de pause (`tests/tempo.js:50-55`) vérifie que le temps s'arrête, pas ce qu'il vaut à la reprise. |

Aucun constat de l'audit n'est infirmé ni déjà corrigé à cette révision.

---

## 2. Plan par étapes

Règles communes à chaque lot : `tools/suite.sh court` avant chaque poussée. `tools/suite.sh complet` dès qu'un lot touche aux règles, au score, à la sauvegarde ou à l'interface, c'est-à-dire presque tous ceux-ci. Un lot qui change le score commun (`island.js`) impose aussi `node tools/calibrate.js 4 1-30 --write`. Chaque lot ajoute sa ligne au journal de bord.

### Étape 1 · Fiabilité : les règles affichées sont les règles jouées

| Lot | Ce qu'on fait | Le test qui le prouve | Effort | Dépend de | Statut |
|---|---|---|---|---|---|
| **S-A1** · Fin d'été lisible · **fait** (journal 160) | Quand la réserve est vide, les tuiles d'été restantes sont perdues **en un seul événement annoncé**, et non plus une par image. Dans `src/game/tempo.js`, `update()` appelle une nouvelle méthode `finEte()` au lieu de `perdre()`. Dans `src/game/island.js`, `loseCurrent(n)` perd n tuiles et n'émet qu'**un seul** événement `lost` qui porte ce nombre. Dans `src/main.js`, un seul son et un bandeau : « Fin de l'été : 2 tuiles perdues ». La règle du commanditaire ne change pas (12 s pour la saison). | Node (`tests/rules.test.js`) : réserve à 0, un seul `update()` ; attendu : un seul événement `lost` avec le nombre de tuiles restantes, et l'automne commence. Navigateur (`tests/tempo.js`) : été, réserve forcée à 0,3 s ; attendu : au plus un événement `lost`, et le bandeau est visible. | petit | — | à faire |
| **S-A2** · Printemps honnête · **fait** (journal 160) | Après la pose, retirer vraiment la tuile non choisie, et non la tuile neuve. Dans `tempo.js`, `perdreLAutre()` fait `q.list.splice(0, 1)` après le `take()`, garde `total += 1`, puis `fill()`. Vérifier que `sortir('spring')` suit la même logique. | Node : noter les numéros des deux tuiles proposées, poser la première ; attendu : la seconde n'est plus proposée, deux tuiles neuves le sont, et le compte de l'île est inchangé. Même vérification en choisissant la 2ᵉ tuile (`isl.pick(1)`). Ce test remplace celui de `rules.test.js:603`. | petit | — | à faire |
| **S-A3** · Été proportionnel au délai · **fait** (journal 160, décision 1 : a) | La réserve d'été vaut 0,8 × 5 poses × délai : **12 s à 3 s** (la valeur du commanditaire), 20 s à 5 s, 32 s à 8 s. Dans `src/data/balance.js`, `ete: 12` devient `eteParTuile: 2.4` ramené au délai de 3 s. À toucher : `tempo.js` (`entrer`, `fraction`), `src/ui/tempo_prep.js` (le texte lit la valeur) et la carte du tutoriel. | Node : réserve = 12, 20, 32 pour `def.cadran` = 3, 5, 8. Navigateur : le récapitulatif à 8 s annonce « 32 secondes ». | petit | décision 1 | à faire |
| **S-B1** · Pause sans temps gagné · **fait** (journal 160) | Garder le décompte de reprise voulu par le commanditaire, mais **rendre le temps exact**. `togglePause` note `t` et `depuis`. `compteARebours(pas, avant, { reprise: true })` n'appelle plus `armer()` : il remet les deux valeurs notées. | Navigateur (`tests/tempo.js`, étape 4 enrichie) : en automne, pause quand `t < 0,6`, puis reprise ; attendu : `t` au retour à 0,05 s près de sa valeur d'avant, et `depuis` inchangé. | petit | — | à faire |
| **S-N** · Un seul décompte à la fois · **fait** (journal 160) | `compteARebours` garde ses minuteurs et les annule avant d'en lancer un autre ou quand la pause s'ouvre. Il ne reste qu'un élément `.tempo-compte`. | Navigateur : pause puis reprise pendant le décompte de départ ; attendu : jamais `hold === false` tant qu'un chiffre est affiché, et un seul `.tempo-compte`. | petit | S-B1 (même fonction) | à faire |
| **S-B2** · L'aide ne fait pas de record · **fait** (journal 160) | Deux changements. (1) Une partie jouée avec le tutoriel est un **entraînement** : dans `main.js`, `afterIsland` ne touche ni `bests`, ni `best`, ni `parties` si `def.tuto` est vrai, et le bilan l'écrit (« Entraînement : pas de record »). (2) Sous une carte **d'information**, la pose est bloquée comme en pause : un garde `tutoTient` dans `onMouseDown`, `onTap` et `placeArmed`. La carte qui demande une pose (`tp2`) laisse couler le temps. Dans `tutorial.js`, chaque carte porte un drapeau `fige`. Le temps reste arrêté pendant qu'on lit, comme le commanditaire l'a voulu. | Navigateur, avec le tutoriel : un clic sur une case légale sous `tp1` ne pose rien (`placements` reste à 0). Une partie entière avec le tutoriel laisse `Save.data.tempo.bests` intact. | moyen | — | à faire |
| **S-M** · Records rangés par délai · **fait** (journal 160) | `tempo_prep.js` : ne plus afficher le meilleur global à la place du meilleur à 3 s. La sauvegarde est migrée une seule fois : l'ancien `best`, antérieur au choix du délai, passe dans `bests[3]` s'il n'y a pas encore de `bests`. Meilleure série rangée par délai. Le menu (`menu.js:63-64`) et le bilan (`results.js:54`) montrent le délai choisi et son record. | Navigateur : partie à 8 s qui fait un record ; à l'écran de préparation à 3 s, aucun record ne s'affiche. Le menu dit « 8 s » quand 8 s est retenu. Node : la migration appliquée deux fois ne change rien. | petit | S-B2 | à faire |
| **S-Q** · Une tuile par case libre · **fait** (journal 160) | Dans `island.js`, pour le mode, le compte des tuiles se fait sur les cases libres **après** les mares, comme sous la brume (l. 81). | Node : sur 60 graines, `queue.remaining` égale le nombre de cases libres au départ. | petit | — | à faire |

Fin de l'étape : les cinq défauts de l'audit sont corrigés, chacun a un test qui échouait à 31b3d60, et `tools/suite.sh complet` est vert. **Fait le 25 septembre** (journal 160).

### Étape 2 · Découverte : apprendre le geste avant de subir le rythme

| Lot | Ce qu'on fait | Le test qui le prouve | Effort | Dépend de | Statut |
|---|---|---|---|---|---|
| **S-P** · Pas de famille jamais vue · **fait** (journal 161) | `tempoDef` (`src/data/tempo.js`) reçoit la liste des familles apprises. Pas de colline avant l'île 8 atteinte, pas de lande avant l'île 10 (lu dans `MECH_AT`). `startTempo` (`main.js:390`) la lui passe. C'est une partie de S-F qui ne touche à aucune décision. | Node : `tempoDef(seed, { familles })`, avec une campagne à l'île 7, ne contient ni colline ni lande dans ses poids, sur 60 graines. | petit | — | à faire |
| **S-L** · Les saisons, une par une · **fait** (journal 161 ; décision 3 : gardées et dites, voir journal 160) | La carte `tp5` est découpée : une carte par saison, montrée à la **première arrivée** de cette saison (`when: (i) => i.season === 'summer'`…), qui désigne la saison et le chronomètre. Le temps reste figé pendant la lecture, et la pose est bloquée (S-B2). Un rappel permanent d'une ligne sous la bannière de saison : « Été : 12 s pour 5 tuiles ». À toucher : `src/game/tutorial.js` (`MODE_STEPS.tempo`) et le HUD. Selon la décision 3, la carte cite aussi la règle de campagne de la saison. | Navigateur, avec le tutoriel : à l'arrivée de l'été, la carte affichée parle de la réserve ; à l'arrivée de l'automne, de la brume ; jamais deux saisons dans la même carte. | moyen | S-B2, décision 3 | à faire |
| **S-E** · Premier délai · **fait** (journal 161, décision 4 : b) | Si la décision 4 le retient, la première partie propose 8 s, puis le choix est retenu comme aujourd'hui. Les pastilles portent un nom : « 8 s · découverte », « 5 s · normal », « 3 s · défi ». Fichier : `tempo_prep.js`. | Navigateur : avec une sauvegarde neuve, la pastille 8 s est active ; après une partie à 3 s, c'est 3 s. | petit | décision 4 | à faire |
| **S-D** · Entraînement joué · **fait** (journal 161, décision 5 : b) | Un bouton « S'entraîner » sur l'écran de préparation. Une petite île à graine fixe. Six poses guidées sans chrono, avec la case qui brille (le mécanisme `GUIDED` et `restrict` de l'île 1). Puis douze poses à 8 s, sans effet de saison et sans record. Fichiers : `src/data/tempo.js` (`entrainementDef`), `tutorial.js` (`GUIDED.tempo`), `main.js`, `tempo_prep.js`. | Navigateur : l'entraînement va jusqu'au bout ; la pose hors de la case guidée est refusée ; aucun record n'est écrit ; le bilan dit « Entraînement ». | gros | S-B2, S-P, décision 5 | à faire |

Fin de l'étape : un joueur qui n'a jamais vu le mode joue sans fiche et peut dire pourquoi il a perdu une tuile. **Fait le 25 septembre** (journal 161) ; reste à vérifier avec des joueurs.

### Étape 3 · Profondeur : récompenser une bonne décision rapide

| Lot | Ce qu'on fait | Le test qui le prouve | Effort | Dépend de | Statut |
|---|---|---|---|---|---|
| **S-G** · Série lisible | Deux parties. (1) **Le retour sur la tuile**, sans décision : après chaque pose, un mot sur la tuile à poser (« +2 bonne place », « +1 rapide », « série cassée : trop lente »). La donnée existe déjà dans `tempo.dernier` (`tempo.js:59`). (2) **La règle**, selon la décision 6 : par défaut, un seuil de vitesse proportionnel au délai (1 s à 3 s, 1,7 s à 5 s, 2,7 s à 8 s), donc `sousSeconde` devient une fraction du délai dans `balance.js`. | Node : à 8 s, une pose à 2 s fait monter la série ; à 3 s, une pose à 1,2 s la casse. Navigateur : le mot apparaît sur la tuile après une pose. | moyen | décision 6 | à faire |
| **S-H** · Le prix d'une perte, sur le moment | Sans toucher aux chiffres du commanditaire : au moment de la perte, afficher ce qu'elle coûtera (« case vide : −2 », « −7 : elle bloque une région »). On calcule le malus d'une case avec `videsMalus` et on l'affiche en texte flottant. Le reste suit la décision 7. | Navigateur : forcer une perte à côté d'une région presque fermée ; attendu : le texte « −7 ». Node : le malus annoncé égale la part de cette case dans `videsMalus` à la fin. | moyen | décision 7 | à faire |
| **S-I** · Moins de bruit pendant la pose | Au Souffle court, au plus un texte flottant par pose (le total), et pas de ruban de coup (`main.js`, `onEvent` sur `place`). La disposition (chrono au-dessus, tuile en dessous) ne bouge pas, sauf décision 8. | Captures téléphone (portrait et paysage) à mi-partie, avec `tools/capture_partie.js` ; un contrôle dans `tests/tempo.js` : un seul `floatText` par pose. | petit | — | à faire |
| **S-J** · Poser d'un seul toucher | Une option propre au mode, « Poser d'un seul toucher », sur l'écran de préparation. Dans `onTap`, si l'option est active, la pose se fait au premier toucher d'une case légale. La confirmation reste le réglage par défaut jusqu'aux essais sur téléphone. | Navigateur avec un contexte tactile (`hasTouch`, 390 × 844) : option active, un seul `tap` pose la tuile ; option inactive, il en faut deux. | moyen | — | à faire |
| **S-K** · Rejouer la même île | Un bouton « Rejouer cette île » au bilan : même graine, même délai, même forme (`etire` gardé dans la définition). Le numéro de l'île s'affiche au bilan. Les records restent rangés par délai (S-M). Fichiers : `results.js`, `main.js` (`startTempo(seed, etire)`). | Navigateur : rejouer ; attendu : même `def.seed`, même `cells`, même première tuile. | petit | S-M | à faire |

Fin de l'étape : il existe plusieurs façons de bien jouer, et le joueur voit pourquoi sa série monte ou se casse.

### Étape 4 · Contenu : seulement après un plaisir constaté

| Lot | Ce qu'on fait | Le test qui le prouve | Effort | Dépend de | Statut |
|---|---|---|---|---|---|
| **S-S** · Le défi du jour | Déjà voulu par le commanditaire (« sa version du jour, même graine pour tous », feuille de route l. 139). La graine vient de la date (comme l'Île du jour), avec un délai fixe (5 s) et une forme d'île fixe, la même au téléphone et sur ordinateur. Un record par jour, dans une entrée à part de la sauvegarde. | Node : même date, même île ; `etire` identique quel que soit l'écran. Navigateur : le bouton du défi ouvre l'île du jour, et le record du jour est gardé. | moyen | S-K, S-M | à faire |
| **S-T** · Un objectif personnel | Avant la partie, un objectif au choix (« au plus trois tuiles perdues », « six bonnes poses de suite »), suivi dans le HUD et jugé au bilan. Aucune récompense permanente. | Navigateur : objectif choisi, partie jouée par le bot ; attendu : le bilan dit « atteint » ou « manqué ». | petit | S-G | à faire |
| **Tampon du mode** | Le tampon manque encore (feuille de route). C'est une image à faire faire, pas du code. | — | petit | — | à faire |

---

## 3. Décisions à prendre par le commanditaire

Chaque question est fermée. La recommandation en gras sera appliquée par défaut si rien n'est dit.

1. **Été : la réserve suit-elle le délai ?** a) **Oui : 12 s à 3 s (ta valeur), 20 s à 5 s, 32 s à 8 s.** b) Non, 12 s partout (aujourd'hui). c) Retirer l'été spécial.
   Pour a : 8 s redevient plus facile toute la partie, et 3 s ne change pas. Contre a : l'été à 8 s devient long. Recommandation : **a**.
2. **Les saisons à effets (S-C de l'audit).** a) **Les garder comme règle du mode, une fois corrigées (S-A) et enseignées une par une (S-L), puis juger sur essais.** b) Deux formats : un « classique » sans effets et avec six familles (prairie, forêt, champ, hameau, eau, roche), et les « Saisons spéciales » en option experte. c) Les retirer.
   Pour b : moins de règles à apprendre, et un record plus pur. Contre b : on perd ce qui rend le mode unique, que tu as voulu, et deux formats font deux records. Les pires défauts des saisons sont des bugs, pas la règle elle-même. Recommandation : **a**. On passe à b si moins de 4 joueurs sur 5 savent expliquer une perte après correction.
3. **Les règles de saison de la campagne (crue, sécheresse, récolte, veillée), actives en plus des effets du mode.** a) Les garder sans rien dire (aujourd'hui). b) **Les retirer du mode : seuls les quatre effets du Souffle court restent.** c) Les garder et les enseigner.
   Pour b : on passe de huit règles de saison à quatre, sans toucher à tes effets. Contre b : un peu moins de points de saison, donc les records actuels ne sont plus comparables (on les archive, voir S-M). Recommandation : **b**.
4. **Le délai de la toute première partie (S-E).** a) 3 s (aujourd'hui). b) **8 s la première fois, puis le choix retenu, avec des étiquettes « découverte · normal · défi ».**
   Pour b : le débutant reconnaît une tuile avant de courir. Contre b : la première impression est moins nerveuse. Recommandation : **b**.
5. **Entraînement et tutoriel (S-D).** a) Garder seulement le tutoriel à cartes, corrigé (S-B2, S-L). b) **Ajouter un entraînement joué à côté, avec son bouton, et garder le tutoriel et le récapitulatif.** c) Remplacer le tutoriel et le récapitulatif par l'entraînement, comme le propose l'audit.
   Pour c : un seul chemin, qui fait faire au lieu de dire. Contre c : il défait deux demandes récentes (récapitulatif, journal 140 ; tutoriel qui montre chaque élément, journal 156). Recommandation : **b**, puis retirer ce que les essais montrent inutile.
6. **La règle de la série (S-G).** a) Garder « sous 1 s », ×1,5 · ×2 · ×3 (aujourd'hui). b) **Un seuil proportionnel au délai (1 s à 3 s, 1,7 s à 5 s, 2,7 s à 8 s), le reste inchangé.** c) La règle de l'audit : une pose dans le délai, avec au moins un bord positif et aucun négatif ; ×1,5 après 3, ×2 après 6, plus de ×3.
   Pour b : ta règle reste exacte à 3 s, et 8 s ne punit plus la réflexion. Contre c : la vitesse ne compte plus, et le mode perd son nom. Recommandation : **b**.
7. **Les pénalités d'une perte (S-H).** a) **Garder tes chiffres (−2, −5, −4 au bilan, et la prime de saison pleine perdue), mais afficher le coût au moment de la perte.** b) −2 tout de suite, et plus rien au bilan (audit). c) −2 tout de suite, et seulement −5 au bilan pour une case qui bloque une région.
   Pour b : une seule règle, visible sur le moment. Contre b : une case vide mal placée ne coûte plus davantage, alors que c'était ton idée. Recommandation : **a**, puis b si les joueurs ne comprennent toujours pas le bilan.
8. **La disposition de l'écran (S-I).** a) **Garder le chronomètre au-dessus de l'île et la tuile en dessous (ton choix, après six essais), en réduisant les messages.** b) Regrouper tuile, temps et série dans une seule zone.
   Pour b : le regard fait moins d'allers-retours. Contre b : cela défait un choix fait sur prototypes, sans mesure contraire. Recommandation : **a**, et revoir seulement si les essais au téléphone montrent des pertes par regard perdu.
9. **La forme des îles (S-K).** a) **Garder l'île procédurale de 40 à 60 cases, avec « Rejouer cette île » et le défi du jour pour comparer.** b) Un format fixe de 49 cases.
   Pour b : des records vraiment comparables. Contre b : chaque partie se ressemble, et « une île neuve à chaque partie » est ta décision. Recommandation : **a**.

---

## 4. Écarté ou reporté

- **Dix îles ou dix défis préparés** : reporté. Il y a dix contenus à concevoir et à équilibrer, avec le risque de refaire une campagne. On y revient seulement si les joueurs demandent une progression après l'étape 3. Même avis que l'audit.
- **« Revoir trois décisions » au bilan** : reporté. Il faut garder l'état exact de chaque pose pour donner un conseil fidèle, ce qui est un gros travail. On y revient après S-G et S-H, si le bilan reste obscur.
- **Classement en ligne** : écarté pour l'instant. Le défi du jour compare déjà sans serveur.
- **Retirer les ×3 de la série** : non retenu seul. Il fait partie de la décision 6, option c.
- **Arbre de pouvoirs, monnaie du mode, malus aléatoires** : écartés, pour la même raison que l'audit : ils détournent du geste.
- **Pause automatique quand la fenêtre perd le focus** : écarté pour l'instant. Onglet caché, la boucle s'arrête déjà d'elle-même. Seul le cas d'une fenêtre visible mais sans focus laisse couler le temps. On y revient si un joueur s'en plaint.

---

## 5. Validation avec des joueurs

Cinq personnes qui ne connaissent pas le mode, sur un téléphone de préférence. On observe d'abord, sans guider. Les seuils ci-dessous sont des objectifs de travail, pas des résultats.

| Moment | Ce qu'on fait | Signe de réussite visé |
|---|---|---|
| Après l'étape 1 | Une partie à 8 s, avec le tutoriel. Puis on demande : « Pourquoi as-tu perdu cette tuile ? Qu'est-ce qui fait monter la série ? » | Au moins 4 sur 5 répondent juste. Aucune perte n'est vécue comme une injustice (« je n'ai rien vu venir »), surtout en été. |
| Après l'étape 2 | L'entraînement, puis une partie au délai choisi par le joueur. | Au moins 4 sur 5 jouent sans relire la fiche. Les pertes viennent du défi, pas d'un geste mal compris ni d'un changement de saison inattendu. |
| Après l'étape 3 | Comparer la pose à deux touchers et la pose d'un seul toucher, sur le même téléphone, à 5 s. | La pose d'un seul toucher ne fait pas plus de poses sur la mauvaise case, et elle est préférée par au moins 3 sur 5. Sinon, la confirmation reste le réglage par défaut. |

**Trois choses à noter, simplement.**
- **La compréhension** : les mots du joueur disent ce qu'il croit être la règle.
- **L'hésitation** : où il cherche l'information, ce qu'il ouvre pour rien, quand il regarde le chronomètre plutôt que l'île.
- **L'envie de rejouer** : relance-t-il de lui-même ? À quel délai ? Que voudrait-il essayer autrement ? On ne lui souffle pas la réponse.

Ne changer qu'un élément à la fois entre deux séances d'essai, sinon on ne saura pas ce qui a aidé.

**Contrôles indispensables après chaque modification** (automatisés dans les tests de l'étape 1) :
- pas de rafale de pertes en quelques images ;
- une pause ne fait gagner aucun temps ;
- une partie avec le tutoriel ne fait pas de record ;
- au printemps, la tuile non choisie disparaît vraiment ;
- le récapitulatif, le tutoriel et le menu disent le délai et la réserve qui seront joués.

**Critère pour ajouter du contenu (étape 4).** Le joueur sait expliquer ce qu'il vient de décider, et ce qu'il veut essayer à la partie suivante. S'il ne sait pas encore pourquoi il a gagné ou perdu des points, on améliore d'abord le retour du jeu.
