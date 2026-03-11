'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { projectWizardToProfiles } from '@/features/profile/server/project-wizard-to-profiles';
import { redirect } from 'next/navigation';
import { saveOnboardingStep } from '../server/save-onboarding-step';
import { parseResumenFormData } from '../services/wizard-form.mapper';

export async function saveResumenStepAction(formData: FormData) {
  const user = await requireUser();
  const payload = parseResumenFormData(formData);

  await saveOnboardingStep(user.id, 'resumen', payload, {
    markCompleted: true,
  });

  await projectWizardToProfiles(user.id);

  redirect('/dashboard');
}
