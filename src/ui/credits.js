// Écran des crédits : lit assets/credits/*.json pour n'afficher que des sources vérifiées.
import { h, button, icon } from './dom.js';
import { rule, corner } from './ornaments.js';

/** append() du DOM insère le texte « null » pour un enfant nul : on filtre. */
const append = (el, ...kids) => el.append(...kids.filter(Boolean));

let cache = null;
export async function loadCredits() {
  if (cache) return cache;
  const get = async (f) => { try { const r = await fetch(`assets/credits/${f}`); return r.ok ? await r.json() : []; } catch (_) { return []; } };
  const [images, audio, fonts] = await Promise.all([get('images.json'), get('audio.json'), get('fonts.json')]);
  cache = { images, audio, fonts };
  return cache;
}

/** Les fichiers de crédits sont soit un tableau, soit un objet { works: [...] } ou { items: [...] }. */
const asList = (x) => (Array.isArray(x) ? x : x && typeof x === 'object' ? (x.works || x.items || x.entries || []) : []);

function entry(e) {
  const name = e.pack || e.title || e.name || e.work || '';
  const author = e.author || e.artist || '';
  const lic = e.license || '';
  const url = e.url || e.source || e.source_url || e.licenseUrl || e.license_url || '';
  return h('li', {},
    h('span', {}, h('b', {}, name), author ? h('span', { class: 'by' }, ` — ${author}`) : null, url ? h('a', { href: url, target: '_blank', rel: 'noopener', title: 'Ouvrir la source', 'aria-label': `Source de ${name}` }, '↗') : null),
    lic ? h('em', { class: 'lic' }, lic) : null,
  );
}

export function buildCredits({ onBack, credits }) {
  const root = h('div', { class: 'panel panel-credits' });
  const list = (title, iconName, items) => (items && items.length ? h('section', {}, h('h3', {}, icon(iconName), title), h('ul', {}, ...items.map(entry))) : null);
  const audio = asList(credits.audio);
  const audioMusic = audio.filter((a) => /macleod/i.test(a.author || '') || a.type === 'music');
  const audioOther = audio.filter((a) => !audioMusic.includes(a));
  append(root, 
    corner('tl'), corner('tr'), corner('bl'), corner('br'),
    h('h2', { class: 'panel-title' }, 'Crédits'), rule(),
    h('div', { class: 'credits-scroll', tabindex: '0' },
      h('section', { class: 'credits-team' },
        h('h3', {}, icon('lighthouse', 'ink'), 'Feux de Brume'),
        h('p', {}, 'Conception, écriture, développement, direction artistique et audio : une équipe d’agents Claude orchestrée par un lead designer, pour Madec01.'),
        h('p', {}, 'Le code du jeu est publié sous licence MIT. Les œuvres ci-dessous appartiennent à leurs auteurs et sont utilisées selon leurs licences.'),
      ),
      list('Musique', 'icon_music_on', audioMusic),
      list('Sons et ambiances', 'icon_audio_on', audioOther),
      list('Graphismes', 'icon_flag', asList(credits.images)),
      list('Polices', 'icon_info', asList(credits.fonts)),
      h('section', { class: 'credits-thanks' }, rule(), h('p', {}, 'Merci à Kenney, Kevin MacLeod, aux contributeurs de Freesound et d’OpenGameArt, et à toutes celles et ceux qui gardent des feux allumés.')),
    ),
    h('div', { class: 'panel-actions' }, button('Retour', onBack, { iconName: 'icon_return' })),
  );
  return root;
}
