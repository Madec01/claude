// Météo : un événement par saison (au plus), annoncé au début de la saison et actif à partir de la mi-saison.
// Les effets de jeu sont appliqués par Island (activateWeather) et par les règles (mods) ; les visuels par le rendu.
export const WEATHER = {
  storm:    { season: 'spring', ambience: 'storm' },
  heat:     { season: 'summer', ambience: 'crickets' },
  wind:     { season: 'autumn', ambience: 'wind' },
  blizzard: { season: 'winter', ambience: 'winter' },
  thaw:     { season: 'winter', ambience: 'stream' },
};

/** Tire un événement pour la saison (ou null). */
export function pickWeather(season, rng, chance = 0.7) {
  const list = Object.keys(WEATHER).filter((k) => WEATHER[k].season === season);
  if (!list.length || rng() > chance) return null;
  return list[Math.floor(rng() * list.length)];
}
