// Deux parties pour un seul joueur : celle de l'appareil et celle en ligne. Le joueur choisit, rien n'est écrasé sans lui.
import { h, button, append } from './dom.js';
import { summarize } from '../core/cloud.js';

const fmtDate = (t) => (t ? new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'date inconnue');

function card(title, data, when, onPick, best) {
  const s = summarize(data);
  const el = h('button', { class: `conflict-card ${best ? 'best' : ''}`, type: 'button', onclick: onPick },
    h('b', {}, title),
    h('span', { class: 'conflict-when' }, fmtDate(when)),
    h('div', { class: 'conflict-rows' },
      h('div', {}, h('i', {}, 'Étoiles'), h('b', {}, String(s.stars))),
      h('div', {}, h('i', {}, 'Îles ouvertes'), h('b', {}, String(s.islands))),
      h('div', {}, h('i', {}, 'Îles jouées'), h('b', {}, String(s.played))),
      h('div', {}, h('i', {}, 'Graines gagnées'), h('b', {}, String(s.seeds))),
      s.gold ? h('div', {}, h('i', {}, 'Étoiles d’or'), h('b', {}, String(s.gold))) : null),
    best ? h('span', { class: 'conflict-tag' }, 'la plus avancée') : null);
  return el;
}

export function buildCloudConflict({ local, remote, localAt, remoteAt, onKeepLocal, onKeepRemote }) {
  const root = h('div', { class: 'panel panel-conflict' });
  const l = summarize(local), r = summarize(remote);
  const localBest = (l.stars - r.stars) || (l.played - r.played) || (l.seeds - r.seeds);
  append(root,
    h('h2', { class: 'panel-title' }, 'Deux parties'),
    h('p', { class: 'ws-intro' }, 'Il y a une partie sur cet appareil et une autre en ligne. Garde celle que tu veux : l’autre sera remplacée.'),
    h('div', { class: 'conflict-list' },
      card('Sur cet appareil', local, localAt, onKeepLocal, localBest > 0),
      card('En ligne', remote, remoteAt, onKeepRemote, localBest < 0)),
    h('p', { class: 'signin-foot' }, 'Si tu hésites, garde la plus avancée : elle est signalée.'),
  );
  return root;
}
