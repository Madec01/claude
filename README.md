# Cent Saisons — L'île qui se souvient

> Une île s'est éteinte : sable, roche, silence. Tu es la Saison, l'esprit qui la remet en marche. Tuile après tuile, tu redessines forêts, prés, hameaux et rivières ; les saisons passent, les animaux reviennent, et l'île se souvient.

Puzzle de placement de tuiles hexagonales, contemplatif et stratégique, jouable dans un navigateur, en français. Campagne de 12 îles en trois archipels, Île du jour, Île infinie, Jardin (pose libre), Atelier des saisons (améliorations), sauvegarde locale. Le décor est composé par région (forêts continues, massifs, villages avec ruelles et sentiers), la météo et la vie sur les tuiles animent l'île.

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
8. Dès l'île 2, les **vœux** des habitants donnent des objectifs à échéance : les exaucer rapporte des points, des souffles et une tuile rare (moulin, chapelle, tour de guet, puits, camp, puis grenier, fontaine et les tuiles d'événement).
9. Dès l'île 4, la **météo** peut annoncer un événement en début de saison, déclenché à la mi-saison : orage (rivières +2), canicule (sécheresse étendue), grand vent (forêts et vergers +1, moulins +3), bourrasque (file masquée) ou redoux (dégel).
10. Les **tuiles d'événement** (Marché, Fête, Ruine à restaurer) et les rares tardives (Auberge, Abreuvoir, Porche, Mine, Four à pain) arrivent par les vœux à partir des îles 5 et 8.
11. Dès l'île 6, on peut **bâtir** : poser une tuile sur une tuile de la même famille (1 souffle) la fait passer au niveau 2, ses bords valent +1 de plus, elle compte double dans sa région et son décor s'épaissit. Bâtir consomme la tuile sans remplir de case, sauf si elle est bien bâtie (région close, en sa saison, ou entourée d'au moins quatre tuiles de sa famille) : une tuile de la même famille revient alors dans la file.
12. Dès l'île 8, on peut **fusionner** : poser une tuile sur une tuile d'une autre famille quand une recette existe (hameau + eau = port, champ + eau = rizière, hameau + champ = ferme, hameau + roche = fortin, roche + eau = cascade, forêt + roche = grotte, sable + eau = lagune). La tuile composée compte pour ses deux familles et rapporte à chaque saison ; la première réalisation d'une recette rend une tuile et une rare, et s'écrit dans le Cahier du Guide.
13. Dès l'île 7, des **ouvrages** arrivent dans la file (une toutes les seize poses, parfois en récompense d'un vœu) : ruche, épouvantail, ponton, pont, nichoir, feu de camp, menhir, compost. Un ouvrage se pose sur une tuile déjà posée ; bien placé, il rapporte à chaque saison, mal placé, il coûte à chaque saison tant que le voisinage n'a pas été arrangé (un marqueur rouge le rappelle). Sa fiche dit la bonne et la mauvaise place.
14. Les **souffles** sont des pouvoirs limités, gagnés en fermant des régions, en exauçant des vœux et grâce à la faune : échanger la tuile avec la suivante, la défausser, faire bourgeonner une prairie en forêt ou en verger, annuler la dernière pose, garder une tuile en poche.

Chaque pose reçoit un mot selon sa qualité par rapport au meilleur emplacement possible (de « Coup de maître ! » à « Il y avait mieux »), les séries de bons coups et chaque palier de cent points sont salués ; c'est sans effet sur le score. Une île se termine quand elle est pleine ou quand aucune pose n'est possible : la caméra recule, chaque région s'illumine à son tour pendant que le compteur monte, les quatre saisons balaient l'île, puis son nom s'écrit et les étoiles se posent (un toucher passe au bilan). Le score donne 0 à 3 étoiles selon trois seuils propres à chaque île, affichés sous les points pendant la partie (la troisième exige aussi tous les vœux) ; ils sont calibrés sur un joueur automatique qui anticipe ses coups (`tools/calibrate.js`). Les étoiles, les vœux et les îles rapportent des **graines**, à dépenser dans l'Atelier des saisons entre deux îles.

## Contrôles

| Action | Commande |
|---|---|
| Poser la tuile | survol puis clic gauche |
| Bâtir (dès l'île 6) | survol d'une tuile de même famille puis clic gauche (sur téléphone : deux touchers) |
| Poser un ouvrage (dès l'île 7) | survol d'une tuile posée puis clic gauche (deux touchers sur téléphone) |
| Fusionner (dès l'île 8) | survol d'une tuile d'une autre famille avec une recette, puis clic gauche (deux touchers sur téléphone) |
| Déplacer la vue / zoomer | clic droit glissé / molette |
| Échanger avec la 2e ou 3e tuile | `2` / `3` |
| Défausser | `X` |
| Bourgeonner une prairie | `B`, puis `F` (forêt) ou `V` (verger) |
| Annuler la dernière pose | `Z` |
| Mettre en poche / reprendre | `P` |
| Journal des événements | `J` (ou le bouton ⓘ en haut) |
| Fiche de la tuile à poser | `H` (ou l'option Fiche de la tuile) |
| Pause | `Échap` |
| Couper le son | `M` |

## Modes

- **Campagne** : 12 îles dessinées à la main, de 30 à 120 cases, chacune avec ses vœux et son souvenir. La première île est un tutoriel guidé pas à pas (case cible, file fixée), puis chaque mécanique nouvelle est présentée quand elle arrive.
- **Île infinie** : l'île grandit à chaque pose, sans fin ; le score et le nombre de saisons sont enregistrés.
- **Île du jour** : une île générée depuis la date, la même pour tout le monde, trois vœux tirés au sort, météo active ; meilleur score du jour et série de jours conservés.
- **Jardin** : pose libre, choix de la tuile, sans saisons ni score : pour composer.
- **Atelier des saisons** : neuf améliorations (regard, poche, souffle de départ, patience, semence rare, refuge, source, almanach, seconde chance) achetées avec les graines. Les graines viennent des nouvelles étoiles, des vœux exaucés et de chaque île terminée la première fois.
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
tools/                pipelines d'assets (images, audio, polices, crédits)
tests/                tests du modèle (Node) et bot de parcours (Playwright)
JOURNAL_DE_BORD.md    document de référence du projet (vision, GDD, DA, décisions, journal)
CREDITS.md            crédits complets générés
```

## Tests

```bash
node tests/rules.test.js          # règles, fermetures, couverture narrative, bot glouton sur les 14 îles, bot fort sur les premières
node tools/calibrate.js 8         # calibrage des étoiles : bot fort (tests/bot.js) et glouton, 8 graines par île
node tests/autoplay.js 1-12,infinite,garden   # parcours réel dans Chromium (serveur statique sur le port 8765 requis)
node tests/mobile.js                          # émulation téléphone (iPhone 12 portrait/paysage, Pixel 7) : tactile, captures
```

## Assets et licences

Tous les graphismes, sons et musiques proviennent de banques libres (Kenney CC0, Kevin MacLeod CC BY 4.0, Freesound CC0, OpenGameArt CC0, FluidR3_GM CC BY 3.0, Google Fonts SIL OFL). Chaque œuvre est listée avec son auteur, sa licence et sa source dans `CREDITS.md` et dans l'écran Crédits du jeu. Le code est publié sous licence MIT (`LICENSE`).
