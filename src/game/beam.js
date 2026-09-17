// Le Feu : faisceau du phare (inertie, cône, portée, huile).
import { BALANCE } from '../data/balance.js';
import { angleDiff, clamp, coneLight, inCone, normAngle } from '../core/math.js';

export class Beam {
  constructor(lighthouse, upgrades, mechanics) {
    this.ox = lighthouse.x; this.oy = lighthouse.y;
    const B = BALANCE.beam;
    this.halfAngle = B.halfAngle[upgrades.lens || 0];
    this.rotRate = B.rotRate[upgrades.mechanism || 0];
    this.baseRange = B.range;
    this.range = B.range;
    this.angle = -Math.PI / 2;
    this.targetAngle = this.angle;
    this.vel = 0;
    this.on = true;
    this.low = false;           // feu réduit
    this.intensity = 1;         // 0..1 (extinction / rallumage)
    this.rainFactor = 1;
    this.totalRotation = 0;
    this.tickAcc = 0;
    // Huile
    this.oilEnabled = !!mechanics.oil;
    this.oilCap = BALANCE.oil.capacity[upgrades.oil || 0];
    this.oil = this.oilCap * BALANCE.oil.start;
    this.oilOut = false;
    this.relightTimer = 0;
    this.lowWarned = false;
  }

  /** Éclairement 0..1 d'un point du monde. */
  lightAt(x, y) {
    if (this.intensity <= 0.02) return 0;
    const near = Math.hypot(x - this.ox, y - this.oy) < BALANCE.beam.clearRadius ? 0.5 : 0;
    return Math.max(near, coneLight(x, y, this.ox, this.oy, this.angle, this.halfAngle, this.range) * this.intensity);
  }

  inCone(x, y) { return this.intensity > 0.02 && inCone(x, y, this.ox, this.oy, this.angle, this.halfAngle, this.range); }

  update(dt, mouse, night) {
    // Cible : angle vers le curseur
    if (mouse) this.targetAngle = Math.atan2(mouse.y - this.oy, mouse.x - this.ox);
    // Inertie : vitesse angulaire limitée, amortie
    const diff = angleDiff(this.angle, this.targetAngle);
    const maxRate = this.rotRate;
    const want = clamp(diff * BALANCE.beam.smoothing, -maxRate, maxRate);
    this.vel += (want - this.vel) * Math.min(1, dt * 12);
    const step = this.vel * dt;
    this.angle = normAngle(this.angle + step);
    this.totalRotation += Math.abs(step);
    // Tic-tac du mécanisme
    this.tickAcc += Math.abs(step);
    if (this.tickAcc > 0.22 && this.intensity > 0.2) { this.tickAcc = 0; night.sfx(Math.random() < 0.5 ? 'lens_tick_1' : 'lens_tick_2', { volume: 0.22 + Math.min(0.25, Math.abs(this.vel) * 0.06), minInterval: 0.08 }); }

    // Portée : pluie, feu réduit
    this.rainFactor = 1 - night.weather.rain * (1 - BALANCE.beam.rangeRain);
    const lowF = this.low ? BALANCE.beam.rangeLow : 1;
    this.range += (this.baseRange * this.rainFactor * lowF - this.range) * Math.min(1, dt * 4);

    // Huile
    if (this.oilEnabled) {
      if (this.oilOut) {
        this.relightTimer -= dt;
        this.intensity = Math.max(0, this.intensity - dt * 2.5);
        if (this.relightTimer <= 0) { this.oilOut = false; this.oil = Math.max(this.oil, this.oilCap * 0.12); night.sfx('oil_relight', { volume: 0.7 }); }
      } else {
        const burn = this.low ? BALANCE.oil.burnLow : BALANCE.oil.burnFull;
        this.oil -= burn * dt;
        if (this.oil <= this.oilCap * 0.2 && !this.lowWarned) { this.lowWarned = true; night.sfx('warning', { volume: 0.5 }); night.notify('Huile basse', 'warn'); }
        if (this.oil > this.oilCap * 0.3) this.lowWarned = false;
        if (this.oil <= 0) { this.oil = 0; this.oilOut = true; this.relightTimer = BALANCE.oil.relight; night.sfx('oil_out', { volume: 0.9 }); night.notify('Le feu s’éteint !', 'danger'); }
        this.intensity = Math.min(1, this.intensity + dt * 1.5);
      }
    } else {
      this.intensity = Math.min(1, this.intensity + dt * 1.5);
    }
  }

  addOil(n) { this.oil = clamp(this.oil + n, 0, this.oilCap); }
  toggleLow() { this.low = !this.low; return this.low; }
  get oilRatio() { return this.oilEnabled ? this.oil / this.oilCap : 1; }
}
