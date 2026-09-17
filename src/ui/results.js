// Écran de résultats d'une nuit : rapport de la capitainerie sur parchemin.
import { h, button, icon, fmtInt, stagger } from './dom.js';
import { rule, corner, stamp } from './ornaments.js';
import { STORY } from '../data/story.js';
import { AudioSys } from '../core/audio.js';

/** append() du DOM insère le texte « null » pour un enfant nul : on filtre. */
const append = (el, ...kids) => el.append(...kids.filter(Boolean));

export function buildResults({ result, def, onContinue, onRetry, onMenu, newRecord }) {
  const { win, stats, stars } = result;
  const infinite = result.night === 'infinite';
  const root = h('div', { class: `panel parchment panel-results ${win ? 'win' : 'lose'}` });
  const loseLine = STORY.lose.generic[Math.floor(Math.random() * STORY.lose.generic.length)];
  const title = infinite ? 'La veille s’achève' : win ? 'L’aube se lève' : 'La mer a pris';
  const starsEl = h('div', { class: 'stars', 'aria-label': `${stars} étoile${stars > 1 ? 's' : ''} sur 3` }, ...[0, 1, 2].map((i) => h('span', { class: `star ${i < stars ? 'on' : ''}` }, icon('icon_star'))));
  const row = (label, value, cls = '') => h('div', { class: `res-row ${cls}` }, h('span', {}, label), h('b', {}, String(value)));
  const reasonText = !win ? (result.reason === 'yann' ? 'Le navire de Yann a sombré.' : result.reason === 'wrecks' ? 'Trop de navires perdus.' : `Quota non atteint (${stats.docked}/${def.quota}).`) : '';
  const stampEl = infinite ? stamp(`Vague ${result.wave}`, 'blue') : win ? stamp('Nuit tenue', 'green') : stamp('Perte', 'red');
  append(root, 
    corner('tl'), corner('tr'), corner('bl'), corner('br'),
    stampEl,
    h('div', { class: 'res-head' }, 'Capitainerie de Port-Aël'),
    h('div', { class: 'res-kicker' }, infinite ? `Veille infinie · vague ${result.wave}` : `Rapport de la nuit ${result.night}${STORY.nights[result.night] ? ' · ' + STORY.nights[result.night].title : ''}`),
    h('h2', { class: 'panel-title' }, title),
    rule(),
    win || infinite ? starsEl : h('p', { class: 'res-lose-line' }, loseLine),
    reasonText ? h('p', { class: 'res-reason' }, reasonText) : null,
    h('div', { class: 'res-grid' },
      row('Navires à quai', infinite ? stats.docked : `${stats.docked} / ${def.quota}`, 'good'),
      row('Naufrages', stats.wrecked, stats.wrecked ? 'bad' : ''),
      row('Écueils relevés', stats.revealed),
      row('Pages lues', stats.pages, stats.pages ? 'gold' : ''),
      row('Coups de corne', stats.hornBlows),
      row('Éclats gagnés', `+${stats.shards}`, 'gold'),
      row('Score', fmtInt(stats.score), 'score'),
    ),
    newRecord ? h('div', { class: 'res-record' }, 'Nouveau record !') : null,
    h('div', { class: 'res-sign' }, win || infinite ? 'Vu et consigné — M. Le Goff' : 'Consigné à regret — M. Le Goff'),
    h('div', { class: 'panel-actions' },
      win || infinite ? button(infinite ? 'Rejouer' : 'Continuer', onContinue, { cls: 'btn-primary', iconName: 'icon_arrow_right' }) : button('Rejouer la nuit', onRetry, { cls: 'btn-primary', iconName: 'icon_return' }),
      win && !infinite ? button('Rejouer', onRetry, { iconName: 'icon_return' }) : null,
      button('Menu', onMenu, { cls: 'btn-ghost', iconName: 'icon_home' }),
    ),
  );
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => {
    stagger(root, '.res-row', reduced ? 0 : 90);
    starsEl.querySelectorAll('.star.on').forEach((s, i) => setTimeout(() => { s.classList.add('pop'); AudioSys.play(`star_${i + 1}`, { volume: 0.7 }); }, reduced ? 0 : 500 + i * 380));
  }, 200);
  return root;
}
