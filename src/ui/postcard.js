// Aperçu de la carte postale : l'image, Télécharger, Partager (téléphone, quand le navigateur sait partager un fichier), Retour.
import { h, button, append } from './dom.js';

/**
 * Enregistre la carte : partage sur téléphone quand le navigateur le permet (la feuille de partage,
 * qui sait aussi « enregistrer l'image »), téléchargement sinon. Servi par la tournée finale.
 */
export function exporterCarte(canvas, filename) {
  return new Promise((res) => canvas.toBlob(async (blob) => {
    const url = URL.createObjectURL(blob);
    try {
      if (typeof navigator.canShare === 'function' && typeof File === 'function') {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Cent Saisons' }); } catch (_) { /* annulé */ } res(); return; }
      }
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    } finally { setTimeout(() => URL.revokeObjectURL(url), 2000); res(); }
  }, 'image/png'));
}

export function buildPostcard({ canvas, filename, onBack }) {
  const root = h('div', { class: 'panel panel-postcard' });
  const img = h('img', { class: 'postcard-img', alt: 'Carte postale de l’île' });
  let blob = null, url = null;
  const ready = new Promise((res) => canvas.toBlob((b) => { blob = b; url = URL.createObjectURL(b); img.src = url; res(b); }, 'image/png'));
  const canShare = typeof navigator.canShare === 'function' && typeof File === 'function';
  const download = button('Télécharger', async () => { await ready; const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); }, { cls: 'btn-primary', iconName: 'icon_save' });
  const share = canShare ? button('Partager', async () => { await ready; const file = new File([blob], filename, { type: 'image/png' }); if (navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Cent Saisons' }); } catch (_) { /* annulé */ } } else download.click(); }, { iconName: 'icon_next' }) : null;
  append(root,
    h('h2', { class: 'panel-title' }, 'Carte postale'),
    h('p', { class: 'ws-intro' }, 'L’île telle qu’elle est, en grand. À garder, à envoyer.'),
    h('div', { class: 'postcard-wrap' }, img),
    h('div', { class: 'panel-actions' }, download, share, button('Retour', () => { if (url) URL.revokeObjectURL(url); onBack(); }, { cls: 'btn-ghost', iconName: 'icon_return' })),
  );
  root.destroy = () => { if (url) URL.revokeObjectURL(url); };
  return root;
}
