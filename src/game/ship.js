// Navires : suivi de route, dérive, guidage par la lumière, ancre, corne, accostage, naufrage.
import { BALANCE } from '../data/balance.js';
import { Assets } from '../core/assets.js';
import { turnToward, angleDiff, dist, clamp, rndPick, TAU } from '../core/math.js';

export const SHIP_COLORS = ['red', 'blue', 'green', 'yellow', 'white', 'black'];
let nextId = 1;

export class Ship {
  constructor(type, x, y, heading, colorIdx, entry, opts = {}) {
    const def = BALANCE.ships[type];
    this.id = nextId++;
    this.type = type;
    this.def = def;
    this.name = def.name;
    this.x = x; this.y = y;
    this.px = x; this.py = y;           // position précédente (interpolation)
    this.heading = heading;
    this.speed = 0;
    this.colorIdx = colorIdx % SHIP_COLORS.length;
    this.entry = entry;
    this.driftTarget = entry.drift;
    this.route = [];
    this.routeIdx = 0;
    this.anchored = false;
    this.holdTimer = 0;          // corne de brume
    this.guidedTimer = 0;        // temps restant de guidage après la lumière
    this.lit = 0;                // éclairement courant 0..1
    this.hull = def.hull;        // points de coque
    this.damage = 0;             // 0..3 (état du sprite)
    this.state = 'sailing';      // sailing | waiting | docking | docked | wrecking | sunk
    this.stateTime = 0;
    this.lost = false;           // touché par la Bête
    this.lostTimer = 0;
    this.wobble = Math.random() * TAU;
    this.wakeTimer = 0;
    this.creakTimer = 2 + Math.random() * 4;
    this.age = 0;
    this.required = !!opts.required;
    this.isYann = type === 'yann';
    this.lanternPhase = Math.random() * TAU;
    this.bumpTimer = 0;
    this.scale = 1;
    this.length = def.length;
    this.radius = def.radius;
    this.draft = def.draft;
    this.wreckReason = null;
    this.dockProgress = 0;
    this.lastCollisionShip = null;
    this.collisionCooldown = 0;
    this.spriteKey = this._spriteKey();
    this._computeScale();
  }

  _spriteKey() {
    const s = Math.min(this.damage, this.def.sprite === 'dinghy' ? 2 : 3);
    if (this.def.sprite === 'dinghy') return `dinghy_large_${s}`;
    return `ship_${SHIP_COLORS[this.colorIdx]}_${s}`;
  }

  _computeScale() {
    const img = this.image();
    if (img) this.scale = this.length / img.height;
  }

  image() {
    let img = Assets.img(this.spriteKey);
    if (!img) {
      // repli : autre couleur ou état intact
      img = Assets.img(`ship_${SHIP_COLORS[this.colorIdx]}_0`) || Assets.img('ship_red_0') || Assets.img('dinghy_large_0');
    }
    return img;
  }

  get active() { return this.state === 'sailing' || this.state === 'waiting'; }
  get hasRoute() { return this.route.length > 0 && this.routeIdx < this.route.length; }
  get guided() { return this.guidedTimer > 0; }
  get frozen() { return this.holdTimer > 0 || this.anchored; }

  setRoute(points) {
    this.route = points;
    this.routeIdx = 0;
    if (this.state === 'waiting') this.state = 'sailing';
    this.lost = false;
    this.anchored = false;
  }

  clearRoute() { this.route = []; this.routeIdx = 0; }

  takeDamage(n, reason) {
    this.hull -= n;
    this.damage = clamp(this.damage + n, 0, 3);
    this.spriteKey = this._spriteKey();
    if (this.hull <= 0) this.wreck(reason);
  }

  wreck(reason) {
    if (this.state === 'wrecking' || this.state === 'sunk' || this.state === 'docked') return;
    this.state = 'wrecking';
    this.stateTime = 0;
    this.wreckReason = reason;
    this.damage = 3;
    this.spriteKey = this._spriteKey();
    this.route = [];
    this.speed = 0;
  }

  /** Mise à jour d'un pas de simulation. */
  update(dt, night) {
    this.px = this.x; this.py = this.y;
    this.age += dt;
    this.stateTime += dt;
    if (this.collisionCooldown > 0) this.collisionCooldown -= dt;
    if (this.bumpTimer > 0) this.bumpTimer -= dt;

    if (this.state === 'wrecking') {
      if (this.stateTime >= BALANCE.ships.sinkTime) { this.state = 'sunk'; this.stateTime = 0; }
      return;
    }
    if (this.state === 'sunk' || this.state === 'docked') return;
    if (this.state === 'docking') { this._updateDocking(dt, night); return; }

    const B = BALANCE.ships;
    const def = this.def;

    // Éclairement et guidage
    this.lit = night.beam.lightAt(this.x, this.y);
    if (this.lit > 0.05) {
      this.guidedTimer = BALANCE.beam.guidedGrace;
      if (this.lost) { this.lostTimer += dt; if (this.lostTimer > 0.5) { this.lost = false; this.lostTimer = 0; } }
    } else {
      this.guidedTimer = Math.max(0, this.guidedTimer - dt);
      this.lostTimer = 0;
    }
    if (this.holdTimer > 0) this.holdTimer -= dt;

    // Vitesse cible
    let targetSpeed = 0;
    let targetHeading = this.heading;
    if (this.frozen) {
      targetSpeed = 0;
    } else if (this.lost) {
      targetSpeed = def.speed * 0.15;
      this.wobble += dt * 0.7;
      targetHeading = this.heading + Math.sin(this.wobble * 1.3) * 0.6 * dt * 60 * 0.02;
    } else if (this.hasRoute) {
      const wp = this.route[this.routeIdx];
      const d = dist(this.x, this.y, wp.x, wp.y);
      const reach = this.routeIdx === this.route.length - 1 ? B.waypointReach + 4 : B.waypointReach + this.radius * 0.6;
      if (d < reach) {
        this.routeIdx++;
        if (this.routeIdx >= this.route.length) {
          // fin de route : quai ou attente
          if (night.port.inZone(this.x, this.y)) { this._startDocking(night); return; }
          this.state = 'waiting'; this.route = []; this.routeIdx = 0;
          targetSpeed = 0;
        }
      }
      if (this.hasRoute) {
        const w2 = this.route[this.routeIdx];
        targetHeading = Math.atan2(w2.y - this.y, w2.x - this.x);
        const g = this.guided ? 1 : B.unguidedSpeed;
        targetSpeed = def.speed * g * (1 - this.damage * 0.08);
        if (!this.guided) { this.wobble += dt * 2.1; targetHeading += Math.sin(this.wobble) * 0.35; }
        this.state = 'sailing';
      }
    } else if (this.state === 'waiting') {
      targetSpeed = 0;
    } else {
      // dérive : le courant pousse vers la cible de dérive de l'entrée
      const t = this.driftTarget;
      const toT = Math.atan2(t.y - this.y, t.x - this.x);
      this.wobble += dt * 1.4;
      targetHeading = toT + Math.sin(this.wobble) * 0.5;
      targetSpeed = def.speed * B.driftSpeed * (this.guided ? 0.8 : 1);
    }

    // Vent (tempête)
    const wind = night.weather.windForce();
    // Rotation
    const turnRate = def.turn * (this.guided ? 1 : 0.75) * (this.speed > 2 ? 1 : 0.6);
    this.heading = turnToward(this.heading, targetHeading, turnRate * dt);
    // Accélération / décélération
    const accel = targetSpeed > this.speed ? def.speed * 0.9 : def.speed * 2.2;
    this.speed += clamp(targetSpeed - this.speed, -accel * dt, accel * dt);

    let vx = Math.cos(this.heading) * this.speed;
    let vy = Math.sin(this.heading) * this.speed;
    if (!this.frozen || this.speed > 1) { vx += wind.x * (1 - this.draft * 0.15); vy += wind.y * (1 - this.draft * 0.15); }
    if (this.frozen && this.speed < 1) { vx = wind.x * 0.25; vy = wind.y * 0.25; }
    this.x += vx * dt; this.y += vy * dt;

    // Sillage
    if (this.speed > 8) {
      this.wakeTimer -= dt * this.speed / 40;
      if (this.wakeTimer <= 0) { this.wakeTimer = 0.12; night.fx.wake(this); }
    }
    // Craquements
    this.creakTimer -= dt;
    if (this.creakTimer <= 0) { this.creakTimer = 5 + Math.random() * 9; if (this.lit > 0.2) night.sfx('ship_creak_' + (1 + Math.floor(Math.random() * 3)), { volume: 0.25 + this.lit * 0.2, pan: (this.x / 1280 - 0.5) * 1.4 }); }

    // Sortie de carte : un navire qui dérive hors de la passe est perdu pour la nuit (sans naufrage) s'il s'éloigne trop.
    const m = BALANCE.world.margin + 40;
    if (this.x < -m || this.x > BALANCE.world.w + m || this.y < -m || this.y > BALANCE.world.h + m) {
      night.shipEscaped(this);
    }
  }

  _startDocking(night) {
    this.state = 'docking';
    this.stateTime = 0;
    this.dockProgress = 0;
    this.route = [];
    this.anchored = false;
    this.dockFrom = { x: this.x, y: this.y, h: this.heading };
    night.onShipDockingStart(this);
  }

  _updateDocking(dt, night) {
    const dur = 1.6;
    this.dockProgress = Math.min(1, this.stateTime / dur);
    const t = 1 - Math.pow(1 - this.dockProgress, 3);
    const p = night.port;
    this.x = this.dockFrom.x + (p.dockX - this.dockFrom.x) * t;
    this.y = this.dockFrom.y + (p.dockY - this.dockFrom.y) * t;
    this.heading = this.dockFrom.h + angleDiff(this.dockFrom.h, p.angle) * t;
    this.speed = 0;
    if (this.dockProgress >= 1) { this.state = 'docked'; this.stateTime = 0; night.onShipDocked(this); }
  }

  /** Position interpolée pour le rendu. */
  rx(alpha) { return this.px + (this.x - this.px) * alpha; }
  ry(alpha) { return this.py + (this.y - this.py) * alpha; }
}

export const randomShipColor = () => Math.floor(Math.random() * SHIP_COLORS.length);
export const pickAny = rndPick;
