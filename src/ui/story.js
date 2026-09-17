// Écrans narratifs : la voix de l'île (prologue, ouverture, souvenirs, fin), titres d'îles, souvenirs.
import { h, button, append } from './dom.js';
import { STORY } from '../data/story.js';
import { AudioSys } from '../core/audio.js';

/**
 * @param {Array<{kind:'title'|'voice'|'ending', text?:string, title?:string, sub?:string, kicker?:string}>} screens
 */
export function buildStory(screens, { onDone, skippable = true }) {
  let i = 0, busy = false, done = false;
  const root = h('div', { class: 'story' });
  const stage = h('div', { class: 'story-stage' });
  const hint = h('div', { class: 'story-hint' }, 'Cliquer ou Espace pour continuer');
  const progress = h('div', { class: 'story-progress', 'aria-hidden': 'true' });
  const actions = h('div', { class: 'story-actions' });
  if (skippable) actions.appendChild(button('Passer', () => finish(), { cls: 'btn-ghost btn-small', title: 'Passer (Échap)' }));
  append(root, stage, hint, progress, actions);
  const dots = screens.map(() => h('span', { class: 'dot' }));
  if (screens.length > 1) progress.append(...dots);

  function render() {
    const s = screens[i];
    dots.forEach((d, k) => d.classList.toggle('on', k <= i));
    const card = h('div', { class: `story-card kind-${s.kind}` });
    if (s.kind === 'title') append(card, h('div', { class: 'story-kicker' }, s.kicker || ''), h('h1', { class: 'story-title' }, s.title || ''), s.sub ? h('div', { class: 'story-sub' }, s.sub) : null, s.text ? h('p', { class: 'story-text' }, s.text) : null);
    else append(card, h('div', { class: 'story-kicker' }, s.kicker || 'L’île'), h('p', { class: 'story-text voice' }, s.text), h('div', { class: 'story-num' }, `${i + 1} / ${screens.length}`));
    const old = stage.firstChild;
    if (old) { old.classList.add('out'); setTimeout(() => old.remove(), 350); }
    stage.appendChild(card);
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('in')));
    AudioSys.play(i % 2 ? 'page_flip_1' : 'page_flip_2', { volume: 0.4 });
    hint.textContent = i === screens.length - 1 ? 'Cliquer ou Espace pour fermer' : 'Cliquer ou Espace pour continuer';
  }
  function next() { if (busy) return; busy = true; setTimeout(() => { busy = false; }, 280); if (i >= screens.length - 1) { finish(); return; } i++; render(); }
  function finish() { if (done) return; done = true; window.removeEventListener('keydown', onKey); onDone(); }
  function onKey(e) { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') { e.preventDefault(); next(); } if (e.code === 'Escape' && skippable) finish(); }
  root.addEventListener('click', (e) => { if (e.target.closest('button')) return; next(); });
  window.addEventListener('keydown', onKey);
  render();
  root.destroy = () => window.removeEventListener('keydown', onKey);
  return root;
}

const arch = (id) => STORY.archipelagos[id] || { name: '', sub: '' };

export function islandIntroScreens(def) {
  const s = STORY.islands[def.id]; if (!s) return [];
  const a = arch(def.arch);
  return [{ kind: 'title', kicker: `${a.name} · île ${def.id}`, title: s.name, sub: a.sub }, ...s.intro.map((t) => ({ kind: 'voice', text: t }))];
}
export function islandMemoryScreens(def) { const s = STORY.islands[def.id]; return s ? s.memory.map((t) => ({ kind: 'voice', kicker: 'Souvenir', text: t })) : []; }
export const prologueScreens = () => [{ kind: 'title', kicker: STORY.subtitle, title: STORY.title }, ...STORY.prologue.map((t) => ({ kind: 'voice', text: t }))];
export const endingScreens = () => [...STORY.ending.map((t) => ({ kind: 'ending', kicker: 'L’île', text: t })), { kind: 'title', kicker: 'Épilogue', title: STORY.title, text: STORY.epilogue }];
export const infiniteScreens = () => [{ kind: 'title', kicker: 'Mode', title: 'Île infinie' }, ...STORY.infinite.intro.map((t) => ({ kind: 'voice', text: t }))];
export const gardenScreens = () => [{ kind: 'title', kicker: 'Mode', title: 'Jardin' }, ...STORY.garden.intro.map((t) => ({ kind: 'voice', text: t }))];
