// Écran des options : volumes, confort, mode test, sauvegarde.
import { h, button, icon } from './dom.js';
import { rule, corner } from './ornaments.js';
import { AudioSys } from '../core/audio.js';
import { Save } from '../core/save.js';

function slider(label, key, onChange, iconName) {
  const v = Save.options[key];
  const id = `opt-${key}`;
  const input = h('input', { type: 'range', min: 0, max: 100, value: Math.round(v * 100), class: 'slider', id, 'aria-label': label });
  const val = h('span', { class: 'opt-val' }, `${Math.round(v * 100)} %`);
  input.addEventListener('input', () => { const x = input.value / 100; Save.options[key] = x; val.textContent = `${input.value} %`; onChange(x); });
  input.addEventListener('change', () => { Save.save(); AudioSys.play('ui_click', { volume: 0.4 }); });
  return h('div', { class: 'opt-row' }, h('label', { class: 'opt-label', for: id }, iconName ? icon(iconName, 'opt-icon') : null, label), input, val);
}

function toggle(label, key, onChange, desc = '') {
  const input = h('input', { type: 'checkbox', class: 'toggle', role: 'switch' });
  input.checked = !!Save.options[key];
  input.addEventListener('change', () => { Save.options[key] = input.checked; Save.save(); AudioSys.play(input.checked ? 'ui_confirm' : 'ui_back', { volume: 0.5 }); onChange(input.checked); });
  return h('label', { class: 'opt-row opt-toggle' }, h('span', { class: 'opt-label' }, label, desc ? h('small', {}, desc) : null), input, h('span', { class: 'toggle-ui', 'aria-hidden': 'true' }));
}

const key = (k) => h('span', { class: 'key' }, k);

/**
 * @param {object} o { onBack, game }
 */
export function buildOptions({ onBack, game }) {
  const root = h('div', { class: 'panel panel-options' });
  const c = Save.campaign;
  const testGroup = h('div', { class: `opt-group opt-test ${Save.options.testMode ? 'on' : ''}` },
    h('h3', {}, icon('icon_wrench'), 'Mode test'),
    toggle('Activer le mode test', 'testMode', (v) => { testGroup.classList.toggle('on', v); game.setTestMode(v); }, 'Déverrouille toutes les nuits et la Veille infinie. Les scores ne sont pas enregistrés.'),
    h('div', { class: 'opt-keys' }, h('span', {}, key('F1'), 'débogage'), h('span', {}, key('F2'), 'navires invulnérables'), h('span', {}, key('F3'), 'vitesse ×2'), h('span', {}, key('F4'), 'brouillard'), h('span', {}, key('F5'), 'finir la nuit')),
    toggle('Sauter les tutoriels', 'skipTutorial', () => {}, 'Les consignes des premières nuits ne s’affichent plus.'),
  );
  const saveGroup = h('div', { class: 'opt-group opt-save' },
    h('h3', {}, icon('icon_save'), 'Sauvegarde'),
    h('p', { class: 'opt-note' }, `Nuit ${c.unlockedNight} débloquée · ${c.shards} Éclats en réserve · ${c.pagesRead.length} pages lues · ${Object.values(c.stars || {}).reduce((a, b) => a + b, 0)} étoiles.`),
    button('Effacer la progression', () => {
      if (root.querySelector('.confirm')) return;
      const cf = h('div', { class: 'confirm' }, h('span', {}, 'Tout effacer, vraiment ? Les étoiles, les Éclats et les pages seront perdus. '),
        button('Oui, effacer', () => { Save.reset(); game.onSaveReset(); cf.replaceWith(h('p', { class: 'opt-note' }, 'Progression effacée. Le journal repart de la première nuit.')); }, { cls: 'btn-danger btn-small', iconName: 'icon_check' }),
        button('Annuler', () => cf.remove(), { cls: 'btn-small' }));
      saveGroup.appendChild(cf);
    }, { cls: 'btn-danger btn-small', iconName: 'icon_cross' }),
  );
  root.append(
    corner('tl'), corner('tr'), corner('bl'), corner('br'),
    h('h2', { class: 'panel-title' }, 'Options'), rule(),
    h('div', { class: 'opt-cols' },
      h('div', { class: 'opt-col' },
        h('div', { class: 'opt-group' },
          h('h3', {}, icon('icon_audio_on'), 'Son'),
          slider('Volume général', 'master', (v) => AudioSys.setVolume('master', v)),
          slider('Musique', 'music', (v) => AudioSys.setVolume('music', v)),
          slider('Ambiance', 'ambience', (v) => AudioSys.setVolume('ambience', v)),
          slider('Effets', 'sfx', (v) => AudioSys.setVolume('sfx', v)),
          toggle('Couper le son', 'muted', (v) => AudioSys.setMuted(v), 'Touche M à tout moment.'),
        ),
        h('div', { class: 'opt-group' },
          h('h3', {}, icon('icon_contrast'), 'Confort'),
          toggle('Tremblement de l’écran', 'shake', () => {}, 'Secousse lors d’un naufrage.'),
          toggle('Afficher les images par seconde', 'showFps', (v) => game.setFpsVisible(v)),
          h('div', { class: 'opt-row opt-btnrow' }, h('span', { class: 'opt-label' }, 'Affichage', h('small', {}, 'Le jeu s’adapte à la fenêtre ; le plein écran masque le navigateur.')), button('Plein écran', () => game.toggleFullscreen(), { iconName: 'icon_fullscreen', cls: 'btn-small' })),
        ),
      ),
      h('div', { class: 'opt-col' }, testGroup, saveGroup),
    ),
    h('div', { class: 'panel-actions' }, button('Retour', onBack, { iconName: 'icon_return' })),
  );
  return root;
}
