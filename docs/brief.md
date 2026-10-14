# Project Brief: RestockRadar

> Agent : Analyst (Mary) — BMAD v4.33 — mode YOLO, brouillon v0.1 du 2026-10-14
> Source : [`docs/input/initial-prompt.md`](input/initial-prompt.md). Ce brief en est la synthèse. Pour le détail fonctionnel et la direction artistique, le prompt reste la référence.
> Nom de travail `RestockRadar`, centralisé dans une constante de config unique.

## Executive Summary

RestockRadar est une PWA communautaire, mobile-first et en français. Les collectionneurs de cartes Pokémon y **signalent les restocks qu'ils voient en magasin physique** et reçoivent des **alertes push géolocalisées et filtrées par produit**. Elle comble l'angle mort des outils existants, centrés sur la vente en ligne ou noyés dans le bruit de serveurs Discord nationaux. La valeur repose sur la **proximité** (seulement ce qui est à portée), la **fiabilité vérifiable** (photo, présence sur place, votes, réputation) et un **historique par magasin** qui permettra à terme de prédire les réassorts. Le lancement se fait sur le Vaucluse (84) et les Bouches-du-Rhône (13), avec une architecture prête pour toute la France.

## Problem Statement

- **État actuel** : depuis la vague de 2020, les produits Pokémon TCG (displays, ETB, coffrets) sont en tension permanente. En grande surface ou chez les spécialistes, un réassort part en quelques heures, parfois avant l'ouverture, à cause des revendeurs.
- **Douleurs** : les collectionneurs font des tournées « à l'aveugle » entre magasins. L'info circule sur Discord, Facebook ou Snapchat, mais elle est nationale, mêlée de ventes en ligne, non vérifiée et déjà périmée quand on la lit. Personne ne sait quand un magasin donné est réapprovisionné.
- **Limites des solutions existantes** : les trackers suivent le stock en ligne par scraping. Les Discord ne filtrent ni par distance ni par produit, et n'ont aucun mécanisme de confiance. Rien ne capitalise l'historique d'un magasin.
- **Pourquoi maintenant** : la demande est intacte (nouvelles extensions tous les 2-3 mois). Les PWA reçoivent enfin les push sur iOS (16.4+, appli installée), ce qui permet de lancer une app mobile sans passer par les stores. Et les briques gratuites (Supabase, OSM, Vercel) font tomber le coût de lancement à ~0 €.

## Proposed Solution

Une PWA installable qui tient en trois gestes :
1. **Voir** : carte et fil des signalements encore valides autour de soi, avec un statut couleur par magasin.
2. **Signaler** en ≤ 20 s : magasin présélectionné par GPS, produits, statut, photo. Le signalement n'est accepté que si l'on est sur place (≤ 300 m, vérifié côté serveur).
3. **Valider** : les autres utilisateurs votent (« Confirmé », « Faux », « Plus rien »), ce qui alimente un `trust_score` par report et une réputation par auteur.

**Différenciateurs** : magasin physique uniquement, alertes au rayon et au produit près, fiabilité mesurée, données 100 % communautaires (pas de scraping) et une identité visuelle chaleureuse, inspirée de la culture TCG sans rien en copier.

**Vision** : devenir le « Waze des restocks TCG » en France. La donnée historique (jours et créneaux de réassort par magasin) devient l'actif principal, et la prédiction statistique arrive en V2.

## Target Users

### Primary User Segment: le collectionneur-chasseur local
- Il a de 16 à 40 ans et vit dans le 84 ou le 13. Il collectionne pour ouvrir, garder scellé ou compléter un set, et fait le tour de 3 à 10 magasins dans un rayon de 5 à 30 km.
- Aujourd'hui, il suit 2 ou 3 Discord et des groupes Facebook, passe en magasin « au cas où » et rate régulièrement les réassorts.
- Ses besoins : savoir **vite** et **près**, ne recevoir que ce qui l'intéresse (tel produit, telles enseignes), et pouvoir faire confiance à l'info avant de prendre la voiture.
- Son but : récupérer les produits au prix public, sans payer la marge des revendeurs.

### Secondary User Segment: le parent acheteur occasionnel
- Il cherche un coffret ou un ETB pour un enfant, surtout avant Noël et les anniversaires. Il est peu technophile, n'a pas de compte Discord et veut une réponse simple : « Où en trouver près de chez moi cette semaine ? ».
- Ses besoins : une consultation sans friction (idéalement sans compte), des libellés produits compréhensibles et un itinéraire en un tap.

*(Hors cible V1 : les revendeurs professionnels. Le produit ne doit pas devenir leur outil, voir les risques.)*

## Goals & Success Metrics

### Business Objectives
- Lancer une V1 publique sur le 84 et le 13 avec un coût d'hébergement ≤ 5 €/mois (offres gratuites).
- Atteindre une masse critique locale **à 3 mois du lancement** : ≥ 500 comptes actifs et ≥ 30 signalements par semaine sur la zone *(cibles à valider par le porteur)*.
- Constituer un historique exploitable : ≥ 20 magasins avec ≥ 15 signalements datés à 6 mois, socle de la prédiction V2.

### User Success Metrics
- Un signalement se fait en ≤ 20 s (médiane mesurée par l'instrumentation interne, sans tracker tiers).
- La part des signalements confirmés dépasse largement celle des signalements infirmés (« Faux »).
- Un utilisateur reçoit une alerte pertinente avant l'épuisement du stock.

### Key Performance Indicators (KPIs)
- **Activation** : % d'inscrits ayant fini l'onboarding avec push activé. Cible ≥ 50 %.
- **Contribution** : % d'actifs mensuels ayant signalé ou voté au moins une fois. Cible ≥ 25 %.
- **Fiabilité** : ratio confirmés / (confirmés + infirmés). Cible ≥ 80 %.
- **Réactivité** : délai médian entre un signalement et sa première confirmation. Cible < 45 min.
- **Rétention** : utilisateurs actifs à J30. Cible ≥ 30 %.

## MVP Scope

### Core Features (Must Have)
Reprise intégrale des 10 fonctionnalités V1 du prompt source, résumées ici :
- **Onboarding** : 3 écrans au maximum, localisation (ou ville / code postal en repli), rayon, produits suivis, puis écran d'installation guidé sur iOS non installé avant de demander les notifications.
- **Carte** : MapLibre et tuiles OSM, clusters, couleur par statut, bouton « autour de moi », liste alternative accessible.
- **Fil temps réel** : signalements dans le rayon, filtres produit / enseigne / fraîcheur, carte de signalement « façon carte à collectionner ».
- **Signalement** : présélection GPS, multi-produits, statut, photo compressée en WebP sans EXIF, contrôle ≤ 300 m côté serveur, rate limits (10/h par utilisateur, 1 toutes les 30 min par magasin).
- **Votes** : « Confirmé », « Faux », « Plus rien ». Un « Plus rien » valide passe le report en épuisé et coupe les push.
- **Fiche magasin** : infos, horaires, itinéraire natif, favori, historique et heatmap jour × heure dès qu'il y a assez de données.
- **Push Web Push (VAPID)** : à la création ou à la 1re confirmation selon le choix de l'utilisateur, filtres rayon / produits / enseignes / heures silencieuses, dédoublonnage 2 h par magasin, deep link vers le report, purge des endpoints morts.
- **Réputation** : score d'auteur, badges et `trust_score` par report.
- **Compte** : préférences, favoris, historique, export JSON et suppression en self-service.
- **Admin** : catalogue produits, validation des magasins proposés, file de modération, bannissement.
- **Import OSM** des magasins du 84 et du 13, plus proposition d'un magasin manquant par les utilisateurs.
- **Offline** : coquille de l'app et derniers reports en cache, file d'attente des signalements hors ligne.

### Out of Scope for MVP
- Prédiction de restock et alertes « restock probable demain » (V2, mais le schéma doit l'anticiper).
- Classement mensuel des contributeurs.
- Partage social avec image Open Graph générée.
- TCG autres que Pokémon (le catalogue doit cependant porter une notion de « jeu » dès la V1).
- Apps natives et publication sur les stores.
- Toute forme de monétisation, de publicité ou de partenariat avec les enseignes.
- Toute donnée de stock non communautaire (scraping, API marchandes).

### MVP Success Criteria
La V1 est réussie si, sur la zone 84 et 13, un utilisateur installé (iOS ou Android) peut s'inscrire, recevoir une alerte push filtrée pour un signalement fait par un autre à ≤ 300 m d'un magasin, voter dessus, et si les règles métier (distance, rate limit, unicité des votes, réputation) tiennent face à un client modifié. Le tout doit passer Lighthouse ≥ 90 (voir la note PWA plus bas), avec un bundle initial < 200 ko gzip et un coût mensuel ≈ 0 €.

## Post-MVP Vision

### Phase 2 Features
Prédiction statistique par magasin (fréquence par jour de semaine × créneau, intervalle de confiance, affichage du type « Restock probable mardi matin (confiance moyenne) »), alertes prédictives sur les favoris, classement local mensuel, partage avec image OG générée.

### Long-term Vision
Couverture nationale par extension progressive des départements (import OSM paramétré par code INSEE) et animation locale par des « éclaireurs » à haute réputation. La donnée historique devient la référence publique des réassorts physiques.

### Expansion Opportunities
Autres TCG (One Piece, Lorcana, Magic, Yu-Gi-Oh!), Belgique et Suisse francophones, évènements en boutique (avant-premières, tournois).

## Technical Considerations

### Platform Requirements
- **Target Platforms :** PWA mobile-first, installable sur iOS 16.4+ et Android (Chrome), desktop en bonus.
- **Browser/OS Support :** Safari iOS 16.4+ (push seulement si l'app est installée), Chrome / Edge / Samsung Internet récents, Firefox (pas de Background Sync, donc repli manuel).
- **Performance Requirements :** Lighthouse ≥ 90 en Perf, A11y et Best Practices, bundle initial < 200 ko gzip, carte et admin chargés à la demande.

### Technology Preferences
- **Frontend :** Vite, React, TypeScript, Tailwind CSS, `vite-plugin-pwa` (Workbox), React Router, TanStack Query, MapLibre GL JS avec tuiles OpenFreeMap, Zod.
- **Backend :** Supabase (Auth, Storage, Realtime, Edge Functions en Deno, `pg_cron`).
- **Database :** Postgres et PostGIS (geography, requêtes par rayon), RLS stricte sur toutes les tables, règles métier en fonctions SQL `SECURITY DEFINER` ou en Edge Functions.
- **Hosting/Infrastructure :** front statique sur **Vercel** (proposé, car déjà utilisé sur tes autres projets), Supabase en offre gratuite.

### Architecture Considerations
- **Repository Structure :** monorepo simple, avec le front à la racine (`src/`) et `supabase/` (migrations, fonctions, seed) à côté. Pas de workspaces au départ.
- **Service Architecture :** client lourd, avec la logique métier en base (RPC Postgres) et des Edge Functions pour ce qui sort de la base (push, upload photo, modération). Les push partent d'un trigger sur `reports` / `report_votes` (via `pg_net`) vers une fonction `send-push`.
- **Integration Requirements :** API Overpass (import ponctuel), tuiles OpenFreeMap, services Web Push (APNs et FCM via les endpoints navigateur).
- **Security/Compliance :** RGPD (position arrondie à ~1 km, consentement explicite, export et suppression, aucun tracker tiers), propriété intellectuelle (aucun asset officiel, mention de non-affiliation), validation Zod des deux côtés.

## Constraints & Assumptions

### Constraints
- **Budget :** ~0 €/mois au démarrage (offres gratuites Supabase, Vercel, OpenFreeMap).
- **Timeline :** non fixée, livraison phase par phase avec validation à chaque fin de phase *(à préciser)*.
- **Resources :** un porteur de projet, développement assisté par IA.
- **Technical :** pas de scraping, push iOS limité à l'app installée, aucun asset ni police Pokémon.

### Key Assumptions
- Les collectionneurs du 84 et du 13 sont assez nombreux et motivés pour signaler gratuitement, grâce à la réciprocité et à la gamification.
- OSM recense correctement la majorité des grandes surfaces et enseignes ciblées (les boutiques TCG indépendantes sont probablement sous-représentées, d'où la proposition de magasin par les utilisateurs).
- Le GPS du téléphone suffit pour la règle des 300 m en extérieur et en entrée de galerie commerciale (à vérifier, l'intérieur des grands centres commerciaux dégrade la précision).
- Le porteur de projet assure seul la modération au lancement.

## Risks & Open Questions

### Key Risks
- **Démarrage à froid :** sans signalements, l'app est vide et on la désinstalle. *Mitigation :* lancement ciblé auprès de communautés locales (boutiques TCG, Discord régionaux), pré-remplissage OSM soigné, états vides engageants, réputation visible.
- **Récupération par les revendeurs :** l'app pourrait accélérer la razzia des scalpers. *Mitigation :* rayon limité, pas d'API publique, rate limits, alerte après confirmation par défaut *(à arbitrer)*.
- **Fausses positions GPS :** la règle des 300 m repose sur des coordonnées envoyées par le client, donc falsifiables. *Mitigation :* elle reste un filtre utile ; la défense réelle passe par les votes, la réputation, la modération et la détection d'incohérences (déplacements impossibles entre deux signalements).
- **Propriété intellectuelle :** un design trop proche de l'univers officiel peut déclencher une réclamation de The Pokémon Company. *Mitigation :* revue IP de chaque style tile, aucun nom de Pokémon dans l'UI, mention de non-affiliation.
- **Mise en pause Supabase :** l'offre gratuite suspend un projet après 7 jours sans activité. *Mitigation :* l'activité réelle et `pg_cron` devraient suffire, à surveiller (l'offre Pro coûte ~25 $/mois si besoin).
- **Push iOS :** une friction d'installation forte peut faire chuter l'activation sur iPhone. *Mitigation :* écran guidé soigné et valeur visible avant même l'activation des push.

### Points d'attention sur la stack imposée (à valider avant tout code)
Comme demandé dans le prompt, je signale ces points sans rien changer :
1. **Lighthouse « PWA ≥ 90 » n'est plus mesurable.** La catégorie PWA a été retirée de Lighthouse en version 12 (2024). *Proposition :* garder Perf, A11y et Best Practices ≥ 90, et remplacer le critère PWA par une check-list d'installabilité vérifiée (manifest, service worker, offline, icônes, splash iOS), plus un audit Chrome DevTools > Application.
2. **Sign in with Apple exige un compte Apple Developer payant (99 $/an)**, ce qui contredit le coût ≈ 0. *Proposition :* V1 avec magic link et Google, Apple ajouté plus tard (le code sera prêt, seule la config manquera).
3. **`web-push` (npm) sous Deno / Edge Functions :** la librairie s'appuie sur le crypto Node, dont le support sous Deno a longtemps été bancal. *Proposition :* lancer un spike dès la phase 1 et, en cas de souci, basculer sur une implémentation Web Crypto native compatible Deno (par ex. `@negrel/webpush` sur JSR). Même protocole VAPID, aucun impact fonctionnel.
4. **Realtime et rayon :** les « Postgres Changes » de Supabase Realtime ne savent pas filtrer par distance. *Proposition :* abonnement aux insertions de `reports`, filtrage géographique côté client (suffisant sur deux départements), puis canaux par département quand on étendra à la France.
5. **Tailwind :** partir sur **Tailwind v4** (tokens en variables CSS via `@theme`), cohérent avec l'exigence « tokens consommés par Tailwind, aucune valeur magique ».

### Open Questions
*Décisions produit non couvertes par le prompt, à trancher par le porteur :*
- Consultation de la carte et du fil **sans compte** ? (Le prompt dit « lecture publique », ce qui pousse au oui, mais à confirmer pour le parcours d'onboarding.)
- Le vote exige-t-il, lui aussi, d'être **à ≤ 300 m** du magasin ? Surtout pour « Plus rien », qui coupe les alertes, et pour « Faux », qui pénalise l'auteur.
- Qu'est-ce qu'un vote « Plus rien » **valide** ? Un seul vote suffit-il ? Faut-il un vote de quelqu'un sur place, ou d'une réputation minimale ?
- **Mode de push par défaut** : à la création ou à la 1re confirmation ? Le second limite les fausses alertes et le profit des revendeurs, mais retarde l'info.
- Seuils de réputation : niveau requis pour le **signalement à distance**, barème des points, paliers de badges. *(Peut être proposé par le PM puis validé.)*
- Affichage public du **pseudo** des auteurs et du **prix constaté** ?
- Objectifs chiffrés à 3 et 6 mois (les cibles ci-dessus sont des propositions).
- Nom définitif et domaine : à prévoir avant la phase 5 (pages légales, e-mails d'authentification).

### Areas Needing Further Research
- Veille design et moodboard (phase 0, livrable explicite du prompt).
- Couverture réelle d'OSM sur les enseignes ciblées du 84 et du 13 (requête Overpass exploratoire).
- Précision GPS en galerie marchande, pour calibrer le seuil de 300 m.
- Concurrence francophone sur le créneau « restock physique » (apps, bots Discord régionaux).

## Appendices

### C. References
- Prompt source : `docs/input/initial-prompt.md`
- Supabase PostGIS, Realtime, Edge Functions et `pg_cron` (documentation officielle)
- Web Push sur iOS 16.4+ (WebKit blog, « Web Push for Web Apps on iOS and iPadOS »)
- OpenFreeMap, MapLibre GL JS, API Overpass

## Next Steps

### Immediate Actions
1. Le porteur valide ou corrige ce brief, tranche les **points d'attention sur la stack** et répond aux **questions ouvertes**.
2. **Phase 0 design** (agent UX Expert) : veille, moodboard commenté et 2 ou 3 style tiles à choisir. Elle peut avancer en parallèle du PRD.
3. **PRD** (agent PM) : epics et stories alignés sur les phases 1 à 6 du prompt.
4. **Front-end spec** (UX Expert), une fois la direction visuelle choisie.
5. **Architecture fullstack** (Architect) : arborescence, schéma SQL complet avec RLS, liste des Edge Functions. Elle sera **soumise à validation avant tout code**, comme l'exige le prompt.
6. Validation PO, découpage des documents, puis cycle SM → Dev → QA, story par story.

### PM Handoff
This Project Brief provides the full context for RestockRadar. Please start in 'PRD Generation Mode', review the brief thoroughly to work with the user to create the PRD section by section as the template indicates, asking for any necessary clarification or suggesting improvements.
