// Les règles de sécurité Firestore, jouées pour de vrai dans l'émulateur Firebase.
// Elles ne sont pas du code du jeu : personne ne les exécute pendant le développement, et une règle fausse ne se voit
// qu'en production, sous la forme d'un « permission-denied » incompréhensible. D'où ce test.
//
// Prérequis (hors du jeu, jamais chargés par le navigateur) :
//   mkdir -p /tmp/fb && cd /tmp/fb && npm i firebase-tools@13 @firebase/rules-unit-testing@3 firebase
//   cp <dépôt>/firestore.rules . && cp <dépôt>/tests/firestore_rules.mjs .
//   echo '{"firestore":{"rules":"firestore.rules"},"emulators":{"firestore":{"port":8181},"ui":{"enabled":false}}}' > firebase.json
//   ./node_modules/.bin/firebase emulators:exec --project demo-cent-saisons "node firestore_rules.mjs"
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

let failures = 0;
const passe = async (p) => { try { await p; return true; } catch (_) { return false; } };
const check = (ok, msg) => { console.log(`${ok ? 'OK ' : 'KO '} ${msg}`); if (!ok) failures++; };

const env = await initializeTestEnvironment({
  projectId: 'demo-cent-saisons',
  firestore: { host: '127.0.0.1', port: 8181, rules: fs.readFileSync('firestore.rules', 'utf8') },
});

const moi = env.authenticatedContext('martin').firestore();
const autre = env.authenticatedContext('quelquun-dautre').firestore();
const anonyme = env.unauthenticatedContext().firestore();
const fiche = (save = JSON.stringify({ campagne: 'x' })) => ({ save, hash: 'abc', at: Date.now(), v: 2 });
const maFiche = (db) => doc(db, 'parties/martin');

// --- ce que le jeu doit pouvoir faire
// (le piège : `request.resource` n'existe que pour une création ou une modification ; sur une lecture ou un
//  effacement il vaut null, et une condition qui s'y réfère refuse tout. C'est exactement ce qui était arrivé.)
check(await passe(setDoc(maFiche(moi), fiche())), 'un joueur écrit sa fiche');
check(await passe(getDoc(maFiche(moi))), 'un joueur RELIT sa fiche (lecture au lancement)');
check(await passe(setDoc(maFiche(moi), fiche(JSON.stringify({ campagne: 'y' })))), 'un joueur remplace sa fiche');
check(await passe(deleteDoc(maFiche(moi))), 'un joueur EFFACE sa fiche (bouton « effacer mes données en ligne »)');
check(await passe(getDoc(maFiche(moi))), 'lire une fiche qui n’existe pas est permis (première partie)');

// --- ce que personne ne doit pouvoir faire
await setDoc(maFiche(moi), fiche());
check(!await passe(getDoc(maFiche(autre))), 'un autre joueur ne lit pas ma fiche');
check(!await passe(setDoc(maFiche(autre), fiche())), 'un autre joueur n’écrit pas dans ma fiche');
check(!await passe(deleteDoc(maFiche(autre))), 'un autre joueur n’efface pas ma fiche');
check(!await passe(getDoc(maFiche(anonyme))), 'sans être connecté, on ne lit rien');
check(!await passe(setDoc(maFiche(anonyme), fiche())), 'sans être connecté, on n’écrit rien');
check(!await passe(getDocs(collection(moi, 'parties'))), 'personne ne liste toutes les parties');
check(!await passe(setDoc(doc(moi, 'autre_chose/x'), { a: 1 })), 'rien n’est écrit hors de la collection « parties »');
check(!await passe(getDoc(doc(moi, 'autre_chose/x'))), 'rien n’est lu hors de la collection « parties »');

// --- garde-fou de taille (la sauvegarde doit rester petite)
check(!await passe(setDoc(maFiche(moi), fiche('x'.repeat(200001)))), 'une fiche de plus de 200 Ko est refusée');
check(await passe(setDoc(maFiche(moi), fiche('x'.repeat(150000)))), 'une fiche de 150 Ko passe');
check(!await passe(setDoc(maFiche(moi), { save: 42, hash: 'a', at: 1, v: 2 })), 'une fiche dont la sauvegarde n’est pas du texte est refusée');

// --- le tableau des états : lisible par tous, écrit par personne.
// C'est le seul document public du projet. Il l'est parce qu'il ne contient que des codes et des états ; la
// règle doit donc surtout garantir qu'aucun joueur ne peut y écrire — sans quoi n'importe qui annoncerait à
// n'importe qui que son pépin est corrigé. Seule la relève écrit, par le SDK d'administration, hors règles.
const tableau = (db) => doc(db, 'etats/tableau');
await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'etats/tableau'), { AB12: 'corrige' }));
check(await passe(getDoc(tableau(anonyme))), 'le tableau des états se lit SANS être connecté');
check(await passe(getDoc(tableau(moi))), 'et connecté aussi');
check(await passe(getDoc(doc(anonyme, 'etats/pas-la'))), 'lire un tableau qui n’existe pas est permis');
check(!await passe(setDoc(tableau(moi), { AB12: 'corrige' })), 'un joueur connecté n’écrit pas dans le tableau');
check(!await passe(setDoc(tableau(anonyme), { AB12: 'corrige' })), 'un anonyme non plus');
check(!await passe(deleteDoc(tableau(moi))), 'et personne ne l’efface');

await env.cleanup();
console.log(failures ? `\n${failures} échec(s)` : '\nRègles Firestore : tout est bon.');
process.exit(failures ? 1 : 0);
