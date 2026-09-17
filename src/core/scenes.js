// Machine à états des scènes. Chaque scène : { enter(params), exit(), update(dt), render(ctx, alpha) }.

export class SceneManager {
  constructor() { this.scenes = new Map(); this.current = null; this.currentName = null; this._switching = false; }
  register(name, scene) { this.scenes.set(name, scene); scene.manager = this; scene.name = name; }

  /** Change de scène avec un fondu au noir (via #fade). */
  async go(name, params = {}, { fade = 0.45 } = {}) {
    if (this._switching) return;
    this._switching = true;
    const next = this.scenes.get(name);
    if (!next) { this._switching = false; throw new Error(`Scène inconnue : ${name}`); }
    const el = document.getElementById('fade');
    if (fade > 0) {
      el.style.transitionDuration = `${fade}s`;
      el.classList.add('on');
      await wait(fade * 1000);
    }
    try {
      if (this.current && this.current.exit) this.current.exit();
      this.current = next; this.currentName = name;
      await next.enter(params);
    } catch (e) {
      console.error(`Erreur à l'entrée de la scène ${name}`, e);
    } finally {
      if (fade > 0) { await wait(30); el.classList.remove('on'); }
      this._switching = false;
    }
  }

  update(dt) { if (this.current && this.current.update) this.current.update(dt); }
  render(ctx, alpha, frameDt) { if (this.current && this.current.render) this.current.render(ctx, alpha, frameDt); }
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
