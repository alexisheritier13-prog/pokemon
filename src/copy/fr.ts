import { APP_NAME } from '@/config/app'

// Every user-facing string lives here (NFR14).
export const copy = {
  footer: {
    disclaimer: `${APP_NAME} est un projet communautaire indépendant, non affilié à Nintendo, The Pokémon Company, Creatures ou Game Freak.`,
    version: (version: string) => `Version ${version}`,
  },
  nav: {
    label: 'Navigation principale',
    map: 'Carte',
    feed: 'Fil',
    report: 'Signaler',
    account: 'Compte',
  },
  placeholders: {
    map: {
      title: 'La carte arrive',
      body: 'Les magasins du Vaucluse et des Bouches-du-Rhône s’afficheront ici, avec leur dernier signalement.',
      action: 'Voir le fil',
    },
    feed: {
      title: 'Calme plat dans le coin',
      body: 'Le fil des restocks repérés autour de toi arrive très vite. Garde l’œil ouvert en rayon.',
      action: 'Retour à la carte',
    },
    report: {
      title: 'Prêt à signaler ?',
      body: 'Le signalement en 20 secondes arrive avec la carte. Ton premier restock repéré, c’est pour bientôt.',
      action: 'Retour à la carte',
    },
    account: {
      title: 'Ta carte de chasseur',
      body: 'Ton pseudo, tes badges et tes alertes vivront ici dès l’ouverture des comptes.',
      action: 'Retour à la carte',
    },
  },
  notFound: {
    title: 'Fausse piste',
    body: "Cette page n'existe pas, ou plus.",
    back: "Retour à l'accueil",
  },
  error: {
    title: 'Le radar a pris un coup',
    body: 'Quelque chose s’est mal passé de notre côté. Recharge la page, en général ça repart.',
    reload: 'Recharger',
  },
  status: {
    in_stock: 'En stock',
    low_stock: 'Stock faible',
    out_of_stock: 'Épuisé',
    restock_incoming: 'Restock annoncé',
    none: 'Rien de récent',
  },
  report: {
    remote: 'À distance',
    rarity: (value: number) => `Fiabilité ${value} sur 3`,
  },
  badges: {
    nouveau: 'Nouveau',
    fiable: 'Fiable',
    eclaireur: 'Éclaireur',
    veteran: 'Vétéran',
    locked: (name: string, progress: string) => `${name}, pas encore obtenu (${progress})`,
  },
  common: {
    loading: 'Chargement…',
    close: 'Fermer',
    undo: 'Annuler',
  },
} as const
