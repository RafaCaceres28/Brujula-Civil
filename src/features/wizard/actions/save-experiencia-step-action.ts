'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { ZodError } from 'zod';
import { requireUser } from '@/features/auth/server/require-user';
import { getProfile } from '@/features/profile/server/get-profile';
import {
  domainFailure,
  domainSuccess,
  type DomainResult,
} from '../../../lib/contracts/domain-result';
import { WIZARD_STEPS, getStepRouteByDbKey } from '../config/wizard-steps';
import { getOnboardingOverview } from '../server/get-onboarding-overview';
import { saveOnboardingStep } from '../server/save-onboarding-step';
import { parseExperienciaFormData } from '../services/wizard-form.mapper';

export async function saveExperienciaStepAction(
  formData: FormData,
): Promise<DomainResult<{ nextHref: string }>> {
  const user = await requireUser();
  try {
    const profile = await getProfile(user.id);
    if (!profile)
      return domainFailure({
        code: 'NOT_FOUND',
        message: 'No se pudo leer tu perfil. Reintenta la lectura antes de continuar.',
      });
    const overview = await getOnboardingOverview(user.id);
    const completed = overview.state?.is_completed || overview.state?.current_step === 'completed';
    if (
      completed &&
      !WIZARD_STEPS.every((step) =>
        overview.steps.some((saved) => saved.step_key === step.dbKey && saved.is_completed),
      )
    ) {
      return domainFailure({
        code: 'CONFLICT',
        message: 'El progreso guardado es inconsistente. Recarga antes de continuar.',
      });
    }
    const data = new FormData();
    for (const [key, value] of formData) if (key !== 'functionTypes') data.append(key, value);
    const payload = parseExperienciaFormData(data);
    const experienceFields = (
      [
        'responsibilityAreas',
        'missionTypes',
        'achievements',
        'tools',
        'leadershipScopes',
        'additionalContext',
      ] as const
    ).filter((field) => data.has(field) || data.getAll('_experienceFields').includes(field));
    const result = await saveOnboardingStep(user.id, 'experiencia', payload, {
      markCompleted: true,
      experienceFields,
    });
    revalidatePath('/onboarding', 'layout');
    return domainSuccess({
      nextHref: completed
        ? '/perfil'
        : result.isCompleted
          ? '/dashboard'
          : getStepRouteByDbKey(result.currentStep),
    });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ZodError)
      return domainFailure({
        code: 'VALIDATION_ERROR',
        message:
          'No se pudieron validar los datos. Revisa el historial y la información complementaria antes de reintentar.',
      });
    return domainFailure({
      code: 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'No se pudo guardar el paso. Revisa los datos y reintenta. Tu borrador se conserva.',
    });
  }
}
