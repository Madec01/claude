# Cent Saisons — L'île qui se souvient

> Une île s'est éteinte : sable, roche, silence. Tu es la Saison, l'esprit qui la remet en marche. Tuile après tuile, tu redessines forêts, prés, hameaux et rivières ; les saisons passent, les animaux reviennent, et l'île se souvient.

Puzzle de placement de tuiles hexagonales, contemplatif et stratégique, jouable dans un navigateur, en français. Campagne de 12 îles en trois archipels, Île infinie, Jardin (pose libre), Atelier des saisons (améliorations), sauvegarde locale.

## Jouer

Le jeu est un site statique : aucune installation, aucune compilation, aucune dépendance.

- **En ligne** : servez le dépôt tel quel. GitHub Pages fonctionne directement (tous les chemins sont relatifs, `index.html` à la racine).
- **En local** : depuis la racine du dépôt, lancez un serveur statique puis ouvrez l'adresse indiquée.

```bash
python3 -m http.server 8080
# puis http://localhost:8080/
```

Navigateurs pris en charge : Chrome, Firefox et Edge à jour, sur ordinateur (souris requise). Le son se lance après la première interaction (règle des navigateurs).

## Comment on joue

1. Une **tuile** est proposée (prairie, forêt, champ, hameau, verger, eau, marais, roche, sable, puis colline et lande plus loin dans la campagne). On la pose sur une case libre de l'île, collée à une tuile existante.
2. Chaque **bord** rapporte des points selon l'affinité des deux voisines (forêt–forêt, champ–hameau, verger–hameau, eau–marais…). Le jeu affiche les points de chaque bord avant de poser.
3. **Fermer une région** (encercler complètement un groupe de tuiles de même famille) déclenche une prime égale à sa taille (doublée pour les hameaux).
4. Les **rivières** (chaînes d'eau reliées à la mer ou à la roche) rapportent un bonus par tuile.
5. Toutes les *N* poses, la **saison** change et modifie la valeur des tuiles : les marais fleurissent au printemps, les prés isolés sèchent en été, la récolte lie vergers et hameaux en automne, l'eau gèle en hiver et relie les hameaux pour la veillée.
6. La **faune** s'installe quand un habitat existe (lapin dans les prés, élan dans les grandes forêts, ours près de la roche, hibou au-dessus des toits, canard sur l'eau, manchot sur la glace, grenouille au marais, chèvre au camp, poule entre hameau et champs, cheval sur les collines, vache en lisière de lande) et rapporte des points à chaque saison.
7. Les **vœux** des habitants donnent des objectifs à échéance : les exaucer rapporte des points, des souffles et une tuile rare (moulin, chapelle, tour de guet, puits, camp, puis grenier et fontaine).
8. Les **souffles** sont des pouvoirs limités, gagnés en fermant des régions, en exauçant des vœux et grâce à la faune : échanger la tuile avec la suivante, la défausser, faire bourgeonner une prairie en forêt ou en verger, annuler la dernière pose, garder une tuile en poche.

Une île se termine quand elle est pleine ou quand aucune pose n'est possible. Le score donne 0 à 3 étoiles (la troisième exige tous les vœux). Les étoiles, les vœux et les îles rapportent des **graines**, à dépenser dans l'Atelier des saisons entre deux îles.

## Contrôles

| Action | Commande |
|---|---|
| Poser la tuile | survol puis clic gauche |
| Déplacer la vue / zoomer | clic droit glissé / molette |
| Échanger avec la 2e ou 3e tuile | `2` / `3` |
| Défausser | `X` |
| Bourgeonner une prairie | `B`, puis `F` (forêt) ou `V` (verger) |
| Annuler la dernière pose | `Z` |
| Mettre en poche / reprendre | `P` |
| Pause | `Échap` |
| Couper le son | `M` |

## Modes

- **Campagne** : 12 îles dessinées à la main, de 30 à 120 cases, chacune avec ses vœux et son souvenir. Les mécaniques sont introduites progressivement avec un tutoriel intégré.
- **Île infinie** : l'île grandit à chaque pose, sans fin ; le score et le nombre de saisons sont enregistrés.
- **Jardin** : pose libre, choix de la tuile, sans saisons ni score : pour composer.
- **Atelier des saisons** : neuf améliorations (regard, poche, souffle de départ, patience, semence rare, refuge, source, almanach, seconde chance) achetées avec les graines. Les graines viennent des nouvelles étoiles, des vœux exaucés et de chaque île terminée la première fois.
- **Guide** : depuis le menu ou la pause, toutes les tuiles avec leurs bonnes et mauvaises paires, les saisons, la faune, les tuiles rares, les souffles, les vœux et les graines.

## Options et mode test

Le menu Options règle les volumes (général, musique, ambiance, effets), la coupure du son, le tremblement de l'écran, l'affichage des images par seconde, le plein écran et l'effacement de la progression.

Le **mode test** déverrouille toutes les îles, l'Île infinie et le Jardin, et active des touches de débogage : `F1` informations, `F2` file de tuiles, `F3` saison suivante, `F4` +10 souffles, `F5` terminer l'île. Les scores ne sont pas enregistrés en mode test.

## Structure du projet

```
index.html            point d'entrée
css/                  thème papier clair (base, menu, HUD)
src/core/             moteur générique : boucle, scènes, entrées, audio, sauvegarde, chargement
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
node tests/rules.test.js          # règles, fermetures, couverture narrative, bot glouton sur les 14 îles
node tests/autoplay.js 1-12,infinite,garden   # parcours réel dans Chromium (serveur statique sur le port 8765 requis)
```

## Assets et licences

Tous les graphismes, sons et musiques proviennent de banques libres (Kenney CC0, Kevin MacLeod CC BY 4.0, Freesound CC0, OpenGameArt CC0, FluidR3_GM CC BY 3.0, Google Fonts SIL OFL). Chaque œuvre est listée avec son auteur, sa licence et sa source dans `CREDITS.md` et dans l'écran Crédits du jeu. Le code est publié sous licence MIT (`LICENSE`).
