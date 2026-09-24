// Parcours automatique de la campagne (QA) : un bot joue chaque île dans le navigateur (clics réels sur le canvas),
// vérifie l'absence d'erreur console et l'enchaînement des écrans, et mesure le score obtenu.
// Usage : node tests/autoplay.js [islands=1-12,infinite,garden] [pauseMs=60]
// Prérequis : serveur statique sur http://127.0.0.1:8765/ (python3 -m http.server 8765 à la racine).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
// La carte postale de fin attend un geste (pas de minuterie) : on clique « Voir le récapitulatif » quand elle est là.
const passerLaCarte = async (page, t = 50000) => { try { await page.waitForFunction(() => window.CS.scenes.currentName === 'results' || document.querySelector('.carte-actions .btn-primary'), null, { timeout: t }); await page.evaluate(() => { const b = document.querySelector('.carte-actions .btn-primary'); if (b) b.click(); }); } catch (_) { /* pas de carte : on laisse l'attente suivante le dire */ } };
const path = require('path');
const fs = require('fs');

const arg = process.argv[2] || '1-12,infinite,garden';
const PAUSE = Number(process.argv[3] || 60);
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });

function parseList(s) {
  const out = [];
  for (const part of s.split(',')) {
    if (part === 'infinite' || part === 'garden' || part === 'daily') out.push(part);
    else if (part.includes('-')) { const [a, b] = part.split('-').map(Number); for (let i = a; i <= b; i++) out.push(i); }
    else out.push(Number(part));
  }
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(`[console] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}');
    s.cloud = { choice: 'none' }; s.options = Object.assign(s.options || {}, { testMode: true, skipTutorial: true, master: 0 });
    s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 12 });
    s.version = 3;   // sans numéro de version, la sauvegarde passerait par les migrations qui remappent les îles
    localStorage.setItem('cent-saisons.save', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });
  await page.waitForTimeout(400);

  const report = [];
  for (const id of parseList(arg)) {
    const t0 = Date.now();
    await page.evaluate((id) => { const G = window.CS.Game; if (id === 'infinite') G.startInfinite(); else if (id === 'garden') G.startGarden(); else if (id === 'daily') G.startDaily(); else G.startIsland(id, { skipIntro: true }); }, id);
    // passer l'intro de l'Île infinie et du Jardin (bouton « Passer » ; l'île du jour a un écran de départ, comme la campagne), puis attendre l'île attendue (le changement de scène passe par un fondu)
    const isMine = (id) => { const sc = window.CS.scenes.current, isl = sc && sc.isl; return window.CS.scenes.currentName === 'island' && isl && (id === 'garden' ? isl.garden : id === 'infinite' ? isl.infinite : id === 'daily' ? isl.def.daily : isl.def.id === id); };
    if (id === 'infinite' || id === 'garden') {
      await page.waitForFunction(() => window.CS.scenes.currentName === 'story' && document.querySelector('.story-actions button'), null, { timeout: 15000 });
      await page.waitForTimeout(300); await page.click('.story-actions button');
    }
    if (!(id === 'infinite' || id === 'garden')) { await page.waitForFunction(() => window.CS.scenes.currentName === 'island' || [...document.querySelectorAll('button')].some((x) => x.textContent.includes('C’est parti')), null, { timeout: 20000 }); await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('C’est parti')); if (b) b.click(); }); }   // préparation (semis, vœux)
    await page.waitForFunction(isMine, id, { timeout: 30000 });
    await page.waitForTimeout(600);
    let ticks = 0, shot = false;
    while (true) {
      const st = await page.evaluate(() => {
        const sc = window.CS.scenes.current; const isl = sc && sc.isl;
        if (!isl) return { gone: true };
        if (isl.ended) return { ended: true, placements: isl.placements, score: isl.score };
        // bot glouton à un coup, avec une petite prime aux fermetures et aux rivières
        let best = null, bs = -Infinity;
        for (const c of isl.board.legalCells()) {
          const pv = isl.preview(c.q, c.r); if (!pv) continue;
          const s = pv.total + pv.closes.length * 0.5 + (pv.river && !pv.river.pond ? 0.3 : 0) + Math.random() * 0.05;
          if (s > bs) { bs = s; best = c; }
        }
        if (!best) return { stuck: true };
        if (isl.garden && isl.placements % 7 === 0) sc.hud.onGardenPick(['forest', 'meadow', 'water', 'hamlet', 'field'][isl.placements % 5]);
        const S = 69.28; const w = { x: S * Math.sqrt(3) * (best.q + best.r / 2), y: S * 1.5 * best.r };
        const p = sc.cam.toScreen(w.x, w.y);
        return { x: p.x, y: p.y, placements: isl.placements, score: isl.score, season: isl.season, fps: window.CS.loop.fps };
      });
      if (st.gone) break;
      if (st.ended) { await page.waitForTimeout(1500); break; }
      if (st.swapped) continue;
      if (st.built || st.discarded) continue;
      if (st.stuck) { await page.evaluate(() => window.CS.scenes.current.isl.finish('full')); await page.waitForTimeout(1500); break; }
      if (st.x < 0 || st.x > 1280 || st.y < 0 || st.y > 720) { await page.evaluate(() => { const sc = window.CS.scenes.current; sc.cam.fit(sc.isl.board.mask, { immediate: true }); }); continue; }
      await page.mouse.move(st.x, st.y); await page.waitForTimeout(PAUSE / 2); await page.mouse.click(st.x, st.y); await page.waitForTimeout(PAUSE);
      ticks++;
      if (!shot && st.placements > 20) { shot = true; await page.screenshot({ path: path.join(OUT, `island-${id}.png`) }); }
      if ((id === 'infinite' || id === 'garden') && st.placements >= 60) { await page.keyboard.press('F5'); await page.waitForTimeout(1500); break; }
      if (ticks > 400) { errors.push(`[timeout] île ${id}`); break; }
    }
    // Bilan
    await passerLaCarte(page);
    await page.waitForFunction(() => window.CS.scenes.currentName === 'results', null, { timeout: 30000 }).catch(() => errors.push(`[flow] pas de bilan pour l'île ${id}`));
    await page.screenshot({ path: path.join(OUT, `results-${id}.png`) });
    const res = await page.evaluate(() => (document.querySelector('.panel-results') || {}).innerText || '');
    report.push({ id, seconds: ((Date.now() - t0) / 1000).toFixed(0), summary: res.replace(/\s+/g, ' ').slice(0, 170) });
    console.log(`Île ${id} (${report[report.length - 1].seconds}s) :: ${report[report.length - 1].summary}`);
    // Continuer : bilan → écran de départ de l'île suivante (ou récit de fin après la dernière)
    if (id === 'infinite' || id === 'garden' || id === 'daily') { await page.evaluate(() => window.CS.scenes.go('menu')); await page.waitForTimeout(800); }
    else if (await page.$('.panel-results .btn-primary')) {
      await page.click('.panel-results .btn-primary'); await page.waitForTimeout(700);
      for (let g = 0; g < 6; g++) {
        const name = await page.evaluate(() => window.CS.scenes.currentName);
        if (name === 'story') { await page.keyboard.press('Escape'); await page.waitForTimeout(600); }
        else if (name === 'prep') { await page.screenshot({ path: path.join(OUT, `depart-${id + 1}.png`) }); break; }
        else if (name === 'ending') { await page.screenshot({ path: path.join(OUT, 'ending.png') }); break; }
        else break;
      }
    }
  }
  await page.evaluate(() => window.CS.scenes.go('menu')); await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, 'menu-final.png') });
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('cent-saisons.save')));
  console.log('Sauvegarde :', JSON.stringify({ unlocked: save.campaign.unlockedIsland, stars: save.campaign.stars, seeds: save.campaign.seeds, completed: save.campaign.completed, infinite: save.infinite }));
  const uniq = [...new Set(errors)];
  console.log(uniq.length ? `ERREURS (${uniq.length}) :\n` + uniq.join('\n') : 'Aucune erreur console.');
  await browser.close();
  process.exit(uniq.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
