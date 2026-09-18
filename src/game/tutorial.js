// Tutoriel intégré : consignes d'une île, validées par des conditions de jeu.
import { STORY } from '../data/story.js';

const MECH_STEP_IDS = new Set(['river', 'season', 'fauna', 'wish', 'breath', 'rare', 'event', 'weather', 'hill', 'rare2', 'heath', 'build', 'rare3', 'climate', 'fuse', 'work', 'build3']);
const RULES = {
  event:    { when: (i) => i.placements >= 2, done: () => false, info: true, timeout: 30 },
  weather:  { when: (i) => i.placements >= 2, done: (i, ev) => ev.has('weather'), info: true, timeout: 40 },
  rare2:    { when: (i) => i.placements >= 2, done: () => false, info: true, timeout: 30 },
  rare3:    { when: (i) => i.placements >= 2, done: () => false, info: true, timeout: 30 },
  climate:  { when: () => true, done: () => false, info: true, timeout: 35 },
  place:    { when: () => true, done: (i) => i.placements >= 1, info: false },
  affinity: { when: (i) => i.placements >= 1, done: (i) => i.score >= 4, info: false, timeout: 60 },
  close:    { when: (i) => i.placements >= 3, done: (i) => i.stats.closed >= 1, info: false, timeout: 45 },
  river:    { when: (i) => i.placements >= 1, done: (i, ev) => ev.has('river'), info: false, timeout: 60 },
  season:   { when: (i) => i.placements >= 2, done: (i, ev) => ev.has('season'), info: true, timeout: 40 },
  fauna:    { when: (i) => i.placements >= 2, done: (i, ev) => ev.has('fauna'), info: true, timeout: 45 },
  wish:     { when: () => true, done: () => false, info: true, timeout: 25 },
  breath:   { when: (i) => i.breaths >= 1 || i.placements >= 6, done: (i, ev) => ev.has('breath'), info: true, timeout: 40 },
  rare:     { when: (i) => i.placements >= 2, done: (i, ev) => ev.has('rare'), info: true, timeout: 30 },
  hill:     { when: (i) => i.placements >= 1, done: (i, ev) => ev.has('hill'), info: true, timeout: 35 },
  heath:    { when: (i) => i.placements >= 1, done: (i, ev) => ev.has('heath'), info: true, timeout: 35 },
  build:    { when: (i) => i.placements >= 3 && i.breaths >= 1, done: (i, ev) => ev.has('build'), info: true, timeout: 45 },
  fuse:     { when: (i) => i.placements >= 3 && i.breaths >= 1, done: (i, ev) => ev.has('fuse'), info: true, timeout: 50 },
  work:     { when: (i) => i.queue.list.some((t) => t.work), done: (i, ev) => ev.has('work'), info: true, timeout: 50 },
  build3:   { when: (i) => [...i.board.tiles.values()].some((t) => (t.level || 1) >= 2), done: (i, ev) => ev.has('build3'), info: true, timeout: 50 },
};

/** Tutoriel guidé de l'île 1 : chaque étape impose la case à jouer (la file est fixée par `opening`). */
const GUIDED = {
  1: [
    { id: 'g1', target: [1, 0], text: 'Bienvenue. Pose la prairie sur la case qui brille : une tuile doit toujours toucher une tuile déjà posée.', done: (i) => i.placements >= 1 },
    { id: 'g2', target: [2, 0], text: 'Une forêt. Survole la case qui brille avant de cliquer : chaque bord affiche ses points. Forêt contre roche : +2, forêt contre prairie : +1.', done: (i) => i.placements >= 2 },
    { id: 'g3', target: [-1, 0], text: 'Le champ aime le hameau (+2). Pose-le contre le village.', done: (i) => i.placements >= 3 },
    { id: 'g4', target: [-1, 1], text: 'Un deuxième hameau. Deux hameaux côte à côte valent +2, et le champ voisin encore +2 : c’est le meilleur coup.', done: (i) => i.placements >= 4 },
    { id: 'g5', target: [1, -1], text: 'L’eau posée contre la roche devient une rivière (+2). Les mauvaises paires (champ-roche, hameau-marais) feraient −1 : évite-les.', done: (i) => i.placements >= 5 },
    { id: 'g6', target: [0, 1], text: 'Un champ ici. Regarde la ligne de saison en haut : à la sixième pose, la saison change.', done: (i) => i.placements >= 6 },
    { id: 'g7', text: 'L’été ! Chaque saison apporte une règle, lisible en haut de l’écran : en été, une prairie sans eau, forêt ni marais voisin sèche. La nôtre touche l’eau et la forêt : elle tient.', info: true, when: (i) => i.seasonsPassed.length >= 1, timeout: 40 },
    { id: 'g8', target: [1, 1], text: 'Le verger aime la prairie (+2). Pose-le ici : la prairie n’aura plus aucune case vide autour. Une région entourée se ferme et rapporte sa taille en points.', done: (i) => i.placements >= 7 },
    { id: 'g9', text: 'Région close ! Plus la région est grande, plus la prime est belle (les hameaux comptent double). À toi de jouer : remplis l’île. Une étoile suffit pour débloquer la suivante, et le Guide (pause) rappelle toutes les paires.', info: true, timeout: 30 },
  ],
};

export class Tutorial {
  constructor(root, island, def, enabled) {
    this.root = root; this.isl = island;
    // `def` : définition de campagne (story = île dessinée, mech = mécaniques ouvertes, id = numéro) ou un ancien identifiant
    const storyId = def && typeof def === 'object' ? def.story : def;
    const sdef = storyId ? STORY.islands[storyId] : null;
    const mech = def && typeof def === 'object' && def.mech ? def.mech : null;
    this.guided = enabled && storyId && GUIDED[storyId] ? GUIDED[storyId] : null;
    let steps = [];
    if (!this.guided && enabled) {
      const hand = sdef && sdef.tutorial ? sdef.tutorial.filter((st) => !mech || !MECH_STEP_IDS.has(st.id) || mech.has(st.id)) : [];
      const introduced = def && typeof def === 'object' && def.introduces ? def.introduces.filter((m) => STORY.mechCards[m] && !hand.some((st) => st.id === m)) : [];
      steps = [...introduced.map((m) => ({ id: m, text: STORY.mechCards[m] })), ...hand];
    }
    this.steps = this.guided ? this.guided : steps;
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
      const rule = step.done || step.when || step.info ? { when: step.when || (() => true), done: step.done || (() => false), info: !!step.info, timeout: step.timeout || 0 } : (RULES[step.id] || (step.id.startsWith('climate_') ? RULES.climate : null) || { when: () => true, done: () => false, info: true, timeout: 12 });
      if (rule.when(this.isl)) { this.current = { step, rule }; this.show(step, rule); this.shownFor = 0; this.events.clear(); this.isl.restrict = step.target ? new Set([`${step.target[0]},${step.target[1]}`]) : null; }
      return;
    }
    this.shownFor += dt;
    const { rule } = this.current;
    const done = rule.done(this.isl, this.events) || (rule.timeout && this.shownFor > rule.timeout) || this.dismissed;
    if (done && (this.shownFor > 1 || this.current.step.target)) this.complete();
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
    this.current = null; this.idx++; this.isl.restrict = null;
    if (this.idx >= this.steps.length) this.doneAll = true;
  }
  destroy() { this.root.innerHTML = ''; this.isl.restrict = null; }
}
