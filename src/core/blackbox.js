// La boîte noire : les trois dernières erreurs du jeu, gardées en mémoire ET sur l'appareil.
//
// Pourquoi la copie locale : une erreur qui tue l'onglet ne peut pas être racontée depuis la page morte. Au
// lancement suivant, on la relit et le jeu propose une fois de la raconter. Sans ça, les pires pépins — ceux qui
// coupent la partie — ne sont jamais signalés.
//
// Deux règles absolues : elle n'avale pas l'erreur (le navigateur la voit comme avant), et elle n'écrit jamais en
// ligne d'elle-même. Le joueur seul décide d'envoyer.

const KEY = 'cent-saisons.pepin';
const MAX = 3;                       // trois erreurs suffisent : au-delà, c'est la première qui compte
const MAX_AGE_MS = 14 * 24 * 3600 * 1000;
const PILE_LINES = 4;

const shortStack = (stack) => String(stack || '').split('\n').slice(0, PILE_LINES + 1).slice(1).map((l) => l.trim()).join(' | ').slice(0, 600);

export const BlackBox = {
  errors: [],          // celles de la session en cours
  scene: () => null,   // rendu par main.js : le nom de la scène du moment
  _ignored: 0,

  /** Pose les écoutes. À appeler une fois, au plus tôt. `sceneName` dit où l'on était. */
  install({ sceneName = () => null } = {}) {
    if (this._installed) return; this._installed = true;
    this.scene = sceneName;
    window.addEventListener('error', (e) => {
      // une image ou un son qui manque n'est pas une erreur de code : Assets les signale déjà, et elles
      // rempliraient la boîte pour rien
      if (e && e.target && e.target !== window) return;
      this.note({ message: e.message, source: e.filename, ligne: e.lineno, colonne: e.colno, pile: shortStack(e.error && e.error.stack) });
    });
    window.addEventListener('unhandledrejection', (e) => {
      const r = e && e.reason;
      this.note({ message: r && r.message ? r.message : String(r), source: '(promesse)', pile: shortStack(r && r.stack) });
    });
  },

  /** Range une erreur. La même, répétée en boucle, ne compte qu'une fois. */
  note(err) {
    const e = {
      message: String(err.message || 'erreur inconnue').slice(0, 400),
      source: String(err.source || '').split('/').pop().slice(0, 120) || null,
      ligne: err.ligne || null, colonne: err.colonne || null,
      pile: err.pile || null,
      scene: (() => { try { return this.scene(); } catch (_) { return null; } })(),
      quand: new Date().toISOString(),
    };
    const meme = (a, b) => a.message === b.message && a.ligne === b.ligne && a.source === b.source;
    if (this.errors.some((x) => meme(x, e))) { this._ignored++; return e; }
    this.errors.push(e); if (this.errors.length > MAX) this.errors.shift();
    this._persist();
    return e;
  },

  _persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, at: Date.now(), errors: this.errors, seen: 0 })); }
    catch (_) { /* stockage plein ou refusé : la boîte vit alors le temps de la session, c'est déjà ça */ }
  },

  /** Ce qui attend d'être raconté : les erreurs de cette session, ou celles laissées par la précédente. */
  pending() {
    if (this.errors.length) return this.errors;
    const d = this._read();
    return d ? d.errors : [];
  },

  /** Vrai s'il y a une erreur d'une session PRÉCÉDENTE à proposer (c'est elle qui déclenche la bannière). */
  fromLastTime() {
    if (this.errors.length) return null;
    const d = this._read();
    if (!d || !d.errors || !d.errors.length) return null;
    if (d.seen >= 2) return null;       // proposée deux fois sans réponse : on n'insiste plus
    return d.errors;
  },

  /** La bannière a été montrée : au troisième lancement, on se tait. */
  noteShown() {
    const d = this._read(); if (!d) return;
    d.seen = (d.seen || 0) + 1;
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (_) { /* rien à faire */ }
  },

  /** Le pépin est parti : la boîte se vide. */
  clear() { this.errors = []; try { localStorage.removeItem(KEY); } catch (_) { /* rien à faire */ } },

  _read() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || d.v !== 1 || !Array.isArray(d.errors)) { this.clear(); return null; }
      if (Date.now() - (d.at || 0) > MAX_AGE_MS) { this.clear(); return null; }
      return d;
    } catch (_) { this.clear(); return null; }
  },
};
