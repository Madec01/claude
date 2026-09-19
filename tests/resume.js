// Reprise d'une partie laissée en plan, dans un vrai navigateur : on joue quinze tuiles, l'onglet passe en arrière-plan,
// on recharge la page, on reprend depuis le menu et on vérifie que rien n'a bougé (plateau, score, saison, tuiles à venir).
// Usage : node tests/resume.js   (serveur statique sur http://127.0.0.1:8765/ requis)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://127.0.0.1:8765/index.html';
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(`[console] ${m.text()}`); });
  await page.goto(URL); await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}');
    s.cloud = { choice: 'none' }; s.options = Object.assign(s.options || {}, { skipTutorial: true, master: 0 });
    s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 12, seeds: 9 });
    localStorage.setItem('cent-saisons.save', JSON.stringify(s));
  });
  await page.reload(); await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 }); await page.waitForTimeout(600);

  // pas de partie en cours au départ : pas de bouton « Reprendre »
  check(!(await page.evaluate(() => [...document.querySelectorAll('.menu-nav .btn')].some((x) => x.textContent.startsWith('Reprendre')))), 'menu propre : aucun bouton Reprendre au départ');

  // on démarre l'île 9 et on pose quinze tuiles
  await page.evaluate(() => window.CS.Game.startIsland(9, { skipIntro: true }));
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' || document.querySelector('.panel-contract') || [...document.querySelectorAll('button')].some((x) => x.textContent.includes('C’est parti')), null, { timeout: 20000 });
  if (await page.$('.panel-contract')) {   // contrat d'archipel à l'entrée d'un chapitre
    await page.evaluate(() => document.querySelector('.panel-contract').querySelector('button').click());
    await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Signer'))?.click());
    await page.waitForTimeout(600);
  }
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' || [...document.querySelectorAll('button')].some((x) => x.textContent.includes('C’est parti')), null, { timeout: 20000 });
  await page.evaluate(() => { const x = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('C’est parti')); if (x) x.click(); });
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island', null, { timeout: 20000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const isl = window.CS.scenes.current.isl;
    for (let n = 0; n < 15 && !isl.ended; n++) {
      let best = null, bs = -Infinity;
      for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } }
      if (!best) break; if (!isl.place(best.q, best.r)) break;
    }
  });
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => { const i = window.CS.scenes.current.isl; return { score: i.score, placements: i.placements, season: i.season, inSeason: i.inSeason, breaths: i.breaths, tiles: [...i.board.tiles.values()].map((t) => `${t.q},${t.r},${t.family},${t.level || 1}`).sort().join('|'), queue: i.queue.list.map((t) => t.family).join('|') }; });
  check(before.placements >= 12, `quinze tuiles posées (${before.placements}), score ${before.score}`);

  // l'onglet passe en arrière-plan : la partie doit être rangée tout de suite
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(200);
  const stored = await page.evaluate(() => localStorage.getItem('cent-saisons.run'));
  check(!!stored, `la partie est rangée sur l’appareil (${stored ? Math.round(stored.length / 1024) : 0} Ko)`);

  // on quitte l'application et on revient
  await page.reload(); await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 }); await page.waitForTimeout(700);
  const label = await page.evaluate(() => { const b = [...document.querySelectorAll('.menu-nav .btn')].find((x) => x.textContent.startsWith('Reprendre')); return b ? b.textContent : null; });
  check(!!label, `le menu propose de reprendre : « ${label} »`);
  check(!!label && /tuiles/.test(label), 'le bouton dit combien de tuiles sont posées');

  await page.evaluate(() => [...document.querySelectorAll('.menu-nav .btn')].find((x) => x.textContent.startsWith('Reprendre')).click());
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island', null, { timeout: 20000 });
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => { const i = window.CS.scenes.current.isl; return { score: i.score, placements: i.placements, season: i.season, inSeason: i.inSeason, breaths: i.breaths, tiles: [...i.board.tiles.values()].map((t) => `${t.q},${t.r},${t.family},${t.level || 1}`).sort().join('|'), queue: i.queue.list.map((t) => t.family).join('|'), id: i.def.id }; });
  check(after.id === 9, 'on est bien revenu sur l’île 9');
  check(after.score === before.score, `même score (${after.score} vs ${before.score})`);
  check(after.placements === before.placements, `mêmes poses (${after.placements})`);
  check(after.season === before.season && after.inSeason === before.inSeason, `même saison (${after.season} ${after.inSeason})`);
  check(after.breaths === before.breaths, 'mêmes souffles');
  check(after.tiles === before.tiles, 'plateau identique');
  check(after.queue === before.queue, 'mêmes tuiles à venir');
  check(!(await page.evaluate(() => !!document.querySelector('.panel-wishes-intro'))), 'l’écran des vœux ne revient pas');

  // on va jusqu'au bout : une fois l'île finie, il n'y a plus rien à reprendre
  await page.evaluate(() => { const i = window.CS.scenes.current.isl; i.finish('test'); });
  await page.waitForTimeout(500);
  check(!(await page.evaluate(() => localStorage.getItem('cent-saisons.run'))), 'une île terminée ne laisse plus de partie en cours');

  await b.close();
  console.log(errors.length ? `\n${errors.length} problème(s) :\n` + errors.join('\n') : '\nReprise navigateur : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})();
