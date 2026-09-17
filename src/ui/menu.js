// Menu d'accueil : continuer, choisir une île, Île infinie, Jardin, options, crédits.
import { h, button, icon, stagger } from './dom.js';
import { Save } from '../core/save.js';
import { ISLANDS } from '../data/islands.js';
import { STORY } from '../data/story.js';

export const VERSION = 'v1.0';

export function buildMenu({ game }) {
  const c = Save.campaign;
  const testMode = Save.options.testMode;
  const started = c.islandsPlayed > 0 || c.prologueSeen;
  const totalStars = Object.values(c.stars || {}).reduce((a, b) => a + b, 0);
  const root = h('div', { class: 'menu' });
  const title = h('div', { class: 'menu-title' },
    h('div', { class: 'menu-kicker' }, STORY.subtitle),
    h('h1', {}, STORY.title),
    h('div', { class: 'menu-sub' }, 'Douze îles à faire revivre, une tuile à la fois.'),
  );
  const nav = h('nav', { class: 'menu-nav', 'aria-label': 'Menu principal' });
  const primaryLabel = c.completed ? 'Rejouer la campagne' : started ? 'Continuer' : 'Commencer';
  const primarySub = c.completed ? '' : `Île ${Math.min(c.unlockedIsland, 12)}`;
  const navButton = (label, fn, o) => { const b = button(label, fn, o); if (o.sub) b.appendChild(h('span', { class: 'btn-sub' }, o.sub)); return b; };
  nav.append(
    navButton(primaryLabel, () => game.startCampaign(), { cls: 'btn-primary btn-big', iconName: 'icon_play', sub: primarySub }),
    navButton('Choisir une île', () => showIslands(), { iconName: 'icon_menu', disabled: !started && !testMode, sub: started || testMode ? `${Math.min(c.unlockedIsland, 12)} / 12` : '' }),
    navButton('Île infinie', () => game.startInfinite(), { iconName: 'icon_signal', disabled: !(Save.data.infinite.unlocked || c.unlockedIsland > 6 || testMode), title: 'Se déverrouille après l’île 6', sub: Save.data.infinite.best ? `${Save.data.infinite.best} pts` : '' }),
    navButton('Jardin', () => game.startGarden(), { iconName: 'icon_leaf', disabled: !(started || testMode), title: 'Pose libre, sans score' }),
    navButton('Options', () => game.showOptions(), { iconName: 'icon_gear' }),
    navButton('Crédits', () => game.showCredits(), { iconName: 'icon_info' }),
    navButton('Plein écran', () => game.toggleFullscreen(), { cls: 'btn-ghost', iconName: 'icon_fullscreen' }),
  );
  const foot = h('div', { class: 'menu-foot' },
    h('div', { class: 'foot-left' },
      testMode ? h('span', { class: 'foot-test' }, 'Mode test actif') : null,
      h('span', { class: 'foot-stat' }, icon('icon_star'), `${totalStars} / 36 étoiles`),
      h('span', { class: 'foot-stat' }, icon('icon_leaf'), `${c.seeds} graines`),
    ),
    h('div', { class: 'foot-right' }, `${STORY.title} · ${VERSION}`),
  );
  root.append(h('div', { class: 'menu-veil' }), title, nav, foot);
  setTimeout(() => stagger(nav, ':scope > *', 60), 60);

  function showIslands() {
    const rows = h('div', { class: 'acts' });
    for (const a of [1, 2, 3]) {
      const arch = STORY.archipelagos[a] || { name: '', sub: '' };
      const list = ISLANDS.filter((i) => i.arch === a);
      const row = h('div', { class: 'act-row' }, h('div', { class: 'act-head' }, h('div', { class: 'act-num' }, arch.name), h('div', { class: 'act-name' }, arch.sub)));
      for (const isl of list) {
        const s = STORY.islands[isl.id] || { name: '' };
        const unlocked = testMode || isl.id <= c.unlockedIsland;
        const stars = c.stars[isl.id] || 0;
        const card = h('button', { class: `night-card ${unlocked ? '' : 'locked'} act-${isl.arch} ${isl.id === Math.min(c.unlockedIsland, 12) && !c.completed ? 'current' : ''}`, disabled: !unlocked, title: unlocked ? `Jouer l’île ${isl.id}` : 'Île verrouillée' },
          h('div', { class: 'nc-num' }, `Île ${isl.id} · ${isl.cells} cases`),
          h('div', { class: 'nc-title' }, s.name),
          h('div', { class: 'nc-stars' }, ...[0, 1, 2].map((i) => h('span', { class: `star ${i < stars ? 'on' : ''}` }, icon('icon_star'))), c.best[isl.id] ? h('span', { class: 'nc-best' }, `${c.best[isl.id]} pts`) : null),
          unlocked ? null : icon('icon_locked', 'nc-lock'),
        );
        card.addEventListener('click', () => game.startIsland(isl.id, { fromSelect: true }));
        row.appendChild(card);
      }
      rows.appendChild(row);
    }
    game.showPanel(h('div', { class: 'panel panel-nights' }, h('h2', { class: 'panel-title' }, 'Choisir une île'), rows,
      h('div', { class: 'panel-actions' }, button('Retour', () => game.showMenu(), { iconName: 'icon_return' }))));
  }
  return root;
}
