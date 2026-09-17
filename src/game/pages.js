// Pages du journal de Yann qui dérivent : se lisent en gardant le faisceau dessus.
import { BALANCE } from '../data/balance.js';
import { RNG, TAU } from '../core/math.js';

export class Pages {
  constructor(night, map, def, storyPages, alreadyRead) {
    this.list = [];
    if (!def.mechanics.pages) return;
    const rng = new RNG(555 + (def.id === 'infinite' ? 9 : def.id));
    const candidates = storyPages.filter((p) => (def.id === 'infinite' ? p.night === 0 : p.night === def.id));
    const count = Math.min(def.pages || 0, candidates.length);
    const zones = [...map.pageZones];
    for (let i = 0; i < count; i++) {
      const z = zones.length ? zones.splice(rng.int(0, zones.length - 1), 1)[0] : { x: 640, y: 360, r: 100 };
      const a = rng.range(0, TAU), d = rng.range(0, z.r);
      const page = candidates[i];
      this.list.push({
        id: page.id, story: page, x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d,
        vx: 0, vy: 0, read: false, progress: 0, glow: 0, rot: rng.range(-0.4, 0.4), phase: rng.range(0, TAU),
        // Une page apparaît après un délai pour étaler la découverte
        appearAt: 10 + i * 25 + rng.range(0, 10), visible: false, alreadyRead: alreadyRead.includes(page.id),
      });
    }
  }

  get remaining() { return this.list.filter((p) => !p.read).length; }

  update(dt, night) {
    const wind = night.weather.windForce();
    for (const p of this.list) {
      if (!p.visible) { if (night.t >= p.appearAt) { p.visible = true; night.fx.pageAppear(p); } continue; }
      if (p.read) { p.glow = Math.max(0, p.glow - dt * 2); continue; }
      p.phase += dt;
      // dérive lente
      const drift = BALANCE.pages.drift;
      p.x += (Math.cos(p.phase * 0.3) * drift + wind.x * 0.4) * dt;
      p.y += (Math.sin(p.phase * 0.23) * drift + wind.y * 0.4) * dt;
      p.rot += Math.sin(p.phase * 0.5) * 0.15 * dt;
      // rester dans l'eau
      if (night.hazards.onLand(p.x, p.y, 20)) { p.x -= wind.x * dt * 2; p.y -= wind.y * dt * 2; }
      p.x = Math.min(1250, Math.max(30, p.x)); p.y = Math.min(690, Math.max(30, p.y));
      const l = night.beam.lightAt(p.x, p.y);
      if (l > 0.1) {
        p.progress += dt / BALANCE.pages.readTime;
        p.glow = Math.min(1, p.glow + dt * 3);
        if (p.progress >= 1) { p.read = true; night.onPageRead(p); }
      } else {
        p.progress = Math.max(0, p.progress - dt * 0.6);
        p.glow = Math.max(0.15, p.glow - dt);
      }
    }
  }
}
