// Menu d'accueil : continuer, choisir une île, Île infinie, Jardin, options, crédits.
import { ACHIEVEMENTS } from '../data/achievements.js';
import { Achievements } from '../game/achievements.js';
const achCount = () => Achievements.count();
import { h, button, icon, stagger, append } from './dom.js';
import { CHAPTERS, campaignIsland, chapterStars, CAMPAIGN_SIZE, CHAPTER_LEN, gateText, gateOpen, islandDone } from '../data/campaign.js';
import { Save } from '../core/save.js';
import { Version } from '../core/version.js';
import { RunSave } from '../core/run.js';
import { ISLANDS } from '../data/islands.js';
import { STORY } from '../data/story.js';
import { dailyKey, dailyLabel } from '../data/daily.js';
import { UPGRADES, upgradeCost, playerChapter } from '../data/upgrades.js';
import { insigne, insignesGagnes, rangeeArchetypes, srcChapitre } from './collection.js';
import { campaignMechanics } from '../data/campaign.js';

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
    h('div', { class: 'menu-sub' }, 'Trente îles à faire revivre, une tuile à la fois.'),
  );
  const nav = h('nav', { class: 'menu-nav', 'aria-label': 'Menu principal' });
  const primaryLabel = c.completed ? 'Rejouer la campagne' : started ? 'Continuer' : 'Commencer';
  const primarySub = c.completed ? '' : `Île ${Math.min(c.unlockedIsland, CAMPAIGN_SIZE)}`;
  const navButton = (label, fn, o) => { const b = button(label, fn, o); if (o.sub) b.appendChild(h('span', { class: `btn-sub ${o.subClass || ''}` }, o.sub)); return b; };
  // Le jeu se joue surtout au téléphone : il n'y a pas d'infobulle. Un bouton fermé doit donc DIRE sous quelle
  // condition il s'ouvre, et un mode ouvert qu'on n'a jamais essayé doit se signaler. Sans ça, trois modes de jeu
  // s'ouvraient en silence, et l'on ne voyait qu'un bouton gris (retour du commanditaire).
  const vu = (k) => !!(Save.data.seen && Save.data.seen[k]);
  const mode = (ouvert, quand, sub) => ouvert
    ? (vu(quand.key) ? { sub } : { sub: 'nouveau', subClass: 'btn-new' })
    : { sub: quand.text, subClass: 'btn-locked-sub' };
  // une partie laissée en plan attend sur l'appareil : elle passe devant tout le reste
  // (sauf si l'île ne peut plus être reconstruite : l'île du jour d'hier, par exemple)
  // une amélioration ouverte, pas au maximum, que les graines paient
  const atPortee = () => { const chap = playerChapter(c.unlockedIsland), mech = campaignMechanics(Math.max(1, c.unlockedIsland || 1)); return UPGRADES.some((u) => { const cost = upgradeCost(u, c.upgrades[u.id] || 0); return u.chapter <= chap && (!u.requires || mech.has(u.requires)) && cost !== null && c.seeds >= cost; }); };
  const run = (() => { const d = RunSave.describe(); return d && game.defFromWhere(d.where) ? d : null; })();
  append(nav, 
    run ? navButton('Reprendre', () => game.resumeRun(), { cls: 'btn-primary btn-big btn-resume', iconName: 'icon_return', title: `${run.title} · ${run.placements} tuile${run.placements > 1 ? 's' : ''} posée${run.placements > 1 ? 's' : ''} · ${SEASON_FR[run.season] || ''} · laissée ${run.when}`, sub: `${run.title} · ${run.placements} tuile${run.placements > 1 ? 's' : ''}` }) : null,
    navButton(primaryLabel, () => game.startCampaign(), { cls: run ? 'btn-big' : 'btn-primary btn-big', iconName: 'icon_play', sub: primarySub }),
    // Le Souffle court a sa grande tuile, comme la campagne : le mode nerveux à côté du jeu lent, jamais mêlés
    navButton('Le Souffle court', () => game.startTempo(), Object.assign({ cls: 'btn-big btn-tempo', iconName: 'icon_wind', disabled: !(Save.data.infinite.unlocked || c.unlockedIsland > 6 || testMode), title: 'Pas de file : la tuile arrive, trois secondes pour la poser. Une île neuve à chaque partie.' },
      mode(Save.data.infinite.unlocked || c.unlockedIsland > 6 || testMode, { key: 'mode_tempo', text: 's’ouvre après l’île 6' }, Save.data.tempo && Save.data.tempo.best ? `${Save.data.tempo.best} pts` : '3 secondes par tuile'))),
    navButton('Choisir une île', () => showIslands(), { iconName: 'icon_menu', disabled: !started && !testMode, sub: started || testMode ? `${Math.min(c.unlockedIsland, CAMPAIGN_SIZE)} / ${CAMPAIGN_SIZE}` : '' }),
    navButton('Île infinie', () => game.startInfinite(), Object.assign({ iconName: 'icon_tree', disabled: !(Save.data.infinite.unlocked || c.unlockedIsland > 6 || testMode), title: 'Se déverrouille après l’île 6' },
      mode(Save.data.infinite.unlocked || c.unlockedIsland > 6 || testMode, { key: 'mode_infinite', text: 's’ouvre après l’île 6' }, Save.data.infinite.best ? `${Save.data.infinite.best} pts` : ''))),
    navButton('Île du jour', () => game.startDaily(), Object.assign({ iconName: 'icon_sun', disabled: !(c.unlockedIsland >= 6 || testMode), title: `Se déverrouille après l’île 5 · ${dailyLabel(dailyKey())}` },
      mode(c.unlockedIsland >= 6 || testMode, { key: 'mode_daily', text: 's’ouvre après l’île 5' }, (Save.data.daily && Save.data.daily.best[dailyKey()]) ? `${Save.data.daily.best[dailyKey()]} pts` : (Save.data.daily && Save.data.daily.streak ? `${Save.data.daily.streak} j` : '')))),
    // le Jardin et l'Atelier partagent une ligne. L'Atelier se visite depuis le menu (il n'est plus un écran entre
    // deux îles) : ses graines s'allument quand une amélioration est à portée.
    h('div', { class: 'menu-pair' },
      navButton('Jardin', () => game.startGarden(), Object.assign({ iconName: 'icon_leaf', disabled: !(started || testMode), title: 'Pose libre, sans score' },
        mode(started || testMode, { key: 'mode_garden', text: 'après l’île 1' }, 'sans score'))),
      navButton('Atelier', () => game.showWorkshop(), Object.assign({ iconName: 'icon_gear', disabled: !(started || testMode), title: 'L’Atelier des saisons : les graines en améliorations' },
        started || testMode ? { sub: `${c.seeds} graine${c.seeds > 1 ? 's' : ''}`, subClass: atPortee() ? 'btn-new' : '' } : { sub: 'après l’île 1', subClass: 'btn-locked-sub' }))),
    h('div', { class: 'menu-row' },
      navButton('Guide', () => game.showGuide(), { iconName: 'icon_question', title: 'Tuiles, saisons, faune, souffles, graines' }),
      navButton('Options', () => game.showOptions(), { iconName: 'icon_gear' }),
      navButton('Collection', () => game.showAchievements(), { iconName: 'icon_medal', sub: `${achCount() + (c.insignes ? (c.insignes.chapitres || []).length + Object.values(c.insignes.iles || {}).reduce((s, l) => s + l.length, 0) : 0)}` }),   // succès, chapitres et archétypes
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
    h('div', { class: 'foot-right', title: Version.assets ? `assets ${Version.assets}` : '' }, `${STORY.title} · ${VERSION}${Version.assets ? ` · ${Version.assets.slice(0, 6)}` : ''}`),
  );
  append(root, h('div', { class: 'menu-veil' }), title, nav, foot);
  setTimeout(() => stagger(nav, '.btn', 60), 60);

  function showIslands() {
    const rows = h('div', { class: 'acts' });
    for (const ch of CHAPTERS) {
      const first = (ch.id - 1) * CHAPTER_LEN + 1; const got = chapterStars(c.stars, ch.id);
      const open = testMode || c.unlockedIsland >= first;
      const climate = ch.climate !== 'mixed' && ch.climate !== 'temperate' && STORY.climates && STORY.climates[ch.climate] ? ` · ${STORY.climates[ch.climate].name}` : (ch.climate === 'mixed' ? ' · climats variés' : '');
      // l'insigne du chapitre en tête : en couleur une fois l'île-souvenir terminée, en silhouette avant
      const clos = insignesGagnes().chapitres.includes(ch.id);
      const row = h('div', { class: `act-row ${open ? '' : 'act-locked'}` }, h('div', { class: 'act-head' }, insigne(srcChapitre(ch.id), clos, `Chapitre ${ch.id} · ${ch.name}${clos ? '' : ' (terminer son île-souvenir)'}`, 'chapitre'), h('div', {}, h('div', { class: 'act-num' }, `Chapitre ${ch.id} · ${ch.name}`), h('div', { class: 'act-name' }, `${ch.sub}${climate} · ${got} / ${CHAPTER_LEN * 3} étoiles`))));
      for (let n = first; n < first + CHAPTER_LEN; n++) {
        const def = campaignIsland(n); const name = def.story && STORY.islands[def.story] ? STORY.islands[def.story].name : def.name;
        const unlocked = testMode || n <= c.unlockedIsland;
        const stars = c.stars[n] || 0;
        // une île verrouillée dit pourquoi : l'île d'avant reste à terminer, ou c'est la porte du chapitre qui tient
        const why = unlocked ? `Jouer l’île ${n}`
          : n === first && ch.id > 1 && !gateOpen(c, ch.id - 1) ? gateText(c, ch.id - 1)
            : !islandDone(c, n - 1) ? `Termine l’île ${n - 1} et celle-ci s’ouvre — une île terminée suffit, les étoiles ne servent qu’aux portes de chapitre.`
              : 'Île verrouillée';
        const card = h('button', { class: `night-card ${unlocked ? '' : 'locked'} act-${((ch.id - 1) % 3) + 1} ${def.memory ? 'memory' : ''} ${n === Math.min(c.unlockedIsland, CAMPAIGN_SIZE) && !c.completed ? 'current' : ''}`, disabled: !unlocked, title: why },
          h('div', { class: 'nc-num' }, `Île ${n} · ${def.cells} cases${def.memory ? ' · souvenir' : ''}${def.signature ? ` · ${def.signature.name.toLowerCase()}` : ''}`),
          h('div', { class: 'nc-title' }, name),
          h('div', { class: `nc-stars ${c.gold && c.gold[n] ? 'gold' : ''}`, title: c.gold && c.gold[n] ? 'Étoile d’or' : '' }, ...[0, 1, 2].map((i) => h('span', { class: `star ${i < stars ? 'on' : ''}` }, icon('icon_star'))), c.best[n] ? h('span', { class: 'nc-best' }, `${c.best[n]} pts`) : null),
          // les six archétypes que cette île peut donner : ceux déjà gagnés en couleur, les autres en silhouette
          unlocked ? rangeeArchetypes(n, 'petit') : null,
          unlocked ? null : icon('icon_locked', 'nc-lock'),
        );
        card.addEventListener('click', () => game.startIsland(n, { fromSelect: true }));
        row.appendChild(card);
      }
      // la porte : les deux comptes, et qu'une île déjà jouée peut être refaite pour les faire monter
      const gt = ch.id < CHAPTERS.length && open ? gateText(c, ch.id) : null;
      if (gt) row.appendChild(h('div', { class: 'act-gate' }, gt));
      rows.appendChild(row);
    }
    game.showPanel(h('div', { class: 'panel panel-nights' }, h('h2', { class: 'panel-title' }, 'Choisir une île'), rows,
      h('div', { class: 'panel-actions' }, button('Retour', () => game.showMenu(), { iconName: 'icon_return' }))));
  }
  return root;
}
