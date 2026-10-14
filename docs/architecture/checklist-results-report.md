# Checklist Results Report
Revue rapide avec `architect-checklist`. La passe complète sera faite par le PO (`po-master-checklist`) après validation.
- **Couverture PRD :** les FR1 à FR41 ont chacune un support (table, RPC, Edge, composant ou cron). Les NFR1 à NFR16 sont couvertes (sécurité, RGPD, budget, a11y, coût, fuseau).
- **Risques ouverts :**
  - (1) `web-push` sous Deno : spike en story 1.6 ;
  - (2) magic link dans une PWA iOS : code OTP prévu ;
  - (3) limites Free (stockage photo, e-mails, mise en pause) : D3, D4 et surveillance ;
  - (4) fiabilité d'OpenFreeMap, sans SLA : l'URL des tuiles est dans le style JSON, donc facile à basculer (MapTiler ou Stadia en dernier recours, avec clé).
- **Décisions :** D1, D2 et D4 validées. **D3 (SMTP) reportée** par le porteur : en local, Mailpit ; en prod avant ouverture, l'expéditeur par défaut ne livre qu'aux membres de l'équipe. **Bloquant pour l'ouverture publique** (check-list story 6.4).

> **Note PO (2026-10-14) — migrations :** la numérotation 0001-0013 ci-dessus est un **regroupement logique** du schéma cible. En pratique, chaque story crée la ou les migrations dont elle a besoin, dans l'ordre des epics : 1.5 → 0001-0004 et la RLS associée ; 2.5 → reports, votes, fonctions cœur, jobs ; 4.x → push ; 5.x → modération. Le contenu SQL de référence reste celui de ce document.
