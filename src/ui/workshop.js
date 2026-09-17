// L'Atelier du phare : dépenser les Éclats en améliorations (planches d'atelier sur parchemin).
import { h, button, icon } from './dom.js';
import { rule, corner } from './ornaments.js';
import { UPGRADES, upgradeCost, upgradeMax } from '../data/upgrades.js';
import { Save } from '../core/save.js';
import { AudioSys } from '../core/audio.js';

export function buildWorkshop({ onContinue, intro }) {
  const c = Save.campaign;
  const root = h('div', { class: 'panel parchment panel-workshop' });
  const shardsEl = h('div', { class: 'shards', title: 'Éclats de l’ancienne lentille' }, icon('icon_diamond'), h('b', {}, String(c.shards)), h('span', {}, 'Éclats'));
  const grid = h('div', { class: 'ws-grid' });
  const render = () => {
    grid.innerHTML = '';
    shardsEl.querySelector('b').textContent = String(c.shards);
    for (const u of UPGRADES) {
      const lvl = c.upgrades[u.id] || 0;
      const max = upgradeMax(u);
      const cost = upgradeCost(u, lvl);
      const can = cost !== null && c.shards >= cost;
      const pips = h('div', { class: 'ws-pips', title: `Niveau ${lvl} / ${max}` }, ...Array.from({ length: max }, (_, i) => h('span', { class: `pip ${i < lvl ? 'on' : ''}` })));
      const card = h('div', { class: `ws-card ${cost === null ? 'maxed' : can ? 'can' : ''}` },
        h('div', { class: 'ws-head' }, h('span', { class: 'ws-icon' }, icon(u.icon)), h('h4', {}, u.name)),
        h('p', { class: 'ws-desc' }, u.desc),
        h('div', { class: 'ws-level' }, h('span', { class: 'ws-cur' }, u.levels[lvl]), cost !== null ? h('span', { class: 'ws-next' }, `→ ${u.levels[lvl + 1]}`) : h('span', {}, '· niveau final')),
        h('div', { class: 'ws-foot' }, pips,
          cost === null ? h('div', { class: 'ws-max' }, 'Au maximum') : button(`${cost} Éclats`, () => {
            if (c.shards < cost) { AudioSys.play('ui_error', { volume: 0.5 }); card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 400); return; }
            c.shards -= cost; c.upgrades[u.id] = lvl + 1; Save.save();
            AudioSys.play('upgrade', { volume: 0.8 });
            render();
          }, { cls: `btn-small ${can ? 'btn-primary' : ''}`, iconName: 'icon_diamond', disabled: !can, title: can ? `Améliorer pour ${cost} Éclats` : `Il manque ${cost - c.shards} Éclat${cost - c.shards > 1 ? 's' : ''}` }),
        ),
      );
      grid.appendChild(card);
    }
  };
  render();
  root.append(
    corner('tl'), corner('tr'), corner('bl'), corner('br'),
    h('h2', { class: 'panel-title' }, 'L’Atelier du phare'), rule(),
    h('div', { class: 'ws-head-row' },
      h('p', { class: 'ws-intro' }, intro || 'Maël a apporté ce qu’il a pu trouver au village. Les Éclats de l’ancienne lentille paient le travail.'),
      shardsEl),
    grid,
    h('div', { class: 'panel-actions' }, button('Continuer', onContinue, { cls: 'btn-primary', iconName: 'icon_arrow_right' })),
  );
  return root;
}
