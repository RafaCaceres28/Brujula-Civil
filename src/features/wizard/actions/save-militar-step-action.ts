'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { redirect } from 'next/navigation';
import { getNextStepSlug, getStepRouteBySlug } from '../config/wizard-steps';
import { militarStepSchema } from '../schemas/wizard.schema';
import { saveOnboardingStep } from '../server/save-onboarding-step';

export async function saveMilitarStepAction(formData: FormData) {
  const user = await requireUser();

  const rawPayload = {
    army: (formData.get('army') as string)?.trim() || null,
    cuerpo: (formData.get('cuerpo') as string)?.trim() || null,
    rank: (formData.get('rank') as string)?.trim() || null,
    specialty: (formData.get('specialty') as string)?.trim() || null,
    yearsOfService: formData.get('yearsOfService') ? Number(formData.get('yearsOfService')) : null,
    destinationType: (formData.get('destinationType') as string)?.trim() || null,
  };

  const parsed = militarStepSchema.safeParse(rawPayload);

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  await saveOnboardingStep(user.id, 'militar', parsed.data, {
    markCompleted: true,
  });

  const nextStep = getNextStepSlug('militar');

  redirect(nextStep ? getStepRouteBySlug(nextStep) : '/dashboard');
}
