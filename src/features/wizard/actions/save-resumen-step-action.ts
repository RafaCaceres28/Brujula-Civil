'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { redirect } from 'next/navigation';
import { saveOnboardingStep } from '../server/save-onboarding-step';

export async function saveResumenStepAction(formData: FormData) {
  const user = await requireUser();

  const payload = {
    confirmed: formData.get('confirmed') === 'on' || formData.get('confirmed') === 'true',
  };

  await saveOnboardingStep(user.id, 'resumen', payload, {
    markCompleted: true,
  });

  redirect('/dashboard');
}
