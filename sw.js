// Service worker de Cent Saisons : les visites suivantes se font depuis l'appareil.
//
// Deux règles, pas plus :
//   - assets/ (images, sons, film, polices) : le cache d'abord. Ces fichiers ne changent qu'avec une nouvelle version
//     des assets (assets/version.json, une empreinte de leur contenu écrite par tools/version_assets.py) : le cache porte
//     ce numéro dans son nom, et tout cache d'un autre numéro est effacé dès qu'on le voit changer. Pas de mise à jour
//     à la main, donc pas de vieille version servie par oubli — le piège classique du service worker.
//   - le code (index.html, src/, css/, ce fichier) : le réseau d'abord, le cache en secours. En ligne, on a toujours la
//     dernière version ; hors ligne, la dernière vue.
// Rien n'est préchargé : la première visite télécharge ce dont elle a besoin, comme avant, et le garde en passant.
const CODE = 'cent-saisons-code';
const PREFIXE_ASSETS = 'cent-saisons-assets-';
let versionAssets = null;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(rafraichirVersion().then(() => self.clients.claim())));

/** Lit la version des assets sur le réseau ; si elle a changé, efface les caches d'assets d'avant. */
async function rafraichirVersion() {
  try {
    const r = await fetch(new URL('assets/version.json', self.location.href), { cache: 'no-store' });
    if (!r.ok) return;
    const v = (await r.json()).assets; if (!v) return;
    versionAssets = v;
    for (const k of await caches.keys()) if (k.startsWith(PREFIXE_ASSETS) && k !== PREFIXE_ASSETS + v) await caches.delete(k);
  } catch (_) { /* hors ligne : on garde ce qu'on a */ }
}

async function assetCacheFirst(req) {
  if (!versionAssets) await rafraichirVersion();
  if (!versionAssets) return fetch(req);   // pas de version connue : pas de cache, on ne devine pas
  const cache = await caches.open(PREFIXE_ASSETS + versionAssets);
  const hit = await cache.match(req); if (hit) return hit;
  const r = await fetch(req);
  if (r.ok) cache.put(req, r.clone()).catch(() => {});
  return r;
}

async function codeNetworkFirst(req) {
  try {
    const r = await fetch(req);
    if (r.ok) (await caches.open(CODE)).put(req, r.clone()).catch(() => {});
    return r;
  } catch (e) {
    const hit = await caches.match(req);
    if (hit) return hit;
    throw e;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.headers.has('range')) return;   // lecture partielle du film : le navigateur s'en charge, on ne cache pas un morceau
  if (url.pathname.includes('/assets/')) {
    if (url.pathname.endsWith('/assets/version.json')) return;
    e.respondWith(assetCacheFirst(req));
    return;
  }
  if (req.mode === 'navigate') e.waitUntil(rafraichirVersion());   // chaque ouverture du jeu revérifie la version des assets
  e.respondWith(codeNetworkFirst(req));
});
