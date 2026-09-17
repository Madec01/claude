// Constantes d'équilibrage de « Cent Saisons ».
export const BALANCE = {
  world: { w: 1280, h: 720 },
  hex: { w: 120, h: 140, rowH: 103.92, size: 69.28 },   // géométrie 1× (les images sont en 2×)
  season: { baseLength: 12 },
  points: {
    closeBonusMul: { hamlet: 2 },      // prime de fermeture = taille × mul (1 par défaut)
    river: 2, pond: 0, springWater: 1, summerIrrigation: 1, springMarsh: 2, autumnHarvest: 2, winterVeillee: 3,
    faunaSeason: 3, wish: 10,
  },
  breaths: { swap: 1, discard: 2, bud: 3, undo: [4, 3, 2], faunaSeason: 1, wish: 2, start: [0, 2, 4, 6] },
  fauna: { rabbit: 3, moose: 5, duck: 3, bear: 3, frog: 1, owl: 1, penguin: 4 },
  queue: { visible: [3, 4, 5], pocket: [0, 1, 2], seasonExtra: [0, 1, 2] },
  stars: { perCell: [3.2, 5.6, 8.2] },   // seuils = cases × facteur (la 3e étoile exige aussi tous les vœux)
  seeds: { star: 1, wish: 1, island: 2 },
  camera: { minZoom: 0.45, maxZoom: 1.6, lerp: 6 },
  infinite: { growEvery: 1, growCells: 6, maxCells: 400 },
};
