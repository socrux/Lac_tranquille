# 🎣 Lac Tranquille

*Un bateau, une canne, et tout le temps du monde.*

Un jeu de pêche paisible en pixel art, à jouer directement dans le navigateur. Il est paisible…
jusqu'à ce que le lac commence à vous regarder.

### ▶️ [Jouer maintenant](https://socrux.github.io/Lac_tranquille/)

Ça marche sur ordinateur, et sur téléphone tenu à l'horizontale. Il n'y a rien à installer, ni de
compte à créer.

---

## 🏆 Classement

Le classement se met à jour tout seul : il suffit d'activer la **sauvegarde en ligne** dans le
jeu. Chaque sauvegarde envoie alors votre score.

[![Classement : pièces gagnées](https://lac-tranquille-saves.cloudflare-blissful748.workers.dev/v1/leaderboard.svg?cat=earned)](https://socrux.github.io/Lac_tranquille/)

<details>
<summary>Les autres catégories</summary>

[![Classement : jours au lac et temps de jeu](https://lac-tranquille-saves.cloudflare-blissful748.workers.dev/v1/leaderboard.svg?cat=days)](https://socrux.github.io/Lac_tranquille/)

[![Classement : plus grosse prise](https://lac-tranquille-saves.cloudflare-blissful748.workers.dev/v1/leaderboard.svg?cat=heaviest)](https://socrux.github.io/Lac_tranquille/)

[![Classement : carnet](https://lac-tranquille-saves.cloudflare-blissful748.workers.dev/v1/leaderboard.svg?cat=dex)](https://socrux.github.io/Lac_tranquille/)

[![Classement : Grand Ancien](https://lac-tranquille-saves.cloudflare-blissful748.workers.dev/v1/leaderboard.svg?cat=cthulhu)](https://socrux.github.io/Lac_tranquille/)

</details>

Les images sont rafraîchies toutes les 5 minutes environ. Le classement complet (top 50, six
catégories) se trouve dans le jeu, menu **Classement**.

---

## 🐟 Le jeu

Après dix ans de bureau, vous revenez dans votre village natal, Saint-Aubin-du-Lac, au bord du
lac où votre grand-père vous a appris à pêcher. Papi Émile vous attend au ponton…

- **Pêchez** : visez un endroit du lac, attendez que le bouchon plonge, ferrez, puis gardez le
  poisson dans la barre verte pour le remonter.
- **Complétez le carnet** : poissons, crustacés, objets et accessoires. Et leurs versions
  *abominations*, quand le lac se corrompt.
- **Équipez-vous** : cannes, appâts, 5 vêtements et 3 accessoires, trouvés sur les poissons, dans
  les caisses ou chez la brocanteuse.
- **Le village** : la poissonnerie (le prix du poisson suit un cours qui varie chaque jour), la
  banque et ses intérêts, le bric-à-brac, le chantier naval pour améliorer le bateau (5 niveaux),
  et une sorcière qui vend des malédictions…
- **Le lac vit** : jour et nuit, météo, bulles qui remontent à la surface (rareté et
  abominations ×2), caisses à crustacés qui se remplissent même jeu fermé.
- **Le Grand Ancien** dort sous le lac. Plus vous remontez d'abominations, plus il se rapproche de
  la surface. Il faut le vaincre en trois phases d'affilée.

### Commandes

| Action | Souris / tactile | Clavier |
|---|---|---|
| Lancer la ligne | Cliquer / toucher le lac | Espace (lancer au hasard) |
| Ferrer | Cliquer | Espace |
| Remonter | Maintenir le clic / le doigt | Maintenir Espace |
| Carnet · Village · Caisses · Succès | Icônes en haut à droite | C · V · K · T |
| Profil · Inventaire · Options | Icônes en haut à droite | P · I · O |
| Sauvegarder | Icône « Sauver » | S |

### Sauvegarde

- **Automatique**, dans le navigateur, avec une copie de sécurité avant chaque mise à jour du jeu.
- **En ligne (facultatif)** : le jeu vous la propose au début. Vous recevez une **clé
  personnelle** (`LAC-XXXXX-XXXXX-XXXXX-XXXXX`) qui permet de reprendre votre partie sur n'importe
  quel appareil, avec votre pseudo. Votre score apparaît alors au classement.
- **Export / import** en fichier, dans les Options.

---

## 🛠️ Technique

- JavaScript pur, sans framework, sans dépendance et sans étape de compilation : il suffit
  d'ouvrir `index.html`.
- Tout est dessiné en code, en pixel art (canvas 480 × 270 agrandi), et la musique et les
  bruitages sont synthétisés en direct (Web Audio API). Il n'y a aucun fichier image ni son.
- Hébergement : **GitHub Pages** pour le jeu ; **Cloudflare Workers + D1** pour la sauvegarde en
  ligne et le classement (`server/cloud-save/`).
- Sécurité : politique CSP stricte, données de sauvegarde validées champ par champ, schéma strict
  côté serveur, requêtes SQL paramétrées, limite de débit. Le score est calculé par le serveur à
  partir de la sauvegarde, jamais envoyé par le joueur.

### Développer

```bash
# Le jeu : ouvrir index.html dans un navigateur (aucune installation)

# Tests du serveur (Node.js 22 ou plus, sans dépendance)
node server/cloud-save/test.mjs
```

Les conventions du projet (nommage, sauvegarde, sécurité, gestion des versions) sont décrites dans
[`claude.md`](claude.md).

---

## 📜 Notes de version

Le détail de chaque version, avec ce qu'elle change pour votre sauvegarde, est dans
[CHANGELOG.md](CHANGELOG.md).

## Crédits

- Police **Jersey 15** (The Soft Type Project), sous licence SIL Open Font License (voir [`fonts/OFL.txt`](fonts/OFL.txt)).
- Tout le reste (code, graphismes, musique) est fait main, pixel par pixel et note par note.
