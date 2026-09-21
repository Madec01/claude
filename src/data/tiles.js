// Familles de tuiles, variantes graphiques, table des affinités.
export const FAMILIES = ['meadow', 'forest', 'field', 'hamlet', 'orchard', 'water', 'marsh', 'rock', 'sand', 'hill', 'heath'];
/** Île à partir de laquelle une famille peut apparaître (absente = dès le début). */
export const FAMILY_FROM = { hill: 12, heath: 14 };
export const RARE = ['mill', 'chapel', 'watchtower', 'well', 'camp', 'granary', 'fountain', 'market', 'fete', 'restore', 'tavern', 'trough', 'archway', 'mine', 'oven'];
/** Tuiles d'événement : un effet immédiat ou ponctuel plutôt qu'un bonus permanent. */
export const EVENT_TILES = ['market', 'fete', 'restore'];
/** Tuiles rares réservées aux îles tardives (et aux modes libres). */
export const RARE_LATE = { granary: 13, fountain: 13, market: 9, fete: 9, restore: 9, tavern: 18, trough: 18, archway: 18, mine: 18, oven: 18 };
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

/** Nombre de variantes graphiques par famille (clés d'image : `${family}_${n}_${season}`). */
export const VARIANTS = { meadow: 3, forest: 3, field: 2, hamlet: 3, orchard: 2, water: 2, marsh: 2, rock: 3, sand: 2, hill: 2, heath: 2, granary: 1, fountain: 1, market: 1, fete: 1, restore: 1, tavern: 1, trough: 1, archway: 1, mine: 1, oven: 1, mill: 1, chapel: 1, watchtower: 1, well: 1, camp: 1, ruins: 1, dry_meadow: 1 };

/** Familles « effectives » d'une tuile rare pour les affinités (une rare peut compter pour plusieurs familles). */
export const RARE_AS = { mill: ['field', 'hamlet'], chapel: ['hamlet'], watchtower: ['rock'], well: ['meadow'], camp: ['meadow'], granary: ['field'], fountain: ['hamlet'], market: ['hamlet'], fete: ['hamlet'], restore: [], tavern: ['hamlet'], trough: ['meadow'], archway: ['hamlet'], mine: ['rock'], oven: ['hamlet'], ruins: [],
  // fusions (deux familles superposées) : la tuile compte pour ses deux familles
  paddy: ['field', 'water'], farm: ['hamlet', 'field'], fort: ['hamlet', 'rock'], falls: ['rock', 'water'], cave: ['forest', 'rock'], lagoon: ['sand', 'water'] };

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
];
export const FUSION_BY_ID = Object.fromEntries(FUSIONS.map((f) => [f.id, f]));
/** Recette pour deux familles de base (ordre indifférent), ou null. */
export function fusionFor(fa, fb) { return FUSIONS.find((f) => (f.a === fa && f.b === fb) || (f.a === fb && f.b === fa)) || null; }

/** Niveau 3 : prime de saison par famille (+pts par voisine de `family`, plafonnée, ou +pts fixes dans `season`). */
export const LEVEL3_SEASONAL = {
  field: { season: 'autumn', pts: 2 }, orchard: { season: 'spring', pts: 2 }, marsh: { season: 'spring', pts: 2 },
  water: { family: 'water', pts: 1, cap: 3 }, rock: { family: 'water', pts: 1, cap: 3 }, sand: { family: 'water', pts: 1, cap: 3 },
  hill: { family: 'meadow', pts: 1, cap: 3 }, heath: { family: 'forest', pts: 1, cap: 3 },
};

/** Ouvrages : tuiles bonus qui se posent SUR une tuile existante (une par tuile) ; bonne ou mauvaise place, jugée à chaque saison. */
// Le ponton et le pont sont partis : les sprites du Nature Kit (une passerelle claire de 66 × 48 sur
// un hexagone large de 120) ne se mariaient avec rien, et un ouvrage posé au milieu d'un étang ne
// racontait pas un ouvrage. Ils reviendront peut-être avec le Livre II et ses vraies tuiles de mer.
export const WORKS = ['hive', 'scarecrow', 'nestbox', 'campfire', 'menhir', 'compost'];

/** Table des affinités : clé "a|b" (ordre indifférent) → points par bord partagé. */
const PAIRS = {
  'meadow|meadow': 1, 'forest|forest': 1, 'field|field': 1, 'hamlet|hamlet': 2, 'orchard|orchard': 1, 'water|water': 1, 'marsh|marsh': 1, 'rock|rock': 1, 'sand|sand': 1,
  'field|hamlet': 2, 'orchard|meadow': 2, 'orchard|hamlet': 2, 'marsh|water': 2, 'forest|rock': 2, 'sand|water': 2,
  'meadow|forest': 1, 'hamlet|water': 1, 'field|meadow': 1, 'marsh|forest': 1, 'rock|water': 1,
  'hamlet|marsh': -1, 'field|rock': -1, 'field|sand': -1, 'forest|sand': -1, 'hamlet|rock': -1, 'orchard|sand': -1,
  // collines (dès l'île 7) : relief, coteaux, belvédères
  'hill|hill': 1, 'hill|rock': 2, 'forest|hill': 1, 'hill|meadow': 1, 'hill|orchard': 1, 'hamlet|hill': 1, 'field|hill': -1, 'hill|marsh': -1,
  // landes (dès l'île 9) : sols pauvres qui ne craignent pas l'été
  'heath|heath': 1, 'heath|rock': 1, 'heath|meadow': 1, 'forest|heath': 1, 'heath|sand': 1, 'field|heath': -1, 'heath|orchard': -1,
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
  'field|hamlet': 'moisson', 'orchard|meadow': 'butinage', 'orchard|hamlet': 'cueillette', 'marsh|water': 'roselière', 'forest|rock': 'versant', 'sand|water': 'plage',
  'hamlet|hamlet': 'bourg', 'hamlet|water': 'sur la rive', 'hamlet|marsh': 'moustiques', 'field|rock': 'caillasse', 'field|sand': 'stérile', 'forest|sand': 'racines nues', 'hamlet|rock': 'à l’étroit', 'orchard|sand': 'sec',
  'hill|rock': 'crête', 'forest|hill': 'versant boisé', 'hill|meadow': 'pâturage', 'hill|orchard': 'coteau', 'hamlet|hill': 'belvédère', 'field|hill': 'pente', 'hill|marsh': 'boue',
  'heath|rock': 'lande rocheuse', 'heath|meadow': 'bruyère', 'forest|heath': 'lisière', 'heath|sand': 'dune', 'field|heath': 'terre pauvre', 'heath|orchard': 'sol acide',
};

/** Icônes d'UI par famille (Game Icons) et couleurs d'accent. */
export const FAMILY_COLORS = { hive: '#e0a33a', scarecrow: '#c9903a', nestbox: '#7a5a3a', campfire: '#d95f4b', menhir: '#6f747a', compost: '#7a6a3a', paddy: '#7fb26a', farm: '#c9903a', fort: '#8a8f96', falls: '#6fb2d8', cave: '#7a7f86', lagoon: '#7fcbe0', meadow: '#7cc46f', forest: '#3f8a3d', field: '#d8a33c', hamlet: '#c96b4a', orchard: '#e0785a', water: '#5aa7d6', marsh: '#7ea36b', rock: '#8f9aa3', sand: '#e6d29a', mill: '#d8a33c', chapel: '#c96b4a', watchtower: '#8f9aa3', well: '#5aa7d6', camp: '#e0a33a', ruins: '#8f9aa3', hill: '#9bb56a', heath: '#a67bb8', granary: '#d8a33c', fountain: '#5aa7d6', market: '#c96b4a', fete: '#e0a33a', restore: '#8f9aa3', tavern: '#c96b4a', trough: '#7cc46f', archway: '#c96b4a', mine: '#8f9aa3', oven: '#c96b4a' };
