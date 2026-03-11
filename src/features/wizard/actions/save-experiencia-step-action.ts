'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { redirect } from 'next/navigation';
import { getNextStepSlug, getStepRouteBySlug } from '../config/wizard-steps';
import { saveOnboardingStep } from '../server/save-onboarding-step';
import { parseExperienciaFormData } from '../services/wizard-form.mapper';

export async function saveExperienciaStepAction(formData: FormData) {
  const user = await requireUser();
  const payload = parseExperienciaFormData(formData);

  await saveOnboardingStep(user.id, 'experiencia', payload, {
    markCompleted: true,
  });

  const nextStep = getNextStepSlug('experiencia');
  redirect(nextStep ? getStepRouteBySlug(nextStep) : '/dashboard');
}
