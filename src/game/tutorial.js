// Tutoriel intégré : affiche les consignes d'une nuit et les valide sur des événements de jeu.
import { STORY } from '../data/story.js';

// Conditions de validation par identifiant de consigne.
const RULES = {
  beam:   { when: (n) => n.state !== 'intro', done: (n) => n.beam.totalRotation > 2.2, info: false },
  route:  { when: (n) => n.ships.some((s) => s.active), done: (n) => n.routeTool.routesDrawn >= 1, info: false },
  dock:   { when: (n) => n.ships.some((s) => s.hasRoute), done: (n) => n.stats.docked >= 1, info: false },
  horn:   { when: (n) => n.t > 6, done: (n) => n.horn.blows >= 1, info: false },
  anchor: { when: (n) => n.activeShips.length >= 2, done: (n, ev) => ev.has('anchor'), info: false, timeout: 40 },
  hazard: { when: (n) => n.t > 4, done: (n, ev) => ev.has('reveal'), info: true, timeout: 20 },
  page:   { when: (n) => n.pages.list.some((p) => p.visible), done: (n) => n.stats.pages >= 1, info: false, timeout: 45 },
  tide:   { when: (n) => n.t > 3, done: () => false, info: true, timeout: 14 },
  storm:  { when: (n) => n.t > 3, done: () => false, info: true, timeout: 14 },
  beast:  { when: (n) => n.beasts.some((b) => !b.hidden), done: () => false, info: true, timeout: 16 },
  oil:    { when: (n) => n.t > 3, done: (n, ev) => ev.has('lowfire'), info: true, timeout: 18 },
};

export class Tutorial {
  constructor(root, night, nightId, enabled) {
    this.root = root; this.n = night;
    const def = STORY.nights[nightId];
    this.steps = enabled && def ? [...def.tutorial] : [];
    this.idx = 0; this.current = null; this.timer = 0; this.shownFor = 0;
    this.events = new Set();
    this.completed = [];
    this.root.innerHTML = '';
    this.doneAll = this.steps.length === 0;
  }

  onEvent(ev) { this.events.add(ev); }

  update(dt) {
    if (this.doneAll) return;
    const n = this.n;
    if (!this.current) {
      if (this.idx >= this.steps.length) { this.doneAll = true; return; }
      const step = this.steps[this.idx];
      const rule = RULES[step.id] || { when: () => true, done: () => false, info: true, timeout: 10 };
      if (rule.when(n)) { this.current = { step, rule }; this.show(step, rule); this.shownFor = 0; this.events.clear(); }
      return;
    }
    this.shownFor += dt;
    const { rule } = this.current;
    const done = rule.done(n, this.events) || (rule.timeout && this.shownFor > rule.timeout) || this.dismissed;
    if (done && this.shownFor > 1.2) this.complete();
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
    this.completed.push(this.current.step.id);
    this.current = null; this.idx++;
    this.timer = 0;
  }

  destroy() { this.root.innerHTML = ''; }
}
