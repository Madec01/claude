# Sous la brume : feuille de route du mode

- **Date** : 25 septembre 2026.
- **Source** : audit de gameplay du 25 septembre (`docs/AUDIT_GAMEPLAY_2026-09-25.pdf`, pages 15 à 20, 21 à 23 et 25),
  sur la révision `31b3d60`. Chaque constat a été revérifié dans le code de cette révision, puis reproduit par de petits
  scripts Node, sans toucher au dépôt.
- **Décisions de référence** : `FEUILLE_DE_ROUTE.md`, « Deux modes à part » → « Sous la brume », et le journal (lignes
  150 à 158).

## Ce que le mode promet

Choisir sa tuile, c'est choisir la question posée au brouillard : on déduit ce qui se cache en croisant des indices
toujours vrais, et on ne parie que quand la déduction s'arrête.

## Verdict

L'idée tient : poser une question en posant une tuile est le cœur du mode, et le code le fait bien.
Trois choses la trahissent aujourd'hui. D'abord, **des chiffres affichés deviennent faux** : l'indice ne suit pas les dévoilements.
Ensuite, **des règles affichées ne sont pas celles qu'on applique** : le seuil de dévoilement, la pénalité du Jalon forcé et la fuite de la Nuit noire.
Enfin, **la brume se lève avant que la déduction ait mûri** : 28 % seulement des cases qui se dévoilent étaient déductibles, alors que le générateur en annonce 40 %.
On répare d'abord (étape 1), puis on rend l'indice lisible et on l'enseigne par une énigme (étape 2). La profondeur et le contenu viennent seulement ensuite, après un essai devant des joueurs.

## Comment les constats ont été vérifiés

- Lecture du code aux lignes citées (révision `31b3d60`).
- Scripts Node jetables qui construisent des îles avec `brumeDef` et `Island`, comme `tests/brume.test.js`.
- Deux joueurs automatiques :
  - le **glouton** des tests (`joue`), qui prend le meilleur total de points ;
  - le **questionneur**, qui pose contre la brume une tuile dont la famille se cache quelque part, puis vise les points.
- À chaque passage de saison, juste avant le dévoilement, le solveur du jeu (`possibles`) reçoit les indices réellement lus. Ces indices sont corrigés des cases déjà dévoilées. On compte alors les cases dont la famille est certaine.
- Limite : ces joueurs voient les points que l'interface cache (`preview`), et le solveur raisonne mieux qu'une personne. Les chiffres qui suivent sont donc des plafonds, pas des taux de réussite humains.

## Constats vérifiés

| Repère audit | Constat | Verdict | Preuve |
|---|---|---|---|
| B-A, [B2] | Un indice reste à 1 après le dévoilement de la forêt voisine qu'il comptait ; la règle affichée (« voisines cachées de ma famille ») exige 0. | **Confirmé** | L'indice est lu une fois (`island.js:555`), puis affiché tant que la tuile touche la brume, sans recalcul (`render.js:1384-1389`). Le script donne : lu 1, forêt dévoilée, affiché 1, règle 0. Sur 30 parties, le chiffre devient faux dans 5 parties (glouton) et 17 parties (questionneur) en Brume claire, et dans 21 parties sur 30 en Brume épaisse. L'audit l'avait vu dans 4 parties sur 12. Nos graines 1 à 6 donnent aussi 4 parties sur 12. |
| — (nouveau) | « La brume gagne » ajoute une case cachée à côté de tuiles déjà lues. Leur vieil indice revient à l'écran et ne compte pas la nouvelle case. | **Confirmé** | `island.js:732-734` ajoute la case, et `render.js:1384` réaffiche tout indice qui touche la brume. Sur 40 îles : 21 tuiles concernées, dont 4 où le chiffre est faux. |
| [B4] | « Jalon forcé » annonce −5 mais applique −3. | **Confirmé** | Le texte est à `brume.js:52`, la valeur `P.jalonManque = -3` à `brume.js:26`, et l'application à `island.js:670-671`. Le script mesure −3. |
| [B4] | Le seuil de dévoilement affiché ignore « Marée basse » et « Brume épaisse ». | **Confirmé** | Le HUD (`hud.js:182`) et la fiche d'une case (`ui/brume.js:74`) lisent `B.cran.devoile`, soit 2. La règle appliquée est `seuilDevoile()` (`island.js:639`), qui vaut 1 ou 3 selon la carte. |
| — (nouveau) | Sous « Jalon forcé », en Brume claire, le HUD dit encore « Jalon possible », alors qu'un oubli coûte des points. | **Confirmé** | `hud.js:184` ne lit que `cran.jalonObligatoire`, jamais `saison.jalonForce`. |
| — (nouveau) | La « Nuit noire » cache l'inventaire au HUD, mais la fiche d'une case liste encore les familles cachées, sur ses boutons de jalon et de crayon. | **Confirmé** | `famillesPossibles` lit `isl.inventaireBrume` sans regarder `saison.nuit` (`ui/brume.js:45-48`, `60`). Le script donne 7 familles lisibles pendant la Nuit noire. |
| — (nouveau) | Le trésor compte dans l'indice de ses familles : le moulin compte pour champ et hameau, le puits et le camp pour prairie, la chapelle pour hameau, la tour de guet pour roche. Le mode ne le dit nulle part. | **Confirmé** | `compte` passe par `RARE_AS` (`brume.js:94-97`). Les textes du mode n'en disent rien (`ui/brume.js:29-34`, `tutorial.js:56-62`). Cela touche 30 îles sur 30. Sur 30 parties, le trésor entre dans 21 indices sur 679 : c'est rare, mais ces indices-là trompent. |
| — (nouveau) | « Vent contraire » peut faire glisser une tuile engagée contre la brume, alors que Déplacer l'interdit et que le tutoriel dit « une tuile qui touche la brume ne bouge plus ». | **Confirmé** (lecture) | Les candidats du vent (`island.js:678`) ne sont pas filtrés par `fogAround`, contrairement à `canMove` (`island.js:583`). |
| B-G, [B3] | La part déductible est mesurée hors du vrai déroulé. | **Confirmé** | Le joueur modèle de `deductibilite` pose sur toutes les cases du bord à la fois, avec une main de trois (cinq en jeu), sans saisons ni dévoilements (`brume.js:229-257`). Le générateur annonce 0,40 en claire et 0,12 en épaisse. Au vrai déroulé, voici la part des cases **prêtes à se dévoiler** qui étaient déductibles : 28 % (glouton) et 24 % (questionneur) en claire, 11 % en épaisse. Toutes cases cachées confondues : 12 à 18 % en claire, 6 % en épaisse. |
| 5.3 | Un zéro élimine trop peu. | **Confirmé** | Graines 1 à 6, joueur glouton : **109 zéros sur 134 indices**, le chiffre de l'audit à l'unité près. Sur 30 parties, c'est 81 % de zéros, et 63 % pour le questionneur. |
| B-D, [B4] | Une bonne question peut être jugée « mauvais coup ». | **Confirmé** | Le coup est jugé sur les points (`island.js:693-701`, `preview().total`). Questionneur, 30 parties : 63 poses contre la brume sur 501 sont jugées mauvaises (13 %), contre 0 sur 565 ailleurs. Le joueur est en plus jugé sur des points qu'on lui cache au choix de la case (`main.js:621`, `render.js:1300`), et il l'apprend juste après (`main.js:1061`). |
| — (nouveau) | La chance de bonus colle à la borne de 80 % pour qui vise les points : le réglage ±8 % ne se voit presque pas. | **Confirmé** | Le glouton a 653 bons coups et 0 mauvais sur 30 parties. Quatre bons coups (50 % + 4 × 8 %) atteignent la borne dès la première saison. |
| B-F, 5.3 | La cinquième pose lit son indice et lance aussitôt le passage de saison : le dernier indice ne sert à rien. | **Confirmé** | Dans le même appel, `island.js:268` lit l'indice, puis `island.js:286` appelle `advanceSeason` et `passageBrume` dévoile. Sur 202 saisons (glouton), 109 ont au moins une case sûre au passage, mais 98 seulement sans le dernier indice. Pour le questionneur, c'est 106 contre 91 sur 159 : 5 à 9 % des saisons perdent un jalon sûr. |
| B-I, 5.3 | Le crayon ne retient qu'une famille par case. | **Confirmé** | `B.crayon` associe une clé à une seule famille (`island.js:575`). |
| B-E | La portée du chiffre (quelles cases il compte) n'est montrée nulle part. | **Confirmé** | `drawBrume` dessine le nombre seul (`render.js:1379-1390`). Toucher une tuile posée ne montre rien (`main.js:976-981`). |
| 5.3 | La Brume épaisse retire surtout de l'information. | **Confirmé** | 6 % des cases cachées sont déductibles au passage. Avec un indice à chaque pose au lieu d'une sur deux, on passe à 11 %, et la part des saisons avec une case sûre monte de 32 % à 51 %. |
| — (nouveau) | La pénalité de fin (−3 par case restée cachée) ne mord jamais : l'île se remplit et tout se dévoile seul. | **Confirmé** | Sur 60 parties simulées, aucune case n'est restée cachée. Comprendre ne rapporte donc qu'au jalon et au placement des voisines. Le journal le notait déjà (« le −3 mord peu »). |
| B-K | Le ×3 du jalon juste est imprévisible. | **Confirmé** | Sur 176 jalons justes, le ×3 ajoute entre −4 et +10 points au-delà du +5, avec une moyenne de +2,5. 22 jalons justes y perdent des points. |
| B-B, [B6] | Les quatre groupes (vert, bleu, ocre, gris) ne servent qu'à l'inventaire de la Brume épaisse ; l'indice et le jalon parlent en familles. | **Confirmé** | `COULEURS` (`brume.js:88`) sert à `inventaire` et au solveur. `indice` compte la famille (`brume.js:103-107`). |
| B-H, 5.2 | Le tutoriel montre les gestes, pas une déduction. | **Confirmé** | Cinq cartes de gestes (`tutorial.js:56-62`). Aucune ne demande de conclure. |
| [B5] | Un joueur automatique dévoile toute la brume en s'aidant d'aperçus cachés au joueur. | **Confirmé** | Nos deux joueurs automatiques dévoilent aussi 100 % des cases : le glouton, 403 cases pour 402 au départ (une case ajoutée par « La brume gagne »). |

## Plan par étapes

Règles communes à chaque lot, tirées de `CLAUDE.md` :

- `tools/suite.sh court` avant chaque poussée ;
- `tools/suite.sh complet` dès qu'on touche aux règles, à la sauvegarde ou à l'interface ;
- `node tools/calibrate.js 4 1-30 --write` si `rules.js` change (le mode n'a pas d'étoiles, mais le fichier est partagé) ;
- une ligne au journal par lot.

### 1 · Fiabilité : un indice ne ment jamais, une règle affichée est la règle appliquée

**B-A.1 · Indices exacts** · effort : petit à moyen · dépendances : aucune · statut : **à faire**
- Ce qu'on fait :
  - À la lecture, `lireIndice` (`island.js`) garde la **portée** de l'indice, `t.portee`, c'est-à-dire les clés des voisines cachées à cet instant.
  - Le chiffre montré compte les cases de cette portée **encore cachées** et de la famille lue. Nouvelle fonction `indiceActuel(t)` dans `brume.js`.
  - `drawBrume` (`render.js`) affiche ce chiffre et masque la pastille quand plus aucune case de la portée n'est cachée. Ainsi, une case ajoutée par « La brume gagne » ne ressuscite plus un vieil indice.
- Ce que cela respecte : la décision « un seul indice, lu à la pose, jamais mis à jour » reste vraie. La question et la portée sont fixées à la pose. On retire seulement les cases que le joueur voit déjà dévoilées, donc aucune information nouvelle n'est offerte.
- Test, dans `tests/brume.test.js` :
  - « un indice ne ment jamais » : le cas forêt / eau de l'audit ;
  - puis 30 parties jouées, où chaque pastille affichée doit égaler le compte réel sur sa portée après chaque dévoilement, Longue-vue, vent et « La brume gagne » ;
  - enfin, la portée passe par la reprise.

**B-A.2 · Règles affichées = règles appliquées** · effort : petit · dépendances : aucune · statut : **à faire**
- Ce qu'on fait :
  - Le texte de « Jalon forcé » se construit à partir de `P.jalonManque` et affiche la pénalité réellement appliquée, soit −3 (`brume.js:52`).
  - Le HUD (`hud.js:182`, `184`) et la fiche d'une case (`ui/brume.js:74`) lisent `isl.seuilDevoile()` et `saison.jalonForce`.
  - Le texte du HUD dit « Jalon à planter (sinon −3) » dès que le jalon est dû, quel que soit le cran.
- Tests :
  - `tests/brume.test.js` : tout nombre écrit dans un texte de carte vient de `P` ou de `CRANS` ;
  - `tests/brume.js` (navigateur) : sous « Marée basse », la ligne du HUD dit « à 1 voisine », et sous « Jalon forcé » en claire, la ligne du jalon dit « sinon −3 ».

**B-L · La Nuit noire ne fuit plus par la fiche** · effort : petit · dépendances : aucune · statut : **à faire**
- Ce qu'on fait :
  - `famillesPossibles` passe dans l'île sous le nom `isl.famillesAnnoncables()`, pour pouvoir la tester sans navigateur.
  - Sous Nuit noire, elle rend les neuf familles ordinaires et « trésor », pas l'inventaire.
  - `planterJalon` accepte déjà « tresor ».
- Test (`tests/brume.test.js`) : sous Nuit noire, la liste ne dépend pas de ce qui est caché. Deux îles différentes donnent la même liste.

**B-M · Le trésor et l'indice : une règle dite ou retirée** · effort : petit · dépendances : décision 9 · statut : **à faire**
- Ce qu'on fait, selon la décision 9 :
  - **par défaut, le trésor ne compte pour aucun indice** : `compte` ignore les tuiles `tresor` dans `indice`, dans `deductibilite` et dans le solveur, et le tutoriel dit « le trésor ne répond à aucun chiffre » ;
  - sinon, on garde la règle actuelle, mais la pastille du trésor dans l'inventaire et la carte « indice » du tutoriel le disent (« le moulin compte comme champ et hameau »).
- Test (`tests/brume.test.js`) : un moulin caché ne change pas l'indice d'un champ (option par défaut).

**B-N · Le Vent contraire respecte la règle de Déplacer** · effort : petit · dépendances : décision 1 · statut : **à faire**
- Ce qu'on fait : les candidats du vent (`island.js:678`) excluent les tuiles qui touchent la brume.
- Test (`tests/brume.test.js`) : sur une île où la seule tuile de la saison touche la brume, le vent ne la déplace pas.

### 2 · Découverte : lire un indice, faire une vraie déduction une fois

**B-E · Montrer la portée du chiffre** · effort : petit à moyen · dépendances : B-A.1 · statut : **à faire**
- Ce qu'on fait :
  - Toucher une tuile qui porte un indice (`tapBrume`, `main.js`) cerne les cases de sa portée encore cachées (`drawBrume`).
  - Une ligne dit : « Parmi ces 2 cases cachées : 1 forêt ».
  - Aucun point n'est montré.
- Test (`tests/brume.js`) : toucher une tuile à indice cerne exactement `portee ∩ brume`, et la ligne donne le même chiffre que la pastille.

**B-F · Observer avant de lever la brume** · effort : moyen · dépendances : B-A.1 · statut : **à faire**
- Ce qu'on fait :
  - Sous la brume, la dernière pose de la saison n'appelle plus `advanceSeason`. L'île passe en « passage prêt » : les cases qui vont se dévoiler battent doucement, et le jalon et le crayon restent ouverts.
  - Aucune pose n'est possible dans cet état.
  - Un bouton « Lever la brume » appelle `isl.leverBrume()`, qui fait le passage.
  - L'état se sauvegarde (`serializeBrume`).
- Coût : un toucher de plus par saison. À surveiller pendant l'essai avec des joueurs.
- Tests :
  - `tests/brume.test.js` : après cinq poses, rien n'est dévoilé ; `planterJalon` marche ; `place` refuse ; `leverBrume` dévoile ; la reprise garde l'état ;
  - `tests/brume.js` : le bouton apparaît et le toucher dévoile.

**B-H · Une mini-énigme guidée en tête du tutoriel** · effort : moyen · dépendances : B-A.1, B-E ; B-F utile · statut : **à faire**
- Ce qu'on fait :
  - Une petite île préparée, `brumeEnigme(id)` dans un nouveau `src/data/brume_enigmes.js`. Elle a trois cases cachées, un plan fixé par `planBrume` et une main fixée par `opening`.
  - Deux poses imposées donnent deux indices croisés. Avec l'indice par famille actuel : une forêt voit A et B et dit « 1 » ; une forêt voit B et C et dit « 0 ». Donc A est la forêt.
  - Les cartes de `MODE_STEPS.brume` demandent « Où est la forêt ? » et attendent un jalon. Un jalon juste explique pourquoi. Un jalon faux montre les deux portées.
- Tests :
  - `tests/brume.test.js` : pour chaque énigme, le solveur ne tranche la case visée qu'après les deux indices, jamais avant ;
  - `tests/brume.js` : le tutoriel lance l'énigme, et un jalon juste la termine.

### 3 · Profondeur : une génération fidèle au jeu, des outils de raisonnement

**B-G · Mesurer et doser au vrai déroulé** · effort : gros · dépendances : B-A.1, B-F, décisions 6 et 7 · statut : **à faire, après l'essai avec des joueurs**
- Ce qu'on fait :
  - `deductibilite` (`brume.js`) laisse place à une simulation au vrai rythme : la vraie main de cinq (la file est déterminée par la graine), cinq poses par saison, les indices lus avec leur portée, le dévoilement au seuil.
  - Deux mesures sont gardées : la part des cases **prêtes à se dévoiler** qui sont déductibles au passage, et l'existence d'**au moins une case sûre avant le premier passage**.
  - Un outil `tools/brume_mesure.js` imprime ces deux chiffres sur N graines ; c'est le script de cette vérification, mis au propre.
  - Le temps du worker se mesure au téléphone avant de fixer le nombre d'essais.
- Test (`tests/brume.test.js`) : pour les graines 1 à 6, l'île retenue offre une case sûre avant le premier passage au joueur modèle, et la part déclarée égale la mesure refaite.

**B-I · Un crayon à plusieurs possibilités** · effort : moyen · dépendances : aucune · statut : **à faire**
- Ce qu'on fait :
  - `B.crayon` associe désormais une clé à un ensemble de familles encore possibles. La fiche d'une case (`buildBrumePicker`) coche et barre les familles, et `drawBrume` écrit « forêt / eau ? ».
  - Rien ne se valide tout seul.
  - « Crayon sûr » répond sur la première famille cochée ou barrée de la saison.
  - La reprise accepte l'ancien format, une seule famille.
- Test (`tests/brume.test.js`) : cocher et barrer, effacer, reprendre une vieille sauvegarde ; le score n'en bouge jamais.

**B-K · Une récompense de jalon prévisible** · effort : petit · dépendances : décisions 3 et 4 · statut : **à faire**
- Ce qu'on fait, selon la décision 4, avec l'option recommandée :
  - `brumeMul` (`rules.js:44`) traite un jalon juste comme une tuile dévoilée (×2) ;
  - `P.jalonJuste` passe à +8, soit la moyenne mesurée de 5 + 2,5 ;
  - on met à jour les textes de `ui/brume.js`, `tutorial.js` et `FEUILLE_DE_ROUTE.md`, puis on recalibre.
- Test (`tests/brume.test.js`) : un jalon juste rapporte exactement `P.jalonJuste` de plus que la même case dévoilée sans jalon.

**B-O · Juger une question comme un coup** · effort : petit · dépendances : décision 2 · statut : **à faire**
- Ce qu'on fait, avec l'option recommandée : dans `jugerCoup` (`island.js:693`), une pose contre la brume dont la famille peut se cacher dans une voisine n'est jamais jugée mauvaise. La notification « Mauvais coup » ne tombe donc plus sur une vraie question.
- Test (`tests/brume.test.js`) : le questionneur sur 6 graines n'a aucun « mauvais coup » contre la brume.

**B-P · La Brume épaisse redevient un jeu de déduction** · effort : petit · dépendances : décision 6 · statut : **à faire**
- Ce qu'on fait, avec l'option recommandée : `CRANS.epaisse.indices = 1`, on recale `vise` sur la nouvelle mesure, et le texte du cran change (`ui/brume.js:37`).
- Test (`tests/brume.test.js`) : en épaisse, chaque pose contre la brume parle, et l'épaisse reste moins déductible que la claire.

### 4 · Contenu : ce qui prolonge un plaisir déjà constaté

**B-Q · Cinq à dix énigmes préparées** · effort : moyen à gros · dépendances : B-H, résultats de l'essai avec des joueurs · statut : **à faire**
- Ce qu'on fait :
  - Même format que B-H. Chaque énigme enseigne un raisonnement : l'élimination par un zéro, deux indices croisés, l'inventaire qui ferme la dernière case, le trésor…
  - Une entrée « Énigmes » dans le panneau du cran, avec une étoile par énigme résolue sans jalon faux.
- Test (`tests/brume.test.js`) : chaque énigme a une seule solution que le solveur atteint avec la main fournie.

**B-R · Une île partageable par un code** · effort : petit · dépendances : aucune · statut : **à faire**
- Ce qu'on fait :
  - L'île est déjà entièrement fixée par le cran et la graine. `brumeDef(cran, seed)` est déterministe, et la graine est tirée à `main.js:397`.
  - Le bilan affiche un code court. Le panneau du cran accepte un code.
- Test (`tests/brume.test.js`) : un même code donne la même brume, les mêmes tuiles cachées et la même première main.

## Décisions à prendre par le commanditaire

Chaque question est fermée. L'option **en gras** est ma recommandation par défaut : les lots avancent avec elle si rien
n'est tranché.

1. **Les vingt cartes du tirage (audit B-C).**
   - Options :
     - (a) les garder telles quelles, une fois corrigées (étape 1) ;
     - **(b) garder le tirage, mais remplacer les deux malus qui effacent ce que le joueur sait déjà, « Crayon effacé » et « Nuit noire », par deux malus qui coûtent des points sans toucher au raisonnement.** Exemples : « Bords ternes », où les dévoilées ne valent que simple cette saison, et « Jalon risqué », où un jalon faux coûte −10 cette saison ;
     - (c) sortir les vingt cartes du jeu standard et les garder pour une variante (proposition de l'audit).
   - Pour (c) : la réflexion n'est plus jamais interrompue.
   - Contre (c) : on défait une liste validée carte par carte, avec le ratio fixé par le commanditaire, et le mode perd sa part de surprise.
   - Pourquoi (b) : dans un jeu de déduction, effacer les notes du joueur ne crée pas de difficulté, seulement de la frustration.

2. **Ce qu'est un « bon coup » pour la chance de bonus (audit B-D, second volet).**
   - Options :
     - (a) garder le jugement par les points ;
     - **(b) le garder, mais une pose contre la brume qui pose une vraie question n'est jamais « mauvaise » ;**
     - (c) supprimer le jugement et figer la chance à 50 %.
   - Ce qui a été mesuré : 13 % des vraies questions sont jugées mauvaises. Le jugement se fait en plus sur des points que le joueur ne voit pas. Pour qui vise les points, la chance est collée à 80 % dès la première saison.
   - L'option (b) garde le 50 / 50, le ±8 % et les bornes 20 à 80 %.

3. **Garder les jalons ?** Le commanditaire avait écrit : « pas sûr, à voir en jeu ».
   - Options :
     - (a) les garder tels quels ;
     - **(b) les garder, simplifiés (décision 4) ;**
     - (c) les retirer.
   - Pourquoi pas (c) : toute la brume se lève seule quand l'île se remplit (0 case restée cachée sur 60 parties). Le jalon est donc la seule récompense directe d'une déduction. Sans lui, déduire ne rapporte presque plus rien.

4. **La récompense du jalon juste (audit B-K).**
   - Options :
     - (a) +5 et bords ×3 ;
     - **(b) un bonus fixe de +8, avec les bords ×2 comme toute case dévoilée ;**
     - (c) garder le ×3, mais seulement sur les bords positifs.
   - Ce qui a été mesuré : aujourd'hui, le ×3 ajoute de −4 à +10 points. Un jalon juste sur huit y perd des points.

5. **Le pari imposé (audit B-D, premier volet).**
   - Options :
     - **(a) garder le jalon obligatoire en Brume épaisse (le cran est choisi en connaissance de cause), le texte corrigé ;**
     - (b) le rendre facultatif partout.
   - La carte « Jalon forcé » suit la décision 1.

6. **Le cran épais.**
   - Options :
     - (a) le garder tel quel, comme un pari assumé (6 % des cases cachées déductibles au passage) ;
     - **(b) un indice à chaque pose, en gardant l'inventaire par couleur et le seuil de 3 (11 % déductibles, et une case sûre dans 51 % des saisons au lieu de 32 %) ;**
     - (c) le remplacer par un cran d'énigmes préparées.

7. **Les quatre groupes pour l'indice et le jalon (audit B-B).**
   - Options :
     - (a) garder l'indice par famille ;
     - (b) passer aux groupes partout, pour l'indice, l'inventaire et le jalon ;
     - **(c) essayer les groupes d'abord dans les énigmes préparées, devant cinq joueurs, puis trancher.**
   - Ce qui a été mesuré sur 30 parties en claire, en passant l'indice au groupe :
     - les zéros tombent de 81 % à 64 % ;
     - les cases dont le groupe est certain au passage passent de 15 % à 27 % ;
     - les saisons avec au moins un groupe sûr passent de 62 % à 85 % ;
     - les familles certaines baissent un peu, de 12 % à 11 %.
   - Contre : cela défait l'indice que le commanditaire a choisi (« une forêt compte les forêts »), et les paires champ / sable et hameau / roche ne vont pas de soi.

8. **Montrer les points des voisins visibles au choix de la case (audit B-J).**
   - Options :
     - **(a) non : on garde « pas de points au choix de la case » (journal 156) ;**
     - (b) oui, avec la mention « résultat incomplet ».
   - Le gain et la perte du jalon sont déjà annoncés avant de le planter.

9. **Le trésor dans l'indice (nouveau, B-M).**
   - Options :
     - (a) il compte pour ses familles, et on le dit ;
     - **(b) il ne compte pour aucun indice.**
   - Pourquoi (b) : une règle de moins à expliquer, et aucun indice trompeur, surtout en Brume épaisse, où l'on ne sait pas quel trésor se cache.

## Écarté ou reporté

- **Sonde de secours (audit)** : écartée. Le commanditaire a refusé le « sondage aux souffles » parce que le joueur serait tenu par la main. Déplacer joue déjà ce rôle de « sonde chère » par sa décision, et la Longue-vue existe.
- **Aide graduelle** : reportée pour la même raison. On la reconsidérera seulement à l'intérieur des énigmes préparées (B-Q), si l'essai avec des joueurs montre des blocages.
- **Effets de saison propres à la brume** (éclaircies, brume qui dérive, récolte, gel) : reportés par le commanditaire. Rien ne change.
- **Variantes « trois familles exactes par île » et « dangers voisins »** : reportées. On n'ajoute une variante qu'une fois le mode standard compris. La première ne sert qu'à comparer, si les groupes gênent (décision 7). La seconde exige d'inventer un « danger » stable et sa sanction.
- **Une règle spéciale annoncée au départ** : n'a de sens que si les cartes sortent du jeu standard (décision 1, option c).
- **Des étoiles pour le mode** : reportées. Il faut d'abord un joueur automatique qui sache jouer la brume (B-G en donne la base).
- **Un générateur complexe tout de suite** : écarté, comme le conseille l'audit. B-G ne vient qu'après l'essai de la mini-énigme devant des joueurs.

## Validation avec des joueurs

Cinq personnes qui ne connaissent pas le mode, sur téléphone (390 × 844, l'appareil du commanditaire). On observe sans guider, et on change un seul élément à la fois.

- **La mini-énigme (B-H), sans aide.**
  - On leur demande de désigner une case certaine et d'expliquer la preuve.
  - Visé : au moins 4 personnes sur 5 concluent sans deviner la famille, et distinguent la note au crayon du jalon engagé.
- **Une partie de Brume claire.** On note :
  - si elles touchent le chiffre pour voir sa portée ;
  - quand elles plantent le jalon : sur une case sûre ou au hasard (le journal de partie le dit, grâce au solveur) ;
  - si elles se servent du crayon ;
  - si elles trouvent le « Lever la brume » utile ou pesant ;
  - si une carte ou un « mauvais coup » les agace, et avec quels mots.
- **Trois questions après la partie** :
  - « Qu'est-ce que le chiffre compte ? » (compréhension) ;
  - « Où as-tu hésité ? » (hésitation) ;
  - « Qu'essaierais-tu autrement ? » (envie de rejouer).
- **La comparaison des langages** : la même énigme en familles et en groupes (décision 7), sur deux groupes de joueurs différents.
- **Les contrôles qui doivent toujours passer** : un indice est juste après toute révélation (B-A.1), et chaque règle affichée égale la règle appliquée (B-A.2).
- **Le critère pour passer à l'étape 4** : le joueur sait expliquer pourquoi son jalon était juste ou faux. Sinon, on améliore d'abord le retour du jeu.
