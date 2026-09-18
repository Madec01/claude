// L'eau : étang (une tuile), lac (plusieurs tuiles en tas, sans montagne contiguë), rivière (chaîne en ligne qui part
// d'une montagne : roche ou colline), lac de montagne (tas qui touche une montagne). Une région qui part d'une montagne en
// ligne puis s'élargit se décompose en un **tronc** (rivière : la chaîne depuis la source jusqu'à la première fourche
// incluse) et des **lobes** (lac dans lequel la rivière se jette) : ce qui était rivière le reste, la suite devient un lac.
// Classification par forme, mise en cache par version de plateau ; sert aux règles, aux vœux, à la faune et au rendu.
import { Board } from './board.js';
import { key, parse, neighbors } from './hex.js';

const isMountain = (t) => !!t && (Board.isFamily(t, 'rock') || Board.isFamily(t, 'hill'));

/** @returns {Map<string, { id, kind:'pond'|'lake'|'river'|'mountainLake', cells, keys, size, source, mouth, chain:string[], intoLake?, fedBy? }>} par clé de cellule */
export function classifyWater(board) {
  if (board._water && board._waterVersion === board.version) return board._water;
  const byCell = new Map(); const bodies = [];
  const sizeOf = (cells) => cells.reduce((s, c) => s + (c.level || 1), 0);
  const touchesSea = (cells) => cells.some((t) => neighbors(t.q, t.r).some(([a, b]) => board.isSea(a, b)));
  for (const reg of board.regions('water')) {
    const inReg = (t) => neighbors(t.q, t.r).map(([a, b]) => board.get(a, b)).filter((n) => n && reg.keys.has(key(n.q, n.r)));
    const deg = (t) => inReg(t).length;
    const nearMountain = (t) => neighbors(t.q, t.r).some(([a, b]) => isMountain(board.get(a, b)));
    const touchesMountain = board.regionNeighbors(reg).some(isMountain);
    const line = reg.size >= 2 && reg.cells.every((t) => deg(t) <= 2) && reg.cells.filter((t) => deg(t) === 1).length === 2;
    // chaîne ordonnée depuis une extrémité : s'arrête après la première fourche (incluse) ou au bout de la ligne
    const chainFrom = (end) => { const chain = [end]; let prev = null, cur = end; for (;;) { if (deg(cur) > 2) break; const nx = inReg(cur).filter((n) => n !== prev && !chain.includes(n)); if (nx.length !== 1) break; prev = cur; cur = nx[0]; chain.push(cur); } return chain; };
    const push = (body) => { bodies.push(body); for (const k of body.keys) byCell.set(k, body); };
    if (reg.size === 1) { push({ id: reg.id, kind: 'pond', cells: reg.cells, keys: reg.keys, size: reg.size, source: touchesMountain, mouth: touchesSea(reg.cells), chain: [] }); continue; }
    if (line && touchesMountain) {
      const ends = reg.cells.filter((t) => deg(t) === 1);
      const srcEnd = ends.find(nearMountain) || ends[0];
      const chain = chainFrom(srcEnd);
      // embouchure : c'est le bout de la rivière (l'extrémité opposée à la source) qui doit toucher la mer, pas un flanc
      push({ id: reg.id, kind: 'river', cells: chain, keys: reg.keys, size: reg.size, source: true, mouth: touchesSea([chain[chain.length - 1]]), chain: chain.map((c) => key(c.q, c.r)) });
      continue;
    }
    if (touchesMountain) {
      // tronc : la plus longue chaîne partant d'une extrémité collée à la montagne, fourche incluse
      let best = [];
      for (const end of reg.cells.filter((t) => deg(t) === 1 && nearMountain(t))) { const ch = chainFrom(end); if (ch.length > best.length) best = ch; }
      if (best.length >= 2 && best.length < reg.cells.length) {
        const tk = new Set(best.map((c) => key(c.q, c.r)));
        const rest = reg.cells.filter((c) => !tk.has(key(c.q, c.r))); const rk = new Set(rest.map((c) => key(c.q, c.r)));
        const junction = best[best.length - 1];
        const lakeAnchor = inReg(junction).find((n) => rk.has(key(n.q, n.r)));
        // une rivière qui se jette dans un lac n'atteint pas la mer, même si le lac la touche
        const river = { id: `${reg.id}:r`, kind: 'river', cells: best, keys: tk, size: sizeOf(best), source: true, mouth: false, chain: best.map((c) => key(c.q, c.r)), intoLake: lakeAnchor ? key(lakeAnchor.q, lakeAnchor.r) : null };
        const lake = { id: `${reg.id}:l`, kind: 'lake', cells: rest, keys: rk, size: sizeOf(rest), source: rest.some(nearMountain), mouth: touchesSea(rest), chain: [], fedBy: river.id };
        push(lake); push(river);
        continue;
      }
      push({ id: reg.id, kind: 'mountainLake', cells: reg.cells, keys: reg.keys, size: reg.size, source: true, mouth: touchesSea(reg.cells), chain: [] });
      continue;
    }
    push({ id: reg.id, kind: 'lake', cells: reg.cells, keys: reg.keys, size: reg.size, source: false, mouth: touchesSea(reg.cells), chain: [] });
  }
  byCell.bodies = bodies;
  board._water = byCell; board._waterVersion = board.version;
  return byCell;
}

export const waterBodies = (board) => classifyWater(board).bodies;
export const rivers = (board) => waterBodies(board).filter((b) => b.kind === 'river');
export const lakes = (board) => waterBodies(board).filter((b) => b.kind === 'lake' || b.kind === 'mountainLake');
export const KIND_LABEL = { pond: 'étang', lake: 'lac', river: 'rivière', mountainLake: 'lac de montagne' };
