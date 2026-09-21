# Signaler un pépin — spécification

> Document de conception. Écrit avec le commanditaire, à partir du dépôt tel qu'il est au 21 septembre 2026
> (commit `1ddda12`). Aucune ligne de `src/` n'est touchée ici : ce document dit **quoi faire**, pas **où l'écrire**.

---

## 1. Le besoin, tel qu'il se présente

Un ami du commanditaire joue et essuie les plâtres, **au téléphone**. Quand il tombe sur un pépin, il fait
aujourd'hui la chose la plus naturelle du monde : il prend une capture d'écran et l'envoie par message.

C'est un bon réflexe, et il ne faut surtout pas le remplacer. Mais une capture ne dit ni ce qu'il venait de faire, ni
quelle tuile allait sortir, ni si le jeu a levé une erreur, ni sur quelle version il joue. Elle montre le résultat,
jamais la cause — et elle ne se rejoue pas.

**Le principe retenu :** le joueur écrit **une phrase**, le jeu joint **tout le reste**, et le rapport part par
**sa messagerie à lui**, dans la conversation qu'il utilise déjà. Nous n'hébergeons rien, nous ne demandons rien.

---

## 2. Ce qu'on réemploie (et qu'il ne faut pas réinventer)

| Brique existante | Où | Ce qu'elle apporte au rapport |
|---|---|---|
| `RunSave` / `Island.serialize()` | `src/core/run.js`, `src/game/island.js:360` | **La pièce maîtresse.** 4 à 12 Ko qui contiennent le plateau, la file à venir, l'état des **deux** générateurs de hasard, la saison, les vœux, la faune, la météo. De quoi *rejouer* le bug, pas seulement le lire. |
| Journal de l'île | `src/game/hud.js:290` (`this.log`) | 200 entrées `{ text, kind, when }`, horodatées « saison · pose N ». C'est « ce qu'il faisait juste avant », déjà écrit, déjà en français. |
| Carte postale | `src/game/postcard.js`, `src/ui/postcard.js` | Le cadre papier (constantes `PAPER` / `INK`, bandeau haut et bas) et surtout **le chemin de sortie déjà éprouvé** : `canvas.toBlob` → `File` → `navigator.share({ files })`, avec repli sur le téléchargement. |
| Écran de vie privée | `src/ui/privacy.js` | La ligne de conduite et l'endroit où déclarer ce que fait la nouvelle section. |
| Bannière de déblocage | `celebrateThing()`, `src/ui/achievements.js:55` | Une bannière sobre qui glisse depuis le haut, file d'attente comprise. Sert telle quelle à proposer de raconter un plantage. |
| Export de sauvegarde | `src/ui/options.js` | Le modèle du couple « télécharger un fichier / relire un fichier », à copier pour la relecture d'un rapport. |
| Classes de mise en page | `src/core/stage.js:23` (`.compact`, `.portrait`, `.landscape`, `.touch`) | Pour un bug de mise en page, ces quatre classes + la taille de fenêtre + le `devicePixelRatio` valent mieux qu'une photo : elles remettent le correcteur dans la configuration exacte. |

**Ce que le jeu ne sait pas faire, et qu'il ne faut pas prétendre :** se photographier en entier. L'île est sur le
`<canvas>` (capturable), mais le HUD — file, saison, vœux, boutons — est du DOM par-dessus. Le rendre en image
demanderait une bibliothèque tierce, exclue par le cahier des charges. **La capture d'écran du joueur reste donc le
bon outil pour un bug d'interface**, et l'écran doit l'y inviter en une ligne au lieu de faire semblant.

---

## 3. Décisions arrêtées avec le commanditaire

| Décision | Alternatives pesées | Raison |
|---|---|---|
| **Le rapport part par la messagerie du joueur** (`navigator.share`), pas par un serveur | Firebase (collection `bugs`), `mailto:`, issue GitHub pré-remplie, presse-papiers | C'est le geste qu'il fait déjà. Zéro écriture au budget Firebase, zéro règle nouvelle, zéro donnée qui traîne chez nous. GitHub exige un compte qu'il n'a pas ; `mailto:` tombe sur une application mail parfois absente ; le presse-papiers ne porterait qu'un résumé, jamais la partie. |
| **La partie rejouable part par défaut**, décochable | À cocher ; toujours, sans case | C'est ce qui distingue un rapport utile d'une phrase. Elle ne contient que son île — aucune donnée personnelle. La case existe quand même : l'écran vie privée montre ce qui part, il ne le cache pas. |
| **Une bannière sobre après un plantage**, une seule fois | Rien du tout ; une simple pastille sur le bouton Pause | Une erreur qui tue l'onglet ne se signale jamais autrement. La bannière des succès existe déjà et sait s'effacer toute seule. |
| **Le mot du jeu : « Signaler un pépin »** | « Signaler un bug », « Quelque chose ne va pas ? », « Nous avons trébuché » | Double sens : l'ennui et la graine. Dans un jeu où les graines sont la monnaie, le mot est chez lui, il dédramatise, et il tient sur un bouton en portrait. |
| **Une seule question obligatoire** | Un formulaire à rubriques (type, gravité, étapes de reproduction…) | *Complète et simple d'utilisation* : la complétude vient de ce que le jeu joint tout seul, pas de ce qu'on fait taper au pouce. |
| **Aucune adresse demandée** | Champ e-mail facultatif pour recontacter | Il envoie par sa messagerie : le canal de réponse **est** la conversation. Demander une adresse serait collecter sans motif. |

---

## 4. Le parcours du joueur

### 4.1 Trois portes d'entrée, pas plus

1. **Menu de pause** — un bouton `Signaler un pépin` sur la ligne qui porte déjà *Guide*, *Options*, *Carte postale*
   (`src/ui/pause.js`). C'est là qu'on va quand ça coince en jeu, et c'est la porte principale.
2. **Options** — une entrée dans le groupe *Sauvegarde* ou son propre petit groupe, pour les pépins hors partie
   (menu, Atelier, Guide, Succès).
3. **Après un plantage** — au lancement suivant, la bannière `celebrateThing` dit une fois :
   *« La dernière fois, nous avons trébuché. »* / *« Toucher pour nous raconter. »* La bannière est cliquable et ouvre
   la section, **déjà remplie de l'erreur**. Une seule fois par erreur (drapeau consommé à l'ouverture ou au
   lancement suivant).

### 4.2 L'écran, en entier

Un seul écran, qui tient sur un téléphone en portrait **sans défiler**. Panneau DOM classique
(`showUI(node, 'panel-wrap')`), comme la carte postale ou la vie privée.

```
┌───────────────────────────────────────┐
│  Signaler un pépin                    │   ← .panel-title
│                                       │
│  Il nous arrive de trébucher.         │   ← .ws-intro, la voix de l'île
│  Raconte-nous ce que tu as vu :       │
│  nous emportons le reste.             │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │ Qu'est-ce qui s'est passé ?     │  │   ← <textarea>, 3 lignes, focus auto
│  │                                 │  │      (pas d'autofocus si .touch :
│  │                                 │  │       le clavier mangerait l'écran)
│  └─────────────────────────────────┘  │
│                                       │
│  ( ça s'est bloqué ) ( c'est mal placé )  ← pastilles, facultatives, un toucher
│  ( le compte est faux ) ( autre )     │      44 px de haut minimum
│                                       │
│  ▸ Ce qui part avec ce pépin          │   ← replié par défaut
│                                       │
│      [ Envoyer ]      Télécharger     │   ← primaire + secours discret
│                Retour                 │
└───────────────────────────────────────┘
```

**Règles de l'écran :**

- Le `<textarea>` n'est **jamais obligatoire**. Un rapport sans phrase vaut mieux qu'un rapport jamais envoyé : le
  jeu joint déjà l'essentiel. Le bouton reste actif, et le texte par défaut devient « (sans commentaire) ».
- Les pastilles sont des **boutons**, pas un `<select>` : un `<select>` sur téléphone ouvre une roulette et coûte
  trois gestes. Une seule pastille à la fois, elle se déselectionne au second toucher, et rien n'est obligatoire.
  Elles servent au tri, pas à la qualification.
- Le pli **« Ce qui part avec ce pépin »** liste en clair, une ligne par pièce, avec une case à cocher pour la partie
  et pour la capture de l'île. Tout est coché par défaut sauf mention contraire. C'est la traduction concrète de la
  ligne de conduite de `privacy.js` : montrer, pas cacher.
- Une ligne sous les boutons, discrète : *« Une capture de ton écran aide beaucoup pour un bouton mal placé :
  ajoute-la à ton message. »* C'est l'invitation explicite à faire ce qu'il fait déjà.
- **Aucun champ e-mail, aucun nom, aucun identifiant.**

### 4.3 Ce qui se passe au toucher d'« Envoyer »

1. Le rapport est composé (§ 5), l'image est rendue (§ 6.1).
2. `navigator.canShare({ files })` est interrogé :
   - **oui** → `navigator.share({ files, text })` : sa feuille de partage s'ouvre, il choisit la conversation.
   - **non, ou partage annulé, ou pas de `navigator.share`** → les deux fichiers sont **téléchargés**, et l'écran dit
     où ils sont et quoi en faire, en une phrase.
3. L'écran remercie et affiche **le code court** (§ 6.3) : *« C'est parti. Ton pépin porte le code PÉPIN-7K3Q. »*
4. Le drapeau d'erreur en attente est consommé.

---

## 5. Ce que contient un rapport

Un rapport est un objet JSON, `version: 1`. Champ par champ :

| Champ | Contenu | D'où il vient | Pourquoi |
|---|---|---|---|
| `code` | `PÉPIN-7K3Q` | tiré à l'envoi (§ 6.3) | Nommer un rapport dans une conversation. |
| `at` | horodatage ISO | `new Date()` | Recoller un rapport à un message. |
| `mot` | la phrase du joueur | `<textarea>` | Ce qu'il a vu, dans ses mots. |
| `genre` | `bloque` / `place` / `compte` / `autre` / `null` | pastille | Tri, facultatif. |
| `version` | version du jeu | `VERSION` de `src/ui/menu.js` | **Voir § 9 : à corriger, elle est figée à `v1.0`.** |
| `ou` | scène en cours : `menu`, `island`, `workshop`, `story`, `results`, `credits` | `scenes.currentName` | Un pépin hors partie n'a pas d'île. |
| `ile` | `{ id, nom, chapitre, mode, semis, climat, saison, poses, score, souffles }` | `scene.def`, `scene.isl` | Lisible d'un coup d'œil sans ouvrir la partie. |
| `journal` | les **30 dernières** entrées du journal de l'île | `hud.log.slice(-30)` | Le fil des derniers gestes. 30 suffisent : au-delà, le fichier grossit sans rien apprendre. |
| `erreurs` | jusqu'à 3 erreurs : `{ message, source, ligne, colonne, pile (4 lignes), scene, quand }` | boîte noire (§ 7) | La cause, quand il y en a une. |
| `appareil` | `{ ua, largeur, hauteur, dpr, classes, plein_ecran, langue, memoire? }` | `navigator`, `STAGE`, classes de `<html>` | Reproduire une mise en page. `classes` = `compact portrait touch`. |
| `reglages` | les options du joueur (`Save.options`) | `Save.options` | « Chez moi le relevé de saison ne s'affiche pas » : la réponse est souvent là. |
| `progression` | `{ ile_debloquee, etoiles, graines, ameliorations, contrats }` | résumé de `Save.campaign` | Un pépin de déblocage se lit ici. **Résumé seulement, pas la sauvegarde entière.** |
| `partie` | le `RunSave` complet (`{ where, title, isl }`) | `RunSave.read()`, ou `isl.serialize()` en direct | **La pièce qui permet de rejouer.** Décochable. Absente hors partie. |
| `nuage` | `{ mode, etat }` : `google` / `anon` / `none`, et `ready` / `quota` / `error` | `Cloud.status()` | Sans identifiant, sans adresse : juste de quoi comprendre un pépin de sauvegarde. |

**Ce qui n'y est jamais :** aucune adresse e-mail, aucun nom Google, aucun `uid` Firebase, aucune position, aucun
identifiant d'appareil fabriqué par nous. `Cloud.status()` expose un `user` : **il ne faut prendre que `anonymous`
et l'état**, jamais `uid` ni `name`.

Poids attendu : 10 à 30 Ko pour le `.txt`, 200 à 600 Ko pour l'image. Sans surprise pour un partage.

---

## 6. Le paquet, et comment il voyage

### 6.1 L'image — `cent-saisons-pepin-2026-09-21-1432-7K3Q.png`

**Une capture du `<canvas>` vivant**, pas un nouveau rendu. `document.getElementById('game').toDataURL('image/png')`
donne l'île exactement telle qu'il la voit : son zoom, son cadrage, sa météo, sa case survolée, la lettre-boîte
comprise. Un nouveau rendu façon carte postale recadrerait l'île et effacerait précisément ce qui cloche.

> Aucun souci de `canvas` teinté : tous les assets sont servis en chemins relatifs depuis le même domaine.

On lui ajoute dessous un **bandeau papier** repris de `postcard.js` (mêmes `PAPER`, `INK`, même liseré) qui porte :
la phrase du joueur, le code court, l'île et le chapitre, la saison et le numéro de pose, la version, l'appareil en
une ligne. Le code court est **dessiné dans l'image** : même recompressée par la messagerie, elle reste identifiable.

Hors partie (menu, Atelier), le canvas porte le fond d'île du menu : l'image est alors surtout un porte-texte, et
c'est très bien.

### 6.2 Les données — `cent-saisons-pepin-2026-09-21-1432-7K3Q.txt`

Le JSON du § 5, indenté, **avec l'extension `.txt` et le type `text/plain`**.

> **Pourquoi pas `.json`.** Safari iOS n'accepte au partage qu'une courte liste de types, et `application/json` n'en
> fait pas partie : `navigator.canShare` rend `false` et le partage échoue en entier. En `text/plain`, le fichier
> passe, arrive en pièce jointe intacte, et se relit exactement pareil. C'est laid, c'est efficace.
>
> **Pourquoi pas les données cachées dans le PNG.** On pourrait glisser le JSON dans un bloc `tEXt` du PNG et
> n'avoir qu'**un seul fichier** — l'image serait le rapport. Idée séduisante, écartée : les messageries
> **recompressent** les images envoyées en photo et effacent ces blocs. Le rapport arriverait vide. Deux fichiers,
> donc.

### 6.3 Le code court

Quatre caractères tirés dans `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (ni `I`, ni `O`, ni `0`, ni `1` : on les dicte par
message). Affiché après l'envoi, écrit dans l'image **et** dans le fichier. Sert à dire « celui d'hier » sans
ambiguïté. Il n'est enregistré nulle part : il vit dans le rapport, c'est tout.

### 6.4 Les trois replis, dans l'ordre

| Situation | Ce qui se passe |
|---|---|
| `navigator.share` absent (ordinateur de bureau, la plupart) | Les deux fichiers sont téléchargés, avec une phrase qui dit quoi en faire. |
| `canShare({ files })` refuse le `.txt` | On tente l'image seule au partage, et le `.txt` est téléchargé à côté. L'écran le dit. |
| Le joueur annule le partage | Rien ne se perd : l'écran reste ouvert, les boutons aussi. |

---

## 7. La boîte noire

**Constat :** il n'y a aujourd'hui **aucun** `window.onerror` ni `unhandledrejection` dans tout le dépôt (vérifié ;
seul `src/main.js:945` attrape l'échec de démarrage). Une erreur en jeu part dans une console que le joueur n'ouvrira
jamais. C'est le meilleur rapport qualité/prix de toute cette section.

**Ce qu'il faut :** un petit module qui garde **les trois dernières erreurs**, chacune avec message, source, ligne,
quatre lignes de pile, la scène en cours et l'heure.

- Il écoute `window.onerror` et `unhandledrejection`.
- Il garde une copie dans `localStorage` (clé `cent-saisons.pepin`, quelques Ko, plafonnée). **C'est là qu'est tout
  l'intérêt** : une erreur qui tue l'onglet ne pourrait pas être racontée depuis la page morte. Au lancement suivant,
  la copie est relue et la bannière propose.
- Il ne change **rien** au comportement du jeu : il n'avale pas l'erreur, il n'affiche rien pendant la partie, il
  n'écrit rien en ligne. Le jeu continue exactement comme avant.
- La même erreur répétée en boucle ne compte qu'une fois (même message + même ligne).
- La copie est effacée quand le rapport est envoyé, ou quand la bannière a été proposée et ignorée deux lancements
  de suite.

---

## 8. Côté commanditaire : rejouer un pépin

Sans cela, le reste ne paie pas. Dans **Options → Mode test**, une entrée `Ouvrir un rapport` :

1. Choisit un fichier `.txt` de rapport.
2. Affiche ce qu'il contient : la phrase, l'île, la version, les erreurs, le journal — **sans rien appliquer**, sur
   le modèle de `Save.inspect()` dans `options.js`.
3. Un bouton `Rejouer cette partie` écrit le `RunSave` du rapport dans `localStorage` et appelle le chemin de reprise
   existant (`Game.defFromWhere` puis `Game.resumeRun`, `src/main.js:281`). Le correcteur se retrouve dans l'île, à
   sa pose, avec sa file à venir et le même hasard.

Tout est déjà écrit : c'est un écran de lecture de fichier et un appel. Réservé au mode test, il n'encombre personne.

---

## 9. Deux réglages à faire au passage

- **La version est figée.** `VERSION = 'v1.0'` en dur dans `src/ui/menu.js:14` : deux rapports à trois semaines
  d'écart diront tous les deux « v1.0 ». Il faut y coller quelque chose qui bouge — un numéro incrémenté à la main à
  chaque ligne du journal de bord, ou une date de publication. Sans ça, le champ `version` du rapport ne sert à rien.
- **Le clavier sur téléphone.** Le `<textarea>` ne doit pas prendre le focus automatiquement quand `html.touch` est
  posé : le clavier monterait et mangerait la moitié de l'écran avant qu'il ait lu la première phrase.

---

## 10. Vie privée

Rien de nouveau n'est collecté, rien ne part sans un geste explicite, et **nous ne recevons rien directement** : le
rapport passe par la messagerie du joueur. Nous n'hébergeons aucun rapport, donc il n'y a rien à conserver ni à
effacer chez nous.

Ligne à ajouter dans `src/ui/privacy.js`, dans la liste existante :

> **Si tu signales un pépin** — Le rapport est fabriqué sur ton appareil et part par l'application de ton choix,
> à qui tu veux. Il contient ta phrase, l'île en cours, ce que tu venais de faire, ton modèle de téléphone et
> l'erreur s'il y en a une. Tu vois tout avant d'envoyer, et tu peux retirer la partie. Rien ne passe par nous.

---

## 11. Firebase : pourquoi on n'y touche pas

Le budget d'écriture est une contrainte de conception, pas un réglage (`src/data/firebase_config.js`) : 20 000
écritures par jour **pour tous les joueurs réunis**. Cette section n'en consomme **aucune**. Aucune règle Firestore
nouvelle, aucune collection nouvelle, aucun risque de régression sur la sauvegarde en ligne.

Si un jour le tri dans la messagerie devient pénible, la porte reste ouverte : une collection `bugs`, une écriture
par signalement, plafonnée sur l'appareil (cinq par jour suffisent) en réemployant le compteur `dayCount` de
`cloud.js`, et une règle `allow create` **seule** — jamais `read`, `update` ni `delete`, et en se souvenant du piège
du § 8 du journal de bord (`request.resource` vaut `null` hors écriture : les cas doivent rester séparés). Ce n'est
pas pour maintenant.

---

## 12. Les textes

La voix de l'île parle au « nous » et tutoie le joueur. Rien d'un formulaire d'entreprise.

| Endroit | Texte |
|---|---|
| Bouton (pause, options) | `Signaler un pépin` |
| Titre de l'écran | `Signaler un pépin` |
| Accroche | `Il nous arrive de trébucher. Raconte-nous ce que tu as vu : nous emportons le reste.` |
| Champ | `Qu'est-ce qui s'est passé ?` |
| Pastilles | `ça s'est bloqué` · `c'est mal placé` · `le compte est faux` · `autre` |
| Pli | `Ce qui part avec ce pépin` |
| Lignes du pli | `Ta phrase` · `L'île en image` · `La partie, pour la rejouer (4 à 12 Ko)` · `Les trente derniers événements` · `L'erreur, s'il y en a eu une` · `Ton téléphone et la version du jeu` · `Tes réglages et ta progression` |
| Sous les boutons | `Une capture de ton écran aide beaucoup pour un bouton mal placé : ajoute-la à ton message.` |
| Bouton d'envoi | `Envoyer` (et `Télécharger` en secours) |
| Après l'envoi | `C'est parti. Ton pépin porte le code PÉPIN-7K3Q — garde-le si tu veux en reparler.` |
| Repli téléchargement | `Ton navigateur ne sait pas partager de fichier. Les deux fichiers viennent d'être téléchargés : envoie-les comme tu enverrais une photo.` |
| Bannière (kicker) | `Nous avons trébuché` |
| Bannière (nom) | `La dernière fois, quelque chose s'est cassé` |
| Bannière (description) | `Touche ici pour nous raconter — nous avons gardé ce qu'il faut.` |

---

## 13. Ce qu'il faudra vérifier

- **Sur le téléphone de l'ami, avant toute autre chose** : que `navigator.canShare` accepte bien le couple
  PNG + `.txt`, et que le fichier arrive intact dans la conversation. C'est l'hypothèse dont dépend tout le reste et
  elle ne peut pas être vérifiée ailleurs que sur son appareil.
- **Un test en émulation téléphone** (sur le modèle de `tests/mobile.js` et `tests/decouverte.js`) : l'écran tient
  sans défiler en portrait sur iPhone 12 et Pixel 7, aucune pastille ni bouton rogné, le clavier ne monte pas tout
  seul, le pli s'ouvre et se referme, la case « partie » se décoche et le rapport s'allège d'autant.
- **Un test du rapport lui-même** (Node, sur le modèle de `tests/run.test.js`) : un rapport composé à partir d'une
  île jouée contient bien la partie, se relit, et la partie rejouée rend **exactement** la même suite de tuiles —
  c'est le même contrôle que celui qui garde la reprise de partie.
- **Un contrôle de fuite** : un rapport fabriqué avec un compte Google connecté ne contient ni `uid`, ni `name`, ni
  adresse. À écrire comme une assertion, pas comme une relecture à l'œil.
- **La boîte noire** : une erreur levée pendant une partie est attrapée, le jeu continue, la copie survit à un
  rechargement, et la bannière ne se montre qu'une fois.

---

## 14. Ce qui reste ouvert

- **Le classement des rapports côté commanditaire.** Ils arriveront dans une conversation, en vrac. Tant qu'il y en
  a peu, c'est très bien. Si ça devient une corvée, voir § 11.
- **Le nombre d'entrées de journal joint** (30) est un pari raisonnable, pas une mesure. À ajuster après les
  premiers vrais rapports.
- **Les pastilles de genre** sont facultatives et pourraient ne jamais être touchées. Si c'est le cas après quelques
  semaines, les retirer plutôt que les rendre obligatoires : *simple d'abord*.
