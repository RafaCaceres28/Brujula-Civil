export const routes = {
  marketing: {
    home: '/',
    howItWorks: '/como-funciona',
    pricing: '/precios',
    contact: '/contacto',
  },
  auth: {
    login: '/login',
    register: '/registro',
    forgotPassword: '/recuperar-password',
    callback: '/callback',
  },
  app: {
    dashboard: '/dashboard',
    onboarding: '/onboarding',
    profile: '/perfil',
    translation: '/traduccion',
    cv: '/cv',
    linkedin: '/linkedin',
    settings: '/ajustes',
  },
} as const;
