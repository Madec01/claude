// Constantes d'équilibrage de « Cent Saisons ».
export const BALANCE = {
  world: { w: 1280, h: 720 },
  hex: { w: 120, h: 140, rowH: 103.92, size: 69.28 },   // géométrie 1× (les images sont en 2×)
  season: { baseLength: 12 },
  points: { springHeath: 1, pathSeason: 1, stormRiver: 2, windMill: 3,
    closeBonusMul: { hamlet: 2 },      // prime de fermeture = taille × mul (1 par défaut)
    river: 2, pond: 1, lake: 1, mouth: 3, pondSeason: 1, springWater: 1, summerIrrigation: 1, springMarsh: 2, autumnHarvest: 2, winterVeillee: 3,
    faunaSeason: 3, wish: 10,
  },
  breaths: { swap: 1, discard: 2, bud: 3, undo: [4, 3, 2], close: 1, faunaSeason: 1, wish: 2, start: [0, 2, 4, 6], build: 1 },
  // bâtir : poser une tuile sur une tuile de même famille la monte de niveau (bords +1, compte double dans sa région) ;
  // une tuile bien bâtie (région close, en saison, ou bien entourée) revient dans la file, au plus une fois par saison
  works: { from: 7, everyPlacements: 16, wishChance: 0.35 },   // ouvrages : une tuile bonus toutes les 16 poses et parfois en récompense de vœu, dès l'île 7
  fusion: { cost: 1, bonus: 1 },   // fusion : même geste que bâtir ; +1 point à la fusion (le gain vient des bords, des fermetures et des primes de saison), une découverte rend une tuile et une rare
  build: { maxLevel: 3, level3From: 10, cost: 1, cost3: 2, matureSeasons: 1, level3Season: 1, neighborsForRefund: 4, refundsPerSeason: 1, season: { meadow: 'spring', marsh: 'spring', heath: 'spring', field: 'summer', sand: 'summer', forest: 'autumn', orchard: 'autumn', hill: 'autumn', hamlet: 'winter', water: 'winter', rock: 'winter' } },
  fauna: { rabbit: 3, moose: 5, duck: 3, bear: 3, frog: 1, owl: 1, penguin: 4, chicken: 2, horse: 2, cow: 2 },
  queue: { visible: [3, 4, 5], pocket: [0, 1, 2], seasonExtra: [0, 1, 2] },
  upgrades: { source: [0, 1], refuge: [0, 1, 2], almanac: [0, 1, 2] },   // bonus de l'Atelier : rivière, faune, graines
  stars: { perCell: [3.6, 5.2, 6.5] },   // seuils par défaut (Île du jour) = cases × facteur ; les îles de campagne ont leurs `starFactors` calibrés (la 3e étoile exige aussi tous les vœux)
  seeds: { star: 1, wish: 1, island: 2 },
  camera: { minZoom: 0.45, maxZoom: 1.6, lerp: 6 },
  infinite: { growEvery: 1, growCells: 6, maxCells: 400 },
};
