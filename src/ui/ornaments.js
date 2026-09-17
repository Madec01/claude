// Ornements SVG réutilisables (rose des vents, cadre de carte marine, filets d'encre, sceau).
// Tout est vectoriel et inline : aucun asset externe, couleur héritée via currentColor.
import { h } from './dom.js';

const svg = (markup, cls = '') => {
  const wrap = document.createElement('div');
  wrap.innerHTML = markup.trim();
  const el = wrap.firstElementChild;
  if (cls) el.setAttribute('class', cls);
  el.setAttribute('aria-hidden', 'true');
  return el;
};

const P = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;

/** Rose des vents à 16 branches, deux tons (currentColor + version claire). */
export function compassRose(size = 260, cls = '') {
  const c = 100, parts = [];
  const star = (n, ro, ri, rot, fillA, fillB) => {
    for (let i = 0; i < n; i++) {
      const a = rot + (i * 2 * Math.PI) / n, l = a - Math.PI / n, r = a + Math.PI / n;
      const ox = c + Math.cos(a) * ro, oy = c + Math.sin(a) * ro;
      parts.push(`<polygon points="${P(c, c)} ${P(ox, oy)} ${P(c + Math.cos(l) * ri, c + Math.sin(l) * ri)}" fill="${fillA}"/>`);
      parts.push(`<polygon points="${P(c, c)} ${P(ox, oy)} ${P(c + Math.cos(r) * ri, c + Math.sin(r) * ri)}" fill="${fillB}"/>`);
    }
  };
  star(16, 52, 12, Math.PI / 16, 'currentColor', '#d9bc85');
  star(8, 74, 16, Math.PI / 8, 'currentColor', '#d9bc85');
  star(4, 96, 22, -Math.PI / 2, 'currentColor', '#d9bc85');
  const lab = ['N', 'E', 'S', 'O'].map((t, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 2; return `<text x="${(c + Math.cos(a) * 88).toFixed(1)}" y="${(c + Math.sin(a) * 88 + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-family="IM Fell English, serif" fill="currentColor" opacity="0.9">${t}</text>`; }).join('');
  return svg(`<svg viewBox="0 0 200 200" width="${size}" height="${size}" style="color:inherit">
    <circle cx="100" cy="100" r="98" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.8"/>
    <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" stroke-width="0.4" stroke-dasharray="2 3" opacity="0.8"/>
    <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.6"/>
    ${parts.join('')}
    <circle cx="100" cy="100" r="5" fill="currentColor"/>
    <circle cx="100" cy="100" r="2" fill="#f2e4c4"/>
    ${lab}
  </svg>`, cls);
}

/** Cadre de carte marine 1280×720 : double filet, graduations, quadrillage discret, loxodromies. */
export function chartFrame(cls = 'chart-frame') {
  const ticks = [];
  const inset = 22, w = 1280, h = 720, step = 40;
  for (let x = inset + step; x < w - inset; x += step) {
    const on = ((x - inset) / step) % 2 === 0;
    if (on) { ticks.push(`<rect x="${x}" y="${inset}" width="${step}" height="5" fill="currentColor" opacity="0.55"/>`); ticks.push(`<rect x="${x}" y="${h - inset - 5}" width="${step}" height="5" fill="currentColor" opacity="0.55"/>`); }
  }
  for (let y = inset + step; y < h - inset; y += step) {
    const on = ((y - inset) / step) % 2 === 0;
    if (on) { ticks.push(`<rect x="${inset}" y="${y}" width="5" height="${step}" fill="currentColor" opacity="0.55"/>`); ticks.push(`<rect x="${w - inset - 5}" y="${y}" width="5" height="${step}" fill="currentColor" opacity="0.55"/>`); }
  }
  const grid = [];
  for (let x = 160; x < w; x += 160) grid.push(`<line x1="${x}" y1="${inset + 8}" x2="${x}" y2="${h - inset - 8}" stroke="currentColor" stroke-width="0.6" opacity="0.18"/>`);
  for (let y = 120; y < h; y += 120) grid.push(`<line x1="${inset + 8}" y1="${y}" x2="${w - inset - 8}" y2="${y}" stroke="currentColor" stroke-width="0.6" opacity="0.18"/>`);
  const rhumb = [];
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; rhumb.push(`<line x1="960" y1="540" x2="${(960 + Math.cos(a) * 900).toFixed(0)}" y2="${(540 + Math.sin(a) * 900).toFixed(0)}" stroke="currentColor" stroke-width="0.5" opacity="0.14"/>`); }
  return svg(`<svg viewBox="0 0 1280 720" width="1280" height="720" preserveAspectRatio="none">
    <defs><clipPath id="cf-clip"><rect x="${inset + 6}" y="${inset + 6}" width="${w - 2 * inset - 12}" height="${h - 2 * inset - 12}"/></clipPath></defs>
    <g clip-path="url(#cf-clip)">${grid.join('')}${rhumb.join('')}</g>
    <rect x="${inset}" y="${inset}" width="${w - 2 * inset}" height="${h - 2 * inset}" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
    <rect x="${inset + 5}" y="${inset + 5}" width="${w - 2 * inset - 10}" height="${h - 2 * inset - 10}" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.7"/>
    ${ticks.join('')}
  </svg>`, cls);
}

/** Filet d'encre horizontal avec un losange central. */
export function rule(cls = 'rule') {
  return svg(`<svg viewBox="0 0 400 14" width="400" height="14" preserveAspectRatio="none">
    <line x1="0" y1="7" x2="182" y2="7" stroke="currentColor" stroke-width="1"/>
    <line x1="218" y1="7" x2="400" y2="7" stroke="currentColor" stroke-width="1"/>
    <path d="M200 1 L206 7 L200 13 L194 7 Z" fill="currentColor"/>
    <circle cx="188" cy="7" r="1.4" fill="currentColor"/><circle cx="212" cy="7" r="1.4" fill="currentColor"/>
  </svg>`, cls);
}

/** Petit ornement de coin (crochet de cuivre) : position via classe. */
export function corner(cls = '') {
  return svg(`<svg viewBox="0 0 40 40" width="40" height="40">
    <path d="M2 38 V6 Q2 2 6 2 H38" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M8 38 V12 Q8 8 12 8 H38" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>
    <circle cx="6" cy="6" r="2.2" fill="currentColor"/>
  </svg>`, `corner ${cls}`);
}

/** Tampon d'encre (rapport du port). */
export function stamp(text, cls = '') {
  return h('div', { class: `stamp ${cls}`, 'aria-hidden': 'true' }, h('span', {}, text));
}

/** Flamme de lanterne (halo) pour le titre. */
export function lanternGlow(cls = 'lantern-glow') {
  return h('div', { class: cls, 'aria-hidden': 'true' });
}
