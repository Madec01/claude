// HUD d'une île (DOM) : saison, score, souffles, file de tuiles, poche, vœux, pouvoirs, notifications.
import { STORY } from '../data/story.js';
import { BALANCE } from '../data/balance.js';
import { FAMILY_COLORS, FAMILIES } from '../data/tiles.js';
import { deadlineLabel } from './wishes.js';
import { Assets } from '../core/assets.js';

const icon = (name, cls = '') => `<img class="hud-icon ${cls}" src="assets/img/ui/${name}.png" alt="">`;
const SEASON_ICON = { spring: 'icon_leaf', summer: 'icon_sun', autumn: 'icon_wind', winter: 'icon_snow' };

export class Hud {
  constructor(root, island, { title, onPause, onSwap, onDiscard, onBud, onUndo, onPocket, onPocketOut, onGardenPick, mechanics }) {
    this.root = root; this.isl = island; this.mech = mechanics;
    const m = mechanics;
    root.innerHTML = `
      <div class="hud-top">
        <div class="hud-block hud-title"><div class="hud-island">${title}</div><div class="hud-arch" data-ref="arch"></div></div>
        <div class="hud-block hud-season" data-ref="seasonBox">
          <span class="season-icon" data-ref="seasonIcon"></span>
          <div class="season-txt"><b data-ref="seasonName">—</b><span class="season-rule" data-ref="seasonRule"></span></div>
          <div class="season-pips" data-ref="pips" title="Poses avant la prochaine saison"></div>
        </div>
        <div class="hud-block hud-score"><span class="hud-label">Points</span><b data-ref="score">0</b></div>
        <div class="hud-block hud-breaths ${m.has('breath') ? '' : 'hidden'}" title="Souffles"><span class="hud-label">Souffles</span><b data-ref="breaths">0</b></div>
        <div class="hud-block hud-left-tiles"><span class="hud-label">Tuiles</span><b data-ref="left">0</b></div>
        <button class="hud-pause" data-ref="pause" title="Pause (Échap)">${icon('icon_pause')}</button>
      </div>
      <div class="hud-queue" data-ref="queue">
        <div class="queue-title">À poser</div>
        <div class="queue-list" data-ref="queueList"></div>
        <div class="pocket ${this.isl.queue.pocketSize ? '' : 'hidden'}" data-ref="pocket"><div class="queue-title">Poche</div><div class="pocket-list" data-ref="pocketList"></div></div>
        <div class="powers ${m.has('breath') ? '' : 'hidden'}" data-ref="powers">
          <button class="pw" data-ref="pwDiscard" title="Défausser la tuile (X)">${icon('icon_cross')}<span>Défausser</span><em>${BALANCE.breaths.discard}</em></button>
          <button class="pw" data-ref="pwBud" title="Bourgeon : transformer une prairie (B)">${icon('icon_leaf')}<span>Bourgeon</span><em>${BALANCE.breaths.bud}</em></button>
          <button class="pw" data-ref="pwUndo" title="Souvenir : annuler la dernière pose (Z)">${icon('icon_return')}<span>Souvenir</span><em data-ref="undoCost">${island.undoCost}</em></button>
        </div>
        <div class="garden-pick ${island.garden ? '' : 'hidden'}" data-ref="gardenPick"></div>
      </div>
      <div class="hud-wishes ${island.wishes.length ? '' : 'hidden'}" data-ref="wishes"><div class="queue-title">Vœux</div><div class="wish-list" data-ref="wishList"></div></div>
      <div class="hud-fauna" data-ref="fauna"></div>
      <div class="hud-notify" data-ref="notify"></div>
      <div class="hud-bud-hint hidden" data-ref="budHint">Choisis une prairie à transformer · <b>F</b> forêt · <b>V</b> verger · <b>Échap</b> annuler</div>
    `;
    this.r = {};
    root.querySelectorAll('[data-ref]').forEach((el) => { this.r[el.dataset.ref] = el; });
    this.r.pause.addEventListener('click', (e) => { e.stopPropagation(); onPause(); });
    this.r.pwDiscard.addEventListener('click', (e) => { e.stopPropagation(); onDiscard(); });
    this.r.pwBud.addEventListener('click', (e) => { e.stopPropagation(); onBud(); });
    this.r.pwUndo.addEventListener('click', (e) => { e.stopPropagation(); onUndo(); });
    this.onSwap = onSwap; this.onPocket = onPocket; this.onPocketOut = onPocketOut; this.onGardenPick = onGardenPick;
    this.last = {};
    this.notes = [];
    this.arch = STORY.archipelagos[island.def.arch];
    if (this.arch) this.r.arch.textContent = `${this.arch.name} · ${this.arch.sub}`;
    if (island.garden) this.buildGardenPick();
    this.renderQueue(); this.renderWishes(); this.renderFauna();
  }

  tileHtml(t, cls = '') {
    const seasonKey = `${t.family}_${t.variant || 1}_${this.isl.season}`;
    const alt = Assets.keysStarting(`${t.family}_`);
    const k = Assets.has(seasonKey) ? seasonKey : (alt.find((x) => x.endsWith(`_${this.isl.season}`)) || alt[0]);
    const name = (STORY.tiles[t.family] || {}).name || t.family;
    const src = k ? `assets/img/${Assets.manifest().images[k].file}` : '';
    return `<div class="qtile ${cls} ${t.rare ? 'rare' : ''}" style="--fam:${FAMILY_COLORS[t.family] || '#999'}" title="${name}${t.rare ? ' (rare)' : ''} — ${(STORY.tiles[t.family] || {}).blurb || ''}">${src ? `<img src="${src}" alt="${name}">` : ''}<span class="qname">${name}</span></div>`;
  }

  renderQueue() {
    const q = this.isl.queue;
    const html = q.list.map((t, i) => this.tileHtml(t, i === 0 ? 'current' : 'next')).join('');
    if (html !== this.last.queue) {
      this.last.queue = html;
      this.r.queueList.innerHTML = html || '<div class="qempty">Plus de tuiles</div>';
      this.r.queueList.querySelectorAll('.qtile').forEach((el, i) => {
        if (i === 0) { if (this.isl.canPocket()) { el.classList.add('pocketable'); el.addEventListener('click', (e) => { e.stopPropagation(); this.onPocket(); }); el.title += ' — clic : mettre en poche (P)'; } }
        else if (this.mech.has('breath')) { el.classList.add('swappable'); el.addEventListener('click', (e) => { e.stopPropagation(); this.onSwap(i); }); el.title += ` — clic : échanger (${BALANCE.breaths.swap} souffle)`; }
      });
    }
    const ph = q.pocket.map((t) => this.tileHtml(t, 'pocketed')).join('');
    if (ph !== this.last.pocket) {
      this.last.pocket = ph;
      this.r.pocketList.innerHTML = ph || '<div class="qempty small">vide</div>';
      this.r.pocketList.querySelectorAll('.qtile').forEach((el, i) => { el.addEventListener('click', (e) => { e.stopPropagation(); this.onPocketOut(i); }); el.title += ' — clic : reprendre'; });
    }
  }

  buildGardenPick() {
    const fams = FAMILIES;
    this.r.gardenPick.innerHTML = '<div class="queue-title">Choisir</div>' + fams.map((f) => `<button class="gpick" data-fam="${f}" style="--fam:${FAMILY_COLORS[f]}">${(STORY.tiles[f] || {}).name || f}</button>`).join('');
    this.r.gardenPick.querySelectorAll('.gpick').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.onGardenPick(b.dataset.fam); }));
  }

  renderWishes() {
    if (!this.isl.wishes.length) return;
    const ctx = this.isl.wishCtx;
    const html = this.isl.wishes.map((w) => {
      const s = STORY.wishes[w.def.id] || { giver: '', title: w.def.id, text: '' };
      const pct = Math.min(100, Math.round((w.progress / w.target) * 100));
      return `<div class="wish ${w.status}"><div class="wish-head"><b>${s.title}</b><span class="wish-giver">${s.giver}</span></div><div class="wish-text">${s.text}</div><div class="wish-bar"><div style="width:${pct}%"></div></div><div class="wish-foot"><span>${w.progress} / ${w.target}</span><span class="wish-dl">${w.status === 'open' ? deadlineLabel(w, ctx, STORY) : w.status === 'done' ? 'exaucé' : 'passé'}</span></div></div>`;
    }).join('');
    if (html !== this.last.wishes) { this.last.wishes = html; this.r.wishList.innerHTML = html; }
  }

  renderFauna() {
    const counts = {};
    for (const a of this.isl.fauna.values()) counts[a.species] = (counts[a.species] || 0) + 1;
    const html = Object.entries(counts).map(([sp, n]) => `<span class="fauna-chip" title="${(STORY.fauna[sp] || {}).habitat || ''}"><img src="assets/img/fauna/fauna_${sp}.png" alt="">${(STORY.fauna[sp] || {}).name || sp}${n > 1 ? ` ×${n}` : ''}</span>`).join('');
    if (html !== this.last.fauna) { this.last.fauna = html; this.r.fauna.innerHTML = html; }
  }

  set(key, value) { if (this.last[key] !== value) { this.last[key] = value; this.r[key].textContent = value; } }

  notify(text, kind = 'info') {
    const el = document.createElement('div'); el.className = `hud-note ${kind}`; el.textContent = text;
    this.r.notify.appendChild(el);
    setTimeout(() => el.remove(), 3400);
    while (this.r.notify.children.length > 4) this.r.notify.firstChild.remove();
  }

  setBudMode(on) { this.r.budHint.classList.toggle('hidden', !on); this.r.pwBud.classList.toggle('active', on); }

  update() {
    const isl = this.isl, r = this.r;
    const s = STORY.seasons[isl.season] || { name: isl.season, rule: '' };
    this.set('seasonName', s.name); this.set('seasonRule', s.rule);
    if (this.last.seasonKey !== isl.season) { this.last.seasonKey = isl.season; r.seasonIcon.innerHTML = icon(SEASON_ICON[isl.season] || 'icon_leaf'); r.seasonBox.className = `hud-block hud-season s-${isl.season}`; }
    // pips
    const pipHtml = isl.garden ? '' : Array.from({ length: isl.seasonLength }, (_, i) => `<i class="${i < isl.inSeason ? 'on' : ''}"></i>`).join('');
    if (pipHtml !== this.last.pips) { this.last.pips = pipHtml; r.pips.innerHTML = pipHtml; }
    this.set('score', String(isl.score));
    this.set('breaths', String(isl.breaths));
    this.set('left', isl.infinite || isl.garden ? '∞' : String(isl.queue.remaining));
    r.pwDiscard.disabled = !isl.canDiscard();
    r.pwBud.disabled = isl.breaths < BALANCE.breaths.bud;
    r.pwUndo.disabled = !isl.canUndo();
    this.renderQueue(); this.renderWishes(); this.renderFauna();
  }

  destroy() { this.root.innerHTML = ''; }
}
