// Les formes d'îles (FORMES dans src/data/islands.js) : croquis et mesures avec le robot fort, contre la même île ronde.
// Usage : node tools/mesure_formes.js croquis [île=11] [formes=toutes|douces|etranges|construites|a,b,c]
//         node tools/mesure_formes.js mesure [îles=7,14,24] [hasards=3] [formes=toutes]
//         node tools/mesure_formes.js difficulte [îles=7,14,24] [hasards=3] [formes=toutes]   (l'écart moyen et le rang qu'il vaut)
// Le croquis : une ligne par r, un caractère par case (« . » la mer, « # » la terre, « H » hameau, « R » roche,
// « h » colline, « ~ » eau posée — lagune ou mare de départ —, « m » marais, « p » prairie, « r » ruine, « + » un gué :
// une case dont le retrait coupe l'île).
// La mesure : médiane sur les hasards du robot de score (et par pose : les formes à roches raccourcissent la file),
// fermetures, part de la faune, plus grande région, rivières et embouchures à la fin, sentiers, fleurs d'harmonie et
// vœux tenus — et l'écart de score avec l'île ronde de même graine (pour une forme qui déplace le départ — l'anneau,
// l'ourlet, l'atoll — : la ronde au même départ déplacé, sinon on mesurerait le déplacement du hameau et pas la forme).
import { campaignIsland, islandOptions } from '../src/data/campaign.js';
import { generateMask, enclosedHoles, FORMES, departsDeForme, composantes } from '../src/data/islands.js';
import { Island } from '../src/game/island.js';
import { playStrong } from '../tests/bot.js';
import { FUSIONS } from '../src/data/tiles.js';
import { rivers } from '../src/game/water.js';
import { computeLinks } from '../src/game/paths.js';
import { neighbors, key, parse } from '../src/game/hex.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const KNOWN = new Set(FUSIONS.map((f) => f.id));
const lance = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);   // lancé tel quel, ou importé (tests) : alors rien ne tourne
const mode = lance ? process.argv[2] || 'croquis' : null;
const listeFormes = (arg) => !arg || arg === 'toutes' ? Object.keys(FORMES) : arg === 'douces' || arg === 'etranges' || arg === 'construites' ? Object.keys(FORMES).filter((f) => FORMES[f].famille === arg.slice(0, -1)) : arg.split(',');

/** La définition d'une île de campagne portant une forme (ou « ronde » : l'île telle quelle ; « ronde@forme » : l'île ronde au départ que cette forme demande). */
export function defAvecForme(n, forme) {
  const base = campaignIsland(n);
  const def = { ...base, start: base.start.map((t) => ({ ...t })), id: `${n}:${forme}`, story: null };
  delete def.signature; delete def.isthme;   // on compare des formes sur une île nue
  if (forme === 'ronde') return def;
  if (forme.startsWith('ronde@')) { def.start = FORMES[forme.slice(6)].depart.map((t) => ({ ...t })); return def; }
  const f = FORMES[forme];
  if (f.depart) def.start = f.depart.map((t) => ({ ...t }));
  if (f.masque || f.avant || f.etire) def.forme = forme;
  if (f.departs) {
    const garde = def.start.map((t) => key(t.q, t.r));
    const mask = generateMask(def.seed, def.cells, { roughness: def.roughness, holes: def.holes, etire: def.etire || 1, garde });
    for (const k of garde) mask.add(k);
    for (const c of enclosedHoles(mask)) mask.add(key(c.q, c.r));
    def.start.push(...departsDeForme(forme, mask, garde));
  }
  return def;
}

/** Les gués : les cases dont le retrait coupe l'île en deux morceaux d'au moins cinq cases (une pointe qui tient par une case n'en est pas un). */
export function gues(mask) { const out = []; for (const k of mask) { const m2 = new Set(mask); m2.delete(k); const c = composantes(m2); if (c.length > 1 && c[1].size >= 5) out.push(k); } return out; }

/** Le croquis d'une île au départ (masque, tuiles posées, gués). */
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
    const f = FORMES[forme]; const comps = composantes(isl.board.mask); const g = gues(isl.board.mask);
    const cs = [...isl.board.mask].map(parse); const larg = Math.max(...cs.map(([q, r]) => q + r / 2)) - Math.min(...cs.map(([q, r]) => q + r / 2)) + 1, haut = (Math.max(...cs.map((c) => c[1])) - Math.min(...cs.map((c) => c[1]))) * 0.866 + 1;
    console.log(`\n=== ${forme}${f ? ` — ${f.nom}` : ''} (île ${n}, ${isl.board.cells} cases pour ${def.cells} demandées, ${comps.length} morceau${comps.length > 1 ? 'x' : ''}, ${g.length} gué${g.length > 1 ? 's' : ''}, ${def.start.length} tuiles de départ, ${larg.toFixed(0)} × ${haut.toFixed(0)}) ===`);
    if (f) console.log(`${f.intention}${f.famille ? ` [${f.famille}, difficulté ${f.difficulte}]` : ''}`);
    console.log(croquis(isl, g));
  }
} else if (mode === 'mesure' || mode === 'difficulte') {
  const iles = (process.argv[3] || '7,14,24').split(',').map(Number);
  const N = Number(process.argv[4] || 3);
  const formes = listeFormes(process.argv[5]);
  const refs = ['ronde', ...formes.filter((f) => FORMES[f].depart).map((f) => `ronde@${f}`)];
  const lignes = []; const ecarts = {};
  for (const n of iles) {
    const ref = {};
    for (const forme of [...refs, ...formes]) {
      const t0 = Date.now();
      const def = defAvecForme(n, forme);
      const parties = []; for (let k = 0; k < N; k++) { const p = jouer(def, k); if (p) parties.push(p); }
      if (!parties.length) { console.error(`île ${n}, ${forme} : aucune partie finie`); continue; }
      const m = {}; for (const c of Object.keys(parties[0])) m[c] = med(parties.map((p) => p[c]));
      if (refs.includes(forme)) ref[forme] = m;
      const base = FORMES[forme] && FORMES[forme].depart ? ref[`ronde@${forme}`] : ref.ronde;
      const ecart = base && !refs.includes(forme) ? Math.round((m.score / base.score - 1) * 100) : 0;
      if (!refs.includes(forme)) (ecarts[forme] = ecarts[forme] || []).push(ecart);
      lignes.push({ île: n, forme, cases: m.cases, poses: m.poses, score: Math.round(m.score), 'écart %': ecart, 'pts/pose': m.parPose.toFixed(1), fermetures: m.fermetures, 'faune %': Math.round(m.faune * 100), 'grande région': m.region, 'rivières': m.rivieres, embouchures: m.embouchures, sentiers: m.sentiers, harmonie: m.harmonie, 'vœux': m.voeux.toFixed(2), morceaux: m.morceaux, s: ((Date.now() - t0) / 1000).toFixed(0) });
      console.error(`île ${n}, ${forme} : ${lignes[lignes.length - 1].s} s`);
    }
  }
  if (mode === 'mesure') {
    console.table(lignes);
    // la même table en Markdown, pour le rapport
    const cols = Object.keys(lignes[0]).filter((c) => c !== 's');
    console.log(`| ${cols.join(' | ')} |\n| ${cols.map(() => '---').join(' | ')} |`);
    for (const l of lignes) console.log(`| ${cols.map((c) => l[c]).join(' | ')} |`);
    console.log('');
  }
  {
    // le rang de difficulté : la moyenne des écarts sur les îles mesurées — aucune à ±5 %, légère jusqu'à 15 %, forte au-delà
    console.log(`| forme | famille | ${iles.map((n) => `île ${n}`).join(' | ')} | moyenne | rang mesuré | rang déclaré |\n| --- | --- | ${iles.map(() => '---').join(' | ')} | --- | --- | --- |`);
    for (const forme of formes) {
      const e = ecarts[forme] || []; const moy = e.reduce((a, b) => a + b, 0) / (e.length || 1); const abs = Math.abs(moy);
      const rang = abs <= 5 ? 'aucune' : abs <= 15 ? 'légère' : 'forte'; const f = FORMES[forme];
      console.log(`| ${forme} | ${f.famille} | ${e.map((x) => (x > 0 ? '+' : '') + x).join(' | ')} | ${(moy > 0 ? '+' : '') + moy.toFixed(1)} | ${rang} | ${f.difficulte}${f.difficulte === rang ? '' : ' ✗'} |`);
    }
  }
} else if (lance) {
  console.error('usage : node tools/mesure_formes.js croquis [île] [formes] | mesure [îles] [hasards] [formes] | difficulte [îles] [hasards] [formes]');
  process.exit(2);
}
