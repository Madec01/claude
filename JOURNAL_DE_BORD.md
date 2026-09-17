# JOURNAL DE BORD — « CENT SAISONS »

> Document de référence du projet. Il permet à n'importe qui (humain ou IA) de reprendre le projet à froid.
> Règle : aucune modification significative du jeu sans une ligne dans le **Journal des modifications** (section 7).

> **Historique des pivots.** Le projet a connu deux concepts abandonnés : « Feux de Brume » (gardienne de phare, jugé trop proche d'un jeu antérieur du commanditaire) puis « Tu tires ou tu pointes ? » (pétanque narrative, ébauche interrompue quand le commanditaire a demandé dix propositions). Le concept retenu par le commanditaire est **Cent Saisons**. Le moteur générique (boucle, entrées, chargeur, audio, sauvegarde, scènes, particules, écrans DOM, pipelines d'assets, bot de QA) est conservé ; tout le reste est refait. Les anciens concepts sont archivés en section 6 et dans l'historique git.

---

## 0. Fiche d'identité

| | |
|---|---|
| **Titre** | Cent Saisons |
| **Sous-titre** | L'île qui se souvient |
| **Genre** | Puzzle de placement de tuiles hexagonales, contemplatif et stratégique, en vue isométrique ; solo ; intemporel |
| **Plateforme** | Navigateur desktop (Chrome / Firefox / Edge à jour), serveur statique ou GitHub Pages |
| **Langue** | Français exclusivement (UI, textes, histoire). Code et identifiants en anglais. |
| **Durée d'une partie** | Une île : 6 à 20 minutes ; campagne de 12 îles (≈ 2 h) ; Île infinie et Jardin sans limite |
| **Stack** | HTML5 + CSS3 + JavaScript ES2022 (modules natifs), Canvas 2D, Web Audio API. Aucune dépendance, aucun build. |
| **Dépôt** | `Madec01/claude`, branche `claude/modest-faraday-o5034z` |
| **Point d'entrée** | `index.html` à la racine (chemins relatifs, compatible GitHub Pages) |

---

## 1. Vision du jeu

**Pitch (3 lignes).** Une île s'est éteinte : sable, roche, silence. Tu es la Saison, l'esprit qui la remet en marche. Tuile après tuile, tu redessines forêts, rivières, prairies et hameaux ; la vie revient, les animaux reviennent, et l'île se souvient à voix haute de ce qui l'a endormie.

**Public visé.** Joueuses et joueurs desktop de 10 ans et plus, amateurs de puzzles calmes et profonds (*Dorfromantik*, *Carcassonne*, *Islanders*), de parties courtes et de « encore une tuile ». Aucun réflexe demandé.

**Sensation recherchée.** La satisfaction d'une tuile qui tombe pile au bon endroit (petit rebond, « toc » de bois, points qui fleurissent sur chaque bord), le plaisir de voir une île nue devenir un paysage vivant, et la surprise d'un changement de saison qui recolore tout et change les règles : la rivière gèle, les prairies sèchent, les vergers donnent. Une île terminée doit ressembler à une carte qu'on a envie de garder.

**Pourquoi ce jeu est amusant (thèse de design).**
1. **Un geste simple, une décision riche** : une tuile, une case. Le jeu affiche à l'avance les points de chaque bord : le joueur comprend toujours *pourquoi* il gagne ou perd des points.
2. **Des régions qui se ferment** : encercler complètement une forêt ou un lac déclenche une prime et une animation. C'est l'objectif à court terme qui structure chaque partie.
3. **Des saisons qui changent la valeur des tuiles** : la même prairie vaut de l'or au printemps et sèche en été si elle est isolée. On planifie deux saisons à l'avance.
4. **La faune comme récompense visible** : les animaux ne sont pas un compteur, ils apparaissent sur l'île quand on a bien construit, et ils partent quand on la fragmente.
5. **Des vœux** qui donnent des objectifs concrets et racontent l'île.

---

## 2. Game Design Document (GDD)

### 2.1 Univers et contexte

- **L'archipel des Cent Saisons** : douze îles éteintes, chacune un souvenir. Aucune époque : pas de date, pas de technologie ; des hameaux de pierre et de bois, des moulins, des vergers, des barques.
- **La Saison** : le joueur. Un esprit sans corps, qui pose des tuiles comme on pose des souvenirs. La narration est celle de l'île, à la première personne du pluriel (« nous »).
- **Ce qui a endormi les îles** : elles ont oublié leurs saisons. Quand tout est resté pareil trop longtemps (toujours l'été, toujours la moisson), les rivières se sont tues, les animaux sont partis, les hameaux se sont vidés. Le jeu ne moralise pas : il montre que la vie tient au changement.

### 2.2 Personnages

| Voix | Rôle |
|---|---|
| **L'île** (« nous ») | Narratrice : fragments de mémoire à la fin de chaque île, courts et concrets (une fête d'hiver, un verger, un pont emporté) |
| **La Saison** (le joueur) | Jamais représentée, jamais nommée autrement ; les vœux lui sont adressés à la deuxième personne |
| **Les habitants** | Jamais vus de près : silhouettes des hameaux, auteurs des vœux (« le meunier », « les enfants du hameau du nord », « la vieille passeuse ») |
| **La faune** | Lapin, élan, grenouille, canard, ours, hibou, manchot d'hiver : ils apparaissent quand un habitat existe, ils partent quand il se brise |

### 2.3 Structure narrative (12 îles, 3 archipels)

- **Archipel du Nord — Réveil (îles 1 à 4).** Apprentissage : poser, fermer une région, l'eau qui rejoint la mer, les saisons. L'île raconte des choses simples : le premier verger, le premier pont de glace.
- **Archipel du Milieu — Mémoire (îles 5 à 8).** La faune, les vœux, les souffles, les tuiles rares. Les fragments révèlent la longue saison unique qui a tout figé.
- **Archipel du Large — Cent saisons (îles 9 à 12).** Grandes îles, saisons courtes, vœux liés entre eux. La dernière île, une fois vivante, apprend à changer de saison seule : la Saison peut partir. Épilogue : « Nous n'avons plus besoin d'être rappelées. Nous nous souvenons. »
- **Après la fin** : Île infinie (score, saisons qui s'enchaînent) et Jardin (pose libre).

Les textes (fragments, vœux, tutoriel, fin) sont dans `src/data/story.js`, rédigés par le sous-agent narration.

### 2.4 La grille et les tuiles

- **Grille hexagonale à sommet en haut** (tuiles Kenney Hexagon Pack, 120×140 px natifs, rasterisées en 2×), coordonnées axiales `(q, r)` ; voisins horizontaux à 120 px, lignes espacées de 105 px avec décalage d'une demi-tuile.
- **Une île** = un masque de cases (les autres cases sont la mer), quelques tuiles de départ (rochers, ruines, un premier hameau), une **file** de tuiles à poser (3 visibles, la première est obligatoire) et un nombre de tuiles total.
- **Règle de pose** : sur une case vide du masque, adjacente à au moins une tuile posée. Les tuiles n'ont pas d'orientation (pas de rotation) : la décision porte uniquement sur *où*.
- **Familles de tuiles** : prairie, forêt, champ, hameau, verger, eau, marais, roche, sable ; tuiles rares (récompenses de vœux) : moulin, chapelle, tour de guet, puits, campement.

### 2.5 Mécaniques

Introduites progressivement (une nouveauté par île en archipel du Nord).

1. **Affinités** — *île 1*. Chaque bord partagé rapporte des points : même famille +1 (hameau-hameau +2), bonnes paires +2 (champ↔hameau, verger↔prairie, verger↔hameau, marais↔eau, forêt↔roche, sable↔eau), paires douces +1 (prairie↔forêt, hameau↔eau « le port »), mauvaises paires −1 (hameau↔marais, champ↔roche, champ↔sable, forêt↔sable). Les points s'affichent bord par bord avant la pose.
2. **Régions closes** — *île 1*. Un groupe connexe de même famille entièrement entouré (aucune case vide adjacente dans le masque) rapporte une prime égale à sa taille (×2 pour les hameaux « bourgs »). Animation de fermeture.
3. **Rivières** — *île 2*. Une tuile d'eau reliée par une chaîne d'eau à la mer (bord du masque) ou à une roche (source) est une **rivière** : +2 à la pose et prime de longueur à la fermeture ; sinon c'est une **mare** (+1, +2 avec un marais).
4. **Saisons** — *île 3*. Toutes les N poses (12 par défaut, moins sur les grandes îles), la saison avance : printemps → été → automne → hiver. Chaque saison recolore l'île et change une règle :
   - *Printemps* : les marais fleurissent (+2 chacun à la transition), poser de l'eau rapporte +1 de plus (la crue).
   - *Été* : une prairie sans eau, forêt ni marais adjacent **sèche** (elle ne rapporte plus d'affinités jusqu'à l'automne) ; un champ adjacent à l'eau rapporte +1 (irrigation).
   - *Automne* : **récolte** : chaque paire verger↔hameau rapporte +2 ; les forêts roussissent.
   - *Hiver* : l'eau **gèle** : les chaînes d'eau gelée relient les hameaux (« la veillée » : +3 par paire de hameaux reliés) ; les champs sont dormants (plus de bonus champ↔hameau) ; neige.
5. **Faune** — *île 4*. Les animaux apparaissent quand leur habitat existe et partent quand il se brise : lapin (prairie ≥ 3), élan (forêt ≥ 5), grenouille (marais adjacent à l'eau), canard (eau ≥ 3), ours (forêt adjacente à roche, ≥ 3), hibou (forêt adjacente à hameau), manchot (hiver seulement, eau gelée ≥ 4). À chaque changement de saison, chaque animal présent donne +1 souffle et +3 points.
6. **Vœux** — *île 5*. Trois vœux par île, formulés par les habitants, avec une échéance (en poses ou « avant l'hiver ») : taille de région, nombre de paires, rivière jusqu'à la mer, animal présent, région close de taille N… Réussir un vœu injecte une **tuile rare** dans la file et débloque un fragment de mémoire.
7. **Souffles** — *île 6*. Monnaie de l'île, gagnée par la faune et les vœux, dépensée pendant la partie : **échanger** la tuile obligatoire avec l'une des deux suivantes (1 souffle), **défausser** la tuile (2), **bourgeon** : transformer une prairie posée en forêt ou en verger (3), **souvenir** : annuler la dernière pose (4, une fois par saison).
8. **Tuiles rares** — *île 7*. Le moulin (compte comme champ et hameau), la chapelle (tous les bords voisins +1 en hiver), la tour de guet (clôt une région même avec une case vide), le puits (protège les prairies adjacentes de la sécheresse), le campement (attire un animal quel que soit l'habitat).

### 2.6 Boucle de jeu

**Boucle de 20 secondes** : la tuile suivante est affichée → je survole l'île, les points par bord et les régions qui se fermeraient s'affichent → je clique → la tuile tombe, rebondit, les points fleurissent, une région se ferme peut-être, un animal apparaît peut-être.

**Boucle d'une saison (≈ 3 min)** : douze poses, puis la transition : l'île change de couleur, les règles de la saison s'appliquent avec leurs animations (fleurs, sécheresse, récolte, gel), la faune donne ses souffles.

**Boucle d'une île (6 à 20 min)** : fragment d'ouverture → poses et saisons → vœux réussis ou perdus → fin de la file (ou plus de coup possible) → bilan (points, étoiles, vœux, faune) → fragment de mémoire → **Atelier des saisons** (graines → améliorations) → île suivante.

**Boucle de campagne** : 12 îles, difficulté croissante (masques plus fragmentés, saisons plus courtes, vœux liés), fin, puis modes infinis.

### 2.7 Conditions de victoire et de défaite

- **Île terminée** quand la file est vide ou qu'aucune pose n'est possible. Il n'y a pas de « défaite » : le score donne 0 à 3 étoiles (seuils par île) ; la 3e étoile exige les trois vœux. Une île peut être rejouée pour ses étoiles.
- **Campagne terminée** : île 12 avec au moins 1 étoile → fin, générique, Île infinie et Jardin déverrouillés.
- **Île infinie** : la file ne s'épuise jamais, l'île grandit (le masque s'étend à chaque saison) ; fin quand aucune pose n'est possible ; meilleur score sauvegardé.

### 2.8 Économie et progression

- **Souffles** (dans l'île) : voir 2.5.
- **Graines** (méta-progression) : +1 par étoile, +1 par vœu réussi, +2 par île terminée. Dépensées à **l'Atelier des saisons** :
  - *Regard* : file visible 3 → 4 → 5 tuiles.
  - *Poche* : garder une tuile de côté (1 puis 2 emplacements).
  - *Souffle de départ* : +2 / +4 / +6 souffles au début de chaque île.
  - *Patience des saisons* : +1 / +2 poses par saison.
  - *Semence rare* : une tuile rare au choix injectée au début de chaque île.
  - *Seconde chance* : le souvenir (annuler) coûte 3 au lieu de 4, puis 2.

### 2.9 Modes de jeu

- **Campagne** (12 îles, sauvegarde automatique, sélection des îles jouées).
- **Île infinie** (déverrouillée après l'île 6 ou par le mode test).
- **Jardin** (pose libre, toutes les tuiles, sans score, sans file : on choisit la tuile ; pour faire de belles îles).
- **Mode test** (options) : déverrouille tout, panneau de débogage (`F1`), file infinie (`F2`), saison suivante (`F3`), souffles illimités (`F4`), terminer l'île (`F5`). Les scores du mode test ne sont pas enregistrés.

### 2.10 Contrôles

| Action | Entrée |
|---|---|
| Choisir la case | Survoler ; les points par bord s'affichent |
| Poser la tuile | Clic gauche |
| Déplacer la vue | Clic droit ou molette enfoncée et glisser ; flèches |
| Zoom | Molette |
| Échanger la tuile avec la 2e / 3e de la file (1 souffle) | `2` / `3` ou clic sur la tuile |
| Défausser (2 souffles) | `X` ou bouton |
| Bourgeon (3 souffles) | `B` puis clic sur une prairie |
| Souvenir : annuler (4 souffles) | `Z` ou bouton |
| Mettre en poche / reprendre | `P` ou clic sur la poche |
| Pause | `Échap` |
| Couper le son | `M` |

---

## 3. Direction artistique et audio

### 3.1 Style visuel

- **Tuiles hexagonales isométriques Kenney** (Hexagon Pack : prairies, forêts, roches, champs, hameaux, objets ; Hexagon Tiles pour l'eau, les ponts, les buissons), rasterisées en 2× depuis les SVG et **déclinées par saison par recoloration contrôlée** (printemps vert tendre + fleurs, été vert chaud, automne ocre et roux, hiver neige et ombres bleues). Mer animée autour de l'île (vagues discrètes), ombres portées douces.
- **Composition** : l'île centrée, la file de tuiles à gauche dans un carnet, les vœux à droite sur des feuilles épinglées, la saison et le score en haut ; tout l'écran respire (fond papier clair légèrement texturé, pas de sombre).
- **Feedback** : chute et rebond de la tuile, chiffres qui poussent sur chaque bord (vert, or, rouge), onde de fermeture de région, apparition de la faune (bond + halo), transition de saison en balayage diagonal avec particules (pétales, poussière, feuilles, neige), tremblement léger sur les grosses primes.
- **Palette** :

| Usage | Couleur |
|---|---|
| Papier (fond, UI) | `#f4efe6`, encre `#2b2a26` |
| Mer | `#7fb8d8` → `#5a9bc4` |
| Printemps / été / automne / hiver | `#6dbf67` / `#4a9e4f` / `#d98a3a` / `#e8eef4` |
| Accent (points, souffles) | `#2f9e8f` (souffle), `#e0a33a` (or), `#d95f4b` (perte) |
| Vœux | `#8a6fb5` |

### 3.2 Polices (Google Fonts, auto-hébergées en WOFF2, SIL OFL 1.1)

- **Lora** (titres et fragments de mémoire : serif douce, intemporelle) ;
- **Quicksand** (UI, HUD, boutons : rondeur assortie aux tuiles Kenney).

### 3.3 Banques d'assets utilisées (toutes vérifiées)

Le proxy réseau bloque les sites des banques ; les assets sont récupérés depuis des **miroirs GitHub** des mêmes packs, licence embarquée.

| Asset | Source | Auteur | Licence | Miroir |
|---|---|---|---|---|
| Hexagon Pack (tuiles terrain 5 types × 19 variantes, objets : arbres, rochers, maisons, ferme, moulin, chapelle, puits, tour, ruines…) | kenney.nl | Kenney | CC0 1.0 | github.com/ETdoFresh/kenney.nl (`hexagon-pack`) |
| Hexagon Tiles (eau, vagues, ponts, buissons, fleurs, collines, arbres par saison) | kenney.nl | Kenney | CC0 1.0 | idem (`hexagontiles`) |
| Animal Pack Redux (faune : lapin, élan, grenouille, canard, ours, hibou, manchot) | kenney.nl | Kenney | CC0 1.0 | idem (`kenney_animalpackredux`) |
| Particle Pack (pétales, feuilles, neige, halos, étincelles) | kenney.nl | Kenney | CC0 1.0 | idem (`particlePack_1.1`) |
| UI Pack, Game Icons | kenney.nl | Kenney | CC0 1.0 | idem |
| UI Audio, Interface Sounds, Impact Sounds, RPG Audio | kenney.nl | Kenney | CC0 1.0 | idem |
| Musiques (Kevin MacLeod : « Morning », « Kalimba Relaxation Music », « Evening », « Ethereal Relaxation », « Gymnopédie n° 1 », « Dream Catcher », « Beauty Flow », etc. — liste finale en 3.4) | incompetech.com | Kevin MacLeod | CC BY 4.0 | github.com/noobsandnerdsgroup/audio |
| Ambiances : forêt et oiseaux, ruisseau, vent, pluie, grillons (enregistrements de terrain, boucles) | freesound.org (CC0) | felix.blume, IceVFX, richwise, Sheyvan, SecureSubset | CC0 1.0 | github.com/funcoder/omarchy-ambient |
| SFX : bois, papier, eau, cloches, créatures (packs « 100 CC0 SFX », « 80 CC0 creature SFX », etc.) | opengameart.org | rubberduck et autres | CC0 1.0 | github.com/lavenderdotpet/CC0-Public-Domain-Sounds |
| Samples d'instruments réels (carillons de points, jingles de saison) | FluidR3_GM | Frank Wen | CC BY 3.0 | github.com/gleitz/midi-js-soundfonts |
| Polices | fonts.google.com | Lora (Cyreal), Quicksand (Andrew Paglinawan) | SIL OFL 1.1 | fonts.googleapis.com / fonts.gstatic.com |

### 3.4 Plan audio

- **Musiques (Kevin MacLeod, CC BY 4.0)** : une par saison, enchaînées par crossfade au changement de saison : printemps « Morning », été « Kalimba Relaxation Music », automne « Evening », hiver « Ethereal Relaxation » (ou « Gymnopédie n° 1ère ») ; menu « Dream Catcher » ; bilan / atelier « Beauty Flow » ; fin « Almost Bliss ». OGG Vorbis q5, boucles propres.
- **Ambiances (CC0)** : oiseaux de forêt (printemps/été), ruisseau près des rivières, vent (automne/hiver), pluie (transition d'automne), grillons (été). Mixées selon la saison et la composition de l'île (plus de forêt = plus d'oiseaux).
- **SFX** : pose de tuile (bois, « toc » + variantes), points (carillon de samples réels : glockenspiel/célesta, une note par point, gamme montante sur les combos), région close (accord), animal (petit cri CC0 + « pop »), saison (jingle de 2 s aux samples réels par saison), vœu réussi (carillon), souffle (souffle de vent court), UI (Kenney), échec de vœu (note grave douce).
- **Interdit** : toute synthèse « chiptune » ; les jingles sont faits de samples d'instruments réels.

---

## 4. Architecture technique

### 4.1 Choix

- **Vanilla JS + Canvas 2D, sans moteur ni build** : GitHub Pages sans compilation, aucune dépendance réseau, rendu 2D léger, lisibilité à froid.
- **Résolution logique 1280×720**, mise à l'échelle (letterbox), `devicePixelRatio` géré ; caméra (zoom/pan) sur l'île.
- **Modèle de jeu pur** (`src/game/board.js`, `rules.js`, `seasons.js`, `fauna.js`, `wishes.js`) sans DOM ni canvas : testable en Node, utilisé par le bot de QA et par les prévisualisations de score.
- **Audio** : Web Audio API (bus master / musique / ambiance / SFX).
- **Sauvegarde** : `localStorage` versionné (campagne, étoiles, graines, améliorations, fragments lus, records, options).
- **Tests** : Playwright + Chromium : bot qui joue toutes les îles (placement glouton par score prévisualisé), zéro erreur console ; tests Node des règles (`tests/rules.test.js`).

### 4.2 Arborescence

```
/
├── index.html
├── css/                 base.css, menu.css, hud.css, fonts.css
├── src/
│   ├── main.js          bootstrap, scènes, flux de campagne
│   ├── core/            loop, input, assets, audio, save, scenes, particles, shake, math
│   ├── game/
│   │   ├── hex.js       coordonnées axiales, voisins, conversion écran ↔ grille
│   │   ├── board.js     état d'une île : masque, tuiles, régions connexes
│   │   ├── rules.js     affinités, prévisualisation de score, fermeture de régions, rivières
│   │   ├── seasons.js   cycle des saisons et leurs effets
│   │   ├── fauna.js     habitats, apparition et départ des animaux
│   │   ├── wishes.js    vœux, échéances, récompenses
│   │   ├── queue.js     file de tuiles, poche, souffles (échange, défausse, bourgeon, souvenir)
│   │   ├── island.js    déroulement d'une île (orchestration, événements, fin)
│   │   ├── camera.js    zoom, pan, cadrage automatique
│   │   ├── render.js    rendu (mer, tuiles par saison, faune, surbrillances, particules)
│   │   ├── hud.js       HUD DOM (saison, score, file, vœux, souffles, poche)
│   │   ├── effects.js   particules, textes flottants, transitions de saison
│   │   └── tutorial.js  consignes par île
│   ├── ui/              menu, options, crédits, story, results, atelier, pause, dom
│   └── data/            balance.js, tiles.js, islands.js, upgrades.js, story.js
├── assets/              img/, audio/, fonts/, credits/
├── tools/               pipelines Python/Node (rasterisation SVG, recoloration saisonnière, audio)
├── tests/               autoplay.js (bot Playwright), rules.test.js (Node)
├── README.md, CREDITS.md, LICENSE, JOURNAL_DE_BORD.md
```

### 4.3 Sous-agents (équipe)

| Rôle | Périmètre | Livrables |
|---|---|---|
| **Lead** | Vision, GDD, architecture, modèle de jeu, rendu, revue, journal | `JOURNAL_DE_BORD.md`, `src/core`, `src/game`, `src/data/*.js` (hors story) |
| **Narration** | Fragments de mémoire, vœux, tutoriel, fin | `src/data/story.js` |
| **DA & assets** | Tuiles 2×, variantes saisonnières, objets, faune, UI, polices | `assets/img`, `assets/fonts`, `assets/credits/images.json` |
| **Audio** | Musiques par saison, ambiances, SFX, jingles | `assets/audio`, `assets/credits/audio.json` |
| **UI/UX** | Menu, options (mode test), pause, bilan, atelier, crédits, HUD | `css/*`, `src/ui/*` |
| **QA** | Bot Playwright, tests des règles, rapport | `tests/*` |
| **Documentation** | README, crédits lisibles, relecture | `README.md`, `CREDITS.md` |

---

## 5. Registre des décisions

| Date | Décision | Alternatives envisagées | Raison |
|---|---|---|---|
| 2026-09-17 | Vanilla JS + Canvas 2D, zéro dépendance | Phaser, PixiJS, Kaboom | CDN bloqués ; rendu 2D natif suffisant ; lisibilité à froid |
| 2026-09-17 | Assets via miroirs GitHub des banques CC0/CC-BY | Attendre un accès direct ; placeholders | Sites bloqués ; miroirs avec licences embarquées ; placeholders interdits |
| 2026-09-17 | Pivot n° 1 : abandon de « Feux de Brume » | — | Reproduisait un jeu antérieur du commanditaire |
| 2026-09-17 | Pivot n° 2 : dix propositions, le commanditaire retient **Cent Saisons** (parmi Cent Saisons, Stagiaire de l'espace, L'Hiver de la panne) | Pétanque narrative (ébauchée), 7 autres concepts | Choix du commanditaire ; assets Kenney taillés pour le genre ; aucune IA adverse ; boucle « encore une tuile » très rejouable ; cadre intemporel (le commanditaire a relevé un excès de cadres historiques) |
| 2026-09-17 | Tuiles sans orientation (pas de rotation), rivières = chaînes de tuiles d'eau | Rivières et routes par bords (style Dorfromantik) | Les packs Kenney n'ont pas de tuiles à rivières par bord ; la décision « où » suffit ; les chaînes d'eau restent lisibles et stratégiques |
| 2026-09-17 | Variantes saisonnières par recoloration contrôlée des tuiles Kenney (tons vert → ocre → neige) | Mélanger deux packs de styles différents | Cohérence du style ; les saisons doivent recolorer *toute* l'île, y compris arbres et champs |
| 2026-09-17 | Base tuiles = Hexagon Pack (120×140, rasterisé 2×) ; Hexagon Tiles pour l'eau et quelques détails | Hexagon Tiles seul | Le Hexagon Pack a bien plus d'objets (hameaux, moulin, chapelle, champs) et 19 variantes par terrain |
| 2026-09-17 | Score de bord affiché avant la pose ; aucune défaite, étoiles | Score caché ; conditions d'échec | Lisibilité totale : le jeu est un puzzle de décision, pas de devinette |
| 2026-09-17 | Deux monnaies : souffles (dans l'île) et graines (méta) | Une seule | Séparer le tactique (pouvoirs pendant la partie) du stratégique (améliorations durables) sans mélange |
| 2026-09-17 | Français exclusif ; mode test dans les options ; GitHub Pages géré par le commanditaire | — | Demandes explicites |

---

## 6. Idées écartées

| Idée | Pourquoi écartée |
|---|---|
| **« Feux de Brume »** (gardienne de phare, 1893) — prototype complet | Reproduisait un des premiers jeux du commanditaire (commits `98867ba` → `854aa52`) |
| **« Tu tires ou tu pointes ? »** (pétanque narrative, 1962) — données, physique, IA ébauchées | Le commanditaire a demandé dix propositions et retenu Cent Saisons (commit `7bffa4f`) |
| Rotation des tuiles et rivières par bords | Pas d'assets adaptés ; complexité d'entrée sans gain de fun |
| Adversaire IA / multijoueur | Le genre est solitaire et contemplatif ; l'Île infinie apporte la compétition contre soi |
| Cadres historiques datés | Remarque du commanditaire ; Cent Saisons est intemporel |
| Musique composée par synthèse Web Audio | Interdite par le cahier des charges |

---

## 7. Journal des modifications

| Date | Phase | Sous-agent | Fait | Testé | Reste à faire |
|---|---|---|---|---|---|
| 2026-09-17 | 0 | Lead | Reformulation, plan d'équipe, validation du commanditaire (français exclusif, GitHub Pages géré par lui, menu complet avec mode test) | — | — |
| 2026-09-17 | 1–3 | Lead + agents | Concept « Feux de Brume » : journal, moteur générique (`src/core`), prototype jouable, 389 sprites, 8 musiques, 52 SFX, UI ; bot de QA parcourant 12 nuits sans erreur console | Playwright | Archivé |
| 2026-09-17 | Pivot 1 | Lead | Réorientation vers la pétanque : journal v2, données, physique déterministe, résolution de lancer, IA | — | Archivé |
| 2026-09-17 | Pivot 2 | Lead | Dix propositions ; le commanditaire choisit **Cent Saisons**. Analyse des packs Hexagon Pack / Hexagon Tiles / Animal Pack (géométrie : hexagones à sommet en haut, 120×140, lignes à 105 px). Journal v3 (ce document). | — | Phase 1 : briefs agents ; Phase 2 : prototype de la boucle (poser, scorer, fermer une région) |
| 2026-09-17 | 2 | Lead (moteur) | Modèle complet : grille axiale à sommet en haut (`hex.js`), plateau et régions (`board.js`), aperçu et application des points par bord (`rules.js`), saisons et événements (`seasons.js`), faune (`fauna.js`), vœux à échéance (`wishes.js`), file de tuiles pondérée et déterministe (`queue.js`), orchestrateur d'île avec souffles et historique (`island.js`) ; 12 îles + Île infinie + Jardin (`islands.js`), améliorations (`upgrades.js`) | `tests/rules.test.js` (bot glouton sur 14 îles) | — |
| 2026-09-17 | 2 | Lead (rendu/UI) | Rendu Canvas (mer par saison, cases légales, tuiles triées par ligne, aperçu des points, faune animée, balayage de saison), effets (particules, textes flottants, secousse), HUD DOM (file, poche, pouvoirs, vœux, faune, notifications), tutoriel contextuel, écrans menu / options / crédits / narration / bilan / atelier / pause, sauvegarde `cent-saisons.save` | Playwright : menu → île → bilan → souvenir → atelier sans erreur console | — |
| 2026-09-17 | 3 | Narration | `story.js` : prologue, 12 îles (nom, intro, souvenir, tutoriel), 24 vœux avec donateur et textes exaucé/échoué, saisons, faune, tuiles, souffles, bilans, fin, épilogue, intros des modes | Test de couverture (chaque île, vœu, saison, animal a son texte) | — |
| 2026-09-17 | 3 | Assets | `tools/build_images.py` : 123 tuiles 2× composées à partir du Hexagon Pack et des Hexagon Tiles (base + objets), recolorées par saison (HSV), neige en hiver ; faune (Animal Pack), 55 effets (Particle Pack), 67 icônes (UI Pack, Game Icons) ; `manifest.json` et `assets/credits/images.json` | Vérification alpha (aucun calque hors de l'hexagone), planches-contact par saison | — |
| 2026-09-17 | 3 | Audio | `tools/build_audio.py` : 8 musiques (Kevin MacLeod, boucles), 7 ambiances (Freesound CC0), 61 SFX (Kenney, rubberduck, Abstraction, carillons FluidR3_GM), tout en OGG ; `assets/audio/manifest.json`, `assets/credits/audio.json` | Chargement complet sans erreur ; clé manquante `fauna_goat` repliée sur `fauna_rabbit` | — |
| 2026-09-17 | 3 bis | Lead (art) | Demande du commanditaire : de vrais éléments de banque sur les tuiles. Densification : forêts à 5 / 7 / 9 arbres, vergers à 5 / 6 fruitiers + clôtures ou haie, champs à deux parcelles + foin + clôture, hameaux à trois bâtiments (maison, maisonnette, ferme, villa, remise, puits, bûches), rochers et prairies étoffés. La cabane médiévale (sprite pleine tuile) est remplacée par la ferme ; positions ajustées pour tenir dans l'hexagone | `tools/build_images.py --sheets` sans débordement ; planches été/hiver ; captures en jeu | — |
| 2026-09-17 | 4 | Lead (QA) | Correctifs : `append()` sans « null » dans les panneaux, seuils d'étoiles abaissés à 2,6 / 4,8 / 7,2 points par case, carte de tutoriel transparente aux clics (hors bouton), icônes `icon_wind` / `icon_pocket`, titre du menu sur une ligne ; bot Playwright refondu (bouton « Passer », attente de l'île attendue après le fondu) | `node tests/autoplay.js 1-12,infinite,garden` : 14 parcours, aucune erreur console, 1 à 2 étoiles pour le bot glouton | — |
| 2026-09-17 | 4 bis | Lead (QA) | Ouvertures guidées des îles 1 à 3 (`opening` : prairie, forêt, champ… au lieu d'un tirage pouvant donner trois marais), carte de tutoriel masquée pendant la pause, liste des crédits raccourcie sur l'écran de fin pour garder le bouton visible | Captures Playwright (fin, pause, début d'île 1) ; bot îles 1–3 sans erreur | — |
| 2026-09-17 | 6 | Lead (design) | Retour joueur : « je n'arrive jamais à l'hiver » et « je ne sais pas ce qu'est le souffle ». Saisons de 6 / 7 / 8 / 9 poses sur les îles 1–4 (les quatre saisons sont traversées dès la première île, tutoriel de saison à l'île 1) ; souffles introduits à l'île 3 et gagnés à chaque région fermée (+1, texte flottant), rares à l'île 6 ; l'Atelier verrouille les améliorations dont la mécanique n'est pas encore introduite (« Se débloque à l'île N ») | `node tests/rules.test.js` ; bot îles 1–3 | — |
| 2026-09-17 | 6 | Lead (UI) | Retour joueur : « mettre en valeur le total ». Badge TOTAL de l'aperçu : plus grand, ombré, liseré or, libellé, pastilles de bord réduites | Capture en jeu | — |
| 2026-09-17 | 6 | Lead (UI) | Retour joueur : « un tuto pour connaître les tuiles… et un guide ». Écran **Guide** (menu et pause) généré depuis les données : tuiles avec bonnes (+2 / +1) et mauvaises (−1) paires, saisons, faune et habitats, tuiles rares, souffles et vœux, graines et Atelier. Note sur l'origine des graines au bilan et à l'Atelier | Captures | — |
| 2026-09-17 | 6 | Lead (contenu) | Retour joueur : « de nouveaux types de tuiles, effets et éléments à débloquer ». **Colline** (dès l'île 7 : +2 roche, fait naître les rivières, chevaux) et **Lande** (dès l'île 9 : fleurit au printemps, ne sèche pas, protège les prairies, vaches) ; faune **poule** (hameau bordé de 2 champs), **cheval**, **vache** ; rares **Grenier** (champ, +1 par champ, éveillé en hiver) et **Fontaine** (hameau, +1 par hameau, abri contre la sécheresse) ; Atelier : **Refuge** (faune), **Source** (rivières), **Almanach** (graines), Semence rare étendue (Grenier, Fontaine). Îles 7–12, Île infinie et Jardin utilisent les nouvelles pondérations ; vœu w10_1 devient « Des poules dans la cour » ; w12_1 demande 6 espèces | Tests modèle, bot 1–12 | — |
| 2026-09-17 | 6 | Lead (art) | Collines à partir de la tuile surélevée `grass_17` (plateau et talus) recolorée par saison ; landes : sol ocre + bruyères violettes (bushGrass recolorées) ; grenier (silo1), fontaine ; faune poule et vache (Animal Pack) | Pipeline sans débordement, planches | — |
| 2026-09-17 | 6 | Lead (design) | Retour joueur : « je n'ai vu aucun vœu ». Les vœux commencent à l'île 2 (un vœu simple : une rivière), puis deux par île aux îles 3 et 4 ; tutoriel des vœux déplacé à l'île 2 ; cinq nouveaux textes de vœux (passeur du gué, meunière, enfants de la pointe, vieille femme aux pommes, garde des haies) | Tests modèle, bot îles 2–4 | — |
| 2026-09-17 | 7 | Lead (mobile) | Demande du commanditaire : jeu adapté au téléphone + plein écran. Module `src/core/stage.js` : sur bureau la scène 1280×720 reste mise à l'échelle ; sur téléphone / petite tablette (côté < 620 px ou tactile < 1200 px) la scène logique prend tout l'écran à l'échelle 1 et `css/mobile.css` réorganise l'interface (classes `html.compact/.portrait/.landscape/.touch`) : barre du haut condensée, file de tuiles en bas (portrait) ou en colonne étroite (paysage), vœux repliés derrière un bouton, panneaux pleine largeur. Tactile (`input.js`) : un doigt = tap (première touche = aperçu de la case, seconde touche ou bouton « Poser ici » = pose), glissement = déplacement, deux doigts = zoom. Boutons Forêt / Verger / Annuler dans la barre du bourgeon. Plein écran : bouton dans le HUD tactile, la pause et le menu (API Fullscreen), et manifeste PWA (`manifest.webmanifest`, icônes 192/512, méta iOS) pour l'ajout à l'écran d'accueil sur iPhone où l'API n'existe pas | `tests/mobile.js` (iPhone 12 portrait et paysage, Pixel 7) : captures, tap-tap, bouton Poser, pan et pinch par CDP | — |
| 2026-09-17 | 8 | Lead (rendu) | Lot 2 (feuille de route) : **décor composé par région**. Le pipeline exporte des sols par type de terrain (`ground_*`, couleur moyenne dans le manifeste) et 120 objets par saison (`obj_*`, ancrés en bas). `src/game/decor.js` place les objets par région de même famille, de façon déterministe (graine par case) : forêts de 5 à 12 arbres selon les voisines, massifs rocheux (gros rocher au cœur, petits sur les arêtes), villages (maisons tournées vers le centre, puits central dès 3 tuiles, lanterne pour un bourg clos), vergers en rangs continus, marais, landes, collines. Le rendu (`render.js`) dessine ombres → sols → raccords entre sols identiques (couture effacée) → sentiers → objets triés par pied ; les tuiles rares gardent leur image composée. **Sentiers automatiques** (`paths.js`) : ruelles en arbre de desserte dans chaque village et sentier entre deux villages séparés d'au plus trois tuiles de terre ouverte, +1 point par liaison à chaque saison ; plateau versionné (`board.version`) pour ne recalculer qu'au changement | Bot 1–12 + infini + jardin sans erreur ; captures îles 5 et 9 (zoom, hiver) | Vie, météo, événements, île du jour, musiques |
| 2026-09-17 | 9 | Lead (gameplay) | **Météo** (`weather.js`) : dès l'île 4, un événement par saison au plus, annoncé au début (cloche, ligne dans la boîte de saison) et actif à la mi-saison : orage (rivières +2, pluie, tonnerre, ambiance orage CC0), canicule (sécheresse étendue sauf eau / puits / fontaine / abreuvoir / lande, voile chaud), grand vent (forêts et vergers +1, moulins +3 à la saison suivante, rafales de feuilles), bourrasque (file masquée, échanges impossibles, brume de neige), redoux (dégel, canards de retour). État dans l'historique du souvenir | Test modèle (activation de chaque météo), captures | — |
| 2026-09-17 | 9 | Lead (gameplay) | **Tuiles d'événement** dès l'île 5 : Marché (choix de la famille des trois tuiles suivantes, sélecteur du Jardin réutilisé), Fête (+2 par hameau voisin à la saison suivante, une fois), Ruine à restaurer (prend la famille majoritaire autour d'elle). **Rares tardives** dès l'île 8 : Auberge (+1 par sentier du village), Abreuvoir (anti-sécheresse, cheval et vache avec une tuile), Porche (bourg clos ×3), Mine (+1 par roche, roche close ×2), Four à pain (+1 par champ). Recettes Kenney, textes, guide | Test modèle | — |
| 2026-09-17 | 9 | Lead (rendu) | **Vie sur les tuiles** : fumée des cheminées (hiver, automne), reflets sur l'eau, feuilles et pétales qui partent des arbres, neige secouée des arbres voisins d'une pose en hiver, animaux qui se déplacent lentement dans leur région (canards qui glissent, lapins qui sautillent) | Captures | — |
| 2026-09-17 | 9 | Lead (modes) | **Île du jour** (`data/daily.js`) : île déterministe depuis la date (60 à 90 cases, pondération et saison de départ tirées), trois vœux d'une réserve de neuf (textes dédiés), météo active ; meilleur score du jour, historique et série de jours dans la sauvegarde ; bouton de menu (dès l'île 4), bilan dédié, musique « Maccary Bay » | Test modèle (déterminisme, partie complète), bot `daily` | — |
| 2026-09-17 | 9 | Lead (audio) | Cinq musiques Kevin MacLeod de plus (Cloud Dancer, Pleasant Porridge, Leaving Home, Night Vigil en alternance d'une île à l'autre ; Maccary Bay pour l'île du jour), ambiance orage (Sheyvan, CC0), tonnerre (rubberduck, CC0), cloche d'annonce (rubberduck, CC0) | Vérification du script audio | — |
| 2026-09-17 | 9 bis | Lead (rendu) | Retour joueur après essai sur téléphone : forêts encore trop claires, montagnes isolées, champs illisibles, aucune fumée, feuilles sur tout l'écran. Corrections : forêts à 16–30 arbres par tuile (le sol disparaît), massif rocheux composé sur toute la région (sommets agrandis au cœur, crêtes à cheval sur les arêtes), champs = sol de terre nue + rangs de culture alignés sur une grille commune à la région (pousses, blé vert, blé mûr, chaume sous la neige), fumée grise plus dense (particules d'image teintées via un canvas en cache), particules dessinées dans le repère monde (elles suivent désormais la caméra), feuilles et pétales émis uniquement depuis les arbres, animaux plus vifs | Captures été / automne / hiver, bot, suite mobile | — |
| 2026-09-17 | 10 | Lead (UI/audio) | Retour joueur : notifications trop fugaces, musique de printemps. **Journal de l'île** : bouton (i) dans la barre du haut avec pastille de non-lus, touche J, panneau défilant de toutes les notifications de la partie horodatées par saison et numéro de pose ; les notifications restent affichées plus longtemps (4,2 s, 6 s pour saisons / vœux / rares). **Musique** : « Cloud Dancer » retiré, le printemps garde toujours « Morning » ; les trois autres saisons alternent entre deux pistes d'une île à l'autre | Suite mobile (journal ouvert sur trois appareils), capture bureau | — |
| 2026-09-17 | 11 | Lead (retours joueur) | **Vœux** : la progression restait figée après l'échéance (« passé » discret) → la progression réelle continue de s'afficher, libellé « trop tard (pose N) », notification explicite, échéance du premier vœu de l'île 5 allongée. **Sentiers organiques** : points de contrôle décalés perpendiculairement (déterministes) et courbes lissées. **Fiche de la tuile à poser** (bas gauche, touche H, option) : nom, effet, paires +2 / +1 / −1 parmi les familles de l'île. **Tutoriel guidé** sur l'île 1 : neuf étapes, case cible qui brille (`island.restrict`), file fixée (`opening` prolongé par `pendingOpening`), cases garanties dans le masque (`ensure`) ; explique pose, affinités, bonnes et mauvaises paires, rivière, saison, région close. **Musique** : les pistes d'origine jouent au premier passage de chaque saison, les variantes seulement quand la saison revient dans la même île. **Champs** : vignettes de file régénérées (terre + rangs de culture + foin), plus de confusion avec les hameaux | Script Playwright du tutoriel (clic hors cible refusé, 7 poses, saison, région close), bot, suite mobile | — |
| 2026-09-17 | 5 | Lead (docs) | README réécrit pour Cent Saisons ; `CREDITS.md` généré par `tools/build_credits.py` depuis `assets/credits/*.json` ; journal mis à jour | Relecture | — |

---

## 8. Problèmes rencontrés et solutions

| Problème | Solution |
|---|---|
| Sites des banques d'assets bloqués par le proxy (403 CONNECT) | Miroirs GitHub des mêmes packs CC0/CC-BY, clone partiel (`--filter=blob:none --sparse`) |
| Pas de `ffmpeg` système | `pip install imageio-ffmpeg` : binaire statique avec libvorbis/libopus/libmp3lame |
| Pas de rasteriseur SVG (rsvg, inkscape) | Chromium (Playwright) rend les SVG Kenney à 2× ; appariement des composantes connexes aux sprites du manifeste par taille et similarité (`tools/rasterize_svg.js`, `tools/upscale_from_svg.py`) |
| Rendu logiciel (Playwright headless) lent sur les gros calques alpha | Calques lourds en demi-résolution, images pré-teintées hors ligne |
| Concepts jugés non originaux par le commanditaire | Deux pivots documentés ; choix final par le commanditaire parmi dix propositions |
| Le sprite `medieval_cabin` du Hexagon Pack est une tuile complète (240×280), pas un objet | Exclu des recettes ; le contrôle d'alpha hors hexagone du pipeline lève une erreur avant toute écriture |
| `ParentNode.append(null)` insère le texte « null » dans les panneaux | Aide `append()` dans `src/ui/dom.js` qui ignore `null` / `undefined` / `false` |
| La carte de tutoriel (bas de l'écran) interceptait les clics sur les cases situées dessous | `pointer-events: none` sur la carte, `all` sur son bouton |
| Le sprite `hillGrass` des Hexagon Tiles ne fait que 33×12 px : invisible une fois posé | Collines construites sur la tuile terrain surélevée `grass_17` du Hexagon Pack (plateau + talus), même hexagone de base |
| Le changement de scène passe par un fondu : le bot jouait sur l'île précédente | Le bot attend l'île attendue (`isl.def.id`, `garden`, `infinite`) avant de jouer |
