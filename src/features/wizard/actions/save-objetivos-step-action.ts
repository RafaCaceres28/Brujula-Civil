'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { redirect } from 'next/navigation';
import { getNextStepSlug, getStepRouteBySlug } from '../config/wizard-steps';
import { saveOnboardingStep } from '../server/save-onboarding-step';
import { parseObjetivosFormData } from '../services/wizard-form.mapper';

export async function saveObjetivosStepAction(formData: FormData) {
  const user = await requireUser();
  const payload = parseObjetivosFormData(formData);

  await saveOnboardingStep(user.id, 'objetivos', payload, {
    markCompleted: true,
  });

  const nextStep = getNextStepSlug('objetivos');
  redirect(nextStep ? getStepRouteBySlug(nextStep) : '/dashboard');
}
