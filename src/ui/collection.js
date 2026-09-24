// Écran « Collection » : tout ce qui se collectionne, au même endroit — les insignes des dix chapitres, les six
// archétypes d'île, les archétypes gagnés île par île, et les succès. Ce qui manque encore se montre en silhouette :
// la forme de l'insigne, vide, pour qu'on voie qu'il y a quelque chose à gagner à cet endroit.
import { h, button, icon, append } from './dom.js';
import { Save } from '../core/save.js';
import { STORY } from '../data/story.js';
import { CHAPTERS, campaignIsland, CAMPAIGN_SIZE, CHAPTER_LEN } from '../data/campaign.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { Achievements } from '../game/achievements.js';
import { achievementGroups } from './achievements.js';

/** Les insignes gagnés, lus dans la sauvegarde. */
export function insignesGagnes() {
  const c = Save.campaign; const ins = c.insignes || {};
  return { iles: ins.iles || {}, chapitres: ins.chapitres || [] };
}

/** Un insigne : en couleur s'il est gagné, en silhouette sinon. `taille` : 'petit' (sélection d'îles), 'moyen', 'grand'. */
export function insigne(src, gagne, titre, taille = 'moyen') {
  return h('img', { class: `insigne insigne-${taille} ${gagne ? 'gagne' : 'vide'}`, src, alt: titre, title: gagne ? titre : `${titre} — pas encore gagné`, loading: 'lazy' });
}
export const srcArchetype = (id) => `assets/img/archetypes/archetype-${id}.png`;
export const srcChapitre = (n) => `assets/img/chapitres/chapitre-${n}.png`;

/** Les six emplacements d'archétype d'une île : ceux qu'elle a déjà donnés en couleur, les autres en silhouette. */
export function rangeeArchetypes(ileId, taille = 'petit') {
  const eus = insignesGagnes().iles[ileId] || [];
  return h('div', { class: `insignes-rangee insignes-${taille}` }, ...ARCHETYPES.map((a) => insigne(srcArchetype(a.id), eus.includes(a.id), a.name, taille)));
}

export function buildCollection({ onBack }) {
  const { iles, chapitres } = insignesGagnes();
  const nIles = Object.values(iles).reduce((s, l) => s + l.length, 0);
  const parArchetype = Object.fromEntries(ARCHETYPES.map((a) => [a.id, Object.values(iles).filter((l) => l.includes(a.id)).length]));
  const nArch = ARCHETYPES.filter((a) => parArchetype[a.id] > 0).length;
  const nSucces = Achievements.count();
  const root = h('div', { class: 'panel panel-achievements panel-collection' });
  const titre = (texte, n, total) => h('h3', { class: 'ach-cat' }, texte, h('span', { class: 'ach-cat-n' }, `${n} / ${total}`));

  // les chapitres : un insigne par chapitre, gagné en terminant son île-souvenir
  const chap = h('div', { class: 'coll-grid' }, ...CHAPTERS.map((ch) => h('div', { class: `coll-item ${chapitres.includes(ch.id) ? 'gagne' : ''}` },
    insigne(srcChapitre(ch.id), chapitres.includes(ch.id), `Chapitre ${ch.id} · ${ch.name}`, 'grand'),
    h('b', {}, `Chapitre ${ch.id}`), h('span', {}, chapitres.includes(ch.id) ? ch.name : 'Terminer son île-souvenir'))));

  // les archétypes : ce que devient une île, selon sa plus grande région
  const arch = h('div', { class: 'coll-grid' }, ...ARCHETYPES.map((a) => { const n = parArchetype[a.id]; return h('div', { class: `coll-item ${n ? 'gagne' : ''}` },
    insigne(srcArchetype(a.id), n > 0, a.name, 'grand'),
    h('b', {}, a.name), h('span', {}, n ? `sur ${n} île${n > 1 ? 's' : ''}` : `plus grande région : ${a.families.map((f) => ((STORY.tiles[f] || {}).name || f).toLowerCase()).join(', ')}`)); }));

  // île par île : chaque île peut donner les six archétypes, selon la région qu'on y fait la plus grande
  const parIle = h('div', { class: 'coll-iles' });
  for (const ch of CHAPTERS) {
    const bloc = h('div', { class: 'coll-chap' }, h('div', { class: 'coll-chap-titre' }, insigne(srcChapitre(ch.id), chapitres.includes(ch.id), `Chapitre ${ch.id}`, 'petit'), `Chapitre ${ch.id} · ${ch.name}`));
    for (let n = (ch.id - 1) * CHAPTER_LEN + 1; n <= Math.min(ch.id * CHAPTER_LEN, CAMPAIGN_SIZE); n++) {
      const def = campaignIsland(n); const nom = def.story && STORY.islands[def.story] ? STORY.islands[def.story].name : def.name;
      bloc.appendChild(h('div', { class: 'coll-ile' }, h('span', { class: 'coll-ile-nom' }, h('i', {}, `${n}`), nom), rangeeArchetypes(n, 'petit')));
    }
    parIle.appendChild(bloc);
  }

  const total = CHAPTERS.length + ARCHETYPES.length + CAMPAIGN_SIZE * ARCHETYPES.length + ACHIEVEMENTS.length;
  const eus = chapitres.length + nArch + nIles + nSucces;
  append(root,
    h('h2', { class: 'panel-title' }, 'Collection'),
    h('div', { class: 'ws-head-row' }, h('p', { class: 'ws-intro' }, 'Tout ce qui se gagne en jouant. Un insigne en silhouette est encore à gagner : les chapitres se closent en terminant leur île-souvenir, les archétypes se lisent dans la plus grande région de l’île — rejouer une île autrement en donne un autre. Les tampons de la carte postale disent lesquels tu viens de gagner.'),
      h('div', { class: 'seeds', title: 'Objets de collection gagnés' }, icon('icon_medal'), h('b', {}, String(eus)), h('span', {}, `/ ${total}`))),
    titre('Chapitres', chapitres.length, CHAPTERS.length), chap,
    titre('Archétypes', nArch, ARCHETYPES.length), arch,
    titre('Archétypes par île', nIles, CAMPAIGN_SIZE * ARCHETYPES.length), parIle,
    titre('Succès', nSucces, ACHIEVEMENTS.length), ...achievementGroups().map((g) => { if (g.classList.contains('ach-cat')) g.classList.add('ach-souscat'); return g; }),
    h('div', { class: 'panel-actions' }, button('Retour', onBack, { iconName: 'icon_return' })),
  );
  return root;
}
