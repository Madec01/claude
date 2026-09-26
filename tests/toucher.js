// Au doigt : une case se vise d'un toucher et se pose au second. Tout appui AILLEURS (un bouton, la file, un glissé,
// une autre tuile du moment) oublie la case visée : le toucher suivant sur elle la vise de nouveau, sans poser.
// Retour du commanditaire : après « Défausser », un seul toucher sur la case déjà visée posait la tuile.
// Usage : node tests/toucher.js   (serveur statique sur http://127.0.0.1:8765/)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://127.0.0.1:8765/index.html';
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };
const boot = (p) => p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
  const page = await (await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(URL); await boot(page);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}'); s.cloud = { choice: 'none', uid: null, pending: null }; s.options = Object.assign(s.options || {}, { testMode: false, skipTutorial: true, master: 0 }); s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 8, stars: {}, plays: {}, islandsPlayed: 7, atelierVu: [], announced: ['mode_garden', 'mode_daily', 'mode_infinite', 'postcard', 'mode_tempo', 'mode_brume'] }); s.version = 3; localStorage.setItem('cent-saisons.save', JSON.stringify(s)); });
  await page.reload(); await boot(page); await page.waitForTimeout(500);
  await page.evaluate(() => window.CS.Game.startIsland(7, { skipIntro: true }));   // souffles et main de saison ouverts
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' || [...document.querySelectorAll('button')].some((x) => x.textContent.includes('C’est parti')), null, { timeout: 25000 });
  await page.evaluate(() => { const x = [...document.querySelectorAll('button')].find((y) => y.textContent.includes('C’est parti')); if (x) x.click(); });
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island', null, { timeout: 25000 });
  await page.waitForTimeout(2500);   // la caméra se pose
  // une case libre au centre de l'écran, loin des panneaux ; des souffles pour défausser
  const cible = await page.evaluate(async () => {
    const { toWorld } = await import('/src/game/hex.js');
    const sc = window.CS.scenes.current, isl = sc.isl; isl.breaths = 6; sc.tutorial && sc.tutorial.hide && sc.tutorial.hide();
    const rect = document.getElementById('game').getBoundingClientRect(), k = rect.width / window.CS.STAGE.W;
    const ecran = (c) => { const w = toWorld(c.q, c.r); const s = sc.cam.toScreen(w.x, w.y); return { x: rect.left + s.x * k, y: rect.top + s.y * k }; };
    const cs = isl.board.legalCells().map((c) => ({ c, p: ecran(c) })).sort((a, b) => Math.hypot(a.p.x - rect.width / 2, a.p.y - rect.height * 0.42) - Math.hypot(b.p.x - rect.width / 2, b.p.y - rect.height * 0.42));
    return { c: cs[0].c, p: cs[0].p, autre: cs[3].c, pa: cs[3].p };
  });
  const etat = () => page.evaluate(() => { const sc = window.CS.scenes.current; return { armed: sc.armed ? `${sc.armed.q},${sc.armed.r}` : null, poses: sc.isl.placements }; });
  const toucher = async (p) => { await page.touchscreen.tap(p.x, p.y); await page.waitForTimeout(250); };
  const vise = `${cible.c.q},${cible.c.r}`;

  // 1. toucher, défausser, toucher : on vise de nouveau, on ne pose pas
  const e0 = await etat();
  await toucher(cible.p);
  let e = await etat(); check(e.armed === vise && e.poses === e0.poses, `premier toucher : la case est visée, rien n'est posé (${JSON.stringify(e)})`);
  await page.tap('[data-ref="pwDiscard"]'); await page.waitForTimeout(250);
  e = await etat(); check(e.armed === null, `« Défausser » oublie la case visée (${JSON.stringify(e)})`);
  await toucher(cible.p);
  e = await etat(); check(e.armed === vise && e.poses === e0.poses, `toucher de nouveau la même case la vise, sans poser (${JSON.stringify(e)})`);
  await toucher(cible.p);
  e = await etat(); check(e.poses === e0.poses + 1 && e.armed === null, `le second toucher pose (${JSON.stringify(e)})`);

  // 2. un appui sur la file (la main) oublie aussi la case visée
  const cible2 = await page.evaluate(async () => {
    const { toWorld } = await import('/src/game/hex.js'); const sc = window.CS.scenes.current, isl = sc.isl;
    const rect = document.getElementById('game').getBoundingClientRect(), k = rect.width / window.CS.STAGE.W;
    const c = isl.board.legalCells().map((c) => { const w = toWorld(c.q, c.r); const s = sc.cam.toScreen(w.x, w.y); return { c, p: { x: rect.left + s.x * k, y: rect.top + s.y * k } }; }).sort((a, b) => Math.hypot(a.p.x - rect.width / 2, a.p.y - rect.height * 0.42) - Math.hypot(b.p.x - rect.width / 2, b.p.y - rect.height * 0.42))[0];
    return c;
  });
  const p1 = (await etat()).poses;
  await toucher(cible2.p);
  e = await etat(); check(e.armed === `${cible2.c.q},${cible2.c.r}`, 'une autre case visée');
  await page.tap('.queue-list .qtile.current'); await page.waitForTimeout(250);
  e = await etat(); check(e.armed === null, `un appui sur la file oublie la case visée (${JSON.stringify(e)})`);
  await toucher(cible2.p);
  e = await etat(); check(e.poses === p1 && e.armed !== null, `et le toucher suivant vise sans poser (${JSON.stringify(e)})`);

  // 3. « Poser ici » garde la case visée et pose
  await page.tap('.hud-place'); await page.waitForTimeout(300);
  e = await etat(); check(e.poses === p1 + 1, `« Poser ici » pose la case visée (${JSON.stringify(e)})`);

  // 4. un glissé sur l'île oublie la case visée
  const cible3 = await page.evaluate(async () => {
    const { toWorld } = await import('/src/game/hex.js'); const sc = window.CS.scenes.current, isl = sc.isl;
    const rect = document.getElementById('game').getBoundingClientRect(), k = rect.width / window.CS.STAGE.W;
    return isl.board.legalCells().map((c) => { const w = toWorld(c.q, c.r); const s = sc.cam.toScreen(w.x, w.y); return { c, p: { x: rect.left + s.x * k, y: rect.top + s.y * k } }; }).sort((a, b) => Math.hypot(a.p.x - rect.width / 2, a.p.y - rect.height * 0.42) - Math.hypot(b.p.x - rect.width / 2, b.p.y - rect.height * 0.42))[0];
  });
  await toucher(cible3.p);
  const cdp = await page.context().newCDPSession(page);
  const pt = (x, y) => [{ x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(200, 400) });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(200 + i * 8, 400) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(250);
  e = await etat(); check(e.armed === null, `un glissé sur l'île oublie la case visée (${JSON.stringify(e)})`);

  await b.close();
  console.log(errors.length ? `\n${errors.length} problème(s) :\n` + errors.join('\n') : '\nToucher : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})();
