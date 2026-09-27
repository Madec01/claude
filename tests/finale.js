// Tournée finale : le recul, trois ou quatre plans nommés, la vague, l'année qui tourne, puis la carte
// postale qui se fabrique autour du paysage et attend. On vérifie que la tournée va jusqu'à la carte
// sans erreur, qu'elle rend la scène propre (saison d'origine), que le toucher
// presse le pas avant de passer, et que la version courte s'applique quand l'île a déjà été terminée.
// Usage : node tests/finale.js   (serveur statique sur http://127.0.0.1:8765/ requis)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://127.0.0.1:8765/index.html';
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };

/** Amène une île jouée jusqu'à la fin, prête pour la tournée. `plays` : parties déjà terminées sur cette île. */
async function preparer(page, ile, plays) {
  await page.evaluate(({ plays }) => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}');
    s.version = 3; s.cloud = { choice: 'none', uid: null, pending: null };
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

  // on suit la tournée en relevant ce qu'elle traverse (les phases, la caméra, le cadre de la carte),
  // jusqu'à la carte — qui attend, sans minuterie
  const suivi = await page.evaluate(() => new Promise((res) => {
    const sc = window.CS.scenes.current; const f = sc.finale, r = sc.renderer;
    const vu = { phases: [], bandesMax: 0, lettresMax: 0, zoomMax: 0, voilier: false, construction: false, minTuiles: Infinity, tuilesAuTour: -1, saisonsPendant: new Set() };
    const t0 = performance.now(); let surCarte = 0;
    const tick = () => {
      if (!f || f.done) return res({ ...vu, finieSeule: true });
      if (f.phase === 'carte' && ++surCarte > 120) return res({ ...vu, saisonsPendant: [...vu.saisonsPendant], tuiles: sc.isl.board.tiles.size });   // deux secondes sur la carte : elle tient
      if (performance.now() - t0 > 60000) return res({ ...vu, bloquee: true });
      if (vu.phases[vu.phases.length - 1] !== f.phase) { vu.phases.push(f.phase); if (f.phase === 'tour') vu.tuilesAuTour = sc.isl.board.tiles.size; }
      if (f.rj && f.rj.auto) { vu.construction = true; vu.minTuiles = Math.min(vu.minTuiles, sc.isl.board.tiles.size); vu.saisonsPendant.add(sc.isl.season); }
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
  check(suivi.construction && suivi.minTuiles === 0, `la tournée s’ouvre sur la construction : l’île se vide (${suivi.minTuiles} tuile) et se rebâtit`);
  check(suivi.tuilesAuTour === suivi.tuiles, `la tournée des régions ne part qu’une fois l’île entière revenue (${suivi.tuilesAuTour} / ${suivi.tuiles})`);
  check(suivi.saisonsPendant.length === 1, `la construction ne fait pas tourner les saisons (${suivi.saisonsPendant.join(', ')})`);
  check(suivi.zoomMax > 1.5, `la caméra s'approche vraiment d'un plan (×${suivi.zoomMax.toFixed(2)} du cadrage d'ensemble)`);
  check(suivi.bandesMax > 0.99 && suivi.lettresMax > 0.99, 'la carte postale se pose entièrement et le nom s’écrit en entier');
  check(suivi.voilier, 'un voilier part pendant le titre');

  // --- 2 bis. « Revoir la construction » : un plateau vide se rebâtit pose après pose, puis la carte revient
  const rejeu = await page.evaluate(() => new Promise((res) => {
    const sc = window.CS.scenes.current; const f = sc.finale;
    if (!f || f.done) return res({ absent: true });
    const reelles = sc.isl.board.tiles.size; const poses = sc.isl.poses.length;
    const btn = [...document.querySelectorAll('.carte-actions button')].find((b) => /Revoir/.test(b.textContent)); if (!btn) return res({ pasDeBouton: true });
    btn.click();
    const t0 = performance.now(); let minTuiles = Infinity, maxAvant = 0;
    const tick = () => {
      if (f.phase === 'rejouer') { minTuiles = Math.min(minTuiles, sc.isl.board.tiles.size); maxAvant = Math.max(maxAvant, f.rj ? f.rj.par.size : sc.isl.board.tiles.size); }
      if (f.phase === 'carte' && minTuiles < Infinity) return res({ minTuiles, maxAvant, reelles, poses, apres: sc.isl.board.tiles.size, faune: !!sc.renderer.rejoue, boutons: document.querySelectorAll('.carte-actions button').length });
      if (performance.now() - t0 > 30000) return res({ bloque: true, phase: f.phase });
      requestAnimationFrame(tick);
    };
    tick();
  }));
  check(!rejeu.absent && !rejeu.pasDeBouton && !rejeu.bloque, `la construction se rejoue et rend la carte (${JSON.stringify(rejeu)})`);
  if (!rejeu.bloque && !rejeu.absent && !rejeu.pasDeBouton) {
    check(rejeu.minTuiles === 0 && rejeu.maxAvant >= rejeu.reelles - 1, `l’île se rebâtit de la mer nue (${rejeu.minTuiles} tuile au plateau) au complet (${rejeu.maxAvant} / ${rejeu.reelles} tuiles tombées)`);
    check(rejeu.apres === rejeu.reelles && !rejeu.faune && rejeu.boutons === 3, 'le vrai plateau revient, la faune aussi, et les trois boutons');
  }

  // --- 2. la carte attend le joueur : trois boutons, un toucher ne passe pas, le bouton oui
  const carte = await page.evaluate(() => {
    const sc = window.CS.scenes.current, f = sc.finale;
    const boutons = [...document.querySelectorAll('.carte-actions button')].map((b) => b.textContent.trim());
    f.skip(); const apresToucher = f.phase;
    const voir = [...document.querySelectorAll('.carte-actions button')].find((b) => /récapitulatif/.test(b.textContent)); if (voir) voir.click();
    return { boutons, apresToucher, fini: f.done, ui: !!document.querySelector('.carte-actions') };
  });
  check(carte.boutons.length === 3 && carte.boutons.some((b) => /Enregistrer/.test(b)) && carte.boutons.some((b) => /récapitulatif/.test(b)) && carte.boutons.some((b) => /Revoir/.test(b)), `la carte porte ses trois boutons (${carte.boutons.join(' / ')})`);
  check(carte.apresToucher === 'carte', 'un toucher sur la carte ne la fait pas passer');


  check(carte.fini && !carte.ui, 'le bouton « Voir le récapitulatif » mène au bilan et retire les boutons');
  const apres = await page.evaluate(() => {
    const sc = window.CS.scenes.current, r = sc.renderer, f = sc.finale;
    return { nu: r.nu, finale: r.finale, transition: !!r.transition, saison: sc.isl.season, saison0: f.season0, fini: f.done };
  });
  check(apres.fini && !apres.finale && !apres.nu && !apres.transition, 'la tournée rend la scène : plus de mode finale, plus d’île nue, plus de balayage');
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

  // --- 4 bis. depuis le bilan, « Revoir la construction » rouvre l'île finie : une première réussite menée à sa carte, puis au bilan
  await preparer(page, 12, {});
  await page.evaluate(() => new Promise((res) => { const f = window.CS.scenes.current.finale; f.skip(); f.skip(); let n = 0; const tick = () => { if (f.phase === 'carte' && document.querySelector('.carte-actions')) { const voir = [...document.querySelectorAll('.carte-actions button')].find((b) => /récapitulatif/.test(b.textContent)); if (voir) voir.click(); return res(true); } if (++n > 1800) return res(false); requestAnimationFrame(tick); }; tick(); }));
  await page.waitForFunction(() => window.CS.scenes.currentName === 'results', null, { timeout: 20000 });
  const depuisBilan = await page.evaluate(() => new Promise((res) => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Revoir la construction/.test(b.textContent)); if (!btn) return res({ pasDeBouton: true });
    btn.click();
    const t0 = performance.now(); let vuRejouer = false, minTuiles = Infinity;
    const tick = () => {
      const sc = window.CS.scenes.current, nom = window.CS.scenes.currentName;
      if (nom === 'rejeu' && sc.finale && sc.finale.phase === 'rejouer') { vuRejouer = true; minTuiles = Math.min(minTuiles, sc.isl.board.tiles.size); }
      if (nom === 'rejeu' && sc.finale && sc.finale.phase === 'carte' && vuRejouer) {
        const voir = [...document.querySelectorAll('.carte-actions button')].find((b) => /récapitulatif/.test(b.textContent)); if (voir) voir.click();
        setTimeout(() => res({ vuRejouer, minTuiles, retour: window.CS.scenes.currentName, boutonRevenu: !![...document.querySelectorAll('button')].find((b) => /Revoir la construction/.test(b.textContent)), tuiles: sc.isl.board.tiles.size }), 600); return;
      }
      if (performance.now() - t0 > 30000) return res({ bloque: true, nom, phase: sc.finale && sc.finale.phase });
      requestAnimationFrame(tick);
    };
    tick();
  }));
  check(!depuisBilan.pasDeBouton && !depuisBilan.bloque && depuisBilan.vuRejouer, `le bilan propose « Revoir la construction » et la scène de rejeu tourne (${JSON.stringify(depuisBilan)})`);
  if (depuisBilan.vuRejouer) check(depuisBilan.minTuiles < 5 && depuisBilan.retour === 'results' && depuisBilan.boutonRevenu, 'l’île se rebâtit depuis le vide, la carte rend le bilan, et le bouton est toujours là');

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
