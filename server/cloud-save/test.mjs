// Tests locaux du Worker, sans Cloudflare : node server/cloud-save/test.mjs
// D1 est simulée par une vraie base SQLite en mémoire (node:sqlite), avec schema.sql :
// les requêtes SQL du Worker sont donc réellement exécutées.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from './worker.js';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
// Adaptateur minimal de l'API D1 : prepare(sql)[.bind(...)].first() / .run() / .all()
function d1(db) {
  const stmt = (sql, args) => ({
    first: async () => { const r = db.prepare(sql).get(...args); return r ? { ...r } : null; },
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    all: async () => ({ results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }),
  });
  return { prepare: (sql) => ({ bind: (...a) => stmt(sql, a), ...stmt(sql, []) }) };
}
const env = { DB: d1(sqlite), ALLOWED_ORIGINS: '*' };
// simule le temps qui passe (évite les limites « une écriture toutes les 20 s / 30 s »)
const age = () => { sqlite.exec('UPDATE saves SET updated_at = updated_at - 60000; UPDATE scores SET updated_at = updated_at - 60000;'); };

let ip = 0;
const call = async (path, body, raw, method = 'POST') => {
  const res = await worker.fetch(new Request('https://x.test' + path, {
    method,
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': `10.0.0.${ip++ % 250}` },
    body: method === 'GET' ? undefined : raw ?? JSON.stringify(body),
  }), env);
  return { status: res.status, data: await res.json() };
};

let fails = 0;
const ok = (name, cond, extra) => { if (!cond) fails++; console.log((cond ? 'OK   ' : 'FAIL ') + name, cond ? '' : JSON.stringify(extra ?? '')); };

const KEY = 'LAC-7KQ2M-9XD4P-H3VTA-0ZRWB';
const KEY2 = 'LAC-AAAAA-BBBBB-CCCCC-DDDDD';
const save = { v: 2, gv: '1.4.0', money: 100, look: { name: 'Léa' }, stats: { caught: 3, casts: 5, earned: 500, playTime: 3600 } };

// --- sauvegarde
let r = await call('/v1/save', { name: 'Léa', key: KEY, save, baseRev: 0 });
ok('création', r.status === 200 && r.data.rev === 1 && r.data.created, r);
r = await call('/v1/save', { name: 'LÉA', key: KEY2, save, baseRev: 0 });
ok('pseudo pris (casse ignorée)', r.status === 409 && r.data.error === 'pseudo_pris', r);
r = await call('/v1/save', { name: 'Léa', key: KEY, save, baseRev: 1 });
ok('écriture trop rapprochée refusée', r.status === 429, r);
age();
r = await call('/v1/save', { name: 'Léa', key: KEY, save: { ...save, money: 200 }, baseRev: 0 });
ok('révision périmée → conflit', r.status === 409 && r.data.error === 'conflit', r);
r = await call('/v1/save', { name: 'Léa', key: KEY, save: { ...save, money: 200 }, baseRev: 1 });
ok('mise à jour', r.status === 200 && r.data.rev === 2 && r.data.ranked === false, r);
r = await call('/v1/load', { name: 'léa', key: KEY });
ok('chargement', r.status === 200 && r.data.save.money === 200 && r.data.rev === 2, r);
r = await call('/v1/load', { name: 'Léa', key: KEY2 });
ok('mauvaise clé', r.status === 403, r);
r = await call('/v1/load', { name: 'Inconnu', key: KEY });
ok('pseudo inconnu : même réponse', r.status === 403 && r.data.error === 'acces', r);
r = await call('/v1/save', { name: 'Bob', key: KEY, save: { ...save, hack: 1 }, baseRev: 0 });
ok('champ inconnu refusé', r.status === 422 && r.data.error === 'champ_inconnu', r);
r = await call('/v1/save', null, '{"name":"Bob","key":"' + KEY + '","save":{"v":2,"stats":{"__proto__":{"x":1}}}}');
ok('__proto__ refusé', r.status === 400, r);
r = await call('/v1/save', { name: 'Bob', key: 'LAC-1234', save, baseRev: 0 });
ok('clé mal formée', r.status === 400 && r.data.error === 'cle', r);
r = await call('/v1/save', { name: '<script>', key: KEY, save, baseRev: 0 });
ok('pseudo invalide', r.status === 400 && r.data.error === 'pseudo', r);
r = await call('/v1/save', { name: 'Bob', key: KEY, save: { ...save, money: 1e300 }, baseRev: 0 });
ok('nombre hors bornes', r.status === 422, r);
r = await call('/v1/save', { name: 'Bob', key: KEY, save: { ...save, items: new Array(5000).fill(0) }, baseRev: 0 });
ok('tableau trop long', r.status === 422, r);
r = await call('/v1/save', null, JSON.stringify({ name: 'Bob', key: KEY, save: { v: 2, x: 'a'.repeat(300 * 1024) } }));
ok('corps trop gros', r.status === 413, r);
r = await call('/v1/load', { name: 'Léa', key: KEY, extra: 1 });
ok('champ de requête inconnu', r.status === 400, r);

// --- classement
r = await call('/v1/leaderboard?cat=earned', null, null, 'GET');
ok('classement vide', r.status === 200 && r.data.players.length === 0 && r.data.total === 0, r);
r = await call('/v1/score', { name: 'Léa', key: KEY2, fish: 'Perche' });
ok('score : mauvaise clé', r.status === 403, r);
r = await call('/v1/score', { name: 'Personne', key: KEY, fish: '' });
ok('score : sans sauvegarde en ligne', r.status === 403, r);
r = await call('/v1/score', { name: 'Léa', key: KEY, fish: 'Perche' });
ok('inscription au classement', r.status === 200 && r.data.rank === 1 && r.data.total === 1 && r.data.earned === 500, r);
r = await call('/v1/score', { name: 'Léa', key: KEY, fish: 'Perche' });
ok('score : envoi trop rapproché', r.status === 429, r);
// score calculé depuis la sauvegarde : la plus grosse prise, le carnet, les jours, le bateau
age();
const better = { ...save, clock: 6000, dex: { perche: {}, carpe: {} }, boat: { level: 3 },
  stats: { ...save.stats, earned: 900, best: { id: 'perche', weight: 2.5 } } };
r = await call('/v1/save', { name: 'Léa', key: KEY, save: better, baseRev: 2, fish: 'Perche dorée' });
ok('sauvegarde → score mis à jour', r.status === 200 && r.data.ranked === true, r);
r = await call('/v1/leaderboard?cat=earned', null, null, 'GET');
const lea = r.data.players[0];
ok('valeurs calculées par le serveur', lea && lea.name === 'Léa' && lea.earned === 900 && lea.dex === 2 && lea.days === 11
  && lea.boat === 3 && lea.heaviest.kg === 2.5 && lea.heaviest.fish === 'Perche dorée', lea);
// meilleur de chaque catégorie : une sauvegarde plus ancienne ne fait pas baisser le score
age();
r = await call('/v1/save', { name: 'Léa', key: KEY, save: { ...save, stats: { ...save.stats, earned: 10 } }, baseRev: 3, fish: '' });
r = await call('/v1/leaderboard?cat=heaviest', null, null, 'GET');
ok('meilleur score conservé', r.data.players[0]?.earned === 900 && r.data.players[0]?.heaviest.fish === 'Perche dorée', r.data.players[0]);
// score incohérent : la sauvegarde passe, le classement ne bouge pas
age();
r = await call('/v1/save', { name: 'Léa', key: KEY, save: { ...save, stats: { ...save.stats, earned: 1e12 } }, baseRev: 4 });
const lb = await call('/v1/leaderboard?cat=earned', null, null, 'GET');
ok('score incohérent ignoré', r.status === 200 && lb.data.players[0].earned === 900, [r, lb.data.players[0]]);
// deuxième joueur, ordre du classement
await call('/v1/save', { name: 'Bob', key: KEY2, save: { ...save, look: { name: 'Bob' }, stats: { ...save.stats, earned: 2000 } }, baseRev: 0 });
r = await call('/v1/score', { name: 'Bob', key: KEY2, fish: '' });
ok('second joueur 1er', r.status === 200 && r.data.rank === 1 && r.data.total === 2, r);
r = await call('/v1/leaderboard?cat=earned', null, null, 'GET');
ok('ordre du classement', r.data.players.map((p) => p.name).join(',') === 'Bob,Léa', r.data.players);
r = await call('/v1/leaderboard?cat=heaviest', null, null, 'GET');
ok('catégorie : seuls les > 0', r.data.players.length === 1 && r.data.players[0].name === 'Léa', r.data.players);
r = await call('/v1/leaderboard?cat=earned;DROP', null, null, 'GET');
ok('catégorie inconnue refusée', r.status === 400, r);
r = await call('/v1/leaderboard?cat=earned', {}, null, 'POST');
ok('POST sur le classement refusé', r.status === 405, r);
// score impossible à l'inscription
await call('/v1/save', { name: 'Triche', key: KEY, save: { ...save, look: { name: 'Triche' }, stats: { caught: 10, casts: 1 } }, baseRev: 0 });
r = await call('/v1/score', { name: 'Triche', key: KEY, fish: '' });
ok('score incohérent refusé', r.status === 422 && r.data.error === 'score_refuse', r);

// --- suppression : sauvegarde et score
r = await call('/v1/delete', { name: 'Léa', key: KEY2 });
ok('suppression avec mauvaise clé refusée', r.status === 403, r);
r = await call('/v1/delete', { name: 'Léa', key: KEY });
r = await call('/v1/leaderboard?cat=earned', null, null, 'GET');
ok('suppression (sauvegarde + score)', r.data.players.length === 1 && r.data.players[0].name === 'Bob', r.data.players);

// --- cohérence pseudo ↔ nom du personnage
r = await call('/v1/save', { name: 'Bob', key: KEY2, save: { ...save, look: { name: 'Alice' } }, baseRev: 0 });
ok('personnage d\'un autre nom refusé', r.status === 422 && r.data.error === 'nom_personnage', r);
r = await call('/v1/save', { name: 'CARLA', key: KEY, save: { ...save, look: { name: 'Carla' } }, baseRev: 0 });
ok('même nom, casse différente accepté', r.status === 200 && r.data.created, r);
const { look: _sansLook, ...saveSansLook } = save;
r = await call('/v1/save', { name: 'Denis', key: KEY, save: saveSansLook, baseRev: 0 });
ok('sauvegarde sans personnage acceptée', r.status === 200 && r.data.created, r);

const get = await worker.fetch(new Request('https://x.test/v1/load'), env);
ok('GET refusé sur /v1/load', get.status === 405);
const opt = await worker.fetch(new Request('https://x.test/v1/load', { method: 'OPTIONS', headers: { origin: 'null' } }), env);
ok('préflight CORS', opt.status === 204 && opt.headers.get('access-control-allow-origin') === '*');

console.log(fails ? `\n${fails} échec(s)` : '\nTous les tests passent.');
process.exit(fails ? 1 : 0);
