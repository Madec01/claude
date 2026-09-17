// Point d'entrée : chargement, scènes, boucle, flux de campagne de « Cent Saisons ».
import { Loop } from './core/loop.js';
import { Input } from './core/input.js';
import { Assets } from './core/assets.js';
import { AudioSys } from './core/audio.js';
import { Save } from './core/save.js';
import { SceneManager, wait } from './core/scenes.js';
import { ParticleSystem } from './core/particles.js';
import { Shake } from './core/shake.js';
import { Island } from './game/island.js';
import { IslandRenderer } from './game/render.js';
import { Camera } from './game/camera.js';
import { Effects } from './game/effects.js';
import { Hud } from './game/hud.js';
import { Tutorial } from './game/tutorial.js';
import { fromWorld, toWorld, key } from './game/hex.js';
import { ISLANDS, INFINITE, GARDEN, getIsland, mechanicsUpTo } from './data/islands.js';
import { STORY } from './data/story.js';
import { BALANCE } from './data/balance.js';
import { buildMenu } from './ui/menu.js';
import { buildOptions } from './ui/options.js';
import { buildCredits, loadCredits } from './ui/credits.js';
import { buildStory, islandIntroScreens, islandMemoryScreens, prologueScreens, endingScreens, infiniteScreens, gardenScreens } from './ui/story.js';
import { buildResults } from './ui/results.js';
import { buildWorkshop } from './ui/workshop.js';
import { buildPause } from './ui/pause.js';
import { h, showUI, hideUI } from './ui/dom.js';

const W = 1280, H = 720;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const input = new Input(canvas, W, H);
const scenes = new SceneManager();

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const stage = document.getElementById('stage');
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  stage.style.width = `${Math.round(W * s)}px`; stage.style.height = `${Math.round(H * s)}px`;
  stage.style.setProperty('--scale', s);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const SEASON_MUSIC = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };

const Game = {
  credits: null, fpsEl: null,
  async boot() {
    const fill = document.getElementById('boot-fill'), status = document.getElementById('boot-status');
    const setP = (p, txt) => { fill.style.width = `${Math.round(p * 100)}%`; if (txt) status.textContent = txt; };
    Save.load();
    AudioSys.volumes = { master: Save.options.master, music: Save.options.music, ambience: Save.options.ambience, sfx: Save.options.sfx };
    AudioSys.muted = !!Save.options.muted;
    try { await AudioSys.loadManifest(); } catch (e) { console.warn(e); }
    try { await Assets.loadImages((p) => setP(p * 0.6, 'Les tuiles se réveillent…')); } catch (e) { console.warn(e); }
    try { await AudioSys.preload((p) => setP(0.6 + p * 0.35, 'Les oiseaux s’accordent…')); } catch (e) { console.warn(e); }
    try { await document.fonts.ready; } catch (_) { /* ignore */ }
    this.credits = await loadCredits();
    setP(1, 'Prêt.');
    this.setFpsVisible(Save.options.showFps);
    await wait(200);
    const boot = document.getElementById('boot'); boot.classList.add('off'); setTimeout(() => boot.remove(), 700);
    scenes.go('menu', {}, { fade: 0 });
  },
  showPanel(node) { showUI(node, 'panel-wrap'); },
  showMenu() { scenes.go('menu', {}, { fade: 0.25 }); },
  showOptions(onBack) { this.showPanel(buildOptions({ onBack: onBack || (() => this.showMenu()), game: this })); },
  showCredits(onBack) { this.showPanel(buildCredits({ onBack: onBack || (() => this.showMenu()), credits: this.credits })); },
  toggleFullscreen() { const el = document.documentElement; if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch(() => {}); else document.exitFullscreen(); },
  setFpsVisible(v) { if (!this.fpsEl) { this.fpsEl = h('div', { class: 'fps' }); document.getElementById('app').appendChild(this.fpsEl); } this.fpsEl.style.display = v ? 'block' : 'none'; },
  setTestMode() { if (scenes.currentName === 'menu') this.showOptions(); },
  onSaveReset() {},
  get testMode() { return !!Save.options.testMode; },

  // ----- Flux -----
  startCampaign() {
    const c = Save.campaign;
    if (c.completed) { c.unlockedIsland = 1; c.completed = false; Save.save(); }
    const id = Math.min(c.unlockedIsland, 12);
    if (!c.prologueSeen && id === 1) scenes.go('story', { screens: prologueScreens(), onDone: () => { c.prologueSeen = true; Save.save(); this.startIsland(1); } });
    else this.startIsland(id);
  },
  startIsland(id, { skipIntro = false } = {}) {
    const def = getIsland(id);
    if (skipIntro) { scenes.go('island', { def }); return; }
    scenes.go('story', { screens: islandIntroScreens(def), onDone: () => scenes.go('island', { def }, { fade: 0.5 }) });
  },
  startInfinite() { scenes.go('story', { screens: infiniteScreens(), onDone: () => scenes.go('island', { def: INFINITE }, { fade: 0.5 }) }); },
  startGarden() { scenes.go('story', { screens: gardenScreens(), onDone: () => scenes.go('island', { def: GARDEN }, { fade: 0.5 }) }); },

  afterIsland(result, def) {
    const c = Save.campaign, test = this.testMode;
    let newRecord = false, seedsGained = 0;
    if (def.infinite) {
      if (!test && result.score > Save.data.infinite.best) { Save.data.infinite.best = result.score; Save.data.infinite.bestSeasons = result.seasons; newRecord = true; }
      Save.save();
      scenes.go('results', { result, def, newRecord });
      return;
    }
    if (def.garden) { scenes.go('results', { result, def }); return; }
    if (!test) {
      c.islandsPlayed++;
      Save.data.stats.placements += result.placements; Save.data.stats.closed += result.stats.closed; Save.data.stats.wishes += result.wishesDone;
      const prevStars = c.stars[def.id] || 0;
      c.stars[def.id] = Math.max(prevStars, result.stars);
      if (result.score > (c.best[def.id] || 0)) { newRecord = !!c.best[def.id]; c.best[def.id] = result.score; }
      // graines : étoiles nouvelles + vœux + île terminée la première fois
      const firstTime = !c.memoriesRead.includes(def.id);
      seedsGained = Math.max(0, result.stars - prevStars) * BALANCE.seeds.star + (firstTime ? result.wishesDone * BALANCE.seeds.wish + BALANCE.seeds.island : 0);
      c.seeds += seedsGained; c.seedsTotal += seedsGained;
      if (result.stars >= 1 && def.id >= c.unlockedIsland && def.id < 12) c.unlockedIsland = def.id + 1;
      if (def.id === 12 && result.stars >= 1) { c.completed = true; Save.data.infinite.unlocked = true; }
      if (def.id >= 6) Save.data.infinite.unlocked = true;
      Save.save();
    }
    scenes.go('results', { result, def, newRecord, seedsGained });
  },
  afterResults(result, def) {
    if (def.infinite) { this.startInfinite(); return; }
    if (def.garden) { this.startGarden(); return; }
    const c = Save.campaign;
    const memory = islandMemoryScreens(def);
    const next = () => {
      if (result.stars < 1) { this.startIsland(def.id); return; }
      if (def.id === 12) { scenes.go('story', { screens: endingScreens(), skippable: false, onDone: () => scenes.go('ending') }); return; }
      scenes.go('workshop', { onContinue: () => this.startIsland(def.id + 1) });
    };
    if (result.stars >= 1 && !c.memoriesRead.includes(def.id)) { c.memoriesRead.push(def.id); Save.save(); }
    if (result.stars >= 1) scenes.go('story', { screens: memory, onDone: next }); else next();
  },
};
window.CS = { Game, Save, scenes, AudioSys, ISLANDS, BALANCE, STORY };

// ---------- Scène de fond : une île qui se construit toute seule ----------
class AmbientIsland {
  constructor(defId = 4) {
    const def = { ...getIsland(defId), id: 'ambient', wishes: [], start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 2, r: -1, family: 'rock' }] };
    this.isl = new Island(def, { upgrades: {} });
    this.cam = new Camera(); this.cam.fit(this.isl.board.mask, { uiLeft: 380, uiRight: 40, uiTop: 40, uiBottom: 40, immediate: true });
    this.particles = new ParticleSystem(600); this.fx = new Effects(this.particles);
    this.renderer = new IslandRenderer(this.isl, this.cam, this.fx, this.particles);
    this.timer = 1.2;
    this.isl.on((e) => { if (e.type === 'place') this.fx.drop(key(e.q, e.r)); if (e.type === 'season') this.renderer.startTransition(e.from, e.to); if (e.type === 'fauna') this.fx.fauna(`${e.species}@${e.regionId}`, e.kind); });
  }
  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 1.0;
      if (this.isl.ended) { const def = this.isl.def; this.isl = new Island({ ...def, seed: def.seed + Math.floor(Math.random() * 1000) }, { upgrades: {} }); this.renderer.isl = this.isl; this.cam.fit(this.isl.board.mask, { uiLeft: 380, uiRight: 40, uiTop: 40, uiBottom: 40 }); this.isl.on((e) => { if (e.type === 'place') this.fx.drop(key(e.q, e.r)); if (e.type === 'season') this.renderer.startTransition(e.from, e.to); if (e.type === 'fauna') this.fx.fauna(`${e.species}@${e.regionId}`, e.kind); }); }
      else {
        let best = null, bs = -Infinity;
        for (const c of this.isl.board.legalCells()) { const p = this.isl.preview(c.q, c.r); if (p && p.total + Math.random() * 0.5 > bs) { bs = p.total + Math.random() * 0.5; best = c; } }
        if (best) this.isl.place(best.q, best.r); else this.isl.finish('full');
      }
    }
    this.cam.update(dt); this.particles.update(dt); this.fx.update(dt);
    const b = this.bounds();
    this.fx.ambient(dt, this.isl.season, b, 1);
  }
  bounds() { const c = this.cam; const tl = c.toWorldPoint(0, 0), br = c.toWorldPoint(W, H); return { minX: tl.x, maxX: br.x, minY: tl.y, maxY: br.y }; }
  render(ctx, alpha, dt) { this.renderer.render(ctx, alpha, dt); }
}

class MenuScene {
  async enter() {
    hideUI(); document.getElementById('hud').innerHTML = ''; document.getElementById('tutorial').innerHTML = '';
    if (!this.bg) this.bg = new AmbientIsland(4);
    showUI(buildMenu({ game: Game }), 'menu-wrap');
    AudioSys.playMusic('menu', { fade: 2 });
    AudioSys.setAmbience('birds', 0.35, 3); AudioSys.setAmbience('sea', 0.3, 3);
    for (const k of ['stream', 'wind', 'rain', 'crickets', 'winter']) AudioSys.setAmbience(k, 0, 1.5);
    this.unsub = input.on('keydown', (k) => { if (k === 'KeyM') { const m = AudioSys.toggleMute(); Save.options.muted = m; Save.save(); } });
  }
  exit() { this.unsub && this.unsub(); hideUI(); }
  update(dt) { this.bg.update(dt); input.endFrame(); }
  render(ctx, alpha, dt) { this.bg.render(ctx, alpha, dt); }
  ensureBg() { if (!this.bg) this.bg = new AmbientIsland(4); return this.bg; }
}

class StoryScene {
  async enter({ screens, onDone, skippable = true }) {
    this.bg = scenes.scenes.get('menu').ensureBg();
    const node = buildStory(screens, { onDone: () => { if (this.node) this.node.destroy(); onDone(); }, skippable });
    this.node = node; showUI(node, 'story-wrap');
  }
  exit() { if (this.node && this.node.destroy) this.node.destroy(); hideUI(); }
  update(dt) { this.bg.update(dt); input.endFrame(); }
  render(ctx, alpha, dt) { this.bg.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(244,239,230,0.45)'; ctx.fillRect(0, 0, W, H); }
}

// ---------- Scène de jeu ----------
class IslandScene {
  async enter({ def }) {
    hideUI();
    this.def = def;
    const upgrades = Save.campaign.upgrades;
    const mech = def.infinite || def.garden ? mechanicsUpTo(99) : mechanicsUpTo(def.id);
    if (Game.testMode) for (const m of ['river', 'season', 'fauna', 'wish', 'breath', 'rare']) mech.add(m);
    this.mech = mech;
    const isl = new Island(def, { upgrades });
    this.isl = isl;
    this.cam = new Camera(); this.cam.fit(isl.board.mask, { immediate: true });
    this.particles = new ParticleSystem(1500); this.fx = new Effects(this.particles); this.shake = new Shake(); this.shake.enabled = Save.options.shake !== false;
    this.renderer = new IslandRenderer(isl, this.cam, this.fx, this.particles);
    this.paused = false; this.budMode = false; this.endTimer = 0; this.finished = false;
    const name = STORY.islands[def.id] ? STORY.islands[def.id].name : def.infinite ? 'Île infinie' : 'Jardin';
    this.title = name;
    this.hud = new Hud(document.getElementById('hud'), isl, {
      title: name, mechanics: mech,
      onPause: () => this.togglePause(),
      onSwap: (i) => { if (isl.swap(i)) AudioSys.play('tile_swap', { volume: 0.6 }); else AudioSys.play('ui_error', { volume: 0.4 }); },
      onDiscard: () => { if (isl.discard()) AudioSys.play('tile_discard', { volume: 0.6 }); else AudioSys.play('ui_error', { volume: 0.4 }); },
      onBud: () => this.setBud(!this.budMode),
      onUndo: () => { if (isl.undo()) { AudioSys.play('tile_undo', { volume: 0.6 }); this.hud.notify('Souvenir : la dernière pose est annulée', 'info'); } else AudioSys.play('ui_error', { volume: 0.4 }); },
      onPocket: () => { if (isl.toPocket()) AudioSys.play('tile_pocket', { volume: 0.6 }); },
      onPocketOut: (i) => { if (isl.fromPocket(i)) AudioSys.play('tile_pocket', { volume: 0.6 }); },
      onGardenPick: (fam) => { isl.setGardenTile(fam); AudioSys.play('ui_click', { volume: 0.4 }); },
    });
    document.getElementById('hud').classList.add('on');
    this.tutorial = new Tutorial(document.getElementById('tutorial'), isl, def.id, !Save.options.skipTutorial && !def.infinite && !def.garden);
    document.getElementById('tutorial').classList.add('on');
    isl.on((e) => this.onEvent(e));
    // audio
    AudioSys.playMusic(def.garden ? 'garden' : SEASON_MUSIC[isl.season], { fade: 2 });
    this.updateAmbience(true);
    AudioSys.play('island_start', { volume: 0.6 });
    // entrées
    this.drag = null;
    this.unsubs = [
      input.on('mousedown', (b, x, y) => this.onMouseDown(b, x, y)),
      input.on('mouseup', (b, x, y) => this.onMouseUp(b, x, y)),
      input.on('wheel', (dy) => { if (this.paused) return; this.cam.zoomBy(dy > 0 ? 0.9 : 1.1, input.mouse.x, input.mouse.y); }),
      input.on('keydown', (k) => this.onKey(k)),
    ];
    document.getElementById('stage').classList.add('playing');
  }

  exit() {
    for (const u of this.unsubs || []) u();
    this.hud && this.hud.destroy(); document.getElementById('hud').classList.remove('on');
    this.tutorial && this.tutorial.destroy(); document.getElementById('tutorial').classList.remove('on');
    document.getElementById('stage').classList.remove('playing');
    if (this.debugEl) { this.debugEl.remove(); this.debugEl = null; }
    hideUI(); this.isl = null;
  }

  updateAmbience(immediate = false) {
    const isl = this.isl; const b = isl.board;
    const count = (fam) => [...b.tiles.values()].filter((t) => t.family === fam).length;
    const forest = count('forest'), water = count('water');
    const s = isl.season;
    const fade = immediate ? 1 : 3;
    AudioSys.setAmbience('birds', s === 'winter' ? 0.08 : Math.min(0.6, 0.15 + forest * 0.04), fade);
    AudioSys.setAmbience('stream', Math.min(0.4, water * 0.05), fade);
    AudioSys.setAmbience('wind', s === 'autumn' ? 0.35 : s === 'winter' ? 0.2 : 0.1, fade);
    AudioSys.setAmbience('winter', s === 'winter' ? 0.4 : 0, fade);
    AudioSys.setAmbience('crickets', s === 'summer' ? 0.35 : 0, fade);
    AudioSys.setAmbience('sea', 0.25, fade);
    AudioSys.setAmbience('rain', 0, fade);
  }

  onEvent(e) {
    const isl = this.isl, fx = this.fx;
    if (e.type === 'place') {
      const w = toWorld(e.q, e.r);
      fx.drop(key(e.q, e.r));
      fx.placeBurst(w.x, w.y, e.result.total > 0);
      AudioSys.play(`tile_place_${1 + Math.floor(Math.random() * 4)}`, { volume: 0.7 });
      let i = 0;
      for (const ed of e.result.edges) { const nw = toWorld(ed.q, ed.r); const mx = (w.x + nw.x) / 2, my = (w.y + nw.y) / 2; setTimeout(() => { fx.floatText(mx, my, `${ed.pts > 0 ? '+' : ''}${ed.pts}`, ed.pts > 0 ? '#2f9e8f' : '#d95f4b', 18, 1.1); if (ed.pts > 0) AudioSys.play(`point_${Math.min(8, i + 1)}`, { volume: 0.45 }); else AudioSys.play('point_bad', { volume: 0.4 }); }, 90 * i); i++; }
      for (const bs of e.result.base) { setTimeout(() => fx.floatText(w.x, w.y + 30, `+${bs.pts} ${bs.label}`, '#5aa7d6', 18, 1.2), 90 * i++); if (bs.label === 'rivière') this.tutorial.onEvent('river'); }
      if (e.result.total !== 0) setTimeout(() => fx.floatText(w.x, w.y - 40, `${e.result.total > 0 ? '+' : ''}${e.result.total}`, e.result.total > 0 ? '#2b2a26' : '#d95f4b', 26, 1.4), 90 * i + 60);
      if (e.tile.rare) this.tutorial.onEvent('rare');
      this.updateAmbience();
    } else if (e.type === 'close') {
      const cx = e.cells.reduce((s, c) => s + toWorld(c.q, c.r).x, 0) / e.cells.length, cy = e.cells.reduce((s, c) => s + toWorld(c.q, c.r).y, 0) / e.cells.length;
      setTimeout(() => {
        fx.ring(e.cells, '#e0a33a'); fx.closeBurst(cx, cy, e.size);
        fx.floatText(cx, cy - 20, `${STORY.closed[Math.floor(Math.random() * STORY.closed.length)]} +${e.bonus}`, '#e0a33a', 24, 1.8);
        AudioSys.play(e.size >= 6 ? 'region_big' : 'region_close', { volume: 0.8 });
        if (e.size >= 6) this.shake.trigger(0.25);
      }, 350);
    } else if (e.type === 'season') {
      this.renderer.startTransition(e.from, e.to);
      AudioSys.play(`season_${e.to}`, { volume: 0.8 }); AudioSys.play('season_sweep', { volume: 0.5 });
      AudioSys.playMusic(SEASON_MUSIC[e.to], { fade: 3 });
      const s = STORY.seasons[e.to];
      this.hud.notify(`${s.name} — ${s.line}`, 'season');
      if (e.pts) setTimeout(() => this.hud.notify(`Saison : +${e.pts} points${e.faunaBonus ? `, +${e.faunaBonus} souffle${e.faunaBonus > 1 ? 's' : ''} (faune)` : ''}`, 'good'), 900);
      let i = 0;
      for (const ev of e.events) { if (!ev.pts) continue; const w = toWorld(ev.q, ev.r); setTimeout(() => fx.floatText(w.x, w.y - 10, `+${ev.pts}`, '#e0a33a', 18, 1.2), 400 + 70 * i++); }
      this.tutorial.onEvent('season');
      this.updateAmbience();
    } else if (e.type === 'fauna') {
      const k = `${e.species}@${e.regionId}`;
      const w = toWorld(e.q, e.r);
      const s = STORY.fauna[e.species] || { name: e.species, arrive: '', leave: '' };
      if (e.kind === 'arrive') { fx.fauna(k, 'arrive'); fx.faunaBurst(w.x, w.y - 20); AudioSys.play('fauna_arrive', { volume: 0.6 }); setTimeout(() => AudioSys.play(`fauna_${e.species}`, { volume: 0.5 }), 250); this.hud.notify(`${s.name} : ${s.arrive}`, 'fauna'); }
      else { const an = { t: 0, kind: 'leave', info: e }; fx.faunaAnim.set(k, an); AudioSys.play('fauna_leave', { volume: 0.5 }); this.hud.notify(`${s.name} : ${s.leave}`, 'warn'); }
      this.tutorial.onEvent('fauna');
    } else if (e.type === 'wish') {
      const s = STORY.wishes[e.wish.def.id] || { title: '', done: '', failed: '' };
      if (e.kind === 'done') { AudioSys.play('wish_done', { volume: 0.8 }); setTimeout(() => AudioSys.play('rare_tile', { volume: 0.6 }), 600); this.hud.notify(`Vœu exaucé — ${s.done}`, 'gold'); this.hud.notify(`Une tuile rare rejoint la file : ${(STORY.tiles[e.rare] || {}).name || e.rare}`, 'rare'); }
      else { AudioSys.play('wish_failed', { volume: 0.6 }); this.hud.notify(`${s.title} — ${s.failed}`, 'warn'); }
    } else if (e.type === 'breath') {
      if (e.kind === 'bud') { const w = toWorld(e.q, e.r); fx.drop(key(e.q, e.r)); fx.placeBurst(w.x, w.y, true); AudioSys.play('bud', { volume: 0.7 }); }
      else if (e.kind !== 'undo') AudioSys.play('breath_spend', { volume: 0.5 });
      this.tutorial.onEvent('breath');
    } else if (e.type === 'grow') {
      this.cam.fit(this.isl.board.mask);
    } else if (e.type === 'end') {
      this.finished = true; this.endTimer = 0;
      AudioSys.play('island_done', { volume: 0.8 });
    }
  }

  setBud(on) { if (on && !this.mech.has('breath')) return; this.budMode = on; this.renderer.budMode = on; this.hud.setBudMode(on); this.budTarget = null; }

  onMouseDown(b, x, y) {
    if (this.paused || !this.isl || this.isl.ended) return;
    if (b === 2 || b === 1) { this.drag = { x, y, moved: 0 }; return; }
    if (b !== 0) return;
    const w = this.cam.toWorldPoint(x, y); const { q, r } = fromWorld(w.x, w.y);
    if (this.budMode) {
      if (this.isl.canBud(q, r)) { this.budTarget = { q, r }; this.hud.notify('Forêt (F) ou verger (V) ?', 'info'); }
      else { this.setBud(false); }
      return;
    }
    if (this.isl.canPlace(q, r)) { this.isl.place(q, r); this.renderer.hover = null; }
    else if (this.isl.board.has(q, r) && !this.isl.board.get(q, r)) { AudioSys.play('tile_invalid', { volume: 0.5 }); this.hud.notify('Une tuile doit toucher une tuile posée', 'warn'); }
  }
  onMouseUp(b, x, y) { if (b === 2 || b === 1) this.drag = null; }
  onKey(k) {
    if (k === 'Escape') { if (this.budMode) { this.setBud(false); return; } this.togglePause(); return; }
    if (k === 'KeyM') { const m = AudioSys.toggleMute(); Save.options.muted = m; Save.save(); return; }
    if (this.paused || !this.isl || this.isl.ended) return;
    const isl = this.isl;
    if (k === 'Digit2' || k === 'Numpad2') this.hud.onSwap(1);
    if (k === 'Digit3' || k === 'Numpad3') this.hud.onSwap(2);
    if (k === 'KeyX') { if (this.mech.has('breath')) { if (isl.discard()) AudioSys.play('tile_discard', { volume: 0.6 }); } }
    if (k === 'KeyB') this.setBud(!this.budMode);
    if (k === 'KeyZ') { if (this.mech.has('breath') && isl.undo()) AudioSys.play('tile_undo', { volume: 0.6 }); }
    if (k === 'KeyP') { if (isl.toPocket()) AudioSys.play('tile_pocket', { volume: 0.6 }); else if (isl.queue.pocket.length) { isl.fromPocket(0); AudioSys.play('tile_pocket', { volume: 0.6 }); } }
    if (this.budMode && this.budTarget && (k === 'KeyF' || k === 'KeyV')) { if (isl.bud(this.budTarget.q, this.budTarget.r, k === 'KeyF' ? 'forest' : 'orchard')) this.setBud(false); }
    if (Game.testMode) {
      if (k === 'F1') { if (this.debugEl) { this.debugEl.remove(); this.debugEl = null; } else { this.debugEl = h('div', { class: 'debug' }); document.getElementById('app').appendChild(this.debugEl); } }
      if (k === 'F2') { isl.queue.total = Infinity; isl.queue.fill(); this.hud.notify('File infinie', 'special'); }
      if (k === 'F3') { isl.advanceSeason(); }
      if (k === 'F4') { isl.breaths += 10; this.hud.notify('+10 souffles', 'special'); }
      if (k === 'F5') { isl.finish('test'); }
    }
  }

  togglePause(force) {
    if (!this.isl || this.isl.ended) return;
    this.paused = force !== undefined ? force : !this.paused;
    if (this.paused) {
      AudioSys.play('ui_open', { volume: 0.5 });
      const build = () => buildPause({ title: this.title, onResume: () => this.togglePause(false), onRestart: () => scenes.go('island', { def: this.def }, { fade: 0.5 }), onOptions: () => Game.showOptions(() => showUI(build(), 'pause-wrap')), onMenu: () => scenes.go('menu') });
      showUI(build(), 'pause-wrap');
    } else { hideUI(); AudioSys.play('ui_close', { volume: 0.5 }); }
  }

  update(dt) {
    const isl = this.isl; if (!isl) return;
    if (this.paused) { input.endFrame(); return; }
    // déplacement de la vue
    if (this.drag && (input.mouse.right || input.mouse.left)) { const dx = input.mouse.x - this.drag.x, dy = input.mouse.y - this.drag.y; this.cam.pan(dx, dy); this.drag.x = input.mouse.x; this.drag.y = input.mouse.y; }
    else if (this.drag && !input.mouse.right) this.drag = null;
    const pan = 320 * dt; if (input.isDown('ArrowLeft')) this.cam.pan(pan, 0); if (input.isDown('ArrowRight')) this.cam.pan(-pan, 0); if (input.isDown('ArrowUp')) this.cam.pan(0, pan); if (input.isDown('ArrowDown')) this.cam.pan(0, -pan);
    this.cam.update(dt);
    // survol
    if (!isl.ended) {
      const w = this.cam.toWorldPoint(input.mouse.x, input.mouse.y); const { q, r } = fromWorld(w.x, w.y);
      const hk = key(q, r);
      if (this.lastHover !== hk) { this.lastHover = hk; if (isl.board.has(q, r) && !isl.board.get(q, r) && isl.canPlace(q, r)) AudioSys.play('tile_hover', { volume: 0.18, minInterval: 0.08 }); }
      this.renderer.hover = isl.board.has(q, r) ? { q, r, preview: isl.preview(q, r) } : null;
    } else this.renderer.hover = null;
    this.particles.update(dt); this.fx.update(dt); this.shake.update(dt);
    const b = (() => { const tl = this.cam.toWorldPoint(0, 0), br = this.cam.toWorldPoint(W, H); return { minX: tl.x, maxX: br.x, minY: tl.y, maxY: br.y }; })();
    this.fx.ambient(dt, isl.season, b, 1);
    this.hud.update();
    this.tutorial.update(dt);
    if (this.finished) { this.endTimer += dt; if (this.endTimer > 2.2) { this.finished = false; Game.afterIsland(isl.result, this.def); } }
    if (this.debugEl) this.debugEl.textContent = `placements=${isl.placements} season=${isl.season} ${isl.inSeason}/${isl.seasonLength} score=${isl.score} breaths=${isl.breaths} fauna=${isl.fauna.size} queue=${isl.queue.remaining} fps=${loop.fps} particles=${this.particles.count} zoom=${this.cam.zoom.toFixed(2)}`;
    input.endFrame();
  }
  render(ctx, alpha, dt) {
    ctx.save(); ctx.translate(this.shake.x, this.shake.y);
    this.renderer.render(ctx, alpha, dt);
    ctx.restore();
  }
}

class ResultsScene {
  async enter({ result, def, newRecord, seedsGained }) {
    AudioSys.playMusic('results', { fade: 1.5 });
    this.bg = scenes.scenes.get('menu').ensureBg();
    showUI(buildResults({ result, def, newRecord, seedsGained, onContinue: () => Game.afterResults(result, def), onRetry: () => Game.startIsland(def.id, { skipIntro: true }), onMenu: () => scenes.go('menu') }), 'results-wrap');
  }
  exit() { hideUI(); }
  update(dt) { this.bg.update(dt); input.endFrame(); }
  render(ctx, alpha, dt) { this.bg.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(244,239,230,0.5)'; ctx.fillRect(0, 0, W, H); }
}
class WorkshopScene {
  async enter({ onContinue }) { AudioSys.playMusic('results', { fade: 1.5 }); this.bg = scenes.scenes.get('menu').ensureBg(); showUI(buildWorkshop({ onContinue }), 'workshop-wrap'); }
  exit() { hideUI(); }
  update(dt) { this.bg.update(dt); input.endFrame(); }
  render(ctx, alpha, dt) { this.bg.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(244,239,230,0.5)'; ctx.fillRect(0, 0, W, H); }
}
class EndingScene {
  async enter() {
    AudioSys.playMusic('ending', { fade: 2 });
    this.bg = scenes.scenes.get('menu').ensureBg();
    const node = buildCredits({ onBack: () => scenes.go('menu'), credits: Game.credits });
    node.classList.add('ending-credits');
    node.prepend(h('div', { class: 'ending-head' }, h('div', { class: 'res-kicker' }, 'Fin de la campagne'), h('p', {}, 'Merci d’avoir rendu leurs saisons aux îles. L’Île infinie et le Jardin vous attendent.')));
    showUI(node, 'credits-wrap');
  }
  exit() { hideUI(); }
  update(dt) { this.bg.update(dt); input.endFrame(); }
  render(ctx, alpha, dt) { this.bg.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(244,239,230,0.35)'; ctx.fillRect(0, 0, W, H); }
}

scenes.register('menu', new MenuScene());
scenes.register('story', new StoryScene());
scenes.register('island', new IslandScene());
scenes.register('results', new ResultsScene());
scenes.register('workshop', new WorkshopScene());
scenes.register('ending', new EndingScene());

const loop = new Loop({ update: (dt) => scenes.update(dt), render: (alpha, dt) => { scenes.render(ctx, alpha, dt); if (Game.fpsEl && Game.fpsEl.style.display !== 'none') Game.fpsEl.textContent = `${loop.fps} i/s`; } });
window.CS.loop = loop;
Game.boot().then(() => loop.start()).catch((e) => { console.error(e); const s = document.getElementById('boot-status'); if (s) s.textContent = 'Erreur de chargement : ' + e.message; });
