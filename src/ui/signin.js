// Écran de connexion, au premier lancement : sans compte, avec Google, ou hors ligne. Le choix est retenu.
import { h, button, icon, append } from './dom.js';

export function buildSignIn({ onAnon, onGoogle, onNone, onPrivacy, busy = null }) {
  const root = h('div', { class: 'panel panel-signin' });
  const msg = h('p', { class: 'signin-msg hidden' });
  const setBusy = (text) => { msg.textContent = text || ''; msg.classList.toggle('hidden', !text); root.querySelectorAll('button').forEach((b) => { b.disabled = !!text; }); };
  const go = (fn) => async () => { setBusy('Connexion…'); const err = await fn(); if (err) setBusy(''), fail(err); };
  const failEl = h('p', { class: 'signin-err hidden' });
  const fail = (t) => { failEl.textContent = t; failEl.classList.remove('hidden'); };

  append(root,
    h('h2', { class: 'panel-title' }, 'Bienvenue sur l’archipel'),
    h('p', { class: 'ws-intro' }, 'Ta partie peut être gardée en ligne, pour la retrouver plus tard et sur tes autres appareils. À toi de choisir comment.'),
    h('div', { class: 'signin-list' },
      h('button', { class: 'signin-card primary', type: 'button', onclick: go(onGoogle) },
        icon('icon_check'), h('div', {}, h('b', {}, 'Continuer avec Google'), h('span', {}, 'Ta partie te suit sur tous tes appareils. Nous ne voyons que ton adresse et ton prénom.'))),
      h('button', { class: 'signin-card', type: 'button', onclick: go(onAnon) },
        icon('icon_play'), h('div', {}, h('b', {}, 'Jouer sans compte'), h('span', {}, 'Rien à donner. Ta partie est gardée en ligne, mais liée à cet appareil : tu pourras ajouter Google plus tard sans rien perdre.'))),
      h('button', { class: 'signin-card ghost', type: 'button', onclick: go(onNone) },
        icon('icon_home'), h('div', {}, h('b', {}, 'Hors ligne seulement'), h('span', {}, 'Rien n’est envoyé. La partie reste sur cet appareil, comme avant.'))),
    ),
    msg, failEl,
    h('p', { class: 'signin-foot' }, 'Ce choix est retenu ; tu peux en changer à tout moment dans les Options. ',
      h('button', { class: 'linkish', type: 'button', onclick: () => onPrivacy && onPrivacy() }, 'Vie privée')),
  );
  root.setBusy = setBusy; root.fail = fail;
  if (busy) setBusy(busy);
  return root;
}
