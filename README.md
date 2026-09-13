# La Bidouille OS — édition rétro 3.1

La Bidouille OS est un site personnel en français présenté comme un bureau informatique des années 90. Cette édition conserve le contenu existant et ajoute :

- un écran de démarrage original « La Bidouille », inspiré de l’informatique des années 90 ;
- des animations rétro, un balayage CRT et des scanlines discrètes ;
- des sons de clic et d’ouverture générés localement, avec un bouton pour couper le son ;
- un gestionnaire Windows au format `.exe` ;
- un éditeur visuel pour les vidéos, icônes, images, téléchargements, jeux, consoles et textes du site ;
- un aperçu local et une publication GitHub Pages en un clic ;
- une connexion GitHub protégée par le chiffrement de la session Windows ;
- des erreurs en français, un journal d’activité et des sauvegardes automatiques.

Le site à publier se trouve dans le dossier `website`. Une copie des principaux fichiers du site est aussi conservée à la racine pour faciliter son ouverture manuelle.

## Installer le gestionnaire

L’installateur prêt à l’emploi s’appelle :

`La-Bidouille-Gestionnaire-3.1.0-Windows-x64.exe`

1. Double-cliquez sur l’installateur.
2. Si Windows SmartScreen affiche un avertissement, cliquez sur **Informations complémentaires**, puis **Exécuter quand même**, uniquement si le fichier provient bien de cette livraison. L’application n’est pas signée avec un certificat commercial.
3. Ouvrez **Gestionnaire La Bidouille** depuis le menu Démarrer ou son raccourci sur le bureau.
4. Dans **Projet local**, choisissez le dossier décompressé contenant ce README.
5. Gardez `website` dans le champ **Dossier du site à publier**.

## Gérer le contenu dans l’application

La partie **Contenu du site** évite de modifier le code à la main.

1. Choisissez une rubrique dans **Éléments à gérer**.
2. Modifiez les champs ou utilisez **+ Ajouter**.
3. Utilisez les flèches pour changer l’ordre et la croix pour supprimer un élément.
4. Pour une image ou une icône, cliquez sur **Choisir une image…**. Le fichier est copié automatiquement dans `assets` avec un nom sûr.
5. Cliquez sur **Enregistrer le contenu**.
6. Cliquez sur **Ouvrir l’aperçu** pour vérifier le résultat.

Rubriques disponibles :

- identité visuelle : nom, contact, logo, avatar, fond, biographie et présentation ;
- icônes du bureau : nom, image personnalisée et visibilité de chaque raccourci ;
- vidéos : tutoriels, réparations et mods ;
- téléchargements ;
- galerie d’images ;
- jeux ;
- fiches de consoles.

Chaque enregistrement crée d’abord une copie de sécurité dans `.la-bidouille-backups`. Ce dossier reste local et n’est pas publié sur GitHub. Si `contenu.js` existe aussi à la racine du projet, le gestionnaire synchronise automatiquement les deux copies.

Pour une vidéo YouTube, collez son adresse dans **Lien YouTube**. Pour une miniature, vous pouvez coller une adresse d’image ou importer un fichier local. Enregistrez toujours avant d’ouvrir l’aperçu ou de publier.

## Configurer GitHub sans token en clair

Le gestionnaire utilise un jeton GitHub à réglage fin. Après vérification, ce jeton est chiffré par Windows avant d’être enregistré dans les données privées de l’application. Il n’est jamais ajouté au projet, au dépôt, au journal visible ou à une ligne de commande.

1. Dans le gestionnaire, cliquez sur **Créer un jeton sur GitHub**.
2. Créez un jeton à réglage fin limité au seul dépôt de La Bidouille OS.
3. Accordez seulement **Metadata: Read-only** et **Contents: Read and write**.
4. Choisissez une date d’expiration raisonnable.
5. Collez le jeton dans le gestionnaire, puis cliquez sur **Enregistrer et vérifier**.
6. Saisissez le dépôt sous la forme `utilisateur/nom-du-depot`.
7. Indiquez la branche, généralement `main`.
8. Laissez la destination vide pour publier à la racine, ou indiquez `docs` si GitHub Pages utilise `/docs`.
9. Cliquez sur **Vérifier le dépôt**, puis sur **Publier**.

Le bouton **Déconnecter** supprime immédiatement le jeton chiffré de cet ordinateur. Pour le révoquer totalement, supprimez-le aussi depuis les paramètres GitHub.

À la première publication, le gestionnaire ajoute `.la-bidouille-publish.json`. Aux publications suivantes, il ne supprime que les anciens fichiers qu’il gérait déjà. Les fichiers externes au site, notamment `README`, `LICENSE`, `CNAME` et `.github/workflows`, sont conservés.

## Activer GitHub Pages

Dans le dépôt GitHub :

1. ouvrez **Settings → Pages** ;
2. choisissez **Deploy from a branch** ;
3. sélectionnez la même branche que dans le gestionnaire ;
4. choisissez `/ (root)` si la destination est vide, ou `/docs` si elle vaut `docs` ;
5. enregistrez.

Après **Publier**, GitHub Pages peut demander quelques instants pour reconstruire le site.

## Compiler l’EXE soi-même

Prérequis : Windows 10 ou 11, Node.js récent, `pnpm` et une connexion Internet lors de la première installation des dépendances.

Placez de préférence le projet dans un chemin court, par exemple `C:\LaBidouille`, puis ouvrez PowerShell dans ce dossier :

```powershell
corepack enable
pnpm install
pnpm test
pnpm run dist:win
```

L’installateur est créé ici :

`dist\La-Bidouille-Gestionnaire-3.1.0-Windows-x64.exe`

Un chemin Windows très long peut empêcher l’outil de création de l’installateur de démarrer. Dans ce cas, déplacez le projet près de la racine du disque et relancez `pnpm run dist:win`.

Pour lancer seulement l’application en mode développement :

```powershell
pnpm start
```

## Fonctionnement de la publication

Le gestionnaire compare le site local à l’arbre Git de la branche choisie. Il envoie uniquement les fichiers modifiés, retire les anciens fichiers gérés qui ont été supprimés localement, crée un commit puis avance la branche sans forcer l’historique. Si rien n’a changé, aucun commit vide n’est créé.

La publication utilise l’API GitHub depuis le processus protégé de l’application. L’interface visible n’a pas directement accès au système de fichiers, au jeton en clair ou aux fonctions Node.js.

## Structure utile

- `website/` : site prêt à publier ;
- `manager/` : application Windows et tests ;
- `contenu.js` : données éditables du site ;
- `retro.css` et `retro.js` : démarrage, animations, scanlines et sons ;
- `assets/` : images et icônes ;
- `.la-bidouille-backups/` : sauvegardes locales créées par le gestionnaire ;
- `.la-bidouille-publish.json` : inventaire sécurisé des fichiers publiés.

## Tests

La commande `pnpm test` vérifie notamment :

- la lecture et la validation sécurisées de `contenu.js` ;
- la validation du dépôt, de la branche et des chemins ;
- la création d’un commit et la détection « déjà à jour » ;
- la présence des ressources HTML, CSS et JavaScript ;
- la synchronisation du site avec le dossier `website` ;
- l’absence de jeton GitHub dans les sources.
