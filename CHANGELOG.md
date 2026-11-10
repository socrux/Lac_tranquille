# Notes de version — Lac Tranquille

Format des versions : MAJEUR.MINEUR.CORRECTIF (voir `GAME_VERSION` dans `game.js`).

## Et ma sauvegarde ?

Chaque version indique ce qu'il advient de votre partie :

- ✅ **Sauvegarde conservée** : rien à faire, votre partie continue.
- ⚠️ **Sauvegarde partiellement réinitialisée** : une partie de la progression est perdue (le détail est donné).
- ⛔ **Sauvegarde effacée** : la partie repart de zéro. Pensez à exporter votre sauvegarde avant de mettre à jour.

Depuis la 1.4.0, une copie de sécurité est faite automatiquement avant chaque mise à jour du jeu et avant une nouvelle partie. Vous pouvez la restaurer depuis **Options › Sauvegarde**.

La partie est enregistrée **dans le navigateur, pour une adresse donnée**. Une autre adresse (un autre dossier sur le disque, une autre version en ligne, la navigation privée, un autre navigateur) part d'une partie vierge sans avoir effacé la vôtre. Pour changer d'appareil, utilisez la **sauvegarde en ligne** (pseudo + clé), ou **Exporter** puis **Importer**.

---

## 1.7.1 — Une police plus lisible, et une série de corrections (11/11/2026)

✅ **Sauvegarde conservée.**

### Améliorations
- **Nouvelle police d'écriture : Jersey 15**, à la place de Pixelify Sans. Toujours en pixel art, mais bien plus lisible : les chiffres ne se confondent plus (le 3, le 5 et le 2, le 8) et le texte se lit d'un trait. Accents, « Œ » et guillemets français compris.
- La mise en page ne change pas : la police est mise à l'échelle pour occuper la même place que l'ancienne.
- **Plus fluide** : les poissons du carnet, de la caisse relevée et de la carte de prise ne sont plus redessinés à chaque image (seules les abominations et le Grand Ancien s'animent), les effets de malédiction et le classement coûtent moins cher.

### Corrections
- **Copie de sécurité** : elle garde toujours la partie la plus avancée. Deux « Nouvelle partie » de suite ne peuvent plus effacer une vraie partie.
- **Le Grand Ancien n'est plus relâché** quand la bourriche est pleine : il dépasse sa capacité.
- **Succès « Double casier »** : il se débloque bien avec deux caisses à l'eau (il en demandait cinq depuis la 1.7.0).
- **Profil** : il ne plante plus quand la plus grosse prise est un crustacé.
- **Raccourcis clavier** : Ctrl+C, Ctrl+P, etc. ne déclenchent plus les raccourcis du jeu (Ctrl+C copie de nouveau la clé de sauvegarde). Ils sont aussi coupés dans l'éditeur de personnage, pour ne rien perdre.
- **Malédictions** : une malédiction acceptée ne disparaît plus au rechargement, et le compte à rebours reste à jour panneau ouvert. Plus d'effets de malédiction sur l'introduction revue en pleine partie, et le tutoriel reprend ensuite.
- **Sauvegarde en ligne** :
  - deux appareils en conflit : le jeu demande désormais quelle version garder, au lieu d'écraser parfois l'autre appareil ;
  - une sauvegarde en ligne supprimée n'est plus recréée par un autre appareil encore lié ;
  - un envoi en cours ne mélange plus deux pseudos quand on délie l'appareil ;
  - Safari 15 et plus ancien peuvent de nouveau charger le classement.
- **Divers** : objets revendus faute de place comptés dans les statistiques, bric-à-brac et météo mieux relus depuis une sauvegarde importée, nom coupé sans casser d'emoji, son relancé après une interruption sur iPhone, petits défauts de dessin des tuiles du village.

> **Mise à jour du serveur nécessaire.** Le serveur protège mieux le classement et les sauvegardes en ligne :
> - le temps de jeu ne peut plus avancer plus vite que le temps réel, une première inscription est plafonnée à 150 h, le carnet à sa vraie taille, et une partie sans prise n'entre pas au classement ;
> - au plus 5 nouveaux pseudos par jour et par connexion, envois limités à 64 Ko ;
> - limite de débit comptée par réseau IPv6, classement gardé 30 s en mémoire (5 min pour l'image).
>
> 1. **Base** : *D1 › lac-tranquille-saves › Console*, collez **tout** `server/cloud-save/schema.sql`, puis *Execute* (ajoute la table `signups` et un index ; les données existantes ne bougent pas).
> 2. **Worker** : collez le nouveau `server/cloud-save/worker.js` dans l'éditeur du Worker, puis *Deploy*.
>
> Dans cet ordre de préférence : sans la table, le serveur fonctionne quand même, mais sans quota de pseudos. Le nouveau serveur reste compatible avec les jeux 1.5 à 1.7.

---

## 1.7.0 — Contre le Grand Ancien, carnet des trouvailles (10/11/2026)

✅ **Sauvegarde conservée.** Les objets déjà dans votre inventaire sont comptés comme découverts dans le carnet. Ceux que vous avez vendus avant cette version ne peuvent pas l'être : le jeu ne les retenait pas.

### Nouveautés
- **5 accessoires contre le Grand Ancien**, à trouver sur les poissons et dans les caisses :

  | Accessoire | Rareté | Effets |
  |---|---|---|
  | Cloche de brume | Rare | Vigueur du Grand Ancien −15 % |
  | Amulette des profondeurs | Rare | Grand Ancien ×1,5 · Barre contre le Grand Ancien +10 % |
  | Ancre runique | Épique | Barre contre le Grand Ancien +25 % · Vigueur des poissons −5 % |
  | Idole de pierre verte | Épique | Grand Ancien ×2 · Vigueur du Grand Ancien −10 % · Abomination +1 % |
  | Signe des Anciens | Légendaire | Vigueur du Grand Ancien −25 % · Barre contre le Grand Ancien +30 % · Grand Ancien ×1,5 |

  - **Deux nouveaux effets**, qui ne jouent que pendant le combat contre le Grand Ancien. *Vigueur du Grand Ancien* le rend moins agité, dans la limite de −60 %. *Barre contre le Grand Ancien* élargit la barre verte.
- **Carnet : sections « Objets » et « Accessoires »**, présentées comme les poissons, deux par double page.
  - Un objet jamais obtenu apparaît en **silhouette noire**, avec ses caractéristiques en « ???? ». Son type et sa rareté restent visibles.
  - Chaque page indique s'il existe **mieux dans la même catégorie** (combien d'objets plus rares, et combien sont déjà découverts).
  - La couverture compte les découvertes par rareté, et le sommaire mène directement à chaque objet.
- **Classement** : dans « Plus grosse prise », le nom du poisson d'un autre joueur s'affiche en « ???? » tant que vous ne l'avez pas vous-même dans votre carnet. Cela vaut aussi pour les abominations.
- **Bouton « Inventaire »** dans la barre d'icônes (raccourci : I) : il ouvre directement l'onglet Inventaire du profil.
  - Un **« ! »** jaune s'affiche dessus quand un nouvel objet tombe, sur un poisson ou dans une caisse, et disparaît dès qu'on ouvre l'inventaire. Il reste affiché après un rechargement de la page.
- **Caisses : une par niveau de bateau**, de 1 caisse (barque) à 5 caisses (Navire Abysse-X), avec 3 nouveaux emplacements sur le lac.
  - Les emplacements pas encore débloqués apparaissent verrouillés, avec le niveau de bateau qu'il leur faut.
  - ⚠️ Avec la barque (niveau 1), on passe de 2 caisses à 1. Une caisse déjà posée sur le 2ᵉ emplacement n'est pas perdue : elle se relève normalement, mais ne peut être reposée qu'à partir du bateau de niveau 2.
- **Classement, « Jours au lac »** : le temps de jeu exact (heures, minutes, secondes) s'affiche à côté du nombre de jours.
- **README du dépôt GitHub** : il présente le jeu et affiche le classement en direct. Le serveur génère l'image du top 10, rafraîchie toutes les 5 minutes environ.
- **Poissonnerie** : votre argent est affiché dans le panneau. Après une vente, un « +X » vert apparaît à côté pendant 5 secondes, dans le panneau et dans la barre du haut. Des ventes rapprochées s'additionnent.
- **Revente des caisses** : la liste « Mes caisses », en bas de l'écran des caisses, permet de revendre les anciennes pour 40 % de leur prix d'achat. Il faut confirmer d'un second clic, et une caisse à l'eau ne peut pas être revendue.
- **Meilleure caisse par défaut** : chaque emplacement libre propose la meilleure caisse disponible, en tenant compte des autres emplacements. Un choix fait à la main est conservé.
- **Vérification au lancement** : si la caisse choisie n'est plus disponible au moment de la mettre à l'eau (déjà lancée depuis un autre emplacement préparé), ou si l'appât est épuisé, rien n'est lancé. Un message l'explique, et un autre choix est proposé.
- **Caisse relevée** : si on ne la remet pas à l'eau, « Gérer mes caisses » (ou Échap) ramène à l'écran des caisses, pour en poser une autre ou changer d'appât.

### Corrections
- **Cinématique d'ouverture :** dans les deux dernières scènes (le lac), la barque et le personnage étaient cachés derrière le texte. Le lac est maintenant cadré plus haut.
- **« Revoir l'introduction » pendant un tutoriel :** la bulle du tutoriel ne reste plus affichée par-dessus la cinématique.

> **Mise à jour du serveur nécessaire, avant de publier le jeu.** La sauvegarde a un nouveau champ (`seen`, objets découverts), que le serveur doit connaître : sinon, les sauvegardes en ligne des joueurs en 1.7.0 seraient refusées. Collez le nouveau `server/cloud-save/worker.js` dans l'éditeur du Worker, puis *Deploy*. La base ne change pas. Le nouveau serveur accepte aussi les jeux 1.5 et 1.6.

---

## 1.6.0 — Lancer visé, bulles et classement automatique (10/11/2026)

✅ **Sauvegarde conservée.** Cette version intègre aussi les correctifs prévus pour la 1.5.1.

### Nouveautés
- **Lancer visé** : le bouchon tombe à l'endroit où vous cliquez (ou touchez) sur le lac.
  - Un clic sur le ciel, les rives ou le bateau ne lance pas la ligne.
  - À la souris, le curseur devient un viseur au-dessus de l'eau.
  - La barre Espace lance toujours la ligne au hasard.
- **Bulles sur le lac** : de 0 à 5 fois par jour, des bulles remontent à la surface quelque part sur le lac, pendant une minute environ.
  - Lancez votre ligne dans la zone, qui est large : les poissons rares et les abominations deviennent deux fois plus fréquents pour ce lancer.
  - Un message prévient quand les bulles apparaissent.
- **Classement automatique** : il n'y a plus de bouton « Envoyer mon score ». Chaque sauvegarde en ligne (automatique, bouton « Sauver », retour au menu) met votre score à jour.
  - Tout joueur qui active la sauvegarde en ligne apparaît au classement.

### Changements
- **La sauvegarde en ligne est proposée, plus activée d'office.** Pendant l'astuce sauvegarde, le jeu demande « Voulez-vous activer la sauvegarde en ligne ? », avec « Oui, activer » ou « Non merci ».
  - Le choix est retenu dans la partie, et peut être changé à tout moment dans les Options.
  - La question n'est pas posée si l'appareil est déjà lié.

### Corrections
- **Après une mise à jour, le jeu pouvait s'afficher à moitié** : encart des nouveautés vide, icône « Sauver » manquante… Le navigateur gardait d'anciennes copies des fichiers du jeu.
  - Chaque fichier porte maintenant le numéro de version, ce qui force un rechargement complet à chaque mise à jour.
  - Si la page et les scripts ne correspondent pas, le jeu se recharge tout seul, une fois.

> **Mise à jour du serveur nécessaire** (classement automatique) : collez le nouveau `server/cloud-save/worker.js` dans l'éditeur du Worker sur Cloudflare, puis cliquez sur *Deploy*. La base ne change pas. Avec Wrangler : `npx wrangler deploy` depuis `server/cloud-save/`. Le nouveau serveur reste compatible avec le jeu 1.5.0.

---

## 1.5.0 — Classement, bouton Sauver et tutoriels (10/11/2026)

✅ **Sauvegarde conservée.** Les parties déjà commencées passent la pêche d'entraînement : seule l'astuce sauvegarde leur est montrée.

### Nouveautés
- **Nouveau classement en ligne**, instantané : il n'y a plus de page GitHub à remplir.
  - « Envoyer mon score » active la sauvegarde en ligne au besoin et vous inscrit au classement.
  - Le score est calculé par le serveur à partir de votre sauvegarde en ligne, puis mis à jour à chaque sauvegarde. Le meilleur de chaque catégorie est conservé.
  - Votre pseudo est protégé par votre clé : personne ne peut envoyer un score à votre place.
- **Bouton « Sauver »** dans la barre d'icônes (raccourci : S) : sauvegarde la partie dans le navigateur et en ligne.
- **Sauvegarde en ligne activée par défaut** : elle s'active toute seule en entrant en partie, et votre clé s'affiche. Si vous déliez l'appareil, elle ne se réactive plus d'elle-même.
- **Tutoriel de pêche** : au début d'une nouvelle partie, Papi Émile vous attend au ponton, puis vous guide pour une pêche d'entraînement (lancer, attendre, ferrer, remonter). Le poisson est facile et la morsure rapide.
- **Astuce sauvegarde** : des flèches montrent le bouton « Sauver », puis la clé personnelle dans les options.
- Les tutoriels peuvent être passés, et revus depuis les options.
- **Menu de départ** : un encart présente la version et ses principales nouveautés, avec un lien vers ces notes de version.

### Sécurité
- **Serveur :** une sauvegarde en ligne n'est acceptée que si son personnage porte bien le pseudo sous lequel elle est rangée (majuscules et minuscules indifférentes).

> **Mise à jour du serveur nécessaire :** d'abord `schema.sql` dans la console D1 (table du classement), puis le nouveau `worker.js` dans l'éditeur du Worker et *Deploy*. Voir `server/cloud-save/TUTO-classement.md` et `TUTO-redeploiement.md`. Avec Wrangler : `npx wrangler deploy` depuis `server/cloud-save/`.

---

## 1.4.0 — Sauvegarde en ligne (10/11/2026)

✅ **Sauvegarde conservée.**

### Nouveautés
- **Sauvegarde en ligne** (Options › Sauvegarde en ligne) : reprenez votre partie sur n'importe quel appareil avec votre **pseudo** et votre **clé personnelle**.
  - Le jeu génère votre clé à l'activation (`LAC-XXXXX-XXXXX-XXXXX-XXXXX`). Notez-la : elle ne peut pas être retrouvée.
  - La partie est envoyée automatiquement toutes les 5 minutes et au retour au menu. Un bouton « Envoyer maintenant » est aussi disponible.
  - « Reprendre une partie en ligne » : saisissez votre pseudo et votre clé, vérifiez l'aperçu, puis confirmez.
  - Joué sur deux appareils ? Une version plus avancée en ligne n'est jamais écrasée sans vous demander.
  - Vous pouvez délier un appareil, ou supprimer votre sauvegarde en ligne.

### Mobile
- **Écran adapté aux téléphones** (à l'horizontale) :
  - texte plus grand ;
  - panneaux presque plein écran, dont le contenu défile ;
  - barre d'icônes compacte ;
  - boutons assez grands pour le doigt.
- Le jeu tient compte des encoches et des coins arrondis, ainsi que de la barre d'adresse du navigateur.
- Téléphone tenu à la verticale : un écran invite à le tourner. Sur Android, un bouton « Plein écran » bloque aussi l'affichage à l'horizontale.
- Garder le doigt appuyé sur le lac remonte la ligne, sans ouvrir de menu contextuel, de loupe ni de zoom.
- Sur écran tactile, les consignes disent « Touchez » au lieu de « Cliquez ».

### Sauvegarde
- **Copie de sécurité automatique**, restaurable depuis les options. Elle est faite :
  - au premier lancement d'une nouvelle version du jeu ;
  - avant une nouvelle partie ;
  - avant un import ou une restauration (on peut donc revenir en arrière) ;
  - quand une sauvegarde ne peut pas être lue (l'original est gardé tel quel).
- **Chargement section par section** : si une partie de la sauvegarde est abîmée ou vient d'un format différent, seule cette section revient à sa valeur par défaut. Le reste de la partie est conservé.
- **Renommage des contenus** : quand un poisson, une canne ou un objet change d'identifiant, les sauvegardes existantes sont converties automatiquement au lieu de perdre l'élément.
- La sauvegarde retient la version du jeu qui l'a écrite.

---

## 1.3.1 — Le village redessiné (10/11/2026)

✅ **Sauvegarde conservée.**

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

✅ **Sauvegarde conservée.** Les données du village (bourriche, banque, cours du poisson, habitants rencontrés) démarrent à zéro.

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

✅ **Sauvegarde conservée.** Le temps de jeu est recalculé d'après l'horloge de la partie.

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

✅ **Sauvegarde conservée.**

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

✅ **Sauvegarde conservée.** Les valeurs hors limites sont ramenées dans les bornes.

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

✅ **Sauvegarde conservée.** À la reprise, le jeu demande de créer son personnage. La progression reste intacte.

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

⚠️ **Sauvegarde partiellement réinitialisée.** Pour les parties commencées avant la 1.0.0, seul le nombre de poissons pêchés est repris.

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
