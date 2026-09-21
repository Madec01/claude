// L'écran « Pépins et idées ».
//
// Le principe : un testeur sait MONTRER, rarement NOMMER. L'entonnoir ne lui demande pas de trouver les mots, il
// lui demande de reconnaître — et la tuile choisie déclenche les bonnes questions dans le commentaire.
//
// Téléphone d'abord : le toucher est le geste principal (toucher une tuile la fait descendre dans le sujet, la
// retoucher la remonte). Le glisser-déposer natif du navigateur ne fonctionne pas au doigt : il n'est donc jamais
// nécessaire, seulement offert en plus à la souris.

import { h, button, icon, append } from './dom.js';
import { AudioSys } from '../core/audio.js';
import { BlackBox } from '../core/blackbox.js';
import { TREE, RACCOURCIS, nodeAt, labelOf, questionsFor, search } from '../data/bug_tree.js';
import { buildReport, captureImage, envoyerRapport, raisonTexte } from '../core/report.js';

const MAX_TUILES = 4;

const ACCROCHE = {
  pepin: 'Il nous arrive de trébucher. Raconte-nous ce que tu as vu : nous emportons le reste.',
  idee: 'Tu vois quelque chose qui nous manque ? Dis-le-nous : nous avons tout notre temps.',
};

export function buildReportPanel({ onBack, scene = null, sceneName = null, mode = 'pepin' }) {
  const state = {
    mode,
    chemin: [],            // la descente en cours : ['graphisme', 'sprites']
    sujet: [],             // les chemins choisis
    raccourci: null,
    q: '',                 // la recherche en cours
    posees: new Set(),     // les questions déjà déposées dans le commentaire
    avecImage: false,
    avecPartie: true,
    avecErreur: false,
    envoye: false,
  };

  const root = h('div', { class: 'panel panel-report' });
  const erreurs = BlackBox.pending();
  state.avecErreur = !!(erreurs && erreurs.length) && mode === 'pepin';

  // ---- le sélecteur de mode : pas un écran de plus, et « Un pépin » est déjà dessus
  const ongletPepin = h('button', { class: 'rep-tab', type: 'button' }, 'Un pépin');
  const ongletIdee = h('button', { class: 'rep-tab', type: 'button' }, 'Une idée');
  const onglets = h('div', { class: 'rep-tabs', role: 'tablist' }, ongletPepin, ongletIdee);

  const accroche = h('p', { class: 'ws-intro' }, ACCROCHE[state.mode]);

  // ---- le rapport que le jeu a émis tout seul
  const carteErreur = h('div', { class: 'rep-error' });
  const renderErreur = () => {
    carteErreur.innerHTML = '';
    if (state.mode !== 'pepin' || !erreurs || !erreurs.length) { carteErreur.classList.add('hidden'); return; }
    carteErreur.classList.remove('hidden');
    const e = erreurs[erreurs.length - 1];
    const coche = h('input', { type: 'checkbox', class: 'toggle' }); coche.checked = state.avecErreur;
    coche.addEventListener('change', () => { state.avecErreur = coche.checked; });
    const detail = h('div', { class: 'rep-error-detail hidden' }, `${e.message}${e.source ? ` — ${e.source}${e.ligne ? `:${e.ligne}` : ''}` : ''}${e.scene ? ` (${e.scene})` : ''}`);
    append(carteErreur,
      h('div', { class: 'rep-error-head' },
        h('b', {}, '⚠ Le jeu a relevé une erreur pendant ta partie.'),
        h('button', { class: 'rep-link', type: 'button', onclick: () => detail.classList.toggle('hidden') }, 'voir')),
      detail,
      h('label', { class: 'rep-check' }, coche, h('span', {}, 'L’ajouter à ce pépin')));
  };

  // ---- les quatre raccourcis
  const barreRaccourcis = h('div', { class: 'rep-shortcuts' });
  const renderRaccourcis = () => {
    barreRaccourcis.innerHTML = '';
    for (const r of RACCOURCIS[state.mode]) {
      const b = h('button', { class: `rep-chip ${state.raccourci === r.id ? 'on' : ''}`, type: 'button' }, r.n);
      b.addEventListener('click', () => {
        AudioSys.play('ui_click', { volume: 0.4 });
        state.raccourci = state.raccourci === r.id ? null : r.id;
        if (state.raccourci === r.id) poserQuestions(r.q);
        renderRaccourcis();
      });
      barreRaccourcis.appendChild(b);
    }
  };

  // ---- la recherche : 240 feuilles, c'est beaucoup à parcourir au pouce. Un mot suffit pour y couper.
  const champ = h('input', {
    class: 'rep-search-input', type: 'search', inputmode: 'search', enterkeyhint: 'search',
    autocomplete: 'off', autocorrect: 'off', spellcheck: 'false',
    placeholder: 'Chercher un mot : forêt, score, lenteur…', 'aria-label': 'Chercher une tuile',
  });
  const effacer = h('button', { class: 'rep-search-x hidden', type: 'button', 'aria-label': 'effacer la recherche' }, '✕');
  const recherche = h('div', { class: 'rep-search' }, champ, effacer);
  champ.addEventListener('input', () => { state.q = champ.value; effacer.classList.toggle('hidden', !state.q); renderArbre(); });
  effacer.addEventListener('click', () => { champ.value = ''; state.q = ''; effacer.classList.add('hidden'); renderArbre(); champ.focus(); });

  // ---- l'arbre
  const filAriane = h('div', { class: 'rep-crumbs' });
  const grille = h('div', { class: 'rep-grid' });

  const listeCourante = () => {
    let list = TREE;
    for (const id of state.chemin) { const n = (list || []).find((x) => x.id === id); list = n && n.e; }
    return list || [];
  };
  const cheminDe = (id) => [...state.chemin, id].join('/');

  const renderArbre = () => {
    // tant qu'on cherche, les résultats remplacent l'arbre : on ne fouille pas deux choses à la fois
    if (state.q.trim().length >= 2) return renderResultats();
    filAriane.classList.remove('hidden');
    // fil d'Ariane : un toucher pour remonter
    filAriane.innerHTML = '';
    const racine = h('button', { class: 'rep-crumb', type: 'button' }, 'Tout');
    racine.addEventListener('click', () => { state.chemin = []; renderArbre(); });
    filAriane.appendChild(racine);
    state.chemin.forEach((id, i) => {
      const n = nodeAt(state.chemin.slice(0, i + 1).join('/'));
      filAriane.appendChild(h('span', { class: 'rep-sep' }, '›'));
      const b = h('button', { class: 'rep-crumb', type: 'button' }, n ? n.n : id);
      b.addEventListener('click', () => { state.chemin = state.chemin.slice(0, i + 1); renderArbre(); });
      filAriane.appendChild(b);
    });

    grille.innerHTML = '';
    // « Tout : <branche> » — n'importe quel niveau s'embarque, y compris le premier. C'est rare, mais c'est la
    // soupape du gros pépin général, et de celui qui ne trouve pas sa case.
    if (state.chemin.length) {
      const p = state.chemin.join('/'); const n = nodeAt(p);
      grille.appendChild(tuile(`Tout : ${n ? n.n : p}`, p, 'rep-all'));
    }
    for (const node of listeCourante()) {
      const p = cheminDe(node.id);
      if (node.e && node.e.length) {
        const b = h('button', { class: 'rep-tile rep-branch', type: 'button' },
          h('span', {}, node.n), h('span', { class: 'rep-arrow' }, '›'));
        b.addEventListener('click', () => { AudioSys.play('ui_click', { volume: 0.35 }); state.chemin.push(node.id); renderArbre(); });
        grille.appendChild(b);
      } else {
        grille.appendChild(tuile(node.n, p));
      }
    }
  };

  /**
   * Les résultats d'une recherche : une liste à plat, chacun avec le chemin qui y mène — sans quoi « Rivière »
   * ne dirait pas s'il s'agit du dessin ou du calcul, et il y en a un de chaque.
   * Toucher une feuille l'embarque ; toucher une branche y descend, et la recherche s'efface.
   */
  function renderResultats() {
    filAriane.classList.add('hidden');
    grille.innerHTML = '';
    const res = search(state.q, 24);
    if (!res.length) {
      grille.appendChild(h('div', { class: 'rep-noresult' },
        h('b', {}, 'Rien sous ce mot-là.'),
        h('span', {}, 'Essaie un autre mot, ou parcours la liste — et si tu ne trouves toujours pas, écris-le simplement en dessous : ça vaut largement une tuile.')));
      return;
    }
    for (const r of res) {
      const pris = state.sujet.includes(r.path);
      const parent = r.label.split(' · ').slice(0, -1).join(' › ');
      const b = h('button', { class: `rep-tile rep-result ${pris ? 'on' : ''}`, type: 'button' },
        h('span', { class: 'rep-result-txt' },
          h('b', {}, r.nom),
          parent ? h('small', {}, parent) : null),
        pris ? h('span', { class: 'rep-check-mark' }, '✓') : r.feuille ? null : h('span', { class: 'rep-arrow' }, '›'));
      b.addEventListener('click', () => {
        if (r.feuille) { basculer(r.path); return; }
        AudioSys.play('ui_click', { volume: 0.35 });
        state.chemin = r.path.split('/'); state.q = ''; champ.value = ''; effacer.classList.add('hidden');
        renderArbre();
      });
      grille.appendChild(b);
    }
  }

  /** Une tuile qu'on embarque (feuille, ou branche entière). Le toucher suffit ; le glisser est un bonus souris. */
  function tuile(nom, chemin, cls = '') {
    const pris = state.sujet.includes(chemin);
    const b = h('button', { class: `rep-tile ${cls} ${pris ? 'on' : ''}`, type: 'button', draggable: 'true' }, h('span', {}, nom), pris ? h('span', { class: 'rep-check-mark' }, '✓') : null);
    b.addEventListener('click', () => basculer(chemin));
    b.addEventListener('dragstart', (ev) => { try { ev.dataTransfer.setData('text/plain', chemin); } catch (_) { /* sans importance */ } });
    return b;
  }

  function basculer(chemin) {
    const i = state.sujet.indexOf(chemin);
    if (i >= 0) { state.sujet.splice(i, 1); AudioSys.play('ui_back', { volume: 0.4 }); }
    else {
      if (state.sujet.length >= MAX_TUILES) { dire('Quatre, c’est déjà beaucoup. Raconte le reste en dessous.'); return; }
      state.sujet.push(chemin); AudioSys.play('ui_confirm', { volume: 0.4 });
      poserQuestions(questionsFor([chemin], state.mode));
    }
    renderArbre(); renderSujet();
  }

  // ---- le sujet, collé en bas : on doit voir son panier se remplir
  const sujetListe = h('div', { class: 'rep-subject-list' });
  const sujetBloc = h('div', { class: 'rep-subject' },
    h('div', { class: 'rep-subject-head' }, 'Sujet du pépin'), sujetListe);
  sujetBloc.addEventListener('dragover', (e) => e.preventDefault());
  sujetBloc.addEventListener('drop', (e) => { e.preventDefault(); const p = e.dataTransfer && e.dataTransfer.getData('text/plain'); if (p && !state.sujet.includes(p)) basculer(p); });

  const renderSujet = () => {
    sujetBloc.querySelector('.rep-subject-head').textContent = state.mode === 'idee' ? 'Sujet de ton idée' : 'Sujet du pépin';
    sujetListe.innerHTML = '';
    if (!state.sujet.length) { sujetListe.appendChild(h('span', { class: 'rep-empty' }, 'Rien encore — touche une tuile, ou écris simplement en dessous.')); return; }
    for (const p of state.sujet) {
      const chip = h('span', { class: 'rep-sel' }, labelOf(p),
        h('button', { class: 'rep-sel-x', type: 'button', 'aria-label': 'retirer' }, '✕'));
      chip.querySelector('.rep-sel-x').addEventListener('click', () => basculer(p));
      sujetListe.appendChild(chip);
    }
  };

  // ---- le commentaire, pré-rempli
  const zone = h('textarea', { class: 'rep-text', rows: '4', placeholder: state.mode === 'idee' ? 'Raconte…' : 'Qu’est-ce qui s’est passé ?' });
  /** Dépose les questions qui manquent, SANS jamais écraser ce qui est déjà tapé. */
  function poserQuestions(qs) {
    const neuves = (qs || []).filter((q) => q && !state.posees.has(q));
    if (!neuves.length) return;
    for (const q of neuves) state.posees.add(q);
    const avant = zone.value;
    zone.value = (avant ? `${avant.replace(/\s+$/, '')}\n` : '') + neuves.join('\n') + '\n';
  }

  // ---- l'image, repliée : jamais imposée
  const imgCoche = h('input', { type: 'checkbox', class: 'toggle' });
  imgCoche.addEventListener('change', () => { state.avecImage = imgCoche.checked; });
  const blocImage = h('label', { class: 'rep-check rep-image' }, imgCoche,
    h('span', {}, h('b', {}, 'Ajouter une image de l’écran'),
      h('small', {}, 'Utile si le pépin se voit. Inutile sinon : elle alourdit le rapport pour rien.')));

  // ---- la partie rejouable : cochée par défaut, et on montre ce qui part
  const partCoche = h('input', { type: 'checkbox', class: 'toggle' }); partCoche.checked = true;
  partCoche.addEventListener('change', () => { state.avecPartie = partCoche.checked; });
  const blocPartie = h('label', { class: 'rep-check' }, partCoche,
    h('span', {}, h('b', {}, 'Joindre la partie, pour la rejouer'),
      h('small', {}, 'Ton île telle qu’elle est : c’est ce qui permet de retrouver le pépin. Rien qui dise qui tu es.')));

  const pli = h('details', { class: 'rep-details' },
    h('summary', {}, 'Ce qui part avec'),
    h('ul', { class: 'rep-what' },
      h('li', {}, 'Ta phrase et les tuiles choisies'),
      h('li', {}, 'L’île en cours, et ce que tu venais de faire'),
      h('li', {}, 'L’erreur, s’il y en a eu une'),
      h('li', {}, 'Ton téléphone, tes réglages et la version du jeu')),
    h('p', { class: 'rep-privacy' }, 'Aucune adresse, aucun nom : rien de tout cela ne dit qui tu es.'),
    blocPartie, blocImage);

  // ---- l'envoi
  const etat = h('p', { class: 'opt-note rep-state' });
  const envoyer = button('Envoyer', async () => {
    if (state.envoye) return;
    envoyer.disabled = true; etat.textContent = 'Envoi…';
    try {
      const rapport = buildReport({
        mode: state.mode, tuiles: state.sujet, raccourci: state.raccourci,
        mot: zone.value, scene, sceneName,
        avecPartie: state.avecPartie && state.mode === 'pepin',
      });
      if (state.mode === 'pepin' && !state.avecErreur) delete rapport.erreurs;
      const image = state.avecImage ? captureImage({ mot: zone.value, code: rapport.code, rapport }) : null;
      const r = await envoyerRapport(rapport, image);
      state.envoye = true;
      if (r.voie === 'nuage') BlackBox.clear();
      AudioSys.play('ui_confirm', { volume: 0.6 });
      montrerMerci(rapport.code, r);
    } catch (e) {
      console.warn('envoi du pépin', e);
      etat.textContent = 'Impossible d’envoyer pour l’instant. Réessaie dans un moment.';
      envoyer.disabled = false;
    }
  }, { cls: 'btn-primary', iconName: 'icon_next' });

  const dire = (t) => { etat.textContent = t; };

  const corps = h('div', { class: 'rep-body' },
    accroche, carteErreur, barreRaccourcis,
    h('div', { class: 'rep-or' }, 'ou cherche'),
    recherche, filAriane, grille, sujetBloc, zone, pli, etat);

  function montrerMerci(code, r) {
    corps.innerHTML = '';
    const mot = state.mode === 'idee' ? 'idée' : 'pépin';
    append(corps,
      h('div', { class: 'rep-thanks' },
        h('div', { class: 'rep-code' }, `${mot === 'idée' ? 'IDÉE' : 'PÉPIN'}-${code}`),
        h('p', {}, r.voie === 'nuage'
          ? `C’est parti. Ton ${mot} porte ce code — garde-le si tu veux en reparler.`
          : raisonTexte(r.raison))));
    actions.innerHTML = '';
    actions.appendChild(button('Retour', onBack, { cls: 'btn-primary', iconName: 'icon_return' }));
  }

  const actions = h('div', { class: 'panel-actions' }, envoyer, button('Retour', onBack, { cls: 'btn-ghost', iconName: 'icon_return' }));

  const setMode = (m) => {
    if (state.mode === m || state.envoye) return;
    state.mode = m;
    ongletPepin.classList.toggle('on', m === 'pepin');
    ongletIdee.classList.toggle('on', m === 'idee');
    state.raccourci = null;
    accroche.textContent = ACCROCHE[m];
    zone.placeholder = m === 'idee' ? 'Raconte…' : 'Qu’est-ce qui s’est passé ?';
    blocPartie.classList.toggle('hidden', m === 'idee');
    renderErreur(); renderRaccourcis(); renderSujet();
    if (state.sujet.length) poserQuestions(questionsFor(state.sujet, m));
  };
  ongletPepin.addEventListener('click', () => { AudioSys.play('ui_click', { volume: 0.4 }); setMode('pepin'); });
  ongletIdee.addEventListener('click', () => { AudioSys.play('ui_click', { volume: 0.4 }); setMode('idee'); });

  append(root, h('h2', { class: 'panel-title' }, 'Pépins et idées'), onglets, corps, actions);
  ongletPepin.classList.toggle('on', state.mode === 'pepin');
  ongletIdee.classList.toggle('on', state.mode === 'idee');
  blocPartie.classList.toggle('hidden', state.mode === 'idee');
  renderErreur(); renderRaccourcis(); renderArbre(); renderSujet();
  // le clavier ne doit pas monter tout seul sur téléphone : il mangerait la moitié de l'écran avant qu'il ait lu
  if (!document.documentElement.classList.contains('touch')) setTimeout(() => zone.focus({ preventScroll: true }), 80);
  return root;
}
