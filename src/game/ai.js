// IA des adversaires : échantillonne des lancers candidats, les simule avec la vraie physique, évalue la mène qui en
// résulte (en moyenne sur plusieurs erreurs), choisit selon son caractère, puis exécute avec ses vrais défauts.
import { BALANCE } from '../data/balance.js';
import { countPoints, ballDist } from './physics.js';
import { solveThrow, simulateThrow, applyError, throwOrigin } from './throw.js';
import { RNG, clamp, TAU } from '../core/math.js';

const F = BALANCE.field;

/** Valeur d'une situation pour `me` : points tenus (positifs) ou concédés (négatifs), marge de distance. */
function evaluate(balls, jack, me, boulesLeft) {
  if (!jack.alive) return -0.5; // mène annulée : neutre-négatif
  const c = countPoints(balls, jack);
  if (c.owner === -1) return 0;
  const sign = c.owner === me ? 1 : -1;
  let v = sign * c.points;
  // marge : plus la meilleure boule adverse est loin de la nôtre, mieux c'est
  const mine = c.best[me], theirs = c.best[1 - me];
  if (Number.isFinite(mine) && Number.isFinite(theirs)) v += clamp((theirs - mine) * 1.5, -1.2, 1.2);
  else if (Number.isFinite(mine)) v += 0.8;
  // si je n'ai plus de boules, les points concédés comptent double (rien à rattraper)
  if (boulesLeft[me] === 0 && sign < 0) v *= 1.4;
  return v;
}

export class Opponent {
  constructor(profile, seed = 1) {
    this.p = profile;
    this.rng = new RNG(seed);
    this.lastDecision = null;
  }

  /** Erreur réelle de l'adversaire pour un type de lancer (r de la jauge, latéral). */
  sampleError(type) {
    const acc = type === 'shoot' ? this.p.shootAcc : type === 'lob' ? (this.p.pointAcc * 0.6 + this.p.lobSkill * 0.4) : this.p.pointAcc;
    const sigma = (1 - acc) * 0.9 + 0.04;
    const gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += this.rng.next(); return (s - 2) * 1.2; };
    return { r: clamp(gauss() * sigma, -1, 1), side: clamp(gauss() * 0.9, -1, 1) };
  }

  /** Où lancer le cochonnet : entre 6 et 10 m, selon le goût pour les terrains difficiles. */
  chooseJack(field, dirSign, terrainDifficultyAt) {
    const origin = throwOrigin(dirSign);
    let best = null;
    for (let i = 0; i < 14; i++) {
      const d = F.jackMin + 0.4 + this.rng.next() * (F.jackMax - F.jackMin - 0.8);
      const z = 0.6 + this.rng.next() * (F.width - 1.2);
      const x = origin.x + dirSign * d;
      const diff = terrainDifficultyAt(x, z);
      // les pointeurs patients aiment le terrain propre ; les roublards aiment les bosses
      const score = (this.p.patience > 0.6 ? -diff : diff) * 0.5 + this.rng.next() * 0.3 + (this.p.favorite === 'lob' ? d * 0.05 : -d * 0.02);
      if (!best || score > best.score) best = { x, z, score };
    }
    return { x: best.x, z: best.z };
  }

  /**
   * Choisit un lancer.
   * @returns {{type, target, params, kind:'point'|'shoot', expected:number, victim?}}
   */
  decide(field, balls, jack, me, boulesLeft, dirSign, available, ballDef) {
    const origin = throwOrigin(dirSign);
    const candidates = [];
    const p = this.p;
    const samples = BALANCE.ai.samples;
    const ev = (type, target, spinV = 0) => {
      const base = solveThrow(field, origin, type, target, ballDef, spinV);
      let sum = 0;
      const errs = [{ r: 0, side: 0 }, { r: 0.45, side: 0.6 }, { r: -0.45, side: -0.6 }].slice(0, samples);
      const acc = type === 'shoot' ? p.shootAcc : p.pointAcc;
      const scale = (1 - acc) * 1.3 + 0.1;
      for (const e of errs) {
        const params = applyError({ ...base, x0: origin.x, z0: origin.z, spin: spinV }, type, e.r * scale, 0, e.side * scale);
        const res = simulateThrow(field, balls, ballDef, params, type);
        const j = res.balls.find((b) => b.jack);
        const left = { ...boulesLeft }; left[me]--;
        sum += evaluate(res.balls, j, me, left);
      }
      return { type, target, base, expected: sum / errs.length };
    };

    // --- candidats « pointer » : autour du cochonnet, plutôt côté lanceur (devant) ---
    const pointTypes = ['point'];
    if (available.has('halflob')) pointTypes.push('halflob');
    if (available.has('lob') && p.lobSkill > 0.45) pointTypes.push('lob');
    const n = BALANCE.ai.candidates;
    for (let i = 0; i < n; i++) {
      const ang = this.rng.next() * TAU;
      const rad = 0.08 + this.rng.next() * 0.6;
      const tx = jack.x + Math.cos(ang) * rad, tz = jack.z + Math.sin(ang) * rad;
      if (!field.inBounds(tx, tz, -0.1)) continue;
      const type = pointTypes[Math.floor(this.rng.next() * pointTypes.length)];
      const spinV = available.has('spin') && this.rng.next() < 0.25 ? (this.rng.next() - 0.5) * 1.6 : 0;
      candidates.push({ ...ev(type, { x: tx, z: tz }, spinV), kind: 'point', spin: spinV });
    }
    // --- candidats « tirer » : chaque boule adverse vivante (surtout celles qui tiennent le point) ---
    if (available.has('shoot')) {
      const c = countPoints(balls, jack);
      for (const b of balls) {
        if (!b.alive || b.jack || b.owner === me) continue;
        const holds = c.owner === b.owner && ballDist(b, jack) <= c.best[b.owner] + 1e-6;
        const cand = { ...ev('shoot', { x: b.x, z: b.z }), kind: 'shoot', victim: b, holds };
        // caractère : l'agressivité pousse à tirer, la patience retient
        cand.expected += (holds ? 0.35 : -0.6) + (p.aggression - 0.5) * 1.1 + (p.favorite === 'shoot' ? 0.3 : 0);
        candidates.push(cand);
      }
      // tirer le cochonnet quand on est loin derrière dans la mène et qu'on n'a plus rien à perdre
      if (c.owner !== me && c.points >= 2 && boulesLeft[me] === 1 && p.aggression > 0.5) {
        const cand = { ...ev('shoot', { x: jack.x, z: jack.z }), kind: 'shoot', victim: jack, holds: false };
        cand.expected += 0.5;
        candidates.push(cand);
      }
    }
    if (!candidates.length) {
      const base = solveThrow(field, origin, 'point', { x: jack.x - dirSign * 0.3, z: jack.z }, ballDef);
      return { type: 'point', target: { x: jack.x, z: jack.z }, base, kind: 'point', expected: 0, spin: 0 };
    }
    // préférence de style : bonus léger pour le lancer favori
    for (const c of candidates) if (c.type === p.favorite) c.expected += 0.15;
    candidates.sort((a, b) => b.expected - a.expected);
    // un peu d'imprévisibilité : parfois le 2e ou 3e choix
    const pick = this.rng.next() < 0.75 ? 0 : Math.min(candidates.length - 1, 1 + Math.floor(this.rng.next() * 2));
    this.lastDecision = candidates[pick];
    return candidates[pick];
  }
}
