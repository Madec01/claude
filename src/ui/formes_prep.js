// « Terres étranges », avant l'île : la forme tirée (nom, intention, famille), son record, la galerie des formes
// découvertes, et un code pour rejouer une île — puis « C'est parti ».
import { h, button, icon, append } from './dom.js';
import { Save } from '../core/save.js';
import { FORMES } from '../data/islands.js';
import { FAMILLES, listeFormes, recordsFormes, codeForme, lireCodeForme } from '../data/formes_mode.js';

const DIFF = { aucune: 'comme une île ronde', 'légère': 'un peu plus exigeante', forte: 'exigeante' };

/**
 * @param {object} o { def, onStart(def), onAutre(), onCode(forme, seed), onBack }
 */
export function buildFormesPrep({ def, onStart, onAutre, onCode, onBack }) {
  const S = recordsFormes(Save.data.formes || (Save.data.formes = { records: {}, vues: [], parties: 0, derniere: null }));
  const f = FORMES[def.forme] || { nom: def.forme, intention: '', famille: 'construite' };
  const famNom = (FAMILLES.find(([id]) => id === f.famille) || [null, 'Construites'])[1];
  const root = h('div', { class: 'panel panel-wishes-intro panel-formes' });
  const record = S.records[def.forme] || 0;
  const vues = new Set(S.vues); const toutes = listeFormes();
  // la galerie : une puce par forme, les découvertes avec leur nom et leur record, les autres en « ? » — on veut voir la suivante
  const galerie = h('div', { class: 'formes-galerie' }, ...FAMILLES.map(([id, nom]) => {
    const liste = toutes.filter((k) => (FORMES[k].famille || 'construite') === id); if (!liste.length) return null;
    return h('div', { class: 'formes-famille' }, h('h4', {}, nom), h('div', { class: 'formes-puces' }, ...liste.map((k) => {
      const vu = vues.has(k) || k === def.forme; const r = S.records[k] || 0;
      return h('span', { class: `forme-puce ${vu ? 'vue' : ''} ${k === def.forme ? 'on' : ''}`, title: vu ? (FORMES[k].intention || FORMES[k].nom) : 'Pas encore découverte' }, vu ? FORMES[k].nom : '?', r ? h('b', {}, ` ${r}`) : null);
    })));
  }));
  const champ = h('input', { class: 'brume-code', type: 'text', placeholder: 'Code d’une île (ex. F-3-9IX)', maxlength: 14, autocapitalize: 'characters', spellcheck: 'false' }); const err = h('span', { class: 'brume-code-err' });
  const go = () => { const c = lireCodeForme(champ.value); if (!c) { err.textContent = 'Code illisible : F, un tiret, le rang de la forme, un tiret, la graine.'; return; } onCode(c.forme, c.seed); };
  champ.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  append(root,
    h('div', { class: 'res-kicker' }, 'Mode à part'),
    h('h2', { class: 'panel-title' }, 'Terres étranges'),
    h('p', { class: 'prep-story' }, 'Une île qui change de forme à chaque partie, de la plus simple à la plus étrange. Pas d’histoire, pas d’étoile : un record par forme. Tout le reste est le jeu, tel quel.'),
    h('div', { class: 'formes-tirage' },
      h('div', { class: 'res-kicker' }, `${famNom} · ${DIFF[f.difficulte] || 'à découvrir'}`),
      h('h3', { class: 'formes-nom' }, f.nom),
      f.intention ? h('p', { class: 'prep-intention' }, f.intention) : null,
      h('p', { class: 'formes-record' }, record ? `Ton record sur cette forme : ${record} points.` : (vues.has(def.forme) ? 'Déjà jouée, sans score gardé.' : 'Une forme que tu n’as jamais jouée.'), h('span', { class: 'formes-code' }, ` Code : ${codeForme(def.forme, def.seed)}`)),
    ),
    h('h3', { class: 'prep-h' }, `Les formes (${vues.size} / ${toutes.length} découvertes)`),
    galerie,
    h('div', { class: 'brume-code-ligne' }, champ, button('Jouer ce code', go, { cls: 'btn-ghost brume-code-btn' }), err),
    h('div', { class: 'panel-actions' },
      button('C’est parti', () => onStart(def), { cls: 'btn-primary btn-big', iconName: 'icon_play' }),
      button('Une autre forme', onAutre, { cls: 'btn-ghost', iconName: 'icon_return', title: 'Retirer une forme au sort' }),
      button('Menu', onBack, { cls: 'btn-ghost', iconName: 'icon_home' })),
  );
  return root;
}
