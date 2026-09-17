// Utilitaires mathématiques : angles, vecteurs, easing, RNG seedé, tests géométriques.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const dist2 = (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay);

/** Normalise un angle dans ]-PI, PI]. */
export function normAngle(a) {
  a = a % TAU;
  if (a > Math.PI) a -= TAU;
  if (a <= -Math.PI) a += TAU;
  return a;
}

/** Différence d'angle signée la plus courte pour aller de a vers b. */
export const angleDiff = (a, b) => normAngle(b - a);

/** Tourne l'angle `a` vers `b` d'au plus `maxStep` radians. */
export function turnToward(a, b, maxStep) {
  const d = angleDiff(a, b);
  if (Math.abs(d) <= maxStep) return b;
  return a + Math.sign(d) * maxStep;
}

// ---- Easing ----
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
export const easeOutElastic = (t) => (t === 0 || t === 1) ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1;

// ---- RNG seedé (mulberry32) ----
export class RNG {
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
}

/** RNG global non seedé pour les effets purement cosmétiques. */
export const rnd = (a = 0, b = 1) => a + (b - a) * Math.random();
export const rndPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---- Géométrie ----

/** Distance point → segment [a,b]. */
export function pointSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Le segment [a,b] traverse-t-il le cercle (c, r) ? */
export function segCircle(ax, ay, bx, by, cx, cy, r) {
  return pointSegDist(cx, cy, ax, ay, bx, by) <= r;
}

/** Le point est-il dans le cône (origine o, direction angle, demi-angle, portée) ? */
export function inCone(px, py, ox, oy, angle, halfAngle, range) {
  const dx = px - ox, dy = py - oy;
  const d2 = dx * dx + dy * dy;
  if (d2 > range * range) return false;
  const a = Math.atan2(dy, dx);
  return Math.abs(angleDiff(angle, a)) <= halfAngle;
}

/** Facteur d'éclairement 0..1 d'un point dans le cône (1 au centre, 0 au bord / hors portée). */
export function coneLight(px, py, ox, oy, angle, halfAngle, range) {
  const dx = px - ox, dy = py - oy;
  const d = Math.hypot(dx, dy);
  if (d > range) return 0;
  const a = Math.atan2(dy, dx);
  const off = Math.abs(angleDiff(angle, a)) / halfAngle;
  if (off >= 1) return 0;
  const radial = 1 - Math.pow(d / range, 2);
  const angular = 1 - off * off;
  return clamp(radial * angular * 1.4, 0, 1);
}

export const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
