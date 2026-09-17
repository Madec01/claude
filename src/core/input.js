// Gestion des entrées souris / clavier en coordonnées logiques (1280×720).

export class Input {
  constructor(canvas, logicalW, logicalH) {
    this.canvas = canvas;
    this.W = logicalW; this.H = logicalH;
    this.mouse = { x: logicalW / 2, y: logicalH / 2, inside: false, left: false, right: false, moved: 0 };
    this.keys = new Set();
    this._just = { keys: new Set(), mouseDown: new Set(), mouseUp: new Set() };
    this.listeners = { mousedown: [], mouseup: [], keydown: [], wheel: [] };
    this.enabled = true;

    const toLogical = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * logicalW,
        y: ((e.clientY - r.top) / r.height) * logicalH,
      };
    };

    // On écoute sur window pour suivre la souris même au-dessus des overlays DOM.
    window.addEventListener('mousemove', (e) => {
      const p = toLogical(e);
      this.mouse.moved += Math.hypot(p.x - this.mouse.x, p.y - this.mouse.y);
      this.mouse.x = p.x; this.mouse.y = p.y;
      this.mouse.inside = p.x >= 0 && p.y >= 0 && p.x <= logicalW && p.y <= logicalH;
    });
    window.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (e.target.closest && e.target.closest('#ui, #hud button, #tutorial')) return; // clics sur l'UI DOM
      const p = toLogical(e);
      this.mouse.x = p.x; this.mouse.y = p.y;
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) this.mouse.right = true;
      this._just.mouseDown.add(e.button);
      for (const fn of this.listeners.mousedown) fn(e.button, p.x, p.y);
    });
    window.addEventListener('mouseup', (e) => {
      const p = toLogical(e);
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
      this._just.mouseUp.add(e.button);
      for (const fn of this.listeners.mouseup) fn(e.button, p.x, p.y);
    });
    window.addEventListener('blur', () => { this.mouse.left = false; this.mouse.right = false; this.keys.clear(); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.getElementById('stage')?.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.code;
      if (!this.keys.has(k)) this._just.keys.add(k);
      this.keys.add(k);
      if (k === 'Space' || k === 'ArrowUp' || k === 'ArrowDown') e.preventDefault();
      for (const fn of this.listeners.keydown) fn(k, e);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('wheel', (e) => { for (const fn of this.listeners.wheel) fn(e.deltaY); }, { passive: true });
  }

  on(type, fn) { this.listeners[type].push(fn); return () => { const i = this.listeners[type].indexOf(fn); if (i >= 0) this.listeners[type].splice(i, 1); }; }
  justPressed(code) { return this._just.keys.has(code); }
  justDown(button = 0) { return this._just.mouseDown.has(button); }
  justUp(button = 0) { return this._just.mouseUp.has(button); }
  isDown(code) { return this.keys.has(code); }

  /** À appeler en fin de frame de simulation. */
  endFrame() { this._just.keys.clear(); this._just.mouseDown.clear(); this._just.mouseUp.clear(); }
}
