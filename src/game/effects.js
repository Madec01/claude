// Effets visuels (particules) : sillage, accostage, naufrage, corne, pages, rafales, aube.
import { Assets } from '../core/assets.js';
import { rnd, rndPick, TAU, easeOutCubic } from '../core/math.js';

export class Effects {
  constructor(night) {
    this.n = night;
    this.p = night.particles;
    this.texts = []; // textes flottants {x,y,text,color,t}
  }

  img(prefix) { const keys = Assets.keysStarting(prefix); return keys.length ? Assets.img(rndPick(keys)) : null; }

  wake(ship) {
    const a = ship.heading + Math.PI;
    const s = ship.radius * 0.6;
    for (let i = -1; i <= 1; i += 2) {
      this.p.emit({
        x: ship.x + Math.cos(a) * ship.length * 0.35 + Math.cos(ship.heading + Math.PI / 2) * i * s * 0.5,
        y: ship.y + Math.sin(a) * ship.length * 0.35 + Math.sin(ship.heading + Math.PI / 2) * i * s * 0.5,
        vx: Math.cos(a + i * 0.5) * 14, vy: Math.sin(a + i * 0.5) * 14,
        life: 1.4 + Math.random() * 0.6, size: 4 + s * 0.3, sizeEnd: 12 + s * 0.6,
        color: '#dce9f2', alpha: 0.26, alphaEnd: 0, layer: 0,
      });
    }
  }

  spawn(ship) {
    for (let i = 0; i < 6; i++) this.p.emit({ x: ship.x, y: ship.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 1.2, size: 10, sizeEnd: 30, color: '#e8f0f6', alpha: 0.2, alphaEnd: 0, layer: 0 });
  }

  dock(ship, pts) {
    const { x, y } = this.n.port;
    const star = this.img('star_') || this.img('spark_');
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * TAU, sp = rnd(40, 160);
      this.p.emit({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: rnd(0.6, 1.3), size: rnd(6, 14), sizeEnd: 0, img: star, color: '#ffd77a', alpha: 1, alphaEnd: 0, gravity: 90, drag: 1.2, blend: 'lighter', layer: 1, rot: a, rotV: rnd(-4, 4) });
    }
    for (let i = 0; i < 3; i++) this.p.emit({ x, y, life: 1.1 + i * 0.15, size: 20, sizeEnd: 190 + i * 40, color: '#ffe9b0', alpha: 0.35, alphaEnd: 0, blend: 'lighter', layer: 1, ease: easeOutCubic });
    this.floatText(x, y - 50, `+${pts}`, '#ffe9b0');
  }

  wreck(ship) {
    const smoke = this.img('smoke_') || this.img('whitepuff_');
    const fire = Assets.img('fire_1') || Assets.img('flame_01');
    const wood = this.img('debris_') || null;
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * TAU, sp = rnd(30, 140);
      this.p.emit({ x: ship.x, y: ship.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.8, 1.8), size: rnd(4, 10), sizeEnd: rnd(2, 6), img: wood, color: '#6b4a2b', alpha: 1, alphaEnd: 0, drag: 1.8, layer: 1, rot: a, rotV: rnd(-6, 6) });
    }
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * TAU, sp = rnd(20, 90);
      this.p.emit({ x: ship.x, y: ship.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.9, 1.6), size: rnd(8, 18), sizeEnd: rnd(20, 40), color: '#dbe8f0', alpha: 0.7, alphaEnd: 0, drag: 2, layer: 1 });
    }
    for (let i = 0; i < 14; i++) {
      this.p.emit({ x: ship.x + rnd(-12, 12), y: ship.y + rnd(-12, 12), vx: rnd(-8, 8), vy: rnd(-30, -10), life: rnd(1.4, 2.6), size: rnd(18, 34), sizeEnd: rnd(50, 90), img: smoke, color: '#333', alpha: 0.55, alphaEnd: 0, layer: 1, rot: rnd(0, TAU), rotV: rnd(-0.8, 0.8) });
    }
    for (let i = 0; i < 6; i++) {
      this.p.emit({ x: ship.x + rnd(-10, 10), y: ship.y + rnd(-10, 10), vx: 0, vy: rnd(-10, -4), life: rnd(1.2, 2.2), size: rnd(18, 30), sizeEnd: 6, img: fire, color: '#ff9a3c', alpha: 0.95, alphaEnd: 0, blend: 'lighter', layer: 1 });
    }
    this.p.emit({ x: ship.x, y: ship.y, life: 0.5, size: 20, sizeEnd: 220, color: '#ffb066', alpha: 0.5, alphaEnd: 0, blend: 'lighter', layer: 1, ease: easeOutCubic });
  }

  bump(a, b) {
    const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    for (let i = 0; i < 10; i++) { const an = Math.random() * TAU, sp = rnd(20, 80); this.p.emit({ x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: rnd(0.5, 1), size: rnd(3, 7), sizeEnd: 1, color: '#7a5533', alpha: 1, alphaEnd: 0, drag: 2, layer: 1 }); }
  }

  lost(ship) {
    const fog = this.img('fog_') || this.img('whitepuff_');
    for (let i = 0; i < 12; i++) { const a = Math.random() * TAU; this.p.emit({ x: ship.x, y: ship.y, vx: Math.cos(a) * 20, vy: Math.sin(a) * 20, life: rnd(1.5, 2.5), size: 40, sizeEnd: 120, img: fog, alpha: 0.5, alphaEnd: 0, layer: 1, rot: a }); }
  }

  hornBlast(x, y) {
    for (let i = 0; i < 3; i++) this.p.emit({ x, y, life: 1.3 + i * 0.2, size: 30, sizeEnd: this.n.horn.radius * 2.1, color: '#cfe3ff', alpha: 0.28, alphaEnd: 0, blend: 'lighter', layer: 1, ease: easeOutCubic });
  }

  anchor(ship) {
    for (let i = 0; i < 8; i++) { const a = Math.random() * TAU; this.p.emit({ x: ship.x, y: ship.y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, life: 0.8, size: 5, sizeEnd: 14, color: '#dce9f2', alpha: 0.5, alphaEnd: 0, layer: 0 }); }
  }

  reveal(h) {
    const spark = this.img('spark_');
    for (let i = 0; i < 8; i++) { const a = Math.random() * TAU, sp = rnd(20, 60); this.p.emit({ x: h.x, y: h.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.4, 0.9), size: rnd(6, 12), sizeEnd: 0, img: spark, color: '#fff2c8', alpha: 0.9, alphaEnd: 0, blend: 'lighter', layer: 1, rot: a }); }
  }

  page(page) {
    const star = this.img('star_');
    for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, sp = rnd(20, 110); this.p.emit({ x: page.x, y: page.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: rnd(0.8, 1.5), size: rnd(6, 12), sizeEnd: 0, img: star, color: '#f2b134', alpha: 1, alphaEnd: 0, gravity: 60, drag: 1, blend: 'lighter', layer: 1, rot: a, rotV: 3 }); }
    this.floatText(page.x, page.y - 30, 'Page lue', '#f2b134');
  }

  pageAppear(page) {
    for (let i = 0; i < 8; i++) this.p.emit({ x: page.x, y: page.y, vx: rnd(-15, 15), vy: rnd(-15, 15), life: 1.2, size: 8, sizeEnd: 26, color: '#e8f0f6', alpha: 0.35, alphaEnd: 0, layer: 0 });
  }

  gust(angle) {
    for (let i = 0; i < 40; i++) {
      const x = rnd(0, 1280), y = rnd(0, 720);
      this.p.emit({ x, y, vx: Math.cos(angle) * rnd(180, 320), vy: Math.sin(angle) * rnd(180, 320), life: rnd(0.8, 1.6), size: rnd(1.5, 3), sizeEnd: rnd(1, 2), color: '#cfe0ee', alpha: 0.5, alphaEnd: 0, layer: 1 });
    }
  }

  dawnBurst() {
    for (let i = 0; i < 3; i++) this.p.emit({ x: this.n.beam.ox, y: this.n.beam.oy, life: 2.2 + i * 0.3, size: 50, sizeEnd: 1600, color: '#ffe9b0', alpha: 0.32, alphaEnd: 0, blend: 'lighter', layer: 1, ease: easeOutCubic });
  }

  floatText(x, y, text, color) { this.texts.push({ x, y, text, color, t: 0 }); }

  update(dt) { for (const t of this.texts) t.t += dt; this.texts = this.texts.filter((t) => t.t < 1.6); }
}
