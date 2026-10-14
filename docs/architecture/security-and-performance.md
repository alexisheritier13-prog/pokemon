# Security and Performance

## Security Requirements
**Frontend Security :**
- CSP stricte (voir `vercel.json`), sans script inline ni CDN tiers.
- Aucun secret dans le bundle : seules les variables `VITE_*` publiques sont lues, validées par Zod.
- Stockage de session par défaut de supabase-js (localStorage), avec flux PKCE.

**Backend Security :**
- RLS partout, écritures sensibles en RPC `security definer` avec `search_path` vide.
- Validation Zod dans les Edge Functions et validation SQL (types, `check`, longueurs).
- Rate limits applicatifs (signalements, votes implicitement par la distance, `log_client_error`) en plus des limites natives de Supabase Auth.
- CORS des Edge Functions restreint à `APP_URL` et à localhost.
- Fonctions internes protégées par `x-push-secret`, et `svc_*` exécutables par `service_role` seulement.
- Photos : contrôle par signature binaire, refus de tout EXIF, vérification de taille et de type au niveau du bucket.

**Authentication Security :**
- **Token Storage :** session supabase-js (JWT 1 h, refresh tournant).
- **Session Management :** déconnexion sur toutes les pages, et ban vérifié côté serveur à chaque écriture.
- **Password Policy :** aucun mot de passe (magic link, code OTP, OAuth).

**Anti-fraude (limites assumées) :** la position vient du client et peut être falsifiée. La règle des 300 m reste un filtre utile, et les vraies défenses sont les votes sur place, la réputation, la modération et les rate limits. Évolution possible : détecter les « déplacements impossibles » (deux signalements trop éloignés en trop peu de temps).

## Performance Optimization
**Frontend Performance :**
- **Bundle Size Target :** < 200 ko gzip pour le JS initial (`size-limit` en CI). MapLibre, l'admin, `opening_hours` et `/design` sont dans des chunks séparés.
- **Loading Strategy :** routes lazy, préchargement de la police display, squelettes, `content-visibility` sur le fil.
- **Caching Strategy (Workbox) :**
  - coquille en precache ;
  - tuiles OpenFreeMap en `CacheFirst` (300 entrées, 14 jours) ;
  - photos Storage en `CacheFirst` (200 entrées, 7 jours) ;
  - styles et glyphes de la carte en `StaleWhileRevalidate` ;
  - **aucun cache SW sur l'API Supabase** (géré par TanStack Query et sa persistance).

**Backend Performance :**
- **Response Time Target :** RPC < 150 ms au p95 (index GiST sur `stores.location`, index partiels sur les signalements vivants).
- **Database Optimization :** requêtes paginées par curseur, `get_launch_stores` mis en cache 24 h côté client, et rafraîchissement incrémental des statistiques.
- **Free tier :** 500 Mo de base, 1 Go de stockage (rétention D4), 200 connexions Realtime simultanées, 500 000 invocations Edge par mois. Ces limites sont surveillées dans le panneau admin « Santé ».
