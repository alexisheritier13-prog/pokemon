# Prompt initial — PWA communautaire de restocks TCG en magasin

> Document source fourni par le porteur de projet (2026-10-14). Référence d'entrée pour tous les agents BMAD. Ne pas modifier : les décisions prises ensuite vivent dans `docs/brief.md`, `docs/prd.md`, `docs/front-end-spec.md` et `docs/architecture.md`.

---

## Contexte

Tu vas construire une **Progressive Web App (PWA)** communautaire qui permet aux collectionneurs de cartes à collectionner (Pokémon TCG en priorité) de **signaler et recevoir des alertes de restocks en magasin physique**, autour d'eux.

Le marché du suivi des restocks **en ligne** est déjà couvert (trackers, serveurs Discord). Notre différence tient à quatre choses :
1. le **magasin physique** ;
2. des **alertes géolocalisées et filtrées par produit**, sans le bruit d'un Discord national ;
3. une **fiabilité vérifiable** : photo, confirmations par d'autres utilisateurs, score de réputation ;
4. un **historique par magasin** qui permet, à terme, de **prédire** les jours et créneaux de réassort.

Zone de lancement : **Vaucluse (84) et Bouches-du-Rhône (13)**. L'architecture doit permettre d'étendre facilement à toute la France.

Langue de l'interface : **français**. Le code et les commentaires sont en anglais.

Nom de travail : `RestockRadar`. Il doit être facile à changer via une constante ou une config unique.

---

## Contraintes impératives

- **PWA installable** sur iOS et Android. Il faut un manifest complet, un service worker, des icônes de toutes tailles et des splash screens iOS.
- **Notifications push Web Push (VAPID)** fonctionnelles. Sur iOS, elles ne marchent **que si la PWA est ajoutée à l'écran d'accueil** (iOS 16.4+). L'app doit détecter iOS non installé et afficher un **écran guidé d'installation** (Partager → Sur l'écran d'accueil) avant de proposer les notifications.
- **Mobile-first**, avec des cibles tactiles ≥ 44 px, utilisable d'une main et un mode sombre automatique.
- **Propriété intellectuelle** : n'utilise **aucun logo, aucune image officielle ni aucune police** Pokémon/Nintendo/The Pokémon Company. Dans les textes, la marque n'apparaît que de façon descriptive (« cartes Pokémon »). Ajoute une mention de non-affiliation dans le footer et les CGU.
- **RGPD** : consentement explicite à la géolocalisation, position **jamais stockée de façon précise** (rayon arrondi), page de confidentialité, export et suppression du compte en self-service, aucun tracker tiers.
- **Coût d'hébergement quasi nul** au démarrage, via les offres gratuites.
- **Pas de scraping** de sites marchands. Toutes les données de stock viennent de la communauté.

---

## Stack imposée

- **Front** : Vite + React + TypeScript, Tailwind CSS, `vite-plugin-pwa` (Workbox), React Router, TanStack Query.
- **Carte** : MapLibre GL JS avec tuiles OpenStreetMap (OpenFreeMap ou équivalent gratuit), sans clé Google Maps.
- **Backend** : **Supabase**.
  - Postgres + **PostGIS** pour les requêtes par rayon
  - Auth : magic link par e-mail, Google et Apple
  - Storage pour les photos
  - Realtime pour le fil en direct
  - Edge Functions (Deno) pour l'envoi des push, la modération et les tâches planifiées
  - `pg_cron` pour les jobs récurrents
- **Push** : librairie `web-push` côté Edge Function, avec des clés VAPID en variables d'environnement.
- **Hébergement front** : Vercel ou Netlify, en déploiement statique.
- **Qualité** : ESLint, Prettier, Vitest pour la logique métier, Playwright pour 3 ou 4 parcours critiques.

Si un choix te semble mauvais, dis-le **avant** de commencer et propose une alternative argumentée. Ne change rien sans mon accord.

---

## Modèle de données (à affiner)

- `profiles` : id (= auth.uid), pseudo unique, avatar, `reputation_score`, `home_area` (point arrondi à ~1 km), `alert_radius_km` (défaut 15), created_at
- `stores` : id, nom, enseigne (Leclerc, Carrefour, Auchan, Intermarché, Cultura, Fnac, Micromania, JouéClub, King Jouet, boutique TCG indépendante…), adresse, ville, code postal, `location` (geography Point), `osm_id`, horaires, `is_verified`, created_by
- `products` : id, nom (ex. « Display 36 boosters »), type (booster, display, ETB, coffret, tin, blister, bundle…), extension ou set, image facultative **uploadée par un admin, sans visuel officiel**, `is_active`. Catalogue **éditable par un admin**, sans liste codée en dur.
- `reports` : id, store_id, user_id, `status` (`in_stock` | `low_stock` | `out_of_stock` | `restock_incoming`), produits signalés (table de liaison `report_products` avec quantité estimée facultative), prix constaté facultatif, photo (chemin Storage), commentaire court, `reported_at`, `expires_at` (défaut +6 h), `reporter_distance_m` (distance au magasin au moment du signalement), `trust_score` calculé
- `report_votes` : report_id, user_id, vote (`confirm` | `deny` | `sold_out_now`), created_at. Unique par (report, user).
- `subscriptions` : user_id, filtres d'alerte (rayon, liste de produits ou types, enseignes, magasins favoris, heures silencieuses)
- `push_subscriptions` : user_id, endpoint, clés p256dh/auth, user_agent, created_at, last_success_at
- `store_favorites` : user_id, store_id
- `moderation_flags` : signalements d'abus sur un report ou une photo

Ajoute des **policies RLS strictes** sur chaque table. Un utilisateur ne modifie que ses propres données, la lecture des reports est publique, et l'écriture exige d'être connecté.

### Import initial des magasins
Écris un script (Node ou Edge Function) qui importe depuis **l'API Overpass d'OpenStreetMap** les magasins pertinents des départements 84 et 13 : grandes surfaces, magasins de jouets, culture, jeux vidéo et boutiques de jeux. Il doit dédoublonner par `osm_id`. Les utilisateurs peuvent aussi **proposer un magasin manquant**, qui reste en attente de validation admin.

---

## Fonctionnalités — V1 (MVP)

1. **Onboarding**
   - Il explique le concept en 3 écrans maximum.
   - Il demande la localisation (ou une saisie de ville ou code postal en repli) et le rayon d'alerte.
   - Il propose de choisir les produits ou types suivis.
   - Sur iOS non installé, il affiche l'écran guidé d'installation, puis demande la permission pour les notifications.
2. **Carte**
   - Elle affiche les magasins autour de l'utilisateur, avec un code couleur selon le signalement le plus récent et encore valide : vert = en stock, orange = stock faible, gris = rien de récent, rouge = épuisé confirmé.
   - Les marqueurs sont regroupés en clusters.
   - Un bouton « autour de moi » recentre la carte.
3. **Fil d'alertes**
   - Liste chronologique en temps réel (Supabase Realtime) des signalements dans le rayon.
   - Filtres par produit, par enseigne et par fraîcheur.
   - Chaque carte montre : magasin, distance, produits, ancienneté (« il y a 12 min »), photo, nombre de confirmations et badge de fiabilité.
4. **Signaler un restock** (≤ 20 secondes)
   - Les magasins proches sont présélectionnés selon la position.
   - Choix des produits en multi-sélection, puis du statut.
   - Photo fortement encouragée, avec bonus de réputation. Elle est compressée côté client (WebP, ≤ 1600 px) et **les métadonnées EXIF sont supprimées**.
   - **Garde-fou anti-fake** : le signalement n'est accepté que si l'utilisateur se trouve à ≤ 300 m du magasin. La vérification est faite côté serveur et seule la distance est stockée. Une exception est possible pour les utilisateurs à haute réputation, avec le flag « signalé à distance ».
   - Limite de fréquence : 10 signalements par heure par utilisateur au maximum, et 1 par magasin toutes les 30 minutes.
5. **Vote sur un signalement**
   - Trois choix : « Confirmé », « Faux » ou « Plus rien ».
   - Un vote « Plus rien » valide passe le report en épuisé et coupe les nouvelles notifications.
6. **Fiche magasin**
   - Infos, horaires, itinéraire (lien vers l'app de navigation native) et favoris.
   - Historique des signalements.
   - **Heatmap jour × heure des restocks constatés**, visible dès qu'il y a assez de données.
7. **Notifications push**
   - Elles sont déclenchées par la création d'un report **et** par sa première confirmation, au choix de l'utilisateur. Le second mode réduit les fausses alertes.
   - Elles respectent les filtres de rayon, de produits, d'enseignes et les heures silencieuses.
   - **Dédoublonnage** : un utilisateur ne reçoit pas deux push pour le même magasin en moins de 2 heures.
   - Au clic, la notification ouvre directement le report.
   - Les endpoints morts (410/404) sont supprimés.
8. **Réputation**
   - Le score monte quand un report est confirmé par d'autres ou porte une photo.
   - Il baisse quand un report est infirmé ou modéré.
   - Des badges simples sont affichés (Nouveau, Fiable, Éclaireur…).
   - Le `trust_score` d'un report combine la réputation de l'auteur, la photo, les votes et la fraîcheur.
9. **Compte**
   - Pseudo, préférences d'alerte, magasins favoris, historique de ses signalements.
   - Export des données en JSON et suppression du compte.
10. **Admin** (route protégée par un rôle)
    - Gestion du catalogue produits.
    - Validation des magasins proposés.
    - File de modération des reports et photos signalés, avec bannissement d'un utilisateur.

## Fonctionnalités — V2 (prévoir l'architecture, ne pas coder)

- **Prédiction de restock** par magasin, d'abord statistique (fréquence par jour de semaine et créneau, avec intervalle de confiance), affichée comme « Restock probable mardi matin (confiance moyenne) ».
- Alertes « restock probable demain » pour les favoris.
- Classement mensuel des contributeurs locaux.
- Partage d'un report vers WhatsApp, Instagram ou Discord avec image Open Graph générée.
- Extension aux autres TCG (One Piece, Lorcana, Magic).

---

## Exigences techniques

- **Offline** : cache de la coquille de l'app et des derniers reports consultés. Un signalement créé hors ligne est mis en file d'attente puis envoyé au retour du réseau (Background Sync, avec repli manuel sur iOS).
- **Performance** : Lighthouse ≥ 90 en Performance, Accessibilité, Best Practices et PWA. Bundle initial < 200 ko gzip, avec lazy loading de la carte et de l'admin.
- **Sécurité** : toutes les règles métier (distance, rate limit, votes uniques, calcul de réputation) sont appliquées **côté serveur**, par fonctions Postgres ou Edge Functions, jamais seulement côté client. Validation des entrées avec Zod. Les photos passent par une Edge Function qui vérifie le type MIME et la taille.
- **Expiration** : un job `pg_cron` toutes les 15 minutes fait expirer les reports et recalcule les statistiques des magasins.
- **Accessibilité** : navigation clavier, labels ARIA, contrastes AA, et une liste alternative à la carte.
- **Configuration** : un fichier `.env.example` documenté et un script de génération des clés VAPID.
- **Données de démo** : un script de seed avec quelques magasins réels de la zone et des reports fictifs, à utiliser **uniquement en local**.

---

## Direction artistique

### L'intention
Je ne veux **surtout pas** une interface générique « faite par une IA ». L'app doit avoir une **personnalité propre**, être **jolie et chaleureuse**, avec des formes douces et généreuses. Elle doit **évoquer l'univers Pokémon** (jeux, cartes, aventure, collection) **sans le singer** : un fan doit sentir la familiarité, sans qu'on puisse confondre l'app avec un produit officiel.

Mots-clés : *ludique mais lisible, collection, aventure, objet qu'on a envie de toucher, soigné, vivant.*

### Veille obligatoire avant de designer
Avant tout écran, fais une **vraie veille** et rends-moi un court **moodboard commenté** (liens et ce que tu en retiens). Pistes :
- **Interfaces des jeux Pokémon récents** (menus de Pokémon Écarlate/Violet, Légendes Z-A, Pokémon GO, Pokémon TCG Pocket, Pokémon Sleep). Analyse les **principes** : formes, rythme, usage de la couleur, micro-animations, ton des textes. **Ne reprends aucun asset.**
- **Le design des cartes à collectionner elles-mêmes** : cadres, bandeaux de type, effets holo et reverse, symboles de rareté. C'est une mine pour des composants « carte » originaux.
- **Apps grand public réputées pour leur caractère** : Duolingo, Airbnb, Headspace, Arc, Things, Partiful, Mobbin. Observe comment elles rendent une UI attachante sans la surcharger.
- **Tendances UI mobiles actuelles** sur Dribbble, Mobbin, Godly et Awwwards. Repère ce qui distingue une UI « signée » d'une UI template.

Ensuite, propose **2 ou 3 directions visuelles distinctes** sous forme de *style tiles* : palette, typo, un bouton, une carte de signalement, un marqueur de carte et un badge. Explique chacune en 2 ou 3 lignes. **J'en choisis une avant que tu codes les écrans.** Si le skill `frontend-design` est disponible, utilise-le.

### Lignes directrices
- **Formes** : border-radius généreux et **cohérent**, défini dans une vraie échelle de tokens (par exemple 10 / 16 / 24 / 32 px et pill). Les boutons doivent paraître « pressables » : léger relief, ombre portée colorée plutôt que grise, petit enfoncement au tap.
- **Couleurs** : une palette inspirée de l'univers, pas copiée. Pistes à explorer et à affiner :
  - un **rouge chaud** façon Poké Ball, utilisé avec parcimonie pour l'action principale et les alertes ;
  - un **jaune électrique** comme accent, pour les badges, les « nouveau » et les célébrations ;
  - un **fond crème ou papier** plutôt qu'un blanc pur ;
  - une **encre bleu nuit** plutôt qu'un noir.
  - Les **couleurs des types** (Feu, Eau, Plante, Électrik, Psy…) peuvent inspirer une palette secondaire pour catégoriser les produits ou les enseignes, en version désaturée et harmonisée.
  - Un **mode sombre** soigné, pensé et non simplement inversé : par exemple un bleu nuit profond façon « exploration de nuit ».
- **Typographie** : une police de titres **avec du caractère**, arrondie ou ronde mais pas enfantine, associée à une police de texte très lisible. Propose 2 ou 3 paires issues de Google Fonts ou en open source, et justifie ton choix. Évite le « tout Inter » par défaut.
- **Composants signature** à concevoir avec soin :
  - la **carte de signalement**, qui s'inspire d'une carte à collectionner (cadre, bandeau de statut, « rareté » selon la fiabilité) ;
  - un **effet holo / reflet subtil** (dégradé animé au mouvement ou au survol), réservé aux reports très fiables ou aux badges de réputation ;
  - des **marqueurs de carte** originaux par statut ;
  - les **badges de réputation**, à collectionner comme des badges d'arène, mais avec un dessin original ;
  - les **états vides et le chargement**, qui doivent rester vivants et drôles (petite illustration ou animation maison, texte avec du ton).
- **Iconographie** : un seul set cohérent (Phosphor ou Lucide en style arrondi, par exemple), éventuellement complété de quelques pictos maison. **Aucun emoji comme icône d'interface.**
- **Motion** : des micro-interactions qui ont du sens. Un petit rebond à la validation d'un signalement, une célébration discrète quand un report est confirmé, des transitions fluides entre la carte et la fiche. Respecte `prefers-reduced-motion`.
- **Ton des textes** : complice et enthousiaste, vocabulaire de chasseur ou de dresseur dosé (« Restock repéré ! », « Fausse piste »), jamais lourd. Ça fait partie du design.

### À éviter absolument (le look « IA générique »)
- Les dégradés violet-bleu, le glassmorphism partout, les fonds avec des blobs flous.
- L'apparence par défaut de shadcn/Tailwind UI sans personnalisation : gris neutres, radius uniformes de 8 px, ombres grises.
- Les grilles de « feature cards » identiques, l'excès d'emojis, les textes marketing creux.
- Tout logo, sprite, illustration, Poké Ball reconnaissable ou police officielle Pokémon. On **évoque**, on ne **reproduit** pas.

### Livrables design
- Un **fichier de tokens** (couleurs, radius, ombres, espacements, typo, durées d'animation), consommé par Tailwind via sa config ou des variables CSS. Pas de valeurs magiques dans les composants.
- Une **page `/design`**, accessible en dev uniquement, qui présente tous les composants et leurs états, en clair et en sombre.
- Des captures mobiles des écrans clés à chaque phase, pour que je valide le rendu.

---

## Méthode de travail attendue

1. **Avant d'écrire du code**, propose-moi :
   - l'arborescence du projet ;
   - le schéma SQL complet avec les policies RLS ;
   - la liste des Edge Functions ;
   - un découpage en phases livrables.
   Attends ma validation.
2. Travaille **phase par phase**. À la fin de chaque phase :
   - lance lint, typecheck et tests ;
   - résume ce qui fonctionne et ce qui reste ;
   - liste précisément les actions que je dois faire moi-même (création du projet Supabase, variables d'env, DNS…).
3. Découpage suggéré :
   - **Phase 0** : veille design, moodboard, 2 ou 3 directions visuelles. J'en choisis une, puis tu crées les tokens et la page `/design`.
   - **Phase 1** : setup, PWA de base installable, auth, schéma DB, import des magasins OSM.
   - **Phase 2** : carte, fiche magasin, signalement avec photo et garde-fous.
   - **Phase 3** : fil temps réel, votes, réputation.
   - **Phase 4** : notifications push de bout en bout, testées sur iOS installé et sur Android.
   - **Phase 5** : admin, modération, offline, RGPD et pages légales.
   - **Phase 6** : optimisation Lighthouse, tests Playwright, documentation de déploiement.
4. Si une décision produit n'est pas couverte ici, **pose-moi la question** au lieu de deviner.
5. Écris un `README.md` clair : installation locale, déploiement, variables d'env et procédure pour tester les push sur iPhone.
