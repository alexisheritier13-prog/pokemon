# Découpage en phases livrables

| Phase (prompt) | Epic PRD | Livrable vérifiable | Actions du porteur |
|---|---|---|---|
| 0 | — | Direction A + badges C, front-end spec ✅ | ✅ fait |
| 1 | Epic 1 (7 stories) | App installable déployée, tokens et `/design`, schéma de base (0001-0004 + RLS associée), auth (3 fournisseurs), magasins 84/13 importés, spike `web-push` | Créer le projet Supabase (Paris), le repo GitHub et le projet Vercel ; configurer Google OAuth, Apple (Services ID + clé), SMTP Resend, les Redirect URLs |
| 2 | Epic 2 (9 stories) | Carte et liste, fiche, onboarding, signalement avec photo et règles serveur, proposition de magasin, heatmap, seed démo | Tester sur téléphone un signalement réel près d'un magasin |
| 3 | Epic 3 (7 stories) | Fil temps réel, filtres, détail, votes, réputation, badges, holo, compte | Test à deux téléphones (vote sur place) |
| 4 | Epic 4 (4 stories) | Push de bout en bout, préférences, guide iOS, notification de test | Générer les clés VAPID en prod, renseigner les secrets Edge et Vault, tester sur iPhone installé et sur Android |
| 5 | Epic 5 (6 stories) | Admin, modération, hors ligne, export et suppression, pages légales | Choisir le nom définitif et le domaine, compléter les mentions légales (éditeur, hébergeur, contact) |
| 6 | Epic 6 (4 stories) | Lighthouse ≥ 90, audit a11y, 4 parcours E2E en CI, README et check-list de mise en prod | Brancher le domaine (DNS), vérifier le domaine Resend, test de production de bout en bout |
