# Pistes : des formes d'îles qui changent la façon de jouer

*27 septembre 2026. Suite de l'étape 4 de la feuille Histoire (le passage étroit de l'île 8, la rivière à finir de
l'île 17). Rien n'est branché dans la campagne : le commanditaire choisit.*

Code : `FORMES`, `departsDeForme`, `composantes`, `relier` dans `src/data/islands.js` (option `forme` de `generateMask`,
que `Island` et `islandCells` transmettent depuis `def.forme`). Croquis et mesures : `node tools/mesure_formes.js croquis 11`,
`node tools/mesure_formes.js mesure 7,14,24 6` et `node tools/mesure_formes.js difficulte` (le rang de chaque forme). Test :
`node tests/formes.test.js`. Le § 6 ajoute vingt formes (dix douces pour la campagne, dix étranges pour un mode).

## 1. Comment une forme change le jeu ici

Le masque (l'ensemble des cases) n'est pas qu'un dessin : cinq règles le lisent.

| Règle | Où | Ce qu'une forme y change |
|---|---|---|
| **Fermeture d'une région** : close quand aucune case de la région n'a de voisin **vide du masque** (`Board.isRegionClosed`). La mer compte comme un mur. | `board.js`, `rules.js` (`closedRegionsAround`) | Une côte découpée, un bras de mer, une mer intérieure ferment les régions **par la mer** : plus de fermetures, plus petites. Un gué d'une case oblige une région à passer par une seule case, ou à s'arrêter. |
| **Rivière et embouchure** : une chaîne d'eau en ligne depuis une roche ou colline ; l'embouchure, c'est **le bout** qui touche une case hors masque (`water.js`, `touchesSea`). Toute case hors masque est la mer — une mer intérieure aussi. | `water.js`, `rules.js` (`P.river`, `P.mouth`), vœu `river` avec `mouth` | Plus de côte = plus d'embouchures possibles ; des roches de départ = des sources ; un lac central hors masque = une deuxième mer où se jeter. |
| **Sentiers** : un chemin d'au plus trois tuiles de terre ouverte entre deux régions de hameaux, et une prime par saison (`pathSeason`). | `paths.js` (`MAX_PATH`) | Une île en couloirs ou en îlots éloigne les hameaux : les sentiers deviennent rares (ou impossibles par-dessus un gué de roche). |
| **Faune** : des régions d'une taille donnée (lapin 3 prés, élan 5 forêts, canard 3 eaux, ours 3 forêts contre une roche, poule 2 champs contre un hameau, cheval 2 collines contre un pré…). | `fauna.js`, `BALANCE.fauna` | Des régions courtes rendent l'élan et le canard plus chers ; des roches ou des collines de départ offrent l'ours et le cheval ; des mares de départ offrent la grenouille et le canard. |
| **Harmonie** : Variété (assez de familles avec une région de 4), **Équilibre** (aucune région au-delà de 20 % des tuiles), Achèvement (85 % des tuiles dans des régions closes). | `harmonie.js` | Les formes qui cassent les grandes régions donnent l'Équilibre ; celles qui ferment par la mer donnent l'Achèvement. |
| **Vœux** : région de taille N, région close, rivière de longueur N, embouchure, lac, faune, bourgs… | `wishes.js`, réserve `CAMPAIGN_WISHES` | Un vœu de grande forêt (6) devient un vrai défi sur un îlot de 20 cases ; un vœu d'embouchure devient facile sur une longue côte. |

Le passage étroit (île 8) marche parce qu'il touche la première règle : le hameau-gué est la seule case par laquelle une
région peut passer d'une terre à l'autre. La rivière à finir (île 17) touche la deuxième. Les formes ci-dessous cherchent
d'autres prises sur ces cinq règles.

Deux mécanismes nouveaux dans `generateMask` les rendent possibles :
- **creuser puis repousser** (`sculpter`) : les cases creusées deviennent la mer et ne repoussent jamais ; l'île est reliée
  s'il le faut par le moins de cases possible (`relier` : des gués), puis la croissance reprend ailleurs pour rendre le nombre
  de cases demandé — le compte des étoiles suit ;
- **pousser dans une forme** (`avant`) : l'étoile décrit ses bras avant la croissance, qui se fait dedans, d'un même pas.

Les formes à **tuiles de départ** (crête, plateau, cuvette) ne touchent pas au masque : `departsDeForme(forme, masque, garde)`
rend les roches ou collines à pousser dans `def.start`, comme le font déjà les signatures « Deux sources » ou « Un lac au milieu ».

## 2. Les formes prototypées

Croquis sur l'île 11 (Le Val Bâti, 66 cases, graine de la campagne) : une ligne par `r`, un caractère par case.
`.` la mer, `#` la terre, `H` hameau, `R` roche, `h` colline, `~` eau posée au départ (lagune ou mare).
L'île ronde, pour comparer :

```
. . # # # # # . .
 . # # # # # # # .
. # # # # # # # #
 # # # # # R # # #
# # # # H # # # #
 # # # ~ # # # # .
. # # R # # # # .
 # # # # # # # . .
. # # # # # # . .
```

### A. L'archipel — `archipel`
*Ici, on apprend à finir petit : trois îlots, trois plans, et un gué qui engage les deux rives.*
Deux bras de mer d'une case de large aux tiers de l'île ; `relier` rajoute **un gué d'une case** par bras (jamais sur une tuile
de départ). Contrainte : trois plans de 20 cases, une région qui veut traverser passe par le gué ; les sentiers entre îlots
sont rares ; l'élan (5 forêts) et le vœu de grande forêt demandent un îlot entier.
```
. . . . . # . . . . .
 . . . . # # # . . .
. # # . # # # . . . .
 # # # . # # # . # .
# # # . # # # . # # .
 # # # # # # R . # #
. # # . # H # # # # #
 # # # . . # # . # #
. # # . R # # . # # .
 . # # . # # # . # .
. # # . # # # . . . .
```

### B. Le chapelet — `chapelet`
*Ici, on apprend à traverser : chaque col est une porte, et une région qui la franchit ne se ferme plus.*
Le passage étroit répété : trois lobes (quatre à partir de 90 cases) reliés par des cols de deux cases. Moins radical que
l'archipel (deux cases laissent passer une région), plus lisible comme « une île ».
```
 . . . . # # # . . .
. . # . # # # . . . .
 # # # . # # # . # .
# # # . # # # . # # .
 # # # . # # R . # #
. # # # # H # # # # #
 # # # # ~ # # # # #
. # # . R # # . # # .
 . # # . # # # . # .
. # # . # # # . . . .
```

### C. L'anneau — `anneau`
*Ici, on apprend à bâtir sur une couronne : deux mers, des régions courtes, des embouchures partout.*
Un disque de 19 cases (7 sous 56 cases) au point le plus enfoncé dans les terres, qui **reste la mer** (il n'est pas cerné
case par case, donc `enclosedHoles` ne le comble pas). La couronne fait deux à trois cases de large : toute région est vite
close par les deux mers, une rivière depuis la roche de la couronne trouve une embouchure dans le lac. Les tuiles de départ
doivent être sur la couronne : une signature ferait `d.start = [hameau (3,−1), roche (−3,2)]`, comme « Un lac au milieu ».
```
. . # # # # # . . .
 . # # # # # # # .
. # # # # # # # # .
 # # # . . . # # #
# # # . . . . H # #
 # # . . . . . # #
# # # . . . . # # .
 # # R . . . # # .
. # # # # # # # # .
 . # # # # # # # .
. . # # # # # . . .
```

### D. Le croissant — `croissant`
*Ici, on apprend à jouer le long d'une côte : peu d'intérieur, une baie qui reçoit toutes les rivières.*
Une baie à l'ouest (disque de 0,72 rayon centré près du bord) ; l'île repousse en cornes. Beaucoup de côte, un intérieur mince.
```
 . # # # # . . .
. # # # # # # . .
 . # # # # # # .
. . # # # # # # .
 . . # # R # # #
. . . H # # # # #
 . . . # # # # #
. . R # # # # # .
 . # # # # # # .
# # # # # # # . .
 # # # # # # . .
. . # # # . . . .
```

### E. Les deux baies — `baies`
*Ici, on apprend à serpenter : deux baies se croisent, et tout chemin fait le tour.*
Une échancrure du nord et une du sud, décalées, chacune sur 62 % de la hauteur : l'île devient un S. Trois lobes qui se
suivent, deux goulets en diagonale, une côte partout.
```
. . . . # # # . . .
 . # . . # # # # . .
. # # . # # # # # .
 # # . . # # # # # .
# # # . # # R # # #
 # # . . H # . . # #
# # # # . # # . # .
 # # # R # # . . . .
. # # # # # # . . .
 # # # # # # . . . .
. . # # # # # . . .
```

### F. La longue côte — `cote`
*Ici, on apprend à finir une rivière : la mer n'est jamais loin, l'intérieur est un couloir.*
C'est l'option `etire` existante poussée à 2,6 (l'Île du jour et le Souffle court l'utilisent à 1,4 pour le portrait).
Aucune case n'est à plus de trois pas de la mer.
```
 . # # # . .
. # # # # .
 # # # # # .
. # # # # #
 # # # # # #
. # # # R #
 # # H # # .
# # # # # #
 # R # # # .
# # # # # #
 # # # # # .
. # # # # .
 . # # # # .
. . # # # .
```

### G. Le damier de lagunes — `lagunes`
*Ici, on apprend à composer avec l'eau qui est déjà là : chaque mare touche tout ce qu'on pose.*
Des mares de départ sur le réseau « en fleur » (une case sur sept à l'intérieur, jamais deux voisines, jamais sur la côte) :
ce sont les trous de `holes`, en nombre et réguliers, comblés en vraies tuiles d'eau. Six mares sur 66 cases, douze sur 82.
```
. . # # # # # . .
 . # # ~ # # # # .
. # # # # # # # #
 # ~ # # # R # # #
# # # # H # # # #
 # # # ~ # # ~ # .
. # ~ R # # # # .
 # # # # ~ # # . .
. # # # # # # . .
```

### H. L'étoile — `etoile`
*Ici, on apprend à tenir trois fronts : chaque bras est un couloir, le cœur les relie.*
Un cœur de rayon 2,4 et trois bras de quatre à cinq cases de large le long des directions de la grille (est, nord-ouest,
sud-ouest), décrits **avant** la croissance pour pousser d'un même pas. Chaque bras est une île de 15 à 30 cases avec le
hameau en commun.
```
 . # # # . . . . .
. # # # # . . . .
 # # # # # . . . .
. # # # # # # # #
 . # # # ~ R # # #
. . # # H # # # #
 . # # # # # # # .
. # # R # # # # .
 # # # # # . . . .
# # # # # . . . .
 # # # # . . . . .
. # # # . . . . .
```

### I. La crête — `crete` (tuiles de départ)
*Ici, on apprend à faire naître l'eau d'une montagne : deux versants, un col, des rivières des deux côtés.*
Une bande de roches en zigzag, à deux colonnes du hameau, du nord jusqu'aux 70 % de la hauteur ; le sud reste un col.
Sept à dix roches : autant de sources, autant de cases en moins dans la file, et des bords « caillasse » (champ −1) et
« à l'étroit » (hameau −1) — mais « versant » (forêt +2).
```
. . R # # # # . .
 . # R # # # # # .
. # R # # # # # #
 # # R # # R # # #
# # R # H # # # #
 # # R ~ # # # # .
. # # R # # # # .
 # # # # # # # . .
. # # # # # # . .
```

### J. Le plateau — `plateau` (tuiles de départ)
*Ici, on apprend à descendre du plateau : les collines sont la source, et les chevaux paissent en dessous.*
Sept collines en fleur au plus profond de l'île, hors des tuiles de départ. Sources dans toutes les directions, chevaux
dès un pré contre le plateau, bords « pâturage », « versant boisé », « belvédère » — et « pente » (champ −1).
```
. . # # # # # . .
 . # # h h # # # .
. # # h h h # # #
 # # # h h R # # #
# # # # H # # # #
 # # # ~ # # # # .
. # # R # # # # .
 # # # # # # # . .
. # # # # # # . .
```

### K. La cuvette — `cuvette` (tuiles de départ)
*Ici, on apprend à garder l'eau : les sources sont au bord, le centre ne connaît que les lacs.*
Une roche toutes les trois cases le long de la côte (huit à douze). Les rivières naissent au bord et atteignent la mer en
deux tuiles ; au centre, seuls les lacs restent.
```
. . R # # R # . .
 . # # # # # # R .
. # # # # # # # #
 R # # # # R # # #
# # # # H # # # R
 # # # ~ # # # # .
. # # R # # # # .
 # # # # # # R . .
. R # # R # # . .
```

## 3. Mesures

Robot fort (`tests/bot.js`, `playStrong`), trois hasards par forme, la graine de l'île (celle du joueur), médianes. Trois îles
nues de la campagne : 7 (L'Île des Nuages, 60 cases, tempérée, avant bâtir), 11 (Le Val Bâti, 66 cases, tempérée, bâtir
vient d'arriver), 19 (La Pinède Blanche, 82 cases, froide, niveau 3). L'écart de score se lit
contre l'île ronde de même graine ; pour l'anneau, contre la ronde **au même départ déplacé** (`ronde_deplacee`), sinon on
mesurerait le déplacement du hameau et pas le lac. `poses` : tuiles jouées (les formes à roches raccourcissent la file
d'autant, d'où la colonne pts/pose). `rivières` et `embouchures` : à la fin de la partie. `sentiers` : liens entre hameaux à
la fin. `harmonie` : fleurs ouvertes sur 3. `vœux` : part tenue.

| île | forme | cases | poses | score | écart % | pts/pose | fermetures | faune % | grande région | rivières | embouchures | sentiers | harmonie | vœux | morceaux |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 7 | ronde | 60 | 54 | 474 | 0 | 8.8 | 26 | 38 | 10 | 0 | 0 | 6 | 2 | 0.33 | 1 |
| 7 | ronde_deplacee | 60 | 56 | 479 | 1 | 8.6 | 23 | 36 | 10 | 1 | 0 | 3 | 2 | 0.67 | 1 |
| 7 | archipel | 60 | 55 | 380 | -20 | 6.9 | 33 | 34 | 4 | 1 | 1 | 2 | 2 | 0.67 | 1 |
| 7 | chapelet | 60 | 55 | 426 | -10 | 7.7 | 31 | 32 | 6 | 1 | 1 | 2 | 2 | 0.67 | 1 |
| 7 | anneau | 60 | 55 | 353 | -26 | 6.4 | 37 | 38 | 4 | 2 | 2 | 1 | 2 | 0.33 | 1 |
| 7 | croissant | 60 | 55 | 419 | -12 | 7.8 | 27 | 35 | 6 | 2 | 1 | 6 | 2 | 0.67 | 1 |
| 7 | baies | 60 | 55 | 430 | -9 | 7.8 | 31 | 38 | 5 | 2 | 2 | 2 | 2 | 0.67 | 1 |
| 7 | cote | 60 | 55 | 457 | -4 | 8.3 | 25 | 34 | 6 | 2 | 1 | 6 | 2 | 0.67 | 1 |
| 7 | lagunes | 60 | 51 | 451 | -5 | 8.8 | 33 | 29 | 7 | 2 | 1 | 6 | 2 | 0.67 | 1 |
| 7 | etoile | 60 | 55 | 457 | -4 | 8.3 | 30 | 33 | 6 | 2 | 0 | 7 | 2 | 0.67 | 1 |
| 7 | crete | 60 | 50 | 385 | -19 | 7.7 | 27 | 26 | 10 | 2 | 2 | 6 | 2 | 0.67 | 1 |
| 7 | plateau | 60 | 48 | 402 | -15 | 8.4 | 29 | 31 | 7 | 1 | 0 | 2 | 2 | 0.67 | 1 |
| 7 | cuvette | 60 | 46 | 397 | -16 | 8.6 | 24 | 31 | 6 | 2 | 1 | 6 | 1 | 0.33 | 1 |
| 11 | ronde | 66 | 60 | 679 | 0 | 11.3 | 31 | 31 | 10 | 1 | 0 | 3 | 2 | 0.67 | 1 |
| 11 | ronde_deplacee | 66 | 60 | 613 | -10 | 10.0 | 32 | 28 | 7 | 2 | 0 | 5 | 1 | 0.33 | 1 |
| 11 | archipel | 67 | 60 | 548 | -19 | 9.3 | 37 | 29 | 5 | 2 | 2 | 2 | 2 | 0.67 | 1 |
| 11 | chapelet | 68 | 60 | 595 | -12 | 10.1 | 36 | 28 | 6 | 2 | 1 | 2 | 2 | 0.67 | 1 |
| 11 | anneau | 66 | 60 | 580 | -5 | 9.5 | 35 | 30 | 5 | 1 | 1 | 2 | 2 | 0.33 | 1 |
| 11 | croissant | 67 | 60 | 583 | -14 | 9.7 | 27 | 25 | 8 | 1 | 1 | 1 | 2 | 0.67 | 1 |
| 11 | baies | 67 | 60 | 581 | -14 | 9.7 | 40 | 28 | 5 | 3 | 2 | 4 | 2 | 0.67 | 1 |
| 11 | cote | 66 | 59 | 596 | -12 | 9.9 | 31 | 26 | 6 | 3 | 2 | 3 | 2 | 0.33 | 1 |
| 11 | lagunes | 66 | 57 | 683 | 1 | 12.0 | 32 | 27 | 10 | 0 | 0 | 2 | 2 | 1.00 | 1 |
| 11 | etoile | 66 | 61 | 672 | -1 | 11.0 | 36 | 29 | 5 | 1 | 1 | 2 | 2 | 1.00 | 1 |
| 11 | crete | 66 | 53 | 488 | -28 | 9.2 | 33 | 23 | 6 | 2 | 0 | 2 | 1 | 0.33 | 1 |
| 11 | plateau | 66 | 53 | 543 | -20 | 10.2 | 30 | 25 | 10 | 2 | 1 | 2 | 2 | 0.67 | 1 |
| 11 | cuvette | 66 | 52 | 530 | -22 | 10.2 | 33 | 26 | 9 | 2 | 0 | 2 | 1 | 0.67 | 1 |
| 19 | ronde | 82 | 73 | 871 | 0 | 11.9 | 43 | 23 | 21 | 0 | 0 | 0 | 2 | 0.33 | 1 |
| 19 | ronde_deplacee | 82 | 74 | 772 | -11 | 10.4 | 36 | 20 | 20 | 1 | 1 | 0 | 1 | 0.33 | 1 |
| 19 | archipel | 82 | 74 | 870 | 0 | 11.7 | 50 | 19 | 20 | 0 | 0 | 0 | 2 | 0.67 | 1 |
| 19 | chapelet | 82 | 74 | 854 | -2 | 11.5 | 47 | 20 | 14 | 1 | 0 | 0 | 3 | 0.67 | 1 |
| 19 | anneau | 82 | 75 | 888 | 15 | 11.8 | 50 | 22 | 20 | 1 | 0 | 0 | 1 | 0.67 | 1 |
| 19 | croissant | 82 | 74 | 840 | -4 | 11.5 | 41 | 16 | 21 | 0 | 0 | 0 | 2 | 0.67 | 1 |
| 19 | baies | 82 | 75 | 886 | 2 | 12.0 | 57 | 18 | 13 | 0 | 0 | 1 | 2 | 1.00 | 1 |
| 19 | cote | 82 | 73 | 891 | 2 | 12.2 | 48 | 19 | 21 | 1 | 0 | 0 | 2 | 0.33 | 1 |
| 19 | lagunes | 82 | 71 | 1077 | 24 | 15.2 | 59 | 20 | 24 | 2 | 0 | 0 | 2 | 0.67 | 1 |
| 19 | etoile | 82 | 74 | 884 | 1 | 11.9 | 50 | 21 | 20 | 1 | 0 | 1 | 2 | 0.67 | 1 |
| 19 | crete | 82 | 67 | 803 | -8 | 12.0 | 43 | 16 | 27 | 1 | 0 | 0 | 2 | 0.67 | 1 |
| 19 | plateau | 82 | 67 | 888 | 2 | 13.1 | 39 | 18 | 18 | 1 | 0 | 0 | 2 | 0.67 | 1 |
| 19 | cuvette | 82 | 65 | 841 | -3 | 12.9 | 45 | 18 | 17 | 1 | 0 | 0 | 2 | 0.67 | 1 |

Ce qu'on lit :

- **Les formes qui découpent (archipel, chapelet, baies, anneau) changent le jeu, et dans le même sens** : +20 à +40 % de
  fermetures, la plus grande région **divisée par deux** (10 → 4 à 6 sur 60-66 cases ; 21 → 13 à 20 sur 82). Le score baisse
  de 10 à 20 % sur les petites îles (des régions courtes, moins de primes de grande région), pas sur 82 cases. Les sentiers
  disparaissent presque (6 → 2 sur l'île 7). L'archipel est le plus tranché, le chapelet une version adoucie.
- **L'anneau** est lu à part : sur 60 cases, la couronne est trop mince (−26 %, régions de 4) ; sur 82 cases, c'est la forme
  qui **rapporte le plus** (+15 %, 50 fermetures contre 36) — la double côte ferme tout. À partir de 70 cases.
- **L'étoile** casse les grandes régions (10 → 5) et ajoute des fermetures (+15 %) **sans toucher au score** (−4, −1, +1 %) :
  la forme la plus « gratuite » pour le joueur, et la plus visible.
- **Le croissant et la longue côte changent peu** : mêmes fermetures, régions un peu plus courtes, score −4 à −14 %. Ce sont
  des dessins plus que des situations — la longue côte est déjà une option (`etire`).
- **Les lagunes n'ajoutent pas une contrainte, elles ajoutent une rente** : +1 % sur 66 cases, **+24 %** sur 82 (douze mares
  de départ, chacune payée à chaque saison et bord d'eau pour tout ce qu'on pose), faune en part moindre, plus grande région
  inchangée. Le robot n'a rien à décider de plus. À réserver à l'Île du jour, où le seuil suit la partie.
- **Les formes à roches (crête, plateau, cuvette) coûtent** : −15 à −28 % de score sur 60-66 cases, dont une bonne part vient
  de la file raccourcie de 7 à 11 tuiles (pts/pose : −5 à −19 %), et la faune tombe de 5 à 12 points (les roches coupent les
  prés et les forêts). Sur l'île 19 (froide, forêt ×1,5), la crête et le plateau ne coûtent plus rien par pose (+1, +10 %) :
  « versant » (forêt-roche +2) et « versant boisé » paient les roches. **Ce qu'elles promettent — des rivières des deux côtés,
  l'eau qui naît au bord — ne se voit pas dans les chiffres du robot** : 0 à 2 rivières à la fin, quelle que soit la forme.
- **Aucune forme n'est en plusieurs morceaux** : les gués tiennent (`morceaux` = 1 partout, test `formes.test.js`).

### Confirmation sur les îles cibles (six hasards)

| île | forme | cases | poses | score | écart % | pts/pose | fermetures | faune % | grande région | rivières | embouchures | sentiers | harmonie | vœux | morceaux |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 14 | ronde | 78 | 71 | 838 | 0 | 11.8 | 36 | 15 | 13.5 | 1 | 0 | 0 | 2 | 0.67 | 1 |
| 14 | ronde_deplacee | 78 | 73 | 928 | 11 | 12.8 | 43.5 | 16 | 14.5 | 1 | 0 | 0.5 | 3 | 1.00 | 1 |
| 14 | archipel | 79 | 72 | 933 | 11 | 13.0 | 56.5 | 16 | 9 | 0.5 | 0.5 | 1 | 2 | 1.00 | 1 |
| 14 | anneau | 78 | 73 | 885 | -5 | 12.1 | 50.5 | 14 | 9.5 | 1 | 0.5 | 0 | 3 | 1.00 | 1 |
| 14 | etoile | 78 | 71.5 | 896 | 7 | 12.5 | 44.5 | 14 | 14.5 | 0 | 0 | 0 | 3 | 0.83 | 1 |
| 14 | baies | 79 | 72 | 906 | 8 | 12.6 | 51.5 | 14 | 9.5 | 1.5 | 0 | 0.5 | 2.5 | 1.00 | 1 |
| 14 | lagunes | 78 | 67 | 932 | 11 | 13.9 | 47.5 | 15 | 18 | 1 | 0 | 0 | 2 | 1.00 | 1 |
| 16 | ronde | 76 | 69 | 859 | 0 | 12.4 | 37.5 | 22 | 13 | 1 | 0 | 1 | 2 | 0.67 | 1 |
| 16 | ronde_deplacee | 76 | 70 | 849 | -1 | 12.1 | 43.5 | 22 | 13.5 | 2 | 0 | 0 | 2.5 | 0.67 | 1 |
| 16 | archipel | 76 | 69 | 848 | -1 | 12.4 | 52 | 22 | 13.5 | 4 | 3.5 | 0.5 | 2 | 0.67 | 1 |
| 16 | anneau | 76 | 70 | 828 | -2 | 11.9 | 46 | 23 | 9 | 2 | 1 | 1 | 2 | 0.67 | 1 |
| 16 | etoile | 76 | 69 | 894 | 4 | 12.9 | 45 | 23 | 11.5 | 3 | 2 | 0.5 | 3 | 0.67 | 1 |
| 16 | baies | 76 | 69 | 855 | 0 | 12.4 | 50 | 24 | 13.5 | 2 | 0.5 | 0 | 2.5 | 0.67 | 1 |
| 16 | lagunes | 76 | 66 | 936 | 9 | 14.2 | 43.5 | 24 | 16.5 | 2 | 1 | 1 | 2 | 0.50 | 1 |
| 25 | ronde | 104 | 94 | 1294 | 0 | 13.8 | 60 | 21 | 28 | 1 | 0 | 0.5 | 2 | 1.00 | 1 |
| 25 | ronde_deplacee | 104 | 96 | 1368 | 6 | 14.3 | 59 | 21 | 27.5 | 0.5 | 0 | 2 | 2 | 1.00 | 1 |
| 25 | archipel | 104 | 93.5 | 1237 | -4 | 13.2 | 70.5 | 19 | 10 | 2.5 | 1 | 2.5 | 3 | 0.88 | 1 |
| 25 | anneau | 105 | 96 | 1376 | 1 | 14.3 | 72 | 19 | 14.5 | 1 | 0.5 | 2.5 | 2.5 | 1.00 | 1 |
| 25 | etoile | 104 | 94 | 1354 | 5 | 14.4 | 72.5 | 20 | 18.5 | 1 | 0.5 | 1 | 2.5 | 1.00 | 1 |
| 25 | baies | 105 | 94 | 1373 | 6 | 14.6 | 71 | 22 | 12.5 | 2 | 0 | 5 | 3 | 1.00 | 1 |
| 25 | lagunes | 104 | 89 | 1428 | 10 | 16.0 | 77.5 | 19 | 24 | 2 | 0.5 | 1 | 3 | 1.00 | 1 |

| 28 | ronde | 120 | 107 | 1577 | 0 | 14.7 | 64 | 22 | 18 | 1 | 0 | 1.5 | 2.5 | 0.75 | 1 |
| 28 | ronde_deplacee | 120 | 109 | 1764 | 12 | 16.1 | 67.5 | 24 | 15.5 | 1 | 0 | 3 | 3 | 0.75 | 1 |
| 28 | archipel | 120 | 107 | 1610 | 2 | 15.2 | 77.5 | 26 | 11 | 2 | 0 | 2.5 | 3 | 0.75 | 1 |
| 28 | anneau | 120 | 110 | 1792 | 2 | 16.4 | 73 | 27 | 10 | 1 | 0 | 1.5 | 3 | 1.00 | 1 |
| 28 | etoile | 120 | 107 | 1647 | 4 | 15.4 | 74.5 | 24 | 12 | 1.5 | 0 | 1.5 | 3 | 0.75 | 1 |
| 28 | baies | 120 | 107 | 1671 | 6 | 15.6 | 71 | 22 | 18 | 0.5 | 0 | 1 | 3 | 0.75 | 1 |

Sur les îles cibles, plus grandes (76 à 120 cases), **les formes ne coûtent plus rien en score** (−5 à +11 %, dans le bruit
des six hasards — la ronde au départ déplacé fait +11 % sur l'île 14 sans rien changer d'autre) et gardent tout leur effet
sur la structure : sur l'île 14, l'archipel passe de 36 à 56 fermetures et la plus grande région de 13,5 à 9 ; sur l'île 25,
l'étoile fait 72 fermetures pour 60 et ramène la plus grande région de 28 à 18, l'archipel à 10. L'anneau sur l'île 16 est
le plus discret (46 fermetures pour 43, région 9 pour 13,5) : la couronne de 76 cases est encore large de trois cases ;
c'est l'archipel qui, sur cette île à file d'eau, donne le plus de rivières (4, dont 3,5 avec embouchure). Les lagunes
restent une rente (+9 à +11 %, 16 pts/pose pour 14). Sur l'île 28 (120 cases), l'étoile fait 74,5 fermetures pour 64 et
ramène la plus grande région de 18 à 12 pour +4 % de score : la forme est bien « gratuite » ; les deux baies, elles, n'y
changent plus la plus grande région (18) — sur une grande île, ses lobes sont assez larges pour tout contenir.

## 4. Recommandation

Trois formes pour la campagne, à la place d'îles générées « pratique » ou « variante » (la campagne garde ses trente îles) :

| Forme | Île | Pourquoi là | Ce qui change dans la définition |
|---|---|---|---|
| **L'archipel** | **14 — Le Verger de Pierre** (chapitre 5 « Archipel du Sud », 78 cases, chaud, « pratique », aucune mécanique nouvelle) | Le chapitre s'appelle Archipel et n'en montre aucun. 78 cases font trois îlots de 26 : assez pour un plan par îlot. Le climat chaud (sable ×2,2) donne des plages aux trois rives. | signature `archipel` : `d.forme = 'archipel'` ; intention « Ici, on apprend à finir petit : trois îlots, trois plans » ; garder le vœu de cascade (fusion roche + eau) | 
| **L'anneau** | **16 — Le Pays des Pluies** (chapitre 6 « Archipel des Pluies », 76 cases, humide, la carte du climat humide arrive) | Il pleut, l'île s'ouvre sur un lac : c'est l'image du chapitre. La file `rivers` (eau ×1,5 en humide) et le lac-mer donnent des embouchures dans les deux sens. 76 cases : la couronne tient (mesuré à partir de 70). | signature `anneau` : `d.forme = 'anneau'`, `d.start = [hameau (3,−1), roche (−3,2)]` ; le vœu de lac (`c_lake`) garde son sens, le vœu d'embouchure devient facile — le retirer ou le garder comme vœu d'ouverture |
| **L'étoile** | **28 — La Marche** (chapitre 10, 120 cases, tempérée, « variante », signature « Les saisons passent vite ») | « La dernière terre avant le large » : trois caps vers la mer. 120 cases font trois bras de 30, chacun une île de chapitre 2 avec le hameau en commun. La forme ne coûte rien en score et se voit d'un coup d'œil ; « deux poses de moins par saison » se sentait peu. | signature `etoile` à la place de `saisons_breves` (ou en plus : les deux ne se gênent pas) ; intention « Ici, on apprend à tenir trois fronts » |

Quatrième choix, moins cher : **la crête sur 23 — Le Col Gelé** (94 cases, froid), dont le texte promet déjà « deux crêtes,
un col entre elles » et dont la signature « Deux sources » pose déjà deux roches : la crête les remplace par une vraie arête
avec un col, et le froid (forêt ×1,5) paie les roches. À condition d'accepter la file raccourcie de dix tuiles.

**À l'Île du jour** (60-90 cases, un tirage par date) : les deux baies, le chapelet, le croissant, la longue côte et les
lagunes — les formes qui se dessinent sans déplacer le départ et sans calibrage à part, tirées une fois sur deux avec la
date (`dailyDef` : `forme` tirée dans `['baies', 'chapelet', 'croissant', 'cote', 'lagunes', null, null]`). Les lagunes y sont
à leur place : le seuil de l'Île du jour suit la partie, la rente ne fausse aucune étoile.

**À l'Île infinie** : seules les formes à tuiles de départ survivent à la croissance (`Board.grow` remplit la mer autour, un
bras creusé se comblerait) : **le plateau** (sept collines au départ, sources dans toutes les directions, chevaux) et **la
crête**. Sans étoiles, leur coût en score n'y gêne personne.

Après branchement : `node tools/calibrate.js 4 14-14 --write` (et 16, 28), puisque le compte de cases et le départ changent.

## 5. Ce que je n'ai pas pu mesurer

- **Le puzzle de rivière que la crête et la cuvette promettent** : le robot fort ne cherche pas les rivières (0 à 2 à la fin,
  toutes formes confondues), il fait des lacs. Il faudrait un robot « eau » (poids `wish` sur un vœu d'embouchure) ou une
  main humaine.
- **Le rendu** : la mer intérieure de l'anneau (19 cases hors masque, cernées) n'a jamais été dessinée en jeu — le littoral
  (contour global, journal 85) devrait la traiter comme une côte, mais rien ne le prouve avant `tools/capture_partie.js`
  sur une définition branchée. Même réserve pour les bras de mer d'une case (archipel, baies), plus étroits que tout ce que
  le contour a rencontré.
- **Le joueur** : trois hasards de robot par forme, c'est une tendance, pas une mesure fine (±10 % entre deux hasards). Les
  écarts au-delà de 15 % sont sûrs, ceux en dessous sont des indices.
- **Le Souffle court** au téléphone en portrait utilise `etire` 1,5 (`etirePortrait`) : une forme s'y superposerait à
  l'étirement, pas testé (la longue côte, elle, est cet étirement).

## 6. Vingt formes de plus

*27 septembre 2026, suite. Le commanditaire a dit « go » pour deux choses : des îles de campagne **plus naturelles** (« des baies,
des bras de mer, de grands lacs au centre ») sans rendre le jeu plus dur, et un mode où l'île change de forme à chaque partie,
« une trentaine de formes, de la plus simple à la plus étrange ». Rien n'est branché : la campagne et le mode sont câblés à part.*

Chaque forme de `FORMES` porte désormais trois champs de plus : `famille` (`douce` : naturelle, pour la campagne ; `construite` :
une situation, les dix premières ; `etrange` : pour le mode), `difficulte` (mesurée, voir plus bas) et, pour celles qui déplacent
le départ, `depart` (l'anneau porte le sien, celui que sa signature poserait ; l'ourlet et l'atoll ont le leur). `etire` est aussi
un champ de forme (la longue côte à 2,6, le haricot à 1,35, la goutte à 1,3, le labyrinthe à 1,4). Les dix formes existantes
sont rangées ainsi : archipel, chapelet, anneau, étoile, lagunes, crête, plateau, cuvette = construites ; croissant, deux baies,
longue côte = douces.

Trois outils de plus dans `islands.js`, sans toucher aux fonctions existantes : `sansDepart` (parmi plusieurs façons de creuser
— la baie du nord ou du sud, le fjord de l'ouest ou de l'est —, la première qui n'emporte aucune tuile de départ), `finir` (pour
une forme décrite avant la croissance : une tuile de départ tombée hors de la forme est reliée par un gué, puis l'île repousse
au compte), `combler` (les formes étranges comblent les mares de départ : leurs couloirs sont trop fins pour en garder) et
`rogner` (ramener l'île au compte par la côte, pour l'île percée qui pousse avant de creuser). `sculpter` accepte des `ajouts`
(les îlots de la comète, posés d'office avant de relier). Les 160 masques existants (campagne, îles dessinées, infinie, jardin,
étirées, dix formes sur sept îles) sont **identiques au bit près** avant et après (script d'empreinte, `cmp`).

**Le lac reste la mer.** `enclosedHoles` ne comble qu'une case cernée **une par une** (six voisines dans l'île) ; un lac de deux
cases ou plus garde toujours une voisine d'eau et n'est jamais comblé. Le grand lac (7 à 9 cases), les dix lacs de l'île percée
(2 cases chacun), la mer intérieure de l'ourlet et de l'atoll sont donc de vraies **mers intérieures** : elles ferment les régions
et reçoivent des embouchures, comme le lac de l'anneau. Aucune ne devient une mare posée au départ. Le test le vérifie
(`lac : le lac n'est pas une mare`).

Croquis sur l'île 11 (Le Val Bâti, 66 cases), comme au § 2. `+` marque un **gué** : une case dont le retrait coupe l'île en deux
morceaux d'au moins cinq cases.

### Les dix douces

| Forme | Ce qu'elle creuse | Où |
|---|---|---|
| `baie` — La baie | Une ellipse posée sur le bord (0,42 R de large, 0,85 de la demi-hauteur de profond), du nord ou du sud, décalée d'un cinquième du rayon ; ouverte sur le large par un chenal | 13 |
| `fjord` — Le fjord | Un bras d'une rangée qui entre d'un côté et dépasse le centre d'un dixième du rayon ; deux rangées à l'entrée, une seule au fond | 19 |
| `lac` — Le grand lac | Sept cases (neuf à partir de 90) au plus profond de l'île, loin des départs (`coeur`), qui restent la mer | 25 |
| `anses` — La côte découpée | Sur un flanc (est ou ouest), le bord recule de 0,34 R dans trois anses entre des caps (un cosinus à six lobes sur l'angle) | 22 |
| `presquile` — La presqu'île | Une bande d'une case au tiers de la largeur, sauf trois cases au milieu de la hauteur : le col ; le lobe fait un tiers de l'île | 11 |
| `delta` — Le delta | Un V de mer qui entre par le sud ou le nord depuis le centre, large de 0,3 + 0,45 case par rangée | 24 |
| `haricot` — Le haricot | L'île étirée à 1,35, creusée d'une baie large et peu profonde (0,4 R au plus creux, ±70°) sur un flanc | 26 |
| `goutte` — La goutte | L'île étirée à 1,3 ; la demi-largeur passe de 0,34 R au bout fin à R aux trois quarts de la hauteur, le bas reste rond | 4 |
| `double` — L'île double | Deux baies rondes (0,4 R) qui se font face au nord et au sud, à 42 % de la largeur : deux lobes inégaux, un col large | 27 |
| `lagune` — La lagune | Sept cases à la moitié du rayon dans une des six directions de la grille, et une passe d'une case le long de cette direction jusqu'au large | 7 |

### Les dix étranges

| Forme | Ce qu'elle fait |
|---|---|
| `spirale` — La spirale | Décrite avant la croissance : un cœur de rayon 1,6 et un bras de 2,9 de large qui s'enroule (pas de 4, une rangée de mer entre les tours) |
| `labyrinthe` — Le labyrinthe | Étirée à 1,4 ; une rangée de mer sur trois, qui entre tour à tour de l'ouest et de l'est jusqu'à 0,3 R au-delà du centre : la terre est un couloir de deux rangées replié |
| `jumelles` — Les jumelles | La moitié nord (au-dessus de tous les départs), ramenée à la moitié du compte en ôtant les cases les plus loin de son centre, puis son reflet par la rangée du détroit ; `relier` pose le gué ; rien ne repousse |
| `serrure` — Le trou de serrure | Le lac de sept cases au plus profond, et une fente d'une case (une bande en zigzag) qui descend jusqu'à la mer du sud |
| `comete` — La comète | Une tête ronde (le disque autour du centre qui garde n − 8 k cases) et k îlots de sept cases (3, ou 4 à partir de 90) en colonne, une rangée de mer et un gué d'une case entre deux ; la queue part du côté sans départ |
| `vrille` — La vrille | Décrite avant la croissance : une bande de quatre cases qui suit une sinusoïde d'amplitude 2,4 et de période 14 rangées ; la phase choisie garde le plus de départs dans la bande |
| `percee` — L'île aux dix lacs | L'île pousse de vingt cases, puis dix lacs de deux cases sont creusés à l'intérieur, du centre vers le bord, jamais voisins, jamais sur la côte ; `rogner` rend le compte par la côte |
| `ourlet` — L'ourlet | Une couronne de deux cases (trois à partir de 70, quatre de 105) autour d'une mer intérieure ; le rayon vient de l'aire (une case vaut 0,866) ; le départ est déplacé sur la couronne, à 3,5 cases du centre |
| `peigne` — Le peigne | Décrite avant la croissance : une barre de deux à trois cases à l'ouest et des dents de deux rangées sur trois, longues de 4,5 à 6,5 cases |
| `atoll` — L'atoll | La même couronne, et un îlot de sept cases au centre avec le hameau et la roche ; `relier` pose le gué |

### Croquis des douces

#### La baie — `baie`
*Ici, on apprend à bâtir autour d’une baie : une seule échancrure, profonde, et toutes les rivières y descendent.*
67 cases, 10 × 10.
```
 . # # # # # . . .
. # # # # # # # .
 # # # # # # # # .
# # # # # # # # #
 # # # # # R # # #
# # # # H # # # #
 # # # . # # # # .
# # # R . . . # .
 # # # . . . . . .
. # # # . . . . .
 . # # . . . . . .
```

#### Le fjord — `fjord`
*Ici, on apprend à vivre des deux rives : un bras de mer entre au cœur de l’île, et chaque rive a sa côte.*
68 cases, 10 × 10.
```
 . . # # . . . . .
. # # # # # # # .
 . # # # # # # # .
. . . . . # # # #
 . . . # # R # # #
# # # # H # # # #
 # # # ~ # # # # .
. # # R # # # # .
 # # # # # # # . .
. # # # # # # . .
 . # # # # # . . .
```

#### Le grand lac — `lac`
*Ici, on apprend à tourner autour d’un lac : une seconde mer au milieu, et des embouchures des deux côtés.*
68 cases, 10 × 9.
```
. # # # # # # # .
 # # # . . # # # .
# # # . . . # # #
 # # # . . R # # #
# # # # H # # # #
 # # # ~ # # # # .
. # # R # # # # .
 # # # # # # # . .
. # # # # # # . .
 . # # # # # . . .
```

#### La côte découpée — `anses`
*Ici, on apprend à finir contre la mer : trois anses ferment les régions du bord, les caps reçoivent les rivières.*
68 cases, 9 × 10.
```
 . # # # . . . .
. # # # # # . . .
 # # # # # . . .
# # # # # # # # #
 # # # # # R # #
# # # # H # # # .
 # # # ~ # # # #
. # # R # # # # .
 # # # # # . . .
. # # # # # . . .
 . # # # # # . .
```

#### La presqu’île — `presquile`
*Ici, on apprend à tenir un col : la presqu’île est un plan à part, et trois cases la relient.*
68 cases, 10 × 10.
```
 . . . # # # . . .
. . . # # # # # .
 . # . # # # # # .
# # . # # # # # #
 # # # # # R # # #
# # # # H # # # #
 # # # ~ # # # # .
. # . R # # # # .
 # # . # # # # . .
. # . # # # # . .
 . . . # # # . . .
```

#### Le delta — `delta`
*Ici, on apprend à choisir une langue de terre : deux pointes, une mer entre elles, et rien ne passe de l’une à l’autre.*
67 cases, 10 × 10.
```
. . # # # # # . . .
 . # # # # # # # .
. # # # # # # # # .
 # # # # # # # # #
. # # # # # R # # #
 # # # # H # # # #
# # # # . . # # # .
 # # # R . . # # .
. # # # . . . # . .
 . # # . . . . . .
. . # . . . . . . .
```

#### Le haricot — `haricot`
*Ici, on apprend à jouer en longueur : deux lobes, un creux entre eux, et la mer qui suit la courbe.*
67 cases, 8 × 11.
```
 . . . # # . .
. . . # # # .
 . # # # # # .
. # # # # # #
 # # # # # # #
# # # # # # R
 # # # # H # #
. # # # # # #
 . # # R ~ # .
. # # # # # #
 . # # # # # .
. . # # # # .
 . . # # # # .
```

#### La goutte — `goutte`
*Ici, on apprend à finir une pointe : le bout fin se ferme vite, le bout large prend son temps.*
67 cases, 9 × 11.
```
 . . # # # . . .
. . . # # # . .
 . . # # # # . .
. . # # # # # .
 . # # # # R . .
. # # # H # # .
 # # # ~ # # # .
# # # R # # # #
 # # # # # # # #
. # # # # # # #
 . # # # # # # .
. . # # # # # .
```

#### L’île double — `double`
*Ici, on apprend à partager : deux lobes inégaux, un col large entre deux baies, et chaque lobe a ses plans.*
68 cases, 11 × 8.
```
. # # . . . . # # . .
 # # # . . . # # # .
# # # # # # # # # # .
 # # # # # # R # # #
. # # # # H # # # # #
 # # # # ~ # # # # #
. # # # R # # # # # .
 . # # . . . # # # .
. # # . . . . # # . .
```

#### La lagune — `lagune`
*Ici, on apprend à garder une passe : la lagune est une mer calme, et une seule case la relie au large.*
68 cases, 10 × 10.
```
 . . . # # # . . .
. . . # # # # # .
 . # . . # # # # .
# # . . . # # # #
 # # . . # R # # #
# # # # H # # # #
 # # # ~ # # # # .
. # # R # # # # .
 # # # # # # # . .
. # # # # # # . .
 . # # # # # . . .
```

### Croquis des étranges

#### La spirale — `spirale`
*Ici, on apprend à suivre un seul chemin : l’île s’enroule, et chaque région n’a qu’un sens pour grandir.*
66 cases, 9 × 10.
```
 . . . # # . . .
. . # # # # # # .
 # # # # # # # #
# # # # . . . # #
 # # # . # # . .
# # # . # # R # .
 # # # # H # # .
# # # # # # # # .
 # # # R # # # .
. # # # # # # . .
 . . # # # # . .
```

#### Le labyrinthe — `labyrinthe`
*Ici, on apprend à serpenter jusqu’au bout : les bras de mer se croisent, et l’île n’est qu’un couloir replié.*
66 cases, 9 × 11.
```
. . . . . # # . .
 . . . . . # # .
. # # # # # # # .
 # # # # # # # #
# # # . . . . . .
 # # # # # R # #
. # # # H # # # #
 . . . . . # # #
. # # R # # # # .
 # # # # # # # .
. # # . . . . . .
 . # # # # # . .
. . # # # # . . .
```

#### Les jumelles — `jumelles`
*Ici, on apprend à jouer deux fois la même île : deux jumelles en miroir, un gué, et deux plans qui se répondent.*
65 cases, 7 × 13, 1 gué.
```
 . . # # . .
. # # # # #
 # # # # # .
# # # # R #
 # # H # # #
. # # # # #
 . R # # . .
. . + . . .
 . # # # . .
. # # # # #
 # # # # # #
# # # # # #
 # # # # # .
. # # # # #
 . . # # . .
```

#### Le trou de serrure — `serrure`
*Ici, on apprend à contourner : le lac et sa fente coupent le sud en deux, tout passe par le nord.*
66 cases, 10 × 10.
```
 . # # # # # . . .
. # # # # # # # .
 # # # . . # # # .
# # # . . . # # #
 # # # . . R # # #
# # # # H . # # #
 # # # # # . # # .
. # # R # . # # .
 # # # # # . # . .
. # # # # . # . .
 . # # # . . . . .
```

#### La comète — `comete`
*Ici, on apprend à finir petit et loin : la tête est une île, chaque îlot de la queue un plan de sept cases.*
66 cases, 8 × 17, 8 gués.
```
. . # # # # .
 # # # # # # .
# # # # # # #
 # # # # R # #
# # # H # # #
 # # # # # # .
. # R # # # .
 . . + . . . .
. . . + # . .
 . . # # # . .
. . . + # . .
 . . + . . . .
. . . + # . .
 . . # # # . .
. . . + # . .
 . . + . . . .
. . . + # . .
 . . # # # . .
. . . # # . .
```

#### La vrille — `vrille`
*Ici, on apprend à ne jamais couper court : l’île ondule, et le chemin d’un bout à l’autre fait toute la courbe.*
66 cases, 9 × 15.
```
. . . # # # # . .
 . . . # # # # .
. . . . # # # # .
 . . . . # # # #
. . . . . # # # #
 . . . . # # # #
. . . . # # # # .
 . . # # # R . .
. # # # H . . . .
 # # # # . . . .
# # # R . . . . .
 # # # # . . . .
. # # # # . . . .
 . # # # # . . .
. . # # # # # . .
 . . . # # # . .
. . . . # # . . .
```

#### L’île aux dix lacs — `percee`
*Ici, on apprend à composer avec dix mers : chaque lac ferme ce qui le touche et reçoit une rivière.*
66 cases, 10 × 10.
```
. . # # # # # . . .
 . # # # . . # # .
. # # . # # # # # .
 # # . # # . . # #
# . # # . # R # . #
 # . # . H # # . #
# # # # # . . # # .
 # . . R # # # # #
. # # # # . . # # .
 . # . . # # # # .
. . # # # # # . . .
```

#### L’ourlet — `ourlet`
*Ici, on apprend à n’avoir que la côte : deux mers de chaque côté, et pas une case qui ne les touche.*
66 cases, 12 × 11.
```
. . # # # # # # . . . .
 . # # # # # # # # . .
. # # # . . . . # # . .
 # # # . . . . . H # .
# # # . . . . . . # # .
 # # . . . . . . . # #
. # # . . . . . . # # #
 . # R . . . . . . # #
. . # # . . . . # # # .
 . # # # # # # # # . .
. . . # # # # # # . . .
 . . . # # # # # . . .
```

#### Le peigne — `peigne`
*Ici, on apprend à finir dent par dent : chaque dent est un couloir fermé par la mer, la barre les relie.*
66 cases, 7 × 12.
```
 # # # . . .
# # # # # #
 # # . . . .
# # # # # #
 # # # # # #
# # # . . .
 # # # # R #
# # # H # #
 # # . . . .
# # R # # #
 # # # # # #
# # # . . .
 # # # # # #
. # # # # #
```

#### L’atoll — `atoll`
*Ici, on apprend à partir d’un îlot : sept cases au milieu d’une mer calme, un gué, et la couronne tout autour.*
66 cases, 11 × 11, 2 gués.
```
 . # # # # # # . . .
. # # # # # # # # . .
 # # # . . + . # # .
# # # . . + . . . # .
 # # . . # R . . # #
# # . . # H # . . # #
 # # . . # # . . # #
. # . . . . . . . # .
 . # # . . . . # # .
. # # # # # # # # . .
 . . # # # # # # . .
. . . . . # # . . . .
```

### Mesures

Robot fort, **six hasards** par forme (trois ne suffisaient pas : d'un tirage à l'autre, ±10 %), graine de l'île, médianes,
sur trois îles nues de la campagne : 7 (L'Île des Nuages, 60 cases), 14 (Le Verger de Pierre, 78), 24 (La Brume du Nord, 100 —
ses quatre marais de départ restent). L'écart se lit contre l'île ronde de même graine ; pour l'anneau, l'ourlet et l'atoll,
contre la ronde **au même départ déplacé** (`ronde@forme`). Les trente formes sont mesurées ensemble, pour une seule échelle.

| île | forme | cases | poses | score | écart % | pts/pose | fermetures | faune % | grande région | rivières | embouchures | sentiers | harmonie | vœux | morceaux |
| 7 | ronde | 60 | 54 | 465 | 0 | 8.5 | 26 | 35 | 8 | 1 | 0 | 5 | 2 | 0.33 | 1 |
| 7 | ronde@anneau | 60 | 56 | 458 | 0 | 8.2 | 24 | 31 | 9.5 | 1 | 0 | 3 | 2 | 0.67 | 1 |
| 7 | ronde@ourlet | 60 | 55.5 | 435 | 0 | 7.8 | 27 | 36 | 8 | 1 | 0 | 1 | 2 | 0.50 | 1 |
| 7 | ronde@atoll | 60 | 55 | 444 | 0 | 8.1 | 25 | 34 | 7.5 | 1 | 1 | 4.5 | 2 | 0.33 | 1 |
| 7 | archipel | 60 | 55 | 405 | -13 | 7.4 | 33 | 34 | 5 | 1 | 1 | 2.5 | 2 | 0.67 | 1 |
| 7 | chapelet | 60 | 55 | 418 | -10 | 7.6 | 33 | 32 | 5.5 | 1 | 1 | 2 | 2 | 0.67 | 1 |
| 7 | anneau | 60 | 55.5 | 366 | -20 | 6.6 | 32.5 | 38 | 5 | 2 | 2 | 1 | 2 | 0.50 | 1 |
| 7 | croissant | 60 | 54 | 422 | -9 | 7.8 | 27.5 | 36 | 6 | 2 | 1 | 5 | 1.5 | 0.33 | 1 |
| 7 | baies | 60 | 55 | 431 | -7 | 7.8 | 32 | 36 | 5.5 | 1 | 1 | 2.5 | 2 | 0.67 | 1 |
| 7 | cote | 60 | 55 | 449 | -3 | 8.2 | 27 | 34 | 6.5 | 1.5 | 0.5 | 4.5 | 2 | 0.67 | 1 |
| 7 | lagunes | 60 | 51 | 450 | -3 | 8.8 | 33 | 28 | 6.5 | 2.5 | 1 | 5 | 2 | 0.67 | 1 |
| 7 | etoile | 60 | 55 | 474 | 2 | 8.6 | 30 | 34 | 6 | 1.5 | 0 | 5.5 | 2 | 0.67 | 1 |
| 7 | crete | 60 | 50 | 381 | -18 | 7.6 | 25 | 25 | 10 | 1.5 | 1 | 6 | 2 | 0.67 | 1 |
| 7 | plateau | 60 | 48 | 410 | -12 | 8.5 | 28.5 | 32 | 7 | 1 | 0 | 1.5 | 2 | 0.67 | 1 |
| 7 | cuvette | 60 | 46.5 | 396 | -15 | 8.5 | 24.5 | 32 | 6 | 2 | 1 | 4.5 | 1 | 0.50 | 1 |
| 7 | baie | 61 | 54.5 | 421 | -10 | 7.7 | 27.5 | 35 | 6 | 1.5 | 0.5 | 2.5 | 2 | 0.50 | 1 |
| 7 | fjord | 60 | 55 | 434 | -7 | 7.9 | 31.5 | 35 | 5 | 1.5 | 1.5 | 3 | 2 | 0.67 | 1 |
| 7 | lac | 60 | 55 | 437 | -6 | 7.9 | 30 | 35 | 5.5 | 1 | 1 | 3 | 2 | 0.67 | 1 |
| 7 | anses | 61 | 54 | 417 | -10 | 7.7 | 29 | 34 | 7.5 | 1 | 0 | 4 | 2 | 0.33 | 1 |
| 7 | presquile | 61 | 55 | 436 | -6 | 7.9 | 31 | 36 | 5 | 2 | 1.5 | 2.5 | 1.5 | 0.67 | 1 |
| 7 | delta | 61 | 55 | 460 | -1 | 8.4 | 30 | 32 | 6.5 | 1.5 | 1 | 5.5 | 2 | 0.67 | 1 |
| 7 | haricot | 60 | 55 | 481 | 3 | 8.8 | 28 | 35 | 7 | 1 | 0.5 | 5.5 | 2 | 0.67 | 1 |
| 7 | goutte | 60 | 55 | 436 | -6 | 8.0 | 29 | 36 | 6.5 | 2 | 1 | 3 | 1.5 | 0.67 | 1 |
| 7 | double | 61 | 54.5 | 427 | -8 | 7.8 | 27 | 34 | 6.5 | 1.5 | 1 | 4.5 | 1.5 | 0.50 | 1 |
| 7 | lagune | 60 | 55 | 407 | -13 | 7.4 | 28.5 | 34 | 6 | 1 | 1 | 2.5 | 2 | 0.67 | 1 |
| 7 | spirale | 60 | 55 | 419 | -10 | 7.6 | 35 | 39 | 5 | 1.5 | 1.5 | 4 | 2 | 0.67 | 1 |
| 7 | labyrinthe | 60 | 55 | 377 | -19 | 6.9 | 32 | 32 | 5.5 | 1 | 1 | 2 | 2 | 0.67 | 1 |
| 7 | jumelles | 59 | 55 | 421 | -9 | 7.7 | 31.5 | 37 | 4 | 1 | 1 | 2.5 | 2 | 0.67 | 1 |
| 7 | serrure | 60 | 55 | 404 | -13 | 7.3 | 33 | 33 | 5 | 1 | 1 | 2.5 | 2 | 0.67 | 1 |
| 7 | comete | 60 | 55 | 416 | -11 | 7.6 | 34.5 | 36 | 4.5 | 1 | 1 | 3.5 | 2 | 0.67 | 1 |
| 7 | vrille | 60 | 54 | 343 | -26 | 6.4 | 32.5 | 33 | 5.5 | 2 | 1.5 | 1 | 2 | 0.33 | 1 |
| 7 | percee | 60 | 55 | 368 | -21 | 6.7 | 35 | 34 | 4.5 | 1.5 | 1.5 | 1 | 2 | 0.67 | 1 |
| 7 | ourlet | 60 | 55 | 350 | -20 | 6.4 | 34 | 37 | 3.5 | 0.5 | 0.5 | 0 | 2 | 0.33 | 1 |
| 7 | peigne | 60 | 55 | 392 | -16 | 7.1 | 33 | 32 | 5 | 1.5 | 1 | 4 | 2 | 0.67 | 1 |
| 7 | atoll | 60 | 55 | 327 | -26 | 5.9 | 38.5 | 35 | 3.5 | 1 | 1 | 1 | 2 | 0.33 | 1 |
| 14 | ronde | 78 | 71 | 838 | 0 | 11.8 | 36 | 15 | 13.5 | 1 | 0 | 0 | 2 | 0.67 | 1 |
| 14 | ronde@anneau | 78 | 73 | 928 | 0 | 12.8 | 43.5 | 16 | 14.5 | 1 | 0 | 0.5 | 3 | 1.00 | 1 |
| 14 | ronde@ourlet | 78 | 73 | 883 | 0 | 12.2 | 39 | 16 | 13.5 | 1 | 0 | 0 | 2.5 | 1.00 | 1 |
| 14 | ronde@atoll | 78 | 72 | 853 | 0 | 11.8 | 39.5 | 17 | 12.5 | 0.5 | 0 | 0 | 3 | 0.67 | 1 |
| 14 | archipel | 79 | 72 | 933 | 11 | 13.0 | 56.5 | 16 | 9 | 0.5 | 0.5 | 1 | 2 | 1.00 | 1 |
| 14 | chapelet | 79 | 72 | 923 | 10 | 12.8 | 50.5 | 15 | 9.5 | 2 | 0 | 0 | 2 | 1.00 | 1 |
| 14 | anneau | 78 | 73 | 885 | -5 | 12.1 | 50.5 | 14 | 9.5 | 1 | 0.5 | 0 | 3 | 1.00 | 1 |
| 14 | croissant | 79 | 71.5 | 812 | -3 | 11.3 | 41 | 15 | 12.5 | 1 | 0.5 | 1 | 3 | 0.83 | 1 |
| 14 | baies | 79 | 72 | 906 | 8 | 12.6 | 51.5 | 14 | 9.5 | 1.5 | 0 | 0.5 | 2.5 | 1.00 | 1 |
| 14 | cote | 78 | 72 | 918 | 9 | 12.8 | 46 | 15 | 11 | 1.5 | 0 | 0 | 3 | 1.00 | 1 |
| 14 | lagunes | 78 | 67 | 932 | 11 | 13.9 | 47.5 | 15 | 18 | 1 | 0 | 0 | 2 | 1.00 | 1 |
| 14 | etoile | 78 | 71.5 | 896 | 7 | 12.5 | 44.5 | 14 | 14.5 | 0 | 0 | 0 | 3 | 0.83 | 1 |
| 14 | crete | 78 | 64 | 908 | 8 | 14.2 | 42.5 | 15 | 14.5 | 0 | 0 | 0 | 3 | 1.00 | 1 |
| 14 | plateau | 78 | 64 | 812 | -3 | 12.7 | 38.5 | 14 | 11.5 | 0 | 0 | 0 | 3 | 0.67 | 1 |
| 14 | cuvette | 78 | 61 | 747 | -11 | 12.1 | 37.5 | 12 | 11.5 | 0 | 0 | 0 | 3 | 0.67 | 1 |
| 14 | baie | 78 | 72 | 933 | 11 | 13.0 | 44 | 16 | 13 | 1 | 0 | 0.5 | 3 | 1.00 | 1 |
| 14 | fjord | 79 | 72 | 935 | 12 | 13.0 | 46.5 | 13 | 14 | 0 | 0 | 0.5 | 2.5 | 1.00 | 1 |
| 14 | lac | 78 | 72 | 929 | 11 | 12.9 | 44.5 | 16 | 14 | 1 | 0 | 1 | 2 | 1.00 | 1 |
| 14 | anses | 79 | 72 | 955 | 14 | 13.3 | 40.5 | 16 | 13 | 1 | 0 | 0 | 3 | 1.00 | 1 |
| 14 | presquile | 79 | 71 | 855 | 2 | 12.0 | 46.5 | 13 | 13 | 2 | 0 | 0 | 3 | 0.67 | 1 |
| 14 | delta | 78 | 72 | 948 | 13 | 13.2 | 45.5 | 18 | 11 | 1 | 0 | 0 | 3 | 1.00 | 1 |
| 14 | haricot | 78 | 71 | 837 | 0 | 11.8 | 42.5 | 14 | 12.5 | 0.5 | 0 | 0 | 3 | 0.67 | 1 |
| 14 | goutte | 78 | 71.5 | 878 | 5 | 12.3 | 41.5 | 13 | 12.5 | 1 | 0 | 0 | 3 | 0.83 | 1 |
| 14 | double | 78 | 71.5 | 876 | 4 | 12.2 | 42.5 | 16 | 13.5 | 0.5 | 0 | 0 | 3 | 0.83 | 1 |
| 14 | lagune | 79 | 71.5 | 898 | 7 | 12.6 | 44 | 16 | 15.5 | 1 | 0 | 0.5 | 3 | 0.83 | 1 |
| 14 | spirale | 78 | 72 | 921 | 10 | 12.8 | 56 | 15 | 6.5 | 2 | 1 | 1 | 3 | 1.00 | 1 |
| 14 | labyrinthe | 78 | 72 | 871 | 4 | 12.1 | 51.5 | 16 | 9.5 | 2 | 0.5 | 1 | 2 | 1.00 | 1 |
| 14 | jumelles | 77 | 71.5 | 900 | 7 | 12.6 | 49 | 16 | 8.5 | 2 | 0 | 0 | 3 | 0.83 | 1 |
| 14 | serrure | 78 | 72 | 981 | 17 | 13.6 | 47.5 | 16 | 15 | 1 | 0 | 1.5 | 2.5 | 1.00 | 1 |
| 14 | comete | 78 | 71.5 | 861 | 3 | 12.0 | 50 | 13 | 10.5 | 1 | 0 | 0 | 3 | 0.83 | 1 |
| 14 | vrille | 78 | 72 | 882 | 5 | 12.3 | 48 | 13 | 13.5 | 1 | 0 | 0 | 2 | 1.00 | 1 |
| 14 | percee | 78 | 72 | 837 | 0 | 11.6 | 55 | 12 | 11.5 | 1 | 0.5 | 0.5 | 2.5 | 1.00 | 1 |
| 14 | ourlet | 78 | 73 | 894 | 1 | 12.2 | 45.5 | 16 | 7.5 | 1.5 | 1 | 1 | 3 | 1.00 | 1 |
| 14 | peigne | 78 | 71 | 777 | -7 | 10.9 | 48 | 14 | 11.5 | 1 | 0 | 0 | 3 | 0.67 | 1 |
| 14 | atoll | 78 | 73 | 860 | 1 | 11.8 | 53.5 | 13 | 7 | 1.5 | 1 | 1 | 3 | 1.00 | 1 |
| 24 | ronde | 100 | 84 | 1203 | 0 | 14.3 | 45 | 28 | 13 | 2.5 | 0.5 | 0 | 2 | 0.50 | 1 |
| 24 | ronde@anneau | 100 | 91 | 1375 | 0 | 15.1 | 43 | 29 | 16.5 | 1.5 | 0 | 0 | 2.5 | 0.75 | 1 |
| 24 | ronde@ourlet | 100 | 90.5 | 1305 | 0 | 14.4 | 48.5 | 26 | 12.5 | 2 | 0 | 0 | 2.5 | 0.63 | 1 |
| 24 | ronde@atoll | 100 | 91 | 1367 | 0 | 15.1 | 44.5 | 30 | 16 | 1.5 | 0 | 0 | 2 | 0.75 | 1 |
| 24 | archipel | 102 | 85 | 1230 | 2 | 14.4 | 46 | 29 | 11.5 | 2 | 0.5 | 1 | 2.5 | 0.75 | 1 |
| 24 | chapelet | 102 | 85 | 1194 | -1 | 14.0 | 47.5 | 29 | 11.5 | 2.5 | 1 | 0 | 2.5 | 0.75 | 1 |
| 24 | anneau | 101 | 90 | 1272 | -7 | 14.0 | 46.5 | 26 | 11.5 | 2 | 0.5 | 0 | 2.5 | 0.50 | 1 |
| 24 | croissant | 101 | 84.5 | 1107 | -8 | 13.2 | 42 | 25 | 15.5 | 1.5 | 0 | 0 | 2 | 0.63 | 1 |
| 24 | baies | 102 | 84.5 | 1177 | -2 | 13.9 | 45.5 | 26 | 15.5 | 2.5 | 0.5 | 0.5 | 3 | 0.63 | 1 |
| 24 | cote | 100 | 84.5 | 1180 | -2 | 13.9 | 42 | 28 | 14.5 | 1.5 | 0 | 0 | 3 | 0.63 | 1 |
| 24 | lagunes | 100 | 81 | 1436 | 19 | 17.7 | 55 | 27 | 14 | 2.5 | 0.5 | 0 | 3 | 0.75 | 1 |
| 24 | etoile | 101 | 84.5 | 1171 | -3 | 13.9 | 47.5 | 28 | 10.5 | 2.5 | 0 | 0 | 3 | 0.63 | 1 |
| 24 | crete | 100 | 77.5 | 1154 | -4 | 14.9 | 37 | 22 | 21 | 1 | 0.5 | 0.5 | 1.5 | 0.88 | 1 |
| 24 | plateau | 100 | 78 | 1070 | -11 | 13.9 | 43.5 | 26 | 10.5 | 1.5 | 1 | 0 | 3 | 0.75 | 1 |
| 24 | cuvette | 100 | 74.5 | 1067 | -11 | 14.3 | 45 | 25 | 11 | 2.5 | 1 | 0 | 2.5 | 0.63 | 1 |
| 24 | baie | 102 | 85 | 1178 | -2 | 13.9 | 47 | 26 | 15.5 | 2.5 | 0 | 0 | 3 | 0.75 | 1 |
| 24 | fjord | 102 | 85 | 1186 | -1 | 14.0 | 47.5 | 28 | 11.5 | 1.5 | 0 | 0 | 2.5 | 0.75 | 1 |
| 24 | lac | 101 | 85 | 1159 | -4 | 13.7 | 48 | 28 | 13 | 2 | 1 | 1 | 2.5 | 0.75 | 1 |
| 24 | anses | 102 | 85 | 1224 | 2 | 14.5 | 45 | 29 | 11.5 | 2 | 0.5 | 0 | 3 | 0.75 | 1 |
| 24 | presquile | 102 | 84.5 | 1159 | -4 | 13.8 | 49 | 28 | 10 | 1.5 | 0 | 0 | 2.5 | 0.63 | 1 |
| 24 | delta | 102 | 85 | 1184 | -2 | 13.9 | 46 | 27 | 14 | 2 | 0 | 0 | 2.5 | 0.75 | 1 |
| 24 | haricot | 102 | 85 | 1149 | -4 | 13.4 | 43.5 | 27 | 12.5 | 2 | 0.5 | 0.5 | 2.5 | 0.75 | 1 |
| 24 | goutte | 101 | 85 | 1143 | -5 | 13.4 | 39.5 | 26 | 14 | 2 | 0.5 | 0 | 2 | 0.75 | 1 |
| 24 | double | 102 | 84.5 | 1139 | -5 | 13.6 | 47 | 28 | 12.5 | 2 | 0 | 0 | 2 | 0.63 | 1 |
| 24 | lagune | 102 | 84.5 | 1120 | -7 | 13.3 | 49 | 26 | 14 | 2.5 | 1 | 0 | 2.5 | 0.63 | 1 |
| 24 | spirale | 101 | 84.5 | 1062 | -12 | 12.6 | 51.5 | 27 | 9 | 1.5 | 0.5 | 0 | 2 | 0.63 | 1 |
| 24 | labyrinthe | 100 | 85 | 1154 | -4 | 13.7 | 55.5 | 28 | 9.5 | 1 | 1 | 0 | 3 | 0.75 | 1 |
| 24 | jumelles | 99 | 83.5 | 1102 | -8 | 13.1 | 49.5 | 29 | 8 | 2.5 | 0.5 | 0 | 3 | 0.38 | 1 |
| 24 | serrure | 100 | 83.5 | 1057 | -12 | 12.7 | 47.5 | 26 | 13 | 3 | 2 | 0 | 3 | 0.38 | 1 |
| 24 | comete | 100 | 84 | 1122 | -7 | 13.4 | 54.5 | 29 | 9.5 | 2 | 0.5 | 0 | 3 | 0.50 | 1 |
| 24 | vrille | 102 | 84 | 1036 | -14 | 12.3 | 49 | 28 | 8.5 | 1.5 | 1 | 0 | 3 | 0.50 | 1 |
| 24 | percee | 100 | 83.5 | 1103 | -8 | 13.1 | 55.5 | 34 | 7.5 | 1.5 | 1.5 | 0 | 3 | 0.38 | 1 |
| 24 | ourlet | 100 | 90 | 1214 | -7 | 13.5 | 51.5 | 27 | 11 | 2 | 1 | 0.5 | 2 | 0.50 | 1 |
| 24 | peigne | 101 | 84 | 1085 | -10 | 13.0 | 56.5 | 29 | 7 | 2 | 0.5 | 0.5 | 3 | 0.50 | 1 |
| 24 | atoll | 100 | 89.5 | 1119 | -18 | 12.5 | 60 | 32 | 7.5 | 1 | 1 | 0 | 2.5 | 0.38 | 1 |
| archipel | construite | -13 | +11 | +2 | 0.0 | aucune | à mesurer ✗ |
| chapelet | construite | -10 | +10 | -1 | -0.3 | aucune | à mesurer ✗ |
| anneau | construite | -20 | -5 | -7 | -10.7 | légère | à mesurer ✗ |
| croissant | douce | -9 | -3 | -8 | -6.7 | légère | à mesurer ✗ |
| baies | douce | -7 | +8 | -2 | -0.3 | aucune | à mesurer ✗ |
| cote | douce | -3 | +9 | -2 | +1.3 | aucune | à mesurer ✗ |
| lagunes | construite | -3 | +11 | +19 | +9.0 | légère | à mesurer ✗ |
| etoile | construite | +2 | +7 | -3 | +2.0 | aucune | à mesurer ✗ |
| crete | construite | -18 | +8 | -4 | -4.7 | aucune | à mesurer ✗ |
| plateau | construite | -12 | -3 | -11 | -8.7 | légère | à mesurer ✗ |
| cuvette | construite | -15 | -11 | -11 | -12.3 | légère | à mesurer ✗ |
| baie | douce | -10 | +11 | -2 | -0.3 | aucune | à mesurer ✗ |
| fjord | douce | -7 | +12 | -1 | +1.3 | aucune | à mesurer ✗ |
| lac | douce | -6 | +11 | -4 | +0.3 | aucune | à mesurer ✗ |

### Difficulté

`difficulte` est la **moyenne** des trois écarts : `aucune` à ±5 %, `légère` jusqu'à 15 %, `forte` au-delà. C'est ce que
`node tools/mesure_formes.js difficulte` recalcule et compare aux valeurs posées dans `FORMES`.

| forme | famille | île 7 (60) | île 14 (78) | île 24 (100) | moyenne | `difficulte` |
| --- | --- | --- | --- | --- | --- | --- |
| archipel | construite | -13 | +11 | +2 | 0.0 | aucune |
| chapelet | construite | -10 | +10 | -1 | -0.3 | aucune |
| anneau | construite | -20 | -5 | -7 | -10.7 | légère |
| croissant | douce | -9 | -3 | -8 | -6.7 | légère |
| baies | douce | -7 | +8 | -2 | -0.3 | aucune |
| cote | douce | -3 | +9 | -2 | +1.3 | aucune |
| lagunes | construite | -3 | +11 | +19 | +9.0 | légère |
| etoile | construite | +2 | +7 | -3 | +2.0 | aucune |
| crete | construite | -18 | +8 | -4 | -4.7 | aucune |
| plateau | construite | -12 | -3 | -11 | -8.7 | légère |
| cuvette | construite | -15 | -11 | -11 | -12.3 | légère |
| baie | douce | -10 | +11 | -2 | -0.3 | aucune |
| fjord | douce | -7 | +12 | -1 | +1.3 | aucune |
| lac | douce | -6 | +11 | -4 | +0.3 | aucune |
| anses | douce | -10 | +14 | +2 | +2.0 | aucune |
| presquile | douce | -6 | +2 | -4 | -2.7 | aucune |
| delta | douce | -1 | +13 | -2 | +3.3 | aucune |
| haricot | douce | +3 | 0 | -4 | -0.3 | aucune |
| goutte | douce | -6 | +5 | -5 | -2.0 | aucune |
| double | douce | -8 | +4 | -5 | -3.0 | aucune |
| lagune | douce | -13 | +7 | -7 | -4.3 | aucune |
| spirale | etrange | -10 | +10 | -12 | -4.0 | aucune |
| labyrinthe | etrange | -19 | +4 | -4 | -6.3 | légère |
| jumelles | etrange | -9 | +7 | -8 | -3.3 | aucune |
| serrure | etrange | -13 | +17 | -12 | -2.7 | aucune |
| comete | etrange | -11 | +3 | -7 | -5.0 | aucune |
| vrille | etrange | -26 | +5 | -14 | -11.7 | légère |
| percee | etrange | -21 | 0 | -8 | -9.7 | légère |
| ourlet | etrange | -20 | +1 | -7 | -8.7 | légère |
| peigne | etrange | -16 | -7 | -10 | -11.0 | légère |
| atoll | etrange | -26 | +1 | -18 | -14.3 | légère |

Ce qu'on lit :

- **Les dix douces ne coûtent rien** : moyenne entre −4,3 % (la lagune) et +3,3 % (le delta), toutes `aucune`. Par taille,
  l'étalement va de −13 à +14 % — mais c'est celui de la référence, pas des formes : sur l'île 14, la ronde est un tirage bas
  (la longue côte, inchangée depuis le § 3, y fait +9 % ; l'archipel +11 %), sur l'île 7 un tirage haut (tout y est négatif).
  Aucune douce n'est jamais sous −13 % sur une taille, et aucune n'est sous −7 % sur 100 cases.
- **La structure change pourtant** : sur l'île 7, le fjord fait 31,5 fermetures pour 26 et ramène la plus grande région de 8 à 5
  (le lac à 5,5, la presqu'île à 5) ; le fjord, le lac, la lagune et la presqu'île y donnent 1 à 1,5 rivière avec embouchure
  contre 0 ; la presqu'île ramène la plus grande région de 13 à 10 sur l'île 24, le delta de 13,5 à 11 sur l'île 14. Les douces
  changent le paysage, pas le score.
- **Les étranges sont jouables** : la pire moyenne est l'atoll (−14 %), le pire cas la vrille sur 60 cases (−26 %) ; rien
  n'approche les −40 % du piège. Quatre sont `aucune` (spirale, jumelles, serrure, comète), six `légère` (labyrinthe, vrille,
  percée, ourlet, peigne, atoll). Les couloirs (vrille, peigne, labyrinthe) coûtent sur 60 cases (−16 à −26 %) et presque plus
  rien sur 78 ; l'atoll fait 60 fermetures pour 45 sur l'île 24 et une plus grande région de 7,5 pour 13 — le plus tranché.
- **Les dix premières, remesurées à six hasards** : archipel, chapelet, étoile, crête `aucune` ; anneau, lagunes (une rente :
  +19 % sur 100 cases), plateau, cuvette, croissant `légère`. La crête à −18 % sur 60 cases et +8 % sur 78 illustre la même
  chose que plus haut : sur 60 cases, tout ce qui coupe coûte.

### Où iraient les douces dans la campagne

Parmi les îles générées qui n'ont pas encore de forme (4, 7, 10, 11, 13, 19, 22, 23, 24, 25, 26, 27, 29) :

| Forme | Île | Pourquoi là |
|---|---|---|
| **La goutte** | **4 — Le Hameau du Vœu** (50 cases, chapitre 2, la première île générée) | Une silhouette simple et jolie pour la première île qui n'est pas dessinée à la main ; le bout fin se ferme vite, ce que le vœu de lapin (3 prés) aime. Mesurée sur 50 cases dans le test (compte, tenue). |
| **La lagune** | **7 — L'Île des Nuages** (60, chapitre 3, vœu d'embouchure `c_mouth`) | La passe d'une case est une embouchure toute trouvée : une roche sur la rive, deux eaux, et la rivière touche la mer calme. |
| **La presqu'île** | **11 — Le Val Bâti** (66, chapitre 4, bâtir vient d'arriver) | Un plan à part, relié par trois cases : la presqu'île est le bon endroit pour bâtir un bourg sans qu'il se mêle au reste. |
| **La baie** | **13 — La Côte Ocre** (72, chapitre 5, chaud, vœu de canard) | La côte ocre a enfin une baie, avec du sable ×2,2 pour ses plages ; les trois eaux du canard tiennent au fond de la baie. |
| **Le fjord** | **19 — La Pinède Blanche** (82, chapitre 7, froid) | Un bras de mer dans une île froide, deux rives de forêt : la plus grande région tombe (le vœu de grande forêt `c_forest` devient un vrai choix de rive). |
| **La côte découpée** | **22 — La Côte des Sels** (90, chapitre 8, chaud, signature « Les dunes ») | Trois anses de sable et d'eau : la signature promet « des lagunes à faire », les anses les dessinent d'avance. |
| **Le delta** | **24 — La Brume du Nord** (100, chapitre 8, humide, signature « Le sud est un marais », vœu de rivière) | Le marais barre le sud, le delta entre par le nord (`sansDepart` l'y met : le sud est plein de départs) : deux langues de terre, une rivière par langue. |
| **Le grand lac** | **25 — La Grande Plaine** (104, chapitre 9, tempéré, vœu de lac `c_lake`) | Une plaine autour d'un lac de neuf cases qui reste la mer : les champs ouverts ont une rive, et le vœu de lac se joue à côté, pas dedans. |
| **Le haricot** | **26 — Le Bois Long** (120, chapitre 9, froid, signature « La forêt profonde ») | Le bois est enfin long : l'île étirée à 1,35 se creuse sur un flanc, la forêt suit la courbe. Elle tient en portrait (8 × 11 sur 66 cases). |
| **L'île double** | **27 — Le Grand Verger** (140, chapitre 9, chaud, « Le pays des vergers ») | Deux lobes inégaux, deux vergers ; le col large laisse passer les bourgs. |

Les îles 10, 23 et 29 restent rondes (ou prennent une forme construite : la crête sur 23 — Le Col Gelé — est déjà proposée au
§ 4). Après branchement : `node tools/calibrate.js 4 <île> --write` pour chaque île touchée, le compte de cases bougeant d'une
ou deux cases (`islandCells` suit la forme).

### Pour le mode « une île différente à chaque partie »

Les trente formes se tirent par famille : les douces et les construites `aucune` sont des tirages sûrs à toute taille ; les
`légère` valent mieux à partir de 78 cases (le tableau montre où elles coûtent : sur 60). L'ourlet et l'atoll veulent leur
`depart` (`FORMES[f].depart` remplace `def.start`) ; l'anneau aussi. Les formes à tuiles de départ (crête, plateau, cuvette)
passent par `departsDeForme`. Les formes étirées (`etire`) le disent elles-mêmes : rien à faire dans la définition.

### Ce que je n'ai pas pu faire

- **Tenir ±5 % par taille** : le bruit du robot est de ±10 % d'un tirage à l'autre, et la référence elle-même bouge d'autant
  d'une île à l'autre (île 14 basse, île 7 haute). Le critère tenu est la moyenne des trois tailles ; les écarts par taille
  sont dans le tableau, à lire avec cette réserve. Douze hasards resserreraient à ±5 %, au prix d'une mesure de vingt minutes.
- **Le rendu** : aucune des vingt formes n'a été dessinée en jeu (`tools/capture_partie.js` demande une définition branchée).
  Les bras d'une rangée (fjord au fond, fente de la serrure, passe de la lagune, bras du labyrinthe) et les gués d'une case
  (jumelles, comète, atoll) sont ce que le littoral n'a jamais rencontré — même réserve qu'au § 5.
- **La spirale sur 60 cases** n'est qu'un tour et demi : le bras de trois cases (à 2,4, le robot perdait 45 %) laisse peu de
  place pour s'enrouler. Elle se lit à partir de 78 cases.
- **L'ourlet au-delà de 105 cases** fait quatre d'épaisseur (trois y mettrait le départ dans le lac) : ce n'est plus « très fin ».
  Le mode, à 60-100 cases, n'y touche pas.
- **Les dix lacs** : dix à partir de 66 cases, neuf sur 60, six sur 50 (l'île pousse de vingt cases avant de creuser, mais
  l'intérieur d'une île de 70 cases ne loge pas dix paires espacées). Le test demande six.
