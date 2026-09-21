# Cent Saisons — règles de travail

## Communication

- **Une notification dès que quelque chose est terminé.** À chaque fois qu'un travail
  aboutit — un lot posé, un correctif poussé, une question tranchée — envoyer une
  notification (outil `PushNotification`), sans attendre la fin de la séance. Le
  commanditaire n'est pas devant l'écran.
- Tout se dit et s'écrit en **français**, code et commentaires compris.
- Un rapport court après chaque phase : ce qui est fait, ce qui a été mesuré, ce qui reste.
- Pas de question bloquante quand une valeur par défaut raisonnable existe ; poser la
  question au bon moment, pas avant d'avoir fait tout ce qui n'en dépend pas.

## Le jeu

- HTML / CSS / JS **purs**. Aucun outil de construction, aucune dépendance, aucun
  paquet à installer. Le dépôt doit rester servable tel quel par GitHub Pages.
- **Ne jamais dessiner d'image par le code.** Les images viennent de banques libres.
  Sont permis : dégradés, particules, flous, transitions, animation de sprites et
  effets de caméra — tout ce qui *anime* ou *compose* des images existantes.
- Le plaisir d'abord, la beauté ensuite, la performance en troisième.

## Les assets

- « On ne s'interdit rien tant que c'est gratuit. » Le gratuit suffit.
- À éviter seulement : le copyleft viral (CC-BY-SA, GPL) et les licences
  non commerciales. CC-BY convient.
- Chaque œuvre créditée en jeu **et** dans `CREDITS.md`.

## Les documents à tenir

- `JOURNAL_DE_BORD.md` — une ligne par changement notable, au format
  « ce qui n'allait pas | ce qui a été fait ». C'est la mémoire du projet.
- `FEUILLE_DE_ROUTE.md` — ce qui vient.
- `README.md` — l'état du jeu.

## Git

- Développer et pousser **uniquement** sur la branche désignée, avec
  `git push -u origin <branche>`.
- Commits atomiques, préfixés : `feat:` `fix:` `art:` `audio:` `docs:`
  `balance:` `test:`. Le corps du message dit *pourquoi*, pas seulement *quoi*.
- **Jamais de pull request** sans demande explicite.
- Aucun identifiant de modèle dans un message de commit, un corps de PR, un
  commentaire de code ou quoi que ce soit qui parte dans le dépôt.

## Vérifier plutôt que supposer

- Mesurer avant de trancher. Les deux plus grosses erreurs du projet venaient d'une
  intuition non vérifiée : l'échelle des étoiles et la projection des tuiles.
- Toute modification qui touche au score impose un recalibrage :
  `node tools/calibrate.js 4 1-50 --write`.
- La suite de tests avant chaque poussée. Serveur statique requis pour les tests
  navigateur : `python3 -m http.server 8765`.
- Pour juger un rendu, `node tools/capture_partie.js <île> <fichier>` joue une partie
  entière et photographie le paysage seul.
