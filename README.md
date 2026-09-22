# Cent Saisons — L'île qui se souvient

> Une île s'est éteinte : sable, roche, silence. Tu es la Saison, l'esprit qui la remet en marche. Tuile après tuile, tu redessines forêts, prés, hameaux et rivières ; les saisons passent, les animaux reviennent, et l'île se souvient.

Puzzle de placement de tuiles hexagonales, contemplatif et stratégique, jouable dans un navigateur, en français. Campagne de cinquante îles en dix chapitres, Île du jour, Île infinie, Jardin (pose libre), Atelier des saisons (améliorations), sauvegarde locale et en ligne, reprise d'une partie laissée en plan. Le décor est composé par région (forêts continues, massifs, villages avec ruelles et sentiers), la météo et la vie sur les tuiles animent l'île. Autour, la mer : profondeur au large, écume qui suit la côte, vagues qui changent avec la saison et l'orage, un voilier qui passe et une baleine qui fait surface. Sans geste pendant huit secondes, l'interface s'efface et la vue respire.

## Jouer

Le jeu est un site statique : aucune installation, aucune compilation, aucune dépendance.

- **En ligne** : servez le dépôt tel quel. GitHub Pages fonctionne directement (tous les chemins sont relatifs, `index.html` à la racine).
- **En local** : depuis la racine du dépôt, lancez un serveur statique puis ouvrez l'adresse indiquée.

```bash
python3 -m http.server 8080
# puis http://localhost:8080/
```

Navigateurs pris en charge : Chrome, Firefox et Edge à jour sur ordinateur, Chrome Android et Safari iOS sur téléphone et tablette. Le son se lance après la première interaction (règle des navigateurs).

**Sur téléphone** : l'interface se réorganise (file de tuiles en bas en portrait, en colonne en paysage, vœux derrière un bouton). Toucher une case affiche ses points, toucher à nouveau (ou le bouton « Poser ici ») pose la tuile ; un doigt déplace la vue, deux doigts zooment. Le bouton plein écran est dans le menu, la pause et en haut à droite en jeu. Sur iPhone, où le plein écran n'existe pas dans Safari, ajoutez le jeu à l'écran d'accueil (Partager → Sur l'écran d'accueil) : il s'ouvre alors sans barre de navigateur.

## Comment on joue

1. Une **tuile** est proposée (prairie, forêt, champ, hameau, verger, eau, marais, roche, sable, puis colline et lande plus loin dans la campagne). On la pose sur une case libre de l'île, collée à une tuile existante.
2. Chaque **bord** rapporte des points selon l'affinité des deux voisines (forêt–forêt, champ–hameau, verger–hameau, eau–marais…). Le jeu affiche les points de chaque bord avant de poser.
3. **Fermer une région** (encercler complètement un groupe de tuiles de même famille) déclenche une prime égale à sa taille (doublée pour les hameaux).
4. L'**eau** change de nature selon sa forme : une tuile seule est un étang, un tas est un lac, une ligne qui part d'une roche ou d'une colline est une rivière (+2 par tuile, +3 si elle atteint la mer).
5. Toutes les *N* poses, la **saison** change et modifie la valeur des tuiles : les marais fleurissent au printemps, les prés isolés sèchent en été, la récolte lie vergers et hameaux en automne, l'eau gèle en hiver et relie les hameaux pour la veillée. Dès l'île 4, chaque saison tire une **règle** parmi trois (Crue, Semailles ou Nichées au printemps ; Sécheresse, Grandes chaleurs ou Feux de broussaille en été ; Récolte, Foire ou Chasse en automne ; Veillée, Grand froid ou Redoux en hiver), annoncée dans la barre du haut (touchez la saison sur téléphone).
6. Les tuiles **changent d'aspect** avec la saison, la règle et la météo : arbres en fleurs et prés fleuris au printemps, nénuphars en été, tas de feuilles, paniers et cultures dorées en automne, congères et glace fissurée en hiver, bannières de foire, bois empilé par grand froid, flaques d'orage.
7. La **faune** s'installe quand un habitat existe (lapin dans les prés, élan dans les grandes forêts, ours près de la roche, hibou au-dessus des toits, canard sur l'eau, manchot sur la glace, grenouille au marais, chèvre au camp, poule entre hameau et champs, cheval sur les collines, vache en lisière de lande) et rapporte des points à chaque saison.
8. Dès l'île 6, les **vœux** des habitants donnent des objectifs à échéance : les exaucer rapporte des points, des souffles et une tuile rare (moulin, chapelle, tour de guet, puits, camp, puis grenier, fontaine et les tuiles d'événement).
9. Dès l'île 11, la **météo** peut annoncer un événement en début de saison, déclenché à la mi-saison : orage (rivières +2), canicule (sécheresse étendue), grand vent (forêts et vergers +1, moulins +3), bourrasque (file masquée) ou redoux (dégel).
10. Les **tuiles d'événement** (Marché, Fête, Ruine à restaurer) et les rares tardives (Auberge, Abreuvoir, Porche, Mine, Four à pain) arrivent par les vœux à partir des îles 5 et 8.
11. Dès l'île 16, on peut **bâtir** : poser une tuile sur une tuile de la même famille (1 souffle) la fait passer au niveau 2, ses bords valent +1 de plus, elle compte double dans sa région et son décor s'épaissit. Bâtir consomme la tuile sans remplir de case, sauf si elle est bien bâtie (région close, en sa saison, ou entourée d'au moins quatre tuiles de sa famille) : une tuile de la même famille revient alors dans la file. Dès l'île 31, une tuile de niveau 2 qui a traversé une saison se bâtit une seconde fois (2 souffles) : niveau 3, bords +2, +1 par saison et une signature par famille (forêt ancienne, pâturage, domaine, bourg, grand verger, eau profonde, tourbière, pic, dune, alpage, grande lande).
12. Dès l'île 21, on peut **fusionner** : poser une tuile sur une tuile d'une autre famille quand une recette existe (hameau + eau = port, champ + eau = rizière, hameau + champ = ferme, hameau + roche = fortin, roche + eau = cascade, forêt + roche = grotte, sable + eau = lagune). La tuile composée compte pour ses deux familles et rapporte à chaque saison ; la première réalisation d'une recette rend une tuile et une rare, et s'écrit dans le Cahier du Guide.
13. Une rivière qui s'élargit ne devient plus un lac d'un bloc : le tronc depuis la montagne reste une **rivière** (jusqu'à la première fourche incluse) et la suite devient un **lac** dans lequel elle se jette. Le pont ne se pose bien que sur une rivière entre deux hameaux ; la jetée du ponton part de la rive du hameau (sprites du Nature Kit de Kenney, CC0).
14. Dès l'île 26, des **ouvrages** arrivent dans la file (un toutes les seize poses, parfois en récompense d'un vœu) : ruche, épouvantail, ponton, pont, nichoir, feu de camp, menhir, compost. Chacun a sa bonne place, qui rapporte à chaque saison, et sa mauvaise place, qui coûte une saison, moitié la suivante, puis l'ouvrage s'efface. Posé tout de suite, il est **frais** (+1 par saison). Sans bonne place, on le met en **remise** (touche R), où il attend douze poses avant d'expirer, ou on le défausse gratuitement ; un second ouvrage remplace le premier.
15. Les **souffles** sont des pouvoirs limités, gagnés en fermant des régions, en exauçant des vœux, grâce à la faune (un souffle pour deux animaux à chaque saison) et par série de trois bons coups ; ils sont rares, chaque pouvoir est un renoncement : échanger la tuile avec la suivante, la défausser, faire bourgeonner une prairie en forêt ou en verger, annuler la dernière pose, garder une tuile en poche.
16. Dès l'île 4, avant chaque île, on choisit un **semis** : au gré des saisons (file telle quelle), terres hautes (plus de roche et de collines), fonds humides (plus d'eau et de marais) ou pays habité (plus de hameaux et de champs). Un penchant, pas une garantie : la file reste tirée au sort.
17. Dès l'île 16, la file devient une **main** : on joue n'importe quelle tuile visible en cliquant dessus (ou touches `2` à `5`), sans souffle. L'échange disparaît ; le Regard et la Longue-vue agrandissent la main.
18. Une pose qui **coûte des points** (bords et contraintes, total négatif) laisse une **friche** : ruine pour un hameau, lit asséché pour l'eau, terre morte ailleurs. Elle ne rapporte plus rien, ne compte plus pour sa famille (régions, vœux, faune) et ses bords ne valent rien pour les voisines. Bâtir dessus avec une tuile de la même famille la remet en état (1 souffle) : seuls ses bons voisins comptent alors, et elle peut fermer une région.
19. Dès le chapitre 2, on signe un **contrat d'archipel** à l'entrée de chaque chapitre, parmi trois (régions closes, animaux, vœux, coups parfaits, séries, tuiles bâties, fusions, ouvrages). Rempli sur les cinq îles du chapitre (le meilleur résultat de chaque île compte), il vaut deux étoiles pour la porte du chapitre suivant. Son avancement est rappelé sur la carte des îles, au départ de chaque île et au bilan.
20. La **Faucille** (Atelier, chapitre 3) permet de clore une saison une, deux ou trois poses avant son terme (bouton sous la saison ou touche `C`), quand les dernières poses ne rapportent plus.
24. Dès l'île 41, les tuiles **grandissent toutes seules** : une tuile entourée d'assez de voisines de sa propre famille pendant deux saisons passe au niveau 2 sans rien coûter. Le hameau devient un village (trois voisins suffisent), le verger se remplit (trois), la forêt, le champ et la prairie s'épaississent (quatre). Une saison avant, de jeunes pousses l'annoncent sur la tuile, et poser autre chose à côté annule la croissance. Au plus deux tuiles par changement de saison, jamais deux dans la même région. Le temps épaissit ; le niveau 3 et les signatures restent réservés à **bâtir**, et une tuile poussée par le temps ne compte pas pour le vœu qui demande de bâtir.
21. Les îles générées de la fin de campagne (36 à 49) portent chacune une **signature**, une contrainte écrite et annoncée à l'intro : les dunes, deux sources, les pierres dressées, le sud est un marais, un lac au milieu, les champs ouverts, une rivière la traverse déjà, la forêt profonde, sans une pierre, le pays des vergers, les saisons passent vite, deux villages qui se regardent, les saisons s'attardent, la file est courte. Leurs textes d'intro et de souvenir en parlent, et la voix du bilan et du souvenir tient compte de ce qu'on a bâti (une île de hameaux, d'eau ou de forêt).
22. Un toucher sur le compteur de points ouvre **d'où viennent les points** : le cumul par source (bords, régions fermées, saisons, faune, vœux, primes de pose, bâtir, fusions, ouvrages, séries) et le meilleur coup de la partie. Le bilan reprend ce détail.
23. La **carte postale** : au bilan et depuis le menu de pause (Jardin compris), l'île est rendue en grand (1600 × 1000) dans un cadre papier avec son nom, le chapitre, la saison, les étoiles, le score et la date, à télécharger en PNG ou à partager sur téléphone quand le navigateur sait partager un fichier.

Chaque pose reçoit un mot selon sa qualité par rapport au meilleur emplacement possible (de « Coup de maître ! » à « Il y avait mieux »), affiché dans un **ruban** sous la saison, un message à la fois, pendant que seuls les chiffres restent sur la case ; le compteur de points monte en tic-tac et un badge « +N » flotte à côté. Au changement de saison, aucune bulle : la caméra recule d'un cran, l'île change d'aspect, la règle s'écrit une seule fois dans le bandeau de saison, puis les points **volent** depuis chaque tuile qui rapporte (récolte, veillée, sentier, animal, ouvrage, fusion) jusqu'au compteur, qui ne monte qu'à leur arrivée. L'option « Relevé de saison » ajoute si on veut un relevé ligne à ligne (complet), le total seulement (bref, par défaut) ou rien. Chaque pose joue une **note par point** marqué, sur une gamme qui monte avec la série de bons coups, et un accord à la fermeture d'une région. Un coup est **bon** s'il vaut au moins 80 % du meilleur coup possible avec cette tuile, ou s'il n'en est qu'à deux points (les primes de fermeture ne servent pas d'étalon : garder une fermeture pour plus tard n'est pas une faute) ; un coup correct, entre 50 et 80 %, laisse la série où elle est, un coup faible la casse. Une **jauge de série** sous le score se remplit à chaque bon coup (un souffle à trois, fermeture doublée à cinq) et se vide quand la série casse. Les paliers de cent points sont salués ; c'est sans effet sur le score. Le paysage sonore lit l'île : les oiseaux suivent la forêt et les vergers, le ruisseau les rivières, les grillons les prés et les champs en été, le vent la roche et les collines, la mer le sable. Une île se termine quand elle est pleine ou quand aucune pose n'est possible : la caméra recule, visite trois ou quatre plans nommés, une vague salue le reste, les quatre saisons balaient l'île, puis la carte postale se fabrique autour du paysage et attend (« Voir le récapitulatif » ou « Enregistrer la carte » ; un toucher presse le pas). Le score donne 0 à 3 étoiles selon trois seuils propres à chaque île (45, 65 et 85 % de la médiane d'un joueur automatique qui anticipe ses coups, `tools/calibrate.js`) — échelle mesurée sur quatre niveaux de jeu simulés : le jeu au hasard rend 43 % de cette médiane, un joueur tranquille 66 %, le meilleur coup immédiat 73 %, affichés sous les points pendant la partie ; son score entier vaut l'**étoile d'or**, cosmétique : une graine, l'île brille sur la carte, rien pour la porte de chapitre. Les étoiles, les vœux et les îles rapportent des **graines**, à dépenser dans l'Atelier des saisons entre deux îles.

## Contrôles

| Action | Commande |
|---|---|
| Poser la tuile | survol puis clic gauche |
| Bâtir (dès l'île 16) | survol d'une tuile de même famille puis clic gauche (sur téléphone : deux touchers) |
| Poser un ouvrage (dès l'île 26) | survol d'une tuile posée puis clic gauche (deux touchers sur téléphone) ; R ou clic sur l'ouvrage : remise |
| Fusionner (dès l'île 21) | survol d'une tuile d'une autre famille avec une recette, puis clic gauche (deux touchers sur téléphone) |
| Déplacer la vue / zoomer | clic droit glissé / molette |
| Échanger avec la 2e ou 3e tuile (avant l'île 16) | `2` / `3` |
| Jouer une tuile de la main (dès l'île 16) | clic sur la tuile, ou `2` à `5` |
| Défausser | `X` |
| Bourgeonner une prairie | `B`, puis `F` (forêt) ou `V` (verger) |
| Annuler la dernière pose | `Z` |
| Mettre en poche / reprendre | `P` |
| Journal des événements | `J` (ou le bouton ⓘ en haut) |
| Fiche de la tuile à poser | `H` (ou l'option Fiche de la tuile) |
| Clore la saison (Faucille) | `C`, ou le bouton sous la saison |
| Pause | `Échap` |
| Couper le son | `M` |

## Modes

- **Campagne** : cinquante îles en dix chapitres de cinq. Les douze îles dessinées à la main sont les îles-souvenirs (récit, fragments), placées à leur chapitre ; les trente-huit autres sont générées (taille, climat, file, vœux tirés d'une réserve) avec un nom et deux lignes d'intro. Chaque chapitre ajoute une mécanique : prise en main (1–5), vœux, souffles et rares (6–10), météo, collines et landes (11–15), bâtir (16–20), climat chaud et fusions (21–25), climat humide et ouvrages (26–30), climat froid et niveau 3 (31–35), tous les climats (36–40), grandes îles (41–45), Cent saisons (46–50). Terminer une île ouvre la suivante, avec ou sans étoile : aucune île ne peut arrêter la campagne. Les étoiles ne gardent que la porte entre deux chapitres, et cette porte a deux clés — six étoiles sur les quinze du chapitre (le contrat d'archipel en vaut deux), ou huit parties terminées dans le chapitre, les cinq îles comprises ; la seconde s'atteint en jouant, donc personne ne reste bloqué. Dès le chapitre 5, chaque archipel a son **climat** : chaud (eau posée +2, étangs et vergers plus riches, été double, mais prés qui sèchent dès le printemps et pas de gel), humide (prés jamais secs, rivières et lacs +1, orages fréquents, mais hameau contre marais −2 et sentiers courts), froid (veillée +1, bois de chauffage chaque hiver, hiver double, mais champs dormants dès l'automne et pas de floraison). Le climat teinte l'île et se lit à côté de la saison. La première île est un tutoriel guidé pas à pas, puis chaque mécanique nouvelle est présentée sur l'île qui l'introduit.
- **Île infinie** : l'île grandit à chaque pose, sans fin ; le score et le nombre de saisons sont enregistrés.
- **Île du jour** : une île générée depuis la date, la même pour tout le monde, trois vœux tirés au sort, météo active ; meilleur score du jour et série de jours conservés.
- **Jardin** : pose libre, choix de la tuile, sans saisons ni score : pour composer.
- **Atelier des saisons** : dix-neuf améliorations permanentes achetées en graines, ouvertes chapitre par chapitre (regard et patience au chapitre 1 ; souffle de départ, poche et semence rare au 2 ; source, refuge et almanach au 3 ; charpente, semence forte et seconde chance au 4 ; alambic et manteau au 5 ; talisman, grande remise et fraîcheur au 6 ; maître d'œuvre au 7 ; longue-vue et étoile du soir ensuite). Les suivantes restent visibles, grisées, avec leur chapitre.
- **Guide** : depuis le menu ou la pause, toutes les tuiles avec leurs bonnes et mauvaises paires, les saisons, la faune, les tuiles rares, les souffles, les vœux et les graines.

## Options et mode test

Entre deux tuiles posées, il n'y a plus de trait : les sols se fondent le long des bords (la roche et la colline gardent leur arête) ; l'option « Grille discrète » redessine un fin contour. Le menu Options règle les volumes (général, musique, ambiance, effets), la coupure du son, le tremblement de l'écran, l'affichage des images par seconde, le plein écran et l'effacement de la progression.

Le **mode test** déverrouille toutes les îles, l'Île infinie et le Jardin, et active des touches de débogage : `F1` informations, `F2` file de tuiles, `F3` saison suivante, `F4` +10 souffles, `F5` terminer l'île. Les scores ne sont pas enregistrés en mode test.

## Structure du projet

```
index.html            point d'entrée
css/                  thème papier clair (base, menu, HUD, disposition mobile)
src/core/             moteur générique : boucle, scènes, scène logique (bureau / mobile), entrées souris et tactile, audio, sauvegarde, chargement
src/data/             tuiles et affinités, équilibrage, îles, améliorations, narration
src/game/             grille hexagonale, plateau, règles, saisons, faune, vœux, file, île, caméra, rendu, effets, HUD, tutoriel
src/ui/               menu, options, crédits, écrans narratifs, bilan, atelier, pause
assets/img/           tuiles (2×, quatre saisons), faune, effets, icônes + manifest.json
assets/audio/         musiques, ambiances, effets (OGG) + manifest.json
assets/fonts/         Lora et Quicksand (WOFF2, SIL OFL)
assets/credits/       sources et licences (JSON) lues par l'écran des crédits
tools/                pipelines d'assets (images, audio, polices, crédits, rendus 3D KayKit)
tests/                tests du modèle (Node) et bot de parcours (Playwright)
JOURNAL_DE_BORD.md    document de référence du projet (vision, GDD, DA, décisions, journal)
CREDITS.md            crédits complets générés
```

## Succès

Trente-trois succès à débloquer (écran « Succès » du menu), rangés par famille : prise en main, eau et saisons, faune, habitants et vœux, bâtir, campagne, ailleurs. Chacun rapporte une graine. Ceux qui se comptent (dix coups de maître, vingt tuiles bâties, cinquante vœux…) affichent leur progression ; trois restent cachés jusqu'à leur obtention. Au déblocage, une bannière glisse depuis le haut avec la vignette, des éclats et un jingle pizzicato (Kenney Music Jingles, CC0). Les vignettes sont composées par le pipeline d'images à partir des tuiles et sprites du jeu (`assets/img/succes/`).

Les vœux d'une île se présentent avant la première pose (donneur, demande, objectif, échéance, récompense) avec un bouton « C'est parti » ; ils restent affichés à droite pendant la partie.

## Sauvegarde en ligne

Au premier lancement, le jeu propose trois façons d'entrer : **Continuer avec Google** (la partie suit le joueur sur
tous ses appareils), **Jouer sans compte** (connexion anonyme : rien n'est demandé, la partie est gardée en ligne sous
un identifiant tiré au sort, et peut être rattachée à Google plus tard sans rien perdre) ou **Hors ligne seulement**
(rien ne sort de l'appareil). Le choix est retenu et se change dans les Options.

Quand deux parties existent, celle de l'appareil et celle en ligne, le jeu les affiche toutes les deux avec leur date,
leurs étoiles, leurs îles et leurs graines, et le joueur choisit : rien n'est jamais écrasé sans lui.

La connexion Google passe par une **fenêtre surgissante**, sur ordinateur comme sur téléphone. La redirection ne sert
que de secours, quand le navigateur bloque la fenêtre : elle ne revient pas de façon fiable lorsque le jeu est servi
depuis un autre domaine que Firebase (GitHub Pages), les navigateurs cloisonnant désormais le stockage entre sites.
Dans ce cas de secours, le choix est écrit **avant** de quitter la page et la connexion se termine au retour, au
lancement suivant. Si elle échoue, le jeu le dit en clair (domaine pas encore autorisé côté Firebase, connexion Google
pas activée, réseau, fenêtre fermée) et laisse toujours le choix de jouer sans compte ou hors ligne.

**La frugalité d'écriture est une contrainte de conception, pas un réglage.** Le palier gratuit de Firebase offre
20 000 écritures par jour pour tous les joueurs réunis ; une base qui s'écrit à chaque geste les épuise en quelques
minutes. Le jeu n'écrit donc qu'à la fin d'une île ou sur demande explicite, jamais pendant une partie, jamais dans la
boucle de rendu, et refuse d'écrire si rien n'a changé, si moins de trente secondes se sont écoulées, au-delà de trente
écritures par session ou deux cents par jour et par appareil (`src/data/firebase_config.js`). Une seule fiche par
joueur, une seule lecture au lancement, aucun écouteur temps réel. Sans réseau, quota épuisé ou panne, le jeu
fonctionne exactement comme avant et la sauvegarde locale fait foi. Les règles de sécurité sont dans `firestore.rules`.

Les clés Firebase de `src/data/firebase_config.js` sont **publiques par conception** : elles identifient le projet,
elles ne l'ouvrent pas. Ce sont les règles Firestore qui protègent les données.

### Ce qu'il faut avoir mis en place côté Firebase

Quatre choses, dans deux endroits différents de la console — c'est la source de confusion habituelle :

| Où | Quoi | Pourquoi |
|---|---|---|
| Authentication → Sign-in method | **Google** et **Anonyme** activés | sans ça, aucune connexion n'aboutit |
| Authentication → Settings → Authorized domains | le domaine du jeu (`…github.io`) | Google refuse de signer pour un site inconnu |
| Firestore Database | une base **nommée « (default) »** | le jeu ouvre la base par défaut ; une base portant un autre nom lui est invisible |
| Firestore Database → Règles | le contenu de `firestore.rules`, publié | les clés étant publiques, les règles sont la **seule** chose qui protège les sauvegardes |

Attention à un piège de la syntaxe Firestore : `request.resource` n'existe **que** pour une création ou une
modification. Sur une lecture ou un effacement il vaut `null`, et une règle qui s'appuie dessus échoue — donc refuse
tout. Écrites en une seule ligne (`allow read, write: if … && request.resource…`), ces règles laissent passer
l'écriture et bloquent la lecture : la partie part en ligne et ne revient jamais. Les trois cas sont donc séparés dans
`firestore.rules`, et `tests/firestore_rules.mjs` les joue dans l'émulateur Firebase — seize cas, les bons comme les
mauvais.

Le jeu écrit une fiche par joueur dans la collection `parties`, dont l'identifiant est celui du joueur : la règle
« chacun lit et écrit la sienne, et rien d'autre » suffit donc à tout protéger. Ne pas laisser la base en « mode test » :
ses règles expirent au bout de trente jours et tout cesse de fonctionner sans prévenir.

En cas de doute, **Options → Partie en ligne → Vérifier la connexion** contrôle les cinq points d'affilée (réseau, SDK,
projet, connexion, base et règles) et nomme celui qui coince.

## Sauvegarde

La progression est gardée dans le navigateur (localStorage, clé `cent-saisons.save`, JSON versionné avec migration). Elle ne quitte pas l'appareil : **Options → Sauvegarde → Télécharger ma sauvegarde** produit un fichier `cent-saisons-AAAA-MM-JJ.json` à garder (Fichiers, Drive, mail) et **Charger une sauvegarde** le relit sur n'importe quel appareil, après confirmation. Le jeu rappelle de faire une copie après cinq îles, ou une semaine, ou dès la troisième île tant qu'aucune copie n'a été faite. À chaque écriture, l'état précédent est conservé en copie de secours et relu si la sauvegarde devient illisible. Sur iPhone, ajouter le jeu à l'écran d'accueil évite l'effacement des données de site après sept jours sans visite (télécharger la sauvegarde avant, la charger dans le jeu installé après).

### Reprendre une partie en cours

Quitter l'application au milieu d'une île ne fait plus perdre la partie. Dès la mise en pause, quand l'onglet passe en arrière-plan
(téléphone verrouillé, appel, application fermée) et toutes les cinq secondes en jeu, l'île en cours est rangée dans le navigateur
(clé `cent-saisons.run`, 4 à 12 Ko). Au retour, le menu propose **« Reprendre »** avec le nom de l'île et le nombre de tuiles posées :
le plateau, la saison, le score, les souffles, les vœux, la faune et **les tuiles à venir** sont exactement ceux qu'on avait laissés.
Seule l'ardoise du Souvenir (annulation) repart vide. La partie gardée reste sur l'appareil : elle n'est **jamais** envoyée en ligne.
Elle est oubliée quand l'île se termine, quand on recommence, quand on ouvre une autre île, au bout d'un mois, ou si l'île ne peut plus
être reconstruite (l'Île du jour de la veille).

## Tests

Deux vitesses : `tools/suite.sh court` (~3 min, les quatre tests Node et `gate.js` en fumée) avant chaque
poussée ; `tools/suite.sh complet` (~25 min, toute la suite navigateur en plus) quand le changement touche
les règles, le score, la sauvegarde, l'interface ou la tournée finale. Le détail, test par test :

```bash
node tests/rules.test.js          # règles, fermetures, couverture narrative, bot glouton sur les 14 îles, bot fort sur les premières
node tests/run.test.js            # reprise d'une partie laissée en plan (sérialisation, file de tuiles, rangement local)
node tests/resume.js              # reprise dans un vrai navigateur (onglet caché, rechargement, bouton « Reprendre »)
node tests/signin.js              # écran de connexion : pas de boucle au retour d'une connexion Google
node tests/gate.js                # déblocage : une île terminée ouvre la suivante, portes de chapitre à deux clés
node tests/feel.js                # retours sensoriels : notes sobres sur téléphone, étoile franchie, vibrations
node tests/calm.js                # mode repos (interface qui s'efface, vue qui respire) et vague de fermeture
node tests/finale.js              # tournée finale : plans nommés, vague, saisons, carte postale qui attend, version courte

# règles de sécurité Firestore, dans l'émulateur Firebase (outillage hors du jeu, à installer une fois) :
mkdir -p /tmp/fb && cd /tmp/fb && npm i firebase-tools@13 @firebase/rules-unit-testing@3 firebase
cp <dépôt>/firestore.rules <dépôt>/tests/firestore_rules.mjs .
echo '{"firestore":{"rules":"firestore.rules"},"emulators":{"firestore":{"port":8181},"ui":{"enabled":false}}}' > firebase.json
./node_modules/.bin/firebase emulators:exec --project demo-cent-saisons "node firestore_rules.mjs"
node tools/calibrate.js 4 1-50 --write   # calibrage des étoiles : bot fort (tests/bot.js) et glouton, 4 graines par île, écrit src/data/campaign_stars.js
node tests/autoplay.js 1-12,infinite,garden   # parcours réel dans Chromium (serveur statique sur le port 8765 requis)
node tests/mobile.js                          # émulation téléphone (iPhone 12 portrait/paysage, Pixel 7) : tactile, captures
```

## Assets et licences

Les feuillus, les arbres nus d'hiver et les rochers viennent du **Forest Nature Pack** de KayKit, dont chaque modèle existe en huit palettes : les couleurs de saison sont donc celles de l'auteur, pas une recoloration. Tous les graphismes, sons et musiques proviennent de banques libres (Kenney CC0, KayKit / Kay Lousberg CC0, Kevin MacLeod CC BY 4.0, Freesound CC0, OpenGameArt CC0, FluidR3_GM CC BY 3.0, Google Fonts SIL OFL). Les bâtiments, les arbres et les rochers du plateau sont des **modèles 3D KayKit rendus en PNG isométriques** à la projection exacte de nos tuiles (`tools/render_kaykit.js`). Les animaux sont, eux, des modèles glTF (Quaternius CC0, Poly by Google CC BY 3.0) rendus de profil en bandes d'images par `tools/render_animals.js` : cinq espèces marchent pour de bon, le cycle avançant avec la distance parcourue. Chaque œuvre est listée avec son auteur, sa licence et sa source dans `CREDITS.md` et dans l'écran Crédits du jeu. Le code est publié sous licence MIT (`LICENSE`).
