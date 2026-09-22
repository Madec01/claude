# Annexes — les trois rapports d'origine

Les trois textes qui suivent sont reproduits tels qu'ils ont été rendus, sans retouche : le rapport de l'agent A (l'œil du nouveau joueur), celui de l'agent B (les systèmes et les mesures), et l'avis du lead écrit avant de lire les deux autres. La synthèse et l'arbitrage sont dans `AUDIT_SIMPLIFICATION_2026-09-22.md`.



---

## Annexe A — Audit « Cent Saisons » — charge mentale et lisibilité (angle nouveau joueur)

Sources lues : `README.md`, `FEUILLE_DE_ROUTE.md`, `JOURNAL_DE_BORD.md` (§1–3, titres du §7), `src/data/campaign.js` (MECH_AT, CHAPTERS, réserve de vœux), `tiles.js`, `upgrades.js`, `story.js` (blurbs, règles, météo, mechCards), `contracts.js`, `semis.js`, `signatures.js`, `climates.js`, `balance.js`, `src/game/rules.js`, `seasonrules.js`, `weather.js`, `wishes.js`, `seasons.js`, `feedback.js`, `tutorial.js`, `src/data/achievements.js`, `src/ui/guide.js`, `island_prep.js`, `results.js`, `src/game/hud.js`, `css/hud.css`, `css/mobile.css`. Aucun fichier modifié.

---

## A. INVENTAIRE — ce que le joueur voit et doit apprendre

Format : **nom** — ce que ça fait / quand / ce qu'il faut apprendre / ce que ça apporte à la boucle « poser au bon endroit, fermer, marquer ».

### A1. Le cœur (île 1–2)
1. **Affinités par bord** — points par bord selon la paire (+2 / +1 / −1), 11 familles à terme (9 au départ, colline île 12, lande île 14) / île 1 / une table de ~45 paires nommées (« moisson », « roselière », « caillasse »…) affichée avant la pose / **c'est la boucle**.
2. **Régions closes** — encercler un groupe de même famille = prime égale à sa taille (×2 hameaux « bourg ») / île 1 / notion de région, de « payée en entier », d'agrandissement repayé / **l'objectif court terme**.
3. **Eau à quatre natures** — étang (+1), lac (+1/tuile), lac de montagne, rivière (+2/tuile, +3 embouchure), tronc rivière → lac / île 2 / reconnaître la forme d'un plan d'eau et sa source (roche ou colline) / donne une seconde lecture spatiale.
4. **Saisons** (4 règles de base : crue/floraison, sécheresse, récolte, veillée/gel) — changent la valeur des tuiles toutes les N poses / île 2 / les quatre effets + « prairie sèche », « champ dormant », « eau gelée » / planification à deux saisons.
5. **Sentiers automatiques** — +1 par saison entre deux hameaux à ≤ 3 cases de terre ouverte / dès qu'un sentier se trace (pas d'île) / une règle passive à repérer / petite rente de saison.
6. **Friche** — pose à total négatif = tuile morte (ruine, lit asséché), réparable en bâtissant (1 souffle) / **pas d'île d'introduction** : arrive la première fois qu'on pose en négatif, potentiellement île 1 / apprendre que « −1 » peut tuer une tuile / punition lisible d'une erreur.

### A2. Le rythme et la variété (île 4–15)
7. **Faune** — 11 espèces + chèvre du campement, chacune avec un habitat (prairie ≥3, forêt ≥5, forêt+roche, eau ≥3, glace ≥4, marais+eau, forêt+hameau, hameau+champ, deux collines, lande+pré) ; +3 pts et ½ souffle par animal à chaque saison / île 4 / 12 conditions d'habitat / récompense visible du bon placement.
8. **Semis** — choix avant chaque île parmi 4 penchants de file / île 4 / un écran de plus, 4 options / agency sur la file.
9. **Vœux** — 2 à 4 objectifs à échéance par île (18 types : région, clos, paires, rivière, embouchure, lac, animal, espèces, bourgs, récoltes, floraisons, veillée, régions en une saison, bâties, ouvrages, fusion ×2) ; +10 pts, +2 souffles, une rare, une graine / île 6 / lire un écran d'entrée + un panneau permanent à droite / **l'objectif moyen terme et le récit**.
10. **Souffles** — monnaie d'île. Sources : fermeture (1), vœu (2), faune (1 pour 2), série de 3 (1), Atelier (0–6 au départ). Dépenses : échanger (1), défausser (2), bourgeon (3), souvenir (4/3/2, une fois par saison), bâtir (1), niveau 3 (2), fusion (1), réparer friche (1) / île 7 / 5 sources, 8 dépenses / assouplit la file.
11. **Verdict par coup + série + jauge** — chaque pose notée (maître/parfait/bien/correct/faible) au ruban ; série : souffle à 3, fermeture doublée à 5, cassée par un coup faible ; jauge de 5 pastilles sous le score / île 7 / comprendre « 80 % du meilleur coup », deux paliers / feedback, mais aussi un état caché (« prochaine fermeture ×2 »).
12. **Tuiles rares, palier 1** — moulin (champ+hameau), chapelle (+1 bords en hiver), tour de guet (clôt avec un trou), puits (anti-sécheresse), campement (attire un animal) / île 8 / 5 pouvoirs / récompense de vœu.
13. **Tuiles d'événement** — marché (choisir 3 tuiles), fête (+2 par hameau voisin une fois), ruine à restaurer (prend la famille majoritaire) / île 9 / 3 effets ponctuels d'une autre nature que les rares / variété.
14. **Météo** — orage (rivières +2), canicule, grand vent (forêt/verger +1, moulins +3), bourrasque (file masquée), redoux ; annoncée en début de saison, active à mi-saison / île 11 / 5 événements, notion d'annonce / mi-saison / surprise.
15. **Règles de saison variables** — 3 règles par saison (12 au total : crue, semailles, nichées ; sécheresse, chaleurs, feux ; récolte, foire, chasse ; veillée, grand froid, doux), tirée à chaque saison / **île 11 en réalité** (`rulesVariable = weatherOn`), alors que le README (§5) et le Guide disent « dès l'île 4 » / 12 règles dont plusieurs ont deux ou trois clauses / variété.
16. **Colline** (île 12) et **lande** (île 14) — deux familles de plus avec 14 paires nouvelles, cheval et vache / élargit la table.
17. **Rares palier 2** — grenier (+1 par champ, ne dort pas), fontaine (+1 par hameau, anti-sécheresse) / île 13.

### A3. La verticalité (île 16–35)
18. **Bâtir niveau 2** — poser sur une tuile de même famille (1 souffle) : bords +1, compte double, décor épaissi ; **retour de tuile** si région close, ou « en sa saison » (une saison attribuée à chacune des 11 familles), ou ≥ 4 voisines de même famille, une fois par saison / île 16 / 3 conditions + une table de 11 saisons / profondeur.
19. **Main de saison** — la file devient une main de 3 à 7 tuiles jouables au choix ; l'échange disparaît / île 16 / un changement de règle de file en cours de campagne / agency.
20. **Rares palier 3** — auberge (+1 par sentier), abreuvoir (anti-sécheresse + cheval + vache), porche (bourg ×3), mine (+1 par roche, roche close ×2), four à pain (+1 par champ) / île 18 / 5 de plus (total 15 rares + ruines).
21. **Climats** — chaud (6 modificateurs : eau posée +2, étang +1/saison, vergers +1, prés sèchent dès le printemps, pas de gel, été double), humide (5), froid (5) ; carte à chaque changement / île 21, 26, 31, puis alternance 36–45 / 16 modificateurs au total / identité de chapitre.
22. **Fusions + Cahier** — 6 recettes (rizière, ferme, fortin, cascade, grotte, lagune), 1 souffle, compte pour deux familles, prime de saison propre à chacune ; découverte = tuile + rare / île 21 / 6 recettes × (bords + prime + faune) / profondeur.
23. **Ouvrages** — 6 (ruche, épouvantail, nichoir, feu de camp, menhir, compost), une toutes les 16 poses ou par vœu ; bonne place (rente de saison, +1 si « frais ») ou mauvaise place (−2 puis −1 puis effacement, marqueur rouge) ; **remise** (touche R, 12 poses, une place, deux avec l'Atelier), défausse gratuite / île 26 / 6 conditions de bonne place + frais + dégressif + remise / rente.
24. **Niveau 3 + signatures** — bâtir une seconde fois une tuile de niveau 2 « mûre » (2 souffles) : bords +2, +1/saison et **11 signatures** (forêt ancienne, pâturage, domaine, bourg, grand verger, eau profonde, tourbière, pic, dune, alpage, grande lande), chacune avec son effet / île 31 / 11 effets de plus / profondeur.
25. **Faucille** (Atelier ch. 3) — clore la saison 1 à 3 poses avant son terme (bouton sous la saison, touche C) / une décision de tempo.

### A4. La fin de campagne (île 36–50)
26. **Signatures d'île** — une contrainte écrite par île 36–49 (dunes, deux sources, lac au milieu, sans une pierre, saisons brèves, file courte…) / lisible en une phrase / variété peu coûteuse. **Homonyme** avec les signatures du niveau 3.
27. **Croissance** — une tuile entourée d'assez de siennes pendant 2 saisons monte au niveau 2 seule ; pousses annonciatrices, annulable, max 2 par saison, jamais 2 par région, ne compte pas pour le vœu « bâtir » / île 41 / 5 sous-règles pour une mécanique passive.

### A5. Méta, objectifs et méta-monnaies
28. **Étoiles** (3 seuils par île, calibrés sur le bot) + **étoile d'or** (100 % du bot, cosmétique) / affichées sous le score / progression.
29. **Portes de chapitre à deux clés** (6 étoiles / 15, ou 5 îles finies + 8 parties) / à lire sur la carte.
30. **Contrat d'archipel** — dès le chapitre 2, choisir 1 objectif parmi 3 (8 types) sur les 5 îles ; vaut 2 étoiles pour la porte ; rappelé sur la carte, à l'entrée d'île, au bilan / un écran + un compteur permanent.
31. **Graines + Atelier** — graines par étoile, vœu, île, succès ; 19 améliorations en 9 chapitres (Regard, Patience, Souffle de départ, Poche, Semence rare, Faucille, Source, Refuge, Almanach, Charpente, Semence forte, Seconde chance, Alambic, Manteau, Talisman, Grande remise, Fraîcheur, Maître d'œuvre, Longue-vue, Étoile du soir) / un écran entre deux îles.
32. **Succès** — 33 (3 cachés), une graine chacun, bannière + jingle.
33. **Île du jour** (streak de jours), **Île infinie**, **Jardin**, **mode test**.
34. **Mémoires / récit** — intro à deux lignes, souvenir de fin, 12 îles-souvenirs, voix selon l'île bâtie, épilogue.
35. **Tournée finale + carte postale** — plans nommés, vague, quatre saisons, PNG partageable.
36. **« D'où viennent les points »** (10 sources : bords, régions, saisons, faune, vœux, primes, bâtir, fusions, ouvrages, séries) / toucher le score, repris au bilan.
37. **Journal de l'île** (J, badge de non-lus), **fiche de la tuile** (H, panneau permanent), **relevé de saison** (option : complet / bref / rien), **ruban** de verdicts, **notifications** (jusqu'à 4 empilées), **bulle de saison** (règle + météo + climat), **bulle de score**.
38. **Sauvegarde en ligne** (3 modes d'entrée, écran de conflit, « Vérifier la connexion »), **reprise de partie**, **export/import**, **rappel de copie**, **rapport de pépin** (« Pépins et idées » dans la pause), **mode repos** (interface qui s'efface).

**Total : ~38 systèmes visibles, portant ~170 règles nommées** (45 paires, 12 règles de saison, 5 météos, 16 modificateurs de climat, 12 habitats, 15 rares + 3 événements + 6 ouvrages + 6 fusions + 11 signatures niv. 3 = 41 tuiles à pouvoir propre, 18 types de vœux, 8 contrats, 19 améliorations, 14 signatures d'île, 33 succès).

---

## B. DIAGNOSTIC — où est le fouillis

### B1. Six façons de « modifier une tuile déjà posée »
Bâtir (même famille), fusionner (autre famille), poser un ouvrage (dessus), réparer une friche (bâtir sur une morte), bourgeonner (prairie → forêt/verger, 3 souffles), croissance (niveau 2 gratuit par le temps). Le HUD doit même afficher une pastille « bâtir · 3 / fusion · 2 / ouvrage · 4 / réparer » sur la tuile courante pour dire *lequel des quatre gestes* est possible (`renderQueue`, `ONTO`). Un seul geste physique (poser sur une tuile) recouvre quatre règles de score différentes et deux mécaniques automatiques. C'est le premier nœud.

### B2. Cinq couches qui modifient la valeur d'un bord
Saison (4) × règle variable (3) + météo (5) + climat (16 modificateurs) + rares voisines (15 effets de bord) + niveau (1/2/3) + état (sèche, gelée, friche, sown). À l'île 40, `edgePoints` empile jusqu'à huit conditions sur un même bord. Le joueur ne peut plus prédire un bord de tête : il *lit* le nombre affiché, ce qui ramène le jeu à « survoler toutes les cases et prendre le plus gros chiffre » — exactement ce que la thèse de design (« le joueur comprend toujours pourquoi ») voulait éviter. Règles variables et météo font en outre la même chose (une surprise de saison), mais par deux canaux, avec deux moments (début de saison / mi-saison) et deux endroits d'affichage.

### B3. Quarante-et-une tuiles à pouvoir propre, en cinq catégories
Rares (3 paliers, 15), événements (3), ouvrages (6), fusions (6), signatures niveau 3 (11). Cinq vocabulaires (« rare », « événement », « ouvrage », « fusion », « signature ») pour une seule idée : « cette tuile a un effet spécial ». Quatre d'entre elles font la même chose : une **rente de saison** conditionnée par les voisines (+1 par X voisin, plafonné à 3 ou 4). La transition de saison est devenue un relevé de compte à ~15 lignes (faune, sentiers, récolte, veillée, floraison, lande, étang, fusion, niveau 3, ouvrages, fête, bois, foire, chasse, hiver doux, moulins au vent) — d'où l'option « relevé bref / complet / rien » et la Faucille, deux rustines qui traitent le symptôme.

### B4. Quatre monnaies et sept systèmes d'objectifs
Monnaies : points, souffles, graines, étoiles (+ or, + contrat qui « vaut 2 étoiles », + succès qui donnent des graines). Souffles : 5 sources, 8 dépenses. Objectifs simultanés pendant une partie : étoiles (seuil suivant affiché), vœux (2–4), contrat de chapitre, série (jauge), verdict de chaque coup, succès à compteurs, étoile d'or, streak d'Île du jour. Le joueur est noté par sept juges en même temps.

### B5. Six états de « quelles tuiles puis-je jouer »
File obligatoire (îles 1–15) → main (16+), poche (Atelier), remise (ouvrages), marché (3 poses libres), bourrasque (file masquée), Regard + Longue-vue (3 → 7 visibles). La règle de base de la file *change* à l'île 16 : c'est le pire moment pour l'apprentissage (on désapprend « échanger »).

### B6. Vocabulaire qui se marche dessus
- **semis / semence rare / semence forte / graines** : quatre mots de la même image pour quatre choses.
- **signature** : niveau 3 *et* contrainte d'île.
- **bourg** : hameau clos (×2), signature niveau 3 du hameau (« vaut un bourg clos »), *et* « village » par croissance.
- **souffle / souvenir / seconde chance / poche / remise / Cahier / Atelier / contrat / Faucille / Talisman / Alambic / Manteau** : chaque item porte un nom-métaphore qu'il faut décoder avant de comprendre l'effet.

### B7. Ce qui est illisible à l'écran (bureau, `hud.js`)
- Barre du haut : **7 blocs** (titre + chapitre + climat ; saison + règle + météo + bouton Faucille + pastilles + bulle ; points + delta + ligne d'étoiles + jauge de série + bulle ; souffles ; tuiles restantes ; pause ; journal avec badge ; plein écran). La boîte de saison fait 330 px minimum et porte jusqu'à quatre informations en texte.
- Colonne gauche : main (3–7 tuiles avec pastille « bâtir · N » et « poche »), poche, remise, 3 boutons de pouvoir, marché.
- Droite : 2–4 cartes de vœux avec barre et échéance, panneau journal.
- Bas : puces de faune (jusqu'à 12), fiche de la tuile (panneau permanent par défaut), aide bourgeon, bouton « Poser ici ».
- **Six canaux de message concurrents** : ruban (verdict), notifications (×4 empilées), relevé de saison, badge « +N », bulle de saison, bulle de score. Un changement de saison peut faire parler quatre d'entre eux en deux secondes.
- Sur téléphone, `mobile.css` a dû *masquer* le titre, replier les vœux, réduire la fiche à deux lignes et empiler la barre sur deux lignes : c'est la preuve par le mobile que le HUD bureau est trop chargé.

### B8. Concepts à tenir en tête (comptage conservateur, « concept » = une règle qu'il faut connaître pour bien jouer)
| Île | Systèmes actifs | Règles nommées à connaître | Éléments d'écran |
|---|---|---|---|
| 10 | affinités, régions, eau ×4, 4 saisons, faune (9), sentiers, friche, semis, vœux, souffles (4 pouvoirs), série, rares (5), événements (3), étoiles, graines/Atelier (5), contrat, succès | **~70** | ~14 zones |
| 20 | + météo (5), règles variables (12), colline, lande, grenier/fontaine, bâtir (3 conditions de retour + 11 saisons), main, rares tardives (5), Faucille, Poche | **~115** | ~17 zones |
| 40 | + 3 climats (16 modificateurs), fusions (6), ouvrages (6 + remise + frais + dégressif), niveau 3 (11 signatures + mûrir), signatures d'île, 4 vœux, 15 améliorations | **~170** | ~20 zones |

Repère : *Dorfromantik* tient toute sa campagne avec ~15 règles nommées. À l'île 20, Cent Saisons en demande déjà sept fois plus.

### B9. Incohérences qui aggravent l'illisibilité (à corriger quoi qu'on décide)
- Le Guide (`guide.js`) code en dur « fusions dès l'île 8 », « niveau 3 dès l'île 10 », « vœux dès l'île 2 », « météo dès l'île 4 » ; `MECH_AT` dit 21, 31, 6, 11. Le README dit « règles variables dès l'île 4 » ; le code les lie à la météo (île 11).
- `mechCards.fuse` cite « hameau + eau = port » ; la recette port a été retirée. La réserve `CAMPAIGN_WISHES` contient toujours `c_port` (`recipe: 'port'`, `needs: 'fuse'`) : **un vœu impossible à exaucer peut être tiré sur une île générée ≥ 21** (`progressOf` compte les tuiles de famille `port`, il n'en existe aucune).
- `FEUILLE_DE_ROUTE` lot 4 parle encore d'« île 6 / 7 / 10 » pour bâtir, ouvrages, niveau 3 (ancienne numérotation).

---

## C. PROPOSITION

### GARDER (le cœur, tel quel ou presque)
1. **Affinités et table des paires** — c'est le jeu ; la table de 45 paires est grande mais *une seule règle* (« lis le chiffre sur le bord »). Garder colline et lande : deux familles de plus ne coûtent qu'une ligne du Guide chacune.
2. **Régions closes** (et « payée en entier / agrandissement repayé ») — l'objectif court terme, la seule prime que le joueur planifie vraiment.
3. **L'eau à quatre natures + rivière → lac** — la meilleure trouvaille de lisibilité spatiale du projet ; elle se *voit* sur la carte.
4. **Quatre saisons avec une règle fixe chacune** — le pivot de la thèse (« planifier deux saisons à l'avance ») ; ce n'est vrai que si la règle est *prévisible*.
5. **Faune** (les 11 espèces) — récompense visible, zéro règle à apprendre pour marquer (elle vient toute seule). Retirer seulement son rôle de source de souffles.
6. **Vœux** — l'objectif moyen terme et tout le récit ; plafonner à 3 par île, jamais 4.
7. **Souffles** — mais réduits à 3 pouvoirs (voir Simplifier).
8. **Bâtir niveau 2 + retour de tuile** — le seul « geste vertical » ; profondeur réelle, une seule règle de score (+1 par bord, compte double).
9. **Fusions (6 recettes) + Cahier** — la variante « autre famille » du même geste ; le Cahier qui se remplit est un excellent moteur de curiosité.
10. **Climats, un par archipel** — l'identité des chapitres 5–8, à condition de réduire chacun à deux effets.
11. **Signatures d'île 36–49** — une phrase, aucune règle : la variété la moins chère du jeu. À **renommer** « caractère de l'île » pour libérer le mot.
12. **Étoiles à trois seuils calibrés, portes à deux clés, graines, Atelier réduit, succès** — la méta tient ; c'est son *épaisseur* qui pose problème, pas son principe.
13. **Sentiers automatiques, friche** — deux règles passives, très lisibles à l'écran (un chemin se dessine ; une tuile meurt).
14. **Île du jour, Jardin, Île infinie, tournée finale, carte postale, mémoires, sauvegarde en ligne, reprise, mode repos, journal (J)** — hors boucle, ne coûtent rien en charge mentale pendant la partie.

### SIMPLIFIER ou FUSIONNER
1. **Règles variables + météo → une seule « surprise de saison »**. Retirer les 8 règles variantes (semailles, nichées, chaleurs, feux, foire, chasse, grand froid, doux) ; garder les 4 règles de base fixes. Garder la météo comme *unique* aléa, mais **un seul événement par saison, annoncé au changement de saison et actif toute la saison** (plus de « mi-saison »), ramenée à quatre : orage, canicule, grand vent, redoux (retirer bourrasque, qui punit l'interface plutôt que le placement). Ce qu'on garde de la variété : 4 surprises au lieu de 13, toutes lisibles dans la seule boîte de saison.
2. **Rares + événements + ouvrages + signatures niveau 3 → une seule catégorie « tuile rare »** avec **8 rares** : moulin, chapelle, tour de guet, puits, campement, grenier, ruche (ex-ouvrage : +1 par verger/prairie voisin chaque saison), menhir (ex-ouvrage : +1 par roche du massif). Toutes se posent sur une case vide, toutes comptent pour une famille, toutes offertes par les vœux. Retirer les paliers 2/3 (fontaine, auberge, abreuvoir, porche, mine, four), les 3 événements, les 4 autres ouvrages, la remise, le « frais », la pénalité dégressive, Talisman, Grande remise, Fraîcheur. Le marché (choisir sa tuile) peut survivre comme *pouvoir de souffle* si on tient à lui.
3. **Niveau 3 : garder le geste, retirer les 11 signatures.** Niveau 3 = bords +2, +1 par saison, point final, même règle pour toutes les familles. On perd onze effets que presque personne ne mémorise ; on garde le plaisir de « bâtir haut » et le décor épaissi.
4. **Souffles : 3 pouvoirs, 2 sources.** Garder défausser (1), souvenir (3, une fois par saison), bâtir/fusionner (1). Sources : fermeture (1) et vœu (2) uniquement. Retirer échanger (remplacé par la main), bourgeon, réparer une friche (la friche reste morte : plus lisible), le souffle par animal et le souffle par série. Retirer Seconde chance, Charpente, Alambic (trois améliorations qui ne font que déplacer des prix).
5. **File → main dès l'île 6**, en même temps que les souffles, avec 3 tuiles visibles (Regard : 4 puis 5, fusionner Longue-vue dedans). Retirer la Poche (une main *est* une poche). Les îles 1–5 gardent la file obligatoire : elle est nécessaire au tutoriel (« pose celle-ci ici »).
6. **Climats : deux effets chacun**, un avantage, une contrainte, pas plus. Chaud : eau posée +2 / prés sèchent dès le printemps. Humide : prés ne sèchent jamais / hameau contre marais −2. Froid : veillée +1 et bois de chauffage / champs dorment dès l'automne. Retirer les saisons doubles, étang +1, vergers +1, sentiers courts, « pas de floraison », et l'amélioration Manteau. Le climat redevient une carte d'intro à deux lignes, et non un tableau.
7. **Série : garder le mot au ruban et la jauge, retirer les deux effets mécaniques** (souffle à 3, fermeture doublée à 5). La série devient un retour pur, sans état caché « prochaine fermeture ×2 » que le joueur oublie. Si on veut garder une récompense : une seule, le souffle à 5.
8. **Contrat d'archipel → retiré, remplacé par un « vœu de chapitre »** : un des trois vœux de la dernière île du chapitre (l'île-souvenir) vaut 2 étoiles. Même fonction (seconde voie pour la porte), zéro écran en plus, zéro compteur permanent ; il réutilise l'affichage des vœux.
9. **Atelier : 19 → 8 améliorations**, une par chapitre jusqu'au 8 : Regard (file 3→4→5), Patience (+1/+2 poses), Souffle de départ, Semence rare, Refuge (faune +1), Source (rivière +1), Almanach (graines), Étoile du soir. Retirer Faucille (elle traite un symptôme qui disparaît avec le relevé de saison allégé), Poche, Semence forte, Seconde chance, Charpente, Alambic, Manteau, Talisman, Grande remise, Fraîcheur, Maître d'œuvre, Longue-vue.
10. **Un seul canal de message.** Ruban pour tout (verdict, fermeture, vœu, saison), notifications retirées (elles vont au journal J), bulle de saison et bulle de score conservées mais *au toucher seulement*, relevé de saison remplacé par le vol des points + « +N » (déjà fait), fiche de la tuile masquée par défaut (bouton « ? » ou H). Barre du haut : **4 blocs** — saison (icône, nom, une ligne de règle, pastilles, météo en cours), points (+ ligne d'étoiles), souffles, pause/journal. « Tuiles restantes » migre dans le titre de la main (« Main · 12 restantes »), le plein écran reste dans la pause, la jauge de série se loge dans le bloc points sans titre.
11. **Vocabulaire** : « semis » → « terrain » ; « semence rare / forte » → retirées ; « signature d'île » → « caractère » ; « souvenir » → « annuler » ; les noms d'Atelier gardent leur poésie mais l'effet passe en titre (« Regard — voir 4 tuiles »).
12. **Corriger les incohérences** listées en B9 (numéros d'îles du Guide et du README, vœu `c_port` impossible, mechCard « port »).

### RETIRER (et ce qu'on perd, honnêtement)
1. **Ouvrages (6), remise, frais, pénalité dégressive, Talisman/Grande remise/Fraîcheur** — *ce qu'on perd* : une mécanique de « bonne/mauvaise place » qui est en fait la plus lisible du lot 4 (un marqueur rouge, une rente), un contrat, un vœu, trois succès, une catégorie du bilan, et du travail récent que le commanditaire a validé (la remise). Ruche et menhir survivent comme rares ; le reste part. C'est le retrait le plus coûteux politiquement, et le plus rentable en lisibilité : il supprime un état de file (remise), une touche (R), un panneau, et 6 conditions de placement.
2. **Règles de saison variables (8 variantes)** — *ce qu'on perd* : une bonne partie de l'écriture de `story.js` (12 « voix » de saison, dont certaines très belles), la variété île à île du chapitre 3, et la moitié du contenu du Guide « Saisons ». La météo reprend le rôle de surprise.
3. **Tuiles d'événement (marché, fête, ruine)** — *ce qu'on perd* : trois moments amusants, surtout le marché (choisir sa tuile). Coût d'apprentissage disproportionné (trois natures d'effet différentes pour trois tuiles).
4. **Rares paliers 2 et 3 (7 tuiles)** — *ce qu'on perd* : des décors (four à pain, auberge, mine en volume KayKit) et la sensation de « nouvelles rares » aux îles 13 et 18. Ces deux îles peuvent introduire autre chose (colline, lande sont déjà là).
5. **Signatures du niveau 3 (11 effets)** — *ce qu'on perd* : « forêt ancienne », « tourbière », « alpage » comme noms et comme micro-règles ; on garde les noms comme *décor* (étiquette sur la tuile) sans effet.
6. **Croissance** — *ce qu'on perd* : l'idée poétique du commanditaire (« le temps épaissit, le joueur signe »), livrée à l'île 41. Mais elle arrive quand le joueur a déjà 150 règles en tête, avec 5 sous-règles (pousses, annulation, plafond, une par région, exclusion du vœu) pour un effet qu'il ne contrôle pas. Alternative moins coûteuse si on veut la garder : *faire de la croissance la seule façon d'atteindre le niveau 2 dans le chapitre 9* (« ici on ne bâtit plus, on attend »), comme caractère d'île, et pas comme mécanique cumulée.
7. **Bourgeon, Poche, échange, souffle par animal, souffle par série, fermeture doublée** — *ce qu'on perd* : des options, pas de la profondeur ; la main couvre 80 % de ce qu'elles permettaient.
8. **Contrat d'archipel** — *ce qu'on perd* : huit objectifs de long terme et la « seconde voie » ; remplacée par le vœu de chapitre (C.8).
9. **Faucille** — *ce qu'on perd* : une décision de tempo fine que seuls les bons joueurs utilisent ; un bouton de moins dans la boîte de saison.
10. **Étoile d'or** — *ce qu'on perd* : un objectif de perfection cosmétique ; un quatrième seuil de moins dans la ligne d'étoiles. (Optionnel : la garder mais ne l'afficher qu'au bilan, jamais dans le HUD.)
11. **Relevé de saison (option), bulle de climat, fiche permanente** — perdus : rien, ils étaient des béquilles de lisibilité.

Ce qui reste : **~20 systèmes, ~70 règles nommées à l'île 50** (au lieu de ~170), 4 blocs en haut, une colonne à gauche (main + 2 boutons), une à droite (vœux), la faune en bas. La campagne de 50 îles tient parce que la variété vient désormais de *l'île* (taille, climat, caractère, vœux tirés) et non d'une règle de plus par chapitre.

---

## D. LE JEU SIMPLIFIÉ — ce qu'on apprend, dans l'ordre

| Îles | Chapitre | Ce que le joueur apprend (et rien d'autre) | Aujourd'hui |
|---|---|---|---|
| 1 | Prise en main | poser, bords, fermer une région (tutoriel guidé actuel, inchangé) | idem |
| 2–3 | | l'eau (étang, lac, rivière, embouchure) ; les 4 saisons à règle fixe | idem + friche possible |
| 4–5 | | la faune ; les sentiers ; la friche (une carte quand ça arrive) | + semis |
| 6–7 | Les habitants | vœux (3 max) ; **main de 3** ; souffles : défausser, annuler, bâtir plus tard | file obligatoire + échange + série + jauge |
| 8–10 | | 8 rares par les vœux, un mot chacune ; l'Atelier (Regard, Patience) | 5 rares + 3 événements + contrat |
| 11–15 | Le ciel | la météo (4 surprises, une par saison, toute la saison) ; colline ; lande ; terrain (ex-semis) | + 12 règles variables + grenier/fontaine + Faucille |
| 16–20 | Bâtir | bâtir niveau 2, retour de tuile (une seule condition : région close **ou** ≥ 4 voisines ; supprimer « en sa saison » et sa table de 11) | + main + 5 rares tardives + Poche + Charpente… |
| 21–25 | Archipel du Sud | climat chaud (2 effets) ; fusions et Cahier | idem + 6 modificateurs |
| 26–30 | Archipel des Pluies | climat humide (2 effets) ; **rien d'autre** : les îles grandissent, les vœux se corsent | + ouvrages + remise |
| 31–35 | Archipel du Nord | climat froid (2 effets) ; niveau 3 (une règle) | + 11 signatures + mûrir + Maître d'œuvre |
| 36–40 | Les Quatre Climats | les climats alternent ; caractère d'île (une phrase) | idem |
| 41–45 | Les grandes îles | grandes îles, 3 vœux ; *option* : « ici, le temps bâtit seul » comme caractère | + croissance à 5 sous-règles |
| 46–50 | Cent saisons | saisons brèves, file courte, épilogue | idem |

Courbe : une nouveauté par chapitre jusqu'au 7, puis **plus aucune règle nouvelle** sur les trois derniers chapitres, qui vivent de la taille, du climat et du caractère. Aujourd'hui les chapitres 8–9 ajoutent encore croissance et alternance de climats, alors que c'est le moment où le joueur devrait *maîtriser*, pas apprendre.

---

## E. TROIS RISQUES, ET COMMENT LES MESURER

**Risque 1 — L'essoufflement du milieu de campagne (chapitres 6, 8, 9 sans mécanique nouvelle).**
Sans ouvrages ni croissance, les îles 26–30 et 41–45 ne se distinguent que par la taille et le climat. *Mesure* : faire jouer `tests/bot.js` (bot fort) et le bot glouton sur 1–50 avec et sans la simplification, et comparer **l'écart relatif entre les deux bots par chapitre** (`node tools/calibrate.js 4 1-50` donne les deux médianes). Si l'écart fort/glouton se resserre sous ~20 % sur les chapitres 6–9, la profondeur a baissé : il manque une décision. Compléter par le compteur `tally` du bilan : sur ces chapitres, la part « bords » ne doit pas dépasser ~60 % du score, sinon le jeu est redevenu « le plus gros chiffre au survol ». Remède prêt : les caractères d'île (signatures) dès le chapitre 6 au lieu de 36.

**Risque 2 — Les souffles deviennent inutiles ou trop rares.**
Avec deux sources (fermeture, vœu) et trois dépenses dont bâtir/fusionner à 1, l'économie peut se bloquer (aucun souffle → jamais de bâtir) ou déborder. *Mesure* : instrumenter le bot pour sortir, par île, souffles gagnés / dépensés / restants à la fin, et la part des poses « sur une tuile ». Cibles : 0 souffle inutilisé à la fin en médiane sur les îles ≥ 16, et 10 à 20 % des poses qui bâtissent ou fusionnent (aujourd'hui `stats.built` et `stats.fusions` sont déjà comptés par le bot). Si trop rare, remettre la fermeture à 1 souffle *et* le vœu à 3 ; si trop abondant, passer bâtir à 2.

**Risque 3 — Le recalibrage casse la porte de chapitre et la difficulté perçue.**
Retirer une douzaine de sources de points (ouvrages, primes de niveau 3, règles variables, fermeture doublée, événements) déplace la médiane du bot et donc les trois seuils ; les sauvegardes existantes seront ré-étoilées par `restarFromBest`. *Mesure* : `node tools/calibrate.js 4 1-50 --write`, puis `node tests/gate.js` et un bot glouton sur chaque chapitre : le glouton doit obtenir **5 à 7 étoiles par chapitre** (la cible actée dans la feuille de route), jamais moins de 4 (sinon la porte à 6 étoiles redevient un mur, même avec la clé « patience »). Vérifier aussi que le bot au hasard reste autour de 43 % de la médiane : s'il monte à 55 %, le jeu simplifié est trop plat et l'étoile 1 ne dit plus « tu as joué ». Enfin, rejouer `tests/rules.test.js` pour la couverture narrative : tous les textes de `story.js` liés aux mécaniques retirées doivent être orphelins ou supprimés, aucun vœu de la réserve ne doit exiger une mécanique absente (le cas `c_port` montre que ce contrôle manque déjà).

---

**Verdict en une phrase** : le jeu n'a pas trop de contenu, il a trop de *règles par contenu* ; quatre nœuds à trancher (bâtir/fusion/ouvrage/croissance → un geste ; règles variables/météo → une surprise ; 41 tuiles spéciales → 8 rares ; 4 monnaies et 7 juges → 3 monnaies et 3 juges) ramènent la campagne de ~170 règles à ~70 sans perdre une île.

---

## Annexe B — Audit systémique de « Cent Saisons » — code, données, mesures

Aucun fichier du dépôt modifié. Scripts jetables et résultats bruts dans le bac à sable de la session (`sources.mjs`, `agg.mjs`, `ablation.mjs`, JSON des 200 parties).

## 0. Résumé en cinq lignes

- **Trois sources font 71 % du score** (faune 32 %, affinités 27 %, fermetures 12 %). Tout le reste — 22 mécaniques de score distinctes — se partage 29 %, et **16 d'entre elles pèsent moins de 1,5 %**.
- La **faune n'est pas verrouillée** : annoncée à l'île 4, elle fait déjà 33 % du score des îles 1 à 3. Les **règles de saison variables** sont annoncées « dès l'île 4 » (guide, README) mais ne s'activent qu'à l'île 11 (elles sont couplées au drapeau météo, `island.js:97`).
- Trois retraits à faible coût libèrent l'essentiel du fouillis : **météo** (0,2 % du score, 157 lignes dans 25 fichiers), **paliers de rares** (15 tuiles + 3 paliers pour 0,8 %), **contrats d'archipel** (8 contrats, un écran par chapitre, une voie de porte redondante avec la « patience »).
- Le **gros retrait optionnel** est celui des **ouvrages** : 5–6 % du score mais −12,8 % en ablation, et le sous-système le plus ramifié (remise, fraîcheur, expiration, 3 améliorations, 1 contrat, 2 succès, une touche, un bloc HUD). Il impose un recalibrage des îles 26–50.
- Deux bogues révélés par la mesure : le **vœu `c_port`** vise une recette retirée et est tiré sur 10 îles (20, 22, 24, 31, 33, 34, 38, 40, 42, 43), inexauçable ; et les **étoiles sont calibrées « recettes connues »** alors qu'un joueur qui découvre les recettes marque **+23,7 %** sur les îles 21–50 (59 parties sur 60 à l'or, contre 35 en régime calibré).

---

## 1. Inventaire par le code

Taille = lignes de `src/` qui mentionnent la mécanique (grep par mots-clés, code très dense : plusieurs instructions par ligne, donc **borne basse**). « Verrou réel » = la mécanique est-elle vraiment absente avant son île (`islandOptions`, `island.js`) ou seulement non annoncée.

| Mécanique | Île (MECH_AT) | Verrou réel ? | Fichiers clés | Lignes src / fichiers | Dépend de → / ← dépendances entrantes |
|---|---|---|---|---|---|
| Affinités, fermetures | 1 | — | tiles.js (PAIRS 45 paires), rules.js, board.js | cœur | ← tout |
| Rivière / étang / lac / embouchure | 2 | non (eau toujours classée) | water.js 63, rules.js, seasons.js | 142 / 27 | ← vœux river/lake/mouth, succès ×3, climat, orage, Atelier « Source » |
| Saisons de base (floraison, sécheresse, récolte, gel/veillée) | 2 | non (toujours actives) | seasons.js 104 | — | ← vœux harvest/bloom/veillee, faune, climats |
| Faune (11 espèces) | 4 | **non** — 33 % du score des îles 1–3 | fauna.js 122, island.updateFauna | 153 / 24 | → règles (nichées), rares (camp, abreuvoir) ; ← vœux fauna/species, contrat, 4 succès, Atelier « Refuge », souffles (1 pour 2 animaux) |
| Semis (4 choix) | 4 | oui (UI) | semis.js 14, island_prep.js 31 | 37 / 11 | → poids de file ; aucune dépendance entrante |
| Vœux (17 types, 18 en réserve + 34 sur les îles dessinées, 59 textes = 18 250 car.) | 6 | oui (`wishes: []` avant) | wishes.js 109, wishes_intro.js, hud | 128 / 20 | → eau, faune, saisons, fusions, niveaux, ouvrages ; ← rares (récompense), souffles, graines, contrats, 3 succès |
| Souffles (échange, défausse, bourgeon, souvenir, poche) | 7 | **partiel** : les souffles s'accumulent dès l'île 1, le HUD les cache | island.js, hud.js | 116 / 20 (+ 76 lignes CSS) | ← bâtir, fusions, Atelier ×4 (breath, memory, pocket, frame). L'**échange disparaît à l'île 16** (remplacé par la main) : il ne vit que 9 îles |
| Tuiles rares : 5 de base + 3 événement (île 9) + 2 (île 13) + 5 tardives (île 18) + ruines | 8 / 9 / 13 / 18 | oui (`rareTier`) | tiles.js, rules.js (7 cas spéciaux : chapelle, grenier, fontaine, four, mine, porche, mine ×2), island.js (fête, auberge, marché, moulin+vent, ruine) | 283 / 34 | → vœux (seule source hors Atelier), météo (moulin), sentiers (auberge) ; ← Atelier « Semence rare », 3 cartes tutoriel, 16 fiches du guide |
| Météo (5 événements, annonce + mi-saison) | 11 | oui | weather.js 16, island.js (scheduleWeather/activateWeather), render, audio | 157 / 25 | → **verrouille les règles de saison** (`rulesVariable = weatherOn`), rivière (orage), moulins (vent), échange bloqué (bourrasque) |
| Règles de saison variables (12 = 3 × 4) | (11, via météo) | oui, mais **couplé à la météo** | seasonrules.js 18, seasons.js, rules.js, fauna.js, rules.evalWork | 97 / 13 | → faune (nichées), ouvrages (feux), 12 textes (2 748 car.) |
| Collines, lande (2 familles, 15 paires) | 12 / 14 | oui (poids) | tiles.js, islands.js | 72 / 21 | ← faune (cheval, vache), signatures, semis |
| Bâtir niveau 2 (+ retour de tuile, friche) | 16 | oui | rules.previewBuild, island.build | 236 / 38 (bâtir + niveaux) | → souffles ; ← fusions (même geste), niveau 3, croissance, contrat, vœu level, 2 succès, Atelier ×2 (frame, seed2) |
| Main de saison | 16 | oui | island.pick, hud | 16 / 4 | → remplace l'échange |
| Climats (3 + tempéré) | 21 | oui | climates.js 32, seasons.js, rules.edgePoints, campaign weights | 79 / 18 | → saison longue, sentiers ≤ 2, gel/floraison ; ← Atelier « Manteau », succès, 4 cartes tutoriel |
| Fusions (6 recettes, Cahier, découverte) | 21 | oui | rules.previewFuse, island.build, guide « Cahier », save `campaign.recipes` | 137 / 26 | → bâtir, souffles, rares (découverte en rend une) ; ← contrat, vœux c_port/c_farm, 2 succès, Atelier « Alambic », RARE_AS |
| Ouvrages (6) + remise + fraîcheur + expiration | 26 | oui | rules.evalWork, island (giveWork/toShed/expireShed/isFresh), hud (bloc remise, touche R), decor WORK_DECOR | 139 / 23 | → règle feux ; ← Atelier ×3 (talisman, shed, fresh), contrat, vœu c_works, 2 succès, **35 % des rares de vœu deviennent des ouvrages** (`pickRare`) |
| Niveau 3 (11 signatures, mûrir une saison) | 31 | oui | island.advanceSeason, LEVEL3_SEASONAL, STORY.level3 | inclus dans bâtir | → bâtir ; ← Atelier « Maître d'œuvre », succès, bourgs (sentiers +1), exemptions (champs dormants, prés secs) |
| Croissance | 41 | oui | island.growTiles | 39 / 10 | → bâtir (niveau 2) ; décor « pousses » ; carte tutoriel 347 car. |
| Séries (souffle à 3, fermeture doublée à 5) | 1 | non | feedback.js 30, island.place | 41 / 12 | ← contrat « Le fil », succès, HUD pips |
| Sentiers | 1 | non | paths.js 185 | 34 / 11 | ← auberge, bourgs N3, climat humide |
| Signatures (17 définies, 14 utilisées : îles 36–49) | 36 | données | signatures.js 30 | 33 / 13 | → poids, départ, saisons ; aucune dépendance entrante |
| Contrats d'archipel (8) | chap. 2 | oui | contracts.js 51, contract.js 24, island_prep, results, menu | 47 / 9 | → stats de 8 mécaniques ; ← porte de chapitre (+2 étoiles) |
| Faucille | Atelier chap. 3 | oui | island.closeSeason | 10 / 4 | → Atelier uniquement ; **jamais utilisée par le bot** |
| Atelier (20 améliorations, 34 niveaux, 12 conditionnées à une mécanique) | chap. 1–9 | — | upgrades.js 39, workshop.js 64 | 42 / 9 | → graines (étoiles, vœux, îles, succès) |
| Succès (33) | — | — | achievements.js 110 + data 52 + ui 77 | 27 / 6 | → 9 types d'événements, 6 compteurs |
| Île du jour / infinie / Jardin | menu | — | daily.js 38 | 50+45+83 | hors campagne |

Textes (`story.js`, 769 lignes) : vœux 18 250 car., îles 10 964, tuiles 6 299 (dont rares 1 791, ouvrages 1 658, fusions 933), **27 cartes de tutoriel** (5 407 car.), 12 règles de saison, 5 météos, 11 signatures de niveau 3.

**Incohérences texte / code relevées** (symptômes directs du fouillis) : guide « fusions dès l'île 8 » (réel 21), « niveau 3 dès l'île 10 » (réel 31), « vœux dès l'île 2 » (réel 6), « règles et météo dès l'île 4 » (réel 11) ; README liste encore le port, le ponton et le pont (retirés) ; `island.js` garde des seuils par défaut obsolètes (`fuse ≥ 8`, `build ≥ 6`) doublés par `islandOptions` ; `mechanicsUpTo` dans `islands.js` fait doublon avec `campaignMechanics`.

---

## 2. Mesures : d'où viennent les points

Protocole : bot fort (`tests/bot.js`, `playStrong`), 50 îles de campagne, graine d'île 0, deux hasards de bot (0 et 1), sans amélioration d'Atelier, **régime calibré** (toutes recettes connues, comme `tools/calibrate.js`). 100 parties, score moyen 717. Chaque `place`/`build`/`season` est décomposé par source ; la somme retombe exactement sur `result.score` (vérifié sur chaque partie). Pour séparer règles / météo / climat sur les bords, quatre prévisualisations contrefactuelles avant chaque pose (règle de base, sans vent, climat tempéré).

| Source | pts / partie | Part moyenne | Îles > 5 % | Îles > 1 % | Max (île) |
|---|---|---|---|---|---|
| **Faune** (3 pts × animal × saison) | 240 | **32,5 %** | **50** | 50 | 42 % (30) |
| **Affinités (bords)** | 166 | **26,7 %** | **50** | 50 | 47 % (5) |
| **Fermetures** | 67 | **11,5 %** | **50** | 50 | 21 % (5) |
| Bâtir (pose, niveau 2) | 45 | 5,1 % | 33 | 35 | 14 % (36) |
| Ouvrages (pose + saisons) | 53 | 5,0 % | 24 | 25 | 16 % (36) |
| Règles de saison variables (bords + événements + nichées) | 22 | 2,6 % | 9 | 32 | 9 % (15) |
| Vœux (10 pts directs) | 17 | 2,6 % | 5 | 41 | 8 % (10) |
| Eau (rivière, étang, lac, embouchure) | 14 | 2,5 % | 6 | 43 | 8 % (2) |
| Fusions (pose) | 17 | 1,8 % | 3 | 30 | 5 % (33) |
| Sentiers | 10 | 1,5 % | 1 | 26 | 9 % (19) |
| Niveau 3 (prime de saison) | 15 | 1,3 % | 3 | 20 | 6 % (36) |
| Fusions (prime de saison) | 11 | 1,1 % | 0 | 24 | 5 % (45) |
| Veillée | 8 | 1,1 % | 3 | 15 | 8 % (6) |
| Étang (saison) | 6 | 1,0 % | 0 | 20 | 3 % |
| Climat (soleil, vergers, bois, bords) | 6 | 0,8 % | 2 | 10 | 6 % (23) |
| Floraison (marais, lande) | 5 | 0,8 % | 0 | 21 | 3 % |
| Rares (pose de la tuile rare) | 4 | 0,7 % | 0 | 12 | 3 % |
| Séries (fermeture doublée) | 5 | 0,7 % | 0 | 8 | 2 % |
| Météo (vent, orage sur les bords/rivières) | 1,6 | **0,2 %** | 0 | **0** | 1 % |
| Sentiers bonus (auberge, bourgs) | 2 | 0,2 % | 0 | 3 | 2 % |
| Rares (fête, moulin au vent) | 0,3 | 0,1 % | 0 | 1 | 1 % |
| Niveaux sur les bords (bâtis / poussés) | 0,7 / 0,8 | 0,1 % / 0,1 % | 0 | 0 | 1 % |
| Récolte d'automne | 0,8 | 0,1 % | 0 | 0 | 1 % |
| Friche remise en état | 0 | 0 % | 0 | 0 | — |

Par chapitre (part en %) : la faune reste entre 29 et 38 % du chapitre 1 au chapitre 10 ; les affinités tombent de 41 % à 18 % ; ouvrages 8–12 % aux chapitres 6–10 ; bâtir 5–9 % dès le chapitre 4 ; fusions 3–5 % ; niveau 3 2–4 % ; climat ≤ 4 %.

**Ablation** (9 îles tardives 26–50, deux hasards, mécanique retirée via `def.mech`) — ce que la mécanique apporte réellement au score, effets indirects compris :

| Sans… | Score moyen | Écart |
|---|---|---|
| (référence) | 1 110 | — |
| bâtir (N2 + N3) | 886 | **−20,2 %** |
| ouvrages | 969 | **−12,8 %** |
| niveau 3 | 1 014 | −8,7 % |
| main de saison | 1 077 | −3,0 % |
| rares tardives + grenier/fontaine | 1 091 | −1,7 % |
| fusions | 1 092 | −1,6 % |
| croissance | 1 098 | −1,2 % |
| météo (et donc règles variables) | 1 106 | **−0,4 %** |

**Régime « recettes à découvrir »** (100 parties supplémentaires) : score moyen 854 au lieu de 717 ; sur les îles 21–50, **1 190 contre 962 (+23,7 %)**, 59 parties à l'or sur 60 contre 35. La découverte rend une tuile + une rare et gonfle ouvrages (6,2 %) et fusions (5,6 %). Les seuils d'étoiles, calibrés recettes connues, sont donc trop bas pour la première traversée.

**Usage cumulé (100 parties, régime calibré)** : 782 bâtis, 288 niveaux 3, 278 fusions, 258 ouvrages (256 bien placés), 201 croissances, 173 vœux exaucés sur 296, 3 379 fermetures, 494 échanges, 3 416 prises en main, 48 remises, 10 marchés, 12 bourgeons, **5 défausses, 0 souvenir, 0 faucille, 0 friche restaurée**, 529 météos déclenchées, 58 parties à l'or.

**Limites honnêtes des mesures** :
- Le bot ne joue pas la récolte (0,4 récolte/partie — vérifié : la transition d'automne fonctionne sur un mini-plateau, c'est un choix de placement du bot), ni le souvenir, ni la faucille, ni la défausse ; un humain les utilise. La récolte et la veillée sont donc sous-estimées.
- Le bot optimise explicitement la faune (`W.fauna = 3`), ce qui gonfle sans doute sa part ; mais 3 pts × animal × saison sur 8 saisons avec 10 animaux en moyenne (240 pts) est structurel, pas un artefact.
- La séparation règles / météo / climat sur les bords est contrefactuelle (prévisualisation avec règle de base) ; l'effet indirect de la canicule (prés secs → bords à 0) reste compté dans « affinités ».
- Deux hasards de bot par île, une graine d'île : les parts par île varient de quelques points ; les moyennes sur 50 îles sont stables (les deux régimes donnent les mêmes classements).
- Les points « indirects » des vœux (rares, souffles, graines) et des souffles (bâtir/fusion) ne sont pas attribuables : le 2,6 % des vœux est un plancher.

---

## 3. Surface visible

| Élément | Nombre |
|---|---|
| Onglets du Guide | **8** (Tuiles, File/main/semis, Cahier, Climats, Saisons, Faune, Tuiles rares, Souffles et vœux, Graines et Atelier) |
| Fiches du Guide | ≈ **94** : 11 familles, 6 recettes, 3 climats, 4 saisons × 3 règles, 5 météos, 10 fiches de faune (11 espèces), 6 ouvrages, 16 rares, 5 pouvoirs, 20 améliorations ; + 15 sous-sections (h3) et ≈ 30 paragraphes |
| Cartes de tutoriel (`STORY.mechCards`) | **27** (dont 4 de climat), 5 407 caractères |
| Écrans / panneaux (`src/ui/*.js`, `build*`) | **17** distincts : menu, récit, contrat, préparation d'île (semis + contrat), intro des vœux, pause, bilan, carte postale, Atelier, guide, options, succès, crédits, pépins, vie privée, connexion, conflit de nuage — soit **4 écrans entre deux îles** en campagne (récit → [contrat] → préparation → intro des vœux ; puis bilan → carte postale → Atelier → souvenir) |
| HUD (`hud.js`, 388 lignes) | 16 blocs ; **13 boutons statiques** (pause, journal, plein écran, clore la saison, défausser, bourgeon, souvenir, vœux, poser ici, forêt/verger/annuler, fermer le journal/la fiche) + tuiles cliquables (3–5 main, 0–2 poche, 1–2 remise) + 2 popups (règle de saison, détail du score) ; **≈ 14 raccourcis** (C X B Z J H F V R M Échap 2–5) |
| Options | 11 réglages (2 tests, son, tremblement, notes du coup, vibrations, repos, fiche, grille, relevé, FPS) + ≈ 10 boutons (sauvegarde ×3, nuage ×4, pépins, vie privée, plein écran) |
| Atelier | **20 améliorations, 34 niveaux**, 12 conditionnées à une mécanique, 2 doublons fonctionnels (Regard / Longue-vue) |
| Succès | **33**, 7 catégories |
| Tuiles | 11 familles ; **15 rares + ruines** en 4 paliers ; 3 événement ; **6 fusions** ; **6 ouvrages** ; 11 signatures de niveau 3 |
| Règles de saison | **12** (3 × 4) + 5 météos + 3 climats = 20 modificateurs de saison possibles |
| Vœux | 17 types, 148 vœux sur la campagne, 59 textes |
| Contrats | 8 (3 proposés par chapitre) ; semis 4 ; signatures 14 |
| Bilan (`TALLY_LABELS`) | 10 lignes de sources — dont « Saisons (récoltes, veillées, sentiers…) » qui agrège 12 mécaniques distinctes |

---

## 4. Proposition

### GARDER (le jeu complet tient dessus)

| Mécanique | Justification chiffrée |
|---|---|
| Affinités, fermetures | 38 % du score, 50/50 îles |
| Faune | 32 % du score, 50/50 îles, 4 succès, 2 types de vœux ; **mais** déclarer honnêtement qu'elle est là dès l'île 1 (déplacer `fauna` de MECH_AT[4] à [1] ou la verrouiller vraiment) |
| Saisons de base + eau | floraison/veillée/étang/rivière ≈ 6 % ; 3 succès ; ossature narrative |
| Vœux | seule source de rares, 2,6 % direct + souffles + graines + contrats ; 148 vœux |
| Bâtir niveau 2 + niveau 3 | ablation −20 % / −8,7 % ; c'est la « seconde couche » du jeu |
| Souffles (réduits, voir ci-dessous) | monnaie de bâtir/fusions |
| Climats | 0,8 % du score mais 79 lignes seulement et structure des chapitres 5–8 (file, palette, saison longue) : coût faible, identité forte |
| Main de saison | −3 % en ablation, 16 lignes, supprime l'échange |
| Signatures | 33 lignes de données pures, aucune dépendance entrante, identité des îles 36–49 |
| Campagne, portes, Île du jour | structure |

### SIMPLIFIER / FUSIONNER

| Quoi | Comment | Chiffres |
|---|---|---|
| **Météo + règles de saison → une seule « règle de saison »** | Fondre les 5 météos dans les 12 règles (orage → Crue : rivières +2 ; canicule → Sécheresse ; grand vent → Foire : moulins +3, forêts/vergers +1 ; bourrasque → Grand froid ; redoux → Redoux). Plus d'annonce ni de mi-saison ; garder pluie/neige comme **visuel** de la règle. Découpler `rulesVariable` de `weatherOn` et l'ouvrir à l'île annoncée (4 ou 11, au choix). | météo 0,2 % du score, 0 île > 1 %, ablation −0,4 % ; libère la machine `weather.phase/at`, la ligne HUD, 1 carte, 1 section de guide, 5 textes, `canSwap` bourrasque |
| **Rares : 4 paliers → 1 lot de 8** | Garder moulin, chapelle, tour, puits, grenier, fontaine, marché, ruine. Retirer camp, fête, auberge, abreuvoir, porche, mine, four (7 cas spéciaux dans `rules.js`/`island.js`). Supprimer `rare2`/`rare3`/`event` de MECH_AT et `rareTier`. | rares 0,8 % du score, ablation −1,7 % ; −3 cartes tutoriel, −7 fiches, −3 entrées MECH_NAMES |
| **Fusions : garder les 6 recettes, retirer la découverte et le Cahier** | Recettes visibles d'emblée dans l'onglet Tuiles ; plus de retour tuile + rare à la première réalisation ; plus de `campaign.recipes`. | corrige l'écart de calibrage +23,7 % ; −1 onglet, −1 succès (« Cahier complet »), −1 amélioration (Alambic), −3 lignes de sauvegarde |
| **Souffles : 5 pouvoirs + faucille + poche + remise → 3 pouvoirs + 1 réserve** | Retirer l'échange (la main dès l'île 7 le remplace : l'échange ne vit que 9 îles), la faucille (10 lignes, 0 usage bot, Atelier seul) ; fusionner poche et remise en une « réserve » unique qui accepte toute tuile. Garder défausse, bourgeon, souvenir. | −4 boutons/blocs HUD, −3 raccourcis (C, R, échange), −2 améliorations (Faucille, Grande remise) |
| **Écrans entre deux îles : 4 → 2** | Fusionner récit + préparation + intro des vœux en un seul écran de départ (l'écran de préparation montre déjà le semis ; ajouter les vœux). Contrat : voir RETIRER. | −2 écrans par île, −1 fichier (`wishes_intro.js`) |
| **Atelier 20 → 10** | Retirer Longue-vue (doublon de Regard), Faucille, Alambic, Grande remise, Fraîcheur, Talisman, Maître d'œuvre, Semence forte, Étoile du soir, Almanach. Garder Regard, Patience, Souffle, Poche, Semence rare, Source, Refuge, Seconde chance, Charpente, Manteau. | −10 fiches du guide, −18 niveaux ; migration : rembourser les graines des niveaux supprimés |
| **Bilan** | Éclater « Saisons » (12 mécaniques) en récolte / veillée / sentiers / primes ; le joueur ne peut pas comprendre son score aujourd'hui. | `tally` 10 clés → 12 clés lisibles, sérialisation à migrer (`tally` dans `serialize()`) |
| **Textes** | Corriger les 5 îles annoncées à tort (fusions 8→21, niveau 3 10→31, vœux 2→6, règles/météo 4→11) et le README (port, ponton, pont). | 0 risque |

### RETIRER

| Quoi | Ce que ça libère | Ce que ça casse |
|---|---|---|
| **Croissance** (île 41) | 39 lignes / 10 fichiers, `growTiles`, décor « pousses », carte tutoriel 347 car., 6 textes `STORY.grown`, paragraphe du guide, drapeaux `ripe/ripening/grown` | 0,1 % direct, ablation −1,2 % ; vœu `level` et contrat « bâtisseurs » l'excluent déjà ; recalibrage îles 41–50 conseillé mais l'écart est sous la largeur d'une bande d'étoiles (20 %) |
| **Contrats d'archipel** | 51 lignes data + 24 UI + 47 mentions, 1 écran par chapitre, 3 lignes de progression (carte, préparation, bilan), 1 paragraphe de guide, 8 définitions | la porte a déjà deux clés (6 étoiles **ou** 8 parties) : la troisième est redondante. Sauvegarde : ignorer `campaign.contracts` ; `gateStars` perd `+2` → aucune porte ne se referme puisque `unlockedUpTo` est recalculé et que la patience reste |
| **Rares tardives + événement** (détail ci-dessus) | 7 tuiles, 7 sprites, 7 cas spéciaux de règles, 3 paliers, 3 cartes | −1,7 % ; les vœux ne donnent plus que 8 rares |
| **Faucille, Longue-vue, Étoile du soir, Almanach** | 4 améliorations, 10 + 4 lignes | rembourser les graines |
| **Ouvrages** (le grand retrait, à décider) | 139 lignes / 23 fichiers dans `src` (rules.evalWork 25 lignes, island 40 lignes, hud bloc remise, decor WORK_DECOR), 6 sprites, 3 améliorations, 1 contrat, 2 succès, 1 vœu, 1 carte 312 car., 6 fiches, touche R, `pickRare` (35 % de rares détournées), bot 15 lignes, tests : 57 lignes dans 10 fichiers | 5–6 % direct, **ablation −12,8 %** sur 26–50 → **recalibrage obligatoire des îles 26–50** (`node tools/calibrate.js 4 26-50 --write`) ; sauvegarde : `upgrades.talisman/shed/fresh` à rembourser, succès `bien-place`/`frais-du-jour` à retirer sans décaler les identifiants (même précaution que pour `port-d-attache`) ; `serialize()` porte `shed` |

Ce qui ne bouge pas : 50 îles, 10 chapitres, 12 îles-souvenirs, faune, vœux, bâtir, climats, Île du jour.

---

## 5. Les trois retraits les plus rentables (gain de lisibilité / coût)

### 1. Météo fondue dans les règles de saison (0,2 % du score, 157 lignes, 25 fichiers)
1. `src/game/island.js` : supprimer `scheduleWeather`, `activateWeather`, `weatherActive`, `windSeason`, `weather` dans `serialize/restoreRun/pushHistory/undo` ; `rulesVariable` devient `mech.has('season')` (ou une île choisie) ; `mods.wind`/`storm` deviennent des effets des règles Foire/Crue dans `rules.js` (`edgePoints`, `preview`) et `seasons.js` ; `canSwap` perd la clause bourrasque.
2. `src/data/campaign.js` : retirer `weather` de MECH_AT/MECH_NAMES ; `islandOptions` perd `weather` ; `src/data/climates.js` perd `weatherChance` ; `src/game/weather.js` supprimé ; `daily.js` `weather: true` retiré.
3. Rendu et son : `render.js`/`decor.js`/`audio.js` déclenchent pluie, brume, neige sur la **règle** (`isl.rule`) au lieu de `isl.weather` ; `hud.js` retire `data-ref="weather"`.
4. Textes : `STORY.weather` (5) et `mechCards.weather` supprimés, leurs phrases rapatriées dans `STORY.seasonRules` ; guide onglet Saisons sans section Météo ; README point 9.
5. Sauvegarde : une partie reprise avec `weather` dans `run` → l'ignorer dans `restoreRun`. Tests : `tests/events.test.js` (4 lignes météo), `tests/rules.test.js` ; pas de recalibrage nécessaire (−0,4 %), mais relancer `node tools/calibrate.js 4 11-50` pour vérifier que les bandes ne bougent pas.

### 2. Contrats d'archipel (un écran par chapitre, 8 définitions, 0 point)
1. Supprimer `src/data/contracts.js`, `src/ui/contract.js` ; dans `src/main.js` retirer `buildContractPick`/`contractNeeded`/`noteContractResult` (lignes ≈ 279–286 et bilan).
2. `src/data/campaign.js` : `gateStars` = `chapterStars` ; `gateText` sans la mention du contrat ; `CHAPTER_GATE` inchangé (6) ou abaissé à 5 pour compenser les deux étoiles perdues.
3. UI : `island_prep.js` (paramètre `contract`), `results.js`, `menu.js` (ligne de progression), guide (paragraphe « Le contrat d'archipel »), `hud.js` n'est pas concerné.
4. Sauvegarde : laisser `campaign.contracts` en place et l'ignorer (`merge(defaults())` le tolère) ; `unlockedUpTo` recalcule l'ouverture, donc aucun joueur ne recule — vérifier avec `tests/gate.js`.
5. Tests : `tests/rules.test.js` (bloc contrats), `tests/gate.js`, `tests/autoplay.js`, `tests/finale.js`, `tests/resume.js`, `tests/decouverte.js`, `tests/mobile.js` (32 lignes en tout). Aucun recalibrage.

### 3. Paliers de rares (grenier/fontaine, tardives, événement) → un seul lot (0,8 % du score, 7 cas spéciaux)
1. `src/data/tiles.js` : `RARE` réduit à 8 (mill, chapel, watchtower, well, granary, fountain, market, restore) ; supprimer `EVENT_TILES`, `RARE_LATE`, les entrées `RARE_AS`/`VARIANTS`/`FAMILY_COLORS` de camp, fete, tavern, trough, archway, mine, oven.
2. `src/game/rules.js` : retirer les clauses four/mine dans `edgePoints`, porche ×3 et mine ×2 dans `closedRegionsAround` ; `src/game/island.js` : retirer la fête et l'auberge dans `advanceSeason`, `pickRare` sans paliers ; `src/game/seasons.js`/`fauna.js` : abreuvoir (`trough`) et camp (chèvre) — soit retirer la chèvre, soit lui donner un autre habitat.
3. `src/data/campaign.js` : MECH_AT perd `rare2`, `rare3`, `event` ; `islandOptions` perd `rareTier` ; `upgrades.js` « Semence rare » garde puits/moulin/grenier/fontaine (inchangé).
4. Textes et guide : `STORY.tiles` −7 fiches, `mechCards` −3 (rare2, rare3, event), guide onglet Tuiles rares sans « dès l'île n » ; `decor.js` sans les décors associés ; sprites conservés dans `assets` ou retirés avec `CREDITS.md` à jour.
5. Sauvegarde : une partie reprise contenant une tuile retirée → `restoreRun` doit la convertir en sa famille `RARE_AS[0]` ou en ruine ; tests : `tests/rules.test.js` et `tests/events.test.js` (20 lignes « rare ») ; recalibrage `node tools/calibrate.js 4 9-50 --write` par sécurité (−1,7 % mesuré, sous la bande).

**À faire quel que soit le choix** : corriger le vœu `c_port` (recette `port` inexistante, 10 îles dont 20, 22, 24 ; le remplacer par `paddy` ou `fort`), puis recalibrer — et décider si le calibrage se fait « recettes connues » (actuel) ou « première traversée » (+23,7 %), car les deux ne peuvent pas donner les mêmes étoiles.

---

## Annexe C — Mon avis (écrit AVANT de lire les deux audits, pour ne pas être influencé)

## Le cœur, ce qui fait le jeu
Poser une tuile → ses bords s'entendent ou non avec les voisines (affinités) → une région se ferme → les saisons passent et transforment l'île. Tout ce qui sert ça est le jeu. Tout le reste est une couche.

## Les couches, par ordre d'arrivée (MECH_AT)
1 affinités, fermetures · 2 rivière, saisons · 4 faune, semis · 6 vœux · 7 souffles · 8 rares · 9 événements · 11 météo · 12 collines · 13 grenier/fontaine · 14 lande · 16 bâtir, main de saison · 18 rares tardives · 21 climats, fusions · 26 ouvrages (+ remise, fraîcheur, expiration, faucille, poche) · 31 niveau 3 · 41 croissance.
Hors partie : Atelier (12 améliorations, monnaie graines), 33 succès, contrats d'archipel, jauge de série, étoile d'or, île du jour, île infinie, jardin, mémoires, carte postale, rapport de pépin, sauvegarde en ligne, mode repos.

## Où ça se marche dessus (les doublons)
1. TROIS libertés de pose : semis (3 ouvertures), souffles (poser où l'on veut), main de saison (choisir sa tuile). Une seule suffit.
2. TROIS modificateurs « cette saison, ça change » : règles de saison (3 par saison), météo, climats. Le joueur ne distingue pas lequel agit.
3. TROIS façons de grandir : bâtir (niveau 2), niveau 3 (mûrir), croissance (automatique).
4. QUATRE familles de tuiles spéciales : rares, événements, fusions, ouvrages. Chacune avec ses propres règles et sa propre interface (le Cahier, la remise…).
5. TROIS couches de score par-dessus le score : contrats d'archipel, jauge de série, étoile d'or.
6. DEUX monnaies : étoiles (déblocage) et graines (Atelier), les graines venant des étoiles ET des succès.

## Ma proposition
GARDER : affinités/fermetures, saisons, eau (le plus beau système), faune, vœux, rares (bonus passifs, peu de règles), bâtir niveau 2, climats (par chapitre, stables), fusions (poser une tuile SUR une autre : c'est dans le geste de base), croissance (automatique : zéro règle à apprendre, une récompense), tournée + carte, succès, modes (jour, infinie, jardin), mémoires.
SIMPLIFIER : libertés de pose → une seule (main de saison, la plus lisible ; les souffles deviennent son compteur, les semis disparaissent comme concept — l'île s'ouvre en trois points, point) ; règles de saison → UNE par saison, et la météo fondue dedans ou retirée ; Atelier → 5 améliorations au lieu de 12, ou fondu dans les succès.
RETIRER : ouvrages + remise + faucille (la plus grosse source de règles, arrivée tard, une interface à part), tuiles d'événement (trois effets ponctuels avec leur propre logique), niveau 3 (la croissance y mène toute seule), contrats d'archipel, jauge de série, météo si elle ne fond pas dans les règles de saison.

## L'échelle des concepts après simplification (≈ 12 au lieu de ≈ 25)
1 affinités et fermeture · 2 saisons · 3 eau · 4 faune · 5 vœux · 6 main de saison (et ses souffles) · 7 rares · 8 collines, lande (des familles, pas des mécaniques) · 9 bâtir · 10 climats · 11 fusions · 12 croissance.

## Ce que ça coûte, honnêtement
- Recalibrage obligatoire des 50 îles (le score bouge) : `node tools/calibrate.js 4 1-50 --write`.
- Textes : vœux `c_works`, succès liés aux ouvrages/événements, mémoires et intros qui citent une mécanique retirée, guide.
- Sauvegardes : une partie en cours avec une remise pleine ; migration à écrire.
- Le chapitre 6 (« ouvrages ») et le 7 (« niveau 3 ») perdent leur sous-titre : à renommer autour de ce qui reste (les climats, les fusions, la croissance avancée).

