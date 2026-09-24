// Lot « calme » : mode repos (après huit secondes sans geste, l'interface s'efface et la vue respire ; tout geste
// rétablit ; l'option le coupe) et vague de fermeture (les cases d'une région fermée s'allument de proche en proche).
// Usage : node tests/calm.js   (serveur statique sur http://127.0.0.1:8765/ requis)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://127.0.0.1:8765/index.html';
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };
const boot = (p) => p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });

async function start(ctx, island = 2) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(URL); await boot(page);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}'); s.version = 3; s.cloud = { choice: 'none', uid: null, pending: null }; s.options = Object.assign(s.options || {}, { testMode: true, skipTutorial: true, master: 0 }); s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 12 }); localStorage.setItem('cent-saisons.save', JSON.stringify(s)); });
  await page.reload(); await boot(page); await page.waitForTimeout(500);
  await page.evaluate((id) => window.CS.Game.startIsland(id, { skipIntro: true }), island);
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' || [...document.querySelectorAll('button')].some((x) => x.textContent.includes('C’est parti')), null, { timeout: 20000 });
  await page.evaluate(() => { const x = [...document.querySelectorAll('button')].find((y) => y.textContent.includes('C’est parti')); if (x) x.click(); });
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island', null, { timeout: 20000 }); await page.waitForTimeout(400);
  return page;
}
const state = (page) => page.evaluate(() => { const sc = window.CS.scenes.current; return { resting: document.getElementById('hud').classList.contains('resting'), wishesOpacity: +getComputedStyle(document.querySelector('.hud-wishes')).opacity, bAmp: sc.cam.bAmp, idle: window.CS.input.idleSeconds }; });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await start(ctx);

  // --- mode repos
  await page.mouse.move(640, 400); await page.waitForTimeout(300);
  let st = await state(page);
  check(!st.resting && st.bAmp === 0, `juste après un geste : pas de repos (idle ${st.idle.toFixed(1)} s)`);
  await page.waitForTimeout(9200);
  st = await state(page);
  check(st.resting, `après ${st.idle.toFixed(1)} s sans geste : mode repos`);
  await page.waitForTimeout(1800);   // la transition d'opacité prend 1,6 s
  st = await state(page);
  check(st.wishesOpacity < 0.5, `les vœux s'estompent (opacité ${st.wishesOpacity})`);
  check(st.bAmp > 0.15, `la vue respire (amplitude ${st.bAmp.toFixed(2)})`);
  // un geste rétablit tout, vite
  await page.mouse.move(660, 420); await page.waitForTimeout(500);
  st = await state(page);
  check(!st.resting, 'un geste : le repos cesse aussitôt');
  check(st.bAmp < 0.05, `la vue se pose (amplitude ${st.bAmp.toFixed(3)})`);
  await page.waitForTimeout(500);
  st = await state(page);
  check(st.wishesOpacity > 0.9, `les vœux reviennent (opacité ${st.wishesOpacity})`);
  // toScreen / toWorldPoint restent inverses l'un de l'autre, même en respirant
  const rt = await page.evaluate(() => { const cam = window.CS.scenes.current.cam; cam.breathe(1, 5); cam.breathe(1, 5); const p = cam.toScreen(123, -45); const w = cam.toWorldPoint(p.x, p.y); const err = Math.hypot(w.x - 123, w.y + 45); cam.breathe(0, 5); return { err, amp: cam.bAmp }; });
  check(rt.err < 1e-6, `toScreen et toWorldPoint restent inverses en respirant (écart ${rt.err.toExponential(1)})`);
  // l'option coupe le mode repos
  await page.evaluate(() => { window.CS.Save.options.rest = false; });
  await page.waitForTimeout(9200);
  st = await state(page);
  check(!st.resting && st.bAmp === 0, 'option « Mode repos » coupée : rien ne s’efface');
  await page.evaluate(() => { window.CS.Save.options.rest = true; });

  // --- vague de fermeture : on pose jusqu'à fermer une région, et on regarde l'onde émise
  // on cherche une fermeture d'au moins trois cases (une case seule ne fait pas de vague) ; à défaut on garde la dernière vue
  let ring = null, ended = false;
  for (let i = 0; i < 70 && !(ring && ring.n >= 3) && !ended; i++) {
    const r0 = await page.evaluate(() => { const sc = window.CS.scenes.current, isl = sc.isl; let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } } if (!best) return { end: true }; isl.place(best.q, best.r); return null; });
    if (r0 && r0.end) { ended = true; break; }
    // l'onde part 350 ms après la pose ; on relève la plus grande région fermée de cette pose
    for (let k = 0; k < 8; k++) { await page.waitForTimeout(100); const seen = await page.evaluate(() => { const rs = window.CS.scenes.current.fx.rings; if (!rs.length) return null; const r = rs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a)); return { n: r.cells.length, dmax: r.dmax, delays: r.cells.map((c) => +(c.d || 0).toFixed(3)).sort((a, b) => a - b) }; }); if (seen && (!ring || seen.n > ring.n)) ring = seen; if (ring && ring.n >= 3) break; }
  }
  check(!!ring, 'une région s’est fermée pendant l’essai');
  if (ring) {
    const distinct = new Set(ring.delays).size;
    check(ring.n === 1 ? ring.dmax === 0 : ring.dmax > 0, `l’onde porte des retards (${ring.n} cases, ${distinct} rangs, dernière à ${(ring.dmax * 1000).toFixed(0)} ms)`);
    check(ring.delays[0] === 0, 'la première case (celle posée) part sans retard');
    check(ring.dmax <= 8 * 0.055 + 1e-9, 'huit rangs au plus, le reste part ensemble');
  }
  await b.close();
  console.log(errors.length ? `\n${errors.length} problème(s) :\n` + errors.join('\n') : '\nCalme : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})();
