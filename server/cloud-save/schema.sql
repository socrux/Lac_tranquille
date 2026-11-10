-- Sauvegardes en ligne de Lac Tranquille (Cloudflare D1 / SQLite)
-- Une ligne par pseudo. La clé du joueur n'est jamais stockée : seulement son empreinte SHA-256.
CREATE TABLE IF NOT EXISTS saves (
  name       TEXT    PRIMARY KEY,          -- pseudo normalisé (NFC, minuscules) : unicité insensible à la casse
  display    TEXT    NOT NULL,             -- pseudo tel qu'affiché
  key_hash   TEXT    NOT NULL,             -- SHA-256 hexadécimal de la clé
  data       TEXT    NOT NULL,             -- sauvegarde (JSON vérifié par le serveur, revalidé par le jeu)
  gv         TEXT,                         -- version du jeu qui a écrit la sauvegarde
  rev        INTEGER NOT NULL DEFAULT 1,   -- révision : refuse d'écraser une version plus récente
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Classement : une ligne par pseudo inscrit (bouton « Envoyer mon score » du jeu).
-- Les valeurs sont calculées par le serveur à partir de la sauvegarde en ligne, puis mises à jour
-- à chaque envoi de sauvegarde. On garde le meilleur de chaque catégorie.
CREATE TABLE IF NOT EXISTS scores (
  name          TEXT    PRIMARY KEY,       -- même clé que saves.name
  display       TEXT    NOT NULL,
  earned        INTEGER NOT NULL DEFAULT 0,
  caught        INTEGER NOT NULL DEFAULT 0,
  aboms         INTEGER NOT NULL DEFAULT 0,
  dex           INTEGER NOT NULL DEFAULT 0,
  days          INTEGER NOT NULL DEFAULT 0,
  boat          INTEGER NOT NULL DEFAULT 1,
  cthulhu       INTEGER NOT NULL DEFAULT 0,
  play_time     INTEGER NOT NULL DEFAULT 0,
  heaviest_kg   REAL    NOT NULL DEFAULT 0,
  heaviest_fish TEXT    NOT NULL DEFAULT '',
  version       TEXT,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS scores_earned   ON scores (earned DESC);
CREATE INDEX IF NOT EXISTS scores_heaviest ON scores (heaviest_kg DESC);
CREATE INDEX IF NOT EXISTS scores_dex      ON scores (dex DESC);
CREATE INDEX IF NOT EXISTS scores_days     ON scores (days DESC);
CREATE INDEX IF NOT EXISTS scores_boat     ON scores (boat DESC);
CREATE INDEX IF NOT EXISTS scores_cthulhu  ON scores (cthulhu DESC);
CREATE INDEX IF NOT EXISTS scores_updated  ON scores (updated_at);

-- Quota de nouveaux pseudos par jour : empreinte tronquée de l'adresse IP, salée par la date
-- (jamais l'adresse elle-même). Les lignes de plus d'un jour sont effacées par le Worker.
CREATE TABLE IF NOT EXISTS signups (
  ip_hash TEXT    NOT NULL,
  day     INTEGER NOT NULL,                -- jours depuis le 1er janvier 1970 (UTC)
  n       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, day)
);
