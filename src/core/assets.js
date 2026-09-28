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
   * Charge le manifeste puis toutes les images listées. `etapes` : des paliers `{ cles, fait }` chargés dans l'ordre,
   * avant tout le reste ; `fait` est appelé dès que les clés du palier sont là (l'ouverture du jeu montre la mer dès le
   * premier palier, fait tomber les tuiles d'une saison dès que ses images sont arrivées, et le reste vient derrière).
   */
  async loadImages(onProgress = () => {}, { etapes = [] } = {}) {
    await this.loadManifest();
    // les entrées « lazy » (insignes des tampons) se chargent à la demande, au moment de tamponner : pas au démarrage
    const toutes = Object.entries(manifest.images).filter(([, meta]) => !meta.lazy);
    let entries = [], vues = new Set(); const seuils = [];
    for (const e of etapes) { for (const x of toutes) if (e.cles.has(x[0]) && !vues.has(x[0])) { vues.add(x[0]); entries.push(x); } seuils.push({ n: entries.length, fait: e.fait }); }
    for (const x of toutes) if (!vues.has(x[0])) entries.push(x);
    let done = 0;
    const load = ([key, meta]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { images.set(key, img); done++; onProgress(done / entries.length, key); resolve(); };
      img.onerror = () => { console.warn(`Image manquante : ${meta.file}`); done++; onProgress(done / entries.length, key); resolve(); };
      img.src = `assets/img/${meta.file}`;
    });
    // Chargement par lots de 24 pour ne pas saturer le navigateur ; un lot s'arrête sur la frontière d'un palier
    const franchir = (i) => { while (seuils.length && i >= seuils[0].n) { const f = seuils.shift().fait; if (f) { try { f(); } catch (e) { console.warn(e); } } } };
    franchir(0);
    let i = 0;
    while (i < entries.length) {
      const fin = Math.min(entries.length, i + 24, seuils.length ? seuils[0].n : Infinity);
      await Promise.all(entries.slice(i, fin).map(load)); i = fin;
      franchir(i);
    }
  },

  /** Retourne l'image (ou null si absente). */
  img(key) { return images.get(key) || null; },
  has(key) { return images.has(key); },
  /** Toutes les clés qui commencent par un préfixe, triées. */
  keysStarting(prefix) { return [...images.keys()].filter((k) => k.startsWith(prefix)).sort(); },
  manifest() { return manifest; },
};
