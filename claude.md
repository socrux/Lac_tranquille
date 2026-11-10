# CLAUDE.md — Lac Tranquille

## Vue d'ensemble du projet

Jeu de pêche paisible en JavaScript pur (vanilla), sans framework, sans dépendance externe,
sans build step. Pixel art en canvas basse résolution (480×270) agrandi sans lissage.
Thème Lovecraftien léger (abominations, Cthulhu). Mono-joueur, sauvegarde locale (localStorage),
sauvegarde en ligne et classement sur un Worker Cloudflare + D1 (`server/cloud-save/`).

- **Version actuelle** : voir `GAME_VERSION` dans `game.js` (format MAJEUR.MINEUR.CORRECTIF —
  incrémenter à chaque pull request). **La même version est écrite dans `index.html`** :
  `<meta name="game-version">` et le `?v=` de `style.css` et de chaque script. Les trois doivent
  toujours être identiques : le `?v=` force le rechargement des fichiers après une mise à jour
  (GitHub Pages les garde 10 minutes en cache), et game.js recharge la page si la balise `<meta>`
  ne correspond pas à `GAME_VERSION`.
- **Langue** : code, commentaires et UI en français.

## Architecture des fichiers

| Fichier      | Rôle |
|--------------|------|
| `index.html` | Point d'entrée, squelette DOM, canvas `#canvas` |
| `game.js`    | Cœur du jeu : données (poissons/crustacés/cannes/appâts/caisses), boucle de jeu, sauvegarde, progression (~16 pages, le plus gros fichier) |
| `world.js`   | Monde : lac, météo, cycle jour/nuit, décor |
| `character.js` | Personnalisation du personnage : palettes, `LOOK_OPTIONS`, `validLook()`, construction du sprite 18×21 |
| `village.js` | Village : habitants `NPCS` (dialogues d'intro/salutations), économie (`MARKET`, `BANK`, bric-à-brac, bourriche), textes de la cinématique `INTRO_SCENES`, tutoriels (`GRANDPA`, `TUTO_FISH`, `TUTO_RETRY`, `TUTO_SAVE`), décors pixel art. Chargé après `character.js`, avant `game.js` |
| `pixel.js`   | Utilitaires pixel art : `makeCanvas`, `pxRect`, `pxDisk`, `shadeHex`, `pixelize` |
| `audio.js`   | Musique et SFX 100 % synthétisés (Web Audio API) via module IIFE `Sound` |
| `style.css`  | Styles de l'UI |
| `server/cloud-save/` | Worker Cloudflare (`worker.js`) + base D1 (`schema.sql`) : sauvegarde en ligne et classement ; tests `node server/cloud-save/test.mjs` ; déploiement : `README.md` |
| `CHANGELOG.md` | Notes de version, une section par `GAME_VERSION` (à compléter à chaque pull request, avec l'impact sur la sauvegarde : ✅ / ⚠️ / ⛔). Les points importants vont aussi dans `WHATS_NEW` (game.js, encart du menu) |

## Ordre de chargement important

`character.js` utilise `makeCanvas`, `pxRect`, `pxDisk`, `shadeHex`, `pixelize` définis dans
`pixel.js` → **charger `pixel.js` AVANT `character.js` et `game.js`**.
Dans `audio.js`, `BPM` et `E8` sont déclarées en tête du module, avant `init()` qui les utilise :
garder toute constante utilisée par `init()` au-dessus de cette fonction.
`validProgress()` (game.js) utilise `ACHIEVEMENTS`, déclaré plus bas : ne l'appeler qu'après
l'évaluation complète de game.js (c'est le cas : chargement depuis le menu ou l'import).

## Conventions de code

- `'use strict'` en tête de chaque fichier.
- Modules par IIFE ou objets const (ex. `const Sound = (() => {...})()`), pas de globals qui fuient.
- Nommage :
  - `fmtXxx` → formateurs (`fmtNum`, `fmtKg`, `fmtCm`, `fmtPct`, `fmtTime`)
  - `validXxx` → validateurs/nettoyeurs de données externes (`validLook`, `validProgress`, `validPot`,
    `validBoard`)
  - `XXX_BY_ID` → lookup par id (`FISH_BY_ID`, `ROD_BY_ID`, `BAIT_BY_ID`, `POT_BY_ID`, `CRUST_BY_ID`)
  - constantes de config en MAJUSCULES (`BASE_ABOM_CHANCE`, `CTHULHU_BASE_CHANCE`, `POT_SLOTS`)
- Données de contenu : tableaux d'objets littéraux (`FISH`, `RODS`, `BAITS`, `POTS`, `CRUSTS`,
  `LOOK_OPTIONS`) avec `id`, `name`, `tier`, `spawn`, `desc` en français. Les variantes
  « abomination » portent `abomName`, `abomColor`, `abomDesc`.
- Tout texte utilisateur injecté dans le DOM passe par `escapeHtml()`.

## Sauvegarde (localStorage)

- Clé : `lacTranquille.save` (paramètres audio : `lacTranquille.settings`).
- Schéma canonique : `emptyProgress()` dans `game.js` (version `v: 2`, champs `money`, `rod`,
  `rods`, `dex`, `potsOwned`, `achievements`, `boat`, `items`, `equip`, `clock`, `weather`, `curse`, `stats`).
- Équipement : `SLOTS` (world.js) liste les emplacements ; `kind` = type d'objet accepté (`ITEM_KINDS`).
  Les 3 emplacements `acc1`..`acc3` acceptent les accessoires, jamais deux fois le même.
- **Compatibilité entre versions** (éviter de faire perdre les parties) :
  - ajouter un champ = lui donner une valeur par défaut dans `emptyProgress()` ; ne pas changer `v` ;
  - ne jamais renommer ni supprimer l'`id` d'un contenu sans l'ajouter à `SAVE_RENAMES` (ancien → nouveau) ;
  - `validProgress()` relit chaque section dans un `step()` isolé : une nouvelle section y va aussi ;
  - copie de sécurité automatique (`lacTranquille.save.backup`) au changement de version (`gv` écrit
    dans la save), avant nouvelle partie, import ou restauration ;
  - toute perte de progression doit être annoncée dans `CHANGELOG.md` (⚠️ partielle / ⛔ effacée) ;
  - nouveau champ de premier niveau = l'ajouter aussi à `SAVE_FIELDS` dans `server/cloud-save/worker.js`
  - nouvelle espèce (poisson ou crustacé) = mettre à jour `DEX_MAX` dans `server/cloud-save/worker.js`
    (égal à `dexTotal()`), sinon les scores des joueurs qui la pêchent sont refusés
    et redéployer le Worker, sinon la sauvegarde en ligne refuse les envois.
- Sauvegarde en ligne : lien de l'appareil dans `lacTranquille.cloud` (`{ name, key, rev, at }`) ;
  clé générée par `crypto.getRandomValues`, jamais par `Math.random()`. Détails et déploiement :
  `server/cloud-save/README.md`.
- **Règle** : toute donnée relue depuis localStorage est du texte non fiable → try/catch +
  nettoyage champ par champ (même logique que `validLook()`). Ne jamais fusionner une save
  brute avec `Object.assign` sur l'objet progress sans validation.

## Règles de sécurité (obligatoires)

1. Pas d'`eval`, pas de `new Function`, pas de `innerHTML` avec texte utilisateur non échappé
   (`escapeHtml()` systématique). Privilégier `textContent` quand aucun balisage n'est requis.
2. Aucune dépendance externe, CDN ou fetch vers un domaine tiers — le jeu reste 100 % local
   et autonome (polices comprises : `fonts/`). **Seule exception : le Worker `server/cloud-save/`**
   (sauvegarde en ligne et classement, adresse dans `CLOUD_SAVE.url`, game.js), seule origine de
   `connect-src` dans la CSP de `index.html`. Le lien vers les notes de version sur github.com est
   un simple lien (aucune requête). Toute nouvelle origine doit aussi être ajoutée à la CSP.
3. `Math.random()` uniquement pour le gameplay. Jamais pour un identifiant, token ou usage
   cryptographique → `crypto.randomUUID()` / `crypto.getRandomValues()` si besoin.
4. Données réseau (leaderboard, import/export de save) : toujours re-valider côté serveur avec
   un schéma strict (rejeter `__proto__`, `constructor`, champs inconnus, bornes réalistes sur
   taille/valeur/fréquence des scores). Ne jamais faire confiance au client.
5. `localStorage` et toutes les APIs stockage sont enveloppées dans try/catch (mode privé,
   quota, désactivation).

## Frontière client/serveur (déploiement en cours)

- Jeu statique hébergé sur GitHub Pages ; backend : Worker Cloudflare + D1 (`server/cloud-save/`),
  routes `/v1/save`, `/v1/load`, `/v1/delete`, `/v1/score`, `/v1/leaderboard`. Toute route serveur DOIT : valider le payload (schéma strict), limiter le débit (rate limiting),
  borner la taille des requêtes, ne jamais exécuter de commandes/SQL avec des chaînes
  concaténées (requêtes paramétrées), et logger sans données personnelles.
- CSP : balise `<meta>` dans `index.html` (fonctionne aussi en `file://`). Ne pas ajouter de
  script inline ni de gestionnaire `onclick=` : `script-src 'self'` les bloque.
- Headers HTTP recommandés en production : même CSP + `frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`,
  HSTS si HTTPS, pas de répertoire listé (`autoindex off` / `Options -Indexes`). GitHub Pages ne
  permet pas d'en-têtes personnalisés (Netlify / Cloudflare Pages : fichier `_headers`).
- Classement : le score est calculé par le Worker à partir de la sauvegarde en ligne du pseudo
  (`scoreFromSave`, contrôles de cohérence `scoreProblem`), jamais reçu tel quel du client. La règle
  de nom (`NAME_RE`, worker.js) est dupliquée dans game.js (`LB_NAME_RE`). Toute modification de
  `worker.js` ou `schema.sql` = redéployer (voir `server/cloud-save/README.md`).

## Définition de « terminé »

- Le jeu fonctionne en ouvrant simplement `index.html` (aucune étape de build).
- La version `GAME_VERSION` est incrémentée, ainsi que `game-version` et les `?v=` d'`index.html`.
- Les modifications respectent les conventions ci-dessus.
- Données non fiables traitées : échappées/validées avant affichage ou stockage.