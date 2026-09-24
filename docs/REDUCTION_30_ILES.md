# Réduire la campagne de 50 à 30 îles : état des lieux, plans et coût

Rapport d'analyse. Aucune modification du dépôt. État mesuré : commit `d5af568`, 24 septembre 2026.
Question du commanditaire : « Peut-on retirer des îles ? Je veux garder le même enchaînement, mais j'ai peur que ça se répète trop avec 50 îles. » La cible, corrigée en cours de route, est de **30 îles**. Une comparaison courte avec 20 îles figure en annexe.

## Résumé en dix lignes

1. Oui, c'est faisable, et sans perdre ni une mécanique, ni un climat, ni une des douze îles dessinées, ni un texte de récit.
2. La peur de la répétition est fondée. **13 îles sur 50 n'apportent rien de neuf** : ni mécanique, ni climat, ni signature, ni récit. 12 d'entre elles se trouvent entre les îles 17 et 34, et trois ont un texte périmé qui annonce des tuiles retirées du jeu.
3. Après l'île 16, il n'arrive plus qu'une mécanique toutes les cinq îles. Chaque archipel de climat suit le même schéma : une île de nouveauté, trois îles vides, une île-souvenir.
4. En comptant 25 îles « indispensables » (les 17 îles qui introduisent quelque chose et les 8 autres îles dessinées), 30 îles gardent tout l'enchaînement. On en ajoute 5 autres, choisies parmi 25 candidates, et on retire les 20 restantes.
5. Mesure faite avec le bot fort : la campagne compte aujourd'hui **3 947 poses, soit environ 11 h** à 10 s par pose. À 30 îles, elle compte **2 080 à 2 306 poses, soit 5,8 à 6,4 h**.
6. Trois plans chiffrés : **A** (6 chapitres de 5), **B** (10 chapitres de 3) et **C** (5 chapitres de 6). Tous gardent le même ordre d'arrivée des mécaniques.
7. **Je recommande le plan B, 10 × 3.** Il garde les dix chapitres, leurs noms, leurs dix insignes et leurs dix tampons, livrés cette semaine. Il garde aussi les ouvertures de l'Atelier par chapitre et un archipel par climat. Chaque chapitre suit le schéma « nouveauté, pratique, souvenir ». Il ne reste que 2 îles vides.
8. Le Livre II récupère 20 îles générées (noms, textes, graines), 9 signatures inemployées et 4 grandes îles de 112 à 140 cases. Aucun insigne, aucune île dessinée ni aucune mécanique ne part au Livre II.
9. Le coût se découpe en cinq lots de travail. Deux points sont délicats : la sauvegarde passe en version 3, avec une migration à prévoir aussi pour la copie en ligne, qui aujourd'hui n'est pas migrée. Et la longueur d'un chapitre, écrite « 5 » en dur à une quinzaine d'endroits, doit devenir un paramètre.
10. Autres conséquences : recalibrage obligatoire (`node tools/calibrate.js 4 1-30 --write`, environ 5 min), trois succès à redéfinir, et une économie de graines à revoir. Le joueur tranquille gagnerait 165 graines au lieu de 273, pour un Atelier qui coûte 154 graines.

---

## 1. Comment j'ai mesuré

- **Script `mesure.mjs`** (dans ce dossier) : pour chaque île de 1 à 50, il lit la définition produite par `campaignIsland(n)` (`src/data/campaign.js`). Il en extrait :
  - le nombre réel de cases (`islandCells`) ;
  - le climat et la carte de climat affichée ;
  - les mécaniques introduites (`MECH_AT`) ;
  - la signature ;
  - les vœux ;
  - les familles de tuiles de la file.

  Il fait ensuite jouer l'île trois fois au **bot fort** (`playStrong` de `tests/bot.js`), avec la graine du joueur et trois hasards de bot différents. Les événements du jeu sont captés : arrivées de faune, fusions, règles de saison, rares obtenues, tuiles bâties, niveaux 3, croissance. Durée de calcul : 108 s par passe sur les 50 îles.
- **Script `analyse.mjs`** : il calcule la médiane des trois parties et repère la première apparition de chaque élément (famille de tuile, type de vœu, espèce, recette, règle de saison, rare). Résultats dans `analyse.json`.
- **Script `plans.mjs`** : il additionne poses, saisons, vœux et graines pour chaque plan, à partir des îles sources mesurées.
- **Scripts `deplaces.mjs` et `h8.mjs`** : ils rejouent les deux îles dessinées dont les règles changeraient dans le plan B (La Mare aux Canards avec bâtir, Le Pont de Glace au froid ou à l'humide).
- **Durée en temps réel : c'est une hypothèse, pas une mesure sur des joueurs.** Le document de conception (JOURNAL_DE_BORD.md, ligne 22) annonçait « une île : 6 à 20 minutes ; campagne de 12 îles ≈ 2 h ». Les douze îles dessinées font aujourd'hui 759 poses au bot, ce qui donne 9,5 s par pose. Je compte donc **10 s par pose**, avec une fourchette de 8 à 12 s.
- **Le nombre de poses dépend peu du niveau du joueur.** Il est fixé par la file de tuiles (cases × `tilesRatio`, plus les tuiles rendues par bâtir). Un humain en fait donc à peu près autant que le bot.
- **Graines.** Le « joueur tranquille » est modélisé ainsi : 2 graines par île nouvelle, 2 étoiles, la moitié des vœux, pas d'étoile d'or (sources : `BALANCE.seeds` dans `src/data/balance.js` ligne 24 et `main.js` ligne 400). Le journal (entrée 76) le situe à 66 % de la médiane du bot, soit 2 étoiles avec les seuils à 45, 65 et 85 %. Le « joueur appliqué » fait 3 étoiles, les vœux au taux du bot et l'étoile d'or une fois sur deux.

---

## 2. L'état actuel : les 50 îles

### 2.1 Structure

- **Constantes.** `CAMPAIGN_SIZE = 50` (`src/data/campaign.js`, ligne 10). Dix chapitres de cinq îles (`CHAPTERS`, lignes 26 à 37).
- **Mécaniques.** Chaque mécanique arrive à une île précise (`MECH_AT`, lignes 13 à 19) :
  - 1 : affinités, fermeture, faune ;
  - 2 : rivière, saisons ;
  - 4 : semis ;
  - 6 : vœux, main de saison ;
  - 7 : souffles ;
  - 8 : tuiles rares ;
  - 11 : surprises de saison ;
  - 12 : collines ;
  - 13 : grenier, ruche, menhir ;
  - 14 : lande ;
  - 16 : bâtir ;
  - 21 : climats, fusions ;
  - 31 : niveau 3 ;
  - 41 : croissance.
- **Climats.** Le climat change avec les chapitres : chaud au chapitre 5, humide au 6, froid au 7. Au chapitre 8, il change à chaque île. Aux chapitres 9 et 10, il est fixé île par île.
- **Îles dessinées.** Les **douze îles dessinées** (`src/data/islands.js`, lignes 79 à 102 ; textes dans `src/data/story.js`) occupent les numéros 1, 3, 5, 7, 10, 13, 15, 20, 25, 30, 35 et 50.
- **Îles générées.** Les 38 autres îles sont générées par `campaignIsland`. Leur graine vaut `5000 + n × 131` (ligne 93), leur saison de départ vaut `n % 4` (ligne 98), et leurs textes viennent de `src/data/campaign_texts.js`.
- **Signatures.** Les îles 36 à 49 portent chacune une **signature** (`SIGNATURE_OF`, `src/data/signatures.js`, ligne 23). Trois signatures sont écrites mais jamais employées : `sans_hameau`, `ile_seche` et `lande_haute`.
- **Îles-souvenirs.** Chaque chapitre se ferme sur une « île-souvenir » (`memory: true`), qui donne l'insigne du chapitre. Celles des chapitres 8 et 9 (îles 40 et 45) sont des îles générées, sans récit.

### 2.2 Ce que chaque île apporte

Légende : **H*n*** = île dessinée *n* (H1 L'Anse aux Lapins, H2 Le Gué des Roches, H3 La Pointe des Quatre Vents, H4 Les Trois Prés, H5 La Baie des Promesses, H6 La Mare aux Canards, H7 Trois Moulins, H8 Le Pont de Glace, H9 La Falaise de l'Ours, H10 La Plaine des Crues, H11 Les Vergers de Neige, H12 L'Île qui se souvient). **G** = île générée. **(S)** = île-souvenir qui ferme le chapitre. Les colonnes « poses » et « saisons » donnent la médiane de trois parties du bot fort.

| Île | Ch. | Source | Nom | Cases | Climat | Ce qu'elle apporte de neuf | Poses | Saisons |
|---|---|---|---|---|---|---|---|---|
| 1 | 1 | H1 | L'Anse aux Lapins | 30 | tempéré | affinités, fermeture, faune (tutoriel guidé) ; récit | 27 | 4 |
| 2 | 1 | G | Le Banc de Sable | 34 | tempéré | rivière, saisons | 30 | 4 |
| 3 | 1 | H2 | Le Gué des Roches | 36 | tempéré | récit seul | 31 | 4 |
| 4 | 1 | G | Les Deux Sœurs | 40 | tempéré | semis | 36 | 5 |
| 5 | 1 | H4 (S) | Les Trois Prés | 48 | tempéré | récit ; insigne 1 | 42 | 4 |
| 6 | 2 | G | Le Hameau du Vœu | 50 | tempéré | vœux, main de saison | 48 | 6 |
| 7 | 2 | H3 | La Pointe des Quatre Vents | 42 | tempéré | souffles ; récit | 40 | 5 |
| 8 | 2 | G | La Pointe des Joncs | 54 | tempéré | tuiles rares | 50 | 6 |
| 9 | 2 | G | Le Marché du Gué | 56 | tempéré | **rien** ; texte périmé (« marché, fête, ruine à restaurer » : tuiles retirées) | 52 | 6 |
| 10 | 2 | H5 (S) | La Baie des Promesses | 54 | tempéré | récit ; insigne 2 | 49 | 4 |
| 11 | 3 | G | L'Île des Nuages | 60 | tempéré | surprises de saison | 54 | 6 |
| 12 | 3 | G | Les Trois Buttes | 64 | tempéré | collines (et le cheval) | 59 | 6 |
| 13 | 3 | H7 | Trois Moulins | 66 | tempéré | grenier, ruche, menhir ; récit | 60 | 6 |
| 14 | 3 | G | La Lande Rousse | 68 | tempéré | lande (et la vache) | 61 | 6 |
| 15 | 3 | H6 (S) | La Mare aux Canards | 60 | tempéré | récit ; insigne 3 | 55 | 5 |
| 16 | 4 | G | Le Val Bâti | 66 | tempéré | bâtir | 63 | 7 |
| 17 | 4 | G | Les Clos | 70 | tempéré | **rien** (le texte redit le retour de tuile) | 68 | 7 |
| 18 | 4 | G | La Grande Table | 74 | tempéré | **rien** ; texte périmé (« auberge, abreuvoir, porche, mine, four » : retirés) | 75 | 8 |
| 19 | 4 | G | Le Pré des Saisons | 78 | tempéré | **rien** (le texte redit « bâtir en saison ») | 78 | 8 |
| 20 | 4 | H8 (S) | Le Pont de Glace | 72 | tempéré | récit (le « dernier hiver », la révélation) ; insigne 4 ; son vœu de fortin tombe car les fusions n'ouvrent qu'à l'île 21 | 70 | 7 |
| 21 | 5 | G | La Côte Ocre | 72 | chaud | climat chaud, fusions | 71 | 7 |
| 22 | 5 | G | Les Salines | 76 | chaud | **rien** ; texte périmé (« hameau + eau = port » : recette retirée) | 75 | 8 |
| 23 | 5 | G | Le Verger de Pierre | 78 | chaud | **rien** (le texte explique la cascade) | 77 | 8 |
| 24 | 5 | G | La Baie Blanche | 80 | chaud | **rien** (le texte explique la lagune et le fortin) | 77 | 8 |
| 25 | 5 | H9 (S) | La Falaise de l'Ours | 84 | chaud | récit ; insigne 5 | 78 | 8 |
| 26 | 6 | G | Le Pays des Pluies | 76 | humide | climat humide | 75 | 8 |
| 27 | 6 | G | Les Roselières | 80 | humide | **rien** (son propre texte le dit : « Ici, rien de nouveau à apprendre ») | 79 | 8 |
| 28 | 6 | G | Le Bassin des Hérons | 84 | humide | **rien** | 83 | 8 |
| 29 | 6 | G | Les Vergers Noyés | 88 | humide | **rien** (le texte parle de la rizière) | 87 | 8 |
| 30 | 6 | H10 (S) | La Plaine des Crues | 97 | humide | récit ; insigne 6 | 90 | 10 |
| 31 | 7 | G | La Pinède Blanche | 82 | froid | climat froid, niveau 3 | 80 | 8 |
| 32 | 7 | G | Les Hauts Gelés | 86 | froid | **rien** (le texte explique le niveau 3) | 86 | 8 |
| 33 | 7 | G | Le Fjord | 88 | froid | **rien** | 86 | 8 |
| 34 | 7 | G | La Combe Sombre | 90 | froid | **rien** | 89 | 8 |
| 35 | 7 | H11 (S) | Les Vergers de Neige | 108 | froid | récit ; insigne 7 | 103 | 12 |
| 36 | 8 | G | La Côte des Sels | 90 | chaud | début de l'alternance des climats ; signature « Les dunes » | 88 | 8 |
| 37 | 8 | G | Le Col Gelé | 94 | froid | signature « Deux sources » | 90 | 9 |
| 38 | 8 | G | Le Plateau des Cimes | 96 | tempéré | signature « Les pierres dressées » | 88 | 8 |
| 39 | 8 | G | La Brume du Nord | 100 | humide | signature « Le sud est un marais » | 93 | 9 |
| 40 | 8 | G (S) | L'Archipel Intérieur | 100 | chaud | signature « Un lac au milieu » ; insigne 8 (souvenir sans récit) | 94 | 9 |
| 41 | 9 | G | La Grande Plaine | 104 | tempéré | croissance ; signature « Les champs ouverts » | 102 | 9 |
| 42 | 9 | G | Les Îles Jumelles | 112 | humide | signature « Une rivière la traverse déjà » | 107 | 9 |
| 43 | 9 | G | Le Bois Long | 120 | froid | signature « La forêt profonde » | 115 | 10 |
| 44 | 9 | G | Les Étangs du Soir | 130 | tempéré | signature « Sans une pierre » | 126 | 11 |
| 45 | 9 | G (S) | Le Grand Verger | 140 | chaud | signature « Le pays des vergers » ; insigne 9 (souvenir sans récit) | 138 | 12 |
| 46 | 10 | G | La Marche | 120 | tempéré | signature « Les saisons passent vite » | 119 | 13 |
| 47 | 10 | G | Les Cent Toits | 130 | tempéré | signature « Deux villages qui se regardent » | 128 | 11 |
| 48 | 10 | G | L'Île Qui Grandit | 140 | tempéré | signature « Les saisons s'attardent » | 134 | 10 |
| 49 | 10 | G | La Veille | 150 | tempéré | signature « La file est courte » | 127 | 11 |
| 50 | 10 | H12 (S) | L'Île qui se souvient | 121 | tempéré | fin du récit, épilogue ; insigne 10 | 114 | 14 |

**Totaux mesurés** : 3 947 poses et 392 saisons, soit **environ 11,0 h** à 10 s par pose (8,8 h à 8 s, 13,2 h à 12 s).

Par chapitre, en poses (et en minutes à 10 s par pose) :

| Chapitre | Poses | Minutes |
|---|---|---|
| 1 | 166 | 28 |
| 2 | 239 | 40 |
| 3 | 289 | 48 |
| 4 | 354 | 59 |
| 5 | 378 | 63 |
| 6 | 414 | 69 |
| 7 | 444 | 74 |
| 8 | 453 | 76 |
| 9 | 588 | 98 |
| 10 | 622 | 104 |

### 2.3 La répétition, chiffrée

| Ce que l'île apporte | Nombre | Îles |
|---|---|---|
| Une mécanique nouvelle (`MECH_AT`) | 14 | 1, 2, 4, 6, 7, 8, 11, 12, 13, 14, 16, 21, 31, 41 |
| Un premier climat ou l'alternance des climats, sans mécanique | 2 | 26 (humide), 36 (alternance) |
| Le récit seul (île dessinée sans mécanique) | 9 | 3, 5, 10, 15, 20, 25, 30, 35, et 50 (la fin) |
| Une signature seule (plus un changement de climat) | 12 | 37, 38, 39, 40, 42 à 49 |
| **Rien du tout** | **13** | **9, 17, 18, 19, 22, 23, 24, 27, 28, 29, 32, 33, 34** |

- **Le rythme s'effondre après l'île 16.**
  - Entre les îles 1 et 16, une nouveauté arrive toutes les 1,5 île (11 nouveautés en 16 îles).
  - Entre les îles 16 et 50, une nouveauté arrive toutes les 5 îles (21, 26, 31, 36, 41).
  - Le plus long passage sans mécanique ni climat nouveau couvre les îles 42 à 49, soit huit îles qui n'ont que leur signature.
- **Les chapitres 4 à 7 suivent tous le même moule** : une île de nouveauté, trois îles vides, une île-souvenir. C'est là que se trouvent 12 des 13 îles vides.
- **Trois textes sont périmés.**
  - L'île 9 annonce « marché, fête, ruine à restaurer ».
  - L'île 18 annonce « auberge, abreuvoir, porche, mine, four ».
  - L'île 22 enseigne « hameau + eau = port ».

  Toutes ces tuiles et recettes ont été retirées (`RETIRED_RARE` dans `src/data/tiles.js` ligne 12, et JOURNAL_DE_BORD.md ligne 501 pour le port).
- **Il y a quelques petites nouveautés.** Cinq îles « vides » demandent pour la première fois un type de vœu :
  - 9 : bourg ;
  - 19 : quatre espèces ;
  - 22 : rizière ;
  - 23 : ferme ;
  - 27 : deux régions dans la même saison.

  Ces vœux restent dans la réserve (`CAMPAIGN_WISHES`, `campaign.js` lignes 40 à 58). Ils reviendront donc sur d'autres îles.
- **Les vœux de la réserve se répètent aussi.** Sur les 38 îles générées, 118 vœux sont tirés parmi 16 types seulement. Le canard et la récolte reviennent 12 fois chacun, le lapin et « quatre espèces » 10 fois chacun. Le vœu `c_bloom` n'est **jamais** tiré : le filtre de faisabilité l'écarte partout.
- **La faune n'apporte pas de surprise en cours de campagne.** Le bot voit déjà le hibou, la poule, le lapin, la grenouille, le canard et l'ours dès l'île 1. Seuls l'élan (île 3), le manchot (île 6), le cheval (île 12), la chèvre (île 13, avec le campement) et la vache (île 14) arrivent plus tard.

---

## 3. Tout ce qui dépend du nombre 50 (ou des chapitres de cinq)

### 3.1 Code du jeu

| Fichier | Lignes | Ce qui dépend du compte |
|---|---|---|
| `src/data/campaign.js` | 10 | `CAMPAIGN_SIZE = 50` |
| | 13–19 | `MECH_AT` (numéros d'île) |
| | 26–37 | `CHAPTERS` (dix chapitres de cinq cases) |
| | 77, 82 | `chapterOf` et la case du chapitre : `/ 5` et `% 5` |
| | 85 | `CAMPAIGN_STARS[n]` |
| | 93, 98 | graine `5000 + n × 131` et saison de départ `n % 4` : **renuméroter une île générée la change entièrement** (forme, vœux, départ) |
| | 96–100 | longueur de saison selon les cases ; `tilesRatio` et nombre de vœux selon `ch.id` (seuils ≤ 2, ≤ 4, ≤ 7) |
| | 115, 125 | textes `CAMPAIGN_TEXTS[n]` et signature `SIGNATURE_OF[n]` |
| | 142 | `OLD_TO_NEW` (copie morte : seul `save.js` a la sienne) |
| | 144, 162, 166 | `chapterStars`, `chapterPlays`, `chapterDone` : boucles `(k-1)*5+1 … k*5` |
| | 147–148 | `CHAPTER_GATE = 6` (étoiles sur 15) et `CHAPTER_PATIENCE = 8` (parties) |
| | 187 | `unlockedUpTo` : porte à `n % 5 === 0` |
| | 224 | `restarFromBest` ignore n > `CAMPAIGN_SIZE` |
| | 238 | `gateText` : « les cinq îles comprises » |
| `src/data/upgrades.js` | 5–22 | champ `chapter` des 12 améliorations : Regard 1, Patience 1, Souffle 2, Semence 2, Source 3, Refuge 3, Almanach 3, Charpente 4, Alambic 5, Manteau 5, Maître d'œuvre 7, Étoile du soir 9 |
| | 28 | `playerChapter` : `/ 5` |
| `src/core/save.js` | 4–13 | `VERSION = 2` ; migration v1 → v2 (12 îles → 50, `OLD_TO_NEW`) |
| | 59 | `tidyCampaign` : insignes de chapitre rendus rétroactivement, `for ch 1..10`, île `ch * 5` |
| `src/main.js` | 107 | au lancement : `restarFromBest` et `unlockedUpTo` |
| | 177–195 | copie en ligne : `moreAdvanced` puis `adoptCloud`, **sans migration** (seul `tidyCampaign` est appelé) |
| | 354–355 | annonces : Île du jour si `unlockedIsland >= 8`, Île infinie si `> 10` |
| | 406 | insigne de chapitre à l'île-souvenir |
| | 409–411 | `completed` à l'île `CAMPAIGN_SIZE` ; Île infinie ouverte si `def.id >= 10` |
| | 434–436 | fin du jeu à l'île `CAMPAIGN_SIZE` ; `gateText(c, Math.ceil(def.id / 5))` |
| `src/ui/menu.js` | 29 | « Cinquante îles à faire revivre » |
| | 33, 50, 73 | compteurs `… / CAMPAIGN_SIZE` et `CAMPAIGN_SIZE × 3` étoiles |
| | 51–54 | Île infinie « après l'île 10 », Île du jour « après l'île 7 » (textes et seuils) |
| | 84, 91 | liste des îles par chapitre : `(ch.id-1)*5+1` et `first + 5` |
| `src/ui/collection.js` | 1, 42–70 | dix insignes de chapitre ; boucle `*5` ; total `CAMPAIGN_SIZE × 6` archétypes par île (300 aujourd'hui) |
| `src/game/achievements.js` | 30 | compteur `stars` : somme de **toutes** les clés de la sauvegarde |
| | 38–40 | `climates3` : `campaignIsland(n)` **ramène silencieusement** n > 50 à 50 |
| | 101–102 | « Cent saisons » à l'île `CAMPAIGN_SIZE` ; « Chapitre clos » à `>= 15` écrit en dur |
| `src/data/achievements.js` | 29, 40–43 | « Cinquante promesses » (50 vœux) ; « Chapitre clos » (quinze étoiles) ; « Les quatre climats » ; « Cent saisons » (« Terminer l'île 50 ») ; « Cent cinquante » (cible 150 étoiles) |
| `src/game/island.js` | 35, 37, 40, 43, 46, 92, 458 | valeurs par défaut quand aucune option n'est passée : bâtir ≥ 6, croissance ≥ 41, fusions ≥ 8, main ≥ 16, niveau 3 ≥ `level3From`, surprises ≥ 4, rares tardives ≥ 7. Anciennes, sans effet en campagne (`islandOptions` fait foi), mais trompeuses. |
| `src/data/balance.js` | 19 | `level3From: 31` |
| `src/game/tampon.js` | 37 | tampon de chapitre à l'île-souvenir (suit `def.chapter`, automatique) |
| `src/ui/guide.js` | 41–89 | « dès l'île N » calculé par `mechIsland`, et portes par `CHAPTER_*` : automatique |
| `src/game/tutorial.js` | 54 | carte d'une île dessinée montrée si `mechIsland(id) === numéro` : automatique |

### 3.2 Données, récit et textes publics

- **`src/data/campaign_stars.js`** : 50 seuils calibrés, à régénérer.
- **`src/data/campaign_texts.js`** : 38 textes indexés par numéro d'île.
- **`src/data/signatures.js`, ligne 23** : `SIGNATURE_OF`, indexé par numéro d'île.
- **`src/data/story.js`** :
  - ligne 10, prologue : « Cinquante îles dorment sous le même ciel » ;
  - ligne 702, fin : « Cinquante îles. Cent saisons. » ;
  - les douze récits des îles dessinées, `ending` et `epilogue`, ne dépendent pas du nombre.
- **Textes publics** :
  - `index.html` ligne 14 et `manifest.webmanifest` ligne 4 : « cinquante îles » ;
  - `README.md` lignes 5 et 67 ;
  - `FEUILLE_DE_ROUTE.md`, lot 7 : le Livre II est prévu aux îles « 51 à 75 ».

### 3.3 Images

- **Insignes de chapitre.** `assets/img/chapitres/chapitre-1.png` à `chapitre-10.png` sont illustrés, un thème par chapitre (vérifié à l'œil) :
  - 1 : la maison ;
  - 2 : le puits ;
  - 3 : les collines sous le ciel ;
  - 4 : le chantier ;
  - 5 : le palmier et le blé ;
  - 6 : la pluie et les nénuphars ;
  - 7 : la neige ;
  - 8 : les quatre saisons ;
  - 9 : le grand arbre ;
  - 10 : le couchant sur la mer.
- **Tampons de chapitre.** `assets/img/tampons/tampon-chapitre-1.png` à `tampon-chapitre-10.png`. Insignes et tampons ont été livrés par le commanditaire les 23 et 24 septembre (journal, entrées 129 à 131).
- **Vignettes de succès.** `assets/img/succes/chapitre-clos.png` montre une couronne d'une quinzaine d'étoiles autour d'une île. `cent-cinquante.png` (un ciel étoilé) et `cent-saisons.png` (un sablier) ne portent aucun nombre.

### 3.4 Sauvegardes existantes

- **Ce qui est indexé par numéro d'île (1 à 50)** dans `campaign` : `stars`, `best`, `plays`, `gold`, `memoriesRead`, `insignes.iles` (archétypes gagnés sur chaque île), `unlockedIsland` et `completed`.
- **Ce qui est indexé par numéro de chapitre** : `insignes.chapitres`.
- **Parties en cours.** La partie en cours et les parties archivées (`src/core/run.js`, format `v: 1`) rangent `{ kind: 'campaign', id: n }`.
- **Copie en ligne (Firestore).** Elle est comparée par `moreAdvanced`, qui regarde `unlockedIsland` d'abord (`src/core/cloud.js`, lignes 26 à 39), puis elle est adoptée **sans migration** (`main.js`, ligne 195). Un fichier importé, lui, passe bien par `migrate` (`save.js`, ligne 123).
- **Le risque.** Un joueur migré en local à l'île 27 serait jugé « moins avancé » que sa vieille copie en ligne restée à l'île 45. On lui proposerait alors une sauvegarde non migrée, avec des îles au-delà de 30.

### 3.5 Tests et outils

- **`tests/rules.test.js`** :
  - boucles sur `CAMPAIGN_SIZE` (lignes 29, 288 et 482, sans souci) ;
  - numéros d'île en dur : 31 (lignes 107 et 144), 26 (lignes 118, 208 et 227), 9 (ligne 238), 6 et 5 (lignes 246 et 248, « pas de main avant l'île 6 »), 20 (ligne 253), 16 (ligne 277) ;
  - seuils en dur : `buildOn n >= 16`, `handOn n >= 6`, `fuseOn n >= 21`, `level3On n >= 31`, `surpriseOn n >= 11`, collines avant 12, lande avant 14, rares tardives à 13 (lignes 295 à 301) ;
  - climats sur les îles 21, 26 et 31 (ligne 305) ; bot sur `[2, 4, 6, 9, 11, 21, 26, 31]` (ligne 316) ;
  - Atelier : `Math.ceil(at / 5)` et `playerChapter(50) === 10` (lignes 141 et 142) ;
  - portes avec des chapitres de 5, 6 étoiles et 8 parties (lignes 444 à 473) ;
  - insignes rétroactifs `plays {5, 10}`, `memoriesRead [15]` (lignes 572 à 576).
  - **Piège** : `campaignIsland(31)` ne plante pas avec 30 îles. La fonction ramène le numéro à 30, et le test vérifierait donc silencieusement une autre île.
- **`tests/gate.js`** : tout le scénario repose sur un chapitre 1 fait des îles 1 à 5, sur « 5 / 6 », sur « 8 parties » et sur les îles 9, 10 et 11.
- **`tests/decouverte.js`** : « île 7 » et « île 10 » pour les modes (lignes 36 et 37) ; île 16 pour bâtir (lignes 77 et 78).
- **Autres tests navigateur** : `tests/resume.js` (île 9), `tests/finale.js` (île 12, ouverte jusqu'à 30), `tests/autoplay.js` (ouverte jusqu'à 12), `tests/mobile.js` (île 7).
- **`tests/run.test.js`** : ligne 127, message « île 50 ».
- **Outils** :
  - `tools/capture_partie.js` ligne 22 : `unlockedIsland: 50` ;
  - `tools/calibrate.js` : plage par défaut `1-CAMPAIGN_SIZE`, automatique.

---

## 4. Les plans à 30 îles

### 4.1 Le socle commun : 25 îles indispensables

L'ordre à garder compte 17 étapes :

1. affinités, fermeture, faune ;
2. rivière, saisons ;
3. semis ;
4. vœux, main de saison ;
5. souffles ;
6. tuiles rares ;
7. surprises de saison ;
8. collines ;
9. grenier, ruche, menhir ;
10. lande ;
11. bâtir ;
12. climat chaud, fusions ;
13. climat humide ;
14. climat froid, niveau 3 ;
15. alternance des climats et signatures ;
16. croissance ;
17. la fin.

Pour garder cet enchaînement et tout le récit, 25 îles sont indispensables :

- **Les 17 îles qui introduisent quelque chose** : 1, 2, 4, 6, 7, 8, 11, 12, 13, 14, 16, 21, 26, 31, 36, 41 et 50.
- **Les 8 autres îles dessinées** : 3, 5, 10, 15, 20, 25, 30 et 35.

Il reste 5 places, à choisir parmi 25 candidates :

- les 13 îles vides ;
- les 12 îles à signature seule : 37, 38, 39, 40 et 42 à 49.

Les trois plans diffèrent par ce choix et par le découpage en chapitres. Un plan peut faire porter une nouveauté par une île dessinée plutôt que par l'île générée d'aujourd'hui. Cela ne change jamais l'ordre : la mécanique arrive au même rang, sur une autre île.

Une règle vaut pour les trois plans : **chaque île générée garde sa graine d'origine**, avec un champ `seed` explicite dans sa case de `CHAPTERS`. Sinon, la renuméroter en ferme une autre île (voir la section 3.1, ligne 93). La garder intacte permet aussi de conserver les meilleurs scores des joueurs.

### 4.2 Plan A : six chapitres de cinq

Principe : garder la longueur de chapitre (5) et tout le code qui en dépend, et fondre les chapitres 4 à 10 en trois chapitres.

| Nouv. | Ch. | Source (ancien n°) | Nom | Cases | Climat | Introduit | Rôle |
|---|---|---|---|---|---|---|---|
| 1 | 1 Prise en main | H1 (1) | L'Anse aux Lapins | 30 | tempéré | affinités, fermeture, faune | nouveauté |
| 2 | 1 | G (2) | Le Banc de Sable | 34 | tempéré | rivière, saisons | nouveauté |
| 3 | 1 | H2 (3) | Le Gué des Roches | 36 | tempéré | — | récit |
| 4 | 1 | G (4) | Les Deux Sœurs | 40 | tempéré | semis | nouveauté |
| 5 | 1 | H4 (5) | Les Trois Prés | 48 | tempéré | — | souvenir, insigne 1 |
| 6 | 2 Les habitants | G (6) | Le Hameau du Vœu | 50 | tempéré | vœux, main | nouveauté |
| 7 | 2 | H3 (7) | La Pointe des Quatre Vents | 42 | tempéré | souffles | nouveauté |
| 8 | 2 | G (8) | La Pointe des Joncs | 54 | tempéré | tuiles rares | nouveauté |
| 9 | 2 | G (11) | L'Île des Nuages | 60 | tempéré | surprises de saison | nouveauté |
| 10 | 2 | H5 (10) | La Baie des Promesses | 54 | tempéré | — | souvenir, insigne 2 |
| 11 | 3 Le ciel | G (12) | Les Trois Buttes | 64 | tempéré | collines | nouveauté |
| 12 | 3 | H7 (13) | Trois Moulins | 66 | tempéré | grenier, ruche, menhir | nouveauté |
| 13 | 3 | G (14) | La Lande Rousse | 68 | tempéré | lande | nouveauté |
| 14 | 3 | G (16) | Le Val Bâti | 66 | tempéré | bâtir | nouveauté |
| 15 | 3 | H6 (15) | La Mare aux Canards | 60 | tempéré | — (bâtir s'y pratique) | souvenir, insigne 3 |
| 16 | 4 Le Sud et les Pluies | G (21) | La Côte Ocre | 72 | chaud | climat chaud, fusions | nouveauté |
| 17 | 4 | G (23) | Le Verger de Pierre | 78 | chaud | — (cascade) | pratique |
| 18 | 4 | H9 (25) | La Falaise de l'Ours | 84 | chaud | — | récit |
| 19 | 4 | G (26) | Le Pays des Pluies | 76 | humide | climat humide | nouveauté |
| 20 | 4 | H10 (30) | La Plaine des Crues | 97 | humide | — | souvenir, insigne 4 |
| 21 | 5 Le Nord et les quatre climats | G (31) | La Pinède Blanche | 82 | froid | climat froid, niveau 3 | nouveauté |
| 22 | 5 | H8 (20) | Le Pont de Glace | 72 | froid | — (son vœu de fortin s'ouvre ; veillée +1 au froid) | récit |
| 23 | 5 | G (36) | La Côte des Sels | 90 | chaud | alternance des climats ; « Les dunes » | nouveauté |
| 24 | 5 | G (39) | La Brume du Nord | 100 | humide | « Le sud est un marais » | variante |
| 25 | 5 | H11 (35) | Les Vergers de Neige | 108 | froid | — | souvenir, insigne 5 |
| 26 | 6 Cent saisons | G (41) | La Grande Plaine | 104 | tempéré | croissance ; « Les champs ouverts » | nouveauté |
| 27 | 6 | G (43) | Le Bois Long | 120 | froid | « La forêt profonde » | variante |
| 28 | 6 | G (45) | Le Grand Verger | 140 | chaud | « Le pays des vergers » | variante |
| 29 | 6 | G (49) | La Veille | 150 | tempéré | « La file est courte » | variante |
| 30 | 6 | H12 (50) | L'Île qui se souvient | 121 | tempéré | la fin | souvenir, insigne 6 |

- **Rythme.** Les nouveautés tombent sur les îles 1, 2, 4, 6, 7, 8, 9, 11, 12, 13, 14, 16, 19, 21, 23, 26 et 30. Cela fait une nouveauté toutes les 1,9 île. Le plus long passage sans nouveauté dure 3 îles (27 à 29). Il reste une seule île vide (17).
- **Durée.** 2 126 poses et 219 saisons, soit 5,9 h (de 4,7 à 7,1 h). Par chapitre : 166, 241, 298, 391, 434 et 596 poses.
- **Ce qui est fusionné.** Les anciens chapitres 5 et 6 (le Sud et les Pluies) deviennent un seul chapitre, avec deux climats. Les chapitres 7 et 8 (le Nord et les quatre climats) aussi. Les chapitres 9 et 10 (les grandes îles et la fin) aussi. Le chapitre « Bâtir » disparaît : bâtir arrive au chapitre 3.
- **Ce qui est gardé.**
  - Les douze îles dessinées et tout le récit.
  - Six signatures : dunes, marais sud, champs ouverts, forêt profonde, pays des vergers, file courte.
  - Les îles 1 à 8 sont identiques à aujourd'hui.
  - Les portes restent à 6 étoiles sur 15 ou 8 parties.
- **Ce qui est perdu ou part au Livre II.**
  - 20 îles générées : 9, 17, 18, 19, 22, 24, 27, 28, 29, 32, 33, 34, 37, 38, 40, 42, 44, 46, 47 et 48.
  - 11 signatures : deux sources, pierres dressées, lac central, rivière déjà, sans roche, saisons brèves, deux villages, saisons longues, plus les trois jamais employées.
  - **4 insignes et 4 tampons de chapitre sans emploi** : le chantier (4), le grand arbre (9), et un de chaque paire 5/6 et 7/8.
- **Atelier.** Il faut renuméroter les chapitres : Charpente passe au chapitre 3, Alambic et Manteau au 4, Maître d'œuvre au 5, Étoile du soir au 6.
- **Coût.** C'est le **plus faible** : la longueur de chapitre ne bouge pas, et `gate.js` comme les tests des îles 1 à 8 restent valables.
- **Défauts.**
  - Six insignes illustrés sur dix n'ont plus le thème de leur chapitre.
  - Deux chapitres changent de climat en leur milieu.
  - Deux îles dessinées (H9 et H8) perdent leur statut d'île-souvenir. Elles gardent leur récit.

### 4.3 Plan B : dix chapitres de trois (recommandé)

Principe : garder les dix chapitres, leurs noms, leurs insignes, leurs tampons et les ouvertures de l'Atelier. Chaque chapitre suit le schéma « nouveauté, pratique, souvenir ».

Pour tenir dans les trois premiers chapitres, trois îles dessinées portent la nouveauté que l'île générée portait jusqu'ici :

- H2 prend la rivière et les saisons ;
- H5 prend les tuiles rares ;
- H7 garde les rares tardives.

C'est ce que ces îles faisaient dans la campagne d'origine à douze îles : leurs tutoriels (`story.js`, lignes 53 à 175) portent encore « river », « rare », « build », « hill », « fuse » et « build3 ».

| Nouv. | Ch. | Source (ancien n°) | Nom | Cases | Climat | Introduit | Rôle | Poses |
|---|---|---|---|---|---|---|---|---|
| 1 | 1 Prise en main | H1 (1) | L'Anse aux Lapins | 30 | tempéré | affinités, fermeture, faune (guidé) | nouveauté | 27 |
| 2 | 1 | H2 (3) | Le Gué des Roches | 36 | tempéré | rivière, saisons (son tutoriel « rivière » d'origine) | nouveauté | 31 |
| 3 | 1 | H4 (5) | Les Trois Prés | 48 | tempéré | semis | nouveauté, souvenir, insigne 1 | 42 |
| 4 | 2 Les habitants | G (6) | Le Hameau du Vœu | 50 | tempéré | vœux, main de saison | nouveauté | 48 |
| 5 | 2 | H3 (7) | La Pointe des Quatre Vents | 42 | tempéré | souffles | nouveauté | 40 |
| 6 | 2 | H5 (10) | La Baie des Promesses | 54 | tempéré | tuiles rares | nouveauté, souvenir, insigne 2 | 49 |
| 7 | 3 Le ciel | G (11) | L'Île des Nuages | 60 | tempéré | surprises de saison | nouveauté | 54 |
| 8 | 3 | G (12) | Les Trois Buttes | 64 | tempéré | collines | nouveauté | 59 |
| 9 | 3 | H7 (13) | Trois Moulins | 66 | tempéré | grenier, ruche, menhir | nouveauté, souvenir, insigne 3 | 60 |
| 10 | 4 Bâtir | G (14) | La Lande Rousse | 68 | tempéré | lande | nouveauté | 61 |
| 11 | 4 | G (16) | Le Val Bâti | 66 | tempéré | bâtir | nouveauté | 63 |
| 12 | 4 | H6 (15) | La Mare aux Canards | 60 | tempéré | — (bâtir s'y pratique ; c'est son tutoriel d'origine) | souvenir, insigne 4 | 59 |
| 13 | 5 Archipel du Sud | G (21) | La Côte Ocre | 72 | chaud | climat chaud, fusions | nouveauté | 71 |
| 14 | 5 | G (23) | Le Verger de Pierre | 78 | chaud | — (la cascade) | pratique | 77 |
| 15 | 5 | H9 (25) | La Falaise de l'Ours | 84 | chaud | — | souvenir, insigne 5 | 78 |
| 16 | 6 Archipel des Pluies | G (26) | Le Pays des Pluies | 76 | humide | climat humide | nouveauté | 75 |
| 17 | 6 | G (29) | Les Vergers Noyés | 88 | humide | — (la rizière) | pratique | 87 |
| 18 | 6 | H10 (30) | La Plaine des Crues | 97 | humide | — | souvenir, insigne 6 | 90 |
| 19 | 7 Archipel du Nord | G (31) | La Pinède Blanche | 82 | froid | climat froid, niveau 3 | nouveauté | 80 |
| 20 | 7 | H8 (20) | Le Pont de Glace | 72 | froid | — (son vœu de fortin s'ouvre ; la veillée vaut +1 au froid) | récit, pratique | 70 |
| 21 | 7 | H11 (35) | Les Vergers de Neige | 108 | froid | — | souvenir, insigne 7 | 103 |
| 22 | 8 Les Quatre Climats | G (36) | La Côte des Sels | 90 | chaud | alternance des climats ; « Les dunes » | nouveauté | 88 |
| 23 | 8 | G (37) | Le Col Gelé | 94 | froid | « Deux sources » | variante | 90 |
| 24 | 8 | G (39) | La Brume du Nord | 100 | humide | « Le sud est un marais » | variante, souvenir, insigne 8 | 93 |
| 25 | 9 Les grandes îles | G (41) | La Grande Plaine | 104 | tempéré | croissance ; « Les champs ouverts » | nouveauté | 102 |
| 26 | 9 | G (43) | Le Bois Long | 120 | froid | « La forêt profonde » | variante | 115 |
| 27 | 9 | G (45) | Le Grand Verger | 140 | chaud | « Le pays des vergers » | variante, souvenir, insigne 9 | 138 |
| 28 | 10 Cent saisons | G (46) | La Marche | 120 | tempéré | « Les saisons passent vite » | variante | 119 |
| 29 | 10 | G (49) | La Veille | 150 | tempéré | « La file est courte » (« la veille de la dernière île ») | variante | 127 |
| 30 | 10 | H12 (50) | L'Île qui se souvient | 121 | tempéré | la fin, l'épilogue | souvenir, insigne 10 | 114 |

Nouveau `MECH_AT` du plan B :

| Île | Mécaniques |
|---|---|
| 1 | affinités, fermeture, faune |
| 2 | rivière, saisons |
| 3 | semis |
| 4 | vœux, main |
| 5 | souffles |
| 6 | rares |
| 7 | surprises |
| 8 | collines |
| 9 | grenier, ruche, menhir |
| 10 | lande |
| 11 | bâtir |
| 13 | climats, fusions |
| 19 | niveau 3 |
| 25 | croissance |

Les cartes de climat suivent d'elles-mêmes (`climateCardFor`) : chaud à 13, humide à 16, froid à 19, puis un changement à chaque île à partir de 22.

Les collines de H7 (Trois Moulins) et de H8 (Le Pont de Glace) arrivent après l'île 8 : c'est vérifié. Les poids d'une île dessinée sont fixes. Il faut donc qu'aucune île dessinée ne porte de colline avant l'île 8, ni de lande avant l'île 10. C'est le cas.

**Rythme**
- Une nouveauté sur chacune des îles 1 à 11. Ensuite, à partir du chapitre 5, **chaque chapitre s'ouvre sur sa nouveauté** : îles 13, 16, 19, 22 et 25.
- Cela fait une nouveauté toutes les 1,9 île sur l'ensemble, et jamais plus de deux îles d'affilée sans nouveauté jusqu'à l'île 25.
- Les îles 26 à 29 n'ont que leur signature et leur changement de climat, comme aujourd'hui, mais elles sont 4 au lieu de 13.
- **Îles vides : 2** (14 et 17, les deux îles de pratique des fusions), contre 13 aujourd'hui.

**Durée**
- 2 306 poses et 234 saisons, soit **6,4 h** (de 5,1 à 7,7 h).
- Par chapitre, en poses (et en minutes à 10 s par pose) :

| Chapitre | Poses | Minutes |
|---|---|---|
| 1 | 100 | 17 |
| 2 | 137 | 23 |
| 3 | 173 | 29 |
| 4 | 179 | 30 |
| 5 | 226 | 38 |
| 6 | 252 | 42 |
| 7 | 253 | 42 |
| 8 | 271 | 45 |
| 9 | 355 | 59 |
| 10 | 360 | 60 |

**Mesure des deux îles dessinées dont le jeu change** (bot fort, trois parties)
- **H6, La Mare aux Canards, à l'île 12 avec bâtir.** 59, 60 et 58 poses, contre 55 aujourd'hui. Score de 334 à 409, contre 341 à 361. Vœux : 2 sur 3, comme aujourd'hui.
- **H8, Le Pont de Glace**, sous trois climats. Il fait environ 70 poses dans tous les cas ; seuls les vœux changent :

| Climat | Vœux exaucés par le bot | Commentaire |
|---|---|---|
| Humide | 1 sur 4, trois fois | la région close de six cases échoue |
| Tempéré | 1 à 2 sur 4 | — |
| Froid | 1 à 3 sur 4 | la veillée est toujours exaucée, et vaut +1 au froid |

  J'ai donc placé H8 dans l'archipel du Nord plutôt que dans celui des Pluies. Le pont de glace au pays de la neige, c'est aussi le bon endroit pour le récit.

**Ce qui est fusionné** : rien. Chaque chapitre garde son thème.
- Deux sous-titres changent :
  - chapitre 3 : « Surprises de saison, collines, nouvelles rares » ;
  - chapitre 4 : « Landes, puis les tuiles montent de niveau ».
- Le chapitre 8 garde « Chaque île change de climat », avec trois îles : chaud, froid, humide. Le tempéré de l'île 25 suit.

**Ce qui est gardé**
- Les douze îles dessinées et tout le récit.
- Les dix insignes et les dix tampons, chacun sur son thème.
- Les dix chapitres avec leurs noms.
- L'Atelier sans aucune modification de données (le champ `chapter` garde son sens).
- Huit signatures : dunes, deux sources, marais sud, champs ouverts, forêt profonde, pays des vergers, saisons brèves, file courte.
- Deux îles de pratique.
- Les trois textes périmés (îles 9, 18 et 22) disparaissent avec leurs îles.

**Ce qui part au Livre II** : la liste détaillée figure en section 4.6.

**Les portes de chapitre (9 portes, une toutes les 3 îles)**
- Je propose **4 étoiles sur 9, ou 5 parties terminées dans le chapitre**. Cela garde la proportion d'aujourd'hui : 6/15 fait 1,2 étoile par île, 4/9 en fait 1,33 ; 8 parties pour 5 îles font 1,6 partie par île, 5 pour 3 îles en font 1,67.
- Un joueur tranquille, à 2 étoiles par île, fait 6 étoiles par chapitre et ne voit jamais la porte.
- Un joueur au niveau du hasard (0,43 de la médiane, donc 1 étoile) passe par la patience, comme aujourd'hui.

### 4.4 Plan C : cinq chapitres de six

| Nouv. | Ch. | Source (ancien n°) | Nom | Climat | Introduit |
|---|---|---|---|---|---|
| 1 | 1 Prise en main | H1 (1) | L'Anse aux Lapins | tempéré | affinités, fermeture, faune |
| 2 | 1 | G (2) | Le Banc de Sable | tempéré | rivière, saisons |
| 3 | 1 | H2 (3) | Le Gué des Roches | tempéré | — (récit) |
| 4 | 1 | G (4) | Les Deux Sœurs | tempéré | semis |
| 5 | 1 | G (6) | Le Hameau du Vœu | tempéré | vœux, main |
| 6 | 1 | H4 (5) | Les Trois Prés | tempéré | souvenir, insigne 1 |
| 7 | 2 Les habitants et le ciel | H3 (7) | La Pointe des Quatre Vents | tempéré | souffles |
| 8 | 2 | G (8) | La Pointe des Joncs | tempéré | tuiles rares |
| 9 | 2 | H5 (10) | La Baie des Promesses | tempéré | — (récit) |
| 10 | 2 | G (11) | L'Île des Nuages | tempéré | surprises de saison |
| 11 | 2 | G (12) | Les Trois Buttes | tempéré | collines |
| 12 | 2 | H7 (13) | Trois Moulins | tempéré | grenier, ruche, menhir ; souvenir, insigne 2 |
| 13 | 3 Bâtir | G (14) | La Lande Rousse | tempéré | lande |
| 14 | 3 | H6 (15) | La Mare aux Canards | tempéré | — (récit) |
| 15 | 3 | G (16) | Le Val Bâti | tempéré | bâtir |
| 16 | 3 | G (17) | Les Clos | tempéré | — (pratique) |
| 17 | 3 | G (19) | Le Pré des Saisons | tempéré | — (pratique) |
| 18 | 3 | H8 (20) | Le Pont de Glace | tempéré | souvenir, insigne 3 |
| 19 | 4 Les trois archipels | G (21) | La Côte Ocre | chaud | climat chaud, fusions |
| 20 | 4 | H9 (25) | La Falaise de l'Ours | chaud | — (récit) |
| 21 | 4 | G (26) | Le Pays des Pluies | humide | climat humide |
| 22 | 4 | H10 (30) | La Plaine des Crues | humide | — (récit) |
| 23 | 4 | G (31) | La Pinède Blanche | froid | climat froid, niveau 3 |
| 24 | 4 | H11 (35) | Les Vergers de Neige | froid | souvenir, insigne 4 |
| 25 | 5 Cent saisons | G (36) | La Côte des Sels | chaud | alternance ; « Les dunes » |
| 26 | 5 | G (39) | La Brume du Nord | humide | « Le sud est un marais » |
| 27 | 5 | G (41) | La Grande Plaine | tempéré | croissance ; « Les champs ouverts » |
| 28 | 5 | G (45) | Le Grand Verger | chaud | « Le pays des vergers » |
| 29 | 5 | G (49) | La Veille | tempéré | « La file est courte » |
| 30 | 5 | H12 (50) | L'Île qui se souvient | tempéré | la fin ; insigne 5 |

- **Rythme.** Les nouveautés tombent sur les îles 1, 2, 4, 5, 7, 8, 10, 11, 12, 13, 15, 19, 21, 23, 25, 27 et 30. Le plus long passage sans nouveauté dure 3 îles (16 à 18). Il reste deux îles vides (16 et 17), dont les textes redisent les règles de bâtir.
- **Durée.** 2 080 poses et 216 saisons, soit 5,8 h (de 4,6 à 6,9 h). Par chapitre : 214, 312, 395, 497 et 662 poses. Le dernier chapitre dure environ 1 h 50.
- **Ce qui est fusionné.** Les habitants avec le ciel. Les trois archipels en un seul chapitre, avec un climat par paire d'îles. Les quatre climats, les grandes îles et la fin ensemble.
- **Ce qui est perdu ou part au Livre II.**
  - 20 îles : 9, 18, 22, 23, 24, 27, 28, 29, 32, 33, 34, 37, 38, 40, 42, 43, 44, 46, 47 et 48.
  - 12 signatures.
  - **5 insignes et 5 tampons de chapitre sans emploi.**
- **Portes.** 7 étoiles sur 18, ou 10 parties.
- **Coût.** La longueur de chapitre change, comme dans le plan B, **et** les chapitres sont renumérotés, comme dans le plan A. C'est le plan qui cumule les deux coûts.

### 4.5 Comparaison

| | Aujourd'hui | A (6 × 5) | **B (10 × 3)** | C (5 × 6) |
|---|---|---|---|---|
| Îles | 50 | 30 | **30** | 30 |
| Îles dessinées gardées | 12 | 12 | **12** | 12 |
| Îles-souvenirs avec récit | 8 + la fin | 5 + la fin | **7 + la fin** | 4 + la fin |
| Îles « vides » | 13 | 1 | **2** | 2 |
| Plus long passage sans nouveauté | 8 îles | 3 | **4 (îles 26 à 29, avant la fin)** | 3 |
| Nouveauté toutes les… | 2,9 îles | 1,9 | **1,9** | 1,9 |
| Signatures jouées | 14 | 6 | **8** | 5 |
| Poses (bot) | 3 947 | 2 126 | **2 306** | 2 080 |
| Durée à 10 s par pose | 11,0 h | 5,9 h | **6,4 h** | 5,8 h |
| Saisons | 392 | 219 | **234** | 216 |
| Insignes et tampons employés | 10 + 10 | 6 + 6 | **10 + 10** | 5 + 5 |
| Portes de chapitre | 9 | 5 | **9** | 4 |
| Atelier (données) | — | 4 chapitres à renuméroter | **inchangé** | tout à renuméroter |
| Graines, joueur tranquille | 273 | 160 | **165** | 160 |
| Graines, joueur appliqué | 364 | 212 | **220** | 209 |
| Coût du code | — | faible | **moyen** | moyen, plus des renumérotations |

**Graines cumulées en fin de chapitre, joueur tranquille** (l'Atelier coûte 154 graines en tout) :

| Plan | Cumul en fin de chapitre | Cumul du coût des améliorations ouvertes, par chapitre |
|---|---|---|
| Aujourd'hui | 20, 46, 73, 101, 128, 156, 184, 214, 243, 273 | 26, 72, 104, 112, 130, 130, 140, 140, 154, 154 |
| B | 12, 28, 44, 61, 77, 94, 111, 129, 147, 165 | les mêmes : les chapitres gardent leur sens |
| A | 20, 46, 74, 102, 130, 160 | 26, 72, 112, 130, 140, 154 |
| C | 25, 57, 90, 124, 160 | 26, 104, 112, 140, 154 |

- **Aujourd'hui**, le joueur tranquille peut tout acheter vers la fin du chapitre 5, à la moitié de la campagne. Il finit avec 119 graines qui ne servent à rien, plus les 31 graines des succès. Cet excédent est lui aussi un symptôme de la longueur de la campagne.
- **Avec 30 îles**, il n'a tout acheté qu'à la toute fin. L'Atelier devient un vrai choix, mais les premières améliorations arrivent plus tard.
- **Deux leviers simples** pour retrouver « tout acheté vers les deux tiers » :
  - soit `BALANCE.seeds.island` passe de 2 à 3 ; le plan B donne alors 15, 34, 55, 76, 97, 118, 139, 161, 182 et 204 graines cumulées ;
  - soit les prix baissent d'environ 25 % (154 → environ 115).
- Je recommande de trancher après le recalibrage, en rejouant ce calcul.

### 4.6 Recommandation : le plan B, et ce qu'il envoie au Livre II

**Pourquoi le plan B**

1. **Il répond à la répétition là où elle est.**
   - Les 13 îles vides tombent à 2.
   - Chaque archipel passe de « nouveauté + trois îles vides + souvenir » à « nouveauté + une pratique + souvenir ».
   - À partir du chapitre 5, chaque chapitre s'ouvre sur sa nouveauté.
2. **Il garde l'enchaînement à l'identique** : les 17 étapes, dans le même ordre, et au même rang de chapitre (bâtir au chapitre 4, le chaud au 5, l'humide au 6, le froid au 7…).
3. **Il garde tout ce qui a été fabriqué récemment et qui porte un numéro de chapitre.**
   - Les dix insignes et les dix tampons, livrés les 23 et 24 septembre, illustrés un par thème (voir la section 3.3).
   - Les ouvertures de l'Atelier.
   - Le sens de `insignes.chapitres` dans les sauvegardes.
   - Aucun insigne ne se retrouve sur le mauvais thème, ce qui arriverait à six insignes dans le plan A.
4. **Il remet les îles dessinées sur ce pour quoi elles ont été écrites.**
   - H2, Le Gué des Roches : la rivière.
   - H6, La Mare aux Canards : bâtir.
   - H7, Trois Moulins : les rares tardives.
   - H8, Le Pont de Glace : sa veillée et son fortin, dans l'archipel du Nord.
   - Il rend en plus à H8 un vœu (le fortin) qui tombe aujourd'hui, les fusions n'ouvrant qu'à l'île 21.
5. **Il donne une campagne d'environ 6 h 30**, en chapitres de 17 minutes à 1 heure, qui s'allongent avec les îles. Aujourd'hui, elle dure environ 11 h, avec des chapitres de 28 minutes à 1 h 45.

**Ses défauts, dits franchement**

- La porte revient toutes les trois îles. Elle est facile (4/9), mais elle est plus fréquente.
- Il faut rendre paramétrable la longueur de chapitre, écrite « 5 » en dur à une quinzaine d'endroits.
- Le chapitre 1 perd deux îles générées que tout joueur a déjà jouées : Le Banc de Sable et Les Deux Sœurs.
- Les tailles ont trois creux, dus aux tailles fixes des îles dessinées : 42 cases à l'île 5, 60 à l'île 12, 72 à l'île 20. Ce creux existe déjà aujourd'hui (42 cases à l'île 7).

**Plan de repli** : le plan A, si la priorité est le plus petit changement de code. Les îles 1 à 8, les portes et `gate.js` n'y bougent pas. On y paie le prix des chapitres fusionnés et de quatre insignes laissés de côté.

**Ce que le plan B envoie au Livre II** (à ranger, pas à détruire)

- **20 îles générées**, avec leur graine (`5000 + ancien n° × 131`), leurs réglages de case et leur texte (nom, deux lignes d'introduction, une ligne de souvenir) :
  - 2 Le Banc de Sable ;
  - 4 Les Deux Sœurs ;
  - 8 La Pointe des Joncs ;
  - 9 Le Marché du Gué ;
  - 17 Les Clos ;
  - 18 La Grande Table ;
  - 19 Le Pré des Saisons ;
  - 22 Les Salines ;
  - 24 La Baie Blanche ;
  - 27 Les Roselières ;
  - 28 Le Bassin des Hérons ;
  - 32 Les Hauts Gelés ;
  - 33 Le Fjord ;
  - 34 La Combe Sombre ;
  - 38 Le Plateau des Cimes ;
  - 40 L'Archipel Intérieur ;
  - 42 Les Îles Jumelles ;
  - 44 Les Étangs du Soir ;
  - 47 Les Cent Toits ;
  - 48 L'Île Qui Grandit.
- Trois de ces textes sont à **réécrire avant tout réemploi**, parce qu'ils annoncent des tuiles retirées : 9 (marché, fête, ruine), 18 (auberge, abreuvoir, porche, mine, four) et 22 (le port). Le port est justement promis au Livre II, avec de vraies tuiles de mer.
- **9 signatures**, soit autant de « contraintes d'île » pour les archipels du Livre II (FEUILLE_DE_ROUTE.md, lot 7, « Archipels et contraintes d'île ») :
  - pierres dressées, lac central, rivière déjà, sans roche, deux villages, saisons longues ;
  - plus `sans_hameau`, `ile_seche` et `lande_haute`, écrites mais jamais employées.
- **4 grandes îles** qui disparaissent de la campagne : 42 (112 cases), 44 (130), 47 (130) et 48 (140). Les très grandes îles 43 (120), 45 (140), 46 (120) et 49 (150) restent.
- **Les seuils d'étoiles des îles retirées** : à jeter. Ils seront recalculés.
- **Rien d'autre.** Aucune mécanique, aucun climat, aucune île dessinée, aucun récit, aucun insigne, aucun tampon, aucun vœu de la réserve ne quitte le Livre I.
- La feuille de route du Livre II passe des îles « 51 à 75 » aux îles **31 à 55**.

---

## 5. Le coût du changement (plan B)

### 5.1 Fichier par fichier

**Données de campagne**

- **`src/data/campaign.js`** :
  - `CAMPAIGN_SIZE = 30`.
  - Nouvelle constante `CHAPTER_LEN = 3`, qui remplace chaque `5` des lignes 77, 82, 144, 162, 166 et 187.
  - `CHAPTER_GATE = 4` et `CHAPTER_PATIENCE = 5`.
  - `gateText` : « les trois îles comprises ».
  - `CHAPTERS` réécrit en 10 chapitres de 3 cases. Chaque case générée porte `seed` (la graine d'origine), `from` (l'ancien numéro, pour le texte, la signature et la saison de départ) et ses `cells` d'origine. Deux sous-titres changent (chapitres 3 et 4).
  - `MECH_AT` renuméroté (tableau de la section 4.3).
  - `campaignIsland` : lire `slot.seed` et `slot.from` au lieu de `n`, aux lignes 93, 98, 115 et 125.
  - Supprimer la copie morte d'`OLD_TO_NEW` (ligne 142).
  - La climatisation par case existe déjà (`slot.climate`) : H8 prend `climate: 'cold'` par le chapitre 7.
- **`src/data/campaign_texts.js` et `src/data/signatures.js`** : garder l'indexation par ancien numéro, avec `from`, ou renuméroter. Les entrées retirées passent dans un fichier de réserve du Livre II, par exemple `src/data/livre2_reserve.js`, non importé, ou une annexe de la feuille de route.
- **`src/data/campaign_stars.js`** : régénéré par `node tools/calibrate.js 4 1-30 --write`. L'outil fusionne avec les clés existantes (ligne 43) : il faut **vider le fichier des clés 31 à 50** avant, sinon elles restent.
- **`src/data/balance.js`**, ligne 19 : `level3From: 31` devient 19. Il faudra aussi éventuellement `seeds.island: 3` (section 4.5).
- **`src/game/island.js`** : les valeurs par défaut des lignes 35 à 46, 92 et 458 sont à aligner sur `mechIsland(…)`, ou à retirer.

**Succès**

- **`src/data/achievements.js`** :
  - « Cent saisons » : « Terminer l'île 30 » (identifiant inchangé).
  - « Cent cinquante » devient « Quatre-vingt-dix », avec `target: 90`. On garde l'identifiant `cent-cinquante`, comme cela a déjà été fait pour le port (lignes 34 à 38).
  - « Chapitre clos » : « Neuf étoiles sur un chapitre ». La vignette, avec sa couronne d'une quinzaine d'étoiles, peut rester : elle est décorative.
  - « Cinquante promesses » reste atteignable : 89 vœux dans la campagne, plus l'Île du jour.
  - « Les quatre climats » est inchangé.
- **`src/game/achievements.js`** :
  - ligne 102 : `>= 15` devient `>= CHAPTER_LEN * 3` ;
  - ligne 30 : le compteur d'étoiles ne compte que n ≤ `CAMPAIGN_SIZE`.

**Atelier, menus, collection, jeu**

- **`src/data/upgrades.js`**, ligne 28 : `playerChapter` utilise `CHAPTER_LEN`. Les données sont inchangées.
- **`src/ui/menu.js`** :
  - ligne 29 : « Trente îles à faire revivre » ;
  - lignes 84 et 91 : `CHAPTER_LEN` ;
  - lignes 51 à 54 : seuils et textes des modes. Je propose l'Île du jour « après l'île 5 » (souffles connus) et l'Île infinie « après l'île 6 » (fin du chapitre 2). Aujourd'hui, c'est après les îles 7 et 10, fin du chapitre 2.
- **`src/ui/collection.js`**, ligne 55 : `CHAPTER_LEN`. Le total des archétypes par île passe de 300 à 180 (30 × 6).
- **`src/main.js`** :
  - lignes 354, 355 et 411 : seuils des modes ;
  - ligne 436 : `Math.ceil(def.id / CHAPTER_LEN)` ;
  - lignes 175 à 195 : **migrer la copie en ligne avant `moreAdvanced` et avant `adoptCloud`** (voir la section 5.2).

**Sauvegarde et parties en cours**

- **`src/core/save.js`** :
  - `VERSION = 3` ;
  - nouvelle étape de migration v2 → v3 (section 5.2), exportée pour que `main.js` l'applique aussi aux copies en ligne ;
  - `tidyCampaign`, ligne 59 : `ch * CHAPTER_LEN`.
- **`src/core/run.js`** : format des parties en cours et archivées porté à `v: 2`, avec renumérotation de `where.id`. Une partie ou une archive de `v: 1` sur une île retirée est oubliée proprement.

**Textes publics**

- **`src/data/story.js`** : prologue (ligne 10) : « Trente îles dorment… » ; fin (ligne 702) : « Trente îles. Cent saisons. »
- **`index.html`** (ligne 14), **`manifest.webmanifest`** (ligne 4), **`README.md`** (lignes 5 et 67) : « trente îles », « dix chapitres de trois ».
- **Documents à tenir** :
  - `FEUILLE_DE_ROUTE.md` : le lot 6 réécrit, et le lot 7 pour les îles 31 à 55 ;
  - `JOURNAL_DE_BORD.md` : une ligne par lot ;
  - `CREDITS.md` : rien, aucune œuvre ne disparaît.

**Tests et outils**

- **`tests/rules.test.js`** : toutes les lignes citées en section 3.5. Les numéros en dur sont à remplacer par `mechIsland(…)` partout où c'est possible, pour que le prochain changement de taille ne casse plus rien. Il faut aussi ajouter :
  - un test « aucun numéro > `CAMPAIGN_SIZE` n'est demandé », contre le piège du `campaignIsland` qui ramène tout numéro trop grand à 30 ;
  - les tests de la migration v2 → v3.
- **`tests/gate.js`** : scénario réécrit sur des chapitres de 3 (îles 1 à 3, « x / 4 », « 5 parties », îles 4 à 6).
- **`tests/decouverte.js`** : textes des modes ; île 16 → 11 pour bâtir.
- **`tests/cloud.test.js`** : cas « copie en ligne en v2, copie locale en v3 ».
- **Tests à vérifier** : `tests/resume.js`, `finale.js`, `autoplay.js`, `mobile.js`. Les numéros 7, 9 et 12 existent toujours, mais sur d'autres îles.
- **`tests/run.test.js`**, ligne 127 : le message.
- **`tools/capture_partie.js`**, ligne 22 : 50 → 30.

### 5.2 La migration des sauvegardes (v2 → v3), la partie délicate

**Correspondance ancien n° → nouveau n° (plan B)**

| Anciens | 1 | 3 | 5 | 6 | 7 | 10 | 11 | 12 | 13 | 14 | 16 | 15 | 21 | 23 | 25 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Nouveaux | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |

| Anciens | 26 | 29 | 30 | 31 | 20 | 35 | 36 | 37 | 39 | 41 | 43 | 45 | 46 | 49 | 50 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Nouveaux | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 |

Les îles 2, 4, 8, 9, 17, 18, 19, 22, 24, 27, 28, 32, 33, 34, 38, 40, 42, 44, 47 et 48 sont retirées.

**Règles proposées**

1. **Îles gardées.** `stars`, `best`, `plays`, `gold`, `memoriesRead` et `insignes.iles` suivent la correspondance.
   - Les îles générées gardent leur graine (section 4.1). Le meilleur score reste donc celui de la même île.
   - `restarFromBest` recalcule les étoiles sur les nouveaux seuils, sans jamais en retirer (`Math.max`, `campaign.js` ligne 228).
2. **Îles retirées : archiver plutôt que supprimer.**
   - Le mieux est de ranger leurs étoiles, scores, parties, ors et archétypes dans `campaign.archive50`. Rien n'est détruit, et le Livre II ou la Collection pourront en faire quelque chose.
   - Ce qu'on perd à l'écran : un joueur qui avait tout fini voit son total passer de 150 étoiles au plus à 90 au plus. Il perd aussi jusqu'à 20 × 6 = 120 archétypes par île sur les 300.
3. **Graines** : on n'y touche pas. Le porte-monnaie et les améliorations achetées restent.
4. **Succès déjà obtenus** : ils restent obtenus, puisqu'ils sont rangés dans `achievements.unlocked`. Les compteurs se recalculent.
5. **Insignes de chapitre** : ils sont gardés tels quels, car les numéros de chapitre gardent leur sens dans le plan B. `tidyCampaign` accorde les insignes manquants avec `ch * 3`.
6. **Île ouverte.** `unlockedIsland` devient **la première île nouvelle dont l'ancien numéro dépasse l'ancienne île ouverte**, et au moins `unlockedUpTo(c)`.
   - Exemple : un joueur à l'ancienne île 24 a fait les anciennes 1 à 23, qui deviennent les nouvelles 1 à 14, plus l'ancienne 20, qui devient la nouvelle 20. Il reprend à la nouvelle île 15 (La Falaise de l'Ours), celle qu'il aurait jouée ensuite de toute façon. Les étoiles de son Pont de Glace l'attendent à l'île 20.
   - Un joueur au-delà de l'ancienne île 20 retrouve donc une campagne plus courte, sans rien rejouer.
   - Un joueur qui avait fini (`completed`) reste fini, et son succès « Cent saisons » reste acquis.
7. **Partie en cours sur une île retirée** : elle est oubliée, avec un message au menu (« Cette partie ne peut plus être reprise », qui existe déjà, `main.js` ligne 334). Sur une île gardée, `where.id` est renuméroté.
8. **Copie en ligne** :
   - `migrate` s'applique à `remote.data` avant `moreAdvanced` et avant `adoptCloud`. Sinon, une vieille copie à l'île 45 paraît « plus avancée » qu'une copie migrée à l'île 27, et elle est adoptée sans migration.
   - La première écriture après migration pousse la v3.
   - Un appareil resté sur l'ancienne version du jeu pourrait réécrire une v2 par-dessus. Ce n'est pas grave, car la v2 sera re-migrée au prochain chargement, mais cela vaut une ligne de test.
9. **Chaîne de migration** : une sauvegarde v1 (12 îles) passe v1 → v2 → v3. `migrate` applique déjà les étapes dans l'ordre (`if (from < 2)` puis `if (from < 3)`).

### 5.3 Risques

| Risque | Gravité | Parade |
|---|---|---|
| Renuméroter une île générée la change entièrement : sa graine vaut `5000 + n × 131` | forte | `seed` et `from` explicites dans chaque case |
| `campaignIsland(n > 30)` rend l'île 30 sans erreur : tests et succès faux en silence | forte | test « aucune demande hors campagne » ; compteur d'étoiles borné |
| Copie en ligne adoptée sans migration | forte | migrer avant de comparer et d'adopter ; test dans `cloud.test.js` |
| Seuils d'étoiles faux sans recalibrage | forte | `node tools/calibrate.js 4 1-30 --write`, **après** avoir vidé les clés 31 à 50. Environ 5 min : une passe du bot fort sur les 30 îles prend 63 s mesurées, fois 4 graines, plus le bot glouton. Aujourd'hui, c'est environ 8 min pour 50 îles. |
| Atelier trop cher pour 165 graines (joueur tranquille), contre 273 aujourd'hui | moyenne | une graine de plus par île, ou des prix baissés de 25 % ; à mesurer après le recalibrage |
| H8 au froid, H6 avec bâtir : vœux et scores changent (mesuré en section 4.3) | faible | couvert par le recalibrage |
| Portes plus fréquentes (9 portes, une toutes les 3 îles) | faible | seuil à 4/9, franchi par un joueur à 2 étoiles par île ; texte déjà clair (`gateText`) |
| Tests navigateur liés aux numéros d'île | moyenne | `tools/suite.sh complet` (environ 25 min), obligatoire : le changement touche les règles, le score, la sauvegarde et l'interface |
| Menu et Collection sur téléphone : 10 rangées de 3 cartes au lieu de 10 rangées de 5 | faible | capture sur téléphone, avec `tests/mobile.js` |

### 5.4 Estimation en lots

| Lot | Contenu | Vérification | Temps machine |
|---|---|---|---|
| 1. `feat:` Campagne à trente | `campaign.js` (`CHAPTER_LEN`, `CHAPTERS`, `MECH_AT`, graines explicites), `balance.js`, `island.js`, `upgrades.js`, `menu.js`, `collection.js`, `main.js` (portes, modes) ; tests `rules.test.js` réécrits sur `mechIsland` | `tools/suite.sh court` | environ 3 min |
| 2. `balance:` Recalibrage | vider les clés 31 à 50 de `campaign_stars.js`, `calibrate 4 1-30 --write` ; rejouer le calcul des graines ; trancher l'Atelier (graine d'île ou prix) | tableau du calibrage dans le journal | environ 5 min, plus 3 min |
| 3. `feat:` Sauvegarde v3 | migration, archive des îles retirées, copie en ligne migrée avant comparaison, parties en cours en `v: 2`, `tidyCampaign` ; tests de migration et `cloud.test.js` | `tools/suite.sh court` | environ 3 min |
| 4. `feat:` et `docs:` Succès, textes, documents | trois succès, compteur borné, prologue, fin, menu, `index.html`, manifeste, README, feuille de route (lots 6 et 7), journal | relecture | — |
| 5. `test:` Tests navigateur et vérification | `gate.js`, `decouverte.js`, les autres tests à revoir ; captures du menu et de la Collection (bureau et téléphone) ; une partie capturée par chapitre (`tools/capture_partie.js`) | `tools/suite.sh complet` | environ 25 min, deux passes au moins |

Ordre de grandeur : **cinq lots, une grosse journée de travail**, dont environ une heure de machine (recalibrage et deux suites complètes). Le lot 3 est le plus délicat et doit être testé sur de vraies sauvegardes :

- une partie à l'île 4 ;
- une partie à l'île 24 ;
- une partie finie ;
- une copie en ligne en v2.

Le plan A coûterait environ un lot de moins. Les lots 1 et 5 y seraient beaucoup plus légers : la longueur de chapitre ne change pas, `gate.js` ne bouge pas, et les îles 1 à 8 restent identiques. Il faudrait en revanche renuméroter l'Atelier et les insignes de chapitre dans la migration.

---

## Annexe A : comparaison rapide avec 20 îles (4 chapitres de 5)

Liste essayée (anciens numéros) : 1, 3, 5, 6, 7 | 10, 11, 13, 14, 15 | 16, 20, 21, 25, 26 | 30, 31, 36, 41, 50.

Les îles dessinées y portent la rivière (H2), le semis (H4), les rares (H5) et les collines (H7).

- **Durée.** 1 298 poses et 136 saisons, soit **3,6 h** (de 2,9 à 4,3 h).
- **Densité.** Une nouveauté sur 16 îles sur 20, soit une toutes les 1,25 île. Chaque climat n'a plus que deux îles, voire une seule : l'alternance des climats tient en une île.
- **Pertes.**
  - Une île dessinée : **H11, Les Vergers de Neige**, et donc un fragment du récit (la première neige, les manchots).
  - 12 signatures sur 14.
  - Toutes les îles de pratique.
  - 6 insignes et 6 tampons.
  - 30 îles envoyées au Livre II.
- **Graines.** Le joueur tranquille en gagne 107 : l'Atelier (154) ne se finit plus sans changer les prix.
- **Verdict.** On perd du récit, et il ne reste plus un souffle entre deux nouveautés. Trente îles, c'est le bon compromis : tout l'enchaînement tient, et la répétition disparaît.

## Annexe B : fichiers produits par cette analyse

Tous ces fichiers sont dans `/tmp/claude-0/-home-user-claude/d2f0037b-01fb-521b-8e6d-4af93f712d4f/scratchpad/reduction_iles/` :

| Fichier | Contenu |
|---|---|
| `mesure.mjs` | les 50 îles × 3 parties du bot fort, avec capture des événements |
| `mesure_1-50.json` | les données brutes |
| `mesure.log` | poses, saisons, score et temps par île |
| `analyse.mjs` et `analyse.json` | la table de la section 2.2 et les premières apparitions |
| `plans.mjs` | les totaux de chaque plan (poses, saisons, vœux, graines, îles vides, liste des îles retirées) |
| `deplaces.mjs` et `h8.mjs` | les îles dessinées H6 et H8 rejouées à leur nouvelle place |
| `chapitres.png` et `succes.png` | planches des dix insignes de chapitre et des trois vignettes de succès de campagne, vérifiées à l'œil |
