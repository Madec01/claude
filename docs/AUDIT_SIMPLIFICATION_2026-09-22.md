# Audit de simplification — « un jeu complet, mais moins fouillis »

*22 septembre 2026. Demande du commanditaire : « il y a beaucoup de fonctionnalités en jeu, ça le rend plutôt complexe et illisible. Deux agents pour déterminer ce qu'on retire et ce qu'on garde ; ton avis ; puis un compte rendu structuré et complet. »*

Trois regards, écrits sans se lire :

- **Agent A — l'œil du nouveau joueur.** A relu le README, le Guide, les cartes de tutoriel, `story.js`, le HUD et les données ; a compté ce qu'un joueur doit *savoir* à l'île 10, 20 et 40.
- **Agent B — les systèmes et les mesures.** A inventorié le code (lignes, fichiers, dépendances, verrous réels), puis a fait jouer le bot fort sur les 50 îles (200 parties) pour décomposer le score source par source et mesurer, par ablation, ce que chaque mécanique apporte vraiment.
- **Le lead (moi).** Mon avis, rédigé avant de lire les deux rapports (`scratchpad/mon_avis.md`), puis l'arbitrage ci-dessous là où les trois divergent.

Les scripts et les 200 parties brutes sont dans le bac à sable de la session (`audit_sys/`) ; rien du dépôt n'a été modifié par l'audit lui-même.

---

## 0. En une page

1. **Le jeu n'a pas trop de contenu, il a trop de règles par contenu.** 38 systèmes visibles, ~170 règles nommées à l'île 40 (45 paires, 12 règles de saison, 5 météos, 16 modificateurs de climat, 12 habitats, 41 tuiles à pouvoir propre, 18 types de vœux, 8 contrats, 20 améliorations, 33 succès). *Dorfromantik* tient sa campagne avec ~15.
2. **Trois sources font 71 % du score** : faune 32 %, affinités 27 %, fermetures 12 %. Vingt-deux autres mécaniques se partagent les 29 % restants, et **seize pèsent moins de 1,5 %** chacune. La météo pèse 0,2 % pour 157 lignes dans 25 fichiers.
3. **Six nœuds** font le fouillis : six façons de modifier une tuile posée ; cinq couches qui modifient un bord ; cinq vocabulaires pour « tuile spéciale » ; quatre monnaies et sept juges simultanés ; six états de « quelles tuiles puis-je jouer » ; six canaux de message.
4. **Proposition consolidée** : garder 13 systèmes (le cœur, la verticalité, la méta légère) ; en fondre 6 ; en retirer 9. On passe de ~170 règles à **~70**, de 8 onglets de guide à 5, de 4 écrans entre deux îles à 2, de 20 améliorations à 8, de 41 tuiles spéciales à 8 rares. **Aucune île, aucun chapitre, aucune famille ne disparaît.**
5. **Trois décisions reviennent au commanditaire** (§ 7) : les ouvrages (le retrait le plus rentable et le plus coûteux), la croissance (son idée), et le régime de calibrage des étoiles (recettes connues ou première traversée : +23,7 % d'écart entre les deux).
6. **Cinq anomalies à corriger quoi qu'on décide** (§ 8) : un vœu impossible (`c_port`), des textes du Guide qui annoncent les mécaniques à la mauvaise île, la faune « débloquée » à l'île 4 mais déjà à 33 % du score des îles 1–3, les règles de saison verrouillées derrière la météo, et le port encore dans le README.

---

## 1. Inventaire — ce qu'un joueur doit apprendre

Par ordre d'arrivée (`MECH_AT`). *Part* = part moyenne du score du bot fort sur 50 îles ; *taille* = lignes de `src/` qui mentionnent la mécanique (borne basse : le code est dense).

| Île | Mécanique | Ce qu'il faut savoir | Part du score | Taille |
|---|---|---|---|---|
| 1 | Affinités par bord | une table de 45 paires nommées (11 familles à terme) | **26,7 %** | cœur |
| 1 | Régions closes | fermer = prime égale à la taille ; « payée en entier », agrandissement repayé | **11,5 %** | cœur |
| 1 | Sentiers, séries, friche | trois règles passives, non annoncées | 1,5 / 0,7 / 0 % | 34 / 41 / — |
| 2 | Eau à quatre natures | étang, lac, rivière, embouchure, tronc rivière → lac | 2,5 % (+1 % étang) | 142 / 27 fichiers |
| 2 | Quatre saisons de base | floraison, sécheresse, récolte, veillée + prés secs, champs dormants, glace | ~2 % | 104 |
| 4 | Faune (11 espèces) | 12 conditions d'habitat ; +3 par animal et par saison | **32,5 %** (déjà 33 % aux îles 1–3) | 153 / 24 |
| 4 | Semis | un écran, 4 penchants de file | — | 37 / 11 |
| 6 | Vœux (18 types) | écran d'entrée + panneau permanent ; +10, +2 souffles, une rare, une graine | 2,6 % direct | 128 / 20 |
| 7 | Souffles | 5 sources, 8 dépenses (échange, défausse, bourgeon, souvenir, bâtir, niveau 3, fusion, réparer) | — | 116 / 20 |
| 7 | Verdict, série, jauge | « 80 % du meilleur coup » ; souffle à 3, fermeture doublée à 5 | 0,7 % | 41 / 12 |
| 8 / 9 / 13 / 18 | Rares (15 + ruine, 4 paliers) et événements (3) | 18 pouvoirs distincts, 7 cas spéciaux dans les règles | 0,8 % | 283 / 34 |
| 11 | Météo (5) | annonce en début de saison, effet à mi-saison | **0,2 %** | 157 / 25 |
| 11 (annoncé 4) | Règles de saison variables (12) | 3 par saison, tirées ; **verrouillées derrière la météo** | 2,6 % | 97 / 13 |
| 12 / 14 | Colline, lande | 14 paires de plus, cheval et vache | — | 72 / 21 |
| 16 | Bâtir niveau 2 | 1 souffle, bords +1, compte double ; retour de tuile sous 3 conditions dont une table de 11 saisons | 5,1 % (ablation N2+N3 : **−20 %**) | 236 / 38 |
| 16 | Main de saison | la file devient une main ; l'échange disparaît | (ablation −3 %) | 16 / 4 |
| 21 | Climats (3) | 16 modificateurs en tout | 0,8 % | 79 / 18 |
| 21 | Fusions (6) + Cahier | recettes à découvrir ; découverte = tuile + rare | 1,8 % + 1,1 % | 137 / 26 |
| 26 | Ouvrages (6) + remise + fraîcheur + expiration | bonne/mauvaise place, marqueur rouge, touche R, 12 poses | 5,0 % (ablation **−12,8 %**) | 139 / 23 (+57 lignes de tests) |
| 31 | Niveau 3 + 11 signatures | mûrir une saison, 2 souffles, un effet par famille | 1,3 % (ablation **−8,7 %**) | dans bâtir |
| 36 | Signatures d'île (14) | une phrase par île | — | 33 |
| 41 | Croissance | 5 sous-règles (pousses, annulation, plafond, une par région, exclue du vœu) | 0,1 % (ablation −1,2 %) | 39 / 10 |
| méta | Étoiles + or, portes à deux clés, contrats d'archipel (8), graines, Atelier (20 améliorations, 34 niveaux), succès (33) | sept juges en même temps | — | 51 + 24 + 42 + 27 |

Surface visible : **8 onglets** de Guide et ≈ 94 fiches ; **27 cartes** de tutoriel ; **17 écrans**, dont **4 entre deux îles** ; un HUD de 16 blocs, 13 boutons et ≈ 14 raccourcis ; 11 options.

---

## 2. Diagnostic — les six nœuds

| # | Nœud | Ce que ça fait au joueur | Chiffres |
|---|---|---|---|
| 1 | **Six façons de modifier une tuile posée** : bâtir, fusionner, ouvrage, réparer, bourgeon, croissance | Un seul geste (poser sur une tuile) recouvre quatre règles de score et deux automatismes ; le HUD doit afficher une pastille « bâtir · fusion · ouvrage · réparer » pour dire lequel s'applique | ablation : bâtir −20 %, ouvrages −12,8 %, niveau 3 −8,7 %, croissance −1,2 % |
| 2 | **Cinq couches sur un bord** : saison × règle variable + météo + climat + rares voisines + niveau + état | À l'île 40, jusqu'à huit conditions sur un même bord : le joueur ne prédit plus, il *lit le chiffre* — le jeu redevient « survoler et prendre le plus gros » | règles variables 2,6 %, météo 0,2 %, climat 0,8 % : trois canaux pour 3,6 % |
| 3 | **Cinq vocabulaires pour une idée** : rare, événement, ouvrage, fusion, signature de niveau 3 = 41 tuiles à pouvoir propre | Quatre de ces familles font la même chose (une rente de saison conditionnée par les voisines). La transition de saison est devenue un relevé de compte à 15 lignes — d'où le « relevé bref » et la Faucille, deux rustines | rares 0,8 %, événements 0,1 %, signatures N3 1,3 % |
| 4 | **Quatre monnaies, sept juges** : points, souffles, graines, étoiles (+ or, contrat, succès) ; étoiles, vœux, contrat, série, verdict, succès, étoile d'or notent en même temps | Le joueur ne sait pas pour qui il joue | contrats 0 point ; série 0,7 % ; le bot n'utilise jamais faucille, souvenir, friche restaurée ; 5 défausses sur 100 parties |
| 5 | **Six états de « quelles tuiles puis-je jouer »** : file, main, poche, remise, marché, bourrasque (+ Regard, Longue-vue) | La règle de base change à l'île 16 (on désapprend « échanger ») — le pire moment ; l'échange ne vit que 9 îles | 494 échanges contre 3 416 prises en main sur 100 parties |
| 6 | **Six canaux de message** : ruban, notifications (×4), relevé, badge « +N », bulle de saison, bulle de score | Un changement de saison en fait parler quatre en deux secondes ; `mobile.css` a dû masquer le titre, replier les vœux, réduire la fiche : la preuve par le téléphone | barre du haut : 7 blocs, boîte de saison ≥ 330 px |

À quoi s'ajoute une **incohérence de calibrage** : les seuils d'étoiles sont calculés « recettes connues » ; un joueur qui découvre les recettes (tuile + rare rendues) marque **+23,7 %** sur les îles 21–50 — 59 parties à l'or sur 60 contre 35.

---

## 3. Où les trois regards convergent, où ils divergent

| Mécanique | Agent A (joueur) | Agent B (mesures) | Lead | **Arbitrage** |
|---|---|---|---|---|
| Affinités, fermetures, eau, saisons de base, faune, vœux, bâtir N2, main, climats, succès, modes hors campagne | garder | garder | garder | **garder** |
| Contrats d'archipel | retirer → « vœu de chapitre » | retirer (0 point, redondant avec la clé « patience ») | retirer | **retirer** ; le vœu de chapitre est une option gratuite |
| Faucille, étoile d'or, jauge de série | retirer / bilan seulement / effets retirés | faucille jamais utilisée | retirer | **retirer** la faucille et les deux effets de série ; l'or ne s'affiche qu'au bilan |
| Tuiles d'événement (marché, fête, ruine) | retirer | retirer (fête et ruine : 0,1 %) | retirer | **retirer** ; le marché peut survivre comme pouvoir de souffle si on y tient |
| Rares : 4 paliers → 1 lot | 8 (moulin, chapelle, tour, puits, campement, grenier, ruche, menhir) | 8 (moulin, chapelle, tour, puits, grenier, fontaine, marché, ruine) | « bonus passifs, peu de règles » | **8 rares, liste A** : ruche et menhir (ex-ouvrages) y trouvent leur place, fontaine doublonne le puits |
| Météo + règles de saison | 4 météos comme seule surprise, 8 règles variantes retirées | fondre les 5 météos *dans* les règles, garder les 12 règles, météo = visuel | une règle par saison, météo fondue ou retirée | **une seule « surprise de saison »** par saison, tirée dans un lot de 8 (les meilleures règles, les météos devenant leur habillage : orage → crue, vent → foire…), annoncée au changement de saison, active toute la saison, **découplée du drapeau météo** |
| Souffles | 3 pouvoirs (défausser, annuler, bâtir), 2 sources (fermeture, vœu) | 3 pouvoirs + une réserve unique (poche + remise) | compteur de la main | **3 pouvoirs, 2 sources** ; plus de souffle par animal ni par série ; plus d'échange (la main le remplace) |
| Main de saison | dès l'île 6 | dès l'île 7 | la seule liberté de pose | **dès l'île 6**, avec les vœux ; les îles 1–5 gardent la file (tutoriel) |
| Fusions | garder + Cahier | garder les 6 recettes, retirer la découverte et le Cahier (+23,7 %) | garder | **garder les recettes et le Cahier qui se remplit ; retirer la récompense de découverte** (c'est elle qui fausse le calibrage), pas la curiosité |
| Niveau 3 | garder le geste, retirer les 11 signatures | garder (−8,7 %) | retirer (la croissance y mène) | **garder le geste, une seule règle** (bords +2, +1/saison), les signatures deviennent des étiquettes sans effet. *Je change d'avis* : −8,7 % en ablation, c'est de la profondeur réelle |
| Croissance | retirer, ou en faire le *caractère* du chapitre 9 | retirer (−1,2 %, 5 sous-règles) | garder (zéro règle à apprendre) | **caractère du chapitre 9** (« ici, le temps bâtit seul ») plutôt que mécanique cumulée — l'idée du commanditaire survit sans ses cinq sous-règles. **À trancher** (§ 7) |
| Ouvrages + remise | retirer (le plus coûteux politiquement, le plus rentable) | « le grand retrait, à décider » (−12,8 %, le plus ramifié) | retirer | **retirer**, ruche et menhir passent rares. **À trancher** (§ 7) |
| Semis | garder, renommer « terrain » | garder (37 lignes, aucune dépendance) | retirer comme concept | **garder**, renommé « terrain », fondu dans l'écran de départ unique |
| Climats | 2 effets chacun | garder tels quels (79 lignes) | garder | **garder, réduits à 2–3 effets** lisibles sur une carte de deux lignes |
| Atelier | 8 | 10 | 5 | **8** : Regard, Patience, Souffle de départ, Semence rare, Source, Refuge, Almanach, Étoile du soir |
| Écrans entre deux îles | un canal de message | 4 → 2 | — | **2** : un écran de départ (récit + terrain + vœux), un bilan (+ carte postale) ; l'Atelier depuis le menu |

---

## 4. Proposition consolidée

### 4.1 GARDER (13)

| Mécanique | Pourquoi |
|---|---|
| Affinités et table des paires (11 familles, colline et lande comprises) | 27 % du score, 50 îles sur 50 ; une seule règle (« lis le chiffre sur le bord ») |
| Régions closes | 12 %, l'objectif court terme, la seule prime qu'on planifie |
| Eau à quatre natures, rivière → lac | la meilleure lisibilité spatiale du jeu, ça se *voit* |
| Quatre saisons à règle fixe | le pivot de la thèse (planifier deux saisons à l'avance) |
| Faune | 32 %, zéro règle pour marquer ; **mais la dire honnêtement présente dès l'île 1** (ou la verrouiller vraiment) |
| Vœux | seule source de rares, tout le récit ; plafonnés à 3 par île |
| Souffles (réduits) | la monnaie de bâtir et fusionner |
| Bâtir niveau 2 + retour de tuile | ablation −20 % ; une seule condition de retour (région close **ou** ≥ 4 voisines), la table « en sa saison » disparaît |
| Niveau 3 (une règle) | ablation −8,7 % ; bords +2, +1 par saison, décor épaissi, point final |
| Fusions (6) + Cahier | le même geste avec une autre famille ; le Cahier qui se remplit est un moteur de curiosité |
| Climats (2–3 effets) | l'identité des chapitres 5–8 pour 79 lignes |
| Signatures d'île 36–49, renommées « caractère » | une phrase, aucune règle : la variété la moins chère |
| Étoiles, portes à deux clés, graines, Atelier réduit, succès, Île du jour, Jardin, Infinie, tournée, carte postale, mémoires, sauvegarde, reprise, repos, journal | la méta tient ; c'est son épaisseur qui gêne, pas son principe |

### 4.2 SIMPLIFIER ou FONDRE (6)

| Quoi | Comment | Ce que ça libère |
|---|---|---|
| **Règles variables + météo → une surprise de saison** | 8 surprises (2 par saison : crue/semailles, chaleurs/feux, foire/chasse, grand froid/doux), les météos deviennent leur habillage (pluie, vent, brume). Une par saison, annoncée au changement, active toute la saison. `rulesVariable` découplé de `weatherOn`, ouverte à l'île 4 comme promis | la machine `weather.phase/at`, la ligne HUD, 1 carte, 1 section du Guide, 5 textes, `canSwap` bourrasque ; 157 lignes / 25 fichiers |
| **Rares : 4 paliers + événements + ouvrages + signatures → 8 rares** | moulin, chapelle, tour de guet, puits, campement, grenier, ruche, menhir ; toutes sur case vide, toutes offertes par les vœux | −3 paliers, −7 cas spéciaux dans `rules.js`/`island.js`, −3 cartes, −18 fiches, −3 entrées `MECH_NAMES` |
| **Souffles : 3 pouvoirs, 2 sources** | défausser (1), annuler (3, une fois par saison), bâtir/fusionner (1). Sources : fermeture, vœu | −4 boutons HUD, −3 raccourcis, −3 améliorations (Seconde chance, Charpente, Alambic) |
| **Main dès l'île 6, poche et remise fondues** | 3 tuiles visibles (Regard : 4 puis 5, Longue-vue fondue dedans) | −1 état de file, −1 amélioration |
| **Atelier 20 → 8** | Regard, Patience, Souffle de départ, Semence rare, Source, Refuge, Almanach, Étoile du soir | −12 fiches, −26 niveaux ; rembourser les graines des niveaux supprimés |
| **Interface : un canal, 4 blocs, 2 écrans** | ruban pour tout ; notifications → journal ; bulles au toucher seulement ; fiche masquée par défaut ; barre : saison / points / souffles / pause. Écran de départ unique (récit + terrain + vœux) ; bilan éclaté en 12 sources lisibles au lieu de « Saisons » qui en agrège 12 | −2 écrans par île, −3 blocs, −1 fichier (`wishes_intro.js`) |

Vocabulaire à corriger dans la foulée : « semis » → « terrain » ; « semence rare / forte » retirées ; « signature d'île » → « caractère » ; « souvenir » → « annuler » ; l'effet d'une amélioration passe en titre (« Regard — voir 4 tuiles »).

### 4.3 RETIRER (9) — et ce qu'on perd, honnêtement

| Quoi | Ce qu'on perd | Coût |
|---|---|---|
| **Ouvrages (6), remise, fraîcheur, expiration, Talisman / Grande remise / Fraîcheur** | la mécanique « bonne / mauvaise place », la plus lisible du lot 4 ; un contrat, un vœu, deux succès ; du travail récent validé (la remise). Ruche et menhir survivent comme rares | 139 lignes / 23 fichiers, 57 lignes de tests, `pickRare` (35 % des rares de vœu), touche R, bloc HUD ; **recalibrage obligatoire des îles 26–50** ; succès à retirer sans décaler les identifiants ; `serialize()` porte `shed` |
| **Tuiles d'événement** (marché, fête, ruine) | trois moments amusants, surtout le marché | 3 sprites, 3 cas spéciaux, 1 carte |
| **Rares paliers 2 et 3** (fontaine, auberge, abreuvoir, porche, mine, four) | des décors en volume, la sensation de « nouvelles rares » aux îles 13 et 18 | 7 cas spéciaux ; une partie reprise avec une tuile retirée → convertie en sa famille ou en ruine |
| **8 règles de saison variantes** (fondues dans la surprise) | une partie de l'écriture de `story.js` (12 « voix » de saison, certaines très belles) | textes à rapatrier dans les 8 surprises |
| **Signatures du niveau 3** (11 effets) | « forêt ancienne », « tourbière », « alpage » comme micro-règles ; on garde les noms comme étiquettes | `LEVEL3_SEASONAL`, `STORY.level3` |
| **Contrats d'archipel** (8) | la « seconde voie » de la porte — déjà doublée par la patience (8 parties) | `contracts.js`, `contract.js`, une ligne de progression sur trois écrans ; `gateStars` perd +2, `unlockedUpTo` recalcule : aucun joueur ne recule |
| **Croissance** (ou caractère du chapitre 9, § 7) | l'idée poétique du commanditaire, livrée à l'île 41 avec 5 sous-règles | `growTiles`, décor « pousses », 1 carte, 6 textes ; −1,2 % sous la bande d'une étoile |
| **Faucille, bourgeon, échange, souffle par animal, souffle par série, fermeture doublée, étoile d'or dans le HUD** | des options, pas de la profondeur ; la main couvre 80 % de ce qu'elles permettaient | 4 améliorations à rembourser |
| **Relevé de saison (option), bulle de climat, fiche permanente** | rien : c'étaient des béquilles | — |

Ce qui reste : **~20 systèmes, ~70 règles nommées à l'île 50**, 50 îles, 10 chapitres, 12 îles-souvenirs, 11 familles, 11 espèces, 6 recettes, 8 rares, 8 surprises, 3 climats, 8 améliorations.

---

## 5. Le jeu simplifié — ce qu'on apprend, dans l'ordre

| Îles | Chapitre | Le joueur apprend (et rien d'autre) | Aujourd'hui |
|---|---|---|---|
| 1 | Prise en main | poser, bords, fermer une région | idem |
| 2–3 | | l'eau (étang, lac, rivière, embouchure) ; les quatre saisons à règle fixe | idem + friche possible |
| 4–5 | | la faune ; les sentiers ; la friche (une carte quand ça arrive) ; le terrain (ex-semis) | + semis |
| 6–7 | Les habitants | vœux (3 max) ; **main de 3** ; souffles : défausser, annuler, bâtir plus tard | file + échange + série + jauge |
| 8–10 | | 8 rares par les vœux, un mot chacune ; l'Atelier (Regard, Patience) | 5 rares + 3 événements + contrat |
| 11–15 | Le ciel | la surprise de saison (8, une par saison) ; colline ; lande | 12 règles + 5 météos + grenier/fontaine + Faucille |
| 16–20 | Bâtir | bâtir niveau 2, retour de tuile (une condition) | + main + 5 rares + Poche + Charpente… |
| 21–25 | Archipel du Sud | climat chaud (2 effets) ; fusions et Cahier | + 6 modificateurs |
| 26–30 | Archipel des Pluies | climat humide ; **rien d'autre** : les îles grandissent, les vœux se corsent | + ouvrages + remise |
| 31–35 | Archipel du Nord | climat froid ; niveau 3 (une règle) | + 11 signatures + mûrir + Maître d'œuvre |
| 36–40 | Les Quatre Climats | les climats alternent ; le caractère d'île | idem |
| 41–45 | Les grandes îles | grandes îles, 3 vœux ; *option* : « ici, le temps bâtit seul » | + croissance à 5 sous-règles |
| 46–50 | Cent saisons | saisons brèves, file courte, épilogue | idem |

Une nouveauté par chapitre jusqu'au 7, puis **plus aucune règle nouvelle** : les trois derniers chapitres vivent de la taille, du climat et du caractère. Aujourd'hui les chapitres 8–9 ajoutent encore croissance et alternance de climats, au moment où le joueur devrait *maîtriser*, pas apprendre.

---

## 6. Ce que ça coûte, dans l'ordre où je propose de le faire

Chaque lot se termine par la suite complète et, dès qu'il touche au score, par `node tools/calibrate.js 4 1-50 --write`.

| Lot | Contenu | Recalibrage | Sauvegardes | Textes |
|---|---|---|---|---|
| **S0 — gratuit** | les cinq anomalies du § 8 ; bilan éclaté en 12 sources ; vocabulaire | non (sauf `c_port`) | non | Guide, README, 1 mechCard |
| **S1 — retraits sans profondeur** | contrats, faucille, effets de série, étoile d'or hors HUD, événements, rares paliers 2–3, 12 améliorations | oui (−1,7 % mesuré, sous la bande) | ignorer `campaign.contracts` ; rembourser les graines ; convertir les tuiles retirées à la reprise | 7 fiches, 3 cartes, 1 contrat |
| **S2 — la surprise de saison** | fondre météo et règles, découpler du drapeau météo, ouvrir à l'île 4 | oui (−0,4 %) | ignorer `weather` dans `restoreRun` | 8 surprises réécrites depuis les 12 règles et 5 météos |
| **S3 — souffles et main** | 3 pouvoirs, 2 sources, main dès l'île 6, poche et remise fondues | oui (main −3 %) | `pocket`, `shed` | Guide « Souffles », 2 cartes |
| **S4 — ouvrages** (si retenu) | tout le sous-système, ruche et menhir → rares | **oui, obligatoire** (−12,8 % sur 26–50) | `shed`, `upgrades.talisman/shed/fresh`, 2 succès sans décaler les identifiants | vœu `c_works`, 6 fiches, 1 carte, chapitre 6 à renommer |
| **S5 — niveau 3 et croissance** | une règle, signatures en étiquettes ; croissance retirée ou en caractère | oui | `ripe/ripening/grown` tolérés | `STORY.level3`, `STORY.grown`, chapitres 7 et 9 |
| **S6 — interface** | un canal, 4 blocs, 2 écrans, fiche masquée | non | non | — |
| **S7 — calibrage final** | choisir le régime (§ 7.3), recalibrer, rejouer `gate` et les bots par chapitre | oui | `restarFromBest` ré-étoile | seuils affichés |

Estimation honnête : S0 et S1 sont une journée ; S2 à S5 chacun une demi-journée à une journée avec le recalibrage ; S6 une journée. Le tout tient dans une semaine de séances.

---

## 7. Les trois décisions du commanditaire

**7.1 Les ouvrages.** Le plus gros retrait : −12,8 % du score des îles 26–50, un sous-système avec sa remise, sa fraîcheur, son expiration, trois améliorations, un contrat, deux succès, une touche et un bloc du HUD — et du travail récent que vous avez validé. Les deux agents et moi disons *retirer* (ruche et menhir survivent comme rares). Alternative si vous y tenez : **garder les six ouvrages comme rares** (posés sur case vide, une rente conditionnée par les voisines, sans remise, sans fraîcheur, sans pénalité) — on perd la « mauvaise place » mais on garde les objets. *Ma recommandation : retirer.*

**7.2 La croissance.** Votre idée (« le temps épaissit, le joueur signe »), livrée à l'île 41 avec cinq sous-règles pour −1,2 % en ablation. Trois options : la retirer ; la garder telle quelle ; **en faire le caractère du chapitre 9** (« ici on ne bâtit plus, on attend ») — la même poésie, aucune règle cumulée, la seule façon d'atteindre le niveau 2 sur ces îles. *Ma recommandation : le caractère du chapitre 9.*

**7.3 Le régime de calibrage.** Les seuils sont calculés « recettes connues » ; la première traversée marque +23,7 % sur les îles 21–50 grâce à la récompense de découverte. Soit on retire cette récompense (proposé en § 4), soit on calibre « première traversée ». Les deux ne peuvent pas donner les mêmes étoiles. *Ma recommandation : retirer la récompense — un joueur qui rejoue une île ne doit pas y trouver des étoiles plus dures que la première fois.*

Un quatrième point, mineur : **le marché** (choisir 3 tuiles) est le seul événement que tout le monde regrette. Il peut survivre comme pouvoir de souffle (« étal », 3 souffles). À votre goût.

---

## 8. À corriger quoi qu'on décide

1. **Le vœu `c_port` est inexauçable** : il vise la recette `port`, retirée ; il est tiré sur dix îles (20, 22, 24, 31, 33, 34, 38, 40, 42, 43). Le remplacer par `paddy` ou `fort`, et ajouter au test de règles un contrôle « aucun vœu de la réserve n'exige une mécanique absente ».
2. **Le Guide annonce les mécaniques à la mauvaise île** : fusions « dès l'île 8 » (réel 21), niveau 3 « dès l'île 10 » (31), vœux « dès l'île 2 » (6), règles et météo « dès l'île 4 » (11). Le README dit « règles variables dès l'île 4 » ; le code les lie à la météo. La feuille de route parle encore d'îles 6 / 7 / 10 pour bâtir, ouvrages, niveau 3.
3. **La faune n'est pas verrouillée** : annoncée à l'île 4, elle fait déjà 33 % du score des îles 1 à 3. La déclarer dès l'île 1 (une ligne du tutoriel) ou la verrouiller vraiment.
4. **Les règles de saison variables dépendent du drapeau météo** (`rulesVariable = weatherOn`, `island.js:97`). Une île « règles sans météo » n'existe pas.
5. **Le port, le ponton et le pont** sont encore dans le README ; `mechCards.fuse` cite « hameau + eau = port » ; `island.js` garde des seuils par défaut obsolètes (`fuse ≥ 8`, `build ≥ 6`) doublés par `islandOptions` ; `mechanicsUpTo` fait doublon avec `campaignMechanics`.

---

## 9. Trois risques, et comment on les mesurera

| Risque | Mesure | Seuil | Remède prêt |
|---|---|---|---|
| **Essoufflement des chapitres 6, 8, 9** (plus de mécanique nouvelle) | écart bot fort / bot glouton par chapitre (`calibrate.js` donne les deux médianes) ; part « bords » dans le `tally` | écart < 20 % ou bords > 60 % = il manque une décision | caractères d'île dès le chapitre 6 au lieu de 36 |
| **Souffles inutiles ou trop rares** (2 sources, 3 dépenses) | instrumenter le bot : souffles gagnés / dépensés / restants par île, part des poses « sur une tuile » | cible : 0 souffle inutilisé en médiane dès l'île 16, 10 à 20 % des poses qui bâtissent ou fusionnent | trop rare : vœu à 3 souffles ; trop abondant : bâtir à 2 |
| **Le recalibrage casse la porte** | `calibrate.js 4 1-50 --write`, puis `tests/gate.js` et le bot glouton par chapitre | glouton : 5 à 7 étoiles par chapitre, jamais moins de 4 ; bot au hasard ≈ 43 % de la médiane (55 % = jeu trop plat) | ajuster `CHAPTER_GATE` ou les bandes |

Et une vérification narrative après chaque lot : tous les textes de `story.js` liés à une mécanique retirée doivent être orphelins ou supprimés (un test le fera, comme pour `c_port`).

---

## 10. Limites de l'audit

- Les mesures viennent du **bot fort**, qui ne joue ni la récolte (0,4 par partie), ni le souvenir, ni la faucille, ni la défausse ; un humain les utilise. Récolte et veillée sont sous-estimées.
- Le bot optimise explicitement la faune (`W.fauna = 3`) : sa part est sans doute gonflée, mais 3 points × animal × saison sur 8 saisons est structurel.
- Deux hasards de bot par île, une graine d'île : les parts par île bougent de quelques points, les moyennes sur 50 îles sont stables.
- Les points *indirects* des vœux (rares, souffles, graines) ne sont pas attribuables : leur 2,6 % est un plancher.
- Aucun joueur humain n'a été observé pour cet audit : les « nœuds » du § 2 sont une lecture, pas une mesure. Le prochain playtest devrait compter, chez un nouveau joueur, le temps passé à survoler avant de poser.
