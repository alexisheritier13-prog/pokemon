# Epic 2 Carte, magasins et signalement

Donner à l'utilisateur la vue « autour de moi » et la capacité de contribuer. On trouve un magasin sur la carte ou dans la liste, on consulte sa fiche, et on signale un restock en moins de 20 secondes, avec photo. Toutes les règles anti-fake sont appliquées par le serveur.

## Story 2.1 Carte des magasins autour de moi
As a collectionneur,
I want voir sur une carte les magasins autour de moi,
so that je repère où aller.

### Acceptance Criteria
1: La carte MapLibre (tuiles OpenFreeMap, attribution OSM visible) se charge à la demande et affiche les magasins validés en clusters.
2: La position est demandée **après une explication**, au moment de l'action. Sans consentement, un champ ville ou code postal (géocodeur Géoplateforme) centre la carte.
3: Le bouton « autour de moi » recentre la carte sur la position.
4: Le tap sur un marqueur ouvre une feuille d'aperçu (nom, enseigne, distance, statut).
5: En attendant les signalements (epic 2.5), tous les marqueurs sont gris (« rien de récent »). Leur forme se distingue par statut, sans dépendre de la couleur seule.

## Story 2.2 Liste alternative accessible
As a utilisateur au clavier ou au lecteur d'écran,
I want une liste des magasins équivalente à la carte,
so that j'accède à la même information sans carte.

### Acceptance Criteria
1: Une bascule carte/liste est présente et mémorisée.
2: La liste trie les magasins par distance et affiche nom, enseigne, distance et statut (en texte).
3: Elle est entièrement navigable au clavier, avec des libellés ARIA explicites.
4: Une recherche par nom de magasin ou par ville filtre la liste.

## Story 2.3 Onboarding
As a nouvel utilisateur,
I want comprendre l'app et régler ma zone et mes produits en moins d'une minute,
so that je vois tout de suite ce qui me concerne.

### Acceptance Criteria
1: Le concept tient en 3 écrans au plus, avec un ton complice, et chaque écran est passable.
2: L'utilisateur choisit sa position (géolocalisation consentie, ou ville / code postal) et son rayon (15 km par défaut).
3: Il sélectionne ses produits ou types suivis, issus du catalogue en base.
4: Connecté, ses choix sont enregistrés dans son profil (`home_area` **arrondie à ~1 km**). Anonyme, ils sont gardés sur l'appareil puis repris à la connexion.
5: L'onboarding peut être rejoué depuis le compte.

## Story 2.4 Fiche magasin et favoris
As a collectionneur,
I want consulter la fiche d'un magasin et le mettre en favori,
so that j'ai ses infos et je le suis de près.

### Acceptance Criteria
1: La fiche affiche nom, enseigne, adresse et horaires lisibles (ouvert ou fermé maintenant), avec un lien d'itinéraire qui ouvre l'app de navigation native (Apple Plans sur iOS, Google Maps ou geo: sur Android).
2: Un utilisateur connecté peut ajouter ou retirer le magasin de ses favoris.
3: Le passage de l'aperçu à la fiche complète est une transition continue, désactivée sous reduced-motion.
4: La fiche a une URL dédiée et partageable.

## Story 2.5 Créer un signalement : règles serveur
As a porteur de projet,
I want que les règles de signalement soient garanties par le serveur,
so that un client modifié ne peut pas créer de faux signalements.

### Acceptance Criteria
1: Les tables `reports` et `report_products` sont créées avec leur RLS : lecture publique des signalements non masqués, aucune écriture directe.
2: Une fonction serveur crée le signalement. Elle valide les entrées, calcule la distance au magasin et **refuse au-delà de 300 m**, sauf exception « haute réputation » (marquée « signalé à distance »). Elle ne stocke que la distance.
3: Les **rate limits** sont appliqués : 10 par heure et par utilisateur, 1 toutes les 30 minutes par utilisateur et par magasin. Chaque refus renvoie un code et un délai de réessai.
4: `expires_at` vaut la création + 6 h. Un job `pg_cron` (15 min) expire les signalements et met à jour les statistiques jour × heure par magasin.
5: Les marqueurs de carte et la fiche reflètent le **dernier signalement valide** de chaque magasin.
6: Des tests d'intégration couvrent : distance OK / KO, exception réputation, chaque rate limit, expiration, et l'utilisateur banni (préparé pour l'epic 5).

## Story 2.6 Parcours « Signaler »
As a collectionneur en magasin,
I want signaler un restock en moins de 20 secondes,
so that la communauté est prévenue pendant qu'il y a encore du stock.

### Acceptance Criteria
1: Le magasin le plus proche est présélectionné, avec possibilité d'en choisir un autre parmi les proches.
2: Les produits se choisissent en jetons multi-sélection (les produits suivis en premier), avec une quantité estimée facultative.
3: Le statut se choisit en gros boutons. Le prix et le commentaire (≤ 140 caractères) sont facultatifs.
4: À l'envoi, une animation de validation (rebond) affiche « Restock repéré ! ». Les erreurs serveur (distance, fréquence) sont expliquées avec le ton de l'app.
5: Le parcours complet tient en ≤ 20 s lors d'un test chronométré avec 5 utilisateurs ou essais réels, et il est utilisable d'une main.

## Story 2.7 Photo du signalement
As a collectionneur,
I want ajouter une photo de rayon à mon signalement,
so that il est plus crédible et me rapporte de la réputation.

### Acceptance Criteria
1: La photo vient de l'appareil photo ou de la galerie. Elle est compressée côté client en WebP, ou en JPEG sur Safari (≤ 1600 px, plus une vignette de 480 px), et **aucune métadonnée EXIF** n'est conservée (vérifié par un test).
2: Une Edge Function reçoit la photo, vérifie le **type réel** (signature du fichier) et la taille maximale, puis la stocke dans un bucket dédié. Le fichier est rattaché au signalement.
3: L'interface encourage la photo en affichant le bonus de réputation, sans la rendre obligatoire.
4: Un échec d'upload n'empêche pas l'envoi du signalement sans photo, et l'utilisateur est prévenu.
5: Les photos sont **supprimées automatiquement 60 jours** après le signalement (Edge Function `maintenance`, cron nocturne). Le signalement reste visible, sans photo. La durée est paramétrable (`photo_retention_days`).

## Story 2.8 Proposer un magasin manquant
As a collectionneur,
I want proposer un magasin absent de la carte,
so that ma boutique TCG locale soit couverte.

### Acceptance Criteria
1: Le formulaire recueille nom, enseigne (liste fermée, plus « indépendant »), adresse (autocomplétion via le géocodeur Géoplateforme) et ajustement de la position sur la carte.
2: Le magasin est créé « en attente ». Il n'est visible que de son auteur (marqué « en attente ») jusqu'à sa validation.
3: Les doublons évidents (même enseigne à moins de 100 m) sont signalés à l'utilisateur avant l'envoi.

## Story 2.9 Historique et heatmap du magasin, données de démo
As a collectionneur,
I want voir l'historique d'un magasin et ses créneaux de restock habituels,
so that j'anticipe mes passages.

### Acceptance Criteria
1: La fiche liste les signalements passés (date, statut, produits, fiabilité), paginés.
2: Une heatmap jour × heure (Europe/Paris) s'affiche au-delà du seuil de données défini en FR8. En dessous, un état vide explique qu'elle se remplit avec la communauté.
3: La heatmap est lisible en clair et en sombre, avec des valeurs accessibles en texte (tableau alternatif).
4: Un script de **seed de démo** (local uniquement, garde-fou contre la prod) crée quelques magasins réels de la zone et des signalements fictifs répartis dans le temps.

---
