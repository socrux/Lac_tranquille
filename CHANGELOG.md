# Notes de version — Lac Tranquille

Format des versions : MAJEUR.MINEUR.CORRECTIF (voir `GAME_VERSION` dans `game.js`).

---

## 1.3.1 — Le village redessiné (10/11/2026)

### Graphismes
- Le plan de Saint-Aubin-du-Lac est entièrement redessiné en vue de dessus, avec une caméra fixe et éloignée. Le village est construit en tuiles de 16 px, dans l'esprit des villes de RPG en pixel art.
- **Sol** : herbe à touffes et fleurs, chemins bordés, place pavée, hautes herbes, plage. Le lac a son écume et son dégradé de profondeur.
- **Maisons en trois quarts** : toits à tuiles, cheminées, fenêtres à jardinière, enseignes, portes et marches, ombres portées.
- Chaque bâtiment a sa propre identité :
  - la banque en pierre ;
  - le bric-à-brac et ses auvents ;
  - la poissonnerie et son étal ;
  - le hangar du chantier naval ;
  - la cabane de la sorcière.
- **Décor** : lisière de forêt, jardins clôturés, fontaine et bancs, lampadaires, ponton et barque, nénuphars.
- **Animations** : fumée des cheminées, jets de la fontaine, reflets sur le lac.
- **La nuit** : les lampadaires diffusent un halo dégradé et les fenêtres s'allument (en vert chez la sorcière).

### Corrections
- Les zones cliquables suivent le nouveau plan.
- Les lampadaires ne chevauchent plus les clôtures.
- L'ancre n'est plus perdue dans les hautes herbes.

---

## 1.3.0 — Bienvenue au village (10/11/2026)

### Nouveautés
- **Cinématique d'ouverture** : un employé de bureau quitte son travail et revient dans son village natal, au bord d'un lac étrange.
- **Le village de Saint-Aubin-du-Lac**, accessible depuis le lac, avec ses habitants :
  - **La sorcière** : les malédictions de Morgane des Brumes.
  - **Le banquier** : épargne avec intérêts, indexés sur un cours du poisson simulé qui évolue chaque jour.
  - **Le bric-à-brac** : un stock d'objets renouvelé chaque jour, plus fourni à mesure que le bateau progresse.
  - **Le poissonnier** : il rachète les poissons de la bourriche au cours du jour.
  - **Le chantier naval** : les améliorations du bateau.
- **Bourriche** : les poissons pêchés vont dans l'inventaire au lieu d'être vendus automatiquement. La capacité de la bourriche augmente avec le bateau.
- **Dialogues** : chaque habitant se présente lors de la première visite (texte qui s'écrit lettre par lettre) puis salue le joueur aux visites suivantes. Une pastille « nouveau » signale les habitants pas encore rencontrés.

### Musique
- Nouveaux morceaux synthétisés : Village, Pluie, Nuit et Abysses, en plus du Calme et de l'Épique.
- La musique s'adapte au contexte : village, pluie, nuit, Grand Ancien.
- Dans les options, vous pouvez choisir un morceau et cocher « jouer ce morceau en boucle ».

### Corrections
- Classement : l'envoi du score ouvre un vrai lien vers GitHub. Le navigateur ne bloque donc plus la fenêtre comme un popup.

---

## 1.2.1 — Correctifs (10/11/2026)

### Corrections
- Revenir au menu en pleine prise compte désormais le poisson comme échappé. La prise n'est plus perdue sans laisser de trace.
- Les sons différés (rugissement, tonnerre, objet trouvé) ne se déclenchent plus sur le menu après un retour en arrière.
- La remise à zéro de la pêche est centralisée : combat, Grand Ancien, musique et carte de prise sont réinitialisés au chargement, au retour au menu et à la mise à l'eau d'un bateau.
- Il n'est plus possible de changer de bateau avec un poisson au bout de la ligne.
- Le temps de jeu suit l'horloge, panneaux ouverts compris. Il est rattrapé automatiquement sur les anciennes sauvegardes.
- Le classement ne refuse plus les scores à cause d'un faux « plus de prises que de lancers ».
- Le workflow du classement répond dans l'issue selon que la mise à jour a réussi ou non.

---

## 1.2.0 — Accessoires et malédictions (09/11/2026)

### Nouveautés
- **Accessoires** : 3 emplacements s'ajoutent aux 5 vêtements.
  - On ne peut pas porter deux fois le même accessoire.
  - Quand les 3 emplacements sont pris, le jeu demande lequel remplacer.
- 13 accessoires, du commun au légendaire, chacun avec son icône : guide du pêcheur, filet de pêche, chaise de transat… et le **Necronomicon**.
- **Malédictions de Morgane des Brumes** : à partir de la première abomination, la sorcière (touche M) propose chaque jour 3 malédictions parmi 12.
  - On peut en accepter une, ou aucune. Elle dure jusqu'au lendemain.
  - Chaque malédiction mêle bonus et malus.
  - Chacune ajoute un effet à l'écran : lune de sang, brume, yeux, tentacules, noir et blanc, ondulation, obscurité, runes, étoiles filantes…
  - La malédiction active s'affiche dans l'encart météo, et une pastille signale qu'un choix vous attend.
- 4 succès :
  - porter 3 accessoires ;
  - obtenir le Necronomicon ;
  - accepter sa première malédiction ;
  - accepter sa dixième malédiction.

### Corrections
- Le succès « Paré pour la pêche » compte bien les 5 vêtements.
- Aucun malus ne peut rendre une statistique négative.

---

## 1.1.1 — Revue de sécurité (09/11/2026)

### Sécurité
- Sauvegarde :
  - chaque champ est vérifié et borné, qu'il vienne du stockage local ou d'un import ;
  - une injection HTML possible par les champs numériques est corrigée ;
  - l'import est limité à 1 Mo.
- Classement :
  - les données téléchargées sont validées ;
  - le serveur applique un schéma strict, plafonne les gains et accepte un envoi toutes les 10 minutes par compte ;
  - le Markdown et les mentions sont neutralisés dans les réponses.
- Politique de sécurité du contenu (CSP) stricte. La police Pixelify Sans est hébergée avec le jeu et ne passe plus par Google Fonts.
- Les réglages audio sont validés au chargement.

---

## 1.1.0 — Bateaux, personnage et classement (09/11/2026)

### Nouveautés
- **Personnage personnalisable** à la création d'une partie, modifiable ensuite dans le profil (sauf le nom).
- **Bateaux** : 5 niveaux d'amélioration.
  - Chaque niveau demande des pièces achetées en boutique et une pièce spéciale à trouver en pêchant.
  - Une animation accompagne le changement de bateau.
  - Le niveau du bateau débloque les cannes et les casiers (jusqu'au palier 2 × niveau + 1).
- **Classement en ligne** via GitHub : on envoie son score par une issue, vérifiée automatiquement.
- **Disque « en cours de lecture »** avec le nom du morceau.

### Changements
- La case « mode admin » est retirée des options.

---

## 1.0.0 — Première version (09/11/2026)

### Contenu
- La pêche au lac en pixel art : poissons, crustacés, cannes, appâts, casiers et carnet des espèces pêchées.
- **Abominations** : des variantes lovecraftiennes des poissons, chacune avec son illustration.
- **Cthulhu** :
  - une animation où il sort de l'eau ;
  - un mini-jeu à 3 barres d'affilée ;
  - une musique épique.
- **Caisses flottantes** à repêcher.
- **Équipement** : hameçon, gants, bottes, pantalon et veste. Les objets tombent des caisses et des prises et se revendent selon leurs effets.
- **Inventaire** :
  - les objets identiques sont empilés ;
  - au survol, une infobulle compare les statistiques à celles de l'objet équipé.
- **Cycle jour/nuit** (1 jour = 10 minutes) avec un compteur de jours.
- **Météo et événements aléatoires**, chacun avec ses effets sur la pêche.
- Musique et effets sonores entièrement synthétisés.
- Le numéro de version est affiché dans les options.
