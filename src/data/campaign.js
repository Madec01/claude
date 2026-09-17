// Les 12 parties de la campagne et les techniques débloquées.
export const MATCHES = [
  { id: 1,  act: 1, opponent: 'marius',  terrain: 'place',     target: 7,  unlocks: ['point'], music: 'act1' },
  { id: 2,  act: 1, opponent: 'josiane', terrain: 'bar',       target: 7,  unlocks: [], music: 'act1' },
  { id: 3,  act: 1, opponent: 'lucien',  terrain: 'clairiere', target: 7,  unlocks: ['halflob'], music: 'act1' },
  { id: 4,  act: 1, opponent: 'kevin',   terrain: 'parking',   target: 7,  unlocks: ['shoot'], music: 'act1' },
  { id: 5,  act: 2, opponent: 'anselme', terrain: 'plage',     target: 11, unlocks: ['lob'], music: 'act2' },
  { id: 6,  act: 2, opponent: 'toni',    terrain: 'bar',       target: 11, unlocks: [], music: 'act2' },
  { id: 7,  act: 2, opponent: 'nino',    terrain: 'parking',   target: 11, unlocks: ['spin'], music: 'act2' },
  { id: 8,  act: 2, opponent: 'faure',   terrain: 'place',     target: 11, unlocks: ['measure'], music: 'act2' },
  { id: 9,  act: 3, opponent: 'roubaud', terrain: 'clairiere', target: 13, unlocks: [], music: 'act3' },
  { id: 10, act: 3, opponent: 'gaby',    terrain: 'plage',     target: 13, unlocks: [], music: 'act3' },
  { id: 11, act: 3, opponent: 'gerard',  terrain: 'bar',       target: 13, unlocks: [], music: 'act3' },
  { id: 12, act: 3, opponent: 'gerard2', terrain: 'nuit',      target: 13, unlocks: [], music: 'finale', finale: true },
];

export const getMatch = (id) => MATCHES.find((m) => m.id === id);

/** Techniques disponibles pour une partie donnée de la campagne (tout ce qui est débloqué jusqu'à cette partie incluse). */
export function techniquesForMatch(id) {
  const set = new Set();
  for (const m of MATCHES) { if (m.id > id) break; for (const u of m.unlocks) set.add(u); }
  return set;
}

export const ALL_TECHNIQUES = ['point', 'halflob', 'shoot', 'lob', 'spin', 'measure'];
