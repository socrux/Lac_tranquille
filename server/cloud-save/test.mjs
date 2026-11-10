// Tests locaux du Worker, sans Cloudflare : node server/cloud-save/test.mjs
// D1 est remplacé par une fausse base en mémoire qui reconnaît les 5 requêtes du Worker.
import worker from './worker.js';

function fakeD1() {
  const rows = new Map();
  const exec = (sql, a) => {
    if (sql.startsWith('SELECT')) { const r = rows.get(a[0]); return { first: r ? { ...r } : null }; }
    if (sql.startsWith('INSERT')) {
      if (rows.has(a[0])) return { changes: 0 };
      rows.set(a[0], { name: a[0], display: a[1], key_hash: a[2], data: a[3], gv: a[4], rev: 1, created_at: a[5], updated_at: a[5] });
      return { changes: 1 };
    }
    if (sql.startsWith('UPDATE')) {
      const [data, gv, now, name, hash, rev] = a;
      const r = rows.get(name);
      if (!r || r.key_hash !== hash || r.rev !== rev) return { changes: 0 };
      Object.assign(r, { data, gv, rev: r.rev + 1, updated_at: now });
      return { changes: 1 };
    }
    if (sql.startsWith('DELETE')) { const r = rows.get(a[0]); if (r && r.key_hash === a[1]) rows.delete(a[0]); return { changes: 1 }; }
    throw new Error('SQL inattendu : ' + sql);
  };
  return {
    rows,
    prepare: (sql) => ({ bind: (...a) => ({ first: async () => exec(sql, a).first, run: async () => ({ meta: exec(sql, a) }) }) }),
  };
}

const env = { DB: fakeD1(), ALLOWED_ORIGINS: '*' };
const call = async (path, body, raw) => {
  const res = await worker.fetch(new Request('https://x.test' + path, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: raw ?? JSON.stringify(body),
  }), env);
  return { status: res.status, data: await res.json() };
};

let fails = 0;
const ok = (name, cond, extra) => { if (!cond) fails++; console.log((cond ? 'OK   ' : 'FAIL ') + name, cond ? '' : JSON.stringify(extra ?? '')); };

const KEY = 'LAC-7KQ2M-9XD4P-H3VTA-0ZRWB';
const KEY2 = 'LAC-AAAAA-BBBBB-CCCCC-DDDDD';
const save = { v: 2, gv: '1.4.0', money: 100, look: { name: 'Léa' }, stats: { caught: 3 } };

let r = await call('/v1/save', { name: 'Léa', key: KEY, save, baseRev: 0 });
ok('création', r.status === 200 && r.data.rev === 1 && r.data.created, r);
r = await call('/v1/save', { name: 'LÉA', key: KEY2, save, baseRev: 0 });
ok('pseudo pris (casse ignorée)', r.status === 409 && r.data.error === 'pseudo_pris', r);
r = await call('/v1/save', { name: 'Léa', key: KEY, save, baseRev: 1 });
ok('écriture trop rapprochée refusée', r.status === 429, r);
env.DB.rows.get('léa').updated_at -= 60000;
r = await call('/v1/save', { name: 'Léa', key: KEY, save: { ...save, money: 200 }, baseRev: 0 });
ok('révision périmée → conflit', r.status === 409 && r.data.error === 'conflit', r);
r = await call('/v1/save', { name: 'Léa', key: KEY, save: { ...save, money: 200 }, baseRev: 1 });
ok('mise à jour', r.status === 200 && r.data.rev === 2, r);
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
r = await call('/v1/delete', { name: 'Léa', key: KEY2 });
ok('suppression avec mauvaise clé refusée', r.status === 403 && env.DB.rows.has('léa'), r);
r = await call('/v1/delete', { name: 'Léa', key: KEY });
ok('suppression', r.status === 200 && !env.DB.rows.has('léa'), r);
const get = await worker.fetch(new Request('https://x.test/v1/load'), env);
ok('GET refusé', get.status === 405);
const opt = await worker.fetch(new Request('https://x.test/v1/load', { method: 'OPTIONS', headers: { origin: 'null' } }), env);
ok('préflight CORS', opt.status === 204 && opt.headers.get('access-control-allow-origin') === '*');

console.log(fails ? `\n${fails} échec(s)` : '\nTous les tests passent.');
process.exit(fails ? 1 : 0);
