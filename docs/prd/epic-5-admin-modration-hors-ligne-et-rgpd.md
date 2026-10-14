# Epic 5 Admin, modération, hors-ligne et RGPD

Rendre l'app exploitable et sûre avant l'ouverture publique : le porteur gère le catalogue, les magasins et les abus. L'app tient sans réseau, et chaque utilisateur maîtrise ses données.

## Story 5.1 Espace admin et catalogue produits
As a admin,
I want gérer le catalogue de produits,
so that il suit les sorties sans redéploiement.

### Acceptance Criteria
1: Les routes `/admin` sont réservées au rôle admin, contrôlé **côté serveur** par RLS et RPC (pas seulement masquées dans l'UI), et chargées à la demande.
2: Le catalogue s'édite en CRUD : jeu, nom, type, extension, ordre, image facultative uploadée (contrôle de type et de taille), et activation ou désactivation. Un produit désactivé disparaît des sélections sans casser l'historique.
3: Un panneau **« Santé »** affiche les derniers passages des tâches planifiées, les statistiques push sur 24 h, les KPIs du brief et l'occupation de la base et du stockage par rapport aux limites gratuites.

## Story 5.2 Validation des magasins proposés
As a admin,
I want valider ou refuser les magasins proposés et corriger les fiches,
so that la carte reste juste.

### Acceptance Criteria
1: La file des magasins en attente affiche la carte et signale les doublons potentiels.
2: Trois actions sont possibles : valider, refuser (avec motif) ou modifier puis valider.
3: L'admin peut éditer tout magasin (horaires, enseigne, position) et le désactiver.

## Story 5.3 Signalement d'abus, modération et bannissement
As a admin,
I want traiter les abus signalés par la communauté,
so that les fausses infos et les contenus inappropriés disparaissent vite.

### Acceptance Criteria
1: Un utilisateur connecté signale un abus sur un signalement ou une photo, avec un motif (faux, photo inappropriée, spam, autre). Il ne peut le faire qu'une fois par élément.
2: La file de modération, triée par nombre de signalements d'abus, permet de **masquer** un signalement ou une photo, ou de rejeter le signalement d'abus. Le masquage applique la pénalité de réputation (FR24).
3: Le **bannissement** empêche toute écriture (garanti côté serveur) et masque les signalements actifs de l'utilisateur. Il est réversible.
4: Toutes les actions de modération sont journalisées (qui, quoi, quand).

## Story 5.4 Mode hors ligne
As a collectionneur en magasin avec un mauvais réseau,
I want consulter les derniers signalements et signaler quand même,
so that l'app reste utile au fond d'un hypermarché.

### Acceptance Criteria
1: Les derniers signalements et fiches consultés sont disponibles hors ligne, avec un bandeau « hors ligne » et l'heure de dernière mise à jour.
2: Un signalement créé hors ligne est mis en file avec la position et l'heure capturées, puis envoyé au retour du réseau par Background Sync quand le navigateur le permet. Sinon, un bouton « Envoyer maintenant » est proposé (iOS, Firefox).
3: La règle de délai de FR41 est appliquée côté serveur, et l'utilisateur est informé du résultat de l'envoi différé.
4: La photo d'un signalement en file est conservée localement jusqu'à l'envoi.

## Story 5.5 Export et suppression du compte
As a utilisateur,
I want récupérer ou supprimer mes données moi-même,
so that j'exerce mes droits RGPD sans rien demander à personne.

### Acceptance Criteria
1: L'**export** télécharge un JSON complet : profil, préférences, favoris, signalements, votes, abonnements push (sans les clés).
2: La **suppression** (double confirmation) applique FR36 : les données personnelles et les photos sont supprimées, les signalements anonymisés et la session fermée.
3: Les deux opérations passent par le serveur et sont testées.

## Story 5.6 Pages légales et consentements
As a utilisateur,
I want comprendre comment mes données sont utilisées,
so that je fais confiance à l'app.

### Acceptance Criteria
1: Les pages mentions légales, politique de confidentialité et CGU (avec mention de non-affiliation) sont rédigées en français clair et accessibles depuis le footer et le compte.
2: Le consentement à la géolocalisation est explicite et révocable. La politique explique l'arrondi de la position et l'absence de tracker tiers.
3: Aucun cookie non essentiel n'est posé, donc il n'y a pas besoin de bannière cookies, et cela est expliqué dans la politique.
4: Les champs à compléter par le porteur (éditeur, hébergeur, contact) sont clairement identifiés.

---
