import { AppShell } from '@/components/layout/app-shell';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { ensureUserBootstrap } from '@/features/profile/server/ensure-user-bootstrap';

type AppLayoutProps = {
  children: React.ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const user = await getRequiredUser();

  await ensureUserBootstrap(user.id);

  return <AppShell>{children}</AppShell>;
}
