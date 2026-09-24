// Mesure du temps de chargement : Chromium en profil de téléphone, réseau bridé, cache vide, jusqu'au menu.
// Usage : node tools/mesure_chargement.js [port=8765 | https://127.0.0.1:8443] [--intro] [--reseau=4g|3g|fibre] [--json=fichier]
//   une adresse https vise tools/serveur_h2.js (HTTP/2 + gzip, comme GitHub Pages) ; un port, python3 -m http.server
//   --intro   : comme un vrai navigateur (le film d'ouverture joue) ; sans, comme les tests (pas de film)
// Le serveur statique doit tourner (python3 -m http.server <port>). Il ne compresse pas et parle HTTP/1.1 :
// le vrai site (GitHub Pages) fait mieux sur les petits fichiers ; les octets, eux, sont les mêmes.
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const args = process.argv.slice(2);
const port = args.find((a) => /^\d+$/.test(a)) || '8765';
const base = args.find((a) => a.startsWith('http')) || `http://127.0.0.1:${port}`;
const intro = args.includes('--intro');
const reseau = (args.find((a) => a.startsWith('--reseau=')) || '--reseau=4g').slice(9);
const json = (args.find((a) => a.startsWith('--json=')) || '').slice(7);
const RESEAUX = { '4g': { latency: 150, downloadThroughput: 9e6 / 8, uploadThroughput: 3e6 / 8 }, '3g': { latency: 300, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 }, fibre: { latency: 5, downloadThroughput: 100e6 / 8, uploadThroughput: 50e6 / 8 } };
(async () => {
  const b = await chromium.launch({ args: intro ? ['--disable-blink-features=AutomationControlled', '--autoplay-policy=no-user-gesture-required'] : [] });
  const ctx = await b.newContext({ ...devices['iPhone 12'], locale: 'fr-FR', ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...RESEAUX[reseau] });
  const fichiers = new Map();
  cdp.on('Network.responseReceived', (e) => fichiers.set(e.requestId, { url: e.response.url, octets: 0, type: e.type }));
  cdp.on('Network.loadingFinished', (e) => { const f = fichiers.get(e.requestId); if (f) f.octets = e.encodedDataLength; });
  const t0 = Date.now();
  await page.goto(`${base}/index.html`);
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
  const tBoot = Date.now() - t0;
  await page.waitForFunction(() => !document.getElementById('intro') && window.CS && window.CS.scenes && window.CS.scenes.currentName === 'menu', null, { timeout: 180000 });
  const tMenu = Date.now() - t0;
  await page.waitForTimeout(1500);   // ce qui se charge encore juste après le menu
  const liste = [...fichiers.values()].filter((f) => f.octets > 0);
  const parDossier = {};
  for (const f of liste) { const p = f.url.replace(/^.*?:\/\/[^/]+\//, ''); const d = p.split('/').slice(0, 2).join('/'); const e = parDossier[d] || (parDossier[d] = { fichiers: 0, ko: 0 }); e.fichiers++; e.ko += f.octets / 1024; }
  const total = liste.reduce((s, f) => s + f.octets, 0);
  console.log(`Réseau ${reseau}${intro ? ', avec le film' : ', sans film'} : chargement fini à ${(tBoot / 1000).toFixed(1)} s, menu à ${(tMenu / 1000).toFixed(1)} s — ${(total / 1048576).toFixed(2)} Mo, ${liste.length} fichiers`);
  for (const [d, e] of Object.entries(parDossier).sort((a, b) => b[1].ko - a[1].ko)) console.log(`  ${d.padEnd(22)} ${String(e.fichiers).padStart(4)} fichiers ${(e.ko / 1024).toFixed(2).padStart(6)} Mo`);
  console.log('  les plus gros :', liste.sort((a, b) => b.octets - a.octets).slice(0, 8).map((f) => `${f.url.split('/').slice(-2).join('/')} ${(f.octets / 1024).toFixed(0)} Ko`).join(' · '));
  if (json) fs.writeFileSync(json, JSON.stringify({ reseau, intro, tBoot, tMenu, total, fichiers: liste.length, parDossier }, null, 1));
  await b.close();
})().catch((e) => { console.error('ÉCHEC', e.message); process.exit(1); });
