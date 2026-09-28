// L'ouverture (28 septembre) : après le logo, à la place de la barre de chargement, l'île du titre se bâtit en dix
// secondes et demie pendant que le reste des images arrive, le titre s'écrit avec la dernière tuile posée, puis le menu garde
// l'île en fond. Les tests automatiques la passent d'ordinaire (navigator.webdriver) : ici on la demande (?ouverture=1).
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
const etat = (page) => page.evaluate(() => { const sc = window.CS && window.CS.scenes; const cur = sc && sc.current; const c = cur && cur.construction; const el = document.getElementById('ouverture'); return { scene: sc ? sc.currentName : null, i: c ? c.i : null, n: c ? c.n : null, enAir: c ? c.posees.length : null, posee: c ? c.posee : null, titre: !!(el && el.classList.contains('titre')), t: cur && cur.t != null ? cur.t : null, tuiles: cur && cur.isl ? cur.isl.board.tiles.size : null }; }).catch(() => null);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });

  // --- la construction entière, le titre avec la dernière tuile, le menu qui garde l'île
  {
    const page = await lancer(ctx);
    await page.waitForFunction(() => window.CS && window.CS.scenes.currentName === 'ouverture', null, { timeout: 30000 }).catch(() => {});
    const e0 = await etat(page);
    check(e0 && e0.scene === 'ouverture' && e0.n >= 20, `l’ouverture s’ouvre sur l’île du titre (${e0 && e0.n} poses à rejouer)`);
    check(await page.evaluate(() => !document.getElementById('boot') || document.getElementById('boot').classList.contains('off')), 'l’écran de chargement s’efface dès que l’île se bâtit');
    // on suit la construction : les tuiles arrivent au fil du temps, le titre attend la dernière
    let titreAvant = false, titreAvec = null, i3 = null, t0 = Date.now();
    for (let k = 0; k < 80; k++) {
      const e = await etat(page); if (!e || e.scene !== 'ouverture') break;
      if (e.t >= 1.5 && i3 === null) i3 = e.i;
      if (e.titre && titreAvec === null) { titreAvec = e; if (e.i !== null && !e.posee) titreAvant = true; }
      if (e.titre && (Date.now() - t0) > 20000) break;
      await page.waitForTimeout(250);
    }
    check(i3 !== null && i3 >= 8 && i3 <= 40, `à une seconde et demie, une partie des tuiles est posée (${i3})`);
    check(titreAvec !== null && !titreAvant, `le titre s’écrit avec la dernière tuile posée, pas avant (à ${titreAvec ? titreAvec.t.toFixed(1) : '?'} s)`);
    check(titreAvec && titreAvec.t >= 3 && titreAvec.t <= 6.5, 'la construction dure trois secondes et demie environ');
    check(await page.evaluate(() => { const sc = window.CS.scenes.current; return sc.renderer && !sc.renderer.legacy; }), 'le rendu a ses sols : les tuiles prennent leur forme naturelle (pas de repli hexagonal)');
    await page.waitForFunction(() => window.CS.scenes.currentName === 'menu', null, { timeout: 15000 }).catch(() => {});
    const menu = await page.evaluate(() => { const m = window.CS.scenes.current; return { scene: window.CS.scenes.currentName, ile: m && m.bg && m.bg.isl ? m.bg.isl.def.id : null, tuiles: m && m.bg ? m.bg.isl.board.tiles.size : 0, cache: document.getElementById('ouverture').classList.contains('off') }; });
    check(menu.scene === 'menu' && menu.ile === 'ouverture' && menu.tuiles >= 20 && menu.cache, 'le menu suit et garde l’île du titre en fond ; le calque de l’ouverture s’efface');
    await page.close();
  }

  // --- un toucher passe : l'île finit d'un coup, le titre s'écrit, le menu suit
  {
    const page = await lancer(ctx);
    await page.waitForFunction(() => window.CS && window.CS.scenes.currentName === 'ouverture', null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.mouse.click(640, 400); await page.waitForTimeout(300);
    const e = await etat(page);
    check(e && e.titre && e.i === null && e.tuiles >= 20, 'un toucher : la construction finit d’un coup et le titre s’écrit');
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
