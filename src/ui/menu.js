// Menu d'accueil : jouer / continuer, sélection des nuits, Veille infinie, options, crédits.
import { h, button, icon, stagger } from './dom.js';
import { compassRose, chartFrame, rule, corner, lanternGlow } from './ornaments.js';
import { Save } from '../core/save.js';
import { NIGHTS } from '../data/nights.js';
import { STORY } from '../data/story.js';

export const VERSION = 'v1.0';

const ACTS = { 1: { num: 'Acte I', name: 'La Relève' }, 2: { num: 'Acte II', name: 'Ce que la mer rend' }, 3: { num: 'Acte III', name: 'Le Feu du fond' } };
const MECH_LABELS = { horn: 'la corne', anchor: 'l’ancre', pages: 'les pages', tide: 'la marée', storm: 'la tempête', beast: 'la Bête', oil: 'l’huile' };

/** Nouvelle mécanique introduite par une nuit (jamais vue dans les nuits précédentes). */
function newMechanic(n, seen) {
  let label = n.id === 1 ? 'le faisceau' : n.finale ? 'la dernière nuit' : '';
  for (const k of Object.keys(MECH_LABELS)) {
    if (n.mechanics && n.mechanics[k]) { if (!seen.has(k)) { if (!label || n.id === 1) label = MECH_LABELS[k]; } seen.add(k); }
  }
  return n.id === 1 ? 'le faisceau' : label;
}

/** Bouton de navigation : médaillon + libellé (+ sous-libellé facultatif). */
function navButton(label, onClick, { iconName, cls = '', disabled = false, title = '', sub = '' } = {}) {
  const b = button(label, onClick, { cls, disabled, title });
  b.querySelector('span').before(h('span', { class: 'btn-medal' }, icon(iconName)));
  if (sub) b.appendChild(h('span', { class: 'btn-sub' }, sub));
  return b;
}

export function buildMenu({ game }) {
  const c = Save.campaign;
  const testMode = Save.options.testMode;
  const started = c.nightsPlayed > 0 || c.prologueSeen;
  const totalStars = Object.values(c.stars || {}).reduce((a, b) => a + b, 0);
  const root = h('div', { class: 'menu' });

  const title = h('div', { class: 'menu-title' },
    lanternGlow(),
    h('div', { class: 'menu-kicker' }, 'Sant-Aël · 1893'),
    h('h1', {}, 'Feux de Brume'),
    h('div', { class: 'menu-sub' }, STORY.subtitle),
    rule(),
  );

  const nav = h('nav', { class: 'menu-nav', 'aria-label': 'Menu principal' });
  const primaryLabel = c.completed ? 'Rejouer la campagne' : started ? 'Continuer' : 'Commencer la veille';
  const primarySub = c.completed ? '' : started ? `Nuit ${Math.min(c.unlockedNight, 12)}` : 'Nuit 1';
  nav.append(
    navButton(primaryLabel, () => game.startCampaign(), { cls: 'btn-primary btn-big', iconName: 'icon_play', sub: primarySub }),
    navButton('Choisir une nuit', () => showNights(), { iconName: 'icon_menu', disabled: !started && !testMode, title: !started && !testMode ? 'Jouez d’abord la première nuit' : '', sub: started || testMode ? `${Math.min(c.unlockedNight, 12)} / 12` : '' }),
    navButton('Veille infinie', () => game.startInfinite(), { iconName: 'icon_signal', disabled: !(Save.data.infinite.unlocked || c.completed || testMode), title: 'Se déverrouille à la fin de la campagne', sub: Save.data.infinite.best ? `${Save.data.infinite.best} pts` : '' }),
    navButton('Options', () => game.showOptions(), { iconName: 'icon_gear' }),
    navButton('Crédits', () => game.showCredits(), { iconName: 'icon_info' }),
    navButton('Plein écran', () => game.toggleFullscreen(), { cls: 'btn-ghost', iconName: 'icon_fullscreen' }),
  );

  const foot = h('div', { class: 'menu-foot' },
    h('div', { class: 'foot-left' },
      testMode ? h('span', { class: 'foot-test' }, 'Mode test actif') : null,
      h('span', { class: 'foot-stat' }, icon('icon_star'), `${totalStars} / 36 étoiles`),
      h('span', { class: 'foot-stat' }, icon('icon_info'), `${c.pagesRead.length} / ${STORY.pages.length} pages retrouvées`),
      Save.data.infinite.best ? h('span', { class: 'foot-stat' }, icon('icon_leaderboard'), `Veille infinie : ${Save.data.infinite.best} pts`) : null,
    ),
    h('div', { class: 'foot-right' }, `Feux de Brume · ${VERSION}`),
  );

  root.append(h('div', { class: 'menu-veil' }), chartFrame(), compassRose(230, 'menu-rose'), title, nav, foot);
  setTimeout(() => stagger(nav, ':scope > *', 70), 60);

  function showNights() {
    const acts = h('div', { class: 'acts' });
    const seen = new Set();
    for (const a of [1, 2, 3]) {
      const nights = NIGHTS.filter((n) => n.act === a);
      const actStars = nights.reduce((s, n) => s + (c.stars[n.id] || 0), 0);
      const row = h('div', { class: 'act-row' },
        h('div', { class: 'act-head' }, h('div', { class: 'act-num' }, ACTS[a].num), h('div', { class: 'act-name' }, ACTS[a].name), h('div', { class: 'act-stars' }, `${actStars} / ${nights.length * 3} ★`)),
      );
      for (const n of nights) {
        const s = STORY.nights[n.id];
        const unlocked = testMode || n.id <= c.unlockedNight;
        const stars = c.stars[n.id] || 0;
        const best = c.best[n.id];
        const current = !c.completed && n.id === Math.min(c.unlockedNight, 12) && unlocked;
        const mech = newMechanic(n, seen);
        const card = h('button', { class: `night-card ${unlocked ? '' : 'locked'} act-${n.act} ${current ? 'current' : ''}`, disabled: !unlocked, title: unlocked ? `Jouer la nuit ${n.id}` : 'Nuit verrouillée' },
          h('div', { class: 'nc-num' }, `Nuit ${n.id}`),
          h('div', { class: 'nc-title' }, s ? s.title : ''),
          h('div', { class: 'nc-stars' }, ...[0, 1, 2].map((i) => h('span', { class: `star ${i < stars ? 'on' : ''}` }, icon('icon_star'))), best ? h('span', { class: 'nc-best' }, `${best.toLocaleString('fr-FR')} pts`) : null),
          unlocked ? (mech && !best ? h('div', { class: 'nc-mech' }, mech) : null) : icon('icon_locked', 'nc-lock'),
        );
        card.addEventListener('click', () => game.startNight(n.id, { fromSelect: true }));
        row.appendChild(card);
      }
      acts.appendChild(row);
    }
    const panel = h('div', { class: 'panel panel-nights' }, corner('tl'), corner('tr'), corner('bl'), corner('br'),
      h('h2', { class: 'panel-title' }, 'Choisir une nuit'), rule(),
      acts,
      h('div', { class: 'nights-foot' },
        h('div', { class: 'nights-total' }, icon('icon_star'), h('b', {}, String(totalStars)), h('span', {}, '/ 36 étoiles · une étoile pour l’aube, deux pour le quota dépassé, trois sans naufrage')),
        h('div', { class: 'panel-actions' }, button('Retour', () => game.showMenu(), { iconName: 'icon_return' })),
      ));
    game.showPanel(panel);
  }
  return root;
}
