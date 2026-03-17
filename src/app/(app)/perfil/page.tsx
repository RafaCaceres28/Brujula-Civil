import Link from 'next/link';
import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { getCurrentUser } from '@/features/auth/server/get-current-user';
import { ProfileForm } from '@/features/profile/components/profile-form';
import {
  ProfileSummaryCard,
  deriveProfileSummaryVisualState,
} from '@/features/profile/components/profile-summary-card';
import {
  PROFILE_SUMMARY_FALLBACKS,
  mapDomainToProfileFormInitialValues,
  mapDomainToProfileSummary,
} from '@/features/profile/services/profile.mapper';
import { getProfile } from '@/features/profile/server/get-profile';
import { routes } from '../../../lib/constants/routes';

function getEmptySummary() {
  return {
    fullName: PROFILE_SUMMARY_FALLBACKS.fullName,
    primaryGoal: PROFILE_SUMMARY_FALLBACKS.primaryGoal,
    location: PROFILE_SUMMARY_FALLBACKS.location,
  };
}

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Perfil page requires authenticated user from (app)/layout guard.');
  }

  const profile = await getProfile(user.id);
  const summary = profile ? mapDomainToProfileSummary(profile) : getEmptySummary();
  const summaryState = deriveProfileSummaryVisualState(summary);
  const initialValues = profile ? mapDomainToProfileFormInitialValues(profile) : undefined;

  return (
    <PageShell>
      <SectionHeader
        title="Perfil"
        description="Gestión de datos personales, experiencia militar y objetivo profesional."
      />
      <Link
        href={routes.app.profileEdit}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        Ir a editar perfil
      </Link>
      <ProfileSummaryCard summary={summary} state={summaryState} />
      <ProfileForm userId={user.id} initialValues={initialValues} />
    </PageShell>
  );
}
