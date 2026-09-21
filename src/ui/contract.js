// Choix du contrat d'archipel à l'entrée d'un chapitre : trois cartes, une seule se prend. Rempli sur les cinq îles, il vaut deux étoiles pour la porte.
import { h, button, append } from './dom.js';
import { contractOffers, contractTarget, CONTRACT_STARS } from '../data/contracts.js';
import { CHAPTERS, CHAPTER_GATE, CHAPTER_PATIENCE } from '../data/campaign.js';

export function buildContractPick({ chapter, onPick }) {
  const root = h('div', { class: 'panel panel-wishes-intro panel-contract' });
  const ch = CHAPTERS[chapter - 1] || { name: `Chapitre ${chapter}` };
  let chosen = null; const cards = contractOffers(chapter).map((c) => {
    const n = contractTarget(c, chapter);
    const el = h('button', { class: 'semis-card contract-card', type: 'button' }, h('b', {}, c.name), h('span', {}, c.text.replace('{n}', String(n))), h('em', { class: 'contract-target' }, `${n} ${c.unit}`));
    el.addEventListener('click', () => { chosen = c.id; root.querySelectorAll('.contract-card').forEach((x) => x.classList.toggle('on', x === el)); go.disabled = false; });
    return el;
  });
  const go = button('Signer ce contrat', () => { if (chosen) onPick(chosen); }, { cls: 'btn-primary btn-big', iconName: 'icon_check' }); go.disabled = true;
  append(root,
    h('h2', { class: 'panel-title' }, `Chapitre ${chapter} · ${ch.name}`),
    h('h3', { class: 'prep-h' }, 'Le contrat d’archipel'),
    h('p', { class: 'ws-intro' }, `Un engagement sur les cinq îles du chapitre. Rempli, il vaut ${CONTRACT_STARS} étoiles pour la porte du chapitre suivant (${CHAPTER_GATE} étoiles sur 15, ou ${CHAPTER_PATIENCE} parties terminées dans le chapitre). Rejouer une île ne cumule pas : c’est le meilleur résultat de chaque île qui compte.`),
    h('div', { class: 'semis-list contract-list' }, ...cards),
    h('div', { class: 'panel-actions' }, go),
  );
  return root;
}
