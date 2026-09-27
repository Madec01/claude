// La ligne d'avenir de l'aperçu de pose (feuille Histoire, J-H) : une seule phrase sur ce que la pose prépare, la plus
// utile — un habitat presque prêt, une région à une case de se fermer, une tuile que la saison annoncée abîmera.
// Rien n'est touché sur le plateau : tout se joue dans `board.simulate`, la pose retirée avant de rendre la main.
import { Board } from './board.js';
import { BALANCE } from '../data/balance.js';
import { STORY } from '../data/story.js';
import { neighbors, key } from './hex.js';
import { transition } from './seasons.js';

const F = BALANCE.fauna;
const nomAnimal = (sp) => ((STORY.fauna[sp] || {}).name || sp).toLowerCase();
const nomTuile = (f) => ((STORY.tiles[f] || {}).name || f).toLowerCase();

/** Cases vides autour d'une région (les mêmes que celles de la fermeture, dans rules.js). */
function casesOuvertes(board, reg) {
  const open = new Set();
  for (const t of reg.cells) for (const [a, b] of neighbors(t.q, t.r)) if (board.isEmpty(a, b)) open.add(key(a, b));
  return open.size;
}

/**
 * L'habitat que la région de la tuile posée est à une tuile d'offrir : « encore une forêt : un élan ».
 * On ne regarde que la région de la tuile posée et les seuils de BALANCE.fauna.
 */
function habitatProche(board, q, r, fam) {
  const reg = board.region(q, r, fam); if (!reg) return null;
  const n = reg.size;
  if (fam === 'meadow') {
    const vivantes = reg.cells.filter((c) => !c.dry).length;
    if (vivantes === F.rabbit - 1) return `encore une prairie : un ${nomAnimal('rabbit')}`;
    if (vivantes === F.cow - 1 && board.regionTouches(reg, 'heath')) return `encore une prairie : une ${nomAnimal('cow')}`;
  }
  if (fam === 'forest') {
    if (n === F.moose - 1) return `encore une forêt : un ${nomAnimal('moose')}`;
    if (n === F.bear - 1 && board.regionTouches(reg, 'rock')) return `encore une forêt : un ${nomAnimal('bear')}`;
    if (n >= F.bear && !board.regionTouches(reg, 'rock') && n < F.moose) return `une roche contre cette forêt : un ${nomAnimal('bear')}`;
  }
  if (fam === 'water' && n === F.duck - 1) return `encore une eau : des ${nomAnimal('duck')}s`;
  if (fam === 'hamlet') { const champs = board.regionNeighbors(reg).filter((t) => Board.isFamily(t, 'field')).length; if (champs === F.chicken - 1) return `encore un champ contre ce hameau : des ${nomAnimal('chicken')}s`; }
  if (fam === 'field') { for (const [a, b] of neighbors(q, r)) { const h = board.get(a, b); if (!h || !Board.isFamily(h, 'hamlet')) continue; const hr = board.region(a, b, 'hamlet'); const champs = board.regionNeighbors(hr).filter((t) => Board.isFamily(t, 'field')).length; if (champs === F.chicken - 1) return `encore un champ contre ce hameau : des ${nomAnimal('chicken')}s`; } }
  if (fam === 'hill' && n === F.horse - 1 && board.regionTouches(reg, 'meadow')) return `encore une colline : un ${nomAnimal('horse')}`;
  return null;
}

/**
 * @param {Board} board le plateau de l'île
 * @param {number} q @param {number} r la case visée
 * @param {object} tile la tuile qu'on poserait
 * @param {object} ctx { annonce: {season, rule}|null, climate }
 * @returns {string|null} la ligne, ou rien s'il n'y a rien d'utile à dire
 */
export function ligneAvenir(board, q, r, tile, ctx = {}) {
  if (!tile || tile.rare || !board.canPlace(q, r)) return null;
  return board.simulate(() => {
    const placed = board.place(q, r, tile);
    try {
      const fam = placed.family;
      // 1. la région à une case de se fermer (pas déjà close : ce serait une fermeture, dite ailleurs)
      const reg = board.region(q, r, fam);
      if (reg && !board.regionPaid(reg) && reg.size >= 2 && casesOuvertes(board, reg) === 1) return `encore une case : une région de ${reg.size} ${nomTuile(fam)}${reg.size > 1 ? 's' : ''} se ferme`;
      // 2. l'habitat presque prêt
      const h = habitatProche(board, q, r, fam); if (h) return h;
      // 3. la tuile menacée par la saison annoncée (jouée sur une copie du plateau)
      const a = ctx.annonce;
      if (a) {
        const copie = new Board(new Set(board.mask)); copie.restore(board.snapshot());
        for (const e of transition(copie, a.season, a.rule, ctx.climate || null)) if (e.q === q && e.r === r && (e.type === 'dry' || (typeof e.pts === 'number' && e.pts < 0))) {
          const sn = ((STORY.seasons[a.season] || {}).name || a.season).toLowerCase();
          return e.type === 'dry' ? `l’${sn} qui vient la sèchera` : `l’${sn} qui vient lui coûtera des points`;
        }
      }
      return null;
    } finally { board.tiles.delete(key(q, r)); }
  });
}
