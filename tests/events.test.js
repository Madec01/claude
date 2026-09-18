// Tests des tuiles d’événement, des rares tardives, de la météo et de l’île du jour (Node, sans navigateur).
import { Island } from '../src/game/island.js';
import { getIsland } from '../src/data/islands.js';
import { dailyDef } from '../src/data/daily.js';
import { STORY } from '../src/data/story.js';
import { RARE } from '../src/data/tiles.js';
let fails = 0; const check = (ok, m) => { if (!ok) { fails++; console.log('KO', m); } else console.log('OK', m); };
for (const r of RARE) check(!!STORY.tiles[r], `texte de la tuile rare ${r}`);
for (const k of Object.keys(STORY.weather)) check(!!STORY.weather[k].rule, `texte météo ${k}`);
const greedy = (isl) => {
  // ouvrage en main : on le pose sur la meilleure tuile (ou on le défausse), puis on continue avec la tuile suivante
  for (let g = 0; g < 4 && isl.current && isl.current.work && !isl.ended; g++) { let bt = null, bs = -Infinity; for (const t of isl.board.tiles.values()) { if (!isl.canBuild(t.q, t.r)) continue; const pv = isl.previewBuild(t.q, t.r); if (pv && pv.total > bs) { bs = pv.total; bt = t; } } if (bt) isl.build(bt.q, bt.r); else if (isl.canDiscard()) isl.discard(); else break; }
  let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } } return best; };
// île 12 : injecter chaque tuile rare et la poser
const isl = new Island(getIsland(12), { upgrades: {} });
const events = []; isl.on((e) => events.push(e));
for (const r of RARE) { isl.queue.inject(isl.queue.makeRare(r), true); const c = greedy(isl); check(!!c, `case légale pour ${r}`); if (c) isl.place(c.q, c.r); }
check(events.some((e) => e.type === 'place' && e.restoredFrom === 'restore'), 'ruine restaurée transformée');
check(isl.freeChoice > 0 || events.some((e) => e.market), 'marché : choix libres accordés');
isl.setGardenTile('forest'); check(isl.queue.list[0].family === 'forest' || isl.freeChoice === 0, 'marché : choix de tuile appliqué');
for (let i = 0; i < 40 && !isl.ended; i++) { const c = greedy(isl); if (!c) break; isl.place(c.q, c.r); }
check(events.some((e) => e.type === 'weather'), 'météo annoncée sur une île tardive');
check(events.some((e) => e.type === 'season' && e.events.some((x) => x.type === 'fete')), 'fête : prime versée à la saison') ;
// activer chaque météo à la main
for (const key of ['storm', 'heat', 'wind', 'blizzard', 'thaw']) { isl.weather = { key, phase: 'announced', at: 0 }; isl.activateWeather(); check(isl.weatherActive(key), `météo ${key} active`); const c = greedy(isl); if (c) isl.place(c.q, c.r); }
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
