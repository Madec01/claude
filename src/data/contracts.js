// Contrats d'archipel : au début de chaque chapitre (dès le deuxième), le joueur choisit un contrat parmi trois. Rempli sur les cinq îles
// du chapitre, il vaut deux étoiles pour la porte du chapitre suivant : une seconde voie pour qui joue bien mais pas vite.
// Les cibles viennent des parties du bot fort (cinq îles, une graine) : environ 40 % de ce qu'il fait, par chapitre (60 % jugé impossible par un joueur).
import { CAMPAIGN_SIZE } from './campaign.js';

// cibles par chapitre (index 2..10) ; `from` : premier chapitre où le contrat existe (sa mécanique est ouverte)
export const CONTRACTS = [
  { id: 'closed', name: 'Les enclos', unit: 'régions closes', text: 'Fermer {n} régions sur les cinq îles du chapitre.', from: 2, targets: { 2: 45, 3: 60, 4: 65, 5: 90, 6: 85, 7: 80, 8: 90, 9: 95, 10: 100 }, stat: (r) => r.stats.closed },
  { id: 'fauna', name: 'La ménagerie', unit: 'animaux', text: 'Finir les îles avec {n} animaux présents, toutes îles cumulées.', from: 2, targets: { 2: 20, 3: 24, 4: 27, 5: 34, 6: 50, 7: 54, 8: 60, 9: 63, 10: 65 }, stat: (r) => r.fauna },
  { id: 'wishes', name: 'Les promesses', unit: 'vœux exaucés', text: 'Exaucer {n} vœux dans le chapitre.', from: 2, targets: { 2: 6, 3: 8, 4: 8, 5: 8, 6: 8, 7: 8, 8: 10, 9: 10, 10: 10 }, stat: (r) => r.wishesDone },
  { id: 'perfect', name: 'La main sûre', unit: 'coups parfaits', text: 'Réussir {n} coups parfaits ou de maître.', from: 2, targets: { 2: 12, 3: 22, 4: 24, 5: 40, 6: 30, 7: 24, 8: 30, 9: 34, 10: 34 }, stat: (r) => r.stats.perfect },
  { id: 'streak', name: 'Le fil', unit: 'îles avec une série de cinq', text: 'Tenir une série de cinq bons coups sur {n} îles du chapitre.', from: 2, targets: { 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3, 10: 3 }, stat: (r) => (r.stats.bestStreak >= 5 ? 1 : 0) },
  { id: 'built', name: 'Les bâtisseurs', unit: 'tuiles bâties', text: 'Bâtir {n} tuiles dans le chapitre.', from: 4, targets: { 4: 14, 5: 12, 6: 18, 7: 22, 8: 24, 9: 28, 10: 28 }, stat: (r) => r.stats.built },
  { id: 'fusions', name: 'L’alchimie', unit: 'fusions', text: 'Réussir {n} fusions dans le chapitre.', from: 5, targets: { 5: 18, 6: 22, 7: 25, 8: 19, 9: 30, 10: 30 }, stat: (r) => r.stats.fusions },
  { id: 'works', name: 'Les ouvrages', unit: 'ouvrages bien placés', text: 'Poser {n} ouvrages à leur bonne place.', from: 6, targets: { 6: 9, 7: 14, 8: 11, 9: 14, 10: 14 }, stat: (r) => r.stats.worksGood },
];
export const CONTRACT_STARS = 2;   // ce que vaut un contrat rempli pour la porte du chapitre

export const contractById = (id) => CONTRACTS.find((c) => c.id === id) || null;
export const contractTarget = (c, chapter) => c.targets[chapter] || c.targets[Math.max(...Object.keys(c.targets).map(Number))];
export const chapterOf = (island) => Math.ceil(island / 5);

/** Trois contrats proposés pour un chapitre, toujours les mêmes (tirage déterministe sur le numéro du chapitre). */
export function contractOffers(chapter) {
  const pool = CONTRACTS.filter((c) => c.from <= chapter && c.targets[chapter] !== undefined);
  let a = (chapter * 2654435761) >>> 0; const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}

/** État du contrat d'un chapitre dans la sauvegarde : { id, progress: { île: valeur }, done } ou null. */
export function contractState(campaign, chapter) { return campaign.contracts && campaign.contracts[chapter] ? campaign.contracts[chapter] : null; }
export function contractProgress(st) { return st ? Object.values(st.progress || {}).reduce((a, b) => a + b, 0) : 0; }
/** Un chapitre a besoin d'un contrat quand on y entre pour la première fois (dès le chapitre 2). */
export function contractNeeded(campaign, island) { const ch = chapterOf(island); return ch >= 2 && island <= CAMPAIGN_SIZE && !contractState(campaign, ch); }
export function chooseContract(campaign, chapter, id) { campaign.contracts = campaign.contracts || {}; campaign.contracts[chapter] = { id, progress: {}, done: false }; }
/** Après une île : la meilleure valeur de l'île compte (rejouer ne cumule pas). Retourne { before, after, done, justDone } ou null. */
export function noteContractResult(campaign, island, result) {
  const ch = chapterOf(island); const st = contractState(campaign, ch); if (!st) return null;
  const c = contractById(st.id); if (!c) return null;
  const before = contractProgress(st); const v = c.stat(result) || 0; st.progress = st.progress || {};
  st.progress[island] = Math.max(st.progress[island] || 0, v);
  const after = contractProgress(st); const target = contractTarget(c, ch); const wasDone = !!st.done; st.done = after >= target;
  return { contract: c, before, after, target, gained: after - before, done: st.done, justDone: st.done && !wasDone };
}
/** Résumé lisible : « Les enclos · 23 / 65 régions closes » ou « Les enclos · rempli ». */
export function contractLine(campaign, chapter) {
  const st = contractState(campaign, chapter); if (!st) return null; const c = contractById(st.id); if (!c) return null;
  const p = contractProgress(st), t = contractTarget(c, chapter);
  return { name: c.name, unit: c.unit, progress: p, target: t, done: !!st.done, text: st.done ? `${c.name} · rempli, +${CONTRACT_STARS} étoiles` : `${c.name} · ${p} / ${t} ${c.unit}` };
}
