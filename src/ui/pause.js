// Menu de pause : sobre, rappel des contrôles en deux colonnes.
import { h, button } from './dom.js';
import { rule, corner } from './ornaments.js';

const key = (k) => h('span', { class: 'key' }, k);

export function buildPause({ onResume, onRestart, onOptions, onMenu, nightTitle, controls = true }) {
  const root = h('div', { class: 'panel panel-pause' },
    corner('tl'), corner('tr'), corner('bl'), corner('br'),
    h('div', { class: 'res-kicker' }, nightTitle || ''),
    h('h2', { class: 'panel-title' }, 'Pause'),
    rule(),
    controls ? h('div', { class: 'pause-controls' },
      h('div', {}, key('Souris'), h('span', {}, 'orienter le faisceau')),
      h('div', {}, key('Glisser'), h('span', {}, 'tracer la route d’un navire')),
      h('div', {}, key('Clic'), h('span', {}, 'effacer la route d’un navire')),
      h('div', {}, key('Espace'), h('span', {}, 'corne de brume')),
      h('div', {}, key('Clic droit'), h('span', {}, 'jeter ou lever l’ancre')),
      h('div', {}, key('F'), h('span', {}, 'feu réduit, économise l’huile')),
      h('div', {}, key('M'), h('span', {}, 'couper le son')),
      h('div', {}, key('Échap'), h('span', {}, 'pause')),
    ) : null,
    h('div', { class: 'panel-actions column' },
      button('Reprendre', onResume, { cls: 'btn-primary', iconName: 'icon_play' }),
      button('Recommencer la nuit', onRestart, { iconName: 'icon_return' }),
      button('Options', onOptions, { iconName: 'icon_gear' }),
      button('Quitter vers le menu', onMenu, { cls: 'btn-ghost', iconName: 'icon_home' }),
    ),
  );
  setTimeout(() => { const b = root.querySelector('.btn-primary'); if (b) b.focus({ preventScroll: true }); }, 50);
  return root;
}
