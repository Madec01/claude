// Île du jour : une île générée depuis la date (identique pour tout le monde), trois vœux tirés d'une réserve, météo active.
import { WEIGHTS } from './islands.js';

export function dailyKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function dailyLabel(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); }
export function yesterdayKey(key) { const [y, m, d] = key.split('-').map(Number); return dailyKey(new Date(y, m - 1, d - 1)); }

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(seed) { let s = seed >>> 0 || 7; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Réserve de vœux de l'île du jour (textes dans STORY.wishes, clés d_*). */
export const DAILY_WISHES = [
  { id: 'd_forest', type: 'region', family: 'forest', size: 6, deadline: { placements: 40 } },
  { id: 'd_river', type: 'river', minLen: 5, deadline: { placements: 45 } },
  { id: 'd_rabbit', type: 'fauna', species: 'rabbit', deadline: { placements: 30 } },
  { id: 'd_bourg', type: 'bourg', count: 2, deadline: { placements: 60 } },
  { id: 'd_pairs', type: 'pairs', a: 'field', b: 'hamlet', count: 4, deadline: { placements: 50 } },
  { id: 'd_species', type: 'species', count: 4, deadline: { placements: 60 } },
  { id: 'd_meadow', type: 'closed', family: 'meadow', size: 4, deadline: { placements: 50 } },
  { id: 'd_lake', type: 'lake', size: 5, deadline: { placements: 45 } },
  { id: 'd_harvest', type: 'harvest', count: 3, deadline: { placements: 70 } },
];

export function dailyDef(key = dailyKey()) {
  const seed = hash(`cent-saisons:${key}`) % 1000000;
  const rng = mulberry(seed);
  const cells = 60 + Math.floor(rng() * 31);
  const sets = ['all', 'moor', 'hills', 'coastAll', 'moorFarm', 'balanced'];
  const weights = WEIGHTS[sets[Math.floor(rng() * sets.length)]];
  const startSeason = ['spring', 'summer', 'autumn', 'winter'][Math.floor(rng() * 4)];
  const pool = [...DAILY_WISHES]; const wishes = [];
  while (wishes.length < 3 && pool.length) wishes.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return {
    id: 'daily', date: key, arch: 0, cells, seed, roughness: 0.35 + rng() * 0.15, holes: rng() < 0.5 ? 1 : 2, seasonLength: 9, startSeason, weights, tilesRatio: 0.92,
    start: [{ q: 0, r: 0, family: 'hamlet' }, { q: 2, r: -1, family: 'rock' }, { q: -2, r: 2, family: rng() < 0.5 ? 'rock' : 'ruins' }],
    wishes, mechanics: [], weather: true, daily: true, name: `Île du ${dailyLabel(key)}`,
  };
}
