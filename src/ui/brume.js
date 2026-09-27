// Sous la brume : le choix du cran (avant la partie) et la fiche d'une case cachée (jalon, crayon).
import { h, button, append } from './dom.js';
import { STORY } from '../data/story.js';
import { FAMILY_COLORS } from '../data/tiles.js';
import { Save } from '../core/save.js';
import { CRANS, NOMS_COULEURS, TRESORS, P, pts, normaliserNote } from '../game/brume.js';

const nom = (f) => (f === 'tresor' ? 'Trésor' : (STORY.tiles[f] || {}).name || f);

/** Le choix du cran, avec les règles en quelques lignes et le meilleur score de chacun. */
export function buildBrumeChoice({ onPick, onBack }) {
  const best = (id) => ((Save.data.brume || {})[id] || {}).best || 0;
  const root = h('div', { class: 'panel panel-brume' });
  const dejaVu = !!((Save.data.seen || {}).tuto_brume); const tuto = h('input', { type: 'checkbox' }); tuto.checked = !dejaVu && !Save.options.skipTutorial;   // cochée d'office la première fois, sauf si le joueur saute les tutoriels ; il peut toujours la cocher
  const carte = (id, lignes) => {
    const c = CRANS[id];
    const b = button(c.nom, () => {
      // la brume se forme (le solveur tourne dans un worker) : les boutons se ferment, le panneau le dit
      if (root.classList.contains('busy')) return;
      root.classList.add('busy'); root.querySelectorAll('button').forEach((x) => { x.disabled = true; });
      root.querySelector('.panel-actions').before(h('p', { class: 'brume-attente' }, 'La brume se forme… un instant.'));
      onPick(id, tuto.checked);
    }, { cls: id === 'claire' ? 'btn-primary btn-big' : 'btn-big', iconName: 'icon_play' });
    return h('div', { class: 'brume-cran' }, b, h('ul', {}, ...lignes.map((l) => h('li', {}, l))), best(id) ? h('p', { class: 'brume-best' }, `Meilleur score : ${best(id)} pts`) : null);
  };
  append(root,
    h('div', { class: 'res-kicker' }, 'Mode à part'),
    h('h2', { class: 'panel-title' }, 'Sous la brume'),
    h('p', { class: 'res-line' }, 'Des cases de l’île cachent des tuiles déjà là. Tu sais ce qu’elles cachent, jamais où. Une tuile posée contre la brume dit combien de ses voisines cachées sont de sa famille : choisir sa tuile, c’est choisir sa question.'),
    h('ul', { class: 'brume-regles' },
      h('li', {}, 'Cinq poses par saison. Au passage de saison, une case assez entourée se dévoile et compte comme posée : ses bords valent double.'),
      h('li', {}, `Un jalon par saison : touche une case de brume et annonce sa famille. Juste : ${pts(P.jalonJuste)}. Faux : ${pts(P.jalonFaux)}.`),
      h('li', {}, 'Le crayon coche ou barre des familles sur une case, gratuitement. Déplacer une tuile coûte la prochaine tuile, et une tuile déplacée contre la brume lit un nouvel indice.'),
      h('li', {}, `Un trésor se cache aussi : ${pts(P.tresor)} au dévoilement, et il ne répond à aucun chiffre. À la fin, chaque case restée cachée : ${pts(P.cachee)}.`)),
    h('div', { class: 'brume-crans' },
      carte('claire', ['Inventaire exact', 'Un indice à chaque pose contre la brume', 'Dévoilée à 2 voisines', 'Jalon facultatif']),
      carte('epaisse', ['Inventaire par couleur', 'Un indice à chaque pose contre la brume', 'Dévoilée à 3 voisines', `Jalon obligatoire (sinon ${pts(P.jalonManque)})`])),
    h('label', { class: 'tp-tuto' }, tuto, h('span', {}, dejaVu ? 'Revoir le tutoriel pas à pas' : 'Avec le tutoriel pas à pas (première fois)')),
    h('div', { class: 'panel-actions' }, button('Menu', onBack, { cls: 'btn-ghost', iconName: 'icon_home' })),
  );
  return root;
}

/** La fiche d'une case cachée : planter le jalon de la saison, ou noter au crayon. */
export function buildBrumePicker({ isl, q, r, onJalon, onNote, onLongueVue, onClose }) {
  const B = isl.brume; const k = `${q},${r}`;
  const fams = isl.famillesAnnoncables();   // sous Nuit noire, la liste ne dépend pas de ce qui est caché (rien ne fuit par la fiche)
  const puce = (f, fn, etat = '') => {
    const b = h('button', { class: `gpick ${etat} ${f === 'tresor' || TRESORS.includes(f) ? 'tresor' : ''}`, style: `--fam:${FAMILY_COLORS[f] || '#b8862b'}`, title: etat === 'on' ? 'cochée : encore possible (toucher pour barrer)' : etat === 'off' ? 'barrée : exclue (toucher pour retirer)' : 'toucher pour cocher' }, nom(f));
    b.addEventListener('click', (e) => { e.stopPropagation(); fn(f); });
    return b;
  };
  const jal = B.jalons.get(k);
  // le crayon : chaque famille se coche (encore possible), puis se barre (exclue), puis se retire ; la fiche reste ouverte
  const etatDe = (f) => { const n = normaliserNote(B.crayon.get(k)); return !n ? '' : n.oui.includes(f) ? 'on' : n.non.includes(f) ? 'off' : ''; };
  const suivant = { '': 'oui', on: 'non', off: null };
  let listeCrayon = null;
  const crayonListe = () => h('div', { class: 'gpick-list' }, ...fams.map((f) => puce(f, (x) => { onNote(x, suivant[etatDe(x)]); refaireCrayon(); }, etatDe(f))), normaliserNote(B.crayon.get(k)) ? puce('', () => { onNote(null); refaireCrayon(); }) : null);
  const refaireCrayon = () => { if (!listeCrayon) return; const n = crayonListe(); listeCrayon.replaceWith(n); listeCrayon = n; if (normaliserNote(B.crayon.get(k))) n.lastElementChild.textContent = 'Effacer'; };
  const S = B.saison || {};
  const inv = S.nuit ? 'nuit noire, l’inventaire est caché' : isl.inventaireBrume.map((e) => `${e.n} ${e.id === 'tresor' ? 'trésor' : NOMS_COULEURS[e.id] || nom(e.id).toLowerCase()}`).join(' · ');
  const root = h('div', { class: 'panel panel-brume-case' });
  const voisines = isl.fogAround(q, r).length;
  const posees = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].filter(([dq, dr]) => isl.board.get(q + dq, r + dr)).length;
  append(root,
    h('h2', { class: 'panel-title' }, 'Case sous la brume'),
    h('p', { class: 'res-line' }, `Voisines posées : ${posees} / ${isl.seuilDevoile()} pour se dévoiler au passage de saison${voisines ? ` · ${voisines} voisine${voisines > 1 ? 's' : ''} sous la brume` : ''}.`),
    h('p', { class: 'brume-inv-line' }, `Caché : ${inv}`),
    S.longueVue ? h('div', { class: 'brume-section brume-longue-vue' }, h('h3', {}, 'Longue-vue : cette case peut se dévoiler tout de suite'), button('Dévoiler cette case', () => onLongueVue && onLongueVue(), { cls: 'btn-primary', iconName: 'icon_sun' })) : null,
    jal ? h('p', { class: 'brume-jalon-line' }, `Jalon planté : ${nom(jal)}`)
      : isl.canJalon(q, r) ? h('div', { class: 'brume-section' }, h('h3', {}, `Planter le jalon de la saison (juste : ${pts(P.jalonJuste)} ; faux : ${pts(P.jalonFaux)})`), h('div', { class: 'gpick-list' }, ...fams.map((f) => puce(f, onJalon))))
      : h('p', { class: 'brume-jalon-line' }, B.jalonSaison ? 'Le jalon de cette saison est déjà planté.' : ''),
    S.crayonBloque ? h('p', { class: 'brume-jalon-line' }, 'Crayon effacé : pas de note cette saison.')
      : h('div', { class: 'brume-section' }, h('h3', {}, S.crayonSur ? 'Noter au crayon : coche ce qui reste possible, barre ce qui est exclu (Crayon sûr : ta première note te dira si elle est juste)' : 'Noter au crayon : coche ce qui reste possible, barre ce qui est exclu (sans effet sur les points)'),
        (listeCrayon = crayonListe())),
    h('div', { class: 'panel-actions' }, button('Fermer', onClose, { cls: 'btn-primary', iconName: 'icon_return' })),
  );
  // le bouton « effacer » n'a pas de famille : on lui donne son nom
  if (listeCrayon && normaliserNote(B.crayon.get(k))) listeCrayon.lastElementChild.textContent = 'Effacer';
  return root;
}
