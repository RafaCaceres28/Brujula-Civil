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
      <ProfileSummaryCard summary={summary} state={summaryState} />
      <ProfileForm userId={user.id} initialValues={initialValues} />
    </PageShell>
  );
}
