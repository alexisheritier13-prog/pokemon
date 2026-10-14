# Requirements

## Functional

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

## Non Functional
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
