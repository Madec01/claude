// L'écran de départ d'une île, le seul avant la première pose : le récit (chapitre, nom, quelques lignes),
// le semis (dès l'île 4) et les vœux, puis « C'est parti ». Il remplace l'ancien récit en plein écran suivi
// d'un second écran de préparation : deux écrans pour une seule décision.
import { h, button, icon, append } from './dom.js';
import { STORY } from '../data/story.js';
import { BALANCE } from '../data/balance.js';
import { SEMIS } from '../data/semis.js';
import { targetOf } from '../game/wishes.js';
import { islandOptions } from '../data/campaign.js';
import { ptsFleur, varieteDemandee } from '../game/harmonie.js';
import { Save } from '../core/save.js';
import { UPGRADES, patienceJouee } from '../data/upgrades.js';

/**
 * L'harmonie présentée avant la première pose : la première fois en entier (les trois fleurs, ce qu'elles demandent,
 * ce qu'elles rapportent sur cette île) — même tutoriel coupé, c'est ici que tout joueur passe ; ensuite une ligne.
 */
function blocHarmonie(def) {
  const H = BALANCE.harmonie, pts = ptsFleur(def.cells || 60), nv = varieteDemandee(def);
  const fleur = (img) => h('img', { class: 'prep-fleur', src: `assets/img/deco/${img}.webp`, alt: '' });
  const premiere = !((Save.data.seen || {}).harmonie);
  if (!premiere) return [h('p', { class: 'prep-harmo-ligne' }, fleur('obj_flowerBlue'), fleur('obj_flowerRed'), fleur('obj_flowerYellow'), h('span', {}, `Harmonie : trois fleurs à +${pts} chacune — variété, équilibre, achèvement.`))];
  return [
    h('h3', { class: 'prep-h' }, 'L’harmonie ', h('span', { class: 'prep-new' }, 'nouveau')),
    h('p', { class: 'ws-intro' }, `En plus des étoiles, trois fleurs récompensent une île variée et bien finie. Chaque fleur ouverte à la fin de l’île rapporte +${pts} ici. Elles s’affichent à côté du score ; les toucher dit ce qui manque.`),
    h('div', { class: 'prep-harmo' },
      h('div', {}, fleur('obj_flowerBlue'), h('span', {}, h('b', {}, 'Variété'), `${nv} familles tiennent chacune une région d’au moins ${H.regionMin} tuiles.`)),
      h('div', {}, fleur('obj_flowerRed'), h('span', {}, h('b', {}, 'Équilibre'), `aucune région ne couvre plus de ${Math.round(H.equilibre * 100)} % de l’île.`)),
      h('div', {}, fleur('obj_flowerYellow'), h('span', {}, h('b', {}, 'Achèvement'), `au moins ${Math.round(H.acheve * 100)} % des tuiles dans des régions closes, et aucune friche.`))),
  ];
}

/** Patience réglable (J-I) : entre deux îles, le niveau voulu parmi ceux achetés, avec le compromis en une phrase. */
function blocPatience() {
  const c = Save.campaign; const achete = (c.upgrades && c.upgrades.patience) || 0; if (!achete) return [];
  const up = UPGRADES.find((u) => u.id === 'patience'); let joue = patienceJouee(c);
  const pills = []; for (let k = 0; k <= achete; k++) { const el = h('button', { class: `semis-card patience-card ${k === joue ? 'on' : ''}`, type: 'button', 'data-patience': String(k) }, h('b', {}, up.levels[k])); el.addEventListener('click', () => { joue = k; c.patienceChoisie = k; Save.save(); pills.forEach((p) => p.classList.toggle('on', p === el)); }); pills.push(el); }
  return [h('h3', { class: 'prep-h' }, 'Patience des saisons'), h('p', { class: 'ws-intro' }, 'Plus de poses par saison, mais moins d’occasions de saison. Le choix reste pour les îles suivantes.'), h('div', { class: 'semis-list patience-list' }, ...pills)];
}

export function buildIslandPrep({ def, semis = true, screens = [], onStart, onBack = null }) {
  const root = h('div', { class: 'panel panel-wishes-intro' });
  const name = def.story && STORY.islands[def.story] ? STORY.islands[def.story].name : (def.name || 'Île');
  let chosen = 'saisons';
  const semisCards = semis ? SEMIS.map((s) => { const el = h('button', { class: `semis-card ${s.id === chosen ? 'on' : ''}`, type: 'button' }, h('b', {}, s.name), h('span', {}, s.desc)); el.addEventListener('click', () => { chosen = s.id; root.querySelectorAll('.semis-card').forEach((c) => c.classList.toggle('on', c === el)); }); return el; }) : [];
  const wishes = (def.wishes || []).map((w) => {
    const s = STORY.wishes[w.id] || { giver: '', title: w.id, text: '' };
    const dl = w.deadline ? (w.deadline.placements ? `avant ${w.deadline.placements} poses · jusqu’à +${w.deadline.placements}` : w.deadline.season ? `avant ${(STORY.seasons[w.deadline.season] || {}).name || w.deadline.season}` : '') : 'sans échéance';
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
    ...(def.mech && !def.daily ? blocPatience() : []),
    ...(def.mech && islandOptions(def).harmonie ? blocHarmonie(def) : []),
    wishes.length ? h('h3', { class: 'prep-h' }, 'Les habitants demandent') : null,
    wishes.length ? h('p', { class: 'ws-intro' }, `Chaque vœu exaucé rapporte autant de points qu’il reste de poses avant son échéance — l’exaucer tôt paie davantage —, ${BALANCE.breaths.wish} souffles, une tuile rare et une graine. Ils restent affichés pendant la partie.`) : null,
    wishes.length ? h('div', { class: 'wi-list' }, ...wishes) : null,
    h('div', { class: 'panel-actions' }, button('C’est parti', () => { if (def.mech && islandOptions(def).harmonie) { Save.data.seen = Save.data.seen || {}; if (!Save.data.seen.harmonie) { Save.data.seen.harmonie = true; Save.save(); } } onStart(chosen); }, { cls: 'btn-primary btn-big', iconName: 'icon_play' }), onBack ? button('Menu', onBack, { cls: 'btn-ghost', iconName: 'icon_home' }) : null),
  );
  return root;
}
