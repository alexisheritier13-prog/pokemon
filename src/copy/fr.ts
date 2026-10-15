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
  },
  auth: {
    title: 'Rejoins les chasseurs',
    intro:
      'Connecte-toi pour signaler, voter et recevoir les alertes. Pas de mot de passe à retenir.',
    emailLabel: 'Ton adresse e-mail',
    emailHint: 'On t’envoie un code à 6 chiffres et un lien de connexion.',
    sendCode: 'Recevoir mon code',
    codeSentTitle: 'Regarde tes e-mails',
    codeSent: (email: string) =>
      `Code envoyé à ${email}. Tape-le ci-dessous, ou ouvre le lien reçu.`,
    codeLabel: 'Code à 6 chiffres',
    verify: 'Me connecter',
    resend: 'Renvoyer un code',
    resendIn: (seconds: number) => `Renvoyer dans ${seconds} s`,
    changeEmail: 'Changer d’adresse',
    or: 'ou',
    google: 'Continuer avec Google',
    apple: 'Continuer avec Apple',
    callbackWorking: 'Connexion en cours…',
    callbackFailed: 'Ce lien ne fonctionne plus. Demande un nouveau code.',
    backToLogin: 'Retour à la connexion',
    errors: {
      invalidEmail: 'Cette adresse ne semble pas valide.',
      invalidCode: 'Le code doit faire 6 chiffres.',
      wrongCode: 'Ce code ne marche pas, ou il a expiré. Vérifie-le ou demande-en un nouveau.',
      tooMany: 'Trop de tentatives. Patiente un peu avant de réessayer.',
      network: 'Pas de réseau. Réessaie dès que ça capte.',
      unavailable: 'La connexion n’est pas disponible pour le moment.',
      unknown: 'La connexion a échoué. Réessaie dans un instant.',
    },
  },
  account: {
    anonymousTitle: 'Ta carte de chasseur t’attend',
    anonymousBody:
      'Connecte-toi pour choisir ton pseudo, suivre tes signalements et collectionner tes badges.',
    signIn: 'Me connecter',
    pseudoLabel: 'Pseudo',
    pseudoHint: '3 à 20 caractères : lettres, chiffres, tirets.',
    save: 'Enregistrer',
    saved: 'Pseudo enregistré.',
    signOut: 'Me déconnecter',
    signedOut: 'À bientôt !',
    badgesTitle: 'Mes badges',
    reputation: (points: number) => `${points} point${points > 1 ? 's' : ''} de réputation`,
    errors: {
      pseudoFormat: 'Entre 3 et 20 caractères : lettres, chiffres, tirets ou soulignés.',
      pseudoTaken: 'Ce pseudo est déjà pris.',
      unknown: 'L’enregistrement a échoué. Réessaie.',
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
  pwa: {
    offline: 'Pas de réseau. Tu vois les dernières infos chargées.',
    updateAvailable: 'Une nouvelle version est prête.',
    reload: 'Mettre à jour',
    later: 'Plus tard',
  },
  common: {
    loading: 'Chargement…',
    close: 'Fermer',
    undo: 'Annuler',
  },
} as const
