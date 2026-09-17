// Gestion des entrées souris / clavier / tactile en coordonnées logiques (taille de scène dynamique).

export class Input {
  constructor(canvas, logicalW, logicalH) {
    this.canvas = canvas;
    this.W = logicalW; this.H = logicalH;
    this.mouse = { x: logicalW / 2, y: logicalH / 2, inside: false, left: false, right: false, moved: 0 };
    this.keys = new Set();
    this._just = { keys: new Set(), mouseDown: new Set(), mouseUp: new Set() };
    this.listeners = { mousedown: [], mouseup: [], keydown: [], wheel: [], tap: [], pan: [], pinch: [], touchstart: [] };
    this.enabled = true;
    this.lastPointer = 'mouse';   // 'mouse' | 'touch' : le dernier périphérique utilisé

    const toLogical = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * this.W,
        y: ((e.clientY - r.top) / r.height) * this.H,
      };
    };
    this._toLogical = toLogical;

    // On écoute sur window pour suivre la souris même au-dessus des overlays DOM.
    window.addEventListener('mousemove', (e) => {
      const p = toLogical(e);
      this.mouse.moved += Math.hypot(p.x - this.mouse.x, p.y - this.mouse.y);
      this.mouse.x = p.x; this.mouse.y = p.y;
      this.mouse.inside = p.x >= 0 && p.y >= 0 && p.x <= this.W && p.y <= this.H;
      this.lastPointer = 'mouse';
    });
    window.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (e.target.closest && e.target.closest('#ui, #hud button, #hud .hud-queue, #hud .hud-wishes, #hud .hud-fauna, #hud .hud-bud-hint, #tutorial')) return; // clics sur l'UI DOM
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
    this._bindTouch(canvas);
  }

  /** Taille logique courante (mise à jour par la disposition de la scène). */
  setSize(w, h) { this.W = w; this.H = h; }

  /**
   * Tactile (sur le canvas uniquement : les calques DOM gardent leurs événements natifs).
   * Un doigt : appui court = « tap » ; glissement = « pan » (dx, dy logiques). Deux doigts : « pinch » (facteur, centre) + pan du centre.
   */
  _bindTouch(canvas) {
    const T = this.touch = { active: false, x: 0, y: 0, moved: 0, t0: 0, panning: false, pinch: null };
    const pt = (t) => this._toLogical(t);
    const slop = () => { const r = canvas.getBoundingClientRect(); return 10 * (this.W / Math.max(1, r.width)); };
    canvas.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.lastPointer = 'touch';
      if (e.touches.length === 1) {
        const p = pt(e.touches[0]);
        Object.assign(T, { active: true, x: p.x, y: p.y, moved: 0, t0: performance.now(), panning: false, pinch: null });
        this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.inside = true;
        for (const fn of this.listeners.touchstart) fn(p.x, p.y);
      } else if (e.touches.length >= 2) {
        const a = pt(e.touches[0]), b = pt(e.touches[1]);
        T.pinch = { d: Math.hypot(b.x - a.x, b.y - a.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
        T.panning = true;
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      if (e.touches.length >= 2 && T.pinch) {
        const a = pt(e.touches[0]), b = pt(e.touches[1]);
        const d = Math.hypot(b.x - a.x, b.y - a.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        if (T.pinch.d > 0) for (const fn of this.listeners.pinch) fn(d / T.pinch.d, cx, cy);
        for (const fn of this.listeners.pan) fn(cx - T.pinch.cx, cy - T.pinch.cy);
        T.pinch = { d, cx, cy };
        return;
      }
      if (e.touches.length === 1 && T.active) {
        const p = pt(e.touches[0]);
        const dx = p.x - T.x, dy = p.y - T.y;
        T.moved += Math.hypot(dx, dy);
        if (!T.panning && T.moved > slop()) T.panning = true;
        if (T.panning) for (const fn of this.listeners.pan) fn(dx, dy);
        T.x = p.x; T.y = p.y;
      }
    }, { passive: false });
    const end = (e) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        if (T.active && !T.panning && performance.now() - T.t0 < 700) for (const fn of this.listeners.tap) fn(T.x, T.y);
        T.active = false; T.pinch = null; T.panning = false;
      } else if (e.touches.length === 1) {
        const p = pt(e.touches[0]); T.x = p.x; T.y = p.y; T.pinch = null; T.panning = true; T.active = true;
      }
    };
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('touchcancel', end, { passive: false });
  }

  on(type, fn) { this.listeners[type].push(fn); return () => { const i = this.listeners[type].indexOf(fn); if (i >= 0) this.listeners[type].splice(i, 1); }; }
  justPressed(code) { return this._just.keys.has(code); }
  justDown(button = 0) { return this._just.mouseDown.has(button); }
  justUp(button = 0) { return this._just.mouseUp.has(button); }
  isDown(code) { return this.keys.has(code); }

  /** À appeler en fin de frame de simulation. */
  endFrame() { this._just.keys.clear(); this._just.mouseDown.clear(); this._just.mouseUp.clear(); }
}
