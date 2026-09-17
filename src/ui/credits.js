// Écran des crédits : lit assets/credits/*.json pour n'afficher que des sources vérifiées.
import { h, button, icon } from './dom.js';

let cache = null;
export async function loadCredits() {
  if (cache) return cache;
  const get = async (f) => { try { const r = await fetch(`assets/credits/${f}`); return r.ok ? await r.json() : []; } catch (_) { return []; } };
  const [images, audio, fonts] = await Promise.all([get('images.json'), get('audio.json'), get('fonts.json')]);
  cache = { images, audio, fonts };
  return cache;
}

const asList = (x) => (Array.isArray(x) ? x : x && typeof x === 'object' ? (x.works || x.items || x.entries || x.packs || []) : []);

function entry(e) {
  const name = e.pack || e.title || e.name || e.work || '';
  const author = e.author || e.artist || '';
  const lic = e.license || '';
  const url = e.url || e.source || e.source_url || e.licenseUrl || e.license_url || '';
  return h('li', {}, h('span', {}, h('b', {}, name), author ? h('span', { class: 'by' }, ` — ${author}`) : null, url ? h('a', { href: url, target: '_blank', rel: 'noopener', title: 'Ouvrir la source' }, '↗') : null), lic ? h('em', { class: 'lic' }, lic) : null);
}

export function buildCredits({ onBack, credits }) {
  const root = h('div', { class: 'panel panel-credits' });
  const list = (title, iconName, items) => (items && items.length ? h('section', {}, h('h3', {}, icon(iconName), title), h('ul', {}, ...items.map(entry))) : null);
  const audio = asList(credits.audio);
  const music = audio.filter((a) => /macleod/i.test(a.author || '') || a.type === 'music');
  const other = audio.filter((a) => !music.includes(a));
  root.append(
    h('h2', { class: 'panel-title' }, 'Crédits'),
    h('div', { class: 'credits-scroll', tabindex: '0' },
      h('section', { class: 'credits-team' },
        h('h3', {}, icon('icon_leaf'), 'Cent Saisons'),
        h('p', {}, 'Conception, écriture, développement, direction artistique et audio : une équipe d’agents Claude orchestrée par un lead designer, pour Madec01.'),
        h('p', {}, 'Le code du jeu est publié sous licence MIT. Les œuvres ci-dessous appartiennent à leurs auteurs et sont utilisées selon leurs licences.'),
      ),
      list('Musique', 'icon_music_on', music),
      list('Sons et ambiances', 'icon_audio_on', other),
      list('Graphismes', 'icon_star', asList(credits.images)),
      list('Polices', 'icon_info', asList(credits.fonts)),
      h('section', { class: 'credits-thanks' }, h('p', {}, 'Merci à Kenney, Kevin MacLeod, aux contributeurs de Freesound et d’OpenGameArt, et à toutes celles et ceux qui laissent passer les saisons.')),
    ),
    h('div', { class: 'panel-actions' }, button('Retour', onBack, { iconName: 'icon_return' })),
  );
  return root;
}
