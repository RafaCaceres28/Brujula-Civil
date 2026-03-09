import { routes } from '@/lib/constants/routes';

export const marketingNav = [
  { label: 'Cómo funciona', href: routes.marketing.howItWorks },
  { label: 'Precios', href: routes.marketing.pricing },
  { label: 'Contacto', href: routes.marketing.contact },
] as const;

export const appNav = [
  { label: 'Dashboard', href: routes.app.dashboard },
  { label: 'Onboarding', href: routes.app.onboarding },
  { label: 'Perfil', href: routes.app.profile },
  { label: 'Traducción', href: routes.app.translation },
  { label: 'CV', href: routes.app.cv },
  { label: 'LinkedIn', href: routes.app.linkedin },
  { label: 'Ajustes', href: routes.app.settings },
] as const;
