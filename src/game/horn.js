// La corne de brume : arrêt d'urgence des navires proches, repousse la Bête.
import { BALANCE } from '../data/balance.js';
import { dist } from '../core/math.js';

export class Horn {
  constructor(lighthouse, upgrades, enabled) {
    this.ox = lighthouse.x; this.oy = lighthouse.y;
    this.radius = BALANCE.horn.radius[upgrades.hornRange || 0];
    this.cooldown = BALANCE.horn.cooldown[upgrades.hornSpeed || 0];
    this.timer = 0;
    this.enabled = enabled;
    this.rings = [];   // ondes visuelles {t}
    this.blows = 0;
  }

  get ready() { return this.enabled && this.timer <= 0; }
  get ratio() { return this.cooldown > 0 ? 1 - Math.max(0, this.timer) / this.cooldown : 1; }

  update(dt) {
    if (this.timer > 0) this.timer -= dt;
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < 1.6);
  }

  blow(night) {
    if (!this.enabled) return false;
    if (this.timer > 0) { night.sfx('ui_error', { volume: 0.25 }); return false; }
    this.timer = this.cooldown;
    this.blows++;
    this.rings.push({ t: 0 });
    let stopped = 0;
    for (const s of night.ships) {
      if (!s.active) continue;
      if (dist(s.x, s.y, this.ox, this.oy) <= this.radius + s.radius) { s.holdTimer = BALANCE.horn.freeze; stopped++; }
    }
    for (const b of night.beasts) {
      if (dist(b.x, b.y, this.ox, this.oy) <= this.radius + b.radius * 1.5) b.repel(this.ox, this.oy, night);
    }
    night.sfx('horn', { volume: 0.9 });
    if (stopped > 0) setTimeout(() => night.sfx('horn_distant', { volume: 0.45 }), 900);
    night.shake.trigger(0.18);
    night.fx.hornBlast(this.ox, this.oy);
    return true;
  }
}
