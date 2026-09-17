// Point d'entrée : chargement, scènes, boucle, flux de campagne.
import { Loop } from './core/loop.js';
import { Input } from './core/input.js';
import { Assets } from './core/assets.js';
import { AudioSys } from './core/audio.js';
import { Save } from './core/save.js';
import { SceneManager, wait } from './core/scenes.js';
import { Night } from './game/night.js';
import { NightRenderer } from './game/render.js';
import { Hud } from './game/hud.js';
import { Tutorial } from './game/tutorial.js';
import { NIGHTS, INFINITE, getNight } from './data/nights.js';
import { STORY } from './data/story.js';
import { BALANCE } from './data/balance.js';
import { buildMenu } from './ui/menu.js';
import { buildOptions } from './ui/options.js';
import { buildCredits, loadCredits } from './ui/credits.js';
import { buildStory, nightIntroScreens, nightOutroScreens, prologueScreens, endingScreens, infiniteScreens, pageScreen } from './ui/story.js';
import { buildResults } from './ui/results.js';
import { buildWorkshop } from './ui/workshop.js';
import { buildPause } from './ui/pause.js';
import { h, showUI, hideUI, ui } from './ui/dom.js';

const W = 1280, H = 720;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const input = new Input(canvas, W, H);
const scenes = new SceneManager();

// ---------- Mise à l'échelle ----------
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const stage = document.getElementById('stage');
  const vw = window.innerWidth, vh = window.innerHeight;
  const s = Math.min(vw / W, vh / H);
  stage.style.width = `${Math.round(W * s)}px`; stage.style.height = `${Math.round(H * s)}px`;
  stage.style.setProperty('--scale', s);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  document.documentElement.style.setProperty('--ui-scale', s);
}
window.addEventListener('resize', resize);
resize();

// ---------- Le jeu (orchestration) ----------
const Game = {
  credits: null,
  fpsEl: null,
  ambientNight: null,     // nuit décorative derrière les menus
  pendingPage: null,
  debug: { panel: null, visible: false },

  async boot() {
    const fill = document.getElementById('boot-fill'), status = document.getElementById('boot-status');
    const setP = (p, txt) => { fill.style.width = `${Math.round(p * 100)}%`; if (txt) status.textContent = txt; };
    Save.load();
    AudioSys.volumes = { master: Save.options.master, music: Save.options.music, ambience: Save.options.ambience, sfx: Save.options.sfx };
    AudioSys.muted = !!Save.options.muted;
    try { await AudioSys.loadManifest(); } catch (e) { console.warn(e); }
    await Assets.loadImages((p) => setP(p * 0.6, 'Chargement des cartes et des navires…'));
    try { await AudioSys.preload((p) => setP(0.6 + p * 0.35, 'Accordage de la corne de brume…')); } catch (e) { console.warn(e); }
    try { await document.fonts.ready; } catch (_) { /* ignore */ }
    this.credits = await loadCredits();
    setP(1, 'Prêt.');
    this.setFpsVisible(Save.options.showFps);
    await wait(250);
    document.getElementById('boot').classList.add('off');
    setTimeout(() => document.getElementById('boot').remove(), 700);
    scenes.go('menu', {}, { fade: 0 });
  },

  // ----- Options, crédits, panneaux -----
  showPanel(node) { showUI(node, 'panel-wrap'); },
  showMenu() { scenes.go('menu', {}, { fade: 0.25 }); },
  showOptions(onBack) {
    const back = onBack || (() => this.showMenu());
    this.showPanel(buildOptions({ onBack: back, game: this }));
  },
  showCredits(onBack) { this.showPanel(buildCredits({ onBack: onBack || (() => this.showMenu()), credits: this.credits })); },
  toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) { (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch(() => {}); }
    else document.exitFullscreen();
  },
  setFpsVisible(v) {
    if (!this.fpsEl) { this.fpsEl = h('div', { class: 'fps' }); document.getElementById('app').appendChild(this.fpsEl); }
    this.fpsEl.style.display = v ? 'block' : 'none';
  },
  setTestMode(v) { if (scenes.currentName === 'menu') this.showOptions(); },
  onSaveReset() { if (scenes.currentName === 'menu') { /* rien : le menu se reconstruit au retour */ } },
  get testMode() { return !!Save.options.testMode; },

  // ----- Flux de campagne -----
  startCampaign() {
    const c = Save.campaign;
    if (c.completed) { c.unlockedNight = 1; c.completed = false; Save.save(); }
    const night = Math.min(c.unlockedNight, 12);
    if (!c.prologueSeen && night === 1) {
      scenes.go('story', { screens: prologueScreens(), onDone: () => { c.prologueSeen = true; Save.save(); this.startNight(1); } });
    } else this.startNight(night);
  },
  startNight(id, { fromSelect = false, skipIntro = false } = {}) {
    if (skipIntro) { scenes.go('night', { id }); return; }
    scenes.go('story', { screens: nightIntroScreens(id), onDone: () => scenes.go('night', { id }, { fade: 0.6 }) });
  },
  startInfinite() {
    scenes.go('story', { screens: infiniteScreens(), onDone: () => scenes.go('night', { id: 'infinite' }, { fade: 0.6 }) });
  },
  afterNight(result) {
    const c = Save.campaign;
    const id = result.night;
    const test = this.testMode;
    if (id === 'infinite') {
      if (!test && result.score > Save.data.infinite.best) { Save.data.infinite.best = result.score; Save.data.infinite.bestWave = result.wave; }
      Save.save();
      scenes.go('results', { result, def: INFINITE, newRecord: !test && result.score >= Save.data.infinite.best && result.score > 0 });
      return;
    }
    const def = getNight(id);
    let newRecord = false;
    if (!test) {
      c.nightsPlayed++;
      Save.data.stats.docked += result.stats.docked; Save.data.stats.wrecked += result.stats.wrecked; Save.data.stats.hornBlows += result.stats.hornBlows;
      if (result.win) {
        c.stars[id] = Math.max(c.stars[id] || 0, result.stars);
        if (result.score > (c.best[id] || 0)) { newRecord = !!c.best[id]; c.best[id] = result.score; }
        c.shards += result.stats.shards; c.shardsTotal += result.stats.shards;
        if (id >= c.unlockedNight && id < 12) c.unlockedNight = id + 1;
        if (id === 12) { c.completed = true; Save.data.infinite.unlocked = true; c.unlockedNight = 12; }
      } else {
        c.shards += Math.floor(result.stats.shards / 2);
      }
      Save.save();
    }
    scenes.go('results', { result, def, newRecord });
  },
  afterResults(result) {
    const id = result.night;
    if (id === 'infinite') { this.startInfinite(); return; }
    const outro = nightOutroScreens(id, result.win);
    const next = () => {
      if (!result.win) { this.startNight(id); return; }
      if (id === 12) { scenes.go('story', { screens: endingScreens(), skippable: false, onDone: () => scenes.go('ending') }); return; }
      scenes.go('workshop', { onContinue: () => this.startNight(id + 1) });
    };
    scenes.go('story', { screens: outro, onDone: next });
  },
};
window.FDB = { Game, Save, scenes, AudioSys, NIGHTS, BALANCE, STORY };

// ---------- Scènes ----------
class MenuScene {
  async enter() {
    hideUI();
    document.getElementById('hud').innerHTML = ''; document.getElementById('tutorial').innerHTML = '';
    // nuit décorative derrière le menu
    const def = { ...getNight(1), id: 'menu', spawns: [], mechanics: { horn: false, anchor: false, pages: false, tide: false, storm: false, beast: false, oil: false }, fog: 0.8, duration: Infinity, beasts: 0, pages: 0 };
    this.night = new Night({ def, save: Save.data, storyPages: [], hooks: {} });
    this.night.introTimer = 0; this.night.state = 'play';
    this.renderer = new NightRenderer(this.night);
    this.t = 0;
    showUI(buildMenu({ game: Game }), 'menu-wrap');
    AudioSys.playMusic('menu', { fade: 2 });
    AudioSys.setAmbience('waves', 0.5, 3);
    AudioSys.setAmbience('wind', 0.25, 4);
    AudioSys.setAmbience('rain', 0, 1); AudioSys.setAmbience('storm', 0, 1);
    this.unsub = input.on('keydown', (k) => { if (k === 'KeyM') { const m = AudioSys.toggleMute(); Save.options.muted = m; Save.save(); } });
  }
  exit() { this.unsub && this.unsub(); hideUI(); }
  update(dt) {
    this.t += dt;
    const n = this.night;
    // le faisceau balaie lentement
    n.mouse = { x: n.beam.ox + Math.cos(this.t * 0.25) * 400, y: n.beam.oy + Math.sin(this.t * 0.25) * 400 };
    n.beam.update(dt, n.mouse, n);
    n.hazards.update(dt, n);
    n.weather.update(dt, n);
    n.particles.update(dt); n.shake.update(dt); n.fx.update(dt);
    n.t += dt;
    for (const b of n.beasts) b.update(dt, n);
    input.endFrame();
  }
  render(ctx, alpha, dt) { this.renderer.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(4,10,20,0.35)'; ctx.fillRect(0, 0, W, H); }
}

class StoryScene {
  async enter({ screens, onDone, skippable = true }) {
    const node = buildStory(screens, { onDone: () => { if (this.node) this.node.destroy(); onDone(); }, skippable });
    this.node = node;
    showUI(node, 'story-wrap');
    this.bg = scenes.scenes.get('menu');
    if (!this.bg.night) await this.bg.enterBackgroundOnly();
    AudioSys.play('ui_open', { volume: 0.3 });
  }
  exit() { if (this.node && this.node.destroy) this.node.destroy(); hideUI(); }
  update(dt) { if (this.bg && this.bg.night) { this.bg.update(dt); } input.endFrame(); }
  render(ctx, alpha, dt) { if (this.bg && this.bg.renderer) { this.bg.renderer.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(4,10,20,0.55)'; ctx.fillRect(0, 0, W, H); } else { ctx.fillStyle = '#0b1a2b'; ctx.fillRect(0, 0, W, H); } }
}
MenuScene.prototype.enterBackgroundOnly = async function () {
  const def = { ...getNight(1), id: 'menu', spawns: [], mechanics: { horn: false, anchor: false, pages: false, tide: false, storm: false, beast: false, oil: false }, fog: 0.8, duration: Infinity, beasts: 0, pages: 0 };
  this.night = new Night({ def, save: Save.data, storyPages: [], hooks: {} });
  this.night.introTimer = 0; this.night.state = 'play';
  this.renderer = new NightRenderer(this.night); this.t = 0;
};

class NightScene {
  async enter({ id }) {
    hideUI();
    const def = id === 'infinite' ? INFINITE : getNight(id);
    this.id = id; this.def = def;
    this.paused = false;
    this.pageQueue = [];
    this.night = new Night({
      def, save: Save.data, storyPages: STORY.pages, testMode: Game.testMode,
      hooks: {
        onEnd: (result) => { if (this.night !== night) return; this.finish(result); },
        onEvent: (ev) => this.tutorial && this.tutorial.onEvent(ev),
        onPage: (page, isNew) => this.showPage(page, isNew),
      },
    });
    const night = this.night;
    this.renderer = new NightRenderer(night);
    const title = id === 'infinite' ? 'Veille infinie' : `Nuit ${id} · ${STORY.nights[id] ? STORY.nights[id].title : ''}`;
    this.title = title;
    this.hud = new Hud(document.getElementById('hud'), night, { title, onPause: () => this.togglePause() });
    document.getElementById('hud').classList.add('on');
    this.tutorial = new Tutorial(document.getElementById('tutorial'), night, id, !Save.options.skipTutorial);
    document.getElementById('tutorial').classList.add('on');
    // audio
    AudioSys.playMusic(def.music || 'act1', { fade: 2 });
    AudioSys.setAmbience('waves', 0.6, 2);
    AudioSys.setAmbience('wind', def.ambience.wind || 0.2, 3);
    AudioSys.setAmbience('rain', def.ambience.rain || 0, 3);
    AudioSys.setAmbience('storm', def.ambience.storm || 0, 3);
    // entrées
    this.unsubs = [
      input.on('mousedown', (b, x, y) => { if (this.paused || this.pageOpen) return; night.mouseDown(b, x, y); }),
      input.on('mouseup', (b, x, y) => { if (this.paused || this.pageOpen) return; night.mouseUp(b, x, y); }),
      input.on('keydown', (k) => {
        if (k === 'Escape' || k === 'KeyP') { if (!this.pageOpen) this.togglePause(); }
        if (k === 'KeyM') { const m = AudioSys.toggleMute(); Save.options.muted = m; Save.save(); }
        if (Game.testMode) {
          if (k === 'F1') { this.toggleDebug(); }
          if (k === 'F2') { night.invulnerable = !night.invulnerable; night.notify(`Invulnérabilité ${night.invulnerable ? 'activée' : 'désactivée'}`, 'special'); }
          if (k === 'F3') { loop.timeScale = loop.timeScale === 1 ? 2 : 1; night.notify(`Vitesse ×${loop.timeScale}`, 'special'); }
          if (k === 'F4') { night.def.fog = night.def.fog > 0.3 ? 0.2 : (def.fog || 0.8); night.notify('Brouillard modifié', 'special'); }
          if (k === 'F5') { night.endNight(true, 'test'); }
        }
      }),
    ];
    this.debugEl = null;
    document.getElementById('stage').classList.add('playing');
  }

  exit() {
    for (const u of this.unsubs || []) u();
    this.hud && this.hud.destroy(); document.getElementById('hud').classList.remove('on');
    this.tutorial && this.tutorial.destroy(); document.getElementById('tutorial').classList.remove('on');
    document.getElementById('stage').classList.remove('playing');
    if (this.debugEl) { this.debugEl.remove(); this.debugEl = null; }
    loop.timeScale = 1;
    hideUI();
    this.night = null;
  }

  togglePause(force) {
    const n = this.night; if (!n || n.state === 'ended') return;
    this.paused = force !== undefined ? force : !this.paused;
    if (this.paused) {
      AudioSys.play('ui_open', { volume: 0.5 });
      showUI(buildPause({
        nightTitle: this.title,
        onResume: () => this.togglePause(false),
        onRestart: () => { scenes.go('night', { id: this.id }, { fade: 0.5 }); },
        onOptions: () => Game.showOptions(() => { showUI(buildPause({ nightTitle: this.title, onResume: () => this.togglePause(false), onRestart: () => scenes.go('night', { id: this.id }), onOptions: () => Game.showOptions(() => this.togglePause(true)), onMenu: () => scenes.go('menu') }), 'pause-wrap'); }),
        onMenu: () => scenes.go('menu'),
      }), 'pause-wrap');
    } else { hideUI(); AudioSys.play('ui_close', { volume: 0.5 }); }
  }

  showPage(page, isNew) {
    if (isNew) { const c = Save.campaign; if (!c.pagesRead.includes(page.id)) { c.pagesRead.push(page.id); Save.data.stats.pages++; Save.save(); } }
    this.pageQueue.push(page);
    if (!this.pageOpen) this.nextPage();
  }
  nextPage() {
    const page = this.pageQueue.shift();
    if (!page) { this.pageOpen = false; hideUI(); return; }
    this.pageOpen = true;
    const node = buildStory(pageScreen(page), { onDone: () => { node.destroy(); this.nextPage(); }, skippable: false });
    showUI(node, 'story-wrap page-wrap');
  }

  toggleDebug() {
    if (this.debugEl) { this.debugEl.remove(); this.debugEl = null; return; }
    this.debugEl = h('div', { class: 'debug' }); document.getElementById('app').appendChild(this.debugEl);
  }

  finish(result) {
    hideUI();
    Game.afterNight(result);
  }

  update(dt) {
    const n = this.night; if (!n) return;
    if (this.paused || this.pageOpen) { input.endFrame(); return; }
    n.update(dt, input);
    n.mouseMove(input.mouse.x, input.mouse.y);
    this.hud.update();
    this.tutorial.update(dt);
    if (this.debugEl) this.debugEl.textContent = `t=${n.t.toFixed(1)} state=${n.state} ships=${n.ships.length} particles=${n.particles.count} fps=${loop.fps} beam=${(n.beam.angle).toFixed(2)} tide=${n.weather.tide.toFixed(2)} wind=${n.weather.windMagnitude.toFixed(1)} oil=${n.beam.oil.toFixed(0)} inv=${n.invulnerable}`;
    input.endFrame();
  }
  render(ctx, alpha, dt) { if (this.renderer) this.renderer.render(ctx, alpha, dt); }
}

class ResultsScene {
  async enter({ result, def, newRecord }) {
    const win = result.win;
    AudioSys.playMusic(win || result.night === 'infinite' ? 'results' : 'defeat', { fade: 1.5 });
    AudioSys.setAmbience('rain', 0, 2); AudioSys.setAmbience('storm', 0, 2); AudioSys.setAmbience('wind', 0.2, 2);
    this.bg = scenes.scenes.get('menu');
    if (!this.bg.night) await this.bg.enterBackgroundOnly();
    showUI(buildResults({
      result, def, newRecord,
      onContinue: () => Game.afterResults(result),
      onRetry: () => Game.startNight(result.night === 'infinite' ? 'infinite' : result.night, { skipIntro: true }),
      onMenu: () => scenes.go('menu'),
    }), 'results-wrap');
  }
  exit() { hideUI(); }
  update(dt) { if (this.bg && this.bg.night) this.bg.update(dt); input.endFrame(); }
  render(ctx, alpha, dt) { if (this.bg && this.bg.renderer) { this.bg.renderer.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(4,10,20,0.5)'; ctx.fillRect(0, 0, W, H); } }
}

class WorkshopScene {
  async enter({ onContinue }) {
    AudioSys.playMusic('results', { fade: 1.5 });
    this.bg = scenes.scenes.get('menu');
    if (!this.bg.night) await this.bg.enterBackgroundOnly();
    showUI(buildWorkshop({ onContinue }), 'workshop-wrap');
  }
  exit() { hideUI(); }
  update(dt) { if (this.bg && this.bg.night) this.bg.update(dt); input.endFrame(); }
  render(ctx, alpha, dt) { if (this.bg && this.bg.renderer) { this.bg.renderer.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(4,10,20,0.5)'; ctx.fillRect(0, 0, W, H); } }
}

class EndingScene {
  async enter() {
    AudioSys.playMusic('ending', { fade: 2 });
    this.bg = scenes.scenes.get('menu');
    await this.bg.enterBackgroundOnly();
    this.bg.night.dawn = 1; this.bg.night.def.fog = 0.25;
    const node = buildCredits({ onBack: () => scenes.go('menu'), credits: Game.credits });
    node.classList.add('ending-credits');
    node.prepend(h('div', { class: 'ending-head' }, h('div', { class: 'res-kicker' }, 'Fin de la campagne'), h('p', {}, 'Merci d’avoir gardé le feu. La Veille infinie est désormais ouverte.')));
    showUI(node, 'credits-wrap');
  }
  exit() { hideUI(); }
  update(dt) { if (this.bg && this.bg.night) this.bg.update(dt); input.endFrame(); }
  render(ctx, alpha, dt) { if (this.bg && this.bg.renderer) { this.bg.renderer.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(40,30,20,0.35)'; ctx.fillRect(0, 0, W, H); } }
}

scenes.register('menu', new MenuScene());
scenes.register('story', new StoryScene());
scenes.register('night', new NightScene());
scenes.register('results', new ResultsScene());
scenes.register('workshop', new WorkshopScene());
scenes.register('ending', new EndingScene());

const loop = new Loop({
  update: (dt) => scenes.update(dt),
  render: (alpha, dt) => { scenes.render(ctx, alpha, dt); if (Game.fpsEl && Game.fpsEl.style.display !== 'none') Game.fpsEl.textContent = `${loop.fps} i/s`; },
});
window.FDB.loop = loop;

Game.boot().then(() => loop.start()).catch((e) => {
  console.error(e);
  const s = document.getElementById('boot-status'); if (s) s.textContent = 'Erreur de chargement : ' + e.message;
});
