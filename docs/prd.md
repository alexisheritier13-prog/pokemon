# RestockRadar Product Requirements Document (PRD)

> Agent : PM (John) — BMAD v4.33 — mode YOLO, v0.1 du 2026-10-14
> Entrées : [`docs/brief.md`](brief.md) (v0.2, décisions du porteur incluses) et [`docs/input/initial-prompt.md`](input/initial-prompt.md) (référence détaillée, notamment pour la direction artistique).
> Les éléments marqués **[VALIDÉ]** sont des choix du PM à valider par le porteur.

## Goals and Background Context

### Goals
- Permettre à un collectionneur du 84 ou du 13 de savoir en temps réel **où trouver des produits Pokémon TCG en magasin physique**, près de chez lui.
- Recevoir **uniquement les alertes pertinentes** (rayon, produits, enseignes, heures) sur iOS et Android, sans passer par un store.
- Garantir une **information fiable** grâce à la présence sur place vérifiée, aux photos, aux votes et à la réputation.
- Signaler un restock en **20 secondes ou moins**, d'une main.
- Constituer un **historique daté par magasin**, socle de la prédiction V2.
- Offrir une identité visuelle **chaleureuse et signée**, évocatrice de la culture TCG, sans aucun asset officiel.
- Tenir un coût d'hébergement **≈ 0 €/mois** et une conformité **RGPD** complète dès la V1.

### Background Context
Les produits Pokémon TCG sont en tension permanente depuis 2020. En grande surface ou chez les spécialistes, un réassort disparaît en quelques heures. Les outils existants suivent le stock **en ligne** (scraping) ou diffusent une info **nationale, non vérifiée et bruyante** via Discord. Personne n'exploite la dimension locale et physique, ni ne capitalise l'historique d'un magasin.

RestockRadar est une PWA communautaire : on voit ce qui est en rayon autour de soi, on signale sur place, la communauté valide, et les alertes push ne remontent que ce qui compte pour soi. Le lancement se fait sur deux départements pour atteindre une densité locale suffisante avant d'étendre au reste de la France.

### Change Log
| Date | Version | Description | Author |
|---|---|---|---|
| 2026-10-14 | 0.1 | Première version issue du brief v0.2 | PM (John) |
| 2026-10-14 | 0.2 | Propositions validées en bloc par le porteur | PM (John) |
| 2026-10-14 | 0.4 | Corrections PO : stories 1.3, 1.5, 1.6, 2.7, 5.1, 6.4 (tables de réglages, admin, OTP, SMTP reporté, purge photos, Santé, CI intégration) | PO (Sarah) |
| 2026-10-14 | 0.3 | Écarts techniques de l'architecte : géocodeur Géoplateforme, JPEG sur Safari, vignette client | PM (John) |

## Requirements

### Functional

**Consultation et compte**
- **FR1 :** La carte, le fil des signalements, les fiches magasin et le détail d'un signalement sont consultables **sans compte**. Signaler, voter, mettre en favori, proposer un magasin, signaler un abus et recevoir des alertes exigent d'être connecté.
- **FR2 :** L'utilisateur s'authentifie par **magic link e-mail**, **Google** ou **Apple**. À la première connexion, un profil est créé avec un **pseudo unique** (suggéré, modifiable).
- **FR3 :** L'onboarding présente le concept en **3 écrans maximum**. Il demande ensuite la position (consentement explicite, avec un repli par ville ou code postal), le rayon d'alerte (15 km par défaut) et les produits ou types suivis. Il est passable et peut être rejoué depuis le compte.
- **FR4 :** La position de référence (`home_area`) n'est **jamais stockée à plus de ~1 km de précision**. La position précise sert seulement à la volée : affichage local, calcul de distance au moment d'un signalement ou d'un vote.

**Magasins**
- **FR5 :** Les magasins des départements 84 et 13 sont importés depuis l'API Overpass d'OSM (grandes surfaces, jouets, culture, jeux vidéo, boutiques de jeux), dédoublonnés par `osm_id`. L'import est **ré-exécutable sans créer de doublons**.
- **FR6 :** La carte (MapLibre, tuiles OSM gratuites) affiche les magasins autour de l'utilisateur, regroupés en clusters. Chaque marqueur porte la couleur du statut du **dernier signalement encore valide** : vert = en stock, orange = stock faible, rouge = épuisé confirmé, gris = rien de récent. Le statut « restock annoncé » a son propre marqueur. Un bouton « autour de moi » recentre la carte.
- **FR7 :** Une **liste alternative** à la carte, accessible au clavier et aux lecteurs d'écran, présente les mêmes magasins triés par distance, avec leur statut.
- **FR8 :** La fiche magasin affiche nom, enseigne, adresse, horaires, un **lien d'itinéraire** vers l'app de navigation native, un bouton favori, l'**historique** des signalements et une **heatmap jour × heure** des restocks constatés. La heatmap n'apparaît qu'au-delà d'un seuil de données **[VALIDÉ : ≥ 8 signalements « en stock » ou « stock faible » sur 90 jours]**.
- **FR9 :** Un utilisateur connecté peut **proposer un magasin manquant** (nom, enseigne, adresse, position sur la carte). Le magasin reste invisible des autres utilisateurs jusqu'à sa validation par un admin.

**Signalements**
- **FR10 :** Un signalement porte un magasin, un ou plusieurs produits (avec une quantité estimée facultative), un statut (`in_stock` | `low_stock` | `out_of_stock` | `restock_incoming`), un prix constaté facultatif, une photo facultative mais encouragée, et un commentaire court facultatif (≤ 140 caractères).
- **FR11 :** Le parcours de signalement présélectionne le magasin le plus proche selon la position et vise un **temps médian ≤ 20 s**.
- **FR12 :** Le serveur **refuse** tout signalement fait à plus de 300 m du magasin et ne stocke que la distance (`reporter_distance_m`), jamais les coordonnées. Exception : un utilisateur au-dessus du seuil de réputation « signalement à distance » peut signaler de plus loin. Son signalement porte alors le marqueur visible « signalé à distance ».
- **FR13 :** Limites appliquées par le serveur : **10 signalements par heure** et par utilisateur, **1 signalement toutes les 30 minutes** par utilisateur et par magasin. Un refus affiche un message explicite indiquant quand réessayer.
- **FR14 :** Un signalement expire par défaut **6 h** après sa création. Un job planifié toutes les 15 minutes expire les signalements et recalcule les statistiques des magasins.
- **FR15 :** La photo est redimensionnée côté client (≤ 1600 px, WebP, ou JPEG sur Safari qui ne sait pas encoder le WebP), avec une vignette de 480 px, sans **aucune métadonnée EXIF**. Le serveur vérifie le type réel et la taille avant stockage. Un signalement avec photo rapporte un bonus de réputation.

**Fil et détail**
- **FR16 :** Le fil liste en temps réel, du plus récent au plus ancien, les signalements valides dans le rayon de l'utilisateur. Sans compte ni position, il se cale sur le rayon par défaut autour de la ville saisie, ou sur la zone de lancement.
- **FR17 :** Filtres du fil : produits ou types, enseignes, fraîcheur (< 1 h, < 3 h, < 6 h). Les filtres sont mémorisés sur l'appareil.
- **FR18 :** Chaque carte de signalement montre : magasin, distance, produits, ancienneté relative (« il y a 12 min »), vignette photo, nombre de confirmations, badge de fiabilité, et le marqueur « signalé à distance » le cas échéant.
- **FR19 :** Chaque signalement a une **URL dédiée et partageable** (cible des notifications push).

**Votes**
- **FR20 :** Un utilisateur connecté vote « Confirmé », « Faux » ou « Plus rien » sur un signalement encore valide qui n'est pas le sien. Il a **un seul vote par signalement**, modifiable.
- **FR21 :** **Tout vote exige d'être à ≤ 300 m du magasin**, vérifié par le serveur. **[VALIDÉ : l'exception « haute réputation » ne s'applique pas aux votes.]**
- **FR22 :** « Plus rien » passe le signalement en **épuisé** et coupe toute nouvelle notification le concernant. **[VALIDÉ : un seul vote suffit si le votant est au moins « Fiable », sinon il en faut deux de votants distincts.]**
- **FR23 :** Un signalement dont les « Faux » dépassent les « Confirmé » (avec au moins 2 « Faux ») est marqué **« contesté »**. Il est désaccentué dans le fil et ne déclenche plus de notification.

**Réputation**
- **FR24 :** Chaque profil a un `reputation_score` calculé exclusivement côté serveur. **[VALIDÉ — barème paramétrable en base]** :
  - +3 la première fois qu'un signalement de l'auteur est confirmé, puis +1 par confirmation supplémentaire, plafonné à +6 par signalement ;
  - +1 pour un signalement avec photo, non contesté à son expiration ;
  - +1 pour un vote cohérent avec l'issue finale du signalement ;
  - −4 pour un signalement contesté ;
  - −10 pour un signalement ou une photo retiré par la modération ;
  - le score ne descend pas sous 0.
- **FR25 :** Badges affichés sur le profil et les cartes. **[VALIDÉ]** :
  - **Nouveau** : moins de 10 pts ;
  - **Fiable** : ≥ 30 pts et au moins 80 % de signalements non contestés ;
  - **Éclaireur** : ≥ 10 signalements confirmés comme premier du jour dans un magasin ;
  - **Vétéran** : ≥ 150 pts.

  Le seuil « signalement à distance » est fixé à ≥ 150 pts et au moins 90 % de signalements non contestés.
- **FR26 :** Chaque signalement a un `trust_score` (0 à 100) qui combine la réputation de l'auteur, la présence d'une photo, les votes et la fraîcheur. Il pilote le badge de fiabilité (« rareté ») de la carte. L'**effet holo** est réservé aux signalements au-dessus d'un seuil élevé **[VALIDÉ : ≥ 80]** et aux badges de réputation.

**Notifications push**
- **FR27 :** L'utilisateur active les notifications Web Push (VAPID). Sur **iOS dans Safari non installé**, l'app affiche d'abord un **écran guidé d'installation** (Partager → Sur l'écran d'accueil) et ne demande la permission qu'une fois l'app installée. La permission n'est jamais demandée sans action explicite de l'utilisateur.
- **FR28 :** Préférences d'alerte :
  - rayon ;
  - produits ou types ;
  - enseignes ;
  - « magasins favoris uniquement » ;
  - heures silencieuses (fuseau Europe/Paris) ;
  - **mode de déclenchement**, soit à la création, soit à la **1re confirmation** (**défaut**).
- **FR29 :** Une notification part quand un signalement correspond aux préférences de l'utilisateur : sa `home_area` est dans le rayon, les produits et l'enseigne correspondent, on est hors heures silencieuses, et le statut vaut `in_stock`, `low_stock` ou `restock_incoming`. Elle ne part jamais vers l'auteur du signalement.
- **FR30 :** **Dédoublonnage** : un utilisateur ne reçoit pas deux notifications pour le même magasin en moins de 2 h.
- **FR31 :** Le clic sur une notification ouvre directement le détail du signalement.
- **FR32 :** Les abonnements push dont l'endpoint répond 404 ou 410 sont supprimés automatiquement. Chaque envoi réussi met à jour `last_success_at`.
- **FR33 :** Un bouton « Envoyer une notification de test » est disponible dans le compte.

**Compte et RGPD**
- **FR34 :** Le compte permet de gérer le pseudo, l'avatar (choisi parmi des avatars maison, sans upload en V1 **[VALIDÉ]**), les préférences d'alerte, les magasins favoris, et de voir l'historique de ses signalements, son score et ses badges.
- **FR35 :** **Export** en self-service de toutes ses données au format JSON.
- **FR36 :** **Suppression** du compte en self-service : profil, préférences, abonnements push, votes et photos sont supprimés. Les signalements passés sont anonymisés (auteur retiré) pour préserver l'historique des magasins.
- **FR37 :** Les pages légales sont accessibles depuis le footer et le compte : mentions légales, politique de confidentialité, CGU. La **mention de non-affiliation** à Nintendo, The Pokémon Company et Creatures figure dans le footer et les CGU.

**Modération et admin**
- **FR38 :** Un utilisateur connecté peut **signaler un abus** sur un signalement ou une photo, avec un motif.
- **FR39 :** L'espace **admin**, réservé à un rôle et chargé à la demande, permet :
  - de gérer le **catalogue produits** (CRUD, notion de « jeu » pour l'extension future à d'autres TCG, image facultative sans visuel officiel, activation et désactivation) ;
  - de **valider, refuser ou modifier** les magasins proposés ;
  - de traiter la **file de modération** : masquer un signalement ou une photo, rejeter un signalement d'abus ;
  - de **bannir** un utilisateur. Un utilisateur banni ne peut plus écrire et ses signalements actifs sont masqués.

**Hors ligne**
- **FR40 :** La coquille de l'app et les derniers signalements consultés restent disponibles hors ligne, avec un indicateur visible.
- **FR41 :** Un signalement créé hors ligne est mis en **file d'attente** avec la position et l'heure capturées à sa création, puis envoyé au retour du réseau (Background Sync, ou bouton « Envoyer maintenant » sur iOS et Firefox). **[VALIDÉ : le serveur accepte la distance capturée si le délai entre capture et envoi est ≤ 2 h. Au-delà, le signalement est refusé et l'utilisateur prévenu.]**

### Non Functional
- **NFR1 :** **PWA installable** sur iOS 16.4+ et Android : manifest complet, service worker, icônes de toutes tailles, splash screens iOS. L'installabilité est vérifiée par une check-list (Lighthouse n'a plus de catégorie PWA).
- **NFR2 :** **Lighthouse ≥ 90** en Performance, Accessibilité et Best Practices, sur mobile, pour les pages Carte, Fil et Fiche magasin.
- **NFR3 :** **Bundle JS initial < 200 ko gzip**. La carte et l'admin sont chargés à la demande. Le budget est **vérifié en CI dès la première story**.
- **NFR4 :** **Mobile-first** : cibles tactiles ≥ 44 px, actions principales atteignables au pouce, mode sombre automatique (`prefers-color-scheme`) conçu et non simplement inversé.
- **NFR5 :** **Accessibilité WCAG 2.2 AA** : navigation clavier, labels ARIA, contrastes AA dans les deux thèmes, respect de `prefers-reduced-motion`, liste alternative à la carte.
- **NFR6 :** **Sécurité** : toutes les règles métier (distance, rate limits, unicité des votes, réputation, `trust_score`, bannissement) sont appliquées **côté serveur**, par fonctions Postgres ou Edge Functions. **RLS stricte** sur toutes les tables. Validation **Zod** des entrées côté client et dans les Edge Functions. Aucun secret dans le bundle.
- **NFR7 :** **RGPD** : consentement explicite à la géolocalisation, position arrondie, **aucun tracker ni analytics tiers**, export et suppression en self-service, minimisation des données. Les mesures produit (KPIs) passent par des agrégats en base.
- **NFR8 :** **Propriété intellectuelle** : aucun logo, sprite, illustration, police ou visuel officiel Pokémon, Nintendo ou The Pokémon Company. La marque n'apparaît que de façon descriptive.
- **NFR9 :** **Coût** : fonctionnement dans les offres gratuites (Supabase Free, Vercel ou Netlify Hobby, OpenFreeMap). Toute dépendance payante (hors compte Apple Developer, accepté) doit être signalée.
- **NFR10 :** **Pas de scraping** : toutes les données de stock viennent de la communauté. Les données magasins viennent d'OSM (licence ODbL, attribution affichée sur la carte).
- **NFR11 :** **Fraîcheur temps réel** : un nouveau signalement apparaît dans le fil des clients connectés en **< 5 s**. La notification push part en **< 60 s** après l'événement déclencheur.
- **NFR12 :** **Extensibilité géographique** : l'ajout d'un département se fait par configuration et import, sans changement de code ni de schéma.
- **NFR13 :** **Renommage** : le nom de l'app est centralisé dans une constante ou une config unique (UI, manifest, e-mails).
- **NFR14 :** **Langue** : interface en français, code et commentaires en anglais. Les textes de l'interface sont centralisés pour faciliter le travail de ton.
- **NFR15 :** **Qualité** : ESLint, Prettier, typecheck strict, tests Vitest sur la logique métier (y compris les fonctions SQL via des tests d'intégration sur base locale) et 3 ou 4 parcours Playwright, le tout exécuté en CI.
- **NFR16 :** **Fuseau** : toutes les règles horaires (heures silencieuses, heatmap, expiration affichée) utilisent Europe/Paris.

## User Interface Design Goals

### Overall UX Vision
Une app de poche qu'on dégaine au rayon et qu'on consulte avant de prendre la voiture. **Ludique mais lisible** : on doit sentir l'univers « collection et aventure », avec des formes généreuses, des boutons qu'on a envie de presser et des cartes de signalement qui rappellent les cartes à collectionner. La lecture d'une info doit rester **immédiate** : statut, magasin, distance, fraîcheur et fiabilité en un coup d'œil. Le ton est complice (« Restock repéré ! », « Fausse piste »), jamais lourd. La direction artistique détaillée (contraintes, à-éviter, composants signature) est dans le prompt source et sera instanciée par l'UX Expert en phase 0.

### Key Interaction Paradigms
- **Barre d'onglets basse** à 3 entrées (Carte, **bouton central « Signaler »**, Fil), tenue au pouce ; **Compte en avatar** en haut à droite.
- **Carte ↔ fiche** : un tap sur un marqueur ouvre une **feuille glissante** (aperçu), qu'on tire pour la fiche complète, avec une transition continue.
- **Signalement en 3 temps**, sur un seul écran progressif : magasin présélectionné, produits en jetons multi-sélection, statut en gros boutons. Photo et commentaire viennent en option, puis l'envoi déclenche un rebond de validation.
- **Vote en un tap** depuis la carte de signalement, avec une célébration discrète quand on confirme.
- **Temps réel non intrusif** : une pastille « 3 nouveaux signalements » en haut du fil, plutôt qu'un saut de liste.
- **Permissions contextuelles** : position et notifications demandées au moment où elles prennent sens, jamais d'office.

### Core Screens and Views
1. Onboarding (concept, position et rayon, produits suivis)
2. Guide d'installation iOS et activation des notifications
3. Carte (avec liste alternative)
4. Feuille d'aperçu magasin et fiche magasin complète (historique, heatmap)
5. Fil d'alertes (avec filtres)
6. Détail d'un signalement (votes, photo plein écran, signaler un abus)
7. Parcours « Signaler »
8. Proposer un magasin
9. Connexion (magic link, Google, Apple)
10. Compte (profil, badges, mes signalements, favoris, préférences d'alerte, export et suppression)
11. Pages légales
12. Admin (catalogue, magasins proposés, modération, utilisateurs)
13. Page `/design` (dev uniquement)
14. États vides, de chargement, hors ligne et d'erreur, conçus comme des écrans à part entière

### Accessibility: WCAG AA
WCAG 2.2 AA, avec la carte doublée d'une liste, les statuts jamais portés par la couleur seule (forme et icône du marqueur, libellé texte) et les animations neutralisées sous `prefers-reduced-motion`.

### Branding
- Pas de marque existante : identité à créer en phase 0 (veille, moodboard commenté, 2 ou 3 style tiles, choix du porteur).
- Pistes imposées par le porteur :
  - rouge chaud parcimonieux pour l'action et les alertes, jaune électrique pour les accents et célébrations ;
  - fond crème ou papier, encre bleu nuit ;
  - palette secondaire désaturée inspirée des types ;
  - mode sombre « exploration de nuit » ;
  - titres arrondis avec du caractère (pas « tout Inter ») ;
  - un seul set d'icônes arrondies (Phosphor ou Lucide), aucun emoji comme icône.
- Interdits : dégradés violet-bleu, glassmorphism généralisé, blobs flous, look shadcn par défaut, et tout élément reconnaissable de la marque Pokémon (Poké Ball, sprites, police).
- Tokens (couleurs, radius en échelle 10 / 16 / 24 / 32 / pill, ombres colorées, espacements, typographie, durées) consommés par Tailwind, sans valeur magique.

### Target Device and Platforms: Web Responsive
Mobile en priorité (iPhone et Android, de 360 à 430 px de large). Tablette et desktop sont supportés en mise en page élargie, sans être optimisés en V1.

## Technical Assumptions

### Repository Structure: Monorepo
Un seul dépôt : front Vite à la racine (`src/`), `supabase/` (migrations, fonctions, seed, tests SQL) et `scripts/` (import OSM, génération VAPID, seed démo). Pas de workspaces npm au départ.

### Service Architecture
**Serverless** autour de Supabase :
- un client React lourd (SPA statique) ;
- la logique métier en **fonctions Postgres** (RPC `SECURITY DEFINER` : création de signalement, vote, calcul de réputation et de `trust_score`, contrôles de distance et de fréquence) ;
- des **Edge Functions Deno** pour ce qui sort de la base : envoi des push, upload et vérification des photos, export et suppression de compte, notification de modération ;
- les déclencheurs push partent d'un **trigger Postgres** (`pg_net`) vers l'Edge Function d'envoi ;
- `pg_cron` pour l'expiration et les statistiques ;
- Realtime (Postgres Changes) pour le fil, avec un filtrage géographique côté client sur la zone de lancement.

### Testing Requirements
**Unit + Integration + E2E ciblé** :
- Vitest pour la logique pure (trust score, formatage, filtres, compression photo) ;
- tests d'intégration des RPC et des policies RLS sur une base Supabase locale (`supabase start`) ;
- Playwright pour 4 parcours critiques : consultation anonyme carte → fiche, signalement complet, vote, onboarding avec préférences d'alerte ;
- une **procédure manuelle documentée** pour les push sur iPhone installé et sur Android.

Chaque epic ajoute ses tests au fil de l'eau. L'epic 6 ne fait que consolider.

### Additional Technical Assumptions and Requests
- **Stack imposée par le porteur** (non négociable sans son accord) :
  - Vite, React, TypeScript, Tailwind CSS, `vite-plugin-pwa` (Workbox), React Router, TanStack Query ;
  - MapLibre GL JS et OpenFreeMap ;
  - Supabase : Postgres + PostGIS, Auth (magic link, Google, Apple), Storage, Realtime, Edge Functions, `pg_cron` ;
  - librairie `web-push` ;
  - Zod, ESLint, Prettier, Vitest, Playwright.
- **À trancher à l'étape Architecture** : version de Tailwind (v3 ou v4) et hébergeur front (Vercel ou Netlify).
- **Spike obligatoire en phase 1** : `web-push` dans une Edge Function Deno. En cas d'échec, retour vers le porteur avant tout changement de librairie.
- **Géocodage de repli** (ville ou code postal) : **géocodeur de la Géoplateforme IGN (`data.geopf.fr/geocodage`)**, successeur de l'API Adresse décommissionnée fin janvier 2026, gratuit et sans clé. **[VALIDÉ, mis à jour par l'architecte]**
- **Horaires** : format `opening_hours` d'OSM, parsé côté client, et modifiable par l'admin.
- **Catalogue** : tables `games` et `products` (la notion de jeu existe dès la V1 pour préparer One Piece, Lorcana et Magic). Seed initial d'une trentaine de produits Pokémon génériques, sans visuel.
- **Schéma prêt pour la V2** : la table de statistiques par magasin (agrégats jour × heure) est alimentée dès la V1 par le job `pg_cron`. Elle sert la heatmap et servira la prédiction.
- **Service worker unique** : Workbox (precache, runtime cache) plus les handlers `push`, `notificationclick` et `sync`, via la stratégie `injectManifest`.
- **Environnements** : un projet Supabase local (CLI) pour le développement et un projet Supabase cloud pour la prod. Seed démo **uniquement en local**.
- **Attribution OSM et OpenFreeMap** affichée sur la carte (exigence de licence).

## Epic List

Les epics suivent les phases 1 à 6 du prompt source. La phase 0 (veille, moodboard et choix de la direction visuelle) est un **livrable de l'UX Expert**, prérequis de la story 1.2. Elle n'est donc pas un epic de développement. Les tests, l'accessibilité et le budget de performance sont transverses : ils courent dans chaque epic, et l'epic 6 consolide.

1. **Epic 1 — Fondations, identité et PWA installable** : un socle déployé en continu, avec les tokens de design, la page `/design`, une coquille PWA installable, le schéma de base, l'authentification et les magasins du 84 et du 13 importés.
2. **Epic 2 — Carte, magasins et signalement** : trouver un magasin sur la carte ou en liste, consulter sa fiche, et signaler un restock avec photo sous garde-fous serveur.
3. **Epic 3 — Fil temps réel, votes et réputation** : suivre les signalements en direct, voter sur place, et faire émerger la fiabilité (trust score, badges, holo).
4. **Epic 4 — Notifications push** : recevoir des alertes filtrées de bout en bout sur iOS installé et Android.
5. **Epic 5 — Admin, modération, hors-ligne et RGPD** : exploiter et protéger la communauté, fonctionner sans réseau, et être conforme avant l'ouverture publique.
6. **Epic 6 — Qualité de lancement** : atteindre les objectifs Lighthouse, consolider les tests E2E et documenter le déploiement.

---

## Epic 1 Fondations, identité et PWA installable

Mettre en place un socle de projet sain, déployé automatiquement, qui porte dès le premier jour l'identité visuelle choisie en phase 0 et se comporte comme une vraie app installable. L'epic se termine avec une base de données sécurisée, une authentification complète et les magasins de la zone de lancement importés. On peut déjà se connecter et voir la liste brute des magasins.

### Story 1.1 Socle projet et intégration continue
As a porteur de projet,
I want un projet Vite + React + TypeScript outillé et déployé automatiquement,
so that chaque changement est vérifié et visible en ligne sans manipulation.

#### Acceptance Criteria
1: Le projet est initialisé avec Vite, React, TypeScript strict, Tailwind, React Router et TanStack Query, plus ESLint, Prettier et Vitest configurés et passants.
2: Le nom de l'app vient d'une **config unique** (`APP_NAME` et dérivés) utilisée par l'UI et le manifest.
3: Une CI (GitHub Actions) exécute sur chaque push : lint, typecheck, tests, build, puis un **contrôle du budget de bundle initial < 200 ko gzip** qui fait échouer le build en cas de dépassement.
4: Le front est déployé automatiquement sur l'hébergeur retenu, et une page canari affiche le nom de l'app et la version.
5: Un `.env.example` documenté liste toutes les variables attendues.
6: Le footer contient la mention de non-affiliation.

### Story 1.2 Design tokens et page /design
As a porteur de projet,
I want les tokens de la direction visuelle choisie et une page qui présente les composants de base,
so that tout le développement s'appuie sur un système cohérent, validé en clair et en sombre.

#### Acceptance Criteria
1: **Prérequis** : la direction visuelle a été choisie par le porteur (livrable phase 0 de l'UX Expert).
2: Un fichier de tokens définit couleurs (clair et sombre), échelle de radius, ombres colorées, espacements, typographie et durées d'animation. Tailwind le consomme, et aucune valeur magique n'apparaît dans les composants.
3: Les polices sont auto-hébergées (sans appel à un CDN tiers, RGPD), avec `font-display: swap`.
4: Les composants de base existent avec tous leurs états : Button (primaire, secondaire, fantôme, enfoncé, désactivé, chargement), Chip de sélection, Badge, Card, champ de formulaire, feuille glissante, toast, squelette de chargement.
5: La page `/design` présente chaque composant et chaque état, avec une bascule clair/sombre. Elle est **exclue du build de production**.
6: Les contrastes AA sont vérifiés pour chaque paire texte/fond des deux thèmes, et `prefers-reduced-motion` neutralise les animations.

### Story 1.3 Coquille d'application et navigation
As a utilisateur mobile,
I want une navigation au pouce entre les grandes sections,
so that je circule dans l'app d'une seule main.

#### Acceptance Criteria
1: Une barre d'onglets basse donne accès à Carte et Fil, avec un bouton central « Signaler » mis en avant ; le Compte est un avatar en haut à droite (rail complet sur ordinateur). Toutes les cibles font au moins 44 px. *(Décision du porteur du 2026-10-14 : 3 onglets + avatar, pour que Signaler soit centré.)*
2: Les routes sont définies, et la carte comme l'admin sont **chargées à la demande** (le budget de bundle reste vert).
3: Les zones sûres iOS (encoche, barre d'accueil) sont respectées en mode installé.
4: Une page 404 et un écran d'erreur générique sont conçus avec le ton de l'app. Les erreurs JS non gérées sont journalisées en base (RPC `log_client_error`, limitée en fréquence), sans aucun service tiers.
5: Le mode sombre suit automatiquement le système.

### Story 1.4 PWA installable
As a utilisateur,
I want installer l'app sur mon écran d'accueil iOS ou Android,
so that je l'ouvre comme une app native.

#### Acceptance Criteria
1: Le manifest est complet : nom depuis la config, couleurs de thème clair et sombre, `display: standalone`, icônes de 48 à 512 px, icône maskable.
2: Les splash screens iOS sont générés pour les tailles d'iPhone courantes, et les icônes Apple touch sont présentes.
3: Le service worker (stratégie `injectManifest`) met en cache la coquille de l'app. L'app se lance hors ligne sur un écran « hors ligne » maison.
4: Quand une nouvelle version est disponible, un message propose de la recharger.
5: La check-list d'installabilité est vérifiée et documentée : installation testée sur Android Chrome et iOS Safari.

### Story 1.5 Projet Supabase et schéma de base
As a développeur,
I want un schéma de base versionné, sécurisé par RLS et testable en local,
so that les données sont protégées dès la première ligne.

#### Acceptance Criteria
1: La CLI Supabase est configurée pour un environnement local. Les migrations versionnées activent PostGIS et créent `profiles`, `user_settings` (zone arrondie à ~1 km par trigger), `alert_preferences`, `games`, `brands`, `products`, `stores` (avec `location geography(Point)`, `osm_ref` unique, statut de validation) et `store_favorites`, ainsi que la configuration `private.app_config` (voir l'architecture, migrations 0001 à 0004).
2: La RLS est activée sur chaque table : lecture publique des magasins validés et des produits actifs, écriture limitée à ses propres données, et opérations admin réservées à un rôle.
3: Les types TypeScript sont générés depuis le schéma.
4: Des tests d'intégration vérifient les policies (anonyme, utilisateur, autre utilisateur, admin).
5: Une **requête de recherche par rayon** (magasins à moins de X km d'un point) existe et est testée.
6: Le workflow CI d'intégration (`supabase start` → migrations → tests Vitest d'intégration → contrôle que les types générés sont à jour) tourne sur chaque push.

### Story 1.6 Authentification et profil
As a visiteur,
I want me connecter par magic link, Google ou Apple,
so that je peux contribuer à la communauté.

#### Acceptance Criteria
1: Les trois connexions fonctionnent : magic link e-mail, Google et Apple.
2: À la première connexion, un profil est créé avec un pseudo unique suggéré, modifiable avec validation d'unicité.
3: Le visiteur anonyme accède à la carte, au fil et aux fiches. Une action réservée (signaler, voter, favori) l'invite à se connecter puis le ramène à son action.
4: L'utilisateur peut se déconnecter.
5: Le **spike `web-push` sous Deno** est réalisé dans une Edge Function de test, et son résultat est consigné. En cas d'échec, l'alerte est remontée au porteur.
6: Dans l'app installée (PWA standalone), l'écran de connexion propose la **saisie du code à 6 chiffres** reçu par e-mail, en plus du lien (sur iOS, le lien s'ouvre dans Safari et non dans l'app).
7: Une procédure documentée (SQL) permet de promouvoir le compte du porteur au rôle `admin`.
8: **SMTP reporté (décision du porteur) :** en local, les e-mails sont lus dans Mailpit. En production, l'expéditeur par défaut de Supabase ne livre qu'aux membres de l'équipe, ce qui suffit pour les tests du porteur. Le SMTP (Resend) est **bloquant avant l'ouverture publique** (story 6.4).

### Story 1.7 Import des magasins OSM et catalogue initial
As a porteur de projet,
I want les magasins pertinents du 84 et du 13 et un catalogue de produits de départ,
so that l'app est utile dès son ouverture.

#### Acceptance Criteria
1: Un script interroge Overpass sur les départements configurés (84 et 13), avec une liste paramétrable de départements.
2: Il cible les catégories : grandes surfaces, jouets, culture, jeux vidéo et boutiques de jeux.
3: Les enseignes sont normalisées (Leclerc, Carrefour, Auchan, Intermarché, Cultura, Fnac, Micromania, JouéClub, King Jouet, indépendant…).
4: L'import est **idempotent** : ré-exécuté, il met à jour par `osm_id` sans créer de doublon. Un rapport (créés, mis à jour, ignorés) est affiché.
5: Adresse, ville, code postal et horaires (`opening_hours`) sont repris quand OSM les fournit.
6: Un seed de catalogue crée le jeu « Pokémon » et des produits génériques, sans aucun visuel officiel.

---

## Epic 2 Carte, magasins et signalement

Donner à l'utilisateur la vue « autour de moi » et la capacité de contribuer. On trouve un magasin sur la carte ou dans la liste, on consulte sa fiche, et on signale un restock en moins de 20 secondes, avec photo. Toutes les règles anti-fake sont appliquées par le serveur.

### Story 2.1 Carte des magasins autour de moi
As a collectionneur,
I want voir sur une carte les magasins autour de moi,
so that je repère où aller.

#### Acceptance Criteria
1: La carte MapLibre (tuiles OpenFreeMap, attribution OSM visible) se charge à la demande et affiche les magasins validés en clusters.
2: La position est demandée **après une explication**, au moment de l'action. Sans consentement, un champ ville ou code postal (géocodeur Géoplateforme) centre la carte.
3: Le bouton « autour de moi » recentre la carte sur la position.
4: Le tap sur un marqueur ouvre une feuille d'aperçu (nom, enseigne, distance, statut).
5: En attendant les signalements (epic 2.5), tous les marqueurs sont gris (« rien de récent »). Leur forme se distingue par statut, sans dépendre de la couleur seule.

### Story 2.2 Liste alternative accessible
As a utilisateur au clavier ou au lecteur d'écran,
I want une liste des magasins équivalente à la carte,
so that j'accède à la même information sans carte.

#### Acceptance Criteria
1: Une bascule carte/liste est présente et mémorisée.
2: La liste trie les magasins par distance et affiche nom, enseigne, distance et statut (en texte).
3: Elle est entièrement navigable au clavier, avec des libellés ARIA explicites.
4: Une recherche par nom de magasin ou par ville filtre la liste.

### Story 2.3 Onboarding
As a nouvel utilisateur,
I want comprendre l'app et régler ma zone et mes produits en moins d'une minute,
so that je vois tout de suite ce qui me concerne.

#### Acceptance Criteria
1: Le concept tient en 3 écrans au plus, avec un ton complice, et chaque écran est passable.
2: L'utilisateur choisit sa position (géolocalisation consentie, ou ville / code postal) et son rayon (15 km par défaut).
3: Il sélectionne ses produits ou types suivis, issus du catalogue en base.
4: Connecté, ses choix sont enregistrés dans son profil (`home_area` **arrondie à ~1 km**). Anonyme, ils sont gardés sur l'appareil puis repris à la connexion.
5: L'onboarding peut être rejoué depuis le compte.

### Story 2.4 Fiche magasin et favoris
As a collectionneur,
I want consulter la fiche d'un magasin et le mettre en favori,
so that j'ai ses infos et je le suis de près.

#### Acceptance Criteria
1: La fiche affiche nom, enseigne, adresse et horaires lisibles (ouvert ou fermé maintenant), avec un lien d'itinéraire qui ouvre l'app de navigation native (Apple Plans sur iOS, Google Maps ou geo: sur Android).
2: Un utilisateur connecté peut ajouter ou retirer le magasin de ses favoris.
3: Le passage de l'aperçu à la fiche complète est une transition continue, désactivée sous reduced-motion.
4: La fiche a une URL dédiée et partageable.

### Story 2.5 Créer un signalement : règles serveur
As a porteur de projet,
I want que les règles de signalement soient garanties par le serveur,
so that un client modifié ne peut pas créer de faux signalements.

#### Acceptance Criteria
1: Les tables `reports` et `report_products` sont créées avec leur RLS : lecture publique des signalements non masqués, aucune écriture directe.
2: Une fonction serveur crée le signalement. Elle valide les entrées, calcule la distance au magasin et **refuse au-delà de 300 m**, sauf exception « haute réputation » (marquée « signalé à distance »). Elle ne stocke que la distance.
3: Les **rate limits** sont appliqués : 10 par heure et par utilisateur, 1 toutes les 30 minutes par utilisateur et par magasin. Chaque refus renvoie un code et un délai de réessai.
4: `expires_at` vaut la création + 6 h. Un job `pg_cron` (15 min) expire les signalements et met à jour les statistiques jour × heure par magasin.
5: Les marqueurs de carte et la fiche reflètent le **dernier signalement valide** de chaque magasin.
6: Des tests d'intégration couvrent : distance OK / KO, exception réputation, chaque rate limit, expiration, et l'utilisateur banni (préparé pour l'epic 5).

### Story 2.6 Parcours « Signaler »
As a collectionneur en magasin,
I want signaler un restock en moins de 20 secondes,
so that la communauté est prévenue pendant qu'il y a encore du stock.

#### Acceptance Criteria
1: Le magasin le plus proche est présélectionné, avec possibilité d'en choisir un autre parmi les proches.
2: Les produits se choisissent en jetons multi-sélection (les produits suivis en premier), avec une quantité estimée facultative.
3: Le statut se choisit en gros boutons. Le prix et le commentaire (≤ 140 caractères) sont facultatifs.
4: À l'envoi, une animation de validation (rebond) affiche « Restock repéré ! ». Les erreurs serveur (distance, fréquence) sont expliquées avec le ton de l'app.
5: Le parcours complet tient en ≤ 20 s lors d'un test chronométré avec 5 utilisateurs ou essais réels, et il est utilisable d'une main.

### Story 2.7 Photo du signalement
As a collectionneur,
I want ajouter une photo de rayon à mon signalement,
so that il est plus crédible et me rapporte de la réputation.

#### Acceptance Criteria
1: La photo vient de l'appareil photo ou de la galerie. Elle est compressée côté client en WebP, ou en JPEG sur Safari (≤ 1600 px, plus une vignette de 480 px), et **aucune métadonnée EXIF** n'est conservée (vérifié par un test).
2: Une Edge Function reçoit la photo, vérifie le **type réel** (signature du fichier) et la taille maximale, puis la stocke dans un bucket dédié. Le fichier est rattaché au signalement.
3: L'interface encourage la photo en affichant le bonus de réputation, sans la rendre obligatoire.
4: Un échec d'upload n'empêche pas l'envoi du signalement sans photo, et l'utilisateur est prévenu.
5: Les photos sont **supprimées automatiquement 60 jours** après le signalement (Edge Function `maintenance`, cron nocturne). Le signalement reste visible, sans photo. La durée est paramétrable (`photo_retention_days`).

### Story 2.8 Proposer un magasin manquant
As a collectionneur,
I want proposer un magasin absent de la carte,
so that ma boutique TCG locale soit couverte.

#### Acceptance Criteria
1: Le formulaire recueille nom, enseigne (liste fermée, plus « indépendant »), adresse (autocomplétion via le géocodeur Géoplateforme) et ajustement de la position sur la carte.
2: Le magasin est créé « en attente ». Il n'est visible que de son auteur (marqué « en attente ») jusqu'à sa validation.
3: Les doublons évidents (même enseigne à moins de 100 m) sont signalés à l'utilisateur avant l'envoi.

### Story 2.9 Historique et heatmap du magasin, données de démo
As a collectionneur,
I want voir l'historique d'un magasin et ses créneaux de restock habituels,
so that j'anticipe mes passages.

#### Acceptance Criteria
1: La fiche liste les signalements passés (date, statut, produits, fiabilité), paginés.
2: Une heatmap jour × heure (Europe/Paris) s'affiche au-delà du seuil de données défini en FR8. En dessous, un état vide explique qu'elle se remplit avec la communauté.
3: La heatmap est lisible en clair et en sombre, avec des valeurs accessibles en texte (tableau alternatif).
4: Un script de **seed de démo** (local uniquement, garde-fou contre la prod) crée quelques magasins réels de la zone et des signalements fictifs répartis dans le temps.

---

## Epic 3 Fil temps réel, votes et réputation

Faire vivre la communauté. Le fil montre ce qui se passe maintenant autour de soi, chacun peut confirmer ou démentir sur place, et la fiabilité devient visible : trust score, badges à collectionner, et effet holo pour les meilleurs signalements.

### Story 3.1 Fil d'alertes
As a collectionneur,
I want une liste chronologique des signalements valides autour de moi,
so that je vois d'un coup d'œil ce qui est disponible.

#### Acceptance Criteria
1: Le fil liste les signalements valides dans le rayon (ou la zone par défaut sans position), du plus récent au plus ancien, avec un chargement progressif.
2: La **carte de signalement** est conçue comme une carte à collectionner : cadre, bandeau de statut, rareté selon la fiabilité. Elle montre magasin, distance, produits, ancienneté relative, vignette photo, nombre de confirmations, badge de fiabilité et « signalé à distance ».
3: Les signalements contestés sont désaccentués et les expirés n'apparaissent pas.
4: Les états vide, chargement et erreur sont conçus avec du ton.

### Story 3.2 Temps réel
As a collectionneur,
I want voir les nouveaux signalements arriver sans recharger,
so that je réagis immédiatement.

#### Acceptance Criteria
1: Les nouveaux signalements et les changements de statut ou de votes arrivent en temps réel (< 5 s), filtrés par distance côté client.
2: Les nouveautés s'annoncent par une pastille « N nouveaux signalements » qui fait remonter la liste au tap, sans saut involontaire.
3: La connexion temps réel se coupe en arrière-plan et se rétablit au retour, avec rattrapage des événements manqués.

### Story 3.3 Filtres du fil
As a collectionneur,
I want filtrer le fil par produit, enseigne et fraîcheur,
so that je ne vois que ce qui m'intéresse.

#### Acceptance Criteria
1: Les filtres portent sur les produits ou types, les enseignes et la fraîcheur (< 1 h, < 3 h, < 6 h).
2: Les filtres actifs sont visibles et réinitialisables en un tap. Ils sont mémorisés sur l'appareil.
3: Les filtres s'appliquent aussi aux événements temps réel.

### Story 3.4 Détail d'un signalement
As a collectionneur,
I want ouvrir un signalement en détail,
so that je juge sa fiabilité avant de me déplacer.

#### Acceptance Criteria
1: L'URL dédiée (`/r/:id`) affiche magasin, produits avec quantités, prix, commentaire, photo en plein écran, auteur (pseudo et badge), votes et trust score.
2: Un signalement expiré reste consultable et marqué « expiré ».
3: Les liens vers la fiche magasin et l'itinéraire sont présents.

### Story 3.5 Voter sur un signalement
As a collectionneur sur place,
I want confirmer, démentir ou signaler qu'il n'y a plus rien,
so that l'info reste juste pour tout le monde.

#### Acceptance Criteria
1: Une fonction serveur enregistre le vote. Elle exige d'être connecté, à **≤ 300 m** du magasin, sur un signalement valide qui n'est pas le sien. Le vote est unique par (signalement, utilisateur) et modifiable.
2: « Plus rien » applique la règle de FR22 : le signalement passe en épuisé et toute notification future est coupée.
3: La règle « contesté » de FR23 est appliquée.
4: Côté interface, le vote se fait en un tap. Une célébration discrète accompagne « Confirmé », et les refus serveur (distance) sont expliqués.
5: Les tests d'intégration couvrent : distance, unicité, auto-vote interdit, signalement expiré, règle « Plus rien » et règle « contesté ».

### Story 3.6 Réputation, trust score et badges
As a contributeur,
I want que mes signalements fiables soient reconnus,
so that je suis motivé à contribuer et la communauté sait à qui faire confiance.

#### Acceptance Criteria
1: Le barème de réputation (FR24) est appliqué **côté serveur**, de façon idempotente, et paramétrable en base.
2: Le `trust_score` (FR26) est recalculé à chaque vote, et à l'expiration pour la composante fraîcheur.
3: Les badges (FR25) sont attribués automatiquement et dessinés comme des **badges d'arène originaux**. L'**effet holo** (reflet animé au mouvement ou au survol, neutralisé sous reduced-motion) est réservé aux signalements de trust ≥ 80 et aux badges.
4: Le seuil « signalement à distance » est branché sur la règle de l'epic 2.5.
5: Les tests couvrent chaque ligne du barème et les seuils de badges.

### Story 3.7 Mon compte
As a utilisateur connecté,
I want retrouver mon profil, mes badges, mes signalements et mes favoris,
so that je suis ma contribution.

#### Acceptance Criteria
1: Le compte affiche pseudo (modifiable), avatar (choisi parmi des avatars maison), score et badges (avec la progression vers le prochain).
2: Il contient l'historique de mes signalements, avec leur issue (confirmé, contesté, expiré).
3: Il liste mes magasins favoris, avec accès à leur fiche.

---

## Epic 4 Notifications push

Livrer la promesse centrale : être prévenu, au bon moment et seulement pour ce qui compte, sur iPhone installé comme sur Android.

### Story 4.1 Activation des notifications et guide d'installation iOS
As a utilisateur,
I want activer les notifications, y compris sur iPhone,
so that je reçois les alertes même app fermée.

#### Acceptance Criteria
1: Un script génère les clés VAPID, documenté dans `.env.example`.
2: L'app détecte **iOS dans Safari, non installée**, et affiche un écran guidé d'installation (Partager → Sur l'écran d'accueil, illustré, sans visuel Apple protégé). La permission n'est demandée qu'une fois l'app installée.
3: La permission est demandée **sur action explicite**, après explication. Un refus est géré avec élégance, avec des instructions pour réactiver.
4: L'abonnement push (endpoint, clés, user agent) est enregistré, un par appareil, avec mise à jour en cas de rotation.
5: L'onboarding (2.3) intègre cette étape à la fin.

### Story 4.2 Préférences d'alerte
As a utilisateur,
I want régler précisément ce qui déclenche une alerte,
so that je ne suis pas dérangé pour rien.

#### Acceptance Criteria
1: Les préférences couvrent : rayon, produits ou types, enseignes, « favoris uniquement », heures silencieuses et mode (création ou **1re confirmation par défaut**).
2: Les préférences sont stockées côté serveur, avec RLS.
3: Un résumé lisible des réglages s'affiche (« Displays et ETB, à moins de 15 km, chez Leclerc et Cultura, sauf 22 h – 8 h »).

### Story 4.3 Moteur d'envoi des push
As a utilisateur abonné,
I want être notifié dans la minute d'un restock qui me concerne,
so that j'arrive avant la rupture.

#### Acceptance Criteria
1: Un trigger, à la création d'un signalement ou à sa 1re confirmation, appelle l'Edge Function d'envoi via `pg_net`.
2: Le ciblage applique FR29 : rayon sur `home_area`, produits, enseignes, favoris, heures silencieuses en Europe/Paris, mode de déclenchement, auteur exclu, et aucune notification pour un signalement épuisé, contesté ou masqué.
3: Le **dédoublonnage de 2 h par magasin et par utilisateur** est garanti, y compris en cas d'appels concurrents.
4: Les endpoints 404 ou 410 sont supprimés et `last_success_at` est mis à jour.
5: Les envois sont journalisés (compteurs, sans contenu personnel) pour le diagnostic.
6: La notification part en < 60 s.
7: Les tests couvrent la logique de ciblage et le dédoublonnage.

### Story 4.4 Réception et ouverture des notifications
As a utilisateur notifié,
I want une notification claire qui m'emmène direct au signalement,
so that je décide en quelques secondes.

#### Acceptance Criteria
1: La notification affiche le statut, le magasin, la distance arrondie, les produits et le ton de l'app (« Restock repéré chez Cultura Avignon ! »), avec l'icône de l'app.
2: Le clic ouvre (ou ramène au premier plan) l'app sur `/r/:id`.
3: Le bouton « Envoyer une notification de test » fonctionne depuis le compte.
4: Une **procédure de test documentée** est exécutée et ses résultats consignés : iPhone (iOS 16.4+) installé, Android Chrome, app fermée, app en arrière-plan et heures silencieuses.

---

## Epic 5 Admin, modération, hors-ligne et RGPD

Rendre l'app exploitable et sûre avant l'ouverture publique : le porteur gère le catalogue, les magasins et les abus. L'app tient sans réseau, et chaque utilisateur maîtrise ses données.

### Story 5.1 Espace admin et catalogue produits
As a admin,
I want gérer le catalogue de produits,
so that il suit les sorties sans redéploiement.

#### Acceptance Criteria
1: Les routes `/admin` sont réservées au rôle admin, contrôlé **côté serveur** par RLS et RPC (pas seulement masquées dans l'UI), et chargées à la demande.
2: Le catalogue s'édite en CRUD : jeu, nom, type, extension, ordre, image facultative uploadée (contrôle de type et de taille), et activation ou désactivation. Un produit désactivé disparaît des sélections sans casser l'historique.
3: Un panneau **« Santé »** affiche les derniers passages des tâches planifiées, les statistiques push sur 24 h, les KPIs du brief et l'occupation de la base et du stockage par rapport aux limites gratuites.

### Story 5.2 Validation des magasins proposés
As a admin,
I want valider ou refuser les magasins proposés et corriger les fiches,
so that la carte reste juste.

#### Acceptance Criteria
1: La file des magasins en attente affiche la carte et signale les doublons potentiels.
2: Trois actions sont possibles : valider, refuser (avec motif) ou modifier puis valider.
3: L'admin peut éditer tout magasin (horaires, enseigne, position) et le désactiver.

### Story 5.3 Signalement d'abus, modération et bannissement
As a admin,
I want traiter les abus signalés par la communauté,
so that les fausses infos et les contenus inappropriés disparaissent vite.

#### Acceptance Criteria
1: Un utilisateur connecté signale un abus sur un signalement ou une photo, avec un motif (faux, photo inappropriée, spam, autre). Il ne peut le faire qu'une fois par élément.
2: La file de modération, triée par nombre de signalements d'abus, permet de **masquer** un signalement ou une photo, ou de rejeter le signalement d'abus. Le masquage applique la pénalité de réputation (FR24).
3: Le **bannissement** empêche toute écriture (garanti côté serveur) et masque les signalements actifs de l'utilisateur. Il est réversible.
4: Toutes les actions de modération sont journalisées (qui, quoi, quand).

### Story 5.4 Mode hors ligne
As a collectionneur en magasin avec un mauvais réseau,
I want consulter les derniers signalements et signaler quand même,
so that l'app reste utile au fond d'un hypermarché.

#### Acceptance Criteria
1: Les derniers signalements et fiches consultés sont disponibles hors ligne, avec un bandeau « hors ligne » et l'heure de dernière mise à jour.
2: Un signalement créé hors ligne est mis en file avec la position et l'heure capturées, puis envoyé au retour du réseau par Background Sync quand le navigateur le permet. Sinon, un bouton « Envoyer maintenant » est proposé (iOS, Firefox).
3: La règle de délai de FR41 est appliquée côté serveur, et l'utilisateur est informé du résultat de l'envoi différé.
4: La photo d'un signalement en file est conservée localement jusqu'à l'envoi.

### Story 5.5 Export et suppression du compte
As a utilisateur,
I want récupérer ou supprimer mes données moi-même,
so that j'exerce mes droits RGPD sans rien demander à personne.

#### Acceptance Criteria
1: L'**export** télécharge un JSON complet : profil, préférences, favoris, signalements, votes, abonnements push (sans les clés).
2: La **suppression** (double confirmation) applique FR36 : les données personnelles et les photos sont supprimées, les signalements anonymisés et la session fermée.
3: Les deux opérations passent par le serveur et sont testées.

### Story 5.6 Pages légales et consentements
As a utilisateur,
I want comprendre comment mes données sont utilisées,
so that je fais confiance à l'app.

#### Acceptance Criteria
1: Les pages mentions légales, politique de confidentialité et CGU (avec mention de non-affiliation) sont rédigées en français clair et accessibles depuis le footer et le compte.
2: Le consentement à la géolocalisation est explicite et révocable. La politique explique l'arrondi de la position et l'absence de tracker tiers.
3: Aucun cookie non essentiel n'est posé, donc il n'y a pas besoin de bannière cookies, et cela est expliqué dans la politique.
4: Les champs à compléter par le porteur (éditeur, hébergeur, contact) sont clairement identifiés.

---

## Epic 6 Qualité de lancement

Valider que l'app tient ses promesses de performance et de qualité, puis donner au porteur tout ce qu'il faut pour déployer et exploiter seul.

### Story 6.1 Audit performance et Lighthouse
As a porteur de projet,
I want des scores Lighthouse mobile ≥ 90 sur les pages clés,
so that l'app est rapide sur les téléphones modestes.

#### Acceptance Criteria
1: Lighthouse mobile est ≥ 90 en Performance, Accessibilité et Best Practices sur Carte, Fil et Fiche magasin. Les rapports sont archivés.
2: Le bundle initial reste < 200 ko gzip (contrôle CI vert).
3: Les régressions sont corrigées, et Lighthouse CI est ajouté au pipeline si le quota le permet.

### Story 6.2 Audit d'accessibilité
As a utilisateur en situation de handicap,
I want une app utilisable au clavier et au lecteur d'écran,
so that je ne suis pas exclu.

#### Acceptance Criteria
1: Le passage axe automatique ne remonte aucune violation sérieuse sur les écrans principaux.
2: Les parcours principaux sont testés manuellement avec VoiceOver (iOS) et au clavier (desktop), et les problèmes trouvés sont corrigés.

### Story 6.3 Parcours E2E consolidés
As a porteur de projet,
I want les parcours critiques testés automatiquement,
so that une régression ne passe pas en production.

#### Acceptance Criteria
1: Quatre parcours Playwright s'exécutent en CI sur base locale seedée : consultation anonyme carte → fiche, signalement complet, vote, et onboarding avec préférences d'alerte.
2: La géolocalisation est simulée, et les tests sont stables (aucun test instable toléré).

### Story 6.4 Documentation et mise en production
As a porteur de projet,
I want une documentation complète de déploiement et d'exploitation,
so that je mets en ligne et maintiens l'app seul.

#### Acceptance Criteria
1: Le `README.md` couvre l'installation locale, les variables d'env, la création du projet Supabase cloud (extensions, providers Google et Apple, secrets, cron), le déploiement front, l'import OSM, la génération VAPID et la **procédure de test des push sur iPhone**.
2: Une check-list de mise en production est fournie : domaine, URLs de redirection auth, **SMTP Resend avec domaine vérifié (bloquant)**, modèle d'e-mail avec code OTP, sauvegardes et surveillance de la mise en pause Supabase.

---

## Checklist Results Report

Revue PM effectuée sur la base de la check-list `pm-checklist` (passe rapide, à confirmer par la validation PO) :

| Catégorie | Statut | Remarques |
|---|---|---|
| 1. Problème et contexte | PASS | Issu du brief. Objectifs chiffrés encore à valider par le porteur. |
| 2. Périmètre MVP | PASS | V1 et V2 bornées, hors-périmètre explicite. |
| 3. Expérience utilisateur | PARTIAL | Les parcours seront détaillés dans la front-end spec. Direction visuelle attendue en phase 0. |
| 4. Exigences fonctionnelles | PARTIAL | 9 points marqués [VALIDÉ] à valider (FR8, 21, 22, 24, 25, 26, 34, 41, géocodage). |
| 5. Exigences non fonctionnelles | PASS | Lighthouse PWA remplacé par une check-list (décision du porteur). |
| 6. Epics et stories | PASS | Epic 1 fondatrice et livrable, stories séquentielles, transverses intégrés dès l'epic 1. |
| 7. Guidance technique | PASS | Stack imposée, deux choix renvoyés à l'architecte, spike `web-push` planifié. |
| 8. Transverse (données, intégrations, ops) | PASS | OSM, BAN, Web Push, `pg_cron`, sauvegardes en 6.4. |
| 9. Clarté | PASS | — |

**Points bloquants avant l'architecture :** aucun. Les [VALIDÉ] peuvent être validées en parallèle, car elles touchent des paramètres et non la structure.

## Next Steps

### UX Expert Prompt
@ux-expert : à partir de `docs/prd.md` et de la section « Direction artistique » de `docs/input/initial-prompt.md`, mène la **phase 0**. Fais une veille réelle (jeux Pokémon récents, design des cartes TCG, apps à caractère, tendances mobiles) et rends un moodboard commenté. Propose ensuite 2 ou 3 style tiles distinctes (palette, paire typo, bouton, carte de signalement, marqueur, badge), en respectant les interdits IP et anti « look IA ». Après le choix du porteur, rédige `docs/front-end-spec.md`.

### Architect Prompt
@architect : à partir de `docs/prd.md` et de `docs/front-end-spec.md`, produis `docs/architecture.md` (fullstack) : arborescence, **schéma SQL complet avec policies RLS**, RPC, **liste des Edge Functions**, triggers et jobs, stratégie service worker et offline, temps réel. Tranche Tailwind v3 ou v4 et Vercel ou Netlify (à soumettre au porteur). Respecte la stack imposée. **Validation du porteur obligatoire avant tout code.**
