'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { redirect } from 'next/navigation';
import { getNextStepSlug, getStepRouteBySlug } from '../config/wizard-steps';
import { saveOnboardingStep } from '../server/save-onboarding-step';
import { parseCompetenciasFormData } from '../services/wizard-form.mapper';

export async function saveCompetenciasStepAction(formData: FormData) {
  const user = await requireUser();
  const payload = parseCompetenciasFormData(formData);

  await saveOnboardingStep(user.id, 'competencias', payload, {
    markCompleted: true,
  });

  const nextStep = getNextStepSlug('competencias');
  redirect(nextStep ? getStepRouteBySlug(nextStep) : '/dashboard');
}
