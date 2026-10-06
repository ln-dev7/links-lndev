# links.lndev.me

La page de liens de Leonel Ngoya (LN), en français et en anglais. HTML, CSS et JavaScript, sans dépendance ni étape de build.

La page est pensée comme l’écran d’accueil de mon téléphone : l’heure de Douala en grand, un fond qui suit le ciel de Douala à l’heure réelle (aube, journée, coucher de soleil, nuit étoilée), mes apps en vraies icônes, deux widgets et mes réseaux dans le dock.

- **Apps** : Travora, Voxylio, Tchopé, ReleaseReel. Un tap ouvre une fiche avec la description et les liens (site, App Store, Google Play, extensions…).
- **Quiz et Anecdotes** : une question tirée d’un épisode publié de la chaîne, avec réponse et anecdote.
- **Chess.com** : mon classement public (rapide, blitz) chargé depuis l’API publique de Chess.com ; sans réponse, le widget invite simplement à jouer.
- **Travail et contact** : portfolio, GitHub, Contact et Collabs. Contact ouvre une fenêtre avec deux choix : « Enregistrer mon contact » (`contact.vcf`, la même fiche que [hi.lndev.me](https://hi.lndev.me) : nom, titre, deux numéros, email, site, LinkedIn, X, GitHub ; le téléphone propose de l’ajouter aux contacts) et « M’écrire » (l’email). `vercel.json` sert la fiche en `text/vcard` « inline » pour que l’aperçu natif s’ouvre au lieu d’un simple téléchargement. Sans JavaScript, Contact ouvre directement la fiche.
- **Collabs** : mes collaborations avec des marques (`collabs` dans `assets/js/content.js`). Une seule : son icône s’affiche telle quelle (aujourd’hui Saily) et ouvre sa fiche (« Collaboration commerciale », description, code promo à copier, lien). Deux ou plus : elles se rangent dans un dossier « Collabs » comme sur iPhone (aperçu de 9 icônes au plus ; un toucher ouvre le dossier, un toucher sur une marque ouvre sa fiche). Ajouter une collab = un objet dans `collabs` et son icône carrée dans `assets/img/apps/`.
- **Dock** : TikTok, Instagram, YouTube, X, LinkedIn, Threads.
- **Organiser** (désactivé) : un mode « écran d’accueil » où un appui long fait trembler icônes et widgets pour les déplacer, avec une disposition gardée par visiteur. Le code est en place mais coupé ; pour le réactiver, passer `organize: true` dans `assets/js/content.js`.

## Structure

```text
index.html              la page (les liens fonctionnent aussi sans JavaScript)
assets/css/style.css    tout le style
assets/js/content.js    le contenu : apps, quiz, textes FR/EN
assets/js/app.js        langue, heure et ciel, fiches, quiz, widget échecs
assets/fonts/           Archivo (variable, licence OFL)
assets/img/             avatar, icônes des apps, logo QeA, étoiles
tools/og.html           gabarit de l’image de partage og.png
```

## Modifier le contenu

- Textes, descriptions, liens des stores, contact, collabs et questions du quiz : `assets/js/content.js`.
- Si tu changes l’URL principale d’une app ou d’un réseau, change-la aussi dans `index.html` (les ancres servent sans JavaScript et aux moteurs de recherche).
- Couleurs du ciel heure par heure : tableau `SKY` dans `assets/js/app.js`.

## Aperçu local

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000`. Paramètres utiles :

- `?at=18:10` affiche la page comme s’il était 18 h 10 à Douala (pratique pour voir le coucher de soleil ou la nuit).
- `?lang=fr` ou `?lang=en` force la langue. Sinon, la langue du navigateur est utilisée, puis le choix est mémorisé.

## Déploiement

Site statique : sur Vercel, importer le dépôt avec le preset « Other », sans commande de build, dossier de sortie à la racine, puis ajouter le domaine `links.lndev.me`. Tout hébergement statique convient (Netlify, GitHub Pages, Cloudflare Pages).

## Image de partage

`og.png` (1200 × 630) est une capture de `tools/og.html`. Pour la refaire : lancer le serveur local, ouvrir `http://localhost:8000/tools/og.html` dans une fenêtre de 1200 × 630 et faire une capture.
