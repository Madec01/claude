// Constantes d'équilibrage de « Tu tires ou tu pointes ? ». Unités physiques en mètres / secondes.
import { DEG } from '../core/math.js';

export const BALANCE = {
  world: { w: 1280, h: 720 },
  field: {
    length: 15,        // m
    width: 4,          // m
    pxPerM: 80,        // 1 m = 80 px
    originX: 40,       // px : bord gauche du terrain
    originY: 270,      // px : bord haut du terrain
    circleX: 1.2,      // m : centre du rond de lancer (depuis le bord de départ)
    circleZ: 2.0,
    circleR: 0.25,
    jackMin: 6, jackMax: 10,   // distance du cochonnet depuis le rond
  },
  physics: {
    dt: 1 / 120,
    g: 9.81,
    bouleR: 0.0375, bouleM: 0.7,
    jackR: 0.015, jackM: 0.012,
    steelE: 0.82,          // restitution boule/boule
    jackE: 0.55,           // restitution boule/cochonnet
    stopSpeed: 0.05,
    maxSimTime: 9,
    minBounceVy: 0.45,     // sous ce rebond vertical, la boule roule
    spinCurve: 0.9,        // accélération latérale par unité d'effet à 1 m/s
    spinDecay: 1.4,
  },
  // Sols : friction de roulement μ, restitution verticale, perte horizontale à l'impact
  surfaces: {
    gravel: { mu: 0.30, e: 0.28, loss: 0.30, name: 'gravier' },
    packed: { mu: 0.24, e: 0.32, loss: 0.26, name: 'terre battue' },
    sand:   { mu: 0.60, e: 0.10, loss: 0.55, name: 'sable' },
    tarmac: { mu: 0.17, e: 0.48, loss: 0.16, name: 'goudron' },
    grass:  { mu: 0.42, e: 0.18, loss: 0.40, name: 'herbe' },
    dirt:   { mu: 0.27, e: 0.25, loss: 0.30, name: 'terre' },
  },
  // Jeux de boules (facteurs appliqués à la restitution et à la friction)
  bouleSets: {
    fanny:  { name: 'Les boules de Fanny', eMul: 1.0, muMul: 1.0, hitMul: 1.0, sprite: 'boule_silver_a' },
    tender: { name: 'Les tendres', eMul: 0.8, muMul: 1.12, hitMul: 0.9, sprite: 'boule_silver_b' },
    hard:   { name: 'Les dures', eMul: 1.18, muMul: 0.92, hitMul: 1.15, sprite: 'boule_silver_c' },
  },
  // Types de lancer : angle d'élévation, fraction de vitesse conservée, hauteur de lâcher, zone verte de base
  throws: {
    point:   { name: 'Pointer',      key: '1', angle: 9 * DEG,  release: 0.35, zone: 0.34, distErr: 0.12, sideErr: 1.6 * DEG, desc: 'Lancer bas qui roule longtemps. Sensible au sol.' },
    halflob: { name: 'Demi-portée',  key: '2', angle: 32 * DEG, release: 0.9,  zone: 0.30, distErr: 0.13, sideErr: 1.8 * DEG, desc: 'Tombe à mi-chemin puis roule. Passe les bosses proches.' },
    shoot:   { name: 'Tirer',        key: '3', angle: 11 * DEG, release: 1.0,  zone: 0.18, distErr: 0.10, sideErr: 1.3 * DEG, speed: 9.5, desc: 'Lancer tendu sur une boule adverse pour la chasser.' },
    lob:     { name: 'Plombée',      key: '4', angle: 62 * DEG, release: 1.1,  zone: 0.26, distErr: 0.15, sideErr: 2.2 * DEG, desc: 'Très haut, tombe presque à la verticale, ne roule pas.' },
  },
  gauge: {
    speed: [2.6, 2.2, 1.85, 1.55],      // rad/s de l'aiguille par niveau de Sang-froid
    zoneMul: [1, 1.2, 1.4, 1.65],       // largeur de zone par niveau de Régularité
    distanceShrink: 0.55,               // à 10 m la zone est réduite de ce facteur (linéaire)
    insideErr: 0.22,                    // fraction de l'erreur quand on relâche dans la zone
  },
  ai: { thinkTime: [0.9, 1.6], candidates: 22, samples: 3 },
  match: { measureThreshold: 0.03, jackOutRetries: 3, pauseAfterThrow: 0.9, pauseAfterCount: 2.2 },
  score: { point: 1, carreau: 3, win: 5, star: 2, matchLoseConsolation: 2 },
  camera: { zoomMax: 1.9, lerp: 3.2 },
};
