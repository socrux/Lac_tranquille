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
  { npc: 'bank',  x: 26,  y: 20,  w: 108, h: 82 },
  { npc: 'bric',  x: 186, y: 20,  w: 108, h: 82 },
  { npc: 'fish',  x: 346, y: 20,  w: 108, h: 82 },
  { npc: 'witch', x: 28,  y: 128, w: 92,  h: 78 },
  { npc: 'yard',  x: 314, y: 124, w: 124, h: 90 },
];
// Éléments animés du plan (dessinés par game.js à chaque image) : fumées, lampadaires, fontaine, lac
const VILLAGE_FX = {
  smoke: [{ x: 106, y: 18, col: '#d8dce0' }, { x: 214, y: 18, col: '#d8dce0' }, { x: 88, y: 130, col: '#b07ad8' }, { x: 410, y: 128, col: '#c8ccd0' }],
  lamps: [{ x: 128, y: 92 }, { x: 350, y: 92 }, { x: 196, y: 150 }, { x: 284, y: 150 }],
  fountain: { x: 240, y: 168 },
  waterY: 224,
  windows: [],              // vitres des maisons (remplies par buildVillageArt), allumées la nuit
};

// ===========================================================================
// Cinématique d'ouverture. scene : décor (dessiné par game.js), text : narration.
// {nom} : nom du personnage, {pecheur} : « pêcheur », « pêcheuse » ou « pêcheur·euse ».
// ===========================================================================
const INTRO_SCENES = [
  { scene: 'office', text: 'Pendant dix ans, {nom} a rempli des formulaires. En trois exemplaires. Sous les néons d\'un bureau de la grande ville.' },
  { scene: 'office', text: 'Un lundi de pluie, entre deux réunions, {nom} a glissé une lettre de démission sous la porte du chef. Et n\'a pas attendu la réponse.' },
  { scene: 'road',   text: 'Direction le village natal, au bord du lac où grand-père lui avait appris à pêcher. Un endroit qu\'on n\'oublie pas.' },
  { scene: 'village', text: `${VILLAGE_NAME} n'a presque pas changé. La poissonnerie, la banque, le bric-à-brac… et la vieille barque, qui attend toujours au ponton.` },
  { scene: 'pier',   text: "Au bout du ponton, une silhouette familière agite son vieux bob. « {nom} ! Je savais bien que tu finirais par revenir. »" },
  { scene: 'pier',   text: "Papi Émile n'a pas changé : même chemise à carreaux, même sourire en coin. « Allez, monte dans la barque. On va voir si tu te souviens de ce que je t'ai appris. »" },
  { scene: 'eerie',  text: "Le Lac Tranquille. Aussi beau que dans ses souvenirs… Pourtant, l'eau semble plus sombre. Plus profonde. Comme si quelque chose, tout au fond, avait guetté son retour." },
  { scene: 'lake',   text: 'Fini les bureaux. À partir d\'aujourd\'hui, {nom} sera {pecheur}. Le lac, lui, a tout son temps.' },
];

// ===========================================================================
// Tutoriels
// ===========================================================================
// Grand-père : il apprend à pêcher au joueur au début d'une nouvelle partie (portrait : character.js)
const GRANDPA = {
  id: 'papi', name: 'Papi Émile', role: 'Grand-père',
  look: { sex: 'homme', skin: '#f2c497', hair: 'court', hairColor: '#e8e8e8', beard: 'barbe', hat: 'bob', hatColor: '#6a8a3a', shirtStyle: 'carreaux', shirt: '#a84a2a', pants: '#5a4a3a' },
};

// Pêche d'entraînement, étape par étape. until : ce qui fait passer à l'étape suivante
//   'next' (bouton Suivant), 'cast' (ligne à l'eau), 'bite' (ça mord), 'hook' (poisson ferré),
//   'landed' (poisson sorti de l'eau).
// {nom} : nom du personnage ; {clic} / {Clic} : « clique » ou « touche » (écran tactile) ;
// {maintiens} : « maintiens le clic » ou « garde le doigt appuyé ».
const TUTO_FISH = [
  { until: 'cast',   text: "Bon, on reprend depuis le début. Pour lancer ta ligne, {clic} n'importe où sur le lac." },
  { until: 'bite',   text: "Joli lancer ! Maintenant, patience… Le bouchon va frétiller : ce n'est qu'une touche, on ne bouge pas." },
  { until: 'hook',   text: "Il plonge ! {Clic} tout de suite pour ferrer !" },
  { until: 'landed', text: "Il se débat ! {Maintiens} pour faire monter la barre verte, et garde le poisson dedans. Relâche pour qu'elle redescende." },
  { until: 'next',   text: "Bravo, {nom} ! Ta première prise de l'année. Elle file dans ta bourriche : Gaston, le poissonnier du village, te la rachètera." },
  { until: 'next',   text: "Le reste, les appâts, les caisses, le bateau, tu l'apprendras au fil des jours. Et méfie-toi du lac à la nuit tombée… On raconte des choses." },
];
// Ratés pendant l'entraînement : grand-père explique, puis on relance
const TUTO_RETRY = {
  early: "Trop tôt ! Une touche timide, ce n'est pas une morsure. Attends que le bouchon plonge vraiment. Relance ta ligne.",
  late: "Trop tard, il a lâché l'appât ! Quand le bouchon plonge, {clic} sans attendre. Allez, relance.",
  escaped: "Il s'est échappé… Pas grave, ça arrive aux meilleurs. Garde bien le poisson dans la barre verte. Relance ta ligne.",
};
// Sauvegarde : des flèches montrent où cliquer. target : id de l'élément visé ;
// panel : panneau à ouvrir avant de montrer l'élément.
const TUTO_SAVE = [
  { target: 'btn-save', text: 'Ce bouton sauvegarde votre partie (raccourci : S). La partie part aussi en ligne, pour la retrouver sur un autre appareil.' },
  { target: 'hud-options', text: 'La sauvegarde en ligne se règle dans les Options. Le jeu sauvegarde aussi tout seul, régulièrement.' },
  { target: 'cloud-box', panel: 'options', text: 'Ici, « Afficher ma clé » donne votre clé personnelle. Avec votre pseudo, elle permet de reprendre votre partie sur n\'importe quel appareil : notez-la !' },
];

// ===========================================================================
// Décors en pixel art (dessinés une fois, mis en cache par l'appelant)
// ===========================================================================
// ---------------------------------------------------------------------------
// Direction artistique du village : vue de dessus « trois quarts », fixe, en tuiles de 16 px,
// dans l'esprit des villes de RPG en pixel art (dessin original).
//  - lumière en haut à gauche, ombres portées vers le bas-droite (noir à 25 %) ;
//  - un seul contour sombre (VPAL.out) autour des objets ;
//  - 3 tons par matière (ombre, base, lumière), palette fraîche et saturée.
// ---------------------------------------------------------------------------
const VT = 16;
const VCOLS = 30, VROWS = 17;
const VPAL = {
  out: '#2a2230',
  grass: '#84c46a', grassD: '#68a854', grassL: '#a8dc8a',
  dark: '#5e7e5a', darkD: '#486446', darkL: '#7a9a6c',
  tall: '#4e9a48', tallD: '#3a7c38', tallL: '#78c060',
  path: '#e4cc94', pathD: '#c4a46c', pathL: '#f4e0b0',
  stone: '#d2cab8', stoneD: '#a89e8a', stoneL: '#ece6d8',
  sand: '#f0dea0', sandD: '#d8c07c',
  water: '#4c9ee2', waterD: '#3a82c6', waterL: '#92d0f6', foam: '#eef8ff',
  wood: '#a86e3c', woodD: '#764a28', woodL: '#cc945a',
  leaf: '#3e8c46', leafD: '#2a6634', leafL: '#5eae58', leafH: '#90cc6c', trunk: '#7a4a28',
};
const vHash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0);
// rectangle avec contour (le contour déborde d'un pixel)
function oRect(c, x, y, w, h, col) {
  pxRect(c, x - 1, y - 1, w + 2, h + 2, VPAL.out);
  pxRect(c, x, y, w, h, col);
}
function shadow(c, x, y, w, h) {
  c.globalAlpha = 0.25;
  pxRect(c, x, y, w, h, '#1a2a12');
  c.globalAlpha = 1;
}

// --- sol : type de chaque tuile (30 × 17)
function villageGround() {
  const g = Array.from({ length: VROWS }, () => Array(VCOLS).fill('grass'));
  const fill = (c0, r0, w, h, t) => {
    for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) if (g[r] && c >= 0 && c < VCOLS) g[r][c] = t;
  };
  fill(1, 9, 9, 4, 'dark');                        // le coin de la sorcière
  fill(8, 10, 3, 3, 'tall');                       // hautes herbes
  fill(18, 11, 2, 2, 'tall');
  fill(0, 7, VCOLS, 2, 'path');                    // la grand-rue
  for (const c0 of [4, 14, 24]) fill(c0, 6, 2, 1, 'path');   // allées devant les portes
  fill(12, 9, 6, 4, 'plaza');                      // la place de la fontaine
  fill(0, 13, VCOLS, 1, 'sand');                   // la plage
  fill(14, 13, 2, 1, 'path');
  fill(0, 14, VCOLS, 3, 'water');                  // le lac
  return g;
}

function drawGroundTile(c, g, col, row) {
  const t = g[row][col], x = col * VT, y = row * VT, h = vHash(col + 7, row + 3);
  const at = (cc, rr) => (g[rr] && g[rr][cc]) || t;
  const walk = (k) => k === 'path' || k === 'plaza';
  if (t === 'grass' || t === 'dark') {
    const [b, d, l] = t === 'dark' ? [VPAL.dark, VPAL.darkD, VPAL.darkL] : [VPAL.grass, VPAL.grassD, VPAL.grassL];
    pxRect(c, x, y, VT, VT, b);
    for (let k = 0; k < 2; k++) {                  // petites touffes en « v »
      const hx = x + 2 + ((h >> (k * 6)) % 11), hy = y + 3 + ((h >> (k * 6 + 3)) % 10);
      pxRect(c, hx, hy, 1, 2, d); pxRect(c, hx + 2, hy, 1, 2, d); pxRect(c, hx + 1, hy - 1, 1, 2, d); pxRect(c, hx + 1, hy - 1, 1, 1, l);
    }
    if (h % 9 === 0) {                              // une fleur de temps en temps
      const fc = t === 'dark' ? '#b07ad8' : ['#f4f0e6', '#f5d04a', '#f08aa0'][h % 3];
      const fx = x + 3 + (h % 9), fy = y + 4 + ((h >> 4) % 8);
      pxRect(c, fx - 1, fy, 3, 1, fc); pxRect(c, fx, fy - 1, 1, 3, fc); pxRect(c, fx, fy, 1, 1, '#f5d04a');
    }
  } else if (t === 'tall') {
    pxRect(c, x, y, VT, VT, VPAL.tall);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        const bx = x + i * 4 + (j % 2) * 2, by = y + j * 8;
        pxRect(c, bx, by + 3, 1, 5, VPAL.tallD); pxRect(c, bx + 2, by + 3, 1, 5, VPAL.tallD);
        pxRect(c, bx + 1, by + 1, 1, 6, VPAL.tallL);
      }
    }
  } else if (t === 'path') {
    pxRect(c, x, y, VT, VT, VPAL.path);
    if (h % 3 === 0) pxRect(c, x + (h % 12) + 1, y + ((h >> 3) % 12) + 2, 2, 1, VPAL.pathD);
    if (h % 4 === 1) pxRect(c, x + ((h >> 2) % 12) + 2, y + ((h >> 5) % 12) + 1, 1, 1, VPAL.pathL);
    // bordure : l'herbe déborde un peu sur le chemin
    if (!walk(at(col, row - 1))) { pxRect(c, x, y, VT, 1, VPAL.grassD); pxRect(c, x, y + 1, VT, 1, VPAL.pathD); }
    if (!walk(at(col, row + 1)) && at(col, row + 1) !== 'sand') pxRect(c, x, y + VT - 1, VT, 1, VPAL.pathD);
    if (!walk(at(col - 1, row))) pxRect(c, x, y, 1, VT, VPAL.pathD);
    if (!walk(at(col + 1, row))) pxRect(c, x + VT - 1, y, 1, VT, VPAL.pathD);
  } else if (t === 'plaza') {                       // pavés, joints décalés une rangée sur deux
    pxRect(c, x, y, VT, VT, VPAL.stone);
    for (let r = 0; r < 2; r++) {
      const off = ((row * 2 + r) % 2) * 4;
      pxRect(c, x, y + r * 8 + 7, VT, 1, VPAL.stoneD);
      for (let cc = off; cc < VT; cc += 8) pxRect(c, x + cc, y + r * 8, 1, 7, VPAL.stoneD);
      for (let cc = off; cc < VT; cc += 8) pxRect(c, x + cc + 1, y + r * 8, 5, 1, VPAL.stoneL);
    }
  } else if (t === 'sand') {
    pxRect(c, x, y, VT, VT, VPAL.sand);
    for (let k = 0; k < 3; k++) pxRect(c, x + ((h >> (k * 4)) % 15), y + 3 + ((h >> (k * 4 + 2)) % 12), 1, 1, VPAL.sandD);
    if (at(col, row - 1) === 'grass' || at(col, row - 1) === 'dark') {   // bord d'herbe ondulé
      for (let i = 0; i < VT; i++) pxRect(c, x + i, y, 1, 2 + ((i + col) % 3 === 0 ? 1 : 0), VPAL.grassD);
    }
  } else if (t === 'water') {
    pxRect(c, x, y, VT, VT, row >= 15 ? VPAL.waterD : VPAL.water);
    if (row === 15) for (let i = 0; i < VT; i += 2) pxRect(c, x + i + (row % 2), y, 1, 1, VPAL.water);   // transition tramée
    pxRect(c, x + (h % 10) + 1, y + 4 + ((h >> 4) % 8), 4, 1, VPAL.waterL);                                // reflets
    if (at(col, row - 1) !== 'water') { pxRect(c, x, y, VT, 2, VPAL.foam); pxRect(c, x, y + 2, VT, 1, VPAL.waterL); }
  }
}

// --- objets du décor
function vTreeTop(c, cx, cy) {
  c.globalAlpha = 0.28;
  pxEllipse(c, cx + 3, cy + 15, 13, 4, '#1a2a12');
  c.globalAlpha = 1;
  pxRect(c, cx - 4, cy + 6, 8, 10, VPAL.out);
  pxRect(c, cx - 3, cy + 6, 6, 9, VPAL.trunk);
  pxRect(c, cx - 3, cy + 6, 2, 9, shadeHex(VPAL.trunk, 1.3));
  pxDisk(c, cx, cy, 13, VPAL.out);
  pxDisk(c, cx, cy, 12, VPAL.leafD);
  pxDisk(c, cx - 1, cy - 2, 10, VPAL.leaf);
  pxDisk(c, cx - 4, cy - 5, 6, VPAL.leafL);
  pxDisk(c, cx - 5, cy - 7, 2, VPAL.leafH);
  for (let k = 0; k < 5; k++) pxRect(c, cx - 7 + ((k * 5) % 13), cy - 1 + ((k * 7) % 8), 2, 1, VPAL.leafD);   // feuillage
}
function vWin(c, x, y, glass = '#8ccaf2') {
  oRect(c, x, y, 12, 10, '#f4f0e6');
  pxRect(c, x + 1, y + 1, 10, 8, glass);
  pxRect(c, x + 1, y + 6, 10, 2, shadeHex(glass, 0.8));
  pxRect(c, x + 2, y + 2, 2, 1, '#ffffff'); pxRect(c, x + 2, y + 3, 1, 1, '#ffffff');
  pxRect(c, x + 6, y + 1, 1, 8, '#f4f0e6'); pxRect(c, x + 1, y + 5, 10, 1, '#f4f0e6');
  oRect(c, x - 1, y + 11, 14, 3, VPAL.woodD);                      // jardinière
  for (let i = 0; i < 5; i++) pxRect(c, x + i * 3, y + 10, 2, 2, i % 2 ? '#f08aa0' : '#f4f0e6');
}
// Maison vue de 3/4 : toit (pente avant) en haut, façade en bas avec porte centrale et fenêtres
function vHouse(c, x, y, w, h, o) {
  const roofH = Math.round(h * 0.5), wy = y + roofH, wh = h - roofH;
  shadow(c, x + 4, y + h, w, 5);
  shadow(c, x + w + 2, y + 8, 5, h - 3);
  oRect(c, x + 2, wy, w - 4, wh, o.wall);                          // façade
  if (o.stone) {
    for (let r = 3; r < wh; r += 5) pxRect(c, x + 2, wy + r, w - 4, 1, shadeHex(o.wall, 0.86));
    for (let r = 0; r < wh; r += 5) for (let cc = ((r / 5) % 2) * 5; cc < w - 4; cc += 10) pxRect(c, x + 2 + cc, wy + r, 1, 4, shadeHex(o.wall, 0.86));
  } else {
    for (let r = 3; r < wh; r += 4) pxRect(c, x + 2, wy + r, w - 4, 1, shadeHex(o.wall, 0.9));
  }
  pxRect(c, x + 2, wy, 2, wh, shadeHex(o.wall, 1.12));
  pxRect(c, x + w - 4, wy, 2, wh, shadeHex(o.wall, 0.82));
  pxRect(c, x + 2, wy, w - 4, 3, shadeHex(o.wall, 0.7));            // ombre sous l'avant-toit
  pxRect(c, x + 2, y + h - 2, w - 4, 2, shadeHex(o.wall, 0.6));     // soubassement
  for (const dx of o.windows) {
    vWin(c, x + dx, wy + 7, o.glass);
    VILLAGE_FX.windows.push({ x: x + dx + 1, y: wy + 8, w: 10, h: 8, col: o.glass === '#7af0a0' ? '#7af0a0' : '#ffd88a' });
  }
  const dx = x + Math.floor(w / 2) - 7;                             // porte et marche
  oRect(c, dx, y + h - 17, 14, 17, o.door);
  pxRect(c, dx + 1, y + h - 16, 5, 15, shadeHex(o.door, 1.18));
  pxRect(c, dx + 8, y + h - 16, 5, 15, shadeHex(o.door, 1.18));
  pxRect(c, dx + 10, y + h - 9, 2, 2, '#f5d04a');
  oRect(c, dx - 2, y + h + 1, 18, 3, VPAL.stoneD);
  pxRect(c, dx - 2, y + h + 1, 18, 1, VPAL.stoneL);
  if (o.extra) o.extra(c, x, y, w, h, wy, wh);
  if (o.chimney != null) {                                          // cheminée
    const cx = x + o.chimney;
    oRect(c, cx, y - 8, 9, 12, o.chimneyCol || '#a87060');
    pxRect(c, cx, y - 8, 9, 2, '#5a3a30');
    pxRect(c, cx, y - 6, 2, 10, shadeHex(o.chimneyCol || '#a87060', 1.2));
  }
  pxRect(c, x - 4, y - 1, w + 8, roofH + 2, VPAL.out);              // toit
  for (let r = 0; r < roofH; r++) {
    const col = r === 0 ? shadeHex(o.roof, 1.4) : r % 4 === 3 ? shadeHex(o.roof, 0.78) : r < roofH / 2 ? shadeHex(o.roof, 1.08) : o.roof;
    pxRect(c, x - 3, y + r, w + 6, 1, col);
  }
  for (let r = 3; r < roofH - 1; r += 4) {                           // tuiles décalées
    for (let cc = ((r >> 2) % 2) * 4; cc < w + 5; cc += 8) pxRect(c, x - 3 + cc, y + r - 3, 1, 3, shadeHex(o.roof, 0.86));
  }
  pxRect(c, x - 3, y, 2, roofH, shadeHex(o.roof, 1.22));
  pxRect(c, x + w + 1, y, 2, roofH, shadeHex(o.roof, 0.72));
  pxRect(c, x - 3, y + roofH - 1, w + 6, 1, shadeHex(o.roof, 0.55));
  if (o.chimney != null) {                                          // la cheminée dépasse du toit
    const cx = x + o.chimney;
    oRect(c, cx, y - 8, 9, 7, o.chimneyCol || '#a87060');
    pxRect(c, cx, y - 8, 9, 2, '#5a3a30');
  }
  if (o.sign) {                                                     // enseigne au bord du toit
    const sx = x + Math.floor(w / 2) - 13, sy = wy - 6;
    oRect(c, sx, sy, 26, 11, o.signCol);
    pxRect(c, sx, sy, 26, 1, shadeHex(o.signCol, 1.3));
    o.sign(c, sx, sy);
  }
}
function vFence(c, x0, x1, y) {
  pxRect(c, x0, y + 3, x1 - x0, 2, VPAL.out);
  pxRect(c, x0, y + 3, x1 - x0, 1, '#f4f0e6');
  for (let x = x0; x <= x1 - 3; x += 6) { oRect(c, x, y, 3, 9, '#f4f0e6'); pxRect(c, x + 2, y + 1, 1, 8, '#c8c4bc'); }
}
function vFlowers(c, x, y, col) {
  for (const [dx, dy] of [[0, 0], [5, 2], [2, 5], [8, 6]]) {
    pxRect(c, x + dx, y + dy + 2, 1, 2, VPAL.grassD);
    pxRect(c, x + dx - 1, y + dy, 3, 1, col); pxRect(c, x + dx, y + dy - 1, 1, 3, col); pxRect(c, x + dx, y + dy, 1, 1, '#f5d04a');
  }
}
function vBarrel(c, x, y) {
  shadow(c, x + 2, y + 10, 10, 3);
  oRect(c, x, y, 10, 12, VPAL.wood);
  pxRect(c, x, y + 2, 10, 1, '#5a5a62'); pxRect(c, x, y + 8, 10, 1, '#5a5a62');
  pxRect(c, x + 1, y, 2, 12, VPAL.woodL);
  pxRect(c, x, y, 10, 2, VPAL.woodD);
}
function vCrate(c, x, y) {
  shadow(c, x + 2, y + 10, 12, 3);
  oRect(c, x, y, 12, 11, VPAL.woodL);
  pxRect(c, x, y, 12, 2, shadeHex(VPAL.woodL, 1.15));
  pxRect(c, x, y + 5, 12, 1, VPAL.woodD);
  pxLine(c, x + 1, y + 10, x + 10, y + 2, VPAL.woodD);
}
function vLamp(c, x, y) {
  shadow(c, x + 1, y + 20, 6, 2);
  oRect(c, x, y + 4, 2, 17, '#3a3a44');
  oRect(c, x - 2, y, 6, 5, '#3a3a44');
  pxRect(c, x - 1, y + 1, 4, 3, '#ffe9a0');
}
function vBench(c, x, y) {
  shadow(c, x + 2, y + 8, 22, 3);
  oRect(c, x, y, 22, 4, VPAL.wood);
  pxRect(c, x, y, 22, 1, VPAL.woodL);
  oRect(c, x, y + 5, 22, 3, VPAL.woodD);
  for (const dx of [1, 19]) pxRect(c, x + dx, y + 8, 2, 3, VPAL.out);
}

// Le village : sol en tuiles, puis les objets, dessinés du haut vers le bas (profondeur)
function buildVillageArt() {
  const cv = makeCanvas(480, 270);
  const c = cv.getContext('2d');
  const g = villageGround();
  VILLAGE_FX.windows.length = 0;
  for (let r = 0; r < VROWS; r++) for (let col = 0; col < VCOLS; col++) drawGroundTile(c, g, col, r);

  // --- lisière de forêt en haut et sur les côtés (la grand-rue sort du plan à gauche et à droite)
  for (let i = -1; i < 32; i++) vTreeTop(c, i * 16, -6);
  for (let i = -1; i < 32; i++) vTreeTop(c, i * 16 + 8, 6);
  for (const y of [34, 54, 74, 94]) { vTreeTop(c, 4, y); vTreeTop(c, 476, y); }
  for (const y of [158, 178]) vTreeTop(c, 476, y);
  vTreeTop(c, 4, 160);

  // --- la banque : pierre de taille, toit d'ardoise, colonnes
  vHouse(c, 32, 30, 96, 64, {
    roof: '#5e74a0', wall: '#e8e0ce', stone: true, door: '#6a4430', windows: [10, 26, 58, 74], chimney: 70,
    signCol: '#2a3a6a', sign: (cc, sx, sy) => { pxDisk(cc, sx + 13, sy + 5, 3, '#f5d04a'); pxRect(cc, sx + 12, sy + 3, 2, 4, '#c8962e'); },
    extra: (cc, x, y, w, h) => { for (const dx of [36, 56]) { oRect(cc, x + dx, y + h - 26, 4, 25, '#f4f0e6'); pxRect(cc, x + dx + 3, y + h - 26, 1, 25, '#c8c0b0'); } },
  });
  // --- le bric-à-brac : toit orangé, auvent rayé, bric et broc devant
  vHouse(c, 192, 30, 96, 64, {
    roof: '#e0743a', wall: '#f2deb2', door: '#6a3a7a', windows: [8, 76], chimney: 14, glass: '#a8d8f0',
    signCol: '#6a3a7a', sign: (cc, sx, sy) => { pxRect(cc, sx + 6, sy + 3, 6, 5, '#f5d04a'); pxRect(cc, sx + 14, sy + 2, 3, 6, '#e8a0b0'); pxRect(cc, sx + 19, sy + 4, 3, 3, '#8ac0e8'); },
    extra: (cc, x, y, w, h, wy) => {                       // auvent rayé au-dessus des fenêtres
      for (const ax of [x + 4, x + w - 26]) {
        pxRect(cc, ax - 1, wy + 2, 24, 7, VPAL.out);
        for (let i = 0; i < 22; i += 4) pxRect(cc, ax + i, wy + 3, 2, 5, '#d8443a');
        for (let i = 2; i < 22; i += 4) pxRect(cc, ax + i, wy + 3, 2, 5, '#f4f0e6');
        for (let i = 0; i < 22; i += 4) pxRect(cc, ax + i, wy + 8, 3, 1, '#d8443a');
      }
    },
  });
  vBarrel(c, 172, 82); vCrate(c, 300, 84); vBarrel(c, 302, 72);
  // --- la poissonnerie : bardage bleu clair, toit turquoise, étal de poissons
  vHouse(c, 352, 30, 96, 64, {
    roof: '#2f9aa6', wall: '#e2eef4', door: '#2f5f92', windows: [8, 76], chimney: 72,
    signCol: '#2f6fb0', sign: (cc, sx, sy) => {
      pxEllipse(cc, sx + 13, sy + 5, 7, 3, '#dfe8ee'); pxRect(cc, sx + 4, sy + 3, 3, 5, '#c0ccd4'); pxRect(cc, sx + 17, sy + 4, 1, 1, '#1e140c');
    },
  });
  oRect(c, 336, 80, 14, 10, VPAL.woodL);                      // étal : glace et poissons
  pxRect(c, 337, 80, 12, 4, '#e8f6ff');
  for (const dx of [338, 342, 346]) pxEllipse(c, dx, 81, 2, 1, '#8aa0b0');
  // --- jardins et clôtures entre les maisons, lampadaires, fleurs
  vFence(c, 136, 186, 86); vFence(c, 296, 344, 98);
  vFlowers(c, 142, 74, '#f08aa0'); vFlowers(c, 160, 76, '#f5d04a');
  vFlowers(c, 54, 98, '#f4f0e6'); vFlowers(c, 98, 98, '#f08aa0'); vFlowers(c, 372, 98, '#f5d04a'); vFlowers(c, 420, 98, '#f4f0e6');
  for (const l of VILLAGE_FX.lamps) vLamp(c, l.x, l.y);

  // --- la place et sa fontaine, bancs
  const fx = VILLAGE_FX.fountain.x, fy = VILLAGE_FX.fountain.y;
  c.globalAlpha = 0.25; pxEllipse(c, fx + 3, fy + 6, 24, 9, '#1a2a12'); c.globalAlpha = 1;
  pxEllipse(c, fx, fy, 24, 11, VPAL.out);
  pxEllipse(c, fx, fy, 23, 10, VPAL.stoneL);
  pxEllipse(c, fx, fy + 1, 19, 7, VPAL.stoneD);
  pxEllipse(c, fx, fy + 1, 18, 6, VPAL.water);
  pxEllipse(c, fx - 4, fy - 1, 8, 2, VPAL.waterL);
  oRect(c, fx - 3, fy - 12, 6, 13, VPAL.stone);
  pxRect(c, fx - 3, fy - 12, 2, 13, VPAL.stoneL);
  pxEllipse(c, fx, fy - 13, 7, 3, VPAL.out); pxEllipse(c, fx, fy - 13, 6, 2, VPAL.stoneL); pxRect(c, fx - 3, fy - 14, 6, 1, VPAL.waterL);
  vBench(c, 200, 186); vBench(c, 258, 186);

  // --- la cabane de la sorcière : bois sombre, toit de chaume rapiécé, fenêtre verte, chaudron
  vHouse(c, 36, 140, 72, 60, {
    roof: '#5c3e5a', wall: '#5a4a4c', door: '#3a2a3a', windows: [6], chimney: 48, chimneyCol: '#5a4a44', glass: '#7af0a0',
    extra: (cc, x, y, w, h, wy) => { for (const [px, py] of [[50, 10], [56, 16]]) pxRect(cc, x + px, wy + py, 6, 6, '#3a3040'); },
  });
  for (const [px, py, s] of [[44, 146, 8], [72, 152, 6], [58, 158, 7]]) pxRect(c, px, py, s, 4, '#7a5a78');   // rapiéçages du toit
  shadow(c, 114, 196, 14, 3);
  pxEllipse(c, 120, 192, 8, 6, VPAL.out); pxEllipse(c, 120, 192, 7, 5, '#3a2a4a');          // chaudron
  pxEllipse(c, 120, 188, 6, 2, '#7af0a0'); pxRect(c, 117, 187, 2, 1, '#c8ffd8');
  for (const [mx, my] of [[16, 200], [128, 206], [22, 146]]) {                               // champignons
    oRect(c, mx + 1, my + 3, 2, 3, '#f4f0e6'); pxEllipse(c, mx + 2, my + 2, 3, 2, '#b04a8a'); pxRect(c, mx + 1, my + 1, 1, 1, '#f4f0e6');
  }
  pxRect(c, 136, 132, 3, 26, VPAL.out); pxRect(c, 137, 132, 1, 25, '#6a5a5a');              // arbre mort
  pxLine(c, 137, 140, 128, 132, '#4a3a3a'); pxLine(c, 137, 146, 146, 136, '#4a3a3a'); pxLine(c, 133, 136, 130, 128, '#4a3a3a');

  // --- le chantier naval : grand hangar ouvert sur le lac, coque sur cale, planches et ancre
  vHouse(c, 320, 136, 112, 72, {
    roof: '#a64c2c', wall: '#c08a52', door: '#3a2a20', windows: [8, 92], chimney: 82, chimneyCol: '#8a8a90',
    signCol: '#5e3a1e', sign: (cc, sx, sy) => { pxRect(cc, sx + 5, sy + 4, 16, 2, '#d8c49a'); pxRect(cc, sx + 11, sy + 2, 4, 6, '#d8c49a'); },
    extra: (cc, x, y, w, h, wy) => {                       // la grande porte ouverte et la coque en réparation
      oRect(cc, x + 34, wy + 3, 44, h - (wy - y) - 3, '#2a1e18');
      pxRect(cc, x + 40, wy + 18, 32, 8, '#c64a35'); pxRect(cc, x + 42, wy + 26, 28, 3, '#8e2f22'); pxRect(cc, x + 40, wy + 18, 32, 2, '#f0ece0');
    },
  });
  for (const rx of [362, 386]) { pxRect(c, rx, 212, 2, 26, VPAL.woodD); }                    // rails de mise à l'eau
  for (let ry = 214; ry < 238; ry += 5) pxRect(c, 360, ry, 30, 1, VPAL.wood);
  for (let i = 0; i < 4; i++) oRect(c, 440 + (i % 2) * 2, 176 + i * 4, 24, 3, i % 2 ? VPAL.woodL : VPAL.wood);   // pile de planches
  oRect(c, 302, 204, 3, 14, '#5a5a62'); pxRect(c, 297, 216, 13, 2, '#5a5a62'); pxRect(c, 298, 206, 11, 1, '#5a5a62');   // ancre sur la plage
  vCrate(c, 444, 196);

  // --- le ponton et la barque de grand-père
  shadow(c, 228, 222, 30, 40);
  oRect(c, 224, 214, 32, 56, VPAL.woodL);
  for (let y = 214; y < 270; y += 5) pxRect(c, 224, y, 32, 1, VPAL.woodD);
  for (const [px, py] of [[224, 222], [252, 222], [224, 254], [252, 254]]) oRect(c, px, py, 4, 4, VPAL.woodD);
  shadow(c, 266, 244, 34, 5);
  pxEllipse(c, 280, 240, 17, 7, VPAL.out); pxEllipse(c, 280, 240, 16, 6, VPAL.wood);                // barque
  pxEllipse(c, 280, 240, 13, 4, VPAL.woodD); pxRect(c, 278, 236, 3, 9, VPAL.woodL);
  pxLine(c, 263, 238, 256, 236, '#d8c49a');                                                     // amarre
  for (const [lx, ly] of [[60, 236], [104, 250], [412, 244], [150, 258]]) {                       // nénuphars
    pxEllipse(c, lx, ly, 5, 3, '#2f7a3a'); pxEllipse(c, lx - 1, ly - 1, 4, 2, '#4caa4a'); pxRect(c, lx + 1, ly - 2, 2, 2, '#f0a0c0');
  }
  return cv;
}

function vTree(c, x, y, r = 9) {
  pxRect(c, x - 2, y, 4, 14, '#6e4422');
  pxDisk(c, x, y - 4, r, '#2f7a2e');
  pxDisk(c, x - 2, y - 6, r - 3, '#3f9a3a');
  pxDisk(c, x - 3, y - 8, 3, '#5cbc4a');
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
