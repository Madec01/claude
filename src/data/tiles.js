// Familles de tuiles, variantes graphiques, table des affinités.
/** Les familles du Livre I (la terre), puis celles du Livre II : la mer posable (mer, récif, algues) et deux terres de bord de mer (port, pinède). */
export const FAMILLES_TERRE = ['meadow', 'forest', 'field', 'hamlet', 'orchard', 'water', 'marsh', 'rock', 'sand', 'hill', 'heath'];
export const FAMILLES_LIVRE2 = ['sea', 'reef', 'kelp', 'port', 'pine'];
export const FAMILIES = [...FAMILLES_TERRE, ...FAMILLES_LIVRE2];
/** Les tuiles de mer : elles ne se posent que sur le détroit (les cases de mer entre les îles), et rien d'autre ne s'y pose. */
export const MER = new Set(['sea', 'reef', 'kelp']);
/** Ce qu'un port exporte : les familles de terre qui le touchent (une marchandise par famille différente, sur toute la route). */
export const MARCHANDISES = new Set(['field', 'forest', 'orchard', 'meadow', 'rock', 'marsh', 'hill', 'heath', 'pine', 'sand']);
export const RARE = ['mill', 'chapel', 'watchtower', 'well', 'camp', 'granary', 'hive', 'menhir'];
/** Les rares du Livre II (dès les ports, puis dès le phare) : elles vivent des routes de mer. */
export const RARE_LIVRE2 = ['tavern', 'market', 'phare'];
// L'île où une famille ou une rare arrive n'est écrite qu'à un endroit : MECH_AT dans campaign.js (`hill`, `heath`, `rare2`).
/**
 * Rares et tuiles d'événement retirées par l'audit de simplification (22 septembre) : ce qu'elles deviennent si une
 * partie reprise, ou une file en cours, en contient encore — une tuile ordinaire de la famille qu'elles comptaient.
 */
// (la taverne et le marché, retirés alors, reviennent au Livre II avec un autre sens : ils vivent des routes de mer)
export const RETIRED_RARE = { fountain: 'hamlet', fete: 'hamlet', restore: 'meadow', trough: 'meadow', archway: 'hamlet', mine: 'rock', oven: 'hamlet' };
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

/** Nombre de variantes graphiques par famille (clés d'image : `${family}_${n}_${season}`). */
export const VARIANTS = { phare: 1, shipyard: 1, sea: 1, reef: 1, kelp: 1, port: 1, pine: 1, meadow: 3, forest: 3, field: 2, hamlet: 3, orchard: 2, water: 2, marsh: 2, rock: 3, sand: 2, hill: 2, heath: 2, granary: 1, fountain: 1, market: 1, fete: 1, restore: 1, tavern: 1, trough: 1, archway: 1, mine: 1, oven: 1, mill: 1, chapel: 1, watchtower: 1, well: 1, camp: 1, ruins: 1, dry_meadow: 1 };

/** Familles « effectives » d'une tuile rare pour les affinités (une rare peut compter pour plusieurs familles). */
export const RARE_AS = { hive: ['meadow'], menhir: ['rock'], mill: ['field', 'hamlet'], chapel: ['hamlet'], watchtower: ['rock'], well: ['meadow'], camp: ['meadow'], granary: ['field'], fountain: ['hamlet'], market: ['hamlet'], fete: ['hamlet'], restore: [], tavern: ['hamlet'], phare: ['rock'], trough: ['meadow'], archway: ['hamlet'], mine: ['rock'], oven: ['hamlet'], ruins: [],
  // fusions (deux familles superposées) : la tuile compte pour ses deux familles
  paddy: ['field', 'water'], farm: ['hamlet', 'field'], fort: ['hamlet', 'rock'], falls: ['rock', 'water'], cave: ['forest', 'rock'], lagoon: ['sand', 'water'], shipyard: ['port', 'forest'] };

/**
 * Recettes de fusion : poser une tuile sur une tuile d'une autre famille. Commutatives. `seasonal` : prime à chaque
 * changement de saison (+pts par voisine de `family`, plafonnée à `cap`, ou +pts fixes dans la saison `season`).
 */
export const FUSIONS = [
  { id: 'paddy',  a: 'field',  b: 'water', seasonal: { season: 'autumn', pts: 3 } },
  { id: 'farm',   a: 'hamlet', b: 'field', seasonal: { family: 'field', pts: 1, cap: 3 } },
  { id: 'fort',   a: 'hamlet', b: 'rock',  seasonal: { family: 'rock', pts: 1, cap: 3 } },
  { id: 'falls',  a: 'rock',   b: 'water', seasonal: { family: 'water', pts: 1, cap: 3 } },
  { id: 'cave',   a: 'forest', b: 'rock',  seasonal: { family: 'forest', pts: 1, cap: 3 } },
  { id: 'lagoon', a: 'sand',   b: 'water', seasonal: { family: 'water', pts: 1, cap: 3 } },
  // Livre II : le chantier naval, port + forêt — +1 par tuile de mer voisine à chaque saison (les coques sortent des bois de marine)
  { id: 'shipyard', a: 'port', b: 'forest', seasonal: { family: 'sea', pts: 1, cap: 3, livre2: true } },
];
export const FUSION_BY_ID = Object.fromEntries(FUSIONS.map((f) => [f.id, f]));
/** Recette pour deux familles de base (ordre indifférent), ou null. */
export function fusionFor(fa, fb) { return FUSIONS.find((f) => (f.a === fa && f.b === fb) || (f.a === fb && f.b === fa)) || null; }

/**
 * Les ouvrages (tuiles bonus posées SUR une tuile, bonne ou mauvaise place, remise, fraîcheur) ont été retirés par
 * l'audit de simplification : le sous-système le plus ramifié du jeu. La ruche et le menhir survivent comme rares ;
 * les quatre autres (épouvantail, nichoir, feu de camp, compost), trouvés dans une partie reprise, disparaissent.
 */
export const RETIRED_WORKS = ['scarecrow', 'nestbox', 'campfire', 'compost'];
/**
 * Rente de saison des rares qui en ont une : à chaque changement de saison, +pts par voisine de l'une des familles
 * citées, plafonné à `cap` (+`spring` de plus au printemps). La ruche et le menhir étaient des ouvrages ; ils sont
 * devenus des rares ordinaires, posées sur une case vide, sans bonne ni mauvaise place.
 */
export const RARE_SEASONAL = {
  hive: { families: ['orchard', 'meadow'], pts: 1, cap: 3, spring: 1 },
  menhir: { families: ['rock', 'hill'], pts: 1, cap: 3 },
};

/** Table des affinités : clé "a|b" (ordre indifférent) → points par bord partagé. */
const PAIRS = {
  'meadow|meadow': 1, 'forest|forest': 1, 'field|field': 1, 'hamlet|hamlet': 2, 'orchard|orchard': 1, 'water|water': 1, 'marsh|marsh': 1, 'rock|rock': 1, 'sand|sand': 1,
  'field|hamlet': 2, 'meadow|orchard': 2, 'hamlet|orchard': 2, 'marsh|water': 2, 'forest|rock': 2, 'sand|water': 2,
  'forest|meadow': 1, 'hamlet|water': 1, 'field|meadow': 1, 'forest|marsh': 1, 'rock|water': 1,
  'hamlet|marsh': -1, 'field|rock': -1, 'field|sand': -1, 'forest|sand': -1, 'hamlet|rock': -1, 'orchard|sand': -1,
  // collines (île de MECH_AT.hill) : relief, coteaux, belvédères
  'hill|hill': 1, 'hill|rock': 2, 'forest|hill': 1, 'hill|meadow': 1, 'hill|orchard': 1, 'hamlet|hill': 1, 'field|hill': -1, 'hill|marsh': -1,
  // landes (île de MECH_AT.heath) : sols pauvres qui ne craignent pas l'été
  'heath|heath': 1, 'heath|rock': 1, 'heath|meadow': 1, 'forest|heath': 1, 'heath|sand': 1, 'field|heath': -1, 'heath|orchard': -1,
  // Livre II — la mer posable : la Mer est neutre et porte les routes ; le Récif aime la plage et la roche, craint le hameau ;
  // les Algues aiment le marais. Le Port ancre les routes (mer +2, hameau +2, jamais deux ports côte à côte) ; la Pinède est
  // la forêt de bord de mer (sable et roche +2). Clés triées : `pairKey` cherche a < b.
  'sea|sea': 1, 'reef|sea': 1, 'kelp|sea': 1, 'reef|reef': 1, 'kelp|kelp': 1, 'kelp|reef': 1, 'sea|water': 1,
  'reef|sand': 2, 'reef|rock': 2, 'hamlet|reef': -1, 'kelp|marsh': 2, 'kelp|sand': 1,
  'port|sea': 2, 'hamlet|port': 2, 'field|port': 1, 'forest|port': 1, 'port|port': -1, 'marsh|port': -1, 'port|reef': -1,
  'pine|sand': 2, 'pine|rock': 2, 'forest|pine': 1, 'pine|sea': 1, 'pine|pine': 1, 'field|pine': -1, 'meadow|pine': 1,
};

export function pairKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

/** Points d'affinité entre deux familles (0 si aucune règle). */
export function affinity(a, b) {
  const fa = RARE_AS[a] || [a];
  const fb = RARE_AS[b] || [b];
  let best = 0;
  for (const x of fa) for (const y of fb) { const v = PAIRS[pairKey(x, y)] || 0; if (Math.abs(v) > Math.abs(best)) best = v; }
  return best;
}

/** Libellé court d'une paire, pour l'aide en jeu. */
export const PAIR_LABELS = {
  'field|hamlet': 'moisson', 'meadow|orchard': 'butinage', 'hamlet|orchard': 'cueillette', 'marsh|water': 'roselière', 'forest|rock': 'versant', 'sand|water': 'plage',
  'hamlet|hamlet': 'bourg', 'hamlet|water': 'sur la rive', 'hamlet|marsh': 'moustiques', 'field|rock': 'caillasse', 'field|sand': 'stérile', 'forest|sand': 'racines nues', 'hamlet|rock': 'à l’étroit', 'orchard|sand': 'sec',
  'hill|rock': 'crête', 'forest|hill': 'versant boisé', 'hill|meadow': 'pâturage', 'hill|orchard': 'coteau', 'hamlet|hill': 'belvédère', 'field|hill': 'pente', 'hill|marsh': 'boue',
  'heath|rock': 'lande rocheuse', 'heath|meadow': 'bruyère', 'forest|heath': 'lisière', 'heath|sand': 'dune', 'field|heath': 'terre pauvre', 'heath|orchard': 'sol acide',
  'reef|sand': 'lagon', 'reef|rock': 'écueils', 'hamlet|reef': 'naufrage', 'kelp|marsh': 'vasière', 'port|sea': 'quai', 'hamlet|port': 'ville portuaire', 'field|port': 'grenier du port', 'forest|port': 'bois de marine', 'port|port': 'deux ports', 'marsh|port': 'envasé', 'port|reef': 'écueils', 'pine|sand': 'pinède de dune', 'pine|rock': 'pins des falaises', 'forest|pine': 'résineux', 'field|pine': 'ombre', 'sea|water': 'estuaire',
};

/** Icônes d'UI par famille (Game Icons) et couleurs d'accent. */
export const FAMILY_COLORS = { phare: '#d9d3c4', shipyard: '#8a6a4a', sea: '#3f8fc9', reef: '#7fcbe0', kelp: '#4f9a7a', port: '#a86b3e', pine: '#2f6f4a', hive: '#e0a33a', scarecrow: '#c9903a', nestbox: '#7a5a3a', campfire: '#d95f4b', menhir: '#6f747a', compost: '#7a6a3a', paddy: '#7fb26a', farm: '#c9903a', fort: '#8a8f96', falls: '#6fb2d8', cave: '#7a7f86', lagoon: '#7fcbe0', meadow: '#7cc46f', forest: '#3f8a3d', field: '#d8a33c', hamlet: '#c96b4a', orchard: '#e0785a', water: '#5aa7d6', marsh: '#7ea36b', rock: '#8f9aa3', sand: '#e6d29a', mill: '#d8a33c', chapel: '#c96b4a', watchtower: '#8f9aa3', well: '#5aa7d6', camp: '#e0a33a', ruins: '#8f9aa3', hill: '#9bb56a', heath: '#a67bb8', granary: '#d8a33c', fountain: '#5aa7d6', market: '#c96b4a', fete: '#e0a33a', restore: '#8f9aa3', tavern: '#c96b4a', trough: '#7cc46f', archway: '#c96b4a', mine: '#8f9aa3', oven: '#c96b4a' };
