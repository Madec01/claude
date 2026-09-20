// Retour tactile, court et rare : à la fermeture d'une région et au coup de maître — jamais à la simple pose, qui
// deviendrait vite exaspérante. Safari iOS ignore vibrate() : pas d'effet, pas de régression. Désactivable dans les Options.
import { Save } from './save.js';

export const Haptics = {
  ok() { return !!(Save.options && Save.options.haptics !== false) && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'; },
  /** `pattern` : durée en ms, ou tableau [vibre, pause, vibre…]. */
  tap(pattern) { if (!this.ok()) return false; try { return !!navigator.vibrate(pattern); } catch (_) { return false; } },
};
