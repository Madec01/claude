// Marée, vent, rafales, pluie.
import { BALANCE } from '../data/balance.js';
import { RNG, lerp } from '../core/math.js';

export class Weather {
  constructor(def, seed = 7) {
    this.rng = new RNG(seed);
    this.tideEnabled = !!def.mechanics.tide;
    this.stormEnabled = !!def.mechanics.storm;
    this.tide = 0.5;
    this.tideDir = 1;
    this.tidePhase = this.rng.range(0, Math.PI * 2);
    this.rain = def.rain || 0;
    this.windStrength = def.wind || 0;
    this.windAngle = this.rng.range(0, Math.PI * 2);
    this.gust = 0;          // 0..1 intensité de rafale
    this.gustTimer = this.rng.range(3, 6);
    this.gustDur = 0;
    this.gustAngle = this.windAngle;
    this.thunderTimer = this.rng.range(8, 20);
    this.duration = def.duration;
    this.t = 0;
    this.wind = { x: 0, y: 0 };
  }

  update(dt, night) {
    this.t += dt;
    // Marée : une montée puis une descente sur la nuit (sinusoïde), 0 = basse, 1 = haute
    if (this.tideEnabled) {
      const period = Number.isFinite(this.duration) ? this.duration / BALANCE.tide.period : 120;
      const prev = this.tide;
      this.tide = 0.5 + 0.5 * Math.sin(this.tidePhase + (this.t / period) * Math.PI * 2);
      this.tideDir = this.tide >= prev ? 1 : -1;
    }
    // Vent
    if (this.stormEnabled) {
      this.windAngle += Math.sin(this.t * 0.11) * 0.08 * dt;
      if (this.gustDur > 0) {
        this.gustDur -= dt;
        this.gust = Math.min(1, this.gust + dt * 3);
        if (this.gustDur <= 0) { this.gust = 0; }
      } else {
        this.gustTimer -= dt;
        this.gust = Math.max(0, this.gust - dt * 2);
        if (this.gustTimer <= 0) {
          const g = BALANCE.storm;
          this.gustTimer = this.rng.range(g.gustEvery[0], g.gustEvery[1]) / Math.max(0.3, this.windStrength);
          this.gustDur = this.rng.range(g.gustDuration[0], g.gustDuration[1]);
          this.gustAngle = this.windAngle + this.rng.range(-0.5, 0.5);
          night.onGust(this.gustAngle, this.gustDur);
        }
      }
      // Tonnerre
      if (this.rain > 0.3) {
        this.thunderTimer -= dt;
        if (this.thunderTimer <= 0) { this.thunderTimer = this.rng.range(9, 22); night.onThunder(); }
      }
    }
    const g = BALANCE.storm;
    const base = g.windDrift * this.windStrength;
    const gustF = g.gustForce * this.gust * this.windStrength;
    this.wind.x = Math.cos(this.windAngle) * base + Math.cos(this.gustAngle) * gustF;
    this.wind.y = Math.sin(this.windAngle) * base + Math.sin(this.gustAngle) * gustF;
  }

  windForce() { return this.wind; }
  get windMagnitude() { return Math.hypot(this.wind.x, this.wind.y); }
  get tideLabel() { return this.tide < BALANCE.tide.emergeLevel ? 'basse' : this.tide > BALANCE.tide.submergeLevel ? 'haute' : (this.tideDir > 0 ? 'montante' : 'descendante'); }
}

export const mix = lerp;
