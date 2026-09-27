# Pistes : des formes d'îles qui changent la façon de jouer

*27 septembre 2026. Suite de l'étape 4 de la feuille Histoire (le passage étroit de l'île 8, la rivière à finir de
l'île 17). Rien n'est branché dans la campagne : le commanditaire choisit.*

Code : `FORMES`, `departsDeForme`, `composantes`, `relier` dans `src/data/islands.js` (option `forme` de `generateMask`,
que `Island` et `islandCells` transmettent depuis `def.forme`). Croquis et mesures : `node tools/mesure_formes.js croquis 11`
et `node tools/mesure_formes.js mesure 7,11,19 3`. Test : `node tests/formes.test.js`.

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
