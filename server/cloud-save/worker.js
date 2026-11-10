// Lac Tranquille — sauvegardes en ligne (Cloudflare Worker + D1)
//
// Un joueur = un pseudo + une clé secrète générée par le jeu (« LAC-XXXXX-XXXXX-XXXXX-XXXXX »).
// Le serveur ne stocke que l'empreinte SHA-256 de la clé. Aucun cookie, aucune session :
// chaque requête porte le pseudo et la clé dans son corps JSON (jamais dans l'URL, jamais loguée).
//
// Routes (corps JSON, 4 Ko max sauf /save) :
//   POST /v1/save         { name, key, save, baseRev, fish? }  crée la place (pseudo libre) ou met à jour ;
//                         le score du classement est recalculé au passage (automatique)
//   POST /v1/load         { name, key }         renvoie { save, rev, updatedAt }
//   POST /v1/delete       { name, key }         supprime la sauvegarde en ligne (et le score)
//   POST /v1/score        { name, key, fish }   recalcule le score depuis la sauvegarde en ligne
//                         (gardée pour les jeux 1.5.x, qui l'appellent encore)
//   GET  /v1/leaderboard?cat=earned             les 50 premiers d'une catégorie
//   GET  /v1/leaderboard.svg?cat=earned         les 10 premiers, en image SVG (README du dépôt GitHub)
//
// Sécurité (cf. CLAUDE.md) : schéma strict, tailles bornées, requêtes SQL paramétrées,
// limitation du débit (binding RATE_LIMITER), journaux sans données personnelles.
'use strict';

// Même règle de pseudo que le jeu (LB_NAME_RE dans game.js) et le classement (scripts/leaderboard.mjs)
const NAME_RE = /^[\p{L}\p{M}\p{N} '’._-]{1,16}$/u;
// Clé : préfixe LAC + 4 groupes de 5 caractères Crockford base32 (100 bits d'aléa)
const KEY_RE = /^LAC(-[0-9A-HJKMNP-TV-Z]{5}){4}$/;
const GV_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;

const BODY_MAX = 256 * 1024;        // une sauvegarde réelle pèse quelques Ko
const SMALL_BODY_MAX = 4 * 1024;    // /load et /delete
const MIN_WRITE_GAP_MS = 20 * 1000; // une écriture toutes les 20 s au plus par pseudo

// Champs de premier niveau acceptés : ceux de emptyProgress() dans game.js, plus gv.
// Ajouter un champ à la sauvegarde du jeu = l'ajouter ici ET redéployer le Worker.
const SAVE_FIELDS = new Set([
  'v', 'gv', 'money', 'rod', 'rods', 'bait', 'baits', 'dex', 'potsOwned', 'pots', 'achievements', 'look',
  'boat', 'items', 'equip', 'itemSeq', 'clock', 'weather', 'curse', 'catches', 'bank', 'market', 'bric',
  'met', 'stats', 'tuto', 'seen',
]);
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const LIMITS = { depth: 8, nodes: 20000, keys: 400, array: 1000, string: 200, key: 64, number: 1e15 };

class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new HttpError(status, code, message); };

// --- Validation de la sauvegarde (donnée non fiable) ------------------------------------------
// Le Worker ne connaît pas le contenu du jeu : il vérifie la forme (champs connus, types, bornes,
// profondeur, taille). Le jeu revalide tout, champ par champ, au chargement (validProgress()).
function checkTree(x, depth, counter) {
  if (++counter.n > LIMITS.nodes) fail(422, 'trop_gros', 'Sauvegarde trop volumineuse.');
  if (depth > LIMITS.depth) fail(422, 'trop_profond', 'Sauvegarde mal formée.');
  if (x === null || typeof x === 'boolean') return;
  if (typeof x === 'number') {
    if (!Number.isFinite(x) || Math.abs(x) > LIMITS.number) fail(422, 'nombre', 'Sauvegarde mal formée.');
    return;
  }
  if (typeof x === 'string') {
    if (x.length > LIMITS.string) fail(422, 'texte', 'Sauvegarde mal formée.');
    return;
  }
  if (Array.isArray(x)) {
    if (x.length > LIMITS.array) fail(422, 'tableau', 'Sauvegarde trop volumineuse.');
    for (const v of x) checkTree(v, depth + 1, counter);
    return;
  }
  if (typeof x === 'object') {
    const keys = Object.keys(x);
    if (keys.length > LIMITS.keys) fail(422, 'cles', 'Sauvegarde trop volumineuse.');
    for (const k of keys) {
      if (FORBIDDEN_KEYS.has(k) || k.length > LIMITS.key) fail(422, 'cle_interdite', 'Sauvegarde mal formée.');
      checkTree(x[k], depth + 1, counter);
    }
    return;
  }
  fail(422, 'type', 'Sauvegarde mal formée.');
}

function validSave(save) {
  if (!save || typeof save !== 'object' || Array.isArray(save)) fail(422, 'format', 'Sauvegarde absente.');
  if (save.v !== 2) fail(422, 'format', 'Format de sauvegarde inconnu.');
  for (const k of Object.keys(save)) {
    if (!SAVE_FIELDS.has(k)) fail(422, 'champ_inconnu', 'Champ de sauvegarde inconnu : mettez à jour le serveur.');
  }
  if (save.gv !== undefined && (typeof save.gv !== 'string' || !GV_RE.test(save.gv))) fail(422, 'format', 'Version invalide.');
  checkTree(save, 0, { n: 0 });
  return save;
}

function validName(name) {
  if (typeof name !== 'string') fail(400, 'pseudo', 'Pseudo invalide.');
  // Normalisation du pseudo : NFC + trim + toLocaleLowerCase('fr'). Identique à normName() de game.js
  // et à lookNameId() ci-dessous : toute modification doit être reportée aux trois endroits.
  const display = name.normalize('NFC').trim();
  if (!NAME_RE.test(display)) fail(400, 'pseudo', 'Pseudo invalide.');
  return { display, id: display.toLocaleLowerCase('fr') };
}

// Nom du personnage de la sauvegarde, normalisé comme le pseudo (validName / normName de game.js),
// ou null s'il est absent ou n'est pas une chaîne (le jeu revalide de toute façon avec validProgress)
function lookNameId(save) {
  const n = save.look && typeof save.look === 'object' && !Array.isArray(save.look) ? save.look.name : undefined;
  return typeof n === 'string' ? n.normalize('NFC').trim().toLocaleLowerCase('fr') : null;
}

function validKey(key) {
  if (typeof key !== 'string' || !KEY_RE.test(key)) fail(400, 'cle', 'Clé invalide.');
  return key;
}

// --- Outils ----------------------------------------------------------------------------------
async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Comparaison à temps constant de deux empreintes hexadécimales de même longueur
function sameHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Lecture du corps : taille bornée AVANT l'analyse JSON, refus des clés __proto__/constructor
async function readJson(request, max) {
  const type = request.headers.get('content-type') || '';
  if (!type.startsWith('application/json')) fail(415, 'type', 'JSON attendu.');
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) fail(413, 'trop_gros', 'Requête trop volumineuse.');
  const reader = request.body?.getReader();
  if (!reader) fail(400, 'vide', 'Requête vide.');
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); fail(413, 'trop_gros', 'Requête trop volumineuse.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) { bytes.set(c, off); off += c.byteLength; }
  let body;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes), (k, v) => {
      if (FORBIDDEN_KEYS.has(k)) throw new Error('cle interdite');
      return v;
    });
  } catch { fail(400, 'json', 'JSON invalide.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'json', 'JSON invalide.');
  return body;
}

function onlyFields(body, allowed) {
  for (const k of Object.keys(body)) if (!allowed.includes(k)) fail(400, 'champ_inconnu', 'Champ inconnu.');
}

function corsHeaders(request, env) {
  const allowed = String(env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = request.headers.get('origin') || '';
  const allow = allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : '';
  const h = {
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
  if (allow) h['access-control-allow-origin'] = allow;
  return h;
}

function json(status, data, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      ...cors,
    },
  });
}

// Limitation du débit : binding Cloudflare RATE_LIMITER s'il est configuré (wrangler.toml).
// Sinon (Worker créé depuis le tableau de bord), limite de secours en mémoire : 30 requêtes par
// minute et par IP, propre à chaque instance du Worker. Moins stricte, mais elle freine un abus
// simple. Les IP ne sont gardées qu'en mémoire, une minute au plus, et jamais journalisées.
const FALLBACK_LIMIT = { max: 30, windowMs: 60 * 1000, maxEntries: 5000 };
const fallbackHits = new Map();                   // ip → { start, n }
function fallbackRateLimit(key) {
  const now = Date.now();
  if (fallbackHits.size > FALLBACK_LIMIT.maxEntries) {
    for (const [k, v] of fallbackHits) if (now - v.start > FALLBACK_LIMIT.windowMs) fallbackHits.delete(k);
    if (fallbackHits.size > FALLBACK_LIMIT.maxEntries) fallbackHits.clear();
  }
  const e = fallbackHits.get(key);
  if (!e || now - e.start > FALLBACK_LIMIT.windowMs) { fallbackHits.set(key, { start: now, n: 1 }); return true; }
  e.n++;
  return e.n <= FALLBACK_LIMIT.max;
}

async function rateLimit(env, key) {
  const ok = env.RATE_LIMITER ? (await env.RATE_LIMITER.limit({ key })).success : fallbackRateLimit(key);
  if (!ok) fail(429, 'debit', 'Trop de requêtes, réessayez dans une minute.');
}

// Vérifie la clé d'un pseudo existant ; même message d'erreur que le pseudo soit libre ou non
// pour /load et /delete (on ne révèle pas quels pseudos ont une sauvegarde).
async function ownedRow(env, name, key) {
  const row = await env.DB.prepare('SELECT key_hash, data, rev, updated_at FROM saves WHERE name = ?1')
    .bind(name.id).first();
  if (!row || !sameHash(row.key_hash, await sha256Hex(key))) fail(403, 'acces', 'Pseudo ou clé incorrects.');
  return row;
}

// --- Classement ------------------------------------------------------------------------------
// Le score n'est pas envoyé par le jeu : il est calculé ici à partir de la sauvegarde en ligne du
// pseudo (protégée par sa clé). Seul le nom affiché de la plus grosse prise vient du jeu.
const DAY_LEN = 600;                                // un jour de jeu = 600 s (world.js)
const BOAT_MAX = 5;
const FISH_RE = /^[\p{L}\p{M} '’-]{0,40}$/u;
const SCORE_GAP_MS = 30 * 1000;                     // inscription manuelle : une toutes les 30 s
const LB_SIZE = 50;
// catégories → colonne SQL (liste blanche : la colonne n'est jamais tirée de la requête)
const LB_CATS = {
  earned: 'earned', heaviest: 'heaviest_kg', dex: 'dex', days: 'days', boat: 'boat', cthulhu: 'cthulhu',
};

const isPlainObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const nat = (x) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);

function scoreFromSave(save, fish) {
  const st = isPlainObj(save.stats) ? save.stats : {};
  const best = isPlainObj(st.best) ? st.best : {};
  const kg = typeof best.weight === 'number' && Number.isFinite(best.weight) && best.weight > 0 ? best.weight : 0;
  const f = typeof fish === 'string' ? fish.normalize('NFC').trim() : '';
  return {
    earned: nat(st.earned), caught: nat(st.caught), casts: nat(st.casts), aboms: nat(st.aboms),
    cthulhu: nat(st.cthulhu), playTime: nat(st.playTime),
    dex: isPlainObj(save.dex) ? Object.keys(save.dex).length : 0,
    days: Math.floor(nat(save.clock) / DAY_LEN) + 1,
    boat: Math.max(1, nat(isPlainObj(save.boat) ? save.boat.level : 1)),
    heaviestKg: Math.round(kg * 1000) / 1000,
    heaviestFish: kg > 0 && FISH_RE.test(f) ? f : '',
    version: typeof save.gv === 'string' && GV_RE.test(save.gv) ? save.gv : null,
  };
}

// Cohérence d'un score (reprise des contrôles de l'ancien classement GitHub). Renvoie la raison
// d'un refus, ou null. Plafonds larges : ils écartent les valeurs impossibles, pas les bons joueurs.
function scoreProblem(s) {
  const hours = s.playTime / 3600;
  if (s.caught > s.casts) return 'plus de prises que de lancers';
  if (s.aboms > s.caught + 2000) return "nombre d'abominations incohérent";
  if (s.boat > BOAT_MAX) return 'niveau de bateau invalide';
  if (s.dex > 200) return 'carnet incohérent';
  if (s.cthulhu > s.caught) return 'plus de Grands Anciens que de prises';
  if (s.heaviestKg > 40000) return 'prise trop lourde pour être vraie';
  if (s.earned > 50000 + hours * 400000) return 'trop de pièces gagnées pour le temps de jeu';
  if (s.earned > 50000 + s.caught * 10000 + s.cthulhu * 250000 + hours * 100000) return 'pièces gagnées incohérentes avec le nombre de prises';
  if (s.caught > 50 + hours * 1500) return 'trop de prises pour le temps de jeu';
  if (s.days > 3 + (s.playTime / 600) * 4) return 'trop de jours pour le temps de jeu';
  return null;
}

// Écriture « meilleur de chaque catégorie » (dans un UPDATE SQLite, les colonnes à droite des =
// désignent toutes l'ancienne ligne : l'ordre des affectations n'a pas d'importance).
function upsertScore(env, name, s, now) {
  return env.DB.prepare(`INSERT INTO scores
      (name, display, earned, caught, aboms, dex, days, boat, cthulhu, play_time, heaviest_kg, heaviest_fish, version, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
    ON CONFLICT(name) DO UPDATE SET
      display = excluded.display,
      earned = max(earned, excluded.earned), caught = max(caught, excluded.caught),
      aboms = max(aboms, excluded.aboms), dex = max(dex, excluded.dex), days = max(days, excluded.days),
      boat = max(boat, excluded.boat), cthulhu = max(cthulhu, excluded.cthulhu),
      play_time = max(play_time, excluded.play_time),
      heaviest_fish = CASE WHEN excluded.heaviest_kg > heaviest_kg THEN excluded.heaviest_fish ELSE heaviest_fish END,
      heaviest_kg = max(heaviest_kg, excluded.heaviest_kg),
      version = excluded.version, updated_at = excluded.updated_at`)
    .bind(name.id, name.display, s.earned, s.caught, s.aboms, s.dex, s.days, s.boat, s.cthulhu, s.playTime,
      s.heaviestKg, s.heaviestFish, s.version, now)
    .run();
}

async function routeScore(request, env) {
  const body = await readJson(request, SMALL_BODY_MAX);
  onlyFields(body, ['name', 'key', 'fish']);
  const name = validName(body.name);
  const row = await ownedRow(env, name, validKey(body.key));
  const prev = await env.DB.prepare('SELECT updated_at FROM scores WHERE name = ?1').bind(name.id).first();
  const now = Date.now();
  if (prev && now - prev.updated_at < SCORE_GAP_MS) fail(429, 'trop_tot', 'Score déjà envoyé il y a quelques secondes.');
  const s = scoreFromSave(JSON.parse(row.data), body.fish);
  const why = scoreProblem(s);
  if (why) fail(422, 'score_refuse', `Score refusé : ${why}.`);
  await upsertScore(env, name, s, now);
  const me = await env.DB.prepare('SELECT earned FROM scores WHERE name = ?1').bind(name.id).first();
  const rank = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE earned > ?1').bind(me.earned).first();
  const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores').first();
  return { rank: rank.n + 1, total: total.n, earned: me.earned };
}

async function routeLeaderboard(request, env) {
  const cat = new URL(request.url).searchParams.get('cat') || 'earned';
  if (!Object.hasOwn(LB_CATS, cat)) fail(400, 'categorie', 'Catégorie inconnue.');
  const col = LB_CATS[cat];
  const { results } = await env.DB.prepare(
    `SELECT display, earned, caught, aboms, dex, days, boat, cthulhu, play_time, heaviest_kg, heaviest_fish, updated_at
     FROM scores WHERE ${col} > 0 ORDER BY ${col} DESC, updated_at ASC LIMIT ?1`,
  ).bind(LB_SIZE).all();
  const meta = await env.DB.prepare('SELECT COUNT(*) AS n, MAX(updated_at) AS updated FROM scores').first();
  return {
    cat,
    total: meta?.n || 0,
    updated: meta?.updated || null,
    players: (results || []).map((r) => ({
      name: r.display, earned: r.earned, caught: r.caught, aboms: r.aboms, dex: r.dex, days: r.days,
      boat: r.boat, cthulhu: r.cthulhu, playTime: r.play_time,
      heaviest: { kg: r.heaviest_kg, fish: r.heaviest_fish }, updatedAt: r.updated_at,
    })),
  };
}

// Classement en image SVG, pour le README du dépôt GitHub (une image n'exécute aucun script : c'est
// la seule façon d'afficher des données à jour dans un README). GitHub la recopie via son proxy
// d'images et la garde quelques minutes en cache. Les noms de poissons n'y figurent pas (le carnet du
// visiteur est inconnu : pas de divulgation), et tout texte est échappé pour le XML.
const SVG_CATS = {
  earned: { title: 'Pièces gagnées', col: 'earned', fmt: (r) => `${fmtFr(r.earned)} pièces` },
  heaviest: { title: 'Plus grosse prise', col: 'heaviest_kg', fmt: (r) => `${String(r.heaviest_kg.toFixed(2)).replace('.', ',')} kg` },
  dex: { title: 'Carnet', col: 'dex', fmt: (r) => `${r.dex} entrées` },
  days: { title: 'Jours au lac', col: 'days', fmt: (r) => `${fmtFr(r.days)} jour${r.days > 1 ? 's' : ''} · ${fmtHMS(r.play_time)}` },
  boat: { title: 'Bateau', col: 'boat', fmt: (r) => `niveau ${r.boat}` },
  cthulhu: { title: 'Grand Ancien', col: 'cthulhu', fmt: (r) => `${fmtFr(r.cthulhu)} fois` },
};
const SVG_ROWS = 10;
const fmtFr = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
// même format que fmtHMS() de game.js : « 3 h 07 min 42 s »
function fmtHMS(total) {
  const s = Math.max(0, Math.floor(Number(total) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h} h ${pad(m)} min ${pad(sec)} s` : m > 0 ? `${m} min ${pad(sec)} s` : `${sec} s`;
}
const xmlEsc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

async function routeLeaderboardSvg(request, env) {
  const cat = new URL(request.url).searchParams.get('cat') || 'earned';
  if (!Object.hasOwn(SVG_CATS, cat)) fail(400, 'categorie', 'Catégorie inconnue.');
  const c = SVG_CATS[cat];
  let rows = [], total = 0;
  try {
    rows = (await env.DB.prepare(
      `SELECT display, earned, dex, days, boat, cthulhu, heaviest_kg, play_time FROM scores WHERE ${c.col} > 0
       ORDER BY ${c.col} DESC, updated_at ASC LIMIT ?1`,
    ).bind(SVG_ROWS).all()).results || [];
    total = (await env.DB.prepare('SELECT COUNT(*) AS n FROM scores').first())?.n || 0;
  } catch { /* table absente : image « classement vide » */ }
  const W = 560, ROW = 30, TOP = 74;
  const H = TOP + Math.max(1, rows.length) * ROW + 34;
  const medal = ['#ffd84a', '#d8e0e8', '#d0884a'];
  const lines = rows.map((r, i) => {
    const y = TOP + i * ROW;
    return `<rect x="16" y="${y}" width="${W - 32}" height="${ROW - 4}" rx="5" fill="${i % 2 ? '#2a3a8a' : '#243078'}"${i < 3 ? ` stroke="${medal[i]}" stroke-width="1.5"` : ''}/>
    <text x="38" y="${y + 18}" class="rank" text-anchor="middle">${i + 1}</text>
    <text x="64" y="${y + 18}" class="name">${xmlEsc(r.display)}</text>
    <text x="${W - 30}" y="${y + 18}" class="val" text-anchor="end">${xmlEsc(c.fmt(r))}</text>`;
  }).join('\n');
  const empty = rows.length ? '' : `<text x="${W / 2}" y="${TOP + 19}" class="name" text-anchor="middle">Personne au classement pour le moment. Soyez le premier !</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Classement Lac Tranquille : ${xmlEsc(c.title)}">
  <style>
    text { font-family: 'Courier New', Courier, monospace; }
    .title { font-size: 22px; font-weight: 700; fill: #ffd84a; }
    .sub { font-size: 13px; fill: #c8d0f0; }
    .rank { font-size: 15px; font-weight: 700; fill: #ffe56a; }
    .name { font-size: 15px; font-weight: 700; fill: #ffffff; }
    .val { font-size: 15px; fill: #e8ecff; }
  </style>
  <rect width="${W}" height="${H}" rx="10" fill="#1a2464" stroke="#0e1438" stroke-width="4"/>
  <rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="8" fill="none" stroke="#5d6fd0" stroke-width="2"/>
  <text x="20" y="38" class="title">Lac Tranquille · ${xmlEsc(c.title)}</text>
  <text x="20" y="58" class="sub">Top ${SVG_ROWS} · ${fmtFr(total)} joueur${total > 1 ? 's' : ''} au classement</text>
  ${lines}${empty}
  <text x="${W - 20}" y="${H - 14}" class="sub" text-anchor="end">Mis à jour toutes les 5 minutes environ</text>
</svg>`;
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=300',            // 5 minutes : le proxy d'images de GitHub s'y fie
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}

// --- Routes ---------------------------------------------------------------------------------
async function routeSave(request, env) {
  const body = await readJson(request, BODY_MAX);
  onlyFields(body, ['name', 'key', 'save', 'baseRev', 'fish']);
  const name = validName(body.name);
  const key = validKey(body.key);
  const save = validSave(body.save);
  // une sauvegarde est rangée sous le pseudo de son personnage, jamais sous un autre
  const lookId = lookNameId(save);
  if (lookId !== null && lookId !== name.id) {
    fail(422, 'nom_personnage', 'Le nom du personnage ne correspond pas au pseudo de la sauvegarde en ligne.');
  }
  const baseRev = Number.isSafeInteger(body.baseRev) && body.baseRev >= 0 ? body.baseRev : 0;
  const data = JSON.stringify(save);
  if (data.length > BODY_MAX) fail(413, 'trop_gros', 'Sauvegarde trop volumineuse.');
  const keyHash = await sha256Hex(key);
  const now = Date.now();
  const gv = typeof save.gv === 'string' ? save.gv : null;

  const row = await env.DB.prepare('SELECT key_hash, rev, updated_at FROM saves WHERE name = ?1').bind(name.id).first();
  if (!row) {
    // pseudo libre : la place est réservée pour cette clé (INSERT seul : pas d'écrasement en course)
    const res = await env.DB.prepare(
      'INSERT OR IGNORE INTO saves (name, display, key_hash, data, gv, rev, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6)',
    ).bind(name.id, name.display, keyHash, data, gv, now).run();
    if (!res.meta?.changes) fail(409, 'pseudo_pris', 'Ce pseudo a déjà une sauvegarde en ligne.');
    return { rev: 1, updatedAt: now, created: true, ranked: await saveScore(env, name, save, body.fish, now) };
  }
  if (!sameHash(row.key_hash, keyHash)) fail(409, 'pseudo_pris', 'Ce pseudo a déjà une sauvegarde en ligne (clé différente).');
  if (now - row.updated_at < MIN_WRITE_GAP_MS) fail(429, 'trop_tot', 'Sauvegarde déjà envoyée il y a quelques secondes.');
  if (baseRev !== row.rev) fail(409, 'conflit', 'Une version plus récente existe en ligne.');
  // mise à jour conditionnelle : si un autre appareil a écrit entre-temps, rien n'est modifié
  const res = await env.DB.prepare(
    'UPDATE saves SET data = ?1, gv = ?2, rev = rev + 1, updated_at = ?3 WHERE name = ?4 AND key_hash = ?5 AND rev = ?6',
  ).bind(data, gv, now, name.id, keyHash, row.rev).run();
  if (!res.meta?.changes) fail(409, 'conflit', 'Une version plus récente existe en ligne.');
  return { rev: row.rev + 1, updatedAt: now, created: false, ranked: await saveScore(env, name, save, body.fish, now) };
}

// Classement automatique : chaque sauvegarde en ligne met à jour le score du pseudo (rien à faire
// pour le joueur). Un score incohérent est ignoré, et une erreur (table absente…) n'empêche jamais
// la sauvegarde. Renvoie true si le score a été enregistré.
async function saveScore(env, name, save, fish, now) {
  try {
    const s = scoreFromSave(save, fish);
    if (scoreProblem(s)) return false;
    await upsertScore(env, name, s, now);
    return true;
  } catch { return false; }
}

async function routeLoad(request, env) {
  const body = await readJson(request, SMALL_BODY_MAX);
  onlyFields(body, ['name', 'key']);
  const name = validName(body.name);
  const row = await ownedRow(env, name, validKey(body.key));
  return { save: JSON.parse(row.data), rev: row.rev, updatedAt: row.updated_at };
}

async function routeDelete(request, env) {
  const body = await readJson(request, SMALL_BODY_MAX);
  onlyFields(body, ['name', 'key']);
  const name = validName(body.name);
  const key = validKey(body.key);
  await ownedRow(env, name, key);
  await env.DB.prepare('DELETE FROM saves WHERE name = ?1 AND key_hash = ?2').bind(name.id, await sha256Hex(key)).run();
  try { await env.DB.prepare('DELETE FROM scores WHERE name = ?1').bind(name.id).run(); } catch { /* pas de classement */ }
  return { deleted: true };
}

const ROUTES = {
  '/v1/save': routeSave, '/v1/load': routeLoad, '/v1/delete': routeDelete, '/v1/score': routeScore,
  '/v1/leaderboard': routeLeaderboard, '/v1/leaderboard.svg': routeLeaderboardSvg,
};
const GET_ROUTES = new Set(['/v1/leaderboard', '/v1/leaderboard.svg']);   // lecture seule ; les autres : POST
// Image du README : toutes les vues passent par le proxy de GitHub (quelques adresses IP partagées),
// la limite par IP la bloquerait ; elle est en lecture seule, bornée à 10 lignes, et mise en cache 5 min.
const NO_RATE_LIMIT = new Set(['/v1/leaderboard.svg']);

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    try {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      const route = ROUTES[url.pathname];
      if (!route) fail(404, 'route', 'Route inconnue.');
      const method = GET_ROUTES.has(url.pathname) ? 'GET' : 'POST';
      if (request.method !== method) fail(405, 'methode', `${method} attendu.`);
      if (!NO_RATE_LIMIT.has(url.pathname)) await rateLimit(env, request.headers.get('cf-connecting-ip') || 'local');
      const res = await route(request, env);
      return res instanceof Response ? res : json(200, res, cors);
    } catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.code, message: e.message }, cors);
      // journal sans donnée personnelle : ni pseudo, ni clé, ni IP, ni corps de requête
      console.error('cloud-save: erreur interne', e?.name || 'Error');
      return json(500, { error: 'interne', message: 'Erreur du serveur.' }, cors);
    }
  },
};

// Exporté pour les tests locaux (server/cloud-save/test.mjs)
export { validSave, validName, validKey, KEY_RE };
