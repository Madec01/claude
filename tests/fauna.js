// Faune : chaque espèce a sa bande de profil rendue en 3D (marche calée sur le chemin parcouru,
// image retournée selon le sens), et les têtes rondes restent les portraits du HUD et du guide.
// Usage : node tests/fauna.js   (serveur statique sur http://127.0.0.1:8765/ requis)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://127.0.0.1:8765/index.html';
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };

(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(`[console] ${m.text()}`); });
  await page.goto(URL); await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}'); s.version = 2; s.cloud = { choice: 'none', uid: null, pending: null }; s.options = Object.assign(s.options || {}, { testMode: true, skipTutorial: true, master: 0 }); s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 20 }); localStorage.setItem('cent-saisons.save', JSON.stringify(s)); });
  await page.reload(); await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 }); await page.waitForTimeout(500);

  // --- 1. le manifeste : une bande par espèce, et la tête ronde conservée
  const man = await page.evaluate(async () => {
    const { SPECIES } = await import('/src/game/fauna.js');
    const { Assets } = await import('/src/core/assets.js');
    const imgs = Assets.manifest().images;
    return SPECIES.map((sp) => ({ sp, side: imgs[`fauna_${sp}_side`] || null, head: !!imgs[`fauna_${sp}`] }));
  });
  for (const e of man) {
    check(!!e.side && e.side.frames >= 1 && e.side.frame_w > 0 && e.side.frame_h > 0,
      `${e.sp} : bande de profil (${e.side ? `${e.side.frames} image(s) de ${e.side.frame_w}×${e.side.frame_h}` : 'ABSENTE'})`);
    check(e.head, `${e.sp} : la tête ronde reste disponible pour le HUD et le guide`);
  }
  const walkers = man.filter((e) => e.side && e.side.frames > 1).map((e) => e.sp);
  check(walkers.length >= 3, `au moins trois espèces ont un vrai cycle (${walkers.join(', ')})`);
  // la bande fait bien `frames` fois la largeur d'une image
  const widths = await page.evaluate(async (list) => {
    const { Assets } = await import('/src/core/assets.js');
    return list.map((sp) => {
      const m = Assets.manifest().images[`fauna_${sp}_side`];
      const img = Assets.img(`fauna_${sp}_side`);
      return { sp, ok: !!img && img.width === m.frame_w * m.frames && img.height === m.frame_h };
    });
  }, man.map((e) => e.sp));
  check(widths.every((w) => w.ok), `chaque bande mesure exactement frames × largeur (${widths.filter((w) => !w.ok).map((w) => w.sp).join(', ') || 'toutes bonnes'})`);

  // --- 2. en jeu : la marche suit le chemin parcouru, l'image se retourne avec le sens
  await page.evaluate(() => window.CS.Game.startIsland(4, { skipIntro: true }));
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' || [...document.querySelectorAll('button')].some((x) => x.textContent.includes('C’est parti')), null, { timeout: 20000 });
  await page.evaluate(() => { const x = [...document.querySelectorAll('button')].find((y) => y.textContent.includes('C’est parti')); if (x) x.click(); });
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island', null, { timeout: 20000 });
  await page.evaluate(() => { const isl = window.CS.scenes.current.isl; for (let k = 0; k < 40 && !isl.ended; k++) { if (isl.current && isl.current.work) { isl.toShed(); continue; } let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } } if (!best || !isl.place(best.q, best.r)) break; } });
  await page.waitForTimeout(1500);
  const fauna = await page.evaluate(() => [...window.CS.scenes.current.isl.fauna.entries()].map(([k, a]) => ({ k, sp: a.species })));
  check(fauna.length > 0, `de la faune est arrivée pendant l’essai (${fauna.map((f) => f.sp).join(', ') || 'aucune'})`);
  if (fauna.length) {
    const a = fauna[0];
    // on pousse l'animal vers la droite puis vers la gauche et on relève son état
    const right = await page.evaluate((k) => {
      const R = window.CS.scenes.current.renderer; const st = R.wander.get(k);
      st.tx = st.x + 400; st.ty = st.y; st.wait = 99; const before = st.walked || 0;
      for (let i = 0; i < 30; i++) R.wanderPos(k, window.CS.scenes.current.isl.fauna.get(k), 0.05);
      return { walked: st.walked - before, left: st.left };
    }, a.k);
    check(right.walked > 10, `${a.sp} : la distance parcourue s’accumule (${right.walked.toFixed(0)} px)`);
    check(right.left === false, `${a.sp} : en allant à droite, l’image n’est pas retournée`);
    const left = await page.evaluate((k) => {
      const R = window.CS.scenes.current.renderer; const st = R.wander.get(k);
      st.tx = st.x - 400; st.ty = st.y; st.wait = 99;
      for (let i = 0; i < 30; i++) R.wanderPos(k, window.CS.scenes.current.isl.fauna.get(k), 0.05);
      return { left: st.left };
    }, a.k);
    check(left.left === true, `${a.sp} : en allant à gauche, l’image est retournée`);
    // l'image du cycle dépend de la distance, pas de l'horloge : immobile, elle ne bouge pas
    const still = await page.evaluate((k) => {
      const R = window.CS.scenes.current.renderer; const st = R.wander.get(k);
      st.tx = st.x; st.ty = st.y; st.wait = 99;
      const w0 = st.walked;
      for (let i = 0; i < 30; i++) R.wanderPos(k, window.CS.scenes.current.isl.fauna.get(k), 0.05);
      return st.walked - w0;
    }, a.k);
    check(still === 0, `${a.sp} : à l’arrêt, le cycle ne tourne pas (${still} px)`);
  }

  // --- 3. le HUD montre toujours les têtes rondes
  const chips = await page.evaluate(() => [...document.querySelectorAll('.fauna-chip img')].map((i) => i.getAttribute('src')));
  if (chips.length) check(chips.every((s) => /fauna_[a-z]+\.png$/.test(s)), `les pastilles du HUD utilisent les têtes rondes (${chips.length})`);
  else console.log('—   aucune pastille de faune affichée pendant l’essai');

  await b.close();
  console.log(errors.length ? `\n${errors.length} problème(s) :\n` + errors.join('\n') : '\nFaune : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})();
