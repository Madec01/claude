// QA de la section « Pépins et idées », en viewport de téléphone (iPhone 12).
// Vérifie l'entonnoir de tuiles, les questions pré-remplies, le sélecteur de mode, le plafond de quatre tuiles,
// la boîte noire et le repli en téléchargement quand rien ne peut partir en ligne.
// Usage : node tests/pepin.js   (serveur statique sur http://127.0.0.1:8765/ requis)
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'output'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/index.html';
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); console.log(`${ok ? 'OK ' : 'KO '} ${msg}`); };

/** Ouvre le jeu hors ligne (rien ne doit partir pendant un test) et arrive à la section. */
async function openSection(page) {
  await page.goto(URL);
  await page.waitForSelector('.panel-signin, .menu', { timeout: 30000 });
  if (await page.$('.panel-signin')) { await page.click('.signin-card.ghost'); await page.waitForTimeout(900); }
  await page.waitForSelector('.menu', { timeout: 20000 });
  await page.click('.menu-row .btn:has-text("Options")');
  await page.waitForSelector('.panel-options', { timeout: 10000 });
  await page.click('.opt-group:has-text("Pépins et idées") .btn:has-text("Ouvrir")');
  await page.waitForSelector('.panel-report', { timeout: 10000 });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 12'] });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(e.message));

  await openSection(page);
  check(await page.$('.rep-tabs'), 'le sélecteur de mode est là, « Un pépin » d’abord');
  check(await page.$eval('.rep-tab.on', (e) => e.textContent.trim()) === 'Un pépin', 'le mode par défaut est « Un pépin » : signaler ne coûte aucun toucher de plus');
  check((await page.$$('.rep-chip')).length === 4, 'quatre raccourcis en accès direct');

  // --- l'entonnoir : trois niveaux au plus, et le fil d'Ariane remonte
  await page.click('.rep-tile:has-text("Graphisme")');
  await page.click('.rep-tile:has-text("Sprites et décor")');
  await page.waitForTimeout(150);
  const crumbs = await page.$$eval('.rep-crumb', (a) => a.map((x) => x.textContent.trim()));
  check(crumbs.join('>') === 'Tout>Graphisme>Sprites et décor', `le fil d’Ariane suit la descente (${crumbs.join(' › ')})`);
  check(await page.$('.rep-tile.rep-all'), 'la branche entière peut s’embarquer (« Tout : … »)');

  await page.click('.rep-tile:has-text("Forêt et arbres")');
  await page.waitForTimeout(200);
  const sujet = await page.$eval('.rep-subject-list', (e) => e.textContent);
  check(sujet.includes('Graphisme · Sprites et décor · Forêt et arbres'), 'la tuile touchée descend dans le sujet, avec son chemin complet');
  const texte = await page.$eval('.rep-text', (e) => e.value);
  check(texte.includes('Quelle saison ?') && texte.includes('hexagone'), 'les questions de la feuille sont déposées dans le commentaire');
  await page.screenshot({ path: path.join(OUT, 'pepin-mobile-arbre.png') });

  // --- ce que le joueur a tapé n'est jamais écrasé
  await page.fill('.rep-text', 'les arbres sont bleus');
  await page.click('.rep-crumb:has-text("Tout")');
  await page.click('.rep-tile:has-text("Son et vibrations")');
  await page.click('.rep-tile:has-text("Musique")');
  await page.click('.rep-tile:has-text("La boucle")');
  await page.waitForTimeout(200);
  const texte2 = await page.$eval('.rep-text', (e) => e.value);
  check(texte2.startsWith('les arbres sont bleus'), 'le texte déjà tapé est conservé ; les nouvelles questions s’ajoutent dessous');
  check(texte2.includes('blanc ou un clic'), 'la deuxième tuile apporte ses propres questions');

  // --- retoucher une tuile la remonte
  await page.click('.rep-tile.on:has-text("La boucle")');
  await page.waitForTimeout(150);
  const sujet2 = await page.$eval('.rep-subject-list', (e) => e.textContent);
  check(!sujet2.includes('La boucle'), 'retoucher une tuile la retire du sujet');

  // --- quatre tuiles au plus : au-delà, c'est une liste de courses
  await page.click('.rep-crumb:has-text("Tout")');
  await page.click('.rep-tile:has-text("Textes")');
  await page.waitForTimeout(120);
  for (const nom of ['Faute d’orthographe', 'Texte coupé', 'Texte manquant', 'Texte trop petit']) {
    await page.click(`.rep-tile:has-text("${nom}")`); await page.waitForTimeout(80);
  }
  const chips = await page.$$eval('.rep-sel', (a) => a.length);
  check(chips === 4, `le sujet plafonne à quatre tuiles (${chips})`);
  check((await page.$eval('.rep-state', (e) => e.textContent)).includes('Quatre'), 'et le jeu le dit gentiment au lieu de refuser en silence');

  // --- le mode « idée » : mêmes tuiles, autres raccourcis, autres questions
  await page.click('.rep-tab:has-text("Une idée")');
  await page.waitForTimeout(250);
  const chipsIdee = await page.$$eval('.rep-chip', (a) => a.map((x) => x.textContent));
  check(chipsIdee.some((c) => c.includes('pas compris')), 'les raccourcis changent avec le mode (« Je n’ai pas compris »)');
  const texteIdee = await page.$eval('.rep-text', (e) => e.value);
  check(texteIdee.includes('Qu’est-ce que tu aimerais ?'), 'le trio commun du mode idée est déposé');
  check((await page.$eval('.rep-subject-list', (e) => e.textContent)).includes('Textes'), 'l’arbre et le sujet sont partagés entre les deux modes');
  check(await page.$eval('.rep-subject-head', (e) => e.textContent.includes('idée')), 'le sujet se renomme (« Sujet de ton idée »)');
  check(await page.$eval('.rep-check:has-text("Joindre la partie")', (e) => getComputedStyle(e).display === 'none'), 'la partie rejouable ne part pas avec une idée : il n’y a rien à rejouer');
  await page.screenshot({ path: path.join(OUT, 'pepin-mobile-idee.png') });

  // --- rien ne déborde au pouce
  const over = await page.evaluate(() => {
    const p = document.querySelector('.panel-report');
    return p.scrollWidth > window.innerWidth + 2;
  });
  check(!over, 'aucun débordement horizontal en portrait');
  const petits = await page.$$eval('.rep-tile, .rep-chip, .rep-tab', (a) => a.filter((e) => e.getBoundingClientRect().height < 40).length);
  check(petits === 0, `toutes les tuiles font au moins 40 px de haut (${petits} trop petites)`);

  // --- hors ligne : le rapport est téléchargé, jamais d'échec muet
  await page.click('.rep-tab:has-text("Un pépin")');
  await page.waitForTimeout(150);
  const dl = page.waitForEvent('download', { timeout: 15000 });
  await page.click('.panel-report .btn-primary:has-text("Envoyer")');
  const fichier = await dl.catch(() => null);
  check(!!fichier, 'hors ligne, le rapport est téléchargé au lieu d’échouer en silence');
  if (fichier) check(/^cent-saisons-pepin-\d{4}-\d{2}-\d{2}-[A-Z0-9]{4}\.txt$/.test(fichier.suggestedFilename()), `le fichier porte le code du pépin (${fichier.suggestedFilename()})`);
  await page.waitForSelector('.rep-code', { timeout: 10000 });
  const code = await page.$eval('.rep-code', (e) => e.textContent.trim());
  check(/^PÉPIN-[A-Z0-9]{4}$/.test(code), `le code court est affiché (${code})`);

  // --- le contenu du rapport : ce qu'il faut, et rien qui dise qui il est
  const rapport = await page.evaluate(async () => {
    const m = await import('/src/core/report.js');
    return m.buildReport({ mode: 'pepin', tuiles: ['graphisme/sprites/foret'], mot: 'test', sceneName: 'menu' });
  });
  check(rapport.tuiles[0] === 'graphisme/sprites/foret', 'le rapport porte le chemin de la tuile');
  check(!!rapport.appareil && !!rapport.reglages && !!rapport.progression, 'il joint l’appareil, les réglages et la progression');
  check(rapport.jeu && rapport.jeu !== 'inconnue', `il porte la version du jeu (${rapport.jeu})`);
  // rien qui dise qui il est : ni identifiant de compte, ni adresse. Écrit comme une assertion, pas comme une
  // relecture à l'œil — c'est la promesse faite sur l'écran de vie privée.
  const brut = JSON.stringify(rapport);
  const fuite = brut.match(/"uid"|"displayName"|[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  check(!fuite, `aucun identifiant ni adresse dans le rapport${fuite ? ` (trouvé : ${fuite[0]})` : ''}`);

  // --- la boîte noire attrape une erreur sans gêner le jeu
  const bb = await page.evaluate(async () => {
    const m = await import('/src/core/blackbox.js');
    m.BlackBox.note({ message: 'erreur de test', source: 'x.js', ligne: 12 });
    m.BlackBox.note({ message: 'erreur de test', source: 'x.js', ligne: 12 });
    const n = m.BlackBox.pending().length;
    m.BlackBox.clear();
    return n;
  });
  check(bb === 1, `la même erreur répétée ne compte qu’une fois (${bb})`);

  check(consoleErrors.length === 0, `aucune erreur console (${consoleErrors.slice(0, 2).join(' | ')})`);
  await browser.close();

  console.log(errors.length ? `\n${errors.length} problème(s) :\n- ${errors.join('\n- ')}` : '\nPépins et idées : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error('Échec du test :', e); process.exit(2); });
