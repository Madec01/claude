// Parcours automatique de la campagne (QA) : joue chaque nuit avec un bot, vérifie l'absence d'erreur console
// et l'enchaînement des écrans. Usage : node tests/autoplay.js [nights=1-12,infinite] [speed=4]
// Prérequis : un serveur statique sur http://127.0.0.1:8765/ (python3 -m http.server 8765 à la racine du dépôt).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const arg = process.argv[2] || '1-12,infinite';
const SPEED = Number(process.argv[3] || 4);
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });

function parseNights(s) {
  const out = [];
  for (const part of s.split(',')) {
    if (part === 'infinite') out.push('infinite');
    else if (part.includes('-')) { const [a, b] = part.split('-').map(Number); for (let i = a; i <= b; i++) out.push(i); }
    else out.push(Number(part));
  }
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('feux-de-brume.save') || '{}');
    s.options = Object.assign(s.options || {}, { testMode: true, skipTutorial: false, master: 0 });
    s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedNight: 12 });
    localStorage.setItem('feux-de-brume.save', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });
  await page.waitForTimeout(500);

  const report = [];
  for (const id of parseNights(arg)) {
    const t0 = Date.now();
    await page.evaluate((id) => window.FDB.Game.startNight(id, { skipIntro: true }), id);
    await page.waitForFunction(() => window.FDB.scenes.currentName === 'night' && window.FDB.scenes.current.night, null, { timeout: 30000 });
    await page.evaluate((s) => { window.FDB.loop.timeScale = s; }, SPEED);
    let ticks = 0;
    let shot = false;
    // Boucle du bot
    while (true) {
      const st = await page.evaluate(() => {
        const sc = window.FDB.scenes.current; const n = sc && sc.night;
        if (!n) return { gone: true };
        // Bot : chemin par BFS sur une grille qui évite toutes les terres/écueils (le bot « connaît » la passe)
        const port = n.port;
        const CELL = 32, GW = Math.ceil(1280 / CELL), GH = Math.ceil(720 / CELL);
        const blockedFor = (draft, rad) => {
          const g = new Uint8Array(GW * GH);
          const mark = (x, y, r) => { const x0 = Math.max(0, Math.floor((x - r) / CELL)), x1 = Math.min(GW - 1, Math.floor((x + r) / CELL)), y0 = Math.max(0, Math.floor((y - r) / CELL)), y1 = Math.min(GH - 1, Math.floor((y + r) / CELL)); for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const cx = gx * CELL + CELL / 2, cy = gy * CELL + CELL / 2; if (Math.hypot(cx - x, cy - y) < r) g[gy * GW + gx] = 1; } };
          for (const c of n.hazards.land) mark(c.x, c.y, c.r + rad + 6);
          for (const r of n.hazards.rocks) if (n.hazards.rockDangerous(r, draft)) mark(r.x, r.y, r.r + rad + 8);
          for (const w of n.hazards.wrecks) mark(w.x, w.y, w.r + rad + 6);
          for (const b of n.beasts) if (!b.hidden) mark(b.x, b.y, b.radius + rad + 30);
          return g;
        };
        const findPath = (s) => {
          const g = blockedFor(s.draft, s.radius);
          const sx = Math.min(GW - 1, Math.max(0, Math.floor(s.x / CELL))), sy = Math.min(GH - 1, Math.max(0, Math.floor(s.y / CELL)));
          const tx = Math.floor(port.x / CELL), ty = Math.floor(port.y / CELL);
          g[ty * GW + tx] = 0; g[sy * GW + sx] = 0;
          const prev = new Int32Array(GW * GH).fill(-1); const seen = new Uint8Array(GW * GH);
          const q = [sy * GW + sx]; seen[q[0]] = 1; let found = false;
          while (q.length) { const c = q.shift(); if (c === ty * GW + tx) { found = true; break; } const cx = c % GW, cy = (c - cx) / GW; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const k = ny * GW + nx; if (seen[k] || g[k]) continue; if (dx && dy && (g[cy * GW + nx] || g[ny * GW + cx])) continue; seen[k] = 1; prev[k] = c; q.push(k); } }
          if (!found) return [{ x: port.x, y: port.y }];
          const cells = []; let c = ty * GW + tx; while (c !== -1 && c !== sy * GW + sx) { cells.push(c); c = prev[c]; } cells.reverse();
          const pts = cells.filter((_, i) => i % 3 === 0 || i === cells.length - 1).map((k) => ({ x: (k % GW) * CELL + CELL / 2, y: Math.floor(k / GW) * CELL + CELL / 2 }));
          pts[pts.length - 1] = { x: port.x, y: port.y };
          return pts;
        };
        for (const s of n.ships) {
          if (!s.active) continue;
          if (s.lost) continue;
          if (!s.hasRoute && !s.anchored) { s.setRoute(findPath(s)); n.routeTool.routesDrawn++; s._botT = n.t; }
          else if (s.hasRoute && n.t - (s._botT || 0) > 12) { s.setRoute(findPath(s)); s._botT = n.t; }
        }
        // faisceau vers le navire actif le plus proche du phare
        let best = null, bd = 1e9;
        for (const s of n.ships) { if (!s.active) continue; const d = Math.hypot(s.x - n.beam.ox, s.y - n.beam.oy); if (d < bd) { bd = d; best = s; } }
        const p = n.pages.list.find((x) => x.visible && !x.read);
        const target = (p && Math.random() < 0.4) ? p : best;
        if (target) n.mouse = { x: target.x, y: target.y };
        if (n.horn.ready && n.ships.some((s) => s.active && Math.hypot(s.x - n.horn.ox, s.y - n.horn.oy) < n.horn.radius) && Math.random() < 0.1) n.blowHorn();
        if (n.beam.oilEnabled && n.beam.oilRatio < 0.3 && !n.beam.low) n.beam.toggleLow();
        if (n.beam.oilEnabled && n.beam.oilRatio > 0.6 && n.beam.low) n.beam.toggleLow();
        if (Math.random() < 0.01) { const s = n.ships.find((x) => x.active && !x.anchored); if (s && n.def.mechanics.anchor) { s.anchored = true; n.emit('anchor', s); setTimeout(() => { s.anchored = false; }, 1500); } }
        return { t: n.t, state: n.state, ships: n.ships.length, docked: n.stats.docked, wrecked: n.stats.wrecked, pages: n.stats.pages, lost: n.stats.lost, fps: window.FDB.loop.fps, scene: window.FDB.scenes.currentName, pageOpen: !!sc.pageOpen };
      });
      if (st.gone) break;
      if (st.pageOpen) { await page.keyboard.press('Space'); }
      if (!shot && st.t > 40) { shot = true; await page.screenshot({ path: path.join(OUT, `night-${id}.png`) }); }
      if (st.state === 'ended') { await page.waitForTimeout(3500); break; }
      ticks++;
      await page.waitForTimeout(250);
      if (id === 'infinite' && st.t > 150) { await page.evaluate(() => window.FDB.scenes.current.night.endNight(true, 'test')); await page.waitForTimeout(3500); break; }
      if (ticks > 2000) { errors.push(`[timeout] nuit ${id}`); break; }
    }
    // Écran de résultats
    const scene = await page.evaluate(() => window.FDB.scenes.currentName);
    const result = await page.evaluate(() => { const r = window.FDB.scenes.current; return r && r.lastResult ? r.lastResult : null; });
    await page.screenshot({ path: path.join(OUT, `results-${id}.png`) });
    const resText = await page.evaluate(() => (document.querySelector('.panel-results') || {}).innerText || '');
    const win = /L’aube se lève|La veille s’achève/.test(resText);
    report.push({ id, scene, win, seconds: ((Date.now() - t0) / 1000).toFixed(0), summary: resText.replace(/\s+/g, ' ').slice(0, 160) });
    console.log(`Nuit ${id}: scène=${scene} gagnée=${win} (${report[report.length - 1].seconds}s) :: ${report[report.length - 1].summary}`);
    // Continuer : résultats → outro → atelier
    if (scene === 'results' && await page.$('.panel-results .btn-primary')) {
      await page.click('.panel-results .btn-primary');
      await page.waitForTimeout(800);
      let guard = 0;
      while (guard++ < 6) {
        const name = await page.evaluate(() => window.FDB.scenes.currentName);
        if (name === 'story') { await page.keyboard.press('Escape'); await page.waitForTimeout(700); }
        else if (name === 'workshop') { await page.screenshot({ path: path.join(OUT, `workshop-${id}.png`) }); break; }
        else if (name === 'ending') { await page.screenshot({ path: path.join(OUT, `ending.png`) }); break; }
        else break;
      }
    }
  }
  await page.evaluate(() => window.FDB.scenes.go('menu'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'menu-final.png') });
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('feux-de-brume.save')));
  console.log('Sauvegarde :', JSON.stringify({ unlocked: save.campaign.unlockedNight, stars: save.campaign.stars, shards: save.campaign.shards, pages: save.campaign.pagesRead.length, completed: save.campaign.completed, infinite: save.infinite }));
  const uniq = [...new Set(errors)];
  console.log(uniq.length ? `ERREURS (${uniq.length}) :\n` + uniq.join('\n') : 'Aucune erreur console.');
  await browser.close();
  process.exit(uniq.filter((e) => !/404|Manifeste audio|Audio inconnu|reading 'sfx'/.test(e)).length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
