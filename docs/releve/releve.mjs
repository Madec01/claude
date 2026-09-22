// Relève des pépins : Firestore → issues GitHub.
//
// CE FICHIER NE VIT PAS DANS LE DÉPÔT DU JEU. Il est à poser à la racine du dépôt PRIVÉ `cent-saisons-bugs`,
// avec `.github/workflows/pepins.yml`. Il est gardé ici pour qu'on le retrouve, et pour qu'il soit versionné avec
// la spécification qu'il applique (docs/SECTION_BUGS.md § 9).
// Ce qu'il fait, à chaque passage :
//   1. lit les documents de la collection `pepins`, du plus ancien au plus récent, vingt au plus ;
//   2. écrit les images dans rapports/AAAA-MM/ et les valide en UN commit pour tout le lot ;
//   3. ouvre une issue par rapport, étiquetée par le chemin des tuiles choisies ;
//   4. efface le document Firestore — mais SEULEMENT si l'issue a bien été créée.
//
// Le SDK d'administration n'est pas soumis aux règles Firestore : c'est lui, et lui seul, qui peut lire et effacer.

import admin from 'firebase-admin';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const PAR_PASSAGE = 20;
const [OWNER, REPO] = (process.env.GITHUB_REPOSITORY || '').split('/');
const TOKEN = process.env.GITHUB_TOKEN;
const BRANCHE = process.env.GITHUB_REF_NAME || 'main';

if (!process.env.FIREBASE_SERVICE_ACCOUNT) { console.error('Secret FIREBASE_SERVICE_ACCOUNT manquant.'); process.exit(1); }
if (!TOKEN || !OWNER) { console.error('Jeton GitHub ou dépôt manquant.'); process.exit(1); }

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const git = (...args) => execFileSync('git', args, { stdio: 'inherit' });
const court = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Les étiquettes d'un rapport : le mode, le chemin à ses trois niveaux, le raccourci, et deux marqueurs utiles. */
function etiquettes(r) {
  const out = new Set([r.mode === 'idee' ? 'idée' : 'pépin']);
  for (const chemin of r.tuiles || []) {
    const parts = String(chemin).split('/');
    for (let i = 1; i <= parts.length; i++) out.add(parts.slice(0, i).join('/'));
  }
  if (r.raccourci) out.add(r.raccourci);
  if (r.erreurs && r.erreurs.length) out.add('plantage');
  if (r.partie) out.add('avec-partie');
  return [...out].map((s) => court(s, 50));
}

/** Le corps de l'issue : la phrase d'abord, la partie rejouable repliée à la fin (elle est longue, on la copie). */
function corps(r, urlImage) {
  const L = [];
  L.push(`> ${String(r.mot || '').split('\n').join('\n> ')}`, '');
  if (r.tuiles && r.tuiles.length) L.push(`**Sujet** — ${r.tuiles.join(' · ')}`, '');
  const i = r.ile;
  L.push('| | |', '|---|---|');
  if (i) {
    L.push(`| Île | ${i.nom || '?'}${i.id ? ` (n° ${i.id}${i.chapitre ? `, chapitre ${i.chapitre}` : ''})` : ''} |`);
    L.push(`| Mode | ${i.mode}${i.semis ? ` · semis ${i.semis}` : ''}${i.climat ? ` · climat ${i.climat}` : ''} |`);
    L.push(`| Moment | ${i.saison}${i.regle ? ` · ${i.regle}` : ''}${i.meteo ? ` · ${i.meteo}` : ''} · pose ${i.poses} |`);
    L.push(`| Score | ${i.score} pts · ${i.souffles} souffle(s) |`);
  } else L.push(`| Où | ${r.ou || 'hors partie'} |`);
  L.push(`| Version | ${r.jeu} |`);
  L.push(`| Appareil | ${court(String(r.appareil?.ua || ''), 160)} |`);
  L.push(`| Écran | ${r.appareil?.largeur}×${r.appareil?.hauteur} · dpr ${r.appareil?.dpr} · \`${r.appareil?.classes}\`${r.appareil?.plein_ecran ? ' · plein écran' : ''} |`);
  L.push(`| Nuage | ${r.nuage?.mode || '—'} (${r.nuage?.etat || '—'}) |`);
  L.push('');
  if (urlImage) L.push(`[Voir l'écran au moment du pépin](${urlImage})`, '');
  // Les pistes de code : déduites des tuiles que le joueur a touchées, et invisibles pour lui. C'est le
  // renseignement qui fait gagner le plus de temps — savoir OÙ regarder avant d'avoir à le chercher.
  if (r.pistes && r.pistes.length) {
    L.push('**Où regarder** — d’après les tuiles choisies :', '', ...r.pistes.map((f) => `- \`${f}\``), '');
  }
  if (r.questions && r.questions.length) L.push('<details><summary>Questions posées</summary>', '', ...r.questions.map((q) => `- ${q}`), '', '</details>', '');
  if (r.erreurs && r.erreurs.length) {
    L.push('### Erreurs relevées par le jeu', '');
    for (const e of r.erreurs) L.push('```', `${e.message}`, `${e.source || '?'}${e.ligne ? `:${e.ligne}${e.colonne ? `:${e.colonne}` : ''}` : ''}  (scène : ${e.scene || '?'}, ${e.quand})`, e.pile || '', '```', '');
  }
  if (r.journal && r.journal.length) L.push('<details><summary>Les trente derniers événements de l’île</summary>', '', '```', ...r.journal, '```', '', '</details>', '');
  L.push('<details><summary>Réglages et progression</summary>', '', '```json', JSON.stringify({ reglages: r.reglages, progression: r.progression }, null, 1), '```', '', '</details>', '');
  if (r.partie) L.push('<details><summary>La partie, pour la rejouer (Options → Mode test → Ouvrir un rapport)</summary>', '', '```json', JSON.stringify(r.partie), '```', '', '</details>', '');
  L.push('', `*${r.mode === 'idee' ? 'Idée' : 'Pépin'} ${r.code} · relevé le ${new Date().toISOString().slice(0, 16).replace('T', ' ')}*`);
  // Une seconde corde à l'arc pour la notification. L'assignation en déclenche une, la mention aussi — mais ce
  // sont deux catégories distinctes dans les réglages de GitHub, et l'une peut être coupée sans l'autre. Deux
  // chances valent mieux qu'une pour un rapport qu'on ne doit pas rater.
  L.push('', `@${OWNER}`);
  return L.join('\n');
}

async function ouvrirIssue(titre, body, labels) {
  const appel = (payload) => fetch(`https://api.github.com/repos/${OWNER}/${REPO}/issues`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  // t'assigner, c'est ce qui déclenche la notification sur ton téléphone (application GitHub)
  let res = await appel({ title: titre, body, labels, assignees: [OWNER] });
  // une étiquette qui n'existe pas encore est normalement créée à la volée ; si le serveur s'en plaint, on ouvre
  // l'issue sans étiquettes plutôt que de perdre le rapport
  if (!res.ok) { console.warn(`issue refusée (${res.status}), nouvel essai sans étiquettes ni assignation`); res = await appel({ title: titre, body }); }
  if (!res.ok) throw new Error(`GitHub ${res.status} : ${court(await res.text(), 300)}`);
  return (await res.json()).number;
}

/**
 * LE TABLEAU DES ÉTATS : le seul retour possible vers celui qui a signalé quelque chose.
 *
 * Rien ne part avec un rapport qui permettrait de le joindre — ni nom, ni adresse, ni identifiant : c'est la
 * règle, et elle ne bouge pas. On ne peut donc rien lui POUSSER. Le seul fil qui le relie à son pépin est le
 * code gardé sur son appareil, et c'est par là que passe la réponse : on publie un document public
 * `code → état`, le jeu le croise avec sa propre liste, et lui seul y reconnaît quelque chose.
 *
 * Ce document ne porte QUE des codes et des états. Jamais un titre, jamais la phrase d'un joueur : le carnet
 * est privé exprès — pour que les mots du testeur, son téléphone et ses réglages ne soient pas sur la place
 * publique. Y ajouter un titre « pour faire plus clair » annulerait cette décision sans qu'on s'en aperçoive.
 * C'est la seule chose à ne pas faire dans cette fonction.
 */
async function publierEtats() {
  const etat = (i) => {
    if (i.state === 'closed') return i.state_reason === 'not_planned' ? 'ecarte' : 'corrige';
    const labels = (i.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
    if (labels.includes('claude')) return 'encours';   // le commanditaire l'a confié à Claude
    return i.comments > 0 ? 'lu' : 'recu';             // quelqu'un a répondu, ou rien encore
  };
  const table = {};
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/issues?state=all&per_page=100&page=${page}`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error(`GitHub ${res.status} : ${court(await res.text(), 200)}`);
    const lot = await res.json();
    for (const i of lot) {
      if (i.pull_request) continue;                    // une PR n'est pas un rapport
      const m = /^(?:PÉPIN|IDÉE)-([A-Z0-9]{4})/.exec(i.title || '');
      if (m) table[m[1]] = etat(i);
    }
    if (lot.length < 100) break;
  }
  await db.collection('etats').doc('tableau').set(table);   // set, pas merge : un code retiré doit disparaître
  console.log(`états publiés : ${Object.keys(table).length} code(s).`);
}

const snap = await db.collection('pepins').orderBy('at').limit(PAR_PASSAGE).get();
// même sans rapport neuf, les états ont pu changer depuis le tour d'avant : une issue fermée, une étiquette
// posée. C'est le cas le plus fréquent, et c'était celui qui sautait la publication.
if (snap.empty) {
  console.log('Aucun pépin à relever.');
  try { await publierEtats(); } catch (e) { console.error(`états non publiés : ${e.message}`); }
  process.exit(0);
}
console.log(`${snap.size} rapport(s) à relever.`);

// 1. les images, puis UN commit pour tout le lot : l'URL de l'image n'est valable qu'une fois poussée
const lots = [];
for (const doc of snap.docs) {
  const d = doc.data();
  let r; try { r = JSON.parse(d.rapport); } catch (e) { console.warn(`${doc.id} : rapport illisible, laissé en place`); continue; }
  let chemin = null;
  if (d.image) {
    const mois = new Date(d.at || Date.now()).toISOString().slice(0, 7);
    mkdirSync(`rapports/${mois}`, { recursive: true });
    chemin = `rapports/${mois}/${r.mode === 'idee' ? 'IDEE' : 'PEPIN'}-${r.code}.jpg`;
    writeFileSync(chemin, Buffer.from(d.image, 'base64'));
  }
  lots.push({ doc, r, chemin });
}
if (lots.some((l) => l.chemin)) {
  git('config', 'user.name', 'Relève des pépins');
  git('config', 'user.email', 'noreply@github.com');
  git('add', 'rapports');
  try { git('commit', '-m', `rapports : ${lots.filter((l) => l.chemin).length} image(s)`); git('push'); }
  catch (e) { console.warn('images non poussées, les issues porteront le texte seul'); for (const l of lots) l.chemin = null; }
}

// 2. une issue par rapport, puis on efface le document — dans cet ordre, jamais l'inverse
let ok = 0;
for (const { doc, r, chemin } of lots) {
  const prefixe = r.mode === 'idee' ? 'IDÉE' : 'PÉPIN';
  const phrase = court(String(r.mot || '').replace(/\s+/g, ' ').trim(), 70);
  const ou = r.ile ? `île ${r.ile.id || r.ile.nom || '?'}` : (r.ou || 'hors partie');
  const titre = court(`${prefixe}-${r.code} · « ${phrase} » · ${ou}`, 250);
  const urlImage = chemin ? `https://github.com/${OWNER}/${REPO}/blob/${BRANCHE}/${chemin}` : null;
  try {
    const n = await ouvrirIssue(titre, corps(r, urlImage), etiquettes(r));
    await doc.ref.delete();     // le rapport vit désormais dans GitHub, et nulle part ailleurs
    console.log(`#${n}  ${titre}`);
    ok++;
  } catch (e) {
    console.error(`${r.code} : ${e.message} — le document reste, il repassera au tour suivant`);
  }
}
console.log(`${ok}/${lots.length} relevé(s).`);
// en dernier, pour que les issues qui viennent d'être ouvertes y figurent déjà. Un échec ici ne doit pas faire
// passer la relève au rouge : les rapports, eux, sont bien arrivés.
try { await publierEtats(); } catch (e) { console.error(`états non publiés : ${e.message}`); }
process.exit(ok === lots.length ? 0 : 1);
