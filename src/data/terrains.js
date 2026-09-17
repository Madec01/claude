// Terrains du village : sol, zones de friction, pentes, obstacles, décor.
// Coordonnées en mètres (x : 0..15 le long du terrain, z : 0..4 en travers). Le décor est en pixels écran.

export const TERRAINS = {
  place: {
    id: 'place', name: 'La place des Platanes', surface: 'gravel', ground: 'ground_gravel',
    ambience: 'day', sky: 'day',
    zones: [ { x: 9, z: 0.6, r: 1.2, surface: 'packed' }, { x: 5, z: 3.4, r: 0.9, surface: 'packed' } ],
    slopes: [ { x: 11, z: 3.2, r: 1.6, dx: -0.02, dz: 0.03 } ],
    obstacles: [ { x: 7.4, z: 0.7, r: 0.12, type: 'stone' }, { x: 10.2, z: 3.3, r: 0.12, type: 'stone' } ],
    decor: { canopies: [ { x: 220, y: 150, s: 1.15 }, { x: 640, y: 120, s: 1.3 }, { x: 1060, y: 150, s: 1.1 } ], terrace: 'top', fountain: { x: 1150, y: 660 }, benches: [ { x: 420, y: 650 }, { x: 760, y: 650 } ], spectators: 6 },
  },
  bar: {
    id: 'bar', name: 'Le boulodrome du Bar des Sports', surface: 'packed', ground: 'ground_gravel',
    ambience: 'day', sky: 'day',
    zones: [ { x: 12, z: 2, r: 1.4, surface: 'gravel' } ],
    slopes: [ { x: 4.5, z: 2, r: 2.2, dx: 0.02, dz: 0 }, { x: 13.5, z: 1, r: 1.2, dx: 0, dz: -0.03 } ],
    obstacles: [ { x: 8.8, z: 2.1, r: 0.1, type: 'stone' } ],
    decor: { canopies: [ { x: 160, y: 130, s: 1.0 }, { x: 1120, y: 130, s: 1.0 } ], terrace: 'top', tables: [ { x: 520, y: 120 }, { x: 700, y: 110 }, { x: 880, y: 125 } ], parasols: [ { x: 610, y: 100 }, { x: 800, y: 100 } ], benches: [ { x: 300, y: 655 }, { x: 980, y: 655 } ], spectators: 8 },
  },
  plage: {
    id: 'plage', name: 'La plage des Salins', surface: 'sand', ground: 'ground_beige_white',
    ambience: 'beach', sky: 'beach',
    zones: [ { x: 8, z: 3.2, r: 1.6, surface: 'packed' }, { x: 12.5, z: 1, r: 1.3, surface: 'packed' } ],
    slopes: [ { x: 7, z: 0.5, r: 2.5, dx: 0, dz: 0.04 } ],
    obstacles: [ { x: 6.2, z: 1.4, r: 0.14, type: 'stone' }, { x: 11, z: 2.8, r: 0.16, type: 'stone' } ],
    decor: { canopies: [ { x: 300, y: 120, s: 0.9, pine: true }, { x: 1000, y: 110, s: 0.95, pine: true } ], parasols: [ { x: 500, y: 660 }, { x: 900, y: 660 } ], towels: true, spectators: 5 },
  },
  clairiere: {
    id: 'clairiere', name: 'La clairière des pins', surface: 'dirt', ground: 'ground_grass_mown',
    ambience: 'forest', sky: 'forest',
    zones: [ { x: 6, z: 2, r: 1.6, surface: 'packed' }, { x: 10.5, z: 2.6, r: 1.2, surface: 'grass' } ],
    slopes: [ { x: 9, z: 1, r: 2, dx: -0.03, dz: 0.02 }, { x: 13, z: 3, r: 1.5, dx: 0.02, dz: -0.02 } ],
    obstacles: [ { x: 4.6, z: 1.2, r: 0.2, type: 'root' }, { x: 8.2, z: 3.1, r: 0.22, type: 'root' }, { x: 9.6, z: 0.6, r: 0.1, type: 'pinecone' }, { x: 11.8, z: 1.9, r: 0.1, type: 'pinecone' }, { x: 7, z: 2.3, r: 0.12, type: 'stone' } ],
    decor: { canopies: [ { x: 140, y: 120, s: 1.2, pine: true }, { x: 480, y: 90, s: 1.4, pine: true }, { x: 860, y: 110, s: 1.3, pine: true }, { x: 1180, y: 130, s: 1.1, pine: true }, { x: 300, y: 690, s: 1.2, pine: true }, { x: 1000, y: 690, s: 1.3, pine: true } ], spectators: 4 },
  },
  parking: {
    id: 'parking', name: 'Le parking du garage Ferrer', surface: 'tarmac', ground: 'ground_tarmac',
    ambience: 'day', sky: 'day',
    zones: [ { x: 10, z: 2, r: 1.5, surface: 'gravel' } ],
    slopes: [ { x: 7.5, z: 2, r: 3, dx: 0, dz: 0.025 } ],
    obstacles: [ { x: 5.5, z: 3.3, r: 0.12, type: 'stone' }, { x: 12.5, z: 0.8, r: 0.12, type: 'stone' } ],
    decor: { cars: [ { x: 250, y: 130, k: 1 }, { x: 480, y: 120, k: 2 }, { x: 1080, y: 135, k: 3 } ], crates: [ { x: 760, y: 130 }, { x: 820, y: 120 } ], benches: [ { x: 640, y: 655 } ], spectators: 5 },
  },
  nuit: {
    id: 'nuit', name: 'La place, de nuit, sous les lampions', surface: 'gravel', ground: 'ground_gravel',
    ambience: 'night', sky: 'night',
    zones: [ { x: 9, z: 0.6, r: 1.2, surface: 'packed' }, { x: 5, z: 3.4, r: 0.9, surface: 'packed' }, { x: 12.5, z: 2.5, r: 1.0, surface: 'sand' } ],
    slopes: [ { x: 11, z: 3.2, r: 1.6, dx: -0.02, dz: 0.03 }, { x: 4, z: 1, r: 1.4, dx: 0.02, dz: -0.02 } ],
    obstacles: [ { x: 7.4, z: 0.7, r: 0.12, type: 'stone' }, { x: 10.2, z: 3.3, r: 0.12, type: 'stone' }, { x: 6.5, z: 2.6, r: 0.1, type: 'stone' } ],
    decor: { canopies: [ { x: 220, y: 150, s: 1.15 }, { x: 640, y: 120, s: 1.3 }, { x: 1060, y: 150, s: 1.1 } ], terrace: 'top', fountain: { x: 1150, y: 660 }, benches: [ { x: 420, y: 650 }, { x: 760, y: 650 } ], lanterns: true, spectators: 10 },
  },
};
