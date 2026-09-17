// Familles de tuiles, variantes graphiques, table des affinités.
export const FAMILIES = ['meadow', 'forest', 'field', 'hamlet', 'orchard', 'water', 'marsh', 'rock', 'sand', 'hill', 'heath'];
/** Île à partir de laquelle une famille peut apparaître (absente = dès le début). */
export const FAMILY_FROM = { hill: 7, heath: 9 };
export const RARE = ['mill', 'chapel', 'watchtower', 'well', 'camp', 'granary', 'fountain'];
/** Tuiles rares réservées aux îles tardives (et aux modes libres). */
export const RARE_LATE = { granary: 7, fountain: 7 };
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

/** Nombre de variantes graphiques par famille (clés d'image : `${family}_${n}_${season}`). */
export const VARIANTS = { meadow: 3, forest: 3, field: 2, hamlet: 3, orchard: 2, water: 2, marsh: 2, rock: 3, sand: 2, hill: 2, heath: 2, granary: 1, fountain: 1, mill: 1, chapel: 1, watchtower: 1, well: 1, camp: 1, ruins: 1, dry_meadow: 1 };

/** Familles « effectives » d'une tuile rare pour les affinités (une rare peut compter pour plusieurs familles). */
export const RARE_AS = { mill: ['field', 'hamlet'], chapel: ['hamlet'], watchtower: ['rock'], well: ['meadow'], camp: ['meadow'], granary: ['field'], fountain: ['hamlet'], ruins: [] };

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
  'hamlet|hamlet': 'bourg', 'hamlet|water': 'port', 'hamlet|marsh': 'moustiques', 'field|rock': 'caillasse', 'field|sand': 'stérile', 'forest|sand': 'racines nues', 'hamlet|rock': 'à l’étroit', 'orchard|sand': 'sec',
  'hill|rock': 'crête', 'forest|hill': 'versant boisé', 'hill|meadow': 'pâturage', 'hill|orchard': 'coteau', 'hamlet|hill': 'belvédère', 'field|hill': 'pente', 'hill|marsh': 'boue',
  'heath|rock': 'lande rocheuse', 'heath|meadow': 'bruyère', 'forest|heath': 'lisière', 'heath|sand': 'dune', 'field|heath': 'terre pauvre', 'heath|orchard': 'sol acide',
};

/** Icônes d'UI par famille (Game Icons) et couleurs d'accent. */
export const FAMILY_COLORS = { meadow: '#7cc46f', forest: '#3f8a3d', field: '#d8a33c', hamlet: '#c96b4a', orchard: '#e0785a', water: '#5aa7d6', marsh: '#7ea36b', rock: '#8f9aa3', sand: '#e6d29a', mill: '#d8a33c', chapel: '#c96b4a', watchtower: '#8f9aa3', well: '#5aa7d6', camp: '#e0a33a', ruins: '#8f9aa3', hill: '#9bb56a', heath: '#a67bb8', granary: '#d8a33c', fountain: '#5aa7d6' };
