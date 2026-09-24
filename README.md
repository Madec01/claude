# Cent Saisons — L'île qui se souvient

> Une île s'est éteinte : sable, roche, silence. Tu es la Saison, l'esprit qui la remet en marche. Tuile après tuile, tu redessines forêts, prés, hameaux et rivières ; les saisons passent, les animaux reviennent, et l'île se souvient.

Puzzle de placement de tuiles hexagonales, contemplatif et stratégique, jouable dans un navigateur, en français. Campagne de trente îles en dix chapitres, Île du jour, Île infinie, Jardin (pose libre), Atelier des saisons (améliorations), sauvegarde locale et en ligne, reprise d'une partie laissée en plan. Le décor est composé par région (forêts continues, massifs, villages avec ruelles et sentiers), les surprises de saison et la vie sur les tuiles animent l'île. Autour, la mer : profondeur au large, écume qui suit la côte, vagues qui changent avec la saison et l'orage, un voilier qui passe et une baleine qui fait surface. Sans geste pendant huit secondes, l'interface s'efface et la vue respire.

## Jouer

Le jeu est un site statique : aucune installation, aucune compilation, aucune dépendance.

- **En ligne** : servez le dépôt tel quel. GitHub Pages fonctionne directement (tous les chemins sont relatifs, `index.html` à la racine).
- **En local** : depuis la racine du dépôt, lancez un serveur statique puis ouvrez l'adresse indiquée.

```bash
python3 -m http.server 8080
# puis http://localhost:8080/
```

Navigateurs pris en charge : Chrome, Firefox et Edge à jour sur ordinateur, Chrome Android et Safari iOS sur téléphone et tablette. Le son se lance après la première interaction (règle des navigateurs).

**À l'ouverture**, l'animation du studio Martinus Games joue par-dessus le chargement (4 s, un toucher la passe). Son jingle est dans le film : le navigateur l'accorde avec le son quand il connaît déjà le joueur, sinon le film joue en muet — la première visite est souvent muette, c'est la règle des navigateurs, pas un défaut.

**Les visites suivantes** viennent de l'appareil : un service worker (`sw.js`) garde images, sons et film une fois vus. Son cache porte la version des assets (`assets/version.json`, empreinte de leur contenu écrite par `tools/version_assets.py`, vérifiée par `tools/suite.sh`) et s'efface seul quand elle change ; le code, lui, est toujours pris sur le réseau quand il y en a. Le pied du menu montre la version du jeu et celle des assets ; Options → « Recharger à neuf » efface le cache sans toucher à la sauvegarde.

**Sur téléphone** : l'interface se réorganise (file de tuiles en bas en portrait, en colonne en paysage, vœux derrière un bouton). Toucher une case affiche ses points, toucher à nouveau (ou le bouton « Poser ici ») pose la tuile ; un doigt déplace la vue, deux doigts zooment. Le bouton plein écran est dans le menu, la pause et en haut à droite en jeu. Sur iPhone, où le plein écran n'existe pas dans Safari, ajoutez le jeu à l'écran d'accueil (Partager → Sur l'écran d'accueil) : il s'ouvre alors sans barre de navigateur.

## Comment on joue

1. Une **tuile** est proposée (prairie, forêt, champ, hameau, verger, eau, marais, roche, sable, puis colline et lande plus loin dans la campagne). On la pose sur une case libre de l'île, collée à une tuile existante.
2. Chaque **bord** rapporte des points selon l'affinité des deux voisines (forêt–forêt, champ–hameau, verger–hameau, eau–marais…). Le jeu affiche les points de chaque bord avant de poser.
3. **Fermer une région** (encercler complètement un groupe de tuiles de même famille) déclenche une prime égale à sa taille (doublée pour les hameaux).
4. L'**eau** change de nature selon sa forme : une tuile seule est un étang, un tas est un lac, une ligne qui part d'une roche ou d'une colline est une rivière (+2 par tuile, +3 si elle atteint la mer).
5. Toutes les *N* poses, la **saison** change et modifie la valeur des tuiles : les marais fleurissent au printemps, les prés isolés sèchent en été, la récolte lie vergers et hameaux en automne, l'eau gèle en hiver et relie les hameaux pour la veillée. Dès l'île 11, chaque saison qui arrive peut apporter une **surprise** à la place de sa règle de base (Semailles ou Nichées au printemps au lieu de la Crue ; Grandes chaleurs ou Feux de broussaille en été au lieu de la Sécheresse ; Foire ou Chasse en automne au lieu de la Récolte ; Grand froid ou Hiver doux au lieu de la Veillée), tirée au sort, active toute la saison et écrite dans la barre du haut (touchez la saison sur téléphone).
6. Les tuiles **changent d'aspect** avec la saison et sa règle : arbres en fleurs et prés fleuris au printemps, nénuphars en été, tas de feuilles, paniers et cultures dorées en automne, congères et glace fissurée en hiver, bannières de foire, bois empilé par grand froid. Certaines surprises ont leur habillage, sans effet sur le score : averses et éclairs des semailles, air qui tremble des grandes chaleurs et des feux, vent de foire, neige du grand froid, redoux de l'hiver doux.
7. La **faune** s'installe quand un habitat existe (lapin dans les prés, élan dans les grandes forêts, ours près de la roche, hibou au-dessus des toits, canard sur l'eau, manchot sur la glace, grenouille au marais, chèvre au camp, poule entre hameau et champs, cheval sur les collines, vache en lisière de lande) et rapporte des points à chaque saison.
8. Dès l'île 6, les **vœux** des habitants donnent des objectifs à échéance : les exaucer rapporte des points, des souffles et une tuile rare (moulin, chapelle, tour de guet, puits, camp, puis dès l'île 13 le grenier, la ruche et le menhir, qui rapportent à chaque saison selon leurs voisines).
11. Dès l'île 16, on peut **bâtir** : poser une tuile sur une tuile de la même famille (1 souffle) la fait passer au niveau 2, ses bords valent +1 de plus, elle compte double dans sa région et son décor s'épaissit. Bâtir consomme la tuile sans remplir de case, sauf si elle est bien bâtie (région close, en sa saison, ou entourée d'au moins quatre tuiles de sa famille) : une tuile de la même famille revient alors dans la file. Dès l'île 31, une tuile de niveau 2 qui a traversé une saison se bâtit une seconde fois (2 souffles) : niveau 3, bords +2, triple dans sa région, +1 par saison, et un nom selon sa famille (forêt ancienne, pâturage, domaine, bourg, grand verger, eau profonde, tourbière, pic, dune, alpage, grande lande), sans autre effet.
12. Dès l'île 21, on peut **fusionner** : poser une tuile sur une tuile d'une autre famille quand une recette existe (champ + eau = rizière, hameau + champ = ferme, hameau + roche = fortin, roche + eau = cascade, forêt + roche = grotte, sable + eau = lagune). La tuile composée compte pour ses deux familles et rapporte à chaque saison ; la première réalisation d'une recette s'écrit dans le Cahier du Guide.
13. Une rivière qui s'élargit ne devient plus un lac d'un bloc : le tronc depuis la montagne reste une **rivière** (jusqu'à la première fourche incluse) et la suite devient un **lac** dans lequel elle se jette.
15. Les **souffles** sont des pouvoirs limités, gagnés en fermant des régions (un) et en exauçant des vœux (deux) ; ils sont rares, chaque pouvoir est un renoncement : défausser la tuile (un), annuler la dernière pose (trois, une fois par saison), bâtir ou fusionner (un).
16. Dès l'île 4, avant chaque île, on choisit un **semis** : au gré des saisons (file telle quelle), terres hautes (plus de roche et de collines), fonds humides (plus d'eau et de marais) ou pays habité (plus de hameaux et de champs). Un penchant, pas une garantie : la file reste tirée au sort.
17. Dès l'île 6, la file devient une **main** : on joue n'importe quelle tuile visible en cliquant dessus (ou touches `2` à `5`), sans souffle. Le Regard de l'Atelier agrandit la main.
18. Une pose qui **coûte des points** (bords et contraintes, total négatif) laisse une **friche** : ruine pour un hameau, lit asséché pour l'eau, terre morte ailleurs. Elle ne rapporte plus rien, ne compte plus pour sa famille (régions, vœux, faune) et ses bords ne valent rien pour les voisines. Bâtir dessus avec une tuile de la même famille la remet en état (1 souffle) : seuls ses bons voisins comptent alors, et elle peut fermer une région.
24. Au chapitre 9 seulement (îles 25 à 27, « ici, le temps bâtit seul »), les tuiles **grandissent toutes seules** : une tuile entourée d'assez de voisines de sa propre famille pendant deux saisons passe au niveau 2 sans rien coûter. Le hameau devient un village (trois voisins suffisent), le verger se remplit (trois), la forêt, le champ et la prairie s'épaississent (quatre). Une saison avant, de jeunes pousses l'annoncent sur la tuile, et poser autre chose à côté annule la croissance. Au plus deux tuiles par changement de saison, jamais deux dans la même région. Le temps épaissit ; le niveau 3 et les signatures restent réservés à **bâtir**, et une tuile poussée par le temps ne compte pas pour le vœu qui demande de bâtir.
21. Les îles générées de la fin de campagne (36 à 49) portent chacune une **signature**, une contrainte écrite et annoncée à l'intro : les dunes, deux sources, les pierres dressées, le sud est un marais, un lac au milieu, les champs ouverts, une rivière la traverse déjà, la forêt profonde, sans une pierre, le pays des vergers, les saisons passent vite, deux villages qui se regardent, les saisons s'attardent, la file est courte. Leurs textes d'intro et de souvenir en parlent, et la voix du bilan et du souvenir tient compte de ce qu'on a bâti (une île de hameaux, d'eau ou de forêt).
22. Un toucher sur le compteur de points ouvre **d'où viennent les points** : le cumul par source (bords, régions fermées, saisons, faune, vœux, primes de pose, bâtir, fusions) et le meilleur coup de la partie. Le bilan reprend ce détail.
23. La **carte postale** : au bilan et depuis le menu de pause (Jardin compris), l'île est rendue en grand (1600 × 1000) dans un cadre papier avec son nom, le chapitre, la saison, les étoiles, le score et la date, à télécharger en PNG ou à partager sur téléphone quand le navigateur sait partager un fichier.

Chaque pose reçoit un mot selon sa qualité par rapport au meilleur emplacement possible (de « Coup de maître ! » à « Il y avait mieux »), affiché dans un **ruban** sous la saison, un message à la fois, pendant que seuls les chiffres restent sur la case ; le compteur de points monte en tic-tac et un badge « +N » flotte à côté. Au changement de saison, aucune bulle : la caméra recule d'un cran, l'île change d'aspect, la règle s'écrit une seule fois dans le bandeau de saison, puis les points **volent** depuis chaque tuile qui rapporte (récolte, veillée, sentier, animal, rare, fusion) jusqu'au compteur, qui ne monte qu'à leur arrivée. Chaque pose joue une **note par point** marqué, sur une gamme qui monte avec la série de bons coups, et un accord à la fermeture d'une région. Un coup est **bon** s'il vaut au moins 80 % du meilleur coup possible avec cette tuile, ou s'il n'en est qu'à deux points (les primes de fermeture ne servent pas d'étalon : garder une fermeture pour plus tard n'est pas une faute) ; un coup correct, entre 50 et 80 %, laisse la série où elle est, un coup faible la casse. La série de bons coups fait monter la gamme des notes, sans autre effet. Les paliers de cent points sont salués ; c'est sans effet sur le score. Le paysage sonore lit l'île : les oiseaux suivent la forêt et les vergers, le ruisseau les rivières, les grillons les prés et les champs en été, le vent la roche et les collines, la mer le sable. Une île se termine quand elle est pleine ou quand aucune pose n'est possible : la caméra recule, visite trois ou quatre plans nommés, une vague salue le reste, les quatre saisons balaient l'île, puis la carte postale se fabrique autour du paysage, reçoit ses **tampons** (l'insigne de l'archétype de l'île — celui de sa plus grande région : hameaux, aquatique, sauvage, montagneuse, nourricière ou littorale — et, sur l'île-souvenir qui ferme un chapitre, le sceau du chapitre ; des tampons encreurs, chacun posé un peu de travers, et chaque île garde son coup de tampon) et attend (« Voir le récapitulatif » ou « Enregistrer la carte » ; un toucher presse le pas). Le score donne 0 à 3 étoiles selon trois seuils propres à chaque île (45, 65 et 85 % de la médiane d'un joueur automatique qui anticipe ses coups, `tools/calibrate.js`) — échelle mesurée sur quatre niveaux de jeu simulés : le jeu au hasard rend 43 % de cette médiane, un joueur tranquille 66 %, le meilleur coup immédiat 73 %, affichés sous les points pendant la partie ; son score entier vaut l'**étoile d'or**, cosmétique et révélée au bilan seulement : une graine, l'île brille sur la carte, rien pour la porte de chapitre. Les étoiles, les vœux et les îles rapportent des **graines**, à dépenser dans l'Atelier des saisons, depuis le menu.

**L'interface.** Entre deux îles, deux écrans : l'**écran de départ** (le chapitre, le nom, deux lignes de récit, le semis à choisir et les vœux des habitants, puis « C'est parti ») et le **bilan** (étoiles, souvenir de l'île, d'où viennent les points source par source — récoltes, veillées, sentiers, faune, rares… —, carte postale) ; « Continuer » mène droit à l'écran de départ de l'île suivante. Pendant la partie, la barre du haut n'a que quatre blocs : la saison, les points, les souffles, la pause. Le nom de l'île, le journal et le plein écran sont dans la pause ; le compte des tuiles restantes est au-dessus de la file. Un seul canal de messages : tout s'écrit au journal de l'île, et seuls les messages qui demandent un regard (pose refusée, vœu, tuile rare) passent aussi dans le ruban, un à la fois.

## Contrôles

| Action | Commande |
|---|---|
| Poser la tuile | survol puis clic gauche |
| Bâtir (dès l'île 16) | survol d'une tuile de même famille puis clic gauche (sur téléphone : deux touchers) |
| Fusionner (dès l'île 21) | survol d'une tuile d'une autre famille avec une recette, puis clic gauche (deux touchers sur téléphone) |
| Déplacer la vue / zoomer | clic droit glissé / molette |
| Jouer une tuile de la main (dès l'île 6) | clic sur la tuile, ou `2` à `5` |
| Défausser | `X` |
| Annuler la dernière pose | `Z` |
| Journal de l'île | `J` (ou Pause → Journal de l'île) |
| Fiche de la tuile à poser (masquée par défaut) | `H` (ou le « ? » de la tuile en cours) |
| Pause | `Échap` |
| Couper le son | `M` |

## Modes

- **Campagne** : trente îles en dix chapitres de trois, chaque chapitre sur le schéma « nouveauté, pratique, souvenir ». Les douze îles dessinées à la main sont replacées dans les chapitres (récit, fragments) ; les dix-huit autres sont générées (taille, climat, file, vœux tirés d'une réserve) avec un nom et deux lignes d'intro. Chaque chapitre ajoute une mécanique : prise en main (1–3 : affinités, rivière et saisons, semis), vœux, souffles et rares (4–6), surprises de saison, collines et nouvelles rares (7–9), lande puis bâtir (10–12), climat chaud et fusions (13–15), climat humide (16–18), climat froid et niveau 3 (19–21), tous les climats (22–24), grandes îles où le temps bâtit seul — la croissance, ce chapitre seulement (25–27), Cent saisons (28–30). (La campagne a compté cinquante îles jusqu'au 24 septembre 2026 ; treize n'apportaient rien de neuf. Les vingt îles retirées, neuf signatures et quatre grandes îles sont gardées pour le Livre II ; une sauvegarde d'alors est migrée, ses îles retirées mises de côté, jamais effacées.) Terminer une île ouvre la suivante, avec ou sans étoile : aucune île ne peut arrêter la campagne. Les étoiles ne gardent que la porte entre deux chapitres, et cette porte a deux clés — quatre étoiles sur les neuf du chapitre, ou cinq parties terminées dans le chapitre, les trois îles comprises ; la seconde s'atteint en jouant, donc personne ne reste bloqué. Dès le chapitre 5, chaque archipel a son **climat** : chaud (eau posée +2, étangs et vergers plus riches, été double, mais prés qui sèchent dès le printemps et pas de gel), humide (prés jamais secs, rivières et lacs +1, mais hameau contre marais −2 et sentiers courts), froid (veillée +1, bois de chauffage chaque hiver, hiver double, mais champs dormants dès l'automne et pas de floraison). Le climat teinte l'île et se lit à côté de la saison. La première île est un tutoriel guidé pas à pas, puis chaque mécanique nouvelle est présentée sur l'île qui l'introduit.
- **Le Souffle court** (grande tuile du menu, après l'île 6) : le mode nerveux, à part. Pas de file : la tuile arrive et un cadran de trois secondes se vide autour d'elle ; à zéro elle est perdue et sa case restera vide (malus à la fin, plus fort si la case bloque une région ou si les vides se touchent). Poser sous une seconde enchaîne une série qui multiplie les points de la tuile (×1,5 à 3, ×2 à 6, ×3 à 10), deux fois plus vite quand la place est bonne. Les saisons comptent double et changent le jeu : l'hiver gèle le cadran (×1,4), le printemps propose deux tuiles, l'été donne douze secondes à répartir sur la saison, l'automne couvre l'île de brume que seule la pose dissipe. Île procédurale à chaque partie, sans vœu ni souffle ; meilleur score tout court. Réglages dans `BALANCE.tempo`.
- **Île infinie** : l'île grandit à chaque pose, sans fin ; le score et le nombre de saisons sont enregistrés.
- **Île du jour** : une île générée depuis la date, la même pour tout le monde, trois vœux tirés au sort, surprises de saison ; meilleur score du jour et série de jours conservés.
- **Jardin** : pose libre, choix de la tuile, sans saisons ni score : pour composer.
- **Atelier des saisons** (bouton du menu, qui s'allume quand une amélioration est à portée) : des améliorations permanentes achetées en graines, ouvertes chapitre par chapitre (regard et patience au chapitre 1 ; souffle de départ et semence rare au 2 ; source, refuge et almanach au 3 ; charpente au 4 ; alambic et manteau au 5 ; maître d'œuvre au 7 ; étoile du soir ensuite, douze en tout). Les suivantes restent visibles, grisées, avec leur chapitre.
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
assets/img/           tuiles (2×, quatre saisons), décor, faune, effets en WebP ; icônes et insignes en PNG ; manifest.json (léger) et provenance.json (sources, notes)
assets/audio/         musiques, ambiances, effets (OGG) + manifest.json
assets/video/         l'animation d'ouverture du studio (WebM et MP4, même film, 4 s)
assets/fonts/         Lora et Quicksand (WOFF2, SIL OFL)
assets/credits/       sources et licences (JSON) lues par l'écran des crédits
tools/                pipelines d'assets (images, audio, polices, crédits, rendus 3D KayKit), version des assets, mesure du chargement, serveur HTTP/2
sw.js                 service worker : assets en cache par version, code réseau d'abord
tests/                tests du modèle (Node) et bot de parcours (Playwright)
JOURNAL_DE_BORD.md    document de référence du projet (vision, GDD, DA, décisions, journal)
CREDITS.md            crédits complets générés
```

## Collection

L'écran **Collection** du menu rassemble tout ce qui se gagne : les **insignes des dix chapitres** (un chapitre se clôt en terminant son île-souvenir), les **six archétypes** (hameaux, aquatique, sauvage, montagneuse, nourricière, littorale), les **archétypes île par île** — chaque île peut donner les six, selon la région qu'on y fait la plus grande, donc rejouer une île autrement en rapporte un autre —, et les succès. Ce qui manque se montre en **silhouette** : la forme de l'insigne, vide. Les mêmes insignes paraissent dans « Choisir une île » : celui du chapitre en tête de chaque chapitre, et sur chaque île ses six emplacements d'archétype. En fin d'île, la carte postale reçoit ses tampons un à un ; la région qui a valu l'archétype se rallume sur l'île et une légende dit pourquoi (« Île sauvage · sa plus grande région : forêt, 14 tuiles », « Chapitre 1 · Prise en main : clos »).

## Succès

Trente et un succès à débloquer (dans la Collection du menu), rangés par famille : prise en main, eau et saisons, faune, habitants et vœux, bâtir, campagne, ailleurs. Chacun rapporte une graine. Ceux qui se comptent (dix coups de maître, vingt tuiles bâties, cinquante vœux…) affichent leur progression ; trois restent cachés jusqu'à leur obtention. Au déblocage, une bannière glisse depuis le haut avec la vignette, des éclats et un jingle pizzicato (Kenney Music Jingles, CC0). Les vignettes sont composées par le pipeline d'images à partir des tuiles et sprites du jeu (`assets/img/succes/`).

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
Seule l'ardoise des annulations repart vide. La partie gardée reste sur l'appareil : elle n'est **jamais** envoyée en ligne.
Elle est oubliée quand l'île se termine, quand on recommence, quand on ouvre une autre île, au bout d'un mois, ou si l'île ne peut plus
être reconstruite (l'Île du jour de la veille).

## Tests

Deux vitesses : `tools/suite.sh court` (~1 min 30, les quatre tests Node et `gate.js` en fumée) avant chaque
poussée ; `tools/suite.sh complet` (~5 min, toute la suite navigateur en plus — dont `sw.js`, le service worker —, par trois en parallèle ; la tournée finale y est pressée comme par un doigt, sauf dans `finale.js` qui la vérifie) quand le changement touche
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
node tools/calibrate.js 4 1-30 --write   # calibrage des étoiles : bot fort (tests/bot.js) et glouton, 4 graines par île, écrit src/data/campaign_stars.js
node tests/autoplay.js 1-12,infinite,garden   # parcours réel dans Chromium (serveur statique sur le port 8765 requis)
node tests/mobile.js                          # émulation téléphone (iPhone 12 portrait/paysage, Pixel 7) : tactile, captures
```

## Assets et licences

Les feuillus, les arbres nus d'hiver et les rochers viennent du **Forest Nature Pack** de KayKit, dont chaque modèle existe en huit palettes : les couleurs de saison sont donc celles de l'auteur, pas une recoloration. Tous les graphismes, sons et musiques proviennent de banques libres (Kenney CC0, KayKit / Kay Lousberg CC0, Kevin MacLeod CC BY 4.0, Freesound CC0, OpenGameArt CC0, FluidR3_GM CC BY 3.0, Google Fonts SIL OFL). Les bâtiments, les arbres et les rochers du plateau sont des **modèles 3D KayKit rendus en PNG isométriques** à la projection exacte de nos tuiles (`tools/render_kaykit.js`). Les animaux sont, eux, des modèles glTF (Quaternius CC0, Poly by Google CC BY 3.0) rendus de profil en bandes d'images par `tools/render_animals.js` : cinq espèces marchent pour de bon, le cycle avançant avec la distance parcourue. Chaque œuvre est listée avec son auteur, sa licence et sa source dans `CREDITS.md` et dans l'écran Crédits du jeu. Le code est publié sous licence MIT (`LICENSE`).
