// Lac Tranquille — traitement d'un score envoyé par issue GitHub (exécuté par la GitHub Action)
//
// Entrée  : l'événement GitHub (fichier GITHUB_EVENT_PATH), dont le corps de l'issue contient
//           un bloc ```json { ... } ``` généré par le jeu.
// Sortie  : leaderboard.json mis à jour, et un message (Markdown) dans $RUNNER_TEMP/score-result.md
//           que le workflow publie en commentaire de l'issue. Variable de sortie « status » : ok | rejected.
//
// Le corps de l'issue est une donnée non fiable : il n'est jamais exécuté ni passé à un shell.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

// Même fonction de hachage que dans le jeu (cyrb53), pour que les signatures correspondent
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

const BOARD_FILE = 'leaderboard.json';
const SALT = 'lac-tranquille/score/v1';     // doit être identique à celui du jeu (game.js)
const MAX_PLAYERS = 500;

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const issue = event.issue;
const login = issue.user.login;
const resultFile = `${process.env.RUNNER_TEMP || '.'}/score-result.md`;

function finish(status, message) {
  writeFileSync(resultFile, message);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `status=${status}\n`);
  console.log(`[${status}] ${message}`);
  process.exit(0);
}
const reject = (why) => finish('rejected', `❌ Score refusé : ${why}\n\nVérifiez que l'issue a bien été créée depuis le bouton « Envoyer mon score » du jeu, sans modifier le texte.`);

// --- lecture du bloc JSON
const m = /```json\s*([\s\S]*?)```/.exec(issue.body || '');
if (!m) reject('aucun bloc de score trouvé.');
let s;
try { s = JSON.parse(m[1]); } catch { reject('le bloc de score est illisible.'); }

// --- signature : le jeu signe les valeurs avec un sel. Ce n'est pas une protection forte
// (le code du jeu est public), mais cela écarte les scores écrits ou modifiés à la main.
const FIELDS = ['v', 'version', 'name', 'earned', 'caught', 'casts', 'aboms', 'heaviestKg', 'heaviestFish', 'dex', 'days', 'boat', 'cthulhu', 'playTime'];
const canonical = FIELDS.map((k) => `${k}=${s[k]}`).join('&');
const sig = cyrb53(`${SALT}|${canonical}`);
if (s.sig !== sig) reject('la signature ne correspond pas (score modifié ?).');

// --- vérifications de cohérence
const num = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
if (s.v !== 1) reject('format de score inconnu.');
for (const k of ['earned', 'caught', 'casts', 'aboms', 'heaviestKg', 'dex', 'days', 'boat', 'cthulhu', 'playTime']) {
  if (!num(s[k])) reject(`valeur invalide pour « ${k} ».`);
}
if (typeof s.name !== 'string' || !s.name.trim() || s.name.length > 16) reject('nom de personnage invalide.');
if (s.caught > s.casts) reject('plus de prises que de lancers.');
if (s.aboms > s.caught + 2000) reject("nombre d'abominations incohérent.");
if (s.boat < 1 || s.boat > 5) reject('niveau de bateau invalide.');
if (s.dex > 200) reject('carnet incohérent.');
if (s.heaviestKg > 40000) reject('prise trop lourde pour être vraie.');
const hours = s.playTime / 3600;
if (s.earned > 50000 + hours * 400000) reject('trop de pièces gagnées pour le temps de jeu.');
if (s.caught > 50 + hours * 1500) reject('trop de prises pour le temps de jeu.');
if (s.days > 3 + (s.playTime / 600) * 4) reject('trop de jours pour le temps de jeu.');

// --- mise à jour du classement : une ligne par compte GitHub, on garde le meilleur de chaque catégorie
let board;
try { board = JSON.parse(readFileSync(BOARD_FILE, 'utf8')); } catch { board = { players: [] }; }
if (!Array.isArray(board.players)) board.players = [];
const prev = board.players.find((p) => p.login === login);
const entry = {
  login,
  name: s.name.trim(),
  version: String(s.version || '').slice(0, 12),
  updatedAt: new Date().toISOString(),
  earned: Math.max(prev?.earned || 0, Math.round(s.earned)),
  caught: Math.max(prev?.caught || 0, Math.round(s.caught)),
  aboms: Math.max(prev?.aboms || 0, Math.round(s.aboms)),
  dex: Math.max(prev?.dex || 0, Math.round(s.dex)),
  days: Math.max(prev?.days || 0, Math.round(s.days)),
  boat: Math.max(prev?.boat || 1, Math.round(s.boat)),
  cthulhu: Math.max(prev?.cthulhu || 0, Math.round(s.cthulhu)),
  playTime: Math.max(prev?.playTime || 0, Math.round(s.playTime)),
  heaviest: (prev?.heaviest?.kg || 0) >= s.heaviestKg ? prev.heaviest : { kg: Math.round(s.heaviestKg * 1000) / 1000, fish: String(s.heaviestFish || '').slice(0, 40) },
};
board.players = board.players.filter((p) => p.login !== login);
board.players.push(entry);
board.players.sort((a, b) => b.earned - a.earned);
board.players = board.players.slice(0, MAX_PLAYERS);
board.updated = entry.updatedAt;
writeFileSync(BOARD_FILE, `${JSON.stringify(board, null, 2)}\n`);

const rank = board.players.findIndex((p) => p.login === login) + 1;
finish('ok', [
  `✅ Score enregistré pour **${entry.name}** (@${login}) !`,
  '',
  `- Pièces gagnées : ${entry.earned.toLocaleString('fr-FR')} (rang ${rank} / ${board.players.length})`,
  `- Prises : ${entry.caught} · Abominations : ${entry.aboms} · Grand Ancien : ${entry.cthulhu}`,
  `- Carnet : ${entry.dex} entrées · Jours : ${entry.days} · Bateau niveau ${entry.boat}`,
  '',
  'Le classement du jeu sera à jour dans quelques minutes.',
].join('\n'));
