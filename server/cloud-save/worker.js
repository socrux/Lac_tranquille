// Lac Tranquille — sauvegardes en ligne (Cloudflare Worker + D1)
//
// Un joueur = un pseudo + une clé secrète générée par le jeu (« LAC-XXXXX-XXXXX-XXXXX-XXXXX »).
// Le serveur ne stocke que l'empreinte SHA-256 de la clé. Aucun cookie, aucune session :
// chaque requête porte le pseudo et la clé dans son corps JSON (jamais dans l'URL, jamais loguée).
//
// Routes (toutes en POST, corps JSON, 64 Ko max sauf /save) :
//   POST /v1/save    { name, key, save, baseRev }  crée la place (pseudo libre) ou met à jour
//   POST /v1/load    { name, key }                  renvoie { save, rev, updatedAt }
//   POST /v1/delete  { name, key }                  supprime la sauvegarde en ligne
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
  'met', 'stats',
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
  const display = name.normalize('NFC').trim();
  if (!NAME_RE.test(display)) fail(400, 'pseudo', 'Pseudo invalide.');
  return { display, id: display.toLocaleLowerCase('fr') };
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
    'access-control-allow-methods': 'POST, OPTIONS',
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

// --- Routes ---------------------------------------------------------------------------------
async function routeSave(request, env) {
  const body = await readJson(request, BODY_MAX);
  onlyFields(body, ['name', 'key', 'save', 'baseRev']);
  const name = validName(body.name);
  const key = validKey(body.key);
  const save = validSave(body.save);
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
    return { rev: 1, updatedAt: now, created: true };
  }
  if (!sameHash(row.key_hash, keyHash)) fail(409, 'pseudo_pris', 'Ce pseudo a déjà une sauvegarde en ligne (clé différente).');
  if (now - row.updated_at < MIN_WRITE_GAP_MS) fail(429, 'trop_tot', 'Sauvegarde déjà envoyée il y a quelques secondes.');
  if (baseRev !== row.rev) fail(409, 'conflit', 'Une version plus récente existe en ligne.');
  // mise à jour conditionnelle : si un autre appareil a écrit entre-temps, rien n'est modifié
  const res = await env.DB.prepare(
    'UPDATE saves SET data = ?1, gv = ?2, rev = rev + 1, updated_at = ?3 WHERE name = ?4 AND key_hash = ?5 AND rev = ?6',
  ).bind(data, gv, now, name.id, keyHash, row.rev).run();
  if (!res.meta?.changes) fail(409, 'conflit', 'Une version plus récente existe en ligne.');
  return { rev: row.rev + 1, updatedAt: now, created: false };
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
  return { deleted: true };
}

const ROUTES = { '/v1/save': routeSave, '/v1/load': routeLoad, '/v1/delete': routeDelete };

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    try {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      const route = ROUTES[url.pathname];
      if (!route) fail(404, 'route', 'Route inconnue.');
      if (request.method !== 'POST') fail(405, 'methode', 'POST attendu.');
      await rateLimit(env, request.headers.get('cf-connecting-ip') || 'local');
      return json(200, await route(request, env), cors);
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
