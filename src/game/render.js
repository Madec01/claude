// Rendu d'une nuit : eau, terres, écueils, navires, lumière, brouillard, carte, particules, aube.
import { Assets } from '../core/assets.js';
import { BALANCE } from '../data/balance.js';
import { TAU, clamp, lerp, rnd, easeOutCubic } from '../core/math.js';

const W = 1280, H = 720;

export class NightRenderer {
  constructor(night) {
    this.n = night;
    this.time = 0;
    this.fogScale = 0.5; // le brouillard est rendu en demi-résolution (plus doux, 4× moins coûteux)
    this.fogCanvas = document.createElement('canvas'); this.fogCanvas.width = W * this.fogScale; this.fogCanvas.height = H * this.fogScale;
    this.fog = this.fogCanvas.getContext('2d');
    this.waterPattern = null;
    this.puffs = [];
    const fogKeys = Assets.keysStarting('fog_').length ? Assets.keysStarting('fog_') : Assets.keysStarting('whitepuff_');
    for (let i = 0; i < 30; i++) {
      this.puffs.push({ x: rnd(-100, W + 100), y: rnd(-100, H + 100), s: rnd(260, 520), a: rnd(0.10, 0.20), vx: rnd(-6, 6), vy: rnd(-4, 4), rot: rnd(0, TAU), rv: rnd(-0.05, 0.05), img: Assets.img(fogKeys[i % fogKeys.length] || ''), ph: rnd(0, TAU) });
    }
    // version assombrie des nappes pour la Bête (évite ctx.filter, coûteux)
    this.darkPuff = null;
    const src = this.puffs[0].img;
    if (src) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(20,26,36,0.85)'; g.fillRect(0, 0, c.width, c.height); this.darkPuff = c; }
    this.rain = [];
    for (let i = 0; i < 160; i++) this.rain.push({ x: rnd(0, W), y: rnd(0, H), l: rnd(10, 22), v: rnd(520, 760) });
    this.sandKeys = Assets.keysStarting('sand_');
    this.grassKeys = Assets.keysStarting('grass_');
    this.sandFull = this.pickKey(this.sandKeys, ['full', 'center', 'island', 'round']) || this.sandKeys[0];
    this.grassFull = this.pickKey(this.grassKeys, ['full', 'center', 'island', 'round']) || this.grassKeys[0];
    this.rockKeys = Assets.keysStarting('rock_');
    this.wreckKeys = Assets.keysStarting('wreck_');
    this.rockImgs = this.rockKeys.map((k) => this.darken(Assets.img(k), 'rgba(30,40,60,0.55)'));
    this.wreckImgs = this.wreckKeys.map((k) => this.darken(Assets.img(k), 'rgba(30,30,40,0.5)'));
    this.plantKeys = Assets.keysStarting('plant_');
    this.dockKeys = Assets.keysStarting('dock_');
    this.lightImg = Assets.img('light_01') || Assets.img('flare_01');
    this.pageImg = Assets.img('parchment_folded') || Assets.img('parchment_basic');
    this.fishes = [];
    const fishKeys = Assets.keysStarting('fish_');
    for (let i = 0; i < 7; i++) this.fishes.push({ x: rnd(0, W), y: rnd(0, H), a: rnd(0, TAU), v: rnd(10, 22), img: Assets.img(fishKeys[i % Math.max(1, fishKeys.length)] || ''), s: rnd(0.14, 0.22), t: rnd(0, 10) });
  }

  /** Copie assombrie d'une image (teinte nuit), calculée une fois. */
  darken(img, color) {
    if (!img) return null;
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  pickKey(keys, prefs) { for (const p of prefs) { const k = keys.find((x) => x.includes(p)); if (k) return k; } return null; }

  // ---------- Utilitaires ----------
  drawSprite(ctx, img, x, y, rot = 0, scale = 1, alpha = 1) {
    if (!img) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= alpha;
    ctx.drawImage(img, -img.width * scale / 2, -img.height * scale / 2, img.width * scale, img.height * scale);
    ctx.restore();
  }

  sector(ctx, ox, oy, angle, half, range) {
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, range, angle - half, angle + half); ctx.closePath();
  }

  // ---------- Rendu principal ----------
  render(ctx, alpha, frameDt) {
    const n = this.n;
    this.time += frameDt;
    const dawn = n.dawn;
    ctx.save();
    // tremblement
    ctx.translate(n.shake.x, n.shake.y); ctx.rotate(n.shake.rot);

    this.drawWater(ctx, dawn);
    this.drawLand(ctx);
    this.drawHazards(ctx, alpha);
    this.drawPages(ctx);
    this.drawShips(ctx, alpha, false);
    n.particles.render(ctx, 0);
    this.drawLight(ctx, dawn);
    this.drawFog(ctx, alpha, dawn);
    this.drawBeamGlow(ctx, dawn);
    this.drawLanterns(ctx, alpha);
    this.drawChart(ctx, alpha);
    n.particles.render(ctx, 1);
    this.drawWeather(ctx, frameDt, dawn);
    this.drawDawn(ctx, dawn);
    this.drawTexts(ctx);
    this.drawVignette(ctx);
    ctx.restore();
    if (n.state === 'intro') this.drawIntro(ctx);
  }

  drawWater(ctx, dawn) {
    const img = Assets.img('water');
    if (img && !this.waterPattern) this.waterPattern = ctx.createPattern(img, 'repeat');
    ctx.fillStyle = '#2f6f96';
    ctx.fillRect(0, 0, W, H);
    if (this.waterPattern) {
      ctx.save();
      const ox = (this.time * 6) % 128, oy = (this.time * 3) % 128;
      ctx.translate(ox, oy);
      ctx.fillStyle = this.waterPattern;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(-ox - 128, -oy - 128, W + 256, H + 256);
      ctx.restore();
    }
    // Faune discrète
    for (const f of this.fishes) {
      f.t += 0.016; f.x += Math.cos(f.a) * f.v * 0.016; f.y += Math.sin(f.a) * f.v * 0.016; f.a += Math.sin(f.t * 0.7) * 0.01;
      if (f.x < -40) f.x = W + 40; if (f.x > W + 40) f.x = -40; if (f.y < -40) f.y = H + 40; if (f.y > H + 40) f.y = -40;
      if (f.img && !this.n.hazards.onLand(f.x, f.y, 10)) this.drawSprite(ctx, f.img, f.x, f.y, f.a + Math.PI / 2, f.s, 0.35);
    }
    // Nuit : teinte multipliée
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const night = lerp(1, 0.55, dawn);
    ctx.fillStyle = `rgb(${Math.round(lerp(34, 150, dawn))}, ${Math.round(lerp(58, 140, dawn))}, ${Math.round(lerp(96, 150, dawn))})`;
    ctx.globalAlpha = night;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // reflets lents
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#9fd0ff';
    for (let i = 0; i < 6; i++) {
      const y = ((this.time * 12 + i * 137) % (H + 200)) - 100;
      ctx.beginPath(); ctx.ellipse((i * 331 + this.time * 20) % W, y, 260, 14, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawLand(ctx) {
    const n = this.n;
    const land = n.hazards.land;
    const sand = Assets.img('sand_full');
    const grass = Assets.img('grass_full');
    if (sand && !this.sandPattern) this.sandPattern = ctx.createPattern(sand, 'repeat');
    if (grass && !this.grassPattern) this.grassPattern = ctx.createPattern(grass, 'repeat');
    const union = (list, k) => { ctx.beginPath(); for (const c of list) { ctx.moveTo(c.x + c.r * k, c.y); ctx.arc(c.x, c.y, c.r * k, 0, TAU); } };
    // écume autour des côtes
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(this.time * 1.5) * 0.08;
    ctx.strokeStyle = '#eef6ff'; ctx.lineWidth = 10;
    union(land, 1); ctx.stroke();
    ctx.globalAlpha = 0.18; ctx.lineWidth = 22; union(land, 1); ctx.stroke();
    ctx.restore();
    // sable (texture Kenney)
    ctx.save();
    union(land, 1); ctx.clip();
    ctx.fillStyle = this.sandPattern || '#e8d9b5'; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(180,150,100,0.55)'; ctx.lineWidth = 3; union(land, 1); ctx.stroke(); ctx.restore();
    // herbe
    const grassy = land.filter((c) => c.grass);
    if (grassy.length) {
      ctx.save();
      union(grassy, 0.62); ctx.clip();
      ctx.fillStyle = this.grassPattern || '#6fbf5a'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(70,140,60,0.5)'; ctx.lineWidth = 3; union(grassy, 0.62); ctx.stroke(); ctx.restore();
    }
    // assombrissement des terres (nuit)
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(70,90,120,0.6)';
    union(land, 1.02); ctx.fill();
    ctx.restore();
    // plantes
    for (const p of n.map.plants || []) {
      const img = Assets.img(this.plantKeys[(p.k - 1) % Math.max(1, this.plantKeys.length)] || '');
      if (img) this.drawSprite(ctx, img, p.x, p.y, 0, 0.5, 0.85);
    }
    // quai
    const port = n.port;
    const dock = Assets.img('dock_1');
    ctx.save();
    ctx.translate(port.dockX, port.dockY); ctx.rotate(port.angle);
    if (dock) { ctx.drawImage(dock, -dock.width * 0.5 / 2, -dock.height * 0.5 / 2, dock.width * 0.5, dock.height * 0.5); }
    else { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-30, -14, 60, 28); }
    ctx.restore();
    // zone d'accostage (halo doux)
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(this.time * 2) * 0.05 + port.bellT * 0.4;
    const g = ctx.createRadialGradient(port.x, port.y, 10, port.x, port.y, port.zone);
    g.addColorStop(0, 'rgba(255,230,160,0.6)'); g.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(port.x, port.y, port.zone, 0, TAU); ctx.fill();
    ctx.restore();
    // lanterne du quai
    this.glow(ctx, port.dockX, port.dockY, 26, 'rgba(255,214,140,0.8)');
    // phare : tour ronde
    const tower = Assets.img('tower_round');
    const lh = n.map.lighthouse;
    if (tower) this.drawSprite(ctx, tower, lh.x, lh.y, 0, 78 / tower.width, 1);
    else { ctx.fillStyle = '#8a8f96'; ctx.beginPath(); ctx.arc(lh.x, lh.y, 30, 0, TAU); ctx.fill(); }
  }

  glow(ctx, x, y, r, color) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
  }

  drawHazards(ctx, alpha) {
    const n = this.n;
    for (const r of n.hazards.rocks) {
      const lit = n.beam.lightAt(r.x, r.y);
      const visible = r.revealed || r.emerged || lit > 0.05;
      if (!visible) continue;
      const img = this.rockImgs[(r.sprite - 1) % Math.max(1, this.rockImgs.length)];
      let a = r.submerged ? 0.35 : 1;
      if (r.submerged && !r.revealed) a = 0.0;
      ctx.save();
      if (r.submerged) ctx.globalAlpha = 0.45;
      if (img) this.drawSprite(ctx, img, r.x, r.y, r.rot, (r.r * 2.4) / img.width, a);
      else { ctx.fillStyle = '#5c6670'; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.fill(); }
      ctx.restore();
      if (r.emerged) { ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#e9f3ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, r.r + 5 + Math.sin(this.time * 3 + r.x) * 2, 0, TAU); ctx.stroke(); ctx.restore(); }
    }
    for (const w of n.hazards.wrecks) {
      const lit = n.beam.lightAt(w.x, w.y);
      if (!(w.revealed || lit > 0.05)) continue;
      const img = this.wreckImgs[(w.sprite - 1) % Math.max(1, this.wreckImgs.length)];
      if (img) this.drawSprite(ctx, img, w.x, w.y, w.rot, (w.r * 2.2) / img.width, 0.95);
      else { ctx.fillStyle = '#4a3320'; ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.fill(); }
    }
  }

  drawPages(ctx) {
    for (const p of this.n.pages.list) {
      if (!p.visible || p.read) continue;
      const bob = Math.sin(p.phase * 2) * 2;
      if (this.pageImg) this.drawSprite(ctx, this.pageImg, p.x, p.y + bob, p.rot, 30 / this.pageImg.width, 0.95);
      else { ctx.fillStyle = '#e9dcc0'; ctx.fillRect(p.x - 8, p.y - 10, 16, 20); }
    }
  }

  drawShips(ctx, alpha) {
    const n = this.n;
    for (const s of n.ships) {
      if (s.escaped) continue;
      const x = s.rx(alpha), y = s.ry(alpha);
      const img = s.image();
      let a = 1, sc = s.scale;
      if (s.state === 'wrecking') { const t = s.stateTime / BALANCE.ships.sinkTime; a = 1 - Math.pow(t, 2); sc *= 1 - t * 0.35; }
      if (s.state === 'sunk') continue;
      if (s.state === 'docked') a = Math.max(0, 1 - s.stateTime / 1.2);
      ctx.save();
      // ombre / halo de coque sur l'eau
      ctx.globalAlpha = 0.25 * a;
      ctx.fillStyle = '#04101c';
      ctx.beginPath(); ctx.ellipse(x + 3, y + 5, s.length * 0.28, s.length * 0.5, s.heading + Math.PI / 2, 0, TAU); ctx.fill();
      ctx.restore();
      const rot = s.heading + Math.PI / 2; // sprites orientés proue en haut
      const roll = s.speed > 5 ? Math.sin(this.time * 2.2 + s.id) * 0.03 : 0;
      this.drawSprite(ctx, img, x, y, rot + roll, sc, a);
      if (s.isYann) this.glow(ctx, x, y, 40 + Math.sin(this.time * 4) * 6, 'rgba(255,240,200,0.9)');
      if (s.state === 'wrecking' && s.stateTime > 0.2) { this.glow(ctx, x, y, 30, 'rgba(255,140,60,0.7)'); }
    }
  }

  drawLight(ctx, dawn) {
    const n = this.n, b = n.beam;
    if (b.intensity <= 0.02) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const I = b.intensity * (1 - dawn * 0.6);
    // cône large
    const g = ctx.createRadialGradient(b.ox, b.oy, 10, b.ox, b.oy, b.range);
    g.addColorStop(0, `rgba(255,236,190,${0.55 * I})`); g.addColorStop(0.5, `rgba(255,214,140,${0.28 * I})`); g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    this.sector(ctx, b.ox, b.oy, b.angle, b.halfAngle * 1.15, b.range); ctx.fill();
    // cœur du faisceau
    ctx.fillStyle = g; ctx.globalAlpha = 0.6;
    this.sector(ctx, b.ox, b.oy, b.angle, b.halfAngle * 0.6, b.range * 1.03); ctx.fill();
    ctx.restore();
    // lanterne du phare
    const flick = 0.9 + Math.sin(this.time * 17) * 0.05 + Math.sin(this.time * 5.3) * 0.05;
    this.glow(ctx, b.ox, b.oy, 70 * flick * b.intensity, `rgba(255,230,170,${0.9 * b.intensity})`);
    this.glow(ctx, b.ox, b.oy, 16, `rgba(255,255,230,${b.intensity})`);
    if (this.lightImg) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; this.drawSprite(ctx, this.lightImg, b.ox, b.oy, this.time * 0.3, 110 / this.lightImg.width, 0.5 * b.intensity); ctx.restore(); }
  }

  drawBeamGlow(ctx, dawn) {
    const b = this.n.beam;
    if (b.intensity <= 0.02) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const I = b.intensity * (1 - dawn * 0.5);
    const g = ctx.createRadialGradient(b.ox, b.oy, 6, b.ox, b.oy, b.range);
    g.addColorStop(0, `rgba(255,240,205,${0.42 * I})`); g.addColorStop(0.35, `rgba(255,224,160,${0.22 * I})`); g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.55; this.sector(ctx, b.ox, b.oy, b.angle, b.halfAngle * 1.25, b.range * 0.98); ctx.fill();
    ctx.globalAlpha = 0.75; this.sector(ctx, b.ox, b.oy, b.angle, b.halfAngle * 0.9, b.range); ctx.fill();
    ctx.globalAlpha = 0.9; this.sector(ctx, b.ox, b.oy, b.angle, b.halfAngle * 0.45, b.range * 1.02); ctx.fill();
    // poussière lumineuse dans le faisceau
    ctx.globalAlpha = 0.5 * I; ctx.fillStyle = '#fff6dc';
    for (let i = 0; i < 18; i++) {
      const t = ((this.time * 0.08 + i * 0.137) % 1);
      const d = 40 + t * (b.range - 60);
      const off = Math.sin(i * 7.3 + this.time * 0.6) * b.halfAngle * 0.8 * (d / b.range);
      const a = b.angle + off;
      ctx.beginPath(); ctx.arc(b.ox + Math.cos(a) * d, b.oy + Math.sin(a) * d, 1.2 + (1 - t) * 1.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawFog(ctx, alpha, dawn) {
    const n = this.n, b = n.beam, f = this.fog;
    const density = clamp(n.def.fog * (1 - dawn * 0.75), 0, 1);
    f.save();
    f.setTransform(this.fogScale, 0, 0, this.fogScale, 0, 0);
    f.globalCompositeOperation = 'source-over';
    f.clearRect(0, 0, W, H);
    f.fillStyle = `rgba(${Math.round(lerp(96, 200, dawn))},${Math.round(lerp(112, 205, dawn))},${Math.round(lerp(132, 210, dawn))},${density})`;
    f.fillRect(0, 0, W, H);
    // nappes
    const dt = 1 / 60;
    for (const p of this.puffs) {
      p.x += (p.vx + n.weather.wind.x * 0.25) * dt; p.y += (p.vy + n.weather.wind.y * 0.25) * dt; p.rot += p.rv * dt;
      if (p.x < -260) p.x = W + 200; if (p.x > W + 260) p.x = -200; if (p.y < -260) p.y = H + 200; if (p.y > H + 260) p.y = -200;
      if (!p.img) continue;
      f.save(); f.translate(p.x, p.y); f.rotate(p.rot); f.globalAlpha = p.a * density * (0.8 + 0.2 * Math.sin(this.time * 0.5 + p.ph));
      f.drawImage(p.img, -p.s / 2, -p.s / 2, p.s, p.s); f.restore();
    }
    // Bêtes : brume dense et sombre
    for (const be of n.beasts) {
      if (be.hidden) continue;
      const bx = be.px + (be.x - be.px) * alpha, by = be.py + (be.y - be.py) * alpha;
      f.save();
      for (const p of be.puffs) {
        const img = this.darkPuff; if (!img) break;
        const d = be.radius * p.d * (1 + Math.sin(p.phase) * 0.2);
        const x = bx + Math.cos(p.a + p.phase * 0.3) * d, y = by + Math.sin(p.a + p.phase * 0.3) * d;
        f.globalAlpha = 0.55 * be.density;
        f.translate(x, y); f.rotate(p.phase * 0.2); f.drawImage(img, -be.radius * p.s, -be.radius * p.s, be.radius * 2 * p.s, be.radius * 2 * p.s); f.setTransform(this.fogScale, 0, 0, this.fogScale, 0, 0);
      }
      f.restore();
    }
    // Perçage : rayon dégagé autour du phare
    f.globalCompositeOperation = 'destination-out';
    const cr = BALANCE.beam.clearRadius;
    const gc = f.createRadialGradient(b.ox, b.oy, 0, b.ox, b.oy, cr);
    gc.addColorStop(0, 'rgba(0,0,0,1)'); gc.addColorStop(0.6, 'rgba(0,0,0,0.9)'); gc.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = gc; f.beginPath(); f.arc(b.ox, b.oy, cr, 0, TAU); f.fill();
    // Perçage : cône du faisceau (bords doux)
    if (b.intensity > 0.02) {
      const gb = f.createRadialGradient(b.ox, b.oy, 0, b.ox, b.oy, b.range);
      gb.addColorStop(0, `rgba(0,0,0,${b.intensity})`); gb.addColorStop(0.75, `rgba(0,0,0,${0.85 * b.intensity})`); gb.addColorStop(1, 'rgba(0,0,0,0)');
      f.fillStyle = gb;
      const steps = [[1.2, 0.35], [1.0, 0.7], [0.75, 1]];
      for (const [k, a] of steps) { f.globalAlpha = a; this.sector(f, b.ox, b.oy, b.angle, b.halfAngle * k, b.range * (k > 1 ? 0.96 : 1)); f.fill(); }
      f.globalAlpha = 1;
    }
    // Zone du quai légèrement dégagée
    const p = n.port;
    const gp = f.createRadialGradient(p.dockX, p.dockY, 0, p.dockX, p.dockY, 70);
    gp.addColorStop(0, 'rgba(0,0,0,0.7)'); gp.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = gp; f.beginPath(); f.arc(p.dockX, p.dockY, 70, 0, TAU); f.fill();
    f.restore();
    ctx.drawImage(this.fogCanvas, 0, 0, W, H);
  }

  drawLanterns(ctx, alpha) {
    const n = this.n;
    for (const s of n.ships) {
      if (!s.active && s.state !== 'docking') continue;
      const x = s.rx(alpha), y = s.ry(alpha);
      const fl = 0.8 + Math.sin(this.time * 9 + s.lanternPhase) * 0.2;
      const a = clamp(1 - s.lit, 0.25, 1) * fl;
      const dimmed = s.lost ? 0.35 : 1;
      this.glow(ctx, x, y, 22 * dimmed, `rgba(255,214,130,${0.7 * a * dimmed})`);
      ctx.save(); ctx.globalAlpha = a * dimmed; ctx.fillStyle = '#fff1c8'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill(); ctx.restore();
    }
    for (const p of n.pages.list) {
      if (!p.visible || p.read) continue;
      const tw = 0.5 + 0.5 * Math.sin(this.time * 3 + p.phase * 5);
      this.glow(ctx, p.x, p.y, 14 + tw * 10, `rgba(242,177,52,${0.25 + p.glow * 0.5})`);
    }
  }

  drawChart(ctx, alpha) {
    const n = this.n;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Écueils relevés : marque à l'encre
    for (const r of [...n.hazards.rocks, ...n.hazards.wrecks]) {
      if (!r.revealed) continue;
      const fl = Math.max(0, r.flash);
      ctx.save();
      ctx.globalAlpha = 0.75 + fl * 0.25;
      ctx.strokeStyle = r.submerged ? 'rgba(120,200,255,0.9)' : '#f3e6c8';
      ctx.lineWidth = 1.5 + fl * 2;
      ctx.setLineDash(r.submerged ? [4, 4] : []);
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r + 6 + fl * 8, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      const k = r.r * 0.45;
      ctx.beginPath(); ctx.moveTo(r.x - k, r.y - k); ctx.lineTo(r.x + k, r.y + k); ctx.moveTo(r.x + k, r.y - k); ctx.lineTo(r.x - k, r.y + k); ctx.stroke();
      ctx.restore();
    }
    // Routes
    const dash = -this.time * 40;
    for (const s of n.ships) {
      if (!s.active || !s.hasRoute) continue;
      ctx.save();
      ctx.strokeStyle = s.guided ? 'rgba(123,211,137,0.85)' : 'rgba(243,230,200,0.6)';
      ctx.lineWidth = 2.5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = dash;
      ctx.beginPath(); ctx.moveTo(s.rx(alpha), s.ry(alpha));
      for (let i = s.routeIdx; i < s.route.length; i++) ctx.lineTo(s.route[i].x, s.route[i].y);
      ctx.stroke();
      ctx.setLineDash([]);
      const end = s.route[s.route.length - 1];
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(end.x, end.y, 4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // Tracé en cours
    const rt = n.routeTool;
    if (rt.drawing && rt.points.length) {
      ctx.save();
      ctx.strokeStyle = rt.valid ? 'rgba(255,240,200,0.95)' : 'rgba(217,79,61,0.95)';
      ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = dash;
      ctx.beginPath(); ctx.moveTo(rt.points[0].x, rt.points[0].y);
      for (const p of rt.points) ctx.lineTo(p.x, p.y);
      if (rt.valid) ctx.lineTo(n.mouse ? n.mouse.x : rt.points[rt.points.length - 1].x, n.mouse ? n.mouse.y : rt.points[rt.points.length - 1].y);
      ctx.stroke();
      if (!rt.valid && rt.blocker) {
        const o = rt.blocker.obj;
        ctx.setLineDash([]); ctx.strokeStyle = '#d94f3d'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(o.x, o.y, (o.r || 30) + 10, 0, TAU); ctx.stroke();
        const k = 10; ctx.beginPath(); ctx.moveTo(o.x - k, o.y - k); ctx.lineTo(o.x + k, o.y + k); ctx.moveTo(o.x + k, o.y - k); ctx.lineTo(o.x - k, o.y + k); ctx.stroke();
      }
      ctx.restore();
    }
    // Indicateurs sur navires
    for (const s of n.ships) {
      if (!s.active) continue;
      const x = s.rx(alpha), y = s.ry(alpha);
      const r = Math.max(22, s.radius + 10);
      if (rt.hover === s || rt.ship === s) { ctx.save(); ctx.strokeStyle = 'rgba(255,240,200,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -this.time * 30; ctx.beginPath(); ctx.arc(x, y, r + 4, 0, TAU); ctx.stroke(); ctx.restore(); }
      if (s.guided && !s.lost) { ctx.save(); ctx.globalAlpha = 0.6 * Math.min(1, s.guidedTimer); ctx.strokeStyle = '#7bd389'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore(); }
      if (s.holdTimer > 0) { ctx.save(); ctx.fillStyle = 'rgba(207,227,255,0.9)'; ctx.fillRect(x - 7, y - r - 16, 4, 12); ctx.fillRect(x + 3, y - r - 16, 4, 12); ctx.restore(); }
      if (s.anchored) { this.drawAnchor(ctx, x, y - r - 12); }
      if (s.state === 'waiting' && !s.anchored) { ctx.save(); ctx.font = '600 16px "Cormorant Garamond", serif'; ctx.fillStyle = '#f3e6c8'; ctx.textAlign = 'center'; ctx.fillText('…', x, y - r - 6); ctx.restore(); }
      if (s.lost) { ctx.save(); ctx.font = '700 22px "IM Fell English", serif'; ctx.fillStyle = `rgba(217,79,61,${0.6 + 0.4 * Math.sin(this.time * 6)})`; ctx.textAlign = 'center'; ctx.fillText('?', x, y - r - 8); ctx.restore(); }
      if (s.damage > 0 && s.damage < 3 && s.lit > 0.2) { ctx.save(); ctx.globalAlpha = 0.8; ctx.fillStyle = '#d94f3d'; for (let i = 0; i < s.damage; i++) { ctx.beginPath(); ctx.arc(x - 8 + i * 8, y + r + 8, 3, 0, TAU); ctx.fill(); } ctx.restore(); }
      // indicateur hors écran
      if (x < 0 || x > W || y < 0 || y > H) {
        const cx = clamp(x, 18, W - 18), cy = clamp(y, 18, H - 18);
        const a = Math.atan2(y - cy, x - cx);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.fillStyle = 'rgba(255,240,200,0.9)';
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    // Ondes de la corne
    for (const ring of n.horn.rings) {
      const t = ring.t / 1.6, e = easeOutCubic(t);
      ctx.save(); ctx.globalAlpha = (1 - t) * 0.7; ctx.strokeStyle = '#cfe3ff'; ctx.lineWidth = 3 - t * 2;
      ctx.beginPath(); ctx.arc(n.horn.ox, n.horn.oy, e * n.horn.radius, 0, TAU); ctx.stroke(); ctx.restore();
    }
    // Portée de la corne (discrète) quand prête et souris proche du phare
    if (n.horn.enabled && n.horn.ready && n.mouse && Math.hypot(n.mouse.x - n.horn.ox, n.mouse.y - n.horn.oy) < 60) {
      ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = '#cfe3ff'; ctx.setLineDash([6, 10]); ctx.beginPath(); ctx.arc(n.horn.ox, n.horn.oy, n.horn.radius, 0, TAU); ctx.stroke(); ctx.restore();
    }
    // Progression de lecture des pages
    for (const p of n.pages.list) {
      if (!p.visible || p.read || p.progress <= 0) continue;
      ctx.save(); ctx.strokeStyle = '#f2b134'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 22, -Math.PI / 2, -Math.PI / 2 + TAU * p.progress); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }

  drawAnchor(ctx, x, y) {
    ctx.save(); ctx.strokeStyle = '#f3e6c8'; ctx.fillStyle = '#f3e6c8'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y - 6, 2.5, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, y - 1); ctx.lineTo(x + 5, y - 1); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y + 3, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
  }

  drawWeather(ctx, frameDt, dawn) {
    const n = this.n;
    const rain = n.weather.rain;
    if (rain > 0.05) {
      ctx.save(); ctx.strokeStyle = `rgba(200,220,240,${0.35 * rain})`; ctx.lineWidth = 1.2;
      const wx = n.weather.wind.x * 0.6;
      ctx.beginPath();
      const count = Math.floor(this.rain.length * rain);
      for (let i = 0; i < count; i++) {
        const d = this.rain[i];
        d.y += d.v * frameDt; d.x += wx * frameDt * 4;
        if (d.y > H + 20) { d.y = -20; d.x = rnd(0, W); }
        if (d.x > W + 20) d.x = -20; if (d.x < -20) d.x = W + 20;
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + wx * 0.03, d.y + d.l);
      }
      ctx.stroke(); ctx.restore();
    }
    if (n.lightning > 0) { ctx.save(); ctx.fillStyle = `rgba(230,240,255,${n.lightning * 0.35})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (n.gustVisual > 0 && n.weather.stormEnabled) {
      ctx.save(); ctx.globalAlpha = n.gustVisual * 0.12; ctx.fillStyle = '#dfeaf5'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }

  drawDawn(ctx, dawn) {
    if (dawn <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(255,190,120,${0.35 * dawn})`); g.addColorStop(1, `rgba(255,220,180,${0.08 * dawn})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  drawTexts(ctx) {
    const fx = this.n.fx;
    ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 22px "IM Fell English", serif';
    for (const t of fx.texts) {
      const k = t.t / 1.6;
      ctx.globalAlpha = 1 - k * k; ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y - k * 40);
    }
    ctx.restore();
  }

  drawVignette(ctx) {
    ctx.save();
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,4,12,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawIntro(ctx) {
    const n = this.n;
    const t = clamp(1 - n.introTimer / 1.4, 0, 1);
    ctx.save(); ctx.fillStyle = `rgba(0,0,0,${0.7 * (1 - t)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
}
