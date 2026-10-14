import { APP_NAME } from '@/config/app'

// Every user-facing string lives here (NFR14).
export const copy = {
  canary: {
    tagline: 'Les restocks de cartes en magasin, repérés par la communauté.',
    version: (version: string) => `Version ${version}`,
    status: "Le chantier démarre. L'identité visuelle est en place, la carte arrive bientôt.",
  },
  footer: {
    disclaimer: `${APP_NAME} est un projet communautaire indépendant, non affilié à Nintendo, The Pokémon Company, Creatures ou Game Freak.`,
  },
  notFound: {
    title: 'Fausse piste',
    body: "Cette page n'existe pas, ou plus.",
    back: "Retour à l'accueil",
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
