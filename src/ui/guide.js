// Guide en jeu : tuiles et affinités, saisons, faune, tuiles rares, souffles et vœux, graines et Atelier.
// Tout est dérivé des données du jeu (tiles.js, balance.js, upgrades.js, story.js) : aucune valeur n'est recopiée à la main.
import { h, button, icon, append } from './dom.js';
import { FAMILIES, RARE, RARE_AS, FAMILY_FROM, RARE_LATE, SEASONS, affinity } from '../data/tiles.js';
import { BALANCE } from '../data/balance.js';
import { UPGRADES } from '../data/upgrades.js';
import { STORY } from '../data/story.js';
import { SEASON_RULES } from '../game/seasonrules.js';
import { AudioSys } from '../core/audio.js';

const B = BALANCE;
const name = (f) => (STORY.tiles[f] || {}).name || f;
const blurb = (f) => (STORY.tiles[f] || {}).blurb || '';
const tileImg = (f, rare = false) => h('img', { src: `assets/img/tiles/${f}_${rare ? '' : '1_'}spring.png`, alt: name(f), loading: 'lazy' });
const faunaImg = (sp) => h('img', { src: `assets/img/fauna/fauna_${sp}.png`, alt: (STORY.fauna[sp] || {}).name || sp, loading: 'lazy' });
const SEASON_ICON = { spring: 'icon_leaf', summer: 'icon_sun', autumn: 'icon_wind', winter: 'icon_snow' };

function pairs(f) {
  const good2 = [], good1 = [], bad = [];
  for (const g of FAMILIES) { const v = affinity(f, g); if (v >= 2) good2.push(g); else if (v === 1) good1.push(g); else if (v < 0) bad.push(g); }
  const chips = (list, cls) => list.map((g) => h('span', { class: cls }, name(g)));
  return h('div', { class: 'g-pairs' },
    good2.length ? h('div', {}, h('b', {}, '+2'), ...chips(good2, 'p2')) : null,
    good1.length ? h('div', {}, h('b', {}, '+1'), ...chips(good1, 'p1')) : null,
    bad.length ? h('div', {}, h('b', {}, '−1'), ...chips(bad, 'pm')) : null,
    !good2.length && !good1.length && !bad.length ? h('div', {}, h('i', {}, 'Aucune affinité : ni bonus ni malus.')) : null,
  );
}

const TABS = {
  tiles: { label: 'Tuiles', build: () => h('div', {},
    h('p', { class: 'g-intro' }, 'Chaque bord partagé entre deux tuiles rapporte les points de leur affinité (affichés avant de poser). Une même famille vaut +1, une bonne paire +2, une mauvaise −1. Encercler complètement une région rapporte sa taille en tuiles (×2 pour un hameau, qui devient un bourg).'),
    h('div', { class: 'g-grid' }, ...FAMILIES.map((f) => h('div', { class: 'g-card' }, tileImg(f), h('div', {},
      h('h4', {}, name(f), FAMILY_FROM[f] ? h('span', { class: 'g-tag' }, `dès l’île ${FAMILY_FROM[f]}`) : null),
      h('p', {}, blurb(f)), pairs(f))))),
  ) },
  seasons: { label: 'Saisons', build: () => h('div', {},
    h('p', { class: 'g-intro' }, 'La ligne de saison, en haut de l’écran, se remplit à chaque pose. Quand elle est pleine, la saison change et une règle avec elle. Chaque île traverse les quatre saisons, parfois plusieurs fois.'),
    h('div', { class: 'g-grid' }, ...SEASONS.map((s) => { const st = STORY.seasons[s]; return h('div', { class: `g-card season-${s}` }, h('span', { class: 'g-sicon' }, icon(SEASON_ICON[s])), h('div', {}, h('h4', {}, st.name), h('p', { class: 'g-voice' }, st.line), ...SEASON_RULES[s].map((k, i) => { const r = STORY.seasonRules[k]; return h('p', {}, h('b', {}, r.name + (i === 0 ? ' (de base)' : '') + ' : '), r.rule); }))); })),
    h('p', { class: 'g-note' }, 'Dès l’île 4, la règle de chaque saison est tirée parmi ces trois variantes à chaque fois que la saison arrive (les îles 1 à 3 gardent les règles de base). La règle en cours est affichée dans la boîte de saison et rappelée dans le journal.'),
    h('h3', {}, icon('icon_cloud'), 'Météo'),
    h('p', { class: 'g-intro' }, 'Dès l’île 4, un événement peut être annoncé au début d’une saison ; il se déclenche à la mi-saison et dure jusqu’à la suivante.'),
    h('div', { class: 'g-grid' }, ...Object.keys(STORY.weather).map((k) => { const w = STORY.weather[k]; return h('div', { class: 'g-card' }, h('span', { class: 'g-sicon' }, icon(SEASON_ICON[(k === 'storm' ? 'spring' : k === 'heat' ? 'summer' : k === 'wind' ? 'autumn' : 'winter')])), h('div', {}, h('h4', {}, w.name), h('p', {}, w.rule), h('p', { class: 'g-voice' }, w.announce))); })),
    h('p', { class: 'g-note' }, `À chaque changement de saison, chaque animal présent rapporte ${B.points.faunaSeason} points et ${B.breaths.faunaSeason} souffle, et chaque sentier reliant deux villages rapporte ${B.points.pathSeason} point. Un sentier se trace tout seul entre deux hameaux séparés d’au plus trois tuiles de terre ouverte (prairie, champ, verger, lande, colline).`),
  ) },
  fauna: { label: 'Faune', build: () => h('div', {},
    h('p', { class: 'g-intro' }, 'Les animaux ne se posent pas : ils s’installent quand un habitat existe et repartent s’il se brise. Ils rapportent des points à chaque saison et comptent pour certains vœux.'),
    h('div', { class: 'g-grid' }, ...Object.keys(STORY.fauna).map((sp) => { const f = STORY.fauna[sp]; return h('div', { class: 'g-card g-fauna' }, faunaImg(sp), h('div', {}, h('h4', {}, f.name), h('p', {}, f.habitat), h('p', { class: 'g-voice' }, f.arrive))); })),
  ) },
  rare: { label: 'Tuiles rares', build: () => h('div', {},
    h('p', { class: 'g-intro' }, 'Une tuile rare est offerte à chaque vœu exaucé (et par l’amélioration « Semence rare »). Elle compte comme une ou plusieurs familles pour les affinités et possède un pouvoir propre.'),
    h('div', { class: 'g-grid' }, ...[...RARE, 'ruins'].map((f) => h('div', { class: 'g-card' }, tileImg(f, true), h('div', {},
      h('h4', {}, name(f), RARE_LATE[f] ? h('span', { class: 'g-tag' }, `dès l’île ${RARE_LATE[f]}`) : null),
      h('p', {}, blurb(f)),
      RARE_AS[f] && RARE_AS[f].length ? h('p', { class: 'g-note' }, `Compte comme : ${RARE_AS[f].map(name).join(', ')}.`) : null)))),
  ) },
  breath: { label: 'Souffles et vœux', build: () => h('div', {},
    h('h3', {}, icon('icon_wind'), 'Les souffles'),
    h('p', { class: 'g-intro' }, `Les souffles sont une réserve de pouvoirs. On en gagne ${B.breaths.close} par région fermée, ${B.breaths.wish} par vœu exaucé et ${B.breaths.faunaSeason} par animal présent à chaque changement de saison.`),
    h('ul', { class: 'g-list' }, ...['swap', 'discard', 'bud', 'undo', 'pocket'].map((k) => h('li', {}, STORY.breaths[k]))),
    h('h3', {}, icon('icon_star'), 'Les vœux et les étoiles'),
    h('p', { class: 'g-intro' }, `Dès l’île 2, les habitants formulent des vœux à échéance (un nombre de poses ou une saison). Un vœu exaucé rapporte ${B.points.wish} points, ${B.breaths.wish} souffles et une tuile rare.`),
    h('p', { class: 'g-intro' }, 'L’Île du jour (menu) est générée depuis la date, identique pour tout le monde, avec trois vœux tirés au sort et la météo. Le meilleur score du jour et les jours joués d’affilée sont conservés.'),
    h('p', { class: 'g-intro' }, `Les étoiles dépendent du score par rapport à la taille de l’île (${B.stars.perCell.map((x) => `×${String(x).replace('.', ',')}`).join(', ')} points par case). La troisième exige aussi tous les vœux. Une étoile suffit pour débloquer l’île suivante.`),
  ) },
  seeds: { label: 'Graines et Atelier', build: () => h('div', {},
    h('h3', {}, icon('icon_leaf'), 'Les graines'),
    h('p', { class: 'g-intro' }, `Les graines sont la monnaie de la campagne. On en gagne ${B.seeds.star} par nouvelle étoile sur une île, ${B.seeds.wish} par vœu exaucé et ${B.seeds.island} pour chaque île terminée, la première fois. Rejouer une île pour gagner une étoile de plus rapporte donc aussi des graines. En mode test, rien n’est enregistré.`),
    h('h3', {}, icon('icon_gear'), 'L’Atelier des saisons'),
    h('p', { class: 'g-intro' }, 'Après chaque île, l’Atelier propose des améliorations permanentes. Certaines n’apparaissent qu’une fois leur mécanique introduite dans la campagne.'),
    h('div', { class: 'g-grid' }, ...UPGRADES.map((u) => h('div', { class: 'g-card g-up' }, h('span', { class: 'g-sicon' }, icon(u.icon)), h('div', {}, h('h4', {}, u.name), h('p', {}, u.desc), h('p', { class: 'g-note' }, `Niveaux : ${u.levels.join(' → ')} · coût : ${u.costs.join(', ')} graines`))))),
  ) },
};

export function buildGuide({ onBack, tab = 'tiles' }) {
  const root = h('div', { class: 'panel panel-guide' });
  const body = h('div', { class: 'guide-body', tabindex: '0' });
  const tabs = h('div', { class: 'guide-tabs', role: 'tablist' });
  let current = tab;
  const show = (k) => {
    current = k;
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === k));
    body.innerHTML = ''; body.appendChild(TABS[k].build()); body.scrollTop = 0;
  };
  for (const k of Object.keys(TABS)) { const b = button(TABS[k].label, () => { AudioSys.play('ui_click', { volume: 0.35 }); show(k); }, { cls: 'btn-small btn-tab' }); b.dataset.tab = k; b.setAttribute('role', 'tab'); tabs.appendChild(b); }
  append(root, h('h2', { class: 'panel-title' }, 'Guide'), tabs, body, h('div', { class: 'panel-actions' }, button('Retour', onBack, { iconName: 'icon_return' })));
  show(current);
  return root;
}
