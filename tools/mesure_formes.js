// Les formes d'îles (FORMES dans src/data/islands.js) : croquis et mesures avec le robot fort, contre la même île ronde.
// Usage : node tools/mesure_formes.js croquis [île=11] [formes=toutes]
//         node tools/mesure_formes.js mesure [îles=7,11,19] [hasards=3] [formes=toutes]
// Le croquis : une ligne par r, un caractère par case (« . » la mer, « # » la terre, « H » hameau, « R » roche,
// « h » colline, « ~ » eau posée — lagune ou mare de départ —, « m » marais, « p » prairie, « r » ruine, « + » gué ajouté).
// La mesure : médiane sur les hasards du robot de score (et par pose : les formes à roches raccourcissent la file),
// fermetures, part de la faune, plus grande région, rivières et embouchures à la fin, sentiers, fleurs d'harmonie et
// vœux tenus — et l'écart de score avec l'île ronde de même graine (pour l'anneau : la ronde au même départ déplacé).
import { campaignIsland, islandOptions } from '../src/data/campaign.js';
import { generateMask, enclosedHoles, FORMES, departsDeForme, composantes } from '../src/data/islands.js';
import { Island } from '../src/game/island.js';
import { playStrong } from '../tests/bot.js';
import { FUSIONS } from '../src/data/tiles.js';
import { rivers } from '../src/game/water.js';
import { computeLinks } from '../src/game/paths.js';
import { neighbors, key, parse } from '../src/game/hex.js';

const KNOWN = new Set(FUSIONS.map((f) => f.id));
const mode = process.argv[2] || 'croquis';
const listeFormes = (arg) => (arg && arg !== 'toutes' ? arg.split(',') : Object.keys(FORMES));

/** Le départ que la signature de l'anneau déplacerait sur la couronne (le lac prend le centre, comme « Un lac au milieu »). */
const DEPART_ANNEAU = [{ q: 3, r: -1, family: 'hamlet' }, { q: -3, r: 2, family: 'rock' }];

/** La définition d'une île de campagne portant une forme (ou « ronde » : l'île telle quelle ; « ronde_deplacee » : le départ de l'anneau sur une île ronde). */
export function defAvecForme(n, forme) {
  const base = campaignIsland(n);
  const def = { ...base, start: base.start.map((t) => ({ ...t })), id: `${n}:${forme}`, story: null };
  delete def.signature; delete def.isthme;   // on compare des formes sur une île nue
  if (forme === 'ronde') return def;
  if (forme === 'ronde_deplacee') { def.start = DEPART_ANNEAU.map((t) => ({ ...t })); return def; }
  if (forme === 'anneau') def.start = DEPART_ANNEAU.map((t) => ({ ...t }));
  const f = FORMES[forme];
  if (f.masque || f.avant || forme === 'cote') def.forme = forme;
  if (f.departs) {
    const garde = def.start.map((t) => key(t.q, t.r));
    const mask = generateMask(def.seed, def.cells, { roughness: def.roughness, holes: def.holes, etire: def.etire || 1, garde });
    for (const k of garde) mask.add(k);
    for (const c of enclosedHoles(mask)) mask.add(key(c.q, c.r));
    def.start.push(...departsDeForme(forme, mask, garde));
  }
  return def;
}

/** Le croquis d'une île au départ (masque, tuiles posées). */
export function croquis(isl, gues = []) {
  const b = isl.board; const cs = [...b.mask].map((k) => { const [q, r] = parse(k); return { k, q, r, x2: 2 * q + r }; });
  const rmin = Math.min(...cs.map((c) => c.r)), rmax = Math.max(...cs.map((c) => c.r)), xmin = Math.min(...cs.map((c) => c.x2)), xmax = Math.max(...cs.map((c) => c.x2));
  const CH = { hamlet: 'H', rock: 'R', hill: 'h', water: '~', marsh: 'm', meadow: 'p', ruins: 'r', forest: 'f' };
  const lignes = [];
  for (let r = rmin; r <= rmax; r++) {
    const row = []; for (let p = xmin; p <= xmax; p++) row.push((p - r) % 2 === 0 ? '.' : ' ');
    for (const c of cs) { if (c.r !== r) continue; const t = b.get(c.q, c.r); row[c.x2 - xmin] = t ? (CH[t.family] || 'o') : gues.includes(c.k) ? '+' : '#'; }
    lignes.push(row.join('').replace(/\s+$/, ''));
  }
  return lignes.join('\n');
}

function jouer(def, botSeed) {
  const { result: r, isl } = playStrong(def, { seedOffset: 0, botSeed, known: new Set(KNOWN) });
  if (!r) return null;
  const b = isl.board;
  const riv = rivers(b);
  return { score: r.score, parPose: r.placements ? r.score / r.placements : 0, fermetures: r.stats.closed, faune: r.score ? r.tally.fauna / r.score : 0, region: r.stats.biggestRegion,
    rivieres: riv.length, embouchures: riv.filter((w) => w.mouth).length, sentiers: computeLinks(b).links.length, harmonie: r.harmonie ? r.harmonie.ouvertes : 0,
    voeux: r.wishesTotal ? r.wishesDone / r.wishesTotal : 1, cases: r.cells, poses: r.placements, morceaux: composantes(b.mask).length };
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

if (mode === 'croquis') {
  const n = Number(process.argv[3] || 11);
  for (const forme of ['ronde', ...listeFormes(process.argv[4])]) {
    const def = defAvecForme(n, forme);
    const isl = new Island(def, { ...islandOptions(def) });
    const f = FORMES[forme]; const comps = composantes(isl.board.mask);
    console.log(`\n=== ${forme}${f ? ` — ${f.nom}` : ''} (île ${n}, ${isl.board.cells} cases pour ${def.cells} demandées, ${comps.length} morceau${comps.length > 1 ? 'x' : ''}, ${def.start.length} tuiles de départ) ===`);
    if (f) console.log(f.intention);
    console.log(croquis(isl));
  }
} else if (mode === 'mesure') {
  const iles = (process.argv[3] || '7,11,19').split(',').map(Number);
  const N = Number(process.argv[4] || 3);
  const formes = listeFormes(process.argv[5]);
  const lignes = [];
  for (const n of iles) {
    const ref = {};
    for (const forme of ['ronde', 'ronde_deplacee', ...formes]) {
      const t0 = Date.now();
      const def = defAvecForme(n, forme);
      const parties = []; for (let k = 0; k < N; k++) { const p = jouer(def, k); if (p) parties.push(p); }
      if (!parties.length) { console.error(`île ${n}, ${forme} : aucune partie finie`); continue; }
      const m = {}; for (const c of Object.keys(parties[0])) m[c] = med(parties.map((p) => p[c]));
      if (forme === 'ronde' || forme === 'ronde_deplacee') ref[forme] = m;
      const base = forme === 'anneau' ? ref.ronde_deplacee : ref.ronde;
      const ecart = base && forme !== 'ronde' ? Math.round((m.score / base.score - 1) * 100) : 0;
      lignes.push({ île: n, forme, cases: m.cases, poses: m.poses, score: Math.round(m.score), 'écart %': ecart, 'pts/pose': m.parPose.toFixed(1), fermetures: m.fermetures, 'faune %': Math.round(m.faune * 100), 'grande région': m.region, 'rivières': m.rivieres, embouchures: m.embouchures, sentiers: m.sentiers, harmonie: m.harmonie, 'vœux': m.voeux.toFixed(2), morceaux: m.morceaux, s: ((Date.now() - t0) / 1000).toFixed(0) });
      console.error(`île ${n}, ${forme} : ${lignes[lignes.length - 1].s} s`);
    }
  }
  console.table(lignes);
  // la même table en Markdown, pour le rapport
  const cols = Object.keys(lignes[0]).filter((c) => c !== 's');
  console.log(`| ${cols.join(' | ')} |\n| ${cols.map(() => '---').join(' | ')} |`);
  for (const l of lignes) console.log(`| ${cols.map((c) => l[c]).join(' | ')} |`);
} else {
  console.error('usage : node tools/mesure_formes.js croquis [île] [formes] | mesure [îles] [hasards] [formes]');
  process.exit(2);
}
