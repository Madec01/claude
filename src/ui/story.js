// Écrans narratifs : prologue, journal d'Élise, dialogues, pages de Yann, fin.
import { h, button, icon } from './dom.js';
import { rule } from './ornaments.js';
import { STORY } from '../data/story.js';
import { AudioSys } from '../core/audio.js';

/** append() du DOM insère le texte « null » pour un enfant nul : on filtre. */
const append = (el, ...kids) => el.append(...kids.filter(Boolean));

const ROMAN = { 1: 'I', 2: 'II', 3: 'III' };
const PORTRAITS = { elise: 'lighthouse', yann: 'banner', legoff: 'dock_icon', mael: 'ship_icon' };

/**
 * Construit une séquence d'écrans narratifs.
 * @param {Array<{kind:'title'|'journal'|'dialogue'|'page'|'ending', text?:string, speaker?:string, title?:string, sub?:string, act?:number, night?:number|string}>} screens
 * @param {{onDone:Function, skippable?:boolean}} o
 */
export function buildStory(screens, { onDone, skippable = true }) {
  let i = 0;
  let busy = false;
  const root = h('div', { class: 'story' });
  const stage = h('div', { class: 'story-stage' });
  const hint = h('div', { class: 'story-hint' }, 'Cliquer ou Espace pour continuer');
  const progress = h('div', { class: 'story-progress', 'aria-hidden': 'true' });
  const actions = h('div', { class: 'story-actions' });
  if (skippable) actions.appendChild(button('Passer', () => finish(), { cls: 'btn-ghost btn-small', iconName: 'icon_next', title: 'Passer (Échap)' }));
  append(root, stage, hint, progress, actions);

  const dots = screens.map(() => h('span', { class: 'dot' }));
  if (screens.length > 1) progress.append(...dots);

  function render() {
    const s = screens[i];
    dots.forEach((d, k) => d.classList.toggle('on', k <= i));
    const card = h('div', { class: `story-card kind-${s.kind}` });
    if (s.kind === 'title') {
      const act = s.act ? `Acte ${ROMAN[s.act] || s.act}` : '';
      append(card, 
        act ? h('div', { class: 'story-act' }, act) : h('div', { class: 'story-kicker' }, s.sub || ''),
        act && s.night ? h('div', { class: 'story-night' }, typeof s.night === 'number' ? `Nuit ${s.night}` : s.night) : null,
        h('h1', { class: 'story-title' }, s.title || ''),
        rule(),
        s.text ? h('p', { class: 'story-text' }, s.text) : null,
      );
    } else if (s.kind === 'journal') {
      append(card, h('div', { class: 'story-kicker' }, 'Journal d’Élise Kervran'), icon('lighthouse', 'story-ornament'), h('p', { class: 'story-text hand' }, s.text), h('div', { class: 'story-num' }, `${i + 1} / ${screens.length}`));
    } else if (s.kind === 'page') {
      append(card, h('div', { class: 'story-kicker' }, s.title || 'Page du journal de Yann'), icon('banner', 'story-ornament'), h('p', { class: 'story-text hand yann' }, s.text), h('div', { class: 'story-num' }, 'Y. K.'));
    } else if (s.kind === 'dialogue') {
      const c = STORY.characters[s.speaker] || { name: '', role: '' };
      append(card, h('div', { class: 'story-portrait', 'aria-hidden': 'true' }, icon(PORTRAITS[s.speaker] || 'element_circle')), h('div', { class: 'story-speaker' }, h('b', {}, c.name), h('span', {}, c.role)), h('p', { class: 'story-text' }, s.text));
    } else {
      append(card, h('div', { class: 'story-kicker' }, 'Journal d’Élise Kervran'), icon('lighthouse', 'story-ornament'), h('p', { class: 'story-text hand' }, s.text), h('div', { class: 'story-num' }, `${i + 1} / ${screens.length}`));
    }
    const old = stage.firstChild;
    if (old) { old.classList.add('out'); setTimeout(() => old.remove(), 350); }
    stage.appendChild(card);
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('in')));
    AudioSys.play(i % 2 ? 'page_flip_1' : 'page_flip_2', { volume: 0.45 });
    hint.textContent = i === screens.length - 1 ? (screens.length > 1 ? 'Cliquer ou Espace pour fermer' : 'Cliquer ou Espace pour continuer') : 'Cliquer ou Espace pour continuer';
  }

  function next() {
    if (busy) return;
    busy = true; setTimeout(() => { busy = false; }, 300);
    if (i >= screens.length - 1) { finish(); return; }
    i++; render();
  }
  let done = false;
  function finish() { if (done) return; done = true; window.removeEventListener('keydown', onKey); onDone(); }
  function onKey(e) { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') { e.preventDefault(); next(); } if (e.code === 'Escape' && skippable) finish(); }
  root.addEventListener('click', (e) => { if (e.target.closest('button')) return; next(); });
  window.addEventListener('keydown', onKey);
  render();
  root.destroy = () => window.removeEventListener('keydown', onKey);
  return root;
}

/** Écrans d'introduction d'une nuit : titre, journal, briefing. */
export function nightIntroScreens(nightId) {
  const n = STORY.nights[nightId];
  if (!n) return [];
  const s = [{ kind: 'title', sub: `Nuit ${nightId} · Acte ${n.act}`, title: n.title, act: n.act, night: nightId }];
  for (const t of n.journal) s.push({ kind: 'journal', text: t });
  for (const l of n.briefing.lines) s.push({ kind: 'dialogue', speaker: n.briefing.speaker, text: l });
  return s;
}

export function nightOutroScreens(nightId, win) {
  const n = STORY.nights[nightId];
  if (!n) return [];
  const o = win ? n.outroWin : n.outroLose;
  return o.lines.map((l) => ({ kind: 'dialogue', speaker: o.speaker, text: l }));
}

export const prologueScreens = () => [{ kind: 'title', sub: 'Chroniques du phare de Sant-Aël', title: 'Feux de Brume', text: 'Chroniques du phare de Sant-Aël' }, ...STORY.prologue.map((t) => ({ kind: 'journal', text: t }))];
export const endingScreens = () => [...STORY.ending.map((t) => ({ kind: 'ending', text: t })), { kind: 'title', sub: 'Épilogue', title: 'Feux de Brume', text: STORY.epilogue }];
export const infiniteScreens = () => [{ kind: 'title', sub: 'Mode', title: 'Veille infinie', text: 'Les vagues ne s’arrêtent plus. Tenez le feu aussi longtemps que possible.' }, ...STORY.infinite.intro.map((t) => ({ kind: 'journal', text: t }))];
export const pageScreen = (page) => [{ kind: 'page', title: page.title, text: page.text }];
