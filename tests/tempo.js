// Le Souffle court dans le navigateur : la grande tuile au menu, l'île qui s'ouvre avec son cadran, une tuile perdue
// quand le temps tombe, une partie jouée par un bot jusqu'au bilan, le meilleur score gardé. Captures dans tests/output/.
// Usage : node tests/tempo.js [port=8765]
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
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}'); s.cloud = { choice: 'none' }; s.options = Object.assign(s.options || {}, { skipTutorial: true, master: 0 }); s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 7, islandsPlayed: 6 }); s.version = 3; localStorage.setItem('cent-saisons.save', JSON.stringify(s)); });
  await page.reload(); await boot(page); await page.waitForTimeout(600);
  // 1. le menu : une grande tuile, ouverte après l'île 6
  const tuile = await page.evaluate(() => { const b = [...document.querySelectorAll('.menu-nav .btn')].find((x) => x.textContent.includes('Souffle court')); return b ? { big: b.classList.contains('btn-big') || b.classList.contains('btn-mode'), disabled: b.disabled, sub: (b.querySelector('.btn-sub') || {}).textContent } : null; });
  check(tuile && tuile.big && !tuile.disabled, `la grande tuile « Le Souffle court » est au menu, ouverte (${JSON.stringify(tuile)})`);
  await page.screenshot({ path: path.join(OUT, 'tempo-menu.png') });
  // 2. le récapitulatif des règles avant l'île, puis le décompte, puis le cadran sur la tuile — en grand, centrée en bas
  await page.evaluate(() => [...document.querySelectorAll('.menu-nav .btn')].find((x) => x.textContent.includes('Souffle court')).click());
  await page.waitForFunction(() => window.CS.scenes.currentName === 'prep' && document.querySelector('.panel-tempo'), null, { timeout: 15000 });
  // la toute première fois, 8 s (découverte) ; le joueur choisit 3 s (défi), et le récapitulatif suit
  const premier = await page.evaluate(() => ({ on: (document.querySelector('.tp-cadran.on') || {}).dataset ? document.querySelector('.tp-cadran.on').dataset.cadran : null, txt: document.querySelector('.panel-tempo').textContent }));
  check(premier.on === '8' && /huit secondes/.test(premier.txt) && /32 secondes/.test(premier.txt) && /découverte/.test(premier.txt), `la première partie propose 8 s (découverte), l'été à 32 s (pastille ${premier.on})`);
  await page.evaluate(() => document.querySelector('.tp-cadran[data-cadran="3"]').click()); await page.waitForTimeout(100);
  const recap = await page.evaluate(() => ({ regles: document.querySelectorAll('.tp-regle').length, txt: document.querySelector('.panel-tempo').textContent, entrainer: !![...document.querySelectorAll('.panel-tempo button')].find((b) => /entraîner/i.test(b.textContent)) }));
  check(recap.regles === 5 && /trois secondes/.test(recap.txt) && /série/i.test(recap.txt) && /12 secondes/.test(recap.txt) && !/meilleur à 3 s :/.test(recap.txt) && recap.entrainer, `le récapitulatif des règles précède l'île (${recap.regles} règles, l'été à 12 s à 3 s, aucun record à 3 s, bouton S'entraîner)`);
  await page.screenshot({ path: path.join(OUT, 'tempo-recap.png') });
  await page.evaluate(() => [...document.querySelectorAll('.panel-tempo button')].find((b) => b.textContent.includes('parti')).click());
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' && window.CS.scenes.current.isl && window.CS.scenes.current.isl.def.tempo, null, { timeout: 20000 });
  // le premier chiffre attend le premier temps fort de la musique (0,4 s après son départ)
  await page.waitForFunction(() => /^[321]$/.test((document.querySelector('.tempo-compte') || {}).textContent || ''), null, { timeout: 5000 });
  const compte = await page.evaluate(() => ({ hold: window.CS.scenes.current.hold, el: (document.querySelector('.tempo-compte') || {}).textContent || '', t: window.CS.scenes.current.tempo.t }));
  await page.waitForTimeout(900);
  const compte2 = await page.evaluate(() => ({ t: window.CS.scenes.current.tempo.t, hold: window.CS.scenes.current.hold }));
  check(compte.hold && /^[321]$/.test(compte.el) && compte2.hold && Math.abs(compte2.t - compte.t) < 0.01, `le décompte retient le cadran (« ${compte.el} », ${compte.t.toFixed(1)} → ${compte2.t.toFixed(1)} s)`);
  await page.screenshot({ path: path.join(OUT, 'tempo-compte.png') });
  // une pause pendant le décompte : un seul décompte à la reprise, et le jeu reste tenu tant qu'un chiffre s'affiche
  await page.keyboard.press('Escape'); await page.waitForTimeout(300); await page.keyboard.press('Escape');
  await page.waitForFunction(() => /^[321]$/.test((document.querySelector('.tempo-compte') || {}).textContent || ''), null, { timeout: 5000 });
  const releves = []; for (let i = 0; i < 8; i++) { releves.push(await page.evaluate(() => ({ n: document.querySelectorAll('.tempo-compte').length, chiffre: /^[321]$/.test((document.querySelector('.tempo-compte') || {}).textContent || ''), hold: window.CS.scenes.current.hold }))); await page.waitForTimeout(250); }
  check(releves.every((r) => r.n <= 1) && releves.every((r) => !r.chiffre || r.hold), `pause pendant le décompte : un seul décompte à la fois, le jeu tenu tant qu'un chiffre s'affiche (${releves.filter((r) => r.chiffre).length} relevés avec chiffre, max ${Math.max(...releves.map((r) => r.n))} élément)`);
  await page.waitForFunction(() => !window.CS.scenes.current.hold, null, { timeout: 8000 }); await page.waitForTimeout(200);
  const hud = await page.evaluate(() => { const q = document.querySelector('.qtile.current').getBoundingClientRect(); return { cadran: !!document.querySelector('.tempo-chrono .tc-eau'), tuiles: document.querySelectorAll('.qtile').length, suivante: document.querySelectorAll('.qtile.next').length, souffles: getComputedStyle(document.querySelector('.hud-breaths')).display, saison: window.CS.scenes.current.isl.season, tempo: !!window.CS.scenes.current.tempo, tutoriel: !!document.querySelector('#tutorial .tuto-card'), cx: Math.round(q.left + q.width / 2), cy: Math.round(q.top + q.height / 2), w: Math.round(q.width) }; });
  check(hud.cadran && hud.tempo && hud.souffles === 'none' && !hud.tutoriel, `l'île s'ouvre avec le chronomètre au-dessus d'elle, sans souffles ni tutoriel (${JSON.stringify(hud)})`);
  const banniere = await page.evaluate(() => document.querySelector('[data-ref=seasonRule]').textContent);
  check(/Deux tuiles proposées/.test(banniere), `la bannière de saison dit l'effet du mode (« ${banniere.slice(0, 60)}… »)`);
  check(hud.saison === 'spring' && hud.tuiles === 2 && hud.suivante === 0, `printemps : deux tuiles proposées, jamais de « suivante » (${hud.tuiles}, ${hud.suivante})`);
  check(hud.cy > 600 && hud.w >= 80 && hud.w <= 130, `la tuile à poser est centrée en bas, de taille modeste (centre y=${hud.cy}, largeur ${hud.w})`);
  // la lueur se resserre : à mi-temps elle est plus près de la côte qu'au départ
  const m1 = await page.evaluate(() => parseFloat(document.querySelector('.tempo-chrono .tc-eau').style.width)); await page.waitForTimeout(1200); const m2 = await page.evaluate(() => parseFloat(document.querySelector('.tempo-chrono .tc-eau').style.width));
  check(m1 > m2 && m2 > 0, `la marée du chronomètre se retire avec le temps (${m1.toFixed(2)} → ${m2.toFixed(2)})`);
  await page.screenshot({ path: path.join(OUT, 'tempo-debut.png') });
  // 3. le temps tombe : la tuile est perdue
  const avant = await page.evaluate(() => window.CS.scenes.current.isl.queue.remaining);
  await page.waitForTimeout(3600);
  const apres = await page.evaluate(() => ({ lost: window.CS.scenes.current.isl.stats.lost, rem: window.CS.scenes.current.isl.queue.remaining }));
  check(apres.lost >= 1 && apres.rem < avant, `sans pose en 3 s, la tuile est perdue (${apres.lost} perdue, ${avant} → ${apres.rem})`);
  // 4. la pause arrête le cadran, et la reprise ne fait gagner aucun temps (ni au cadran, ni à la série)
  await page.waitForTimeout(1500);   // que le cadran soit bien entamé avant la pause
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  const t0 = await page.evaluate(() => ({ t: window.CS.scenes.current.tempo.t, depuis: window.CS.scenes.current.tempo.depuis })); await page.waitForTimeout(800);
  const t1 = await page.evaluate(() => window.CS.scenes.current.tempo.t);
  check(Math.abs(t1 - t0.t) < 0.05, `en pause, le cadran ne bouge pas (${t0.t.toFixed(2)} → ${t1.toFixed(2)})`);
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !window.CS.scenes.current.hold, null, { timeout: 8000 });
  const t2 = await page.evaluate(() => ({ t: window.CS.scenes.current.tempo.t, depuis: window.CS.scenes.current.tempo.depuis }));
  check(t0.t < 2.5 && Math.abs(t2.t - t0.t) < 0.1 && Math.abs(t2.depuis - t0.depuis) < 0.1, `la reprise repart où le temps s'était arrêté (${t0.t.toFixed(2)} s avant, ${t2.t.toFixed(2)} s après ; série depuis ${t0.depuis.toFixed(2)} → ${t2.depuis.toFixed(2)})`);
  await page.waitForTimeout(200);
  // 5. un bot joue vite jusqu'au bout : série, saisons, brume d'automne photographiée
  let photoAutomne = false, tours = 0, retour = '';
  while (tours++ < 400) {
    const st = await page.evaluate(() => {
      const sc = window.CS.scenes.current; const isl = sc && sc.isl; if (!isl || isl.ended) return { ended: true };
      let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } }
      if (!best) { isl.finish('full'); return { ended: true }; }
      isl.place(best.q, best.r); return { season: isl.season, brume: sc.tempo.brume.size, serie: sc.tempo.serie, mult: sc.tempo.mult };
    });
    if (st.ended) break;
    if (!retour) retour = await page.evaluate(() => { const e = document.querySelector('.q-retour'); return e && e.classList.contains('on') ? e.textContent : ''; });
    if (st.season === 'autumn' && st.brume > 0 && !photoAutomne) { photoAutomne = true; await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, 'tempo-automne.png') }); }
    await page.waitForTimeout(120);
  }
  const fin = await page.evaluate(() => { const isl = window.CS.scenes.current.isl; const d = isl.def; return { ended: isl.ended, score: isl.score, bestSerie: isl.stats.bestSerie, lost: isl.stats.lost, tally: isl.tally, saisons: isl.seasonsPassed.length, def: { seed: d.seed, cells: d.cells, cadran: d.cadran, etire: d.etire } }; });
  check(fin.ended && fin.score > 0 && fin.bestSerie >= 3 && (fin.tally.tempo || 0) > 0, `partie jouée : ${fin.score} points, série max ${fin.bestSerie}, ${fin.lost} perdue(s), ${fin.saisons} saisons, bonus de série ${fin.tally.tempo}`);
  check(retour && /série/.test(retour), `après une pose, la tuile dit pourquoi la série bouge (« ${retour} »)`);
  check(photoAutomne, 'l’automne a couvert des tuiles de brume');
  // 6. la carte puis le bilan : la tournée est courte, le bilan porte le mode, le meilleur score est gardé
  await page.waitForFunction(() => { const sc = window.CS.scenes.current, f = sc && sc.finale; if (f && !f.done && f.phase !== 'carte') { f.skip(); f.skip(); } return window.CS.scenes.currentName === 'results' || document.querySelector('.carte-actions .btn-primary'); }, null, { timeout: 40000 });
  await page.evaluate(() => { const b = document.querySelector('.carte-actions .btn-primary'); if (b) b.click(); });
  await page.waitForFunction(() => document.querySelector('.panel-results'), null, { timeout: 30000 }); await page.waitForTimeout(800);
  const bilan = await page.evaluate(() => ({ txt: document.querySelector('.panel-results').textContent, best: window.CS.Save.data.tempo.best, best3: window.CS.Save.data.tempo.bests[3], serie3: window.CS.Save.data.tempo.series[3], parties: window.CS.Save.data.tempo.parties }));
  check(/Souffle court/.test(bilan.txt) && /Meilleure série/.test(bilan.txt) && bilan.best === fin.score && bilan.best3 === fin.score && bilan.serie3 === fin.bestSerie && bilan.parties === 1 && /à 3 s/.test(bilan.txt) && /île n°/.test(bilan.txt), `bilan du mode, record rangé à 3 s, numéro de l'île (${bilan.best3}, série ${bilan.serie3}, ${bilan.parties} partie)`);
  // « Rejouer cette île » : même graine, même délai, même forme
  const avantRejeu = fin.def;
  await page.evaluate(() => [...document.querySelectorAll('.panel-results button')].find((b) => /Rejouer cette île/.test(b.textContent)).click());
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' && window.CS.scenes.current.isl && window.CS.scenes.current.isl.def.tempo, null, { timeout: 20000 }); await page.waitForTimeout(300);
  const rejeu = await page.evaluate(() => { const d = window.CS.scenes.current.isl.def; return { seed: d.seed, cells: d.cells, cadran: d.cadran, etire: d.etire, mask: window.CS.scenes.current.isl.board.mask.size }; });
  check(rejeu.seed === avantRejeu.seed && rejeu.cells === avantRejeu.cells && rejeu.cadran === avantRejeu.cadran && rejeu.etire === avantRejeu.etire, `« Rejouer cette île » rouvre la même île (graine ${rejeu.seed}, ${rejeu.cells} cases, ${rejeu.cadran} s)`);
  await page.evaluate(() => { window.CS.scenes.current.isl.finish('full'); });
  await page.waitForFunction(() => { const sc = window.CS.scenes.current, f = sc && sc.finale; if (f && !f.done && f.phase !== 'carte') { f.skip(); f.skip(); } return window.CS.scenes.currentName === 'results' || document.querySelector('.carte-actions .btn-primary'); }, null, { timeout: 40000 });
  await page.evaluate(() => { const b = document.querySelector('.carte-actions .btn-primary'); if (b) b.click(); });
  await page.waitForFunction(() => document.querySelector('.panel-results'), null, { timeout: 30000 }); await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'tempo-bilan.png') });
  // 7. l'aide ne fait pas de record : avec le tutoriel, la pose attend sous une carte qui fige, et la partie est un entraînement
  await page.evaluate(() => document.querySelector('.panel-results .btn-ghost').click());
  await page.waitForFunction(() => window.CS.scenes.currentName === 'menu', null, { timeout: 15000 }); await page.waitForTimeout(400);
  const menuTuile = await page.evaluate(() => (document.querySelector('.btn-tempo .btn-sub') || {}).textContent || '');
  const recordsAvant = await page.evaluate(() => ({ best3: window.CS.Save.data.tempo.bests[3], parties: window.CS.Save.data.tempo.parties }));
  check(/pts à 3 s/.test(menuTuile), `le menu montre le record et son délai (« ${menuTuile} »)`);
  await page.evaluate(() => [...document.querySelectorAll('.menu-nav .btn')].find((x) => x.textContent.includes('Souffle court')).click());
  await page.waitForFunction(() => document.querySelector('.panel-tempo'), null, { timeout: 15000 });
  await page.evaluate(() => { const c = document.querySelector('.panel-tempo .tp-tuto input'); if (!c.checked) c.click(); [...document.querySelectorAll('.panel-tempo button')].find((b) => b.textContent.includes('parti')).click(); });
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' && window.CS.scenes.current.isl && window.CS.scenes.current.isl.def.tuto && !window.CS.scenes.current.hold, null, { timeout: 30000 }); await page.waitForTimeout(500);
  const posOf = () => page.evaluate(() => { const sc = window.CS.scenes.current; const B = window.CS.BALANCE.hex; const c = sc.isl.board.legalCells().find((c) => sc.isl.canPlace(c.q, c.r)); const w = { x: B.size * Math.sqrt(3) * (c.q + c.r / 2), y: B.size * 1.5 * c.r }; const s = sc.cam.toScreen(w.x, w.y); const st = window.CS.STAGE; const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left + s.x * (st.scale || 1), y: r.top + s.y * (st.scale || 1) }; });
  const carte1 = await page.evaluate(() => (window.CS.scenes.current.tutorial.current || { step: {} }).step.id);
  let p = await posOf(); await page.mouse.click(p.x, p.y); await page.waitForTimeout(300);
  const sousCarte = await page.evaluate(() => ({ poses: window.CS.scenes.current.isl.placements, t: window.CS.scenes.current.tempo.t }));
  await page.evaluate(() => document.querySelector('.tuto-ok').click()); await page.waitForTimeout(300);
  const carte2 = await page.evaluate(() => (window.CS.scenes.current.tutorial.current || { step: {} }).step.id);
  p = await posOf(); await page.mouse.click(p.x, p.y); await page.waitForTimeout(300);
  const apresCompris = await page.evaluate(() => window.CS.scenes.current.isl.placements);
  check(carte1 === 'tp1' && sousCarte.poses === 0 && carte2 === 'tp2' && apresCompris === 1, `sous la première carte, la pose attend (${sousCarte.poses} pose) ; sous la carte qui demande une pose, elle passe (${apresCompris})`);
  await page.evaluate(() => window.CS.scenes.current.isl.finish('full'));
  await page.waitForFunction(() => { const sc = window.CS.scenes.current, f = sc && sc.finale; if (f && !f.done && f.phase !== 'carte') { f.skip(); f.skip(); } return window.CS.scenes.currentName === 'results' || document.querySelector('.carte-actions .btn-primary'); }, null, { timeout: 40000 });
  await page.evaluate(() => { const b = document.querySelector('.carte-actions .btn-primary'); if (b) b.click(); });
  await page.waitForFunction(() => document.querySelector('.panel-results'), null, { timeout: 30000 }); await page.waitForTimeout(500);
  const bilan2 = await page.evaluate(() => ({ txt: document.querySelector('.panel-results').textContent, best3: window.CS.Save.data.tempo.bests[3], parties: window.CS.Save.data.tempo.parties }));
  check(/Entraînement/.test(bilan2.txt) && bilan2.best3 === recordsAvant.best3 && bilan2.parties === recordsAvant.parties, `une partie avec le tutoriel est un entraînement : records et compte de parties intacts (${bilan2.best3}, ${bilan2.parties} parties)`);
  check(!pageErrors.length, `aucune erreur de page${pageErrors.length ? ` : ${pageErrors.slice(0, 3).join(' | ')}` : ''}`);
  await b.close();
  if (errors.length) { console.log(`\n${errors.length} problème(s) :\n${errors.join('\n')}`); process.exit(1); }
  console.log('Le Souffle court : tout est bon.');
})().catch((e) => { console.error('Échec du test :', e.message); process.exit(1); });
