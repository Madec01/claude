// Portes de chapitre et déblocage : personne ne doit pouvoir être muré.
// Reproduit les deux blocages signalés — l'île 5 avec le compte d'étoiles pourtant atteint, puis l'île 9 sans
// étoile dessus — et vérifie que les sauvegardes déjà coincées se rattrapent au lancement.
// Usage : node tests/gate.js   (serveur statique sur http://127.0.0.1:8765/)
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
  check(!!gate && /8 parties/.test(gate), 'et donne la seconde clé, la patience');

  // --- le blocage signalé ensuite : une île terminée mais sans étoile. Elle ne doit plus murer personne.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save'));
    s.campaign.unlockedIsland = 9;
    s.campaign.stars = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 1, 7: 1, 8: 1 };   // chapitre 1 largement passé, île 9 jouée sans étoile
    s.campaign.plays = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 3 };
    s.version = 2;
    localStorage.setItem('cent-saisons.save', JSON.stringify(s));
  });
  await page.reload(); await boot(page); await page.waitForTimeout(900);
  const up9 = await page.evaluate(() => window.CS.Save.campaign.unlockedIsland);
  check(up9 === 10, `île 9 terminée sans étoile : l’île 10 s’ouvre (ouverte = ${up9})`);
  await page.evaluate(() => [...document.querySelectorAll('.menu-nav .btn')].find((x) => x.textContent.startsWith('Choisir une île')).click());
  await page.waitForTimeout(600);
  const carte10 = await page.evaluate(() => { const c = [...document.querySelectorAll('.night-card')][9]; return { txt: c.textContent.slice(0, 20), verrou: c.disabled }; });
  check(!carte10.verrou, `l’île 10 est jouable dans la liste (« ${carte10.txt} »)`);
  // et la carte verrouillée d'après dit pourquoi elle l'est
  const pourquoi = await page.evaluate(() => { const c = [...document.querySelectorAll('.night-card')][10]; return { verrou: c.disabled, titre: c.getAttribute('title') || '' }; });
  check(pourquoi.verrou && /étoiles|parties/.test(pourquoi.titre), `l’île 11 dit pourquoi elle est fermée (« ${pourquoi.titre.slice(0, 70)}… »)`);

  // --- la patience : les cinq îles du chapitre 2 terminées et huit parties en tout, sans le compte d'étoiles
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save'));
    s.campaign.unlockedIsland = 10;
    s.campaign.stars = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 };                       // rien du tout au chapitre 2
    s.campaign.plays = { 6: 2, 7: 2, 8: 2, 9: 1, 10: 1 };                      // cinq îles vues, huit parties
    s.version = 2;
    localStorage.setItem('cent-saisons.save', JSON.stringify(s));
  });
  await page.reload(); await boot(page); await page.waitForTimeout(900);
  const up11 = await page.evaluate(() => window.CS.Save.campaign.unlockedIsland);
  check(up11 === 11, `porte ouverte à la patience, sans une seule étoile au chapitre (ouverte = ${up11})`);

  // --- une échelle d'étoiles revue vaut pour les parties déjà jouées : le meilleur score rendu en étoiles au lancement
  const seuils = await page.evaluate(async () => { const m = await import('/src/data/campaign.js'); return m.islandThresholds(m.campaignIsland(7)); });
  await page.evaluate((th) => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save'));
    s.campaign.unlockedIsland = 8; s.campaign.stars = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 1, 7: 0 };
    s.campaign.best = { 7: th[1] };   // un score qui vaut deux étoiles sur l'échelle d'aujourd'hui
    s.campaign.plays = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1 }; s.campaign.gold = {};
    s.version = 2; localStorage.setItem('cent-saisons.save', JSON.stringify(s));
  }, seuils);
  await page.reload(); await boot(page); await page.waitForTimeout(900);
  const rat = await page.evaluate(() => ({ st: window.CS.Save.campaign.stars[7], ecrit: JSON.parse(localStorage.getItem('cent-saisons.save')).campaign.stars[7] }));
  check(rat.st === 2, `le meilleur score de l’île 7 lui rend ses étoiles au lancement (${rat.st})`);
  check(rat.ecrit === 2, 'et c’est écrit dans la sauvegarde');

  // --- en jeu : une île finie sans étoile compte quand même, et ne se relance plus toute seule
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save'));
    s.campaign.unlockedIsland = 9; s.campaign.stars = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 1, 7: 1, 8: 1 };
    s.campaign.plays = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 };
    s.options = Object.assign(s.options || {}, { testMode: false, skipTutorial: true, master: 0 });
    s.version = 2; localStorage.setItem('cent-saisons.save', JSON.stringify(s));
  });
  await page.reload(); await boot(page); await page.waitForTimeout(600);
  // seuils rendus inatteignables : la partie finira forcément à zéro étoile
  await page.evaluate(async () => { const m = await import('/src/data/campaign_stars.js'); m.CAMPAIGN_STARS[9] = [99, 99, 99, 99]; });
  await page.evaluate(() => window.CS.Game.startIsland(9, { skipIntro: true }));
  await page.waitForTimeout(800);
  // le contrat d'archipel est demandé à l'entrée du chapitre : on en signe un
  await page.evaluate(() => { const c = document.querySelector('.contract-card'); if (c) { c.click(); const go = [...document.querySelectorAll('.panel-contract button')].find((x) => x.textContent.includes('Signer')); if (go) go.click(); } });
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' || [...document.querySelectorAll('button')].some((x) => x.textContent.includes('C’est parti')), null, { timeout: 20000 });
  await page.evaluate(() => { const x = [...document.querySelectorAll('button')].find((y) => y.textContent.includes('C’est parti')); if (x) x.click(); });
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island', null, { timeout: 20000 });
  await page.evaluate(() => { const isl = window.CS.scenes.current.isl; for (let k = 0; k < 400 && !isl.ended; k++) { if (isl.current && isl.current.work) { isl.toShed(); continue; } let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } } if (!best || !isl.place(best.q, best.r)) { isl.checkEnd(); break; } } });
  await page.waitForFunction(() => document.querySelector('.panel-results'), null, { timeout: 40000 });
  const apres = await page.evaluate(() => ({ up: window.CS.Save.campaign.unlockedIsland, plays: window.CS.Save.campaign.plays[9] || 0, etoiles: window.CS.Save.campaign.stars[9] || 0, note: !!document.body.textContent.includes('la suivante s’ouvre quand même') }));
  check(apres.etoiles === 0, `l’île 9 a bien fini sans étoile (${apres.etoiles})`);
  check(apres.plays === 1, `la partie est comptée pour l’île (plays = ${apres.plays})`);
  check(apres.up === 10, `et l’île 10 s’ouvre malgré tout (ouverte = ${apres.up})`);
  check(apres.note, 'le bilan explique que la suivante s’ouvre quand même');
  await page.waitForTimeout(1500);   // le bilan s'installe (étoiles, graines) : on clique une fois la transition finie
  await page.evaluate(() => [...document.querySelectorAll('.panel-results button')].find((x) => x.textContent.includes('Continuer')).click());
  await page.waitForFunction(() => window.CS.scenes.currentName !== 'results', null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  const suite = await page.evaluate(() => ({ scene: window.CS.scenes.currentName, ile: window.CS.scenes.current && window.CS.scenes.current.isl ? window.CS.scenes.current.isl.def.id : null }));
  check(suite.scene !== 'results' && suite.scene !== 'island', `« Continuer » emmène ailleurs que sur l’île ratée (scène : ${suite.scene}${suite.ile ? `, île ${suite.ile}` : ''})`);

  await b.close();
  console.log(errors.length ? `\n${errors.length} problème(s) :\n` + errors.join('\n') : '\nPortes de chapitre : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})();
