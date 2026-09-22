// Configuration Firebase du projet « cent-saisons ».
// Ces clés sont PUBLIQUES par conception : elles identifient le projet, elles ne l'ouvrent pas. Ce qui protège les
// données, ce sont les règles Firestore (un joueur ne lit et n'écrit que sa propre fiche). Elles ont donc leur place ici.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBgMr5wzrBdRGU81YOlKPzd2IHHkfIN_Fs',
  authDomain: 'cent-saisons.firebaseapp.com',
  projectId: 'cent-saisons',
  storageBucket: 'cent-saisons.firebasestorage.app',
  messagingSenderId: '974090860436',
  appId: '1:974090860436:web:e96d274c01df2f72810181',
};

/**
 * Budget d'écriture. Le palier gratuit offre 20 000 écritures et 50 000 lectures par jour, pour TOUS les joueurs
 * ensemble. Une base qui s'écrit à chaque geste les épuise en quelques minutes ; ces plafonds rendent la chose
 * impossible par construction, même en cas de bogue.
 */
export const CLOUD = {
  sdk: 'https://www.gstatic.com/firebasejs/10.14.1',
  collection: 'parties',
  minIntervalMs: 30000,   // jamais deux écritures à moins de trente secondes
  maxPerSession: 30,      // au-delà, le nuage se tait pour la session
  maxPerDay: 200,         // au-delà, il se tait jusqu'au lendemain (compté sur l'appareil)
  maxBytes: 180000,       // une fiche plus grosse n'est pas envoyée (la règle Firestore refuse au-delà de 200 Ko)
  timeoutMs: 12000,       // au-delà, on abandonne et on garde le local

  // Les pépins et les idées : UNE écriture par rapport, sur demande explicite du joueur, dans une collection à
  // part — jamais dans `parties`. Le jeu n'en lit aucun ; c'est le relevé (hors du jeu) qui les ramasse et les
  // efface. `pepins: false` coupe l'envoi en un commit, sans toucher au reste.
  pepins: true,
  pepinsCollection: 'pepins',
  pepinsMaxParJour: 5,    // par appareil : un doigt qui s'emballe ne peut pas entamer le budget de la sauvegarde

  // L'état des rapports, dans l'autre sens : UN document public que la relève réécrit et que le jeu lit, au plus
  // une fois par jour et par appareil. Il ne porte que des codes et des états — jamais le titre d'un pépin ni la
  // phrase du joueur, qui n'ont rien à faire sur un document ouvert à tous (c'est pour ça que le carnet est privé).
  // `etats: false` coupe la lecture en un commit : le jeu retombe sur ce que l'appareil sait, comme avant.
  etats: true,
  etatsCollection: 'etats',
  etatsDoc: 'tableau',
  etatsFraisMs: 20 * 3600 * 1000,   // au-delà on relit : une lecture par appareil et par jour, sur 50 000
};
