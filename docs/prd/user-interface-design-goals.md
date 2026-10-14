# User Interface Design Goals

## Overall UX Vision
Une app de poche qu'on dégaine au rayon et qu'on consulte avant de prendre la voiture. **Ludique mais lisible** : on doit sentir l'univers « collection et aventure », avec des formes généreuses, des boutons qu'on a envie de presser et des cartes de signalement qui rappellent les cartes à collectionner. La lecture d'une info doit rester **immédiate** : statut, magasin, distance, fraîcheur et fiabilité en un coup d'œil. Le ton est complice (« Restock repéré ! », « Fausse piste »), jamais lourd. La direction artistique détaillée (contraintes, à-éviter, composants signature) est dans le prompt source et sera instanciée par l'UX Expert en phase 0.

## Key Interaction Paradigms
- **Barre d'onglets basse** à 4 entrées (Carte, Fil, Compte, et un **bouton central « Signaler »** mis en avant), tenue au pouce.
- **Carte ↔ fiche** : un tap sur un marqueur ouvre une **feuille glissante** (aperçu), qu'on tire pour la fiche complète, avec une transition continue.
- **Signalement en 3 temps**, sur un seul écran progressif : magasin présélectionné, produits en jetons multi-sélection, statut en gros boutons. Photo et commentaire viennent en option, puis l'envoi déclenche un rebond de validation.
- **Vote en un tap** depuis la carte de signalement, avec une célébration discrète quand on confirme.
- **Temps réel non intrusif** : une pastille « 3 nouveaux signalements » en haut du fil, plutôt qu'un saut de liste.
- **Permissions contextuelles** : position et notifications demandées au moment où elles prennent sens, jamais d'office.

## Core Screens and Views
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

## Accessibility: WCAG AA
WCAG 2.2 AA, avec la carte doublée d'une liste, les statuts jamais portés par la couleur seule (forme et icône du marqueur, libellé texte) et les animations neutralisées sous `prefers-reduced-motion`.

## Branding
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

## Target Device and Platforms: Web Responsive
Mobile en priorité (iPhone et Android, de 360 à 430 px de large). Tablette et desktop sont supportés en mise en page élargie, sans être optimisés en V1.
