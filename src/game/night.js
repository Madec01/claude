// Déroulement d'une nuit : entités, événements, victoire/défaite, score.
import { BALANCE } from '../data/balance.js';
import { MAPS } from '../data/maps.js';
import { Ship, randomShipColor } from './ship.js';
import { Beam } from './beam.js';
import { Hazards } from './hazards.js';
import { Weather } from './weather.js';
import { Horn } from './horn.js';
import { Pages } from './pages.js';
import { Beast } from './beast.js';
import { RouteTool } from './routes.js';
import { Port } from './port.js';
import { Effects } from './effects.js';
import { ParticleSystem } from '../core/particles.js';
import { Shake } from '../core/shake.js';
import { AudioSys } from '../core/audio.js';
import { dist, RNG, clamp } from '../core/math.js';

export class Night {
  /**
   * @param {object} o { def, save, storyPages, testMode, hooks: { onEnd(result), onNotify(text, kind), onPage(page), onTutorialEvent(ev) } }
   */
  constructor(o) {
    this.def = o.def;
    this.map = MAPS[o.def.map];
    this.save = o.save;
    this.hooks = o.hooks || {};
    this.testMode = !!o.testMode;
    this.invulnerable = false;
    const upg = o.save.campaign.upgrades;
    this.upgrades = upg;
    this.maxWrecks = (this.def.maxWrecks || 3) + (upg.lantern || 0);
    this.t = 0;
    this.duration = this.def.duration;
    this.infinite = this.def.id === 'infinite';
    this.state = 'intro';   // intro | play | dawn | ended
    this.introTimer = 1.4;
    this.result = null;
    this.ships = [];
    this.beasts = [];
    this.particles = new ParticleSystem(2000);
    this.shake = new Shake();
    this.shake.enabled = o.save.options.shake !== false;
    this.beam = new Beam(this.map.lighthouse, upg, this.def.mechanics);
    this.horn = new Horn(this.map.lighthouse, upg, !!this.def.mechanics.horn);
    this.weather = new Weather(this.def, 7 + (this.infinite ? 99 : this.def.id));
    this.hazards = new Hazards(this.map, this.def, this.def.extraRocks || []);
    this.port = new Port(this.map.port);
    this.pages = new Pages(this, this.map, this.def, o.storyPages || [], o.save.campaign.pagesRead || []);
    this.routeTool = new RouteTool(this);
    this.fx = new Effects(this);
    this.spawnQueue = [...(this.def.spawns || [])];
    this.spawned = 0;
    this.stats = { docked: 0, wrecked: 0, escaped: 0, pages: 0, score: 0, shards: 0, hornBlows: 0, revealed: 0, lost: 0, timeLeft: 0, requiredDocked: false };
    this.notifications = [];
    this.events = [];       // événements pour le tutoriel
    this.dawn = 0;          // 0..1 progression de l'aube
    this.rng = new RNG(31 + (this.infinite ? 5 : this.def.id));
    this.wave = 1;          // veille infinie
    this.infTimer = 0;
    this.infSpawnTimer = 4;
    this.mouse = null;
    this.gustVisual = 0;
    this.lightning = 0;
    this.notifyTimer = 0;
    this.endTimer = 0;
    this.lastSpawnEntry = null;
    this.paused = false;
    this.docksInARow = 0;
    // Bêtes
    for (let i = 0; i < (this.def.beasts || 0); i++) {
      const e = this.map.entries[(i * 3 + 1) % this.map.entries.length];
      const b = new Beast(clamp(e.x, 40, 1240), clamp(e.y, 40, 680), 1 + i);
      b.hidden = true; b.wakeAt = 18 + i * 40;
      this.beasts.push(b);
    }
  }

  // ---------- Événements ----------
  sfx(key, o) { AudioSys.play(key, o); }
  notify(text, kind = 'info') { this.notifications.push({ text, kind, t: 0 }); if (this.hooks.onNotify) this.hooks.onNotify(text, kind); }
  emit(ev, data) { this.events.push({ ev, data }); if (this.hooks.onEvent) this.hooks.onEvent(ev, data); }

  onHazardRevealed(h) { this.stats.revealed++; this.fx.reveal(h); this.sfx('shard', { volume: 0.18, rate: 1.4, minInterval: 0.2 }); this.emit('reveal', h); }
  onRouteSet(ship, pts) { this.emit('route', ship); }
  onShipDockingStart(ship) { this.emit('docking', ship); }

  onShipDocked(ship) {
    this.stats.docked++;
    this.docksInARow++;
    const S = BALANCE.score;
    let pts = S.docked + (ship.type === 'dinghy' ? S.dinghyBonus : 0) + (ship.type === 'tall' || ship.type === 'yann' ? S.tallBonus : 0);
    if (ship.damage === 0) pts += 30;
    this.stats.score += pts;
    if (ship.required) this.stats.requiredDocked = true;
    this.port.ring();
    this.sfx(Math.random() < 0.5 ? 'bell_dock_1' : 'bell_dock_2', { volume: 0.8 });
    this.fx.dock(ship, pts);
    if (this.beam.oilEnabled) { this.beam.addOil(BALANCE.oil.barrel); this.sfx('oil_refill', { volume: 0.6 }); this.fx.floatText(this.port.x, this.port.y - 40, '+ huile', '#f2b134'); }
    this.notify(`${ship.name} à quai`, 'good');
    this.emit('dock', ship);
    if (this.infinite) this.stats.score += this.wave * 10;
    if (ship.isYann) { this.emit('yann', ship); this.notify('La Sirène est à quai', 'special'); setTimeout(() => this.endNight(true, 'yann'), 2200); }
  }

  onShipWrecked(ship, reason) {
    if (this.invulnerable) return;
    if (ship.state !== 'sailing' && ship.state !== 'waiting') return;
    ship.wreck(reason);
    this.stats.wrecked++;
    this.docksInARow = 0;
    this.sfx('wreck_wood', { volume: 0.95 });
    setTimeout(() => this.sfx('wreck_splash', { volume: 0.8 }), 350);
    this.shake.trigger(0.55);
    this.fx.wreck(ship);
    this.notify(`${ship.name} perdu${reason === 'land' ? ' : échoué' : reason === 'rock' ? ' sur un écueil' : ''}`, 'danger');
    this.emit('wreck', ship);
    setTimeout(() => { if (ship.state === 'sunk') this.hazards.addWreck(ship.x, ship.y, ship.radius); }, BALANCE.ships.sinkTime * 1000 + 50);
    if (ship.required) { this.endNight(false, 'yann'); return; }
    if (this.stats.wrecked >= this.maxWrecks) this.endNight(false, 'wrecks');
  }

  onShipLost(ship, beast) {
    if (ship.lost || this.invulnerable) return;
    ship.lost = true; ship.lostTimer = 0; ship.route = []; ship.routeIdx = 0; ship.state = 'sailing'; ship.anchored = false;
    ship.takeDamage(1, 'beast');
    this.stats.lost++;
    this.sfx('beast_hurt', { volume: 0.6 });
    this.shake.trigger(0.3);
    this.fx.lost(ship);
    this.notify(`${ship.name} perdu dans la Brume !`, 'danger');
    this.emit('lost', ship);
    beast.retreat = 1.2; beast.retreatDir = beast.heading + Math.PI * 0.75;
  }

  onPageRead(page) {
    this.stats.pages++;
    if (!page.alreadyRead) { this.stats.shards += BALANCE.shards.page; }
    this.stats.score += BALANCE.score.page;
    this.sfx('page_pickup', { volume: 0.8 });
    this.fx.page(page);
    this.emit('page', page);
    if (this.hooks.onPage) this.hooks.onPage(page.story, !page.alreadyRead);
  }

  onGust(angle, dur) { this.gustVisual = 1; this.sfx('gust', { volume: 0.55 }); this.fx.gust(angle); this.emit('gust'); }
  onThunder() { this.lightning = 1; this.sfx('thunder_' + (1 + Math.floor(Math.random() * 3)), { volume: 0.7 }); this.shake.trigger(0.12); }

  shipEscaped(ship) {
    if (ship.state === 'sunk' || ship.state === 'docked') return;
    ship.state = 'sunk'; ship.escaped = true;
    this.stats.escaped++;
    this.notify(`${ship.name} a quitté la passe`, 'warn');
  }

  blowHorn() { if (this.horn.blow(this)) { this.stats.hornBlows++; this.emit('horn'); } }

  // ---------- Apparition ----------
  spawn(s) {
    const entry = this.map.entries.find((e) => e.id === s.entry) || this.map.entries[0];
    const type = s.type;
    const ship = new Ship(type, entry.x, entry.y, entry.heading, s.color ?? randomShipColor(), entry, { required: s.required });
    if (s.type === 'yann') { ship.colorIdx = 4; ship.spriteKey = ship._spriteKey(); ship._computeScale(); }
    this.ships.push(ship);
    this.spawned++;
    this.fx.spawn(ship);
    this.sfx('ui_open', { volume: 0.25, rate: 0.8 });
    this.notify(`${ship.name} en approche (${entry.id.replace(/\d/, '')})`, s.required ? 'special' : 'info');
    this.emit('spawn', ship);
    return ship;
  }

  _updateInfinite(dt) {
    this.infTimer += dt;
    if (this.infTimer >= BALANCE.infinite.rampEvery) { this.infTimer = 0; this.wave++; this.notify(`Vague ${this.wave}`, 'special'); this.sfx('warning', { volume: 0.5 }); if (this.wave % 3 === 0 && this.beasts.length < 3) { const e = this.rng.pick(this.map.entries); const b = new Beast(clamp(e.x, 40, 1240), clamp(e.y, 40, 680), this.wave); this.beasts.push(b); } }
    this.infSpawnTimer -= dt;
    if (this.infSpawnTimer <= 0) {
      const rate = Math.min(BALANCE.infinite.maxSpawnRate, 0.9 + this.wave * 0.28);
      this.infSpawnTimer = 14 / rate + this.rng.range(-1.5, 1.5);
      const w = this.wave;
      const types = w < 2 ? ['dinghy', 'cutter'] : w < 4 ? ['dinghy', 'cutter', 'cutter', 'tall'] : ['dinghy', 'cutter', 'tall', 'tall'];
      this.spawn({ type: this.rng.pick(types), entry: this.rng.pick(this.map.entries).id, color: this.rng.int(0, 5) });
    }
    this.weather.rain = clamp((this.wave - 3) * 0.2, 0, 0.9);
    this.weather.windStrength = clamp((this.wave - 2) * 0.25, 0, 1);
    this.weather.stormEnabled = this.wave >= 3;
  }

  // ---------- Boucle ----------
  update(dt, input) {
    if (this.state === 'ended') { this.endTimer += dt; this.particles.update(dt); this.shake.update(dt); return; }
    this.mouse = input ? input.mouse : this.mouse;
    if (this.state === 'intro') { this.introTimer -= dt; if (this.introTimer <= 0) { this.state = 'play'; this.emit('start'); } }
    if (this.state === 'play' || this.state === 'dawn') this.t += dt;

    // Entrées
    if (input) {
      this.routeTool.updateHover(input.mouse.x, input.mouse.y);
      if (input.justPressed('Space')) this.blowHorn();
      if (input.justPressed('KeyF') && this.beam.oilEnabled) { const low = this.beam.toggleLow(); this.sfx('ui_click', { volume: 0.4 }); this.notify(low ? 'Feu réduit' : 'Feu vif', 'info'); this.emit('lowfire'); }
    }

    // Apparitions
    if (this.infinite) this._updateInfinite(dt);
    else while (this.spawnQueue.length && this.spawnQueue[0].t <= this.t) this.spawn(this.spawnQueue.shift());

    this.weather.update(dt, this);
    this.beam.update(dt, this.mouse, this);
    this.horn.update(dt);
    this.hazards.update(dt, this);
    this.port.update(dt);
    this.pages.update(dt, this);
    for (const b of this.beasts) b.update(dt, this);

    for (const s of this.ships) s.update(dt, this);
    this._collisions();
    this.ships = this.ships.filter((s) => !(s.state === 'sunk' && s.stateTime > 4) && !(s.state === 'docked' && s.stateTime > 2.5) && !s.escaped);

    this.particles.update(dt);
    this.fx.update(dt);
    this.shake.update(dt);
    this.gustVisual = Math.max(0, this.gustVisual - dt * 0.5);
    this.lightning = Math.max(0, this.lightning - dt * 3);
    for (const n of this.notifications) n.t += dt;
    this.notifications = this.notifications.filter((n) => n.t < 3.2);

    // Aube / fin
    if (!this.infinite) {
      const left = this.duration - this.t;
      this.dawn = clamp(1 - left / 18, 0, 1);
      if (this.state === 'play' && left <= 18) { this.state = 'dawn'; this.emit('dawn'); this.sfx('dawn', { volume: 0.6 }); }
      if (left <= 0) {
        const win = this.def.finale ? this.stats.requiredDocked : this.stats.docked >= this.def.quota;
        this.endNight(win, win ? 'dawn' : (this.def.finale && !this.stats.requiredDocked ? 'yann' : 'quota'));
      }
    }
  }

  _collisions() {
    const ships = this.ships;
    for (const s of ships) {
      if (!s.active) continue;
      if (s.speed < 2 && s.frozen) continue;
      const hit = this.hazards.collide(s.x, s.y, s.radius, s.draft);
      if (hit) {
        if (hit.kind === 'rock' && !hit.obj.revealed) { hit.obj.revealed = true; hit.obj.flash = 1; }
        this.onShipWrecked(s, hit.kind);
      }
    }
    // navire contre navire
    for (let i = 0; i < ships.length; i++) {
      const a = ships[i]; if (!a.active) continue;
      for (let j = i + 1; j < ships.length; j++) {
        const b = ships[j]; if (!b.active) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        const min = (a.radius + b.radius) * 0.85;
        if (d < min && d > 0.01) {
          const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
          const push = (min - d) * 0.5;
          a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
          const rel = Math.abs(a.speed - b.speed) + Math.min(a.speed, b.speed) * 0.3;
          if (a.collisionCooldown <= 0 && b.collisionCooldown <= 0 && rel > 6) {
            a.collisionCooldown = b.collisionCooldown = 1.5;
            a.speed *= 0.3; b.speed *= 0.3;
            this.sfx('ship_creak_' + (1 + Math.floor(Math.random() * 3)), { volume: 0.8, rate: 0.85 });
            this.sfx('wreck_wood', { volume: 0.25, rate: 1.4 });
            this.shake.trigger(0.2);
            this.fx.bump(a, b);
            if (!this.invulnerable) { a.takeDamage(1, 'collision'); b.takeDamage(1, 'collision'); }
            if (a.state === 'wrecking') this._wreckByCollision(a);
            if (b.state === 'wrecking') this._wreckByCollision(b);
            this.notify('Collision !', 'warn');
            this.emit('collision', [a, b]);
          }
        }
      }
    }
  }

  _wreckByCollision(s) {
    // takeDamage a déjà passé l'état en 'wrecking' : on comptabilise proprement
    s.state = 'sailing';
    this.onShipWrecked(s, 'collision');
  }

  endNight(win, reason) {
    if (this.state === 'ended') return;
    this.state = 'ended';
    this.endTimer = 0;
    const S = BALANCE.score;
    const timeLeft = this.infinite ? 0 : Math.max(0, this.duration - this.t);
    this.stats.timeLeft = timeLeft;
    let stars = 0;
    if (win) {
      stars = 1;
      if (this.stats.docked >= this.def.quota + BALANCE.results.star2Extra) stars = 2;
      if (this.stats.wrecked === 0 && this.stats.docked >= this.def.quota) stars = Math.max(stars, this.stats.docked >= this.def.quota + 1 ? 3 : 2);
      if (this.stats.wrecked === 0 && this.stats.docked >= this.def.quota + BALANCE.results.star2Extra) stars = 3;
      if (this.stats.wrecked === 0) this.stats.score += S.noWreck;
      this.stats.score += Math.floor(this.stats.docked * 5);
    }
    this.stats.shards += stars * BALANCE.shards.star + (win && this.stats.wrecked === 0 ? BALANCE.shards.perfect : 0);
    this.result = { win, reason, stars, stats: { ...this.stats }, night: this.def.id, wave: this.wave, score: this.stats.score };
    if (win) { this.sfx('night_win', { volume: 0.9 }); this.fx.dawnBurst(); } else { this.sfx('night_lose', { volume: 0.9 }); }
    this.emit('end', this.result);
    if (this.hooks.onEnd) setTimeout(() => this.hooks.onEnd(this.result), win ? 2600 : 2200);
  }

  // Entrées souris (depuis la scène)
  mouseDown(button, x, y) { if (this.state === 'ended' || this.state === 'intro') return; this.routeTool.down(button, x, y); }
  mouseMove(x, y) { if (this.state === 'ended') return; this.routeTool.move(x, y); }
  mouseUp(button, x, y) { this.routeTool.up(button, x, y); }

  get activeShips() { return this.ships.filter((s) => s.active); }
}
