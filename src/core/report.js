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
// Les règles Firestore refusent un rapport de 120 000 et une image de 300 000. On s'arrête nettement en dessous :
// `length` compte des caractères JavaScript, la règle compte à sa façon, et un texte français plein d'accents pèse
// plus d'octets que de caractères. Se coller à la limite, c'est se faire refuser au bord.
const MAX_RAPPORT = 90000;
const MAX_IMAGE = 280000;
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

// ---------------------------------------------------------------------------------------------------
// Le journal des envois : la seule trace qui reste au joueur.
//
// Le code ne s'affiche qu'UNE fois, sur l'écran de remerciement, et le carnet où le rapport arrive est privé —
// le jeu ne peut pas le relire, ni savoir si le pépin a été corrigé. Sans cette liste, celui qui a signalé
// quelque chose la semaine dernière n'a plus rien : ni le code, ni la date, ni même la certitude d'avoir envoyé.
// On garde donc sur l'appareil de quoi reconnaître ses rapports et en reparler, et rien de plus.
// ---------------------------------------------------------------------------------------------------

const JOURNAL_KEY = 'cent-saisons.pepin.journal';
const JOURNAL_MAX = 20;        // au-delà, ce serait une archive, plus un aide-mémoire

/** Ce que l'appareil garde des rapports partis d'ici, le plus récent d'abord. */
export function journalEnvois() {
  try {
    const d = JSON.parse(localStorage.getItem(JOURNAL_KEY) || 'null');
    return d && Array.isArray(d.list) ? d.list : [];
  } catch (_) { return []; }   // illisible : une liste vide vaut mieux qu'un écran qui plante
}

/**
 * Note un rapport qui vient de partir. Appelé par l'écran, APRÈS l'envoi : lui seul connaît le sort du rapport
 * (le nuage ou le fichier), et `envoyerRapport` se rappelle une fois quand le rapport est trop gros — noter
 * là-dedans compterait deux fois le même envoi.
 */
export function noterEnvoi(rapport, resultat = {}) {
  const e = {
    code: rapport.code,
    mode: rapport.mode === 'idee' ? 'idee' : 'pepin',
    at: Date.now(),
    mot: String(rapport.mot || '').replace(/\s+/g, ' ').trim().slice(0, 120),
    tuiles: [...(rapport.tuiles || [])],
    voie: resultat.voie === 'nuage' ? 'nuage' : 'fichier',
    raison: resultat.raison || null,
  };
  const list = [e, ...journalEnvois()].slice(0, JOURNAL_MAX);
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify({ v: 1, list })); } catch (_) { /* stockage plein : le code reste affiché à l'écran */ }
  return e;
}

/** Le joueur efface sa liste. Elle ne vit que sur son appareil : il n'y a rien à prévenir ailleurs. */
export function oublierEnvois() {
  try { localStorage.removeItem(JOURNAL_KEY); } catch (_) { /* rien de plus à faire */ }
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
export function buildReport({ mode = 'pepin', tuiles = [], raccourci = null, mot = '', scene = null, sceneName = null, avecPartie = true, partie = null } = {}) {
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
      const p = partie || partieCourante(scene);
      if (p) r.partie = p;
    }
  }
  return r;
}

/** La partie du moment : celle gardée sur l'appareil, ou l'île en cours si elle n'a pas encore été rangée. */
function partieCourante(scene) {
  const run = RunSave.read();
  if (run) return run;
  if (scene && scene.isl && !scene.isl.ended && scene.isl.placements) {
    try { return { where: scene.def && scene.def.id ? { kind: 'campaign', id: scene.def.id, semis: scene.def.semis } : null, title: scene.title, isl: scene.isl.serialize() }; } catch (_) { /* tant pis : le reste part */ }
  }
  return null;
}

/**
 * Les parties qu'on peut joindre au rapport : celle du moment d'abord, puis les dernières jouées.
 * Un pépin se raconte souvent APRÈS coup, l'île finie et le menu revenu — sans ce choix, le rapport joignait
 * alors une partie vide, ou rien du tout.
 */
export function partiesPossibles(scene = null) {
  const out = [];
  const cur = partieCourante(scene);
  if (cur) out.push({ id: 'en-cours', label: `La partie en cours · ${cur.title || 'île'} · ${(cur.isl || {}).placements || 0} tuiles`, partie: cur });
  RunSave.history().forEach((e, i) => out.push({ id: `h${i}`, label: RunSave.label(e), partie: e }));
  return out;
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
  return habiller((ctx) => ctx.drawImage(src, 0, 0, w, h), w, h, { mot, code, rapport });
}

/**
 * L'image que le joueur APPORTE : une capture de son téléphone, une photo de l'écran. Le jeu, lui, ne sait
 * photographier que son canvas — le HUD (file, saison, vœux, boutons) est du DOM par-dessus, invisible à la
 * capture. Pour tout pépin d'interface, la capture du téléphone montre ce que le jeu ne peut pas montrer.
 * Rendue au même format et au même bandeau que la capture, pour qu'un relevé ne fasse pas la différence.
 */
export function imageFichier(fichier, { mot = '', code = '', rapport = null } = {}) {
  return new Promise((resolve) => {
    if (!fichier || !/^image\//.test(fichier.type || '')) { resolve(null); return; }
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
      if (!nw || !nh) { resolve(null); return; }
      const scale = Math.min(1, IMG_W / nw);
      const w = Math.max(1, Math.round(nw * scale)), h = Math.max(1, Math.round(nh * scale));
      resolve(habiller((ctx) => ctx.drawImage(img, 0, 0, w, h), w, h, { mot, code, rapport }));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

/** Le bandeau papier et l'encodage, communs à la capture du jeu et à l'image apportée. */
function habiller(dessiner, w, h, { mot = '', code = '', rapport = null }) {
  const band = 64;
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h + band;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h + band);
  try { dessiner(ctx); } catch (_) { return null; }
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
  return encoder(cvs);
}

/**
 * En JPEG. Une capture de téléphone en haute résolution peut dépasser à elle seule ce que la règle Firestore
 * accepte : on baisse alors la qualité plutôt que de perdre l'image — c'est le joueur qui l'a choisie.
 */
function encoder(cvs) {
  let data = null;
  for (const q of [IMG_Q, 0.45, 0.3]) {
    try { data = cvs.toDataURL('image/jpeg', q); } catch (_) { return null; }
    if ((data.split(',')[1] || '').length < MAX_IMAGE) return data;
  }
  return data;   // encore trop lourde : l'envoi la laissera tomber et le rapport partira sans elle
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
  // trop gros : la partie rejouable est ce qui pèse, on la retire et on retente UNE fois. Sans ce garde-fou, un
  // rapport encore trop gros sans elle se rappelait lui-même sans fin — un gel de l'onglet, dans l'écran même qui
  // sert à signaler les gels.
  if (texte.length > MAX_RAPPORT) {
    if (rapport.partie) { delete rapport.partie; return envoyerRapport(rapport, image); }
    return refuser('trop-gros');
  }

  try {
    if (!await Cloud.load()) return refuser('sdk');
    if (!Cloud.user) { const u = await Cloud.resume(); if (!u) return refuser('connexion'); }
    const { S, db } = Cloud.sdk;
    const doc = { code: rapport.code, at: Date.now(), rapport: texte };
    // l'image est facultative : si elle fait grossir le document au-delà de la règle, le rapport part sans elle —
    // la partie rejouable vaut mieux qu'une photo
    if (image) { const b64 = image.split(',')[1] || ''; if (b64.length < MAX_IMAGE) doc.image = b64; }
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
  'trop-gros': 'Ce rapport est trop lourd pour partir tout seul. Les deux fichiers viennent d’être téléchargés : rien n’est perdu.',
};
export const raisonTexte = (r) => RAISONS[r] || 'Le nuage n’a pas voulu. Les deux fichiers viennent d’être téléchargés : rien n’est perdu.';
