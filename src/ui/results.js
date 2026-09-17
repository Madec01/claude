// Bilan d'une île.
import { h, button, icon, fmtInt, stagger, append } from './dom.js';
import { STORY } from '../data/story.js';
import { AudioSys } from '../core/audio.js';
import { Save } from '../core/save.js';

export function buildResults({ result, def, onContinue, onRetry, onMenu, newRecord, seedsGained, daily }) {
  const { stars, score, thresholds } = result;
  const special = result.island === 'infinite' || result.island === 'garden';
  const name = STORY.islands[result.island] ? STORY.islands[result.island].name : result.island === 'infinite' ? 'Île infinie' : result.island === 'daily' ? (def && def.name) || 'Île du jour' : 'Jardin';
  const root = h('div', { class: `panel panel-results stars-${stars}` });
  const lines = STORY.results[stars] || [''];
  const line = lines[Math.floor(Math.random() * lines.length)];
  const starsEl = h('div', { class: 'stars', 'aria-label': `${stars} étoile(s) sur 3` }, ...[0, 1, 2].map((i) => h('span', { class: `star ${i < stars ? 'on' : ''}`, title: `${thresholds[i]} points${i === 2 && result.wishesTotal ? ' et tous les vœux' : ''}` }, icon('icon_star'))));
  const row = (label, value, cls = '') => h('div', { class: `res-row ${cls}` }, h('span', {}, label), h('b', {}, String(value)));
  append(root, 
    h('div', { class: 'res-kicker' }, special ? (result.island === 'infinite' ? `Île infinie · ${result.seasons} saisons` : 'Jardin') : result.island === 'daily' ? name : `Île ${result.island} · ${name}`),
    h('h2', { class: 'panel-title' }, special ? 'L’île se repose' : stars === 0 ? 'L’île attend encore' : 'L’île se souvient'),
    special ? null : starsEl,
    h('p', { class: 'res-line' }, line),
    h('div', { class: 'res-grid' },
      row('Points', fmtInt(score), 'score'),
      special ? null : row('Seuils', thresholds.join(' · ')),
      row('Tuiles posées', `${result.filled} / ${result.cells}`),
      row('Régions closes', result.stats.closed, result.stats.closed ? 'good' : ''),
      row('Plus grande région', result.stats.biggestRegion),
      row('Animaux (au plus)', result.stats.faunaMax, result.stats.faunaMax ? 'good' : ''),
      result.wishesTotal ? row('Vœux exaucés', `${result.wishesDone} / ${result.wishesTotal}`, result.wishesDone === result.wishesTotal ? 'gold' : '') : null,
      row('Saisons traversées', result.seasons),
      seedsGained ? row('Graines gagnées', `+${seedsGained}`, 'gold') : null,
      daily ? row('Meilleur du jour', daily.best, 'gold') : null,
      daily ? row('Jours d’affilée', daily.streak) : null,
    ),
    daily ? h('p', { class: 'res-note' }, 'Île du jour : la même île pour tout le monde, un meilleur score par jour. Demain, une autre île.') : special ? null : h('p', { class: 'res-note' }, Save.options.testMode ? 'Mode test : les graines et les étoiles ne sont pas enregistrées.' : seedsGained ? 'Graines : 1 par nouvelle étoile, 1 par vœu exaucé et 2 pour l’île, la première fois. Elles se dépensent dans l’Atelier des saisons.' : 'Pas de nouvelle graine : elles viennent des nouvelles étoiles, des vœux exaucés et de la première fois qu’une île est terminée.'),
    newRecord ? h('div', { class: 'res-record' }, 'Nouveau record !') : null,
    h('div', { class: 'panel-actions' },
      button(special ? 'Rejouer' : 'Continuer', onContinue, { cls: 'btn-primary', iconName: 'icon_arrow_right' }),
      special || result.island === 'daily' ? null : button('Rejouer l’île', onRetry, { iconName: 'icon_return' }),
      button('Menu', onMenu, { cls: 'btn-ghost', iconName: 'icon_home' }),
    ),
  );
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => {
    stagger(root, '.res-row', reduced ? 0 : 80);
    starsEl.querySelectorAll('.star.on').forEach((s, i) => setTimeout(() => { s.classList.add('pop'); AudioSys.play(`star_${i + 1}`, { volume: 0.7 }); }, reduced ? 0 : 500 + i * 380));
  }, 200);
  return root;
}
