// Tests de la sauvegarde en ligne, avec un faux SDK : aucune connexion réseau, aucune écriture dans la vraie base.
// Ce qui est vérifié ici, c'est la frugalité : quand le jeu écrit, et surtout quand il refuse d'écrire.
import { Cloud, hashOf, summarize, moreAdvanced, signInProblem } from '../src/core/cloud.js';
import { CLOUD } from '../src/data/firebase_config.js';

let failures = 0;
const check = (cond, label) => { if (!cond) { failures++; console.log(`ÉCHEC : ${label}`); } };

// --- stockage local minimal (le compteur du jour s'en sert)
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
let online = true;
Object.defineProperty(globalThis, 'navigator', { value: { get onLine() { return online; } }, configurable: true });

// --- faux SDK
function fakeSdk() {
  const docs = new Map(); const calls = { set: 0, get: 0, del: 0, redirect: 0, popup: 0 };
  const auth = { currentUser: null };   // le vrai SDK tient l'utilisateur courant : le double aussi
  const sdk = {
    docs, calls, auth, db: {},
    A: {
      signInAnonymously: async () => { auth.currentUser = { uid: 'anon-1', isAnonymous: true, displayName: null }; return { user: auth.currentUser }; },
      GoogleAuthProvider: class { static credentialFromError() { return null; } },
      signInWithPopup: async () => { calls.popup++; auth.currentUser = { uid: 'g-1', isAnonymous: false, displayName: 'Martin' }; return { user: auth.currentUser }; },
      linkWithPopup: async (u) => { calls.popup++; auth.currentUser = { uid: u.uid, isAnonymous: false, displayName: 'Martin' }; return { user: auth.currentUser }; },
      signInWithRedirect: async () => { calls.redirect++; },
      linkWithRedirect: async () => { calls.redirect++; },
      signOut: async () => { auth.currentUser = null; },
      onAuthStateChanged: (a, fn) => { fn(null); return () => {}; },
      getRedirectResult: async () => null,
    },
    S: {
      doc: (db, coll, uid) => `${coll}/${uid}`,
      getDoc: async (ref) => { calls.get++; const d = docs.get(ref); return { exists: () => !!d, data: () => d }; },
      setDoc: async (ref, d) => { calls.set++; docs.set(ref, d); },
      deleteDoc: async (ref) => { calls.del++; docs.delete(ref); },
    },
  };
  return sdk;
}
const reset = (sdk) => { Cloud.sdk = sdk; Cloud.user = null; Cloud.enabled = false; Cloud.state = 'off'; Cloud.error = null; Cloud._lastPush = 0; Cloud._lastHash = null; Cloud._session = 0; Cloud._skipped = 0; Cloud._reads = 0; store.clear(); };

const save = (n) => ({ version: 2, campaign: { stars: { 1: n }, gold: {}, unlockedIsland: n, islandsPlayed: n, seedsTotal: n } });

(async () => {
  // --- empreinte et comparaison
  check(hashOf('abc') === hashOf('abc') && hashOf('abc') !== hashOf('abd'), 'l’empreinte est stable et distingue deux textes');
  check(summarize(save(3)).stars === 3, 'le résumé compte les étoiles');
  check(moreAdvanced(save(5), save(2)) > 0 && moreAdvanced(save(2), save(5)) < 0, 'on sait laquelle des deux parties est la plus avancée');

  // --- connexions
  let sdk = fakeSdk(); reset(sdk);
  let u = await Cloud.signInAnonymous();
  check(u && u.uid === 'anon-1' && u.anonymous && Cloud.enabled, 'connexion sans compte');
  u = await Cloud.signInGoogle();
  check(u && u.name === 'Martin' && !u.anonymous && u.uid === 'anon-1', 'Google rattache la partie anonyme : même identifiant, la partie est gardée');
  check(sdk.calls.popup === 1 && sdk.calls.redirect === 0, 'Google passe par la fenêtre surgissante, pas par une redirection');

  // --- fenêtre bloquée : la redirection prend le relais, et le choix est noté AVANT de quitter la page
  // (le bogue : la page partait chez Google avant que le choix ne soit écrit, et le joueur retombait sur l'écran de connexion en boucle)
  sdk = fakeSdk(); reset(sdk);
  sdk.A.signInWithPopup = async () => { const e = new Error('blocked'); e.code = 'auth/popup-blocked'; throw e; };
  let order = [];
  sdk.A.signInWithRedirect = async () => { order.push('redirection'); sdk.calls.redirect++; };
  let r0 = await Cloud.signInGoogle({ beforeRedirect: () => order.push('choix noté') });
  check(r0 === 'redirect', 'fenêtre bloquée : on redirige');
  check(order.join(' → ') === 'choix noté → redirection', `le choix est noté avant de quitter la page (${order.join(' → ')})`);

  // --- fenêtre fermée par le joueur : on ne redirige PAS, on le dit
  sdk = fakeSdk(); reset(sdk);
  sdk.A.signInWithPopup = async () => { const e = new Error('closed'); e.code = 'auth/popup-closed-by-user'; throw e; };
  sdk.A.signInWithRedirect = async () => { sdk.calls.redirect++; };
  check(await Cloud.signInGoogle() === null && sdk.calls.redirect === 0, 'fenêtre fermée par le joueur : pas de redirection dans son dos');
  check(signInProblem(Cloud.error) === 'La fenêtre Google a été fermée avant la fin.', 'l’erreur est dite en français');
  check(/Domaines autorisés/.test(signInProblem('auth/unauthorized-domain')), 'le domaine non autorisé est expliqué');
  check(/Sign-in method/.test(signInProblem('auth/operation-not-allowed')), 'la connexion Google non activée est expliquée');
  check(signInProblem(null) === null, 'sans code d’erreur, rien à dire');

  // --- la première écriture passe, la deuxième est refusée (trop tôt, et rien n'a changé)
  sdk = fakeSdk(); reset(sdk); await Cloud.signInAnonymous();
  let r = await Cloud.push(save(1));
  check(r.ok && sdk.calls.set === 1, `une écriture au premier envoi (${sdk.calls.set})`);
  r = await Cloud.push(save(1));
  check(!r.ok && r.reason === 'inchangé' && sdk.calls.set === 1, `rien n’a changé : aucune écriture (${r.reason})`);
  r = await Cloud.push(save(2));
  check(!r.ok && r.reason === 'trop-tôt' && sdk.calls.set === 1, `trente secondes minimum entre deux écritures (${r.reason})`);
  r = await Cloud.push(save(2), { force: true });
  check(r.ok && sdk.calls.set === 2, 'une demande explicite passe outre le délai');

  // --- cent tentatives d'affilée n'écrivent pas cent fois
  sdk = fakeSdk(); reset(sdk); await Cloud.signInAnonymous();
  for (let i = 0; i < 100; i++) await Cloud.push(save(i));
  check(sdk.calls.set === 1, `cent tentatives en rafale : une seule écriture (${sdk.calls.set})`);

  // --- le plafond de session
  sdk = fakeSdk(); reset(sdk); await Cloud.signInAnonymous();
  for (let i = 0; i < CLOUD.maxPerSession + 5; i++) await Cloud.push(save(i), { force: true });
  check(sdk.calls.set === CLOUD.maxPerSession, `plafond de session tenu (${sdk.calls.set} = ${CLOUD.maxPerSession})`);
  check(Cloud.state === 'quota', 'le nuage se met en silence au plafond');

  // --- le plafond du jour, qui survit au rechargement de la page
  sdk = fakeSdk(); reset(sdk); await Cloud.signInAnonymous();
  store.set('cent-saisons.cloud.day', JSON.stringify({ day: new Date().toISOString().slice(0, 10), n: CLOUD.maxPerDay }));
  r = await Cloud.push(save(9), { force: true });
  check(!r.ok && r.reason === 'plafond-jour' && sdk.calls.set === 0, `plafond du jour tenu (${r.reason})`);

  // --- hors ligne, et fiche trop grosse
  sdk = fakeSdk(); reset(sdk); await Cloud.signInAnonymous();
  online = false;
  r = await Cloud.push(save(3), { force: true });
  check(!r.ok && r.reason === 'hors-ligne' && sdk.calls.set === 0, 'hors ligne : on n’écrit pas, et le jeu continue');
  online = true;
  r = await Cloud.push({ gros: 'x'.repeat(CLOUD.maxBytes + 10) }, { force: true });
  check(!r.ok && r.reason === 'trop-gros' && sdk.calls.set === 0, 'une fiche trop grosse n’est pas envoyée');

  // --- lecture : une seule, et relecture de ce qui a été écrit
  sdk = fakeSdk(); reset(sdk); await Cloud.signInAnonymous();
  check(await Cloud.fetch() === null && sdk.calls.get === 1, 'première lecture : aucune partie en ligne');
  await Cloud.push(save(4), { force: true });
  const got = await Cloud.fetch();
  check(got && got.data.campaign.stars[1] === 4 && sdk.calls.get === 2, 'on relit ce qu’on a écrit');
  check(Cloud._reads === 2, `les lectures sont comptées (${Cloud._reads})`);

  // --- une panne du serveur ne casse rien
  sdk = fakeSdk(); reset(sdk); await Cloud.signInAnonymous();
  sdk.S.setDoc = async () => { const e = new Error('nope'); e.code = 'resource-exhausted'; throw e; };
  r = await Cloud.push(save(1), { force: true });
  check(!r.ok && Cloud.state === 'quota', 'quota épuisé côté serveur : le nuage se tait, sans exception');

  // --- effacement
  sdk = fakeSdk(); reset(sdk); await Cloud.signInAnonymous();
  await Cloud.push(save(1), { force: true });
  check(await Cloud.wipe() === true && sdk.calls.del === 1 && sdk.docs.size === 0, 'effacer ses données en ligne');

  // --- déconnexion
  await Cloud.signOut();
  check(!Cloud.user && !Cloud.enabled, 'déconnexion');

  console.log(failures ? `${failures} échec(s)` : 'Tous les tests du nuage passent.');
  process.exit(failures ? 1 : 0);
})();
