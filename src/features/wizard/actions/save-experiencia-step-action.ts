'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { redirect } from 'next/navigation';
import { getNextStepSlug, getStepRouteBySlug } from '../config/wizard-steps';
import { experienciaStepSchema } from '../schemas/wizard.schema';
import { saveOnboardingStep } from '../server/save-onboarding-step';

function parseList(value: FormDataEntryValue | null) {
  if (!value || typeof value !== 'string') return [];

  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function saveExperienciaStepAction(formData: FormData) {
  const user = await requireUser();

  const rawPayload = {
    responsibilities: parseList(formData.get('responsibilities')),
    missions: parseList(formData.get('missions')),
    achievements: parseList(formData.get('achievements')),
    tools: parseList(formData.get('tools')),
  };

  const parsed = experienciaStepSchema.safeParse(rawPayload);

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  await saveOnboardingStep(user.id, 'experiencia', parsed.data, {
    markCompleted: true,
  });

  const nextStep = getNextStepSlug('experiencia');

  redirect(nextStep ? getStepRouteBySlug(nextStep) : '/dashboard');
}
