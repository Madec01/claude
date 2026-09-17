// Tremblement d'écran (trauma décroissant, bruit pseudo-aléatoire).

export class Shake {
  constructor() { this.trauma = 0; this.x = 0; this.y = 0; this.rot = 0; this.enabled = true; this.t = 0; }
  trigger(amount) { this.trauma = Math.min(1, this.trauma + amount); }
  update(dt) {
    this.t += dt;
    if (this.trauma <= 0) { this.x = this.y = this.rot = 0; return; }
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const s = this.trauma * this.trauma;
    if (!this.enabled) { this.x = this.y = this.rot = 0; return; }
    const n = (f, o) => Math.sin(this.t * f + o) * Math.cos(this.t * f * 0.37 + o * 1.3);
    this.x = n(61, 1) * 14 * s;
    this.y = n(53, 7) * 14 * s;
    this.rot = n(47, 3) * 0.02 * s;
  }
}
