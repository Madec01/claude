// Écran « Succès » : trente-trois vignettes par famille, grisées tant qu'elles ne sont pas obtenues, barre pour celles qui se comptent.
import { h, button, icon, append } from './dom.js';
import { ACHIEVEMENTS, ACHIEVEMENT_CATS, ACHIEVEMENT_SEED } from '../data/achievements.js';
import { Achievements } from '../game/achievements.js';

/** Vignette d'un succès : image composée par le pipeline (assets/img/succes/<id>.png), médaille en repli. */
export function badgeImg(a, cls = '') {
  const img = h('img', { class: `ach-img ${cls}`, src: `assets/img/succes/${a.id}.png`, alt: a.name, loading: 'lazy' });
  img.addEventListener('error', () => { const f = h('span', { class: `ach-img ach-fallback ${cls}` }, icon('icon_medal')); img.replaceWith(f); }, { once: true });
  return img;
}

/** Les succès rangés par famille : un titre et une grille par famille (repris par l'écran Collection). */
export function achievementGroups() {
  const groups = [];
  for (const [cat, label] of Object.entries(ACHIEVEMENT_CATS)) {
    const list = ACHIEVEMENTS.filter((a) => a.cat === cat); if (!list.length) continue;
    groups.push(h('h3', { class: 'ach-cat' }, label, h('span', { class: 'ach-cat-n' }, `${list.filter((a) => Achievements.has(a.id)).length} / ${list.length}`)));
    groups.push(h('div', { class: 'ach-grid' }, ...list.map((a) => {
      const got = Achievements.has(a.id); const pr = !got && Achievements.progress(a);
      const secret = a.hidden && !got;
      const when = got ? new Date(Achievements.state.unlocked[a.id]).toLocaleDateString('fr-FR') : '';
      return h('div', { class: `ach-card ${got ? 'got' : 'locked'} ${secret ? 'secret' : ''}`, title: secret ? 'Succès caché' : a.desc },
        badgeImg(a),
        h('div', { class: 'ach-body' },
          h('h4', {}, secret ? '???' : a.name),
          h('p', {}, secret ? 'Un succès caché. Joue, il se montrera.' : a.desc),
          pr ? h('div', { class: 'ach-bar', title: `${pr.value} / ${pr.target}` }, h('div', { style: `width:${Math.round((pr.value / pr.target) * 100)}%` }), h('span', {}, `${pr.value} / ${pr.target}`)) : null,
          got ? h('div', { class: 'ach-when' }, `Obtenu le ${when}`) : null));
    })));
  }
  return groups;
}

export function buildAchievements({ onBack }) {
  const root = h('div', { class: 'panel panel-achievements' });
  const n = Achievements.count(), total = ACHIEVEMENTS.length;
  const groups = achievementGroups();
  append(root,
    h('h2', { class: 'panel-title' }, 'Succès'),
    h('div', { class: 'ws-head-row' }, h('p', { class: 'ws-intro' }, `Chaque succès rapporte ${ACHIEVEMENT_SEED} graine pour l’Atelier. Les cachés se révèlent quand on les obtient.`), h('div', { class: 'seeds', title: 'Succès obtenus' }, icon('icon_medal'), h('b', {}, String(n)), h('span', {}, `/ ${total}`))),
    ...groups,
    h('div', { class: 'panel-actions' }, button('Retour', onBack, { iconName: 'icon_return' })),
  );
  return root;
}

/**
 * Bannière de déblocage : glisse depuis le haut, vignette qui tourne et brille, éclats, puis se range. Les bannières
 * en attente s'enchaînent une à une.
 */
const queue = []; let showing = false;
export function celebrate(a, { sound } = {}) {
  queue.push({ a, sound }); if (!showing) next();
}
/**
 * La même bannière, pour autre chose qu'un succès : un mode de jeu qui s'ouvre, une chose du jeu qu'on n'aurait
 * pas vue autrement. Sans elle, ces déblocages n'étaient qu'un bouton du menu qui cessait d'être grisé — invisible
 * sur téléphone, où il n'y a pas d'infobulle.
 */
export function celebrateThing({ kicker = 'Débloqué', name, desc, iconName = 'icon_star', onClick = null }, { sound } = {}) {
  queue.push({ thing: { kicker, name, desc, iconName, onClick }, sound }); if (!showing) next();
}
function next() {
  const item = queue.shift(); if (!item) { showing = false; return; }
  showing = true;
  const host = document.getElementById('app') || document.body;
  const t = item.thing;
  const el = h('div', { class: 'ach-banner', role: 'status' },
    h('div', { class: 'ach-glow' }),
    t ? h('span', { class: 'ach-img ach-fallback ach-banner-img' }, icon(t.iconName)) : badgeImg(item.a, 'ach-banner-img'),
    h('div', { class: 'ach-banner-text' },
      h('div', { class: 'ach-kicker' }, t ? t.kicker : 'Succès débloqué'),
      h('div', { class: 'ach-name' }, t ? t.name : item.a.name),
      h('div', { class: 'ach-desc' }, t ? t.desc : `${item.a.desc} · +${ACHIEVEMENT_SEED} graine`)),
    h('div', { class: 'ach-sparks' }, ...Array.from({ length: 12 }, (_, i) => h('i', { style: `--i:${i}` }))),
  );
  if (t && t.onClick) { el.classList.add('clickable'); el.addEventListener('click', () => { el.classList.add('off'); t.onClick(); }); }
  host.appendChild(el);
  if (item.sound) item.sound();
  requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => { el.classList.add('off'); setTimeout(() => { el.remove(); next(); }, 600); }, 4200);
}
