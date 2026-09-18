// Les vœux de l'île, présentés avant la première pose : donneur, demande, cible, échéance et récompense, puis « C'est parti ».
import { h, button, icon, append } from './dom.js';
import { STORY } from '../data/story.js';
import { BALANCE } from '../data/balance.js';

export function buildWishesIntro({ island, onStart }) {
  const root = h('div', { class: 'panel panel-wishes-intro' });
  const cards = island.wishes.map((w) => {
    const s = STORY.wishes[w.def.id] || { giver: '', title: w.def.id, text: '' };
    const dl = w.def.deadline ? (w.def.deadline.placements ? `avant ${w.def.deadline.placements} poses` : w.def.deadline.season ? `avant ${(STORY.seasons[w.def.deadline.season] || {}).name || w.def.deadline.season}` : '') : 'sans échéance';
    return h('div', { class: 'wi-card' }, h('div', { class: 'wi-head' }, h('b', {}, s.title), h('span', { class: 'wi-giver' }, s.giver)), h('p', { class: 'wi-text' }, s.text), h('div', { class: 'wi-foot' }, h('span', {}, `Objectif : ${w.target}`), h('span', { class: 'wi-dl' }, dl)));
  });
  append(root,
    h('h2', { class: 'panel-title' }, 'Les habitants demandent'),
    h('p', { class: 'ws-intro' }, `${island.wishes.length} vœu${island.wishes.length > 1 ? 'x' : ''} pour cette île. Chaque vœu exaucé rapporte ${BALANCE.points.wish} points, ${BALANCE.breaths.wish} souffles, une tuile rare et une graine. Ils restent affichés à droite pendant la partie.`),
    h('div', { class: 'wi-list' }, ...cards),
    h('div', { class: 'panel-actions' }, button('C’est parti', onStart, { cls: 'btn-primary btn-big', iconName: 'icon_play' })),
  );
  return root;
}
