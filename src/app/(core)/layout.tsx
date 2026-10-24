import { AppShell } from '@/components/layout/app-shell';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { routes } from '@/lib/constants/routes';

export default async function CoreLayout({ children }: { children: React.ReactNode }) {
  await getRequiredUser(routes.app.translation);

  return <AppShell>{children}</AppShell>;
}
