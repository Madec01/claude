// Boucle de jeu à pas fixe (simulation 60 Hz) avec rendu à chaque frame.

export class Loop {
  /**
   * @param {{update:(dt:number)=>void, render:(alpha:number, dt:number)=>void, fixedDt?:number}} opts
   */
  constructor({ update, render, fixedDt = 1 / 60 }) {
    this.update = update;
    this.render = render;
    this.fixedDt = fixedDt;
    this.timeScale = 1;
    this.running = false;
    this.acc = 0;
    this.last = 0;
    this.fps = 60;
    this._fpsAcc = 0;
    this._fpsN = 0;
    this._raf = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  _tick(now) {
    if (!this.running) return;
    let frame = (now - this.last) / 1000;
    this.last = now;
    if (frame > 0.1) frame = 0.1; // onglet en arrière-plan : on évite la spirale de la mort
    this._fpsAcc += frame; this._fpsN++;
    if (this._fpsAcc >= 0.5) { this.fps = Math.round(this._fpsN / this._fpsAcc); this._fpsAcc = 0; this._fpsN = 0; }

    this.acc += frame * this.timeScale;
    let steps = 0;
    while (this.acc >= this.fixedDt && steps < 8) {
      this.update(this.fixedDt);
      this.acc -= this.fixedDt;
      steps++;
    }
    this.render(this.acc / this.fixedDt, frame);
    this._raf = requestAnimationFrame(this._tick);
  }
}
