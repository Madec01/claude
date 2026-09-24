// Chargeur d'images piloté par le manifeste assets/img/manifest.json.

const images = new Map();
let manifest = null;

export const Assets = {
  /** Charge le manifeste puis toutes les images listées. */
  async loadImages(onProgress = () => {}) {
    const res = await fetch('assets/img/manifest.json');
    if (!res.ok) throw new Error('Manifeste images introuvable');
    manifest = await res.json();
    // les entrées « lazy » (insignes des tampons) se chargent à la demande, au moment de tamponner : pas au démarrage
    const entries = Object.entries(manifest.images).filter(([, meta]) => !meta.lazy);
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
    }
  },

  /** Retourne l'image (ou null si absente). */
  img(key) { return images.get(key) || null; },
  has(key) { return images.has(key); },
  /** Toutes les clés qui commencent par un préfixe, triées. */
  keysStarting(prefix) { return [...images.keys()].filter((k) => k.startsWith(prefix)).sort(); },
  manifest() { return manifest; },
};
