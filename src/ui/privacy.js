// Page « Vie privée » : ce qui est collecté, pourquoi, où, et comment tout effacer.
import { h, button, append } from './dom.js';

export function buildPrivacy({ onBack, onWipe = null }) {
  const root = h('div', { class: 'panel panel-privacy' });
  const line = (t, d) => h('div', { class: 'priv-row' }, h('b', {}, t), h('span', {}, d));
  append(root,
    h('h2', { class: 'panel-title' }, 'Vie privée'),
    h('p', { class: 'ws-intro' }, 'Cent Saisons est un jeu, pas un collecteur de données. Voici tout ce qui existe.'),
    h('div', { class: 'priv-list' },
      line('Si tu joues hors ligne', 'Rien ne sort de ton appareil. Aucune donnée n’est envoyée nulle part.'),
      line('Si tu joues sans compte', 'Ta sauvegarde (îles, étoiles, graines, options) est rangée chez Google, en Europe, sous un identifiant tiré au sort. Aucun nom, aucune adresse.'),
      line('Si tu te connectes avec Google', 'En plus de la sauvegarde, nous recevons ton adresse Google et ton prénom, pour reconnaître ta partie sur tes autres appareils. Rien d’autre, et rien n’est transmis à qui que ce soit.'),
      line('Si tu signales un pépin ou envoies une idée', 'Le rapport part avec ta phrase, l’île en cours, ce que tu venais de faire, ton modèle de téléphone et l’erreur s’il y en a une. Il passe par Google, comme ta sauvegarde, puis arrive dans un carnet privé que seul l’auteur du jeu peut lire, et il est aussitôt effacé de chez Google. Tu vois tout avant d’envoyer, et tu peux retirer la partie. Aucune adresse, aucun nom : rien qui dise qui tu es. La liste de tes envois (le code, la date, ta phrase) reste sur ton appareil, pour que tu les retrouves ; « Pépins et idées » permet de l’oublier d’un toucher.'),
      line('Ce que nous ne faisons pas', 'Aucune publicité, aucun traceur, aucune statistique de fréquentation, aucune revente. Google Analytics est désactivé.'),
      line('Combien de temps', 'Tant que tu joues. Tu peux tout effacer quand tu veux, ci-dessous, et le jeu continue avec la sauvegarde de ton appareil.'),
      line('Où', 'Sur les serveurs de Google (Firebase), en Europe.'),
    ),
    h('div', { class: 'panel-actions' },
      onWipe ? button('Effacer mes données en ligne', onWipe, { cls: 'btn-ghost', iconName: 'icon_trash' }) : null,
      button('Retour', onBack, { cls: 'btn-primary', iconName: 'icon_return' })),
  );
  return root;
}
