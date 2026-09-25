# Feuille de route — l'Histoire (la campagne)

> 25 septembre 2026. Source : audit de gameplay du 25 septembre (`docs/AUDIT_GAMEPLAY_2026-09-25.pdf`, pages 3 à 8 et 21 à 24),
> révision analysée `31b3d60`. Chaque constat ci-dessous a été revérifié dans le code avant d'être planifié.
> Les deux autres modes ont leur feuille : `docs/FEUILLE_SOUFFLE_COURT.md` et `docs/FEUILLE_BRUME.md`.

**Ce que le mode promet.** Construire et anticiper dans un paysage qui change avec les saisons, une île après l'autre.

**Verdict.** On garde les trente îles et leur structure en dix chapitres : l'audit le confirme, et le commanditaire l'a décidé.
Le jeu ne manque pas de contenu, il manque de **fiabilité** (trois règles affichées ne sont pas les règles appliquées) et
d'**anticipation lisible** (le joueur voit ce qu'une pose rapporte maintenant, pas ce qu'elle prépare). On corrige d'abord,
on fait ensuite jouer chaque nouvelle action au lieu de la décrire, on rend enfin les conséquences futures visibles.
Aucun nouveau système, aucune nouvelle monnaie avant que ces trois étapes soient faites.

---

## Constats vérifiés

| Repère | Constat de l'audit | Verdict | Preuve |
|---|---|---|---|
| J-A | L'annulation peut créer une dette de souffles | **confirmé** | `island.js:518` vérifie les souffles *actuels* (`this.breaths >= undoCost`), mais `undo()` restaure les souffles *d'avant la pose* puis retire le coût (`s.breaths - this.undoCost`). Une pose qui rapporte des souffles rend donc l'annulation possible alors qu'on ne pourra pas la payer. |
| J-A | L'annulation change le hasard | **confirmé** | L'instantané (`pushHistory`, `island.js:533`) garde la file et son générateur, pas le générateur de l'île (`this.rng`), qui tire la surprise de saison (`island.js:116`, `:420`). Rejouer le même coup peut donc tomber sur une autre surprise. |
| J-B | Le Guide garde d'anciens numéros d'îles | **confirmé** | `tiles.js:4` : collines 12, landes 14 ; `tiles.js:7` : grenier, ruche, menhir 13. La progression réelle (`campaign.js:18`) : collines 8, rares tardives 9, landes 10. Ces deux tables ne servent plus qu'au Guide (`guide.js:36`, `:69`). Les commentaires de `tiles.js:61` et `:63` disent encore 7 et 9. |
| J-B | Le tutoriel parle d'une étoile nécessaire | **confirmé** | `tutorial.js:39` : « Une étoile suffit pour débloquer la suivante ». Depuis le journal « plus aucun mur possible », une île terminée ouvre la suivante sans étoile ; les étoiles servent aux chapitres. |
| J-B | La première île montre la rivière et l'été, la table les annonce à l'île 2 | **confirmé, sans effet sur les règles** | `MECH_AT[2] = ['river', 'season']`, mais rien ne verrouille la rivière ni les saisons : elles jouent dès l'île 1, et le tutoriel guidé les montre (`tutorial.js:35`, `:37`). Seul le texte d'annonce est décalé. |
| J-C | Une faute précoce devient durable | **confirmé** | `rules.js:127` : toute pose au total négatif devient une friche, dès l'île 1. La réparer passe par « bâtir » (`island.js:188`), qui n'ouvre qu'à l'île 11. Pendant dix îles, l'aperçu annonce un remède que le joueur ne peut pas employer. |
| J-D | Les nouvelles actions sont décrites, pas jouées | **confirmé** | Bâtir (île 11), fusionner (île 13) et le niveau 3 (île 19) arrivent par des cartes de texte (`pushCard`, cartes « Compris »). Seule l'île 1 a un parcours guidé qui impose la case (`GUIDED`). |
| J-E | Les vœux passent au second plan sur téléphone | **confirmé** | `hud.js:52` : au téléphone, le panneau des vœux est replié d'office ; il ne s'ouvre qu'au toucher ou brièvement quand un vœu avance (`flashWishes`). |
| J-F | La surprise de saison tombe sans prévenir | **confirmé** | La surprise est tirée à l'arrivée de la saison (`island.js:116`, `:420`) : rien à préparer. |
| J-G | Le jugement « Il y avait mieux » juge le seul gain immédiat | **confirmé** | `story.js:692` (« Il y avait mieux », « Trop vite ? »…) : le mot compare la pose au meilleur total immédiat, sans tenir compte d'un vœu ou d'une fermeture préparés. |
| J-I | Patience ne se désactive pas | **confirmé** | `upgrades.js:8` : trois niveaux achetés pour de bon ; aucun écran ne permet de rejouer au niveau inférieur. L'audit mesure un vrai compromis (île 4 : 284 points sans Patience, 224 avec). |
| J-J | Faune et souffles pèsent lourd | **à mesurer** | L'audit mesure 31 à 43 % du score venant de la faune et 17 à 36 souffles restants en fin d'île, avec le robot fort. C'est un robot qui cherche les habitats : ce n'est pas un joueur. À remesurer avec plusieurs styles de jeu avant tout changement de chiffre. |
| J-K | Un aperçu reconstruit tout le décor | **confirmé** | `rules.js:100` pose la tuile, `rules.js:125` la retire : chaque pose ou retrait fait avancer `board.version` (`board.js:70`, `:74`), et `Decor.sync` (`decor.js:107`) recalcule tout le décor dès que la version change. Chaque survol d'une case recalcule donc le décor de l'île entière. |

---

## Plan par étapes

### Étape 1 · Fiabilité — ce qui est affiché est ce qui est appliqué

| Id | Ce qu'on fait | Fichiers | Preuve que c'est fait | Effort | Statut |
|---|---|---|---|---|---|
| **J-A** | L'annulation n'est permise que si les souffles *restaurés* paient son coût. L'instantané garde aussi le générateur de l'île, l'état « annulation utilisée », les retours de tuiles et la longueur de saison ; la reprise d'une partie (sauvegarde en cours) les garde déjà, on s'aligne dessus. | `island.js` (`canUndo`, `undo`, `pushHistory`) | Test Node dans `tests/rules.test.js` : une pose qui rapporte des souffles, puis l'annulation refusée si elle coûte plus que l'état restauré ; un même coup rejoué après annulation redonne la même surprise de saison. | petit | à faire |
| **J-B** | Une seule source pour les numéros d'îles : le Guide lit `mechIsland('hill')`, `mechIsland('heath')`, `mechIsland('rare2')` ; `FAMILY_FROM` et `RARE_LATE` disparaissent. La carte g9 du tutoriel dit : « Une île terminée ouvre la suivante ; les étoiles ouvrent les chapitres ». La table `MECH_AT` place la rivière et les saisons à l'île 1, là où le joueur les rencontre vraiment. Relecture du README dans la foulée. | `tiles.js`, `guide.js`, `tutorial.js`, `campaign.js`, `README.md` | Test Node : chaque numéro d'île cité par le Guide égale `mechIsland` de la mécanique ; aucune phrase du tutoriel ne contient « débloquer » avec « étoile ». | petit | à faire |
| **J-K** | L'aperçu remet `board.version` à sa valeur d'avant : le plateau est identique, rien ne doit être recalculé. | `rules.js` (`preview`) | Test Node : soixante aperçus d'affilée sur la même case, zéro recalcul du décor (compteur dans `Decor.sync`). Puis mesure au téléphone : images par seconde en glissant le doigt sur l'île, avant et après. | petit | à faire |
| **J-C** | La friche n'apparaît qu'à partir de l'île qui ouvre « bâtir ». Avant, une pose négative coûte ses points, sans friche durable. L'avertissement de l'aperçu ne parle de réparation que si elle est possible. | `rules.js` (`preview`, drapeau `blight` ligne 127, reçu comme un réglage de l'île), `island.js`, textes de l'aperçu | Test Node : île 3, pose négative, aucune tuile `blighted` ; île 11, même pose, friche réparable. Recalibrage `node tools/calibrate.js 4 1-30 --write` (le score bouge). | petit | à faire, **décision 1** |

Fin de l'étape : `tools/suite.sh complet` vert, une ligne de journal par correctif.

### Étape 2 · Découverte — faire jouer, pas faire lire

| Id | Ce qu'on fait | Fichiers | Preuve que c'est fait | Effort | Statut |
|---|---|---|---|---|---|
| **J-D** | Aux îles qui ouvrent bâtir (11), fusionner (13) et le niveau 3 (19) : une étape guidée courte, comme à l'île 1. La bonne tuile arrive en tête de file, une case brille, le joueur fait l'action une fois ; l'étape se valide par l'action réussie, pas par « Compris ». | `tutorial.js` (étapes à `target`), `campaign.js` (ouverture de file imposée pour ces îles) | Test navigateur (`tests/decouverte.js`) : à l'île 11, la carte ne se ferme qu'après une construction réelle. | moyen | à faire |
| **J-E** | Au téléphone, un vœu épinglé : une ligne toujours visible sous la saison, « Forêts reliées 4/5 · 3 poses ». Par défaut le plus proche d'être tenu ; un toucher sur un autre vœu l'épingle à sa place ; un toucher sur la ligne éclaire les cases concernées. Les autres vœux restent dans le panneau. | `hud.js`, `css/mobile.css`, `render.js` (cases éclairées) | Test navigateur (`tests/mobile.js`) : la ligne du vœu est visible sans ouvrir de panneau, sur 360 × 780 et en paysage. | moyen | à faire, **décision 4** |
| **J-G** | Le mot après une pose dit un fait, pas un jugement : « +2 · vœu forêt 4/5 », « ferme une région de 6 ». Les célébrations des vrais exploits (« Coup de maître », région fermée, étoile) restent. On retire « Il y avait mieux » et « Trop vite ? ». | `story.js`, `main.js` (choix du mot) | Test Node : aucun mot négatif n'est émis pour une pose qui fait avancer un vœu. | petit | à faire, **décision 3** |
| **Première île** | La première île se résume en cinq phrases : poser à côté des bons voisins, comparer deux cases, fermer une région, voir arriver un animal, apprendre que l'île suivante s'ouvre toujours. On garde la rivière et l'été qui y sont déjà, mais on raccourcit leurs textes. | `tutorial.js` (`GUIDED[1]`) | Essai avec cinq personnes (voir « Validation ») : 4 sur 5 expliquent le voisinage et la fermeture. | petit | à faire |

### Étape 3 · Profondeur — voir ce qu'on prépare

| Id | Ce qu'on fait | Fichiers | Preuve que c'est fait | Effort | Statut |
|---|---|---|---|---|---|
| **J-F** | La surprise de la saison suivante est tirée deux poses avant son arrivée et annoncée dans la bannière (« Été dans 2 poses : sécheresse »), avec les cases menacées éclairées au toucher. Le tirage est sauvé avec la partie en cours et dans l'instantané d'annulation. | `island.js` (tirage anticipé), `hud.js`, `render.js`, sauvegarde de partie | Test Node : la surprise annoncée est celle qui s'applique ; elle survit à une reprise et à une annulation. Recalibrage des étoiles. | moyen | à faire, **décision 2** |
| **J-H** | L'aperçu de pose ajoute **une seule** ligne sur l'avenir, la plus utile : habitat presque prêt (« encore une forêt : un élan »), région à une case de se fermer, ou tuile menacée par la saison qui vient. Le détail complet reste au toucher. | `rules.js` ou un petit module d'annonce, `render.js` / `hud.js` | Test Node : pour trois situations préparées, la ligne attendue sort. Pas de nouvelle ligne permanente sur le plateau. | moyen | à faire |
| **J-I** | Patience réglable : entre deux îles, l'écran de départ propose le niveau voulu parmi ceux achetés (Normale, +1, +2), avec une phrase sur le compromis (plus de poses, moins d'occasions de saison). | `upgrades.js`, écran de départ, sauvegarde | Test Node : un niveau choisi plus bas s'applique à l'île suivante et reste mémorisé. | petit | à faire, **décision 5** |
| **J-J** | Mesurer avant de toucher : le robot fort, un robot « bâtisseur » et un robot « faune » jouent les îles 1, 4, 7, 11, 19 et 30. Si la faune domine sans décision intéressante, on réduit sa répétition (même animal qui rapporte à chaque saison) plutôt que sa valeur ; si les souffles s'accumulent, on relit leurs sources. Aucun chiffre ne change sans cette mesure. | `tests/bot.js`, `tools/calibrate.js` | Un tableau de mesures dans le journal, puis un seul réglage à la fois, suivi d'un recalibrage. | moyen | à faire |

### Étape 4 · Contenu — des situations, pas des règles

On choisit **trois** idées de l'audit, qui réutilisent placement, voisinage, eau et saisons, et on les place dans les chapitres
existants (sans allonger la campagne) :

| Id | Idée | Où | Effort | Statut |
|---|---|---|---|---|
| **J-L** | Une intention par île : une phrase d'objectif de découverte sur l'écran de départ (« Ici, apprends à garder une rivière ouverte »), bâtie sur les signatures existantes ; un vœu secondaire qui la contredit est retiré. | les 30 îles, `campaign_texts.js`, `signatures.js` | petit | à faire |
| **J-M** | Une île « passage étroit » : deux terres reliées par peu de cases ; les tuiles du passage engagent la suite. | une île générée du chapitre 3 ou 4 | petit | à faire |
| **J-N** | Un puzzle de rivière court : quelques tuiles fixées, un départ rocheux, une sortie à atteindre. | une île « pratique » d'un chapitre à climat humide | moyen | à faire |

Gardées en réserve, après validation des trois premières : deux projets au choix avant l'île, défi de fermeture volontaire,
contrat de saison annoncée (après J-F), rejouer exactement le même tirage, un bilan qui montre une décision marquante.

---

## Décisions à prendre par le commanditaire

1. **La friche avant l'île 11.** (a) Pas de friche avant « bâtir » : la pose négative coûte ses points, c'est tout. (b) Friche partout, mais la première réparation est offerte même sans « bâtir ». (c) Rien ne change. **Recommandé : (a).** La friche a été voulue comme une conséquence qu'on répare ; sans réparation possible, c'est une punition.
2. **Annoncer la surprise de saison deux poses avant.** (a) Oui, dans la bannière. (b) Oui, une saison entière avant. (c) Non, la surprise reste une surprise. **Recommandé : (a).** Deux poses laissent le temps d'une réponse sans retirer l'effet de découverte.
3. **Le mot après une pose.** (a) Un fait (« +2 · vœu 4/5 ») à la place des jugements négatifs, les célébrations restent. (b) Supprimer tout mot sauf les célébrations. (c) Garder tel quel. **Recommandé : (a).**
4. **Le vœu épinglé au téléphone.** (a) Le plus proche d'être tenu, changeable au toucher. (b) Le premier de la liste. (c) Garder le panneau replié. **Recommandé : (a).**
5. **Patience réglable entre deux îles.** (a) Oui, parmi les niveaux achetés. (b) Non. **Recommandé : (a).** Une amélioration achetée ne doit pas piéger son propriétaire.
6. **Les trois contenus de l'étape 4.** (a) Intention par île, passage étroit, puzzle de rivière. (b) Un autre trio pris dans la réserve. **Recommandé : (a),** le moins coûteux et le plus lisible.

---

## Écarté ou reporté

- **Allonger la campagne, une nouvelle monnaie, de nouvelles familles, une boutique entre les îles** : l'audit et cette feuille s'accordent, le manque est l'explication des choix, pas le contenu.
- **Augmenter tous les coûts de souffles au hasard** : écarté ; J-J mesure d'abord.
- **Une deuxième couche de quêtes** (inspirée de Dorfromantik) : écartée, les vœux existent déjà ; on travaille leur lisibilité (J-E).
- **Le Livre II (la mer)** : reste dans la feuille de route générale, après les étapes 1 à 3.

## Validation avec des joueurs

Cinq personnes qui ne connaissent pas le jeu, sur téléphone. On observe sans guider, puis on demande après quelques poses :
« Pourquoi cette case ? Que veux-tu obtenir ? Que va changer la saison ? »

- **Réussite visée** : 4 sur 5 expliquent le voisinage et un objectif, et trouvent seules comment suivre cet objectif.
- **À noter** : les mots qu'elles emploient pour décrire les règles, où elles cherchent l'information, ce qu'elles ouvrent pour rien, ce qu'elles voudraient essayer autrement.
- **Contrôles après chaque étape** : annulation sans dette ni hasard changé ; numéros identiques dans le Guide, le tutoriel et le README ; aucune friche sans remède ; aperçu fluide au doigt.
