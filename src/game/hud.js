// HUD d'une nuit (DOM au-dessus du canvas) : nuit, aube, quota, naufrages, corne, marée, vent, huile, notifications.
import { fmtTime } from '../core/math.js';

const icon = (name, cls = '') => `<img class="hud-icon ${cls}" src="assets/img/ui/${name}.png" alt="">`;

export class Hud {
  constructor(root, night, { title, onPause }) {
    this.root = root; this.n = night;
    const m = night.def.mechanics;
    root.innerHTML = `
      <div class="hud-top">
        <div class="hud-block hud-left">
          <div class="hud-night">${title}</div>
          <div class="hud-timer" title="Temps avant l’aube">
            <div class="hud-bar"><div class="hud-bar-fill" data-ref="timeFill"></div><div class="hud-bar-dawn"></div></div>
            <span class="hud-time" data-ref="time">--:--</span>
          </div>
        </div>
        <div class="hud-block hud-center">
          <div class="hud-quota" title="Navires à quai / quota">${icon('ship_icon', 'ink')}<b data-ref="docked">0</b><span class="hud-sep">/</span><span data-ref="quota">0</span><span class="hud-label">à quai</span></div>
          <div class="hud-wrecks" data-ref="wrecks" title="Naufrages tolérés"></div>
        </div>
        <div class="hud-block hud-right">
          ${m.horn ? `<div class="hud-gauge hud-horn" data-ref="hornBox" title="Corne de brume (Espace)"><div class="hud-ring"><svg viewBox="0 0 40 40"><circle class="ring-bg" cx="20" cy="20" r="16"/><circle class="ring-fg" data-ref="hornRing" cx="20" cy="20" r="16"/></svg>${icon('icon_signal')}</div><span class="hud-key">Espace</span></div>` : ''}
          ${m.tide ? `<div class="hud-gauge hud-tide" title="Marée"><div class="hud-vbar"><div class="hud-vbar-fill" data-ref="tideFill"></div><div class="hud-vbar-mark low"></div><div class="hud-vbar-mark high"></div></div><span class="hud-key" data-ref="tideLabel">marée</span></div>` : ''}
          ${m.storm ? `<div class="hud-gauge hud-wind" title="Vent"><div class="hud-wind-arrow" data-ref="windArrow">${icon('icon_arrow_up')}</div><span class="hud-key" data-ref="windLabel">vent</span></div>` : ''}
          ${m.oil ? `<div class="hud-gauge hud-oil" data-ref="oilBox" title="Réserve d’huile (F : feu réduit)"><div class="hud-vbar oil"><div class="hud-vbar-fill" data-ref="oilFill"></div></div><span class="hud-key" data-ref="oilLabel">huile</span></div>` : ''}
          <button class="hud-pause" data-ref="pause" title="Pause (Échap)">${icon('icon_pause')}</button>
        </div>
      </div>
      <div class="hud-notify" data-ref="notify"></div>
      <div class="hud-bottom" data-ref="bottom"></div>
    `;
    this.r = {};
    root.querySelectorAll('[data-ref]').forEach((el) => { this.r[el.dataset.ref] = el; });
    this.r.pause.addEventListener('click', (e) => { e.stopPropagation(); onPause(); });
    this.last = {};
    this.notifyKeys = new Set();
    this.buildWrecks();
    if (this.r.hornRing) { this.r.hornRing.style.strokeDasharray = `${2 * Math.PI * 16}`; }
  }

  buildWrecks() {
    const n = this.n;
    this.r.wrecks.innerHTML = '';
    for (let i = 0; i < n.maxWrecks; i++) {
      const el = document.createElement('span'); el.className = 'hud-lantern'; el.innerHTML = icon('lighthouse', 'ink');
      this.r.wrecks.appendChild(el);
    }
  }

  set(key, value) { if (this.last[key] !== value) { this.last[key] = value; this.r[key].textContent = value; } }

  update() {
    const n = this.n, r = this.r;
    const left = n.infinite ? n.t : Math.max(0, n.duration - n.t);
    this.set('time', n.infinite ? `Vague ${n.wave} · ${fmtTime(n.t)}` : fmtTime(left));
    r.timeFill.style.width = n.infinite ? `${(n.infTimer / 60) * 100}%` : `${(n.t / n.duration) * 100}%`;
    this.set('docked', n.stats.docked);
    this.set('quota', n.infinite ? '∞' : n.def.quota);
    r.docked.classList.toggle('ok', !n.infinite && n.stats.docked >= n.def.quota);
    // naufrages
    const lanterns = r.wrecks.children;
    for (let i = 0; i < lanterns.length; i++) lanterns[i].classList.toggle('off', i < n.stats.wrecked);
    if (r.hornRing) {
      const c = 2 * Math.PI * 16;
      r.hornRing.style.strokeDashoffset = `${c * (1 - n.horn.ratio)}`;
      r.hornBox.classList.toggle('ready', n.horn.ready);
    }
    if (r.tideFill) { r.tideFill.style.height = `${n.weather.tide * 100}%`; this.set('tideLabel', `marée ${n.weather.tideLabel}`); }
    if (r.windArrow) {
      const w = n.weather.wind; const mag = Math.hypot(w.x, w.y);
      r.windArrow.style.transform = `rotate(${Math.atan2(w.y, w.x) * 180 / Math.PI + 90}deg) scale(${0.8 + Math.min(1, mag / 40) * 0.5})`;
      this.set('windLabel', n.weather.gust > 0.3 ? 'rafale !' : 'vent');
      r.windArrow.classList.toggle('gust', n.weather.gust > 0.3);
    }
    if (r.oilFill) {
      r.oilFill.style.height = `${n.beam.oilRatio * 100}%`;
      r.oilBox.classList.toggle('low', n.beam.oilRatio < 0.2);
      r.oilBox.classList.toggle('reduced', n.beam.low);
      this.set('oilLabel', n.beam.oilOut ? 'éteint' : n.beam.low ? 'feu réduit (F)' : 'huile (F)');
    }
    // notifications
    const notes = n.notifications;
    if (notes.length !== this.last.notes || (notes.length && notes[notes.length - 1] !== this.last.lastNote)) {
      this.last.notes = notes.length; this.last.lastNote = notes[notes.length - 1];
      r.notify.innerHTML = notes.slice(-4).map((x) => `<div class="hud-note ${x.kind}" style="animation-delay:0s">${x.text}</div>`).join('');
    }
  }

  destroy() { this.root.innerHTML = ''; }
}
