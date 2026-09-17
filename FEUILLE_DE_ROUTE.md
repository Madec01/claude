# Feuille de route — Cent Saisons

> Idées d'enrichissement du jeu, à remplir au fil du développement. Statuts : **à faire**, **en cours**, **fait**, **écarté**.
> Chaque entrée livrée reçoit une ligne dans le Journal des modifications de `JOURNAL_DE_BORD.md`.

## Retenu par le commanditaire (prochain lot)

| # | Idée | Décision de design | Statut |
|---|---|---|---|
| 1 | **Tuiles qui s'assemblent / décor par région** | Deux calques par tuile (sol / décor) produits par le pipeline ; entre deux tuiles de même famille, un raccord de sol qui efface la couture et un petit élément posé sur l'arête (arbre, touffe, roseau, vague, rocher, clôture…), tiré de la banque Kenney. Rendu : sols → raccords → décors triés par ligne. Forêts denses, massifs reliés, villages avec puits et ruelles. | **fait** |
| 2 | **Sentiers automatiques** | Aucune tuile « chemin » : un sentier se dessine tout seul entre deux hameaux séparés d'au plus trois tuiles de terre ouverte (prairie, champ, verger, lande, colline). Tracé courbe passant par les milieux d'arêtes, texture terre recolorée par saison, cailloux Kenney. Bonus : +1 point par saison par liaison. | **fait** |
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
| 12 | **Tournée finale** | À la fin d'une île : zoom arrière, régions illuminées de la plus petite à la plus grande avec libellé et faune, sentiers et rivières qui scintillent, compteur, balayage des quatre saisons, nom de l'île et étoiles ; un toucher passe au bilan. | **fait** |
| 13 | **Recalibrage des étoiles** | Seuils mesurés avec un bot plus fort (≈ 55 / 80 / 100 % de son score ; la troisième étoile exige aussi tous les vœux), affichés dans le HUD. | en cours |

## À planifier plus tard

| Idée | Note | Statut |
|---|---|---|
| Îles par taille libre (30 à 200 cases, climat, graine) | Générateur déjà prêt ; écran « Nouvelle île » | à faire |
| Mode Contemplation (zen, sans score, saisons au sablier) | Différent du Jardin par saisons et faune vivantes | à faire |
| Mode Cent saisons (endurance sur une île qui grandit) | Fatigue par saison, fin quand plus aucune pose | à faire |
| Défis à règle tordue (douze défis écrits à la main) | « été permanent », « eau et roche seulement », file à l'envers | à faire |
| Archipel 4 : îles jumelles partageant une rivière | Vrai nouveau chapitre, coût élevé | à faire |
| Migrations (départ en automne, retour au printemps si refuge) | La faune devient un cycle | à faire |
| Vœux enchaînés (histoire en trois actes par habitant) | Narration surtout | à faire |
| Étoile secrète par île (récompense cosmétique pour le Jardin) | | à faire |
| Cahier de l'île (encyclopédie qui se remplit, pourcentage) | | à faire |
| Cosmétiques à graines (palettes de saison, thème papier ancien, animaux rares) | Dépend des banques | à faire |
| Choix de l'ouverture (trois départs proposés) | | à faire |
| Musique adaptative par couches (stems) | Nécessite des pistes multipistes libres | à faire |
| Ambiance spatialisée selon la caméra | | à faire |
| Cloche des saisons et carillon propre à chaque habitant | | à faire |
| Cycle jour / nuit lent (fenêtres allumées en hiver) | | à faire |
| Carte postale (export image de l'île finie) | | à faire |
| Mode cadre dans le Jardin (interface masquée, export) | | à faire |
| Rejouer la construction en accéléré au bilan | | à faire |
| Accessibilité (motifs pour daltoniens, taille de texte, pose en un toucher) | | à faire |
