# Check-list d'installabilité PWA

> Remplace le score « PWA » de Lighthouse, retiré en version 12 (décision du porteur, 2026-10-14). À rejouer avant chaque mise en production importante.

## Vérifié automatiquement ou en local (story 1.4, 2026-10-14)

| # | Critère | Comment c'est vérifié | État |
|---|---|---|---|
| 1 | Servie en HTTPS | Vercel (HTTPS forcé, HSTS dans `vercel.json`) | OK |
| 2 | Manifest lié et valide | `dist/manifest.webmanifest` : `name`, `short_name`, `id`, `start_url`, `scope`, `display: standalone`, `lang: fr`, `theme_color` et `background_color` = `--paper` (test `theme-colors.test.ts`) | OK |
| 3 | Icônes 192 et 512 px, plus maskable | `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `favicon.ico` (48 px), `pwa-64x64.png`, générées depuis `public/logo.svg` (`pwa-assets.config.ts`) | OK |
| 4 | Icône et écrans de démarrage iOS | `apple-touch-icon-180x180.png` et **80** `apple-touch-startup-image`, en clair et en sombre, injectés dans `index.html` | OK |
| 5 | Mode standalone iOS | `apple-mobile-web-app-capable`, `status-bar-style`, `apple-mobile-web-app-title`, `viewport-fit=cover` et zones sûres CSS | OK |
| 6 | Service worker actif sur `/` | Build de prod servi en local : SW `activated`, scope `/`, 19 entrées en précache | OK |
| 7 | Démarrage hors ligne | Serveur arrêté puis rechargement de `/fil` (page jamais visitée) : coquille et page servies par le SW | OK |
| 8 | Mise à jour | Invite « Une nouvelle version est prête » (`registerType: prompt`), vérification toutes les heures, `SKIP_WAITING` | OK (code) |
| 9 | Raccourcis d'app | `shortcuts` : « Signaler un restock » (`/signaler`) et « Voir le fil » (`/fil`) | OK |
| 10 | Cache du SW côté hébergeur | `service-worker.js` et `manifest.webmanifest` en `max-age=0, must-revalidate` (`vercel.json`) | OK |

## À vérifier par le porteur sur de vrais appareils

| # | Test | Résultat |
|---|---|---|
| A | **Android / Chrome** : ouvrir l'URL de prod, menu ⋮ → « Installer l'application ». L'icône apparaît sur l'écran d'accueil, l'app s'ouvre sans barre d'adresse, et l'écran de démarrage utilise le fond papier. | à faire |
| B | **iPhone / Safari** : Partager → « Sur l'écran d'accueil ». L'icône est correcte, l'écran de démarrage clair (ou sombre si l'iPhone est en mode sombre), et la barre d'onglets ne passe pas sous la barre d'accueil. | à faire |
| C | **Hors ligne sur téléphone** : app installée, mode avion, ouvrir l'app. La coquille s'affiche avec le bandeau « Pas de réseau ». | à faire |
| D | **Mise à jour** : après un nouveau déploiement, rouvrir l'app installée. L'invite « Mettre à jour » apparaît (au plus tard au prochain lancement). | à faire |
| E | **Chrome DevTools** (ordinateur) → Application → Manifest : aucune erreur ni avertissement bloquant. | à faire |
