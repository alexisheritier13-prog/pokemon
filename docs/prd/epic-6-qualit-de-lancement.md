# Epic 6 Qualité de lancement

Valider que l'app tient ses promesses de performance et de qualité, puis donner au porteur tout ce qu'il faut pour déployer et exploiter seul.

## Story 6.1 Audit performance et Lighthouse
As a porteur de projet,
I want des scores Lighthouse mobile ≥ 90 sur les pages clés,
so that l'app est rapide sur les téléphones modestes.

### Acceptance Criteria
1: Lighthouse mobile est ≥ 90 en Performance, Accessibilité et Best Practices sur Carte, Fil et Fiche magasin. Les rapports sont archivés.
2: Le bundle initial reste < 200 ko gzip (contrôle CI vert).
3: Les régressions sont corrigées, et Lighthouse CI est ajouté au pipeline si le quota le permet.

## Story 6.2 Audit d'accessibilité
As a utilisateur en situation de handicap,
I want une app utilisable au clavier et au lecteur d'écran,
so that je ne suis pas exclu.

### Acceptance Criteria
1: Le passage axe automatique ne remonte aucune violation sérieuse sur les écrans principaux.
2: Les parcours principaux sont testés manuellement avec VoiceOver (iOS) et au clavier (desktop), et les problèmes trouvés sont corrigés.

## Story 6.3 Parcours E2E consolidés
As a porteur de projet,
I want les parcours critiques testés automatiquement,
so that une régression ne passe pas en production.

### Acceptance Criteria
1: Quatre parcours Playwright s'exécutent en CI sur base locale seedée : consultation anonyme carte → fiche, signalement complet, vote, et onboarding avec préférences d'alerte.
2: La géolocalisation est simulée, et les tests sont stables (aucun test instable toléré).

## Story 6.4 Documentation et mise en production
As a porteur de projet,
I want une documentation complète de déploiement et d'exploitation,
so that je mets en ligne et maintiens l'app seul.

### Acceptance Criteria
1: Le `README.md` couvre l'installation locale, les variables d'env, la création du projet Supabase cloud (extensions, providers Google et Apple, secrets, cron), le déploiement front, l'import OSM, la génération VAPID et la **procédure de test des push sur iPhone**.
2: Une check-list de mise en production est fournie : domaine, URLs de redirection auth, **SMTP Resend avec domaine vérifié (bloquant)**, modèle d'e-mail avec code OTP, sauvegardes et surveillance de la mise en pause Supabase.

---
