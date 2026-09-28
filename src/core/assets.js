// Chargeur d'images piloté par le manifeste assets/img/manifest.json.

const images = new Map();
let manifest = null;

export const Assets = {
  /** Charge le manifeste seul (les clés d'images sont alors connues, avant les images). Sans effet la seconde fois. */
  async loadManifest() {
    if (manifest) return manifest;
    const res = await fetch('assets/img/manifest.json');
    if (!res.ok) throw new Error('Manifeste images introuvable');
    manifest = await res.json();
    return manifest;
  },
  /** Les clés du manifeste (chargé ou non encore : vide avant `loadManifest`). */
  manifestKeys() { return manifest ? Object.keys(manifest.images) : []; },

  /**
   * Charge le manifeste puis toutes les images listées. `dabord` : des clés à charger avant toutes les autres ;
   * `onDabord` est appelé dès qu'elles sont là (l'ouverture du jeu bâtit son île pendant que le reste arrive).
   */
  async loadImages(onProgress = () => {}, { dabord = null, onDabord = null } = {}) {
    await this.loadManifest();
    // les entrées « lazy » (insignes des tampons) se chargent à la demande, au moment de tamponner : pas au démarrage
    let entries = Object.entries(manifest.images).filter(([, meta]) => !meta.lazy);
    if (dabord && dabord.size) entries = [...entries.filter(([k]) => dabord.has(k)), ...entries.filter(([k]) => !dabord.has(k))];
    const nDabord = dabord ? entries.filter(([k]) => dabord.has(k)).length : 0;
    let done = 0;
    const load = ([key, meta]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { images.set(key, img); done++; onProgress(done / entries.length, key); resolve(); };
      img.onerror = () => { console.warn(`Image manquante : ${meta.file}`); done++; onProgress(done / entries.length, key); resolve(); };
      img.src = `assets/img/${meta.file}`;
    });
    // Chargement par lots de 24 pour ne pas saturer le navigateur.
    for (let i = 0; i < entries.length; i += 24) {
      await Promise.all(entries.slice(i, i + 24).map(load));
      if (onDabord && nDabord && i + 24 >= nDabord) { const f = onDabord; onDabord = null; try { f(); } catch (e) { console.warn(e); } }
    }
  },

  /** Retourne l'image (ou null si absente). */
  img(key) { return images.get(key) || null; },
  has(key) { return images.has(key); },
  /** Toutes les clés qui commencent par un préfixe, triées. */
  keysStarting(prefix) { return [...images.keys()].filter((k) => k.startsWith(prefix)).sort(); },
  manifest() { return manifest; },
};
