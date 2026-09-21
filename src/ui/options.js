// Écran des options : volumes, confort, mode test, sauvegarde.
import { h, button, icon, append } from './dom.js';
import { AudioSys } from '../core/audio.js';
import { Save } from '../core/save.js';
import { Cloud, signInProblem } from '../core/cloud.js';

function slider(label, key, onChange) {
  const v = Save.options[key];
  const id = `opt-${key}`;
  const input = h('input', { type: 'range', min: 0, max: 100, value: Math.round(v * 100), class: 'slider', id, 'aria-label': label });
  const val = h('span', { class: 'opt-val' }, `${Math.round(v * 100)} %`);
  input.addEventListener('input', () => { const x = input.value / 100; Save.options[key] = x; val.textContent = `${input.value} %`; onChange(x); });
  input.addEventListener('change', () => { Save.save(); AudioSys.play('ui_click', { volume: 0.4 }); });
  return h('div', { class: 'opt-row' }, h('label', { class: 'opt-label', for: id }, label), input, val);
}

function toggle(label, key, onChange, desc = '') {
  const input = h('input', { type: 'checkbox', class: 'toggle', role: 'switch' });
  input.checked = !!Save.options[key];
  input.addEventListener('change', () => { Save.options[key] = input.checked; Save.save(); AudioSys.play(input.checked ? 'ui_confirm' : 'ui_back', { volume: 0.5 }); onChange(input.checked); });
  return h('label', { class: 'opt-row opt-toggle' }, h('span', { class: 'opt-label' }, label, desc ? h('small', {}, desc) : null), input, h('span', { class: 'toggle-ui', 'aria-hidden': 'true' }));
}

const key = (k) => h('span', { class: 'key' }, k);

export function buildOptions({ onBack, game }) {
  const root = h('div', { class: 'panel panel-options' });
  const c = Save.campaign;
  const testGroup = h('div', { class: `opt-group opt-test ${Save.options.testMode ? 'on' : ''}` },
    h('h3', {}, icon('icon_gear'), 'Mode test'),
    toggle('Activer le mode test', 'testMode', (v) => { testGroup.classList.toggle('on', v); game.setTestMode(v); }, 'Déverrouille toutes les îles, l’Île infinie et le Jardin. Les scores ne sont pas enregistrés.'),
    h('div', { class: 'opt-keys' }, h('span', {}, key('F1'), 'débogage'), h('span', {}, key('F2'), 'file infinie'), h('span', {}, key('F3'), 'saison suivante'), h('span', {}, key('F4'), '+10 souffles'), h('span', {}, key('F5'), 'terminer l’île')),
    toggle('Sauter les tutoriels', 'skipTutorial', () => {}, 'Les consignes des premières îles ne s’affichent plus.'),
  );
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone;
  const b = Save.data.backup || {};
  const lastTxt = b.lastAt ? `Dernière copie : ${new Date(b.lastAt).toLocaleDateString('fr-FR')}${b.islandsSince ? `, ${b.islandsSince} île${b.islandsSince > 1 ? 's' : ''} jouée${b.islandsSince > 1 ? 's' : ''} depuis` : ''}.` : 'Aucune copie locale pour l’instant.';
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', class: 'hidden', 'data-ref': 'saveFile' });
  const status = h('p', { class: 'opt-note', 'data-ref': 'saveStatus' }, lastTxt);
  const download = () => {
    const text = Save.exportText(); const name = `cent-saisons-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([text], { type: 'application/json' }); const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    Save.markBackedUp(); if (game.onBackup) game.onBackup(); status.textContent = `Copie téléchargée : ${name}. Garde ce fichier (Fichiers, Drive, mail à toi-même…).`; AudioSys.play('ui_confirm', { volume: 0.5 });
  };
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0]; if (!f) return;
    f.text().then((text) => {
      const info = Save.inspect(text);
      if (!info) { status.textContent = 'Ce fichier n’est pas une sauvegarde de Cent Saisons.'; AudioSys.play('ui_error', { volume: 0.5 }); return; }
      if (root.querySelector('.confirm')) return;
      const cf = h('div', { class: 'confirm' }, h('span', {}, `Ce fichier contient une progression jusqu’à l’île ${info.unlockedIsland}, ${info.stars} étoiles, ${info.seeds} graines${info.exportedAt ? `, copiée le ${new Date(info.exportedAt).toLocaleDateString('fr-FR')}` : ''}. Remplacer la progression de cet appareil ? `),
        button('Oui, charger', () => { Save.importText(text); cf.remove(); status.textContent = 'Sauvegarde chargée.'; AudioSys.play('upgrade', { volume: 0.7 }); game.onSaveLoaded && game.onSaveLoaded(); }, { cls: 'btn-primary btn-small', iconName: 'icon_check' }),
        button('Annuler', () => cf.remove(), { cls: 'btn-small' }));
      saveGroup.appendChild(cf);
    });
    fileInput.value = '';
  });
  // --- la partie en ligne : qui je suis, et les trois boutons qui rendent la main au joueur
  const cloudStatus = h('p', { class: 'opt-note' });
  const cloudDiag = h('div', { class: 'opt-diag' });
  const cloudBtns = h('div', { class: 'opt-row opt-btnrow' });
  const refreshCloud = () => {
    const st = Cloud.status(); const ch = (Save.data.cloud || {}).choice;
    const who = st.user ? (st.user.anonymous ? 'Connecté sans compte' : `Connecté avec Google${st.user.name ? ` (${st.user.name})` : ''}`) : (ch === 'none' ? 'Hors ligne : rien n’est envoyé' : 'Pas connecté');
    const extra = st.state === 'quota' ? ' · le nuage se repose jusqu’à la prochaine session' : st.state === 'error' ? ' · indisponible pour l’instant, la partie reste sur l’appareil' : '';
    cloudStatus.textContent = who + extra + (Save.options.testMode && st.user ? ` · ${st.writes} écriture(s) cette session, ${st.writesToday} aujourd’hui, ${st.skipped} évitée(s)` : '');
    cloudBtns.innerHTML = '';
    if (st.user) {
      cloudBtns.appendChild(button('Sauvegarder maintenant', async () => { const r = await game.pushCloud({ force: true }); status.textContent = r && r.ok ? 'Partie envoyée en ligne.' : 'Envoi impossible pour l’instant.'; refreshCloud(); }, { cls: 'btn-small', iconName: 'icon_save' }));
      // rattacher Google : la fenêtre surgissante d'abord ; si elle est bloquée, le SDK redirige et le retour est repris au lancement
      if (st.user.anonymous) cloudBtns.appendChild(button('Continuer avec Google', async () => {
        const r = await Cloud.signInGoogle({ beforeRedirect: () => { Save.data.cloud.pending = 'google'; Save.save(); } });
        if (r === 'redirect') return;
        if (r) { Save.data.cloud.choice = 'google'; Save.data.cloud.pending = null; Save.save(); status.textContent = 'Compte Google rattaché : ta partie te suit.'; }
        else status.textContent = ['La connexion Google a échoué.', signInProblem(Cloud.error)].filter(Boolean).join(' ');
        refreshCloud();
      }, { cls: 'btn-small btn-primary', iconName: 'icon_check' }));
      cloudBtns.appendChild(button('Se déconnecter', async () => { await Cloud.signOut(); Save.data.cloud = { choice: null, uid: null, pending: null }; Save.save(); refreshCloud(); }, { cls: 'btn-small btn-ghost', iconName: 'icon_exit' }));
    } else {
      cloudBtns.appendChild(button('Choisir une connexion', () => game.askSignIn(), { cls: 'btn-small btn-primary', iconName: 'icon_play' }));
    }
    // vérification point par point : dit exactement ce qui manque côté Firebase, au lieu d'échouer en silence
    cloudBtns.appendChild(button('Vérifier la connexion', async () => {
      cloudDiag.innerHTML = ''; cloudDiag.appendChild(h('div', { class: 'diag-line' }, 'Vérification en cours…'));
      const steps = await Cloud.diagnose();
      cloudDiag.innerHTML = '';
      for (const st of steps) cloudDiag.appendChild(h('div', { class: `diag-line ${st.ok ? 'ok' : 'ko'}` }, h('b', {}, `${st.ok ? '✓' : '✗'} ${st.label}`), st.detail ? h('span', {}, ` — ${st.detail}`) : null));
      if (steps.every((st) => st.ok)) cloudDiag.appendChild(h('div', { class: 'diag-line ok' }, h('b', {}, 'Tout est en place.')));
      refreshCloud();
    }, { cls: 'btn-small', iconName: 'icon_question' }));
    cloudBtns.appendChild(button('Vie privée', () => game.showPrivacy(() => game.showOptions(onBack)), { cls: 'btn-small btn-ghost', iconName: 'icon_info' }));
  };
  const cloudGroup = h('div', { class: 'opt-group opt-cloud' },
    h('h3', {}, icon('icon_cloud'), 'Partie en ligne'),
    cloudStatus,
    cloudDiag,
    h('p', { class: 'opt-note' }, 'La partie n’est envoyée qu’à la fin d’une île, jamais pendant que tu joues. Sans réseau, le jeu fonctionne exactement pareil.'),
    cloudBtns);

  // la porte des pépins hors partie : depuis l'accueil comme depuis la pause, les Options mènent ici
  const reportGroup = h('div', { class: 'opt-group' },
    h('h3', {}, icon('icon_info'), 'Pépins et idées'),
    h('p', { class: 'opt-note' }, 'Quelque chose ne va pas, ou tu as une idée ? Dis-le en deux touchers : le jeu joint tout seul l’île, ce que tu venais de faire et l’erreur s’il y en a eu une.'),
    h('div', { class: 'opt-row opt-btnrow' },
      h('span', { class: 'opt-label' }, 'Nous le raconter', h('small', {}, 'Rien ne part sans toi, et rien ne dit qui tu es.')),
      button('Ouvrir', () => game.showReport(() => game.showOptions(onBack)), { cls: 'btn-primary btn-small', iconName: 'icon_info' })));

  const saveGroup = h('div', { class: 'opt-group opt-save' },
    h('h3', {}, icon('icon_save'), 'Sauvegarde'),
    h('p', { class: 'opt-note' }, `Île ${c.unlockedIsland} débloquée · ${c.seeds} graines · ${Object.values(c.stars || {}).reduce((a, b) => a + b, 0)} étoiles.`),
    h('p', { class: 'opt-note' }, 'La progression est gardée dans ce navigateur. Pour ne pas la perdre (changement de téléphone, données de site effacées), télécharge une copie de temps en temps : le jeu te le rappelle.'),
    isIOS ? h('p', { class: 'opt-note opt-warn' }, 'Sur iPhone, Safari peut effacer les données d’un site non ouvert pendant sept jours. Ajoute le jeu à l’écran d’accueil (Partager → « Sur l’écran d’accueil ») : télécharge d’abord ta sauvegarde, puis charge-la dans le jeu installé.') : null,
    h('div', { class: 'opt-row opt-btnrow' }, button('Télécharger ma sauvegarde', download, { cls: 'btn-primary btn-small', iconName: 'icon_save' }), button('Charger une sauvegarde', () => fileInput.click(), { cls: 'btn-small', iconName: 'icon_return' }), fileInput),
    status,
    button('Effacer la progression', () => {
      if (root.querySelector('.confirm')) return;
      const cf = h('div', { class: 'confirm' }, h('span', {}, 'Tout effacer, vraiment ? Étoiles, graines et améliorations seront perdues. '),
        button('Oui, effacer', () => { Save.reset(); game.onSaveReset(); cf.replaceWith(h('p', { class: 'opt-note' }, 'Progression effacée.')); }, { cls: 'btn-danger btn-small', iconName: 'icon_check' }),
        button('Annuler', () => cf.remove(), { cls: 'btn-small' }));
      saveGroup.appendChild(cf);
    }, { cls: 'btn-danger btn-small', iconName: 'icon_cross' }),
  );
  append(root, 
    h('h2', { class: 'panel-title' }, 'Options'),
    h('div', { class: 'opt-cols' },
      h('div', { class: 'opt-col' },
        h('div', { class: 'opt-group' },
          h('h3', {}, icon('icon_audio_on'), 'Son'),
          slider('Volume général', 'master', (v) => AudioSys.setVolume('master', v)),
          slider('Musique', 'music', (v) => AudioSys.setVolume('music', v)),
          slider('Ambiance', 'ambience', (v) => AudioSys.setVolume('ambience', v)),
          slider('Effets', 'sfx', (v) => AudioSys.setVolume('sfx', v)),
          toggle('Couper le son', 'muted', (v) => AudioSys.setMuted(v), 'Touche M à tout moment.'),
        ),
        h('div', { class: 'opt-group' },
          h('h3', {}, icon('icon_contrast'), 'Confort'),
          toggle('Tremblement de l’écran', 'shake', () => {}, 'Secousse sur les grosses primes.'),
          (() => { const sel = h('select', { class: 'opt-select', 'aria-label': 'Notes du coup' }, ...[['auto', 'Automatique'], ['all', 'Toutes'], ['sober', 'Sobres']].map(([v, l]) => h('option', { value: v }, l))); sel.value = Save.options.notes || 'auto'; sel.addEventListener('change', () => { Save.options.notes = sel.value; Save.save(); AudioSys.play('ui_click', { volume: 0.4 }); }); return h('div', { class: 'opt-row opt-btnrow' }, h('span', { class: 'opt-label' }, 'Notes du coup', h('small', {}, 'À chaque pose, une note par point marqué (toutes) ou trois notes au plus (sobres). Automatique : sobres sur téléphone.')), sel); })(),
          toggle('Vibrations', 'haptics', () => {}, 'Une pulsation brève à la fermeture d’une région et au coup de maître (téléphone).'),
          toggle('Mode repos', 'rest', () => {}, 'Après huit secondes sans geste, l’interface s’efface et la vue respire. Tout geste la rétablit.'),
          toggle('Fiche de la tuile à poser', 'tileHelp', () => {}, 'Nom, effet et paires de la tuile en cours, affichés en jeu (touche H).'),
          toggle('Grille discrète', 'grid', () => {}, 'Dessine un fin contour sur les tuiles posées (par défaut, les sols se fondent sans trait).'),
          (() => { const sel = h('select', { class: 'opt-select', 'aria-label': 'Relevé de saison' }, ...[['auto', 'Automatique'], ['full', 'Complet'], ['brief', 'Bref'], ['none', 'Aucun']].map(([v, l]) => h('option', { value: v }, l))); sel.value = Save.options.recap || 'auto'; sel.addEventListener('change', () => { Save.options.recap = sel.value; Save.save(); AudioSys.play('ui_click', { volume: 0.4 }); }); return h('div', { class: 'opt-row opt-btnrow' }, h('span', { class: 'opt-label' }, 'Relevé de saison', h('small', {}, 'Au changement de saison, les points volent des tuiles vers le compteur. En plus : complet (les gains ligne à ligne, un toucher le replie), bref (le total seulement), aucun. Automatique : bref.')), sel); })(),
          toggle('Afficher les images par seconde', 'showFps', (v) => game.setFpsVisible(v)),
          h('div', { class: 'opt-row opt-btnrow' }, h('span', { class: 'opt-label' }, 'Affichage', h('small', {}, 'Le jeu s’adapte à la fenêtre ; le plein écran masque le navigateur.')), button('Plein écran', () => game.toggleFullscreen(), { iconName: 'icon_fullscreen', cls: 'btn-small' })),
        ),
      ),
      h('div', { class: 'opt-col' }, reportGroup, testGroup, cloudGroup, saveGroup),
    ),
    h('div', { class: 'panel-actions' }, button('Retour', onBack, { iconName: 'icon_return' })),
  );
  refreshCloud();
  return root;
}
