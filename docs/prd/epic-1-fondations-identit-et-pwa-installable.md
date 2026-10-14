# Epic 1 Fondations, identité et PWA installable

Mettre en place un socle de projet sain, déployé automatiquement, qui porte dès le premier jour l'identité visuelle choisie en phase 0 et se comporte comme une vraie app installable. L'epic se termine avec une base de données sécurisée, une authentification complète et les magasins de la zone de lancement importés. On peut déjà se connecter et voir la liste brute des magasins.

## Story 1.1 Socle projet et intégration continue
As a porteur de projet,
I want un projet Vite + React + TypeScript outillé et déployé automatiquement,
so that chaque changement est vérifié et visible en ligne sans manipulation.

### Acceptance Criteria
1: Le projet est initialisé avec Vite, React, TypeScript strict, Tailwind, React Router et TanStack Query, plus ESLint, Prettier et Vitest configurés et passants.
2: Le nom de l'app vient d'une **config unique** (`APP_NAME` et dérivés) utilisée par l'UI et le manifest.
3: Une CI (GitHub Actions) exécute sur chaque push : lint, typecheck, tests, build, puis un **contrôle du budget de bundle initial < 200 ko gzip** qui fait échouer le build en cas de dépassement.
4: Le front est déployé automatiquement sur l'hébergeur retenu, et une page canari affiche le nom de l'app et la version.
5: Un `.env.example` documenté liste toutes les variables attendues.
6: Le footer contient la mention de non-affiliation.

## Story 1.2 Design tokens et page /design
As a porteur de projet,
I want les tokens de la direction visuelle choisie et une page qui présente les composants de base,
so that tout le développement s'appuie sur un système cohérent, validé en clair et en sombre.

### Acceptance Criteria
1: **Prérequis** : la direction visuelle a été choisie par le porteur (livrable phase 0 de l'UX Expert).
2: Un fichier de tokens définit couleurs (clair et sombre), échelle de radius, ombres colorées, espacements, typographie et durées d'animation. Tailwind le consomme, et aucune valeur magique n'apparaît dans les composants.
3: Les polices sont auto-hébergées (sans appel à un CDN tiers, RGPD), avec `font-display: swap`.
4: Les composants de base existent avec tous leurs états : Button (primaire, secondaire, fantôme, enfoncé, désactivé, chargement), Chip de sélection, Badge, Card, champ de formulaire, feuille glissante, toast, squelette de chargement.
5: La page `/design` présente chaque composant et chaque état, avec une bascule clair/sombre. Elle est **exclue du build de production**.
6: Les contrastes AA sont vérifiés pour chaque paire texte/fond des deux thèmes, et `prefers-reduced-motion` neutralise les animations.

## Story 1.3 Coquille d'application et navigation
As a utilisateur mobile,
I want une navigation au pouce entre les grandes sections,
so that je circule dans l'app d'une seule main.

### Acceptance Criteria
1: Une barre d'onglets basse donne accès à Carte, Fil et Compte, avec un bouton central « Signaler » mis en avant. Toutes les cibles font au moins 44 px.
2: Les routes sont définies, et la carte comme l'admin sont **chargées à la demande** (le budget de bundle reste vert).
3: Les zones sûres iOS (encoche, barre d'accueil) sont respectées en mode installé.
4: Une page 404 et un écran d'erreur générique sont conçus avec le ton de l'app. Les erreurs JS non gérées sont journalisées en base (RPC `log_client_error`, limitée en fréquence), sans aucun service tiers.
5: Le mode sombre suit automatiquement le système.

## Story 1.4 PWA installable
As a utilisateur,
I want installer l'app sur mon écran d'accueil iOS ou Android,
so that je l'ouvre comme une app native.

### Acceptance Criteria
1: Le manifest est complet : nom depuis la config, couleurs de thème clair et sombre, `display: standalone`, icônes de 48 à 512 px, icône maskable.
2: Les splash screens iOS sont générés pour les tailles d'iPhone courantes, et les icônes Apple touch sont présentes.
3: Le service worker (stratégie `injectManifest`) met en cache la coquille de l'app. L'app se lance hors ligne sur un écran « hors ligne » maison.
4: Quand une nouvelle version est disponible, un message propose de la recharger.
5: La check-list d'installabilité est vérifiée et documentée : installation testée sur Android Chrome et iOS Safari.

## Story 1.5 Projet Supabase et schéma de base
As a développeur,
I want un schéma de base versionné, sécurisé par RLS et testable en local,
so that les données sont protégées dès la première ligne.

### Acceptance Criteria
1: La CLI Supabase est configurée pour un environnement local. Les migrations versionnées activent PostGIS et créent `profiles`, `user_settings` (zone arrondie à ~1 km par trigger), `alert_preferences`, `games`, `brands`, `products`, `stores` (avec `location geography(Point)`, `osm_ref` unique, statut de validation) et `store_favorites`, ainsi que la configuration `private.app_config` (voir l'architecture, migrations 0001 à 0004).
2: La RLS est activée sur chaque table : lecture publique des magasins validés et des produits actifs, écriture limitée à ses propres données, et opérations admin réservées à un rôle.
3: Les types TypeScript sont générés depuis le schéma.
4: Des tests d'intégration vérifient les policies (anonyme, utilisateur, autre utilisateur, admin).
5: Une **requête de recherche par rayon** (magasins à moins de X km d'un point) existe et est testée.
6: Le workflow CI d'intégration (`supabase start` → migrations → tests Vitest d'intégration → contrôle que les types générés sont à jour) tourne sur chaque push.

## Story 1.6 Authentification et profil
As a visiteur,
I want me connecter par magic link, Google ou Apple,
so that je peux contribuer à la communauté.

### Acceptance Criteria
1: Les trois connexions fonctionnent : magic link e-mail, Google et Apple.
2: À la première connexion, un profil est créé avec un pseudo unique suggéré, modifiable avec validation d'unicité.
3: Le visiteur anonyme accède à la carte, au fil et aux fiches. Une action réservée (signaler, voter, favori) l'invite à se connecter puis le ramène à son action.
4: L'utilisateur peut se déconnecter.
5: Le **spike `web-push` sous Deno** est réalisé dans une Edge Function de test, et son résultat est consigné. En cas d'échec, l'alerte est remontée au porteur.
6: Dans l'app installée (PWA standalone), l'écran de connexion propose la **saisie du code à 6 chiffres** reçu par e-mail, en plus du lien (sur iOS, le lien s'ouvre dans Safari et non dans l'app).
7: Une procédure documentée (SQL) permet de promouvoir le compte du porteur au rôle `admin`.
8: **SMTP reporté (décision du porteur) :** en local, les e-mails sont lus dans Mailpit. En production, l'expéditeur par défaut de Supabase ne livre qu'aux membres de l'équipe, ce qui suffit pour les tests du porteur. Le SMTP (Resend) est **bloquant avant l'ouverture publique** (story 6.4).

## Story 1.7 Import des magasins OSM et catalogue initial
As a porteur de projet,
I want les magasins pertinents du 84 et du 13 et un catalogue de produits de départ,
so that l'app est utile dès son ouverture.

### Acceptance Criteria
1: Un script interroge Overpass sur les départements configurés (84 et 13), avec une liste paramétrable de départements.
2: Il cible les catégories : grandes surfaces, jouets, culture, jeux vidéo et boutiques de jeux.
3: Les enseignes sont normalisées (Leclerc, Carrefour, Auchan, Intermarché, Cultura, Fnac, Micromania, JouéClub, King Jouet, indépendant…).
4: L'import est **idempotent** : ré-exécuté, il met à jour par `osm_id` sans créer de doublon. Un rapport (créés, mis à jour, ignorés) est affiché.
5: Adresse, ville, code postal et horaires (`opening_hours`) sont repris quand OSM les fournit.
6: Un seed de catalogue crée le jeu « Pokémon » et des produits génériques, sans aucun visuel officiel.

---
