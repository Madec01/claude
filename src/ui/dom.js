// Petits utilitaires DOM pour les écrans.
import { AudioSys } from '../core/audio.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (v !== null && v !== undefined && v !== false) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

/** append natif mais qui ignore null/undefined/false. */
export function append(el, ...children) { for (const c of children.flat()) { if (c === null || c === undefined || c === false) continue; el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); } return el; }

export const icon = (name, cls = '') => h('img', { class: `icon ${cls}`, src: `assets/img/ui/${name}.png`, alt: '' });

/** Bouton stylé avec sons. */
export function button(label, onClick, { cls = '', iconName = null, disabled = false, title = '' } = {}) {
  const b = h('button', { class: `btn ${cls}`, disabled, title }, iconName ? icon(iconName) : null, h('span', {}, label));
  b.addEventListener('mouseenter', () => { if (!b.disabled) AudioSys.play('ui_hover', { volume: 0.3, minInterval: 0.05 }); });
  b.addEventListener('click', (e) => { e.stopPropagation(); if (b.disabled) return; AudioSys.play('ui_click', { volume: 0.5 }); onClick(e); });
  return b;
}

export const ui = () => document.getElementById('ui');
export function clearUI() { const u = ui(); u.innerHTML = ''; u.className = 'screen'; }
export function showUI(node, cls = '') { const u = ui(); u.innerHTML = ''; u.className = `screen on ${cls}`; u.appendChild(node); return node; }
export function hideUI() { const u = ui(); u.className = 'screen'; u.innerHTML = ''; }

/** Fait apparaître les enfants un à un (classe .in). */
export function stagger(root, selector = ':scope > *', step = 70) {
  root.querySelectorAll(selector).forEach((el, i) => { el.style.transitionDelay = `${i * step}ms`; requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in'))); });
}

export const fmtInt = (n) => n.toLocaleString('fr-FR');
