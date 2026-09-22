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

/** Deux parties déjà jouées, posées sur l'appareil avant le lancement : de quoi tester le choix de la partie. */
const PARTIES_JOUEES = [
  { v: 1, at: Date.now() - 20 * 60000, where: { kind: 'campaign', id: 3 }, title: 'Partie de test B', finie: true, isl: { placements: 34, season: 'summer', score: 120 } },
  { v: 1, at: Date.now() - 3 * 3600000, where: { kind: 'campaign', id: 2 }, title: 'Partie de test A', finie: false, isl: { placements: 12, season: 'winter', score: 40 } },
];

/** Ouvre le jeu hors ligne (rien ne doit partir pendant un test) et arrive à la section. */
// ---- les pistes de code, vérifiées côté Node : chaque fichier cité doit exister pour de bon.
// Une piste morte est pire que pas de piste — elle envoie le correcteur sur une fausse route, et il la suit
// d'autant plus volontiers qu'elle a l'air d'un renseignement sûr.
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'src/data/bug_tree.js'), 'utf8');
  const bloc = src.slice(src.indexOf('export const CODE = {'), src.indexOf('/** Les pistes de code'));
  const fichiers = [...bloc.matchAll(/'([^']*?\.(?:js|json|css|rules|html))(?: \([^)]*\))?'/g)].map((m) => m[1]);
  const morts = [...new Set(fichiers)].filter((f) => !fs.existsSync(path.join(__dirname, '..', f)));
  check(fichiers.length > 40, `les pistes de code sont renseignées (${fichiers.length} fichiers cités)`);
  check(morts.length === 0, `toutes les pistes pointent un fichier qui existe${morts.length ? ` — introuvables : ${morts.join(', ')}` : ''}`);
}

// ---- le tableau des états : ce qu'on publie ne doit JAMAIS porter autre chose que des codes et des états.
// Le carnet est privé exprès ; un titre ou la phrase d'un joueur sur un document lisible par tous annulerait
// cette décision sans bruit. On lit donc la fonction qui l'écrit, et on vérifie ce qu'elle y met.
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'docs/releve/releve.mjs'), 'utf8');
  const bloc = src.slice(src.indexOf('async function publierEtats'), src.indexOf('const snap = await db'));
  check(/table\[m\[1\]\] = etat\(i\)/.test(bloc), 'le tableau des états n’associe qu’un code à un état');
  check(!/i\.title|i\.body|r\.mot/.test(bloc.replace(/exec\(i\.title[^)]*\)/g, '')), 'aucun titre ni aucune phrase de joueur ne part dans le tableau public');
  check(/\.set\(table\)/.test(bloc), 'le document est remplacé, pas fusionné : un code retiré disparaît');
}

async function openSection(page) {
  await page.addInitScript((list) => {
    try { localStorage.setItem('cent-saisons.runs', JSON.stringify({ v: 1, list })); } catch (_) { /* sans importance */ }
  }, PARTIES_JOUEES);
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
  check(await page.$eval('.rep-histo', (e) => e.classList.contains('hidden')), '« Tes envois » ne s’affiche pas tant qu’on n’a rien envoyé');

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

  // --- la recherche : un mot doit suffire à couper dans 240 feuilles
  await page.fill('.rep-search-input', 'montagne');
  await page.waitForTimeout(250);
  const res = await page.$$eval('.rep-result b', (a) => a.map((x) => x.textContent));
  check(res[0] === 'Roche et montagnes', `la recherche trouve la bonne tuile en tête (${res[0]})`);
  check(await page.$eval('.rep-crumbs', (e) => e.classList.contains('hidden')), 'le fil d’Ariane s’efface pendant la recherche : on ne fouille pas deux choses à la fois');
  const chemins = await page.$$eval('.rep-result small', (a) => a.map((x) => x.textContent));
  check(chemins.some((c) => c.includes('›')), 'chaque résultat dit le chemin qui y mène (« Rivière » existe en dessin ET en calcul)');
  await page.fill('.rep-search-input', 'lag');
  await page.waitForTimeout(250);
  const motsCourants = await page.$$eval('.rep-result b', (a) => a.map((x) => x.textContent).join(' | '));
  check(/rame|Lenteur/i.test(motsCourants), `un mot que l’arbre n’emploie pas trouve quand même (« lag » → ${motsCourants.split('|')[0].trim()})`);
  check(!/Autre chose/.test(motsCourants), '« Autre chose » ne remonte jamais dans une recherche');
  await page.fill('.rep-search-input', 'zzzz');
  await page.waitForTimeout(250);
  check(await page.$('.rep-noresult'), 'sans résultat, le jeu le dit et renvoie vers le commentaire libre');
  await page.click('.rep-search-x');
  await page.waitForTimeout(200);
  check(await page.$eval('.rep-crumbs', (e) => !e.classList.contains('hidden')), 'effacer la recherche rend l’arbre');

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

  // --- on doit pouvoir défiler : le panneau compact est une colonne à overflow caché (css/mobile.css), il lui
  // faut UN enfant défilant. Sans ça, rien ne bougeait — c'est le premier pépin qu'on m'a signalé sur la section.
  const defile = await page.evaluate(() => {
    const p = document.querySelector('.panel-report'), b = document.querySelector('.rep-body'), g = document.querySelector('.rep-grid');
    const boite = (e) => ({ h: e.scrollHeight, c: e.clientHeight, o: getComputedStyle(e).overflowY });
    p.scrollTop = 0; b.scrollTop = 0;
    b.scrollTop = 400;                                   // un défileur réel accepte qu'on le pousse
    const bouge = b.scrollTop > 0 || (p.scrollTop = 400, p.scrollTop > 0);
    p.scrollTop = 0; b.scrollTop = 0;
    return { panneau: boite(p), corps: boite(b), grille: boite(g), bouge };
  });
  check(defile.corps.h > defile.corps.c + 2 || defile.panneau.h > defile.panneau.c + 2, 'le contenu dépasse la fenêtre : il y a bien de quoi défiler');
  check(defile.bouge, 'le panneau défile vraiment (un enfant porte overflow, il n’est pas juste caché)');
  check(defile.grille.o === 'visible', 'la grille n’est PAS un second défileur : un seul, pour que le doigt ne se batte pas');
  await page.evaluate(() => { document.querySelector('.rep-body').scrollTop = 0; });
  const envoiVisible = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.panel-report .btn')].find((x) => x.textContent.includes('Envoyer'));
    const r = b.getBoundingClientRect();
    return r.bottom <= innerHeight + 1 && r.top >= -1;
  });
  check(envoiVisible, 'le bouton « Envoyer » reste posé en bas, sans avoir à défiler');

  // --- la partie à joindre : un pépin se raconte souvent l'île finie, et c'est la partie d'AVANT qu'il faut montrer
  await page.click('.rep-tab:has-text("Un pépin")');
  await page.waitForTimeout(150);
  await page.click('.rep-pli > summary');
  await page.waitForTimeout(150);
  const choix = await page.$$eval('.rep-select option', (a) => a.map((o) => o.textContent));
  check(choix.length === 2, `les parties déjà jouées sont proposées (${choix.length})`);
  check(/Partie de test B/.test(choix[0] || '') && /34 tuiles/.test(choix[0] || ''), `la plus récente vient en tête, avec de quoi la reconnaître (${choix[0]})`);
  const jointe = await page.evaluate(async () => {
    const m = await import('/src/core/report.js');
    const liste = m.partiesPossibles();
    const r = m.buildReport({ mode: 'pepin', tuiles: [], mot: 'test', partie: liste[1].partie });
    return r.partie && r.partie.title;
  });
  check(jointe === 'Partie de test A', `la partie choisie est bien celle qui part (${jointe})`);

  // --- l'image apportée : le jeu ne sait photographier que son canvas, le HUD est du DOM par-dessus et n'y
  // paraît jamais. Pour un pépin d'interface, la capture du téléphone montre ce que le jeu ne peut pas montrer.
  await page.click('.rep-image .toggle');
  await page.waitForTimeout(100);
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.setInputFiles('.rep-file input[type=file]', { name: 'ecran.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForTimeout(200);
  check(await page.$eval('.rep-file-name', (e) => e.textContent) === 'ecran.png', 'l’image choisie est nommée à l’écran');
  check(!(await page.$eval('.rep-image .toggle', (e) => e.checked)), 'une seule image part : la capture de l’écran se décoche d’elle-même');
  const jpeg = await page.evaluate(async () => {
    const m = await import('/src/core/report.js');
    const cvs = document.createElement('canvas'); cvs.width = 40; cvs.height = 30;
    const blob = await new Promise((r) => cvs.toBlob(r, 'image/png'));
    const data = await m.imageFichier(new File([blob], 'x.png', { type: 'image/png' }), { mot: 'test', code: 'TEST' });
    return (data || '').slice(0, 22);
  });
  check(jpeg === 'data:image/jpeg;base64', `l’image apportée est rendue au format du rapport (${jpeg})`);
  await page.click('.rep-file .rep-link');
  await page.waitForTimeout(150);
  check(await page.$eval('.rep-file .rep-link', (e) => e.classList.contains('hidden')), 'on peut la retirer');

  // --- hors ligne : le rapport est téléchargé, jamais d'échec muet
  await page.waitForTimeout(100);
  const dl = page.waitForEvent('download', { timeout: 15000 });
  await page.click('.panel-report .btn-primary:has-text("Envoyer")');
  const fichier = await dl.catch(() => null);
  check(!!fichier, 'hors ligne, le rapport est téléchargé au lieu d’échouer en silence');
  if (fichier) check(/^cent-saisons-pepin-\d{4}-\d{2}-\d{2}-[A-Z0-9]{4}\.txt$/.test(fichier.suggestedFilename()), `le fichier porte le code du pépin (${fichier.suggestedFilename()})`);
  await page.waitForSelector('.rep-code', { timeout: 10000 });
  const code = await page.$eval('.rep-code', (e) => e.textContent.trim());
  check(/^PÉPIN-[A-Z0-9]{4}$/.test(code), `le code court est affiché (${code})`);
  check((await page.$eval('.rep-thanks', (e) => e.textContent)).includes('Tes envois'), 'le merci dit où le code se retrouve, au lieu de compter sur la mémoire du joueur');

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

  // --- le garde-fou de taille : un rapport encore trop gros après retrait de la partie doit RENDRE LA MAIN,
  // pas se rappeler sans fin. Sans ce contrôle, l'écran qui sert à signaler les gels gelait l'onglet.
  const trop = await page.evaluate(async () => {
    const m = await import('/src/core/report.js');
    const { Save } = await import('/src/core/save.js');
    // sans ça, l'envoi s'arrête sur « hors ligne » AVANT le contrôle de taille, et le test passerait sans rien
    // prouver. On se place donc juste après les refus qui précèdent, pour atteindre le contrôle visé.
    const avant = (Save.data.cloud || {}).choice;
    Save.data.cloud = { ...(Save.data.cloud || {}), choice: 'anon' };
    const gros = { version: 1, mode: 'pepin', code: 'TEST', at: '', mot: 'x'.repeat(200000), tuiles: [], questions: [] };
    const fini = await Promise.race([
      m.envoyerRapport(gros, null).then((r) => r.raison || 'sans-raison'),
      new Promise((res) => setTimeout(() => res('BOUCLE'), 5000)),
    ]);
    Save.data.cloud = { ...(Save.data.cloud || {}), choice: avant };
    return fini;
  });
  check(trop === 'trop-gros', `un rapport trop gros rend la main au lieu de boucler, et dit pourquoi (${trop})`);

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

  // --- « Tes envois » : le code ne s'affiche qu'une fois, et le carnet où le rapport arrive est privé. Sans cette
  // liste, celui qui a signalé quelque chose la semaine dernière n'a plus rien. On recharge la page pour être sûr
  // qu'elle survit à la fermeture de l'onglet, et pas seulement à l'écran courant.
  const note = await page.evaluate(async () => {
    const m = await import('/src/core/report.js');
    const l = m.journalEnvois();
    return l.length ? { n: l.length, code: l[0].code, voie: l[0].voie, mode: l[0].mode } : null;
  });
  check(note && note.n === 1, `l’envoi est noté sur l’appareil (${note ? note.n : 0})`);
  check(note && `PÉPIN-${note.code}` === code, 'la note porte le code affiché au joueur');
  check(note && note.voie === 'fichier', `elle retient qu’il n’est pas parti en ligne (${note && note.voie})`);

  await openSection(page);
  check(!(await page.$eval('.rep-histo', (e) => e.classList.contains('hidden'))), 'après un envoi, « Tes envois » est là au rechargement suivant');
  await page.click('.rep-histo > summary');
  await page.waitForTimeout(200);
  const carte = await page.$eval('.rep-histo-item', (e) => e.textContent);
  check(carte.includes(code), `la carte porte le code (${code})`);
  check(/Gardé sur ton appareil/.test(carte), 'et l’état que l’appareil connaît : gardé ici, pas parti au carnet');
  check(/Textes/.test(carte), 'avec le sujet choisi, pour reconnaître de quoi il s’agissait');
  check(/rien de ce que tu as écrit n’en ressort/.test(await page.$eval('.rep-histo-list', (e) => e.textContent)),
    'la liste dit ce que le carnet renvoie, et surtout ce qu’il ne renvoie pas');

  // ---- l'état du carnet : la pastille n'apparaît que pour un code connu, et le mot est celui du jeu
  await page.evaluate(() => {
    const j = JSON.parse(localStorage.getItem('cent-saisons.pepin.journal') || '{}');
    const code = ((j.list || [])[0] || {}).code;
    localStorage.setItem('cent-saisons.pepin.etats', JSON.stringify({
      v: 1, at: Date.now(), map: { [code]: 'corrige', ZZZZ: 'ecarte' }, vus: {},
    }));
  });
  // on recharge plutôt que de chercher un bouton de retour : « Oublier cette liste » porte les mêmes classes
  // que le retour, et un sélecteur trop large effacerait le journal qu'on s'apprête à lire
  await page.reload();
  await openSection(page);
  await page.click('.rep-histo > summary');
  await page.waitForTimeout(200);
  const pastilles = await page.$$eval('.rep-histo-suivi', (a) => a.map((e) => e.textContent));
  check(pastilles.length === 1 && pastilles[0] === 'Corrigé', `l’état du carnet s’affiche, et seulement pour SES codes (${pastilles.join(', ') || 'aucune'})`);

  // ---- et ce qu'on annonce au lancement.
  // Ouvrir la liste vaut avoir vu : rien ne doit plus être annoncé après. C'est vrai à cet instant précis,
  // puisqu'on vient de la lire — on le vérifie avant de remettre le compteur à zéro pour la suite.
  const dejaVu = await page.evaluate(async () => (await import('/src/core/report.js')).nouveautesEtats().length);
  check(dejaVu === 0, 'ce qu’il a vu dans la liste ne lui sera pas réannoncé au lancement');

  const nouv = await page.evaluate(async () => {
    const m = await import('/src/core/report.js');
    const c = m.etatsCache();
    localStorage.setItem('cent-saisons.pepin.etats', JSON.stringify({ v: 1, at: c.at, map: c.map, vus: {} }));
    const avant = m.nouveautesEtats().map((e) => e.etat);
    m.noterEtatsVus();
    return { avant, apres: m.nouveautesEtats().length };
  });
  check(nouv.avant.length === 1 && nouv.avant[0] === 'corrige', `un changement d’état est une nouvelle à annoncer (${nouv.avant.join(',')})`);
  check(nouv.apres === 0, 'dit une fois, plus jamais : on ne réveille pas le joueur deux fois pour la même nouvelle');

  // ---- ouvrir la liste force la relecture : le cache d'une journée est fait pour la relecture SILENCIEUSE,
  // pas pour celle qu'on demande. Sans ça, un joueur qui vient voir où ça en est lit la veille (retour du
  // commanditaire : « l'état ne change pas, ça fait dix minutes »).
  const frais = await page.evaluate(async () => {
    const m = await import('/src/core/report.js');
    const c = m.etatsCache();
    // cache vieux d'une heure : trop frais pour la relecture de fond, assez vieux pour celle qu'on demande
    localStorage.setItem('cent-saisons.pepin.etats', JSON.stringify({ v: 1, at: Date.now() - 3600000, map: c.map, vus: c.vus, lus: c.lus }));
    const silencieuse = await m.rafraichirEtats();          // doit renoncer : le cache est jeune
    return { silencieuse };
  });
  check(frais.silencieuse === false, 'la relecture de fond respecte le cache du jour');

  // ---- hors ligne par choix, on ne lit rien : il a décliné le nuage, ce n'est pas à nous d'y aller
  const horsLigne = await page.evaluate(async () => {
    const { Save } = await import('/src/core/save.js');
    const m = await import('/src/core/report.js');
    Save.data.cloud = { ...(Save.data.cloud || {}), choice: 'none' };
    return m.rafraichirEtats({ force: true });
  });
  check(horsLigne === false, 'le joueur qui a décliné le nuage ne déclenche aucune lecture');
  const debordeHisto = await page.evaluate(() => document.querySelector('.panel-report').scrollWidth > window.innerWidth + 2);
  check(!debordeHisto, 'la liste ne déborde pas au pouce');
  await page.screenshot({ path: path.join(OUT, 'pepin-mobile-envois.png') });
  await page.click('.rep-histo-foot .btn');
  await page.waitForTimeout(200);
  check(await page.$eval('.rep-histo', (e) => e.classList.contains('hidden')), 'et le joueur peut l’oublier : elle ne vit que sur son appareil');

  check(consoleErrors.length === 0, `aucune erreur console (${consoleErrors.slice(0, 2).join(' | ')})`);
  await browser.close();

  console.log(errors.length ? `\n${errors.length} problème(s) :\n- ${errors.join('\n- ')}` : '\nPépins et idées : tout est bon.');
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error('Échec du test :', e); process.exit(2); });
