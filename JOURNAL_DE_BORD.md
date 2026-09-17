# JOURNAL DE BORD — « TU TIRES OU TU POINTES ? »

> Document de référence du projet. Il permet à n'importe qui (humain ou IA) de reprendre le projet à froid.
> Règle : aucune modification significative du jeu sans une ligne dans le **Journal des modifications** (section 7).

> **Note de pivot (2026-09-17).** Le projet a d'abord été conçu comme « Feux de Brume », un jeu de gardienne de phare guidant des navires dans la brume. Le commanditaire a signalé que ce concept reproduisait l'un de ses tout premiers jeux. Le projet a été **entièrement réorienté** vers un jeu de pétanque narratif, « Tu tires ou tu pointes ? ». Le moteur générique (boucle, entrées, chargeur, audio, sauvegarde, scènes, particules, écrans DOM, pipelines d'assets, bot de QA) est conservé ; la logique de jeu, l'histoire, la direction artistique et l'audio sont refaits. L'historique complet reste en section 7 et l'ancien concept est archivé en section 6.

---

## 0. Fiche d'identité

| | |
|---|---|
| **Titre** | Tu tires ou tu pointes ? |
| **Sous-titre** | Un été à Saint-Aubin-des-Cigales |
| **Genre** | Sport / physique / narratif : pétanque en tête-à-tête, vue de dessus, tour par tour avec exécution en temps réel |
| **Plateforme** | Navigateur desktop (Chrome / Firefox / Edge à jour), serveur statique ou GitHub Pages |
| **Langue** | Français exclusivement (UI, textes, histoire). Code et identifiants en anglais. |
| **Durée d'une partie** | Une partie de 4 à 10 minutes ; campagne de 12 parties (≈ 75–90 min) ; partie rapide et entraînement illimités |
| **Stack** | HTML5 + CSS3 + JavaScript ES2022 (modules natifs), Canvas 2D, Web Audio API. Aucune dépendance, aucun build. |
| **Dépôt** | `Madec01/claude`, branche `claude/modest-faraday-o5034z` |
| **Point d'entrée** | `index.html` à la racine (chemins relatifs, compatible GitHub Pages) |

---

## 1. Vision du jeu

**Pitch (3 lignes).** Été 1962. Camille revient à Saint-Aubin-des-Cigales pour vider la maison de sa grand-mère Fanny, championne de pétanque que le village a oubliée. Dans une boîte à biscuits, trois boules d'acier et un cochonnet rouge. Le concours de la Saint-Éloi commence samedi : douze parties pour reprendre la place de Fanny, apprivoiser chaque terrain du village, et comprendre pourquoi personne ne veut parler de la finale de 1948.

**Public visé.** Joueuses et joueurs desktop de 10 ans et plus, amateurs de jeux de sport « faciles à prendre, durs à maîtriser » (*Golf Story*, *Wii Sports*, *Bocce*), de comédie de village et de parties courtes. Aucune connaissance de la pétanque requise : le jeu l'enseigne.

**Sensation recherchée.** La chaleur d'une place de village à cinq heures de l'après-midi : cigales, gravier qui crisse, le « clac » d'un carreau qui fait lever la terrasse du bar. Chaque lancer est un petit suspense (la boule roule… roule… s'arrête à deux doigts du bouchon), chaque mène une décision (« tu tires ou tu pointes ? »), chaque partie une conversation avec un personnage du village.

**Pourquoi ce jeu est amusant (thèse de design).**
1. **Un geste principal satisfaisant** : viser à la souris, choisir son lancer, relâcher au bon moment. Le résultat est immédiat, lisible et physiquement crédible : la boule rebondit sur le gravier, ralentit sur le sable, dévie sur une racine.
2. **Une décision permanente** : pointer (se rapprocher du cochonnet) ou tirer (chasser la boule adverse). Le tir est risqué et spectaculaire ; le point est sûr mais laisse l'adversaire jouer. La question du titre est le cœur du jeu.
3. **Des mécaniques qui s'emboîtent** : le type de lancer × le terrain × la position des boules × la personnalité de l'adversaire. Un terrain de sable rend le tir indispensable ; un goudron rapide rend la plombée précieuse.
4. **Une comédie humaine** : chaque adversaire est un personnage avec une manière de jouer (le pointeur méticuleux, le tireur fou, le tricheur qui « mesure ») et une histoire qui avance à chaque partie.

---

## 2. Game Design Document (GDD)

### 2.1 Univers et contexte

- **Lieu** : Saint-Aubin-des-Cigales, village imaginaire de Provence entre vignes, pins et garrigue. Une place avec des platanes, un bar-tabac (« Le Bar des Sports »), une fontaine, une église, une plage à quatre kilomètres, une clairière de pins, le parking du garage des jumeaux.
- **Époque** : été 1962. Solex, 2CV, transistor, jeu de boules en acier, tradition de « la Fanny » (celle ou celui qui perd 13 à 0 embrasse le tableau).
- **Le concours de la Saint-Éloi** : tournoi de tête-à-tête ouvert à tout le village. Douze rencontres pour Camille : des défis de qualification, un tableau à élimination directe et une finale de nuit sous les lampions.

### 2.2 Personnages

| Personnage | Rôle | Manière de jouer |
|---|---|---|
| **Camille Roux** (31 ans) | Protagoniste, citadine revenue au village, petite-fille de Fanny | Le joueur |
| **Fanny Roux** (†) | Grand-mère de Camille, championne de 1948, surnommée « la Fanny » par ironie après sa défaite | Présente par ses boules, ses carnets et les souvenirs des autres |
| **Marius Ventre** (78 ans) | Vieux champion, mentor bourru, ami de Fanny ; a gardé un secret sur 1948 | Pointeur d'une régularité effrayante (adversaire 1 : partie-tutoriel) |
| **Josiane Peyrol** | Boulangère, bavarde, cœur d'or | Joue vite, pointe court, rit de tout (adversaire 2) |
| **Lucien Barbier** | Facteur, connaît tous les secrets, un peu tricheur (« déplace le bouchon du pied ») | Pointeur roublard qui aime les terrains à bosses (adversaire 3) |
| **Kevin Aubanel** (16 ans) | Ado du village, tireur fou, transistor sur l'épaule | Tire sur tout, souvent à côté, parfois carreau (adversaire 4) |
| **Père Anselme** | Curé, joueur du dimanche, philosophe | Plombée parfaite, patience infinie (adversaire 5) |
| **Toni et Nino Ferrer** | Jumeaux du garage, jouent en alternance (« un tête-à-tête à deux têtes ») | Toni pointe, Nino tire : deux styles dans une même partie (adversaires 6 et 7) |
| **Dr Hélène Faure** | Médecin, maniaque de la mesure, toujours un mètre-ruban | Précise, exige la mesure au moindre doute (adversaire 8) |
| **Mme Roubaud** | Patronne du Bar des Sports, veuve, arbitre officieuse | Dure, joue serré, ne rate jamais un tir de rafle (adversaire 9) |
| **Gaby Ponsard** | Fille de Gérard, brillante, tiraillée entre son père et la vérité | Style complet, adversaire loyale (adversaire 10) |
| **Gérard Ponsard** | Champion en titre depuis vingt ans, fils d'Aimé Ponsard qui battit Fanny en 1948 | Tireur redoutable, joue l'intimidation (demi-finale 11, finale 12) |

### 2.3 Histoire en trois actes (12 parties)

- **Acte I — La boîte à biscuits (parties 1 à 4).** Camille retrouve les boules de Fanny. Marius lui apprend à pointer (partie 1, tutoriel), Josiane lui apprend qu'on peut jouer en riant (2), Lucien lui apprend la demi-portée et la méfiance (3), Kevin lui apprend le tir (4). Le village découvre « la petite de la Fanny ».
- **Acte II — Le tableau (parties 5 à 8).** Élimination directe. Le Père Anselme enseigne la plombée (5). Les jumeaux (6, 7) révèlent que le village a longtemps ri de Fanny. Le Dr Faure (8) sort son mètre : la mesure devient une mécanique, et une obsession. Les carnets de Fanny, retrouvés au grenier, racontent 1948 par fragments.
- **Acte III — La finale de 1948 (parties 9 à 12).** Mme Roubaud (9) avoue avoir vu Aimé Ponsard déplacer le cochonnet lors de la finale de 1948, et Marius se taire. Gaby (10) hésite entre son père et la vérité. Gérard (11, demi-finale) joue l'intimidation. Finale de nuit (12) : Gérard, sous les lampions, à 13 points. Victoire : Marius parle enfin, la place est rebaptisée « Boulodrome Fanny-Roux », Camille décide de revenir chaque été.
- **Épilogue.** « À Saint-Aubin, on ne perd jamais vraiment : on remet ça samedi. » Déverrouillage de tous les adversaires en partie rapide.

Les textes (dialogues d'avant et d'après-partie, commentaires en cours de partie, carnets de Fanny, fin) sont dans `src/data/story.js`, rédigés par le sous-agent narration.

### 2.4 Règles de pétanque implémentées

- **Tête-à-tête** : deux joueurs, **3 boules** chacun. Une partie se joue en **7 points** (parties 1 à 4), **11 points** (5 à 8) ou **13 points** (9 à 12, partie rapide).
- **Mène** : le joueur qui a gagné la mène précédente (au début, tirage au sort) trace le rond et lance le cochonnet entre 6 et 10 m, puis joue sa première boule. Ensuite, c'est toujours **le joueur qui n'a pas le point** qui joue. Quand un joueur n'a plus de boules, l'autre joue les siennes.
- **Comptage** : le joueur dont la boule est la plus proche du cochonnet marque autant de points qu'il a de boules plus proches que la meilleure boule adverse.
- **Mesure** : si deux boules sont à moins de 3 cm d'écart, une séquence de mesure au mètre-ruban est jouée (animation) ; l'égalité parfaite annule la mène.
- **Cochonnet sorti** du terrain : mène annulée (si un seul joueur avait encore des boules, il marque autant de points que de boules restantes — règle officielle simplifiée).
- **Boule sortie** du terrain : boule morte.
- **La Fanny** : perdre 13 à 0 (ou 7/11 à 0) déclenche la scène du tableau, rituel comique du village.

### 2.5 Mécaniques de jeu

Introduites progressivement par les personnages (une par partie en acte I).

1. **Viser et doser** — *partie 1*. La souris place la **donnée** (le point où la boule doit toucher le sol). Cliquer-maintenir lance la **jauge de précision** : une aiguille oscille, relâcher dans la zone verte donne un lancer exact ; hors zone, la boule est courte, longue ou déviée proportionnellement à l'erreur. La zone verte rétrécit avec la distance et le type de lancer, s'élargit avec les améliorations.
2. **Pointer (roulette)** — *partie 1*. Lancer bas, la boule roule longtemps : très sensible au terrain (bosses, pente, sable).
3. **Demi-portée** — *partie 3*. La boule tombe à mi-distance puis roule : compromis, contourne les bosses proches du rond.
4. **Tirer** — *partie 4*. Lancer tendu et rapide vers une boule adverse. La zone verte est étroite. Réussite : la boule adverse est chassée ; **carreau** si la boule tirée prend exactement sa place (bonus de jetons et ovation).
5. **Plombée** — *partie 5*. Lancer très haut qui tombe presque à la verticale et ne roule pas : idéale sur sable et pour passer au-dessus des boules.
6. **Le terrain** — *toute la campagne*. Chaque terrain a une **friction** (goudron rapide, gravier, terre, sable lent), des **pentes** (la boule dévie), des **obstacles** (racines, cailloux, pommes de pin) qui font sauter la boule, et des **bords** (boules mortes). Le terrain est visible : lire le sol fait partie du jeu.
7. **La mesure** — *partie 8*. Sur un point serré, le jeu propose de mesurer (touche `M` ou bouton) : animation du mètre, verdict. Le Dr Faure et Lucien en abusent.
8. **L'effet** — *partie 7*. Molette ou touches `Q`/`D` avant le lancer : effet latéral qui fait dévier la boule en fin de course (permet de contourner une boule).
9. **La lecture de l'adversaire** — *toute la campagne*. Chaque adversaire a un profil (précision au point, au tir, agressivité, lancer favori) et réagit (émoticônes, répliques). L'IA choisit ses lancers en simulant réellement la physique : elle joue « juste », avec ses défauts de caractère.

### 2.6 Boucle de jeu

**Boucle de 20 secondes** : je regarde la mène (où est le bouchon, qui a le point) → je choisis « tirer ou pointer » → je vise, je dose, je relâche → la boule roule, rebondit, clac → le point change de camp, réplique de l'adversaire.

**Boucle d'une mène (≈ 1 min)** : 6 boules, comptage, points, réactions, changement de côté.

**Boucle d'une partie (4 à 10 min)** : dialogue d'avant-partie → mènes → score final → dialogue d'après-partie → **Bar des Sports** (jetons, améliorations, carnets de Fanny) → partie suivante.

**Boucle de campagne** : 12 parties, 3 actes, une mécanique par partie en acte I, montée en difficulté par la précision des adversaires et la difficulté des terrains, finale à 13.

### 2.7 Conditions de victoire et de défaite

- **Partie gagnée** : atteindre le score cible (7 / 11 / 13). **Perdue** : l'adversaire l'atteint. Une partie perdue en campagne se rejoue immédiatement (l'histoire ne change pas, sauf répliques de consolation).
- **Étoiles** par partie : 1 = gagnée, 2 = gagnée avec au moins un carreau ou 3 points d'écart, 3 = gagnée sans concéder plus de 3 points (ou « Fanny » infligée).
- **Campagne terminée** : finale gagnée → fin, générique, tout déverrouillé en partie rapide.

### 2.8 Économie et progression

- **Jetons du bar** : gagnés par point marqué (+1), par carreau (+3), par partie gagnée (+5), par étoile (+2).
- **Bar des Sports** (entre les parties) :
  - *Boules* (3 jeux) : « Les boules de Fanny » (équilibrées), « Les tendres » (acier doux : rebond faible, roule moins loin — pointeur), « Les dures » (acier dur : rebond fort, idéales au tir, carreaux plus faciles). Chaque jeu modifie restitution et friction de la boule.
  - *Régularité* (3 niveaux) : zone verte plus large.
  - *Sang-froid* (3 niveaux) : l'aiguille de la jauge est plus lente.
  - *Œil du tireur* (3 niveaux) : aide à la visée au tir (trajectoire prévisualisée plus longue).
  - *Lecture du terrain* (3 niveaux) : les pentes et obstacles sont mieux affichés (flèches, halos).
- Les techniques (demi-portée, tir, plombée, effet) sont déverrouillées par l'histoire, pas achetées.

### 2.9 Modes de jeu

- **Campagne** (12 parties, sauvegarde automatique, rejouer une partie gagnée pour ses étoiles).
- **Partie rapide** : adversaire et terrain au choix parmi les déverrouillés, score cible 7/11/13.
- **Entraînement** : le boulodrome vide, toutes les techniques, affichage des distances, réinitialisation à volonté.
- **Mode test** (options) : déverrouille tout, panneau de débogage (`F1`), jauge toujours parfaite (`F2`), vitesse ×2 (`F3`), IA sans erreur (`F4`), terminer la partie (`F5`). Les scores du mode test ne sont pas enregistrés.

### 2.10 Contrôles

| Action | Entrée |
|---|---|
| Placer la donnée (point de chute visé) | Déplacer la souris |
| Changer de lancer (point, demi-portée, tir, plombée) | Molette ou touches `1` `2` `3` `4` ou boutons du HUD |
| Effet latéral | `Q` / `D` (ou `A` / `E`) |
| Lancer | Cliquer-maintenir puis relâcher dans la zone verte |
| Demander la mesure | `M` ou bouton (quand proposé) |
| Accélérer le roulement | `Espace` maintenu |
| Pause | `Échap` ou `P` |
| Couper le son | `Ctrl+M` |

---

## 3. Direction artistique et audio

### 3.1 Style visuel

- **Vue de dessus, 2D vectorielle Kenney** (Sports Pack : personnages vus de dessus, boules, sols gravier/sable/goudron/herbe), en plein soleil : ombres courtes et chaudes, ocres, verts de platane, bleu de volets.
- **Composition** : le terrain (15 m × 4 m) traverse l'écran de gauche à droite ; au-dessus, la terrasse du bar, les platanes, les spectateurs ; au-dessous, la fontaine, les bancs, la route. Chaque terrain a son décor (place, plage, clairière, parking, nuit sous les lampions).
- **Feedback** : poussière à l'impact, étincelles au « clac » d'un tir, tremblement d'écran sur un carreau, ralenti sur le contact d'un tir, zoom caméra sur le groupe de boules en fin de lancer, émoticônes (Kenney Emotes) au-dessus des personnages, réactions de la terrasse, ruban de mesure animé.
- **Palette** :

| Usage | Couleur |
|---|---|
| Ocre / gravier | `#d9b57a` → `#c49a5c` |
| Sable | `#eedcae` |
| Goudron | `#5b5f66` |
| Platanes | `#6f9a4a` / ombre `#3f6b34` |
| Ciel d'été / volets | `#7cc4e8` / `#2f6fa3` |
| Lampions (finale) | `#ffb347`, `#ff6b57` |
| UI : ardoise de bar | `#2e3a2e`, craie `#f4efe4` |
| Accent (jetons, carreau) | `#f2b134` |

### 3.2 Polices (Google Fonts, auto-hébergées en WOFF2)

- **Fredoka** (titres et boutons : rondeur Kenney, affiche de fête votive) ;
- **Nunito** (corps de texte, HUD) ;
- **Amatic SC** (ardoise du bar, écriture à la craie, carnets de Fanny).

Toutes trois sous licence SIL OFL 1.1.

### 3.3 Banques d'assets utilisées (toutes vérifiées)

Le proxy réseau de cette session bloque les sites des banques (kenney.nl, opengameart.org, freesound.org, incompetech.com, pixabay.com). Les assets sont récupérés depuis des **miroirs GitHub** de ces mêmes banques, licites pour des contenus CC0 / CC-BY, dont la licence est embarquée.

| Asset | Source | Auteur | Licence | Miroir utilisé |
|---|---|---|---|---|
| Sports Pack (personnages vus de dessus, boules, sols) | kenney.nl | Kenney | CC0 1.0 | github.com/ETdoFresh/kenney.nl (`kenney_sportspack`) |
| Emotes Pack (émoticônes des personnages) | kenney.nl | Kenney | CC0 1.0 | idem (`kenney_emotespack`) |
| Foliage Sprites, Hexagon Pack, Roguelike packs, Top-down Shooter (décor : arbres, bancs, tables, voitures, fontaine, tuiles) | kenney.nl | Kenney | CC0 1.0 | idem |
| Particle Pack (poussière, étincelles, halos) | kenney.nl | Kenney | CC0 1.0 | idem (`particlePack_1.1`) |
| UI Pack, Game Icons | kenney.nl | Kenney | CC0 1.0 | idem (`uipack_fixed`, `gameicons`, `gameicons-expansion`) |
| UI Audio, Interface Sounds, Impact Sounds, RPG Audio | kenney.nl | Kenney | CC0 1.0 | idem |
| Musiques (Erik Satie interprété par Kevin MacLeod « Gymnopédie n° 1/2/3 », « Night in Venice », « Bossa Antigua », « Casa Bossa Nova », « Modern Jazz Samba », « Sneaky Adventure », etc. — liste finale en 3.4) | incompetech.com | Kevin MacLeod | CC BY 4.0 | github.com/noobsandnerdsgroup/audio |
| Ambiances : cigales/grillons, oiseaux, vent, pluie (enregistrements de terrain, boucles) | freesound.org (CC0) | felix.blume, SecureSubset, richwise, Sheyvan | CC0 1.0 | github.com/funcoder/omarchy-ambient |
| SFX : impacts métal (boules), gravier, bois, papier, cloche, foule légère | opengameart.org (packs « 100 CC0 SFX », « 100 CC0 wood/metal SFX », etc.) | rubberduck et autres | CC0 1.0 | github.com/lavenderdotpet/CC0-Public-Domain-Sounds |
| Samples d'instruments réels (jingles de fin de mène et de carreau, s'il faut composer) | FluidR3_GM | Frank Wen | CC BY 3.0 | github.com/gleitz/midi-js-soundfonts |
| Polices | fonts.google.com | Fredoka (Milena Brandão), Nunito (Vernon Adams), Amatic SC (Vernon Adams) | SIL OFL 1.1 | fonts.googleapis.com / fonts.gstatic.com |

### 3.4 Plan audio

- **Musiques (Kevin MacLeod, CC BY 4.0)**, une par contexte, avec crossfade : menu (« Night in Venice », accordéon de café), acte I (« Bossa Antigua »), acte II (« Casa Bossa Nova »), acte III (« Modern Jazz Samba »), finale (« Sneaky Adventure » ou équivalent tendu), résultats / bar (« Gymnopédie n° 1 »), défaite (« Gymnopédie n° 3 »), fin (« Gymnopédie n° 2 » puis « Night in Venice »). Recompressées en OGG Vorbis q5, boucles propres.
- **Ambiances (CC0)** : cigales (`crickets.ogg`) en boucle permanente de jour, oiseaux, vent léger ; nuit de la finale : grillons plus doux et rumeur de fête.
- **SFX** : impact boule contre boule (`metal_hit_*`, plusieurs variantes selon la vitesse), boule au sol (impact sourd + gravier), roulement (boucle de gravier modulée par la vitesse), cochonnet (petit clac bois), carreau (impact + « ding »), applaudissements/rumeur de terrasse (si une source CC0 existe ; sinon réactions par émoticônes et cloche du bar), mètre-ruban, jetons, UI (Kenney).
- **Interdit** : toute synthèse « chiptune ». Si un jingle est composé, il l'est avec des samples d'instruments réels (FluidR3).

---

## 4. Architecture technique

### 4.1 Choix

- **Vanilla JS + Canvas 2D, sans moteur ni build** (inchangé) : GitHub Pages sans compilation, aucune dépendance réseau, rendu 2D léger, lisibilité à froid.
- **Résolution logique 1280×720**, mise à l'échelle (letterbox), `devicePixelRatio` géré.
- **Simulation physique déterministe** (pas fixe 1/120 s pour les boules) : la même fonction sert au jeu, à l'IA (qui simule ses lancers candidats) et aux tests.
- **Audio** : Web Audio API (bus master / musique / ambiance / SFX, déverrouillage au premier geste).
- **Sauvegarde** : `localStorage` versionné (campagne, étoiles, jetons, améliorations, carnets, records, options).
- **Tests** : Playwright + Chromium préinstallé : parcours automatique de la campagne par un bot qui utilise l'IA du jeu, sans erreur console.

### 4.2 Arborescence

```
/
├── index.html
├── css/                     base.css, menu.css, hud.css, fonts.css
├── src/
│   ├── main.js              bootstrap, scènes, flux de campagne
│   ├── core/                loop, input, assets, audio, save, scenes, particles, shake, math
│   ├── game/
│   │   ├── physics.js       boules, cochonnet, rebonds, friction, pentes, obstacles, collisions (déterministe)
│   │   ├── terrain.js       définition et rendu des terrains (sol, pentes, obstacles, bords, décor)
│   │   ├── match.js         règles : mènes, ordre de jeu, comptage, mesure, score, fin de partie
│   │   ├── throw.js         entrée du joueur : donnée, type de lancer, jauge, effet → paramètres de lancer
│   │   ├── ai.js            adversaires : profils, échantillonnage de lancers simulés, choix
│   │   ├── camera.js        zoom/pan sur les boules, ralenti
│   │   ├── render.js        rendu (sol, ombres, boules, personnages, spectateurs, HUD canvas)
│   │   ├── hud.js           HUD DOM (score, mène, lancer choisi, jauge, boules restantes)
│   │   ├── effects.js       particules, textes flottants, émoticônes
│   │   └── tutorial.js      consignes de la partie 1 et des parties qui débloquent une technique
│   ├── ui/                  menu, options, crédits, story (dialogues), results, bar (améliorations), pause, dom
│   └── data/                balance.js, terrains.js, opponents.js, campaign.js, upgrades.js, story.js, credits
├── assets/                  img/, audio/, fonts/, credits/
├── tools/                   pipelines Python/Node (images, audio, rasterisation SVG)
├── tests/                   autoplay.js (bot Playwright)
├── README.md, CREDITS.md, LICENSE, JOURNAL_DE_BORD.md
```

### 4.3 Sous-agents (équipe)

| Rôle | Périmètre | Livrables |
|---|---|---|
| **Lead (orchestration)** | Vision, GDD, architecture, physique, règles, IA, rendu, revue de tout, journal | `JOURNAL_DE_BORD.md`, `src/core`, `src/game` |
| **Narration & univers** | Dialogues d'avant/après-partie, répliques en jeu, carnets de Fanny, fin, tutoriel | `src/data/story.js` |
| **DA & assets** | Extraction, rasterisation SVG, optimisation ; polices ; licences | `assets/img`, `assets/fonts`, `assets/credits/images.json` |
| **Audio** | Sélection, boucles, normalisation, SFX de boules, licences | `assets/audio`, `assets/credits/audio.json` |
| **UI/UX** | Menu d'accueil, options (mode test), pause, résultats, bar, crédits, HUD | `css/*`, `src/ui/*` |
| **QA** | Bot Playwright, rapport de bugs, performance | `tests/*`, rapport dans ce journal |
| **Documentation** | README, crédits lisibles, relecture du journal | `README.md`, `CREDITS.md` |

---

## 5. Registre des décisions

| Date | Décision | Alternatives envisagées | Raison |
|---|---|---|---|
| 2026-09-17 | Vanilla JS + Canvas 2D, zéro dépendance | Phaser, PixiJS, Kaboom | CDN bloqués par le proxy ; rendu 2D natif suffisant ; lisibilité à froid |
| 2026-09-17 | Assets via miroirs GitHub des banques CC0/CC-BY | Attendre un accès direct ; placeholders | Sites bloqués ; miroirs avec licences embarquées ; placeholders interdits |
| 2026-09-17 | **Pivot** : abandon de « Feux de Brume » (phare) pour « Tu tires ou tu pointes ? » (pétanque narrative) | Enlèvement d'animaux en soucoupe (infiltration), puzzle de tuiles hexagonales (écologie), gestion de cirque | Le commanditaire a signalé que le phare reproduisait un de ses premiers jeux. La pétanque est très rarement traitée, culturellement française, physiquement satisfaisante en 20 secondes, et le Sports Pack Kenney (personnages vus de dessus, boules, sols) la sert parfaitement |
| 2026-09-17 | Tête-à-tête à 3 boules, parties en 7/11/13 | Doublette, triplette ; toujours 13 | Parties courtes (4–10 min), lisibilité, une IA par adversaire ; le 13 est réservé aux grandes parties pour le rythme de la campagne |
| 2026-09-17 | Jauge de précision à relâcher dans une zone (timing) plutôt qu'une visée « parfaite » | Visée directe sans aléa ; aléa pur | Le timing donne de la compétence et du suspense sans frustration ; la zone évolue avec les améliorations |
| 2026-09-17 | Physique déterministe partagée entre jeu et IA | IA par heuristiques géométriques | Une IA qui simule ses coups joue « juste » et ses défauts sont des paramètres de personnage (bruit ajouté), pas des tricheries |
| 2026-09-17 | Terrain vu de dessus, gauche → droite, tout le terrain visible | Vue 3/4 avec scrolling ; vertical | Tout est lisible en permanence ; le zoom caméra ajoute le drame sans perdre le contexte |
| 2026-09-17 | Techniques débloquées par l'histoire, améliorations achetées en jetons | Tout acheté ; tout débloqué d'emblée | L'apprentissage progressif est porté par les personnages ; les jetons récompensent le style (carreaux) |
| 2026-09-17 | Français exclusif ; mode test dans les options ; GitHub Pages géré par le commanditaire | — | Demandes explicites |

---

## 6. Idées écartées

| Idée | Pourquoi écartée |
|---|---|
| **« Feux de Brume »** (gardienne de phare, faisceau, routes de navires, corne de brume, marée, Bête de brume, huile, pages du journal — 12 nuits, 3 actes) | Reproduisait un des premiers jeux du commanditaire ; conception, prototype jouable et assets archivés dans l'historique git (commits `98867ba`, `eceeed8`, `3af81f7`, `a872a51`) |
| Enlèvement d'animaux en soucoupe volante (infiltration) | Ton comique intéressant mais trope connu ; assets (humains vus de dessus armés) mal adaptés |
| Puzzle de placement de tuiles hexagonales (écologie d'une île) | Excellent fit d'assets, mais boucle de jeu moins immédiate et genre proche de titres connus |
| Doublette / triplette | Trop long, trop de personnages à gérer par partie |
| Mesure systématique à chaque mène | Casse le rythme : la mesure est proposée seulement sur un point serré |
| Musique composée par synthèse Web Audio | Interdite par le cahier des charges |
| Multijoueur local | Hors périmètre ; possible extension (la logique de match est symétrique) |

---

## 7. Journal des modifications

| Date | Phase | Sous-agent | Fait | Testé | Reste à faire |
|---|---|---|---|---|---|
| 2026-09-17 | 0 | Lead | Reformulation, plan d'équipe, validation du commanditaire (français exclusif, GitHub Pages géré par lui, menu d'accueil complet avec mode test) | — | — |
| 2026-09-17 | 1 | Lead | Audit du réseau : sites des banques bloqués, `raw.githubusercontent.com`, `registry.npmjs.org`, `pypi.org`, `fonts.googleapis.com` accessibles. Clone partiel des miroirs Kenney, Kevin MacLeod, ambiances CC0, SFX CC0. Installation de `numpy`, `Pillow`, `imageio-ffmpeg` | Accès vérifiés, licences lues | — |
| 2026-09-17 | 1 | Lead | Journal initial (concept « Feux de Brume ») | — | — |
| 2026-09-17 | 3 | Narration / DA / Audio / UI | Livrables du concept phare : `story.js` (12 nuits), 389 sprites (pirate/cartographie), 8 musiques, 52 SFX, 4 ambiances, UI parchemin | Playwright | Archivés (voir pivot) |
| 2026-09-17 | 2 | Lead | Moteur générique et prototype « Feux de Brume » : `src/core/*`, écrans DOM, flux nuit → résultats → atelier, bot de QA jouant 12 nuits sans erreur console | Playwright : parcours complet sans erreur | — |
| 2026-09-17 | **Pivot** | Lead | Le commanditaire signale que le phare reproduit un de ses premiers jeux. Réécriture de ce journal (sections 0 à 6) pour « Tu tires ou tu pointes ? ». Conservation de `src/core`, `src/ui/dom.js`, options/crédits/pause/story/résultats (à rethématiser), pipelines `tools/`, `tests/autoplay.js` (à adapter). Les agents narration/DA/audio/UI sont relancés avec les nouveaux briefs. | — | Phase 2 bis : physique + règles + IA jouables |

---

## 8. Problèmes rencontrés et solutions

| Problème | Solution |
|---|---|
| Sites des banques d'assets bloqués par le proxy (403 CONNECT) | Miroirs GitHub des mêmes packs CC0/CC-BY, avec licence embarquée ; clone partiel (`--filter=blob:none --sparse`) |
| Pas de `ffmpeg` système | `pip install imageio-ffmpeg` : binaire statique avec libvorbis/libopus/libmp3lame |
| Pas de rasteriseur SVG (rsvg, inkscape) pour obtenir des sprites Kenney en haute résolution | Chromium (Playwright) rend le SVG à 3× ou 4× ; un script Python apparie les composantes connexes aux sprites du manifeste (`tools/rasterize_ships.js`, `tools/upscale_ships.py`, généralisés en `tools/rasterize_svg.js` / `tools/upscale_from_svg.py`) |
| Rendu logiciel (Playwright headless) très lent sur les gros calques alpha plein écran | Calques lourds en demi-résolution, images pré-teintées hors ligne (plus de `ctx.filter`) |
| Le concept initial dupliquait un jeu antérieur du commanditaire | Pivot complet documenté ci-dessus, moteur conservé |
