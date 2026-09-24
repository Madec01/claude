// Écrans narratifs : la voix de l'île (prologue, ouverture, souvenirs, fin), titres d'îles, souvenirs.
import { h, button, append } from './dom.js';
import { STORY } from '../data/story.js';
import { CHAPTERS } from '../data/campaign.js';
import { AudioSys } from '../core/audio.js';

/**
 * @param {Array<{kind:'title'|'voice'|'ending', text?:string, title?:string, sub?:string, kicker?:string}>} screens
 */
export function buildStory(screens, { onDone, skippable = true }) {
  let i = 0, busy = false, done = false;
  const root = h('div', { class: 'story' });
  const stage = h('div', { class: 'story-stage' });
  // au toucher, « Cliquer ou Espace » ne veut rien dire : la consigne suit l'appareil
  const touch = document.documentElement.classList.contains('touch');
  const say = (v) => touch ? `Toucher pour ${v}` : `Cliquer ou Espace pour ${v}`;
  const hint = h('div', { class: 'story-hint' }, say('continuer'));
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
    hint.textContent = say(i === screens.length - 1 ? 'fermer' : 'continuer');
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
  const s = def.story ? STORY.islands[def.story] : (def.name ? { name: def.name, intro: def.intro || [] } : null); if (!s) return [];
  const ch = def.chapter ? CHAPTERS[def.chapter - 1] : null; const a = ch ? { name: `Chapitre ${ch.id} · ${ch.name}`, sub: ch.sub } : arch(def.arch);
  const cl = def.climate && def.climate !== 'temperate' && STORY.climates && STORY.climates[def.climate] ? ` · ${STORY.climates[def.climate].name}` : '';
  const sg = def.signature ? [{ kind: 'voice', kicker: `Signature · ${def.signature.name}`, text: def.signature.text }] : [];
  return [{ kind: 'title', kicker: `${a.name} · île ${def.id}${cl}`, title: s.name, sub: def.signature ? `${a.sub} · ${def.signature.name}` : a.sub }, ...s.intro.map((t) => ({ kind: 'voice', text: t })), ...sg];
}
export function islandMemoryScreens(def, result = null) {
  const s = def.story ? STORY.islands[def.story] : null; const lines = [...(s ? s.memory : (def.memoryText ? [def.memoryText] : []))];
  // la voix tient compte de l'île bâtie : une ligne de plus selon sa dominante
  const dom = result && result.dominant ? STORY.memoryVoice[result.dominant.family] : null;
  if (dom && dom.length) lines.push(dom[(Number(def.id) || 0) % dom.length]);
  return lines.map((t) => ({ kind: 'voice', kicker: 'Souvenir', text: t }));
}
export const prologueScreens = () => [{ kind: 'title', kicker: STORY.subtitle, title: STORY.title }, ...STORY.prologue.map((t) => ({ kind: 'voice', text: t }))];
export const endingScreens = () => [...STORY.ending.map((t) => ({ kind: 'ending', kicker: 'L’île', text: t })), { kind: 'title', kicker: 'Épilogue', title: STORY.title, text: STORY.epilogue }];
export const tempoScreens = () => [{ kind: 'title', kicker: 'Mode', title: 'Le Souffle court' }, ...STORY.tempo.intro.map((t) => ({ kind: 'voice', text: t }))];
export const infiniteScreens = () => [{ kind: 'title', kicker: 'Mode', title: 'Île infinie' }, ...STORY.infinite.intro.map((t) => ({ kind: 'voice', text: t }))];
export const dailyScreens = (def) => [{ kind: 'title', kicker: 'Île du jour', title: def.name, sub: `${def.cells} cases` }, ...STORY.daily.intro.map((t) => ({ kind: 'voice', text: t }))];
export const gardenScreens = () => [{ kind: 'title', kicker: 'Mode', title: 'Jardin' }, ...STORY.garden.intro.map((t) => ({ kind: 'voice', text: t }))];
