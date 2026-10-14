# Epic 4 Notifications push

Livrer la promesse centrale : être prévenu, au bon moment et seulement pour ce qui compte, sur iPhone installé comme sur Android.

## Story 4.1 Activation des notifications et guide d'installation iOS
As a utilisateur,
I want activer les notifications, y compris sur iPhone,
so that je reçois les alertes même app fermée.

### Acceptance Criteria
1: Un script génère les clés VAPID, documenté dans `.env.example`.
2: L'app détecte **iOS dans Safari, non installée**, et affiche un écran guidé d'installation (Partager → Sur l'écran d'accueil, illustré, sans visuel Apple protégé). La permission n'est demandée qu'une fois l'app installée.
3: La permission est demandée **sur action explicite**, après explication. Un refus est géré avec élégance, avec des instructions pour réactiver.
4: L'abonnement push (endpoint, clés, user agent) est enregistré, un par appareil, avec mise à jour en cas de rotation.
5: L'onboarding (2.3) intègre cette étape à la fin.

## Story 4.2 Préférences d'alerte
As a utilisateur,
I want régler précisément ce qui déclenche une alerte,
so that je ne suis pas dérangé pour rien.

### Acceptance Criteria
1: Les préférences couvrent : rayon, produits ou types, enseignes, « favoris uniquement », heures silencieuses et mode (création ou **1re confirmation par défaut**).
2: Les préférences sont stockées côté serveur, avec RLS.
3: Un résumé lisible des réglages s'affiche (« Displays et ETB, à moins de 15 km, chez Leclerc et Cultura, sauf 22 h – 8 h »).

## Story 4.3 Moteur d'envoi des push
As a utilisateur abonné,
I want être notifié dans la minute d'un restock qui me concerne,
so that j'arrive avant la rupture.

### Acceptance Criteria
1: Un trigger, à la création d'un signalement ou à sa 1re confirmation, appelle l'Edge Function d'envoi via `pg_net`.
2: Le ciblage applique FR29 : rayon sur `home_area`, produits, enseignes, favoris, heures silencieuses en Europe/Paris, mode de déclenchement, auteur exclu, et aucune notification pour un signalement épuisé, contesté ou masqué.
3: Le **dédoublonnage de 2 h par magasin et par utilisateur** est garanti, y compris en cas d'appels concurrents.
4: Les endpoints 404 ou 410 sont supprimés et `last_success_at` est mis à jour.
5: Les envois sont journalisés (compteurs, sans contenu personnel) pour le diagnostic.
6: La notification part en < 60 s.
7: Les tests couvrent la logique de ciblage et le dédoublonnage.

## Story 4.4 Réception et ouverture des notifications
As a utilisateur notifié,
I want une notification claire qui m'emmène direct au signalement,
so that je décide en quelques secondes.

### Acceptance Criteria
1: La notification affiche le statut, le magasin, la distance arrondie, les produits et le ton de l'app (« Restock repéré chez Cultura Avignon ! »), avec l'icône de l'app.
2: Le clic ouvre (ou ramène au premier plan) l'app sur `/r/:id`.
3: Le bouton « Envoyer une notification de test » fonctionne depuis le compte.
4: Une **procédure de test documentée** est exécutée et ses résultats consignés : iPhone (iOS 16.4+) installé, Android Chrome, app fermée, app en arrière-plan et heures silencieuses.

---
