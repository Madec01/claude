// Bilan d'une île.
import { h, button, icon, fmtInt, stagger, append } from './dom.js';
import { STORY } from '../data/story.js';
import { AudioSys } from '../core/audio.js';
import { Save } from '../core/save.js';
import { upgradesAPortee } from '../data/upgrades.js';
import { recordsTempo } from '../data/tempo.js';
import { codeIle } from '../game/brume.js';
import { codeForme } from '../data/formes_mode.js';

export function buildResults({ result, def, onContinue, onRetry, onMenu, onPostcard = null, onWorkshop = null, onRejouer = null, newRecord, seedsGained, daily, memory = [] }) {
  const c = Save.campaign, aPortee = upgradesAPortee(c);
  const { stars, score, thresholds } = result;
  const brume = result.brume || null;
  const tempo = result.island === 'tempo'; const vides = tempo && result.stats.vides;
  const formes = result.island === 'formes';
  const special = result.island === 'infinite' || result.island === 'garden' || tempo || !!brume || formes;
  const name = def && def.story && STORY.islands[def.story] ? STORY.islands[def.story].name : result.island === 'infinite' ? 'Île infinie' : result.island === 'garden' ? 'Jardin' : tempo ? 'Le Souffle court' : (def && def.name) || `Île ${result.island}`;
  const root = h('div', { class: `panel panel-results stars-${stars}` });
  const by = result.dominant && STORY.resultsBy && STORY.resultsBy[result.dominant.family] && STORY.resultsBy[result.dominant.family][stars];
  const lines = by || STORY.results[stars] || [''];
  const line = lines[Math.floor(Math.random() * lines.length)];
  const starsEl = h('div', { class: `stars ${result.gold ? 'gold' : ''}`, 'aria-label': `${stars} étoile(s) sur 3${result.gold ? ', étoile d’or' : ''}` }, ...[0, 1, 2].map((i) => h('span', { class: `star ${i < stars ? 'on' : ''}`, title: `${thresholds[i]} points` }, icon('icon_star'))), result.goldThreshold && stars >= 2 ? h('span', { class: `star gold-star ${result.gold ? 'on' : ''}`, title: `Étoile d’or : ${result.goldThreshold} points` }, icon('icon_star')) : null);   // dès deux étoiles, pour qu'on sache qu'elle existe
  const row = (label, value, cls = '') => h('div', { class: `res-row ${cls}` }, h('span', {}, label), h('b', {}, String(value)));
  append(root, 
    h('div', { class: 'res-kicker' }, special ? (brume ? `Sous la brume · ${(def && def.name) || ''}` : formes ? `Terres étranges · ${(def && def.name) || ''}` : result.island === 'infinite' ? `Île infinie · ${result.seasons} saisons` : tempo ? (def && def.entrainement ? 'Le Souffle court · entraînement' : def && def.defi ? `Le Souffle court · défi du jour · ${result.cells} cases · 5 s` : `Le Souffle court · ${result.cells} cases · île n° ${(def && def.seed) || '?'} · ${(def && def.cadran) || 3} s`) : 'Jardin') : result.island === 'daily' ? name : `Île ${result.island} · ${name}`),
    h('h2', { class: 'panel-title' }, special ? 'L’île se repose' : stars === 0 ? 'L’île attend encore' : 'L’île se souvient'),
    special ? null : starsEl,
    h('p', { class: 'res-line' }, line),
    // le souvenir de l'île se lit ici : il avait son propre écran, entre le bilan et l'Atelier
    memory.length ? h('div', { class: 'res-memory' }, h('div', { class: 'res-memory-k' }, 'Souvenir'), ...memory.map((t) => h('p', {}, t))) : null,
    !special && result.goldThreshold && stars >= 2 ? h('p', { class: 'res-gold' }, result.gold ? 'Étoile d’or : la mémoire de l’île est complète.' : stars >= 3 ? `L’étoile d’or attend ${result.goldThreshold} points.` : `Au-delà des trois étoiles il en existe une quatrième : l’étoile d’or, à ${result.goldThreshold} points. Elle vaut une graine et fait briller l’île sur la carte.`) : null,
    h('div', { class: 'res-grid' },
      row('Points', fmtInt(score), 'score'),
      special ? null : row('Seuils', thresholds.join(' · ')),
      row('Tuiles posées', `${result.filled} / ${result.cells}`),
      tempo ? row('Meilleure série', result.stats.bestSerie || 0, result.stats.bestSerie >= 10 ? 'gold' : result.stats.bestSerie >= 3 ? 'good' : '') : null,
      tempo ? row('Tuiles perdues', result.stats.lost || 0, result.stats.lost ? 'bad' : 'good') : null,
      tempo && result.objectif ? row(`Objectif · ${result.objectif.nom}`, result.objectif.atteint ? 'atteint' : 'manqué', result.objectif.atteint ? 'good' : 'bad') : null,
      vides && vides.vides ? row('Cases vides', `${vides.vides} (−${vides.total})${vides.bloquent ? ` · ${vides.bloquent} bloquaient une région` : ''}${vides.regions ? ` · ${vides.regions} région${vides.regions > 1 ? 's' : ''} vide${vides.regions > 1 ? 's' : ''}` : ''}`, 'bad') : null,
      row('Régions closes', result.stats.closed, result.stats.closed ? 'good' : ''),
      row('Plus grande région', result.stats.biggestRegion),
      result.stats.level3 ? row('Tuiles de niveau 3', result.stats.level3, 'gold') : null,
      result.stats.fusions ? row('Fusions', result.stats.fusions, 'gold') : null,
      result.stats.built ? row('Tuiles bâties', `${result.stats.built}${result.stats.restored ? ` (${result.stats.restored} friche${result.stats.restored > 1 ? 's' : ''} réparée${result.stats.restored > 1 ? 's' : ''})` : ''}`, 'good') : null,
      result.stats.perfect ? row('Coups parfaits', result.stats.perfect, 'good') : null,
      row('Animaux (au plus)', result.stats.faunaMax, result.stats.faunaMax ? 'good' : ''),
      result.wishesTotal ? row('Vœux exaucés', `${result.wishesDone} / ${result.wishesTotal}`, result.wishesDone === result.wishesTotal ? 'gold' : '') : null,
      // l'harmonie : les trois fleurs s'ouvrent l'une après l'autre ; les toucher déplie où l'on en est de chaque objectif
      result.harmonie ? blocHarmonie(result.harmonie) : null,
      brume ? row('Cases dévoilées', `${brume.devoilees} / ${brume.depart}`, brume.restantes.length ? '' : 'good') : null,
      brume && (brume.justes + brume.fausses) ? row('Jalons justes', `${brume.justes} / ${brume.justes + brume.fausses}`, brume.justes ? 'good' : '') : null,
      brume && brume.tresor ? row('Trésor', (STORY.tiles[brume.tresor] || {}).name || brume.tresor, 'gold') : null,
      brume && brume.restantes.length ? row('Restées sous la brume', `${brume.restantes.length} (${brume.penalite})`) : null,
      brume && def && def.seed ? row('Code de l’île', codeIle(def.brume, def.seed), 'code') : null,
      formes && def ? row('Record sur cette forme', ((Save.data.formes || {}).records || {})[def.forme] || result.score, newRecord ? 'gold' : '') : null,
      formes && def ? row('Code de l’île', codeForme(def.forme, def.seed), 'code') : null,   // à partager : même code, même brume, même première main
      row('Saisons traversées', result.seasons),
      seedsGained ? row('Graines gagnées', `+${seedsGained}`, 'gold') : null,
      daily ? row('Meilleur du jour', daily.best, 'gold') : null,
      daily ? row('Jours d’affilée', daily.streak) : null,
    ),
    result.tally ? whyBlock(result) : null,
    // sans étoile, l'île est terminée quand même : plus personne n'est muré sur une île (les étoiles ne gardent que les portes de chapitre)
    !special && !daily && stars === 0 ? h('p', { class: 'res-note' }, 'L’île est terminée : la suivante s’ouvre quand même. Les étoiles ne gardent que les portes de chapitre, et elles se rattrapent quand tu veux.') : null,
    tempo ? h('p', { class: 'res-note' }, def && def.tuto ? 'Entraînement avec le tutoriel : le temps s’arrêtait sous les cartes, cette partie ne fait pas de record.' : def && def.defi ? (() => { const tp = recordsTempo(Save.data.tempo || {}); const b = ((tp.defi || {}).best || {})[def.defi]; return `Le défi du jour : la même île pour tout le monde, un record par jour${b ? ` — le tien aujourd’hui : ${b}` : ''}. Demain, une autre île.`; })() : (() => { const tp = recordsTempo(Save.data.tempo || {}); const cad = (def && def.cadran) || 3; return `Le Souffle court : une île neuve à chaque partie, un meilleur score par temps choisi${tp.bests[cad] ? ` — le tien à ${cad} s : ${tp.bests[cad]}` : ''}.`; })()) : daily ? h('p', { class: 'res-note' }, 'Île du jour : la même île pour tout le monde, un meilleur score par jour. Demain, une autre île.') : special ? null : h('p', { class: 'res-note' }, Save.options.testMode ? 'Mode test : les graines et les étoiles ne sont pas enregistrées.' : aPortee.length ? `Tes ${c.seeds} graine${c.seeds > 1 ? 's' : ''} paient déjà ${aPortee.length === 1 ? 'une amélioration' : `${aPortee.length} améliorations`} de l’Atelier des saisons${aPortee.length <= 3 ? ` (${aPortee.map((u) => u.name).join(', ')})` : ''} : elles ne servent à rien dans la poche.` : seedsGained ? 'Graines : 1 par nouvelle étoile, 1 par vœu exaucé et 3 pour l’île, la première fois. Elles se dépensent dans l’Atelier des saisons, depuis le menu.' : 'Pas de nouvelle graine : elles viennent des nouvelles étoiles, des vœux exaucés et de la première fois qu’une île est terminée.'),
    newRecord ? h('div', { class: 'res-record' }, 'Nouveau record !') : null,
    h('div', { class: 'panel-actions' },
      button(special ? 'Rejouer' : 'Continuer', onContinue, { cls: 'btn-primary', iconName: 'icon_arrow_right' }),
      // les graines dormaient : le commanditaire lui-même avait oublié l'Atelier. Quand elles paient une amélioration, le bilan le dit par un bouton, pas par une phrase
      onWorkshop && aPortee.length && !special && !Save.options.testMode ? button(`Atelier · ${aPortee.length} à portée`, onWorkshop, { cls: 'btn-atelier', iconName: 'icon_gear', title: `${c.seeds} graine${c.seeds > 1 ? 's' : ''} : ${aPortee.map((u) => u.name).join(', ')}` }) : null,
      tempo && def && !def.entrainement ? button('Rejouer cette île', onRetry, { iconName: 'icon_return', title: 'La même île, le même délai : pour comparer deux plans' }) : formes ? button('Rejouer cette forme', onRetry, { iconName: 'icon_return', title: 'La même île, la même forme : pour battre ton record' }) : special || result.island === 'daily' ? null : button('Rejouer l’île', onRetry, { iconName: 'icon_return' }),
      onRejouer ? button('Revoir la construction', onRejouer, { iconName: 'icon_return', title: 'L’île se rebâtit sous tes yeux, pose après pose, puis la carte revient' }) : null,
      onPostcard ? button('Carte postale', onPostcard, { iconName: 'icon_save' }) : null,
      button('Menu', onMenu, { cls: 'btn-ghost', iconName: 'icon_home' }),
    ),
  );
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => {
    stagger(root, '.res-row', reduced ? 0 : 80);
    if (seedsGained) setTimeout(() => AudioSys.play('seed', { volume: 0.6 }), reduced ? 0 : 500 + starsEl.querySelectorAll('.star.on').length * 380 + 260);   // les graines tintent après les étoiles
    starsEl.querySelectorAll('.star.on').forEach((s, i) => setTimeout(() => { s.classList.add('pop'); AudioSys.play(s.classList.contains('gold-star') ? 'achievement' : `star_${Math.min(3, i + 1)}`, { volume: 0.7 }); }, reduced ? 0 : 500 + i * 380));
  }, 200);
  return root;
}

/** D'où viennent les points : une barre par source, et le meilleur coup de la partie. */
const FLEUR_IMG = { variete: 'obj_flowerBlue', equilibre: 'obj_flowerRed', acheve: 'obj_flowerYellow' };
/**
 * Au bilan, la ligne de l'harmonie : les trois fleurs et le compte. Un toucher déplie, pour chaque fleur, une barre qui
 * dit où l'on en est de l'objectif (la marque dorée est le seuil) et ce qui a manqué ; un second toucher replie.
 */
function blocHarmonie(hr) {
  const pct = (x) => `${Math.round(x * 100)} %`;
  const barre = (f) => {
    // remplissage : la part de l'objectif atteinte ; pour l'équilibre (plus petit vaut mieux), la jauge montre la plus grande région face au plafond
    let rempli, seuil, lu;
    if (f.id === 'variete') { rempli = Math.min(1, f.valeur / Math.max(1, f.seuil + 2)); seuil = f.seuil / Math.max(1, f.seuil + 2); lu = `${f.valeur} famille${f.valeur > 1 ? 's' : ''} tenue${f.valeur > 1 ? 's' : ''} · objectif ${f.seuil}`; }
    else if (f.id === 'equilibre') { rempli = Math.min(1, f.valeur / 0.5); seuil = f.seuil / 0.5; lu = `plus grande région : ${pct(f.valeur)} de l’île · au plus ${pct(f.seuil)}`; }
    else { rempli = Math.min(1, f.valeur); seuil = f.seuil; lu = `${pct(f.valeur)} en régions closes · au moins ${pct(f.seuil)}${f.friches ? ` · ${f.friches} friche${f.friches > 1 ? 's' : ''}` : ''}`; }
    return h('div', { class: `rh-item ${f.ok ? 'on' : ''}` },
      h('div', { class: 'rh-top' }, h('img', { src: `assets/img/deco/${FLEUR_IMG[f.id]}.webp`, alt: '' }), h('b', {}, f.nom), h('span', {}, f.ok ? 'ouverte' : 'fermée')),
      h('div', { class: `rh-bar ${f.id === 'equilibre' ? 'inverse' : ''}` }, h('i', { style: `width:${Math.round(rempli * 100)}%` }), h('em', { style: `left:${Math.round(seuil * 100)}%` })),
      h('small', {}, lu));
  };
  const detail = h('div', { class: 'res-harmo-detail hidden' }, ...hr.fleurs.map(barre));
  const ligne = h('div', { class: `res-row res-harmonie ${hr.ouvertes === 3 ? 'gold' : hr.ouvertes ? 'good' : ''}`, title: 'Toucher : où en est chaque objectif' },
    h('span', {}, 'Harmonie', ...hr.fleurs.map((f, i) => h('img', { class: `res-fleur ${f.ok ? 'on' : ''}`, style: `--i:${i}`, src: `assets/img/deco/${FLEUR_IMG[f.id]}.webp`, alt: f.nom })), h('i', { class: 'rh-plus' }, '›')),
    h('b', {}, `${hr.ouvertes} / 3${hr.total ? ` (+${hr.total})` : ''}`));
  ligne.addEventListener('click', (e) => { e.stopPropagation(); const ouvert = detail.classList.toggle('hidden') === false; ligne.classList.toggle('ouvert', ouvert); });
  return h('div', { class: 'res-harmo-bloc' }, ligne, detail);
}
export const TALLY_LABELS = { harmonie: 'Harmonie (fleurs)', edges: 'Bords et affinités', closes: 'Régions fermées', fauna: 'Faune', wishes: 'Vœux', base: 'Rivières et primes de pose', build: 'Bâtir', fusions: 'Fusions', paths: 'Sentiers entre villages',
  // les primes de saison, une par nature (anciennement toutes sous « Saisons »)
  s_harvest: 'Récoltes', s_veillee: 'Veillées d’hiver', s_bloom: 'Marais en fleurs', s_heather: 'Lande en fleurs', s_pond: 'Étangs', s_mild: 'Hiver doux', s_cold: 'Grand froid', s_firewood: 'Bois de chauffage', s_fair: 'Grande foire', s_hunt: 'Chasse et cueillette', s_rare: 'Tuiles rares', s_level3: 'Niveau 3', s_fusion: 'Fusions (primes de saison)',
  s_route: 'Routes de mer', s_chaine: 'Chaîne de territoire',   // Livre II
  seasons: 'Autres primes de saison', works: 'Ouvrages (anciennes parties)', streak: 'Séries (anciennes parties)',
  // Le Souffle court
  tempo: 'Séries (poses rapides)', s_tempo: 'Saisons comptées double', pleine: 'Saisons sans tuile perdue', vides: 'Cases restées vides',
  // Sous la brume
  brume: 'Brume : jalons, trésor, cases cachées' };
export function tallyLines(tally) {
  const total = Object.values(tally).reduce((a, b) => a + Math.max(0, b), 0) || 1;
  return Object.entries(tally).filter(([, v]) => v).map(([k, v]) => ({ key: k, label: TALLY_LABELS[k] || k, pts: v, share: Math.max(0, v) / total })).sort((a, b) => b.pts - a.pts);
}
function whyBlock(result) {
  const lines = tallyLines(result.tally); if (!lines.length) return null;
  const fam = (f) => (STORY.tiles[f] || {}).name || f; const sn = (k) => (STORY.seasons[k] || { name: k }).name;
  return h('div', { class: 'res-why' }, h('h3', {}, 'D’où viennent les points'),
    ...lines.map((l) => h('div', { class: `why-row ${l.pts < 0 ? 'neg' : ''}` }, h('span', {}, l.label), h('i', { style: `width:${Math.round(l.share * 100)}%` }), h('b', {}, `${l.pts > 0 ? '+' : ''}${l.pts}`))),
    result.bestMove ? h('p', { class: 'why-best' }, `Meilleur coup : +${result.bestMove.pts}, ${fam(result.bestMove.family).toLowerCase()} posé${result.bestMove.closes ? `, ${result.bestMove.closes} région${result.bestMove.closes > 1 ? 's' : ''} fermée${result.bestMove.closes > 1 ? 's' : ''}` : ''} (${sn(result.bestMove.season).toLowerCase()})`) : null);
}
