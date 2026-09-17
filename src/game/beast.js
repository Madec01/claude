// La Bête : masse de brume qui traque le navire le plus proche. Ralentie par la lumière, repoussée par la corne.
import { BALANCE } from '../data/balance.js';
import { dist, turnToward, TAU, RNG } from '../core/math.js';

export class Beast {
  constructor(x, y, seed) {
    this.x = x; this.y = y;
    this.px = x; this.py = y;
    this.heading = Math.random() * TAU;
    this.radius = BALANCE.beast.radius;
    this.density = 1;         // 0..1 (sous la lumière elle se dissipe)
    this.retreat = 0;         // secondes de recul
    this.retreatDir = 0;
    this.target = null;
    this.wander = seed || Math.random() * 10;
    this.rng = new RNG(Math.floor((seed || 1) * 1000) + 3);
    this.puffs = [];
    for (let i = 0; i < 9; i++) this.puffs.push({ a: this.rng.range(0, TAU), d: this.rng.range(0, 0.8), s: this.rng.range(0.8, 1.4), spin: this.rng.range(-0.6, 0.6), phase: this.rng.range(0, TAU) });
    this.growlTimer = 4;
    this.lit = 0;
    this.active = true;
    this.hidden = false;
    this.wakeAt = 0;
  }

  repel(fromX, fromY, night) {
    this.retreat = BALANCE.beast.retreat;
    this.retreatDir = Math.atan2(this.y - fromY, this.x - fromX);
    this.density = Math.max(0.35, this.density - 0.25);
    night.sfx('beast_retreat', { volume: 0.7 });
  }

  update(dt, night) {
    this.px = this.x; this.py = this.y;
    if (!this.active) return;
    if (this.hidden) { if (night.t >= this.wakeAt) { this.hidden = false; night.notify('Quelque chose bouge dans la Brume', 'danger'); night.sfx('beast_growl_1', { volume: 0.6 }); } else return; }
    const B = BALANCE.beast;
    this.lit = night.beam.lightAt(this.x, this.y);
    // dissipation / régénération
    if (this.lit > 0.1) this.density = Math.max(0.15, this.density - B.dissipatePerSec * this.lit * dt);
    else this.density = Math.min(1, this.density + B.regenPerSec * dt);
    this.wander += dt;

    let speed;
    let targetHeading;
    if (this.retreat > 0) {
      this.retreat -= dt;
      speed = B.speed * 3.2;
      targetHeading = this.retreatDir;
    } else {
      // cible : navire actif le plus proche (non ancré de préférence)
      let best = null, bd = B.huntRange;
      for (const s of night.ships) {
        if (!s.active || s.lost) continue;
        const d = dist(s.x, s.y, this.x, this.y);
        if (d < bd) { bd = d; best = s; }
      }
      this.target = best;
      if (best) targetHeading = Math.atan2(best.y - this.y, best.x - this.x);
      else targetHeading = this.heading + Math.sin(this.wander * 0.7) * 0.9;
      const litF = this.lit;
      speed = (B.speed * (1 - litF) + B.speedLit * litF) * (0.5 + 0.5 * this.density);
    }
    this.heading = turnToward(this.heading, targetHeading, (this.retreat > 0 ? 6 : 1.6) * dt);
    this.x += Math.cos(this.heading) * speed * dt;
    this.y += Math.sin(this.heading) * speed * dt;
    // reste dans la passe, évite la terre
    if (night.hazards.onLand(this.x, this.y, -10)) { this.x -= Math.cos(this.heading) * speed * dt * 2; this.y -= Math.sin(this.heading) * speed * dt * 2; this.heading += Math.PI / 2; }
    this.x = Math.max(-40, Math.min(1320, this.x)); this.y = Math.max(-40, Math.min(760, this.y));
    // éviter le rayon dégagé du phare
    const dl = dist(this.x, this.y, night.beam.ox, night.beam.oy);
    if (dl < BALANCE.beam.clearRadius + this.radius) { const a = Math.atan2(this.y - night.beam.oy, this.x - night.beam.ox); this.x = night.beam.ox + Math.cos(a) * (BALANCE.beam.clearRadius + this.radius); this.y = night.beam.oy + Math.sin(a) * (BALANCE.beam.clearRadius + this.radius); }

    // capture
    if (this.retreat <= 0 && this.density > 0.3) {
      for (const s of night.ships) {
        if (!s.active || s.lost) continue;
        if (dist(s.x, s.y, this.x, this.y) < B.catchRadius + s.radius) night.onShipLost(s, this);
      }
    }
    for (const p of this.puffs) p.phase += dt * (0.4 + p.spin);
    this.growlTimer -= dt;
    if (this.growlTimer <= 0) { this.growlTimer = 7 + Math.random() * 8; night.sfx(Math.random() < 0.5 ? 'beast_growl_1' : 'beast_growl_2', { volume: 0.35 + 0.3 * this.density, pan: (this.x / 1280 - 0.5) * 1.5 }); }
  }
}
