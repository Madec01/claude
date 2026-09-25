// Tutoriel intégré : consignes d'une île, validées par des conditions de jeu.
import { reserveEte, seuilSerie } from '../data/tempo.js';
import { STORY } from '../data/story.js';
import { mechIsland } from '../data/campaign.js';

const MECH_STEP_IDS = new Set(['river', 'season', 'fauna', 'wish', 'breath', 'rare', 'surprise', 'hill', 'rare2', 'heath', 'build', 'hand', 'climate', 'fuse', 'build3', 'semis']);
const RULES = {
  surprise: { when: (i) => i.seasonsPassed.length >= 1, done: () => false, info: true, timeout: 40 },
  rare2:    { when: (i) => i.placements >= 2, done: () => false, info: true, timeout: 30 },
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
  hand:     { when: (i) => i.placements >= 1, done: (i, ev) => ev.has('hand'), info: true, timeout: 40 },
  semis:    { when: () => true, done: () => false, info: true, timeout: 25 },
  fuse:     { when: (i) => i.placements >= 3 && i.breaths >= 1, done: (i, ev) => ev.has('fuse'), info: true, timeout: 50 },
  build3:   { when: (i) => [...i.board.tiles.values()].some((t) => (t.level || 1) >= 2), done: (i, ev) => ev.has('build3'), info: true, timeout: 50 },
};

/** Tutoriel guidé de l'île 1 : chaque étape impose la case à jouer (la file est fixée par `opening`). */
const GUIDED = {
  // l'entraînement du Souffle court : six poses guidées sans chrono (les voisines du hameau, une région qui se ferme), puis le temps
  entrainement_tempo: [
    { id: 'e1', target: [1, 0], fige: false, text: 'Sans chrono pour l’instant. Pose le champ sur la case qui brille : contre le hameau, il rapporte +2, et les chiffres sur les bords le disent avant de poser.', done: (i) => i.placements >= 1 },
    { id: 'e2', target: [0, 1], fige: false, text: 'Un verger. Contre le hameau : +2 encore. Contre le champ : rien. Le bon voisin fait le point, pas la case.', done: (i) => i.placements >= 2 },
    { id: 'e3', target: [-1, 1], fige: false, text: 'Une prairie. Le verger l’aime (+2). Regarde le total avant de confirmer : c’est toujours lui qu’on cherche.', done: (i) => i.placements >= 3 },
    { id: 'e4', target: [-1, 0], fige: false, text: 'Une forêt contre la prairie : +1. Contre le hameau, rien. Il reste deux cases vides autour du hameau.', done: (i) => i.placements >= 4 },
    { id: 'e5', target: [0, -1], fige: false, text: 'De l’eau contre le hameau : +1. Encore une case, et le hameau sera entouré de toutes parts.', done: (i) => i.placements >= 5 },
    { id: 'e6', target: [1, -1], fige: false, text: 'Un champ : +2 contre le hameau, +1 contre l’autre champ. Et le hameau n’a plus de case vide autour : sa région se ferme, prime égale à sa taille, double pour un hameau.', done: (i) => i.placements >= 6 },
    { id: 'e7', info: true, when: () => true, done: () => false, focus: '.tempo-chrono', text: 'Maintenant, le temps : huit secondes par tuile, lues au-dessus de l’île. Pose avant zéro ; une tuile perdue laisse une case vide, qui coûte des points à la fin. Douze tuiles : à toi. Tant qu’une carte est là, le temps s’arrête.' },
    { id: 'e8', info: true, when: (i) => (i.stats.lost || 0) >= 1, done: () => false, timeout: 10, focus: '.tempo-chrono', text: 'Une tuile perdue : sa case restera vide, −2 à la fin. Rien de grave, la suivante arrive — pose-la contre un bon voisin.' },
  ],
  1: [
    { id: 'g1', target: [1, 0], text: 'Bienvenue. Pose la prairie sur la case qui brille : une tuile doit toujours toucher une tuile déjà posée.', done: (i) => i.placements >= 1 },
    { id: 'g2', target: [2, 0], text: 'Une forêt. Survole la case qui brille avant de cliquer : chaque bord affiche ses points. Forêt contre roche : +2, forêt contre prairie : +1.', done: (i) => i.placements >= 2 },
    { id: 'g3', target: [-1, 0], text: 'Le champ aime le hameau (+2). Pose-le contre le village.', done: (i) => i.placements >= 3 },
    { id: 'g4', target: [-1, 1], text: 'Un deuxième hameau. Deux hameaux côte à côte valent +2, et le champ voisin encore +2 : c’est le meilleur coup.', done: (i) => i.placements >= 4 },
    { id: 'g5', target: [1, -1], text: 'L’eau posée contre la roche devient une rivière (+2). Les mauvaises paires (champ-roche, hameau-marais) feraient −1 : évite-les.', done: (i) => i.placements >= 5 },
    { id: 'g6', target: [0, 1], text: 'Un champ ici. Regarde la ligne de saison en haut : à la sixième pose, la saison change.', done: (i) => i.placements >= 6 },
    { id: 'g7', text: 'L’été ! Chaque saison apporte une règle, lisible en haut de l’écran : en été, une prairie sans eau, forêt ni marais voisin sèche. La nôtre touche l’eau et la forêt : elle tient.', info: true, when: (i) => i.seasonsPassed.length >= 1, timeout: 40 },
    { id: 'g8', target: [1, 1], text: 'Le verger aime la prairie (+2). Pose-le ici : la prairie n’aura plus aucune case vide autour. Une région entourée se ferme et rapporte sa taille en points.', done: (i) => i.placements >= 7 },
    { id: 'g9', text: 'Région close ! Plus la région est grande, plus la prime est belle (les hameaux comptent double). Des animaux viendront aussi d’eux-mêmes, là où leur habitat existe : chacun rapporte des points à chaque saison. À toi de jouer : remplis l’île. Une étoile suffit pour débloquer la suivante, et le Guide (pause) rappelle toutes les paires.', info: true, timeout: 30 },
  ],
};

/**
 * Les tutoriels des deux modes à part, pas à pas, la première fois ou à la demande. Des cartes d'information (« Compris »)
 * qui arrivent quand le jeu montre la chose ; au Souffle court, le temps s'arrête tant qu'une carte est là (voir main.js).
 */
const MODE_STEPS = {
  // `focus` : l'élément de l'écran que la carte met en avant (un sélecteur dans le HUD) — le tutoriel montre ce dont il parle
  // Au Souffle court, une carte fige le temps ET la pose (on lit, puis on joue) ; `fige: false` pour la carte qui demande une pose
  tempo: [
    { id: 'tp1', info: true, when: () => true, done: () => false, focus: '.hud-queue', text: 'Ta tuile, en bas. Pas de file : tu ne vois jamais la suivante, elle arrive quand celle-ci est posée. Au printemps, deux tuiles : pose celle que tu veux. Tant qu’une carte comme celle-ci est là, le temps s’arrête et la pose attend.' },
    { id: 'tp2', info: true, fige: false, when: () => true, done: (i) => i.placements >= 1, focus: '.tempo-chrono', text: 'Le temps, juste au-dessus de l’île : le chiffre, et la marée qui se retire par les deux bouts. Sur la dernière seconde, tout rougit. Pose la tuile contre l’île avant zéro.' },
    { id: 'tp3', info: true, when: (i) => i.placements >= 1, done: (i) => i.placements >= 3, focus: '.hud-queue', text: (i) => `Posée vite, dans le premier tiers du temps (${seuilSerie(i.def)} s), la série monte, et s’affiche sur la tuile : deux fois plus vite si la place est bonne. Elle multiplie les points : ×1,5 à 3, ×2 à 6, ×3 à 10. Hésiter la casse — la tuile te le dit après chaque pose.` },
    { id: 'tp4', info: true, when: (i) => i.placements >= 3, done: (i) => i.placements >= 5, focus: '.hud-score', text: 'Les points, en haut : bords, régions, faune, comme sur toute île. À zéro, la tuile est perdue et sa case restera vide, elle coûte des points à la fin, plus encore si elle bloquait une région.' },
    { id: 'tp5', info: true, when: (i) => i.placements >= 5 || i.seasonsPassed.length >= 1, done: () => false, timeout: 30, focus: '.hud-season', text: 'La saison, en haut : cinq poses, la ligne se remplit, puis elle change. Ses primes comptent double, +10 sans tuile perdue. Chaque saison change aussi le temps ou le plateau : tu le liras sous son nom, à son arrivée.' },
    // une carte par saison, à sa première arrivée — jamais deux saisons dans la même carte
    { id: 'tps_summer', info: true, when: (i) => i.season === 'summer', done: () => false, timeout: 25, focus: '.hud-season, .tempo-chrono', text: (i) => `Été : une réserve de ${reserveEte(i.def)} secondes pour les cinq tuiles, pas de cadran par tuile — ce que tu gagnes sur le facile sert au difficile. Réserve vide : ce qui reste à poser est perdu d’un coup.` },
    { id: 'tps_autumn', info: true, when: (i) => i.season === 'autumn', done: () => false, timeout: 25, focus: '.hud-season', text: 'Automne : la brume couvre une bonne part des tuiles posées. Poser une tuile la dissipe sur ses six voisines : on redécouvre l’île en jouant.' },
    { id: 'tps_winter', info: true, when: (i) => i.season === 'winter', done: () => false, timeout: 25, focus: '.hud-season, .tempo-chrono', text: 'Hiver : le cadran est gelé, ×1,4 — un peu plus de temps pour chaque tuile. Une saison sans tuile perdue rapporte +10.' },
    { id: 'tps_spring', info: true, when: (i) => i.season === 'spring' && i.seasonsPassed.length >= 1, done: () => false, timeout: 25, focus: '.hud-queue', text: 'Printemps : deux tuiles proposées, tu poses celle que tu veux ; l’autre est perdue sans coûter de case. Choisir, c’est déjà jouer.' },
  ],
  brume: [
    { id: 'br1', info: true, when: () => true, done: (i) => i.placements >= 1, focus: '.hud-brume', text: 'Des cases sont sous la brume : chacune cache une tuile déjà là. L’inventaire, en bas, dit lesquelles, jamais où. On pose contre une tuile ou contre la brume. Pose ta première tuile contre la brume.' },
    { id: 'br2', info: true, when: (i) => [...i.board.tiles.values()].some((t) => typeof t.indice === 'number'), done: (i) => i.placements >= 3, text: 'Le chiffre sur la tuile est son indice : combien de ses voisines cachées sont de sa famille. Choisir quelle tuile poser contre la brume, c’est choisir ta question.' },
    { id: 'br3', info: true, when: (i) => i.placements >= 2, done: (i) => i.brume && (i.brume.jalons.size >= 1 || i.brume.crayon.size >= 1), timeout: 60, focus: '.brume-jalon', text: 'Touche une case de brume pour ouvrir sa fiche. Le jalon de la saison annonce une famille : juste au dévoilement, +5 et ses bords valent triple ; faux, −5. Le crayon note sans rien coûter.' },
    { id: 'br4', info: true, when: (i) => i.placements >= 4, done: () => false, timeout: 35, focus: '.brume-move', text: 'Déplacer : une tuile déjà posée peut changer de place, au prix de la prochaine tuile. Reposée contre la brume, elle lit un nouvel indice. Une tuile qui touche la brume ne bouge plus.' },
    { id: 'br5', info: true, when: (i) => i.seasonsPassed.length >= 1, done: () => false, timeout: 40, focus: '.hud-season, .hud-carte', text: 'Passage de saison : les cases cachées assez entourées se dévoilent et comptent comme posées à l’instant, bords doublés. Un trésor se cache parmi elles. À la fin, chaque case restée cachée coûte des points.' },
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
    const modeSteps = def && typeof def === 'object' ? (def.tempo ? MODE_STEPS.tempo : def.brume ? MODE_STEPS.brume : null) : null;
    if (modeSteps && enabled) steps = modeSteps.map((st) => ({ ...st }));
    else if (!this.guided && enabled) {
      const num = def && typeof def === 'object' ? def.id : null;
      const hand = sdef && sdef.tutorial ? sdef.tutorial.filter((st) => !mech || !MECH_STEP_IDS.has(st.id) || (mech.has(st.id) && (num === null || mechIsland(st.id) === null || mechIsland(st.id) === num))) : [];   // une mécanique déjà présentée sur une île précédente ne se répète pas
      const introduced = def && typeof def === 'object' && def.introduces ? def.introduces.filter((m) => STORY.mechCards[m] && !hand.some((st) => st.id === m)) : [];
      steps = [...introduced.map((m) => ({ id: m, text: STORY.mechCards[m] })), ...hand];
    }
    this.enabled = !!enabled;
    this.steps = this.guided ? this.guided : steps;
    this.idx = 0; this.current = null; this.shownFor = 0; this.events = new Set(); this.dismissed = false;
    this.root.innerHTML = '';
    this.doneAll = this.steps.length === 0;
  }
  onEvent(ev) { this.events.add(ev); }
  /** Ajoute une carte d'information à la volée (sentier apparu, rivière qui se jette dans un lac…), si le tutoriel est actif. */
  pushCard(id, text, timeout = 30) { if (!this.enabled || this.steps.some((s) => s.id === id)) return false; this.steps.push({ id, text, info: true, timeout }); this.doneAll = false; return true; }
  update(dt) {
    if (this.doneAll) return;
    if (!this.current) {
      if (this.idx >= this.steps.length) { this.doneAll = true; return; }
      // hors parcours guidé, la première carte dont la condition est remplie passe devant : une carte qui attend (bâtir sans souffle…) ne bloque pas les autres
      const ruleOf = (step) => step.done || step.when || step.info ? { when: step.when || (() => true), done: step.done || (() => false), info: !!step.info, timeout: step.timeout || 0 } : (RULES[step.id] || (step.id.startsWith('climate_') ? RULES.climate : null) || { when: () => true, done: () => false, info: true, timeout: 12 });
      const last = this.guided ? this.idx : this.steps.length - 1;
      for (let j = this.idx; j <= last; j++) {
        const step = this.steps[j]; const rule = ruleOf(step);
        if (!rule.when(this.isl)) continue;
        if (j !== this.idx) { this.steps.splice(j, 1); this.steps.splice(this.idx, 0, step); }
        this.current = { step, rule }; this.show(step, rule); this.shownFor = 0; this.events.clear(); this.isl.restrict = step.target ? new Set([`${step.target[0]},${step.target[1]}`]) : null;
        break;
      }
      return;
    }
    this.shownFor += dt;
    const { rule } = this.current;
    const done = rule.done(this.isl, this.events) || (rule.timeout && this.shownFor > rule.timeout) || this.dismissed;
    if (done && (this.shownFor > 1 || this.current.step.target)) this.complete();
  }
  show(step, rule) {
    this.dismissed = false;
    const texte = typeof step.text === 'function' ? step.text(this.isl) : step.text;
    this.root.innerHTML = `<div class="tuto-card"><div class="tuto-text">${texte}</div>${rule.info ? '<button class="tuto-ok">Compris</button>' : '<div class="tuto-hint">…</div>'}</div>`;
    const b = this.root.querySelector('.tuto-ok');
    if (b) b.addEventListener('click', (e) => { e.stopPropagation(); this.dismissed = true; });
    requestAnimationFrame(() => this.root.querySelector('.tuto-card')?.classList.add('on'));
    this.defocus(); if (step.focus) { this.focused = [...document.querySelectorAll(step.focus)]; for (const el of this.focused) el.classList.add('tuto-focus'); }
  }
  /** Retire la mise en avant de l'élément montré par la carte. */
  defocus() { for (const el of this.focused || []) el.classList.remove('tuto-focus'); this.focused = []; }
  complete() {
    const card = this.root.querySelector('.tuto-card');
    if (card) { card.classList.add('done'); setTimeout(() => { if (card.parentNode) card.remove(); }, 500); }
    this.current = null; this.idx++; this.isl.restrict = null; this.defocus();
    if (this.idx >= this.steps.length) this.doneAll = true;
  }
  destroy() { this.root.innerHTML = ''; this.isl.restrict = null; this.defocus(); }
}
