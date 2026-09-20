// Portes de chapitre : un joueur qui décroche l'étoile manquante en refaisant une île déjà jouée doit passer.
// Reproduit le blocage signalé (bloqué à l'île 5 avec le compte pourtant atteint) et vérifie le rattrapage
// d'une sauvegarde déjà coincée. Usage : node tests/gate.js   (serveur statique sur http://127.0.0.1:8765/)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://127.0.0.1:8765/index.html';
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };
const boot = (p) => p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });

(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(URL); await boot(page);

  // la sauvegarde de quelqu'un qui est coincé : cinq îles réussies, six étoiles en poche, île 6 fermée
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}');
    s.cloud = { choice: 'none', uid: null, pending: null };
    s.options = Object.assign(s.options || {}, { testMode: false, skipTutorial: true, master: 0 });
    s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 5, stars: { 1: 1, 2: 2, 3: 1, 4: 1, 5: 1 }, seeds: 5, contracts: {} });
    s.version = 2;   // sans numéro de version, la sauvegarde passerait par la migration v1 → v2 qui remappe les îles
    localStorage.setItem('cent-saisons.save', JSON.stringify(s));
  });
  await page.reload(); await boot(page); await page.waitForTimeout(900);

  const up = await page.evaluate(() => window.CS.Save.campaign.unlockedIsland);
  check(up === 6, `sauvegarde coincée rattrapée au lancement : île ouverte = ${up} (6 attendu)`);
  const ecrit = await page.evaluate(() => JSON.parse(localStorage.getItem('cent-saisons.save')).campaign.unlockedIsland);
  check(ecrit === 6, 'le rattrapage est écrit dans la sauvegarde, pas seulement en mémoire');

  // l'île 6 est bien jouable depuis « Choisir une île »
  await page.evaluate(() => window.CS.Game.showMenu()); await page.waitForTimeout(600);
  await page.evaluate(() => [...document.querySelectorAll('.menu-nav .btn')].find((x) => x.textContent.startsWith('Choisir une île')).click());
  await page.waitForTimeout(600);
  const carte6 = await page.evaluate(() => { const c = [...document.querySelectorAll('.night-card')][5]; return { txt: c.textContent.slice(0, 20), verrou: c.disabled }; });
  check(!carte6.verrou, `l’île 6 est déverrouillée dans la liste (« ${carte6.txt} »)`);

  // un joueur à cinq étoiles reste bloqué, et le menu lui dit où il en est
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save'));
    s.campaign.unlockedIsland = 5; s.campaign.stars = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };
    s.version = 2;   // sans numéro de version, la sauvegarde passerait par la migration v1 → v2 qui remappe les îles
    localStorage.setItem('cent-saisons.save', JSON.stringify(s));
  });
  await page.reload(); await boot(page); await page.waitForTimeout(900);
  check(await page.evaluate(() => window.CS.Save.campaign.unlockedIsland) === 5, 'cinq étoiles : la porte tient toujours');
  await page.evaluate(() => [...document.querySelectorAll('.menu-nav .btn')].find((x) => x.textContent.startsWith('Choisir une île')).click());
  await page.waitForTimeout(600);
  const gate = await page.evaluate(() => { const g = document.querySelector('.act-gate'); return g ? g.textContent : null; });
  check(!!gate && /5 \/ 6/.test(gate), `le menu affiche le compte : « ${gate} »`);
  check(!!gate && /rejouer/i.test(gate), 'et dit qu’une île déjà faite peut être refaite');

  await b.close();
  console.log(errors.length ? `\n${errors.length} problème(s) :\n` + errors.join('\n') : '\nPortes de chapitre : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})();
