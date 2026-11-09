// Lac Tranquille — données : équipement (objets à trouver) et météo
'use strict';

// ===========================================================================
// Effets (modificateurs)
// ===========================================================================
// Clés additives : s'additionnent entre toutes les sources.
// Clés multiplicatives (mul: true) : se multiplient entre elles.
// value : prix de revente (en pièces) pour 1 unité de l'effet.
const pctTxt = (v) => `${Math.round(v * 100)} %`;
const numTxt = (v) => String(Math.round(v * 100) / 100).replace('.', ',');
const FX = {
  gold:     { label: (v) => `Or récolté +${pctTxt(v)}`,            value: 1500 },
  rare:     { label: (v) => `Rareté +${pctTxt(v)}`,                value: 1000 },
  abom:     { label: (v) => `Abomination +${numTxt(v * 100)} %`,   value: 6000 },
  window:   { label: (v) => `Réaction +${numTxt(v)} s`,            value: 1500 },
  vigor:    { label: (v) => `Vigueur des poissons −${pctTxt(v)}`,  value: 1000 },
  speed:    { label: (v) => `Attente −${pctTxt(v)}`,               value: 1000 },
  bar:      { label: (v) => `Barre verte +${pctTxt(v)}`,           value: 1000 },
  luck:     { label: (v) => `Chance d'objet +${pctTxt(v)}`,        value: 400 },
  chest:    { label: (v) => `Coffres +${pctTxt(v)}`,               value: 200 },
  crate:    { label: (v) => `Vitesse des caisses +${pctTxt(v)}`,   value: 400 },
  perfect:  { label: (v) => `Bonus Perfect +${pctTxt(v)}`,         value: 300 },
  legend:   { label: (v) => `Légendaires ×${numTxt(v)}`,           value: 300, mul: true },
  abomMul:  { label: (v) => `Abominations ×${numTxt(v)}`,          value: 300, mul: true },
  cthulhu:  { label: (v) => `Grand Ancien ×${numTxt(v)}`,          value: 250, mul: true },
  vigorMul: { label: (v) => `Poissons ${v >= 1 ? '+' : '−'}${pctTxt(Math.abs(v - 1))} vigoureux`, value: 0, mul: true },
};
const fxLines = (fx) => Object.entries(fx).map(([k, v]) => FX[k].label(v));

// ===========================================================================
// Équipement
// ===========================================================================
const SLOTS = [
  { id: 'hook',   name: 'Hameçon',  plural: 'Hameçons' },
  { id: 'gloves', name: 'Gants',    plural: 'Gants' },
  { id: 'boots',  name: 'Bottes',   plural: 'Bottes' },
  { id: 'pants',  name: 'Pantalon', plural: 'Pantalons' },
  { id: 'jacket', name: 'Veste',    plural: 'Vestes' },
];
const SLOT_BY_ID = Object.fromEntries(SLOTS.map((s) => [s.id, s]));

// tier : rareté (0 Commun → 4 Légendaire). Les objets se trouvent sur les poissons et dans les caisses.
const ITEMS = [
  // --- hameçons : rareté et réflexes
  { id: 'h_rouille', slot: 'hook', tier: 0, name: 'Hameçon rouillé',      color: '#a0603a', accent: '#6a3a1e', fx: { window: 0.05 },
    desc: "Trouvé dans la gueule d'une vieille brème. Il pique encore." },
  { id: 'h_acier',   slot: 'hook', tier: 1, name: 'Hameçon en acier',     color: '#b8c0c8', accent: '#7a848e', fx: { window: 0.08, rare: 0.1 },
    desc: "Solide, bien affûté, sans histoire." },
  { id: 'h_triple',  slot: 'hook', tier: 2, name: 'Hameçon triple',       color: '#d8dee4', accent: '#3a72c8', fx: { rare: 0.3, window: 0.06 },
    desc: "Trois pointes valent mieux qu'une. Les gros poissons ne s'en défont pas." },
  { id: 'h_dore',    slot: 'hook', tier: 3, name: 'Hameçon doré',         color: '#f5d04a', accent: '#b07f12', fx: { gold: 0.2, rare: 0.3 },
    desc: "Un hameçon en or massif. Ridicule, mais les poissons adorent ce qui brille." },
  { id: 'h_os',      slot: 'hook', tier: 4, name: "Hameçon d'os noir",    color: '#3a3040', accent: '#c04aff', fx: { rare: 0.6, abom: 0.03 },
    desc: "Taillé dans un os qui n'appartient à aucun animal connu." },
  { id: 'h_rlyeh',   slot: 'hook', tier: 4, name: 'Croc de R\'lyeh',      color: '#4f8f66', accent: '#b8f0a0', fx: { cthulhu: 3, abom: 0.04, rare: 0.2 },
    desc: "Il est tiède. Il bat, très lentement, comme un cœur endormi." },

  // --- gants : facilité de remontée
  { id: 'g_laine',   slot: 'gloves', tier: 0, name: 'Mitaines de laine',     color: '#c84a3a', accent: '#f1e3c0', fx: { vigor: 0.05 },
    desc: "Tricotées par votre grand-mère. Elles grattent un peu." },
  { id: 'g_cuir',    slot: 'gloves', tier: 1, name: 'Gants de cuir',         color: '#8a5a32', accent: '#5e3a20', fx: { vigor: 0.1 },
    desc: "Souples et résistants. La ligne ne vous brûle plus les doigts." },
  { id: 'g_grip',    slot: 'gloves', tier: 2, name: 'Gants antidérapants',   color: '#3a8ce0', accent: '#1e3a6a', fx: { bar: 0.12, vigor: 0.08 },
    desc: "Une prise ferme, même mouillée." },
  { id: 'g_maitre',  slot: 'gloves', tier: 3, name: 'Gants de maître',       color: '#2a2a34', accent: '#f5d04a', fx: { bar: 0.2, vigor: 0.15 },
    desc: "Portés par le vieux champion du lac. Ils se souviennent des bons gestes." },
  { id: 'g_silure',  slot: 'gloves', tier: 4, name: 'Gants en peau de silure', color: '#5e584a', accent: '#d8d0a0', fx: { bar: 0.3, vigor: 0.22, perfect: 0.5 },
    desc: "Visqueux à l'extérieur, étrangement chauds à l'intérieur." },

  // --- bottes : patience et caisses
  { id: 'b_trouees', slot: 'boots', tier: 0, name: 'Bottes trouées',        color: '#4a5a3a', accent: '#2e3a22', fx: { speed: 0.04 },
    desc: "Elles prennent l'eau, mais vous ne bougez plus, et les poissons apprécient." },
  { id: 'b_caoutch', slot: 'boots', tier: 1, name: 'Bottes en caoutchouc',  color: '#e0c030', accent: '#8a7414', fx: { speed: 0.08 },
    desc: "Jaunes, comme il se doit." },
  { id: 'b_cuiss',   slot: 'boots', tier: 2, name: 'Cuissardes',            color: '#2f4a3a', accent: '#1a2a20', fx: { speed: 0.12, crate: 0.2 },
    desc: "Elles montent jusqu'à la taille. Idéal pour aller poser les caisses." },
  { id: 'b_passeur', slot: 'boots', tier: 3, name: 'Bottes du passeur',     color: '#5a4a6a', accent: '#c8b8e0', fx: { speed: 0.16, crate: 0.35 },
    desc: "Leur ancien propriétaire faisait traverser le lac. Il n'est jamais revenu de l'autre rive." },
  { id: 'b_abysses', slot: 'boots', tier: 4, name: 'Bottes des abysses',    color: '#1e2a4a', accent: '#5ee0b0', fx: { speed: 0.22, crate: 0.6, abom: 0.02 },
    desc: "Lestées de plomb noir. Elles laissent des empreintes humides partout, même au sec." },

  // --- pantalons : trouvailles et coffres
  { id: 'p_rapiece', slot: 'pants', tier: 0, name: 'Pantalon rapiécé',      color: '#6a6a5a', accent: '#a8946a', fx: { luck: 0.1 },
    desc: "Plus de pièces que de pantalon." },
  { id: 'p_salop',   slot: 'pants', tier: 1, name: 'Salopette',             color: '#3e5a9a', accent: '#f5d04a', fx: { luck: 0.2, chest: 0.2 },
    desc: "Une poche sur le ventre pour ranger les trouvailles." },
  { id: 'p_poches',  slot: 'pants', tier: 2, name: 'Pantalon à poches',     color: '#6a7a4a', accent: '#3e4a2a', fx: { chest: 0.5, luck: 0.25 },
    desc: "Douze poches. Vous n'en avez trouvé que onze." },
  { id: 'p_contreb', slot: 'pants', tier: 3, name: 'Pantalon du contrebandier', color: '#2a2a3a', accent: '#c03a3a', fx: { chest: 1, gold: 0.1, luck: 0.3 },
    desc: "Il a un double fond. Et un triple fond. Et une odeur de rhum." },
  { id: 'p_ecailles', slot: 'pants', tier: 4, name: "Pantalon cousu d'écailles", color: '#5aa088', accent: '#c0f0e0', fx: { luck: 0.7, chest: 1.2, rare: 0.15 },
    desc: "Chaque écaille vient d'un poisson différent. Certaines bougent encore." },

  // --- vestes : l'or
  { id: 'v_cire',    slot: 'jacket', tier: 0, name: 'Ciré jaune',           color: '#e8c030', accent: '#9a7a14', fx: { gold: 0.05 },
    desc: "Indispensable quand il pleut. Et il pleut souvent." },
  { id: 'v_laine',   slot: 'jacket', tier: 1, name: 'Veste en laine',       color: '#7a4a5a', accent: '#4a2a36', fx: { gold: 0.1 },
    desc: "Chaude et confortable pour les longues matinées." },
  { id: 'v_gilet',   slot: 'jacket', tier: 2, name: 'Gilet de pêcheur',     color: '#7a8a5a', accent: '#4a5a32', fx: { gold: 0.15, luck: 0.1 },
    desc: "Couvert de poches et de mouches artificielles." },
  { id: 'v_capit',   slot: 'jacket', tier: 3, name: 'Veste du capitaine',   color: '#22408a', accent: '#f5d04a', fx: { gold: 0.25, window: 0.08 },
    desc: "Galons dorés, boutons de cuivre. Les poissons vous saluent." },
  { id: 'v_noyes',   slot: 'jacket', tier: 4, name: 'Manteau des noyés',    color: '#2a3a4a', accent: '#9ad0e0', fx: { gold: 0.4, rare: 0.3, abom: 0.03 },
    desc: "Il est toujours trempé. Les poches sont pleines de pièces anciennes." },
];
const ITEM_BY_ID = Object.fromEntries(ITEMS.map((it) => [it.id, it]));
const ITEM_TIER_WEIGHT = [40, 24, 12, 4, 1.2];
const ITEM_CAP = 60;                    // place dans l'inventaire

// Prix de revente : proportionnel à la puissance des effets
function itemValue(it) {
  let v = 0;
  for (const [k, x] of Object.entries(it.fx)) v += (FX[k].mul ? x - 1 : x) * FX[k].value;
  return Math.max(5, Math.round(v / 5) * 5);
}

// ===========================================================================
// Temps et météo
// ===========================================================================
const DAY_LEN = 600;                        // un jour = 10 minutes de jeu
const CLOCK_START = DAY_LEN * (8 / 24);     // une nouvelle partie commence à 8 h

// vis : réglages visuels (couverture nuageuse, pluie, orage, brouillard, vent, soleil, arc-en-ciel)
// weight : poids de tirage. dur : durée (secondes de jeu). dayOnly : impossible la nuit.
const WEATHERS = [
  { id: 'clair',      name: 'Beau temps',   weight: 30, dur: [120, 300], fx: {},
    desc: 'Un temps calme et doux. Rien de particulier.',
    vis: { wind: 0.1 } },
  { id: 'soleil',     name: 'Grand soleil', weight: 16, dur: [120, 260], dayOnly: true, fx: { gold: 0.4 },
    desc: "Le soleil tape fort : les poissons sont plus beaux et se vendent plus cher.",
    vis: { sun: 1 } },
  { id: 'nuageux',    name: 'Nuageux',      weight: 18, dur: [100, 240], fx: { speed: 0.15 },
    desc: 'Par temps couvert, les poissons sortent de leur cachette et mordent plus vite.',
    vis: { overcast: 0.45, wind: 0.2 } },
  { id: 'pluie',      name: 'Pluie',        weight: 14, dur: [100, 240], fx: { legend: 2.5, crate: 0.25 },
    desc: 'La pluie fait remonter les géants du lac : les légendaires mordent bien plus souvent.',
    vis: { overcast: 0.75, rain: 0.55, wind: 0.2 } },
  { id: 'orage',      name: 'Orage',        weight: 6,  dur: [70, 160],  fx: { abomMul: 3, cthulhu: 2, vigorMul: 1.15 },
    desc: "La foudre réveille ce qui dort au fond. Les abominations sortent en nombre… et les poissons se débattent davantage.",
    vis: { overcast: 0.95, storm: 1, rain: 1, wind: 0.6 } },
  { id: 'brouillard', name: 'Brouillard',   weight: 8,  dur: [90, 200],  fx: { luck: 1, rare: 0.2 },
    desc: 'Dans la brume, des choses perdues remontent à la surface : bien plus d\'objets à trouver.',
    vis: { overcast: 0.3, fog: 1 } },
  { id: 'vent',       name: 'Grand vent',   weight: 8,  dur: [90, 200],  fx: { crate: 0.6, chest: 1 },
    desc: 'Le vent agite le lac : les caisses se remplissent plus vite et les coffres dérivent vers vous.',
    vis: { overcast: 0.15, wind: 1 } },
  { id: 'arcenciel',  name: 'Arc-en-ciel',  weight: 0,  dur: [60, 120],  dayOnly: true, fx: { gold: 0.25, luck: 0.5, perfect: 1 },
    desc: "Après la pluie, un arc-en-ciel. On dit qu'il porte chance.",
    vis: { rainbow: 1, overcast: 0.1 } },
];
const WEATHER_BY_ID = Object.fromEntries(WEATHERS.map((w) => [w.id, w]));

// La nuit est aussi un « événement » : plus d'abominations et de poissons rares
const NIGHT = { id: 'nuit', name: 'Nuit', fx: { abomMul: 1.5, rare: 0.2 },
  desc: "La nuit, ce qui vit au fond du lac remonte plus près de la surface." };
