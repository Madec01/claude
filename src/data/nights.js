// Définition des 12 nuits de la campagne et du mode Veille infinie.
// Les plans d'apparition sont générés de façon déterministe (RNG seedé) à partir de paramètres lisibles.
import { RNG } from '../core/math.js';

/**
 * Génère un plan d'apparition.
 * @param {object} o { seed, count, duration, types:{dinghy,cutter,tall} (poids), entries:[ids], lead: délai avant le premier, spike: {at:0..1, n} pic de tension }
 */
function plan(o) {
  const rng = new RNG(o.seed);
  const spawns = [];
  const typeKeys = Object.keys(o.types);
  const weights = typeKeys.map((k) => o.types[k]);
  const pickType = () => { let r = rng.next() * weights.reduce((a, b) => a + b, 0); for (let i = 0; i < typeKeys.length; i++) { r -= weights[i]; if (r <= 0) return typeKeys[i]; } return typeKeys[0]; };
  const lead = o.lead ?? 4;
  const last = o.duration - (o.tail ?? 45);
  const n = o.count;
  const spikeN = o.spike ? o.spike.n : 0;
  const regular = n - spikeN;
  // navires réguliers répartis avec un léger aléa
  for (let i = 0; i < regular; i++) {
    const t = regular === 1 ? lead : lead + ((last - lead) * i) / (regular - 1) + rng.range(-3, 3);
    spawns.push({ t: Math.max(1, t), type: pickType(), entry: rng.pick(o.entries), color: rng.int(0, 5) });
  }
  if (o.spike) {
    const t0 = lead + (last - lead) * o.spike.at;
    for (let i = 0; i < spikeN; i++) spawns.push({ t: t0 + i * 2.2, type: pickType(), entry: o.entries[(i + rng.int(0, 9)) % o.entries.length], color: rng.int(0, 5) });
  }
  if (o.extra) spawns.push(...o.extra);
  spawns.sort((a, b) => a.t - b.t);
  return spawns;
}

const base = {
  duration: 150, quota: 3, maxWrecks: 3, fog: 0.82, rain: 0, wind: 0,
  mechanics: { horn: true, anchor: true, pages: false, tide: false, storm: false, beast: false, oil: false },
  pages: 0, beasts: 0, ambience: { wind: 0.25, rain: 0, storm: 0 },
};

export const NIGHTS = [
  { id: 1, map: 'loups', act: 1, music: 'act1', ...base,
    duration: 120, quota: 2, fog: 0.74,
    mechanics: { ...base.mechanics, horn: false, anchor: false },
    spawns: plan({ seed: 101, count: 2, duration: 120, types: { cutter: 1 }, entries: ['ouest', 'ouest2'], lead: 5, tail: 60 }),
  },
  { id: 2, map: 'loups', act: 1, music: 'act1', ...base,
    duration: 140, quota: 3, fog: 0.78,
    mechanics: { ...base.mechanics, anchor: false },
    spawns: plan({ seed: 202, count: 5, duration: 140, types: { dinghy: 3, cutter: 1 }, entries: ['ouest', 'nord', 'ouest2'], lead: 4, spike: { at: 0.55, n: 2 } }),
  },
  { id: 3, map: 'loups', act: 1, music: 'act1', ...base,
    duration: 150, quota: 4, fog: 0.82,
    spawns: plan({ seed: 303, count: 6, duration: 150, types: { dinghy: 1, cutter: 2 }, entries: ['ouest', 'nord', 'sud', 'nord2'], lead: 4, spike: { at: 0.3, n: 3 } }),
    extraRocks: [ { x: 700, y: 330, r: 17 }, { x: 640, y: 480, r: 16 } ],
  },
  { id: 4, map: 'loups', act: 1, music: 'act1', ...base,
    duration: 160, quota: 4, fog: 0.84, pages: 2,
    mechanics: { ...base.mechanics, pages: true },
    spawns: plan({ seed: 404, count: 7, duration: 160, types: { dinghy: 2, cutter: 2 }, entries: ['ouest', 'nord', 'sud', 'nord2', 'sud2'], lead: 4, spike: { at: 0.6, n: 3 } }),
    extraRocks: [ { x: 700, y: 330, r: 17 }, { x: 640, y: 480, r: 16 }, { x: 860, y: 350, r: 15 } ],
  },
  { id: 5, map: 'kerdan', act: 2, music: 'act2', ...base,
    duration: 170, quota: 5, fog: 0.84, pages: 2,
    mechanics: { ...base.mechanics, pages: true, tide: true },
    spawns: plan({ seed: 505, count: 8, duration: 170, types: { dinghy: 2, cutter: 2 }, entries: ['ouest', 'sud', 'est', 'ouest2', 'sud2'], lead: 4, spike: { at: 0.5, n: 3 } }),
  },
  { id: 6, map: 'kerdan', act: 2, music: 'act2', ...base,
    duration: 170, quota: 5, fog: 0.8, rain: 1, wind: 1, pages: 2,
    mechanics: { ...base.mechanics, pages: true, tide: true, storm: true },
    ambience: { wind: 0.7, rain: 0.6, storm: 0.5 },
    spawns: plan({ seed: 606, count: 8, duration: 170, types: { dinghy: 1, cutter: 3 }, entries: ['ouest', 'sud', 'est', 'ouest2', 'est2'], lead: 4, spike: { at: 0.4, n: 3 } }),
  },
  { id: 7, map: 'kerdan', act: 2, music: 'act2', ...base,
    duration: 180, quota: 6, fog: 0.86, pages: 2,
    mechanics: { ...base.mechanics, pages: true, tide: true },
    spawns: plan({ seed: 707, count: 9, duration: 180, types: { dinghy: 2, cutter: 2, tall: 1 }, entries: ['ouest', 'sud', 'est', 'ouest2', 'sud2', 'est2'], lead: 4, spike: { at: 0.55, n: 3 },
      extra: [ { t: 40, type: 'tall', entry: 'ouest', color: 4 } ] }),
  },
  { id: 8, map: 'kerdan', act: 2, music: 'act2', ...base,
    duration: 190, quota: 6, fog: 0.88, rain: 0.5, wind: 0.6, pages: 2,
    mechanics: { ...base.mechanics, pages: true, tide: true, storm: true },
    ambience: { wind: 0.5, rain: 0.3, storm: 0.2 },
    spawns: plan({ seed: 808, count: 11, duration: 190, types: { dinghy: 2, cutter: 3, tall: 1 }, entries: ['ouest', 'sud', 'est', 'ouest2', 'sud2', 'est2'], lead: 3, spike: { at: 0.62, n: 4 } }),
  },
  { id: 9, map: 'goulet', act: 3, music: 'act3', ...base,
    duration: 180, quota: 5, fog: 0.88, pages: 2, beasts: 1,
    mechanics: { ...base.mechanics, pages: true, tide: true, beast: true },
    spawns: plan({ seed: 909, count: 9, duration: 180, types: { dinghy: 2, cutter: 3, tall: 1 }, entries: ['est', 'nord', 'sud', 'est2', 'nord2'], lead: 4, spike: { at: 0.5, n: 3 } }),
  },
  { id: 10, map: 'goulet', act: 3, music: 'act3', ...base,
    duration: 190, quota: 6, fog: 0.88, pages: 2, beasts: 1,
    mechanics: { ...base.mechanics, pages: true, tide: true, beast: true, oil: true },
    spawns: plan({ seed: 1010, count: 10, duration: 190, types: { dinghy: 2, cutter: 3, tall: 1 }, entries: ['est', 'nord', 'sud', 'est2', 'nord2', 'ouest'], lead: 4, spike: { at: 0.45, n: 3 } }),
  },
  { id: 11, map: 'goulet', act: 3, music: 'act3', ...base,
    duration: 200, quota: 7, fog: 0.9, rain: 0.8, wind: 0.9, pages: 2, beasts: 2,
    mechanics: { ...base.mechanics, pages: true, tide: true, storm: true, beast: true, oil: true },
    ambience: { wind: 0.7, rain: 0.5, storm: 0.5 },
    spawns: plan({ seed: 1111, count: 12, duration: 200, types: { dinghy: 2, cutter: 3, tall: 2 }, entries: ['est', 'nord', 'sud', 'est2', 'nord2', 'ouest'], lead: 3, spike: { at: 0.55, n: 4 } }),
  },
  { id: 12, map: 'goulet', act: 3, music: 'finale', ...base,
    duration: 210, quota: 6, fog: 0.92, rain: 0.4, wind: 0.5, pages: 2, beasts: 2, finale: true,
    mechanics: { ...base.mechanics, pages: true, tide: true, storm: true, beast: true, oil: true },
    ambience: { wind: 0.6, rain: 0.3, storm: 0.3 },
    spawns: plan({ seed: 1212, count: 9, duration: 210, types: { dinghy: 2, cutter: 3, tall: 1 }, entries: ['est', 'nord', 'sud', 'est2', 'nord2', 'ouest'], lead: 4, tail: 80, spike: { at: 0.4, n: 3 },
      extra: [ { t: 132, type: 'yann', entry: 'est', color: 4, required: true } ] }),
  },
];

export const getNight = (id) => NIGHTS.find((n) => n.id === id);

/** Paramètres de la Veille infinie (les vagues sont générées à la volée par night.js). */
export const INFINITE = {
  id: 'infinite', map: 'goulet', act: 3, music: 'act3', duration: Infinity, quota: Infinity, maxWrecks: 3,
  fog: 0.86, rain: 0, wind: 0, pages: 2, beasts: 0,
  mechanics: { horn: true, anchor: true, pages: true, tide: true, storm: true, beast: true, oil: true },
  ambience: { wind: 0.4, rain: 0, storm: 0 },
  spawns: [],
};
