// QA mobile : émulation de téléphones (tactile, portrait et paysage) dans Chromium.
// Vérifie la disposition compacte, la pose en deux touches, le bouton « Poser ici », le déplacement et le zoom à deux doigts,
// puis capture les écrans principaux dans tests/output/mobile-*.png.
// Usage : node tests/mobile.js   (serveur statique sur http://127.0.0.1:8765/ requis)
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
// La tournée finale se joue en vrai dans finale.js ; ici on la presse comme le ferait un doigt (deux touchers : accélérer,
// puis passer à la carte), et on clique « Voir le récapitulatif » dès que la carte est là — elle attend un geste, pas une minuterie.
const passerLaCarte = async (page, t = 50000) => { try { await page.waitForFunction(() => { const sc = window.CS.scenes.current, f = sc && sc.finale; if (f && !f.done && f.phase !== 'carte') { f.skip(); f.skip(); } return window.CS.scenes.currentName === 'results' || document.querySelector('.carte-actions .btn-primary'); }, null, { timeout: t }); await page.evaluate(() => { const b = document.querySelector('.carte-actions .btn-primary'); if (b) b.click(); }); } catch (_) { /* pas de carte : on laisse l'attente suivante le dire */ } };
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'output'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/index.html';
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); console.log(`${ok ? 'OK ' : 'KO '} ${msg}`); };

async function boot(context, opts = {}) {
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(`[console] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(URL); await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });
  await page.evaluate((o) => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}');
    s.cloud = { choice: 'none' }; s.options = Object.assign(s.options || {}, { testMode: true, skipTutorial: !!o.skipTutorial, master: 0 });
    // longue-vue et poche : la file est alors au plus long, c'est là que le HUD est le plus serré
    s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 7, seeds: 9, upgrades: Object.assign(s.campaign && s.campaign.upgrades || {}, { sight: 2, pocket: 2 }) });
    s.version = 3;   // sans numéro de version, la sauvegarde passerait par les migrations qui remappent les îles
    localStorage.setItem('cent-saisons.save', JSON.stringify(s));
  }, opts);
  await page.reload(); await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 }); await page.waitForTimeout(700);
  return page;
}
const stageInfo = (page) => page.evaluate(() => ({ ...window.CS.STAGE, html: document.documentElement.className, inner: [innerWidth, innerHeight] }));
async function startIsland(page, id) {
  await page.evaluate((id) => window.CS.Game.startIsland(id, { skipIntro: true }), id);
  // préparation (semis + vœux) : sur téléphone, le panneau défile et le bouton « C'est parti » est atteignable
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' || document.querySelector('.panel-wishes-intro'), null, { timeout: 20000 });
  if (await page.$('.panel-wishes-intro')) { const r = await page.evaluate(() => { const p = document.querySelector('.panel-wishes-intro'); const before = p.scrollTop; p.scrollTop = p.scrollHeight; const b = [...p.querySelectorAll('button')].find((x) => x.textContent.includes('C’est parti')); const rb = b.getBoundingClientRect(); return { scrollable: p.scrollHeight > p.clientHeight, moved: p.scrollTop > before || p.scrollHeight <= p.clientHeight, visible: rb.bottom <= innerHeight + 1 && rb.top >= 0 }; }); if (r.scrollable) check(r.moved && r.visible, `île ${id} : la préparation défile jusqu’au bouton (visible=${r.visible})`); }
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' || [...document.querySelectorAll('button')].some((x) => x.textContent.includes('C’est parti')), null, { timeout: 20000 }); await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('C’est parti')); if (b) b.click(); });  await page.waitForTimeout(500);
  await page.waitForFunction((id) => window.CS.scenes.currentName === 'island' && window.CS.scenes.current.isl && window.CS.scenes.current.isl.def.id === id, id, { timeout: 20000 });

}
const legalCellScreen = (page) => page.evaluate(() => {
  const sc = window.CS.scenes.current, isl = sc.isl; let best = null, bs = -Infinity;
  for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } }
  const S = 69.28; const p = sc.cam.toScreen(S * Math.sqrt(3) * (best.q + best.r / 2), S * 1.5 * best.r);
  const st = window.CS.STAGE; return { x: p.x * st.scale, y: p.y * st.scale, q: best.q, r: best.r, total: bs };
});
async function touchDrag(cdp, pts) {
  // pts : liste d'étapes, chaque étape = liste de points [{x,y}] (1 ou 2 doigts)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts[0] });
  for (let i = 1; i < pts.length; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts[i] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

(async () => {
  const browser = await chromium.launch();
  for (const name of ['iPhone 12', 'iPhone 12 landscape', 'Pixel 7']) {
    const tag = name.replace(/\s+/g, '-').toLowerCase();
    const context = await browser.newContext({ ...devices[name], locale: 'fr-FR' });
    const page = await boot(context);
    // les souffles étaient poussés hors de l'écran par une file trop longue (retour joueur) : plus jamais
    const hudDehors = async () => page.evaluate(() => {
      const el = [...document.querySelectorAll('.pw, .hud-place:not(.hidden), .hud-pause, .q-help')];
      return el.filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1 || r.top < -1); })
        .map((b) => { const r = b.getBoundingClientRect(); const bords = [r.right > innerWidth + 1 ? `droite ${Math.round(r.right)}>${innerWidth}` : null, r.left < -1 ? `gauche ${Math.round(r.left)}` : null, r.bottom > innerHeight + 1 ? `bas ${Math.round(r.bottom)}>${innerHeight}` : null, r.top < -1 ? `haut ${Math.round(r.top)}` : null].filter(Boolean);
          return `${(b.textContent || b.className).trim().slice(0, 12)} [${bords.join(', ')}]`; });
    });
    const st = await stageInfo(page);
    check(st.compact && st.touch, `${name} : disposition compacte (${st.inner.join('×')}, classes « ${st.html} »)`);
    await page.screenshot({ path: path.join(OUT, `mobile-${tag}-menu.png`) });
    // menu : aucun libellé rogné, aucun bouton hors de l'écran, et le menu tient dans la hauteur
    {
      const m = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('.menu-nav .btn')];
        const rogne = btns.filter((b) => [...b.querySelectorAll('span')].some((sp) => sp.scrollWidth > sp.clientWidth + 1)).map((b) => b.textContent.trim().slice(0, 18));
        const nav = document.querySelector('.menu-nav').getBoundingClientRect();
        return { rogne, debord: btns.filter((b) => { const r = b.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).length, bas: Math.round(nav.bottom), h: innerHeight, n: btns.length };
      });
      check(m.rogne.length === 0, `${name} : les ${m.n} libellés du menu tiennent en entier${m.rogne.length ? ` (rognés : ${m.rogne.join(', ')})` : ''}`);
      check(m.debord === 0, `${name} : aucun bouton du menu ne déborde de l’écran`);
      check(m.bas <= m.h, `${name} : le menu tient dans la hauteur (${m.bas} ≤ ${m.h})`);
    }
    // guide + options
    await page.evaluate(() => window.CS.Game.showGuide()); await page.waitForTimeout(600); await page.screenshot({ path: path.join(OUT, `mobile-${tag}-guide.png`) });
    {
      const cdpG = await context.newCDPSession(page);
      const back = await page.evaluate(() => { const b = document.querySelector('.panel-guide .panel-actions .btn'); const r = b.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: innerHeight }; });
      check(back.bottom <= back.h && back.top >= 0, `${name} : bouton Retour du guide visible sans défiler (${Math.round(back.bottom)} ≤ ${back.h})`);
      const body = await page.evaluate(() => { const r = document.querySelector('.guide-body').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height }; });
      await touchDrag(cdpG, [[{ x: body.x, y: body.y + body.h * 0.3 }], [{ x: body.x, y: body.y }], [{ x: body.x, y: body.y - body.h * 0.3 }], [{ x: body.x, y: body.y - body.h * 0.4 }]]);
      await page.waitForTimeout(900);   // laisser finir l'inertie du défilement avant de toucher un bouton
      const st = await page.evaluate(() => document.querySelector('.guide-body').scrollTop);
      check(st > 20, `${name} : le guide défile au doigt (scrollTop=${Math.round(st)})`);
      await page.tap('.panel-guide .panel-actions .btn'); await page.waitForTimeout(600);
      check(await page.evaluate(() => !document.querySelector('.panel-guide') && !!document.querySelector('.menu')), `${name} : Retour du guide ramène au menu`);
      await cdpG.detach();
    }
    await page.evaluate(() => window.CS.Game.showOptions()); await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, `mobile-${tag}-options.png`) });
    check(await page.evaluate(() => !!document.querySelector('select[aria-label="Notes du coup"]') && [...document.querySelectorAll('.opt-row')].some((r) => /Vibrations/.test(r.textContent)) && [...document.querySelectorAll('.opt-row')].some((r) => /Mode repos/.test(r.textContent))), `${name} : Options → « Notes du coup », « Vibrations » et « Mode repos » présents`);
    // île 3 : pose tactile
    await startIsland(page, 7);   // île 7 de la campagne : vœux et souffles ouverts
    const cdp = await context.newCDPSession(page);
    let c = await legalCellScreen(page);
    await page.touchscreen.tap(c.x, c.y); await page.waitForTimeout(300);
    let s1 = await page.evaluate(() => ({ armed: window.CS.scenes.current.armed, placements: window.CS.scenes.current.isl.placements, btn: !document.querySelector('.hud-place').classList.contains('hidden'), txt: document.querySelector('.hud-place').textContent }));
    check(s1.armed && s1.armed.q === c.q && s1.armed.r === c.r && s1.placements === 0, `${name} : première touche = case armée (${s1.txt})`);
    check(s1.btn, `${name} : bouton « Poser ici » visible`);
    await page.screenshot({ path: path.join(OUT, `mobile-${tag}-armed.png`) });
    await page.touchscreen.tap(c.x, c.y); await page.waitForTimeout(400);
    let s2 = await page.evaluate(() => ({ placements: window.CS.scenes.current.isl.placements, btn: !document.querySelector('.hud-place').classList.contains('hidden') }));
    check(s2.placements === 1 && !s2.btn, `${name} : seconde touche = tuile posée`);
    // bouton Poser ici
    c = await legalCellScreen(page); await page.touchscreen.tap(c.x, c.y); await page.waitForTimeout(250);
    await page.tap('.hud-place'); await page.waitForTimeout(400);
    s2 = await page.evaluate(() => window.CS.scenes.current.isl.placements);
    check(s2 === 2, `${name} : bouton « Poser ici » pose la tuile`);
    // déplacement à un doigt (CDP)
    const cam0 = await page.evaluate(() => ({ x: window.CS.scenes.current.cam.x, z: window.CS.scenes.current.cam.zoom }));
    const cx = st.W / 2, cy = st.H / 2;
    await touchDrag(cdp, [[{ x: cx, y: cy }], [{ x: cx + 30, y: cy + 10 }], [{ x: cx + 80, y: cy + 30 }], [{ x: cx + 120, y: cy + 40 }]]);
    await page.waitForTimeout(200);
    const cam1 = await page.evaluate(() => ({ x: window.CS.scenes.current.cam.x, placements: window.CS.scenes.current.isl.placements }));
    check(Math.abs(cam1.x - cam0.x) > 20 && cam1.placements === 2, `${name} : glissement = déplacement de la vue (Δx=${(cam1.x - cam0.x).toFixed(0)}), sans pose`);
    // zoom à deux doigts
    await touchDrag(cdp, [[{ x: cx - 40, y: cy }, { x: cx + 40, y: cy }], [{ x: cx - 70, y: cy }, { x: cx + 70, y: cy }], [{ x: cx - 100, y: cy }, { x: cx + 100, y: cy }]]);
    await page.waitForTimeout(200);
    const cam2 = await page.evaluate(() => window.CS.scenes.current.cam.zoom);
    check(cam2 > cam0.z * 1.3, `${name} : pincement = zoom (${cam0.z.toFixed(2)} → ${cam2.toFixed(2)})`);
    await page.evaluate(() => window.CS.scenes.current.cam.fit(window.CS.scenes.current.isl.board.mask, { immediate: true }));
    // quelques poses pour remplir, puis capture
    for (let i = 0; i < 14; i++) { c = await legalCellScreen(page); await page.touchscreen.tap(c.x, c.y); await page.waitForTimeout(60); await page.touchscreen.tap(c.x, c.y); await page.waitForTimeout(120); }
    c = await legalCellScreen(page); await page.touchscreen.tap(c.x, c.y); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `mobile-${tag}-island.png`) });
    // vœux dépliés
    await page.tap('.wish-toggle'); await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, `mobile-${tag}-wishes.png`) }); await page.tap('.wish-toggle');
    // pause
    { const d = await hudDehors(); check(d.length === 0, `${name} : les souffles et les boutons du jeu restent dans l’écran${d.length ? ` (dehors : ${d.join(', ')})` : ''}`); }
    await page.tap('[data-ref="pause"]'); await page.waitForTimeout(400); await page.evaluate(() => [...document.querySelectorAll('.panel-pause button')].find((b) => b.textContent.includes('Journal')).click()); await page.waitForTimeout(400);   // le journal s'ouvre depuis la pause await page.screenshot({ path: path.join(OUT, `mobile-${tag}-log.png`) }); check(await page.evaluate(() => document.querySelectorAll('.log-item').length > 0), `${name} : journal des événements ouvert avec des entrées`); await page.tap('.log-close'); await page.waitForTimeout(200);
    await page.tap('[data-ref="pause"]'); await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, `mobile-${tag}-pause.png`) });
    check(await page.$('.panel-pause'), `${name} : pause ouverte au toucher`);
    await page.tap('.panel-pause .btn-primary'); await page.waitForTimeout(300);
    // bilan
    await page.evaluate(() => window.CS.scenes.current.isl.finish('full')); await page.waitForTimeout(1500);
    await passerLaCarte(page);
    await page.waitForFunction(() => window.CS.scenes.currentName === 'results', null, { timeout: 30000 }).catch(() => errors.push(`${name} : pas de bilan`));
    await page.waitForTimeout(800); await page.screenshot({ path: path.join(OUT, `mobile-${tag}-results.png`) });
    await page.evaluate(() => window.CS.scenes.go('workshop', { onContinue: () => window.CS.Game.showMenu() })); await page.waitForTimeout(900); await page.screenshot({ path: path.join(OUT, `mobile-${tag}-workshop.png`) });
    // rotation à chaud : la scène se recalcule
    const rot = name.includes('landscape') ? devices['iPhone 12'].viewport : { width: devices[name].viewport.height, height: devices[name].viewport.width };
    await page.setViewportSize(rot); await page.waitForTimeout(400);
    const st2 = await stageInfo(page);
    check(st2.W === rot.width && st2.H === rot.height, `${name} : rotation → scène ${st2.W}×${st2.H} (${st2.portrait ? 'portrait' : 'paysage'})`);
    await page.evaluate(() => window.CS.Game.showMenu()); await page.waitForTimeout(600); await page.screenshot({ path: path.join(OUT, `mobile-${tag}-rotated-menu.png`) });
    await context.close();
  }
  // bureau : la disposition classique reste
  const desk = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await boot(desk); const st = await stageInfo(page);
  check(!st.compact && st.W === 1280, `bureau 1280×720 : disposition classique conservée`);
  await desk.close();
  await browser.close();
  const uniq = [...new Set(errors)];
  console.log(uniq.length ? `ERREURS (${uniq.length}) :\n` + uniq.join('\n') : 'Aucune erreur.');
  process.exit(uniq.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
