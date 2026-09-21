# Le relevé des pépins — à monter une fois

Ces deux fichiers **ne vivent pas dans le dépôt du jeu**. Ils sont gardés ici pour qu'on les retrouve, et pour
qu'ils restent versionnés avec la spécification qu'ils appliquent (`../SECTION_BUGS.md` § 9).

Leur place est le dépôt **privé** `Madec01/cent-saisons-bugs` :

```
cent-saisons-bugs/
├── .github/workflows/pepins.yml    ← docs/releve/pepins.yml
└── releve.mjs                      ← docs/releve/releve.mjs
```

---

## Les quatre choses à faire, une fois

| Où | Quoi |
|---|---|
| **Console Firebase** → ⚙ Paramètres du projet → Comptes de service | *Générer une nouvelle clé privée* → un fichier JSON se télécharge |
| **cent-saisons-bugs** → Settings → Secrets and variables → Actions → New repository secret | Nom : `FIREBASE_SERVICE_ACCOUNT` · Valeur : **tout le contenu** du fichier JSON, collé tel quel |
| **cent-saisons-bugs** | Y poser les deux fichiers ci-dessus, aux chemins indiqués |
| **Console Firebase** → Firestore Database → Règles | Publier les règles de `firestore.rules` (elles contiennent désormais le bloc `pepins`) |

La clé de compte de service donne un accès complet au projet Firebase. Elle ne va **que** dans les secrets de ce
dépôt privé — jamais dans le dépôt du jeu, jamais dans le code du jeu.

---

## Vérifier que ça marche

1. Dans le jeu, **Options → Pépins et idées → Ouvrir**, envoyer un pépin d'essai.
   *(Il faut être connecté, même sans compte : en « Hors ligne seulement », le rapport est téléchargé au lieu de partir.)*
2. Dans `cent-saisons-bugs`, onglet **Actions → Relève des pépins → Run workflow**.
3. L'issue doit apparaître dans la minute, étiquetée `pépin` et par le chemin des tuiles choisies.
4. Dans la console Firestore, la collection `pepins` doit être **vide** : le rapport vit maintenant dans GitHub, et
   nulle part ailleurs.

---

## Ce qu'il faut savoir

**L'image est un lien, pas une vignette.** Dans un dépôt privé, GitHub n'affiche pas une image du dépôt directement
dans le corps d'une issue (l'affichage en ligne passe par un relais qui n'a pas ton accès). Le corps porte donc un
lien, à un clic. C'est le prix du dépôt privé, et il est modeste.

**Les workflows programmés s'endorment.** GitHub désactive le `schedule` d'un dépôt resté **soixante jours sans
activité**. Un dépôt de rapports peut très bien rester muet deux mois. Deux parades : la relève à la demande, qui
réveille tout, ou un commit de temps en temps. Si ça devient gênant, on ajoutera un commit mensuel au workflow.

**Un rapport n'est jamais perdu.** Le document Firestore n'est effacé **qu'après** la création de l'issue. Si GitHub
refuse, le rapport reste et repassera au tour suivant.

**Vingt rapports par passage.** Au-delà, ils attendent le passage d'après — c'est un garde-fou contre l'inondation,
pas une limite qu'on atteindra.

**Pour couper l'envoi**, côté jeu : `CLOUD.pepins = false` dans `src/data/firebase_config.js`, un commit, c'est fini.
Le jeu continue exactement comme avant, et les rapports sont téléchargés au lieu de partir.
