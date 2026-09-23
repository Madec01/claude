// HUD d'une île (DOM) : saison, score, souffles, file de tuiles, poche, vœux, pouvoirs, notifications.
import { STAGE } from '../core/stage.js';
import { STORY } from '../data/story.js';
import { BALANCE } from '../data/balance.js';
import { TALLY_LABELS } from '../ui/results.js';
import { FAMILY_COLORS, FAMILIES, affinity, RARE_AS } from '../data/tiles.js';
import { Save } from '../core/save.js';
import { deadlineLabel } from './wishes.js';
import { Assets } from '../core/assets.js';
import { AudioSys } from '../core/audio.js';
import { RARE_DECOR, spriteKey } from './decor.js';

const icon = (name, cls = '') => `<img class="hud-icon ${cls}" src="assets/img/ui/${name}.png" alt="">`;
/** Les messages qui passent aussi dans le ruban (les autres ne vont qu'au journal), avec leur couleur. */
const RIBBON_KINDS = { warn: '#b5523f', wish: '#8e6bb5', gold: '#b8862b', rare: '#8a6fb5', special: '#2f7f74' };
const SEASON_ICON = { spring: 'icon_leaf', summer: 'icon_sun', autumn: 'icon_wind', winter: 'icon_snow' };

export class Hud {
  constructor(root, island, { title, onPause, onPick, onDiscard, onUndo, onGardenPick, onPlace, compact = false, mechanics }) {
    this.root = root; this.isl = island; this.mech = mechanics;
    const m = mechanics;
    root.innerHTML = `
      <div class="hud-top" data-ref="top">
        <div class="hud-block hud-season" data-ref="seasonBox" title="Règle de la saison">
          <span class="season-icon" data-ref="seasonIcon"></span>
          <div class="season-txt"><b data-ref="seasonName">—</b><span class="season-rule" data-ref="seasonRule"></span></div>
          <div class="season-pips" data-ref="pips" title="Poses avant la prochaine saison"></div>
          <div class="season-pop hidden" data-ref="seasonPop"></div>
        </div>
        <div class="hud-block hud-score"><span class="hud-label">Points</span><b data-ref="score">0</b><span class="score-delta" data-ref="scoreDelta"></span><span class="hud-stars" data-ref="starsLine" title="Seuils des étoiles"></span><div class="score-pop hidden" data-ref="scorePop"></div></div>
        <div class="hud-block hud-breaths ${m.has('breath') ? '' : 'hidden'}" title="Souffles"><span class="hud-label">Souffles</span><b data-ref="breaths">0</b></div>
        <button class="hud-pause" data-ref="pause" title="Pause (Échap) : journal, plein écran, options">${icon('icon_pause')}</button>
      </div>
      <div class="hud-queue" data-ref="queue">
        <div class="queue-title"><span>${island.handOn ? 'Main · choisis ta tuile' : 'À poser'}</span><span class="queue-left" data-ref="left" title="Tuiles qui restent"></span></div>
        <div class="queue-list" data-ref="queueList"></div>
        <div class="powers ${m.has('breath') ? '' : 'hidden'}" data-ref="powers">
          <button class="pw" data-ref="pwDiscard" title="Défausser la tuile (X)">${icon('icon_cross')}<span>Défausser</span><em>${BALANCE.breaths.discard}</em></button>
          <button class="pw" data-ref="pwUndo" title="Annuler la dernière pose (Z), une fois par saison">${icon('icon_return')}<span>Annuler</span><em data-ref="undoCost">${BALANCE.breaths.undo}</em></button>
        </div>
        <div class="garden-pick ${island.garden ? '' : 'hidden'}" data-ref="gardenPick"><div class="queue-title" data-ref="pickTitle">Choisir</div><div class="gpick-list" data-ref="pickList"></div></div>
      </div>
      <div class="hud-wishes ${island.wishes.length ? '' : 'hidden'} ${compact ? 'collapsed' : ''}" data-ref="wishes"><button class="wish-toggle" data-ref="wishToggle" title="Afficher les vœux">Vœux <b data-ref="wishCount"></b></button><div class="queue-title">Vœux</div><div class="wish-list" data-ref="wishList"></div></div>
      <button class="hud-place hidden" data-ref="placeBtn"></button>
      <div class="hud-logpanel hidden" data-ref="logPanel"><div class="log-head"><span>Journal de l’île</span><button class="log-close" data-ref="logClose" title="Fermer">✕</button></div><div class="log-list" data-ref="logList"></div></div>
      <div class="tile-help hidden" data-ref="tileHelp"><div class="th-head"><b data-ref="thName"></b><button class="th-close" data-ref="thClose" title="Masquer la fiche (H)">✕</button></div><p class="th-blurb" data-ref="thBlurb"></p><div class="th-pairs" data-ref="thPairs"></div></div>
      <div class="hud-fauna" data-ref="fauna"></div>
      <div class="hud-ribbon" data-ref="ribbon" aria-live="polite"></div>
    `;
    this.r = {};
    root.querySelectorAll('[data-ref]').forEach((el) => { this.r[el.dataset.ref] = el; });
    this.r.pause.addEventListener('click', (e) => { e.stopPropagation(); onPause(); });
    this.r.seasonBox.addEventListener('click', (e) => { e.stopPropagation(); this.toggleSeasonPop(); });
    // le pourquoi des points : un toucher sur le compteur ouvre le détail par source
    { const box = this.r.score.parentNode; box.title = 'D’où viennent les points (toucher)'; box.style.cursor = 'pointer'; box.addEventListener('click', (e) => { e.stopPropagation(); this.toggleScorePop(); }); }
    this.r.pwDiscard.addEventListener('click', (e) => { e.stopPropagation(); onDiscard(); });
    this.r.pwUndo.addEventListener('click', (e) => { e.stopPropagation(); onUndo(); });
    this.log = []; this.unread = 0;
    this.r.thClose.addEventListener('click', (e) => { e.stopPropagation(); this.setTileHelp(false); });
    // Sur téléphone la fiche est repliée à deux lignes : un appui la déplie en entier (les tuiles bavardes — l'eau, la
    // lande — disent leurs effets passifs en cinq lignes). Le choix tient jusqu'à la fin de l'île, pas au-delà.
    this.r.tileHelp.addEventListener('click', (e) => { e.stopPropagation(); this.helpOpen = !this.helpOpen; this.r.tileHelp.classList.toggle('open', this.helpOpen); });
    this.r.logClose.addEventListener('click', (e) => { e.stopPropagation(); this.toggleLog(false); });
    this.r.placeBtn.addEventListener('click', (e) => { e.stopPropagation(); onPlace && onPlace(); });
    this.r.wishToggle.addEventListener('click', (e) => { e.stopPropagation(); this.r.wishes.classList.toggle('collapsed'); });
    this.onPick = onPick || (() => {}); this.onGardenPick = onGardenPick;
    this.last = {};
    this.notes = [];
    this.buildGardenPick();
    this.renderQueue(); this.renderWishes(); this.renderFauna();
  }

  tileHtml(t, cls = '') {
    const seasonKey = `${t.family}_${t.variant || 1}_${this.isl.season}`;
    const alt = Assets.keysStarting(`${t.family}_`);
    const k = Assets.has(seasonKey) ? seasonKey : (alt.find((x) => x.endsWith(`_${this.isl.season}`)) || alt[0]);
    const name = (STORY.tiles[t.family] || {}).name || t.family;
    let src = k ? `assets/img/${Assets.manifest().images[k].file}` : '';
    // une rare sans image de tuile (la ruche, le menhir) se montre par son objet principal
    if (!k && RARE_DECOR[t.family]) { const d = RARE_DECOR[t.family][0]; const sk = spriteKey(d.tpl, this.isl.season); const im = sk && Assets.manifest().images[sk]; src = im ? `assets/img/${im.file}` : ''; }
    const help = cls === 'current' ? '<button class="q-help" data-ref="qHelp" title="Fiche de la tuile (H)">?</button>' : '';
    return `<div class="qtile ${cls} ${t.rare ? 'rare' : ''}" style="--fam:${FAMILY_COLORS[t.family] || '#999'}" title="${name}${t.rare ? ' (rare)' : ''} — ${(STORY.tiles[t.family] || {}).blurb || ''}">${src ? `<img src="${src}" alt="${name}">` : ''}<span class="qname">${name}${(t.level || 1) >= 2 ? ` <i class="qlvl">niv. ${t.level}</i>` : ''}</span>${help}</div>`;
  }

  /** D'où viennent les points : cumul par source, en surimpression sous le compteur. */
  toggleScorePop(force) {
    const pop = this.r.scorePop; const open = force !== undefined ? force : pop.classList.contains('hidden');
    if (open) { this.renderScorePop(); clearTimeout(this._scorePopT); this._scorePopT = setTimeout(() => this.toggleScorePop(false), 9000); }
    pop.classList.toggle('hidden', !open);
  }
  renderScorePop() {
    const isl = this.isl; const t = isl.tally || {}; const total = Object.values(t).reduce((a, b) => a + Math.max(0, b), 0) || 1;
    const rows = Object.entries(t).filter(([, v]) => v).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="why-row ${v < 0 ? 'neg' : ''}"><span>${TALLY_LABELS[k] || k}</span><i style="width:${Math.round(Math.max(0, v) / total * 100)}%"></i><b>${v > 0 ? '+' : ''}${v}</b></div>`).join('');
    const bm = isl.bestMove; const fam = bm ? ((STORY.tiles[bm.family] || {}).name || bm.family).toLowerCase() : '';
    this.r.scorePop.innerHTML = `<b>D’où viennent les points</b>${rows || '<span>Rien encore : pose une tuile.</span>'}${bm ? `<em>Meilleur coup : +${bm.pts}, ${fam}</em>` : ''}<i class="pop-hint">Toucher pour fermer</i>`;
    this._scorePopScore = isl.score;
  }
  /** Règle de la saison (ou sa surprise) en surimpression : utile sur téléphone où la boîte de saison est réduite. */
  toggleSeasonPop(force) {
    const pop = this.r.seasonPop; const open = force !== undefined ? force : pop.classList.contains('hidden');
    if (open) {
      const isl = this.isl; const s0 = STORY.seasons[isl.season] || { name: isl.season, line: '', rule: '' };
      const rl = isl.rule && STORY.seasonRules[isl.rule] ? STORY.seasonRules[isl.rule] : null;
      const s = rl ? { name: isl.rulesVariable ? `${s0.name} · ${rl.name}` : s0.name, line: rl.line, rule: rl.rule } : s0;
      pop.innerHTML = `<b>${s.name}</b><em>${s.line}</em><span>${s.rule}</span><i>Toucher pour fermer</i>`;
      { const cl = isl.climate && isl.climate.id !== 'temperate' ? STORY.climates[isl.climate.id] : null; if (cl) pop.insertAdjacentHTML('beforeend', `<div class="pop-climate"><b>${cl.name}</b> — <em>${cl.line}</em><br>✓ ${cl.plus}<br>✗ ${cl.minus}</div>`); }
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
    this.r.tileHelp.classList.toggle('open', !!this.helpOpen);
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
    // « sur une tuile » : la tuile du moment peut aussi se poser SUR une tuile déjà posée (bâtir, fusionner,
    // un ouvrage, réparer une friche). Rien ne le disait, et la mécanique passait inaperçue.
    const cibles = this.isl.buildTargets ? this.isl.buildTargets() : [];
    const rang = { fuse: 3, restore: 1, build: 0 };
    const genre = cibles.length ? cibles.reduce((a, c) => (rang[c.kind] > rang[a] ? c.kind : a), 'build') : null;
    const ONTO = { build: ['bâtir', 'Peut se poser sur une tuile de la même famille : elle monte de niveau (touche : viser la tuile)'], fuse: ['fusion', 'Peut se poser sur une tuile d’une autre famille : une recette existe'], restore: ['réparer', 'Peut remettre une friche en état'] };
    const html = q.list.map((t, i) => this.tileHtml(t, i === 0 ? 'current' : 'next')).join('');
    const cle = `${html}|${genre || ''}|${cibles.length}`;   // la pastille dépend du plateau, pas seulement de la file
    if (cle !== this.last.queue) {
      this.last.queue = cle;
      this.r.queueList.innerHTML = html || '<div class="qempty">Plus de tuiles</div>';
      const qh = this.r.queueList.querySelector('.q-help'); if (qh) qh.addEventListener('click', (e) => { e.stopPropagation(); this.setTileHelp(this.helpHidden || Save.options.tileHelp === false); });
      this.r.queueList.querySelectorAll('.qtile').forEach((el, i) => {
        // la tuile du moment se range d'une touche ; sans souris, rien ne le disait : une pastille le montre maintenant
        if (i === 0 && genre && ONTO[genre]) {
          el.classList.add('onto', `onto-${genre}`);
          el.insertAdjacentHTML('beforeend', `<i class="q-onto" title="${ONTO[genre][1]}">${ONTO[genre][0]} · ${cibles.length}</i>`);
        }
        if (i > 0 && this.isl.handOn) { el.classList.add('pickable'); el.addEventListener('click', (e) => { e.stopPropagation(); this.onPick(i); }); el.title += ' — clic : jouer cette tuile'; }
      });
    }
    const dc = this.isl.discardCost ? this.isl.discardCost() : BALANCE.breaths.discard;
    if (dc !== this.last.discardCost) { this.last.discardCost = dc; const em = this.r.pwDiscard.querySelector('em'); if (em) em.textContent = String(dc); this.r.pwDiscard.classList.toggle('free', dc === 0); }
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

  /**
   * Ruban des commentaires : les mots (« Coup de maître ! », séries, verdicts d'ouvrage, de fusion, de construction)
   * s'affichent ici, sous la boîte de saison, un à la fois. Les chiffres restent sur la case.
   */
  ribbon(text, color = '#2b2a26', ms = 1500, cls = '') {
    this._ribbonQ = this._ribbonQ || []; this._ribbonQ.push({ text, color, ms, cls });
    if (this._ribbonQ.length > 2) this._ribbonQ.splice(0, this._ribbonQ.length - 2);   // on ne garde que les deux derniers : un mot ne traîne jamais
    if (!this._ribbonBusy) this._ribbonNext();
  }
  _ribbonNext() {
    const it = this._ribbonQ.shift(); if (!it) { this._ribbonBusy = false; return; }
    this._ribbonBusy = true; const r = this.r.ribbon;
    r.textContent = it.text; r.style.setProperty('--rc', it.color); r.className = `hud-ribbon on ${it.cls}`;
    clearTimeout(this._ribbonT); this._ribbonT = setTimeout(() => { r.classList.remove('on'); setTimeout(() => this._ribbonNext(), 220); }, it.ms);
  }

  /** Retient `n` points hors du compteur (ils sont en vol) ; `release` les y verse un à un, avec un battement du compteur. */
  holdScore(n) { this.hold = (this.hold || 0) + n; }
  /** Le seuil d'une étoile vient d'être passé : l'icône enfle, la note sonne, un mot passe dans le ruban. */
  starReached(n) {
    const el = this.r.starsLine; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    AudioSys.play(`star_${Math.min(3, n)}`, { volume: 0.55 });
    const words = STORY.starReached || []; if (words[n - 1]) this.ribbon(words[n - 1], '#e0a33a', 1600, 'gold');
  }
  release(pts) { this.hold = Math.max(0, (this.hold || 0) - pts); if (this.hold === 0) this.shownScore = this.isl.score; const b = this.r.score; b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); }
  /** Position écran (repère de la scène) du compteur de points : cible des étincelles. */
  scoreTarget() { const st = document.getElementById('stage'); const sr = st ? st.getBoundingClientRect() : { left: 0, top: 0 }; const r = this.r.score.getBoundingClientRect(); return { x: (r.left + r.width / 2 - sr.left) / STAGE.scale, y: (r.top + r.height / 2 - sr.top) / STAGE.scale }; }
  /** Le bandeau de saison se signale (la règle s'y écrit une seule fois). */
  seasonTurn() { const b = this.r.seasonBox; b.classList.remove('turn'); void b.offsetWidth; b.classList.add('turn'); }
  /** Entrée du journal sans bulle à l'écran. */
  logOnly(text, kind = 'info') { const isl = this.isl; const s = STORY.seasons[isl.season] || { name: isl.season }; this.log.push({ text, kind, when: `${s.name} · pose ${isl.placements}` }); if (this.log.length > 200) this.log.shift(); if (this.r.logPanel.classList.contains('hidden')) this.unread++; else this.renderLog(); }
  /** Le compteur de points monte en tic-tac vers la vraie valeur ; le badge « +N » flotte à côté. */
  bumpScore(delta) {
    if (!delta) return; const d = this.r.scoreDelta;
    d.textContent = `${delta > 0 ? '+' : ''}${delta}`; d.className = `score-delta on ${delta < 0 ? 'neg' : ''}`;
    clearTimeout(this._deltaT); this._deltaT = setTimeout(() => d.classList.remove('on'), 1400);
  }

  /**
   * Un seul canal : tout message entre au journal de l'île (Pause → Journal, ou J) ; seuls ceux qui demandent un regard —
   * une pose refusée, un vœu, une rare, un gain marquant — passent aussi dans le ruban, un à la fois. Il y avait une pile de
   * quatre bulles en plus du ruban : au changement de saison, quatre voix parlaient en même temps.
   */
  notify(text, kind = 'info') {
    this.logOnly(text, kind);
    if (RIBBON_KINDS[kind]) this.ribbon(text, RIBBON_KINDS[kind], Math.min(4200, 1600 + text.length * 28), `msg ${kind}`);
  }

  toggleLog(force) {
    const open = force !== undefined ? force : this.r.logPanel.classList.contains('hidden');
    this.r.logPanel.classList.toggle('hidden', !open);
    if (open) { this.unread = 0; this.renderLog(); }
  }

  renderLog() {
    const list = this.r.logList;
    list.innerHTML = this.log.length ? this.log.slice().reverse().map((n) => `<div class="log-item ${n.kind}"><span class="log-when">${n.when}</span><span class="log-text">${n.text}</span></div>`).join('') : '<div class="log-empty">Rien encore. Les événements de l’île s’inscriront ici.</div>';
  }

  /** Mode repos : les panneaux périphériques s'estompent (jamais la file, le score ni la saison). */
  setResting(on) { if (this._resting === on) return; this._resting = on; this.root.classList.toggle('resting', !!on); }

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
    if (this.last.seasonKey !== isl.season) { this.last.seasonKey = isl.season; r.seasonIcon.innerHTML = icon(SEASON_ICON[isl.season] || 'icon_leaf'); r.seasonBox.classList.remove('s-spring', 's-summer', 's-autumn', 's-winter'); r.seasonBox.classList.add(`s-${isl.season}`); }
    // pips
    const pipHtml = isl.garden ? '' : Array.from({ length: isl.seasonLength }, (_, i) => `<i class="${i < isl.inSeason ? 'on' : ''}"></i>`).join('');
    if (pipHtml !== this.last.pips) { this.last.pips = pipHtml; r.pips.innerHTML = pipHtml; }
    const choose = !!isl.garden;
    if (choose !== this.last.choose) { this.last.choose = choose; r.gardenPick.classList.toggle('hidden', !choose); if (choose) r.pickTitle.textContent = 'Choisir'; }
    // le compteur monte vers la vraie valeur (tic-tac), sans jamais traîner plus d'une seconde
    if (this.shownScore === undefined) this.shownScore = isl.score;
    const target = isl.score - (this.hold || 0);   // les points en vol ne sont pas encore comptés
    if (this.shownScore !== target) { const diff = target - this.shownScore; const step = Math.max(1, Math.ceil(Math.abs(diff) * 0.12)); this.shownScore += Math.sign(diff) * Math.min(Math.abs(diff), step); }
    this.set('score', String(this.shownScore));
    // hauteur réelle de la barre du haut (elle passe sur deux lignes en portrait) : les panneaux dessous s'y calent
    if ((this._frame = (this._frame || 0) + 1) % 20 === 0) { const hh = this.r.top ? this.r.top.offsetHeight : 0; if (hh && hh !== this._topH) { this._topH = hh; this.root.style.setProperty('--hud-top-h', `${hh}px`); } }
    if (!this.r.scorePop.classList.contains('hidden') && this._scorePopScore !== isl.score) this.renderScorePop();
    if (!isl.infinite && !isl.garden) {
      // l'étoile d'or ne se montre qu'au bilan : pendant la partie, un seul juge, les trois étoiles
      const th = isl.thresholds; const reached = th.filter((t) => isl.score >= t).length;
      const line = reached >= 3 ? '★★★' : `${'★'.repeat(reached)}☆ ${th[reached]}`;
      if (line !== this.last.starsLine) { this.last.starsLine = line; r.starsLine.textContent = line; r.starsLine.title = `Étoiles : ${th.join(' · ')} points`; }
      // l'étoile franchie : jugée sur le compteur AFFICHÉ, donc après l'arrivée des points en vol ; jamais au premier rendu ni en reprise
      const shownReached = th.filter((t) => this.shownScore >= t).length;
      if (this.last.reached === undefined) this.last.reached = shownReached;
      else if (shownReached > this.last.reached) { this.last.reached = shownReached; this.starReached(shownReached); }
    }
    this.set('breaths', String(isl.breaths));
    this.set('left', isl.infinite || isl.garden ? '' : `${isl.queue.remaining} restante${isl.queue.remaining > 1 ? 's' : ''}`);
    r.pwDiscard.disabled = !isl.canDiscard();
    r.pwUndo.disabled = !isl.canUndo();
    this.renderQueue(); this.renderWishes(); this.renderFauna(); this.renderTileHelp();
  }

  destroy() { this.root.innerHTML = ''; }
}
