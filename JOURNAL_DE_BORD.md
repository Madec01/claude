# JOURNAL DE BORD — « FEUX DE BRUME »

> Document de référence du projet. Il permet à n'importe qui (humain ou IA) de reprendre le projet à froid.
> Règle : aucune modification significative du jeu sans une ligne dans le **Journal des modifications** (section 7).

---

## 0. Fiche d'identité

| | |
|---|---|
| **Titre** | Feux de Brume |
| **Sous-titre** | Chroniques du phare de Sant-Aël |
| **Genre** | Action-stratégie atmosphérique en temps réel, vue de dessus (« guide les navires à travers la brume ») |
| **Plateforme** | Navigateur desktop (Chrome / Firefox / Edge à jour), serveur statique ou GitHub Pages |
| **Langue** | Français exclusivement (UI, textes, histoire). Code et identifiants en anglais. |
| **Durée d'une partie** | 12 nuits de 3 à 5 minutes (campagne ≈ 60–75 min), plus un mode « Veille infinie » |
| **Stack** | HTML5 + CSS3 + JavaScript ES2022 (modules natifs), Canvas 2D, Web Audio API. Aucune dépendance, aucun build. |
| **Dépôt** | `Madec01/claude`, branche `claude/modest-faraday-o5034z` |
| **Point d'entrée** | `index.html` à la racine (chemins relatifs, compatible GitHub Pages) |

---

## 1. Vision du jeu

**Pitch (3 lignes).** 1893. Élise Kervran reprend le phare de Sant-Aël après la disparition de son père. Chaque nuit, une brume anormale monte sur la passe et avale les navires. Avec son faisceau, sa corne de brume et ses cartes, Élise doit guider les bateaux jusqu'au port, nuit après nuit, et comprendre ce que la Brume veut vraiment.

**Public visé.** Joueuses et joueurs desktop de 12 ans et plus, amateurs de jeux d'ambiance et de gestion tendue (type *Mini Metro*, *Flight Control*, *Papers, Please* pour la montée de tension), sessions courtes de 3 à 5 minutes.

**Sensation recherchée.** Être seule dans une lanterne au-dessus d'une mer noire : le calme hypnotique du faisceau qui balaie la brume, puis la panique douce quand trois navires arrivent en même temps et que la corne est en recharge. Chaque nuit doit se terminer par un soupir de soulagement et l'envie de relancer « juste une nuit de plus ».

**Pourquoi ce jeu est amusant (thèse de design).**
1. **Un geste principal satisfaisant** : orienter le faisceau à la souris. Le faisceau a de l'inertie (la lentille est lourde), un son de mécanisme, et il *révèle* : les écueils apparaissent dans la lumière, les navires y gagnent en assurance. Le joueur « peint » la sécurité.
2. **Une tension lisible** : les dangers sont invisibles hors du faisceau mais parfaitement lisibles dedans. Le joueur sait toujours pourquoi il a perdu un navire.
3. **Des mécaniques qui s'emboîtent** : la lumière révèle, la route guide, la corne arrête, la marée change les règles, la Brume réagit à la lumière. Chaque nouvelle mécanique modifie la valeur des précédentes.
4. **Un rythme de vagues** : accalmies pour tracer les routes, pics où tout arrive en même temps, aube libératrice.

---

## 2. Game Design Document (GDD)

### 2.1 Univers et contexte

- **Lieu** : l'île de Sant-Aël, un rocher au large d'une côte bretonne imaginaire, au sud de la « passe des Loups », un chenal semé d'écueils qui mène à Port-Aël.
- **Époque** : automne 1893. Lentille de Fresnel à huile, corne de brume à air comprimé actionnée à la main, cartes marines à l'encre.
- **Le phénomène** : depuis trois mois, une brume épaisse et « trop blanche » monte chaque nuit avec la marée. Elle ne suit pas le vent. Les navires qui y entrent perdent le nord. On l'appelle simplement *la Brume*.

### 2.2 Personnages

| Personnage | Rôle | Note de jeu |
|---|---|---|
| **Élise Kervran** (27 ans) | Gardienne du phare, protagoniste. Ses pages de journal ouvrent chaque nuit. | Voix narrative du jeu. Sobre, précise, obstinée. |
| **Yann Kervran** | Son père, gardien avant elle, disparu en mer trois mois plus tôt. | Ses pages dérivent dans la brume : collectibles narratifs. |
| **Madame Le Goff** | Capitaine de port de Port-Aël. Méfiante puis alliée. | Donne les objectifs (quotas de navires), commente les résultats. |
| **Maël** | Jeune pêcheur, fait la navette avec l'île. | Apporte l'huile, les nouvelles, les améliorations de l'atelier. |
| **La Brume** | Antagoniste. Une mémoire de la mer : le souvenir du naufrage de *La Sirène* (1852), la nuit où le feu de Sant-Aël s'est éteint. | Réagit à la lumière et au son. Prend forme en acte III (« la Bête »). |

### 2.3 Histoire en trois actes (12 nuits)

- **Acte I — La Relève (nuits 1 à 4).** Élise arrive, apprend le métier (tutoriel intégré), gagne la confiance du port. La Brume est d'abord un obstacle. Première page du journal de Yann retrouvée dans l'eau, éclairée par le faisceau.
- **Acte II — Ce que la mer rend (nuits 5 à 8).** La marée découvre des épaves et des roches absentes des cartes ; les tempêtes poussent les navires hors de leur route. Les pages révèlent que Yann a compris que la Brume *répond* à la lumière : elle cherche le feu qui l'a abandonnée en 1852. Madame Le Goff avoue que le gardien de 1852 était le grand-père d'Élise.
- **Acte III — Le Feu du fond (nuits 9 à 12).** La Brume prend forme : la Bête, une masse qui traque les navires et ne recule que devant le faisceau et la corne. L'huile manque. Yann est parti sonner la cloche de *La Sirène* pour l'apaiser et n'est jamais revenu. Nuit 12 : un navire portant le signal de lanterne de Yann sort de la Brume. Élise doit le ramener à quai avec ses dernières réserves d'huile. À quai, la Brume se dissipe pour de bon ; Yann est vivant ; l'équipage de *La Sirène* est enfin rentré.
- **Épilogue.** « La Brume reviendra, comme la marée. » Déverrouillage du mode *Veille infinie*.

Le détail des textes (pages, dialogues, intros/outros de nuit) est dans `src/data/story.js`, rédigé par le sous-agent narration.

### 2.4 Mécaniques

Les mécaniques sont introduites progressivement (une nouveauté par nuit maximum en acte I).

1. **Le Feu (faisceau)** — *nuit 1*. Le faisceau suit le curseur avec inertie. Dans le cône : les écueils, épaves et pages deviennent visibles (et restent « relevés » sur la carte jusqu'à l'aube) ; les navires éclairés sont **guidés** (liseré vert, vitesse normale, suivent leur route avec précision). Hors du cône et sans route, un navire **dérive** (vent + courant) et peut s'échouer.
2. **Les Routes** — *nuit 1*. Cliquer-glisser depuis un navire trace une route (polyligne) jusqu'au quai. Le navire la suit. Un tracé à travers un écueil relevé est refusé (le trait devient rouge) ; à travers un écueil non relevé, c'est le naufrage. Les navires ont des vitesses et des rayons de giration différents (chaloupe, cotre, trois-mâts).
3. **La Corne de brume** — *nuit 2*. Barre d'espace (ou clic droit dans le vide) : tous les navires dans le rayon de la corne stoppent 3 secondes (arrêt d'urgence), puis repartent. Recharge 8 secondes. En acte III, la corne repousse la Bête.
4. **L'Ancre** — *nuit 3*. Clic droit sur un navire : il mouille / lève l'ancre. Permet de faire attendre un navire pendant qu'un autre passe.
5. **Les Pages** — *nuit 4*. Des pages du journal de Yann dérivent. Garder le faisceau dessus 1,5 s les « lit » : texte narratif + **Éclats** (monnaie d'amélioration).
6. **La Marée** — *nuit 5*. Jauge de marée sur la nuit. À marée basse, certains écueils émergent (visibles même hors faisceau, bloquants) ; à marée haute ils sont **submergés** : invisibles, franchissables par les chaloupes, mortels pour les navires à fort tirant d'eau.
7. **La Tempête** — *nuit 6*. Rafales (flèche de vent au HUD) qui poussent les navires hors de leur route ; la pluie réduit la portée du faisceau. La corne reste le seul frein.
8. **La Bête** — *nuit 9*. Masse de brume qui se déplace vers le navire le plus proche. Sous le faisceau elle ralentit et se dissipe partiellement ; la corne la repousse. Un navire touché est « perdu » (il s'arrête, perd sa route, devient invisible hors faisceau) : le joueur doit le retrouver et le rerouter.
9. **L'Huile** — *nuit 10*. Le faisceau consomme de l'huile. Bouton *Feu réduit* (touche `F`) pour économiser : demi-portée. Les navires à quai livrent des barils. À sec, le faisceau s'éteint 5 secondes pour relancer la mèche.

### 2.5 Boucle de jeu

**Boucle de 10 secondes** : un navire surgit de la brume → je balaie la passe avec le faisceau → j'aperçois un écueil → je trace la route qui le contourne → le navire accoste : cloche du quai, particules, +1 au quota.

**Boucle d'une nuit (3 à 5 min)** : page de journal (intro) → nuit jouée (vagues de navires, un pic de tension au 2/3, l'aube qui monte) → écran de résultats (navires sauvés / perdus, pages, Éclats, étoiles) → dialogue de Madame Le Goff ou de Maël → **Atelier** (dépenser les Éclats) → nuit suivante.

**Boucle de campagne** : 12 nuits, 3 actes, une mécanique nouvelle par nuit jusqu'à la nuit 10, deux nuits de synthèse, une fin.

### 2.6 Conditions de victoire et de défaite

- **Nuit gagnée** : l'aube se lève (timer de la nuit) avec au moins `quota` navires à quai **et** moins de `naufragesMax` (3 par défaut) navires perdus. Les navires encore en mer à l'aube ne comptent ni pour ni contre.
- **Nuit perdue** : `naufragesMax` naufrages avant l'aube. Écran « La mer a pris... » et proposition de rejouer immédiatement (une seconde chance sans pénalité : la difficulté ne monte pas).
- **Étoiles** : 1 étoile = nuit gagnée, 2 = quota + 2 navires, 3 = aucun naufrage.
- **Campagne terminée** : nuit 12 gagnée → épilogue, générique, déverrouillage de la Veille infinie.

### 2.7 Économie et progression

- **Éclats** (fragments de l'ancienne lentille) : gagnés par page lue (+3), par étoile (+2), par nuit sans naufrage (+3).
- **Atelier du phare** (entre les nuits, via Maël) — six améliorations à 3 niveaux :
  - *Lentille large* : angle du faisceau 28° → 34° → 40° → 46°.
  - *Mécanisme huilé* : vitesse de rotation de la lentille +25 % par niveau.
  - *Corne longue* : rayon de la corne +20 % par niveau.
  - *Corne rapide* : recharge 8 s → 7 → 6 → 5 s.
  - *Réserve d'huile* : capacité +25 % par niveau (utile dès la nuit 10).
  - *Lanterne de secours* : +1 naufrage toléré par niveau (max 2).
- Les Éclats dépensés le sont définitivement ; le total disponible est calibré pour permettre environ 10 niveaux sur 18 en fin de campagne (choix stratégiques).

### 2.8 Modes de jeu

- **Campagne** (12 nuits, sauvegarde automatique, sélection de nuit déjà jouée pour améliorer ses étoiles).
- **Veille infinie** (déverrouillée après la fin, ou par le mode test) : vagues infinies, difficulté croissante toutes les 60 s, meilleur score sauvegardé.
- **Mode test** (options) : déverrouille toutes les nuits et la Veille infinie, active un panneau de débogage (FPS, nombre d'entités, brouillard désactivable), invulnérabilité des navires, vitesse du temps ×2, saut de tutoriel. Pensé pour la QA et la démonstration ; les scores du mode test ne sont pas enregistrés.

### 2.9 Contrôles

| Action | Entrée |
|---|---|
| Orienter le faisceau | Déplacer la souris |
| Tracer une route | Cliquer-glisser depuis un navire (relâcher n'importe où ; le trait est complété jusqu'au quai si on relâche dessus) |
| Effacer une route | Clic simple sur le navire |
| Corne de brume | `Espace` ou clic droit dans le vide |
| Ancre | Clic droit sur un navire |
| Feu réduit (huile) | `F` (nuit 10+) |
| Pause | `Échap` ou `P` |
| Couper le son | `M` |

---

## 3. Direction artistique et audio

### 3.1 Style visuel

- **Vue de dessus, 2D vectorielle « propre »** (packs Kenney), replongée dans la nuit : palette bleu nuit / ardoise pour l'eau, blanc cassé chaud pour le faisceau, ocre parchemin pour l'interface (cartes marines, encre).
- **Éclairage par composition canvas** : couche de brouillard dessinée par-dessus le monde, percée par le cône du faisceau (`destination-out`), halo additif (`lighter`) et grain léger. Les écueils relevés restent tracés à l'encre sur la « carte » (calque parchemin translucide).
- **Feedback** : particules (écume, étincelles de la lentille, éclats de bois), tremblement d'écran au naufrage, flash de l'aube, cloche du quai avec ondes concentriques.
- **Palette** :

| Usage | Couleur |
|---|---|
| Fond de mer (nuit) | `#0b1a2b` → `#123049` |
| Brume | `#c9d3dc` à 80 % d'opacité, animée |
| Faisceau | `#ffe9b0` (cœur) → `#ffcf6e` (bord) |
| Parchemin (UI) | `#e9dcc0`, encre `#2a2118` |
| Danger | `#d94f3d` |
| Guidé / sûr | `#7bd389` |
| Accent (Éclats) | `#f2b134` |

### 3.2 Polices (Google Fonts, licence SIL OFL 1.1, auto-hébergées)

- **IM Fell English** (titres, 1893 oblige) ;
- **Cormorant Garamond** (corps de texte, HUD) ;
- **Homemade Apple** (écriture manuscrite des pages de journal).

### 3.3 Banques d'assets utilisées (toutes vérifiées)

Le proxy réseau de cette session bloque les sites des banques (kenney.nl, opengameart.org, freesound.org, incompetech.com, pixabay.com). Les assets ont été récupérés depuis des **miroirs GitHub** de ces mêmes banques, ce qui est licite pour des contenus CC0 / CC-BY. Chaque source ci-dessous a été vérifiée (fichier de licence présent dans le dépôt miroir).

| Asset | Source | Auteur | Licence | Miroir utilisé |
|---|---|---|---|---|
| Pirate Pack (navires, tuiles mer/sable/roches, tours, effets) | kenney.nl | Kenney | CC0 1.0 | github.com/ETdoFresh/kenney.nl (`kenney_piratepack`) |
| Fish Pack (faune marine) | kenney.nl | Kenney | CC0 1.0 | idem (`kenney_fishpack`) |
| Cartography Pack (parchemins, boussole, icônes de carte, phare) | kenney.nl | Kenney | CC0 1.0 | idem (`cartographypack`) |
| Particle Pack (fumées, halos, éclats) | kenney.nl | Kenney | CC0 1.0 | idem (`particlePack_1.1`) |
| UI Pack, Game Icons | kenney.nl | Kenney | CC0 1.0 | idem (`uipack_fixed`, `gameicons`) |
| UI Audio, Interface Sounds, Impact Sounds, RPG Audio | kenney.nl | Kenney | CC0 1.0 | idem (`kenney_uiaudio`, `kenney_interfacesounds`, `kenney_impactsounds`, `kenney_rpgaudio`) |
| Musiques (« Night Vigil », « Midnight Tale », « Evening », « Relent », « Stay the Course », « Spellbound », « Past Sadness », etc. — liste finale en section 3.4) | incompetech.com | Kevin MacLeod | CC BY 4.0 | github.com/noobsandnerdsgroup/audio |
| Ambiances : vagues, vent, orage, pluie (enregistrements de terrain, boucles) | freesound.org (CC0) | SecureSubset, felix.blume, Sheyvan, richwise | CC0 1.0 | github.com/funcoder/omarchy-ambient (`sounds/`, CREDITS.md) |
| SFX : éclaboussures, cloche, papier, bois qui craque, créature, tonnerre | opengameart.org (packs « 100 CC0 SFX », « 80 CC0 creature SFX », « 40 CC0 water/splash », etc.) | rubberduck et autres (voir `_README` de chaque pack) | CC0 1.0 | github.com/lavenderdotpet/CC0-Public-Domain-Sounds |
| Samples d'instruments (corne de brume construite à partir de vrais samples de tuba / cor, si aucun enregistrement de corne n'est disponible) | FluidR3_GM (soundfont) | Frank Wen | CC BY 3.0 | github.com/gleitz/midi-js-soundfonts |
| Polices | fonts.google.com | Igino Marini (IM Fell), Christian Thalmann (Cormorant), Font Diner (Homemade Apple) | SIL OFL 1.1 | fonts.googleapis.com (accessible) |

### 3.4 Plan audio

- **Musiques (Kevin MacLeod, CC BY 4.0)** — une par contexte, avec crossfade :
  - Menu : « Evening » ;
  - Acte I (nuits calmes) : « Midnight Tale » ;
  - Acte II : « Night Vigil » ;
  - Acte III : « Spellbound » ;
  - Résultats / atelier : « Piano Between » (boucle) ;
  - Défaite : « Mourning Song » ;
  - Fin / générique : « Stay the Course ».
  Les fichiers sont recompressés en OGG Vorbis q5 (≈ 160 kb/s) et coupés en boucles propres.
- **Ambiances (CC0)** : vagues en boucle permanente, vent et pluie/orage mixés selon la météo de la nuit.
- **SFX** : mécanisme de lentille (Kenney `metalClick`, `switch`), cloche de quai (`bell_0x`, `impactBell_heavy`), naufrage (`wood_breaking` + `splash`), corne de brume (samples de tuba/cor superposés, réverbération), pages (`paper_0x`), ancre (`chain_0x`), UI (Kenney interface).
- **Interdit** : toute synthèse « chiptune ». La corne de brume, si construite, est un montage de samples d'instruments réels.

---

## 4. Architecture technique

### 4.1 Choix

- **Vanilla JS + Canvas 2D, sans moteur ni build.** Raisons : (1) GitHub Pages et serveur statique sans étape de compilation ; (2) aucune dépendance réseau ou CDN (le proxy de la session bloque jsDelivr/unpkg, et un jeu « publiable » ne doit pas dépendre d'un CDN) ; (3) le rendu (brouillard percé, halos additifs) se fait très bien avec les modes de composition natifs ; (4) le projet reste lisible pour une reprise à froid.
- **Résolution logique 1280×720**, mise à l'échelle pour remplir la fenêtre (letterbox), `devicePixelRatio` géré.
- **Boucle** : `requestAnimationFrame` avec pas de temps fixe pour la simulation (60 Hz, accumulateur) et rendu interpolé.
- **Audio** : Web Audio API (buffers décodés, bus musique / ambiance / SFX avec gains séparés, déverrouillage à la première interaction).
- **Sauvegarde** : `localStorage` (progression, étoiles, améliorations, options, meilleur score infini), avec versionnage du schéma.
- **Tests** : Playwright + Chromium préinstallé (aucune erreur console, parcours complet en mode test, captures d'écran).

### 4.2 Arborescence

```
/
├── index.html                 # point d'entrée unique
├── css/
│   ├── base.css               # reset, polices, variables de palette
│   ├── menu.css               # menu d'accueil, options, crédits
│   └── hud.css                # HUD, dialogues, résultats, atelier
├── src/
│   ├── main.js                # bootstrap : chargement, scènes, boucle
│   ├── core/                  # moteur générique
│   │   ├── loop.js            # boucle à pas fixe
│   │   ├── input.js           # souris / clavier (coordonnées logiques)
│   │   ├── assets.js          # chargeur images / audio / atlas
│   │   ├── audio.js           # bus Web Audio, musique, ambiances, SFX
│   │   ├── save.js            # localStorage versionné
│   │   ├── scenes.js          # machine à états des scènes
│   │   ├── particles.js       # système de particules
│   │   ├── shake.js           # tremblement d'écran
│   │   └── math.js            # vecteurs, easing, RNG seedé
│   ├── game/                  # logique de jeu
│   │   ├── night.js           # déroulement d'une nuit (timer, vagues, victoire)
│   │   ├── world.js           # entités, collisions, marée, météo
│   │   ├── ship.js            # navires (types, suivi de route, dérive)
│   │   ├── beam.js            # faisceau (inertie, cône, révélation, huile)
│   │   ├── fog.js             # brouillard (bruit animé, densité)
│   │   ├── routes.js          # tracé et validation des routes
│   │   ├── hazards.js         # écueils, épaves, submersion
│   │   ├── horn.js            # corne de brume
│   │   ├── pages.js           # pages collectibles
│   │   ├── beast.js           # la Bête (acte III)
│   │   ├── port.js            # quai, accostage
│   │   ├── render.js          # rendu de la scène de jeu (couches)
│   │   ├── hud.js             # HUD (quota, naufrages, marée, corne, huile)
│   │   └── tutorial.js        # tutoriel intégré (nuits 1 à 4)
│   ├── ui/                    # écrans DOM
│   │   ├── menu.js, options.js, credits.js, pause.js
│   │   ├── results.js, workshop.js, story.js (pages/dialogues), ending.js
│   │   └── transitions.js
│   └── data/
│       ├── nights.js          # définition des 12 nuits + infini
│       ├── story.js           # textes narratifs
│       ├── balance.js         # constantes d'équilibrage
│       ├── upgrades.js        # atelier
│       └── credits.js         # crédits affichés en jeu
├── assets/
│   ├── img/                   # atlas + sprites (PNG / WebP)
│   ├── audio/{music,ambience,sfx}/   # OGG
│   ├── fonts/                 # WOFF2
│   └── CREDITS.json           # registre machine des licences
├── tools/                     # scripts de pipeline (Python) — non requis à l'exécution
├── tests/                     # Playwright
├── README.md, CREDITS.md, LICENSE, JOURNAL_DE_BORD.md
```

### 4.3 Sous-agents (équipe)

| Rôle | Périmètre | Livrables |
|---|---|---|
| **Lead (orchestration)** | Vision, GDD, architecture, moteur et boucle centrale, revue de tout, journal | `JOURNAL_DE_BORD.md`, `src/core`, `src/game` (cœur) |
| **Narration & univers** | Textes de toutes les nuits, pages, dialogues, fin, tutoriel | `src/data/story.js` |
| **DA & assets** | Extraction, découpe, atlas, optimisation des images ; polices ; licences | `assets/img`, `assets/fonts`, `assets/CREDITS.json` (images) |
| **Audio** | Sélection, boucles, normalisation, corne de brume, licences | `assets/audio`, `assets/CREDITS.json` (audio) |
| **Gameplay secondaire** | Marée, tempête, Bête, huile, atelier, équilibrage initial | `src/game/*` (modules secondaires), `src/data/balance.js` |
| **UI/UX** | Menu d'accueil, options (mode test), pause, résultats, crédits, transitions | `css/*`, `src/ui/*` |
| **QA** | Tests Playwright, rapport de bugs, performance | `tests/*`, rapport dans ce journal |
| **Documentation** | README, crédits lisibles, relecture du journal | `README.md`, `CREDITS.md` |

---

## 5. Registre des décisions

| Date | Décision | Alternatives envisagées | Raison |
|---|---|---|---|
| 2026-09-17 | Genre : action-stratégie atmosphérique « guide les navires » (gardienne de phare) | Roguelite, plateforme, tower defense, runner, match-3 | Originalité (aucun de ces genres « attendus »), trois mécaniques qui s'imbriquent naturellement, place pour une histoire, boucle testable en 60 s |
| 2026-09-17 | Vanilla JS + Canvas 2D, zéro dépendance | Phaser, PixiJS, Kaboom | CDN bloqués par le proxy, npm accessible mais un bundle ajouterait une étape de build ; le rendu nécessaire (brouillard, compositing) est natif ; lisibilité à froid |
| 2026-09-17 | Assets via miroirs GitHub des banques CC0/CC-BY | Attendre un accès direct ; générer des placeholders | Sites des banques bloqués ; les miroirs vérifiés contiennent les licences originales ; interdiction des placeholders |
| 2026-09-17 | Style Kenney vectoriel re-éclairé en nuit | Pixel art (packs 1-bit/roguelike), LPC (CC-BY-SA) | Cohérence : un seul auteur pour tous les sprites de jeu ; l'éclairage canvas donne l'ambiance sans trahir le style ; licences CC0 sans share-alike |
| 2026-09-17 | Musique Kevin MacLeod (CC BY 4.0) | Composer avec des samples FluidR3 ; jingles Kenney | Vrais morceaux, rendu moderne, licence claire et crédit simple ; la composition maison reste le plan B pour la corne uniquement |
| 2026-09-17 | Français exclusif | Bilingue FR/EN | Demande explicite du commanditaire ; évite de doubler tous les textes |
| 2026-09-17 | 12 nuits en 3 actes + Veille infinie | 20 niveaux courts ; 6 longues nuits | Une mécanique par nuit sans noyer le joueur ; campagne d'une heure ; rejouabilité par étoiles et mode infini |
| 2026-09-17 | Faisceau qui suit le curseur (pas de « clic pour viser ») | Faisceau en rotation automatique + clic pour arrêter | Le geste continu est le plaisir principal ; tracer une route sous la lumière que l'on déplace crée une synergie naturelle |
| 2026-09-17 | Mode test dans les options | Paramètre d'URL caché | Demande explicite ; utile à la QA et à la démonstration |

---

## 6. Idées écartées

| Idée | Pourquoi écartée |
|---|---|
| Gestion de l'huile dès la nuit 1 | Trop de charge mentale pendant l'apprentissage du faisceau et des routes ; introduite en nuit 10 quand le reste est maîtrisé |
| Navires qui tirent au canon / combats de pirates | Le Pirate Pack le permet, mais casserait la thèse « lumière contre brume » et l'ambiance contemplative |
| Journée / nuit en continu (cycle) | La nuit comme unité de niveau donne un rythme clair et une fin naturelle (l'aube) |
| Contrôle clavier du faisceau | Précision insuffisante et fatigue ; le jeu est desktop souris |
| Musique composée par synthèse Web Audio | Interdite par le cahier des charges (rendu chiptune) |
| Multijoueur local (deux gardiens) | Hors périmètre, et la lisibilité d'un seul faisceau est centrale |

---

## 7. Journal des modifications

| Date | Phase | Sous-agent | Fait | Testé | Reste à faire |
|---|---|---|---|---|---|
| 2026-09-17 | 0 | Lead | Reformulation, plan d'équipe, validation du commanditaire (français exclusif, GitHub Pages géré par lui, menu d'accueil complet avec mode test) | — | — |
| 2026-09-17 | 1 | Lead | Audit du réseau : sites des banques bloqués, `raw.githubusercontent.com`, `registry.npmjs.org`, `pypi.org`, `fonts.googleapis.com` accessibles. Clone partiel des miroirs Kenney (`ETdoFresh/kenney.nl`), Kevin MacLeod (`noobsandnerdsgroup/audio`), ambiances CC0 (`funcoder/omarchy-ambient`), SFX CC0 (`lavenderdotpet/CC0-Public-Domain-Sounds`). Installation de `numpy`, `Pillow`, `imageio-ffmpeg` (ffmpeg statique avec libvorbis) pour le pipeline. | Accès HTTP vérifié, licences lues | — |
| 2026-09-17 | 1 | Lead | Rédaction de ce journal : vision, GDD, DA, architecture, décisions | — | Phase 2 |

---

## 8. Problèmes rencontrés et solutions

| Problème | Solution |
|---|---|
| Sites des banques d'assets bloqués par le proxy réseau (403 CONNECT) | Utilisation des miroirs GitHub officiels ou communautaires des mêmes packs CC0/CC-BY, avec licence embarquée ; clone partiel (`--filter=blob:none --sparse`) pour ne télécharger que les packs utiles |
| Pas de `ffmpeg` système | `pip install imageio-ffmpeg` fournit un binaire statique avec libvorbis/libopus/libmp3lame |
| Aucune corne de brume enregistrée dans les banques accessibles | Plan : montage à partir de samples d'instruments réels (FluidR3_GM, CC BY 3.0) — cuivres graves superposés, réverbération. Revalidé en phase audio. |
