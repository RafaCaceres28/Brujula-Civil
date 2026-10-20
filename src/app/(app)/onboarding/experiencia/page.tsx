import { unstable_rethrow } from 'next/navigation';
import { requireUser } from '@/features/auth/server/require-user';
import { getProfile } from '@/features/profile/server/get-profile';
import type { StructuredExperience } from '@/features/translation/schemas/structured-experience.schema';
import { OnboardingExperienceStep } from '@/features/wizard/components/onboarding-experience-step';
import { StepGuard } from '@/features/wizard/components/step-guard';
import { WizardShell } from '@/features/wizard/components/wizard-shell';
import { getOnboardingOverview } from '@/features/wizard/server/get-onboarding-overview';
import { getExperienciaStepDefaults } from '@/features/wizard/services/wizard-form.mapper';

export default async function ExperienciaStepPage() {
  const user = await requireUser();
  const overview = await getOnboardingOverview(user.id);
  const values = getExperienciaStepDefaults(overview.draft.experiencia);
  let experiences: StructuredExperience[] = [];
  let error: string | undefined;
  try {
    const profile = await getProfile(user.id);
    if (!profile)
      error = 'No se pudo encontrar tu perfil. Reintenta la lectura antes de continuar.';
    else experiences = profile.careerHistory?.experiences ?? [];
  } catch (cause) {
    unstable_rethrow(cause);
    error = 'No se pudo cargar el historial. Reintenta la lectura antes de continuar.';
  }

  return (
    <StepGuard requestedStepSlug="experiencia" wizardState={overview.state}>
      <WizardShell
        title="Experiencia"
        description="Añade y guarda las actividades de tu trayectoria. Puedes continuar sin añadir experiencias; completar este paso no acredita experiencia profesional."
      >
        <OnboardingExperienceStep
          values={values}
          initialExperiences={experiences}
          initialError={error}
          completed={Boolean(
            overview.state?.is_completed || overview.state?.current_step === 'completed',
          )}
        />
      </WizardShell>
    </StepGuard>
  );
}
