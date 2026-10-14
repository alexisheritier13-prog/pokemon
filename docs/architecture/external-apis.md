# External APIs

## OpenFreeMap
- **Purpose :** tuiles vectorielles, glyphes et sprites pour MapLibre.
- **Documentation :** https://openfreemap.org
- **Base URL(s) :** `https://tiles.openfreemap.org/planet` (source vectorielle), `https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf`
- **Authentication :** aucune.
- **Rate Limits :** pas de quota publié (service communautaire gratuit). Nous mettons les tuiles en cache (300 entrées, 14 jours).
- **Integration Notes :** **nos deux styles JSON** (`public/map/style-light.json`, `public/map/style-dark.json`) sont dérivés du style « positron » et recolorés aux tokens papier et encre. L'attribution « © OpenFreeMap © OpenStreetMap » est obligatoire.

## Géoplateforme IGN — géocodage
- **Purpose :** convertir une ville ou un code postal en coordonnées (repli si la position est refusée) et autocompléter l'adresse lors d'une proposition de magasin.
- **Documentation :** https://geoservices.ign.fr/documentation/services/services-geoplateforme/geocodage
- **Base URL(s) :** `https://data.geopf.fr/geocodage`
- **Authentication :** aucune.
- **Rate Limits :** 50 requêtes par seconde et par IP (hérité de l'API Adresse). Saisie débouncée à 300 ms.
- **Key Endpoints Used :**
  - `GET /search?q=&index=address&type=municipality&limit=5` : villes et codes postaux ;
  - `GET /search?q=&index=address&limit=5` : adresses.
- **Integration Notes :** l'URL est paramétrable (`VITE_GEOCODER_URL`). Les réponses sont en GeoJSON, comme l'ancienne API Adresse.

## Overpass API (OSM)
- **Purpose :** import initial et rafraîchissement des magasins.
- **Base URL(s) :** `https://overpass-api.de/api/interpreter`
- **Rate Limits :** usage raisonnable, 1 requête par département, avec pause et retry exponentiel en cas de 429.
- **Integration Notes :** voir le paragraphe « Import OSM ». Licence ODbL, attribution sur la carte.

## Web Push (APNs, FCM, Mozilla autopush)
- **Purpose :** distribution des notifications. L'endpoint est fourni par le navigateur.
- **Authentication :** VAPID (clé publique côté client, clé privée en secret Edge).
- **Integration Notes :** `TTL` de 3 h (une info de stock vieillit vite), `urgency: high`, `topic` = magasin (une nouvelle notification remplace la précédente non lue sur le même magasin). Un 404 ou 410 supprime l'abonnement.
