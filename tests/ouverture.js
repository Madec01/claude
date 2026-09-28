// L'ouverture (28 septembre) : après le logo, l'île du titre se bâtit et c'est elle la barre de chargement (ses tuiles
// tombent au rythme des images, jamais toute l'île en moins de cinq secondes), les saisons passent avec elle (été →
// automne → hiver → printemps), le titre s'écrit avec la dernière tuile posée, puis le menu garde l'île en fond. Les tests
// automatiques la passent d'ordinaire (navigator.webdriver) : ici on la demande (?ouverture=1).
// Usage : node tests/ouverture.js   (serveur statique sur http://127.0.0.1:8765/ requis)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://127.0.0.1:8765/index.html?ouverture=1';
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };

async function lancer(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(URL);
  // un joueur qui revient : pas de choix de connexion au premier menu
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}'); s.version = 3; s.cloud = { choice: 'none', uid: null, pending: null }; s.options = Object.assign(s.options || {}, { master: 0 }); s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 5, migre30: true }); localStorage.setItem('cent-saisons.save', JSON.stringify(s)); });
  await page.reload();
  return page;
}
const etat = (page) => page.evaluate(() => {
  const sc = window.CS && window.CS.scenes; const cur = sc && sc.current; const c = cur && cur.construction; const el = document.getElementById('ouverture');
  return { scene: sc ? sc.currentName : null, i: c ? c.i : null, n: c ? c.n : null, enAir: c ? c.posees.length : null, posee: c ? c.posee : null, limite: c ? c.limite : null,
    titre: !!(el && el.classList.contains('titre')), charge: !!(el && el.classList.contains('charge')), saison: cur && cur.isl ? cur.isl.season : null,
    legacy: cur && cur.renderer ? cur.renderer.legacy : null, t: cur && cur.t != null ? cur.t : null, tuiles: cur && cur.isl ? cur.isl.board.tiles.size : null };
}).catch(() => null);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });

  // --- la construction entière au rythme du chargement, les saisons, le titre avec la dernière tuile, le menu qui garde l'île
  {
    const page = await lancer(ctx);
    await page.waitForFunction(() => window.CS && window.CS.scenes.currentName === 'ouverture', null, { timeout: 30000 }).catch(() => {});
    const e0 = await etat(page);
    check(e0 && e0.scene === 'ouverture' && e0.n >= 20, `l’ouverture s’ouvre sur l’île du titre (${e0 && e0.n} poses à rejouer)`);
    check(e0 && e0.legacy === false, 'le rendu naît avec ses sols : les tuiles prendront leur forme naturelle (pas de repli hexagonal)');
    check(e0 && e0.saison === 'summer', 'la construction commence en été');
    check(await page.evaluate(() => !document.getElementById('boot') || document.getElementById('boot').classList.contains('off')), 'l’écran de chargement s’efface dès que la mer se montre');
    let titreAvant = false, titreAvec = null, i15 = null, depasse = false, t0 = Date.now(); const saisons = [];
    for (let k = 0; k < 80; k++) {
      const e = await etat(page); if (!e || e.scene !== 'ouverture') break;
      if (e.saison && saisons[saisons.length - 1] !== e.saison) saisons.push(e.saison);
      if (e.i !== null && e.limite !== null && e.i > e.limite) depasse = true;
      if (e.t >= 1.5 && i15 === null) i15 = e.i;
      if (e.titre && titreAvec === null) { titreAvec = e; if (e.i !== null && !e.posee) titreAvant = true; }
      if (e.titre && (Date.now() - t0) > 20000) break;
      await page.waitForTimeout(250);
    }
    check(i15 !== null && i15 >= 6 && i15 <= 30, `à une seconde et demie, une partie des tuiles est posée (${i15})`);
    check(!depasse, 'les tuiles ne vont jamais plus loin que le chargement');
    check(titreAvec !== null && !titreAvant, `le titre s’écrit avec la dernière tuile posée, pas avant (à ${titreAvec ? titreAvec.t.toFixed(1) : '?'} s)`);
    check(titreAvec && titreAvec.t >= 4.5 && titreAvec.t <= 9, 'la construction dure cinq secondes environ (le plancher : ici tout est chargé bien avant)');
    check(saisons.join(' → ') === 'summer → autumn → winter → spring', `les saisons passent avec la construction : ${saisons.join(' → ')}`);
    check(titreAvec && titreAvec.saison === 'spring' && !titreAvec.charge, 'le titre vient sur le printemps, le cercle de chargement est éteint');
    await page.waitForFunction(() => window.CS.scenes.currentName === 'menu', null, { timeout: 15000 }).catch(() => {});
    const menu = await page.evaluate(() => { const m = window.CS.scenes.current; return { scene: window.CS.scenes.currentName, ile: m && m.bg && m.bg.isl ? m.bg.isl.def.id : null, saison: m && m.bg ? m.bg.isl.season : null, tuiles: m && m.bg ? m.bg.isl.board.tiles.size : 0, cache: document.getElementById('ouverture').classList.contains('off') }; });
    check(menu.scene === 'menu' && menu.ile === 'ouverture' && menu.saison === 'spring' && menu.tuiles >= 20 && menu.cache, 'le menu suit et garde l’île du titre, au printemps, en fond ; le calque de l’ouverture s’efface');
    await page.close();
  }

  // --- un toucher presse le pas : l'île finit vite (jamais au-delà du chargement), le titre s'écrit, le menu suit
  {
    const page = await lancer(ctx);
    await page.waitForFunction(() => window.CS && window.CS.scenes.currentName === 'ouverture', null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const tClic = await page.evaluate(() => window.CS.scenes.current.t);
    await page.mouse.click(640, 400);
    let e = null; for (let k = 0; k < 24 && !(e && e.titre); k++) { await page.waitForTimeout(250); e = await etat(page); }
    check(e && e.titre && e.i === null && e.tuiles >= 20 && e.t - tClic < 4, `un toucher presse le pas : l’île finit vite (${e ? (e.t - tClic).toFixed(1) : '?'} s) et le titre s’écrit`);
    await page.waitForFunction(() => window.CS.scenes.currentName === 'menu', null, { timeout: 8000 }).catch(() => {});
    check(await page.evaluate(() => window.CS.scenes.currentName === 'menu'), 'le menu suit vite après un toucher');
    await page.close();
  }

  // --- sans le paramètre, les tests automatiques ne la voient pas
  {
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
    await page.goto('http://127.0.0.1:8765/index.html');
    await page.waitForFunction(() => window.CS && window.CS.scenes.currentName, null, { timeout: 60000 }).catch(() => {});
    const vu = await page.evaluate(() => window.CS.scenes.currentName);
    check(vu !== 'ouverture', `sous webdriver, pas d’ouverture : la première scène est « ${vu} »`);
    await page.close();
  }

  await b.close();
  console.log(errors.length ? `\n${errors.length} problème(s) :\n` + errors.join('\n') : '\nOuverture : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})();
