// Partie en cours, gardée sur l'appareil : on quitte l'application, on revient dix minutes plus tard, on reprend.
// C'est du navigateur uniquement (localStorage) : rien n'est envoyé en ligne, le budget d'écriture du nuage est intact.
const KEY = 'cent-saisons.run';
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;   // au-delà d'un mois, la partie en cours est oubliée

export const RunSave = {
  /** Range la partie en cours. `where` décrit l'île pour pouvoir la reconstruire : { kind, id, semis }. */
  write(where, isl, title) {
    if (!isl || isl.ended) return false;
    if (!isl.placements) return false;                 // rien de commencé : rien à garder
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, at: Date.now(), where, title: title || '', isl: isl.serialize() }));
      return true;
    } catch (e) { console.warn('partie en cours non gardée', e); return false; }
  },

  /** La partie en cours, ou null. Une partie trop vieille ou illisible est effacée. */
  read() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || d.v !== 1 || !d.isl || !d.where) { this.clear(); return null; }
      if (Date.now() - (d.at || 0) > MAX_AGE_MS) { this.clear(); return null; }
      return d;
    } catch (_) { this.clear(); return null; }
  },

  clear() { try { localStorage.removeItem(KEY); } catch (_) { /* rien à faire */ } },

  /** De quoi écrire le bouton du menu : « Reprendre · Le Val Bâti, 23 tuiles, été ». */
  describe() {
    const d = this.read(); if (!d) return null;
    const i = d.isl; const mins = Math.round((Date.now() - d.at) / 60000);
    const quand = mins < 2 ? 'à l’instant' : mins < 60 ? `il y a ${mins} minutes` : mins < 1440 ? `il y a ${Math.round(mins / 60)} h` : `il y a ${Math.round(mins / 1440)} jours`;
    return { title: d.title || 'Partie en cours', placements: i.placements, season: i.season, score: i.score, when: quand, where: d.where };
  },
};
