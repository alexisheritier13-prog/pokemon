# Core Workflows

## Créer un signalement (en ligne)

```mermaid
sequenceDiagram
  participant U as App
  participant DB as Postgres (create_report)
  participant EF as Edge upload-report-photo
  participant ST as Storage
  participant NET as pg_net
  participant SP as Edge send-push
  U->>U: Position (watchPosition), compression photo (WebP/JPEG, sans EXIF)
  U->>DB: rpc create_report(client_id, store_id, lat, lng, status, products, captured_at…)
  DB->>DB: lock user, distance PostGIS, rate limits, insert report + products, trust
  DB->>DB: trigger → insert push_jobs('created') si statut positif
  DB-->>U: report
  Note over DB,NET: après COMMIT
  NET->>SP: POST {job_id} (x-push-secret)
  SP->>DB: rpc svc_claim_push_targets(job_id)
  Note over SP: aucun destinataire en mode 'created' par défaut :<br/>la plupart attendent la 1re confirmation
  U->>EF: multipart {report_id, photo, thumb} (JWT)
  EF->>EF: auteur, âge < 15 min, taille, signature binaire, pas d'EXIF
  EF->>ST: upload service_role
  EF->>DB: rpc svc_attach_report_photo
  EF-->>U: paths
```

## Vote et première confirmation → push

```mermaid
sequenceDiagram
  participant V as App (votant)
  participant DB as Postgres (cast_vote)
  participant NET as pg_net
  participant SP as Edge send-push
  participant PS as Service push
  participant SW as SW destinataire
  V->>DB: rpc cast_vote(report_id, 'confirm', lat, lng)
  DB->>DB: distance ≤ 300 m, upsert vote, recompte, 1re confirmation ?
  DB->>DB: réputation auteur +3, push_jobs('first_confirm'), trust
  DB-->>V: report à jour
  NET->>SP: POST {job_id}
  SP->>DB: svc_claim_push_targets → abonnements éligibles (dédoublonnage 2 h atomique)
  loop par abonnement (10 en parallèle)
    SP->>PS: web-push sendNotification (VAPID, TTL 3h, topic magasin)
    PS-->>SP: 201 / 404 / 410
  end
  SP->>DB: svc_finish_push_job(ok_ids, gone_ids…)
  PS->>SW: push
  SW->>SW: showNotification(tag = store)
  SW->>V: notificationclick → openWindow('/r/:id')
```

## Signalement hors ligne

```mermaid
sequenceDiagram
  participant U as App
  participant IDB as IndexedDB outbox
  participant SW as Service Worker
  participant DB as Postgres
  U->>U: pas de réseau : capture position + heure + photos
  U->>IDB: put {client_id, payload, blobs, captured_at}
  U->>SW: registration.sync.register('outbox') (si supporté)
  Note over U: bandeau « Envoi dès que ça capte »
  alt Retour réseau, app ouverte
    U->>DB: flush : create_report(client_id…) puis upload photo
  else Retour réseau, app fermée (Chrome/Android)
    SW->>SW: événement sync
    SW->>SW: aucune fenêtre ouverte → notification locale « Ton signalement est prêt à partir »
    SW->>U: tap → ouverture de l'app → flush
  end
  DB-->>U: OK, ou capture_too_old (> 2 h) → message et retrait de la file
```

*Choix assumé :* le service worker n'envoie pas lui-même les signalements. La session Supabase vit dans le contexte de la page, et la rafraîchir depuis le SW ferait tourner le refresh token en concurrence avec la page, avec un risque de déconnexion. Background Sync sert donc de **réveil**, pas de transport.

## Temps réel du fil
Le client s'abonne à `postgres_changes` (INSERT et UPDATE) sur `public.reports`. La RLS s'applique : un signalement masqué n'est jamais diffusé. Chaque évènement est filtré **côté client** : on ne garde que les `store_id` présents dans la liste des magasins chargée en cache (`get_launch_stores`), puis on applique la distance au centre de l'utilisateur (haversine, `src/lib/geo.ts`) et les filtres actifs. Une fois les informations du magasin et des produits complétées via `feed_reports`, la pastille « N nouveaux signalements » s'incrémente. L'abonnement se coupe au passage en arrière-plan (`visibilitychange`) et le rattrapage se fait au retour par refetch du fil. *Passage à l'échelle nationale :* canaux Realtime **Broadcast par département**, alimentés par trigger, au lieu des Postgres Changes globaux.
