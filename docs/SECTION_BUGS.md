# Pépins et idées — spécification

> Document de conception. Écrit avec le commanditaire, à partir du dépôt tel qu'il est au 21 septembre 2026
> (commit `1ddda12`). Aucune ligne de `src/` n'est touchée ici : ce document dit **quoi faire**, pas **où l'écrire**.

---

## 1. Le besoin, tel qu'il se présente

Un ami du commanditaire joue et essuie les plâtres, **au téléphone**. Quand il tombe sur un pépin, il prend
aujourd'hui une capture d'écran et l'envoie par message.

Ça marche, et c'est pénible **des deux côtés** : lui doit composer un message à chaque fois, et le commanditaire doit
traiter un fil de discussion qui mélange les pépins, les photos de vacances et le reste. Une capture, par-dessus le
marché, ne dit ni ce qu'il venait de faire, ni quelle tuile allait sortir, ni si le jeu a levé une erreur, ni sur
quelle version il joue. Elle montre le résultat, jamais la cause — et elle ne se rejoue pas.

**Le principe retenu :** une section **dans le jeu**. Le joueur écrit une phrase, touche *Envoyer*, et c'est fini
pour lui : pas de message, pas de pièce jointe, pas de compte à créer. Le rapport arrive **en issue GitHub**, dans un
dépôt privé que le commanditaire lit quand il veut, chaque pépin à sa place, avec tout ce qu'il faut pour le
reproduire.

---

## 2. Ce qu'on réemploie (et qu'il ne faut pas réinventer)

| Brique existante | Où | Ce qu'elle apporte au rapport |
|---|---|---|
| `RunSave` / `Island.serialize()` | `src/core/run.js`, `src/game/island.js:360` | **La pièce maîtresse.** 4 à 12 Ko qui contiennent le plateau, la file à venir, l'état des **deux** générateurs de hasard, la saison, les vœux, la faune, la météo. De quoi *rejouer* le bug, pas seulement le lire. |
| Journal de l'île | `src/game/hud.js:290` (`this.log`) | 200 entrées `{ text, kind, when }`, horodatées « saison · pose N ». C'est « ce qu'il faisait juste avant », déjà écrit, déjà en français. |
| `Cloud` | `src/core/cloud.js` | Le SDK chargé à la demande, la connexion (anonyme ou Google), les plafonds d'écriture, le compteur du jour (`dayCount`), les messages d'erreur en français. Tout est là : la section n'ajoute qu'un appel. |
| Carte postale | `src/game/postcard.js` | Le cadre papier (constantes `PAPER` / `INK`, bandeau, liseré) à reprendre pour habiller l'image du pépin. |
| Écran de vie privée | `src/ui/privacy.js` | La ligne de conduite et l'endroit où déclarer ce que fait la nouvelle section. |
| Bannière de déblocage | `celebrateThing()`, `src/ui/achievements.js:55` | Une bannière sobre qui glisse depuis le haut, file d'attente comprise. Sert telle quelle à proposer de raconter un plantage. |
| Export de sauvegarde | `src/ui/options.js` | Le modèle du couple « télécharger un fichier / relire un fichier », pour le secours et pour la relecture d'un rapport. |
| Classes de mise en page | `src/core/stage.js:23` (`.compact`, `.portrait`, `.landscape`, `.touch`) | Pour un bug de mise en page, ces classes + la taille de fenêtre + le `devicePixelRatio` valent mieux qu'une photo : elles remettent le correcteur dans la configuration exacte. |
| Règles Firestore et leur test | `firestore.rules`, `tests/firestore_rules.mjs` | Le modèle à suivre (cas séparés, émulateur) pour la collection des pépins. |

**Ce que le jeu ne sait pas faire, et qu'il ne faut pas prétendre :** se photographier en entier. L'île est sur le
`<canvas>` (capturable), mais le HUD — file, saison, vœux, boutons — est du DOM par-dessus. Le rendre en image
demanderait une bibliothèque tierce, exclue par le cahier des charges. Le rapport porte donc **l'île telle qu'elle
est à l'écran** plus **le contexte exact de mise en page**, qui reproduit un bug d'interface bien mieux qu'une photo.

---

## 3. Le chemin, de son pouce à ton écran

```
  Téléphone de l'ami                    Firebase (déjà en place)          GitHub (dépôt privé)
 ┌────────────────────┐                ┌──────────────────────┐        ┌─────────────────────┐
 │ Section « pépin »  │   1 écriture   │  collection pepins   │  relève│  une issue par pépin│
 │ une phrase, Envoyer│ ─────────────► │  (rapport + image)   │ ──────►│  + la partie en     │
 └────────────────────┘                └──────────────────────┘  toutes│    pièce versionnée │
         │ hors ligne                            ▲                les 2│                     │
         ▼                                       │                 h ou└─────────────────────┘
   deux fichiers téléchargés            le document est effacé        à la demande
                                        une fois l'issue ouverte
```

Trois choses à retenir :

- **Le jeu n'écrit jamais dans GitHub.** Il ne le peut pas : il faudrait un jeton d'accès dans le code d'un site
  public, donc un jeton volé dans la journée. Firebase fait le facteur.
- **Une écriture Firestore par pépin.** À comparer aux 20 000 par jour du palier gratuit : invisible. Aucune lecture
  côté jeu.
- **Rien ne s'accumule chez nous.** Le document Firestore est effacé dès que l'issue est ouverte. Le rapport vit dans
  GitHub, et nulle part ailleurs.

---

## 4. Décisions arrêtées avec le commanditaire

| Décision | Alternatives pesées | Raison |
|---|---|---|
| **Le rapport part vers GitHub, en passant par Firebase** | Message par `navigator.share` ; issue pré-remplie par lien ; `mailto:` ; presse-papiers | Le message est justement ce qu'on veut supprimer, des deux côtés. L'issue pré-remplie exigerait un **compte GitHub** de l'ami (barrière réelle) et plafonne vers 8 Ko d'URL : la partie rejouable n'y tiendrait pas. Firebase est déjà branché et son budget absorbe un pépin sans broncher. |
| **Les issues vont dans un dépôt privé dédié** (`cent-saisons-bugs`, à créer) | Le dépôt du jeu ; basculer le dépôt du jeu en privé | Le dépôt du jeu est **public** : une issue y exposerait les mots de l'ami, son modèle de téléphone, ses réglages et sa progression à tout internet. Le basculer en privé casserait GitHub Pages (qui demande un compte payant sur un dépôt privé). |
| **Le workflow vit dans le dépôt privé**, pas dans celui du jeu | Workflow dans `Madec01/claude` avec un jeton personnel en secret | Dans son propre dépôt, le `GITHUB_TOKEN` automatique suffit : **aucun jeton personnel à créer, à stocker ni à faire expirer**. Et le dépôt du jeu reste le dépôt du jeu : pas de workflow, pas de secret. |
| **En secours : le téléchargement, rien d'autre** | Lien vers une issue pré-remplie ; garder le pépin pour plus tard | Le lien réintroduirait le compte GitHub. Garder le pépin en attente ferait traîner des données sur l'appareil sans garantie de départ. Deux fichiers téléchargés, une phrase qui dit quoi en faire : franc et fini. |
| **La partie rejouable part par défaut**, décochable | À cocher ; toujours, sans case | C'est ce qui distingue un rapport utile d'une phrase. Elle ne contient que son île — aucune donnée personnelle. La case existe quand même : l'écran vie privée montre ce qui part, il ne le cache pas. |
| **Une bannière sobre après un plantage**, une seule fois | Rien du tout ; une pastille sur le bouton Pause | Une erreur qui tue l'onglet ne se signale jamais autrement. La bannière des succès existe déjà et sait s'effacer toute seule. |
| **Le mot du jeu : « pépin »** | « bug » ; « Quelque chose ne va pas ? » ; « Nous avons trébuché » | Double sens : l'ennui et la graine. Dans un jeu où les graines sont la monnaie, le mot est chez lui, il dédramatise, et il tient sur un bouton en portrait. |
| **La section prend aussi les idées**, par un sélecteur à deux positions en haut de l'écran | Une section à part pour les suggestions ; ne prendre que les pépins | Un testeur mélange toujours « ça bugue » et « ce serait mieux si ». Une section qui ne prend que les bugs récolte des idées tordues en bugs — ou rien. Un sélecteur coûte un toucher à celui qui a une idée, et **zéro** à celui qui signale un pépin, puisqu'il est déjà dessus. L'arbre de tuiles est le même : seules les questions changent (`SECTION_BUGS_TUILES.md` § 0). |
| **Une seule question obligatoire** | Un formulaire à rubriques (type, gravité, étapes de reproduction…) | *Complète et simple d'utilisation* : la complétude vient de ce que le jeu joint tout seul, pas de ce qu'on fait taper au pouce. |
| **Aucune adresse demandée** | Champ e-mail facultatif pour recontacter | Le commanditaire connaît son testeur. Demander une adresse serait collecter sans motif. |

---

## 5. La section, dans le jeu

### 5.1 Trois portes d'entrée, pas plus

1. **Menu de pause** — un bouton `Pépins et idées` sur la ligne qui porte déjà *Guide*, *Options*, *Carte postale*
   (`src/ui/pause.js`). C'est là qu'on va quand ça coince en jeu, et c'est la porte principale.
2. **Options** — une entrée pour les pépins hors partie (menu, Atelier, Guide, Succès).
3. **Après un plantage** — au lancement suivant, la bannière `celebrateThing` dit une fois : *« Nous avons
   trébuché. »* Elle est cliquable et ouvre la section **déjà remplie de l'erreur**. Une seule fois par erreur.

### 5.2 L'écran, en entier

Un seul écran, qui tient sur un téléphone en portrait **sans défiler**. Panneau DOM classique
(`showUI(node, 'panel-wrap')`), comme la carte postale ou la vie privée.

```
┌───────────────────────────────────────┐
│  Pépins et idées                      │   ← .panel-title
│  [ Un pépin ● ][  Une idée  ]         │   ← sélecteur, « Un pépin » par défaut
│                                       │
│  Il nous arrive de trébucher.         │   ← .ws-intro, la voix de l'île
│  Raconte-nous ce que tu as vu :       │
│  nous emportons le reste.             │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │ Qu'est-ce qui s'est passé ?     │  │   ← <textarea>, 3 lignes
│  │                                 │  │      (pas de focus auto si .touch :
│  │                                 │  │       le clavier mangerait l'écran)
│  └─────────────────────────────────┘  │
│                                       │
│  ( ça s'est bloqué ) ( c'est mal placé )  ← pastilles, facultatives, un toucher
│  ( le compte est faux ) ( autre )     │      44 px de haut minimum
│                                       │
│  ▸ Ce qui part avec ce pépin          │   ← replié par défaut
│                                       │
│            [ Envoyer ]                │
│                Retour                 │
└───────────────────────────────────────┘
```

**Règles de l'écran :**

- Le `<textarea>` n'est **jamais obligatoire**. Un rapport sans phrase vaut mieux qu'un rapport jamais envoyé : le
  jeu joint déjà l'essentiel. Le bouton reste actif, et le texte devient « (sans commentaire) ».
- Les pastilles sont des **boutons**, pas un `<select>` : un `<select>` sur téléphone ouvre une roulette et coûte
  trois gestes. Une seule à la fois, elle se déselectionne au second toucher, rien n'est obligatoire. Elles
  deviendront les étiquettes de l'issue.
- Le pli **« Ce qui part avec ce pépin »** liste en clair, une ligne par pièce, avec une case pour la partie et une
  pour l'image. Tout est coché par défaut. C'est la traduction concrète de la ligne de conduite de `privacy.js` :
  montrer, pas cacher. Ici, plus encore qu'avant : le rapport **quitte vraiment l'appareil**.
- **Aucun champ e-mail, aucun nom, aucun identifiant.**

### 5.3 Ce qui se passe au toucher d'« Envoyer »

1. Le rapport est composé (§ 6), l'image est rendue et compressée (§ 6.2).
2. Si le joueur n'a **aucune connexion en ligne** (choix « Hors ligne seulement », réseau absent, SDK bloqué) :
   les deux fichiers sont **téléchargés**, et l'écran dit en une phrase quoi en faire. Fin.
3. Sinon, **une** écriture dans la collection `pepins` (§ 7). En cas de refus (quota, plafond de l'appareil, panne),
   on retombe sur le téléchargement : jamais d'échec muet.
4. L'écran remercie et affiche **le code court** : *« C'est parti. Ton pépin porte le code PÉPIN-7K3Q. »*
5. Le drapeau d'erreur en attente est consommé.

**Plafond par appareil : cinq pépins par jour.** En réemployant `dayCount` de `cloud.js`. Un doigt qui s'emballe ne
peut pas entamer le budget d'écriture de la sauvegarde, qui partage le même quota Firebase.

---

## 6. Ce que contient un rapport

Un objet JSON, `version: 1`. Champ par champ :

| Champ | Contenu | D'où il vient | Pourquoi |
|---|---|---|---|
| `mode` | `pepin` ou `idee` | le sélecteur du haut | Sépare ce qui est cassé de ce qui est souhaité, dès l'étiquette. |
| `code` | `7K3Q` | tiré à l'envoi (§ 6.1) | Nommer un pépin dans une conversation. Devient le titre de l'issue. |
| `at` | horodatage ISO | `new Date()` | Ordre d'arrivée, recoupement. |
| `mot` | la phrase du joueur | `<textarea>` | Ce qu'il a vu, dans ses mots. |
| `genre` | `bloque` / `place` / `compte` / `autre` / `null` | pastille | Devient l'étiquette de l'issue. |
| `version` | version du jeu | `VERSION` de `src/ui/menu.js` | **Voir § 10 : à corriger, elle est figée à `v1.0`.** |
| `ou` | scène : `menu`, `island`, `workshop`, `story`, `results`, `credits` | `scenes.currentName` | Un pépin hors partie n'a pas d'île. |
| `ile` | `{ id, nom, chapitre, mode, semis, climat, saison, poses, score, souffles }` | `scene.def`, `scene.isl` | Lisible d'un coup d'œil sans ouvrir la partie. |
| `journal` | les **30 dernières** entrées du journal de l'île | `hud.log.slice(-30)` | Le fil des derniers gestes. Au-delà, le rapport grossit sans rien apprendre. |
| `erreurs` | jusqu'à 3 : `{ message, source, ligne, colonne, pile (4 lignes), scene, quand }` | boîte noire (§ 8) | La cause, quand il y en a une. |
| `appareil` | `{ ua, largeur, hauteur, dpr, classes, plein_ecran, langue }` | `navigator`, `STAGE`, classes de `<html>` | Reproduire une mise en page. `classes` = `compact portrait touch`. |
| `reglages` | `Save.options` | `Save.options` | « Chez moi le relevé de saison ne s'affiche pas » : la réponse est souvent là. |
| `progression` | `{ ile_debloquee, etoiles, graines, ameliorations, contrats }` | résumé de `Save.campaign` | Un pépin de déblocage se lit ici. **Résumé, pas la sauvegarde entière.** |
| `partie` | le `RunSave` complet (`{ where, title, isl }`) | la partie du moment (`RunSave.read()`, ou `isl.serialize()` en direct), **ou l'une des trois dernières jouées** (`RunSave.history()`) | **La pièce qui permet de rejouer.** Décochable, et choisie dans une liste dès qu'il y en a plusieurs : un pépin se raconte souvent l'île finie, quand la partie du moment est vide. |
| `pistes` | les fichiers où regarder, déduits des tuiles choisies (`CODE` de `bug_tree.js`) | `pistesFor(tuiles)` | **Jamais montré au joueur.** C'est du renseignement pour qui corrigera : le relevé en fait la section « Où regarder » de l'issue, et ça fait gagner la demi-heure passée à chercher le bon fichier. |
| `nuage` | `{ mode, etat }` : `google` / `anon` / `none`, et `ready` / `quota` / `error` | `Cloud.status()` | Comprendre un pépin de sauvegarde, sans identifiant. |

**Ce qui n'y est jamais :** aucune adresse e-mail, aucun nom Google, aucun `uid` Firebase, aucune position, aucun
identifiant d'appareil fabriqué par nous. `Cloud.status()` expose un `user` : **n'en prendre que `anonymous` et
l'état**, jamais `uid` ni `name`. Le document Firestore lui-même ne porte pas l'`uid` : la règle exige seulement que
l'écrivain soit connecté, elle n'a pas besoin de savoir qui.

### 6.1 Le code court

Quatre caractères tirés dans `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (ni `I`, ni `O`, ni `0`, ni `1` : on les dicte par
message). Affiché après l'envoi, écrit dans l'image, dans le rapport et dans le titre de l'issue. Il n'est enregistré
nulle part sur l'appareil : il vit dans le rapport, c'est tout.

### 6.2 L'image

**Une capture du `<canvas>` vivant**, pas un nouveau rendu : `document.getElementById('game')` donne l'île
exactement telle qu'il la voit — son zoom, son cadrage, sa météo, sa case survolée, la lettre-boîte comprise. Un
rendu façon carte postale recadrerait l'île et effacerait précisément ce qui cloche.

> Aucun souci de `canvas` teinté : tous les assets sont servis en chemins relatifs, depuis le même domaine.

On lui ajoute un **bandeau papier** repris de `postcard.js` (mêmes `PAPER`, `INK`, même liseré) portant la phrase, le
code, l'île, la saison et la pose, la version, l'appareil en une ligne.

**Puis on la réduit** : largeur 900 px maximum, `toBlob('image/jpeg', 0.6)` — de 60 à 120 Ko au lieu de 400 à 800.
Un document Firestore plafonne à 1 Mio et le rapport voyage avec ; la qualité suffit largement pour voir une tuile
mal posée. Si malgré tout le rapport dépasse le plafond de la règle, **l'image est abandonnée et le reste part** :
la partie rejouable vaut mieux qu'une photo.

Hors partie (menu, Atelier), le canvas porte le fond d'île du menu : l'image est alors surtout un porte-texte, et
c'est très bien.

**Ou celle que le joueur apporte** (`imageFichier`) : une capture de son téléphone, une photo de l'écran. C'est la
réponse au « je ne sais pas photographier le HUD » ci-dessus — sa capture, elle, montre la file, la saison, les
vœux et les boutons. Même largeur, même bandeau, même encodage que la capture du jeu : un relevé ne fait pas la
différence. **Une seule image part avec un rapport** (le document Firestore n'a qu'un champ `image`) : choisir une
image décoche la capture de l'écran, et l'écran le dit. Une capture de téléphone en haute résolution peut à elle
seule dépasser le plafond de la règle : la qualité descend alors par paliers (0,6 → 0,45 → 0,3) plutôt que de
perdre l'image que le joueur a choisie.

> Une image illisible ne part **pas** en silence : l'envoi s'arrête et l'écran propose d'en choisir une autre ou
> de la retirer.

---

## 7. Firebase : la collection `pepins`

### 7.1 Le document

Une seule forme, quatre champs, aucun autre :

```
pepins/{tiré au sort}
  code    : '7K3Q'
  at      : 1758445920000
  rapport : '<le JSON du § 6, en chaîne>'      // ~10 à 30 Ko
  image   : '<jpeg en base64>' (facultatif)     // ~80 à 160 Ko
```

Le rapport est une **chaîne**, comme l'est déjà la sauvegarde dans `parties` : c'est ce qui rend la règle de taille
simple à écrire et à vérifier.

### 7.2 Les règles

À ajouter dans `firestore.rules`, **en gardant les cas séparés** — le piège du § 8 du journal de bord (`request.resource`
vaut `null` hors écriture, donc une règle en une ligne refuse toute lecture) vaut ici aussi :

```
// les pépins : on en dépose, on n'en lit aucun. La relève passe par le SDK admin, qui ignore ces règles.
match /pepins/{pepin} {
  allow create: if request.auth != null
    && request.resource.data.keys().hasOnly(['code', 'at', 'rapport', 'image'])
    && request.resource.data.rapport is string
    && request.resource.data.rapport.size() < 120000
    && (!('image' in request.resource.data) || request.resource.data.image.size() < 300000);
  allow read, update, delete: if false;
}
```

Un joueur peut déposer, jamais relire ni modifier ni effacer — ni le sien, ni celui d'un autre. Le workflow, lui,
passe par le SDK d'administration, qui n'est pas soumis aux règles.

### 7.3 Ce que ça coûte, et ce qui pourrait mal tourner

- **Une écriture par pépin.** Sur 20 000 par jour, pour tous les joueurs réunis. Négligeable.
- **Abus.** Le jeu est public : n'importe qui peut se connecter anonymement et déposer. La règle borne la taille, le
  jeu borne à cinq par jour et par appareil, mais rien n'empêche quelqu'un de contourner le jeu. Le pire cas : le
  quota d'écriture du jour est épuisé — **et alors la sauvegarde en ligne cesse d'écrire elle aussi**, puisqu'elles
  partagent le même quota. Le jeu continue de fonctionner (la sauvegarde locale fait foi), mais c'est le seul
  couplage désagréable de ce montage, et il faut le connaître.
- **L'interrupteur.** Un drapeau dans `src/data/firebase_config.js` (`CLOUD.pepins = true`) coupe le dépôt en un
  commit, sans toucher au reste. À prévoir dès le premier jour.
- **Ménage.** Le workflow efface chaque document après l'avoir transformé en issue. Pour le cas où il serait en
  panne, une règle de durée de vie Firestore (TTL sur `at`, gratuite, à poser une fois dans la console) évite qu'un
  rapport oublié traîne plus d'un mois.

---

## 8. La boîte noire

**Constat :** il n'y a aujourd'hui **aucun** `window.onerror` ni `unhandledrejection` dans tout le dépôt (vérifié ;
seul `src/main.js:945` attrape l'échec de démarrage). Une erreur en jeu part dans une console que le joueur n'ouvrira
jamais. C'est le meilleur rapport qualité/prix de toute cette section.

**Ce qu'il faut :** un petit module qui garde **les trois dernières erreurs**, chacune avec message, source, ligne,
quatre lignes de pile, la scène en cours et l'heure.

- Il écoute `window.onerror` et `unhandledrejection`.
- Il garde une copie dans `localStorage` (clé `cent-saisons.pepin`, plafonnée). **C'est là qu'est tout l'intérêt** :
  une erreur qui tue l'onglet ne peut pas être racontée depuis la page morte. Au lancement suivant, la copie est
  relue et la bannière propose.
- Il ne change **rien** au comportement du jeu : il n'avale pas l'erreur, il n'affiche rien pendant la partie, il
  n'écrit rien en ligne de lui-même. Le jeu continue exactement comme avant.
- La même erreur répétée en boucle ne compte qu'une fois (même message + même ligne).
- La copie est effacée quand le pépin est envoyé, ou après deux lancements où la bannière a été ignorée.

---

## 9. La relève : du nuage aux issues

### 9.1 Où elle vit

Dans un **dépôt privé dédié**, à créer : `Madec01/cent-saisons-bugs`. Il ne contient que le workflow, le script de
relève et les images relevées. Le dépôt du jeu n'y gagne **ni workflow, ni secret** — il reste le dépôt du jeu.

Ce choix a une raison précise : dans son propre dépôt, le workflow utilise le `GITHUB_TOKEN` fourni automatiquement
par GitHub Actions. **Aucun jeton personnel à créer, à stocker, ni à renouveler quand il expire.** Un workflow logé
dans le dépôt public aurait eu besoin d'un jeton personnel en secret pour écrire ailleurs.

### 9.2 Ce qu'il faut mettre en place (une fois)

| Où | Quoi |
|---|---|
| GitHub | Créer le dépôt **privé** `cent-saisons-bugs`. |
| Console Firebase → Paramètres → Comptes de service | *Générer une nouvelle clé privée* : un fichier JSON. |
| Dépôt privé → Settings → Secrets → Actions | Le coller dans un secret `FIREBASE_SERVICE_ACCOUNT`. |
| Dépôt privé | `.github/workflows/pepins.yml` et `releve.mjs` (§ 9.3). |
| Console Firebase → Firestore → Règles | Ajouter le bloc `pepins` du § 7.2 et publier. |

La clé de compte de service donne un accès complet au projet Firebase : elle ne va **que** dans les secrets GitHub,
jamais dans le dépôt du jeu, jamais dans le code du jeu.

### 9.3 Ce que fait le workflow

Déclenché **toutes les heures** (à une minute décalée, pour ne pas tomber pile à l'heure avec le reste du
monde) et **à la demande** (`workflow_dispatch`) quand le commanditaire veut les voir tout de suite. Permissions :
`issues: write`, `contents: write` — les siennes, rien de plus.

Pour chaque document de `pepins`, du plus ancien au plus récent, vingt au maximum par passage :

1. Écrire l'image dans `rapports/AAAA-MM/PEPIN-XXXX.jpg` et la valider en un seul commit pour tout le lot.
2. Ouvrir une issue :
   - **titre** : `PÉPIN-7K3Q · « le score reste à zéro » · île 12`, ou `IDÉE-7K3Q · …` selon le mode.
   - **étiquettes** : `pépin` ou `idée` ; le chemin des tuiles choisies, à ses trois niveaux (`graphisme`,
     `graphisme/sprites`, `graphisme/sprites/foret`) ; le raccourci touché s'il y en a un ; `plantage` s'il y a une
     erreur ; `avec-partie` si la partie rejouable est là.
   - **corps** : la phrase en premier, puis l'île, la version et l'appareil en tableau, puis le lien vers l'image,
     puis les erreurs, puis le journal des trente derniers événements, puis la partie rejouable **repliée** dans un
     `<details>` — elle est longue et on ne la lit pas, on la copie.
3. Effacer le document Firestore. **Seulement si l'issue a bien été créée** : sinon le document reste et repassera au
   tour suivant.

> **Une limite honnête sur l'image.** Dans un dépôt privé, GitHub n'affiche pas une image de dépôt directement dans
> le corps d'une issue (l'affichage en ligne passe par un relais qui n'a pas ton accès). Le corps portera donc un
> **lien** vers l'image, à un clic — qui s'ouvre normalement puisque tu es connecté. C'est le prix du dépôt privé,
> et il est modeste.

> **Un piège de calendrier.** GitHub désactive les workflows programmés d'un dépôt resté **soixante jours sans
> activité**. Un dépôt de rapports peut très bien rester muet deux mois. Deux parades : la relève à la demande
> (qui réveille tout), ou un commit automatique mensuel dans le même workflow. À décider à l'usage ; le signaler
> dans le README du dépôt privé suffit pour commencer.

---

## 10. Côté commanditaire : rejouer un pépin

Sans cela, le reste ne paie pas. Dans **Options → Mode test**, une entrée `Ouvrir un rapport` :

1. Coller le contenu du `<details>` de l'issue, ou choisir un fichier de rapport.
2. Afficher ce qu'il contient — la phrase, l'île, la version, les erreurs, le journal — **sans rien appliquer**, sur
   le modèle de `Save.inspect()` dans `options.js`.
3. Un bouton `Rejouer cette partie` écrit le `RunSave` du rapport dans `localStorage` et appelle le chemin de reprise
   existant (`Game.defFromWhere` puis `Game.resumeRun`, `src/main.js:281`). Le correcteur se retrouve dans l'île, à
   sa pose, avec sa file à venir et le même hasard.

Tout est déjà écrit : c'est un écran de lecture et un appel. Réservé au mode test, il n'encombre personne.

---

## 11. Deux réglages à faire au passage

- **La version est figée.** `VERSION = 'v1.0'` en dur dans `src/ui/menu.js:14` : deux rapports à trois semaines
  d'écart diront tous les deux « v1.0 ». Il faut y coller quelque chose qui bouge — un numéro incrémenté à chaque
  ligne du journal de bord, ou une date de publication. Sans ça, le champ `version` du rapport ne sert à rien, et
  c'est l'un des premiers réflexes quand on trie des pépins.
- **Le clavier sur téléphone.** Le `<textarea>` ne doit pas prendre le focus automatiquement quand `html.touch` est
  posé : le clavier monterait et mangerait la moitié de l'écran avant qu'il ait lu la première phrase.

---

## 12. Vie privée

Le rapport **quitte l'appareil** : c'est nouveau, et ça doit être dit. Il passe par Firebase (Google, en Europe,
comme la sauvegarde) et finit dans un dépôt GitHub **privé** que seul le commanditaire lit. Rien n'y est collecté qui
ne serve à corriger : pas d'adresse, pas de nom, pas d'identifiant, pas de position. Le document Firestore est
effacé dès que l'issue est ouverte.

Ligne à ajouter dans `src/ui/privacy.js`, dans la liste existante :

> **Si tu signales un pépin ou envoies une idée** — Le rapport part avec ta phrase, l'île en cours, ce que tu venais
> de faire, ton modèle de téléphone et l'erreur s'il y en a une. Il passe par Google, comme ta sauvegarde, puis
> arrive dans un carnet privé que seul l'auteur du jeu peut lire, et il est aussitôt effacé de chez Google. Tu vois
> tout avant d'envoyer, et tu peux retirer la partie ; une idée ne l'emporte jamais. Aucune adresse, aucun nom :
> rien qui dise qui tu es.

---

## 13. Les textes

La voix de l'île parle au « nous » et tutoie le joueur. Rien d'un formulaire d'entreprise.

| Endroit | Texte |
|---|---|
| Bouton (pause, options) | `Pépins et idées` |
| Titre de l'écran | `Pépins et idées` |
| Sélecteur | `Un pépin` · `Une idée` |
| Accroche en mode idée | `Tu vois quelque chose qui nous manque ? Dis-le-nous : nous avons tout notre temps.` |
| Accroche | `Il nous arrive de trébucher. Raconte-nous ce que tu as vu : nous emportons le reste.` |
| Champ | `Qu'est-ce qui s'est passé ?` |
| Pastilles | `ça s'est bloqué` · `c'est mal placé` · `le compte est faux` · `autre` |
| Pli | `Ce qui part avec ce pépin` |
| Lignes du pli | `Ta phrase` · `L'île en image` · `La partie, pour la rejouer` (et `Laquelle ?` dès qu'il y en a plusieurs) · `Les trente derniers événements` · `L'erreur, s'il y en a eu une` · `L'image que tu ajoutes, si tu en ajoutes une` · `Ton téléphone et la version du jeu` · `Tes réglages et ta progression` |
| Sous le pli | `Rien de tout cela ne dit qui tu es.` |
| Bouton d'envoi | `Envoyer` |
| Après l'envoi | `C'est parti. Ton pépin porte le code PÉPIN-7K3Q — garde-le si tu veux en reparler.` |
| Repli hors ligne | `Tu joues hors ligne : le pépin ne peut pas partir tout seul. Les deux fichiers viennent d'être téléchargés — envoie-les quand tu veux.` |
| Repli quota | `Le nuage se repose. Les deux fichiers viennent d'être téléchargés : rien n'est perdu.` |
| Plafond atteint | `Cinq pépins aujourd'hui, c'est déjà beaucoup. Le prochain repartira demain — celui-ci vient d'être téléchargé.` |
| Bannière (kicker) | `Nous avons trébuché` |
| Bannière (nom) | `La dernière fois, quelque chose s'est cassé` |
| Bannière (description) | `Touche ici pour nous raconter — nous avons gardé ce qu'il faut.` |

---

## 14. Ce qu'il faudra vérifier

- **Les règles, dans l'émulateur** — en étendant `tests/firestore_rules.mjs`, qui joue déjà seize cas : un joueur
  connecté peut déposer un pépin ; un joueur **ne peut pas** en lire un, le modifier ni l'effacer, ni le sien ni
  celui d'un autre ; un rapport trop gros est refusé ; un document qui porte un champ de plus est refusé.
- **Un contrôle de fuite** — un rapport fabriqué avec un compte Google connecté ne contient ni `uid`, ni `name`, ni
  adresse. À écrire comme une assertion, pas comme une relecture à l'œil.
- **Un test du rapport lui-même** (Node, sur le modèle de `tests/run.test.js`) : un rapport composé à partir d'une
  île jouée contient bien la partie, se relit, et la partie rejouée rend **exactement** la même suite de tuiles —
  c'est le même contrôle que celui qui garde la reprise de partie.
- **Un test en émulation téléphone** (sur le modèle de `tests/mobile.js` et `tests/decouverte.js`) : l'écran tient
  sans défiler en portrait sur iPhone 12 et Pixel 7, aucune pastille ni bouton rogné, le clavier ne monte pas tout
  seul, le pli s'ouvre et se referme, la case « partie » se décoche et le rapport s'allège d'autant.
- **La boîte noire** : une erreur levée pendant une partie est attrapée, le jeu continue, la copie survit à un
  rechargement, et la bannière ne se montre qu'une fois.
- **La chaîne entière, une fois, en vrai** : un pépin envoyé depuis un téléphone ressort en issue dans le dépôt
  privé, avec son image et sa partie, et le document Firestore a bien disparu.

---

## 15. Ce qui reste ouvert

- **Le nom du dépôt privé** (`cent-saisons-bugs` est une proposition).
- **La cadence de relève** (une heure) est un pari. Si tu veux les pépins plus vite, la relève à la demande est là ;
  descendre sous l'heure ne servirait qu'à consommer des minutes d'Action pour rien.
- **Le nombre d'entrées de journal joint** (30) est un pari raisonnable, pas une mesure. À ajuster après les
  premiers vrais rapports.
- **Les pastilles de genre** sont facultatives et pourraient ne jamais être touchées. Si c'est le cas après quelques
  semaines, les retirer plutôt que les rendre obligatoires : *simple d'abord*.
- **Le couplage de quota** entre les pépins et la sauvegarde en ligne (§ 7.3) est le seul point de fragilité du
  montage. Si le jeu s'ouvre un jour à d'autres joueurs que le cercle proche, il faudra soit un projet Firebase
  séparé pour les pépins, soit couper le dépôt et revenir au fichier.
