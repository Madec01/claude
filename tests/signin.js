// Écran de connexion : vérifie qu'on ne tourne PAS en boucle (choisir Google → revenir sur l'écran de choix → recommencer).
// Le SDK Firebase n'est pas joignable depuis cet environnement : c'est justement le cas à couvrir, celui où la
// redirection ne rapporte rien. Usage : node tests/signin.js   (serveur statique sur http://127.0.0.1:8765/ requis)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://127.0.0.1:8765/index.html';
const errors = []; const check = (ok, m) => { if (!ok) errors.push(m); console.log(`${ok ? 'OK ' : 'KO '} ${m}`); };

const cloudOf = (page) => page.evaluate(() => { try { return (JSON.parse(localStorage.getItem('cent-saisons.save') || '{}').cloud) || null; } catch (_) { return null; } });
const onSignIn = (page) => page.evaluate(() => !!document.querySelector('.panel-signin'));
const boot = (page) => page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 90000 });

(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(URL); await boot(page);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload(); await boot(page); await page.waitForTimeout(900);

  check(await onSignIn(page), 'premier lancement : l’écran de connexion s’affiche');

  // Google sur un navigateur qui bloque la fenêtre surgissante : le jeu redirige.
  // Le choix DOIT être noté avant que la page ne parte, sinon on revient sur cet écran indéfiniment.
  await page.evaluate(() => { window.CS.Cloud.signInGoogle = async (o) => { if (o && o.beforeRedirect) o.beforeRedirect(); return 'redirect'; }; });
  await page.evaluate(() => [...document.querySelectorAll('.panel-signin .signin-card')][0].click());
  await page.waitForTimeout(400);
  const pending = await cloudOf(page);
  check(pending && pending.pending === 'google', `la redirection est notée avant de quitter la page (${JSON.stringify(pending)})`);

  // retour de chez Google — ici le SDK ne répond pas, donc la connexion n'aboutit pas
  await page.reload(); await boot(page); await page.waitForTimeout(2000);
  const after = await cloudOf(page);
  check(after && !after.pending, 'au retour, la redirection en attente est consommée (pas de boucle)');
  const shown = await page.evaluate(() => { const e = document.querySelector('.panel-signin .signin-err'); return e && !e.classList.contains('hidden') ? e.textContent : null; });
  check(!!shown, `l’échec est expliqué au lieu de revenir en silence : « ${shown} »`);
  check(await page.evaluate(() => [...document.querySelectorAll('.panel-signin .signin-card')].every((c) => !c.disabled)), 'les trois choix restent cliquables');

  // la sortie de secours marche : hors ligne → menu, et le choix est retenu
  await page.evaluate(() => [...document.querySelectorAll('.panel-signin .signin-card')][2].click());
  await page.waitForFunction(() => window.CS.scenes.currentName === 'menu', null, { timeout: 15000 });
  check(!(await onSignIn(page)), 'le choix « hors ligne » mène au menu');
  await page.reload(); await boot(page); await page.waitForTimeout(1200);
  check(!(await onSignIn(page)) && (await page.evaluate(() => window.CS.scenes.currentName)) === 'menu', 'au relancement suivant, le jeu va droit au menu');

  await b.close();
  console.log(errors.length ? `\n${errors.length} problème(s) :\n` + errors.join('\n') : '\nConnexion : aucune boucle.');
  process.exit(errors.length ? 1 : 0);
})();
