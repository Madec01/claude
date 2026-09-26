// Point d'entrée : chargement, scènes, boucle, flux de campagne de « Cent Saisons ».
import { Loop } from './core/loop.js';
import { Input } from './core/input.js';
import { Assets } from './core/assets.js';
import { AudioSys } from './core/audio.js';
import { Save, tidyCampaign } from './core/save.js';
import { BASE_RULE } from './game/seasonrules.js';
import { RunSave } from './core/run.js';
import { Haptics } from './core/haptics.js';
import { SceneManager, wait } from './core/scenes.js';
import { ParticleSystem } from './core/particles.js';
import { Shake } from './core/shake.js';
import { Island } from './game/island.js';
import { brumeDef, CARTES } from './game/brume.js';
import { buildBrumeChoice, buildBrumePicker } from './ui/brume.js';
import { IslandRenderer } from './game/render.js';
import { Camera } from './game/camera.js';
import { Effects } from './game/effects.js';
import { Hud } from './game/hud.js';
import { Tutorial } from './game/tutorial.js';
import { fromWorld, toWorld, key, DIRS, parse, SIZE } from './game/hex.js';
import { ISLANDS, INFINITE, GARDEN, getIsland } from './data/islands.js';
import { STORY } from './data/story.js';
import { BALANCE } from './data/balance.js';
import { buildMenu } from './ui/menu.js';
import { buildOptions } from './ui/options.js';
import { buildCredits, loadCredits } from './ui/credits.js';
import { buildGuide } from './ui/guide.js';
import { dailyDef, dailyKey, yesterdayKey } from './data/daily.js';
import { Finale } from './game/finale.js';
import { FinaleClassique } from './game/finale_classique.js';
import { prechargerTampons } from './game/tampon.js';   // la tournée d'avant, gardée au cas où (option `finaleClassique`)
import { campaignIsland, campaignMechanics, islandOptions, CAMPAIGN_SIZE, CHAPTER_LEN, MECH_AT, climateCardFor, unlockedUpTo, gateText, restarFromBest, CHAPTERS } from './data/campaign.js';
import { GRADES, streakMilestone } from './game/feedback.js';
import { computeLinks } from './game/paths.js';
import { waterBodies } from './game/water.js';
import { buildStory, islandIntroScreens, islandMemoryScreens, prologueScreens, endingScreens, infiniteScreens, gardenScreens, dailyScreens, tempoScreens } from './ui/story.js';
import { buildResults } from './ui/results.js';
import { buildCollection } from './ui/collection.js';
import { buildWorkshop } from './ui/workshop.js';
import { celebrate, celebrateThing } from './ui/achievements.js';
import { UPGRADES, playerChapter, upgradesNeuvesAPortee } from './data/upgrades.js';
import { Version } from './core/version.js';
import { tempoDef, entrainementDef, defiDuJourDef, recordsTempo, OBJECTIF_PAR_ID } from './data/tempo.js';
import { FAMILIES } from './data/tiles.js';
import { buildTempoPrep } from './ui/tempo_prep.js';
import { Tempo } from './game/tempo.js';
import { buildWishesIntro } from './ui/wishes_intro.js';
import { buildIslandPrep } from './ui/island_prep.js';
import { applySemis } from './data/semis.js';
import { Achievements } from './game/achievements.js';
import { buildPause } from './ui/pause.js';
import { buildPostcard } from './ui/postcard.js';
import { Cloud, moreAdvanced, signInProblem } from './core/cloud.js';
import { buildSignIn } from './ui/signin.js';
import { buildCloudConflict } from './ui/cloud_conflict.js';
import { buildPrivacy } from './ui/privacy.js';
import { buildReportPanel, buildEnvoisPanel } from './ui/report.js';
import { BlackBox } from './core/blackbox.js';
import { setVersion, rafraichirEtats, nouveautesEtats, noterEtatsVus, ETATS } from './core/report.js';
import { VERSION } from './ui/menu.js';
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

/** Les étincelles d'une saison : une par tuile qui rapporte (couleur selon la nature), les sentiers depuis leur milieu, la faune depuis chaque animal, le reste depuis le centre. */
const FLIGHT_COLORS = { harvest: '#e0a33a', bloom: '#d98cb3', vigil: '#f2c08a', level3: '#e0a33a', fusion: '#b8862b', rare: '#8a6fb5', path: '#c9a26b', fauna: '#3a9c8a', other: '#e0a33a' };
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
  /**
   * L'ouverture : l'animation du studio, jouée par-dessus l'écran de chargement (qui charge pendant ce temps). Rend une
   * promesse tenue quand le film est fini, passé d'un toucher, impossible à lire, ou après six secondes quoi qu'il arrive.
   * Le son est dans le film : on l'essaie avec le son (le navigateur l'accorde à un joueur qui revient), sinon en muet —
   * jamais de blocage sur un geste. Les tests automatiques (navigator.webdriver) ne la voient pas.
   */
  playIntro() {
    const box = document.getElementById('intro'), v = document.getElementById('intro-video');
    if (!box || !v) return Promise.resolve();
    if (navigator.webdriver || Save.options.testMode) { box.remove(); return Promise.resolve(); }
    return new Promise((resolve) => {
      let done = false;
      const fin = () => { if (done) return; done = true; box.classList.add('off'); setTimeout(() => box.remove(), 600); resolve(); };
      const opts = Save.options; v.volume = Math.max(0, Math.min(1, (opts.master ?? 0.8) * (opts.sfx ?? 0.9)));
      v.muted = !!opts.muted;
      v.addEventListener('ended', fin); v.addEventListener('error', fin, true);
      box.addEventListener('pointerdown', fin); window.addEventListener('keydown', fin, { once: true });
      box.hidden = false; box.classList.add('joue');
      const essai = v.play();
      if (essai && essai.catch) essai.catch(() => { v.muted = true; v.play().catch(fin); });
      setTimeout(fin, 6000);
    });
  },

  async boot() {
    const fill = document.getElementById('boot-fill'), status = document.getElementById('boot-status');
    const setP = (p, txt) => { fill.style.width = `${Math.round(p * 100)}%`; if (txt) status.textContent = txt; };
    // la boîte noire au plus tôt : une erreur de chargement compte autant qu'une erreur en jeu
    BlackBox.install({ sceneName: () => scenes.currentName });
    setVersion(VERSION);
    Save.load();
    const intro = this.playIntro();   // le film part dès la sauvegarde lue (ses réglages de son), et couvre le chargement
    // les visites suivantes viennent de l'appareil (sw.js) : enregistré tout de suite, pour que les images de cette
    // première visite passent déjà par lui et restent ; pas pour les tests ni le mode test, qui veulent le réseau tel quel
    if ('serviceWorker' in navigator && !navigator.webdriver && !Save.options.testMode) navigator.serviceWorker.register('sw.js').catch((e) => console.warn('service worker', e));
    const version = fetch('assets/version.json', { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then((v) => { Version.assets = v && v.assets; }).catch(() => {});
    // rattrapage des sauvegardes déjà en cours, une fois, au lancement : les étoiles sont d'abord réattribuées
    // depuis les meilleurs scores gardés (une échelle revue vaut pour les parties déjà jouées), puis le déblocage
    // est recalculé — un joueur coincé derrière une règle ou une échelle plus ancienne repart tout seul.
    { const c = Save.data.campaign; const restar = restarFromBest(c); const up = unlockedUpTo(c); const avance = up > c.unlockedIsland; if (avance) c.unlockedIsland = up; if (restar || avance) Save.save(); }
    setTimeout(() => this.noteRefund(), 2500);
    Achievements.init(Save); Achievements.testMode = () => !!Save.options.testMode; Achievements.onUnlock((a) => celebrate(a, { sound: () => AudioSys.play('achievement', { volume: 0.85 }) }));
    AudioSys.volumes = { master: Save.options.master, music: Save.options.music, ambience: Save.options.ambience, sfx: Save.options.sfx };
    AudioSys.muted = !!Save.options.muted;
    try { await AudioSys.loadManifest(); } catch (e) { console.warn(e); }
    try { await Assets.loadImages((p) => setP(p * 0.95, 'Les tuiles se réveillent…')); } catch (e) { console.warn(e); }
    // Les sons ne bloquent plus le menu : la musique et les ambiances se chargent à la demande (playMusic, setAmbience),
    // un effet pas encore arrivé se tait. Le préchargement part en arrière-plan une fois le menu affiché (8 Mo en 4G,
    // c'était sept secondes d'écran de chargement pour des sons qui ne servent qu'en partie).
    try { await document.fonts.ready; } catch (_) { /* ignore */ }
    this.credits = await loadCredits();
    setP(1, 'Prêt.');
    this.setFpsVisible(Save.options.showFps);
    await wait(200);
    const boot = document.getElementById('boot'); boot.classList.add('off'); setTimeout(() => boot.remove(), 700);
    await Promise.race([version, wait(1500)]);   // la version des assets pour le pied du menu (30 octets, jamais plus d'une seconde et demie)
    await intro;   // le film finit son tour avant que le menu (ou le choix de connexion) n'apparaisse
    AudioSys.preload().catch((e) => console.warn(e));   // en arrière-plan : effets d'abord, ambiances ensuite
    await this.bootCloud();
    this.proposeReport();
    this.proposeEtats();
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
    // l'écran de choix s'ouvre sur l'île du menu : sans scène, le canvas (opaque) restait noir sous le voile, un aplat gris
    if (!c.choice) { await scenes.go('menu', {}, { fade: 0 }); this.askSignIn(); return; }
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
    // une vieille copie en ligne (campagne à cinquante) paraîtrait plus avancée qu'une copie migrée : on la migre d'abord
    remote.data = Save.normalize(remote.data);
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

  /** Des améliorations de l'Atelier ont été retirées : leurs graines sont rendues (`tidyCampaign`), on le dit une fois. */
  noteRefund() {
    const c = Save.data.campaign; const due = (c.refunded || 0) - (c.refundSaid || 0); if (due <= 0) return;
    c.refundSaid = c.refunded; Save.save();
    this.toast(`L’Atelier s’est allégé : ${due} graine${due > 1 ? 's' : ''} rendue${due > 1 ? 's' : ''}, pour les améliorations retirées.`, 7000);
  },
  adoptCloud(data) { const opts = Save.data.options, cl = Save.data.cloud; Save.data = data; Save.data.options = opts; Save.data.cloud = cl; tidyCampaign(Save.data); Save.save(); this.noteRefund(); RunSave.clear(); RunSave.forget(); this.showMenu(); },   // on prend la partie du nuage : la partie en cours de cet appareil, et les dernières jouées, ne s'y rattachent plus

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
  /** L'écran « Pépins et idées ». `scenes.current` donne l'île en cours, quand il y en a une. */
  showReport(onBack, mode = 'pepin') {
    this.showPanel(buildReportPanel({
      onBack: onBack || (() => this.showMenu()),
      scene: scenes.current, sceneName: scenes.currentName, mode,
    }));
  },
  /**
   * Une erreur laissée par la session précédente : le jeu la propose UNE fois, sobrement. Sans ça, un plantage qui
   * tue l'onglet ne se signale jamais — la page est morte, il n'y a plus d'écran à ouvrir.
   */
  proposeReport() {
    if (!BlackBox.fromLastTime()) return;
    BlackBox.noteShown();
    setTimeout(() => celebrateThing({
      kicker: 'Nous avons trébuché', name: 'La dernière fois, quelque chose s’est cassé',
      desc: 'Touche ici pour nous raconter — nous avons gardé ce qu’il faut.', iconName: 'icon_info',
      onClick: () => this.showReport(),
    }), 1400);
  },
  /**
   * Des nouvelles du carnet. C'est le SEUL retour possible vers celui qui a signalé quelque chose : rien ne
   * part avec un rapport qui permettrait de le joindre — ni nom, ni adresse — et c'est très bien ainsi. On ne
   * peut donc rien lui pousser : on le lui dit quand il revient, une fois, sobrement.
   * Ne coûte qu'une lecture par appareil et par jour, et rien du tout s'il n'a jamais rien envoyé.
   */
  async proposeEtats() {
    try {
      await rafraichirEtats();
      const neuves = nouveautesEtats();
      if (!neuves.length) return;
      noterEtatsVus();   // dit une fois, pas à chaque lancement
      const n = neuves[0];
      const prefixe = n.mode === 'idee' ? 'IDÉE' : 'PÉPIN';
      const reste = neuves.length - 1;
      // le titre ne porte QUE le code : la bannière est étroite au téléphone, et « PÉPIN-G6HX attend d'être
      // lu » s'y casse en trois lignes. L'état tient très bien dans la phrase du dessous.
      const etat = ETATS[n.etat].court;
      setTimeout(() => celebrateThing({
        kicker: 'Des nouvelles du carnet',
        name: `${prefixe}-${n.code}`,
        desc: reste
          ? `Il ${etat}, et ${reste} autre${reste > 1 ? 's' : ''} ${reste > 1 ? 'ont' : 'a'} bougé. Touche ici.`
          : `Il ${etat}. Touche ici pour revoir tes envois.`,
        iconName: 'icon_info',
        onClick: () => this.showEnvois(),
      }), 2600);   // après la bannière d'erreur, jamais en même temps qu'elle
    } catch (e) { console.warn('états des pépins', e); }
  },
  /** L'état des envois : un écran à part, parce qu'on vient y prendre des nouvelles, pas signaler. */
  showEnvois(onBack) { this.showPanel(buildEnvoisPanel({ onBack: onBack || (() => this.showMenu()) })); },
  showPanel(node) { showUI(node, 'panel-wrap'); },
  showMenu() { scenes.go('menu', {}, { fade: 0.25 }); },
  showOptions(onBack) { this.showPanel(buildOptions({ onBack: onBack || (() => this.showMenu()), game: this })); },
  showGuide(onBack) { this.showPanel(buildGuide({ onBack: onBack || (() => this.showMenu()) })); },
  showCredits(onBack) { this.showPanel(buildCredits({ onBack: onBack || (() => this.showMenu()), credits: this.credits })); },
  /** La Collection : chapitres, archétypes (en tout et île par île) et succès, les manquants en silhouette. */
  showAchievements(onBack) { this.showPanel(buildCollection({ onBack: onBack || (() => this.showMenu()) })); },
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
  onSaveReset() { RunSave.clear(); RunSave.forget(); },   // la progression effacée emporte la partie en cours et les dernières jouées
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
    this.prepIsland(def, skipIntro ? [] : islandIntroScreens(def));   // « Rejouer l'île » : pas de récit, on l'a déjà lu
  },
  /** L'écran de départ : récit, semis et vœux sur un seul écran. Sans rien à lire ni à choisir, l'île démarre directement. */
  prepIsland(def, screens = []) {
    const semis = !!(def.mech && def.mech.has('semis')) && !def.daily;
    const go = (semisId) => { const d2 = semisId && semisId !== 'saisons' ? { ...def, weights: applySemis(def.weights, semisId), semis: semisId } : def; hideUI(); scenes.go('island', { def: d2, skipWishes: true }, { fade: 0.5 }); };
    if (!semis && !(def.wishes && def.wishes.length) && !screens.length) { go(null); return; }
    scenes.go('prep', { node: buildIslandPrep({ def, semis, screens, onStart: (id) => { AudioSys.play('ui_confirm', { volume: 0.5 }); go(id); }, onBack: () => this.showMenu() }) });
  },
  // ----- Partie en cours gardée sur l'appareil -----
  /** De quoi retrouver l'île plus tard : le strict nécessaire pour la reconstruire à l'identique. */
  whereOf(def) {
    if (!def) return null;
    if (def.brume) return { kind: 'brume', cran: def.brume, seed: def.seed };
    if (def.garden) return { kind: 'garden' };
    if (def.infinite) return { kind: 'infinite' };
    if (def.tempo) return { kind: 'tempo' };
    if (def.daily) return { kind: 'daily', date: def.date };
    return { kind: 'campaign', id: def.id, semis: def.semis || null };
  },
  /** Reconstruit la définition d'île rangée par `whereOf`. Rend null si elle n'a plus de sens (l'île du jour a changé de jour). */
  defFromWhere(w) {
    if (!w) return null;
    if (w.kind === 'brume') return brumeDef(w.cran, w.seed);
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
    if (def.brume) def.planBrume = { fog: [], cachees: [], deduc: 0 };   // la brume vient de la sauvegarde : pas de solveur à la reprise
    hideUI();
    scenes.go('island', { def, skipWishes: true, resume: d.isl }, { fade: 0.5 });
  },
  /** Un mode essayé cesse d'être « nouveau » au menu. */
  noteMode(k) { Save.data.seen = Save.data.seen || {}; if (!Save.data.seen[k]) { Save.data.seen[k] = true; Save.save(); } },
  startInfinite() { this.noteMode('mode_infinite'); scenes.go('story', { screens: infiniteScreens(), onDone: () => scenes.go('island', { def: INFINITE }, { fade: 0.5 }) }); },
  /** Le Souffle court : le récit d'ouverture la première fois seulement ; ensuite, droit sur une île neuve. */
  /** La musique d'une partie du Souffle court : une des pistes du mode, tirée au sort parmi celles que le manifeste connaît. */
  musiqueTempo() { const cles = Object.keys(BALANCE.tempo.musiques).filter((k) => AudioSys.has(k, 'music')); return cles.length ? cles[Math.floor(Math.random() * cles.length)] : null; },
  /** Les familles que la campagne a déjà présentées : le mode n'en propose pas d'autres (pas de colline avant l'île 8, pas de lande avant la 10). */
  famillesConnues() { const n = Game.testMode ? 99 : (Save.data.campaign.unlockedIsland || 1); const mech = campaignMechanics(n); return new Set(FAMILIES.filter((f) => (f !== 'hill' || mech.has('hill')) && (f !== 'heath' || mech.has('heath')))); },
  etireTempo() { return STAGE.compact && STAGE.portrait ? BALANCE.tempo.etirePortrait : 1; },
  startTempo() { this.noteMode('mode_tempo'); const def = tempoDef(undefined, { etire: this.etireTempo(), familles: this.famillesConnues() }); def.musique = this.musiqueTempo(); if (def.musique) AudioSys.load('music', def.musique).catch(() => {}); scenes.go('prep', { node: buildTempoPrep({ onStart: (cadran, tuto, unToucher, objectif) => { AudioSys.play('ui_confirm', { volume: 0.5 }); def.cadran = cadran; def.tuto = !!tuto; def.unToucher = !!unToucher; def.objectif = objectif || null; hideUI(); scenes.go('island', { def }, { fade: 0.4 }); }, onTrain: () => this.startEntrainement(), onDefi: (unToucher, objectif) => this.startDefiDuJour(unToucher, objectif), onBack: () => this.showMenu() }) }); },
  /** Le défi du jour du Souffle court : la même île pour tous, 5 s, un record par jour. */
  startDefiDuJour(unToucher, objectif) { AudioSys.play('ui_confirm', { volume: 0.5 }); const def = defiDuJourDef(); def.unToucher = !!unToucher; def.objectif = objectif || null; def.musique = this.musiqueTempo(); if (def.musique) AudioSys.load('music', def.musique).catch(() => {}); hideUI(); scenes.go('island', { def }, { fade: 0.4 }); },
  /** « Rejouer cette île » : la même graine, le même délai, la même forme — pour comparer deux plans. */
  rejouerTempo(def) { AudioSys.play('ui_confirm', { volume: 0.5 }); const d = { ...def }; d.musique = this.musiqueTempo(); if (d.musique) AudioSys.load('music', d.musique).catch(() => {}); hideUI(); scenes.go('island', { def: d }, { fade: 0.4 }); },
  /** L'entraînement du Souffle court : six poses guidées sans chrono, puis douze à 8 s ; jamais de record. */
  startEntrainement() { AudioSys.play('ui_confirm', { volume: 0.5 }); const def = entrainementDef({ etire: this.etireTempo() }); def.musique = this.musiqueTempo(); if (def.musique) AudioSys.load('music', def.musique).catch(() => {}); hideUI(); scenes.go('island', { def }, { fade: 0.4 }); },
  startDaily() { this.noteMode('mode_daily'); const def = dailyDef(); this.prepIsland(def, dailyScreens(def)); },
  /** Sous la brume : le choix du cran, puis une île tirée au hasard (une nouvelle à chaque partie). */
  startBrume() {
    this.noteMode('mode_brume');
    scenes.go('prep', { node: buildBrumeChoice({ onPick: (cran, tuto) => {
      AudioSys.play('ui_confirm', { volume: 0.5 });
      const def = brumeDef(cran, 1 + Math.floor(Math.random() * 999999)); def.tuto = !!tuto;
      // la brume se prépare hors du fil principal ; le panneau attend (sa fiche dit « la brume se forme »)
      return this.preparerBrume(def).then((plan) => { if (plan) def.planBrume = plan; hideUI(); scenes.go('island', { def }, { fade: 0.5 }); });
    }, onBack: () => this.showMenu() }) });
  },
  /**
   * Sous la brume : le plan de l'île (brume, tuiles cachées, dosage) se calcule dans un worker, parce que le solveur
   * prend des secondes. Sans worker, ou s'il échoue ou tarde, on rend `null` et l'île se prépare sur place.
   */
  preparerBrume(def) {
    return new Promise((res) => {
      let w = null; const fin = (v) => { if (w) { try { w.terminate(); } catch (_) { /* rien */ } w = null; } res(v); };
      try { w = new Worker(new URL('./game/brume_worker.js', import.meta.url), { type: 'module' }); } catch (_) { return res(null); }
      const garde = setTimeout(() => fin(null), 20000);
      w.onmessage = (e) => { clearTimeout(garde); fin(e.data && !e.data.erreur && e.data.fog ? e.data : null); };
      w.onerror = () => { clearTimeout(garde); fin(null); };
      w.postMessage({ def });
    });
  },
  startGarden() { this.noteMode('mode_garden'); scenes.go('story', { screens: gardenScreens(), onDone: () => scenes.go('island', { def: GARDEN }, { fade: 0.5 }) }); },

  /**
   * Ce qui vient de s'ouvrir, dit à voix haute. Les modes de jeu ne se signalaient que par un bouton du menu qui
   * cessait d'être grisé : invisible au téléphone. Chaque annonce ne passe qu'une fois (`campaign.announced`).
   */
  announceUnlocks() {
    const c = Save.campaign; c.announced = c.announced || [];
    const jingle = () => AudioSys.play('achievement', { volume: 0.7 });
    const say = (id, o) => { if (c.announced.includes(id)) return false; c.announced.push(id); celebrateThing(o, { sound: jingle }); return true; };
    let n = 0;
    if (c.islandsPlayed >= 1) n += say('mode_garden', { kicker: 'Mode ouvert', name: 'Jardin', desc: 'Poser sans score ni saison, pour le plaisir. Depuis le menu.', iconName: 'icon_leaf' }) ? 1 : 0;
    if (c.unlockedIsland >= 6) n += say('mode_daily', { kicker: 'Mode ouvert', name: 'Île du jour', desc: 'La même île pour tout le monde, une par jour. Depuis le menu.', iconName: 'icon_sun' }) ? 1 : 0;
    if (Save.data.infinite.unlocked || c.unlockedIsland > 6) n += say('mode_tempo', { kicker: 'Mode ouvert', name: 'Le Souffle court', desc: 'Pas de file : la tuile arrive, trois secondes pour la poser. Depuis le menu.', iconName: 'icon_wind' }) ? 1 : 0;
    if (Save.data.infinite.unlocked || c.unlockedIsland > 6) n += say('mode_infinite', { kicker: 'Mode ouvert', name: 'Île infinie', desc: 'Une île qui ne finit jamais : jusqu’où tiendras-tu ?', iconName: 'icon_tree' }) ? 1 : 0;
    if (c.islandsPlayed >= 1) n += say('postcard', { kicker: 'Bon à savoir', name: 'La carte postale', desc: 'Au bilan et en pause : ton île en grand, à garder ou à partager.', iconName: 'icon_save' }) ? 1 : 0;
    if ((c.recipes || []).length >= 1) n += say('cahier', { kicker: 'Bon à savoir', name: 'Le Cahier des recettes', desc: 'Les fusions trouvées se rangent dans le Guide, onglet Cahier.', iconName: 'icon_question' }) ? 1 : 0;
    // l'Atelier ouvre trois ou quatre améliorations à chaque chapitre, au milieu des autres : on le dit
    const chap = playerChapter(c.unlockedIsland);
    if (chap >= 2) {
      const neuves = UPGRADES.filter((u) => u.chapter === chap);
      if (neuves.length) n += say(`atelier_ch${chap}`, { kicker: 'Atelier des saisons', name: `Chapitre ${chap}`, desc: `${neuves.length} nouvelle${neuves.length > 1 ? 's' : ''} amélioration${neuves.length > 1 ? 's' : ''} : ${neuves.map((u) => u.name).join(', ')}. Depuis le menu.`, iconName: 'icon_gear' }) ? 1 : 0;
    }
    if (n) Save.save();
    return n;
  },

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
    if (def.tempo) {
      const T = Save.data.tempo || (Save.data.tempo = { best: 0, bestSerie: 0, parties: 0 });
      // une partie jouée avec le tutoriel est un entraînement : le temps s'y arrête sous les cartes, elle ne fait pas de record
      if (!test && !def.tuto) {
        recordsTempo(T); T.parties = (T.parties || 0) + 1;
        if (def.defi) { T.defi = T.defi || { best: {} }; const prev = T.defi.best[def.defi] || 0; if (result.score > prev) { newRecord = prev > 0; T.defi.best[def.defi] = result.score; } }   // le défi du jour : un record par jour, à part
        else { const cad = def.cadran || 3; if (result.score > (T.bests[cad] || 0)) { newRecord = (T.bests[cad] || 0) > 0; T.bests[cad] = result.score; } T.series[cad] = Math.max(T.series[cad] || 0, result.stats.bestSerie || 0); T.best = Math.max(T.best || 0, result.score); T.bestSerie = Math.max(T.bestSerie || 0, result.stats.bestSerie || 0); }
        Save.save();
      }
      if (def.objectif && OBJECTIF_PAR_ID[def.objectif]) result.objectif = { nom: OBJECTIF_PAR_ID[def.objectif].nom, atteint: OBJECTIF_PAR_ID[def.objectif].atteint({ stats: result.stats }) };
      scenes.go('results', { result, def, newRecord });
      return;
    }
    if (def.brume) {
      const b = Save.data.brume || (Save.data.brume = {}); const e = b[def.brume] || (b[def.brume] = { best: 0, plays: 0 });
      if (!test) { e.plays = (e.plays || 0) + 1; if (result.score > (e.best || 0)) { newRecord = e.best > 0; e.best = result.score; } Save.save(); }
      scenes.go('results', { result, def, newRecord });
      return;
    }
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
      const prevGold = !!(c.gold && c.gold[def.id]); if (result.gold) { c.gold = c.gold || {}; c.gold[def.id] = true; }
      if (result.score > (c.best[def.id] || 0)) { newRecord = !!c.best[def.id]; c.best[def.id] = result.score; }
      // graines : étoiles nouvelles + vœux + île terminée la première fois
      const firstTime = !c.memoriesRead.includes(def.id);
      seedsGained = Math.max(0, result.stars - prevStars) * (BALANCE.seeds.star + (c.upgrades.evening || 0)) + (result.gold && !prevGold ? 1 : 0) + (firstTime ? result.wishesDone * BALANCE.seeds.wish + BALANCE.seeds.island : 0) + (BALANCE.upgrades.almanac[c.upgrades.almanac || 0] || 0);
      c.seeds += seedsGained; c.seedsTotal += seedsGained;
      if (firstTime) c.memoriesRead.push(def.id);   // le souvenir se lit au bilan : il est acquis dès maintenant, même si l'on part par « Menu »
      // les insignes : l'archétype de l'île bâtie rejoint ceux de cette île ; l'île-souvenir clôt son chapitre
      const ins = c.insignes || (c.insignes = { iles: {}, chapitres: [] }); ins.iles = ins.iles || {}; ins.chapitres = ins.chapitres || [];
      if (result.archetype) { const l = ins.iles[def.id] || (ins.iles[def.id] = []); if (!l.includes(result.archetype.id)) l.push(result.archetype.id); }
      if (def.memory && def.chapter && !ins.chapitres.includes(def.chapter)) ins.chapitres.push(def.chapter);
      // déblocage recalculé depuis les étoiles : l'étoile qui manquait à la porte compte même si on l'a décrochée
      // sur une île déjà jouée. `Math.max` pour ne jamais retirer ce qui était ouvert (mode test, anciennes sauvegardes).
      c.unlockedIsland = Math.max(c.unlockedIsland, unlockedUpTo(c));
      if (def.id === CAMPAIGN_SIZE) { c.completed = true; Save.data.infinite.unlocked = true; }
      if (def.id >= 6) Save.data.infinite.unlocked = true;   // fin du chapitre 2 : l'Île infinie s'ouvre
      Save.noteIslandDone();
      Save.save();
      this.announceUnlocks();
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
    if (def.tempo) { this.startTempo(); return; }
    if (def.brume) { this.startBrume(); return; }
    if (def.daily) { this.showMenu(); return; }
    const c = Save.campaign;
    // Terminer une île suffit : elle ouvre la suivante, avec ou sans étoile. Les étoiles ne gardent plus que les
    // portes de chapitre — et une porte a deux clés (voir gateOpen). Le souvenir s'est lu au bilan : du bilan on
    // passe directement à l'écran de départ de l'île suivante ; l'Atelier attend au menu.
    this.remindBackup();
    if (def.id === CAMPAIGN_SIZE) { scenes.go('story', { screens: endingScreens(), skippable: false, onDone: () => scenes.go('ending') }); return; }
    if (c.unlockedIsland > def.id) {
      // les graines dormaient dans la poche (le commanditaire lui-même avait oublié l'Atelier) : quand elles paient une
      // amélioration que le joueur n'a pas encore vue à portée, l'Atelier s'ouvre une fois sur le chemin de l'île suivante.
      // Il note ce qu'il montre : décliner ne le fait pas revenir tant que rien de nouveau n'est à portée.
      const neuves = this.testMode ? [] : upgradesNeuvesAPortee(c);
      if (neuves.length) { scenes.go('workshop', { continuer: true, intro: `Tes ${c.seeds} graine${c.seeds > 1 ? 's' : ''} paient ${neuves.length === 1 ? 'une amélioration' : `${neuves.length} améliorations`} que tu n’as pas encore vue${neuves.length > 1 ? 's' : ''} à portée${neuves.length <= 4 ? ` : ${neuves.map((u) => u.name).join(', ')}` : ''}. Choisis, ou continue — l’Atelier reste au menu.`, onContinue: () => this.startIsland(def.id + 1) }); return; }
      this.startIsland(def.id + 1);
    } else { this.showMenu(); const t = gateText(c, Math.ceil(def.id / CHAPTER_LEN)); if (t) this.toast(t, 7000); }
  },
  /** L'Atelier des saisons, depuis le menu. */
  showWorkshop() { scenes.go('workshop', { onContinue: () => this.showMenu() }); },
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
    // L'île de fond est un DÉCOR : personne n'y posera jamais de tuile. La grille des cases vides n'y
    // promet donc rien — elle pose seulement un pavage d'hexagones pâles cerclés de blanc sur la mer,
    // et c'est lui qu'on lit comme « l'eau a un problème de texture au niveau des côtes » (pépin CJ64).
    // Île nue d'emblée, comme la carte postale : il ne reste que ce qui est bâti, et la mer redevient
    // de la mer. Le `_nu0` reculé évite que la grille clignote pendant les sept dixièmes du fondu.
    this.renderer.nu = true; this.renderer._nu0 = this.renderer.time - 10;
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
    if (Game.testMode) for (const m of ['river', 'season', 'fauna', 'wish', 'breath', 'rare', 'build', 'fuse', 'build3']) mech.add(m);
    this.mech = mech;
    // Le Souffle court : les points du jeu, rien d'autre — ni souffle, ni bâtir, ni fusion, ni croissance, ni surprise de saison
    if (def.tempo) { mech.clear(); for (const m of ['river', 'season', 'fauna', 'rare', 'hill', 'heath', 'rare2']) mech.add(m); }
    const opt = def.tempo ? { build: false, fuse: false, hand: false, level3: false, growth: false, surprise: false, rareTier: 1 } : islandOptions({ mech }); const isl = new Island(def, { upgrades: def.tempo ? {} : upgrades, ...opt, known: new Set(Save.data.campaign.recipes || []) });
    // reprise : l'île retrouve exactement l'état laissé (plateau, file de tuiles, saison, score, vœux)
    this.resumed = !!(resume && isl.restoreRun(resume));
    if (resume && !this.resumed) { RunSave.clear(); Game.toast('Cette partie ne peut plus être reprise : on repart du début de l’île.'); }
    if (!this.resumed) { RunSave.archiveKept(); RunSave.clear(); }   // une nouvelle île remplace la partie gardée : celle qu'on laisse passe dans l'historique, pour pouvoir l'illustrer plus tard
    this.isl = isl;
    this.runDirty = false; this.runTimer = 0;
    this.marges = () => uiMargins(def.tempo ? 'tempo' : 'island');
    this.cam = new Camera(); this.cam.fit(isl.board.mask, { ...this.marges(), immediate: true });
    this.moving = false;   // Sous la brume : mode Déplacer
    this.armed = null;   // tactile : case « armée » (aperçu affiché) en attente d'une seconde touche
    this.particles = new ParticleSystem(1500); this.fx = new Effects(this.particles); this.shake = new Shake(); this.shake.enabled = Save.options.shake !== false;
    this.renderer = new IslandRenderer(isl, this.cam, this.fx, this.particles);
    this.renderer.sansPoints = !!def.brume;   // sous la brume, on choisit sa case sans voir les points
    this.paused = false; this.endTimer = 0; this.finished = false; this.finale = null;
    const name = def.story && STORY.islands[def.story] ? STORY.islands[def.story].name : def.infinite ? 'Île infinie' : def.garden ? 'Jardin' : def.tempo ? 'Le Souffle court' : (def.name || 'Île');
    this.title = name;
    this.hud = new Hud(document.getElementById('hud'), isl, {
      title: name, mechanics: mech,
      onPause: () => this.togglePause(),
      onPick: (i) => { if (isl.pick(i)) { AudioSys.play('tile_swap', { volume: 0.5 }); this.tutorial.onEvent('hand'); } },
      onDiscard: () => { if (isl.discard()) AudioSys.play('tile_discard', { volume: 0.6 }); else AudioSys.play('ui_error', { volume: 0.4 }); },
      onUndo: () => { if (isl.undo()) { AudioSys.play('tile_undo', { volume: 0.6 }); this.hud.notify('La dernière pose est annulée', 'info'); } else AudioSys.play('ui_error', { volume: 0.4 }); },
      onGardenPick: (fam) => { isl.setGardenTile(fam); AudioSys.play('ui_click', { volume: 0.4 }); },
      onPlace: () => this.placeArmed(),
      onAction: (i) => this.doAction(i),
      onActionHover: (i) => { if (this.armed && this.armed.build) this.armed.i = i; },
      onBuildHint: () => this.buildHint(),
      onMove: () => this.toggleMove(),
      compact: STAGE.compact,
    });
    document.getElementById('hud').classList.add('on');
    // les deux modes à part ont leur tutoriel pas à pas : la première fois, ou à la demande (`def.tuto`) ; jamais en mode test
    // la case « Revoir le tutoriel » cochée dans le panneau l'emporte sur l'option « Sauter les tutoriels » : c'est une demande explicite
    const tutoMode = (def.tempo || def.brume) && !Game.testMode && (def.tuto || (!Save.options.skipTutorial && !((Save.data.seen || {})[def.tempo ? 'tuto_tempo' : 'tuto_brume'])));
    if (tutoMode) { Save.data.seen = Save.data.seen || {}; Save.data.seen[def.tempo ? 'tuto_tempo' : 'tuto_brume'] = true; Save.save(); }
    this.tutorial = new Tutorial(document.getElementById('tutorial'), isl, def, (!Save.options.skipTutorial && !def.infinite && !def.garden && !def.tempo && !def.brume) || !!tutoMode);
    // les vœux se présentent avant la première pose (un bouton pour commencer), sauf en reprise sans intro
    this.hold = false;
    if (isl.wishes.length && !def.garden && !skipWishes && !this.resumed) { this.hold = true; showUI(buildWishesIntro({ island: isl, onStart: () => { hideUI(); this.hold = false; AudioSys.play('ui_confirm', { volume: 0.5 }); } }), 'panel-wrap'); }
    document.getElementById('tutorial').classList.add('on');
    isl.on((e) => this.onEvent(e));
    isl.on((e) => { if (!Game.testMode && !def.tempo) Achievements.onIslandEvent(e, isl); });
    // Le Souffle court : le cadran, la série et les saisons à effets ; la brume d'automne est lue par le rendu
    // le HUD sait dans quel mode il est : au téléphone, la brume range son inventaire au-dessus des tuiles
    if (isl.brume) { document.getElementById('hud').classList.add('brume'); document.getElementById('tutorial').classList.add('brume'); }
    this.tempo = def.tempo ? new Tempo(this) : null;
    if (this.tempo) {
      this.renderer.brume = this.tempo.brume; document.getElementById('hud').classList.add('tempo');
      // la musique part sans fondu et le décompte se cale sur elle : un pas tous les deux temps, le premier coup sur le premier temps fort
      const mu = this.musiqueDuMode(); const pas = mu.tempsParPas * 60 / mu.bpm;
      this.hold = true;
      const lancer = def.musique && AudioSys.has(def.musique, 'music') ? AudioSys.playMusic(def.musique, { fade: 0 }) : Promise.resolve(null);
      // à l'entraînement, pas de décompte : le chrono attend de toute façon la fin des poses guidées
      Promise.race([lancer, wait(2.5)]).then((at) => { if (this.isl !== isl) return; this.tempo.musiqueAt = at !== null && at !== undefined ? at : null; if (def.chronoDes) this.hold = false; else this.compteARebours(pas, this.tempo.musiqueAt !== null ? mu.premierTemps : 0); });
    }
    // audio
    this.seasonCount = { [isl.season]: 1 };
    if (!def.tempo) AudioSys.playMusic(def.garden ? 'garden' : def.daily && AudioSys.has('daily', 'music') ? 'daily' : seasonMusic(isl.season, 1), { fade: 2 });
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
      input.on('pan', (dx, dy) => { if (!this.paused) { this.oublierVisee(); this.cam.pan(dx, dy); } }),
      input.on('pinch', (f, cx, cy) => { if (!this.paused) { this.oublierVisee(); this.cam.zoomBy(f, cx, cy); } }),
    ];
    // Au doigt, une case se vise d'un toucher et se pose au second. Tout appui AILLEURS (un bouton, la file, la main,
    // les vœux, la fiche de tuile…) oublie la case visée : sinon, après « Défausser » ou le choix d'une autre tuile, un
    // seul toucher sur la même case posait aussitôt une tuile que l'on n'avait pas vue en aperçu. Seuls « Poser ici » et
    // le panneau des actions agissent sur la case visée : ils la gardent.
    this.onAppuiAilleurs = (e) => { if (!this.armed || e.target === canvas || (e.target.closest && e.target.closest('.hud-place, .hud-actions'))) return; this.oublierVisee(); };
    document.addEventListener('pointerdown', this.onAppuiAilleurs, true);
    // l'application passe en arrière-plan (onglet caché, téléphone verrouillé, appel) : on range la partie tout de suite
    this.onHide = () => { if (document.visibilityState === 'hidden') this.saveRun(true); };
    this.onLeave = () => this.saveRun(true);
    document.addEventListener('visibilitychange', this.onHide);
    window.addEventListener('pagehide', this.onLeave);
    window.addEventListener('blur', this.onLeave);
    document.getElementById('stage').classList.add('playing');
    if (this.resumed) { this.hud.notify('Partie reprise là où vous l’aviez laissée', 'info'); this.saveRun(true); }
  }

  /**
   * Souffle court : trois, deux, un — le cadran ne part pas sans prévenir. Tant qu'il compte, rien ne se pose
   * (`hold`) et le temps ne s'écoule pas. Aussi au retour de pause, plus vite.
   */
  /** Le tempo et le premier temps fort de la piste de cette partie (repli : la première piste). */
  musiqueDuMode() { const T = BALANCE.tempo; const m = (this.def.musique && T.musiques[this.def.musique]) || T.musique; return { bpm: m.bpm, premierTemps: m.premierTemps, tempsParPas: T.musique.tempsParPas }; }
  /**
   * Le décompte « 3, 2, 1, Pose ! » : au départ, et à chaque reprise après une pause. Un seul à la fois (le précédent
   * est annulé, sinon deux chiffres se superposaient et le premier libérait le jeu pendant que le second s'affichait
   * encore). Il ne réarme pas le cadran : le temps repart exactement où il s'était arrêté — une pause ne fait gagner
   * aucune seconde.
   */
  compteARebours(pas = 0.8, avant = 0) {
    if (!this.tempo || this.isl.ended) return;
    this.annulerCompte();
    this.hold = true;
    const el = this._compteEl = h('div', { class: 'tempo-compte' }); document.getElementById('hud').appendChild(el);
    const etapes = ['3', '2', '1', 'Pose !'];
    this._compteTimers = etapes.map((txt, i) => setTimeout(() => {
      if (!this.tempo || el !== this._compteEl) return;
      el.textContent = txt; el.classList.remove('tic'); void el.offsetWidth; el.classList.add('tic');
      AudioSys.play(i < 3 ? 'point_3' : 'island_start', { volume: i < 3 ? 0.5 : 0.7 });
      if (i === etapes.length - 1) { this.hold = false; this._compteEl = null; this._compteTimers = []; setTimeout(() => el.remove(), 500); }
    }, (avant + i * pas) * 1000));
  }
  annulerCompte() { for (const t of this._compteTimers || []) clearTimeout(t); this._compteTimers = []; if (this._compteEl) { this._compteEl.remove(); this._compteEl = null; } }
  /** Au Souffle court, sous une carte du tutoriel qui fige (toutes sauf celle qui demande une pose) : le temps s'arrête et la pose attend. */
  tutoTient() { return !!(this.tempo && this.tutorial && this.tutorial.current && this.tutorial.current.step.fige !== false); }

  /** Range la partie en cours (appareil seulement, jamais en ligne). */
  saveRun(now = false) {
    const isl = this.isl;
    if (!isl || isl.ended || this.finished || this.finale || Game.testMode || this.def.tempo) return;
    if (!now && !this.runDirty) return;
    this.runDirty = false; this.runTimer = 0;
    RunSave.write(Game.whereOf(this.def), isl, this.title);
  }

  exit() {
    this.saveRun(true);
    document.removeEventListener('visibilitychange', this.onHide);
    window.removeEventListener('pagehide', this.onLeave);
    window.removeEventListener('blur', this.onLeave);
    document.removeEventListener('pointerdown', this.onAppuiAilleurs, true);
    for (const u of this.unsubs || []) u();
    this.hud && this.hud.destroy(); document.getElementById('hud').classList.remove('on', 'tempo', 'brume');
    this.tutorial && this.tutorial.destroy(); document.getElementById('tutorial').classList.remove('on', 'brume');
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
    const w = isl.look || null;   // l'habillage de la surprise en cours
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
      // au Souffle court, un seul texte flottant par pose (le total) et pas de ruban de coup : le regard reste sur l'île ; le mot va sur la tuile
      const sobre = !!this.tempo;
      for (const bs of e.result.base) { if (!sobre) setTimeout(() => fx.floatText(w.x, w.y + 30, `+${bs.pts} ${bs.label}`, '#5aa7d6', 18, 1.2), 90 * i++); if (bs.label === 'rivière') this.tutorial.onEvent('river'); }
      // la première grande région : une carte l'explique, une seule fois par joueur
      if (!sobre && e.result.base.some((x) => /grande région/.test(x.label))) { const seen = Save.data.seen || (Save.data.seen = {}); if (!seen.grandeRegion) { seen.grandeRegion = true; Save.save(); this.tutorial.pushCard('grandeRegion', STORY.mechCards.grandeRegion); } }
      if (e.result.total !== 0) setTimeout(() => fx.floatText(w.x, w.y - 40, `${e.result.total > 0 ? '+' : ''}${e.result.total}`, e.result.total > 0 ? '#2b2a26' : '#d95f4b', 26, 1.4), 90 * i + 60);
      if (sobre && this.tempo.dernier && !this.tempo.attend) this.hud.retourTempo(this.tempo.dernier);
      // commentaire du coup, série et paliers de score
      if (e.result.blight) { setTimeout(() => { this.hud.ribbon('En friche : cette tuile ne rapportera plus rien', '#d95f4b', 2200, 'bad'); AudioSys.play('point_bad', { volume: 0.5 }); }, 90 * i + 380); const seen = Save.data.seen || (Save.data.seen = {}); if (!seen.blight) { seen.blight = true; Save.save(); this.tutorial.pushCard('blight', STORY.mechCards.blight); } }
      if (e.grade && GRADES[e.grade] && !sobre) {
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
      if (e.kind === 'restore') {
        setTimeout(() => { fx.floatText(w.x, w.y - 44, `${e.result.total >= 0 ? '+' : ''}${e.result.total}`, '#2f9e8f', 24, 1.6); this.hud.ribbon(`${fam} remise en état`, '#2f9e8f', 1600, 'good'); this.hud.bumpScore(e.result.total); fx.closeBurst(w.x, w.y - 10, 4); AudioSys.play('bud', { volume: 0.6 }); }, 60);
        this.hud.notify(`${fam} : friche remise en état, elle recompte pour sa famille`, 'good');
      } else if (e.kind === 'fuse') {
        const nm = (STORY.tiles[e.recipe] || {}).name || e.recipe; const ft = STORY.fusion.done[Math.floor(Math.random() * STORY.fusion.done.length)];
        setTimeout(() => { fx.floatText(w.x, w.y - 44, `${e.result.total >= 0 ? '+' : ''}${e.result.total}`, '#e0a33a', 26, 1.6); this.hud.ribbon(`${ft} ${nm}`, '#e0a33a', 1800, 'master'); this.hud.bumpScore(e.result.total); fx.closeBurst(w.x, w.y - 10, 6); this.shake.trigger(0.1); AudioSys.play('region_big', { volume: 0.6 }); }, 90 * i + 60);
        if (e.first) { setTimeout(() => { this.hud.ribbon(STORY.fusion.discovery.replace('{n}', nm), '#2f9e8f', 2200, 'streak'); AudioSys.play('star_1', { volume: 0.6 }); }, 90 * i + 600); if (!Save.data.campaign.recipes.includes(e.recipe)) { Save.data.campaign.recipes.push(e.recipe); Save.save(); } }
        const from = (STORY.tiles[e.tile.from ? e.tile.from[0] : ''] || {}).name || '';
        if (e.with) { const nw = toWorld(e.with.q, e.with.r); setTimeout(() => fx.closeBurst(nw.x, nw.y - 6, 3), 90 * i + 120); }   // la voisine qui a fait recette
        this.hud.notify(`${nm} (${from.toLowerCase()} + ${fam.toLowerCase()}) : ${e.result.total >= 0 ? '+' : ''}${e.result.total}${e.first ? ' · recette découverte, elle s’écrit dans le Cahier' : ''}`, 'gold');
        this.tutorial.onEvent('fuse');
      } else {
        const sig = e.level >= 3 && STORY.level3[e.tile.family];
        const bt = sig ? `${sig.name} !` : STORY.build.done[Math.floor(Math.random() * STORY.build.done.length)];
        setTimeout(() => { fx.floatText(w.x, w.y - 44, `${e.result.total >= 0 ? '+' : ''}${e.result.total}`, '#e0a33a', 24, 1.6); this.hud.ribbon(bt, '#e0a33a', sig ? 2000 : 1400, sig ? 'master' : 'good'); this.hud.bumpScore(e.result.total); if (sig) { fx.closeBurst(w.x, w.y - 10, 7); this.shake.trigger(0.12); AudioSys.play('region_big', { volume: 0.6 }); this.tutorial.onEvent('build3'); } }, 90 * i + 60);
        this.hud.notify(`Bâti : ${fam} niveau ${e.level} (${e.result.total >= 0 ? '+' : ''}${e.result.total})`, 'gold');
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
      if (!this.def.daily && !this.def.tempo) AudioSys.playMusic(seasonMusic(e.to, this.seasonCount[e.to]), { fade: 3 });
      const s = STORY.seasons[e.to]; const rl = e.rule && STORY.seasonRules[e.rule] ? STORY.seasonRules[e.rule] : null;
      this.hud.logOnly(`${s.name}${rl && isl.rulesVariable ? ` · ${rl.name}` : ''} — ${rl ? rl.line : s.line}`, 'season');
      // une surprise (pas la règle de base) : on la dit une fois, et son habillage arrive avec elle
      if (isl.rulesVariable && rl && e.rule !== BASE_RULE[e.to]) {
        setTimeout(() => { this.hud.ribbon(`Surprise : ${rl.name}`, '#2b2a26', 2400, ''); AudioSys.play('weather', { volume: 0.5 }); }, 700);
        if (isl.look === 'storm') setTimeout(() => { this.renderer.flash = 0.2; AudioSys.play('thunder', { volume: 0.7 }); this.thunderTimer = 6 + Math.random() * 8; }, 1400);
        if (this.tutorial) this.tutorial.onEvent('surprise');
      }
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
      if (e.pts) setTimeout(() => this.hud.bumpScore(e.pts), 900 + flights.length * stagger + 2000);   // le détail par source attend au bilan (et sous le compteur, au toucher)
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
    } else if (e.type === 'breath') {
      if (e.kind !== 'undo' && !e.free) AudioSys.play('breath_spend', { volume: 0.5 });
      if (!e.free) this.tutorial.onEvent('breath');
    } else if (e.type === 'lost') {
      const fam = (STORY.tiles[e.tile.family] || {}).name || e.tile.family;
      if (e.n > 1) { this.hud.ribbon(`Fin de l’été : ${e.n} tuiles perdues`, '#d95f4b', 1800, 'warn'); this.hud.notify(`La réserve d’été est vide : ${e.n} tuiles perdues d’un coup, leurs cases resteront vides`, 'warn'); }
      else { const T = BALANCE.tempo; this.hud.ribbon(`${fam} perdue`, '#d95f4b', 1300, 'warn'); this.hud.notify(`Trop tard : la ${fam.toLowerCase()} est perdue. Une case restera vide : −${T.vide} à la fin, jusqu'à −${T.vide + T.videBloque} si elle bloque une région ; la saison n'est plus pleine (−${T.saisonPleine})`, 'warn'); }
      AudioSys.play('tile_discard', { volume: 0.7 }); this.shake.trigger(0.18); Haptics.tap([10, 30, 10]); this.hud.chronoCasse();
      this.armed = null; this.hud.setPlaceButton(null);
    } else if (e.type === 'brume') {
      this.onBrume(e);
    } else if (e.type === 'grow') {
      this.cam.fit(this.isl.board.mask);
    } else if (e.type === 'end') {
      if (this.tempo) this.tempo.brume.clear();   // la brume d'automne se lève : la tournée finale et la carte montrent l'île entière
      if (!Game.testMode) RunSave.archive(Game.whereOf(this.def), this.isl, this.title);   // finie, elle ne se reprend plus — mais elle s'illustre dans un pépin
      RunSave.clear(); this.runDirty = false;   // l'île est finie : plus rien à reprendre
      fx.flushFlights(); this.hud.hold = 0;
      AudioSys.play('island_done', { volume: 0.8 });
      this.startFinale();
    }
  }

  /** Tournée finale (HUD masqué, caméra libre) puis bilan. */
  startFinale() {
    if (this.finale) return;
    this.armed = null; this.hud.setPlaceButton(null);
    document.getElementById('hud').classList.add('finale'); document.getElementById('tutorial').classList.add('finale');
    // l'option `finaleClassique` rend la tournée d'avant sans rien changer d'autre : elle est lue ici,
    // à chaque île, pour qu'un aller-retour ne demande pas de recharger la page
    prechargerTampons(this);   // les insignes de la carte se chargent pendant la tournée
    this.finale = new (Save.options.finaleClassique ? FinaleClassique : Finale)(this);
  }
  bounds() { const tl = this.cam.toWorldPoint(0, 0), br = this.cam.toWorldPoint(STAGE.W, STAGE.H); return { minX: tl.x, maxX: br.x, minY: tl.y, maxY: br.y }; }
  playSfx(key, volume = 0.6) { if (AudioSys.has(key)) AudioSys.play(key, { volume }); }
  onFinaleDone() { document.getElementById('hud').classList.remove('finale'); document.getElementById('tutorial').classList.remove('finale'); this.finished = true; this.endTimer = 10; }

  onMouseDown(b, x, y) {
    if (this.finale && !this.finale.done) { if (b === 0) this.finale.skip(); return; }
    if (this.paused || this.hold || !this.isl || this.isl.ended || (b === 0 && this.tutoTient())) return;
    if (b === 2 || b === 1) { this.drag = { x, y, moved: 0 }; return; }
    if (b !== 0) return;
    const w = this.cam.toWorldPoint(x, y); const { q, r } = fromWorld(w.x, w.y);
    if (this.isl.brume && this.tapBrume(q, r, true)) return;
    // une tuile posée qui a des actions : le premier clic ouvre le choix (bâtir, fusionner, réparer), le second sur la même tuile fait l'action choisie
    if (this.armed && this.armed.build) { if (this.armed.q === q && this.armed.r === r) { this.doAction(this.armed.i); return; } this.disarm(); }
    if (this.isl.canPlace(q, r)) { this.isl.place(q, r); this.renderer.hover = null; }
    else if (this.isl.board.get(q, r) && this.isl.canBuild(q, r)) this.armBuild(q, r);
    else if (this.isl.board.has(q, r) && !this.isl.board.get(q, r)) { AudioSys.play('tile_invalid', { volume: 0.5 }); this.hud.notify(this.isl.restrict ? 'Pose la tuile sur la case qui brille' : 'Une tuile doit toucher une tuile posée', 'warn'); }
    else if (this.isl.board.get(q, r)) { const why = this.isl.pourquoiPas(q, r); if (why) { AudioSys.play('tile_invalid', { volume: 0.5 }); this.hud.notify(why, 'warn'); } }
  }
  /** Ouvre le choix des actions sur une tuile posée (bâtir, fusionner, remettre en état) : la tuile est armée, le bandeau liste les actions. */
  armBuild(q, r) {
    const acts = this.isl.actions(q, r); if (!acts.length) return;
    this.armed = { q, r, build: true, i: 0 }; this.hud.setPlaceButton(null); this.hud.setActions(acts, q, r, 0);
    AudioSys.play('tile_hover', { volume: 0.3 });
  }
  /** Fait l'action `i` de la tuile armée. */
  doAction(i) {
    if (!this.armed || !this.armed.build || this.paused || this.hold || !this.isl || this.isl.ended || this.tutoTient()) return;
    const { q, r } = this.armed; const a = this.isl.actions(q, r)[i || 0]; this.disarm();
    if (!a) return;
    if (this.isl.build(q, r, a.kind, a.recipe ? a.recipe.id : null)) this.renderer.hover = null; else AudioSys.play('ui_error', { volume: 0.4 });
  }
  /** Désarme la case ou la tuile choisie et replie les boutons du bandeau. */
  disarm() { this.armed = null; this.hud.setPlaceButton(null); this.hud.setActions(null); }
  /** Oublie la case visée (appui ailleurs, glissé, autre tuile) : le prochain toucher sur elle la visera de nouveau, sans poser. */
  oublierVisee() { if (!this.armed) return; this.disarm(); this.renderer.hover = null; }
  /** Le bouton « Bâtir » du bandeau : fait briller les tuiles qui ont une action et dit ce qu'on peut y faire. */
  buildHint() {
    if (!this.isl || this.isl.ended) return;
    const n = this.isl.buildTargets().length;
    this.renderer.flashTargets = this.renderer.time + 3;
    AudioSys.play('ui_click', { volume: 0.4 });
    if (n) this.hud.notify(`${n} tuile${n > 1 ? 's' : ''} attend${n > 1 ? 'ent' : ''} une action : touche-la${n > 1 ? ' ' : ''}${n > 1 ? '(bâtir une région close, fusionner deux voisines, réparer une friche)' : ''}`, 'info');
    else this.hud.notify(this.isl.fuseOn ? 'Rien à bâtir pour l’instant : il faut une région close, deux voisines qui font recette ou une friche, et des souffles' : 'Rien à bâtir pour l’instant : il faut une région close et des souffles', 'info');
  }
  onMouseUp(b, x, y) { if (b === 2 || b === 1) this.drag = null; }
  onResize() { if (this.cam && this.isl) this.cam.fit(this.isl.board.mask, this.marges()); }
  /** Tactile : première touche = aperçu (case armée), seconde touche sur la même case = pose. */
  onTap(x, y) {
    if (this.finale && !this.finale.done) { this.finale.skip(); return; }
    if (this.paused || this.hold || !this.isl || this.isl.ended || this.tutoTient()) return;
    const w = this.cam.toWorldPoint(x, y); const { q, r } = fromWorld(w.x, w.y);
    if (this.isl.brume && this.tapBrume(q, r, false)) return;
    if (this.isl.board.get(q, r)) {
      // toucher une tuile posée : ses actions s'affichent dans le bandeau ; un second toucher sur la même tuile fait l'action choisie
      if (this.armed && this.armed.build && this.armed.q === q && this.armed.r === r) { this.doAction(this.armed.i); return; }
      if (!this.isl.canBuild(q, r)) { this.disarm(); const why = this.isl.pourquoiPas(q, r); if (why) { AudioSys.play('tile_invalid', { volume: 0.5 }); this.hud.notify(why, 'warn'); } return; }
      this.armBuild(q, r); return;
    }
    if (!this.isl.board.has(q, r)) { this.disarm(); return; }
    if (!this.isl.canPlace(q, r)) { this.armed = null; this.hud.setPlaceButton(null); AudioSys.play('tile_invalid', { volume: 0.5 }); this.hud.notify(this.isl.restrict ? 'Pose la tuile sur la case qui brille' : 'Une tuile doit toucher une tuile posée', 'warn'); return; }
    if (this.armed && this.armed.q === q && this.armed.r === r) { this.placeArmed(); return; }
    // Souffle court, option « poser d'un seul toucher » : la première touche sur une case légale pose
    if (this.tempo && this.def.unToucher) { this.armed = { q, r }; this.placeArmed(); return; }
    this.armed = { q, r }; AudioSys.play('tile_hover', { volume: 0.3 });
  }
  placeArmed() {
    if (!this.armed || this.paused || this.hold || !this.isl || this.isl.ended || this.tutoTient()) return;
    if (this.armed.build) { this.doAction(this.armed.i); return; }
    const { q, r, move } = this.armed; this.armed = null; this.hud.setPlaceButton(null);
    if (move) { this.doMove(q, r); return; }
    if (this.isl.canPlace(q, r)) { this.isl.place(q, r); this.renderer.hover = null; }
  }
  // ---- Sous la brume : fiche d'une case cachée, déplacement ----
  /**
   * Un toucher (ou un clic, `immediat`) pendant une partie sous la brume. Une case cachée ouvre sa fiche (jalon,
   * crayon). En mode Déplacer : le premier toucher choisit la tuile, le suivant sa destination (deux fois au doigt,
   * comme une pose). Rend vrai si le geste a été pris ici.
   */
  tapBrume(q, r, immediat) {
    const isl = this.isl, k = key(q, r);
    if (isl.board.fog.has(k)) { this.armed = null; this.hud.setPlaceButton(null); this.openBrumeCase(q, r); return true; }
    if (!this.moving) return false;
    const from = this.renderer.moveFrom;
    const t = isl.board.get(q, r);
    if (t) {
      if (from && from.q === q && from.r === r) { this.setMoveFrom(null); return true; }
      if (isl.canMove(q, r)) { this.setMoveFrom({ q, r }); AudioSys.play('tile_hover', { volume: 0.4 }); return true; }
      AudioSys.play('tile_invalid', { volume: 0.5 });
      this.hud.notify(t.start ? 'Une tuile de départ ne bouge pas' : t.devoilee ? 'Une tuile dévoilée reste où la brume l’a laissée' : isl.fogAround(q, r).length ? 'Cette tuile touche la brume : elle ne bouge plus avant le dévoilement' : 'Cette tuile ne peut pas bouger', 'warn');
      return true;
    }
    if (!from) { this.hud.notify('Déplacer : touche d’abord la tuile à déplacer', 'warn'); return true; }
    if (!(this.renderer.moveTargets || []).some((c) => c.q === q && c.r === r)) { AudioSys.play('tile_invalid', { volume: 0.5 }); this.hud.notify('La tuile déplacée doit toucher une autre tuile', 'warn'); return true; }
    if (immediat || (this.armed && this.armed.move && this.armed.q === q && this.armed.r === r)) { this.armed = null; this.doMove(q, r); return true; }
    this.armed = { q, r, move: true }; AudioSys.play('tile_hover', { volume: 0.3 });
    return true;
  }
  setMoveFrom(c) { this.renderer.moveFrom = c; this.renderer.moveTargets = c ? this.isl.moveTargets(c.q, c.r) : null; this.armed = null; this.hud.setPlaceButton(null); }
  toggleMove(force) {
    if (!this.isl || !this.isl.brume || this.isl.ended) return;
    this.moving = force !== undefined ? force : !this.moving; this.hud.moving = this.moving; this.setMoveFrom(null);
    AudioSys.play(this.moving ? 'ui_open' : 'ui_close', { volume: 0.4 });
    if (this.moving) this.hud.notify('Déplacer : touche la tuile, puis sa nouvelle case. La prochaine tuile de la main sera perdue.', 'special');
  }
  doMove(q, r) {
    const f = this.renderer.moveFrom; if (!f) return;
    const res = this.isl.move(f.q, f.r, q, r);
    if (!res) { AudioSys.play('ui_error', { volume: 0.4 }); return; }
    this.renderer.hover = null; this.toggleMove(false);
  }
  openBrumeCase(q, r) {
    const isl = this.isl; this.hold = true;
    const close = () => { hideUI(); this.hold = false; };
    showUI(buildBrumePicker({ isl, q, r,
      onJalon: (f) => { if (isl.planterJalon(q, r, f)) AudioSys.play('ui_confirm', { volume: 0.5 }); close(); },
      onNote: (f) => { isl.noter(q, r, f); AudioSys.play('ui_click', { volume: 0.4 }); close(); },
      onLongueVue: () => { close(); if (isl.longueVue(q, r)) AudioSys.play('ui_confirm', { volume: 0.5 }); },
      onClose: () => { AudioSys.play('ui_close', { volume: 0.4 }); close(); } }), 'panel-wrap');
  }
  /**
   * Le tirage de saison, à l'écran : une carte au centre qui fait défiler les noms comme une roue, puis s'arrête sur la
   * carte tirée (verte pour un bonus, rouge pour un malus), avec la chance qui l'a tirée. Un toucher la ferme ; sinon elle
   * s'efface seule. La carte reste ensuite sous le bandeau de saison.
   */
  tirageBrume(carte, ratio) {
    const hud = document.getElementById('hud'); const anc = hud.querySelector('.brume-tirage'); if (anc) anc.remove();
    const nomEl = h('b', {}, '…'); const kick = h('span', { class: 'bt-kicker' }, 'Tirage de saison');
    const texte = h('span', { class: 'bt-texte' }, `${Math.round(ratio * 100)} % de chance de bonus`);
    const el = h('div', { class: 'brume-tirage' }, kick, nomEl, texte);
    hud.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
    const noms = [...CARTES.bonus, ...CARTES.malus].map((c) => c.nom); let i = Math.floor(Math.random() * noms.length), n = 0;
    AudioSys.play('ui_open', { volume: 0.4 });
    const roue = setInterval(() => { i = (i + 1) % noms.length; nomEl.textContent = noms[i]; if (++n % 3 === 0) AudioSys.play('tile_hover', { volume: 0.25, minInterval: 0.05 }); }, 70);
    setTimeout(() => {
      clearInterval(roue); nomEl.textContent = carte.nom; texte.textContent = carte.texte; kick.textContent = carte.bonus ? 'Bonus de la saison' : 'Malus de la saison';
      el.classList.add(carte.bonus ? 'bonus' : 'malus', 'tire');
      AudioSys.play(carte.bonus ? 'rare_tile' : 'point_bad', { volume: 0.6 }); if (!carte.bonus) this.shake.trigger(0.1);
      this.hud.logOnly(`${carte.bonus ? 'Bonus' : 'Malus'} de la saison : ${carte.nom} — ${carte.texte}`, 'season');
    }, 1500);
    const fermer = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); };
    el.addEventListener('click', (ev) => { ev.stopPropagation(); fermer(); });
    setTimeout(fermer, 5200);
  }
  /** Les événements du mode : dévoilement, jalon, déplacement. */
  onBrume(e) {
    const fx = this.fx; const nom = (f) => (f === 'tresor' ? 'trésor' : ((STORY.tiles[f] || {}).name || f)).toLowerCase();
    if (e.kind === 'reveal') {
      AudioSys.play('region_close', { volume: 0.7 });
      this.hud.ribbon(e.fin ? 'La brume se lève une dernière fois' : `La brume se lève : ${e.cells.length} case${e.cells.length > 1 ? 's' : ''}`, '#8a6fb5', 1800, 'streak');
      e.cells.forEach((c, i) => setTimeout(() => {
        const w = toWorld(c.q, c.r); fx.drop(key(c.q, c.r)); fx.ring([{ q: c.q, r: c.r }], c.juste ? '#8a6fb5' : '#e0a33a'); fx.closeBurst(w.x, w.y - 10, c.tresor ? 7 : 3);
        const pts = c.result.total + c.extra;
        fx.floatText(w.x, w.y - 40, `${pts >= 0 ? '+' : ''}${pts}`, pts >= 0 ? '#2b2a26' : '#d95f4b', 24, 1.5);
        if (c.juste === true) { fx.floatText(w.x, w.y + 24, 'jalon juste ×3', '#8a6fb5', 18, 1.6); AudioSys.play('star_1', { volume: 0.6 }); }
        if (c.juste === false) { fx.floatText(w.x, w.y + 24, `jalon faux (${nom(c.jalon)})`, '#d95f4b', 18, 1.6); AudioSys.play('point_bad', { volume: 0.5 }); }
        if (c.tresor) { this.hud.ribbon(`Trésor : ${nom(c.tile.family)} !`, '#e0a33a', 2000, 'master'); AudioSys.play('rare_tile', { volume: 0.7 }); this.shake.trigger(0.12); }
        this.hud.bumpScore(pts);
      }, 500 + i * 380));
      this.hud.logOnly(`Dévoilées : ${e.cells.map((c) => nom(c.tile.family)).join(', ')} (${e.pts >= 0 ? '+' : ''}${e.pts})`, 'season');
    } else if (e.kind === 'tirage') {
      this.tirageBrume(e.carte, e.ratio);
    } else if (e.kind === 'coup') {
      // la chance de bonus bouge d'un cran : un mot sur le bandeau, pas plus
      this.hud.notify(`${e.bon ? 'Bon coup' : 'Mauvais coup'} : ${Math.round(e.ratio * 100)} % de bonus à la prochaine saison`, e.bon ? 'info' : 'warn');
    } else if (e.kind === 'crayonSur') {
      this.hud.ribbon(e.juste ? `Crayon sûr : ${nom(e.famille)}, juste !` : `Crayon sûr : ce n’est pas ${nom(e.famille)}`, e.juste ? '#2f9e8f' : '#d95f4b', 1800, e.juste ? 'streak' : 'warn');
      AudioSys.play(e.juste ? 'star_1' : 'point_bad', { volume: 0.5 });
    } else if (e.kind === 'lanterne') {
      this.hud.notify(`Lanterne : les voisines cachées de sa famille sont marquées (${e.n})`, 'special');
    } else if (e.kind === 'perdue') {
      this.hud.ribbon(`Tuile perdue : ${nom(e.tile.family)}`, '#d95f4b', 1500, 'warn'); AudioSys.play('tile_discard', { volume: 0.6 });
    } else if (e.kind === 'brumeGagne') {
      this.hud.notify('La brume gagne : une case de plus à deviner', 'warn'); AudioSys.play('weather', { volume: 0.4 });
    } else if (e.kind === 'vent') {
      const w = toWorld(e.q, e.r); fx.drop(key(e.q, e.r)); this.hud.notify(`Vent contraire : ${nom(e.tile.family)} a glissé`, 'warn'); AudioSys.play('weather', { volume: 0.5 });
    } else if (e.kind === 'jalon') {
      this.hud.notify(`Jalon planté : ${nom(e.famille)}`, 'info');
    } else if (e.kind === 'jalonManque') {
      this.hud.notify(`Pas de jalon cette saison : ${e.pts}`, 'warn');
    } else if (e.kind === 'move') {
      const w = toWorld(e.q, e.r); fx.drop(key(e.q, e.r)); fx.placeBurst(w.x, w.y, e.result.total > 0);
      AudioSys.play(`tile_place_${1 + Math.floor(Math.random() * 4)}`, { volume: 0.7 });
      if (e.result.total) fx.floatText(w.x, w.y - 40, `${e.result.total > 0 ? '+' : ''}${e.result.total}`, e.result.total > 0 ? '#2b2a26' : '#d95f4b', 24, 1.4);
      this.hud.bumpScore(e.result.total);
      this.hud.notify(`Tuile déplacée${e.lost ? ` · perdue : ${nom(e.lost.family)}` : ''}${typeof e.tile.indice === 'number' ? ` · indice : ${e.tile.indice}` : ''}`, 'special');
      this.updateAmbience();
    }
  }

  onKey(k) {
    if (this.finale && !this.finale.done) { if (k !== 'KeyM') this.finale.skip(k); return; }
    if (k === 'Escape') { this.togglePause(); return; }
    if (k === 'KeyM') { const m = AudioSys.toggleMute(); Save.options.muted = m; Save.save(); return; }
    if (this.paused || this.hold || !this.isl || this.isl.ended) return;
    const isl = this.isl;
    if (k === 'Digit2' || k === 'Numpad2') { if (isl.handOn) this.hud.onPick(1); }
    if (k === 'Digit3' || k === 'Numpad3') { if (isl.handOn) this.hud.onPick(2); }
    if (k === 'Digit4' || k === 'Numpad4') { if (isl.handOn) this.hud.onPick(3); }
    if (k === 'Digit5' || k === 'Numpad5') { if (isl.handOn) this.hud.onPick(4); }
    if (k === 'KeyX') { if (this.mech.has('breath')) { if (isl.discard()) AudioSys.play('tile_discard', { volume: 0.6 }); } }
    if (k === 'KeyJ') this.hud.toggleLog();
    if (k === 'KeyH') this.hud.setTileHelp(this.hud.helpHidden || Save.options.tileHelp === false);
    if (k === 'KeyZ') { if (this.mech.has('breath') && isl.undo()) AudioSys.play('tile_undo', { volume: 0.6 }); }
    if (Game.testMode) {
      if (k === 'F1') { if (this.debugEl) { this.debugEl.remove(); this.debugEl = null; } else { this.debugEl = h('div', { class: 'debug' }); document.getElementById('app').appendChild(this.debugEl); } }
      if (k === 'F2') { isl.queue.total = Infinity; isl.queue.fill(); this.hud.notify('File infinie', 'special'); }
      if (k === 'F3') { isl.advanceSeason(); }
      if (k === 'F4') { isl.breaths += 10; this.hud.notify('+10 souffles', 'special'); }
      if (k === 'F5') { isl.finish('test'); }
    }
  }

  /** La ligne sous le nom de l'île, en pause : chapitre, île, climat. */
  pauseSub() {
    const d = this.def; const ch = d.chapter ? CHAPTERS[d.chapter - 1] : null;
    const cl = d.climate && d.climate !== 'temperate' && STORY.climates && STORY.climates[d.climate] ? ` · ${STORY.climates[d.climate].name}` : '';
    return ch ? `Chapitre ${ch.id} · ${ch.name} · île ${d.id}${cl}` : d.daily ? 'Île du jour' : d.infinite ? 'Île infinie' : d.garden ? 'Jardin' : d.tempo ? 'Le Souffle court' : d.brume ? 'Sous la brume' : '';
  }
  togglePause(force) {
    if (!this.isl || this.isl.ended) return;
    this.paused = force !== undefined ? force : !this.paused;
    document.getElementById('tutorial').classList.toggle('paused', this.paused);
    if (this.paused) {
      AudioSys.play('ui_open', { volume: 0.5 });
      this.annulerCompte();   // une pause pendant le décompte : il repartira de zéro à la reprise, seul
      this.saveRun(true);
      const build = () => buildPause({ title: this.title, sub: this.pauseSub(), kept: !Game.testMode, onResume: () => this.togglePause(false), onJournal: () => { this.togglePause(false); this.hud.toggleLog(true); }, journalCount: this.hud.unread, onRestart: () => { RunSave.clear(); scenes.go('island', { def: this.def }, { fade: 0.5 }); }, onOptions: () => Game.showOptions(() => showUI(build(), 'pause-wrap')), onGuide: () => Game.showGuide(() => showUI(build(), 'pause-wrap')), onFullscreen: () => { Game.toggleFullscreen(); setTimeout(() => { if (this.paused) showUI(build(), 'pause-wrap'); }, 400); }, onMenu: () => scenes.go('menu'), onPostcard: () => { try { showUI(buildPostcard({ canvas: renderPostcard(this), filename: postcardName(this), onBack: () => showUI(build(), 'pause-wrap') }), 'panel-wrap'); } catch (e) { console.warn('carte postale', e); } }, onReport: () => Game.showReport(() => showUI(build(), 'pause-wrap')) });
      showUI(build(), 'pause-wrap');
    } else { hideUI(); AudioSys.play('ui_close', { volume: 0.5 }); if (this.tempo) { const mu = this.musiqueDuMode(); this.compteARebours(mu.tempsParPas * 60 / mu.bpm * 0.75); } }
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
    // sous une carte du tutoriel, le temps s'arrête : on lit, puis on joue (le tutoriel se met à jour d'abord, pour qu'une carte qui apparaît arrête le temps dans la même image)
    this.tutorial.update(dt);
    const tutoTient = this.tutoTient();
    if (this.tempo && !this.hold && !tutoTient && !isl.ended) { this.tempo.update(dt); this.hud.setTempo(this.tempo); }
    if (this.tempo && !isl.ended) {
      // le battement : la phase dans le temps de la musique (horloge audio), sinon un métronome au même tempo
      const mu = this.musiqueDuMode(), temps = 60 / mu.bpm; const ctx = AudioSys.ctx;
      const depuis = ctx && this.tempo.musiqueAt !== null && this.tempo.musiqueAt !== undefined ? ctx.currentTime - this.tempo.musiqueAt - mu.premierTemps : (this._metro = (this._metro || 0) + dt);
      const battement = ((depuis % temps) + temps) % temps / temps;
      // le chronomètre se pose juste au-dessus de l'île : le sommet du masque, en écran
      if (this._chronoV !== isl.board.version) { this._chronoV = isl.board.version; let y = Infinity, y2 = -Infinity; for (const k of isl.board.mask) { const [q, r] = parse(k); const wy = toWorld(q, r).y; y = Math.min(y, wy); y2 = Math.max(y2, wy); } this._chronoY = y - SIZE; this._basY = y2 + SIZE; }
      this.hud.setChrono({ t: this.hold ? this.tempo.limit : this.tempo.t, f: this.hold ? 1 : this.tempo.fraction, fige: tutoTient || this.tempo.attend, puls: Math.pow(1 - battement, 3), urgent: !this.hold && this.tempo.t <= 1, y: this.cam.toScreen(0, this._chronoY).y });
      this.hud.setQueueTop(this.cam.toScreen(0, this._basY).y);   // la tuile à poser se cale juste sous l'île, pas au bord de l'écran
    }
    // Ce qui suit (aperçu sous le doigt ou la souris, bandeau) ne dépend que de l'image affichée : une fois par image,
    // pas à chaque pas de simulation. Quand une image est lente, la boucle rattrape jusqu'à huit pas : on refaisait huit
    // aperçus et huit bandeaux, donc plus le téléphone ramait, plus on lui en demandait.
    const uiFrame = !this._uiFait; this._uiFait = true;
    // la tuile du moment a changé (défausse, annulation, main, raccourci clavier) : la case visée l'était pour l'autre tuile
    { const cur = isl.current ? `${isl.current.id}|${isl.current.family}` : ''; if (cur !== this._tuileVisee) { if (this._tuileVisee !== undefined && this.armed && !this.armed.build) this.oublierVisee(); this._tuileVisee = cur; } }
    // survol
    if (!uiFrame) { /* déjà fait pour cette image */ }
    else if (!isl.ended && input.lastPointer === 'touch') {
      if (this.armed && this.armed.move && this.renderer.moveFrom) { const f = this.renderer.moveFrom; const pv = isl.previewMove(f.q, f.r, this.armed.q, this.armed.r); if (pv) { this.renderer.hover = { q: this.armed.q, r: this.armed.r, preview: pv, tile: isl.board.get(f.q, f.r) }; this.hud.setPlaceButton(pv.total, 'move'); } else { this.armed = null; this.renderer.hover = null; this.hud.setPlaceButton(null); } }
      else if (this.armed && this.armed.build) { const acts = isl.actions(this.armed.q, this.armed.r); const a = acts[this.armed.i] || acts[0]; if (a) { this.renderer.hover = { q: this.armed.q, r: this.armed.r, preview: a.pv }; this.hud.setActions(acts, this.armed.q, this.armed.r, acts.indexOf(a)); } else this.disarm(); }
      else if (this.armed && !this.armed.build && isl.canPlace(this.armed.q, this.armed.r)) { const pv = isl.preview(this.armed.q, this.armed.r); this.renderer.hover = { q: this.armed.q, r: this.armed.r, preview: pv }; this.hud.setPlaceButton(pv ? pv.total : null); }
      else { this.disarm(); this.renderer.hover = null; }
    } else if (!isl.ended) {
      const w = this.cam.toWorldPoint(input.mouse.x, input.mouse.y); const { q, r } = fromWorld(w.x, w.y);
      const hk = key(q, r);
      if (this.lastHover !== hk) { this.lastHover = hk; if (isl.board.has(q, r) && !isl.board.get(q, r) && isl.canPlace(q, r)) AudioSys.play('tile_hover', { volume: 0.18, minInterval: 0.08 }); }
      if (this.moving && this.renderer.moveFrom) { const f = this.renderer.moveFrom; const pv = isl.board.has(q, r) && !isl.board.get(q, r) ? isl.previewMove(f.q, f.r, q, r) : null; this.renderer.hover = pv ? { q, r, preview: pv, tile: isl.board.get(f.q, f.r) } : null; }
      else {
        // survoler une case vide montre la pose, une tuile posée sa première action ; une tuile armée (choix ouvert dans le bandeau)
        // montre l'action choisie quand la souris est sur elle ou sur rien d'utile — on peut donc viser une case vide sans refermer le choix
        let hover = isl.board.has(q, r) && !isl.board.fog.has(key(q, r)) ? { q, r, preview: isl.board.get(q, r) ? isl.previewBuild(q, r) : isl.preview(q, r) } : null;
        if (this.armed && this.armed.build) {
          const acts = isl.actions(this.armed.q, this.armed.r); const a = acts[this.armed.i] || acts[0];
          if (!a) this.disarm();
          else { this.hud.setActions(acts, this.armed.q, this.armed.r, acts.indexOf(a)); if (hover && hover.q === this.armed.q && hover.r === this.armed.r) hover.preview = a.pv; else if (!hover || !hover.preview) hover = { q: this.armed.q, r: this.armed.r, preview: a.pv }; }
        }
        this.renderer.hover = hover;
      }
    } else this.renderer.hover = null;
    this.particles.update(dt); this.fx.update(dt); this.shake.update(dt);
    const b = (() => { const tl = this.cam.toWorldPoint(0, 0), br = this.cam.toWorldPoint(STAGE.W, STAGE.H); return { minX: tl.x, maxX: br.x, minY: tl.y, maxY: br.y }; })();
    const wkey = isl.look || null;
    if (this.renderer.weather !== wkey) this.renderer.weather = wkey;
    // quand les i/s baissent (téléphone modeste), la mer renonce à sa profondeur et à son écume large ; avec un peu
    // d'hystérésis pour ne pas clignoter autour du seuil
    if (loop.fps < 42) this.renderer.lowFx = true; else if (loop.fps > 52) this.renderer.lowFx = false;
    // mode repos : après huit secondes sans geste, l'interface s'efface et la vue respire ; tout geste rétablit
    const resting = Save.options.rest !== false && input.idleSeconds > 8 && !this.armed && !this.finale && !isl.ended && !isl.tempo;
    this.hud.setResting(resting); this.cam.breathe(resting ? 1 : 0, dt);
    const objs = this.renderer.decor.objects;
    if (this._srcV !== isl.board.version) { this._srcV = isl.board.version; this._sources = objs.filter((o) => o.tpl && (o.tpl.startsWith('obj_tree'))).map((o) => ({ x: o.x, y: o.y })); this._tiles = [...isl.board.tiles.values()].map((t) => { const w = toWorld(t.q, t.r); return { family: t.family, frozen: t.frozen, rare: t.rare, wx: w.x, wy: w.y }; }); }
    this.fx.ambient(dt, isl.season, b, 1, this._sources);
    this.fx.life(dt, { objects: objs, tiles: this._tiles, season: isl.season, weather: wkey, bounds: b });
    if (wkey === 'storm') { this.thunderTimer = (this.thunderTimer || 8) - dt; if (this.thunderTimer <= 0) { this.thunderTimer = 7 + Math.random() * 9; this.renderer.flash = 0.16; AudioSys.play('thunder', { volume: 0.6 }); this.shake.trigger(0.15); } }
    if (uiFrame) this.hud.update();
    if (this.finished) { this.endTimer += dt; if (this.endTimer > 2.2) { this.finished = false; try { isl.result.postcard = { canvas: renderPostcard(this), filename: postcardName(this) }; } catch (e) { console.warn('carte postale', e); } Game.afterIsland(isl.result, this.def); } }
    if (this.debugEl) this.debugEl.textContent = `placements=${isl.placements} season=${isl.season} ${isl.inSeason}/${isl.seasonLength} score=${isl.score} breaths=${isl.breaths} fauna=${isl.fauna.size} queue=${isl.queue.remaining} fps=${loop.fps} particles=${this.particles.count} zoom=${this.cam.zoom.toFixed(2)}`;
    input.endFrame();
  }
  render(ctx, alpha, dt) {
    this._uiFait = false;
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
    const show = () => showUI(buildResults({ result, def, newRecord, seedsGained, daily, memory: def.daily || def.infinite || def.garden ? [] : islandMemoryScreens(def, result).map((x) => x.text), onContinue: () => Game.afterResults(result, def), onRetry: () => (def.tempo ? Game.rejouerTempo(def) : Game.startIsland(def.id, { skipIntro: true })), onMenu: () => scenes.go('menu'), onPostcard: result.postcard ? () => showUI(buildPostcard({ canvas: result.postcard.canvas, filename: result.postcard.filename, onBack: show }), 'panel-wrap') : null, onWorkshop: () => showUI(buildWorkshop({ onContinue: show }), 'workshop-wrap') }), 'results-wrap'); show();
  }
  exit() { hideUI(); }
  update(dt) { this.bg.update(dt); input.endFrame(); }
  render(ctx, alpha, dt) { this.bg.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(244,239,230,0.5)'; ctx.fillRect(0, 0, STAGE.W, STAGE.H); }
}
/** L'écran de départ d'une île (récit, semis, vœux), sur le fond du menu. */
class PrepScene {
  async enter({ node }) { this.bg = scenes.scenes.get('menu').ensureBg(); showUI(node, 'panel-wrap'); }
  exit() { hideUI(); }
  update(dt) { this.bg.update(dt); input.endFrame(); }
  render(ctx, alpha, dt) { this.bg.render(ctx, alpha, dt); ctx.fillStyle = 'rgba(244,239,230,0.45)'; ctx.fillRect(0, 0, STAGE.W, STAGE.H); }
}
class WorkshopScene {
  async enter({ onContinue, intro, continuer }) { AudioSys.playMusic('results', { fade: 1.5 }); this.bg = scenes.scenes.get('menu').ensureBg(); showUI(buildWorkshop({ onContinue, intro, continuer }), 'workshop-wrap'); }
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
scenes.register('prep', new PrepScene());
scenes.register('workshop', new WorkshopScene());
scenes.register('ending', new EndingScene());

const loop = new Loop({ update: (dt) => scenes.update(dt), render: (alpha, dt) => { scenes.render(ctx, alpha, dt); if (Game.fpsEl && Game.fpsEl.style.display !== 'none') Game.fpsEl.textContent = `${loop.fps} i/s`; } });
window.CS.loop = loop;
Game.boot().then(() => loop.start()).catch((e) => { console.error(e); const s = document.getElementById('boot-status'); if (s) s.textContent = 'Erreur de chargement : ' + e.message; });
