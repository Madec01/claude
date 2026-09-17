// Cartes de la passe (monde logique 1280×720). Les terres sont des cercles (collision + rendu par îlots).
// entries : points d'apparition hors écran + cap initial + cible de dérive (là où le courant pousse un navire sans route).

export const MAPS = {
  // Acte I — la passe des Loups : phare au centre, port sur la côte est.
  loups: {
    id: 'loups',
    name: 'La passe des Loups',
    lighthouse: { x: 620, y: 372 },
    port: { x: 1128, y: 350, angle: Math.PI, zone: 64, dockX: 1160 },
    land: [
      // côte est (port)
      { x: 1270, y: 200, r: 150, grass: true }, { x: 1275, y: 360, r: 132, grass: true }, { x: 1290, y: 520, r: 150, grass: true },
      { x: 1250, y: 80, r: 120, grass: true },
      // île du nord-ouest
      { x: 190, y: 90, r: 118, grass: true }, { x: 300, y: 40, r: 90, grass: false },
      // banc du sud
      { x: 420, y: 700, r: 96, grass: false }, { x: 560, y: 740, r: 90, grass: false },
      // îlot du phare
      { x: 620, y: 372, r: 44, grass: false, islet: true },
    ],
    plants: [ { x: 160, y: 70, k: 1 }, { x: 240, y: 120, k: 2 }, { x: 1240, y: 240, k: 1 }, { x: 1250, y: 480, k: 3 }, { x: 1230, y: 560, k: 2 } ],
    rocks: [
      { x: 470, y: 300, r: 18 }, { x: 800, y: 250, r: 22 }, { x: 870, y: 470, r: 20 },
      { x: 400, y: 470, r: 16 }, { x: 980, y: 300, r: 17 }, { x: 740, y: 560, r: 19 },
      { x: 300, y: 320, r: 15 }, { x: 960, y: 560, r: 21 }, { x: 560, y: 190, r: 16 },
      { x: 1010, y: 420, r: 15 },
    ],
    entries: [
      { id: 'ouest', x: -50, y: 300, heading: 0, drift: { x: 470, y: 300 } },
      { id: 'ouest2', x: -50, y: 520, heading: -0.35, drift: { x: 400, y: 470 } },
      { id: 'nord', x: 520, y: -50, heading: Math.PI / 2, drift: { x: 560, y: 190 } },
      { id: 'nord2', x: 800, y: -50, heading: Math.PI / 2 + 0.2, drift: { x: 800, y: 250 } },
      { id: 'sud', x: 760, y: 770, heading: -Math.PI / 2, drift: { x: 740, y: 560 } },
      { id: 'sud2', x: 980, y: 770, heading: -Math.PI / 2 - 0.2, drift: { x: 960, y: 560 } },
    ],
    pageZones: [ { x: 380, y: 380, r: 90 }, { x: 860, y: 620, r: 80 }, { x: 900, y: 140, r: 80 }, { x: 520, y: 560, r: 70 } ],
  },

  // Acte II — l'anse de Kerdan : port au nord, phare décalé, chenal étroit à l'ouest.
  kerdan: {
    id: 'kerdan',
    name: 'L’anse de Kerdan',
    lighthouse: { x: 560, y: 430 },
    port: { x: 700, y: 118, angle: -Math.PI / 2, zone: 64, dockX: 700, dockY: 84 },
    land: [
      // côte nord (port)
      { x: 560, y: -40, r: 150, grass: true }, { x: 720, y: -50, r: 150, grass: true }, { x: 880, y: -30, r: 120, grass: true }, { x: 400, y: -60, r: 120, grass: true },
      // pointe est
      { x: 1290, y: 300, r: 140, grass: true }, { x: 1300, y: 460, r: 130, grass: true },
      // récif sud-ouest
      { x: 80, y: 690, r: 130, grass: false }, { x: 250, y: 740, r: 100, grass: false },
      { x: 560, y: 430, r: 44, grass: false, islet: true },
    ],
    plants: [ { x: 600, y: 60, k: 2 }, { x: 800, y: 50, k: 1 }, { x: 1230, y: 340, k: 3 }, { x: 120, y: 640, k: 1 } ],
    rocks: [
      { x: 330, y: 250, r: 18 }, { x: 460, y: 170, r: 17, tide: 'emerge' }, { x: 640, y: 260, r: 19, tide: 'submerge' },
      { x: 820, y: 220, r: 20, tide: 'emerge' }, { x: 960, y: 330, r: 22 }, { x: 1040, y: 520, r: 18, tide: 'submerge' },
      { x: 820, y: 560, r: 21, tide: 'submerge' }, { x: 400, y: 560, r: 17 }, { x: 250, y: 420, r: 16, tide: 'emerge' },
      { x: 700, y: 420, r: 15, tide: 'submerge' }, { x: 880, y: 400, r: 16 }, { x: 560, y: 620, r: 19, tide: 'emerge' },
    ],
    wrecks: [ { x: 700, y: 640, r: 26 }, { x: 1080, y: 180, r: 22 } ],
    entries: [
      { id: 'ouest', x: -50, y: 340, heading: 0, drift: { x: 330, y: 250 } },
      { id: 'ouest2', x: -50, y: 520, heading: 0.2, drift: { x: 400, y: 560 } },
      { id: 'sud', x: 600, y: 770, heading: -Math.PI / 2, drift: { x: 560, y: 620 } },
      { id: 'sud2', x: 900, y: 770, heading: -Math.PI / 2 - 0.3, drift: { x: 820, y: 560 } },
      { id: 'est', x: 1330, y: 620, heading: Math.PI - 0.3, drift: { x: 1040, y: 520 } },
      { id: 'est2', x: 1330, y: 160, heading: Math.PI, drift: { x: 960, y: 330 } },
    ],
    pageZones: [ { x: 300, y: 330, r: 80 }, { x: 900, y: 480, r: 80 }, { x: 460, y: 640, r: 70 }, { x: 1000, y: 260, r: 70 } ],
  },

  // Acte III — le Goulet : port au sud-ouest, phare au centre, la Bête rôde à l'est.
  goulet: {
    id: 'goulet',
    name: 'Le Goulet',
    lighthouse: { x: 660, y: 340 },
    port: { x: 200, y: 590, angle: Math.PI / 2 + 0.6, zone: 66, dockX: 170, dockY: 630 },
    land: [
      // côte sud-ouest (port)
      { x: 60, y: 720, r: 150, grass: true }, { x: 220, y: 740, r: 130, grass: true }, { x: -30, y: 560, r: 120, grass: true },
      // falaises nord
      { x: 200, y: -60, r: 140, grass: true }, { x: 360, y: -80, r: 120, grass: true },
      { x: 1100, y: -70, r: 150, grass: true }, { x: 1280, y: -30, r: 140, grass: true },
      // pointe est
      { x: 1330, y: 400, r: 120, grass: false },
      // banc sud-est
      { x: 900, y: 760, r: 110, grass: false }, { x: 1080, y: 740, r: 100, grass: false },
      { x: 660, y: 340, r: 46, grass: false, islet: true },
    ],
    plants: [ { x: 90, y: 650, k: 2 }, { x: 250, y: 680, k: 1 }, { x: 1120, y: 40, k: 3 }, { x: 240, y: 30, k: 2 } ],
    rocks: [
      { x: 420, y: 220, r: 18 }, { x: 540, y: 520, r: 20, tide: 'submerge' }, { x: 300, y: 420, r: 17 },
      { x: 880, y: 200, r: 21, tide: 'emerge' }, { x: 960, y: 420, r: 19 }, { x: 800, y: 560, r: 18, tide: 'submerge' },
      { x: 460, y: 620, r: 22, tide: 'emerge' }, { x: 1100, y: 300, r: 17 }, { x: 640, y: 160, r: 16, tide: 'submerge' },
      { x: 380, y: 340, r: 15, tide: 'emerge' }, { x: 1150, y: 560, r: 20 }, { x: 720, y: 640, r: 17 }, { x: 560, y: 60, r: 18 },
    ],
    wrecks: [ { x: 1000, y: 620, r: 26 }, { x: 460, y: 120, r: 24 }, { x: 1200, y: 180, r: 22 } ],
    entries: [
      { id: 'est', x: 1330, y: 260, heading: Math.PI, drift: { x: 1100, y: 300 } },
      { id: 'est2', x: 1330, y: 520, heading: Math.PI + 0.2, drift: { x: 1150, y: 560 } },
      { id: 'nord', x: 720, y: -50, heading: Math.PI / 2, drift: { x: 640, y: 160 } },
      { id: 'nord2', x: 500, y: -50, heading: Math.PI / 2 - 0.2, drift: { x: 420, y: 220 } },
      { id: 'sud', x: 640, y: 770, heading: -Math.PI / 2, drift: { x: 720, y: 640 } },
      { id: 'ouest', x: -50, y: 300, heading: 0, drift: { x: 300, y: 420 } },
    ],
    pageZones: [ { x: 900, y: 300, r: 80 }, { x: 500, y: 460, r: 80 }, { x: 1000, y: 520, r: 70 }, { x: 350, y: 220, r: 70 } ],
  },
};
