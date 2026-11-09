// Lac Tranquille — un petit jeu de pêche paisible (enfin… presque)
'use strict';

// La scène est dessinée en basse résolution puis agrandie sans lissage (pixel art).
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const LW = canvas.width;     // 480
const LH = canvas.height;    // 270
const HORIZON = 112;
const BOAT_X = 240;
const BOAT_Y = 222;          // haut de la coque

const $ = (id) => document.getElementById(id);

// Version du jeu : à mettre à jour à chaque pull request (MAJEUR.MINEUR.CORRECTIF)
const GAME_VERSION = '1.0.0';

// ===========================================================================
// Données
// ===========================================================================
const RARITIES = [
  { name: 'Commun',     color: '#8a968c' },
  { name: 'Peu commun', color: '#3f9a4a' },
  { name: 'Rare',       color: '#3a72c8' },
  { name: 'Épique',     color: '#9a48c8' },
  { name: 'Légendaire', color: '#e0961a' },
  { name: 'Mythique',   color: '#22b07a' },
];

const BASE_ABOM_CHANCE = 0.01;
const CTHULHU_BASE_CHANCE = 0.0001;   // 0,01 % avec la canne et l'appât de base

// tier : rareté (0-5). spawn : poids de tirage de base. cm / kg : fourchettes.
// value : prix de base en pièces. window : temps de réaction (s) quand ça mord.
const FISH = [
  {
    id: 'ablette', name: 'Ablette', tier: 0, spawn: 30, cm: [8, 20], kg: [0.01, 0.08], value: 4, window: 1.0,
    color: '#c9d5dc', fin: '#a9b7bf', eye: '#222', shape: { len: 42, h: 10 },
    desc: "Petit poisson argenté qui file en bancs juste sous la surface. Le premier poisson de tout pêcheur.",
    abomName: 'Ablette aux Mille Yeux', abomColor: '#5a6b78',
    abomDesc: "Ses écailles ne sont pas des écailles. Ce sont des paupières, et elles s'ouvrent toutes en même temps.",
  },
  {
    id: 'gardon', name: 'Gardon', tier: 0, spawn: 28, cm: [15, 35], kg: [0.1, 0.9], value: 7, window: 1.0,
    color: '#aeb9bd', fin: '#cf5f3a', eye: '#b8322a', shape: { len: 46, h: 17 },
    desc: "Reconnaissable à son œil rouge et à ses nageoires orangées. Il mord volontiers à la mie de pain.",
    abomName: 'Gardon Rampant', abomColor: '#5e4a52',
    abomDesc: "Il est sorti de l'eau tout seul. Il a rampé jusqu'au fond de la barque, et il vous a regardé.",
  },
  {
    id: 'breme', name: 'Brème', tier: 0, spawn: 22, cm: [25, 60], kg: [0.3, 3], value: 6, window: 1.0,
    color: '#bcae7c', fin: '#8a7a50', eye: '#222', shape: { len: 44, h: 22 },
    desc: "Large et plate comme une assiette. Elle se déplace en bancs paresseux au fond du lac.",
    abomName: 'Brème Écorchée', abomColor: '#7a4a4a',
    abomDesc: "Elle n'a plus de peau, mais elle nage quand même. Elle a l'air de bien le vivre. Vous, moins.",
  },
  {
    id: 'perche', name: 'Perche', tier: 1, spawn: 18, cm: [15, 50], kg: [0.1, 2.5], value: 14, window: 0.9,
    color: '#9aae5c', fin: '#e07a3a', eye: '#222', shape: { len: 46, h: 19, stripes: 6, spiny: true },
    desc: "Rayée comme un tigre, épineuse et gourmande. Elle chasse en groupe près des herbiers.",
    abomName: 'Perche Hurlante', abomColor: '#4b5a3a',
    abomDesc: "Les nuits sans lune, on l'entend hurler depuis le fond du lac. Et ses rayures bougent.",
  },
  {
    id: 'tanche', name: 'Tanche', tier: 1, spawn: 15, cm: [20, 60], kg: [0.3, 3.5], value: 18, window: 0.9,
    color: '#6d7a38', fin: '#4f5a26', eye: '#d0492a', shape: { len: 48, h: 18 },
    desc: "Poisson discret des fonds vaseux, couvert d'un mucus doré. Les anciens la disaient guérisseuse.",
    abomName: 'Tanche Putride', abomColor: '#3d4a22',
    abomDesc: "Son mucus ronge le bois de la barque. Elle sent la vase d'un temps où il n'y avait pas encore d'hommes.",
  },
  {
    id: 'truite', name: 'Truite arc-en-ciel', tier: 1, spawn: 14, cm: [25, 70], kg: [0.3, 4], value: 16, window: 0.9,
    color: '#9aa88a', fin: '#7a8a6a', eye: '#222', shape: { len: 48, h: 14, spots: true, band: '#e88aa0' },
    desc: "Ses flancs brillent de toutes les couleurs. Combative et élégante, elle adore l'eau fraîche.",
    abomName: 'Truite Prismatique', abomColor: '#4a6a7a',
    abomDesc: "Ses couleurs n'existent pas. Les regarder trop longtemps laisse un goût de métal dans la bouche.",
  },
  {
    id: 'carpe', name: 'Carpe', tier: 2, spawn: 8, cm: [40, 110], kg: [2, 25], value: 40, window: 0.8,
    color: '#c8963c', fin: '#8a5f25', eye: '#222', shape: { len: 52, h: 23, barbels: 1 },
    desc: "Ancienne, méfiante, puissante. Certaines vivent plus longtemps que le pêcheur qui les traque.",
    abomName: 'Carpe-qui-Rêve', abomColor: '#5b3f3a',
    abomDesc: "Elle dort au fond du lac depuis des siècles. Ce que vous tenez n'est que son rêve. Ne la réveillez pas.",
  },
  {
    id: 'sandre', name: 'Sandre', tier: 2, spawn: 7, cm: [40, 100], kg: [1, 12], value: 50, window: 0.75,
    color: '#a6ab92', fin: '#7c8270', eye: '#e8e0a0', shape: { len: 54, h: 15, stripes: 5, spiny: true, snout: 6 },
    desc: "Chasseur crépusculaire aux yeux vitreux. Il voit dans l'eau trouble mieux que n'importe qui.",
    abomName: 'Sandre Abyssal', abomColor: '#3a4048',
    abomDesc: "Ses yeux voient aussi au-delà de l'eau. Au-delà du ciel. Il a vu ce qui attend là-haut.",
  },
  {
    id: 'anguille', name: 'Anguille', tier: 2, spawn: 6, cm: [40, 130], kg: [0.3, 4], value: 45, window: 0.75,
    color: '#4f5e3a', fin: '#3a4a2a', eye: '#222', shape: { len: 64, h: 7, eel: true },
    desc: "Longue, visqueuse et insaisissable. Personne ne sait vraiment où elle naît.",
    abomName: 'Anguille Infinie', abomColor: '#3a2a4a',
    abomDesc: "On a tiré sur la ligne pendant une heure. Elle n'avait toujours pas de queue.",
  },
  {
    id: 'brochet', name: 'Brochet', tier: 3, spawn: 3, cm: [50, 140], kg: [2, 22], value: 110, window: 0.6,
    color: '#7a8f5c', fin: '#b0903a', eye: '#222', shape: { len: 62, h: 13, spots: true, snout: 14 },
    desc: "Le requin d'eau douce. Une gueule pleine de dents et une patience infinie.",
    abomName: "Brochet Dévoreur d'Étoiles", abomColor: '#2f3d3a',
    abomDesc: "Les vieux pêcheurs disent qu'il manque trois étoiles dans le ciel au-dessus du lac. Il avait faim.",
  },
  {
    id: 'esturgeon', name: 'Esturgeon', tier: 3, spawn: 2.5, cm: [100, 300], kg: [10, 200], value: 130, window: 0.6,
    color: '#7a7a68', fin: '#5a5a4a', eye: '#222', shape: { len: 60, h: 13, snout: 14, plates: true, barbels: 1 },
    desc: "Un fossile vivant couvert de plaques osseuses. Sa lignée nageait déjà à l'époque des dinosaures.",
    abomName: 'Esturgeon Primordial', abomColor: '#4a4038',
    abomDesc: "Il se souvient du monde d'avant. Il se souvient de ce qui l'habitait. Il a peur.",
  },
  {
    id: 'bouledogue', name: 'Requin-bouledogue', tier: 3, spawn: 2, cm: [150, 340], kg: [90, 300], value: 160, window: 0.55,
    color: '#7a8590', fin: '#5f6a75', eye: '#222', shape: { len: 60, h: 17, shark: true, snout: 8 },
    desc: "Ce requin trapu remonte les rivières et s'installe dans les lacs. Personne n'a osé lui dire non.",
    abomName: 'Bouledogue des Gouffres', abomColor: '#3a3a4a',
    abomDesc: "Il a trois rangées de dents. Puis une quatrième, à l'intérieur. Ensuite, on a arrêté de compter.",
  },
  {
    id: 'silure', name: 'Silure', tier: 4, spawn: 1, cm: [100, 270], kg: [10, 120], value: 280, window: 0.5,
    color: '#5e584a', fin: '#3b382f', eye: '#d8d0a0', shape: { len: 62, h: 16, barbels: 2 },
    desc: "Le géant du lac. On raconte qu'il avale des canards entiers sans même ralentir.",
    abomName: "L'Ancien du Lac", abomColor: '#2a2230',
    abomDesc: "Il était là avant le lac. Il sera là après. Le lac n'est peut-être qu'une flaque autour de lui.",
  },
  {
    id: 'marteau', name: 'Requin-marteau', tier: 4, spawn: 0.7, cm: [200, 450], kg: [150, 450], value: 330, window: 0.5,
    color: '#8a95a0', fin: '#6a7580', eye: '#222', shape: { len: 60, h: 14, shark: true, hammer: true },
    desc: "Sa tête en forme de marteau lui offre une vision panoramique. Ce qu'il fait dans un lac reste un mystère.",
    abomName: 'Marteau du Jugement', abomColor: '#3a3048',
    abomDesc: "Chaque coup de tête contre la coque résonne comme une cloche. Quelqu'un, en bas, compte les coups.",
  },
  {
    id: 'blanc', name: 'Grand requin blanc', tier: 4, spawn: 0.5, cm: [300, 600], kg: [600, 1900], value: 420, window: 0.45,
    color: '#7f8a96', fin: '#66717c', eye: '#222', shape: { len: 64, h: 19, shark: true, snout: 10, teeth: true },
    desc: "Le plus grand prédateur des mers, perdu dans un lac de montagne. Il n'a pas l'air de s'en plaindre.",
    abomName: 'Gueule Blanche', abomColor: '#4a4a5a',
    abomDesc: "Il n'y a pas de fond à sa gorge. Les pêcheurs qui ont regardé dedans pêchent toujours. Ailleurs.",
  },
  {
    id: 'cthulhu', name: 'Cthulhu', tier: 5, spawn: 0, cm: [900, 1600], kg: [8000, 30000], value: 25000, window: 0.45,
    unique: true, color: '#4f8f66',
    desc: "« Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn. » Dans sa demeure au fond du lac, le Grand Ancien attend en rêvant.",
    lore: "Vous l'avez sorti de l'eau. Il dort encore. Pour l'instant. Le lac, lui, ne sera plus jamais vraiment tranquille.",
  },
];
// Cthulhu : poids calculé pour une chance de 0,01 % avec l'équipement de base
{
  const others = FISH.filter((f) => !f.unique).reduce((s, f) => s + f.spawn, 0);
  FISH.find((f) => f.id === 'cthulhu').spawn = (others * CTHULHU_BASE_CHANCE) / (1 - CTHULHU_BASE_CHANCE);
}
const FISH_BY_ID = Object.fromEntries(FISH.map((f) => [f.id, f]));

// speed : multiplicateur du temps d'attente. window : secondes de réaction en plus pour ferrer.
// vigor : multiplicateur de la vigueur des poissons pendant la remontée (plus bas = plus calme).
// cthulhu : multiplicateur de la chance de ferrer le Grand Ancien.
const RODS = [
  { id: 'bambou',  name: 'Canne en bambou',         price: 0,    speed: 1.0,  window: 0,    vigor: 1.0,  cthulhu: 1,   color: '#d8b060', desc: "Fidèle et légère. Elle a appartenu à votre grand-père." },
  { id: 'verre',   name: 'Canne en fibre de verre', price: 150,  speed: 0.8,  window: 0.1,  vigor: 0.88, cthulhu: 1.5, color: '#3a8ce0', desc: "Solide et réactive. Un bon début." },
  { id: 'carbone', name: 'Canne en carbone',        price: 600,  speed: 0.65, window: 0.18, vigor: 0.76, cthulhu: 2,   color: '#3a3a44', desc: "Légère comme une plume, sensible au moindre frisson." },
  { id: 'maitre',  name: 'Canne de maître',         price: 2000, speed: 0.5,  window: 0.25, vigor: 0.64, cthulhu: 3,   color: '#c03a3a', desc: "Fabriquée à la main par le vieil artisan du village." },
  { id: 'runique', name: 'Canne runique',           price: 6000, speed: 0.38, window: 0.35, vigor: 0.52, cthulhu: 6,   color: '#9a48d8', desc: "Gravée de symboles que personne ne sait lire. Elle vibre la nuit." },
];
const ROD_BY_ID = Object.fromEntries(RODS.map((r) => [r.id, r]));

// Vigueur de base selon la rareté (0 = calme, 1 = déchaîné). Les abominations sont plus vigoureuses.
const TIER_VIGOR = [0.3, 0.45, 0.62, 0.8, 1.0, 1.45];
const ABOM_VIGOR = 1.2;

// rare : bonus de rareté. abom : chance d'abomination en plus. pack : quantité achetée (0 = illimité).
const BAITS = [
  { id: 'pain',     name: 'Mie de pain',         price: 0,    pack: 0,  rare: 0,   abom: 0,     color: '#f1e3c0', desc: "Gratuite et inépuisable." },
  { id: 'vers',     name: 'Vers de terre',       price: 25,   pack: 10, rare: 0.3, abom: 0.005, color: '#d07a6a', desc: "Un classique. Les perches en raffolent." },
  { id: 'asticots', name: 'Asticots',            price: 70,   pack: 10, rare: 0.6, abom: 0.01,  color: '#efe6c8', desc: "Ça grouille, ça attire tout le monde." },
  { id: 'vif',      name: 'Vif argenté',         price: 220,  pack: 10, rare: 1.0, abom: 0.02,  color: '#b8c4cc', desc: "Un petit poisson vivant. Les carnassiers ne résistent pas." },
  { id: 'lumi',     name: 'Appât luminescent',   price: 550,  pack: 10, rare: 1.4, abom: 0.05,  color: '#5ee0b0', desc: "Il brille d'une lueur verdâtre… qui attire aussi d'autres choses." },
  { id: 'oeil',     name: 'Œil des profondeurs', price: 1400, pack: 5,  rare: 2.0, abom: 0.12,  color: '#9b3b5a', desc: "On ne sait pas d'où il vient. Il cligne parfois." },
];
const BAIT_BY_ID = Object.fromEntries(BAITS.map((b) => [b.id, b]));

// Crustacés : pêchés avec les caisses. Même principe que les poissons (rareté, tailles, abominations).
const CRUSTS = [
  {
    kind: 'crust', id: 'crevette', name: "Crevette d'eau douce", tier: 0, spawn: 30, cm: [2, 6], kg: [0.001, 0.006], value: 3,
    color: '#e8a08a', shape: { type: 'shrimp', len: 40, h: 9, dark: '#b8604e' },
    desc: "Minuscule et translucide, elle grouille entre les galets. Les poissons en raffolent.",
    abomName: 'Crevette Grouillante', abomColor: '#6a4a6a',
    abomDesc: "Ce n'est pas une crevette. Ce sont des centaines de minuscules crevettes qui ont décidé de n'en former qu'une.",
  },
  {
    kind: 'crust', id: 'ecrevisse', name: 'Écrevisse', tier: 0, spawn: 26, cm: [8, 15], kg: [0.03, 0.12], value: 6,
    color: '#9a5a32', shape: { type: 'lobster', len: 44, h: 11, claw: 8, dark: '#6a3a1e' },
    desc: "Petite cousine du homard, elle se cache sous les pierres et pince les orteils imprudents.",
    abomName: 'Écrevisse Chuchotante', abomColor: '#4a3a52',
    abomDesc: "Quand on la colle à l'oreille, on entend la mer. Et une voix qui récite votre adresse.",
  },
  {
    kind: 'crust', id: 'crabe', name: 'Crabe vert', tier: 1, spawn: 16, cm: [5, 12], kg: [0.08, 0.35], value: 13,
    color: '#5a8a4a', shape: { type: 'crab', w: 28, h: 18, claw: 9, dark: '#3a5a2e' },
    desc: "Un crabe robuste et têtu, qui marche de travers par principe.",
    abomName: 'Crabe Sans-Fond', abomColor: '#3a3a5a',
    abomDesc: "Sa carapace est vide. En regardant dedans, on voit le ciel d'une autre planète.",
  },
  {
    kind: 'crust', id: 'mitaine', name: 'Crabe chinois', tier: 1, spawn: 12, cm: [5, 9], kg: [0.06, 0.3], value: 15,
    color: '#8a7a4a', shape: { type: 'crab', w: 26, h: 18, claw: 10, mitten: true, dark: '#5a4a2a' },
    desc: "On le reconnaît à ses pinces couvertes de poils, comme s'il portait des moufles.",
    abomName: "Crabe aux Mitaines d'Os", abomColor: '#5a4a4a',
    abomDesc: "Ses pinces velues sont tissées de cheveux. On préfère ne pas savoir d'où ils viennent.",
  },
  {
    kind: 'crust', id: 'ecrbleue', name: 'Écrevisse bleue', tier: 2, spawn: 6, cm: [10, 20], kg: [0.05, 0.25], value: 40,
    color: '#3a6ad8', shape: { type: 'lobster', len: 46, h: 11, claw: 10, dark: '#22408a' },
    desc: "Une rare mutation lui donne ce bleu électrique. Très recherchée par les collectionneurs.",
    abomName: 'Écrevisse Astrale', abomColor: '#2a2a6a',
    abomDesc: "Sa carapace est une carte des étoiles. Mais aucune de ces étoiles n'est encore née.",
  },
  {
    kind: 'crust', id: 'homard', name: 'Homard', tier: 2, spawn: 5, cm: [25, 60], kg: [0.5, 4], value: 50,
    color: '#2f4a6e', shape: { type: 'lobster', len: 56, h: 14, claw: 15, dark: '#1e3048' },
    desc: "Comment est-il arrivé dans un lac ? Personne ne le sait. Lui non plus.",
    abomName: 'Homard des Marées Noires', abomColor: '#2a1e3a',
    abomDesc: "Il grince comme une porte qu'on aurait dû laisser fermée.",
  },
  {
    kind: 'crust', id: 'araignee', name: 'Crabe-araignée géant', tier: 3, spawn: 2.5, cm: [80, 370], kg: [3, 19], value: 120,
    color: '#d07a3a', shape: { type: 'crab', w: 20, h: 16, claw: 7, legs: 38, spider: true, dark: '#9a4a1e' },
    desc: "Ses pattes peuvent dépasser trois mètres d'envergure. Il reste pourtant d'un calme olympien.",
    abomName: 'Araignée des Abysses', abomColor: '#3a2030',
    abomDesc: "Ses pattes ne finissent jamais. Elle a marché depuis le fond du lac jusqu'à vos cauchemars.",
  },
  {
    kind: 'crust', id: 'royal', name: 'Crabe royal', tier: 4, spawn: 0.8, cm: [60, 180], kg: [4, 12], value: 260,
    color: '#c0382a', shape: { type: 'crab', w: 32, h: 22, claw: 13, legs: 24, spiky: true, dark: '#8a2018' },
    desc: "Le souverain des fonds. Sa carapace hérissée vaut une petite fortune.",
    abomName: 'Le Roi Rongé', abomColor: '#4a1a2a',
    abomDesc: "Il porte une couronne de coquillages et de dents. Les autres crustacés s'inclinent sur son passage.",
  },
];
const CRUST_BY_ID = Object.fromEntries(CRUSTS.map((c) => [c.id, c]));
const creature = (id) => FISH_BY_ID[id] || CRUST_BY_ID[id];

// Caisses à crustacés. capacity : prises max. speed : vitesse de remplissage.
// rare / abom : bonus de rareté et d'abomination pour les prises de la caisse.
const POTS = [
  { id: 'osier',    name: 'Casier en osier',        price: 120,  capacity: 3,  speed: 1.0,  rare: 0,   abom: 0,    color: '#c8a060', desc: "Petit et léger. Il attrape surtout des crevettes." },
  { id: 'bois',     name: 'Caisse en bois',         price: 450,  capacity: 6,  speed: 1.15, rare: 0.1, abom: 0,    color: '#9a6236', desc: "Solide et spacieuse, la caisse préférée des pêcheurs du coin." },
  { id: 'cerclee',  name: 'Grande caisse cerclée',  price: 1200, capacity: 10, speed: 1.3,  rare: 0.2, abom: 0,    color: '#7a8590', desc: "Renforcée de cerclages en fer. Elle peut rester des heures au fond." },
  { id: 'profonde', name: 'Caisse des profondeurs', price: 2200, capacity: 5,  speed: 1.1,  rare: 1.0, abom: 0.03, color: '#2a4a7a', desc: "Lestée pour descendre très bas. Elle remonte des crustacés rares… et parfois pire." },
  { id: 'maudite',  name: 'Caisse maudite',         price: 5000, capacity: 6,  speed: 1.2,  rare: 1.6, abom: 0.1,  color: '#5a2a6a', desc: "Couverte de symboles gravés au couteau. Ce qu'elle attire n'aurait jamais dû remonter." },
];
const POT_BY_ID = Object.fromEntries(POTS.map((p) => [p.id, p]));
const POT_SLOTS = [{ x: 118, y: 152 }, { x: 338, y: 140 }];   // 2 caisses à l'eau au maximum
const POT_BASE_INTERVAL = 45;                                   // secondes par prise, en moyenne
const CORRUPTION_MAX_ABOMS = 30;                                // abominations pour un lac totalement corrompu

// ===========================================================================
// Utilitaires
// ===========================================================================
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const fmtNum = (n) => n.toLocaleString('fr-FR');
const fmtKg = (kg) => (kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg.toFixed(2).replace('.', ',')} kg`);
const fmtCm = (cm) => `${cm.toFixed(1).replace('.', ',')} cm`;
// Pourcentage lisible, avec plus de décimales pour les toutes petites chances (ex. 0,01 %)
function fmtPct(x) {
  const p = x * 100;
  const digits = p === 0 || p >= 1 ? 1 : p >= 0.1 ? 2 : 3;
  return `${p.toFixed(digits).replace(/\.?0+$/, '').replace('.', ',')} %`;
}
const fishName = (f, abom) => (abom ? f.abomName : f.name);
const dexKey = (f, abom) => (abom ? `${f.id}:abom` : f.id);
const coinImg = () => `<img class="coin" src="${ICONS.coin}" alt="pièces">`;

function fmtTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

// ===========================================================================
// Sauvegarde
// ===========================================================================
const SAVE_KEY = 'lacTranquille.save';

function emptyProgress() {
  return {
    v: 2,
    money: 0,
    rod: 'bambou',
    rods: ['bambou'],
    bait: 'pain',
    baits: {},
    dex: {},
    potsOwned: {},          // { [type]: nombre possédé }
    pots: [null, null],     // caisses à l'eau : { type, bait, placedAt, nextAt, contents: [] }
    achievements: {},       // { [id]: date de déblocage }
    items: [],              // inventaire : { uid, id }
    equip: {},              // { [emplacement]: uid }
    itemSeq: 0,
    clock: CLOCK_START,     // secondes de jeu depuis le début de la partie (1 jour = DAY_LEN)
    weather: null,          // { id, until } (until : en secondes de jeu)
    stats: {
      casts: 0, caught: 0, missed: 0, early: 0, aboms: 0, perfects: 0, chests: 0,
      crusts: 0, potsCollected: 0, cthulhu: 0, earned: 0, spent: 0, playTime: 0, best: null,
      itemsFound: 0, itemsSold: 0, itemsEarned: 0,
    },
  };
}

function migrate(s) {
  if (!s || typeof s !== 'object') return null;
  const p = emptyProgress();
  if (s.v !== 2) {
    p.stats.caught = s.count || 0;
    return p;
  }
  const out = {
    ...p, ...s,
    stats: { ...p.stats, ...s.stats },
    baits: { ...s.baits },
    dex: { ...s.dex },
    potsOwned: { ...s.potsOwned },
    achievements: { ...s.achievements },
    pots: [0, 1].map((i) => (s.pots?.[i] && POT_BY_ID[s.pots[i].type] ? s.pots[i] : null)),
  };
  if (!ROD_BY_ID[out.rod]) out.rod = 'bambou';
  if (!BAIT_BY_ID[out.bait]) out.bait = 'pain';
  out.rods = out.rods.filter((id) => ROD_BY_ID[id]);
  if (!out.rods.includes('bambou')) out.rods.unshift('bambou');
  // équipement : on ne garde que les objets connus, et un équipement doit pointer vers un objet de l'inventaire
  out.items = (Array.isArray(s.items) ? s.items : []).filter((it) => it && ITEM_BY_ID[it.id] && Number.isFinite(it.uid));
  out.itemSeq = Math.max(Number(s.itemSeq) || 0, ...out.items.map((it) => it.uid));
  out.equip = {};
  for (const sl of SLOTS) {
    const it = out.items.find((x) => x.uid === s.equip?.[sl.id]);
    if (it && ITEM_BY_ID[it.id].slot === sl.id) out.equip[sl.id] = it.uid;
  }
  out.clock = Number.isFinite(s.clock) ? s.clock : CLOCK_START;
  out.weather = s.weather && WEATHER_BY_ID[s.weather.id] ? s.weather : null;
  return out;
}

function loadSave() {
  try { return migrate(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { return null; }
}
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch { /* stockage indisponible */ }
}
function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* idem */ }
}

// ===========================================================================
// État du jeu
// ===========================================================================
let progress = emptyProgress();
let inGame = false;

// Mode admin (outils de test) : réglage local, hors sauvegarde de partie
const ADMIN_KEY = 'lacTranquille.admin';
const admin = { on: false, forced: 'random', corruption: null };
try { admin.on = !!JSON.parse(localStorage.getItem(ADMIN_KEY))?.on; } catch { /* stockage indisponible */ }

const rod = () => ROD_BY_ID[progress.rod];
const bait = () => BAIT_BY_ID[progress.bait];
// Corruption du lac (0 → 1) : grandit avec le nombre d'abominations pêchées
function corruption() {
  if (admin.on && admin.corruption !== null) return admin.corruption;
  return clamp((progress.stats.aboms || 0) / CORRUPTION_MAX_ABOMS, 0, 1);
}

// ---------------------------------------------------------------------------
// Temps, météo et modificateurs (équipement + météo + nuit)
// ---------------------------------------------------------------------------
const hourOf = (clock) => (((clock % DAY_LEN) + DAY_LEN) % DAY_LEN) / DAY_LEN * 24;
const dayOf = (clock) => Math.floor(clock / DAY_LEN) + 1;
const isNightHour = (h) => h >= 20 || h < 5.5;
const isNight = () => inGame && isNightHour(hourOf(progress.clock));
const weather = () => WEATHER_BY_ID[progress.weather?.id] || WEATHER_BY_ID.clair;
function fmtHour(clock) {
  const m = Math.floor(hourOf(clock) * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

const itemDef = (inst) => ITEM_BY_ID[inst.id];
const itemByUid = (uid) => progress.items.find((it) => it.uid === uid);
const equippedItem = (slot) => {
  const inst = progress.equip[slot] != null ? itemByUid(progress.equip[slot]) : null;
  return inst ? itemDef(inst) : null;
};
const isEquipped = (inst) => progress.equip[itemDef(inst).slot] === inst.uid;

// Toutes les sources d'effets actives : objets équipés, météo, nuit
function activeSources() {
  const out = [];
  for (const sl of SLOTS) {
    const it = equippedItem(sl.id);
    if (it) out.push({ kind: 'item', name: it.name, fx: it.fx, icon: equipIcon(it) });
  }
  if (inGame) {
    const w = weather();
    if (Object.keys(w.fx).length) out.push({ kind: 'weather', name: w.name, fx: w.fx, icon: weatherIcon(w.id) });
    if (isNight()) out.push({ kind: 'night', name: NIGHT.name, fx: NIGHT.fx, icon: weatherIcon('nuit') });
  }
  return out;
}

function sumFx(sources) {
  const m = {};
  for (const [k, d] of Object.entries(FX)) m[k] = d.mul ? 1 : 0;
  for (const s of sources) for (const [k, v] of Object.entries(s.fx)) m[k] = FX[k].mul ? m[k] * v : m[k] + v;
  return m;
}

// recalculé une fois par image (et à chaque changement d'équipement)
let modsCache = null;
function mods() {
  if (!modsCache) {
    modsCache = sumFx(activeSources());
    modsCache.speed = Math.min(modsCache.speed, 0.6);
    modsCache.vigor = Math.min(modsCache.vigor, 0.6);
  }
  return modsCache;
}
const invalidateMods = () => { modsCache = null; };

const abomChance = (b = bait()) => clamp((BASE_ABOM_CHANCE + b.abom + mods().abom) * mods().abomMul, 0, 0.9);
function fishWeight(f, b = bait()) {
  const M = mods();
  let w = f.spawn * (1 + (b.rare + M.rare) * f.tier);
  if (f.tier === 4 && !f.unique) w *= M.legend;
  // le Grand Ancien : la canne, la corruption du lac et l'orage l'attirent
  return f.unique ? w * rod().cthulhu * (1 + corruption() * 4) * M.cthulhu : w;
}

function fishOdds(b = bait()) {
  const total = FISH.reduce((s, f) => s + fishWeight(f, b), 0);
  return FISH.map((f) => fishWeight(f, b) / total);
}

// states : idle → casting → waiting → bite → (caught | missed | early) → idle
const game = {
  state: 'idle',
  t: 0,
  float: { x: 0, y: 0, from: null, to: null },
  biteAt: 0,
  nextNibble: 0,
  nibble: 0,
  fish: null,
  catch: null,
};

const ripples = [];
let time = 0;
const CAST_TIME = 0.9;

function setState(state) { game.state = state; game.t = 0; }
function say(text) { $('message').textContent = text; }
function addRipple(x, y, strength = 1) { ripples.push({ x, y, r: 1, max: 14 * strength, a: 1 }); }
function perspective(y) { return 0.5 + ((y - HORIZON) / (LH - HORIZON)) * 0.8; }
const boatBob = () => Math.round(Math.sin(time * (1.3 + wv.storm)) * (1.5 + wv.wind + wv.storm * 1.5));

function rodTip() {
  let bend = 0;
  if (game.state === 'bite') bend = 8 + Math.round(Math.sin(time * 30) * 2);
  if (game.state === 'reeling') bend = (holding ? 11 : 7) + Math.round(Math.sin(time * (10 + game.mg.vigor * 25)) * (1 + game.mg.vigor * 2));
  if (game.state === 'casting') bend = -14 * (1 - game.t / CAST_TIME);
  return { x: 306, y: Math.round(150 + boatBob() + bend) };
}

// ===========================================================================
// Pêche
// ===========================================================================
function pickFish() {
  if (admin.on && admin.forced !== 'random') {
    const [id, ab] = admin.forced.split(':');
    if (FISH_BY_ID[id]) return { f: FISH_BY_ID[id], abom: ab === 'abom' };
  }
  const b = bait();
  const total = FISH.reduce((s, f) => s + fishWeight(f, b), 0);
  let r = Math.random() * total;
  let f = FISH[0];
  for (const cand of FISH) {
    r -= fishWeight(cand, b);
    if (r <= 0) { f = cand; break; }
  }
  return { f, abom: !f.unique && Math.random() < abomChance(b) };
}

function consumeBait() {
  const b = bait();
  if (b.pack === 0) return;
  progress.baits[b.id] = (progress.baits[b.id] || 0) - 1;
  if (progress.baits[b.id] <= 0) {
    delete progress.baits[b.id];
    progress.bait = 'pain';
    game.baitRanOut = b.name;
  }
}

function cast() {
  game.float.from = rodTip();
  game.float.to = { x: Math.round(rand(80, 400)), y: Math.round(rand(HORIZON + 14, 196)) };
  if (Math.abs(game.float.to.x - BOAT_X) < 70 && game.float.to.y > 182) game.float.to.y = 172;
  game.fish = pickFish();
  game.baitRanOut = null;
  consumeBait();
  progress.stats.casts++;
  updateHud();
  setState('casting');
  say('');
  Sound.cast();
}

function startWaiting() {
  game.float.x = game.float.to.x;
  game.float.y = game.float.to.y;
  addRipple(game.float.x, game.float.y, 1.3);
  const wait = rod().speed * (1 - mods().speed);
  game.biteAt = rand(3, 10) * wait;
  game.nextNibble = rand(0.8, 2.2) * wait;
  game.nibble = 0;
  setState('waiting');
  say(game.baitRanOut ? `Plus de ${game.baitRanOut} ! Retour à la mie de pain. Patience…` : 'Patience…');
  Sound.splash();
}

function reactionWindow() {
  const { f, abom } = game.fish;
  return f.window * (abom ? 0.85 : 1) + rod().window + mods().window;
}

function rollCatch(f, abom) {
  const q = Math.random() ** 1.6;
  const qw = clamp(q + rand(-0.12, 0.12), 0, 1);
  let size = lerp(f.cm[0], f.cm[1], q);
  let weight = lerp(f.kg[0], f.kg[1], qw ** 1.5);
  if (abom) { size *= 1.4; weight *= 1.8; }
  const money = Math.round(f.value * (0.5 + ((q + qw) / 2) * 1.5) * (abom ? 2 : 1));
  return { size: Math.round(size * 10) / 10, weight: Math.round(weight * 1000) / 1000, money };
}

// Enregistre une prise (poisson ou crustacé) : carnet, statistiques, pièces
function registerCatch(f, abom, c) {
  const key = dexKey(f, abom);
  const entry = progress.dex[key];
  const flags = {
    newSpecies: !entry,
    sizeRecord: !!entry && c.size > entry.maxSize,
    weightRecord: !!entry && c.weight > entry.maxWeight,
  };
  progress.dex[key] = {
    count: (entry?.count || 0) + 1,
    maxSize: Math.max(entry?.maxSize || 0, c.size),
    maxWeight: Math.max(entry?.maxWeight || 0, c.weight),
  };
  const st = progress.stats;
  if (abom) st.aboms++;
  st.earned += c.money;
  progress.money += c.money;
  return flags;
}

function strike() {
  const { f, abom } = game.fish;
  const c = rollCatch(f, abom);
  const M = mods();
  c.money = Math.round(c.money * (1 + M.gold));
  const m = game.mg;
  const perfect = !!m?.perfect;
  const bonus = perfect ? Math.max(1, Math.round(c.money * MG.perfectBonus * (1 + M.perfect))) : 0;
  const loot = m?.chest?.got ? rollChestLoot() : null;
  const flags = registerCatch(f, abom, c);
  const drop = Math.random() < itemDropChance(f.tier, abom, 'fish') ? addItem(rollItem(f.tier, abom)) : null;
  game.catch = { f, abom, ...c, perfect, bonus, loot, drop, goldBonus: M.gold, ...flags };
  if (f.unique) progress.stats.cthulhu = (progress.stats.cthulhu || 0) + 1;
  if (loot) {
    progress.baits[loot.bait.id] = (progress.baits[loot.bait.id] || 0) + loot.qty;
    progress.stats.chests = (progress.stats.chests || 0) + 1;
  }
  if (perfect) {
    progress.stats.perfects = (progress.stats.perfects || 0) + 1;
    progress.money += bonus;
    progress.stats.earned += bonus;
    showPerfect();
  }
  const st = progress.stats;
  st.caught++;
  if (!st.best || c.weight > st.best.weight) st.best = { id: f.id, abom, weight: c.weight, size: c.size };
  writeSave();
  updateHud();
  setState('caught');
  say('');
  showCatchCard();
  Sound.catchFish(abom || f.unique);
  if (drop) setTimeout(() => Sound.itemFound(itemDef(drop.inst).tier), 500);
  checkAchievements({ type: 'catch', f, abom, perfect, ...flags });
  if (drop) checkAchievements({ type: 'item', item: itemDef(drop.inst) });
}

// ---------------------------------------------------------------------------
// Objets (équipement)
// ---------------------------------------------------------------------------
// Chance qu'une prise rapporte un objet, selon sa rareté et la source (poisson ou caisse)
function itemDropChance(tier, abom, source) {
  const base = source === 'fish' ? 0.04 + 0.015 * tier : 0.025 + 0.01 * tier;
  return clamp((base + (abom ? 0.05 : 0)) * (1 + mods().luck), 0, 0.9);
}

// Tirage d'un objet : les prises rares (et les abominations) donnent de meilleurs objets
function itemWeights(srcTier = 0, abom = false) {
  const q = srcTier * 0.35 + (abom ? 0.8 : 0) + mods().rare * 0.5;
  return ITEMS.map((it) => ITEM_TIER_WEIGHT[it.tier] * (1 + q * it.tier));
}
function rollItem(srcTier = 0, abom = false) {
  const w = itemWeights(srcTier, abom);
  let r = Math.random() * w.reduce((s, x) => s + x, 0);
  for (let i = 0; i < ITEMS.length; i++) {
    r -= w[i];
    if (r <= 0) return ITEMS[i];
  }
  return ITEMS[0];
}

// Ajoute un objet à l'inventaire. S'il est plein, l'objet est vendu automatiquement.
function addItem(it) {
  progress.stats.itemsFound = (progress.stats.itemsFound || 0) + 1;
  const inst = { uid: ++progress.itemSeq, id: it.id };
  if (progress.items.length >= ITEM_CAP) {
    const v = itemValue(it);
    progress.money += v;
    progress.stats.earned += v;
    return { inst, sold: v };
  }
  progress.items.push(inst);
  return { inst, sold: 0 };
}

function equipItem(uid) {
  const inst = itemByUid(uid);
  if (!inst) return;
  progress.equip[itemDef(inst).slot] = uid;
  onEquipChange();
}
function unequipSlot(slot) {
  delete progress.equip[slot];
  onEquipChange();
}
function sellItems(uids) {
  let total = 0;
  for (const uid of uids) {
    const i = progress.items.findIndex((it) => it.uid === uid);
    if (i < 0 || isEquipped(progress.items[i])) continue;
    total += itemValue(itemDef(progress.items[i]));
    progress.items.splice(i, 1);
    progress.stats.itemsSold = (progress.stats.itemsSold || 0) + 1;
  }
  progress.money += total;
  progress.stats.earned += total;
  progress.stats.itemsEarned = (progress.stats.itemsEarned || 0) + total;
  return total;
}
function onEquipChange() {
  invalidateMods();
  refreshBoat();
  writeSave();
  updateHud();
  checkAchievements();
}

// ---------------------------------------------------------------------------
// Caisses à crustacés
// ---------------------------------------------------------------------------
const potType = (p) => POT_BY_ID[p.type];
const potFull = (p) => p.contents.length >= potType(p).capacity;

function potInterval(p) {
  return POT_BASE_INTERVAL / (potType(p).speed * (1 + BAIT_BY_ID[p.bait].rare * 0.4) * (1 + mods().crate));
}
const potAbomChance = (pot) => clamp((BASE_ABOM_CHANCE + BAIT_BY_ID[pot.bait].abom + potType(pot).abom + mods().abom) * mods().abomMul, 0, 0.9);

function potsAvailable(typeId) {
  const deployed = progress.pots.filter((p) => p && p.type === typeId).length;
  return (progress.potsOwned[typeId] || 0) - deployed;
}

function crustOdds(pot) {
  const b = BAIT_BY_ID[pot.bait];
  const rare = b.rare + potType(pot).rare + mods().rare;
  const weights = CRUSTS.map((cr) => cr.spawn * (1 + rare * cr.tier) * (cr.tier === 4 ? mods().legend : 1));
  const total = weights.reduce((s, w) => s + w, 0);
  return weights.map((w) => w / total);
}

function rollCrust(pot) {
  const odds = crustOdds(pot);
  let r = Math.random();
  let cr = CRUSTS[0];
  for (let i = 0; i < CRUSTS.length; i++) {
    r -= odds[i];
    if (r <= 0) { cr = CRUSTS[i]; break; }
  }
  const abom = Math.random() < potAbomChance(pot);
  return { id: cr.id, abom, ...rollCatch(cr, abom) };
}

// Fait "travailler" les caisses : une prise de temps en temps, en temps réel (même jeu fermé)
function tickPots() {
  const now = Date.now();
  for (const p of progress.pots) {
    if (!p) continue;
    let guard = 0;
    while (!potFull(p) && now >= p.nextAt && guard++ < 50) {
      p.contents.push(rollCrust(p));
      p.nextAt += potInterval(p) * rand(0.6, 1.4) * 1000;
    }
  }
}

function deployPot(slot, typeId, baitId) {
  if (progress.pots[slot] || potsAvailable(typeId) <= 0) return false;
  if (baitId !== 'pain') {
    if (!(progress.baits[baitId] > 0)) baitId = 'pain';
    else if (--progress.baits[baitId] <= 0) {
      delete progress.baits[baitId];
      if (progress.bait === baitId) progress.bait = 'pain';
    }
  }
  const now = Date.now();
  const pot = { type: typeId, bait: baitId, placedAt: now, nextAt: now, contents: [] };
  pot.nextAt = now + potInterval(pot) * rand(0.6, 1.4) * 1000;
  progress.pots[slot] = pot;
  addRipple(POT_SLOTS[slot].x, POT_SLOTS[slot].y, 1.2);
  Sound.splash();
  writeSave();
  updateHud();
  return true;
}

let lastPot = null;   // dernière caisse relevée (pour le récapitulatif)

function collectPot(slot) {
  tickPots();
  const pot = progress.pots[slot];
  if (!pot) return;
  progress.pots[slot] = null;
  const gold = 1 + mods().gold;
  const drops = [];
  const results = pot.contents.map((it) => {
    const cr = CRUST_BY_ID[it.id];
    const c = { ...it, money: Math.round(it.money * gold) };
    if (Math.random() < itemDropChance(cr.tier, it.abom, 'pot')) drops.push(addItem(rollItem(cr.tier, it.abom)));
    return { cr, ...c, ...registerCatch(cr, it.abom, c) };
  });
  progress.stats.crusts = (progress.stats.crusts || 0) + results.length;
  progress.stats.potsCollected = (progress.stats.potsCollected || 0) + 1;
  lastPot = { slot, type: pot.type, bait: pot.bait, results, drops };
  addRipple(POT_SLOTS[slot].x, POT_SLOTS[slot].y, 1);
  if (results.length) Sound.catchFish(results.some((r) => r.abom)); else Sound.miss();
  if (drops.length) setTimeout(() => Sound.itemFound(Math.max(...drops.map((d) => itemDef(d.inst).tier))), 500);
  for (const r of results) checkAchievements({ type: 'catch', ...r, f: r.cr });
  for (const d of drops) checkAchievements({ type: 'item', item: itemDef(d.inst) });
  checkAchievements({ type: 'collect', full: results.length >= POT_BY_ID[pot.type].capacity });
  writeSave();
  updateHud();
  openPanel('pot');
}

// ---------------------------------------------------------------------------
// Mini-jeu de remontée : garder la barre verte sur le poisson
// ---------------------------------------------------------------------------
const MG = {
  barSize: 0.28,      // hauteur de la barre verte (fraction de la jauge)
  thrust: 3.4,        // accélération vers le haut quand on maintient
  gravity: 1.9,       // accélération vers le bas sinon
  maxSpeed: 1.6,
  fill: 0.24,         // progression gagnée par seconde sur le poisson
  drain: 0.15,        // progression perdue par seconde hors du poisson
  start: 0.3,
  perfectBonus: 0.5,  // +50 % de pièces pour une prise parfaite
  chestChance: 0.1,   // chance qu'un coffre apparaisse pendant la remontée
  chestFill: 0.45,
  chestDrain: 0.2,
};
let holding = false;

// Butin d'un coffre : un appât (hors mie de pain), d'autant plus rare qu'il est cher, de 1 à 20 unités
function rollChestLoot() {
  const pool = BAITS.filter((b) => b.price > 0);
  const total = pool.reduce((s, b) => s + 1 / b.price, 0);
  let r = Math.random() * total;
  let bait = pool[0];
  for (const b of pool) {
    r -= 1 / b.price;
    if (r <= 0) { bait = b; break; }
  }
  return { bait, qty: 1 + Math.floor(Math.random() ** 1.3 * 20) };
}

function chestOdds() {
  const pool = BAITS.filter((b) => b.price > 0);
  const total = pool.reduce((s, b) => s + 1 / b.price, 0);
  return pool.map((b) => [b, 1 / b.price / total]);
}

function fishVigor(f, abom) {
  return TIER_VIGOR[f.tier] * (abom ? ABOM_VIGOR : 1) * rod().vigor * (1 - mods().vigor) * mods().vigorMul;
}
const barSize = () => clamp(MG.barSize * (1 + mods().bar), 0.1, 0.5);
const chestChance = () => clamp(MG.chestChance * (1 + mods().chest), 0, 0.6);

// ---------------------------------------------------------------------------
// Le Grand Ancien : il sort de l'eau, puis 3 barres d'affilée, de plus en plus dures
// ---------------------------------------------------------------------------
const CTH_RISE_TIME = 5.5;
const CTH_PHASES = [
  { vigor: 1.05, bar: 1.0,  fill: 1.0,  name: 'Il tire vers le fond…' },
  { vigor: 1.4,  bar: 0.82, fill: 0.9,  name: 'Il se débat de plus belle !' },
  { vigor: 1.8,  bar: 0.66, fill: 0.8,  name: 'Sa fureur fait trembler le lac !' },
];
// active : il est visible ; rise : 0 (sous l'eau) → 1 (dressé) ; target : vers où il bouge
const cth = { active: false, rise: 0, target: 0, rage: 0, shake: 0, sprite: null, spriteT: -1 };

function startCthulhuRise() {
  cth.active = true;
  cth.rise = 0;
  cth.target = 1;
  cth.rage = 0;
  holding = false;
  setState('rising');
  say('Le lac se soulève… LE GRAND ANCIEN S\'ÉVEILLE !');
  Sound.setMusic('epic', 1);
  Sound.hook();
  setTimeout(() => Sound.roar(), 900);
}

function cthulhuSink() {
  cth.target = 0;
}

function updateCthulhu(dt) {
  if (!cth.active) return;
  cth.shake = Math.max(0, cth.shake - dt * 0.8);
  if (inGame && game.state === 'rising') {
    if (!$('overlay').hidden) return;
    const p = clamp(game.t / (CTH_RISE_TIME - 0.6), 0, 1);
    cth.rise = p * p * (3 - 2 * p);
    cth.shake = Math.max(cth.shake, 0.3 + p * 0.7);
    if (Math.random() < dt * 0.7) storm.flash = 0.8;
  } else {
    cth.rise += (cth.target - cth.rise) * Math.min(1, dt * (cth.target ? 2 : 0.55));
    if (cth.target === 0 && cth.rise < 0.02) {
      cth.active = false;
      Sound.setMusic('calm');
    }
  }
}

// Sprite géant du Grand Ancien (redessiné ~15 fois par seconde pour animer les tentacules)
const CTH_SPR = { w: 290, h: 190, ox: 145, oy: 78, scale: 1.7 };
function cthSprite() {
  const k = Math.floor(time * 15);
  if (cth.sprite && cth.spriteT === k && cth.spriteRage === cth.rage) return cth.sprite;
  if (!cth.sprite) cth.sprite = makeCanvas(CTH_SPR.w, CTH_SPR.h);
  const cv = cth.sprite;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  c.save();
  c.translate(CTH_SPR.ox, CTH_SPR.oy);
  c.scale(CTH_SPR.scale, CTH_SPR.scale);
  drawCthulhuVector(c, { t: time, rage: cth.rage });
  c.restore();
  pixelize(cv, '#06140c', '#3fd08a');
  cth.spriteT = k;
  cth.spriteRage = cth.rage;
  return cv;
}

const CTH_WATERLINE = 160;
function drawCthulhuRising() {
  if (!cth.active || cth.rise <= 0.005) return;
  const spr = cthSprite();
  const x = Math.round(240 - CTH_SPR.ox + Math.sin(time * 0.7) * 4);
  const top = Math.round(CTH_WATERLINE - CTH_SPR.h * 0.9 * cth.rise);
  const above = CTH_WATERLINE - top;
  ctx.drawImage(spr, 0, 0, CTH_SPR.w, above, x, top, CTH_SPR.w, above);           // hors de l'eau
  const below = Math.min(CTH_SPR.h - above, LH - CTH_WATERLINE);
  if (below > 0) {                                                                 // sous l'eau, en transparence
    ctx.globalAlpha = 0.25;
    ctx.drawImage(spr, 0, above, CTH_SPR.w, below, x, CTH_WATERLINE, CTH_SPR.w, below);
    ctx.globalAlpha = 1;
  }
  // écume à la surface et eau qui ruisselle de son corps
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 60; i++) {
    const fx = x + 30 + ((i * 37) % (CTH_SPR.w - 60));
    const fy = CTH_WATERLINE + Math.round(Math.sin(time * 6 + i) * 1.5);
    pxRect(ctx, fx, fy, 2 + (i % 3), 1, '#e8f6ff');
  }
  if (cth.rise > 0.25) {
    for (let k = 0; k < 10; k++) {
      const sx = x + 50 + ((k * 53) % (CTH_SPR.w - 100));
      const span = Math.min(above, 70);
      const sy = CTH_WATERLINE - span + ((time * 90 + k * 17) % span);
      pxRect(ctx, sx, sy, 1, 4, '#bfe6ff');
    }
  }
  ctx.globalAlpha = 1;
}

function startReel(phase = 0) {
  const { f, abom } = game.fish;
  const cp = f.unique ? CTH_PHASES[phase] : null;
  const bs = barSize() * (cp ? cp.bar : 1);
  game.mg = {
    vigor: cp ? cp.vigor * (0.6 + 0.4 * rod().vigor) * (1 - mods().vigor * 0.5) : fishVigor(f, abom),
    phase: cp ? phase : -1,
    fillMul: cp ? cp.fill : 1,
    barSize: bs,
    bar: 0,
    barV: 0,
    fish: bs / 2,                  // le poisson démarre dans la barre
    fishTarget: bs / 2,
    fishTimer: 0.6,
    progress: MG.start,
    inZone: true,
    perfect: true,
    tick: 0,
    t: 0,
    chest: !cp && Math.random() < chestChance()
      ? { pos: rand(0.08, 0.92), appearAt: rand(0.8, 3), visible: false, progress: 0, got: false, inZone: false, flash: 0 }
      : null,
    from: { x: game.float.x, y: game.float.y },
  };
  // une prise parfaite contre le Grand Ancien doit l'être sur les 3 phases
  if (cp && phase > 0) game.mg.perfect = game.perfectSoFar;
  setState('reeling');
  say(cp ? `Phase ${phase + 1} / 3 — ${cp.name} Maintenez le clic !` : 'Maintenez le clic (ou Espace) pour faire monter la barre verte !');
  Sound.hook();
}

// Fin d'une phase du combat : pause, puis la suivante (plus dure)
function nextCthulhuPhase() {
  const m = game.mg;
  game.perfectSoFar = m.perfect;
  game.nextPhase = m.phase + 1;
  holding = false;
  cth.rage = game.nextPhase;
  cth.shake = 1.2;
  setState('phaseBreak');
  say(`Phase ${m.phase + 1} réussie ! Il rugit… préparez-vous !`);
  Sound.phase();
  Sound.setMusic('epic', game.nextPhase + 1);
  setTimeout(() => Sound.roar(), 300);
  addRipple(240, 150, 4);
}

function updateReel(dt) {
  const m = game.mg;
  // le poisson choisit régulièrement une nouvelle cible, plus loin et plus souvent s'il est vigoureux
  m.fishTimer -= dt;
  if (m.fishTimer <= 0) {
    const reach = 0.2 + m.vigor * 0.55;
    m.fishTarget = clamp(m.fish + rand(-reach, reach), 0.03, 0.97);
    m.fishTimer = rand(0.3, 1.4) * (1.25 - m.vigor * 0.6);
    if (Math.random() < m.vigor * 0.18) m.fishTarget = Math.random() < 0.5 ? 0.04 : 0.96;   // fuite brutale
  }
  const speed = 1.2 + m.vigor * 4;
  m.fish += (m.fishTarget - m.fish) * Math.min(1, dt * speed);
  m.fish = clamp(m.fish + Math.sin(time * (8 + m.vigor * 14)) * m.vigor * 0.004, 0, 1);

  // la barre verte : poussée quand on maintient, gravité sinon, petit rebond en bas
  m.barV += (holding ? MG.thrust - MG.gravity : -MG.gravity) * dt;
  m.barV = clamp(m.barV, -MG.maxSpeed, MG.maxSpeed);
  m.bar += m.barV * dt;
  if (m.bar < 0) { m.bar = 0; m.barV = m.barV < -0.3 ? -m.barV * 0.35 : 0; }
  if (m.bar > 1 - m.barSize) { m.bar = 1 - m.barSize; m.barV = Math.min(0, m.barV); }

  m.inZone = m.fish >= m.bar && m.fish <= m.bar + m.barSize;
  if (!m.inZone) m.perfect = false;
  m.progress += (m.inZone ? MG.fill * m.fillMul : -MG.drain * (1 + m.vigor * 0.4)) * dt;

  // coffre : immobile, se récupère en gardant la barre dessus
  m.t += dt;
  const ch = m.chest;
  if (ch && !ch.got) {
    if (!ch.visible && m.t >= ch.appearAt) { ch.visible = true; Sound.chestAppear(); }
    if (ch.visible) {
      ch.inZone = ch.pos >= m.bar && ch.pos <= m.bar + m.barSize;
      ch.progress = clamp(ch.progress + (ch.inZone ? MG.chestFill : -MG.chestDrain) * dt, 0, 1);
      if (ch.progress >= 1) {
        ch.got = true;
        ch.flash = 0.6;
        Sound.chestGet();
        say('Coffre récupéré ! Ramenez le poisson pour le garder.');
      }
    }
  }
  if (ch && ch.flash > 0) ch.flash -= dt;

  if (m.inZone) {
    m.tick -= dt;
    if (m.tick <= 0) { m.tick = 0.09; Sound.reel(m.progress); }
  }
  // le flotteur se rapproche du bateau à mesure qu'on remonte
  const p = clamp(m.progress, 0, 1);
  game.float.x = lerp(m.from.x, BOAT_X + 60, p * 0.6);
  game.float.y = lerp(m.from.y, BOAT_Y - 10, p * 0.6);
  if (Math.random() < dt * (3 + m.vigor * 8)) addRipple(game.float.x + rand(-3, 3), game.float.y, 0.6 + m.vigor * 0.6);

  if (m.progress >= 1) {
    holding = false;
    if (m.phase >= 0 && m.phase < CTH_PHASES.length - 1) nextCthulhuPhase();
    else strike();
  } else if (m.progress <= 0) {
    progress.stats.missed++;
    holding = false;
    setState('missed');
    checkAchievements({ type: 'escape', f: game.fish.f });
    const lostChest = m.chest?.got ? ' Le coffre est reparti avec lui.' : '';
    if (game.fish.f.unique) {
      cthulhuSink();
      cth.shake = 1;
      say(`Le Grand Ancien a brisé la ligne à la phase ${m.phase + 1} / 3… Il replonge dans les abysses.`);
    } else say((game.fish.abom ? 'La chose a cassé la ligne et a disparu dans les profondeurs…' : "Le poisson s'est échappé…") + lostChest);
    Sound.miss();
    writeSave();
  }
}

function onAction() {
  if (!inGame || !$('overlay').hidden) return;
  switch (game.state) {
    case 'idle':
      cast();
      break;
    case 'waiting':
      progress.stats.early++;
      setState('early');
      say(game.nibble > 0 ? "Trop tôt ! Ce n'était qu'une touche timide…" : "Trop tôt ! Rien n'a mordu.");
      Sound.early();
      writeSave();
      break;
    case 'bite':
      if (game.fish.f.unique) startCthulhuRise();
      else startReel();
      break;
    // 'caught' : on ne passe le récapitulatif qu'avec le bouton « Continuer »
  }
}

function continueAfterCatch() {
  if (game.state !== 'caught') return;
  $('catch-card').hidden = true;
  if (cth.active) cthulhuSink();
  setState('idle');
  say('Cliquez pour lancer la ligne');
  Sound.click();
}

// ===========================================================================
// Mise à jour
// ===========================================================================
let saveTimer = 0;

let potTimer = 0;

// ---------------------------------------------------------------------------
// Horloge, jour/nuit et météo
// ---------------------------------------------------------------------------
function rollWeather(prev) {
  const night = isNightHour(hourOf(progress.clock));
  if (prev === 'pluie' && !night && Math.random() < 0.4) return 'arcenciel';
  const pool = WEATHERS.filter((w) => w.weight > 0 && w.id !== prev && !(night && w.dayOnly));
  const weights = pool.map((w) => w.weight * (w.id === 'orage' && (prev === 'pluie' || prev === 'nuageux') ? 2.5 : 1));
  let r = Math.random() * weights.reduce((s, x) => s + x, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i].id;
  }
  return 'clair';
}

function setWeather(id, announce = true) {
  const w = WEATHER_BY_ID[id];
  progress.weather = { id, until: progress.clock + rand(w.dur[0], w.dur[1]) };
  invalidateMods();
  if (announce) {
    pushToast({ icon: weatherIcon(id), label: 'Changement de météo', title: w.name,
      sub: Object.keys(w.fx).length ? fxLines(w.fx).join(' · ') : 'Aucun effet', sound: () => Sound.chestAppear() });
  }
  updateWorldHud(true);
  if (openPanelName === 'sheet') renderSheet();
}

function updateClock(dt) {
  const prev = progress.clock;
  progress.clock += dt;
  const wasNight = isNightHour(hourOf(prev));
  const night = isNightHour(hourOf(progress.clock));
  if (night !== wasNight) {
    invalidateMods();
    pushToast(night
      ? { icon: weatherIcon('nuit'), label: 'La nuit tombe', title: `Nuit du jour ${dayOf(progress.clock)}`, sub: fxLines(NIGHT.fx).join(' · '), sound: () => Sound.chestAppear() }
      : { icon: weatherIcon('soleil'), label: 'Le jour se lève', title: `Jour ${dayOf(progress.clock)}`, sound: () => Sound.chestAppear() });
  }
  const w = progress.weather;
  if (!w) setWeather('clair', false);
  else if (progress.clock >= w.until || (night && weather().dayOnly)) setWeather(rollWeather(w.id));
}

// Lumière selon l'heure : 0 = plein jour, 1 = nuit noire
function darknessAt(h) {
  if (h >= 7 && h < 18) return 0;
  if (h >= 18 && h < 21) return (h - 18) / 3;
  if (h >= 21 || h < 4.5) return 1;
  return 1 - (h - 4.5) / 2.5;
}
// Lueur orangée de l'aube et du crépuscule
const duskAt = (h) => clamp(Math.max(1 - Math.abs(h - 19) / 1.5, 1 - Math.abs(h - 6) / 1.2, 0), 0, 1);
function sunPos(h) {
  if (h < 5 || h > 20.5) return null;
  const p = (h - 5) / 15.5;
  return { x: Math.round(30 + p * 420), y: Math.round(104 - Math.sin(p * Math.PI) * 86) };
}
function moonPos(h) {
  const n = h >= 19 ? (h - 19) / 12 : h < 7 ? (h + 5) / 12 : null;
  if (n === null) return null;
  return { x: Math.round(30 + n * 420), y: Math.round(104 - Math.sin(n * Math.PI) * 80) };
}

// État visuel, qui glisse doucement vers la météo et l'heure actuelles
const wv = { overcast: 0, storm: 0, rain: 0, fog: 0, wind: 0.1, sun: 0, rainbow: 0, dark: 0, dusk: 0, hour: 10 };
const VIS_KEYS = ['overcast', 'storm', 'rain', 'fog', 'wind', 'sun', 'rainbow'];
const drops = [];
const gusts = [];
const storm = { next: 4, flash: 0, bolt: null, boltT: 0 };
let rainSoundTimer = 0;

function newDrop(anywhere) {
  return { x: rand(-60, LW), y: anywhere ? rand(-10, LH) : rand(-24, -4), v: rand(230, 300), len: Math.round(rand(4, 7)), end: rand(HORIZON + 2, LH) };
}

function makeBolt() {
  const pts = [];
  let x = rand(70, 410);
  const bottom = rand(70, 100);
  for (let y = 0; y <= bottom; y += Math.round(rand(5, 9))) {
    pts.push({ x: Math.round(x), y });
    x += rand(-7, 7);
  }
  const k = Math.floor(pts.length / 2);
  const branch = [pts[k]];
  let bx = pts[k].x;
  for (let y = pts[k].y; y < pts[k].y + 26; y += 6) { bx += rand(2, 8); branch.push({ x: Math.round(bx), y }); }
  return [pts, branch];
}

function updateWorldVisuals(dt) {
  const target = inGame ? weather().vis : WEATHER_BY_ID.clair.vis;
  for (const k of VIS_KEYS) wv[k] += ((target[k] || 0) - wv[k]) * Math.min(1, dt * 0.35);
  wv.hour = inGame ? hourOf(progress.clock) : 10;
  wv.dark += (darknessAt(wv.hour) - wv.dark) * Math.min(1, dt * 2);
  wv.dusk = duskAt(wv.hour);

  // pluie
  const n = Math.round(wv.rain * (140 + wv.storm * 120));
  while (drops.length < n) drops.push(newDrop(drops.length < n / 2));
  if (drops.length > n) drops.length = n;
  const slant = 0.15 + wv.wind * 0.45;
  for (let i = 0; i < drops.length; i++) {
    const d = drops[i];
    d.y += d.v * dt;
    d.x += d.v * slant * dt;
    if (d.y >= d.end) {
      if (Math.random() < 0.12) addRipple(d.x, d.end, 0.3);
      drops[i] = newDrop(false);
    }
  }
  rainSoundTimer -= dt;
  if (rainSoundTimer <= 0) { rainSoundTimer = 0.5; Sound.rain(wv.rain); }

  // rafales de vent
  if (!gusts.length) for (let i = 0; i < 14; i++) gusts.push({ x: rand(0, LW), y: rand(10, LH - 40), len: Math.round(rand(8, 22)), v: rand(130, 220) });
  for (const g of gusts) {
    g.x += g.v * dt * (0.3 + wv.wind);
    if (g.x > LW + 30) { g.x = rand(-60, -20); g.y = rand(10, LH - 40); }
  }

  // orage : éclairs et tonnerre
  storm.flash = Math.max(0, storm.flash - dt * 2.5);
  storm.boltT -= dt;
  if (inGame && wv.storm > 0.6) {
    storm.next -= dt;
    if (storm.next <= 0) {
      storm.next = rand(4, 11);
      storm.flash = 1;
      storm.bolt = makeBolt();
      storm.boltT = 0.25;
      const dist = Math.random();
      setTimeout(() => Sound.thunder(dist), 200 + dist * 1500);
    }
  }
}

function update(dt) {
  time += dt;
  invalidateMods();
  if (inGame) updateClock(dt);
  updateWorldVisuals(dt);
  updateWorldHud();

  // caisses (en temps réel) et ouverture progressive des yeux au fond du lac
  potTimer -= dt;
  if (potTimer <= 0) {
    potTimer = 1;
    tickPots();
    checkAchievements();
    if (openPanelName === 'crates') refreshCrateStatus();
  }
  const targetEyes = corruption() * LAKE_EYES.length;
  LAKE_EYES.forEach((e, i) => {
    const target = clamp(targetEyes - i, 0, 1);
    e.open += (target - e.open) * Math.min(1, dt * 0.8);
  });

  for (const c of clouds) {
    c.x += c.v * dt * (1 + wv.wind * 4);
    if (c.x > LW + 10) { c.x = -c.img.width - 10; c.y = Math.round(rand(8, 60)); }
  }
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.r += dt * 11;
    r.a = 1 - r.r / r.max;
    if (r.a <= 0) ripples.splice(i, 1);
  }

  updateCthulhu(dt);

  if (!inGame || !$('overlay').hidden) return;   // pause quand un panneau est ouvert
  game.t += dt;
  progress.stats.playTime += dt;
  saveTimer += dt;
  if (saveTimer > 15) { saveTimer = 0; writeSave(); }

  switch (game.state) {
    case 'casting': {
      const p = Math.min(game.t / CAST_TIME, 1);
      const { from, to } = game.float;
      game.float.x = lerp(from.x, to.x, p);
      game.float.y = lerp(from.y, to.y, p) - Math.sin(p * Math.PI) * 60;
      if (p >= 1) startWaiting();
      break;
    }
    case 'waiting':
      if (game.nibble > 0) game.nibble -= dt;
      if (game.t >= game.nextNibble && game.t < game.biteAt - 0.6) {
        game.nibble = 0.3;
        game.nextNibble = game.t + rand(0.8, 2.5);
        addRipple(game.float.x, game.float.y, 0.5);
        Sound.plop();
      }
      if (game.t >= game.biteAt) {
        setState('bite');
        addRipple(game.float.x, game.float.y, game.fish.abom ? 3 : 1.6);
        say(game.fish.f.unique ? 'Le lac tout entier se met à trembler… CLIQUEZ !'
          : game.fish.abom ? 'Quelque chose a mordu… Cliquez !' : 'Ça mord ! Cliquez !');
        Sound.bell(game.fish.abom || game.fish.f.unique);
      }
      break;
    case 'bite':
      if (Math.random() < dt * 8) addRipple(game.float.x + rand(-3, 3), game.float.y, 0.7);
      if (game.t >= reactionWindow()) {
        progress.stats.missed++;
        setState('missed');
        say(game.fish.abom ? 'La chose est retournée dans les profondeurs…' : "Trop tard… le poisson a lâché l'appât.");
        Sound.miss();
        writeSave();
      }
      break;
    case 'reeling':
      updateReel(dt);
      break;
    case 'rising':
      // le Grand Ancien émerge : le lac bouillonne, tout tremble
      if (Math.random() < dt * 14) addRipple(rand(120, 360), rand(140, 175), rand(1.5, 3.5));
      if (game.t >= CTH_RISE_TIME) startReel(0);
      break;
    case 'phaseBreak':
      if (Math.random() < dt * 8) addRipple(rand(150, 330), rand(140, 175), 2.5);
      if (game.t >= 1.8) startReel(game.nextPhase);
      break;
    case 'missed':
    case 'early': {
      const tip = rodTip();
      const p = Math.min(game.t / 1.2, 1);
      game.float.x += (tip.x - game.float.x) * p * 0.15;
      game.float.y += (tip.y - game.float.y) * p * 0.15;
      if (game.t >= 1.6) {
        setState('idle');
        say('Cliquez pour lancer la ligne');
      }
      break;
    }
  }
}

// ===========================================================================
// Décor (pré-rendu une seule fois)
// ===========================================================================
let skyLayer, landLayer, waterLayer, fgLayer, boatSprite, floatSprite, bangSprite, bangAbomSprite;
let corruptSkyLayer, massLayer;
let duskSkyLayer, nightSkyLayer, overcastSkyLayer, stormSkyLayer, rainbowLayer, fogLayer;
let sunSprite, bigHalo, moonSprite, lanternGlow;
let stars = [];
let crateSprites = {};
let clouds = [];

const FISHERMAN = [
  '......oooooo......',
  '.....ohhhhhHo.....',
  '.....ohhhhhHo.....',
  '.....obbbbbbo.....',
  '..oooohhhhhhoooo..',
  '..ohhhhhhhhhhhhho.',
  '...ooooooooooooo..',
  '.....oaassseso....',
  '.....oasssssso....',
  '.....oassssssSo...',
  '.....oSsssssso....',
  '......oSSSSSo.....',
  '.....orrrrrrro....',
  '....orrrrrrrrrooo.',
  '....orrrRrrrrrrsso',
  '....orrrRrrrooooo.',
  '....orrrrrrro.....',
  '....oRrrrrrRo.....',
  '....oppppppppppo..',
  '....opppppppppPo..',
  '.....ooooooooooo..',
];
const FISHERMAN_PAL = {
  o: '#1e140c', h: '#e2bd55', H: '#b08a2e', b: '#7a3b2a', a: '#6a3e1e',
  s: '#f2c497', S: '#c98f62', e: '#1e140c', r: '#c64a35', R: '#8e2f22', p: '#3e5a9a', P: '#2c3f70',
};
const HAND = { x: 64, y: 20 };      // main du pêcheur dans le sprite de la barque

const LANTERN = { x: 108, y: 7 };    // lanterne de la barque (repère du sprite)

// La veste et le pantalon équipés changent la tenue du pêcheur
function fishermanPalette() {
  const pal = { ...FISHERMAN_PAL };
  const j = equippedItem('jacket');
  const p = equippedItem('pants');
  if (j) { pal.r = j.color; pal.R = shadeHex(j.color, 0.7); }
  if (p) { pal.p = p.color; pal.P = shadeHex(p.color, 0.7); }
  return pal;
}
function refreshBoat() { boatSprite = buildBoat(fishermanPalette()); }

function buildBoat(pal = FISHERMAN_PAL) {
  const cv = makeCanvas(120, 48);
  const c = cv.getContext('2d');
  // lanterne sur son mât, à l'avant
  pxRect(c, LANTERN.x, LANTERN.y + 4, 1, 14, '#6e4422');
  pxRect(c, LANTERN.x - 3, LANTERN.y - 1, 7, 1, '#3a3a40');
  pxRect(c, LANTERN.x - 2, LANTERN.y, 5, 6, '#4a4a52');
  pxRect(c, LANTERN.x - 1, LANTERN.y + 1, 3, 4, '#ffd27a');
  pxRect(c, LANTERN.x, LANTERN.y + 2, 1, 2, '#fff3b8');
  pxRect(c, LANTERN.x - 2, LANTERN.y + 6, 5, 1, '#3a3a40');
  // seau avec une queue de poisson
  pxRect(c, 80, 15, 9, 10, '#8a8f96');
  pxRect(c, 80, 15, 9, 2, '#b8bec6');
  pxRect(c, 83, 11, 3, 4, '#aeb9bd');
  pxRect(c, 82, 10, 5, 2, '#cf5f3a');
  // boîte à pêche
  pxRect(c, 20, 18, 12, 7, '#b0402e');
  pxRect(c, 20, 18, 12, 2, '#d8604a');
  pxRect(c, 24, 15, 4, 3, '#4a4f55');
  // pêcheur
  c.drawImage(sprite(FISHERMAN, pal), 46, 6);
  // coque
  for (let y = 0; y < 15; y++) {
    const half = 54 - Math.max(0, y - 6) * 2;
    let col = Math.floor(y / 4) % 2 ? '#87532c' : '#9a6236';
    if (y === 0) col = '#c88c52';
    if (y === 1) col = '#a86c3a';
    if (y > 1 && y % 4 === 0) col = '#5e3a1e';
    pxRect(c, 60 - half, 24 + y, half * 2, 1, col);
  }
  for (const x of [22, 60, 98]) pxRect(c, x, 26, 1, 10, '#6e4422');     // membrures
  pixelize(cv, '#1e140c');
  return cv;
}

// Un nuage blanc et sa version grise (même forme), pour le temps couvert
function buildCloud(w, h) {
  const blobs = [];
  for (let x = 6; x < w - 6; x += 6) blobs.push([x, h - 6 - Math.round(Math.sin((x / w) * Math.PI) * (h - 12) * rand(0.6, 1)), Math.round(rand(5, 7))]);
  const paint = (top, under) => {
    const cv = makeCanvas(w, h);
    const c = cv.getContext('2d');
    for (const [x, y, r] of blobs) pxDisk(c, x, y + 2, r, under);
    for (const [x, y, r] of blobs) pxDisk(c, x, y, r, top);
    pxRect(c, 4, h - 6, w - 8, 3, under);
    return cv;
  };
  return { img: paint('#ffffff', '#d3e4f5'), grey: paint('#8e98a4', '#6a7480') };
}

// Halo tramé (anneau d'un pixel sur deux) autour d'un astre
function haloSprite(r0, r1, col) {
  const s = r1 * 2 + 1;
  const cv = makeCanvas(s, s);
  const c = cv.getContext('2d');
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - r1, y - r1);
      if (d > r0 && d < r1 && (x + y) % 2 === 0) pxRect(c, x, y, 1, 1, col);
    }
  }
  return cv;
}

function buildScene() {
  // --- ciel
  skyLayer = makeCanvas(LW, HORIZON);
  let c = skyLayer.getContext('2d');
  ditherGradient(c, 0, 0, LW, HORIZON, ['#3d6ed0', '#5a8fe4', '#7fb2f0', '#a8d2f8', '#d2ecfc']);

  // --- ciels de l'aube/crépuscule, de la nuit, du temps couvert et de l'orage
  duskSkyLayer = makeCanvas(LW, HORIZON);
  ditherGradient(duskSkyLayer.getContext('2d'), 0, 0, LW, HORIZON, ['#3a3a8a', '#7a4a9a', '#d06a7a', '#f49a5a', '#ffd08a']);
  nightSkyLayer = makeCanvas(LW, HORIZON);
  ditherGradient(nightSkyLayer.getContext('2d'), 0, 0, LW, HORIZON, ['#04071a', '#0a1030', '#121a40', '#1a2450', '#24305e']);
  overcastSkyLayer = makeCanvas(LW, HORIZON);
  ditherGradient(overcastSkyLayer.getContext('2d'), 0, 0, LW, HORIZON, ['#5e6874', '#707a86', '#848e98', '#98a2aa', '#aab2b8']);
  stormSkyLayer = makeCanvas(LW, HORIZON);
  ditherGradient(stormSkyLayer.getContext('2d'), 0, 0, LW, HORIZON, ['#181c24', '#22282f', '#2e343c', '#3a4048', '#464c54']);
  stars = Array.from({ length: 80 }, (_, i) => ({ x: Math.round(rand(2, LW - 2)), y: Math.round(rand(2, 84) ** 1.05), big: i % 9 === 0, ph: rand(0, 6) }));

  // --- astres
  sunSprite = makeCanvas(53, 53);
  c = sunSprite.getContext('2d');
  c.drawImage(haloSprite(18, 26, '#e6f3fd'), 0, 0);
  pxDisk(c, 26, 26, 17, '#ffe58a');
  pxDisk(c, 26, 26, 14, '#fff3b8');
  pxDisk(c, 24, 24, 8, '#ffffff');
  bigHalo = haloSprite(26, 36, '#fff6d0');
  moonSprite = makeCanvas(33, 33);
  c = moonSprite.getContext('2d');
  c.drawImage(haloSprite(11, 16, '#4a5a8a'), 0, 0);
  pxDisk(c, 16, 16, 9, '#e8e4c8');
  pxDisk(c, 15, 15, 7, '#f6f2dc');
  for (const [x, y, r] of [[13, 13, 2], [19, 18, 1], [14, 20, 1], [20, 12, 1]]) pxDisk(c, x, y, r, '#d0cbac');
  lanternGlow = haloSprite(0, 20, '#ffd27a');

  // --- arc-en-ciel
  rainbowLayer = makeCanvas(LW, HORIZON);
  c = rainbowLayer.getContext('2d');
  ['#e04a3a', '#f0a030', '#f5e04a', '#5ad04a', '#3a8ce0', '#9a48c8'].forEach((col, i) => {
    const r = 118 - i * 3;
    for (let a = 0; a <= 900; a++) {
      const t = Math.PI + (a / 900) * Math.PI;
      pxRect(c, 170 + Math.cos(t) * r, HORIZON + 26 + Math.sin(t) * r, 1, 3, col);
    }
  });

  // --- brouillard (bandes tramées, raccord horizontal parfait)
  fogLayer = makeCanvas(LW, 140);
  c = fogLayer.getContext('2d');
  c.fillStyle = '#dfe6ea';
  for (let y = 0; y < 140; y++) {
    const dens = clamp(1 - Math.abs(y - 55) / 75, 0, 1);
    for (let x = 0; x < LW; x++) {
      const u = (x / LW) * Math.PI * 2;
      const n = 0.55 + 0.25 * Math.sin(u * 3 + y * 0.09) + 0.2 * Math.sin(u * 7 + y * 0.21 + 1.3);
      if (dens * n * 1.25 > (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16) c.fillRect(x, y, 1, 1);
    }
  }

  // --- montagnes et collines
  landLayer = makeCanvas(LW, HORIZON);
  c = landLayer.getContext('2d');
  for (let x = 0; x < LW; x++) {
    const m = Math.round((HORIZON - 36 - 16 * Math.sin(x * 0.012 + 0.5) - 7 * Math.sin(x * 0.037 + 2) - 3 * Math.sin(x * 0.11)) / 2) * 2;
    pxRect(c, x, m, 1, HORIZON - m, '#8aa6d6');
    pxRect(c, x, m, 1, 2, '#b2c8ec');
    if (m < 66) pxRect(c, x, m, 1, Math.min(4, 66 - m), '#f0f6ff');   // neige
  }
  for (let x = 0; x < LW; x++) {
    const hgt = Math.round(HORIZON - 16 - 7 * Math.sin(x * 0.02 + 1) - 3 * Math.sin(x * 0.07));
    pxRect(c, x, hgt, 1, HORIZON - hgt, '#3f8a4a');
    pxRect(c, x, hgt, 1, 1, '#62ad5e');
  }
  for (let x = 3, i = 0; x < LW; x += 6 + (i * 7) % 5, i++) {      // forêt lointaine
    const hgt = Math.round(HORIZON - 16 - 7 * Math.sin(x * 0.02 + 1) - 3 * Math.sin(x * 0.07));
    const r = 3 + (i % 3);
    pxDisk(c, x, hgt - r + 2, r, '#2f6e3c');
    pxDisk(c, x - 1, hgt - r + 1, r - 2, '#438a4a');
  }
  pxRect(c, 0, HORIZON - 2, LW, 1, '#2f6e3c');
  pxRect(c, 0, HORIZON - 1, LW, 1, '#d8c48a');

  // --- eau
  waterLayer = makeCanvas(LW, LH - HORIZON);
  c = waterLayer.getContext('2d');
  ditherGradient(c, 0, 0, LW, LH - HORIZON, ['#86cff2', '#52a8de', '#3384c4', '#2466a6', '#1b4c86']);
  pxRect(c, 0, 0, LW, 1, '#c4ecff');

  // --- rives au premier plan (blocs de terre et d'herbe)
  fgLayer = makeCanvas(LW, LH);
  c = fgLayer.getContext('2d');
  const T = 8;
  const leftCols = [11, 11, 10, 10, 9, 8, 6, 4, 2];
  const rightCols = [10, 10, 9, 9, 8, 6, 5, 3, 1];
  const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
  function tile(tx, ty, kind) {
    const x = tx * T, y = LH - (ty + 1) * T;
    if (kind === 'stone') {
      pxRect(c, x, y, T, T, '#8a8a90');
      for (let k = 0; k < 4; k++) { const hsh = hash(tx * 9 + k, ty); pxRect(c, x + (hsh % 7), y + ((hsh >> 4) % 7), 2, 1, '#6c6c74'); }
      return;
    }
    pxRect(c, x, y, T, T, '#8b5a35');
    for (let k = 0; k < 4; k++) {
      const hsh = hash(tx * 7 + k, ty * 3);
      pxRect(c, x + (hsh % 7), y + ((hsh >> 3) % 7), 1, 1, k % 2 ? '#6e4427' : '#a8734a');
    }
    if (kind === 'grass') {
      pxRect(c, x, y, T, 3, '#4caf3c');
      pxRect(c, x, y, T, 1, '#7bd65a');
      const hsh = hash(tx, ty + 99);
      pxRect(c, x + (hsh % 6), y + 3, 1, 1, '#4caf3c');
      pxRect(c, x + ((hsh >> 4) % 6) + 1, y + 3, 2, 1, '#4caf3c');
    }
  }
  function bank(cols, mirror) {
    cols.forEach((hgt, i) => {
      const tx = mirror ? LW / T - 1 - i : i;
      for (let ty = 0; ty < hgt; ty++) {
        const top = ty === hgt - 1;
        const kind = top ? 'grass' : ty < hgt - 4 && hash(tx, ty) % 4 === 0 ? 'stone' : 'dirt';
        tile(tx, ty, kind);
      }
    });
  }
  bank(leftCols, false);
  bank(rightCols, true);

  // grand arbre sur la rive gauche
  const groundL = LH - leftCols[1] * T;
  pxRect(c, 9, groundL - 62, 8, 62, '#8a5a32');
  pxRect(c, 10, groundL - 62, 2, 62, '#a87444');
  pxRect(c, 14, groundL - 62, 1, 62, '#6b4222');
  pxRect(c, 6, groundL - 3, 14, 3, '#8a5a32');
  pxRect(c, 17, groundL - 34, 9, 3, '#8a5a32');                    // branche
  pxDisk(c, 27, groundL - 36, 5, '#3f9a3a');
  for (const [dx, dy, r, col] of [[0, -74, 17, '#2f7a2e'], [-12, -64, 12, '#2f7a2e'], [12, -62, 12, '#2f7a2e'], [0, -78, 15, '#3f9a3a'], [-11, -67, 9, '#3f9a3a'], [10, -66, 9, '#3f9a3a'], [-4, -84, 8, '#5cbc4a'], [6, -72, 5, '#5cbc4a']]) {
    pxDisk(c, 13 + dx, groundL + dy, r, col);
  }
  // petit arbre et buisson sur la rive droite
  const groundR = LH - rightCols[2] * T;
  pxRect(c, 460, groundR - 30, 6, 30, '#8a5a32');
  pxRect(c, 461, groundR - 30, 2, 30, '#a87444');
  for (const [dx, dy, r, col] of [[0, -40, 13, '#2f7a2e'], [0, -43, 11, '#3f9a3a'], [-4, -48, 5, '#5cbc4a']]) pxDisk(c, 463 + dx, groundR + dy, r, col);
  const groundR3 = LH - rightCols[3] * T;
  pxDisk(c, 450, groundR3 - 4, 6, '#2f7a2e');
  pxDisk(c, 449, groundR3 - 6, 4, '#3f9a3a');
  // herbes hautes et fleurs
  for (const [x, col] of [[30, '#4caf3c'], [36, '#ff6b8a'], [44, '#4caf3c'], [428, '#ffd84a'], [436, '#4caf3c'], [442, '#ff6b8a']]) {
    const tx = x < LW / 2 ? Math.floor(x / T) : LW / T - 1 - Math.floor((LW - 1 - x) / T);
    const hgt = x < LW / 2 ? leftCols[tx] : rightCols[LW / T - 1 - tx];
    const gy = LH - hgt * T;
    pxRect(c, x, gy - 4, 1, 4, '#4caf3c');
    pxRect(c, x - 1, gy - 5, 3, 2, col);
  }
  pixelize(fgLayer, '#1e140c');

  // --- ciel corrompu (violet → vert)
  corruptSkyLayer = makeCanvas(LW, HORIZON);
  ditherGradient(corruptSkyLayer.getContext('2d'), 0, 0, LW, HORIZON, ['#24083a', '#4a1a62', '#3a4a6a', '#2f7a52', '#6ac080']);

  // --- la chose au fond du lac : une silhouette gigantesque (ailes, tête, tentacules)
  massLayer = makeCanvas(LW, LH - HORIZON);
  c = massLayer.getContext('2d');
  const MC = '#050c18';
  const mx = 240, my = 70;          // centre de la tête (repère de la couche d'eau)
  c.fillStyle = MC;
  for (const sd of [-1, 1]) {       // ailes membraneuses
    c.beginPath();
    c.moveTo(mx + sd * 50, my - 4);
    c.lineTo(mx + sd * 140, my - 50);
    c.lineTo(mx + sd * 160, my - 28);
    c.lineTo(mx + sd * 210, my - 46);
    c.lineTo(mx + sd * 205, my - 14);
    c.lineTo(mx + sd * 238, my - 6);
    c.lineTo(mx + sd * 200, my + 16);
    c.lineTo(mx + sd * 110, my + 24);
    c.closePath();
    c.fill();
  }
  pxEllipse(c, mx, my, 92, 38, MC);                    // tête
  pxEllipse(c, mx, my - 24, 66, 22, MC);               // crâne
  pxEllipse(c, mx, my + 30, 110, 18, MC);              // épaules
  for (let k = 0; k < 12; k++) {                       // tentacules du visage, qui pendent
    const x0 = mx - 66 + k * 12;
    for (let i = 0; i < 22; i++) {
      const x = x0 + Math.sin(i * 0.4 + k) * 4;
      const y = my + 24 + i * 3;
      pxDisk(c, x, y, Math.max(1, Math.round(6 - i * 0.22)), MC);
    }
  }
  for (const sd of [-1, 1]) {                          // bras-tentacules qui rampent sur le fond
    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < 40; i++) {
        const x = mx + sd * (70 + i * 4.2);
        const y = my + 26 + k * 9 + Math.sin(i * 0.3 + k * 1.7) * 6 + i * 0.5;
        pxDisk(c, x, y, Math.max(1, Math.round(6 - i * 0.13)), MC);
      }
    }
  }
  pixelize(massLayer, null);                           // alpha net
  // bords tramés pour l'effet "sous l'eau"
  const img = c.getImageData(0, 0, LW, LH - HORIZON);
  for (let y = 0; y < LH - HORIZON; y++) {
    for (let x = 0; x < LW; x++) {
      const i = (y * LW + x) * 4;
      if (img.data[i + 3] && (x + y) % 2 === 0) {
        const edge = [-3, 3].some((d) => !img.data[((y * LW + clamp(x + d, 0, LW - 1)) * 4) + 3]);
        if (edge) img.data[i + 3] = 0;
      }
    }
  }
  c.putImageData(img, 0, 0);

  // --- sprites
  crateSprites = Object.fromEntries(POTS.map((p) => [p.id, buildCrateSprite(p)]));
  refreshBoat();
  floatSprite = sprite(['..k..', '..k..', '.oro.', 'orrro', 'owwwo', 'owwwo', '.oko.', '..k..'],
    { k: '#1e140c', o: '#1e140c', r: '#e03a2a', w: '#f4f0e6' });
  const bang = ['.oo.', 'oyyo', 'oyyo', 'oyyo', 'oyyo', '.oo.', 'oyyo', '.oo.'];
  bangSprite = sprite(bang, { o: '#1e140c', y: '#ffe04a' });
  bangAbomSprite = sprite(bang, { o: '#1e140c', y: '#d27aff' });

  clouds = [
    { ...buildCloud(58, 22), x: 30, y: 18, v: 3 },
    { ...buildCloud(40, 18), x: 190, y: 44, v: 4.5 },
    { ...buildCloud(70, 26), x: 300, y: 12, v: 2.5 },
    { ...buildCloud(34, 16), x: 420, y: 56, v: 5 },
    { ...buildCloud(50, 20), x: 110, y: 30, v: 3.5 },
  ];
}

// ===========================================================================
// Rendu de la scène
// ===========================================================================
function drawReflection(x, alpha, near, far, width) {
  if (alpha <= 0.02) return;
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 14; i++) {
    const y = HORIZON + 2 + i * 3;
    const w = Math.max(2, width - i + Math.round(Math.sin(time * 2 + i) * 3));
    pxRect(ctx, x - w / 2 + Math.round(Math.sin(time * 1.3 + i * 1.7) * 2), y, w, 1, i < 6 ? near : far);
  }
  ctx.globalAlpha = 1;
}

function drawWaterFx() {
  const sun = sunPos(wv.hour);
  const moon = moonPos(wv.hour);
  // reflets du soleil et de la lune
  if (sun) drawReflection(sun.x, (1 - wv.dark) * (1 - wv.overcast * 0.9) * (sun.y < HORIZON - 6 ? 1 : 0.4), wv.dusk > 0.4 ? '#ffd0a0' : '#fff6c8', '#d8eefa', 14 + Math.round(wv.sun * 6));
  if (moon) drawReflection(moon.x, wv.dark * (1 - wv.overcast * 0.85) * 0.8, '#f0ecd0', '#8aa0c8', 9);
  // scintillements
  ctx.globalAlpha = clamp((1 - wv.dark * 0.8) * (1 - wv.overcast * 0.6) * (1 + wv.sun * 0.4), 0, 1);
  const count = 46 + Math.round(wv.sun * 30);
  const speed = 1 + wv.wind * 3;
  for (let i = 0; i < count; i++) {
    const y = HORIZON + 3 + ((i * 29) % (LH - HORIZON - 6));
    const x = Math.round(((i * 97 + time * speed * (3 + (i % 4) * 2)) % (LW + 20)) - 10);
    const len = 2 + (i % 3) * 2 + Math.floor((y - HORIZON) / 45);
    pxRect(ctx, x, y, len, 1, i >= 46 ? '#fffbe0' : y < 160 ? '#c0e8fc' : '#79c0ec');
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Ciel : heure du jour et météo
// ---------------------------------------------------------------------------
function drawSky() {
  const dark = wv.dark;
  ctx.drawImage(skyLayer, 0, 0);
  const sun = sunPos(wv.hour);
  if (sun && wv.overcast < 0.95) {
    ctx.globalAlpha = clamp(1 - wv.overcast * 1.1, 0, 1);     // le soleil disparaît derrière les nuages
    ctx.drawImage(sunSprite, sun.x - 26, sun.y - 26);
    ctx.globalAlpha = 1;
    if (wv.sun > 0.02) {
      ctx.globalAlpha = wv.sun;
      ctx.drawImage(bigHalo, sun.x - 36, sun.y - 36);
      ctx.globalAlpha = 1;
    }
    if (wv.dusk > 0) {                                   // soleil orangé à l'horizon
      ctx.globalAlpha = wv.dusk * 0.8;
      pxDisk(ctx, sun.x, sun.y, 15, '#ffa860');
      pxDisk(ctx, sun.x - 2, sun.y - 2, 8, '#ffd8a0');
      ctx.globalAlpha = 1;
    }
  }
  if (wv.dusk > 0.01) { ctx.globalAlpha = wv.dusk * 0.7; ctx.drawImage(duskSkyLayer, 0, 0); }
  if (wv.overcast > 0.01) { ctx.globalAlpha = wv.overcast * 0.88; ctx.drawImage(overcastSkyLayer, 0, 0); }
  if (wv.storm > 0.01) { ctx.globalAlpha = wv.storm * 0.8; ctx.drawImage(stormSkyLayer, 0, 0); }
  for (const cl of clouds) {
    ctx.globalAlpha = (1 - wv.sun * 0.75) * (1 - wv.overcast * 0.4);
    ctx.drawImage(cl.img, Math.round(cl.x), cl.y);
    if (wv.overcast > 0.01) {
      ctx.globalAlpha = Math.min(1, wv.overcast * 1.2);
      ctx.drawImage(cl.grey, Math.round(cl.x), cl.y);
    }
  }
  if (wv.rainbow > 0.01) { ctx.globalAlpha = wv.rainbow * 0.5 * (1 - dark); ctx.drawImage(rainbowLayer, 0, 0); }
  if (dark > 0.01) {
    ctx.globalAlpha = dark * 0.92;
    ctx.drawImage(nightSkyLayer, 0, 0);
    // étoiles qui scintillent (cachées par les nuages)
    const sa = clamp((dark - 0.25) / 0.75, 0, 1) * (1 - wv.overcast * 0.9);
    if (sa > 0.02) {
      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(time * 1.7 + s.ph * 3);
        ctx.globalAlpha = sa * tw;
        pxRect(ctx, s.x, s.y, 1, 1, s.big ? '#ffffff' : '#c8d4f0');
        if (s.big && tw > 0.8) { pxRect(ctx, s.x - 1, s.y, 3, 1, '#ffffff'); pxRect(ctx, s.x, s.y - 1, 1, 3, '#ffffff'); }
      }
    }
  }
  const moon = moonPos(wv.hour);
  if (moon) {
    ctx.globalAlpha = clamp(dark * 1.6, 0, 1) * (1 - wv.overcast * 0.75);
    ctx.drawImage(moonSprite, moon.x - 16, moon.y - 16);
  }
  ctx.globalAlpha = 1;
  // éclair
  if (storm.boltT > 0 && storm.bolt) {
    for (const path of storm.bolt) {
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        ctx.globalAlpha = 0.5;
        pxLine(ctx, a.x + 1, a.y, b.x + 1, b.y, '#a8a0ff');
        pxLine(ctx, a.x - 1, a.y, b.x - 1, b.y, '#a8a0ff');
        ctx.globalAlpha = 1;
        pxLine(ctx, a.x, a.y, b.x, b.y, '#f8f6ff');
      }
    }
  }
}

function drawRain() {
  if (!drops.length) return;
  const slant = 0.15 + wv.wind * 0.45;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = wv.dark > 0.5 ? '#8aa0c0' : '#c8dcf2';
  for (const d of drops) {
    for (let k = 0; k < d.len; k++) ctx.fillRect(Math.round(d.x - k * slant), Math.round(d.y - k), 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawGusts() {
  if (wv.wind < 0.3) return;
  ctx.globalAlpha = (wv.wind - 0.3) * 0.6;
  for (const g of gusts) {
    pxRect(ctx, g.x, g.y, g.len, 1, '#f0f8ff');
    pxRect(ctx, g.x + g.len, g.y - 1, 2, 1, '#f0f8ff');
  }
  ctx.globalAlpha = 1;
}

function drawFog() {
  if (wv.fog < 0.01) return;
  const off = Math.floor((time * 5) % LW);
  ctx.globalAlpha = wv.fog * 0.5;
  ctx.drawImage(fogLayer, -off, HORIZON - 55);
  ctx.drawImage(fogLayer, LW - off, HORIZON - 55);
  ctx.globalAlpha = wv.fog * 0.22;
  const off2 = Math.floor((time * 9) % LW);
  ctx.drawImage(fogLayer, off2, HORIZON + 40);
  ctx.drawImage(fogLayer, off2 - LW, HORIZON + 40);
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(214, 222, 230, ${wv.fog * 0.3})`;
  ctx.fillRect(0, 0, LW, LH);
}

// Assombrit un calque (même forme) selon la nuit et le temps couvert
function shadeLayer(cv, x, y, a) {
  if (a <= 0.01) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(shadeOf(cv), x, y);
  ctx.globalAlpha = 1;
}

function drawRipples() {
  ctx.fillStyle = '#e2f6ff';
  for (const r of ripples) {
    const k = perspective(r.y);
    ctx.globalAlpha = Math.min(1, r.a * 1.4);
    const n = Math.max(10, Math.round(r.r * 5));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ctx.fillRect(Math.round(r.x + Math.cos(a) * r.r * k * 1.6), Math.round(r.y + Math.sin(a) * r.r * k * 0.45), 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

const lineVisible = () => inGame && game.state !== 'idle' && game.state !== 'caught';

function floatSink() {
  switch (game.state) {
    case 'waiting': return Math.round(Math.sin(time * 2.2) * 0.6 + (game.nibble > 0 ? Math.sin(((0.3 - game.nibble) / 0.3) * Math.PI) * 2.5 : 0));
    case 'bite': return 4 + Math.round(Math.sin(time * 25));
    case 'reeling': return 2 + Math.round(Math.sin(time * 18) * 1.5);
    default: return 0;
  }
}

function drawFloatAndLine() {
  if (!lineVisible()) return;
  const x = Math.round(game.float.x);
  const y = Math.round(game.float.y);
  const inWater = game.state !== 'casting';
  const sink = inWater ? floatSink() : 0;

  if (game.state === 'bite' && game.fish.abom) {
    ctx.globalAlpha = 0.45;
    pxEllipse(ctx, x, y + 3, 22, 5, '#1e0628');
    ctx.globalAlpha = 1;
  }

  // ligne
  const tip = rodTip();
  const top = { x, y: inWater ? y - 5 + sink : y - 5 };
  const sag = game.state === 'bite' || game.state === 'reeling' ? 0 : 14;
  ctx.globalAlpha = 0.85;
  pxCurve(ctx, tip, { x: (tip.x + top.x) / 2, y: Math.max(tip.y, top.y) + sag }, top, '#f0f4f8');
  ctx.globalAlpha = 1;

  // flotteur (coupé à la surface de l'eau)
  const sx = x - 2;
  const sy = y - 5 + sink;
  if (inWater) {
    const visible = Math.max(0, Math.min(floatSprite.height, y - sy));
    if (visible > 0) ctx.drawImage(floatSprite, 0, 0, floatSprite.width, visible, sx, sy, floatSprite.width, visible);
    pxRect(ctx, x - 3, y, 7, 1, '#e2f6ff');
  } else {
    ctx.drawImage(floatSprite, sx, sy);
  }

  if (game.state === 'bite') {
    const b = game.fish.abom ? bangAbomSprite : bangSprite;
    ctx.drawImage(b, x - 2, y - 20 - Math.round(Math.abs(Math.sin(time * 12)) * 3));
  }
}

function drawBoat() {
  const bob = boatBob();
  ctx.globalAlpha = 0.35;
  pxEllipse(ctx, BOAT_X, BOAT_Y + 16, 58, 3, '#0e2a50');
  ctx.globalAlpha = 1;
  const ox = BOAT_X - 60;
  const oy = BOAT_Y - 24 + bob;
  ctx.drawImage(boatSprite, ox, oy);
  shadeLayer(boatSprite, ox, oy, wv.dark * 0.35 + wv.storm * 0.15);
  // la lanterne s'allume le soir
  if (wv.dark > 0.05) {
    const lx = ox + LANTERN.x, ly = oy + LANTERN.y + 3;
    const flick = 0.85 + Math.sin(time * 9) * 0.08 + Math.sin(time * 23) * 0.05;
    ctx.globalAlpha = wv.dark * 0.45 * flick;
    ctx.drawImage(lanternGlow, lx - 20, ly - 20);
    ctx.globalAlpha = wv.dark;
    pxRect(ctx, lx - 1, ly - 2, 3, 4, '#ffe08a');
    pxRect(ctx, lx, ly - 1, 1, 2, '#ffffff');
    ctx.globalAlpha = 1;
  }
  const hand = { x: ox + HAND.x, y: oy + HAND.y };
  const tip = rodTip();
  const ctrl = { x: (hand.x + tip.x) / 2 + 2, y: (hand.y + tip.y) / 2 + 6 };
  pxCurve(ctx, { x: hand.x - 6, y: hand.y + 5 }, ctrl, tip, '#1e140c');
  pxCurve(ctx, { x: hand.x - 6, y: hand.y + 4 }, { x: ctrl.x, y: ctrl.y - 1 }, { x: tip.x, y: tip.y - 1 }, rod().color);
  pxRect(ctx, hand.x - 7, hand.y + 2, 3, 3, '#c9a26a');     // poignée
  pxRect(ctx, hand.x - 2, hand.y + 3, 2, 2, '#9aa3ad');     // moulinet
}

// Icônes de la jauge : un poisson générique (toujours le même) et un coffre
let gaugeFish = null, gaugeChest = null;
function outlined(rows, pal) {
  const src = sprite(rows, pal);
  const cv = makeCanvas(src.width + 2, src.height + 2);
  cv.getContext('2d').drawImage(src, 1, 1);
  pixelize(cv, '#1a120c');
  return cv;
}
function buildGaugeIcons() {
  gaugeFish = outlined([
    'f...bbb...',
    'ff.bbbbbb.',
    'fffbbbbbeb',
    'ff.bllllb.',
    'f...bbb...',
  ], { f: '#3f78b0', b: '#78b6e2', l: '#e2f4ff', e: '#111111' });
  gaugeChest = outlined([
    '.bbbbb.',
    'bBBBBBb',
    'yyyyyyy',
    'bbbybbb',
    'bBBBBBb',
    'bbbbbbb',
  ], { b: '#b07a40', B: '#7a4c24', y: '#f5d04a' });
}

// Rectangle aux coins arrondis (coins d'1 pixel retirés)
function pxRound(x, y, w, h, col) {
  pxRect(ctx, x + 1, y, w - 2, 1, col);
  pxRect(ctx, x, y + 1, w, h - 2, col);
  pxRect(ctx, x + 1, y + h - 1, w - 2, 1, col);
}

// Jauge de remontée, fine, à droite de la barque
const GAUGE = { x: 386, y: 52, tw: 12, th: 140, pw: 3 };
function drawReelGauge() {
  if (!inGame || game.state !== 'reeling') return;
  const m = game.mg;
  const { x: tx, y: ty, tw, th, pw } = GAUGE;
  const px = tx + tw + 3;                       // jauge de progression
  const fx = tx - 3, fy = ty - 3;
  const fw = px + pw + 3 - fx, fh = th + 6;

  // cadre en bois, coins arrondis
  pxRound(fx - 1, fy - 1, fw + 2, fh + 2, '#1e140c');
  pxRound(fx, fy, fw, fh, '#9a6a3c');
  pxRect(ctx, fx + 1, fy, fw - 2, 1, '#c8935a');
  pxRect(ctx, fx + 1, fy + fh - 1, fw - 2, 1, '#6b4222');
  // petit flotteur décoratif en haut
  ctx.drawImage(floatSprite, fx + Math.floor(fw / 2) - 2, fy - 9);

  // piste (eau)
  pxRect(ctx, tx - 1, ty - 1, tw + 2, th + 2, '#1e140c');
  ditherTrack(tx, ty, tw, th);

  // barre verte, arrondie et légèrement translucide
  const barH = Math.round(m.barSize * th);
  const barY = ty + th - barH - Math.round(m.bar * th);
  ctx.globalAlpha = m.inZone ? 0.95 : 0.7;
  pxRound(tx, barY, tw, barH, '#5cc84c');
  pxRect(ctx, tx + 1, barY, tw - 2, 1, '#c8f7a8');
  pxRect(ctx, tx, barY + 1, 1, barH - 2, '#9ae882');
  pxRect(ctx, tx + 1, barY + barH - 1, tw - 2, 1, '#2f7a2e');
  ctx.globalAlpha = 1;

  // coffre et sa petite jauge
  const ch = m.chest;
  if (ch && ch.visible && !ch.got) {
    const cy = ty + th - Math.round(ch.pos * th) - Math.floor(gaugeChest.height / 2);
    const cx = tx + Math.floor((tw - gaugeChest.width) / 2);
    ctx.drawImage(gaugeChest, cx, cy);
    pxRect(ctx, cx, cy + gaugeChest.height, gaugeChest.width, 2, '#1e140c');
    pxRect(ctx, cx, cy + gaugeChest.height, Math.round(ch.progress * gaugeChest.width), 2, '#ffd84a');
  }

  // poisson générique
  const fishY = ty + th - Math.round(m.fish * th) - Math.floor(gaugeFish.height / 2);
  ctx.drawImage(gaugeFish, tx + Math.floor((tw - gaugeFish.width) / 2), clamp(fishY, ty - 1, ty + th - gaugeFish.height + 1));

  // combat contre le Grand Ancien : 3 pastilles de phase à gauche de la jauge
  if (m.phase >= 0) {
    for (let i = 0; i < CTH_PHASES.length; i++) {
      const col = i < m.phase ? '#5ad04a' : i === m.phase ? (Math.floor(time * 4) % 2 ? '#ffd84a' : '#ffb020') : '#3a2a1c';
      pxRound(fx - 11, fy + 4 + i * 10, 7, 7, '#1e140c');
      pxRound(fx - 10, fy + 5 + i * 10, 5, 5, col);
    }
  }

  // progression
  pxRect(ctx, px - 1, ty - 1, pw + 2, th + 2, '#1e140c');
  pxRect(ctx, px, ty, pw, th, '#3a2a1c');
  const p = clamp(m.progress, 0, 1);
  const ph = Math.round(p * th);
  pxRect(ctx, px, ty + th - ph, pw, ph, p < 0.33 ? '#e04a3a' : p < 0.66 ? '#f0c040' : '#5ad04a');
  pxRect(ctx, px, ty + th - ph, 1, ph, 'rgba(255,255,255,0.35)');

  // moulinet (tourne quand on maintient)
  const rx = fx + Math.floor(fw / 2), ry = fy + fh + 5;
  pxDisk(ctx, rx, ry, 5, '#1e140c');
  pxDisk(ctx, rx, ry, 4, '#aab3bd');
  pxDisk(ctx, rx, ry, 2, '#6d7680');
  const a = time * (holding ? 14 : 3);
  pxRect(ctx, rx + Math.round(Math.cos(a) * 3), ry + Math.round(Math.sin(a) * 3), 2, 2, '#d8b060');

  // coffre sécurisé : petite icône à côté du moulinet
  if (ch?.got) {
    if (ch.flash > 0 && Math.floor(ch.flash * 10) % 2) ctx.globalAlpha = 0.4;
    ctx.drawImage(gaugeChest, rx + 8, ry - 4);
    ctx.globalAlpha = 1;
  }
}

// Piste de la jauge : dégradé d'eau sombre pré-calculé
let trackCanvas = null;
function ditherTrack(x, y, w, h) {
  if (!trackCanvas) {
    trackCanvas = makeCanvas(w, h);
    ditherGradient(trackCanvas.getContext('2d'), 0, 0, w, h, ['#3384c4', '#2466a6', '#1b4c86', '#123a6a']);
  }
  ctx.drawImage(trackCanvas, x, y);
}

// ---------------------------------------------------------------------------
// Ambiance : la chose au fond du lac, ses yeux, et le ciel qui se corrompt
// ---------------------------------------------------------------------------
// Les yeux s'ouvrent dans l'ordre : petits yeux sur les ailes et les tentacules,
// puis l'œil du front, et enfin les deux grands yeux.
const LAKE_EYES = [
  [120, 216, 4], [360, 216, 4], [140, 152, 5], [340, 152, 5], [90, 240, 3], [390, 240, 3],
  [95, 166, 4], [385, 166, 4], [160, 250, 3], [320, 252, 3], [175, 141, 3], [305, 141, 3],
  [240, 158, 6], [208, 177, 11], [272, 177, 11],
].map(([x, y, r], i) => ({ x, y, r, open: 0, seed: i * 1.7 }));

function drawLakeEye(e) {
  const o = e.open;
  if (o < 0.05) return;
  const blink = Math.sin(time * 0.5 + e.seed * 3) > 0.985 ? 0.1 : 1;
  const rx = e.r;
  const ry = Math.max(1, Math.round(e.r * 0.5 * o * blink));
  const x = e.x;
  const y = e.y + Math.round(Math.sin(time * 0.4 + e.seed));
  // il regarde le flotteur (ou la barque)
  const tgt = lineVisible() ? game.float : { x: BOAT_X, y: BOAT_Y };
  const ir = Math.max(1, Math.round(rx * 0.45));
  const look = Math.round(clamp((tgt.x - x) / 60, -1, 1) * Math.max(0, rx - ir - 1));
  ctx.globalAlpha = Math.min(1, o * 1.3);
  // halo tramé qui pulse
  const gr = rx + 4, gry = ry + 3, phase = Math.floor(time * 3);
  ctx.fillStyle = rx >= 8 ? '#b048e0' : '#8a3ab8';
  for (let dy = -gry; dy <= gry; dy++) {
    for (let dx = -gr; dx <= gr; dx++) {
      const d = (dx * dx) / (gr * gr) + (dy * dy) / (gry * gry);
      if (d <= 1 && d > 0.5 && (dx + dy + phase) % 2 === 0) ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  }
  pxEllipse(ctx, x, y, rx + 1, ry + 1, '#12040e');               // paupières
  pxEllipse(ctx, x, y, rx, ry, '#e8c03a');                       // blanc (jaune)
  if (ry >= 2) pxRect(ctx, x - Math.round(rx * 0.6), y - ry, Math.round(rx * 1.2), 1, '#fff27a');
  if (rx >= 8 && ry >= 3) {                                      // veines
    pxRect(ctx, x - rx + 2, y, 3, 1, '#c0302a');
    pxRect(ctx, x - rx + 4, y + 1, 2, 1, '#c0302a');
    pxRect(ctx, x + rx - 5, y - 1, 3, 1, '#c0302a');
  }
  const iry = Math.min(ry, ir);
  pxEllipse(ctx, x + look, y, ir, iry, '#d8402a');               // iris
  if (ir >= 3 && iry >= 2) pxEllipse(ctx, x + look, y, ir - 1, iry - 1, '#ff7a3a');
  pxRect(ctx, x + look - (rx >= 8 ? 1 : 0), y - iry, rx >= 8 ? 2 : 1, iry * 2 + 1, '#0b0508');   // pupille fendue
  ctx.globalAlpha = 1;
}

function drawCorruptionSky(c) {
  if (c <= 0) return;
  ctx.globalAlpha = c * 0.85 * (1 - wv.dark * 0.6);
  ctx.drawImage(corruptSkyLayer, 0, 0);
  const astre = sunPos(wv.hour) || moonPos(wv.hour);
  if (astre) {
    ctx.globalAlpha = c * 0.8;                     // astre malade
    pxDisk(ctx, astre.x, astre.y, 15, '#b8f0a0');
    pxDisk(ctx, astre.x, astre.y, 6, '#4a1a5a');
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Caisses à l'eau : de vraies caisses qui flottent, à moitié immergées
// ---------------------------------------------------------------------------
const CRATE_WATERLINE = 10;   // ligne de flottaison dans le sprite (24×18)

function crateBob(i) {
  return Math.round(Math.sin(time * (1.7 + wv.storm) + i * 2) * (1 + wv.wind * 0.8 + wv.storm));
}

function drawPots() {
  progress.pots.forEach((p, i) => {
    if (!p) return;
    const s = POT_SLOTS[i];
    const bob = crateBob(i);
    const spr = crateSprites[p.type];
    const x = s.x - 12, top = s.y - CRATE_WATERLINE + bob, wl = CRATE_WATERLINE;
    const tilt = Math.round(Math.sin(time * 1.1 + i) * (0.6 + wv.wind));
    ctx.globalAlpha = 0.3;                        // ombre dans l'eau
    pxEllipse(ctx, s.x, s.y + 5, 14, 3, '#0e2a50');
    ctx.globalAlpha = 1;
    ctx.drawImage(spr, 0, 0, 24, wl, x + tilt, top, 24, wl);                    // partie émergée
    ctx.globalAlpha = 0.4;
    ctx.drawImage(spr, 0, wl, 24, 18 - wl, x + tilt, top + wl, 24, 18 - wl);  // partie immergée
    ctx.globalAlpha = 1;
    shadeLayer(spr, x + tilt, top, wv.dark * 0.5 + wv.overcast * 0.15);
    // ligne de flottaison et petite écume
    ctx.globalAlpha = 0.85;
    pxRect(ctx, x - 1 + tilt, top + wl, 26, 1, '#e2f6ff');
    const f = Math.floor(time * 3 + i) % 3;
    pxRect(ctx, x - 3 - f + tilt, top + wl + 1, 2, 1, '#e2f6ff');
    pxRect(ctx, x + 25 + f + tilt, top + wl + 1, 2, 1, '#e2f6ff');
    ctx.globalAlpha = 1;
  });
}

// le « ! » des caisses pleines, toujours bien visible (même de nuit)
function drawPotMarkers() {
  progress.pots.forEach((p, i) => {
    if (!p || !potFull(p)) return;
    const s = POT_SLOTS[i];
    ctx.drawImage(bangSprite, s.x - 2, s.y - CRATE_WATERLINE + crateBob(i) - 12 - Math.round(Math.abs(Math.sin(time * 6)) * 2));
  });
}

function potAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * LW;
  const y = ((clientY - r.top) / r.height) * LH;
  return progress.pots.findIndex((p, i) => p && Math.abs(x - POT_SLOTS[i].x) < 14 && y > POT_SLOTS[i].y - 26 && y < POT_SLOTS[i].y + 10);
}

function render() {
  // tremblement de l'écran pendant le combat contre le Grand Ancien
  const fighting = cth.active && ['reeling', 'phaseBreak'].includes(game.state);
  const amp = cth.shake * 3 + (fighting ? 0.4 + cth.rage * 0.5 : 0);
  ctx.save();
  if (amp > 0.2) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, LW, LH);
    ctx.translate(Math.round(rand(-amp, amp)), Math.round(rand(-amp, amp)));
  }
  renderScene();
  ctx.restore();
  drawReelGauge();
}

function renderScene() {
  const c = inGame ? corruption() : 0;
  const dark = wv.dark;
  const gloom = wv.overcast * 0.2 + wv.storm * 0.15;
  drawSky();
  drawCorruptionSky(c);
  ctx.drawImage(landLayer, 0, 0);
  shadeLayer(landLayer, 0, 0, dark * 0.6 + gloom);
  if (wv.dusk > 0) {
    ctx.fillStyle = `rgba(255, 120, 70, ${wv.dusk * 0.1})`;
    ctx.fillRect(0, 0, LW, HORIZON);
  }
  if (c > 0) {
    ctx.fillStyle = `rgba(50, 14, 70, ${c * 0.3})`;
    ctx.fillRect(0, 0, LW, HORIZON);
  }
  ctx.drawImage(waterLayer, 0, HORIZON);
  if (gloom > 0.01) {
    ctx.fillStyle = `rgba(60, 70, 86, ${gloom * 1.3})`;
    ctx.fillRect(0, HORIZON, LW, LH - HORIZON);
  }
  if (c > 0) {
    ctx.fillStyle = `rgba(26, 6, 40, ${c * 0.35})`;
    ctx.fillRect(0, HORIZON, LW, LH - HORIZON);
  }
  // la masse noire au fond du lac
  ctx.globalAlpha = 0.38 + c * 0.42;
  ctx.drawImage(massLayer, 0, HORIZON + Math.round(Math.sin(time * 0.4) * 1.5));
  ctx.globalAlpha = 1;
  // la nuit tombe sur le lac (les yeux, eux, brillent dans le noir)
  if (dark > 0.01) {
    ctx.fillStyle = `rgba(4, 8, 30, ${dark * 0.55})`;
    ctx.fillRect(0, HORIZON, LW, LH - HORIZON);
  }
  if (inGame) LAKE_EYES.forEach(drawLakeEye);
  drawWaterFx();
  drawCthulhuRising();
  drawRipples();
  if (inGame) drawPots();
  drawBoat();
  drawFloatAndLine();
  ctx.drawImage(fgLayer, 0, 0);
  shadeLayer(fgLayer, 0, 0, dark * 0.6 + gloom);
  if (inGame) drawPotMarkers();
  drawRain();
  drawGusts();
  drawFog();
  if (wv.sun > 0.01) {
    ctx.fillStyle = `rgba(255, 214, 120, ${wv.sun * 0.07 * (1 - dark)})`;
    ctx.fillRect(0, 0, LW, LH);
  }
  if (wv.dusk > 0) {
    ctx.fillStyle = `rgba(255, 130, 70, ${wv.dusk * 0.06})`;
    ctx.fillRect(0, 0, LW, LH);
  }
  if (storm.flash > 0) {
    ctx.fillStyle = `rgba(228, 232, 255, ${storm.flash * 0.45})`;
    ctx.fillRect(0, 0, LW, LH);
  }
  if (c > 0) {
    ctx.fillStyle = `rgba(40, 10, 60, ${c * 0.12})`;
    ctx.fillRect(0, 0, LW, LH);
  }
  if (inGame && (game.fish?.abom || game.fish?.f.unique) && ['bite', 'reeling', 'caught', 'rising', 'phaseBreak'].includes(game.state)) {
    ctx.fillStyle = game.fish.f.unique ? `rgba(10, 40, 25, ${(cth.active ? 0.16 : 0.35) + Math.sin(time * 2) * 0.08})` : `rgba(35, 8, 50, ${0.25 + Math.sin(time * 3) * 0.07})`;
    ctx.fillRect(0, 0, LW, LH);
  }
}

// ===========================================================================
// Carte de prise
// ===========================================================================
function showCatchCard() {
  const r = game.catch;
  const rar = RARITIES[r.f.tier];
  const card = $('catch-card');
  card.classList.toggle('abom', r.abom || !!r.f.unique);
  card.classList.toggle('mythic', !!r.f.unique);
  card.style.borderColor = r.abom ? '' : rar.color;
  $('cc-rarity').textContent = (r.abom ? 'Abomination · ' : '') + rar.name;
  $('cc-rarity').style.color = r.abom ? '#d9a0ff' : r.f.unique ? '#6af0b0' : rar.color;
  $('cc-name').textContent = fishName(r.f, r.abom);
  $('cc-dims').textContent = `${fmtCm(r.size)}  ·  ${fmtKg(r.weight)}`;
  $('cc-money').innerHTML = `+ ${fmtNum(r.money)} ${coinImg()}` +
    (r.goldBonus > 0 ? ` <span class="cc-perfect">(or +${Math.round(r.goldBonus * 100)} %)</span>` : '') +
    (r.perfect ? ` <span class="cc-perfect">(+${fmtNum(r.bonus)} Perfect)</span>` : '');
  $('cc-loot').hidden = !r.loot;
  if (r.loot) {
    $('cc-loot').innerHTML = `<img src="${itemIcon('bait', r.loot.bait)}" alt=""> Coffre : ${r.loot.qty} × ${r.loot.bait.name}`;
  }
  $('cc-item').hidden = !r.drop;
  if (r.drop) $('cc-item').innerHTML = dropHtml(r.drop);
  const badges = [];
  if (r.newSpecies) badges.push('Nouvelle entrée dans le carnet !');
  if (r.sizeRecord) badges.push('Record de taille !');
  if (r.weightRecord) badges.push('Record de poids !');
  $('cc-badges').textContent = badges.join('  ·  ');
  card.hidden = false;
  // bouton désactivé un court instant pour éviter de passer le récap par erreur
  const btn = $('cc-continue');
  btn.disabled = true;
  clearTimeout(showCatchCard.timer);
  showCatchCard.timer = setTimeout(() => { btn.disabled = false; }, 600);
  // relance l'animation d'apparition
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = '';
}

$('cc-continue').addEventListener('click', (e) => {
  e.currentTarget.blur();
  continueAfterCatch();
});

function showPerfect() {
  const el = $('perfect');
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(showPerfect.timer);
  showPerfect.timer = setTimeout(() => { el.hidden = true; }, 1800);
  Sound.perfect();
}

// ===========================================================================
// HUD & menu
// ===========================================================================
function updateHud() {
  $('hud-admin').hidden = !admin.on;
  $('hud-money').textContent = fmtNum(progress.money);
  $('hud-count').textContent = fmtNum(progress.stats.caught);
  const b = bait();
  $('hud-bait').textContent = b.pack === 0 ? b.name : `${b.name} (${progress.baits[b.id] || 0})`;
  updateWorldHud(true);
}

// Encart jour / heure / météo (mis à jour seulement quand quelque chose change)
let worldHudKey = '';
const weatherLabel = () => (isNight() && weather().id === 'clair' ? 'Nuit calme' : weather().name);
function updateWorldHud(force = false) {
  if (!inGame) return;
  const w = weather();
  const night = isNight();
  const key = `${dayOf(progress.clock)}|${fmtHour(progress.clock)}|${w.id}|${night}`;
  if (!force && key === worldHudKey) return;
  worldHudKey = key;
  $('hw-day').textContent = `Jour ${dayOf(progress.clock)} · ${fmtHour(progress.clock)}`;
  $('hw-icon').src = weatherIcon(night && w.id === 'clair' ? 'nuit' : w.id);
  $('hw-weather').textContent = weatherLabel() + (night && w.id !== 'clair' ? ' · nuit' : '');
  const lines = [...fxLines(w.fx), ...(night ? fxLines(NIGHT.fx) : [])];
  $('hw-fx').innerHTML = lines.map((l) => `<div>${l}</div>`).join('');
  $('hw-fx').hidden = !lines.length;
}

// Couleur de texte lisible pour une rareté (sur fond sombre)
const rarText = (tier) => shadeHex(RARITIES[tier].color, 1.35);

function dropHtml(d) {
  const it = itemDef(d.inst);
  return `<img src="${equipIcon(it)}" alt=""> Objet trouvé : <b style="color:${rarText(it.tier)}">${it.name}</b>` +
    (d.sold ? ` <small>(inventaire plein : vendu ${fmtNum(d.sold)} ${coinImg()})</small>` : '');
}

let confirmNew = false;

function refreshMenu() {
  const save = loadSave();
  confirmNew = false;
  $('btn-new').textContent = 'Nouvelle partie';
  $('btn-continue').disabled = !save;
  $('save-info').innerHTML = save
    ? `Partie en cours : jour ${dayOf(save.clock)} · ${save.stats.caught} poisson${save.stats.caught > 1 ? 's' : ''} · ${fmtNum(save.money)} ${coinImg()}`
    : '';
}

function enterGame() {
  document.activeElement?.blur();
  inGame = true;
  $('menu').hidden = true;
  $('hud').hidden = false;
  $('catch-card').hidden = true;
  invalidateMods();
  refreshBoat();
  if (!progress.weather) setWeather('clair', false);
  // pas de transition visuelle en arrivant : le ciel est directement à la bonne heure et à la bonne météo
  Object.assign(wv, { ...Object.fromEntries(VIS_KEYS.map((k) => [k, weather().vis[k] || 0])), dark: darknessAt(hourOf(progress.clock)) });
  drops.length = 0;
  updateHud();
  setState('idle');
  say('Cliquez pour lancer la ligne');
}

function showMenu() {
  closePanel();
  if (inGame) writeSave();
  inGame = false;
  Sound.rain(0);
  cth.active = false;
  Sound.setMusic('calm');
  $('menu').hidden = false;
  $('hud').hidden = true;
  $('catch-card').hidden = true;
  say('');
  refreshMenu();
}

$('btn-continue').addEventListener('click', () => {
  Sound.click();
  progress = loadSave() || emptyProgress();
  enterGame();
});

$('btn-new').addEventListener('click', () => {
  Sound.click();
  if (loadSave() && !confirmNew) {
    confirmNew = true;
    $('btn-new').textContent = 'Confirmer ?';
    $('save-info').textContent = 'La partie en cours sera effacée.';
    return;
  }
  clearSave();
  progress = emptyProgress();
  writeSave();
  enterGame();
});

$('btn-options').addEventListener('click', () => openPanel('options'));

$('btn-menu').addEventListener('click', (e) => {
  e.currentTarget.blur();
  Sound.click();
  showMenu();
});

// ===========================================================================
// Panneaux
// ===========================================================================
let openPanelName = null;
const PANELS = ['book', 'shop', 'sheet', 'options', 'crates', 'pot', 'achievements'];

function openPanel(name) {
  if (!inGame && name !== 'options') return;
  holding = false;
  $('overlay').hidden = false;
  $('message').hidden = true;
  for (const p of PANELS) $(`panel-${p}`).hidden = p !== name;
  openPanelName = name;
  if (name === 'book') renderBook();
  if (name === 'shop') renderShop();
  if (name === 'sheet') renderSheet();
  if (name === 'options') syncOptions();
  if (name === 'crates') renderCrates();
  if (name === 'pot') renderPotRecap();
  if (name === 'achievements') renderAchievements();
  Sound.click();
}

function closePanel() {
  if (!openPanelName) return;
  $('overlay').hidden = true;
  $('message').hidden = false;
  $('inv-tip').hidden = true;
  openPanelName = null;
  updateHud();
}

document.querySelectorAll('[data-open]').forEach((b) =>
  b.addEventListener('click', (e) => { e.currentTarget.blur(); openPanel(b.dataset.open); }));
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { Sound.click(); closePanel(); }));
$('overlay').addEventListener('pointerdown', (e) => { if (e.target.id === 'overlay') closePanel(); });

// ---------------------------------------------------------------------------
// Carnet (livre) : deux sections, Poissons et Crustacés
// ---------------------------------------------------------------------------
let bookSection = 'fish';
let spread = 0;
let bookCanvases = [];
const BOOK = {
  fish: { list: FISH, title: 'Poissons', prefix: '' },
  crust: { list: CRUSTS, title: 'Crustacés', prefix: 'C' },
};
const bookList = () => BOOK[bookSection].list;
const spreadCount = () => bookList().length + 1;
const dexTotal = () => FISH.reduce((s, f) => s + (f.unique ? 1 : 2), 0) + CRUSTS.length * 2;

function vigorDots(v) {
  const n = clamp(Math.round(v * 5), 1, 7);
  return '●'.repeat(n) + '○'.repeat(Math.max(0, 5 - n));
}

function fishPage(f, abom, index) {
  const entry = progress.dex[dexKey(f, abom)];
  const known = !!entry;
  const rar = RARITIES[f.tier];
  const unk = '????';
  const isFish = f.kind !== 'crust';
  return `
    <div class="page-head">
      <span class="rarity" style="background:${known ? rar.color : '#4a2e17'}">${known ? rar.name : unk}</span>
      <span class="page-num">N° ${BOOK[bookSection].prefix}${String(index + 1).padStart(2, '0')}${abom ? '-A' : ''}</span>
    </div>
    ${abom ? `<div class="abom-tag">${known ? 'Abomination' : unk}</div>` : ''}
    <h2>${known ? fishName(f, abom) : unk}</h2>
    <canvas class="fish-canvas px" width="100" height="72" data-fish="${f.id}" data-abom="${abom ? 1 : 0}" data-known="${known ? 1 : 0}"></canvas>
    <dl class="records">
      <dt>Plus grande taille</dt><dd>${known ? fmtCm(entry.maxSize) : unk}</dd>
      <dt>Plus lourd</dt><dd>${known ? fmtKg(entry.maxWeight) : unk}</dd>
      <dt>Capturés</dt><dd>${known ? entry.count : unk}</dd>
      ${isFish ? `<dt>Combativité</dt><dd>${known ? vigorDots(TIER_VIGOR[f.tier] * (abom ? ABOM_VIGOR : 1)) : unk}</dd>` : ''}
    </dl>
    <p class="desc">${known ? (abom ? f.abomDesc : f.desc) : '???? ???? ?? ??????? ???? ??? ????? ?? ???????.'}</p>`;
}

// Page de droite du Grand Ancien (il n'a pas de version "abomination" : il EST l'abomination)
function lorePage(f) {
  const known = !!progress.dex[dexKey(f, false)];
  return `
    <div class="page-head"><span class="page-num">—</span></div>
    <h2>${known ? 'Le Grand Rêveur' : '????'}</h2>
    <p class="desc lore">${known ? f.lore : "Quelque chose dort sous le lac. Plus on remonte d'abominations, plus il se rapproche de la surface."}</p>
    <p class="desc">Chance actuelle : ${fmtPct(fishOdds()[FISH.indexOf(f)])}</p>`;
}

function coverPages() {
  const list = bookList();
  const normals = list.filter((f) => progress.dex[dexKey(f, false)]).length;
  const withAbom = list.filter((f) => !f.unique);
  const aboms = withAbom.filter((f) => progress.dex[dexKey(f, true)]).length;
  const fish = bookSection === 'fish';
  const left = `
    <div class="cover">
      <h2>${fish ? 'Carnet du Pêcheur' : 'Carnet des Casiers'}</h2>
      <h3>${BOOK[bookSection].title}</h3>
      <p class="big">Espèces : ${normals} / ${list.length}</p>
      <p class="big">Abominations : ${aboms} / ${withAbom.length}</p>
      <p class="desc note">${fish
        ? '« Certaines choses nagent sous la surface du lac.<br>Il vaut mieux ne pas trop y penser. »'
        : '« Ce qui marche au fond du lac finit toujours<br>par entrer dans une caisse. »'}</p>
    </div>`;
  const items = list.map((f, i) => {
    const n = progress.dex[dexKey(f, false)];
    const a = progress.dex[dexKey(f, true)];
    return `<li data-goto="${i + 1}">
      <span>N° ${BOOK[bookSection].prefix}${String(i + 1).padStart(2, '0')}</span>
      <span>${n ? f.name : '????'}</span>
      <span class="dots"></span>
      <span class="mark" title="Pêché">${n ? '●' : '○'}</span>
      <span class="mark" title="Abomination">${f.unique ? '' : a ? '✸' : '·'}</span>
    </li>`;
  }).join('');
  const right = `<h2>Sommaire</h2><ul class="toc">${items}</ul>
    <p class="desc">● pêché &nbsp; ✸ abomination capturée</p>`;
  return [left, right];
}

function renderBook(dir = 0) {
  const left = $('page-left');
  const right = $('page-right');
  if (spread === 0) {
    [left.innerHTML, right.innerHTML] = coverPages();
    left.className = 'page left';
    right.className = 'page right';
  } else {
    const f = bookList()[spread - 1];
    left.innerHTML = fishPage(f, false, spread - 1);
    right.innerHTML = f.unique ? lorePage(f) : fishPage(f, true, spread - 1);
    left.className = `page left${progress.dex[dexKey(f, false)] ? '' : ' unknown'}`;
    right.className = f.unique ? 'page right abom mythic' : `page right abom${progress.dex[dexKey(f, true)] ? '' : ' unknown'}`;
  }
  if (dir > 0) { void right.offsetWidth; right.classList.add('turn-next'); }
  if (dir < 0) { void left.offsetWidth; left.classList.add('turn-prev'); }

  $('book-pos').textContent = spread === 0 ? 'Sommaire' : `${spread} / ${spreadCount() - 1}`;
  $('book-prev').disabled = spread === 0;
  $('book-next').disabled = spread === spreadCount() - 1;
  document.querySelectorAll('[data-section]').forEach((b) => b.classList.toggle('active', b.dataset.section === bookSection));

  bookCanvases = [...document.querySelectorAll('#panel-book canvas')].map((cv) => ({
    cv,
    f: creature(cv.dataset.fish),
    abom: cv.dataset.abom === '1',
    known: cv.dataset.known === '1',
  }));
  document.querySelectorAll('#panel-book [data-goto]').forEach((li) =>
    li.addEventListener('click', () => turnTo(+li.dataset.goto)));
}

function turnTo(n) {
  n = clamp(n, 0, spreadCount() - 1);
  if (n === spread) return;
  const dir = Math.sign(n - spread);
  spread = n;
  renderBook(dir);
  Sound.page();
}

$('book-prev').addEventListener('click', () => turnTo(spread - 1));
$('book-next').addEventListener('click', () => turnTo(spread + 1));
document.querySelectorAll('[data-section]').forEach((b) => b.addEventListener('click', () => {
  if (bookSection === b.dataset.section) return;
  bookSection = b.dataset.section;
  spread = 0;
  renderBook(1);
  Sound.page();
}));

// ---------------------------------------------------------------------------
// Boutique
// ---------------------------------------------------------------------------
let shopTab = 'rods';

function rodEffects(r) {
  return `Attente ${r.speed < 1 ? `−${Math.round((1 - r.speed) * 100)} %` : 'normale'} · Réaction +${r.window.toFixed(2).replace('.', ',')} s · Vigueur des poissons ${r.vigor < 1 ? `−${Math.round((1 - r.vigor) * 100)} %` : 'normale'}`;
}
function baitEffects(b) {
  if (b.rare === 0 && b.abom === 0) return 'Aucun bonus';
  return `Rareté +${Math.round(b.rare * 100)} % · Abomination ${fmtPct(abomChance(b))}`;
}

function potEffects(p) {
  const parts = [`Capacité ${p.capacity}`, `Vitesse ×${String(p.speed).replace('.', ',')}`];
  if (p.rare) parts.push(`Rareté +${Math.round(p.rare * 100)} %`);
  if (p.abom) parts.push(`Abomination +${fmtPct(p.abom)}`);
  return parts.join(' · ');
}

function renderShop() {
  $('shop-money').textContent = fmtNum(progress.money);
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === shopTab));
  let html = '';
  if (shopTab === 'rods') {
    for (const r of RODS) {
      const owned = progress.rods.includes(r.id);
      const equipped = progress.rod === r.id;
      let btn;
      if (equipped) btn = '<button class="btn" disabled>Équipée</button>';
      else if (owned) btn = `<button class="btn" data-equip-rod="${r.id}">Équiper</button>`;
      else btn = `<button class="btn" data-buy-rod="${r.id}" ${progress.money < r.price ? 'disabled' : ''}>Acheter — ${fmtNum(r.price)} ${coinImg()}</button>`;
      html += `
        <div class="item ${equipped ? 'equipped' : ''}">
          <img class="item-icon" src="${itemIcon('rod', r)}" alt="">
          <div class="info"><b>${r.name}</b><small>${r.desc}</small><span class="eff">${rodEffects(r)}</span></div>
          <div class="actions">${btn}</div>
        </div>`;
    }
  } else if (shopTab === 'pots') {
    for (const p of POTS) {
      const owned = progress.potsOwned[p.id] || 0;
      const deployed = owned - potsAvailable(p.id);
      html += `
        <div class="item">
          <img class="item-icon" src="${itemIcon('pot', p)}" alt="">
          <div class="info"><b>${p.name}</b><small>${p.desc}</small>
            <span class="eff">${potEffects(p)}</span>
            <span class="stock">Possédées : ${owned}${deployed ? ` (dont ${deployed} à l'eau)` : ''}</span></div>
          <div class="actions"><button class="btn" data-buy-pot="${p.id}" ${progress.money < p.price ? 'disabled' : ''}>Acheter — ${fmtNum(p.price)} ${coinImg()}</button></div>
        </div>`;
    }
  } else {
    for (const b of BAITS) {
      const qty = progress.baits[b.id] || 0;
      const equipped = progress.bait === b.id;
      const canEquip = b.pack === 0 || qty > 0;
      const buy = b.pack === 0 ? '' :
        `<button class="btn" data-buy-bait="${b.id}" ${progress.money < b.price ? 'disabled' : ''}>Acheter ×${b.pack} — ${fmtNum(b.price)} ${coinImg()}</button>`;
      const equip = equipped ? '<button class="btn" disabled>Équipé</button>' :
        `<button class="btn" data-equip-bait="${b.id}" ${canEquip ? '' : 'disabled'}>Équiper</button>`;
      html += `
        <div class="item ${equipped ? 'equipped' : ''}">
          <img class="item-icon" src="${itemIcon('bait', b)}" alt="">
          <div class="info"><b>${b.name}</b><small>${b.desc}</small>
            <span class="eff">${baitEffects(b)}</span>
            <span class="stock">${b.pack === 0 ? 'Illimité' : `En stock : ${qty}`}</span></div>
          <div class="actions">${buy}${equip}</div>
        </div>`;
    }
  }
  $('shop-list').innerHTML = html;
}

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  shopTab = t.dataset.tab;
  Sound.click();
  renderShop();
}));

function onGearClick(e) {
  const t = e.target.closest('button');
  if (!t) return;
  const d = t.dataset;
  if (d.buyRod) {
    const r = ROD_BY_ID[d.buyRod];
    if (progress.money < r.price || progress.rods.includes(r.id)) return;
    progress.money -= r.price;
    progress.stats.spent += r.price;
    progress.rods.push(r.id);
    progress.rod = r.id;
    Sound.buy();
  } else if (d.buyBait) {
    const b = BAIT_BY_ID[d.buyBait];
    if (progress.money < b.price) return;
    progress.money -= b.price;
    progress.stats.spent += b.price;
    progress.baits[b.id] = (progress.baits[b.id] || 0) + b.pack;
    Sound.buy();
  } else if (d.buyPot) {
    const p = POT_BY_ID[d.buyPot];
    if (progress.money < p.price) return;
    progress.money -= p.price;
    progress.stats.spent += p.price;
    progress.potsOwned[p.id] = (progress.potsOwned[p.id] || 0) + 1;
    Sound.buy();
  } else if (d.equipRod) {
    if (progress.rods.includes(d.equipRod)) progress.rod = d.equipRod;
    Sound.click();
  } else if (d.equipBait) {
    if (d.equipBait === 'pain' || progress.baits[d.equipBait] > 0) progress.bait = d.equipBait;
    Sound.click();
  } else return;
  writeSave();
  updateHud();
  if (openPanelName === 'shop') renderShop(); else renderSheet();
  if (d.buyBait) checkAchievements({ type: 'buy', item: 'bait', id: d.buyBait });
  else if (d.buyRod) checkAchievements({ type: 'buy', item: 'rod', id: d.buyRod });
  else if (d.buyPot) checkAchievements({ type: 'buy', item: 'pot', id: d.buyPot });
}

$('shop-list').addEventListener('click', onGearClick);

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------
function drawPortrait() {
  const cv = $('portrait');
  const c = cv.getContext('2d');
  ditherGradient(c, 0, 0, 150, 58, ['#5a8fe4', '#a8d2f8', '#d2ecfc']);
  ditherGradient(c, 0, 58, 150, 38, ['#86cff2', '#3384c4', '#1b4c86']);
  pxRect(c, 0, 58, 150, 1, '#c4ecff');
  pxDisk(c, 128, 16, 8, '#fff3b8');
  c.drawImage(boatSprite, 2, 38);
  const hand = { x: 2 + HAND.x, y: 38 + HAND.y };
  const tip = { x: 136, y: 18 };
  pxCurve(c, { x: hand.x - 6, y: hand.y + 4 }, { x: 104, y: 34 }, tip, rod().color);
  pxRect(c, hand.x - 7, hand.y + 2, 3, 3, '#c9a26a');
  pxRect(c, tip.x, tip.y, 1, 26, '#f0f4f8');
  pxDisk(c, tip.x, tip.y + 28, 2, bait().color);
  pxRect(c, tip.x - 2, tip.y + 26, 5, 1, '#1e140c');
}

// ---------------------------------------------------------------------------
// Profil : onglets « Fiche » et « Inventaire »
// ---------------------------------------------------------------------------
let sheetTab = 'gear';
let invFilter = 'all';
let sellConfirm = false;

function renderSheet() {
  document.querySelectorAll('[data-stab]').forEach((b) => b.classList.toggle('active', b.dataset.stab === sheetTab));
  $('inv-count').textContent = `(${progress.items.length})`;
  $('sheet-main').hidden = sheetTab !== 'gear';
  $('sheet-inv').hidden = sheetTab !== 'inv';
  if (sheetTab === 'inv') renderInventory(); else renderSheetMain();
}

document.querySelectorAll('[data-stab]').forEach((b) => b.addEventListener('click', () => {
  sheetTab = b.dataset.stab;
  sellConfirm = false;
  Sound.click();
  renderSheet();
}));

const ghostItem = (slot) => ({ id: `ghost-${slot}`, slot, tier: 0, color: '#5a6290', accent: '#454c78' });

function fxTotalLines(m) {
  return Object.entries(m).filter(([k, v]) => FX[k] && (FX[k].mul ? Math.abs(v - 1) > 1e-6 : Math.abs(v) > 1e-6)).map(([k, v]) => FX[k].label(v));
}

function invSort(a, b) {
  const A = itemDef(a), B = itemDef(b);
  return (isEquipped(b) - isEquipped(a)) || (B.tier - A.tier) ||
    (SLOTS.findIndex((s) => s.id === A.slot) - SLOTS.findIndex((s) => s.id === B.slot)) || (a.uid - b.uid);
}

function renderInventory() {
  hideInvTip();
  // emplacements équipés
  $('inv-slots').innerHTML = SLOTS.map((sl) => {
    const it = equippedItem(sl.id);
    return `
      <div class="slot inv-slot ${it ? '' : 'empty'}" ${it ? `style="--rc:${RARITIES[it.tier].color}"` : ''}>
        <div class="slot-top"><img class="${it ? '' : 'ghost'}" src="${equipIcon(it || ghostItem(sl.id))}" alt="">
          <div class="inv-slot-txt"><div class="slot-label">${sl.name}</div>
            <div class="slot-name" ${it ? `style="color:${rarText(it.tier)}"` : ''}>${it ? it.name : 'Aucun'}</div></div>
          ${it ? `<button class="btn" data-unequip="${sl.id}">Retirer</button>` : ''}</div>
        ${it ? `<div class="eff">${fxLines(it.fx).join(' · ')}</div>` : ''}
      </div>`;
  }).join('');

  // effets actifs : total, puis le détail des sources
  const sources = activeSources();
  const total = fxTotalLines(sumFx(sources));
  $('inv-bonus').innerHTML = (total.length ? `<div class="eff">${total.join('<br>')}</div>` : '<div class="stock">Aucun effet actif.</div>') +
    `<div class="inv-sources">${sources.map((s) => `<span class="src"><img src="${s.icon}" alt="">${s.name}</span>`).join('')}</div>`;

  // filtres
  const counts = Object.fromEntries(SLOTS.map((s) => [s.id, progress.items.filter((i) => itemDef(i).slot === s.id).length]));
  $('inv-filter').innerHTML = [['all', 'Tout', progress.items.length], ...SLOTS.map((s) => [s.id, s.plural, counts[s.id]])]
    .map(([id, name, n]) => `<button class="btn ${invFilter === id ? 'active' : ''}" data-inv-filter="${id}">${name} (${n})</button>`).join('');
  $('inv-cap').textContent = `${progress.items.length} / ${ITEM_CAP}`;

  // objets : les exemplaires identiques sont regroupés en une seule pile
  const stacks = [];
  for (const inst of progress.items.filter((i) => invFilter === 'all' || itemDef(i).slot === invFilter).sort(invSort)) {
    const s = stacks.find((x) => x.it.id === inst.id);
    if (s) s.insts.push(inst); else stacks.push({ it: itemDef(inst), insts: [inst] });
  }
  $('inv-list').innerHTML = stacks.length ? stacks.map(({ it, insts }) => {
    const eq = insts.some(isEquipped);
    const free = insts.filter((i) => !isEquipped(i));
    const value = itemValue(it);
    return `
      <div class="item inv-item ${eq ? 'equipped' : ''}" style="--rc:${RARITIES[it.tier].color}">
        <div class="inv-icon-wrap"><img class="item-icon" src="${equipIcon(it)}" alt="">${insts.length > 1 ? `<span class="inv-qty">×${insts.length}</span>` : ''}</div>
        <div class="info"><b style="color:${rarText(it.tier)}">${it.name}</b>
          <small>${SLOT_BY_ID[it.slot].name} · ${RARITIES[it.tier].name}${eq ? ' · <span class="inv-eq">Équipé</span>' : ''}</small>
          <span class="eff">${fxLines(it.fx).join(' · ')}</span>
          <small class="inv-desc">${it.desc}</small></div>
        <div class="actions">
          ${eq ? `<button class="btn" data-unequip="${it.slot}">Retirer</button>` : `<button class="btn" data-equip-item="${free[0].uid}">Équiper</button>`}
          <button class="btn" data-sell-item="${free[0]?.uid ?? ''}" ${free.length ? '' : 'disabled title="Retirez-le d\'abord"'}>Vendre ${fmtNum(value)} ${coinImg()}</button>
          ${free.length > 1 ? `<button class="btn" data-sell-stack="${it.id}">Tout vendre (×${free.length}) ${fmtNum(value * free.length)} ${coinImg()}</button>` : ''}
        </div>
      </div>`;
  }).join('') : `<p class="inv-empty">${progress.items.length ? 'Aucun objet dans cette catégorie.' :
    `Votre sac est vide.<br><small>Les poissons et les caisses rapportent parfois un objet (${fmtPct(itemDropChance(0, false, 'fish'))} sur un poisson commun, davantage sur les poissons rares et les abominations).</small>`}</p>`;

  // vente groupée des objets communs non équipés
  const commons = progress.items.filter((i) => itemDef(i).tier === 0 && !isEquipped(i));
  const sum = commons.reduce((s, i) => s + itemValue(itemDef(i)), 0);
  const btn = $('inv-sell-commons');
  btn.disabled = !commons.length;
  btn.innerHTML = !commons.length ? 'Aucun objet commun à vendre'
    : sellConfirm ? `Confirmer la vente de ${commons.length} objet(s) ?`
    : `Vendre les objets communs (${commons.length}) : +${fmtNum(sum)} ${coinImg()}`;
}

$('sheet-inv').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.invFilter) { invFilter = d.invFilter; Sound.click(); }
  else if (d.equipItem) { equipItem(+d.equipItem); Sound.click(); }
  else if (d.unequip) { unequipSlot(d.unequip); Sound.click(); }
  else if (d.sellItem || d.sellStack) {
    const uids = d.sellStack
      ? progress.items.filter((i) => i.id === d.sellStack && !isEquipped(i)).map((i) => i.uid)
      : [+d.sellItem];
    if (sellItems(uids)) Sound.sell();
    writeSave();
    updateHud();
    checkAchievements();
  } else if (b.id === 'inv-sell-commons') {
    if (!sellConfirm) { sellConfirm = true; Sound.click(); renderInventory(); return; }
    const uids = progress.items.filter((i) => itemDef(i).tier === 0 && !isEquipped(i)).map((i) => i.uid);
    if (sellItems(uids)) Sound.sell();
    writeSave();
    updateHud();
    checkAchievements();
  } else return;
  sellConfirm = false;
  renderSheet();
});

// Survol (ou focus clavier) du bouton « Équiper » : une info-bulle flottante montre la différence
// de stats avec l'objet porté. Elle ne change pas la mise en page et ne capte pas la souris.
function showInvTip(btn) {
  const inst = itemByUid(+btn.dataset.equipItem);
  if (!inst) return;
  const it = itemDef(inst);
  const cur = equippedItem(it.slot);
  const lines = fxDiff(it.fx, cur?.fx);
  const tip = $('inv-tip');
  tip.innerHTML = `<div class="inv-diff-head">${cur ? `Comparé à : <b style="color:${rarText(cur.tier)}">${cur.name}</b>` : 'Emplacement vide'}</div>` +
    (lines.length ? lines.map((l) => `<span class="${l.good ? 'up' : 'down'}">${l.good ? '▲' : '▼'} ${l.text}</span>`).join('') : '<span>Aucune différence</span>');
  tip.hidden = false;
  // à gauche du bouton, sans sortir de l'écran de jeu
  const g = $('game').getBoundingClientRect();
  const b = btn.getBoundingClientRect();
  const tr = tip.getBoundingClientRect();
  tip.style.left = `${Math.max(4, b.left - g.left - tr.width - 8)}px`;
  tip.style.top = `${clamp(b.top - g.top + b.height / 2 - tr.height / 2, 4, g.height - tr.height - 4)}px`;
}
const hideInvTip = () => { $('inv-tip').hidden = true; };
$('inv-list').addEventListener('mouseover', (e) => {
  const b = e.target.closest('[data-equip-item]');
  if (b) showInvTip(b); else hideInvTip();
});
$('inv-list').addEventListener('mouseleave', hideInvTip);
$('inv-list').addEventListener('focusin', (e) => { const b = e.target.closest('[data-equip-item]'); if (b) showInvTip(b); });
$('inv-list').addEventListener('focusout', hideInvTip);
$('inv-list').addEventListener('scroll', hideInvTip);

function renderSheetMain() {
  const r = rod();
  const b = bait();
  const rodChips = progress.rods.map((id) =>
    `<button class="btn ${id === r.id ? 'active' : ''}" data-equip-rod="${id}">${ROD_BY_ID[id].name}</button>`).join('');
  const baitChips = BAITS.filter((x) => x.pack === 0 || progress.baits[x.id] > 0).map((x) =>
    `<button class="btn ${x.id === b.id ? 'active' : ''}" data-equip-bait="${x.id}">${x.name}${x.pack ? ` (${progress.baits[x.id]})` : ''}</button>`).join('');

  $('sheet-gear').innerHTML = `
    <h3>Équipement</h3>
    <div class="slot">
      <div class="slot-top"><img src="${itemIcon('rod', r)}" alt="">
        <div><div class="slot-label">Canne à pêche</div><div class="slot-name">${r.name}</div></div></div>
      <div class="eff">${rodEffects(r)}</div>
      <div class="chips">${rodChips}</div>
    </div>
    <div class="slot">
      <div class="slot-top"><img src="${itemIcon('bait', b)}" alt="">
        <div><div class="slot-label">Appât</div><div class="slot-name">${b.name}${b.pack ? ` — ${progress.baits[b.id] || 0} restant(s)` : ''}</div></div></div>
      <div class="eff">${baitEffects(b)}</div>
      <div class="chips">${baitChips}</div>
    </div>
    <div class="slot">
      <div class="slot-label">Tenue</div>
      <div class="outfit">${SLOTS.map((sl) => {
        const it = equippedItem(sl.id);
        return `<div class="outfit-cell" title="${sl.name} : ${it ? it.name : 'aucun'}"><img class="${it ? '' : 'ghost'}" src="${equipIcon(it || ghostItem(sl.id))}" alt="">
          <span ${it ? `style="color:${rarText(it.tier)}"` : ''}>${it ? it.name : sl.name}</span></div>`;
      }).join('')}</div>
      <div class="chips"><button class="btn" data-goto-inv>Ouvrir l'inventaire (${progress.items.length})</button></div>
    </div>`;

  const st = progress.stats;
  const odds = fishOdds();
  const oddsByTier = RARITIES.map((rar, tier) =>
    [rar.name, FISH.reduce((s, f, i) => s + (f.tier === tier ? odds[i] : 0), 0)]);
  const known = Object.keys(progress.dex).length;
  const best = st.best ? `${fishName(FISH_BY_ID[st.best.id], st.best.abom)}, ${fmtKg(st.best.weight)}` : '—';
  const rows = [
    ['section', 'Pêche'],
    ['Temps de pêche', fmtTime(st.playTime)],
    ['Lancers', fmtNum(st.casts)],
    ['Poissons pêchés', fmtNum(st.caught)],
    ['Abominations pêchées', fmtNum(st.aboms)],
    ['Ferrages trop tôt', fmtNum(st.early)],
    ['Poissons échappés', fmtNum(st.missed)],
    ['Taux de réussite', st.casts ? fmtPct(st.caught / st.casts) : '—'],
    ['Prises parfaites', fmtNum(st.perfects || 0)],
    ['Coffres récupérés', fmtNum(st.chests || 0)],
    ['Plus lourde prise', best],
    ['Entrées du carnet', `${known} / ${dexTotal()}`],
    ['section', 'Le temps qui passe'],
    ['Jour', `${dayOf(progress.clock)} (${fmtHour(progress.clock)})`],
    ['Météo', weatherLabel()],
    ['Effets du moment', [...fxLines(weather().fx), ...(isNight() ? fxLines(NIGHT.fx) : [])].join(' · ') || '—'],
    ['section', 'Objets'],
    ['Objets trouvés', fmtNum(st.itemsFound || 0)],
    ['Objets vendus', `${fmtNum(st.itemsSold || 0)} (${fmtNum(st.itemsEarned || 0)} ${coinImg()})`],
    ['Inventaire', `${progress.items.length} / ${ITEM_CAP}`],
    ['Objet sur un poisson commun', fmtPct(itemDropChance(0, false, 'fish'))],
    ['Objet sur un poisson légendaire', fmtPct(itemDropChance(4, false, 'fish'))],
    ['Objet par crustacé (commun)', fmtPct(itemDropChance(0, false, 'pot'))],
    ['section', 'Caisses'],
    ['Caisses relevées', fmtNum(st.potsCollected || 0)],
    ['Crustacés attrapés', fmtNum(st.crusts || 0)],
    ['section', 'Le lac'],
    ['Corruption', fmtPct(corruption())],
    ['Yeux ouverts', `${LAKE_EYES.filter((e) => e.open > 0.5).length} / ${LAKE_EYES.length}`],
    ['Grand Ancien', st.cthulhu ? `Pêché ${st.cthulhu} fois` : '???'],
    ['section', 'Bourse'],
    ['Pièces en poche', `${fmtNum(progress.money)} ${coinImg()}`],
    ['Pièces gagnées', `${fmtNum(st.earned)} ${coinImg()}`],
    ['Pièces dépensées', `${fmtNum(st.spent)} ${coinImg()}`],
    ['section', 'Chances actuelles (appât, équipement, météo)'],
    ...oddsByTier.map(([n, p]) => [n, fmtPct(p)]),
    ['Abomination', fmtPct(abomChance())],
    ['section', `Contenu des coffres (${fmtPct(chestChance())} par remontée, 1 à 20 appâts)`],
    ...chestOdds().map(([b, p]) => [b.name, fmtPct(p)]),
  ];
  $('sheet-stats').innerHTML = rows.map(([a, v]) =>
    a === 'section' ? `<tr class="section"><td colspan="2">${v}</td></tr>` : `<tr><td>${a}</td><td>${v}</td></tr>`).join('');
  drawPortrait();
}

$('sheet-gear').addEventListener('click', (e) => {
  if (e.target.closest('[data-goto-inv]')) {
    sheetTab = 'inv';
    Sound.click();
    renderSheet();
    return;
  }
  onGearClick(e);
});

// ---------------------------------------------------------------------------
// Panneau des caisses à crustacés
// ---------------------------------------------------------------------------
const crateSel = [{}, {}];   // choix mémorisés (type de caisse, appât) pour chaque emplacement libre

function fmtDuration(s) {
  s = Math.max(0, s);
  if (s < 60) return `${Math.ceil(s)} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
}

function crateStatus(p) {
  const n = p.contents.length;
  const cap = potType(p).capacity;
  return potFull(p)
    ? `${n} / ${cap} prises · <b>Pleine !</b>`
    : `${n} / ${cap} prises · prochaine dans ~${fmtDuration((p.nextAt - Date.now()) / 1000)}`;
}

function renderCrates() {
  const baits = BAITS.filter((b) => b.pack === 0 || progress.baits[b.id] > 0);
  $('crates-list').innerHTML = progress.pots.map((p, i) => {
    if (p) {
      const t = potType(p);
      return `
        <div class="slot crate-slot">
          <div class="slot-top"><img src="${itemIcon('pot', t)}" alt="">
            <div><div class="slot-label">Emplacement ${i + 1} · à l'eau depuis <span id="crate-age-${i}">${fmtDuration((Date.now() - p.placedAt) / 1000)}</span></div>
            <div class="slot-name">${t.name}</div></div></div>
          <div class="eff">Appât : ${BAIT_BY_ID[p.bait].name}</div>
          <div class="crate-fill"><div id="crate-fill-${i}" style="width:${(p.contents.length / t.capacity) * 100}%"></div></div>
          <div class="crate-status" id="crate-status-${i}">${crateStatus(p)}</div>
          <div class="chips"><button class="btn" data-collect="${i}">Relever la caisse</button></div>
        </div>`;
    }
    const types = POTS.filter((t) => potsAvailable(t.id) > 0);
    if (!types.length) {
      return `<div class="slot crate-slot empty"><div class="slot-label">Emplacement ${i + 1} · libre</div>
        <div class="eff">Aucune caisse disponible. Achetez-en une à la boutique (onglet « Caisses »).</div></div>`;
    }
    const sel = crateSel[i];
    if (!types.some((t) => t.id === sel.type)) sel.type = types[0].id;
    if (!baits.some((b) => b.id === sel.bait)) sel.bait = 'pain';
    const odds = crustOdds({ type: sel.type, bait: sel.bait });
    const rareOdds = odds.reduce((s, o, k) => s + (CRUSTS[k].tier >= 2 ? o : 0), 0);
    const abomP = BASE_ABOM_CHANCE + BAIT_BY_ID[sel.bait].abom + POT_BY_ID[sel.type].abom;
    return `
      <div class="slot crate-slot empty">
        <div class="slot-label">Emplacement ${i + 1} · libre</div>
        <label class="crate-field">Caisse
          <select data-sel-type="${i}">${types.map((t) => `<option value="${t.id}" ${t.id === sel.type ? 'selected' : ''}>${t.name} (${potsAvailable(t.id)} dispo.)</option>`).join('')}</select></label>
        <label class="crate-field">Appât
          <select data-sel-bait="${i}">${baits.map((b) => `<option value="${b.id}" ${b.id === sel.bait ? 'selected' : ''}>${b.name}${b.pack ? ` (${progress.baits[b.id]})` : ''}</option>`).join('')}</select></label>
        <div class="eff">${potEffects(POT_BY_ID[sel.type])}<br>Avec cet appât : rares ou mieux ${fmtPct(rareOdds)} · abomination ${fmtPct(abomP)}</div>
        <div class="stock">Un appât est placé dans la caisse à chaque mise à l'eau.</div>
        <div class="chips"><button class="btn" data-deploy="${i}">Mettre à l'eau</button></div>
      </div>`;
  }).join('');
}

// Mise à jour légère (chaque seconde) sans tout reconstruire, pour ne pas fermer les listes déroulantes
function refreshCrateStatus() {
  progress.pots.forEach((p, i) => {
    if (!p || !$(`crate-status-${i}`)) return;
    $(`crate-status-${i}`).innerHTML = crateStatus(p);
    $(`crate-fill-${i}`).style.width = `${(p.contents.length / potType(p).capacity) * 100}%`;
    $(`crate-age-${i}`).textContent = fmtDuration((Date.now() - p.placedAt) / 1000);
  });
}

$('crates-list').addEventListener('change', (e) => {
  const d = e.target.dataset;
  if (d.selType) crateSel[+d.selType].type = e.target.value;
  if (d.selBait) crateSel[+d.selBait].bait = e.target.value;
  renderCrates();
});

$('crates-list').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.deploy) {
    const i = +b.dataset.deploy;
    if (deployPot(i, crateSel[i].type, crateSel[i].bait)) renderCrates();
  } else if (b.dataset.collect) {
    collectPot(+b.dataset.collect);
  }
});

// ---------------------------------------------------------------------------
// Récapitulatif d'une caisse relevée
// ---------------------------------------------------------------------------
let potCanvases = [];

function renderPotRecap() {
  const lp = lastPot;
  const t = POT_BY_ID[lp.type];
  const total = lp.results.reduce((s, r) => s + r.money, 0);
  $('pot-title').textContent = `Relevé : ${t.name}`;
  $('pot-items').hidden = !lp.drops?.length;
  $('pot-items').innerHTML = (lp.drops || []).map((d) => `<div class="cc-loot">${dropHtml(d)}</div>`).join('');
  $('pot-total').innerHTML = lp.results.length ? `Total : + ${fmtNum(total)} ${coinImg()}` : '';
  $('pot-list').innerHTML = lp.results.length
    ? lp.results.map((r, k) => {
      const badges = [r.newSpecies && 'Nouvelle entrée !', r.sizeRecord && 'Record de taille !', r.weightRecord && 'Record de poids !'].filter(Boolean);
      return `
        <div class="item pot-row ${r.abom ? 'abom' : ''}">
          <canvas class="px pot-canvas" width="100" height="72" data-k="${k}"></canvas>
          <div class="info"><b>${fishName(r.cr, r.abom)}</b>
            <small>${r.abom ? 'Abomination · ' : ''}${RARITIES[r.cr.tier].name} — ${fmtCm(r.size)} · ${fmtKg(r.weight)}</small>
            ${badges.length ? `<span class="eff">${badges.join(' · ')}</span>` : ''}</div>
          <div class="money">+ ${fmtNum(r.money)} ${coinImg()}</div>
        </div>`;
    }).join('')
    : `<p class="pot-empty">La caisse est vide… Laissez-la plus longtemps dans l'eau.</p>`;
  potCanvases = [...document.querySelectorAll('#pot-list canvas')].map((cv) => {
    const r = lp.results[+cv.dataset.k];
    return { cv, f: r.cr, abom: r.abom };
  });
  const baitOk = lp.bait === 'pain' || progress.baits[lp.bait] > 0;
  const btn = $('pot-redeploy');
  btn.disabled = !!progress.pots[lp.slot] || potsAvailable(lp.type) <= 0;
  btn.textContent = `Remettre à l'eau (${baitOk ? BAIT_BY_ID[lp.bait].name : 'Mie de pain'})`;
}

$('pot-redeploy').addEventListener('click', () => {
  const lp = lastPot;
  const baitId = lp.bait === 'pain' || progress.baits[lp.bait] > 0 ? lp.bait : 'pain';
  if (deployPot(lp.slot, lp.type, baitId)) closePanel();
});

// ---------------------------------------------------------------------------
// Succès (cosmétiques)
// ---------------------------------------------------------------------------
const fishSpecies = () => FISH.filter((f) => !f.unique);
const isCatch = (ev) => ev.type === 'catch';
const isFishCatch = (ev) => isCatch(ev) && ev.f.kind !== 'crust';

// secret : nom et description cachés tant que le succès n'est pas débloqué
const ACHIEVEMENTS = [
  { id: 'first_fish',   name: 'Première prise',            desc: 'Pêcher votre premier poisson.',                     test: (p) => p.stats.caught >= 1 },
  { id: 'fish_100',     name: 'Pêcheur aguerri',           desc: 'Pêcher 100 poissons.',                              test: (p) => p.stats.caught >= 100 },
  { id: 'fish_500',     name: 'Vieux loup de lac',         desc: 'Pêcher 500 poissons.',                              test: (p) => p.stats.caught >= 500 },
  { id: 'weight_rec',   name: 'Poids lourd',               desc: 'Battre un record de poids.',                        test: (p, ev) => isCatch(ev) && ev.weightRecord },
  { id: 'size_rec',     name: 'Mètre ruban',               desc: 'Battre un record de taille.',                       test: (p, ev) => isCatch(ev) && ev.sizeRecord },
  { id: 'perfect',      name: 'Sans bavure',               desc: 'Réussir une prise parfaite.',                       test: (p) => (p.stats.perfects || 0) >= 1 },
  { id: 'perfect_10',   name: 'Main de maître',            desc: 'Réussir 10 prises parfaites.',                      test: (p) => (p.stats.perfects || 0) >= 10 },
  { id: 'chest',        name: 'Trésor englouti',           desc: 'Ramener un coffre avec votre poisson.',             test: (p) => (p.stats.chests || 0) >= 1 },
  { id: 'legendary',    name: 'Légende du lac',            desc: 'Pêcher un poisson légendaire.',                     test: (p, ev) => isFishCatch(ev) && ev.f.tier === 4 },
  { id: 'shark',        name: 'Les dents du lac',          desc: 'Pêcher un requin.',                                 test: (p, ev) => isFishCatch(ev) && !!ev.f.shape?.shark },
  { id: 'lost_legend',  name: 'Il était grand comme ça',   desc: 'Laisser s\'échapper un poisson légendaire.',        test: (p, ev) => ev.type === 'escape' && ev.f.tier >= 4 },
  { id: 'early_10',     name: 'Trop pressé',               desc: 'Ferrer trop tôt 10 fois.',                          test: (p) => p.stats.early >= 10 },
  { id: 'all_fish',     name: 'Ichtyologue',               desc: 'Pêcher toutes les espèces de poissons.',            test: (p) => fishSpecies().every((f) => p.dex[f.id]) },
  { id: 'first_abom',   name: 'Ça a des yeux…',            desc: 'Pêcher votre première abomination.',                test: (p) => p.stats.aboms >= 1 },
  { id: 'all_aboms',    name: 'Collectionneur d\'horreurs', desc: 'Pêcher toutes les abominations de poissons.',      test: (p) => fishSpecies().every((f) => p.dex[`${f.id}:abom`]) },
  { id: 'cthulhu',      name: 'Ph\'nglui mglw\'nafh',      desc: 'Pêcher le Grand Ancien.', secret: true,             test: (p) => (p.stats.cthulhu || 0) >= 1 },
  { id: 'first_crust',  name: 'Pince-sans-rire',           desc: 'Attraper votre premier crustacé.',                  test: (p) => (p.stats.crusts || 0) >= 1 },
  { id: 'all_crusts',   name: 'Carcinologue',              desc: 'Attraper toutes les espèces de crustacés.',         test: (p) => CRUSTS.every((c) => p.dex[c.id]) },
  { id: 'crust_aboms',  name: 'Pinces de l\'au-delà',      desc: 'Attraper toutes les abominations de crustacés.',    test: (p) => CRUSTS.every((c) => p.dex[`${c.id}:abom`]) },
  { id: 'full_pot',     name: 'Caisse pleine',             desc: 'Relever une caisse remplie à ras bord.',            test: (p, ev) => ev.type === 'collect' && ev.full },
  { id: 'two_pots',     name: 'Double casier',             desc: 'Avoir deux caisses à l\'eau en même temps.',        test: (p) => p.pots.every(Boolean) },
  { id: 'first_pot',    name: 'Casier en main',            desc: 'Acheter votre première caisse.',                    test: (p) => Object.values(p.potsOwned).some((n) => n > 0) },
  { id: 'first_bait',   name: 'Ça grouille',               desc: 'Acheter votre premier appât.',                      test: (p, ev) => ev.type === 'buy' && ev.item === 'bait' },
  { id: 'best_bait',    name: 'Œil pour œil',              desc: 'Acheter l\'Œil des profondeurs.',                   test: (p, ev) => ev.type === 'buy' && ev.id === 'oeil' },
  { id: 'first_rod',    name: 'Nouvelle canne',            desc: 'Acheter votre première canne à pêche.',             test: (p) => p.rods.length >= 2 },
  { id: 'best_rod',     name: 'Runes et ruines',           desc: 'Acheter la canne runique.',                         test: (p) => p.rods.includes('runique') },
  { id: 'rich',         name: 'Bas de laine',              desc: 'Avoir 10 000 pièces en poche.',                     test: (p) => p.money >= 10000 },
  { id: 'eyes_open',    name: 'Ils ouvrent les yeux',      desc: 'Corrompre le lac à moitié.', secret: true,          test: () => corruption() >= 0.5 },
  { id: 'eyes_all',     name: 'Le lac vous regarde',       desc: 'Corrompre totalement le lac.', secret: true,        test: () => corruption() >= 1 },
  { id: 'complete',     name: 'Carnet complet',            desc: 'Remplir toutes les pages du carnet.',               test: (p) => Object.keys(p.dex).length >= dexTotal() },
  { id: 'first_item',   name: 'Trouvaille',                desc: 'Trouver votre premier objet.',                      test: (p) => (p.stats.itemsFound || 0) >= 1 },
  { id: 'epic_item',    name: 'Belle prise',               desc: 'Trouver un objet épique.',                          test: (p, ev) => ev.type === 'item' && ev.item.tier >= 3 },
  { id: 'legend_item',  name: 'Relique des profondeurs',   desc: 'Trouver un objet légendaire.',                      test: (p, ev) => ev.type === 'item' && ev.item.tier >= 4 },
  { id: 'full_gear',    name: 'Paré pour la pêche',        desc: 'Porter un objet dans chacun des 5 emplacements.',   test: () => SLOTS.every((s) => equippedItem(s.id)) },
  { id: 'sell_item',    name: 'Brocanteur',                desc: 'Vendre un objet.',                                  test: (p) => (p.stats.itemsSold || 0) >= 1 },
  { id: 'day_7',        name: 'Une semaine au lac',        desc: 'Atteindre le 7e jour.',                             test: (p) => dayOf(p.clock) >= 7 },
  { id: 'day_30',       name: 'Ermite du lac',             desc: 'Atteindre le 30e jour.',                            test: (p) => dayOf(p.clock) >= 30 },
  { id: 'night_fish',   name: 'Pêcheur nocturne',          desc: 'Pêcher un poisson en pleine nuit.',                 test: (p, ev) => isFishCatch(ev) && isNight() },
  { id: 'rain_legend',  name: 'Chanter sous la pluie',     desc: 'Pêcher un poisson légendaire sous la pluie.',       test: (p, ev) => isFishCatch(ev) && ev.f.tier === 4 && weather().id === 'pluie' },
  { id: 'storm_abom',   name: "Enfant de l'orage",         desc: "Pêcher une abomination pendant l'orage.",            test: (p, ev) => isCatch(ev) && ev.abom && weather().id === 'orage' },
  { id: 'rainbow',      name: "Au pied de l'arc-en-ciel",  desc: 'Voir un arc-en-ciel sur le lac.',                   test: () => weather().id === 'arcenciel' },
];

const toastQueue = [];
let toastBusy = false;

function checkAchievements(ev = {}) {
  if (!inGame || admin.on) return;   // pas de succès en mode admin
  let changed = false;
  for (const a of ACHIEVEMENTS) {
    if (progress.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.test(progress, ev); } catch { ok = false; }
    if (ok) {
      progress.achievements[a.id] = Date.now();
      toastQueue.push({ icon: ICONS.trophy, label: 'Succès débloqué !', title: a.name, sound: () => Sound.achievement() });
      changed = true;
    }
  }
  if (changed) {
    writeSave();
    if (openPanelName === 'achievements') renderAchievements();
    nextToast();
  }
}

// Notifications : succès, météo, jour/nuit. t = { icon, label, title, sub?, sound? }
function pushToast(t) {
  toastQueue.push(t);
  nextToast();
}

function nextToast() {
  if (toastBusy || !toastQueue.length) return;
  toastBusy = true;
  const t = toastQueue.shift();
  const el = document.createElement('div');
  el.className = 'toast box';
  el.innerHTML = `<img src="${t.icon}" alt=""><div><small>${t.label}</small>${t.title}${t.sub ? `<span class="toast-sub">${t.sub}</span>` : ''}</div>`;
  $('toasts').appendChild(el);
  t.sound?.();
  setTimeout(() => { toastBusy = false; nextToast(); }, 1400);
  setTimeout(() => el.remove(), 4200);
}

function renderAchievements() {
  const done = ACHIEVEMENTS.filter((a) => progress.achievements[a.id]).length;
  $('ach-count').textContent = `${done} / ${ACHIEVEMENTS.length}`;
  $('ach-list').innerHTML = ACHIEVEMENTS.map((a) => {
    const at = progress.achievements[a.id];
    const hidden = a.secret && !at;
    return `
      <div class="slot ach ${at ? 'done' : 'locked'}">
        <img src="${at ? ICONS.trophy : ICONS.trophyLocked}" alt="">
        <div class="info">
          <b>${hidden ? '???' : a.name}</b>
          <small>${hidden ? 'Succès secret' : a.desc}</small>
          ${at ? `<span class="ach-date">Débloqué le ${new Date(at).toLocaleDateString('fr-FR')}</span>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// Export / import de la sauvegarde (fichier .json)
// ---------------------------------------------------------------------------
let pendingImport = null;
const saveMsg = (txt) => { $('save-msg').textContent = txt; };

function saveSummary(s) {
  const ach = Object.keys(s.achievements || {}).length;
  return `${fmtNum(s.stats.caught)} poisson(s) · ${fmtNum(s.money)} pièces · carnet ${Object.keys(s.dex).length} / ${dexTotal()} · ${ach} succès`;
}

$('save-export').addEventListener('click', () => {
  if (inGame) writeSave();
  const data = loadSave();
  if (!data) { saveMsg('Aucune partie à exporter pour le moment.'); return; }
  const file = { game: 'lac-tranquille', format: 1, version: GAME_VERSION, exportedAt: new Date().toISOString(), save: data };
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `lac-tranquille-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  saveMsg(`Sauvegarde exportée (${a.download}) — ${saveSummary(data)}.`);
  Sound.click();
});

$('save-import').addEventListener('click', () => $('save-file').click());

$('save-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const json = JSON.parse(await file.text());
    const data = migrate(json?.game === 'lac-tranquille' ? json.save : json);
    if (!data || data.v !== 2) throw new Error('format');
    pendingImport = data;
    $('save-summary').textContent = `Sauvegarde trouvée : ${saveSummary(data)}. Elle remplacera la partie actuelle.`;
    $('save-confirm').hidden = false;
    saveMsg('');
  } catch {
    pendingImport = null;
    $('save-confirm').hidden = true;
    saveMsg("Ce fichier n'est pas une sauvegarde de Lac Tranquille.");
  }
});

$('save-cancel').addEventListener('click', () => {
  pendingImport = null;
  $('save-confirm').hidden = true;
  saveMsg('Import annulé.');
});

$('save-apply').addEventListener('click', () => {
  if (!pendingImport) return;
  progress = pendingImport;
  pendingImport = null;
  writeSave();
  $('save-confirm').hidden = true;
  if (inGame) enterGame(); else refreshMenu();
  saveMsg('Sauvegarde importée !');
  Sound.chestGet();
});

// ---------------------------------------------------------------------------
// Mode admin
// ---------------------------------------------------------------------------
function saveAdmin() {
  try { localStorage.setItem(ADMIN_KEY, JSON.stringify({ on: admin.on })); } catch { /* idem */ }
}

function syncAdmin() {
  $('opt-admin').checked = admin.on;
  $('admin-tools').hidden = !admin.on;
  const sel = $('admin-fish');
  if (!sel.options.length) {
    sel.innerHTML = `<option value="random">Aléatoire (normal)</option>
      <optgroup label="Poissons">${FISH.map((f) => `<option value="${f.id}">${f.name}</option>`).join('')}</optgroup>
      <optgroup label="Abominations">${fishSpecies().map((f) => `<option value="${f.id}:abom">${f.abomName}</option>`).join('')}</optgroup>`;
  }
  sel.value = admin.forced;
  const ws = $('admin-weather');
  if (!ws.options.length) ws.innerHTML = WEATHERS.map((w) => `<option value="${w.id}">${w.name}</option>`).join('');
  ws.value = weather().id;
  for (const id of ['admin-weather', 'admin-hour', 'admin-night', 'admin-day', 'admin-item']) $(id).disabled = !inGame;
  const c = corruption();
  $('admin-corrupt').value = Math.round(c * 100);
  $('admin-corrupt-val').textContent = `${Math.round(c * 100)} %`;
  for (const id of ['admin-dex', 'admin-money', 'admin-pots']) $(id).disabled = !inGame;
  $('admin-hint').textContent = inGame
    ? 'Les succès sont désactivés tant que le mode admin est actif.'
    : 'Lancez une partie pour utiliser les outils du carnet, des pièces et des caisses.';
  updateHud();
}

$('opt-admin').addEventListener('change', (e) => {
  admin.on = e.target.checked;
  if (!admin.on) { admin.forced = 'random'; admin.corruption = null; }
  saveAdmin();
  syncAdmin();
});
$('admin-fish').addEventListener('change', (e) => { admin.forced = e.target.value; });
$('admin-corrupt').addEventListener('input', (e) => {
  admin.corruption = e.target.value / 100;
  $('admin-corrupt-val').textContent = `${e.target.value} %`;
});
$('admin-corrupt-reset').addEventListener('click', () => { admin.corruption = null; syncAdmin(); });
$('admin-dex').addEventListener('click', () => {
  for (const f of [...FISH, ...CRUSTS]) {
    for (const abom of f.unique ? [false] : [false, true]) {
      const k = dexKey(f, abom);
      if (progress.dex[k]) continue;
      const c = rollCatch(f, abom);
      progress.dex[k] = { count: 1, maxSize: c.size, maxWeight: c.weight };
    }
  }
  writeSave();
  Sound.chestGet();
  $('admin-hint').textContent = 'Carnet entièrement débloqué.';
});
$('admin-money').addEventListener('click', () => {
  progress.money += 10000;
  writeSave();
  updateHud();
  Sound.buy();
});
$('admin-weather').addEventListener('change', (e) => {
  setWeather(e.target.value);
  writeSave();
});
// Avance l'horloge (la météo de jour impossible la nuit est corrigée à l'image suivante)
function adminSkipTo(targetHour) {
  const h = hourOf(progress.clock);
  const delta = targetHour === null ? 1 : ((targetHour - h + 24) % 24) || 24;
  progress.clock += (delta / 24) * DAY_LEN;
  if (progress.weather) progress.weather.until = Math.max(progress.weather.until, progress.clock + 60);
  invalidateMods();
  updateWorldHud(true);
  writeSave();
  $('admin-hint').textContent = `Jour ${dayOf(progress.clock)}, ${fmtHour(progress.clock)}.`;
}
$('admin-hour').addEventListener('click', () => adminSkipTo(null));
$('admin-night').addEventListener('click', () => adminSkipTo(22));
$('admin-day').addEventListener('click', () => adminSkipTo(8));
$('admin-item').addEventListener('click', () => {
  const d = addItem(rollItem(4, true));
  const it = itemDef(d.inst);
  writeSave();
  updateHud();
  Sound.itemFound(it.tier);
  $('admin-hint').textContent = d.sold ? `Inventaire plein : ${it.name} vendu.` : `Objet ajouté : ${it.name} (${RARITIES[it.tier].name}).`;
});
$('admin-pots').addEventListener('click', () => {
  let n = 0;
  for (const p of progress.pots) {
    if (!p) continue;
    while (!potFull(p)) { p.contents.push(rollCrust(p)); n++; }
  }
  writeSave();
  $('admin-hint').textContent = n ? `${n} crustacé(s) ajouté(s) dans les caisses.` : 'Aucune caisse à remplir (mettez-en une à l\'eau).';
});

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
function syncOptions() {
  const s = Sound.settings;
  $('opt-music').value = Math.round(s.music * 100);
  $('opt-sfx').value = Math.round(s.sfx * 100);
  $('opt-music-val').textContent = `${Math.round(s.music * 100)} %`;
  $('opt-sfx-val').textContent = `${Math.round(s.sfx * 100)} %`;
  $('opt-mute').checked = s.muted;
  $('opt-fullscreen').textContent = document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran';
  syncAdmin();
}

$('opt-music').addEventListener('input', (e) => { Sound.set('music', e.target.value / 100); syncOptions(); });
$('opt-sfx').addEventListener('input', (e) => { Sound.set('sfx', e.target.value / 100); syncOptions(); });
$('opt-sfx').addEventListener('change', () => Sound.bell(false));
$('opt-mute').addEventListener('change', (e) => { Sound.set('muted', e.target.checked); syncOptions(); });
$('opt-fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
});
document.addEventListener('fullscreenchange', syncOptions);

// ===========================================================================
// Entrées
// ===========================================================================
// Le navigateur n'autorise le son qu'après une interaction de l'utilisateur.
window.addEventListener('pointerdown', () => Sound.init(), true);
window.addEventListener('keydown', () => Sound.init(), true);

// Clic maintenu (ou Espace) = la barre verte monte pendant la remontée
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  if (inGame && (game.state === 'idle' || game.state === 'waiting')) {
    const i = potAt(e.clientX, e.clientY);
    if (i >= 0) {
      if (progress.pots[i].contents.length) collectPot(i);
      else openPanel('crates');
      return;
    }
  }
  holding = true;
  onAction();
});
for (const ev of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(ev, () => { holding = false; });
window.addEventListener('keyup', (e) => { if (e.code === 'Space') holding = false; });

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (openPanelName) closePanel();
    else if (inGame) showMenu();
    return;
  }
  if (e.code === 'KeyO') {
    if (openPanelName === 'options') closePanel(); else openPanel('options');
    return;
  }
  if (!inGame) return;
  if ((e.code === 'Enter' || e.code === 'NumpadEnter') && game.state === 'caught' && !$('cc-continue').disabled) {
    e.preventDefault();
    continueAfterCatch();
    return;
  }
  if (e.code === 'Space' && !openPanelName) {
    e.preventDefault();
    if (e.repeat) return;
    holding = true;
    onAction();
    return;
  }
  if (openPanelName === 'book') {
    if (e.code === 'ArrowLeft') turnTo(spread - 1);
    if (e.code === 'ArrowRight') turnTo(spread + 1);
  }
  if (e.code === 'KeyI') {
    if (openPanelName === 'sheet' && sheetTab === 'inv') closePanel();
    else { sheetTab = 'inv'; if (openPanelName === 'sheet') renderSheet(); else openPanel('sheet'); }
    return;
  }
  const target = { KeyC: 'book', KeyB: 'shop', KeyP: 'sheet', KeyK: 'crates', KeyT: 'achievements' }[e.code];
  if (target) {
    if (openPanelName === target) closePanel();
    else openPanel(target);
  }
});

window.addEventListener('beforeunload', () => { if (inGame) writeSave(); });

// Toute l'interface est en "em" : on ajuste la taille de base à celle de l'écran.
function fitUi() {
  const w = $('game').getBoundingClientRect().width;
  $('game').style.fontSize = `${Math.max(9, w / 80)}px`;
}
window.addEventListener('resize', fitUi);

// ===========================================================================
// Démarrage & boucle
// ===========================================================================
$('game-version').textContent = GAME_VERSION;
buildIcons();
document.querySelectorAll('img[data-icon]').forEach((img) => { img.src = ICONS[img.dataset.icon]; });
buildScene();
buildGaugeIcons();
fitUi();
refreshMenu();

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  render();
  if (openPanelName === 'book') for (const b of bookCanvases) renderFishCanvas(b.cv, b.f, { abom: b.abom, silhouette: !b.known, t: time });
  if (openPanelName === 'pot') for (const b of potCanvases) renderFishCanvas(b.cv, b.f, { abom: b.abom, t: time });
  if (inGame && game.state === 'caught' && game.catch) renderFishCanvas($('cc-fish'), game.catch.f, { abom: game.catch.abom, t: time });
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
