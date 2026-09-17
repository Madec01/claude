// Physique déterministe des boules : vol balistique, rebond, roulement, friction par zone, pentes, obstacles,
// collisions boule/boule et boule/cochonnet, sorties de terrain. Aucun aléa : la même fonction sert au jeu et à l'IA.
import { BALANCE } from '../data/balance.js';

const P = BALANCE.physics;
const F = BALANCE.field;

/** Crée une boule (owner : 0 joueur, 1 adversaire, -1 cochonnet). */
export function makeBall(owner, x, z, opts = {}) {
  const jack = owner === -1;
  return {
    id: opts.id ?? 0, owner, jack,
    x, z, y: 0, vx: 0, vz: 0, vy: 0,
    r: jack ? P.jackR : P.bouleR, m: jack ? P.jackM : P.bouleM,
    eMul: opts.eMul ?? 1, muMul: opts.muMul ?? 1,
    spin: 0, alive: true, moving: false, rolling: false,
    lastObstacle: -1, bounces: 0, hits: 0, dist: 0,
    sprite: opts.sprite || null, set: opts.set || 'fanny',
  };
}

export function cloneBall(b) { return { ...b }; }
export function cloneBalls(balls) { return balls.map(cloneBall); }

/** Terrain compilé : accès rapides aux propriétés locales. */
export class Field {
  constructor(terrain) {
    this.t = terrain;
    this.base = BALANCE.surfaces[terrain.surface];
    this.zones = (terrain.zones || []).map((z) => ({ ...z, s: BALANCE.surfaces[z.surface] }));
    this.slopes = terrain.slopes || [];
    this.obstacles = (terrain.obstacles || []).map((o, i) => ({ ...o, id: i }));
    this.length = F.length; this.width = F.width;
  }

  surfaceAt(x, z) {
    for (const zn of this.zones) { const d = Math.hypot(x - zn.x, z - zn.z); if (d < zn.r) return zn.s; }
    return this.base;
  }

  /** Gradient de pente (dx, dz) : la boule accélère vers +dx/+dz. Mélange doux au bord des zones. */
  slopeAt(x, z) {
    let gx = 0, gz = 0;
    for (const s of this.slopes) {
      const d = Math.hypot(x - s.x, z - s.z);
      if (d < s.r) { const w = 1 - (d / s.r) * (d / s.r); gx += s.dx * w; gz += s.dz * w; }
    }
    return { gx, gz };
  }

  inBounds(x, z, r = 0) { return x >= -r && x <= this.length + r && z >= -r && z <= this.width + r; }
}

/**
 * Avance la simulation d'un pas. Retourne la liste des événements produits pendant ce pas.
 * @param {object[]} balls
 * @param {Field} field
 * @param {number} dt
 */
export function step(balls, field, dt = P.dt) {
  const events = [];
  const g = P.g;
  for (const b of balls) {
    if (!b.alive) continue;
    const wasMoving = b.moving;
    if (b.y > 0 || b.vy > 0) {
      // vol
      b.vy -= g * dt;
      b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
      b.moving = true; b.rolling = false;
      if (b.y <= 0 && b.vy < 0) {
        b.y = 0;
        const s = field.surfaceAt(b.x, b.z);
        const e = s.e * b.eMul;
        const vyIn = -b.vy;
        b.vy = vyIn * e;
        const loss = s.loss;
        b.vx *= (1 - loss); b.vz *= (1 - loss);
        b.bounces++;
        events.push({ type: 'land', ball: b, speed: vyIn, surface: s, x: b.x, z: b.z, first: b.bounces === 1 });
        if (b.vy < P.minBounceVy) { b.vy = 0; b.rolling = true; }
      }
    } else {
      // roulement
      b.y = 0;
      const v = Math.hypot(b.vx, b.vz);
      if (v > 0) {
        const s = field.surfaceAt(b.x, b.z);
        const decel = s.mu * b.muMul * g * dt;
        const { gx, gz } = field.slopeAt(b.x, b.z);
        let nvx = b.vx, nvz = b.vz;
        // effet : accélération latérale perpendiculaire à la vitesse
        if (b.spin !== 0 && v > 0.3) {
          const px = -b.vz / v, pz = b.vx / v;
          const a = b.spin * P.spinCurve * Math.min(1, v) * dt;
          nvx += px * a; nvz += pz * a;
          b.spin *= Math.max(0, 1 - P.spinDecay * dt);
        }
        nvx += gx * g * dt; nvz += gz * g * dt;
        const nv = Math.hypot(nvx, nvz);
        const nv2 = Math.max(0, nv - decel);
        if (nv > 0) { nvx *= nv2 / nv; nvz *= nv2 / nv; }
        b.vx = nvx; b.vz = nvz;
        b.x += b.vx * dt; b.z += b.vz * dt;
        b.moving = nv2 > P.stopSpeed;
        b.rolling = b.moving;
        if (!b.moving) { b.vx = 0; b.vz = 0; b.spin = 0; if (wasMoving) events.push({ type: 'stop', ball: b }); }
        b.dist += nv2 * dt;
      } else { b.moving = false; b.rolling = false; }
    }

    // obstacles (au sol ou très bas)
    if (b.moving && b.y < 0.05) {
      for (const o of field.obstacles) {
        const d = Math.hypot(b.x - o.x, b.z - o.z);
        if (d < o.r + b.r) {
          if (b.lastObstacle !== o.id) {
            b.lastObstacle = o.id;
            const nx = (b.x - o.x) / (d || 1e-6), nz = (b.z - o.z) / (d || 1e-6);
            const v = Math.hypot(b.vx, b.vz);
            const k = o.type === 'root' ? 0.55 : o.type === 'pinecone' ? 0.75 : 0.65;
            // déviation : réflexion partielle sur la normale
            const dot = b.vx * nx + b.vz * nz;
            if (dot < 0) { b.vx -= 1.4 * dot * nx; b.vz -= 1.4 * dot * nz; }
            const nv = Math.hypot(b.vx, b.vz) || 1e-6;
            b.vx *= (v * k) / nv; b.vz *= (v * k) / nv;
            if (v > 1.2) { b.vy = Math.min(1.6, v * 0.25); b.y = 0.001; b.rolling = false; }
            events.push({ type: 'bump', ball: b, obstacle: o, speed: v });
          }
        } else if (b.lastObstacle === o.id && d > o.r + b.r + 0.05) b.lastObstacle = -1;
      }
    }

    // sortie du terrain
    if (!field.inBounds(b.x, b.z, -b.r * 0.5)) {
      b.alive = false; b.moving = false; b.rolling = false; b.vx = b.vz = b.vy = 0; b.y = 0;
      b.x = Math.max(-0.2, Math.min(field.length + 0.2, b.x)); b.z = Math.max(-0.2, Math.min(field.width + 0.2, b.z));
      events.push({ type: 'dead', ball: b });
    }
  }

  // collisions
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i]; if (!a.alive) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j]; if (!b.alive) continue;
      if (!a.moving && !b.moving) continue;
      const dx = b.x - a.x, dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      const min = a.r + b.r;
      if (d >= min || d === 0) continue;
      if (Math.abs(a.y - b.y) > min) continue;
      const nx = dx / d, nz = dz / d;
      const rvx = b.vx - a.vx, rvz = b.vz - a.vz;
      const vn = rvx * nx + rvz * nz;
      // séparation
      const overlap = min - d;
      const ia = 1 / a.m, ib = 1 / b.m, isum = ia + ib;
      a.x -= nx * overlap * (ia / isum); a.z -= nz * overlap * (ia / isum);
      b.x += nx * overlap * (ib / isum); b.z += nz * overlap * (ib / isum);
      if (vn >= 0) continue;
      const e = (a.jack || b.jack) ? P.jackE : P.steelE * Math.min(a.eMul, b.eMul);
      const jimp = -(1 + e) * vn / isum;
      a.vx -= jimp * nx * ia; a.vz -= jimp * nz * ia;
      b.vx += jimp * nx * ib; b.vz += jimp * nz * ib;
      a.moving = true; b.moving = true;
      // une boule frappée au sol part en roulant (léger sursaut si fort)
      const strength = Math.abs(vn);
      if (strength > 3) { const hit = a.moving && !b.moving ? b : b; hit.vy = Math.max(hit.vy, Math.min(0.8, strength * 0.06)); }
      a.hits++; b.hits++;
      events.push({ type: 'hit', a, b, speed: strength, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
    }
  }
  return events;
}

/** Simule jusqu'à l'arrêt complet (ou maxTime). Retourne { balls, events, time }. Modifie `balls` en place. */
export function simulate(balls, field, maxTime = P.maxSimTime, onStep = null) {
  const events = [];
  let t = 0;
  const dt = P.dt;
  while (t < maxTime) {
    const ev = step(balls, field, dt);
    if (ev.length) events.push(...ev);
    t += dt;
    if (onStep) onStep(t);
    if (!balls.some((b) => b.alive && b.moving)) break;
  }
  return { balls, events, time: t };
}

/** Prépare le lancer : place la boule au point de lâcher et lui donne sa vitesse initiale. */
export function launch(ball, params) {
  const { x0, z0, y0, speed, angle, dir, spin = 0 } = params;
  ball.x = x0; ball.z = z0; ball.y = y0;
  ball.vx = Math.cos(dir) * Math.cos(angle) * speed;
  ball.vz = Math.sin(dir) * Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  ball.spin = spin;
  ball.moving = true; ball.rolling = false; ball.alive = true; ball.bounces = 0; ball.lastObstacle = -1; ball.dist = 0; ball.hits = 0;
  return ball;
}

/** Distance entre deux boules (au sol). */
export const ballDist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Classement des boules vivantes par distance au cochonnet. */
export function ranking(balls, jack) {
  return balls.filter((b) => b.alive && !b.jack).map((b) => ({ ball: b, d: ballDist(b, jack) })).sort((p, q) => p.d - q.d);
}

/** Points de la mène : { owner, points, best: {0: d, 1: d} } (owner = -1 si aucune boule). */
export function countPoints(balls, jack) {
  const rk = ranking(balls, jack);
  if (!rk.length || !jack.alive) return { owner: -1, points: 0, best: { 0: Infinity, 1: Infinity }, ranking: rk };
  const owner = rk[0].ball.owner;
  const bestOther = rk.find((r) => r.ball.owner !== owner);
  const limit = bestOther ? bestOther.d : Infinity;
  const points = rk.filter((r) => r.ball.owner === owner && r.d < limit).length;
  const best = { 0: Infinity, 1: Infinity };
  for (const r of rk) if (r.d < best[r.ball.owner]) best[r.ball.owner] = r.d;
  return { owner, points, best, ranking: rk, margin: bestOther ? bestOther.d - rk[0].d : Infinity };
}
