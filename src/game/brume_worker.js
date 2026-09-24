// Sous la brume : la préparation de l'île (la brume, les tuiles cachées, le dosage par le solveur) tourne ici, hors du
// fil principal. À un tiers de brume, le solveur prend une à quatre secondes sur un ordinateur, plus au téléphone : le
// jeu ne doit pas geler. L'île est construite entière (même code que la partie), et seul le plan repart.
import { Island } from './island.js';

onmessage = (e) => {
  const { def } = e.data || {};
  try {
    const isl = new Island(def);
    const B = isl.brume;
    postMessage(B ? { fog: [...isl.board.fog], cachees: [...B.cachees.entries()].map(([k, t]) => [k, { ...t }]), deduc: B.deduc } : null);
  } catch (err) {
    postMessage({ erreur: String((err && err.message) || err) });
  }
};
