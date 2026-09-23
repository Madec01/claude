// Tests des tuiles rares, des surprises de saison et de l’île du jour (Node, sans navigateur).
import { Island } from '../src/game/island.js';
import { getIsland } from '../src/data/islands.js';
import { dailyDef } from '../src/data/daily.js';
import { STORY } from '../src/data/story.js';
import { RARE } from '../src/data/tiles.js';
let fails = 0; const check = (ok, m) => { if (!ok) { fails++; console.log('KO', m); } else console.log('OK', m); };
for (const r of RARE) check(!!STORY.tiles[r], `texte de la tuile rare ${r}`);
const greedy = (isl) => {
  let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } } return best; };
// une rare retirée (audit de simplification) trouvée dans une partie reprise redevient une tuile ordinaire
{
  const { RETIRED_RARE } = await import('../src/data/tiles.js');
  const iR = new Island(getIsland(12), { upgrades: {} });
  const c0 = iR.board.legalCells()[0]; iR.board.place(c0.q, c0.r, { family: 'tavern', variant: 1, rare: true, id: 999 });
  iR.queue.list[0] = iR.queue.makeRare('market');
  const snap = iR.serialize(); const iR2 = new Island(getIsland(12), { upgrades: {} }); iR2.restoreRun(snap);
  const t = iR2.board.get(c0.q, c0.r);
  check(t && t.family === RETIRED_RARE.tavern && !t.rare, `auberge reprise → ${t && t.family}`);
  check(iR2.queue.list[0].family === RETIRED_RARE.market && !iR2.queue.list[0].rare, `marché en file → ${iR2.queue.list[0].family}`);
}
// île 12 : injecter chaque tuile rare et la poser
const isl = new Island(getIsland(12), { upgrades: {} });
const events = []; isl.on((e) => events.push(e));
for (const r of RARE) { isl.queue.inject(isl.queue.makeRare(r), true); const c = greedy(isl); check(!!c, `case légale pour ${r}`); if (c) isl.place(c.q, c.r); }
for (let i = 0; i < 40 && !isl.ended; i++) { const c = greedy(isl); if (!c) break; isl.place(c.q, c.r); }
// l'habillage suit la surprise : une règle de base n'en a pas, les surprises qui en ont un le montrent, sans rien au score
{
  const { RULE_LOOK, BASE_RULE } = await import('../src/game/seasonrules.js');
  for (const r of Object.values(BASE_RULE)) check(!RULE_LOOK[r], `règle de base ${r} : pas d’habillage`);
  for (const [r, look] of Object.entries(RULE_LOOK)) { isl.rule = r; check(isl.look === look && !('weather' in isl.mods) && !('wind' in isl.mods), `surprise ${r} : habillage ${look}, aucun effet sur le score`); }
  check(isl.weather === undefined && isl.activateWeather === undefined, 'plus de météo annoncée ni déclenchée à la mi-saison');
}
// île du jour
const d = dailyDef('2026-09-17'); const d2 = dailyDef('2026-09-17'); check(JSON.stringify(d.wishes) === JSON.stringify(d2.wishes) && d.cells === d2.cells, 'île du jour déterministe');
for (const w of d.wishes) check(!!STORY.wishes[w.id], `texte du vœu du jour ${w.id}`);
const di = new Island(d, { upgrades: {} }); let n = 0; while (!di.ended && n < 200) { const c = greedy(di); if (!c) break; di.place(c.q, c.r); n++; }
const res = di.finish('full'); check(res.stars >= 0 && res.thresholds.length === 3, `île du jour jouée : ${res.score} pts, ${res.stars} étoiles, ${n} poses`);

// ---- règles de saison variables : chaque règle est forcée puis une transition et quelques poses sont jouées
{
  const { SEASON_RULES } = await import('../src/game/seasonrules.js');
  const { STORY: ST } = await import('../src/data/story.js');
  let f2 = 0;
  for (const [season, list] of Object.entries(SEASON_RULES)) for (const rule of list) {
    if (!ST.seasonRules[rule]) { console.log('KO texte règle', rule); f2++; continue; }
    const isl2 = new Island(getIsland(8), { upgrades: {} });
    for (let i = 0; i < 25 && !isl2.ended; i++) { const c = greedy(isl2); if (!c) break; isl2.place(c.q, c.r); }
    // on se place à la saison précédente et on force le tirage vers la règle voulue (0,1 → base, 0,5 → deuxième, 0,9 → troisième)
    const order = ['spring', 'summer', 'autumn', 'winter']; isl2.season = order[(order.indexOf(season) + 3) % 4]; isl2.board.touch();
    const pick = [0.1, 0.5, 0.9][list.indexOf(rule)]; const origNext = isl2.rng.next.bind(isl2.rng); isl2.rng.next = () => pick;
    const before = isl2.score; isl2.inSeason = isl2.seasonLength;
    const c = greedy(isl2); if (c) isl2.place(c.q, c.r);
    isl2.rng.next = origNext;
    for (let i = 0; i < 6 && !isl2.ended; i++) { const cc = greedy(isl2); if (!cc) break; isl2.place(cc.q, cc.r); }
    const ok = isl2.rule === rule && isl2.season === season && Number.isFinite(isl2.score);
    console.log(ok ? 'OK' : 'KO', `règle ${rule} (${season}) : ${isl2.score - before} pts sur la transition et six poses`); if (!ok) f2++;
  }
  if (f2) { console.log(`${f2} échec(s) de règles`); process.exit(1); }
  console.log('Règles de saison : OK');
}
console.log(fails ? `${fails} échec(s)` : 'Tous les tests d’événements passent.'); process.exit(fails ? 1 : 0);
