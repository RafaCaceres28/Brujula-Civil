'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { redirect } from 'next/navigation';
import { getNextStepSlug, getStepRouteBySlug } from '../config/wizard-steps';
import { competenciasStepSchema } from '../schemas/wizard.schema';
import { saveOnboardingStep } from '../server/save-onboarding-step';

function parseList(value: FormDataEntryValue | null) {
  if (!value || typeof value !== 'string') return [];

  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function saveCompetenciasStepAction(formData: FormData) {
  const user = await requireUser();

  const rawPayload = {
    technicalSkills: parseList(formData.get('technicalSkills')),
    softSkills: parseList(formData.get('softSkills')),
    certifications: parseList(formData.get('certifications')),
    languages: parseList(formData.get('languages')),
  };

  const parsed = competenciasStepSchema.safeParse(rawPayload);

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  await saveOnboardingStep(user.id, 'competencias', parsed.data, {
    markCompleted: true,
  });

  const nextStep = getNextStepSlug('competencias');

  redirect(nextStep ? getStepRouteBySlug(nextStep) : '/dashboard');
}
