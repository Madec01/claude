// Le Souffle court, avant l'île : ce qu'il faut faire et les règles, en cinq lignes, à chaque partie. Puis « C'est parti »
// — et sur l'île, le décompte.
import { h, button, icon, append } from './dom.js';
import { BALANCE } from '../data/balance.js';
import { Save } from '../core/save.js';

const MOTS = { 3: 'trois', 5: 'cinq', 8: 'huit' };

export function buildTempoPrep({ onStart, onBack }) {
  const T = BALANCE.tempo; const S = Save.data.tempo || {}; const serie = S.bestSerie || 0;
  // le temps par tuile : trois, cinq ou huit secondes, retenu d'une partie à l'autre ; un meilleur score par temps
  let cadran = [3, 5, 8].includes(S.cadran) ? S.cadran : 3;
  const bestDe = (c) => ((S.bests || {})[c]) || (c === 3 ? S.best || 0 : 0);
  const paliers = T.paliers.map(([n, k]) => `×${k} à ${n}`).join(', ');
  const regle = (ic, titre, texte) => h('div', { class: 'tp-regle' }, icon(ic), h('div', {}, h('b', {}, titre), h('span', {}, texte)));
  const root = h('div', { class: 'panel panel-wishes-intro panel-tempo' });
  const intro = h('p', {}); const titreCadran = h('b', {}); const meilleur = h('span', {});
  const choix = h('div', { class: 'tp-cadrans' });
  // le tutoriel pas à pas : coché la première fois, à la demande ensuite
  const dejaVu = !!((Save.data.seen || {}).tuto_tempo); const tuto = h('input', { type: 'checkbox' }); tuto.checked = !dejaVu && !Save.options.skipTutorial;   // cochée d'office la première fois, sauf si le joueur saute les tutoriels ; il peut toujours la cocher
  const tutoLigne = h('label', { class: 'tp-tuto' }, tuto, h('span', {}, dejaVu ? 'Revoir le tutoriel pas à pas' : 'Avec le tutoriel pas à pas (première fois)'));
  const maj = () => {
    intro.textContent = `Pas de file. La tuile arrive, et tu as ${MOTS[cadran]} secondes pour la poser. Le but : le plus de points possible — vite, et bien.`;
    titreCadran.textContent = `${cadran} secondes par tuile`;
    const best = bestDe(cadran);
    meilleur.textContent = best ? `À chaque partie. Ton meilleur à ${cadran} s : ${best} points, série de ${serie}.` : 'À chaque partie. Le meilleur score, tout court — un par temps choisi.';
    for (const b of choix.children) b.classList.toggle('on', Number(b.dataset.cadran) === cadran);
  };
  for (const c of [3, 5, 8]) { const b = h('button', { class: 'tp-cadran', 'data-cadran': String(c) }, `${c} s`); b.addEventListener('click', (e) => { e.stopPropagation(); cadran = c; if (Save.data.tempo) { Save.data.tempo.cadran = c; Save.save(); } maj(); }); choix.appendChild(b); }
  append(root,
    h('div', { class: 'res-kicker' }, 'Mode'),
    h('h2', { class: 'panel-title' }, 'Le Souffle court'),
    h('p', { class: 'prep-story' }, intro),
    h('div', { class: 'tp-choix' }, h('span', {}, 'Temps par tuile'), choix),
    tutoLigne,
    h('div', { class: 'tp-regles' },
      h('div', { class: 'tp-regle' }, icon('icon_target'), h('div', {}, titreCadran, h('span', {}, `Le temps se lit juste au-dessus de l’île : le chiffre, et la marée qui se retire. À zéro, la tuile est perdue et sa case restera vide : −${T.vide} par case à la fin, −${T.vide + T.videBloque} si elle seule empêchait une région de fermer, −${T.videRegion} par case quand les vides se touchent.`))),
      regle('icon_star', 'La série', `Posée sous ${T.sousSeconde} seconde, la série monte — deux fois plus vite si la place est bonne. Elle multiplie les points de la tuile : ${paliers}. Hésiter la casse.`),
      regle('icon_leaf', 'Les saisons', `Cinq poses chacune, leurs primes comptent double, +${T.saisonPleine} sans tuile perdue. L’hiver gèle le cadran (×${T.hiver}), le printemps propose deux tuiles, l’été te donne ${T.ete} secondes à répartir, l’automne couvre l’île de brume.`),
      regle('icon_wind', 'Rien d’autre', 'Ni souffle, ni vœu, ni bâtir : les points des bords, des régions, de la faune et des saisons, comme sur toute île.'),
      h('div', { class: 'tp-regle' }, icon('icon_medal'), h('div', {}, h('b', {}, 'Une île neuve'), meilleur)),
    ),
    h('div', { class: 'panel-actions' }, button('C’est parti', () => onStart(cadran, tuto.checked), { cls: 'btn-primary btn-big', iconName: 'icon_play' }), button('Menu', onBack, { cls: 'btn-ghost', iconName: 'icon_home' })),
  );
  maj();
  return root;
}
