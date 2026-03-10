'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { redirect } from 'next/navigation';
import { getNextStepSlug, getStepRouteBySlug } from '../config/wizard-steps';
import { saveOnboardingStep } from '../server/save-onboarding-step';

export async function saveMilitarStepAction(formData: FormData) {
  const user = await requireUser();

  const payload = {
    army: (formData.get('army') as string) || null,
    branch: (formData.get('branch') as string) || null,
    rank: (formData.get('rank') as string) || null,
    specialty: (formData.get('specialty') as string) || null,
    yearsOfService: formData.get('yearsOfService') ? Number(formData.get('yearsOfService')) : null,
    destinationType: (formData.get('destinationType') as string) || null,
  };

  await saveOnboardingStep(user.id, 'militar', payload, {
    markCompleted: true,
  });

  const nextStep = getNextStepSlug('militar');

  redirect(nextStep ? getStepRouteBySlug(nextStep) : '/dashboard');
}
