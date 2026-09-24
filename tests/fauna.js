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
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}'); s.version = 3; s.cloud = { choice: 'none', uid: null, pending: null }; s.options = Object.assign(s.options || {}, { testMode: true, skipTutorial: true, master: 0 }); s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 20 }); localStorage.setItem('cent-saisons.save', JSON.stringify(s)); });
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
  const fauna = await page.evaluate(async () => {
    const { FAUNA_PERCHED } = await import('/src/game/fauna.js');
    return [...window.CS.scenes.current.isl.fauna.entries()].map(([k, a]) => ({ k, sp: a.species, perche: FAUNA_PERCHED.has(a.species) }));
  });
  check(fauna.length > 0, `de la faune est arrivée pendant l’essai (${fauna.map((f) => f.sp).join(', ') || 'aucune'})`);
  // un perché ne se promène pas (voir plus bas) : il ne peut pas servir d’essai de marche
  const marcheur = fauna.find((f) => !f.perche);
  if (marcheur) {
    const a = marcheur;
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

  // --- 2 bis. le perché reste sur sa branche : son sprite la porte, donc rien ne doit le déplacer
  // ni le soulever, sous peine de voir la branche sautiller avec lui (pépin QC94).
  const perche = await page.evaluate(() => {
    const sc = window.CS.scenes.current; const R = sc.renderer; const k = 'owl@essai';
    sc.isl.fauna.set(k, { species: 'owl', q: 0, r: 0, regionId: 'essai' });
    const st = R.wanderPos(k, sc.isl.fauna.get(k), 0);
    const x0 = st.x, y0 = st.y, w0 = st.walked;
    st.tx = x0 + 400; st.ty = y0 + 300; st.wait = -1;                       // on l’appelle loin de sa case
    for (let i = 0; i < 30; i++) R.wanderPos(k, sc.isl.fauna.get(k), 0.05);
    const bouge = Math.abs(st.x - x0) + Math.abs(st.y - y0) + Math.abs(st.walked - w0);
    // la hauteur à laquelle il est dessiné ne doit dépendre ni de l’horloge ni du reste
    const ys = []; const calls = []; const t0 = R.time;
    const ctx = {
      globalAlpha: 1, fillStyle: '',
      save() {}, restore() {}, beginPath() {}, fill() {}, translate() {}, scale() {}, ellipse() {},
      drawImage(...a) { calls.push(a.length > 5 ? a[6] : a[2]); },
    };
    const idx = [...sc.isl.fauna.keys()].indexOf(k);
    for (const t of [0, 0.7, 1.4]) { R.time = t; calls.length = 0; R.drawFauna(ctx, 0); ys.push(calls[idx]); }
    R.time = t0; sc.isl.fauna.delete(k); R.wander.delete(k);
    return { bouge, ys };
  });
  check(perche.bouge === 0, `le hibou perché ne quitte pas sa case (${perche.bouge.toFixed(1)} px)`);
  check(perche.ys.length === 3 && perche.ys.every((y) => y === perche.ys[0]), `sa branche ne monte ni ne descend (y = ${perche.ys.join(', ')})`);

  // --- 3. l'ombre reste au sol : seul l'animal se soulève
  const geo = await page.evaluate(() => {
    const R = window.CS.scenes.current.renderer;
    const calls = { ell: [], img: [] };
    const ctx = {
      globalAlpha: 1, fillStyle: '',
      save() {}, restore() {}, beginPath() {}, fill() {}, translate() {}, scale() {},
      ellipse(x, y, rx, ry) { calls.ell.push({ x, y, rx, ry }); },
      drawImage(...a) { calls.img.push(a.length > 5 ? { x: a[5], y: a[6], w: a[7], h: a[8] } : { x: a[1], y: a[2], w: a[3], h: a[4] }); },
    };
    const take = (lift) => { calls.ell.length = 0; calls.img.length = 0; R.drawAnimal(ctx, 'cow', { walked: 0, left: false }, 100, 200, lift, 1, 1); return { ell: calls.ell[0], img: calls.img[0] }; };
    return { pose: take(0), saut: take(30) };
  });
  check(!!geo.pose.ell && Math.abs(geo.pose.ell.y - 200) < 0.01, `l’ombre est posée au point au sol (y = ${geo.pose.ell && geo.pose.ell.y})`);
  check(!!geo.saut.ell && Math.abs(geo.saut.ell.y - 200) < 0.01, `elle y reste quand l’animal saute (y = ${geo.saut.ell && geo.saut.ell.y})`);
  check(!!geo.pose.img && Math.abs((geo.pose.img.y + geo.pose.img.h) - 200) < 0.01, `posé, l’animal touche le sol (pieds à ${geo.pose.img && (geo.pose.img.y + geo.pose.img.h)})`);
  check(!!geo.saut.img && Math.abs(geo.saut.img.y - (geo.pose.img.y - 30)) < 0.01, 'en sautant, l’animal se soulève d’autant');
  check(geo.saut.ell.rx < geo.pose.ell.rx, `l’ombre rétrécit un peu pendant le saut (${geo.pose.ell.rx.toFixed(1)} → ${geo.saut.ell.rx.toFixed(1)})`);

  // --- 4. le HUD montre toujours les têtes rondes
  const chips = await page.evaluate(() => [...document.querySelectorAll('.fauna-chip img')].map((i) => i.getAttribute('src')));
  if (chips.length) check(chips.every((s) => /fauna_[a-z]+\.webp$/.test(s)), `les pastilles du HUD utilisent les têtes rondes (${chips.length})`);
  else console.log('—   aucune pastille de faune affichée pendant l’essai');

  await b.close();
  console.log(errors.length ? `\n${errors.length} problème(s) :\n` + errors.join('\n') : '\nFaune : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})();
