'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { redirect } from 'next/navigation';
import { getNextStepSlug, getStepRouteBySlug } from '../config/wizard-steps';
import { saveOnboardingStep } from '../server/save-onboarding-step';
import { parseMilitarFormData } from '../services/wizard-form.mapper';

export async function saveMilitarStepAction(formData: FormData) {
  const user = await requireUser();
  const payload = parseMilitarFormData(formData);

  await saveOnboardingStep(user.id, 'militar', payload, {
    markCompleted: true,
  });

  const nextStep = getNextStepSlug('militar');
  redirect(nextStep ? getStepRouteBySlug(nextStep) : '/dashboard');
}
