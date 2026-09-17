// Caméra : zoom, déplacement, cadrage automatique de l'île.
import { BALANCE } from '../data/balance.js';
import { toWorld, parse, TILE_W, TILE_H } from './hex.js';
import { clamp } from '../core/math.js';

const W = 1280, H = 720;

export class Camera {
  constructor() {
    this.x = 0; this.y = 0; this.zoom = 1;
    this.tx = 0; this.ty = 0; this.tzoom = 1;
    this.offsetX = 0; this.offsetY = 0;   // marge UI (px écran) : décale le centre du cadrage
    this.dragging = false; this.dragStart = null;
  }

  /** Cadre l'ensemble des cases (masque) avec une marge. */
  fit(mask, { padding = 90, uiLeft = 220, uiRight = 260, uiTop = 70, uiBottom = 60, immediate = false } = {}) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const k of mask) { const [q, r] = parse(k); const p = toWorld(q, r); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    const w = maxX - minX + TILE_W, h = maxY - minY + TILE_H;
    const availW = W - uiLeft - uiRight - padding, availH = H - uiTop - uiBottom - padding;
    const z = clamp(Math.min(availW / w, availH / h), BALANCE.camera.minZoom, BALANCE.camera.maxZoom);
    this.tx = (minX + maxX) / 2; this.ty = (minY + maxY) / 2 + 10;
    this.tzoom = z;
    this.offsetX = (uiLeft - uiRight) / 2; this.offsetY = (uiTop - uiBottom) / 2;
    if (immediate) { this.x = this.tx; this.y = this.ty; this.zoom = this.tzoom; }
  }

  update(dt) {
    const k = Math.min(1, dt * BALANCE.camera.lerp);
    this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; this.zoom += (this.tzoom - this.zoom) * k;
  }

  toScreen(wx, wy) { return { x: (wx - this.x) * this.zoom + W / 2 + this.offsetX, y: (wy - this.y) * this.zoom + H / 2 + this.offsetY }; }
  toWorldPoint(sx, sy) { return { x: (sx - W / 2 - this.offsetX) / this.zoom + this.x, y: (sy - H / 2 - this.offsetY) / this.zoom + this.y }; }

  zoomBy(f, sx, sy) {
    const before = this.toWorldPoint(sx, sy);
    this.tzoom = clamp(this.tzoom * f, BALANCE.camera.minZoom, BALANCE.camera.maxZoom);
    this.zoom = this.tzoom;
    const after = this.toWorldPoint(sx, sy);
    this.tx += before.x - after.x; this.ty += before.y - after.y; this.x = this.tx; this.y = this.ty;
  }

  pan(dx, dy) { this.tx -= dx / this.zoom; this.ty -= dy / this.zoom; this.x = this.tx; this.y = this.ty; }
}
