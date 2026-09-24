// Partie en cours, gardée sur l'appareil : on quitte l'application, on revient dix minutes plus tard, on reprend.
// C'est du navigateur uniquement (localStorage) : rien n'est envoyé en ligne, le budget d'écriture du nuage est intact.
//
// À côté d'elle, l'historique : les trois dernières parties finies ou laissées en plan. Elles ne se reprennent pas
// — une île finie est finie — mais elles s'ILLUSTRENT : un pépin se raconte presque toujours après coup, une fois
// l'île terminée, et jusqu'ici le rapport ne pouvait joindre que la partie du moment, souvent vide.
import { CAMPAGNE_50_VERS_30 } from '../data/campaign.js';
const KEY = 'cent-saisons.run';
const HIST_KEY = 'cent-saisons.runs';
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;   // au-delà d'un mois, la partie en cours est oubliée
const MAX_HIST = 3;                          // trois suffisent : au-delà, le joueur ne les reconnaît plus

/** « à l'instant », « il y a 3 h » : de quoi reconnaître une partie dans une liste. */
const depuis = (at) => {
  const mins = Math.round((Date.now() - at) / 60000);
  return mins < 2 ? 'à l’instant' : mins < 60 ? `il y a ${mins} minutes` : mins < 1440 ? `il y a ${Math.round(mins / 60)} h` : `il y a ${Math.round(mins / 1440)} jours`;
};

const SAISONS = { spring: 'printemps', summer: 'été', autumn: 'automne', winter: 'hiver' };

/**
 * v1 → v2 : la campagne est passée de cinquante à trente îles. Une partie sur une île gardée suit son nouveau numéro ;
 * une partie sur une île retirée ne peut plus être reprise (null). Les autres modes ne changent pas.
 */
export function migrerPartie(d) {
  if (!d || d.v === 2) return d;
  if (d.v !== 1) return null;
  const w = d.where || {};
  if (w.kind === 'campaign') { const n = CAMPAGNE_50_VERS_30[w.id]; if (!n) return null; return { ...d, v: 2, where: { ...w, id: n } }; }
  return { ...d, v: 2 };
}

export const RunSave = {
  /** Range la partie en cours. `where` décrit l'île pour pouvoir la reconstruire : { kind, id, semis }. */
  write(where, isl, title) {
    if (!isl || isl.ended) return false;
    if (!isl.placements) return false;                 // rien de commencé : rien à garder
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 2, at: Date.now(), where, title: title || '', isl: isl.serialize() }));
      return true;
    } catch (e) { console.warn('partie en cours non gardée', e); return false; }
  },

  /** La partie en cours, ou null. Une partie trop vieille ou illisible est effacée. */
  read() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return null;
      const d = migrerPartie(JSON.parse(raw));
      if (!d || d.v !== 2 || !d.isl || !d.where) { this.clear(); return null; }
      if (Date.now() - (d.at || 0) > MAX_AGE_MS) { this.clear(); return null; }
      return d;
    } catch (_) { this.clear(); return null; }
  },

  clear() { try { localStorage.removeItem(KEY); } catch (_) { /* rien à faire */ } },

  /** De quoi écrire le bouton du menu : « Reprendre · Le Val Bâti, 23 tuiles, été ». */
  describe() {
    const d = this.read(); if (!d) return null;
    const i = d.isl;
    return { title: d.title || 'Partie en cours', placements: i.placements, season: i.season, score: i.score, when: depuis(d.at), where: d.where };
  },

  // ---- l'historique : ce qui ne se reprend plus, mais qui s'illustre ----

  /** Range une partie finie (ou une île qu'on abandonne) en tête de l'historique. */
  archive(where, isl, title) {
    if (!isl || !where || !isl.placements) return false;
    let etat = null;
    try { etat = isl.serialize(); } catch (e) { console.warn('partie non archivée', e); return false; }
    return this._push({ v: 2, at: Date.now(), where, title: title || '', isl: etat, finie: !!isl.ended });
  },

  /** Archive la partie gardée sur l'appareil — celle qu'on s'apprête à remplacer ou à oublier. */
  archiveKept() { const d = this.read(); return d ? this._push({ ...d, finie: false }) : false; },

  /** Les dernières parties, la plus récente d'abord. */
  history() {
    try {
      const raw = localStorage.getItem(HIST_KEY); if (!raw) return [];
      const d = JSON.parse(raw);
      if (!d || (d.v !== 1 && d.v !== 2) || !Array.isArray(d.list)) return [];
      return d.list.map(migrerPartie).filter((e) => e && e.isl && e.where && Date.now() - (e.at || 0) <= MAX_AGE_MS);
    } catch (_) { return []; }
  },

  /** Une ligne lisible pour la choisir : « La Baie des Promesses — finie, 34 tuiles, été, il y a 2 h ». */
  label(e) {
    const i = e.isl || {};
    return [e.title || 'Partie', e.finie ? 'finie' : 'laissée en plan', `${i.placements || 0} tuiles`, SAISONS[i.season] || i.season, depuis(e.at || 0)].filter(Boolean).join(' · ');
  },

  /** L'historique s'en va avec la progression (remise à zéro, sauvegarde adoptée depuis le nuage). */
  forget() { try { localStorage.removeItem(HIST_KEY); } catch (_) { /* rien à faire */ } },

  /**
   * Écrit la liste. Le stockage peut être plein : plutôt que d'abandonner, on retire la plus vieille et on retente —
   * une partie gardée vaut mieux que trois perdues.
   */
  _push(entry) {
    const list = [entry, ...this.history()].slice(0, MAX_HIST);
    while (list.length) {
      try { localStorage.setItem(HIST_KEY, JSON.stringify({ v: 2, list })); return true; }
      catch (e) { list.pop(); if (!list.length) { console.warn('historique des parties non gardé', e); return false; } }
    }
    return false;
  },
};
