// Outil de tracé de routes : cliquer-glisser depuis un navire jusqu'au quai.
import { dist } from '../core/math.js';

export class RouteTool {
  constructor(night) {
    this.night = night;
    this.drawing = false;
    this.ship = null;
    this.points = [];
    this.valid = true;
    this.blocker = null;
    this.downPos = null;
    this.lastSfx = 0;
    this.routesDrawn = 0;
    this.hover = null;
  }

  shipAt(x, y) {
    let best = null, bd = 1e9;
    for (const s of this.night.ships) {
      if (!s.active) continue;
      const d = dist(x, y, s.x, s.y);
      const hit = Math.max(26, s.radius + 14);
      if (d < hit && d < bd) { bd = d; best = s; }
    }
    return best;
  }

  updateHover(x, y) { this.hover = this.drawing ? this.ship : this.shipAt(x, y); }

  down(button, x, y) {
    const n = this.night;
    if (button === 0) {
      const s = this.shipAt(x, y);
      if (s) {
        this.drawing = true; this.ship = s; this.points = [{ x: s.x, y: s.y }]; this.valid = true; this.blocker = null; this.downPos = { x, y };
        n.sfx('route_draw', { volume: 0.5 });
        return true;
      }
    } else if (button === 2) {
      const s = this.shipAt(x, y);
      if (s) {
        if (!n.def.mechanics.anchor) return false;
        s.anchored = !s.anchored;
        if (s.anchored) { s.state = s.hasRoute ? 'sailing' : 'waiting'; n.sfx('anchor_drop', { volume: 0.7 }); n.fx.anchor(s); n.emit('anchor', s); }
        else { n.sfx('anchor_raise', { volume: 0.7 }); if (!s.hasRoute) s.state = 'sailing'; }
        return true;
      }
      // clic droit dans le vide : corne
      n.blowHorn();
      return true;
    }
    return false;
  }

  move(x, y) {
    if (!this.drawing) return;
    const last = this.points[this.points.length - 1];
    if (dist(x, y, last.x, last.y) < 14) return;
    // aimanter au quai
    const p = this.night.port;
    if (p.inZone(x, y)) { x = p.x; y = p.y; }
    const b = this.night.hazards.knownBlocker(last.x, last.y, x, y, this.ship.radius, this.ship.draft);
    if (b) {
      this.valid = false; this.blocker = b;
      if (this.night.t - this.lastSfx > 0.35) { this.lastSfx = this.night.t; this.night.sfx('route_invalid', { volume: 0.4 }); }
      return; // on n'ajoute pas le point : le trait « bute » contre l'obstacle
    }
    this.valid = true; this.blocker = null;
    this.points.push({ x, y });
    if (p.inZone(x, y)) this.finish();
  }

  up(button, x, y) {
    if (button !== 0 || !this.drawing) return;
    // clic simple sans glisser : effacer la route
    if (this.downPos && dist(x, y, this.downPos.x, this.downPos.y) < 6 && this.points.length <= 1) {
      if (this.ship.hasRoute) { this.ship.clearRoute(); this.ship.state = 'sailing'; this.night.sfx('ui_back', { volume: 0.4 }); }
      this.cancel();
      return;
    }
    this.finish();
  }

  finish() {
    if (!this.drawing) return;
    const n = this.night;
    const pts = this.points.slice(1);
    if (pts.length > 0 && this.ship.active) {
      // si le dernier point est dans la zone du quai, on termine exactement au quai
      const last = pts[pts.length - 1];
      if (n.port.inZone(last.x, last.y)) { last.x = n.port.x; last.y = n.port.y; }
      this.ship.setRoute(pts);
      this.routesDrawn++;
      n.sfx('route_set', { volume: 0.6 });
      n.onRouteSet(this.ship, pts);
    }
    this.cancel();
  }

  cancel() { this.drawing = false; this.ship = null; this.points = []; this.valid = true; this.blocker = null; this.downPos = null; }
}
