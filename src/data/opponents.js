// Profils des adversaires : précision (0..1), agressivité (probabilité de tirer quand c'est jouable), lancer favori, apparence.
// pointAcc / shootAcc : 1 = parfait. lobSkill : aisance à la plombée. patience : préfère pointer court.
export const OPPONENTS = {
  marius:  { id: 'marius',  name: 'Marius',      pointAcc: 0.80, shootAcc: 0.55, aggression: 0.12, favorite: 'point',   lobSkill: 0.6, patience: 0.9, char: { color: 'white', skin: 0 },  emoteStyle: 'calm' },
  josiane: { id: 'josiane', name: 'Josiane',     pointAcc: 0.62, shootAcc: 0.35, aggression: 0.10, favorite: 'point',   lobSkill: 0.4, patience: 0.5, char: { color: 'red', skin: 1 },    emoteStyle: 'happy' },
  lucien:  { id: 'lucien',  name: 'Lucien',      pointAcc: 0.70, shootAcc: 0.45, aggression: 0.18, favorite: 'halflob', lobSkill: 0.5, patience: 0.7, char: { color: 'blue', skin: 2 },   emoteStyle: 'sly' },
  kevin:   { id: 'kevin',   name: 'Kevin',       pointAcc: 0.50, shootAcc: 0.66, aggression: 0.85, favorite: 'shoot',   lobSkill: 0.3, patience: 0.1, char: { color: 'yellow', skin: 3 }, emoteStyle: 'wild' },
  anselme: { id: 'anselme', name: 'Père Anselme',pointAcc: 0.78, shootAcc: 0.40, aggression: 0.08, favorite: 'lob',     lobSkill: 0.95, patience: 0.95, char: { color: 'white', skin: 4 }, emoteStyle: 'calm' },
  toni:    { id: 'toni',    name: 'Toni',        pointAcc: 0.80, shootAcc: 0.50, aggression: 0.15, favorite: 'point',   lobSkill: 0.6, patience: 0.8, char: { color: 'green', skin: 2 },  emoteStyle: 'happy' },
  nino:    { id: 'nino',    name: 'Nino',        pointAcc: 0.62, shootAcc: 0.78, aggression: 0.7,  favorite: 'shoot',   lobSkill: 0.5, patience: 0.2, char: { color: 'green', skin: 3 },  emoteStyle: 'wild' },
  faure:   { id: 'faure',   name: 'Dr Faure',    pointAcc: 0.86, shootAcc: 0.62, aggression: 0.3,  favorite: 'halflob', lobSkill: 0.8, patience: 0.8, char: { color: 'blue', skin: 1 },   emoteStyle: 'cold' },
  roubaud: { id: 'roubaud', name: 'Mme Roubaud', pointAcc: 0.84, shootAcc: 0.80, aggression: 0.45, favorite: 'point',   lobSkill: 0.7, patience: 0.6, char: { color: 'red', skin: 4 },    emoteStyle: 'cold' },
  gaby:    { id: 'gaby',    name: 'Gaby',        pointAcc: 0.88, shootAcc: 0.76, aggression: 0.4,  favorite: 'halflob', lobSkill: 0.85, patience: 0.6, char: { color: 'yellow', skin: 1 }, emoteStyle: 'happy' },
  gerard:  { id: 'gerard',  name: 'Gérard',      pointAcc: 0.86, shootAcc: 0.90, aggression: 0.65, favorite: 'shoot',   lobSkill: 0.7, patience: 0.4, char: { color: 'blue', skin: 0 },   emoteStyle: 'proud' },
  gerard2: { id: 'gerard2', name: 'Gérard',      pointAcc: 0.90, shootAcc: 0.93, aggression: 0.7,  favorite: 'shoot',   lobSkill: 0.8, patience: 0.4, char: { color: 'blue', skin: 0 },   emoteStyle: 'proud' },
};

export const PLAYER_CHAR = { color: 'red', skin: 0 };

export const getOpponent = (id) => OPPONENTS[id];
