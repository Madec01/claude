// Point d'entrée : chargement, scènes, boucle, flux de campagne de « Cent Saisons ».
import { Loop } from './core/loop.js';
import { Input } from './core/input.js';
import { Assets } from './core/assets.js';
import { AudioSys } from './core/audio.js';
import { Save } from './core/save.js';
import { RunSave } from './core/run.js';
import { Haptics } from './core/haptics.js';
import { SceneManager, wait } from './core/scenes.js';
import { ParticleSystem } from './core/particles.js';
import { Shake } from './core/shake.js';
import { Island } from './game/island.js';
import { IslandRenderer } from './game/render.js';
import { Camera } from './game/camera.js';
import { Effects } from './game/effects.js';
import { Hud } from './game/hud.js';
import { Tutorial } from './game/tutorial.js';
import { fromWorld, toWorld, key, DIRS } from './game/hex.js';
import { ISLANDS, INFINITE, GARDEN, getIsland, mechanicsUpTo } from './data/islands.js';
import { STORY } from './data/story.js';
import { BALANCE } from './data/balance.js';
import { buildMenu } from './ui/menu.js';
import { buildOptions } from './ui/options.js';
import { buildCredits, loadCredits } from './ui/credits.js';
import { buildGuide } from './ui/guide.js';
import { dailyDef, dailyKey, yesterdayKey } from './data/daily.js';
import { Finale } from './game/finale.js';
import { campaignIsland, campaignMechanics, islandOptions, CAMPAIGN_SIZE, MECH_AT, climateCardFor, unlockedUpTo, gateText } from './data/campaign.js';
import { GRADES, streakMilestone } from './game/feedback.js';
import { computeLinks } from './game/paths.js';
import { waterBodies } from './game/water.js';
import { buildStory, islandIntroScreens, islandMemoryScreens, prologueScreens, endingScreens, infiniteScreens, gardenScreens, dailyScreens } from './ui/story.js';
import { buildResults } from './ui/results.js';
import { buildWorkshop } from './ui/workshop.js';
import { buildAchievements, celebrate } from './ui/achievements.js';
import { buildWishesIntro } from './ui/wishes_intro.js';
import { buildIslandPrep } from './ui/island_prep.js';
import { buildContractPick } from './ui/contract.js';
import { contractNeeded, chooseContract, noteContractResult, contractLine, chapterOf } from './data/contracts.js';
import { applySemis } from './data/semis.js';
import { Achievements } from './game/achievements.js';
import { buildPause } from './ui/pause.js';
import { buildPostcard } from './ui/postcard.js';
import { Cloud, moreAdvanced, signInProblem } from './core/cloud.js';
import { buildSignIn } from './ui/signin.js';
import { buildCloudConflict } from './ui/cloud_conflict.js';
import { buildPrivacy } from './ui/privacy.js';
import { renderPostcard, postcardName } from './game/postcard.js';
import { h, showUI, hideUI } from './ui/dom.js';
import { STAGE, layoutStage, uiMargins, minZoom } from './core/stage.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
layoutStage();
const input = new Input(canvas, STAGE.W, STAGE.H);
let onResizeHook = null;
const scenes = new SceneManager();

function resize() {
  layoutStage();
  const dpr = STAGE.dpr;
  canvas.width = Math.round(STAGE.W * dpr); canvas.height = Math.round(STAGE.H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  input.setSize(STAGE.W, STAGE.H);
  if (onResizeHook) onResizeHook();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 80));
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize();

const SEASON_MUSIC = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };
// le printemps garde toujours « Morning » (préférence du commanditaire) ; les autres saisons alternent entre deux pistes
const seasonMusic = (season, nth = 1) => { const alt = `${SEASON_MUSIC[season]}_2`; return nth >= 2 && nth % 2 === 0 && AudioSys.has(alt, 'music') ? alt : SEASON_MUSIC[season]; };

/** Lignes du relevé de saison : les événements groupés par nature, avec les cases concernées. */
const SEASON_LABELS = { harvest: 'Récoltes', veillee: 'Veillée', pond: 'Étangs', fete: 'Fête', mill: 'Moulins', work: 'Ouvrages', level3: 'Niveau 3', fusion: 'Fusions', hunt: 'Chasse', firewood: 'Bois de chauffage', fair: 'Grande foire', mild: 'Hiver doux', cold: 'Grand froid', bloom: 'Marais en fleurs', heather: 'Lande en fleurs' };
function seasonLines(e, isl) {
  const by = new Map();
  for (const ev of e.events || []) { if (!ev.pts) continue; const k = ev.type === 'work' && ev.pts < 0 ? 'workBad' : ev.type; const g = by.get(k) || { label: k === 'workBad' ? 'Ouvrages mal placés' : (SEASON_LABELS[ev.type] || ev.type), pts: 0, cells: [] }; g.pts += ev.pts; g.cells.push({ q: ev.q, r: ev.r }); by.set(k, g); }
  const lines = [...by.values()];
  if (e.links) lines.push({ label: `Sentiers (${e.links})`, pts: e.links * BALANCE.points.pathSeason, cells: [] });
  if (e.faunaBonus) lines.push({ label: `Faune (${e.faunaBonus})`, pts: e.faunaBonus * (BALANCE.points.faunaSeason + (isl.mods.refuge || 0)), cells: [...isl.fauna.values()].map((a) => ({ q: a.q, r: a.r })) });
  const listed = lines.reduce((s, l) => s + l.pts, 0); const rest = (e.pts || 0) - listed;
  if (rest) lines.push({ label: 'Autres primes', pts: rest, cells: [] });
  return lines.sort((a, b) => b.pts - a.pts);
}

/** Les étincelles d'une saison : une par tuile qui rapporte (couleur selon la nature), les sentiers depuis leur milieu, la faune depuis chaque animal, le reste depuis le centre. */
const FLIGHT_COLORS = { harvest: '#e0a33a', bloom: '#d98cb3', vigil: '#f2c08a', level3: '#e0a33a', fusion: '#b8862b', work: '#2f9e8f', workBad: '#d95f4b', path: '#c9a26b', fauna: '#3a9c8a', other: '#e0a33a' };
function seasonFlights(e, isl) {
  const out = [];
  for (const ev of e.events || []) if (ev.pts) out.push({ q: ev.q, r: ev.r, pts: ev.pts, color: FLIGHT_COLORS[ev.type] || FLIGHT_COLORS.other });
  if (e.links) { const ls = computeLinks(isl.board).links; ls.forEach((l) => { const mid = l.cells[Math.floor(l.cells.length / 2)]; const [q, r] = mid.split(',').map(Number); out.push({ q, r, pts: BALANCE.points.pathSeason, color: FLIGHT_COLORS.path }); }); }
  if (e.faunaBonus) for (const a of isl.fauna.values()) { if (a.noBonus) continue; out.push({ q: a.q, r: a.r, pts: BALANCE.points.faunaSeason + (isl.mods.refuge || 0), color: FLIGHT_COLORS.fauna }); }
  const listed = out.reduce((a, f) => a + f.pts, 0); const rest = (e.pts || 0) - listed;
  if (rest) { let cq = 0, cr = 0, n = 0; for (const t of isl.board.tiles.values()) { cq += t.q; cr += t.r; n++; } out.push({ q: n ? cq / n : 0, r: n ? cr / n : 0, pts: rest, color: FLIGHT_COLORS.other }); }
  return out;
}

const Game = {
  credits: null, fpsEl: null,
  async boot() {
    const fill = document.getElementById('boot-fill'), status = document.getElementById('boot-status');
    const setP = (p, txt) => { fill.style.width = `${Math.round(p * 100)}%`; if (txt) status.textContent = txt; };
    Save.load();
    // rattrapage des sauvegardes déjà en cours : un joueur qui avait les étoiles de la porte sans avoir rejoué
    // l'île de bout de chapitre restait bloqué. Le déblocage se recalcule ici, une fois, au lancement.
    { const c = Save.data.campaign; const up = unlockedUpTo(c); if (up > c.unlockedIsland) { c.unlockedIsland = up; Save.save(); } }
    Achievements.init(Save); Achievements.testMode = () => !!Save.options.testMode; Achievements.onUnlock((a) => celebrate(a, { sound: () => AudioSys.play('achievement', { volume: 0.85 }) }));
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
    await this.bootCloud();
  },

  // ---- sauvegarde en ligne ----------------------------------------------------------------
  /** Au lancement : premier choix de connexion, ou reprise silencieuse, puis le menu. Ne bloque jamais le jeu. */
  async bootCloud() {
    const c = Save.data.cloud || (Save.data.cloud = { choice: null, uid: null });
    // retour d'une redirection Google : c'est ICI que la connexion se termine, pas sur l'écran de choix
    if (c.pending === 'google') {
      c.pending = null; Save.save();
      let u = null; try { u = await Cloud.resume(); } catch (e) { console.warn('nuage', e); }
      if (u) { Save.data.cloud = { ...Save.data.cloud, choice: 'google', uid: u.uid, pending: null }; Save.save(); scenes.go('menu', {}, { fade: 0 }); await this.syncFromCloud(); return; }
      // la redirection n'a rien rapporté : on le dit clairement au lieu de renvoyer le joueur dans la même boucle
      this.askSignIn(['La connexion Google n’a pas abouti.', signInProblem(Cloud.error)].filter(Boolean).join(' ') + ' Tu peux réessayer, ou jouer sans compte : rien ne sera perdu.');
      return;
    }
    if (!c.choice) { this.askSignIn(); return; }
    if (c.choice === 'none') { scenes.go('menu', {}, { fade: 0 }); return; }
    scenes.go('menu', {}, { fade: 0 });
    try { const u = await Cloud.resume(); if (u) await this.syncFromCloud(); } catch (e) { console.warn('nuage', e); }
  },

  /** Le premier écran : sans compte, avec Google, ou hors ligne. Le choix est retenu. */
  askSignIn(warn = null) {
    const done = (choice) => { Save.data.cloud = { ...(Save.data.cloud || {}), choice, uid: Cloud.user ? Cloud.user.uid : null, pending: null }; Save.save(); };
    const panel = buildSignIn({
      warn,
      onGoogle: async () => {
        // la fenêtre surgissante d'abord ; si elle est bloquée, le SDK redirige et note le choix AVANT de quitter la page
        const r = await Cloud.signInGoogle({ beforeRedirect: () => { const c = Save.data.cloud || (Save.data.cloud = {}); c.pending = 'google'; Save.save(); } });
        if (r === 'redirect') return null;   // la page part chez Google : la suite se passe dans bootCloud()
        if (!r) return ['La connexion Google a échoué.', signInProblem(Cloud.error)].filter(Boolean).join(' ') + ' Tu peux réessayer, ou jouer sans compte : rien ne sera perdu.';
        done('google'); hideUI(); scenes.go('menu', {}, { fade: 0.3 }); await this.syncFromCloud(r && r.conflict);
        return null;
      },
      onAnon: async () => {
        const u = await Cloud.signInAnonymous();
        if (!u) return 'La connexion a échoué. Tu peux jouer hors ligne : rien ne sera perdu.';
        done('anon'); hideUI(); scenes.go('menu', {}, { fade: 0.3 }); await this.syncFromCloud();
        return null;
      },
      onNone: async () => { done('none'); hideUI(); scenes.go('menu', {}, { fade: 0.3 }); return null; },
      onPrivacy: () => this.showPrivacy(() => this.askSignIn()),
    });
    showUI(panel, 'panel-wrap');
  },

  /** Une lecture, une seule. Si les deux parties diffèrent, le joueur choisit ; sinon on garde la plus avancée. */
  async syncFromCloud(forceAsk = false) {
    if (!Cloud.user) return;
    const remote = await Cloud.fetch();
    if (!remote || !remote.data) { await this.pushCloud({ force: true }); return; }
    const local = Save.data;
    const diff = moreAdvanced(local, remote.data);
    const localEmpty = (local.campaign.islandsPlayed || 0) === 0 && (local.campaign.unlockedIsland || 1) <= 1;
    if (localEmpty && !forceAsk) { this.adoptCloud(remote.data); return; }
    if (diff === 0 && !forceAsk) return;                       // rigoureusement la même avancée : rien à faire
    if (diff > 0 && !forceAsk) { await this.pushCloud({ force: true }); return; }   // l'appareil est en avance : on envoie
    showUI(buildCloudConflict({
      local, remote: remote.data, localAt: Save.data.savedAt || (Save.data.backup && Save.data.backup.lastAt) || null, remoteAt: remote.at,
      onKeepLocal: async () => { hideUI(); await this.pushCloud({ force: true }); this.toast('Ta partie de cet appareil est gardée.'); },
      onKeepRemote: () => { hideUI(); this.adoptCloud(remote.data); this.toast('La partie en ligne est reprise.'); },
    }), 'panel-wrap');
  },

  adoptCloud(data) { const opts = Save.data.options, cl = Save.data.cloud; Save.data = data; Save.data.options = opts; Save.data.cloud = cl; Save.save(); RunSave.clear(); this.showMenu(); },   // on prend la partie du nuage : la partie en cours de cet appareil ne s'y rattache plus

  /** Envoi de la sauvegarde. Appelé UNIQUEMENT à la fin d'une île et sur demande : jamais pendant une partie. */
  async pushCloud(opts = {}) {
    if (!Cloud.enabled || !Cloud.user) return null;
    const r = await Cloud.push(Save.data, opts);
    if (r && r.ok && Save.data.options.testMode) this.toast(`Nuage : écriture ${Cloud._session}/${Cloud.status().budget.session}`);
    return r;
  },

  showPrivacy(onBack) {
    this.showPanel(buildPrivacy({ onBack: onBack || (() => this.showMenu()),
      onWipe: Cloud.user ? async () => { const ok = await Cloud.wipe(); this.toast(ok ? 'Tes données en ligne sont effacées.' : 'Impossible d’effacer pour l’instant.'); } : null }));
  },
  showPanel(node) { showUI(node, 'panel-wrap'); },
  showMenu() { scenes.go('menu', {}, { fade: 0.25 }); },
  showOptions(onBack) { this.showPanel(buildOptions({ onBack: onBack || (() => this.showMenu()), game: this })); },
  showGuide(onBack) { this.showPanel(buildGuide({ onBack: onBack || (() => this.showMenu()) })); },
  showCredits(onBack) { this.showPanel(buildCredits({ onBack: onBack || (() => this.showMenu()), credits: this.credits })); },
  showAchievements(onBack) { this.showPanel(buildAchievements({ onBack: onBack || (() => this.showMenu()) })); },
  toggleFullscreen() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!req) { this.toast(navigator.standalone ? 'Le jeu est déjà en plein écran.' : 'Plein écran indisponible dans ce navigateur. Sur iPhone : Partager → « Sur l’écran d’accueil », puis lancez le jeu depuis l’icône.'); return; }
    if (!isFs()) { const r = req.call(el); if (r && r.catch) r.catch(() => this.toast('Le plein écran a été refusé par le navigateur.')); }
    else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    setTimeout(resize, 150); setTimeout(resize, 600);
  },
  toast(msg, ms = 4200) {
    const stage = document.getElementById('stage');
    stage.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = h('div', { class: 'toast' }, msg); stage.appendChild(t); setTimeout(() => t.remove(), ms);
  },
  onResize() {
    const m = scenes.scenes.get('menu'); if (m && m.bg) m.bg.refit();
    if (scenes.current && scenes.current.onResize) scenes.current.onResize();
  },
  setFpsVisible(v) { if (!this.fpsEl) { this.fpsEl = h('div', { class: 'fps' }); document.getElementById('app').appendChild(this.fpsEl); } this.fpsEl.style.display = v ? 'block' : 'none'; },
  setTestMode() { if (scenes.currentName === 'menu') this.showOptions(); },
  onSaveReset() { RunSave.clear(); },   // la progression effacée emporte la partie en cours
  get testMode() { return !!Save.options.testMode; },

  // ----- Flux -----
  startCampaign() {
    const c = Save.campaign;
    if (c.completed) { c.unlockedIsland = 1; c.completed = false; Save.save(); }
    const id = Math.min(c.unlockedIsland, CAMPAIGN_SIZE);
    if (!c.prologueSeen && id === 1) scenes.go('story', { screens: prologueScreens(), onDone: () => { c.prologueSeen = true; Save.save(); this.startIsland(1); } });
    else this.startIsland(id);
  },
  startIsland(id, { skipIntro = false } = {}) {
    const def = campaignIsland(id); const cc = climateCardFor(def.id); def.introduces = [...(cc ? [cc] : []), ...(MECH_AT[def.id] || []).filter((m) => !(cc && m === 'climate'))];   // la carte de climat d'abord (elle n'attend rien), la carte générique cède la place à la carte du climat
    if (skipIntro) { this.prepIsland(def); return; }
    scenes.go('story', { screens: islandIntroScreens(def), onDone: () => this.prepIsland(def) });
  },
  /** Semis et vœux avant la première pose ; sans rien à choisir ni à lire, l'île démarre directement. */
  prepIsland(def) {
    // contrat d'archipel : à l'entrée d'un chapitre (dès le deuxième), avant le semis et les vœux
    if (!def.daily && typeof def.id === 'number' && contractNeeded(Save.campaign, def.id)) {
      const ch = chapterOf(def.id);
      this.showPanel(buildContractPick({ chapter: ch, onPick: (id) => { chooseContract(Save.campaign, ch, id); Save.save(); AudioSys.play('chalk', { volume: 0.55 }); AudioSys.play('ui_confirm', { volume: 0.35 }); this.prepIsland(def); } }));
      return;
    }
    const contract = !def.daily && typeof def.id === 'number' ? contractLine(Save.campaign, chapterOf(def.id)) : null;
    const semis = !!(def.mech && def.mech.has('semis')) && !def.daily;
    const go = (semisId) => { const d2 = semisId && semisId !== 'saisons' ? { ...def, weights: applySemis(def.weights, semisId), semis: semisId } : def; hideUI(); scenes.go('island', { def: d2, skipWishes: true }, { fade: 0.5 }); };
    if (!semis && !(def.wishes && def.wishes.length) && !contract) { go(null); return; }
    this.showPanel(buildIslandPrep({ def, semis, contract, onStart: (id) => { AudioSys.play('ui_confirm', { volume: 0.5 }); go(id); } }));
  },
  // ----- Partie en cours gardée sur l'appareil -----
  /** De quoi retrouver l'île plus tard : le strict nécessaire pour la reconstruire à l'identique. */
  whereOf(def) {
    if (!def) return null;
    if (def.garden) return { kind: 'garden' };
    if (def.infinite) return { kind: 'infinite' };
    if (def.daily) return { kind: 'daily', date: def.date };
    return { kind: 'campaign', id: def.id, semis: def.semis || null };
  },
  /** Reconstruit la définition d'île rangée par `whereOf`. Rend null si elle n'a plus de sens (l'île du jour a changé de jour). */
  defFromWhere(w) {
    if (!w) return null;
    if (w.kind === 'garden') return GARDEN;
    if (w.kind === 'infinite') return INFINITE;
    if (w.kind === 'daily') return w.date === dailyKey() ? dailyDef(w.date) : null;
    if (w.kind === 'campaign') {
      const def = campaignIsland(w.id); def.introduces = [];
      return w.semis && w.semis !== 'saisons' ? { ...def, weights: applySemis(def.weights, w.semis), semis: w.semis } : def;
    }
    return null;
  },
  /** Reprend la partie laissée en plan. */
  resumeRun() {
    const d = RunSave.read();
    const def = d && this.defFromWhere(d.where);
    if (!def) { RunSave.clear(); this.toast('Cette partie ne peut plus être reprise.'); this.showMenu(); return; }
    hideUI();
    scenes.go('island', { def, skipWishes: true, resume: d.isl }, { fade: 0.5 });
  },
  startInfinite() { scenes.go('story', { screens: infiniteScreens(), onDone: () => scenes.go('island', { def: INFINITE }, { fade: 0.5 }) }); },
  startDaily() { const def = dailyDef(); scenes.go('story', { screens: dailyScreens(def), onDone: () => this.prepIsland(def) }); },
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
    if (def.daily) {
      const d = Save.data.daily, today = def.date, prev = d.best[today] || 0;
      if (!test) {
        if (result.score > prev) { d.best[today] = result.score; newRecord = prev > 0; }
        const h = d.history.filter((x) => x.date !== today); h.unshift({ date: today, score: Math.max(prev, result.score), stars: result.stars }); d.history = h.slice(0, 30);
        if (d.lastPlayed !== today) d.streak = d.lastPlayed === yesterdayKey(today) ? (d.streak || 0) + 1 : 1;
        d.lastPlayed = today; Save.save(); Achievements.onDaily();
      }
      scenes.go('results', { result, def, newRecord, daily: { best: Math.max(prev, result.score), streak: d.streak || 0 } });
      return;
    }
    if (!test) {
      c.islandsPlayed++;
      // une partie terminée compte pour l'île : c'est elle qui ouvre la suivante, et la patience ouvre la porte du chapitre
      c.plays = c.plays || {}; c.plays[def.id] = (c.plays[def.id] || 0) + 1;
      Save.data.stats.placements += result.placements; Save.data.stats.closed += result.stats.closed; Save.data.stats.wishes += result.wishesDone;
      const prevStars = c.stars[def.id] || 0;
      c.stars[def.id] = Math.max(prevStars, result.stars);
      const ctr = noteContractResult(c, def.id, result); if (ctr) result.contract = ctr;
      const prevGold = !!(c.gold && c.gold[def.id]); if (result.gold) { c.gold = c.gold || {}; c.gold[def.id] = true; }
      if (result.score > (c.best[def.id] || 0)) { newRecord = !!c.best[def.id]; c.best[def.id] = result.score; }
      // graines : étoiles nouvelles + vœux + île terminée la première fois
      const firstTime = !c.memoriesRead.includes(def.id);
      seedsGained = Math.max(0, result.stars - prevStars) * (BALANCE.seeds.star + (c.upgrades.evening || 0)) + (result.gold && !prevGold ? 1 : 0) + (firstTime ? result.wishesDone * BALANCE.seeds.wish + BALANCE.seeds.island : 0) + (BALANCE.upgrades.almanac[c.upgrades.almanac || 0] || 0);
      c.seeds += seedsGained; c.seedsTotal += seedsGained;
      // déblocage recalculé depuis les étoiles : l'étoile qui manquait à la porte compte même si on l'a décrochée
      // sur une île déjà jouée. `Math.max` pour ne jamais retirer ce qui était ouvert (mode test, anciennes sauvegardes).
      c.unlockedIsland = Math.max(c.unlockedIsland, unlockedUpTo(c));
      if (def.id === CAMPAIGN_SIZE) { c.completed = true; Save.data.infinite.unlocked = true; }
      if (def.id >= 10) Save.data.infinite.unlocked = true;
      Save.noteIslandDone();
      Save.save();
      Achievements.onCampaignResult(result, def);
      this.pushCloud();   // une écriture par île terminée, jamais pendant la partie
    }
    scenes.go('results', { result, def, newRecord, seedsGained });
  },
  /** Après l'import d'une sauvegarde : retour au menu, à jour. */
  onBackup() { Achievements.onBackup(); },
  onSaveLoaded() { this.showMenu(); this.toast('Sauvegarde chargée. Bon retour sur l’archipel.'); },
  /** Rappel de copie locale, à la fin d'une île de campagne. */
  remindBackup() { if (Save.backupDue() && !this.testMode) this.toast('Pense à télécharger une copie de ta sauvegarde : Options → Sauvegarde.', 6500); },
  afterResults(result, def) {
    if (def.infinite) { this.startInfinite(); return; }
    if (def.garden) { this.startGarden(); return; }
    if (def.daily) { this.showMenu(); return; }
    const c = Save.campaign;
    const memory = islandMemoryScreens(def, result);
    // Terminer une île suffit : elle ouvre la suivante et livre sa mémoire, avec ou sans étoile. Les étoiles
    // ne gardent plus que les portes de chapitre — et une porte a deux clés (voir gateOpen).
    const next = () => {
      if (def.id === CAMPAIGN_SIZE) { scenes.go('story', { screens: endingScreens(), skippable: false, onDone: () => scenes.go('ending') }); return; }
      scenes.go('workshop', { onContinue: () => { if (c.unlockedIsland > def.id) this.startIsland(def.id + 1); else { this.showMenu(); const t = gateText(c, Math.ceil(def.id / 5)); if (t) this.toast(t, 7000); } } });
    };
    if (!c.memoriesRead.includes(def.id)) { c.memoriesRead.push(def.id); Save.save(); }
    this.remindBackup();
    scenes.go('story', { screens: memory, onDone: next });
  },
};
window.CS = { Game, Save, scenes, AudioSys, ISLANDS, BALANCE, STORY, STAGE, input, campaignIsland, Cloud };
onResizeHook = () => Game.onResize();

// ---------- Scène de fond : une île qui se construit toute seule ----------
class AmbientIsland {
  constructor(defId = 4) {
    const def = { ...getIsland(defId), id: 'ambient', wishes: [], start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 2, r: -1, family: 'rock' }] };
    this.isl = new Island(def, { upgrades: {} });
    this.cam = new Camera(); this.cam.fit(this.isl.board.mask, { ...uiMargins('ambient'), immediate: true });
    this.particles = new ParticleSystem(600); this.fx = new Effects(this.particles);
    this.renderer = new IslandRenderer(this.isl, this.cam, this.fx, this.particles);
    this.timer = 1.2;
    this.isl.on((e) => { if (e.type === 'place') this.fx.drop(key(e.q, e.r)); if (e.type === 'season') this.renderer.startTransition(e.from, e.to); if (e.type === 'fauna') this.fx.fauna(`${e.species}@${e.regionId}`, e.kind); });
  }
  refit() { this.cam.fit(this.isl.board.mask, uiMargins('ambient')); }
  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 1.0;
      if (this.isl.ended) { const def = this.isl.def; this.isl = new Island({ ...def, seed: def.seed + Math.floor(Math.random() * 1000) }, { upgrades: {} }); this.renderer.isl = this.isl; this.cam.fit(this.isl.board.mask, uiMargins('ambient')); this.isl.on((e) => { if (e.type === 'place') this.fx.drop(key(e.q, e.r)); if (e.type === 'season') this.renderer.startTransition(e.from, e.to); if (e.type === 'fauna') this.fx.fauna(`${e.species}@${e.regionId}`, e.kind); }); }
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
  bounds() { const c = this.cam; const tl = c.toWorldPoint(0, 0), br = c.toWorldPoint(STAGE.W, STAGE.H); return { minX: tl.x, maxX: br.x, minY: tl.y, maxY: br.y }; }
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
  render(ctx, alpha, dt) { this.bg.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(244,239,230,0.45)'; ctx.fillRect(0, 0, STAGE.W, STAGE.H); }
}

// ---------- Scène de jeu ----------
class IslandScene {
  async enter({ def, skipWishes = false, resume = null }) {
    hideUI();
    this.def = def;
    const upgrades = Save.campaign.upgrades;
    const mech = def.mech ? new Set(def.mech) : campaignMechanics(99);
    if (Game.testMode) for (const m of ['river', 'season', 'fauna', 'wish', 'breath', 'rare', 'build', 'fuse', 'work', 'build3']) mech.add(m);
    this.mech = mech;
    const opt = islandOptions({ mech }); const isl = new Island(def, { upgrades, ...opt, known: new Set(Save.data.campaign.recipes || []) });
    // reprise : l'île retrouve exactement l'état laissé (plateau, file de tuiles, saison, score, vœux)
    this.resumed = !!(resume && isl.restoreRun(resume));
    if (resume && !this.resumed) { RunSave.clear(); Game.toast('Cette partie ne peut plus être reprise : on repart du début de l’île.'); }
    if (!this.resumed) RunSave.clear();   // une nouvelle île remplace la partie gardée
    this.isl = isl;
    this.runDirty = false; this.runTimer = 0;
    this.cam = new Camera(); this.cam.fit(isl.board.mask, { ...uiMargins('island'), immediate: true });
    this.armed = null;   // tactile : case « armée » (aperçu affiché) en attente d'une seconde touche
    this.particles = new ParticleSystem(1500); this.fx = new Effects(this.particles); this.shake = new Shake(); this.shake.enabled = Save.options.shake !== false;
    this.renderer = new IslandRenderer(isl, this.cam, this.fx, this.particles);
    this.paused = false; this.budMode = false; this.endTimer = 0; this.finished = false; this.finale = null;
    const name = def.story && STORY.islands[def.story] ? STORY.islands[def.story].name : def.infinite ? 'Île infinie' : def.garden ? 'Jardin' : (def.name || 'Île');
    this.title = name;
    this.hud = new Hud(document.getElementById('hud'), isl, {
      title: name, mechanics: mech,
      onPause: () => this.togglePause(),
      onSwap: (i) => { if (isl.swap(i)) AudioSys.play('tile_swap', { volume: 0.6 }); else AudioSys.play('ui_error', { volume: 0.4 }); },
      onPick: (i) => { if (isl.pick(i)) { AudioSys.play('tile_swap', { volume: 0.5 }); this.tutorial.onEvent('hand'); } },
      onCloseSeason: () => { if (isl.closeSeason()) AudioSys.play('ui_confirm', { volume: 0.5 }); },
      onDiscard: () => { if (isl.discard()) AudioSys.play('tile_discard', { volume: 0.6 }); else AudioSys.play('ui_error', { volume: 0.4 }); },
      onBud: () => this.setBud(!this.budMode),
      onUndo: () => { if (isl.undo()) { AudioSys.play('tile_undo', { volume: 0.6 }); this.hud.notify('Souvenir : la dernière pose est annulée', 'info'); } else AudioSys.play('ui_error', { volume: 0.4 }); },
      onPocket: () => { if (isl.toPocket()) AudioSys.play('tile_pocket', { volume: 0.6 }); },
      onPocketOut: (i) => { if (isl.fromPocket(i)) AudioSys.play('tile_pocket', { volume: 0.6 }); },
      onShed: () => { if (isl.toShed()) AudioSys.play('tile_pocket', { volume: 0.6 }); },
      onShedOut: (i) => { if (isl.fromShed(i)) AudioSys.play('tile_pocket', { volume: 0.6 }); },
      onGardenPick: (fam) => { isl.setGardenTile(fam); AudioSys.play('ui_click', { volume: 0.4 }); },
      onPlace: () => this.placeArmed(),
      onBudChoice: (fam) => { if (this.budMode && this.budTarget && isl.bud(this.budTarget.q, this.budTarget.r, fam)) this.setBud(false); },
      onBudCancel: () => this.setBud(false),
      onFullscreen: () => Game.toggleFullscreen(),
      compact: STAGE.compact,
    });
    document.getElementById('hud').classList.add('on');
    this.tutorial = new Tutorial(document.getElementById('tutorial'), isl, def, !Save.options.skipTutorial && !def.infinite && !def.garden);
    // les vœux se présentent avant la première pose (un bouton pour commencer), sauf en reprise sans intro
    this.hold = false;
    if (isl.wishes.length && !def.garden && !skipWishes && !this.resumed) { this.hold = true; showUI(buildWishesIntro({ island: isl, onStart: () => { hideUI(); this.hold = false; AudioSys.play('ui_confirm', { volume: 0.5 }); } }), 'panel-wrap'); }
    document.getElementById('tutorial').classList.add('on');
    isl.on((e) => this.onEvent(e));
    isl.on((e) => { if (!Game.testMode) Achievements.onIslandEvent(e, isl); });
    // audio
    this.seasonCount = { [isl.season]: 1 };
    AudioSys.playMusic(def.garden ? 'garden' : def.daily && AudioSys.has('daily', 'music') ? 'daily' : seasonMusic(isl.season, 1), { fade: 2 });
    this.updateAmbience(true);
    AudioSys.play('island_start', { volume: 0.6 });
    // entrées
    this.drag = null;
    this.unsubs = [
      input.on('mousedown', (b, x, y) => this.onMouseDown(b, x, y)),
      input.on('mouseup', (b, x, y) => this.onMouseUp(b, x, y)),
      input.on('wheel', (dy) => { if (this.paused) return; this.cam.zoomBy(dy > 0 ? 0.9 : 1.1, input.mouse.x, input.mouse.y); }),
      input.on('keydown', (k) => this.onKey(k)),
      input.on('tap', (x, y) => this.onTap(x, y)),
      input.on('pan', (dx, dy) => { if (!this.paused) this.cam.pan(dx, dy); }),
      input.on('pinch', (f, cx, cy) => { if (!this.paused) this.cam.zoomBy(f, cx, cy); }),
    ];
    // l'application passe en arrière-plan (onglet caché, téléphone verrouillé, appel) : on range la partie tout de suite
    this.onHide = () => { if (document.visibilityState === 'hidden') this.saveRun(true); };
    this.onLeave = () => this.saveRun(true);
    document.addEventListener('visibilitychange', this.onHide);
    window.addEventListener('pagehide', this.onLeave);
    window.addEventListener('blur', this.onLeave);
    document.getElementById('stage').classList.add('playing');
    if (this.resumed) { this.hud.notify('Partie reprise là où vous l’aviez laissée', 'info'); this.saveRun(true); }
  }

  /** Range la partie en cours (appareil seulement, jamais en ligne). */
  saveRun(now = false) {
    const isl = this.isl;
    if (!isl || isl.ended || this.finished || this.finale || Game.testMode) return;
    if (!now && !this.runDirty) return;
    this.runDirty = false; this.runTimer = 0;
    RunSave.write(Game.whereOf(this.def), isl, this.title);
  }

  exit() {
    this.saveRun(true);
    document.removeEventListener('visibilitychange', this.onHide);
    window.removeEventListener('pagehide', this.onLeave);
    window.removeEventListener('blur', this.onLeave);
    for (const u of this.unsubs || []) u();
    this.hud && this.hud.destroy(); document.getElementById('hud').classList.remove('on');
    this.tutorial && this.tutorial.destroy(); document.getElementById('tutorial').classList.remove('on');
    document.getElementById('stage').classList.remove('playing');
    if (this.debugEl) { this.debugEl.remove(); this.debugEl = null; }
    hideUI(); this.isl = null;
  }

  updateAmbience(immediate = false) {
    // le paysage sonore lit l'île : les oiseaux suivent la forêt et les vergers, le ruisseau les rivières, les grillons les prés et les champs en été,
    // le vent la roche, les collines et la lande, la mer le sable et les rives
    const isl = this.isl; const b = isl.board;
    const n = {}; let total = 0; for (const t of b.tiles.values()) { n[t.family] = (n[t.family] || 0) + 1; total++; }
    const c = (f) => n[f] || 0; const share = (...fs) => total ? fs.reduce((a, f) => a + c(f), 0) / total : 0;
    const rivers = waterBodies(b).filter((w) => w.kind === 'river').reduce((a, w) => a + (w.cells ? w.cells.length : w.size || 0), 0) + c('cascade');
    const s = isl.season;
    const fade = immediate ? 1 : 3;
    AudioSys.setAmbience('birds', s === 'winter' ? 0.06 + share('forest') * 0.1 : Math.min(0.65, 0.12 + (c('forest') + c('orchard') * 0.6) * 0.04), fade);
    AudioSys.setAmbience('stream', Math.min(0.45, rivers * 0.06 + c('water') * 0.01), fade);
    AudioSys.setAmbience('wind', (s === 'autumn' ? 0.3 : s === 'winter' ? 0.2 : 0.08) + share('rock', 'hill', 'heath') * 0.5, fade);
    AudioSys.setAmbience('winter', s === 'winter' ? 0.4 : 0, fade);
    AudioSys.setAmbience('crickets', s === 'summer' ? Math.min(0.6, 0.15 + share('meadow', 'field') * 0.9) : 0, fade);
    AudioSys.setAmbience('sea', 0.18 + share('sand') * 0.6, fade);
    const w = isl.weatherActive && isl.weather && isl.weather.phase === 'active' ? isl.weather.key : null;
    AudioSys.setAmbience('rain', w === 'storm' ? 0.55 : 0, fade);
    if (AudioSys.has('storm', 'ambience')) AudioSys.setAmbience('storm', w === 'storm' ? 0.6 : 0, fade);
    if (w === 'wind') AudioSys.setAmbience('wind', 0.7, fade);
    if (w === 'blizzard') { AudioSys.setAmbience('winter', 0.8, fade); AudioSys.setAmbience('wind', 0.5, fade); }
    if (w === 'heat') AudioSys.setAmbience('crickets', 0.6, fade);
    if (w === 'thaw') AudioSys.setAmbience('stream', 0.5, fade);
  }

  /** Cartes qui n'ont pas d'île attitrée : premier sentier, première rivière qui se jette dans un lac (une fois par joueur). */
  checkDiscoveryCards() {
    const seen = Save.data.seen || (Save.data.seen = {}); const b = this.isl.board;
    if (!seen.paths && computeLinks(b).links.length > 0) { seen.paths = true; Save.save(); this.tutorial.pushCard('paths', STORY.mechCards.paths); }
    if (!seen.riverLake && waterBodies(b).some((w) => w.fedBy)) { seen.riverLake = true; Save.save(); this.tutorial.pushCard('riverLake', STORY.mechCards.riverLake); }
  }
  onEvent(e) {
    const isl = this.isl, fx = this.fx;
    this.runDirty = true;
    if (e.type === 'place') {
      if (!this.isl.garden) this.checkDiscoveryCards();
      const w = toWorld(e.q, e.r);
      fx.drop(key(e.q, e.r));
      fx.placeBurst(w.x, w.y, e.result.total > 0);
      this._closeN = 0; this._lastPlaced = { q: e.q, r: e.r };
      AudioSys.play(`tile_place_${1 + Math.floor(Math.random() * 4)}`, { volume: 0.7, rate: 0.96 + Math.random() * 0.08 });   // jamais deux fois la même hauteur
      setTimeout(() => AudioSys.play('tile_bounce', { volume: 0.25 }), 90);   // la tuile tombe, puis se cale
      let i = 0;
      for (const ed of e.result.edges) { const nw = toWorld(ed.q, ed.r); const mx = (w.x + nw.x) / 2, my = (w.y + nw.y) / 2; setTimeout(() => fx.floatText(mx, my, `${ed.pts > 0 ? '+' : ''}${ed.pts}`, ed.pts > 0 ? '#2f9e8f' : '#d95f4b', 18, 1.1), 90 * i); i++; }
      // le son du coup : une note par point marqué, sur une gamme qui monte avec la série ; une note grave si le coup coûte
      // sobres (par défaut sur téléphone) : trois notes au plus, quatre sur un beau coup, volume décroissant — une pose ne dure plus une seconde de musique
      { const total = e.result.total; const base = Math.min(3, Math.max(0, (e.streak || 0) - 1));
        const mode = Save.options.notes || 'auto'; const sober = mode === 'sober' || (mode === 'auto' && STAGE.compact);
        const n = sober ? Math.min(e.grade === 'master' || e.grade === 'good' ? 4 : 3, Math.ceil(Math.max(0, total) / 3)) : Math.min(8, total);
        for (let j = 0; j < n; j++) setTimeout(() => AudioSys.play(`point_${Math.min(8, base + j + 1)}`, { volume: sober ? 0.42 - j * 0.06 : 0.42 }), 70 * j);
        if (total < 0) AudioSys.play('point_bad', { volume: 0.45 }); }
      for (const bs of e.result.base) { setTimeout(() => fx.floatText(w.x, w.y + 30, `+${bs.pts} ${bs.label}`, '#5aa7d6', 18, 1.2), 90 * i++); if (bs.label === 'rivière') this.tutorial.onEvent('river'); }
      if (e.result.total !== 0) setTimeout(() => fx.floatText(w.x, w.y - 40, `${e.result.total > 0 ? '+' : ''}${e.result.total}`, e.result.total > 0 ? '#2b2a26' : '#d95f4b', 26, 1.4), 90 * i + 60);
      // commentaire du coup, série et paliers de score
      if (e.result.blight) { setTimeout(() => { this.hud.ribbon('En friche : cette tuile ne rapportera plus rien', '#d95f4b', 2200, 'bad'); AudioSys.play('point_bad', { volume: 0.5 }); }, 90 * i + 380); const seen = Save.data.seen || (Save.data.seen = {}); if (!seen.blight) { seen.blight = true; Save.save(); this.tutorial.pushCard('blight', STORY.mechCards.blight); } }
      if (e.grade && GRADES[e.grade]) {
        const g = GRADES[e.grade]; const texts = STORY.verdicts[e.grade]; const txt = texts[Math.floor(Math.random() * texts.length)];
        setTimeout(() => {
          // les mots vont dans le ruban sous la saison ; seuls les chiffres restent sur la case
          this.hud.ribbon(e.grade === 'meh' && e.best > e.result.total ? `${txt} (+${e.best} possible)` : txt, g.color, e.grade === 'master' ? 1900 : 1400, e.grade);
          if (g.burst) fx.closeBurst(w.x, w.y - 20, g.burst);
          if (e.grade === 'master') { AudioSys.play('star_1', { volume: 0.6 }); this.shake.trigger(0.12); Haptics.tap([10, 30, 10]); }
          if (g.streak && streakMilestone(e.streak)) { const st = STORY.verdicts.streak; setTimeout(() => { this.hud.ribbon((st[e.streak] || st.default).replace('{n}', e.streak), '#e0a33a', 1800, 'streak'); AudioSys.play('region_close', { volume: 0.5 }); fx.closeBurst(w.x, w.y - 60, 5); }, 250); }
        }, 90 * i + 380);
        this.hud.bumpScore(e.result.total);
      }
      if (e.milestone) setTimeout(() => { this.hud.notify(STORY.verdicts.milestone.replace('{n}', e.milestone), 'gold'); AudioSys.play('star_2', { volume: 0.5 }); }, 90 * i + 700);
      if (isl.season === 'winter') { const pts = []; for (const o of this.renderer.decor.objects) if (o.tpl && o.tpl.startsWith('obj_tree') && Math.hypot(o.x - w.x, o.y - w.y) < 150 && Math.hypot(o.x - w.x, o.y - w.y) > 50) pts.push({ x: o.x, y: o.y }); if (pts.length) fx.snowShake(pts.slice(0, 10)); }
      if (e.restoredFrom) this.hud.notify(`La ruine restaurée devient : ${(STORY.tiles[e.tile.family] || {}).name || e.tile.family}`, 'rare');
      if (e.market) this.hud.notify(`Marché : choisis ta tuile pour les ${e.market} prochaines poses`, 'gold');
      if (e.tile.rare) this.tutorial.onEvent('rare');
      if (e.tile.family === 'hill' || e.tile.family === 'heath') this.tutorial.onEvent(e.tile.family);
      this.updateAmbience();
    } else if (e.type === 'build') {
      const w = toWorld(e.q, e.r);
      fx.drop(key(e.q, e.r)); fx.placeBurst(w.x, w.y, true); fx.closeBurst(w.x, w.y - 10, 4);
      this._closeN = 0; this._lastPlaced = { q: e.q, r: e.r };
      AudioSys.play(`tile_place_${1 + Math.floor(Math.random() * 4)}`, { volume: 0.7, rate: 0.96 + Math.random() * 0.08 }); setTimeout(() => AudioSys.play('tile_bounce', { volume: 0.25 }), 90); AudioSys.play('region_close', { volume: 0.45 });
      let i = 0;
      for (const ed of e.result.edges) { const nw = toWorld(ed.q, ed.r); const mx = (w.x + nw.x) / 2, my = (w.y + nw.y) / 2; setTimeout(() => { fx.floatText(mx, my, `${ed.pts > 0 ? '+' : ''}${ed.pts}`, ed.pts > 0 ? '#2f9e8f' : '#d95f4b', 18, 1.1); if (ed.pts > 0) AudioSys.play(`point_${Math.min(8, i + 1)}`, { volume: 0.45 }); }, 90 * i); i++; }
      const fam = (STORY.tiles[e.family] || {}).name || e.family;
      if (e.kind === 'work') {
        const wt = (e.good ? STORY.work.good : STORY.work.bad)[Math.floor(Math.random() * 3)];
        setTimeout(() => { fx.floatText(w.x, w.y - 44, `${e.result.total >= 0 ? '+' : ''}${e.result.total}`, e.good ? '#2f9e8f' : '#d95f4b', 24, 1.6); this.hud.ribbon(`${wt} ${fam}`, e.good ? '#2f9e8f' : '#d95f4b', 1500, e.good ? 'good' : 'bad'); this.hud.bumpScore(e.result.total); if (e.good) { fx.closeBurst(w.x, w.y - 10, 3); AudioSys.play('point_8', { volume: 0.5 }); } else AudioSys.play('point_bad', { volume: 0.5 }); }, 60);
        this.hud.notify(`${fam} : ${e.good ? (e.fresh ? 'bien placé et frais, +1 par saison' : 'bien placé') : 'mal placé : pénalité cette saison, moitié la suivante, puis il s’efface'} (${e.result.total >= 0 ? '+' : ''}${e.result.total})`, e.good ? 'gold' : 'warn');
        this.tutorial.onEvent('work');
      } else if (e.kind === 'restore') {
        setTimeout(() => { fx.floatText(w.x, w.y - 44, `${e.result.total >= 0 ? '+' : ''}${e.result.total}`, '#2f9e8f', 24, 1.6); this.hud.ribbon(`${fam} remise en état`, '#2f9e8f', 1600, 'good'); this.hud.bumpScore(e.result.total); fx.closeBurst(w.x, w.y - 10, 4); AudioSys.play('bud', { volume: 0.6 }); }, 60);
        this.hud.notify(`${fam} : friche remise en état, elle recompte pour sa famille`, 'good');
      } else if (e.kind === 'fuse') {
        const nm = (STORY.tiles[e.recipe] || {}).name || e.recipe; const ft = STORY.fusion.done[Math.floor(Math.random() * STORY.fusion.done.length)];
        setTimeout(() => { fx.floatText(w.x, w.y - 44, `${e.result.total >= 0 ? '+' : ''}${e.result.total}`, '#e0a33a', 26, 1.6); this.hud.ribbon(`${ft} ${nm}`, '#e0a33a', 1800, 'master'); this.hud.bumpScore(e.result.total); fx.closeBurst(w.x, w.y - 10, 6); this.shake.trigger(0.1); AudioSys.play('region_big', { volume: 0.6 }); }, 90 * i + 60);
        if (e.first) { setTimeout(() => { this.hud.ribbon(STORY.fusion.discovery.replace('{n}', nm), '#2f9e8f', 2200, 'streak'); AudioSys.play('star_1', { volume: 0.6 }); }, 90 * i + 600); if (!Save.data.campaign.recipes.includes(e.recipe)) { Save.data.campaign.recipes.push(e.recipe); Save.save(); } }
        const from = (STORY.tiles[e.tile.from ? e.tile.from[0] : ''] || {}).name || '';
        this.hud.notify(`${nm} (${from.toLowerCase()} + ${fam.toLowerCase()}) : ${e.result.total >= 0 ? '+' : ''}${e.result.total}${e.first ? ` · recette découverte, une ${fam.toLowerCase()} et une ${((STORY.tiles[e.rare] || {}).name || 'rare').toLowerCase()} reviennent dans la file` : ''}`, 'gold');
        this.tutorial.onEvent('fuse');
      } else {
        const sig = e.level >= 3 && STORY.level3[e.tile.family];
        const bt = sig ? `${sig.name} !` : STORY.build.done[Math.floor(Math.random() * STORY.build.done.length)];
        setTimeout(() => { fx.floatText(w.x, w.y - 44, `${e.result.total >= 0 ? '+' : ''}${e.result.total}`, '#e0a33a', 24, 1.6); this.hud.ribbon(bt, '#e0a33a', sig ? 2000 : 1400, sig ? 'master' : 'good'); this.hud.bumpScore(e.result.total); if (sig) { fx.closeBurst(w.x, w.y - 10, 7); this.shake.trigger(0.12); AudioSys.play('region_big', { volume: 0.6 }); this.tutorial.onEvent('build3'); } }, 90 * i + 60);
        if (e.refund && e.refund.ok) setTimeout(() => { this.hud.ribbon((STORY.build.refund[e.refund.reason] || '').replace('{f}', fam.toLowerCase()), '#2f9e8f', 1800, 'good'); AudioSys.play('point_8', { volume: 0.5 }); }, 90 * i + 500);
        this.hud.notify(`Bâti : ${fam} niveau ${e.level} (${e.result.total >= 0 ? '+' : ''}${e.result.total})${e.refund && e.refund.ok ? ` · une ${fam.toLowerCase()} revient dans la file` : ''}`, 'gold');
      }
      if (e.milestone) setTimeout(() => { this.hud.notify(STORY.verdicts.milestone.replace('{n}', e.milestone), 'gold'); AudioSys.play('star_2', { volume: 0.5 }); }, 90 * i + 700);
      this.tutorial.onEvent('build');
      this.updateAmbience();
    } else if (e.type === 'close') {
      const cx = e.cells.reduce((s, c) => s + toWorld(c.q, c.r).x, 0) / e.cells.length, cy = e.cells.reduce((s, c) => s + toWorld(c.q, c.r).y, 0) / e.cells.length;
      // une pose peut fermer deux régions (trois, rarement) : les fermetures arrivent à la suite, on les décale
      // au lieu de les superposer — la deuxième a son propre arpège et son propre mot
      const nth = this._closeN++;
      // la vague : les cases s'allument de proche en proche depuis la tuile posée (parcours en largeur dans la région),
      // 55 ms par rang, huit rangs au plus — au-delà, tout le reste part ensemble
      const cells = (() => { const inSet = new Map(e.cells.map((c) => [key(c.q, c.r), { q: c.q, r: c.r, d: 0 }])); const from = this._lastPlaced && inSet.has(key(this._lastPlaced.q, this._lastPlaced.r)) ? this._lastPlaced : e.cells[0];
        const depth = new Map([[key(from.q, from.r), 0]]); const queue = [from];
        while (queue.length) { const c = queue.shift(); const dc = depth.get(key(c.q, c.r)); for (const [a, b] of DIRS.map(([dq, dr]) => [c.q + dq, c.r + dr])) { const kk = key(a, b); if (!inSet.has(kk) || depth.has(kk)) continue; depth.set(kk, dc + 1); queue.push({ q: a, r: b }); } }
        for (const [kk, cell] of inSet) cell.d = Math.min(8, depth.has(kk) ? depth.get(kk) : 8) * 0.055; return [...inSet.values()]; })();
      const wave = cells.reduce((m, c) => Math.max(m, c.d), 0);
      setTimeout(() => {
        fx.ring(cells, '#e0a33a'); setTimeout(() => fx.closeBurst(cx, cy, e.size), wave * 1000 * 0.7);
        const word = nth > 0 ? (STORY.closedMulti[Math.min(nth, STORY.closedMulti.length) - 1]) : STORY.closed[Math.floor(Math.random() * STORY.closed.length)];
        fx.floatText(cx, cy - 20, `${word} +${e.bonus}`, '#e0a33a', 24, 1.8);
        AudioSys.play(nth > 0 ? 'combo' : e.size >= 6 ? 'region_big' : 'region_close', { volume: 0.8 });
        Haptics.tap(nth > 0 ? [12, 40, 16] : e.size >= 6 ? 26 : 18);
        if (e.breath && this.mech.has('breath')) setTimeout(() => fx.floatText(cx, cy + 18, `+${e.breath} souffle`, '#3a9c8a', 18, 1.5), 350);
        if (e.size >= 6 || nth > 0) this.shake.trigger(nth > 0 ? 0.18 : 0.25);
      }, 350 + Math.min(nth, 2) * 450);
    } else if (e.type === 'season') {
      // la saison en plan : aucune bulle ; la caméra recule d'un cran, l'île change d'aspect, la règle s'écrit une fois dans le bandeau,
      // puis les points volent depuis les tuiles concernées vers le compteur, qui ne monte qu'à leur arrivée
      this.renderer.startTransition(e.from, e.to);
      AudioSys.play(`season_${e.to}`, { volume: 0.8 }); AudioSys.play('season_sweep', { volume: 0.5 });
      this.seasonCount[e.to] = (this.seasonCount[e.to] || 0) + 1;
      if (!this.def.daily) AudioSys.playMusic(seasonMusic(e.to, this.seasonCount[e.to]), { fade: 3 });
      const s = STORY.seasons[e.to]; const rl = e.rule && STORY.seasonRules[e.rule] ? STORY.seasonRules[e.rule] : null;
      this.hud.logOnly(`${s.name}${rl && isl.rulesVariable ? ` · ${rl.name}` : ''} — ${rl ? rl.line : s.line}`, 'season');
      this.hud.seasonTurn();
      fx.flightTarget = this.hud.scoreTarget();
      const flights = seasonFlights(e, isl); const total = flights.reduce((a, f) => a + f.pts, 0);
      if (total) this.hud.holdScore(total);
      const stagger = Math.min(140, Math.max(30, 1800 / Math.max(1, flights.length)));   // 140 ms entre deux départs, resserrés pour que tout tienne en quatre secondes
      const cam = this.cam; const z0 = cam.tzoom; const zr = Math.max(minZoom() * 1.0, z0 * 0.9); cam.tzoom = zr;
      setTimeout(() => { if (Math.abs(cam.tzoom - zr) < 1e-6) cam.tzoom = z0; }, 1500 + flights.length * stagger + 2000);
      flights.forEach((f, i) => { const w = toWorld(f.q, f.r); fx.fly(w.x, w.y, f.pts, { color: f.pts < 0 ? '#d95f4b' : f.color, delay: 0.9 + i * stagger / 1000, cell: Number.isInteger(f.q) ? { q: f.q, r: f.r } : null, onArrive: () => { this.hud.release(f.pts); AudioSys.play(f.pts < 0 ? 'point_bad' : `point_${Math.min(8, 1 + Math.floor(i / Math.max(1, flights.length / 8)))}`, { volume: 0.35 }); } }); });
      // croissance : chaque tuile qui a grandi s'illumine et se signale, après les étincelles
      if (e.grown && e.grown.length) {
        const t0 = 900 + flights.length * stagger + 300;
        e.grown.forEach((g, i) => setTimeout(() => {
          const w = toWorld(g.q, g.r); fx.ring([{ q: g.q, r: g.r }], '#3f9d4f'); fx.closeBurst(w.x, w.y - 10, 4);
          this.hud.ribbon(STORY.grown[g.family] || STORY.grown.default, '#3f9d4f', 2000, 'good');
          AudioSys.play('bud', { volume: 0.6 });
        }, t0 + i * 900));
        const seen = Save.data.seen || (Save.data.seen = {});
        if (!seen.growth) { seen.growth = true; Save.save(); setTimeout(() => this.tutorial.pushCard('growth', STORY.mechCards.growth), t0 + 400); }
      }
      const lines = seasonLines(e, isl);
      if (this.hud.recapMode === 'full') { this.hud.onTick = null; setTimeout(() => this.hud.seasonRecap({ from: e.from, to: e.to, lines, total: e.pts }), 900 + flights.length * stagger + 1900); }
      else if (e.pts) setTimeout(() => this.hud.bumpScore(e.pts), 900 + flights.length * stagger + 2000);
      if (e.faunaBreaths && this.mech.has('breath')) setTimeout(() => this.hud.ribbon(`+${e.faunaBreaths} souffle${e.faunaBreaths > 1 ? 's' : ''} (faune)`, '#3a9c8a', 1600, 'streak'), 1400 + flights.length * stagger);
      this.tutorial.onEvent('season');
      this.updateAmbience();
    } else if (e.type === 'fauna') {
      const k = `${e.species}@${e.regionId}`;
      const w = toWorld(e.q, e.r);
      const s = STORY.fauna[e.species] || { name: e.species, arrive: '', leave: '' };
      if (e.kind === 'arrive') { fx.fauna(k, 'arrive'); fx.faunaBurst(w.x, w.y - 20); if (e.bonus) setTimeout(() => fx.floatText(w.x, w.y - 50, `+${e.bonus} nichée`, '#e0a33a', 20, 1.4), 300); AudioSys.play('fauna_arrive', { volume: 0.6 }); setTimeout(() => AudioSys.play(AudioSys.has(`fauna_${e.species}`) ? `fauna_${e.species}` : 'fauna_rabbit', { volume: 0.5 }), 250); this.hud.notify(`${s.name} : ${s.arrive}`, 'fauna'); }
      else { const an = { t: 0, kind: 'leave', info: e }; fx.faunaAnim.set(k, an); AudioSys.play('fauna_leave', { volume: 0.5 }); this.hud.notify(`${s.name} : ${s.leave}`, 'warn'); }
      this.tutorial.onEvent('fauna');
    } else if (e.type === 'wish') {
      this.hud.flashWishes();
      const s = STORY.wishes[e.wish.def.id] || { title: '', done: '', failed: '' };
      if (e.kind === 'soon') { this.hud.notify(`Plus que ${e.left} poses pour « ${s.title} »`, 'wish'); this.hud.flashWishes(); AudioSys.play('wish_new', { volume: 0.5 }); }
      if (e.kind === 'done') { AudioSys.play('wish_done', { volume: 0.8 }); setTimeout(() => AudioSys.play('rare_tile', { volume: 0.6 }), 600); this.hud.notify(`Vœu exaucé — ${s.done}`, 'gold'); this.hud.notify(`Une tuile rare rejoint la file : ${(STORY.tiles[e.rare] || {}).name || e.rare}`, 'rare'); }
      else { AudioSys.play('wish_failed', { volume: 0.6 }); this.hud.notify(`Vœu manqué (échéance dépassée) : ${s.title} — ${s.failed}`, 'warn'); }
    } else if (e.type === 'weather') {
      const wt = STORY.weather[e.key] || { name: e.key, announce: '', line: '', rule: '' };
      if (e.kind === 'announce') { this.hud.logOnly(`${wt.name} annoncé : ${wt.announce}`, 'wish'); AudioSys.play('weather', { volume: 0.5 }); }   // l'annonce est déjà écrite sous la saison : pas de bulle pendant la transition
      else if (e.kind === 'start') {
        this.renderer.weather = e.key; this.hud.notify(`${wt.name} — ${wt.line}`, 'season'); this.hud.logOnly(wt.rule, 'info'); setTimeout(() => this.hud.ribbon(wt.rule, '#2b2a26', 2600, ''), 900);
        if (e.key === 'storm') { this.renderer.flash = 0.2; AudioSys.play('thunder', { volume: 0.8 }); this.shake.trigger(0.3); this.thunderTimer = 6 + Math.random() * 8; }
        if (e.key === 'wind') AudioSys.play('season_sweep', { volume: 0.6 });
        if (e.key === 'blizzard') AudioSys.play('season_winter', { volume: 0.5 });
        if (e.key === 'thaw') AudioSys.play('season_spring', { volume: 0.5 });
        if (e.key === 'heat') AudioSys.play('season_summer', { volume: 0.5 });
        let i = 0; for (const ev of e.events || []) { const w = toWorld(ev.q, ev.r); setTimeout(() => fx.floatText(w.x, w.y - 10, ev.type === 'dry' ? 'sèche' : 'dégel', ev.type === 'dry' ? '#d95f4b' : '#5aa7d6', 16, 1.2), 60 * i++); }
      } else if (e.kind === 'end') { this.renderer.weather = null; }
      this.updateAmbience();
    } else if (e.type === 'breath') {
      if (e.kind === 'bud') { const w = toWorld(e.q, e.r); fx.drop(key(e.q, e.r)); fx.placeBurst(w.x, w.y, true); AudioSys.play('bud', { volume: 0.7 }); }
      else if (e.kind !== 'undo' && !e.free) AudioSys.play('breath_spend', { volume: 0.5 });
      if (!e.free) this.tutorial.onEvent('breath');
    } else if (e.type === 'streak') {
      if (e.kind === 'breath') { this.hud.ribbon(`Série de ${e.n} : +1 souffle`, '#3a9c8a', 1600, 'streak'); AudioSys.play('breath_gain', { volume: 0.5 }); }
      else if (e.kind === 'double') { this.hud.ribbon(`Série de ${e.n} : la prochaine fermeture compte double`, '#e0a33a', 2200, 'streak'); AudioSys.play('region_close', { volume: 0.5 }); }
      else if (e.kind === 'doubled') { const w = toWorld(e.q, e.r); setTimeout(() => { fx.floatText(w.x, w.y - 60, `fermeture doublée +${e.pts}`, '#e0a33a', 24, 1.8); fx.closeBurst(w.x, w.y - 20, 6); AudioSys.play('region_big', { volume: 0.6 }); this.hud.bumpScore(e.pts); }, 500); }
    } else if (e.type === 'work' && e.kind === 'arrive') {
      this.hud.notify(`Un ouvrage arrive : ${(STORY.tiles[e.tile.family] || {}).name || e.tile.family}. Pose-le tout de suite (frais : +1 par saison), mets-le en remise (R) ou défausse-le, c’est gratuit`, 'info');
    } else if (e.type === 'shed') {
      const nm = (STORY.tiles[e.tile.family] || {}).name || e.tile.family;
      if (e.kind === 'expired') this.hud.notify(`${nm} : resté trop longtemps en remise, il a expiré`, 'warn');
      else if (e.kind === 'in' && e.replaced) this.hud.notify(`${nm} prend la place de ${(STORY.tiles[e.replaced.family] || {}).name || e.replaced.family} dans la remise`, 'info');
    } else if (e.type === 'grow') {
      this.cam.fit(this.isl.board.mask);
    } else if (e.type === 'end') {
      RunSave.clear(); this.runDirty = false;   // l'île est finie : plus rien à reprendre
      fx.flushFlights(); this.hud.hold = 0;
      AudioSys.play('island_done', { volume: 0.8 });
      this.startFinale();
    }
  }

  /** Tournée finale (HUD masqué, caméra libre) puis bilan. */
  startFinale() {
    if (this.finale) return;
    this.armed = null; this.hud.setPlaceButton(null); this.setBud(false);
    document.getElementById('hud').classList.add('finale'); document.getElementById('tutorial').classList.add('finale');
    this.finale = new Finale(this);
  }
  bounds() { const tl = this.cam.toWorldPoint(0, 0), br = this.cam.toWorldPoint(STAGE.W, STAGE.H); return { minX: tl.x, maxX: br.x, minY: tl.y, maxY: br.y }; }
  playSfx(key, volume = 0.6) { if (AudioSys.has(key)) AudioSys.play(key, { volume }); }
  onFinaleDone() { document.getElementById('hud').classList.remove('finale'); document.getElementById('tutorial').classList.remove('finale'); this.finished = true; this.endTimer = 10; }

  setBud(on) { if (on && !this.mech.has('breath')) return; this.budMode = on; this.renderer.budMode = on; this.hud.setBudMode(on, false); this.budTarget = null; if (on) { this.armed = null; this.hud.setPlaceButton(null); } }

  onMouseDown(b, x, y) {
    if (this.finale && !this.finale.done) { if (b === 0) this.finale.skip(); return; }
    if (this.paused || this.hold || !this.isl || this.isl.ended) return;
    if (b === 2 || b === 1) { this.drag = { x, y, moved: 0 }; return; }
    if (b !== 0) return;
    const w = this.cam.toWorldPoint(x, y); const { q, r } = fromWorld(w.x, w.y);
    if (this.budMode) {
      if (this.isl.canBud(q, r)) { this.budTarget = { q, r }; this.hud.setBudMode(true, true); }
      else { this.setBud(false); }
      return;
    }
    if (this.isl.canPlace(q, r)) { this.isl.place(q, r); this.renderer.hover = null; }
    else if (this.isl.canBuild(q, r)) { this.isl.build(q, r); this.renderer.hover = null; }
    else if (this.isl.board.has(q, r) && !this.isl.board.get(q, r)) { AudioSys.play('tile_invalid', { volume: 0.5 }); this.hud.notify(this.isl.restrict ? 'Pose la tuile sur la case qui brille' : 'Une tuile doit toucher une tuile posée', 'warn'); }
    else if (this.isl.board.get(q, r) && this.isl.buildOn && this.isl.current && !this.isl.current.rare && this.isl.board.get(q, r).family === this.isl.current.family && this.isl.breaths < BALANCE.build.cost) { AudioSys.play('tile_invalid', { volume: 0.5 }); this.hud.notify(`Bâtir demande ${BALANCE.build.cost} souffle`, 'warn'); }
  }
  onMouseUp(b, x, y) { if (b === 2 || b === 1) this.drag = null; }
  onResize() { if (this.cam && this.isl) this.cam.fit(this.isl.board.mask, uiMargins('island')); }
  /** Tactile : première touche = aperçu (case armée), seconde touche sur la même case = pose. */
  onTap(x, y) {
    if (this.finale && !this.finale.done) { this.finale.skip(); return; }
    if (this.paused || this.hold || !this.isl || this.isl.ended) return;
    const w = this.cam.toWorldPoint(x, y); const { q, r } = fromWorld(w.x, w.y);
    if (this.budMode) {
      if (this.isl.canBud(q, r)) { this.budTarget = { q, r }; this.hud.setBudMode(true, true); AudioSys.play('tile_hover', { volume: 0.3 }); }
      else this.setBud(false);
      return;
    }
    if (this.isl.board.get(q, r)) {
      // toucher une tuile posée : bâtir si c'est possible (même double toucher que la pose)
      if (!this.isl.canBuild(q, r)) { this.armed = null; this.hud.setPlaceButton(null); return; }
      if (this.armed && this.armed.q === q && this.armed.r === r) { this.placeArmed(); return; }
      this.armed = { q, r, build: true }; AudioSys.play('tile_hover', { volume: 0.3 }); return;
    }
    if (!this.isl.board.has(q, r)) { this.armed = null; this.hud.setPlaceButton(null); return; }
    if (!this.isl.canPlace(q, r)) { this.armed = null; this.hud.setPlaceButton(null); AudioSys.play('tile_invalid', { volume: 0.5 }); this.hud.notify(this.isl.restrict ? 'Pose la tuile sur la case qui brille' : 'Une tuile doit toucher une tuile posée', 'warn'); return; }
    if (this.armed && this.armed.q === q && this.armed.r === r) { this.placeArmed(); return; }
    this.armed = { q, r }; AudioSys.play('tile_hover', { volume: 0.3 });
  }
  placeArmed() {
    if (!this.armed || this.paused || this.hold || !this.isl || this.isl.ended) return;
    const { q, r, build } = this.armed; this.armed = null; this.hud.setPlaceButton(null);
    if (build) { if (this.isl.canBuild(q, r)) { this.isl.build(q, r); this.renderer.hover = null; } return; }
    if (this.isl.canPlace(q, r)) { this.isl.place(q, r); this.renderer.hover = null; }
  }
  onKey(k) {
    if (this.finale && !this.finale.done) { if (k !== 'KeyM') this.finale.skip(); return; }
    if (k === 'Escape') { if (this.budMode) { this.setBud(false); return; } this.togglePause(); return; }
    if (k === 'KeyM') { const m = AudioSys.toggleMute(); Save.options.muted = m; Save.save(); return; }
    if (this.paused || this.hold || !this.isl || this.isl.ended) return;
    const isl = this.isl;
    if (k === 'KeyC') { this.hud.onCloseSeason(); return; }
    if (k === 'Digit2' || k === 'Numpad2') { if (isl.handOn) this.hud.onPick(1); else this.hud.onSwap(1); }
    if (k === 'Digit3' || k === 'Numpad3') { if (isl.handOn) this.hud.onPick(2); else this.hud.onSwap(2); }
    if (k === 'Digit4' || k === 'Numpad4') { if (isl.handOn) this.hud.onPick(3); }
    if (k === 'Digit5' || k === 'Numpad5') { if (isl.handOn) this.hud.onPick(4); }
    if (k === 'KeyX') { if (this.mech.has('breath')) { if (isl.discard()) AudioSys.play('tile_discard', { volume: 0.6 }); } }
    if (k === 'KeyB') this.setBud(!this.budMode);
    if (k === 'KeyJ') this.hud.toggleLog();
    if (k === 'KeyH') this.hud.setTileHelp(this.hud.helpHidden || Save.options.tileHelp === false);
    if (k === 'KeyZ') { if (this.mech.has('breath') && isl.undo()) AudioSys.play('tile_undo', { volume: 0.6 }); }
    if (k === 'KeyP') { if (isl.toPocket()) AudioSys.play('tile_pocket', { volume: 0.6 }); else if (isl.queue.pocket.length) { isl.fromPocket(0); AudioSys.play('tile_pocket', { volume: 0.6 }); } }
    if (k === 'KeyR') { if (isl.toShed()) AudioSys.play('tile_pocket', { volume: 0.6 }); else if (isl.shed.length) { isl.fromShed(0); AudioSys.play('tile_pocket', { volume: 0.6 }); } }
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
    document.getElementById('tutorial').classList.toggle('paused', this.paused);
    if (this.paused) {
      AudioSys.play('ui_open', { volume: 0.5 });
      this.saveRun(true);
      const build = () => buildPause({ title: this.title, kept: !Game.testMode, onResume: () => this.togglePause(false), onRestart: () => { RunSave.clear(); scenes.go('island', { def: this.def }, { fade: 0.5 }); }, onOptions: () => Game.showOptions(() => showUI(build(), 'pause-wrap')), onGuide: () => Game.showGuide(() => showUI(build(), 'pause-wrap')), onFullscreen: () => { Game.toggleFullscreen(); setTimeout(() => { if (this.paused) showUI(build(), 'pause-wrap'); }, 400); }, onMenu: () => scenes.go('menu'), onPostcard: () => { try { showUI(buildPostcard({ canvas: renderPostcard(this), filename: postcardName(this), onBack: () => showUI(build(), 'pause-wrap') }), 'panel-wrap'); } catch (e) { console.warn('carte postale', e); } } });
      showUI(build(), 'pause-wrap');
    } else { hideUI(); AudioSys.play('ui_close', { volume: 0.5 }); }
  }

  update(dt) {
    const isl = this.isl; if (!isl) return;
    if (this.runDirty) { this.runTimer += dt; if (this.runTimer > 5) this.saveRun(true); }
    if (this.paused) { input.endFrame(); return; }
    if (this.finale && !this.finale.done) { this.finale.update(dt); this.cam.update(dt); this.particles.update(dt); this.fx.update(dt); this.shake.update(dt); const b0 = this.bounds(); this.fx.ambient(dt, isl.season, b0, 1, this._sources); this.fx.life(dt, { objects: this.renderer.decor.objects, tiles: this._tiles || [], season: isl.season, weather: null, bounds: b0 }); input.endFrame(); return; }
    // déplacement de la vue
    if (this.drag && (input.mouse.right || input.mouse.left)) { const dx = input.mouse.x - this.drag.x, dy = input.mouse.y - this.drag.y; this.cam.pan(dx, dy); this.drag.x = input.mouse.x; this.drag.y = input.mouse.y; }
    else if (this.drag && !input.mouse.right) this.drag = null;
    const pan = 320 * dt; if (input.isDown('ArrowLeft')) this.cam.pan(pan, 0); if (input.isDown('ArrowRight')) this.cam.pan(-pan, 0); if (input.isDown('ArrowUp')) this.cam.pan(0, pan); if (input.isDown('ArrowDown')) this.cam.pan(0, -pan);
    this.cam.update(dt);
    // survol
    if (!isl.ended && input.lastPointer === 'touch' && !this.budMode) {
      if (this.armed && this.armed.build && isl.canBuild(this.armed.q, this.armed.r)) { const pv = isl.previewBuild(this.armed.q, this.armed.r); this.renderer.hover = { q: this.armed.q, r: this.armed.r, preview: pv }; this.hud.setPlaceButton(pv ? pv.total : null, pv && pv.work ? 'work' : pv && pv.fuse ? 'fuse' : 'build'); }
      else if (this.armed && !this.armed.build && isl.canPlace(this.armed.q, this.armed.r)) { const pv = isl.preview(this.armed.q, this.armed.r); this.renderer.hover = { q: this.armed.q, r: this.armed.r, preview: pv }; this.hud.setPlaceButton(pv ? pv.total : null); }
      else { this.armed = null; this.renderer.hover = null; this.hud.setPlaceButton(null); }
    } else if (!isl.ended) {
      const w = this.cam.toWorldPoint(input.mouse.x, input.mouse.y); const { q, r } = fromWorld(w.x, w.y);
      const hk = key(q, r);
      if (this.lastHover !== hk) { this.lastHover = hk; if (isl.board.has(q, r) && !isl.board.get(q, r) && isl.canPlace(q, r)) AudioSys.play('tile_hover', { volume: 0.18, minInterval: 0.08 }); }
      this.renderer.hover = isl.board.has(q, r) ? { q, r, preview: isl.board.get(q, r) ? (isl.canBuild(q, r) ? isl.previewBuild(q, r) : null) : isl.preview(q, r) } : null;
    } else this.renderer.hover = null;
    this.particles.update(dt); this.fx.update(dt); this.shake.update(dt);
    const b = (() => { const tl = this.cam.toWorldPoint(0, 0), br = this.cam.toWorldPoint(STAGE.W, STAGE.H); return { minX: tl.x, maxX: br.x, minY: tl.y, maxY: br.y }; })();
    const wkey = isl.weather && isl.weather.phase === 'active' ? isl.weather.key : null;
    if (this.renderer.weather !== wkey) this.renderer.weather = wkey;
    // quand les i/s baissent (téléphone modeste), la mer renonce à sa profondeur et à son écume large ; avec un peu
    // d'hystérésis pour ne pas clignoter autour du seuil
    if (loop.fps < 42) this.renderer.lowFx = true; else if (loop.fps > 52) this.renderer.lowFx = false;
    // mode repos : après huit secondes sans geste, l'interface s'efface et la vue respire ; tout geste rétablit
    const resting = Save.options.rest !== false && input.idleSeconds > 8 && !this.armed && !this.budMode && !this.finale && !isl.ended;
    this.hud.setResting(resting); this.cam.breathe(resting ? 1 : 0, dt);
    const objs = this.renderer.decor.objects;
    if (this._srcV !== isl.board.version) { this._srcV = isl.board.version; this._sources = objs.filter((o) => o.tpl && (o.tpl.startsWith('obj_tree'))).map((o) => ({ x: o.x, y: o.y })); this._tiles = [...isl.board.tiles.values()].map((t) => { const w = toWorld(t.q, t.r); return { family: t.family, frozen: t.frozen, rare: t.rare, wx: w.x, wy: w.y }; }); }
    this.fx.ambient(dt, isl.season, b, 1, this._sources);
    this.fx.life(dt, { objects: objs, tiles: this._tiles, season: isl.season, weather: wkey, bounds: b });
    if (wkey === 'storm') { this.thunderTimer = (this.thunderTimer || 8) - dt; if (this.thunderTimer <= 0) { this.thunderTimer = 7 + Math.random() * 9; this.renderer.flash = 0.16; AudioSys.play('thunder', { volume: 0.6 }); this.shake.trigger(0.15); } }
    this.hud.update();
    this.tutorial.update(dt);
    if (this.finished) { this.endTimer += dt; if (this.endTimer > 2.2) { this.finished = false; try { isl.result.postcard = { canvas: renderPostcard(this), filename: postcardName(this) }; } catch (e) { console.warn('carte postale', e); } Game.afterIsland(isl.result, this.def); } }
    if (this.debugEl) this.debugEl.textContent = `placements=${isl.placements} season=${isl.season} ${isl.inSeason}/${isl.seasonLength} score=${isl.score} breaths=${isl.breaths} fauna=${isl.fauna.size} queue=${isl.queue.remaining} fps=${loop.fps} particles=${this.particles.count} zoom=${this.cam.zoom.toFixed(2)}`;
    input.endFrame();
  }
  render(ctx, alpha, dt) {
    ctx.save(); ctx.translate(this.shake.x, this.shake.y);
    this.renderer.render(ctx, alpha, dt);
    ctx.restore();
    if (this.finale && !this.finale.done) this.finale.render(ctx);
  }
}

class ResultsScene {
  async enter({ result, def, newRecord, seedsGained, daily }) {
    AudioSys.playMusic('results', { fade: 1.5 });
    this.bg = scenes.scenes.get('menu').ensureBg();
    const show = () => showUI(buildResults({ result, def, newRecord, seedsGained, daily, onContinue: () => Game.afterResults(result, def), onRetry: () => Game.startIsland(def.id, { skipIntro: true }), onMenu: () => scenes.go('menu'), onPostcard: result.postcard ? () => showUI(buildPostcard({ canvas: result.postcard.canvas, filename: result.postcard.filename, onBack: show }), 'panel-wrap') : null }), 'results-wrap'); show();
  }
  exit() { hideUI(); }
  update(dt) { this.bg.update(dt); input.endFrame(); }
  render(ctx, alpha, dt) { this.bg.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(244,239,230,0.5)'; ctx.fillRect(0, 0, STAGE.W, STAGE.H); }
}
class WorkshopScene {
  async enter({ onContinue }) { AudioSys.playMusic('results', { fade: 1.5 }); this.bg = scenes.scenes.get('menu').ensureBg(); showUI(buildWorkshop({ onContinue }), 'workshop-wrap'); }
  exit() { hideUI(); }
  update(dt) { this.bg.update(dt); input.endFrame(); }
  render(ctx, alpha, dt) { this.bg.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(244,239,230,0.5)'; ctx.fillRect(0, 0, STAGE.W, STAGE.H); }
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
  render(ctx, alpha, dt) { this.bg.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(244,239,230,0.35)'; ctx.fillRect(0, 0, STAGE.W, STAGE.H); }
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
