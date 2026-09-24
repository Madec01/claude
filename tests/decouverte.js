// Ce que le jeu ouvre sans le dire. Le jeu se joue surtout au téléphone : il n'y a pas d'infobulle, donc tout
// ce qui ne s'écrit pas à l'écran n'existe pas. On vérifie ici que les modes, l'Atelier, l'étoile d'or et
// « poser sur une tuile déjà posée » se voient.
// Usage : node tests/decouverte.js   (serveur statique sur http://127.0.0.1:8765/)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://127.0.0.1:8765/index.html';
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };
const boot = (p) => p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });

/** Écrit une sauvegarde et relance la page. */
async function save(page, campaign, extra = {}) {
  await page.evaluate(([c, x]) => {
    const s = JSON.parse(localStorage.getItem('cent-saisons.save') || '{}');
    s.cloud = { choice: 'none', uid: null, pending: null };
    s.options = Object.assign(s.options || {}, { testMode: false, skipTutorial: true, master: 0 });
    s.campaign = Object.assign(s.campaign || {}, { prologueSeen: true }, c);
    Object.assign(s, x);
    s.version = 3; localStorage.setItem('cent-saisons.save', JSON.stringify(s));
  }, [campaign, extra]);
  await page.reload(); await boot(page); await page.waitForTimeout(700);
}
const btn = (page, label) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('.menu-nav .btn')].find((x) => x.textContent.startsWith(l));
  return b ? { txt: b.textContent, sub: (b.querySelector('.btn-sub') || {}).textContent || '', neuf: !!b.querySelector('.btn-sub.btn-new'), ferme: !!b.disabled } : null;
}, label);

(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 420, height: 880 } })).newPage();   // taille de téléphone : pas d'infobulle
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(URL); await boot(page);

  // --- 1. un mode fermé DIT quand il s'ouvre, en toutes lettres
  await save(page, { unlockedIsland: 3, stars: { 1: 2, 2: 1 }, plays: { 1: 1, 2: 1 }, islandsPlayed: 2, announced: ['mode_garden', 'postcard'] });
  const jour = await btn(page, 'Île du jour'), inf = await btn(page, 'Île infinie');
  check(!!jour && jour.ferme && /île 5/.test(jour.sub), `Île du jour fermée : le bouton dit quand (« ${jour && jour.sub} »)`);
  check(!!inf && inf.ferme && /île 6/.test(inf.sub), `Île infinie fermée : le bouton dit quand (« ${inf && inf.sub} »)`);
  check(!!jour && !/\(/.test(jour.sub) && jour.sub.length < 30, `et la phrase tient sur une ligne au téléphone (${jour && jour.sub.length} signes)`);

  // --- 2. un mode ouvert jamais essayé se signale
  await save(page, { unlockedIsland: 9, stars: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 1, 7: 1, 8: 1 }, plays: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 }, islandsPlayed: 8 }, { seen: {} });
  const jour2 = await btn(page, 'Île du jour');
  check(!!jour2 && !jour2.ferme && jour2.neuf, `Île du jour ouverte et jamais jouée : marquée « ${jour2 && jour2.sub} »`);
  // une fois le mode lancé, la pastille disparaît
  await page.evaluate(() => window.CS.Game.noteMode('mode_daily'));
  await page.evaluate(() => window.CS.Game.showMenu()); await page.waitForTimeout(500);
  const jour3 = await btn(page, 'Île du jour');
  check(!!jour3 && !jour3.neuf, 'une fois le mode essayé, la pastille « nouveau » s’éteint');

  // --- 3. la bannière annonce ce qui vient de s'ouvrir, et une seule fois
  const ann = await page.evaluate(() => {
    const c = window.CS.Save.campaign; c.announced = []; c.islandsPlayed = 8; c.unlockedIsland = 12;
    window.CS.Save.data.infinite.unlocked = true;
    const n = window.CS.Game.announceUnlocks();
    const encore = window.CS.Game.announceUnlocks();
    return { n, encore, liste: [...c.announced] };
  });
  check(ann.n >= 3, `la bannière annonce ce qui s’est ouvert (${ann.n} : ${ann.liste.join(', ')})`);
  check(ann.encore === 0, 'et ne le répète jamais');
  await page.waitForTimeout(400);
  const bann = await page.evaluate(() => { const e = document.querySelector('.ach-banner'); return e ? e.textContent : null; });
  check(!!bann && /Mode ouvert|Atelier|Bon à savoir/.test(bann), `la bannière est bien à l’écran (« ${(bann || '').slice(0, 50)}… »)`);

  // --- 4. l'Atelier dit ce que le chapitre vient d'ouvrir
  await page.evaluate(() => window.CS.scenes.go('workshop', { onContinue: () => {} }));
  await page.waitForTimeout(600);
  const atl = await page.evaluate(() => ({
    chap: (document.querySelector('.ws-chap') || {}).textContent || '',
    neuves: document.querySelectorAll('.ws-card.ws-new').length,
    fermees: document.querySelectorAll('.ws-card.locked').length,
  }));
  check(/Chapitre 3/.test(atl.chap) && /amélioration/.test(atl.chap), `l’Atelier annonce la moisson du chapitre (« ${atl.chap.slice(0, 70)}… »)`);
  check(atl.neuves >= 1, `les nouvelles améliorations sont marquées (${atl.neuves})`);
  check(atl.fermees >= 1, `les suivantes restent visibles, grisées, avec leur chapitre (${atl.fermees})`);

  // --- 5. en jeu : « poser sur une tuile déjà posée » se voit
  await save(page, { unlockedIsland: 15, stars: { 11: 2 }, plays: { 11: 1 }, islandsPlayed: 11, seeds: 20, announced: ['mode_garden', 'mode_daily', 'mode_infinite', 'postcard'] });
  await page.evaluate(() => window.CS.Game.startIsland(11, { skipIntro: true }));   // l'île qui introduit bâtir
  await page.waitForTimeout(900);
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island' || [...document.querySelectorAll('button')].some((x) => x.textContent.includes('C’est parti')), null, { timeout: 25000 });
  await page.evaluate(() => { const x = [...document.querySelectorAll('button')].find((y) => y.textContent.includes('C’est parti')); if (x) x.click(); });
  await page.waitForFunction(() => window.CS.scenes.currentName === 'island', null, { timeout: 25000 });
  // on pose une quinzaine de tuiles, puis on force la tuile courante à valoir une tuile posée
  const cible = await page.evaluate(() => {
    const isl = window.CS.scenes.current.isl;
    for (let k = 0; k < 15 && !isl.ended; k++) {
      if (isl.current && isl.current.work) { isl.toShed(); continue; }
      let best = null, bs = -Infinity;
      for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } }
      if (!best || !isl.place(best.q, best.r)) break;
    }
    // une tuile de la même famille qu'une tuile posée : bâtir devient possible
    const posee = [...isl.board.tiles.values()].find((t) => !t.rare && !t.work && (t.level || 1) === 1);
    if (isl.current && posee) { isl.current.family = posee.family; isl.current.variant = posee.variant || 1; isl.current.rare = false; isl.board.touch(); }
    isl.breaths = Math.max(isl.breaths, 3);
    const t = isl.buildTargets();
    return { n: t.length, genres: [...new Set(t.map((x) => x.kind))] };
  });
  check(cible.n > 0, `la tuile du moment peut aller sur ${cible.n} tuile(s) déjà posée(s) (${cible.genres.join(', ')})`);
  await page.waitForTimeout(700);
  const pastille = await page.evaluate(() => {
    const el = document.querySelector('.qtile.current .q-onto') || document.querySelector('.qtile .q-onto');
    return el ? { txt: el.textContent, titre: el.getAttribute('title') || '' } : null;
  });
  check(!!pastille, `la file le montre par une pastille (« ${pastille ? pastille.txt : 'ABSENTE'} »)`);
  check(!!pastille && /pose/i.test(pastille.titre), 'et l’explique au survol pour qui a une souris');
  // le plateau entoure les tuiles visées
  const trace = await page.evaluate(() => {
    const R = window.CS.scenes.current.renderer; let n = 0;
    const ctx = { save() {}, restore() {}, beginPath() { n++; }, moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, fill() {}, setLineDash() {}, strokeStyle: '', fillStyle: '', lineWidth: 0 };
    R.drawBuildTargets(ctx);
    return n;
  });
  check(trace > 0, `le plateau entoure les tuiles visées (${trace} contour(s))`);

  // --- 6. l'étoile d'or se montre dès deux étoiles
  const or = await page.evaluate(async () => {
    const { buildResults } = await import('/src/ui/results.js');
    const faux = (stars) => ({ island: 4, stars, gold: false, goldThreshold: 300, thresholds: [100, 200, 260], score: 210, cells: 40, filled: 38, seasons: 4, placements: 38, wishesDone: 0, wishesTotal: 0, stats: { closed: 3, biggestRegion: 4, faunaMax: 2 }, tally: { edges: 100 } });
    const txt = (s) => buildResults({ result: faux(s), def: { id: 4, name: 'Essai' }, onContinue: () => {}, onRetry: () => {}, onMenu: () => {} }).textContent;
    return { deux: txt(2), une: txt(1) };
  });
  check(/étoile d’or/i.test(or.deux), 'à deux étoiles, l’étoile d’or se nomme et dit son prix');
  check(!/étoile d’or/i.test(or.une), 'à une étoile, on n’en parle pas encore');

  await b.close();
  console.log(errors.length ? `\n${errors.length} problème(s) :\n` + errors.join('\n') : '\nDécouverte : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})();
