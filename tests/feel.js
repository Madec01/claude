// Retours sensoriels : notes sobres sur téléphone (toutes sur ordinateur), étoile franchie annoncée quand le compteur
// affiché passe le seuil, vibration à la fermeture (jamais à la simple pose), hauteur du son de pose qui varie.
// Usage : node tests/feel.js   (serveur statique sur http://127.0.0.1:8765/ requis)
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://127.0.0.1:8765/index.html';
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };
const boot = (p) => p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });

async function start(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(URL); await boot(page);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}'); s.version = 3; s.cloud = { choice: 'none', uid: null, pending: null }; s.options = Object.assign(s.options || {}, { testMode: true, skipTutorial: true, master: 0 }); s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 12 }); localStorage.setItem('cent-saisons.save', JSON.stringify(s)); });
  await page.reload(); await boot(page); await page.waitForTimeout(500);
  // espions : sons joués et vibrations demandées
  await page.evaluate(() => {
    window.__plays = []; const A = window.CS.AudioSys; const orig = A.play.bind(A); A.play = (k, o) => { window.__plays.push({ k, o: o || {} }); return orig(k, o); };
    window.__vibes = []; Object.defineProperty(navigator, 'vibrate', { value: (p) => { window.__vibes.push(p); return true; }, configurable: true });
  });
  await page.evaluate(() => window.CS.Game.startIsland(2, { skipIntro: true }));
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' || [...document.querySelectorAll('button')].some((x) => x.textContent.includes('C’est parti')), null, { timeout: 20000 });
  await page.evaluate(() => { const x = [...document.querySelectorAll('button')].find((y) => y.textContent.includes('C’est parti')); if (x) x.click(); });
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island', null, { timeout: 20000 }); await page.waitForTimeout(400);
  return page;
}
// pose gloutonne : la meilleure case pour la tuile du moment ; rend le total du coup
const placeBest = (page) => page.evaluate(() => { const isl = window.CS.scenes.current.isl; let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } } if (!best) return null; const before = window.__plays.length; isl.place(best.q, best.r); return { total: bs, from: before, closes: (isl.board.closedRegions || new Set()).size }; });
const notesSince = (page, from) => page.evaluate((from) => window.__plays.slice(from).filter((p) => /^point_\d$/.test(p.k)).length, from);

(async () => {
  const b = await chromium.launch();
  // --- ordinateur : toutes les notes, hauteur qui varie
  let ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); let page = await start(ctx);
  const rates = new Set(); let maxNotes = 0, bigMove = 0;
  for (let i = 0; i < 12; i++) { const r = await placeBest(page); if (!r) break; await page.waitForTimeout(700); const n = await notesSince(page, r.from); if (r.total > bigMove) { bigMove = r.total; maxNotes = n; } const rs = await page.evaluate((from) => window.__plays.slice(from).filter((p) => /^tile_place_/.test(p.k)).map((p) => p.o.rate), r.from); rs.forEach((x) => rates.add(x)); }
  check(maxNotes === Math.min(8, bigMove), `ordinateur : toutes les notes (${maxNotes} notes pour un coup à +${bigMove})`);
  check(rates.size >= 3, `la hauteur du son de pose varie d’une pose à l’autre (${rates.size} valeurs sur 12 poses)`);
  // pas de vibration à la simple pose
  const vibesPlace = await page.evaluate(() => window.__vibes.length);
  const closes = await page.evaluate(() => (window.CS.scenes.current.isl.board.closedRegions || new Set()).size);
  if (closes === 0) check(vibesPlace === 0, 'aucune vibration à la simple pose'); else check(vibesPlace <= closes, `vibrations ≤ fermetures (${vibesPlace} pour ${closes})`);
  // l'étoile franchie : le seuil est jugé sur le compteur AFFICHÉ, qui rattrape le vrai score en quelques images
  const th = await page.evaluate(() => window.CS.scenes.current.isl.thresholds[0]);
  const before = await page.evaluate(() => window.__plays.filter((p) => p.k === 'star_1').length);
  await page.evaluate((th) => { window.CS.scenes.current.isl.score = th + 1; }, th);
  let seen = { pop: false, rib: false, play: false };
  for (let k = 0; k < 45 && !(seen.pop && seen.play && seen.rib); k++) {   // le ruban peut attendre derrière le verdict du coup
    await page.waitForTimeout(80);
    const st = await page.evaluate((before) => ({ pop: document.querySelector('.hud-stars').classList.contains('pop'), rib: /Première étoile/.test(document.body.textContent), play: window.__plays.filter((p) => p.k === 'star_1').length > before }), before);
    seen = { pop: seen.pop || st.pop, rib: seen.rib || st.rib, play: seen.play || st.play };
  }
  check(seen.play, `première étoile : la note sonne en passant ${th} points`);
  check(seen.pop, 'première étoile : l’icône enfle');
  check(seen.rib, 'première étoile : le ruban le dit');
  // et pas deux fois : le compteur reste au-dessus, rien ne se rejoue
  const again = await page.evaluate(() => window.__plays.filter((p) => p.k === 'star_1').length);
  await page.waitForTimeout(600);
  check((await page.evaluate(() => window.__plays.filter((p) => p.k === 'star_1').length)) === again, 'l’étoile n’est annoncée qu’une fois');
  await ctx.close();

  // --- téléphone : notes sobres par défaut, vibration à la fermeture
  ctx = await b.newContext({ ...devices['Pixel 7'] }); page = await start(ctx);
  let worst = 0, bigT = 0;
  for (let i = 0; i < 14; i++) { const r = await placeBest(page); if (!r) break; await page.waitForTimeout(600); const n = await notesSince(page, r.from); if (n > worst) worst = n; if (r.total > bigT) bigT = r.total; }
  check(worst <= 4, `téléphone : notes sobres (au plus ${worst} notes, meilleur coup +${bigT})`);
  const st = await page.evaluate(() => ({ vibes: window.__vibes, closes: (window.CS.scenes.current.isl.board.closedRegions || new Set()).size }));
  if (st.closes > 0) check(st.vibes.length >= 1 && st.vibes.length <= st.closes + 2, `téléphone : vibration à la fermeture (${st.vibes.length} pour ${st.closes} fermeture(s))`);
  else check(st.vibes.length === 0, 'téléphone : pas de fermeture, pas de vibration');
  // l'option coupe les vibrations
  await page.evaluate(() => { window.CS.Save.options.haptics = false; window.__vibes = []; });
  for (let i = 0; i < 30; i++) { const r = await placeBest(page); if (!r) break; }
  await page.waitForTimeout(900);
  check((await page.evaluate(() => window.__vibes.length)) === 0, 'option « Vibrations » désactivée : plus aucune vibration');
  await ctx.close();
  await b.close();
  console.log(errors.length ? `\n${errors.length} problème(s) :\n` + errors.join('\n') : '\nRetours sensoriels : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})();
