// « Terres étranges » : un mode à part, sans histoire — une île qui change de forme à chaque partie, de la plus simple
// à la plus étrange (idée du commanditaire, 27 septembre). Les formes vivent dans `FORMES` (islands.js) ; ici, le tirage
// (une forme jamais vue tant qu'il en reste), la définition d'île, le code partageable et les records par forme.
import { FORMES, WEIGHTS, generateMask, departsDeForme } from './islands.js';
import { DAILY_WISHES } from './daily.js';
import { RNG } from '../core/math.js';

/** Les trois familles, dans l'ordre de la galerie : de la plus douce à la plus étrange. */
export const FAMILLES = [['douce', 'Douces'], ['construite', 'Construites'], ['etrange', 'Étranges']];
const RANG = Object.fromEntries(FAMILLES.map(([id], i) => [id, i]));
const famille = (id) => (FORMES[id] && FORMES[id].famille) || 'construite';

/** Les formes jouables, dans l'ordre de la galerie (famille, puis ordre d'écriture). */
export function listeFormes() {
  const ids = Object.keys(FORMES);
  return ids.map((id, i) => ({ id, i })).sort((a, b) => (RANG[famille(a.id)] - RANG[famille(b.id)]) || (a.i - b.i)).map((x) => x.id);
}

/**
 * Tire la forme de la prochaine partie : une forme jamais vue tant qu'il en reste (les douces d'abord, puis les
 * construites, puis les étranges — on monte en étrangeté), sinon n'importe laquelle sauf la dernière jouée.
 */
export function tirerForme(rng, vues = [], derniere = null) {
  const toutes = listeFormes(); const vu = new Set(vues);
  const neuves = toutes.filter((id) => !vu.has(id));
  if (neuves.length) {
    // parmi les neuves, celles de la famille la plus douce qui reste
    const fam = famille(neuves[0]); const choix = neuves.filter((id) => famille(id) === fam);
    return choix[Math.floor(rng.next() * choix.length)];
  }
  const reste = toutes.filter((id) => id !== derniere); const pool = reste.length ? reste : toutes;
  return pool[Math.floor(rng.next() * pool.length)];
}

const SETS = ['all', 'balanced', 'rivers', 'farms', 'coastAll', 'hills', 'moorFarm', 'gentle'];

/**
 * La définition d'une partie : la forme, la graine, et le reste tiré de la graine (taille, file, saison de départ,
 * deux vœux). Comme l'Île du jour : tout est ouvert (bâtir, fusion, main, surprises, harmonie), pas d'étoile.
 * `familles` : les familles connues du joueur (pas de colline ni de lande avant de les avoir rencontrées en campagne).
 */
export function formesDef(forme, seed = 1, { familles = null } = {}) {
  const f = FORMES[forme] ? forme : listeFormes()[0];
  const rng = new RNG(seed * 131 + 7);
  const cells = 60 + Math.floor(rng.next() * 31);   // 60 à 90 cases : assez pour que les formes se lisent, pas trop pour le téléphone
  let weights = { ...WEIGHTS[SETS[Math.floor(rng.next() * SETS.length)]] };
  if (familles) for (const k of Object.keys(weights)) if (!familles.has(k)) delete weights[k];
  const startSeason = ['spring', 'summer', 'autumn', 'winter'][Math.floor(rng.next() * 4)];
  const pool = [...DAILY_WISHES]; const wishes = [];
  while (wishes.length < 2 && pool.length) wishes.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  const roughness = 0.35 + rng.next() * 0.15;
  let start = FORMES[f].depart ? FORMES[f].depart.map((t) => ({ ...t })) : [{ q: 0, r: 0, family: 'hamlet' }, { q: 2, r: -1, family: 'rock' }];   // certaines formes déplacent le hameau (l'anneau, l'ourlet, l'atoll)
  // les formes à tuiles de départ (crête, plateau, cuvette…) les posent sur le masque qu'on va avoir
  const mask = generateMask(seed, cells, { roughness, holes: 0, forme: f, garde: start.map((t) => `${t.q},${t.r}`) });
  const departs = departsDeForme(f, mask, start.map((t) => `${t.q},${t.r}`));
  if (departs.length) start = [...start, ...departs.filter((d) => !start.some((s) => s.q === d.q && s.r === d.r))];
  return {
    id: 'formes', formes: true, forme: f, seed, arch: 0, cells, roughness, holes: 0, seasonLength: 8, startSeason, weights, tilesRatio: 0.92,
    start, wishes, mechanics: [], surprise: true,
    name: FORMES[f].nom, intention: FORMES[f].intention || null,
  };
}

/** Le code d'une partie : la forme (son rang dans la galerie, en base 36) et la graine — « F-3-9IX ». */
export function codeForme(forme, seed) { const i = listeFormes().indexOf(forme); return `F-${Math.max(0, i).toString(36)}-${Math.max(1, Math.floor(seed)).toString(36)}`.toUpperCase(); }
export function lireCodeForme(code) {
  const m = /^\s*F\s*-?\s*([0-9A-Z]{1,2})\s*-\s*([0-9A-Z]{1,8})\s*$/i.exec(String(code || '')); if (!m) return null;
  const liste = listeFormes(); const i = parseInt(m[1], 36); const seed = parseInt(m[2], 36);
  if (!Number.isFinite(i) || i < 0 || i >= liste.length || !Number.isFinite(seed) || seed < 1) return null;
  return { forme: liste[i], seed };
}

/** La sauvegarde du mode, complétée si elle vient d'avant : records par forme, formes vues, parties jouées, dernière forme. */
export function recordsFormes(S) {
  if (!S) return S;
  S.records = S.records || {}; S.vues = S.vues || []; S.parties = S.parties || 0; S.derniere = S.derniere || null;
  return S;
}

/** Une partie finie : la forme est vue, le record par forme se met à jour. Rend { record, precedent }. */
export function noterPartieFormes(S, def, score) {
  recordsFormes(S);
  if (!S.vues.includes(def.forme)) S.vues.push(def.forme);
  const precedent = S.records[def.forme] || 0; const record = score > precedent;
  if (record) S.records[def.forme] = score;
  S.parties++; S.derniere = def.forme;
  return { record, precedent };
}
