// L'entraînement du Souffle court dans le navigateur : depuis l'écran de préparation, six poses guidées sans chrono (la
// case qui brille, une pose ailleurs refusée), la carte du temps, puis douze poses à 8 s jusqu'au bilan — sans record.
// Usage : node tests/entrainement.js [port=8765]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'); const fs = require('fs');
const port = process.argv[2] || '8765';
const OUT = path.join(__dirname, 'output'); fs.mkdirSync(OUT, { recursive: true });
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };
const boot = (p) => p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/index.html`); await boot(page);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}'); s.cloud = { choice: 'none' }; s.options = Object.assign(s.options || {}, { master: 0 }); s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 7, islandsPlayed: 6 }); s.version = 3; localStorage.setItem('cent-saisons.save', JSON.stringify(s)); });
  await page.reload(); await boot(page); await page.waitForTimeout(600);
  await page.evaluate(() => [...document.querySelectorAll('.menu-nav .btn')].find((x) => x.textContent.includes('Souffle court')).click());
  await page.waitForFunction(() => document.querySelector('.panel-tempo'), null, { timeout: 15000 });
  await page.evaluate(() => [...document.querySelectorAll('.panel-tempo button')].find((x) => /entraîner/i.test(x.textContent)).click());
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' && window.CS.scenes.current.isl && window.CS.scenes.current.isl.def.entrainement && !window.CS.scenes.current.hold, null, { timeout: 30000 });
  await page.waitForTimeout(400);
  const posOf = (q, r) => page.evaluate(([q, r]) => { const sc = window.CS.scenes.current; const B = window.CS.BALANCE.hex; const w = { x: B.size * Math.sqrt(3) * (q + r / 2), y: B.size * 1.5 * r }; const s = sc.cam.toScreen(w.x, w.y); const st = window.CS.STAGE; const rc = document.getElementById('stage').getBoundingClientRect(); return { x: rc.left + s.x * (st.scale || 1), y: rc.top + s.y * (st.scale || 1) }; }, [q, r]);
  const etat = () => page.evaluate(() => { const sc = window.CS.scenes.current; return { poses: sc.isl.placements, restrict: sc.isl.restrict ? [...sc.isl.restrict] : null, carte: (sc.tutorial.current || { step: {} }).step.id, t: sc.tempo.t, attend: sc.tempo.attend, fige: document.querySelector('.tempo-chrono').classList.contains('fige'), pips: document.querySelectorAll('[data-ref=pips] i').length }; });
  // 1. la première case brille, le chrono attend ; une pose ailleurs est refusée
  const e0 = await etat();
  check(e0.carte === 'e1' && e0.restrict && e0.restrict.length === 1 && e0.restrict[0] === '1,0' && e0.attend && e0.fige && e0.pips === 0, `l'entraînement s'ouvre sur la première case guidée (${e0.restrict}), chrono en attente, sans pastilles de saison`);
  await page.screenshot({ path: path.join(OUT, 'entrainement-debut.png') });
  const ailleurs = await page.evaluate(() => { const sc = window.CS.scenes.current; return sc.isl.board.legalCells().find((c) => !sc.isl.restrict.has(`${c.q},${c.r}`)); });
  let p = await posOf(ailleurs.q, ailleurs.r); await page.mouse.click(p.x, p.y); await page.waitForTimeout(250);
  check((await etat()).poses === 0, 'une pose hors de la case qui brille est refusée');
  // 2. les six poses guidées, chacune sur sa case ; le temps ne bouge pas
  const t0 = (await etat()).t;
  for (let i = 0; i < 6; i++) { const e = await etat(); const [q, r] = e.restrict[0].split(',').map(Number); p = await posOf(q, r); await page.mouse.click(p.x, p.y); await page.waitForTimeout(350); }
  const e6 = await etat();
  check(e6.poses === 6 && Math.abs(e6.t - t0) < 0.05 && e6.carte === 'e7' && !e6.restrict, `six poses guidées sans que le temps bouge (${t0.toFixed(1)} → ${e6.t.toFixed(1)} s), puis la carte du temps`);
  const clos = await page.evaluate(() => window.CS.scenes.current.isl.board.closedRegions.size);
  check(clos >= 1, `la sixième pose ferme le hameau (${clos} région close)`);
  await page.screenshot({ path: path.join(OUT, 'entrainement-carte.png') });
  // 3. « Compris » : le temps part, à 8 s
  await page.evaluate(() => document.querySelector('.tuto-ok').click()); await page.waitForTimeout(900);
  const e7 = await etat();
  check(!e7.attend && !e7.fige && e7.t < 7.6 && e7.t > 6, `après la carte, le chrono court à 8 s (${e7.t.toFixed(2)} s)`);
  // 4. douze poses par le bot, jusqu'au bilan : entraînement, sans record
  let tours = 0;
  while (tours++ < 40) {
    const st = await page.evaluate(() => { const sc = window.CS.scenes.current; const isl = sc && sc.isl; if (!isl || isl.ended) return { ended: true }; let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } } if (!best) { isl.finish('full'); return { ended: true }; } isl.place(best.q, best.r); return { poses: isl.placements }; });
    if (st.ended) break; await page.waitForTimeout(120);
  }
  const fin = await page.evaluate(() => { const isl = window.CS.scenes.current.isl; return { ended: isl.ended, poses: isl.placements, lost: isl.stats.lost }; });
  check(fin.ended && fin.poses + fin.lost === 18, `l'entraînement s'arrête à dix-huit tuiles (${fin.poses} posées, ${fin.lost} perdue)`);
  await page.waitForFunction(() => { const sc = window.CS.scenes.current, f = sc && sc.finale; if (f && !f.done && f.phase !== 'carte') { f.skip(); f.skip(); } return window.CS.scenes.currentName === 'results' || document.querySelector('.carte-actions .btn-primary'); }, null, { timeout: 40000 });
  await page.evaluate(() => { const b = document.querySelector('.carte-actions .btn-primary'); if (b) b.click(); });
  await page.waitForFunction(() => document.querySelector('.panel-results'), null, { timeout: 30000 }); await page.waitForTimeout(500);
  const bilan = await page.evaluate(() => ({ txt: document.querySelector('.panel-results').textContent, bests: JSON.stringify(window.CS.Save.data.tempo.bests || {}), parties: window.CS.Save.data.tempo.parties || 0 }));
  check(/Entraînement/.test(bilan.txt) && bilan.bests === '{}' && bilan.parties === 0, `le bilan dit « Entraînement », aucun record ni partie comptée (${bilan.bests}, ${bilan.parties})`);
  await page.screenshot({ path: path.join(OUT, 'entrainement-bilan.png') });
  check(!pageErrors.length, `aucune erreur de page${pageErrors.length ? ` : ${pageErrors.slice(0, 3).join(' | ')}` : ''}`);
  // 5. au doigt : l'option « poser d'un seul toucher » pose au premier toucher ; sans elle, il en faut deux
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p2 = await ctx2.newPage();
  await p2.goto(`http://127.0.0.1:${port}/index.html`); await boot(p2);
  await p2.evaluate(() => { const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}'); s.cloud = { choice: 'none' }; s.options = Object.assign(s.options || {}, { master: 0, skipTutorial: true }); s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 7, islandsPlayed: 6 }); s.version = 3; localStorage.setItem('cent-saisons.save', JSON.stringify(s)); });
  await p2.reload(); await boot(p2); await p2.waitForTimeout(600);
  const joueAuDoigt = async (option) => {
    await p2.evaluate(() => [...document.querySelectorAll('.menu-nav .btn')].find((x) => x.textContent.includes('Souffle court')).click());
    await p2.waitForFunction(() => document.querySelector('.panel-tempo'), null, { timeout: 15000 });
    const aOption = await p2.evaluate((option) => { const c = document.querySelector('.tp-toucher input'); if (!c) return false; if (c.checked !== option) c.click(); document.querySelector('.tp-cadran[data-cadran="8"]').click(); [...document.querySelectorAll('.panel-tempo button')].find((x) => x.textContent.includes('parti')).click(); return true; }, option);
    await p2.waitForFunction(() => window.CS.scenes.currentName === 'island' && window.CS.scenes.current.isl && window.CS.scenes.current.isl.def.tempo && !window.CS.scenes.current.hold, null, { timeout: 30000 }); await p2.waitForTimeout(300);
    const pt = await p2.evaluate(() => { const sc = window.CS.scenes.current; const B = window.CS.BALANCE.hex; const c = sc.isl.board.legalCells().find((c) => sc.isl.canPlace(c.q, c.r)); const w = { x: B.size * Math.sqrt(3) * (c.q + c.r / 2), y: B.size * 1.5 * c.r }; const s = sc.cam.toScreen(w.x, w.y); const st = window.CS.STAGE; return { x: s.x * (st.scale || 1), y: s.y * (st.scale || 1) }; });
    await p2.touchscreen.tap(pt.x, pt.y); await p2.waitForTimeout(300);
    const poses = await p2.evaluate(() => window.CS.scenes.current.isl.placements);
    await p2.evaluate(() => { window.CS.scenes.current.isl.finish('full'); });
    await p2.waitForFunction(() => { const sc = window.CS.scenes.current, f = sc && sc.finale; if (f && !f.done && f.phase !== 'carte') { f.skip(); f.skip(); } return window.CS.scenes.currentName === 'results' || document.querySelector('.carte-actions .btn-primary'); }, null, { timeout: 40000 });
    await p2.evaluate(() => { const b = document.querySelector('.carte-actions .btn-primary'); if (b) b.click(); });
    await p2.waitForFunction(() => document.querySelector('.panel-results'), null, { timeout: 30000 });
    await p2.evaluate(() => document.querySelector('.panel-results .btn-ghost').click()); await p2.waitForFunction(() => window.CS.scenes.currentName === 'menu', null, { timeout: 15000 }); await p2.waitForTimeout(300);
    return { aOption, poses };
  };
  const sans = await joueAuDoigt(false); const avec = await joueAuDoigt(true);
  check(sans.aOption && sans.poses === 0 && avec.poses === 1, `au doigt : un toucher arme sans l'option (${sans.poses} pose), pose avec elle (${avec.poses} pose)`);
  // 6. le défi du jour, avec un objectif personnel : la même île pour tous, un record du jour à part, l'objectif jugé au bilan
  await p2.evaluate(() => [...document.querySelectorAll('.menu-nav .btn')].find((x) => x.textContent.includes('Souffle court')).click());
  await p2.waitForFunction(() => document.querySelector('.panel-tempo'), null, { timeout: 15000 });
  await p2.evaluate(() => { const sel = document.querySelector('.tp-objectif'); sel.value = 'pertes3'; sel.dispatchEvent(new Event('change')); [...document.querySelectorAll('.panel-tempo button')].find((x) => /Défi du jour/.test(x.textContent)).click(); });
  await p2.waitForFunction(() => window.CS.scenes.currentName === 'island' && window.CS.scenes.current.isl && window.CS.scenes.current.isl.def.defi && !window.CS.scenes.current.hold, null, { timeout: 30000 }); await p2.waitForTimeout(400);
  const defi = await p2.evaluate(() => { const d = window.CS.scenes.current.isl.def; const o = document.querySelector('.hud-objectif'); return { defi: d.defi, cadran: d.cadran, etire: d.etire, objectif: d.objectif, hudObjectif: o && !o.classList.contains('hidden') ? o.textContent : '' }; });
  const aujourdhui = await p2.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  check(defi.defi === aujourdhui && defi.cadran === 5 && defi.etire === 1 && defi.objectif === 'pertes3' && /trois tuiles perdues/.test(defi.hudObjectif), `le défi du jour ouvre l'île du ${defi.defi} à 5 s, forme fixe, objectif suivi dans le HUD (« ${defi.hudObjectif} »)`);
  // le bot joue le défi jusqu'au bout (une partie finie tôt laisse trop de cases vides pour un score positif)
  let nd = 0, scoreDefi = 0; while (nd++ < 400) { const st = await p2.evaluate(() => { const isl = window.CS.scenes.current.isl; if (!isl || isl.ended) return { ended: true, score: isl ? isl.score : 0 }; let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } } if (!best) { isl.finish('full'); return { ended: true, score: isl.score }; } isl.place(best.q, best.r); return { ended: false }; }); if (st.ended) { scoreDefi = st.score; break; } await p2.waitForTimeout(100); }
  await p2.waitForFunction(() => { const sc = window.CS.scenes.current, f = sc && sc.finale; if (f && !f.done && f.phase !== 'carte') { f.skip(); f.skip(); } return window.CS.scenes.currentName === 'results' || document.querySelector('.carte-actions .btn-primary'); }, null, { timeout: 40000 });
  await p2.evaluate(() => { const b = document.querySelector('.carte-actions .btn-primary'); if (b) b.click(); });
  await p2.waitForFunction(() => document.querySelector('.panel-results'), null, { timeout: 30000 }); await p2.waitForTimeout(300);
  const bilanDefi = await p2.evaluate(() => { const t = window.CS.Save.data.tempo; return { txt: document.querySelector('.panel-results').textContent, jour: JSON.stringify((t.defi || {}).best || {}), bests: JSON.stringify(t.bests || {}), score: window.CS.scenes.current && window.CS.scenes.current.result ? window.CS.scenes.current.result.score : null }; });
  const finalDefi = await p2.evaluate(() => { const r = window.CS.Save.data.tempo.defi.best; const k = Object.keys(r)[0]; return { k, v: r[k] }; });
  check(/défi du jour/i.test(bilanDefi.txt) && /Objectif/.test(bilanDefi.txt) && /atteint/.test(bilanDefi.txt) && finalDefi.k === aujourdhui && finalDefi.v === scoreDefi && scoreDefi > 0 && bilanDefi.bests === '{}', `bilan du défi : record du jour à part (${finalDefi.k} : ${finalDefi.v}), objectif atteint, les records par délai intacts (${bilanDefi.bests})`);
  await p2.screenshot({ path: path.join(OUT, 'defi-bilan.png') });
  await ctx2.close();
  await b.close();
  if (errors.length) { console.log(`\n${errors.length} problème(s) :\n${errors.join('\n')}`); process.exit(1); }
  console.log('L’entraînement du Souffle court : tout est bon.');
})().catch((e) => { console.error('Échec du test :', e.message); process.exit(1); });
