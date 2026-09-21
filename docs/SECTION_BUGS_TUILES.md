# Pépins et idées — arborescence et textes pré-remplis

> Complément à `SECTION_BUGS.md`. Ce document décrit **l'entonnoir de tuiles** : comment il est construit, comment on
> s'en sert au pouce, et l'arbre complet des éléments du jeu avec, pour chaque tuile, les questions qui aident —
> selon le cas — à reproduire un pépin ou à comprendre une idée.
>
> Document de conception. Aucune ligne de `src/` n'est touchée ici.

---

## 0. Deux modes, un seul arbre

La section s'appelle **« Pépins et idées »**. En haut de l'écran, un sélecteur à deux positions :

```
  ┌──────────────┬──────────────┐
  │  Un pépin  ● │   Une idée   │      ← « Un pépin » par défaut
  └──────────────┴──────────────┘
```

**Pas d'écran de choix supplémentaire.** Le sélecteur est posé sur le même écran que le reste, et il est déjà sur
`Un pépin` : celui qui vient signaler un problème ne paie rien pour la nouveauté. Celui qui a une idée touche une
fois. Quand la section est ouverte depuis la bannière de plantage, le sélecteur est **verrouillé sur `Un pépin`** —
le jeu sait déjà de quoi il s'agit.

**L'arbre est le même dans les deux modes.** Les branches, les rameaux, les feuilles : identiques. Ce qui change :

| | Mode `Un pépin` | Mode `Une idée` |
|---|---|---|
| Les quatre raccourcis du haut | Ça s'est bloqué · Le compte est faux · C'est mal placé · Le jeu a planté | Je n'ai pas compris · C'est trop dur · C'est trop facile · Ce serait plus simple si… |
| Les questions pré-remplies | **Par feuille** — 240 jeux de questions, faits pour reproduire (§ 7) | **Par branche** — 8 jeux, plus un trio commun (§ 7 bis) |
| L'erreur relevée par le jeu | Affichée en haut, embarquable | Masquée : elle n'a rien à faire là |
| La partie rejouable | Jointe par défaut | **Non jointe** — il n'y a rien à rejouer ; seul le contexte léger part (île, chapitre, mécaniques ouvertes) |
| L'image de l'écran | Proposée, repliée | Proposée, repliée — *« montre-moi où tu imagines ça »* |
| Dans GitHub | Étiquette `pépin`, titre `PÉPIN-7K3Q · …` | Étiquette `idée`, titre `IDÉE-7K3Q · …` |

**Pourquoi les questions ne sont pas par feuille en mode idée.** Une idée n'a rien à reproduire. Les questions qui
servent un pépin — quelle saison, une tuile ou toutes, ça le fait à chaque fois — n'ont aucun sens face à « j'aimerais
que les vergers sentent quelque chose en automne ». Trois questions suffisent, partout, et une nuance par branche.
Dupliquer les 240 jeux aurait doublé l'entretien pour un gain nul. La différence de traitement n'est pas une
économie, c'est la nature de la chose.

---

## 1. À quoi sert l'entonnoir

Un joueur qui tombe sur un pépin sait **montrer**, rarement **nommer**. Il dira « le truc là il marche pas », pas
« le liseré de fusion reste affiché après la pose ». L'entonnoir renverse la charge : il ne lui demande pas de
trouver les mots, il lui demande de **reconnaître** ce dont on parle, ce qui est infiniment plus facile.

Il rend trois services d'un coup :

1. **Au joueur** — il désigne le coupable en deux ou trois touchers, sans écrire une ligne.
2. **Au correcteur** — le pépin arrive **rangé** : la tuile devient l'étiquette de l'issue GitHub, donc le tri est
   déjà fait à l'arrivée.
3. **À la conversation** — la tuile choisie **déclenche les bonnes questions** dans la zone de commentaire. Le
   joueur ne devine pas ce qu'on attend de lui : on le lui demande, précisément, au moment où il a le pépin sous
   les yeux.

---

## 2. Les règles de l'arbre

### 2.1 Trois niveaux au maximum

`Graphisme` → `Sprites` → `Forêt`. Jamais quatre. Sur un téléphone, chaque niveau est un écran de plus avant de
pouvoir écrire, et l'exhaustivité ne vaut rien si personne ne va au bout. Là où un quatrième niveau serait tentant
(les onze espèces de faune, les treize tuiles rares), la feuille reste **la famille**, et le détail est demandé par
le texte pré-rempli — qui, lui, ne coûte pas un écran.

### 2.2 N'importe quel niveau s'embarque

Toucher `Forêt` embarque la forêt. Toucher `Sprites` embarque **tous les sprites**. Toucher `Graphisme` embarque
**toute la branche**. C'est fait pour le gros pépin général — « depuis la mise à jour tout est gris » — et ça
restera rare, mais c'est la soupape qui évite qu'il abandonne faute de trouver sa case.

Conséquence côté rapport : une tuile embarquée porte **son chemin complet** (`graphisme/sprites/foret`), et une
tuile de branche porte le chemin de la branche (`graphisme/sprites`). L'étiquette GitHub suit le même chemin, donc
tu peux filtrer aussi large ou aussi fin que tu veux.

### 2.3 Une tuile peut vivre à deux endroits

`HUD` est sous `Graphisme` (« c'est mal affiché ») **et** sous `Interface` (« ça ne répond pas »). C'est voulu :
l'arbre est un **chemin vers une étiquette**, pas un classement de bibliothécaire. Le joueur descend par ce qu'il a
remarqué, pas par notre architecture. Deux chemins qui mènent au même endroit ne coûtent rien et sauvent tous ceux
qui seraient partis du mauvais côté.

Sous le capot, chaque tuile a un identifiant unique ; deux chemins peuvent pointer vers le même. Le rapport ne
retient que l'identifiant.

### 2.4 Toujours une sortie

Chaque niveau se termine par une tuile **`Autre chose`**, qui embarque la branche et bascule le curseur dans la
zone de texte. Personne ne doit pouvoir se retrouver coincé dans l'arbre sans moyen de dire ce qu'il a vu.

### 2.5 Un raccourci pour les cas fréquents

Au-dessus de l'arbre, une ligne de **quatre tuiles d'accès direct**, les pépins qu'on rencontre vraiment :
`Ça s'est bloqué` · `Le compte est faux` · `C'est mal placé` · `Le jeu a planté`. Un seul toucher, et on est dans
le commentaire. L'arbre complet reste dessous pour qui veut être précis. C'est la réponse à la tension entre
exhaustif et intuitif : **les deux, à des profondeurs différentes.**

---

## 3. Le geste, au pouce

### 3.1 Toucher d'abord, glisser en plus

Le glisser-déposer natif du navigateur (`draggable`) **ne fonctionne pas au doigt** : il est prévu pour la souris.
Le refaire à la main sur mobile (suivi du doigt, tuile fantôme sous le pouce, cible qui s'illumine) est faisable,
mais ce serait le geste principal d'une section qu'il utilisera justement au téléphone.

Donc :

- **Toucher une tuile** la fait descendre dans le sujet. La retoucher la remonte. C'est le geste principal, partout.
- **Glisser une tuile** vers le sujet marche aussi, à la souris comme au doigt, pour ceux qui l'essaient
  spontanément — mais rien n'en dépend.

Une tuile déjà dans le sujet apparaît **cochée** dans l'arbre : on voit d'un coup d'œil ce qu'on a déjà pris.

### 3.2 Plusieurs tuiles

Le sujet accepte **plusieurs tuiles** (`Sprites · Forêt` + `Saisons · Automne` pour « les arbres d'automne sont
faux »). C'est souvent la vraie description d'un pépin : le croisement de deux éléments. Chacune apporte ses
questions au texte pré-rempli.

Limite : **quatre tuiles**. Au-delà, ce n'est plus un sujet, c'est une liste de courses — et le message du jeu le
dit gentiment : *« Quatre, c'est déjà beaucoup. Raconte le reste en dessous. »*

### 3.3 Taille et disposition

Tuiles de **44 px de haut minimum**, deux par ligne en portrait, texte sur une ligne. Le fil d'Ariane
(`Graphisme › Sprites`) reste visible en haut avec un retour d'un toucher. Le sujet est **collé en bas de l'écran**,
toujours visible pendant qu'on fouille l'arbre : on doit voir son panier se remplir.

---

## 4. Le texte pré-rempli

### 4.1 Ce que c'est

Ce ne sont **pas** des cases à remplir, et surtout pas un formulaire. C'est une **courte liste de questions**
déposée dans la zone de commentaire, que le joueur complète, efface ou ignore. Deux à quatre par tuile, très
courtes, tutoyées, concrètes.

Exemple — tuile `Sprites · Forêt` :

```
Quelle saison ?
Une seule tuile ou toute la forêt ?
L'arbre dépasse-t-il de l'hexagone ?
```

Il tape ses réponses à la suite, ou pas. Un rapport avec deux réponses sur trois vaut déjà dix fois un « ça bug ».

### 4.2 Comment il se fabrique

- Une tuile **feuille** apporte ses propres questions.
- Une tuile **de branche** apporte les questions de la branche, plus générales (pour `Sprites` : « Quelle famille de
  tuiles ? Quelle saison ? Toutes les tuiles ou une seule ? »).
- **Plusieurs tuiles** : les questions se cumulent, **sans doublon** (deux tuiles qui demandent la saison ne la
  demandent qu'une fois), plafonnées à **six** en tout. Au-delà, on ne lit plus.
- Des questions **communes** s'ajoutent toujours à la fin, une ou deux au plus, selon le contexte :
  `Ça le fait à chaque fois ?` et, si le pépin est en partie, `Sur quelle île ?` — cette dernière seulement quand le
  jeu ne connaît pas déjà la réponse (il la connaît presque toujours, donc elle ne sort presque jamais).

### 4.3 Ce qu'il ne fait jamais

- Il **n'écrase pas** ce que le joueur a déjà tapé. Si la zone n'est pas vide, les nouvelles questions s'ajoutent
  en dessous, jamais à la place.
- Il **ne bloque pas** l'envoi. Aucune question n'est obligatoire.
- Il **ne demande pas** ce que le jeu sait déjà : ni l'île, ni la saison, ni le nombre de poses, ni le téléphone,
  ni la version. Tout cela part tout seul dans le rapport. Les questions ne portent que sur ce que **seul le joueur**
  peut dire : ce qu'il a vu, ce qu'il attendait, si ça se reproduit.

---

## 5. L'écran, dans l'ordre

```
┌─────────────────────────────────────────┐
│  Pépins et idées                        │
│  ┌────────────┬────────────┐            │  ← le sélecteur, « Un pépin »
│  │ Un pépin ● │  Une idée  │            │     par défaut
│  └────────────┴────────────┘            │
│                                         │
│  ⚠ Le jeu a relevé une erreur           │  ← seulement s'il y en a une,
│    pendant ta partie.  [ l'ajouter ]    │     et seulement en mode pépin
│                                         │
│  ( ça s'est bloqué ) ( le compte est faux )  ← les quatre raccourcis
│  ( c'est mal placé ) ( le jeu a planté )│     (ils changent avec le mode)
│                                         │
│  ─ ou cherche dans la liste ─           │
│  Graphisme › Sprites                    │  ← fil d'Ariane, retour d'un toucher
│  ┌──────────┐ ┌──────────┐              │
│  │ Forêt    │ │ Hameau   │              │  ← l'arbre, deux par ligne
│  ├──────────┤ ├──────────┤              │
│  │ Roche    │ │ Eau      │              │
│  ├──────────┤ ├──────────┤              │
│  │ Faune    │ │ Autre…   │              │
│  └──────────┘ └──────────┘              │
│                                         │
│  ▼ Sujet du pépin                       │  ← collé en bas, toujours visible
│  [ Sprites · Forêt ✕ ]                  │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ Quelle saison ?                     ││  ← le commentaire, pré-rempli
│  │ Une seule tuile ou toute la forêt ? ││
│  │ L'arbre dépasse-t-il de l'hexagone ?││
│  └─────────────────────────────────────┘│
│                                         │
│  ▸ Ajouter une image de l'écran         │
│                                         │
│           [ Envoyer ]                   │
└─────────────────────────────────────────┘
```

### 5.1 Le rapport que le jeu a émis tout seul

S'il y a une erreur dans la boîte noire (voir `SECTION_BUGS.md` § 8), elle s'affiche **tout en haut**, avant même
les raccourcis : *« Le jeu a relevé une erreur pendant ta partie »*, avec un bouton pour l'embarquer et un
`voir` qui montre le détail technique. Elle est embarquée par défaut si la section a été ouverte depuis la
bannière, à cocher sinon.

### 5.2 L'image

Repliée, en bas, jamais imposée. Le texte de l'avertissement est court et honnête — elle ne coûte pas une écriture
de plus, elle alourdit le rapport :

> **Ajouter une image de l'écran** — Utile si le pépin se voit. Inutile sinon : elle alourdit le rapport pour rien.

Le jeu propose la capture de l'île telle qu'elle est à l'écran ; elle est réduite à 900 px de large et compressée
avant de partir (80 Ko environ).

---

## 6. Ce que le rapport emporte

En plus de tout ce que décrit `SECTION_BUGS.md` § 6, l'entonnoir ajoute :

| Champ | Contenu |
|---|---|
| `mode` | `pepin` ou `idee` |
| `tuiles` | La liste des chemins choisis : `["graphisme/sprites/foret", "regles/saisons/automne"]` |
| `raccourci` | Le raccourci touché, s'il y en a un : `bloque`, `compte`, `place`, `plantage` (pépin) ou `compris`, `dur`, `facile`, `simple` (idée) |
| `questions` | Les questions qui ont été posées — pour savoir, en lisant la réponse, à quoi elle répond |

L'issue GitHub porte le mode et les chemins en **étiquettes** : `pépin` ou `idée`, puis `graphisme`,
`graphisme/sprites`, `graphisme/sprites/foret` — trois niveaux de chemin, donc trois grains de filtre selon ce que
tu cherches, et un filtre en travers pour séparer ce qui est cassé de ce qui est souhaité.

En mode `idee`, `partie` (le `RunSave`) est **absent** : rien à rejouer. Le rapport garde en revanche le contexte
léger — île, chapitre, climat, saison, mécaniques ouvertes — parce que « il propose ça à l'île 12 » et « il propose
ça à l'île 47 » ne veulent pas dire la même chose.

---

## 7. L'arbre complet

Neuf branches, cinquante-sept rameaux, deux cent quarante feuilles. Les questions en *italique* sous un rameau sont
celles qu'il apporte quand on l'embarque entier ; celles après `→` sont propres à la feuille.

Vocabulaire : celui du jeu, tel qu'il est écrit dans `src/data/story.js` et dans le Guide. Le joueur doit
reconnaître les mots qu'il a lus en jouant, pas ceux du code.

---

### A — Graphisme · *ce qu'on voit*

*Branche : Quelle saison ? Ça le fait partout sur l'île ou à un seul endroit ? Ça change si tu recharges ?*

#### A1 · Sprites et décor
*Quelle famille de tuiles ? Une seule tuile ou toutes celles de sa famille ?*
- **Forêt et arbres** → Quelle saison ? Un arbre dépasse de l'hexagone ? Toute la forêt ou un seul arbre ?
- **Hameaux et bâtiments** → Quelle couleur de toit ? Le bâtiment se répète à l'identique ? Il passe devant son voisin ?
- **Roche et montagnes** → Le massif est troué au milieu, ou nu en bas ? Les pierres débordent sur la case voisine ?
- **Champs et cultures** → Les sillons se coupent au bord de la tuile ? Ils sont décalés d'une rangée ?
- **Prairie, marais, lande** → La floraison de printemps est là ? Le pré sec ressemble-t-il à un pré sec ?
- **Verger** → Les arbres fleurissent-ils au printemps ? Sont-ils chargés en été, cuivrés en automne, nus en hiver ?
- **Sable et dunes** → Le sol jure avec l'eau à côté ? La roche brune est-elle là ?
- **Collines** → Le talus est-il net ? La colline se confond-elle avec la prairie ?
- **Tuiles bâties (niveau 2 et 3)** → Quel niveau ? Le village est-il plus dense qu'avant ? La pièce maîtresse est-elle au centre ?
- **Tuiles rares** → Laquelle (moulin, chapelle, tour de guet, puits, campement, grenier, fontaine, auberge, abreuvoir, porche, mine, four à pain) ? Elle s'affiche vide ou comme une prairie ?
- **Tuiles d'événement** → Marché, Fête ou Ruine à restaurer ? L'image change-t-elle après son effet ?
- **Ouvrages** → Lequel ? Il est tourné dans le mauvais sens ? Le « ! » rouge reste après correction ?
- **Fusions** → Quelle recette ? Un élément manque (la vague de la cascade, la porte de la grotte) ?
- **Friches** → Quelle famille est tombée en friche ? Le sol redevient-il normal après remise en état ?
- **Jeunes pousses (croissance annoncée)** → Les pousses restent-elles après que la tuile a grandi ?
- **Autre chose** → Qu'est-ce qui est mal dessiné, et où ?

#### A2 · Sol des tuiles et raccords
*Quelle saison ? Entre quelles deux familles ?*
- **Couleur de saison du sol** → Le sol est trop clair, trop foncé, ou de la mauvaise saison ?
- **Trait ou couture entre deux tuiles** → Tu vois un trait, une couture ou une marche ? Ça bouge quand tu zoomes ?
- **Cases vides et liserés** → Les cases libres brillent-elles quand il faut ? Le liseré doré apparaît sans raison ?
- **Ombre sous les tuiles** → L'ombre est-elle du bon côté ? Elle manque complètement ?
- **Voile de climat** → Quel climat ? Le voile déborde-t-il sur la mer ?
- **Option « Grille discrète »** → L'option est-elle cochée ? Le contour apparaît-il quand même ?
- **Autre chose** → Ce qui cloche dans le fond des tuiles ?

#### A3 · Eau et mer
- **Étang et lac** → Combien de tuiles d'eau collées ? La nappe a-t-elle une couture ?
- **Rivière** → Part-elle bien de la roche ? Le ruban sort-il des tuiles d'eau ? L'écume défile-t-elle à l'envers ?
- **Glace d'hiver** → La glace apparaît-elle hors de l'hiver ? Les fissures sont-elles là ?
- **Écume de côte et vagues** → Une vague est plantée sur la terre ? L'écume suit-elle la côte ?
- **Voilier et baleine** → Le bateau coupe-t-il l'île ? La baleine flotte-t-elle hors de l'eau ?
- **Autre chose** → Ce qui cloche dans l'eau ou la mer ?

#### A4 · Faune à l'écran
*Quel animal ? Sur quelle famille de tuiles ?*
- **Un animal mal dessiné ou mal placé** → Il flotte au-dessus de son ombre ? Il sort de sa région ?
- **La marche** → Il glisse sans bouger les pattes ? Il marche à reculons ?
- **Arrivée et départ** → Qu'as-tu posé juste avant ? Est-il parti sans raison ?
- **Autre chose** → Ce qui cloche chez les animaux ?

#### A5 · Sentiers, ruelles, ponts
- **Sentier entre deux villages** → Il traverse une tuile qu'il ne devrait pas ? Il s'arrête en plein milieu ?
- **Ruelles du village** → Elles passent par-dessus une maison ? Elles relient les mauvaises tuiles ?
- **Pont et jetée** → Le pont est-il en travers du courant ? La jetée part-elle de la rive du hameau ?
- **Couleur de saison des chemins** → Elle correspond à la saison affichée ?
- **Autre chose** → Ce qui cloche dans les chemins ?

#### A6 · Météo et effets
*Quel événement ou quel moment exactement ?*
- **Orage, pluie, éclair** → Le voile reste-t-il après la fin ? La pluie passe-t-elle devant le HUD ?
- **Canicule** → La chaleur tremblante est-elle là ? Le voile ocre reste-t-il ?
- **Grand vent** → Les rafales de feuilles traversent-elles l'île ?
- **Bourrasque et neige** → Les congères apparaissent-elles partout ? Elles restent après la fin ?
- **Particules** → Elles partent du bon endroit ? Il y en a trop, ou plus du tout ?
- **Points qui volent (changement de saison)** → L'étincelle part-elle de la bonne tuile ? Il en reste en l'air ?
- **Onde de fermeture de région** → L'onde couvre-t-elle toute la région ? Part-elle de la mauvaise case ?
- **Transition de saison (le balayage)** → Une bande reste figée ? Des tuiles restent dans l'ancienne saison ?
- **Tournée finale** → À quelle phase ? Une région est-elle oubliée ou nommée deux fois ?
- **Tremblement de l'écran** → Trop fort, trop fréquent ? L'option est-elle coupée ?
- **Autre chose** → Quel effet cloche, et à quel moment ?

#### A7 · HUD *(ce qui s'affiche mal)*
*Téléphone tenu en portrait ou en paysage ? Quel élément se chevauche ?*
- **Barre de saison** → Le nom, la règle ou les pastilles sont coupés ? La barre passe sur deux lignes ?
- **Compteur de points et jauge de série** → Le badge « +N » déborde ? La jauge est-elle lisible ?
- **File de tuiles / main** → Une tuile est-elle coupée ? La file déborde-t-elle de l'écran ?
- **Vœux** → Le panneau cache-t-il l'île ? Le bouton est-il atteignable au pouce ?
- **Chiffres sur les bords des cases** → Ils se chevauchent ? Le badge du total sort de l'écran ?
- **Ruban des mots et notifications** → Deux messages se marchent dessus ? Ça cache la file ?
- **Boutons ronds (pause, journal, plein écran)** → Trop petits à toucher ? Sous l'encoche du téléphone ?
- **Bouton « Poser ici »** → Il reste après la pose ? Il cache la case visée ?
- **Fiche de la tuile** → Elle masque le plateau ? Elle déborde ?
- **Autre chose** → Quel bloc du HUD s'affiche mal ?

#### A8 · Caméra et cadrage
- **Zoom** → Il saute ? Il se bloque à une limite ? Au doigt ou à la molette ?
- **Déplacement de la vue** → Elle reste accrochée ? Elle bouge trop facilement ?
- **Cadrage automatique** → L'île est-elle coupée par le HUD ? Le recadrage t'a-t-il perdu ?
- **Mode repos (l'interface qui s'efface)** → Ça se déclenche pendant que tu réfléchis ? Un geste la rétablit-il ?
- **Autre chose** → Ce qui cloche dans la vue ?

#### A9 · Carte postale
- **L'image** → L'île est-elle bien cadrée ? Un texte dépasse-t-il ?
- **Les informations** → Nom, chapitre, saison, étoiles, score, date : lesquels sont faux ?
- **Téléchargement et partage** → Le fichier est-il arrivé ? Depuis le bilan ou la pause ?

---

### B — Son et vibrations

*Branche : Sur téléphone ou sur ordinateur ? Le son est-il coupé quelque part ?*

#### B1 · Musique
- **Musique de saison** → Quelle saison ? Deux musiques jouent-elles en même temps ?
- **Musique d'un écran (menu, bilan, Jardin, Île du jour, fin)** → Lequel ? Elle continue après avoir changé d'écran ?
- **La boucle** → Y a-t-il un blanc ou un clic à la reprise ?
- **Autre chose** → Quel problème de musique ?

#### B2 · Ambiance
- **Oiseaux, ruisseau, vent, grillons, mer, hiver** → Laquelle est de trop ou absente ? Que contient ton île ?
- **Pluie et orage** → L'ambiance reste-t-elle après la fin de l'orage ?
- **Le volume qui suit l'île** → Il monte ou descend sans raison ?
- **Autre chose** → Quel problème d'ambiance ?

#### B3 · Effets sonores
- **Son de pose** → Absent, doublé, en retard ?
- **Notes par point marqué** → Trop longues ? Quel réglage « Notes du coup » ?
- **Accord de fermeture de région** → Absent ? Joué au mauvais moment ?
- **Cris d'animaux** → Quelle espèce ? Trop fréquents ?
- **Sons de saison, de vœu, de souffle** → Lequel manque ou tombe à côté ?
- **Autre chose** → Quel son, à quel geste ?

#### B4 · Voix des menus et jingles
- **Clics et retours de boutons** → Absents ? Joués deux fois ?
- **Jingle de succès, d'étoile, d'amélioration** → Lequel ? Il manque ou arrive en retard ?
- **Autre chose** → Quel son d'interface ?

#### B5 · Volumes et coupure
- **Les quatre curseurs** → Lequel ? Le changement s'entend-il tout de suite ?
- **Couper le son (M)** → Coupe-t-il vraiment tout ? Revient-il après un changement d'onglet ?
- **Le son qui ne démarre pas** → As-tu du son après un premier toucher ? Le téléphone est-il en silencieux ?

#### B6 · Vibrations
- **Trop, ou jamais** → Android ou iPhone ? L'option est-elle cochée ? À quel moment exactement ?

---

### C — Règles et comptes · *le jeu ne compte pas comme il faut*

*Branche : Quel score attendais-tu, et quel score as-tu eu ? Sur quelle île ?*

#### C1 · Points d'une pose
- **Points d'un bord** → Quelles deux familles ? Quel chiffre affiché ? Une des deux était-elle bâtie ?
- **Le total annoncé avant la pose** → Le total du haut faisait-il la somme des bords ? Combien as-tu encaissé ?
- **Prime de pose (eau, rivière, météo, climat)** → Quelle prime attendue ? Quel libellé dans le détail ?
- **Le mot du ruban (Coup de maître, Il y avait mieux…)** → Quel mot ? Le coup te semblait meilleur ou pire ?
- **Jauge de série** → À combien était-elle ? As-tu eu le souffle à trois ? La fermeture a-t-elle été doublée ?
- **Friche (une pose négative)** → Quel total négatif ? Ta région s'est-elle quand même fermée ?
- **Remise en état d'une friche** → La case était-elle proposée ? Le souffle a-t-il été débité ?
- **Autre chose** → Quel compte est faux à la pose ?

#### C2 · Régions et fermetures
- **Une région ne se ferme pas** → Reste-t-il une case vide ? Est-ce la mer ou une case libre ?
- **La prime de fermeture** → Quelle famille ? Quelle prime reçue ? Un porche ou une mine dedans ?
- **La taille d'une région** → Quelle taille annoncée ? Des tuiles bâties comptent-elles double ou triple ?
- **Fermeture malgré un trou (tour de guet, fortin)** → Combien de cases vides ? La prime est-elle tombée ?
- **Fermetures multiples en une pose** → Combien de régions ? Toutes payées ?
- **Le souffle de fermeture** → Le compteur a-t-il bougé ?
- **Autre chose** → Quel problème de région ?

#### C3 · Eau et rivières
- **Étang, lac, lac de montagne** → Quelle nature annoncée ? Une roche ou colline touche-t-elle l'eau ?
- **Rivière** → Est-ce bien une ligne ? Une extrémité touche-t-elle une roche ou une colline ?
- **Rivière-lac (la fourche)** → Où était la fourche ? Quelle partie comptait comme rivière ?
- **Arrivée à la mer** → Quelle extrémité touchait la mer ? Le +3 est-il tombé ?
- **Gel de l'hiver** → Quel climat, quelle règle ? Un redoux est-il passé ?
- **Veillée (hameaux reliés par la glace)** → Combien de hameaux au bord ? Combien de paires payées ?
- **Autre chose** → Quel problème d'eau ?

#### C4 · Saisons et règles de saison
- **Le changement de saison** → La ligne de pastilles était-elle pleine ? Combien de poses ?
- **La règle annoncée** → Laquelle (Crue, Semailles, Nichées, Sécheresse, Grandes chaleurs, Feux de broussaille, Récolte, Grande foire, Chasse et cueillette, Veillée, Grand froid, Hiver doux) ? Ses effets ont-ils suivi ?
- **Les points de fin de saison** → Quelle source manquait au relevé ?
- **Points en retard d'une saison** → Étaient-ce la Chasse (animaux de forêt) ou le Grand vent (moulins) ? Ils paient la saison suivante.
- **Saison longue (climat chaud ou froid)** → Quelle saison s'est répétée ? Combien de fois ?
- **Relevé de saison** → Quel réglage ? Le total colle-t-il à la somme des lignes ?
- **Faucille (clore la saison)** → Quel niveau ? Combien de poses restaient ? Le bouton était-il actif ?
- **Autre chose** → Quel problème de saison ?

#### C5 · Climat et météo
- **Climat chaud** → Le +2 sur l'eau tombait-il ? Tes prés ont-ils séché dès le printemps ?
- **Climat humide** → Le −2 hameau–marais était-il annoncé ? Ton sentier de trois cases a-t-il disparu ?
- **Climat froid** → Le bois de chauffage tombait-il ? Les marais ont-ils fleuri malgré tout ?
- **Manteau (l'amélioration qui adoucit)** → Achetée ? La contrainte s'appliquait-elle encore ?
- **Orage** → L'annonce est-elle apparue ? Le +2 par rivière figurait-il ?
- **Canicule** → Quel voisinage avait ton pré (eau, puits, fontaine, abreuvoir, lande) ?
- **Grand vent** → Le +3 des moulins est-il tombé la saison suivante ?
- **Bourrasque** → La file était-elle masquée ? Pouvais-tu encore jouer ?
- **Redoux** → Les manchots sont-ils partis ? L'eau est-elle redevenue liquide ?
- **Le moment du déclenchement** → Combien de poses entre l'annonce et l'effet ?
- **Autre chose** → Quel problème de climat ou de météo ?

#### C6 · Faune
*Quelle espèce ? Combien d'animaux étaient affichés ?*
- **Un animal ne vient pas** → Quel habitat as-tu construit ? Quelle taille ? Quelle saison ?
- **Un animal part** → Qu'as-tu posé juste avant ? Le pré a-t-il séché, l'eau dégelé ?
- **Les points par animal** → Combien d'animaux comptés ? Combien de points à la saison ?
- **Le souffle pour deux animaux** → Combien d'animaux ? Combien de souffles reçus ?
- **Animaux liés à une fusion ou un nichoir** → Lequel ? Il ne rapporte pas de points, c'est voulu.
- **Autre chose** → Quel problème de faune ?

#### C7 · Vœux
- **L'avancement d'un vœu** → Quel vœu, quel objectif ? Que compte le compteur ?
- **Un vœu ne s'exauce pas** → L'objectif t'a-t-il semblé atteint ? À quelle pose ?
- **Un vœu échoue trop tôt** → Quelle échéance annoncée (poses ou saison) ? As-tu vu le rappel ?
- **La récompense** → Qu'as-tu reçu (points, souffles, tuile rare, graine) ? La rare est-elle entrée dans la file ?
- **La présentation des vœux au départ** → Le texte correspondait-il à l'objectif du HUD ?
- **Autre chose** → Quel problème de vœu ?

#### C8 · Souffles et pouvoirs
- **Le compteur de souffles** → Combien avant, combien après ? Quel geste ?
- **Échanger (2 / 3)** → Avant ou après l'île 16 ? Bourrasque active ?
- **Défausser (X)** → Le coût affiché était-il 0 (ouvrage) ou 2 ? La file s'est-elle rechargée ?
- **Bourgeon (B puis F / V)** → Quelle prairie ? Était-elle rare ou bâtie ?
- **Souvenir / annuler (Z)** → Quel coût ? L'avais-tu déjà utilisé cette saison ? Tout est-il revenu ?
- **Poche (P)** → Combien de places ? La tuile est-elle ressortie en tête ?
- **Autre chose** → Quel pouvoir a mal réagi ?

#### C9 · File, main, poche, remise
- **La file de tuiles** → Combien de tuiles voyais-tu ? Quelles améliorations (Regard, Longue-vue) ?
- **La main de saison (dès l'île 16)** → La tuile cliquée a-t-elle été jouée ? Un souffle a-t-il été débité à tort ?
- **Une tuile qui arrive au mauvais endroit** → Rare de vœu, retour de « bien bâtie », recette découverte ? Où est-elle apparue ?
- **La remise (ouvrages, R)** → Combien de poses restaient ? Un second ouvrage a-t-il remplacé le premier ?
- **La fin de la file** → Restait-il une tuile en poche ou en remise ? Une case libre ?
- **Autre chose** → Quel problème de file ?

#### C10 · Bâtir, fusionner, ouvrages
- **Bâtir (niveau 2)** → Même famille exactement ? Les bords ont-ils gagné +1 ? La région a-t-elle grandi de 2 ?
- **Bien bâtie (la tuile qui revient)** → Quelle raison affichée ? Une tuile était-elle déjà revenue cette saison ?
- **Niveau 3 et signature** → Depuis combien de saisons la tuile était-elle au niveau 2 ? Quelle signature annoncée ?
- **Croissance naturelle (dès l'île 41)** → Combien de voisines de sa famille ? As-tu vu les jeunes pousses ? Qu'as-tu posé à côté ?
- **Fusion** → Quelles deux familles ? La case était-elle surlignée ? Le souffle a-t-il été débité ?
- **La prime d'une fusion** → Quelle recette ? Combien de voisines comptées ? Chaque saison ou une fois ?
- **Le Cahier des recettes** → Était-ce ta première fois ? As-tu reçu les deux tuiles ? Le Cahier s'est-il rempli ?
- **Un ouvrage bien ou mal placé** → Lequel ? Sur quelle tuile ? Quelles voisines ?
- **Ouvrage frais** → Combien de poses après réception ? Le +1 apparaissait-il ?
- **Autre chose** → Quel problème en posant sur une tuile déjà posée ?

#### C11 · Tuiles rares et tuiles d'événement
- **Ce pour quoi la rare compte** → Laquelle ? Pour quelle(s) famille(s) l'attendais-tu ?
- **L'effet d'une rare** → Laquelle ? Quel effet attendu (protection, bonus de bord, multiplicateur) ?
- **Marché** → Le choix s'est-il ouvert ? Pour combien de poses ?
- **Fête** → Combien de hameaux voisins ? Le bonus est-il retombé une deuxième fois ?
- **Ruine à restaurer** → En quelle famille s'est-elle transformée ? Quelles familles autour ?
- **Autre chose** → Quel problème de tuile rare ?

#### C12 · Étoiles, graines, Atelier
- **Le nombre d'étoiles** → Quel score, quels seuils affichés ? Combien d'étoiles reçues ?
- **L'étoile d'or** → Le seuil d'or était-il affiché ? L'île brille-t-elle sur la carte ?
- **Mes étoiles ont changé toutes seules** → Dans quel sens ? Après une mise à jour ou au lancement ?
- **Les graines** → Combien attendais-tu ? Combien reçues ? Mode test actif ?
- **Une amélioration d'Atelier** → Laquelle, quel niveau ? As-tu vu son effet en partie ?
- **Une amélioration reste verrouillée** → Quel chapitre atteint ? Que disait la carte grisée ?
- **Autre chose** → Quel problème d'étoile ou de graine ?

#### C13 · Campagne, chapitres, contrats
- **Une île ne se débloque pas** → As-tu vu le bilan de la précédente ? Que dit la carte verrouillée ?
- **Une porte de chapitre** → Combien d'étoiles, combien de parties jouées ? Les cinq îles sont-elles terminées ?
- **Contrat d'archipel** → Lequel ? Combien comptés, combien attendus ? As-tu rejoué une île ?
- **Semis** → Lequel choisi ? La file te semblait-elle suivre ce penchant ?
- **La signature d'une île (36 à 49)** → Quelle signature annoncée ? L'île correspondait-elle ?
- **Le masque ou la taille d'une île** → Quelle île ? Qu'est-ce qui te paraît faux ?
- **Autre chose** → Quel problème de campagne ?

#### C14 · Fin d'île et bilan
- **L'île s'arrête trop tôt ou trop tard** → Restait-il une case libre ? Une tuile en poche ou en remise ?
- **Une ligne du bilan** → Laquelle ? Quelle valeur attendais-tu ?
- **« D'où viennent les points »** → Quelle ligne semble fausse ? La somme fait-elle le score total ?
- **Le meilleur coup de la partie** → Correspond-il à ce que tu as joué ?
- **Les libellés de la tournée finale** → Quel libellé faux ? Quelle taille annoncée ?
- **Autre chose** → Quel problème de fin d'île ?

#### C15 · Succès
- **Un succès ne se débloque pas** → Lequel ? Quelle condition croyais-tu remplie ?
- **La progression d'un succès** → Quel compte affiché ? Quel compte attendu ?
- **Un succès caché** → Est-il resté « ??? » après l'avoir obtenu ?
- **Autre chose** → Quel problème de succès ?

#### C16 · Autre chose
→ Qu'est-ce que le jeu a compté autrement que tu ne l'attendais ?

---

### D — Interface et commandes · *ça ne répond pas*

*Branche : Au doigt, à la souris ou au clavier ? Ça le fait à chaque fois ?*

#### D1 · Poser une tuile
- **La pose ne part pas** → Combien de touchers as-tu faits ? Le bouton « Poser ici » apparaissait-il ?
- **La pose part au mauvais endroit** → Quel niveau de zoom ? Tu visais quelle case ?
- **Le refus est incompris** → Quel message exact (« doit toucher une tuile posée », « case qui brille », « demande N souffle ») ?
- **Bâtir / fusionner / poser un ouvrage au doigt** → Les deux touchers marchent-ils ? La case était-elle soulignée ?
- **Autre chose** → Que fait le jeu au lieu de poser ?

#### D2 · Déplacer et zoomer
- **Un doigt qui glisse** → La vue bouge-t-elle trop facilement ? Ça a posé une tuile pendant le glissement ?
- **Deux doigts** → Le zoom saute-t-il ? La page entière zoome-t-elle ?
- **Clic droit et molette** → Le menu du navigateur s'ouvre-t-il ? Le zoom part-il à l'envers ?
- **La vue reste accrochée** → Après un passage sur un panneau ? Après un changement d'onglet ?
- **Autre chose** → Quel geste de vue ne marche pas ?

#### D3 · Les touches du clavier
- **Une touche ne fait rien** → Laquelle ? Elle marche au bouton mais pas au clavier ?
- **Une touche fait autre chose** → Laquelle, et quoi ?
- **Échap et M** → Échap a-t-il fermé autre chose que prévu ? M coupe-t-il et remet-il bien ?
- **Autre chose** → Quelle touche, quel effet attendu ?

#### D4 · Les blocs du HUD qui ne répondent pas
- **Bouton pause** → Répond-il au premier toucher ? Un panneau était-il déjà ouvert ?
- **Journal (ⓘ / J)** → S'ouvre-t-il ? Le badge de non-lus s'efface-t-il ?
- **Détail des points (toucher le compteur)** → La bulle s'ouvre-t-elle ?
- **Bulle de la saison** → S'ouvre-t-elle au toucher ? Se referme-t-elle seule ?
- **Panneau des vœux** → Se déplie-t-il ? Se replie-t-il tout seul ?
- **File / main** → Le toucher joue-t-il la bonne tuile ?
- **Un toucher sur un panneau pose une tuile derrière** → Quel panneau ? Portrait ou paysage ?
- **Autre chose** → Quel élément ne répond pas ?

#### D5 · Disposition sur l'écran
- **Portrait** → Quel élément se chevauche ou sort de l'écran ?
- **Paysage** → Les souffles restent-ils atteignables ? La file défile-t-elle ?
- **Encoche, barre d'accueil** → Quel modèle de téléphone ? Quel élément passe dessous ?
- **Rotation de l'écran** → Pendant une partie ou dans un menu ? A-t-il fallu recharger ?
- **Plein écran** → Quel bouton ? Quel message reçu ? Safari ou écran d'accueil ?
- **Un bouton trop petit à toucher** → Lequel ? Tu touches un bouton voisin ?
- **Autre chose** → Quel problème de disposition ?

#### D6 · Le tutoriel et les cartes
- **Le tutoriel de la première île** → À quelle étape ? La case qui brille refuse-t-elle la tuile ?
- **Une carte d'explication** → Laquelle ? Elle revient alors que tu l'as vue ? Elle bloque le jeu ?
- **Une carte ne s'affiche jamais** → Quelle mécanique aurait dû être expliquée ?
- **Autre chose** → Quel problème de consigne ?

#### D7 · Autre chose
→ Qu'est-ce qui ne répond pas, et à quel geste ?

---

### E — Écrans et menus

*Branche : Quel écran ? Tu y venais d'où ?*

#### E1 · Menu d'accueil
- **Bouton « Reprendre »** → Quel texte affiché ? L'île reprise est-elle la bonne ?
- **Carte des îles** → Quel chapitre, quelle île ? Que dit la carte grisée ?
- **Un bouton verrouillé** → Lequel ? La condition annoncée est-elle remplie ?
- **La mention « nouveau »** → Sur quel bouton ? Reste-t-elle après avoir essayé ?
- **Le pied de page (étoiles, graines, version)** → Quels chiffres ? Collent-ils à ta progression ?
- **Autre chose** → Quel problème au menu ?

#### E2 · Pause
- **Un bouton mène ailleurs que prévu** → Lequel ? Où t'a-t-il envoyé ?
- **La partie perdue en passant par la pause** → Quel bouton touché avant ?
- **Autre chose** → Quel problème en pause ?

#### E3 · Options
- **Un réglage n'est pas retenu** → Lequel ? Il revient après relance ou tout de suite ?
- **Un réglage est ignoré en jeu** → Lequel ? Qu'attendais-tu ?
- **Mode test** → Est-il bien actif ? Une progression a-t-elle été enregistrée quand même ?
- **Autre chose** → Quel problème dans les Options ?

#### E4 · Guide et Cahier
- **Une information du Guide semble fausse** → Quel onglet ? Quelle donnée ?
- **Le Cahier des recettes** → Combien découvertes annoncées ? Une recette réussie n'est pas notée ?
- **Un onglet s'ouvre vide** → Lequel ?
- **Autre chose** → Quel problème dans le Guide ?

#### E5 · Bilan, Atelier, Succès, Crédits
- **Le bilan** → Quelle ligne, quelle valeur attendue ?
- **L'Atelier des saisons** → Quelle carte ? Le coût correspond-il aux graines retirées ?
- **L'écran des Succès** → Quel succès ? Quelle vignette manque (médaille grise à la place) ?
- **Les Crédits** → Quelle section est vide ? Un lien n'ouvre rien ?
- **Autre chose** → Quel problème sur ces écrans ?

#### E6 · Écrans de départ d'île
- **Préparation d'île (nom, signature, contrat)** → Quelle île ? Le contrat affiché est-il celui signé ?
- **Choix du semis** → Le choix est-il resté sélectionné ?
- **Choix du contrat d'archipel** → Quel chapitre ? Le bouton reste-t-il grisé ?
- **Présentation des vœux** → L'objectif annoncé colle-t-il à celui du HUD ?
- **Autre chose** → Quel problème avant de commencer ?

#### E7 · Écrans narratifs
- **Texte coupé ou manquant** → Quel écran ? Copie ce que tu lis.
- **« Passer » ne marche pas** → A-t-il tout sauté ou rien ?
- **Un souvenir ne s'affiche pas** → Quelle île terminée ?
- **Autre chose** → Quel problème de récit ?

#### E8 · Bannières et messages
- **Une bannière reste bloquée** → Laquelle (succès, mode ouvert, bon à savoir) ?
- **Plusieurs bannières se superposent** → Après quel événement ?
- **Un message du bas de l'écran** → Lequel ? Il disparaît trop vite ?
- **Autre chose** → Quel message pose problème ?

#### E9 · Autre chose
→ Quel écran, et qu'est-ce qui cloche ?

---

### F — Sauvegarde et progression

*Branche : Qu'as-tu perdu exactement ? Après quoi (fermeture, mise à jour, changement d'appareil) ?*

#### F1 · Progression perdue ou changée
- **Étoiles, graines ou îles perdues** → Combien avant, combien après ? Sur quel navigateur ?
- **Le jeu est reparti de zéro** → Un message est-il apparu ? Navigation privée ?
- **Mes réglages ne sont pas retenus** → Lequel ? As-tu effacé les données du site ?
- **Autre chose** → Qu'est-ce qui n'a pas été gardé ?

#### F2 · Reprendre une partie en cours
- **Le bouton « Reprendre » a disparu** → Depuis combien de temps l'avais-tu laissée ? As-tu ouvert une autre île ?
- **La partie reprise n'est pas la même** → Qu'est-ce qui a changé (plateau, file, saison, score, souffles) ?
- **« Cette partie ne peut plus être reprise »** → Quelle île était-ce ? L'Île du jour de la veille ?
- **Autre chose** → Quel problème de reprise ?

#### F3 · Copie de sauvegarde (fichier)
- **Télécharger ma sauvegarde** → Le fichier est-il arrivé ? Sur quel appareil ?
- **Charger une sauvegarde** → Le résumé affiché est-il celui du fichier ? Qu'a-t-il remplacé ?
- **« Ce fichier n'est pas une sauvegarde de Cent Saisons »** → D'où vient le fichier ?
- **Le rappel de copie** → Apparaît-il, ou jamais ? Quelle date de dernière copie ?
- **Autre chose** → Quel problème de fichier ?

#### F4 · Partie en ligne
- **La connexion échoue** → Quel choix (Google, sans compte, hors ligne) ? Quel message exact ?
- **L'écran de connexion revient en boucle** → Sur quel navigateur ? La fenêtre Google s'est-elle ouverte ?
- **Rattacher un compte Google** → Jouais-tu sans compte avant ? La progression a-t-elle suivi ?
- **Deux parties proposées** → Quels chiffres de chaque côté ? Laquelle as-tu gardée ?
- **« Vérifier la connexion »** → Quelle ligne est en ✗ ? Quel détail affiché ?
- **Le quota (« le nuage se repose »)** → Quel message ? Avais-tu enchaîné beaucoup d'îles ?
- **Ma partie ne suit pas d'un appareil à l'autre** → Même compte des deux côtés ? Quand as-tu fini ta dernière île ?
- **Autre chose** → Quel problème avec le nuage ?

#### F5 · Autre chose
→ Qu'est-ce qui n'a pas été gardé, et depuis quand ?

---

### G — Lenteur, chargement, plantage

*Branche : Quel appareil et quel navigateur ? Ça le fait à chaque fois ?*

#### G1 · Le jeu ne se lance pas
- **Bloqué sur l'écran de démarrage** → À quel message ? Quel pourcentage ?
- **« Erreur de chargement »** → Quel message exact ?
- **Une image manque (carré vide)** → Quelle tuile ou icône ? Après rechargement, pareil ?
- **Autre chose** → Où ça bloque ?

#### G2 · Ça rame
- **Ça saccade tout le temps** → Combien d'images par seconde (Options) ? Quel appareil ?
- **Ça saccade à un moment précis** → Lequel (pose, changement de saison, orage, grande île) ?
- **La mer a changé d'aspect** → C'est l'allègement automatique quand ça rame : à quel moment ?
- **Le téléphone chauffe ou la batterie tombe** → Après combien de temps de jeu ?
- **Autre chose** → Quand est-ce que ça rame ?

#### G3 · Ça s'est bloqué
- **Le jeu ne répond plus du tout** → Qu'as-tu fait juste avant ? L'écran bougeait-il encore ?
- **Bloqué sur un écran** → Lequel ? Un bouton manquait-il ?
- **Impossible de continuer une partie** → Restait-il des cases ? Des tuiles ?
- **Autre chose** → Où es-tu resté coincé ?

#### G4 · Le jeu a planté
- **La page s'est fermée ou rechargée toute seule** → Qu'as-tu fait juste avant ? Combien de temps jouais-tu ?
- **Page blanche** → Après quel geste ? Le rechargement a-t-il suffi ?
- *(Si le jeu a relevé une erreur, elle est déjà jointe en haut de cet écran.)*

#### G5 · Autre chose
→ Que s'est-il passé, et à quel moment ?

---

### H — Textes

*Branche : Sur quel écran ? Copie le texte tel que tu le lis.*

- **Faute d'orthographe ou de frappe** → Où exactement ? Copie la phrase.
- **Texte coupé ou rogné** → Téléphone tenu comment ? Le texte est coupé ou le bouton déborde ?
- **Texte qui déborde de son cadre** → Quel bloc (bouton, ruban, fiche, notification) ? Quel mot ?
- **Texte manquant** → Où ? Quel texte attendais-tu ?
- **Un identifiant technique à la place d'un nom** → Copie ce qui s'affiche.
- **Un mot qui n'est pas celui du jeu** → Quel mot lu, quel mot attendu ?
- **Deux écrans qui ne disent pas la même chose** → Quelle valeur ici, quelle valeur là ?
- **Texte trop petit ou illisible** → Lequel ? En plein soleil ou en intérieur ?
- **Autre chose** → Quel texte, sur quel écran ?

---

*(La branche « Une idée » a disparu de l'arbre : elle est devenue un **mode**, voir § 0 et § 7 bis.)*

---

## 7 bis. Les questions en mode « Une idée »

### Le trio commun, partout

Quelle que soit la tuile choisie, trois questions, toujours les mêmes :

```
Qu'est-ce que tu aimerais ?
Qu'est-ce qui te manque ou t'agace aujourd'hui ?
À quel moment du jeu ça te viendrait ?
```

La deuxième est la plus importante : une idée est presque toujours la réponse à une gêne, et c'est la gêne qui se
corrige — parfois autrement que par l'idée proposée.

### La nuance par branche

Une seule question de plus, qui remplace la deuxième du trio quand la branche la précise mieux :

| Branche | Question propre à la branche |
|---|---|
| **A · Graphisme** | Qu'est-ce que tu voudrais voir à la place, ou en plus ? |
| **B · Son et vibrations** | Qu'est-ce que tu voudrais entendre, ou ne plus entendre ? |
| **C · Règles et comptes** | Qu'est-ce qui te semble injuste, plat ou trop prévisible ? |
| **D · Interface et commandes** | Quel geste aimerais-tu plus court, ou moins risqué ? |
| **E · Écrans et menus** | Qu'est-ce que tu cherches et que tu ne trouves pas ? |
| **F · Sauvegarde et progression** | De quoi voudrais-tu être sûr, et quand ? |
| **G · Lenteur, chargement, plantage** | Qu'est-ce qui te fait attendre, et combien de temps ? |
| **H · Textes** | Quelle phrase te fait tiquer, et comment tu la dirais ? |

### Ce qui ne change pas

Le joueur peut toujours prendre plusieurs tuiles, embarquer une branche entière, ou n'en prendre aucune et écrire
tout droit. `Autre chose` reste à chaque niveau.

---

## 8. Les raccourcis, et vers quoi ils pointent

Les quatre tuiles d'accès direct, en haut de l'écran, ne sont pas des branches : ce sont des **étiquettes à plat**
qui mènent droit au commentaire. Elles changent avec le mode.

### Mode « Un pépin »

| Raccourci | Étiquette | Questions posées |
|---|---|---|
| `Ça s'est bloqué` | `bloque` | Qu'as-tu fait juste avant ? L'écran bougeait-il encore ? As-tu pu continuer ? |
| `Le compte est faux` | `compte` | Quel score attendais-tu, quel score as-tu eu ? À quel moment l'as-tu vu ? |
| `C'est mal placé` | `place` | Téléphone en portrait ou en paysage ? Quel élément se chevauche ou sort de l'écran ? |
| `Le jeu a planté` | `plantage` | Qu'as-tu fait juste avant ? La page s'est-elle fermée ou rechargée ? |

Quand la boîte noire a relevé une erreur, `Le jeu a planté` est **déjà coché** à l'ouverture de la section.

### Mode « Une idée »

| Raccourci | Étiquette | Questions posées |
|---|---|---|
| `Je n'ai pas compris` | `compris` | Quelle règle ? Où l'as-tu cherchée (Guide, carte, bandeau) ? Qu'est-ce que tu croyais ? |
| `C'est trop dur` | `dur` | Quelle île, quel moment ? Qu'as-tu essayé ? Tu es resté bloqué combien de temps ? |
| `C'est trop facile` | `facile` | Quelle île, quel moment ? Qu'est-ce qui ne te demandait aucun effort ? |
| `Ce serait plus simple si…` | `simple` | Quel geste te coûte ? Combien de fois par partie tu le fais ? |

`Je n'ai pas compris` mérite une note : ce n'est ni un pépin ni une idée, mais c'est le retour le plus précieux d'un
testeur. Une règle qu'on n'a pas comprise est un défaut du jeu, pas du joueur — et personne ne le signale
spontanément, parce qu'on croit toujours que c'est soi qui a mal lu. Lui donner un bouton, c'est le seul moyen de
l'entendre.

---

## 9. Ce que je n'ai pas mis dans l'arbre, et pourquoi

| Écarté | Raison |
|---|---|
| Les onze espèces de faune, une par une | Quatrième niveau. La feuille est `Faune`, l'espèce est la première question. |
| Les treize tuiles rares, une par une | Idem : treize tuiles pour un cas rare, contre une question qui coûte une ligne. |
| Les douze règles de saison, une par une | Idem. La feuille `La règle annoncée` les nomme toutes dans sa question — il reconnaît la sienne sans descendre. |
| Les vingt améliorations d'Atelier | Idem. `Une amélioration d'Atelier` + « laquelle, quel niveau ? ». |
| Les huit contrats, les quatre semis | Idem. |
| Une branche « Mode test » | Il ne joue pas en mode test. Le rapport dit déjà si le mode était actif. |
| Une branche par mode de jeu (Campagne, Jardin, Île du jour, Infinie) | Le rapport porte déjà le mode. Le classer à la main serait lui faire répéter ce que le jeu sait. |
| Gravité, priorité, étapes de reproduction | Formulaire d'entreprise. C'est le correcteur qui priorise, pas le testeur. |

La règle qui a tranché à chaque fois : **une feuille de plus coûte un écran à traverser, une question de plus coûte
une ligne à lire.** À information égale, la question gagne.

