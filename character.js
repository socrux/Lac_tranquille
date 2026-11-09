// Lac Tranquille — personnalisation du personnage (apparence et sprite)
'use strict';

const SKIN_TONES = ['#f8dcc0', '#f2c497', '#dca677', '#b67c50', '#8a5634', '#5e3a22'];
const HAIR_COLORS = ['#1e1a18', '#4a2e1a', '#6a3e1e', '#9a5a2a', '#c8862e', '#e8c86a', '#b03a2a', '#d8d8d8', '#4a6ad0', '#d050a0'];
const CLOTH_COLORS = [
  '#c64a35', '#e08a2a', '#e2bd55', '#4a9a4a', '#2a7a6a', '#3a72c8', '#3e5a9a',
  '#7a4ab0', '#c0508a', '#f0ece0', '#8a5a32', '#5a5a62', '#2a2a30',
];

// Options de l'éditeur. choices : [valeur, libellé] ; colors : palette de couleurs.
const LOOK_OPTIONS = [
  { key: 'sex', label: 'Sexe', choices: [['homme', 'Homme'], ['femme', 'Femme'], ['autre', 'Autre']] },
  { key: 'skin', label: 'Teint', colors: SKIN_TONES },
  { key: 'hair', label: 'Coupe', choices: [['court', 'Courts'], ['long', 'Longs'], ['queue', 'Queue de cheval'], ['chignon', 'Chignon'], ['boucles', 'Bouclés'], ['meches', 'En pétard'], ['rase', 'Rasés'], ['chauve', 'Chauve']] },
  { key: 'hairColor', label: 'Couleur des cheveux', colors: HAIR_COLORS },
  { key: 'beard', label: 'Pilosité', choices: [['aucune', 'Aucune'], ['moustache', 'Moustache'], ['barbe', 'Barbe']] },
  { key: 'hat', label: 'Couvre-chef', choices: [['paille', 'Chapeau de paille'], ['casquette', 'Casquette'], ['bonnet', 'Bonnet'], ['bob', 'Bob'], ['aucun', 'Aucun']] },
  { key: 'hatColor', label: 'Couleur du couvre-chef', colors: CLOTH_COLORS },
  { key: 'shirtStyle', label: 'Haut', choices: [['uni', 'Uni'], ['raye', 'Rayé'], ['carreaux', 'À carreaux'], ['salopette', 'Salopette']] },
  { key: 'shirt', label: 'Couleur du haut', colors: CLOTH_COLORS },
  { key: 'pants', label: 'Couleur du bas', colors: CLOTH_COLORS },
  { key: 'gear', label: 'Veste et pantalon équipés', choices: [['on', 'Visibles'], ['off', 'Masqués']] },
];
const NAME_MAX = 16;

// L'apparence d'origine du pêcheur
const DEFAULT_LOOK = {
  name: '', sex: 'homme', skin: '#f2c497', hair: 'court', hairColor: '#6a3e1e', beard: 'aucune',
  hat: 'paille', hatColor: '#e2bd55', shirtStyle: 'uni', shirt: '#c64a35', pants: '#3e5a9a', gear: 'on',
};

// Nettoie une apparence (sauvegarde ancienne ou importée) : valeurs inconnues → valeurs par défaut
function validLook(l) {
  const out = { ...DEFAULT_LOOK };
  if (!l || typeof l !== 'object') return out;
  for (const o of LOOK_OPTIONS) {
    const v = l[o.key];
    if (o.choices && o.choices.some(([x]) => x === v)) out[o.key] = v;
    if (o.colors && typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) out[o.key] = v;
  }
  // nom : sans caractères de contrôle, invisibles ou d'inversion du sens d'écriture
  out.name = typeof l.name === 'string' ? l.name.replace(/[\p{C}\p{Zl}\p{Zp}]/gu, '').trim().slice(0, NAME_MAX) : '';
  return out;
}

function randomLook(name = '') {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const l = { ...DEFAULT_LOOK, name };
  for (const o of LOOK_OPTIONS) {
    if (o.key === 'gear') continue;
    l[o.key] = o.colors ? pick(o.colors) : pick(o.choices)[0];
  }
  if (Math.random() < 0.6) l.beard = 'aucune';
  return l;
}

// « pêcheur », « pêcheuse » ou « pêcheur·euse » selon le sexe choisi
const fisherWord = (sex) => (sex === 'femme' ? 'pêcheuse' : sex === 'autre' ? 'pêcheur·euse' : 'pêcheur');

// ---------------------------------------------------------------------------
// Sprite du pêcheur (18×21), assis dans la barque, canne tenue à droite.
// Construit par couches sur une grille : corps, cheveux, pilosité, couvre-chef.
// Le contour noir est ajouté ensuite avec toute la barque (pixelize).
// ---------------------------------------------------------------------------
function buildFisherSprite(look) {
  const L = validLook(look);
  const W = 18, H = 21;
  const g = Array.from({ length: H }, () => Array(W).fill(null));
  const put = (x, y, k) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = k; };
  const rect = (x, y, w, h, k) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, k); };

  // --- cheveux à l'arrière (dessinés avant le corps)
  if (L.hair === 'long') { rect(4, 6, 2, 8, 'C'); }
  if (L.hair === 'queue') { rect(4, 6, 2, 2, 'c'); rect(3, 8, 2, 4, 'c'); put(3, 12, 'C'); }

  // --- tête
  rect(6, 5, 7, 6, 's');
  rect(7, 11, 5, 1, 'S');
  put(13, 9, 'S');                       // nez
  put(6, 10, 'S');
  put(11, 7, 'e');                       // œil
  if (L.sex === 'femme') { put(12, 6, 'e'); put(11, 10, 'l'); }

  // --- haut
  rect(6, 12, 7, 1, 'r');
  rect(5, 13, 9, 1, 'r');
  rect(5, 14, 10, 1, 'r');
  rect(5, 15, 7, 3, 'r');
  rect(15, 14, 2, 1, 's');               // main qui tient la canne
  if (L.shirtStyle === 'raye') {
    for (const y of [13, 15, 17]) for (let x = 0; x < W; x++) if (g[y][x] === 'r') g[y][x] = 'w';
  } else if (L.shirtStyle === 'carreaux') {
    for (let y = 12; y < 18; y++) for (let x = 0; x < W; x++) if (g[y][x] === 'r' && (Math.floor(x / 2) + Math.floor(y / 2)) % 2) g[y][x] = 'R';
  }
  put(8, 14, 'R'); put(8, 15, 'R'); put(5, 17, 'R'); put(11, 17, 'R');
  if (L.shirtStyle === 'salopette') {
    rect(7, 14, 4, 4, 'p');
    put(7, 12, 'p'); put(7, 13, 'p'); put(10, 12, 'p'); put(10, 13, 'p');
    put(8, 14, 'y'); put(9, 14, 'y');
  }
  // --- bas
  rect(5, 18, 10, 2, 'p');
  put(14, 19, 'P'); put(9, 19, 'P');

  // --- cheveux (devant)
  const top = () => { rect(7, 3, 5, 1, 'c'); rect(6, 4, 7, 2, 'c'); put(12, 5, 'C'); rect(6, 6, 2, 1, 'c'); put(8, 6, 'C'); rect(6, 7, 1, 2, 'c'); };
  switch (L.hair) {
    case 'court': top(); break;
    case 'long': top(); rect(5, 5, 2, 9, 'c'); put(5, 13, 'C'); break;
    case 'queue': top(); put(5, 6, 'b'); break;
    case 'chignon': top(); rect(5, 1, 3, 3, 'c'); put(5, 1, 'C'); put(7, 3, 'C'); break;
    case 'boucles':
      rect(6, 1, 7, 1, 'c'); rect(5, 2, 9, 4, 'c'); rect(5, 6, 2, 4, 'c'); put(13, 6, 'c'); put(12, 6, 'c');
      for (let y = 1; y < 10; y++) for (let x = 0; x < W; x++) if (g[y][x] === 'c' && (x * 2 + y) % 4 === 0) g[y][x] = 'C';
      break;
    case 'meches': top(); put(7, 2, 'c'); put(9, 1, 'c'); put(9, 2, 'c'); put(11, 2, 'c'); put(12, 3, 'C'); break;
    case 'rase': rect(6, 5, 7, 1, 'C'); put(6, 6, 'C'); put(6, 7, 'C'); break;
    default: break;                      // chauve
  }

  // --- pilosité
  if (L.beard === 'moustache') { rect(10, 9, 3, 1, 'c'); put(12, 9, 'C'); }
  if (L.beard === 'barbe') { rect(7, 9, 6, 2, 'c'); rect(7, 11, 5, 1, 'C'); put(11, 10, 'C'); put(6, 9, 'c'); put(6, 10, 'C'); }

  // --- couvre-chef
  switch (L.hat) {
    case 'paille':
      rect(6, 0, 6, 3, 'h'); put(11, 1, 'H'); put(11, 2, 'H');
      rect(6, 3, 6, 1, 'b');
      rect(3, 4, 13, 1, 'h');
      rect(2, 5, 15, 1, 'h'); put(16, 5, 'H');
      rect(3, 6, 13, 1, 'k');
      break;
    case 'casquette':
      rect(7, 2, 5, 1, 'h'); rect(6, 3, 7, 2, 'h'); put(12, 3, 'H'); put(9, 1, 'H');
      rect(6, 5, 5, 1, 'h');
      rect(10, 5, 7, 1, 'H');            // visière
      rect(11, 6, 3, 1, 'k');
      break;
    case 'bonnet':
      rect(8, 0, 3, 1, 'b');
      rect(7, 1, 5, 1, 'h');
      rect(6, 2, 7, 3, 'h'); put(12, 3, 'H'); put(12, 4, 'H');
      rect(6, 5, 7, 1, 'b');
      break;
    case 'bob':
      rect(7, 1, 5, 1, 'h');
      rect(6, 2, 7, 2, 'h'); put(12, 2, 'H');
      rect(6, 3, 7, 1, 'b');
      rect(5, 4, 9, 1, 'h');
      rect(4, 5, 11, 1, 'H');
      break;
    default: break;                      // tête nue
  }

  const hat = L.hatColor;
  const pal = {
    s: L.skin, S: shadeHex(L.skin, 0.8), e: '#1e140c', l: '#c0405a', k: '#1e140c',
    c: L.hairColor, C: shadeHex(L.hairColor, 0.72),
    h: hat, H: shadeHex(hat, 0.75),
    b: L.hat === 'bonnet' ? shadeHex(hat, 1.4) : L.hat === 'aucun' ? shadeHex(L.hairColor, 1.5) : shadeHex(hat, 0.5),
    r: L.shirt, R: shadeHex(L.shirt, 0.72), w: shadeHex(L.shirt, 1.45),
    p: L.pants, P: shadeHex(L.pants, 0.72), y: '#f5d04a',
  };
  if (L.hair === 'queue') pal.b = '#e04a6a';   // chouchou
  const cv = makeCanvas(W, H);
  const c = cv.getContext('2d');
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = g[y][x];
      if (!k) continue;
      c.fillStyle = pal[k];
      c.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

// Petit disque vinyle pour l'encart « musique en cours » (16×16)
function buildDiscIcon() {
  const cv = makeCanvas(16, 16);
  const c = cv.getContext('2d');
  pxDisk(c, 8, 8, 7, '#16161c');
  c.globalAlpha = 0.9;
  for (const r of [6, 4]) {
    for (let a = 0; a < 24; a++) {
      const t = (a / 24) * Math.PI * 2;
      if (a % 3) pxRect(c, 8 + Math.round(Math.cos(t) * r), 8 + Math.round(Math.sin(t) * r), 1, 1, '#2e2e3a');
    }
  }
  c.globalAlpha = 1;
  pxDisk(c, 8, 8, 2, '#e04a3a');
  pxRect(c, 8, 8, 1, 1, '#0a0a0e');
  pxRect(c, 4, 3, 2, 1, '#6a6a7a');      // reflet
  pxRect(c, 3, 4, 1, 2, '#6a6a7a');
  pixelize(cv, '#0a0a0e');
  return cv;
}
