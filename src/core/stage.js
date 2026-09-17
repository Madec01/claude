// Scène logique : taille, échelle et disposition.
// - Bureau : scène 1280×720 mise à l'échelle (letterbox), UI DOM transformée avec le même facteur.
// - Compact (téléphone, petite tablette) : la scène logique prend tout l'écran en pixels CSS (échelle 1),
//   la mise en page est adaptée par les classes html.compact / .portrait / .landscape / .touch (css/mobile.css).
import { BALANCE } from '../data/balance.js';

export const BASE_W = 1280, BASE_H = 720;
export const STAGE = { W: BASE_W, H: BASE_H, scale: 1, compact: false, portrait: false, touch: false, dpr: 1 };
const listeners = [];

export function onStageChange(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
export const hasTouch = () => ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;

/** Calcule la disposition à partir de la fenêtre et l'applique au DOM (#stage et calques). */
export function layoutStage() {
  const vw = Math.max(240, window.innerWidth), vh = Math.max(240, window.innerHeight);
  const touch = hasTouch();
  const compact = Math.min(vw, vh) < 620 || (touch && Math.max(vw, vh) < 1200);
  if (compact) { STAGE.W = Math.round(vw); STAGE.H = Math.round(vh); STAGE.scale = 1; }
  else { STAGE.W = BASE_W; STAGE.H = BASE_H; STAGE.scale = Math.min(vw / BASE_W, vh / BASE_H); }
  STAGE.compact = compact; STAGE.portrait = vh > vw; STAGE.touch = touch; STAGE.dpr = Math.min(2, window.devicePixelRatio || 1);
  const root = document.documentElement;
  root.classList.toggle('compact', compact); root.classList.toggle('portrait', STAGE.portrait); root.classList.toggle('landscape', !STAGE.portrait); root.classList.toggle('touch', touch);
  const stage = document.getElementById('stage');
  if (stage) {
    stage.style.width = `${Math.round(STAGE.W * STAGE.scale)}px`; stage.style.height = `${Math.round(STAGE.H * STAGE.scale)}px`;
    stage.style.setProperty('--scale', STAGE.scale);
    for (const el of stage.querySelectorAll(':scope > .screen')) { el.style.width = `${STAGE.W}px`; el.style.height = `${STAGE.H}px`; }
  }
  for (const fn of listeners) fn(STAGE);
  return STAGE;
}

/** Marges d'interface (px logiques) laissées libres autour de l'île pour le cadrage de la caméra. */
export function uiMargins(kind = 'island') {
  if (!STAGE.compact) return kind === 'ambient' ? { uiLeft: 380, uiRight: 40, uiTop: 40, uiBottom: 40 } : { uiLeft: 220, uiRight: 260, uiTop: 70, uiBottom: 60 };
  if (kind === 'ambient') return { uiLeft: 10, uiRight: 10, uiTop: STAGE.portrait ? 200 : 10, uiBottom: 10, padding: 30 };
  return STAGE.portrait ? { uiLeft: 8, uiRight: 8, uiTop: 92, uiBottom: 160, padding: 24 } : { uiLeft: 130, uiRight: 8, uiTop: 50, uiBottom: 40, padding: 24 };
}

/** Zoom minimal : plus bas sur petit écran pour que les grandes îles tiennent. */
export const minZoom = () => (STAGE.compact ? 0.18 : BALANCE.camera.minZoom);
