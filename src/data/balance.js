// Constantes d'équilibrage. Toutes les valeurs « de sensation » du jeu sont ici.
import { DEG } from '../core/math.js';

export const BALANCE = {
  world: { w: 1280, h: 720, margin: 60 },

  beam: {
    halfAngle: [14 * DEG, 17 * DEG, 20 * DEG, 23 * DEG],   // par niveau de « Lentille large »
    rotRate: [2.4, 3.0, 3.6, 4.2],                          // rad/s par niveau de « Mécanisme huilé »
    range: 560,
    rangeRain: 0.68,            // multiplicateur de portée sous la pluie
    rangeLow: 0.55,             // feu réduit
    smoothing: 14,              // réactivité de l'inertie (plus grand = plus vif)
    revealHold: 0.12,           // secondes de lumière pour relever un écueil
    guidedGrace: 1.4,           // secondes pendant lesquelles un navire reste « guidé » après avoir quitté la lumière
    clearRadius: 96,            // rayon toujours dégagé autour du phare
  },

  oil: {
    capacity: [100, 125, 150, 175],   // par niveau de « Réserve d'huile »
    burnFull: 1.55,   // unités / s
    burnLow: 0.7,
    barrel: 28,        // livré par navire à quai
    relight: 5,        // secondes d'extinction quand la réserve est à sec
    start: 0.75,       // fraction de départ
  },

  horn: {
    radius: [250, 300, 350, 400],       // « Corne longue »
    cooldown: [8, 7, 6, 5],             // « Corne rapide »
    freeze: 3.0,
    beastPush: 260,
  },

  ships: {
    dinghy: { name: 'Sardinier', sprite: 'dinghy', length: 40, speed: 72, turn: 3.2, radius: 12, draft: 0, hull: 2 },
    cutter: { name: 'Cotre', sprite: 'ship', length: 66, speed: 46, turn: 2.0, radius: 20, draft: 1, hull: 3 },
    tall:   { name: 'Trois-mâts', sprite: 'ship', length: 98, speed: 33, turn: 1.25, radius: 29, draft: 2, hull: 3 },
    yann:   { name: 'La Sirène', sprite: 'ship', length: 104, speed: 30, turn: 1.15, radius: 30, draft: 2, hull: 4 },
    driftSpeed: 0.34,        // fraction de la vitesse quand le navire dérive sans route
    unguidedSpeed: 0.72,     // fraction de la vitesse quand il suit sa route hors lumière
    unguidedWobble: 0.9,     // amplitude (rad/s) de l'errance hors lumière
    lostSpeed: 0.0,
    waypointReach: 10,
    collisionDamageSpeed: 0.5,
    dockRadius: 64,
    sinkTime: 2.6,
  },

  tide: {
    period: 1.0,        // nombre de cycles marée par nuit (1 = une montée + une descente)
    emergeLevel: 0.35,  // en dessous : écueils « émergés » visibles
    submergeLevel: 0.65,// au-dessus : écueils submersibles invisibles (mortels selon tirant d'eau)
  },

  storm: {
    gustEvery: [6, 12],   // secondes entre rafales
    gustDuration: [1.6, 3.2],
    gustForce: 38,        // px/s ajoutés à la vitesse des navires
    windDrift: 12,        // dérive constante
  },

  beast: {
    speed: 34,
    speedLit: 12,
    radius: 58,
    huntRange: 420,
    catchRadius: 44,
    retreat: 2.4,          // secondes de recul après la corne
    dissipatePerSec: 0.35, // sous la lumière
    regenPerSec: 0.12,
    lostFogTime: 1.0,
  },

  pages: { readTime: 1.5, shards: 3, drift: 9 },

  score: { docked: 100, dinghyBonus: 20, tallBonus: 60, noWreck: 250, page: 40, timeBonusPerSec: 2 },
  shards: { page: 3, star: 2, perfect: 3 },

  results: { star2Extra: 2 },

  infinite: { rampEvery: 60, maxSpawnRate: 3.2 },
};
