// Caméra : zoom, déplacement, cadrage automatique de l'île.
import { BALANCE } from '../data/balance.js';
import { toWorld, parse, TILE_W, TILE_H } from './hex.js';
import { clamp } from '../core/math.js';
import { STAGE, minZoom } from '../core/stage.js';

export class Camera {
  constructor() {
    this.x = 0; this.y = 0; this.zoom = 1;
    this.tx = 0; this.ty = 0; this.tzoom = 1;
    this.offsetX = 0; this.offsetY = 0;   // marge UI (px écran) : décale le centre du cadrage
    this.dragging = false; this.dragStart = null;
    this.bAmp = 0; this.bt = 0; this.bx = 0; this.by = 0; this.bz = 0;   // respiration au repos : dérive lente et zoom d'un pour cent
  }

  /** Cadre l'ensemble des cases (masque) avec une marge. */
  fit(mask, { padding = 90, uiLeft = 220, uiRight = 260, uiTop = 70, uiBottom = 60, immediate = false } = {}) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const k of mask) { const [q, r] = parse(k); const p = toWorld(q, r); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    const w = maxX - minX + TILE_W, h = maxY - minY + TILE_H;
    const availW = STAGE.W - uiLeft - uiRight - padding, availH = STAGE.H - uiTop - uiBottom - padding;
    const z = clamp(Math.min(availW / w, availH / h), minZoom(), BALANCE.camera.maxZoom);
    this.tx = (minX + maxX) / 2; this.ty = (minY + maxY) / 2 + 10;
    this.tzoom = z;
    this.offsetX = (uiLeft - uiRight) / 2; this.offsetY = (uiTop - uiBottom) / 2;
    if (immediate) { this.x = this.tx; this.y = this.ty; this.zoom = this.tzoom; }
  }

  update(dt) {
    const k = Math.min(1, dt * BALANCE.camera.lerp);
    this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; this.zoom += (this.tzoom - this.zoom) * k;
  }

  /**
   * Respiration au repos : la vue dérive de quelques pixels sur deux sinusoïdes lentes et le zoom respire d'un pour cent.
   * `target` vaut 1 au repos, 0 sinon ; la montée prend plusieurs secondes, la descente est immédiate (un geste = la
   * vue se pose). L'offset s'ajoute à part, jamais aux cibles : `fit` et `pan` ne le voient pas.
   */
  breathe(target, dt) {
    this.bAmp += (target - this.bAmp) * Math.min(1, dt * (target ? 0.22 : 8));
    if (this.bAmp < 0.001) { this.bAmp = 0; this.bx = 0; this.by = 0; this.bz = 0; return; }
    this.bt += dt;
    this.bx = Math.sin(this.bt * 0.33) * 7 * this.bAmp; this.by = Math.sin(this.bt * 0.21 + 1.3) * 5 * this.bAmp;
    this.bz = 1 + Math.sin(this.bt * 0.17) * 0.01 * this.bAmp;
  }
  get z() { return this.zoom * (this.bz || 1); }

  toScreen(wx, wy) { const z = this.z; return { x: (wx - this.x - this.bx) * z + STAGE.W / 2 + this.offsetX, y: (wy - this.y - this.by) * z + STAGE.H / 2 + this.offsetY }; }
  toWorldPoint(sx, sy) { const z = this.z; return { x: (sx - STAGE.W / 2 - this.offsetX) / z + this.x + this.bx, y: (sy - STAGE.H / 2 - this.offsetY) / z + this.y + this.by }; }

  zoomBy(f, sx, sy) {
    const before = this.toWorldPoint(sx, sy);
    this.tzoom = clamp(this.tzoom * f, minZoom(), BALANCE.camera.maxZoom);
    this.zoom = this.tzoom;
    const after = this.toWorldPoint(sx, sy);
    this.tx += before.x - after.x; this.ty += before.y - after.y; this.x = this.tx; this.y = this.ty;
  }

  pan(dx, dy) { this.tx -= dx / this.zoom; this.ty -= dy / this.zoom; this.x = this.tx; this.y = this.ty; }
}
