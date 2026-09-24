// Le Souffle court, avant l'île : ce qu'il faut faire et les règles, en cinq lignes, à chaque partie. Puis « C'est parti »
// — et sur l'île, le décompte.
import { h, button, icon, append } from './dom.js';
import { BALANCE } from '../data/balance.js';
import { Save } from '../core/save.js';

export function buildTempoPrep({ onStart, onBack }) {
  const T = BALANCE.tempo; const best = (Save.data.tempo || {}).best || 0; const serie = (Save.data.tempo || {}).bestSerie || 0;
  const paliers = T.paliers.map(([n, k]) => `×${k} à ${n}`).join(', ');
  const regle = (ic, titre, texte) => h('div', { class: 'tp-regle' }, icon(ic), h('div', {}, h('b', {}, titre), h('span', {}, texte)));
  const root = h('div', { class: 'panel panel-wishes-intro panel-tempo' });
  append(root,
    h('div', { class: 'res-kicker' }, 'Mode'),
    h('h2', { class: 'panel-title' }, 'Le Souffle court'),
    h('p', { class: 'prep-story' }, h('p', {}, 'Pas de file. La tuile arrive, et tu as trois secondes pour la poser. Le but : le plus de points possible — vite, et bien.')),
    h('div', { class: 'tp-regles' },
      regle('icon_target', `${T.cadran} secondes par tuile`, `Le temps se lit sur la mer : une vague vient du large et déferle sur la côte quand il est écoulé. À zéro, la tuile est perdue et sa case restera vide : −${T.vide} par case à la fin, −${T.vide + T.videBloque} si elle seule empêchait une région de fermer, −${T.videRegion} par case quand les vides se touchent.`),
      regle('icon_star', 'La série', `Posée sous ${T.sousSeconde} seconde, la série monte — deux fois plus vite si la place est bonne. Elle multiplie les points de la tuile : ${paliers}. Hésiter la casse.`),
      regle('icon_leaf', 'Les saisons', `Cinq poses chacune, leurs primes comptent double, +${T.saisonPleine} sans tuile perdue. L’hiver gèle le cadran (×${T.hiver}), le printemps propose deux tuiles, l’été te donne ${T.ete} secondes à répartir, l’automne couvre l’île de brume.`),
      regle('icon_wind', 'Rien d’autre', 'Ni souffle, ni vœu, ni bâtir : les points des bords, des régions, de la faune et des saisons, comme sur toute île.'),
      regle('icon_medal', 'Une île neuve', best ? `À chaque partie. Ton meilleur : ${best} points, série de ${serie}.` : 'À chaque partie. Le meilleur score, tout court.'),
    ),
    h('div', { class: 'panel-actions' }, button('C’est parti', onStart, { cls: 'btn-primary btn-big', iconName: 'icon_play' }), button('Menu', onBack, { cls: 'btn-ghost', iconName: 'icon_home' })),
  );
  return root;
}
