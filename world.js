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
// signe d'une valeur : « + » pour un gain, « − » pour une perte (inv : l'effet est une réduction)
const sgn = (v, inv = false) => ((v < 0) !== inv ? '−' : '+');
const FX = {
  gold:     { label: (v) => `Or récolté ${sgn(v)}${pctTxt(Math.abs(v))}`,            value: 1500 },
  rare:     { label: (v) => `Rareté ${sgn(v)}${pctTxt(Math.abs(v))}`,                value: 1000 },
  abom:     { label: (v) => `Abomination ${sgn(v)}${numTxt(Math.abs(v) * 100)} %`,   value: 6000 },
  window:   { label: (v) => `Réaction ${sgn(v)}${numTxt(Math.abs(v))} s`,            value: 1500 },
  vigor:    { label: (v) => `Vigueur des poissons ${sgn(v, true)}${pctTxt(Math.abs(v))}`, value: 1000 },
  speed:    { label: (v) => `Attente ${sgn(v, true)}${pctTxt(Math.abs(v))}`,         value: 1000 },
  bar:      { label: (v) => `Barre verte ${sgn(v)}${pctTxt(Math.abs(v))}`,           value: 1000 },
  luck:     { label: (v) => `Chance d'objet ${sgn(v)}${pctTxt(Math.abs(v))}`,        value: 400 },
  chest:    { label: (v) => `Coffres ${sgn(v)}${pctTxt(Math.abs(v))}`,               value: 200 },
  crate:    { label: (v) => `Vitesse des caisses ${sgn(v)}${pctTxt(Math.abs(v))}`,   value: 400 },
  perfect:  { label: (v) => `Bonus Perfect ${sgn(v)}${pctTxt(Math.abs(v))}`,         value: 300 },
  legend:   { label: (v) => `Légendaires ×${numTxt(v)}`,           value: 300, mul: true },
  abomMul:  { label: (v) => `Abominations ×${numTxt(v)}`,          value: 300, mul: true },
  cthulhu:  { label: (v) => `Grand Ancien ×${numTxt(v)}`,          value: 250, mul: true },
  // contre le Grand Ancien uniquement : il se débat moins, et la barre verte est plus large
  cthVigor: { label: (v) => `Vigueur du Grand Ancien ${sgn(v, true)}${pctTxt(Math.abs(v))}`, value: 1200 },
  cthBar:   { label: (v) => `Barre contre le Grand Ancien ${sgn(v)}${pctTxt(Math.abs(v))}`, value: 900 },
  vigorMul: { label: (v) => `Poissons ${v >= 1 ? '+' : '−'}${pctTxt(Math.abs(v - 1))} vigoureux`, value: 0, mul: true },
};
const fxLines = (fx) => Object.entries(fx).map(([k, v]) => FX[k].label(v));

// Pour comparer deux objets : nom court, format d'une valeur, et sens (inv : l'effet est une réduction)
const FX_CMP = {
  gold:    { name: 'Or récolté',          fmt: pctTxt },
  rare:    { name: 'Rareté',              fmt: pctTxt },
  abom:    { name: 'Abomination',         fmt: (v) => `${numTxt(v * 100)} %` },
  window:  { name: 'Réaction',            fmt: (v) => `${numTxt(v)} s` },
  vigor:   { name: 'Vigueur des poissons', fmt: pctTxt, inv: true },
  speed:   { name: 'Attente',             fmt: pctTxt, inv: true },
  bar:     { name: 'Barre verte',         fmt: pctTxt },
  luck:    { name: "Chance d'objet",      fmt: pctTxt },
  chest:   { name: 'Coffres',             fmt: pctTxt },
  crate:   { name: 'Vitesse des caisses', fmt: pctTxt },
  perfect: { name: 'Bonus Perfect',       fmt: pctTxt },
  legend:  { name: 'Légendaires',         mul: true },
  abomMul: { name: 'Abominations',        mul: true },
  cthulhu: { name: 'Grand Ancien',        mul: true },
  vigorMul: { name: 'Vigueur des poissons', mul: true, inv: true },   // ×1,3 = poissons plus vigoureux (malus)
  cthVigor: { name: 'Vigueur du Grand Ancien', fmt: pctTxt, inv: true },
  cthBar:  { name: 'Barre contre le Grand Ancien', fmt: pctTxt },
};

// Différence d'effets si l'on remplace oldFx par newFx : [{ text, good }]
function fxDiff(newFx, oldFx = {}) {
  const keys = Object.keys(FX_CMP).filter((k) => k in newFx || k in oldFx);
  const out = [];
  for (const k of keys) {
    const c = FX_CMP[k];
    if (c.mul) {
      const a = oldFx[k] ?? 1, b = newFx[k] ?? 1;
      if (Math.abs(a - b) < 1e-9) continue;
      out.push({ text: `${c.name} ×${numTxt(a)} → ×${numTxt(b)}`, good: c.inv ? b < a : b > a });
      continue;
    }
    const d = (newFx[k] || 0) - (oldFx[k] || 0);
    if (Math.abs(d) < 1e-9) continue;
    // pour une réduction (attente, vigueur), un gain s'affiche « −x % »
    const sign = (d > 0) !== !!c.inv ? '+' : '−';
    out.push({ text: `${c.name} ${sign}${c.fmt(Math.abs(d))}`, good: d > 0 });
  }
  return out;
}

// ===========================================================================
// Équipement
// ===========================================================================
// Types d'objets (champ « slot » d'un objet) : 5 vêtements et les accessoires
const ITEM_KINDS = [
  { id: 'hook',   name: 'Hameçon',    plural: 'Hameçons' },
  { id: 'gloves', name: 'Gants',      plural: 'Gants' },
  { id: 'boots',  name: 'Bottes',     plural: 'Bottes' },
  { id: 'pants',  name: 'Pantalon',   plural: 'Pantalons' },
  { id: 'jacket', name: 'Veste',      plural: 'Vestes' },
  { id: 'acc',    name: 'Accessoire', plural: 'Accessoires' },
];
const KIND_BY_ID = Object.fromEntries(ITEM_KINDS.map((k) => [k.id, k]));
// Emplacements d'équipement : un par vêtement, trois pour les accessoires (kind : type accepté)
const SLOTS = [
  ...ITEM_KINDS.filter((k) => k.id !== 'acc').map((k) => ({ id: k.id, name: k.name, kind: k.id })),
  { id: 'acc1', name: 'Accessoire 1', kind: 'acc' },
  { id: 'acc2', name: 'Accessoire 2', kind: 'acc' },
  { id: 'acc3', name: 'Accessoire 3', kind: 'acc' },
];
const SLOT_BY_ID = Object.fromEntries(SLOTS.map((s) => [s.id, s]));
const ACC_SLOTS = SLOTS.filter((s) => s.kind === 'acc');

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

  // --- accessoires : trois emplacements, effets variés
  { id: 'a_guide',    slot: 'acc', tier: 0, icon: 'guide',    name: 'Guide du pêcheur débutant', color: '#3a8ce0', accent: '#f5d04a', fx: { window: 0.04, rare: 0.05 },
    desc: "« Chapitre 1 : tenir la canne par le bon bout. » Annoté au crayon par un ancien propriétaire." },
  { id: 'a_thermos',  slot: 'acc', tier: 0, icon: 'thermos',  name: 'Thermos de café',          color: '#c03a3a', accent: '#d8dee4', fx: { speed: 0.05 },
    desc: "Encore chaud. On attend beaucoup mieux avec un café." },
  { id: 'a_patte',    slot: 'acc', tier: 0, icon: 'paw',      name: 'Patte de lapin',           color: '#e8dcc8', accent: '#a07a5a', fx: { luck: 0.15 },
    desc: "Elle porte chance. Pas au lapin, visiblement." },
  { id: 'a_filet',    slot: 'acc', tier: 1, icon: 'net',      name: 'Filet de pêche',           color: '#c8b48a', accent: '#8a5a32', fx: { bar: 0.08, chest: 0.2 },
    desc: "Une grande épuisette au manche de bois : plus rien ne s'échappe au dernier moment." },
  { id: 'a_transat',  slot: 'acc', tier: 1, icon: 'chair',    name: 'Chaise de transat',        color: '#3aa0a0', accent: '#f1e3c0', fx: { speed: 0.1, vigor: 0.04 },
    desc: "Pliante, rayée, parfaite. La patience devient un art de vivre." },
  { id: 'a_radio',    slot: 'acc', tier: 1, icon: 'radio',    name: 'Petite radio',             color: '#8a4a24', accent: '#d8dee4', fx: { speed: 0.06, gold: 0.05 },
    desc: "Elle capte une seule station, qui ne passe que de vieilles chansons de marins." },
  { id: 'a_sondeur',  slot: 'acc', tier: 2, icon: 'sonar',    name: 'Sondeur portatif',         color: '#2a3a4a', accent: '#5ee05e', fx: { rare: 0.25, speed: 0.06 },
    desc: "Un petit écran vert qui montre les poissons. Et parfois une forme beaucoup trop grande." },
  { id: 'a_boussole', slot: 'acc', tier: 2, icon: 'compass',  name: 'Boussole de laiton',       color: '#c89a3a', accent: '#c03a3a', fx: { luck: 0.3, chest: 0.3 },
    desc: "Son aiguille indique les trésors engloutis. Ou le nord. Elle hésite souvent." },
  { id: 'a_lanterne', slot: 'acc', tier: 2, icon: 'lantern',  name: 'Lanterne à huile',         color: '#3a3a40', accent: '#ffc040', fx: { rare: 0.15, abom: 0.01 },
    desc: "Sa lumière attire les poissons des profondeurs… et ce qui les chasse." },
  { id: 'a_carnet',   slot: 'acc', tier: 3, icon: 'notebook', name: 'Carnet du vieux pêcheur',  color: '#5e3a20', accent: '#f3e6c8', fx: { rare: 0.3, window: 0.1 },
    desc: "Cinquante ans de secrets du lac, griffonnés dans les marges. Les dernières pages sont arrachées." },
  { id: 'a_lucioles', slot: 'acc', tier: 3, icon: 'jar',      name: 'Bocal de lucioles',        color: '#a8c8d0', accent: '#d8ff60', fx: { luck: 0.5, crate: 0.3 },
    desc: "Elles clignotent toutes en même temps, comme si elles comptaient quelque chose." },
  { id: 'a_harmonica', slot: 'acc', tier: 3, icon: 'harmonica', name: 'Harmonica',             color: '#b8c4cc', accent: '#3a5aa0', fx: { perfect: 0.6, vigor: 0.1 },
    desc: "Une petite mélodie et les poissons se calment. Personne ne sait pourquoi." },
  { id: 'a_perle',    slot: 'acc', tier: 4, icon: 'pearl',    name: 'Perle des abysses',        color: '#d8e0f0', accent: '#7a5ac8', fx: { gold: 0.35, legend: 1.5 },
    desc: "Grosse comme un œuf, elle reflète un ciel qui n'est pas le nôtre." },
  { id: 'a_necro',    slot: 'acc', tier: 4, icon: 'necro',    name: 'Necronomicon',             color: '#4a2a1e', accent: '#7af0a0', fx: { abom: 0.05, abomMul: 1.5, cthulhu: 2, rare: 0.3 },
    desc: "Le livre interdit de l'Arabe fou Abdul Alhazred, relié d'une peau qui n'est pas du cuir. « N'est pas mort ce qui à jamais dort… »" },

  // --- accessoires contre le Grand Ancien (1.7.0) : l'attirer, l'apaiser, le remonter
  { id: 'a_cloche',   slot: 'acc', tier: 2, icon: 'bell',     name: 'Cloche de brume',          color: '#b87a3a', accent: '#e8d8b0', fx: { cthVigor: 0.15 },
    desc: "Une petite cloche de bouée, verte de vert-de-gris. Son tintement étouffé apaise ce qui dort en dessous." },
  { id: 'a_amulette', slot: 'acc', tier: 2, icon: 'deepamulet', name: 'Amulette des profondeurs', color: '#2e6a6a', accent: '#a8f0d8', fx: { cthulhu: 1.5, cthBar: 0.1 },
    desc: "Une pierre noire percée, pendue à un cordon de varech. Elle tire doucement vers le fond du lac." },
  { id: 'a_ancre',    slot: 'acc', tier: 3, icon: 'anchor',   name: 'Ancre runique',            color: '#6a7480', accent: '#7ad0ff', fx: { cthBar: 0.25, vigor: 0.05 },
    desc: "Couverte de signes qu'aucun forgeron du village ne sait lire. Elle ne coule pas : elle retient." },
  { id: 'a_idole',    slot: 'acc', tier: 3, icon: 'idol',     name: 'Idole de pierre verte',    color: '#3e7a4a', accent: '#d8f070', fx: { cthulhu: 2, cthVigor: 0.1, abom: 0.01 },
    desc: "Une petite statue accroupie, ailée, aux yeux fermés. Mieux vaut qu'ils le restent." },
  { id: 'a_signe',    slot: 'acc', tier: 4, icon: 'eldersign', name: 'Signe des Anciens',      color: '#8a8a80', accent: '#ffb040', fx: { cthVigor: 0.25, cthBar: 0.3, cthulhu: 1.5 },
    desc: "Une étoile à cinq branches gravée dans une pierre grise, avec un œil de flamme en son centre. Ce qui dort sous le lac la craint." },
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
// Bateaux : 5 niveaux, de la barque au navire-laboratoire
// Pour passer au niveau suivant : acheter toutes ses pièces au chantier (boutique)
// + trouver sa pièce spéciale en pêchant (elle ne tombe qu'une fois, et seulement
// celle du prochain niveau). Le niveau du bateau débloque cannes et caisses : tiers ≤ 2 × niveau + 1.
// ===========================================================================
const BOATS = [
  { level: 1, name: 'Barque en bois',
    desc: "La vieille barque de votre grand-père. Elle prend un peu l'eau, mais elle flotte." },
  { level: 2, name: 'Canot à moteur',
    desc: 'Un petit moteur hors-bord, un pare-brise : on traverse enfin le lac sans ramer.',
    parts: [
      { id: 'b2_coque',   name: 'Coque renforcée',     price: 400 },
      { id: 'b2_moteur',  name: 'Moteur hors-bord',    price: 700 },
      { id: 'b2_parebrise', name: 'Pare-brise',        price: 300 },
    ],
    special: { id: 'b2_helice', name: 'Hélice ancienne', desc: "Une hélice de laiton couverte de coquillages. Elle tourne encore quand on souffle dessus." } },
  { level: 3, name: 'Bateau de pêche',
    desc: 'Une vraie cabine, un treuil et une cale : un bateau de pêcheur professionnel.',
    parts: [
      { id: 'b3_cabine',  name: 'Cabine de pilotage',  price: 2500 },
      { id: 'b3_treuil',  name: 'Treuil',              price: 1800 },
      { id: 'b3_cale',    name: 'Cale à poissons',     price: 2200 },
      { id: 'b3_moteur',  name: 'Moteur inboard',      price: 3500 },
    ],
    special: { id: 'b3_gouvernail', name: "Gouvernail de l'épave", desc: "Arraché à une épave dont personne ne connaît le nom. Il tire toujours un peu vers le centre du lac." } },
  { level: 4, name: 'Chalutier',
    desc: "Coque d'acier, grue, projecteurs : de quoi pêcher jour et nuit.",
    parts: [
      { id: 'b4_coque',   name: "Coque en acier",      price: 9000 },
      { id: 'b4_grue',    name: 'Grue de pêche',       price: 7000 },
      { id: 'b4_projo',   name: 'Projecteurs',         price: 5000 },
      { id: 'b4_radio',   name: 'Radio de bord',       price: 4000 },
      { id: 'b4_moteurs', name: 'Double moteur',       price: 12000 },
    ],
    special: { id: 'b4_boussole', name: 'Boussole des profondeurs', desc: "Elle n'indique pas le nord. Elle indique le fond du lac. Toujours." } },
  { level: 5, name: 'Navire Abysse-X',
    desc: 'Un navire-laboratoire bourré de technologie. Le sonar voit des choses qui ne devraient pas exister.',
    parts: [
      { id: 'b5_sonar',   name: 'Sonar 3D',            price: 22000 },
      { id: 'b5_coque',   name: 'Coque en carbone',    price: 30000 },
      { id: 'b5_radar',   name: 'Radar',               price: 18000 },
      { id: 'b5_labo',    name: 'Laboratoire embarqué', price: 25000 },
      { id: 'b5_moteur',  name: 'Moteur hybride',      price: 35000 },
      { id: 'b5_antenne', name: 'Antenne satellite',   price: 15000 },
    ],
    special: { id: 'b5_coeur', name: 'Cœur de Léviathan', desc: "Il bat. Lentement. Il alimente le navire mieux que n'importe quel moteur." } },
];
const BOAT_MAX = BOATS.length;
const boatMaxTier = (level) => 2 * level + 1;

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

// ===========================================================================
// Malédictions : proposées chaque jour par la Sorcière des Brumes, après la première abomination.
// buff / debuff : effets (mêmes clés que FX), affichés en vert / rouge. vis : effet visuel à l'écran.
// ===========================================================================
const WITCH = { name: 'Morgane des Brumes',
  greet: [
    "Approche, pêcheur… Le lac m'a parlé de toi.",
    "Tu as vu ce qui dort sous l'eau. Maintenant, tu peux en payer le prix.",
    "Chaque cadeau a son revers. Choisis bien… ou ne choisis rien.",
    "Les profondeurs t'observent. Autant qu'elles te servent.",
  ] };
const CURSES = [
  { id: 'lune',      name: 'Lune de sang',          color: '#d83a3a', vis: 'blood',
    buff: { gold: 0.6 },                  debuff: { vigorMul: 1.3 },
    desc: "Une lune rouge se lève en plein jour. Les poissons valent de l'or… et se battent comme des diables." },
  { id: 'brume',     name: 'Brume des marais',      color: '#6ac85a', vis: 'miasma',
    buff: { rare: 0.4 },                  debuff: { speed: -0.3 },
    desc: "Une brume verte et tiède couvre le lac. Les poissons rares s'y cachent, mais ils prennent leur temps." },
  { id: 'yeux',      name: 'Les Mille Yeux',        color: '#e0c040', vis: 'eyes',
    buff: { luck: 0.8, chest: 0.8 },      debuff: { window: -0.12 },
    desc: "Des yeux s'ouvrent partout autour de vous. Ils voient les trésors… et vous rendent nerveux." },
  { id: 'encre',     name: "Pluie d'encre",         color: '#4a3a6a', vis: 'ink',
    buff: { abomMul: 2.5 },               debuff: { gold: -0.3 },
    desc: "Il pleut une encre noire et froide. Les abominations adorent ça. Les acheteurs beaucoup moins." },
  { id: 'silence',   name: 'Le Grand Silence',      color: '#a0a8b0', vis: 'mute',
    buff: { perfect: 1, bar: 0.15 },      debuff: { luck: -0.6, chest: -0.6 },
    desc: "Les couleurs et les sons s'éteignent. Votre concentration est parfaite, mais le lac ne donne plus rien." },
  { id: 'vertige',   name: 'Vertige',               color: '#5ac8e0', vis: 'wobble',
    buff: { legend: 2.5 },                debuff: { bar: -0.2 },
    desc: "Le monde tangue. Les géants du lac remontent, mais la barre vous glisse des mains." },
  { id: 'faim',      name: 'Faim des profondeurs',  color: '#3fd08a', vis: 'tentacles',
    buff: { cthulhu: 4, abom: 0.03 },     debuff: { gold: -0.25 },
    desc: "Des tentacules frôlent la coque. Quelque chose d'immense a faim, et il vous a remarqué." },
  { id: 'cendres',   name: 'Pluie de cendres',      color: '#e08a3a', vis: 'ash',
    buff: { crate: 0.8, speed: 0.1 },     debuff: { rare: -0.15 },
    desc: "Des cendres tombent d'un ciel sans feu. Les caisses se remplissent vite, de prises bien ordinaires." },
  { id: 'nuit',      name: 'Nuit sans fin',         color: '#3a4a8a', vis: 'dark',
    buff: { rare: 0.3, abomMul: 1.5 },    debuff: { vigor: -0.15 },
    desc: "L'obscurité tombe en plein jour. Seule votre lanterne éclaire le lac. Ce qui mord est plus féroce." },
  { id: 'murmures',  name: 'Murmures',              color: '#b05ae0', vis: 'runes',
    buff: { window: 0.2, vigor: 0.15 },   debuff: { gold: -0.2 },
    desc: "Des voix soufflent où lancer, quand ferrer. Elles réclament une part de chaque prise." },
  { id: 'etoiles',   name: 'Étoiles mortes',        color: '#c8a0ff', vis: 'stars',
    buff: { luck: 0.5, gold: 0.25 },      debuff: { vigorMul: 1.25 },
    desc: "Des étoiles éteintes depuis longtemps tombent dans le lac. Elles laissent des trésors… et des poissons enragés." },
  { id: 'vers',      name: 'Grouillement',          color: '#c87a6a', vis: 'worms',
    buff: { speed: 0.25 },                debuff: { gold: -0.15, perfect: -0.5 },
    desc: "Des vers sortent de partout, même de la barque. Les poissons mordent sans arrêt, mais le cœur n'y est pas." },
];
const CURSE_BY_ID = Object.fromEntries(CURSES.map((c) => [c.id, c]));
const CURSE_OFFERS = 3;
// effets totaux d'une malédiction (bonus et malus réunis)
function curseFx(c) {
  const fx = { ...c.buff };
  for (const [k, v] of Object.entries(c.debuff)) fx[k] = k in fx ? (FX[k].mul ? fx[k] * v : fx[k] + v) : v;
  return fx;
}

// La nuit est aussi un « événement » : plus d'abominations et de poissons rares
const NIGHT = { id: 'nuit', name: 'Nuit', fx: { abomMul: 1.5, rare: 0.2 },
  desc: "La nuit, ce qui vit au fond du lac remonte plus près de la surface." };
