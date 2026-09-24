// Système audio : Web Audio API, bus master / musique / ambiance / SFX, crossfades.
// Toutes les sources sont de vrais fichiers audio (OGG) listés dans assets/audio/manifest.json.

const BASE = 'assets/audio/';

class Bus {
  constructor(ctx, dest) { this.gain = ctx.createGain(); this.gain.connect(dest); this.volume = 1; }
  set(v, ctx, t = 0.05) { this.volume = v; this.gain.gain.setTargetAtTime(v, ctx.currentTime, t); }
}

export const AudioSys = {
  ctx: null,
  manifest: null,
  buffers: new Map(),
  pending: new Map(),
  bus: {},
  music: { key: null, src: null, gain: null },
  ambience: new Map(), // key -> {src, gain, target}
  volumes: { master: 0.8, music: 0.7, ambience: 0.8, sfx: 0.9 },
  muted: false,
  unlocked: false,
  _lastPlay: new Map(),

  async loadManifest() {
    const res = await fetch(BASE + 'manifest.json');
    if (!res.ok) throw new Error('Manifeste audio introuvable');
    this.manifest = await res.json();
  },

  /** Crée le contexte (à appeler après un geste utilisateur, ou en avance : il sera repris au geste). */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.bus.master = new Bus(this.ctx, this.ctx.destination);
    this.bus.music = new Bus(this.ctx, this.bus.master.gain);
    this.bus.ambience = new Bus(this.ctx, this.bus.master.gain);
    this.bus.sfx = new Bus(this.ctx, this.bus.master.gain);
    this.applyVolumes();
    const unlock = () => {
      if (this.ctx.state !== 'running') this.ctx.resume();
      this.unlocked = true;
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
  },

  applyVolumes() {
    if (!this.ctx) return;
    const m = this.muted ? 0 : this.volumes.master;
    this.bus.master.set(m, this.ctx);
    this.bus.music.set(this.volumes.music, this.ctx);
    this.bus.ambience.set(this.volumes.ambience, this.ctx);
    this.bus.sfx.set(this.volumes.sfx, this.ctx);
  },

  setVolume(bus, v) { this.volumes[bus] = v; this.applyVolumes(); },
  setMuted(m) { this.muted = m; this.applyVolumes(); },
  toggleMute() { this.setMuted(!this.muted); return this.muted; },

  has(key, group = 'sfx') { return !!this._entry(group, key); },
  _entry(group, key) { return this.manifest && this.manifest[group] && this.manifest[group][key]; },

  /** Décode un fichier (avec cache). */
  async load(group, key) {
    const id = group + ':' + key;
    if (this.buffers.has(id)) return this.buffers.get(id);
    if (this.pending.has(id)) return this.pending.get(id);
    const entry = this._entry(group, key);
    if (!entry) { console.warn(`Audio inconnu : ${id}`); return null; }
    const p = (async () => {
      try {
        const res = await fetch(BASE + entry.file);
        const ab = await res.arrayBuffer();
        this.init();
        const buf = await this.ctx.decodeAudioData(ab);
        this.buffers.set(id, buf);
        return buf;
      } catch (e) {
        console.warn(`Décodage audio impossible : ${id}`, e);
        return null;
      } finally { this.pending.delete(id); }
    })();
    this.pending.set(id, p);
    return p;
  },

  /**
   * Précharge les SFX puis les ambiances, en arrière-plan (appelé une fois le menu affiché, jamais avant : rien ici
   * n'est nécessaire pour commencer). Les effets d'abord (1 Mo, ils servent dès la première pose), les ambiances
   * ensuite (6 Mo, par ordre d'utilité : celles du menu et des premières îles avant l'orage). Quatre à la fois, pour
   * laisser de la bande passante au film d'ouverture et au nuage.
   */
  async preload(onProgress = () => {}) {
    this.init();
    const ordre = ['birds', 'sea', 'stream', 'wind', 'crickets', 'winter', 'rain', 'storm'];
    const amb = Object.keys(this.manifest.ambience || {}).sort((a, b) => (ordre.indexOf(a) + 1 || 99) - (ordre.indexOf(b) + 1 || 99));
    const jobs = [...Object.keys(this.manifest.sfx || {}).map((k) => ['sfx', k]), ...amb.map((k) => ['ambience', k])];
    let done = 0;
    for (let i = 0; i < jobs.length; i += 4) {
      await Promise.all(jobs.slice(i, i + 4).map(([g, k]) => this.load(g, k).then(() => { done++; onProgress(done / jobs.length); })));
    }
  },

  /**
   * Joue un effet sonore.
   * @param {string} key clé du manifeste sfx
   * @param {{volume?:number, rate?:number, pan?:number, minInterval?:number, detune?:number}} o
   */
  play(key, o = {}) {
    if (!this.ctx || !this.unlocked) return null;
    const minInt = o.minInterval ?? 0.03;
    const now = this.ctx.currentTime;
    const last = this._lastPlay.get(key) || -1;
    if (now - last < minInt) return null;
    const buf = this.buffers.get('sfx:' + key);
    if (!buf) { this.load('sfx', key); return null; }
    this._lastPlay.set(key, now);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = o.rate ?? 1;
    if (o.detune) src.detune.value = o.detune;
    const g = this.ctx.createGain();
    g.gain.value = o.volume ?? 1;
    let node = src;
    if (o.pan !== undefined && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, o.pan));
      src.connect(p); node = p;
    }
    node.connect(g); g.connect(this.bus.sfx.gain);
    src.start();
    return { src, gain: g, stop: (t = 0.1) => { g.gain.setTargetAtTime(0, this.ctx.currentTime, t); src.stop(this.ctx.currentTime + t * 4); } };
  },

  /** Joue une musique en boucle avec crossfade depuis la précédente. */
  /** Joue une musique en boucle avec crossfade depuis la précédente. Rend l'instant de départ (horloge audio), ou null. */
  async playMusic(key, { fade = 1.5, volume = 1 } = {}) {
    if (!this.manifest) return null;
    if (this.music.key === key) return null;
    this.music.key = key;
    const buf = await this.load('music', key);
    if (!buf || this.music.key !== key || !this.ctx) return null;
    const now = this.ctx.currentTime;
    if (this.music.src) {
      const old = this.music;
      old.gain.gain.setTargetAtTime(0, now, fade / 3);
      try { old.src.stop(now + fade + 0.2); } catch (_) { /* déjà arrêté */ }
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = this.ctx.createGain();
    if (fade > 0) { g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + fade); }
    else g.gain.setValueAtTime(Math.max(0.0001, volume), now);   // sans fondu : le Souffle court cale son décompte sur le premier temps
    src.connect(g); g.connect(this.bus.music.gain);
    src.start(now);
    this.music.src = src; this.music.gain = g;
    return now;
  },

  stopMusic(fade = 1.2) {
    if (!this.ctx || !this.music.src) { this.music.key = null; return; }
    const now = this.ctx.currentTime;
    const old = this.music;
    old.gain.gain.setTargetAtTime(0, now, fade / 3);
    try { old.src.stop(now + fade + 0.2); } catch (_) { /* ignore */ }
    this.music = { key: null, src: null, gain: null };
  },

  /** Règle le volume cible d'une ambiance en boucle (0 = arrêt progressif). */
  async setAmbience(key, target, fade = 2) {
    if (!this.manifest || !this.ctx) return;
    let a = this.ambience.get(key);
    if (!a) {
      if (target <= 0) return;
      const buf = await this.load('ambience', key);
      if (!buf) return;
      if (this.ambience.get(key)) return this.setAmbience(key, target, fade);
      const src = this.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = 0.0001;
      src.connect(g); g.connect(this.bus.ambience.gain);
      src.start();
      a = { src, gain: g, target: 0 };
      this.ambience.set(key, a);
    }
    a.target = target;
    a.gain.gain.setTargetAtTime(Math.max(0.0001, target), this.ctx.currentTime, fade / 3);
  },

  stopAllAmbience(fade = 1.5) {
    for (const [k] of this.ambience) this.setAmbience(k, 0, fade);
  },

  /** Arrête tout (retour au menu). */
  silence(fade = 1) { this.stopMusic(fade); this.stopAllAmbience(fade); },
};
