'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { projectWizardToMilitaryProfile } from '@/features/profile/server/project-wizard-to-military-profile';
import { redirect } from 'next/navigation';
import { resumenStepSchema } from '../schemas/wizard.schema';
import { saveOnboardingStep } from '../server/save-onboarding-step';

export async function saveResumenStepAction(formData: FormData) {
  const user = await requireUser();

  const rawPayload = {
    confirmed: formData.get('confirmed') === 'on' || formData.get('confirmed') === 'true',
  };

  const parsed = resumenStepSchema.safeParse(rawPayload);

  if (!parsed.success) {
    throw new Error('Debes confirmar para finalizar el onboarding.');
  }

  await saveOnboardingStep(user.id, 'resumen', parsed.data, {
    markCompleted: true,
  });

  await projectWizardToMilitaryProfile(user.id);

  redirect('/dashboard');
}
