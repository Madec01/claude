// Résolution d'un lancer : à partir d'un point d'arrêt visé (ou d'une boule à tirer), calcule la vitesse initiale
// par bissection sur la simulation elle-même (le terrain est pris en compte). Modèle d'erreur de la jauge.
import { BALANCE } from '../data/balance.js';
import { makeBall, launch, simulate, cloneBalls, ballDist } from './physics.js';
import { clamp } from '../core/math.js';

const F = BALANCE.field;
const T = BALANCE.throws;

/** Origine du lancer pour une direction de jeu (dir = +1 : de gauche à droite). */
export function throwOrigin(dirSign) {
  return { x: dirSign > 0 ? F.circleX : F.length - F.circleX, z: F.circleZ };
}

/**
 * Simule un lancer seul (sans les autres boules) et retourne la position d'arrêt.
 */
function restingPoint(field, origin, type, speed, dirAngle, ballOpts, spin = 0) {
  const b = makeBall(0, origin.x, origin.z, ballOpts);
  const t = T[type];
  launch(b, { x0: origin.x, z0: origin.z, y0: t.release, speed, angle: t.angle, dir: dirAngle, spin });
  simulate([b], field, 8);
  return b;
}

/**
 * Trouve la vitesse pour que la boule s'arrête à `target` (distance le long de la direction).
 * @returns {{speed:number, dir:number, angle:number, landing:{x,z}, rest:{x,z}}}
 */
export function solveThrow(field, origin, type, target, ballOpts = {}, spin = 0) {
  const t = T[type];
  const dx = target.x - origin.x, dz = target.z - origin.z;
  const dist = Math.hypot(dx, dz);
  const dirAngle = Math.atan2(dz, dx);
  if (type === 'shoot') {
    // tir : vitesse fixe élevée, on vise le point d'impact (atterrissage juste avant la cible)
    const speed = t.speed * clamp(dist / 8.5, 0.72, 1.18);
    return { speed, dir: dirAngle, angle: t.angle, dist, landing: landingFor(field, origin, type, speed, dirAngle, ballOpts), rest: null };
  }
  // bissection sur la vitesse : distance d'arrêt le long de la direction
  let lo = 0.5, hi = 14;
  const along = (b) => (b.x - origin.x) * Math.cos(dirAngle) + (b.z - origin.z) * Math.sin(dirAngle);
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const b = restingPoint(field, origin, type, mid, dirAngle, ballOpts, spin);
    const d = b.alive ? along(b) : 99;
    if (d < dist) lo = mid; else hi = mid;
  }
  const speed = (lo + hi) / 2;
  const rest = restingPoint(field, origin, type, speed, dirAngle, ballOpts, spin);
  return { speed, dir: dirAngle, angle: t.angle, dist, landing: landingFor(field, origin, type, speed, dirAngle, ballOpts), rest: { x: rest.x, z: rest.z } };
}

/** Point de premier contact avec le sol pour des paramètres donnés (balistique pure). */
export function landingFor(field, origin, type, speed, dirAngle, ballOpts = {}) {
  const t = T[type];
  const g = BALANCE.physics.g;
  const vy = Math.sin(t.angle) * speed, vh = Math.cos(t.angle) * speed;
  const tf = (vy + Math.sqrt(vy * vy + 2 * g * t.release)) / g;
  const d = vh * tf;
  return { x: origin.x + Math.cos(dirAngle) * d, z: origin.z + Math.sin(dirAngle) * d, time: tf, apex: t.release + (vy * vy) / (2 * g) };
}

/** Trajectoire échantillonnée (pour l'affichage) : liste de points {x,z,y}. */
export function previewPath(field, origin, type, speed, dirAngle, ballOpts = {}, spin = 0, maxT = 8) {
  const b = makeBall(0, origin.x, origin.z, ballOpts);
  const t = T[type];
  launch(b, { x0: origin.x, z0: origin.z, y0: t.release, speed, angle: t.angle, dir: dirAngle, spin });
  const pts = [];
  let acc = 0;
  simulate([b], field, maxT, (time) => { acc += BALANCE.physics.dt; if (acc >= 1 / 30) { acc = 0; pts.push({ x: b.x, z: b.z, y: b.y, alive: b.alive }); } });
  pts.push({ x: b.x, z: b.z, y: 0, alive: b.alive, end: true });
  return pts;
}

/**
 * Applique l'erreur de la jauge à des paramètres résolus.
 * @param {number} r résultat de la jauge (-1..1, 0 = parfait) ; ±zone = limites de la zone verte
 * @param {number} zone demi-largeur de la zone verte
 * @param {number} side aléa latéral normalisé (-1..1)
 */
export function applyError(params, type, r, zone, side) {
  const t = T[type];
  const inside = Math.abs(r) <= zone;
  const k = inside ? BALANCE.gauge.insideErr : 1;
  const distErr = r * t.distErr * k;               // fraction de vitesse
  const sideErr = side * t.sideErr * (inside ? 0.35 : 1) * (0.4 + Math.abs(r));
  return { ...params, speed: params.speed * (1 + distErr), dir: params.dir + sideErr, inside, r };
}

/** Demi-largeur de la zone verte pour un lancer, selon le type, la distance et les améliorations. */
export function zoneFor(type, dist, upgrades) {
  const g = BALANCE.gauge;
  const base = T[type].zone * g.zoneMul[upgrades.steady || 0];
  const shrink = 1 - g.distanceShrink * clamp((dist - 4) / 8, 0, 1);
  return clamp(base * shrink, 0.06, 0.6);
}

/** Simule un lancer complet avec les autres boules (copie) et retourne l'état final et les événements. */
export function simulateThrow(field, balls, ballDef, params, type) {
  const copy = cloneBalls(balls);
  const b = makeBall(ballDef.owner, params.x0, params.z0, ballDef);
  b.id = ballDef.id;
  const t = T[type];
  launch(b, { x0: params.x0, z0: params.z0, y0: t.release, speed: params.speed, angle: params.angle, dir: params.dir, spin: params.spin || 0 });
  copy.push(b);
  const res = simulate(copy, field, BALANCE.physics.maxSimTime);
  return { balls: copy, thrown: b, events: res.events, time: res.time };
}

export const jackDistance = (origin, jack) => ballDist(origin, jack);
