// Menu d'accueil : continuer, choisir une île, Île infinie, Jardin, options, crédits.
import { ACHIEVEMENTS } from '../data/achievements.js';
import { Achievements } from '../game/achievements.js';
const achCount = () => Achievements.count();
import { h, button, icon, stagger, append } from './dom.js';
import { CHAPTERS, campaignIsland, chapterStars, gateStars, CHAPTER_GATE, CAMPAIGN_SIZE } from '../data/campaign.js';
import { contractLine } from '../data/contracts.js';
import { Save } from '../core/save.js';
import { RunSave } from '../core/run.js';
import { ISLANDS } from '../data/islands.js';
import { STORY } from '../data/story.js';
import { dailyKey, dailyLabel } from '../data/daily.js';

export const VERSION = 'v1.0';

const SEASON_FR = { spring: 'printemps', summer: 'été', autumn: 'automne', winter: 'hiver' };

export function buildMenu({ game }) {
  const c = Save.campaign;
  const testMode = Save.options.testMode;
  const started = c.islandsPlayed > 0 || c.prologueSeen;
  const totalStars = Object.values(c.stars || {}).reduce((a, b) => a + b, 0);
  const root = h('div', { class: 'menu' });
  const title = h('div', { class: 'menu-title' },
    h('div', { class: 'menu-kicker' }, STORY.subtitle),
    h('h1', {}, STORY.title),
    h('div', { class: 'menu-sub' }, 'Cinquante îles à faire revivre, une tuile à la fois.'),
  );
  const nav = h('nav', { class: 'menu-nav', 'aria-label': 'Menu principal' });
  const primaryLabel = c.completed ? 'Rejouer la campagne' : started ? 'Continuer' : 'Commencer';
  const primarySub = c.completed ? '' : `Île ${Math.min(c.unlockedIsland, CAMPAIGN_SIZE)}`;
  const navButton = (label, fn, o) => { const b = button(label, fn, o); if (o.sub) b.appendChild(h('span', { class: 'btn-sub' }, o.sub)); return b; };
  // une partie laissée en plan attend sur l'appareil : elle passe devant tout le reste
  // (sauf si l'île ne peut plus être reconstruite : l'île du jour d'hier, par exemple)
  const run = (() => { const d = RunSave.describe(); return d && game.defFromWhere(d.where) ? d : null; })();
  append(nav, 
    run ? navButton('Reprendre', () => game.resumeRun(), { cls: 'btn-primary btn-big btn-resume', iconName: 'icon_return', title: `${run.title} · ${run.placements} tuile${run.placements > 1 ? 's' : ''} posée${run.placements > 1 ? 's' : ''} · ${SEASON_FR[run.season] || ''} · laissée ${run.when}`, sub: `${run.title} · ${run.placements} tuile${run.placements > 1 ? 's' : ''}` }) : null,
    navButton(primaryLabel, () => game.startCampaign(), { cls: run ? 'btn-big' : 'btn-primary btn-big', iconName: 'icon_play', sub: primarySub }),
    navButton('Choisir une île', () => showIslands(), { iconName: 'icon_menu', disabled: !started && !testMode, sub: started || testMode ? `${Math.min(c.unlockedIsland, CAMPAIGN_SIZE)} / ${CAMPAIGN_SIZE}` : '' }),
    navButton('Île infinie', () => game.startInfinite(), { iconName: 'icon_wind', disabled: !(Save.data.infinite.unlocked || c.unlockedIsland > 10 || testMode), title: 'Se déverrouille après l’île 10', sub: Save.data.infinite.best ? `${Save.data.infinite.best} pts` : '' }),
    navButton('Île du jour', () => game.startDaily(), { iconName: 'icon_sun', disabled: !(c.unlockedIsland >= 8 || testMode), title: `Se déverrouille après l’île 7 · ${dailyLabel(dailyKey())}`, sub: (Save.data.daily && Save.data.daily.best[dailyKey()]) ? `${Save.data.daily.best[dailyKey()]} pts` : (Save.data.daily && Save.data.daily.streak ? `${Save.data.daily.streak} j` : '') }),
    navButton('Jardin', () => game.startGarden(), { iconName: 'icon_leaf', disabled: !(started || testMode), title: 'Pose libre, sans score' }),
    h('div', { class: 'menu-row' },
      navButton('Guide', () => game.showGuide(), { iconName: 'icon_question', title: 'Tuiles, saisons, faune, souffles, graines' }),
      navButton('Options', () => game.showOptions(), { iconName: 'icon_gear' }),
      navButton('Succès', () => game.showAchievements(), { iconName: 'icon_medal', sub: `${achCount()} / ${ACHIEVEMENTS.length}` }),
      navButton('Crédits', () => game.showCredits(), { iconName: 'icon_info' }),
    ),
    navButton('Plein écran', () => game.toggleFullscreen(), { cls: 'btn-ghost', iconName: 'icon_fullscreen' }),
  );
  const foot = h('div', { class: 'menu-foot' },
    h('div', { class: 'foot-left' },
      testMode ? h('span', { class: 'foot-test' }, 'Mode test actif') : null,
      h('span', { class: 'foot-stat' }, icon('icon_star'), `${totalStars} / ${CAMPAIGN_SIZE * 3} étoiles`),
      h('span', { class: 'foot-stat' }, icon('icon_leaf'), `${c.seeds} graines`),
    ),
    h('div', { class: 'foot-right' }, `${STORY.title} · ${VERSION}`),
  );
  append(root, h('div', { class: 'menu-veil' }), title, nav, foot);
  setTimeout(() => stagger(nav, '.btn', 60), 60);

  function showIslands() {
    const rows = h('div', { class: 'acts' });
    for (const ch of CHAPTERS) {
      const first = (ch.id - 1) * 5 + 1; const got = chapterStars(c.stars, ch.id);
      const open = testMode || c.unlockedIsland >= first;
      const climate = ch.climate !== 'mixed' && ch.climate !== 'temperate' && STORY.climates && STORY.climates[ch.climate] ? ` · ${STORY.climates[ch.climate].name}` : (ch.climate === 'mixed' ? ' · climats variés' : '');
      const ctr = contractLine(c, ch.id);
      const row = h('div', { class: `act-row ${open ? '' : 'act-locked'}` }, h('div', { class: 'act-head' }, h('div', { class: 'act-num' }, `Chapitre ${ch.id} · ${ch.name}`), h('div', { class: 'act-name' }, `${ch.sub}${climate} · ${got} / 15 étoiles`), ctr ? h('div', { class: `act-contract ${ctr.done ? 'done' : ''}`, title: 'Contrat d’archipel : rempli, il vaut deux étoiles pour la porte' }, `Contrat · ${ctr.text}`) : null));
      for (let n = first; n < first + 5; n++) {
        const def = campaignIsland(n); const name = def.story && STORY.islands[def.story] ? STORY.islands[def.story].name : def.name;
        const unlocked = testMode || n <= c.unlockedIsland;
        const stars = c.stars[n] || 0;
        const card = h('button', { class: `night-card ${unlocked ? '' : 'locked'} act-${((ch.id - 1) % 3) + 1} ${def.memory ? 'memory' : ''} ${n === Math.min(c.unlockedIsland, CAMPAIGN_SIZE) && !c.completed ? 'current' : ''}`, disabled: !unlocked, title: unlocked ? `Jouer l’île ${n}` : 'Île verrouillée' },
          h('div', { class: 'nc-num' }, `Île ${n} · ${def.cells} cases${def.memory ? ' · souvenir' : ''}${def.signature ? ` · ${def.signature.name.toLowerCase()}` : ''}`),
          h('div', { class: 'nc-title' }, name),
          h('div', { class: `nc-stars ${c.gold && c.gold[n] ? 'gold' : ''}`, title: c.gold && c.gold[n] ? 'Étoile d’or' : '' }, ...[0, 1, 2].map((i) => h('span', { class: `star ${i < stars ? 'on' : ''}` }, icon('icon_star'))), c.best[n] ? h('span', { class: 'nc-best' }, `${c.best[n]} pts`) : null),
          unlocked ? null : icon('icon_locked', 'nc-lock'),
        );
        card.addEventListener('click', () => game.startIsland(n, { fromSelect: true }));
        row.appendChild(card);
      }
      if (ch.id < CHAPTERS.length && gateStars(c, ch.id) < CHAPTER_GATE && c.unlockedIsland <= first + 4) row.appendChild(h('div', { class: 'act-gate' }, `${CHAPTER_GATE} étoiles dans ce chapitre ouvrent le suivant${ch.id >= 2 ? ' (le contrat d’archipel en vaut deux)' : ''}`));
      rows.appendChild(row);
    }
    game.showPanel(h('div', { class: 'panel panel-nights' }, h('h2', { class: 'panel-title' }, 'Choisir une île'), rows,
      h('div', { class: 'panel-actions' }, button('Retour', () => game.showMenu(), { iconName: 'icon_return' }))));
  }
  return root;
}
