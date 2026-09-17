// Tests des tuiles d’événement, des rares tardives, de la météo et de l’île du jour (Node, sans navigateur).
import { Island } from '../src/game/island.js';
import { getIsland } from '../src/data/islands.js';
import { dailyDef } from '../src/data/daily.js';
import { STORY } from '../src/data/story.js';
import { RARE } from '../src/data/tiles.js';
let fails = 0; const check = (ok, m) => { if (!ok) { fails++; console.log('KO', m); } else console.log('OK', m); };
for (const r of RARE) check(!!STORY.tiles[r], `texte de la tuile rare ${r}`);
for (const k of Object.keys(STORY.weather)) check(!!STORY.weather[k].rule, `texte météo ${k}`);
const greedy = (isl) => { let best = null, bs = -Infinity; for (const c of isl.board.legalCells()) { const pv = isl.preview(c.q, c.r); if (pv && pv.total > bs) { bs = pv.total; best = c; } } return best; };
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
console.log(fails ? `${fails} échec(s)` : 'Tous les tests d’événements passent.'); process.exit(fails ? 1 : 0);
