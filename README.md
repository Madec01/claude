# Feux de Brume — Chroniques du phare de Sant-Aël

> 1893. Élise Kervran reprend le phare de Sant-Aël après la disparition de son père. Chaque nuit, une brume anormale monte sur la passe et avale les navires. Avec son faisceau, sa corne de brume et ses cartes, guidez les bateaux jusqu'au port, nuit après nuit, et découvrez ce que la Brume veut vraiment.

Jeu d'action-stratégie atmosphérique en vue de dessus, jouable dans un navigateur, en français. Campagne de 12 nuits en trois actes, mode Veille infinie, atelier d'améliorations, sauvegarde locale.

## Jouer

Le jeu est un site statique : aucune installation, aucune compilation.

- **En ligne** : servez le dépôt tel quel (GitHub Pages fonctionne directement, tous les chemins sont relatifs).
- **En local** : depuis la racine du dépôt, lancez un serveur statique puis ouvrez l'adresse indiquée.

```bash
python3 -m http.server 8080
# puis http://localhost:8080/
```

Navigateurs pris en charge : Chrome, Firefox et Edge à jour, sur ordinateur (souris requise). Le son se lance après votre première interaction (règle des navigateurs).

## Contrôles

| Action | Entrée |
|---|---|
| Orienter le faisceau | Déplacer la souris |
| Tracer la route d'un navire | Cliquer-glisser depuis le navire jusqu'au quai |
| Effacer une route | Clic simple sur le navire |
| Corne de brume (arrêt d'urgence, repousse la Bête) | `Espace` ou clic droit dans le vide |
| Mouiller / lever l'ancre | Clic droit sur un navire |
| Feu réduit (économiser l'huile, nuit 10 et suivantes) | `F` |
| Pause | `Échap` ou `P` |
| Couper le son | `M` |

Les mécaniques sont expliquées dans le jeu, une par nuit, par un tutoriel intégré.

## Les règles en bref

- Ce qui n'est pas éclairé n'existe pas : les écueils apparaissent dans le faisceau et restent relevés sur la carte jusqu'à l'aube.
- Un navire éclairé est **guidé** : il suit sa route vite et droit. Hors de la lumière, il dérive.
- Une nuit est gagnée quand l'aube se lève avec le **quota** de navires à quai. Elle est perdue au troisième naufrage.
- La marée découvre et recouvre les écueils ; la tempête pousse les navires ; la Bête traque le navire le plus proche ; l'huile brûle.
- Les pages du journal de Yann dérivent dans la passe : gardez le faisceau dessus pour les lire. Elles racontent l'histoire et rapportent des **Éclats** à dépenser à l'atelier.

## Options et mode test

Le menu **Options** règle les volumes (général, musique, ambiance, effets), le tremblement d'écran, l'affichage des images par seconde, le plein écran, et permet d'effacer la progression.

Le **mode test** (options) déverrouille toutes les nuits et la Veille infinie, et active des raccourcis en jeu : `F1` panneau de débogage, `F2` navires invulnérables, `F3` vitesse ×2, `F4` brouillard réduit, `F5` terminer la nuit. Les scores obtenus en mode test ne sont pas enregistrés.

## Structure du projet

```
index.html          point d'entrée
css/                styles (base, menu, HUD, polices)
src/core/           moteur générique (boucle, entrées, assets, audio, sauvegarde, scènes, particules)
src/game/           logique de jeu (nuit, navires, faisceau, écueils, météo, corne, pages, Bête, rendu, HUD, tutoriel)
src/ui/             écrans DOM (menu, options, crédits, narration, résultats, atelier, pause)
src/data/           données (nuits, cartes, équilibrage, améliorations, histoire)
assets/             images, audio, polices, crédits (JSON)
tools/              scripts de pipeline d'assets (Python / Node), non nécessaires à l'exécution
tests/              parcours automatique de QA (Playwright)
JOURNAL_DE_BORD.md  journal de conception et de production complet
CREDITS.md          crédits détaillés des assets et licences
```

## Tests

Un bot Playwright joue toute la campagne et vérifie l'absence d'erreur console :

```bash
python3 -m http.server 8765 &
node tests/autoplay.js 1-12,infinite 6
```

## Crédits et licences

Le code est publié sous licence MIT (voir `LICENSE`). Toutes les œuvres tierces (graphismes Kenney, musiques de Kevin MacLeod, enregistrements Freesound, effets OpenGameArt, samples FluidR3, polices Google Fonts) sont listées avec leurs auteurs et licences dans `CREDITS.md` et dans les crédits du jeu.
