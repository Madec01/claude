// L'écran de départ d'une île, le seul avant la première pose : le récit (chapitre, nom, quelques lignes),
// le semis (dès l'île 4) et les vœux, puis « C'est parti ». Il remplace l'ancien récit en plein écran suivi
// d'un second écran de préparation : deux écrans pour une seule décision.
import { h, button, icon, append } from './dom.js';
import { STORY } from '../data/story.js';
import { BALANCE } from '../data/balance.js';
import { SEMIS } from '../data/semis.js';
import { targetOf } from '../game/wishes.js';

export function buildIslandPrep({ def, semis = true, screens = [], onStart, onBack = null }) {
  const root = h('div', { class: 'panel panel-wishes-intro' });
  const name = def.story && STORY.islands[def.story] ? STORY.islands[def.story].name : (def.name || 'Île');
  let chosen = 'saisons';
  const semisCards = semis ? SEMIS.map((s) => { const el = h('button', { class: `semis-card ${s.id === chosen ? 'on' : ''}`, type: 'button' }, h('b', {}, s.name), h('span', {}, s.desc)); el.addEventListener('click', () => { chosen = s.id; root.querySelectorAll('.semis-card').forEach((c) => c.classList.toggle('on', c === el)); }); return el; }) : [];
  const wishes = (def.wishes || []).map((w) => {
    const s = STORY.wishes[w.id] || { giver: '', title: w.id, text: '' };
    const dl = w.deadline ? (w.deadline.placements ? `avant ${w.deadline.placements} poses` : w.deadline.season ? `avant ${(STORY.seasons[w.deadline.season] || {}).name || w.deadline.season}` : '') : 'sans échéance';
    return h('div', { class: 'wi-card' }, h('div', { class: 'wi-head' }, h('b', {}, s.title), h('span', { class: 'wi-giver' }, s.giver)), h('p', { class: 'wi-text' }, s.text), h('div', { class: 'wi-foot' }, h('span', {}, `Objectif : ${targetOf(w)}`), h('span', { class: 'wi-dl' }, dl)));
  });
  // le récit : l'écran-titre donne le chapitre et le nom, les voix sans intitulé donnent le texte (la signature a sa ligne à part)
  const head = screens.find((x) => x.kind === 'title');
  const voices = screens.filter((x) => x.kind === 'voice' && !x.kicker).map((x) => x.text);
  append(root,
    head && head.kicker ? h('div', { class: 'res-kicker' }, head.kicker) : null,
    h('h2', { class: 'panel-title' }, head && head.title ? head.title : name),
    head && head.sub && !def.signature ? h('p', { class: 'prep-sub' }, head.sub) : null,
    voices.length ? h('div', { class: 'prep-story' }, ...voices.map((t) => h('p', {}, t))) : null,
    def.signature ? h('p', { class: 'prep-signature' }, h('b', {}, `${def.signature.name} · `), def.signature.text) : null,
    semis ? h('h3', { class: 'prep-h' }, 'Choisis ton semis') : null,
    semis ? h('p', { class: 'ws-intro' }, 'Ce que la file donnera plutôt. Un penchant, pas une garantie.') : null,
    semis ? h('div', { class: 'semis-list' }, ...semisCards) : null,
    wishes.length ? h('h3', { class: 'prep-h' }, 'Les habitants demandent') : null,
    wishes.length ? h('p', { class: 'ws-intro' }, `Chaque vœu exaucé rapporte ${BALANCE.points.wish} points, ${BALANCE.breaths.wish} souffles, une tuile rare et une graine. Ils restent affichés pendant la partie.`) : null,
    wishes.length ? h('div', { class: 'wi-list' }, ...wishes) : null,
    h('div', { class: 'panel-actions' }, button('C’est parti', () => onStart(chosen), { cls: 'btn-primary btn-big', iconName: 'icon_play' }), onBack ? button('Menu', onBack, { cls: 'btn-ghost', iconName: 'icon_home' }) : null),
  );
  return root;
}
