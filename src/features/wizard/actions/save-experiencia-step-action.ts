'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { redirect } from 'next/navigation';
import { getNextStepSlug, getStepRouteBySlug } from '../config/wizard-steps';
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

  const payload = {
    responsibilities: parseList(formData.get('responsibilities')),
    missions: parseList(formData.get('missions')),
    achievements: parseList(formData.get('achievements')),
    tools: parseList(formData.get('tools')),
  };

  await saveOnboardingStep(user.id, 'experiencia', payload, {
    markCompleted: true,
  });

  const nextStep = getNextStepSlug('experiencia');

  redirect(nextStep ? getStepRouteBySlug(nextStep) : '/dashboard');
}
