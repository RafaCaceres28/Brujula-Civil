import { requireUser } from '@/features/auth/server/require-user';
import { resolveOnboardingEntry } from '@/features/wizard/server/resolve-onboarding-entry';
import { redirect } from 'next/navigation';

export default async function OnboardingPage() {
  const user = await requireUser();
  const targetRoute = await resolveOnboardingEntry(user.id);

  redirect(targetRoute);
}
