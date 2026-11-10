// Lac Tranquille — le village : habitants (PNJ), économie (cours du poisson, banque, bric-à-brac),
// textes des dialogues et de la cinématique d'ouverture, décors en pixel art.
// Chargé après pixel.js, world.js et character.js (utilise makeCanvas, pxRect, shadeHex, WITCH, itemValue…).
'use strict';

const VILLAGE_NAME = 'Saint-Aubin-du-Lac';

// ===========================================================================
// Économie
// ===========================================================================
// Cours du poisson : marche aléatoire quotidienne qui revient doucement vers 100.
// Il fixe le prix de rachat du poissonnier et le taux d'intérêt de la banque.
const MARKET = { base: 100, min: 40, max: 250, vol: 0.08, revert: 0.12, history: 30 };
// Banque : 0,4 % par jour au cours de 100, proportionnel au cours, plafonné par jour
const BANK = { rate: 0.004, maxInterest: 5000 };
const bankRate = (index) => (BANK.rate * index) / 100;
// Bourriche (poissons gardés pour la vente) : la cale grandit avec le bateau
const keepnetCap = (boatLevel) => 20 + (boatLevel - 1) * 20;
// Bric-à-brac : stock d'objets renouvelé chaque jour, plus fourni et plus rare avec le bateau
const BRIC = { markup: 3 };
const bricStockSize = (boatLevel) => 2 + boatLevel * 2;          // 4 → 12 objets
const bricMaxTier = (boatLevel) => Math.min(4, boatLevel);       // rareté maximale proposée
const bricPrice = (it) => itemValue(it) * BRIC.markup;

// ===========================================================================
// Habitants. intro : présentation à la première visite ; greet : salutations ensuite.
// Dans les textes, {nom} est remplacé par le nom du personnage.
// look : apparence (voir character.js) utilisée pour le portrait ; la sorcière a son icône.
// ===========================================================================
const NPCS = [
  {
    id: 'fish', name: 'Gaston Maquereau', role: 'Poissonnier', building: 'Poissonnerie',
    look: { sex: 'homme', skin: '#dca677', hair: 'court', hairColor: '#4a2e1a', beard: 'barbe', hat: 'casquette', hatColor: '#f0ece0', shirtStyle: 'salopette', shirt: '#f0ece0', pants: '#3a72c8' },
    intro: [
      'Hé, {nom} ! Gaston Maquereau, poissonnier. Ton grand-père me vendait les plus belles truites du lac.',
      'Tout ce que tu pêches, je te le rachète. Garde tes prises dans ta bourriche et apporte-les-moi.',
      "Mon prix suit le cours du poisson, celui qu'affiche la banque. Vends quand ça monte, patiente quand ça descend !",
      "Et si tu m'amènes des… choses bizarres, je ne pose pas de questions. Elles se vendent très bien, va savoir pourquoi.",
    ],
    greet: [
      "Alors {nom}, qu'est-ce que tu m'apportes aujourd'hui ?",
      'Le poisson est frais ? Montre voir.',
      "Pose ça sur l'étal, je sors la balance.",
      "Ça sent bon le lac, tout ça. Bon… surtout le lac.",
    ],
  },
  {
    id: 'bank', name: 'Augustin Lescale', role: 'Banquier', building: 'Banque',
    look: { sex: 'homme', skin: '#f2c497', hair: 'rase', hairColor: '#d8d8d8', beard: 'moustache', hat: 'aucun', hatColor: '#2a2a30', shirtStyle: 'uni', shirt: '#2a2a30', pants: '#2a2a30' },
    intro: [
      "Ah, un nouveau visage ! Augustin Lescale, banquier de ce village depuis… toujours, me semble-t-il.",
      'Déposez vos pièces chez moi : elles travaillent pendant que vous pêchez. Je verse des intérêts chaque jour.',
      'Le taux dépend du cours du poisson. Quand le poisson se vend cher, le village est riche… et je partage.',
      'Le tableau derrière moi affiche le cours, jour après jour. Je vous conseille de le surveiller.',
    ],
    greet: [
      'Bonjour, {nom}. Vos économies se portent à merveille.',
      'Un dépôt ? Un retrait ? Je suis tout à vous.',
      "Le cours du jour est au tableau. Le poisson, c'est de l'or qui nage.",
      "Prenez votre temps. L'argent, lui, n'est jamais pressé.",
    ],
  },
  {
    id: 'bric', name: 'Josette Fatras', role: 'Brocanteuse', building: 'Bric-à-brac',
    look: { sex: 'femme', skin: '#f8dcc0', hair: 'chignon', hairColor: '#d8d8d8', beard: 'aucune', hat: 'aucun', hatColor: '#c0508a', shirtStyle: 'carreaux', shirt: '#c0508a', pants: '#7a4ab0' },
    intro: [
      'Entrez, entrez ! Attention à la pile de casseroles. Josette Fatras, pour vous servir.',
      'Ici on trouve de tout : cannes, appâts, caisses… et des objets que je déniche je ne sais où.',
      "Mon stock change chaque matin. Et plus votre bateau est beau, plus je sors de trésors de l'arrière-boutique !",
    ],
    greet: [
      "Bonjour {nom} ! J'ai reçu de nouvelles choses, regardez donc.",
      "Tout est à vendre. Sauf le chat. Le chat n'est pas à vendre.",
      'Fouillez, fouillez, il y a des merveilles sous la poussière.',
      "Celui-là ? Je l'ai trouvé dans une épave. Il est presque propre.",
    ],
  },
  {
    id: 'yard', name: 'Marcel Calfat', role: 'Charpentier de marine', building: 'Chantier naval',
    look: { sex: 'homme', skin: '#b67c50', hair: 'court', hairColor: '#1e1a18', beard: 'moustache', hat: 'bonnet', hatColor: '#e08a2a', shirtStyle: 'uni', shirt: '#e08a2a', pants: '#5a5a62' },
    intro: [
      "Marcel Calfat. Je répare les coques depuis que j'ai l'âge de tenir un marteau.",
      "La barque de ton grand-père ? Elle flotte encore, c'est un miracle. On peut faire bien mieux.",
      "Achète-moi les pièces, et trouve celle qui manque au fond du lac : il y en a toujours une qu'on ne vend pas en magasin.",
      'Un meilleur bateau, ça veut dire de meilleures cannes et de meilleures caisses chez Josette.',
    ],
    greet: [
      "{nom} ! Ta coque tient le coup ?",
      'Du bois, du clou et de la patience : voilà un bateau.',
      "Je t'ai mis de côté de quoi bricoler.",
      "Le lac use les coques plus vite qu'avant. Bizarre, ça.",
    ],
  },
  {
    id: 'witch', name: WITCH.name, role: 'Sorcière', building: 'Cabane de la sorcière', icon: 'witch',
    intro: [
      'Tiens, tiens… Le petit-enfant du vieux pêcheur. Je t\'attendais, {nom}.',
      "Je suis Morgane des Brumes. Le lac me parle, et ce qu'il raconte n'a rien de tranquille.",
      "Chaque jour, je t'offrirai trois malédictions. Un cadeau… et son prix. Prends-en une, ou aucune.",
    ],
    greet: WITCH.greet,
  },
];
const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n]));

// ===========================================================================
// Plan du village (480×270). Les zones servent aussi à placer les boutons cliquables.
// ===========================================================================
const VILLAGE_SPOTS = [
  { npc: 'bank',  x: 52,  y: 58,  w: 92,  h: 82 },
  { npc: 'bric',  x: 166, y: 52,  w: 84,  h: 88 },
  { npc: 'fish',  x: 272, y: 62,  w: 82,  h: 78 },
  { npc: 'yard',  x: 352, y: 150, w: 112, h: 78 },
  { npc: 'witch', x: 18,  y: 160, w: 88,  h: 74 },
];

// ===========================================================================
// Cinématique d'ouverture. scene : décor (dessiné par game.js), text : narration.
// {nom} : nom du personnage, {pecheur} : « pêcheur », « pêcheuse » ou « pêcheur·euse ».
// ===========================================================================
const INTRO_SCENES = [
  { scene: 'office', text: 'Pendant dix ans, {nom} a rempli des formulaires. En trois exemplaires. Sous les néons d\'un bureau de la grande ville.' },
  { scene: 'office', text: 'Un lundi de pluie, entre deux réunions, {nom} a glissé une lettre de démission sous la porte du chef. Et n\'a pas attendu la réponse.' },
  { scene: 'road',   text: 'Direction le village natal, au bord du lac où grand-père lui avait appris à pêcher. Un endroit qu\'on n\'oublie pas.' },
  { scene: 'village', text: `${VILLAGE_NAME} n'a presque pas changé. La poissonnerie, la banque, le bric-à-brac… et la vieille barque, qui attend toujours au ponton.` },
  { scene: 'eerie',  text: "Le Lac Tranquille. Aussi beau que dans ses souvenirs… Pourtant, l'eau semble plus sombre. Plus profonde. Comme si quelque chose, tout au fond, avait guetté son retour." },
  { scene: 'lake',   text: 'Fini les bureaux. À partir d\'aujourd\'hui, {nom} sera {pecheur}. Le lac, lui, a tout son temps.' },
];

// ===========================================================================
// Décors en pixel art (dessinés une fois, mis en cache par l'appelant)
// ===========================================================================
function vRoof(c, x, y, w, h, col) {
  for (let i = 0; i < h; i++) pxRect(c, x - h + i, y + i, w + 2 * (h - i), 1, i === 0 ? shadeHex(col, 1.3) : i % 3 === 0 ? shadeHex(col, 0.8) : col);
}
function vWindow(c, x, y, lit = false) {
  pxRect(c, x, y, 8, 9, '#3a2a1c');
  pxRect(c, x + 1, y + 1, 6, 7, lit ? '#ffd88a' : '#8ac0e8');
  pxRect(c, x + 4, y + 1, 1, 7, '#3a2a1c');
  pxRect(c, x + 1, y + 4, 6, 1, '#3a2a1c');
}
function vDoor(c, x, y, col = '#6e4422') {
  pxRect(c, x, y, 10, 16, col);
  pxRect(c, x + 1, y + 1, 8, 15, shadeHex(col, 1.2));
  pxRect(c, x + 7, y + 8, 1, 2, '#f5d04a');
}
function vSign(c, x, y, w, col, ink) {
  pxRect(c, x, y, w, 9, col);
  pxRect(c, x, y + 8, w, 1, shadeHex(col, 0.6));
  if (ink) ink(c, x, y);
}
function vTree(c, x, y, r = 9) {
  pxRect(c, x - 2, y, 4, 14, '#6e4422');
  pxDisk(c, x, y - 4, r, '#2f7a2e');
  pxDisk(c, x - 2, y - 6, r - 3, '#3f9a3a');
  pxDisk(c, x - 3, y - 8, 3, '#5cbc4a');
}

// Le village vu de haut (un peu en perspective), avec le lac en bas
function buildVillageArt() {
  const cv = makeCanvas(480, 270);
  const c = cv.getContext('2d');
  ditherGradient(c, 0, 0, 480, 40, ['#5a8fe4', '#a8d2f8', '#d2ecfc']);
  for (let x = 0; x < 480; x++) {                                  // collines
    const h = Math.round(30 + 8 * Math.sin(x * 0.02) + 4 * Math.sin(x * 0.07));
    pxRect(c, x, h, 1, 50 - h, '#3f8a4a');
  }
  pxRect(c, 0, 46, 480, 196, '#6ab04a');                           // herbe
  for (let i = 0; i < 260; i++) {
    const x = (i * 97) % 480, y = 50 + ((i * 53) % 190);
    pxRect(c, x, y, 2, 1, i % 3 ? '#5a9a3e' : '#86c860');
  }
  // chemins
  c.fillStyle = '#c8a06a';
  for (let y = 140; y < 160; y++) pxRect(c, 0, y, 480, 1, (y % 5) ? '#c8a06a' : '#b88e58');
  for (let x = 228; x < 248; x++) pxRect(c, x, 140, 1, 100, x % 5 ? '#c8a06a' : '#b88e58');
  pxRect(c, 300, 158, 90, 10, '#c8a06a');
  // lac et ponton
  ditherGradient(c, 0, 240, 480, 30, ['#86cff2', '#3384c4', '#1b4c86']);
  pxRect(c, 0, 240, 480, 1, '#c4ecff');
  pxRect(c, 226, 232, 24, 30, '#9a6236');
  for (let y = 234; y < 262; y += 4) pxRect(c, 226, y, 24, 1, '#6e4422');
  pxRect(c, 254, 248, 34, 6, '#9a6236');                            // la barque de grand-père
  pxRect(c, 256, 254, 30, 2, '#6e4422');

  // --- banque (pierre, colonnes)
  vRoof(c, 60, 58, 76, 14, '#5a5a6a');
  pxRect(c, 58, 72, 80, 66, '#d8d0c0');
  pxRect(c, 58, 72, 80, 3, '#ece4d4');
  for (const x of [64, 84, 104, 124]) pxRect(c, x, 80, 6, 50, '#ece4d4');
  vDoor(c, 93, 122, '#4a3a2a');
  vSign(c, 74, 75, 48, '#2a2a40', (cc, x, y) => { pxRect(cc, x + 20, y + 2, 8, 5, '#f5d04a'); pxRect(cc, x + 23, y + 2, 2, 5, '#c8962e'); });
  // --- bric-à-brac (façade colorée, auvent rayé)
  vRoof(c, 170, 52, 76, 12, '#8a3a5a');
  pxRect(c, 170, 64, 76, 74, '#e8c890');
  for (let x = 166; x < 250; x += 6) pxRect(c, x, 96, 3, 8, '#c0508a');
  pxRect(c, 166, 96, 84, 2, '#8a3a5a');
  for (let x = 169; x < 250; x += 6) pxRect(c, x, 96, 3, 8, '#f0ece0');
  vWindow(c, 178, 106); vWindow(c, 226, 106);
  vDoor(c, 203, 122, '#5a3a6a');
  vSign(c, 180, 72, 56, '#5a3a6a', (cc, x, y) => { pxDisk(cc, x + 14, y + 4, 3, '#f5d04a'); pxRect(cc, x + 24, y + 3, 10, 3, '#e8a0b0'); pxRect(cc, x + 38, y + 2, 4, 5, '#8ac0e8'); });
  pxRect(c, 252, 124, 8, 14, '#9a6236');                           // tonneau
  pxRect(c, 252, 128, 8, 1, '#5a5a62');
  // --- poissonnerie (bleu et blanc, enseigne poisson)
  vRoof(c, 276, 62, 74, 12, '#2a4a8a');
  pxRect(c, 276, 74, 74, 64, '#f0ece0');
  for (let x = 276; x < 350; x += 8) pxRect(c, x, 74, 4, 64, '#d8e4ec');
  vWindow(c, 284, 98); vWindow(c, 334, 98);
  vDoor(c, 308, 122, '#2a4a8a');
  vSign(c, 290, 80, 46, '#3a72c8', (cc, x, y) => { pxEllipse(cc, x + 23, y + 4, 9, 3, '#c8d4dc'); pxRect(cc, x + 11, y + 2, 3, 5, '#a8b4bc'); pxRect(cc, x + 28, y + 3, 1, 1, '#1e140c'); });
  pxRect(c, 286, 130, 18, 8, '#8a5a32');                            // étal
  for (const x of [288, 293, 298]) pxEllipse(c, x, 129, 2, 1, '#aeb9bd');
  // --- chantier naval (hangar en bois, coque sur cales)
  vRoof(c, 362, 150, 92, 14, '#7a4a24');
  pxRect(c, 362, 164, 92, 60, '#a8703c');
  for (let x = 362; x < 454; x += 6) pxRect(c, x, 164, 1, 60, '#8a5a32');
  pxRect(c, 392, 182, 34, 42, '#3a2a1c');                           // grande porte ouverte
  pxRect(c, 396, 200, 26, 8, '#c64a35');                            // coque en réparation
  pxRect(c, 398, 208, 22, 3, '#8e2f22');
  vSign(c, 380, 168, 56, '#5e3a1e', (cc, x, y) => { pxRect(cc, x + 18, y + 2, 20, 1, '#d8c49a'); pxRect(cc, x + 26, y + 3, 4, 4, '#d8c49a'); });
  for (const x of [366, 446]) pxRect(c, x, 226, 4, 12, '#6e4422');
  // --- cabane de la sorcière (bois noir, toit de chaume, fenêtre verte)
  vRoof(c, 30, 172, 64, 16, '#4a3a2a');
  pxRect(c, 30, 188, 64, 44, '#3a2e30');
  for (let y = 190; y < 232; y += 5) pxRect(c, 30, y, 64, 1, '#2a2024');
  pxRect(c, 40, 198, 10, 9, '#1a1018');
  pxRect(c, 41, 199, 8, 7, '#7af0a0');
  vDoor(c, 62, 216, '#2a1e2a');
  pxRect(c, 82, 160, 6, 14, '#2a2024');                             // cheminée
  pxDisk(c, 100, 228, 5, '#4a2a5a');                                // chaudron
  pxRect(c, 96, 224, 9, 2, '#7af0a0');
  // arbres
  for (const [x, y, r] of [[14, 120, 9], [160, 180, 8], [196, 196, 9], [470, 110, 10], [356, 110, 8], [120, 196, 7], [300, 196, 8]]) vTree(c, x, y, r);
  pixelize(cv, null);
  return cv;
}

// Bureau en ville (cinématique) : néons, ordinateur, piles de dossiers, pluie à la fenêtre
function buildOfficeArt() {
  const cv = makeCanvas(480, 270);
  const c = cv.getContext('2d');
  pxRect(c, 0, 0, 480, 270, '#8a9094');
  pxRect(c, 0, 0, 480, 150, '#a8b0b4');
  for (let x = 0; x < 480; x += 24) pxRect(c, x, 0, 1, 150, '#9aa2a6');
  pxRect(c, 0, 150, 480, 4, '#6a7074');
  for (let y = 154; y < 270; y += 10) pxRect(c, 0, y, 480, 1, '#7a8084');   // moquette
  pxRect(c, 300, 30, 140, 90, '#3a4250');                                  // fenêtre
  pxRect(c, 304, 34, 132, 82, '#5a6878');
  for (const [x, w, h] of [[310, 18, 50], [334, 26, 70], [366, 14, 40], [384, 30, 60], [418, 14, 46]]) pxRect(c, x, 116 - h, w, h, '#3e4654');
  pxRect(c, 368, 34, 2, 82, '#3a4250');
  pxRect(c, 304, 74, 132, 2, '#3a4250');
  for (const x of [60, 200, 340]) { pxRect(c, x, 8, 80, 4, '#f0f4f8'); pxRect(c, x, 12, 80, 1, '#c8ccd0'); }   // néons
  pxRect(c, 40, 170, 230, 12, '#8a6a4a');                                  // bureau
  pxRect(c, 40, 182, 230, 70, '#6e5238');
  pxRect(c, 50, 186, 60, 60, '#5e4430');
  pxRect(c, 150, 124, 64, 42, '#2a2e34');                                  // écran
  pxRect(c, 154, 128, 56, 34, '#5a8aa0');
  for (let y = 132; y < 160; y += 4) pxRect(c, 158, y, 30 + ((y * 7) % 18), 1, '#c8e0ec');
  pxRect(c, 176, 166, 12, 4, '#2a2e34');
  for (let i = 0; i < 6; i++) pxRect(c, 60 + i, 160 - i * 6, 46, 6, i % 2 ? '#f4f0e6' : '#e0dccc');   // dossiers
  for (let i = 0; i < 4; i++) pxRect(c, 226, 162 - i * 5, 36, 5, i % 2 ? '#e8d890' : '#f4f0e6');
  pxRect(c, 120, 158, 12, 12, '#e8eef2');                                 // tasse
  pxRect(c, 132, 161, 3, 5, '#e8eef2');
  pxDisk(c, 40, 50, 14, '#f0f4f8');                                        // horloge
  pxDisk(c, 40, 50, 12, '#ffffff');
  pxRect(c, 40, 41, 1, 9, '#1e140c'); pxRect(c, 40, 50, 7, 1, '#1e140c');
  pxRect(c, 90, 40, 70, 50, '#e8eef2');                                    // tableau de chiffres
  for (let i = 0; i < 6; i++) pxRect(c, 96 + i * 10, 80 - (i * 13) % 30, 6, 6 + (i * 13) % 30, '#c64a35');
  return cv;
}

// Route de campagne (cinématique) : couches pour un défilement en parallaxe
function buildRoadArt() {
  const far = makeCanvas(480, 270), near = makeCanvas(480, 270);
  let c = far.getContext('2d');
  ditherGradient(c, 0, 0, 480, 170, ['#3d6ed0', '#7fb2f0', '#d2ecfc']);
  for (let x = 0; x < 480; x++) {
    const m = Math.round(92 - 22 * Math.sin((x / 480) * Math.PI * 4) - 8 * Math.sin((x / 480) * Math.PI * 10));
    pxRect(c, x, m, 1, 170 - m, '#8aa6d6');                       // descend sous les collines (pas de trou)
    pxRect(c, x, m, 1, 2, '#b2c8ec');
  }
  c = near.getContext('2d');
  for (let x = 0; x < 480; x++) {
    const h = Math.round(140 - 14 * Math.sin((x / 480) * Math.PI * 6));
    pxRect(c, x, h, 1, 270 - h, '#4f9a4a');
  }
  pxRect(c, 0, 196, 480, 36, '#5a5a62');                            // route
  for (let x = 0; x < 480; x += 32) pxRect(c, x, 213, 16, 2, '#f0ece0');
  pxRect(c, 0, 194, 480, 2, '#8a8a90');
  pxRect(c, 0, 232, 480, 38, '#5aa048');
  for (let x = 12; x < 480; x += 60) vTree(c, x, 178, 8);
  return { far, near };
}

// Petite voiture pleine de cartons (cinématique)
function buildCarSprite() {
  const cv = makeCanvas(56, 28);
  const c = cv.getContext('2d');
  pxRect(c, 10, 4, 26, 10, '#c64a35');
  pxRect(c, 14, 6, 9, 7, '#8ac0e8');
  pxRect(c, 25, 6, 9, 7, '#8ac0e8');
  pxRect(c, 2, 13, 52, 9, '#c64a35');
  pxRect(c, 2, 13, 52, 2, '#e06a55');
  pxRect(c, 48, 15, 6, 3, '#ffe9a0');
  pxRect(c, 12, 0, 18, 4, '#c8a060');                               // cartons sur le toit
  pxRect(c, 20, 0, 1, 4, '#8a6a3a');
  for (const x of [12, 40]) { pxDisk(c, x, 22, 5, '#1e1e22'); pxDisk(c, x, 22, 2, '#8a929c'); }
  pixelize(cv, '#1e140c');
  return cv;
}
