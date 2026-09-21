// Joue une île jusqu'au bout avec le bot de calibrage, puis capture le PAYSAGE SEUL :
// ni interface, ni points volants, ni étincelles, ni liserés. Sert à juger le rendu final d'une île.
//
// Usage : node tools/capture_partie.js <n° d'île> <fichier de sortie> [--saison <s>]
// Il faut un serveur statique sur http://127.0.0.1:8765/ (python3 -m http.server 8765).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ILE = Number(process.argv[2] || 30);
const OUT = process.argv[3] || 'tests/output/ile-finie.png';
const iS = process.argv.indexOf('--saison');
const SAISON = iS > 0 ? process.argv[iS + 1] : null;

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 })).newPage();
  const boot = (p) => p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto('http://127.0.0.1:8765/index.html'); await boot(page);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}');
    s.version = 2; s.cloud = { choice: 'none', uid: null, pending: null };
    s.options = Object.assign(s.options || {}, { testMode: true, skipTutorial: true, master: 0 });
    s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 50 });
    localStorage.setItem('cent-saisons.save', JSON.stringify(s));
  });
  await page.reload(); await boot(page); await page.waitForTimeout(500);
  await page.evaluate((n) => window.CS.Game.startIsland(n, { skipIntro: true }), ILE);
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(600);
    const pret = await page.evaluate(() => {
      if (window.CS.scenes.currentName === 'island') return true;
      const c = document.querySelector('.contract-card');
      if (c) { c.click(); const go = [...document.querySelectorAll('.panel-contract button')].find((x) => x.textContent.includes('Signer')); if (go) go.click(); return false; }
      const p = [...document.querySelectorAll('button')].find((y) => /C’est parti|Continuer|Suivant/.test(y.textContent));
      if (p) p.click();
      return false;
    });
    if (pret) break;
  }
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island', null, { timeout: 30000 });
  // la partie se joue hors écran avec le bot des tests (ouvrages, vœux, souffles, fermetures),
  // puis on verse l'île finie dans la scène affichée
  const bilan = await page.evaluate(async ([n, saison]) => {
    const { playStrong } = await import('/tests/bot.js');
    const out = playStrong(window.CS.campaignIsland(n), {});
    const sc = window.CS.scenes.current;
    sc.isl.restoreRun(out.isl.serialize());
    if (saison) sc.isl.season = saison;
    sc.isl.board.touch();
    if (sc.renderer && sc.renderer.rebuildDecor) sc.renderer.rebuildDecor();
    return { score: out.result.score, etoiles: out.result.stars, cases: sc.isl.board.tiles.size, saison: sc.isl.season };
  }, [ILE, SAISON]);
  console.log('partie :', JSON.stringify(bilan));
  await page.waitForTimeout(1000);
  // le paysage seul
  await page.evaluate(async () => {
    const { toWorld } = await import('/src/game/hex.js');
    const R = window.CS.scenes.current.renderer;
    for (const f of ['drawBuildTargets', 'drawHover', 'drawRings', 'drawTexts', 'drawWeather', 'drawTransition', 'drawFlights', 'drawWorkMarks', 'particlesWorld', 'drawEmptyCells', 'drawClimateTint']) R[f] = () => {};
    R.finale = false; R.weather = null;
    if (R.fx) { R.fx.texts.length = 0; R.fx.rings.length = 0; }
    for (const id of ['hud', 'tutorial', 'ui', 'fade', 'boot']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const t of R.isl.board.tiles.values()) { const w = toWorld(t.q, t.r); x0 = Math.min(x0, w.x); x1 = Math.max(x1, w.x); y0 = Math.min(y0, w.y); y1 = Math.max(y1, w.y); }
    if (x0 < 1e8) {
      R.cam.x = R.cam.tx = (x0 + x1) / 2; R.cam.y = R.cam.ty = (y0 + y1) / 2;
      R.cam.zoom = R.cam.tzoom = Math.min(1.5, Math.min(1180 / (x1 - x0 + 200), 760 / (y1 - y0 + 220)));
    }
  });
  await page.waitForTimeout(2500);
  await (await page.$('canvas')).screenshot({ path: OUT });
  await b.close();
  console.log('capture', OUT);
})();
