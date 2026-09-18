// Climats : chacun change la file (campaign.js), donne un avantage permanent et une contrainte. Tempéré = référence.
export const CLIMATES = {
  temperate: { id: 'temperate', weatherChance: 0.7 },
  hot: {
    id: 'hot', weatherChance: 0.7,
    waterPlaced: 2,          // chaque tuile d'eau posée rapporte +2 (« soleil »)
    pondSeason: 1,           // un étang rapporte +1 de plus par saison
    orchardEdge: 1,          // les bords d'un verger valent +1 (fruits du Sud)
    dryEarly: true,          // les prés loin de l'eau sèchent dès le printemps
    noFreeze: true,          // pas de gel, donc pas de veillée
    longSeason: 'summer',    // l'été dure deux saisons
    tint: 'rgba(255, 214, 150, 0.42)', sea: ['#86cbe7', '#4a9bcc'],
  },
  humid: {
    id: 'humid', weatherChance: 0.95,
    meadowNeverDries: true,  // les prés ne sèchent jamais
    riverPlus: 1, lakePlus: 1,
    hamletMarsh: -2,         // hameau contre marais vaut −2 (moustiques)
    linkMax: 2,              // sentiers de deux cases au plus
    tint: 'rgba(190, 236, 205, 0.40)', sea: ['#7fb9cf', '#4d87a8'],
  },
  cold: {
    id: 'cold', weatherChance: 0.7,
    veilleePlus: 1,          // veillée +1 par paire
    firewood: 1,             // chaque forêt qui touche un hameau rapporte +1 chaque hiver
    fieldsDormantAutumn: true, // les champs dorment dès l'automne
    noBloom: true,           // pas de floraison au printemps
    longSeason: 'winter',    // deux hivers par cycle
    tint: 'rgba(205, 226, 255, 0.46)', sea: ['#a3c3dd', '#6f97b8'],
  },
};
export const climateOf = (id) => CLIMATES[id] || CLIMATES.temperate;
