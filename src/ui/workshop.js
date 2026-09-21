// L'Atelier des saisons : dépenser les graines en améliorations.
import { h, button, icon, append } from './dom.js';
import { campaignMechanics, mechIsland } from '../data/campaign.js';
import { UPGRADES, upgradeCost, upgradeMax, playerChapter } from '../data/upgrades.js';
import { CHAPTERS } from '../data/campaign.js';
import { Save } from '../core/save.js';
import { AudioSys } from '../core/audio.js';

export function buildWorkshop({ onContinue, intro }) {
  const c = Save.campaign;
  const root = h('div', { class: 'panel panel-workshop' });
  const seedsEl = h('div', { class: 'seeds', title: 'Graines' }, icon('icon_leaf'), h('b', {}, String(c.seeds)), h('span', {}, 'graines'));
  const grid = h('div', { class: 'ws-grid' });
  const mech = campaignMechanics(Math.max(1, c.unlockedIsland || 1));
  const chap = playerChapter(c.unlockedIsland);
  const ouvertes = UPGRADES.filter((u) => u.chapter === chap);
  const neuves = ouvertes.filter((u) => !(c.upgrades[u.id] || 0));
  const chDef = CHAPTERS[chap - 1];
  const NB = ['aucune', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six'];
  const chapLine = neuves.length
    ? `Chapitre ${chap}${chDef ? ` · ${chDef.name}` : ''} : ${NB[neuves.length] || neuves.length} amélioration${neuves.length > 1 ? 's' : ''} nouvelle${neuves.length > 1 ? 's' : ''} ici — ${neuves.map((u) => u.name).join(', ')}. Les suivantes restent visibles, grisées, avec leur chapitre.`
    : (ouvertes.length ? `Chapitre ${chap}${chDef ? ` · ${chDef.name}` : ''} : tout ce qui s’ouvrait ici est pris. Les suivantes attendent leur chapitre.` : '');
  const render = () => {
    grid.innerHTML = '';
    seedsEl.querySelector('b').textContent = String(c.seeds);
    for (const u of UPGRADES) {
      const lvl = c.upgrades[u.id] || 0, max = upgradeMax(u), cost = upgradeCost(u, lvl);
      // une amélioration s'ouvre à son chapitre (et, pour certaines, une fois sa mécanique arrivée) ; les suivantes restent visibles, grisées
      const lockedChapter = u.chapter > chap ? u.chapter : null;
      const lockedAt = !lockedChapter && u.requires && !mech.has(u.requires) ? mechIsland(u.requires) : null;
      if (lockedChapter || lockedAt) {
        const ch = lockedChapter ? CHAPTERS[lockedChapter - 1] : null;
        grid.appendChild(h('div', { class: 'ws-card locked' }, h('div', { class: 'ws-head' }, h('span', { class: 'ws-icon' }, icon('icon_locked')), h('h4', {}, u.name)), h('p', { class: 'ws-desc' }, u.desc), h('div', { class: 'ws-level' }, h('span', { class: 'ws-cur' }, lockedChapter ? `Chapitre ${lockedChapter} · ${ch ? ch.name : ''}` : `Se débloque à l’île ${lockedAt}`))));
        continue;
      }
      const can = cost !== null && c.seeds >= cost;
      // « nouveau » tant qu'elle vient de s'ouvrir et qu'on n'y a pas touché : ça s'éteint tout seul à l'achat
      // ou au chapitre suivant, sans rien à ranger en sauvegarde.
      const neuve = u.chapter === chap && lvl === 0;
      const pips = h('div', { class: 'ws-pips', title: `Niveau ${lvl} / ${max}` }, ...Array.from({ length: max }, (_, i) => h('span', { class: `pip ${i < lvl ? 'on' : ''}` })));
      const card = h('div', { class: `ws-card ${cost === null ? 'maxed' : can ? 'can' : ''} ${neuve ? 'ws-new' : ''}` },
        h('div', { class: 'ws-head' }, h('span', { class: 'ws-icon' }, icon(u.icon)), h('h4', {}, u.name), neuve ? h('span', { class: 'ws-badge' }, 'nouveau') : null),
        h('p', { class: 'ws-desc' }, u.desc),
        h('div', { class: 'ws-level' }, h('span', { class: 'ws-cur' }, u.levels[lvl]), cost !== null ? h('span', { class: 'ws-next' }, `→ ${u.levels[lvl + 1]}`) : h('span', {}, '· au maximum')),
        h('div', { class: 'ws-foot' }, pips, cost === null ? h('div', { class: 'ws-max' }, 'Au maximum') : button(`${cost} graines`, () => {
          if (c.seeds < cost) { AudioSys.play('ui_error', { volume: 0.5 }); card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 400); return; }
          c.seeds -= cost; c.upgrades[u.id] = lvl + 1; Save.save(); AudioSys.play('upgrade', { volume: 0.8 }); render();
        }, { cls: `btn-small ${can ? 'btn-primary' : ''}`, iconName: 'icon_leaf', disabled: !can })),
      );
      grid.appendChild(card);
    }
  };
  render();
  append(root, 
    h('h2', { class: 'panel-title' }, 'L’Atelier des saisons'),
    h('div', { class: 'ws-head-row' }, h('p', { class: 'ws-intro' }, intro || 'Les graines viennent des étoiles (1 par nouvelle étoile), des vœux exaucés (1 chacun) et de chaque île terminée pour la première fois (2). Elles se dépensent ici, entre deux îles. Chaque chapitre ouvre de nouvelles améliorations.'), seedsEl),
    // ce que CE chapitre a ouvert, dit en toutes lettres : sans ça, trois ou quatre améliorations apparaissaient
    // au milieu des autres sans que rien ne les signale
    chapLine ? h('p', { class: 'ws-chap' }, chapLine) : null,
    grid,
    h('div', { class: 'panel-actions' }, button('Continuer', onContinue, { cls: 'btn-primary', iconName: 'icon_arrow_right' })),
  );
  return root;
}
