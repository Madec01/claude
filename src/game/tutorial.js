// Tutoriel intégré : consignes d'une île, validées par des conditions de jeu.
import { STORY } from '../data/story.js';

const RULES = {
  place:    { when: () => true, done: (i) => i.placements >= 1, info: false },
  affinity: { when: (i) => i.placements >= 1, done: (i) => i.score >= 4, info: false, timeout: 60 },
  close:    { when: (i) => i.placements >= 3, done: (i) => i.stats.closed >= 1, info: false, timeout: 90 },
  river:    { when: (i) => i.placements >= 1, done: (i, ev) => ev.has('river'), info: false, timeout: 60 },
  season:   { when: (i) => i.placements >= 2, done: (i, ev) => ev.has('season'), info: true, timeout: 40 },
  fauna:    { when: (i) => i.placements >= 2, done: (i, ev) => ev.has('fauna'), info: true, timeout: 45 },
  wish:     { when: () => true, done: () => false, info: true, timeout: 25 },
  breath:   { when: (i) => i.breaths >= 1 || i.placements >= 6, done: (i, ev) => ev.has('breath'), info: true, timeout: 40 },
  rare:     { when: (i) => i.placements >= 2, done: (i, ev) => ev.has('rare'), info: true, timeout: 30 },
};

export class Tutorial {
  constructor(root, island, islandId, enabled) {
    this.root = root; this.isl = island;
    const def = STORY.islands[islandId];
    this.steps = enabled && def && def.tutorial ? [...def.tutorial] : [];
    this.idx = 0; this.current = null; this.shownFor = 0; this.events = new Set(); this.dismissed = false;
    this.root.innerHTML = '';
    this.doneAll = this.steps.length === 0;
  }
  onEvent(ev) { this.events.add(ev); }
  update(dt) {
    if (this.doneAll) return;
    if (!this.current) {
      if (this.idx >= this.steps.length) { this.doneAll = true; return; }
      const step = this.steps[this.idx];
      const rule = RULES[step.id] || { when: () => true, done: () => false, info: true, timeout: 12 };
      if (rule.when(this.isl)) { this.current = { step, rule }; this.show(step, rule); this.shownFor = 0; this.events.clear(); }
      return;
    }
    this.shownFor += dt;
    const { rule } = this.current;
    const done = rule.done(this.isl, this.events) || (rule.timeout && this.shownFor > rule.timeout) || this.dismissed;
    if (done && this.shownFor > 1) this.complete();
  }
  show(step, rule) {
    this.dismissed = false;
    this.root.innerHTML = `<div class="tuto-card"><div class="tuto-text">${step.text}</div>${rule.info ? '<button class="tuto-ok">Compris</button>' : '<div class="tuto-hint">…</div>'}</div>`;
    const b = this.root.querySelector('.tuto-ok');
    if (b) b.addEventListener('click', (e) => { e.stopPropagation(); this.dismissed = true; });
    requestAnimationFrame(() => this.root.querySelector('.tuto-card')?.classList.add('on'));
  }
  complete() {
    const card = this.root.querySelector('.tuto-card');
    if (card) { card.classList.add('done'); setTimeout(() => { if (card.parentNode) card.remove(); }, 500); }
    this.current = null; this.idx++;
  }
  destroy() { this.root.innerHTML = ''; }
}
