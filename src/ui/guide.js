// Guide en jeu : tuiles et affinités, saisons, faune, tuiles rares, souffles et vœux, graines et Atelier.
import { mechIsland, CHAPTER_GATE, CHAPTER_PATIENCE } from '../data/campaign.js';
// Tout est dérivé des données du jeu (tiles.js, balance.js, upgrades.js, story.js) : aucune valeur n'est recopiée à la main.
import { h, button, icon, append } from './dom.js';
import { FAMILIES, RARE, RARE_AS, FAMILY_FROM, RARE_LATE, SEASONS, affinity, FUSIONS } from '../data/tiles.js';
import { Save } from '../core/save.js';
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
  hand: { label: 'File, main et semis', build: () => h('div', {},
    h('h3', {}, icon('icon_info'), 'La file'),
    h('p', { class: 'g-intro' }, `Les prochaines tuiles sont visibles dans la file (trois, puis quatre ou cinq avec le Regard de l’Atelier). Avant l’île ${mechIsland('hand')}, on les pose dans l’ordre.`),
    h('h3', {}, icon('icon_info'), `La main de saison (dès l’île ${mechIsland('hand')})`),
    h('p', { class: 'g-intro' }, `Dès l’île ${mechIsland('hand')}, la file devient une main : on joue n’importe quelle tuile visible en cliquant dessus (ou touches 2 à 5), sans souffle.`),
    h('h3', {}, icon('icon_leaf'), `Le semis (dès l’île ${mechIsland('semis')})`),
    h('p', { class: 'g-intro' }, 'Avant chaque île, on choisit ce que la file donnera plutôt : au gré des saisons (file telle quelle), terres hautes (plus de roche et de collines), fonds humides (plus d’eau et de marais) ou pays habité (plus de hameaux et de champs). Un penchant, pas une garantie : la file reste tirée au sort, et les vœux sont présentés sur le même écran.'),
  ) },
  recipes: { label: 'Cahier', build: () => { const known = new Set(Save.data.campaign.recipes || []); return h('div', {},
    h('p', { class: 'g-intro' }, `Dès l’île ${mechIsland('fuse')}, poser une tuile sur une tuile d’une autre famille la fusionne quand une recette existe (${B.fusion.cost} souffle, +${B.fusion.bonus} points, l’ordre des deux familles est indifférent). La tuile composée compte pour ses deux familles et rapporte à chaque saison. La première fois qu’une recette est réalisée, elle s’écrit ici.`),
    h('div', { class: 'g-grid' }, ...FUSIONS.map((f) => { const st = STORY.tiles[f.id] || { name: f.id, blurb: '' }; const on = known.has(f.id); return h('div', { class: `g-card ${on ? '' : 'g-locked'}` }, h('div', {}, h('h4', {}, on ? st.name : '?', h('span', { class: 'g-tag' }, `${name(f.a)} + ${name(f.b)}`)), h('p', {}, on ? st.blurb : 'Recette à découvrir.'))); })),
    h('p', { class: 'g-note' }, `${known.size} recette${known.size > 1 ? 's' : ''} découverte${known.size > 1 ? 's' : ''} sur ${FUSIONS.length}.`)); } },
  climates: { label: 'Climats', build: () => h('div', {},
    h('p', { class: 'g-intro' }, 'Dès le chapitre 5, chaque archipel a son climat. Un climat change la file de tuiles, donne un avantage permanent et une contrainte permanente, affichés à côté de la saison (touchez la saison pour le détail).'),
    h('div', { class: 'g-grid' }, ...['hot', 'humid', 'cold'].map((k) => { const c = STORY.climates[k]; return h('div', { class: 'g-card' }, h('div', {}, h('h4', {}, c.name), h('p', { class: 'g-em' }, c.line), h('p', {}, `✓ ${c.plus}`), h('p', {}, `✗ ${c.minus}`))); })),
  ) },
  seasons: { label: 'Saisons', build: () => h('div', {},
    h('p', { class: 'g-intro' }, 'La ligne de saison, en haut de l’écran, se remplit à chaque pose. Quand elle est pleine, la saison change et une règle avec elle. Chaque île traverse les quatre saisons, parfois plusieurs fois.'),
    h('div', { class: 'g-grid' }, ...SEASONS.map((s) => { const st = STORY.seasons[s]; return h('div', { class: `g-card season-${s}` }, h('span', { class: 'g-sicon' }, icon(SEASON_ICON[s])), h('div', {}, h('h4', {}, st.name), h('p', { class: 'g-voice' }, st.line), ...SEASON_RULES[s].map((k, i) => { const r = STORY.seasonRules[k]; return h('p', {}, h('b', {}, r.name + (i === 0 ? ' (de base)' : ' (surprise)') + ' : '), r.rule); }))); })),
    h('p', { class: 'g-note' }, `Dès l’île ${mechIsland('surprise')}, chaque saison qui arrive peut apporter une surprise à la place de sa règle de base : l’une des deux autres règles de la carte, tirée au sort, qui vaut toute la saison. Elle s’écrit sous la saison et se voit sur l’île (averses des semailles, chaleur, vent de foire, neige du grand froid, redoux).`),
    h('p', { class: 'g-note' }, `À chaque changement de saison, chaque animal présent rapporte ${B.points.faunaSeason} points, et chaque sentier reliant deux villages rapporte ${B.points.pathSeason} point. Un sentier se trace tout seul entre deux hameaux séparés d’au plus trois tuiles de terre ouverte (prairie, champ, verger, lande, colline).`),
  ) },
  fauna: { label: 'Faune', build: () => h('div', {},
    h('p', { class: 'g-intro' }, 'Les animaux ne se posent pas : ils s’installent quand un habitat existe et repartent s’il se brise. Ils rapportent des points à chaque saison et comptent pour certains vœux.'),
    h('div', { class: 'g-grid' }, ...Object.keys(STORY.fauna).map((sp) => { const f = STORY.fauna[sp]; return h('div', { class: 'g-card g-fauna' }, faunaImg(sp), h('div', {}, h('h4', {}, f.name), h('p', {}, f.habitat), h('p', { class: 'g-voice' }, f.arrive))); })),
  ) },
  rare: { label: 'Tuiles rares', build: () => h('div', {},
    h('h3', {}, icon('icon_star'), 'Tuiles rares'),
    h('p', { class: 'g-intro' }, 'Une tuile rare est offerte à chaque vœu exaucé (et par l’amélioration « Semence rare »). Elle compte comme une ou plusieurs familles pour les affinités et possède un pouvoir propre.'),
    h('div', { class: 'g-grid' }, ...[...RARE, 'ruins'].map((f) => h('div', { class: 'g-card' }, tileImg(f, true), h('div', {},
      h('h4', {}, name(f), RARE_LATE[f] ? h('span', { class: 'g-tag' }, `dès l’île ${RARE_LATE[f]}`) : null),
      h('p', {}, blurb(f)),
      RARE_AS[f] && RARE_AS[f].length ? h('p', { class: 'g-note' }, `Compte comme : ${RARE_AS[f].map(name).join(', ')}.`) : null)))),
  ) },
  breath: { label: 'Souffles et vœux', build: () => h('div', {},
    h('h3', {}, icon('icon_wind'), 'Les souffles'),
    h('p', { class: 'g-intro' }, `Les souffles sont une réserve de pouvoirs. On en gagne ${B.breaths.close} par région fermée et ${B.breaths.wish} par vœu exaucé. Ils sont rares : chaque pouvoir est un renoncement.`),
    h('ul', { class: 'g-list' }, ...['discard', 'undo', 'build'].map((k) => h('li', {}, STORY.breaths[k]))),
    h('h3', {}, icon('icon_leaf'), `Bâtir (dès l’île ${mechIsland('build')})`),
    h('p', { class: 'g-intro' }, `Pose une tuile sur une tuile de la même famille (${B.build.cost} souffle) : elle passe au niveau 2, tous ses bords valent +1 de plus, elle compte double dans la taille de sa région et son décor s’épaissit. Bâtir consomme la tuile sans remplir de case, sauf si la tuile est bien bâtie : dans une région close, en sa saison (prés, marais et landes au printemps ; champs et sable en été ; forêts, vergers et collines en automne ; hameaux, eau et roche en hiver) ou entourée d’au moins ${B.build.neighborsForRefund} tuiles de sa famille. Elle rend alors une tuile de la même famille à la file, au plus une fois par saison.`),
    h('p', { class: 'g-note' }, `Dès l’île ${mechIsland('build3')}, une tuile de niveau 2 qui a traversé une saison peut être bâtie une seconde fois (${B.build.cost3} souffles) : elle passe au niveau 3, ses bords valent +2, elle compte triple dans sa région, rapporte +${B.build.level3Season} à chaque saison et prend un nom : ${Object.values(STORY.level3).map((l) => l.name.toLowerCase()).join(', ')}.`),
    h('h3', {}, icon('icon_tree'), `La croissance (dès l’île ${mechIsland('growth')})`),
    h('p', { class: 'g-intro' }, `Une tuile entourée d’assez de voisines de sa propre famille pendant ${B.growth.seasons} saisons passe au niveau 2 d’elle-même, sans souffle : le hameau devient un village (${B.growth.at.hamlet} voisins suffisent), le verger se remplit (${B.growth.at.orchard}), la forêt, le champ et la prairie s’épaississent (${B.growth.at.forest}). Une saison avant, de jeunes pousses l’annoncent sur la tuile ; poser autre chose à côté annule la croissance. Au plus ${B.growth.perSeason} tuiles par changement de saison, et jamais deux dans la même région. Le temps épaissit ; le niveau 3 et les signatures restent réservés à bâtir, et une tuile poussée par le temps ne compte pas pour le vœu qui demande de bâtir.`),
    h('h3', {}, icon('icon_leaf'), 'La friche'),
    h('p', { class: 'g-intro' }, `Une pose qui coûte des points (bords et contraintes, total négatif) laisse une friche : ruine pour un hameau, lit asséché pour l’eau, terre morte ailleurs. Elle ne rapporte plus rien, ne compte plus pour sa famille (régions, vœux, faune) et ses bords ne valent rien pour ses voisines. Bâtir dessus avec une tuile de la même famille la remet en état (${B.build.cost} souffle) : seuls ses bons voisins comptent alors, et elle peut fermer une région.`),
    h('h3', {}, icon('icon_star'), 'Les vœux et les étoiles'),
    h('p', { class: 'g-intro' }, `Dès l’île ${mechIsland('wish')}, les habitants formulent des vœux à échéance (un nombre de poses ou une saison). Un vœu exaucé rapporte ${B.points.wish} points, ${B.breaths.wish} souffles et une tuile rare.`),
    h('p', { class: 'g-intro' }, 'L’Île du jour (menu) est générée depuis la date, identique pour tout le monde, avec trois vœux tirés au sort et les surprises de saison. Le meilleur score du jour et les jours joués d’affilée sont conservés.'),
    h('p', { class: 'g-intro' }, 'Les étoiles dépendent du score : chaque île a ses trois seuils, affichés sous les points pendant la partie (le prochain seuil à atteindre) et sur le bilan. Ils sont réglés sur un joueur automatique qui anticipe ses coups : la première étoile demande 45 % de son score — de quoi dire « tu as joué » plutôt que « tu as posé au hasard » —, la deuxième 65 % (une bonne partie), la troisième 85 % (une très bonne). Son score entier vaut l’étoile d’or, cosmétique (une graine, et l’île brille sur la carte), hors porte de chapitre.'),
    h('h3', {}, icon('icon_menu'), 'Avancer dans la campagne'),
    h('p', { class: 'g-intro' }, `Terminer une île ouvre la suivante, avec ou sans étoile : aucune île ne peut arrêter la campagne. Les étoiles ne gardent que la porte entre deux chapitres, et cette porte a deux clés — ${CHAPTER_GATE} étoiles sur les quinze du chapitre, ou ${CHAPTER_PATIENCE} parties terminées dans le chapitre, les cinq îles comprises. La seconde s’atteint en jouant : personne ne reste bloqué. Rejouer une île déjà faite compte des deux côtés, et seule la meilleure partie de chaque île est retenue.`),
  ) },
  seeds: { label: 'Graines et Atelier', build: () => h('div', {},
    h('h3', {}, icon('icon_leaf'), 'Les graines'),
    h('p', { class: 'g-intro' }, `Les graines sont la monnaie de la campagne. On en gagne ${B.seeds.star} par nouvelle étoile sur une île, ${B.seeds.wish} par vœu exaucé et ${B.seeds.island} pour chaque île terminée, la première fois. Rejouer une île pour gagner une étoile de plus rapporte donc aussi des graines. En mode test, rien n’est enregistré.`),
    h('h3', {}, icon('icon_gear'), 'L’Atelier des saisons'),
    h('p', { class: 'g-intro' }, 'L’Atelier, depuis le menu, propose des améliorations permanentes. Certaines n’apparaissent qu’une fois leur mécanique introduite dans la campagne.'),
    h('div', { class: 'g-grid' }, ...UPGRADES.map((u) => h('div', { class: 'g-card g-up' }, h('span', { class: 'g-sicon' }, icon(u.icon)), h('div', {}, h('h4', {}, u.name, h('span', { class: 'g-tag' }, `chapitre ${u.chapter}`)), h('p', {}, u.desc), h('p', { class: 'g-note' }, `Niveaux : ${u.levels.join(' → ')} · coût : ${u.costs.join(', ')} graines`))))),
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
