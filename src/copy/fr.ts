import { APP_NAME } from '@/config/app'

// Every user-facing string lives here (NFR14).
export const copy = {
  canary: {
    tagline: 'Les restocks de cartes en magasin, repérés par la communauté.',
    version: (version: string) => `Version ${version}`,
    status: "Le chantier démarre. Prochaine étape : l'identité visuelle.",
  },
  footer: {
    disclaimer: `${APP_NAME} est un projet communautaire indépendant, non affilié à Nintendo, The Pokémon Company, Creatures ou Game Freak.`,
  },
  notFound: {
    title: 'Fausse piste',
    body: "Cette page n'existe pas, ou plus.",
    back: "Retour à l'accueil",
  },
} as const
