// Le service worker : la seconde visite vient de l'appareil. Chromium sans drapeau d'automatisation (le jeu n'enregistre
// pas le service worker sous navigator.webdriver), première visite jusqu'au menu, puis rechargement : les assets
// doivent venir du service worker, et « Recharger à neuf » (Options) doit tout effacer.
// Usage : node tests/sw.js [port=8765]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const port = process.argv[2] || '8765';
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };
const boot = (p) => p.waitForFunction(() => !document.getElementById('boot') && !document.getElementById('intro'), null, { timeout: 90000 });
(async () => {
  const b = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable');
  let reponses = [];
  cdp.on('Network.responseReceived', (e) => reponses.push({ url: e.response.url, sw: !!e.response.fromServiceWorker, cache: !!e.response.fromDiskCache }));
  await page.goto(`http://127.0.0.1:${port}/index.html`); await boot(page);
  await page.evaluate(() => { const s = window.CS.Save; s.data.cloud = { choice: 'none' }; s.save(); });
  const ctrl = await page.evaluate(() => navigator.serviceWorker.ready.then(() => new Promise((r) => { if (navigator.serviceWorker.controller) return r(true); navigator.serviceWorker.addEventListener('controllerchange', () => r(true)); setTimeout(() => r(!!navigator.serviceWorker.controller), 8000); })));
  check(ctrl, 'le service worker est enregistré et contrôle la page après la première visite');
  const version = await page.evaluate(() => fetch('assets/version.json').then((r) => r.json()).then((v) => v.assets));
  const noms = await page.evaluate(() => caches.keys());
  check(noms.includes(`cent-saisons-assets-${version}`), `le cache des assets porte la version des assets (${version} ; caches : ${noms.join(', ')})`);
  // seconde visite
  reponses = []; const t0 = Date.now();
  await page.reload(); await boot(page);
  const dt = Date.now() - t0;
  const assets = reponses.filter((r) => r.url.includes('/assets/') && !r.url.endsWith('version.json'));
  const parSw = assets.filter((r) => r.sw).length;
  check(assets.length > 500 && parSw / assets.length > 0.95, `seconde visite : ${parSw} assets sur ${assets.length} viennent du service worker (menu en ${(dt / 1000).toFixed(1)} s)`);
  const code = reponses.filter((r) => /\/src\/|\/css\/|index\.html/.test(r.url));
  check(code.length > 20 && code.every((r) => r.sw), `le code passe aussi par le service worker, réseau d'abord (${code.length} fichiers)`);
  await page.waitForFunction(() => document.querySelector('.foot-right'), null, { timeout: 10000 });
  const pied = await page.evaluate(() => document.querySelector('.foot-right').textContent);
  check(pied.includes(version.slice(0, 6)), `le pied du menu affiche la version des assets (« ${pied} »)`);
  // « Recharger à neuf » efface tout
  await page.evaluate(() => window.CS.Game.showOptions()); await page.waitForTimeout(600);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Recharger à neuf')); b.click(); });
  await page.waitForTimeout(1500); await boot(page);
  const apres = await page.evaluate(async () => ({ caches: await caches.keys(), sw: (await navigator.serviceWorker.getRegistrations()).length }));
  check(apres.caches.length <= 2, `après « Recharger à neuf », les caches d'avant sont partis (restent : ${apres.caches.join(', ') || 'aucun'})`);
  await b.close();
  if (errors.length) { console.log(`\n${errors.length} problème(s) :\n${errors.join('\n')}`); process.exit(1); }
  console.log('Service worker : tout est bon.');
})().catch((e) => { console.error('Échec du test :', e.message); process.exit(1); });
