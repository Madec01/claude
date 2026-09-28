# Feuille du Livre II — La Traversée

Décisions du commanditaire du 28 septembre, et ce qui a été mesuré avant de construire. C'est la spécification qui remplace
celle du 18 septembre (feuille de route, lot 7), écrite avant l'audit de simplification et bien plus large.

## Le principe

Le Livre I est un jeu de **voisinage**. Le Livre II ajoute **une seule idée neuve : relier.** La mer entre les îles se pose,
et une route de mer qui relie deux ports paie à chaque saison. Tout le reste sert cette idée ou part. Au plus cinq familles
nouvelles, aucune règle de plus que nécessaire.

## Les décisions

| # | Question | Décision |
|---|---|---|
| 1 | Nombre d'îles | **Quinze, en cinq chapitres de trois** (31 à 45), sur le schéma nouveauté / pratique / souvenir |
| 2 | La chaîne | **La chaîne de territoire**, Livre II seulement ; départ à **quatre** familles, paires **fortes** (+2) seulement |
| 3 | Les tuiles | **Port** et **Pinède** en vraies familles ; les autres arbres des packs en variantes de climat, sans règle |
| 4 | Les saisons | Les îles du Livre II n'ont que **trois saisons** ; relier une route ramène la quatrième — « pourquoi pas » : à essayer au prototype, tranché sur l'île 32 en la jouant |
| 5 | La musique | **Des morceaux libres** (CC0 d'abord, CC-BY sinon) : voir `docs/MUSIQUES_LIVRE_II.md` |

## Les règles (état du prototype, 28 septembre)

**L'archipel** (`src/data/archipel.js`). Deux îles aux formes naturelles (le générateur du Livre I, étiré), séparées par
un **détroit** de deux cases de large. Les cases du détroit sont dans le masque : on y pose, mais **seules les tuiles de mer**
s'y posent, et **aucune tuile de mer ne se pose ailleurs**. Tant qu'une case du détroit est vide, elle est la mer (bord de
mer des affinités, embouchure des rivières). Le détroit n'a jamais à être rempli : l'île finit quand la file est vide.
Une tuile de mer qui n'a plus de case libre est perdue sans pénalité, la suivante vient. Au départ, sur chaque rive, **un
port et un hameau**. Le nombre de cases de terre est celui d'une île du Livre I.

**Les familles** (`src/data/tiles.js`, `FAMILLES_LIVRE2`).
- **Mer** : neutre, porte les routes (mer·mer +1, mer·récif +1, mer·algues +1, mer·eau +1 « estuaire »).
- **Récif** : plage +2 « lagon », roche +2 « écueils », hameau −1 « naufrage », port −1.
- **Algues** : marais +2 « vasière », sable +1.
- **Port** (terre, bord d'eau) : mer +2 « quai », hameau +2 « ville portuaire », champ +1, forêt +1 ; port·port −1, marais −1.
- **Pinède** (terre) : sable +2, roche +2, forêt +1, prairie +1, mer +1 ; champ −1. Ne sèche pas l'été (à faire).
- La file d'un archipel : les familles de la côte, la pinède (7) et le port (4), plus **un quart de tuiles de mer** (mer 55 %,
  récif 25 %, algues 20 % de cette part) — `poidsArchipel`.

**Les routes** (`src/game/routes.js`, `computeRoutes`). Une route est un morceau de mer posée d'un seul tenant (mer, récif,
algues) ; elle relie les **ports** qu'elle touche. À chaque saison, elle paie **3 par port relié au-delà du premier**, plus
**1 par marchandise** — une marchandise par famille de terre différente (champ, forêt, verger, prairie, roche, marais,
colline, lande, pinède, sable) qui touche l'un de ses ports. Une route à un seul port ne paie rien.

**La chaîne de territoire** (`chaineTerritoire`). La plus longue file de tuiles voisines, **toutes de familles différentes**,
chaque maillon en **paire forte** (+2) avec le suivant ; une rare compte pour sa première famille. Elle paie à la saison
dès **quatre** familles : 4 → 2, 5 → 4, 6 → 7, 7 → 11, 8 et plus → 15. Le graphe des paires fortes permet sept à huit
maillons à qui les planifie (colline › roche › récif › sable › eau › marais › algues ; mer › port › hameau › verger ›
prairie ; sable › pinède › roche…).

**Ce qui se voit.** L'aperçu de pose porte `rente` : ce que la pose change aux routes et à la chaîne, par saison (le
robot le pèse sur les saisons qui restent). « Lire l'île » compte les routes et la chaîne dans la saison qui vient. Le bilan
a deux lignes de plus (« route », « chaîne »). *À faire : le fil doré de la chaîne et le tracé des routes dans la lecture.*

## Ce qui a été mesuré (28 septembre, robot fort, 6 archipels de 50 et 64 cases, 2 hasards)

| réglage de la chaîne | longueur sans la chercher | points par île | part mer + chaîne | verdict |
|---|---|---|---|---|
| toute bonne paire (+1), dès 4 | 9 à 14 familles | 52 à 75 | 19 à 29 % | une rente au plafond, aucune décision : **rejeté** |
| paires fortes (+2), dès 4 | 4 à 5 familles | 4 à 18 | 7 à 18 % | une décision : sept maillons valent 11 par saison à qui les planifie : **gardé** |

Routes : 2 à 4 ports reliés, une route payante par île, 18 à 50 points par île (6 à 12 %). Le robot qui compte les rentes
fait 3 % de mieux que celui qui les ignore, et relie un port de plus. Aucune tuile de mer perdue (détroit de 24 à 31 cases
pour 8 à 18 tuiles de mer posées). Les rentes récompensent l'attention sans écraser le voisinage : c'est ce qu'on voulait.
À recalibrer sur les vraies îles du chapitre 11.

## Les chapitres

1. **La Traversée** (31–33) — la mer posable autour d'une île, le récif et les algues, la chaîne de territoire.
2. **Les Ports** (34–36) — deux îles, les routes, le dauphin.
3. **Les Vents** (37–39) — le climat venteux, la tempête (surprise de saison), le phare (rare).
4. **Les Marées** (40–42) — la marée comme règle de saison, des îles à contrainte (une île montagnarde où la mer est la seule eau).
5. **Le Grand Large** (43–45) — trois ou quatre îles, tout ensemble, la fin.

Le récit part de la dernière phrase du Livre I (« Tu peux partir, Saison. Il y a d'autres îles, sous d'autres ciels, qui
ne savent plus ce qu'est l'automne. ») ; la vieille passeuse du Livre I guide le voyage. Le voilier de la tournée finale
devient sa barque à la fin de l'île 30 ; la cinématique du commanditaire ouvre le Livre II.

## Ce qui entre ensuite, et ce qui part

- **Trois animaux marins** : le dauphin suit les routes, le phoque les algues contre la roche, la baleine les grandes étendues.
- **Deux ou trois rares** : Taverne (paie par port relié), Marché (par marchandise différente), Chantier naval (fusion port + forêt).
- **Ce qui part** de la spécification du 18 septembre : balise, filet, trois des quatre fusions marines, la météo de mer à part.

## Les lots

| # | Lot | Statut |
|---|---|---|
| 0 | Mesure : archipel, détroit, tuiles de mer, routes, chaîne, robot — ce document | **fait** (prototype dans le jeu, test `tests/livre2.test.js`) |
| 7a | Chapitres 11 et 12 jouables : îles 31 à 36 dans la campagne, images des cinq familles (packs KayKit), rendu du détroit et de la mer posée, aperçu et lecture (routes, chaîne), textes, robot et calibrage | à faire |
| 7b | Pinède qui ne sèche pas, variantes d'arbres par climat, rares, faune marine, climat venteux, tempête, phare, marée, chapitres 13 et 14 | à faire |
| 7c | Récit, passeuse, cinématique, chapitre 15 et fin, musiques et ambiances | à faire |
