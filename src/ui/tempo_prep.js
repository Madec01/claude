// Le Souffle court, avant l'île : ce qu'il faut faire et les règles, en cinq lignes, à chaque partie. Puis « C'est parti »
// — et sur l'île, le décompte.
import { h, button, icon, append } from './dom.js';
import { BALANCE } from '../data/balance.js';
import { Save } from '../core/save.js';
import { reserveEte, recordsTempo, seuilSerie, OBJECTIFS, fr } from '../data/tempo.js';
import { dailyKey } from '../data/daily.js';
import { STAGE } from '../core/stage.js';

const MOTS = { 3: 'trois', 5: 'cinq', 8: 'huit' };

const ETIQ = { 8: 'découverte', 5: 'normal', 3: 'défi' };

export function buildTempoPrep({ onStart, onTrain, onDefi, onBack }) {
  const T = BALANCE.tempo; const S = recordsTempo(Save.data.tempo || {});
  // le temps par tuile : trois, cinq ou huit secondes, retenu d'une partie à l'autre ; un meilleur score par temps
  // 8 s la toute première fois (on reconnaît une tuile avant de courir), puis le délai choisi, retenu d'une partie à l'autre
  const choisi = !!S.cadranChoisi || (S.parties || 0) > 0;
  let cadran = choisi && [3, 5, 8].includes(S.cadran) ? S.cadran : 8;
  // un record par délai, jamais celui d'un autre délai à sa place
  const bestDe = (c) => (S.bests || {})[c] || 0; const serieDe = (c) => (S.series || {})[c] || 0;
  const paliers = T.paliers.map(([n, k]) => `×${fr(k)} à ${n}`).join(', ');
  const regle = (ic, titre, texte) => h('div', { class: 'tp-regle' }, icon(ic), h('div', {}, h('b', {}, titre), h('span', {}, texte)));
  const root = h('div', { class: 'panel panel-wishes-intro panel-tempo' });
  const intro = h('p', {}); const titreCadran = h('b', {}); const meilleur = h('span', {}); const saisons = h('span', {}); const serieTxt = h('span', {});
  // au doigt : poser d'un seul toucher (option propre au mode ; la confirmation reste le réglage par défaut)
  const unToucher = h('input', { type: 'checkbox' }); unToucher.checked = !!S.unToucher; unToucher.addEventListener('change', () => { if (Save.data.tempo) { Save.data.tempo.unToucher = unToucher.checked; Save.save(); } });
  const toucherLigne = STAGE.touch || STAGE.compact ? h('label', { class: 'tp-tuto tp-toucher' }, unToucher, h('span', {}, 'Poser d’un seul toucher (sans confirmation)')) : null;
  // un objectif personnel, au choix : rien à gagner, un « atteint » ou « manqué » au bilan
  const objectif = h('select', { class: 'tp-objectif' }, h('option', { value: '' }, 'Sans objectif'), ...OBJECTIFS.map((o) => h('option', { value: o.id }, o.nom)));
  objectif.value = S.objectif && OBJECTIFS.some((o) => o.id === S.objectif) ? S.objectif : '';
  objectif.addEventListener('change', () => { if (Save.data.tempo) { Save.data.tempo.objectif = objectif.value || null; Save.save(); } });
  const objectifLigne = h('label', { class: 'tp-tuto tp-objectif-ligne' }, h('span', {}, 'Objectif personnel'), objectif);
  const defiBest = ((S.defi || {}).best || {})[dailyKey()] || 0;
  const choix = h('div', { class: 'tp-cadrans' });
  // le tutoriel pas à pas : coché la première fois, à la demande ensuite
  const dejaVu = !!((Save.data.seen || {}).tuto_tempo); const tuto = h('input', { type: 'checkbox' }); tuto.checked = !dejaVu && !Save.options.skipTutorial;   // cochée d'office la première fois, sauf si le joueur saute les tutoriels ; il peut toujours la cocher
  const tutoLigne = h('label', { class: 'tp-tuto' }, tuto, h('span', {}, dejaVu ? 'Revoir le tutoriel pas à pas' : 'Avec le tutoriel pas à pas (première fois)'));
  const maj = () => {
    intro.textContent = `Pas de file. La tuile arrive, et tu as ${MOTS[cadran]} secondes pour la poser. Le but : le plus de points possible — vite, et bien.`;
    titreCadran.textContent = `${cadran} secondes par tuile`;
    const best = bestDe(cadran);
    meilleur.textContent = best ? `À chaque partie. Ton meilleur à ${cadran} s : ${best} points, série de ${serieDe(cadran)}.` : `À chaque partie. Le meilleur score, tout court — un par temps choisi ; aucun encore à ${cadran} s.`;
    serieTxt.textContent = `Posée dans le premier tiers du temps (${fr(seuilSerie({ cadran }))} s à ${cadran} s), la série monte — deux fois plus vite si la place est bonne. Elle multiplie les points de la tuile : ${paliers}. Hésiter la casse.`;
    saisons.textContent = `Cinq poses chacune, leurs primes comptent double, +${T.saisonPleine} sans tuile perdue. L’hiver gèle le cadran (×${fr(T.hiver)}), le printemps propose deux tuiles, l’été te donne ${fr(reserveEte({ cadran }))} secondes à répartir (vide, ce qui reste à poser est perdu d’un coup), l’automne couvre l’île de brume.`;
    for (const b of choix.children) b.classList.toggle('on', Number(b.dataset.cadran) === cadran);
  };
  for (const c of [8, 5, 3]) { const b = h('button', { class: 'tp-cadran', 'data-cadran': String(c) }, `${c} s`, h('small', {}, ETIQ[c])); b.addEventListener('click', (e) => { e.stopPropagation(); cadran = c; if (Save.data.tempo) { Save.data.tempo.cadran = c; Save.data.tempo.cadranChoisi = true; Save.save(); } maj(); }); choix.appendChild(b); }
  append(root,
    h('div', { class: 'res-kicker' }, 'Mode'),
    h('h2', { class: 'panel-title' }, 'Le Souffle court'),
    h('p', { class: 'prep-story' }, intro),
    h('div', { class: 'tp-choix' }, h('span', {}, 'Temps par tuile'), choix),
    tutoLigne, toucherLigne, objectifLigne,
    h('div', { class: 'tp-regles' },
      h('div', { class: 'tp-regle' }, icon('icon_target'), h('div', {}, titreCadran, h('span', {}, `Le temps se lit juste au-dessus de l’île : le chiffre, et la marée qui se retire. À zéro, la tuile est perdue et sa case restera vide : −${T.vide} par case à la fin, −${T.vide + T.videBloque} si elle seule empêchait une région de fermer, −${T.videRegion} par case quand les vides se touchent.`))),
      h('div', { class: 'tp-regle' }, icon('icon_star'), h('div', {}, h('b', {}, 'La série'), serieTxt)),
      h('div', { class: 'tp-regle' }, icon('icon_leaf'), h('div', {}, h('b', {}, 'Les saisons'), saisons)),
      regle('icon_wind', 'Rien d’autre', 'Ni souffle, ni vœu, ni bâtir : les points des bords, des régions, de la faune et des saisons, comme sur toute île.'),
      h('div', { class: 'tp-regle' }, icon('icon_medal'), h('div', {}, h('b', {}, 'Une île neuve'), meilleur)),
    ),
    h('div', { class: 'panel-actions' }, button('C’est parti', () => { if (Save.data.tempo) { Save.data.tempo.cadran = cadran; Save.data.tempo.cadranChoisi = true; Save.save(); } onStart(cadran, tuto.checked, unToucher.checked, objectif.value || null); }, { cls: 'btn-primary btn-big', iconName: 'icon_play' }), onDefi ? button(defiBest ? `Défi du jour · ${defiBest}` : 'Défi du jour', () => onDefi(unToucher.checked, objectif.value || null), { iconName: 'icon_sun', title: 'La même île pour tout le monde, 5 secondes par tuile, un record par jour' }) : null, onTrain ? button('S’entraîner', onTrain, { iconName: 'icon_target', title: 'Six poses guidées sans chrono, puis douze à 8 secondes ; sans record' }) : null, button('Menu', onBack, { cls: 'btn-ghost', iconName: 'icon_home' })),
  );
  maj();
  return root;
}
