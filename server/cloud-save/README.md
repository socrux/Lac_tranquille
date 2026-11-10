# Sauvegarde en ligne — déploiement

Petit serveur (Cloudflare Worker + base D1) qui garde une sauvegarde par pseudo, protégée par
une clé secrète générée par le jeu. Il tient dans l'offre gratuite de Cloudflare :
100 000 requêtes et 100 000 écritures par jour.

## Hébergement

Le jeu est servi par **GitHub Pages** (`https://socrux.github.io/Lac_tranquille/`). Le Worker est
un service à part, hébergé chez Cloudflare : GitHub Pages ne fait que servir les fichiers du jeu.
Ce dossier `server/` est donc aussi publié sur Pages, ce qui est sans risque : il ne contient aucun
secret. Le `database_id` ne donne aucun accès sans le compte Cloudflare.

- CORS : `ALLOWED_ORIGINS` autorise `https://socrux.github.io`, ainsi que `null` pour le jeu ouvert depuis le disque.
- Après un merge sur `main`, Pages met quelques minutes à publier. Les navigateurs peuvent aussi
  garder l'ancienne version en cache une dizaine de minutes : en cas de doute, rechargez avec Ctrl+F5.

## Fichiers

| Fichier | Rôle |
|---|---|
| `worker.js` | Le serveur : routes `/v1/save`, `/v1/load`, `/v1/delete` |
| `schema.sql` | Table `saves` (une ligne par pseudo) |
| `wrangler.toml` | Configuration du déploiement |
| `test.mjs` | Tests locaux sans Cloudflare : `node server/cloud-save/test.mjs` |

## Mise en ligne (une seule fois, environ 10 minutes)

Il faut Node.js et un compte Cloudflare gratuit. Toutes les commandes se lancent dans `server/cloud-save/`.

1. **Se connecter** :
   ```powershell
   cd server/cloud-save
   npx wrangler login
   ```
2. **Créer la base**, puis copier le `database_id` affiché dans `wrangler.toml`, à la place de
   `A_REMPLACER_PAR_L_ID_AFFICHE_PAR_WRANGLER` :
   ```powershell
   npx wrangler d1 create lac-tranquille-saves
   ```
3. **Créer la table** :
   ```powershell
   npx wrangler d1 execute lac-tranquille-saves --remote --file=schema.sql
   ```
4. **Déployer**. Wrangler affiche l'adresse du serveur, du type
   `https://lac-tranquille-saves.<votre-compte>.workers.dev` :
   ```powershell
   npx wrangler deploy
   ```
5. **Brancher le jeu** sur cette adresse, sans « / » final, à deux endroits :
   - `game.js` : `const CLOUD_SAVE = { url: 'https://lac-tranquille-saves.<votre-compte>.workers.dev' };`
   - `index.html`, dans la balise CSP : ajouter l'adresse à `connect-src`, par exemple
     `connect-src https://raw.githubusercontent.com https://lac-tranquille-saves.<votre-compte>.workers.dev;`

   Tant que `url` est vide, le bloc « Sauvegarde en ligne » reste masqué dans les options.

## Variante sans Wrangler : tout depuis le navigateur (dash.cloudflare.com)

Utile si le poste interdit d'installer ou d'exécuter des outils.

1. **Base** : *Storage & Databases › D1 SQL Database › Create*.
   - Nom : `lac-tranquille-saves`.
   - Onglet *Console* : coller le contenu de `schema.sql`, puis *Execute*.
2. **Worker** : *Workers & Pages › Create › Worker* (modèle « Hello World »).
   - Nom : `lac-tranquille-saves`, puis *Deploy*.
   - *Edit code* : remplacer tout le code par le contenu de `worker.js`, puis *Deploy*.
3. **Liaison avec la base** : dans le Worker, *Settings › Bindings › Add › D1 database*.
   Nom de variable : `DB` (en majuscules), base : `lac-tranquille-saves`.
4. **Variable** : *Settings › Variables and Secrets › Add*, type *Text*.
   Nom : `ALLOWED_ORIGINS`, valeur : `https://socrux.github.io,null`.
5. L'adresse du Worker (`https://lac-tranquille-saves.<sous-domaine>.workers.dev`) s'affiche sur
   sa page, sous *Domains & Routes*.

Sans le binding `RATE_LIMITER`, le Worker applique une limite de secours en mémoire : 30 requêtes
par minute et par IP, pour chaque instance. **Mise à jour du code** : refaire *Edit code*, coller le
nouveau `worker.js`, puis *Deploy*.

## Tester en local avant de déployer

```powershell
npx wrangler d1 execute lac-tranquille-saves --local --file=schema.sql
npx wrangler dev
```
Dans `game.js`, mettre `url: 'http://localhost:8787'` et ajouter `http://localhost:8787` à
`connect-src`. Penser à remettre l'adresse en ligne avant de committer.

## Fonctionnement

- **Activer** (Options › Sauvegarde en ligne) : le jeu génère une clé `LAC-XXXXX-XXXXX-XXXXX-XXXXX`
  (100 bits d'aléa, `crypto.getRandomValues`) et réserve le pseudo du personnage. La clé s'affiche
  une fois. Le serveur n'en garde que l'empreinte SHA-256 et ne peut donc pas la retrouver.
- **Envoi automatique** toutes les 5 minutes de jeu et au retour au menu, plus un bouton
  « Envoyer maintenant ». Le serveur accepte une écriture toutes les 20 secondes au plus par pseudo.
- **Reprendre ailleurs** : pseudo + clé → aperçu de la partie → confirmation. L'appareil est alors lié.
- **Deux appareils** : chaque sauvegarde porte une révision. Une version plus récente en ligne
  n'est jamais écrasée sans demander :
  - si elle est moins avancée (temps de jeu), c'est un envoi précédent dont la réponse s'est perdue :
    le jeu renvoie tout seul ;
  - sinon le joueur choisit : charger la version en ligne, ou garder celle de l'appareil.
- **Garde-fous côté jeu** : une nouvelle partie, un import de fichier ou une restauration délient
  l'appareil. Une partie d'un autre personnage n'est jamais envoyée sur le pseudo.

## Sécurité

- Pseudo et clé voyagent dans le corps des requêtes POST, jamais dans l'URL. Aucun cookie.
- Schéma strict :
  - corps de 256 Ko au plus (4 Ko pour charger ou supprimer) ;
  - champs de premier niveau en liste blanche (`SAVE_FIELDS`) ;
  - `__proto__`, `constructor` et `prototype` refusés ;
  - profondeur, longueur des tableaux et des textes, et nombres bornés.
- Requêtes SQL paramétrées uniquement.
- Débit limité à 30 requêtes par minute et par IP (binding `RATE_LIMITER`).
- Une mauvaise clé et un pseudo inconnu donnent la même réponse, pour ne pas révéler quels pseudos existent.
- Les journaux ne contiennent ni pseudo, ni clé, ni IP.
- Le jeu revalide toute sauvegarde reçue avec `validProgress()`, comme un import de fichier.
- CORS : `ALLOWED_ORIGINS = "*"` convient, puisque l'accès dépend de la clé et pas d'un cookie.
  Pour le restreindre, indiquer l'adresse du site du jeu. Une page ouverte depuis le disque
  (`file://`) envoie l'origine `null`.

## Maintenance

**Ajouter un champ à la sauvegarde du jeu** (dans `emptyProgress()`) : il faut l'ajouter aussi à
`SAVE_FIELDS` dans `worker.js` et redéployer (`npx wrangler deploy`). Sinon, les envois sont refusés
avec le message « Champ de sauvegarde inconnu ».

**Supprimer la sauvegarde d'un joueur** :
```powershell
npx wrangler d1 execute lac-tranquille-saves --remote --command "DELETE FROM saves WHERE name = 'pseudo en minuscules'"
```
