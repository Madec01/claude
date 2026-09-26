// Système de particules simple et rapide (réserve d'objets réutilisés, rendu canvas groupé).
//
// Trois soucis de téléphone réglés ici :
//  - aucune allocation par particule : les particules mortes retournent dans une réserve et resservent ;
//  - un plafond qui ne coûte rien : plein, on remplace la plus ancienne d'un tour de rôle, au lieu de décaler tout
//    le tableau (`shift`) à chaque émission ;
//  - un rendu sans save/restore par particule : une seule transformation posée par `setTransform`, les particules
//    hors de la vue sautées, et les additives (`lighter`) dessinées d'un bloc après les autres.
// Les particules d'ambiance (saison, vie des tuiles) passent en plus par un budget (`ambiance`) : sur téléphone ou
// quand les images ralentissent, la scène le baisse et l'ambiance s'éclaircit sans toucher aux gerbes de jeu.

const VIDE = null;

export class ParticleSystem {
  constructor(max = 1500) {
    this.list = []; this.max = max; this._tints = new Map();
    this._reserve = [];         // particules mortes, prêtes à resservir
    this._tour = 0;             // plafond atteint : prochaine particule remplacée
    this.ambiance = max;        // budget des particules d'ambiance (posé par la scène)
  }

  /** Image teintée (canvas hors écran mis en cache) pour les particules d'image colorées (fumée grise…). */
  tinted(img, color) {
    let parImg = this._tints.get(img);
    if (!parImg) { parImg = new Map(); this._tints.set(img, parImg); }
    let c = parImg.get(color);
    if (!c) { c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); parImg.set(color, c); }
    return c;
  }

  /** Reste-t-il de la place pour une particule d'ambiance ? (les gerbes de jeu, elles, passent toujours) */
  placeAmbiance() { return this.list.length < this.ambiance; }

  /**
   * @param {object} p {x,y,vx,vy,life,size,sizeEnd,color,img,alpha,alphaEnd,rot,rotV,gravity,drag,blend,layer}
   */
  emit(p) {
    const l = this.list; let o;
    if (l.length >= this.max) { this._tour = (this._tour + 1) % l.length; o = l[this._tour]; }
    else { o = this._reserve.pop() || {}; l.push(o); }
    o.x = p.x; o.y = p.y; o.vx = p.vx || 0; o.vy = p.vy || 0;
    o.life = p.life || 1; o.age = 0;
    o.size = p.size ?? 6; o.sizeEnd = p.sizeEnd ?? p.size ?? 6;
    o.color = p.color || '#fff';
    // l'image teintée est résolue une fois, à l'émission, pas à chaque image
    o.img = p.img ? (p.tint ? this.tinted(p.img, p.tint) : p.img) : VIDE;
    o.alpha = p.alpha ?? 1; o.alphaEnd = p.alphaEnd ?? 0;
    o.rot = p.rot || 0; o.rotV = p.rotV || 0;
    o.gravity = p.gravity || 0; o.drag = p.drag ?? 0;
    o.blend = p.blend || 'source-over'; o.layer = p.layer || 0;
    o.ease = p.ease || VIDE;
    o.tint = p.tint || VIDE;
    return o;
  }

  burst(n, fn) { for (let i = 0; i < n; i++) this.emit(fn(i)); }

  update(dt) {
    const l = this.list, r = this._reserve;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.age += dt;
      if (p.age >= p.life) { l[i] = l[l.length - 1]; l.pop(); p.img = VIDE; p.ease = VIDE; r.push(p); continue; }
      p.vy += p.gravity * dt;
      if (p.drag) { const f = Math.max(0, 1 - p.drag * dt); p.vx *= f; p.vy *= f; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.rotV * dt;
    }
  }

  render(ctx, layer = 0) {
    const l = this.list; if (!l.length) return;
    // la vue, en coordonnées des particules : les coins du canvas ramenés par l'inverse de la transformation courante
    const m = ctx.getTransform(), cv = ctx.canvas;
    let x0 = -Infinity, y0 = -Infinity, x1 = Infinity, y1 = Infinity;
    const det = m.a * m.d - m.b * m.c;
    if (cv && det && !m.b && !m.c) {   // caméra sans rotation (le cas du jeu) : une boîte suffit
      const ax = (0 - m.e) / m.a, bx = (cv.width - m.e) / m.a, ay = (0 - m.f) / m.d, by = (cv.height - m.f) / m.d;
      x0 = Math.min(ax, bx); x1 = Math.max(ax, bx); y0 = Math.min(ay, by); y1 = Math.max(ay, by);
    }
    const alpha0 = ctx.globalAlpha, blend0 = ctx.globalCompositeOperation, fill0 = ctx.fillStyle;
    let tourne = false;   // la transformation courante est-elle celle d'une particule tournée (à reposer avant la suivante) ?
    // deux passes : les particules ordinaires, puis les additives d'un bloc (un seul changement de mode de fusion)
    for (let passe = 0; passe < 2; passe++) {
      const additive = passe === 1; let vu = false, dernierFill = null;
      for (let i = 0; i < l.length; i++) {
        const p = l[i];
        if (p.layer !== layer || (p.blend === 'lighter') !== additive) continue;
        let t = p.age / p.life;
        if (p.ease) t = p.ease(t);
        const a = p.alpha + (p.alphaEnd - p.alpha) * t;
        if (a <= 0.005) continue;
        const s = p.size + (p.sizeEnd - p.size) * t; const h = s * 0.75;   // demi-diagonale arrondie : couvre la rotation
        if (p.x + h < x0 || p.x - h > x1 || p.y + h < y0 || p.y - h > y1) continue;
        if (!vu) { vu = true; ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over'; }
        ctx.globalAlpha = a;
        if (p.img) {
          if (p.rot) {
            const c = Math.cos(p.rot), sn = Math.sin(p.rot);
            ctx.setTransform(m.a * c + m.c * sn, m.b * c + m.d * sn, m.c * c - m.a * sn, m.d * c - m.b * sn, m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f);
            ctx.drawImage(p.img, -s / 2, -s / 2, s, s); tourne = true;
          } else {
            if (tourne) { ctx.setTransform(m); tourne = false; }
            ctx.drawImage(p.img, p.x - s / 2, p.y - s / 2, s, s);
          }
        } else {
          if (tourne) { ctx.setTransform(m); tourne = false; }
          if (p.color !== dernierFill) { ctx.fillStyle = p.color; dernierFill = p.color; }
          ctx.beginPath(); ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.setTransform(m); ctx.globalAlpha = alpha0; ctx.globalCompositeOperation = blend0; ctx.fillStyle = fill0;
  }

  clear() { for (const p of this.list) { p.img = VIDE; p.ease = VIDE; this._reserve.push(p); } this.list.length = 0; }
  get count() { return this.list.length; }
}
