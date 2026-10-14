# Epic 3 Fil temps réel, votes et réputation

Faire vivre la communauté. Le fil montre ce qui se passe maintenant autour de soi, chacun peut confirmer ou démentir sur place, et la fiabilité devient visible : trust score, badges à collectionner, et effet holo pour les meilleurs signalements.

## Story 3.1 Fil d'alertes
As a collectionneur,
I want une liste chronologique des signalements valides autour de moi,
so that je vois d'un coup d'œil ce qui est disponible.

### Acceptance Criteria
1: Le fil liste les signalements valides dans le rayon (ou la zone par défaut sans position), du plus récent au plus ancien, avec un chargement progressif.
2: La **carte de signalement** est conçue comme une carte à collectionner : cadre, bandeau de statut, rareté selon la fiabilité. Elle montre magasin, distance, produits, ancienneté relative, vignette photo, nombre de confirmations, badge de fiabilité et « signalé à distance ».
3: Les signalements contestés sont désaccentués et les expirés n'apparaissent pas.
4: Les états vide, chargement et erreur sont conçus avec du ton.

## Story 3.2 Temps réel
As a collectionneur,
I want voir les nouveaux signalements arriver sans recharger,
so that je réagis immédiatement.

### Acceptance Criteria
1: Les nouveaux signalements et les changements de statut ou de votes arrivent en temps réel (< 5 s), filtrés par distance côté client.
2: Les nouveautés s'annoncent par une pastille « N nouveaux signalements » qui fait remonter la liste au tap, sans saut involontaire.
3: La connexion temps réel se coupe en arrière-plan et se rétablit au retour, avec rattrapage des événements manqués.

## Story 3.3 Filtres du fil
As a collectionneur,
I want filtrer le fil par produit, enseigne et fraîcheur,
so that je ne vois que ce qui m'intéresse.

### Acceptance Criteria
1: Les filtres portent sur les produits ou types, les enseignes et la fraîcheur (< 1 h, < 3 h, < 6 h).
2: Les filtres actifs sont visibles et réinitialisables en un tap. Ils sont mémorisés sur l'appareil.
3: Les filtres s'appliquent aussi aux événements temps réel.

## Story 3.4 Détail d'un signalement
As a collectionneur,
I want ouvrir un signalement en détail,
so that je juge sa fiabilité avant de me déplacer.

### Acceptance Criteria
1: L'URL dédiée (`/r/:id`) affiche magasin, produits avec quantités, prix, commentaire, photo en plein écran, auteur (pseudo et badge), votes et trust score.
2: Un signalement expiré reste consultable et marqué « expiré ».
3: Les liens vers la fiche magasin et l'itinéraire sont présents.

## Story 3.5 Voter sur un signalement
As a collectionneur sur place,
I want confirmer, démentir ou signaler qu'il n'y a plus rien,
so that l'info reste juste pour tout le monde.

### Acceptance Criteria
1: Une fonction serveur enregistre le vote. Elle exige d'être connecté, à **≤ 300 m** du magasin, sur un signalement valide qui n'est pas le sien. Le vote est unique par (signalement, utilisateur) et modifiable.
2: « Plus rien » applique la règle de FR22 : le signalement passe en épuisé et toute notification future est coupée.
3: La règle « contesté » de FR23 est appliquée.
4: Côté interface, le vote se fait en un tap. Une célébration discrète accompagne « Confirmé », et les refus serveur (distance) sont expliqués.
5: Les tests d'intégration couvrent : distance, unicité, auto-vote interdit, signalement expiré, règle « Plus rien » et règle « contesté ».

## Story 3.6 Réputation, trust score et badges
As a contributeur,
I want que mes signalements fiables soient reconnus,
so that je suis motivé à contribuer et la communauté sait à qui faire confiance.

### Acceptance Criteria
1: Le barème de réputation (FR24) est appliqué **côté serveur**, de façon idempotente, et paramétrable en base.
2: Le `trust_score` (FR26) est recalculé à chaque vote, et à l'expiration pour la composante fraîcheur.
3: Les badges (FR25) sont attribués automatiquement et dessinés comme des **badges d'arène originaux**. L'**effet holo** (reflet animé au mouvement ou au survol, neutralisé sous reduced-motion) est réservé aux signalements de trust ≥ 80 et aux badges.
4: Le seuil « signalement à distance » est branché sur la règle de l'epic 2.5.
5: Les tests couvrent chaque ligne du barème et les seuils de badges.

## Story 3.7 Mon compte
As a utilisateur connecté,
I want retrouver mon profil, mes badges, mes signalements et mes favoris,
so that je suis ma contribution.

### Acceptance Criteria
1: Le compte affiche pseudo (modifiable), avatar (choisi parmi des avatars maison), score et badges (avec la progression vers le prochain).
2: Il contient l'historique de mes signalements, avec leur issue (confirmé, contesté, expiré).
3: Il liste mes magasins favoris, avec accès à leur fiche.

---
