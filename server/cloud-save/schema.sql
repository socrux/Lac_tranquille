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
