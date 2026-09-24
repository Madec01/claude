// Sous la brume : le choix du cran (avant la partie) et la fiche d'une case cachée (jalon, crayon).
import { h, button, append } from './dom.js';
import { STORY } from '../data/story.js';
import { FAMILY_COLORS } from '../data/tiles.js';
import { Save } from '../core/save.js';
import { CRANS, COULEURS, NOMS_COULEURS, TRESORS, P } from '../game/brume.js';

const nom = (f) => (f === 'tresor' ? 'Trésor' : (STORY.tiles[f] || {}).name || f);

/** Le choix du cran, avec les règles en quelques lignes et le meilleur score de chacun. */
export function buildBrumeChoice({ onPick, onBack }) {
  const best = (id) => ((Save.data.brume || {})[id] || {}).best || 0;
  const root = h('div', { class: 'panel panel-brume' });
  const carte = (id, lignes) => {
    const c = CRANS[id];
    const b = button(c.nom, () => {
      // la brume se forme (le solveur tourne dans un worker) : les boutons se ferment, le panneau le dit
      if (root.classList.contains('busy')) return;
      root.classList.add('busy'); root.querySelectorAll('button').forEach((x) => { x.disabled = true; });
      root.querySelector('.panel-actions').before(h('p', { class: 'brume-attente' }, 'La brume se forme… un instant.'));
      onPick(id);
    }, { cls: id === 'claire' ? 'btn-primary btn-big' : 'btn-big', iconName: 'icon_play' });
    return h('div', { class: 'brume-cran' }, b, h('ul', {}, ...lignes.map((l) => h('li', {}, l))), best(id) ? h('p', { class: 'brume-best' }, `Meilleur score : ${best(id)} pts`) : null);
  };
  append(root,
    h('div', { class: 'res-kicker' }, 'Mode à part'),
    h('h2', { class: 'panel-title' }, 'Sous la brume'),
    h('p', { class: 'res-line' }, 'Des cases de l’île cachent des tuiles déjà là. Tu sais ce qu’elles cachent, jamais où. Une tuile posée contre la brume dit combien de ses voisines cachées sont de sa famille : choisir sa tuile, c’est choisir sa question.'),
    h('ul', { class: 'brume-regles' },
      h('li', {}, 'Cinq poses par saison. Au passage de saison, une case assez entourée se dévoile et compte comme posée : ses bords valent double.'),
      h('li', {}, `Un jalon par saison : touche une case de brume et annonce sa famille. Juste : +${P.jalonJuste} et ses bords valent triple. Faux : ${P.jalonFaux}.`),
      h('li', {}, 'Le crayon note une case, gratuitement. Déplacer une tuile coûte la prochaine tuile, et une tuile déplacée contre la brume lit un nouvel indice.'),
      h('li', {}, `Un trésor se cache aussi : +${P.tresor} au dévoilement. À la fin, chaque case restée cachée : ${P.cachee}.`)),
    h('div', { class: 'brume-crans' },
      carte('claire', ['Inventaire exact', 'Un indice à chaque pose contre la brume', 'Dévoilée à 2 voisines', 'Jalon facultatif']),
      carte('epaisse', ['Inventaire par couleur', 'Un indice une pose sur deux', 'Dévoilée à 3 voisines', `Jalon obligatoire (sinon ${P.jalonManque})`])),
    h('div', { class: 'panel-actions' }, button('Menu', onBack, { cls: 'btn-ghost', iconName: 'icon_home' })),
  );
  return root;
}

/** Les familles qu'on peut annoncer sur une case : celles de l'inventaire, ou toutes celles des couleurs annoncées. */
export function famillesPossibles(isl) {
  const B = isl.brume; if (!B) return [];
  const inv = isl.inventaireBrume;
  if (B.cran.inventaire !== 'couleur') return inv.map((e) => e.id);
  const out = [];
  for (const e of inv) {
    if (e.id === 'tresor') out.push('tresor');
    else for (const [f, c] of Object.entries(COULEURS)) if (c === e.id) out.push(f);
  }
  return out;
}

/** La fiche d'une case cachée : planter le jalon de la saison, ou noter au crayon. */
export function buildBrumePicker({ isl, q, r, onJalon, onNote, onClose }) {
  const B = isl.brume; const k = `${q},${r}`;
  const fams = famillesPossibles(isl);
  const puce = (f, fn, on = false) => {
    const b = h('button', { class: `gpick ${on ? 'on' : ''} ${f === 'tresor' || TRESORS.includes(f) ? 'tresor' : ''}`, style: `--fam:${FAMILY_COLORS[f] || '#b8862b'}` }, nom(f));
    b.addEventListener('click', (e) => { e.stopPropagation(); fn(f); });
    return b;
  };
  const jal = B.jalons.get(k), note = B.crayon.get(k);
  const inv = isl.inventaireBrume.map((e) => `${e.n} ${e.id === 'tresor' ? 'trésor' : NOMS_COULEURS[e.id] || nom(e.id).toLowerCase()}`).join(' · ');
  const root = h('div', { class: 'panel panel-brume-case' });
  const voisines = isl.fogAround(q, r).length;
  const posees = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].filter(([dq, dr]) => isl.board.get(q + dq, r + dr)).length;
  append(root,
    h('h2', { class: 'panel-title' }, 'Case sous la brume'),
    h('p', { class: 'res-line' }, `Voisines posées : ${posees} / ${B.cran.devoile} pour se dévoiler au passage de saison${voisines ? ` · ${voisines} voisine${voisines > 1 ? 's' : ''} sous la brume` : ''}.`),
    h('p', { class: 'brume-inv-line' }, `Caché : ${inv}`),
    jal ? h('p', { class: 'brume-jalon-line' }, `Jalon planté : ${nom(jal)}`)
      : isl.canJalon(q, r) ? h('div', { class: 'brume-section' }, h('h3', {}, `Planter le jalon de la saison (juste : +${P.jalonJuste}, bords ×3 ; faux : ${P.jalonFaux})`), h('div', { class: 'gpick-list' }, ...fams.map((f) => puce(f, onJalon))))
      : h('p', { class: 'brume-jalon-line' }, B.jalonSaison ? 'Le jalon de cette saison est déjà planté.' : ''),
    h('div', { class: 'brume-section' }, h('h3', {}, 'Noter au crayon (sans effet sur les points)'),
      h('div', { class: 'gpick-list' }, ...fams.map((f) => puce(f, onNote, note === f)), note ? puce(null, () => onNote(null)) : null)),
    h('div', { class: 'panel-actions' }, button('Fermer', onClose, { cls: 'btn-primary', iconName: 'icon_return' })),
  );
  // le bouton « effacer » n'a pas de famille : on lui donne son nom
  const eff = root.querySelectorAll('.brume-section .gpick-list')[1]?.lastElementChild; if (note && eff) eff.textContent = 'Effacer';
  return root;
}
