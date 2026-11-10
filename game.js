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
const GAME_VERSION = '1.5.0';
// Nouveautés affichées sur le menu de départ (les points importants ; le détail est dans CHANGELOG.md)
const WHATS_NEW = [
  'Nouveau classement en ligne, instantané et mis à jour à chaque sauvegarde',
  'Bouton « Sauver » dans la barre d\'icônes (touche S)',
  'Sauvegarde en ligne activée par défaut : votre partie vous suit partout',
  'Tutoriel : Papi Émile vous réapprend à pêcher',
  'Astuces fléchées pour la sauvegarde',
];
// Écran tactile principal (téléphone, tablette) : consignes « Touchez » au lieu de « Cliquez »
const TOUCH = !!window.matchMedia?.('(pointer: coarse)').matches;
const CLICK = TOUCH ? 'Touchez' : 'Cliquez';
const HOLD = TOUCH ? 'Gardez le doigt appuyé' : 'Maintenez le clic (ou Espace)';

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
  { id: 'titane',  name: 'Canne télescopique en titane', price: 12000, speed: 0.34, window: 0.4,  vigor: 0.48, cthulhu: 7,  color: '#b8c4cc', desc: "Elle se déplie d'un geste. Ultra-légère, increvable." },
  { id: 'abyssale', name: 'Canne abyssale',         price: 22000, speed: 0.3,  window: 0.45, vigor: 0.44, cthulhu: 8,  color: '#1e3a6a', desc: "Conçue pour pêcher par trois cents mètres de fond. Le lac n'est pas si profond… normalement." },
  { id: 'capitaine', name: 'Canne du capitaine',    price: 38000, speed: 0.27, window: 0.5,  vigor: 0.4,  cthulhu: 10, color: '#c8962e', desc: "Manche en ivoire, anneaux en laiton. Une canne qui a vu tous les océans." },
  { id: 'corail',  name: 'Canne en corail noir',    price: 60000, speed: 0.24, window: 0.56, vigor: 0.36, cthulhu: 12, color: '#3a1a2a', desc: "Taillée dans un corail qui ne pousse plus nulle part. Elle est tiède au toucher." },
  { id: 'stellaire', name: 'Canne stellaire',       price: 90000, speed: 0.21, window: 0.62, vigor: 0.32, cthulhu: 15, color: '#e8e0ff', desc: "Son fil brille comme une étoile filante. Les poissons la suivent du regard." },
  { id: 'rlyeh',   name: "Canne de R'lyeh",         price: 140000, speed: 0.18, window: 0.7, vigor: 0.28, cthulhu: 22, color: '#3fd08a', desc: "Elle n'a pas été fabriquée. Elle a été trouvée, plantée dans une ville engloutie." },
];
RODS.forEach((r, i) => { r.tier = i + 1; });
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
  { id: 'acier',    name: 'Casier en acier',        price: 9000,  capacity: 12, speed: 1.45, rare: 0.5, abom: 0,    color: '#8a929c', desc: "Inoxydable, riveté, quasiment indestructible." },
  { id: 'nasse',    name: 'Nasse des grands fonds', price: 15000, capacity: 10, speed: 1.4,  rare: 1.3, abom: 0.04, color: '#4a6a5a', desc: "Un grand filet tendu sur une armature : il descend là où la lumière n'arrive plus." },
  { id: 'frigo',    name: 'Caisse frigorifique',    price: 25000, capacity: 16, speed: 1.6,  rare: 0.8, abom: 0,    color: '#e8eef2', desc: "Isolée et réfrigérée : les prises restent fraîches, et nombreuses." },
  { id: 'royale',   name: 'Cage à homards royale',  price: 40000, capacity: 12, speed: 1.6,  rare: 2.0, abom: 0.05, color: '#8a2a2a', desc: "Cerclée d'or. Les crustacés les plus nobles s'y sentent chez eux." },
  { id: 'auto',     name: 'Caisse automatique',     price: 65000, capacity: 20, speed: 1.9,  rare: 1.4, abom: 0.02, color: '#3a4250', desc: "Moteur, appât automatique et voyant lumineux. La technologie au service du crabe." },
  { id: 'reliquaire', name: 'Reliquaire des abysses', price: 100000, capacity: 14, speed: 1.8, rare: 2.6, abom: 0.15, color: '#2a1a3a', desc: "Un coffre ancien sorti d'une épave. Il s'ouvre tout seul quand il est plein." },
];
POTS.forEach((p, i) => { p.tier = i + 1; });
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
// n'accepte que des nombres finis : une valeur corrompue s'affiche 0 au lieu d'être injectée dans le DOM
const fmtNum = (n) => (typeof n === 'number' && Number.isFinite(n) ? n : 0).toLocaleString('fr-FR');
const fmtKg = (kg) => (kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg.toFixed(2).replace('.', ',')} kg`);
const fmtCm = (cm) => `${cm.toFixed(1).replace('.', ',')} cm`;
// Pourcentage lisible, avec plus de décimales pour les toutes petites chances (ex. 0,01 %)
function fmtPct(x) {
  const p = x * 100;
  const digits = p === 0 || p >= 1 ? 1 : p >= 0.1 ? 2 : 3;
  return `${p.toFixed(digits).replace(/\.?0+$/, '').replace('.', ',')} %`;
}
const fishName = (f, abom) => (abom ? f.abomName : f.name);
// échappe aussi ` et = : protège même un attribut qui serait écrit sans guillemets
const escapeHtml = (s) => String(s).replace(/[&<>"'`=]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;' }[ch]));
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
    look: null,             // apparence du personnage (voir character.js), nom compris
    boat: { level: 1, parts: [] },   // niveau du bateau et pièces réunies pour les niveaux suivants
    items: [],              // inventaire : { uid, id }
    equip: {},              // { [emplacement]: uid }
    itemSeq: 0,
    clock: CLOCK_START,     // secondes de jeu depuis le début de la partie (1 jour = DAY_LEN)
    weather: null,          // { id, until } (until : en secondes de jeu)
    // malédictions (après la première abomination) : offres du jour, malédiction acceptée, choix fait
    curse: { day: 0, offers: [], active: null, decided: false },
    // village : prises gardées dans la bourriche (vendues au poissonnier), argent placé à la banque,
    // cours du poisson (historique quotidien), stock du jour du bric-à-brac, habitants déjà rencontrés
    catches: [],            // { uid, id, abom, w (kg), v (valeur de base en pièces) }
    bank: 0,
    market: { day: 0, index: MARKET.base, history: [] },
    bric: { day: 0, stock: [], sold: [] },
    met: {},
    tuto: { fish: false, save: false },   // tutoriels terminés (pêche avec grand-père, sauvegarde)
    stats: {
      casts: 0, caught: 0, missed: 0, early: 0, aboms: 0, perfects: 0, chests: 0,
      crusts: 0, potsCollected: 0, cthulhu: 0, earned: 0, spent: 0, playTime: 0, best: null,
      itemsFound: 0, itemsSold: 0, itemsEarned: 0, curses: 0,
      fishSold: 0, released: 0, interest: 0,
    },
  };
}

// --- Validation d'une sauvegarde (localStorage ou fichier importé) : donnée NON FIABLE.
// Rien n'est recopié en bloc : chaque champ est relu, vérifié (type, valeur connue) et borné,
// sur le modèle de validLook(). Une valeur invalide est remplacée par la valeur par défaut.
const SAVE_LIM = { money: 1e10, count: 1e7, bait: 1e5, pots: 50, time: 1e9 };
const SAVE_FILE_MAX = 1024 * 1024;              // taille maximale d'un fichier de sauvegarde importé (1 Mo)
const KEEPNET_SAVE_MAX = 200;                   // borne de lecture de la bourriche (cale maximale : 100)
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const vObj = (x) => (isObj(x) ? x : {});
const vArr = (x) => (Array.isArray(x) ? x : []);
const vNum = (x, max, min = 0) => (typeof x === 'number' && Number.isFinite(x) ? clamp(x, min, max) : min);
const vInt = (x, max, min = 0) => Math.floor(vNum(x, max, min));
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function validPot(x) {
  if (!isObj(x)) return null;
  const t = POT_BY_ID[x.type];
  if (!t || !hasOwn(POT_BY_ID, x.type)) return null;
  const now = Date.now();
  return {
    type: t.id,
    bait: hasOwn(BAIT_BY_ID, x.bait) ? x.bait : 'pain',
    placedAt: vInt(x.placedAt, now),
    nextAt: vInt(x.nextAt, now + 86400000),
    contents: vArr(x.contents).slice(0, t.capacity).map((c) => {
      if (!isObj(c) || !hasOwn(CRUST_BY_ID, c.id)) return null;
      const cr = CRUST_BY_ID[c.id];
      return {
        id: cr.id, abom: c.abom === true,
        size: vNum(c.size, cr.cm[1] * 3), weight: vNum(c.weight, cr.kg[1] * 3), money: vInt(c.money, cr.value * 50),
      };
    }).filter(Boolean),
  };
}

// --- Compatibilité des sauvegardes entre versions
// Règle : ne jamais renommer ni supprimer l'id d'un contenu (poisson, canne, objet, pièce de bateau…)
// sans l'ajouter ici (ancien id → nouvel id). Sinon, l'élément disparaît des sauvegardes existantes.
const SAVE_RENAMES = {};
const SAVE_SKIP_KEYS = new Set(['__proto__', 'constructor', 'prototype', 'look']);   // look : le nom est libre
function renameId(x) {
  if (typeof x !== 'string') return x;
  const [id, ...rest] = x.split(':');                     // clés du carnet : « id » ou « id:abom »
  return hasOwn(SAVE_RENAMES, id) ? [SAVE_RENAMES[id], ...rest].join(':') : x;
}
// Applique SAVE_RENAMES aux valeurs et aux clés d'une sauvegarde brute (profondeur bornée)
function applyRenames(x, depth = 0) {
  if (depth > 6) return x;
  if (Array.isArray(x)) return x.map((v) => applyRenames(v, depth + 1));
  if (!isObj(x)) return renameId(x);
  const out = {};
  for (const k of Object.keys(x)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    out[renameId(k)] = SAVE_SKIP_KEYS.has(k) ? x[k] : applyRenames(x[k], depth + 1);
  }
  return out;
}

function validProgress(raw) {
  if (!isObj(raw)) return null;
  const p = emptyProgress();
  if (raw.v !== 2) {                            // ancienne sauvegarde v1 : seul le compteur est repris
    if (!hasOwn(raw, 'count')) return null;     // un JSON quelconque n'est pas une sauvegarde
    p.stats.caught = vInt(raw.count, SAVE_LIM.count);
    p.stats.casts = p.stats.caught;             // sinon « plus de prises que de lancers » au classement
    return p;
  }
  let s = raw;
  try { if (Object.keys(SAVE_RENAMES).length) s = applyRenames(raw); } catch { s = raw; }
  // Chaque section est relue indépendamment : une section illisible (format d'une autre version,
  // donnée abîmée) garde sa valeur par défaut au lieu de faire perdre toute la partie.
  const step = (name, fn) => {
    try { fn(); } catch (e) { console.warn(`Sauvegarde : section « ${name} » ignorée`, e); }
  };
  step('argent', () => { p.money = vInt(s.money, SAVE_LIM.money); });
  step('cannes et appâts', () => {
  // cannes : uniquement des cannes connues, sans doublon, la canne en bambou toujours présente
  p.rods = [...new Set(vArr(s.rods).filter((id) => hasOwn(ROD_BY_ID, id)))];
  if (!p.rods.includes('bambou')) p.rods.unshift('bambou');
  p.rod = p.rods.includes(s.rod) ? s.rod : 'bambou';
  // appâts : quantités entières, uniquement pour les appâts vendus en paquets
  const baits = vObj(s.baits);
  for (const b of BAITS) {
    const n = b.pack && hasOwn(baits, b.id) ? vInt(baits[b.id], SAVE_LIM.bait) : 0;
    if (n > 0) p.baits[b.id] = n;
  }
  p.bait = s.bait === 'pain' || p.baits[s.bait] > 0 ? s.bait : 'pain';
  });
  // carnet : uniquement les clés connues
  step('carnet', () => {
  const dex = vObj(s.dex);
  for (const f of [...FISH, ...CRUSTS]) {
    for (const ab of f.unique ? [false] : [false, true]) {
      const k = dexKey(f, ab);
      if (!hasOwn(dex, k)) continue;
      const e = vObj(dex[k]);
      p.dex[k] = {
        count: Math.max(1, vInt(e.count, SAVE_LIM.count)),
        maxSize: vNum(e.maxSize, f.cm[1] * 3), maxWeight: vNum(e.maxWeight, f.kg[1] * 3),
      };
    }
  }
  });
  step('casiers', () => {
    const owned = vObj(s.potsOwned);
    for (const t of POTS) {
      const n = hasOwn(owned, t.id) ? vInt(owned[t.id], SAVE_LIM.pots) : 0;
      if (n > 0) p.potsOwned[t.id] = n;
    }
    p.pots = [0, 1].map((i) => validPot(vArr(s.pots)[i]));
  });
  step('succès', () => {
    const ach = vObj(s.achievements);
    for (const a of ACHIEVEMENTS) {
      if (hasOwn(ach, a.id) && vNum(ach[a.id], 1e14) > 0) p.achievements[a.id] = ach[a.id];
    }
  });
  // inventaire : objets connus, identifiants entiers positifs et uniques
  step('inventaire', () => {
  const seen = new Set();
  p.items = vArr(s.items).slice(0, ITEM_CAP)
    .filter((it) => isObj(it) && hasOwn(ITEM_BY_ID, it.id) && Number.isSafeInteger(it.uid) && it.uid > 0
      && it.uid < Number.MAX_SAFE_INTEGER / 2 && !seen.has(it.uid) && seen.add(it.uid))
    .map((it) => ({ uid: it.uid, id: it.id }));
  p.itemSeq = p.items.reduce((m, it) => Math.max(m, it.uid), vInt(s.itemSeq, Number.MAX_SAFE_INTEGER / 2));
  // équipement : doit pointer vers un objet de l'inventaire, du bon type, porté une seule fois ;
  // un même accessoire ne peut pas occuper deux emplacements
  const equip = vObj(s.equip);
  const usedUids = new Set();
  const usedAcc = new Set();
  for (const sl of SLOTS) {
    const it = p.items.find((x) => x.uid === equip[sl.id]);
    if (!it || ITEM_BY_ID[it.id].slot !== sl.kind || usedUids.has(it.uid)) continue;
    if (sl.kind === 'acc') { if (usedAcc.has(it.id)) continue; usedAcc.add(it.id); }
    usedUids.add(it.uid);
    p.equip[sl.id] = it.uid;
  }
  });
  step('bateau', () => {
    const boat = vObj(s.boat);
    const allParts = BOATS.flatMap((b) => [...(b.parts || []), ...(b.special ? [b.special] : [])].map((x) => x.id));
    p.boat = {
      level: vInt(boat.level, BOAT_MAX, 1),
      parts: [...new Set(vArr(boat.parts).filter((id) => allParts.includes(id)))],
    };
  });
  step('personnage', () => { p.look = s.look ? validLook(s.look) : null; });   // sinon : créé à la reprise
  step('horloge et météo', () => {
    p.clock = typeof s.clock === 'number' && Number.isFinite(s.clock) ? vNum(s.clock, SAVE_LIM.time) : CLOCK_START;
    const w = vObj(s.weather);
    p.weather = hasOwn(WEATHER_BY_ID, w.id) ? { id: w.id, until: vNum(w.until, SAVE_LIM.time) } : null;
  });
  step('malédiction', () => {
  const cu = vObj(s.curse);
  p.curse = {
    day: vInt(cu.day, SAVE_LIM.count),
    offers: [...new Set(vArr(cu.offers).filter((id) => hasOwn(CURSE_BY_ID, id)))].slice(0, CURSE_OFFERS),
    active: hasOwn(CURSE_BY_ID, cu.active) ? cu.active : null,
    decided: cu.decided === true,
  };
  });
  // bourriche : prises connues (le Grand Ancien n'a pas de version abomination), poids et valeur bornés
  step('bourriche', () => {
  const seenCatch = new Set();
  p.catches = vArr(s.catches).slice(0, KEEPNET_SAVE_MAX).map((c) => {
    if (!isObj(c) || !Number.isSafeInteger(c.uid) || c.uid <= 0 || seenCatch.has(c.uid)) return null;
    const f = hasOwn(FISH_BY_ID, c.id) ? FISH_BY_ID[c.id] : hasOwn(CRUST_BY_ID, c.id) ? CRUST_BY_ID[c.id] : null;
    if (!f) return null;
    seenCatch.add(c.uid);
    return { uid: c.uid, id: f.id, abom: c.abom === true && !f.unique, w: vNum(c.w, f.kg[1] * 3), v: vInt(c.v, f.value * 100) };
  }).filter(Boolean);
  p.itemSeq = p.catches.reduce((m, c) => Math.max(m, c.uid), p.itemSeq);
  });
  step('village', () => {
  p.bank = vInt(s.bank, SAVE_LIM.money);
  const mk = vObj(s.market);
  p.market = {
    day: vInt(mk.day, SAVE_LIM.count),
    index: typeof mk.index === 'number' && Number.isFinite(mk.index) ? clamp(mk.index, MARKET.min, MARKET.max) : MARKET.base,
    history: vArr(mk.history).slice(-MARKET.history).map((x) => vNum(x, MARKET.max, MARKET.min)),
  };
  const br = vObj(s.bric);
  const stock = vArr(br.stock).filter((id) => hasOwn(ITEM_BY_ID, id)).slice(0, 16);
  p.bric = { day: vInt(br.day, SAVE_LIM.count), stock, sold: stock.map((_, i) => vArr(br.sold)[i] === true) };
  const met = vObj(s.met);
  for (const n of NPCS) if (met[n.id] === true) p.met[n.id] = true;
  });
  // statistiques : uniquement les compteurs connus, nombres finis et bornés
  step('statistiques', () => {
  const st = vObj(s.stats);
  for (const k of Object.keys(p.stats)) {
    if (k !== 'best' && hasOwn(st, k)) p.stats[k] = vNum(st[k], SAVE_LIM.money);
  }
  const best = vObj(st.best);
  p.stats.best = hasOwn(FISH_BY_ID, best.id) || hasOwn(CRUST_BY_ID, best.id)
    ? { id: best.id, abom: best.abom === true, weight: vNum(best.weight, 1e5), size: vNum(best.size, 1e5) }
    : null;
  });
  // tutoriels : une partie déjà commencée (au moins un poisson) n'a pas besoin de la pêche d'entraînement
  step('tutoriels', () => {
    const tu = vObj(s.tuto);
    p.tuto = { fish: tu.fish === true || p.stats.caught > 0, save: tu.save === true };
  });
  return p;
}

// --- Copie de sécurité : la sauvegarde brute est recopiée telle quelle (jamais interprétée ici)
// avant tout ce qui pourrait la perdre : changement de version du jeu, sauvegarde illisible,
// nouvelle partie. Restaurable depuis les options (validée comme un import).
const SAVE_BACKUP_KEY = 'lacTranquille.save.backup';
const SAVE_BACKUP_MAX = SAVE_FILE_MAX;
function backupSave(raw, reason) {
  if (typeof raw !== 'string' || !raw || raw.length > SAVE_BACKUP_MAX) return;
  try {
    localStorage.setItem(SAVE_BACKUP_KEY, JSON.stringify({ at: Date.now(), reason, from: savedVersion(raw), save: raw }));
  } catch { /* stockage indisponible ou plein */ }
}
function savedVersion(raw) {
  try {
    const gv = JSON.parse(raw)?.gv;
    return typeof gv === 'string' && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(gv) ? gv : null;
  } catch { return null; }
}
function readBackup() {
  try {
    const b = JSON.parse(localStorage.getItem(SAVE_BACKUP_KEY));
    if (!isObj(b) || typeof b.save !== 'string') return null;
    const save = validProgress(JSON.parse(b.save));
    if (!save) return null;
    const from = typeof b.from === 'string' && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(b.from) ? b.from : null;
    return { save, at: vInt(b.at, 1e14), from };
  } catch { return null; }
}
function readRawSave() {
  try { return localStorage.getItem(SAVE_KEY); } catch { return null; }
}

function loadSave() {
  const raw = readRawSave();
  if (!raw) return null;
  let save = null;
  try { save = validProgress(JSON.parse(raw)); } catch { save = null; }
  // sauvegarde illisible, ou écrite par une autre version : copie de l'original avant toute écriture
  if (!save) backupSave(raw, 'illisible');
  else if (savedVersion(raw) !== GAME_VERSION && readBackupRaw() !== raw) backupSave(raw, 'version');
  return save;
}
function readBackupRaw() {
  try { return JSON.parse(localStorage.getItem(SAVE_BACKUP_KEY))?.save ?? null; } catch { return null; }
}
function writeSave(localOnly = false) {
  // gv : version du jeu qui a écrit la sauvegarde (sert à la copie de sécurité au changement de version)
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...progress, gv: GAME_VERSION })); } catch { /* stockage indisponible */ }
  if (inGame && !localOnly) cloudAuto();
}
function clearSave() {
  backupSave(readRawSave(), 'nouvelle partie');
  try { localStorage.removeItem(SAVE_KEY); } catch { /* idem */ }
  cloudUnlink();                                   // le lien en ligne appartenait à l'ancienne partie
}

// --- Sauvegarde en ligne (Worker Cloudflare, voir server/cloud-save/) : configuration et état.
// url vide = fonction masquée. L'origine doit aussi figurer dans connect-src de la CSP (index.html).
const CLOUD_SAVE = { url: 'https://lac-tranquille-saves.cloudflare-blissful748.workers.dev' };
const CLOUD_LINK_KEY = 'lacTranquille.cloud';      // { name, key, rev, at } : lien de cet appareil
const CLOUD_KEY_RE = /^LAC(-[0-9A-HJKMNP-TV-Z]{5}){4}$/;
const CLOUD_AUTO_MS = 5 * 60 * 1000;               // envoi automatique au plus toutes les 5 minutes
const cloud = { link: null, busy: false, lastPush: 0, conflict: null, msg: '', showKey: false, lastCode: '' };
// Activation automatique (par défaut) : 'off' si le joueur a délié l'appareil lui-même,
// 'pris:<pseudo>' si ce pseudo a déjà une sauvegarde en ligne (pas de nouvelle tentative)
const CLOUD_AUTO_KEY = 'lacTranquille.cloud.auto';

// ===========================================================================
// État du jeu
// ===========================================================================
let progress = emptyProgress();
let inGame = false;

// Mode admin (outils de test) : toujours désactivé au lancement. L'ancien réglage enregistré
// dans le navigateur est effacé (il ne doit plus pouvoir être réactivé par le joueur).
const admin = { on: false, forced: 'random', corruption: null };
try { localStorage.removeItem('lacTranquille.admin'); } catch { /* stockage indisponible */ }

// --- bateau
const boatLevel = () => progress.boat?.level || 1;
const boatDef = (level = boatLevel()) => BOATS[level - 1];
const nextBoat = () => BOATS[boatLevel()] || null;            // null : bateau au maximum
const hasPart = (id) => progress.boat.parts.includes(id);
const tierUnlocked = (tier) => tier <= boatMaxTier(boatLevel());
// toutes les pièces du prochain bateau sont-elles réunies ?
function boatReady() {
  const nb = nextBoat();
  return !!nb && nb.parts.every((p) => hasPart(p.id)) && hasPart(nb.special.id);
}
// Chance de trouver la pièce spéciale du prochain bateau (une seule fois)
function specialPartChance(tier, source) {
  const nb = nextBoat();
  if (!nb || hasPart(nb.special.id)) return 0;
  const base = source === 'fish' ? 0.02 + 0.008 * tier : 0.01 + 0.005 * tier;
  return clamp(base * (1 + mods().luck * 0.5), 0, 0.5);
}
// Tire la pièce spéciale ; renvoie sa définition si elle vient d'être trouvée
function rollSpecialPart(tier, source) {
  if (Math.random() >= specialPartChance(tier, source)) return null;
  const sp = nextBoat().special;
  progress.boat.parts.push(sp.id);
  return sp;
}

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
// emplacement où l'objet est porté (null : pas équipé)
const slotOfInst = (inst) => SLOTS.find((sl) => progress.equip[sl.id] === inst.uid)?.id ?? null;
const isEquipped = (inst) => slotOfInst(inst) !== null;
// emplacement visé quand on équipe un objet : celui de son type ; pour un accessoire, l'emplacement
// où le même accessoire est déjà porté, sinon le premier libre (null : tous occupés, il faut choisir)
function slotForItem(it) {
  if (it.slot !== 'acc') return it.slot;
  const same = ACC_SLOTS.find((sl) => equippedItem(sl.id)?.id === it.id);
  if (same) return same.id;
  return ACC_SLOTS.find((sl) => !equippedItem(sl.id))?.id ?? null;
}

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
    const cu = activeCurse();
    if (cu) out.push({ kind: 'curse', name: cu.name, fx: curseFx(cu), icon: curseIcon(cu) });
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
    const M = modsCache;
    M.speed = clamp(M.speed, -1, 0.6);
    M.vigor = clamp(M.vigor, -1, 0.6);
    // planchers : les malus des malédictions ne doivent jamais rendre une formule négative
    M.gold = Math.max(M.gold, -0.75);
    M.rare = Math.max(M.rare, -0.15);
    M.luck = Math.max(M.luck, -0.9);
    M.chest = Math.max(M.chest, -0.9);
    M.crate = Math.max(M.crate, -0.75);
    M.perfect = Math.max(M.perfect, -1);
    M.bar = Math.max(M.bar, -0.6);
    M.window = Math.max(M.window, -0.5);
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
  return { x: BOAT_X + 66 + boatShift(), y: Math.round(150 + boatBob() + bend) };
}

// ===========================================================================
// Pêche
// ===========================================================================
function pickFish() {
  // pêche d'entraînement : le poisson le plus calme du lac, jamais une abomination
  if (tuto.fishing) {
    const easy = FISH.filter((f) => !f.unique).reduce((a, b) => (fishVigor(b, false) < fishVigor(a, false) ? b : a));
    return { f: easy, abom: false };
  }
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
  // les grands bateaux ont une cabine à gauche du pêcheur : on ne lance pas derrière
  if (boatLevel() >= 3 && game.float.to.x > BOAT_X - 110 && game.float.to.x < BOAT_X + 10 && game.float.to.y > 160) game.float.to.y = 158;
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
  game.biteAt = tuto.fishing ? rand(3.5, 5) : rand(3, 10) * wait;   // entraînement : une touche, puis ça mord
  game.nextNibble = tuto.fishing ? 1.4 : rand(0.8, 2.2) * wait;
  game.nibble = 0;
  setState('waiting');
  say(game.baitRanOut ? `Plus de ${game.baitRanOut} ! Retour à la mie de pain. Patience…` : 'Patience…');
  Sound.splash();
}

function reactionWindow() {
  const { f, abom } = game.fish;
  const w = Math.max(0.3, f.window * (abom ? 0.85 : 1) + rod().window + mods().window);
  return tuto.fishing ? Math.max(1.6, w * 2) : w;                     // entraînement : le temps de lire la consigne
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

// --- Bourriche : les prises ne sont plus vendues automatiquement, elles attendent le poissonnier
const keepnetSize = () => keepnetCap(boatLevel());
const keepnetFull = () => progress.catches.length >= keepnetSize();
// Garde une prise dans la bourriche ; si elle est pleine, la prise est relâchée (rien n'est vendu)
function keepCatch(f, abom, c) {
  if (keepnetFull()) {
    progress.stats.released = (progress.stats.released || 0) + 1;
    return false;
  }
  progress.catches.push({ uid: ++progress.itemSeq, id: f.id, abom: !!abom && !f.unique, w: c.weight, v: Math.max(1, Math.round(c.money)) });
  return true;
}
// Prix de rachat du poissonnier : valeur de la prise × cours du poisson du jour
const fishPrice = (c) => Math.max(1, Math.round((c.v * progress.market.index) / MARKET.base));
const keepnetValue = () => progress.catches.reduce((s, c) => s + fishPrice(c), 0);

// Enregistre une prise (poisson ou crustacé) : carnet et statistiques (la vente se fait au village)
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
  if (abom && st.aboms === 1) unlockCurses();
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
  // le bonus « Perfect » augmente la valeur de la prise (versée à la vente)
  const stored = keepCatch(f, abom, { ...c, money: c.money + bonus });
  const drop = Math.random() < itemDropChance(f.tier, abom, 'fish') ? addItem(rollItem(f.tier, abom)) : null;
  const part = rollSpecialPart(f.tier, 'fish');
  game.catch = { f, abom, ...c, perfect, bonus, loot, drop, part, stored, goldBonus: M.gold, ...flags };
  if (f.unique) progress.stats.cthulhu = (progress.stats.cthulhu || 0) + 1;
  if (loot) {
    progress.baits[loot.bait.id] = (progress.baits[loot.bait.id] || 0) + loot.qty;
    progress.stats.chests = (progress.stats.chests || 0) + 1;
  }
  if (perfect) {
    progress.stats.perfects = (progress.stats.perfects || 0) + 1;
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
  if (drop) later(() => Sound.itemFound(itemDef(drop.inst).tier), 500);
  checkAchievements({ type: 'catch', f, abom, perfect, ...flags });
  if (drop) checkAchievements({ type: 'item', item: itemDef(drop.inst) });
  if (part) onSpecialPartFound(part);
}

function onSpecialPartFound(part) {
  later(() => Sound.chestGet(), 700);
  pushToast({ icon: ICONS.boat, label: 'Pièce spéciale trouvée !', title: part.name,
    sub: boatReady() ? `Toutes les pièces du ${nextBoat().name} sont réunies : direction le chantier !` : `Pour le ${nextBoat().name}`,
    sound: () => Sound.achievement() });
  checkAchievements({ type: 'part' });
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

function equipItem(uid, slotId = null) {
  const inst = itemByUid(uid);
  if (!inst) return;
  const it = itemDef(inst);
  const target = slotId || slotForItem(it);
  if (!target || SLOT_BY_ID[target]?.kind !== it.slot) return;
  // un même accessoire ne peut pas être porté deux fois : on libère l'autre emplacement
  for (const sl of SLOTS) {
    const cur = progress.equip[sl.id];
    if (sl.id !== target && cur != null && (cur === uid || (it.slot === 'acc' && itemByUid(cur)?.id === it.id))) delete progress.equip[sl.id];
  }
  progress.equip[target] = uid;
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
let lastPotPart = null;

function collectPot(slot) {
  tickPots();
  const pot = progress.pots[slot];
  if (!pot) return;
  progress.pots[slot] = null;
  lastPotPart = null;
  const gold = 1 + mods().gold;
  const drops = [];
  const results = pot.contents.map((it) => {
    const cr = CRUST_BY_ID[it.id];
    const c = { ...it, money: Math.round(it.money * gold) };
    if (Math.random() < itemDropChance(cr.tier, it.abom, 'pot')) drops.push(addItem(rollItem(cr.tier, it.abom)));
    const part = rollSpecialPart(cr.tier, 'pot');
    if (part) { lastPotPart = part; onSpecialPartFound(part); }
    const flags = registerCatch(cr, it.abom, c);
    return { cr, ...c, ...flags, stored: keepCatch(cr, it.abom, c) };
  });
  progress.stats.crusts = (progress.stats.crusts || 0) + results.length;
  progress.stats.potsCollected = (progress.stats.potsCollected || 0) + 1;
  lastPot = { slot, type: pot.type, bait: pot.bait, results, drops, part: lastPotPart };
  addRipple(POT_SLOTS[slot].x, POT_SLOTS[slot].y, 1);
  if (results.length) Sound.catchFish(results.some((r) => r.abom)); else Sound.miss();
  if (drops.length) later(() => Sound.itemFound(Math.max(...drops.map((d) => itemDef(d.inst).tier))), 500);
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
const cth = { active: false, rise: 0, target: 0, rage: 0, shake: 0, sprite: null, spriteT: -1, spriteRage: -1 };

// Sons différés pendant la partie (rugissement, tonnerre, objet trouvé…) : annulés par resetFishing(),
// pour qu'ils ne se déclenchent pas sur le menu après un retour en arrière.
const gameTimers = new Set();
function later(fn, ms) {
  const id = setTimeout(() => { gameTimers.delete(id); fn(); }, ms);
  gameTimers.add(id);
}

// Remise à zéro centralisée de la pêche en cours : combat, Grand Ancien, musique, sons différés.
// Appelée à l'entrée en partie (chargement, import), au retour au menu et à la mise à l'eau d'un bateau.
function resetFishing() {
  for (const id of gameTimers) clearTimeout(id);
  gameTimers.clear();
  holding = false;
  game.mg = null;
  game.swap = null;
  Object.assign(cth, { active: false, rise: 0, target: 0, rage: 0, shake: 0 });
  storm.flash = 0;
  Sound.setMusic('calm');
  $('catch-card').hidden = true;
}

// Une prise en cours abandonnée (retour au menu) compte comme un poisson échappé
const FIGHT_STATES = new Set(['bite', 'reeling', 'rising', 'phaseBreak']);
function abandonCatch() {
  if (!inGame || !FIGHT_STATES.has(game.state) || !game.fish) return;
  progress.stats.missed++;
  checkAchievements({ type: 'escape', f: game.fish.f });
}

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
  later(() => Sound.roar(), 900);
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
    vigor: cp ? cp.vigor * (0.6 + 0.4 * rod().vigor) * (1 - mods().vigor * 0.5) : fishVigor(f, abom) * (tuto.fishing ? 0.5 : 1),
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
    chest: !cp && !tuto.fishing && Math.random() < chestChance()
      ? { pos: rand(0.08, 0.92), appearAt: rand(0.8, 3), visible: false, progress: 0, got: false, inZone: false, flash: 0 }
      : null,
    from: { x: game.float.x, y: game.float.y },
  };
  // une prise parfaite contre le Grand Ancien doit l'être sur les 3 phases
  if (cp && phase > 0) game.mg.perfect = game.perfectSoFar;
  setState('reeling');
  say(cp ? `Phase ${phase + 1} / 3 — ${cp.name} ${TOUCH ? 'Gardez le doigt appuyé' : 'Maintenez le clic'} !` : `${HOLD} pour faire monter la barre verte !`);
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
  later(() => Sound.roar(), 300);
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
  say(`${CLICK} pour lancer la ligne`);
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

// ---------------------------------------------------------------------------
// Économie du village : un pas de marché, les intérêts et le stock du bric-à-brac par jour
// ---------------------------------------------------------------------------
// Bruit gaussien (Box-Muller) pour le cours du poisson
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

function marketStep() {
  const mk = progress.market;
  const drift = MARKET.revert * (MARKET.base - mk.index);
  mk.index = clamp(Math.round((mk.index + drift + mk.index * MARKET.vol * gauss()) * 10) / 10, MARKET.min, MARKET.max);
  mk.history.push(mk.index);
  if (mk.history.length > MARKET.history) mk.history.splice(0, mk.history.length - MARKET.history);
}

function rollBricStock() {
  const lvl = boatLevel();
  const pool = ITEMS.filter((it) => it.tier <= bricMaxTier(lvl));
  const w = pool.map((it) => ITEM_TIER_WEIGHT[it.tier] * (1 + it.tier * 0.4 * (lvl - 1)));
  const stock = [];
  for (let n = bricStockSize(lvl); n > 0 && pool.length; n--) {
    let r = Math.random() * w.reduce((s, x) => s + x, 0);
    let i = 0;
    while (i < pool.length - 1 && (r -= w[i]) > 0) i++;
    stock.push(pool[i].id);
    pool.splice(i, 1);                     // pas de doublon dans le stock du jour
    w.splice(i, 1);
  }
  progress.bric = { day: dayOf(progress.clock), stock, sold: stock.map(() => false) };
}

// Rattrape les jours écoulés (cours, intérêts, stock). announce : notification des intérêts.
function catchUpDays(announce) {
  const today = dayOf(progress.clock);
  const mk = progress.market;
  if (!mk.day) {                           // nouvelle partie ou sauvegarde d'avant le village
    mk.day = today;
    if (!mk.history.length) mk.history.push(mk.index);
  }
  let interest = 0;
  const days = Math.min(today - mk.day, 60);
  for (let d = 0; d < days; d++) {
    marketStep();
    const gain = Math.min(BANK.maxInterest, Math.floor(progress.bank * bankRate(mk.index)));
    progress.bank = Math.min(SAVE_LIM.money, progress.bank + gain);
    interest += gain;
  }
  mk.day = today;
  if (interest > 0) {
    progress.stats.interest = (progress.stats.interest || 0) + interest;
    if (announce) {
      pushToast({ icon: ICONS.coin, label: `Banque · ${NPC_BY_ID.bank.name}`, title: `Intérêts : +${fmtNum(interest)}`,
        sub: `Cours du poisson : ${fmtIndex(mk.index)}`, sound: () => Sound.buy() });
    }
  }
  if (progress.bric.day !== today) rollBricStock();
  if (openPanelName === 'bank') renderBank();
  if (openPanelName === 'fishmonger') renderFishmonger();
}
const fmtIndex = (x) => String(Math.round(x * 10) / 10).replace('.', ',');

function updateClock(dt) {
  const prev = progress.clock;
  progress.clock += dt;
  // le temps de jeu suit l'horloge (panneaux ouverts compris) : les jours restent cohérents avec
  // le temps joué, ce que vérifie le classement (scripts/leaderboard.mjs)
  progress.stats.playTime += dt;
  if (dayOf(prev) !== dayOf(progress.clock)) {
    refreshCurseDay(true);
    catchUpDays(true);
  }
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
      later(() => Sound.thunder(dist), 200 + dist * 1500);
    }
  }
}

function update(dt) {
  time += dt;
  invalidateMods();
  if (inGame) updateClock(dt);
  updateWorldVisuals(dt);
  updateCurseVis(dt);
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
  saveTimer += dt;
  if (saveTimer > 15) { saveTimer = 0; writeSave(); }
  tutoTick();

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
          : game.fish.abom ? `Quelque chose a mordu… ${CLICK} !` : `Ça mord ! ${CLICK} !`);
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
    case 'boatSwap': {
      // sillage derrière le bateau en mouvement
      const v = boatSwapView();
      if (v && Math.random() < dt * 18) addRipple(BOAT_X - 60 + v.shift + boatArt(v.level).stern + rand(-6, 6), BOAT_Y + 14, rand(1, 2));
      if (game.t >= SWAP_OUT && !game.swap.arrived) {
        game.swap.arrived = true;
        say(`Voici votre ${boatDef().name} !`);
        Sound.splash();
      }
      if (game.t >= SWAP_OUT + SWAP_IN + 0.4) {
        game.swap = null;
        setState('idle');
        say(`${CLICK} pour lancer la ligne`);
        Sound.achievement();
        pushToast({ icon: ICONS.boat, label: `Bateau niveau ${boatLevel()}`, title: boatDef().name,
          sub: `Cannes et caisses jusqu'au niveau ${boatMaxTier(boatLevel())} débloquées`, sound: () => Sound.chestGet() });
        checkAchievements({ type: 'boat' });
      }
      break;
    }
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
        say(`${CLICK} pour lancer la ligne`);
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

const HAND = { x: 64, y: 20 };      // main du pêcheur dans le sprite de la barque

// Apparence affichée : celle du personnage, avec la veste et le pantalon équipés par-dessus
// (sauf si le joueur a choisi de les masquer)
function currentLook(base = progress.look) {
  const look = validLook(base);
  if (look.gear === 'on') {
    const j = equippedItem('jacket');
    const p = equippedItem('pants');
    if (j) look.shirt = j.color;
    if (p) look.pants = p.color;
  }
  return look;
}
function refreshBoat() { boatSprite = buildBoat(currentLook()); }

// Sprite du bateau : grand canevas dont l'« origine » (px, py) correspond au coin de l'ancienne barque
// 120×48. Le pêcheur, sa main et la canne restent ainsi au même endroit quel que soit le bateau.
const BOAT_SPR = { w: 220, h: 98, px: 50, py: 48 };
// Par niveau : lanterne (repère d'origine), demi-largeur de l'ombre dans l'eau, poupe (sillage)
const BOAT_ART = [
  { lantern: { x: 108, y: 7 },   shadow: 58,  stern: 4 },
  { lantern: { x: 112, y: 3 },   shadow: 68,  stern: -14 },
  { lantern: { x: 1, y: -36 },   shadow: 82,  stern: -24 },
  { lantern: { x: 4, y: -46 },   shadow: 96,  stern: -36 },
  { lantern: { x: -16, y: -46 }, shadow: 106, stern: -44 },
];
const boatArt = (level = boatLevel()) => BOAT_ART[level - 1];

// Coque : rangées de pixels, poupe à gauche (x0), étrave à droite (x1) qui remonte en pointe
function paintHull(c, x0, x1, depth, bow, colorAt, sternCut = 0) {
  for (let y = 0; y < depth; y++) {
    const k = y / (depth - 1);
    const left = x0 + Math.round(Math.max(0, y - depth + sternCut) * 1.5);
    const right = x1 - Math.round(Math.pow(k, 0.75) * bow);
    pxRect(c, left, 24 + y, right - left, 1, colorAt(y));
  }
}
function lanternOn(c, x, y, pole = 14, poleCol = '#6e4422') {
  pxRect(c, x, y + 4, 1, pole, poleCol);
  pxRect(c, x - 3, y - 1, 7, 1, '#3a3a40');
  pxRect(c, x - 2, y, 5, 6, '#4a4a52');
  pxRect(c, x - 1, y + 1, 3, 4, '#ffd27a');
  pxRect(c, x, y + 2, 1, 2, '#fff3b8');
  pxRect(c, x - 2, y + 6, 5, 1, '#3a3a40');
}
function bucket(c, x) {
  pxRect(c, x, 15, 9, 10, '#8a8f96');
  pxRect(c, x, 15, 9, 2, '#b8bec6');
  pxRect(c, x + 3, 11, 3, 4, '#aeb9bd');
  pxRect(c, x + 2, 10, 5, 2, '#cf5f3a');
}
function window4(c, x, y, w, h, glass = '#a8e0f8') {
  pxRect(c, x, y, w, h, glass);
  pxRect(c, x, y, w, 1, shadeHex(glass, 1.35));
  pxRect(c, x + 1, y + 1, 2, 1, '#ffffff');
}
function lifebuoy(c, x, y) {
  pxDisk(c, x, y, 4, '#f08a2a');
  for (const [dx, dy] of [[-3, -2], [2, -3], [3, 2], [-2, 3]]) pxRect(c, x + dx, y + dy, 1, 1, '#f4f0e6');
  pxDisk(c, x, y, 1, '#1e140c');
}

function buildBoat(look = DEFAULT_LOOK, level = boatLevel()) {
  const cv = makeCanvas(BOAT_SPR.w, BOAT_SPR.h);
  const c = cv.getContext('2d');
  c.translate(BOAT_SPR.px, BOAT_SPR.py);
  const fisher = buildFisherSprite(look);
  switch (level) {
    case 1: default: {                                        // --- barque en bois
      lanternOn(c, 108, 7);
      bucket(c, 80);
      pxRect(c, 20, 18, 12, 7, '#b0402e');
      pxRect(c, 20, 18, 12, 2, '#d8604a');
      pxRect(c, 24, 15, 4, 3, '#4a4f55');
      c.drawImage(fisher, 46, 6);
      for (let y = 0; y < 15; y++) {
        const half = 54 - Math.max(0, y - 6) * 2;
        let col = Math.floor(y / 4) % 2 ? '#87532c' : '#9a6236';
        if (y === 0) col = '#c88c52';
        if (y === 1) col = '#a86c3a';
        if (y > 1 && y % 4 === 0) col = '#5e3a1e';
        pxRect(c, 60 - half, 24 + y, half * 2, 1, col);
      }
      for (const x of [22, 60, 98]) pxRect(c, x, 26, 1, 10, '#6e4422');
      break;
    }
    case 2: {                                                  // --- canot à moteur
      lanternOn(c, 112, 3, 20, '#9aa3ad');
      pxRect(c, -14, 8, 10, 3, '#c64a35');                      // moteur hors-bord
      pxRect(c, -14, 11, 10, 13, '#3a3a44');
      pxRect(c, -13, 12, 2, 10, '#5a5a66');
      pxRect(c, -11, 24, 3, 13, '#5a5a62');
      pxRect(c, -14, 36, 9, 2, '#9aa3ad');
      bucket(c, 96);
      pxRect(c, 18, 16, 14, 8, '#3a72c8');                     // siège
      pxRect(c, 18, 16, 14, 2, '#6a9ae0');
      c.drawImage(fisher, 46, 6);
      pxRect(c, 74, 9, 2, 15, '#e8eef2');                       // pare-brise
      window4(c, 76, 11, 9, 13);
      pxRect(c, 76, 9, 10, 2, '#e8eef2');
      paintHull(c, -8, 126, 16, 18, (y) => (y === 0 ? '#c8ccd2' : y < 6 ? '#f0ece0' : y < 8 ? '#3a72c8' : y < 15 ? '#2a4a8a' : '#1e3060'), 4);
      for (const x of [10, 50, 90]) pxRect(c, x, 27, 6, 1, '#d8dce0');
      break;
    }
    case 3: {                                                  // --- bateau de pêche
      pxRect(c, 0, -34, 2, 16, '#5a5a62');                     // mât
      lanternOn(c, 1, -36, 0);
      pxRect(c, -18, -18, 58, 4, '#c64a35');                   // toit
      pxRect(c, -18, -18, 58, 1, '#e06a55');
      pxRect(c, -14, -14, 50, 38, '#f0ece0');                  // timonerie
      pxRect(c, 30, -14, 6, 38, '#d0ccc0');
      window4(c, -9, -9, 12, 8);
      window4(c, 9, -9, 12, 8);
      pxRect(c, 24, 0, 6, 24, '#8a5a32');                       // porte
      pxRect(c, 28, 10, 1, 2, '#f5d04a');
      lifebuoy(c, 4, 10);
      bucket(c, 80);
      pxRect(c, 100, 12, 12, 12, '#5a5a62');                    // treuil
      pxRect(c, 101, 15, 10, 6, '#8a929c');
      pxRect(c, 101, 17, 10, 1, '#c8a060');
      c.drawImage(fisher, 46, 6);
      paintHull(c, -24, 138, 18, 22, (y) => (y === 0 ? '#2a2a30' : y < 7 ? '#f0ece0' : y < 9 ? '#c64a35' : y < 16 ? '#a8382c' : '#3a1a1a'), 5);
      for (const x of [40, 64, 88]) pxDisk(c, x, 29, 2, '#5a8ab0');      // hublots
      break;
    }
    case 4: {                                                  // --- chalutier
      pxRect(c, 4, -44, 2, 12, '#5a5a62');                      // mât et antennes
      pxRect(c, -2, -40, 14, 1, '#5a5a62');
      lanternOn(c, 4, -46, 0);
      pxRect(c, -22, -34, 52, 4, '#2a3a5a');                    // passerelle
      pxRect(c, -18, -30, 44, 20, '#e8eef2');
      window4(c, -14, -26, 36, 7, '#5ab8f0');
      for (const x of [-2, 10]) pxRect(c, x, -26, 1, 7, '#e8eef2');
      pxRect(c, 22, -34, 6, 3, '#ffe9a0');                      // projecteurs
      pxRect(c, -20, -34, 6, 3, '#ffe9a0');
      pxRect(c, -26, -10, 62, 34, '#dfe6ec');                    // cabine basse
      pxRect(c, 30, -10, 6, 34, '#c4ccd4');
      for (const x of [-18, -6, 6, 18]) pxDisk(c, x, -2, 3, '#5ab8f0');
      lifebuoy(c, 26, 10);
      pxRect(c, 76, 13, 18, 11, '#3a72c8');                     // caisses de poisson
      pxRect(c, 76, 13, 18, 2, '#6a9ae0');
      pxRect(c, 104, 4, 8, 20, '#e0a020');                       // grue
      c.fillStyle = '#e0a020';
      pxLine(c, 108, 6, 136, -22, '#e0a020');
      pxLine(c, 109, 6, 137, -22, '#e0a020');
      pxLine(c, 110, 7, 138, -21, '#b07a10');
      pxLine(c, 137, -21, 137, 14, '#1e140c');                   // câble
      pxRect(c, 135, 14, 4, 3, '#8a929c');
      c.drawImage(fisher, 46, 6);
      paintHull(c, -36, 152, 21, 26, (y) => (y < 3 ? '#e8eef2' : y < 11 ? '#2a3a5a' : y < 12 ? '#e8eef2' : y < 18 ? '#1e2a44' : '#7a2a2a'), 6);
      for (const x of [-20, 10, 40, 70, 100]) pxRect(c, x, 31, 8, 1, '#3e5070');
      break;
    }
    case 5: {                                                  // --- navire Abysse-X
      pxRect(c, -16, -44, 1, 22, '#9aa3ad');                    // antenne
      lanternOn(c, -16, -46, 0, '#9aa3ad');
      pxRect(c, -6, -32, 2, 6, '#9aa3ad');                      // radar
      pxEllipse(c, -5, -33, 9, 2, '#d8e0e8');
      pxDisk(c, 26, -27, 6, '#e8eef2');                         // dôme satellite
      pxRect(c, 20, -27, 13, 1, '#b8c0c8');
      for (let y = -22; y < 24; y++) {                          // cabine profilée
        const right = 34 + Math.round((y + 22) * 0.5);
        const left = -30 + Math.max(0, Math.round((-12 - y) * 0.8));
        pxRect(c, left, y, right - left, 1, '#2a2e38');
      }
      for (let y = -18; y < -2; y++) {                          // grande vitre
        const right = 30 + Math.round((y + 22) * 0.5);
        pxRect(c, -18 + Math.max(0, Math.round((-12 - y) * 0.8)), y, right + 18 - Math.max(0, Math.round((-12 - y) * 0.8)), 1, y < -10 ? '#40e0f0' : '#1a8aa0');
      }
      pxRect(c, -26, 2, 64, 1, '#40e0f0');                      // liseré néon
      pxRect(c, -20, 8, 30, 10, '#1e2228');
      for (const x of [-16, -8, 0]) pxRect(c, x, 11, 4, 4, '#40e0f0');   // écrans du labo
      pxRect(c, 108, 8, 22, 16, '#3a4250');                      // module sonar
      pxDisk(c, 119, 15, 4, '#40e0f0');
      pxDisk(c, 119, 15, 2, '#c8fbff');
      pxRect(c, 78, 14, 16, 10, '#3a4250');
      pxRect(c, 78, 14, 16, 2, '#40e0f0');
      c.drawImage(fisher, 46, 6);
      paintHull(c, -44, 164, 21, 34, (y) => (y === 0 ? '#40e0f0' : y < 10 ? '#22262e' : y < 11 ? '#40e0f0' : y < 19 ? '#16181e' : '#0a2a30'), 6);
      for (const x of [0, 40, 80, 120]) pxRect(c, x, 30, 14, 1, '#3a4250');
      break;
    }
  }
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

const lineVisible = () => inGame && !['idle', 'caught', 'boatSwap'].includes(game.state);

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

// Animation de changement de bateau : l'ancien part à droite, le nouveau arrive par la gauche
const SWAP_OUT = 2.4, SWAP_IN = 3.0;
function boatSwapView() {
  if (game.state !== 'boatSwap' || !game.swap) return null;
  const t = game.t;
  if (t < SWAP_OUT) {
    const k = t / SWAP_OUT;
    return { sprite: game.swap.old, level: game.swap.oldLevel, shift: Math.round(k * k * 420) };
  }
  const k = Math.min(1, (t - SWAP_OUT) / SWAP_IN);
  return { sprite: boatSprite, level: boatLevel(), shift: Math.round(-460 * (1 - k) ** 3) };
}
const boatShift = () => boatSwapView()?.shift || 0;

function drawBoat() {
  const view = boatSwapView();
  const spr = view?.sprite || boatSprite;
  const art = boatArt(view?.level || boatLevel());
  const shift = view?.shift || 0;
  const bob = boatBob();
  ctx.globalAlpha = 0.35;
  pxEllipse(ctx, BOAT_X + shift, BOAT_Y + 16 + (art.shadow > 60 ? 3 : 0), art.shadow, 3, '#0e2a50');
  ctx.globalAlpha = 1;
  const ox = BOAT_X - 60 + shift;
  const oy = BOAT_Y - 24 + bob;
  ctx.drawImage(spr, ox - BOAT_SPR.px, oy - BOAT_SPR.py);
  shadeLayer(spr, ox - BOAT_SPR.px, oy - BOAT_SPR.py, wv.dark * 0.35 + wv.storm * 0.15);
  // la lanterne s'allume le soir
  if (wv.dark > 0.05) {
    const lx = ox + art.lantern.x, ly = oy + art.lantern.y + 3;
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
  drawCursePost();
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
  drawCurseFx();
  if (inGame && (game.fish?.abom || game.fish?.f.unique) && ['bite', 'reeling', 'caught', 'rising', 'phaseBreak'].includes(game.state)) {
    ctx.fillStyle = game.fish.f.unique ? `rgba(10, 40, 25, ${(cth.active ? 0.16 : 0.35) + Math.sin(time * 2) * 0.08})` : `rgba(35, 8, 50, ${0.25 + Math.sin(time * 3) * 0.07})`;
    ctx.fillRect(0, 0, LW, LH);
  }
}

// ===========================================================================
// Malédictions : effets visuels (sans état : tout est calculé à partir du temps)
// ===========================================================================
const curseVis = { id: null, a: 0 };          // effet affiché et son intensité (fondu 0 → 1)
function updateCurseVis(dt) {
  const want = activeCurse()?.id || null;
  if (want && curseVis.id !== want && curseVis.a <= 0.02) curseVis.id = want;   // on change d'effet une fois l'ancien éteint
  const target = want && curseVis.id === want ? 1 : 0;
  curseVis.a = clamp(curseVis.a + Math.sign(target - curseVis.a) * dt * 0.5, 0, 1);
  if (!want && curseVis.a === 0) curseVis.id = null;
}
// pseudo-aléatoire fixe (même valeur à chaque image pour un même i)
const hr = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const tint = (col, alpha) => { ctx.fillStyle = col; ctx.globalAlpha = alpha; ctx.fillRect(0, 0, LW, LH); ctx.globalAlpha = 1; };
const vignette = (r, g, b, alpha, inner = 90, cx = LW / 2, cy = LH / 2) => {
  const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, LW * 0.62);
  grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},${alpha})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LW, LH);
};
const RUNES = [[7, 5, 2, 5, 7], [5, 7, 5, 2, 2], [2, 5, 7, 5, 5], [6, 1, 6, 4, 3], [7, 1, 3, 1, 7], [5, 5, 2, 5, 5]];   // glyphes 3×5 (bits)

function drawCurseFx() {
  if (!inGame || !curseVis.id || curseVis.a <= 0) return;
  const a = curseVis.a;
  const T = time;
  ctx.save();
  switch (CURSE_BY_ID[curseVis.id].vis) {
    case 'blood': {                             // ciel rouge, lune de sang, gouttes qui coulent du haut
      tint('#6a0010', 0.18 * a);
      ctx.globalAlpha = a;
      pxDisk(ctx, 410, 34, 16, '#5a0a10');
      pxDisk(ctx, 410, 34, 14, '#c0202a');
      pxDisk(ctx, 405, 30, 4, '#d8404a');
      pxDisk(ctx, 416, 40, 2, '#901018');
      for (let i = 0; i < 14; i++) {
        const x = Math.round(hr(i) * LW);
        const len = Math.round(((T * (6 + hr(i, 1) * 10) + hr(i, 2) * 40) % 46));
        ctx.fillStyle = '#8a0a14';
        ctx.fillRect(x, 0, 1, len);
        ctx.fillRect(x - 1, len, 3, 2);
      }
      break;
    }
    case 'miasma': {                            // nappes de brume verte qui dérivent, bords verdâtres
      tint('#2a5a20', 0.1 * a);
      for (let k = 0; k < 8; k++) {
        const dir = k % 2 ? 1 : -1;
        const x = ((hr(k) * (LW + 260) + T * 9 * dir) % (LW + 260) + LW + 260) % (LW + 260) - 200;
        const y = HORIZON - 40 + k * 24 + Math.sin(T * 0.4 + k) * 4;
        ctx.globalAlpha = 0.22 * a;
        pxEllipse(ctx, Math.round(x + 100), Math.round(y), 120, 10, '#8ae07a');
      }
      ctx.globalAlpha = a;
      vignette(30, 100, 30, 0.55);
      break;
    }
    case 'eyes': {                              // des yeux s'ouvrent dans le ciel et sur les bords, et fixent la barque
      tint('#3a2a00', 0.1 * a);
      for (let i = 0; i < 18; i++) {
        const edge = i % 3 === 0;
        const x = Math.round(edge ? (i % 2 ? 16 + hr(i) * 26 : LW - 42 + hr(i) * 26) : 30 + hr(i) * (LW - 60));
        const y = Math.round(edge ? 120 + hr(i, 1) * 120 : 12 + hr(i, 1) * (HORIZON - 28));
        const open = clamp(Math.sin(T * 0.6 + i * 1.9) * 2.2, 0, 1);
        if (open <= 0) continue;
        const h = Math.max(1, Math.round(5 * open));
        ctx.globalAlpha = a;
        pxEllipse(ctx, x, y, 10, h + 2, '#2a0a14');           // paupière
        pxEllipse(ctx, x, y, 9, h, '#f0e6c8');                // blanc de l'œil
        pxRect(ctx, x - 8, y, 3, 1, '#d0606a');               // veinules
        pxRect(ctx, x + 6, y - 1, 2, 1, '#d0606a');
        const dx = Math.round(clamp((BOAT_X - x) / 60, -3, 3));
        const ih = Math.min(h, 3);
        pxDisk(ctx, x + dx, y, ih, '#e0a020');                // iris
        pxRect(ctx, x + dx, y - ih + 1, 1, ih * 2 - 1, '#100408');   // pupille fendue
      }
      ctx.globalAlpha = a;
      vignette(70, 50, 0, 0.45);
      break;
    }
    case 'ink': {                               // pluie d'encre noire et taches au sol
      tint('#140a28', 0.2 * a);
      ctx.globalAlpha = 0.75 * a;
      ctx.fillStyle = '#08040e';
      for (let i = 0; i < 90; i++) {
        const sp = 170 + hr(i, 2) * 90;
        const x = Math.round((hr(i) * LW + T * 25) % LW);
        const y = Math.round((hr(i, 1) * (LH + 20) + T * sp) % (LH + 20)) - 10;
        ctx.fillRect(x, y, 1, 7);
      }
      for (let i = 0; i < 8; i++) {
        const life = (T * 0.5 + hr(i, 3)) % 1;
        ctx.globalAlpha = (1 - life) * 0.6 * a;
        pxEllipse(ctx, Math.round(hr(i, 4) * LW), Math.round(HORIZON + 20 + hr(i, 5) * 130), Math.round(2 + life * 7), Math.round(1 + life * 2), '#08040e');
      }
      break;
    }
    case 'tentacles': {                         // tentacules qui ondulent depuis le bas de l'écran et le lac
      tint('#0a3a20', 0.16 * a);
      ctx.globalAlpha = a;
      [[22, 140, 9], [96, 90, 7], [176, 60, 5], [318, 64, 5], [390, 100, 7], [458, 150, 9]].forEach(([bx, ht, w], i) => {
        const rise = ht * (0.75 + 0.25 * Math.sin(T * 0.5 + i * 2));
        for (const [col, extra] of [['#0a1a10', 1], ['#2f7a50', 0]]) {   // contour sombre, puis chair
          for (let k = 0; k <= 30; k++) {
            const t = k / 30;
            const x = Math.round(bx + Math.sin(T * 1.3 + t * 3.4 + i) * 16 * t);
            const y = Math.round(LH + 6 - t * rise);
            pxDisk(ctx, x, y, Math.max(1, Math.round((1 - t) * w)) + extra, col);
          }
        }
        for (let k = 2; k < 26; k += 3) {                                  // ventouses
          const t = k / 30;
          const x = Math.round(bx + Math.sin(T * 1.3 + t * 3.4 + i) * 16 * t);
          const r = Math.max(1, Math.round((1 - t) * w));
          if (r > 2) pxRect(ctx, x - r + 2, Math.round(LH + 6 - t * rise), 2, 2, '#a0f0c0');
        }
      });
      break;
    }
    case 'ash': {                               // cendres qui tombent, brume orangée
      tint('#b04a10', 0.16 * a);
      for (let i = 0; i < 170; i++) {
        const x = Math.round((hr(i) * LW + Math.sin(T * 0.8 + i) * 10 + T * 6) % LW);
        const y = Math.round((hr(i, 1) * LH + T * (12 + hr(i, 2) * 14)) % LH);
        ctx.globalAlpha = a * (0.6 + hr(i, 3) * 0.4);
        ctx.fillStyle = i % 6 === 0 ? '#ff9a4a' : i % 2 ? '#c8c4cc' : '#6a6870';
        ctx.fillRect(x, y, 2, i % 3 === 0 ? 2 : 1);
      }
      ctx.globalAlpha = a;
      vignette(90, 30, 0, 0.4);
      break;
    }
    case 'dark': {                              // nuit noire : seule la lanterne de la barque éclaire
      const flick = 1 + Math.sin(T * 7) * 0.03 + Math.sin(T * 13) * 0.02;
      const grad = ctx.createRadialGradient(BOAT_X, BOAT_Y, 20 * flick, BOAT_X, BOAT_Y, 120 * flick);
      grad.addColorStop(0, 'rgba(4,4,16,0)');
      grad.addColorStop(1, 'rgba(4,4,16,0.88)');
      ctx.globalAlpha = a;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, LW, LH);
      break;
    }
    case 'runes': {                             // runes violettes qui montent du lac
      tint('#2a0a40', 0.16 * a);
      for (let i = 0; i < 26; i++) {
        const y = Math.round(LH - ((T * (10 + hr(i, 2) * 8) + hr(i) * LH) % (LH + 16)));
        const x = Math.round(hr(i, 1) * (LW - 12) + Math.sin(T + i) * 5);
        ctx.globalAlpha = a * clamp((y - 10) / 90, 0, 1);
        const g = RUNES[i % RUNES.length];
        for (let ry = 0; ry < 5; ry++) for (let rx = 0; rx < 3; rx++) {
          if (g[ry] & (4 >> rx)) {
            pxRect(ctx, x + rx * 3 - 1, y + ry * 3 - 1, 4, 4, '#4a1a7a');   // halo
            pxRect(ctx, x + rx * 3, y + ry * 3, 2, 2, '#e0a8ff');
          }
        }
      }
      ctx.globalAlpha = a;
      vignette(60, 10, 90, 0.4);
      break;
    }
    case 'stars': {                             // ciel violet, étoiles qui scintillent, étoiles filantes
      tint('#3a1068', 0.22 * a);
      for (let i = 0; i < 40; i++) {
        ctx.globalAlpha = a * (0.4 + 0.6 * Math.abs(Math.sin(T * 2 + i)));
        const big = i % 5 === 0;
        pxRect(ctx, Math.round(hr(i) * LW), Math.round(hr(i, 1) * (HORIZON - 10)), big ? 2 : 1, big ? 2 : 1, '#f0e0ff');
      }
      for (let i = 0; i < 9; i++) {
        const p = (T * 0.3 + hr(i, 2)) % 1.3;
        if (p > 1) continue;
        const x0 = hr(i, 3) * LW * 0.8, y0 = hr(i, 4) * 60;
        for (let k = 0; k < 26; k++) {
          ctx.globalAlpha = a * (1 - k / 26);
          pxRect(ctx, Math.round(x0 + p * 180 - k * 2), Math.round(y0 + p * 120 - k * 1.33), k < 2 ? 3 : 2, k < 2 ? 3 : 1, k < 4 ? '#ffffff' : '#c8a0ff');
        }
      }
      break;
    }
    case 'worms': {                             // vers qui rampent sur les bords de l'écran
      ctx.globalAlpha = a;
      for (let i = 0; i < 22; i++) {
        const side = i % 3;                     // 0 : bas, 1 : gauche, 2 : droite
        const p = (T * (8 + hr(i) * 6) + hr(i, 1) * 400) % 400;
        for (const [col, sz] of [['#3a1a14', 4], ['#d88a7a', 3]]) {       // contour, puis corps
          for (let k = 0; k < 11; k++) {
            const w = Math.round(Math.sin(T * 6 + k * 0.8 + i) * 2);
            const pos = p - k * 2.5;
            const [x, y] = side === 0 ? [Math.round((hr(i, 2) * LW + pos) % LW), LH - 6 + w]
              : side === 1 ? [4 + w, Math.round(LH - (pos % LH))]
              : [LW - 7 + w, Math.round(pos % LH)];
            const d = (4 - sz) / 2;
            pxRect(ctx, Math.round(x - d), Math.round(y - d), sz, sz, k === 0 && sz === 3 ? '#f0b0a0' : col);
          }
        }
      }
      break;
    }
  }
  ctx.restore();
}

// Effets appliqués à l'image entière (après la scène) : couleurs éteintes, monde qui tangue
let curseBuf = null;
function drawCursePost() {
  if (!inGame || !curseVis.id || curseVis.a <= 0) return;
  const vis = CURSE_BY_ID[curseVis.id].vis;
  const a = curseVis.a;
  if (vis === 'mute') {                         // le monde perd ses couleurs
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.9 * a;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, LW, LH);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = a;
    vignette(0, 0, 0, 0.4);
    ctx.restore();
  } else if (vis === 'wobble') {                // l'image ondule, ligne par ligne
    if (!curseBuf) curseBuf = makeCanvas(LW, LH);
    const b = curseBuf.getContext('2d');
    b.clearRect(0, 0, LW, LH);
    b.drawImage(canvas, 0, 0);
    // les bandes décalées laissent voir l'image d'origine sur les bords (pas de bande noire)
    for (let y = 0; y < LH; y += 2) {
      const off = Math.round(Math.sin(y * 0.045 + time * 1.8) * 5 * a);
      if (off) ctx.drawImage(curseBuf, 0, y, LW, 2, off, y, LW, 2);
    }
    ctx.save();
    ctx.globalAlpha = a;
    vignette(20, 70, 90, 0.5);
    ctx.restore();
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
  // la prise part dans la bourriche (vendue au poissonnier), ou est relâchée si la bourriche est pleine
  const value = Math.round(((r.money + r.bonus) * progress.market.index) / MARKET.base);
  $('cc-money').innerHTML = r.stored
    ? `Valeur : ${fmtNum(value)} ${coinImg()}` +
      (r.goldBonus > 0 ? ` <span class="cc-perfect">(or +${Math.round(r.goldBonus * 100)} %)</span>` : '') +
      (r.perfect ? ` <span class="cc-perfect">(+${fmtNum(r.bonus)} Perfect)</span>` : '') +
      `<small class="cc-keep">Dans la bourriche (${progress.catches.length} / ${keepnetSize()}) · à vendre au poissonnier</small>`
    : `<small class="cc-keep full">Bourriche pleine (${keepnetSize()} / ${keepnetSize()}) : vous relâchez la prise. Passez voir le poissonnier au village !</small>`;
  $('cc-loot').hidden = !r.loot;
  if (r.loot) {
    $('cc-loot').innerHTML = `<img src="${itemIcon('bait', r.loot.bait)}" alt=""> Coffre : ${r.loot.qty} × ${r.loot.bait.name}`;
  }
  $('cc-item').hidden = !r.drop;
  if (r.drop) $('cc-item').innerHTML = dropHtml(r.drop);
  $('cc-part').hidden = !r.part;
  if (r.part) $('cc-part').innerHTML = partHtml(r.part);
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
  $('hud-name').textContent = progress.look?.name || '';
  $('hud-money').textContent = fmtNum(progress.money);
  $('hud-count').textContent = `${progress.catches.length} / ${keepnetSize()}`;
  $('hud-count').classList.toggle('full', keepnetFull());
  const b = bait();
  $('hud-bait').textContent = b.pack === 0 ? b.name : `${b.name} (${progress.baits[b.id] || 0})`;
  updateCurseButton();
  updateWorldHud(true);
}

// Encart jour / heure / météo (mis à jour seulement quand quelque chose change)
let worldHudKey = '';
const weatherLabel = () => (isNight() && weather().id === 'clair' ? 'Nuit calme' : weather().name);
function updateWorldHud(force = false) {
  if (!inGame) return;
  const w = weather();
  const night = isNight();
  const cu = activeCurse();
  const key = `${dayOf(progress.clock)}|${fmtHour(progress.clock)}|${w.id}|${night}|${cu?.id}`;
  if (!force && key === worldHudKey) return;
  worldHudKey = key;
  $('hw-day').textContent = `Jour ${dayOf(progress.clock)} · ${fmtHour(progress.clock)}`;
  $('hw-icon').src = weatherIcon(night && w.id === 'clair' ? 'nuit' : w.id);
  $('hw-weather').textContent = weatherLabel() + (night && w.id !== 'clair' ? ' · nuit' : '');
  const lines = [...fxLines(w.fx), ...(night ? fxLines(NIGHT.fx) : [])].map((l) => `<div>${l}</div>`);
  if (cu) lines.push(`<div class="hw-curse" style="color:${cu.color}"><img src="${curseIcon(cu)}" alt="">${cu.name}</div>`);
  $('hw-fx').innerHTML = lines.join('');
  $('hw-fx').hidden = !lines.length;
}

// Couleur de texte lisible pour une rareté (sur fond sombre)
const rarText = (tier) => shadeHex(RARITIES[tier].color, 1.35);

const partHtml = (p) => `<img src="${ICONS.boat}" alt=""> Pièce spéciale : <b style="color:#ffd84a">${p.name}</b>`;

function dropHtml(d) {
  const it = itemDef(d.inst);
  return `<img src="${equipIcon(it)}" alt=""> Objet trouvé : <b style="color:${rarText(it.tier)}">${it.name}</b>` +
    (d.sold ? ` <small>(inventaire plein : vendu ${fmtNum(d.sold)} ${coinImg()})</small>` : '');
}

let confirmNew = false;

// Encart « nouveautés » du menu : version et points importants (textes internes, via textContent)
function renderNews() {
  $('news-title').textContent = `Version ${GAME_VERSION} : quoi de neuf ?`;
  $('news-list').replaceChildren(...WHATS_NEW.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
}
renderNews();

function refreshMenu() {
  const save = loadSave();
  confirmNew = false;
  $('btn-new').textContent = 'Nouvelle partie';
  $('btn-continue').disabled = !save;
  // texte construit avec textContent (aucune donnée de la sauvegarde n'est interprétée comme du HTML),
  // puis l'icône de pièce (balisage interne au jeu) ajoutée à la fin
  const info = $('save-info');
  info.textContent = save
    ? `Partie en cours${save.look?.name ? ` de ${save.look.name}` : ''} : jour ${dayOf(save.clock)} · ${fmtNum(save.stats.caught)} poisson${save.stats.caught > 1 ? 's' : ''} · ${fmtNum(save.money)} `
    : '';
  if (save) info.insertAdjacentHTML('beforeend', coinImg());
}

function enterGame() {
  document.activeElement?.blur();
  resetFishing();
  inGame = true;
  $('menu').hidden = true;
  $('hud').hidden = false;
  // Avant la 1.2.1, l'horloge avançait panneaux ouverts mais pas le temps de jeu : on rattrape
  // l'écart (l'horloge ne tourne qu'en partie, c'est donc du vrai temps passé en jeu).
  progress.stats.playTime = Math.max(progress.stats.playTime, progress.clock - CLOCK_START);
  invalidateMods();
  refreshBoat();
  if (!progress.weather) setWeather('clair', false);
  refreshCurseDay(false);
  catchUpDays(false);                              // cours du poisson, intérêts, stock du bric-à-brac
  curseVis.id = activeCurse()?.id || null;
  curseVis.a = curseVis.id ? 1 : 0;
  // pas de transition visuelle en arrivant : le ciel est directement à la bonne heure et à la bonne météo
  Object.assign(wv, { ...Object.fromEntries(VIS_KEYS.map((k) => [k, weather().vis[k] || 0])), dark: darknessAt(hourOf(progress.clock)) });
  drops.length = 0;
  updateHud();
  setState('idle');
  say(`${CLICK} pour lancer la ligne`);
  cloudAutoEnable();                               // sauvegarde en ligne activée par défaut
  tutoMaybeStart();                                // pêche d'entraînement / astuce sauvegarde
}

function showMenu() {
  tutoAbort();
  closePanel();
  abandonCatch();
  if (inGame) writeSave();
  if (inGame) cloudPush({ silent: true });         // retour au menu : la partie part en ligne
  inGame = false;
  Sound.rain(0);
  resetFishing();
  $('menu').hidden = false;
  $('hud').hidden = true;
  say('');
  refreshMenu();
}

$('btn-continue').addEventListener('click', () => {
  Sound.click();
  progress = loadSave() || emptyProgress();
  // ancienne sauvegarde sans personnage : on le crée d'abord (la progression est conservée)
  if (!progress.look?.name) openCharEditor('complete');
  else enterGame();
});

$('btn-new').addEventListener('click', () => {
  Sound.click();
  if (loadSave() && !confirmNew) {
    confirmNew = true;
    $('btn-new').textContent = 'Confirmer ?';
    $('save-info').textContent = 'La partie en cours sera effacée.';
    return;
  }
  openCharEditor('create');
});

// ---------------------------------------------------------------------------
// Éditeur de personnage
// mode 'create' : nouvelle partie · 'complete' : ancienne sauvegarde sans personnage
// mode 'edit' : depuis le profil (le nom ne peut plus être changé)
// ---------------------------------------------------------------------------
let charMode = 'create';
let charDraft = null;

function openCharEditor(mode) {
  charMode = mode;
  charDraft = mode === 'create' ? { ...DEFAULT_LOOK } : validLook(progress.look);
  $('char-name').value = charDraft.name;
  $('char-name').disabled = mode === 'edit';
  $('char-title').textContent = mode === 'edit' ? 'Modifier mon personnage' : 'Nouveau personnage';
  $('char-ok').textContent = mode === 'edit' ? 'Enregistrer' : mode === 'complete' ? 'Reprendre la partie' : 'Commencer la partie';
  $('char-hint').textContent = mode === 'edit' ? 'Le nom ne peut pas être modifié.'
    : mode === 'complete' ? 'Votre partie est conservée : choisissez simplement votre nom et votre apparence.' : '';
  openPanel('char');
  if (mode !== 'edit') setTimeout(() => $('char-name').focus(), 50);
}

function renderCharEditor() {
  $('char-opts').innerHTML = LOOK_OPTIONS.map((o) => {
    const v = charDraft[o.key];
    const body = o.colors
      ? `<div class="swatches">${o.colors.map((col) => `<button class="swatch ${col === v ? 'active' : ''}" style="background:${col}" data-look="${o.key}" data-val="${col}" title="${col}"></button>`).join('')}</div>`
      : `<div class="chips">${o.choices.map(([val, lab]) => `<button class="btn ${val === v ? 'active' : ''}" data-look="${o.key}" data-val="${val}">${lab}</button>`).join('')}</div>`;
    return `<div class="char-row"><div class="char-label">${o.label}</div>${body}</div>`;
  }).join('');
  drawCharPreview();
}

// Aperçu : le personnage dans sa barque, sur un petit bout de lac
function drawCharPreview() {
  const cv = $('char-canvas');
  const c = cv.getContext('2d');
  ditherGradient(c, 0, 0, cv.width, 30, ['#5a8fe4', '#a8d2f8', '#d2ecfc']);
  ditherGradient(c, 0, 30, cv.width, 20, ['#86cff2', '#3384c4', '#1b4c86']);
  pxRect(c, 0, 30, cv.width, 1, '#c4ecff');
  const boat = buildBoat(charMode === 'edit' ? currentLook(charDraft) : validLook(charDraft));
  c.drawImage(boat, 24 + BOAT_SPR.px, BOAT_SPR.py, 76, 48, 0, 4, 76, 48);
}

$('char-opts').addEventListener('click', (e) => {
  const b = e.target.closest('[data-look]');
  if (!b) return;
  charDraft[b.dataset.look] = b.dataset.val;
  Sound.click();
  renderCharEditor();
});
$('char-random').addEventListener('click', () => {
  charDraft = { ...randomLook(charDraft.name), gear: charDraft.gear };
  Sound.click();
  renderCharEditor();
});
$('char-name').addEventListener('input', (e) => {
  charDraft.name = e.target.value.slice(0, NAME_MAX);
  $('char-hint').textContent = '';
});
$('char-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('char-ok').click(); });

$('char-ok').addEventListener('click', () => {
  if (charMode === 'edit') {
    progress.look = { ...validLook(charDraft), name: progress.look.name };
    refreshBoat();
    writeSave();
    updateHud();
    openPanel('sheet');
    return;
  }
  const name = charDraft.name.trim();
  if (!name) {
    $('char-hint').textContent = 'Choisissez un nom pour votre personnage.';
    $('char-name').focus();
    Sound.miss();
    return;
  }
  if (!LB_NAME_RE.test(name.normalize('NFC'))) {
    $('char-hint').textContent = "Le nom ne peut contenir que des lettres, des chiffres, des espaces et ' . _ -";
    $('char-name').focus();
    Sound.miss();
    return;
  }
  const look = validLook({ ...charDraft, name: name.normalize('NFC') });
  const isNew = charMode === 'create';
  if (isNew) {
    clearSave();
    progress = emptyProgress();
  }
  progress.look = look;
  writeSave();
  closePanel();
  // nouvelle partie : la cinématique d'ouverture (retour au village natal), puis le lac
  if (isNew) {
    fisherSpriteCache = null;
    startIntro(() => {
      enterGame();
      pushToast({ icon: ICONS.village, label: 'Bienvenue à', title: VILLAGE_NAME,
        sub: 'Le village vous attend (touche V) : ses habitants ont hâte de vous revoir.', sound: () => Sound.chestAppear() });
    });
  } else enterGame();
});
$('char-cancel').addEventListener('click', () => {
  Sound.click();
  if (charMode === 'edit') openPanel('sheet');
  else { closePanel(); refreshMenu(); }
});

$('btn-options').addEventListener('click', () => openPanel('options'));
$('btn-leaderboard').addEventListener('click', () => openPanel('leaderboard'));

// ---------------------------------------------------------------------------
// Classement en ligne, sur le même serveur que la sauvegarde en ligne (server/cloud-save/) :
//  - « Envoyer mon score » active la sauvegarde en ligne si besoin, puis inscrit le pseudo ;
//  - le score est calculé par le serveur à partir de la sauvegarde en ligne (protégée par la clé),
//    puis mis à jour à chaque envoi de sauvegarde ;
//  - le jeu lit les 50 premiers de chaque catégorie (GET /v1/leaderboard).
// ---------------------------------------------------------------------------
// même règle que le serveur (NAME_RE dans worker.js) : vérifiée dès la création du personnage
const LB_NAME_RE = /^[\p{L}\p{M}\p{N} '’._-]{1,16}$/u;
const LB_CACHE_MS = 30 * 1000;            // une catégorie déjà chargée n'est pas redemandée avant 30 s
const LB_CATS = [
  { id: 'earned',   name: 'Pièces gagnées',   val: (p) => p.earned,           fmt: (p) => `${fmtNum(p.earned)} ${coinImg()}` },
  { id: 'heaviest', name: 'Plus grosse prise', val: (p) => p.heaviest?.kg || 0, fmt: (p) => (p.heaviest?.kg ? `${fmtKg(p.heaviest.kg)} · ${escapeHtml(p.heaviest.fish)}` : '—') },
  { id: 'dex',      name: 'Carnet',           val: (p) => p.dex,              fmt: (p) => `${fmtNum(p.dex)} / ${dexTotal()}` },
  { id: 'days',     name: 'Jours au lac',     val: (p) => p.days,             fmt: (p) => `${fmtNum(p.days)} jour${p.days > 1 ? 's' : ''}` },
  { id: 'boat',     name: 'Bateau',           val: (p) => p.boat,             fmt: (p) => `${BOATS[p.boat - 1]?.name || '?'} (niv. ${fmtNum(p.boat)})` },
  { id: 'cthulhu',  name: 'Grand Ancien',     val: (p) => p.cthulhu,          fmt: (p) => `${fmtNum(p.cthulhu)} fois` },
];
const lbData = {};                        // par catégorie : { at, updated, total, players }
let lbCat = 'earned';
let lbStatus = '';
let lbHint = '';                          // message d'envoi (prioritaire sur la consigne par défaut)
let lbBusy = false;
const LB_MAX_BYTES = 256 * 1024;          // 50 joueurs pèsent ~10 Ko

// Le classement téléchargé est une donnée réseau non fiable : chaque joueur est reconstruit
// champ par champ (textes coupés, nombres finis et bornés), le reste est ignoré.
function validBoard(b) {
  const n = (x, max) => vNum(x, max);
  const str = (x, max) => (typeof x === 'string' ? x.slice(0, max) : '');
  const board = vObj(b);
  return {
    updated: vInt(board.updated, 1e14) || null,
    total: vInt(board.total, 1e9),
    players: vArr(board.players).slice(0, 100).filter(isObj).map((p) => ({
      name: str(p.name, 16),
      earned: n(p.earned, 1e12), caught: n(p.caught, 1e9), aboms: n(p.aboms, 1e9), dex: n(p.dex, 1000),
      days: n(p.days, 1e7), boat: Math.round(n(p.boat, BOAT_MAX)), cthulhu: n(p.cthulhu, 1e7), playTime: n(p.playTime, 1e10),
      heaviest: isObj(p.heaviest) ? { kg: n(p.heaviest.kg, 40000), fish: str(p.heaviest.fish, 40) } : null,
    })),
  };
}

async function loadLeaderboard(force = false) {
  const cat = lbCat;
  if (!cloudOn()) { lbStatus = 'Classement indisponible.'; renderLeaderboard(); return; }
  if (!force && lbData[cat] && Date.now() - lbData[cat].at < LB_CACHE_MS) { lbStatus = ''; renderLeaderboard(); return; }
  lbStatus = lbData[cat] ? '' : 'Chargement du classement…';
  renderLeaderboard();
  try {
    const res = await fetch(`${CLOUD_SAVE.url}/v1/leaderboard?cat=${encodeURIComponent(cat)}`, {
      cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(res.status);
    const text = await res.text();
    if (text.length > LB_MAX_BYTES) throw new Error('classement trop volumineux');
    lbData[cat] = { ...validBoard(JSON.parse(text)), at: Date.now() };
    if (cat === lbCat) lbStatus = '';
  } catch {
    if (cat === lbCat && !lbData[cat]) lbStatus = 'Impossible de charger le classement (pas de connexion ?).';
  }
  if (openPanelName === 'leaderboard' && cat === lbCat) renderLeaderboard();
}

function renderLeaderboard() {
  $('lb-tabs').innerHTML = LB_CATS.map((c) => `<button class="btn tab-lb ${c.id === lbCat ? 'active' : ''}" data-lb="${c.id}">${c.name}</button>`).join('');
  const cat = LB_CATS.find((c) => c.id === lbCat);
  const me = normName(progress.look?.name);
  const data = lbData[lbCat];
  const players = (data?.players || []).filter((p) => cat.val(p) > 0).sort((a, b) => cat.val(b) - cat.val(a)).slice(0, 50);
  $('lb-list').innerHTML = lbStatus ? `<p class="lb-empty">${escapeHtml(lbStatus)}</p>`
    : players.length ? players.map((p, i) => `
      <div class="lb-row ${inGame && normName(p.name) === me ? 'me' : ''} ${i < 3 ? `top${i + 1}` : ''}">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-name">${escapeHtml(p.name)}</span>
        <span class="lb-val">${cat.fmt(p)}</span>
      </div>`).join('')
    : '<p class="lb-empty">Personne au classement pour le moment. Soyez le premier !</p>';
  $('lb-updated').textContent = data?.updated
    ? `${fmtNum(data.total)} joueur${data.total > 1 ? 's' : ''} · mis à jour le ${fmtWhen(data.updated)}` : '';
  const ranked = !!cloud.link?.ranked;
  const btn = $('lb-submit');
  btn.disabled = !inGame || admin.on || lbBusy || !cloudOn();
  btn.textContent = ranked ? 'Mettre à jour mon score' : 'Envoyer mon score';
  $('lb-hint').textContent = lbHint || (!inGame ? 'Lancez une partie pour envoyer votre score.'
    : admin.on ? 'Les scores ne peuvent pas être envoyés en mode admin.'
    : ranked ? 'Vous êtes au classement : votre score se met à jour tout seul à chaque sauvegarde en ligne.'
    : 'Votre score est calculé à partir de votre sauvegarde en ligne (activée au besoin), puis mis à jour à chaque sauvegarde.');
}

async function submitScore() {
  if (!inGame || admin.on || lbBusy || !cloudOn()) return;
  const name = (progress.look?.name || '').normalize('NFC');
  if (!LB_NAME_RE.test(name)) {
    lbHint = "Votre nom contient des caractères refusés par le classement (autorisés : lettres, chiffres, espace, ' . _ -) : le score ne peut pas être envoyé.";
    renderLeaderboard();
    return;
  }
  Sound.click();
  lbBusy = true;
  lbHint = 'Envoi du score…';
  renderLeaderboard();
  try {
    // 1. sauvegarde en ligne (le score en est tiré par le serveur)
    if (!cloud.link && !(await cloudEnable())) { lbHint = cloud.msg || 'Sauvegarde en ligne impossible.'; return; }
    writeSave(true);
    await cloudPush({ silent: true });             // « trop_tot » : la version en ligne date de moins de 20 s
    if (cloud.conflict) { lbHint = 'Une version plus avancée de votre partie existe en ligne : choisissez laquelle garder dans Options › Sauvegarde en ligne.'; return; }
    // 2. inscription / mise à jour au classement
    const r = await cloudCall('/v1/score', { name: cloud.link.name, key: cloud.link.key, fish: bestFishName(progress) });
    cloudSetLink({ ...cloud.link, ranked: true });
    lbHint = `Score enregistré ! Rang ${fmtNum(vInt(r.rank, 1e9))} sur ${fmtNum(vInt(r.total, 1e9))} (pièces gagnées). Il se mettra à jour tout seul à chaque sauvegarde.`;
    Sound.chestGet();
    loadLeaderboard(true);
  } catch (e) {
    lbHint = e.message || 'Envoi impossible.';
  } finally {
    lbBusy = false;
    renderLeaderboard();
  }
}

$('lb-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-lb]');
  if (!b) return;
  lbCat = b.dataset.lb;
  Sound.click();
  loadLeaderboard();
});
$('lb-refresh').addEventListener('click', () => { Sound.click(); loadLeaderboard(true); });
$('lb-submit').addEventListener('click', submitScore);

$('btn-menu').addEventListener('click', (e) => {
  e.currentTarget.blur();
  Sound.click();
  showMenu();
});

// ===========================================================================
// Malédictions : Morgane des Brumes propose chaque jour 3 malédictions (bonus + malus).
// Une seule peut être acceptée par jour ; elle dure jusqu'au jour suivant.
// ===========================================================================
const cursesUnlocked = () => (progress.stats.aboms || 0) >= 1 || admin.on;
const activeCurse = () => {
  const cu = progress.curse;
  return inGame && cu?.active && cu.day === dayOf(progress.clock) ? CURSE_BY_ID[cu.active] : null;
};
const curseNotify = () => cursesUnlocked() && !progress.curse.decided;

// Nouveau jour : la malédiction de la veille se dissipe, 3 nouvelles offres (jamais celle de la veille)
function refreshCurseDay(announce) {
  if (!cursesUnlocked()) return;
  const d = dayOf(progress.clock);
  const cu = progress.curse;
  if (cu.day === d && cu.offers.length === CURSE_OFFERS) return;
  const ended = cu.active ? CURSE_BY_ID[cu.active] : null;
  const pool = CURSES.filter((c) => c.id !== cu.active);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  progress.curse = { day: d, offers: pool.slice(0, CURSE_OFFERS).map((c) => c.id), active: null, decided: false };
  invalidateMods();
  updateCurseButton();
  if (openPanelName === 'curses') renderCurses();
  if (announce) {
    pushToast({ icon: ICONS.witch, label: WITCH.name,
      title: ended ? `${ended.name} se dissipe` : 'De nouvelles malédictions',
      sub: 'Trois nouvelles malédictions vous attendent (touche M).', sound: () => Sound.chestAppear() });
  }
}

function unlockCurses() {
  refreshCurseDay(false);
  pushToast({ icon: ICONS.witch, label: 'Une silhouette sur la rive', title: WITCH.name,
    sub: 'Une lumière verte brille dans la cabane de la sorcière, au village (touche M).', sound: () => Sound.curse() });
}

function acceptCurse(id) {
  const cu = progress.curse;
  if (cu.decided || !cu.offers.includes(id)) return;
  cu.active = id;
  cu.decided = true;
  progress.stats.curses = (progress.stats.curses || 0) + 1;
  invalidateMods();
  Sound.curse();
  writeSave();
  updateHud();
  checkAchievements();
}
function refuseCurses() {
  const cu = progress.curse;
  if (cu.decided) return;
  cu.decided = true;
  Sound.click();
  writeSave();
  updateHud();
}

let witchLine = '';
const fxSpans = (fx, cls, mark) => fxLines(fx).map((l) => `<span class="${cls}">${mark} ${l}</span>`).join('');

function renderCurses() {
  const cu = progress.curse;
  const active = activeCurse();
  $('witch-name').textContent = WITCH.name;
  $('witch-line').textContent = active ? `Le pacte est scellé : « ${active.name} ». Il te tiendra jusqu'à l'aube du jour ${cu.day + 1}…`
    : cu.decided ? "Comme tu voudras. Le lac, lui, n'oublie rien. Reviens demain."
    : witchLine;
  $('curse-list').innerHTML = cu.offers.map((id) => {
    const c = CURSE_BY_ID[id];
    const chosen = cu.active === id;
    return `
      <div class="curse-card ${chosen ? 'chosen' : ''} ${cu.decided && !chosen ? 'dim' : ''}" style="--cc:${c.color}">
        <div class="curse-head"><img src="${curseIcon(c)}" alt=""><b>${c.name}</b></div>
        <p class="curse-desc">${c.desc}</p>
        <div class="curse-fx">${fxSpans(c.buff, 'up', '▲')}${fxSpans(c.debuff, 'down', '▼')}</div>
        ${chosen ? '<div class="curse-tag">Active</div>'
          : `<button class="btn" data-curse="${c.id}" ${cu.decided ? 'disabled' : ''}>Accepter</button>`}
      </div>`;
  }).join('');
  const left = Math.max(0, cu.day * DAY_LEN - progress.clock);
  $('curse-status').textContent = active ? `Fin de la malédiction dans ${fmtTime(left)} (au jour ${cu.day + 1}).`
    : cu.decided ? `Nouvelles malédictions dans ${fmtTime(left)}.`
    : 'Une seule malédiction par jour. Elle dure jusqu\'au lendemain.';
  $('curse-refuse').hidden = cu.decided;
}

$('curse-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-curse]');
  if (!b || b.disabled) return;
  acceptCurse(b.dataset.curse);
  renderCurses();
});
$('curse-refuse').addEventListener('click', () => { refuseCurses(); renderCurses(); });

// Pastille sur le bouton Village : malédictions à choisir, ou un habitant pas encore rencontré
function updateCurseButton() {
  const unmet = NPCS.some((n) => !progress.met[n.id] && (n.id !== 'witch' || cursesUnlocked()));
  $('btn-village').classList.toggle('notify', inGame && (curseNotify() || unmet));
}

// ===========================================================================
// Village : plan cliquable, habitants, dialogues de présentation.
// Dialogues : données simples (listes de répliques dans village.js) lues par un petit « lecteur »
// à effet machine à écrire ; la rencontre de chaque habitant est mémorisée dans la sauvegarde.
// ===========================================================================
const fillText = (t) => t.replaceAll('{nom}', validLook(progress.look).name || 'pêcheur')
  .replaceAll('{pecheur}', fisherWord(validLook(progress.look).sex));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Machine à écrire : révèle le texte petit à petit ; full() affiche tout d'un coup
function makeTyper(el, speed = 45) {
  return {
    text: '', shown: 0,
    set(t) { this.text = t; this.shown = 0; el.textContent = ''; },
    update(dt) {
      if (this.shown >= this.text.length) return;
      this.shown = Math.min(this.text.length, this.shown + dt * speed);
      el.textContent = this.text.slice(0, Math.floor(this.shown));
    },
    done() { return this.shown >= this.text.length; },
    full() { this.shown = this.text.length; el.textContent = this.text; },
  };
}

// Portraits des habitants : leur personnage (character.js) en buste, ou l'icône de la sorcière
const portraitCache = {};
function npcPortrait(npc) {
  if (npc.icon) return ICONS[npc.icon];
  if (portraitCache[npc.id]) return portraitCache[npc.id];
  const cv = makeCanvas(20, 20);
  cv.getContext('2d').drawImage(buildFisherSprite({ ...npc.look, gear: 'off' }), 0, 0, 18, 18, 1, 1, 18, 18);
  pixelize(cv, '#1e140c');
  return (portraitCache[npc.id] = cv.toDataURL());
}
function npcBar(id) {
  const npc = NPC_BY_ID[id];
  return `<img src="${npcPortrait(npc)}" alt=""><div><b>${escapeHtml(npc.name)}</b> <small>${escapeHtml(npc.role)}</small>
    <p>« ${escapeHtml(fillText(pick(npc.greet)))} »</p></div>`;
}

// --- dialogue de présentation
const talk = { npc: null, lines: [], i: 0, then: null, typer: null };
function startTalk(npc, lines, then) {
  talk.npc = npc;
  talk.lines = lines.map(fillText);
  talk.i = 0;
  talk.then = then;
  talk.typer ||= makeTyper($('talk-text'));
  $('talk-portrait').src = npcPortrait(npc);
  $('talk-name').textContent = npc.name;
  $('talk-role').textContent = `${npc.role} · ${npc.building}`;
  openPanel('talk');
  showTalkLine();
}
function showTalkLine() {
  talk.typer.set(talk.lines[talk.i]);
  $('talk-step').textContent = `${talk.i + 1} / ${talk.lines.length}`;
  $('talk-next').textContent = talk.i === talk.lines.length - 1 ? 'Entrer ›' : 'Suivant ›';
}
function talkNext() {
  if (!talk.typer.done()) { talk.typer.full(); return; }   // un clic affiche d'abord toute la réplique
  if (++talk.i < talk.lines.length) { showTalkLine(); Sound.page(); return; }
  endTalk();
}
function endTalk() {
  progress.met[talk.npc.id] = true;
  writeSave();
  updateCurseButton();
  checkAchievements();
  const then = talk.then;
  talk.then = null;
  then?.();
}
$('talk-next').addEventListener('click', talkNext);
$('talk-skip').addEventListener('click', () => { Sound.click(); endTalk(); });
$('panel-talk').addEventListener('click', (e) => { if (!e.target.closest('button')) talkNext(); });

// --- entrer dans un bâtiment : présentation à la première visite, puis le service de l'habitant
function openNpc(id) {
  const npc = NPC_BY_ID[id];
  if (!npc || !inGame) return;
  if (id === 'witch' && !cursesUnlocked()) {
    if (openPanelName !== 'village') openPanel('village');
    $('village-hint').textContent = 'Les volets de la cabane sont clos. Une odeur de soufre flotte… Revenez quand le lac vous aura montré ses abominations.';
    Sound.miss();
    return;
  }
  if (!progress.met[id]) startTalk(npc, npc.intro, () => openService(id));
  else openService(id);
}
function openService(id) {
  $('shop-npc').dataset.owner = '';            // nouvelle salutation à chaque entrée
  if (id === 'witch') openPanel('curses');
  else if (id === 'bric') { shopMode = 'bric'; if (shopTab === 'yard') shopTab = 'stock'; openPanel('shop'); }
  else if (id === 'yard') { shopMode = 'yard'; shopTab = 'yard'; openPanel('shop'); }
  else if (id === 'bank') openPanel('bank');
  else if (id === 'fish') openPanel('fishmonger');
}

// --- le plan du village
let villageArt = null;
function renderVillage() {
  $('village-title').textContent = VILLAGE_NAME;
  $('village-hint').textContent = TOUCH ? 'Touchez un bâtiment pour entrer.' : 'Cliquez sur un bâtiment pour entrer.';
  $('village-spots').innerHTML = VILLAGE_SPOTS.map((s) => {
    const npc = NPC_BY_ID[s.npc];
    const locked = s.npc === 'witch' && !cursesUnlocked();
    const badge = !locked && (!progress.met[s.npc] || (s.npc === 'witch' && curseNotify()));
    return `<button class="v-spot ${locked ? 'locked' : ''}" data-npc="${s.npc}"
      style="left:${(s.x / LW) * 100}%;top:${(s.y / LH) * 100}%;width:${(s.w / LW) * 100}%;height:${(s.h / LH) * 100}%"
      title="${escapeHtml(locked ? 'Volets clos' : `${npc.building} — ${npc.name}`)}">
      <span class="v-label">${escapeHtml(locked ? '???' : npc.building)}${badge ? ` <i class="v-badge">${progress.met[s.npc] ? '!' : 'nouveau'}</i>` : ''}</span></button>`;
  }).join('');
}
// Dessin animé du plan (fumée des cheminées, lumière selon l'heure), seulement panneau ouvert
function drawVillageFrame() {
  const cv = $('village-canvas');
  const c = cv.getContext('2d');
  villageArt ||= buildVillageArt();
  c.drawImage(villageArt, 0, 0);
  // reflets qui glissent sur le lac
  c.fillStyle = VPAL.waterL;
  for (let k = 0; k < 14; k++) {
    const x = Math.round(((k * 67 + time * (4 + (k % 3) * 2)) % (LW + 20)) - 10);
    c.fillRect(x, VILLAGE_FX.waterY + 6 + ((k * 13) % 40), 3 + (k % 3), 1);
  }
  // jets de la fontaine
  const f = VILLAGE_FX.fountain;
  c.fillStyle = VPAL.waterL;
  for (let k = 0; k < 6; k++) {
    const p = (time * 0.9 + k / 6) % 1, sd = k % 2 ? 1 : -1;
    c.fillRect(Math.round(f.x + sd * (2 + p * 9)), Math.round(f.y - 15 - Math.sin(p * Math.PI) * 6 + p * 12), 1, 2);
  }
  // fumées des cheminées
  for (const s of VILLAGE_FX.smoke) {
    for (let k = 0; k < 5; k++) {
      const p = (time * 0.3 + k / 5) % 1;
      c.globalAlpha = 0.65 * (1 - p);
      pxDisk(c, s.x + Math.sin(time + k * 2) * 2 + p * 6, s.y - p * 26, 1 + Math.round(p * 3), s.col);
    }
  }
  c.globalAlpha = 1;
  // la nuit : tout s'assombrit, sauf les lampadaires et les fenêtres de la sorcière
  if (wv.dark > 0.05) {
    c.fillStyle = `rgba(6, 10, 34, ${wv.dark * 0.55})`;
    c.fillRect(0, 0, LW, LH);
    // halos dégradés des lampadaires (trois cercles de plus en plus lumineux)
    for (const [r, a] of [[16, 0.12], [11, 0.16], [6, 0.22]]) {
      c.globalAlpha = wv.dark * a;
      for (const l of VILLAGE_FX.lamps) pxDisk(c, l.x + 1, l.y + 2, r, '#ffd27a');
    }
    c.globalAlpha = wv.dark;
    for (const l of VILLAGE_FX.lamps) pxRect(c, l.x - 1, l.y + 1, 4, 3, '#fff3b8');
    // fenêtres allumées (vertes chez la sorcière)
    c.globalAlpha = wv.dark * 0.85;
    for (const w of VILLAGE_FX.windows) { c.fillStyle = w.col; c.fillRect(w.x, w.y, w.w, w.h); }
    c.globalAlpha = 1;
  }
}
$('village-spots').addEventListener('click', (e) => {
  const b = e.target.closest('[data-npc]');
  if (b) openNpc(b.dataset.npc);
});

// ---------------------------------------------------------------------------
// Banque : dépôts, retraits, intérêts quotidiens selon le cours du poisson
// ---------------------------------------------------------------------------
function renderBank() {
  const mk = progress.market;
  const prev = mk.history.length > 1 ? mk.history[mk.history.length - 2] : mk.index;
  const change = prev ? ((mk.index - prev) / prev) * 100 : 0;
  const arrow = change > 0.05 ? '▲' : change < -0.05 ? '▼' : '■';
  const rows = [
    ['En poche', `${fmtNum(progress.money)} ${coinImg()}`],
    ['Sur votre compte', `${fmtNum(progress.bank)} ${coinImg()}`],
    ['Cours du poisson', `${fmtIndex(mk.index)} <span class="${change >= 0 ? 'up' : 'down'}">${arrow} ${fmtIndex(Math.abs(change))} %</span>`],
    ['Taux du jour', `${fmtIndex(bankRate(mk.index) * 100)} % par jour`],
    ['Intérêts de demain', `${fmtNum(Math.min(BANK.maxInterest, Math.floor(progress.bank * bankRate(mk.index))))} ${coinImg()} (environ)`],
    ['Intérêts reçus', `${fmtNum(progress.stats.interest || 0)} ${coinImg()}`],
  ];
  $('bank-table').innerHTML = rows.map(([a, v]) => `<tr><td>${a}</td><td>${v}</td></tr>`).join('');
  const hist = mk.history;
  $('bank-note').textContent = `Sur ${hist.length} jour${hist.length > 1 ? 's' : ''} : de ${fmtIndex(Math.min(...hist))} à ${fmtIndex(Math.max(...hist))}. ` +
    `Le cours fixe le taux de la banque et le prix de rachat du poissonnier. Intérêts plafonnés à ${fmtNum(BANK.maxInterest)} pièces par jour.`;
  drawBankChart();
}

function drawBankChart() {
  const cv = $('bank-chart');
  const c = cv.getContext('2d');
  const W = cv.width, H = cv.height, pad = 8;
  pxRect(c, 0, 0, W, H, '#1a2050');
  const hist = progress.market.history;
  const lo = Math.min(MARKET.base * 0.8, ...hist) - 5, hi = Math.max(MARKET.base * 1.2, ...hist) + 5;
  const yOf = (v) => Math.round(H - pad - ((v - lo) / (hi - lo)) * (H - 2 * pad));
  const xOf = (i) => Math.round(pad + (hist.length > 1 ? (i / (hist.length - 1)) * (W - 2 * pad) : (W - 2 * pad) / 2));
  for (let x = pad; x < W - pad; x += 4) pxRect(c, x, yOf(MARKET.base), 2, 1, '#5a64a0');   // repère « 100 »
  for (let i = 1; i < hist.length; i++) pxLine(c, xOf(i - 1), yOf(hist[i - 1]), xOf(i), yOf(hist[i]), hist[i] >= hist[i - 1] ? '#7cf08a' : '#ff7a6a');
  const last = hist.length - 1;
  pxDisk(c, xOf(last), yOf(hist[last]), 2, '#ffd84a');
}

const bankMsg = (t) => { $('bank-msg').textContent = t; };
$('panel-bank').addEventListener('click', (e) => {
  const b = e.target.closest('[data-bank]');
  if (!b) return;
  const raw = Number($('bank-amount').value);
  const amount = Number.isFinite(raw) ? Math.floor(raw) : 0;
  const op = b.dataset.bank;
  let n = 0;
  if (op === 'deposit-all') n = progress.money;
  else if (op === 'withdraw-all') n = progress.bank;
  else n = amount;
  const deposit = op.startsWith('deposit');
  const max = deposit ? progress.money : progress.bank;
  if (!(n > 0)) { bankMsg('Indiquez un montant (nombre entier de pièces).'); Sound.miss(); return; }
  if (n > max) { bankMsg(deposit ? "Vous n'avez pas autant de pièces en poche." : "Votre compte n'en contient pas autant."); Sound.miss(); return; }
  if (deposit) { progress.money -= n; progress.bank += n; } else { progress.bank -= n; progress.money += n; }
  bankMsg(`${deposit ? 'Dépôt' : 'Retrait'} de ${fmtNum(n)} pièces effectué.`);
  $('bank-amount').value = '';
  Sound.buy();
  writeSave();
  updateHud();
  renderBank();
  checkAchievements();
});

// ---------------------------------------------------------------------------
// Poissonnerie : rachat des prises de la bourriche, au cours du jour
// ---------------------------------------------------------------------------
// Prises regroupées par espèce (et abomination), les plus chères d'abord
function catchStacks() {
  const map = new Map();
  for (const c of progress.catches) {
    const k = `${c.id}:${c.abom ? 1 : 0}`;
    if (!map.has(k)) map.set(k, { f: creature(c.id), abom: c.abom, list: [] });
    map.get(k).list.push(c);
  }
  return [...map.values()].map((s) => ({ ...s, value: s.list.reduce((t, c) => t + fishPrice(c), 0) }))
    .sort((a, b) => b.value - a.value);
}

let catchCanvases = [];
// sellable : boutons de vente (poissonnerie) ; sinon simple consultation (profil)
function renderCatchList(el, sellable) {
  const stacks = catchStacks();
  el.innerHTML = stacks.length ? stacks.map((s, i) => {
    const w = s.list.reduce((t, c) => t + c.w, 0);
    return `
      <div class="item catch-row ${s.abom ? 'abom' : ''}">
        <canvas class="px catch-canvas" width="100" height="72" data-k="${i}"></canvas>
        <div class="info"><b>${s.list.length > 1 ? `${s.list.length} × ` : ''}${fishName(s.f, s.abom)}</b>
          <small>${s.abom ? 'Abomination · ' : ''}${RARITIES[s.f.tier].name} · ${fmtKg(w)} au total</small></div>
        <div class="money">${fmtNum(s.value)} ${coinImg()}</div>
        ${sellable ? `<div class="actions">
          <button class="btn" data-sell-one="${s.list[0].uid}">Vendre 1</button>
          ${s.list.length > 1 ? `<button class="btn" data-sell-stack="${i}">Tout (${s.list.length})</button>` : ''}
        </div>` : ''}
      </div>`;
  }).join('') : `<p class="pot-empty">La bourriche est vide. Allez pêcher !</p>`;
  // les créatures sont dessinées une seule fois (pas d'animation ici : liste potentiellement longue)
  el.querySelectorAll('canvas[data-k]').forEach((cv) => {
    const s = stacks[+cv.dataset.k];
    renderFishCanvas(cv, s.f, { abom: s.abom, t: 0 });
  });
  return stacks;
}

let fmStacks = [];
function renderFishmonger() {
  const mk = progress.market;
  $('fm-index').innerHTML = `Cours du jour : ${fmtIndex(mk.index)}`;
  fmStacks = renderCatchList($('fm-list'), true);
  const total = keepnetValue();
  $('fm-total').innerHTML = `Bourriche : ${progress.catches.length} / ${keepnetSize()} prises · ${fmtNum(total)} ${coinImg()}`;
  $('fm-sell-all').disabled = !progress.catches.length;
}

function sellCatches(uids) {
  const set = new Set(uids);
  let total = 0, n = 0;
  progress.catches = progress.catches.filter((c) => {
    if (!set.has(c.uid)) return true;
    total += fishPrice(c);
    n++;
    return false;
  });
  if (!n) return;
  progress.money += total;
  progress.stats.earned += total;
  progress.stats.fishSold = (progress.stats.fishSold || 0) + n;
  $('fm-npc').querySelector('p').textContent = `« ${n > 1 ? `${n} prises` : 'Une prise'} pour ${fmtNum(total)} pièces. Affaire conclue ! »`;
  Sound.sell();
  writeSave();
  updateHud();
  renderFishmonger();
  checkAchievements({ type: 'sale', total });
}
$('fm-list').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.sellOne) sellCatches([+b.dataset.sellOne]);
  else if (b.dataset.sellStack) sellCatches(fmStacks[+b.dataset.sellStack].list.map((c) => c.uid));
});
$('fm-sell-all').addEventListener('click', () => sellCatches(progress.catches.map((c) => c.uid)));

// ---------------------------------------------------------------------------
// Cinématique d'ouverture : scènes dessinées dans le canvas du jeu + narration
// ---------------------------------------------------------------------------
const cine = { on: false, i: 0, t: 0, typer: null, then: null, art: null };
function startIntro(then) {
  cine.on = true;
  cine.i = 0;
  cine.then = then;
  cine.typer ||= makeTyper($('cine-text'), 38);
  cine.art ||= { office: buildOfficeArt(), road: buildRoadArt(), car: buildCarSprite() };
  villageArt ||= buildVillageArt();
  refreshBoat();
  closePanel();
  $('menu').hidden = true;
  $('hud').hidden = true;
  $('now-playing').hidden = true;
  $('cine').hidden = false;
  showCineScene();
}
function showCineScene() {
  cine.t = 0;
  cine.typer.set(fillText(INTRO_SCENES[cine.i].text));
  $('cine-step').textContent = `${cine.i + 1} / ${INTRO_SCENES.length}`;
  $('cine-next').textContent = cine.i === INTRO_SCENES.length - 1 ? 'Commencer ›' : 'Suivant ›';
}
function cineNext() {
  if (!cine.typer.done()) { cine.typer.full(); return; }
  if (++cine.i < INTRO_SCENES.length) { showCineScene(); Sound.page(); return; }
  endIntro();
}
function endIntro() {
  if (!cine.on) return;
  cine.on = false;
  $('cine').hidden = true;
  $('now-playing').hidden = false;
  Sound.click();
  const then = cine.then;
  cine.then = null;
  then?.();
}
$('cine-next').addEventListener('click', cineNext);
$('cine-skip').addEventListener('click', endIntro);
$('cine').addEventListener('click', (e) => { if (!e.target.closest('button')) cineNext(); });

// Décor de la scène en cours (fondu d'entrée sur chaque scène)
function drawCine(dt) {
  cine.t += dt;
  time += dt;                                      // anime l'eau et les nuages du lac
  cine.typer.update(dt);
  const sc = INTRO_SCENES[cine.i].scene;
  const t = cine.t;
  if (sc === 'office') {
    ctx.drawImage(cine.art.office, 0, 0);
    // la pluie sur la vitre et le néon qui grésille
    ctx.fillStyle = '#c8dcf2';
    for (let k = 0; k < 30; k++) ctx.fillRect(304 + ((k * 37) % 132), 34 + ((k * 53 + t * 90) % 82), 1, 3);
    if (Math.sin(t * 13) > 0.92) { ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; ctx.fillRect(0, 0, LW, LH); }
    if (cine.i === 0) ctx.drawImage(buildFisherSpriteCached(), 100, 130, 36, 42);   // au bureau, derrière les dossiers
    else {                                                                // la lettre, la chaise vide
      pxRect(ctx, 182, 160, 22, 8, '#f4f0e6');
      pxRect(ctx, 186, 162, 14, 1, '#8a8a90');
      pxRect(ctx, 186, 164, 10, 1, '#8a8a90');
      pxRect(ctx, 196, 164, 5, 3, '#c64a35');
    }
  } else if (sc === 'road') {
    const { far, near } = cine.art.road;
    const o1 = Math.floor((t * 12) % LW), o2 = Math.floor((t * 60) % LW);
    ctx.drawImage(far, -o1, 0); ctx.drawImage(far, LW - o1, 0);
    ctx.drawImage(near, -o2, 0); ctx.drawImage(near, LW - o2, 0);
    ctx.drawImage(cine.art.car, 200, 188 + Math.round(Math.sin(t * 18) * 0.6));
  } else if (sc === 'village') {
    ctx.drawImage(villageArt, 0, 0);
    ctx.fillStyle = 'rgba(255, 140, 70, 0.18)';                            // lumière de fin d'après-midi
    ctx.fillRect(0, 0, LW, LH);
  } else if (sc === 'pier') {
    // gros plan (×2) sur le ponton du village (x 224-256, y 214-270), cadré en haut de l'écran pour
    // rester au-dessus de la narration : Papi Émile assis au bout, qui fait signe ; à la première
    // scène, le personnage descend le ponton pour le rejoindre. Tout est dessiné sur une petite toile
    // à l'échelle du village, puis agrandi sans lissage.
    const SX = 112, SY = 185, SW = LW / 2, SH = LH / 2;
    const zc = (cine.art.pierCv ||= makeCanvas(SW, SH)).getContext('2d');
    zc.fillStyle = VPAL.waterD;
    zc.fillRect(0, 0, SW, SH);
    zc.drawImage(villageArt, -SX, -SY);
    for (let k = 0; k < 6; k++) {                                         // vaguelettes sous le ponton
      const wx = (k * 47 + Math.floor(t * 6)) % SW, wy = 90 + ((k * 23) % 40);
      pxRect(zc, wx, wy, 4, 1, VPAL.waterL);
    }
    cine.art.papi ||= buildFisherSprite({ ...GRANDPA.look, gear: 'off' });
    const wave = Math.sin(t * 7) > 0.5 ? -1 : 0;
    zc.drawImage(cine.art.papi, 225 - SX, 244 - SY + wave);
    const first = INTRO_SCENES[cine.i - 1]?.scene !== 'pier';
    const y = first ? Math.round(lerp(196, 226, clamp(t / 2.4, 0, 1))) : 226;
    zc.drawImage(buildFisherSpriteCached(), 237 - SX, y - SY + (first && t < 2.4 ? (Math.floor(t * 6) % 2) : 0));
    if (wave && Math.sin(t * 1.3) > 0) {                                  // petite bulle « ! » au-dessus de grand-père
      pxRect(zc, 229 - SX, 233 - SY, 7, 9, '#f4f0e6');
      pxRect(zc, 232 - SX, 235 - SY, 1, 4, '#2a2230');
      pxRect(zc, 232 - SX, 240 - SY, 1, 1, '#2a2230');
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cine.art.pierCv, 0, 0, LW, LH);
    ctx.fillStyle = 'rgba(255, 140, 70, 0.18)';                            // lumière de fin d'après-midi
    ctx.fillRect(0, 0, LW, LH);
  } else {
    renderScene();                                                       // le lac, avec la barque
    if (sc === 'eerie') {
      // le lac s'assombrit, puis deux grands yeux s'ouvrent sous la surface
      const a = Math.min(1, t / 3);
      ctx.fillStyle = `rgba(24, 4, 40, ${0.5 * a})`;
      ctx.fillRect(0, HORIZON, LW, LH - HORIZON);
      ctx.fillStyle = `rgba(24, 4, 40, ${0.25 * a})`;
      ctx.fillRect(0, 0, LW, HORIZON);
      const open = clamp((t - 1.5) / 1.5, 0, 1);
      ctx.globalAlpha = open * (0.7 + 0.3 * Math.sin(t * 2));
      for (const sd of [-1, 1]) {
        pxEllipse(ctx, 240 + sd * 34, 172, 12, Math.max(1, Math.round(5 * open)), '#e8c03a');
        pxRect(ctx, 239 + sd * 34, 172 - Math.round(4 * open), 2, 1 + Math.round(8 * open), '#0b0508');
      }
      ctx.globalAlpha = 1;
    }
  }
  if (t < 0.6) {                                                         // fondu au noir entre les scènes
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - t / 0.6})`;
    ctx.fillRect(0, 0, LW, LH);
  }
}
let fisherSpriteCache = null;
const buildFisherSpriteCached = () => (fisherSpriteCache ||= buildFisherSprite({ ...validLook(progress.look), gear: 'off' }));

// ---------------------------------------------------------------------------
// Tutoriels (textes : TUTO_FISH, TUTO_RETRY, TUTO_SAVE dans village.js)
//  - pêche : Papi Émile guide une pêche d'entraînement (poisson facile, morsure rapide) ;
//    l'étape avance quand l'état de la pêche change (ligne lancée, morsure, ferrage, prise) ;
//  - sauvegarde : une flèche montre les boutons à utiliser, panneau des options compris.
// ---------------------------------------------------------------------------
const tuto = { kind: null, i: 0, fishing: false, retry: '', prevState: '', then: null, typer: null, focus: null };

const tutoWords = (txt) => fillText(txt)
  .replaceAll('{clic}', TOUCH ? 'touche' : 'clique').replaceAll('{Clic}', TOUCH ? 'Touche' : 'Clique')
  .replaceAll('{maintiens}', TOUCH ? 'garde le doigt appuyé' : 'maintiens le clic (ou Espace)')
  .replaceAll('{Maintiens}', TOUCH ? 'Garde le doigt appuyé' : 'Maintiens le clic (ou Espace)');

// Au démarrage d'une partie : la pêche d'entraînement si elle n'a pas été faite, puis la sauvegarde
function tutoMaybeStart() {
  if (tuto.kind || !inGame) return;
  if (!progress.tuto.fish) startTuto('fish', () => startTutoWhenFree('save'));
  else if (!progress.tuto.save) setTimeout(() => startTutoWhenFree('save'), 1500);
}
// L'astuce attend que le joueur soit libre : carte de prise fermée, aucun panneau ouvert
function startTutoWhenFree(kind) {
  if (!inGame || tuto.kind) return;
  if (game.state === 'caught' || openPanelName || cine.on) { setTimeout(() => startTutoWhenFree(kind), 400); return; }
  startTuto(kind);
}

function startTuto(kind, then = null) {
  tuto.kind = kind;
  tuto.i = 0;
  tuto.retry = '';
  tuto.then = then;
  tuto.prevState = game.state;
  tuto.fishing = kind === 'fish';
  tuto.typer ||= makeTyper($('tuto-text'), 45);
  const papi = kind === 'fish';
  $('tuto-face').src = papi ? npcPortrait(GRANDPA) : ICONS.save;
  $('tuto-who').textContent = papi ? GRANDPA.name : 'Astuce';
  $('tuto-skip').textContent = papi ? 'Passer l\'entraînement' : 'Passer';
  $('tuto').hidden = false;
  showTutoStep();
}

function tutoSteps() { return tuto.kind === 'fish' ? TUTO_FISH : TUTO_SAVE; }

function showTutoStep() {
  const steps = tutoSteps();
  const st = steps[tuto.i];
  tuto.typer.set(tutoWords(tuto.retry || st.text));
  $('tuto-step').textContent = `${tuto.i + 1} / ${steps.length}`;
  // bouton Suivant : étapes à lire (sauvegarde, fin de la pêche) ; sinon on attend une action de pêche
  const manual = tuto.kind === 'save' || st.until === 'next';
  $('tuto-next').hidden = !manual;
  $('tuto-next').textContent = tuto.i === steps.length - 1 ? 'Terminer' : 'Suivant ›';
  tutoFocus(tuto.kind === 'save' ? st : null);
}

function tutoNext() {
  if (!tuto.kind) return;
  if (!tuto.typer.done()) { tuto.typer.full(); return; }
  const steps = tutoSteps();
  tuto.retry = '';
  if (++tuto.i >= steps.length) { endTuto(true); return; }
  Sound.page();
  showTutoStep();
}

function endTuto(done) {
  const kind = tuto.kind;
  if (!kind) return;
  tutoFocus(null);
  if (tuto.kind === 'save' && openPanelName === 'options' && tutoSteps().some((s) => s.panel === 'options')) closePanel();
  tuto.kind = null;
  tuto.fishing = false;
  $('tuto').hidden = true;
  // « Passer » compte comme terminé : on ne le reproposera pas (rejouable depuis les options)
  progress.tuto[kind] = true;
  if (done !== undefined) writeSave();
  const then = tuto.then;
  tuto.then = null;
  if (done) Sound.achievement();
  then?.();
}

// Retour au menu en plein tutoriel : on le range sans le marquer comme fait (il reprendra)
function tutoAbort() {
  if (!tuto.kind) return;
  tutoFocus(null);
  tuto.kind = null;
  tuto.fishing = false;
  tuto.then = null;
  $('tuto').hidden = true;
}

// Mise en valeur de l'élément visé (contour qui pulse) + flèche qui le montre
function tutoFocus(st) {
  tuto.focus?.classList.remove('tuto-focus');
  tuto.focus = null;
  $('tuto-arrow').hidden = true;
  if (!st?.target) return;
  if (st.panel && openPanelName !== st.panel) openPanel(st.panel);
  const el = $(st.target);
  if (!el || el.hidden) return;
  el.scrollIntoView?.({ block: 'center' });
  el.classList.add('tuto-focus');
  tuto.focus = el;
  tutoPlaceArrow();
  requestAnimationFrame(tutoPlaceArrow);         // après le défilement du panneau
}
function tutoPlaceArrow() {
  const el = tuto.focus;
  if (!el) return;
  const g = $('game').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const a = $('tuto-arrow');
  a.hidden = false;
  const fs = parseFloat(getComputedStyle($('game')).fontSize) || 16;
  const below = r.bottom + fs * 2.2 < g.bottom;      // flèche sous l'élément (pointe vers le haut), sinon au-dessus
  a.classList.toggle('down', !below);
  a.style.left = `${r.left - g.left + r.width / 2 - fs * 0.9}px`;
  a.style.top = below ? `${r.bottom - g.top + fs * 0.3}px` : `${r.top - g.top - fs * 1.6}px`;
}
window.addEventListener('resize', () => { if (tuto.focus) tutoPlaceArrow(); });
document.addEventListener('scroll', () => { if (tuto.focus) tutoPlaceArrow(); }, true);   // panneau qui défile

// Pêche d'entraînement : suit les changements d'état de la pêche (appelé à chaque image en partie)
function tutoTick() {
  if (tuto.kind !== 'fish') return;
  const s = game.state;
  const prev = tuto.prevState;
  if (s === prev) return;
  tuto.prevState = s;
  const st = TUTO_FISH[tuto.i];
  const castIdx = TUTO_FISH.findIndex((x) => x.until === 'cast');
  const retry = (txt) => { tuto.i = castIdx; tuto.retry = txt; showTutoStep(); };
  if (s === 'early') return retry(TUTO_RETRY.early);
  if (s === 'missed') return retry(prev === 'bite' ? TUTO_RETRY.late : TUTO_RETRY.escaped);
  const reached = { cast: s === 'waiting', bite: s === 'bite', hook: s === 'reeling', landed: s === 'caught' }[st.until];
  if (reached) {
    tuto.retry = '';
    tuto.i++;
    showTutoStep();
  } else if (tuto.retry && s === 'waiting' && st.until === 'cast') {
    tuto.retry = '';                          // relancé après un raté : la suite reprend normalement
    tuto.i++;
    showTutoStep();
  }
}

// le texte s'écrit lettre par lettre, même panneau ouvert (la boucle de jeu est alors en pause)
let tutoLast = 0;
function tutoFrame(now) {
  const dt = Math.min(0.1, (now - tutoLast) / 1000 || 0);
  tutoLast = now;
  if (tuto.kind) tuto.typer.update(dt);
  requestAnimationFrame(tutoFrame);
}
requestAnimationFrame(tutoFrame);

$('tuto-next').addEventListener('click', (e) => { e.currentTarget.blur(); Sound.click(); tutoNext(); });
$('tuto-skip').addEventListener('click', (e) => { e.currentTarget.blur(); Sound.click(); endTuto(false); });
$('tuto-text').addEventListener('click', () => { if (tuto.kind && !tuto.typer.done()) tuto.typer.full(); });
$('opt-tuto').addEventListener('click', () => {
  if (!inGame) return;
  closePanel();
  endTuto();
  // pêche seulement si la ligne est libre ; sinon, directement la sauvegarde
  if (game.state === 'idle') startTuto('fish', () => startTutoWhenFree('save')); else startTuto('save');
});

$('opt-intro').addEventListener('click', () => {
  const wasInGame = inGame;
  fisherSpriteCache = null;
  startIntro(() => { if (wasInGame) { $('hud').hidden = false; } else { $('menu').hidden = false; } });
});

// ===========================================================================
// Panneaux
// ===========================================================================
let openPanelName = null;
const PANELS = ['book', 'shop', 'sheet', 'options', 'crates', 'pot', 'achievements', 'char', 'leaderboard', 'curses',
  'village', 'talk', 'bank', 'fishmonger'];
const MENU_PANELS = ['options', 'char', 'leaderboard'];   // accessibles depuis le menu principal

function openPanel(name) {
  if (!inGame && !MENU_PANELS.includes(name)) return;
  if (name === 'curses' && !cursesUnlocked()) return;
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
  if (name === 'char') renderCharEditor();
  if (name === 'leaderboard') { lbHint = ''; loadLeaderboard(); }
  if (name === 'curses') { witchLine = WITCH.greet[Math.floor(Math.random() * WITCH.greet.length)]; renderCurses(); }
  if (name === 'village') renderVillage();
  if (name === 'bank') { $('bank-npc').innerHTML = npcBar('bank'); $('bank-msg').textContent = ''; renderBank(); }
  if (name === 'fishmonger') { $('fm-npc').innerHTML = npcBar('fish'); renderFishmonger(); }
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
// clic à côté d'un panneau : on le ferme (sauf l'éditeur de personnage, pour ne rien perdre par erreur)
$('overlay').addEventListener('pointerdown', (e) => { if (e.target.id === 'overlay' && openPanelName !== 'char') closePanel(); });

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
      <dt>Capturés</dt><dd>${known ? fmtNum(entry.count) : unk}</dd>
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
let shopTab = 'stock';
let shopMode = 'bric';       // 'bric' : bric-à-brac de Josette · 'yard' : chantier naval de Marcel
const SHOP_TABS = { bric: ['stock', 'rods', 'baits', 'pots'], yard: ['yard'] };

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

// Objets du jour du bric-à-brac (renouvelés chaque matin, plus nombreux et plus rares avec le bateau)
function renderStock() {
  const br = progress.bric;
  const left = Math.max(0, dayOf(progress.clock) * DAY_LEN - progress.clock);
  let html = `<p class="stock-head">Nouvel arrivage dans ${fmtTime(left)} · Bateau niveau ${boatLevel()} : ${bricStockSize(boatLevel())} objets par jour, jusqu'à la rareté « ${RARITIES[bricMaxTier(boatLevel())].name} ».</p>`;
  br.stock.forEach((id, i) => {
    const it = ITEM_BY_ID[id];
    const sold = br.sold[i];
    const price = bricPrice(it);
    const full = progress.items.length >= ITEM_CAP;
    html += `
      <div class="item ${sold ? 'locked' : ''}" style="--rc:${RARITIES[it.tier].color}">
        <img class="item-icon" src="${equipIcon(it)}" alt="">
        <div class="info"><b style="color:${rarText(it.tier)}">${it.name}</b>
          <small>${KIND_BY_ID[it.slot].name} · ${RARITIES[it.tier].name}</small>
          <span class="eff">${fxLines(it.fx).join(' · ')}</span>
          <small class="inv-desc">${it.desc}</small></div>
        <div class="actions">${sold ? '<button class="btn" disabled>Vendu</button>'
          : `<button class="btn" data-buy-stock="${i}" ${progress.money < price || full ? 'disabled' : ''} ${full ? 'title="Inventaire plein"' : ''}>Acheter — ${fmtNum(price)} ${coinImg()}</button>`}</div>
      </div>`;
  });
  return html;
}

function renderShop() {
  $('shop-money').textContent = fmtNum(progress.money);
  const tabs = SHOP_TABS[shopMode];
  if (!tabs.includes(shopTab)) shopTab = tabs[0];
  const owner = shopMode === 'yard' ? 'yard' : 'bric';
  $('shop-title').textContent = shopMode === 'yard' ? 'Chantier naval' : 'Bric-à-brac';
  if ($('shop-npc').dataset.owner !== owner) {          // la salutation ne change qu'en entrant
    $('shop-npc').innerHTML = npcBar(owner);
    $('shop-npc').dataset.owner = owner;
  }
  $('shop-tabs').hidden = tabs.length < 2;
  document.querySelectorAll('#shop-tabs .tab').forEach((t) => {
    t.hidden = !tabs.includes(t.dataset.tab);
    t.classList.toggle('active', t.dataset.tab === shopTab);
  });
  let html = '';
  if (shopTab === 'stock') {
    html = renderStock();
  } else if (shopTab === 'rods') {
    for (const r of RODS) {
      const owned = progress.rods.includes(r.id);
      const equipped = progress.rod === r.id;
      let btn;
      const locked = !owned && !tierUnlocked(r.tier);
      if (equipped) btn = '<button class="btn" disabled>Équipée</button>';
      else if (owned) btn = `<button class="btn" data-equip-rod="${r.id}">Équiper</button>`;
      else if (locked) btn = `<button class="btn" disabled>${lockText(r.tier)}</button>`;
      else btn = `<button class="btn" data-buy-rod="${r.id}" ${progress.money < r.price ? 'disabled' : ''}>Acheter — ${fmtNum(r.price)} ${coinImg()}</button>`;
      html += `
        <div class="item ${equipped ? 'equipped' : ''} ${locked ? 'locked' : ''}">
          <img class="item-icon" src="${itemIcon('rod', r)}" alt="">
          <div class="info"><b>${r.name} <span class="tier">niv. ${r.tier}</span></b><small>${r.desc}</small><span class="eff">${rodEffects(r)}</span></div>
          <div class="actions">${btn}</div>
        </div>`;
    }
  } else if (shopTab === 'pots') {
    for (const p of POTS) {
      const owned = progress.potsOwned[p.id] || 0;
      const deployed = owned - potsAvailable(p.id);
      const locked = !tierUnlocked(p.tier);
      html += `
        <div class="item ${locked ? 'locked' : ''}">
          <img class="item-icon" src="${itemIcon('pot', p)}" alt="">
          <div class="info"><b>${p.name} <span class="tier">niv. ${p.tier}</span></b><small>${p.desc}</small>
            <span class="eff">${potEffects(p)}</span>
            <span class="stock">Possédées : ${owned}${deployed ? ` (dont ${deployed} à l'eau)` : ''}</span></div>
          <div class="actions">${locked
            ? `<button class="btn" disabled>${lockText(p.tier)}</button>`
            : `<button class="btn" data-buy-pot="${p.id}" ${progress.money < p.price ? 'disabled' : ''}>Acheter — ${fmtNum(p.price)} ${coinImg()}</button>`}</div>
        </div>`;
    }
  } else if (shopTab === 'yard') {
    html = renderYard();
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
  // aperçus des bateaux dans le chantier
  document.querySelectorAll('#shop-list canvas[data-boat]').forEach((cv) => {
    const spr = buildBoat(currentLook(), +cv.dataset.boat);
    cv.getContext('2d').drawImage(spr, 0, 0);
  });
}

// Mise à l'eau du nouveau bateau : on passe au niveau suivant puis on lance l'animation
// On ne change pas de bateau avec un poisson au bout de la ligne (morsure, combat, Grand Ancien) :
// la prise serait perdue sans être comptée. Une ligne simplement à l'eau est relevée.
const canSwapBoat = () => !FIGHT_STATES.has(game.state) && game.state !== 'boatSwap';

function startBoatSwap() {
  if (!boatReady() || !canSwapBoat()) return;
  const nb = nextBoat();
  const old = boatSprite;
  const oldLevel = boatLevel();
  // les pièces de ce bateau sont consommées
  const used = [...nb.parts.map((p) => p.id), nb.special.id];
  progress.boat.parts = progress.boat.parts.filter((id) => !used.includes(id));
  progress.boat.level = nb.level;
  refreshBoat();
  closePanel();
  resetFishing();
  game.swap = { old, oldLevel };
  setState('boatSwap');
  say(`Au revoir, ${BOATS[oldLevel - 1].name}…`);
  Sound.phase();
  writeSave();
}

// niveau de bateau nécessaire pour un objet de rang « tier »
const tierBoatLevel = (tier) => Math.max(1, Math.ceil((tier - 1) / 2));
const lockText = (tier) => `Bateau niveau ${tierBoatLevel(tier)} requis`;

// ---------------------------------------------------------------------------
// Chantier naval : pièces du prochain bateau
// ---------------------------------------------------------------------------
function renderYard() {
  const cur = boatDef();
  const nb = nextBoat();
  const boatCanvas = (level) => `<canvas class="px yard-boat" width="${BOAT_SPR.w}" height="${BOAT_SPR.h}" data-boat="${level}"></canvas>`;
  let html = `
    <div class="yard-head">
      <div class="yard-card">${boatCanvas(cur.level)}
        <div><small>Votre bateau · niveau ${cur.level} / ${BOAT_MAX}</small><b>${cur.name}</b>
        <span class="stock">${cur.desc}</span>
        <span class="eff">Cannes et caisses jusqu'au niveau ${boatMaxTier(cur.level)}</span></div></div>`;
  if (!nb) {
    return `${html}<div class="yard-card"><div><b>Bateau au niveau maximum</b>
      <span class="stock">Il n'existe rien de plus perfectionné sur ce lac. Ni sur aucun autre.</span></div></div></div>`;
  }
  const ready = boatReady();
  html += `
      <div class="yard-card next">${boatCanvas(nb.level)}
        <div><small>Prochain bateau · niveau ${nb.level}</small><b>${nb.name}</b>
        <span class="stock">${nb.desc}</span>
        <span class="eff">Débloque les cannes et caisses jusqu'au niveau ${boatMaxTier(nb.level)}</span></div></div>
    </div>`;
  for (const p of nb.parts) {
    const got = hasPart(p.id);
    html += `
      <div class="item ${got ? 'equipped' : ''}">
        <img class="item-icon" src="${ICONS.boat}" alt="">
        <div class="info"><b>${p.name}</b><small>Pièce pour le ${nb.name}</small></div>
        <div class="actions">${got ? '<button class="btn" disabled>Acquise</button>'
          : `<button class="btn" data-buy-part="${p.id}" ${progress.money < p.price ? 'disabled' : ''}>Acheter — ${fmtNum(p.price)} ${coinImg()}</button>`}</div>
      </div>`;
  }
  const sp = nb.special;
  const spGot = hasPart(sp.id);
  html += `
      <div class="item special ${spGot ? 'equipped' : ''}">
        <img class="item-icon" src="${ICONS.boat}" alt="">
        <div class="info"><b>${spGot ? sp.name : '???'} <span class="tier">pièce spéciale</span></b>
          <small>${spGot ? sp.desc : 'Introuvable en magasin. Elle se trouve en pêchant (poissons et caisses), une seule fois.'}</small>
          ${spGot ? '' : `<span class="eff">Chance par poisson : ${fmtPct(specialPartChance(0, 'fish'))} (commun) → ${fmtPct(specialPartChance(4, 'fish'))} (légendaire)</span>`}</div>
        <div class="actions"><button class="btn" disabled>${spGot ? 'Trouvée' : 'À trouver'}</button></div>
      </div>
      <div class="yard-go">
        <button class="btn" data-assemble ${ready && canSwapBoat() ? '' : 'disabled'}>${!ready ? `Pièces réunies : ${nb.parts.filter((p) => hasPart(p.id)).length + (spGot ? 1 : 0)} / ${nb.parts.length + 1}`
          : canSwapBoat() ? `Mettre le ${nb.name} à l'eau !` : 'Terminez votre prise avant la mise à l\'eau'}</button>
      </div>`;
  return html;
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
  if (d.assemble !== undefined) {
    if (boatReady()) startBoatSwap();
    return;
  }
  if (d.buyStock !== undefined) {
    const i = +d.buyStock;
    const id = progress.bric.stock[i];
    const it = ITEM_BY_ID[id];
    if (!it || progress.bric.sold[i] || progress.money < bricPrice(it) || progress.items.length >= ITEM_CAP) return;
    progress.money -= bricPrice(it);
    progress.stats.spent += bricPrice(it);
    progress.items.push({ uid: ++progress.itemSeq, id });
    progress.bric.sold[i] = true;
    Sound.buy();
    $('shop-npc').querySelector('p').textContent = `« ${it.name} ? Excellent choix. Prenez-en soin. »`;
  } else if (d.buyPart) {
    const p = nextBoat()?.parts.find((x) => x.id === d.buyPart);
    if (!p || hasPart(p.id) || progress.money < p.price) return;
    progress.money -= p.price;
    progress.stats.spent += p.price;
    progress.boat.parts.push(p.id);
    Sound.buy();
    if (boatReady()) pushToast({ icon: ICONS.boat, label: 'Chantier naval', title: 'Toutes les pièces sont réunies !', sub: `Le ${nextBoat().name} est prêt à être mis à l'eau.`, sound: () => Sound.chestGet() });
  } else if (d.buyRod) {
    const r = ROD_BY_ID[d.buyRod];
    if (progress.money < r.price || progress.rods.includes(r.id) || !tierUnlocked(r.tier)) return;
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
    if (progress.money < p.price || !tierUnlocked(p.tier)) return;
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
  c.drawImage(boatSprite, 2 - BOAT_SPR.px, 38 - BOAT_SPR.py);
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
  const look = validLook(progress.look);
  $('sheet-title').textContent = look.name ? `${look.name}, ${fisherWord(look.sex)}` : `Profil du ${fisherWord(look.sex)}`;
  document.querySelectorAll('[data-stab]').forEach((b) => b.classList.toggle('active', b.dataset.stab === sheetTab));
  $('inv-count').textContent = `(${progress.items.length})`;
  $('fish-count').textContent = `(${progress.catches.length}/${keepnetSize()})`;
  $('sheet-main').hidden = sheetTab !== 'gear';
  $('sheet-inv').hidden = sheetTab !== 'inv';
  $('sheet-fish').hidden = sheetTab !== 'fish';
  if (sheetTab === 'inv') renderInventory();
  else if (sheetTab === 'fish') renderKeepnet();
  else renderSheetMain();
}

// Bourriche (consultation) : la vente se fait chez le poissonnier du village
function renderKeepnet() {
  $('fish-hint').innerHTML = `${progress.catches.length} / ${keepnetSize()} prises · valeur au cours du jour (${fmtIndex(progress.market.index)}) : ` +
    `${fmtNum(keepnetValue())} ${coinImg()}. Vendez-les à ${escapeHtml(NPC_BY_ID.fish.name)}, à la poissonnerie du village (touche V). ` +
    `Un meilleur bateau agrandit la bourriche.`;
  renderCatchList($('fish-list'), false);
}

document.querySelectorAll('[data-stab]').forEach((b) => b.addEventListener('click', () => {
  sheetTab = b.dataset.stab;
  sellConfirm = false;
  Sound.click();
  renderSheet();
}));

const ghostItem = (kind) => ({ id: `ghost-${kind}`, slot: kind, tier: 0, color: '#5a6290', accent: '#454c78' });

function fxTotalLines(m) {
  return Object.entries(m).filter(([k, v]) => FX[k] && (FX[k].mul ? Math.abs(v - 1) > 1e-6 : Math.abs(v) > 1e-6)).map(([k, v]) => FX[k].label(v));
}

function invSort(a, b) {
  const A = itemDef(a), B = itemDef(b);
  return (isEquipped(b) - isEquipped(a)) || (B.tier - A.tier) ||
    (ITEM_KINDS.findIndex((k) => k.id === A.slot) - ITEM_KINDS.findIndex((k) => k.id === B.slot)) || (a.uid - b.uid);
}

function renderInventory() {
  hideInvTip();
  // emplacements équipés
  $('inv-slots').innerHTML = SLOTS.map((sl) => {
    const it = equippedItem(sl.id);
    return `${sl.id === ACC_SLOTS[0].id ? '<h3 class="inv-acc-h">Accessoires</h3>' : ''}
      <div class="slot inv-slot ${it ? '' : 'empty'}" ${it ? `style="--rc:${RARITIES[it.tier].color}"` : ''}>
        <div class="slot-top"><img class="${it ? '' : 'ghost'}" src="${equipIcon(it || ghostItem(sl.kind))}" alt="">
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
  const counts = Object.fromEntries(ITEM_KINDS.map((k) => [k.id, progress.items.filter((i) => itemDef(i).slot === k.id).length]));
  $('inv-filter').innerHTML = [['all', 'Tout', progress.items.length], ...ITEM_KINDS.map((k) => [k.id, k.plural, counts[k.id]])]
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
          <small>${KIND_BY_ID[it.slot].name} · ${RARITIES[it.tier].name}${eq ? ' · <span class="inv-eq">Équipé</span>' : ''}</small>
          <span class="eff">${fxLines(it.fx).join(' · ')}</span>
          <small class="inv-desc">${it.desc}</small></div>
        <div class="actions">
          ${eq ? `<button class="btn" data-unequip="${slotOfInst(insts.find(isEquipped))}">Retirer</button>` : equipButtons(it, free[0].uid)}
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

// Bouton « Équiper » ; accessoire alors que les 3 emplacements sont pris : un bouton par emplacement à remplacer
function equipButtons(it, uid) {
  if (slotForItem(it)) return `<button class="btn" data-equip-item="${uid}">Équiper</button>`;
  return ACC_SLOTS.map((sl) => `<button class="btn" data-equip-item="${uid}" data-slot="${sl.id}" title="Remplacer ${equippedItem(sl.id).name}">↔ ${equippedItem(sl.id).name}</button>`).join('');
}

$('sheet-inv').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.invFilter) { invFilter = d.invFilter; Sound.click(); }
  else if (d.equipItem) { equipItem(+d.equipItem, d.slot || null); Sound.click(); }
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
  const target = btn.dataset.slot || slotForItem(it);
  const cur = target ? equippedItem(target) : null;
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
    `<button class="btn ${x.id === b.id ? 'active' : ''}" data-equip-bait="${x.id}">${x.name}${x.pack ? ` (${fmtNum(progress.baits[x.id] || 0)})` : ''}</button>`).join('');

  $('sheet-gear').innerHTML = `
    <div class="chips char-edit"><button class="btn" data-edit-char>Modifier mon personnage</button></div>
    <h3>Équipement</h3>
    <div class="slot">
      <div class="slot-top"><img src="${itemIcon('rod', r)}" alt="">
        <div><div class="slot-label">Canne à pêche</div><div class="slot-name">${r.name}</div></div></div>
      <div class="eff">${rodEffects(r)}</div>
      <div class="chips">${rodChips}</div>
    </div>
    <div class="slot">
      <div class="slot-top"><img src="${itemIcon('bait', b)}" alt="">
        <div><div class="slot-label">Appât</div><div class="slot-name">${b.name}${b.pack ? ` — ${fmtNum(progress.baits[b.id] || 0)} restant(s)` : ''}</div></div></div>
      <div class="eff">${baitEffects(b)}</div>
      <div class="chips">${baitChips}</div>
    </div>
    <div class="slot">
      <div class="slot-label">Tenue</div>
      <div class="outfit">${SLOTS.map((sl) => {
        const it = equippedItem(sl.id);
        return `<div class="outfit-cell" title="${sl.name} : ${it ? it.name : 'aucun'}"><img class="${it ? '' : 'ghost'}" src="${equipIcon(it || ghostItem(sl.kind))}" alt="">
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
    ['section', `Village (${VILLAGE_NAME})`],
    ['Bourriche', `${progress.catches.length} / ${keepnetSize()} prises · ${fmtNum(keepnetValue())} ${coinImg()}`],
    ['Prises vendues', fmtNum(st.fishSold || 0)],
    ['Prises relâchées (bourriche pleine)', fmtNum(st.released || 0)],
    ['Compte en banque', `${fmtNum(progress.bank)} ${coinImg()}`],
    ['Intérêts reçus', `${fmtNum(st.interest || 0)} ${coinImg()}`],
    ['Cours du poisson', fmtIndex(progress.market.index)],
    ['Habitants rencontrés', `${NPCS.filter((n) => progress.met[n.id]).length} / ${NPCS.length}`],
    ['section', 'Bateau'],
    ['Bateau actuel', `${boatDef().name} (niveau ${boatLevel()} / ${BOAT_MAX})`],
    ['Cannes et caisses débloquées', `jusqu'au niveau ${boatMaxTier(boatLevel())}`],
    ['Prochain bateau', nextBoat() ? `${nextBoat().name} : ${nextBoat().parts.filter((x) => hasPart(x.id)).length + (hasPart(nextBoat().special.id) ? 1 : 0)} / ${nextBoat().parts.length + 1} pièces` : '—'],
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
  if (e.target.closest('[data-edit-char]')) {
    openCharEditor('edit');
    return;
  }
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
        <div class="eff">Aucune caisse disponible. Achetez-en une au bric-à-brac du village (onglet « Caisses »).</div></div>`;
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
  const priced = (r) => Math.round((r.money * progress.market.index) / MARKET.base);
  const total = lp.results.reduce((s, r) => s + (r.stored ? priced(r) : 0), 0);
  const released = lp.results.filter((r) => !r.stored).length;
  $('pot-title').textContent = `Relevé : ${t.name}`;
  $('pot-items').hidden = !lp.drops?.length && !lp.part;
  $('pot-items').innerHTML = (lp.part ? `<div class="cc-loot cc-part">${partHtml(lp.part)}</div>` : '') +
    (lp.drops || []).map((d) => `<div class="cc-loot">${dropHtml(d)}</div>`).join('');
  $('pot-total').innerHTML = lp.results.length
    ? `Dans la bourriche : ${fmtNum(total)} ${coinImg()}${released ? ` <small>(${released} relâché${released > 1 ? 's' : ''} : bourriche pleine)</small>` : ''}` : '';
  $('pot-list').innerHTML = lp.results.length
    ? lp.results.map((r, k) => {
      const badges = [r.newSpecies && 'Nouvelle entrée !', r.sizeRecord && 'Record de taille !', r.weightRecord && 'Record de poids !'].filter(Boolean);
      return `
        <div class="item pot-row ${r.abom ? 'abom' : ''}">
          <canvas class="px pot-canvas" width="100" height="72" data-k="${k}"></canvas>
          <div class="info"><b>${fishName(r.cr, r.abom)}</b>
            <small>${r.abom ? 'Abomination · ' : ''}${RARITIES[r.cr.tier].name} — ${fmtCm(r.size)} · ${fmtKg(r.weight)}</small>
            ${badges.length ? `<span class="eff">${badges.join(' · ')}</span>` : ''}</div>
          <div class="money">${r.stored ? `${fmtNum(priced(r))} ${coinImg()}` : '<small>relâché</small>'}</div>
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
  { id: 'full_gear',    name: 'Paré pour la pêche',        desc: 'Porter un vêtement dans chacun des 5 emplacements.', test: () => SLOTS.filter((s) => s.kind !== 'acc').every((s) => equippedItem(s.id)) },
  { id: 'acc_full',     name: 'Bric-à-brac',               desc: 'Porter 3 accessoires en même temps.',               test: () => ACC_SLOTS.every((s) => equippedItem(s.id)) },
  { id: 'necro',        name: 'Lecture interdite',         desc: 'Trouver le Necronomicon.', secret: true,           test: (p, ev) => ev.type === 'item' && ev.item.id === 'a_necro' },
  { id: 'curse_first',  name: 'Pacte des brumes',          desc: 'Accepter une première malédiction.',               test: (p) => (p.stats.curses || 0) >= 1 },
  { id: 'curse_10',     name: 'Habitué des pactes',        desc: 'Accepter 10 malédictions.',                         test: (p) => (p.stats.curses || 0) >= 10 },
  { id: 'sell_item',    name: 'Brocanteur',                desc: 'Vendre un objet.',                                  test: (p) => (p.stats.itemsSold || 0) >= 1 },
  { id: 'day_7',        name: 'Une semaine au lac',        desc: 'Atteindre le 7e jour.',                             test: (p) => dayOf(p.clock) >= 7 },
  { id: 'day_30',       name: 'Ermite du lac',             desc: 'Atteindre le 30e jour.',                            test: (p) => dayOf(p.clock) >= 30 },
  { id: 'night_fish',   name: 'Pêcheur nocturne',          desc: 'Pêcher un poisson en pleine nuit.',                 test: (p, ev) => isFishCatch(ev) && isNight() },
  { id: 'rain_legend',  name: 'Chanter sous la pluie',     desc: 'Pêcher un poisson légendaire sous la pluie.',       test: (p, ev) => isFishCatch(ev) && ev.f.tier === 4 && weather().id === 'pluie' },
  { id: 'storm_abom',   name: "Enfant de l'orage",         desc: "Pêcher une abomination pendant l'orage.",            test: (p, ev) => isCatch(ev) && ev.abom && weather().id === 'orage' },
  { id: 'rainbow',      name: "Au pied de l'arc-en-ciel",  desc: 'Voir un arc-en-ciel sur le lac.',                   test: () => weather().id === 'arcenciel' },
  { id: 'special_part', name: 'Pièce de collection',       desc: 'Trouver une pièce spéciale de bateau.',             test: (p, ev) => ev.type === 'part' },
  { id: 'boat_2',       name: 'Vroum !',                   desc: 'Passer au canot à moteur.',                         test: (p) => (p.boat?.level || 1) >= 2 },
  { id: 'boat_3',       name: 'Patron pêcheur',            desc: 'Passer au bateau de pêche.',                        test: (p) => (p.boat?.level || 1) >= 3 },
  { id: 'boat_4',       name: 'Loup de mer',               desc: 'Passer au chalutier.',                              test: (p) => (p.boat?.level || 1) >= 4 },
  { id: 'boat_5',       name: 'Capitaine des abysses',     desc: 'Mettre à l\'eau le navire Abysse-X.',               test: (p) => (p.boat?.level || 1) >= 5 },
  { id: 'first_sale',   name: 'Jour de marché',            desc: 'Vendre une prise au poissonnier.',                  test: (p) => (p.stats.fishSold || 0) >= 1 },
  { id: 'big_sale',     name: 'Le roi de la criée',        desc: 'Gagner 5 000 pièces en une seule vente.',           test: (p, ev) => ev.type === 'sale' && ev.total >= 5000 },
  { id: 'saver',        name: 'Bas de laine bancaire',     desc: 'Avoir 10 000 pièces sur son compte.',               test: (p) => (p.bank || 0) >= 10000 },
  { id: 'interest',     name: 'Rentier',                   desc: 'Recevoir 10 000 pièces d\'intérêts au total.',      test: (p) => (p.stats.interest || 0) >= 10000 },
  { id: 'villagers',    name: 'Tout le monde se connaît',  desc: 'Rencontrer tous les habitants du village.',         test: (p) => NPCS.every((n) => p.met[n.id]) },
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
  // une vraie sauvegarde pèse quelques Ko : un fichier énorme figerait l'onglet pendant la lecture
  if (file.size > SAVE_FILE_MAX) {
    pendingImport = null;
    $('save-confirm').hidden = true;
    saveMsg('Fichier trop volumineux pour être une sauvegarde de Lac Tranquille.');
    return;
  }
  try {
    const json = JSON.parse(await file.text());
    const data = validProgress(json?.game === 'lac-tranquille' ? json.save : json);
    if (!data || data.v !== 2) throw new Error('format');
    pendingImport = data;
    pendingLink = null;
    $('save-summary').textContent = `Sauvegarde trouvée : ${saveSummary(data)}. Elle remplacera la partie actuelle.`;
    $('save-confirm').hidden = false;
    saveMsg('');
  } catch {
    pendingImport = null;
    $('save-confirm').hidden = true;
    saveMsg("Ce fichier n'est pas une sauvegarde de Lac Tranquille.");
  }
});

$('save-restore').addEventListener('click', () => {
  const b = readBackup();
  if (!b) {
    pendingImport = null;
    $('save-confirm').hidden = true;
    saveMsg('Aucune copie de sécurité dans ce navigateur.');
    return;
  }
  pendingImport = b.save;
  pendingLink = null;
  const when = b.at ? new Date(b.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '?';
  $('save-summary').textContent = `Copie du ${when}${b.from ? ` (version ${b.from})` : ''} : ${saveSummary(b.save)}. Elle remplacera la partie actuelle.`;
  $('save-confirm').hidden = false;
  saveMsg('');
  Sound.click();
});

$('save-cancel').addEventListener('click', () => {
  pendingImport = null;
  pendingLink = null;
  $('save-confirm').hidden = true;
  saveMsg('Import annulé.');
});

$('save-apply').addEventListener('click', () => {
  if (!pendingImport) return;
  if (inGame) writeSave();                         // état le plus récent de la partie remplacée…
  backupSave(readRawSave(), 'remplacée');          // …qui devient la copie de sécurité
  progress = pendingImport;
  pendingImport = null;
  // partie venue du serveur : cet appareil est lié à ce pseudo ; sinon (fichier, copie de sécurité)
  // l'ancien lien est retiré, pour ne pas écraser la sauvegarde en ligne avec une autre partie
  if (pendingLink) cloudSetLink(pendingLink); else if (cloud.link) cloudUnlink();
  const fromCloud = !!pendingLink;
  pendingLink = null;
  writeSave();
  $('save-confirm').hidden = true;
  if (inGame) enterGame(); else refreshMenu();
  saveMsg(fromCloud ? 'Partie en ligne chargée : cet appareil est maintenant lié à votre pseudo.' : 'Sauvegarde importée !');
  renderCloud();
  Sound.chestGet();
});

// ---------------------------------------------------------------------------
// Sauvegarde en ligne : pseudo + clé secrète (générée ici, jamais choisie par le joueur)
// ---------------------------------------------------------------------------
let pendingLink = null;                            // lien à enregistrer si le joueur valide le chargement
// https obligatoire, sauf serveur local de développement (wrangler dev)
const cloudOn = () => /^(https:\/\/[a-z0-9.-]+|http:\/\/(localhost|127\.0\.0\.1))(:\d+)?$/i.test(CLOUD_SAVE.url);
const cloudMsg = (txt) => { cloud.msg = txt; $('cloud-msg').textContent = txt; };
// Normalisation du pseudo : NFC + trim + toLocaleLowerCase('fr'). Identique à validName() et
// lookNameId() de server/cloud-save/worker.js : toute modification doit être reportée aux trois endroits.
const normName = (n) => String(n || '').normalize('NFC').trim().toLocaleLowerCase('fr');

function validLink(x) {
  if (!isObj(x) || typeof x.name !== 'string' || !LB_NAME_RE.test(x.name) || !CLOUD_KEY_RE.test(x.key)) return null;
  return { name: x.name, key: x.key, rev: vInt(x.rev, Number.MAX_SAFE_INTEGER), at: vInt(x.at, 1e14), ranked: x.ranked === true };
}
function cloudReadLink() {
  try { cloud.link = validLink(JSON.parse(localStorage.getItem(CLOUD_LINK_KEY))); } catch { cloud.link = null; }
}
function cloudSetLink(link) {
  cloud.link = validLink(link);
  cloud.conflict = null;
  try { localStorage.setItem(CLOUD_LINK_KEY, JSON.stringify(cloud.link)); } catch { /* stockage indisponible */ }
}
function cloudUnlink() {
  cloud.link = null;
  cloud.conflict = null;
  cloud.showKey = false;
  try { localStorage.removeItem(CLOUD_LINK_KEY); } catch { /* idem */ }
}

// Clé : 20 caractères Crockford base32 tirés avec crypto.getRandomValues (100 bits d'aléa).
// 256 est un multiple de 32 : « octet & 31 » donne un tirage uniforme.
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function newCloudKey() {
  const b = crypto.getRandomValues(new Uint8Array(20));
  const s = [...b].map((x) => CROCKFORD[x & 31]).join('');
  return `LAC-${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10, 15)}-${s.slice(15)}`;
}
// Saisie tolérante : minuscules, espaces, tirets oubliés, O/I/L confondus avec 0/1
function normKey(txt) {
  let s = String(txt || '').toUpperCase().replace(/[\s-]/g, '');
  if (s.startsWith('LAC')) s = s.slice(3);
  s = s.replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length !== 20) return null;
  const k = `LAC-${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10, 15)}-${s.slice(15)}`;
  return CLOUD_KEY_RE.test(k) ? k : null;
}

async function cloudCall(path, body) {
  let res;
  try {
    res = await fetch(CLOUD_SAVE.url + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw { code: 'reseau', message: 'Serveur injoignable (connexion ?).' };
  }
  let data = null;
  try { data = await res.json(); } catch { /* réponse vide ou illisible */ }
  if (!res.ok) {
    const code = typeof data?.error === 'string' ? data.error : 'http';
    const message = typeof data?.message === 'string' ? data.message.slice(0, 160) : `Erreur du serveur (${res.status}).`;
    throw { code, message };
  }
  if (!isObj(data)) throw { code: 'format', message: 'Réponse du serveur illisible.' };
  return data;
}

// La partie à envoyer : celle en cours, sinon celle enregistrée dans le navigateur
const cloudCurrent = () => (inGame ? progress : loadSave());
const fmtWhen = (t) => (t ? new Date(t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '?');

// Nom affiché de la plus grosse prise (envoyé avec la sauvegarde, pour le classement)
function bestFishName(p) {
  const b = p?.stats?.best;
  const c = b ? creature(b.id) : null;
  return c ? fishName(c, b.abom).slice(0, 40) : '';
}

// Résultat dans cloud.lastCode : 'ok', 'trop_tot' (envoyé il y a moins de 20 s), 'conflit', ou un code d'erreur
async function cloudPush({ silent = false, force = false, retried = false } = {}) {
  cloud.lastCode = 'off';
  if (!cloudOn() || !cloud.link) return false;
  if (cloud.busy) { cloud.lastCode = 'occupe'; return false; }
  const cur = cloudCurrent();
  if (!cur?.look?.name) return false;
  // garde-fou : jamais d'envoi d'une partie d'un autre personnage sur ce pseudo
  if (normName(cur.look.name) !== normName(cloud.link.name)) { cloudUnlink(); renderCloud(); return false; }
  if (cloud.conflict && !force) { cloud.lastCode = 'conflit'; return false; }
  cloud.busy = true;
  cloud.lastPush = Date.now();
  try {
    const r = await cloudCall('/v1/save', {
      name: cloud.link.name, key: cloud.link.key, save: { ...cur, gv: GAME_VERSION }, baseRev: cloud.link.rev, fish: bestFishName(cur),
    });
    cloudSetLink({ ...cloud.link, rev: vInt(r.rev, Number.MAX_SAFE_INTEGER), at: vInt(r.updatedAt, 1e14), ranked: r.ranked === true || cloud.link.ranked });
    cloud.lastCode = 'ok';
    if (!silent) cloudMsg('Partie envoyée en ligne.');
    return true;
  } catch (e) {
    cloud.lastCode = e.code || 'erreur';
    if (e.code === 'conflit' && !retried) {
      await cloudResolveConflict(cur);
      return cloud.lastCode === 'ok';
    }
    if (!silent || e.code !== 'trop_tot') cloudMsg(e.message);
    return false;
  } finally {
    cloud.busy = false;
    renderCloud();
  }
}

// Conflit : la version en ligne a une révision plus récente que celle connue ici.
// Si elle n'est pas plus avancée (temps de jeu) que la partie locale, c'est un envoi précédent
// dont la réponse s'est perdue : on reprend sa révision et on renvoie. Sinon, le joueur choisit.
async function cloudResolveConflict(cur) {
  try {
    const r = await cloudCall('/v1/load', { name: cloud.link.name, key: cloud.link.key });
    const online = validProgress(r.save);
    const rev = vInt(r.rev, Number.MAX_SAFE_INTEGER);
    if (online && online.stats.playTime <= cur.stats.playTime + 1) {
      cloudSetLink({ ...cloud.link, rev });
      cloud.busy = false;
      await cloudPush({ silent: true, retried: true });
      return;
    }
    cloud.conflict = online ? { save: online, rev, at: vInt(r.updatedAt, 1e14) } : null;
    cloud.lastCode = 'conflit';
    cloudMsg(online ? '' : 'Sauvegarde en ligne illisible.');
  } catch (e) { cloud.lastCode = e.code || 'erreur'; cloudMsg(e.message); }
}

// Envoi automatique, au plus toutes les CLOUD_AUTO_MS (appelé par writeSave en partie)
function cloudAuto() {
  if (cloudOn() && cloud.link && !cloud.conflict && Date.now() - cloud.lastPush > CLOUD_AUTO_MS) cloudPush({ silent: true });
}

function renderCloud() {
  const on = cloudOn();
  $('cloud-box').hidden = !on;
  if (!on) return;
  const l = cloud.link;
  const cur = l ? null : cloudCurrent();
  $('cloud-status').textContent = l
    ? `Cet appareil est lié au pseudo « ${l.name} ». Dernier envoi : ${l.at ? fmtWhen(l.at) : 'jamais'}. La partie est envoyée automatiquement toutes les 5 minutes et au retour au menu.`
    : 'Gardez votre partie en ligne : avec votre pseudo et votre clé, vous la reprenez sur n\'importe quel appareil.';
  $('cloud-enable').hidden = !!l;
  $('cloud-enable').disabled = !cur?.look?.name;
  $('cloud-enable').title = cur?.look?.name ? '' : 'Commencez ou continuez une partie d\'abord.';
  for (const id of ['cloud-push', 'cloud-showkey', 'cloud-unlink', 'cloud-delete']) $(id).hidden = !l;
  $('cloud-push').disabled = cloud.busy;
  $('cloud-showkey').textContent = cloud.showKey ? 'Masquer ma clé' : 'Afficher ma clé';
  $('cloud-keybox').hidden = !(l && cloud.showKey);
  $('cloud-key').textContent = l && cloud.showKey ? l.key : '';
  $('cloud-conflict').hidden = !cloud.conflict;
  if (cloud.conflict) {
    $('cloud-conflict-text').textContent = `Une version plus avancée de votre partie existe en ligne (envoyée le ${fmtWhen(cloud.conflict.at)} : ${saveSummary(cloud.conflict.save)}).`;
  }
  $('cloud-msg').textContent = cloud.msg;
}

// Activation : génère la clé et réserve le pseudo du personnage. Renvoie true si c'est fait.
async function cloudEnable({ auto = false } = {}) {
  const cur = cloudCurrent();
  if (!cloudOn() || cloud.link || !cur?.look?.name || cloud.busy) return false;
  const link = { name: cur.look.name, key: newCloudKey(), rev: 0, at: 0 };
  cloud.busy = true;
  cloudMsg('Création de votre sauvegarde en ligne…');
  try {
    const r = await cloudCall('/v1/save', { name: link.name, key: link.key, save: { ...cur, gv: GAME_VERSION }, baseRev: 0, fish: bestFishName(cur) });
    cloudSetLink({ ...link, rev: vInt(r.rev, Number.MAX_SAFE_INTEGER), at: vInt(r.updatedAt, 1e14) });
    cloud.lastPush = Date.now();
    cloud.lastCode = 'ok';
    cloud.showKey = true;
    try { localStorage.removeItem(CLOUD_AUTO_KEY); } catch { /* stockage indisponible */ }
    cloudMsg('Sauvegarde en ligne activée ! Notez votre clé : elle ne pourra pas être retrouvée si vous la perdez.');
    // la clé reste consultable dans Options › Sauvegarde en ligne (« Afficher ma clé »)
    pushToast({ icon: ICONS.save, label: 'Sauvegarde en ligne activée', title: escapeHtml(link.key),
      sub: 'Votre clé personnelle : notez-la (Options › Sauvegarde en ligne).', sound: () => Sound.chestGet() });
    return true;
  } catch (e) {
    cloud.lastCode = e.code || 'erreur';
    if (e.code === 'pseudo_pris') {
      try { localStorage.setItem(CLOUD_AUTO_KEY, `pris:${normName(link.name)}`); } catch { /* idem */ }
      cloudMsg(`Le pseudo « ${link.name} » a déjà une sauvegarde en ligne. Si c'est la vôtre, utilisez « Reprendre une partie en ligne » avec votre clé.`);
      if (auto) {
        pushToast({ icon: ICONS.save, label: 'Sauvegarde en ligne', title: 'Pseudo déjà enregistré',
          sub: 'Si c\'est votre partie, reprenez-la dans Options › Sauvegarde en ligne.' });
      }
    } else cloudMsg(e.message);
    return false;
  } finally {
    cloud.busy = false;
    renderCloud();
  }
}

// Activée par défaut : à l'entrée en partie, si l'appareil n'est pas lié, que le joueur ne l'a pas
// délié lui-même et que ce pseudo n'a pas déjà été trouvé pris
async function cloudAutoEnable() {
  if (!cloudOn() || cloud.link || !inGame || !progress.look?.name) return;
  let pref = null;
  try { pref = localStorage.getItem(CLOUD_AUTO_KEY); } catch { /* stockage indisponible */ }
  if (pref === 'off' || pref === `pris:${normName(progress.look.name)}`) return;
  await cloudEnable({ auto: true });
}

$('cloud-enable').addEventListener('click', () => { Sound.click(); cloudEnable(); });

// Bouton « Sauver » de la barre d'icônes (raccourci S) : sauvegarde locale, puis envoi en ligne
let saveBusy = false;
async function saveNow() {
  if (!inGame || saveBusy) return;
  saveBusy = true;
  $('btn-save').disabled = true;
  Sound.click();
  writeSave(true);
  let sub = 'Dans ce navigateur.';
  if (cloudOn() && cloud.link) {
    const ok = await cloudPush({ silent: true });
    sub = ok ? 'Dans ce navigateur et en ligne.'
      : cloud.lastCode === 'trop_tot' ? 'Dans ce navigateur (en ligne : déjà à jour il y a quelques secondes).'
      : cloud.lastCode === 'conflit' ? 'Dans ce navigateur. En ligne : une version plus avancée existe (voir Options).'
      : `Dans ce navigateur. En ligne : échec (${cloud.msg || 'serveur injoignable'}).`;
  } else if (cloudOn()) {
    sub = 'Dans ce navigateur. Activez la sauvegarde en ligne dans les options pour la retrouver partout.';
  }
  pushToast({ icon: ICONS.save, label: 'Sauvegarde', title: 'Partie sauvegardée', sub: escapeHtml(sub) });
  saveBusy = false;
  $('btn-save').disabled = false;
}
$('btn-save').addEventListener('click', (e) => { e.currentTarget.blur(); saveNow(); });

$('cloud-push').addEventListener('click', () => { Sound.click(); if (inGame) writeSave(); cloudPush(); });

$('cloud-showkey').addEventListener('click', () => { Sound.click(); cloud.showKey = !cloud.showKey; renderCloud(); });

$('cloud-copy').addEventListener('click', async () => {
  if (!cloud.link) return;
  try { await navigator.clipboard.writeText(cloud.link.key); cloudMsg('Clé copiée.'); } catch {
    // presse-papiers refusé (page locale) : on sélectionne la clé pour une copie manuelle
    const r = document.createRange();
    r.selectNodeContents($('cloud-key'));
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    cloudMsg('Clé sélectionnée : copiez-la avec Ctrl+C.');
  }
});

let confirmUnlink = false;
$('cloud-unlink').addEventListener('click', () => {
  Sound.click();
  if (!confirmUnlink) {
    confirmUnlink = true;
    $('cloud-unlink').textContent = 'Confirmer ? (gardez votre clé !)';
    setTimeout(() => { confirmUnlink = false; $('cloud-unlink').textContent = 'Délier cet appareil'; }, 4000);
    return;
  }
  confirmUnlink = false;
  $('cloud-unlink').textContent = 'Délier cet appareil';
  cloudUnlink();
  // choix du joueur : plus d'activation automatique sur cet appareil (réactivable à la main)
  try { localStorage.setItem(CLOUD_AUTO_KEY, 'off'); } catch { /* stockage indisponible */ }
  cloudMsg('Appareil délié. La sauvegarde en ligne est conservée.');
  renderCloud();
});

let confirmDelete = false;
$('cloud-delete').addEventListener('click', async () => {
  Sound.click();
  if (!cloud.link || cloud.busy) return;
  if (!confirmDelete) {
    confirmDelete = true;
    $('cloud-delete').textContent = 'Confirmer la suppression ?';
    setTimeout(() => { confirmDelete = false; $('cloud-delete').textContent = 'Supprimer la sauvegarde en ligne'; }, 4000);
    return;
  }
  confirmDelete = false;
  $('cloud-delete').textContent = 'Supprimer la sauvegarde en ligne';
  cloud.busy = true;
  try {
    await cloudCall('/v1/delete', { name: cloud.link.name, key: cloud.link.key });
    cloudUnlink();
    cloudMsg('Sauvegarde en ligne supprimée. Votre partie reste dans ce navigateur.');
  } catch (e) { cloudMsg(e.message); } finally { cloud.busy = false; renderCloud(); }
});

$('cloud-resume-open').addEventListener('click', () => {
  Sound.click();
  $('cloud-resume').hidden = !$('cloud-resume').hidden;
  if (!$('cloud-resume').hidden) $('cloud-name').focus();
});

async function cloudLoadFromForm() {
  if (cloud.busy) return;
  const name = $('cloud-name').value.normalize('NFC').trim();
  const key = normKey($('cloud-keyin').value);
  if (!LB_NAME_RE.test(name)) { cloudMsg('Pseudo invalide.'); return; }
  if (!key) { cloudMsg('Clé invalide : elle ressemble à LAC-XXXXX-XXXXX-XXXXX-XXXXX.'); return; }
  cloud.busy = true;
  cloudMsg('Chargement…');
  try {
    const r = await cloudCall('/v1/load', { name, key });
    const save = validProgress(r.save);
    if (!save || save.v !== 2) throw { message: 'Sauvegarde en ligne illisible.' };
    // le pseudo affiché est celui du personnage (même pseudo, casse éventuellement différente)
    const display = save.look?.name && normName(save.look.name) === normName(name) ? save.look.name : name;
    pendingImport = save;
    pendingLink = { name: display, key, rev: vInt(r.rev, Number.MAX_SAFE_INTEGER), at: vInt(r.updatedAt, 1e14) };
    $('save-summary').textContent = `Partie en ligne trouvée (envoyée le ${fmtWhen(r.updatedAt)}) : ${saveSummary(save)}. Elle remplacera la partie de ce navigateur.`;
    $('save-confirm').hidden = false;
    $('cloud-resume').hidden = true;
    $('cloud-keyin').value = '';
    cloudMsg('');
  } catch (e) {
    cloudMsg(e.message || 'Chargement impossible.');
  } finally {
    cloud.busy = false;
  }
}
$('cloud-load').addEventListener('click', () => { Sound.click(); cloudLoadFromForm(); });
for (const id of ['cloud-name', 'cloud-keyin']) {
  $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') cloudLoadFromForm(); });
}

// Conflit : charger la version en ligne, ou garder celle d'ici (qui écrase la version en ligne)
$('cloud-take').addEventListener('click', () => {
  const c = cloud.conflict;
  if (!c || !cloud.link) return;
  Sound.click();
  pendingImport = c.save;
  pendingLink = { ...cloud.link, rev: c.rev, at: c.at };
  $('save-summary').textContent = `Version en ligne : ${saveSummary(c.save)}. Elle remplacera la partie de ce navigateur.`;
  $('save-confirm').hidden = false;
});
$('cloud-force').addEventListener('click', async () => {
  const c = cloud.conflict;
  if (!c || !cloud.link) return;
  Sound.click();
  cloudSetLink({ ...cloud.link, rev: c.rev });
  await cloudPush({ force: true });
});

cloudReadLink();

// ---------------------------------------------------------------------------
// Mode admin
// ---------------------------------------------------------------------------
// Plus de case à cocher : le mode admin ne s'active plus depuis l'interface.
// setAdmin(true) reste disponible pour brancher plus tard un autre moyen d'activation.
function setAdmin(on) {
  admin.on = !!on;
  if (!admin.on) { admin.forced = 'random'; admin.corruption = null; }
  syncAdmin();
}

function syncAdmin() {
  $('admin-box').hidden = !admin.on;
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
  for (const id of ['admin-weather', 'admin-hour', 'admin-night', 'admin-day', 'admin-item', 'admin-curse']) $(id).disabled = !inGame;
  const c = corruption();
  $('admin-corrupt').value = Math.round(c * 100);
  $('admin-corrupt-val').textContent = `${Math.round(c * 100)} %`;
  for (const id of ['admin-dex', 'admin-money', 'admin-pots']) $(id).disabled = !inGame;
  $('admin-hint').textContent = inGame
    ? 'Les succès sont désactivés tant que le mode admin est actif.'
    : 'Lancez une partie pour utiliser les outils du carnet, des pièces et des caisses.';
  updateHud();
}

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
  refreshCurseDay(true);
  invalidateMods();
  updateWorldHud(true);
  writeSave();
  $('admin-hint').textContent = `Jour ${dayOf(progress.clock)}, ${fmtHour(progress.clock)}.`;
}
$('admin-hour').addEventListener('click', () => adminSkipTo(null));
$('admin-night').addEventListener('click', () => adminSkipTo(22));
$('admin-day').addEventListener('click', () => adminSkipTo(8));
// relance les offres du jour (et retire la malédiction active), pour tester les effets visuels
$('admin-curse').addEventListener('click', () => {
  progress.curse = { day: 0, offers: [], active: null, decided: false };
  refreshCurseDay(false);
  writeSave();
  updateHud();
  $('admin-hint').textContent = `Malédictions du jour : ${progress.curse.offers.map((id) => CURSE_BY_ID[id].name).join(', ')}.`;
});
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
  renderCloud();
  const s = Sound.settings;
  $('opt-music').value = Math.round(s.music * 100);
  $('opt-sfx').value = Math.round(s.sfx * 100);
  $('opt-music-val').textContent = `${Math.round(s.music * 100)} %`;
  $('opt-sfx-val').textContent = `${Math.round(s.sfx * 100)} %`;
  $('opt-mute').checked = s.muted;
  // choix du morceau : automatique (selon le moment du jeu) ou un morceau précis, en boucle ou en playlist
  const sel = $('opt-track');
  if (!sel.options.length) {
    const auto = document.createElement('option');
    auto.value = 'auto';
    auto.textContent = 'Automatique (selon le moment)';
    sel.append(auto);
    for (const tr of Sound.trackList()) {
      const o = document.createElement('option');
      o.value = tr.id;
      o.textContent = `${tr.title} — ${tr.info}`;
      sel.append(o);
    }
  }
  sel.value = s.track;
  $('opt-loop').checked = s.loop;
  $('opt-loop').disabled = s.track === 'auto';
  $('opt-track-hint').textContent = s.track === 'auto'
    ? 'La musique suit le jeu : le village, la pluie, la nuit, le lac corrompu… et le combat contre le Grand Ancien.'
    : s.loop ? 'Ce morceau est rejoué en boucle (sauf pendant le combat contre le Grand Ancien).'
    : 'Ce morceau est joué, puis les suivants, l\'un après l\'autre.';
  $('opt-fullscreen').textContent = document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran';
  syncAdmin();
}

$('opt-music').addEventListener('input', (e) => { Sound.set('music', e.target.value / 100); syncOptions(); });
$('opt-sfx').addEventListener('input', (e) => { Sound.set('sfx', e.target.value / 100); syncOptions(); });
$('opt-sfx').addEventListener('change', () => Sound.bell(false));
$('opt-mute').addEventListener('change', (e) => { Sound.set('muted', e.target.checked); syncOptions(); });
$('opt-track').addEventListener('change', (e) => { Sound.init(); Sound.chooseTrack(e.target.value, $('opt-loop').checked); syncOptions(); });
$('opt-loop').addEventListener('change', (e) => { Sound.chooseTrack($('opt-track').value, e.target.checked); syncOptions(); });
// Plein écran ; sur mobile (Android), on bloque aussi l'écran à l'horizontale quand c'est permis
function enterFullscreen() {
  const p = document.documentElement.requestFullscreen?.();
  if (!p) return;
  p.then(() => screen.orientation?.lock?.('landscape')?.catch(() => {})).catch(() => {});
}
$('opt-fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else enterFullscreen();
});
// écran « tournez votre téléphone » : le bouton n'apparaît que si le navigateur gère le plein écran
// (Android ; pas Safari sur iPhone)
$('rotate-fs').hidden = !document.documentElement.requestFullscreen;
$('rotate-fs').addEventListener('click', enterFullscreen);
// appui long sur le lac (remontée de la ligne) : pas de menu contextuel ni de loupe
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
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
  // cinématique : Espace / Entrée pour avancer, Échap pour passer
  if (cine.on) {
    if (e.code === 'Escape') endIntro();
    else if (['Space', 'Enter', 'NumpadEnter'].includes(e.code) && !e.repeat) { e.preventDefault(); cineNext(); }
    return;
  }
  // on tape dans un champ (nom du personnage, montant à la banque…) : pas de raccourcis, sauf Échap
  if (e.target.matches?.('input, textarea, select') && e.code !== 'Escape') return;
  // dialogue avec un habitant : Espace / Entrée pour avancer
  if (openPanelName === 'talk' && ['Space', 'Enter', 'NumpadEnter'].includes(e.code) && !e.repeat) {
    e.preventDefault();
    talkNext();
    return;
  }
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
  // raccourcis vers les habitants du village : B (bric-à-brac), M (sorcière)
  const npcKey = { KeyB: ['bric', 'shop'], KeyM: ['witch', 'curses'] }[e.code];
  if (npcKey) {
    if (openPanelName === npcKey[1]) closePanel(); else openNpc(npcKey[0]);
    return;
  }
  if (e.code === 'KeyS' && !e.repeat && !e.ctrlKey && !e.metaKey) { saveNow(); return; }
  const target = { KeyC: 'book', KeyP: 'sheet', KeyK: 'crates', KeyT: 'achievements', KeyV: 'village' }[e.code];
  if (target) {
    if (openPanelName === target) closePanel();
    else openPanel(target);
  }
});

window.addEventListener('beforeunload', () => { if (inGame) writeSave(); });

// Toute l'interface est en "em" : on ajuste la taille de base à celle de l'écran.
// Petit écran (téléphone à l'horizontale, moins de 500 px de haut) : mode « compact », avec un texte
// plus grand que la simple mise à l'échelle (≈ 11 px au lieu de 8) et une mise en page resserrée.
const COMPACT_MAX_H = 500;
function fitUi() {
  const r = $('game').getBoundingClientRect();
  if (!r.width) return;                            // jeu masqué (téléphone à la verticale)
  const compact = r.height < COMPACT_MAX_H;
  $('game').classList.toggle('compact', compact);
  $('game').style.fontSize = `${compact ? Math.max(10.5, Math.min(12, r.height / 34)) : Math.max(9, r.width / 80)}px`;
}
window.addEventListener('resize', fitUi);
window.addEventListener('orientationchange', () => setTimeout(fitUi, 250));
window.visualViewport?.addEventListener('resize', fitUi);

// ===========================================================================
// Démarrage & boucle
// ===========================================================================
// ---------------------------------------------------------------------------
// Disque « musique en cours », en bas à droite
// ---------------------------------------------------------------------------
// (titres des morceaux : registre TRACKS de audio.js)
let npKey = '';
function updateNowPlaying() {
  const np = Sound.nowPlaying();
  const s = Sound.settings;
  const key = `${np.track}|${np.playing}|${s.track}|${s.loop}`;
  if (key === npKey) return;
  const changed = npKey && npKey.split('|')[0] !== np.track;
  npKey = key;
  const el = $('now-playing');
  $('np-title').textContent = np.title;
  $('np-mode').textContent = s.track === 'auto' ? 'En écoute' : s.loop ? 'En boucle' : 'Playlist';
  el.title = `${np.title} — ${np.info}${np.playing ? '' : ' (en pause : musique coupée ou pas encore lancée)'} · cliquez pour choisir un morceau`;
  el.classList.toggle('paused', !np.playing);
  el.classList.toggle('epic', np.track === 'epic');
  if (changed) {                                   // petite animation au changement de morceau
    el.classList.remove('swap');
    void el.offsetWidth;
    el.classList.add('swap');
  }
}
$('np-disc').getContext('2d').drawImage(buildDiscIcon(), 0, 0);
// un clic sur le disque ouvre les options, où l'on choisit le morceau
$('now-playing').addEventListener('click', () => { if (!cine.on) openPanel('options'); });
$('now-playing').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !cine.on) openPanel('options'); });

// Morceau du mode automatique : il suit ce qui se passe dans le jeu
function musicContext() {
  if (!inGame) return 'calm';
  if (['village', 'talk', 'bank', 'fishmonger', 'shop'].includes(openPanelName)) return 'village';
  if (openPanelName === 'curses' || corruption() >= 0.6) return 'abysses';
  if (isNight()) return 'nuit';
  if (['pluie', 'orage'].includes(weather().id)) return 'pluie';
  return 'calm';
}

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
  if (cine.on) {                                   // cinématique : le jeu est en pause
    drawCine(dt);
    requestAnimationFrame(loop);
    return;
  }
  update(dt);
  render();
  Sound.setContext(musicContext());               // le changement se fait à la prochaine mesure
  updateNowPlaying();
  if (openPanelName === 'talk') talk.typer?.update(dt);
  if (openPanelName === 'village') drawVillageFrame();
  if (openPanelName === 'book') for (const b of bookCanvases) renderFishCanvas(b.cv, b.f, { abom: b.abom, silhouette: !b.known, t: time });
  if (openPanelName === 'pot') for (const b of potCanvases) renderFishCanvas(b.cv, b.f, { abom: b.abom, t: time });
  if (inGame && game.state === 'caught' && game.catch) renderFishCanvas($('cc-fish'), game.catch.f, { abom: game.catch.abom, t: time });
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
