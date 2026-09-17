// Cycle des saisons et leurs effets sur l'île.
import { SEASONS } from '../data/tiles.js';
import { BALANCE } from '../data/balance.js';
import { Board } from './board.js';
import { neighbors } from './hex.js';

const P = BALANCE.points;

export function nextSeason(s) { return SEASONS[(SEASONS.indexOf(s) + 1) % SEASONS.length]; }

/**
 * Applique la transition vers `season`. Retourne la liste d'événements (points, changements de tuiles)
 * pour l'affichage et le score : [{ type, q, r, pts, ... }].
 */
export function transition(board, season, rule = null) {
  const ev = [];
  const tiles = [...board.tiles.values()];
  if (season === 'spring') {
    for (const t of tiles) {
      if (t.frozen) { t.frozen = false; ev.push({ type: 'thaw', q: t.q, r: t.r }); }
      if (t.dry) { t.dry = false; ev.push({ type: 'green', q: t.q, r: t.r }); }
      if (Board.isFamily(t, 'marsh')) { t.bloom = true; ev.push({ type: 'bloom', q: t.q, r: t.r, pts: rule === 'crue' || !rule ? P.springMarsh : 0 }); }
      else if (Board.isFamily(t, 'heath')) { t.bloom = true; ev.push({ type: 'heather', q: t.q, r: t.r, pts: rule === 'crue' || !rule ? P.springHeath : 0 }); }
    }
  } else if (season === 'summer') {
    for (const t of tiles) {
      if (t.bloom) t.bloom = false;
      if (t.family === 'meadow' && !t.rare) {
        const ns = neighbors(t.q, t.r).map(([a, b]) => board.get(a, b)).filter(Boolean);
        if (rule === 'chaleurs') {
          // grandes chaleurs : rien ne sèche, sauf les prairies collées à un marais lui-même privé d'eau
          const badMarsh = ns.some((n) => Board.isFamily(n, 'marsh') && !neighbors(n.q, n.r).some(([a, b]) => Board.isFamily(board.get(a, b), 'water')));
          if (badMarsh) { t.dry = true; ev.push({ type: 'dry', q: t.q, r: t.r }); }
          continue;
        }
        const wet = ns.some((n) => Board.isFamily(n, 'water') || Board.isFamily(n, 'forest') || Board.isFamily(n, 'marsh') || Board.isFamily(n, 'heath') || n.family === 'well' || n.family === 'fountain' || n.family === 'trough');
        if (!wet) { t.dry = true; ev.push({ type: 'dry', q: t.q, r: t.r }); }
      }
    }
  } else if (season === 'autumn') {
    for (const t of tiles) {
      if (t.dry) { t.dry = false; ev.push({ type: 'green', q: t.q, r: t.r }); }
      if (Board.isFamily(t, 'orchard') && rule !== 'foire' && rule !== 'chasse') {
        const hamlets = neighbors(t.q, t.r).map(([a, b]) => board.get(a, b)).filter((n) => n && Board.isFamily(n, 'hamlet'));
        for (const h of hamlets) ev.push({ type: 'harvest', q: t.q, r: t.r, to: { q: h.q, r: h.r }, pts: P.autumnHarvest * (t.sown ? 2 : 1) });
        t.sown = false;
      }
      if (rule === 'chasse' && Board.isFamily(t, 'forest') && !t.rare && neighbors(t.q, t.r).some(([a, b]) => Board.isFamily(board.get(a, b), 'hamlet'))) ev.push({ type: 'hunt', q: t.q, r: t.r, pts: 2 });
    }
    if (rule === 'foire') {
      // grande foire : chaque bourg (hameau clos) rapporte +1 par champ, verger ou moulin voisin
      for (const reg of board.regions('hamlet')) {
        if (!board.closedRegions.has(reg.id)) continue;
        const n = board.regionNeighbors(reg).filter((x) => Board.isFamily(x, 'field') || Board.isFamily(x, 'orchard') || x.family === 'mill').length;
        if (n) { const c = reg.cells[0]; ev.push({ type: 'fair', q: c.q, r: c.r, pts: n }); }
      }
    }
  } else if (season === 'winter') {
    if (rule === 'doux') {
      // hiver doux : pas de gel, pas de veillée ; chaque marais qui touche l'eau rapporte +1
      for (const t of tiles) if (Board.isFamily(t, 'marsh') && neighbors(t.q, t.r).some(([a, b]) => Board.isFamily(board.get(a, b), 'water'))) ev.push({ type: 'mild', q: t.q, r: t.r, pts: 1 });
      return ev;
    }
    for (const t of tiles) if (Board.isFamily(t, 'water')) { t.frozen = true; ev.push({ type: 'freeze', q: t.q, r: t.r }); }
    if (rule === 'froid') {
      // grand froid : un hameau sans forêt voisine perd 2 ; chaque forêt qui touche un hameau rapporte +2 (le bois de chauffage)
      for (const t of tiles) {
        if (Board.isFamily(t, 'hamlet') && !neighbors(t.q, t.r).some(([a, b]) => Board.isFamily(board.get(a, b), 'forest'))) ev.push({ type: 'cold', q: t.q, r: t.r, pts: -2 });
        if (Board.isFamily(t, 'forest') && !t.rare && neighbors(t.q, t.r).some(([a, b]) => Board.isFamily(board.get(a, b), 'hamlet'))) ev.push({ type: 'firewood', q: t.q, r: t.r, pts: 2 });
      }
      return ev;
    }
    // veillée : hameaux reliés par une même chaîne d'eau gelée
    for (const reg of board.regions('water')) {
      const hamlets = board.regionNeighbors(reg).filter((n) => Board.isFamily(n, 'hamlet'));
      const uniq = new Map(); for (const h of hamlets) uniq.set(`${h.q},${h.r}`, h);
      const hs = [...uniq.values()];
      for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) ev.push({ type: 'veillee', q: hs[i].q, r: hs[i].r, to: { q: hs[j].q, r: hs[j].r }, pts: P.winterVeillee, region: reg.id });
    }
  }
  return ev;
}

/** Nombre de paires « veillée » actuelles (pour les vœux). */
export function veilleePairs(board) {
  let n = 0;
  for (const reg of board.regions('water')) {
    if (!reg.cells.every((c) => c.frozen)) continue;
    const hs = new Set(board.regionNeighbors(reg).filter((x) => Board.isFamily(x, 'hamlet')).map((x) => `${x.q},${x.r}`));
    n += (hs.size * (hs.size - 1)) / 2;
  }
  return n;
}

export const seasonIndex = (s) => SEASONS.indexOf(s);
