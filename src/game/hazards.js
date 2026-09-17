// Écueils, épaves, terres : collisions, révélation par la lumière, marée.
import { BALANCE } from '../data/balance.js';
import { RNG, dist, segCircle } from '../core/math.js';

export class Hazards {
  constructor(map, night, extraRocks = []) {
    const rng = new RNG(1234 + (night.id === 'infinite' ? 77 : night.id));
    this.land = map.land.map((c) => ({ ...c }));
    this.rocks = [...map.rocks, ...extraRocks].map((r, i) => ({
      x: r.x, y: r.y, r: r.r, tide: r.tide || 'always',
      revealed: false, revealTimer: 0, emerged: false, submerged: false,
      sprite: 1 + (i % 6), rot: rng.range(0, Math.PI * 2), flash: 0, id: 'rock' + i,
    }));
    this.wrecks = (map.wrecks || []).map((w, i) => ({ x: w.x, y: w.y, r: w.r, revealed: false, revealTimer: 0, sprite: 1 + (i % 2), rot: rng.range(0, Math.PI * 2), flash: 0, id: 'wreck' + i, fresh: false }));
    this.port = map.port;
  }

  /** Ajoute une épave dynamique (navire coulé). */
  addWreck(x, y, r) {
    this.wrecks.push({ x, y, r: Math.max(16, r), revealed: true, revealTimer: 1, sprite: 1 + (this.wrecks.length % 2), rot: Math.random() * Math.PI * 2, flash: 1, id: 'wreckd' + this.wrecks.length, fresh: true });
  }

  update(dt, night) {
    const tide = night.weather.tide; // 0..1
    const T = BALANCE.tide;
    for (const r of this.rocks) {
      if (r.tide === 'emerge') { r.emerged = tide < T.emergeLevel; r.submerged = false; if (r.emerged) r.revealed = true; }
      else if (r.tide === 'submerge') { r.submerged = tide > T.submergeLevel; r.emerged = tide < T.emergeLevel; if (r.emerged) r.revealed = true; }
      if (r.flash > 0) r.flash -= dt * 1.5;
      if (!r.revealed) {
        const l = night.beam.lightAt(r.x, r.y);
        if (l > 0.12) { r.revealTimer += dt; if (r.revealTimer >= BALANCE.beam.revealHold) { r.revealed = true; r.flash = 1; night.onHazardRevealed(r); } }
        else r.revealTimer = Math.max(0, r.revealTimer - dt);
      }
    }
    for (const w of this.wrecks) {
      if (w.flash > 0) w.flash -= dt * 1.2;
      if (!w.revealed) {
        const l = night.beam.lightAt(w.x, w.y);
        if (l > 0.12) { w.revealTimer += dt; if (w.revealTimer >= BALANCE.beam.revealHold) { w.revealed = true; w.flash = 1; night.onHazardRevealed(w); } }
      }
    }
  }

  /** Un écueil est-il dangereux pour un navire de tirant d'eau `draft` ? */
  rockDangerous(r, draft) {
    if (r.submerged) return draft >= 1; // chaloupes passent, cotres et trois-mâts non
    return true;
  }

  /** Premier obstacle en collision avec un cercle (x,y,rad) pour un tirant d'eau donné. */
  collide(x, y, rad, draft) {
    for (const c of this.land) if (dist(x, y, c.x, c.y) < c.r + rad * 0.6) return { kind: 'land', obj: c };
    for (const r of this.rocks) if (this.rockDangerous(r, draft) && dist(x, y, r.x, r.y) < r.r + rad * 0.55) return { kind: 'rock', obj: r };
    for (const w of this.wrecks) if (dist(x, y, w.x, w.y) < w.r + rad * 0.5) return { kind: 'wreck', obj: w };
    return null;
  }

  /** Le segment traverse-t-il un obstacle connu (terre, écueil relevé, épave relevée) ? Retourne l'obstacle. */
  knownBlocker(ax, ay, bx, by, rad, draft) {
    for (const c of this.land) if (segCircle(ax, ay, bx, by, c.x, c.y, c.r + rad * 0.5)) return { kind: 'land', obj: c };
    for (const r of this.rocks) if (r.revealed && this.rockDangerous(r, draft) && !r.submerged && segCircle(ax, ay, bx, by, r.x, r.y, r.r + rad * 0.5)) return { kind: 'rock', obj: r };
    for (const w of this.wrecks) if (w.revealed && segCircle(ax, ay, bx, by, w.x, w.y, w.r + rad * 0.4)) return { kind: 'wreck', obj: w };
    return null;
  }

  /** Point (x,y) sur la terre ? */
  onLand(x, y, pad = 0) {
    for (const c of this.land) if (dist(x, y, c.x, c.y) < c.r + pad) return true;
    return false;
  }

  get revealedCount() { return this.rocks.filter((r) => r.revealed).length + this.wrecks.filter((w) => w.revealed).length; }
}
