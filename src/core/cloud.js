// Sauvegarde en ligne (Firebase). Deux règles absolues :
//   1. le jeu marche sans — hors ligne, quota épuisé, panne : on joue, et la sauvegarde locale fait foi ;
//   2. on écrit RAREMENT — jamais pendant une partie, jamais dans la boucle de rendu, jamais si rien n'a changé.
// Le SDK n'est chargé qu'au moment où l'on en a besoin, depuis le CDN de Google. `inject()` permet de le remplacer
// par un double, pour les tests.
import { FIREBASE_CONFIG, CLOUD } from '../data/firebase_config.js';

/** Empreinte courte et stable d'une chaîne (djb2), pour savoir si la sauvegarde a changé sans la comparer entière. */
export function hashOf(text) {
  let h = 5381; for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return `${h.toString(36)}.${text.length.toString(36)}`;
}

/** Compte les écritures du jour, sur l'appareil : un bogue ne peut pas vider le quota d'un coup. */
const DAY_KEY = 'cent-saisons.cloud.day';
function dayCount(add = 0) {
  const today = new Date().toISOString().slice(0, 10);
  let d = { day: today, n: 0 };
  try { const raw = localStorage.getItem(DAY_KEY); if (raw) d = JSON.parse(raw); } catch (_) { /* illisible : on repart de zéro */ }
  if (d.day !== today) d = { day: today, n: 0 };
  if (add) { d.n += add; try { localStorage.setItem(DAY_KEY, JSON.stringify(d)); } catch (_) { /* stockage plein */ } }
  return d.n;
}

/** Résumé d'une sauvegarde, pour comparer deux parties devant le joueur. */
export function summarize(data) {
  const c = (data && data.campaign) || {};
  const stars = Object.values(c.stars || {}).reduce((a, b) => a + b, 0);
  const gold = Object.values(c.gold || {}).filter(Boolean).length;
  return { stars, gold, islands: Math.max(0, (c.unlockedIsland || 1) - 1), played: c.islandsPlayed || 0, seeds: c.seedsTotal || 0 };
}
/** Laquelle des deux est la plus avancée ? Étoiles d'abord, puis îles jouées, puis graines. */
export function moreAdvanced(a, b) {
  const x = summarize(a), y = summarize(b);
  return (x.stars - y.stars) || (x.played - y.played) || (x.seeds - y.seeds);
}

/** Erreurs qui veulent dire « la fenêtre surgissante n'a pas pu s'ouvrir » : là, et seulement là, on redirige. */
const POPUP_FAILED = ['popup-blocked', 'operation-not-supported-in-this-environment', 'web-storage-unsupported', 'cancelled-popup-request'];

/** Le code d'erreur de Firebase, dit en français. Rend null quand il n'y a rien d'utile à dire. */
export function signInProblem(code) {
  const c = String(code || '');
  if (c.includes('unauthorized-domain')) return 'Ce site n’est pas encore autorisé côté Firebase (Authentication → Settings → Domaines autorisés).';
  if (c.includes('operation-not-allowed')) return 'La connexion Google n’est pas encore activée côté Firebase (Authentication → Sign-in method).';
  if (c.includes('popup-closed-by-user') || c.includes('user-cancelled')) return 'La fenêtre Google a été fermée avant la fin.';
  if (c.includes('network-request-failed')) return 'Le réseau n’a pas répondu.';
  if (c.includes('configuration-not-found') || c.includes('invalid-api-key')) return 'Le projet Firebase n’est pas encore configuré.';
  if (c === 'sdk') return 'Les services Google n’ont pas pu être chargés (réseau coupé, ou bloqueur de contenu).';
  if (!c || c === 'null' || c === 'undefined') return null;
  return `Détail technique : ${c}.`;
}

/** Ce que dit un refus de Firestore, en clair : c'est presque toujours l'une de ces quatre choses. */
export function firestoreProblem(code) {
  const c = String(code || '');
  if (c.includes('permission-denied')) return 'La base refuse l’accès : les règles de sécurité ne sont pas celles de firestore.rules, ou elles n’ont pas été publiées.';
  if (c.includes('not-found') || c.includes('NOT_FOUND')) return 'Aucune base Firestore trouvée dans ce projet, ou elle ne s’appelle pas « (default) » (une base nommée autrement n’est pas vue par le jeu).';
  if (c.includes('failed-precondition')) return 'La base Firestore n’est pas encore créée (Firestore Database → Créer une base de données).';
  if (c.includes('resource-exhausted')) return 'Le quota du jour est épuisé : la base se repose jusqu’à demain.';
  if (c.includes('unavailable')) return 'La base n’a pas répondu (réseau).';
  return `Détail technique : ${c}.`;
}

export const Cloud = {
  enabled: false,       // le joueur a choisi une connexion
  state: 'off',         // off | loading | ready | error | quota
  user: null,           // { uid, name, anonymous }
  error: null,
  sdk: null,            // { app, auth, db, fns… } une fois chargé
  _lastPush: 0, _lastHash: null, _session: 0, _skipped: 0, _reads: 0, _listeners: [],

  /** Pour les tests : remplace le chargeur du SDK. */
  inject(fake) { this.sdk = fake; },
  on(fn) { this._listeners.push(fn); return () => { const i = this._listeners.indexOf(fn); if (i >= 0) this._listeners.splice(i, 1); }; },
  emit() { for (const fn of this._listeners) { try { fn(this.status()); } catch (_) { /* un écouteur fautif ne casse rien */ } } },

  /** Ce qu'on peut montrer dans les Options et le mode test. */
  status() {
    return { enabled: this.enabled, state: this.state, user: this.user, error: this.error,
      writes: this._session, writesToday: dayCount(), skipped: this._skipped, reads: this._reads,
      budget: { session: CLOUD.maxPerSession, day: CLOUD.maxPerDay, interval: CLOUD.minIntervalMs } };
  },

  online() { return typeof navigator === 'undefined' || navigator.onLine !== false; },

  /** Charge le SDK (une seule fois). Retourne false si le réseau ou le CDN ne répond pas : le jeu continue. */
  async load() {
    if (this.sdk) return true;
    if (!this.online()) { this.state = 'off'; return false; }
    this.state = 'loading'; this.emit();
    try {
      const [app, auth, store] = await Promise.all([
        import(/* @vite-ignore */ `${CLOUD.sdk}/firebase-app.js`),
        import(/* @vite-ignore */ `${CLOUD.sdk}/firebase-auth.js`),
        import(/* @vite-ignore */ `${CLOUD.sdk}/firebase-firestore.js`),
      ]);
      const a = app.initializeApp(FIREBASE_CONFIG);
      this.sdk = { app: a, auth: auth.getAuth(a), db: store.getFirestore(a), A: auth, S: store };
      return true;
    } catch (e) {
      this.state = 'error'; this.error = 'sdk'; this.emit();
      console.warn('Firebase indisponible, le jeu continue en local', e);
      return false;
    }
  },

  _setUser(u) {
    this.user = u ? { uid: u.uid, name: u.displayName || null, anonymous: !!u.isAnonymous } : null;
    this.state = u ? 'ready' : 'off'; this.enabled = !!u; this.emit();
    return this.user;
  },

  /** Connexion sans compte. */
  async signInAnonymous() {
    if (!await this.load()) return null;
    try { const r = await this.sdk.A.signInAnonymously(this.sdk.auth); return this._setUser(r.user); }
    catch (e) { this.state = 'error'; this.error = String(e && e.code || e); this.emit(); return null; }
  },

  /**
   * Connexion Google. **La fenêtre surgissante d'abord, partout** : la redirection ne revient pas toujours quand le jeu
   * est servi depuis un autre domaine que Firebase (les navigateurs cloisonnent le stockage), et le joueur retombait
   * alors sur l'écran de connexion, encore et encore. La redirection ne sert plus que de secours, quand la fenêtre est
   * bloquée. `beforeRedirect` est appelé AVANT de quitter la page : c'est le seul moment où l'on peut encore écrire.
   * Si une partie anonyme existe déjà, on la RATTACHE au compte Google pour ne rien perdre.
   */
  async signInGoogle({ redirect = false, beforeRedirect = null } = {}) {
    if (!await this.load()) return null;
    const A = this.sdk.A; const provider = new A.GoogleAuthProvider();
    try { provider.setCustomParameters({ prompt: 'select_account' }); } catch (_) { /* double de test */ }
    const current = this.sdk.auth.currentUser;
    const goRedirect = async () => {
      if (beforeRedirect) { try { beforeRedirect(); } catch (_) { /* rien à faire : on part quand même */ } }
      if (current && current.isAnonymous) await A.linkWithRedirect(current, provider);
      else await A.signInWithRedirect(this.sdk.auth, provider);
      return 'redirect';
    };
    if (redirect) { try { return await goRedirect(); } catch (e) { this.state = 'error'; this.error = String((e && e.code) || e); this.emit(); return null; } }
    try {
      const r = current && current.isAnonymous
        ? await A.linkWithPopup(current, provider)
        : await A.signInWithPopup(this.sdk.auth, provider);
      return this._setUser(r.user);
    } catch (e) {
      const code = String((e && e.code) || e);
      // le compte Google porte déjà une partie : on ne peut pas rattacher, il faudra choisir (écran des deux parties)
      if (code.includes('credential-already-in-use') || code.includes('email-already-in-use')) {
        this.error = 'deux-parties';
        try { const cred = A.GoogleAuthProvider.credentialFromError(e); if (cred) { const r2 = await A.signInWithCredential(this.sdk.auth, cred); this._setUser(r2.user); return { conflict: true, user: this.user }; } } catch (_) { /* on retombe sur l'erreur */ }
      }
      // fenêtre bloquée ou impossible : la redirection prend le relais
      if (POPUP_FAILED.some((c) => code.includes(c))) { try { return await goRedirect(); } catch (e2) { this.state = 'error'; this.error = String((e2 && e2.code) || e2); this.emit(); return null; } }
      this.state = 'error'; this.error = code; this.emit(); return null;
    }
  },

  /** Au lancement : reprend la session en cours (ou le retour de redirection Google). */
  async resume() {
    if (!await this.load()) return null;
    const A = this.sdk.A;
    try { const r = await A.getRedirectResult(this.sdk.auth); if (r && r.user) return this._setUser(r.user); } catch (e) { this.error = String((e && e.code) || e); }
    return await new Promise((res) => {
      const stop = A.onAuthStateChanged(this.sdk.auth, (u) => { stop(); res(this._setUser(u)); });
      setTimeout(() => { try { stop(); } catch (_) {} res(this.user); }, CLOUD.timeoutMs);
    });
  },

  async signOut() {
    if (!this.sdk) return; try { await this.sdk.A.signOut(this.sdk.auth); } catch (_) { /* déjà déconnecté */ }
    this._setUser(null); this._lastHash = null;
  },

  _doc() { const { S, db } = this.sdk; return S.doc(db, CLOUD.collection, this.user.uid); },

  /** Une seule lecture, au lancement. Aucun écouteur temps réel : c'est la première cause d'explosion de quota. */
  async fetch() {
    if (!this.user || !this.sdk) return null;
    try {
      this._reads++;
      const snap = await this.sdk.S.getDoc(this._doc());
      if (!snap.exists()) return null;
      const d = snap.data();
      return d && d.save ? { data: JSON.parse(d.save), at: d.at || null, hash: d.hash || null } : null;
    } catch (e) { this.error = String((e && e.code) || e); this.emit(); return null; }
  },

  /** Pourquoi une écriture serait refusée — exposé pour les tests et le mode test. */
  why(text, { force = false } = {}) {
    if (!this.enabled || !this.user || !this.sdk) return 'hors-ligne';
    if (!this.online()) return 'hors-ligne';
    if (text.length > CLOUD.maxBytes) return 'trop-gros';
    const h = hashOf(text);
    if (!force && h === this._lastHash) return 'inchangé';
    if (this._session >= CLOUD.maxPerSession) return 'plafond-session';
    if (dayCount() >= CLOUD.maxPerDay) return 'plafond-jour';
    if (!force && Date.now() - this._lastPush < CLOUD.minIntervalMs) return 'trop-tôt';
    return null;
  },

  /**
   * Envoie la sauvegarde. Une écriture, une fiche, et seulement si toutes les conditions du budget sont réunies.
   * À n'appeler qu'à la fin d'une île, au retour au menu, ou sur demande explicite du joueur.
   */
  async push(data, { force = false } = {}) {
    const text = JSON.stringify(data);
    const no = this.why(text, { force });
    if (no) { this._skipped++; if (no === 'plafond-session' || no === 'plafond-jour') { this.state = 'quota'; this.emit(); } return { ok: false, reason: no }; }
    const h = hashOf(text);
    try {
      await this.sdk.S.setDoc(this._doc(), { save: text, hash: h, at: Date.now(), v: 2 });
      this._lastPush = Date.now(); this._lastHash = h; this._session++; dayCount(1);
      this.state = 'ready'; this.error = null; this.emit();
      return { ok: true, hash: h };
    } catch (e) {
      const code = String((e && e.code) || e);
      this.error = code; this.state = code.includes('resource-exhausted') ? 'quota' : 'error'; this.emit();
      return { ok: false, reason: code };
    }
  },

  /**
   * Vérification, point par point, de ce qui doit être en place côté Firebase. Une seule lecture, sur sa propre fiche :
   * les règles donnant lecture et écriture ensemble, une lecture qui passe prouve que l'écriture passera aussi.
   * Rend une liste de { label, ok, detail } à afficher telle quelle.
   */
  async diagnose() {
    const steps = []; const add = (label, ok, detail = null) => { steps.push({ label, ok, detail }); return ok; };
    if (!this.online()) { add('Réseau', false, 'L’appareil est hors ligne.'); return steps; }
    add('Réseau', true);

    if (!await this.load()) { add('Services Google (SDK Firebase)', false, 'Non chargés : bloqueur de contenu, réseau filtré, ou CDN injoignable.'); return steps; }
    add('Services Google (SDK Firebase)', true, `version ${CLOUD.sdk.split('/').pop()}`);
    add('Projet Firebase', true, `${FIREBASE_CONFIG.projectId} · ${FIREBASE_CONFIG.authDomain}`);

    if (!this.user) {
      add('Connexion', false, this.error ? (signInProblem(this.error) || String(this.error)) : 'Pas encore connecté : choisis une connexion, puis relance la vérification.');
      return steps;
    }
    add('Connexion', true, this.user.anonymous ? 'sans compte (anonyme)' : `Google${this.user.name ? ` · ${this.user.name}` : ''}`);

    try {
      this._reads++;
      const snap = await this.sdk.S.getDoc(this._doc());
      add('Base Firestore et règles', true, snap.exists() ? 'ta fiche est bien là' : 'aucune fiche pour l’instant : elle sera écrite à la fin de ta prochaine île');
    } catch (e) {
      add('Base Firestore et règles', false, firestoreProblem(String((e && e.code) || e)));
    }
    return steps;
  },

  /** Efface la fiche en ligne (bouton « Effacer mes données en ligne »). */
  async wipe() {
    if (!this.user || !this.sdk) return false;
    try { await this.sdk.S.deleteDoc(this._doc()); this._lastHash = null; return true; }
    catch (e) { this.error = String((e && e.code) || e); this.emit(); return false; }
  },
};
