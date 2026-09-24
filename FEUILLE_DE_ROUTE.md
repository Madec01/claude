# Feuille de route — Cent Saisons

> Idées d'enrichissement du jeu, à remplir au fil du développement. Statuts : **à faire**, **en cours**, **fait**, **écarté**.
> Chaque entrée livrée reçoit une ligne dans le Journal des modifications de `JOURNAL_DE_BORD.md`.

## Retenu par le commanditaire (prochain lot)

| # | Idée | Décision de design | Statut |
|---|---|---|---|
| 1 | **Tuiles qui s'assemblent / décor par région** | Deux calques par tuile (sol / décor) produits par le pipeline ; entre deux tuiles de même famille, un raccord de sol qui efface la couture et un petit élément posé sur l'arête (arbre, touffe, roseau, vague, rocher, clôture…), tiré de la banque Kenney. Rendu : sols → raccords → décors triés par ligne. Forêts denses, massifs reliés, villages avec puits et ruelles. | **fait** |
| 2 | **Sentiers automatiques** | Aucune tuile « chemin » : un sentier se dessine tout seul entre deux hameaux séparés d'au plus trois tuiles de terre ouverte (prairie, champ, verger, lande ; la colline ne l'est plus depuis le journal 105). Tracé courbe passant par les milieux d'arêtes, texture terre recolorée par saison, cailloux Kenney. Bonus : +1 point par saison par liaison. | **fait** |
| 3 | **Météo** | Un événement annoncé une saison à l'avance, déclenché à mi-saison, dès l'île 4 : orage (printemps), canicule (été), grand vent (automne), bourrasque ou redoux (hiver). Effets visuels (pluie, brume, rafales, neige), sons CC0 (pluie, tonnerre, vent), et une règle temporaire chacun. | **fait** |
| 4 | **Tuiles d'événement** | Marché (choisir sa tuile pendant trois poses), Fête (bannière : hameaux voisins +2 à la saison suivante), Ruine restaurée (adopte la famille majoritaire autour d'elle). Une par île, offerte par un vœu ou trouvée dans la file. | **fait** |
| 5 | **Vie sur les tuiles** | Fumée des cheminées en hiver, animaux qui se déplacent dans leur région (canards sur l'eau, lapins dans les prés), reflets sur l'eau, feuilles et pétales localisés, neige qui tombe des arbres à la pose. | **fait** |
| 6 | **Île du jour** | Île générée depuis la date (identique pour tous), 60 à 90 cases, trois vœux tirés d'une réserve, météo active. Meilleur score du jour, série de jours joués, historique des dix derniers jours. | **fait** |
| 7 | **Musiques supplémentaires** | Kevin MacLeod (CC BY 4.0, miroir disponible) : « Cloud Dancer », « Night Vigil », « Midnight Tale », « Pleasant Porridge », « Sincerely », « Piano Between », « Leaving Home », « Moonlight Beach », « Maccary Bay », « Ranz des Vaches ». Deux pistes par saison en alternance + une pour l'Île du jour + une pour la météo calme. | **fait** |
| 8 | **Tuiles rares supplémentaires** | Auberge (+1 par sentier du village), Four à pain (+1 par champ), Abreuvoir (anti-sécheresse, cheval et vache), Porche (bourg clos ×3), Mine (+1 par roche, roche close ×2) ; la lanterne sert de décor aux bourgs clos. | **fait** |

## Lot 3 (retours joueur)

| # | Idée | Décision de design | Statut |
|---|---|---|---|
| 9 | **Règles de saison variables** | Trois règles par saison tirées dès l'île 4 (et sur l'Île infinie / l'Île du jour), annoncées dans le HUD, le journal et une bulle sur téléphone. | **fait** |
| 10 | **Eau : étang / lac / rivière** | Classification par forme (une tuile = étang ; tas = lac ; ligne partant d'une roche ou d'une colline = rivière, +3 à l'embouchure ; tas contre la roche = lac de montagne). Rives qui reprennent le sol des voisines, ruban de rivière courbe, nappe continue. | **fait** |
| 11 | **Tuiles qui évoluent** | Objets de décor filtrés par saison, règle et météo pour toutes les familles : fleurs et arbres en fleurs, nénuphars, tas de feuilles, paniers, cultures dorées, congères, bannières de foire, bois de grand froid, flaques d'orage, touffes sèches de canicule. | **fait** |
| 12 | **Tournée finale** | À la fin d'une île : le recul, trois ou quatre plans nommés (la grande forêt, le village, là où la rivière rejoint la mer, l'animal), une vague qui salue tout le reste, l'année qui tourne en quatre fronts habités, puis la carte postale qui se fabrique autour du paysage — le nom s'écrit, les étoiles se posent, un voilier s'en va — et qui **attend** le joueur : « Voir le récapitulatif → » ou « Enregistrer la carte », sans minuterie. Un toucher accélère, un second saute à la carte ; version courte aux reprises. | **fait** |
| 13 | **Recalibrage des étoiles** | Seuils mesurés avec un bot plus fort (≈ 55 / 80 / 100 % de son score, affichés dans le HUD. | **fait** |

## Lot 4 (idées du commanditaire : niveaux, superposition, ouvrages)

| # | Idée | Décision de design | Statut |
|---|---|---|---|
| 14 | **Bâtir : niveaux 2** | Poser une tuile sur une tuile de même famille (1 souffle) : bords +1, compte double dans sa région, décor plus dense ; retour d'une tuile si région close, en saison ou bien entourée (une fois par saison). Île 6. | **fait** |
| 15 | **Grille effacée entre tuiles posées** | Fondus le long des bords entre sols différents (champs compris), roche et colline nettes ; pointillé au survol ; option « Grille discrète ». | **fait** |
| 16 | **Fusions et Cahier** | ~~Port~~ (retiré : la mer n'est pas une tuile, un port ne pouvait qu'être à l'intérieur des terres — il revient au Livre II), rizière, ferme, fortin, cascade, grotte, lagune (commutatives, 1 souffle, +3, prime de saison) ; découverte = retour de tuile + rare ; Cahier des recettes dans le Guide ; vœux de fusion aux îles 8, 10 et 12. | **fait** |
| 17 | **Ouvrages (tuiles bonus)** | Ruche, épouvantail, ~~ponton, pont~~ (retirés : trop gros et trop laids sur l'hexagone), nichoir, feu de camp, menhir, compost : bonne et mauvaise place jugées à chaque saison, marqueur rouge, une toutes les seize poses et en récompense de vœu, amélioration Talisman. Île 7. | **fait** |
| 18 | **Niveaux 3, Atelier, recalibrage** | Signatures par famille (onze), condition « mûrir » (une saison), 2 souffles, +1 par saison ; Charpente, Semence forte, Talisman ; bot qui bâtit, fusionne et pose les ouvrages ; seuils recalibrés. Île 10. | **fait** |

## Lot 5 : climats (idée du commanditaire)

> Un climat change trois choses au plus : la file, un avantage permanent, une contrainte permanente. Affiché à côté de la règle de saison et sur la carte d'intro de l'île. Recoloration par le pipeline (comme les saisons).

| Climat | File | Avantage permanent | Contrainte permanente | Saisons et vie | Statut |
|---|---|---|---|---|---|
| Tempéré (actuel) | équilibrée | — | — | référence | fait |
| Chaud, aride | sable et roche fréquents, eau rare | eau posée +2, étang +2 par saison, vergers +1 | prés secs dès le printemps loin de l'eau, pas de gel ni de veillée | été de deux saisons, chèvres, poules, palette ocre | **fait** |
| Humide, pluvieux | marais, eau, forêts | prés jamais secs, rivières +1, lacs +1 | hameau contre marais −2, sentiers de deux cases au plus, orages fréquents | grenouilles, canards, vert saturé, brume | **fait** |
| Froid, boréal | pins et roche, vergers rares | veillée +1, forêts près d'un hameau +1 chaque hiver, glace tôt | champs dormants deux saisons, pas de floraison | deux hivers par cycle, manchots, ours, neige persistante | **fait** |
| Venteux, côtier | îles allongées et trouées, sable | moulins +1 par saison, grand vent fréquent, tours renforcées | forêt seule −1, rivières courtes | canards, manchots l'hiver, embruns | plus tard |
| Montagnard | roche et collines | tuile contre la roche +1, lacs de montagne +1, mines | champs −1 loin de l'eau, saisons plus courtes | chèvres, ours, brouillard | plus tard |
| Île à deux climats, choix du climat en infini / jour | | | | | plus tard |

## Lot 6 : campagne de trente îles (idée du commanditaire ; cinquante jusqu'au 24 septembre 2026)

> Les douze îles dessinées à la main restent les îles-souvenirs (récit, fragments) et ferment chaque chapitre ; les îles de passage sont générées (taille, climat, poids, vœux tirés d'une réserve). Dix chapitres de trois îles, chacun sur le schéma « nouveauté, pratique, souvenir ». Réduction décidée le 24 septembre (docs/REDUCTION_30_ILES.md) : treize îles sur cinquante n'apportaient rien de neuf.

| Chapitre | Îles | Ce qui arrive | Taille | Statut |
|---|---|---|---|---|
| 1. Prise en main | 1–3 | affinités et faune, rivière et saisons, semis | 30–48 | **fait** |
| 2. Les habitants | 4–6 | vœux et main, souffles, tuiles rares | 42–54 | **fait** |
| 3. Le ciel | 7–9 | surprises de saison, collines, grenier-ruche-menhir | 60–66 | **fait** |
| 4. Bâtir | 10–12 | lande, bâtir | 60–68 | **fait** |
| 5. Archipel du Sud | 13–15 | climat chaud, fusions et Cahier | 72–84 | **fait** |
| 6. Archipel des Pluies | 16–18 | climat humide | 76–97 | **fait** |
| 7. Archipel du Nord | 19–21 | climat froid, niveau 3 ; Le Pont de Glace y passe | 72–108 | **fait** |
| 8. Les Quatre Climats | 22–24 | chaque île change de climat (chaud, froid, humide), signatures | 90–100 | **fait** |
| 9. Les grandes îles | 25–27 | la croissance, ce chapitre seulement (« ici, le temps bâtit seul »), signatures | 104–140 | **fait** |
| 10. Cent saisons | 28–30 | signatures, épilogue | 120–150 | **fait** |

Ordre proposé : finir le lot 4 (grille effacée, fusions, ouvrages, niveaux 3), puis lot 5 (modèle de climat, recoloration, chaud et froid jouables sur îles générées, guide), puis lot 6 (chapitres, générateur par climat et taille, carte, textes courts, calibrage), puis lot 7 (venteux, montagnard, deux climats, jumelles).

> Révision (18 septembre) : le lot 7 initial (venteux, montagnard, deux climats, jumelles) est remplacé par le **Livre II** ci-dessous. Venteux devient un climat de mer, montagnard une contrainte d'île, les jumelles sont remplacées par les archipels. Les chapitres 8 à 10 gardent leur structure actuelle.

## Lot 7 : Livre II — la mer (idée du commanditaire)

> Après l'île 30, la campagne continue en mer : cinq chapitres de cinq îles (31 à 55). À recycler d'abord : les vingt îles générées retirées le 24 septembre (noms, textes — trois à réécrire, ils annoncent des tuiles retirées —, graines), neuf signatures (dont trois jamais employées) et quatre grandes îles de 112 à 140 cases (docs/REDUCTION_30_ILES.md, § 4.6). La mer entre deux îles devient posable, des routes commerciales relient les ports, et les niveaux hauts sont des archipels dont chaque île a sa contrainte. Décisions prises avec le commanditaire : abysses jamais dans le deck (bord de carte ou amas de mer), tuile Mer neutre, routes payées selon le nombre de ports reliés, pas de saisons décalées entre les îles.

### Tuiles de mer

| Tuile | Se pose | Aime | Craint | Paie |
|---|---|---|---|---|
| **Mer** | sur le haut-fond | mer, plage, rocher | rien | 0 seule ; support des routes |
| **Récif** | sur le haut-fond, jamais contre l'abysse | plage, rocher, mer ; climat chaud | hameau, champ (blanchit : −2) | fermeture comme la forêt |
| **Plaine d'algues** | sur le haut-fond, jamais contre l'abysse | marais, pré, mer ; froid et humide | été au chaud (se fane) | faune (+1 par animal de sa région) |
| **Abysse** | jamais : émerge quand une case de mer touche le bord de la carte ou a au moins quatre voisines de mer | — | — | rien ; les routes la traversent, chaque case compte double ; la baleine y vient |

### Routes commerciales

Une route est une composante connexe de cases de mer qui touche au moins deux **ports** (fusion hameau + eau, déjà en jeu) ou hameaux côtiers bâtis niveau 2. Elle paie chaque saison :

| Ports reliés | 1 | 2 | 3 | 4 | 5 et plus |
|---|---|---|---|---|---|
| Points par saison | 0 (+1 si le port touche des algues : pêche) | 3 | 7 | 12 | 18 (plafond) |

**Cargaisons** : chaque port exporte ce qui l'entoure (verger → fruits, forêt → bois, champ → grain, récif → perles, algues → poisson, roche → pierre). La route gagne +2 par cargaison distincte. Deux réseaux séparés ne s'additionnent pas : les relier est le coup qui fait basculer la partie. Sillage pointillé et barque qui fait l'aller-retour ; longueur limite trois à cinq cases selon le climat (venteux : +2).

### Vie marine, ouvrages, météo

- **Faune** : dauphin (route active, +2 par saison), tortue (récif fermé contre la plage, printemps), phoque (algues contre un rocher au froid), baleine (abysse bordé de deux algues, bonus unique à la fermeture), goéland (rivage habité, sans bonus), crabe (plage, sans bonus).
- **Fusions** : algues + hameau = pêcherie (+1 poisson par saison), récif + sable = atoll (se ferme avec un trou, tortues), mer + roche = falaise (site du phare), mer + forêt = chantier naval (la route qui en part porte une cargaison de plus).
- **Ouvrages** : phare sur une falaise (+2 par route à portée de deux cases, annule la tempête, pénalité si aucune route), balise (prolonge une route d'une case, pénalité isolée), filet (case de mer contre des algues, +2 si un port est à deux cases, pénalité sur l'abysse).
- **Météo de mer** : tempête (routes suspendues une saison sauf sous un phare), brume (routes à moitié), grand vent (routes doublées, pose en mer interdite cette saison).
- **Climat venteux** : +1 par cargaison, tempêtes deux fois plus fréquentes, routes plus longues.
- **Marée** (règle de saison, chapitre 14) : marée basse en automne découvre un banc de sable à un pas du rivage, posable une saison ; marée haute au printemps fait compter les marais côtiers comme de l'eau.

### Archipels et contraintes d'île

Un niveau = un deck, un compte de saisons, deux à quatre îles. Contraintes possibles : **réserve** (ni hameau ni champ, seule la faune paie), **montagnard** (roche et collines, pas d'eau douce, la mer est la seule eau), **brume** (météo permanente), **volcanique** (roche double, forêt brûle l'été), **île de vœux** (vœux accomplis par les routes seulement).

### Chapitres 11 à 15

| Chapitre | Îles | Ce qui arrive | Statut |
|---|---|---|---|
| 11. La Côte | 51–55 | une île bordée de mer posable : Mer, récif, algues, abysse | à faire (rien en code : ni tuile de mer, ni île au-delà de 50) |
| 12. Les Routes | 56–60 | deux îles, ports, cargaisons, faune marine | à faire |
| 13. Les Vents | 61–65 | climat venteux, tempêtes, phare et balise, fusions marines | à faire |
| 14. L'Archipel | 66–70 | trois îles à contraintes, montagnard, marées | à faire |
| 15. Le Grand Large | 71–75 | quatre îles, tous les climats, fin du Livre II, génération libre en archipel | à faire |

Récit : une capitaine qui cherche une île disparue, douze souvenirs, l'île 75 la retrouve. Souffle « Expédition » (une barque rapporte une tuile rare marine) et amélioration d'Atelier « Boussole ».

Trois lots de code : **7a** mer, abysse, routes et archipel à deux îles avec bot et calibrage ; **7b** faune, fusions, ouvrages et météo de mer, venteux ; **7c** archipels à contraintes, marée, récit, îles 61 à 75 calibrées.

## Chargement (fait le 24 septembre, sur le rapport de la session pépins)

Mesure de référence sur HTTP/2 + gzip comme GitHub Pages (`tools/serveur_h2.js`), profil iPhone 12, 4G bridée, cache vide (`tools/mesure_chargement.js`) : **27,7 s, 22 Mo, 796 fichiers** avant le menu.

| Piste | Fait | Avant → après (menu, 4G) | Statut |
|---|---|---|---|
| 1. Sons en arrière-plan | plus rien d'audio ne bloque : effets puis ambiances se chargent une fois le menu affiché | 27,7 s → 19,5 s (22 → 14,9 Mo) | **fait** (journal 136) |
| 2. Images WebP, effets à 128 px, manifeste allégé | passe finale du pipeline (`build_images.py --webp`), qualité 90 vérifiée au zoom, faune et mer sans perte ; fx jamais tirés en `lazy` ; `manifest.json` 64 Ko + `provenance.json` | 19,5 s → **9,6 s** (14,9 → 4,7 Mo) | **fait** (journal 137) |
| 3. Service worker | assets cache d'abord par empreinte de contenu, code réseau d'abord, « Recharger à neuf » | seconde visite : 2 fichiers par le réseau sur 777, chargement fini à 1,5 s (le film fait le reste) | **fait** (journal 138) |
| Le film aussi depuis l'appareil | servir les requêtes Range du film depuis le cache | 0,63 Mo de moins par visite après dix minutes | à décider |
| Atlas de sprites | 620 images en quelques planches, si le nombre de requêtes gêne encore sur le vrai site (HTTP/2 le rend secondaire : 737 fichiers pour 4,7 Mo tiennent en 9,6 s, soit le débit) | — | plus tard, seulement mesuré |
| Vérifier sur le site en ligne | `github.io` injoignable depuis l'environnement (403 du mandataire) : mesurer une fois depuis un vrai téléphone | — | **à faire par le commanditaire** |

## Deux modes à part (idées du commanditaire, 24 septembre)

Le jeu de base reste lent ; ces deux modes sont l'inverse assumé, chacun avec son bouton à côté de l'Île infinie, son tampon et sa version « du jour » (même graine pour tous). Rien à dessiner par le code : une image de cadran et une image de dos de tuile à faire faire.

### « Le Souffle court » (pas de file, la tuile au dernier moment, 3 secondes)

Île procédurale à chaque partie, sans histoire, sans vœu, sans souffle. Une seule tuile posée au départ. Autant de tuiles que de cases : ce qui n'est pas posé à temps est perdu pour de bon, et les cases vides se paient à la fin.

| Règle | Décision (commanditaire, 24 septembre) |
|---|---|
| Tuile | apparaît d'un coup, cadran de 3 s ; à zéro, la tuile est **perdue définitivement** (pas de pose automatique) |
| Cases vides à la fin | malus par case vide ; plus fort si la case empêche une région de se fermer ; plus fort encore si plusieurs cases vides forment une « région vide » (valeurs par défaut : −2 par case ; −5 si elle est la seule à manquer à une région ; dans une région vide de 3 cases et plus, −4 par case) |
| Série | perdue si pas de pose ; série si pose sous 1 s ; **plus forte encore si posée au bon endroit** (défaut : total de la tuile dans le meilleur tiers des cases légales) ; multiplicateur ×1, ×1,5, ×2, ×3 |
| Souffles | aucun, sous aucune forme ; pas de rallonge de temps (« l'hiver s'en chargera ») |
| Saisons | à renforcer pour qu'elles comptent : primes de changement de saison plus fortes ou conditions nouvelles (défaut : prime ×2, +10 si aucune tuile perdue dans la saison). Elles touchent aussi le plateau et le temps : **hiver** cadran plus lent (gelé, sans excès : ×1,4) ; **automne** brume sur le plateau (toutes les tuiles ou la plupart, selon la chance), seules celles autour de la tuile qu'on pose réapparaissent ; **printemps** (retenu) : deux tuiles proposées d'un coup, on en pose une, l'autre est perdue ; automne (retenu) : 70 % de chance par tuile d'être sous la brume au changement de saison, la pose dissipe les six voisines ; **été** : à déterminer (« canicule » ×0,8 / points ×1,5 écartée : pas assez aimée) |
| Cadran | visible en tout temps sans enlaidir : un arc en dégradé autour de la tuile qui se vide (dégradés et animations permis) ; couleur de la saison, rouge dans la dernière seconde |
| Score | meilleur score tout court (île procédurale) ; île de 40 à 60 cases |
| Été (retenu) | « les grandes heures » : une réserve de 12 s pour la saison, pas de cadran par tuile, ce qu'on gagne sur le facile sert au difficile |
| Statut | **fait** (24 septembre, journal 139) ; v2 sur retours du commanditaire (journal 140) : tuile seule en grand centrée en bas, jamais la suivante, décompte avant le début, musique énergique, récapitulatif des règles avant l'île ; v3 (journal 143) : le temps se lit sur la mer, une houle qui déferle sur la côte ; v4 (journal 144) : chronomètre au-dessus de l'île, chiffre et marée ; reste l'image du tampon, à faire faire |

### « Sous la brume » (démineur : 5 à 10 tuiles retournées, on sait lesquelles, pas où)

| Règle | Décision |
|---|---|
| Saison | 5 poses ; les tuiles retournées ne se dévoilent qu'au passage de saison, et seulement avec au moins 3 voisines posées ; au dévoilement, elles comptent comme posées à l'instant |
| Déplacement | une tuile déjà posée peut être déplacée, **au prix de la prochaine tuile à poser** (elle est perdue) ; une tuile engagée contre la brume ne bouge plus avant le dévoilement |
| Brume et régions | une tuile retournée **ne compte pas** dans les régions ni pour les primes tant qu'elle n'est pas dévoilée : la brume coupe la région |
| Ce qui force le pari | bords contre une tuile dévoilée ×2 dans les deux sens ; une mise obligatoire par saison (annoncer la famille d'une tuile cachée : juste +5 et deux mises la saison suivante, faux −5, non posée −3) ; chaque tuile encore retournée à la fin : −3 |
| Information | un seul indice : chaque tuile posée contre la brume affiche combien de ses voisines cachées l'aiment (pas lesquelles), lu à la pose, jamais mis à jour ; ni saison, ni faune, ni rivière ne révèlent rien |
| Refusé | sondage aux souffles, indices par particules ou par saison : trop simple, le joueur tenu par la main |
| Crans | Brume claire (inventaire exact, chiffres toujours) ; Brume épaisse (inventaire par couleur, chiffres une pose sur deux) |
| Reste à écrire | la suite du gameplay par le commanditaire ; lequel des deux modes se monte en premier |

## Lot 8 : publication (à planifier)

Hors ligne complet (service worker), version anglaise, export/import de sauvegarde (**fait** : fichier téléchargé / chargé, rappel périodique, copie de secours), politique de confidentialité, captures et fiche, dépôt itch.io puis Google Play (TWA) puis iOS (Capacitor). Réécriture native écartée : le code est emballé tel quel.

## Audit externe du 18 septembre (rapport : `docs/AUDIT_2026-09-18.md`)

Moyenne 6,1 / 10 (concept 6,5 ; game design 6,5 ; gameplay 6 ; progression 4,5 ; équilibrage et lisibilité 6 ; direction artistique 7 ; narration 6,5 ; rejouabilité 6). Corrigé le jour même : plantage des améliorations Semence forte et Talisman, calibrage sur la graine jouée, faisabilité des vœux, compliments resserrés, changement de saison allégé, bannière de succès déplacée, textes contradictoires.

| Recommandation de l'audit | Impact (audit) | Coût | Statut |
|---|---|---|---|
| Faire compter les séries (souffle à 3 bons coups, fermeture double à 5, mauvaise pose remet à zéro) | 5/5 | faible | fait (journal 45) |
| Main de saison : les tuiles visibles jouables dans l'ordre voulu (dès l'île 16) | 5/5 | moyen | fait (journal 46) |
| Livre II : mer, routes, archipels, en remplacement local plutôt qu'en couche de plus | 4/5 | élevé | prévu (lot 7) |
| Choix de l'ouverture : trois semis qui biaisent la file avant chaque île (dès l'île 4) | 4/5 | faible | fait (journal 46) |
| La friche : une pose à total négatif devient friche, ruine ou lit asséché, réparable en bâtissant | 4/5 | moyen | fait (journal 46), à la pose plutôt qu'au changement de saison |
| Défis à règle tordue (douze, écrits à la main) | 3/5 | faible | déjà listé plus bas |
| Vœux enchaînés d'un même habitant | 3/5 | moyen | plus tard |
| Objectif d'archipel : un contrat par chapitre, seconde voie pour la porte | 3/5 | faible à moyen | à décider |
| Carte postale de l'île finie (export d'image) | 3/5 | faible | à décider |
| Porte de chapitre : 8/15 jugée trop haute (bot glouton : 5 à 7 étoiles par chapitre dès le chapitre 4) | — | nul | fait : 6/15 (journal 45) |

Seconde réponse de l'auditeur, « que faudrait-il pour approcher 10/10 » (`docs/AUDIT_2026-09-18_vers-10.md`) : plafonds réalistes de 8 à 9 par aspect, moyenne projetée 8,1 avec les mesures ci-dessus, 8,7 en plafond structurel. Conseil principal : retirer plutôt qu'ajouter (fondre les ouvrages dans les fusions, vider la transition de saison, raréfier les souffles) ; le Livre II ne relève pas la moyenne, il l'étale.

### Mesures « vers 10 » : décisions du commanditaire (18 septembre)

| Mesure | Réf. audit | Décision | Note |
|---|---|---|---|
| Transition de saison en plan silencieux : les points volent depuis les régions concernées vers le score, la règle écrite une seule fois | M1 | fait (journal 47) | — |
| Le son du coup : une note par point sur une gamme qui monte avec la série, un accord à la fermeture | M2 | fait (journal 47) | — |
| Jauge de série près du score, qui se vide quand la série casse | M3 | fait (journal 47) | — |
| Troisième étoile à 90 % du bot, étoile d'or cosmétique à 100 % | E1 | fait (journal 48) | — |
| Contrat d'archipel choisi en début de chapitre, seconde voie pour la porte, avec un rappel de l'avancement | P2 | fait (journal 48) | — |
| Carte postale de l'île finie (export image) | R5 | fait (journal 50) | — |
| Souffles plus rares, version douce : gains par fermeture et par animal réduits, le vœu conservé | G3 | fait (journal 48) | recalibrage ensuite |
| Signature écrite par île générée : contrainte affichée sur la carte d'intro | P3 | fait (journal 49) | table d'une vingtaine |
| Un « pourquoi » sur chaque point : détail cumulé au survol du score | E3 | fait (journal 49) | repris au bilan |
| Amélioration de l'Atelier « clore la saison plus tôt » (1, 2 ou 3 poses avant) | C1 | fait (journal 48), compromis | pas de bouton libre |
| Écrire les îles muettes (36 à 49), voix qui tient compte de ce qu'on a bâti | N2, N3 | fait (journal 49) | — |
| Passe d'interface : boutons du menu au gabarit, icônes d'Atelier distinctes | A2 | fait (journal 47) | — |
| Ambiance sonore liée à la composition de l'île | N4 | fait (journal 47) | — |
| Défis à règle tordue | R3 | plus tard | le commanditaire est réservé, à revoir |
| Décision de fin d'île (clore l'île contre une prime) | G4 | plus tard | jugée « bof » |
| Vœux enchaînés d'un habitant | N1 | plus tard | — |
| Écran « Nouvelle île » (taille, climat, graine partageable) | R1 | plus tard | — |
| Deux difficultés Promenade / Saison | E5 | plus tard | — |
| Palette par saison pilotée par la lisibilité | A1 | plus tard | — |
| Faune en groupes animés | A3 | plus tard | — |
| Classement de l'Île du jour sans serveur (chaîne à copier) | R4 | plus tard | — |
| Calibrage avec trois styles de bot | E2 | plus tard | — |
| Docs générées depuis les données | E4 | plus tard | — |
| Friche qui bloque la fermeture de sa région | G1 (variante) | plus tard | — |
| Passe de performance (60 fps sur portable modeste) | M4 | plus tard | — |
| Livre II (mer, routes, archipels) | C3 | plus tard | reste prévu au lot 7, après le socle |
| Fondre les ouvrages dans les fusions, supprimer la remise | G2 | écarté | la remise vient d'être faite et fonctionne |
| Atelier à branches exclusives | P4 | écarté | l'Atelier par chapitre vient d'être refait |
| Assets originaux commandés, serveur | — | écarté | déconseillés par l'auditeur lui-même |

## Audit de simplification du 22 septembre (rapport : `docs/AUDIT_SIMPLIFICATION_2026-09-22.md`)

Demande du commanditaire : « beaucoup de fonctionnalités, le jeu est complexe et illisible ; deux agents pour déterminer ce qu'on retire et ce qu'on garde, ton avis, un compte rendu ». Deux agents (l'œil du nouveau joueur ; les systèmes et les mesures sur 200 parties de bot) et l'avis du lead, arbitrés dans le rapport. Constat : ~38 systèmes, ~170 règles nommées à l'île 40 ; trois sources font 71 % du score (faune 32 %, affinités 27 %, fermetures 12 %), seize mécaniques pèsent moins de 1,5 %. Proposition : ~70 règles, aucune île ni famille retirée.

| Mécanique | Proposition | Décision du commanditaire | Statut |
|---|---|---|---|
| Cinq anomalies (vœu `c_port` impossible, îles annoncées à tort dans le Guide, faune non verrouillée, règles liées à la météo, port dans le README) | corriger quoi qu'on décide (lot S0) | d'accord (23 septembre) | **fait** (lot S0) |
| Contrats d'archipel, faucille, effets de série, étoile d'or dans le HUD, tuiles d'événement, rares des paliers 2 et 3, 12 améliorations | retirer (lot S1, −1,7 % mesuré) | d'accord, mais l'Atelier garde **12** améliorations et non 8 | **fait** (lot S1 ; Atelier à 18, les six autres partent avec les lots S3 et S4) |
| Météo + règles de saison variables | une seule « surprise de saison » par saison, 8 au lieu de 17, découplée du drapeau météo (lot S2) | d'accord | **fait** (lot S2) |
| Souffles, main, poche, remise | 3 pouvoirs, 2 sources, main dès l'île 6 (lot S3) | d'accord | **fait** (lot S3) |
| **Ouvrages + remise** | retirer, ruche et menhir passent rares (lot S4, recalibrage obligatoire) — ou les six ouvrages en rares sans remise | retirer | **fait** (lot S4) |
| Niveau 3 | garder le geste, une règle, signatures en étiquettes (lot S5) | d'accord | fait (lot S5) |
| **Croissance** | caractère du chapitre 9 (« ici, le temps bâtit seul ») plutôt que mécanique cumulée | question posée : « c'est quoi la croissance ? » — expliquée, réponse du commanditaire : « caractère du chapitre 9 » | **fait** (campagne à trente, 24 septembre) : la croissance n'est active que sur les îles 25 à 27 |
| Fusions | garder recettes et Cahier, retirer la récompense de découverte (+23,7 % sur le calibrage) | d'accord | fait (lot S5) |
| Interface | un canal de message, 4 blocs, 2 écrans entre deux îles (lot S6) | d'accord | fait (lot S6) |
| **Régime de calibrage** | recettes connues (actuel) ou première traversée | retirer la récompense de découverte, le régime « recettes connues » reste juste | fait (lot S5) |
| Calibrage final (lot S7) | rejouer la porte et les bots par chapitre après tous les lots ; cible de l'audit : le bot glouton fait 5 à 7 étoiles par chapitre, jamais moins de 4 | mesure du 24 septembre (campagne à trente, porte à 4 étoiles sur 9) : le glouton fait **9, 8, 7, 8, 6, 7, 6, 6, 5, 4** étoiles sur 9 aux chapitres 1 à 10 — la porte ne bloque jamais, et l'écart bot fort / glouton va de −3 % (chapitre 1) à 36 % (chapitre 10) | **tranché** (commanditaire) : garder les seuils actuels ; la campagne plus courte a durci d'elle-même la fin (4 étoiles sur 9 au dernier chapitre) |

## Croissance des tuiles (idée du commanditaire, 19 septembre)

Une tuile bien entourée des siennes grandit d'elle-même : le hameau devient un village, la forêt s'épaissit. Livrée à
l'île 41, chapitre 9 renommé « Ce que le temps y fait ». Étudiée d'abord comme un changement de famille (prairie →
forêt, marais qui se comble) : six déclencheurs simulés, tous trop rares (0,5 à 3,3 tuiles par île), piste abandonnée.
Rapports : `docs/SUCCESSION_SPEC_2026-09-19.md` (spécification de l'agent et annexe de mesures).

| Suite possible | Note | Statut |
|---|---|---|
| Croissance vers le niveau 3 par le temps | Volontairement refusé : le temps épaissit, le joueur signe | écarté |
| Changement de famille (succession écologique) | Mesuré trop rare pour être visible | écarté |
| « Hâter » : un souffle pour avancer une croissance d'une saison | N'a de sens que quand les souffles sont rares | plus tard |
| Une île à signature « qui se reboise », croissance agressive et spectaculaire | Réutilise `signatures.js` | plus tard |

## Sauvegarde en ligne (faite le 19 septembre)

Firebase : connexion anonyme ou Google, une fiche par joueur, écriture uniquement à la fin d'une île sous budget strict.
Tutoriel pour le commanditaire : `docs/FIREBASE_TUTO.pdf`. Règles : `firestore.rules`.

| Suite possible | Note | Statut |
|---|---|---|
| Classement en ligne de l'Île du jour | Le commanditaire est d'accord sur le principe. Demande un pseudonyme, une modération et une protection contre la triche ; et surtout un budget de lecture (un classement se lit beaucoup plus qu'il ne s'écrit) | à faire, lot entier |
| Reprise par code sur un appareil sans Google | Rendu inutile par la connexion Google | écarté |

## À planifier plus tard

| Idée | Note | Statut |
|---|---|---|
| Îles par taille libre (30 à 200 cases, climat, graine) | Générateur déjà prêt ; écran « Nouvelle île » | plus tard (audit vers 10) |
| Mode Contemplation (zen, sans score, saisons au sablier) | Différent du Jardin par saisons et faune vivantes | à faire |
| Retours sensoriels et calme (notes sobres, étoile franchie, vibrations, mode repos, vague de fermeture) | Lots « respiration » et « calme » issus des listes apaisement / satisfaction | fait (journal 64 à 67) |
| Direction artistique : bâtiments, arbres et rochers en modèles 3D KayKit (CC0) | Rendus isométriques à notre projection par `tools/render_kaykit.js` | fait (journal 68) |
| Fontaine, abreuvoir, campement, botte de foin | Abreuvoir, campement et botte passés en volume (KayKit). La **fontaine** n'a aucun équivalent dans les packs : réduite et assombrie, elle reste le dernier aplat Kenney du décor | fait, sauf la fontaine |
| Pack KayKit Forest fourni par le commanditaire | Feuillus, arbres nus d'hiver, blocs de rocher, palettes de saison | fait (journal 72) |
| Pack KayKit Medieval Hexagon EXTRA fourni par le commanditaire | Villageois, charrettes, navires, hexagones de côte, atlas de textures. Reste inemployés : archerie, guet, chantier naval, tours à machines — ils attendent le Livre II | largement exploité |
| Buissons du pack Forest en sous-bois | Trois silhouettes, trois nuances, tailles et miroirs tirés au sort | fait (journal 73) |
| Herbes hautes du pack Forest dans les prairies | `Grass_2` au pré, `Grass_1_C` à la lande ; les variantes `_A` et `_B` sont des brins isolés, écartées | fait (journal) |
| Animaux animés vus en petit sur les tuiles | Douze espèces rendues depuis des modèles 3D ; cinq cycles de marche | fait (journal 69) |
| Cycles de marche pour les oiseaux et le lapin | Aucun pack libre accessible n'en fournit pour l'instant | à surveiller |
| Mode Cent saisons (endurance sur une île qui grandit) | Fatigue par saison, fin quand plus aucune pose | à faire |
| Défis à règle tordue (douze défis écrits à la main) | « été permanent », « eau et roche seulement », file à l'envers | plus tard (audit vers 10) |
| Archipel 4 : îles jumelles partageant une rivière | Remplacé par les archipels du Livre II | écarté |
| Migrations (départ en automne, retour au printemps si refuge) | La faune devient un cycle | à faire |
| Vœux enchaînés (histoire en trois actes par habitant) | Narration surtout | plus tard (audit vers 10) |
| Étoile secrète par île (récompense cosmétique pour le Jardin) | | à faire |
| Cahier de l'île (encyclopédie qui se remplit, pourcentage) | | à faire |
| Cosmétiques à graines (palettes de saison, thème papier ancien, animaux rares) | Dépend des banques | à faire |
| Choix de l'ouverture (trois départs proposés) | | fait (semis, journal 46) |
| Musique adaptative par couches (stems) | Nécessite des pistes multipistes libres | à faire |
| Ambiance spatialisée selon la caméra | | à faire |
| Cloche des saisons et carillon propre à chaque habitant | | à faire |
| Cycle jour / nuit lent (fenêtres allumées en hiver) | | à faire |
| Carte postale (export image de l'île finie) | Rendue « nue » : ni grille des cases vides, ni contour hexagonal | fait (journal 50, affiné depuis) |
| Mode cadre dans le Jardin (interface masquée, export) | | à faire |
| Rejouer la construction en accéléré au bilan | | à faire |
| Accessibilité (motifs pour daltoniens, taille de texte, pose en un toucher) | | à faire |
| Décision de fin d'île (clore l'île contre une prime) | G4, jugée « bof » par le commanditaire | plus tard (audit vers 10) |
| Deux difficultés Promenade / Saison | Seuils décalés de ±15 %, longueur des saisons | plus tard (audit vers 10) |
| Palette par saison pilotée par la lisibilité | Écart de teinte garanti entre familles à chaque saison | plus tard (audit vers 10) |
| Faune en groupes animés | Un groupe animé par région plutôt que des vignettes répétées | plus tard (audit vers 10) |
| Classement de l'Île du jour sans serveur | Score encodé dans une chaîne à copier-coller | plus tard (audit vers 10) |
| Calibrage avec trois styles de bot | Fermeur de régions, chasseur de vœux, bâtisseur | plus tard (audit vers 10) |
| Docs générées depuis les données | README, tutoriel et Guide régénérés depuis `MECH_AT` et `balance.js` | plus tard (audit vers 10) |
| Friche qui bloque la fermeture de sa région | Variante de la friche actuelle (mesure G1) | plus tard (audit vers 10) |
| Passe de performance (60 fps sur portable modeste) | Budget de fluidité, temps de première image < 3 s | plus tard (audit vers 10) |
| Reprendre une partie laissée en plan | Île en cours rangée dans le navigateur, bouton « Reprendre » au menu | fait (journal 57) |
| La mer visible autour de l'île | Profondeur, écume de côte, vagues selon saison et météo, voilier, baleine — sans hexagone dans l'eau | fait (journal 65) |
| Retours de test sur la tournée | La carte postale reste affichée sans minuterie, avec « Voir le récapitulatif → » et « Enregistrer la carte ». Le tour de cadran (nuit en fronts, halos) a été essayé puis **retiré** à la demande du commanditaire | fait (journal 91, 92) |
| Tournée finale réécrite | Trois ou quatre plans nommés au lieu de douze étapes égales, vague qui salue le reste, fronts de saison habités, carte postale qui se fabrique autour du paysage, voilier qui part, toucher qui accélère avant de passer, version courte aux reprises | fait (journal 90) |
| Champs et landes trop hexagonaux, arêtes trop pointues | Dalle du champ rendue plus large et rognée à l'hexagone (pipeline, `rogne=True`) ; fondus entre sols à **sens unique**, en langues **rondes** (distance au segment, lobes aux sommets, lisière douce) ; les reliefs se fondent aussi ; rangs de culture qui s'effilochent en lisière | fait (journal 93, 95) |
| Chemins plus naturels | Itinéraires : le plus droit des plus courts, le chemin coupe la case ; ondulation discrète (journal 98). Rubans de terre battue : largeur qui ondule, bords effilochés, bouts effilés, motif de terre découpé dans l'image de sol, cailloux et touffes au bord. Le pointillé doré qui clignotait dans la tournée est retiré | fait (journal 96, 97) |
| Marques claires sur les champs | Reliefs éclairés de la dalle KayKit (monticules, cubes d'épis) : sol de champ remplacé par une terre unie recolorée par saison, les rangs de culture font le champ | fait (journal 101) |
| Collines à flancs bruns (« tuiles de falaises ») | Piste A retenue : sol d'herbe plat + collines, chaînes et monts en volume du pack EXTRA posés dessus, sommets recolorés par saison. Les trois monts du pack coiffent les massifs de roche (version roche nue) et se mêlent aux collines (version enherbée) ; une colline côtière montre ses rochers au pied côté mer (piste C), la case centrale de chaque région porte un repère immobile (piste D). Les cartes en main de colline et de roche montrent maintenant les mêmes monts. Reste la piste E (éboulis des massifs) | fait (journal 102, 104, 106, 108, 109) — piste E à décider |
| Liseré clair des images de sable | Base agrandie de 8 % et rognée à l'hexagone (`base_zoom`) : plus de couture entre deux sables | fait (journal 100) |
| Arêtes droites d'hiver autour des mares (dites « glace en hexagones ») | Ce n'était pas la glace : berge des cases d'eau sans langue de sol, cache-couture terre/eau, ourlet en trapèze qui débordait de côté. Les trois corrigés | fait (journal 99) |
| Littoral naturel | Contour global de l'île (arêtes de bord enchaînées en boucles), lissé puis érodé au bruit fBM le long de la normale ; découpe des sols, écume, halo, ombre portée et teinte de climat sur ce seul contour. Les étangs et lacs qui touchent la mer deviennent des anses | fait (journal 85) |
| Littoral : masque d'érosion fBM (alpha clipping, `globalCompositeOperation`) | Proposé par le commanditaire. Écarté : un calque hors écran par tuile recomposé à chaque image, et surtout une texture **dessinée par le code**, ce que le projet s'interdit. L'érosion s'obtient en géométrie, sur le contour global | écarté |
| L'épouvantail est un piquet à chiffon, faute de mieux | Aucun des trois packs KayKit ne contient d'épouvantail. Le piquet est vertical et lisible, mais il dit « drapeau » plutôt que « épouvantail ». À revoir si une autre banque libre en fournit un | à surveiller |
| Le vieux sprite `obj_bushGrass` (Kenney, plat) domine encore les prés | Une fois les herbes hautes posées à côté, sa silhouette en flamme paraît plate. 65 poses par île. À remplacer par une troisième famille du pack Forest | à faire |
| Une fontaine en volume | Aucun des trois packs KayKit n'en contient. Il faudrait une autre banque libre, ou composer un bassin à partir de pièces existantes | à décider |
| Lisière qui s'éteint (n'éclairer que les cases près du doigt) | Proposée par l'agent ; **refusée** par le commanditaire : la forme de l'île lisible dès le début est ce qui fait la lisibilité du jeu | écarté |
