// Tournée finale : le tour du cadran pendant le recul, trois ou quatre plans nommés, la vague, l'année
// qui tourne, puis la carte postale qui se fabrique autour du paysage. On vérifie que la tournée va
// jusqu'au bout sans erreur, qu'elle rend la scène propre (saison d'origine, nuit levée), que le toucher
// presse le pas avant de passer, et que la version courte s'applique quand l'île a déjà été terminée.
// Usage : node tests/finale.js   (serveur statique sur http://127.0.0.1:8765/ requis)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://127.0.0.1:8765/index.html';
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };

/** Amène une île jouée jusqu'à la fin, prête pour la tournée. `plays` : parties déjà terminées sur cette île. */
async function preparer(page, ile, plays) {
  await page.evaluate(({ plays }) => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}');
    s.version = 2; s.cloud = { choice: 'none', uid: null, pending: null };
    s.options = Object.assign(s.options || {}, { testMode: true, skipTutorial: true, master: 0 });
    s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 30, plays });
    localStorage.setItem('cent-saisons.save', JSON.stringify(s));
  }, { plays });
  await page.reload(); await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });
  await page.waitForTimeout(400);
  await page.evaluate((n) => window.CS.Game.startIsland(n, { skipIntro: true }), ile);
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(400);
    const pret = await page.evaluate(() => {
      if (window.CS.scenes.currentName === 'island') return true;
      const c = document.querySelector('.contract-card');
      if (c) { c.click(); const go = [...document.querySelectorAll('.panel-contract button')].find((x) => x.textContent.includes('Signer')); if (go) go.click(); return false; }
      const p = [...document.querySelectorAll('button')].find((y) => /C’est parti|Continuer|Suivant/.test(y.textContent));
      if (p) p.click(); return false;
    });
    if (pret) break;
  }
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island', null, { timeout: 30000 });
  // une partie entière jouée par le bot, puis la tournée lancée à la main (le mode test ne la lance pas)
  return page.evaluate(async (n) => {
    const { playStrong } = await import('/tests/bot.js');
    const out = playStrong(window.CS.campaignIsland(n), {});
    const sc = window.CS.scenes.current;
    sc.isl.restoreRun(out.isl.serialize());
    if (!sc.isl.result) sc.isl.result = out.result;
    sc.isl.board.touch(); if (sc.renderer.rebuildDecor) sc.renderer.rebuildDecor();
    sc.startFinale();
    const f = sc.finale;
    return { court: f.court, plans: f.plans.map((p) => ({ titre: p.titre, famille: p.famille, cases: p.cells.length })), saison0: f.season0, cible: f.target };
  }, ile);
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}
${(e.stack || '').split('\n').slice(0, 5).join('\n')}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(`[console] ${m.text()}`); });
  await page.goto(URL); await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });

  // --- 1. la tournée complète : première réussite sur l'île 12
  const info = await preparer(page, 12, {});
  check(!info.court, 'première réussite : la tournée complète');
  check(info.plans.length >= 2 && info.plans.length <= 4, `${info.plans.length} plans choisis : ${info.plans.map((p) => p.titre).join(' · ')}`);
  check(info.plans.every((p) => p.titre && p.titre.length > 2), 'chaque plan porte un nom');
  check(new Set(info.plans.map((p) => p.titre)).size === info.plans.length, 'deux plans ne portent pas le même nom');

  // on suit la tournée en relevant ce qu'elle traverse (la nuit, les phases, le cadre de la carte),
  // jusqu'à la carte — qui attend, sans minuterie
  const suivi = await page.evaluate(() => new Promise((res) => {
    const sc = window.CS.scenes.current; const f = sc.finale, r = sc.renderer; const W = window.CS.STAGE.W;
    const vu = { phases: [], nuitMax: 0, frontMax: 0, chaleurMax: 0, bandesMax: 0, lettresMax: 0, zoomMax: 0, voilier: false };
    const t0 = performance.now(); let surCarte = 0;
    const tick = () => {
      if (!f || f.done) return res({ ...vu, finieSeule: true });
      if (f.phase === 'carte' && ++surCarte > 120) return res(vu);   // deux secondes sur la carte : elle tient
      if (performance.now() - t0 > 60000) return res({ ...vu, bloquee: true });
      if (vu.phases[vu.phases.length - 1] !== f.phase) vu.phases.push(f.phase);
      vu.nuitMax = Math.max(vu.nuitMax, r.nuitA(W / 2));
      vu.frontMax = Math.max(vu.frontMax, Math.abs(r.nuitA(120) - r.nuitA(W - 120)));   // un front : la gauche et la droite ne sont pas dans la même heure
      vu.chaleurMax = Math.max(vu.chaleurMax, r.chaleurA(W / 2));
      vu.bandesMax = Math.max(vu.bandesMax, f.bandes || 0);
      vu.lettresMax = Math.max(vu.lettresMax, f.lettres || 0);
      vu.zoomMax = Math.max(vu.zoomMax, sc.cam.zoom / f.centre.z);
      if (r._life && r._life.boat) vu.voilier = true;
      requestAnimationFrame(tick);
    };
    tick();
  }));
  check(!suivi.bloquee && !suivi.finieSeule, 'la tournée s’arrête sur la carte et attend (pas de minuterie)');
  check(suivi.phases.join(' → ') === 'reveil → tour → vague → saisons → titre → carte', `elle passe par ses six temps (${suivi.phases.join(' → ')})`);
  check(suivi.nuitMax > 0.9, `la nuit tombe pour de bon pendant le recul (${suivi.nuitMax.toFixed(2)})`);
  check(suivi.frontMax > 0.6, `la nuit traverse l’île en front, pas en fondu global (écart gauche/droite ${suivi.frontMax.toFixed(2)})`);
  check(suivi.chaleurMax > 0.9, `le soleil se couche sur le passage du front (chaleur ${suivi.chaleurMax.toFixed(2)})`);
  check(suivi.zoomMax > 1.5, `la caméra s'approche vraiment d'un plan (×${suivi.zoomMax.toFixed(2)} du cadrage d'ensemble)`);
  check(suivi.bandesMax > 0.99 && suivi.lettresMax > 0.99, 'la carte postale se pose entièrement et le nom s’écrit en entier');
  check(suivi.voilier, 'un voilier part pendant le titre');

  // --- 2. la carte attend le joueur : deux boutons, un toucher ne passe pas, le bouton oui
  const carte = await page.evaluate(() => {
    const sc = window.CS.scenes.current, f = sc.finale;
    const boutons = [...document.querySelectorAll('.carte-actions button')].map((b) => b.textContent.trim());
    f.skip(); const apresToucher = f.phase;
    const voir = [...document.querySelectorAll('.carte-actions button')].find((b) => /récapitulatif/.test(b.textContent)); if (voir) voir.click();
    return { boutons, apresToucher, fini: f.done, ui: !!document.querySelector('.carte-actions') };
  });
  check(carte.boutons.length === 2 && carte.boutons.some((b) => /Enregistrer/.test(b)) && carte.boutons.some((b) => /récapitulatif/.test(b)), `la carte porte ses deux boutons (${carte.boutons.join(' / ')})`);
  check(carte.apresToucher === 'carte', 'un toucher sur la carte ne la fait pas passer');
  check(carte.fini && !carte.ui, 'le bouton « Voir le récapitulatif » mène au bilan et retire les boutons');
  const apres = await page.evaluate(() => {
    const sc = window.CS.scenes.current, r = sc.renderer, f = sc.finale;
    return { cadran: r.cadran, nu: r.nu, finale: r.finale, transition: !!r.transition, saison: sc.isl.season, saison0: f.season0, fini: f.done };
  });
  check(apres.fini && !apres.finale && !apres.nu && !apres.transition, 'la tournée rend la scène : plus de mode finale, plus d’île nue, plus de balayage');
  check(apres.cadran === null, 'le jour est revenu (cadran remis à plat)');
  check(apres.saison === apres.saison0, `l’île retrouve sa saison (${apres.saison})`);

  // --- 3. un toucher presse le pas, un second passe
  await page.evaluate(() => { const sc = window.CS.scenes.current; sc.finale = null; sc.finished = false; sc.startFinale(); });
  const presse = await page.evaluate(() => {
    const f = window.CS.scenes.current.finale; const v0 = f.vitesse;
    f.skip(); const v1 = f.vitesse; const fini1 = f.done;
    f.skip(); return { v0, v1, fini1, fini2: f.done, phase2: f.phase };
  });
  check(presse.v0 === 1 && presse.v1 > 2 && !presse.fini1, `le premier toucher accélère (×${presse.v1}) sans passer`);
  check(!presse.fini2 && presse.phase2 === 'carte', 'le second toucher saute à la carte — et pas plus loin');
  await page.evaluate(() => { const f = window.CS.scenes.current.finale; if (f) f.finish(); });

  // --- 4. la version courte quand l'île a déjà été terminée
  const court = await preparer(page, 12, { 12: 1 });
  check(court.court, 'île déjà terminée : version courte');
  check(court.plans.length === 1, `un seul plan en version courte (${court.plans.length})`);
  await page.evaluate(() => { const f = window.CS.scenes.current.finale; if (f) f.finish(); });

  // --- 5. la tournée d'avant est toujours là, et toujours valide
  const vieille = await page.evaluate(async () => {
    const m = await import('/src/game/finale_classique.js');
    return typeof m.FinaleClassique === 'function';
  });
  check(vieille, 'la tournée d’avant est gardée et se charge encore (finale_classique.js)');

  await b.close();
  console.log(errors.length ? `\n${errors.length} problème(s) :\n- ${errors.join('\n- ')}` : '\nTournée finale : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})();
