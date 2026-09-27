// Sous la brume, au navigateur : le menu ouvre le mode, le cran se choisit, la brume se dessine, la fiche d'une case
// plante un jalon et prend une note, Déplacer déplace, la partie va au bout et le bilan dit ce que la brume cachait.
// Usage : node tests/brume.js   (serveur statique sur http://127.0.0.1:8765/) ; SHOTS=dossier pour garder des captures
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = `http://127.0.0.1:${process.env.PORT || 8765}/index.html`;   // PORT : un autre serveur (un worktree, par exemple)
const SHOTS = process.env.SHOTS || null;
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };
const boot = (p) => p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });
const passerLaCarte = async (page, t = 60000) => { try { await page.waitForFunction(() => { const sc = window.CS.scenes.current, f = sc && sc.finale; if (f && !f.done && f.phase !== 'carte') { f.skip(); f.skip(); } return window.CS.scenes.currentName === 'results' || document.querySelector('.carte-actions .btn-primary'); }, null, { timeout: t }); await page.evaluate(() => { const b = document.querySelector('.carte-actions .btn-primary'); if (b) b.click(); }); } catch (_) { /* l'attente suivante le dira */ } };

(async () => {
  const b = await chromium.launch();
  // la taille d'un iPhone 12 : c'est là que le commanditaire joue
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(URL); await boot(page);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}');
    s.cloud = { choice: 'none', uid: null, pending: null };
    s.options = Object.assign(s.options || {}, { testMode: false, skipTutorial: true, master: 0 });
    s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true, unlockedIsland: 8, migre30: true });
    s.version = 3;
    localStorage.setItem('cent-saisons.save', JSON.stringify(s));
  });
  await page.reload(); await boot(page); await page.waitForTimeout(800);
  await page.evaluate(() => window.CS.Game.showMenu()); await page.waitForTimeout(600);

  // le menu : le bouton est là, ouvert (île 8 atteinte), et mène au choix du cran
  const bouton = await page.evaluate(() => { const x = [...document.querySelectorAll('.menu-nav .btn')].find((e) => e.textContent.startsWith('Sous la brume')); return x ? { off: x.disabled, txt: x.textContent } : null; });
  check(!!bouton && !bouton.off, `bouton « Sous la brume » ouvert au menu (${bouton && bouton.txt})`);
  await page.evaluate(() => [...document.querySelectorAll('.menu-nav .btn')].find((e) => e.textContent.startsWith('Sous la brume')).click());
  await page.waitForTimeout(700);
  check(await page.evaluate(() => !!document.querySelector('.panel-brume') && document.querySelectorAll('.brume-cran').length === 2), 'le choix du cran propose deux crans');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/brume_choix.png` });
  await page.evaluate(() => document.querySelector('.brume-cran .btn').click());
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' && window.CS.scenes.current.isl, null, { timeout: 20000 });
  await page.waitForTimeout(1500);

  const etat = await page.evaluate(() => { const isl = window.CS.scenes.current.isl; return { brume: !!isl.brume, fog: isl.board.fog.size, hud: !document.querySelector('.hud-brume').classList.contains('hidden'), inv: document.querySelector('.brume-inv').textContent }; });
  check(etat.brume && etat.fog >= 5, `l’île a sa brume (${etat.fog} cases)`);
  check(etat.hud && etat.inv.length > 3, `le HUD montre l’inventaire (« ${etat.inv} »)`);

  // quelques poses gloutonnes, de préférence contre la brume (pour voir des indices)
  // `arret` : s'arrête au passage prêt (pour le tester) ; sinon lève la brume comme le ferait le bouton
  const joue = (n, arret = false) => page.evaluate(([n, arret]) => {
    const sc = window.CS.scenes.current, isl = sc.isl; let k = 0;
    while (k < n && !isl.ended) {
      if (isl.passagePret) { if (arret) break; isl.leverBrume(); continue; }
      let best = null;
      isl.queue.list.forEach((t, i) => { for (const c of isl.board.legalCells()) { const p = isl.preview(c.q, c.r, t); if (!p) continue; const v = p.total + (isl.fogAround(c.q, c.r).length ? 2 : 0); if (!best || v > best.v) best = { i, c, v }; } });
      if (!best) break;
      if (best.i) isl.pick(best.i);
      isl.place(best.c.q, best.c.r); k++;
    }
    return k;
  }, [n, arret]);
  await joue(3); await page.waitForTimeout(1200);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/brume_debut.png` });
  const indices = await page.evaluate(() => [...window.CS.scenes.current.isl.board.tiles.values()].filter((t) => typeof t.indice === 'number').length);
  check(indices > 0, `des tuiles posées contre la brume portent un indice (${indices})`);

  // B-A.2 : la règle affichée est la règle appliquée — sous « Marée basse », le HUD dit « à 1 voisine » ; sous « Jalon forcé »
  // en Brume claire, la ligne du jalon dit « sinon −3 » (le chiffre de P.jalonManque, celui qu'on retire vraiment)
  const regles = await page.evaluate(async () => {
    const sc = window.CS.scenes.current, isl = sc.isl; const attend = () => new Promise((r) => setTimeout(r, 250));
    isl.appliquerCarte('mareeBasse'); await attend();
    const maree = { left: document.querySelector('.brume-left').textContent, seuil: isl.seuilDevoile() };
    isl.appliquerCarte('jalonForce'); await attend();
    const force = { jalon: document.querySelector('.brume-jalon').textContent, due: document.querySelector('.brume-jalon').classList.contains('due') };
    sc.tapBrume(...[...isl.board.fog].sort()[0].split(',').map(Number), false); await attend();
    const fiche = (document.querySelector('.panel-brume-case .res-line') || {}).textContent || ''; document.querySelector('.panel-brume-case .panel-actions .btn-primary').click(); await attend();
    Object.assign(isl.brume.saison, { devoileDelta: 0, jalonForce: false }); isl.brume.carte = null;   // on rend la saison neutre pour la suite
    return { maree, force, fiche };
  });
  check(regles.maree.seuil === 1 && /à 1 voisine\b/.test(regles.maree.left), `Marée basse : le HUD dit le seuil appliqué (« ${regles.maree.left} »)`);
  check(/sinon −3/.test(regles.force.jalon) && regles.force.due, `Jalon forcé en claire : la ligne du jalon dit « sinon −3 » (« ${regles.force.jalon} »)`);
  check(/\/ 2 pour se dévoiler/.test(regles.fiche), `la fiche d'une case lit le seuil appliqué (« ${regles.fiche.slice(0, 60)} »)`);

  // B-E : toucher une tuile à indice cerne exactement sa portée encore cachée, et la ligne donne le même chiffre que la pastille — sans points
  const portee = await page.evaluate(() => {
    const sc = window.CS.scenes.current, isl = sc.isl;
    const t = [...isl.board.tiles.values()].find((x) => typeof x.indice === 'number' && x.portee && x.portee.some((k) => isl.board.fog.has(k))); if (!t) return null;
    const attendu = t.portee.filter((k) => isl.board.fog.has(k)).sort().join();
    const fams = [t.family]; const chiffre = t.portee.filter((k) => isl.board.fog.has(k) && isl.brume.cachees.get(k).family === t.family).length;
    sc.tapBrume(t.q, t.r, false);
    const pd = sc.renderer.porteeDe; const texte = sc.textePortee(t);
    sc.tapBrume(t.q, t.r, false); const efface = !sc.renderer.porteeDe;
    return { cerne: pd && pd.q === t.q && pd.r === t.r, attendu, n: attendu.split(',').length / 2, chiffre, texte, efface, fams };
  });
  check(!!portee && portee.cerne && portee.efface, `toucher une tuile à indice cerne sa portée, un second toucher l'efface (${portee && portee.texte})`);
  check(!!portee && new RegExp(`^Parmi (ces ${portee.n} cases cachées|cette case cachée) : ${portee.chiffre} `).test(portee.texte) && !/pt|point/.test(portee.texte), `la ligne dit le même chiffre que la pastille, sans points (« ${portee && portee.texte} »)`);

  // la fiche d'une case cachée : jalon, puis crayon sur une autre case
  const k0 = await page.evaluate(() => { const isl = window.CS.scenes.current.isl; return [...isl.board.fog].sort()[0]; });
  await page.evaluate((k) => { const [q, r] = k.split(',').map(Number); window.CS.scenes.current.tapBrume(q, r, false); }, k0);
  await page.waitForTimeout(500);
  check(await page.evaluate(() => !!document.querySelector('.panel-brume-case')), 'toucher une case de brume ouvre sa fiche');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/brume_fiche.png` });
  await page.evaluate(() => document.querySelector('.panel-brume-case .brume-section .gpick').click());
  await page.waitForTimeout(400);
  const jal = await page.evaluate((k) => { const sc = window.CS.scenes.current; return { j: sc.isl.brume.jalons.get(k), hold: sc.hold, ui: !!document.querySelector('.panel-brume-case') }; }, k0);
  check(!!jal.j && !jal.hold && !jal.ui, `le jalon est planté (${jal.j}) et la fiche se referme`);
  const k1 = await page.evaluate(() => [...window.CS.scenes.current.isl.board.fog].sort()[1]);
  await page.evaluate((k) => { const [q, r] = k.split(',').map(Number); window.CS.scenes.current.tapBrume(q, r, false); }, k1);
  await page.waitForTimeout(400);
  await page.evaluate(() => { const l = document.querySelectorAll('.panel-brume-case .brume-section .gpick-list'); l[l.length - 1].querySelector('.gpick').click(); });
  await page.waitForTimeout(300);
  check(await page.evaluate((k) => !!window.CS.scenes.current.isl.brume.crayon.get(k), k1), 'le crayon note une case');

  // une tuile libre de la brume est nécessaire (l'île est tirée au hasard) : on pose jusqu'à en avoir une
  for (let i = 0; i < 8 && !(await page.evaluate(() => { const isl = window.CS.scenes.current.isl; return [...isl.board.tiles.values()].some((x) => isl.canMove(x.q, x.r)); })); i++) await joue(1);
  // Déplacer : le bouton du HUD, une tuile libre, une case d'arrivée ; la prochaine tuile est perdue
  const mv = await page.evaluate(() => {
    const sc = window.CS.scenes.current, isl = sc.isl;
    document.querySelector('.brume-move').click();
    const t = [...isl.board.tiles.values()].find((x) => isl.canMove(x.q, x.r)); if (!t) return { ok: false, why: 'aucune tuile déplaçable' };
    sc.tapBrume(t.q, t.r, false);
    const cibles = sc.renderer.moveTargets || []; if (!cibles.length) return { ok: false, why: 'aucune cible' };
    const c = cibles[0]; const reste = isl.queue.remaining, fam = t.family;
    sc.tapBrume(c.q, c.r, false); const arme = !!(sc.armed && sc.armed.move);
    sc.tapBrume(c.q, c.r, false);
    return { ok: true, arme, bouge: !!isl.board.get(c.q, c.r) && isl.board.get(c.q, c.r).family === fam && !isl.board.get(t.q, t.r), perdue: isl.queue.remaining === reste - 1, fini: !sc.moving };
  });
  check(mv.ok && mv.arme && mv.bouge && mv.perdue && mv.fini, `Déplacer : deux touchers, la tuile bouge, la suivante est perdue (${JSON.stringify(mv)})`);

  // B-F : à la dernière pose de la saison, rien ne se dévoile ; le bouton « Lever la brume » apparaît, et le toucher dévoile
  const avant = await page.evaluate(() => { const isl = window.CS.scenes.current.isl; return { dev: isl.brume.devoilees, saisons: isl.seasonsPassed.length }; });
  await joue(6, true); await page.waitForTimeout(600);
  const pret = await page.evaluate(() => { const isl = window.CS.scenes.current.isl; const b = document.querySelector('.brume-lever'); return { pret: isl.passagePret, bouton: !!b && !b.classList.contains('hidden') && getComputedStyle(b).display !== 'none', dev: isl.brume.devoilees, prets: isl.casesPretes().length, jalon: document.querySelector('.brume-jalon').textContent }; });
  check(pret.pret && pret.bouton && pret.dev === avant.dev, `passage prêt : rien de dévoilé, le bouton « Lever la brume » est là (${pret.prets} cases prêtes ; « ${pret.jalon} »)`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/brume_passage_pret.png` });
  await page.evaluate(() => document.querySelector('.brume-lever').click()); await page.waitForTimeout(2500);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/brume_partie.png` });
  const dev = await page.evaluate(() => { const isl = window.CS.scenes.current.isl; return { n: isl.brume.devoilees, pret: isl.passagePret, saisons: isl.seasonsPassed.length, bouton: document.querySelector('.brume-lever').classList.contains('hidden') }; });
  check(dev.n > avant.dev && !dev.pret && dev.saisons === avant.saisons + 1 && dev.bouton, `le bouton lève la brume : ${dev.n - avant.dev} cases dévoilées, la saison passe, le bouton se range`);

  // jusqu'au bout, puis le bilan
  await joue(200); await page.waitForTimeout(1500);
  await passerLaCarte(page);
  await page.waitForFunction(() => window.CS.scenes.currentName === 'results', null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const bilan = await page.evaluate(() => ({ scene: window.CS.scenes.currentName, txt: (document.querySelector('.panel-results') || {}).textContent || '', best: window.CS.Save.data.brume.claire.best }));
  check(bilan.scene === 'results', 'la partie va au bilan');
  check(/Cases dévoilées/.test(bilan.txt) && /Sous la brume/.test(bilan.txt), 'le bilan dit ce que la brume cachait');
  check(bilan.best > 0, `le meilleur score du cran est gardé (${bilan.best})`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/brume_bilan.png`, fullPage: true });

  // B-H : avec le tutoriel, la partie s'ouvre sur la mini-énigme ; deux poses imposées, un jalon juste, la brume levée, puis la vraie île
  await page.evaluate(() => window.CS.Game.showMenu()); await page.waitForTimeout(600);
  await page.evaluate(() => [...document.querySelectorAll('.menu-nav .btn')].find((e) => e.textContent.startsWith('Sous la brume')).click());
  await page.waitForTimeout(600);
  await page.evaluate(() => { const c = document.querySelector('.panel-brume .tp-tuto input'); c.checked = true; document.querySelector('.brume-cran .btn').click(); });
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' && window.CS.scenes.current.isl && window.CS.scenes.current.def.enigme, null, { timeout: 30000 });
  const etape = (id) => page.waitForFunction((id) => { const sc = window.CS.scenes.current; return sc.tutorial && sc.tutorial.current && sc.tutorial.current.step.id === id; }, id, { timeout: 15000 });
  await etape('en1');
  const en = await page.evaluate(() => { const isl = window.CS.scenes.current.isl; return { fog: isl.board.fog.size, restrict: [...(isl.restrict || [])].join(), main: isl.queue.list.map((t) => t.family).join() }; });
  check(en.fog === 3 && en.restrict === '0,0' && en.main === 'forest,forest,forest,forest,forest', `l'énigme s'ouvre : trois cases cachées, la case qui brille, une main de forêts (${JSON.stringify(en)})`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/brume_enigme.png` });
  await page.evaluate(() => window.CS.scenes.current.isl.place(0, 0)); await etape('en2');
  await page.evaluate(() => window.CS.scenes.current.isl.place(-1, 2)); await etape('en3');
  const croises = await page.evaluate(() => { const isl = window.CS.scenes.current.isl; return [isl.board.get(0, 0).indice, isl.board.get(-1, 2).indice]; });
  check(croises[0] === 1 && croises[1] === 0, `les deux indices croisés disent 1 et 0 (${croises})`);
  await page.evaluate(() => window.CS.scenes.current.isl.planterJalon(1, -1, 'forest')); await etape('en4'); await page.waitForTimeout(1200);
  const en4 = await page.evaluate(() => ({ txt: document.querySelector('.tuto-text').textContent, toutes: window.CS.scenes.current.renderer.porteesToutes, pret: window.CS.scenes.current.isl.passagePret }));
  check(/^Juste/.test(en4.txt) && en4.pret, `un jalon juste est expliqué, le passage est prêt (« ${en4.txt.slice(0, 40)}… »)`);
  await page.evaluate(() => document.querySelector('.tuto-ok').click()); await etape('en5');
  await page.evaluate(() => document.querySelector('.brume-lever').click()); await etape('en6'); await page.waitForTimeout(1200);
  const en6 = await page.evaluate(() => ({ justes: window.CS.scenes.current.isl.brume.justes, fog: window.CS.scenes.current.isl.board.fog.size, txt: document.querySelector('.tuto-text').textContent }));
  check(en6.justes === 1 && en6.fog === 0 && /Jalon juste/.test(en6.txt), 'la brume levée : jalon juste, tout dévoilé, la dernière carte explique');
  await page.evaluate(() => document.querySelector('.tuto-ok').click());
  await page.waitForFunction(() => { const sc = window.CS.scenes.current; return window.CS.scenes.currentName === 'island' && sc.isl && sc.def.brume && !sc.def.enigme; }, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  const vraie = await page.evaluate(() => { const sc = window.CS.scenes.current; return { fog: sc.isl.board.fog.size, tuto: sc.tutorial.enabled, carte: !!document.querySelector('.tuto-card') }; });
  check(vraie.fog >= 5 && vraie.tuto, `l'énigme finie mène à la vraie île, avec son tutoriel (${vraie.fog} cases cachées)`);

  await b.close();
  console.log(errors.length ? `\n${errors.length} échec(s) :\n${errors.join('\n')}` : '\nSous la brume au navigateur : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})();
