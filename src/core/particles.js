// Système de particules simple et rapide (pool tableau, rendu canvas).

export class ParticleSystem {
  constructor(max = 1500) { this.list = []; this.max = max; }

  /**
   * @param {object} p {x,y,vx,vy,life,size,sizeEnd,color,img,alpha,alphaEnd,rot,rotV,gravity,drag,blend,layer}
   */
  emit(p) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({
      x: p.x, y: p.y, vx: p.vx || 0, vy: p.vy || 0,
      life: p.life || 1, age: 0,
      size: p.size ?? 6, sizeEnd: p.sizeEnd ?? p.size ?? 6,
      color: p.color || '#fff', img: p.img || null,
      alpha: p.alpha ?? 1, alphaEnd: p.alphaEnd ?? 0,
      rot: p.rot || 0, rotV: p.rotV || 0,
      gravity: p.gravity || 0, drag: p.drag ?? 0,
      blend: p.blend || 'source-over', layer: p.layer || 0,
      ease: p.ease || null,
    });
  }

  burst(n, fn) { for (let i = 0; i < n; i++) this.emit(fn(i)); }

  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.age += dt;
      if (p.age >= p.life) { l[i] = l[l.length - 1]; l.pop(); continue; }
      p.vy += p.gravity * dt;
      if (p.drag) { const f = Math.max(0, 1 - p.drag * dt); p.vx *= f; p.vy *= f; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.rotV * dt;
    }
  }

  render(ctx, layer = 0) {
    let lastBlend = 'source-over';
    ctx.save();
    for (const p of this.list) {
      if (p.layer !== layer) continue;
      let t = p.age / p.life;
      if (p.ease) t = p.ease(t);
      const a = p.alpha + (p.alphaEnd - p.alpha) * t;
      if (a <= 0.005) continue;
      const s = p.size + (p.sizeEnd - p.size) * t;
      if (p.blend !== lastBlend) { ctx.globalCompositeOperation = p.blend; lastBlend = p.blend; }
      ctx.globalAlpha = a;
      if (p.img) {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.drawImage(p.img, -s / 2, -s / 2, s, s);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  clear() { this.list.length = 0; }
  get count() { return this.list.length; }
}
