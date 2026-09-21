// Le rapport de pépin : ce qu'on ramasse, comment on l'habille, et par où il part.
//
// Le chemin : le jeu écrit UN document dans la collection `pepins` (Firebase, déjà branché) ; un relevé transforme
// ensuite chaque document en issue GitHub et l'efface. Le jeu n'écrit jamais dans GitHub lui-même — il faudrait un
// jeton dans le code d'un site public, donc un jeton volé dans la journée.
//
// Si rien ne peut partir (hors ligne, quota, plafond de l'appareil), les deux fichiers sont téléchargés : jamais
// d'échec muet. Voir docs/SECTION_BUGS.md.

import { Save } from './save.js';
import { Cloud } from './cloud.js';
import { RunSave } from './run.js';
import { STAGE } from './stage.js';
import { BlackBox } from './blackbox.js';
import { CLOUD } from '../data/firebase_config.js';
import { questionsFor } from '../data/bug_tree.js';

const PAPER = '#fbf7ee', INK = '#2b2a26';
const JOURNAL_LINES = 30;      // au-delà, le rapport grossit sans rien apprendre
const IMG_W = 900;             // l'image réduite : 80 Ko environ en JPEG, au lieu de 400 à 800
const IMG_Q = 0.6;
const MAX_PAR_JOUR = 5;
const DAY_KEY = 'cent-saisons.pepin.jour';

/** Quatre caractères qu'on peut dicter : ni I, ni O, ni 0, ni 1. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function nouveauCode() {
  let s = ''; for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

/** Combien de pépins déjà partis aujourd'hui, depuis cet appareil. */
export function envoyesAujourdhui(add = 0) {
  const today = new Date().toISOString().slice(0, 10);
  let d = { day: today, n: 0 };
  try { const raw = localStorage.getItem(DAY_KEY); if (raw) d = JSON.parse(raw); } catch (_) { /* illisible : on repart de zéro */ }
  if (d.day !== today) d = { day: today, n: 0 };
  if (add) { d.n += add; try { localStorage.setItem(DAY_KEY, JSON.stringify(d)); } catch (_) { /* stockage plein */ } }
  return d.n;
}

const SAISONS = { spring: 'printemps', summer: 'été', autumn: 'automne', winter: 'hiver' };

/** Ce que le jeu sait de lui-même, et que le joueur n'aurait pas à taper. */
export function collectContext(scene, sceneName) {
  const ctx = { ou: sceneName || null };
  const html = document.documentElement;
  ctx.appareil = {
    ua: navigator.userAgent,
    largeur: window.innerWidth, hauteur: window.innerHeight,
    dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
    classes: html.className || '',
    plein_ecran: !!document.fullscreenElement,
    langue: navigator.language || null,
  };
  ctx.reglages = { ...Save.options };
  const c = Save.campaign;
  ctx.progression = {
    ile_debloquee: c.unlockedIsland, etoiles: Object.values(c.stars || {}).reduce((a, b) => a + b, 0),
    graines: c.seeds, ameliorations: { ...c.upgrades }, contrats: { ...(c.contracts || {}) },
  };
  // le nuage : son mode et son état, JAMAIS l'identifiant ni le nom du compte
  const st = Cloud.status();
  ctx.nuage = { mode: (Save.data.cloud || {}).choice || null, etat: st.state, anonyme: st.user ? !!st.user.anonymous : null };

  if (scene && scene.isl && scene.def) {
    const isl = scene.isl, def = scene.def;
    ctx.ile = {
      id: def.id || null, nom: scene.title || def.name || null, chapitre: def.chapter || null,
      mode: def.infinite ? 'infinie' : def.garden ? 'jardin' : def.daily ? 'jour' : 'campagne',
      semis: def.semis || null, climat: isl.climate ? isl.climate.id : null,
      saison: SAISONS[isl.season] || isl.season, regle: isl.rule || null,
      poses: isl.placements, score: isl.score, souffles: isl.breaths,
      meteo: isl.weather ? isl.weather.id || isl.weather.kind || null : null,
    };
    if (scene.hud && Array.isArray(scene.hud.log)) {
      ctx.journal = scene.hud.log.slice(-JOURNAL_LINES).map((l) => `${l.when} — ${l.text}`);
    }
  }
  return ctx;
}

/**
 * Compose le rapport. `mode` vaut 'pepin' ou 'idee'.
 * En mode idée la partie rejouable ne part pas : il n'y a rien à rejouer, et le contexte léger dit déjà l'essentiel.
 */
export function buildReport({ mode = 'pepin', tuiles = [], raccourci = null, mot = '', scene = null, sceneName = null, avecPartie = true } = {}) {
  const code = nouveauCode();
  const ctx = collectContext(scene, sceneName);
  const r = {
    version: 1, mode, code, at: new Date().toISOString(),
    mot: (mot || '').trim() || '(sans commentaire)',
    tuiles: [...tuiles], raccourci,
    questions: questionsFor(tuiles, mode),
    jeu: VERSION_JEU(),
    ...ctx,
  };
  if (mode === 'pepin') {
    const errs = BlackBox.pending();
    if (errs && errs.length) r.erreurs = errs;
    if (avecPartie) {
      const run = RunSave.read();
      if (run) r.partie = run;
      else if (scene && scene.isl && !scene.isl.ended && scene.isl.placements) {
        try { r.partie = { where: scene.def && scene.def.id ? { kind: 'campaign', id: scene.def.id, semis: scene.def.semis } : null, title: scene.title, isl: scene.isl.serialize() }; } catch (_) { /* tant pis : le reste part */ }
      }
    }
  }
  return r;
}

/** La version du jeu, telle qu'elle s'affiche au menu. Importée à la volée pour ne pas croiser les modules d'UI. */
let _version = null;
export function setVersion(v) { _version = v; }
const VERSION_JEU = () => _version || 'inconnue';

// ---------------------------------------------------------------------------------------------------
// L'image : une capture du canvas VIVANT, pas un nouveau rendu — c'est l'île telle qu'il la voit, son zoom,
// son cadrage, sa météo comprise. Un rendu façon carte postale recadrerait, et effacerait ce qui cloche.
// ---------------------------------------------------------------------------------------------------

/** Rend l'image du rapport : le canvas réduit, plus un bandeau papier qui porte la phrase et le contexte. */
export function captureImage({ mot = '', code = '', rapport = null } = {}) {
  const src = document.getElementById('game');
  if (!src || !src.width) return null;
  const scale = Math.min(1, IMG_W / src.width);
  const w = Math.max(320, Math.round(src.width * scale));
  const h = Math.round(src.height * scale);
  const band = 64;
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h + band;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h + band);
  try { ctx.drawImage(src, 0, 0, w, h); } catch (_) { return null; }
  ctx.strokeStyle = 'rgba(43,42,38,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  // le bandeau : la phrase, puis le contexte, puis le code — écrit DANS l'image, il survit à toute recompression
  ctx.fillStyle = INK; ctx.textBaseline = 'alphabetic';
  ctx.font = '600 15px Quicksand, sans-serif';
  const phrase = (mot || '').replace(/\s+/g, ' ').trim().slice(0, 90) || '(sans commentaire)';
  ctx.fillText(phrase, 12, h + 26);
  const i = (rapport && rapport.ile) || null;
  const ligne = [
    i ? `${i.nom || 'île'}${i.id ? ` (${i.id})` : ''}` : (rapport && rapport.ou) || '',
    i ? `${i.saison} · ${i.poses} tuiles · ${i.score} pts` : '',
    `v${VERSION_JEU()}`,
  ].filter(Boolean).join('  ·  ');
  ctx.globalAlpha = 0.7; ctx.font = '13px Quicksand, sans-serif';
  ctx.fillText(ligne, 12, h + 47);
  ctx.globalAlpha = 1; ctx.textAlign = 'right';
  ctx.font = '700 16px Quicksand, sans-serif'; ctx.fillStyle = '#e0a33a';
  ctx.fillText(`PÉPIN-${code}`, w - 12, h + 34);
  ctx.textAlign = 'left';
  try { return cvs.toDataURL('image/jpeg', IMG_Q); } catch (_) { return null; }
}

// ---------------------------------------------------------------------------------------------------
// L'envoi
// ---------------------------------------------------------------------------------------------------

const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function telecharger(nom, contenu, type) {
  const blob = contenu instanceof Blob ? contenu : new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Le repli : les deux fichiers sur l'appareil, et une phrase qui dit quoi en faire. */
export function telechargerRapport(rapport, image) {
  const base = `cent-saisons-${rapport.mode === 'idee' ? 'idee' : 'pepin'}-${new Date().toISOString().slice(0, 10)}-${rapport.code}`;
  telecharger(`${base}.txt`, JSON.stringify(rapport, null, 1), 'text/plain');
  if (image) {
    const bin = atob(image.split(',')[1] || '');
    const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    telecharger(`${base}.jpg`, new Blob([buf], { type: 'image/jpeg' }), 'image/jpeg');
  }
  return base;
}

/**
 * Envoie le rapport : UNE écriture dans `pepins`, ou le téléchargement.
 * Retourne { ok, voie: 'nuage' | 'fichier', raison }. `raison` dit pourquoi on n'a pas pu passer par le nuage,
 * pour que l'écran le dise en clair — jamais d'échec muet.
 */
export async function envoyerRapport(rapport, image) {
  const texte = JSON.stringify(rapport);
  const refuser = (raison) => { telechargerRapport(rapport, image); return { ok: true, voie: 'fichier', raison }; };

  if (CLOUD.pepins === false) return refuser('coupe');
  if (envoyesAujourdhui() >= MAX_PAR_JOUR) return refuser('plafond');
  if ((Save.data.cloud || {}).choice === 'none') return refuser('hors-ligne');
  if (!Cloud.online()) return refuser('reseau');
  if (texte.length > 120000) { delete rapport.partie; return envoyerRapport(rapport, image); }

  try {
    if (!await Cloud.load()) return refuser('sdk');
    if (!Cloud.user) { const u = await Cloud.resume(); if (!u) return refuser('connexion'); }
    const { S, db } = Cloud.sdk;
    const doc = { code: rapport.code, at: Date.now(), rapport: texte };
    // l'image est facultative : si elle fait grossir le document au-delà de la règle, le rapport part sans elle —
    // la partie rejouable vaut mieux qu'une photo
    if (image) { const b64 = image.split(',')[1] || ''; if (b64.length < 300000) doc.image = b64; }
    await S.setDoc(S.doc(db, CLOUD.pepinsCollection, `${Date.now().toString(36)}-${rapport.code}`), doc);
    envoyesAujourdhui(1);
    return { ok: true, voie: 'nuage' };
  } catch (e) {
    console.warn('pépin non envoyé, on le télécharge', e);
    return refuser(String((e && e.code) || e));
  }
}

/** Ce qu'on dit au joueur quand le rapport est parti en fichier plutôt qu'en ligne. */
export const RAISONS = {
  'hors-ligne': 'Tu joues hors ligne : le pépin ne peut pas partir tout seul. Les deux fichiers viennent d’être téléchargés — envoie-les quand tu veux.',
  reseau: 'Pas de réseau pour l’instant. Les deux fichiers viennent d’être téléchargés : rien n’est perdu.',
  plafond: 'Cinq pépins aujourd’hui, c’est déjà beaucoup. Le prochain repartira demain — celui-ci vient d’être téléchargé.',
  connexion: 'La connexion n’a pas abouti. Les deux fichiers viennent d’être téléchargés : rien n’est perdu.',
  sdk: 'Les services en ligne n’ont pas répondu. Les deux fichiers viennent d’être téléchargés : rien n’est perdu.',
  coupe: 'L’envoi est coupé pour l’instant. Les deux fichiers viennent d’être téléchargés : rien n’est perdu.',
};
export const raisonTexte = (r) => RAISONS[r] || 'Le nuage n’a pas voulu. Les deux fichiers viennent d’être téléchargés : rien n’est perdu.';
