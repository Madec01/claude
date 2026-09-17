// L'Atelier des saisons : dépenser les graines en améliorations.
import { h, button, icon } from './dom.js';
import { UPGRADES, upgradeCost, upgradeMax } from '../data/upgrades.js';
import { Save } from '../core/save.js';
import { AudioSys } from '../core/audio.js';

export function buildWorkshop({ onContinue, intro }) {
  const c = Save.campaign;
  const root = h('div', { class: 'panel panel-workshop' });
  const seedsEl = h('div', { class: 'seeds', title: 'Graines' }, icon('icon_leaf'), h('b', {}, String(c.seeds)), h('span', {}, 'graines'));
  const grid = h('div', { class: 'ws-grid' });
  const render = () => {
    grid.innerHTML = '';
    seedsEl.querySelector('b').textContent = String(c.seeds);
    for (const u of UPGRADES) {
      const lvl = c.upgrades[u.id] || 0, max = upgradeMax(u), cost = upgradeCost(u, lvl), can = cost !== null && c.seeds >= cost;
      const pips = h('div', { class: 'ws-pips', title: `Niveau ${lvl} / ${max}` }, ...Array.from({ length: max }, (_, i) => h('span', { class: `pip ${i < lvl ? 'on' : ''}` })));
      const card = h('div', { class: `ws-card ${cost === null ? 'maxed' : can ? 'can' : ''}` },
        h('div', { class: 'ws-head' }, h('span', { class: 'ws-icon' }, icon(u.icon)), h('h4', {}, u.name)),
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
  root.append(
    h('h2', { class: 'panel-title' }, 'L’Atelier des saisons'),
    h('div', { class: 'ws-head-row' }, h('p', { class: 'ws-intro' }, intro || 'Les graines gagnées sur les îles font pousser de nouvelles habitudes de la Saison.'), seedsEl),
    grid,
    h('div', { class: 'panel-actions' }, button('Continuer', onContinue, { cls: 'btn-primary', iconName: 'icon_arrow_right' })),
  );
  return root;
}
