// HUD d'une île (DOM) : saison, score, souffles, file de tuiles, poche, vœux, pouvoirs, notifications.
import { STORY } from '../data/story.js';
import { BALANCE } from '../data/balance.js';
import { FAMILY_COLORS, FAMILIES, affinity, RARE_AS } from '../data/tiles.js';
import { Save } from '../core/save.js';
import { deadlineLabel } from './wishes.js';
import { Assets } from '../core/assets.js';

const icon = (name, cls = '') => `<img class="hud-icon ${cls}" src="assets/img/ui/${name}.png" alt="">`;
const SEASON_ICON = { spring: 'icon_leaf', summer: 'icon_sun', autumn: 'icon_wind', winter: 'icon_snow' };

export class Hud {
  constructor(root, island, { title, onPause, onSwap, onDiscard, onBud, onUndo, onPocket, onPocketOut, onGardenPick, onPlace, onBudChoice, onBudCancel, onFullscreen, compact = false, mechanics }) {
    this.root = root; this.isl = island; this.mech = mechanics;
    const m = mechanics;
    root.innerHTML = `
      <div class="hud-top">
        <div class="hud-block hud-title"><div class="hud-island">${title}</div><div class="hud-arch" data-ref="arch"></div></div>
        <div class="hud-block hud-season" data-ref="seasonBox" title="Règle de la saison">
          <span class="season-icon" data-ref="seasonIcon"></span>
          <div class="season-txt"><b data-ref="seasonName">—</b><span class="season-rule" data-ref="seasonRule"></span><span class="season-weather hidden" data-ref="weather"></span></div>
          <div class="season-pips" data-ref="pips" title="Poses avant la prochaine saison"></div>
          <div class="season-pop hidden" data-ref="seasonPop"></div>
        </div>
        <div class="hud-block hud-score"><span class="hud-label">Points</span><b data-ref="score">0</b><span class="hud-stars" data-ref="starsLine" title="Seuils des étoiles"></span></div>
        <div class="hud-block hud-breaths ${m.has('breath') ? '' : 'hidden'}" title="Souffles"><span class="hud-label">Souffles</span><b data-ref="breaths">0</b></div>
        <div class="hud-block hud-left-tiles"><span class="hud-label">Tuiles</span><b data-ref="left">0</b></div>
        <button class="hud-pause" data-ref="pause" title="Pause (Échap)">${icon('icon_pause')}</button>
        <button class="hud-pause hud-log" data-ref="logBtn" title="Journal des événements (J)">${icon('icon_info')}<b class="log-badge hidden" data-ref="logBadge"></b></button>
        <button class="hud-pause hud-fs" data-ref="fs" title="Plein écran">${icon('icon_fullscreen')}</button>
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
        <div class="garden-pick ${island.garden ? '' : 'hidden'}" data-ref="gardenPick"><div class="queue-title" data-ref="pickTitle">Choisir</div><div class="gpick-list" data-ref="pickList"></div></div>
      </div>
      <div class="hud-wishes ${island.wishes.length ? '' : 'hidden'} ${compact ? 'collapsed' : ''}" data-ref="wishes"><button class="wish-toggle" data-ref="wishToggle" title="Afficher les vœux">Vœux <b data-ref="wishCount"></b></button><div class="queue-title">Vœux</div><div class="wish-list" data-ref="wishList"></div></div>
      <button class="hud-place hidden" data-ref="placeBtn"></button>
      <div class="hud-logpanel hidden" data-ref="logPanel"><div class="log-head"><span>Journal de l’île</span><button class="log-close" data-ref="logClose" title="Fermer">✕</button></div><div class="log-list" data-ref="logList"></div></div>
      <div class="tile-help hidden" data-ref="tileHelp"><div class="th-head"><b data-ref="thName"></b><button class="th-close" data-ref="thClose" title="Masquer la fiche (H)">✕</button></div><p class="th-blurb" data-ref="thBlurb"></p><div class="th-pairs" data-ref="thPairs"></div></div>
      <div class="hud-fauna" data-ref="fauna"></div>
      <div class="hud-notify" data-ref="notify"></div>
      <div class="hud-bud-hint hidden" data-ref="budHint"><span data-ref="budText">Choisis une prairie à transformer</span><button data-ref="budForest" title="Touche F">Forêt</button><button data-ref="budOrchard" title="Touche V">Verger</button><button data-ref="budCancel" title="Échap">Annuler</button></div>
    `;
    this.r = {};
    root.querySelectorAll('[data-ref]').forEach((el) => { this.r[el.dataset.ref] = el; });
    this.r.pause.addEventListener('click', (e) => { e.stopPropagation(); onPause(); });
    this.r.seasonBox.addEventListener('click', (e) => { e.stopPropagation(); this.toggleSeasonPop(); });
    this.r.pwDiscard.addEventListener('click', (e) => { e.stopPropagation(); onDiscard(); });
    this.r.pwBud.addEventListener('click', (e) => { e.stopPropagation(); onBud(); });
    this.r.pwUndo.addEventListener('click', (e) => { e.stopPropagation(); onUndo(); });
    this.r.fs.addEventListener('click', (e) => { e.stopPropagation(); onFullscreen && onFullscreen(); });
    this.log = []; this.unread = 0;
    this.r.thClose.addEventListener('click', (e) => { e.stopPropagation(); this.setTileHelp(false); });
    this.r.logBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleLog(); });
    this.r.logClose.addEventListener('click', (e) => { e.stopPropagation(); this.toggleLog(false); });
    this.r.placeBtn.addEventListener('click', (e) => { e.stopPropagation(); onPlace && onPlace(); });
    this.r.wishToggle.addEventListener('click', (e) => { e.stopPropagation(); this.r.wishes.classList.toggle('collapsed'); });
    this.r.budForest.addEventListener('click', (e) => { e.stopPropagation(); onBudChoice && onBudChoice('forest'); });
    this.r.budOrchard.addEventListener('click', (e) => { e.stopPropagation(); onBudChoice && onBudChoice('orchard'); });
    this.r.budCancel.addEventListener('click', (e) => { e.stopPropagation(); onBudCancel && onBudCancel(); });
    this.onSwap = onSwap; this.onPocket = onPocket; this.onPocketOut = onPocketOut; this.onGardenPick = onGardenPick;
    this.last = {};
    this.notes = [];
    this.arch = STORY.archipelagos[island.def.arch];
    if (this.arch) this.r.arch.textContent = `${this.arch.name} · ${this.arch.sub}`;
    this.buildGardenPick();
    this.renderQueue(); this.renderWishes(); this.renderFauna();
  }

  tileHtml(t, cls = '') {
    const seasonKey = `${t.family}_${t.variant || 1}_${this.isl.season}`;
    const alt = Assets.keysStarting(`${t.family}_`);
    const k = Assets.has(seasonKey) ? seasonKey : (alt.find((x) => x.endsWith(`_${this.isl.season}`)) || alt[0]);
    const name = (STORY.tiles[t.family] || {}).name || t.family;
    const src = k ? `assets/img/${Assets.manifest().images[k].file}` : '';
    const help = cls === 'current' ? '<button class="q-help" data-ref="qHelp" title="Fiche de la tuile (H)">?</button>' : '';
    return `<div class="qtile ${cls} ${t.rare ? 'rare' : ''}" style="--fam:${FAMILY_COLORS[t.family] || '#999'}" title="${name}${t.rare ? ' (rare)' : ''} — ${(STORY.tiles[t.family] || {}).blurb || ''}">${src ? `<img src="${src}" alt="${name}">` : ''}<span class="qname">${name}</span>${help}</div>`;
  }

  /** Règle de la saison (et météo) en surimpression : utile sur téléphone où la boîte de saison est réduite. */
  toggleSeasonPop(force) {
    const pop = this.r.seasonPop; const open = force !== undefined ? force : pop.classList.contains('hidden');
    if (open) {
      const isl = this.isl; const s0 = STORY.seasons[isl.season] || { name: isl.season, line: '', rule: '' };
      const rl = isl.rule && STORY.seasonRules[isl.rule] ? STORY.seasonRules[isl.rule] : null;
      const s = rl ? { name: isl.rulesVariable ? `${s0.name} · ${rl.name}` : s0.name, line: rl.line, rule: rl.rule } : s0;
      const w = isl.weather; const wt = w ? (STORY.weather[w.key] || {}) : null;
      pop.innerHTML = `<b>${s.name}</b><em>${s.line}</em><span>${s.rule}</span>${wt ? `<span class="pop-weather">${wt.name}${w.phase === 'active' ? ' (en cours)' : ` dans ${Math.max(0, w.at - isl.inSeason)} pose${w.at - isl.inSeason > 1 ? 's' : ''}`} : ${wt.rule}</span>` : ''}<i>Toucher pour fermer</i>`;
      clearTimeout(this._popT); this._popT = setTimeout(() => this.toggleSeasonPop(false), 9000);
    }
    pop.classList.toggle('hidden', !open);
  }

  /** Affiche ou masque la fiche. Masquer ne vaut que pour l'île en cours (le bouton ? ou la touche H la rouvrent) ; l'option des réglages reste le maître. */
  setTileHelp(on) { this.helpHidden = !on; if (on && Save.options.tileHelp === false) { Save.options.tileHelp = true; Save.save(); } this.last.helpId = null; this.renderTileHelp(); }

  /** Fiche de la tuile à poser : nom, effet, bonnes et mauvaises paires. */
  renderTileHelp() {
    const t = this.isl.current; const on = Save.options.tileHelp !== false && !this.helpHidden && !!t && !this.isl.ended;
    const qh = this.r.queueList.querySelector('.q-help'); if (qh) qh.classList.toggle('on', on);
    const id = on ? `${t.family}:${t.id}` : 'off';
    if (id === this.last.helpId) return; this.last.helpId = id;
    this.r.tileHelp.classList.toggle('hidden', !on);
    if (!on) return;
    const st = STORY.tiles[t.family] || { name: t.family, blurb: '' };
    this.r.thName.textContent = st.name + (t.rare ? ' (rare)' : ''); this.r.thBlurb.textContent = st.blurb || '';
    const name = (f) => (STORY.tiles[f] || {}).name || f;
    const good2 = [], good1 = [], bad = [];
    for (const g of FAMILIES) { if (this.isl.def.weights && !(this.isl.def.weights[g] > 0) && !this.isl.garden) continue; const v = affinity(t.family, g); if (v >= 2) good2.push(g); else if (v === 1) good1.push(g); else if (v < 0) bad.push(g); }
    const row = (lab, cls, list) => (list.length ? `<div><b>${lab}</b>${list.map((g) => `<span class="${cls}">${name(g)}</span>`).join('')}</div>` : '');
    this.r.thPairs.innerHTML = row('+2', 'p2', good2) + row('+1', 'p1', good1) + row('−1', 'pm', bad) + (t.rare && RARE_AS[t.family] && RARE_AS[t.family].length ? `<div><b>=</b><span class="p0">compte comme ${RARE_AS[t.family].map(name).join(', ')}</span></div>` : '');
  }

  renderQueue() {
    const q = this.isl.queue;
    const html = q.list.map((t, i) => this.tileHtml(t, i === 0 ? 'current' : 'next')).join('');
    if (html !== this.last.queue) {
      this.last.queue = html;
      this.r.queueList.innerHTML = html || '<div class="qempty">Plus de tuiles</div>';
      const qh = this.r.queueList.querySelector('.q-help'); if (qh) qh.addEventListener('click', (e) => { e.stopPropagation(); this.setTileHelp(this.helpHidden || Save.options.tileHelp === false); });
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
    const w = this.isl.def.weights || {};
    const fams = FAMILIES.filter((f) => this.isl.garden || (w[f] || 0) > 0);
    this.r.pickList.innerHTML = fams.map((f) => `<button class="gpick" data-fam="${f}" style="--fam:${FAMILY_COLORS[f]}">${(STORY.tiles[f] || {}).name || f}</button>`).join('');
    this.r.pickList.querySelectorAll('.gpick').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.onGardenPick(b.dataset.fam); }));
  }

  renderWishes() {
    if (!this.isl.wishes.length) return;
    const ctx = this.isl.wishCtx;
    const html = this.isl.wishes.map((w) => {
      const s = STORY.wishes[w.def.id] || { giver: '', title: w.def.id, text: '' };
      const pct = Math.min(100, Math.round((w.progress / w.target) * 100));
      return `<div class="wish ${w.status}"><div class="wish-head"><b>${s.title}</b><span class="wish-giver">${s.giver}</span></div><div class="wish-text">${s.text}</div><div class="wish-bar"><div style="width:${pct}%"></div></div><div class="wish-foot"><span>${w.progress} / ${w.target}</span><span class="wish-dl">${w.status === 'open' ? deadlineLabel(w, ctx, STORY) : w.status === 'done' ? 'exaucé' : `trop tard (pose ${w.failedAt || '?'})`}</span></div></div>`;
    }).join('');
    if (html !== this.last.wishes) { this.last.wishes = html; this.r.wishList.innerHTML = html; }
    const cnt = `${this.isl.wishes.filter((w) => w.status === 'done').length} / ${this.isl.wishes.length}`;
    if (cnt !== this.last.wishCount) { this.last.wishCount = cnt; this.r.wishCount.textContent = cnt; }
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
    const life = kind === 'season' || kind === 'gold' || kind === 'rare' || kind === 'wish' ? 6000 : 4200;
    setTimeout(() => el.remove(), life);
    while (this.r.notify.children.length > 4) this.r.notify.firstChild.remove();
    // journal consultable
    const isl = this.isl; const s = STORY.seasons[isl.season] || { name: isl.season };
    this.log.push({ text, kind, when: `${s.name} · pose ${isl.placements}` });
    if (this.log.length > 200) this.log.shift();
    if (this.r.logPanel.classList.contains('hidden')) { this.unread++; this.r.logBadge.textContent = this.unread > 99 ? '99+' : String(this.unread); this.r.logBadge.classList.remove('hidden'); }
    else this.renderLog();
  }

  toggleLog(force) {
    const open = force !== undefined ? force : this.r.logPanel.classList.contains('hidden');
    this.r.logPanel.classList.toggle('hidden', !open);
    this.r.logBtn.classList.toggle('active', open);
    if (open) { this.unread = 0; this.r.logBadge.classList.add('hidden'); this.renderLog(); }
  }

  renderLog() {
    const list = this.r.logList;
    list.innerHTML = this.log.length ? this.log.slice().reverse().map((n) => `<div class="log-item ${n.kind}"><span class="log-when">${n.when}</span><span class="log-text">${n.text}</span></div>`).join('') : '<div class="log-empty">Rien encore. Les événements de l’île s’inscriront ici.</div>';
  }

  setBudMode(on, hasTarget = false) {
    this.r.budHint.classList.toggle('hidden', !on); this.r.pwBud.classList.toggle('active', on);
    this.r.budText.textContent = hasTarget ? 'Cette prairie devient :' : 'Choisis une prairie à transformer';
    this.r.budForest.disabled = this.r.budOrchard.disabled = !hasTarget;
  }

  /** Bouton « Poser ici » (tactile) : total de la pose armée, ou null pour le masquer. */
  setPlaceButton(total, mode = 'place') {
    if (total === null || total === undefined) { if (!this.r.placeBtn.classList.contains('hidden')) this.r.placeBtn.classList.add('hidden'); return; }
    const txt = `${mode === 'fuse' ? 'Fusionner ici' : mode === 'build' ? 'Bâtir ici' : 'Poser ici'} · ${total >= 0 ? '+' : ''}${total}`;
    if (this.last.placeTxt !== txt) { this.last.placeTxt = txt; this.r.placeBtn.textContent = txt; this.r.placeBtn.classList.toggle('neg', total < 0); }
    this.r.placeBtn.classList.remove('hidden');
  }

  /** Déplie brièvement les vœux (mode compact) quand un vœu change. */
  flashWishes() { if (!this.r.wishes.classList.contains('collapsed')) return; this.r.wishes.classList.remove('collapsed'); clearTimeout(this._wishT); this._wishT = setTimeout(() => this.r.wishes.classList.add('collapsed'), 3500); }

  update() {
    const isl = this.isl, r = this.r;
    const s = STORY.seasons[isl.season] || { name: isl.season, rule: '' };
    const rl = isl.rule && STORY.seasonRules[isl.rule] ? STORY.seasonRules[isl.rule] : null;
    this.set('seasonName', rl && isl.rulesVariable ? `${s.name} · ${rl.name}` : s.name); this.set('seasonRule', rl ? rl.rule : s.rule);
    if (this.last.seasonKey !== isl.season) { this.last.seasonKey = isl.season; r.seasonIcon.innerHTML = icon(SEASON_ICON[isl.season] || 'icon_leaf'); r.seasonBox.className = `hud-block hud-season s-${isl.season}`; }
    // pips
    const pipHtml = isl.garden ? '' : Array.from({ length: isl.seasonLength }, (_, i) => `<i class="${i < isl.inSeason ? 'on' : ''}"></i>`).join('');
    if (pipHtml !== this.last.pips) { this.last.pips = pipHtml; r.pips.innerHTML = pipHtml; }
    // météo annoncée / active
    const w = isl.weather; const wt = w ? (STORY.weather[w.key] || { name: w.key, rule: '' }) : null;
    const wtxt = !w ? '' : w.phase === 'announced' ? `${wt.name} dans ${Math.max(0, w.at - isl.inSeason)} pose${w.at - isl.inSeason > 1 ? 's' : ''}` : `${wt.name} en cours`;
    if (wtxt !== this.last.weather) { this.last.weather = wtxt; r.weather.textContent = wtxt; r.weather.title = wt ? wt.rule : ''; r.weather.classList.toggle('hidden', !wtxt); r.weather.classList.toggle('active', !!w && w.phase === 'active'); }
    const choose = isl.garden || isl.freeChoice > 0;
    if (choose !== this.last.choose) { this.last.choose = choose; r.gardenPick.classList.toggle('hidden', !choose); }
    const pt = isl.garden ? 'Choisir' : `Marché : ${isl.freeChoice} choix`;
    if (choose && pt !== this.last.pickTitle) { this.last.pickTitle = pt; r.pickTitle.textContent = pt; }
    const bliz = isl.weatherActive && isl.weatherActive('blizzard');
    if (bliz !== this.last.bliz) { this.last.bliz = bliz; r.queueList.classList.toggle('blizzard', !!bliz); }
    this.set('score', String(isl.score));
    if (!isl.infinite && !isl.garden) {
      const th = isl.thresholds; const reached = th.filter((t) => isl.score >= t).length;
      const line = reached >= 3 ? '★★★' : `${'★'.repeat(reached)}☆ ${th[reached]}`;
      if (line !== this.last.starsLine) { this.last.starsLine = line; r.starsLine.textContent = line; r.starsLine.title = `Étoiles : ${th.join(' · ')} points${isl.wishes.length ? ' (la troisième exige tous les vœux)' : ''}`; }
    }
    this.set('breaths', String(isl.breaths));
    this.set('left', isl.infinite || isl.garden ? '∞' : String(isl.queue.remaining));
    r.pwDiscard.disabled = !isl.canDiscard();
    r.pwBud.disabled = isl.breaths < BALANCE.breaths.bud;
    r.pwUndo.disabled = !isl.canUndo();
    this.renderQueue(); this.renderWishes(); this.renderFauna(); this.renderTileHelp();
  }

  destroy() { this.root.innerHTML = ''; }
}
