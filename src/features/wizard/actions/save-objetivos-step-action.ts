'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { redirect } from 'next/navigation';
import { getNextStepSlug, getStepRouteBySlug } from '../config/wizard-steps';
import { objetivosStepSchema } from '../schemas/wizard.schema';
import { saveOnboardingStep } from '../server/save-onboarding-step';

function parseList(value: FormDataEntryValue | null) {
  if (!value || typeof value !== 'string') return [];

  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function saveObjetivosStepAction(formData: FormData) {
  const user = await requireUser();

  const workModelValue = formData.get('workModel');
  const workModel =
    workModelValue === 'onsite' || workModelValue === 'hybrid' || workModelValue === 'remote'
      ? workModelValue
      : null;

  const rawPayload = {
    targetRoles: parseList(formData.get('targetRoles')),
    targetSectors: parseList(formData.get('targetSectors')),
    preferredLocations: parseList(formData.get('preferredLocations')),
    workModel,
  };

  const parsed = objetivosStepSchema.safeParse(rawPayload);

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  await saveOnboardingStep(user.id, 'objetivos', parsed.data, {
    markCompleted: true,
  });

  const nextStep = getNextStepSlug('objetivos');

  redirect(nextStep ? getStepRouteBySlug(nextStep) : '/dashboard');
}
