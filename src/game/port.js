// Le quai de Port-Aël.
import { dist } from '../core/math.js';

export class Port {
  constructor(p) {
    this.x = p.x; this.y = p.y; this.angle = p.angle; this.zone = p.zone;
    this.dockX = p.dockX ?? p.x; this.dockY = p.dockY ?? p.y;
    this.bellT = 0;
    this.docked = 0;
  }
  inZone(x, y) { return dist(x, y, this.x, this.y) <= this.zone; }
  update(dt) { if (this.bellT > 0) this.bellT -= dt; }
  ring() { this.bellT = 1.2; this.docked++; }
}
