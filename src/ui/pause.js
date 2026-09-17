// Menu de pause.
import { h, button } from './dom.js';

const key = (k) => h('span', { class: 'key' }, k);

export function buildPause({ onResume, onRestart, onOptions, onGuide, onFullscreen, onMenu, title, controls = true }) {
  const root = h('div', { class: 'panel panel-pause' },
    h('div', { class: 'res-kicker' }, title || ''),
    h('h2', { class: 'panel-title' }, 'Pause'),
    controls ? h('div', { class: 'pause-controls' },
      h('div', {}, key('Souris'), h('span', {}, 'survoler pour voir les points, cliquer pour poser')),
      h('div', {}, key('Clic droit'), h('span', {}, 'glisser pour déplacer la vue')),
      h('div', {}, key('Molette'), h('span', {}, 'zoom')),
      h('div', {}, key('2 / 3'), h('span', {}, 'échanger avec la 2e / 3e tuile (1 souffle)')),
      h('div', {}, key('X'), h('span', {}, 'défausser la tuile (2 souffles)')),
      h('div', {}, key('B'), h('span', {}, 'bourgeon : transformer une prairie (3 souffles)')),
      h('div', {}, key('Z'), h('span', {}, 'souvenir : annuler la dernière pose')),
      h('div', {}, key('P'), h('span', {}, 'mettre la tuile en poche')),
      h('div', {}, key('J'), h('span', {}, 'journal des événements')),
      h('div', {}, key('M'), h('span', {}, 'couper le son')),
      h('div', {}, key('Échap'), h('span', {}, 'pause')),
    ) : null,
    h('div', { class: 'panel-actions column' },
      button('Reprendre', onResume, { cls: 'btn-primary', iconName: 'icon_play' }),
      button('Recommencer l’île', onRestart, { iconName: 'icon_return' }),
      h('div', { class: 'pause-row' }, button('Guide', onGuide, { iconName: 'icon_question' }), button('Options', onOptions, { iconName: 'icon_gear' })),
      onFullscreen ? button(document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran', onFullscreen, { cls: 'btn-ghost', iconName: document.fullscreenElement ? 'icon_fullscreen_exit' : 'icon_fullscreen' }) : null,
      button('Quitter vers le menu', onMenu, { cls: 'btn-ghost', iconName: 'icon_home' }),
    ),
  );
  setTimeout(() => { const b = root.querySelector('.btn-primary'); if (b) b.focus({ preventScroll: true }); }, 50);
  return root;
}
