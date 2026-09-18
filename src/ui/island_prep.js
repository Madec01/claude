// Préparation d'une île, avant la première pose : choix du semis (dès l'île 4) et présentation des vœux, puis « C'est parti ».
import { h, button, icon, append } from './dom.js';
import { STORY } from '../data/story.js';
import { BALANCE } from '../data/balance.js';
import { SEMIS } from '../data/semis.js';
import { targetOf } from '../game/wishes.js';

export function buildIslandPrep({ def, semis = true, contract = null, onStart }) {
  const root = h('div', { class: 'panel panel-wishes-intro' });
  const name = def.story && STORY.islands[def.story] ? STORY.islands[def.story].name : (def.name || 'Île');
  let chosen = 'saisons';
  const semisCards = semis ? SEMIS.map((s) => { const el = h('button', { class: `semis-card ${s.id === chosen ? 'on' : ''}`, type: 'button' }, h('b', {}, s.name), h('span', {}, s.desc)); el.addEventListener('click', () => { chosen = s.id; root.querySelectorAll('.semis-card').forEach((c) => c.classList.toggle('on', c === el)); }); return el; }) : [];
  const wishes = (def.wishes || []).map((w) => {
    const s = STORY.wishes[w.id] || { giver: '', title: w.id, text: '' };
    const dl = w.deadline ? (w.deadline.placements ? `avant ${w.deadline.placements} poses` : w.deadline.season ? `avant ${(STORY.seasons[w.deadline.season] || {}).name || w.deadline.season}` : '') : 'sans échéance';
    return h('div', { class: 'wi-card' }, h('div', { class: 'wi-head' }, h('b', {}, s.title), h('span', { class: 'wi-giver' }, s.giver)), h('p', { class: 'wi-text' }, s.text), h('div', { class: 'wi-foot' }, h('span', {}, `Objectif : ${targetOf(w)}`), h('span', { class: 'wi-dl' }, dl)));
  });
  append(root,
    h('h2', { class: 'panel-title' }, name),
    contract ? h('p', { class: `prep-contract ${contract.done ? 'done' : ''}` }, `Contrat du chapitre : ${contract.text}`) : null,
    semis ? h('h3', { class: 'prep-h' }, 'Choisis ton semis') : null,
    semis ? h('p', { class: 'ws-intro' }, 'Ce que la file donnera plutôt. Un penchant, pas une garantie.') : null,
    semis ? h('div', { class: 'semis-list' }, ...semisCards) : null,
    wishes.length ? h('h3', { class: 'prep-h' }, 'Les habitants demandent') : null,
    wishes.length ? h('p', { class: 'ws-intro' }, `Chaque vœu exaucé rapporte ${BALANCE.points.wish} points, ${BALANCE.breaths.wish} souffles, une tuile rare et une graine. Ils restent affichés pendant la partie.`) : null,
    wishes.length ? h('div', { class: 'wi-list' }, ...wishes) : null,
    h('div', { class: 'panel-actions' }, button('C’est parti', () => onStart(chosen), { cls: 'btn-primary btn-big', iconName: 'icon_play' })),
  );
  return root;
}
